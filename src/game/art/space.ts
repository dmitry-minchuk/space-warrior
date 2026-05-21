import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../../engine/rng';
import { softGlow } from './forge';

// Small star sprite. `big` adds a soft glow halo + cross-shaped diffraction
// spikes seen in real telescope/photo imagery.
export function drawStar(root: Container, color: number, big: boolean): void {
  if (big) softGlow(root, 0, 0, 5, color, 5);
  const g = new Graphics();
  if (big) {
    // 4-point diffraction spike (vertical and horizontal beams)
    g.rect(-3, -0.4, 6, 0.8).fill({ color, alpha: 0.55 });
    g.rect(-0.4, -3, 0.8, 6).fill({ color, alpha: 0.55 });
    // Bright vertical/horizontal core lines (sharper, brighter)
    g.rect(-2, -0.2, 4, 0.4).fill({ color: 0xffffff, alpha: 0.85 });
    g.rect(-0.2, -2, 0.4, 4).fill({ color: 0xffffff, alpha: 0.85 });
    // Bright white core
    g.circle(0, 0, 1.8).fill(color);
    g.circle(0, 0, 1.0).fill(0xffffff);
  } else {
    // Dim background star — single pixel + faint colored halo
    g.circle(0, 0, 1.4).fill({ color, alpha: 0.35 });
    g.circle(0, 0, 0.9).fill(0xffffff);
  }
  root.addChild(g);
}

export function drawNormalStar(root: Container, seed: number, R: number, palette: { core: number; flare: number; halo: number }): void {
  const r = mulberry32(seed);
  const g = new Graphics();

  for (let i = 10; i >= 1; i--) {
    const t = i / 10;
    g.circle(0, 0, R * (1 + t * 0.22)).fill({ color: palette.halo, alpha: 0.026 * (1 - t) + 0.004 });
  }

  // Compact corona: ordinary stars should read as stable suns, not supernovae.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + r() * 0.14;
    const len = R * (0.08 + r() * 0.14);
    const w = 0.08 + r() * 0.06;
    g.poly([
      Math.cos(a - w) * R * 0.96, Math.sin(a - w) * R * 0.96,
      Math.cos(a + w) * R * 0.96, Math.sin(a + w) * R * 0.96,
      Math.cos(a) * (R + len), Math.sin(a) * (R + len),
    ]).fill({ color: palette.flare, alpha: 0.32 });
  }

  g.circle(0, 0, R).fill(palette.flare);
  g.circle(-R * 0.12, -R * 0.12, R * 0.82).fill(palette.core);
  g.circle(-R * 0.34, -R * 0.34, R * 0.22).fill({ color: 0xffffff, alpha: 0.72 });
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * R * 0.75;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rr = R * (0.025 + r() * 0.045);
    g.circle(x, y, rr).fill({ color: palette.halo, alpha: 0.28 });
  }
  g.circle(0, 0, R).stroke({ color: palette.halo, width: 2, alpha: 0.55 });

  root.addChild(g);
}

// Nebula cloud — large soft blob composed of many circles.
export function drawNebula(root: Container, seed: number, palette: [number, number, number]): void {
  const r = mulberry32(seed);
  const g = new Graphics();
  for (let i = 0; i < 110; i++) {
    const x = (r() - 0.5) * 380;
    const y = (r() - 0.5) * 230;
    const radius = 30 + r() * 90;
    const color = palette[Math.floor(r() * palette.length)];
    g.circle(x, y, radius).fill({ color, alpha: 0.06 + r() * 0.06 });
  }
  // Brighter core wisps
  for (let i = 0; i < 35; i++) {
    const x = (r() - 0.5) * 280;
    const y = (r() - 0.5) * 160;
    const radius = 18 + r() * 40;
    const color = palette[Math.floor(r() * palette.length)];
    g.circle(x, y, radius).fill({ color, alpha: 0.18 });
  }
  // Star clusters (small bright dots)
  for (let i = 0; i < 50; i++) {
    const x = (r() - 0.5) * 600;
    const y = (r() - 0.5) * 360;
    g.circle(x, y, 0.7 + r() * 0.6).fill({ color: 0xffffff, alpha: 0.55 });
  }
  g.blendMode = 'add';
  root.addChild(g);
}

// Detailed planet with surface bands/continents/craters. Optional rings & moons.
export function drawPlanet(
  root: Container,
  seed: number,
  R: number,
  accent: number,
  secondary: number,
  options: { rings?: boolean; moons?: number; planetoids?: number; atmosphere?: boolean; type?: 'gas' | 'rocky' | 'cratered' } = {},
): void {
  const r = mulberry32(seed);
  const atmosphere = options.atmosphere ?? true;
  const type = options.type ?? (r() < 0.4 ? 'gas' : r() < 0.7 ? 'rocky' : 'cratered');

  function drawPlanetoid(g: Graphics, cx: number, cy: number, radius: number, seedAngle = 0): void {
    const n = 8 + Math.floor(r() * 4);
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = seedAngle + (i / n) * Math.PI * 2;
      const rr = radius * (0.72 + r() * 0.42);
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.poly(pts.map((v, i) => i % 2 === 0 ? v + radius * 0.18 : v + radius * 0.22)).fill({ color: 0x050914, alpha: 0.5 });
    g.poly(pts).fill(0x657184);
    g.poly(pts).stroke({ color: 0x202a38, width: Math.max(0.8, radius * 0.12) });
    g.poly(pts.map((v, i) => {
      const center = i % 2 === 0 ? cx : cy;
      return center + (v - center) * 0.68 - radius * 0.16;
    })).fill({ color: 0xaab5c4, alpha: 0.55 });
    g.ellipse(cx + radius * 0.22, cy + radius * 0.12, radius * 0.28, radius * 0.2).fill({ color: 0x26313f, alpha: 0.8 });
    g.ellipse(cx - radius * 0.18, cy + radius * 0.32, radius * 0.18, radius * 0.13).fill({ color: 0x26313f, alpha: 0.75 });
    if (radius > 7) {
      g.ellipse(cx + radius * 0.05, cy - radius * 0.28, radius * 0.16, radius * 0.1).fill({ color: 0x303c4c, alpha: 0.75 });
      g.circle(cx - radius * 0.3, cy - radius * 0.24, radius * 0.16).fill({ color: 0xd6dee8, alpha: 0.65 });
    }
  }

  // Atmospheric haze
  if (atmosphere) {
    const haze = new Graphics();
    for (let i = 0; i < 10; i++) {
      const k = (i + 1) / 10;
      haze.circle(0, 0, R + 14 * k).fill({ color: accent, alpha: 0.07 * (1 - k) });
    }
    root.addChild(haze);
  }

  // Rings are split by depth: draw the back half before the planet body so the
  // solid disk hides any segment that would otherwise show through it.
  if (options.rings) {
    const backRings = new Graphics();
    backRings.ellipse(0, -R * 0.03, R * 1.9, R * 0.32).stroke({ color: secondary, width: 5, alpha: 0.34 });
    backRings.ellipse(0, -R * 0.03, R * 2.15, R * 0.39).stroke({ color: accent, width: 3, alpha: 0.32 });
    backRings.ellipse(0, -R * 0.03, R * 1.55, R * 0.23).stroke({ color: 0xffffff, width: 1.5, alpha: 0.35 });
    root.addChild(backRings);
  }

  // Planet base
  const base = new Graphics();
  base.circle(0, 0, R).fill(secondary);
  root.addChild(base);

  // Lit highlight — sun comes from upper-left
  const lit = new Graphics();
  for (let i = 0; i < 12; i++) {
    const k = i / 12;
    lit.circle(-R * 0.25, -R * 0.25, R * (1 - k * 0.6)).fill({ color: accent, alpha: 0.10 });
  }
  root.addChild(lit);

  // Surface texture — distinct for each planet type.
  const surface = new Graphics();
  if (type === 'gas') {
    // Banded atmospheric stripes with gradient transitions (multiple alpha
    // layers per band so they blend smoothly).
    const bandN = 22;
    for (let i = 0; i < bandN; i++) {
      const y = -R + (i + 0.5) * (R * 2 / bandN);
      const yRel = Math.abs(y) / R;
      if (yRel > 0.98) continue;
      const w = Math.sqrt(R * R - y * y);
      const h = R * 0.05 + r() * R * 0.025;
      const c = i % 2 === 0 ? accent : secondary;
      surface.ellipse(0, y, w, h).fill({ color: c, alpha: 0.45 });
      // Sub-band soft inner stripe for depth
      surface.ellipse(0, y, w * 0.96, h * 0.45).fill({ color: c, alpha: 0.35 });
    }
    // Turbulent swirls (small curved arcs across band boundaries)
    for (let i = 0; i < 12; i++) {
      const sy = (r() - 0.5) * R * 1.6;
      const sx = (r() - 0.5) * R * 0.7;
      const len = R * (0.15 + r() * 0.2);
      surface.ellipse(sx, sy, len, R * 0.025).fill({ color: secondary, alpha: 0.7 });
      surface.ellipse(sx, sy, len * 0.6, R * 0.012).fill({ color: 0xffffff, alpha: 0.45 });
    }
    // Eye-shaped storm spots (Great Red Spot style)
    const storms = 2 + Math.floor(r() * 3);
    for (let i = 0; i < storms; i++) {
      const ang = r() * Math.PI * 2;
      const d = R * 0.3 + r() * R * 0.35;
      const sx = Math.cos(ang) * d;
      const sy = Math.sin(ang) * d * 0.5;     // keep storms within latitude bands
      const sw = R * (0.08 + r() * 0.1);
      const sh = R * (0.04 + r() * 0.04);
      // Outer dark eye border
      surface.ellipse(sx, sy, sw, sh).fill({ color: 0x000000, alpha: 0.35 });
      // Storm body
      surface.ellipse(sx, sy, sw * 0.9, sh * 0.85).fill({ color: accent, alpha: 0.9 });
      // Eye centre (lighter)
      surface.ellipse(sx, sy, sw * 0.4, sh * 0.5).fill({ color: 0xfff0e0, alpha: 0.7 });
      surface.ellipse(sx, sy, sw * 0.15, sh * 0.18).fill(0xffffff);
    }
  } else if (type === 'rocky') {
    // Ocean base (slightly darker than secondary)
    surface.circle(0, 0, R).fill({ color: secondary, alpha: 0.4 });
    // Continents — clustered organic shapes with coastline shading
    const contN = 5 + Math.floor(r() * 3);
    for (let i = 0; i < contN; i++) {
      const cAng = r() * Math.PI * 2;
      const cDist = r() * R * 0.6;
      const cx = Math.cos(cAng) * cDist;
      const cy = Math.sin(cAng) * cDist;
      // Continent body is a cluster of overlapping ellipses
      const blobs = 5 + Math.floor(r() * 4);
      for (let k = 0; k < blobs; k++) {
        const ba = r() * Math.PI * 2;
        const bd = r() * R * 0.18;
        const bx = cx + Math.cos(ba) * bd;
        const by = cy + Math.sin(ba) * bd;
        const brx = R * (0.06 + r() * 0.10);
        const bry = R * (0.05 + r() * 0.08);
        // Coastline shadow (darker outline ring)
        surface.ellipse(bx, by, brx * 1.1, bry * 1.1).fill({ color: 0x000000, alpha: 0.22 });
        // Continent fill
        surface.ellipse(bx, by, brx, bry).fill({ color: accent, alpha: 0.85 });
        // Mountain ridge highlight (lit upper-left edge)
        surface.ellipse(bx - brx * 0.2, by - bry * 0.2, brx * 0.5, bry * 0.4).fill({ color: 0xfff0d8, alpha: 0.18 });
      }
    }
    // Polar ice caps with edge softening
    surface.ellipse(0, -R * 0.88, R * 0.46, R * 0.13).fill({ color: 0xe6f0ff, alpha: 0.65 });
    surface.ellipse(0, -R * 0.86, R * 0.36, R * 0.09).fill({ color: 0xffffff, alpha: 0.85 });
    surface.ellipse(0, R * 0.88, R * 0.42, R * 0.12).fill({ color: 0xe6f0ff, alpha: 0.6 });
    surface.ellipse(0, R * 0.86, R * 0.32, R * 0.08).fill({ color: 0xffffff, alpha: 0.8 });
    // Cloud overlay — wispy bands across the disk
    for (let i = 0; i < 7; i++) {
      const y = -R * 0.7 + r() * R * 1.4;
      const w = Math.sqrt(Math.max(0, R * R - y * y)) * (0.5 + r() * 0.4);
      surface.ellipse((r() - 0.5) * R * 0.3, y, w, R * 0.035).fill({ color: 0xffffff, alpha: 0.25 });
    }
  } else {
    // Cratered moon-like — densely packed craters with directional shading
    // Layer 1: dust / regolith mottling
    for (let i = 0; i < 30; i++) {
      const ang = r() * Math.PI * 2;
      const d = r() * R * 0.95;
      surface.circle(Math.cos(ang) * d, Math.sin(ang) * d, R * (0.02 + r() * 0.03)).fill({ color: 0xc4b09a, alpha: 0.18 });
    }
    // Layer 2: small craters (many, simple)
    for (let i = 0; i < 22; i++) {
      const ang = r() * Math.PI * 2;
      const d = r() * R * 0.9;
      const cx = Math.cos(ang) * d;
      const cy = Math.sin(ang) * d;
      const rad = R * (0.025 + r() * 0.05);
      surface.circle(cx, cy, rad * 1.15).fill({ color: 0xfff0d8, alpha: 0.22 });
      surface.circle(cx, cy, rad).fill({ color: 0x000000, alpha: 0.35 });
      surface.circle(cx - rad * 0.18, cy - rad * 0.18, rad * 0.6).fill({ color: 0x000000, alpha: 0.45 });
    }
    // Layer 3: large impact craters (fewer, with central peaks and ejecta rays)
    for (let i = 0; i < 6; i++) {
      const ang = r() * Math.PI * 2;
      const d = r() * R * 0.7;
      const cx = Math.cos(ang) * d;
      const cy = Math.sin(ang) * d;
      const rad = R * (0.10 + r() * 0.12);
      // Ejecta ring (outer light ring)
      surface.circle(cx, cy, rad * 1.4).fill({ color: 0xfff0d8, alpha: 0.12 });
      // Lit rim
      surface.circle(cx, cy, rad * 1.1).fill({ color: 0xfff0d8, alpha: 0.35 });
      // Floor
      surface.circle(cx, cy, rad).fill({ color: 0x14100a, alpha: 0.9 });
      // Lit upper-left rim arc
      surface.circle(cx - rad * 0.25, cy - rad * 0.25, rad * 0.95).fill({ color: 0xc4a888, alpha: 0.35 });
      // Floor shadow
      surface.circle(cx - rad * 0.15, cy - rad * 0.15, rad * 0.7).fill({ color: 0x000000, alpha: 0.55 });
      // Central peak
      surface.circle(cx + rad * 0.05, cy + rad * 0.05, rad * 0.22).fill({ color: 0x6a5034, alpha: 0.9 });
      surface.circle(cx - rad * 0.02, cy - rad * 0.05, rad * 0.14).fill({ color: 0xc4a888, alpha: 0.75 });
      // Ejecta rays
      const rays = 5 + Math.floor(r() * 3);
      for (let k = 0; k < rays; k++) {
        const ra = (k / rays) * Math.PI * 2 + r() * 0.3;
        const len = rad * (2.0 + r() * 1.2);
        const ex = cx + Math.cos(ra) * len;
        const ey = cy + Math.sin(ra) * len;
        surface.moveTo(cx + Math.cos(ra) * rad, cy + Math.sin(ra) * rad)
          .lineTo(ex, ey)
          .stroke({ color: 0xfff0d8, width: 1.4, alpha: 0.18 });
      }
    }
  }
  // Clip to circle
  const mask = new Graphics();
  mask.circle(0, 0, R).fill(0xffffff);
  surface.mask = mask;
  root.addChild(mask);
  root.addChild(surface);

  // Terminator (dark side shadow) — clipped
  const shade = new Graphics();
  shade.circle(R * 0.5, R * 0.5, R * 1.1).fill({ color: 0x000000, alpha: 0.55 });
  shade.mask = mask;
  root.addChild(shade);

  // Strong illustrated outline + rim light. This keeps planets readable as
  // solid objects instead of transparent blobs over the star field.
  const outline = new Graphics();
  outline.circle(0, 0, R + 1.5).stroke({ color: 0x050914, width: 4, alpha: 0.85 });
  root.addChild(outline);

  // Rim light (thin highlight)
  const rim = new Graphics();
  rim.circle(0, 0, R).stroke({ color: accent, width: 2.5, alpha: 0.65 });
  root.addChild(rim);

  // Front ring arcs. Only the outside lower arcs are drawn; nothing crosses the
  // planet disk, so the rings no longer look transparent through the body.
  if (options.rings) {
    const frontRings = new Graphics();
    const drawFront = (rx: number, ry: number, color: number, width: number, alpha: number): void => {
      const y = R * 0.16;
      const left = -rx;
      const right = rx;
      const innerL = -R * 0.92;
      const innerR = R * 0.92;
      frontRings.moveTo(left, y)
        .bezierCurveTo(-rx * 0.72, ry * 0.72, -rx * 0.38, ry * 0.9, innerL, R * 0.48)
        .stroke({ color, width, alpha });
      frontRings.moveTo(innerR, R * 0.48)
        .bezierCurveTo(rx * 0.38, ry * 0.9, rx * 0.72, ry * 0.72, right, y)
        .stroke({ color, width, alpha });
    };
    drawFront(R * 1.9, R * 0.32, secondary, 5, 0.48);
    drawFront(R * 2.15, R * 0.39, accent, 3, 0.44);
    drawFront(R * 1.55, R * 0.23, 0xffffff, 1.5, 0.5);
    root.addChild(frontRings);
  }

  // Moons
  if (options.moons) {
    for (let i = 0; i < options.moons; i++) {
      const ang = (i / options.moons) * Math.PI * 2 + r() * 0.65;
      const orbitR = R * (1.65 + i * 0.18 + r() * 0.42);
      const mx = Math.cos(ang) * orbitR;
      const my = Math.sin(ang) * orbitR * 0.7; // flatten for perspective
      const mR = R * (0.08 + r() * 0.08);
      const moon = new Graphics();
      drawPlanetoid(moon, mx, my, mR, ang);
      root.addChild(moon);
    }
  }

  // Irregular planetoids / captured asteroid belt around this planet.
  if (options.planetoids) {
    const belt = new Graphics();
    for (let i = 0; i < options.planetoids; i++) {
      const ang = (i / options.planetoids) * Math.PI * 2 + r() * 0.42;
      const orbitR = R * (1.75 + r() * 0.9);
      const px = Math.cos(ang) * orbitR;
      const py = Math.sin(ang) * orbitR * (0.45 + r() * 0.18);
      const size = R * (0.026 + r() * 0.046);
      drawPlanetoid(belt, px, py, size, ang);
    }
    // A few faint orbit arcs tie the planetoids visually to the planet.
    for (let i = 0; i < 2; i++) {
      const or = R * (1.75 + i * 0.42);
      belt.ellipse(0, 0, or, or * 0.5).stroke({ color: accent, width: 0.8, alpha: 0.18 });
    }
    root.addChild(belt);
  }
}

