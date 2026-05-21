import { Container, Graphics } from 'pixi.js';
import { softGlow } from './forge';

// ---- frame helpers -------------------------------------------------------
// Drop icons are large (48x48 canvas) so the player can read them at a glance.

function capsuleFrame(root: Container, color: number, accent: number, draw: (g: Graphics) => void): void {
  // Glow background
  softGlow(root, 0, 0, 22, accent, 8);
  const cap = new Graphics();
  // Outer ring (thick accent)
  cap.roundRect(-18, -18, 36, 36, 8).fill({ color: accent, alpha: 0.18 });
  cap.roundRect(-18, -18, 36, 36, 8).stroke({ color: accent, width: 2.5, alpha: 0.95 });
  // Inner panel
  cap.roundRect(-15, -15, 30, 30, 6).fill({ color, alpha: 0.95 });
  cap.roundRect(-15, -15, 30, 30, 6).stroke({ color: accent, width: 1.4, alpha: 0.8 });
  // Highlight stripe
  cap.roundRect(-13, -13, 26, 5, 3).fill({ color: 0xffffff, alpha: 0.22 });
  // Corner pip lights
  cap.circle(-14, -14, 1.4).fill(accent);
  cap.circle(14, -14, 1.4).fill(accent);
  cap.circle(-14, 14, 1.4).fill(accent);
  cap.circle(14, 14, 1.4).fill(accent);
  root.addChild(cap);
  const icon = new Graphics();
  draw(icon);
  root.addChild(icon);
}

function plus(g: Graphics, color: number, size: number, thickness: number): void {
  g.rect(-thickness / 2, -size / 2, thickness, size).fill(color);
  g.rect(-size / 2, -thickness / 2, size, thickness).fill(color);
  // Outline
  g.rect(-thickness / 2, -size / 2, thickness, size).stroke({ color: 0xffffff, width: 0.8, alpha: 0.5 });
  g.rect(-size / 2, -thickness / 2, size, thickness).stroke({ color: 0xffffff, width: 0.8, alpha: 0.5 });
}

// ---- health --------------------------------------------------------------
export function drawHealthS(root: Container): void {
  capsuleFrame(root, 0x0a3a1a, 0x6bff8a, (g) => {
    plus(g, 0xa7ffb8, 18, 6);
    g.circle(0, 0, 3).fill(0xffffff);
  });
}

export function drawHealthL(root: Container): void {
  capsuleFrame(root, 0x0a3a1a, 0x6bff8a, (g) => {
    plus(g, 0xffffff, 24, 8);
    g.circle(0, 0, 4).fill(0xa7ffb8);
    g.circle(0, 0, 2).fill(0xffffff);
  });
}

// ---- weapon icons: distinct silhouette per weapon ------------------------
export function drawWeaponPulse(root: Container): void {
  // Twin bullets shooting up
  capsuleFrame(root, 0x081830, 0x6cdfff, (g) => {
    g.ellipse(-5, -2, 2.5, 8).fill(0xffffff);
    g.ellipse(5, -2, 2.5, 8).fill(0xffffff);
    g.ellipse(-5, -2, 1.5, 6).fill(0x6cdfff);
    g.ellipse(5, -2, 1.5, 6).fill(0x6cdfff);
    // Muzzle
    g.rect(-7, 6, 4, 3).fill(0x6cdfff);
    g.rect(3, 6, 4, 3).fill(0x6cdfff);
  });
}

export function drawWeaponSpread(root: Container): void {
  // Fan/peacock
  capsuleFrame(root, 0x2e2a08, 0xffd166, (g) => {
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.32;
      const len = i === 0 ? 11 : 9;
      g.moveTo(0, 6).lineTo(Math.cos(a) * len, 6 + Math.sin(a) * len).stroke({ color: 0xffd166, width: 2.5, alpha: 0.95 });
      g.circle(Math.cos(a) * len, 6 + Math.sin(a) * len, 1.4).fill(0xffffff);
    }
    g.circle(0, 6, 2.2).fill(0xffffff);
  });
}

export function drawWeaponPlasma(root: Container): void {
  // Big plasma orb
  capsuleFrame(root, 0x2a0a2a, 0xff8af0, (g) => {
    g.circle(0, 0, 9).fill(0xff8af0);
    g.circle(0, 0, 7).fill(0xffffff);
    g.circle(-1, -1, 4).fill(0xff8af0);
    g.circle(0, 0, 9).stroke({ color: 0xffffff, width: 1.2, alpha: 0.95 });
    // Sparks
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      g.circle(Math.cos(a) * 12, Math.sin(a) * 12, 1).fill(0xff8af0);
    }
  });
}

export function drawWeaponLaser(root: Container): void {
  // Long magenta beam
  capsuleFrame(root, 0x2a0a2a, 0xff66ff, (g) => {
    g.rect(-2, -11, 4, 22).fill({ color: 0xff66ff, alpha: 0.6 });
    g.rect(-1, -11, 2, 22).fill(0xffffff);
    g.rect(-3, -11, 6, 4).fill({ color: 0xff66ff, alpha: 0.3 });
    g.rect(-3, 7, 6, 4).fill({ color: 0xff66ff, alpha: 0.3 });
    // Cap
    g.circle(0, -11, 3).fill(0xff66ff);
    g.circle(0, -11, 1.5).fill(0xffffff);
    g.circle(0, 11, 3).fill(0xff66ff);
    g.circle(0, 11, 1.5).fill(0xffffff);
  });
}

