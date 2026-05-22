import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { World } from '../world';

export interface BossSpec {
  key: string;
  name: string;
  texture: Texture;
  maxHp: number;
  radius: number;
  scoreValue: number;
  // Movement entry: enters from top until y reaches `entryY`, then update() takes over.
  entryY: number;
  update: (boss: Boss, dt: number, world: World) => void;
  // Drop drops on death (in addition to default health_l).
  loot?: string[];
}

// 7 slot types matching the boss-parts plan. Effect on break is owned by the
// boss script (it reads b.state.broken_<id>); routing & visual feedback live
// here so every boss inherits them automatically.
//  T = turret pod      → optional, splits damage 60/40 with hull
//  S = shield gen      → blocking; while alive hull takes 0.7× damage
//  A = armor plate     → blocking; protects a quadrant
//  E = engine module   → optional, splits damage; on break hull immobilised
//  M = missile pod     → optional, splits damage; on break missile salvo dies
//  P = sensor / scope  → optional, splits damage; on break boss goes blind
//  H = hatch / spawner → optional, splits damage; on break minion spawn dies
export type BossPartKind = 'T' | 'S' | 'A' | 'E' | 'M' | 'P' | 'H';
export interface BossPart {
  kind: BossPartKind;
  /** Stable id used by the boss script to read brokenness from b.state.broken_<id>. */
  id: string;
  /** Position offset from boss centre. */
  ox: number;
  oy: number;
  radius: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Blocks direct hull damage in its zone (S, A). */
  blocks: boolean;
  graphics: Graphics;
  /** Time since destruction — drives the smoke-emit cadence. */
  smokeT: number;
  /** Accent colour for the overlay, derived from kind. */
  accent: number;
}

let nextId = 100000;

export class Boss {
  id = nextId++;
  alive = true;
  x = 0;
  y = -100;
  vx = 0;
  vy = 100;
  hp = 0;
  maxHp = 0;
  radius = 80;
  phase = 0;
  combatPhase = 0;
  age = 0;
  combatTimer = 0;
  combatSub = 0;
  burstLeft = 0;
  spec!: BossSpec;
  sprite: Sprite;
  hitFlash = 0;
  state: Record<string, number> = {};
  entering = true;
  dying = false;
  deathHandled = false;
  dieT = 0;
  parts: BossPart[] = [];
  /** When the parts roster changes (e.g. Architect transformations), the
   *  boss script bumps this and the helper rebuilds the list. */
  partsKey = '';

  constructor() {
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
  }

  configure(spec: BossSpec, centerX: number): void {
    this.id = nextId++;
    this.alive = true;
    this.spec = spec;
    this.x = centerX;
    this.y = -120;
    this.vx = 0;
    this.vy = 110;
    this.hp = spec.maxHp;
    this.maxHp = spec.maxHp;
    this.radius = spec.radius;
    this.phase = 0;
    this.combatPhase = 0;
    this.age = 0;
    this.combatTimer = 1;
    this.combatSub = 0;
    this.burstLeft = 0;
    this.state = {};
    this.entering = true;
    this.dying = false;
    this.deathHandled = false;
    this.dieT = 0;
    // Clean up any leftover part overlays (Boss instances aren't pooled today
    // but this guards against future pooling).
    for (const part of this.parts) {
      if (part.graphics.parent) part.graphics.parent.removeChild(part.graphics);
      part.graphics.destroy();
    }
    this.parts = [];
    this.partsKey = '';
    this.sprite.texture = spec.texture;
    this.sprite.scale.set(1);
    this.sprite.alpha = 1;
    this.sprite.tint = 0xffffff;
    this.sprite.rotation = 0;
    this.sprite.position.set(this.x, this.y);
  }

  attach(layer: Container): void {
    layer.addChild(this.sprite);
  }
  detach(): void {
    if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
    for (const part of this.parts) {
      if (part.graphics.parent) part.graphics.parent.removeChild(part.graphics);
      part.graphics.destroy();
    }
    this.parts = [];
  }