export function drawStarSystem(
  root: Container,
  seed: number,
  palette: { star: number; corona: number; planetA: number; planetB: number },
): void {
  const r = mulberry32(seed);
  const g = new Graphics();
  const starR = 22 + r() * 12;

  function planet(cx: number, cy: number, radius: number, body: number, shade: number, mode: number, rings = false): void {
    if (rings) {
      g.ellipse(cx, cy + radius * 0.1, radius * 2.25, radius * 0.48).stroke({ color: 0xf2d8a8, width: Math.max(2, radius * 0.12), alpha: 0.9 });
      g.ellipse(cx, cy + radius * 0.1, radius * 2.05, radius * 0.38).stroke({ color: 0x8de8ff, width: Math.max(1.2, radius * 0.06), alpha: 0.7 });
    }
    g.circle(cx + radius * 0.14, cy + radius * 0.18, radius * 1.04).fill(0x120c18);
    g.circle(cx, cy, radius).fill(shade);
    g.circle(cx - radius * 0.2, cy - radius * 0.22, radius * 0.82).fill(body);
    if (mode === 0) {
      for (let i = 0; i < 5; i++) {
        const y = cy - radius * 0.55 + i * radius * 0.25;
        g.ellipse(cx - radius * 0.04, y, radius * (0.82 - i * 0.04), radius * 0.08).fill({ color: shade, alpha: 0.45 });
        g.ellipse(cx - radius * 0.24, y - radius * 0.04, radius * 0.34, radius * 0.035).fill({ color: 0xffffff, alpha: 0.28 });
      }
    } else if (mode === 1) {
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2;
        const d = radius * (0.25 + r() * 0.48);
        const pr = radius * (0.13 + r() * 0.13);
        const px = cx + Math.cos(a) * d;
        const py = cy + Math.sin(a) * d;
        g.circle(px, py, pr).fill({ color: 0x4a171a, alpha: 0.65 });
        g.circle(px - pr * 0.22, py - pr * 0.24, pr * 0.48).fill({ color: 0xffd0b8, alpha: 0.45 });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const y = cy - radius * 0.6 + i * radius * 0.22;
        g.moveTo(cx - radius * 0.82, y)
          .bezierCurveTo(cx - radius * 0.35, y - radius * 0.16, cx + radius * 0.25, y + radius * 0.12, cx + radius * 0.84, y - radius * 0.03)
          .stroke({ color: 0xffffff, width: Math.max(1.2, radius * 0.07), alpha: 0.34 });
      }
    }
    g.circle(cx + radius * 0.26, cy + radius * 0.28, radius * 0.76).fill({ color: 0x000000, alpha: 0.32 });
    g.circle(cx - radius * 0.38, cy - radius * 0.38, radius * 0.22).fill({ color: 0xffffff, alpha: 0.62 });
    g.circle(cx, cy, radius).stroke({ color: 0xd8ecff, width: Math.max(1.2, radius * 0.055), alpha: 0.45 });
  }

  function rock(cx: number, cy: number, size: number, rot: number): void {
    const pts: number[] = [];
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot;
      const rr = size * (0.62 + r() * 0.55);
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.poly(pts.map((v, i) => i % 2 === 0 ? v + size * 0.18 : v + size * 0.22)).fill({ color: 0x07060d, alpha: 0.45 });
    g.poly(pts).fill(0x5d6070);
    g.poly(pts).stroke({ color: 0x252936, width: Math.max(0.8, size * 0.12) });
    g.circle(cx - size * 0.24, cy - size * 0.28, size * 0.34).fill(0xaeb4c0);
    if (size > 7) g.circle(cx + size * 0.22, cy + size * 0.12, size * 0.18).fill(0x2f3440);
  }

  for (let i = 5; i >= 1; i--) {
    const rx = 86 + i * 44;
    const ry = rx * (0.34 + r() * 0.04);
    g.ellipse(0, 0, rx, ry).stroke({ color: 0x9aa8c8, width: 1.1, alpha: 0.11 });
  }

  // A broken asteroid belt, using chunky rocks instead of dots.
  const beltN = 22;
  for (let i = 0; i < beltN; i++) {
    const a = (i / beltN) * Math.PI * 2 + r() * 0.08;
    const skip = Math.sin(a * 2 + seed) > 0.78;
    if (skip) continue;
    const orbit = 242 + r() * 34;
    const px = Math.cos(a) * orbit;
    const py = Math.sin(a) * orbit * 0.36;
    rock(px, py, 4 + r() * 8, a);
  }

  // Star corona and body. Keep it bright but not icon-like.
  for (let i = 10; i >= 1; i--) {
    const t = i / 10;
    g.circle(0, 0, starR * (1 + t * 2.4)).fill({ color: palette.corona, alpha: 0.025 * (1 - t) + 0.012 });
  }
  g.circle(0, 0, starR).fill(palette.corona);
  g.circle(-starR * 0.12, -starR * 0.1, starR * 0.86).fill(palette.star);
  g.circle(-starR * 0.35, -starR * 0.34, starR * 0.28).fill({ color: 0xffffff, alpha: 0.75 });
  g.circle(0, 0, starR).stroke({ color: 0xfff0c0, width: 1.8, alpha: 0.72 });

  // Deliberate composition: a few readable bodies instead of a crowded schema.
  const configs = [
    { a: 0.38 + r() * 0.12, d: 112, pr: 10 + r() * 3, c: palette.planetA, s: 0x17324e, m: 2, ring: false },
    { a: 1.78 + r() * 0.14, d: 170, pr: 15 + r() * 5, c: palette.planetB, s: 0x4a291b, m: 0, ring: true },
    { a: 3.72 + r() * 0.16, d: 232, pr: 20 + r() * 6, c: 0x8fd8ff, s: 0x23345c, m: 0, ring: false },
  ];
  for (const p of configs) {
    const px = Math.cos(p.a) * p.d;
    const py = Math.sin(p.a) * p.d * 0.38;
    planet(px, py, p.pr, p.c, p.s, p.m, p.ring);
    const moonCount = r() < 0.65 ? 1 : 0;
    for (let m = 0; m < moonCount; m++) {
      const ma = p.a + 1.2 + m * 1.45 + r() * 0.35;
      const md = p.pr * (1.8 + r() * 0.95);
      rock(px + Math.cos(ma) * md, py + Math.sin(ma) * md * 0.58, Math.max(3.5, p.pr * (0.16 + r() * 0.08)), ma);
    }
  }

  root.addChild(g);
}

