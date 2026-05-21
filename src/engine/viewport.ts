import { Application } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';

export interface Viewport {
  app: Application;
  resize(): void;
}

export async function createViewport(mount: HTMLElement): Promise<Viewport> {
  const app = new Application();
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: 0x000005,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: 'webgl',
    powerPreference: 'high-performance',
  });

  mount.appendChild(app.canvas);
  app.canvas.style.imageRendering = 'auto';
  app.canvas.style.transformOrigin = 'top left';

  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = GAME_WIDTH / GAME_HEIGHT;
    let cw = w;
    let ch = w / aspect;
    if (ch > h) {
      ch = h;
      cw = h * aspect;
    }
    app.canvas.style.width = `${cw}px`;
    app.canvas.style.height = `${ch}px`;
  }

  window.addEventListener('resize', resize);
  resize();

  return { app, resize };
}
