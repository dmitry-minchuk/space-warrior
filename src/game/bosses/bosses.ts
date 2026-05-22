import { GAME_WIDTH } from '../../engine/constants';
import type { Atlas } from '../art/atlas';
import type { World } from '../world';
import type { Boss, BossSpec } from '../entities/Boss';

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

function setBossPhase(b: Boss, phase: number): void {
  if (b.phase === phase) return;
  b.phase = phase;
  b.combatTimer = 0.25;
  b.combatPhase = 0;
  b.combatSub = 0;
  b.burstLeft = 0;
  b.state.beat = 0;
  b.state.side = 0.6;
  b.state.spawn = 1.2;
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

// ---- 1: Patrol Cruiser — twin forward cannons + wing-tip turrets --------
function bossPatrolCruiser(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.25 ? 1 : 2);
  weaveTo(b, dt, b.phase === 0 ? 220 : b.phase === 1 ? 270 : 315, b.phase === 0 ? 0.55 : b.phase === 1 ? 0.78 : 0.95, 130);
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const beat = (b.state.beat ?? 0) as number;
    if (b.phase === 0) {
      fireFromPoint(world, b.x - 14, b.y - 38, -25, 320, 10);
      fireFromPoint(world, b.x + 14, b.y - 38, 25, 320, 10);
      fireAimedFromPoint(world, b.x - 44, b.y + 20, 250, 8);
      fireAimedFromPoint(world, b.x + 44, b.y + 20, 250, 8);
      b.combatTimer = 1.0;
    } else if (beat % 2 === 0) {
      fireFanFromPoint(world, b.x - 44, b.y + 18, 3, Math.PI / 2 - 0.35, 0.26, 280, 8);
      fireFanFromPoint(world, b.x + 44, b.y + 18, 3, Math.PI / 2 + 0.35, 0.26, 280, 8);
      fireFromPoint(world, b.x - 14, b.y - 38, -75, 330, 10);
      fireFromPoint(world, b.x + 14, b.y - 38, 75, 330, 10);
      b.combatTimer = 0.8;
    } else if (b.phase === 1) {
      fireFanDown(world, b, 5, 0.72, 285, 8, 22);
      fireAimedFromPoint(world, b.x, b.y - 16, 320, 10);
      b.combatTimer = 0.95;
    } else if (beat % 3 === 1) {
      fireRadial(world, b, 10, 210, 7, 'enemyBullet', 7, b.age * 0.7);
      fireAimedFromPoint(world, b.x - 44, b.y + 18, 330, 9);
      fireAimedFromPoint(world, b.x + 44, b.y + 18, 330, 9);
      b.combatTimer = 0.85;
    } else {
      fireFanFromPoint(world, b.x - 48, b.y + 18, 4, Math.PI / 2 - 0.48, 0.34, 300, 8);
      fireFanFromPoint(world, b.x + 48, b.y + 18, 4, Math.PI / 2 + 0.48, 0.34, 300, 8);
      spawnBullet(world, b.x, b.y - 42, 0, 360, 11, 'enemyPlasma', 8);
      b.combatTimer = 0.75;
    }
    b.state.beat = beat + 1;
  }
}

// ---- 2: Asteroid Hauler — heavy chunks from launchers + clamp turrets ---
function bossAsteroidHauler(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.5 ? 0 : 1);
  weaveTo(b, dt, 260, b.phase === 0 ? 0.4 : 0.58, 140);
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const beat = (b.state.beat ?? 0) as number;
    if (b.phase === 0) {
      fireFromPoint(world, b.x - 38, b.y - 54, -45, 220, 18, 'enemyHeavy');
      fireFromPoint(world, b.x + 38, b.y - 54, 45, 220, 18, 'enemyHeavy');
      for (let i = -1; i <= 1; i++) fireAimedFromPoint(world, b.x + i * 24, b.y, 260, 9);
      b.combatTimer = 1.7;
    } else if (beat % 3 === 0) {
      fireRadial(world, b, 10, 190, 8, 'enemyBullet', 7, b.age * 0.35);
      b.combatTimer = 1.0;
    } else {
      fireFanFromPoint(world, b.x - 40, b.y - 48, 3, Math.PI / 2 - 0.18, 0.32, 250, 14, 'enemyHeavy', 8);
      fireFanFromPoint(world, b.x + 40, b.y - 48, 3, Math.PI / 2 + 0.18, 0.32, 250, 14, 'enemyHeavy', 8);
      fireAimedFromPoint(world, b.x, b.y + 16, 310, 10);
      b.combatTimer = 1.25;
    }
    b.state.beat = beat + 1;
  }
}

