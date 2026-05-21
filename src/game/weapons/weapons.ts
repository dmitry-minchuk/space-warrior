import { Graphics } from 'pixi.js';
import type { World } from '../world';
import type { Player } from '../entities/Player';
import type { WeaponId } from './types';

export interface WeaponDef {
  id: WeaponId;
  rate(level: number): number;             // shots per second when held
  fire(world: World, player: Player, level: number, damageMul: number): void;
  // Continuous weapons (laser): called every frame while button held instead of fire().
  continuous?: (world: World, player: Player, level: number, damageMul: number, dt: number) => void;
}

/** Fire one bonus homing missile (used by LV5 of every weapon).
 *  Damage = 25 × 1.15 = 28.75, then multiplied by damage-boost. */
export function fireBonusMissile(world: World, player: Player, dmgMul: number): void {
  const dmg = 25 * 1.15 * dmgMul;
  makeBullet(world, player.x, player.y - 8, (Math.random() - 0.5) * 200, -396, dmg, 'missile', {
    homing: true,
    radius: 8,
    lifetime: 4,
    rotate: true,
    homingSpeed: 396,
    homingTurn: 4.4,
  });
}

function makeBullet(
  world: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  damage: number,
  visual: 'pulse' | 'spread' | 'plasma' | 'missile' | 'wave' | 'lightning',
  options: Partial<{ piercing: boolean; homing: boolean; wave: { amp: number; freq: number }; spin: number; scale: number; rotate: boolean; radius: number; lifetime: number; homingSpeed: number; homingTurn: number }> = {},
): void {
  const tex = world.atlas.proj[visual];
  const p = world.projectilePool.spawn({
    x, y, vx, vy, damage,
    owner: 'player',
    texture: tex,
    visual,
    radius: options.radius ?? 8,
    lifetime: options.lifetime ?? 3.2,
    piercing: options.piercing,
    homing: options.homing,
    wave: options.wave,
    rotateToVelocity: options.rotate ?? (visual !== 'plasma' && visual !== 'lightning'),
    spin: options.spin ?? 0,
    scale: options.scale ?? 1,
    homingSpeed: options.homingSpeed,
    homingTurn: options.homingTurn,
  }, world.layers.projectiles);
  world.projectiles.push(p);
}

// Weapons support levels 1-5. Per-level scaling kept GENTLE: target LV5 ≈ 2×
// LV1 DPS, each level ~+15-25%. Count of projectiles grows visibly, but
// per-bullet damage drops as count rises so the curve stays flat.

const LVL = (a: number, b: number, c: number, d: number, e: number) => (l: number): number =>
  l <= 1 ? a : l === 2 ? b : l === 3 ? c : l === 4 ? d : e;

