import { Application } from 'pixi.js';
import { FIXED_DT, MAX_STEPS_PER_FRAME } from './constants';

export interface LoopHandlers {
  update(dt: number): void;
}

export function startLoop(app: Application, handlers: LoopHandlers): void {
  let acc = 0;
  let prev = performance.now();
  app.ticker.add(() => {
    const now = performance.now();
    const frameMs = Math.min(100, now - prev);
    prev = now;
    acc += frameMs / 1000;
    let steps = 0;
    while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      handlers.update(FIXED_DT);
      acc -= FIXED_DT;
      steps += 1;
    }
    if (steps === MAX_STEPS_PER_FRAME) acc = 0;
  });
}
