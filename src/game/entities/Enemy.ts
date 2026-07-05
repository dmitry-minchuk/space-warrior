import { Container, Sprite, Texture } from 'pixi.js';
import type { World } from '../world';

export type MovementUpdater = (e: Enemy, dt: number, world: World) => void;
export type CombatUpdater = (e: Enemy, dt: number, world: World) => void;
export type EnemyDeathHandler = (e: Enemy, world: World) => void;

export interface EnemyArchetype {
  key: string;
  texture: Texture;
  hp: number;
  radius: number;
  speed: number;
  scoreValue: number;
  contactDamage: number;
  visualKey: string;            // collision/grouping
  movementUpdate: MovementUpdater;
  combatUpdate: CombatUpdater;
  loot: LootRoll;
  onDeath?: EnemyDeathHandler;  // e.g., explode into kamikaze damage
  spinSelf?: number;
  flipY?: boolean;
}

export interface LootRoll {
  // Weighted entries summing to <= 1.0 (remainder = no drop).
  entries: Array<{ key: string; weight: number }>;
  guaranteed?: string[];
}

let nextId = 1;

export class Enemy {
  id = 0;
  alive = true;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  hp = 0;
  age = 0;
  combatTimer = 0;
  combatState = 0;
  combatPhase = 0;
  burstLeft = 0;
  burstInterval = 0;
  // Movement scratch
  phase = 0;
  amp = 0;
  freq = 0;
  baseX = 0;
  targetY = 0;
  targetX = 0;
  diveState = 0;
  hovering = false;
  laserChargeT = 0;
  // Archetype-specific options bag
  opts: Record<string, number | string> = {};
  archetype!: EnemyArchetype;
  sprite: Sprite;
  hitFlash = 0;
  invisible = false;
  invisibilityT = 0;

  constructor() {
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
  }

  configure(arch: EnemyArchetype, x: number, y: number, opts: Record<string, number | string> = {}): void {
    this.id = nextId++;
    this.alive = true;
    this.archetype = arch;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = arch.speed;
    this.hp = arch.hp;
    this.age = 0;
    this.combatTimer = 0;
    this.combatState = 0;
    this.combatPhase = 0;
    this.burstLeft = 0;
    this.burstInterval = 0;
    this.phase = 0;
    this.amp = 0;
    this.freq = 0;
    this.baseX = x;
    this.targetY = 0;
    this.targetX = x;
    this.diveState = 0;
    this.hovering = false;
    this.laserChargeT = 0;
    this.opts = opts;
    this.hitFlash = 0;
    this.invisible = false;
    this.invisibilityT = 0;
    this.sprite.texture = arch.texture;
    this.sprite.alpha = 1;
    this.sprite.tint = 0xffffff;
    this.sprite.scale.set(1);
    if (arch.flipY) this.sprite.scale.y = -1;
    this.sprite.rotation = 0;
    this.sprite.position.set(x, y);
  }

  attach(layer: Container): void {
    layer.addChild(this.sprite);
  }
  detach(): void {
    if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
  }

  damage(amount: number): boolean {
    this.hp -= amount;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  postUpdateVisual(dt: number): void {
    this.sprite.position.set(this.x, this.y);
    if (this.archetype.spinSelf) this.sprite.rotation += this.archetype.spinSelf * dt;
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.sprite.tint = this.hitFlash > 0 ? 0xffd6d6 : 0xffffff;
    }
    if (this.invisibilityT > 0) {
      this.invisibilityT -= dt;
      if (this.invisible) this.sprite.alpha = 0.25;
      else this.sprite.alpha = 1;
    }
  }
}

export class EnemyPool {
  private free: Enemy[] = [];
  /** Pre-allocate so the largest wave never pays construction cost mid-run. */
  prewarm(n: number): void {
    while (this.free.length < n) this.free.push(new Enemy());
  }
  spawn(arch: EnemyArchetype, x: number, y: number, layer: Container, opts: Record<string, number | string> = {}): Enemy {
    const e = this.free.pop() ?? new Enemy();
    e.configure(arch, x, y, opts);
    e.attach(layer);
    return e;
  }
  release(e: Enemy): void {
    e.detach();
    this.free.push(e);
  }
}
