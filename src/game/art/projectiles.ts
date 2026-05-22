import { Container, Graphics } from 'pixi.js';
import { PROJ } from '../palette';
import { softGlow } from './forge';

export function drawPlayerPulse(root: Container): void {
  softGlow(root, 0, 0, 6, PROJ.playerPulse, 6);
  const g = new Graphics();
  g.ellipse(0, 0, 2.5, 8).fill(PROJ.playerPulseCore);
  g.ellipse(0, 0, 1.5, 6).fill(0xffffff);
  root.addChild(g);
}

export function drawPlayerSpread(root: Container): void {
  softGlow(root, 0, 0, 5, PROJ.playerSpread, 5);
  const g = new Graphics();
  g.ellipse(0, 0, 2, 6).fill(0xffffff);
  g.ellipse(0, 0, 1, 4).fill(PROJ.playerSpread);
  root.addChild(g);
}

export function drawPlayerPlasma(root: Container): void {
  softGlow(root, 0, 0, 12, PROJ.playerPlasma, 7);
  const g = new Graphics();
  g.circle(0, 0, 6).fill(PROJ.playerPlasma);
  g.circle(0, 0, 4).fill(PROJ.playerPlasmaCore);
  g.circle(-1, -1, 2).fill(0xffffff);
  root.addChild(g);
}

export function drawPlayerLaserSeg(root: Container): void {
  // 8px wide vertical segment, will be tiled by laser weapon
  const g = new Graphics();
  g.rect(-1, -8, 2, 16).fill(PROJ.playerLaserCore);
  g.rect(-2.5, -8, 5, 16).fill({ color: PROJ.playerLaser, alpha: 0.5 });
  g.rect(-4, -8, 8, 16).fill({ color: PROJ.playerLaser, alpha: 0.2 });
  root.addChild(g);
}

export function drawPlayerMissile(root: Container): void {
  // Nose points UP (-Y in local coords). Sprite is rotated to face velocity.
  // Engine plume / glow at the back
  softGlow(root, 0, 12, 10, PROJ.playerMissile, 6);

  const g = new Graphics();
  // Drop shadow for depth
  g.poly([1, -14, 5, -6, 5, 8, 1, 14, -3, 8, -3, -6]).fill({ color: 0x000000, alpha: 0.35 });
  // Body — main grey hull (tall capsule with pointed nose)
  g.poly([0, -14, 4, -6, 4, 8, 0, 12, -4, 8, -4, -6]).fill(0xb8c0c8);
  g.poly([0, -14, 4, -6, 4, 8, 0, 12, -4, 8, -4, -6]).stroke({ color: 0x2a3036, width: 1 });
  // Sun-lit highlight strip down the left side
  g.poly([-2, -10, -1, -10, -1, 8, -3, 8, -3, -8]).fill(0xe8eef4);
  // Nose cone — bright tip
  g.poly([0, -14, 2.5, -8, -2.5, -8]).fill(0xfafcff);
  g.poly([0, -14, 2.5, -8, -2.5, -8]).stroke({ color: 0x2a3036, width: 0.8 });
  // Body warning stripes (orange-red bands)
  g.rect(-4, -4, 8, 2).fill(PROJ.playerMissile);
  g.rect(-4, 0, 8, 2).fill(PROJ.playerMissile);
  // Warhead window / seeker
  g.circle(0, -7, 1.4).fill(0x1a1a1a);
  g.circle(0, -7, 0.8).fill(0xff5544);
  // Side fins (2 triangular tabs near tail)
  g.poly([-4, 6, -8, 12, -4, 12]).fill(0x6a727a);
  g.poly([-4, 6, -8, 12, -4, 12]).stroke({ color: 0x2a3036, width: 0.8 });
  g.poly([4, 6, 8, 12, 4, 12]).fill(0x6a727a);
  g.poly([4, 6, 8, 12, 4, 12]).stroke({ color: 0x2a3036, width: 0.8 });
  // Mid-body fin pair (small horizontal fins higher up)
  g.poly([-4, -2, -6, 1, -4, 4]).fill(0x6a727a);
  g.poly([4, -2, 6, 1, 4, 4]).fill(0x6a727a);
  // Engine bell (dark)
  g.rect(-2.5, 11, 5, 3).fill(0x18181c);
  g.rect(-2.2, 11, 4.4, 1).fill(0x4a4a52);
  // Flame plume (orange→yellow→white)
  g.poly([-2.5, 14, 0, 22, 2.5, 14]).fill(PROJ.playerMissile);
  g.poly([-1.6, 14, 0, 19, 1.6, 14]).fill(0xffd166);
  g.poly([-0.8, 14, 0, 17, 0.8, 14]).fill(0xffffff);
  root.addChild(g);
}

