import { GAME_HEIGHT, GAME_WIDTH } from '../../engine/constants';
import type { Enemy, MovementUpdater } from '../entities/Enemy';

// Helper: signed distance to nearest player projectile (used by evasive jukes).
function nearestPlayerShotX(e: Enemy, world: import('../world').World): { dx: number; dist: number } | null {
  let best: { dx: number; dist: number } | null = null;
  for (const p of world.projectiles) {
    if (!p.alive || p.owner !== 'player') continue;
    // Only consider shots that could hit us soon (above us, moving up)
    if (p.y > e.y + 200) continue;
    if (p.y < e.y - 400) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    if (!best || d < best.dist) best = { dx, dist: d };
  }
  return best;
}

export const moveStraight: MovementUpdater = (e, dt) => {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
};

// Sine: side-to-side while descending. amp/freq pulled from `opts` or defaults.
export const moveSine: MovementUpdater = (e, dt) => {
  if (e.amp === 0) {
    e.amp = (e.opts.amp as number | undefined) ?? 100;
    e.freq = (e.opts.freq as number | undefined) ?? 1.8;
  }
  e.phase += dt * e.freq;
  e.y += e.vy * dt;
  e.x = e.baseX + Math.sin(e.phase) * e.amp;
};

// Dive: accelerates down toward player x, then arcs out and exits.
export const moveDive: MovementUpdater = (e, dt, world) => {
  if (e.diveState === 0) {
    e.vy += 220 * dt;
    e.y += e.vy * dt;
    const dx = world.player.x - e.x;
    e.vx += Math.sign(dx) * 240 * dt;
    e.vx = Math.max(-220, Math.min(220, e.vx));
    e.x += e.vx * dt;
    if (e.y > GAME_HEIGHT * 0.62) {
      e.diveState = 1;
      e.combatTimer = Math.min(e.combatTimer, 0.6); // hit player with a shot mid-dive
    }
  } else {
    e.vy -= 260 * dt;
    e.vy = Math.max(e.vy, -380);
    e.y += e.vy * dt;
    e.x += e.vx * dt;
  }
};

// Strafe: side entry, sweeps across the screen, drifts down slowly.
export const moveStrafe: MovementUpdater = (e, dt) => {
  e.x += e.vx * dt;
  e.y += e.vy * 0.3 * dt;
};

// Hover: descend to target Y, then slide side-to-side. Periodically chooses
// a new horizontal target to keep the player on their toes.
export const moveHover: MovementUpdater = (e, dt) => {
  if (e.targetY === 0) e.targetY = 80 + Math.random() * 140;
  if (!e.hovering) {
    e.y += e.vy * dt;
    if (e.y >= e.targetY) {
      e.y = e.targetY;
      e.vy = 0;
      e.hovering = true;
      e.targetX = 120 + Math.random() * (GAME_WIDTH - 240);
    }
  } else {
    // Slide toward targetX; pick new one when close
    const dx = e.targetX - e.x;
    if (Math.abs(dx) < 6) {
      e.targetX = 120 + Math.random() * (GAME_WIDTH - 240);
    }
    e.x += Math.sign(dx) * Math.min(Math.abs(dx), 140) * dt;
    e.baseX = e.x;
    // Subtle vertical bob
    e.phase += dt * 1.4;
    e.y = e.targetY + Math.sin(e.phase) * 6;
  }
};

