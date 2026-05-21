import type { Atlas } from '../art/atlas';
import type { EnemyArchetype, LootRoll } from '../entities/Enemy';
import {
  moveAttackRun,
  moveBouncer,
  moveChase,
  moveDive,
  moveEvasiveSine,
  moveHover,
  moveOrbit,
  movePath,
  movePincer,
  moveStandoff,
  moveStraight,
  moveStrafe,
} from './movement';
import {
  combatAimed,
  combatBombFanPressure,
  combatChainLightning,
  combatCommanderFighter,
  combatDroneCross,
  combatFighterAngles,
  combatForwardBurst,
  combatForwardSingle,
  combatHeavyBreaker,
  combatInterceptorBackshot,
  combatLobBomb,
  combatMineArcPressure,
  combatNone,
  combatPredictiveAimed,
  combatScoutAmbush,
  combatSniperAce,
  combatSpread5,
  combatSweep,
  combatTeslaWeaver,
  combatTurretCrossfire,
} from './combat';

// Loot tables — sum of weights should leave some headroom for "no drop" but
// every archetype must at least sometimes drop health or weapons, otherwise
// the player runs dry on levels where that archetype dominates.
const lootScout: LootRoll = {
  entries: [
    { key: 'gem_sm', weight: 0.24 },
    { key: 'gem_md', weight: 0.06 },
    { key: 'health_s', weight: 0.10 },
    { key: 'w_pulse', weight: 0.10 },
  ],
};
const lootFighter: LootRoll = {
  entries: [
    { key: 'gem_sm', weight: 0.16 },
    { key: 'gem_md', weight: 0.09 },
    { key: 'health_s', weight: 0.13 },
    { key: 'w_pulse', weight: 0.11 },
    { key: 'w_spread', weight: 0.11 },
    { key: 'bomb', weight: 0.03 },
  ],
};
const lootBomber: LootRoll = {
  entries: [
    { key: 'health_l', weight: 0.19 },
    { key: 'health_s', weight: 0.18 },
    { key: 'gem_md', weight: 0.14 },
    { key: 'gem_lg', weight: 0.07 },
    { key: 'w_plasma', weight: 0.15 },
    { key: 'w_missiles', weight: 0.15 },
    { key: 'damage', weight: 0.05 },
    { key: 'bomb', weight: 0.04 },
  ],
};
const lootInterceptor: LootRoll = {
  entries: [
    { key: 'gem_sm', weight: 0.18 },
    { key: 'gem_md', weight: 0.08 },
    { key: 'health_s', weight: 0.13 },
    { key: 'speed', weight: 0.06 },
    { key: 'w_spread', weight: 0.11 },
    { key: 'w_missiles', weight: 0.10 },
  ],
};
// Drones die in big numbers — keep the per-drone rate low BUT include health/weapons
// so playing through a drone swarm still feels rewarding.
const lootDrone: LootRoll = {
  entries: [
    { key: 'gem_sm', weight: 0.38 },
    { key: 'gem_md', weight: 0.04 },
    { key: 'health_s', weight: 0.05 },
    { key: 'w_pulse', weight: 0.06 },
  ],
};
const lootTurret: LootRoll = {
  entries: [
    { key: 'health_s', weight: 0.18 },
    { key: 'health_l', weight: 0.06 },
    { key: 'gem_md', weight: 0.12 },
    { key: 'w_wave', weight: 0.11 },
    { key: 'shield', weight: 0.06 },
    { key: 'bomb', weight: 0.06 },
    { key: 'damage', weight: 0.04 },
  ],
};
const lootMiner: LootRoll = {
  entries: [
    { key: 'gem_md', weight: 0.14 },
    { key: 'health_s', weight: 0.15 },
    { key: 'w_missiles', weight: 0.14 },
    { key: 'bomb', weight: 0.05 },
  ],
};
const lootSniper: LootRoll = {
  entries: [
    { key: 'gem_md', weight: 0.16 },
    { key: 'w_missiles', weight: 0.15 },
    { key: 'damage', weight: 0.06 },
    { key: 'health_s', weight: 0.15 },
    { key: 'shield', weight: 0.05 },
  ],
};
// Kamikaze also die in big numbers — same logic as drones, give occasional health.
const lootKamikaze: LootRoll = {
  entries: [
    { key: 'gem_sm', weight: 0.30 },
    { key: 'health_s', weight: 0.08 },
    { key: 'speed', weight: 0.04 },
    { key: 'w_pulse', weight: 0.06 },
  ],
};
const lootHeavy: LootRoll = {
  entries: [
    { key: 'health_l', weight: 0.23 },
    { key: 'health_s', weight: 0.18 },
    { key: 'gem_lg', weight: 0.14 },
    { key: 'w_plasma', weight: 0.15 },
    { key: 'w_missiles', weight: 0.15 },
    { key: 'w_lightning', weight: 0.11 },
    { key: 'shield', weight: 0.06 },
    { key: 'bomb', weight: 0.05 },
    { key: 'damage', weight: 0.05 },
  ],
};
const lootStealth: LootRoll = {
  entries: [
    { key: 'gem_md', weight: 0.16 },
    { key: 'w_wave', weight: 0.15 },
    { key: 'speed', weight: 0.06 },
    { key: 'health_s', weight: 0.13 },
    { key: 'shield', weight: 0.05 },
  ],
};
const lootTesla: LootRoll = {
  entries: [
    { key: 'gem_md', weight: 0.14 },
    { key: 'health_s', weight: 0.13 },
    { key: 'w_lightning', weight: 0.20 },
    { key: 'shield', weight: 0.07 },
  ],
};

