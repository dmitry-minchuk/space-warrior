import { Container, Sprite, Texture } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../engine/constants';

export type ProjectileOwner = 'player' | 'enemy';

export type ProjectileVisual =
  | 'pulse'
  | 'spread'
  | 'plasma'
  | 'laser'
  | 'missile'
  | 'wave'
  | 'lightning'
  | 'enemyBullet'
  | 'enemyHeavy'
  | 'enemyPlasma'
  | 'enemyBomb'
  | 'mine';

export interface ProjectileOpts {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  owner: ProjectileOwner;
  texture: Texture;
  visual: ProjectileVisual;
  radius?: number;
  lifetime?: number;
  piercing?: boolean;
  homing?: boolean;
  wave?: { amp: number; freq: number };
  beam?: { length: number };
  rotateToVelocity?: boolean;
  spin?: number;
  scale?: number;
  homingSpeed?: number;
  homingTurn?: number;
  interceptible?: boolean;
  interceptHp?: number;
}

function defaultInterceptHp(owner: ProjectileOwner, visual: ProjectileVisual): number {
  if (owner !== 'enemy') return 0;
  switch (visual) {
    case 'enemyBullet':
      return 1;
    case 'enemyPlasma':
      return 3;
    case 'enemyHeavy':
      return 5;
    case 'enemyBomb':
    case 'mine':
      return 2;
    default:
      return 0;
  }
}

export class Projectile {
  alive = true;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  damage = 0;
  owner: ProjectileOwner = 'player';
  visual: ProjectileVisual = 'pulse';
  radius = 6;
  lifetime = 6;
  piercing = false;
  homing = false;
  wave?: { amp: number; freq: number; phase: number; baseX: number };
  beam?: { length: number };
  rotateToVelocity = false;
  spin = 0;
  age = 0;
  sprite: Sprite;
  private layer: Container | null = null;
  // Bookkeeping for piercing — entity ids already hit (one-shot piercing).
  hitIds = new Set<number>();
  // For cooldown-based piercing (e.g. wave): timestamp of last hit per target.
  hitCooldown: Map<number, number> = new Map();
  // Plasma orbs arc lightning to nearby enemies; this counts down between arcs.
  arcCooldownT = 0;
  // Homing target cache — refreshed every 0.06s instead of every frame so a
  // big air war doesn't pay O(P*E) per tick.
  homingRetargetT = 0;
  homingTx = 0;
  homingTy = 0;
  hasHomingTarget = false;
  homingSpeed = 360;
  homingTurn = 4;
  interceptible = false;
  interceptHp = 0;

  constructor() {
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
  }

  configure(opts: ProjectileOpts): void {
    this.alive = true;
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    this.damage = opts.damage;
    this.owner = opts.owner;
    this.visual = opts.visual;
    this.radius = opts.radius ?? 6;
    this.lifetime = opts.lifetime ?? 6;
    this.piercing = !!opts.piercing;
    this.homing = !!opts.homing;
    this.wave = opts.wave
      ? { amp: opts.wave.amp, freq: opts.wave.freq, phase: 0, baseX: opts.x }
      : undefined;
    this.beam = opts.beam ? { length: opts.beam.length } : undefined;
    this.rotateToVelocity = !!opts.rotateToVelocity;
    this.spin = opts.spin ?? 0;
    this.age = 0;
    this.hitIds.clear();
    this.hitCooldown.clear();
    this.arcCooldownT = 0;
    this.homingRetargetT = 0;
    this.hasHomingTarget = false;
    this.homingSpeed = opts.homingSpeed ?? 360;
    this.homingTurn = opts.homingTurn ?? 4;
    const interceptHp = opts.interceptHp ?? defaultInterceptHp(opts.owner, opts.visual);
    this.interceptHp = interceptHp;
    this.interceptible = opts.interceptible ?? (opts.owner === 'enemy' && interceptHp > 0);
    this.sprite.texture = opts.texture;
    this.sprite.position.set(this.x, this.y);
    this.sprite.alpha = 1;
    this.sprite.scale.set(opts.scale ?? 1);
    if (this.rotateToVelocity) this.sprite.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    else this.sprite.rotation = 0;
  }

  attach(layer: Container): void {
    this.layer = layer;
    layer.addChild(this.sprite);
  }

  detach(): void {
    if (this.layer) this.layer.removeChild(this.sprite);
    this.layer = null;
  }

  update(dt: number, targetX = 0, targetY = 0, hasTarget = false): void {
    this.age += dt;
    if (this.age > this.lifetime) {
      this.alive = false;
      return;
    }
    if (this.homing && hasTarget) {
      // steer toward target (gentle homing)
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const desiredVx = (dx / len) * this.homingSpeed;
      const desiredVy = (dy / len) * this.homingSpeed;
      // ease velocity
      this.vx += (desiredVx - this.vx) * Math.min(1, dt * this.homingTurn);
      this.vy += (desiredVy - this.vy) * Math.min(1, dt * this.homingTurn);
    }
    if (this.wave) {
      // sinusoidal lateral offset
      this.wave.phase += dt * this.wave.freq;
      // The wave moves in projectile's primary direction; for vertical motion (vy != 0),
      // wave displaces x. Compute baseline x and apply offset.
      this.wave.baseX += this.vx * dt;
      this.x = this.wave.baseX + Math.sin(this.wave.phase) * this.wave.amp;
      this.y += this.vy * dt;
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    if (this.spin) this.sprite.rotation += this.spin * dt;
    if (this.rotateToVelocity) this.sprite.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    this.sprite.position.set(this.x, this.y);
    // Out of bounds: kill (with margin)
    if (
      this.x < -64 ||
      this.x > GAME_WIDTH + 64 ||
      this.y < -64 ||
      this.y > GAME_HEIGHT + 64
    ) {
      this.alive = false;
    }
  }
}

export class ProjectilePool {
  private free: Projectile[] = [];
  spawn(opts: ProjectileOpts, layer: Container): Projectile {
    const p = this.free.pop() ?? new Projectile();
    p.configure(opts);
    p.attach(layer);
    return p;
  }
  release(p: Projectile): void {
    p.detach();
    this.free.push(p);
  }
}
