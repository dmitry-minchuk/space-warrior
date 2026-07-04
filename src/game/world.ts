import { Container, Graphics } from 'pixi.js';
import type { Atlas } from './art/atlas';
import type { GameState } from './state';
import type { Player } from './entities/Player';
import type { Projectile } from './entities/Projectile';
import { ProjectilePool } from './entities/Projectile';
import type { Enemy, EnemyArchetype } from './entities/Enemy';
import { EnemyPool } from './entities/Enemy';
import type { Drop } from './entities/Drop';
import { DropPool } from './entities/Drop';
import type { Boss } from './entities/Boss';
import type { Particle } from './entities/Particle';
import { ParticlePool } from './entities/Particle';
import { FloatingTextPool, type FloatingText } from './vfx/FloatingText';
import type { Telemetry } from './telemetry';

export interface Audio {
  play(name: string, opts?: { volume?: number; pitch?: number }): void;
  setMusic?(track: string): void;
  setVolumes?(opts: { music?: number; sfx?: number; ui?: number }): void;
}

export interface World {
  state: GameState;
  atlas: Atlas;
  archetypes: Record<string, EnemyArchetype>;
  layers: {
    bgFar: Container;
    bgMid: Container;
    bgNear: Container;
    effectsUnder: Container;
    entities: Container;
    projectiles: Container;
    effectsOver: Container;
    hud: Container;
  };
  player: Player;
  projectiles: Projectile[];
  enemies: Enemy[];
  drops: Drop[];
  particles: Particle[];
  floats: FloatingText[];
  boss: Boss | null;
  bossArrivedAt: number;
  time: number;
  screenShake: number;
  damageFlash: number;
  beamGfx: Graphics | null;
  beamLifetime: number;
  telegraphGfx: Graphics | null;
  telegraphLifetime: number;
  // Pools
  enemyPool: EnemyPool;
  dropPool: DropPool;
  particlePool: ParticlePool;
  projectilePool: ProjectilePool;
  floatPool: FloatingTextPool;
  // Callbacks
  onLevelClear: () => void;
  onPlayerDeath: () => void;
  onBossSpawned: (boss: Boss) => void;
  onEnemyKilled: (enemy: Enemy) => void;
  onBossKilled: (boss: Boss) => void;
  // Helpers
  audio: Audio;
  telemetry: Telemetry;
}

export function makeEmptyWorld(): Partial<World> {
  return {
    projectiles: [],
    enemies: [],
    drops: [],
    particles: [],
    floats: [],
    boss: null,
    bossArrivedAt: -1,
    time: 0,
    screenShake: 0,
    damageFlash: 0,
    beamGfx: null,
    beamLifetime: 0,
    telegraphGfx: null,
    telegraphLifetime: 0,
    enemyPool: new EnemyPool(),
    dropPool: new DropPool(),
    particlePool: new ParticlePool(),
    projectilePool: new ProjectilePool(),
    floatPool: new FloatingTextPool(),
  };
}