// ---- 3: Cyber Crab — claws fire beams, body lays mines ------------------
function bossCyberCrab(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.66 ? 0 : f > 0.33 ? 1 : 2);
  b.state.phase = (b.state.phase ?? 0) + dt * 0.7;
  b.x = GAME_WIDTH / 2 + Math.sin(b.state.phase) * (b.phase === 2 ? 340 : 300);
  b.y += (160 - b.y) * Math.min(1, dt * 1.5);
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    if (b.phase === 0) {
      fireAimedFromPoint(world, b.x - 72, b.y - 32, 360, 12, 'enemyPlasma', 8);
      fireAimedFromPoint(world, b.x + 72, b.y - 32, 360, 12, 'enemyPlasma', 8);
      fireFanDown(world, b, 3, 0.45, 300, 9, 12);
      b.combatTimer = 1.0;
    } else if (b.phase === 1) {
      fireFanFromPoint(world, b.x - 72, b.y - 32, 3, Math.PI / 2 - 0.32, 0.28, 330, 10, 'enemyPlasma', 8);
      fireFanFromPoint(world, b.x + 72, b.y - 32, 3, Math.PI / 2 + 0.32, 0.28, 330, 10, 'enemyPlasma', 8);
      fireAimedFromPoint(world, b.x, b.y + 20, 310, 8);
      b.combatTimer = 0.9;
    } else {
      fireFanDown(world, b, 5, 0.9, 300, 9, 16);
      fireAimedFromPoint(world, b.x - 72, b.y - 32, 390, 12, 'enemyPlasma', 8);
      fireAimedFromPoint(world, b.x + 72, b.y - 32, 390, 12, 'enemyPlasma', 8);
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
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.5 ? 0 : 1);
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
  // Lower mini-cannons (always firing periodically)
  b.state.mini = (b.state.mini ?? 0) - dt;
  if (b.state.mini <= 0) {
    fireFromPoint(world, b.x - 16, b.y + 32, b.phase === 0 ? -30 : -70, 280, 7);
    fireFromPoint(world, b.x + 16, b.y + 32, b.phase === 0 ? 30 : 70, 280, 7);
    b.state.mini = b.phase === 0 ? 1.3 : 1.0;
  }
}

// ---- 5: Hive Carrier — constant drone spawn + side turrets + bays -------
function bossHiveCarrier(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.66 ? 0 : f > 0.33 ? 1 : 2);
  weaveTo(b, dt, b.phase === 2 ? 320 : 280, 0.45 + b.phase * 0.1, 150);
  // Spawn drones in rapid succession
  b.state.spawn = (b.state.spawn ?? 0) - dt;
  if (b.state.spawn <= 0) {
    spawnMinion(world, 'drone', b.x - 60, b.y + 30);
    spawnMinion(world, 'drone', b.x + 60, b.y + 30);
    if (b.phase >= 1) spawnMinion(world, 'drone-shooter', b.x, b.y + 30);
    b.state.spawn = b.phase === 0 ? 3.4 : b.phase === 1 ? 2.7 : 2.2;
  }
  // 4 side turrets fire in pairs
  b.state.side = (b.state.side ?? 0) - dt;
  if (b.state.side <= 0) {
    const sideAngle = b.phase === 0 ? 0.12 : 0.32;
    fireFanFromPoint(world, b.x - 64, b.y + 6, 2 + b.phase, Math.PI / 2 - sideAngle, 0.22, 275, 8);
    fireFanFromPoint(world, b.x + 64, b.y + 6, 2 + b.phase, Math.PI / 2 + sideAngle, 0.22, 275, 8);
    b.state.side = b.phase === 0 ? 1.5 : b.phase === 1 ? 1.2 : 0.95;
  }
  // Forward cannons fan
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
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
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2);
  // Weave amp/freq escalates with each phase.
  const amp = b.phase === 0 ? 220 : b.phase === 1 ? 280 : 340;
  const freq = b.phase === 0 ? 0.28 : b.phase === 1 ? 0.38 : 0.5;
  weaveTo(b, dt, amp, freq, 160);
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    // Debris count and aimed-cannon volley grow with the phase.
    const debris = b.phase === 0 ? 4 : b.phase === 1 ? 6 : 8;
    for (let i = 0; i < debris; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 180 + Math.random() * 120;
      spawnBullet(world, b.x + (Math.random() - 0.5) * 80, b.y + 40, Math.cos(a) * speed, Math.sin(a) * speed, 12, 'enemyHeavy', 8);
    }
    const d = aimDir(b, world);
    const lanes = b.phase < 2 ? 1 : 2;
    for (let lane = 0; lane < lanes; lane++) {
      for (let i = -1; i <= 1; i++) {
        fireFromPoint(world, b.x + i * 6 + (lane === 0 ? 0 : (Math.random() - 0.5) * 30), b.y - 50, d.vx * 320, d.vy * 320, 12);
      }
    }
    b.combatTimer = b.phase === 0 ? 0.95 : b.phase === 1 ? 0.75 : 0.55;
  }
  // Radial blast unlocks in phase 1 and accelerates in phase 2.
  b.state.fan = (b.state.fan ?? 0) - dt;
  if (b.state.fan <= 0 && b.phase >= 1) {
    fireRadial(world, b, b.phase === 2 ? 18 : 14, 200, 12, 'enemyBullet', 7, b.age * 0.3);
    b.state.fan = b.phase === 2 ? 1.4 : 2.4;
  }
}

