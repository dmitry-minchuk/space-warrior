import { Graphics } from 'pixi.js';
import type { CombatUpdater, Enemy } from '../entities/Enemy';
import type { World } from '../world';

function fireEnemyShot(
  world: World,
  e: Enemy,
  vx: number,
  vy: number,
  damage = 6,
  visual: 'enemyBullet' | 'enemyHeavy' | 'enemyPlasma' | 'enemyBomb' | 'mine' = 'enemyBullet',
  radius = 6,
  lifetime = 5,
  offY = 12,
): void {
  const tex =
    visual === 'enemyHeavy' ? world.atlas.proj.enemyHeavy :
    visual === 'enemyPlasma' ? world.atlas.proj.enemyPlasma :
    visual === 'enemyBomb' ? world.atlas.proj.enemyBomb :
    visual === 'mine' ? world.atlas.proj.mine :
    world.atlas.proj.enemyBullet;
  const p = world.projectilePool.spawn({
    x: e.x,
    y: e.y + offY,
    vx,
    vy,
    damage,
    owner: 'enemy',
    texture: tex,
    visual,
    radius,
    lifetime,
    rotateToVelocity: visual !== 'mine' && visual !== 'enemyBomb',
    spin: visual === 'mine' ? 1.2 : 0,
  }, world.layers.projectiles);
  world.projectiles.push(p);
}

// Predict player position based on velocity and projectile speed.
function predictPlayerLead(e: Enemy, world: World, projSpeed: number): { vx: number; vy: number } {
  const px = world.player.x;
  const py = world.player.y;
  const pvx = world.player.vx;
  const pvy = world.player.vy;
  const dx = px - e.x;
  const dy = py - e.y;
  const dist = Math.hypot(dx, dy);
  const t = dist / projSpeed;
  // Imperfect lead (with some jitter so the player can dodge)
  const jitter = 0.65 + Math.random() * 0.45;
  const leadX = px + pvx * t * jitter;
  const leadY = py + pvy * t * jitter;
  const ldx = leadX - e.x;
  const ldy = leadY - e.y;
  const ldist = Math.hypot(ldx, ldy) || 1;
  return { vx: (ldx / ldist) * projSpeed, vy: (ldy / ldist) * projSpeed };
}

function aimDirectAt(e: Enemy, world: World, speed: number): { vx: number; vy: number } {
  const dx = world.player.x - e.x;
  const dy = world.player.y - e.y;
  const len = Math.hypot(dx, dy) || 1;
  return { vx: (dx / len) * speed, vy: (dy / len) * speed };
}

function ensureTelegraphGfx(world: World): Graphics {
  let g = world.telegraphGfx;
  if (!g || g.destroyed) {
    g = new Graphics();
    world.telegraphGfx = g;
    world.layers.projectiles.addChild(g);
  }
  return g;
}

// Draw a thin charging laser line from `e` to `target` during a charge phase.
function drawTelegraph(world: World, e: Enemy, intensity: number, color = 0xff4040): void {
  const g = ensureTelegraphGfx(world);
  const x1 = e.x;
  const y1 = e.y;
  const dx = world.player.x - x1;
  const dy = world.player.y - y1;
  const len = Math.hypot(dx, dy) || 1;
  const reach = 1400;
  const ex = x1 + (dx / len) * reach;
  const ey = y1 + (dy / len) * reach;
  const t = intensity;
  g.moveTo(x1, y1).lineTo(ex, ey).stroke({ color, width: 1 + t * 2, alpha: 0.15 + t * 0.55 });
  if (t > 0.7) {
    g.moveTo(x1, y1).lineTo(ex, ey).stroke({ color: 0xffffff, width: 0.5, alpha: (t - 0.7) * 3 });
  }
  world.telegraphLifetime = 0.05;
}

// ---- combat updaters -----------------------------------------------------

export const combatNone: CombatUpdater = () => {};

export const combatForwardSingle: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 1.4 + Math.random() * 0.6;
    fireEnemyShot(world, e, 0, 280);
  }
};

export const combatForwardBurst: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.burstLeft > 0) {
    e.burstInterval -= dt;
    if (e.burstInterval <= 0) {
      e.burstLeft -= 1;
      e.burstInterval = 0.14;
      fireEnemyShot(world, e, 0, 320);
    }
  } else if (e.combatTimer <= 0) {
    e.combatTimer = 2.4;
    e.burstLeft = 3;
    e.burstInterval = 0;
  }
};

export const combatSpread3: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 2.0;
    for (let i = -1; i <= 1; i++) {
      const angle = Math.PI / 2 + i * 0.22;
      fireEnemyShot(world, e, Math.cos(angle) * 240, Math.sin(angle) * 240);
    }
  }
};

export const combatSpread5: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 2.4;
    for (let i = -2; i <= 2; i++) {
      const angle = Math.PI / 2 + i * 0.18;
      fireEnemyShot(world, e, Math.cos(angle) * 250, Math.sin(angle) * 250, 8, 'enemyHeavy', 8);
    }
  }
};

