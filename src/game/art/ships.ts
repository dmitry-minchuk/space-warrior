import { Container, Graphics } from 'pixi.js';
import { COL } from '../palette';
import { softGlow } from './forge';

// All ships drawn in local coordinates with (0,0) at centre, nose pointing UP (-Y).
// Bake into textures via Forge.bakeCentered(width, height, drawX).

// --- helpers ---------------------------------------------------------------
function mirroredPoly(half: number[]): number[] {
  const left: number[] = [];
  for (let i = half.length - 2; i >= 0; i -= 2) {
    left.push(-half[i], half[i + 1]);
  }
  return [...half, ...left];
}

function panel(g: Graphics, pts: number[], color: number, alpha = 0.7): void {
  g.poly(pts).fill({ color, alpha });
}

function line(g: Graphics, ax: number, ay: number, bx: number, by: number, color: number, width = 1, alpha = 0.6): void {
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ color, width, alpha });
}

function lightDot(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.circle(x, y, r).fill(color);
  g.circle(x, y, r * 0.5).fill(0xffffff);
}

// --- player ---------------------------------------------------------------
export function drawPlayer(root: Container): void {
  const c = COL.player;
  // Layered halo — broad emissive bloom that makes the hull pop against dark
  softGlow(root, 0, 0, 30, c.emissive, 9);
  softGlow(root, 0, -8, 16, c.accent, 7);
  softGlow(root, -10, 28, 16, c.engineGlow, 7);
  softGlow(root, 10, 28, 16, c.engineGlow, 7);
  softGlow(root, 0, -30, 8, c.cockpitGlow, 5);

  // Drop-shadow base of the silhouette — gives the ship a sense of weight
  const shadow = new Graphics();
  const fusePoints = mirroredPoly([
    0, -34, 4, -24, 6, -10, 8, 6, 6, 20, 4, 26,
  ]);
  const wingsPoints = [
    -2, -8, 2, -8, 30, 18, 24, 22, 8, 14, -8, 14, -24, 22, -30, 18,
  ];
  shadow.poly(fusePoints).fill({ color: 0x000000, alpha: 0.55 });
  shadow.poly(wingsPoints).fill({ color: 0x000000, alpha: 0.55 });
  shadow.pivot.set(0, 0);
  shadow.position.set(1.5, 2);
  root.addChild(shadow);

  // Main hull — slightly darker base so highlights read brighter
  const hull = new Graphics();
  hull.poly(fusePoints).fill(c.hullDark);
  hull.poly(wingsPoints).fill(c.hullDark);
  root.addChild(hull);

  // Mid-tone hull fill on top of dark base (creates a clear shadow rim)
  const mid = new Graphics();
  mid.poly(mirroredPoly([0, -32, 3.4, -23, 5.2, -10, 7, 5, 5, 19, 3.4, 24])).fill(c.hull);
  mid.poly([-1.2, -7, 1.2, -7, 28, 17.4, 22.5, 21, 8, 13.2, -8, 13.2, -22.5, 21, -28, 17.4]).fill(c.hull);
  root.addChild(mid);

  // Bright dorsal highlight strip
  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -28, 2.2, -22, 3, -8, 3, 4, 2.2, 18, 1.6, 22]), c.hullLight, 0.95);
  panel(hi, [-1, -2, 1, -2, 22, 18, 19, 20, -19, 20, -22, 18], c.hullLight, 0.55);
  // Sub-highlight on the very crest
  panel(hi, mirroredPoly([0, -26, 1.2, -20, 1.4, -6, 1.4, 2, 1.2, 16, 0.8, 20]), 0xc8efff, 0.7);
  root.addChild(hi);

  // Wing leading-edge energy strips — vivid cyan glow
  const lead = new Graphics();
  lead.poly([-2, -6, -2, -10, -22, 16, -20, 18]).fill({ color: c.emissive, alpha: 0.95 });
  lead.poly([2, -6, 2, -10, 22, 16, 20, 18]).fill({ color: c.emissive, alpha: 0.95 });
  lead.poly([-2, -8, -22, 17, -20, 18]).stroke({ color: 0xffffff, width: 0.6, alpha: 0.9 });
  lead.poly([2, -8, 22, 17, 20, 18]).stroke({ color: 0xffffff, width: 0.6, alpha: 0.9 });
  // Tiny energy nodes along the strip
  for (let i = 0; i < 3; i++) {
    const tx = -4 - i * 6;
    const ty = -2 + i * 5;
    lead.circle(tx, ty, 0.9).fill(0xffffff);
    lead.circle(-tx, ty, 0.9).fill(0xffffff);
  }
  root.addChild(lead);

  // Edge stroke — accent rim, brighter than before
  const edge = new Graphics();
  edge.poly(fusePoints).stroke({ color: c.accent, width: 1.4, alpha: 1 });
  edge.poly(wingsPoints).stroke({ color: c.accent, width: 1.1, alpha: 0.85 });
  root.addChild(edge);

  // Panel detail — riveted seams
  const det = new Graphics();
  line(det, -3, -20, 3, -20, c.hullDark, 1, 0.85);
  line(det, -4, -6, 4, -6, c.hullDark, 1, 0.85);
  line(det, -5, 8, 5, 8, c.hullDark, 1, 0.85);
  line(det, -16, 18, -6, 14, c.hullDark, 1, 0.7);
  line(det, 6, 14, 16, 18, c.hullDark, 1, 0.7);
  // Rivets
  for (let i = -1; i <= 1; i++) {
    det.circle(i * 2.5, -20, 0.45).fill(c.accent);
    det.circle(i * 2.5, -6, 0.45).fill(c.accent);
    det.circle(i * 2.5, 8, 0.45).fill(c.accent);
  }
  root.addChild(det);

  // Forward chevron decal — squadron insignia
  const chev = new Graphics();
  chev.poly([0, -18, 3.5, -10, 0, -13, -3.5, -10]).fill({ color: c.emissive, alpha: 0.9 });
  chev.poly([0, -16, 2.2, -11, 0, -12.5, -2.2, -11]).fill(0xffffff);
  root.addChild(chev);

  // Cockpit — multi-layer canopy
  const cp = new Graphics();
  // Frame
  cp.ellipse(0, -12, 5, 8).fill(0x081428);
  // Window
  cp.ellipse(0, -12, 4.2, 7.2).fill(c.cockpit);
  cp.ellipse(0, -13, 3, 5).fill(c.cockpitGlow);
  // Glints
  cp.ellipse(-1.2, -15, 1.4, 2.6).fill(0xffffff);
  cp.ellipse(1.2, -10, 0.7, 1.4).fill({ color: 0xffffff, alpha: 0.7 });
  // Frame rim
  cp.ellipse(0, -12, 5, 8).stroke({ color: c.accent, width: 0.7, alpha: 0.9 });
  root.addChild(cp);

  // Forward chin guns — twin barrels (visible weapon hardpoints)
  const guns = new Graphics();
  guns.rect(-4.5, -30, 2, 6).fill(c.hullDark);
  guns.rect(2.5, -30, 2, 6).fill(c.hullDark);
  guns.rect(-4, -32, 1.4, 2).fill(c.accent);
  guns.rect(2.6, -32, 1.4, 2).fill(c.accent);
  guns.circle(-3.3, -32, 0.6).fill(0xffffff);
  guns.circle(3.3, -32, 0.6).fill(0xffffff);
  root.addChild(guns);

  // Wing-tip nav lights — brighter, with halo
  const lights = new Graphics();
  // Left (red)
  lights.circle(-29, 17, 4).fill({ color: 0xff4444, alpha: 0.35 });
  lights.circle(-29, 17, 2.3).fill(0xff4444);
  lights.circle(-29, 17, 1.1).fill(0xffffff);
  // Right (green)
  lights.circle(29, 17, 4).fill({ color: 0x44ff44, alpha: 0.35 });
  lights.circle(29, 17, 2.3).fill(0x44ff44);
  lights.circle(29, 17, 1.1).fill(0xffffff);
  // Aft accent strobes
  lights.circle(-12, 22, 1.2).fill(c.emissive);
  lights.circle(12, 22, 1.2).fill(c.emissive);
  root.addChild(lights);

  // Engine nozzles — clearly defined ringed exhausts (live flame is drawn on top by Player)
  const eng = new Graphics();
  // Mounting collar
  eng.rect(-14, 21, 8, 3).fill(c.hullDark);
  eng.rect(6, 21, 8, 3).fill(c.hullDark);
  // Nozzle outer (dark metal)
  eng.rect(-13, 22, 6, 9).fill(0x0a1a2c);
  eng.rect(7, 22, 6, 9).fill(0x0a1a2c);
  eng.rect(-13, 22, 6, 9).stroke({ color: c.accent, width: 0.8, alpha: 0.9 });
  eng.rect(7, 22, 6, 9).stroke({ color: c.accent, width: 0.8, alpha: 0.9 });
  // Hot inner ring
  eng.rect(-12, 23.5, 4, 6).fill(c.engineGlow);
  eng.rect(8, 23.5, 4, 6).fill(c.engineGlow);
  // White-hot core
  eng.rect(-11.5, 25, 3, 4).fill(c.engineCore);
  eng.rect(8.5, 25, 3, 4).fill(c.engineCore);
  // Inner glow halo
  eng.circle(-10, 28, 1.6).fill(0xffffff);
  eng.circle(10, 28, 1.6).fill(0xffffff);
  root.addChild(eng);
}