export function drawPlayerWave(root: Container): void {
  softGlow(root, 0, 0, 10, PROJ.playerWave, 6);
  const g = new Graphics();
  g.ellipse(0, 0, 7, 4).fill(PROJ.playerWave);
  g.ellipse(0, 0, 5, 2).fill(0xffffff);
  root.addChild(g);
}

export function drawPlayerLightning(root: Container): void {
  softGlow(root, 0, 0, 8, PROJ.playerLightning, 6);
  const g = new Graphics();
  g.circle(0, 0, 5).fill(PROJ.playerLightning);
  g.circle(0, 0, 2.5).fill(0xffffff);
  root.addChild(g);
}

export function drawEnemyBullet(root: Container): void {
  softGlow(root, 0, 0, 5, PROJ.enemyBullet, 5);
  const g = new Graphics();
  g.ellipse(0, 0, 2.5, 5).fill(PROJ.enemyBulletCore);
  g.ellipse(0, 0, 1.5, 3.5).fill(0xffffff);
  root.addChild(g);
}

export function drawEnemyHeavy(root: Container): void {
  softGlow(root, 0, 0, 8, PROJ.enemyHeavy, 6);
  const g = new Graphics();
  g.circle(0, 0, 4).fill(PROJ.enemyHeavy);
  g.circle(-1, -1, 2).fill(PROJ.enemyBulletCore);
  root.addChild(g);
}

export function drawEnemyPlasma(root: Container): void {
  softGlow(root, 0, 0, 10, PROJ.enemyPlasma, 6);
  const g = new Graphics();
  g.circle(0, 0, 5).fill(PROJ.enemyPlasma);
  g.circle(-1, -1, 2).fill(0xffffff);
  root.addChild(g);
}

// Enemy bomb — clearly a classic cartoon-ish bomb: round body, fins on top,
// a glowing fuse spewing sparks, hazard stripe across the equator.
export function drawEnemyBomb(root: Container): void {
  // Soft glow under the body
  softGlow(root, 0, 2, 11, 0xff9233, 6);
  const g = new Graphics();
  // Body (sphere with shading)
  g.ellipse(1, 3, 8, 8).fill({ color: 0x000000, alpha: 0.45 });   // drop shadow
  g.circle(0, 2, 7).fill(0x18120c);                                // dark body
  g.circle(0, 2, 7).stroke({ color: 0x66442a, width: 1 });
  g.circle(-2, 0, 5.5).fill(0x3a2a18);                             // lit side
  g.circle(-3, -1, 3).fill(0x6a4a30);                              // highlight
  g.circle(-3.4, -1.4, 1).fill(0xffd166);                          // specular
  // Hazard stripe (orange band across equator)
  g.rect(-6.5, 1, 13, 2).fill({ color: 0xff9233, alpha: 0.95 });
  g.rect(-6.5, 1.5, 13, 1).fill({ color: 0xfff066, alpha: 0.7 });
  // Stenciled rivets along stripe
  for (let i = -2; i <= 2; i++) g.circle(i * 2.4, 2, 0.5).fill(0x18120c);
  // Fuse cap (small disc on top)
  g.rect(-2.4, -5, 4.8, 2).fill(0x3a3a44);
  g.rect(-2.4, -5, 4.8, 2).stroke({ color: 0x10080a, width: 0.6 });
  // Fuse stem
  g.rect(-0.6, -8, 1.2, 3).fill(0x6a4a30);
  // Burning fuse tip (orange/yellow with flame)
  g.poly([-1.4, -10, 1.4, -10, 0.6, -7, -0.6, -7]).fill(0xff7733);
  g.poly([-0.8, -11, 0.8, -11, 0.4, -9, -0.4, -9]).fill(0xffd166);
  g.poly([-0.3, -12, 0.3, -12, 0, -10.5]).fill(0xffffff);
  // Spark above fuse
  g.circle(0, -13, 0.6).fill(0xfff066);
  g.circle(0.6, -12.4, 0.4).fill(0xffd166);
  g.circle(-0.6, -12.6, 0.4).fill(0xffd166);
  root.addChild(g);
}