// Detailed space base — modular hub with arms, antennas, life signs.
export function drawSpaceBase(root: Container, seed: number, burning: boolean): void {
  const r = mulberry32(seed);
  // Central modular hub
  const ringR = 80;

  // Outer scaffolding (thin framework)
  const scaff = new Graphics();
  scaff.circle(0, 0, ringR + 14).stroke({ color: 0x3a414d, width: 2, alpha: 0.7 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    scaff.moveTo(Math.cos(a) * ringR, Math.sin(a) * ringR).lineTo(Math.cos(a) * (ringR + 14), Math.sin(a) * (ringR + 14)).stroke({ color: 0x3a414d, width: 1.5, alpha: 0.6 });
  }
  root.addChild(scaff);

  // Main hull
  const main = new Graphics();
  main.circle(0, 0, ringR).fill(0x2a323c);
  main.circle(0, 0, ringR).stroke({ color: 0x6a7888, width: 4 });
  main.circle(0, 0, ringR - 10).fill(0x1a2028);
  main.circle(0, 0, ringR - 10).stroke({ color: 0x5d6878, width: 2 });
  // Mid ring with windows
  main.circle(0, 0, ringR - 18).fill(0x2a3038);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const lit = (i % 2 === 0 || (burning && r() < 0.3));
    const wx = Math.cos(a) * (ringR - 20);
    const wy = Math.sin(a) * (ringR - 20);
    main.rect(wx - 2, wy - 2, 4, 4).fill(lit ? (burning && r() < 0.4 ? 0xff8833 : 0xffe48a) : 0x14181f);
  }
  // Inner hub
  main.circle(0, 0, 26).fill(0x3a414d);
  main.circle(0, 0, 26).stroke({ color: 0x6a7888, width: 1.5 });
  main.circle(0, 0, 14).fill(burning ? 0xff5522 : 0x6a93c4);
  main.circle(0, 0, 14).stroke({ color: burning ? 0xffaa33 : 0xb4d4ff, width: 2 });
  // Inner spokes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    main.moveTo(Math.cos(a) * 14, Math.sin(a) * 14).lineTo(Math.cos(a) * 26, Math.sin(a) * 26).stroke({ color: 0x5d6878, width: 1.5, alpha: 0.85 });
  }
  // Central beacon
  main.circle(0, 0, 4).fill(burning ? 0xffd166 : 0xc4e2ff);
  root.addChild(main);

  // Arm modules: vary the modules between arms for variety
  const arms = new Graphics();
  const moduleTypes = ['silo', 'antenna', 'sensor', 'pod'] as const;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 12;
    const len = 110 + r() * 40;
    const x1 = Math.cos(a) * ringR;
    const y1 = Math.sin(a) * ringR;
    const x2 = Math.cos(a) * (ringR + len);
    const y2 = Math.sin(a) * (ringR + len);
    // Arm structure
    arms.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x4a5664, width: 8 });
    arms.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x8a98a8, width: 3 });
    // Joint
    arms.circle(x1, y1, 4).fill(0x6a7888);
    // Mid-arm modules
    for (let s = 0.3; s < 1; s += 0.25) {
      const mx = x1 + (x2 - x1) * s;
      const my = y1 + (y2 - y1) * s;
      arms.circle(mx, my, 4).fill(0x3a414d);
      arms.circle(mx, my, 4).stroke({ color: 0x6a7888, width: 1 });
      arms.circle(mx, my, 2).fill(burning && r() < 0.3 ? 0xff8833 : 0xffe48a);
    }
    // End module — pick a type
    const mod = moduleTypes[i % moduleTypes.length];
    if (mod === 'silo') {
      // Cylinder module
      arms.poly([x2 - Math.sin(a) * 12, y2 + Math.cos(a) * 12, x2 + Math.sin(a) * 12, y2 - Math.cos(a) * 12, x2 + Math.cos(a) * 24 + Math.sin(a) * 12, y2 + Math.sin(a) * 24 - Math.cos(a) * 12, x2 + Math.cos(a) * 24 - Math.sin(a) * 12, y2 + Math.sin(a) * 24 + Math.cos(a) * 12]).fill(0x2a3038);
      arms.circle(x2 + Math.cos(a) * 18, y2 + Math.sin(a) * 18, 6).fill(0x3a414d);
      arms.circle(x2 + Math.cos(a) * 18, y2 + Math.sin(a) * 18, 3).fill(0x6cf);
    } else if (mod === 'antenna') {
      // Antenna dish
      arms.circle(x2, y2, 12).fill(0x2a3038);
      arms.circle(x2, y2, 12).stroke({ color: 0x6a7888, width: 1.5 });
      arms.circle(x2, y2, 7).fill(0xc4d4e4);
      arms.moveTo(x2, y2).lineTo(x2 + Math.cos(a) * 20, y2 + Math.sin(a) * 20).stroke({ color: 0x6a7888, width: 2 });
      arms.circle(x2 + Math.cos(a) * 20, y2 + Math.sin(a) * 20, 2).fill(0xff5050);
    } else if (mod === 'sensor') {
      // Sensor cluster — multiple small pods
      for (let k = 0; k < 3; k++) {
        const ka = a + (k - 1) * 0.4;
        const sx = x2 + Math.cos(ka) * 14;
        const sy = y2 + Math.sin(ka) * 14;
        arms.circle(sx, sy, 5).fill(0x3a414d);
        arms.circle(sx, sy, 2).fill(0xc4e2ff);
      }
      arms.circle(x2, y2, 12).fill(0x2a3038);
      arms.circle(x2, y2, 12).stroke({ color: 0x6a7888, width: 1.5 });
    } else {
      // Habitat pod
      arms.circle(x2, y2, 16).fill(0x2a3038);
      arms.circle(x2, y2, 16).stroke({ color: 0x6a7888, width: 1.5 });
      // 4 windows
      for (let k = 0; k < 4; k++) {
        const ka = (k / 4) * Math.PI * 2 + Math.PI / 4;
        arms.circle(x2 + Math.cos(ka) * 10, y2 + Math.sin(ka) * 10, 2.5).fill(burning && r() < 0.4 ? 0xff8833 : 0xffe48a);
      }
    }
  }
  root.addChild(arms);

  // Damage / burning patches
  if (burning) {
    const dmg = new Graphics();
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * ringR;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      dmg.circle(x, y, 9 + r() * 7).fill({ color: 0x331a05, alpha: 0.8 });
      dmg.circle(x, y, 5 + r() * 3).fill({ color: 0xff6622, alpha: 0.75 });
      dmg.circle(x, y, 3).fill(0xffd166);
      dmg.circle(x, y, 1).fill(0xffffff);
    }
    // Smoke wisps
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2;
      const d = ringR + r() * 30;
      dmg.circle(Math.cos(a) * d, Math.sin(a) * d, 14).fill({ color: 0x222222, alpha: 0.4 });
    }
    root.addChild(dmg);
  }
}

// Big detailed asteroid. Light source is the upper-left (matches the lighting
// convention used elsewhere): the lit half is warmer/lighter, the dark half
// gets a terminator shadow. Craters have rim highlights on the lit side,
// shadow on the dark side, and occasionally a central peak.
export function drawAsteroid(root: Container, seed: number, R: number): void {
  const r = mulberry32(seed);
  // Irregular silhouette — 24 vertices with both large bumps and fine spikes
  // so the outline feels rocky rather than circular.
  const N = 24;
  const pts: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const noise = Math.sin(a * 3 + r() * 5) * 0.06 + (r() - 0.5) * 0.1;
    const rad = R * (0.78 + r() * 0.32 + noise);
    pts.push(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  const g = new Graphics();
  // Layered base — dark side first
  g.poly(pts).fill(0x2a1d12);
  g.poly(pts).stroke({ color: 0x10080a, width: 1.2 });

  // Lit hemisphere (upper-left): build a slightly-shrunk polygon offset toward the light
  const litPts: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    litPts.push(pts[i] * 0.78 - R * 0.18, pts[i + 1] * 0.78 - R * 0.18);
  }
  g.poly(litPts).fill({ color: 0x6a4a30, alpha: 0.9 });
  // Specular highlight (small bright spot at light origin)
  g.ellipse(-R * 0.32, -R * 0.32, R * 0.28, R * 0.22).fill({ color: 0xb09070, alpha: 0.55 });
  g.ellipse(-R * 0.4, -R * 0.4, R * 0.08, R * 0.06).fill({ color: 0xfff0d0, alpha: 0.7 });

  // Surface noise — many small dark specks scattered across the body
  for (let i = 0; i < 38; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * R * 0.92;
    const sx = Math.cos(a) * d;
    const sy = Math.sin(a) * d;
    const sz = 0.5 + r() * 1.3;
    const dark = (sx + sy) > 0;  // dark side: more contrast
    g.circle(sx, sy, sz).fill({ color: dark ? 0x10080a : 0x3a2a1c, alpha: dark ? 0.85 : 0.5 });
  }

  // Craters — varying sizes, with full directional shading.
  // Light comes from upper-left → lit rim is upper-left, shadowed lip is lower-right,
  // crater floor is darker, and a central peak (for big craters) catches the light.
  const craterN = 8 + Math.floor(r() * 5);
  for (let i = 0; i < craterN; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * R * 0.80;
    const cx = Math.cos(a) * d;
    const cy = Math.sin(a) * d;
    const rad = R * (0.05 + r() * 0.15);
    // Outer rim ring (whole crater)
    g.circle(cx, cy, rad * 1.15).fill({ color: 0x8a6a4a, alpha: 0.55 });
    // Crater floor (dark interior)
    g.circle(cx, cy, rad).fill({ color: 0x18100a, alpha: 0.92 });
    // Lit upper-left rim crescent
    g.circle(cx - rad * 0.25, cy - rad * 0.25, rad * 0.95).fill({ color: 0xb88a60, alpha: 0.45 });
    // Floor shadow on upper-left (light hits opposite wall)
    g.circle(cx - rad * 0.18, cy - rad * 0.18, rad * 0.65).fill({ color: 0x000000, alpha: 0.55 });
    // Central peak in larger craters
    if (rad > R * 0.10 && r() < 0.6) {
      g.circle(cx + rad * 0.05, cy + rad * 0.05, rad * 0.25).fill({ color: 0x4a3a28, alpha: 0.85 });
      g.circle(cx - rad * 0.02, cy - rad * 0.05, rad * 0.18).fill({ color: 0x8a6a48, alpha: 0.7 });
    }
    // Ray ejecta (rare, only big fresh craters)
    if (rad > R * 0.12 && r() < 0.35) {
      const rays = 4 + Math.floor(r() * 3);
      for (let k = 0; k < rays; k++) {
        const ra = (k / rays) * Math.PI * 2 + r() * 0.3;
        const len = rad * (1.2 + r() * 0.8);
        const ex = cx + Math.cos(ra) * len;
        const ey = cy + Math.sin(ra) * len;
        g.moveTo(cx + Math.cos(ra) * rad, cy + Math.sin(ra) * rad)
          .lineTo(ex, ey)
          .stroke({ color: 0x9a7858, width: 1.2, alpha: 0.25 });
      }
    }
  }

  // Subtle mineral streaks (cool silvery-blue, not bright orange)
  for (let i = 0; i < 2; i++) {
    const a1 = r() * Math.PI * 2;
    const a2 = a1 + Math.PI * 0.6 + (r() - 0.5) * 0.5;
    const r1 = R * 0.3;
    const r2 = R * 0.7;
    g.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1)
      .lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2)
      .stroke({ color: 0x7a8898, width: 1, alpha: 0.4 });
  }

  // Terminator shadow band (fades into dark side)
  g.poly(pts).fill({ color: 0x000000, alpha: 0 });  // ensure last draw uses the asteroid shape
  // Use a soft shadow ellipse on lower-right
  g.ellipse(R * 0.35, R * 0.35, R * 0.7, R * 0.7).fill({ color: 0x000000, alpha: 0.35 });

  root.addChild(g);
}