// --- 1: scout -------------------------------------------------------------
export function drawScout(root: Container): void {
  const c = COL.scout;
  softGlow(root, 0, 16, 8, c.engine, 5);

  const hull = new Graphics();
  // Slim recon triangular silhouette
  const pts = mirroredPoly([0, -26, 4, -16, 8, -2, 14, 10, 8, 16]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -22, 3, -14, 6, -2, 8, 8, 4, 12]), c.light, 0.85);
  root.addChild(hi);

  // Sensor pod ahead of cockpit
  const sens = new Graphics();
  sens.circle(0, -22, 2).fill(c.accent);
  sens.circle(0, -22, 1).fill(0xffffff);
  root.addChild(sens);

  // Side intake fins (small)
  const fins = new Graphics();
  fins.poly([-7, 0, -13, 6, -10, 10, -6, 6]).fill(c.dark);
  fins.poly([7, 0, 13, 6, 10, 10, 6, 6]).fill(c.dark);
  root.addChild(fins);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1, alpha: 0.85 });
  root.addChild(edge);

  // Panel lines
  const det = new Graphics();
  line(det, -3, -12, 3, -12, c.dark, 1, 0.8);
  line(det, -4, 2, 4, 2, c.dark, 1, 0.7);
  // Identification stripe
  det.rect(-1, -16, 2, 14).fill({ color: c.accent, alpha: 0.6 });
  root.addChild(det);

  const cp = new Graphics();
  cp.ellipse(0, -6, 2.5, 4).fill(c.accent);
  cp.ellipse(0, -7, 1, 1.5).fill(0xffffff);
  root.addChild(cp);

  // Wing-tip nav lights
  const lt = new Graphics();
  lightDot(lt, -13, 8, 1.2, 0xff4040);
  lightDot(lt, 13, 8, 1.2, 0x40ff40);
  root.addChild(lt);

  const eng = new Graphics();
  eng.rect(-3, 12, 6, 4).fill(c.engine);
  eng.rect(-2, 13, 4, 2).fill(0xffffff);
  root.addChild(eng);
}

