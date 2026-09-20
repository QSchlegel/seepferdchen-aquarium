/**
 * Nothing sits in the phone's own furniture.
 *
 * A phone keeps a strip at the bottom for the home bar and, held sideways, a
 * strip at one side for the notch. iOS quietly eats the first tap on anything
 * inside them, so a button pinned 12px from the bottom of the glass is a
 * button she has to press twice — and she has no idea why.
 *
 * The menu button, the one control on every screen, shipped like that. This
 * is the test that would have caught it: every offset that pins something to
 * the edge of the screen has to measure from `--edge-*` (app.css), which is
 * `env(safe-area-inset-*)` and therefore zero on hardware with no cutouts.
 *
 * Two kinds of rule count as pinned to the screen:
 *   - anything `position: fixed`, which is measured from the viewport;
 *   - anything `position: absolute` in a file that has a full-screen `.hud`,
 *     because in this app that layer holds nothing else.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

/** Every component in the app, as source. Vite reads them; there is no fs here. */
const FILES = Object.entries(
  import.meta.glob('../**/*.svelte', { query: '?raw', import: 'default', eager: true })
) as [string, string][];

/** The app-wide stylesheet, which is where `.page` itself is defined. */
const SHEETS = Object.entries(
  import.meta.glob('../**/*.css', { query: '?raw', import: 'default', eager: true })
) as [string, string][];

/** The style blocks of one component, concatenated. */
function styles(source: string): string {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/** Strip comments, then split a stylesheet into `selector { body }` pairs. */
function rules(css: string): { selector: string; body: string }[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { selector: string; body: string }[] = [];
  // no nesting in this codebase beyond @media, so the inner braces are rules
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(clean); m; m = re.exec(clean)) {
    const selector = m[1].trim();
    if (selector.startsWith('@')) continue;         // the @media line itself
    out.push({ selector, body: m[2] });
  }
  return out;
}

function declaration(body: string, prop: string): string | null {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]+)`, 'i').exec(body);
  return m ? m[1].trim() : null;
}

/**
 * Does this offset push something up against an edge of the screen?
 *
 * `0` and `auto` are flush with it and have nothing to keep clear of; a
 * percentage is centring, not pinning; a negative value deliberately hangs
 * outside its parent. Everything else is a gap measured from the edge, and
 * that gap has to start where the usable screen starts.
 */
function pinsToEdge(value: string): boolean {
  if (/^(0|0px|auto)$/i.test(value)) return false;
  if (value.includes('%')) return false;
  if (value.trim().startsWith('-')) return false;
  return true;
}

const EDGES = ['top', 'bottom', 'left', 'right'];

describe('the edges of the screen', () => {
  it('finds the components to check', () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it('never pins a control into the notch or the home bar', () => {
    const wrong: string[] = [];

    for (const [file, source] of FILES) {
      const css = styles(source);
      if (!css) continue;

      const all = rules(css);
      // `.hud` is this app's name for a layer lying over the whole screen
      const hud = all.some(
        (r) => /(^|\s|,)\.hud\b/.test(r.selector) && /position:\s*fixed/.test(r.body)
      );

      for (const rule of all) {
        const position = declaration(rule.body, 'position');
        const onGlass = position === 'fixed' || (hud && position === 'absolute');
        if (!onGlass) continue;

        for (const edge of EDGES) {
          const value = declaration(rule.body, edge);
          if (!value || !pinsToEdge(value)) continue;
          if (value.includes(`--edge-${edge}`)) continue;
          wrong.push(`${file}  ${rule.selector} { ${edge}: ${value} }`);
        }
      }
    }

    expect(wrong, `these measure from the edge of the glass, not the edge of the usable screen —
add var(--edge-…) as app.css does:\n  ${wrong.join('\n  ')}\n`).toEqual([]);
  });

  it('keeps the bottom of a scrolling page clear of the home bar', () => {
    const wrong: string[] = [];

    for (const [file, source] of [...FILES, ...SHEETS]) {
      const css = file.endsWith('.css') ? source : styles(source);
      for (const rule of rules(css)) {
        if (!/(^|\s|,)\.page\b/.test(rule.selector)) continue;
        // a page that re-states its bottom padding has to re-state the inset
        // with it: this is exactly how the map and the maker lost theirs
        const padding =
          declaration(rule.body, 'padding-bottom') ?? declaration(rule.body, 'padding');
        if (!padding) continue;
        if (padding.includes('--edge-bottom')) continue;
        wrong.push(`${file}  ${rule.selector} { padding: ${padding} }`);
      }
    }

    expect(wrong, `a page that sets its own bottom padding drops the home-bar inset
it inherited from .page in app.css:\n  ${wrong.join('\n  ')}\n`).toEqual([]);
  });

  it('reads the insets from one place, so there is one place to get them right', () => {
    const stray = FILES.filter(([, source]) => source.includes('env(safe-area-inset')).map(([f]) => f);
    expect(stray, `use var(--edge-…) from app.css rather than env() directly: ${stray}`).toEqual([]);
  });

  /**
   * A browser keeps a strip of the screen for its own furniture — iOS Safari
   * reserves about 50pt at the bottom for its bar — and paints it with the
   * page's root background *colour*. The app set only a gradient, so that
   * colour was transparent, and a band of white appeared under the sea.
   */
  it('gives the browser a sea colour for any strip it keeps for itself', () => {
    const root = SHEETS.flatMap(([, css]) => rules(css))
      .filter((r) => /(^|,)\s*(html|body)\b/.test(r.selector));
    expect(root.length, 'no html/body rule found').toBeGreaterThan(0);
    const colours = root.map((r) => declaration(r.body, 'background-color')).filter(Boolean);
    expect(colours.length, 'html/body sets no background-color, so the strip is white')
      .toBeGreaterThan(0);
    // and a gradient must not be shorthanded over it again
    for (const r of root) {
      const shorthand = declaration(r.body, 'background');
      expect(shorthand, `background: ${shorthand} wipes out the background-color`).toBeNull();
    }
  });
});
