import { Container, Sprite, Graphics } from 'pixi.js';
import {
  GAME_HEIGHT,
  PLAYER_MAX_X,
  PLAYER_MAX_Y,
  PLAYER_MIN_X,
  PLAYER_MIN_Y,
} from '../../engine/constants';
import { Input } from '../../engine/input';
import type { Atlas } from '../art/atlas';

const MAX_SPEED = 430;
const ACCEL = 3600;
const FRICTION = 16;
const MAX_HP = 100;
// Hoisted to avoid per-frame array allocation in update() — re-used by the
// engine-flame redraw loop.
const ENGINE_SIDES: readonly number[] = [-1, 1];

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  hp = MAX_HP;
  maxHp = MAX_HP;
  alive = true;
  iframes = 0;
  fireTimer = 0;
  /** Throttle for the LV5-bonus homing missile. */
  bonusMissileTimer = 0;
  // Cosmetic: engine trail emitter rate
  trailTimer = 0;
  // Time accumulator used to drive engine flame flicker.
  flickerT = 0;
  private flameRebuildT = 0;

  sprite: Sprite;
  hitRadius = 14;
  shieldSprite: Graphics;
  // Live-redrawn twin engine plumes, flickering with thrust state.
  engineFlame: Graphics;

  constructor(atlas: Atlas) {
    this.sprite = new Sprite(atlas.player);
    this.sprite.anchor.set(0.5);
    this.shieldSprite = new Graphics();
    this.shieldSprite.visible = false;
    this.engineFlame = new Graphics();
  }

  spawn(layer: Container): void {
    this.x = (PLAYER_MIN_X + PLAYER_MAX_X) / 2;
    this.y = PLAYER_MAX_Y - 20;
    this.vx = 0;
    this.vy = 0;
    this.hp = MAX_HP;
    this.alive = true;
    this.iframes = 1.5;
    this.fireTimer = 0;
    // Layering: sprite, engine flame on top (plume sits in front of nozzle), shield on top.
    layer.addChild(this.sprite);
    layer.addChild(this.engineFlame);
    layer.addChild(this.shieldSprite);
    this.sprite.position.set(this.x, this.y);
  }

  detach(): void {
    if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
    if (this.shieldSprite.parent) this.shieldSprite.parent.removeChild(this.shieldSprite);
    if (this.engineFlame.parent) this.engineFlame.parent.removeChild(this.engineFlame);
  }

  update(dt: number, speedMul: number): void {
    if (!this.alive) return;
    const ax = Input.axisX();
    const ay = Input.axisY();
    // Accelerate by input
    this.vx += ax * ACCEL * dt;
    this.vy += ay * ACCEL * dt;
    // Friction
    const f = Math.exp(-FRICTION * dt);
    if (ax === 0) this.vx *= f;
    if (ay === 0) this.vy *= f;
    // Clamp speed
    const speedCap = MAX_SPEED * speedMul;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > speedCap) {
      this.vx = (this.vx / speed) * speedCap;
      this.vy = (this.vy / speed) * speedCap;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Clamp position
    if (this.x < PLAYER_MIN_X) { this.x = PLAYER_MIN_X; this.vx = 0; }
    if (this.x > PLAYER_MAX_X) { this.x = PLAYER_MAX_X; this.vx = 0; }
    if (this.y < PLAYER_MIN_Y) { this.y = PLAYER_MIN_Y; this.vy = 0; }
    if (this.y > PLAYER_MAX_Y) { this.y = PLAYER_MAX_Y; this.vy = 0; }
    // Tilt visualisation — punchier banking response
    const targetRot = (this.vx / speedCap) * 0.28;
    this.sprite.rotation += (targetRot - this.sprite.rotation) * Math.min(1, dt * 14);
    this.sprite.position.set(this.x, this.y);
    // iframes flicker
    let alpha = 1;
    if (this.iframes > 0) {
      this.iframes -= dt;
      alpha = Math.floor(this.iframes * 20) % 2 === 0 ? 0.4 : 1;
    }
    this.sprite.alpha = alpha;

    // --- Live engine flame ---------------------------------------------------
    this.flickerT += dt;
    // The flame follows the ship every frame (cheap transform), but its
    // vector geometry is only rebuilt at ~30 Hz: a full clear+retessellate
    // of ~20 fills at 60 Hz was a constant tax on weak devices, and flame
    // flicker at 30 Hz is visually identical.
    this.engineFlame.position.set(this.x, this.y);
    this.engineFlame.rotation = this.sprite.rotation;
    this.flameRebuildT += dt;
    if (this.flameRebuildT < 1 / 30) {
      if (this.fireTimer > 0) this.fireTimer -= dt;
      if (this.bonusMissileTimer > 0) this.bonusMissileTimer -= dt;
      return;
    }
    this.flameRebuildT = 0;
    const speedFactor = Math.hypot(this.vx, this.vy) / Math.max(1, speedCap);
    const thrust = Math.max(0, -ay);
    const brake = Math.max(0, ay);
    const intensity = 0.65 + 0.45 * speedFactor + 0.6 * thrust - 0.3 * brake;
    this.engineFlame.clear();
    for (let s = 0; s < ENGINE_SIDES.length; s++) {
      const side = ENGINE_SIDES[s];
      const fx = side * 10;
      const fy = 28;
      const seed = this.flickerT * 70 + side * 3.7;
      const flick = 0.85 + 0.25 * Math.sin(seed) + 0.12 * Math.sin(seed * 2.3);
      // Banking asymmetry: outer engine burns longer when banking
      const bank = Math.max(-0.4, Math.min(0.4, side * ax * 0.45));
      const len = Math.max(8, (20 + 16 * intensity) * (1 + bank) * flick);
      const wid = 4.6 + 1.2 * intensity * flick;
      // Outer wide blue plume (additive-feel via translucent layering)
      this.engineFlame.poly([
        fx - wid * 1.5, fy - 1,
        fx + wid * 1.5, fy - 1,
        fx + wid * 0.6, fy + len * 0.4,
        fx, fy + len * 1.15,
        fx - wid * 0.6, fy + len * 0.4,
      ]).fill({ color: 0x39c6ff, alpha: 0.45 * alpha });
      // Mid cyan plume
      this.engineFlame.poly([
        fx - wid, fy,
        fx + wid, fy,
        fx + wid * 0.4, fy + len * 0.45,
        fx, fy + len,
        fx - wid * 0.4, fy + len * 0.45,
      ]).fill({ color: 0x9bf3ff, alpha: 0.75 * alpha });
      // White-hot core
      this.engineFlame.poly([
        fx - wid * 0.55, fy,
        fx + wid * 0.55, fy,
        fx, fy + len * 0.78,
      ]).fill({ color: 0xffffff, alpha: 0.95 * alpha });
      // Nozzle hot-spot
      this.engineFlame.circle(fx, fy + 0.5, 2.2 + 0.8 * flick).fill({ color: 0xeaffff, alpha: 0.95 * alpha });
      this.engineFlame.circle(fx, fy + 0.5, 1.1 + 0.4 * flick).fill({ color: 0xffffff, alpha: alpha });
      // Tiny side spark embers (random)
      if (Math.random() < 0.35) {
        const sxoff = (Math.random() - 0.5) * wid * 1.6;
        const syoff = len * (0.5 + Math.random() * 0.4);
        this.engineFlame.circle(fx + sxoff, fy + syoff, 0.7).fill({ color: 0xffffff, alpha: 0.85 * alpha });
      }
    }
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.bonusMissileTimer > 0) this.bonusMissileTimer -= dt;
  }

  damage(amount: number, shieldHp: number): { took: number; shieldRemain: number; died: boolean } {
    if (this.iframes > 0 || !this.alive) return { took: 0, shieldRemain: shieldHp, died: false };
    let took = amount;
    let shield = shieldHp;
    if (shield > 0) {
      const absorb = Math.min(shield, took);
      shield -= absorb;
      took -= absorb;
    }
    this.hp -= took;
    this.iframes = 1.0;
    let died = false;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      died = true;
    }
    return { took, shieldRemain: shield, died };
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  updateShield(shieldHp: number, time: number): void {
    if (shieldHp > 0) {
      this.shieldSprite.visible = true;
      this.shieldSprite.clear();
      const pulse = 0.6 + 0.4 * Math.sin(time * 8);
      this.shieldSprite.circle(0, 0, 28).fill({ color: 0x4eaaff, alpha: 0.08 + 0.06 * pulse });
      this.shieldSprite.circle(0, 0, 26).stroke({ color: 0xc4e2ff, width: 2, alpha: 0.6 * pulse });
      this.shieldSprite.position.set(this.x, this.y);
    } else {
      this.shieldSprite.visible = false;
    }
  }
}
