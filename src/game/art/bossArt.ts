import { Container, Graphics } from 'pixi.js';
import { softGlow } from './forge';

// ---- types ---------------------------------------------------------------

interface Pal {
  d: number;  // dark — shadow / outline
  m: number;  // mid — main hull
  l: number;  // light — highlight
  a: number;  // accent — emissive / weapon glow
}

// ---- shape helpers -------------------------------------------------------

function mirrorPoly(half: number[]): number[] {
  const out = [...half];
  for (let i = half.length - 2; i >= 0; i -= 2) {
    out.push(-half[i], half[i + 1]);
  }
  return out;
}

function shiftPoly(pts: number[], dx: number, dy: number): number[] {
  return pts.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
}

function scalePoly(pts: number[], cx: number, cy: number, k: number): number[] {
  return pts.map((v, i) => (i % 2 === 0 ? cx + (v - cx) * k : cy + (v - cy) * k));
}

// Curved ellipsoidal "bulb" — pretends to be a smooth 3D surface.
function bulb(
  g: Graphics, x: number, y: number, rx: number, ry: number, p: Pal,
  opts: { core?: boolean; specular?: boolean; tilt?: number } = {},
): void {
  // Drop shadow under the bulb
  g.ellipse(x + 2, y + 3, rx, ry).fill({ color: 0x000000, alpha: 0.32 });
  // Base
  g.ellipse(x, y, rx, ry).fill(p.m);
  g.ellipse(x, y, rx, ry).stroke({ color: p.d, width: 1.4 });
  // Lit hemisphere (off-centre lighter ellipse)
  const tilt = opts.tilt ?? 0.32;
  g.ellipse(x - rx * tilt, y - ry * tilt, rx * (1 - tilt * 0.7), ry * (1 - tilt * 0.7)).fill({ color: p.l, alpha: 0.85 });
  // Specular hotspot
  if (opts.specular !== false) {
    g.ellipse(x - rx * 0.45, y - ry * 0.45, rx * 0.2, ry * 0.13).fill({ color: 0xffffff, alpha: 0.85 });
  }
  // Optional accent core
  if (opts.core) {
    g.ellipse(x, y, rx * 0.32, ry * 0.32).fill(p.a);
    g.ellipse(x, y, rx * 0.18, ry * 0.18).fill(0xffffff);
  }
}

// Plate (any polygon) with drop-shadow + base + inset highlight + outline.
function plate(g: Graphics, pts: number[], p: Pal, opts: { hi?: number; outline?: number } = {}): void {
  const sh = shiftPoly(pts, 2, 3);
  g.poly(sh).fill({ color: 0x000000, alpha: 0.32 });
  g.poly(pts).fill(p.m);
  g.poly(pts).stroke({ color: p.d, width: opts.outline ?? 1.5 });
  // Inset highlight
  if (opts.hi !== 0) {
    const cx = pts.reduce((s, v, i) => (i % 2 === 0 ? s + v : s), 0) / (pts.length / 2);
    const cy = pts.reduce((s, v, i) => (i % 2 === 1 ? s + v : s), 0) / (pts.length / 2);
    const inset = scalePoly(pts, cx, cy, opts.hi ?? 0.72);
    g.poly(inset).fill({ color: p.l, alpha: 0.55 });
  }
}

// Red "eye-cannon" port (Image 3 wing-arms motif).
function eyeCannon(g: Graphics, x: number, y: number, r: number, color = 0xff4d3d): void {
  // Outer metallic socket
  g.circle(x + 1, y + 2, r + 3).fill({ color: 0x000000, alpha: 0.4 });
  g.circle(x, y, r + 3).fill(0x2a2630);
  g.circle(x, y, r + 3).stroke({ color: 0x66666e, width: 1.2 });
  // Inner ring
  g.circle(x, y, r + 1).fill(0x4a464e);
  g.circle(x, y, r + 1).stroke({ color: 0x2a2630, width: 1 });
  // Iris glow
  g.circle(x, y, r).fill({ color, alpha: 0.95 });
  g.circle(x, y, r).stroke({ color: 0xff9866, width: 1, alpha: 0.85 });
  // Bright pupil
  g.circle(x, y, r * 0.5).fill(0xffd166);
  g.circle(x, y, r * 0.28).fill(0xffffff);
  // Side gleam
  g.circle(x - r * 0.4, y - r * 0.4, r * 0.15).fill({ color: 0xffffff, alpha: 0.6 });
}

// Vertebra-like dome (insect spine segment).
function vertebra(g: Graphics, x: number, y: number, w: number, p: Pal): void {
  g.ellipse(x, y, w, w * 0.6).fill(p.d);
  g.ellipse(x, y, w * 0.95, w * 0.55).fill(p.m);
  g.ellipse(x - w * 0.22, y - w * 0.1, w * 0.65, w * 0.4).fill(p.l);
  g.ellipse(x, y, w * 0.35, w * 0.2).fill(p.a);
  g.ellipse(x, y, w * 0.2, w * 0.12).fill(0xffffff);
}

// Articulated leg: draws polyline with tapering width + joint domes + claw tip.
function spiderLeg(g: Graphics, points: Array<[number, number]>, p: Pal, baseW = 5): void {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const w = baseW * Math.max(0.4, 1 - i * 0.18);
    g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: p.d, width: w + 2 });
    g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: p.m, width: w });
    g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: p.l, width: Math.max(1, w * 0.4) });
  }
  for (let i = 0; i < points.length; i++) {
    const [jx, jy] = points[i];
    const r = (baseW + 1.4) * Math.max(0.5, 1 - i * 0.12);
    g.circle(jx, jy, r).fill(p.d);
    g.circle(jx, jy, r * 0.85).fill(p.m);
    g.circle(jx, jy, r * 0.55).fill(p.l);
  }
  // Claw tip
  const [tx, ty] = points[points.length - 1];
  const [px, py] = points[points.length - 2];
  const dx = tx - px, dy = ty - py;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len, ny = dy / len;
  const tipX = tx + nx * 6;
  const tipY = ty + ny * 6;
  g.poly([tx + ny * 2.5, ty - nx * 2.5, tipX, tipY, tx - ny * 2.5, ty + nx * 2.5]).fill(p.a);
  g.poly([tx + ny * 2.5, ty - nx * 2.5, tipX, tipY, tx - ny * 2.5, ty + nx * 2.5]).stroke({ color: p.d, width: 0.8 });
}

// Curved fin / wing.
function wingFin(g: Graphics, points: number[], p: Pal, alpha = 0.9): void {
  // Shadow
  g.poly(shiftPoly(points, 2, 2)).fill({ color: 0x000000, alpha: 0.3 });
  g.poly(points).fill({ color: p.m, alpha });
  g.poly(points).stroke({ color: p.d, width: 1.2 });
  // Inset highlight along leading edge
  const cx = points[0], cy = points[1];
  const inner: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    inner.push(cx + (points[i] - cx) * 0.55, cy + (points[i + 1] - cy) * 0.55);
  }
  g.poly(inner).fill({ color: p.l, alpha: 0.6 });
  // Veins
  for (let i = 4; i < points.length - 2; i += 2) {
    g.moveTo(cx, cy).lineTo(cx + (points[i] - cx) * 0.85, cy + (points[i + 1] - cy) * 0.85).stroke({ color: p.d, width: 0.6, alpha: 0.65 });
  }
}

// Cylindrical cannon barrel with cooling rings.
function cannon(g: Graphics, x: number, y: number, length: number, width: number, p: Pal): void {
  g.rect(x - width / 2 - 1, y - length, width + 2, length + 1).fill(p.d);
  g.rect(x - width / 2, y - length, width, length).fill(p.m);
  g.rect(x - width / 2 + 1, y - length, width * 0.35, length).fill(p.l);
  for (let i = 1; i <= 3; i++) {
    g.rect(x - width / 2 - 2, y - (length * i) / 4, width + 4, 1.6).fill(p.d);
  }
  g.rect(x - width / 2 - 2, y - length - 3, width + 4, 4).fill(p.d);
  g.rect(x - width / 2 - 1, y - length - 2, width + 2, 2).fill(p.l);
  g.circle(x, y - length - 1, width * 0.32).fill(p.a);
  g.circle(x, y - length - 1, width * 0.18).fill(0xffffff);
}

// Engine bell + plume.
function engineBell(g: Graphics, x: number, y: number, w: number, h: number, color: number, dark = 0x1a1018): void {
  g.rect(x - w / 2 - 1, y - 1, w + 2, h + 2).fill(dark);
  g.rect(x - w / 2, y, w, h).fill(color);
  g.rect(x - w / 2 + 1, y, w - 2, h * 0.55).fill(0xffffff);
  // Rim
  g.rect(x - w / 2 - 1, y - 2, w + 2, 2).fill(dark);
  // Plume tongue
  g.poly([x - w / 2 + 1, y + h, x, y + h + w * 0.7, x + w / 2 - 1, y + h]).fill({ color, alpha: 0.85 });
}

function antennaArr(g: Graphics, x: number, y: number, length: number, accent: number): void {
  g.moveTo(x, y).lineTo(x, y - length).stroke({ color: 0x3a3a44, width: 1.6 });
  g.circle(x, y - length, 2.4).fill(accent);
  g.circle(x, y - length, 1).fill(0xffffff);
}

function rivets(g: Graphics, x1: number, y1: number, x2: number, y2: number, count: number, color = 0x14191e): void {
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    g.circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.9).fill(color);
  }
}

function scorch(g: Graphics, x: number, y: number, r: number): void {
  g.circle(x, y, r * 1.3).fill({ color: 0x000000, alpha: 0.55 });
  g.circle(x, y, r).fill({ color: 0x1a0a05, alpha: 0.85 });
  g.circle(x, y, r * 0.5).fill({ color: 0xff5022, alpha: 0.7 });
  g.circle(x, y, r * 0.25).fill(0xffd166);
}

function gemCrystal(g: Graphics, x: number, y: number, r: number, color: number, edge = 0xffffff): void {
  g.poly([x, y - r, x + r * 0.85, y, x, y + r, x - r * 0.85, y]).fill({ color, alpha: 0.9 });
  g.poly([x, y - r, x + r * 0.85, y, x, y + r, x - r * 0.85, y]).stroke({ color: edge, width: 1.4, alpha: 0.95 });
  g.moveTo(x, y - r).lineTo(x, y + r).stroke({ color: edge, width: 0.7, alpha: 0.7 });
  g.moveTo(x - r * 0.85, y).lineTo(x + r * 0.85, y).stroke({ color: edge, width: 0.7, alpha: 0.5 });
  g.poly([x, y - r * 0.55, x - r * 0.4, y, x, y + r * 0.55, x + r * 0.4, y]).fill({ color: 0xffffff, alpha: 0.45 });
}

function runeGlyph(g: Graphics, x: number, y: number, r: number, color = 0xfff066): void {
  g.poly([x, y - r, x + r * 0.7, y, x, y + r, x - r * 0.7, y]).stroke({ color, width: 1.4, alpha: 0.95 });
  g.moveTo(x - r * 0.4, y).lineTo(x + r * 0.4, y).stroke({ color, width: 0.9, alpha: 0.9 });
  g.moveTo(x, y - r * 0.4).lineTo(x, y + r * 0.4).stroke({ color, width: 0.9, alpha: 0.9 });
}

function lightDot(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.circle(x, y, r + 1).fill({ color, alpha: 0.5 });
  g.circle(x, y, r).fill(color);
  g.circle(x, y, r * 0.5).fill(0xffffff);
}

// =========================================================================
// BOSS 1 — Patrol Cruiser. Imperial Star Destroyer wedge silhouette.
// =========================================================================
export function drawBoss01PatrolCruiser(root: Container, S = 1): void {
  const p: Pal = { d: 0x12161e, m: 0x36404c, l: 0x7c8898, a: 0xff5544 };
  const eng = 0x66c4ff;
  // 3 large engines aft, classic blue exhaust
  softGlow(root, -32 * S, 56 * S, 18 * S, eng, 9);
  softGlow(root, 0, 60 * S, 24 * S, eng, 11);
  softGlow(root, 32 * S, 56 * S, 18 * S, eng, 9);
  // Bridge tower glow
  softGlow(root, 0, -38 * S, 12 * S, 0xfff0a0, 7);

  const g = new Graphics();
  // Triangular wedge — narrow bow widening to a flat stern. Pulled from
  // Imperial-class proportions: long axis vertical, ~3:1 length-to-width.
  const hull = mirrorPoly([
    0, -78 * S, 6 * S, -68 * S, 12 * S, -48 * S, 22 * S, -20 * S,
    34 * S, 14 * S, 44 * S, 40 * S, 48 * S, 56 * S, 26 * S, 60 * S,
  ]);
  plate(g, hull, p);
  // Layered upper hull (stepped command deck terrace)
  plate(g, mirrorPoly([
    0, -68 * S, 5 * S, -58 * S, 10 * S, -40 * S, 18 * S, -16 * S,
    28 * S, 10 * S, 36 * S, 34 * S, 40 * S, 48 * S, 22 * S, 50 * S,
  ]), { d: p.d, m: 0x42505e, l: 0x8a98a8, a: p.a }, { hi: 0.85 });
  // Mid trench — long groove down the spine where dorsal modules sit
  g.rect(-3 * S, -60 * S, 6 * S, 100 * S).fill({ color: 0x10141a, alpha: 0.9 });
  g.rect(-3 * S, -60 * S, 6 * S, 100 * S).stroke({ color: p.l, width: 0.8, alpha: 0.5 });
  // Cross-deck rivet bands at major hull segment seams
  rivets(g, -16 * S, -30 * S, 16 * S, -30 * S, 7);
  rivets(g, -28 * S, -2 * S, 28 * S, -2 * S, 11);
  rivets(g, -42 * S, 28 * S, 42 * S, 28 * S, 13);
  rivets(g, -46 * S, 50 * S, 46 * S, 50 * S, 13);
  // Surface panel detail — diamond plating sections along the hull
  for (let i = 0; i < 4; i++) {
    const yy = -40 * S + i * 18 * S;
    g.rect(-22 * S, yy, 16 * S, 4 * S).stroke({ color: p.d, width: 0.7, alpha: 0.7 });
    g.rect(6 * S, yy, 16 * S, 4 * S).stroke({ color: p.d, width: 0.7, alpha: 0.7 });
  }
  root.addChild(g);

  // Command bridge tower — the iconic Star-Destroyer rear superstructure.
  // Two-tier: lower trapezoid + upper bridge box + two shield-gen domes.
  const cp = new Graphics();
  // Tower lower tier
  plate(cp, [-14 * S, -16 * S, -10 * S, -30 * S, 10 * S, -30 * S, 14 * S, -16 * S], { d: p.d, m: 0x46525e, l: 0x9aa6b4, a: p.a }, { hi: 0.85 });
  // Tower middle tier
  plate(cp, [-11 * S, -30 * S, -8 * S, -42 * S, 8 * S, -42 * S, 11 * S, -30 * S], { d: p.d, m: 0x525e6a, l: 0xacb8c4, a: p.a }, { hi: 0.85 });
  // Bridge window strip — bright row of windows facing forward
  cp.rect(-7 * S, -41 * S, 14 * S, 2.5 * S).fill(0xfff0a0);
  cp.rect(-7 * S, -41 * S, 14 * S, 2.5 * S).stroke({ color: 0xffffff, width: 0.6, alpha: 0.95 });
  for (let i = -3; i <= 3; i++) cp.rect(i * 1.6 * S - 0.3, -41 * S, 0.5 * S, 2.5 * S).fill(p.d);
  // Twin shield-generator domes flanking the bridge
  bulb(cp, -16 * S, -34 * S, 5 * S, 4 * S, { d: p.d, m: 0x5a6878, l: 0xb6c2d0, a: p.a }, { specular: true });
  bulb(cp, 16 * S, -34 * S, 5 * S, 4 * S, { d: p.d, m: 0x5a6878, l: 0xb6c2d0, a: p.a }, { specular: true });
  // Tall command antenna mast
  antennaArr(cp, 0, -42 * S, 18 * S, 0xfff066);
  // Side comm whiskers
  antennaArr(cp, -12 * S, -30 * S, 10 * S, p.a);
  antennaArr(cp, 12 * S, -30 * S, 10 * S, p.a);
  root.addChild(cp);

  // Heavy bow lance + twin chin cannons (forward armament)
  const cn = new Graphics();
  cannon(cn, 0, -64 * S, 18 * S, 6 * S, { d: 0x10080a, m: 0x3a2025, l: 0x7a3a40, a: p.a });
  cannon(cn, -10 * S, -54 * S, 14 * S, 4 * S, { d: 0x10080a, m: 0x3a2025, l: 0x6a3a40, a: p.a });
  cannon(cn, 10 * S, -54 * S, 14 * S, 4 * S, { d: 0x10080a, m: 0x3a2025, l: 0x6a3a40, a: p.a });
  // Dorsal turret battery — 4 ball-mount eye cannons along the spine
  eyeCannon(cn, -22 * S, 8 * S, 3.5 * S, p.a);
  eyeCannon(cn, 22 * S, 8 * S, 3.5 * S, p.a);
  eyeCannon(cn, -28 * S, 30 * S, 3.5 * S, p.a);
  eyeCannon(cn, 28 * S, 30 * S, 3.5 * S, p.a);
  root.addChild(cn);

  // Engine cluster — 3 large vertical exhaust ports, Imperial style.
  const en = new Graphics();
  engineBell(en, -32 * S, 48 * S, 16 * S, 16 * S, eng, p.d);
  engineBell(en, 0, 50 * S, 18 * S, 16 * S, eng, p.d);
  engineBell(en, 32 * S, 48 * S, 16 * S, 16 * S, eng, p.d);
  root.addChild(en);

  // Hull stencils + nav lights — Imperial squadron livery.
  const dec = new Graphics();
  // Red command stripes either side of the spine
  dec.rect(-30 * S, -10 * S, 4 * S, 50 * S).fill({ color: p.a, alpha: 0.55 });
  dec.rect(26 * S, -10 * S, 4 * S, 50 * S).fill({ color: p.a, alpha: 0.55 });
  // "01" stencil on starboard panel
  dec.rect(10 * S, 18 * S, 5 * S, 1.4 * S).fill({ color: 0xc4c4cc, alpha: 0.8 });
  dec.rect(10 * S, 22 * S, 5 * S, 1.4 * S).fill({ color: 0xc4c4cc, alpha: 0.8 });
  dec.rect(10 * S, 18 * S, 1.4 * S, 5 * S).fill({ color: 0xc4c4cc, alpha: 0.8 });
  dec.rect(13.6 * S, 18 * S, 1.4 * S, 5 * S).fill({ color: 0xc4c4cc, alpha: 0.8 });
  root.addChild(dec);

  const lt = new Graphics();
  lightDot(lt, -48 * S, 54 * S, 1.6, 0xff4040);
  lightDot(lt, 48 * S, 54 * S, 1.6, 0x40ff40);
  lightDot(lt, -16 * S, -34 * S, 1.2, 0x66c4ff);
  lightDot(lt, 16 * S, -34 * S, 1.2, 0x66c4ff);
  root.addChild(lt);
}

