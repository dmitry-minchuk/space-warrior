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
  // TV remotes deliver the play/pause media key as a regular key event.
  MediaPlayPause: 'pause',
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

// W3C standard gamepad mapping: button index → game actions.
// A confirms in menus and fires in game; B cancels overlays and drops a bomb.
const PAD_BUTTON_ACTIONS: ReadonlyArray<ReadonlyArray<ActionName>> = [
  /* 0  A / Cross    */ ['fire', 'confirm'],
  /* 1  B / Circle   */ ['bomb', 'cancel'],
  /* 2  X / Square   */ ['bomb'],
  /* 3  Y / Triangle */ ['fire'],
  /* 4  LB           */ ['fire'],
  /* 5  RB           */ ['fire'],
  /* 6  LT           */ ['fire'],
  /* 7  RT           */ ['fire'],
  /* 8  Select       */ ['cancel'],
  /* 9  Start        */ ['pause'],
  /* 10 L3           */ [],
  /* 11 R3           */ [],
  /* 12 D-pad up     */ ['up'],
  /* 13 D-pad down   */ ['down'],
  /* 14 D-pad left   */ ['left'],
  /* 15 D-pad right  */ ['right'],
];

const STICK_DEAD_ZONE = 0.25;
// Beyond this the stick also acts as a digital D-pad (menu navigation).
const STICK_DIGITAL_THRESHOLD = 0.5;

/** Gamepad state pushed from a native wrapper (Android WebView has no
 *  Gamepad API, so the host Activity forwards pad input through this). */
interface ExternalPad {
  axisX: number;
  axisY: number;
  /** Bitmask over standard-mapping button indices (bit N = button N). */
  buttons: number;
}

/** Synchronous poll bridge injected by the Android wrapper: the page pulls
 *  pad state once per frame instead of the wrapper pushing every event. */
interface NativePadBridge {
  poll(): string; // "axisX,axisY,buttonsBitmask"
}

