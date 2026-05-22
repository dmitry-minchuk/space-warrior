import { Graphics } from 'pixi.js';
import { GAME_WIDTH } from '../../engine/constants';
import type { Atlas } from '../art/atlas';
import type { World } from '../world';
import type { Boss, BossPart, BossPartKind, BossSpec } from '../entities/Boss';

// ---- helpers --------------------------------------------------------------

type EnemyBulletVisual = 'enemyBullet' | 'enemyHeavy' | 'enemyPlasma' | 'enemyBomb' | 'mine';
type BossProjectileOpts = {
  interceptible?: boolean;
  interceptHp?: number;
};

function spawnBullet(
  world: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  damage: number,
  visual: EnemyBulletVisual = 'enemyBullet',
  radius = 7,
  lifetime = 6,
  opts: BossProjectileOpts = {},
): void {
  const tex =
    visual === 'enemyHeavy' ? world.atlas.proj.enemyHeavy :
    visual === 'enemyPlasma' ? world.atlas.proj.enemyPlasma :
    visual === 'enemyBomb' ? world.atlas.proj.enemyBomb :
    visual === 'mine' ? world.atlas.proj.mine :
    world.atlas.proj.enemyBullet;
  const p = world.projectilePool.spawn({
    x, y, vx, vy, damage,
    owner: 'enemy',
    texture: tex,
    visual,
    radius,
    lifetime,
    rotateToVelocity: visual !== 'mine' && visual !== 'enemyBomb',
    spin: visual === 'mine' ? 1 : 0,
    interceptible: opts.interceptible ?? visual === 'enemyBullet',
    interceptHp: opts.interceptHp,
  }, world.layers.projectiles);
  world.projectiles.push(p);
}

function weaveTo(b: Boss, dt: number, amp: number, freq: number, centerY: number): void {
  b.state.phase = (b.state.phase ?? 0) + dt * freq;
  b.x = GAME_WIDTH / 2 + Math.sin(b.state.phase) * amp;
  b.y += (centerY - b.y) * Math.min(1, dt * 1.5);
}

function setBossPhase(b: Boss, phase: number, world?: World): void {
  if (b.phase === phase) return;
  b.phase = phase;
  b.combatTimer = 0.25;
  b.combatPhase = 0;
  b.combatSub = 0;
  b.burstLeft = 0;
  b.state.beat = 0;
  b.state.side = 0.6;
  b.state.spawn = 1.2;
  if (world?.telemetry) world.telemetry.recordBossPhase(b.spec.key, phase);
}

function aimDir(b: Boss, world: World): { vx: number; vy: number } {
  const dx = world.player.x - b.x;
  const dy = world.player.y - b.y;
  const len = Math.hypot(dx, dy) || 1;
  return { vx: dx / len, vy: dy / len };
}

function predictDir(b: Boss, world: World, projSpeed: number): { vx: number; vy: number } {
  const px = world.player.x;
  const py = world.player.y;
  const pvx = world.player.vx;
  const pvy = world.player.vy;
  const dx = px - b.x;
  const dy = py - b.y;
  const t = Math.hypot(dx, dy) / projSpeed;
  const lx = px + pvx * t * 0.7;
  const ly = py + pvy * t * 0.7;
  const ldx = lx - b.x;
  const ldy = ly - b.y;
  const len = Math.hypot(ldx, ldy) || 1;
  return { vx: ldx / len, vy: ldy / len };
}

function fireRadial(world: World, b: Boss, n: number, speed: number, damage: number, visual: EnemyBulletVisual = 'enemyBullet', radius = 7, rotation = 0): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rotation;
    spawnBullet(world, b.x, b.y, Math.cos(a) * speed, Math.sin(a) * speed, damage, visual, radius);
  }
}

function fireFanDown(world: World, b: Boss, n: number, spread: number, speed: number, damage: number, fromOffsetY = 40): void {
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
    const a = Math.PI / 2 + t * spread;
    spawnBullet(world, b.x, b.y + fromOffsetY, Math.cos(a) * speed, Math.sin(a) * speed, damage);
  }
}

function fireFanFromPoint(world: World, x: number, y: number, n: number, centerAngle: number, spread: number, speed: number, damage: number, visual: EnemyBulletVisual = 'enemyBullet', radius = 7): void {
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
    const a = centerAngle + t * spread;
    spawnBullet(world, x, y, Math.cos(a) * speed, Math.sin(a) * speed, damage, visual, radius);
  }
}

function fireAimedFromPoint(world: World, x: number, y: number, speed: number, damage: number, visual: EnemyBulletVisual = 'enemyBullet', radius = 7): void {
  const dx = world.player.x - x;
  const dy = world.player.y - y;
  const len = Math.hypot(dx, dy) || 1;
  spawnBullet(world, x, y, (dx / len) * speed, (dy / len) * speed, damage, visual, radius);
}

function fireAimed(world: World, b: Boss, speed: number, damage: number, visual: EnemyBulletVisual = 'enemyBullet'): void {
  const d = aimDir(b, world);
  spawnBullet(world, b.x, b.y + 30, d.vx * speed, d.vy * speed, damage, visual);
}

function fireFromPoint(world: World, x: number, y: number, vx: number, vy: number, damage: number, visual: EnemyBulletVisual = 'enemyBullet'): void {
  spawnBullet(world, x, y, vx, vy, damage, visual);
}

function spawnMinion(world: World, archKey: string, x: number, y: number, opts: Record<string, number | string> = {}): void {
  const arch = world.archetypes[archKey];
  if (!arch) return;
  const e = world.enemyPool.spawn(arch, x, y, world.layers.entities, opts);
  e.baseX = x;
  world.enemies.push(e);
}

// ---- Destructible parts ----------------------------------------------------
// Specs feed directly into `initBossParts`. Each spec yields one BossPart
// with its overlay graphic and damage routing pre-wired. The boss script is
// responsible for reading `b.state.broken_<id>` and adapting attacks.

interface PartSpec {
  kind: BossPartKind;
  id: string;
  ox: number;
  oy: number;
  radius: number;
  hp: number;
}

// Accent colours by slot — match the README slot legend so they read at a glance.
const PART_ACCENT: Record<BossPartKind, number> = {
  T: 0xff6633, // turret pod      — orange
  S: 0x6cdfff, // shield gen      — cyan
  A: 0xa0a0c0, // armor plate     — gunmetal
  E: 0xffb066, // engine module   — amber
  M: 0xff4d6a, // missile pod     — magenta-red
  P: 0xfff066, // sensor / scope  — yellow
  H: 0x66ffcb, // hatch / spawner — green-cyan
};

/** Draw a small overlay icon for a part, sized by its hit radius. Each kind
 *  gets a quick-read silhouette so players can tell modules apart at a glance. */
function drawPartIcon(g: Graphics, kind: BossPartKind, radius: number, accent: number): void {
  g.clear();
  // Outer hit ring — communicates the routable area.
  g.circle(0, 0, radius).stroke({ color: accent, width: 1.6, alpha: 0.85 });
  g.circle(0, 0, radius - 2).fill({ color: accent, alpha: 0.18 });
  const r = radius * 0.65;
  switch (kind) {
    case 'T':
      // Stubby twin barrels
      g.rect(-r * 0.55, -r, r * 0.4, r * 1.6).fill(accent);
      g.rect(r * 0.15, -r, r * 0.4, r * 1.6).fill(accent);
      g.circle(0, 0, r * 0.45).fill(0x000000);
      break;
    case 'S':
      // Hex shield emblem
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const a2 = ((i + 1) / 6) * Math.PI * 2;
        g.moveTo(Math.cos(a) * r, Math.sin(a) * r).lineTo(Math.cos(a2) * r, Math.sin(a2) * r).stroke({ color: accent, width: 1.4, alpha: 1 });
      }
      g.circle(0, 0, r * 0.4).fill(accent);
      break;
    case 'A':
      // Plate chevron
      g.poly([-r, r * 0.6, 0, -r * 0.6, r, r * 0.6, r * 0.6, r * 0.6, 0, -r * 0.2, -r * 0.6, r * 0.6]).fill(accent);
      break;
    case 'E':
      // Triple thruster bars
      for (let i = -1; i <= 1; i++) g.rect(i * r * 0.5 - r * 0.18, -r * 0.6, r * 0.36, r * 1.2).fill(accent);
      break;
    case 'M':
      // Two missile silhouettes
      for (const sx of [-r * 0.4, r * 0.4]) {
        g.poly([sx, -r, sx - r * 0.25, r * 0.4, sx + r * 0.25, r * 0.4]).fill(accent);
        g.rect(sx - 0.6, r * 0.4, 1.2, r * 0.5).fill(accent);
      }
      break;
    case 'P':
      // Eye/scope reticle
      g.circle(0, 0, r * 0.65).stroke({ color: accent, width: 1.4 });
      g.circle(0, 0, r * 0.3).fill(accent);
      g.moveTo(-r, 0).lineTo(r, 0).stroke({ color: accent, width: 0.9, alpha: 0.7 });
      g.moveTo(0, -r).lineTo(0, r).stroke({ color: accent, width: 0.9, alpha: 0.7 });
      break;
    case 'H':
      // Hatch trapezoid
      g.poly([-r * 0.8, -r * 0.5, r * 0.8, -r * 0.5, r * 0.5, r * 0.5, -r * 0.5, r * 0.5]).fill(accent);
      g.rect(-r * 0.1, -r * 0.5, r * 0.2, r).fill(0x000000);
      break;
  }
}

/** Initialise destructible parts on a boss. Idempotent by `key` — call with
 *  the same key every tick to avoid rebuilds; change the key (e.g. on
 *  Architect form transitions) to swap the entire roster. The default key is
 *  derived from spec ids so static rosters always rebuild only once. */
function initBossParts(b: Boss, world: World, specs: PartSpec[], key?: string): void {
  const effectiveKey = key ?? specs.map((s) => s.id).join('|');
  if (b.partsKey === effectiveKey && b.parts.length === specs.length) return;
  // Different layout: tear down anything that's still attached, then rebuild.
  for (const part of b.parts) {
    if (part.graphics.parent) part.graphics.parent.removeChild(part.graphics);
    part.graphics.destroy();
  }
  b.parts = [];
  // Reset per-part broken flags for ids we're about to introduce — otherwise
  // a previously-broken part with the same id would come back broken.
  for (const spec of specs) {
    if (b.state[`broken_${spec.id}`]) b.state[`broken_${spec.id}`] = 0;
  }
  const layer = b.sprite.parent;
  for (const spec of specs) {
    const accent = PART_ACCENT[spec.kind];
    const g = new Graphics();
    drawPartIcon(g, spec.kind, spec.radius, accent);
    g.position.set(b.x + spec.ox, b.y + spec.oy);
    if (layer) layer.addChild(g);
    const part: BossPart = {
      kind: spec.kind,
      id: spec.id,
      ox: spec.ox,
      oy: spec.oy,
      radius: spec.radius,
      hp: spec.hp,
      maxHp: spec.hp,
      alive: true,
      blocks: spec.kind === 'S' || spec.kind === 'A',
      graphics: g,
      smokeT: 0,
      accent,
    };
    b.parts.push(part);
  }
  b.partsKey = effectiveKey;
}