// Satellite — small mechanical sprite that drifts in the background.
export function drawSatellite(root: Container, seed: number): void {
  const r = mulberry32(seed);
  const g = new Graphics();
  const panelTilt = (r() - 0.5) * 0.18;

  function panel(cx: number, side: -1 | 1): void {
    const w = 26;
    const h = 10;
    const rot = panelTilt * side;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const corners = [-w / 2, -h / 2, w / 2, -h / 2, w / 2, h / 2, -w / 2, h / 2];
    const pts: number[] = [];
    for (let i = 0; i < corners.length; i += 2) {
      pts.push(cx + corners[i] * cos - corners[i + 1] * sin, corners[i] * sin + corners[i + 1] * cos);
    }
    g.poly(pts).fill(0x123758);
    g.poly(pts).stroke({ color: 0x8fb6d8, width: 1.1 });
    g.poly([
      pts[0] + 2, pts[1] + 2,
      pts[2] - 2, pts[3] + 2,
      pts[4] - 2, pts[5] - 2,
      pts[6] + 2, pts[7] - 2,
    ]).fill(0x1d4e78);
    for (let i = 1; i < 5; i++) {
      const x = -w / 2 + (w * i) / 5;
      const x1 = cx + x * cos - (-h / 2 + 1) * sin;
      const y1 = x * sin + (-h / 2 + 1) * cos;
      const x2 = cx + x * cos - (h / 2 - 1) * sin;
      const y2 = x * sin + (h / 2 - 1) * cos;
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x0b2236, width: 0.7 });
    }
    g.moveTo(cx - w / 2 * cos, -w / 2 * sin).lineTo(cx + w / 2 * cos, w / 2 * sin).stroke({ color: 0x5f9fc8, width: 0.8 });
  }

  // Panel trusses.
  g.rect(-18, -1.6, 36, 3.2).fill(0x576474);
  g.rect(-18, -1.6, 36, 3.2).stroke({ color: 0x18202a, width: 0.8 });
  panel(-31, -1);
  panel(31, 1);

  // Faceted service bus.
  g.poly([-12, -8, 8, -9, 14, -3, 13, 7, -8, 9, -14, 3]).fill(0x2f3845);
  g.poly([-12, -8, 8, -9, 14, -3, 13, 7, -8, 9, -14, 3]).stroke({ color: 0x10151c, width: 1.1 });
  g.poly([-10, -7, 7, -8, 12, -3, -3, -2, -13, 2]).fill(0x687586);
  g.rect(-7, -4, 8, 8).fill(0x202833);
  g.rect(-6, -3, 6, 6).fill(0x405064);

  // Sensor boom and concave dish.
  g.moveTo(0, -8).lineTo(0, -18).stroke({ color: 0x73808e, width: 2 });
  g.ellipse(0, -21, 9, 5).fill(0x111820);
  g.ellipse(0, -21, 7, 4).fill(0x74808e);
  g.ellipse(-1, -22, 4, 2).fill(0xc9d4df);
  g.circle(0, -21, 1.8).fill(0x141a22);

  // Small RCS tanks and navigation lights.
  for (const x of [-10, 10]) {
    g.circle(x, 8, 3).fill(0x151b22);
    g.circle(x, 8, 2).fill(0x657181);
  }
  g.circle(-8, 0, 1.2).fill(0xff5050);
  g.circle(8, 0, 1.2).fill(0x66ff88);
  if (r() < 0.5) g.circle(1, 5, 1).fill(0xffd166);
  root.addChild(g);
}

// Distant fighter silhouette — small, detailed enough at a glance.
export function drawDistantShip(root: Container, seed: number): void {
  const r = mulberry32(seed);
  const variant = Math.floor(r() * 3);
  const g = new Graphics();
  if (variant === 0) {
    // Arrowhead patrol craft with visible cockpit and twin engines.
    g.poly([0, -12, 10, 7, 4, 10, 0, 6, -4, 10, -10, 7]).fill(0x344765);
    g.poly([0, -12, 10, 7, 4, 10, 0, 6, -4, 10, -10, 7]).stroke({ color: 0x91b8d8, width: 0.8 });
    g.poly([0, -9, 5, 4, 0, 1, -5, 4]).fill(0x5f7897);
    g.ellipse(0, -2, 3, 2).fill(0xc4e2ff);
    g.circle(-4, 8, 1.2).fill(0xff9a3a);
    g.circle(4, 8, 1.2).fill(0xff9a3a);
  } else if (variant === 1) {
    // Small transport: solid hull, bridge strip, and side pods.
    g.poly([-12, -5, 8, -6, 12, -2, 12, 5, -9, 6, -14, 1]).fill(0x334055);
    g.poly([-12, -5, 8, -6, 12, -2, 12, 5, -9, 6, -14, 1]).stroke({ color: 0x7f8ea2, width: 0.8 });
    g.rect(-8, -3, 13, 3).fill(0x5f6e82);
    g.rect(-7, -2, 3, 2).fill(0xc4e2ff);
    g.rect(-2, -2, 3, 2).fill(0xc4e2ff);
    g.rect(3, -2, 3, 2).fill(0xc4e2ff);
    g.rect(-14, -1, 3, 3).fill(0x1b222c);
    g.rect(10, -1, 3, 3).fill(0x1b222c);
    g.circle(-10, 4, 1.1).fill(0xff9a3a);
  } else {
    // Saucer with opaque rim and domed glass.
    g.ellipse(0, 1, 13, 5).fill(0x2f4054);
    g.ellipse(0, 1, 13, 5).stroke({ color: 0x8aa0b6, width: 0.8 });
    g.ellipse(0, -2, 8, 4).fill(0x607c9b);
    g.ellipse(-1, -3, 4, 2).fill(0xc4e2ff);
    for (let i = 0; i < 5; i++) g.circle(-8 + i * 4, 3, 0.7).fill(0xffd166);
  }
  root.addChild(g);
}

// Derelict capital ship drifting in the background.
export function drawDerelictShip(root: Container, seed: number): void {
  const r = mulberry32(seed);
  const g = new Graphics();
  const pts = [-96, -12, -72, -22, 46, -24, 88, -12, 98, 2, 84, 18, 34, 24, -72, 20, -98, 8];
  g.poly(pts.map((v, i) => i % 2 === 0 ? v + 4 : v + 5)).fill({ color: 0x000000, alpha: 0.45 });
  g.poly(pts).fill(0x342719);
  g.poly(pts).stroke({ color: 0x0b0704, width: 2 });

  // Surviving armor plating and directional light.
  g.poly([-90, -10, -70, -18, 42, -20, 82, -10, 50, -2, -44, 2, -88, 0]).fill(0x765638);
  g.poly([-88, 4, -58, 8, 24, 10, 72, 6, 82, 14, 30, 19, -70, 16]).fill(0x20150d);
  for (let i = 0; i < 7; i++) {
    const x = -72 + i * 24;
    g.moveTo(x, -19).lineTo(x + 8, 18).stroke({ color: 0x120b06, width: 0.9 });
    g.circle(x + 6, -12, 0.9).fill(0x0b0704);
    g.circle(x + 10, 12, 0.9).fill(0x0b0704);
  }

  // Torn hull holes with hot inner metal.
  for (let i = 0; i < 5; i++) {
    const x = -62 + r() * 120;
    const y = -7 + r() * 15;
    const w = 12 + r() * 12;
    const h = 6 + r() * 8;
    g.poly([x, y, x + w * 0.8, y - h * 0.5, x + w, y + h * 0.2, x + w * 0.55, y + h, x + w * 0.1, y + h * 0.8]).fill(0x050302);
    g.poly([x + 2, y + 1, x + w * 0.7, y, x + w - 2, y + h * 0.25, x + w * 0.52, y + h - 1, x + 3, y + h * 0.65]).fill(0x401207);
    if (r() < 0.7) {
      g.circle(x + w * 0.55, y + h * 0.45, 2.2).fill(0xff7533);
      g.circle(x + w * 0.55, y + h * 0.45, 0.9).fill(0xfff066);
    }
  }

  // Missing chunks and exposed ribs.
  g.poly([30, -24, 52, -22, 45, -10, 34, -12]).fill(0x000000);
  g.poly([-38, 18, -18, 23, -24, 10, -40, 12]).fill(0x000000);
  for (let i = 0; i < 4; i++) {
    const x = -24 + i * 11;
    g.moveTo(x, 12).lineTo(x + 4, 22).stroke({ color: 0x6a4a30, width: 1.2 });
  }

  // Bridge block, dead engines, dangling antennae.
  g.rect(46, -21, 26, 11).fill(0x17100a);
  g.rect(48, -19, 22, 8).fill(0x4d3925);
  g.rect(50, -18, 18, 3).fill(0xa57a4e);
  for (let i = 0; i < 4; i++) g.rect(52 + i * 4, -16, 2, 2).fill(i === 2 ? 0x2a160a : 0xffa14a);
  g.moveTo(58, -21).lineTo(64, -34).stroke({ color: 0x160d06, width: 1.4 });
  g.moveTo(64, -34).lineTo(74, -29).stroke({ color: 0x160d06, width: 1 });
  g.moveTo(38, -23).lineTo(34, -36).stroke({ color: 0x160d06, width: 1 });
  for (const ey of [-7, 7]) {
    g.circle(-93, ey, 7).fill(0x080503);
    g.circle(-93, ey, 4.8).fill(0x21150c);
    g.circle(-93, ey, 2.5).fill(0x050302);
  }

  // Loose nearby fragments baked into the same sprite.
  for (let i = 0; i < 8; i++) {
    const x = -85 + r() * 170;
    const y = -34 + r() * 68;
    if (x > -95 && x < 95 && y > -24 && y < 24) continue;
    const w = 4 + r() * 8;
    const h = 3 + r() * 6;
    g.rect(x, y, w, h).fill(0x3a2a1f);
    g.rect(x, y, w, h).stroke({ color: 0x0b0704, width: 0.7 });
  }
  root.addChild(g);
}

// Dying star — large red giant with corona flares and dark sunspots.
export function drawDyingStar(root: Container, seed: number, R: number, palette: { core: number; flare: number; halo: number }): void {
  const r = mulberry32(seed);
  // Outer corona haze (large soft glow)
  const haze = new Graphics();
  for (let i = 0; i < 14; i++) {
    const k = (i + 1) / 14;
    haze.circle(0, 0, R + R * 0.8 * k).fill({ color: palette.halo, alpha: 0.05 * (1 - k) });
  }
  haze.blendMode = 'add';
  root.addChild(haze);

  // Flame tongues licking outward
  const flares = new Graphics();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + r() * 0.2;
    const len = R * (0.25 + r() * 0.4);
    const w = 0.18 + r() * 0.18;
    flares.poly([
      Math.cos(a) * R, Math.sin(a) * R,
      Math.cos(a + w) * R, Math.sin(a + w) * R,
      Math.cos(a + w * 0.5) * (R + len), Math.sin(a + w * 0.5) * (R + len),
    ]).fill({ color: palette.flare, alpha: 0.85 });
  }
  flares.blendMode = 'add';
  root.addChild(flares);

  // Star body
  const body = new Graphics();
  body.circle(0, 0, R).fill(palette.core);
  body.circle(-R * 0.25, -R * 0.25, R * 0.85).fill(palette.flare);
  body.circle(-R * 0.35, -R * 0.35, R * 0.5).fill(0xfff066);
  body.circle(0, 0, R).stroke({ color: palette.flare, width: 2, alpha: 0.6 });
  root.addChild(body);

  // Surface texture (granulation patches)
  const surf = new Graphics();
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * R * 0.92;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rad = R * (0.05 + r() * 0.08);
    surf.circle(x, y, rad).fill({ color: palette.flare, alpha: 0.5 });
    surf.circle(x - rad * 0.2, y - rad * 0.2, rad * 0.6).fill({ color: 0xfff066, alpha: 0.55 });
  }
  // Sunspots (dark patches)
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * R * 0.7;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rad = R * (0.06 + r() * 0.08);
    surf.circle(x, y, rad).fill({ color: 0x4a1010, alpha: 0.85 });
    surf.circle(x + rad * 0.2, y + rad * 0.2, rad * 0.5).fill({ color: 0x000000, alpha: 0.6 });
  }
  // Clip surface to circle
  const mask = new Graphics();
  mask.circle(0, 0, R).fill(0xffffff);
  surf.mask = mask;
  root.addChild(mask);
  root.addChild(surf);

  // Bright inner specular
  const spec = new Graphics();
  spec.circle(-R * 0.32, -R * 0.32, R * 0.3).fill({ color: 0xffffff, alpha: 0.6 });
  spec.mask = mask;
  root.addChild(spec);
}

// Massive broken capital-ship fragments. 16 distinct silhouettes/architectures.

interface WreckPal {
  dark: number;     // outline / shadow
  hull: number;     // main hull mid-tone
  light: number;    // highlight upper-left
  ember: number;    // exposed gash glow
  window: number;   // lit window
}

const WRECK_PALETTES: WreckPal[] = [
  { dark: 0x10080a, hull: 0x3a2618, light: 0x6a4a30, ember: 0xff6633, window: 0xffaa44 }, // 0 rusty military
  { dark: 0x08101a, hull: 0x1a2840, light: 0x4a6a90, ember: 0xff7755, window: 0x88c4ff }, // 1 navy blue
  { dark: 0x0a1a0a, hull: 0x1a3a1a, light: 0x4a7a3a, ember: 0xffaa33, window: 0xc4ff88 }, // 2 military green
  { dark: 0x1a0a0a, hull: 0x4a1a1a, light: 0x8a3a30, ember: 0xff5022, window: 0xff9944 }, // 3 imperial red
  { dark: 0x150a1a, hull: 0x3a1d4a, light: 0x6e3a8a, ember: 0xffaa66, window: 0xc488ff }, // 4 alien purple
  { dark: 0x0a181a, hull: 0x1a3a3a, light: 0x4a8a8a, ember: 0x88ffe6, window: 0xa3f0ff }, // 5 alien teal
  { dark: 0x18120a, hull: 0x4a3818, light: 0x9a7430, ember: 0xff8833, window: 0xfff066 }, // 6 industrial gold
  { dark: 0x0a0a14, hull: 0x2a2840, light: 0x5a587a, ember: 0xff6644, window: 0xc4d4e4 }, // 7 chrome silver
];

