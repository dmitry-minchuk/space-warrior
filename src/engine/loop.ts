import { Application } from 'pixi.js';
import { MAX_SUBSTEP } from './constants';
import { Input } from './input';

export interface LoopHandlers {
  update(dt: number): void;
}

export function startLoop(app: Application, handlers: LoopHandlers): void {
  let prev = performance.now();
  app.ticker.add(() => {
    Input.pollGamepads();
    const now = performance.now();
    // Variable timestep: simulation advances exactly as far as the display
    // did. A fixed 60 Hz step bunches (0 steps one frame, 2 the next) when
    // frame pacing jitters — visible judder on TV boxes even at "60 FPS".
    // Sub-steps cap dt at 25 ms so fast projectiles cannot tunnel through
    // hitboxes on slow frames; total is clamped at 100 ms (tab switches).
    let dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    while (dt > 1e-9) {
      const step = Math.min(dt, MAX_SUBSTEP);
      handlers.update(step);
      dt -= step;
    }
  });
}
