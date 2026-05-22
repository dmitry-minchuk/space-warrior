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

// --- 1: scout — TIE-style spherical cockpit with hex solar wings ----------
export function drawScout(root: Container): void {
  const c = COL.scout;
  softGlow(root, 0, 12, 9, c.engine, 6);
  softGlow(root, 0, -2, 7, c.accent, 5);

  // Two angular hex "solar panels" framing the spherical cockpit.
  const wings = new Graphics();
  const leftWing = [-26, -12, -22, -22, -12, -22, -8, -12, -12, 2, -22, 2];
  const rightWing = [26, -12, 22, -22, 12, -22, 8, -12, 12, 2, 22, 2];
  wings.poly(leftWing).fill(c.dark);
  wings.poly(rightWing).fill(c.dark);
  wings.poly(leftWing).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  wings.poly(rightWing).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  // Internal panel facets — TIE solar grid
  for (let i = -1; i <= 1; i++) {
    line(wings, -22, -12 + i * 5, -10, -12 + i * 5, c.accent, 0.7, 0.7);
    line(wings, 10, -12 + i * 5, 22, -12 + i * 5, c.accent, 0.7, 0.7);
  }
  line(wings, -17, -22, -17, 2, c.accent, 0.7, 0.6);
  line(wings, 17, -22, 17, 2, c.accent, 0.7, 0.6);
  root.addChild(wings);

  // Connecting struts between wings and cockpit pod
  const strut = new Graphics();
  strut.rect(-9, -2, 4, 4).fill(c.dark);
  strut.rect(5, -2, 4, 4).fill(c.dark);
  strut.rect(-9, -2, 4, 4).stroke({ color: c.accent, width: 0.6, alpha: 0.8 });
  strut.rect(5, -2, 4, 4).stroke({ color: c.accent, width: 0.6, alpha: 0.8 });
  root.addChild(strut);

  // Spherical cockpit pod (faceted gunmetal)
  const pod = new Graphics();
  pod.circle(0, 0, 9).fill(c.hull);
  pod.circle(-2, -2, 7).fill(c.light);
  pod.circle(0, 0, 9).stroke({ color: c.accent, width: 1.2, alpha: 0.95 });
  // Panel seams
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    pod.moveTo(0, 0).lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5).stroke({ color: c.dark, width: 0.8, alpha: 0.6 });
  }
  root.addChild(pod);

  // Forward viewport — red cyclopean lens
  const viewport = new Graphics();
  viewport.poly([-3, -6, 3, -6, 4, -3, -4, -3]).fill(0x000000);
  viewport.poly([-2.5, -5.5, 2.5, -5.5, 3.5, -3.5, -3.5, -3.5]).fill(0xff5050);
  viewport.poly([-1, -5, 1, -5, 1.5, -4, -1.5, -4]).fill(0xffd166);
  viewport.circle(0, -4.5, 0.5).fill(0xffffff);
  root.addChild(viewport);

  // Forward chin gun
  const gun = new Graphics();
  gun.rect(-1.2, -14, 2.4, 6).fill(c.dark);
  gun.rect(-0.8, -16, 1.6, 3).fill(c.accent);
  gun.circle(0, -16, 0.6).fill(0xffffff);
  root.addChild(gun);

  // Aft thruster nozzles
  const eng = new Graphics();
  eng.rect(-3.5, 8, 7, 5).fill(c.dark);
  eng.rect(-3, 9, 6, 3.5).fill(c.engine);
  eng.rect(-2, 10, 4, 2).fill(0xffffff);
  // Wing-tip thrusters
  eng.circle(-22, -5, 1.2).fill(c.engine);
  eng.circle(22, -5, 1.2).fill(c.engine);
  eng.circle(-22, -5, 0.5).fill(0xffffff);
  eng.circle(22, -5, 0.5).fill(0xffffff);
  root.addChild(eng);

  // Nav strobes
  const lt = new Graphics();
  lightDot(lt, -19, -2, 1, 0xff4040);
  lightDot(lt, 19, -2, 1, 0x40ff40);
  root.addChild(lt);
}

// --- 2: fighter — X-wing / TIE Advanced hybrid -----------------------------
export function drawFighter(root: Container): void {
  const c = COL.fighter;
  softGlow(root, -7, 20, 10, c.engine, 6);
  softGlow(root, 7, 20, 10, c.engine, 6);
  softGlow(root, 0, -16, 6, c.accent, 5);

  // Outer S-foil wing pair (raised top / lowered bottom — opens like X-wings)
  const wing = new Graphics();
  const topL = [-1, -10, -26, -18, -30, -10, -28, -6, -4, 0];
  const topR = [1, -10, 26, -18, 30, -10, 28, -6, 4, 0];
  const botL = [-1, 6, -28, 14, -32, 22, -28, 24, -4, 14];
  const botR = [1, 6, 28, 14, 32, 22, 28, 24, 4, 14];
  for (const p of [topL, topR, botL, botR]) {
    wing.poly(p).fill(c.hull);
    wing.poly(p).stroke({ color: c.accent, width: 1, alpha: 0.85 });
  }
  // Wing decals — squadron stripes
  panel(wing, [-26, -14, -8, -8, -8, -6, -26, -10], c.accent, 0.85);
  panel(wing, [26, -14, 8, -8, 8, -6, 26, -10], c.accent, 0.85);
  panel(wing, [-28, 18, -10, 11, -10, 13, -28, 22], 0xfff066, 0.7);
  panel(wing, [28, 18, 10, 11, 10, 13, 28, 22], 0xfff066, 0.7);
  root.addChild(wing);

  // Wing-tip laser cannons (X-wing signature long barrels)
  const tip = new Graphics();
  for (const [bx, by] of [[-28, -14], [28, -14], [-30, 20], [30, 20]] as Array<[number, number]>) {
    tip.rect(bx - 1, by - 8, 2, 14).fill(c.dark);
    tip.circle(bx, by - 7, 1.3).fill(c.accent);
    tip.circle(bx, by - 7, 0.6).fill(0xffffff);
  }
  root.addChild(tip);

  // Central fuselage — narrow wedge with armoured spine
  const fuse = new Graphics();
  const fPts = mirroredPoly([0, -26, 3, -18, 5, -6, 7, 8, 6, 18, 4, 22, 2, 24]);
  fuse.poly(fPts).fill(c.hull);
  fuse.poly(fPts).stroke({ color: c.accent, width: 1.2, alpha: 0.95 });
  // Highlight spine
  panel(fuse, mirroredPoly([0, -22, 2, -16, 3, -4, 4, 8, 3, 18, 2, 22]), c.light, 0.88);
  // Dorsal armour ridges
  for (const y of [-14, -6, 4, 14]) line(fuse, -3, y, 3, y, c.dark, 1, 0.85);
  root.addChild(fuse);

  // Forward chin pair-cannons
  const gun = new Graphics();
  gun.rect(-3, -30, 2, 8).fill(c.dark);
  gun.rect(1, -30, 2, 8).fill(c.dark);
  gun.rect(-2.6, -32, 1.4, 2).fill(c.accent);
  gun.rect(1.4, -32, 1.4, 2).fill(c.accent);
  gun.circle(-1.9, -32, 0.5).fill(0xffffff);
  gun.circle(2.1, -32, 0.5).fill(0xffffff);
  root.addChild(gun);

  // Cockpit canopy — multi-pane "imperial" frame
  const cp = new Graphics();
  cp.ellipse(0, -12, 4, 6).fill(0x000000);
  cp.ellipse(0, -12, 3.4, 5.4).fill(c.accent);
  // Frame divider
  line(cp, 0, -17, 0, -7, 0x000000, 0.8, 0.9);
  line(cp, -3, -12, 3, -12, 0x000000, 0.6, 0.7);
  cp.ellipse(-1, -14, 1.4, 2.4).fill(0xffffff);
  cp.ellipse(0, -12, 4, 6).stroke({ color: c.dark, width: 0.8, alpha: 1 });
  root.addChild(cp);

  // Aft engine pods
  const eng = new Graphics();
  eng.rect(-10, 16, 6, 8).fill(c.dark);
  eng.rect(4, 16, 6, 8).fill(c.dark);
  eng.rect(-9.5, 17, 5, 7).fill(c.engine);
  eng.rect(4.5, 17, 5, 7).fill(c.engine);
  eng.rect(-8.5, 18, 3, 5).fill(0xffffff);
  eng.rect(5.5, 18, 3, 5).fill(0xffffff);
  // Heat-vent slats
  for (let i = 0; i < 3; i++) {
    eng.rect(-10, 16 + i * 2.4, 6, 0.8).fill({ color: 0x000000, alpha: 0.6 });
    eng.rect(4, 16 + i * 2.4, 6, 0.8).fill({ color: 0x000000, alpha: 0.6 });
  }
  root.addChild(eng);

  // Nav strobes — bright wing tips
  const lt = new Graphics();
  lightDot(lt, -28, -16, 1.1, 0xff4040);
  lightDot(lt, 28, -16, 1.1, 0x40ff40);
  lightDot(lt, -30, 22, 1.1, c.engine);
  lightDot(lt, 30, 22, 1.1, c.engine);
  root.addChild(lt);
}