function pickPal(seed: number): WreckPal {
  return WRECK_PALETTES[seed % WRECK_PALETTES.length];
}

// Draws a torn hull edge with ember glow (used by many variants).
function tornEdge(g: Graphics, points: number[], pal: WreckPal): void {
  g.poly(points).fill({ color: 0x000000, alpha: 0.95 });
  // Inner ember layer
  const shrunk: number[] = [];
  const cx = points.reduce((s, v, i) => i % 2 === 0 ? s + v : s, 0) / (points.length / 2);
  const cy = points.reduce((s, v, i) => i % 2 === 1 ? s + v : s, 0) / (points.length / 2);
  for (let i = 0; i < points.length; i += 2) {
    shrunk.push(cx + (points[i] - cx) * 0.6, cy + (points[i + 1] - cy) * 0.6);
  }
  g.poly(shrunk).fill({ color: 0x4a1a10, alpha: 0.95 });
  // Tiny ember spots
  g.circle(cx, cy, 3).fill({ color: pal.ember, alpha: 0.9 });
  g.circle(cx, cy, 1.5).fill(0xfff066);
}

function rivetsLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, n: number, pal: WreckPal): void {
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    g.circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.8).fill(pal.dark);
  }
}

function damageGashes(g: Graphics, rng: () => number, bounds: { minX: number; maxX: number; minY: number; maxY: number }, count: number, pal: WreckPal): void {
  for (let i = 0; i < count; i++) {
    const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
    const y = bounds.minY + rng() * (bounds.maxY - bounds.minY);
    const w = 6 + rng() * 10;
    const h = 6 + rng() * 10;
    g.rect(x, y, w, h).fill({ color: 0x000000, alpha: 0.9 });
    g.rect(x + 1, y + 1, w - 2, h - 2).fill({ color: 0x4a1a10, alpha: 0.85 });
    g.rect(x + w * 0.35, y + h * 0.35, w * 0.3, h * 0.3).fill({ color: pal.ember, alpha: 0.75 });
    g.circle(x + w * 0.5, y + h * 0.5, 1.2).fill(0xfff066);
  }
}

function brokenAntenna(g: Graphics, x: number, y: number, length: number, pal: WreckPal): void {
  const midX = x + (Math.random() - 0.5) * 6;
  const midY = y - length * 0.6;
  const tipX = midX + (Math.random() - 0.5) * 14;
  const tipY = y - length;
  g.moveTo(x, y).lineTo(midX, midY).stroke({ color: pal.dark, width: 1.6 });
  g.moveTo(midX, midY).lineTo(tipX, tipY).stroke({ color: pal.dark, width: 1.2 });
  if (Math.random() < 0.3) g.circle(tipX, tipY, 1.4).fill(pal.window);
}

function floatingChunks(g: Graphics, rng: () => number, count: number, area: number, exclude: { x: number; y: number; w: number; h: number }, pal: WreckPal): void {
  for (let i = 0; i < count; i++) {
    const dx = -area + rng() * area * 2;
    const dy = -area * 0.5 + rng() * area;
    if (dx > exclude.x && dx < exclude.x + exclude.w && dy > exclude.y && dy < exclude.y + exclude.h) continue;
    const sz = 2 + rng() * 5;
    g.rect(dx, dy, sz, sz * 0.7).fill(pal.hull);
    g.rect(dx, dy, sz, sz * 0.7).stroke({ color: pal.dark, width: 0.6 });
  }
}

