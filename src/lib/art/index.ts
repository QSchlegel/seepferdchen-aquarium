/**
 * The whole drawing layer: every creature, the reef, the sea floor.
 *
 * These routines are pure canvas painting — they never touch simulation state.
 * They draw facing right, centred on the origin, so the caller controls
 * position, facing and scale with a transform.
 *
 * The context is bound once with bindContext() rather than threaded through
 * every call, because these paint hundreds of shapes per frame and the
 * indirection showed up in profiles.
 */

import { DEFAULT_SCENE, SCENES, type Scene, type SceneId } from '$lib/data/scenes';

let ctx: CanvasRenderingContext2D;

/** Point every drawing routine in this module at a canvas context. */
export function bindContext(c: CanvasRenderingContext2D) { ctx = c; }

export interface Palette {
  [key: string]: any;
}

/* ------------------------------------------------------------- utilities */
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export const RAINBOW = ['#ff6b9d', '#ff9f43', '#ffe066', '#7ef0c8', '#63d3f0', '#c471f5'];

/* the reef needs to know the tank it is drawn into */
let W = 0, H = 0, SAND = 0;

/* and which place it is. Set before setTank so the scenery grows to match. */
let scene: Scene = SCENES[DEFAULT_SCENE];

/** Move the tank to another place. Rebuilds the scenery on the next setTank. */
export function setScene(id: SceneId) {
  scene = SCENES[id] ?? SCENES[DEFAULT_SCENE];
  if (W) buildScenery();
}
export function currentScene() { return scene; }

export function setTank(w: number, h: number) {
  W = w; H = h; SAND = h * 0.855;
  buildScenery();
}
export function tankWidth() { return W; }
export function tankHeight() { return H; }

/* --------------------------------------------------------------- terrain */

/**
 * Value noise, seeded and deterministic: the sea floor is the same landscape
 * every visit, which matters when she is learning where things hide.
 */
function hash1(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);          // smoothstep, so no creases
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
}
/** Layered noise: big shapes first, then finer and finer detail. */
function fbm(x: number, octaves = 4) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(x * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;                          // not exactly 2, or the octaves line up
  }
  return sum / norm;
}

/**
 * Height of the sea floor at a given x.
 *
 * Layered noise gives dunes inside dunes; a ridge term adds the occasional
 * outcrop; and the old bank still rises on the right so the tank has a high
 * side and a low side. Everything else — where the crab walks, where food
 * settles, where the key lies — reads from this one function.
 */
export function sandY(x: number) {
  const u = x / Math.max(1, W);
  const tr = scene.terrain;
  const bank = Math.min(H * 0.17, Math.max(0, x - W * 0.66) * 0.32);

  // the seed moves the noise to a different stretch of coast, so every place
  // has its own landscape rather than the same dunes in a new colour
  const rolling = (fbm(u * 3.1 + tr.seed, 4) - 0.5) * H * tr.roll;
  const detail  = (fbm(u * 11 + 40 + tr.seed, 2) - 0.5) * H * 0.03;
  const ridge = Math.pow(Math.max(0, Math.sin(u * tr.ridgeFreq + 1.2)), 8) * H * tr.ridge;

  return SAND - H * tr.lift + rolling + detail - ridge - bank;
}

/** The far ridge line, well behind the playable floor. */
export function farRidgeY(x: number) {
  const u = x / Math.max(1, W);
  return SAND - H * 0.10 + (fbm(u * 2.2 + 90 + scene.terrain.seed, 3) - 0.5) * H * 0.13;
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* --------------------------------------------------------------- scenery */
let seaweeds = [], corals = [], rocks = [], rays = [], kelps = [], fans = [], sponges = [],
    anemones = [], shells = [], sandStars = [];

/**
 * How crowded the reef is allowed to be. A phone shows the same tank in a
 * fraction of the area, and at that size a full-density reef becomes a wall of
 * coral you cannot pick a fish out of.
 */
function crowding() {
  if (W < 480) return 0.45;
  if (W < 700) return 0.62;
  if (W < 980) return 0.82;
  return 1;
}

/** How many of a thing grow here: the base density, by scene and by screen. */
function grow(min: number, per: number, factor: number) {
  if (factor <= 0) return 0;
  const n = Math.max(min, Math.round(W / per)) * factor * crowding();
  return Math.max(factor > 0 ? 1 : 0, Math.round(n));
}

function buildScenery(){
  buildMotes(); buildFarFish(); buildSeeps();
  seaweeds = []; corals = []; rocks = []; rays = [];
  kelps = []; fans = []; sponges = []; anemones = []; shells = []; sandStars = [];

  // reef is densest on the left, thinning towards the sandy bank on the right
  const reefX = () => Math.pow(Math.random(), 1.5) * W * .82 + rnd(-10, 24);

  for(let i = 0; i < grow(5, 170, scene.growth.seaweed); i++){
    seaweeds.push({ x: reefX(), h: rnd(H * .11, H * .26), w: rnd(6, 11),
      phase: rnd(0, 7), sp: rnd(.5, .9), hue: rnd(105, 160), blades: Math.round(rnd(3, 5)) });
  }
  for(let i = 0; i < grow(3, 260, scene.growth.kelp); i++){
    kelps.push({ x: reefX(), h: rnd(H * .16, H * .34), w: rnd(16, 30),
      phase: rnd(0, 7), sp: rnd(.35, .6), col: pick(['#f2d675','#e8c860','#d9e08a','#f0e2a0']) });
  }
  for(let i = 0; i < grow(3, 240, scene.growth.fans); i++){
    fans.push({ x: reefX(), h: rnd(60, 130), phase: rnd(0, 7),
      col: pick(['#e0466b','#c8365f','#ef6f8e','#b8365a','#e85d4e']), lean: rnd(-.3, .3) });
  }
  for(let i = 0; i < grow(2, 380, scene.growth.sponges); i++){
    sponges.push({ x: reefX(), n: Math.round(rnd(3, 5)), s: rnd(.8, 1.3), phase: rnd(0, 7),
      col: pick(['#8b6fd6','#7a5fc9','#9b7ae0','#6f5cbf']) });
  }
  for(let i = 0; i < grow(3, 300, scene.growth.anemones); i++){
    anemones.push({ x: reefX(), s: rnd(.75, 1.25), phase: rnd(0, 7),
      col: pick(['#f2a2c0','#e8829f','#f7b48a','#d98fc9','#f09a7a']),
      tips: pick(['#fff0f6','#ffe6d5','#ffd9ec']) });
  }
  for(let i = 0; i < grow(4, 200, scene.growth.coral); i++){
    corals.push({ x: reefX(), s: rnd(.6, 1.15),
      col: pick(['#ff7ab0','#ff9f5a','#c471f5','#ff6b6b','#ffd166','#6ee7d1','#e0466b']),
      arms: Math.round(rnd(4, 7)), seed: rnd(0, 100) });
  }
  for(let i = 0; i < 5; i++){
    rocks.push({ x: rnd(0, W), w: rnd(40, 110), h: rnd(16, 38), col: pick(['#6b7f96','#7d8ea3','#5d7186']) });
  }
  // shells and starfish scattered on the open sand, mostly on the right bank
  for(let i = 0; i < Math.max(4, Math.round(W / 190)); i++){
    shells.push({ x: rnd(W * .3, W * .99), y: rnd(6, 46), s: rnd(.7, 1.25),
      type: pick(['scallop','conch','snail']), rot: rnd(-.5, .5),
      col: pick(['#f6d9c8','#f0c4a8','#efe0cd','#e8b9a0','#f7e3d0']) });
  }
  for(let i = 0; i < 3; i++){
    sandStars.push({ x: rnd(W * .2, W * .97), y: rnd(14, 52), s: rnd(.55, .9), rot: rnd(0, 7),
      col: pick(['#ef6f8e','#e85d4e','#f2a2c0']) });
  }
  for(let i = 0; i < 6; i++){
    rays.push({ x: rnd(-W * .2, W), w: rnd(60, 160), a: rnd(-.35, .35), sp: rnd(.05, .14), o: rnd(.04, .1), ph: rnd(0, 7) });
  }
}

function drawWater(t){
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const wc = scene.water;
  g.addColorStop(0, wc[0]); g.addColorStop(.22, wc[1]);
  g.addColorStop(.5, wc[2]); g.addColorStop(.78, wc[3]); g.addColorStop(1, wc[4]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for(const r of rays){
    const x = r.x + Math.sin(t * r.sp + r.ph) * 40;
    ctx.globalAlpha = r.o * (0.7 + 0.3 * Math.sin(t * .6 + r.ph)) * scene.rayAlpha;
    ctx.fillStyle = scene.ray;
    ctx.beginPath();
    ctx.moveTo(x, -20); ctx.lineTo(x + r.w, -20);
    ctx.lineTo(x + r.w * 2.6 + r.a * H, H * .95); ctx.lineTo(x + r.a * H, H * .95);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // The surface, as slabs of liquid glass rather than lines.
  //
  // Each swell is a closed band between two noise-warped curves, filled with a
  // vertical gradient that is bright where the light catches the crest and
  // clear underneath — which is what reads as thickness. A specular line along
  // the top edge and a soft shadow under the trailing edge finish the glass.
  ctx.save();
  const bands = W < 700 ? 4 : 6;
  for(let k = 0; k < bands; k++){
    const top = 2 + k * (H * .022);
    const thick = H * (.028 + k * .012);
    const sp = (k % 2 ? -1 : 1) * (.09 + k * .05);
    const seed = k * 37.7;

    // the two edges, warped by noise so no two crests are the same shape
    const edge = (x: number, extra: number) =>
      top + extra
      + (fbm(x * .0032 + t * sp + seed, 3) - .5) * (H * .05 + k * 4)
      + Math.sin(x * .009 + t * sp * 2.1 + seed) * (3 + k);

    ctx.beginPath();
    ctx.moveTo(-20, edge(-20, 0));
    for(let x = -20; x <= W + 20; x += 9) ctx.lineTo(x, edge(x, 0));
    for(let x = W + 20; x >= -20; x -= 9) ctx.lineTo(x, edge(x, thick));
    ctx.closePath();

    const g2 = ctx.createLinearGradient(0, top - 6, 0, top + thick + 8);
    g2.addColorStop(0, `rgba(255,255,255,${.30 - k * .035})`);
    g2.addColorStop(.45, `rgba(255,255,255,${.10 - k * .012})`);
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.fill();

    // specular crest
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,255,255,${.34 - k * .04})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-20, edge(-20, 0));
    for(let x = -20; x <= W + 20; x += 9) ctx.lineTo(x, edge(x, 0));
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // and the shadow the slab casts on the water beneath it
    ctx.strokeStyle = `rgba(10,50,80,${.10 - k * .012})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, edge(-20, thick + 2));
    for(let x = -20; x <= W + 20; x += 9) ctx.lineTo(x, edge(x, thick + 2));
    ctx.stroke();
  }

  // the light the swell throws down into the water, warped by the same noise
  ctx.globalCompositeOperation = 'lighter';
  for(let k = 0; k < 3; k++){
    ctx.globalAlpha = .05;
    ctx.fillStyle = scene.ray;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for(let x = 0; x <= W; x += 14){
      ctx.lineTo(x, H * (.1 + k * .07)
        + (fbm(x * .0026 + t * (.12 + k * .05) + k * 11, 2) - .5) * (H * .09)
        + Math.sin(x * .008 + t * .3) * 9);
    }
    ctx.lineTo(W, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSand(){
  const g = ctx.createLinearGradient(0, SAND - H * .18, 0, H);
  g.addColorStop(0, scene.sand[0]); g.addColorStop(.5, scene.sand[1]); g.addColorStop(1, scene.sand[2]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, sandY(0));
  for(let x = 0; x <= W; x += 14) ctx.lineTo(x, sandY(x));
  ctx.lineTo(W, sandY(W)); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  // soft ripple lines in the sand
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, sandY(0));
  for(let x = 0; x <= W; x += 14) ctx.lineTo(x, sandY(x));
  ctx.lineTo(W, H); ctx.closePath(); ctx.clip();
  ctx.strokeStyle = 'rgba(200,168,110,.35)'; ctx.lineWidth = 2;
  for(let k = 1; k <= 5; k++){
    ctx.beginPath();
    for(let x = 0; x <= W; x += 16){
      const y = sandY(x) + k * 26 + Math.sin(x * .012 + k) * 7;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(196,166,108,.5)';
  for(let i = 0; i < 70; i++){
    const x = (i * 137.5) % W;
    ctx.fillRect(x, sandY(x) + 16 + ((i * 53) % Math.max(20, H - sandY(x) - 20)), 3, 2);
  }
  ctx.restore();

  for(const r of rocks){
    ctx.fillStyle = r.col;
    ctx.beginPath(); ctx.ellipse(r.x, sandY(r.x) + 14, r.w / 2, r.h, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(r.x - r.w * .12, sandY(r.x) + 6, r.w * .18, r.h * .3, -.4, 0, 7); ctx.fill();
  }
}

function drawShells(t){
  for(const sh of sandStars){
    ctx.save(); ctx.translate(sh.x, sandY(sh.x) + sh.y); ctx.rotate(sh.rot); ctx.scale(sh.s, sh.s);
    ctx.fillStyle = sh.col;
    ctx.beginPath();
    for(let i = 0; i < 10; i++){
      const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 7 : 17);
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    for(let i = 0; i < 5; i++){
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 1.8, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  for(const sh of shells){
    ctx.save(); ctx.translate(sh.x, sandY(sh.x) + sh.y); ctx.rotate(sh.rot); ctx.scale(sh.s, sh.s);
    ctx.fillStyle = sh.col;
    if(sh.type === 'scallop'){
      ctx.beginPath(); ctx.moveTo(0, 6);
      ctx.quadraticCurveTo(-20, 2, -15, -12);
      ctx.quadraticCurveTo(0, -22, 15, -12);
      ctx.quadraticCurveTo(20, 2, 0, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(180,130,100,.45)'; ctx.lineWidth = 1.4;
      for(let i = -2; i <= 2; i++){
        ctx.beginPath(); ctx.moveTo(0, 5);
        ctx.quadraticCurveTo(i * 5, -6, i * 6.5, -14); ctx.stroke();
      }
    } else if(sh.type === 'conch'){
      ctx.beginPath(); ctx.moveTo(-14, 4);
      ctx.quadraticCurveTo(-6, -14, 10, -8);
      ctx.quadraticCurveTo(18, -4, 12, 5);
      ctx.quadraticCurveTo(0, 10, -14, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(180,130,100,.4)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-8, 1); ctx.quadraticCurveTo(0, -8, 10, -5); ctx.stroke();
    } else {
      ctx.strokeStyle = sh.col; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath();
      for(let a = 0; a < 9; a += .2){
        const r = 1.8 + a * 1.5, x = Math.cos(a) * r, y = Math.sin(a) * r * .8;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* --- reef plants ------------------------------------------------------- */
function drawKelp(t){
  for(const k of kelps){
    const base = sandY(k.x);
    ctx.save(); ctx.translate(k.x, base + 6);
    const segs = 7;
    ctx.fillStyle = k.col; ctx.globalAlpha = .92;
    for(const side of [-1, 1]){
      ctx.beginPath(); ctx.moveTo(0, 0);
      for(let i = 0; i <= segs; i++){
        const f = i / segs;
        const sway = Math.sin(t * k.sp + k.phase + f * 2.4) * (10 + f * 30);
        ctx.lineTo(sway + side * k.w * (1 - f * .55) * .5, -k.h * f);
      }
      for(let i = segs; i >= 0; i--){
        const f = i / segs;
        const sway = Math.sin(t * k.sp + k.phase + f * 2.4) * (10 + f * 30);
        ctx.lineTo(sway - side * 2, -k.h * f);
      }
      ctx.closePath(); ctx.fill();
    }
    // frond ribs
    ctx.strokeStyle = 'rgba(150,130,60,.4)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i = 0; i <= segs; i++){
      const f = i / segs;
      const sway = Math.sin(t * k.sp + k.phase + f * 2.4) * (10 + f * 30);
      i === 0 ? ctx.moveTo(sway, 0) : ctx.lineTo(sway, -k.h * f);
    }
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.restore();
  }
}

function drawFans(t){
  for(const f of fans){
    const base = sandY(f.x);
    ctx.save(); ctx.translate(f.x, base + 6);
    ctx.rotate(f.lean + Math.sin(t * .5 + f.phase) * .05);
    ctx.strokeStyle = f.col; ctx.lineCap = 'round';
    const branch = (x, y, ang, len, w, d) => {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(ang) * len * .5 + Math.sin(ang) * 4,
                           y + Math.sin(ang) * len * .5, x2, y2);
      ctx.stroke();
      if(d <= 0) return;
      branch(x2, y2, ang - .48, len * .68, w * .68, d - 1);
      branch(x2, y2, ang + .48, len * .68, w * .68, d - 1);
    };
    branch(0, 0, -Math.PI / 2, f.h * .42, 8, 3);
    branch(0, 0, -Math.PI / 2 - .55, f.h * .3, 6, 2);
    branch(0, 0, -Math.PI / 2 + .55, f.h * .3, 6, 2);
    ctx.restore();
  }
}

function drawSponges(t){
  for(const sp of sponges){
    const base = sandY(sp.x);
    ctx.save(); ctx.translate(sp.x, base + 6); ctx.scale(sp.s, sp.s);
    for(let i = 0; i < sp.n; i++){
      const off = (i - (sp.n - 1) / 2) * 20 + Math.sin(sp.phase + i) * 5;
      const hgt = 40 + ((i * 37 + sp.phase * 13) % 46);
      const lean = Math.sin(t * .35 + sp.phase + i) * 4;
      ctx.strokeStyle = sp.col; ctx.lineWidth = 17; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(off, 0);
      ctx.quadraticCurveTo(off + lean, -hgt * .6, off + lean * 2, -hgt); ctx.stroke();
      // dark opening at the top of the tube
      ctx.fillStyle = 'rgba(50,30,90,.55)';
      ctx.beginPath(); ctx.ellipse(off + lean * 2, -hgt, 7, 3.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.beginPath(); ctx.ellipse(off + lean - 4, -hgt * .55, 2.6, hgt * .28, .06, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

function drawAnemones(t){
  for(const a of anemones){
    const base = sandY(a.x);
    ctx.save(); ctx.translate(a.x, base + 6); ctx.scale(a.s, a.s);
    ctx.lineCap = 'round';
    for(let i = 0; i < 13; i++){
      const ang = -Math.PI / 2 + (i - 6) * .21;
      const w2 = Math.sin(t * 1.5 + a.phase + i * .7);
      const len = 30 + (i % 3) * 8;
      ctx.strokeStyle = a.col; ctx.lineWidth = 7;
      const ex = Math.cos(ang) * len + w2 * 7, ey = Math.sin(ang) * len + w2 * 3;
      ctx.beginPath(); ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(Math.cos(ang) * len * .5, Math.sin(ang) * len * .6 - 4, ex, ey);
      ctx.stroke();
      ctx.fillStyle = a.tips;
      ctx.beginPath(); ctx.arc(ex, ey, 4.2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = a.col;
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

function drawSeaweed(t){
  for(const s of seaweeds){
    const base = sandY(s.x);
    for(let b = 0; b < s.blades; b++){
      const off = (b - s.blades / 2) * s.w * 1.1;
      const sway = Math.sin(t * s.sp + s.phase + b) * (16 + b * 3);
      const h = s.h * (0.7 + 0.3 * Math.sin(b * 2.1 + s.phase));
      ctx.strokeStyle = 'hsl(' + (s.hue + b * 6) + ',55%,' + (30 + b * 4) + '%)';
      ctx.lineWidth = s.w * (1 - b * .07); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x + off, base);
      ctx.quadraticCurveTo(s.x + off + sway * .5, base - h * .55, s.x + off + sway, base - h);
      ctx.stroke();
    }
  }
}

function drawCoral(){
  for(const c of corals){
    const base = sandY(c.x);
    ctx.save(); ctx.translate(c.x, base + 6); ctx.scale(c.s, c.s);
    ctx.strokeStyle = c.col; ctx.lineCap = 'round';
    for(let a = 0; a < c.arms; a++){
      const ang = -Math.PI / 2 + (a - (c.arms - 1) / 2) * 0.42 + Math.sin(c.seed + a) * .08;
      const len = 38 + ((c.seed * (a + 3)) % 30);
      ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(ang) * len * .5, Math.sin(ang) * len * .55,
                           Math.cos(ang) * len, Math.sin(ang) * len);
      ctx.stroke();
      ctx.fillStyle = c.col; ctx.globalAlpha = .85;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * len, Math.sin(ang) * len, 8, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = c.col;
    ctx.beginPath(); ctx.ellipse(0, 2, 18, 10, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ wreck */

/** Where the wreck lies, and the mouth of its hold, in tank coordinates. */
export function wreckPos() {
  const x = W * 0.34;
  return { x, y: sandY(x) + 12, w: Math.min(W * 0.52, 520), h: Math.min(H * 0.3, 210) };
}

/** The opening she can swim into. Anything inside it is "exploring". */
export function wreckHold() {
  const p = wreckPos();
  return { x: p.x + p.w * 0.06, y: p.y - p.h * 0.42, rx: p.w * 0.17, ry: p.h * 0.24 };
}

/**
 * An old wooden ship, half buried and leaning, with a dark hold she can go
 * inside. Drawn behind the foreground reef so plants grow over its ribs.
 */
function drawWreck(t, lit = 0){
  if(!scene.wreck) return;
  const p = wreckPos();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-.13);                       // settled at a list, as wrecks do

  const hullTop = -p.h * 0.42;

  // hull
  ctx.fillStyle = '#6b4a2f';
  ctx.beginPath();
  ctx.moveTo(-p.w * .5, hullTop);
  ctx.quadraticCurveTo(-p.w * .56, p.h * .12, -p.w * .3, p.h * .2);
  ctx.lineTo(p.w * .34, p.h * .2);
  ctx.quadraticCurveTo(p.w * .56, p.h * .05, p.w * .5, hullTop);
  ctx.closePath();
  ctx.fill();

  // planking
  ctx.strokeStyle = 'rgba(40,25,12,.35)'; ctx.lineWidth = 2;
  for(let i = 1; i < 5; i++){
    const y = hullTop + (p.h * .62 / 5) * i;
    ctx.beginPath();
    ctx.moveTo(-p.w * .47 + i * 3, y); ctx.lineTo(p.w * .47 - i * 3, y);
    ctx.stroke();
  }

  // deck rail and a broken mast
  ctx.fillStyle = '#8a6440';
  ctx.fillRect(-p.w * .5, hullTop - 9, p.w, 11);
  ctx.fillStyle = '#7a5636';
  ctx.save(); ctx.translate(-p.w * .12, hullTop); ctx.rotate(.22);
  ctx.fillRect(-7, -p.h * .78, 14, p.h * .78);
  ctx.restore();
  // a tattered spar
  ctx.save(); ctx.translate(-p.w * .12, hullTop - p.h * .48); ctx.rotate(.22);
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(-p.w * .16, -5, p.w * .32, 9);
  ctx.restore();

  // portholes, catching the light
  for(let i = 0; i < 4; i++){
    const x = -p.w * .3 + i * p.w * .17;
    ctx.fillStyle = '#c9922f';
    ctx.beginPath(); ctx.arc(x, hullTop + p.h * .3, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#123044';
    ctx.beginPath(); ctx.arc(x, hullTop + p.h * .3, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(210,245,255,${.12 + .12 * Math.sin(t * 1.3 + i)})`;
    ctx.beginPath(); ctx.arc(x - 2, hullTop + p.h * .3 - 2, 4, 0, 7); ctx.fill();
  }

  ctx.restore();

  // the hold: a dark mouth that lights up warmly when she is inside it
  const h = wreckHold();
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(-.13);
  ctx.fillStyle = '#0d2233';
  ctx.beginPath(); ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, 7); ctx.fill();
  if(lit > 0){
    ctx.globalAlpha = lit * .55;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, h.rx);
    g.addColorStop(0, '#ffe6a8'); g.addColorStop(1, 'rgba(255,230,168,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // splintered frame
  ctx.strokeStyle = '#5a3d26'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, 7); ctx.stroke();
  ctx.restore();
}