// --- 3: bomber — 40K-Imperial heavy bomber, brutal armoured hull -----------
export function drawBomber(root: Container): void {
  const c = COL.bomber;
  softGlow(root, -18, 26, 9, c.engine, 6);
  softGlow(root, -6, 28, 11, c.engine, 6);
  softGlow(root, 6, 28, 11, c.engine, 6);
  softGlow(root, 18, 26, 9, c.engine, 6);

  // Main hull — wide armoured slab, slightly cathedral-shaped
  const hull = new Graphics();
  const pts = mirroredPoly([0, -32, 10, -26, 22, -14, 32, -2, 34, 14, 28, 22, 22, 26]);
  hull.poly(pts).fill(c.hull);
  hull.poly(pts).stroke({ color: c.accent, width: 1.4, alpha: 0.8 });
  root.addChild(hull);

  // Sloped armour shoulders
  const armor = new Graphics();
  panel(armor, mirroredPoly([0, -24, 8, -22, 18, -14, 26, -4]), c.light, 0.82);
  panel(armor, mirroredPoly([18, -14, 26, -4, 30, 8, 24, 18, 14, 14]), c.dark, 0.55);
  // Top central armour spine
  panel(armor, [-6, -28, 6, -28, 8, 4, -8, 4], c.light, 0.7);
  // Rivet rows along armour seams
  for (let i = -3; i <= 3; i++) {
    armor.circle(i * 5, -10, 0.7).fill(c.accent);
    armor.circle(i * 5, 6, 0.7).fill(c.accent);
  }
  root.addChild(armor);

  // Hazard stripes on the belly — Imperial bomb-bay markings
  const stripes = new Graphics();
  for (let i = 0; i < 6; i++) {
    const x = -15 + i * 5;
    stripes.poly([x, 12, x + 2.5, 12, x + 4, 18, x + 1.5, 18]).fill({ color: 0xfff066, alpha: 0.9 });
  }
  root.addChild(stripes);

  // Bomb bay — open hatch with visible warhead clusters
  const bay = new Graphics();
  bay.rect(-16, 6, 32, 12).fill(0x000000);
  bay.rect(-15, 7, 30, 10).fill(c.dark);
  bay.rect(-15, 7, 30, 10).stroke({ color: c.accent, width: 0.8, alpha: 0.7 });
  // 5 warheads (each a tipped capsule)
  for (let i = 0; i < 5; i++) {
    const bx = -12 + i * 6;
    bay.rect(bx - 1.8, 10, 3.6, 6).fill(c.light);
    bay.poly([bx - 1.8, 10, bx + 1.8, 10, bx, 7]).fill(0xff9933);
    bay.circle(bx, 8, 0.8).fill(0xffd166);
    bay.circle(bx, 13, 0.6).fill(c.dark);
  }
  root.addChild(bay);

  // Cathedral-style command bridge — tall narrow window pattern
  const bridge = new Graphics();
  bridge.poly([-8, -22, 8, -22, 6, -10, -6, -10]).fill(c.dark);
  bridge.poly([-7, -21, 7, -21, 5, -11, -5, -11]).fill(c.accent);
  // Window divisions
  for (let i = -2; i <= 2; i++) line(bridge, i * 2.5, -20, i * 2.5, -12, c.dark, 0.6, 0.95);
  line(bridge, -6, -16, 6, -16, c.dark, 0.6, 0.95);
  // Glints
  bridge.rect(-3, -20, 1.4, 4).fill({ color: 0xffffff, alpha: 0.8 });
  bridge.rect(1.6, -19, 1.2, 3).fill({ color: 0xffffff, alpha: 0.6 });
  // Crown spire (single antenna mast)
  line(bridge, 0, -22, 0, -30, c.light, 1.4, 1);
  bridge.poly([-1.5, -30, 1.5, -30, 0, -34]).fill(c.accent);
  root.addChild(bridge);

  // Shoulder turret pods (large gothic ball-mounts)
  const tur = new Graphics();
  for (const sx of [-26, 26]) {
    tur.circle(sx, -2, 4.5).fill(c.dark);
    tur.circle(sx, -2, 3.6).fill(c.light);
    tur.circle(sx, -2, 4.5).stroke({ color: c.accent, width: 1, alpha: 0.95 });
    // Twin barrels pointing forward
    tur.rect(sx - 2.4, -10, 1.6, 8).fill(c.dark);
    tur.rect(sx + 0.8, -10, 1.6, 8).fill(c.dark);
    tur.circle(sx - 1.6, -10, 0.6).fill(c.accent);
    tur.circle(sx + 1.6, -10, 0.6).fill(c.accent);
  }
  root.addChild(tur);

  // Side antennae and sensor mast tips
  const ant = new Graphics();
  line(ant, -12, -22, -16, -32, c.light, 1.2, 0.9);
  line(ant, 12, -22, 16, -32, c.light, 1.2, 0.9);
  ant.circle(-16, -32, 1.2).fill(c.accent);
  ant.circle(16, -32, 1.2).fill(c.accent);
  ant.circle(-16, -32, 0.5).fill(0xffffff);
  ant.circle(16, -32, 0.5).fill(0xffffff);
  root.addChild(ant);

  // Hull running lights
  const lt = new Graphics();
  lightDot(lt, -30, 18, 1.4, 0xff4040);
  lightDot(lt, 30, 18, 1.4, 0x40ff40);
  lightDot(lt, -14, 0, 1.1, c.accent);
  lightDot(lt, 14, 0, 1.1, c.accent);
  root.addChild(lt);

  // Aft engine quadrant
  const eng = new Graphics();
  for (const [ex, w] of [[-22, 6], [-10, 7], [4, 7], [16, 6]] as Array<[number, number]>) {
    eng.rect(ex, 22, w, 8).fill(c.dark);
    eng.rect(ex + 0.5, 23, w - 1, 7).fill(c.engine);
    eng.rect(ex + 1, 24, w - 2, 4).fill(0xffffff);
  }
  root.addChild(eng);
}