export function drawCapitalWreck(root: Container, seed: number, variant?: number): void {
  const r = mulberry32(seed);
  const v = variant ?? (seed % 16);
  const pal = pickPal(seed >> 2);
  const g = new Graphics();

  switch (v) {
    case 0: {
      // Long battleship hull (classic) — beam with torn aft, surviving bridge.
      const pts = [-180, -22, -156, -36, 60, -42, 110, -36, 130, -20, 132, 4, 120, 26, 90, 36, -50, 38, -100, 30, -140, 26, -156, 8];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 5)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      g.poly([-178, -20, -154, -32, 58, -38, 108, -32, 80, -10, -40, -2, -132, -10, -154, 2]).fill({ color: pal.light, alpha: 0.55 });
      tornEdge(g, [110, -36, 130, -20, 132, 4, 120, 26, 104, 18, 122, 8, 110, -6, 122, -14, 106, -22, 118, -32], pal);
      damageGashes(g, r, { minX: -120, maxX: 80, minY: -8, maxY: 8 }, 5, pal);
      // Bridge stub with lit windows
      g.rect(-30, -36, 24, 12).fill(pal.dark);
      g.rect(-28, -34, 20, 8).fill(pal.hull);
      for (let i = 0; i < 4; i++) g.rect(-26 + i * 5, -34, 2, 3).fill(pal.window);
      brokenAntenna(g, -18, -36, 18, pal);
      brokenAntenna(g, -2, -36, 22, pal);
      for (const dy of [-12, 12]) {
        g.circle(-176, dy, 7).fill(pal.dark);
        g.circle(-176, dy, 5).fill(pal.hull);
        g.circle(-176, dy, 3).fill({ color: 0x4a1a10, alpha: 0.85 });
      }
      for (let i = 0; i < 10; i++) {
        const x = -150 + i * 30;
        g.moveTo(x, -30).lineTo(x, 30).stroke({ color: pal.dark, width: 0.7, alpha: 0.7 });
      }
      floatingChunks(g, r, 8, 160, { x: -150, y: -30, w: 290, h: 60 }, pal);
      break;
    }
    case 1: {
      // Dreadnought bow — V-shape front section with command tower.
      const pts = [0, -82, 50, -56, 76, -28, 90, 14, 60, 36, -60, 36, -90, 14, -76, -28, -50, -56];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      // Highlight upper
      g.poly([0, -74, 44, -50, 68, -24, 64, 6, -64, 6, -68, -24, -44, -50]).fill({ color: pal.light, alpha: 0.55 });
      // Torn back edge
      tornEdge(g, [-80, 30, -60, 36, -30, 30, 0, 38, 30, 30, 60, 36, 80, 30, 50, 18, 20, 26, -20, 22, -50, 18], pal);
      // Tower running down centerline
      g.rect(-12, -60, 24, 50).fill(pal.dark);
      g.rect(-10, -58, 20, 46).fill(pal.hull);
      g.rect(-8, -56, 16, 6).fill(pal.light);
      for (let i = 0; i < 5; i++) g.rect(-7 + i * 4, -42, 2, 3).fill(pal.window);
      for (let i = 0; i < 4; i++) g.rect(-7 + i * 5, -28, 2, 3).fill(pal.window);
      // Forward turrets (broken)
      for (const tx of [-30, 30]) {
        g.circle(tx, -20, 6).fill(pal.dark);
        g.circle(tx, -20, 4).fill(pal.hull);
        g.rect(tx - 1, -32, 2, 8).fill(pal.dark);
      }
      brokenAntenna(g, 0, -60, 24, pal);
      brokenAntenna(g, -10, -56, 14, pal);
      damageGashes(g, r, { minX: -50, maxX: 50, minY: -10, maxY: 22 }, 4, pal);
      // Side rivets
      rivetsLine(g, -70, -20, 70, -20, 17, pal);
      floatingChunks(g, r, 10, 110, { x: -90, y: -80, w: 180, h: 120 }, pal);
      break;
    }
    case 2: {
      // Dreadnought stern — engines section, exposed reactor glow.
      const pts = [-90, -40, 90, -40, 88, -20, 96, 14, 90, 38, -90, 38, -96, 14, -88, -20];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      g.poly([-86, -36, 86, -36, 84, -20, 92, 10, -92, 10]).fill({ color: pal.light, alpha: 0.55 });
      // Torn FRONT edge (it's a stern, so front is cut)
      tornEdge(g, [-90, -40, -60, -34, -20, -42, 20, -36, 60, -42, 90, -40, 50, -28, 20, -22, -10, -28, -50, -24, -80, -30], pal);
      // 4 engine bells with exposed reactor cores
      for (const ex of [-60, -22, 18, 56]) {
        g.circle(ex, 32, 14).fill(pal.dark);
        g.circle(ex, 32, 12).fill(pal.hull);
        g.circle(ex, 32, 9).fill({ color: pal.ember, alpha: 0.85 });
        g.circle(ex, 32, 5).fill(0xfff066);
        g.circle(ex, 32, 2).fill(0xffffff);
      }
      // Side maneuver thrusters
      g.rect(-96, -10, 10, 8).fill(pal.dark);
      g.rect(86, -10, 10, 8).fill(pal.dark);
      // Hull panel lines
      for (let i = 0; i < 9; i++) g.moveTo(-80 + i * 20, -38).lineTo(-80 + i * 20, 10).stroke({ color: pal.dark, width: 0.7, alpha: 0.7 });
      damageGashes(g, r, { minX: -70, maxX: 70, minY: -10, maxY: 8 }, 5, pal);
      floatingChunks(g, r, 8, 130, { x: -100, y: -40, w: 200, h: 80 }, pal);
      break;
    }
    case 3: {
      // Carrier flight deck slab — long flat with hangar bay openings.
      const pts = [-200, -18, 200, -18, 200, 18, -200, 18];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      g.rect(-198, -16, 396, 8).fill({ color: pal.light, alpha: 0.55 });
      // Hangar bays along the deck
      for (let i = 0; i < 7; i++) {
        const x = -180 + i * 56;
        g.rect(x, -10, 32, 20).fill(0x000000);
        g.rect(x + 1, -9, 30, 18).fill({ color: pal.window, alpha: i % 2 === 0 ? 0.7 : 0.25 });
        if (i % 2 === 0) {
          // Hangar still lit, drone inside
          g.circle(x + 16, 0, 3).fill(pal.dark);
          g.circle(x + 16, 0, 2).fill(pal.window);
        } else {
          // Hangar collapsed
          g.circle(x + 16, 4, 3).fill({ color: pal.ember, alpha: 0.8 });
        }
      }
      // Torn left end
      tornEdge(g, [-200, -18, -180, -16, -190, -8, -184, 4, -200, 18, -184, 14, -176, 0, -190, -10], pal);
      // Surviving control tower
      g.rect(20, -32, 30, 14).fill(pal.dark);
      g.rect(22, -30, 26, 10).fill(pal.hull);
      g.rect(24, -28, 22, 4).fill(pal.light);
      for (let i = 0; i < 5; i++) g.rect(25 + i * 4, -28, 2, 3).fill(pal.window);
      brokenAntenna(g, 30, -32, 22, pal);
      brokenAntenna(g, 42, -32, 16, pal);
      // Runway lights along edge
      for (let i = 0; i < 9; i++) g.circle(-160 + i * 40, -14, 1).fill(0xfff066);
      floatingChunks(g, r, 12, 200, { x: -200, y: -32, w: 400, h: 50 }, pal);
      break;
    }
    case 4: {
      // Cruiser midsection — barrel torn on BOTH sides.
      const pts = [-90, -34, 90, -34, 100, -16, 100, 16, 90, 34, -90, 34, -100, 16, -100, -16];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      g.poly([-86, -30, 86, -30, 92, -16, 92, 6, -92, 6]).fill({ color: pal.light, alpha: 0.55 });
      // Two torn ends
      tornEdge(g, [-100, -16, -90, -34, -76, -22, -84, -8, -76, 6, -90, 14, -100, 16], pal);
      tornEdge(g, [100, -16, 90, -34, 76, -22, 84, -8, 76, 6, 90, 14, 100, 16], pal);
      // Exposed internal beams (cross-section reveal)
      for (let i = 0; i < 5; i++) g.moveTo(-70 + i * 30, -28).lineTo(-70 + i * 30, 28).stroke({ color: pal.dark, width: 1.5 });
      for (let i = 0; i < 3; i++) g.moveTo(-80, -16 + i * 16).lineTo(80, -16 + i * 16).stroke({ color: pal.dark, width: 0.8, alpha: 0.7 });
      // Bridge dome on top
      g.ellipse(0, -32, 18, 8).fill(pal.dark);
      g.ellipse(0, -32, 16, 6).fill(pal.hull);
      g.ellipse(0, -33, 12, 3).fill(pal.window);
      damageGashes(g, r, { minX: -60, maxX: 60, minY: -10, maxY: 14 }, 4, pal);
      floatingChunks(g, r, 9, 130, { x: -100, y: -36, w: 200, h: 80 }, pal);
      break;
    }
    case 5: {
      // Cargo barge — chain of cargo containers.
      // 4 containers strung together with broken connectors.
      const containerColors = [pal.hull, pal.dark, pal.hull, pal.light];
      for (let i = 0; i < 4; i++) {
        const x = -140 + i * 80;
        const w = 60, h = 50;
        g.rect(x, -h / 2, w, h).fill(containerColors[i] as number);
        g.rect(x, -h / 2, w, h).stroke({ color: pal.dark, width: 1.5 });
        // Horizontal stripes
        for (let k = 0; k < 4; k++) g.rect(x + 2, -h / 2 + 4 + k * 12, w - 4, 2).fill({ color: pal.light, alpha: 0.55 });
        // Hazard chevron
        g.poly([x + 6, -h / 2 + 18, x + 18, -h / 2 + 18, x + 12, -h / 2 + 30, x + 0, -h / 2 + 30]).fill({ color: 0xfff066, alpha: 0.55 });
        // Container number
        g.rect(x + 30, -h / 2 + 36, 18, 6).fill(pal.dark);
        g.rect(x + 32, -h / 2 + 38, 14, 2).fill(pal.window);
        // Some containers damaged
        if (i === 1) {
          g.rect(x + 18, -h / 2 + 14, 14, 14).fill({ color: 0x000000, alpha: 0.95 });
          g.circle(x + 25, -h / 2 + 21, 3).fill({ color: pal.ember, alpha: 0.85 });
        }
      }
      // Connector struts between containers
      for (let i = 0; i < 3; i++) {
        const x = -80 + i * 80;
        g.rect(x, -3, 20, 6).fill(pal.dark);
        g.rect(x, -2, 20, 4).fill(pal.hull);
      }
      // Broken connector on one side
      g.rect(-140 - 18, -3, 12, 6).fill(pal.dark);
      g.rect(-140 - 8, -6, 6, 3).fill(pal.dark);
      // Floating containers (loose)
      floatingChunks(g, r, 16, 200, { x: -150, y: -30, w: 300, h: 60 }, pal);
      break;
    }
    case 6: {
      // Alien organic curved hull — biomechanical chitin curves.
      const pts: number[] = [];
      const N = 16;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const rad = 80 + Math.sin(a * 3 + 1) * 18 + r() * 8;
        pts.push(Math.cos(a) * rad * 1.3, Math.sin(a) * rad * 0.7);
      }
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      // Inner organic ridges
      for (let i = 0; i < 4; i++) {
        const sx = -70 + r() * 140;
        const sy = -30 + r() * 60;
        const w = 30 + r() * 30;
        g.ellipse(sx, sy, w, 4).fill({ color: pal.light, alpha: 0.55 });
        g.ellipse(sx, sy, w * 0.6, 2).fill({ color: 0xffffff, alpha: 0.4 });
      }
      // Glowing biomechanical pods (eye-like)
      for (let i = 0; i < 5; i++) {
        const ex = -80 + r() * 160;
        const ey = -25 + r() * 50;
        g.circle(ex, ey, 5).fill(pal.dark);
        g.circle(ex, ey, 3.5).fill({ color: pal.ember, alpha: 0.9 });
        g.circle(ex, ey, 1.5).fill(0xffffff);
      }
      // Torn open wound
      tornEdge(g, [40, -50, 70, -30, 80, -5, 70, 20, 50, 40, 60, 20, 70, 0, 60, -20], pal);
      // Tendrils trailing
      for (let i = 0; i < 4; i++) {
        const sx = -100 - i * 6;
        const sy = -15 + i * 10;
        g.moveTo(sx, sy).bezierCurveTo(sx - 14, sy + 4, sx - 20, sy - 6, sx - 28, sy + 6).stroke({ color: pal.hull, width: 2 });
        g.circle(sx - 28, sy + 6, 1.5).fill(pal.ember);
      }
      floatingChunks(g, r, 10, 130, { x: -100, y: -50, w: 200, h: 100 }, pal);
      break;
    }
    case 7: {
      // Mining processor — hammerhead with broken drill.
      // Main body
      g.rect(-90, -36, 180, 72).fill(pal.hull);
      g.rect(-90, -36, 180, 72).stroke({ color: pal.dark, width: 2 });
      g.rect(-88, -34, 176, 16).fill({ color: pal.light, alpha: 0.55 });
      // Hammerhead (cargo intake) on right
      g.poly([90, -36, 130, -42, 140, -20, 140, 20, 130, 42, 90, 36]).fill(pal.hull);
      g.poly([90, -36, 130, -42, 140, -20, 140, 20, 130, 42, 90, 36]).stroke({ color: pal.dark, width: 2 });
      g.poly([94, -32, 126, -38, 134, -20, 134, 0, 100, -10]).fill({ color: pal.light, alpha: 0.55 });
      // Drill (broken stub on left)
      g.rect(-110, -8, 30, 16).fill(pal.dark);
      g.rect(-108, -6, 26, 12).fill(pal.hull);
      // Drill helix marks
      for (let i = 0; i < 4; i++) g.moveTo(-110 + i * 8, -8).lineTo(-110 + i * 8 + 4, 8).stroke({ color: pal.dark, width: 1 });
      // Broken drill tip (stubs)
      g.poly([-110, -8, -120, -4, -118, 0, -110, 0]).fill(pal.dark);
      g.poly([-110, 0, -118, 6, -114, 10, -110, 8]).fill(pal.dark);
      // Hazard stripes
      for (let i = 0; i < 6; i++) {
        g.poly([-70 + i * 16, -34, -62 + i * 16, -34, -58 + i * 16, -28, -66 + i * 16, -28]).fill({ color: 0xfff066, alpha: 0.7 });
      }
      // Conveyor belt cutaway
      g.rect(-60, 16, 100, 8).fill(pal.dark);
      for (let i = 0; i < 10; i++) g.rect(-58 + i * 10, 18, 6, 4).fill(pal.light);
      // Mineral residue (glowing chunks)
      for (let i = 0; i < 5; i++) {
        const mx = -50 + i * 22;
        g.circle(mx, 30, 3).fill({ color: pal.ember, alpha: 0.85 });
        g.circle(mx, 30, 1.5).fill(0xfff066);
      }
      // Surviving cockpit
      g.rect(20, -36, 24, 8).fill(pal.dark);
      for (let i = 0; i < 4; i++) g.rect(22 + i * 5, -34, 2, 3).fill(pal.window);
      damageGashes(g, r, { minX: -60, maxX: 80, minY: -25, maxY: 0 }, 4, pal);
      floatingChunks(g, r, 12, 170, { x: -120, y: -42, w: 260, h: 90 }, pal);
      break;
    }
    case 8: {
      // Frigate inverted — torn frigate floating sideways, asymmetric.
      const pts = [-110, 22, -90, 14, 60, 8, 100, 22, 110, 36, 80, 42, -60, 42, -100, 36];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      g.poly([-106, 20, -88, 12, 58, 6, 96, 20, 96, 28, -100, 28]).fill({ color: pal.light, alpha: 0.55 });
      // Wings (upside-down)
      g.poly([-60, 14, -100, -10, -100, -2, -50, 16]).fill(pal.hull);
      g.poly([-60, 14, -100, -10, -100, -2, -50, 16]).stroke({ color: pal.dark, width: 1.5 });
      g.poly([60, 14, 100, -10, 100, -2, 50, 16]).fill(pal.hull);
      g.poly([60, 14, 100, -10, 100, -2, 50, 16]).stroke({ color: pal.dark, width: 1.5 });
      // Torn off front
      tornEdge(g, [100, 22, 110, 36, 90, 32, 96, 24, 100, 18], pal);
      // Cockpit (inverted)
      g.rect(-10, 30, 20, 10).fill(pal.dark);
      for (let i = 0; i < 4; i++) g.rect(-8 + i * 4, 32, 2, 3).fill(pal.window);
      // Dead engines
      for (const ex of [-100, -85]) {
        g.circle(ex, 26, 5).fill(pal.dark);
        g.circle(ex, 26, 3).fill({ color: 0x4a1a10, alpha: 0.9 });
      }
      damageGashes(g, r, { minX: -80, maxX: 80, minY: 16, maxY: 34 }, 4, pal);
      // Tumbling rotation suggestion via small floating pieces
      floatingChunks(g, r, 12, 140, { x: -110, y: -10, w: 220, h: 55 }, pal);
      break;
    }
    case 9: {
      // Catamaran twins — two parallel hulls connected by broken span.
      for (const hy of [-30, 30]) {
        const pts = [-100, hy - 10, 100, hy - 10, 110, hy, 100, hy + 10, -100, hy + 10, -110, hy];
        g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
        g.poly(pts).fill(pal.hull);
        g.poly(pts).stroke({ color: pal.dark, width: 2 });
        g.poly([-96, hy - 8, 96, hy - 8, 104, hy - 4, -100, hy - 4]).fill({ color: pal.light, alpha: 0.55 });
        // Cockpit on each
        g.rect(60, hy - 10, 24, 6).fill(pal.dark);
        for (let i = 0; i < 4; i++) g.rect(62 + i * 5, hy - 9, 2, 2).fill(pal.window);
        // Engine bell
        g.circle(-104, hy, 4).fill(pal.dark);
        g.circle(-104, hy, 2.5).fill({ color: pal.ember, alpha: 0.8 });
      }
      // Broken connector struts (3, with one missing)
      g.rect(-60, -22, 8, 44).fill(pal.dark);
      g.rect(-60, -22, 8, 44).stroke({ color: pal.hull, width: 1 });
      g.rect(50, -22, 8, 44).fill(pal.dark);
      g.rect(50, -22, 8, 44).stroke({ color: pal.hull, width: 1 });
      // Middle strut snapped — top half hanging
      g.rect(-5, -22, 8, 20).fill(pal.dark);
      g.rect(-5, -22, 8, 20).stroke({ color: pal.hull, width: 1 });
      g.rect(-3, 8, 8, 14).fill(pal.dark);
      g.poly([-5, -2, 3, -2, 0, 2, -2, 2]).fill({ color: pal.ember, alpha: 0.8 });
      damageGashes(g, r, { minX: -80, maxX: 80, minY: -40, maxY: 40 }, 5, pal);
      floatingChunks(g, r, 12, 130, { x: -110, y: -42, w: 220, h: 84 }, pal);
      break;
    }
    case 10: {
      // Command tower fallen — broken tower lying horizontally.
      // Main tower body
      g.rect(-130, -22, 220, 44).fill(pal.hull);
      g.rect(-130, -22, 220, 44).stroke({ color: pal.dark, width: 2 });
      g.rect(-128, -20, 216, 12).fill({ color: pal.light, alpha: 0.55 });
      // Sequential bridge decks visible
      for (let i = 0; i < 4; i++) {
        const x = -110 + i * 60;
        g.rect(x, -16, 50, 32).fill(pal.dark);
        g.rect(x + 2, -14, 46, 28).fill(pal.hull);
        // Windows in each deck
        for (let k = 0; k < 5; k++) g.rect(x + 4 + k * 9, -10, 4, 4).fill({ color: pal.window, alpha: i === 1 ? 0.4 : 0.9 });
        for (let k = 0; k < 5; k++) g.rect(x + 4 + k * 9, 4, 4, 4).fill({ color: pal.window, alpha: i === 2 ? 0.4 : 0.9 });
      }
      // Antennae sticking out (broken)
      brokenAntenna(g, -110, -22, 32, pal);
      brokenAntenna(g, -50, -22, 28, pal);
      brokenAntenna(g, 30, -22, 36, pal);
      // Snapped end on right
      tornEdge(g, [90, -22, 110, -10, 120, 6, 110, 22, 90, 22, 100, 8, 92, -8, 102, -16], pal);
      // Dish on top
      g.circle(-90, -32, 8).fill(pal.dark);
      g.circle(-90, -32, 6).fill(pal.hull);
      g.circle(-90, -32, 4).fill(pal.light);
      g.moveTo(-90, -22).lineTo(-90, -32).stroke({ color: pal.dark, width: 2 });
      damageGashes(g, r, { minX: -100, maxX: 80, minY: -10, maxY: 14 }, 4, pal);
      floatingChunks(g, r, 12, 160, { x: -140, y: -40, w: 270, h: 80 }, pal);
      break;
    }
    case 11: {
      // Spine exposed — rib structure with no outer hull (just bones).
      // Main spinal beam
      g.rect(-140, -4, 280, 8).fill(pal.dark);
      g.rect(-140, -4, 280, 8).stroke({ color: pal.dark, width: 1.5 });
      g.rect(-138, -3, 276, 3).fill(pal.light);
      // Ribs perpendicular to spine
      for (let i = 0; i < 8; i++) {
        const x = -130 + i * 35;
        const h = 36 + Math.sin(i * 0.7) * 8;
        g.rect(x - 2, -h, 4, h * 2).fill(pal.hull);
        g.rect(x - 2, -h, 4, h * 2).stroke({ color: pal.dark, width: 0.8 });
        // Some ribs broken
        if (i === 2 || i === 5) {
          g.rect(x - 3, -h - 2, 6, 6).fill(0x000000);
          g.circle(x, -h, 2).fill({ color: pal.ember, alpha: 0.7 });
        }
      }
      // Vertebrae nodes along the spine
      for (let i = 0; i < 9; i++) {
        const x = -140 + i * 35;
        g.circle(x, 0, 5).fill(pal.dark);
        g.circle(x, 0, 4).fill(pal.hull);
        g.circle(x, 0, 2).fill(pal.window);
      }
      // Smoke wisps along ribs
      for (let i = 0; i < 4; i++) {
        const x = -100 + i * 50;
        g.ellipse(x, -50, 10, 4).fill({ color: 0x4a4a4a, alpha: 0.55 });
      }
      // Hanging cables
      for (let i = 0; i < 5; i++) {
        const sx = -120 + i * 50;
        const sy = -30 + Math.sin(i * 1.4) * 8;
        const ex = sx + 8;
        const ey = sy + 30 + Math.cos(i) * 6;
        g.moveTo(sx, sy).bezierCurveTo(sx + 4, sy + 14, ex - 4, ey - 14, ex, ey).stroke({ color: pal.dark, width: 1.4 });
        g.circle(ex, ey, 1.2).fill(pal.ember);
      }
      floatingChunks(g, r, 15, 170, { x: -150, y: -45, w: 290, h: 90 }, pal);
      break;
    }
    case 12: {
      // Wedge — pointed bow only.
      const pts = [0, -60, 30, -30, 60, 20, 50, 50, -50, 50, -60, 20, -30, -30];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      g.poly([0, -54, 26, -28, 50, 14, -50, 14, -26, -28]).fill({ color: pal.light, alpha: 0.55 });
      // Torn back edge
      tornEdge(g, [-50, 50, -30, 44, 0, 52, 30, 44, 50, 50, 30, 56, -30, 56], pal);
      // Forward turrets
      for (const tx of [-16, 16]) {
        g.rect(tx - 3, -34, 6, 14).fill(pal.dark);
        g.rect(tx - 2, -36, 4, 4).fill(pal.window);
      }
      // Cockpit
      g.ellipse(0, -10, 8, 5).fill(pal.dark);
      g.ellipse(0, -10, 6, 3).fill(pal.window);
      // Hull plate seams
      for (let i = 0; i < 4; i++) g.moveTo(-30, -20 + i * 16).lineTo(30, -20 + i * 16).stroke({ color: pal.dark, width: 0.7, alpha: 0.7 });
      damageGashes(g, r, { minX: -30, maxX: 30, minY: 0, maxY: 40 }, 3, pal);
      floatingChunks(g, r, 10, 90, { x: -60, y: -60, w: 120, h: 116 }, pal);
      break;
    }
    case 13: {
      // Saucer disc — UFO shape cracked open.
      g.ellipse(0, 0, 110, 38).fill(pal.hull);
      g.ellipse(0, 0, 110, 38).stroke({ color: pal.dark, width: 2 });
      g.ellipse(-22, -8, 100, 30).fill({ color: pal.light, alpha: 0.55 });
      g.ellipse(0, -10, 50, 20).fill(pal.dark);
      g.ellipse(0, -12, 44, 14).fill({ color: pal.window, alpha: 0.85 });
      // Equator ring of lights (some broken)
      for (let i = 0; i < 14; i++) {
        const t = i / 14;
        const x = -100 + t * 200;
        const lit = i % 3 !== 0;
        g.circle(x, 18, 1.6).fill(lit ? pal.window : pal.dark);
      }
      // Big crack across the disc
      g.poly([-90, -8, -40, 4, -10, -2, 30, 6, 80, 0, 110, 4, 80, 8, 30, 12, -10, 6, -40, 10, -90, 2]).fill(0x000000);
      g.poly([-80, -4, -42, 2, -12, -1, 28, 4, 76, 2, 100, 4, 76, 6, 28, 9, -12, 4, -42, 6, -80, 0]).fill({ color: pal.ember, alpha: 0.6 });
      g.circle(-50, 5, 3).fill({ color: pal.ember, alpha: 0.9 });
      g.circle(20, 7, 3).fill({ color: pal.ember, alpha: 0.9 });
      // Surface panel lines
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(Math.cos(a) * 30, Math.sin(a) * 12).lineTo(Math.cos(a) * 100, Math.sin(a) * 32).stroke({ color: pal.dark, width: 0.8, alpha: 0.6 });
      }
      floatingChunks(g, r, 12, 140, { x: -110, y: -38, w: 220, h: 76 }, pal);
      break;
    }
    case 14: {
      // Antenna relay / communication array — twisted dishes and beams.
      // Central spine
      g.rect(-6, -90, 12, 180).fill(pal.hull);
      g.rect(-6, -90, 12, 180).stroke({ color: pal.dark, width: 1.5 });
      g.rect(-4, -90, 4, 180).fill(pal.light);
      // Big dish at top (twisted)
      g.ellipse(0, -90, 36, 12).fill(pal.dark);
      g.ellipse(0, -90, 32, 10).fill(pal.hull);
      g.ellipse(0, -90, 28, 8).fill(pal.light);
      g.circle(0, -90, 4).fill(pal.window);
      // Side dishes (cracked)
      for (let i = 0; i < 4; i++) {
        const y = -40 + i * 40;
        const side = i % 2 === 0 ? -1 : 1;
        g.rect(side * 6, y - 2, side * 22, 4).fill(pal.dark);
        g.circle(side * 28, y, 9).fill(pal.dark);
        g.circle(side * 28, y, 7).fill(pal.hull);
        g.circle(side * 28, y, 4).fill({ color: pal.window, alpha: i === 1 ? 0.4 : 0.85 });
        if (i === 1) {
          // Cracked dish
          g.moveTo(side * 20, y - 6).lineTo(side * 36, y + 6).stroke({ color: 0x000000, width: 1.5 });
        }
      }
      // Tangled antenna stubs at bottom
      for (let i = 0; i < 6; i++) {
        const a = -0.5 + i * 0.2;
        const x = Math.cos(a) * 18;
        const y = 90 + Math.sin(a) * 16;
        g.moveTo(0, 84).lineTo(x, y).stroke({ color: pal.dark, width: 1.4 });
        g.circle(x, y, 1.4).fill(pal.window);
      }
      // Damage marks
      damageGashes(g, r, { minX: -10, maxX: 10, minY: -60, maxY: 60 }, 3, pal);
      floatingChunks(g, r, 14, 100, { x: -40, y: -100, w: 80, h: 200 }, pal);
      break;
    }
    case 15: {
      // Boomerang / V-shape fragment — alien chevron piece.
      const pts = [0, -50, 90, 20, 60, 50, 0, 0, -60, 50, -90, 20];
      g.poly(pts.map((vv, i) => i % 2 === 0 ? vv + 3 : vv + 4)).fill({ color: 0x000000, alpha: 0.4 });
      g.poly(pts).fill(pal.hull);
      g.poly(pts).stroke({ color: pal.dark, width: 2 });
      g.poly([0, -42, 80, 18, 50, 40, 0, 8, -50, 40, -80, 18]).fill({ color: pal.light, alpha: 0.55 });
      // Glowing wing-tip emitters
      for (const wx of [-78, 78]) {
        g.circle(wx, 22, 6).fill(pal.dark);
        g.circle(wx, 22, 4).fill({ color: pal.ember, alpha: 0.9 });
        g.circle(wx, 22, 2).fill(0xffffff);
      }
      // Central crystal core (alien)
      g.poly([0, -28, 12, -10, 0, 8, -12, -10]).fill({ color: pal.ember, alpha: 0.9 });
      g.poly([0, -28, 12, -10, 0, 8, -12, -10]).stroke({ color: 0xffffff, width: 1.2 });
      g.poly([0, -22, 6, -10, 0, 2, -6, -10]).fill(0xffffff);
      // Etched runes along the wings
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (20 + i * 8);
        const y = -10 + Math.abs(i * 6);
        g.poly([x, y - 3, x + 3, y, x, y + 3, x - 3, y]).stroke({ color: pal.window, width: 1, alpha: 0.85 });
      }
      // Cracks
      g.moveTo(-30, 20).lineTo(20, -10).stroke({ color: 0x000000, width: 1.6 });
      g.moveTo(-30, 20).lineTo(20, -10).stroke({ color: pal.ember, width: 0.6, alpha: 0.8 });
      floatingChunks(g, r, 12, 120, { x: -90, y: -55, w: 180, h: 110 }, pal);
      break;
    }
  }
  root.addChild(g);
}

