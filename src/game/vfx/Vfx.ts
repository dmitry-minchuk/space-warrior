import { Container } from 'pixi.js';
import type { World } from '../world';
import { Particle } from '../entities/Particle';

/** Global particle ceiling. Trails self-limit in GameScene, but burst
 *  emitters (explosions, sparks, debris) used to bypass every cap — a boss
 *  death pushed ~180 sprites into a single frame on a 2 GB TV box. */
export const PARTICLE_CAP = 320;

/** How many of `want` cosmetic multiples fit right now. Single core sprites
 *  (rings, flashes) spawn regardless — only multiplicity gets trimmed. */
export function particleBudget(world: World, want: number): number {
  const room = PARTICLE_CAP - world.particles.length;
  if (room <= 0) return 0;
  return want <= room ? want : room;
}

function spawnParticle(world: World, layer: Container, opts: Parameters<Particle['configure']>[0]): void {
  // Absolute backstop so even "core" sprites cannot overrun the cap by far.
  if (world.particles.length >= PARTICLE_CAP + 40) return;
  const p = world.particlePool.spawn(opts, layer);
  world.particles.push(p);
}

export function emitEngineTrail(world: World, x: number, y: number): void {
  const a = world.atlas.particles;
  // Wide cyan plume — the bulk of the trail
  spawnParticle(world, world.layers.effectsUnder, {
    texture: a.softCyan,
    x: x + (Math.random() - 0.5) * 5,
    y,
    vx: (Math.random() - 0.5) * 24,
    vy: 220 + Math.random() * 80,
    life: 0.5,
    scale: 1.05,
    endScale: 0.15,
    blend: 'add',
    alpha: 0.85,
    tint: 0xb8eaff,
  });
  // Bright white-hot core that fades fast — visually anchors the nozzle
  spawnParticle(world, world.layers.effectsUnder, {
    texture: a.softWhite,
    x,
    y,
    vx: (Math.random() - 0.5) * 10,
    vy: 200 + Math.random() * 40,
    life: 0.2,
    scale: 0.45,
    endScale: 0.05,
    blend: 'add',
    alpha: 0.95,
  });
  // Occasional bright spark for crackle / motion read
  if (Math.random() < 0.22) {
    spawnParticle(world, world.layers.effectsUnder, {
      texture: a.hardWhite,
      x,
      y,
      vx: (Math.random() - 0.5) * 80,
      vy: 240 + Math.random() * 80,
      life: 0.35,
      scale: 1.2,
      endScale: 0.2,
      blend: 'add',
      tint: 0xeaffff,
      drag: 3,
    });
  }
}

export function emitEnemyEngine(world: World, x: number, y: number, tint = 0xff9a3a): void {
  const a = world.atlas.particles;
  spawnParticle(world, world.layers.effectsUnder, {
    texture: a.softOrange,
    x: x + (Math.random() - 0.5) * 6,
    y,
    vx: (Math.random() - 0.5) * 20,
    vy: -80 - Math.random() * 30,
    life: 0.3,
    scale: 0.5,
    endScale: 0.05,
    blend: 'add',
    alpha: 0.6,
    tint,
  });
}

export function hitSpark(world: World, x: number, y: number, color = 0xffe2c8): void {
  const a = world.atlas.particles;
  // Bright white core flash (largest)
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x, y,
    vx: 0, vy: 0,
    life: 0.18,
    scale: 1.8,
    endScale: 0.3,
    blend: 'add',
  });
  // Color-tinted secondary flash
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x, y,
    vx: 0, vy: 0,
    life: 0.28,
    scale: 1.0,
    endScale: 2.4,
    blend: 'add',
    tint: color,
    alpha: 0.85,
  });
  // Expanding ring (uses the small explosion texture for shape)
  spawnParticle(world, world.layers.effectsOver, {
    texture: world.atlas.explosions[0],
    x, y,
    vx: 0, vy: 0,
    life: 0.28,
    scale: 0.35,
    endScale: 0.9,
    blend: 'add',
    tint: color,
    alpha: 0.9,
  });
  // Sparkle particles — 10 outward
  const sparkles = particleBudget(world, 10);
  for (let i = 0; i < sparkles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 140 + Math.random() * 220;
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.hardWhite,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.32 + Math.random() * 0.18,
      scale: 1.6,
      endScale: 0.4,
      blend: 'add',
      tint: color,
      drag: 4,
    });
  }
  // A few orange embers for "meat"
  const embers = particleBudget(world, 4);
  for (let i = 0; i < embers; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.hardOrange,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45,
      scale: 1.2,
      endScale: 0.3,
      blend: 'add',
      tint: 0xffaa55,
      drag: 2.5,
    });
  }
}

