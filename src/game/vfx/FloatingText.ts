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
    s = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: size,
      fontWeight: bold ? 'bold' : 'normal',
      fill: color,
      stroke: { color: 0x000000, width: 3 },
      dropShadow: { color: 0x000000, alpha: 0.5, blur: 4, distance: 0 },
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

  spawn(x: number, y: number, layer: Container): void {
    this.x = x;
    this.y = y;
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
