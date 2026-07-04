// Lightweight per-run telemetry. Accumulates counters and time-series samples
// in memory; periodically POSTs the running snapshot to /__telemetry/current
// so the dev server can dump it to disk. Game-over / level-clear additionally
// fire a snapshot POST → server keeps a timestamped copy under telemetry/runs/.
//
// All hooks are no-ops in production: the dev middleware only runs under
// `vite serve`, and the dispatcher silently swallows fetch errors when the
// endpoints aren't there (single-file release, preview build, etc.).
import type { WeaponId } from './weapons/types';

const FLUSH_INTERVAL = 1.5; // seconds
const SAMPLE_INTERVAL = 0.5; // seconds

export interface WeaponStats {
  timeEquipped: number;
  shots: number;
  hits: number;
  kills: number;
  bossDamage: number;
  intercepts: number;
}

export interface DropStats {
  rolled: Record<string, number>;
  pityHealth: number;
  pityWeapon: number;
  reroll: number;
}

export interface PlayerStats {
  deathsByLevel: Record<number, number>;
  damageTaken: number;
  bombsUsed: number;
  shieldsAbsorbed: number;
  livesPickedUp: number;
}

export interface BossPhaseLog {
  /** Encoded as "<bossKey>:<phaseIndex>". */
  key: string;
  enteredAt: number;
  duration?: number;
}

export interface EncounterLog {
  /** "level-<n>" or "boss-<n>". */
  key: string;
  startedAt: number;
  endedAt?: number;
  duration?: number;
  enemyKills?: number;
  scriptedHpKilled?: number;
  playerDeaths?: number;
  phases?: BossPhaseLog[];
}

export interface Sample {
  t: number;
  enemies: number;
  bullets: number;
  hp: number;
  weapon: WeaponId | 'none';
  level: number;
}

export interface RunSnapshot {
  runId: string;
  version: string;
  startedAt: string;
  endedAt: string | null;
  elapsed: number;
  result: string;
  level: number;
  score: number;
  player: PlayerStats;
  weapons: Record<string, WeaponStats>;
  encounters: EncounterLog[];
  samples: Sample[];
  drops: DropStats;
}