// =========================================================================
// BOSS 2 — Asteroid Hauler. Industrial hauler with mining clamps.
// =========================================================================
export function drawBoss02AsteroidHauler(root: Container, S = 1): void {
  const p: Pal = { d: 0x18130a, m: 0x4a3a1a, l: 0x96773a, a: 0xffaa3d };
  const eng = 0xffaa44;
  softGlow(root, -32 * S, 56 * S, 16 * S, eng, 8);
  softGlow(root, 0, 60 * S, 20 * S, eng, 10);
  softGlow(root, 32 * S, 56 * S, 16 * S, eng, 8);

  // Heavy tow cables stretching from the corpus to the asteroid — drawn
  // first so they sit behind the hull / claws. Mass-Effect mining-barge feel.
  const cab = new Graphics();
  for (const off of [-14, -6, 6, 14]) {
    cab.moveTo(off * S, -54 * S).lineTo(off * S * 0.6, -82 * S).stroke({ color: 0x10080a, width: 2.4 });
    cab.moveTo(off * S, -54 * S).lineTo(off * S * 0.6, -82 * S).stroke({ color: 0x6a6a78, width: 1.2 });
  }
  root.addChild(cab);

  // Towed asteroid — chunkier silhouette with embedded ore veins.
  const ast = new Graphics();
  ast.circle(0, -80 * S, 22 * S).fill(0x2a1d10);
  // Surface boulders
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = (15 + (i % 3) * 3) * S;
    ast.circle(Math.cos(a) * r, -80 * S + Math.sin(a) * r, 5 * S).fill(0x4a3a20);
  }
  ast.circle(-7 * S, -88 * S, 7 * S).fill(0x6a4f2a);
  ast.circle(8 * S, -74 * S, 4 * S).fill(0x6a4f2a);
  // Bright eezo / ore veins
  ast.moveTo(-15 * S, -86 * S).lineTo(12 * S, -76 * S).stroke({ color: 0xffaa44, width: 1.6, alpha: 0.85 });
  ast.moveTo(-8 * S, -92 * S).lineTo(14 * S, -74 * S).stroke({ color: 0xffaa44, width: 1.1, alpha: 0.65 });
  ast.moveTo(-2 * S, -94 * S).lineTo(6 * S, -68 * S).stroke({ color: 0xffd166, width: 0.9, alpha: 0.55 });
  ast.circle(-4 * S, -80 * S, 1.6).fill(0xfff066);
  ast.circle(8 * S, -78 * S, 1.4).fill(0xfff066);
  ast.circle(-12 * S, -76 * S, 1).fill(0xff8844);
  root.addChild(ast);

  // Heavy industrial clamp arms grasping the asteroid (with hydraulic joints).
  const cl = new Graphics();
  for (const sign of [-1, 1]) {
    // Outer arm shadow
    cl.poly([sign * 16 * S, -54 * S, sign * 42 * S, -76 * S, sign * 34 * S, -82 * S, sign * 10 * S, -58 * S]).fill(p.d);
    // Arm mid-tone
    cl.poly([sign * 18 * S, -52 * S, sign * 40 * S, -74 * S, sign * 32 * S, -80 * S, sign * 12 * S, -56 * S]).fill(p.m);
    // Arm highlight
    cl.poly([sign * 20 * S, -52 * S, sign * 36 * S, -72 * S, sign * 30 * S, -78 * S]).fill(p.l);
    // Hydraulic joint (mid-arm)
    cl.circle(sign * 26 * S, -64 * S, 3.5 * S).fill(p.d);
    cl.circle(sign * 26 * S, -64 * S, 2.6 * S).fill(p.l);
    cl.circle(sign * 26 * S, -64 * S, 1.2 * S).fill(p.a);
    // Pincer tip — bright orange clamp
    cl.poly([sign * 38 * S, -78 * S, sign * 44 * S, -76 * S, sign * 38 * S, -72 * S]).fill(p.a);
    cl.poly([sign * 34 * S, -82 * S, sign * 42 * S, -82 * S, sign * 38 * S, -78 * S]).fill(p.a);
    cl.circle(sign * 38 * S, -78 * S, 1.4 * S).fill(0xffffff);
  }
  root.addChild(cl);

  const g = new Graphics();
  // Brick hull
  const hull = mirrorPoly([0, -54 * S, 26 * S, -48 * S, 58 * S, -32 * S, 66 * S, -8 * S, 64 * S, 20 * S, 52 * S, 44 * S, 32 * S, 52 * S]);
  plate(g, hull, p);
  rivets(g, -34 * S, -42 * S, 34 * S, -42 * S, 9);
  rivets(g, -50 * S, -16 * S, 50 * S, -16 * S, 11);
  rivets(g, -54 * S, 14 * S, 54 * S, 14 * S, 11);
  root.addChild(g);

  // Cargo containers (top of hull)
  const cargo = new Graphics();
  for (const sign of [-1, 1]) {
    plate(cargo, [sign * 22 * S, -32 * S, sign * 46 * S, -32 * S, sign * 46 * S, -8 * S, sign * 22 * S, -8 * S], { d: p.d, m: 0x3a2a14, l: 0x6a5028, a: p.a });
    // Cargo door horizontal stripes
    for (let i = 0; i < 4; i++) {
      cargo.rect(sign * 24 * S, -30 * S + i * 6 * S, 20 * S, 2).fill({ color: 0xfff066, alpha: 0.6 });
    }
    // Lit windows
    for (let i = 0; i < 3; i++) {
      cargo.rect(sign * 26 * S + i * 6 * S, -28 * S, 3 * S, 3 * S).fill(0xffe48a);
    }
  }
  // Central command module
  plate(cargo, [-14 * S, -38 * S, 14 * S, -38 * S, 12 * S, -20 * S, -12 * S, -20 * S], { d: p.d, m: 0x3a2a14, l: 0x6a5028, a: p.a });
  cargo.ellipse(0, -30 * S, 7 * S, 4 * S).fill(p.a);
  cargo.ellipse(0, -31 * S, 4 * S, 2 * S).fill(0xffffff);
  root.addChild(cargo);

  // Forward turrets (3)
  const cn = new Graphics();
  eyeCannon(cn, -22 * S, -4 * S, 5 * S, p.a);
  eyeCannon(cn, 0, -10 * S, 5.5 * S, p.a);
  eyeCannon(cn, 22 * S, -4 * S, 5 * S, p.a);
  // Side small launchers
  cannon(cn, -44 * S, -32 * S, 12 * S, 4 * S, { d: p.d, m: 0x3a2814, l: 0x5a4222, a: p.a });
  cannon(cn, 44 * S, -32 * S, 12 * S, 4 * S, { d: p.d, m: 0x3a2814, l: 0x5a4222, a: p.a });
  root.addChild(cn);

  // Antennae + warning lights
  const ant = new Graphics();
  antennaArr(ant, -28 * S, -48 * S, 16 * S, p.a);
  antennaArr(ant, 28 * S, -48 * S, 16 * S, p.a);
  lightDot(ant, -58 * S, 28 * S, 1.6, 0xff4040);
  lightDot(ant, 58 * S, 28 * S, 1.6, 0xfff066);
  lightDot(ant, -58 * S, 4 * S, 1.4, 0xfff066);
  lightDot(ant, 58 * S, 4 * S, 1.4, 0xfff066);
  root.addChild(ant);

  // Engines (3)
  const en = new Graphics();
  engineBell(en, -32 * S, 46 * S, 14 * S, 14 * S, eng, p.d);
  engineBell(en, 0, 48 * S, 16 * S, 14 * S, eng, p.d);
  engineBell(en, 32 * S, 46 * S, 14 * S, 14 * S, eng, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 3 — Cyber Crab. Organic-armored crab with forward claws.
// =========================================================================
export function drawBoss03CyberCrab(root: Container, S = 1): void {
  const p: Pal = { d: 0x180a08, m: 0x5a1f1c, l: 0xa64944, a: 0xffaa55 };
  const teal: Pal = { d: 0x0a1820, m: 0x1c4a5a, l: 0x4ea8c4, a: 0xa3e8ff };

  softGlow(root, 0, 44 * S, 20 * S, 0xffaa55, 8);

  // Underbelly (small spider legs)
  const legs = new Graphics();
  for (const sign of [-1, 1]) {
    spiderLeg(legs, [
      [sign * 22 * S, 14 * S],
      [sign * 32 * S, 28 * S],
      [sign * 38 * S, 40 * S],
      [sign * 32 * S, 52 * S],
    ], { d: 0x0a1018, m: 0x2a3038, l: 0x5a6068, a: p.a }, 3);
    spiderLeg(legs, [
      [sign * 16 * S, 18 * S],
      [sign * 22 * S, 32 * S],
      [sign * 18 * S, 48 * S],
    ], { d: 0x0a1018, m: 0x2a3038, l: 0x5a6068, a: p.a }, 2.5);
  }
  root.addChild(legs);

  const g = new Graphics();
  // Rounded carapace
  const hull = mirrorPoly([0, -42 * S, 18 * S, -34 * S, 32 * S, -18 * S, 38 * S, 6 * S, 30 * S, 28 * S, 16 * S, 38 * S]);
  plate(g, hull, p, { hi: 0 });
  // Highlight ridges across the carapace
  for (let i = 0; i < 3; i++) {
    const y = -30 * S + i * 16 * S;
    g.ellipse(0, y, (30 - i * 4) * S, 5 * S).fill({ color: p.l, alpha: 0.55 });
    g.ellipse(0, y - 2, (24 - i * 4) * S, 2 * S).fill({ color: 0xffffff, alpha: 0.35 });
  }
  root.addChild(g);

  // Teal accent panel band across the middle
  const band = new Graphics();
  band.ellipse(0, -8 * S, 28 * S, 8 * S).fill(teal.m);
  band.ellipse(-6 * S, -10 * S, 22 * S, 5 * S).fill(teal.l);
  band.ellipse(0, -8 * S, 28 * S, 8 * S).stroke({ color: teal.d, width: 1.5 });
  // Glyph
  for (let i = -2; i <= 2; i++) {
    band.circle(i * 5 * S, -8 * S, 1.6 * S).fill(teal.a);
    band.circle(i * 5 * S, -8 * S, 0.8 * S).fill(0xffffff);
  }
  // Cylon-style red scanner slit across the carapace dome (above the eyes).
  band.rect(-24 * S, -36 * S, 48 * S, 3.5 * S).fill(p.d);
  band.rect(-22 * S, -35 * S, 44 * S, 1.6 * S).fill({ color: 0xff2222, alpha: 0.95 });
  // Bright moving cell — implied scanner pulse
  band.rect(-2 * S, -35 * S, 4 * S, 1.6 * S).fill(0xffffff);
  band.rect(-12 * S, -35 * S, 2 * S, 1.6 * S).fill({ color: 0xffd166, alpha: 0.85 });
  band.rect(8 * S, -35 * S, 2 * S, 1.6 * S).fill({ color: 0xffd166, alpha: 0.85 });
  root.addChild(band);

  // Eye cluster (compound, 5 eyes)
  const eyes = new Graphics();
  for (const [dx, dy, er] of [[-14, -20, 4], [14, -20, 4], [-7, -28, 3], [7, -28, 3], [0, -22, 4.5]] as Array<[number, number, number]>) {
    eyes.circle(dx * S, dy * S, (er + 1) * S).fill(p.d);
    eyes.circle(dx * S, dy * S, er * S).fill(p.a);
    eyes.circle(dx * S, dy * S, er * 0.5 * S).fill(0xffffff);
  }
  root.addChild(eyes);

  // Mandibles
  const mand = new Graphics();
  for (const sign of [-1, 1]) {
    mand.poly([sign * 8 * S, -42 * S, sign * 14 * S, -52 * S, sign * 10 * S, -54 * S, sign * 6 * S, -44 * S]).fill(p.d);
    mand.poly([sign * 9 * S, -42 * S, sign * 13 * S, -50 * S, sign * 10 * S, -52 * S, sign * 7 * S, -44 * S]).fill(p.l);
  }
  root.addChild(mand);

  // Big forward claws (2 segments + pincer)
  const claws = new Graphics();
  for (const sign of [-1, 1]) {
    // Upper arm
    g.moveTo(sign * 28 * S, -16 * S).lineTo(sign * 56 * S, -38 * S).stroke({ color: p.d, width: 10 * S });
    g.moveTo(sign * 28 * S, -16 * S).lineTo(sign * 56 * S, -38 * S).stroke({ color: p.m, width: 7 * S });
    g.moveTo(sign * 28 * S, -16 * S).lineTo(sign * 56 * S, -38 * S).stroke({ color: p.l, width: 3 * S });
    // Forearm
    g.moveTo(sign * 56 * S, -38 * S).lineTo(sign * 72 * S, -56 * S).stroke({ color: p.d, width: 9 * S });
    g.moveTo(sign * 56 * S, -38 * S).lineTo(sign * 72 * S, -56 * S).stroke({ color: p.m, width: 6 * S });
    g.moveTo(sign * 56 * S, -38 * S).lineTo(sign * 72 * S, -56 * S).stroke({ color: p.l, width: 2.5 * S });
    // Pincer (two fingers)
    claws.poly([sign * 72 * S, -56 * S, sign * 92 * S, -62 * S, sign * 90 * S, -52 * S, sign * 78 * S, -50 * S]).fill(p.m);
    claws.poly([sign * 72 * S, -56 * S, sign * 92 * S, -62 * S, sign * 90 * S, -52 * S, sign * 78 * S, -50 * S]).stroke({ color: p.d, width: 1.5 });
    claws.poly([sign * 76 * S, -50 * S, sign * 90 * S, -38 * S, sign * 84 * S, -32 * S, sign * 70 * S, -46 * S]).fill(p.m);
    claws.poly([sign * 76 * S, -50 * S, sign * 90 * S, -38 * S, sign * 84 * S, -32 * S, sign * 70 * S, -46 * S]).stroke({ color: p.d, width: 1.5 });
    // Joint glow
    claws.circle(sign * 56 * S, -38 * S, 3.5 * S).fill(p.a);
    claws.circle(sign * 72 * S, -56 * S, 3 * S).fill(p.a);
    claws.circle(sign * 72 * S, -56 * S, 1.5 * S).fill(0xffffff);
    // Claw highlight tips
    claws.circle(sign * 91 * S, -60 * S, 1.5).fill(0xffffff);
    claws.circle(sign * 88 * S, -36 * S, 1.5).fill(0xffffff);
  }
  root.addChild(g);
  root.addChild(claws);

  // Engines
  const en = new Graphics();
  engineBell(en, -12 * S, 36 * S, 11 * S, 12 * S, 0xffaa55, p.d);
  engineBell(en, 12 * S, 36 * S, 11 * S, 12 * S, 0xffaa55, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 4 — Lunar Sentinel. Sphere body with massive mechanical iris.
// =========================================================================
export function drawBoss04LunarSentinel(root: Container, S = 1): void {
  // Steel-grey Death-Star palette with bright orange superlaser glow.
  const p: Pal = { d: 0x14181c, m: 0x4a5260, l: 0x8a96a4, a: 0xff8030 };
  softGlow(root, 0, -8 * S, 30 * S, p.a, 10);
  softGlow(root, 0, 0, 56 * S, 0x202428, 4);

  const g = new Graphics();
  // Spherical battle-station body. Two-tone shading mimics the iconic
  // Death Star half-shadow look.
  const R = 46 * S;
  g.circle(0, 0, R + 4).fill(p.d);
  g.circle(0, 0, R).fill(p.m);
  // Lit hemisphere (top-left)
  g.circle(-R * 0.25, -R * 0.25, R * 0.82).fill(p.l);
  // Dark hemisphere indicator (bottom-right cast)
  g.ellipse(R * 0.35, R * 0.35, R * 0.55, R * 0.55).fill({ color: 0x14181c, alpha: 0.45 });
  g.circle(0, 0, R).stroke({ color: p.d, width: 2 });
  // Surface panel grid — concentric rings + radial spokes give the hull
  // a "trench-and-plate" look.
  for (let i = 1; i < 5; i++) {
    g.ellipse(0, 0, R * (i / 5) * 1.6, R * (i / 5) * 0.55).stroke({ color: p.d, width: 0.7, alpha: 0.6 });
  }
  // Equatorial trench (classic Death-Star feature)
  g.rect(-R, -2 * S, R * 2, 4 * S).fill({ color: 0x0a0c10, alpha: 0.95 });
  g.rect(-R, -2 * S, R * 2, 4 * S).stroke({ color: p.l, width: 0.6, alpha: 0.6 });
  // Trench tower bumps (regular intervals)
  for (let i = -5; i <= 5; i++) {
    g.rect(i * 7 * S - 1, -3 * S, 2, 6 * S).fill(p.d);
  }
  // Surface details — panel rectangles dotted across the visible hemisphere
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = R * (0.45 + (i % 3) * 0.18);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (py < -4 * S || py > 4 * S) {
      g.rect(px - 3 * S, py - 2 * S, 6 * S, 4 * S).stroke({ color: p.d, width: 0.6, alpha: 0.55 });
    }
  }
  root.addChild(g);

  // Superlaser dish — large concave bowl in the upper hemisphere.
  const dish = new Graphics();
  // Outer recessed rim
  dish.circle(0, -10 * S, 24 * S).fill(0x0a0c10);
  dish.circle(0, -10 * S, 24 * S).stroke({ color: p.d, width: 2.4 });
  // Radial dish vanes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    dish.poly([
      Math.cos(a) * 23 * S, -10 * S + Math.sin(a) * 23 * S,
      Math.cos(a + 0.26) * 23 * S, -10 * S + Math.sin(a + 0.26) * 23 * S,
      Math.cos(a + 0.13) * 11 * S, -10 * S + Math.sin(a + 0.13) * 11 * S,
    ]).fill({ color: 0x3a4250, alpha: 0.95 });
  }
  // Charging emitter core — bright orange
  dish.circle(0, -10 * S, 11 * S).fill({ color: p.a, alpha: 0.95 });
  dish.circle(0, -10 * S, 11 * S).stroke({ color: 0xfff066, width: 1.2, alpha: 0.95 });
  // 8 focusing nodes around the core
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const px = Math.cos(a) * 8 * S;
    const py = -10 * S + Math.sin(a) * 8 * S;
    dish.circle(px, py, 1.4 * S).fill(0xfff066);
    dish.circle(px, py, 0.7 * S).fill(0xffffff);
  }
  // Pupil
  dish.circle(0, -10 * S, 4 * S).fill(0xfff066);
  dish.circle(0, -10 * S, 2 * S).fill(0xffffff);
  root.addChild(dish);

  // Side support cannons (turbolaser turrets along equator)
  const cn = new Graphics();
  cannon(cn, -36 * S, 12 * S, 14 * S, 5 * S, { d: 0x10141a, m: 0x3a4250, l: 0x6a7280, a: p.a });
  cannon(cn, 36 * S, 12 * S, 14 * S, 5 * S, { d: 0x10141a, m: 0x3a4250, l: 0x6a7280, a: p.a });
  // Lower mini-turrets
  eyeCannon(cn, -22 * S, 30 * S, 4 * S, p.a);
  eyeCannon(cn, 22 * S, 30 * S, 4 * S, p.a);
  eyeCannon(cn, 0, 36 * S, 4 * S, p.a);
  root.addChild(cn);

  // Communication antenna mast on top of dish
  const ant = new Graphics();
  antennaArr(ant, 0, -34 * S, 12 * S, p.a);
  root.addChild(ant);

  // Engines underneath
  const en = new Graphics();
  engineBell(en, -22 * S, 44 * S, 11 * S, 12 * S, 0x66c4ff, p.d);
  engineBell(en, 22 * S, 44 * S, 11 * S, 12 * S, 0x66c4ff, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 5 — Hive Carrier. Long flat carrier with hangar bays + bridge tower.
// =========================================================================
export function drawBoss05HiveCarrier(root: Container, S = 1): void {
  // Independence-Day-style mothership: massive flying disc, ringed hangar
  // belt, central command dome with city-lights underneath.
  const p: Pal = { d: 0x10160c, m: 0x2a3e22, l: 0x5a7e42, a: 0xfff066 };
  const acc2 = 0x66ddff;
  const dome = 0x88c266;

  // Massive amber underglow from the city-light belt
  softGlow(root, 0, 18 * S, 60 * S, 0xffaa55, 12);
  softGlow(root, 0, -28 * S, 32 * S, dome, 9);

  // Lower disc rim — shadowed under-platform sticking out at the bottom
  const lower = new Graphics();
  const lowerHull = mirrorPoly([0, 32 * S, 56 * S, 26 * S, 80 * S, 12 * S, 78 * S, 30 * S, 56 * S, 46 * S]);
  plate(lower, lowerHull, { d: p.d, m: 0x1c2814, l: 0x3a4a28, a: p.a });
  // Underside ridges
  for (let i = -3; i <= 3; i++) {
    lower.rect(i * 18 * S - 1, 28 * S, 2, 14 * S).fill({ color: p.d, alpha: 0.85 });
  }
  root.addChild(lower);

  // Main disc body — broad saucer with concentric tier rings
  const g = new Graphics();
  const hull = mirrorPoly([0, -22 * S, 38 * S, -18 * S, 70 * S, -4 * S, 86 * S, 14 * S, 78 * S, 24 * S, 50 * S, 32 * S]);
  plate(g, hull, p);
  // Tier rings carved into the disc — armoured deck plating
  g.ellipse(0, 8 * S, 78 * S, 18 * S).stroke({ color: p.d, width: 1.4, alpha: 0.85 });
  g.ellipse(0, 4 * S, 62 * S, 14 * S).stroke({ color: p.d, width: 1.2, alpha: 0.8 });
  g.ellipse(0, 0, 46 * S, 10 * S).stroke({ color: p.d, width: 1, alpha: 0.7 });
  // Radial structural ribs
  for (let i = -4; i <= 4; i++) {
    const t = i / 4;
    g.moveTo(t * 32 * S, -16 * S).lineTo(t * 78 * S, 22 * S).stroke({ color: p.d, width: 0.8, alpha: 0.6 });
  }
  // Faint cyan-lit panel grid on the upper face
  for (let i = -2; i <= 2; i++) {
    g.rect(i * 18 * S - 6, -10 * S, 12 * S, 4 * S).fill({ color: acc2, alpha: 0.18 });
  }
  root.addChild(g);

  // City-lights belt — ring of amber/cyan window lights around the equator
  const lights = new Graphics();
  for (let i = -7; i <= 7; i++) {
    const x = i * 11 * S;
    // Two-row window strip
    lights.rect(x - 3 * S, 16 * S, 6 * S, 1.6 * S).fill({ color: 0xffd166, alpha: 0.95 });
    lights.rect(x - 3 * S, 20 * S, 6 * S, 1.6 * S).fill({ color: 0xfff0a0, alpha: 0.95 });
    // Faint blue accent every other slot
    if (i % 2 === 0) lights.rect(x - 1 * S, 12 * S, 2 * S, 1.4 * S).fill({ color: acc2, alpha: 0.9 });
  }
  // Edge running lights
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI;
    lights.circle(Math.cos(a + Math.PI) * 84 * S, 24 * S + Math.sin(a) * 8 * S, 0.9).fill(0xfff066);
  }
  root.addChild(lights);

  // Hangar bays around the equator — three wide bays facing the player.
  const bay = new Graphics();
  for (let i = -1; i <= 1; i++) {
    const bx = i * 28 * S;
    bay.rect(bx - 10 * S, 0, 20 * S, 14 * S).fill(0x000000);
    bay.rect(bx - 10 * S, 0, 20 * S, 14 * S).stroke({ color: p.d, width: 1.2 });
    bay.rect(bx - 9 * S, 1, 18 * S, 12 * S).fill({ color: acc2, alpha: 0.6 });
    bay.rect(bx - 8 * S, 2, 16 * S, 4 * S).fill({ color: 0xffffff, alpha: 0.45 });
    // Drone visible in each bay
    bay.circle(bx, 9 * S, 3 * S).fill(p.d);
    bay.circle(bx, 9 * S, 2 * S).fill(p.a);
    bay.circle(bx - 1 * S, 8 * S, 0.8).fill(0xffffff);
  }
  root.addChild(bay);

  // Central command dome — Independence-Day "city in a bubble" feel.
  const cmd = new Graphics();
  bulb(cmd, 0, -22 * S, 22 * S, 16 * S, { d: p.d, m: 0x3a4a2a, l: dome, a: p.a }, { specular: true, tilt: 0.4 });
  // Embedded city spires inside the dome
  for (const [sx, sh] of [[-12, 10], [-6, 14], [0, 16], [6, 12], [12, 9]] as Array<[number, number]>) {
    cmd.rect(sx * S - 0.8, -22 * S, 1.6 * S, sh * S).fill({ color: 0xfff066, alpha: 0.95 });
  }
  // Dome rim glow
  cmd.ellipse(0, -10 * S, 22 * S, 4 * S).fill({ color: p.a, alpha: 0.85 });
  cmd.ellipse(0, -10 * S, 22 * S, 4 * S).stroke({ color: 0xffffff, width: 0.6, alpha: 0.7 });
  // Vertical comm masts on top of the dome
  antennaArr(cmd, 0, -36 * S, 16 * S, p.a);
  antennaArr(cmd, -14 * S, -32 * S, 12 * S, acc2);
  antennaArr(cmd, 14 * S, -32 * S, 12 * S, acc2);
  root.addChild(cmd);

  // Edge weapon emplacements — large ball turrets at 4/8 o'clock + small bow guns
  const cn = new Graphics();
  eyeCannon(cn, -66 * S, 10 * S, 5 * S, p.a);
  eyeCannon(cn, 66 * S, 10 * S, 5 * S, p.a);
  eyeCannon(cn, -42 * S, 30 * S, 4 * S, p.a);
  eyeCannon(cn, 42 * S, 30 * S, 4 * S, p.a);
  // Forward chin cannons (downward-pointing)
  cannon(cn, -22 * S, 34 * S, 12 * S, 5 * S, { d: 0x101810, m: 0x2a3a1a, l: 0x4a6a30, a: p.a });
  cannon(cn, 22 * S, 34 * S, 12 * S, 5 * S, { d: 0x101810, m: 0x2a3a1a, l: 0x4a6a30, a: p.a });
  root.addChild(cn);

  // Hull-rim status lights
  const lt = new Graphics();
  for (const [x, y, c] of [[-80, 16, 0xff4040], [80, 16, 0x40ff40], [-58, 30, p.a], [58, 30, p.a]] as Array<[number, number, number]>) {
    lightDot(lt, x * S, y * S, 1.6, c);
  }
  root.addChild(lt);

  // Engines — 4 amber thrusters on the underside.
  const en = new Graphics();
  engineBell(en, -50 * S, 36 * S, 12 * S, 14 * S, 0xffae44, p.d);
  engineBell(en, -18 * S, 40 * S, 12 * S, 14 * S, 0xffae44, p.d);
  engineBell(en, 18 * S, 40 * S, 12 * S, 14 * S, 0xffae44, p.d);
  engineBell(en, 50 * S, 36 * S, 12 * S, 14 * S, 0xffae44, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 6 — Wreck Behemoth. Battered ruined warship.
// =========================================================================
export function drawBoss06WreckBehemoth(root: Container, S = 1): void {
  const p: Pal = { d: 0x1d0e08, m: 0x4a2a18, l: 0x8a4a30, a: 0xff6a3a };
  const eng = 0xffae44;
  softGlow(root, -34 * S, 46 * S, 14 * S, eng, 7);
  softGlow(root, 34 * S, 46 * S, 14 * S, eng, 7);
  softGlow(root, 0, 52 * S, 18 * S, eng, 8);

  const g = new Graphics();
  // Battered hull
  const hull = mirrorPoly([0, -58 * S, 18 * S, -48 * S, 30 * S, -28 * S, 52 * S, -4 * S, 56 * S, 24 * S, 44 * S, 44 * S, 26 * S, 50 * S]);
  plate(g, hull, p);
  // Missing chunks (asymmetric)
  g.poly([24 * S, -32 * S, 38 * S, -22 * S, 32 * S, -12 * S, 22 * S, -22 * S]).fill(0x000000);
  g.poly([-22 * S, 18 * S, -8 * S, 30 * S, -16 * S, 38 * S, -28 * S, 30 * S]).fill(0x000000);
  // Dark interior glow inside missing chunks
  g.poly([26 * S, -30 * S, 36 * S, -22 * S, 32 * S, -14 * S, 24 * S, -22 * S]).fill({ color: 0x4a1a10, alpha: 0.95 });
  g.poly([-20 * S, 20 * S, -10 * S, 28 * S, -18 * S, 34 * S, -26 * S, 28 * S]).fill({ color: 0x4a1a10, alpha: 0.95 });
  // Ember glow
  g.circle(30 * S, -22 * S, 4 * S).fill({ color: p.a, alpha: 0.9 });
  g.circle(30 * S, -22 * S, 2 * S).fill(0xfff066);
  g.circle(-18 * S, 28 * S, 4 * S).fill({ color: p.a, alpha: 0.9 });
  g.circle(-18 * S, 28 * S, 2 * S).fill(0xfff066);
  root.addChild(g);

  // Scorch marks
  const dmg = new Graphics();
  scorch(dmg, -36 * S, 4 * S, 8 * S);
  scorch(dmg, 14 * S, 18 * S, 6 * S);
  scorch(dmg, -8 * S, -34 * S, 5 * S);
  scorch(dmg, 36 * S, 26 * S, 7 * S);
  root.addChild(dmg);

  // Hanging cables
  const cab = new Graphics();
  for (const [sx, sy, ex, ey] of [
    [22 * S, -16 * S, 32 * S, -8 * S],
    [-18 * S, 22 * S, -28 * S, 30 * S],
    [-18 * S, 22 * S, -10 * S, 36 * S],
    [22 * S, -16 * S, 18 * S, -6 * S],
  ]) {
    cab.moveTo(sx, sy).bezierCurveTo(sx + (ex - sx) * 0.3, sy + (ey - sy) * 0.7, sx + (ex - sx) * 0.7, sy + (ey - sy) * 0.6, ex, ey).stroke({ color: 0x1a1208, width: 1.6, alpha: 0.85 });
    cab.circle(ex, ey, 1.4).fill(p.a);
  }
  root.addChild(cab);

  // Ruined bridge
  const cp = new Graphics();
  plate(cp, [-8 * S, -32 * S, -5 * S, -42 * S, 5 * S, -42 * S, 8 * S, -32 * S], { d: p.d, m: 0x3a1a10, l: 0x6a3a20, a: p.a });
  cp.ellipse(0, -36 * S, 4 * S, 2.5 * S).fill({ color: 0x4a1a10, alpha: 0.95 });
  cp.ellipse(-1 * S, -37 * S, 2 * S, 1.5 * S).fill(p.a);
  // Broken antenna stub
  cp.moveTo(0, -42 * S).lineTo(2 * S, -52 * S).stroke({ color: 0x1a1208, width: 1.5 });
  cp.moveTo(2 * S, -52 * S).lineTo(6 * S, -50 * S).stroke({ color: 0x1a1208, width: 1.2 });
  root.addChild(cp);

  // Side turrets — one big, one missing (just base)
  const cn = new Graphics();
  cannon(cn, -10 * S, -56 * S, 18 * S, 5 * S, { d: 0x1a0a08, m: 0x4a2018, l: 0x7a3520, a: p.a });
  cannon(cn, 10 * S, -56 * S, 18 * S, 5 * S, { d: 0x1a0a08, m: 0x4a2018, l: 0x7a3520, a: p.a });
  cannon(cn, 0, -64 * S, 22 * S, 5 * S, { d: 0x1a0a08, m: 0x4a2018, l: 0x7a3520, a: p.a });
  eyeCannon(cn, 48 * S, 6 * S, 6 * S, p.a);
  // Destroyed turret (base only, smoking)
  cn.circle(-48 * S, 6 * S, 6 * S).fill(p.d);
  cn.circle(-48 * S, 6 * S, 4 * S).fill({ color: 0x4a1a10, alpha: 0.85 });
  cn.circle(-48 * S, 6 * S, 2 * S).fill(0xff7733);
  root.addChild(cn);

  // Engines (one half-working)
  const en = new Graphics();
  engineBell(en, -34 * S, 38 * S, 10 * S, 12 * S, eng, p.d);
  engineBell(en, 34 * S, 38 * S, 10 * S, 12 * S, eng, p.d);
  engineBell(en, 0, 44 * S, 14 * S, 12 * S, eng, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 7 — Mine Mother. Hex platform with drilling arms + mine racks.
// =========================================================================
export function drawBoss07MineMother(root: Container, S = 1): void {
  const p: Pal = { d: 0x1d0a1d, m: 0x4a1d3a, l: 0x824a6a, a: 0xff8866 };
  const eng = 0xffaa44;
  softGlow(root, 0, 0, 36 * S, p.a, 10);
  softGlow(root, 0, 48 * S, 16 * S, eng, 8);

  const g = new Graphics();
  // Hex platform
  const R = 52 * S;
  const hex: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
    hex.push(Math.cos(a) * R, Math.sin(a) * R);
  }
  plate(g, hex, p);
  // Inner hex highlight
  const ihex: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
    ihex.push(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7);
  }
  plate(g, ihex, { d: p.d, m: 0x3a1828, l: p.l, a: p.a });
  // Plate seams from center to vertices
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
    g.moveTo(0, 0).lineTo(Math.cos(a) * R, Math.sin(a) * R).stroke({ color: p.d, width: 1.5, alpha: 0.7 });
  }
  root.addChild(g);

  // Drill arms (3)
  const drills = new Graphics();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const sx = Math.cos(a) * 16 * S;
    const sy = Math.sin(a) * 16 * S;
    const tx = Math.cos(a) * 58 * S;
    const ty = Math.sin(a) * 58 * S;
    // Arm
    drills.moveTo(sx, sy).lineTo(tx, ty).stroke({ color: p.d, width: 8 * S });
    drills.moveTo(sx, sy).lineTo(tx, ty).stroke({ color: p.l, width: 3 * S });
    // Drill head (teeth)
    drills.circle(tx, ty, 7 * S).fill(p.d);
    drills.circle(tx, ty, 6 * S).fill(p.m);
    drills.circle(tx, ty, 4 * S).fill(p.a);
    drills.circle(tx, ty, 2 * S).fill(0xffffff);
    // Teeth around drill head
    for (let k = 0; k < 6; k++) {
      const ta = a + (k / 6) * Math.PI * 2;
      const ttx = tx + Math.cos(ta) * 7 * S;
      const tty = ty + Math.sin(ta) * 7 * S;
      drills.poly([ttx, tty, ttx + Math.cos(ta) * 3, tty + Math.sin(ta) * 3, ttx + Math.cos(ta + 0.3) * 1, tty + Math.sin(ta + 0.3) * 1]).fill(p.l);
    }
  }
  root.addChild(drills);

  // Mine racks (3, between drill arms)
  const racks = new Graphics();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + Math.PI / 3;
    const rx = Math.cos(a) * R * 0.78;
    const ry = Math.sin(a) * R * 0.78;
    // Rack frame
    racks.circle(rx, ry, 8 * S).fill(p.d);
    racks.circle(rx, ry, 8 * S).stroke({ color: p.a, width: 1.4 });
    // 4 mines visible in rack
    for (let k = 0; k < 4; k++) {
      const ka = (k / 4) * Math.PI * 2;
      const mx = rx + Math.cos(ka) * 4.5 * S;
      const my = ry + Math.sin(ka) * 4.5 * S;
      racks.circle(mx, my, 2 * S).fill(p.a);
      // Spikes on mine
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2;
        racks.circle(mx + Math.cos(sa) * 2.5 * S, my + Math.sin(sa) * 2.5 * S, 0.7).fill(p.a);
      }
      racks.circle(mx, my, 0.9).fill(0xffffff);
    }
  }
  root.addChild(racks);

  // Central drill core
  const core = new Graphics();
  core.circle(0, 0, 18 * S).fill(p.d);
  core.circle(0, 0, 14 * S).fill(p.m);
  core.circle(0, 0, 14 * S).stroke({ color: p.a, width: 2 });
  core.circle(0, 0, 10 * S).fill(p.a);
  core.circle(0, 0, 6 * S).fill(0xfff066);
  core.circle(0, 0, 3 * S).fill(0xffffff);
  // Inner pattern
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    core.circle(Math.cos(a) * 8 * S, Math.sin(a) * 8 * S, 1.2).fill(0x000000);
  }
  root.addChild(core);

  // Hazard chevrons on platform edges
  const haz = new Graphics();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 2 + Math.PI / 6;
    const sx = Math.cos(a) * R * 0.92;
    const sy = Math.sin(a) * R * 0.92;
    haz.circle(sx, sy, 2 * S).fill(0xfff066);
    haz.circle(sx, sy, 1).fill(0xffffff);
  }
  root.addChild(haz);

  // Engines
  const en = new Graphics();
  engineBell(en, -14 * S, 40 * S, 10 * S, 12 * S, eng, p.d);
  engineBell(en, 14 * S, 40 * S, 10 * S, 12 * S, eng, p.d);
  engineBell(en, 0, 44 * S, 12 * S, 12 * S, eng, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 8 — Ghost Sniper. Predator stealth bomber with sniper barrel.
// =========================================================================
export function drawBoss08GhostSniper(root: Container, S = 1): void {
  const p: Pal = { d: 0x14100a, m: 0x2a2418, l: 0x6a583a, a: 0xfff066 };
  const stealthMid = 0x3a3030;
  softGlow(root, 0, 50 * S, 16 * S, p.a, 8);
  softGlow(root, 0, -12 * S, 22 * S, p.a, 7);

  const g = new Graphics();
  // Wide stealth-bomber silhouette
  const hull = mirrorPoly([0, -50 * S, 14 * S, -38 * S, 24 * S, -14 * S, 56 * S, 20 * S, 64 * S, 36 * S, 36 * S, 44 * S, 16 * S, 30 * S]);
  plate(g, hull, p);
  // Stealth facets
  for (let i = -2; i <= 2; i++) {
    const x = i * 18 * S;
    g.poly([x - 4 * S, 0, x + 4 * S, 0, x + 2 * S, 12 * S, x - 2 * S, 12 * S]).fill({ color: stealthMid, alpha: 0.6 });
  }
  // Wing slashes
  g.moveTo(-28 * S, -4 * S).lineTo(-60 * S, 30 * S).stroke({ color: p.d, width: 2, alpha: 0.7 });
  g.moveTo(28 * S, -4 * S).lineTo(60 * S, 30 * S).stroke({ color: p.d, width: 2, alpha: 0.7 });
  // Gold accent stripes
  g.poly([-26 * S, -10 * S, -54 * S, 20 * S, -50 * S, 24 * S, -22 * S, -6 * S]).fill({ color: p.a, alpha: 0.55 });
  g.poly([26 * S, -10 * S, 54 * S, 20 * S, 50 * S, 24 * S, 22 * S, -6 * S]).fill({ color: p.a, alpha: 0.55 });
  root.addChild(g);

  // Long sniper barrel
  const barrel = new Graphics();
  barrel.rect(-3.5 * S, -80 * S, 7 * S, 38 * S).fill(p.d);
  barrel.rect(-2 * S, -80 * S, 4 * S, 36 * S).fill(p.l);
  // Cooling rings (5)
  for (let i = 0; i < 5; i++) {
    barrel.rect(-5 * S, -75 * S + i * 8 * S, 10 * S, 2 * S).fill(p.d);
  }
  // Muzzle
  barrel.rect(-4 * S, -84 * S, 8 * S, 4 * S).fill(p.d);
  barrel.circle(0, -82 * S, 2 * S).fill(p.a);
  barrel.circle(0, -82 * S, 1).fill(0xffffff);
  // Scope on top of barrel
  barrel.rect(-3 * S, -68 * S, 6 * S, 8 * S).fill(p.d);
  barrel.rect(-2 * S, -67 * S, 4 * S, 6 * S).fill(p.m);
  barrel.circle(0, -64 * S, 1.5 * S).fill(p.a);
  barrel.circle(0, -64 * S, 0.7).fill(0xffffff);
  root.addChild(barrel);

  // Predator "scope eye" / sensor between hull and barrel
  const sc = new Graphics();
  sc.poly([0, -20 * S, 9 * S, -10 * S, 0, 0, -9 * S, -10 * S]).fill(p.a);
  sc.poly([0, -20 * S, 9 * S, -10 * S, 0, 0, -9 * S, -10 * S]).stroke({ color: 0xffffff, width: 1.2 });
  sc.poly([0, -16 * S, 4 * S, -10 * S, 0, -4 * S, -4 * S, -10 * S]).fill(0xffffff);
  root.addChild(sc);

  // Inboard cannons
  const cn = new Graphics();
  cannon(cn, -22 * S, -4 * S, 12 * S, 4 * S, { d: p.d, m: 0x3a3018, l: 0x6a5830, a: p.a });
  cannon(cn, 22 * S, -4 * S, 12 * S, 4 * S, { d: p.d, m: 0x3a3018, l: 0x6a5830, a: p.a });
  eyeCannon(cn, -54 * S, 30 * S, 4 * S, p.a);
  eyeCannon(cn, 54 * S, 30 * S, 4 * S, p.a);
  root.addChild(cn);

  // Engines
  const en = new Graphics();
  engineBell(en, -18 * S, 38 * S, 10 * S, 12 * S, p.a, p.d);
  engineBell(en, 18 * S, 38 * S, 10 * S, 12 * S, p.a, p.d);
  root.addChild(en);

  // Lights
  const lt = new Graphics();
  lightDot(lt, -58 * S, 36 * S, 1.4, 0xff4040);
  lightDot(lt, 58 * S, 36 * S, 1.4, 0xfff066);
  root.addChild(lt);
}

// =========================================================================
// BOSS 9 — Kamikaze Queen. Insectoid hive (Image 2 inspiration).
// =========================================================================
export function drawBoss09KamikazeQueen(root: Container, S = 1): void {
  const p: Pal = { d: 0x1a0a26, m: 0x382a5a, l: 0x6e5aaa, a: 0xff7aaa };
  const teal: Pal = { d: 0x0a283a, m: 0x1c5878, l: 0x4ec8e6, a: 0xa3e8ff };
  const gold: Pal = { d: 0x2a1a0a, m: 0x6a4a18, l: 0xc4a04a, a: 0xffd166 };

  softGlow(root, 0, -8 * S, 30 * S, p.a, 10);
  softGlow(root, 0, 30 * S, 18 * S, gold.a, 7);

  // Spider legs (6, articulated)
  const legs = new Graphics();
  for (const sign of [-1, 1]) {
    // Front leg
    spiderLeg(legs, [
      [sign * 18 * S, -8 * S],
      [sign * 44 * S, -32 * S],
      [sign * 64 * S, -22 * S],
      [sign * 76 * S, -6 * S],
      [sign * 80 * S, 12 * S],
    ], teal, 4);
    // Middle leg
    spiderLeg(legs, [
      [sign * 22 * S, 4 * S],
      [sign * 52 * S, 0],
      [sign * 70 * S, 20 * S],
      [sign * 76 * S, 38 * S],
    ], teal, 3.5);
    // Rear leg
    spiderLeg(legs, [
      [sign * 18 * S, 16 * S],
      [sign * 42 * S, 26 * S],
      [sign * 60 * S, 46 * S],
      [sign * 64 * S, 60 * S],
    ], teal, 3);
  }
  root.addChild(legs);

  // Multi-color wing fins (4 on each side)
  const wings = new Graphics();
  // Upper outer wing (large, fanned)
  for (const sign of [-1, 1]) {
    wingFin(wings, [
      sign * 10 * S, -20 * S,
      sign * 36 * S, -50 * S,
      sign * 50 * S, -34 * S,
      sign * 32 * S, -16 * S,
    ], { d: 0x18182a, m: 0x3a4a8a, l: 0x8aaacc, a: 0xb0d8ff }, 0.85);
    // Upper inner wing
    wingFin(wings, [
      sign * 4 * S, -28 * S,
      sign * 22 * S, -52 * S,
      sign * 30 * S, -42 * S,
      sign * 16 * S, -22 * S,
    ], { d: 0x2a1a0a, m: 0x6a3a18, l: 0xb47830, a: 0xffae44 }, 0.85);
    // Lower outer wing
    wingFin(wings, [
      sign * 14 * S, 4 * S,
      sign * 42 * S, 18 * S,
      sign * 50 * S, 36 * S,
      sign * 28 * S, 24 * S,
    ], { d: 0x18182a, m: 0x3a4a8a, l: 0x8aaacc, a: 0xb0d8ff }, 0.85);
    // Lower inner wing
    wingFin(wings, [
      sign * 10 * S, 12 * S,
      sign * 28 * S, 28 * S,
      sign * 22 * S, 42 * S,
      sign * 12 * S, 28 * S,
    ], { d: 0x2a1a0a, m: 0x6a3a18, l: 0xb47830, a: 0xffae44 }, 0.85);
  }
  root.addChild(wings);

  const g = new Graphics();
  // Central body (multi-segmented spine)
  for (let i = 0; i < 6; i++) {
    const y = -54 * S + i * 16 * S;
    const w = 12 * S - i * 0.6 * S + Math.sin(i * 0.6) * 2 * S;
    vertebra(g, 0, y, w, gold);
  }
  // Outer carapace shell around the spine
  const shell = mirrorPoly([0, -54 * S, 18 * S, -36 * S, 26 * S, -8 * S, 22 * S, 18 * S, 12 * S, 38 * S]);
  g.poly(shell).fill({ color: p.m, alpha: 0.85 });
  g.poly(shell).stroke({ color: p.d, width: 1.5 });
  // Highlight
  g.poly(scalePoly(shell, 0, 0, 0.7)).fill({ color: p.l, alpha: 0.65 });
  root.addChild(g);

  // Compound eye cluster on top of body
  const eyes = new Graphics();
  for (const [dx, dy, r] of [[-7, -30, 3], [7, -30, 3], [-4, -38, 2.5], [4, -38, 2.5], [0, -34, 3]] as Array<[number, number, number]>) {
    eyes.circle(dx * S, dy * S, (r + 0.8) * S).fill(p.d);
    eyes.circle(dx * S, dy * S, r * S).fill(p.a);
    eyes.circle(dx * S + 0.5, dy * S - 0.5, r * 0.4 * S).fill(0xffffff);
  }
  root.addChild(eyes);

  // Mandibles
  const mand = new Graphics();
  for (const sign of [-1, 1]) {
    mand.poly([sign * 6 * S, -52 * S, sign * 14 * S, -64 * S, sign * 10 * S, -68 * S, sign * 4 * S, -56 * S]).fill(gold.d);
    mand.poly([sign * 7 * S, -52 * S, sign * 12 * S, -62 * S, sign * 9 * S, -66 * S, sign * 5 * S, -54 * S]).fill(gold.l);
    mand.circle(sign * 11 * S, -66 * S, 1.5).fill(gold.a);
  }
  root.addChild(mand);

  // Central glowing core
  const core = new Graphics();
  bulb(core, 0, 0, 8 * S, 7 * S, { d: p.d, m: p.a, l: 0xffc4d6, a: 0xffffff }, { core: true });
  root.addChild(core);

  // Bottom legs (claw-feet)
  const claws = new Graphics();
  for (const sign of [-1, 1]) {
    claws.poly([sign * 8 * S, 38 * S, sign * 18 * S, 52 * S, sign * 12 * S, 56 * S, sign * 4 * S, 42 * S]).fill(gold.m);
    claws.poly([sign * 8 * S, 38 * S, sign * 18 * S, 52 * S, sign * 12 * S, 56 * S, sign * 4 * S, 42 * S]).stroke({ color: gold.d, width: 1 });
    claws.circle(sign * 16 * S, 52 * S, 2 * S).fill(gold.a);
    claws.circle(sign * 16 * S, 52 * S, 1).fill(0xffffff);
  }
  root.addChild(claws);
}

// =========================================================================
// BOSS 10 — Saturn Dreadnought. Heavy battleship with 4 main turrets.
// =========================================================================
export function drawBoss10SaturnDreadnought(root: Container, S = 1): void {
  const p: Pal = { d: 0x0a1228, m: 0x1f3258, l: 0x4a6aa8, a: 0xffaa66 };
  const eng = 0xffd166;
  for (let i = -2; i <= 2; i++) softGlow(root, i * 20 * S, 64 * S, 14 * S, eng, 8);

  const g = new Graphics();
  // Long armored hull
  const hull = mirrorPoly([0, -72 * S, 14 * S, -62 * S, 24 * S, -42 * S, 38 * S, -20 * S, 56 * S, 4 * S, 64 * S, 32 * S, 52 * S, 56 * S]);
  plate(g, hull, p);
  // Armor banding
  for (const y of [-14, 14, 36]) {
    g.poly([-58 * S, y * S, 58 * S, y * S, 56 * S, (y + 4) * S, -56 * S, (y + 4) * S]).fill({ color: p.d, alpha: 0.6 });
    rivets(g, -54 * S, (y + 2) * S, 54 * S, (y + 2) * S, 13);
  }
  // Spine accent
  g.poly([-3 * S, -64 * S, 3 * S, -64 * S, 5 * S, 52 * S, -5 * S, 52 * S]).fill({ color: p.a, alpha: 0.5 });
  g.poly([-1 * S, -66 * S, 1 * S, -66 * S, 2 * S, 50 * S, -2 * S, 50 * S]).fill(0xffffff);
  root.addChild(g);

  // 4 main turrets (with detail)
  const cn = new Graphics();
  for (const [tx, ty] of [[-18, -22], [18, -22], [-22, 22], [22, 22]] as Array<[number, number]>) {
    const x = tx * S, y = ty * S, r = 8 * S;
    // Base
    cn.circle(x + 1, y + 2, r + 2).fill({ color: 0x000000, alpha: 0.5 });
    cn.circle(x, y, r + 2).fill(p.d);
    cn.circle(x, y, r + 2).stroke({ color: p.l, width: 1.4, alpha: 0.8 });
    cn.circle(x, y, r).fill(p.m);
    cn.circle(x - r * 0.3, y - r * 0.3, r * 0.7).fill(p.l);
    // Twin barrels
    cn.rect(x - r * 0.7, y - r - 14 * S, r * 0.45, 14 * S).fill(p.d);
    cn.rect(x + r * 0.25, y - r - 14 * S, r * 0.45, 14 * S).fill(p.d);
    cn.rect(x - r * 0.65, y - r - 14 * S, r * 0.35, 4).fill(p.a);
    cn.rect(x + r * 0.3, y - r - 14 * S, r * 0.35, 4).fill(p.a);
    // Center hatch
    cn.circle(x, y, r * 0.3).fill(p.a);
    cn.circle(x, y, r * 0.15).fill(0xffffff);
  }
  // Spinal lance
  cannon(cn, 0, -78 * S, 22 * S, 10 * S, { d: 0x10182a, m: 0x2a3a5a, l: 0x4a6a98, a: p.a });
  root.addChild(cn);

  // Side missile pods
  const pods = new Graphics();
  for (const sign of [-1, 1]) {
    pods.rect(sign * 60 * S - 4 * S, -4 * S, 8 * S, 18 * S).fill(p.d);
    pods.rect(sign * 60 * S - 4 * S, -4 * S, 8 * S, 18 * S).stroke({ color: p.l, width: 1 });
    for (let i = 0; i < 5; i++) {
      pods.circle(sign * 60 * S, 0 + i * 4 * S, 1.6).fill(p.a);
      pods.circle(sign * 60 * S, 0 + i * 4 * S, 0.6).fill(0xffffff);
    }
  }
  root.addChild(pods);

  // Multi-deck bridge
  const tower = new Graphics();
  plate(tower, [-10 * S, -34 * S, -7 * S, -50 * S, 7 * S, -50 * S, 10 * S, -34 * S], { d: p.d, m: 0x2a3a5a, l: 0x5a7aa8, a: p.a });
  plate(tower, [-7 * S, -50 * S, -5 * S, -60 * S, 5 * S, -60 * S, 7 * S, -50 * S], { d: p.d, m: 0x2a3a5a, l: 0x5a7aa8, a: p.a });
  // Bridge windows
  tower.ellipse(0, -42 * S, 6 * S, 3 * S).fill(p.a);
  tower.ellipse(0, -43 * S, 3 * S, 1.5 * S).fill(0xffffff);
  tower.ellipse(0, -54 * S, 4 * S, 2 * S).fill(p.a);
  // Radar mast antennae
  antennaArr(tower, -5 * S, -58 * S, 10 * S, 0xff4040);
  antennaArr(tower, 5 * S, -58 * S, 10 * S, 0xff4040);
  antennaArr(tower, 0, -60 * S, 14 * S, p.a);
  root.addChild(tower);

  // Hull lights
  const lt = new Graphics();
  for (const [x, y, c] of [[-52, -4, p.a], [52, -4, p.a], [-60, 22, 0xff4040], [60, 22, 0x40ff40], [-48, 44, 0xfff066], [48, 44, 0xfff066]] as Array<[number, number, number]>) {
    lightDot(lt, x * S, y * S, 1.6, c);
  }
  root.addChild(lt);

  // 5 engines
  const en = new Graphics();
  for (let i = -2; i <= 2; i++) {
    engineBell(en, i * 20 * S, 52 * S, 14 * S, 16 * S, eng, p.d);
  }
  root.addChild(en);
}

// =========================================================================
// BOSS 11 — Phantom. Multi-finned alien with crystalline core.
// =========================================================================
export function drawBoss11Phantom(root: Container, S = 1): void {
  const p: Pal = { d: 0x18082a, m: 0x3a1858, l: 0x6e3a98, a: 0xc466ff };
  const pink = 0xff66c4;
  softGlow(root, 0, 0, 38 * S, p.a, 12);

  // Multi-finned wings (5 levels)
  const wings = new Graphics();
  const finLayers: Array<[number, number]> = [
    [-30, -32], [-48, -10], [-50, 12], [-40, 32], [-22, 42],
  ];
  for (const sign of [-1, 1]) {
    for (let i = 0; i < finLayers.length; i++) {
      const [tx, ty] = finLayers[i];
      wingFin(wings, [
        sign * 8 * S, ty * S - 4 * S,
        sign * tx * S, ty * S - 6 * S,
        sign * (tx - 6) * S, ty * S + 6 * S,
        sign * 6 * S, ty * S + 4 * S,
      ], { d: p.d, m: p.m, l: p.l, a: p.a }, 0.85);
    }
  }
  root.addChild(wings);

  const g = new Graphics();
  // Central spine
  g.poly([0, -60 * S, 9 * S, -32 * S, 8 * S, 28 * S, 0, 52 * S, -8 * S, 28 * S, -9 * S, -32 * S]).fill(p.m);
  g.poly([0, -60 * S, 9 * S, -32 * S, 8 * S, 28 * S, 0, 52 * S, -8 * S, 28 * S, -9 * S, -32 * S]).stroke({ color: p.d, width: 2 });
  // Spine inner highlight
  g.poly([0, -52 * S, 6 * S, -28 * S, 5 * S, 24 * S, 0, 44 * S, -5 * S, 24 * S, -6 * S, -28 * S]).fill({ color: p.l, alpha: 0.65 });
  // Bright glowing slit down the centre
  g.rect(-2 * S, -54 * S, 4 * S, 100 * S).fill({ color: p.a, alpha: 0.65 });
  g.rect(-1 * S, -56 * S, 2 * S, 104 * S).fill(0xffffff);
  root.addChild(g);

  // Fin emitter crystals
  const em = new Graphics();
  for (const sign of [-1, 1]) {
    for (const [tx, ty] of finLayers) {
      gemCrystal(em, sign * tx * S * 0.75, ty * S, 3 * S, p.a);
    }
  }
  root.addChild(em);

  // Central crystal core
  const core = new Graphics();
  gemCrystal(core, 0, 0, 12 * S, p.a);
  // Inner pink heart
  gemCrystal(core, 0, 0, 6 * S, pink);
  root.addChild(core);

  // Top spire (an emitter pointing up)
  const sp = new Graphics();
  gemCrystal(sp, 0, -54 * S, 6 * S, p.a);
  root.addChild(sp);

  // Trailing tendril at back
  const ten = new Graphics();
  ten.moveTo(0, 52 * S).bezierCurveTo(-6 * S, 58 * S, 4 * S, 64 * S, 0, 70 * S).stroke({ color: p.a, width: 3, alpha: 0.9 });
  ten.moveTo(0, 52 * S).bezierCurveTo(-6 * S, 58 * S, 4 * S, 64 * S, 0, 70 * S).stroke({ color: 0xffffff, width: 1, alpha: 0.95 });
  ten.circle(0, 70 * S, 3).fill(p.a);
  ten.circle(0, 70 * S, 1.4).fill(0xffffff);
  root.addChild(ten);
}

// =========================================================================
// BOSS 12 — Storm Sphere. Tesla orb with electric coils.
// =========================================================================
export function drawBoss12StormSphere(root: Container, S = 1): void {
  const p: Pal = { d: 0x081830, m: 0x153858, l: 0x4a8ec4, a: 0x88d6ff };
  const eng = 0xeaffff;
  softGlow(root, 0, 0, 60 * S, p.a, 14);

  const R = 38 * S;
  const g = new Graphics();
  // Sphere body
  g.circle(0, 0, R + 4).fill(p.d);
  g.circle(0, 0, R).fill(p.m);
  g.circle(-R * 0.3, -R * 0.3, R * 0.78).fill(p.l);
  g.circle(0, 0, R).stroke({ color: p.a, width: 2 });
  // Equator armor bands
  g.ellipse(0, 0, R * 0.95, R * 0.18).stroke({ color: p.d, width: 2, alpha: 0.7 });
  g.ellipse(0, 0, R * 0.7, R * 0.13).stroke({ color: p.d, width: 1.5, alpha: 0.5 });
  // Hex panels
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.circle(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 3 * S).fill({ color: p.d, alpha: 0.6 });
    g.circle(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 1.5 * S).fill(p.a);
  }
  root.addChild(g);

  // 8 tesla coils with capacitor banks
  const coil = new Graphics();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cx = Math.cos(a) * R;
    const cy = Math.sin(a) * R;
    const tx = Math.cos(a) * (R + 28 * S);
    const ty = Math.sin(a) * (R + 28 * S);
    // Pylon
    coil.moveTo(cx, cy).lineTo(tx, ty).stroke({ color: p.d, width: 6 });
    coil.moveTo(cx, cy).lineTo(tx, ty).stroke({ color: p.l, width: 2.5 });
    // Capacitor ring on coil
    coil.circle(cx + (tx - cx) * 0.5, cy + (ty - cy) * 0.5, 3 * S).fill(p.d);
    coil.circle(cx + (tx - cx) * 0.5, cy + (ty - cy) * 0.5, 2 * S).fill(p.l);
    // Globe tip
    bulb(coil, tx, ty, 7 * S, 7 * S, { d: p.d, m: p.m, l: p.l, a: eng }, { core: true });
  }
  root.addChild(coil);

  // Electric arcs between adjacent coils
  const arc = new Graphics();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const a2 = ((i + 1) / 8) * Math.PI * 2;
    const r = R + 28 * S;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    const ex = Math.cos(a2) * r;
    const ey = Math.sin(a2) * r;
    const midA = (a + a2) / 2;
    const mx = Math.cos(midA) * r * 1.08;
    const my = Math.sin(midA) * r * 1.08;
    arc.moveTo(sx, sy).lineTo(mx + 4, my - 2).lineTo(mx - 2, my + 4).lineTo(ex, ey).stroke({ color: eng, width: 1.4, alpha: 0.85 });
    arc.moveTo(sx, sy).lineTo(mx + 4, my - 2).lineTo(mx - 2, my + 4).lineTo(ex, ey).stroke({ color: 0xffffff, width: 0.6, alpha: 0.7 });
  }
  root.addChild(arc);

  // Core energy ball
  const core = new Graphics();
  core.circle(0, 0, 12 * S).fill(p.a);
  core.circle(0, 0, 8 * S).fill(eng);
  core.circle(0, 0, 4 * S).fill(0xffffff);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    core.moveTo(0, 0).lineTo(Math.cos(a) * 10 * S, Math.sin(a) * 10 * S).stroke({ color: 0xffffff, width: 0.8, alpha: 0.85 });
  }
  root.addChild(core);
}