// Chase: kamikaze that accelerates toward the player.
export const moveChase: MovementUpdater = (e, dt, world) => {
  const speedCap = Math.max(220, e.archetype.speed + e.age * 60);
  const dx = world.player.x - e.x;
  const dy = world.player.y - e.y;
  const len = Math.hypot(dx, dy) || 1;
  const ax = (dx / len) * 900;
  const ay = (dy / len) * 900;
  e.vx += ax * dt;
  e.vy += ay * dt;
  const sp = Math.hypot(e.vx, e.vy);
  if (sp > speedCap) {
    e.vx = (e.vx / sp) * speedCap;
    e.vy = (e.vy / sp) * speedCap;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.sprite.rotation = Math.atan2(e.vy, e.vx) + Math.PI / 2;
};

// Orbit: circle a descending anchor.
export const moveOrbit: MovementUpdater = (e, dt) => {
  if (e.amp === 0) { e.amp = 120; e.freq = 1.4; }
  if (e.targetY === 0) e.targetY = 80;
  e.targetY += 40 * dt;
  e.phase += dt * e.freq;
  e.x = e.baseX + Math.cos(e.phase) * e.amp;
  e.y = e.targetY + Math.sin(e.phase) * (e.amp * 0.5);
};

// Path: snake-y zigzag descent for swarms.
export const movePath: MovementUpdater = (e, dt) => {
  if (e.amp === 0) { e.amp = 100; e.freq = 2.2; }
  e.phase += dt * e.freq;
  e.x = e.baseX + Math.sin(e.phase) * e.amp;
  e.y += e.vy * dt;
};

// --- new: attack-run ------------------------------------------------------
// Enters from top, swoops down, fires a burst, then arcs sideways off-screen.
export const moveAttackRun: MovementUpdater = (e, dt, world) => {
  if (e.diveState === 0) {
    // Descend toward player's x; commit to a side at start
    if (!e.opts.side) {
      e.opts.side = world.player.x < e.x ? 'left' : 'right';
    }
    e.vy += 200 * dt;
    e.y += e.vy * dt;
    const dx = world.player.x - e.x;
    e.vx += Math.sign(dx) * 220 * dt;
    e.vx = Math.max(-220, Math.min(220, e.vx));
    e.x += e.vx * dt;
    if (e.y > GAME_HEIGHT * 0.5) {
      e.diveState = 1;
      e.combatTimer = 0.2;
    }
  } else if (e.diveState === 1) {
    // Brief level-out (this is when most of the firing happens via combat module)
    e.vy *= Math.exp(-2.0 * dt);
    const side = e.opts.side === 'left' ? -1 : 1;
    e.vx += side * 320 * dt;
    e.vx = Math.max(-340, Math.min(340, e.vx));
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (Math.abs(e.vx) > 240) e.diveState = 2;
  } else {
    // Arc out and away
    const side = e.opts.side === 'left' ? -1 : 1;
    e.vx += side * 160 * dt;
    e.vy -= 90 * dt;
    e.vy = Math.max(e.vy, -260);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
};

// Evasive sine: like sine but jukes laterally when a player projectile is near.
export const moveEvasiveSine: MovementUpdater = (e, dt, world) => {
  if (e.amp === 0) {
    e.amp = (e.opts.amp as number | undefined) ?? 90;
    e.freq = (e.opts.freq as number | undefined) ?? 1.6;
  }
  e.phase += dt * e.freq;
  e.y += e.vy * dt;
  // Base sine
  const baseSin = Math.sin(e.phase) * e.amp;
  // Juke: if a shot is close, shift baseX away from it
  const near = nearestPlayerShotX(e, world);
  if (near && near.dist < 120) {
    e.baseX += Math.sign(-near.dx) * 240 * dt;
  }
  // Clamp baseX inside playfield
  e.baseX = Math.max(60, Math.min(GAME_WIDTH - 60, e.baseX));
  e.x = e.baseX + baseSin;
};

// Pincer: enemies coming in from a side, then converging on player x mid-screen.
// `opts.side`: 'left' | 'right' should be set at spawn.
export const movePincer: MovementUpdater = (e, dt, world) => {
  if (e.diveState === 0) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    // After they've come in some distance, converge inward toward player
    if (e.opts.side === 'left' && e.x > 220) e.diveState = 1;
    else if (e.opts.side === 'right' && e.x < GAME_WIDTH - 220) e.diveState = 1;
    else if (!e.opts.side && Math.abs(e.x - GAME_WIDTH / 2) < 200) e.diveState = 1;
  } else {
    const dx = world.player.x - e.x;
    const dy = world.player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = e.archetype.speed;
    e.vx += (dx / len) * 400 * dt;
    e.vy += (dy / len) * 400 * dt;
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > speed * 1.2) {
      e.vx = (e.vx / sp) * speed * 1.2;
      e.vy = (e.vy / sp) * speed * 1.2;
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
};

// Stand-off: descend to top third, then track player horizontally while staying
// at a fixed distance (used by snipers and turret platforms).
export const moveStandoff: MovementUpdater = (e, dt, world) => {
  if (e.targetY === 0) e.targetY = 90 + Math.random() * 100;
  if (!e.hovering) {
    e.y += e.vy * dt;
    if (e.y >= e.targetY) {
      e.y = e.targetY;
      e.vy = 0;
      e.hovering = true;
    }
  } else {
    // Maintain horizontal distance from player around 220 px; pick a side
    if (e.opts.side === undefined) e.opts.side = world.player.x < e.x ? 1 : -1;
    const desiredX = world.player.x + (e.opts.side as number) * 220;
    const dx = desiredX - e.x;
    e.x += Math.sign(dx) * Math.min(Math.abs(dx), 110) * dt;
    e.baseX = e.x;
  }
};

// Bouncing: enters the playfield and bounces off side walls while descending.
export const moveBouncer: MovementUpdater = (e, dt) => {
  if (e.vx === 0) e.vx = (Math.random() < 0.5 ? -1 : 1) * 140;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  const r = e.archetype.radius;
  if (e.x < r) { e.x = r; e.vx = -e.vx; }
  if (e.x > GAME_WIDTH - r) { e.x = GAME_WIDTH - r; e.vx = -e.vx; }
};

// Keep enemies inside playfield horizontally.
export function bounceWalls(e: Enemy): void {
  const r = e.archetype.radius;
  if (e.x < r && e.vx < 0) { e.x = r; e.vx = -e.vx; e.baseX = e.x; }
  if (e.x > GAME_WIDTH - r && e.vx > 0) { e.x = GAME_WIDTH - r; e.vx = -e.vx; e.baseX = e.x; }
}