// ---- 1: Patrol Cruiser — twin forward cannons + wing-tip turrets --------
function bossPatrolCruiser(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Forward cannon battery — sits above the hull; while alive it provides
    // the aimed triplet attack. Broken → no aimed triplet, just side fans.
    { kind: 'T', id: 'T0', ox: 0, oy: -38, radius: 22, hp: Math.round(b.maxHp * 0.18) },
    // Rear thruster — broken → boss stops weaving (frozen target).
    { kind: 'E', id: 'E0', ox: 0, oy: 42, radius: 20, hp: Math.round(b.maxHp * 0.15) },
  ]);
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.25 ? 1 : 2, world);
  const engineLive = !b.state.broken_E0;
  const turretLive = !b.state.broken_T0;
  // Engine break freezes the weave so the boss becomes a sitting target.
  if (engineLive) {
    weaveTo(b, dt, b.phase === 0 ? 220 : b.phase === 1 ? 270 : 315, b.phase === 0 ? 0.55 : b.phase === 1 ? 0.78 : 0.95, 130);
  } else {
    b.y += (130 - b.y) * Math.min(1, dt * 1.5);
  }
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const beat = (b.state.beat ?? 0) as number;
    if (b.phase === 0) {
      // Turret-driven forward shots gated by T0; side fans always fire.
      if (turretLive) {
        fireFromPoint(world, b.x - 14, b.y - 38, -25, 320, 10);
        fireFromPoint(world, b.x + 14, b.y - 38, 25, 320, 10);
      }
      fireAimedFromPoint(world, b.x - 44, b.y + 20, 250, 8);
      fireAimedFromPoint(world, b.x + 44, b.y + 20, 250, 8);
      b.combatTimer = 1.0;
    } else if (beat % 2 === 0) {
      fireFanFromPoint(world, b.x - 44, b.y + 18, 3, Math.PI / 2 - 0.35, 0.26, 280, 8);
      fireFanFromPoint(world, b.x + 44, b.y + 18, 3, Math.PI / 2 + 0.35, 0.26, 280, 8);
      if (turretLive) {
        fireFromPoint(world, b.x - 14, b.y - 38, -75, 330, 10);
        fireFromPoint(world, b.x + 14, b.y - 38, 75, 330, 10);
      }
      b.combatTimer = 0.8;
    } else if (b.phase === 1) {
      fireFanDown(world, b, 5, 0.72, 285, 8, 22);
      if (turretLive) fireAimedFromPoint(world, b.x, b.y - 16, 320, 10);
      b.combatTimer = 0.95;
    } else if (beat % 3 === 1) {
      fireRadial(world, b, 10, 210, 7, 'enemyBullet', 7, b.age * 0.7);
      fireAimedFromPoint(world, b.x - 44, b.y + 18, 330, 9);
      fireAimedFromPoint(world, b.x + 44, b.y + 18, 330, 9);
      b.combatTimer = 0.85;
    } else {
      fireFanFromPoint(world, b.x - 48, b.y + 18, 4, Math.PI / 2 - 0.48, 0.34, 300, 8);
      fireFanFromPoint(world, b.x + 48, b.y + 18, 4, Math.PI / 2 + 0.48, 0.34, 300, 8);
      if (turretLive) spawnBullet(world, b.x, b.y - 42, 0, 360, 11, 'enemyPlasma', 8);
      b.combatTimer = 0.75;
    }
    b.state.beat = beat + 1;
  }
}

// ---- 2: Asteroid Hauler — heavy chunks from launchers + clamp turrets ---
function bossAsteroidHauler(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Towed asteroid acts as an armor plate covering the top half of the boss.
    // While alive it blocks all top-side hull damage; breaking it triggers the
    // open-core 4 s window AND permanently unlocks 1.5× hull damage from top.
    { kind: 'A', id: 'A_top', ox: 0, oy: -68, radius: 38, hp: Math.round(b.maxHp * 0.28) },
    // Side clamp turret pair — driver of the launcher salvos.
    { kind: 'T', id: 'T_launch', ox: 0, oy: -48, radius: 32, hp: Math.round(b.maxHp * 0.16) },
  ]);
  // Permanent top-zone weakness once the asteroid is gone.
  if (b.state.broken_A_top && !b.state.hullMul) b.state.hullMul = 0.5;
  const launcherLive = !b.state.broken_T_launch;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.5 ? 0 : 1, world);
  weaveTo(b, dt, 260, b.phase === 0 ? 0.4 : 0.58, 140);
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const beat = (b.state.beat ?? 0) as number;
    if (b.phase === 0) {
      // Heavy launcher salvo only fires while the launcher turret is intact.
      if (launcherLive) {
        fireFromPoint(world, b.x - 38, b.y - 54, -45, 220, 18, 'enemyHeavy');
        fireFromPoint(world, b.x + 38, b.y - 54, 45, 220, 18, 'enemyHeavy');
      }
      for (let i = -1; i <= 1; i++) fireAimedFromPoint(world, b.x + i * 24, b.y, 260, 9);
      b.combatTimer = 1.7;
    } else if (beat % 3 === 0) {
      fireRadial(world, b, 10, 190, 8, 'enemyBullet', 7, b.age * 0.35);
      b.combatTimer = 1.0;
    } else {
      if (launcherLive) {
        fireFanFromPoint(world, b.x - 40, b.y - 48, 3, Math.PI / 2 - 0.18, 0.32, 250, 14, 'enemyHeavy', 8);
        fireFanFromPoint(world, b.x + 40, b.y - 48, 3, Math.PI / 2 + 0.18, 0.32, 250, 14, 'enemyHeavy', 8);
      }
      fireAimedFromPoint(world, b.x, b.y + 16, 310, 10);
      b.combatTimer = 1.25;
    }
    b.state.beat = beat + 1;
  }
}

// ---- 3: Cyber Crab — claws fire beams, body lays mines ------------------
function bossCyberCrab(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Left and right claw beams. Each broken claw silences its side fire. If
    // both are gone the boss fast-forwards into desperation phase as a reward.
    { kind: 'T', id: 'T_left', ox: -72, oy: -32, radius: 28, hp: Math.round(b.maxHp * 0.18) },
    { kind: 'T', id: 'T_right', ox: 72, oy: -32, radius: 28, hp: Math.round(b.maxHp * 0.18) },
  ]);
  const leftLive = !b.state.broken_T_left;
  const rightLive = !b.state.broken_T_right;
  const bothDown = !leftLive && !rightLive;
  const f = b.hp / b.maxHp;
  // Force desperation (phase 2) once both claws are off — the player earned it.
  setBossPhase(b, bothDown ? 2 : f > 0.66 ? 0 : f > 0.33 ? 1 : 2, world);
  b.state.phase = (b.state.phase ?? 0) + dt * 0.7;
  b.x = GAME_WIDTH / 2 + Math.sin(b.state.phase) * (b.phase === 2 ? 340 : 300);
  b.y += (160 - b.y) * Math.min(1, dt * 1.5);
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    if (b.phase === 0) {
      if (leftLive) fireAimedFromPoint(world, b.x - 72, b.y - 32, 360, 12, 'enemyPlasma', 8);
      if (rightLive) fireAimedFromPoint(world, b.x + 72, b.y - 32, 360, 12, 'enemyPlasma', 8);
      fireFanDown(world, b, 3, 0.45, 300, 9, 12);
      b.combatTimer = 1.0;
    } else if (b.phase === 1) {
      if (leftLive) fireFanFromPoint(world, b.x - 72, b.y - 32, 3, Math.PI / 2 - 0.32, 0.28, 330, 10, 'enemyPlasma', 8);
      if (rightLive) fireFanFromPoint(world, b.x + 72, b.y - 32, 3, Math.PI / 2 + 0.32, 0.28, 330, 10, 'enemyPlasma', 8);
      fireAimedFromPoint(world, b.x, b.y + 20, 310, 8);
      b.combatTimer = 0.9;
    } else {
      fireFanDown(world, b, 5, 0.9, 300, 9, 16);
      if (leftLive) fireAimedFromPoint(world, b.x - 72, b.y - 32, 390, 12, 'enemyPlasma', 8);
      if (rightLive) fireAimedFromPoint(world, b.x + 72, b.y - 32, 390, 12, 'enemyPlasma', 8);
      b.combatTimer = 0.8;
    }
  }
  b.state.mine = (b.state.mine ?? 0) - dt;
  if (b.state.mine <= 0) {
    const count = b.phase === 2 ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i - 1;
      spawnBullet(world, b.x, b.y + 30, t * 85, 55 + Math.abs(t) * 18, 18, 'mine', 10, 16);
    }
    b.state.mine = b.phase === 0 ? 3.0 : b.phase === 1 ? 2.4 : 2.0;
  }
}