// --- 4: interceptor — TIE-Interceptor / A-wing dart-and-blade hybrid -------
export function drawInterceptor(root: Container): void {
  const c = COL.interceptor;
  softGlow(root, 0, 28, 12, c.engine, 7);
  softGlow(root, 0, -28, 6, c.accent, 5);

  // Twin angled blade-wings ("bent" daggers extending from the fuselage)
  const wing = new Graphics();
  const leftWing = [-2, -10, -22, -2, -28, 10, -22, 22, -16, 22, -10, 10, -4, 0];
  const rightWing = [2, -10, 22, -2, 28, 10, 22, 22, 16, 22, 10, 10, 4, 0];
  wing.poly(leftWing).fill(c.hull);
  wing.poly(rightWing).fill(c.hull);
  wing.poly(leftWing).stroke({ color: c.accent, width: 1.2, alpha: 0.95 });
  wing.poly(rightWing).stroke({ color: c.accent, width: 1.2, alpha: 0.95 });
  // Flame stripes
  panel(wing, [-22, 0, -20, -1, -10, 8, -12, 9], c.accent, 0.95);
  panel(wing, [22, 0, 20, -1, 10, 8, 12, 9], c.accent, 0.95);
  panel(wing, [-25, 12, -22, 11, -18, 18, -21, 19], 0xfff066, 0.8);
  panel(wing, [25, 12, 22, 11, 18, 18, 21, 19], 0xfff066, 0.8);
  // Wing-tip blade caps (extending outward)
  wing.poly([-28, 8, -32, 14, -28, 18, -26, 14]).fill(c.accent);
  wing.poly([28, 8, 32, 14, 28, 18, 26, 14]).fill(c.accent);
  root.addChild(wing);

  // Central fuselage — needle dart
  const fuse = new Graphics();
  const pts = mirroredPoly([0, -30, 2, -22, 3.5, -10, 5, 8, 6, 18, 3, 24]);
  fuse.poly(pts).fill(c.hull);
  fuse.poly(pts).stroke({ color: c.accent, width: 1.4, alpha: 1 });
  panel(fuse, mirroredPoly([0, -26, 1.5, -20, 2.5, -10, 3.5, 8, 4, 16, 2, 22]), c.light, 0.85);
  // Dorsal spine notches
  line(fuse, -1.5, -18, 1.5, -18, c.dark, 0.7, 0.9);
  line(fuse, -2, -6, 2, -6, c.dark, 0.7, 0.9);
  line(fuse, -2.5, 6, 2.5, 6, c.dark, 0.7, 0.9);
  root.addChild(fuse);

  // Twin forward laser barrels (mounted side-by-side on chin)
  const cn = new Graphics();
  cn.rect(-2.6, -34, 1.6, 8).fill(c.dark);
  cn.rect(1, -34, 1.6, 8).fill(c.dark);
  cn.circle(-1.8, -34, 0.8).fill(c.accent);
  cn.circle(1.8, -34, 0.8).fill(c.accent);
  cn.circle(-1.8, -34, 0.4).fill(0xffffff);
  cn.circle(1.8, -34, 0.4).fill(0xffffff);
  // Spine-mounted lance (one tall central barrel)
  cn.rect(-0.6, -38, 1.2, 6).fill(c.light);
  cn.circle(0, -38, 0.8).fill(0xffffff);
  root.addChild(cn);

  // Slit cockpit visor
  const cp = new Graphics();
  cp.poly([-2.6, -16, 2.6, -16, 2.2, -12, -2.2, -12]).fill(0x000000);
  cp.poly([-2.2, -15.4, 2.2, -15.4, 1.8, -12.6, -1.8, -12.6]).fill(c.accent);
  cp.rect(-1.6, -15, 3.2, 0.6).fill(0xffffff);
  root.addChild(cp);

  // Wing-tip nav strobes
  const lt = new Graphics();
  lightDot(lt, -30, 16, 1.2, 0xff4040);
  lightDot(lt, 30, 16, 1.2, 0xfff066);
  root.addChild(lt);

  // High-thrust afterburner — single large central nozzle
  const eng = new Graphics();
  eng.rect(-5, 22, 10, 9).fill(c.dark);
  eng.rect(-4, 23, 8, 8).fill(c.engine);
  eng.rect(-3, 24, 6, 6).fill(0xffffff);
  // Side micro-thrusters
  eng.rect(-9, 18, 3, 5).fill(c.dark);
  eng.rect(6, 18, 3, 5).fill(c.dark);
  eng.rect(-8.5, 19, 2, 3.5).fill(c.engine);
  eng.rect(6.5, 19, 2, 3.5).fill(c.engine);
  root.addChild(eng);
}

// --- 5: drone — alien chitinous orb with 4 articulated arms ---------------
export function drawDrone(root: Container): void {
  const c = COL.drone;
  softGlow(root, 0, 0, 16, c.accent, 8);
  softGlow(root, 0, 0, 7, c.engine, 5);

  // 4 articulated alien limbs reaching outward at 45° offsets
  const arms = new Graphics();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.cos(a), sx = Math.sin(a);
    // Inner segment
    const ix1 = cx * 6, iy1 = sx * 6;
    const ix2 = cx * 13, iy2 = sx * 13;
    // Joint
    const jx = cx * 14 + sx * 3, jy = sx * 14 - cx * 3;
    // Tip
    const tx = cx * 20 + sx * 5, ty = sx * 20 - cx * 5;
    arms.moveTo(ix1, iy1).lineTo(ix2, iy2).lineTo(jx, jy).stroke({ color: c.accent, width: 2.2, alpha: 0.9 });
    arms.moveTo(jx, jy).lineTo(tx, ty).stroke({ color: c.accent, width: 1.8, alpha: 0.95 });
    // Joint pivot
    arms.circle(jx, jy, 1.4).fill(c.dark);
    arms.circle(jx, jy, 0.8).fill(c.accent);
    // Claw tip (small triangle)
    const px = sx, py = -cx;
    arms.poly([tx + px * 1.4, ty + py * 1.4, tx - px * 1.4, ty - py * 1.4, tx + cx * 3, ty + sx * 3]).fill(c.dark);
  }
  root.addChild(arms);

  // Faceted hex carapace (3 layers)
  const hull = new Graphics();
  const hex = (r: number): number[] => {
    const p: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    return p;
  };
  hull.poly(hex(13)).fill(c.hull);
  hull.poly(hex(13)).stroke({ color: c.accent, width: 1.4, alpha: 1 });
  hull.poly(hex(10)).fill(c.dark);
  hull.poly(hex(10)).stroke({ color: c.light, width: 0.8, alpha: 0.8 });
  // Inter-facet seams (organic)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    line(hull, Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * 13, Math.sin(a) * 13, c.dark, 0.9, 0.6);
  }
  // Chitinous bumps at vertices
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    hull.circle(Math.cos(a) * 13, Math.sin(a) * 13, 1.2).fill(c.accent);
    hull.circle(Math.cos(a) * 13, Math.sin(a) * 13, 0.6).fill(0xffffff);
  }
  root.addChild(hull);

  // Central pulsing eye — alien membrane look
  const eye = new Graphics();
  eye.circle(0, 0, 5).fill(0x000000);
  eye.circle(0, 0, 4.2).fill(c.engine);
  eye.circle(0, 0, 3).fill(c.accent);
  eye.circle(-1.2, -1.2, 1.6).fill(0xffffff);
  // Iris cross
  line(eye, -3, 0, 3, 0, 0x000000, 0.7, 0.5);
  line(eye, 0, -3, 0, 3, 0x000000, 0.7, 0.5);
  root.addChild(eye);
}