// ---- 7: Mine Mother — rotating mine pattern + drill beam ----------------
function bossMineMother(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2);
  weaveTo(b, dt, 260, b.phase === 0 ? 0.35 : b.phase === 1 ? 0.5 : 0.7, 170);
  // Drill core fires a beam-like volley (concentrated plasma stream)
  b.state.beam = (b.state.beam ?? 0) - dt;
  if (b.state.beam <= 0) {
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
  // Rotating mine pattern — count and rotation rate grow per phase.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const mineCount = b.phase === 0 ? 5 : b.phase === 1 ? 6 : 8;
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
  const f = b.hp / b.maxHp;
  // Use a local "ph" mirror because combatPhase is already used for the
  // charge/idle two-state telegraph machine. The phase is encoded in b.phase.
  const ph = f > 0.6 ? 0 : f > 0.3 ? 1 : 2;
  if (b.phase !== ph) {
    b.phase = ph;
    // Reset only fields safe to reset on phase change; keep combatPhase machine.
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
      const ax = b.state.aimX as number;
      const ay = b.state.aimY as number;
      const lanes = ph === 0 ? 3 : ph === 1 ? 5 : 7;
      const half = (lanes - 1) / 2;
      for (let i = 0; i < lanes; i++) {
        const a = Math.atan2(ay, ax) + (i - half) * 0.06;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 620, Math.sin(a) * 620, 22, 'enemyPlasma', 9);
      }
      // Desperation: after the volley, throw an immediate aimed re-acquire
      // to punish a stationary dodge.
      if (ph === 2) {
        const d2 = aimDir(b, world);
        spawnBullet(world, b.x, b.y, d2.vx * 520, d2.vy * 520, 16, 'enemyPlasma', 8);
      }
      world.audio.play('sniper_fire', { volume: 0.4 });
      b.combatPhase = 0;
      b.combatTimer = ph === 0 ? 1.0 : ph === 1 ? 0.75 : 0.55;
    }
  }
  // Inboard sub-cannons fire — pairs go to quads in phase 2.
  b.state.sub = (b.state.sub ?? 0) - dt;
  if (b.state.sub <= 0 && b.sprite.alpha > 0.5) {
    fireFromPoint(world, b.x - 20, b.y + 8, 0, 280, 8);
    fireFromPoint(world, b.x + 20, b.y + 8, 0, 280, 8);
    if (ph === 2) {
      fireFromPoint(world, b.x - 36, b.y + 8, 0, 280, 7);
      fireFromPoint(world, b.x + 36, b.y + 8, 0, 280, 7);
    }
    b.state.sub = ph === 0 ? 1.0 : ph === 1 ? 0.85 : 0.7;
  }
}

// ---- 9: Kamikaze Queen — spawns kamikaze pods + side spores -------------
function bossKamikazeQueen(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2);
  weaveTo(b, dt, b.phase === 0 ? 280 : b.phase === 1 ? 340 : 400, b.phase === 0 ? 0.45 : b.phase === 1 ? 0.6 : 0.8, 140);
  // Spawn kamikaze waves — count and cadence escalate per phase.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    spawnMinion(world, 'kamikaze', b.x - 50, b.y + 30);
    spawnMinion(world, 'kamikaze', b.x + 50, b.y + 30);
    if (b.phase >= 1) spawnMinion(world, 'kamikaze', b.x, b.y + 30);
    if (b.phase === 2) {
      spawnMinion(world, 'kamikaze', b.x - 100, b.y + 30);
      spawnMinion(world, 'kamikaze', b.x + 100, b.y + 30);
    }
    b.combatTimer = b.phase === 0 ? 5.0 : b.phase === 1 ? 3.6 : 2.6;
  }
  // Side pods spit aimed plasma — fires triple in desperation.
  b.state.shot = (b.state.shot ?? 0) - dt;
  if (b.state.shot <= 0) {
    const d = aimDir(b, world);
    fireFromPoint(world, b.x - 50, b.y - 10, d.vx * 280, d.vy * 280, 10, 'enemyPlasma');
    fireFromPoint(world, b.x + 50, b.y - 10, d.vx * 280, d.vy * 280, 10, 'enemyPlasma');
    if (b.phase === 2) {
      fireFromPoint(world, b.x, b.y - 20, d.vx * 320, d.vy * 320, 12, 'enemyPlasma');
    }
    b.state.shot = b.phase === 0 ? 1.4 : b.phase === 1 ? 1.05 : 0.8;
  }
  // Forward fan — widens and fires faster.
  b.state.fan = (b.state.fan ?? 0) - dt;
  if (b.state.fan <= 0) {
    const n = b.phase === 0 ? 5 : b.phase === 1 ? 7 : 9;
    const spread = b.phase === 0 ? 0.6 : b.phase === 1 ? 0.75 : 0.9;
    fireFanDown(world, b, n, spread, 280, 10);
    b.state.fan = b.phase === 0 ? 2.4 : b.phase === 1 ? 1.9 : 1.4;
  }
}