// ---- 4: Lunar Sentinel — eye charges a sweeping wide laser --------------
function bossLunarSentinel(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Dorsal shield generator — blocks while alive (hull takes 0.7×), break
    // opens the 4 s core window for burst damage.
    { kind: 'S', id: 'S_dorsal', ox: 0, oy: -42, radius: 24, hp: Math.round(b.maxHp * 0.22) },
    // Chin mini-cannons drive the lower sweep fire. Broken → no chin shots.
    { kind: 'T', id: 'T_chin', ox: 0, oy: 30, radius: 22, hp: Math.round(b.maxHp * 0.15) },
  ]);
  const chinLive = !b.state.broken_T_chin;
  const f = b.hp / b.maxHp;
  // Earlier phase-1 trigger so the fight escalates well before HP halves.
  setBossPhase(b, f > 0.65 ? 0 : 1, world);
  weaveTo(b, dt, 200, b.phase === 0 ? 0.45 : 0.62, 150);
  b.combatTimer -= dt;
  // Phase tracking: 0 idle / 1 charging / 2 firing
  if (b.combatPhase === 0) {
    if (b.combatTimer <= 0) {
      b.combatPhase = 1;
      b.state.charge = b.phase === 0 ? 1.25 : 0.95;
      // Lock direction at start of charge
      const d = aimDir(b, world);
      b.state.aimX = d.vx;
      b.state.aimY = d.vy;
    }
    // Side turrets fire occasionally during cooldown
    b.state.sideShot = (b.state.sideShot ?? 0) - dt;
    if (b.state.sideShot <= 0) {
      fireFromPoint(world, b.x - 34, b.y + 14, b.phase === 0 ? -30 : -85, 280, 8);
      fireFromPoint(world, b.x + 34, b.y + 14, b.phase === 0 ? 30 : 85, 280, 8);
      b.state.sideShot = b.phase === 0 ? 1.15 : 0.85;
    }
  } else if (b.combatPhase === 1) {
    b.state.charge -= dt;
    if (b.state.charge <= 0) {
      // Sweeping wide laser — fire many plasma rounds along the locked direction
      const ax = b.state.aimX as number;
      const ay = b.state.aimY as number;
      const baseAngle = Math.atan2(ay, ax);
      const width = b.phase === 0 ? 3 : 4;
      for (let i = -width; i <= width; i++) {
        const a = baseAngle + i * (b.phase === 0 ? 0.09 : 0.11);
        spawnBullet(world, b.x, b.y + 6, Math.cos(a) * 500, Math.sin(a) * 500, 12, 'enemyPlasma', 9);
      }
      world.audio.play('sniper_fire', { volume: 0.3 });
      b.combatPhase = 0;
      b.combatTimer = b.phase === 0 ? 2.4 : 1.7;
    }
  }
  // Lower mini-cannons fire from the chin turret — gated by T_chin.
  b.state.mini = (b.state.mini ?? 0) - dt;
  if (b.state.mini <= 0 && chinLive) {
    fireFromPoint(world, b.x - 16, b.y + 32, b.phase === 0 ? -30 : -70, 280, 7);
    fireFromPoint(world, b.x + 16, b.y + 32, b.phase === 0 ? 30 : 70, 280, 7);
    b.state.mini = b.phase === 0 ? 1.3 : 1.0;
  }
  // ---- Surprise mechanics ------------------------------------------------
  // The old script was a stable two-pulse rhythm; the player just held a lane
  // and chipped. These three timers inject new threats on different cadences
  // so the fight reads as escalating beats rather than a metronome.

  // Twin heavy salvo from the dorsal pod — predictive shots that punish
  // standing still. Phase 1 throws four shots in a fan instead of two.
  b.state.salvo = (b.state.salvo ?? 4.0) - dt;
  if (b.state.salvo <= 0) {
    const d = predictDir(b, world, 280);
    const baseA = Math.atan2(d.vy, d.vx);
    const lanes = b.phase === 0 ? 2 : 4;
    const spread = b.phase === 0 ? 0.18 : 0.26;
    for (let i = 0; i < lanes; i++) {
      const t = (i - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2);
      const a = baseA + t * spread;
      spawnBullet(world, b.x, b.y - 30, Math.cos(a) * 280, Math.sin(a) * 280, 14, 'enemyHeavy', 8);
    }
    b.state.salvo = b.phase === 0 ? 6.5 : 4.5;
  }

  // Periodic radial pulse — pushes the player out of any sticky corner. The
  // ring telegraphs by audio and is dodgeable with one quick lateral.
  b.state.ring = (b.state.ring ?? 5.0) - dt;
  if (b.state.ring <= 0) {
    const count = b.phase === 0 ? 10 : 14;
    const speed = b.phase === 0 ? 200 : 240;
    fireRadial(world, b, count, speed, 10, 'enemyBullet', 7, b.age * 0.4);
    world.audio.play('boss_warning', { volume: 0.18 });
    b.state.ring = b.phase === 0 ? 9.0 : 5.5;
  }

  // Phase 1 desperation summons — drone-shooter pair appears below the boss
  // to flank the player. Adds spatial pressure while sweep + ring keep firing.
  if (b.phase === 1) {
    b.state.summon = (b.state.summon ?? 8.0) - dt;
    if (b.state.summon <= 0) {
      spawnMinion(world, 'drone-shooter', b.x - 80, b.y + 50);
      spawnMinion(world, 'drone-shooter', b.x + 80, b.y + 50);
      b.state.summon = 14.0;
    }
  }
}

// ---- 5: Hive Carrier — constant drone spawn + side turrets + bays -------
function bossHiveCarrier(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Belly drone hatch — broken stops all drone production immediately.
    { kind: 'H', id: 'H_hatch', ox: 0, oy: 30, radius: 24, hp: Math.round(b.maxHp * 0.20) },
    // Forward deck gun — broken silences the fan/aimed volley above.
    { kind: 'T', id: 'T_deck', ox: 0, oy: -30, radius: 22, hp: Math.round(b.maxHp * 0.17) },
  ]);
  const hatchLive = !b.state.broken_H_hatch;
  const deckLive = !b.state.broken_T_deck;
  const f = b.hp / b.maxHp;
  // Wider/earlier phase-2 trigger so desperation engages before HP drains.
  setBossPhase(b, f > 0.7 ? 0 : f > 0.4 ? 1 : 2, world);
  weaveTo(b, dt, b.phase === 2 ? 320 : 280, 0.45 + b.phase * 0.1, 150);
  // Drone production — gated by H_hatch.
  b.state.spawn = (b.state.spawn ?? 0) - dt;
  if (b.state.spawn <= 0 && hatchLive) {
    spawnMinion(world, 'drone', b.x - 60, b.y + 30);
    spawnMinion(world, 'drone', b.x + 60, b.y + 30);
    if (b.phase >= 1) spawnMinion(world, 'drone-shooter', b.x, b.y + 30);
    b.state.spawn = b.phase === 0 ? 3.4 : b.phase === 1 ? 2.7 : 2.2;
  }
  // 4 side turrets fire in pairs — independent of the deck gun.
  b.state.side = (b.state.side ?? 0) - dt;
  if (b.state.side <= 0) {
    const sideAngle = b.phase === 0 ? 0.12 : 0.32;
    fireFanFromPoint(world, b.x - 64, b.y + 6, 2 + b.phase, Math.PI / 2 - sideAngle, 0.22, 275, 8);
    fireFanFromPoint(world, b.x + 64, b.y + 6, 2 + b.phase, Math.PI / 2 + sideAngle, 0.22, 275, 8);
    b.state.side = b.phase === 0 ? 1.5 : b.phase === 1 ? 1.2 : 0.95;
  }
  // Forward cannons fan — gated by T_deck.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0 && deckLive) {
    if (b.phase === 2) {
      fireFanDown(world, b, 7, 1.05, 260, 9);
      fireAimedFromPoint(world, b.x, b.y - 30, 330, 10, 'enemyPlasma', 8);
    } else {
      fireFanDown(world, b, b.phase === 0 ? 5 : 6, b.phase === 0 ? 0.65 : 0.85, 245, 9);
    }
    b.combatTimer = b.phase === 0 ? 1.7 : b.phase === 1 ? 1.35 : 1.1;
  }
}

// ---- 6: Wreck Behemoth — chaotic damaged-cruiser barrage ---------------
function bossWreckBehemoth(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Forward cannons L/R drive the aimed volleys.
    { kind: 'T', id: 'T_left', ox: -30, oy: -48, radius: 22, hp: Math.round(b.maxHp * 0.14) },
    { kind: 'T', id: 'T_right', ox: 30, oy: -48, radius: 22, hp: Math.round(b.maxHp * 0.14) },
    // Damaged side plate — once broken, hull takes +50% damage permanently.
    { kind: 'A', id: 'A_side', ox: -52, oy: 0, radius: 28, hp: Math.round(b.maxHp * 0.22) },
  ]);
  if (b.state.broken_A_side && !b.state.hullMul) b.state.hullMul = 0.5;
  const leftLive = !b.state.broken_T_left;
  const rightLive = !b.state.broken_T_right;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2, world);
  const amp = b.phase === 0 ? 220 : b.phase === 1 ? 280 : 340;
  const freq = b.phase === 0 ? 0.28 : b.phase === 1 ? 0.38 : 0.5;
  weaveTo(b, dt, amp, freq, 160);
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    // Debris is hull-driven (not from a turret) — always fires.
    const debris = b.phase === 0 ? 4 : b.phase === 1 ? 6 : 8;
    for (let i = 0; i < debris; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 180 + Math.random() * 120;
      spawnBullet(world, b.x + (Math.random() - 0.5) * 80, b.y + 40, Math.cos(a) * speed, Math.sin(a) * speed, 12, 'enemyHeavy', 8);
    }
    // Aimed cannon volley — each lane only fires if the matching turret survives.
    const d = aimDir(b, world);
    const lanes = b.phase < 2 ? 1 : 2;
    for (let lane = 0; lane < lanes; lane++) {
      const jitter = lane === 0 ? 0 : (Math.random() - 0.5) * 30;
      if (leftLive) fireFromPoint(world, b.x - 6 + jitter, b.y - 50, d.vx * 320, d.vy * 320, 12);
      if (rightLive) fireFromPoint(world, b.x + 6 + jitter, b.y - 50, d.vx * 320, d.vy * 320, 12);
    }
    b.combatTimer = b.phase === 0 ? 0.95 : b.phase === 1 ? 0.75 : 0.55;
  }
  // Radial blast — hull-driven, always fires from phase 1.
  b.state.fan = (b.state.fan ?? 0) - dt;
  if (b.state.fan <= 0 && b.phase >= 1) {
    fireRadial(world, b, b.phase === 2 ? 18 : 14, 200, 12, 'enemyBullet', 7, b.age * 0.3);
    b.state.fan = b.phase === 2 ? 1.4 : 2.4;
  }
}

// ---- 7: Mine Mother — rotating mine pattern + drill beam ----------------
function bossMineMother(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Forward drill core fires the plasma stream.
    { kind: 'T', id: 'T_drill', ox: 0, oy: -30, radius: 22, hp: Math.round(b.maxHp * 0.16) },
    // Side mine launchers — both must be broken to silence the mine ring.
    { kind: 'H', id: 'H_left', ox: -42, oy: 12, radius: 22, hp: Math.round(b.maxHp * 0.12) },
    { kind: 'H', id: 'H_right', ox: 42, oy: 12, radius: 22, hp: Math.round(b.maxHp * 0.12) },
  ]);
  const drillLive = !b.state.broken_T_drill;
  const mineLaunchers = (b.state.broken_H_left ? 0 : 1) + (b.state.broken_H_right ? 0 : 1);
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2, world);
  weaveTo(b, dt, 260, b.phase === 0 ? 0.35 : b.phase === 1 ? 0.5 : 0.7, 170);
  // Drill core fires a beam-like volley — gated by T_drill.
  b.state.beam = (b.state.beam ?? 0) - dt;
  if (b.state.beam <= 0 && drillLive) {
    const d = aimDir(b, world);
    const shots = b.phase === 0 ? 5 : b.phase === 1 ? 6 : 7;
    for (let i = 0; i < shots; i++) {
      const a = Math.atan2(d.vy, d.vx) + (i - (shots - 1) / 2) * 0.06;
      spawnBullet(world, b.x, b.y + 6, Math.cos(a) * 420, Math.sin(a) * 420, 12, 'enemyPlasma', 8);
    }
    // Phase 2 fires the drill beam twice in quick succession (split burst).
    if (b.phase === 2) {
      b.state.beam = 1.85;
      b.state.drillFollow = 0.18;
    } else {
      b.state.beam = b.phase === 0 ? 1.8 : 1.3;
    }
  }
  if ((b.state.drillFollow ?? 0) > 0) {
    b.state.drillFollow -= dt;
    if (b.state.drillFollow <= 0) {
      const d = aimDir(b, world);
      for (let i = 0; i < 5; i++) {
        const a = Math.atan2(d.vy, d.vx) + (i - 2) * 0.04;
        spawnBullet(world, b.x, b.y + 6, Math.cos(a) * 420, Math.sin(a) * 420, 10, 'enemyPlasma', 8);
      }
    }
  }
  // Rotating mine pattern — scaled by surviving launchers.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0 && mineLaunchers > 0) {
    const phaseCount = b.phase === 0 ? 5 : b.phase === 1 ? 6 : 8;
    const mineCount = Math.max(2, Math.round(phaseCount * (mineLaunchers / 2)));
    const rotSpeed = b.phase === 0 ? 0.6 : b.phase === 1 ? 0.9 : 1.3;
    const rotation = b.age * rotSpeed;
    for (let i = 0; i < mineCount; i++) {
      const a = (i / mineCount) * Math.PI * 2 + rotation;
      const vx = Math.cos(a) * 80;
      const vy = Math.sin(a) * 80 + 40;
      spawnBullet(world, b.x, b.y + 30, vx, vy, 18, 'mine', 10, 14);
    }
    b.combatTimer = b.phase === 0 ? 3.0 : b.phase === 1 ? 2.3 : 1.7;
  }
  // Aimed shots from satellite turrets — fires a pair starting in phase 1.
  b.state.sat = (b.state.sat ?? 0) - dt;
  if (b.state.sat <= 0) {
    fireAimed(world, b, 300, 10);
    if (b.phase >= 1) {
      const d = aimDir(b, world);
      const off = b.phase === 2 ? 0.18 : 0.12;
      const a = Math.atan2(d.vy, d.vx);
      spawnBullet(world, b.x, b.y + 30, Math.cos(a - off) * 300, Math.sin(a - off) * 300, 10);
      spawnBullet(world, b.x, b.y + 30, Math.cos(a + off) * 300, Math.sin(a + off) * 300, 10);
    }
    b.state.sat = b.phase === 2 ? 0.7 : 1.0;
  }
}