// --- 6: turret — 40K gothic fortress-turret with cathedral spires ---------
export function drawTurret(root: Container): void {
  const c = COL.turret;
  softGlow(root, 0, 22, 14, c.engine, 7);
  softGlow(root, 0, -28, 7, c.accent, 5);

  // Octagonal cathedral base with stepped armour rings
  const baseHull = new Graphics();
  const outer = [-22, -10, -10, -22, 10, -22, 22, -10, 22, 10, 10, 22, -10, 22, -22, 10];
  baseHull.poly(outer).fill(c.hull);
  baseHull.poly(outer).stroke({ color: c.accent, width: 1.6, alpha: 0.95 });
  // Stepped inner ring (slightly smaller)
  const inner = [-17, -7, -7, -17, 7, -17, 17, -7, 17, 7, 7, 17, -7, 17, -17, 7];
  baseHull.poly(inner).fill(c.light);
  baseHull.poly(inner).stroke({ color: c.dark, width: 0.8, alpha: 0.7 });
  root.addChild(baseHull);

  // Cathedral buttress spires at the 4 diagonal corners
  const spires = new Graphics();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const bx = Math.cos(a) * 16, by = Math.sin(a) * 16;
    const tx = Math.cos(a) * 22, ty = Math.sin(a) * 22;
    spires.poly([bx - Math.sin(a) * 3, by + Math.cos(a) * 3, tx, ty, bx + Math.sin(a) * 3, by - Math.cos(a) * 3]).fill(c.dark);
    spires.poly([bx - Math.sin(a) * 3, by + Math.cos(a) * 3, tx, ty, bx + Math.sin(a) * 3, by - Math.cos(a) * 3]).stroke({ color: c.accent, width: 0.8 });
    spires.circle(tx, ty, 1.2).fill(c.accent);
    spires.circle(tx, ty, 0.6).fill(0xffffff);
  }
  root.addChild(spires);

  // Aquila-style cross emblems on the four cardinal faces
  const emblem = new Graphics();
  for (const [ex, ey, a] of [[0, -18, 0], [18, 0, Math.PI / 2], [0, 18, Math.PI], [-18, 0, -Math.PI / 2]] as Array<[number, number, number]>) {
    const cx = Math.cos(a), sx = Math.sin(a);
    // Cross bar
    emblem.rect(ex - 2, ey - 0.6, 4, 1.2).fill(c.accent);
    emblem.rect(ex - 0.6, ey - 2, 1.2, 4).fill(c.accent);
    // Tiny ornament dot
    emblem.circle(ex + cx * 0.5, ey + sx * 0.5, 0.6).fill(0xfff066);
  }
  root.addChild(emblem);

  // Central turret yoke (rotating mount)
  const yoke = new Graphics();
  yoke.circle(0, 0, 11).fill(c.dark);
  yoke.circle(0, 0, 11).stroke({ color: c.accent, width: 1.4, alpha: 1 });
  yoke.circle(0, 0, 7.5).fill(c.light);
  yoke.circle(0, 0, 7.5).stroke({ color: c.accent, width: 0.7, alpha: 0.7 });
  // Rotation pip marks
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    yoke.circle(Math.cos(a) * 9, Math.sin(a) * 9, 0.6).fill(c.dark);
  }
  root.addChild(yoke);

  // Twin gothic cannons with cooling fins and ornate muzzle
  const cannon = new Graphics();
  // Cradle behind barrels
  cannon.rect(-7, -8, 14, 10).fill(c.dark);
  cannon.rect(-7, -8, 14, 10).stroke({ color: c.accent, width: 0.9, alpha: 0.8 });
  // Two barrels
  for (const bx of [-3.6, 3.6]) {
    cannon.rect(bx - 1.6, -32, 3.2, 26).fill(c.dark);
    cannon.rect(bx - 1, -32, 2, 22).fill(c.light);
    // Cooling fins
    for (let i = 0; i < 4; i++) {
      cannon.rect(bx - 2.4, -26 + i * 5, 4.8, 0.9).fill(c.accent);
    }
    // Muzzle (ornate stepped tip)
    cannon.rect(bx - 1.6, -34, 3.2, 2).fill(c.accent);
    cannon.rect(bx - 2, -36, 4, 2).fill(c.dark);
    cannon.circle(bx, -36, 0.7).fill(0xffffff);
  }
  // Targeting eye between barrels
  cannon.circle(0, -12, 1.5).fill(0x000000);
  cannon.circle(0, -12, 1.1).fill(0xff5050);
  cannon.circle(-0.2, -12.2, 0.4).fill(0xffffff);
  root.addChild(cannon);

  // Status lights around perimeter
  const lt = new Graphics();
  lightDot(lt, -14, 14, 1.2, c.engine);
  lightDot(lt, 14, 14, 1.2, c.engine);
  lightDot(lt, 0, 14, 1.2, c.accent);
  lightDot(lt, -20, 0, 1, 0xff4040);
  lightDot(lt, 20, 0, 1, 0xff4040);
  root.addChild(lt);

  // Bottom thrusters
  const eng = new Graphics();
  eng.rect(-9, 20, 18, 6).fill(c.dark);
  eng.rect(-8, 21, 16, 4).fill(c.engine);
  eng.rect(-7, 22, 14, 2).fill(0xffffff);
  root.addChild(eng);
}