// --- 2: fighter -----------------------------------------------------------
export function drawFighter(root: Container): void {
  const c = COL.fighter;
  softGlow(root, -6, 18, 9, c.engine, 5);
  softGlow(root, 6, 18, 9, c.engine, 5);

  const hull = new Graphics();
  // Aggressive X-wing
  const pts = mirroredPoly([0, -28, 5, -18, 18, -2, 24, 12, 16, 18, 8, 22, 5, 24]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -24, 4, -16, 14, -2, 18, 10, 12, 16, 7, 20, 4, 22]), c.light, 0.85);
  // Diagonal red stripes along wings
  panel(hi, [-22, 6, -20, 4, -10, 12, -12, 14], c.accent, 0.85);
  panel(hi, [22, 6, 20, 4, 10, 12, 12, 14], c.accent, 0.85);
  root.addChild(hi);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.2, alpha: 0.85 });
  root.addChild(edge);

  // Twin forward cannons
  const cn = new Graphics();
  cn.rect(-14, -2, 4, 12).fill(c.dark);
  cn.rect(10, -2, 4, 12).fill(c.dark);
  cn.circle(-12, -2, 2.2).fill(c.accent);
  cn.circle(12, -2, 2.2).fill(c.accent);
  cn.circle(-12, -2, 1).fill(0xffffff);
  cn.circle(12, -2, 1).fill(0xffffff);
  // Under-wing missile rails
  cn.rect(-18, 6, 6, 3).fill(c.dark);
  cn.rect(12, 6, 6, 3).fill(c.dark);
  cn.circle(-18, 7.5, 1).fill(c.accent);
  cn.circle(18, 7.5, 1).fill(c.accent);
  root.addChild(cn);

  // Cockpit
  const cp = new Graphics();
  cp.ellipse(0, -10, 4, 6).fill(0x000000);
  cp.ellipse(0, -10, 3.5, 5).fill(c.accent);
  cp.ellipse(0, -12, 1.5, 2).fill(0xffffff);
  root.addChild(cp);

  // Panel lines
  const det = new Graphics();
  line(det, -6, 8, 6, 8, c.dark, 1, 0.7);
  line(det, -8, -4, 8, -4, c.dark, 1, 0.7);
  root.addChild(det);

  // Nav lights
  const lt = new Graphics();
  lightDot(lt, -23, 11, 1.2, 0xff4040);
  lightDot(lt, 23, 11, 1.2, 0x40ff40);
  root.addChild(lt);

  // Engines
  const eng = new Graphics();
  eng.rect(-9, 14, 6, 8).fill(c.engine);
  eng.rect(3, 14, 6, 8).fill(c.engine);
  eng.rect(-8, 15, 4, 4).fill(0xffffff);
  eng.rect(4, 15, 4, 4).fill(0xffffff);
  root.addChild(eng);
}

// --- 3: bomber ------------------------------------------------------------
export function drawBomber(root: Container): void {
  const c = COL.bomber;
  softGlow(root, -16, 24, 8, c.engine, 5);
  softGlow(root, -6, 26, 9, c.engine, 5);
  softGlow(root, 6, 26, 9, c.engine, 5);
  softGlow(root, 16, 24, 8, c.engine, 5);

  const hull = new Graphics();
  const pts = mirroredPoly([0, -30, 8, -24, 18, -12, 28, 4, 30, 14, 22, 24]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -24, 6, -20, 14, -10, 22, 4, 22, 12, 18, 20]), c.light, 0.78);
  // Top stripes
  panel(hi, [-14, -8, 14, -8, 16, -4, -16, -4], c.accent, 0.5);
  root.addChild(hi);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.2, alpha: 0.7 });
  root.addChild(edge);

  // Bomb bay with visible munitions
  const bay = new Graphics();
  bay.rect(-14, 4, 28, 10).fill(0x000000);
  bay.rect(-13, 5, 26, 8).fill(c.dark);
  // 4 bombs in bay
  for (let i = 0; i < 4; i++) {
    bay.circle(-10 + i * 6, 9, 2.5).fill(0xff9933);
    bay.circle(-10 + i * 6, 9, 1.5).fill(0xffd166);
  }
  root.addChild(bay);

  // Antennae (sensors)
  const ant = new Graphics();
  line(ant, -8, -18, -8, -28, c.light, 1.4, 0.85);
  line(ant, 8, -18, 8, -28, c.light, 1.4, 0.85);
  ant.circle(-8, -28, 1.4).fill(c.accent);
  ant.circle(8, -28, 1.4).fill(c.accent);
  root.addChild(ant);

  // Cockpit
  const cp = new Graphics();
  cp.ellipse(0, -16, 7, 4).fill(0x000000);
  cp.ellipse(0, -16, 6, 3.4).fill(c.accent);
  cp.ellipse(0, -17, 3, 1.5).fill(0xffffff);
  root.addChild(cp);

  // Side turrets
  const cn = new Graphics();
  cn.circle(-24, 0, 3.5).fill(c.dark);
  cn.circle(-24, 0, 2.5).fill(c.accent);
  cn.circle(24, 0, 3.5).fill(c.dark);
  cn.circle(24, 0, 2.5).fill(c.accent);
  root.addChild(cn);

  // Hull lights
  const lt = new Graphics();
  lightDot(lt, -22, 16, 1.2, 0xff4040);
  lightDot(lt, 22, 16, 1.2, 0x40ff40);
  lightDot(lt, -10, -12, 1, c.accent);
  lightDot(lt, 10, -12, 1, c.accent);
  root.addChild(lt);

  const eng = new Graphics();
  eng.rect(-19, 20, 6, 6).fill(c.engine);
  eng.rect(-9, 22, 6, 6).fill(c.engine);
  eng.rect(3, 22, 6, 6).fill(c.engine);
  eng.rect(13, 20, 6, 6).fill(c.engine);
  root.addChild(eng);
}