// ---- 8: Ghost Sniper — long telegraph + teleport + small turret fire ----
function bossGhostSniper(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Scope orb — broken silences the locked charge volley; sniper falls back
    // to a blind forward fan instead.
    { kind: 'P', id: 'P_scope', ox: 0, oy: -12, radius: 18, hp: Math.round(b.maxHp * 0.18) },
    // Sub-cannons L/R — pair gating like Cyber Crab.
    { kind: 'T', id: 'T_sub_left', ox: -20, oy: 8, radius: 14, hp: Math.round(b.maxHp * 0.10) },
    { kind: 'T', id: 'T_sub_right', ox: 20, oy: 8, radius: 14, hp: Math.round(b.maxHp * 0.10) },
  ]);
  const scopeLive = !b.state.broken_P_scope;
  const subLeftLive = !b.state.broken_T_sub_left;
  const subRightLive = !b.state.broken_T_sub_right;
  const f = b.hp / b.maxHp;
  const ph = f > 0.6 ? 0 : f > 0.3 ? 1 : 2;
  if (b.phase !== ph) {
    b.phase = ph;
    b.state.beat = 0;
  }
  // Teleport with fade after each shot — cooldown shrinks with phase.
  b.state.tp = (b.state.tp ?? 4.0) - dt;
  if (b.state.tp <= 0) {
    b.x = 200 + Math.random() * (GAME_WIDTH - 400);
    b.y = 110 + Math.random() * 140;
    b.sprite.alpha = 0;
    b.state.fade = 1;
    b.state.tp = ph === 0 ? 4.0 : ph === 1 ? 3.0 : 2.1;
  }
  if ((b.state.fade ?? 0) > 0) {
    b.state.fade -= dt;
    b.sprite.alpha = Math.max(0, 1 - b.state.fade);
  }
  // Telegraph long laser charge — charge time shortens, volley widens per phase.
  if (b.combatPhase === 0) {
    b.combatTimer -= dt;
    if (b.combatTimer <= 0 && b.sprite.alpha > 0.9) {
      b.combatPhase = 1;
      b.state.charge = ph === 0 ? 1.4 : ph === 1 ? 1.1 : 0.85;
      const d = aimDir(b, world);
      b.state.aimX = d.vx;
      b.state.aimY = d.vy;
    }
  } else {
    b.state.charge -= dt;
    if (b.state.charge <= 0) {
      if (scopeLive) {
        // Scope intact: locked aimed volley with widening fan.
        const ax = b.state.aimX as number;
        const ay = b.state.aimY as number;
        const lanes = ph === 0 ? 3 : ph === 1 ? 5 : 7;
        const half = (lanes - 1) / 2;
        for (let i = 0; i < lanes; i++) {
          const a = Math.atan2(ay, ax) + (i - half) * 0.06;
          spawnBullet(world, b.x, b.y, Math.cos(a) * 620, Math.sin(a) * 620, 22, 'enemyPlasma', 9);
        }
        if (ph === 2) {
          const d2 = aimDir(b, world);
          spawnBullet(world, b.x, b.y, d2.vx * 520, d2.vy * 520, 16, 'enemyPlasma', 8);
        }
      } else {
        // Scope gone: blind forward fan, much easier to predict.
        for (let i = -2; i <= 2; i++) {
          const a = Math.PI / 2 + i * 0.18;
          spawnBullet(world, b.x, b.y, Math.cos(a) * 380, Math.sin(a) * 380, 14, 'enemyPlasma', 8);
        }
      }
      world.audio.play('sniper_fire', { volume: 0.4 });
      b.combatPhase = 0;
      b.combatTimer = ph === 0 ? 1.0 : ph === 1 ? 0.75 : 0.55;
    }
  }
  // Inboard sub-cannons fire — independently gated by their pods.
  b.state.sub = (b.state.sub ?? 0) - dt;
  if (b.state.sub <= 0 && b.sprite.alpha > 0.5) {
    if (subLeftLive) fireFromPoint(world, b.x - 20, b.y + 8, 0, 280, 8);
    if (subRightLive) fireFromPoint(world, b.x + 20, b.y + 8, 0, 280, 8);
    if (ph === 2) {
      if (subLeftLive) fireFromPoint(world, b.x - 36, b.y + 8, 0, 280, 7);
      if (subRightLive) fireFromPoint(world, b.x + 36, b.y + 8, 0, 280, 7);
    }
    b.state.sub = ph === 0 ? 1.0 : ph === 1 ? 0.85 : 0.7;
  }
}

// ---- 9: Kamikaze Queen — spawns kamikaze pods + side spores -------------
function bossKamikazeQueen(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Egg pods L/R drive kamikaze production.
    { kind: 'H', id: 'H_left', ox: -50, oy: -10, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    { kind: 'H', id: 'H_right', ox: 50, oy: -10, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Forward fan turret.
    { kind: 'T', id: 'T_fan', ox: 0, oy: 18, radius: 22, hp: Math.round(b.maxHp * 0.16) },
  ]);
  const fanLive = !b.state.broken_T_fan;
  const leftPodLive = !b.state.broken_H_left;
  const rightPodLive = !b.state.broken_H_right;
  const podLive = (leftPodLive ? 1 : 0) + (rightPodLive ? 1 : 0);
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2, world);
  weaveTo(b, dt, b.phase === 0 ? 280 : b.phase === 1 ? 340 : 400, b.phase === 0 ? 0.45 : b.phase === 1 ? 0.6 : 0.8, 140);
  // Spawn kamikaze waves — only live pods participate.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0 && podLive > 0) {
    if (leftPodLive) spawnMinion(world, 'kamikaze', b.x - 50, b.y + 30);
    if (rightPodLive) spawnMinion(world, 'kamikaze', b.x + 50, b.y + 30);
    if (b.phase >= 1 && podLive === 2) spawnMinion(world, 'kamikaze', b.x, b.y + 30);
    if (b.phase === 2 && podLive === 2) {
      spawnMinion(world, 'kamikaze', b.x - 100, b.y + 30);
      spawnMinion(world, 'kamikaze', b.x + 100, b.y + 30);
    }
    b.combatTimer = b.phase === 0 ? 5.0 : b.phase === 1 ? 3.6 : 2.6;
  }
  // Side-pod plasma shots — each gated by its pod.
  b.state.shot = (b.state.shot ?? 0) - dt;
  if (b.state.shot <= 0) {
    const d = aimDir(b, world);
    if (leftPodLive) fireFromPoint(world, b.x - 50, b.y - 10, d.vx * 280, d.vy * 280, 10, 'enemyPlasma');
    if (rightPodLive) fireFromPoint(world, b.x + 50, b.y - 10, d.vx * 280, d.vy * 280, 10, 'enemyPlasma');
    if (b.phase === 2 && fanLive) {
      fireFromPoint(world, b.x, b.y - 20, d.vx * 320, d.vy * 320, 12, 'enemyPlasma');
    }
    b.state.shot = b.phase === 0 ? 1.4 : b.phase === 1 ? 1.05 : 0.8;
  }
  // Forward fan — gated by T_fan.
  b.state.fan = (b.state.fan ?? 0) - dt;
  if (b.state.fan <= 0 && fanLive) {
    const n = b.phase === 0 ? 5 : b.phase === 1 ? 7 : 9;
    const spread = b.phase === 0 ? 0.6 : b.phase === 1 ? 0.75 : 0.9;
    fireFanDown(world, b, n, spread, 280, 10);
    b.state.fan = b.phase === 0 ? 2.4 : b.phase === 1 ? 1.9 : 1.4;
  }
}

// ---- 10: Saturn Dreadnought — 4 turret salvo, spinal lance, missiles ----
function bossSaturnDreadnought(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Spinal lance mount — broken silences the 500-speed plasma lance.
    { kind: 'T', id: 'T_spinal', ox: 0, oy: -54, radius: 22, hp: Math.round(b.maxHp * 0.18) },
    // Missile pods L/R.
    { kind: 'M', id: 'M_left', ox: -72, oy: 0, radius: 22, hp: Math.round(b.maxHp * 0.14) },
    { kind: 'M', id: 'M_right', ox: 72, oy: 0, radius: 22, hp: Math.round(b.maxHp * 0.14) },
  ]);
  const lanceLive = !b.state.broken_T_spinal;
  const missLeftLive = !b.state.broken_M_left;
  const missRightLive = !b.state.broken_M_right;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2, world);
  weaveTo(b, dt, 240, b.phase === 0 ? 0.32 : b.phase === 1 ? 0.45 : 0.6, 180);
  // 4 main turrets — independent of parts (hull-mounted).
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const turrets: Array<[number, number]> = [[-18, -18], [18, -18], [-22, 22], [22, 22]];
    const idx = (b.state.turIdx ?? 0) as number;
    const t = turrets[idx];
    const d = aimDir(b, world);
    fireFromPoint(world, b.x + t[0], b.y + t[1], d.vx * 360, d.vy * 360, 14, 'enemyHeavy');
    if (b.phase === 2) {
      const a = Math.atan2(d.vy, d.vx);
      const side = idx % 2 === 0 ? 0.3 : -0.3;
      spawnBullet(world, b.x + t[0], b.y + t[1], Math.cos(a + side) * 320, Math.sin(a + side) * 320, 10);
    }
    b.state.turIdx = (idx + 1) % 4;
    b.combatTimer = b.phase === 0 ? 0.38 : b.phase === 1 ? 0.28 : 0.22;
  }
  // Spinal lance — gated by T_spinal.
  b.state.lance = (b.state.lance ?? 0) - dt;
  if (b.state.lance <= 0 && lanceLive) {
    spawnBullet(world, b.x, b.y - 80, 0, 500, 24, 'enemyPlasma', 9);
    if (b.phase === 2) {
      spawnBullet(world, b.x - 24, b.y - 80, -40, 500, 18, 'enemyPlasma', 8);
      spawnBullet(world, b.x + 24, b.y - 80, 40, 500, 18, 'enemyPlasma', 8);
    }
    b.state.lance = b.phase === 0 ? 3.0 : b.phase === 1 ? 2.0 : 1.4;
  }
  // Side missile pods — each side independent.
  b.state.missiles = (b.state.missiles ?? 0) - dt;
  if (b.state.missiles <= 0 && (missLeftLive || missRightLive)) {
    const rows = b.phase === 0 ? 4 : b.phase === 1 ? 5 : 6;
    for (let i = 0; i < rows; i++) {
      const offsY = i * 4;
      if (missLeftLive) fireFromPoint(world, b.x - 72, b.y + offsY, -80, 240, 10, 'enemyHeavy');
      if (missRightLive) fireFromPoint(world, b.x + 72, b.y + offsY, 80, 240, 10, 'enemyHeavy');
    }
    b.state.missiles = b.phase === 0 ? 4.0 : b.phase === 1 ? 2.8 : 2.0;
  }
}