// ---- 10: Saturn Dreadnought — 4 turret salvo, spinal lance, missiles ----
function bossSaturnDreadnought(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2);
  weaveTo(b, dt, 240, b.phase === 0 ? 0.32 : b.phase === 1 ? 0.45 : 0.6, 180);
  // 4 main turrets fire in sequence (one per beat).
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const turrets: Array<[number, number]> = [[-18, -18], [18, -18], [-22, 22], [22, 22]];
    const idx = (b.state.turIdx ?? 0) as number;
    const t = turrets[idx];
    const d = aimDir(b, world);
    fireFromPoint(world, b.x + t[0], b.y + t[1], d.vx * 360, d.vy * 360, 14, 'enemyHeavy');
    // Phase 2: a side bullet trails behind each turret shot so the player
    // can't sit in one lane.
    if (b.phase === 2) {
      const a = Math.atan2(d.vy, d.vx);
      const side = idx % 2 === 0 ? 0.3 : -0.3;
      spawnBullet(world, b.x + t[0], b.y + t[1], Math.cos(a + side) * 320, Math.sin(a + side) * 320, 10);
    }
    b.state.turIdx = (idx + 1) % 4;
    b.combatTimer = b.phase === 0 ? 0.38 : b.phase === 1 ? 0.28 : 0.22;
  }
  // Spinal lance — high-damage straight shot. Becomes a 3-shot lance in P2.
  b.state.lance = (b.state.lance ?? 0) - dt;
  if (b.state.lance <= 0) {
    spawnBullet(world, b.x, b.y - 80, 0, 500, 24, 'enemyPlasma', 9);
    if (b.phase === 2) {
      spawnBullet(world, b.x - 24, b.y - 80, -40, 500, 18, 'enemyPlasma', 8);
      spawnBullet(world, b.x + 24, b.y - 80, 40, 500, 18, 'enemyPlasma', 8);
    }
    b.state.lance = b.phase === 0 ? 3.0 : b.phase === 1 ? 2.0 : 1.4;
  }
  // Side missile pods salvo — count escalates per phase.
  b.state.missiles = (b.state.missiles ?? 0) - dt;
  if (b.state.missiles <= 0) {
    const rows = b.phase === 0 ? 4 : b.phase === 1 ? 5 : 6;
    for (let i = 0; i < rows; i++) {
      const offsY = i * 4;
      fireFromPoint(world, b.x - 72, b.y + offsY, -80, 240, 10, 'enemyHeavy');
      fireFromPoint(world, b.x + 72, b.y + offsY, 80, 240, 10, 'enemyHeavy');
    }
    b.state.missiles = b.phase === 0 ? 4.0 : b.phase === 1 ? 2.8 : 2.0;
  }
}

// ---- 11: Phantom — phasing + radial beams ------------------------------
function bossPhantom(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2);
  // Visibility cycle — period shrinks per phase so the corporeal window
  // becomes denser.
  b.state.cyc = (b.state.cyc ?? 0) + dt;
  const period = b.phase === 0 ? 3.8 : b.phase === 1 ? 3.0 : 2.4;
  const cyc = (b.state.cyc % period) / period;
  if (cyc < 0.25) b.sprite.alpha = 0.18;
  else if (cyc < 0.4) b.sprite.alpha = 0.18 + (cyc - 0.25) * 5.5;
  else if (cyc < 0.75) b.sprite.alpha = 1;
  else b.sprite.alpha = 1 - (cyc - 0.75) * 4;
  weaveTo(b, dt, 320, b.phase === 0 ? 0.55 : b.phase === 1 ? 0.7 : 0.9, 150);
  // Only fires when corporeal.
  if (b.sprite.alpha > 0.6) {
    b.combatTimer -= dt;
    if (b.combatTimer <= 0) {
      const rings = b.phase === 0 ? 1 : b.phase === 1 ? 2 : 3;
      for (let r = 0; r < rings; r++) {
        const speed = 240 - r * 40;
        const off = (r % 2 === 0 ? 0 : Math.PI / 8);
        fireRadial(world, b, 8, speed, 12, 'enemyPlasma', 8, b.age * 0.3 + off);
      }
      // Phase 2 adds a tracking shot to punish escape patterns.
      if (b.phase === 2) fireAimed(world, b, 360, 14, 'enemyPlasma');
      b.combatTimer = b.phase === 0 ? 2.2 : b.phase === 1 ? 1.6 : 1.1;
    }
  }
}

