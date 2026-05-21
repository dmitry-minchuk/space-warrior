import { Container } from 'pixi.js';
import { createViewport } from './engine/viewport';
import { Input } from './engine/input';
import { SceneManager } from './engine/scene';
import { startLoop } from './engine/loop';
import { Sfx, unlockAudio } from './engine/audio';
import { buildAtlas } from './game/art/atlas';
import { MenuScene } from './game/scenes/MenuScene';

async function main(): Promise<void> {
  const mount = document.getElementById('app')!;
  const loading = document.getElementById('loading');

  const viewport = await createViewport(mount);

  // Build texture atlas — this is the heavy boot step.
  if (loading) loading.textContent = 'BAKING TEXTURES…';
  await new Promise((r) => setTimeout(r, 16)); // let UI paint
  const atlas = buildAtlas(viewport.app);

  Input.init();

  const root = new Container();
  viewport.app.stage.addChild(root);
  const manager = new SceneManager(root);

  // Unlock audio on first user gesture (browsers require it).
  const unlock = (): void => {
    unlockAudio();
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);

  manager.switchTo(new MenuScene(atlas, Sfx));

  startLoop(viewport.app, {
    update(dt) {
      manager.update(dt);
    },
  });

  if (loading) loading.classList.add('hidden');
}

main().catch((err) => {
  console.error('Boot failed', err);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.textContent = 'BOOT FAILED — SEE CONSOLE';
    loading.style.color = '#f55';
  }
});