// --- 4: interceptor -------------------------------------------------------
export function drawInterceptor(root: Container): void {
  const c = COL.interceptor;
  softGlow(root, 0, 24, 13, c.engine, 6);

  const hull = new Graphics();
  // Sleek arrowhead with very swept wings
  const pts = mirroredPoly([0, -32, 3, -24, 5, -10, 14, 6, 18, 18, 12, 24, 6, 26]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -28, 2, -22, 3, -10, 10, 4, 12, 14, 8, 20, 4, 22]), c.light, 0.78);
  root.addChild(hi);

  // Aggressive orange flame stripes
  const stripes = new Graphics();
  panel(stripes, [-2, -22, 2, -22, 4, 4, -4, 4], c.accent, 0.9);
  panel(stripes, [-14, 10, -10, 10, -8, 18, -16, 18], c.accent, 0.9);
  panel(stripes, [10, 10, 14, 10, 16, 18, 8, 18], c.accent, 0.9);
  // Hash marks
  for (let i = 0; i < 3; i++) {
    stripes.rect(-1, -18 + i * 4, 2, 2).fill(0xfff066);
  }
  root.addChild(stripes);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.3, alpha: 0.95 });
  root.addChild(edge);

  // Triple cannons (burst weapon)
  const cn = new Graphics();
  cn.rect(-1.5, -36, 3, 8).fill(c.dark);
  cn.rect(-5, -32, 3, 8).fill(c.dark);
  cn.rect(2, -32, 3, 8).fill(c.dark);
  cn.circle(0, -36, 1.4).fill(c.accent);
  cn.circle(-3.5, -32, 1.2).fill(c.accent);
  cn.circle(3.5, -32, 1.2).fill(c.accent);
  root.addChild(cn);

  // Cockpit
  const cp = new Graphics();
  cp.ellipse(0, -16, 2, 4).fill(0x000000);
  cp.ellipse(0, -16, 1.5, 3).fill(c.accent);
  root.addChild(cp);

  // Wing-tip lights
  const lt = new Graphics();
  lightDot(lt, -17, 18, 1.2, 0xff4040);
  lightDot(lt, 17, 18, 1.2, 0xfff066);
  root.addChild(lt);

  const eng = new Graphics();
  eng.rect(-5, 22, 10, 8).fill(c.engine);
  eng.rect(-4, 23, 8, 5).fill(0xffffff);
  root.addChild(eng);
}

// --- 5: drone -------------------------------------------------------------
export function drawDrone(root: Container): void {
  const c = COL.drone;
  softGlow(root, 0, 0, 16, c.accent, 7);

  const hull = new Graphics();
  hull.circle(0, 0, 14).fill(c.hull);
  hull.circle(0, 0, 11).fill(c.dark);
  root.addChild(hull);

  const ring = new Graphics();
  ring.circle(0, 0, 13).stroke({ color: c.accent, width: 1.4, alpha: 0.95 });
  ring.circle(0, 0, 9).stroke({ color: c.light, width: 1, alpha: 0.7 });
  // Hex-pattern facets inside
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ring.moveTo(Math.cos(a) * 4, Math.sin(a) * 4).lineTo(Math.cos(a) * 11, Math.sin(a) * 11).stroke({ color: c.dark, width: 1, alpha: 0.6 });
  }
  root.addChild(ring);

  // Central eye / camera
  const eye = new Graphics();
  eye.circle(0, 0, 4.5).fill(0x000000);
  eye.circle(0, 0, 3.5).fill(c.engine);
  eye.circle(-1, -1, 1.4).fill(0xffffff);
  root.addChild(eye);

  // Antennae (longer, more visible)
  const ant = new Graphics();
  line(ant, -10, -8, -15, -14, c.accent, 1.6, 0.95);
  ant.circle(-15, -14, 1.4).fill(c.accent);
  line(ant, 10, -8, 15, -14, c.accent, 1.6, 0.95);
  ant.circle(15, -14, 1.4).fill(c.accent);
  root.addChild(ant);

  // Side weapon mounts (small)
  const mt = new Graphics();
  mt.rect(-15, -1, 3, 4).fill(c.dark);
  mt.rect(12, -1, 3, 4).fill(c.dark);
  mt.circle(-13.5, 1, 0.8).fill(c.accent);
  mt.circle(13.5, 1, 0.8).fill(c.accent);
  root.addChild(mt);

  // Bottom thruster lights
  const lt = new Graphics();
  lt.circle(-4, 11, 1).fill(c.engine);
  lt.circle(4, 11, 1).fill(c.engine);
  root.addChild(lt);
}