// ---- 12: Storm Sphere — 8-direction tesla bursts + chain lightning -----
function bossStormSphere(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.6 ? 0 : f > 0.3 ? 1 : 2);
  weaveTo(b, dt, 200, b.phase === 0 ? 0.4 : b.phase === 1 ? 0.55 : 0.75, 170);
  // 8 tesla coil tips fire radially. Counter-rotating ring unlocks at P1 and
  // a third concentric ring spawns at P2.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const rot = b.age * 0.4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rot;
      spawnBullet(world, b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, Math.cos(a) * 260, Math.sin(a) * 260, 14, 'enemyPlasma', 8);
    }
    if (b.phase >= 1) {
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
  // Aimed chain lightning shot — fires faster, becomes pair in desperation.
  b.state.aim = (b.state.aim ?? 0) - dt;
  if (b.state.aim <= 0) {
    fireAimed(world, b, 380, 14, 'enemyPlasma');
    if (b.phase === 2) {
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
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3);
  weaveTo(b, dt, 240, b.phase === 0 ? 0.3 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.5 : 0.65, 170);
  const turrets: Array<[number, number]> = [[-38, 24], [0, 26], [38, 24], [-28, -4], [28, -4], [0, -56]];
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const d = aimDir(b, world);
    for (const t of turrets) {
      fireFromPoint(world, b.x + t[0], b.y + t[1], d.vx * 280, d.vy * 280, 10);
    }
    // Phase 3: turret pair fires its own slight-side companion shot.
    if (b.phase === 3) {
      const a = Math.atan2(d.vy, d.vx);
      for (const t of turrets) {
        spawnBullet(world, b.x + t[0], b.y + t[1], Math.cos(a + 0.18) * 260, Math.sin(a + 0.18) * 260, 8);
      }
    }
    b.combatTimer = b.phase === 0 ? 1.7 : b.phase === 1 ? 1.35 : b.phase === 2 ? 1.05 : 0.8;
  }
  // Mortar bombs lobbed from underbelly (always on, faster late).
  b.state.mortar = (b.state.mortar ?? 0) - dt;
  if (b.state.mortar <= 0) {
    const cols = b.phase >= 2 ? 5 : 3;
    const half = (cols - 1) / 2;
    for (let i = 0; i < cols; i++) {
      const off = i - half;
      spawnBullet(world, b.x + off * 30, b.y + 50, off * 100, 200, 16, 'enemyBomb', 8, 6);
    }
    b.state.mortar = b.phase === 0 ? 2.4 : b.phase === 1 ? 2.0 : b.phase === 2 ? 1.5 : 1.1;
  }
  // Flame jets unlock at phase 1 and intensify in phase 3.
  b.state.flame = (b.state.flame ?? 0) - dt;
  if (b.state.flame <= 0 && b.phase >= 1) {
    const cnt = b.phase === 3 ? 9 : 6;
    for (let i = 0; i < cnt; i++) {
      const t = i / (cnt - 1);
      fireFromPoint(world, b.x - 62 + (-1 + t * 2) * 8, b.y + 54, (-1 + t * 2) * 60 - 80, 320, 8, 'enemyHeavy');
      fireFromPoint(world, b.x + 62 + (-1 + t * 2) * 8, b.y + 54, (-1 + t * 2) * 60 + 80, 320, 8, 'enemyHeavy');
    }
    b.state.flame = b.phase === 1 ? 2.6 : b.phase === 2 ? 2.0 : 1.4;
  }
}