// =========================================================================
// BOSS 13 — Blazing Citadel. Multi-tier burning fortress.
// =========================================================================
export function drawBoss13BlazingCitadel(root: Container, S = 1): void {
  const p: Pal = { d: 0x2a0a08, m: 0x5a1a18, l: 0x9c3a32, a: 0xff5044 };
  const fire = 0xff7733;
  const eng = 0xffaa44;
  softGlow(root, 0, 0, 36 * S, fire, 10);
  softGlow(root, -40 * S, 56 * S, 14 * S, eng, 7);
  softGlow(root, 40 * S, 56 * S, 14 * S, eng, 7);

  const g = new Graphics();
  // 3 tiers (bottom, mid, top)
  plate(g, mirrorPoly([0, 50 * S, 58 * S, 44 * S, 66 * S, 28 * S, 66 * S, 12 * S, 50 * S, 4 * S]), p);
  plate(g, mirrorPoly([0, 14 * S, 46 * S, 8 * S, 50 * S, -8 * S, 46 * S, -22 * S, 32 * S, -28 * S]), p);
  plate(g, mirrorPoly([0, -16 * S, 24 * S, -22 * S, 28 * S, -40 * S, 22 * S, -56 * S, 14 * S, -62 * S]), p);
  root.addChild(g);

  // Lava cracks (orange streams along tier seams)
  const lava = new Graphics();
  for (const [yT, w] of [[20 * S, 110 * S], [-6 * S, 90 * S], [-32 * S, 48 * S]] as Array<[number, number]>) {
    lava.rect(-w / 2, yT - 2 * S, w, 4 * S).fill(0x1a0a05);
    lava.rect(-w / 2, yT, w, 2 * S).fill(fire);
    lava.rect(-w / 2 + 4, yT + 0.5, w - 8, 1).fill(0xfff066);
  }
  root.addChild(lava);

  // Glowing windows along tiers
  const win = new Graphics();
  for (let i = 0; i < 9; i++) {
    win.rect(-46 * S + i * 12 * S, 30 * S, 4 * S, 6 * S).fill(0xffaa44);
    win.rect(-44 * S + i * 12 * S, 32 * S, 2 * S, 4 * S).fill(0xfff066);
  }
  for (let i = 0; i < 6; i++) {
    win.rect(-32 * S + i * 12 * S, 0, 4 * S, 5 * S).fill(0xffaa44);
    win.rect(-30 * S + i * 12 * S, 1.5, 2 * S, 3 * S).fill(0xfff066);
  }
  for (let i = 0; i < 3; i++) {
    win.rect(-14 * S + i * 12 * S, -34 * S, 4 * S, 5 * S).fill(0xffaa44);
    win.rect(-12 * S + i * 12 * S, -33 * S, 2 * S, 3 * S).fill(0xfff066);
  }
  root.addChild(win);

  // Turret cluster on bottom tier
  const cn = new Graphics();
  // Big bottom turrets (3)
  for (const tx of [-38 * S, 0, 38 * S]) {
    cn.circle(tx + 1, 22 * S + 2, 8 * S).fill({ color: 0x000000, alpha: 0.5 });
    cn.circle(tx, 22 * S, 8 * S).fill(p.d);
    cn.circle(tx, 22 * S, 7 * S).fill(p.m);
    cn.circle(tx - 2, 20 * S, 5 * S).fill(p.l);
    // Twin barrels
    cn.rect(tx - 5 * S, 8 * S, 3 * S, 14 * S).fill(p.d);
    cn.rect(tx + 2 * S, 8 * S, 3 * S, 14 * S).fill(p.d);
    cn.rect(tx - 4.5 * S, 8 * S, 2 * S, 3).fill(p.a);
    cn.rect(tx + 2.5 * S, 8 * S, 2 * S, 3).fill(p.a);
  }
  // Mid tier turrets
  eyeCannon(cn, -28 * S, -4 * S, 5 * S, p.a);
  eyeCannon(cn, 28 * S, -4 * S, 5 * S, p.a);
  // Top spike cannons
  cannon(cn, -10 * S, -60 * S, 16 * S, 4 * S, { d: p.d, m: 0x4a1a14, l: 0x7a3220, a: p.a });
  cannon(cn, 10 * S, -60 * S, 16 * S, 4 * S, { d: p.d, m: 0x4a1a14, l: 0x7a3220, a: p.a });
  // Central spire
  cn.poly([-4 * S, -62 * S, 0, -76 * S, 4 * S, -62 * S]).fill(p.a);
  cn.poly([-2 * S, -62 * S, 0, -72 * S, 2 * S, -62 * S]).fill(0xffffff);
  root.addChild(cn);

  // Flame jets at corners (animated-look)
  const flame = new Graphics();
  for (const sign of [-1, 1]) {
    flame.poly([sign * 60 * S, 44 * S, sign * 70 * S, 60 * S, sign * 58 * S, 56 * S, sign * 54 * S, 48 * S]).fill(fire);
    flame.poly([sign * 60 * S, 44 * S, sign * 70 * S, 60 * S, sign * 58 * S, 56 * S, sign * 54 * S, 48 * S]).stroke({ color: 0xfff066, width: 1, alpha: 0.85 });
    flame.poly([sign * 60 * S, 50 * S, sign * 65 * S, 64 * S, sign * 58 * S, 58 * S]).fill(0xfff066);
  }
  root.addChild(flame);

  // Engines
  const en = new Graphics();
  engineBell(en, -40 * S, 48 * S, 12 * S, 14 * S, eng, p.d);
  engineBell(en, 0, 52 * S, 14 * S, 14 * S, eng, p.d);
  engineBell(en, 40 * S, 48 * S, 12 * S, 14 * S, eng, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 14 — Gravity Lord. Concentric rings around singularity + platforms.
// =========================================================================
export function drawBoss14GravityLord(root: Container, S = 1): void {
  const p: Pal = { d: 0x100a1a, m: 0x2a1448, l: 0x5a2d8a, a: 0xc366ff };
  softGlow(root, 0, 0, 64 * S, p.a, 14);

  // Outer concentric rings
  const ring = new Graphics();
  ring.ellipse(0, 0, 88 * S, 18 * S).stroke({ color: p.a, width: 3, alpha: 0.85 });
  ring.ellipse(0, 0, 78 * S, 14 * S).stroke({ color: p.l, width: 2, alpha: 0.7 });
  ring.ellipse(0, 0, 66 * S, 66 * S).stroke({ color: p.a, width: 2, alpha: 0.55 });
  ring.ellipse(0, 0, 58 * S, 58 * S).stroke({ color: p.l, width: 1.5, alpha: 0.4 });
  root.addChild(ring);

  // 6 orbital weapon platforms
  const cn = new Graphics();
  const platformPos: Array<[number, number]> = [
    [-66, 0], [66, 0], [0, -44], [0, 44],
    [-46, -32], [46, 32],
  ];
  for (const [px, py] of platformPos) {
    const x = px * S, y = py * S;
    // Platform body
    plate(cn, [x - 12 * S, y - 7 * S, x + 12 * S, y - 7 * S, x + 12 * S, y + 7 * S, x - 12 * S, y + 7 * S], { d: p.d, m: p.m, l: p.l, a: p.a });
    // Turret on top
    bulb(cn, x, y, 5 * S, 5 * S, { d: p.d, m: p.m, l: p.l, a: p.a }, { core: true });
    // Side lights
    cn.circle(x - 9 * S, y + 4 * S, 1.4).fill(p.a);
    cn.circle(x + 9 * S, y + 4 * S, 1.4).fill(p.a);
  }
  root.addChild(cn);

  // Central singularity (event horizon)
  const core = new Graphics();
  core.circle(0, 0, 34 * S).fill(0x000000);
  core.circle(0, 0, 30 * S).stroke({ color: p.a, width: 2.5 });
  core.circle(0, 0, 24 * S).fill(0x2a0a40);
  core.circle(0, 0, 18 * S).fill(p.m);
  core.circle(0, 0, 12 * S).fill(p.a);
  core.circle(0, 0, 6 * S).fill(0xffffff);
  // Accretion swirls
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    core.ellipse(Math.cos(a) * 16 * S, Math.sin(a) * 16 * S, 7 * S, 2 * S).fill({ color: p.a, alpha: 0.75 });
    core.ellipse(Math.cos(a) * 16 * S, Math.sin(a) * 16 * S, 4 * S, 1 * S).fill({ color: 0xffffff, alpha: 0.85 });
  }
  root.addChild(core);

  // Distortion radial lines
  const dist = new Graphics();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r1 = 40 * S;
    const r2 = 90 * S + Math.sin(i * 1.3) * 6 * S;
    dist.moveTo(Math.cos(a) * r1, Math.sin(a) * r1).lineTo(Math.cos(a) * r2, Math.sin(a) * r2).stroke({ color: p.a, width: 1, alpha: 0.35 });
  }
  root.addChild(dist);
}

