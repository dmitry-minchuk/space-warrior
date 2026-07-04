import {
  Application,
  BlurFilter,
  Container,
  Graphics,
  RenderTexture,
  Texture,
} from 'pixi.js';
import { ANTIALIAS, BAKE_RESOLUTION } from '../../engine/quality';

/**
 * Texture forge: bakes procedural graphics into RenderTextures once at boot,
 * so the rest of the game can use cheap sprites.
 */
export class Forge {
  constructor(private readonly app: Application) {}

  /** Bake a container drawn by `draw` into a transparent texture of given size. */
  bake(
    width: number,
    height: number,
    draw: (root: Container) => void,
    resolution = BAKE_RESOLUTION,
  ): Texture {
    const root = new Container();
    draw(root);
    const rt = RenderTexture.create({ width, height, resolution, antialias: ANTIALIAS });
    this.app.renderer.render({ container: root, target: rt, clear: true });
    root.destroy({ children: true });
    return rt;
  }

  /** Bake a centred figure: coordinates are local with (0,0) at the centre. */
  bakeCentered(
    width: number,
    height: number,
    draw: (root: Container) => void,
    resolution = 2,
  ): Texture {
    return this.bake(
      width,
      height,
      (root) => {
        const inner = new Container();
        inner.position.set(width / 2, height / 2);
        root.addChild(inner);
        draw(inner);
      },
      resolution,
    );
  }
}

/** Append a blurred copy of a Graphics child as a "glow" layer underneath. */
export function withGlow(target: Container, draw: (g: Graphics) => void, blur = 6, alpha = 0.7): void {
  const glow = new Graphics();
  draw(glow);
  glow.filters = [new BlurFilter({ strength: blur, quality: 4 })];
  glow.alpha = alpha;
  target.addChild(glow);
  const sharp = new Graphics();
  draw(sharp);
  target.addChild(sharp);
}

/**
 * Helper to draw a soft circular glow (no need for filters — uses many
 * concentric translucent circles).
 */
export function softGlow(
  target: Container,
  cx: number,
  cy: number,
  radius: number,
  color: number,
  steps = 6,
): void {
  const g = new Graphics();
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const r = radius * t;
    const a = (1 - t) * 0.55 + 0.05;
    g.circle(cx, cy, r).fill({ color, alpha: a });
  }
  target.addChild(g);
}