// ---- 14: Gravity Lord — orbital platforms + spiral + gravity pull ------
// 4 phases: spiral, dual-spiral, pull-up, collapse.
function bossGravityLord(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3);
  weaveTo(b, dt, 240, b.phase === 0 ? 0.32 : b.phase === 1 ? 0.42 : b.phase === 2 ? 0.55 : 0.7, 180);
  // Spiral fire — second counter-rotating spiral unlocks at phase 1.
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
  // Orbital platforms fire from their positions.
  b.state.orbit = (b.state.orbit ?? 0) - dt;
  if (b.state.orbit <= 0) {
    const platforms: Array<[number, number]> = [[-60, 0], [60, 0], [0, -38], [0, 38]];
    const d = aimDir(b, world);
    for (const p of platforms) {
      fireFromPoint(world, b.x + p[0], b.y + p[1], d.vx * 300, d.vy * 300, 12, 'enemyPlasma');
    }
    b.state.orbit = b.phase === 0 ? 2.2 : b.phase === 1 ? 1.8 : b.phase === 2 ? 1.4 : 1.1;
  }
  // Gravity pull on player — escalates with phase.
  const dx = b.x - world.player.x;
  const dy = b.y - world.player.y;
  const len = Math.hypot(dx, dy) || 1;
  const pull = b.phase === 0 ? 35 : b.phase === 1 ? 55 : b.phase === 2 ? 75 : 100;
  world.player.vx += (dx / len) * pull * dt;
  world.player.vy += (dy / len) * pull * dt;
}

// ---- 15: Hive Mind — spore launchers + drone swarms + neural beams -----
// 4 phases: probing, swarm escalation, elite summon, neural overload.
function bossHiveMind(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3);
  weaveTo(b, dt, 220, b.phase === 0 ? 0.38 : b.phase === 1 ? 0.5 : b.phase === 2 ? 0.62 : 0.8, 170);
  // Drone summoning — composition grows per phase.
  b.state.spawn = (b.state.spawn ?? 0) - dt;
  if (b.state.spawn <= 0) {
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
  // Spore launchers — spread widens per phase.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
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
  // Neural beam (aimed) — pair in phase 3.
  b.state.beam = (b.state.beam ?? 0) - dt;
  if (b.state.beam <= 0) {
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
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3);
  weaveTo(b, dt, 260, b.phase === 0 ? 0.3 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.5 : 0.65, 170);
  // Multi-spiral — second/third spirals unlock at higher phases.
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
    if (b.phase >= 2) {
      // Slow tight spiral that drifts outward — a moving wall.
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rot * 1.6;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 140, Math.sin(a) * 140, 8, 'enemyPlasma', 7);
      }
    }
    b.combatTimer = b.phase === 0 ? 1.2 : b.phase === 1 ? 0.95 : b.phase === 2 ? 0.75 : 0.55;
  }
  // 3 forward cannons — adds a sweep at phase 2+.
  b.state.fwd = (b.state.fwd ?? 0) - dt;
  if (b.state.fwd <= 0) {
    const d = predictDir(b, world, 360);
    const lanes = b.phase >= 2 ? 5 : 3;
    const half = (lanes - 1) / 2;
    for (let i = 0; i < lanes; i++) {
      const off = i - half;
      fireFromPoint(world, b.x + off * 6, b.y - 50, d.vx * 360 + off * 20, d.vy * 360, 14, 'enemyHeavy');
    }
    b.state.fwd = b.phase === 0 ? 1.6 : b.phase === 1 ? 1.3 : b.phase === 2 ? 1.0 : 0.75;
  }
  // Gravity pull escalates with phase.
  const dx = b.x - world.player.x;
  const dy = b.y - world.player.y;
  const len = Math.hypot(dx, dy) || 1;
  const pull = b.phase === 0 ? 45 : b.phase === 1 ? 65 : b.phase === 2 ? 85 : 110;
  world.player.vx += (dx / len) * pull * dt;
  world.player.vy += (dy / len) * pull * dt;
}