function emptyWeaponStats(): WeaponStats {
  return { timeEquipped: 0, shots: 0, hits: 0, kills: 0, bossDamage: 0, intercepts: 0 };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Single source of truth for everything we measure. The instance is created
 *  in main.ts and passed into GameScene; hooks call its mutators directly. */
export class Telemetry {
  private run: RunSnapshot;
  private flushT = 0;
  private sampleT = 0;
  // Dev-server builds only: production (incl. the APK) must stay silent.
  private enabled = import.meta.env.DEV;
  private currentWeapon: WeaponId | 'none' = 'pulse';
  private currentLevel = 1;
  private activeEncounter: EncounterLog | null = null;
  private activeBoss: EncounterLog | null = null;
  private activeBossPhase: BossPhaseLog | null = null;

  constructor(version: string) {
    const now = new Date();
    this.run = {
      runId: `${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}-${randomId()}`,
      version,
      startedAt: now.toISOString(),
      endedAt: null,
      elapsed: 0,
      result: 'in-progress',
      level: 1,
      score: 0,
      player: {
        deathsByLevel: {},
        damageTaken: 0,
        bombsUsed: 0,
        shieldsAbsorbed: 0,
        livesPickedUp: 0,
      },
      weapons: { pulse: emptyWeaponStats() },
      encounters: [],
      samples: [],
      drops: { rolled: {}, pityHealth: 0, pityWeapon: 0, reroll: 0 },
    };
  }

  // ----- lifecycle -----

  reset(): void {
    const v = this.run.version;
    this.run = new Telemetry(v).run;
    this.flushT = 0;
    this.sampleT = 0;
    this.activeEncounter = null;
    this.activeBoss = null;
    this.activeBossPhase = null;
  }

  /** Called from GameScene.update every tick. Drives the periodic snapshot
   *  POST + the sample-loop accumulation. */
  tick(dt: number, sample: () => Omit<Sample, 't'>): void {
    if (!this.enabled) return;
    this.run.elapsed += dt;
    if (this.currentWeapon !== 'none') {
      const w = this.weapon(this.currentWeapon);
      w.timeEquipped += dt;
    }
    this.sampleT -= dt;
    if (this.sampleT <= 0) {
      this.sampleT = SAMPLE_INTERVAL;
      const s = sample();
      this.run.samples.push({ t: +this.run.elapsed.toFixed(2), ...s });
    }
    this.flushT -= dt;
    if (this.flushT <= 0) {
      this.flushT = FLUSH_INTERVAL;
      this.postCurrent();
    }
  }

  // ----- per-system mutators -----

  setLevel(level: number): void {
    this.currentLevel = level;
    this.run.level = level;
  }

  setScore(score: number): void {
    this.run.score = score;
  }

  setWeapon(weapon: WeaponId | 'none'): void {
    this.currentWeapon = weapon;
    if (weapon !== 'none') this.weapon(weapon);
  }

  recordShot(weapon: WeaponId): void {
    this.weapon(weapon).shots += 1;
  }

  recordHit(weapon: WeaponId, damage: number, target: 'enemy' | 'boss'): void {
    const w = this.weapon(weapon);
    w.hits += 1;
    if (target === 'boss') w.bossDamage += damage;
  }

  recordKill(weapon: WeaponId): void {
    this.weapon(weapon).kills += 1;
  }

  recordIntercept(weapon: WeaponId): void {
    this.weapon(weapon).intercepts += 1;
  }

  recordPlayerDamage(amount: number, shielded: boolean): void {
    if (shielded) this.run.player.shieldsAbsorbed += amount;
    else this.run.player.damageTaken += amount;
  }

  recordBomb(): void {
    this.run.player.bombsUsed += 1;
  }

  recordExtraLifePickup(): void {
    this.run.player.livesPickedUp += 1;
  }

  recordDeath(level: number): void {
    this.run.player.deathsByLevel[level] = (this.run.player.deathsByLevel[level] ?? 0) + 1;
    if (this.activeEncounter) this.activeEncounter.playerDeaths = (this.activeEncounter.playerDeaths ?? 0) + 1;
    if (this.activeBoss) this.activeBoss.playerDeaths = (this.activeBoss.playerDeaths ?? 0) + 1;
  }

  recordDropRoll(key: string): void {
    this.run.drops.rolled[key] = (this.run.drops.rolled[key] ?? 0) + 1;
  }

  recordPityHealth(): void { this.run.drops.pityHealth += 1; }
  recordPityWeapon(): void { this.run.drops.pityWeapon += 1; }
  recordDropReroll(): void { this.run.drops.reroll += 1; }

  // ----- encounters -----

  startLevel(level: number): void {
    this.endActiveEncounter();
    this.activeEncounter = {
      key: `level-${level}`,
      startedAt: +this.run.elapsed.toFixed(2),
      enemyKills: 0,
      scriptedHpKilled: 0,
    };
  }

  recordEnemyKill(scoreValue: number): void {
    if (this.activeEncounter) {
      this.activeEncounter.enemyKills = (this.activeEncounter.enemyKills ?? 0) + 1;
      this.activeEncounter.scriptedHpKilled = (this.activeEncounter.scriptedHpKilled ?? 0) + scoreValue;
    }
  }

  startBoss(bossKey: string, level: number): void {
    if (this.activeBoss) this.endBoss(false);
    this.activeBoss = {
      key: `boss-${level}-${bossKey}`,
      startedAt: +this.run.elapsed.toFixed(2),
      phases: [],
    };
  }

  recordBossPhase(bossKey: string, phase: number): void {
    if (!this.activeBoss) return;
    const now = +this.run.elapsed.toFixed(2);
    if (this.activeBossPhase) {
      this.activeBossPhase.duration = +(now - this.activeBossPhase.enteredAt).toFixed(2);
      this.activeBoss.phases?.push(this.activeBossPhase);
    }
    this.activeBossPhase = { key: `${bossKey}:${phase}`, enteredAt: now };
  }

  endBoss(killed: boolean): void {
    if (!this.activeBoss) return;
    const now = +this.run.elapsed.toFixed(2);
    if (this.activeBossPhase) {
      this.activeBossPhase.duration = +(now - this.activeBossPhase.enteredAt).toFixed(2);
      this.activeBoss.phases?.push(this.activeBossPhase);
      this.activeBossPhase = null;
    }
    this.activeBoss.endedAt = now;
    this.activeBoss.duration = +(now - this.activeBoss.startedAt).toFixed(2);
    this.activeBoss.key += killed ? ':killed' : ':lost';
    this.run.encounters.push(this.activeBoss);
    this.activeBoss = null;
  }

  endActiveEncounter(): void {
    if (this.activeEncounter) {
      const now = +this.run.elapsed.toFixed(2);
      this.activeEncounter.endedAt = now;
      this.activeEncounter.duration = +(now - this.activeEncounter.startedAt).toFixed(2);
      this.run.encounters.push(this.activeEncounter);
      this.activeEncounter = null;
    }
  }

  finishRun(result: string, level: number): void {
    this.endActiveEncounter();
    if (this.activeBoss) this.endBoss(false);
    this.run.endedAt = new Date().toISOString();
    this.run.result = result;
    this.run.level = level;
    this.postCurrent();
    this.postSnapshot();
  }

  // ----- transport -----

  private weapon(id: WeaponId): WeaponStats {
    let s = this.run.weapons[id];
    if (!s) { s = emptyWeaponStats(); this.run.weapons[id] = s; }
    return s;
  }

  private serialize(): string {
    return JSON.stringify(this.run, null, 2);
  }

  /** Best-effort POST. Silently ignored if no dev server (single-file build,
   *  preview, offline). Errors are swallowed — telemetry must never break
   *  the game loop. NOTE: do NOT use `keepalive: true` — Fetch caps keepalive
   *  bodies at 64 KB and silently drops anything larger, which is most
   *  half-played runs once the sample buffer fills. Regular fetch has no such
   *  cap. We accept that a flush in flight at tab-close may not complete. */
  private postCurrent(): void {
    try {
      fetch('/__telemetry/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.serialize(),
      }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  }

  private postSnapshot(): void {
    try {
      fetch('/__telemetry/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.serialize(),
      }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  }
}