// Floating debris cluster — 12 distinct compositions.
export function drawDebrisCluster(root: Container, seed: number, variant?: number): void {
  const r = mulberry32(seed);
  const v = variant ?? (seed % 12);
  const g = new Graphics();

  // Helper: rotated rectangle plate
  function panel(cx: number, cy: number, w: number, h: number, fill: number, edge: number, rot: number): void {
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const pts = [-w / 2, -h / 2, w / 2, -h / 2, w / 2, h / 2, -w / 2, h / 2];
    const rotated: number[] = [];
    for (let k = 0; k < pts.length; k += 2) {
      rotated.push(cx + pts[k] * cos - pts[k + 1] * sin, cy + pts[k] * sin + pts[k + 1] * cos);
    }
    g.poly(rotated).fill(fill);
    g.poly(rotated).stroke({ color: edge, width: 0.8 });
  }

  switch (v) {
    case 0: {
      // Mixed small panels (original)
      for (let i = 0; i < 28; i++) {
        const x = (r() - 0.5) * 130;
        const y = (r() - 0.5) * 80;
        const w = 4 + r() * 10, h = 3 + r() * 6;
        panel(x, y, w, h, 0x3a3a44, 0x1a1a22, r() * Math.PI);
        if (r() < 0.3) g.circle(x, y, 1.2).fill(0xff7733);
      }
      break;
    }
    case 1: {
      // Large hull plates (4-6 big pieces with rivets)
      for (let i = 0; i < 5; i++) {
        const x = (r() - 0.5) * 110;
        const y = (r() - 0.5) * 70;
        const w = 22 + r() * 18, h = 14 + r() * 14;
        const rot = (r() - 0.5) * Math.PI;
        panel(x, y, w, h, 0x4a3a28, 0x10080a, rot);
        // Highlight on plate
        panel(x - 2, y - 3, w * 0.6, h * 0.25, 0x8a6a40, 0x10080a, rot);
        // Rivets on edge
        const cos = Math.cos(rot), sin = Math.sin(rot);
        for (let k = 0; k < 4; k++) {
          const t = -w / 2 + 4 + (k * (w - 8)) / 3;
          const rx = x + t * cos - (-h / 2 + 2) * sin;
          const ry = y + t * sin + (-h / 2 + 2) * cos;
          g.circle(rx, ry, 0.8).fill(0x000000);
        }
      }
      break;
    }
    case 2: {
      // Long girders / structural beams
      for (let i = 0; i < 9; i++) {
        const x = (r() - 0.5) * 140;
        const y = (r() - 0.5) * 90;
        const len = 18 + r() * 30;
        const rot = r() * Math.PI;
        const dx = Math.cos(rot) * len;
        const dy = Math.sin(rot) * len;
        g.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ color: 0x10080a, width: 5 });
        g.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ color: 0x4a3a28, width: 2.5 });
        g.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ color: 0x8a6a40, width: 0.8 });
        // End cap rivets
        g.circle(x - dx, y - dy, 1.4).fill(0x10080a);
        g.circle(x + dx, y + dy, 1.4).fill(0x10080a);
      }
      break;
    }
    case 3: {
      // Detached engine nozzles
      for (let i = 0; i < 4; i++) {
        const x = -60 + r() * 120;
        const y = -40 + r() * 80;
        const rad = 6 + r() * 6;
        // Outer dark
        g.circle(x, y, rad + 1).fill(0x000000);
        g.circle(x, y, rad).fill(0x3a2a18);
        g.circle(x, y, rad).stroke({ color: 0x6a4a30, width: 1 });
        // Inner cone (dead)
        g.circle(x, y, rad * 0.7).fill(0x1a0a05);
        g.circle(x, y, rad * 0.4).fill({ color: 0xff7733, alpha: 0.6 });
        // Mounting collar
        g.rect(x - rad, y + rad, rad * 2, 4).fill(0x10080a);
        g.rect(x - rad + 1, y + rad + 1, rad * 2 - 2, 2).fill(0x4a3a28);
      }
      // Some scrap
      for (let i = 0; i < 8; i++) {
        panel((r() - 0.5) * 120, (r() - 0.5) * 80, 4 + r() * 6, 3 + r() * 4, 0x3a3a44, 0x1a1a22, r() * Math.PI);
      }
      break;
    }
    case 4: {
      // Cockpit canopy + control surfaces
      // Big broken canopy
      g.ellipse(-10, 0, 30, 18).fill(0x1a1a26);
      g.ellipse(-10, 0, 30, 18).stroke({ color: 0x10080a, width: 1.5 });
      g.ellipse(-10, -3, 24, 12).fill({ color: 0x6cdfff, alpha: 0.75 });
      g.ellipse(-14, -6, 16, 6).fill({ color: 0xffffff, alpha: 0.5 });
      // Crack across canopy
      g.moveTo(-30, -8).lineTo(10, 4).stroke({ color: 0x000000, width: 1.4 });
      // Detached control panel
      panel(36, -10, 26, 14, 0x3a2a18, 0x10080a, 0.4);
      for (let k = 0; k < 4; k++) g.circle(28 + k * 4, -12, 1.4).fill(0xfff066);
      // Pilot seat
      panel(20, 18, 18, 20, 0x4a3a28, 0x10080a, -0.3);
      panel(20, 14, 14, 6, 0x6a4a30, 0x10080a, -0.3);
      // Scattered panels
      for (let i = 0; i < 6; i++) {
        panel((r() - 0.5) * 130, (r() - 0.5) * 80, 4 + r() * 8, 3 + r() * 5, 0x3a3a44, 0x1a1a22, r() * Math.PI);
      }
      break;
    }
    case 5: {
      // Wing fragments
      for (let i = 0; i < 3; i++) {
        const x = (r() - 0.5) * 90;
        const y = (r() - 0.5) * 60;
        const rot = (r() - 0.5) * Math.PI;
        const cos = Math.cos(rot), sin = Math.sin(rot);
        const pts = [-26, -4, 26, -10, 32, 0, 18, 8, -22, 6];
        const rotated: number[] = [];
        for (let k = 0; k < pts.length; k += 2) {
          rotated.push(x + pts[k] * cos - pts[k + 1] * sin, y + pts[k] * sin + pts[k + 1] * cos);
        }
        g.poly(rotated).fill(0x3a2a18);
        g.poly(rotated).stroke({ color: 0x10080a, width: 1.2 });
        // Wing-tip light still on
        const tx = x + 28 * cos - (-4) * sin;
        const ty = y + 28 * sin + (-4) * cos;
        g.circle(tx, ty, 1.4).fill(0xff5544);
      }
      for (let i = 0; i < 8; i++) {
        panel((r() - 0.5) * 130, (r() - 0.5) * 80, 4 + r() * 5, 3 + r() * 4, 0x3a3a44, 0x1a1a22, r() * Math.PI);
      }
      break;
    }
    case 6: {
      // Antenna / dish array fragments
      for (let i = 0; i < 4; i++) {
        const x = (r() - 0.5) * 110;
        const y = (r() - 0.5) * 70;
        const rot = r() * Math.PI;
        // Dish
        const cos = Math.cos(rot), sin = Math.sin(rot);
        g.ellipse(x, y, 10, 4).fill(0x1a1a26);
        g.ellipse(x, y, 8, 3).fill(0x4a4a55);
        g.ellipse(x, y, 5, 2).fill({ color: 0xc4d4e4, alpha: 0.8 });
        // Mast
        const ex = x + sin * 14, ey = y - cos * 14;
        g.moveTo(x, y).lineTo(ex, ey).stroke({ color: 0x3a3a44, width: 1.4 });
        // Junction (broken)
        g.circle(ex, ey, 2.5).fill(0x10080a);
      }
      // Wire bundles
      for (let i = 0; i < 6; i++) {
        const sx = (r() - 0.5) * 120;
        const sy = (r() - 0.5) * 80;
        g.moveTo(sx, sy).bezierCurveTo(sx + 6, sy + 4, sx + 14, sy - 6, sx + 22, sy + 8).stroke({ color: 0x10080a, width: 1.2 });
      }
      break;
    }
    case 7: {
      // Cargo containers (crates)
      for (let i = 0; i < 5; i++) {
        const x = (r() - 0.5) * 120;
        const y = (r() - 0.5) * 70;
        const w = 18 + r() * 8, h = 14 + r() * 6;
        const rot = (r() - 0.5) * 0.8;
        panel(x, y, w, h, 0x6a4a28, 0x10080a, rot);
        const cos = Math.cos(rot), sin = Math.sin(rot);
        // Hazard chevron
        for (let k = 0; k < 3; k++) {
          const cx = x + (-w / 2 + 4 + k * 6) * cos;
          const cy = y + (-w / 2 + 4 + k * 6) * sin;
          g.circle(cx, cy, 1.4).fill(0xfff066);
        }
        // Container number stencil
        g.rect(x - 4, y - 1, 8, 3).fill({ color: 0xc4c4cc, alpha: 0.7 });
      }
      // Small loose chunks
      for (let i = 0; i < 6; i++) {
        panel((r() - 0.5) * 130, (r() - 0.5) * 80, 4 + r() * 6, 3 + r() * 4, 0x4a3a28, 0x10080a, r() * Math.PI);
      }
      break;
    }
    case 8: {
      // Armor tile shards
      for (let i = 0; i < 22; i++) {
        const x = (r() - 0.5) * 140;
        const y = (r() - 0.5) * 90;
        const rot = r() * Math.PI;
        const cos = Math.cos(rot), sin = Math.sin(rot);
        // Hex shard
        const pts: number[] = [];
        const sz = 3 + r() * 6;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          pts.push(x + Math.cos(a) * sz * cos - Math.sin(a) * sz * sin, y + Math.cos(a) * sz * sin + Math.sin(a) * sz * cos);
        }
        g.poly(pts).fill(0x4a4a55);
        g.poly(pts).stroke({ color: 0x10080a, width: 0.7 });
      }
      break;
    }
    case 9: {
      // Twisted wire bundles (lots of bezier squiggles)
      for (let i = 0; i < 12; i++) {
        const sx = (r() - 0.5) * 130;
        const sy = (r() - 0.5) * 80;
        const ex = sx + (r() - 0.5) * 40;
        const ey = sy + (r() - 0.5) * 40;
        const cx1 = (sx + ex) / 2 + (r() - 0.5) * 30;
        const cy1 = (sy + ey) / 2 + (r() - 0.5) * 30;
        const cx2 = (sx + ex) / 2 + (r() - 0.5) * 30;
        const cy2 = (sy + ey) / 2 + (r() - 0.5) * 30;
        const cols = [0xff5544, 0x6cdfff, 0xfff066, 0x4a3a28];
        const col = cols[Math.floor(r() * cols.length)];
        g.moveTo(sx, sy).bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey).stroke({ color: 0x10080a, width: 2 });
        g.moveTo(sx, sy).bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey).stroke({ color: col, width: 0.8 });
        g.circle(sx, sy, 1).fill(0x10080a);
        g.circle(ex, ey, 1).fill(0x10080a);
      }
      break;
    }
    case 10: {
      // Mining mixed debris — rocks + metal
      for (let i = 0; i < 14; i++) {
        const x = (r() - 0.5) * 130;
        const y = (r() - 0.5) * 80;
        if (r() < 0.5) {
          // Rock chunk
          const sz = 4 + r() * 8;
          const pts: number[] = [];
          const N = 8;
          for (let k = 0; k < N; k++) {
            const a = (k / N) * Math.PI * 2;
            const rr = sz * (0.7 + r() * 0.5);
            pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          g.poly(pts).fill(0x4a3a30);
          g.poly(pts).stroke({ color: 0x2a1a10, width: 0.7 });
          // Mineral vein
          if (r() < 0.5) {
            g.circle(x - sz * 0.2, y - sz * 0.2, sz * 0.25).fill({ color: 0xffaa44, alpha: 0.8 });
          }
        } else {
          // Metal chunk
          panel(x, y, 5 + r() * 6, 4 + r() * 5, 0x4a4a55, 0x1a1a22, r() * Math.PI);
        }
      }
      break;
    }
    case 11: {
      // Burning alien crystals
      for (let i = 0; i < 10; i++) {
        const x = (r() - 0.5) * 120;
        const y = (r() - 0.5) * 70;
        const sz = 4 + r() * 8;
        const rot = r() * Math.PI;
        const cos = Math.cos(rot), sin = Math.sin(rot);
        // Crystal shape
        const pts = [0, -sz, sz * 0.7, 0, 0, sz, -sz * 0.7, 0];
        const rotated: number[] = [];
        for (let k = 0; k < pts.length; k += 2) {
          rotated.push(x + pts[k] * cos - pts[k + 1] * sin, y + pts[k] * sin + pts[k + 1] * cos);
        }
        const cols = [0xc466ff, 0x66c4ff, 0xff66c4, 0x99ff66];
        const col = cols[Math.floor(r() * cols.length)];
        g.poly(rotated).fill({ color: col, alpha: 0.9 });
        g.poly(rotated).stroke({ color: 0xffffff, width: 1, alpha: 0.85 });
        // Center white shine
        g.circle(x, y, sz * 0.3).fill(0xffffff);
        // Glow halo
        g.circle(x, y, sz * 1.4).fill({ color: col, alpha: 0.15 });
      }
      break;
    }
  }
  root.addChild(g);
}