// ---- 17: Factory Core — manufactures elites + corner turrets ----------
// 4 phases: tooling, mass production, elite line, total recall.
function bossFactoryCore(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3);
  weaveTo(b, dt, 200, b.phase === 0 ? 0.28 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.55 : 0.7, 180);
  // Continuous elite production — composition escalates per phase.
  b.state.spawn = (b.state.spawn ?? 0) - dt;
  if (b.state.spawn <= 0) {
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
  // 4 corner turrets fire in sequence — cycle accelerates per phase.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const corners: Array<[number, number]> = [[-40, -44], [40, -44], [-40, 36], [40, 36]];
    const idx = (b.state.cIdx ?? 0) as number;
    const c = corners[idx];
    const d = aimDir(b, world);
    fireFromPoint(world, b.x + c[0], b.y + c[1], d.vx * 320, d.vy * 320, 12);
    if (b.phase >= 2) {
      // Phase 2+: both diagonals fire each beat — double rate via doubled lanes.
      const c2 = corners[(idx + 2) % 4];
      fireFromPoint(world, b.x + c2[0], b.y + c2[1], d.vx * 320, d.vy * 320, 12);
    }
    b.state.cIdx = (idx + 1) % 4;
    b.combatTimer = b.phase === 0 ? 0.5 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.32 : 0.24;
  }
  // Belly fan — widens with phase.
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
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3);
  weaveTo(b, dt, 200, b.phase === 0 ? 0.25 : b.phase === 1 ? 0.34 : b.phase === 2 ? 0.46 : 0.6, 170);
  const turrets: Array<[number, number]> = [
    [-28, -32], [28, -32], [-38, -10], [38, -10],
    [-46, 18], [46, 18], [-24, 40], [24, 40],
  ];
  // Turret beat — pair count grows per phase.
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
    b.combatTimer = b.phase === 0 ? 0.4 : b.phase === 1 ? 0.32 : b.phase === 2 ? 0.26 : 0.2;
  }
  // Spinal lance — paired or tripled in late phases.
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
  // Missile salvos — rows grow with phase.
  b.state.missiles = (b.state.missiles ?? 0) - dt;
  if (b.state.missiles <= 0) {
    const rows = b.phase === 0 ? 5 : b.phase === 1 ? 7 : b.phase === 2 ? 9 : 11;
    for (let i = 0; i < rows; i++) {
      const offsY = i * 4;
      fireFromPoint(world, b.x - 70, b.y + offsY, -120, 220, 12, 'enemyHeavy');
      fireFromPoint(world, b.x + 70, b.y + offsY, 120, 220, 12, 'enemyHeavy');
    }
    b.state.missiles = b.phase === 0 ? 4.2 : b.phase === 1 ? 3.2 : b.phase === 2 ? 2.4 : 1.8;
  }
}

// ---- 19: Citadel Guardian — 8 perimeter turrets in waves ---------------
// 4 phases: probing fire, full perimeter, ring saturation, citadel lockdown.
function bossCitadelGuardian(b: Boss, dt: number, world: World): void {
  const f = b.hp / b.maxHp;
  setBossPhase(b, f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3);
  weaveTo(b, dt, 220, b.phase === 0 ? 0.35 : b.phase === 1 ? 0.5 : b.phase === 2 ? 0.65 : 0.85, 170);
  // Perimeter turret beat — more pairs per beat in late phases.
  b.combatTimer -= dt;
  if (b.combatTimer <= 0) {
    const turRotation = b.age * 0.3;
    const beat = (b.state.beat ?? 0) as number;
    const pairs = b.phase === 0 ? 1 : b.phase === 1 ? 2 : b.phase === 2 ? 3 : 4;
    const r = 70;
    const d = aimDir(b, world);
    for (let p = 0; p < pairs; p++) {
      const a1 = ((beat + p) / 4) * Math.PI * 2 + turRotation;
      const a2 = a1 + Math.PI;
      fireFromPoint(world, b.x + Math.cos(a1) * r, b.y + Math.sin(a1) * r, d.vx * 320, d.vy * 320, 14);
      fireFromPoint(world, b.x + Math.cos(a2) * r, b.y + Math.sin(a2) * r, d.vx * 320, d.vy * 320, 14);
    }
    b.state.beat = (beat + 1) % 4;
    b.combatTimer = b.phase === 0 ? 0.5 : b.phase === 1 ? 0.4 : b.phase === 2 ? 0.32 : 0.26;
  }
  // Central eye fires expanding ring — double ring at phase 2+.
  b.state.ring = (b.state.ring ?? 0) - dt;
  if (b.state.ring <= 0) {
    fireRadial(world, b, 14, 240, 12, 'enemyPlasma', 8, b.age * 0.4);
    if (b.phase >= 2) fireRadial(world, b, 14, 180, 10, 'enemyPlasma', 7, b.age * 0.4 + Math.PI / 14);
    b.state.ring = b.phase === 0 ? 2.6 : b.phase === 1 ? 2.0 : b.phase === 2 ? 1.5 : 1.1;
  }
  // Inner turret aimed shots — pair in phase 2+.
  b.state.inner = (b.state.inner ?? 0) - dt;
  if (b.state.inner <= 0) {
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
  if (form !== b.phase) {
    b.phase = form;
    b.combatTimer = 0.5;
    b.state.beat = 0;
    // Visual feedback on each transformation.
    world.screenShake = Math.max(world.screenShake, form === 3 ? 28 : 16);
    b.sprite.tint = form === 0 ? 0xffffff : form === 1 ? 0xffeacc : form === 2 ? 0xffb0e0 : 0xff8866;
  }
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
  // Radial salvos — kick in at form 1, layered ring at form 2+.
  if (form >= 1) {
    b.state.radial = (b.state.radial ?? 0) - dt;
    if (b.state.radial <= 0) {
      fireRadial(world, b, 14 + form * 2, 240, 12, 'enemyPlasma', 8, b.age * 0.3);
      if (form >= 2) fireRadial(world, b, 14, 180, 9, 'enemyPlasma', 7, -b.age * 0.4);
      b.state.radial = form === 1 ? 2.2 : form === 2 ? 1.5 : 1.0;
    }
  }
  // Transformed: spiral wall.
  if (form >= 2) {
    b.state.spiral = (b.state.spiral ?? 0) - dt;
    if (b.state.spiral <= 0) {
      const rot = b.age * 1.8;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + rot;
        spawnBullet(world, b.x, b.y, Math.cos(a) * 200, Math.sin(a) * 200, 10, 'enemyPlasma', 7);
      }
      b.state.spiral = form === 2 ? 1.0 : 0.7;
    }
  }
  // Kamikaze cradles — early at form 2, dense at form 3.
  if (form >= 2) {
    b.state.summon = (b.state.summon ?? 0) - dt;
    if (b.state.summon <= 0) {
      spawnMinion(world, 'kamikaze', b.x - 80, b.y + 50);
      spawnMinion(world, 'kamikaze', b.x + 80, b.y + 50);
      if (form === 3) {
        spawnMinion(world, 'kamikaze', b.x, b.y + 60);
        spawnMinion(world, 'kamikaze', b.x - 140, b.y + 40);
        spawnMinion(world, 'kamikaze', b.x + 140, b.y + 40);
      }
      b.state.summon = form === 2 ? 4.0 : 2.5;
    }
  }
}

