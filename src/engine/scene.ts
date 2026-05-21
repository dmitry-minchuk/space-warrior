import { Container } from 'pixi.js';

export abstract class Scene {
  readonly stage = new Container();
  protected manager!: SceneManager;
  attach(manager: SceneManager): void {
    this.manager = manager;
  }
  abstract enter(payload?: unknown): void;
  abstract exit(): void;
  abstract update(dt: number): void;
}

export class SceneManager {
  private current: Scene | null = null;
  private next: { scene: Scene; payload?: unknown } | null = null;
  constructor(public readonly root: Container) {}

  switchTo(scene: Scene, payload?: unknown): void {
    this.next = { scene, payload };
  }

  update(dt: number): void {
    if (this.next) {
      if (this.current) {
        this.current.exit();
        this.root.removeChild(this.current.stage);
      }
      const { scene, payload } = this.next;
      this.next = null;
      scene.attach(this);
      this.root.addChild(scene.stage);
      scene.enter(payload);
      this.current = scene;
    }
    if (this.current) this.current.update(dt);
  }
}