// Big shockwave for boss/heavy hits.
export function bigHit(world: World, x: number, y: number, color = 0xffd166): void {
  hitSpark(world, x, y, color);
  // Extra ring
  spawnParticle(world, world.layers.effectsOver, {
    texture: world.atlas.explosions[1],
    x, y,
    vx: 0, vy: 0,
    life: 0.5,
    scale: 0.3,
    endScale: 1.4,
    blend: 'add',
    tint: color,
    alpha: 0.7,
  });
  world.screenShake = Math.max(world.screenShake, 5);
}

export function explosion(world: World, x: number, y: number, size: 'sm' | 'md' | 'lg'): void {
  const a = world.atlas.particles;
  const e = world.atlas.explosions;
  const ringTex = size === 'sm' ? e[0] : size === 'md' ? e[1] : e[2];
  // Big ring sprite
  spawnParticle(world, world.layers.effectsOver, {
    texture: ringTex,
    x, y,
    vx: 0, vy: 0,
    life: size === 'sm' ? 0.35 : size === 'md' ? 0.5 : 0.7,
    scale: 0.7,
    endScale: size === 'sm' ? 1.2 : size === 'md' ? 1.6 : 2.0,
    blend: 'add',
    alpha: 1,
  });
  // Bright flash
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x, y,
    vx: 0, vy: 0,
    life: 0.18,
    scale: size === 'sm' ? 2 : size === 'md' ? 3 : 5,
    endScale: 0.2,
    blend: 'add',
  });
  // Sparks
  const n = particleBudget(world, size === 'sm' ? 8 : size === 'md' ? 16 : 28);
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * (size === 'lg' ? 280 : size === 'md' ? 200 : 140);
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.hardOrange,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.35,
      scale: 1.1,
      endScale: 0.4,
      blend: 'add',
      tint: 0xffaa66,
      drag: 2.5,
    });
  }
  // Smoke
  const smokeCount = particleBudget(world, size === 'sm' ? 4 : size === 'md' ? 8 : 14);
  for (let i = 0; i < smokeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 90;
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.softOrange,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: 0.8 + Math.random() * 0.6,
      scale: 1.1,
      endScale: 1.8,
      blend: 'add',
      tint: 0x553311,
      alpha: 0.6,
      drag: 1.5,
    });
  }
  world.audio.play(size === 'lg' ? 'boom_lg' : size === 'md' ? 'boom_md' : 'boom_sm', { volume: size === 'lg' ? 0.4 : 0.25 });
  // Screen shake
  world.screenShake = Math.max(world.screenShake, size === 'sm' ? 4 : size === 'md' ? 8 : 18);
}

export function bombFlash(world: World): void {
  const a = world.atlas.particles;
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x: world.player.x,
    y: world.player.y,
    vx: 0, vy: 0,
    life: 0.6,
    scale: 4,
    endScale: 40,
    blend: 'add',
    alpha: 0.85,
  });
  world.screenShake = Math.max(world.screenShake, 20);
  world.audio.play('bomb', { volume: 0.5 });
}

export function pickupFlash(world: World, x: number, y: number, color: number): void {
  const a = world.atlas.particles;
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x, y,
    vx: 0, vy: 0,
    life: 0.3,
    scale: 1,
    endScale: 2.5,
    blend: 'add',
    tint: color,
    alpha: 0.8,
  });
  world.audio.play('pickup', { volume: 0.2 });
}

/** Loud, readable missile splash — bigger than the generic 'sm' explosion so
 *  the player sees clearly when AoE went off. Two concentric expanding rings,
 *  a bright yellow core, orange shrapnel cloud, drifting smoke, and a brief
 *  shake. Use this from `applyProjectileSplash`, not for every projectile. */