// ---- registry -------------------------------------------------------------

export function buildBossSpecs(atlas: Atlas): BossSpec[] {
  const t = atlas.bosses;
  // Tiered HP multiplier. Boss danger should come from phases and attack
  // readability rather than one large global HP sponge multiplier.
  const hpK = (i: number): number =>
    i < 5 ? 2.0 :
    i < 12 ? 2.25 :
    i < 17 ? 2.5 :
    i < 19 ? 2.75 :
    3.0;
  const make = (i: number, name: string, hp: number, radius: number, score: number, update: BossSpec['update'], loot: string[] = []): BossSpec => ({
    key: `boss-${i + 1}`,
    name,
    texture: t[i],
    maxHp: Math.round(hp * hpK(i)),
    radius,
    scoreValue: score,
    entryY: 140 + i * 2,
    update,
    loot: ['health_l', ...loot],
  });
  return [
    make(0, 'Patrol Cruiser', 650, 70, 2000, bossPatrolCruiser, ['w_pulse']),
    make(1, 'Asteroid Hauler', 900, 80, 2500, bossAsteroidHauler, ['w_spread']),
    make(2, 'Cyber Crab', 1050, 80, 3000, bossCyberCrab, ['w_plasma']),
    make(3, 'Lunar Sentinel', 1200, 80, 3500, bossLunarSentinel, ['w_wave']),
    make(4, 'Hive Carrier', 1350, 85, 4000, bossHiveCarrier, ['w_missiles']),
    make(5, 'Wreck Behemoth', 1500, 90, 4500, bossWreckBehemoth, ['w_wave']),
    make(6, 'Mine Mother', 1650, 90, 5000, bossMineMother, ['w_lightning']),
    make(7, 'Ghost Sniper', 1500, 80, 5500, bossGhostSniper, ['w_pulse', 'shield']),
    make(8, 'Kamikaze Queen', 1750, 90, 6000, bossKamikazeQueen, ['w_spread', 'damage']),
    make(9, 'Saturn Dreadnought', 2200, 100, 7000, bossSaturnDreadnought, ['w_plasma', 'shield']),
    make(10, 'Phantom', 1950, 90, 7500, bossPhantom, ['w_wave', 'shield']),
    make(11, 'Storm Sphere', 2200, 95, 8000, bossStormSphere, ['w_lightning', 'damage']),
    make(12, 'Blazing Citadel', 2550, 100, 9000, bossBlazingCitadel, ['w_missiles', 'damage']),
    make(13, 'Gravity Lord', 2800, 100, 10000, bossGravityLord, ['w_wave', 'damage']),
    make(14, 'Hive Mind', 3000, 105, 11000, bossHiveMind, ['w_spread', 'shield']),
    make(15, 'Event Horizon', 3300, 110, 12000, bossEventHorizon, ['w_lightning', 'damage']),
    make(16, 'Factory Core', 3600, 115, 13500, bossFactoryCore, ['w_plasma', 'shield']),
    make(17, 'Imperial Flagship', 4200, 120, 15000, bossImperialFlagship, ['w_missiles', 'shield', 'damage']),
    make(18, 'Citadel Guardian', 4700, 125, 17500, bossCitadelGuardian, ['w_wave', 'shield', 'damage']),
    make(19, 'The Architect', 5800, 130, 25000, bossArchitect, ['w_plasma', 'w_wave', 'w_lightning', 'shield', 'damage']),
  ];
}