// --- 7: miner — industrial mining-rig with claw arms and ore tanks --------
export function drawMiner(root: Container): void {
  const c = COL.miner;
  softGlow(root, 0, 16, 11, c.engine, 6);
  softGlow(root, 0, -12, 6, 0xff8a2a, 5);

  // Forward grapple arms — heavy industrial claws extending from the body
  const claws = new Graphics();
  // Left arm
  claws.rect(-8, -10, 4, 8).fill(c.dark);
  claws.rect(-8, -10, 4, 8).stroke({ color: c.accent, width: 0.8 });
  claws.poly([-12, -14, -6, -14, -4, -8, -10, -8]).fill(c.dark);
  // Pincer halves
  claws.poly([-12, -22, -8, -16, -10, -14, -14, -20]).fill(c.light);
  claws.poly([-8, -22, -4, -16, -6, -14, -10, -20]).fill(c.light);
  // Claw tips
  claws.circle(-13, -21, 0.7).fill(c.accent);
  claws.circle(-7, -21, 0.7).fill(c.accent);
  // Right arm mirror
  claws.rect(4, -10, 4, 8).fill(c.dark);
  claws.rect(4, -10, 4, 8).stroke({ color: c.accent, width: 0.8 });
  claws.poly([12, -14, 6, -14, 4, -8, 10, -8]).fill(c.dark);
  claws.poly([12, -22, 8, -16, 10, -14, 14, -20]).fill(c.light);
  claws.poly([8, -22, 4, -16, 6, -14, 10, -20]).fill(c.light);
  claws.circle(13, -21, 0.7).fill(c.accent);
  claws.circle(7, -21, 0.7).fill(c.accent);
  root.addChild(claws);

  // Main industrial hull — chunky module with riveted plating
  const hull = new Graphics();
  const pts = mirroredPoly([0, -8, 10, -4, 14, 4, 16, 14, 8, 20]);
  hull.poly(pts).fill(c.hull);
  hull.poly(pts).stroke({ color: c.accent, width: 1.4, alpha: 0.95 });
  panel(hull, mirroredPoly([0, -4, 8, -2, 12, 4, 12, 12, 6, 16]), c.light, 0.82);
  // Heavy rivets
  for (let i = -1; i <= 1; i++) {
    hull.circle(i * 5, 4, 0.8).fill(c.accent);
    hull.circle(i * 5, 12, 0.8).fill(c.accent);
  }
  // Panel seams
  line(hull, -14, 0, 14, 0, c.dark, 1, 0.8);
  line(hull, -14, 8, 14, 8, c.dark, 1, 0.8);
  root.addChild(hull);

  // Side mine racks — bigger, more visible, with cage frame
  const racks = new Graphics();
  for (const side of [-1, 1]) {
    const rx = side * 19;
    // Cage walls
    racks.rect(rx - 3.5, -2, 7, 18).fill(c.dark);
    racks.rect(rx - 3.5, -2, 7, 18).stroke({ color: c.accent, width: 1.1, alpha: 0.9 });
    // Horizontal cage bars
    for (let i = 0; i < 3; i++) {
      line(racks, rx - 3.5, 0 + i * 6, rx + 3.5, 0 + i * 6, c.accent, 0.6, 0.7);
    }
    // Mines visible inside (4 stacked, alternating)
    for (let i = 0; i < 3; i++) {
      const my = 2 + i * 5;
      racks.circle(rx, my, 2.3).fill(0xff8a2a);
      // Spike halo
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        racks.poly([rx + Math.cos(a) * 2.4, my + Math.sin(a) * 2.4, rx + Math.cos(a) * 3.3, my + Math.sin(a) * 3.3, rx + Math.cos(a + 0.3) * 2.4, my + Math.sin(a + 0.3) * 2.4]).fill(c.dark);
      }
      racks.circle(rx, my, 1.1).fill(0xffd166);
      racks.circle(rx, my, 0.5).fill(0xffffff);
    }
  }
  root.addChild(racks);

  // Cockpit / sensor dome — armored bubble forward
  const cp = new Graphics();
  cp.circle(0, -10, 4.5).fill(c.dark);
  cp.circle(0, -10, 4.5).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  cp.circle(0, -10, 3.4).fill(c.accent);
  cp.circle(-1, -11, 1.6).fill(0xffffff);
  // Tiny sensor dish on top
  cp.rect(-0.6, -16, 1.2, 4).fill(c.dark);
  cp.circle(0, -16, 1.4).fill(c.light);
  cp.circle(0, -16, 0.7).fill(c.accent);
  root.addChild(cp);

  // Hazard chevron stripes on the underside (mining industry tag)
  const haz = new Graphics();
  for (let i = 0; i < 5; i++) {
    haz.poly([-10 + i * 4.5, 18, -7 + i * 4.5, 18, -8 + i * 4.5, 20, -11 + i * 4.5, 20]).fill({ color: 0xfff066, alpha: 0.9 });
    haz.poly([-10 + i * 4.5, 20, -7 + i * 4.5, 20, -8 + i * 4.5, 22, -11 + i * 4.5, 22]).fill({ color: 0x000000, alpha: 0.85 });
  }
  root.addChild(haz);

  // Hull lights
  const lt = new Graphics();
  lightDot(lt, -16, 8, 1.1, c.accent);
  lightDot(lt, 16, 8, 1.1, c.accent);
  lightDot(lt, -14, -6, 1, 0xff4040);
  lightDot(lt, 14, -6, 1, 0x40ff40);
  root.addChild(lt);

  // Aft thruster — single heavy industrial nozzle
  const eng = new Graphics();
  eng.rect(-6, 19, 12, 5).fill(c.dark);
  eng.rect(-5, 20, 10, 4).fill(c.engine);
  eng.rect(-4, 21, 8, 2).fill(0xffffff);
  root.addChild(eng);
}

// --- 8: sniper — long-rifle gunship with scope orb and claw-fins ----------
export function drawSniper(root: Container): void {
  const c = COL.sniper;
  softGlow(root, 0, 22, 9, c.engine, 6);
  softGlow(root, 0, -38, 8, c.accent, 6);

  // Stabilizer claw-fins (sharp swept-back blades, low on the hull)
  const wing = new Graphics();
  for (const side of [-1, 1]) {
    const pts = [side * 5, -2, side * 24, 12, side * 22, 18, side * 6, 6];
    wing.poly(pts).fill(c.hull);
    wing.poly(pts).stroke({ color: c.accent, width: 1.2, alpha: 0.95 });
    // Energy striping along the leading edge
    wing.poly([side * 8, 0, side * 22, 12, side * 21, 13, side * 7, 1]).fill({ color: c.accent, alpha: 0.85 });
    // Claw tip
    wing.poly([side * 24, 12, side * 28, 14, side * 24, 16]).fill(c.accent);
    wing.circle(side * 27, 14, 0.7).fill(0xffffff);
  }
  root.addChild(wing);

  // Slim spinal fuselage — needle silhouette
  const hull = new Graphics();
  const pts = mirroredPoly([0, -32, 2.5, -22, 4.5, -10, 8, 8, 11, 20, 5, 24]);
  hull.poly(pts).fill(c.hull);
  hull.poly(pts).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  panel(hull, mirroredPoly([0, -28, 1.5, -20, 3, -10, 6, 8, 8, 18, 4, 22]), c.light, 0.85);
  root.addChild(hull);

  // Long sniper barrel — 4-segment, ornate Imperial muzzle
  const barrel = new Graphics();
  // Recoil cradle behind barrel
  barrel.rect(-3.5, -26, 7, 8).fill(c.dark);
  barrel.rect(-3.5, -26, 7, 8).stroke({ color: c.accent, width: 0.7 });
  // Main barrel
  barrel.rect(-2, -42, 4, 18).fill(c.dark);
  barrel.rect(-1.2, -42, 2.4, 16).fill(c.light);
  // 4 cooling rings
  for (let i = 0; i < 4; i++) {
    barrel.rect(-3, -38 + i * 4, 6, 1.2).fill(c.accent);
  }
  // Stepped muzzle brake
  barrel.rect(-2.4, -44, 4.8, 2).fill(c.accent);
  barrel.rect(-3, -46, 6, 2).fill(c.dark);
  barrel.rect(-2.2, -47, 4.4, 1).fill(c.accent);
  barrel.circle(0, -47, 0.7).fill(0xffffff);
  // Side struts holding the barrel
  line(barrel, -3, -38, -5, -32, c.dark, 1, 0.95);
  line(barrel, 3, -38, 5, -32, c.dark, 1, 0.95);
  root.addChild(barrel);

  // Optical scope orb — large lensed eye on top of the fuselage
  const scope = new Graphics();
  scope.circle(0, -12, 4.5).fill(0x000000);
  scope.circle(0, -12, 4.5).stroke({ color: c.accent, width: 1.2, alpha: 1 });
  scope.circle(0, -12, 3.4).fill(c.accent);
  scope.circle(0, -12, 2.2).fill(0xfff066);
  scope.circle(0, -12, 1).fill(0xff5050);
  scope.circle(-0.4, -12.4, 0.4).fill(0xffffff);
  // Lens crosshair
  line(scope, -3.6, -12, 3.6, -12, 0x000000, 0.5, 0.7);
  line(scope, 0, -15.6, 0, -8.4, 0x000000, 0.5, 0.7);
  root.addChild(scope);

  // Hull panel detail
  const det = new Graphics();
  line(det, -3, 0, 3, 0, c.dark, 1, 0.7);
  line(det, -4, 10, 4, 10, c.dark, 1, 0.7);
  root.addChild(det);

  // Wing-tip nav strobes
  const lt = new Graphics();
  lightDot(lt, -22, 17, 1.2, 0xff4040);
  lightDot(lt, 22, 17, 1.2, 0x40ff40);
  root.addChild(lt);

  // Aft thruster — narrow but bright
  const eng = new Graphics();
  eng.rect(-4, 20, 8, 6).fill(c.dark);
  eng.rect(-3, 21, 6, 5).fill(c.engine);
  eng.rect(-2, 22, 4, 3).fill(0xffffff);
  root.addChild(eng);
}