// Naval-style spike mine: dark metal sphere with 8 prominent spikes, segmented
// hull panels, a pulsing sensor eye in the centre, and warning hazard chevrons.
// Readability layers in the baked texture: outer red-orange warning halo,
// inner gold halo, then the mine itself with enlarged spikes.
export function drawMine(root: Container): void {
  // Outer "danger" halo — red-orange, large, soft. This is the primary signal
  // the player can read at a glance, even on busy backgrounds.
  softGlow(root, 0, 0, 26, 0xff3a2a, 8);
  // Inner gold halo — adds saturation and bridges to the body colour.
  softGlow(root, 0, 0, 18, PROJ.enemyMine, 8);
  const g = new Graphics();
  // Dashed "stop" warning ring around the spikes (4 thick arc segments)
  for (let i = 0; i < 4; i++) {
    const a0 = i * (Math.PI / 2) + 0.15;
    const a1 = a0 + (Math.PI / 2) - 0.30;
    g.arc(0, 0, 18, a0, a1).stroke({ color: 0xff3a2a, width: 1.8, alpha: 0.7 });
  }
  // 8 long spikes (drawn first so the body sits in front of their bases).
  // Tips slightly wider and tipped with a bright cap so they catch the eye.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const baseR = 8;
    const tipR = 16;
    const sideR = baseR + 0.5;
    const tx = Math.cos(a) * tipR;
    const ty = Math.sin(a) * tipR;
    const perpA = a + Math.PI / 2;
    const b1x = Math.cos(a) * sideR + Math.cos(perpA) * 1.9;
    const b1y = Math.sin(a) * sideR + Math.sin(perpA) * 1.9;
    const b2x = Math.cos(a) * sideR - Math.cos(perpA) * 1.9;
    const b2y = Math.sin(a) * sideR - Math.sin(perpA) * 1.9;
    g.poly([b1x, b1y, tx, ty, b2x, b2y]).fill(0x4a4a52);
    g.poly([b1x, b1y, tx, ty, b2x, b2y]).stroke({ color: 0x10080a, width: 0.8 });
    // Bright cap at the tip — high-contrast yellow dot
    g.circle(tx, ty, 1.4).fill(0xffe066);
    g.circle(tx, ty, 0.7).fill(0xffffff);
    // Highlight on lit side
    const litx = (b1x + tx) / 2 - Math.cos(a) * 0.5;
    const lity = (b1y + ty) / 2 - Math.sin(a) * 0.5;
    g.circle(litx, lity, 0.7).fill({ color: 0xb8b8c4, alpha: 0.8 });
  }
  // Body (segmented metal sphere, slightly larger)
  g.circle(0, 0, 8.5).fill(0x10080a);
  g.circle(0, 0, 8).fill(0x2a2028);
  g.circle(0, 0, 8).stroke({ color: 0x8a8a98, width: 1 });
  // Panel seams
  g.moveTo(-7.5, 0).lineTo(7.5, 0).stroke({ color: 0x10080a, width: 0.8 });
  g.moveTo(0, -7.5).lineTo(0, 7.5).stroke({ color: 0x10080a, width: 0.8 });
  // Bolts at panel intersections
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    g.circle(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 0.9).fill(0x8a8a98);
  }
  // Sensor eye — brighter, with a vivid red core
  g.circle(0, 0, 4.2).fill(0x18120c);
  g.circle(0, 0, 4.2).stroke({ color: 0xff3a2a, width: 1.2, alpha: 1 });
  g.circle(0, 0, 3).fill({ color: 0xff3a2a, alpha: 0.95 });
  g.circle(0, 0, 2).fill(0xff9a3a);
  g.circle(0, 0, 1).fill(0xffffff);
  g.circle(-0.5, -0.5, 0.5).fill(0xffffff);
  // Hazard chevrons around the equator (4 small triangles) — larger + yellow
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 6.8;
    const y = Math.sin(a) * 6.8;
    g.poly([x, y, x + Math.cos(a + 0.4) * 1.6, y + Math.sin(a + 0.4) * 1.6, x + Math.cos(a - 0.4) * 1.6, y + Math.sin(a - 0.4) * 1.6]).fill({ color: 0xfff066, alpha: 1 });
  }
  root.addChild(g);
}
