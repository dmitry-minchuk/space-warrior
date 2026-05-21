import { GAME_WIDTH } from '../../engine/constants';
import type { World } from '../world';
import type { LevelData, WaveEntry, Formation } from './types';
import { Boss } from '../entities/Boss';
import type { BossSpec } from '../entities/Boss';

interface SpawnPos { x: number; y: number; vx?: number; vy?: number; baseX?: number; side?: 'left' | 'right' }

function formationPositions(w: WaveEntry, archetypeRadius: number): SpawnPos[] {
  const count = w.count;
  const formation = w.formation ?? 'line';
  const out: SpawnPos[] = [];
  const margin = 80;
  const innerWidth = GAME_WIDTH - margin * 2;
  switch (formation) {
    case 'line': {
      const spacing = innerWidth / (count + 1);
      for (let i = 0; i < count; i++) {
        out.push({ x: margin + spacing * (i + 1), y: -40 - archetypeRadius });
      }
      break;
    }
    case 'v': {
      const spacing = 70;
      const cx = GAME_WIDTH / 2 + (w.offset ?? 0);
      for (let i = 0; i < count; i++) {
        const offset = i - (count - 1) / 2;
        out.push({ x: cx + offset * spacing, y: -40 - Math.abs(offset) * 36 });
      }
      break;
    }
    case 'arc': {
      const cx = GAME_WIDTH / 2;
      const arcWidth = innerWidth * 0.8;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : (i - (count - 1) / 2) / (count - 1);
        out.push({ x: cx + t * arcWidth, y: -40 - Math.abs(t) * 80 });
      }
      break;
    }
    case 'swarm': {
      const cx = margin + Math.random() * innerWidth;
      const cy = -80;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        out.push({ x: cx + Math.cos(a) * 60, y: cy + Math.sin(a) * 40 });
      }
      break;
    }
    case 'random': {
      for (let i = 0; i < count; i++) {
        out.push({ x: margin + Math.random() * innerWidth, y: -40 - Math.random() * 200 });
      }
      break;
    }
    case 'strafe-l': {
      const spacing = 70;
      for (let i = 0; i < count; i++) {
        out.push({ x: -40, y: 80 + i * spacing, vx: 200, vy: 60, side: 'left' });
      }
      break;
    }
    case 'strafe-r': {
      const spacing = 70;
      for (let i = 0; i < count; i++) {
        out.push({ x: GAME_WIDTH + 40, y: 80 + i * spacing, vx: -200, vy: 60, side: 'right' });
      }
      break;
    }
    case 'sides': {
      const spacing = 70;
      const half = Math.ceil(count / 2);
      for (let i = 0; i < half; i++) {
        out.push({ x: -40, y: 80 + i * spacing, vx: 200, vy: 60, side: 'left' });
      }
      for (let i = 0; i < count - half; i++) {
        out.push({ x: GAME_WIDTH + 40, y: 80 + i * spacing, vx: -200, vy: 60, side: 'right' });
      }
      break;
    }
  }
  return out;
}

export type LevelPhase = 'waves' | 'boss-incoming' | 'boss' | 'cleared';

// Which archetypes are level-appropriate for the passive density filler.
// Pulls from progressively richer pools as levels advance.
function fillerArchetypesForLevel(level: number): string[] {
  if (level <= 2) return ['scout', 'scout-shooter', 'scout-ambusher'];
  if (level <= 4) return ['scout-shooter', 'scout-ambusher', 'fighter', 'fighter-pincer'];
  if (level <= 7) return ['fighter', 'fighter-pincer', 'interceptor', 'interceptor-ace', 'drone-cross'];
  if (level <= 10) return ['fighter-pincer', 'interceptor-ace', 'kamikaze', 'drone-cross', 'turret-crossfire'];
  if (level <= 14) return ['fighter-pincer', 'interceptor-ace', 'kamikaze', 'drone-cross', 'stealth', 'tesla-weaver'];
  if (level <= 17) return ['elite-scout', 'elite-fighter', 'interceptor-ace', 'drone-cross', 'stealth', 'tesla-weaver'];
  return ['elite-scout', 'elite-fighter', 'elite-interceptor', 'elite-bomber', 'stealth', 'tesla-weaver', 'heavy-breaker'];
}