// ---- 11: Phantom — phasing + radial beams ------------------------------
function bossPhantom(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Phase generator — while alive, boss flickers through invisible windows.
    // Broken → always-corporeal (sprite alpha clamped at 1), so it's always a
    // valid target. Doubles as a shield-style block (blocks while alive).
    { kind: 'S', id: 'S_phase', ox: 0, oy: -50, radius: 20, hp: Math.round(b.maxHp * 0.18) },
    // Forward emitter — drives the third "tracking shot" in phase 2.
    { kind: 'T', id: 'T_emitter', ox: 0, oy: 24, radius: 18, hp: Math.round(b.maxHp * 0.14) },
  ]);
  const phaseGenLive = !b.state.broken_S_phase;
  const emitterLive = !b.state.broken_T_emitter;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2, world);
  // Visibility cycle only runs while the phase generator is alive.
  if (phaseGenLive) {
    b.state.cyc = (b.state.cyc ?? 0) + dt;
    const period = b.phase === 0 ? 3.8 : b.phase === 1 ? 3.0 : 2.4;
    const cyc = (b.state.cyc % period) / period;
    if (cyc < 0.25) b.sprite.alpha = 0.18;
    else if (cyc < 0.4) b.sprite.alpha = 0.18 + (cyc - 0.25) * 5.5;
    else if (cyc < 0.75) b.sprite.alpha = 1;
    else b.sprite.alpha = 1 - (cyc - 0.75) * 4;
  } else {
    b.sprite.alpha = 1;
  }
  weaveTo(b, dt, 320, b.phase === 0 ? 0.55 : b.phase === 1 ? 0.7 : 0.9, 150);
  // Fires when corporeal (or always, if generator is gone).
  if (b.sprite.alpha > 0.6) {
    b.combatTimer -= dt;
    if (b.combatTimer <= 0) {
      const rings = b.phase === 0 ? 1 : b.phase === 1 ? 2 : 3;
      for (let r = 0; r < rings; r++) {
        const speed = 240 - r * 40;
        const off = (r % 2 === 0 ? 0 : Math.PI / 8);
        fireRadial(world, b, 8, speed, 12, 'enemyPlasma', 8, b.age * 0.3 + off);
      }
      if (b.phase === 2 && emitterLive) fireAimed(world, b, 360, 14, 'enemyPlasma');
      b.combatTimer = b.phase === 0 ? 2.2 : b.phase === 1 ? 1.6 : 1.1;
    }
  }
}

// ---- 12: Storm Sphere — 8-direction tesla bursts + chain lightning -----
function bossStormSphere(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Lightning emitter on top — aimed plasma shot.
    { kind: 'P', id: 'P_emitter', ox: 0, oy: -52, radius: 20, hp: Math.round(b.maxHp * 0.14) },
    // Energy shell — blocking. Break opens core window AND silences the
    // counter-rotating second ring (P1+).
    { kind: 'S', id: 'S_shell', ox: 0, oy: 0, radius: 32, hp: Math.round(b.maxHp * 0.24) },
    // Tesla aimer drives the chain-lightning beam pair in phase 2.
    { kind: 'T', id: 'T_aimer', ox: 0, oy: 30, radius: 20, hp: Math.round(b.maxHp * 0.14) },
  ]);
  const emitterLive = !b.state.broken_P_emitter;
  const shellLive = !b.state.broken_S_shell;
  const aimerLive = !b.state.broken_T_aimer;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2, world);
  weaveTo(b, dt, 200, b.phase === 0 ? 0.4 : b.phase === 1 ? 0.55 : 0.75, 170);
  // 8 tesla coil tips fire radially. Counter-rotating ring requires the shell.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const rot = b.age * 0.4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rot;
      spawnBullet(world, b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, Math.cos(a) * 260, Math.sin(a) * 260, 14, 'enemyPlasma', 8);
    }
    if (b.phase >= 1 && shellLive) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - rot + Math.PI / 8;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 200, Math.sin(a) * 200, 12, 'enemyPlasma', 8);
      }
    }
    if (b.phase === 2) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + rot * 1.4;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 150, Math.sin(a) * 150, 9, 'enemyPlasma', 7);
      }
    }
    b.combatTimer = b.phase === 0 ? 1.5 : b.phase === 1 ? 1.2 : 0.9;
  }
  // Aimed chain lightning shot — driven by emitter; pair shots in P2 need the
  // tesla aimer.
  b.state.aim = (b.state.aim ?? 0) - dt;
  if (b.state.aim <= 0 && emitterLive) {
    fireAimed(world, b, 380, 14, 'enemyPlasma');
    if (b.phase === 2 && aimerLive) {
      const d = aimDir(b, world);
      const a = Math.atan2(d.vy, d.vx);
      spawnBullet(world, b.x, b.y + 30, Math.cos(a + 0.18) * 380, Math.sin(a + 0.18) * 380, 12, 'enemyPlasma');
      spawnBullet(world, b.x, b.y + 30, Math.cos(a - 0.18) * 380, Math.sin(a - 0.18) * 380, 12, 'enemyPlasma');
    }
    b.state.aim = b.phase === 0 ? 1.1 : b.phase === 1 ? 0.85 : 0.65;
  }
}

// ---- 13: Blazing Citadel — 6 turret salvo + mortar bombs + flame ------
// 4 phases: armoured salvo, mortar fire, flame perimeter, overload.
function bossBlazingCitadel(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Side mortar bays L/R — each disables half the underbelly bomb columns.
    { kind: 'T', id: 'T_left_mortar', ox: -38, oy: 50, radius: 22, hp: Math.round(b.maxHp * 0.12) },
    { kind: 'T', id: 'T_right_mortar', ox: 38, oy: 50, radius: 22, hp: Math.round(b.maxHp * 0.12) },
    // Front armor plate — blocking; broken adds +50% hull damage.
    { kind: 'A', id: 'A_front', ox: 0, oy: -56, radius: 26, hp: Math.round(b.maxHp * 0.22) },
    // Engine ring — broken freezes the weave.
    { kind: 'E', id: 'E_ring', ox: 0, oy: 60, radius: 22, hp: Math.round(b.maxHp * 0.15) },
  ]);
  if (b.state.broken_A_front && !b.state.hullMul) b.state.hullMul = 0.5;
  const engineLive = !b.state.broken_E_ring;
  const leftMortarLive = !b.state.broken_T_left_mortar;
  const rightMortarLive = !b.state.broken_T_right_mortar;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3, world);
  if (engineLive) {
    weaveTo(b, dt, 240, b.phase === 0 ? 0.3 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.5 : 0.65, 170);
  } else {
    b.y += (170 - b.y) * Math.min(1, dt * 1.5);
  }
  const turrets: Array<[number, number]> = [[-38, 24], [0, 26], [38, 24], [-28, -4], [28, -4], [0, -56]];
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const d = aimDir(b, world);
    for (const t of turrets) {
      fireFromPoint(world, b.x + t[0], b.y + t[1], d.vx * 280, d.vy * 280, 10);
    }
    if (b.phase === 3) {
      const a = Math.atan2(d.vy, d.vx);
      for (const t of turrets) {
        spawnBullet(world, b.x + t[0], b.y + t[1], Math.cos(a + 0.18) * 260, Math.sin(a + 0.18) * 260, 8);
      }
    }
    b.combatTimer = b.phase === 0 ? 1.7 : b.phase === 1 ? 1.35 : b.phase === 2 ? 1.05 : 0.8;
  }
  // Mortar columns — left side bays own the left columns, right own right.
  b.state.mortar = (b.state.mortar ?? 0) - dt;
  if (b.state.mortar <= 0 && (leftMortarLive || rightMortarLive)) {
    const cols = b.phase >= 2 ? 5 : 3;
    const half = (cols - 1) / 2;
    for (let i = 0; i < cols; i++) {
      const off = i - half;
      if (off < 0 && !leftMortarLive) continue;
      if (off > 0 && !rightMortarLive) continue;
      spawnBullet(world, b.x + off * 30, b.y + 50, off * 100, 200, 16, 'enemyBomb', 8, 6);
    }
    b.state.mortar = b.phase === 0 ? 2.4 : b.phase === 1 ? 2.0 : b.phase === 2 ? 1.5 : 1.1;
  }
  // Flame jets — each side gated by its mortar (they share the same housing).
  b.state.flame = (b.state.flame ?? 0) - dt;
  if (b.state.flame <= 0 && b.phase >= 1) {
    const cnt = b.phase === 3 ? 9 : 6;
    for (let i = 0; i < cnt; i++) {
      const t = i / (cnt - 1);
      if (leftMortarLive) fireFromPoint(world, b.x - 62 + (-1 + t * 2) * 8, b.y + 54, (-1 + t * 2) * 60 - 80, 320, 8, 'enemyHeavy');
      if (rightMortarLive) fireFromPoint(world, b.x + 62 + (-1 + t * 2) * 8, b.y + 54, (-1 + t * 2) * 60 + 80, 320, 8, 'enemyHeavy');
    }
    b.state.flame = b.phase === 1 ? 2.6 : b.phase === 2 ? 2.0 : 1.4;
  }
}

