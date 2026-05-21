import type { WeaponId } from './weapons/types';
import { ALL_WEAPONS } from './weapons/types';

export interface GameState {
  level: number;       // 1..20
  lives: number;       // starting 3
  score: number;
  bombs: number;       // starting 2, max 5
  weapon: WeaponId;
  /** Per-weapon level — independent progression. */
  levels: Record<WeaponId, number>;
  /** Accumulator: every 2 same-weapon pickups grants +1 level beyond LV1. */
  pickupProgress: Record<WeaponId, number>;
  shieldHp: number;    // 0..100
  speedBoostT: number; // remaining seconds
  damageBoostT: number;
}

/**
 * Fresh weapon-level map: the starting weapon (pulse) is owned at LV1,
 * everything else is at 0 ("not yet acquired"). First pickup brings a new
 * weapon to LV1 — only repeated pickups level it up further.
 */
/**
 * Fresh weapon-level map: the starting weapon (pulse) is owned at LV1,
 * everything else is at 0 ("not yet acquired"). First pickup brings a new
 * weapon to LV1; further levels require 2 pickups each.
 */
function makeFreshLevels(): Record<WeaponId, number> {
  const out = {} as Record<WeaponId, number>;
  for (const w of ALL_WEAPONS) out[w] = w === 'pulse' ? 1 : 0;
  return out;
}

function makeFreshProgress(): Record<WeaponId, number> {
  const out = {} as Record<WeaponId, number>;
  for (const w of ALL_WEAPONS) out[w] = 0;
  return out;
}

export function createInitialState(): GameState {
  return {
    level: 1,
    lives: 3,
    score: 0,
    bombs: 2,
    weapon: 'pulse',
    levels: makeFreshLevels(),
    pickupProgress: makeFreshProgress(),
    shieldHp: 0,
    speedBoostT: 0,
    damageBoostT: 0,
  };
}

/** Reset weapons + boosts (called on player death). Score and lives are kept. */
export function resetWeaponsOnDeath(state: GameState): void {
  state.weapon = 'pulse';
  state.levels = makeFreshLevels();
  state.pickupProgress = makeFreshProgress();
  state.shieldHp = 0;
  state.speedBoostT = 0;
  state.damageBoostT = 0;
}

export function resetToLevelStart(state: GameState): void {
  state.bombs = Math.max(state.bombs, 2);
  state.shieldHp = 0;
  state.speedBoostT = 0;
  state.damageBoostT = 0;
}
