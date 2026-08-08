/**
 * The coral maze.
 *
 * A grid carved by recursive backtracking, then handed out as wall segments so
 * the drawing and the collision agree by construction. Collision pushes the
 * swimmer out of walls rather than stopping it dead — a five-year-old dragging
 * a finger should slide along a wall, not get stuck on it.
 */

export interface Cell {
  n: boolean; e: boolean; s: boolean; w: boolean;
  /** Carved during generation. */
  seen: boolean;
}

export interface Segment {
  x1: number; y1: number; x2: number; y2: number;
}

export interface Maze {
  cols: number;
  rows: number;
  cells: Cell[][];
  /** Pixel size of one cell, and where the grid starts on the canvas. */
  size: number;
  ox: number;
  oy: number;
  segments: Segment[];
  /** Where the swimmer starts and where the treasure sits, in pixels. */
  start: { x: number; y: number };
  goal: { x: number; y: number };
}

/** Fit a grid to the canvas: bigger cells on a small screen, so it stays fair. */
export function mazeShape(width: number, height: number) {
  const size = Math.max(70, Math.min(width, height) / 6);
  const cols = Math.max(3, Math.floor((width - 24) / size));
  const rows = Math.max(3, Math.floor((height - 150) / size));
  return { cols, rows, size };
}

export function generateMaze(
  width: number,
  height: number,
  rand: () => number = Math.random
): Maze {
  const { cols, rows, size } = mazeShape(width, height);

  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    cells.push([]);
    for (let c = 0; c < cols; c++) {
      cells[r].push({ n: true, e: true, s: true, w: true, seen: false });
    }
  }

  // recursive backtracker, iterative so a big maze cannot blow the stack
  const stack: [number, number][] = [[0, 0]];
  cells[0][0].seen = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options: [number, number, keyof Cell, keyof Cell][] = [];
    if (r > 0 && !cells[r - 1][c].seen) options.push([r - 1, c, 'n', 's']);
    if (r < rows - 1 && !cells[r + 1][c].seen) options.push([r + 1, c, 's', 'n']);
    if (c > 0 && !cells[r][c - 1].seen) options.push([r, c - 1, 'w', 'e']);
    if (c < cols - 1 && !cells[r][c + 1].seen) options.push([r, c + 1, 'e', 'w']);

    if (!options.length) { stack.pop(); continue; }
    const [nr, nc, here, there] = options[Math.floor(rand() * options.length)];
    (cells[r][c] as any)[here] = false;
    (cells[nr][nc] as any)[there] = false;
    cells[nr][nc].seen = true;
    stack.push([nr, nc]);
  }

  // a few extra openings, so there is more than one way through and a wrong
  // turn is never a dead end she has to reverse all the way out of
  const extra = Math.floor(cols * rows * 0.12);
  for (let i = 0; i < extra; i++) {
    const r = Math.floor(rand() * rows);
    const c = Math.floor(rand() * (cols - 1));
    cells[r][c].e = false;
    cells[r][c + 1].w = false;
  }

  const ox = Math.round((width - cols * size) / 2);
  const oy = Math.round((height - 90 - rows * size) / 2) + 20;

  const segments: Segment[] = [];
  const push = (x1: number, y1: number, x2: number, y2: number) =>
    segments.push({ x1: ox + x1, y1: oy + y1, x2: ox + x2, y2: oy + y2 });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const x = c * size, y = r * size;
      if (cell.n) push(x, y, x + size, y);
      if (cell.w) push(x, y, x, y + size);
      if (r === rows - 1 && cell.s) push(x, y + size, x + size, y + size);
      if (c === cols - 1 && cell.e) push(x + size, y, x + size, y + size);
    }
  }

  return {
    cols, rows, cells, size, ox, oy, segments,
    start: { x: ox + size * 0.5, y: oy + size * 0.5 },
    goal: { x: ox + (cols - 0.5) * size, y: oy + (rows - 0.5) * size }
  };
}

/** Closest point on a segment to p, for the collision push-out. */
function closest(s: Segment, px: number, py: number) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - s.x1) * dx + (py - s.y1) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: s.x1 + dx * t, y: s.y1 + dy * t };
}

/**
 * Slide a swimmer of radius r out of any wall it has entered. Returns the
 * corrected position; several passes so a corner cannot squeeze it through.
 */
export function resolve(maze: Maze, x: number, y: number, r: number) {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const s of maze.segments) {
      // cheap reject before the real maths, this runs every frame
      if (x + r < Math.min(s.x1, s.x2) - 2 || x - r > Math.max(s.x1, s.x2) + 2) continue;
      if (y + r < Math.min(s.y1, s.y2) - 2 || y - r > Math.max(s.y1, s.y2) + 2) continue;

      const p = closest(s, x, y);
      let dx = x - p.x, dy = y - p.y;
      let d = Math.hypot(dx, dy);
      if (d >= r) continue;

      if (d === 0) {
        // dead centre on the wall: no direction to escape along, so use the
        // wall's own normal. Without this it stays stuck inside the coral.
        const wx = s.x2 - s.x1, wy = s.y2 - s.y1;
        const wl = Math.hypot(wx, wy) || 1;
        dx = -wy / wl;
        dy = wx / wl;
        d = 1;
      }
      const push = r - d;
      x += (dx / d) * push;
      y += (dy / d) * push;
      moved = true;
    }
    if (!moved) break;
  }
  return { x, y };
}

/** Has she reached the treasure? */
export function atGoal(maze: Maze, x: number, y: number) {
  return Math.hypot(maze.goal.x - x, maze.goal.y - y) < maze.size * 0.42;
}