  /** Direct hull damage (used by AoE sources that bypass routing, e.g. bombs).
   *  Still respects the shield-generator damage multiplier so smart play matters. */
  damage(amount: number): boolean {
    if (!this.alive || this.entering || this.dying) return false;
    this.hp -= amount * this.hullDamageMul();
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      return true;
    }
    return false;
  }

  /** Point-routed damage. Used for projectile impacts.
   *  1. Blocking part in range (S/A) → all damage to that part.
   *  2. Non-blocking part in range (T/E/M/P/H) → 60% to part, 40% to hull.
   *  3. No parts in range → 100% to hull.
   *  4. Hull damage is further multiplied by hullDamageMul (shield, core-open
   *     window, broken-zone armor). */
  damageAt(x: number, y: number, amount: number): boolean {
    if (!this.alive || this.entering || this.dying) return false;
    let blocker: BossPart | null = null;
    const optionals: BossPart[] = [];
    for (const part of this.parts) {
      if (!part.alive) continue;
      const dx = (this.x + part.ox) - x;
      const dy = (this.y + part.oy) - y;
      if (dx * dx + dy * dy <= part.radius * part.radius) {
        if (part.blocks) { blocker = part; break; }
        optionals.push(part);
      }
    }
    if (blocker) {
      this.applyPartDamage(blocker, amount);
      this.hitFlash = 0.08;
      return false;
    }
    let hullShare = amount;
    if (optionals.length > 0) {
      const partShare = amount * 0.6;
      for (const p of optionals) this.applyPartDamage(p, partShare);
      hullShare = amount * 0.4;
    }
    return this.damage(hullShare);
  }

  /** Spread a small portion of damage across all live parts (used by AoE
   *  sources like bombs so parts aren't trivialised by AoE play). */
  damageAllParts(amount: number): void {
    for (const part of this.parts) {
      if (!part.alive) continue;
      this.applyPartDamage(part, amount);
    }
  }

  private applyPartDamage(part: BossPart, amount: number): void {
    if (!part.alive) return;
    part.hp -= amount;
    if (part.hp <= 0) {
      part.hp = 0;
      part.alive = false;
      // Boss script reads this flag and adapts (e.g. skip turret beat).
      this.state[`broken_${part.id}`] = 1;
      // Shield generator break opens a brief "core-open" damage window.
      if (part.kind === 'S') this.state.coreOpenT = 4;
    }
  }

  /** Hull damage multiplier driven by alive shield generators and the
   *  post-shield open-core window. Boss scripts can also push extra
   *  per-zone multipliers via b.state.hullMul. */
  private hullDamageMul(): number {
    let mul = 1;
    // Live shield generators dampen incoming damage by 30%.
    for (const part of this.parts) if (part.alive && part.kind === 'S') mul *= 0.7;
    // Open-core window after shield break: +50% damage for a few seconds.
    if ((this.state.coreOpenT ?? 0) > 0) mul *= 1.5;
    // Boss-script overrides.
    const extra = this.state.hullMul ?? 0;
    if (extra > 0) mul *= 1 + extra;
    return mul;
  }

  postUpdateVisual(dt: number): void {
    this.sprite.position.set(this.x, this.y);
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.sprite.tint = this.hitFlash > 0 ? 0xffd6d6 : 0xffffff;
    }
    // Tick the open-core window so the +50% damage bonus actually expires.
    if ((this.state.coreOpenT ?? 0) > 0) {
      this.state.coreOpenT = Math.max(0, (this.state.coreOpenT ?? 0) - dt);
    }
    if (this.dying) {
      this.dieT += dt;
      this.sprite.alpha = 0;
      // Hide parts on death so they don't linger after the boss vanishes.
      for (const part of this.parts) part.graphics.visible = false;
      if (this.dieT > 0.3) this.alive = false;
      return;
    }
    // Subtle "breathing" so the boss never looks static.
    if (!this.entering) {
      const t = this.age;
      const breath = 1 + Math.sin(t * 1.6) * 0.018;
      this.sprite.scale.set(breath);
      this.sprite.rotation = Math.sin(t * 0.45) * 0.025;
    }
    // Drag every part overlay along with the boss and update its visuals.
    for (const part of this.parts) {
      part.graphics.position.set(this.x + part.ox, this.y + part.oy);
      if (part.alive) {
        // Alive: alpha scales with hp; pulsing aura shows it as an interactive target.
        const hpFrac = part.hp / part.maxHp;
        const pulse = 0.85 + Math.sin(this.age * 5 + part.ox * 0.3) * 0.1;
        part.graphics.scale.set(pulse);
        part.graphics.alpha = 0.55 + hpFrac * 0.45;
      } else {
        part.smokeT += dt;
        // Dim, broken overlay — half-transparent, slightly jittering.
        part.graphics.alpha = 0.35;
        const jitter = 1 + Math.sin(this.age * 12 + part.ox) * 0.04;
        part.graphics.scale.set(jitter);
      }
    }
  }
}
