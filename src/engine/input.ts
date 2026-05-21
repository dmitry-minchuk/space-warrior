export type ActionName =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'fire'
  | 'bomb'
  | 'pause'
  | 'confirm'
  | 'cancel'
  | 'debug';

const KEY_MAP: Record<string, ActionName> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'fire',
  ShiftLeft: 'bomb',
  ShiftRight: 'bomb',
  KeyX: 'bomb',
  Escape: 'pause',
  KeyP: 'pause',
  Enter: 'confirm',
  Backspace: 'cancel',
  Backquote: 'debug',
};

const ALL_ACTIONS: ActionName[] = [
  'up',
  'down',
  'left',
  'right',
  'fire',
  'bomb',
  'pause',
  'confirm',
  'cancel',
  'debug',
];

class InputManager {
  private held = new Set<ActionName>();
  private pressedThisFrame = new Set<ActionName>();
  private releasedThisFrame = new Set<ActionName>();

  init(): void {
    window.addEventListener('keydown', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      if (action === 'pause' || action === 'fire' || action === 'bomb') e.preventDefault();
      if (!this.held.has(action)) {
        this.pressedThisFrame.add(action);
      }
      this.held.add(action);
    });
    window.addEventListener('keyup', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      if (this.held.has(action)) this.releasedThisFrame.add(action);
      this.held.delete(action);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
    });
  }

  isDown(action: ActionName): boolean {
    return this.held.has(action);
  }

  wasPressed(action: ActionName): boolean {
    return this.pressedThisFrame.has(action);
  }

  wasReleased(action: ActionName): boolean {
    return this.releasedThisFrame.has(action);
  }

  axisX(): number {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  axisY(): number {
    return (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  clearAll(): void {
    this.held.clear();
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  // Debug helpers
  get _all(): ActionName[] {
    return ALL_ACTIONS;
  }
}

export const Input = new InputManager();