class InputManager {
  private held = new Set<ActionName>();
  private padHeld = new Set<ActionName>();
  private stickHeld = new Set<ActionName>();
  private pressedThisFrame = new Set<ActionName>();
  private releasedThisFrame = new Set<ActionName>();
  private padAxisXValue = 0;
  private padAxisYValue = 0;
  private externalPad: ExternalPad | null = null;
  private padSeen = false;
  private suppressPadEdges = false;
  /** Fired once on the first gamepad interaction (audio unlock hook). */
  onFirstPadInput: (() => void) | null = null;

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
    // Entry point for the Android wrapper's native gamepad bridge.
    (window as unknown as Record<string, unknown>).__spaceWarriorPad = (
      axisX: number,
      axisY: number,
      buttons: number,
    ): void => {
      this.externalPad = { axisX, axisY, buttons };
    };
  }

  /** Reads all connected gamepads plus the native bridge. Must run once per
   *  render frame, before the fixed-step updates. */
  pollGamepads(): void {
    const nextPad = new Set<ActionName>();
    let ax = 0;
    let ay = 0;

    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      for (let i = 0; i < PAD_BUTTON_ACTIONS.length && i < pad.buttons.length; i++) {
        if (!pad.buttons[i].pressed) continue;
        for (const action of PAD_BUTTON_ACTIONS[i]) nextPad.add(action);
      }
      if (pad.axes.length >= 2) {
        ax += this.applyDeadZone(pad.axes[0]);
        ay += this.applyDeadZone(pad.axes[1]);
      }
    }

    const bridge = (window as unknown as { __nativePadBridge?: NativePadBridge }).__nativePadBridge;
    if (bridge) {
      try {
        const parts = bridge.poll().split(',');
        const buttons = Number(parts[2]) | 0;
        for (let i = 0; i < PAD_BUTTON_ACTIONS.length; i++) {
          if ((buttons & (1 << i)) === 0) continue;
          for (const action of PAD_BUTTON_ACTIONS[i]) nextPad.add(action);
        }
        ax += this.applyDeadZone(Number(parts[0]) || 0);
        ay += this.applyDeadZone(Number(parts[1]) || 0);
      } catch {
        /* bridge died with the page context — ignore */
      }
    }

    const ext = this.externalPad;
    if (ext) {
      for (let i = 0; i < PAD_BUTTON_ACTIONS.length; i++) {
        if ((ext.buttons & (1 << i)) === 0) continue;
        for (const action of PAD_BUTTON_ACTIONS[i]) nextPad.add(action);
      }
      ax += this.applyDeadZone(ext.axisX);
      ay += this.applyDeadZone(ext.axisY);
    }

    this.padAxisXValue = Math.max(-1, Math.min(1, ax));
    this.padAxisYValue = Math.max(-1, Math.min(1, ay));

    const nextStick = new Set<ActionName>();
    if (this.padAxisXValue <= -STICK_DIGITAL_THRESHOLD) nextStick.add('left');
    if (this.padAxisXValue >= STICK_DIGITAL_THRESHOLD) nextStick.add('right');
    if (this.padAxisYValue <= -STICK_DIGITAL_THRESHOLD) nextStick.add('up');
    if (this.padAxisYValue >= STICK_DIGITAL_THRESHOLD) nextStick.add('down');

    if (this.suppressPadEdges) {
      // A scene transition just cleared input: adopt the current physical
      // state silently so a button held across the transition does not
      // re-trigger (e.g. instantly confirming through a fresh menu).
      this.suppressPadEdges = false;
    } else {
      this.diffEdges(this.padHeld, nextPad);
      this.diffEdges(this.stickHeld, nextStick);
    }
    this.padHeld = nextPad;
    this.stickHeld = nextStick;

    if (!this.padSeen && (nextPad.size > 0 || nextStick.size > 0)) {
      this.padSeen = true;
      if (this.onFirstPadInput) this.onFirstPadInput();
    }
  }

  private applyDeadZone(v: number): number {
    const a = Math.abs(v);
    if (a < STICK_DEAD_ZONE) return 0;
    // Rescale so movement ramps smoothly from the dead-zone edge.
    return Math.sign(v) * Math.min(1, (a - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE));
  }

  private diffEdges(prev: Set<ActionName>, next: Set<ActionName>): void {
    for (const action of next) {
      if (!prev.has(action)) this.pressedThisFrame.add(action);
    }
    for (const action of prev) {
      if (!next.has(action)) this.releasedThisFrame.add(action);
    }
  }

  isDown(action: ActionName): boolean {
    return this.held.has(action) || this.padHeld.has(action) || this.stickHeld.has(action);
  }

  wasPressed(action: ActionName): boolean {
    return this.pressedThisFrame.has(action);
  }

  wasReleased(action: ActionName): boolean {
    return this.releasedThisFrame.has(action);
  }

  private digitalDown(action: ActionName): boolean {
    // Keyboard and D-pad only — the stick contributes analog values instead.
    return this.held.has(action) || this.padHeld.has(action);
  }

  axisX(): number {
    const d = (this.digitalDown('right') ? 1 : 0) - (this.digitalDown('left') ? 1 : 0);
    return d !== 0 ? d : this.padAxisXValue;
  }

  axisY(): number {
    const d = (this.digitalDown('down') ? 1 : 0) - (this.digitalDown('up') ? 1 : 0);
    return d !== 0 ? d : this.padAxisYValue;
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  clearAll(): void {
    this.held.clear();
    this.padHeld.clear();
    this.stickHeld.clear();
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.padAxisXValue = 0;
    this.padAxisYValue = 0;
    this.suppressPadEdges = true;
  }

  // Debug helpers
  get _all(): ActionName[] {
    return ALL_ACTIONS;
  }
}

export const Input = new InputManager();