export function missileBlast(world: World, x: number, y: number): void {
  const a = world.atlas.particles;
  const e = world.atlas.explosions;
  // Inner ring — fast, bright orange-yellow.
  spawnParticle(world, world.layers.effectsOver, {
    texture: e[0],
    x, y,
    vx: 0, vy: 0,
    life: 0.32,
    scale: 0.4,
    endScale: 1.4,
    blend: 'add',
    tint: 0xffd166,
    alpha: 1,
  });
  // Outer shockwave — slower, wider, hotter.
  spawnParticle(world, world.layers.effectsOver, {
    texture: e[1],
    x, y,
    vx: 0, vy: 0,
    life: 0.55,
    scale: 0.5,
    endScale: 2.0,
    blend: 'add',
    tint: 0xff7733,
    alpha: 0.85,
  });
  // Pure-white core flash.
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x, y,
    vx: 0, vy: 0,
    life: 0.16,
    scale: 2.4,
    endScale: 0.4,
    blend: 'add',
    alpha: 1,
  });
  // Color-tinted secondary glow that lingers.
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softOrange,
    x, y,
    vx: 0, vy: 0,
    life: 0.45,
    scale: 1.4,
    endScale: 3.2,
    blend: 'add',
    tint: 0xff9a3a,
    alpha: 0.85,
  });
  // Shrapnel sparks — 14 outward, fast.
  const shrapnel = particleBudget(world, 14);
  for (let i = 0; i < shrapnel; i++) {
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 180 + Math.random() * 220;
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.hardOrange,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      scale: 1.4,
      endScale: 0.3,
      blend: 'add',
      tint: i % 3 === 0 ? 0xfff066 : 0xffaa44,
      drag: 3,
    });
  }
  // Tiny white-hot pinpoint sparks for grit.
  const pinpoints = particleBudget(world, 6);
  for (let i = 0; i < pinpoints; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 280 + Math.random() * 220;
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.hardWhite,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.22 + Math.random() * 0.18,
      scale: 0.9,
      endScale: 0.2,
      blend: 'add',
      drag: 5,
    });
  }
  // Drifting smoke puffs (a few, slow, going up).
  const puffs = particleBudget(world, 5);
  for (let i = 0; i < puffs; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 70;
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.softOrange,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.9 + Math.random() * 0.5,
      scale: 1.3,
      endScale: 2.4,
      blend: 'add',
      tint: 0x6a3a18,
      alpha: 0.55,
      drag: 1.4,
    });
  }
  world.audio.play('boom_sm', { volume: 0.35, pitch: 1.05 + Math.random() * 0.1 });
  world.screenShake = Math.max(world.screenShake, 6);
}

/** Tiny short flash + a few outward sparks to mark a weapon's muzzle every
 *  time it fires. Used by every player weapon so the player can clearly see
 *  which barrel the shot came out of. Kept small so a continuous burst
 *  doesn't smear the screen. */
export function muzzleFlash(world: World, x: number, y: number, color: number): void {
  const a = world.atlas.particles;
  // Bright white pop — primary visual cue.
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x, y,
    vx: 0, vy: 0,
    life: 0.06,
    scale: 0.7,
    endScale: 1.5,
    blend: 'add',
    alpha: 1,
  });
  // Colored secondary ring matching the weapon palette.
  spawnParticle(world, world.layers.effectsOver, {
    texture: a.softWhite,
    x, y,
    vx: 0, vy: 0,
    life: 0.1,
    scale: 0.4,
    endScale: 1.2,
    blend: 'add',
    tint: color,
    alpha: 0.85,
  });
  // Three tiny outward sparks for grit.
  for (let i = 0; i < 3; i++) {
    const a2 = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const sp = 60 + Math.random() * 80;
    spawnParticle(world, world.layers.effectsOver, {
      texture: a.hardWhite,
      x, y,
      vx: Math.cos(a2) * sp,
      vy: Math.sin(a2) * sp,
      life: 0.12,
      scale: 1,
      endScale: 0.2,
      blend: 'add',
      tint: color,
      drag: 8,
    });
  }
}