/* --------------------------------------------------------- treasure chest */

/** Where the chest stands. The world needs this to aim taps at it. */
export function chestPos() {
  const x = W * 0.63;
  return { x, y: sandY(x) + 10 };
}

/**
 * The chest. `open` runs 0 (shut, keyhole showing) to 1 (lid right back, hoard
 * on show). The world owns that number so the lid, the glow and the treasure
 * all move in step with the key hunt.
 */
function drawChest(t, open = 0){
  const p = chestPos();
  // the lid runs past open and rocks back, so the cap sits above 1
  const lift = clamp(open, 0, 1.15);
  ctx.save(); ctx.translate(p.x, p.y);

  // warm light spilling out, brightest when the lid is right back
  if(lift > .04){
    ctx.save(); ctx.globalAlpha = .38 * lift; ctx.fillStyle = '#ffe680';
    ctx.beginPath(); ctx.ellipse(0, -26, 42 + lift * 14, 26 + lift * 10, 0, 0, 7); ctx.fill(); ctx.restore();
  }

  // the hoard, heaped higher the wider the chest stands open
  const heap = -22 - lift * 13;
  ctx.fillStyle = '#f5c542';
  for(let i = 0; i < 5; i++){
    ctx.beginPath(); ctx.arc(-16 + i * 8, heap + Math.sin(t * 2 + i) * lift, 5, 0, 7); ctx.fill();
  }
  if(lift > .3){
    ctx.fillStyle = '#ffef9f';
    for(let i = 0; i < 4; i++){
      ctx.beginPath(); ctx.arc(-12 + i * 8, heap - 7, 4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(2, heap - 14, 6, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,238,.9)';
    ctx.beginPath(); ctx.arc(0, heap - 16, 2.4, 0, 7); ctx.fill();
  }

  ctx.fillStyle = '#8b5a2b'; roundRect(-34, -26, 68, 28, 4); ctx.fill();
  ctx.fillStyle = '#c9922f'; ctx.fillRect(-34, -14, 68, 5);

  ctx.save(); ctx.translate(0, -26); ctx.rotate(-lift * 1.1);
  ctx.fillStyle = '#a06a34';
  ctx.beginPath(); ctx.moveTo(-34, 0);
  ctx.quadraticCurveTo(0, -30, 34, 0); ctx.lineTo(34, 2); ctx.lineTo(-34, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9922f'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(0, -30, 34, 0); ctx.stroke();
  ctx.restore();

  // the lock: a keyhole while it is shut, plain gold once it has been opened
  ctx.fillStyle = lift > .05 ? '#ffd76e' : '#e8c25c';
  ctx.beginPath(); ctx.arc(0, -14, 5.4, 0, 7); ctx.fill();
  if(lift <= .05){
    ctx.fillStyle = '#4a2f14';
    ctx.beginPath(); ctx.arc(0, -15, 1.9, 0, 7); ctx.fill();
    ctx.fillRect(-1, -14.6, 2, 4.2);
  }
  ctx.restore();
}

/* ----------------------------------------------------------------- pearl */

/** The pearl for the tilt game: iridescent, with a soft glow so it is easy to track. */
function drawPearl(p, t){
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.save();
  ctx.globalAlpha = .28 + .12 * Math.sin(t * 3);
  ctx.fillStyle = '#ffe6f6';
  ctx.beginPath(); ctx.arc(0, 0, p.r * 1.8, 0, 7); ctx.fill();
  ctx.restore();

  const grad = ctx.createRadialGradient(-p.r * .35, -p.r * .4, p.r * .12, 0, 0, p.r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(.55, '#ffe9f6');
  grad.addColorStop(1, '#d3aee6');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();

  ctx.strokeStyle = 'rgba(150,100,180,.45)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.stroke();

  ctx.rotate(p.spin);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.ellipse(-p.r * .34, -p.r * .38, p.r * .26, p.r * .18, -.6, 0, 7); ctx.fill();
  ctx.restore();
}

/* --------------------------------------------------------------- letters */

/** A big friendly letter rising through the water, outlined so it always reads. */
function drawLetter(l){
  const a = clamp(l.life / l.maxLife, 0, 1);
  ctx.save();
  ctx.globalAlpha = Math.min(1, a * 1.7);
  ctx.translate(l.x, l.y);
  ctx.rotate(l.rot);
  const grow = 1 + (1 - a) * 0.25;
  ctx.scale(grow, grow);
  ctx.font = `bold ${l.size}px "Baloo 2", "Comic Sans MS", "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.96)';
  ctx.lineWidth = 9;
  ctx.strokeText(l.char, 0, 0);
  ctx.fillStyle = l.color;
  ctx.fillText(l.char, 0, 0);
  ctx.restore();
}

/* ---------------------------------------------------------------- vistas */

/**
 * A place seen from far off, painted into the water rather than framed in it.
 *
 * Each destination gets its own silhouette on the distant seabed, drawn in
 * that place's own colours and then dissolved into the surrounding water with
 * a radial wash of the local water colour. No outline, no badge — it should
 * look like somewhere you could swim to, because that is what it is.
 */
function drawVista(to: string, x: number, y: number, r: number, glow = 0, t = 0){
  const there = SCENES[to as SceneId] ?? SCENES[DEFAULT_SCENE];
  const breathe = .86 + .14 * Math.sin(t * .7 + x * .01);

  // A silhouette, in a colour barely off this place's own deep water. Painting
  // a patch of somewhere else's water always read as an oval window stuck on
  // the glass; something genuinely far off is just a shape, dimmed by all the
  // water in between — which is how the ridge and the distant fish already work.
  ctx.save();
  ctx.translate(x, y);
  const col = mix(scene.water[4], there.water[3], .32 + glow * .35);
  ctx.globalAlpha = (.34 + glow * .45) * breathe;

  // A strip of far seabed to stand on. Without it the landmarks hang in
  // mid-water and read as odd floating wedges. It fades out sideways and has
  // no vertical edge, so it grounds them without framing them.
  const ground = ctx.createLinearGradient(-r * 1.35, 0, r * 1.35, 0);
  ground.addColorStop(0, 'rgba(0,0,0,0)');
  ground.addColorStop(.5, col);
  ground.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.ellipse(0, r * .72, r * 1.3, r * .1, 0, 0, 7);
  ctx.fill();

  ctx.fillStyle = col;
  drawVistaShape(to, r, t);
  ctx.restore();
}

/** The landmark that says which place this is. One flat colour, no backdrop. */
function drawVistaShape(to: string, r: number, t: number){
  const floor = 0;   // it sits on the ridge line the caller translated to
  if(to === 'kelpwald'){
    for(let i = 0; i < 7; i++){
      const kx = -r * .9 + i * (r * .3);
      const h = r * (.85 + (i % 3) * .3);
      ctx.save(); ctx.translate(kx, floor); ctx.rotate(Math.sin(t * .45 + i) * .06);
      ctx.beginPath();
      ctx.moveTo(-r * .055, 0);
      ctx.quadraticCurveTo(r * .1, -h * .6, 0, -h);
      ctx.quadraticCurveTo(-r * .17, -h * .6, r * .055, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if(to === 'tiefsee'){
    // the seabed falling away: two shoulders and a gulf between them
    ctx.beginPath();
    ctx.moveTo(-r * 1.3, floor + r * .5);
    ctx.lineTo(-r * 1.3, floor);
    ctx.quadraticCurveTo(-r * .7, floor - r * .12, -r * .34, floor + r * .5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 1.3, floor + r * .5);
    ctx.lineTo(r * 1.3, floor);
    ctx.quadraticCurveTo(r * .7, floor - r * .12, r * .34, floor + r * .5);
    ctx.closePath(); ctx.fill();
  } else if(to === 'wrack'){
    ctx.beginPath();
    ctx.moveTo(-r * .8, floor - r * .34);
    ctx.quadraticCurveTo(-r * .86, floor, -r * .5, floor + r * .07);
    ctx.lineTo(r * .58, floor + r * .07);
    ctx.quadraticCurveTo(r * .86, floor - r * .1, r * .74, floor - r * .34);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(-r * .2, floor - r * .34); ctx.rotate(.2);
    ctx.fillRect(-r * .04, -r * .8, r * .08, r * .8);
    ctx.fillRect(-r * .32, -r * .54, r * .64, r * .055);
    ctx.restore();
  } else if(to === 'lagune'){
    // a shallow bank rising towards the light
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, floor + r * .5);
    ctx.quadraticCurveTo(-r * .5, floor - r * .3, 0, floor - r * .34);
    ctx.quadraticCurveTo(r * .5, floor - r * .3, r * 1.2, floor + r * .5);
    ctx.closePath(); ctx.fill();
  } else {
    // the reef: a huddle of coral heads
    for(let i = 0; i < 5; i++){
      const cx = -r * .8 + i * (r * .4);
      const h = r * (.2 + (i % 2) * .16);
      ctx.beginPath();
      ctx.ellipse(cx, floor, r * .22, h, 0, Math.PI, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, floor + r * .04, r * 1, r * .16, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
  }
}

/** Blend two \'#rrggbb\' colours, k = 0 gives the first. */
function mix(a: string, b: string, k: number){
  const pa = parseInt(a.replace('#', ''), 16), pb = parseInt(b.replace('#', ''), 16);
  const ch = (sh: number) =>
    Math.round((((pa >> sh) & 255) * (1 - k)) + (((pb >> sh) & 255) * k));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/* ------------------------------------------------------------ atmosphere */

/**
 * Where the distant headlands are: one per place she can travel to. The ridge
 * line swells up to meet each of them, so a destination is a rise in the
 * background terrain rather than a shape floating in front of it.
 */
let headlands: { x: number; y: number; r: number; to: string; glow: number }[] = [];
export function setHeadlands(list: typeof headlands) { headlands = list; }

/**
 * The distant seabed, in layers. Layer 0 is furthest and palest; the last one
 * carries the headlands. Each is drawn by the caller at its own parallax rate,
 * which is what gives the background depth as she moves.
 */
export function ridgeY(layer: number, x: number) {
  const u = x / Math.max(1, W);
  const seed = scene.terrain.seed + layer * 57;
  const lift = H * (0.16 - layer * 0.05);
  let y = SAND - lift + (fbm(u * (1.7 + layer * 0.7) + seed, 3) - 0.5) * H * (0.1 + layer * 0.03);

  // the land rises into a headland wherever there is somewhere to go
  if (layer === RIDGE_LAYERS - 1) {
    for (const h of headlands) {
      const d = (x - h.x) / (h.r * 2.1);
      y = Math.min(y, h.y + h.r * 0.55 - Math.exp(-d * d) * h.r * 1.45);
    }
  }
  return y;
}

export const RIDGE_LAYERS = 3;

function drawRidgeLayer(layer: number, t: number){
  // In the deep the water is nearly black, so a silhouette painted in a darker
  // shade of it disappears. There, lift the ridges instead of deepening them.
  const dark = scene.tint ? scene.tint.alpha > 0.18 : false;
  const col = dark
    ? mix(scene.water[2], '#9fd8ff', 0.12 + layer * 0.1)
    : mix(scene.water[3], scene.water[4], layer / (RIDGE_LAYERS - 1));
  ctx.save();
  ctx.globalAlpha = (dark ? 0.3 + layer * 0.12 : 0.22 + layer * 0.12);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-40, H);
  ctx.lineTo(-40, ridgeY(layer, -40));
  for(let x = -40; x <= W + 40; x += 12) ctx.lineTo(x, ridgeY(layer, x));
  ctx.lineTo(W + 40, H);
  ctx.closePath();
  ctx.fill();

  // the landmarks stand on the nearest ridge, in that ridge's own colour, so
  // they are part of the silhouette rather than pasted over it
  if(layer === RIDGE_LAYERS - 1){
    for(const h of headlands){
      ctx.save();
      ctx.translate(h.x, ridgeY(layer, h.x) + 1);
      ctx.globalAlpha = 0.3 + h.glow * 0.45;
      ctx.fillStyle = mix(col, (SCENES[h.to as SceneId] ?? SCENES[DEFAULT_SCENE]).water[2], 0.3 + h.glow * 0.4);
      drawVistaShape(h.to, h.r, t);
      ctx.restore();
    }
  }
  ctx.restore();
}


/**
 * Caustics: the net of light the surface throws onto everything below. Two
 * layers of stretched sine ripples crossing at different speeds — cheap, and
 * it does more for "this is underwater" than anything else in the file.
 */
function drawCaustics(t){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const layers = W < 700 ? 1 : 2;
  for(let layer = 0; layer < layers; layer++){
    const sp = .18 + layer * .12;
    const sc = 1 + layer * .6;
    ctx.globalAlpha = .05 - layer * .015;
    ctx.strokeStyle = scene.ray;
    ctx.lineWidth = 16 + layer * 12;
    const lines = W < 700 ? 5 : 7;
    for(let i = 0; i < lines; i++){
      ctx.beginPath();
      const off = i * (H / (lines - 1)) + Math.sin(t * sp + i) * 26;
      for(let x = -60; x <= W + 60; x += 26){
        const y = off + Math.sin(x * .012 * sc + t * sp * 2 + i) * 34
                      + Math.cos(x * .005 - t * sp + i) * 20;
        x === -60 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * A slow column of tiny bubbles seeping out of the sand, the way a real tank
 * has one corner that fizzes. Purely decorative, and cheap.
 */
let seeps: { x: number; ph: number; rate: number }[] = [];
function buildSeeps(){
  seeps = [];
  const n = W < 700 ? 1 : 2;
  for(let i = 0; i < n; i++){
    seeps.push({ x: rnd(W * .1, W * .9), ph: rnd(0, 7), rate: rnd(.6, 1.3) });
  }
}
function drawSeeps(t){
  ctx.save();
  for(const sp of seeps){
    const base = sandY(sp.x);
    for(let i = 0; i < 9; i++){
      const p = ((t * sp.rate * .22 + i / 9 + sp.ph) % 1);
      const y = base - p * (base * .85);
      const r = 1.2 + p * 2.6;
      ctx.globalAlpha = (1 - p) * .34;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sp.x + Math.sin(p * 9 + sp.ph) * 9, y, r, 0, 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Specks of drifting plankton, so the water is never actually empty. */
let motes: { x: number; y: number; r: number; sp: number; ph: number; d: number }[] = [];
function buildMotes(){
  motes = [];
  const n = Math.max(8, Math.round((W / 18) * crowding()));
  for(let i = 0; i < n; i++){
    motes.push({
      x: Math.random() * W, y: Math.random() * H,
      r: rnd(.7, 2.6), sp: rnd(3, 13), ph: rnd(0, 7),
      d: Math.random()          // depth: near ones bigger, faster, brighter
    });
  }
}
function drawMotes(t){
  ctx.save();
  for(const m of motes){
    const y = (m.y - t * m.sp * (.4 + m.d)) % (H + 40);
    const x = m.x + Math.sin(t * .3 + m.ph) * (8 + m.d * 22);
    ctx.globalAlpha = .1 + m.d * .3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y < -20 ? y + H + 40 : y, m.r * (.5 + m.d), 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Big shapes cruising far behind everything, drawn as flat silhouettes in the
 * water colour. They read as "the sea keeps going back there".
 */
let farFish: { y: number; sp: number; s: number; ph: number; dir: 1 | -1 }[] = [];
function buildFarFish(){
  farFish = [];
  for(let i = 0; i < (W < 700 ? 2 : 4); i++){
    farFish.push({
      y: rnd(H * .12, H * .62), sp: rnd(7, 20), s: rnd(26, 70),
      ph: rnd(0, 400), dir: Math.random() < .5 ? -1 : 1
    });
  }
}
function drawFarFish(t){
  ctx.save();
  ctx.globalAlpha = .12;
  ctx.fillStyle = scene.water[4];
  for(const f of farFish){
    const span = W + 300;
    let x = (f.ph + t * f.sp) % span;
    if(f.dir < 0) x = span - x;
    x -= 150;
    const y = f.y + Math.sin(t * .25 + f.ph) * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f.dir * f.s / 40, f.s / 40);
    // a plain fish shape: body and tail, nothing that needs detail at this alpha
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 17, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(-58, -16 + Math.sin(t * 2 + f.ph) * 5);
    ctx.lineTo(-58, 16 + Math.sin(t * 2 + f.ph) * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- cursor */

/**
 * A cursor big and bright enough for a five-year-old to keep track of: a ring
 * with a dark halo so it shows up on pale sand and deep water alike, gold with
 * orbiting sparkles when it is over something worth tapping.
 */
function drawCursor(t, x, y, hot = false, press = 0){
  ctx.save();
  ctx.translate(x, y);
  const pulse = (Math.sin(t * 3.4) + 1) / 2;
  const r = (hot ? 20 : 13) + pulse * (hot ? 3.5 : 1.6) + press * 7;

  ctx.strokeStyle = 'rgba(0,40,60,.5)'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = hot ? '#ffd166' : '#ffffff'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();

  // the ripple a tap leaves behind
  if(press > 0){
    ctx.save(); ctx.globalAlpha = press * .8;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, r + (1 - press) * 30, 0, 7); ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = hot ? '#ffd166' : '#ffffff';
  ctx.strokeStyle = 'rgba(0,40,60,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, 7); ctx.fill(); ctx.stroke();

  if(hot){
    for(let i = 0; i < 4; i++){
      const a = t * 2 + i * Math.PI / 2;
      ctx.fillStyle = '#fff6c9';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8), 2.6 + pulse * 1.2, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ food */

/** One pellet, flake or krill, drawn where it floats. */
function drawFood(f, t){
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);
  if(f.kind === 'greens'){
    // a limp scrap of algae, tumbling as it sinks
    ctx.fillStyle = '#5fd08a';
    ctx.beginPath();
    ctx.moveTo(-5, -3); ctx.quadraticCurveTo(0, -6, 5, -2);
    ctx.quadraticCurveTo(6, 2, 2, 4); ctx.quadraticCurveTo(-3, 5, -5, -3);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,255,220,.65)';
    ctx.beginPath(); ctx.ellipse(-1.4, -1.4, 1.8, 1.1, -.5, 0, 7); ctx.fill();
  } else if(f.kind === 'krill'){
    // a little pink shrimp, curled up
    ctx.fillStyle = '#ff8fa8';
    ctx.beginPath(); ctx.ellipse(0, 0, 4.6, 2.6, 0, 0, 7); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 0); ctx.lineTo(7.4, -2.6); ctx.lineTo(7.4, 2.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(2, -1); ctx.stroke();
    ctx.fillStyle = '#3b2530';
    ctx.beginPath(); ctx.arc(-3.4, -.6, .9, 0, 7); ctx.fill();
  } else if(f.kind === 'muesli'){
    // Muschel-Müsli: a fluted blue shell bowl of oats, topped with little
    // coral shells, and a teal spoon. Drawn from Lucille's book illustration.
    ctx.strokeStyle = '#2f8f8a'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-7.5, -8.5); ctx.stroke();

    ctx.fillStyle = '#a8c4e0';
    ctx.beginPath(); ctx.arc(0, 0, 7, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 5.4, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#7fa2c6'; ctx.lineWidth = .7;
    for(let i = 0; i < 5; i++){
      const a = Math.PI + (i + 1) * (Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 5.4); ctx.stroke();
    }
    ctx.fillStyle = '#f2e6c8';
    ctx.beginPath(); ctx.ellipse(0, -.6, 4.4, 2.6, 0, 0, 7); ctx.fill();
    for(const [dx, dy] of [[-1.8, -1.4], [1.6, -1.6], [0, .4], [2.2, .3]] as [number, number][]){
      ctx.fillStyle = '#e08276';
      ctx.beginPath(); ctx.arc(dx, dy, 1.5, Math.PI, 0); ctx.closePath(); ctx.fill();
    }
  } else if(f.kind === 'plankton'){
    // a drifting wisp of seaweed plankton: green specks in a soft cloud
    ctx.fillStyle = 'rgba(150,225,170,.28)';
    ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, 7); ctx.fill();
    for(let i = 0; i < 6; i++){
      const a = i * 1.05 + f.rot;
      const r = 1.6 + (i % 3) * 1.5;
      ctx.fillStyle = i % 2 ? '#7fd89a' : '#bdf0c8';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r * .7, 1.5, .9, a, 0, 7);
      ctx.fill();
    }
  } else if(f.kind === 'candy'){
    // a little cloud of spun sugar, with a stick
    ctx.strokeStyle = '#e8d5b0'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 8); ctx.stroke();
    for(const [dx, dy, r, col] of [
      [-2.6, -1, 3.4, '#ffb3d9'], [2.6, -1.4, 3.2, '#ffc8e6'],
      [0, -3.4, 3.6, '#ff9ecb'], [0, 0, 3.8, '#ffd6ee']
    ] as [number, number, number, string][]){
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(dx, dy, r, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(-1.4, -3.4, 1.1, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 3.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd08a';
    ctx.beginPath(); ctx.arc(-1.2, -1.2, 1.4, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- reward */

/** The six treasures, drawn centred on the origin at roughly 40px across. */
function drawLoot(kind: string, t = 0){
  ctx.lineJoin = 'round';
  if(kind === 'crown'){
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.moveTo(-20, 8); ctx.lineTo(-22, -12); ctx.lineTo(-10, -2); ctx.lineTo(0, -18);
    ctx.lineTo(10, -2); ctx.lineTo(22, -12); ctx.lineTo(20, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9922f'; ctx.fillRect(-20, 8, 40, 6);
    for(const [x, c] of [[-11, '#ff5c8a'], [0, '#63d3f0'], [11, '#7ef0c8']] as [number, string][]){
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, 2, 3.4, 0, 7); ctx.fill();
    }
  } else if(kind === 'gem'){
    ctx.fillStyle = '#63d3f0';
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-16, -4); ctx.lineTo(-9, -16);
    ctx.lineTo(9, -16); ctx.lineTo(16, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a5ecff';
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-16, -4); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8f7ff';
    ctx.beginPath(); ctx.moveTo(-9, -16); ctx.lineTo(9, -16); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
  } else if(kind === 'pearl'){
    const g = ctx.createRadialGradient(-6, -7, 2, 0, 0, 18);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#ffe9f6'); g.addColorStop(1, '#c9a4e0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.ellipse(-6, -7, 5, 3.4, -.6, 0, 7); ctx.fill();
  } else if(kind === 'ring'){
    ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 5, 13, 0, 7); ctx.stroke();
    ctx.fillStyle = '#c471f5';
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-7, -8); ctx.lineTo(7, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e9c2ff';
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-7, -8); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill();
  } else if(kind === 'star'){
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    for(let i = 0; i < 10; i++){
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 8 : 20;
      i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff2c9'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#ffd0e6';
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.arc(0, 14, 19, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f39ac5'; ctx.lineWidth = 1.8;
    for(let i = 0; i < 5; i++){
      const a = Math.PI + (i + 1) * (Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 14);
      ctx.lineTo(Math.cos(a) * 19, 14 + Math.sin(a) * 19); ctx.stroke();
    }
  }
}

/** A soft ring over the chest, to show a key-carrier where it belongs. */
function drawChestBeacon(t){
  const p = chestPos();
  const pulse = (Math.sin(t * 2.4) + 1) / 2;
  ctx.save();
  ctx.translate(p.x, p.y - 16);
  ctx.globalAlpha = .2 + .24 * pulse;
  ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 48 + pulse * 9, 36 + pulse * 7, 0, 0, 7); ctx.stroke();
  ctx.restore();
}

/** The little golden key, lying flat and pointing right, centred on the origin. */
function drawKey(t, phase = 0, glint = 1){
  // Only the glint gives it away. The rest of the time it is a dull, tarnished
  // thing the colour of wet sand, easy to look straight past.
  // never fully dead: a faint sheen keeps its shape readable if she looks
  const shimmer = Math.max(.22, Math.max(0, glint) * (.55 + .45 * Math.sin(t * 7 + phase)));
  if(shimmer > .02){
    ctx.save(); ctx.globalAlpha = .5 * shimmer; ctx.fillStyle = '#fff6c9';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.restore();
  }

  ctx.fillStyle = shimmer > .3 ? '#f5c542' : '#dcbc63';
  ctx.strokeStyle = '#8a6a2e';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';

  roundRect(-4, -2.3, 18, 4.6, 2.3); ctx.fill(); ctx.stroke();   // shaft
  roundRect(8, 1.6, 3.2, 5.4, 1.2); ctx.fill(); ctx.stroke();    // long tooth
  roundRect(12.6, 1.6, 3.2, 3.6, 1.2); ctx.fill(); ctx.stroke(); // short tooth

  // the bow, drawn as a ring so the hole reads at this size
  ctx.strokeStyle = shimmer > .3 ? '#f5c542' : '#dcbc63'; ctx.lineWidth = 4.4;
  ctx.beginPath(); ctx.arc(-8.5, 0, 4.8, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#8a6a2e'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(-8.5, 0, 7, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(-8.5, 0, 2.6, 0, 7); ctx.stroke();

  ctx.strokeStyle = `rgba(255,255,255,${.2 + .65 * shimmer})`;
  ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(9, -1); ctx.stroke();
}


/* ---------------------------------------------------------- fish drawing */
/**
 * How closed an eye is right now, 0 to 1. Every creature blinks on its own
 * clock, derived from its phase — nothing to store, and the tank stops looking
 * like a room full of staring animals.
 */
export function blink(t: number, phase = 0){
  const cycle = 4.6;
  const p = ((t * .62 + phase * 2.7) % cycle) / cycle;
  const shut = .055;
  return p < shut ? Math.sin((p / shut) * Math.PI) : 0;
}

/* Set by drawCreature, so drawEye can blink without threading state through. */
let facePhase = 0, faceTime = 0;

function drawEye(x, y, r, look = 1, lid = blink(faceTime, facePhase)){
  const open = clamp(1 - lid, 0, 1);
  if(open < .14){
    // shut: a contented curve, which is worth more than a closed circle
    ctx.strokeStyle = '#22303a';
    ctx.lineWidth = Math.max(1.1, r * .34);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + r * .34, r * .9, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, open);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#22303a'; ctx.beginPath(); ctx.arc(r * .28 * (look||1), r * .1, r * .5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(r * .05, -r * .35, r * .22, 0, 7); ctx.fill();
  ctx.restore();
}

/**
 * A soft dark contour round a body. The tank is a busy place and a flat fill
 * against coral of the same value simply disappears; a hint of a line is what
 * the book illustrations use to keep every character readable.
 */
function contour(col, w = 1.6){
  ctx.save();
  ctx.globalAlpha = .3;
  ctx.strokeStyle = darken(col, 55);
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** A warm cheek, which is most of what makes these faces friendly. */
function blush(x, y, r){
  ctx.save();
  ctx.globalAlpha = .28;
  ctx.fillStyle = '#ff7f9e';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * .68, 0, 0, 7); ctx.fill();
  ctx.restore();
}
function smile(x, y, w, up = 5){
  ctx.strokeStyle = 'rgba(40,50,60,.65)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x, y + (up || 5), x + w / 2, y - 1); ctx.stroke();
}

function drawFish(c, t){
  const s = c.size, wag = Math.sin(t * c.tailSpeed + c.phase);
  let bw = 1, bh = .62, tail = 1;
  if(c.shape === 'tang'){ bw = .92; bh = .78; }
  if(c.shape === 'angel'){ bw = .82; bh = .95; tail = 1.15; }
  if(c.shape === 'guppy'){ bw = 1; bh = .5; tail = 1.2; }
  if(c.shape === 'puffer'){ bw = .88; bh = .86; tail = .7; }
  if(c.shape === 'goldfish'){ bw = .98; bh = .7; tail = 1.15; }

  ctx.fillStyle = c.fin;
  ctx.beginPath();
  const tx = -s * bw * .82;
  ctx.moveTo(tx + s * .1, 0);
  ctx.quadraticCurveTo(tx - s * .45 * tail, wag * s * .3 - s * .55 * tail, tx - s * .62 * tail, wag * s * .45 - s * .38 * tail);
  ctx.quadraticCurveTo(tx - s * .3 * tail, wag * s * .35, tx - s * .62 * tail, wag * s * .45 + s * .38 * tail);
  ctx.quadraticCurveTo(tx - s * .45 * tail, wag * s * .3 + s * .55 * tail, tx + s * .1, 0);
  ctx.fill();

  ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.moveTo(-s * .3, -s * bh * .82);
  ctx.quadraticCurveTo(0, -s * bh * (c.shape === 'angel' ? 2.0 : 1.5) - wag * 3, s * .28, -s * bh * .8);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * .16, s * bh * .78);
  ctx.quadraticCurveTo(s * .02, s * bh * (c.shape === 'angel' ? 1.8 : 1.35) + wag * 3, s * .3, s * bh * .74);
  ctx.closePath(); ctx.fill();

  const g = ctx.createLinearGradient(0, -s * bh, 0, s * bh);
  g.addColorStop(0, lighten(c.body, 28)); g.addColorStop(.55, c.body); g.addColorStop(1, darken(c.body, 18));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * bw, s * bh, 0, 0, 7); ctx.fill();
  contour(c.body, Math.max(1, s * .045));

  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, s * bw, s * bh, 0, 0, 7); ctx.clip();
  ctx.fillStyle = c.accent;
  if(c.shape === 'clown'){
    for(let i = -1; i <= 1; i++){
      ctx.beginPath();
      ctx.ellipse(i * s * .5 + s * .1, 0, s * .13, s * bh * 1.2, i * .12, 0, 7); ctx.fill();
    }
  } else if(c.shape === 'tang'){
    ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.ellipse(-s * .35, 0, s * .3, s * bh * 1.2, .2, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  } else if(c.shape === 'guppy' || c.shape === 'goldfish'){
    ctx.globalAlpha = .6;
    for(let i = 0; i < 5; i++){
      ctx.beginPath(); ctx.arc(-s * .5 + i * s * .3, Math.sin(i * 2) * s * .18, s * .1, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if(c.shape === 'puffer'){
    ctx.globalAlpha = .55;
    for(let i = 0; i < 10; i++){
      ctx.beginPath();
      ctx.arc(-s * .6 + (i % 5) * s * .32, (i < 5 ? -1 : 1) * s * .25, s * .07, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if(c.shape === 'angel'){
    ctx.globalAlpha = .5;
    for(let i = 0; i < 3; i++){
      ctx.beginPath(); ctx.ellipse(-s * .35 + i * s * .4, 0, s * .07, s * bh * 1.2, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.ellipse(s * .1, -s * bh * .45, s * .5, s * .16, -.12, 0, 7); ctx.fill();
  ctx.restore();

  ctx.fillStyle = c.fin; ctx.globalAlpha = .9;
  ctx.beginPath();
  ctx.ellipse(s * .12, s * bh * .3, s * .22, s * .12, .5 + wag * .18, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  blush(s * bw * .58, s * bh * .18, s * .13);
  drawEye(s * bw * .5, -s * bh * .25, s * .15);
  smile(s * bw * .72, -s * bh * .02, s * .2, s * .12);
}

/* --- the little purple shoal fish --------------------------------------- */
function drawMinnow(c, t){
  const s = c.size, wag = Math.sin(t * c.tailSpeed + c.phase);
  ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.moveTo(-s * .65, 0);
  ctx.lineTo(-s * 1.15, wag * s * .3 - s * .5);
  ctx.lineTo(-s * 1.15, wag * s * .3 + s * .5);
  ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, -s * .5, 0, s * .5);
  g.addColorStop(0, lighten(c.body, 34)); g.addColorStop(1, c.body);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.quadraticCurveTo(0, -s * .58, -s * .62, 0);
  ctx.quadraticCurveTo(0, s * .58, s, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.ellipse(0, -s * .18, s * .42, s * .1, -.1, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(s * .48, -s * .1, s * .17, 0, 7); ctx.fill();
  ctx.fillStyle = '#241a3d';
  ctx.beginPath(); ctx.arc(s * .52, -s * .08, s * .09, 0, 7); ctx.fill();
}

/* --- the mermaid -------------------------------------------------------- */
function drawMermaid(c, t){
  const s = c.size, sw = Math.sin(t * c.tailSpeed + c.phase);
  const wave = c.wiggle > 0 ? Math.sin(t * 14) : 0;

  // tail: an undulating ribbon trailing behind, ending in a big fluke
  const segs = 8, L = s * 1.15;
  const ty = k => Math.sin(t * c.tailSpeed + c.phase - k * 2.6) * s * .28 * k;
  const tw = k => s * .34 * (1 - k * .62) + s * .02;
  ctx.beginPath();
  ctx.moveTo(s * .1, -s * .3);
  for(let i = 0; i <= segs; i++){
    const k = i / segs;
    ctx.lineTo(s * .1 - L * k, ty(k) - tw(k));
  }
  for(let i = segs; i >= 0; i--){
    const k = i / segs;
    ctx.lineTo(s * .1 - L * k, ty(k) + tw(k));
  }
  ctx.closePath();
  const tg = ctx.createLinearGradient(s * .2, 0, -L, 0);
  tg.addColorStop(0, c.tailDark); tg.addColorStop(.5, c.tail); tg.addColorStop(1, '#fbd9e6');
  ctx.fillStyle = tg; ctx.fill();
  // scales
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.6;
  for(let i = 1; i <= 6; i++){
    const k = i / 8;
    ctx.beginPath();
    ctx.arc(s * .1 - L * k, ty(k), s * .22, -1.2, 1.2); ctx.stroke();
  }
  ctx.restore();

  // fluke: two soft rounded lobes
  const fx = s * .1 - L, fy = ty(1);
  const fl = ctx.createLinearGradient(fx, fy, fx - s * .8, fy);
  fl.addColorStop(0, c.tail); fl.addColorStop(1, '#fdd9e7');
  ctx.fillStyle = fl;
  ctx.beginPath();
  ctx.moveTo(fx + s * .14, fy);
  ctx.bezierCurveTo(fx - s * .08, fy - s * .24, fx - s * .34, fy - s * .4, fx - s * .58, fy - s * .58);
  ctx.bezierCurveTo(fx - s * .4, fy - s * .24, fx - s * .26, fy - s * .1, fx - s * .16, fy);
  ctx.bezierCurveTo(fx - s * .26, fy + s * .1, fx - s * .4, fy + s * .24, fx - s * .56, fy + s * .55);
  ctx.bezierCurveTo(fx - s * .32, fy + s * .36, fx - s * .08, fy + s * .22, fx + s * .14, fy);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for(let i = -1; i <= 1; i += 2){
    ctx.beginPath(); ctx.moveTo(fx - s * .05, fy);
    ctx.quadraticCurveTo(fx - s * .26, fy + i * s * .18, fx - s * .45, fy + i * s * .43);
    ctx.stroke();
  }

  // back arm
  ctx.strokeStyle = c.skinDark; ctx.lineWidth = s * .1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * .16, -s * .18);
  ctx.quadraticCurveTo(s * .02, s * .06, -s * .12, s * .02); ctx.stroke();

  // torso
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.moveTo(s * .42, -s * .42);
  ctx.quadraticCurveTo(s * .5, -s * .05, s * .16, s * .1);
  ctx.quadraticCurveTo(-s * .02, s * .16, s * .06, -s * .3);
  ctx.quadraticCurveTo(s * .2, -s * .52, s * .42, -s * .42);
  ctx.fill();
  // flowered top
  ctx.fillStyle = c.top;
  ctx.beginPath();
  ctx.moveTo(s * .05, -s * .3);
  ctx.quadraticCurveTo(s * .3, -s * .45, s * .44, -s * .3);
  ctx.quadraticCurveTo(s * .36, -s * .08, s * .12, -s * .04);
  ctx.quadraticCurveTo(s * .0, -s * .12, s * .05, -s * .3);
  ctx.fill();
  ctx.fillStyle = c.dots;
  for(let i = 0; i < 5; i++){
    const px = s * (.1 + (i % 3) * .12), py = -s * (.26 - Math.floor(i / 3) * .14);
    ctx.beginPath(); ctx.arc(px, py, s * .028, 0, 7); ctx.fill();
  }

  // hair flowing behind
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.moveTo(s * .5, -s * .78);
  ctx.quadraticCurveTo(s * .05, -s * 1.05, -s * .3, -s * .62 + sw * s * .06);
  ctx.quadraticCurveTo(-s * .5, -s * .3 + sw * s * .1, -s * .2, -s * .2);
  ctx.quadraticCurveTo(s * .1, -s * .34, s * .28, -s * .3);
  ctx.quadraticCurveTo(s * .5, -s * .4, s * .5, -s * .78);
  ctx.fill();
  // curls
  for(let i = 0; i < 7; i++){
    const a = i / 6;
    const cx2 = s * (.42 - a * .78), cy2 = -s * (.62 + Math.sin(a * 3.4) * .22) + sw * s * .05 * a;
    ctx.fillStyle = i % 2 ? c.hair : c.hairHi;
    ctx.beginPath(); ctx.arc(cx2, cy2, s * (.16 - a * .04), 0, 7); ctx.fill();
  }

  // head
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.ellipse(s * .56, -s * .6, s * .23, s * .25, .06, 0, 7); ctx.fill();
  // fringe
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.moveTo(s * .35, -s * .68);
  ctx.quadraticCurveTo(s * .52, -s * .95, s * .76, -s * .68);
  ctx.quadraticCurveTo(s * .6, -s * .76, s * .35, -s * .68);
  ctx.fill();
  ctx.beginPath(); ctx.arc(s * .38, -s * .7, s * .1, 0, 7); ctx.fill();
  // starfish hair clip
  ctx.fillStyle = '#ef5f4e';
  ctx.save(); ctx.translate(s * .34, -s * .56); ctx.rotate(.3);
  ctx.beginPath();
  for(let i = 0; i < 10; i++){
    const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? s * .035 : s * .095);
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
  // face
  blush(s * .72, -s * .48, s * .07);
  drawEye(s * .66, -s * .6, s * .062);
  ctx.strokeStyle = 'rgba(60,35,30,.6)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * .61, -s * .69); ctx.quadraticCurveTo(s * .66, -s * .73, s * .71, -s * .69); ctx.stroke();
  ctx.fillStyle = 'rgba(255,140,150,.35)';
  ctx.beginPath(); ctx.ellipse(s * .56, -s * .49, s * .055, s * .038, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(70,35,30,.75)'; ctx.lineWidth = Math.max(1.2, s * .03);
  ctx.beginPath(); ctx.moveTo(s * .66, -s * .5);
  ctx.quadraticCurveTo(s * .705, -s * .45, s * .745, -s * .5); ctx.stroke();

  // waving arm, on top of everything
  ctx.save();
  ctx.strokeStyle = c.skin; ctx.lineWidth = s * .1; ctx.lineCap = 'round';
  const ax = s * .38, ay = -s * .26;
  const raise = c.wiggle > 0 ? 1 : .3 + .3 * Math.sin(t * 1.2 + c.phase);
  const ex = ax + s * (.3 + .2 * raise) + wave * s * .12;
  const ey = ay - s * (.12 + .62 * raise);
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + s * .34, ay - s * .06 - raise * s * .12, ex, ey); ctx.stroke();
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(ex, ey, s * .08, 0, 7); ctx.fill();
  ctx.restore();
}

/* --- seahorses ---------------------------------------------------------- */
function drawSeahorse(c, t){
  const s = c.size, sw = Math.sin(t * c.tailSpeed + c.phase);
  const flutter = Math.sin(t * 13 + c.phase);

  // dorsal fin fluttering on the back
  ctx.fillStyle = c.fin; ctx.globalAlpha = .9;
  ctx.beginPath();
  ctx.moveTo(-s * .2, -s * .16);
  ctx.quadraticCurveTo(-s * .62 + flutter * s * .07, s * .08, -s * .34, s * .5);
  ctx.quadraticCurveTo(-s * .16, s * .2, -s * .2, -s * .16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = Math.max(1, s * .025);
  for(let i = 0; i < 3; i++){
    ctx.beginPath(); ctx.moveTo(-s * .21, -s * .06 + i * s * .12);
    ctx.lineTo(-s * (.45 + i * .02) + flutter * s * .05, s * (.05 + i * .12)); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // body: an S from the head down into a curled tail
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(s * .1, -s * .62);
    ctx.quadraticCurveTo(-s * .3, -s * .2, s * .0, s * .3);
    ctx.quadraticCurveTo(s * .26, s * .72, s * .04 + sw * s * .05, s * .92);
  };
  ctx.strokeStyle = c.dark; ctx.lineWidth = s * .42; ctx.lineCap = 'round';
  bodyPath(); ctx.stroke();
  ctx.strokeStyle = c.body; ctx.lineWidth = s * .34;
  bodyPath(); ctx.stroke();
  ctx.strokeStyle = c.accent; ctx.lineWidth = s * .12;
  ctx.beginPath();
  ctx.moveTo(s * .18, -s * .58);
  ctx.quadraticCurveTo(-s * .16, -s * .18, s * .1, s * .28);
  ctx.quadraticCurveTo(s * .3, s * .64, s * .1 + sw * s * .05, s * .84);
  ctx.stroke();

  // curled tail tip
  ctx.strokeStyle = c.body; ctx.lineWidth = s * .2; ctx.lineCap = 'round';
  ctx.beginPath();
  const cx2 = s * .04 + sw * s * .05, cy2 = s * .92;
  ctx.arc(cx2 - s * .16, cy2 + s * .04, s * .17, -.5, 4.4); ctx.stroke();

  // body ridge segments
  ctx.strokeStyle = 'rgba(150,90,10,.35)'; ctx.lineWidth = Math.max(1, s * .035);
  for(let i = 0; i < 7; i++){
    const f = i / 6;
    const px = s * .1 - Math.sin(f * 2.2) * s * .28 + f * f * s * .2;
    const py = -s * .62 + f * s * 1.4;
    ctx.beginPath();
    ctx.moveTo(px - s * .14, py); ctx.lineTo(px + s * .14, py - s * .04); ctx.stroke();
  }

  // head with a long snout
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(s * .16, -s * .74, s * .27, s * .23, -.25, 0, 7); ctx.fill();
  ctx.strokeStyle = c.body; ctx.lineWidth = s * .13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * .3, -s * .74);
  ctx.quadraticCurveTo(s * .52, -s * .76, s * .62, -s * .66); ctx.stroke();
  // coronet
  ctx.fillStyle = c.dark;
  for(let i = 0; i < 3; i++){
    ctx.beginPath();
    ctx.moveTo(s * (.0 + i * .1), -s * .92);
    ctx.lineTo(s * (.04 + i * .1), -s * 1.12);
    ctx.lineTo(s * (.1 + i * .1), -s * .9); ctx.fill();
  }
  // cheek fin
  ctx.fillStyle = c.fin; ctx.globalAlpha = .9;
  ctx.beginPath();
  ctx.ellipse(s * .06, -s * .62, s * .13, s * .07, .5 + flutter * .3, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  drawEye(s * .26, -s * .78, s * .1);
  ctx.strokeStyle = 'rgba(120,70,10,.6)'; ctx.lineWidth = Math.max(1.2, s * .04);
  ctx.beginPath(); ctx.moveTo(s * .38, -s * .68);
  ctx.quadraticCurveTo(s * .44, -s * .62, s * .5, -s * .66); ctx.stroke();
}

/* --- other friends ------------------------------------------------------ */
function drawShark(c, t){
  const s = c.size, wag = Math.sin(t * c.tailSpeed + c.phase);
  ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.moveTo(-s * .78, 0);
  ctx.lineTo(-s * 1.25 + wag * 6, -s * .55); ctx.lineTo(-s * 1.05 + wag * 5, 0);
  ctx.lineTo(-s * 1.2 + wag * 6, s * .4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * .1, -s * .4);
  ctx.lineTo(s * .05, -s * .95); ctx.lineTo(s * .3, -s * .34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * .12, s * .2);
  ctx.lineTo(s * .0, s * .68); ctx.lineTo(s * .42, s * .28); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, -s * .5, 0, s * .5);
  g.addColorStop(0, lighten(c.body, 22)); g.addColorStop(.6, c.body); g.addColorStop(1, c.accent);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * .8, 0);
  ctx.quadraticCurveTo(-s * .2, -s * .52, s * .95, -s * .12);
  ctx.quadraticCurveTo(s * 1.05, 0, s * .95, s * .14);
  ctx.quadraticCurveTo(-s * .2, s * .5, -s * .8, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,60,75,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * .5, s * .12); ctx.quadraticCurveTo(s * .72, s * .3, s * .9, s * .04); ctx.stroke();
  ctx.globalAlpha = .35;
  for(let i = 0; i < 3; i++){
    ctx.beginPath(); ctx.moveTo(s * .18 + i * s * .1, -s * .16);
    ctx.quadraticCurveTo(s * .2 + i * s * .1, 0, s * .18 + i * s * .1, s * .16); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  blush(s * .7, -s * .04, s * .1);
  drawEye(s * .62, -s * .2, s * .12);
}

function drawTurtle(c, t){
  const s = c.size, p = Math.sin(t * c.tailSpeed + c.phase);
  ctx.fillStyle = c.fin;
  ctx.save(); ctx.translate(s * .25, s * .3); ctx.rotate(p * .5 + .4);
  ctx.beginPath(); ctx.ellipse(0, 0, s * .42, s * .16, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(-s * .45, s * .28); ctx.rotate(-p * .5 + .3);
  ctx.beginPath(); ctx.ellipse(0, 0, s * .34, s * .14, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(s * .2, -s * .32); ctx.rotate(-p * .4 - .4);
  ctx.beginPath(); ctx.ellipse(0, 0, s * .36, s * .14, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.moveTo(-s * .7, 0); ctx.lineTo(-s * .95, -s * .1); ctx.lineTo(-s * .92, s * .12); ctx.fill();
  ctx.fillStyle = c.fin;
  ctx.beginPath(); ctx.ellipse(s * .78, -s * .05 + p * 2, s * .26, s * .2, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(-s * .1, -s * .3, s * .1, 0, 0, s);
  g.addColorStop(0, lighten(c.body, 25)); g.addColorStop(1, c.accent);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .78, s * .58, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(30,70,45,.5)'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .4, s * .3, 0, 0, 7); ctx.stroke();
  for(let i = 0; i < 6; i++){
    const a = i * Math.PI / 3;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .4, Math.sin(a) * s * .3);
    ctx.lineTo(Math.cos(a) * s * .76, Math.sin(a) * s * .56); ctx.stroke();
  }
  drawEye(s * .9, -s * .12 + p * 2, s * .1);
  smile(s * .95, s * .0 + p * 2, s * .14, s * .1);
}

function drawOctopus(c, t){
  const s = c.size, p = Math.sin(t * 1.8 + c.phase);
  ctx.strokeStyle = c.body; ctx.lineWidth = s * .17; ctx.lineCap = 'round';
  for(let i = 0; i < 8; i++){
    const off = (i - 3.5) * s * .19;
    const w = Math.sin(t * 2.4 + i * .8 + c.phase);
    ctx.beginPath(); ctx.moveTo(off * .7, s * .32);
    ctx.quadraticCurveTo(off + w * s * .18, s * .78, off * 1.35 + w * s * .34, s * 1.12);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(-s * .18, -s * .3, s * .1, 0, 0, s);
  g.addColorStop(0, c.accent); g.addColorStop(1, c.body);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0 + p * 2, s * .72, s * .66, 0, 0, 7); ctx.fill();
  blush(-s * .44, s * .08, s * .11);
  blush(s * .44, s * .08, s * .11);
  drawEye(-s * .26, -s * .12 + p * 2, s * .17, -1);
  drawEye(s * .26, -s * .12 + p * 2, s * .17, 1);
  smile(0, s * .24 + p * 2, s * .3, s * .16);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.ellipse(-s * .22, -s * .38 + p * 2, s * .24, s * .12, -.4, 0, 7); ctx.fill();
}

function drawJelly(c, t){
  const s = c.size, pulse = .5 + .5 * Math.sin(t * 1.8 + c.phase);
  const rx = s * (.62 + pulse * .12), ry = s * (.58 - pulse * .1);
  ctx.strokeStyle = c.fin; ctx.lineCap = 'round';
  for(let i = 0; i < 7; i++){
    const off = (i - 3) * s * .16;
    ctx.lineWidth = s * .07;
    ctx.beginPath(); ctx.moveTo(off, ry * .7);
    ctx.quadraticCurveTo(off + Math.sin(t * 2 + i) * s * .18, ry + s * .5,
                         off + Math.sin(t * 1.4 + i * 1.7) * s * .3, ry + s * 1.05);
    ctx.stroke();
  }
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-rx, 0);
  ctx.quadraticCurveTo(0, ry * .55, rx, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath(); ctx.ellipse(-rx * .3, -ry * .4, rx * .26, ry * .18, -.4, 0, 7); ctx.fill();
  drawEye(-rx * .28, -ry * .05, s * .1, -1);
  drawEye(rx * .28, -ry * .05, s * .1, 1);
  smile(0, ry * .3, s * .2, s * .1);
}

function drawCrab(c, t){
  const s = c.size, p = Math.sin(t * 6 + c.phase);
  ctx.strokeStyle = c.fin; ctx.lineWidth = s * .1; ctx.lineCap = 'round';
  for(let i = 0; i < 3; i++){
    for(const sgn of [-1, 1]){
      const bx = sgn * (s * .35 + i * s * .16), by = s * .1;
      const lift = Math.sin(t * 6 + i * 1.3 + (sgn > 0 ? 0 : 1.6)) * s * .12;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sgn * s * .3, by + s * .22 + lift, bx + sgn * s * .42, by + s * .5);
      ctx.stroke();
    }
  }
  for(const sgn of [-1, 1]){
    ctx.fillStyle = c.body;
    const cx = sgn * s * .72, cy = -s * .18 + p * s * .06;
    ctx.beginPath(); ctx.ellipse(cx, cy, s * .24, s * .18, sgn * .5, 0, 7); ctx.fill();
    ctx.strokeStyle = c.body; ctx.lineWidth = s * .09;
    ctx.beginPath(); ctx.moveTo(sgn * s * .42, s * .02); ctx.lineTo(cx - sgn * s * .06, cy + s * .06); ctx.stroke();
  }
  const g = ctx.createRadialGradient(0, -s * .2, s * .1, 0, 0, s * .7);
  g.addColorStop(0, c.accent); g.addColorStop(1, c.body);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .6, s * .44, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = c.body; ctx.lineWidth = s * .08;
  for(const sgn of [-1, 1]){
    ctx.beginPath(); ctx.moveTo(sgn * s * .18, -s * .28); ctx.lineTo(sgn * s * .22, -s * .58); ctx.stroke();
    drawEye(sgn * s * .22, -s * .62, s * .12, sgn);
  }
  smile(0, s * .12, s * .3, s * .12);
}

function drawStar(c, t){
  const s = c.size, p = .5 + .5 * Math.sin(t * 1.4 + c.phase);
  ctx.fillStyle = c.body;
  ctx.beginPath();
  for(let i = 0; i < 10; i++){
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = (i % 2 ? s * .34 : s * .8);
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = c.accent; ctx.globalAlpha = .55 + p * .3;
  for(let i = 0; i < 5; i++){
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
    ctx.beginPath(); ctx.arc(Math.cos(a) * s * .42, Math.sin(a) * s * .42, s * .09, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawEye(-s * .17, -s * .1, s * .12, -1);
  drawEye(s * .17, -s * .1, s * .12, 1);
  smile(0, s * .16, s * .22, s * .1);
}

function drawUnicorn(c, t){
  const s = c.size, wag = Math.sin(t * c.tailSpeed + c.phase);
  const cols = c.rainbow || RAINBOW;

  ctx.lineCap = 'round';
  for(let i = 0; i < cols.length; i++){
    const off = (i - (cols.length - 1) / 2) * s * .13;
    const w2 = Math.sin(t * c.tailSpeed + c.phase + i * .35);
    ctx.strokeStyle = cols[i]; ctx.lineWidth = s * .13;
    ctx.beginPath(); ctx.moveTo(-s * .72, off * .35);
    ctx.quadraticCurveTo(-s * 1.02 + w2 * s * .08, off * 1.5 + w2 * s * .14,
                         -s * 1.42 + w2 * s * .16, off * 2.15 + w2 * s * .34);
    ctx.stroke();
  }
  for(let i = 0; i < cols.length; i++){
    const bx = s * .36 - i * s * .16;
    const w2 = Math.sin(t * (c.tailSpeed * .6) + c.phase + i * .55);
    ctx.strokeStyle = cols[i]; ctx.lineWidth = s * .13;
    ctx.beginPath(); ctx.moveTo(bx, -s * .5);
    ctx.quadraticCurveTo(bx - s * .3, -s * .68 + w2 * 1.5, bx - s * .58, -s * .6 + w2 * 3.5);
    ctx.stroke();
  }
  ctx.fillStyle = c.fin;
  ctx.beginPath(); ctx.moveTo(-s * .12, s * .5);
  ctx.quadraticCurveTo(s * .04, s * .95 + wag * 3, s * .34, s * .46);
  ctx.closePath(); ctx.fill();

  const g = ctx.createLinearGradient(-s * .6, -s * .6, s * .6, s * .6);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#ffeaf7');
  g.addColorStop(.7, '#e6ecff'); g.addColorStop(1, '#dcfaff');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * .64, 0, 0, 7); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * .64, 0, 0, 7); ctx.clip();
  ctx.globalAlpha = .24;
  for(let i = 0; i < cols.length; i++){
    ctx.fillStyle = cols[i];
    const sh = Math.sin(t * 1.6 + c.phase + i * .6) * s * .1;
    ctx.beginPath();
    ctx.ellipse(-s * .7 + i * s * .3 + sh, 0, s * .16, s * .8, .35, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(s * .1, -s * .32, s * .48, s * .12, -.13, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  for(let i = 0; i < 4; i++){
    const tw = .5 + .5 * Math.sin(t * 3 + c.phase + i * 1.9);
    ctx.globalAlpha = tw * .9;
    const px = -s * .35 + i * s * .32, py = Math.sin(i * 2.3) * s * .22;
    const r = s * .07 * (.5 + tw);
    ctx.beginPath();
    ctx.moveTo(px, py - r); ctx.quadraticCurveTo(px + r * .25, py - r * .25, px + r, py);
    ctx.quadraticCurveTo(px + r * .25, py + r * .25, px, py + r);
    ctx.quadraticCurveTo(px - r * .25, py + r * .25, px - r, py);
    ctx.quadraticCurveTo(px - r * .25, py - r * .25, px, py - r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.fillStyle = c.fin; ctx.globalAlpha = .85;
  ctx.beginPath(); ctx.ellipse(s * .1, s * .22, s * .24, s * .12, .5 + wag * .18, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(s * .56, -s * .46); ctx.rotate(.24);
  const HL = s * .92, HW = s * .105;
  const hg = ctx.createLinearGradient(-HW, 0, HW, -HL);
  hg.addColorStop(0, '#e59400'); hg.addColorStop(.45, '#ffd76e'); hg.addColorStop(1, '#fff8dc');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(-HW, s * .06); ctx.lineTo(0, -HL); ctx.lineTo(HW, s * .06);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(214,150,10,.6)'; ctx.lineWidth = s * .032; ctx.lineCap = 'round';
  for(let i = 1; i <= 4; i++){
    const f = i / 5, yy = -HL * f, ww = HW * (1 - f) * .95;
    ctx.beginPath();
    ctx.moveTo(-ww, yy + ww * .55);
    ctx.quadraticCurveTo(0, yy - ww * .25, ww, yy - ww * .5);
    ctx.stroke();
  }
  const shine = .5 + .5 * Math.sin(t * 2.4 + c.phase);
  ctx.globalAlpha = .4 + shine * .6; ctx.fillStyle = '#fffbe6';
  const tr = s * .16 * (.55 + shine * .55), tq = tr * .22;
  ctx.translate(0, -HL);
  ctx.beginPath();
  ctx.moveTo(0, -tr); ctx.quadraticCurveTo(tq, -tq, tr, 0);
  ctx.quadraticCurveTo(tq, tq, 0, tr); ctx.quadraticCurveTo(-tq, tq, -tr, 0);
  ctx.quadraticCurveTo(-tq, -tq, 0, -tr); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  blush(s * .58, s * .1, s * .13);
  drawEye(s * .5, -s * .14, s * .16);
  ctx.strokeStyle = 'rgba(105,80,130,.6)'; ctx.lineWidth = Math.max(1.1, s * .035); ctx.lineCap = 'round';
  for(let i = 0; i < 3; i++){
    const a = -1.15 + i * .38;
    const ex = s * .5 + Math.cos(a) * s * .16, ey = -s * .14 + Math.sin(a) * s * .16;
    ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(a) * s * .13, ey + Math.sin(a) * s * .13); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,150,190,.42)';
  ctx.beginPath(); ctx.ellipse(s * .36, s * .1, s * .085, s * .055, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,140,.75)'; ctx.lineWidth = Math.max(1.4, s * .05);
  ctx.beginPath(); ctx.moveTo(s * .6, s * .04);
  ctx.quadraticCurveTo(s * .69, s * .16, s * .78, s * .05); ctx.stroke();
}


function lighten(col, amt){ return shade(col, amt); }
function darken(col, amt){ return shade(col, -amt); }
function shade(col, amt){
  if(col[0] !== '#') return col;
  let r = parseInt(col.substr(1,2),16), g = parseInt(col.substr(3,2),16), b = parseInt(col.substr(5,2),16);
  r = clamp(r + amt, 0, 255); g = clamp(g + amt, 0, 255); b = clamp(b + amt, 0, 255);
  return 'rgb(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ')';
}


/* Extra creature models drawn on top of the original engine.
   Everything here draws facing right, centred on the origin. */

/* ------------------------------------------------------------ helpers */
function spiralHorn(s, len, wid, t, ph){
  const g = ctx.createLinearGradient(-wid, 0, wid, -len);
  g.addColorStop(0, '#e59400'); g.addColorStop(.45, '#ffd76e'); g.addColorStop(1, '#fff8dc');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-wid, wid * .5); ctx.lineTo(0, -len); ctx.lineTo(wid, wid * .5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(206,142,10,.6)'; ctx.lineWidth = Math.max(.8, wid * .3);
  ctx.lineCap = 'round';
  for(let i = 1; i <= 4; i++){
    const f = i / 5, yy = -len * f, ww = wid * (1 - f) * .95;
    ctx.beginPath();
    ctx.moveTo(-ww, yy + ww * .55);
    ctx.quadraticCurveTo(0, yy - ww * .25, ww, yy - ww * .5);
    ctx.stroke();
  }
  const shine = .5 + .5 * Math.sin(t * 2.6 + ph);
  ctx.globalAlpha = .45 + shine * .55; ctx.fillStyle = '#fffbe6';
  const r = len * .17 * (.5 + shine * .6), q = r * .24;
  ctx.save(); ctx.translate(0, -len);
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.quadraticCurveTo(q, -q, r, 0);
  ctx.quadraticCurveTo(q, q, 0, r); ctx.quadraticCurveTo(-q, q, -r, 0);
  ctx.quadraticCurveTo(-q, -q, 0, -r); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* Flowing rainbow hair. Each strand is an S-curve that lifts away from the
   body, then falls and curls, rippling along its length. */
function hairFan(x0, y0, dirX, dirY, len, spread, n, cols, t, sp, ph, wide, curl = 1){
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  curl = curl === undefined ? 1 : curl;
  for(let i = 0; i < n; i++){
    const f = n > 1 ? i / (n - 1) : 0;
    const w  = Math.sin(t * sp + ph + i * .62);
    const w2 = Math.sin(t * sp * 1.35 + ph + i * .9);
    const bx = x0 + dirX * spread * f, by = y0 + dirY * spread * f;
    const l = len * (0.66 + 0.42 * Math.sin(f * 2.9 + 1.1) + 0.12 * (i % 3));
    const lift = -l * .3 * curl + w * l * .1;
    const midX = bx - l * .42, midY = by + lift;
    const endX = bx - l * .96 + w2 * l * .12;
    const endY = by + l * (.42 + .22 * curl) + w * l * .3;
    ctx.strokeStyle = cols[i % cols.length];
    ctx.lineWidth = wide * (1.15 - f * .3);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(midX, midY, bx - l * .78, by + lift * .2 + l * .2, endX, endY);
    ctx.stroke();
    /* a thin bright core down the middle of every other strand */
    if(i % 2 === 0){
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = wide * .26;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(midX, midY, bx - l * .78, by + lift * .2 + l * .2,
                        endX - l * .06, endY - l * .04);
      ctx.stroke();
    }
  }
}

/* the unicorn head, neck, mane and horn — shared by both unicorn kinds */
function unicornForeparts(c, t, s){
  const sp = c.tailSpeed || 5;
  const cols = c.mane || ['#ff9ec7','#ffc4e2','#ffe9a3','#b9f5dd','#a9dcff','#d8bcff'];

  /* mane, anchored along the crest of the neck */
  hairFan(s * .92, -s * .96, -.62, .78, s * .92, s * 1.05, 11, cols, t, sp * .5, c.phase, s * .115, 1.25);

  /* neck */
  const ng = ctx.createLinearGradient(s * .4, 0, s * 1.05, -s * 1.0);
  ng.addColorStop(0, c.shade); ng.addColorStop(1, c.body);
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(s * .28, -s * .1);
  ctx.quadraticCurveTo(s * .5, -s * .5, s * .82, -s * .92);
  ctx.lineTo(s * 1.12, -s * .78);
  ctx.quadraticCurveTo(s * .86, -s * .38, s * .74, s * .06);
  ctx.closePath(); ctx.fill();

  /* head + muzzle */
  ctx.save();
  ctx.translate(s * 1.06, -s * .96); ctx.rotate(-.34);
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .34, s * .21, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * .3, s * .08, s * .17, s * .13, .12, 0, 7); ctx.fill();
  ctx.fillStyle = c.shade;
  ctx.beginPath(); ctx.ellipse(s * .4, s * .1, s * .07, s * .05, 0, 0, 7); ctx.fill();
  /* nostril + mouth */
  ctx.fillStyle = 'rgba(150,110,140,.6)';
  ctx.beginPath(); ctx.ellipse(s * .4, s * .04, s * .022, s * .032, .3, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(150,110,140,.55)'; ctx.lineWidth = Math.max(1, s * .022);
  ctx.beginPath(); ctx.moveTo(s * .34, s * .16);
  ctx.quadraticCurveTo(s * .42, s * .2, s * .47, s * .14); ctx.stroke();
  /* ears */
  ctx.fillStyle = c.body;
  for(const e of [[-s * .18, -s * .16, -.5], [-s * .05, -s * .2, -.25]]){
    ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(e[2]);
    ctx.beginPath(); ctx.moveTo(-s * .07, 0);
    ctx.quadraticCurveTo(0, -s * .3, s * .07, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,215,.65)';
    ctx.beginPath(); ctx.moveTo(-s * .035, -s * .02);
    ctx.quadraticCurveTo(0, -s * .21, s * .035, -s * .02); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.body; ctx.restore();
  }
  /* horn */
  ctx.save(); ctx.translate(s * .02, -s * .2); ctx.rotate(.34);
  spiralHorn(s, s * .74, s * .085, t, c.phase);
  ctx.restore();
  /* forelock between the ears */
  hairFan(-s * .02, -s * .22, -.35, .45, s * .46, s * .26, 5, cols, t, sp * .75, c.phase + 1, s * .08, 1.6);
  /* eye */
  drawEye(s * .12, -s * .02, s * .085);
  ctx.strokeStyle = 'rgba(90,60,90,.65)'; ctx.lineWidth = Math.max(1, s * .022);
  for(let i = 0; i < 3; i++){
    const a = -1.25 + i * .34;
    const ex = s * .12 + Math.cos(a) * s * .085, ey = -s * .02 + Math.sin(a) * s * .085;
    ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(a) * s * .075, ey + Math.sin(a) * s * .075); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,150,190,.4)';
  ctx.beginPath(); ctx.ellipse(s * .2, s * .12, s * .07, s * .045, 0, 0, 7); ctx.fill();
  ctx.restore();
}

/* one leg: hip -> knee -> hoof */
function unicornLeg(c, s, hx, hy, phase, t, kneeDir, shade){
  const sp = (c.tailSpeed || 5);
  const a = Math.sin(t * sp + phase);
  const b = Math.sin(t * sp + phase + 1.15);
  const L1 = s * .40, L2 = s * .38;
  const upper = Math.PI / 2 + a * .62;
  const lower = upper + kneeDir * (.28 + (b * .5 + .5) * .55);
  const kx = hx + Math.cos(upper) * L1, ky = hy + Math.sin(upper) * L1;
  const fx = kx + Math.cos(lower) * L2, fy = ky + Math.sin(lower) * L2;
  ctx.lineCap = 'round';
  /* a soft outline first so pale legs stay readable against pale water */
  ctx.strokeStyle = shade ? 'rgba(150,132,180,.5)' : 'rgba(170,150,200,.42)';
  ctx.lineWidth = s * .205;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.strokeStyle = shade ? c.shade : c.body;
  ctx.lineWidth = s * .155;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.lineWidth = s * .105;
  ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  /* knee highlight */
  ctx.fillStyle = shade ? c.shade : 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(kx, ky, s * .062, 0, 7); ctx.fill();
  /* feathering above the hoof */
  ctx.strokeStyle = shade ? 'rgba(240,235,250,.7)' : '#fff';
  ctx.lineWidth = s * .12;
  ctx.beginPath();
  ctx.moveTo(fx - Math.cos(lower) * s * .1, fy - Math.sin(lower) * s * .1);
  ctx.lineTo(fx - Math.cos(lower) * s * .02, fy - Math.sin(lower) * s * .02);
  ctx.stroke();
  /* hoof */
  ctx.fillStyle = shade ? '#d7ad55' : '#f5c542';
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(lower - Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(-s * .075, 0); ctx.lineTo(s * .075, 0);
  ctx.lineTo(s * .065, s * .1); ctx.lineTo(-s * .065, s * .1);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------- a proper unicorn */
function drawUnicornLand(c, t){
  const s = c.size, sp = c.tailSpeed || 5;
  const cols = c.mane || ['#ff9ec7','#ffc4e2','#ffe9a3','#b9f5dd','#a9dcff','#d8bcff'];

  /* far legs first, in shadow */
  unicornLeg(c, s, s * .34, s * .18, 0.55, t, 1, true);
  unicornLeg(c, s, -s * .40, s * .16, 2.35, t, -1, true);

  /* tail, springing from the top of the rump and curling down */
  hairFan(-s * .56, -s * .34, -.08, .62, s * 1.25, s * .42, 11, cols, t, sp * .45, c.phase + 2, s * .12, 1.5);

  unicornForeparts(c, t, s);

  /* barrel: withers, dipped back, round rump */
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(s * .70, -s * .10);
    ctx.quadraticCurveTo(s * .50, -s * .44, s * .22, -s * .40);   // withers
    ctx.quadraticCurveTo(-s * .06, -s * .34, -s * .30, -s * .44); // dip of the back
    ctx.quadraticCurveTo(-s * .62, -s * .50, -s * .70, -s * .10); // rump
    ctx.quadraticCurveTo(-s * .74, s * .18, -s * .44, s * .28);
    ctx.quadraticCurveTo(-s * .10, s * .38, s * .24, s * .32);
    ctx.quadraticCurveTo(s * .58, s * .26, s * .70, s * .08);
    ctx.closePath();
  };
  ctx.strokeStyle = 'rgba(170,150,200,.4)'; ctx.lineWidth = s * .07;
  bodyPath(); ctx.stroke();
  const bg = ctx.createLinearGradient(0, -s * .46, 0, s * .36);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(.5, c.body); bg.addColorStop(1, c.shade);
  ctx.fillStyle = bg; bodyPath(); ctx.fill();
  /* highlight along the back, shade under the belly, hint of haunch */
  ctx.save(); bodyPath(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.beginPath(); ctx.ellipse(s * .1, -s * .3, s * .42, s * .1, -.06, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(150,130,185,.16)';
  ctx.beginPath(); ctx.ellipse(0, s * .34, s * .6, s * .18, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(150,130,185,.3)'; ctx.lineWidth = s * .045;
  ctx.beginPath(); ctx.arc(-s * .42, s * .0, s * .3, -1.4, .9); ctx.stroke();
  ctx.beginPath(); ctx.arc(s * .5, s * .02, s * .26, 2.2, 4.3); ctx.stroke();
  ctx.restore();

  /* near legs */
  unicornLeg(c, s, s * .40, s * .2, 2.0, t, 1, false);
  unicornLeg(c, s, -s * .34, s * .18, 3.9, t, -1, false);
}

/* --------------------------------- a sea unicorn: horse in front, fish behind */
function drawSeaUnicorn(c, t){
  const s = c.size, sp = c.tailSpeed || 4;
  const cols = c.mane || ['#ff9ec7','#ffc4e2','#ffe9a3','#b9f5dd','#a9dcff','#d8bcff'];
  const wag = Math.sin(t * sp + c.phase);

  /* the long fish tail, sweeping behind */
  const segs = 8, L = s * 1.5;
  const ty = k => Math.sin(t * sp + c.phase - k * 2.5) * s * .34 * k;
  const tw = k => s * .36 * (1 - k * .66) + s * .02;
  ctx.beginPath();
  ctx.moveTo(-s * .1, -s * .34);
  for(let i = 0; i <= segs; i++){ const k = i / segs; ctx.lineTo(-s * .1 - L * k, ty(k) - tw(k)); }
  for(let i = segs; i >= 0; i--){ const k = i / segs; ctx.lineTo(-s * .1 - L * k, ty(k) + tw(k)); }
  ctx.closePath();
  const tg = ctx.createLinearGradient(0, 0, -L, 0);
  tg.addColorStop(0, c.body); tg.addColorStop(.45, c.tail || '#bfe3ff');
  tg.addColorStop(1, '#e9f7ff');
  ctx.fillStyle = tg; ctx.fill();
  /* scales */
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = Math.max(1.2, s * .028);
  for(let i = 1; i <= 7; i++){
    const k = i / 9;
    ctx.beginPath(); ctx.arc(-s * .1 - L * k, ty(k), s * .24, -1.15, 1.15); ctx.stroke();
  }
  ctx.restore();
  /* trailing fin along the tail */
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.moveTo(-s * .3, -s * .26);
  ctx.quadraticCurveTo(-s * .8, -s * .78 + wag * s * .1, -s * 1.2, -s * .5 + wag * s * .16);
  ctx.quadraticCurveTo(-s * .8, -s * .44, -s * .5, -s * .2);
  ctx.closePath(); ctx.fill();
  /* fluke */
  const fx = -s * .1 - L, fy = ty(1);
  const fl = ctx.createLinearGradient(fx, fy, fx - s * .8, fy);
  fl.addColorStop(0, c.tail || '#bfe3ff'); fl.addColorStop(1, '#eef9ff');
  ctx.fillStyle = fl;
  ctx.beginPath();
  ctx.moveTo(fx + s * .16, fy);
  ctx.bezierCurveTo(fx - s * .08, fy - s * .28, fx - s * .38, fy - s * .46, fx - s * .66, fy - s * .68);
  ctx.bezierCurveTo(fx - s * .46, fy - s * .28, fx - s * .3, fy - s * .12, fx - s * .18, fy);
  ctx.bezierCurveTo(fx - s * .3, fy + s * .12, fx - s * .46, fy + s * .28, fx - s * .64, fy + s * .64);
  ctx.bezierCurveTo(fx - s * .36, fy + s * .42, fx - s * .08, fy + s * .26, fx + s * .16, fy);
  ctx.fill();

  unicornForeparts(c, t, s);

  /* chest */
  const bg = ctx.createLinearGradient(0, -s * .42, 0, s * .3);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(.6, c.body); bg.addColorStop(1, c.shade);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(s * .66, -s * .14);
  ctx.quadraticCurveTo(s * .2, -s * .46, -s * .16, -s * .34);
  ctx.quadraticCurveTo(-s * .34, -s * .2, -s * .2, s * .16);
  ctx.quadraticCurveTo(s * .2, s * .3, s * .66, s * .1);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath(); ctx.ellipse(s * .16, -s * .2, s * .3, s * .09, -.1, 0, 7); ctx.fill();

  /* two front hooves, paddling */
  unicornLeg(c, s, s * .3, s * .16, 1.1, t, 1, true);
  unicornLeg(c, s, s * .42, s * .2, 2.6, t, 1, false);
}

/* ------------------------------------------- a better everyday fish */
function drawFishPro(c, t){
  const s = c.size, wag = Math.sin(t * c.tailSpeed + c.phase);
  const wag2 = Math.sin(t * c.tailSpeed + c.phase - .7);
  let bw = 1, bh = .62, tail = 1;
  if(c.shape === 'tang'){ bw = .92; bh = .78; }
  if(c.shape === 'angel'){ bw = .82; bh = .95; tail = 1.15; }
  if(c.shape === 'guppy'){ bw = 1; bh = .5; tail = 1.2; }
  if(c.shape === 'puffer'){ bw = .88; bh = .86; tail = .7; }
  if(c.shape === 'goldfish'){ bw = .98; bh = .7; tail = 1.15; }

  /* tail, with visible rays */
  const tx = -s * bw * .82;
  const tipY = wag * s * .5, tipX = tx - s * .66 * tail;
  ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.moveTo(tx + s * .1, 0);
  ctx.quadraticCurveTo(tx - s * .45 * tail, wag * s * .3 - s * .58 * tail, tipX, tipY - s * .4 * tail);
  ctx.quadraticCurveTo(tx - s * .3 * tail, wag2 * s * .3, tipX, tipY + s * .4 * tail);
  ctx.quadraticCurveTo(tx - s * .45 * tail, wag * s * .3 + s * .58 * tail, tx + s * .1, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = Math.max(1, s * .035);
  ctx.lineCap = 'round';
  for(let i = -2; i <= 2; i++){
    ctx.beginPath(); ctx.moveTo(tx, 0);
    ctx.quadraticCurveTo(tx - s * .3 * tail, wag * s * .3 + i * s * .12,
                         tipX + s * .07, tipY + i * s * .17 * tail);
    ctx.stroke();
  }

  /* dorsal + anal fins */
  ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.moveTo(-s * .32, -s * bh * .82);
  ctx.quadraticCurveTo(-s * .05, -s * bh * (c.shape === 'angel' ? 2.05 : 1.55) - wag2 * 3,
                       s * .3, -s * bh * .8);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * .18, s * bh * .78);
  ctx.quadraticCurveTo(s * .02, s * bh * (c.shape === 'angel' ? 1.85 : 1.4) + wag2 * 3,
                       s * .32, s * bh * .74);
  ctx.closePath(); ctx.fill();

  /* body with a rim of light along the back */
  const g = ctx.createLinearGradient(0, -s * bh, 0, s * bh);
  g.addColorStop(0, lighten(c.body, 40)); g.addColorStop(.28, lighten(c.body, 14));
  g.addColorStop(.62, c.body); g.addColorStop(1, darken(c.body, 26));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * bw, s * bh, 0, 0, 7); ctx.fill();
  contour(c.body, Math.max(1, s * .045));

  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, s * bw, s * bh, 0, 0, 7); ctx.clip();

  /* scale texture */
  ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = Math.max(.8, s * .02);
  for(let r = 0; r < 5; r++){
    for(let q = 0; q < 4; q++){
      ctx.beginPath();
      ctx.arc(-s * .55 + r * s * .3, -s * .34 + q * s * .24 + (r % 2) * s * .12,
              s * .16, -1.1, 1.1);
      ctx.stroke();
    }
  }

  ctx.fillStyle = c.accent;
  if(c.shape === 'clown'){
    for(let i = -1; i <= 1; i++){
      ctx.beginPath();
      ctx.ellipse(i * s * .5 + s * .1, 0, s * .13, s * bh * 1.2, i * .12, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(30,30,50,.3)'; ctx.lineWidth = Math.max(1, s * .04);
    for(let i = -1; i <= 1; i++){
      ctx.beginPath();
      ctx.ellipse(i * s * .5 + s * .1, 0, s * .13, s * bh * 1.2, i * .12, 0, 7); ctx.stroke();
    }
  } else if(c.shape === 'tang'){
    ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.ellipse(-s * .35, 0, s * .3, s * bh * 1.2, .2, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  } else if(c.shape === 'guppy' || c.shape === 'goldfish'){
    ctx.globalAlpha = .55;
    for(let i = 0; i < 5; i++){
      ctx.beginPath(); ctx.arc(-s * .5 + i * s * .3, Math.sin(i * 2) * s * .18, s * .1, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if(c.shape === 'puffer'){
    ctx.globalAlpha = .5;
    for(let i = 0; i < 10; i++){
      ctx.beginPath();
      ctx.arc(-s * .6 + (i % 5) * s * .32, (i < 5 ? -1 : 1) * s * .25, s * .07, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if(c.shape === 'angel'){
    ctx.globalAlpha = .5;
    for(let i = 0; i < 3; i++){
      ctx.beginPath(); ctx.ellipse(-s * .35 + i * s * .4, 0, s * .07, s * bh * 1.2, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* gill cover */
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1.2, s * .045);
  ctx.beginPath();
  ctx.moveTo(s * .3, -s * bh * .55);
  ctx.quadraticCurveTo(s * .16, 0, s * .3, s * bh * .55);
  ctx.stroke();
  /* highlight along the top, shadow along the belly */
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath(); ctx.ellipse(s * .06, -s * bh * .58, s * .56, s * .14, -.1, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(20,40,70,.12)';
  ctx.beginPath(); ctx.ellipse(0, s * bh * .72, s * .7, s * .2, 0, 0, 7); ctx.fill();
  ctx.restore();

  /* pectoral fin, translucent */
  ctx.globalAlpha = .78; ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.ellipse(s * .14, s * bh * .3, s * .25, s * .12, .55 + wag2 * .3, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  blush(s * bw * .6, s * bh * .18, s * .135);
  drawEye(s * bw * .52, -s * bh * .27, s * .155);
  smile(s * bw * .74, -s * bh * .02, s * .2, s * .12);
}

/* -------------------------------------------- a tidier shoal fish */
function drawMinnowPro(c, t){
  const s = c.size, wag = Math.sin(t * c.tailSpeed + c.phase);
  ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.moveTo(-s * .6, 0);
  ctx.quadraticCurveTo(-s * .95, wag * s * .34 - s * .2, -s * 1.12, wag * s * .38 - s * .48);
  ctx.quadraticCurveTo(-s * .86, wag * s * .3, -s * 1.12, wag * s * .38 + s * .48);
  ctx.quadraticCurveTo(-s * .95, wag * s * .34 + s * .2, -s * .6, 0);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -s * .52, 0, s * .52);
  g.addColorStop(0, lighten(c.body, 55)); g.addColorStop(.45, c.body);
  g.addColorStop(1, darken(c.body, 22));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.quadraticCurveTo(s * .1, -s * .56, -s * .6, 0);
  ctx.quadraticCurveTo(s * .1, s * .56, s, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.ellipse(s * .05, -s * .2, s * .4, s * .09, -.08, 0, 7); ctx.fill();
  ctx.fillStyle = c.accent; ctx.globalAlpha = .5;
  ctx.beginPath(); ctx.ellipse(-s * .1, s * .06, s * .3, s * .1, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(s * .46, -s * .11, s * .175, 0, 7); ctx.fill();
  ctx.fillStyle = '#20183a';
  ctx.beginPath(); ctx.arc(s * .5, -s * .09, s * .095, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(s * .46, -s * .16, s * .04, 0, 7); ctx.fill();
}





/* Characters and creatures from the Mermaid Rangers books.
   Everything draws facing right, centred on the origin. */

/* ============================================================ merpeople */
function drawMerperson(c, t){
  const s = c.size;
  const sw = Math.sin(t * c.tailSpeed + c.phase);
  const wave = c.wiggle > 0 ? Math.sin(t * 14) : 0;

  /* ---------------------------------------------------------- the tail */
  const segs = 9, L = s * 1.22;
  const ty = k => Math.sin(t * c.tailSpeed + c.phase - k * 2.5) * s * .3 * k;
  const tw = k => s * .35 * (1 - k * .6) + s * .022;

  ctx.beginPath();
  ctx.moveTo(s * .1, -s * .3);
  for(let i = 0; i <= segs; i++){ const k = i / segs; ctx.lineTo(s * .08 - L * k, ty(k) - tw(k)); }
  for(let i = segs; i >= 0; i--){ const k = i / segs; ctx.lineTo(s * .08 - L * k, ty(k) + tw(k)); }
  ctx.closePath();
  const tg = ctx.createLinearGradient(s * .2, -s * .3, -L * .8, s * .3);
  tg.addColorStop(0, c.tailDark); tg.addColorStop(.45, c.tail);
  tg.addColorStop(1, lighten(c.tail, 34));
  ctx.fillStyle = tg; ctx.fill();

  /* scalloped scales + a sprinkle of glitter */
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = Math.max(1.2, s * .03);
  for(let i = 1; i <= 7; i++){
    const k = i / 9;
    ctx.beginPath(); ctx.arc(s * .08 - L * k, ty(k), s * .23, -1.25, 1.25); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for(let i = 0; i < 14; i++){
    const k = ((i * 37) % 90) / 100;
    const gx = s * .06 - L * k, gy = ty(k) + (((i * 53) % 100) / 100 - .5) * tw(k) * 1.5;
    const tw2 = .4 + .6 * Math.sin(t * 3.4 + i * 1.7 + c.phase);
    ctx.globalAlpha = tw2 * .9;
    ctx.beginPath(); ctx.arc(gx, gy, s * .022 * (.6 + tw2), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  /* fluke */
  const fx = s * .08 - L, fy = ty(1);
  const fl = ctx.createLinearGradient(fx, fy, fx - s * .8, fy);
  fl.addColorStop(0, c.tail); fl.addColorStop(1, lighten(c.tail, 45));
  ctx.fillStyle = fl;
  ctx.beginPath();
  ctx.moveTo(fx + s * .14, fy);
  ctx.bezierCurveTo(fx - s * .08, fy - s * .26, fx - s * .36, fy - s * .44, fx - s * .62, fy - s * .64);
  ctx.bezierCurveTo(fx - s * .42, fy - s * .26, fx - s * .28, fy - s * .1, fx - s * .17, fy);
  ctx.bezierCurveTo(fx - s * .28, fy + s * .1, fx - s * .42, fy + s * .26, fx - s * .6, fy + s * .6);
  ctx.bezierCurveTo(fx - s * .34, fy + s * .4, fx - s * .08, fy + s * .24, fx + s * .14, fy);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = Math.max(1.4, s * .034);
  ctx.lineCap = 'round';
  for(let i = -1; i <= 1; i += 2){
    ctx.beginPath(); ctx.moveTo(fx - s * .05, fy);
    ctx.quadraticCurveTo(fx - s * .28, fy + i * s * .2, fx - s * .48, fy + i * s * .47);
    ctx.stroke();
  }

  /* --------------------------------------------------------- back arm */
  ctx.strokeStyle = c.skinDark; ctx.lineWidth = s * .095; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * .18, -s * .2);
  ctx.quadraticCurveTo(s * .04, s * .04, -s * .1, s * .0); ctx.stroke();
  ctx.fillStyle = c.skinDark;
  ctx.beginPath(); ctx.arc(-s * .11, s * .0, s * .065, 0, 7); ctx.fill();

  /* ----------------------------------------------------------- torso */
  const bodyG = ctx.createLinearGradient(0, -s * .5, 0, s * .16);
  bodyG.addColorStop(0, lighten(c.skin, 16)); bodyG.addColorStop(1, c.skin);
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.moveTo(s * .44, -s * .44);
  ctx.quadraticCurveTo(s * .52, -s * .06, s * .18, s * .1);
  ctx.quadraticCurveTo(-s * .02, s * .16, s * .06, -s * .32);
  ctx.quadraticCurveTo(s * .2, -s * .54, s * .44, -s * .44);
  ctx.fill();

  /* top */
  ctx.fillStyle = c.top;
  ctx.beginPath();
  ctx.moveTo(s * .04, -s * .32);
  ctx.quadraticCurveTo(s * .3, -s * .48, s * .46, -s * .32);
  ctx.quadraticCurveTo(s * .38, -s * .06, s * .13, -s * .02);
  ctx.quadraticCurveTo(-s * .01, -s * .12, s * .04, -s * .32);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * .04, -s * .32);
  ctx.quadraticCurveTo(s * .3, -s * .48, s * .46, -s * .32);
  ctx.quadraticCurveTo(s * .38, -s * .06, s * .13, -s * .02);
  ctx.quadraticCurveTo(-s * .01, -s * .12, s * .04, -s * .32);
  ctx.clip();
  if(c.pattern === 'stripes'){
    ctx.fillStyle = c.topAlt;
    for(let i = 0; i < 6; i++){
      ctx.fillRect(s * (-.04 + i * .1), -s * .55, s * .05, s);
    }
  } else if(c.pattern === 'plaid'){
    ctx.fillStyle = c.topAlt; ctx.globalAlpha = .75;
    for(let i = 0; i < 5; i++) ctx.fillRect(s * (-.02 + i * .12), -s * .55, s * .045, s);
    for(let i = 0; i < 5; i++) ctx.fillRect(-s * .1, s * (-.46 + i * .11), s, s * .04);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = c.topAlt;
    for(let i = 0; i < 6; i++){
      const px = s * (.09 + (i % 3) * .13), py = -s * (.28 - Math.floor(i / 3) * .14);
      for(let p = 0; p < 5; p++){
        const a = p / 5 * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * s * .022, py + Math.sin(a) * s * .022, s * .017, 0, 7);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  /* soft shading under the top */
  ctx.fillStyle = 'rgba(80,50,60,.12)';
  ctx.beginPath(); ctx.ellipse(s * .22, -s * .04, s * .18, s * .05, .1, 0, 7); ctx.fill();

  /* -------------------------------------------------------- the hair */
  const H = c.hairStyle || 'curly';
  ctx.fillStyle = c.hair;
  if(H === 'curly'){
    ctx.beginPath();
    ctx.moveTo(s * .52, -s * .8);
    ctx.quadraticCurveTo(s * .04, -s * 1.12, -s * .34, -s * .66 + sw * s * .05);
    ctx.quadraticCurveTo(-s * .56, -s * .3 + sw * s * .09, -s * .2, -s * .2);
    ctx.quadraticCurveTo(s * .12, -s * .36, s * .3, -s * .32);
    ctx.quadraticCurveTo(s * .54, -s * .42, s * .52, -s * .8);
    ctx.fill();
    for(let i = 0; i < 9; i++){
      const a = i / 8;
      const cx2 = s * (.46 - a * .86), cy2 = -s * (.64 + Math.sin(a * 3.6) * .24) + sw * s * .05 * a;
      ctx.fillStyle = i % 3 === 0 ? c.streak || c.hairHi : (i % 2 ? c.hair : c.hairHi);
      ctx.beginPath(); ctx.arc(cx2, cy2, s * (.17 - a * .045), 0, 7); ctx.fill();
    }
  } else if(H === 'ponytail'){
    /* the ponytail itself, sweeping back and down */
    ctx.strokeStyle = c.hair; ctx.lineCap = 'round'; ctx.lineWidth = s * .17;
    for(let i = 0; i < 4; i++){
      const w2 = Math.sin(t * c.tailSpeed * .8 + c.phase + i) * s * .06;
      ctx.strokeStyle = i === 2 ? (c.streak || c.hairHi) : (i % 2 ? c.hairHi : c.hair);
      ctx.lineWidth = s * (.16 - i * .022);
      ctx.beginPath();
      ctx.moveTo(s * .3, -s * .66);
      ctx.bezierCurveTo(s * .02, -s * .62 + i * s * .04,
                        -s * .2, -s * .3 + w2, -s * .34 + w2, s * .04 + i * s * .05);
      ctx.stroke();
    }
    /* the cap of hair over the head */
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.moveTo(s * .34, -s * .68);
    ctx.quadraticCurveTo(s * .5, -s * 1.02, s * .8, -s * .74);
    ctx.quadraticCurveTo(s * .84, -s * .88, s * .62, -s * .92);
    ctx.quadraticCurveTo(s * .36, -s * .92, s * .3, -s * .6);
    ctx.fill();
    ctx.fillStyle = c.hairHi;
    ctx.beginPath(); ctx.ellipse(s * .58, -s * .84, s * .16, s * .07, -.2, 0, 7); ctx.fill();
    /* hair tie */
    ctx.fillStyle = c.tie || '#ff9ec7';
    ctx.beginPath(); ctx.ellipse(s * .31, -s * .66, s * .06, s * .075, .2, 0, 7); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(s * .58, -s * .74);
    ctx.quadraticCurveTo(s * .3, -s * 1.0, s * .0, -s * .66);
    ctx.quadraticCurveTo(-s * .12, -s * .46, s * .06, -s * .34);
    ctx.quadraticCurveTo(s * .3, -s * .46, s * .5, -s * .44);
    ctx.quadraticCurveTo(s * .62, -s * .5, s * .58, -s * .74);
    ctx.fill();
    for(let i = 0; i < 4; i++){
      ctx.fillStyle = i % 2 ? c.hairHi : c.hair;
      ctx.beginPath();
      ctx.arc(s * (.42 - i * .13), -s * (.72 - Math.sin(i) * .06), s * .13, 0, 7); ctx.fill();
    }
  }

  /* --------------------------------------------------------- the head */
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.ellipse(s * .58, -s * .64, s * .255, s * .275, .05, 0, 7); ctx.fill();
  /* ear */
  ctx.beginPath(); ctx.ellipse(s * .4, -s * .58, s * .055, s * .075, 0, 0, 7); ctx.fill();
  ctx.fillStyle = c.skinDark;
  ctx.beginPath(); ctx.ellipse(s * .4, -s * .58, s * .026, s * .04, 0, 0, 7); ctx.fill();
  ctx.fillStyle = c.skin;
  /* fringe over the forehead */
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.moveTo(s * .34, -s * .7);
  ctx.quadraticCurveTo(s * .52, -s * .98, s * .78, -s * .68);
  ctx.quadraticCurveTo(s * .62, -s * .8, s * .48, -s * .74);
  ctx.quadraticCurveTo(s * .4, -s * .72, s * .34, -s * .7);
  ctx.fill();
  ctx.beginPath(); ctx.arc(s * .37, -s * .72, s * .1, 0, 7); ctx.fill();

  /* accessory */
  if(c.accessory === 'starfish'){
    ctx.fillStyle = c.accColor || '#ef5f4e';
    ctx.save(); ctx.translate(s * .34, -s * .58); ctx.rotate(.3);
    ctx.beginPath();
    for(let i = 0; i < 10; i++){
      const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? s * .035 : s * .1);
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  } else if(c.accessory === 'shell'){
    ctx.fillStyle = c.accColor || '#ffc2e8';
    ctx.beginPath(); ctx.ellipse(s * .36, -s * .8, s * .09, s * .07, -.4, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(180,120,150,.5)'; ctx.lineWidth = Math.max(1, s * .015);
    for(let i = -1; i <= 1; i++){
      ctx.beginPath(); ctx.moveTo(s * .36, -s * .8);
      ctx.lineTo(s * .36 + i * s * .05, -s * .87); ctx.stroke();
    }
  }

  /* ---------------------------------------------------------- the face */
  const ex0 = s * .68, ey0 = -s * .64, er = s * .095;
  drawEye(ex0, ey0, er);
  /* lashes */
  ctx.strokeStyle = 'rgba(45,28,28,.8)'; ctx.lineWidth = Math.max(1, s * .02);
  ctx.lineCap = 'round';
  for(let i = 0; i < 3; i++){
    const a = -1.35 + i * .36;
    ctx.beginPath();
    ctx.moveTo(ex0 + Math.cos(a) * er, ey0 + Math.sin(a) * er);
    ctx.lineTo(ex0 + Math.cos(a) * er * 1.55, ey0 + Math.sin(a) * er * 1.55);
    ctx.stroke();
  }
  /* brow */
  ctx.strokeStyle = 'rgba(50,30,30,.65)'; ctx.lineWidth = Math.max(1.2, s * .026);
  ctx.beginPath(); ctx.moveTo(s * .61, -s * .78);
  ctx.quadraticCurveTo(s * .68, -s * .84, s * .76, -s * .77); ctx.stroke();
  /* nose */
  ctx.strokeStyle = 'rgba(120,75,60,.45)'; ctx.lineWidth = Math.max(1, s * .022);
  ctx.beginPath(); ctx.moveTo(s * .8, -s * .58);
  ctx.quadraticCurveTo(s * .83, -s * .54, s * .79, -s * .52); ctx.stroke();
  if(c.glasses){
    ctx.globalAlpha = .22; ctx.fillStyle = '#eaf4ff';
    ctx.beginPath(); ctx.arc(ex0, ey0, s * .135, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * .43, -s * .615, s * .1, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.glassCol || '#5a4a7a'; ctx.lineWidth = Math.max(1.4, s * .03);
    ctx.beginPath(); ctx.arc(ex0, ey0, s * .135, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * .43, -s * .615, s * .1, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * .545, -s * .635); ctx.lineTo(s * .53, -s * .62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * .335, -s * .625); ctx.lineTo(s * .27, -s * .6); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,140,150,.35)';
  ctx.beginPath(); ctx.ellipse(s * .6, -s * .5, s * .065, s * .045, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(70,35,30,.8)'; ctx.lineWidth = Math.max(1.2, s * .028);
  ctx.beginPath(); ctx.moveTo(s * .68, -s * .48);
  ctx.quadraticCurveTo(s * .735, -s * .42, s * .79, -s * .48); ctx.stroke();

  /* ---------------------------------------------------- the front arm */
  ctx.save();
  ctx.strokeStyle = c.skin; ctx.lineWidth = s * .105; ctx.lineCap = 'round';
  const ax = s * .38, ay = -s * .28;
  const raise = c.wiggle > 0 ? 1 : .3 + .3 * Math.sin(t * 1.2 + c.phase);
  const ex = ax + s * (.3 + .2 * raise) + wave * s * .12;
  const ey = ay - s * (.12 + .62 * raise);
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + s * .34, ay - s * .06 - raise * s * .12, ex, ey); ctx.stroke();
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(ex, ey, s * .075, 0, 7); ctx.fill();
  ctx.restore();
}

/* ==================================================== zebra moray eel */
function drawEel(c, t){
  const s = c.size, sp = c.tailSpeed || 3;
  const N = 26, L = s * 3.2;
  const pts = [];
  for(let i = 0; i <= N; i++){
    const k = i / N;
    pts.push({
      x: s * 1.0 - L * k,
      y: Math.sin(t * sp + c.phase - k * 5.2) * s * .42 * Math.min(1, k * 2.6),
      w: s * .30 * (1 - k * .82) + s * .03
    });
  }
  const edge = (sign) => {
    for(let i = 0; i <= N; i++){
      const p = pts[i], q = pts[Math.min(N, i + 1)], r = pts[Math.max(0, i - 1)];
      const dx = q.x - r.x, dy = q.y - r.y, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      const X = p.x + nx * p.w * sign, Y = p.y + ny * p.w * sign;
      i === 0 && sign > 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
    }
  };
  /* dorsal frill */
  ctx.fillStyle = c.fin; ctx.globalAlpha = .8;
  ctx.beginPath();
  for(let i = 0; i <= N; i++){
    const p = pts[i];
    ctx.lineTo(p.x, p.y - p.w - s * .16 * Math.sin(i / N * Math.PI));
  }
  for(let i = N; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w * .7);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath(); edge(1);
  for(let i = N; i >= 0; i--){
    const p = pts[i], q = pts[Math.min(N, i + 1)], r = pts[Math.max(0, i - 1)];
    const dx = q.x - r.x, dy = q.y - r.y, d = Math.hypot(dx, dy) || 1;
    ctx.lineTo(p.x + (dy / d) * p.w, p.y - (dx / d) * p.w);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -s * .4, 0, s * .4);
  g.addColorStop(0, lighten(c.body, 26)); g.addColorStop(.6, c.body);
  g.addColorStop(1, darken(c.body, 24));
  ctx.fillStyle = g; ctx.fill();

  /* zebra bands */
  ctx.save(); ctx.clip();
  ctx.strokeStyle = c.accent; ctx.lineCap = 'butt';
  for(let i = 1; i < N; i += 2){
    const p = pts[i];
    ctx.lineWidth = s * (.12 + (i % 3) * .04);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - s * .5); ctx.lineTo(p.x - s * .08, p.y + s * .5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.beginPath(); ctx.ellipse(s * .2, -s * .16, s * 1.2, s * .07, -.05, 0, 7); ctx.fill();
  ctx.restore();

  /* head */
  const hx = pts[0].x, hy = pts[0].y;
  ctx.fillStyle = lighten(c.body, 14);
  ctx.beginPath(); ctx.ellipse(hx - s * .08, hy, s * .34, s * .27, 0, 0, 7); ctx.fill();
  /* snout + smiling mouth */
  ctx.beginPath(); ctx.ellipse(hx + s * .2, hy + s * .04, s * .18, s * .15, .1, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,30,.7)'; ctx.lineWidth = Math.max(1.2, s * .045);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx + s * .06, hy + s * .12);
  ctx.quadraticCurveTo(hx + s * .22, hy + s * .2, hx + s * .34, hy + s * .06);
  ctx.stroke();
  drawEye(hx + s * .1, hy - s * .1, s * .1);
}

/* ============================================================ sea snail */
function drawSnail(c, t){
  const s = c.size, bob = Math.sin(t * (c.tailSpeed || 3) + c.phase);

  /* spiral shell goes down first, so the snail sits in front of it */
  const sg = ctx.createLinearGradient(-s * .5, -s * .7, s * .4, s * .4);
  sg.addColorStop(0, lighten(c.body, 45)); sg.addColorStop(.5, c.body);
  sg.addColorStop(1, darken(c.body, 26));
  ctx.strokeStyle = sg; ctx.lineCap = 'round';
  ctx.lineWidth = s * .36;
  ctx.beginPath();
  for(let a2 = 0; a2 < 8.6; a2 += .12){
    const r = s * (.1 + a2 * .108);
    const x = -s * .12 + Math.cos(-a2 + 1.1) * r * .95;
    const y = -s * .04 + Math.sin(-a2 + 1.1) * r * .8;
    a2 === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = s * .07;
  ctx.beginPath();
  for(let a2 = 0.6; a2 < 8.2; a2 += .12){
    const r = s * (.1 + a2 * .108);
    const x = -s * .12 + Math.cos(-a2 + 1.1) * r * .95 + s * .06;
    const y = -s * .04 + Math.sin(-a2 + 1.1) * r * .8 - s * .06;
    a2 === 0.6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  /* the soft foot, gliding along */
  const fg = ctx.createLinearGradient(0, s * .1, 0, s * .62);
  fg.addColorStop(0, lighten(c.foot || '#e7d3ef', 12));
  fg.addColorStop(1, darken(c.foot || '#e7d3ef', 22));
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-s * .62, s * .5);
  ctx.quadraticCurveTo(-s * .2, s * .74 + bob * s * .03, s * .62, s * .56);
  ctx.quadraticCurveTo(s * 1.0, s * .42, s * .94, s * .2);
  ctx.quadraticCurveTo(s * .5, s * .3, -s * .4, s * .24);
  ctx.quadraticCurveTo(-s * .8, s * .34, -s * .62, s * .5);
  ctx.fill();
  /* ripple along the foot */
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1, s * .03);
  ctx.beginPath();
  for(let i = 0; i <= 8; i++){
    const x = -s * .55 + i * s * .19;
    const y = s * .58 + Math.sin(i * 1.1 + t * 4 + c.phase) * s * .035;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  /* head */
  ctx.fillStyle = fg;
  ctx.beginPath(); ctx.ellipse(s * .82, s * .22, s * .26, s * .2, -.18, 0, 7); ctx.fill();
  /* eye stalks */
  ctx.strokeStyle = darken(c.foot || '#e7d3ef', 6); ctx.lineWidth = s * .085;
  ctx.lineCap = 'round';
  for(let i = 0; i < 2; i++){
    const tipx = s * (.9 + i * .16) + bob * s * .05, tipy = s * (-.3 - i * .12) + bob * s * .04;
    ctx.beginPath();
    ctx.moveTo(s * (.76 + i * .08), s * .12);
    ctx.quadraticCurveTo(s * (.9 + i * .1), s * -.08, tipx, tipy);
    ctx.stroke();
    ctx.fillStyle = '#fdfdff';
    ctx.beginPath(); ctx.ellipse(tipx, tipy, s * .07, s * .085, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2038';
    ctx.beginPath(); ctx.arc(tipx + s * .016, tipy, s * .038, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(tipx + s * .004, tipy - s * .028, s * .016, 0, 7); ctx.fill();
    ctx.fillStyle = fg;
  }
  /* little smile */
  ctx.strokeStyle = 'rgba(120,90,130,.65)'; ctx.lineWidth = Math.max(1.1, s * .034);
  ctx.beginPath(); ctx.moveTo(s * .86, s * .3);
  ctx.quadraticCurveTo(s * .95, s * .38, s * 1.03, s * .28); ctx.stroke();
  ctx.fillStyle = 'rgba(255,150,190,.35)';
  ctx.beginPath(); ctx.ellipse(s * .74, s * .3, s * .07, s * .045, 0, 0, 7); ctx.fill();
}

/* =========================================================== parrotfish */
function drawParrot(c, t){
  const s = c.size, wag = Math.sin(t * c.tailSpeed + c.phase);
  const wag2 = Math.sin(t * c.tailSpeed + c.phase - .7);
  /* tail */
  ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.moveTo(-s * .74, 0);
  ctx.quadraticCurveTo(-s * 1.1, wag * s * .3 - s * .6, -s * 1.3, wag * s * .42 - s * .34);
  ctx.quadraticCurveTo(-s * 1.02, wag2 * s * .3, -s * 1.3, wag * s * .42 + s * .34);
  ctx.quadraticCurveTo(-s * 1.1, wag * s * .3 + s * .6, -s * .74, 0);
  ctx.fill();
  /* dorsal + anal */
  ctx.fillStyle = c.fin2 || c.fin;
  ctx.beginPath();
  ctx.moveTo(-s * .5, -s * .5);
  ctx.quadraticCurveTo(-s * .1, -s * 1.05 - wag2 * 3, s * .42, -s * .52);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * .34, s * .5);
  ctx.quadraticCurveTo(s * .0, s * .96 + wag2 * 3, s * .4, s * .5);
  ctx.closePath(); ctx.fill();

  /* chunky body, three bands of colour */
  const g = ctx.createLinearGradient(0, -s * .62, 0, s * .62);
  g.addColorStop(0, c.top || '#a06bff');
  g.addColorStop(.42, c.body);
  g.addColorStop(.68, c.belly || '#ffe066');
  g.addColorStop(1, c.belly2 || '#7ef0c8');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .92, s * .62, 0, 0, 7); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, s * .92, s * .62, 0, 0, 7); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = Math.max(.9, s * .022);
  for(let r = 0; r < 6; r++)
    for(let q = 0; q < 4; q++){
      ctx.beginPath();
      ctx.arc(-s * .6 + r * s * .26, -s * .34 + q * s * .24 + (r % 2) * s * .12, s * .15, -1.1, 1.1);
      ctx.stroke();
    }
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.ellipse(0, -s * .44, s * .5, s * .12, -.08, 0, 7); ctx.fill();
  ctx.restore();

  /* beak */
  ctx.fillStyle = c.beak || '#ffd6a0';
  ctx.beginPath();
  ctx.moveTo(s * .74, -s * .1);
  ctx.quadraticCurveTo(s * 1.02, -s * .02, s * .96, s * .16);
  ctx.quadraticCurveTo(s * .82, s * .22, s * .72, s * .14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,50,.5)'; ctx.lineWidth = Math.max(1, s * .028);
  ctx.beginPath(); ctx.moveTo(s * .74, s * .04);
  ctx.quadraticCurveTo(s * .88, s * .06, s * .96, s * .12); ctx.stroke();

  /* pectoral fin */
  ctx.globalAlpha = .8; ctx.fillStyle = c.fin;
  ctx.beginPath();
  ctx.ellipse(s * .16, s * .26, s * .27, s * .13, .55 + wag2 * .3, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  blush(s * .58, s * .02, s * .13);
  drawEye(s * .5, -s * .24, s * .155);
}

/* ============================================== crab with long eyestalks */
function drawCrabPro(c, t){
  const s = c.size, p = Math.sin(t * 6 + c.phase);
  ctx.strokeStyle = c.fin; ctx.lineWidth = s * .085; ctx.lineCap = 'round';
  for(let i = 0; i < 4; i++){
    for(const sgn of [-1, 1]){
      const bx = sgn * (s * .3 + i * s * .14), by = s * .08;
      const lift = Math.sin(t * 6 + i * 1.2 + (sgn > 0 ? 0 : 1.6)) * s * .13;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sgn * s * .34, by + s * .2 + lift, bx + sgn * s * .46, by + s * .56);
      ctx.stroke();
    }
  }
  /* claws */
  for(const sgn of [-1, 1]){
    const cx = sgn * s * .76, cy = -s * .2 + p * s * .06;
    ctx.strokeStyle = c.body; ctx.lineWidth = s * .085;
    ctx.beginPath(); ctx.moveTo(sgn * s * .4, s * .0); ctx.lineTo(cx - sgn * s * .08, cy + s * .08);
    ctx.stroke();
    ctx.fillStyle = c.body;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(sgn * .45);
    ctx.beginPath(); ctx.ellipse(0, 0, s * .24, s * .15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = lighten(c.body, 26);
    ctx.beginPath();
    ctx.moveTo(s * .06, -s * .05);
    ctx.quadraticCurveTo(s * .3, -s * .18, s * .26, -s * .02);
    ctx.quadraticCurveTo(s * .18, s * .0, s * .06, -s * .05);
    ctx.fill();
    ctx.restore();
  }
  /* shell */
  const g = ctx.createRadialGradient(0, -s * .22, s * .08, 0, 0, s * .72);
  g.addColorStop(0, lighten(c.body, 40)); g.addColorStop(.55, c.body);
  g.addColorStop(1, darken(c.body, 20));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .62, s * .44, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath(); ctx.ellipse(-s * .16, -s * .18, s * .24, s * .1, -.3, 0, 7); ctx.fill();
  /* long white eyestalks, like the book */
  for(const sgn of [-1, 1]){
    const tipx = sgn * s * .17, tipy = -s * .82 + p * s * .03;
    ctx.strokeStyle = '#fdfdff'; ctx.lineWidth = s * .105;
    ctx.beginPath(); ctx.moveTo(sgn * s * .14, -s * .3); ctx.lineTo(tipx, tipy); ctx.stroke();
    ctx.fillStyle = '#fdfdff';
    ctx.beginPath(); ctx.ellipse(tipx, tipy, s * .075, s * .095, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#241c30';
    ctx.beginPath(); ctx.arc(tipx + sgn * s * .012, tipy - s * .01, s * .036, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(90,30,20,.6)'; ctx.lineWidth = Math.max(1.2, s * .045);
  ctx.beginPath(); ctx.moveTo(-s * .13, s * .1);
  ctx.quadraticCurveTo(0, s * .22, s * .13, s * .1); ctx.stroke();
}







/* ================================ Elli riding Stormi (the last page) */
function seatedMer(s, t, r){
  const sway = Math.sin(t * 2.2 + (r.phase || 0));
  /* her tail, curled down behind the seahorse's neck */
  const tg = ctx.createLinearGradient(0, 0, -s * .3, s * 1.5);
  tg.addColorStop(0, r.tailDark); tg.addColorStop(.5, r.tail);
  tg.addColorStop(1, lighten(r.tail, 40));
  ctx.strokeStyle = tg; ctx.lineCap = 'round';
  ctx.lineWidth = s * .42;
  ctx.beginPath();
  ctx.moveTo(-s * .05, s * .22);
  ctx.quadraticCurveTo(s * .3, s * .74, s * .04 + sway * s * .05, s * 1.16);
  ctx.stroke();
  ctx.lineWidth = s * .2;
  ctx.beginPath();
  ctx.moveTo(s * .04 + sway * s * .05, s * 1.12);
  ctx.quadraticCurveTo(-s * .18, s * 1.36, -s * .3 + sway * s * .07, s * 1.5);
  ctx.stroke();
  /* fluke */
  ctx.fillStyle = lighten(r.tail, 26);
  const fx = -s * .3 + sway * s * .07, fy = s * 1.5;
  ctx.beginPath();
  ctx.moveTo(fx + s * .1, fy - s * .1);
  ctx.quadraticCurveTo(fx - s * .34, fy - s * .16, fx - s * .5, fy + s * .18);
  ctx.quadraticCurveTo(fx - s * .18, fy + s * .06, fx - s * .06, fy + s * .3);
  ctx.quadraticCurveTo(fx + s * .06, fy + s * .06, fx + s * .1, fy - s * .1);
  ctx.fill();
  /* scale hints */
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1, s * .04);
  for(let i = 0; i < 3; i++){
    ctx.beginPath();
    ctx.arc(s * (.02 + i * .04), s * (.5 + i * .24), s * .16, -.9, 1.0); ctx.stroke();
  }

  /* torso, leaning forward */
  ctx.fillStyle = r.skin;
  ctx.beginPath();
  ctx.moveTo(s * .34, -s * .5);
  ctx.quadraticCurveTo(s * .46, -s * .1, s * .12, s * .26);
  ctx.quadraticCurveTo(-s * .12, s * .2, -s * .04, -s * .3);
  ctx.quadraticCurveTo(s * .12, -s * .58, s * .34, -s * .5);
  ctx.fill();
  /* flowered top */
  ctx.fillStyle = r.top;
  ctx.beginPath();
  ctx.moveTo(-s * .04, -s * .34);
  ctx.quadraticCurveTo(s * .2, -s * .54, s * .38, -s * .36);
  ctx.quadraticCurveTo(s * .3, -s * .04, s * .06, s * .04);
  ctx.quadraticCurveTo(-s * .1, -s * .08, -s * .04, -s * .34);
  ctx.fill();
  ctx.fillStyle = r.topAlt;
  for(let i = 0; i < 4; i++){
    const px = s * (.02 + (i % 2) * .16), py = -s * (.3 - Math.floor(i / 2) * .16);
    for(let p = 0; p < 5; p++){
      const a = p / 5 * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(px + Math.cos(a) * s * .028, py + Math.sin(a) * s * .028, s * .021, 0, 7);
      ctx.fill();
    }
  }

  /* hair: big dark curls with magenta streaks */
  ctx.fillStyle = r.hair;
  ctx.beginPath();
  ctx.moveTo(s * .36, -s * .82);
  ctx.quadraticCurveTo(-s * .1, -s * 1.12, -s * .4, -s * .58 + sway * s * .05);
  ctx.quadraticCurveTo(-s * .56, -s * .2 + sway * s * .08, -s * .2, -s * .18);
  ctx.quadraticCurveTo(s * .06, -s * .36, s * .22, -s * .34);
  ctx.quadraticCurveTo(s * .42, -s * .46, s * .36, -s * .82);
  ctx.fill();
  for(let i = 0; i < 8; i++){
    const a = i / 7;
    const cx2 = s * (.3 - a * .82), cy2 = -s * (.62 + Math.sin(a * 3.4) * .26) + sway * s * .05 * a;
    ctx.fillStyle = i % 3 === 0 ? r.streak : (i % 2 ? r.hair : r.hairHi);
    ctx.beginPath(); ctx.arc(cx2, cy2, s * (.19 - a * .05), 0, 7); ctx.fill();
  }

  /* head */
  ctx.fillStyle = r.skin;
  ctx.beginPath(); ctx.ellipse(s * .42, -s * .64, s * .27, s * .29, .08, 0, 7); ctx.fill();
  ctx.fillStyle = r.hair;
  ctx.beginPath();
  ctx.moveTo(s * .18, -s * .72);
  ctx.quadraticCurveTo(s * .36, -s * 1.02, s * .66, -s * .7);
  ctx.quadraticCurveTo(s * .46, -s * .82, s * .3, -s * .76);
  ctx.fill();
  ctx.beginPath(); ctx.arc(s * .2, -s * .74, s * .11, 0, 7); ctx.fill();
  /* starfish clip */
  ctx.fillStyle = r.accColor || '#ef6a3d';
  ctx.save(); ctx.translate(s * .16, -s * .58); ctx.rotate(.3);
  ctx.beginPath();
  for(let i = 0; i < 10; i++){
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? s * .04 : s * .11);
    i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
  /* face */
  drawEye(s * .54, -s * .64, s * .1);
  ctx.strokeStyle = 'rgba(45,28,28,.8)'; ctx.lineWidth = Math.max(1, s * .022);
  ctx.lineCap = 'round';
  for(let i = 0; i < 3; i++){
    const a = -1.35 + i * .36;
    ctx.beginPath();
    ctx.moveTo(s * .54 + Math.cos(a) * s * .1, -s * .64 + Math.sin(a) * s * .1);
    ctx.lineTo(s * .54 + Math.cos(a) * s * .16, -s * .64 + Math.sin(a) * s * .16);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,140,150,.35)';
  ctx.beginPath(); ctx.ellipse(s * .46, -s * .5, s * .07, s * .05, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(70,35,30,.8)'; ctx.lineWidth = Math.max(1.2, s * .03);
  ctx.beginPath(); ctx.moveTo(s * .54, -s * .48);
  ctx.quadraticCurveTo(s * .6, -s * .41, s * .66, -s * .48); ctx.stroke();

  /* both arms reaching forward to hold the reins */
  ctx.strokeStyle = r.skin; ctx.lineWidth = s * .11; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * .26, -s * .26);
  ctx.quadraticCurveTo(s * .56, -s * .16, s * .76, -s * .3 + sway * s * .02);
  ctx.stroke();
  ctx.fillStyle = r.skin;
  ctx.beginPath(); ctx.arc(s * .78, -s * .3 + sway * s * .02, s * .085, 0, 7); ctx.fill();
  ctx.strokeStyle = r.skinDark; ctx.lineWidth = s * .1;
  ctx.beginPath();
  ctx.moveTo(s * .2, -s * .2);
  ctx.quadraticCurveTo(s * .5, -s * .06, s * .7, -s * .18 + sway * s * .02);
  ctx.stroke();
  ctx.fillStyle = r.skinDark;
  ctx.beginPath(); ctx.arc(s * .72, -s * .18 + sway * s * .02, s * .08, 0, 7); ctx.fill();
}

function drawRider(c, t){
  const s = c.size;
  drawSeahorse(c, t);

  /* bridle and reins, the way Stormi wears them in the book */
  const R = c.rein || '#e05a3a';
  ctx.strokeStyle = R; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.6, s * .045);
  /* noseband, well clear of the eye */
  ctx.beginPath();
  ctx.ellipse(s * .5, -s * .715, s * .075, s * .055, -.12, 0, 7); ctx.stroke();
  /* cheek strap up over the head */
  ctx.beginPath();
  ctx.moveTo(s * .47, -s * .765);
  ctx.quadraticCurveTo(s * .3, -s * .92, s * .1, -s * .88); ctx.stroke();
  /* rein back to her hands */
  ctx.beginPath();
  ctx.moveTo(s * .5, -s * .68);
  ctx.quadraticCurveTo(s * .22, -s * .56, s * .02, -s * .45); ctx.stroke();

  /* the rider */
  ctx.save();
  ctx.translate(-s * .16, -s * .30);
  ctx.rotate(-.12);
  seatedMer(s * .52, t, c.rider);
  ctx.restore();
}



/* --------------------------------------------------- the creature registry */
export type DrawFn = (c: any, t: number) => void;

export const DRAW: Record<string, DrawFn> = {
  fish: drawFishPro,
  minnow: drawMinnowPro,
  crab: drawCrabPro,
  merperson: drawMerperson,
  mermaid: drawMerperson,
  rider: drawRider,
  eel: drawEel,
  snail: drawSnail,
  parrot: drawParrot,
  unicornLand: drawUnicornLand,
  seaUnicorn: drawSeaUnicorn,
  unicorn: drawUnicorn,
  seahorse: drawSeahorse,
  shark: drawShark,
  turtle: drawTurtle,
  octopus: drawOctopus,
  jelly: drawJelly,
  star: drawStar
};

/** Paint one creature. Unknown kinds fall back to a plain fish. */
export function drawCreature(kind: string, c: any, t: number) {
  facePhase = c.phase ?? 0;
  faceTime = t;
  (DRAW[kind] || drawFishPro)(c, t);
}

export const reef = {
  water: drawWater,
  sand: drawSand,
  shells: drawShells,
  kelp: drawKelp,
  fans: drawFans,
  sponges: drawSponges,
  anemones: drawAnemones,
  seaweed: drawSeaweed,
  coral: drawCoral,
  ridge: drawRidgeLayer,
  vista: drawVista,
  caustics: drawCaustics,
  motes: drawMotes,
  seeps: drawSeeps,
  farFish: drawFarFish,
  wreck: drawWreck,
  chest: drawChest,
  chestBeacon: drawChestBeacon,
  key: drawKey,
  food: drawFood,
  cursor: drawCursor,
  letter: drawLetter,
  pearl: drawPearl,
  loot: drawLoot
};