// --- 6: turret platform ---------------------------------------------------
export function drawTurret(root: Container): void {
  const c = COL.turret;
  softGlow(root, 0, 20, 12, c.engine, 6);

  // Octagonal base
  const baseHull = new Graphics();
  const pts = [-22, -10, -10, -22, 10, -22, 22, -10, 22, 10, 10, 22, -10, 22, -22, 10];
  baseHull.poly(pts).fill(c.hull);
  root.addChild(baseHull);

  const hi = new Graphics();
  panel(hi, [-18, -8, -8, -18, 8, -18, 18, -8, 18, 8, 8, 18, -8, 18, -18, 8], c.light, 0.78);
  root.addChild(hi);

  // Panel divisions on base
  const det = new Graphics();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI / 2 + Math.PI / 4;
    line(det, 0, 0, Math.cos(a) * 20, Math.sin(a) * 20, c.dark, 1, 0.6);
  }
  root.addChild(det);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.3, alpha: 0.85 });
  root.addChild(edge);

  // Central rotating turret base
  const turBase = new Graphics();
  turBase.circle(0, 0, 11).fill(c.dark);
  turBase.circle(0, 0, 11).stroke({ color: c.accent, width: 1.2 });
  turBase.circle(0, 0, 6).fill(c.light);
  root.addChild(turBase);

  // Big cannon
  const cannon = new Graphics();
  cannon.rect(-5, -28, 10, 22).fill(c.dark);
  cannon.rect(-3, -32, 6, 8).fill(c.light);
  cannon.rect(-2, -34, 4, 4).fill(c.accent);
  cannon.circle(0, -34, 1).fill(0xffffff);
  // Cooling vents
  for (let i = 0; i < 3; i++) {
    cannon.rect(-4, -22 + i * 5, 8, 1.4).fill(c.accent);
  }
  root.addChild(cannon);

  // Side sensor pylons
  const sens = new Graphics();
  sens.poly([-20, -3, -26, 0, -20, 3]).fill(c.dark);
  sens.poly([20, -3, 26, 0, 20, 3]).fill(c.dark);
  sens.circle(-25, 0, 1.5).fill(c.accent);
  sens.circle(25, 0, 1.5).fill(c.accent);
  root.addChild(sens);

  // Status lights around perimeter
  const lt = new Graphics();
  lightDot(lt, -14, 14, 1.2, c.engine);
  lightDot(lt, 14, 14, 1.2, c.engine);
  lightDot(lt, 0, 14, 1.2, c.accent);
  root.addChild(lt);

  // Bottom thrusters
  const eng = new Graphics();
  eng.rect(-7, 20, 14, 5).fill(c.engine);
  eng.rect(-6, 21, 12, 2.5).fill(0xffffff);
  root.addChild(eng);
}

// --- 7: miner -------------------------------------------------------------
export function drawMiner(root: Container): void {
  const c = COL.miner;
  softGlow(root, 0, 16, 10, c.engine, 5);

  const hull = new Graphics();
  const pts = mirroredPoly([0, -18, 8, -10, 14, 2, 16, 12, 8, 18]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -14, 6, -8, 10, 2, 12, 10, 6, 14]), c.light, 0.78);
  root.addChild(hi);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.2, alpha: 0.85 });
  root.addChild(edge);

  // Mine racks (more detailed)
  const racks = new Graphics();
  // Left rack
  racks.rect(-22, -2, 7, 16).fill(c.dark);
  racks.rect(-22, -2, 7, 16).stroke({ color: c.accent, width: 1, alpha: 0.7 });
  // 3 mines in left rack
  for (let i = 0; i < 3; i++) {
    racks.circle(-18.5, 2 + i * 5, 2.2).fill(0xff8a2a);
    // Spikes on mine
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2;
      racks.circle(-18.5 + Math.cos(a) * 2.6, 2 + i * 5 + Math.sin(a) * 2.6, 0.6).fill(c.accent);
    }
    racks.circle(-18.5, 2 + i * 5, 1).fill(0xffd166);
  }
  // Right rack
  racks.rect(15, -2, 7, 16).fill(c.dark);
  racks.rect(15, -2, 7, 16).stroke({ color: c.accent, width: 1, alpha: 0.7 });
  for (let i = 0; i < 3; i++) {
    racks.circle(18.5, 2 + i * 5, 2.2).fill(0xff8a2a);
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2;
      racks.circle(18.5 + Math.cos(a) * 2.6, 2 + i * 5 + Math.sin(a) * 2.6, 0.6).fill(c.accent);
    }
    racks.circle(18.5, 2 + i * 5, 1).fill(0xffd166);
  }
  root.addChild(racks);

  // Industrial grapples (front)
  const gr = new Graphics();
  gr.poly([-8, -12, -14, -16, -10, -14, -8, -10]).fill(c.dark);
  gr.poly([8, -12, 14, -16, 10, -14, 8, -10]).fill(c.dark);
  root.addChild(gr);

  // Cockpit
  const cp = new Graphics();
  cp.ellipse(0, -8, 4, 4).fill(0x000000);
  cp.ellipse(0, -8, 3, 3).fill(c.accent);
  cp.ellipse(0, -9, 1.5, 1.5).fill(0xffffff);
  root.addChild(cp);

  // Hazard stripes
  const haz = new Graphics();
  for (let i = 0; i < 4; i++) {
    haz.poly([-6 + i * 3, 16, -4 + i * 3, 16, -3 + i * 3, 18, -5 + i * 3, 18]).fill({ color: 0xfff066, alpha: 0.8 });
  }
  root.addChild(haz);

  const eng = new Graphics();
  eng.rect(-4, 16, 8, 4).fill(c.engine);
  eng.rect(-3, 17, 6, 2).fill(0xffffff);
  root.addChild(eng);
}