export const combatAimed: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 1.6 + Math.random() * 0.4;
    const d = aimDirectAt(e, world, 280);
    fireEnemyShot(world, e, d.vx, d.vy);
  }
};

// Predictive: tries to lead the player. Use for snipers/turrets later in game.
export const combatPredictiveAimed: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 1.8 + Math.random() * 0.4;
    const d = predictPlayerLead(e, world, 320);
    fireEnemyShot(world, e, d.vx, d.vy);
  }
};

// Twin-burst: 2 aimed shots in rapid sequence.
export const combatTwinBurst: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.burstLeft > 0) {
    e.burstInterval -= dt;
    if (e.burstInterval <= 0) {
      e.burstLeft -= 1;
      e.burstInterval = 0.18;
      const d = aimDirectAt(e, world, 280);
      fireEnemyShot(world, e, d.vx, d.vy);
    }
  } else if (e.combatTimer <= 0) {
    e.combatTimer = 2.2;
    e.burstLeft = 2;
    e.burstInterval = 0;
  }
};

export const combatLobBomb: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 3.0;
    const dx = world.player.x - e.x;
    const horiz = Math.max(-160, Math.min(160, dx * 0.7));
    fireEnemyShot(world, e, horiz, 120, 12, 'enemyBomb', 8, 6);
  }
};

export const combatMine: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 2.4;
    fireEnemyShot(world, e, 0, 30, 14, 'mine', 10, 16);
  }
};

// Snipe with visible telegraph: charge then fire a fast, very high-damage shot.
export const combatLaserCharge: CombatUpdater = (e, dt, world) => {
  if (e.combatPhase === 0) {
    e.combatTimer -= dt;
    if (e.combatTimer <= 0) {
      e.combatPhase = 1;
      e.laserChargeT = 1.1;
    }
  } else if (e.combatPhase === 1) {
    e.laserChargeT -= dt;
    // Telegraph getting brighter as charge ramps up
    const t = 1 - Math.max(0, e.laserChargeT / 1.1);
    drawTelegraph(world, e, t);
    if (e.laserChargeT <= 0) {
      const d = predictPlayerLead(e, world, 600);
      fireEnemyShot(world, e, d.vx, d.vy, 22, 'enemyPlasma', 8);
      world.audio.play('sniper_fire', { volume: 0.3 });
      e.combatPhase = 0;
      e.combatTimer = 2.8 + Math.random() * 0.6;
    }
  }
};

// Chain lightning at close range.
export const combatChainLightning: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  const dx = world.player.x - e.x;
  const dy = world.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (e.combatTimer <= 0 && dist < 360) {
    e.combatTimer = 1.4;
    const len = dist || 1;
    fireEnemyShot(world, e, (dx / len) * 480, (dy / len) * 480, 14, 'enemyPlasma', 8, 1.2);
  } else if (e.combatTimer <= 0) {
    e.combatTimer = 0.4;
  }
};

// Suppressive sweep: fire a 5-shot fan with a moving aim across the screen.
export const combatSweep: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 3.0;
    e.combatPhase = 0;
    e.burstLeft = 7;
    e.burstInterval = 0;
  }
  if (e.burstLeft > 0) {
    e.burstInterval -= dt;
    if (e.burstInterval <= 0) {
      e.burstInterval = 0.18;
      // Sweep angle from -0.4 to +0.4 across burst
      const t = 1 - e.burstLeft / 7;
      const angle = Math.PI / 2 + (-0.4 + t * 0.8);
      fireEnemyShot(world, e, Math.cos(angle) * 260, Math.sin(angle) * 260, 8);
      e.burstLeft -= 1;
    }
  }
};

// Periodic spawning of a small follow-up shot, used by some elite ships
// that ought to feel more dangerous than the base archetype.
export const combatRapidAimed: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatTimer <= 0) {
    e.combatTimer = 0.8 + Math.random() * 0.2;
    const d = aimDirectAt(e, world, 300);
    fireEnemyShot(world, e, d.vx, d.vy);
  }
};

// Forward burst + aimed mix: enemy fires straight twin shots then a single
// aimed plasma shot, then waits longer. Adds rhythm.
export const combatMixedFire: CombatUpdater = (e, dt, world) => {
  e.combatTimer -= dt;
  if (e.combatPhase === 0 && e.combatTimer <= 0) {
    // Twin forward
    fireEnemyShot(world, e, -40, 320);
    fireEnemyShot(world, e, 40, 320);
    e.combatPhase = 1;
    e.combatTimer = 0.45;
  } else if (e.combatPhase === 1 && e.combatTimer <= 0) {
    const d = aimDirectAt(e, world, 300);
    fireEnemyShot(world, e, d.vx, d.vy, 10, 'enemyPlasma', 8);
    e.combatPhase = 0;
    e.combatTimer = 2.2 + Math.random() * 0.4;
  }
};