// --- 9: kamikaze — alien insectoid suicide drone with chitin & stinger ----
export function drawKamikaze(root: Container): void {
  const c = COL.kamikaze;
  softGlow(root, 0, 0, 24, c.accent, 10);
  softGlow(root, 0, -4, 8, 0xffd166, 6);
  softGlow(root, 0, 18, 11, c.engine, 6);

  // Side chitinous limbs (insect legs reaching outward)
  const limbs = new Graphics();
  for (const side of [-1, 1]) {
    // Upper segment
    limbs.moveTo(side * 4, -2).lineTo(side * 10, -6).lineTo(side * 14, 2).stroke({ color: c.dark, width: 2.4, alpha: 0.95 });
    // Lower segment
    limbs.moveTo(side * 6, 6).lineTo(side * 14, 8).lineTo(side * 18, 16).stroke({ color: c.dark, width: 2.6, alpha: 0.95 });
    // Joint highlights
    limbs.circle(side * 10, -6, 1.2).fill(c.accent);
    limbs.circle(side * 14, 8, 1.4).fill(c.accent);
    // Limb tips (claws)
    limbs.poly([side * 14, 2, side * 16, -2, side * 14, 0]).fill(c.dark);
    limbs.poly([side * 18, 16, side * 22, 18, side * 18, 18]).fill(c.dark);
  }
  root.addChild(limbs);

  // Body — segmented chitin plates (thorax / abdomen)
  const body = new Graphics();
  // Abdomen (lower bulge)
  body.poly(mirroredPoly([0, 0, 8, 4, 10, 12, 6, 18, 2, 20])).fill(c.hull);
  body.poly(mirroredPoly([0, 0, 8, 4, 10, 12, 6, 18, 2, 20])).stroke({ color: c.accent, width: 1.2, alpha: 0.95 });
  // Thorax (mid)
  body.poly(mirroredPoly([0, -10, 6, -8, 8, 0, 6, 4])).fill(c.light);
  body.poly(mirroredPoly([0, -10, 6, -8, 8, 0, 6, 4])).stroke({ color: c.accent, width: 0.9, alpha: 0.9 });
  // Head (forward chitin shell)
  body.poly(mirroredPoly([0, -22, 4, -16, 6, -10])).fill(c.dark);
  body.poly(mirroredPoly([0, -22, 4, -16, 6, -10])).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  // Segment seams
  line(body, -7, -2, 7, -2, c.dark, 0.9, 0.85);
  line(body, -8, 8, 8, 8, c.dark, 0.9, 0.85);
  line(body, -6, 14, 6, 14, c.dark, 0.9, 0.7);
  root.addChild(body);

  // Stinger (forward warhead spike)
  const sting = new Graphics();
  sting.poly([-1.2, -22, 1.2, -22, 0, -28]).fill(c.dark);
  sting.poly([-0.8, -23, 0.8, -23, 0, -27]).fill(c.accent);
  sting.circle(0, -27, 0.5).fill(0xffffff);
  root.addChild(sting);

  // Compound eye cluster (alien multi-lens)
  const eye = new Graphics();
  for (let i = -1; i <= 1; i++) {
    eye.circle(i * 2, -14, 1.2).fill(0x000000);
    eye.circle(i * 2, -14, 0.9).fill(0xff5050);
    eye.circle(i * 2 - 0.2, -14.2, 0.3).fill(0xffffff);
  }
  root.addChild(eye);

  // Pulsing warhead core (visible through transparent chitin)
  const core = new Graphics();
  core.circle(0, 6, 5).fill(0x000000);
  core.circle(0, 6, 4).fill(c.accent);
  core.circle(0, 6, 2.6).fill(0xffd166);
  core.circle(0, 6, 1.2).fill(0xffffff);
  // Energy filaments
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    core.moveTo(Math.cos(a) * 3.4, 6 + Math.sin(a) * 3.4).lineTo(Math.cos(a) * 5, 6 + Math.sin(a) * 5).stroke({ color: 0xfff066, width: 1, alpha: 0.85 });
  }
  root.addChild(core);

  // Aft thruster — sticky biofuel jet
  const eng = new Graphics();
  eng.rect(-3.5, 18, 7, 5).fill(c.dark);
  eng.rect(-3, 19, 6, 4).fill(c.engine);
  eng.rect(-2, 20, 4, 3).fill(0xffffff);
  root.addChild(eng);
}

