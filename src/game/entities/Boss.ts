import { Container, Sprite, Texture } from 'pixi.js';
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
  }

  damage(amount: number): boolean {
    if (!this.alive || this.entering || this.dying) return false;
    this.hp -= amount;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      return true;
    }
    return false;
  }

  postUpdateVisual(dt: number): void {
    this.sprite.position.set(this.x, this.y);
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.sprite.tint = this.hitFlash > 0 ? 0xffd6d6 : 0xffffff;
    }
    if (this.dying) {
      // Boss explodes instantly — no shake, strobe, or pre-blast inflation.
      // GameScene.onBossDeath fires the full explosion + debris immediately.
      this.dieT += dt;
      this.sprite.alpha = 0;
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
  }
}