// --- 8: sniper ------------------------------------------------------------
export function drawSniper(root: Container): void {
  const c = COL.sniper;
  softGlow(root, 0, 20, 8, c.engine, 5);
  softGlow(root, 0, -32, 6, c.accent, 5);

  const hull = new Graphics();
  // Long thin
  const pts = mirroredPoly([0, -32, 2.5, -22, 5, -10, 9, 8, 11, 20, 5, 24]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -28, 1.5, -20, 3.5, -10, 7, 8, 8, 18, 4, 22]), c.light, 0.85);
  root.addChild(hi);

  // Long sniper barrel — multi-segment
  const barrel = new Graphics();
  barrel.rect(-1.8, -42, 3.6, 18).fill(c.dark);
  barrel.rect(-1, -42, 2, 14).fill(c.light);
  barrel.rect(-1.4, -44, 2.8, 4).fill(c.accent);
  // Cooling rings
  barrel.rect(-3, -36, 6, 1.5).fill(c.dark);
  barrel.rect(-3, -30, 6, 1.5).fill(c.dark);
  // Muzzle glow
  barrel.circle(0, -44, 1.5).fill(0xffffff);
  root.addChild(barrel);

  // Stabilizer fins (thin, swept back)
  const wing = new Graphics();
  wing.poly([-10, -2, -22, 10, -16, 14, -8, 4]).fill(c.hull);
  wing.poly([-10, -2, -22, 10, -16, 14, -8, 4]).stroke({ color: c.accent, width: 1, alpha: 0.85 });
  wing.poly([10, -2, 22, 10, 16, 14, 8, 4]).fill(c.hull);
  wing.poly([10, -2, 22, 10, 16, 14, 8, 4]).stroke({ color: c.accent, width: 1, alpha: 0.85 });
  // Wing stripes
  wing.poly([-14, 6, -20, 12, -19, 13, -13, 7]).fill({ color: c.accent, alpha: 0.7 });
  wing.poly([14, 6, 20, 12, 19, 13, 13, 7]).fill({ color: c.accent, alpha: 0.7 });
  root.addChild(wing);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  root.addChild(edge);

  // Scope/optical sensor
  const cp = new Graphics();
  cp.circle(0, -12, 3.5).fill(0x000000);
  cp.circle(0, -12, 2.5).fill(c.accent);
  cp.circle(0, -12, 1.2).fill(0xffffff);
  root.addChild(cp);

  // Wing-tip lights
  const lt = new Graphics();
  lightDot(lt, -19, 12, 1.2, 0xff4040);
  lightDot(lt, 19, 12, 1.2, 0x40ff40);
  root.addChild(lt);

  const eng = new Graphics();
  eng.rect(-3, 20, 6, 4).fill(c.engine);
  eng.rect(-2, 21, 4, 2).fill(0xffffff);
  root.addChild(eng);
}

// --- 9: kamikaze ----------------------------------------------------------
export function drawKamikaze(root: Container): void {
  const c = COL.kamikaze;
  softGlow(root, 0, 0, 24, c.accent, 9);
  softGlow(root, 0, 16, 10, c.engine, 5);

  const hull = new Graphics();
  // Sharper, more aggressive dagger
  const pts = mirroredPoly([0, -24, 5, -14, 11, 0, 9, 10, 5, 18]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -20, 4, -12, 8, 0, 6, 8, 3, 14]), c.light, 0.92);
  root.addChild(hi);

  // Bright energy core (warhead) — pulsing
  const core = new Graphics();
  core.circle(0, -4, 6).fill(0x000000);
  core.circle(0, -4, 5).fill(c.accent);
  core.circle(0, -4, 3).fill(0xffd166);
  core.circle(0, -4, 1.5).fill(0xffffff);
  // Energy lines from core to edges
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    core.moveTo(Math.cos(a) * 4, -4 + Math.sin(a) * 4).lineTo(Math.cos(a) * 8, -4 + Math.sin(a) * 8).stroke({ color: 0xfff066, width: 1.2, alpha: 0.85 });
  }
  root.addChild(core);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.5, alpha: 0.95 });
  root.addChild(edge);

  // Side fins (small)
  const wing = new Graphics();
  wing.poly([-9, 4, -16, 12, -12, 14, -8, 8]).fill(c.hull);
  wing.poly([-9, 4, -16, 12, -12, 14, -8, 8]).stroke({ color: c.accent, width: 1 });
  wing.poly([9, 4, 16, 12, 12, 14, 8, 8]).fill(c.hull);
  wing.poly([9, 4, 16, 12, 12, 14, 8, 8]).stroke({ color: c.accent, width: 1 });
  root.addChild(wing);

  // Aggressive markings
  const mk = new Graphics();
  mk.poly([0, -20, 2, -16, 0, -12, -2, -16]).fill(0xfff066);
  root.addChild(mk);

  const eng = new Graphics();
  eng.rect(-4, 14, 8, 6).fill(c.engine);
  eng.rect(-3, 15, 6, 4).fill(0xffffff);
  root.addChild(eng);
}

