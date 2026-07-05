import { Container, Particle as PixiParticle, ParticleContainer, Texture } from 'pixi.js';

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

/**
 * A pair of ParticleContainers (normal + additive) living inside an effects
 * layer. ParticleContainer bypasses the general scene-graph walk and quad
 * packer — with hundreds of live particles that walk was the top CPU cost on
 * TV-box profiles. All particle textures share one atlas page (see atlas.ts),
 * so each container renders as a single batch.
 */
export class ParticleLayer {
  root = new Container();
  private normal: ParticleContainer;
  private additive: ParticleContainer;

  constructor() {
    const dynamicProperties = { position: true, scale: true, rotation: true, color: true };
    this.normal = new ParticleContainer({ dynamicProperties });
    this.additive = new ParticleContainer({ dynamicProperties });
    this.additive.blendMode = 'add';
    this.root.addChild(this.normal);
    this.root.addChild(this.additive);
  }

  containerFor(blend: 'normal' | 'add'): ParticleContainer {
    return blend === 'add' ? this.additive : this.normal;
  }
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
  p: PixiParticle;
  private blend: 'normal' | 'add' = 'normal';
  private host: ParticleContainer | null = null;

  constructor() {
    this.p = new PixiParticle({ texture: Texture.WHITE, anchorX: 0.5, anchorY: 0.5 });
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
    this.blend = o.blend === 'add' ? 'add' : 'normal';
    const p = this.p;
    p.texture = o.texture;
    p.rotation = o.rotation ?? 0;
    p.scaleX = this.scale;
    p.scaleY = this.scale;
    p.alpha = this.alpha;
    p.tint = o.tint ?? 0xffffff;
    p.x = this.x;
    p.y = this.y;
  }

  attach(layer: ParticleLayer): void {
    this.host = layer.containerFor(this.blend);
    this.host.addParticle(this.p);
  }

  detach(): void {
    if (this.host) this.host.removeParticle(this.p);
    this.host = null;
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
    const p = this.p;
    p.x = this.x;
    p.y = this.y;
    p.scaleX = s;
    p.scaleY = s;
    if (this.spin) p.rotation += this.spin * dt;
    if (this.fade) p.alpha = this.alpha * (1 - t);
  }
}

export class ParticlePool {
  private free: Particle[] = [];
  prewarm(n: number): void {
    while (this.free.length < n) this.free.push(new Particle());
  }
  spawn(opts: ParticleOpts, layer: ParticleLayer): Particle {
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