const at = (table: number[], level: number): number => table[Math.max(0, Math.min(table.length - 1, level - 1))];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pulse: {
    id: 'pulse',
    rate: LVL(6.4, 6.4, 6.4, 6.8, 7.2),
    fire(world, player, level, dmgMul) {
      // count 2/3/4/5/6, per-bullet damage drops as count grows so total grows ~20%/level
      const counts = [2, 3, 4, 5, 6];
      const damages = [10, 8, 7, 7, 6.5];
      const n = at(counts, level);
      const dmg = at(damages, level) * dmgMul;
      // Evenly distributed streams across a small horizontal band.
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i - (n - 1) / 2) / ((n - 1) / 2);
        const x = player.x + t * 16;
        const yOff = -12 - Math.abs(t) * 4;
        const vx = t * 30;
        makeBullet(world, x, player.y + yOff, vx, -800, dmg, 'pulse');
      }
      world.audio.play('pulse', { volume: 0.15, pitch: 1 + Math.random() * 0.05 });
    },
  },
  spread: {
    id: 'spread',
    rate: LVL(4, 4, 4.4, 4.4, 4.8),
    fire(world, player, level, dmgMul) {
      // counts: 3/4/5/6/7, damages: 8/7/7/6.5/6.5
      const counts = [3, 4, 5, 6, 7];
      const damages = [8, 7, 7, 6.5, 6.5];
      const spreads = [0.18, 0.24, 0.32, 0.38, 0.46];
      const n = at(counts, level);
      const dmg = at(damages, level) * dmgMul;
      const spread = at(spreads, level);
      for (let i = 0; i < n; i++) {
        const t = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
        const angle = -Math.PI / 2 + t * spread;
        makeBullet(world, player.x, player.y - 12, Math.cos(angle) * 720, Math.sin(angle) * 720, dmg, 'spread');
      }
      world.audio.play('spread', { volume: 0.16, pitch: 1 + Math.random() * 0.06 });
    },
  },
  plasma: {
    id: 'plasma',
    rate: LVL(2.4, 2.4, 2.8, 2.8, 3.2),
    fire(world, player, level, dmgMul) {
      // counts 1/2/2/3/3 — count grows slowly, damage stays moderate
      const counts = [1, 2, 2, 3, 3];
      const damages = [32, 22, 26, 22, 24];
      const n = at(counts, level);
      const dmg = at(damages, level) * dmgMul;
      if (n === 1) {
        makeBullet(world, player.x, player.y - 18, 0, -520, dmg, 'plasma', { piercing: true, radius: 14, spin: 4 });
      } else if (n === 2) {
        makeBullet(world, player.x - 12, player.y - 14, 0, -520, dmg, 'plasma', { piercing: true, radius: 13, spin: 4 });
        makeBullet(world, player.x + 12, player.y - 14, 0, -520, dmg, 'plasma', { piercing: true, radius: 13, spin: -4 });
      } else {
        // 3 orbs: center forward + 2 side
        makeBullet(world, player.x, player.y - 22, 0, -540, dmg, 'plasma', { piercing: true, radius: 14, scale: 1.05, spin: 4 });
        makeBullet(world, player.x - 16, player.y - 8, -30, -500, dmg, 'plasma', { piercing: true, radius: 11 });
        makeBullet(world, player.x + 16, player.y - 8, 30, -500, dmg, 'plasma', { piercing: true, radius: 11 });
      }
      world.audio.play('plasma', { volume: 0.22 });
    },
  },
  missiles: {
    id: 'missiles',
    rate: LVL(1.0625, 1.0625, 1.19, 1.19, 1.275),
    fire(world, player, level, dmgMul) {
      // counts 1/2/2/3/3, dmg per missile drops slightly so total grows gently
      const counts = [1, 2, 2, 3, 3];
      const damages = [36.4, 23.4, 28.6, 23.4, 26];
      const n = at(counts, level);
      const dmg = at(damages, level) * dmgMul;
      for (let i = 0; i < n; i++) {
        const offsetX = (i - (n - 1) / 2) * 14;
        makeBullet(world, player.x + offsetX, player.y - 8, (Math.random() - 0.5) * 200, -396, dmg, 'missile', { homing: true, radius: 8, lifetime: 4, rotate: true, homingSpeed: 396, homingTurn: 4.4 });
      }
      world.audio.play('missile', { volume: 0.18 });
    },
  },
  wave: {
    id: 'wave',
    rate: LVL(3.2, 3.2, 3.6, 3.6, 4),
    fire(world, player, level, dmgMul) {
      // counts 2/3/3/4/4, damages 16/13/14/13/14
      const counts = [2, 3, 3, 4, 4];
      const damages = [16, 13, 14, 13, 14];
      const ampTab = [60, 80, 100, 110, 120];
      const freqTab = [6, 7, 7.5, 8, 8.5];
      const n = at(counts, level);
      const dmg = at(damages, level) * dmgMul;
      const amp = at(ampTab, level);
      const freq = at(freqTab, level);
      for (let i = 0; i < n; i++) {
        const t = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
        const ampI = amp * t;
        const offsetX = t * 6;
        makeBullet(world, player.x + offsetX, player.y - 12, 0, -640, dmg, 'wave', {
          piercing: true,
          wave: { amp: ampI, freq },
          radius: 10,
          lifetime: 2.4,
          rotate: false,
        });
      }
      world.audio.play('wave', { volume: 0.18 });
    },
  },
  lightning: {
    id: 'lightning',
    rate: LVL(4.8, 4.8, 5.2, 5.2, 5.6),
    fire(world, player, level, dmgMul) {
      // chains 1/2/2/3/3, damage 14/9/11/9/10. Range is much bigger now and
      // chains can travel in any direction (including behind/below the player).
      const damages = [14, 9, 11, 9, 10];
      const chainTab = [1, 2, 2, 3, 3];
      const rangeTab = [420, 520, 600, 660, 720];
      const dmg = at(damages, level) * dmgMul;
      const maxChain = at(chainTab, level);
      const maxRange = at(rangeTab, level);
      const hit: Array<{ x: number; y: number }> = [];
      let fromX = player.x;
      let fromY = player.y - 18;
      const visited = new Set<number>();
      for (let i = 0; i < maxChain; i++) {
        let best = null as null | { e: { id: number; alive: boolean; x: number; y: number; damage: (n: number) => boolean; radius: number }; d: number };
        for (const e of world.enemies) {
          if (!e.alive || visited.has(e.id)) continue;
          // No direction filter — lightning can arc anywhere within range.
          const dx = e.x - fromX;
          const dy = e.y - fromY;
          const d = Math.hypot(dx, dy);
          if (d < maxRange && (!best || d < best.d)) {
            best = { e: e as any, d };
          }
        }
        if (world.boss && world.boss.alive && !world.boss.entering && !world.boss.dying && !visited.has(world.boss.id)) {
          const dx = world.boss.x - fromX;
          const dy = world.boss.y - fromY;
          const d = Math.hypot(dx, dy);
          if (d < maxRange && (!best || d < best.d)) {
            best = { e: world.boss as any, d };
          }
        }
        if (!best) break;
        visited.add(best.e.id);
        hit.push({ x: best.e.x, y: best.e.y });
        const died = best.e.damage(dmg);
        if (died) {
          if (world.boss && best.e.id === world.boss.id) {
            world.onBossKilled(world.boss);
          } else {
            world.onEnemyKilled(best.e as any);
          }
        }
        fromX = best.e.x;
        fromY = best.e.y;
      }
      // Visualise
      if (hit.length > 0) drawLightning(world, player.x, player.y - 18, hit);
      world.audio.play('lightning', { volume: 0.16 });
    },
  },
};