// =========================================================================
// BOSS 15 — Hive Mind. Brain-shape bio-ship with neural cables.
// =========================================================================
export function drawBoss15HiveMind(root: Container, S = 1): void {
  const p: Pal = { d: 0x082014, m: 0x1d4a2a, l: 0x4a8a4a, a: 0x99ff66 };
  const vein = 0xff7099;
  softGlow(root, 0, 0, 52 * S, p.a, 13);

  const g = new Graphics();
  // Two lobes
  bulb(g, -24 * S, -8 * S, 38 * S, 36 * S, p, { specular: true });
  bulb(g, 24 * S, -8 * S, 38 * S, 36 * S, p, { specular: true });
  // Lower stem
  bulb(g, 0, 20 * S, 50 * S, 22 * S, p, { specular: true });
  root.addChild(g);

  // Cortex folds (bezier wavy lines)
  const folds = new Graphics();
  const drawFolds = (cx: number, cy: number): void => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r1 = 12 * S;
      const r2 = 28 * S;
      folds.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      folds.bezierCurveTo(
        cx + Math.cos(a + 0.5) * r2, cy + Math.sin(a + 0.5) * r2,
        cx + Math.cos(a + 1.0) * r2, cy + Math.sin(a + 1.0) * r2,
        cx + Math.cos(a + 1.4) * r1, cy + Math.sin(a + 1.4) * r1,
      );
      folds.stroke({ color: p.d, width: 2, alpha: 0.7 });
    }
  };
  drawFolds(-24 * S, -8 * S);
  drawFolds(24 * S, -8 * S);
  root.addChild(folds);

  // Blood vessels (pink/red veins)
  const veins = new Graphics();
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const cx = (Math.random() - 0.5) * 60 * S;
    const cy = (Math.random() - 0.5) * 40 * S;
    const len = 15 * S + Math.random() * 25 * S;
    const ex = cx + Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len;
    veins.moveTo(cx, cy).bezierCurveTo(cx + 6, cy + 4, ex - 6, ey - 4, ex, ey).stroke({ color: vein, width: 1.4, alpha: 0.85 });
  }
  root.addChild(veins);

  // Central eye/nucleus
  const eye = new Graphics();
  eye.circle(0, 0, 16 * S).fill(0x000000);
  eye.circle(0, 0, 13 * S).fill(p.a);
  eye.circle(0, 0, 9 * S).fill(0xffffff);
  eye.circle(0, 0, 5 * S).fill(p.a);
  eye.circle(0, 0, 2.5 * S).fill(0xffffff);
  root.addChild(eye);

  // Spore launchers
  const cn = new Graphics();
  for (const [x, y] of [[-40 * S, -36 * S], [40 * S, -36 * S], [0, -42 * S]]) {
    cn.circle(x + 1, y + 1, 7 * S).fill({ color: 0x000000, alpha: 0.5 });
    cn.circle(x, y, 7 * S).fill(p.d);
    cn.circle(x, y, 6 * S).fill(p.m);
    cn.circle(x, y, 4 * S).fill(p.a);
    cn.circle(x, y, 2 * S).fill(0xffffff);
  }
  root.addChild(cn);

  // Trailing neural tendrils
  const ten = new Graphics();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const sx = Math.cos(a) * 38 * S;
    const sy = 20 * S + Math.sin(a) * 24 * S;
    const ex = sx * 1.7;
    const ey = sy + 18 * S;
    ten.moveTo(sx, sy).bezierCurveTo(sx + 4, sy + 8, ex - 4, ey - 8, ex, ey).stroke({ color: p.a, width: 1.5, alpha: 0.85 });
    ten.circle(ex, ey, 2.4).fill(p.a);
    ten.circle(ex, ey, 1).fill(0xffffff);
  }
  root.addChild(ten);
}

