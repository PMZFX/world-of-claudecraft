import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../src/game/input';
import { Keybinds } from '../src/game/keybinds';

function installStorage(): void {
  const map = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  };
}

function makeInput() {
  const canvasListeners = new Map<string, (event: any) => void>();
  const windowListeners = new Map<string, (event: any) => void>();
  const documentListeners = new Map<string, (event: any) => void>();
  const requestPointerLock = vi.fn();
  const exitPointerLock = vi.fn();
  const canvas = {
    style: { cursor: '' },
    addEventListener: vi.fn((type: string, cb: (event: any) => void) => {
      canvasListeners.set(type, cb);
    }),
    requestPointerLock,
  };
  (globalThis as any).window = {
    addEventListener: vi.fn((type: string, cb: (event: any) => void) => {
      windowListeners.set(type, cb);
    }),
  };
  (globalThis as any).document = {
    activeElement: null,
    pointerLockElement: null,
    hidden: false,
    addEventListener: vi.fn((type: string, cb: (event: any) => void) => {
      documentListeners.set(type, cb);
    }),
    exitPointerLock,
  };
  const cb = {
    onTab: vi.fn(),
    onTargetFriendly: vi.fn(),
    onCycleFriendly: vi.fn(),
    onAbility: vi.fn(),
    onUiKey: vi.fn(),
    onEmoteWheel: vi.fn(),
    onClickPick: vi.fn(),
  };
  const input = new Input(canvas as any, cb, new Keybinds());
  return { canvas, canvasListeners, windowListeners, documentListeners, cb, input };
}

beforeEach(() => {
  installStorage();
});

describe('Input autorun', () => {
  it('toggleAutorun flips state and feeds forward into readMoveInput', () => {
    const { input } = makeInput();
    expect(input.autorun).toBe(false);
    expect(input.toggleAutorun()).toBe(true);
    expect(input.autorun).toBe(true);
    expect(input.readMoveInput().forward).toBe(true);
    expect(input.toggleAutorun()).toBe(false);
    expect(input.readMoveInput().forward).toBe(false);
  });

  it('a forward touch-move cancels autorun (classic tap-to-stop)', () => {
    const { input } = makeInput();
    input.toggleAutorun();
    input.setTouchMove({ forward: true, back: false, strafeLeft: false, strafeRight: false });
    expect(input.autorun).toBe(false);
  });

  it('a strafe-only touch-move keeps autorun engaged', () => {
    const { input } = makeInput();
    input.toggleAutorun();
    input.setTouchMove({ forward: false, back: false, strafeLeft: true, strafeRight: false });
    expect(input.autorun).toBe(true);
    expect(input.readMoveInput().forward).toBe(true);
  });
});

describe('Input pointer lock', () => {
  it('does not request pointer lock for a plain right click', () => {
    const { canvas, canvasListeners } = makeInput();

    canvasListeners.get('mousedown')!({ button: 2 });

    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
  });

  it('requests pointer lock when mouse movement becomes a drag', () => {
    const { canvas, canvasListeners, windowListeners } = makeInput();

    canvasListeners.get('mousedown')!({ button: 2 });
    windowListeners.get('mousemove')!({ movementX: 4, movementY: 3 });

    expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1);
  });
});

describe('Input movement is not cancelled by a camera drag', () => {
  // Discord regression: walking with W (or any held key) then right/left-drag to
  // look around and releasing the button stopped movement, because exiting
  // pointer lock cleared the held keyboard keys.
  function walkAndDrag(button: number, windowListeners: Map<string, (e: any) => void>, canvasListeners: Map<string, (e: any) => void>, documentListeners: Map<string, (e: any) => void>) {
    windowListeners.get('keydown')!({ code: 'KeyW', repeat: false });        // hold forward
    canvasListeners.get('mousedown')!({ button });                           // press camera button
    windowListeners.get('mousemove')!({ movementX: 6, movementY: 2 });       // drag → pointer lock
    (globalThis as any).document.pointerLockElement = (globalThis as any).document; // lock engaged
    windowListeners.get('mouseup')!({ button });                             // release → exitPointerLock
    (globalThis as any).document.pointerLockElement = null;                  // lock ends
    documentListeners.get('pointerlockchange')!({});                         // browser fires change
  }

  it('keeps walking forward after a right-drag ends', () => {
    const { input, windowListeners, canvasListeners, documentListeners } = makeInput();
    walkAndDrag(2, windowListeners, canvasListeners, documentListeners);
    expect(input.readMoveInput().forward).toBe(true);
  });

  it('keeps walking forward after a left-drag ends', () => {
    const { input, windowListeners, canvasListeners, documentListeners } = makeInput();
    walkAndDrag(0, windowListeners, canvasListeners, documentListeners);
    expect(input.readMoveInput().forward).toBe(true);
  });

  it('still forgets held keys on focus loss so movement cannot stick', () => {
    const { input, windowListeners } = makeInput();
    windowListeners.get('keydown')!({ code: 'KeyW', repeat: false });
    windowListeners.get('blur')!({});
    expect(input.readMoveInput().forward).toBe(false);
  });
});
describe('touch jump', () => {
  it('jump is off until the touch button arms it', () => {
    const { input } = makeInput();
    expect(input.readMoveInput().jump).toBe(false);
  });

  it('triggerTouchJump yields exactly one frame of jump', () => {
    const { input } = makeInput();
    input.triggerTouchJump();
    expect(input.readMoveInput().jump).toBe(true);
    // momentary: a single poll consumes it so it cannot stick on like a held key
    expect(input.readMoveInput().jump).toBe(false);
  });
});

describe('Input emote wheel hold', () => {
  it('opens on the held binding and closes when the key is released', () => {
    const { windowListeners, cb } = makeInput();
    const preventDefault = vi.fn();

    windowListeners.get('keydown')!({ code: 'KeyX', repeat: false, preventDefault });
    expect(cb.onEmoteWheel).toHaveBeenLastCalledWith(true);
    expect(preventDefault).toHaveBeenCalled();

    windowListeners.get('keyup')!({ code: 'KeyX', preventDefault });
    expect(cb.onEmoteWheel).toHaveBeenLastCalledWith(false);
  });

  it('closes the wheel on focus loss', () => {
    const { windowListeners, cb } = makeInput();
    windowListeners.get('keydown')!({ code: 'KeyX', repeat: false, preventDefault: vi.fn() });

    windowListeners.get('blur')!({});

    expect(cb.onEmoteWheel).toHaveBeenLastCalledWith(false);
  });
});