// ---- 14: Gravity Lord — orbital platforms + spiral + gravity pull ------
// 4 phases: spiral, dual-spiral, pull-up, collapse.
function bossGravityLord(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Gravity well generator (top spire) — broken disables the player pull.
    { kind: 'M', id: 'M_well', ox: 0, oy: -56, radius: 20, hp: Math.round(b.maxHp * 0.15) },
    // Orbital platforms L/R — silence half the platform volley each.
    { kind: 'T', id: 'T_left', ox: -60, oy: 0, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    { kind: 'T', id: 'T_right', ox: 60, oy: 0, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Central core armor — blocking; broken adds +50% hull damage.
    { kind: 'A', id: 'A_core', ox: 0, oy: 0, radius: 28, hp: Math.round(b.maxHp * 0.22) },
  ]);
  if (b.state.broken_A_core && !b.state.hullMul) b.state.hullMul = 0.5;
  const wellLive = !b.state.broken_M_well;
  const platLeftLive = !b.state.broken_T_left;
  const platRightLive = !b.state.broken_T_right;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3, world);
  weaveTo(b, dt, 240, b.phase === 0 ? 0.32 : b.phase === 1 ? 0.42 : b.phase === 2 ? 0.55 : 0.7, 180);
  // Spiral fire — hull-driven, always fires.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const rotSpeed = b.phase === 0 ? 0.9 : b.phase === 1 ? 1.15 : b.phase === 2 ? 1.4 : 1.7;
    const rot = b.age * rotSpeed;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rot;
      spawnBullet(world, b.x, b.y, Math.cos(a) * 220, Math.sin(a) * 220, 12, 'enemyPlasma', 8);
    }
    if (b.phase >= 1) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - rot + Math.PI / 12;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 180, Math.sin(a) * 180, 9, 'enemyPlasma', 7);
      }
    }
    b.combatTimer = b.phase === 0 ? 0.85 : b.phase === 1 ? 0.7 : b.phase === 2 ? 0.55 : 0.4;
  }
  // Orbital platforms fire — each side gated by its part. Top/bottom platforms
  // are tied to the live count so they fade alongside the sides.
  b.state.orbit = (b.state.orbit ?? 0) - dt;
  if (b.state.orbit <= 0 && (platLeftLive || platRightLive)) {
    const d = aimDir(b, world);
    if (platLeftLive) fireFromPoint(world, b.x - 60, b.y + 0, d.vx * 300, d.vy * 300, 12, 'enemyPlasma');
    if (platRightLive) fireFromPoint(world, b.x + 60, b.y + 0, d.vx * 300, d.vy * 300, 12, 'enemyPlasma');
    // Vertical platforms only when both sides are still alive.
    if (platLeftLive && platRightLive) {
      fireFromPoint(world, b.x, b.y - 38, d.vx * 300, d.vy * 300, 12, 'enemyPlasma');
      fireFromPoint(world, b.x, b.y + 38, d.vx * 300, d.vy * 300, 12, 'enemyPlasma');
    }
    b.state.orbit = b.phase === 0 ? 2.2 : b.phase === 1 ? 1.8 : b.phase === 2 ? 1.4 : 1.1;
  }
  // Gravity pull — gated by M_well.
  if (wellLive) {
    const dx = b.x - world.player.x;
    const dy = b.y - world.player.y;
    const len = Math.hypot(dx, dy) || 1;
    const pull = b.phase === 0 ? 35 : b.phase === 1 ? 55 : b.phase === 2 ? 75 : 100;
    world.player.vx += (dx / len) * pull * dt;
    world.player.vy += (dy / len) * pull * dt;
  }
}

// ---- 15: Hive Mind — spore launchers + drone swarms + neural beams -----
// 4 phases: probing, swarm escalation, elite summon, neural overload.
function bossHiveMind(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Drone spawner hatch.
    { kind: 'H', id: 'H_spawner', ox: 0, oy: 42, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Neural beam emitter.
    { kind: 'P', id: 'P_neural', ox: 0, oy: 30, radius: 18, hp: Math.round(b.maxHp * 0.12) },
    // Spore launcher (front-centre).
    { kind: 'T', id: 'T_spore', ox: 0, oy: -42, radius: 20, hp: Math.round(b.maxHp * 0.14) },
    // Carapace — blocking; broken adds +50% hull damage.
    { kind: 'A', id: 'A_carapace', ox: 0, oy: 0, radius: 28, hp: Math.round(b.maxHp * 0.22) },
  ]);
  if (b.state.broken_A_carapace && !b.state.hullMul) b.state.hullMul = 0.5;
  const spawnerLive = !b.state.broken_H_spawner;
  const neuralLive = !b.state.broken_P_neural;
  const sporeLive = !b.state.broken_T_spore;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3, world);
  weaveTo(b, dt, 220, b.phase === 0 ? 0.38 : b.phase === 1 ? 0.5 : b.phase === 2 ? 0.62 : 0.8, 170);
  // Drone summoning — gated by H_spawner.
  b.state.spawn = (b.state.spawn ?? 0) - dt;
  if (b.state.spawn <= 0 && spawnerLive) {
    spawnMinion(world, 'drone', b.x - 70, b.y + 40);
    spawnMinion(world, 'drone', b.x + 70, b.y + 40);
    if (b.phase >= 1) spawnMinion(world, 'drone-shooter', b.x, b.y + 40);
    if (b.phase >= 2) {
      spawnMinion(world, 'drone-cross', b.x - 110, b.y + 40);
      spawnMinion(world, 'drone-cross', b.x + 110, b.y + 40);
    }
    if (b.phase === 3) spawnMinion(world, 'drone-lane', b.x, b.y + 60);
    b.state.spawn = b.phase === 0 ? 2.6 : b.phase === 1 ? 2.0 : b.phase === 2 ? 1.6 : 1.2;
  }
  // Spore launchers — gated by T_spore.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0 && sporeLive) {
    const launchers: Array<[number, number]> = [[-40, -36], [40, -36], [0, -42]];
    const spread = b.phase === 0 ? 0.25 : b.phase === 1 ? 0.35 : b.phase === 2 ? 0.45 : 0.6;
    for (const p of launchers) {
      for (let i = -1; i <= 1; i++) {
        const a = Math.PI / 2 + i * spread;
        spawnBullet(world, b.x + p[0], b.y + p[1], Math.cos(a) * 240, Math.sin(a) * 240, 10, 'enemyPlasma');
      }
    }
    b.combatTimer = b.phase === 0 ? 1.9 : b.phase === 1 ? 1.5 : b.phase === 2 ? 1.2 : 0.9;
  }
  // Neural beam — gated by P_neural.
  b.state.beam = (b.state.beam ?? 0) - dt;
  if (b.state.beam <= 0 && neuralLive) {
    fireAimed(world, b, 380, 14, 'enemyPlasma');
    if (b.phase === 3) {
      const d = aimDir(b, world);
      const a = Math.atan2(d.vy, d.vx);
      spawnBullet(world, b.x, b.y + 30, Math.cos(a + 0.22) * 360, Math.sin(a + 0.22) * 360, 12, 'enemyPlasma');
      spawnBullet(world, b.x, b.y + 30, Math.cos(a - 0.22) * 360, Math.sin(a - 0.22) * 360, 12, 'enemyPlasma');
    }
    b.state.beam = b.phase === 0 ? 1.3 : b.phase === 1 ? 1.0 : b.phase === 2 ? 0.8 : 0.6;
  }
}

// ---- 16: Event Horizon — spiral + gravity pull --------------------------
// 4 phases: spiral, counter-spiral, lance pressure, accretion.
function bossEventHorizon(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Gravity emitter — bottom; broken disables the player pull.
    { kind: 'M', id: 'M_grav', ox: 0, oy: 56, radius: 22, hp: Math.round(b.maxHp * 0.14) },
    // Forward cannons L/R.
    { kind: 'T', id: 'T_left', ox: -36, oy: -42, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    { kind: 'T', id: 'T_right', ox: 36, oy: -42, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Event shield — blocking, removes the slow spiral wall and opens core.
    { kind: 'S', id: 'S_event', ox: 0, oy: 0, radius: 32, hp: Math.round(b.maxHp * 0.22) },
  ]);
  const gravLive = !b.state.broken_M_grav;
  const leftCannonLive = !b.state.broken_T_left;
  const rightCannonLive = !b.state.broken_T_right;
  const shieldLive = !b.state.broken_S_event;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3, world);
  weaveTo(b, dt, 260, b.phase === 0 ? 0.3 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.5 : 0.65, 170);
  // Multi-spiral — second/third spirals unlock at higher phases. The dense
  // outer wall (phase 2+) is shield-fed and dies with it.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const rot = b.age * 1.3;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rot;
      spawnBullet(world, b.x, b.y, Math.cos(a) * 260, Math.sin(a) * 260, 12, 'enemyPlasma', 8);
    }
    if (b.phase >= 1) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - rot;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 200, Math.sin(a) * 200, 10, 'enemyPlasma', 8);
      }
    }
    if (b.phase >= 2 && shieldLive) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rot * 1.6;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 140, Math.sin(a) * 140, 8, 'enemyPlasma', 7);
      }
    }
    b.combatTimer = b.phase === 0 ? 1.2 : b.phase === 1 ? 0.95 : b.phase === 2 ? 0.75 : 0.55;
  }
  // Forward cannons — each gated by its part.
  b.state.fwd = (b.state.fwd ?? 0) - dt;
  if (b.state.fwd <= 0 && (leftCannonLive || rightCannonLive)) {
    const d = predictDir(b, world, 360);
    const lanes = b.phase >= 2 ? 5 : 3;
    const half = (lanes - 1) / 2;
    for (let i = 0; i < lanes; i++) {
      const off = i - half;
      if (off < 0 && !leftCannonLive) continue;
      if (off > 0 && !rightCannonLive) continue;
      fireFromPoint(world, b.x + off * 6, b.y - 50, d.vx * 360 + off * 20, d.vy * 360, 14, 'enemyHeavy');
    }
    b.state.fwd = b.phase === 0 ? 1.6 : b.phase === 1 ? 1.3 : b.phase === 2 ? 1.0 : 0.75;
  }
  // Gravity pull — gated by M_grav.
  if (gravLive) {
    const dx = b.x - world.player.x;
    const dy = b.y - world.player.y;
    const len = Math.hypot(dx, dy) || 1;
    const pull = b.phase === 0 ? 45 : b.phase === 1 ? 65 : b.phase === 2 ? 85 : 110;
    world.player.vx += (dx / len) * pull * dt;
    world.player.vy += (dy / len) * pull * dt;
  }
}