// =========================================================================
// BOSS 16 — Event Horizon. Ship being stretched into a vortex.
// =========================================================================
export function drawBoss16EventHorizon(root: Container, S = 1): void {
  const p: Pal = { d: 0x082040, m: 0x1a3458, l: 0x4a76ac, a: 0xffaa66 };
  const violet = 0xc366ff;
  softGlow(root, 0, 38 * S, 70 * S, p.a, 14);

  // Vortex behind the ship
  const vor = new Graphics();
  for (let i = 8; i >= 1; i--) {
    const r = i * 14 * S;
    vor.ellipse(0, 38 * S, r * 1.6, r * 0.55).stroke({ color: violet, width: 2, alpha: 0.12 + i * 0.07 });
  }
  vor.circle(0, 38 * S, 28 * S).fill(0x000000);
  vor.circle(0, 38 * S, 22 * S).fill(0x2a1040);
  vor.circle(0, 38 * S, 14 * S).fill(p.a);
  vor.circle(0, 38 * S, 7 * S).fill(0xffffff);
  root.addChild(vor);

  const g = new Graphics();
  // Front of ship (intact)
  const hull = mirrorPoly([0, -62 * S, 14 * S, -50 * S, 18 * S, -10 * S, 14 * S, 16 * S, 0, 28 * S]);
  plate(g, hull, p);
  // Stretched tail merging into vortex (alpha fade)
  g.poly([-12 * S, -10 * S, -6 * S, 30 * S, 6 * S, 30 * S, 12 * S, -10 * S]).fill({ color: p.m, alpha: 0.7 });
  g.poly([-8 * S, 20 * S, -4 * S, 40 * S, 4 * S, 40 * S, 8 * S, 20 * S]).fill({ color: p.m, alpha: 0.4 });
  // Stretched debris
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    g.rect(-3 * S + (Math.random() - 0.5) * 4, 24 * S + i * 4 * S, 1.5, 4).fill({ color: p.l, alpha: 0.8 - t * 0.6 });
  }
  root.addChild(g);

  // Spine slit (glowing)
  const sp = new Graphics();
  sp.rect(-2 * S, -56 * S, 4 * S, 60 * S).fill({ color: p.a, alpha: 0.7 });
  sp.rect(-1 * S, -58 * S, 2 * S, 62 * S).fill(0xffffff);
  // Damage cracks on the back where it's being torn
  sp.rect(-14 * S, 4 * S, 2 * S, 12 * S).fill({ color: violet, alpha: 0.7 });
  sp.rect(12 * S, 4 * S, 2 * S, 12 * S).fill({ color: violet, alpha: 0.7 });
  sp.rect(-10 * S, 8 * S, 2 * S, 8 * S).fill({ color: 0xffffff, alpha: 0.6 });
  sp.rect(8 * S, 8 * S, 2 * S, 8 * S).fill({ color: 0xffffff, alpha: 0.6 });
  root.addChild(sp);

  // Wings (with shrapnel peeling off)
  const wing = new Graphics();
  for (const sign of [-1, 1]) {
    wingFin(wing, [sign * 14 * S, -30 * S, sign * 40 * S, -16 * S, sign * 36 * S, -4 * S, sign * 12 * S, -22 * S], p, 0.9);
    // Peeled-off shrapnel
    wing.poly([sign * 36 * S, -4 * S, sign * 44 * S, 2 * S, sign * 40 * S, 8 * S, sign * 34 * S, 4 * S]).fill({ color: p.m, alpha: 0.6 });
  }
  root.addChild(wing);

  // Forward cannons (3)
  const cn = new Graphics();
  cannon(cn, -10 * S, -60 * S, 16 * S, 4 * S, { d: 0x0a1830, m: 0x2a3a5a, l: 0x4a6a8a, a: p.a });
  cannon(cn, 10 * S, -60 * S, 16 * S, 4 * S, { d: 0x0a1830, m: 0x2a3a5a, l: 0x4a6a8a, a: p.a });
  cannon(cn, 0, -66 * S, 22 * S, 5 * S, { d: 0x0a1830, m: 0x2a3a5a, l: 0x4a6a8a, a: p.a });
  // Wing-tip turrets
  eyeCannon(cn, -36 * S, -10 * S, 4 * S, p.a);
  eyeCannon(cn, 36 * S, -10 * S, 4 * S, p.a);
  root.addChild(cn);

  // Cockpit
  const cp = new Graphics();
  cp.ellipse(0, -36 * S, 6 * S, 4 * S).fill(p.a);
  cp.ellipse(0, -38 * S, 3 * S, 2 * S).fill(0xffffff);
  root.addChild(cp);
}