// --- 10: heavy — 40K dreadnought / Imperial battle cruiser ----------------
export function drawHeavy(root: Container): void {
  const c = COL.heavy;
  softGlow(root, -24, 30, 11, c.engine, 6);
  softGlow(root, 0, 32, 15, c.engine, 7);
  softGlow(root, 24, 30, 11, c.engine, 6);
  softGlow(root, 0, -22, 8, c.accent, 6);

  // Massive armoured hull — wider battle-cruiser slab
  const hull = new Graphics();
  const pts = mirroredPoly([0, -34, 14, -26, 24, -14, 34, 4, 36, 20, 26, 30]);
  hull.poly(pts).fill(c.hull);
  hull.poly(pts).stroke({ color: c.accent, width: 1.6, alpha: 0.85 });
  // Mid-tone highlight on the dorsal plates
  panel(hull, mirroredPoly([0, -28, 12, -22, 20, -12, 30, 4, 30, 18, 22, 26]), c.light, 0.82);
  // Lower hull shadow
  panel(hull, mirroredPoly([10, 16, 26, 22, 24, 28]), c.dark, 0.5);
  root.addChild(hull);

  // Armoured shoulder plates (raised pauldrons that flank the main cannon)
  const shoulders = new Graphics();
  for (const side of [-1, 1]) {
    const sx = side;
    const plate = [sx * 8, -24, sx * 20, -22, sx * 24, -10, sx * 18, -6, sx * 8, -10];
    shoulders.poly(plate).fill(c.dark);
    shoulders.poly(plate).stroke({ color: c.accent, width: 1.4, alpha: 0.95 });
    // Ornate trim on top of the plate
    shoulders.rect(sx * 10, -23, sx * 10, 2).fill(c.accent);
    // Skull / chevron emblem
    shoulders.poly([sx * 14, -18, sx * 18, -18, sx * 16, -14]).fill(0xfff066);
    shoulders.circle(sx * 16, -16, 0.6).fill(0x000000);
  }
  root.addChild(shoulders);

  // Heavy armour plating lines and rivet rows
  const arm = new Graphics();
  line(arm, -24, -2, 24, -2, c.dark, 1.8, 0.9);
  line(arm, -30, 12, 30, 12, c.dark, 1.6, 0.85);
  line(arm, -18, -8, 18, -8, c.dark, 1.2, 0.7);
  for (let i = -3; i <= 3; i++) {
    arm.circle(i * 6, -2, 0.9).fill(c.accent);
    arm.circle(i * 6, 12, 0.9).fill(c.accent);
  }
  root.addChild(arm);

  // 4 side turret ball-mounts with paired barrels
  const tur = new Graphics();
  for (const [bx, by] of [[-32, -2], [32, -2], [-30, 18], [30, 18]] as Array<[number, number]>) {
    tur.circle(bx, by, 4).fill(c.dark);
    tur.circle(bx, by, 4).stroke({ color: c.accent, width: 1.1, alpha: 0.95 });
    tur.circle(bx, by, 3).fill(c.light);
    // Twin angled barrels (shorter for lower mounts)
    const blen = by < 0 ? 9 : 6;
    const dir = by < 0 ? -1 : 0.4;
    tur.rect(bx - 2.4, by + dir * blen - blen, 1.4, blen).fill(c.dark);
    tur.rect(bx + 1, by + dir * blen - blen, 1.4, blen).fill(c.dark);
    tur.circle(bx - 1.7, by + dir * blen - blen, 0.6).fill(c.accent);
    tur.circle(bx + 1.7, by + dir * blen - blen, 0.6).fill(c.accent);
  }
  root.addChild(tur);

  // Massive central plasma cannon (the dreadnought's signature weapon)
  const cn = new Graphics();
  // Recoil cradle
  cn.rect(-7, -10, 14, 10).fill(c.dark);
  cn.rect(-7, -10, 14, 10).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  // Central macro barrel
  cn.rect(-5, -30, 10, 22).fill(c.dark);
  cn.rect(-3.5, -30, 7, 18).fill(c.light);
  cn.rect(-4, -32, 8, 4).fill(c.accent);
  cn.rect(-5, -34, 10, 3).fill(c.dark);
  cn.rect(-3, -35, 6, 1.5).fill(c.accent);
  // Cooling rings on the barrel
  for (let i = 0; i < 4; i++) {
    cn.rect(-6, -26 + i * 4.5, 12, 1.2).fill(c.accent);
  }
  // Muzzle glow
  cn.circle(0, -35, 1).fill(0xffffff);
  // Side smaller barrels
  cn.rect(-10, -22, 3, 14).fill(c.dark);
  cn.rect(7, -22, 3, 14).fill(c.dark);
  cn.rect(-9.4, -22, 1.8, 12).fill(c.light);
  cn.rect(7.6, -22, 1.8, 12).fill(c.light);
  cn.circle(-8.5, -22, 1.4).fill(c.accent);
  cn.circle(8.5, -22, 1.4).fill(c.accent);
  root.addChild(cn);

  // Cockpit / armoured bridge — narrow slit visor
  const cp = new Graphics();
  cp.poly([-8, -12, 8, -12, 7, -8, -7, -8]).fill(0x000000);
  cp.poly([-7, -11.4, 7, -11.4, 6, -8.6, -6, -8.6]).fill(c.accent);
  // Mullion divisions
  for (let i = -2; i <= 2; i++) line(cp, i * 2.6, -11, i * 2.6, -9, 0x000000, 0.6, 0.9);
  cp.rect(-3, -11, 1.4, 2.4).fill({ color: 0xffffff, alpha: 0.8 });
  cp.rect(1.6, -10.5, 1, 2).fill({ color: 0xffffff, alpha: 0.6 });
  // Bridge command spire
  line(cp, 0, -12, 0, -22, c.light, 1.2, 0.9);
  cp.circle(0, -22, 1.4).fill(c.accent);
  cp.circle(0, -22, 0.7).fill(0xffffff);
  root.addChild(cp);

  // Hull running lights
  const lt = new Graphics();
  lightDot(lt, -32, 24, 1.4, 0xff4040);
  lightDot(lt, 32, 24, 1.4, 0x40ff40);
  lightDot(lt, -18, 6, 1.2, c.accent);
  lightDot(lt, 18, 6, 1.2, c.accent);
  lightDot(lt, -12, 16, 1.1, 0xfff066);
  lightDot(lt, 12, 16, 1.1, 0xfff066);
  root.addChild(lt);

  // Triple aft thrusters
  const eng = new Graphics();
  for (const ex of [-28, -4, 20]) {
    eng.rect(ex, 26, 8, 8).fill(c.dark);
    eng.rect(ex + 0.5, 27, 7, 7).fill(c.engine);
    eng.rect(ex + 1, 28, 6, 4).fill(0xffffff);
  }
  root.addChild(eng);
}

// --- 11: stealth — alien organic mantis-stealth with translucent wings ----
export function drawStealth(root: Container): void {
  const c = COL.stealth;
  softGlow(root, 0, 18, 11, c.engine, 6);
  softGlow(root, 0, -10, 14, c.accent, 7);

  // Outer membrane wings — translucent organic fins extending wide and back
  const membrane = new Graphics();
  const leftWing = [-2, -8, -16, -10, -32, 4, -34, 18, -22, 18, -10, 8];
  const rightWing = [2, -8, 16, -10, 32, 4, 34, 18, 22, 18, 10, 8];
  membrane.poly(leftWing).fill({ color: c.accent, alpha: 0.35 });
  membrane.poly(rightWing).fill({ color: c.accent, alpha: 0.35 });
  // Vein structure inside the membrane
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 5;
    membrane.moveTo(-2 - t * 4, -8 + t * 14).lineTo(-32 + t * 8, 4 + t * 10).stroke({ color: c.light, width: 0.7, alpha: 0.7 });
    membrane.moveTo(2 + t * 4, -8 + t * 14).lineTo(32 - t * 8, 4 + t * 10).stroke({ color: c.light, width: 0.7, alpha: 0.7 });
  }
  // Wing rim — sharp leading edge
  membrane.poly(leftWing).stroke({ color: c.accent, width: 1.2, alpha: 1 });
  membrane.poly(rightWing).stroke({ color: c.accent, width: 1.2, alpha: 1 });
  root.addChild(membrane);

  // Wing-tip claws (sharp angular barbs)
  const claw = new Graphics();
  claw.poly([-32, 4, -36, 12, -32, 14]).fill(c.dark);
  claw.poly([32, 4, 36, 12, 32, 14]).fill(c.dark);
  claw.circle(-35, 11, 0.6).fill(c.accent);
  claw.circle(35, 11, 0.6).fill(c.accent);
  root.addChild(claw);

  // Organic central body — segmented mantis fuselage
  const body = new Graphics();
  // Lower abdomen
  body.poly(mirroredPoly([0, 0, 8, 4, 10, 14, 4, 22])).fill(c.hull);
  body.poly(mirroredPoly([0, 0, 8, 4, 10, 14, 4, 22])).stroke({ color: c.accent, width: 1, alpha: 0.95 });
  // Thorax (upper)
  body.poly(mirroredPoly([0, -10, 7, -6, 9, 0, 7, 2])).fill(c.light);
  body.poly(mirroredPoly([0, -10, 7, -6, 9, 0, 7, 2])).stroke({ color: c.accent, width: 0.9, alpha: 0.95 });
  // Head/forward shell — organic carapace
  body.poly(mirroredPoly([0, -22, 6, -16, 6, -10])).fill(c.dark);
  body.poly(mirroredPoly([0, -22, 6, -16, 6, -10])).stroke({ color: c.accent, width: 1.1, alpha: 1 });
  // Body segment lines
  line(body, -7, -3, 7, -3, c.dark, 0.9, 0.85);
  line(body, -9, 8, 9, 8, c.dark, 0.9, 0.85);
  line(body, -7, 16, 7, 16, c.dark, 0.9, 0.75);
  root.addChild(body);

  // Predator viewport (alien eye-slit on the head)
  const eye = new Graphics();
  eye.poly([-4, -18, 4, -18, 3, -14, -3, -14]).fill(0x000000);
  eye.poly([-3.4, -17.6, 3.4, -17.6, 2.6, -14.4, -2.6, -14.4]).fill(c.accent);
  // Triple-lens eye highlight
  for (let i = -1; i <= 1; i++) {
    eye.circle(i * 1.6, -16, 0.6).fill(0xffd166);
    eye.circle(i * 1.6 - 0.2, -16.2, 0.25).fill(0xffffff);
  }
  root.addChild(eye);

  // Forward bio-weapons (organic spike emitters)
  const cn = new Graphics();
  cn.poly([-7, -8, -5, -2, -3, -8]).fill(c.dark);
  cn.poly([7, -8, 5, -2, 3, -8]).fill(c.dark);
  cn.circle(-5, -6, 0.7).fill(c.accent);
  cn.circle(5, -6, 0.7).fill(c.accent);
  root.addChild(cn);

  // Glowing dorsal stripe (biological energy channel)
  const stripe = new Graphics();
  stripe.poly([-1, -10, 1, -10, 1, 18, -1, 18]).fill({ color: c.accent, alpha: 0.7 });
  stripe.poly([-0.6, -8, 0.6, -8, 0.6, 16, -0.6, 16]).fill(0xffffff);
  root.addChild(stripe);

  // Bio-thruster — purple organic jet
  const eng = new Graphics();
  eng.rect(-7, 20, 14, 6).fill(c.dark);
  eng.rect(-6, 21, 12, 5).fill(c.engine);
  eng.rect(-5, 22, 10, 3).fill({ color: 0xc579ff, alpha: 0.95 });
  eng.rect(-4, 22.5, 8, 2).fill(0xffffff);
  root.addChild(eng);
}