// ---- 17: Factory Core — manufactures elites + corner turrets ----------
// 4 phases: tooling, mass production, elite line, total recall.
function bossFactoryCore(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Belly hatch — drives elite production.
    { kind: 'H', id: 'H_factory', ox: 0, oy: 40, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Corner turret pairs L/R (top + bottom corners on each side).
    { kind: 'T', id: 'T_corner_left', ox: -40, oy: -4, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    { kind: 'T', id: 'T_corner_right', ox: 40, oy: -4, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Belly armor — blocking; broken adds +50% hull damage.
    { kind: 'A', id: 'A_belly', ox: 0, oy: 0, radius: 30, hp: Math.round(b.maxHp * 0.22) },
  ]);
  if (b.state.broken_A_belly && !b.state.hullMul) b.state.hullMul = 0.5;
  const factoryLive = !b.state.broken_H_factory;
  const cornerLeftLive = !b.state.broken_T_corner_left;
  const cornerRightLive = !b.state.broken_T_corner_right;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3, world);
  weaveTo(b, dt, 200, b.phase === 0 ? 0.28 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.55 : 0.7, 180);
  // Elite production — gated by H_factory.
  b.state.spawn = (b.state.spawn ?? 0) - dt;
  if (b.state.spawn <= 0 && factoryLive) {
    const pool: string[][] = [
      ['fighter', 'interceptor'],
      ['fighter', 'interceptor', 'elite-fighter'],
      ['elite-fighter', 'elite-interceptor'],
      ['elite-fighter', 'elite-interceptor', 'elite-bomber'],
    ];
    const list = pool[b.phase];
    const k = list[Math.floor(Math.random() * list.length)];
    spawnMinion(world, k, b.x - 100, b.y + 40);
    spawnMinion(world, k, b.x + 100, b.y + 40);
    if (b.phase === 3) {
      const k2 = list[Math.floor(Math.random() * list.length)];
      spawnMinion(world, k2, b.x, b.y + 40);
    }
    b.state.spawn = b.phase === 0 ? 3.8 : b.phase === 1 ? 3.0 : b.phase === 2 ? 2.3 : 1.6;
  }
  // Corner turrets — left/right sides gate the diagonal beats independently.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0 && (cornerLeftLive || cornerRightLive)) {
    const corners: Array<[number, number]> = [[-40, -44], [40, -44], [-40, 36], [40, 36]];
    const idx = (b.state.cIdx ?? 0) as number;
    const c = corners[idx];
    const sideLive = c[0] < 0 ? cornerLeftLive : cornerRightLive;
    const d = aimDir(b, world);
    if (sideLive) fireFromPoint(world, b.x + c[0], b.y + c[1], d.vx * 320, d.vy * 320, 12);
    if (b.phase >= 2) {
      const c2 = corners[(idx + 2) % 4];
      const side2Live = c2[0] < 0 ? cornerLeftLive : cornerRightLive;
      if (side2Live) fireFromPoint(world, b.x + c2[0], b.y + c2[1], d.vx * 320, d.vy * 320, 12);
    }
    b.state.cIdx = (idx + 1) % 4;
    b.combatTimer = b.phase === 0 ? 0.5 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.32 : 0.24;
  }
  // Belly fan — hull-driven, always fires.
  b.state.fan = (b.state.fan ?? 0) - dt;
  if (b.state.fan <= 0) {
    const n = b.phase === 0 ? 7 : b.phase === 1 ? 9 : b.phase === 2 ? 11 : 13;
    fireFanDown(world, b, n, 1.0 + b.phase * 0.1, 260, 12, 48);
    b.state.fan = b.phase === 0 ? 2.5 : b.phase === 1 ? 2.0 : b.phase === 2 ? 1.6 : 1.2;
  }
}

// ---- 18: Imperial Flagship — 8 turrets + spinal + missiles -------------
// 4 phases: salvo, missile pressure, broadside, overload.
function bossImperialFlagship(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Missile pods L/R — silence one side of the 200-speed missile salvo.
    { kind: 'M', id: 'M_left', ox: -70, oy: 18, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    { kind: 'M', id: 'M_right', ox: 70, oy: 18, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Turret cluster mast — slows the turret beat by 50% when broken.
    { kind: 'T', id: 'T_cluster', ox: 0, oy: -50, radius: 22, hp: Math.round(b.maxHp * 0.15) },
    // Engine bank — broken freezes the weave.
    { kind: 'E', id: 'E_bank', ox: 0, oy: 56, radius: 22, hp: Math.round(b.maxHp * 0.14) },
  ]);
  const missLeftLive = !b.state.broken_M_left;
  const missRightLive = !b.state.broken_M_right;
  const clusterLive = !b.state.broken_T_cluster;
  const engineLive = !b.state.broken_E_bank;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3, world);
  if (engineLive) {
    weaveTo(b, dt, 200, b.phase === 0 ? 0.25 : b.phase === 1 ? 0.34 : b.phase === 2 ? 0.46 : 0.6, 170);
  } else {
    b.y += (170 - b.y) * Math.min(1, dt * 1.5);
  }
  const turrets: Array<[number, number]> = [
    [-28, -32], [28, -32], [-38, -10], [38, -10],
    [-46, 18], [46, 18], [-24, 40], [24, 40],
  ];
  // Turret beat — cluster damage slows the cadence.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const beat = (b.state.beat ?? 0) as number;
    const groupSize = b.phase === 0 ? 2 : b.phase === 1 ? 3 : b.phase === 2 ? 4 : 4;
    const d = aimDir(b, world);
    const start = (beat * groupSize) % turrets.length;
    for (let i = 0; i < groupSize; i++) {
      const t = turrets[(start + i) % turrets.length];
      fireFromPoint(world, b.x + t[0], b.y + t[1], d.vx * 320, d.vy * 320, 12, 'enemyHeavy');
    }
    b.state.beat = beat + 1;
    const base = b.phase === 0 ? 0.4 : b.phase === 1 ? 0.32 : b.phase === 2 ? 0.26 : 0.2;
    b.combatTimer = clusterLive ? base : base * 1.6;
  }
  // Spinal lance — hull-driven, always fires.
  b.state.lance = (b.state.lance ?? 0) - dt;
  if (b.state.lance <= 0) {
    spawnBullet(world, b.x, b.y - 84, 0, 540, 26, 'enemyPlasma', 10);
    if (b.phase >= 2) {
      spawnBullet(world, b.x - 32, b.y - 80, -60, 540, 18, 'enemyPlasma', 9);
      spawnBullet(world, b.x + 32, b.y - 80, 60, 540, 18, 'enemyPlasma', 9);
    }
    if (b.phase === 3) {
      spawnBullet(world, b.x - 64, b.y - 70, -120, 520, 14, 'enemyPlasma', 8);
      spawnBullet(world, b.x + 64, b.y - 70, 120, 520, 14, 'enemyPlasma', 8);
    }
    b.state.lance = b.phase === 0 ? 3.2 : b.phase === 1 ? 2.4 : b.phase === 2 ? 1.7 : 1.2;
  }
  // Missile salvos — each side gated by its pod.
  b.state.missiles = (b.state.missiles ?? 0) - dt;
  if (b.state.missiles <= 0 && (missLeftLive || missRightLive)) {
    const rows = b.phase === 0 ? 5 : b.phase === 1 ? 7 : b.phase === 2 ? 9 : 11;
    for (let i = 0; i < rows; i++) {
      const offsY = i * 4;
      if (missLeftLive) fireFromPoint(world, b.x - 70, b.y + offsY, -120, 220, 12, 'enemyHeavy');
      if (missRightLive) fireFromPoint(world, b.x + 70, b.y + offsY, 120, 220, 12, 'enemyHeavy');
    }
    b.state.missiles = b.phase === 0 ? 4.2 : b.phase === 1 ? 3.2 : b.phase === 2 ? 2.4 : 1.8;
  }
}

// ---- 19: Citadel Guardian — 8 perimeter turrets in waves ---------------
// 4 phases: probing fire, full perimeter, ring saturation, citadel lockdown.
function bossCitadelGuardian(b: Boss, dt: number, world: World): void {
  initBossParts(b, world, [
    // Citadel shield — blocking; broken halves perimeter pair count and opens core.
    { kind: 'S', id: 'S_citadel', ox: 0, oy: 0, radius: 32, hp: Math.round(b.maxHp * 0.24) },
    // Perimeter turret pairs L/R — each silences half the rotating ring beats.
    { kind: 'T', id: 'T_per_left', ox: -60, oy: 0, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    { kind: 'T', id: 'T_per_right', ox: 60, oy: 0, radius: 22, hp: Math.round(b.maxHp * 0.13) },
    // Central eye — drives the aimed inner shot.
    { kind: 'P', id: 'P_eye', ox: 0, oy: 30, radius: 18, hp: Math.round(b.maxHp * 0.12) },
  ]);
  const shieldLive = !b.state.broken_S_citadel;
  const perLeftLive = !b.state.broken_T_per_left;
  const perRightLive = !b.state.broken_T_per_right;
  const eyeLive = !b.state.broken_P_eye;
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3, world);
  weaveTo(b, dt, 220, b.phase === 0 ? 0.35 : b.phase === 1 ? 0.5 : b.phase === 2 ? 0.65 : 0.85, 170);
  // Perimeter turret beat — each diametric pair is left or right side.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0 && (perLeftLive || perRightLive)) {
    const turRotation = b.age * 0.3;
    const beat = (b.state.beat ?? 0) as number;
    const phasePairs = b.phase === 0 ? 1 : b.phase === 1 ? 2 : b.phase === 2 ? 3 : 4;
    const pairs = shieldLive ? phasePairs : Math.max(1, phasePairs - 1);
    const r = 70;
    const d = aimDir(b, world);
    for (let p = 0; p < pairs; p++) {
      const a1 = ((beat + p) / 4) * Math.PI * 2 + turRotation;
      const a2 = a1 + Math.PI;
      const x1 = Math.cos(a1) * r;
      const x2 = Math.cos(a2) * r;
      if ((x1 < 0 && perLeftLive) || (x1 >= 0 && perRightLive)) {
        fireFromPoint(world, b.x + x1, b.y + Math.sin(a1) * r, d.vx * 320, d.vy * 320, 14);
      }
      if ((x2 < 0 && perLeftLive) || (x2 >= 0 && perRightLive)) {
        fireFromPoint(world, b.x + x2, b.y + Math.sin(a2) * r, d.vx * 320, d.vy * 320, 14);
      }
    }
    b.state.beat = (beat + 1) % 4;
    b.combatTimer = b.phase === 0 ? 0.5 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.32 : 0.26;
  }
  // Central rings — hull-driven, always.
  b.state.ring = (b.state.ring ?? 0) - dt;
  if (b.state.ring <= 0) {
    fireRadial(world, b, 14, 240, 12, 'enemyPlasma', 8, b.age * 0.4);
    if (b.phase >= 2) fireRadial(world, b, 14, 180, 10, 'enemyPlasma', 7, b.age * 0.4 + Math.PI / 14);
    b.state.ring = b.phase === 0 ? 2.6 : b.phase === 1 ? 2.0 : b.phase === 2 ? 1.5 : 1.1;
  }
  // Inner aimed shot — driven by central eye.
  b.state.inner = (b.state.inner ?? 0) - dt;
  if (b.state.inner <= 0 && eyeLive) {
    fireAimed(world, b, 380, 16, 'enemyPlasma');
    if (b.phase >= 2) {
      const d = aimDir(b, world);
      const a = Math.atan2(d.vy, d.vx);
      spawnBullet(world, b.x, b.y + 20, Math.cos(a + 0.22) * 380, Math.sin(a + 0.22) * 380, 12, 'enemyPlasma');
      spawnBullet(world, b.x, b.y + 20, Math.cos(a - 0.22) * 380, Math.sin(a - 0.22) * 380, 12, 'enemyPlasma');
    }
    b.state.inner = b.phase === 0 ? 1.3 : b.phase === 1 ? 1.0 : b.phase === 2 ? 0.8 : 0.6;
  }
}