// --- 10: heavy assault ----------------------------------------------------
export function drawHeavy(root: Container): void {
  const c = COL.heavy;
  softGlow(root, -22, 28, 10, c.engine, 5);
  softGlow(root, 0, 30, 14, c.engine, 6);
  softGlow(root, 22, 28, 10, c.engine, 5);

  const hull = new Graphics();
  const pts = mirroredPoly([0, -32, 14, -24, 22, -12, 32, 4, 34, 18, 24, 28]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -26, 12, -20, 18, -10, 28, 4, 28, 16, 20, 24]), c.light, 0.78);
  root.addChild(hi);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.5, alpha: 0.75 });
  root.addChild(edge);

  // Heavy armor plating lines
  const arm = new Graphics();
  line(arm, -22, -10, 22, -10, c.dark, 1.6, 0.85);
  line(arm, -30, 10, 30, 10, c.dark, 1.5, 0.85);
  line(arm, -16, -18, 16, -18, c.dark, 1.2, 0.7);
  // Armor rivets
  for (let i = -2; i <= 2; i++) {
    arm.circle(i * 8, -10, 0.8).fill(c.accent);
    arm.circle(i * 8, 10, 0.8).fill(c.accent);
  }
  root.addChild(arm);

  // Side turrets (4 - heavy load)
  const tur = new Graphics();
  tur.rect(-30, -6, 6, 10).fill(c.dark);
  tur.rect(24, -6, 6, 10).fill(c.dark);
  tur.circle(-27, -4, 2.5).fill(c.accent);
  tur.circle(27, -4, 2.5).fill(c.accent);
  // Lower side turrets
  tur.rect(-28, 14, 5, 8).fill(c.dark);
  tur.rect(23, 14, 5, 8).fill(c.dark);
  tur.circle(-25.5, 16, 2).fill(c.accent);
  tur.circle(25.5, 16, 2).fill(c.accent);
  root.addChild(tur);

  // Big main cannon
  const cn = new Graphics();
  cn.rect(-5, -22, 10, 16).fill(c.dark);
  cn.rect(-3, -28, 6, 10).fill(c.light);
  cn.rect(-2, -30, 4, 4).fill(c.accent);
  // Side barrels
  cn.rect(-9, -16, 3, 10).fill(c.dark);
  cn.rect(6, -16, 3, 10).fill(c.dark);
  cn.circle(-7.5, -16, 1.4).fill(c.accent);
  cn.circle(7.5, -16, 1.4).fill(c.accent);
  root.addChild(cn);

  // Cockpit (armored bridge)
  const cp = new Graphics();
  cp.ellipse(0, -10, 7, 5).fill(0x000000);
  cp.ellipse(0, -10, 6, 4).fill(c.accent);
  cp.ellipse(0, -12, 3, 2).fill(0xffffff);
  root.addChild(cp);

  // Hull lights
  const lt = new Graphics();
  lightDot(lt, -30, 22, 1.4, 0xff4040);
  lightDot(lt, 30, 22, 1.4, 0x40ff40);
  lightDot(lt, -16, 4, 1.2, c.accent);
  lightDot(lt, 16, 4, 1.2, c.accent);
  root.addChild(lt);

  const eng = new Graphics();
  eng.rect(-26, 24, 8, 8).fill(c.engine);
  eng.rect(-4, 26, 8, 8).fill(c.engine);
  eng.rect(18, 24, 8, 8).fill(c.engine);
  eng.rect(-25, 25, 6, 4).fill(0xffffff);
  eng.rect(-3, 27, 6, 4).fill(0xffffff);
  eng.rect(19, 25, 6, 4).fill(0xffffff);
  root.addChild(eng);
}