// ---- visual helpers ------------------------------------------------------

function ensureBeamGfx(world: World): Graphics {
  let g = world.beamGfx;
  if (!g || g.destroyed) {
    g = new Graphics();
    world.beamGfx = g;
    world.layers.projectiles.addChild(g);
  }
  return g;
}


function drawLightning(world: World, ox: number, oy: number, hits: Array<{ x: number; y: number }>): void {
  const g = ensureBeamGfx(world);
  g.clear();
  // Slightly varying primary colour per cast for visual diversity
  const palettes = [
    { core: 0xffffff, glow: 0xfff066, outer: 0xffe060 },
    { core: 0xffffff, glow: 0xa3e8ff, outer: 0x66c4ff },
    { core: 0xffffff, glow: 0xff99ff, outer: 0xff5cd6 },
  ];
  const pal = palettes[Math.floor(Math.random() * palettes.length)];
  let px = ox, py = oy;
  // Source flash at muzzle
  drawArcImpact(g, ox, oy, 8, pal);
  for (const h of hits) {
    drawJag(g, px, py, h.x, h.y, pal);
    drawArcImpact(g, h.x, h.y, 12, pal);
    // Spawn impact spark particles at each chain hit so it FEELS like a blast
    spawnLightningImpactParticles(world, h.x, h.y, pal);
    px = h.x;
    py = h.y;
  }
  world.beamLifetime = 0.18;
}