export function drawWeaponMissiles(root: Container): void {
  // 2 small torpedoes
  capsuleFrame(root, 0x2a1408, 0xff8a3d, (g) => {
    for (const dx of [-5, 5]) {
      g.poly([dx, -10, dx + 3, -6, dx + 3, 6, dx, 10, dx - 3, 6, dx - 3, -6]).fill(0xdddddd);
      g.poly([dx, -10, dx + 2, -6, dx - 2, -6]).fill(0xffffff);
      g.poly([dx - 3, 6, dx - 5, 9, dx - 3, 9]).fill(0x888888);
      g.poly([dx + 3, 6, dx + 5, 9, dx + 3, 9]).fill(0x888888);
      g.rect(dx - 1.5, 9, 3, 2).fill(0xff8a3d);
    }
  });
}

export function drawWeaponWave(root: Container): void {
  // Sine wave
  capsuleFrame(root, 0x1a0a36, 0xc066ff, (g) => {
    // Two interleaved sine waves
    g.moveTo(-12, 0);
    for (let i = -12; i <= 12; i += 2) {
      g.lineTo(i, Math.sin(i / 4) * 6);
    }
    g.stroke({ color: 0xc066ff, width: 2.5, alpha: 0.95 });
    g.moveTo(-12, 0);
    for (let i = -12; i <= 12; i += 2) {
      g.lineTo(i, Math.sin(i / 4) * 6);
    }
    g.stroke({ color: 0xffffff, width: 1, alpha: 0.9 });
    // Bright orbs at peaks
    g.circle(-6, -6, 1.8).fill(0xffffff);
    g.circle(6, 6, 1.8).fill(0xffffff);
  });
}

export function drawWeaponLightning(root: Container): void {
  // Zigzag bolt
  capsuleFrame(root, 0x2a2a05, 0xfff066, (g) => {
    g.moveTo(-2, -12).lineTo(3, -4).lineTo(-3, -2).lineTo(4, 12).stroke({ color: 0xfff066, width: 5, alpha: 0.9 });
    g.moveTo(-2, -12).lineTo(3, -4).lineTo(-3, -2).lineTo(4, 12).stroke({ color: 0xffffff, width: 2.5, alpha: 1 });
    // End sparks
    g.circle(-2, -12, 2).fill(0xfff066);
    g.circle(4, 12, 2).fill(0xfff066);
  });
}

// ---- utility drops -------------------------------------------------------
export function drawShield(root: Container): void {
  capsuleFrame(root, 0x08183a, 0x4eaaff, (g) => {
    // Shield silhouette
    g.poly([0, -12, 10, -6, 10, 2, 0, 12, -10, 2, -10, -6]).fill(0x4eaaff);
    g.poly([0, -12, 10, -6, 10, 2, 0, 12, -10, 2, -10, -6]).stroke({ color: 0xffffff, width: 1, alpha: 0.95 });
    g.poly([0, -8, 6, -4, 6, 1, 0, 8, -6, 1, -6, -4]).fill(0xc4e2ff);
    // Cross emblem
    g.rect(-1, -4, 2, 8).fill(0xffffff);
    g.rect(-4, -1, 8, 2).fill(0xffffff);
  });
}

export function drawSpeed(root: Container): void {
  capsuleFrame(root, 0x0a3018, 0x6bff8a, (g) => {
    // Triple chevron going up
    for (let i = 0; i < 3; i++) {
      const oy = 8 - i * 6;
      g.poly([-7, oy + 2, 0, oy - 4, 7, oy + 2, 5, oy + 3, 0, oy - 1, -5, oy + 3]).fill(0xa7ffb8);
    }
  });
}

export function drawDamage(root: Container): void {
  capsuleFrame(root, 0x3a0a0a, 0xff5050, (g) => {
    // Explosive star
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const long = i % 2 === 0;
      const r = long ? 12 : 5;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.fill(0xff7a3d);
    g.circle(0, 0, 5).fill(0xfff066);
    g.circle(0, 0, 2.5).fill(0xffffff);
  });
}

export function drawBomb(root: Container): void {
  capsuleFrame(root, 0x2e2a05, 0xffd166, (g) => {
    g.circle(0, 2, 9).fill(0x1a1208);
    g.circle(0, 2, 9).stroke({ color: 0xffd166, width: 1.4 });
    g.circle(-2, 0, 3).fill(0xffd166);
    g.circle(-2, 0, 1).fill(0xffffff);
    // Fuse
    g.rect(-1.5, -9, 3, 4).fill(0x666666);
    g.poly([-3, -10, 3, -10, 0, -14]).fill(0xff6633);
    g.poly([-1.5, -14, 1.5, -14, 0, -16]).fill(0xfff066);
  });
}

export function drawGem(root: Container, size: 'sm' | 'md' | 'lg'): void {
  const k = size === 'sm' ? 0.7 : size === 'md' ? 0.95 : 1.2;
  const color = size === 'lg' ? 0xffd166 : size === 'md' ? 0xc566ff : 0x66ffe8;
  softGlow(root, 0, 0, 16 * k, color, 7);
  const g = new Graphics();
  // Faceted gem
  g.poly([0, -10 * k, 8 * k, -3 * k, 5 * k, 10 * k, -5 * k, 10 * k, -8 * k, -3 * k]).fill(color);
  g.poly([0, -10 * k, 8 * k, -3 * k, 5 * k, 10 * k, -5 * k, 10 * k, -8 * k, -3 * k]).stroke({ color: 0xffffff, width: 1.4, alpha: 0.8 });
  // Inner facets
  g.poly([0, -10 * k, 0, 10 * k]).stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
  g.poly([-8 * k, -3 * k, 8 * k, -3 * k]).stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
  g.poly([0, -10 * k, -3 * k, -3 * k, 0, 3 * k, 3 * k, -3 * k]).fill({ color: 0xffffff, alpha: 0.6 });
  root.addChild(g);
}

// ---- backwards-compat alias for the old generic chevron function --------
export function drawWeapon(root: Container, _accent: number): void {
  drawWeaponPulse(root);
}