// --- 12: tesla — alien plasma orb ringed by tesla-coil pylons -------------
export function drawTesla(root: Container): void {
  const c = COL.tesla;
  softGlow(root, 0, 0, 24, c.accent, 10);
  softGlow(root, 0, 0, 12, c.engine, 7);

  // Three orbital rings at different inclinations
  const rings = new Graphics();
  rings.ellipse(0, 0, 26, 10).fill({ color: c.hull, alpha: 0.85 });
  rings.ellipse(0, 0, 26, 10).stroke({ color: c.accent, width: 1.4, alpha: 0.95 });
  rings.ellipse(0, 0, 24, 9).fill({ color: c.dark, alpha: 0.7 });
  // Secondary inclined ring
  rings.ellipse(0, 0, 18, 22).stroke({ color: c.accent, width: 1.2, alpha: 0.55 });
  rings.ellipse(0, 0, 22, 14).stroke({ color: c.light, width: 0.8, alpha: 0.6 });
  // Ring segment ticks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rings.circle(Math.cos(a) * 26, Math.sin(a) * 10, 0.7).fill(c.accent);
  }
  root.addChild(rings);

  // Inner armoured sphere with hex panel grid
  const sp = new Graphics();
  sp.circle(0, 0, 14).fill(c.dark);
  sp.circle(0, 0, 12.5).fill(c.hull);
  sp.circle(-3, -3, 10).fill(c.light);
  sp.circle(0, 0, 12.5).stroke({ color: c.accent, width: 1.5, alpha: 1 });
  // Faceted hex panels (drawn as triangle slices from centre)
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2;
    sp.moveTo(0, 0)
      .lineTo(Math.cos(a0) * 11, Math.sin(a0) * 11)
      .lineTo(Math.cos(a1) * 11, Math.sin(a1) * 11)
      .stroke({ color: c.dark, width: 1, alpha: 0.85 });
  }
  // Panel bolt heads
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    sp.circle(Math.cos(a) * 8, Math.sin(a) * 8, 0.9).fill(c.accent);
  }
  root.addChild(sp);

  // Central plasma core with cross-shaped energy lattice
  const core = new Graphics();
  core.circle(0, 0, 6).fill(c.engine);
  core.circle(0, 0, 4).fill(0xffffff);
  core.circle(0, 0, 2).fill(c.accent);
  // 8-spoke energy radial
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    core.moveTo(Math.cos(a) * 1.6, Math.sin(a) * 1.6).lineTo(Math.cos(a) * 10, Math.sin(a) * 10).stroke({ color: 0xffffff, width: i % 2 === 0 ? 1.1 : 0.6, alpha: 0.85 });
  }
  root.addChild(core);

  // 6 tesla coil pylons distributed around the equator
  const coils = new Graphics();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const nx = Math.cos(a) * 26;
    const ny = Math.sin(a) * 10;
    // Pylon base
    coils.circle(nx, ny, 2.8).fill(c.dark);
    coils.circle(nx, ny, 2).fill(c.accent);
    coils.circle(nx, ny, 1).fill(0xffffff);
    // Spike tip extending outward from each pylon
    const tx = Math.cos(a) * 30;
    const ty = Math.sin(a) * 12;
    coils.poly([nx - Math.sin(a) * 1.2, ny + Math.cos(a) * 1.2, tx, ty, nx + Math.sin(a) * 1.2, ny - Math.cos(a) * 1.2]).fill(c.dark);
    coils.poly([nx - Math.sin(a) * 1.2, ny + Math.cos(a) * 1.2, tx, ty, nx + Math.sin(a) * 1.2, ny - Math.cos(a) * 1.2]).stroke({ color: c.accent, width: 0.6 });
    coils.circle(tx, ty, 0.8).fill(0xfff066);
  }
  // Lightning arcs threading the pylon ring
  for (let i = 0; i < 6; i++) {
    const a1 = (i / 6) * Math.PI * 2;
    const a2 = ((i + 1) / 6) * Math.PI * 2;
    const x1 = Math.cos(a1) * 26;
    const y1 = Math.sin(a1) * 10;
    const x2 = Math.cos(a2) * 26;
    const y2 = Math.sin(a2) * 10;
    // Jittered midpoint pulled outward
    const am = (a1 + a2) / 2;
    const mx = (x1 + x2) / 2 + Math.cos(am) * 5;
    const my = (y1 + y2) / 2 + Math.sin(am) * 3;
    coils.moveTo(x1, y1).lineTo(mx, my).lineTo(x2, y2).stroke({ color: 0xffffff, width: 1, alpha: 0.75 });
    // Branch sparks
    coils.circle(mx, my, 0.6).fill(0xffffff);
  }
  root.addChild(coils);

  // Sub-thruster jets (small, low-set, indicating slow drift)
  const eng = new Graphics();
  for (const ex of [-9, 0, 9]) {
    eng.circle(ex, 16, 1.3).fill(c.engine);
    eng.circle(ex, 16, 0.6).fill(0xffffff);
  }
  root.addChild(eng);
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