function drawJag(g: Graphics, x1: number, y1: number, x2: number, y2: number, pal: { core: number; glow: number; outer: number }): void {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(8, Math.floor(dist / 28));
  const dx = (x2 - x1) / steps;
  const dy = (y2 - y1) / steps;
  const ortho = { x: -(y2 - y1) / dist, y: (x2 - x1) / dist };
  // Build 3 jagged paths with progressively smaller jitter so they nest.
  const buildPath = (jitter: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [[x1, y1]];
    for (let i = 1; i < steps; i++) {
      const offs = (Math.random() - 0.5) * jitter;
      pts.push([x1 + dx * i + ortho.x * offs, y1 + dy * i + ortho.y * offs]);
    }
    pts.push([x2, y2]);
    return pts;
  };
  const outerPath = buildPath(24);
  const midPath = buildPath(14);
  const corePath = buildPath(7);

  // Outermost soft glow
  drawPolyline(g, outerPath, { color: pal.outer, width: 10, alpha: 0.22 });
  // Mid glow
  drawPolyline(g, midPath, { color: pal.glow, width: 5, alpha: 0.55 });
  // Hot core
  drawPolyline(g, corePath, { color: pal.core, width: 1.6, alpha: 1.0 });

  // Side branches (forks) from a few mid-bolt vertices.
  const branchN = 1 + Math.floor(Math.random() * 3);
  for (let b = 0; b < branchN; b++) {
    const idx = 1 + Math.floor(Math.random() * (steps - 2));
    const [bx, by] = midPath[idx];
    const len = 18 + Math.random() * 28;
    const a = Math.atan2(ortho.y, ortho.x) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.6;
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len;
    const branchSteps = 4;
    const bpts: Array<[number, number]> = [[bx, by]];
    for (let i = 1; i <= branchSteps; i++) {
      const t = i / branchSteps;
      bpts.push([
        bx + (ex - bx) * t + (Math.random() - 0.5) * 6,
        by + (ey - by) * t + (Math.random() - 0.5) * 6,
      ]);
    }
    drawPolyline(g, bpts, { color: pal.glow, width: 3, alpha: 0.45 });
    drawPolyline(g, bpts, { color: pal.core, width: 1, alpha: 0.85 });
  }
}

function drawPolyline(g: Graphics, pts: Array<[number, number]>, style: { color: number; width: number; alpha: number }): void {
  if (pts.length < 2) return;
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke(style);
}

function drawArcImpact(g: Graphics, x: number, y: number, R: number, pal: { core: number; glow: number; outer: number }): void {
  g.circle(x, y, R * 1.6).fill({ color: pal.outer, alpha: 0.25 });
  g.circle(x, y, R).fill({ color: pal.glow, alpha: 0.55 });
  g.circle(x, y, R * 0.45).fill({ color: pal.core, alpha: 0.95 });
  // Cross diffraction lines
  g.rect(x - R * 1.4, y - 0.6, R * 2.8, 1.2).fill({ color: pal.glow, alpha: 0.6 });
  g.rect(x - 0.6, y - R * 1.4, 1.2, R * 2.8).fill({ color: pal.glow, alpha: 0.6 });
}

function spawnLightningImpactParticles(world: World, x: number, y: number, pal: { core: number; glow: number; outer: number }): void {
  const a = world.atlas.particles;
  // Quick bright flash
  const flash = world.particlePool.spawn({
    texture: a.softWhite,
    x, y, vx: 0, vy: 0,
    life: 0.16,
    scale: 1.4,
    endScale: 3.5,
    blend: 'add',
    tint: pal.glow,
    alpha: 0.95,
  }, world.layers.effectsOver);
  world.particles.push(flash);
  // Radial electric sparks
  for (let i = 0; i < 9; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = 160 + Math.random() * 200;
    const p = world.particlePool.spawn({
      texture: a.hardWhite,
      x, y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 0.28 + Math.random() * 0.18,
      scale: 1.4,
      endScale: 0.3,
      blend: 'add',
      tint: Math.random() < 0.5 ? pal.core : pal.glow,
      drag: 3,
    }, world.layers.effectsOver);
    world.particles.push(p);
  }
}