export class LevelRunner {
  level: LevelData;
  time = 0;
  phase: LevelPhase = 'waves';
  nextWave = 0;
  bossSpec: BossSpec;
  bossSpawned = false;
  // Passive density filler — keeps the screen from going empty between named waves.
  fillerCooldown = 4;

  constructor(level: LevelData, bossSpec: BossSpec) {
    this.level = level;
    this.bossSpec = bossSpec;
  }

  update(dt: number, world: World): void {
    this.time += dt;
    if (this.phase === 'waves') {
      while (this.nextWave < this.level.waves.length) {
        const w = this.level.waves[this.nextWave];
        if (w.at > this.time) break;
        this.nextWave++;
        this.spawnWave(world, w);
      }
      // Passive filler — drop a small group whenever the playfield gets quiet.
      this.fillerCooldown -= dt;
      if (this.fillerCooldown <= 0 && world.enemies.length < 4) {
        this.spawnFiller(world);
        this.fillerCooldown = 5 + Math.random() * 2;
      } else if (world.enemies.length >= 8) {
        // Reset cooldown when crowded so filler doesn't pile up
        this.fillerCooldown = Math.max(this.fillerCooldown, 3);
      }
      const allWavesSpawned = this.nextWave >= this.level.waves.length;
      const lastWaveExpired = allWavesSpawned && world.enemies.length < 4;
      const reachedDuration = this.time > this.level.duration;
      if ((allWavesSpawned && (reachedDuration || lastWaveExpired)) || this.time > this.level.duration + 8) {
        this.phase = 'boss-incoming';
        world.audio.play('boss_warning', { volume: 0.4 });
        this.bossSpawned = false;
        this.time = 0;
      }
    } else if (this.phase === 'boss-incoming') {
      if (this.time > 2.0 && !this.bossSpawned) {
        const b = new Boss();
        b.configure(this.bossSpec, GAME_WIDTH / 2);
        b.attach(world.layers.entities);
        world.boss = b;
        world.bossArrivedAt = -1;
        this.bossSpawned = true;
        world.onBossSpawned(b);
        this.phase = 'boss';
      }
    } else if (this.phase === 'boss') {
      if (!world.boss || !world.boss.alive) {
        this.phase = 'cleared';
        world.onLevelClear();
      }
    }
  }

  private spawnFiller(world: World): void {
    const pool = fillerArchetypesForLevel(this.level.id);
    const key = pool[Math.floor(Math.random() * pool.length)];
    if (!world.archetypes[key]) return;
    // Pick a formation that suits the group size
    const formations: Formation[] = ['line', 'v', 'arc', 'random', 'strafe-l', 'strafe-r'];
    const f = formations[Math.floor(Math.random() * formations.length)];
    const count = key === 'drone' || key === 'drone-shooter' || key === 'drone-cross' ? 4 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 3);
    this.spawnWave(world, { at: this.time, spawn: key, count, formation: f });
  }

  private spawnWave(world: World, w: WaveEntry): void {
    const arch = world.archetypes[w.spawn];
    if (!arch) return;
    const positions = formationPositions(w, arch.radius);
    for (const pos of positions) {
      const e = world.enemyPool.spawn(arch, pos.x, pos.y, world.layers.entities);
      e.baseX = pos.baseX ?? pos.x;
      if (pos.vx !== undefined) e.vx = pos.vx;
      if (pos.vy !== undefined) e.vy = pos.vy;
      if (pos.side) e.opts.side = pos.side;
      world.enemies.push(e);
    }
  }
}