// Ruined base — burnt-out larger station fragment with collapsed sections.
export function drawRuinedBase(root: Container, seed: number): void {
  const r = mulberry32(seed);
  const g = new Graphics();
  // Main collapsed hub
  const ringR = 60;
  g.circle(0, 0, ringR).fill(0x1a1410);
  g.circle(0, 0, ringR).stroke({ color: 0x4a3a30, width: 3 });
  g.circle(0, 0, ringR - 10).fill(0x0a0805);
  // Caved-in hole on top
  g.poly([-22, -ringR, 22, -ringR, 16, -ringR + 18, -16, -ringR + 18]).fill(0x000000);
  g.poly([-22, -ringR, 22, -ringR, 16, -ringR + 18, -16, -ringR + 18]).stroke({ color: 0x4a3a30, width: 2 });
  // Embers in the caved area
  g.circle(0, -ringR + 8, 4).fill({ color: 0xff7733, alpha: 0.85 });
  g.circle(-8, -ringR + 14, 2).fill({ color: 0xfff066, alpha: 0.9 });
  g.circle(10, -ringR + 12, 2.5).fill({ color: 0xfff066, alpha: 0.9 });
  // Broken arms (some missing, some bent)
  const armCount = 4;
  for (let i = 0; i < armCount; i++) {
    const a = (i / armCount) * Math.PI * 2 + Math.PI / 4 + 0.1;
    const len = 70 + r() * 30;
    const bent = r() < 0.5;
    const x1 = Math.cos(a) * ringR;
    const y1 = Math.sin(a) * ringR;
    let x2 = Math.cos(a) * (ringR + len);
    let y2 = Math.sin(a) * (ringR + len);
    if (bent) {
      // Bent at a sharp angle
      const midA = a + 0.4 * (r() - 0.5);
      const midD = ringR + len * 0.55;
      const mx = Math.cos(midA) * midD;
      const my = Math.sin(midA) * midD;
      g.moveTo(x1, y1).lineTo(mx, my).stroke({ color: 0x10080a, width: 6 });
      g.moveTo(x1, y1).lineTo(mx, my).stroke({ color: 0x4a3a30, width: 2 });
      g.moveTo(mx, my).lineTo(x2, y2).stroke({ color: 0x10080a, width: 5 });
      g.moveTo(mx, my).lineTo(x2, y2).stroke({ color: 0x4a3a30, width: 1.5 });
      g.circle(mx, my, 4).fill(0x2a1d12);
      g.circle(x2, y2, 8).fill(0x1a1410);
      g.circle(x2, y2, 8).stroke({ color: 0x4a3a30, width: 1.5 });
    } else {
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x10080a, width: 6 });
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x4a3a30, width: 2 });
      // Snapped end (no module)
      g.poly([x2 - 4, y2 - 4, x2 + 4, y2 - 2, x2 + 2, y2 + 4, x2 - 4, y2 + 4]).fill(0x000000);
      g.circle(x2, y2, 2).fill({ color: 0xff7733, alpha: 0.7 });
    }
  }
  // Scorched patches on the hub
  for (let i = 0; i < 8; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * ringR * 0.85;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    g.circle(x, y, 6 + r() * 6).fill({ color: 0x000000, alpha: 0.8 });
    g.circle(x, y, 3 + r() * 3).fill({ color: 0x4a1a10, alpha: 0.75 });
    if (r() < 0.4) g.circle(x, y, 1.2).fill(0xff7733);
  }
  // Few survival lights still blinking
  g.circle(-ringR + 10, 4, 1.4).fill(0xff4040);
  g.circle(ringR - 10, -4, 1.4).fill(0xffd166);
  root.addChild(g);
}

// Soft particle texture (used by particle system).
export function drawParticleSoft(root: Container, color: number): void {
  for (let i = 6; i >= 1; i--) {
    const g = new Graphics();
    const t = i / 6;
    g.circle(0, 0, 8 * t).fill({ color, alpha: (1 - t) * 0.5 + 0.05 });
    root.addChild(g);
  }
}

export function drawParticleHard(root: Container, color: number): void {
  const g = new Graphics();
  g.rect(-1.5, -1.5, 3, 3).fill(color);
  root.addChild(g);
}

// Explosion ring (single keyframe).
export function drawExplosionRing(root: Container, color: number, R: number): void {
  const g = new Graphics();
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    g.circle(0, 0, R * (0.6 + 0.4 * t)).stroke({ color, width: 6 * (1 - t), alpha: (1 - t) * 0.7 });
  }
  g.circle(0, 0, R * 0.5).fill({ color, alpha: 0.7 });
  g.circle(0, 0, R * 0.25).fill(0xffffff);
  root.addChild(g);
}