// Multiplier applied to all enemy speeds (player-feedback tuning knob).
const ENEMY_SPEED_MUL = 0.8;

export function buildArchetypes(atlas: Atlas): Record<string, EnemyArchetype> {
  const base: Record<string, EnemyArchetype> = {
    // 1: Scout — straight, no fire (light recon)
    scout: {
      key: 'scout',
      texture: atlas.enemies.scout,
      hp: 20,
      radius: 18,
      speed: 220,
      scoreValue: 50,
      contactDamage: 8,
      visualKey: 'scout',
      movementUpdate: moveStraight,
      combatUpdate: combatNone,
      loot: lootScout,
    },
    // Scout variant: descends, fires single shot, peels away to the side
    'scout-shooter': {
      key: 'scout-shooter',
      texture: atlas.enemies.scout,
      hp: 24,
      radius: 18,
      speed: 200,
      scoreValue: 80,
      contactDamage: 8,
      visualKey: 'scout',
      movementUpdate: moveAttackRun,
      combatUpdate: combatForwardSingle,
      loot: lootScout,
    },
    'scout-ambusher': {
      key: 'scout-ambusher',
      texture: atlas.enemies.scout,
      hp: 26,
      radius: 18,
      speed: 230,
      scoreValue: 90,
      contactDamage: 9,
      visualKey: 'scout',
      movementUpdate: moveAttackRun,
      combatUpdate: combatScoutAmbush,
      loot: lootScout,
    },
    // 2: Fighter — evasive sine pattern, jukes player shots
    fighter: {
      key: 'fighter',
      texture: atlas.enemies.fighter,
      hp: 45,
      radius: 22,
      speed: 150,
      scoreValue: 120,
      contactDamage: 10,
      visualKey: 'fighter',
      movementUpdate: moveEvasiveSine,
      combatUpdate: combatFighterAngles,
      loot: lootFighter,
    },
    // 3: Bomber — straight descent, lobs bombs at the player
    bomber: {
      key: 'bomber',
      texture: atlas.enemies.bomber,
      hp: 100,
      radius: 30,
      speed: 90,
      scoreValue: 250,
      contactDamage: 14,
      visualKey: 'bomber',
      movementUpdate: moveStraight,
      combatUpdate: combatLobBomb,
      loot: lootBomber,
    },
    'bomber-captain': {
      key: 'bomber-captain',
      texture: atlas.enemies.bomber,
      hp: 120,
      radius: 30,
      speed: 95,
      scoreValue: 300,
      contactDamage: 15,
      visualKey: 'bomber',
      movementUpdate: moveStraight,
      combatUpdate: combatBombFanPressure,
      loot: lootBomber,
    },
    // 4: Interceptor — pikes down on the player with a burst mid-dive
    interceptor: {
      key: 'interceptor',
      texture: atlas.enemies.interceptor,
      hp: 40,
      radius: 18,
      speed: 280,
      scoreValue: 180,
      contactDamage: 12,
      visualKey: 'interceptor',
      movementUpdate: moveDive,
      combatUpdate: combatForwardBurst,
      loot: lootInterceptor,
    },
    'interceptor-ace': {
      key: 'interceptor-ace',
      texture: atlas.enemies.interceptor,
      hp: 48,
      radius: 18,
      speed: 305,
      scoreValue: 220,
      contactDamage: 14,
      visualKey: 'interceptor',
      movementUpdate: moveDive,
      combatUpdate: combatInterceptorBackshot,
      loot: lootInterceptor,
    },
    // 5: Drone — small swarm element. No fire by default.
    drone: {
      key: 'drone',
      texture: atlas.enemies.drone,
      hp: 12,
      radius: 14,
      speed: 160,
      scoreValue: 30,
      contactDamage: 6,
      visualKey: 'drone',
      movementUpdate: movePath,
      combatUpdate: combatNone,
      loot: lootDrone,
      spinSelf: 1.5,
    },
    // Drone variant with weapons
    'drone-shooter': {
      key: 'drone-shooter',
      texture: atlas.enemies.drone,
      hp: 16,
      radius: 14,
      speed: 140,
      scoreValue: 60,
      contactDamage: 6,
      visualKey: 'drone',
      movementUpdate: movePath,
      combatUpdate: combatAimed,
      loot: lootDrone,
      spinSelf: 1.5,
    },
    'drone-cross': {
      key: 'drone-cross',
      texture: atlas.enemies.drone,
      hp: 18,
      radius: 14,
      speed: 145,
      scoreValue: 70,
      contactDamage: 7,
      visualKey: 'drone',
      movementUpdate: movePath,
      combatUpdate: combatDroneCross,
      loot: lootDrone,
      spinSelf: 1.7,
    },
    // 6: Turret — hovers near top, sweeps fire across the screen
    turret: {
      key: 'turret',
      texture: atlas.enemies.turret,
      hp: 130,
      radius: 26,
      speed: 80,
      scoreValue: 220,
      contactDamage: 10,
      visualKey: 'turret',
      movementUpdate: moveHover,
      combatUpdate: combatSweep,
      loot: lootTurret,
    },
    'turret-crossfire': {
      key: 'turret-crossfire',
      texture: atlas.enemies.turret,
      hp: 115,
      radius: 26,
      speed: 85,
      scoreValue: 260,
      contactDamage: 10,
      visualKey: 'turret',
      movementUpdate: moveHover,
      combatUpdate: combatTurretCrossfire,
      loot: lootTurret,
    },
    // 7: Miner — strafe + mine drop
    miner: {
      key: 'miner',
      texture: atlas.enemies.miner,
      hp: 60,
      radius: 22,
      speed: 110,
      scoreValue: 160,
      contactDamage: 10,
      visualKey: 'miner',
      movementUpdate: moveStrafe,
      combatUpdate: combatMineArcPressure,
      loot: lootMiner,
    },
    // 8: Sniper — stand-off and charge a high-damage aimed shot
    sniper: {
      key: 'sniper',
      texture: atlas.enemies.sniper,
      hp: 55,
      radius: 18,
      speed: 80,
      scoreValue: 220,
      contactDamage: 10,
      visualKey: 'sniper',
      movementUpdate: moveStandoff,
      combatUpdate: combatSniperAce,
      loot: lootSniper,
    },
    // 9: Kamikaze — direct chase, no fire
    kamikaze: {
      key: 'kamikaze',
      texture: atlas.enemies.kamikaze,
      hp: 30,
      radius: 16,
      speed: 240,
      scoreValue: 90,
      contactDamage: 30,
      visualKey: 'kamikaze',
      movementUpdate: moveChase,
      combatUpdate: combatNone,
      loot: lootKamikaze,
    },
    // 10: Heavy assault — tank with spread fire
    heavy: {
      key: 'heavy',
      texture: atlas.enemies.heavy,
      hp: 220,
      radius: 36,
      speed: 70,
      scoreValue: 400,
      contactDamage: 18,
      visualKey: 'heavy',
      movementUpdate: moveStraight,
      combatUpdate: combatSpread5,
      loot: lootHeavy,
    },
    'heavy-breaker': {
      key: 'heavy-breaker',
      texture: atlas.enemies.heavy,
      hp: 190,
      radius: 36,
      speed: 75,
      scoreValue: 460,
      contactDamage: 19,
      visualKey: 'heavy',
      movementUpdate: moveStraight,
      combatUpdate: combatHeavyBreaker,
      loot: lootHeavy,
    },
    // 11: Stealth — sine with periodic cloaking + burst fire
    stealth: {
      key: 'stealth',
      texture: atlas.enemies.stealth,
      hp: 80,
      radius: 20,
      speed: 160,
      scoreValue: 240,
      contactDamage: 12,
      visualKey: 'stealth',
      movementUpdate: moveEvasiveSine,
      combatUpdate: combatForwardBurst,
      loot: lootStealth,
    },
    // 12: Tesla — orbit pattern, fires plasma at close range
    tesla: {
      key: 'tesla',
      texture: atlas.enemies.tesla,
      hp: 85,
      radius: 24,
      speed: 120,
      scoreValue: 220,
      contactDamage: 12,
      visualKey: 'tesla',
      movementUpdate: moveOrbit,
      combatUpdate: combatChainLightning,
      loot: lootTesla,
    },
    'tesla-weaver': {
      key: 'tesla-weaver',
      texture: atlas.enemies.tesla,
      hp: 90,
      radius: 24,
      speed: 135,
      scoreValue: 270,
      contactDamage: 13,
      visualKey: 'tesla',
      movementUpdate: moveOrbit,
      combatUpdate: combatTeslaWeaver,
      loot: lootTesla,
    },

    // ---- Elite variants — used on later levels --------------------------
    'elite-scout': {
      key: 'elite-scout',
      texture: atlas.enemies.scout,
      hp: 45,
      radius: 18,
      speed: 320,
      scoreValue: 150,
      contactDamage: 12,
      visualKey: 'elite-scout',
      movementUpdate: moveAttackRun,
      combatUpdate: combatPredictiveAimed,
      loot: lootFighter,
    },
    'elite-fighter': {
      key: 'elite-fighter',
      texture: atlas.enemies.fighter,
      hp: 75,
      radius: 22,
      speed: 190,
      scoreValue: 220,
      contactDamage: 14,
      visualKey: 'elite-fighter',
      movementUpdate: moveEvasiveSine,
      combatUpdate: combatCommanderFighter,
      loot: lootFighter,
    },
    'elite-bomber': {
      key: 'elite-bomber',
      texture: atlas.enemies.bomber,
      hp: 155,
      radius: 30,
      speed: 110,
      scoreValue: 400,
      contactDamage: 18,
      visualKey: 'elite-bomber',
      movementUpdate: moveStraight,
      combatUpdate: combatBombFanPressure,
      loot: lootBomber,
    },
    'elite-interceptor': {
      key: 'elite-interceptor',
      texture: atlas.enemies.interceptor,
      hp: 65,
      radius: 18,
      speed: 360,
      scoreValue: 300,
      contactDamage: 16,
      visualKey: 'elite-interceptor',
      movementUpdate: moveDive,
      combatUpdate: combatInterceptorBackshot,
      loot: lootInterceptor,
    },
    'elite-heavy': {
      key: 'elite-heavy',
      texture: atlas.enemies.heavy,
      hp: 320,
      radius: 36,
      speed: 90,
      scoreValue: 800,
      contactDamage: 24,
      visualKey: 'elite-heavy',
      movementUpdate: moveStraight,
      combatUpdate: combatHeavyBreaker,
      loot: lootHeavy,
    },

    // ---- Tactical variants for specific waves ---------------------------
    // Pincer — enters from a side and homes inward toward the player.
    // Wave system sets `opts.side` and starting vx.
    'fighter-pincer': {
      key: 'fighter-pincer',
      texture: atlas.enemies.fighter,
      hp: 55,
      radius: 22,
      speed: 200,
      scoreValue: 160,
      contactDamage: 12,
      visualKey: 'fighter',
      movementUpdate: movePincer,
      combatUpdate: combatFighterAngles,
      loot: lootFighter,
    },
    // Bouncer — enters and bounces between walls.
    'scout-bouncer': {
      key: 'scout-bouncer',
      texture: atlas.enemies.scout,
      hp: 28,
      radius: 18,
      speed: 180,
      scoreValue: 80,
      contactDamage: 8,
      visualKey: 'scout',
      movementUpdate: moveBouncer,
      combatUpdate: combatNone,
      loot: lootScout,
    },
  };
  // Apply global speed multiplier
  for (const k of Object.keys(base)) {
    base[k] = { ...base[k], speed: base[k].speed * ENEMY_SPEED_MUL };
  }
  return base;
}

export function rollLoot(table: LootRoll): string | null {
  const r = Math.random();
  let cum = 0;
  for (const e of table.entries) {
    cum += e.weight;
    if (r < cum) return e.key;
  }
  return null;
}
