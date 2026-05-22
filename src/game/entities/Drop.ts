import { Container, Sprite, Texture } from 'pixi.js';
import { GAME_HEIGHT } from '../../engine/constants';

export type DropKey =
  | 'health_s' | 'health_l'
  | 'w_pulse' | 'w_spread' | 'w_plasma' | 'w_missiles' | 'w_wave' | 'w_lightning'
  | 'shield' | 'speed' | 'damage' | 'bomb'
  | 'extra_life'
  | 'gem_sm' | 'gem_md' | 'gem_lg';

export class Drop {
  alive = true;
  x = 0;
  y = 0;
  vy = 80;
  vx = 0;
  age = 0;
  life = 15;
  blinkFrom = 12;
  key: DropKey = 'gem_sm';
  radius = 22;
  sprite: Sprite;

  constructor() {
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
  }

  configure(key: DropKey, x: number, y: number, texture: Texture, drift = 0): void {
    this.alive = true;
    this.key = key;
    this.x = x;
    this.y = y;
    this.vx = drift;
    this.vy = 80 + Math.random() * 30;
    this.age = 0;
    // Reset lifetime to defaults — boss-spawn callers may overwrite afterwards.
    this.life = 15;
    this.blinkFrom = 12;
    this.sprite.texture = texture;
    this.sprite.position.set(x, y);
    this.sprite.alpha = 1;
    this.sprite.rotation = 0;
  }

  attach(layer: Container): void {
    layer.addChild(this.sprite);
  }
  detach(): void {
    if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
  }

  update(dt: number): void {
    this.age += dt;
    if (this.age > this.life || this.y > GAME_HEIGHT + 32) {
      this.alive = false;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.exp(-1.2 * dt);
    this.sprite.position.set(this.x, this.y);
    this.sprite.rotation = Math.sin(this.age * 2.5) * 0.18;
    const pulse = 0.85 + 0.15 * Math.sin(this.age * 6);
    this.sprite.scale.set(pulse);
    if (this.age > this.blinkFrom) {
      this.sprite.alpha = Math.floor(this.age * 10) % 2 === 0 ? 0.3 : 1;
    }
  }
}

export class DropPool {
  private free: Drop[] = [];
  spawn(key: DropKey, x: number, y: number, tex: Texture, layer: Container, drift = 0): Drop {
    const d = this.free.pop() ?? new Drop();
    d.configure(key, x, y, tex, drift);
    d.attach(layer);
    return d;
  }
  release(d: Drop): void {
    d.detach();
    this.free.push(d);
  }
}