// ---- 20: The Architect — final boss, 4 forms --------------------------
// Form 0: outer shell — slow heavy salvos.
// Form 1: exposed core — radial saturation kicks in.
// Form 2: transformed — counter-rotating spirals + kamikaze cradles.
// Form 3: last stand — every system overloads, screen flashes on entry.
function bossArchitect(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  const form = f > 0.75 ? 0 : f > 0.5 ? 1 : f > 0.25 ? 2 : 3;
  // Form-keyed parts roster — each transformation swaps the layout entirely.
  const plateHp = Math.round(b.maxHp * 0.10);
  const emitterHp = Math.round(b.maxHp * 0.10);
  const transformedHp = Math.round(b.maxHp * 0.10);
  if (form === 0) {
    initBossParts(b, world, [
      { kind: 'A', id: 'A_N', ox: 0, oy: -56, radius: 22, hp: plateHp },
      { kind: 'A', id: 'A_E', ox: 56, oy: 0, radius: 22, hp: plateHp },
      { kind: 'A', id: 'A_S', ox: 0, oy: 56, radius: 22, hp: plateHp },
      { kind: 'A', id: 'A_W', ox: -56, oy: 0, radius: 22, hp: plateHp },
    ], 'arch-form0');
  } else if (form === 1) {
    initBossParts(b, world, [
      { kind: 'P', id: 'P_emit_L', ox: -42, oy: -16, radius: 18, hp: emitterHp },
      { kind: 'P', id: 'P_emit_R', ox: 42, oy: -16, radius: 18, hp: emitterHp },
    ], 'arch-form1');
  } else if (form === 2) {
    initBossParts(b, world, [
      { kind: 'T', id: 'T_spiral', ox: 0, oy: -20, radius: 20, hp: transformedHp },
      { kind: 'H', id: 'H_cradle', ox: 0, oy: 40, radius: 20, hp: transformedHp },
    ], 'arch-form2');
  } else {
    // Form 3: exposed core, no parts.
    initBossParts(b, world, [], 'arch-form3');
  }
  if (form !== b.phase) {
    b.phase = form;
    b.combatTimer = 0.5;
    b.state.beat = 0;
    // Visual feedback on each transformation.
    world.screenShake = Math.max(world.screenShake, form === 3 ? 28 : 16);
    b.sprite.tint = form === 0 ? 0xffffff : form === 1 ? 0xffeacc : form === 2 ? 0xffb0e0 : 0xff8866;
  }
  const spiralLive = !b.state.broken_T_spiral;
  const cradleLive = !b.state.broken_H_cradle;
  const emitLeftLive = !b.state.broken_P_emit_L;
  const emitRightLive = !b.state.broken_P_emit_R;
  weaveTo(b, dt, 260, 0.3 + form * 0.22, 150);
  // Light scale pulse on the final form so the silhouette stays alive.
  if (form === 3) {
    const s = 1 + Math.sin(b.age * 6) * 0.04;
    b.sprite.scale.set(s);
  } else {
    b.sprite.scale.set(1);
  }
  // Edge turrets in sequence.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const beat = (b.state.beat ?? 0) as number;
    const bottoms: Array<[number, number]> = [[-56, 44], [-28, 44], [0, 44], [28, 44], [56, 44]];
    const t = bottoms[beat % bottoms.length];
    const d = aimDir(b, world);
    fireFromPoint(world, b.x + t[0], b.y + t[1], d.vx * 360, d.vy * 360, 14, 'enemyPlasma');
    const lefts: Array<[number, number]> = [[-40, -22], [-56, -6], [-72, 10]];
    const lt = lefts[beat % lefts.length];
    fireFromPoint(world, b.x + lt[0], b.y + lt[1], d.vx * 300, d.vy * 300, 12);
    const rt = [-lt[0], lt[1]] as [number, number];
    fireFromPoint(world, b.x + rt[0], b.y + rt[1], d.vx * 300, d.vy * 300, 12);
    if (form === 3) {
      // Last-stand companion shot from the apex on every beat.
      const a = Math.atan2(d.vy, d.vx);
      spawnBullet(world, b.x, b.y - 90, Math.cos(a) * 540, Math.sin(a) * 540, 12, 'enemyPlasma', 9);
    }
    b.state.beat = beat + 1;
    b.combatTimer = form === 0 ? 0.4 : form === 1 ? 0.3 : form === 2 ? 0.22 : 0.16;
  }
  // Apex super-cannon — fan widens per form.
  b.state.apex = (b.state.apex ?? 0) - dt;
  if (b.state.apex <= 0) {
    const pred = predictDir(b, world, 600);
    const lanes = form === 0 ? 5 : form === 1 ? 7 : form === 2 ? 9 : 11;
    const half = (lanes - 1) / 2;
    for (let i = 0; i < lanes; i++) {
      const a = Math.atan2(pred.vy, pred.vx) + (i - half) * 0.07;
      spawnBullet(world, b.x, b.y - 90, Math.cos(a) * 600, Math.sin(a) * 600, 18, 'enemyPlasma', 10);
    }
    b.state.apex = form === 0 ? 2.2 : form === 1 ? 1.8 : form === 2 ? 1.3 : 0.95;
  }
  // Radial salvos — form-1 emitters drive these; either one alone shrinks output.
  if (form === 1) {
    b.state.radial = (b.state.radial ?? 0) - dt;
    if (b.state.radial <= 0 && (emitLeftLive || emitRightLive)) {
      const bullets = 14 + (emitLeftLive && emitRightLive ? 4 : 0);
      fireRadial(world, b, bullets, 240, 12, 'enemyPlasma', 8, b.age * 0.3);
      b.state.radial = (emitLeftLive && emitRightLive) ? 2.2 : 3.2;
    }
  } else if (form >= 2) {
    // Form 2+ has its own radial overlay regardless of emitter status.
    b.state.radial = (b.state.radial ?? 0) - dt;
    if (b.state.radial <= 0) {
      fireRadial(world, b, 14 + form * 2, 240, 12, 'enemyPlasma', 8, b.age * 0.3);
      fireRadial(world, b, 14, 180, 9, 'enemyPlasma', 7, -b.age * 0.4);
      b.state.radial = form === 2 ? 1.5 : 1.0;
    }
  }
  // Transformed: spiral wall — gated by T_spiral in form 2.
  if (form === 2) {
    b.state.spiral = (b.state.spiral ?? 0) - dt;
    if (b.state.spiral <= 0 && spiralLive) {
      const rot = b.age * 1.8;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + rot;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 200, Math.sin(a) * 200, 10, 'enemyPlasma', 7);
      }
      b.state.spiral = 1.0;
    }
  } else if (form === 3) {
    // Form 3: hull-driven, no part gating.
    b.state.spiral = (b.state.spiral ?? 0) - dt;
    if (b.state.spiral <= 0) {
      const rot = b.age * 1.8;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + rot;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 200, Math.sin(a) * 200, 10, 'enemyPlasma', 7);
      }
      b.state.spiral = 0.7;
    }
  }
  // Kamikaze cradles — gated by H_cradle in form 2; hull-driven in form 3.
  if (form === 2 && cradleLive) {
    b.state.summon = (b.state.summon ?? 0) - dt;
    if (b.state.summon <= 0) {
      spawnMinion(world, 'kamikaze', b.x - 80, b.y + 50);
      spawnMinion(world, 'kamikaze', b.x + 80, b.y + 50);
      b.state.summon = 4.0;
    }
  } else if (form === 3) {
    b.state.summon = (b.state.summon ?? 0) - dt;
    if (b.state.summon <= 0) {
      spawnMinion(world, 'kamikaze', b.x - 80, b.y + 50);
      spawnMinion(world, 'kamikaze', b.x + 80, b.y + 50);
      spawnMinion(world, 'kamikaze', b.x, b.y + 60);
      spawnMinion(world, 'kamikaze', b.x - 140, b.y + 40);
      spawnMinion(world, 'kamikaze', b.x + 140, b.y + 40);
      b.state.summon = 2.5;
    }
  }
}

// ---- registry -------------------------------------------------------------

export function buildBossSpecs(atlas: Atlas): BossSpec[] {
  const t = atlas.bosses;
  // Linear HP curve from 1300 (boss 1) to 7000 (boss 20). Replaces the older
  // per-boss base × tier-multiplier scheme — keeps late-game fights from
  // turning into HP-sponge marathons (was 15 370 on boss 20). Difficulty in
  // the late tiers now leans entirely on phase complexity and destructible
  // parts, not raw HP.
  const HP_START = 1300;
  const HP_END = 7000;
  const hpFor = (i: number): number => Math.round(HP_START + (HP_END - HP_START) * (i / 19));
  const make = (i: number, name: string, radius: number, score: number, update: BossSpec['update'], loot: string[] = []): BossSpec => ({
    key: `boss-${i + 1}`,
    name,
    texture: t[i],
    maxHp: hpFor(i),
    radius,
    scoreValue: score,
    entryY: 140 + i * 2,
    update,
    loot: ['health_l', ...loot],
  });
  return [
    make(0, 'Patrol Cruiser', 70, 2000, bossPatrolCruiser, ['w_pulse']),
    make(1, 'Asteroid Hauler', 80, 2500, bossAsteroidHauler, ['w_spread']),
    make(2, 'Cyber Crab', 80, 3000, bossCyberCrab, ['w_plasma']),
    make(3, 'Lunar Sentinel', 80, 3500, bossLunarSentinel, ['w_wave']),
    make(4, 'Hive Carrier', 85, 4000, bossHiveCarrier, ['w_missiles']),
    make(5, 'Wreck Behemoth', 90, 4500, bossWreckBehemoth, ['w_wave']),
    make(6, 'Mine Mother', 90, 5000, bossMineMother, ['w_lightning']),
    make(7, 'Ghost Sniper', 80, 5500, bossGhostSniper, ['w_pulse', 'shield']),
    make(8, 'Kamikaze Queen', 90, 6000, bossKamikazeQueen, ['w_spread', 'damage']),
    make(9, 'Saturn Dreadnought', 100, 7000, bossSaturnDreadnought, ['w_plasma', 'shield']),
    make(10, 'Phantom', 90, 7500, bossPhantom, ['w_wave', 'shield']),
    make(11, 'Storm Sphere', 95, 8000, bossStormSphere, ['w_lightning', 'damage']),
    make(12, 'Blazing Citadel', 100, 9000, bossBlazingCitadel, ['w_missiles', 'damage']),
    make(13, 'Gravity Lord', 100, 10000, bossGravityLord, ['w_wave', 'damage']),
    make(14, 'Hive Mind', 105, 11000, bossHiveMind, ['w_spread', 'shield']),
    make(15, 'Event Horizon', 110, 12000, bossEventHorizon, ['w_lightning', 'damage']),
    make(16, 'Factory Core', 115, 13500, bossFactoryCore, ['w_plasma', 'shield']),
    make(17, 'Imperial Flagship', 120, 15000, bossImperialFlagship, ['w_missiles', 'shield', 'damage']),
    make(18, 'Citadel Guardian', 125, 17500, bossCitadelGuardian, ['w_wave', 'shield', 'damage']),
    make(19, 'The Architect', 130, 25000, bossArchitect, ['w_plasma', 'w_wave', 'w_lightning', 'shield', 'damage']),
  ];
}
