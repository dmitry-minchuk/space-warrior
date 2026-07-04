import { Container, Text, TextStyle } from 'pixi.js';

export interface FloatingTextOpts {
  text: string;
  color?: number;
  size?: number;
  bold?: boolean;
}

const styleCache = new Map<string, TextStyle>();
function styleFor(color: number, size: number, bold: boolean): TextStyle {
  const k = `${color}-${size}-${bold}`;
  let s = styleCache.get(k);
  if (!s) {
    // No dropShadow: its blur pass is the most expensive part of rasterizing
    // a Text on CPU, and pickups spawn these in bursts. The stroke alone
    // keeps popups readable over combat.
    s = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: size,
      fontWeight: bold ? 'bold' : 'normal',
      fill: color,
      stroke: { color: 0x000000, width: 3 },
    });
    styleCache.set(k, s);
  }
  return s;
}

export class FloatingText {
  alive = true;
  age = 0;
  life = 1.2;
  x = 0;
  y = 0;
  vy = -50;
  text: Text;
  private layer: Container | null = null;

  constructor(opts: FloatingTextOpts) {
    const style = styleFor(opts.color ?? 0xffffff, opts.size ?? 20, opts.bold ?? true);
    this.text = new Text({ text: opts.text, style });
    this.text.anchor.set(0.5);
  }

  /** Re-target a pooled instance. Style/text setters no-op when unchanged,
   *  so recurring popups ("+100", "+15 HP") skip re-rasterization entirely. */
  configure(opts: FloatingTextOpts): void {
    const style = styleFor(opts.color ?? 0xffffff, opts.size ?? 20, opts.bold ?? true);
    if (this.text.style !== style) this.text.style = style;
    if (this.text.text !== opts.text) this.text.text = opts.text;
  }

  spawn(x: number, y: number, layer: Container): void {
    this.x = x;
    this.y = y;
    this.vy = -50;
    this.text.position.set(x, y);
    this.text.alpha = 1;
    layer.addChild(this.text);
    this.layer = layer;
    this.alive = true;
    this.age = 0;
  }

  update(dt: number): void {
    this.age += dt;
    if (this.age >= this.life) {
      this.alive = false;
      this.detach();
      return;
    }
    const t = this.age / this.life;
    this.y += this.vy * dt;
    this.vy *= Math.exp(-2 * dt);
    this.text.position.set(this.x, this.y);
    if (t < 0.15) this.text.alpha = t / 0.15;
    else if (t > 0.65) this.text.alpha = Math.max(0, 1 - (t - 0.65) / 0.35);
    else this.text.alpha = 1;
  }

  detach(): void {
    if (this.layer) this.layer.removeChild(this.text);
    this.layer = null;
  }
}

/** Pool: popups used to allocate a fresh Text (CPU canvas raster) per pickup
 *  and never destroy it — a burst of drops meant a burst of rasterizations
 *  plus a slow texture leak. Pooled instances reuse their canvas. */
export class FloatingTextPool {
  private free: FloatingText[] = [];

  spawn(opts: FloatingTextOpts, x: number, y: number, layer: Container): FloatingText {
    let ft = this.free.pop();
    if (!ft) ft = new FloatingText(opts);
    ft.configure(opts);
    ft.spawn(x, y, layer);
    return ft;
  }

  release(ft: FloatingText): void {
    ft.alive = false;
    ft.detach();
    this.free.push(ft);
  }
}
