import { Container, Sprite, Texture } from 'pixi.js';

export interface ParticleOpts {
  texture: Texture;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  scale?: number;
  endScale?: number;
  rotation?: number;
  spin?: number;
  alpha?: number;
  fade?: boolean;
  blend?: 'normal' | 'add';
  drag?: number;
  tint?: number;
}

export class Particle {
  alive = true;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 1;
  age = 0;
  scale = 1;
  endScale = 1;
  spin = 0;
  alpha = 1;
  fade = true;
  drag = 0;
  sprite: Sprite;
  private layer: Container | null = null;

  constructor() {
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
  }

  configure(o: ParticleOpts): void {
    this.alive = true;
    this.x = o.x;
    this.y = o.y;
    this.vx = o.vx;
    this.vy = o.vy;
    this.life = o.life;
    this.age = 0;
    this.scale = o.scale ?? 1;
    this.endScale = o.endScale ?? this.scale;
    this.spin = o.spin ?? 0;
    this.alpha = o.alpha ?? 1;
    this.fade = o.fade ?? true;
    this.drag = o.drag ?? 0;
    this.sprite.texture = o.texture;
    this.sprite.blendMode = o.blend === 'add' ? 'add' : 'normal';
    this.sprite.rotation = o.rotation ?? 0;
    this.sprite.scale.set(this.scale);
    this.sprite.alpha = this.alpha;
    this.sprite.tint = o.tint ?? 0xffffff;
    this.sprite.position.set(this.x, this.y);
  }

  attach(layer: Container): void {
    this.layer = layer;
    layer.addChild(this.sprite);
  }

  detach(): void {
    if (this.layer) this.layer.removeChild(this.sprite);
    this.layer = null;
  }

  update(dt: number): void {
    this.age += dt;
    if (this.age >= this.life) {
      this.alive = false;
      return;
    }
    const t = this.age / this.life;
    if (this.drag) {
      const d = Math.exp(-this.drag * dt);
      this.vx *= d;
      this.vy *= d;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const s = this.scale + (this.endScale - this.scale) * t;
    this.sprite.position.set(this.x, this.y);
    this.sprite.scale.set(s);
    if (this.spin) this.sprite.rotation += this.spin * dt;
    if (this.fade) this.sprite.alpha = this.alpha * (1 - t);
  }
}

export class ParticlePool {
  private free: Particle[] = [];
  spawn(opts: ParticleOpts, layer: Container): Particle {
    const p = this.free.pop() ?? new Particle();
    p.configure(opts);
    p.attach(layer);
    return p;
  }
  release(p: Particle): void {
    p.detach();
    this.free.push(p);
  }
}