// =========================================================================
// BOSS 17 — Factory Core. Industrial cube with assembly arms + bays.
// =========================================================================
export function drawBoss17FactoryCore(root: Container, S = 1): void {
  const p: Pal = { d: 0x1a1108, m: 0x3a2a18, l: 0x6a4a28, a: 0xff7044 };
  const eng = 0xffaa44;
  softGlow(root, 0, 0, 36 * S, 0xff8855, 9);
  softGlow(root, -38 * S, 56 * S, 12 * S, eng, 7);
  softGlow(root, 38 * S, 56 * S, 12 * S, eng, 7);

  const g = new Graphics();
  // Cube body
  plate(g, [-46 * S, -50 * S, 46 * S, -50 * S, 46 * S, 42 * S, -46 * S, 42 * S], p);
  // Bevel highlight (3D-ish)
  g.poly([-46 * S, -50 * S, -34 * S, -38 * S, -34 * S, 30 * S, -46 * S, 42 * S]).fill({ color: p.l, alpha: 0.4 });
  g.poly([-46 * S, -50 * S, 46 * S, -50 * S, 34 * S, -38 * S, -34 * S, -38 * S]).fill({ color: p.l, alpha: 0.55 });
  // Hull rivets
  rivets(g, -42 * S, -34 * S, 42 * S, -34 * S, 13);
  rivets(g, -42 * S, 28 * S, 42 * S, 28 * S, 13);
  root.addChild(g);

  // Conveyor belts (3 visible bands)
  const belt = new Graphics();
  for (let i = 0; i < 3; i++) {
    const y = -22 * S + i * 22 * S;
    belt.rect(-40 * S, y, 80 * S, 8 * S).fill(p.d);
    for (let k = 0; k < 9; k++) {
      belt.rect(-38 * S + k * 9 * S, y + 1, 6 * S, 6 * S).fill(p.l);
      belt.circle(-35 * S + k * 9 * S, y + 4 * S, 0.8).fill(0xffffff);
    }
  }
  root.addChild(belt);

  // Glowing core
  const core = new Graphics();
  core.rect(-14 * S, -14 * S, 28 * S, 28 * S).fill(p.d);
  core.rect(-12 * S, -12 * S, 24 * S, 24 * S).fill({ color: 0xff5544, alpha: 0.9 });
  core.rect(-10 * S, -10 * S, 20 * S, 20 * S).fill({ color: 0xffaa44, alpha: 0.9 });
  core.rect(-8 * S, -8 * S, 16 * S, 16 * S).fill(0xfff066);
  core.rect(-4 * S, -4 * S, 8 * S, 8 * S).fill(0xffffff);
  // Heatwave lines
  for (let i = -2; i <= 2; i++) {
    core.rect(-14 * S, i * 4 * S, 28 * S, 0.6).fill({ color: 0x000000, alpha: 0.6 });
  }
  root.addChild(core);

  // Assembly arms (with partial ships in grippers)
  const arms = new Graphics();
  for (const [sx, sy, ex, ey] of [
    [-46, -30, -72, -18],
    [46, -30, 72, -18],
    [-46, 14, -70, 22],
    [46, 14, 70, 22],
  ] as Array<[number, number, number, number]>) {
    arms.moveTo(sx * S, sy * S).lineTo(ex * S, ey * S).stroke({ color: p.d, width: 6 * S });
    arms.moveTo(sx * S, sy * S).lineTo(ex * S, ey * S).stroke({ color: p.l, width: 2 * S });
    arms.circle(ex * S, ey * S, 4 * S).fill(p.d);
    arms.circle(ex * S, ey * S, 3 * S).fill(p.m);
    arms.circle(ex * S, ey * S, 1.5 * S).fill(p.a);
    // Partial ship in gripper (small triangle)
    arms.poly([ex * S - 3, ey * S + 4, ex * S + 3, ey * S + 4, ex * S, ey * S + 9]).fill(p.l);
  }
  root.addChild(arms);

  // Top output bays (smokestacks + glow)
  const bay = new Graphics();
  for (const x of [-30 * S, -6 * S, 18 * S]) {
    bay.rect(x, -56 * S, 12 * S, 12 * S).fill(p.d);
    bay.rect(x + 2, -54 * S, 8 * S, 8 * S).fill(0xfff066);
    bay.rect(x + 4, -52 * S, 4 * S, 4 * S).fill(0xffffff);
    // Smoke plume
    bay.ellipse(x + 6 * S, -60 * S, 6 * S, 3 * S).fill({ color: 0x4a4a44, alpha: 0.6 });
    bay.ellipse(x + 6 * S, -64 * S, 4 * S, 2 * S).fill({ color: 0x6a6a64, alpha: 0.5 });
  }
  // Factory logo stencil
  bay.rect(-8 * S, 32 * S, 16 * S, 3 * S).fill({ color: 0xfff066, alpha: 0.5 });
  bay.rect(-6 * S, 36 * S, 12 * S, 2 * S).fill({ color: 0xfff066, alpha: 0.5 });
  root.addChild(bay);

  // Corner turrets
  const cn = new Graphics();
  eyeCannon(cn, -40 * S, -42 * S, 4 * S, p.a);
  eyeCannon(cn, 40 * S, -42 * S, 4 * S, p.a);
  eyeCannon(cn, -40 * S, 36 * S, 4 * S, p.a);
  eyeCannon(cn, 40 * S, 36 * S, 4 * S, p.a);
  root.addChild(cn);

  // Engines
  const en = new Graphics();
  engineBell(en, -38 * S, 44 * S, 12 * S, 14 * S, eng, p.d);
  engineBell(en, 0, 46 * S, 14 * S, 14 * S, eng, p.d);
  engineBell(en, 38 * S, 44 * S, 12 * S, 14 * S, eng, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 18 — Imperial Flagship. Largest warship with gold trim.
// =========================================================================
export function drawBoss18ImperialFlagship(root: Container, S = 1): void {
  const p: Pal = { d: 0x100820, m: 0x232048, l: 0x4a4082, a: 0xff8833 };
  const gold: Pal = { d: 0x3a2a08, m: 0x6a5018, l: 0xc4a448, a: 0xffd166 };
  const eng = 0xffd166;
  for (let i = -2; i <= 2; i++) softGlow(root, i * 22 * S, 72 * S, 14 * S, eng, 8);

  const g = new Graphics();
  // Massive hull
  const hull = mirrorPoly([0, -80 * S, 12 * S, -68 * S, 22 * S, -50 * S, 38 * S, -28 * S, 60 * S, -4 * S, 78 * S, 22 * S, 82 * S, 50 * S, 64 * S, 64 * S]);
  plate(g, hull, p);
  // Gold trim bands
  for (const y of [-18, 8, 36]) {
    g.poly([-72 * S, y * S - 1.5, 72 * S, y * S - 1.5, 70 * S, y * S + 1.5, -70 * S, y * S + 1.5]).fill(gold.a);
    g.poly([-72 * S, y * S - 0.5, 72 * S, y * S - 0.5, 70 * S, y * S + 0.5, -70 * S, y * S + 0.5]).fill(0xffffff);
  }
  // Spine glow
  g.poly([-3 * S, -74 * S, 3 * S, -74 * S, 5 * S, 60 * S, -5 * S, 60 * S]).fill({ color: p.a, alpha: 0.5 });
  g.poly([-1 * S, -76 * S, 1 * S, -76 * S, 2 * S, 60 * S, -2 * S, 60 * S]).fill(0xffffff);
  rivets(g, -70 * S, -10 * S, 70 * S, -10 * S, 17);
  rivets(g, -75 * S, 22 * S, 75 * S, 22 * S, 17);
  rivets(g, -70 * S, 46 * S, 70 * S, 46 * S, 15);
  root.addChild(g);

  // Multi-deck command tower
  const tower = new Graphics();
  plate(tower, [-15 * S, -54 * S, -10 * S, -64 * S, 10 * S, -64 * S, 15 * S, -54 * S, 15 * S, -38 * S, -15 * S, -38 * S], { d: p.d, m: p.m, l: p.l, a: p.a });
  plate(tower, [-12 * S, -70 * S, -8 * S, -80 * S, 8 * S, -80 * S, 12 * S, -70 * S, 12 * S, -62 * S, -12 * S, -62 * S], { d: p.d, m: p.m, l: p.l, a: p.a });
  // Royal crown on top
  tower.poly([-8 * S, -84 * S, -6 * S, -88 * S, -2 * S, -84 * S, 0, -90 * S, 2 * S, -84 * S, 6 * S, -88 * S, 8 * S, -84 * S]).fill(gold.a);
  tower.poly([-8 * S, -84 * S, -6 * S, -88 * S, -2 * S, -84 * S, 0, -90 * S, 2 * S, -84 * S, 6 * S, -88 * S, 8 * S, -84 * S]).stroke({ color: gold.d, width: 0.8 });
  // Bridge windows
  tower.ellipse(0, -50 * S, 10 * S, 4 * S).fill(p.a);
  tower.ellipse(0, -52 * S, 6 * S, 2 * S).fill(0xffffff);
  tower.ellipse(0, -70 * S, 7 * S, 3 * S).fill(p.a);
  tower.ellipse(0, -71 * S, 4 * S, 1.5 * S).fill(0xffffff);
  // Side antennae
  antennaArr(tower, -8 * S, -64 * S, 10 * S, 0xff4040);
  antennaArr(tower, 8 * S, -64 * S, 10 * S, 0xff4040);
  root.addChild(tower);

  // 8 turrets in 4 pairs
  const cn = new Graphics();
  for (const [tx, ty] of [
    [-30, -34], [30, -34],
    [-44, -10], [44, -10],
    [-52, 18], [52, 18],
    [-28, 42], [28, 42],
  ] as Array<[number, number]>) {
    const x = tx * S, y = ty * S, r = 6.5 * S;
    cn.circle(x + 1, y + 2, r + 2).fill({ color: 0x000000, alpha: 0.5 });
    cn.circle(x, y, r + 2).fill(p.d);
    cn.circle(x, y, r + 2).stroke({ color: gold.a, width: 1.4 });
    cn.circle(x, y, r).fill(p.m);
    cn.circle(x - r * 0.3, y - r * 0.3, r * 0.7).fill(p.l);
    cn.rect(x - r * 0.6, y - r - 12 * S, r * 0.4, 12 * S).fill(p.d);
    cn.rect(x + r * 0.2, y - r - 12 * S, r * 0.4, 12 * S).fill(p.d);
    cn.rect(x - r * 0.55, y - r - 12 * S, r * 0.3, 3).fill(p.a);
    cn.rect(x + r * 0.25, y - r - 12 * S, r * 0.3, 3).fill(p.a);
    cn.circle(x, y, r * 0.3).fill(p.a);
  }
  // Massive spinal cannon
  cannon(cn, 0, -88 * S, 28 * S, 12 * S, { d: 0x10082a, m: 0x2a2058, l: 0x5a4a98, a: p.a });
  // Side missile pods
  for (const sign of [-1, 1]) {
    cn.rect(sign * 76 * S - 4 * S, -4 * S, 8 * S, 22 * S).fill(p.d);
    cn.rect(sign * 76 * S - 4 * S, -4 * S, 8 * S, 22 * S).stroke({ color: gold.a, width: 1 });
    for (let i = 0; i < 6; i++) {
      cn.circle(sign * 76 * S, 0 + i * 4 * S, 1.6).fill(p.a);
      cn.circle(sign * 76 * S, 0 + i * 4 * S, 0.6).fill(0xffffff);
    }
  }
  root.addChild(cn);

  // Hangar bay (mid-belly)
  const bay = new Graphics();
  bay.rect(-20 * S, 42 * S, 40 * S, 14 * S).fill(0x000000);
  bay.rect(-18 * S, 44 * S, 36 * S, 10 * S).fill(p.a);
  bay.rect(-14 * S, 46 * S, 28 * S, 5 * S).fill(0xffffff);
  bay.rect(-18 * S, 53 * S, 36 * S, 1 * S).fill(gold.a);
  root.addChild(bay);

  // Imperial insignia (gold star)
  const ins = new Graphics();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 6 * S : 3 * S;
    ins.lineTo(Math.cos(a) * r, 22 * S + Math.sin(a) * r);
  }
  ins.fill({ color: gold.a, alpha: 0.85 });
  ins.circle(0, 22 * S, 2 * S).fill(0xffffff);
  root.addChild(ins);

  // Lights
  const lt = new Graphics();
  for (const [x, y, c] of [[-58, -24, p.a], [58, -24, p.a], [-66, 2, gold.a], [66, 2, gold.a], [-68, 26, p.a], [68, 26, p.a], [-58, 48, gold.a], [58, 48, gold.a]] as Array<[number, number, number]>) {
    lightDot(lt, x * S, y * S, 1.6, c);
  }
  root.addChild(lt);

  // 5 engines
  const en = new Graphics();
  for (let i = -2; i <= 2; i++) engineBell(en, i * 22 * S, 58 * S, 14 * S, 16 * S, eng, p.d);
  root.addChild(en);
}

// =========================================================================
// BOSS 19 — Citadel Guardian. Bat-demon w/ eye-cannon barrel-wings.
// Inspired by image 3.
// =========================================================================
export function drawBoss19CitadelGuardian(root: Container, S = 1): void {
  const p: Pal = { d: 0x180a14, m: 0x3a2a3a, l: 0x7a5a7a, a: 0xff5544 };
  const gold: Pal = { d: 0x3a2a08, m: 0x6a5018, l: 0xc4a448, a: 0xffd166 };
  softGlow(root, 0, 0, 48 * S, 0xff5544, 12);

  // Membrane wings (torn, asymmetric tatters)
  const wings = new Graphics();
  for (const sign of [-1, 1]) {
    // Outer torn wing
    wings.poly([
      sign * 18 * S, 18 * S,
      sign * 36 * S, 38 * S,
      sign * 48 * S, 60 * S,
      sign * 32 * S, 80 * S,
      sign * 22 * S, 78 * S,
      sign * 30 * S, 62 * S,
      sign * 24 * S, 50 * S,
      sign * 20 * S, 60 * S,
      sign * 14 * S, 56 * S,
      sign * 18 * S, 40 * S,
      sign * 14 * S, 28 * S,
    ]).fill({ color: 0xa68a5a, alpha: 0.9 });
    wings.poly([
      sign * 18 * S, 18 * S,
      sign * 36 * S, 38 * S,
      sign * 48 * S, 60 * S,
      sign * 32 * S, 80 * S,
      sign * 22 * S, 78 * S,
      sign * 30 * S, 62 * S,
      sign * 24 * S, 50 * S,
      sign * 20 * S, 60 * S,
      sign * 14 * S, 56 * S,
      sign * 18 * S, 40 * S,
      sign * 14 * S, 28 * S,
    ]).stroke({ color: 0x4a3a1a, width: 1.5 });
    // Veins
    for (let i = 0; i < 4; i++) {
      wings.moveTo(sign * 14 * S, 28 * S).lineTo(sign * (30 + i * 3) * S, (40 + i * 12) * S).stroke({ color: 0xff5544, width: 0.8, alpha: 0.55 });
    }
    // Tatter holes
    wings.ellipse(sign * 32 * S, 56 * S, 4 * S, 3 * S).fill(0x000000);
    wings.ellipse(sign * 26 * S, 70 * S, 3 * S, 2 * S).fill(0x000000);
  }
  root.addChild(wings);

  // The two big "wing-barrel arms" with eye cannons (defining feature)
  const arm = new Graphics();
  for (const sign of [-1, 1]) {
    // Curved arm shape
    const armShape = [
      sign * 18 * S, -34 * S,
      sign * 36 * S, -54 * S,
      sign * 46 * S, -70 * S,
      sign * 44 * S, -86 * S,
      sign * 30 * S, -90 * S,
      sign * 22 * S, -78 * S,
      sign * 24 * S, -56 * S,
      sign * 14 * S, -32 * S,
    ];
    plate(arm, armShape, { d: 0x2a2030, m: 0x5a4a5a, l: 0x9a8a9a, a: gold.a });
  }
  root.addChild(arm);

  // 4 eye-cannons on each arm (8 total)
  const ec = new Graphics();
  for (const sign of [-1, 1]) {
    const positions: Array<[number, number]> = [
      [30, -78], [38, -64], [42, -50], [36, -36],
    ];
    for (const [px, py] of positions) {
      eyeCannon(ec, sign * px * S, py * S, 5.5 * S, p.a);
    }
  }
  root.addChild(ec);

  // Bone-like joints connecting arms to body
  const joint = new Graphics();
  for (const sign of [-1, 1]) {
    joint.ellipse(sign * 16 * S, -28 * S, 7 * S, 5 * S).fill(0xa68a5a);
    joint.ellipse(sign * 16 * S, -28 * S, 7 * S, 5 * S).stroke({ color: 0x4a3a1a, width: 1.2 });
    joint.ellipse(sign * 16 * S, -28 * S, 4 * S, 3 * S).fill(0xd6b870);
    joint.circle(sign * 16 * S, -28 * S, 1.5).fill(0x4a3a1a);
  }
  root.addChild(joint);

  // Central body
  const g = new Graphics();
  plate(g, mirrorPoly([0, -30 * S, 18 * S, -22 * S, 22 * S, 0, 24 * S, 22 * S, 16 * S, 38 * S]), { d: p.d, m: 0x4a3a4a, l: 0x8a7a8a, a: p.a });
  // Spine
  g.poly([-2 * S, -28 * S, 2 * S, -28 * S, 3 * S, 36 * S, -3 * S, 36 * S]).fill({ color: gold.a, alpha: 0.55 });
  root.addChild(g);

  // Central big eye-cannon
  const eye = new Graphics();
  eyeCannon(eye, 0, -8 * S, 10 * S, p.a);
  // Surrounding smaller eyes
  eyeCannon(eye, -12 * S, 14 * S, 4 * S, p.a);
  eyeCannon(eye, 12 * S, 14 * S, 4 * S, p.a);
  eyeCannon(eye, 0, 28 * S, 5 * S, p.a);
  root.addChild(eye);

  // Skull-like brow ridge above central eye
  const brow = new Graphics();
  brow.poly([-12 * S, -22 * S, -8 * S, -28 * S, 0, -26 * S, 8 * S, -28 * S, 12 * S, -22 * S, 8 * S, -18 * S, 0, -20 * S, -8 * S, -18 * S]).fill(0xa68a5a);
  brow.poly([-12 * S, -22 * S, -8 * S, -28 * S, 0, -26 * S, 8 * S, -28 * S, 12 * S, -22 * S, 8 * S, -18 * S, 0, -20 * S, -8 * S, -18 * S]).stroke({ color: 0x4a3a1a, width: 1.2 });
  brow.poly([-12 * S, -22 * S, -8 * S, -28 * S, 0, -26 * S, 8 * S, -28 * S, 12 * S, -22 * S]).fill({ color: 0xd6b870, alpha: 0.85 });
  root.addChild(brow);

  // Lower mini-cannons under body
  const cn = new Graphics();
  for (const x of [-10 * S, -3 * S, 3 * S, 10 * S]) {
    cn.rect(x - 1 * S, 36 * S, 2 * S, 6 * S).fill(0x2a2030);
    cn.circle(x, 42 * S, 1.4).fill(p.a);
    cn.circle(x, 42 * S, 0.5).fill(0xffffff);
  }
  root.addChild(cn);

  // Spider-like underbelly legs
  const legs = new Graphics();
  for (const sign of [-1, 1]) {
    legs.moveTo(sign * 8 * S, 36 * S).lineTo(sign * 14 * S, 50 * S).lineTo(sign * 8 * S, 60 * S).stroke({ color: 0x2a2030, width: 3 });
    legs.circle(sign * 14 * S, 50 * S, 2).fill(p.a);
  }
  root.addChild(legs);
}

// =========================================================================
// BOSS 20 — The Architect. Crystalline ornate finale.
// =========================================================================
export function drawBoss20Architect(root: Container, S = 1): void {
  const p: Pal = { d: 0x14082a, m: 0x2a1448, l: 0x5a2d8a, a: 0xfff066 };
  const violet = 0xc466ff;
  softGlow(root, 0, 0, 80 * S, p.a, 16);

  // Outer triangular crystal
  const g = new Graphics();
  const outer = [0, -88 * S, 84 * S, 60 * S, -84 * S, 60 * S];
  plate(g, outer, p, { hi: 0 });
  // Inner triangle
  const mid = [0, -56 * S, 52 * S, 32 * S, -52 * S, 32 * S];
  plate(g, mid, { d: p.d, m: 0x3a2068, l: 0x6e3aaa, a: p.a });
  // Innermost triangle
  const inner = [0, -28 * S, 24 * S, 14 * S, -24 * S, 14 * S];
  plate(g, inner, { d: p.d, m: 0x5a3a98, l: 0x9a76d6, a: p.a });
  root.addChild(g);

  // Multi-layer crystal facets at vertices
  const facets = new Graphics();
  // Top vertex crystal
  gemCrystal(facets, 0, -78 * S, 14 * S, p.a);
  gemCrystal(facets, 0, -78 * S, 7 * S, violet);
  // Bottom-left vertex
  gemCrystal(facets, -70 * S, 56 * S, 12 * S, p.a);
  gemCrystal(facets, -70 * S, 56 * S, 6 * S, violet);
  // Bottom-right vertex
  gemCrystal(facets, 70 * S, 56 * S, 12 * S, p.a);
  gemCrystal(facets, 70 * S, 56 * S, 6 * S, violet);
  root.addChild(facets);

  // Sub-crystals along the edges (growth points)
  const subs = new Graphics();
  for (const sign of [-1, 1]) {
    gemCrystal(subs, sign * 42 * S, -24 * S, 6 * S, p.a);
    gemCrystal(subs, sign * 64 * S, 18 * S, 6 * S, p.a);
  }
  // Bottom-edge sub-crystals
  for (let i = -2; i <= 2; i++) {
    gemCrystal(subs, i * 22 * S, 50 * S, 5 * S, p.a);
  }
  root.addChild(subs);

  // Central portal-eye
  const eye = new Graphics();
  eye.circle(0, -4 * S, 22 * S).fill(0x000000);
  eye.circle(0, -4 * S, 22 * S).stroke({ color: p.a, width: 3 });
  eye.circle(0, -4 * S, 18 * S).fill({ color: violet, alpha: 0.9 });
  eye.circle(0, -4 * S, 13 * S).fill(p.a);
  eye.circle(0, -4 * S, 8 * S).fill(0xffffff);
  eye.circle(0, -4 * S, 4 * S).fill(p.a);
  // Iris glyph
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    eye.circle(Math.cos(a) * 16 * S, -4 * S + Math.sin(a) * 16 * S, 1.4).fill(0x000000);
  }
  root.addChild(eye);

  // Floating rune glyphs orbiting the construct
  const runes = new Graphics();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 96 * S;
    runeGlyph(runes, Math.cos(a) * r, Math.sin(a) * r * 0.85, 4 * S, p.a);
  }
  root.addChild(runes);

  // Edge cannons (multi-cannon)
  const cn = new Graphics();
  // Left edge — 3 cannons
  for (let i = 0; i < 3; i++) {
    const lx = -42 * S - i * 14 * S;
    const ly = -24 * S + i * 18 * S;
    eyeCannon(cn, lx, ly, 4 * S, p.a);
  }
  // Right edge — 3 cannons
  for (let i = 0; i < 3; i++) {
    const lx = 42 * S + i * 14 * S;
    const ly = -24 * S + i * 18 * S;
    eyeCannon(cn, lx, ly, 4 * S, p.a);
  }
  // Bottom edge — 5 big cannons
  for (let i = -2; i <= 2; i++) {
    const lx = i * 28 * S;
    const ly = 44 * S;
    cn.circle(lx + 1, ly + 2, 7 * S).fill({ color: 0x000000, alpha: 0.5 });
    cn.circle(lx, ly, 7 * S).fill(p.d);
    cn.circle(lx, ly, 6 * S).fill(p.m);
    cn.circle(lx, ly, 4 * S).fill(p.a);
    cn.circle(lx, ly, 2 * S).fill(0xffffff);
    cn.rect(lx - 2 * S, ly - 14 * S, 4 * S, 8 * S).fill(p.d);
    cn.rect(lx - 1 * S, ly - 14 * S, 2 * S, 2).fill(p.a);
  }
  // Apex super-cannon
  cn.rect(-8 * S, -94 * S, 16 * S, 24 * S).fill(p.d);
  cn.rect(-6 * S, -96 * S, 12 * S, 26 * S).fill(p.m);
  cn.rect(-4 * S, -96 * S, 8 * S, 26 * S).fill(p.l);
  cn.rect(-9 * S, -86 * S, 18 * S, 2 * S).fill(p.d);
  cn.rect(-9 * S, -78 * S, 18 * S, 2 * S).fill(p.d);
  cn.circle(0, -94 * S, 4 * S).fill(p.a);
  cn.circle(0, -94 * S, 2 * S).fill(0xffffff);
  root.addChild(cn);
}

// ---- registry -----------------------------------------------------------
export const BOSS_DRAWERS = [
  drawBoss01PatrolCruiser,
  drawBoss02AsteroidHauler,
  drawBoss03CyberCrab,
  drawBoss04LunarSentinel,
  drawBoss05HiveCarrier,
  drawBoss06WreckBehemoth,
  drawBoss07MineMother,
  drawBoss08GhostSniper,
  drawBoss09KamikazeQueen,
  drawBoss10SaturnDreadnought,
  drawBoss11Phantom,
  drawBoss12StormSphere,
  drawBoss13BlazingCitadel,
  drawBoss14GravityLord,
  drawBoss15HiveMind,
  drawBoss16EventHorizon,
  drawBoss17FactoryCore,
  drawBoss18ImperialFlagship,
  drawBoss19CitadelGuardian,
  drawBoss20Architect,
];
