/**
 * Build the module graph the admin panel draws.
 *
 * Walks src/, pulls the import specifiers out of every .ts and .svelte file,
 * resolves the ones that point inside the project, and writes the result as
 * JSON. Run before the build so the panel ships with an up-to-date picture
 * rather than guessing at runtime — the browser cannot read the source tree.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'src');
const OUT = resolve(process.argv[3] ?? 'src/lib/data/graph.json');

/** Every source file under src/, as paths relative to the project. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|svelte|js)$/.test(entry) && !/\.test\.ts$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Import specifiers in a file. Deliberately regex rather than a parser: this
 * only needs the module names, and pulling in a full AST for that would be a
 * dependency the app does not otherwise have.
 */
const PATTERNS = [
  /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g
];

function importsOf(source) {
  const found = new Set();
  for (const re of PATTERNS) {
    for (const m of source.matchAll(re)) found.add(m[1]);
  }
  return [...found];
}

/** Turn an import specifier into a file in this project, or null if external. */
function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith('$lib/')) base = join('src/lib', spec.slice(5));
  else if (spec === '$lib') base = 'src/lib';
  else if (spec.startsWith('./') || spec.startsWith('../')) {
    base = join(dirname(fromFile), spec);
  } else return null; // node_modules, $app/*, $env/* — not ours

  const tries = [
    base, `${base}.ts`, `${base}.js`, `${base}.svelte`,
    join(base, 'index.ts'), join(base, 'index.js')
  ];
  for (const t of tries) {
    try {
      if (statSync(t).isFile()) return t.split('\\').join('/');
    } catch { /* keep looking */ }
  }
  return null;
}

/** Which part of the app a file belongs to — drives the colours in the panel. */
function layerOf(path) {
  if (path.startsWith('src/routes/')) return 'route';
  if (path.startsWith('src/lib/components/')) return 'component';
  if (path.startsWith('src/lib/sim/')) return 'sim';
  if (path.startsWith('src/lib/art/')) return 'art';
  if (path.startsWith('src/lib/data/')) return 'data';
  if (path.startsWith('src/lib/stores/')) return 'store';
  return 'lib';
}

/** A short name for the node label. */
function labelOf(path) {
  const parts = path.split('/');
  const file = parts[parts.length - 1];
  // +page.svelte is meaningless on its own; name it after its route
  if (file.startsWith('+')) {
    const dir = parts[parts.length - 2];
    return dir === 'routes' ? '/' : `/${dir}`;
  }
  return file.replace(/\.(ts|js|svelte)$/, '');
}

export function buildGraph(root = 'src') {
  const files = walk(root).map((f) => relative(process.cwd(), f).split('\\').join('/'));
  const nodes = files.map((path) => ({
    id: path,
    label: labelOf(path),
    layer: layerOf(path),
    loc: readFileSync(path, 'utf8').split('\n').length
  }));
  const known = new Set(files);

  const links = [];
  for (const path of files) {
    for (const spec of importsOf(readFileSync(path, 'utf8'))) {
      const target = resolveSpec(spec, path);
      if (target && known.has(target) && target !== path) {
        links.push({ source: path, target });
      }
    }
  }

  // how many other modules lean on each one
  const fanIn = new Map();
  for (const l of links) fanIn.set(l.target, (fanIn.get(l.target) ?? 0) + 1);
  for (const n of nodes) n.fanIn = fanIn.get(n.id) ?? 0;

  return { nodes, links, builtFrom: root };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const graph = buildGraph(ROOT.replace(`${process.cwd()}/`, ''));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(graph, null, 2));
  console.log(
    `graph: ${graph.nodes.length} modules, ${graph.links.length} imports -> ${relative(process.cwd(), OUT)}`
  );
}