// --- 11: stealth ----------------------------------------------------------
export function drawStealth(root: Container): void {
  const c = COL.stealth;
  softGlow(root, 0, 18, 10, c.engine, 5);
  softGlow(root, 0, -8, 14, c.accent, 6);

  const hull = new Graphics();
  // Curved predator wing — wider, more menacing
  const pts = mirroredPoly([0, -24, 6, -12, 22, -4, 30, 10, 18, 18, 8, 20]);
  hull.poly(pts).fill(c.hull);
  root.addChild(hull);

  const hi = new Graphics();
  panel(hi, mirroredPoly([0, -20, 4, -10, 18, -2, 24, 8, 14, 16, 6, 18]), c.light, 0.82);
  root.addChild(hi);

  const edge = new Graphics();
  edge.poly(pts).stroke({ color: c.accent, width: 1.1, alpha: 0.95 });
  root.addChild(edge);

  // Stealth panel facets (diamond pattern)
  const det = new Graphics();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    det.poly([Math.cos(a) * 4, Math.sin(a) * 4 - 4, Math.cos(a + 0.3) * 8, Math.sin(a + 0.3) * 8 - 4, Math.cos(a + 0.6) * 4, Math.sin(a + 0.6) * 4 - 4]).fill({ color: c.dark, alpha: 0.6 });
  }
  root.addChild(det);

  // Predator-shaped translucent windows
  const wins = new Graphics();
  wins.ellipse(0, -10, 3.5, 5).fill({ color: c.accent, alpha: 0.85 });
  wins.ellipse(0, -12, 1.5, 2).fill(0xffffff);
  // Side windows on wings
  wins.poly([-12, 4, -18, 8, -14, 10, -10, 6]).fill({ color: c.accent, alpha: 0.55 });
  wins.poly([12, 4, 18, 8, 14, 10, 10, 6]).fill({ color: c.accent, alpha: 0.55 });
  root.addChild(wins);

  // Wing-tip claws (sharp angular tips)
  const claw = new Graphics();
  claw.poly([-30, 8, -34, 14, -28, 12]).fill(c.accent);
  claw.poly([30, 8, 34, 14, 28, 12]).fill(c.accent);
  root.addChild(claw);

  // Forward weapons (subtle)
  const cn = new Graphics();
  cn.rect(-8, -6, 2, 8).fill(c.dark);
  cn.rect(6, -6, 2, 8).fill(c.dark);
  cn.circle(-7, -6, 1).fill(c.accent);
  cn.circle(7, -6, 1).fill(c.accent);
  root.addChild(cn);

  const eng = new Graphics();
  eng.rect(-6, 16, 12, 6).fill(c.engine);
  eng.rect(-5, 17, 10, 3).fill({ color: 0xc579ff, alpha: 0.9 });
  root.addChild(eng);
}

// --- 12: tesla ------------------------------------------------------------
export function drawTesla(root: Container): void {
  const c = COL.tesla;
  softGlow(root, 0, 0, 22, c.accent, 8);

  const ring = new Graphics();
  // Outer torus ring
  ring.ellipse(0, 0, 24, 9).fill(c.hull);
  ring.ellipse(0, 0, 20, 7).fill(c.dark);
  ring.ellipse(0, 0, 22, 8).stroke({ color: c.accent, width: 1.4, alpha: 0.85 });
  root.addChild(ring);

  // Inner sphere
  const sp = new Graphics();
  sp.circle(0, 0, 12).fill(c.hull);
  sp.circle(-3, -3, 9).fill(c.light);
  sp.circle(0, 0, 11).stroke({ color: c.accent, width: 1.4, alpha: 0.95 });
  // Hex panels on sphere
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    sp.circle(Math.cos(a) * 7, Math.sin(a) * 7, 1).fill(c.dark);
  }
  root.addChild(sp);

  // Electric core
  const core = new Graphics();
  core.circle(0, 0, 5).fill(c.engine);
  core.circle(0, 0, 3).fill(0xffffff);
  // Arcs from core
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    core.moveTo(0, 0).lineTo(Math.cos(a) * 9, Math.sin(a) * 9).stroke({ color: 0xffffff, width: 1, alpha: 0.85 });
  }
  root.addChild(core);

  // Arcing nodes (6, more elaborate)
  const nodes = new Graphics();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const nx = Math.cos(a) * 24;
    const ny = Math.sin(a) * 8;
    nodes.circle(nx, ny, 2.4).fill(c.dark);
    nodes.circle(nx, ny, 1.8).fill(c.accent);
    nodes.circle(nx, ny, 0.8).fill(0xffffff);
  }
  // Lightning arcs between adjacent nodes (decorative)
  for (let i = 0; i < 6; i++) {
    const a1 = (i / 6) * Math.PI * 2;
    const a2 = ((i + 1) / 6) * Math.PI * 2;
    const x1 = Math.cos(a1) * 24;
    const y1 = Math.sin(a1) * 8;
    const x2 = Math.cos(a2) * 24;
    const y2 = Math.sin(a2) * 8;
    // Jittery line
    const mx = (x1 + x2) / 2 + (Math.cos((a1 + a2) / 2) * 4);
    const my = (y1 + y2) / 2 + (Math.sin((a1 + a2) / 2) * 4);
    nodes.moveTo(x1, y1).lineTo(mx, my).lineTo(x2, y2).stroke({ color: 0xffffff, width: 0.9, alpha: 0.6 });
  }
  root.addChild(nodes);
}

// --- generic boss base (legacy, kept for backwards compatibility) ---------
export function drawBossGeneric(root: Container, accent: number, scale = 1): void {
  // Simple fallback used only if a new boss drawer isn't registered.
  const c = COL.boss;
  const S = scale;
  softGlow(root, 0, 54 * S, 24 * S, c.engine, 10);
  const hull = new Graphics();
  const pts = mirroredPoly([0, -60 * S, 28 * S, -30 * S, 44 * S, -8 * S, 60 * S, 18 * S, 34 * S, 48 * S]);
  hull.poly(pts).fill(c.hull);
  hull.poly(pts).stroke({ color: accent, width: 2 });
  root.addChild(hull);
}
