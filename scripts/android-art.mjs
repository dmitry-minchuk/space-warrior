// Generates Android launcher icons and the TV banner as PNGs.
// No dependencies: pixels are drawn into an RGBA buffer and encoded
// as a PNG by hand (zlib deflate + CRC32). Rerun after art tweaks:
//   node scripts/android-art.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

// ---------- PNG encoding ----------

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4);
  }

  set(x, y, [r, g, b, a = 255]) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = r;
    this.px[i + 1] = g;
    this.px[i + 2] = b;
    this.px[i + 3] = a;
  }

  rect(x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  fill(c) {
    this.rect(0, 0, this.w, this.h, c);
  }

  /** Vertical gradient between two colors across the full canvas. */
  gradient(top, bottom) {
    for (let y = 0; y < this.h; y++) {
      const t = y / (this.h - 1);
      const c = top.map((v, i) => Math.round(v + (bottom[i] - v) * t));
      for (let x = 0; x < this.w; x++) this.set(x, y, c);
    }
  }

  triangle(x1, y1, x2, y2, x3, y3, c) {
    const minX = Math.floor(Math.min(x1, x2, x3));
    const maxX = Math.ceil(Math.max(x1, x2, x3));
    const minY = Math.floor(Math.min(y1, y2, y3));
    const maxY = Math.ceil(Math.max(y1, y2, y3));
    const area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w1 = ((x2 - x) * (y3 - y) - (x3 - x) * (y2 - y)) / area;
        const w2 = ((x3 - x) * (y1 - y) - (x1 - x) * (y3 - y)) / area;
        const w3 = 1 - w1 - w2;
        if (w1 >= 0 && w2 >= 0 && w3 >= 0) this.set(x, y, c);
      }
    }
  }

  save(path) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, encodePng(this.w, this.h, this.px));
    console.log('wrote', path);
  }
}

// Deterministic pseudo-random for reproducible starfields.
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

const NAVY_TOP = [8, 12, 34];
const NAVY_BOTTOM = [16, 26, 66];
const HULL = [216, 227, 255];
const HULL_DARK = [122, 143, 196];
const COCKPIT = [108, 204, 255];
const FLAME_OUT = [255, 140, 40];
const FLAME_IN = [255, 224, 120];
const TITLE = [255, 245, 163];

function stars(c, count, seed) {
  const rnd = lcg(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * c.w;
    const y = rnd() * c.h;
    const bright = 120 + Math.floor(rnd() * 135);
    c.set(x, y, [bright, bright, Math.min(255, bright + 30)]);
    if (rnd() > 0.8) c.set(x + 1, y, [bright >> 1, bright >> 1, bright >> 1]);
  }
}

/** Player-ship glyph pointing up, centered at (cx, cy), height h. */
function ship(c, cx, cy, h) {
  const half = h / 2;
  const wing = h * 0.42;
  // Flame first so the hull overlaps its root.
  c.triangle(cx - h * 0.1, cy + half * 0.72, cx + h * 0.1, cy + half * 0.72, cx, cy + half * 1.25, FLAME_OUT);
  c.triangle(cx - h * 0.05, cy + half * 0.72, cx + h * 0.05, cy + half * 0.72, cx, cy + half * 1.02, FLAME_IN);
  // Wings.
  c.triangle(cx - wing, cy + half * 0.65, cx - h * 0.08, cy - half * 0.05, cx - h * 0.08, cy + half * 0.6, HULL_DARK);
  c.triangle(cx + wing, cy + half * 0.65, cx + h * 0.08, cy - half * 0.05, cx + h * 0.08, cy + half * 0.6, HULL_DARK);
  // Fuselage.
  c.triangle(cx, cy - half, cx - h * 0.16, cy + half * 0.7, cx + h * 0.16, cy + half * 0.7, HULL);
  // Cockpit.
  c.triangle(cx, cy - half * 0.55, cx - h * 0.06, cy + half * 0.05, cx + h * 0.06, cy + half * 0.05, COCKPIT);
}

// 5x7 pixel font for the banner title (only the glyphs we need).
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
};

function text(c, str, cx, y, scale, color) {
  const width = str.length * 6 * scale - scale;
  let x = Math.round(cx - width / 2);
  for (const ch of str) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (glyph[gy][gx] === '1') c.rect(x + gx * scale, y + gy * scale, scale, scale, color);
        }
      }
    }
    x += 6 * scale;
  }
}

// ---------- launcher icons ----------

const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(DENSITIES)) {
  const c = new Canvas(size, size);
  c.gradient(NAVY_TOP, NAVY_BOTTOM);
  stars(c, Math.max(12, (size * size) / 400), 7);
  ship(c, size / 2, size * 0.47, size * 0.62);
  c.save(join(RES, `mipmap-${density}`, 'ic_launcher.png'));
}

// ---------- Android TV banner (320x180 at xhdpi) ----------

const banner = new Canvas(320, 180);
banner.gradient(NAVY_TOP, NAVY_BOTTOM);
stars(banner, 90, 11);
ship(banner, 52, 88, 96);
text(banner, 'SPACE', 200, 52, 5, TITLE);
text(banner, 'WARRIOR', 200, 98, 5, TITLE);
banner.save(join(RES, 'drawable-xhdpi', 'banner.png'));
