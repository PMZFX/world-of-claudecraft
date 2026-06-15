// Default (Mouse Camera off): WoW-style — WASD + A/D keyboard turn, Q/E strafe,
// left-drag orbits, right-drag mouselooks, both buttons run forward.
// Optional Mouse Camera (on): OSRS-style — WASD is camera-relative, A/D strafe,
// mouse drag rotates the orbit (no pointer lock), no keyboard turn.
// Shared: space jump, wheel zoom, Tab target, rebindable action bar, R autorun.

import { Keybinds, actionKind } from './keybinds';
import { cursorForHover, type HoverCursorKind } from './cursors';
import { clickPickFromMouseGesture } from './pointer_pick';
import { sanitizeMoveFacing, sanitizeMoveInput } from '../sim/move_input';
import type { MoveInput } from '../sim/types';

const BASE_LOOK_SENS = 0.0045;
const TOUCH_LOOK_YAW_RATE = 3.2;
const TOUCH_LOOK_PITCH_RATE = 2.2;

export interface InputCallbacks {
  onTab(): void;
  onTargetFriendly(): void;
  onCycleFriendly(): void;
  onAbility(slot: number): void;
  onUiKey(key: 'interact' | 'bags' | 'char' | 'spellbook' | 'talents' | 'questlog' | 'map' | 'nameplates' | 'escape' | 'chat' | 'meters' | 'social' | 'arena' | 'leaderboard'): void;
  onEmoteWheel(open: boolean): void;
  onClickPick(x: number, y: number, button: number): void;
  /** When false, edge actions (spells, UI keys) are ignored. */
  canUseGameKeys?: () => boolean;
  onInputIntent?(kind: 'move' | 'look' | 'zoom'): void;
}

export interface TouchMoveInput {
  forward: boolean;
  back: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
}

export class Input {
  keys = new Set<string>();
  leftDown = false;
  rightDown = false;
  camYaw = Math.PI;
  camPitch = 0.32;
  camDist = 12;
  autorun = false;
  suspendMovement = false;
  // click-to-move (#95): a world destination the player clicked; the frame loop
  // walks toward it until arrival or until the player takes manual control.
  // null when inactive. clickMoveStop is how close counts as "there".
  clickMoveTarget: { x: number; z: number } | null = null;
  clickMoveStop = 0.5;
  /** Latest pointer position while over the canvas (for hover pick). */
  hoverX = 0;
  hoverY = 0;
  hoverActive = false;
  private hoverKind: HoverCursorKind = 'default';
  private mouseCameraEnabled = false;
  private dragDistance = 0;
  private downButton = -1;
  private pointerLockRequestedForDrag = false;
  private downX = 0;
  private downY = 0;
  // one-shot key capture for the rebind UI: the next keydown is delivered here
  // (Escape cancels with null) instead of being dispatched as an action
  private captureCb: ((code: string | null) => void) | null = null;
  private controllerMoveInput: MoveInput | null = null;
  private controllerFacing: number | null = null;
  private emoteWheelHeldCodes = new Set<string>();
  // mouse-look sensitivity, in radians per pixel of drag; the old fixed value
  // was BASE_LOOK_SENS — setCameraSpeed scales it from the settings menu
  private lookSensitivity = BASE_LOOK_SENS;
  private touchMove: TouchMoveInput = { forward: false, back: false, strafeLeft: false, strafeRight: false };
  private touchJump = false;
  private touchLookActive = false;
  private touchLookVector = { x: 0, y: 0 };

  constructor(private canvas: HTMLCanvasElement, private cb: InputCallbacks, private keybinds: Keybinds) {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.releaseCapture('blur'));
    window.addEventListener('pointerup', (e) => this.onMouseUp(e));
    window.addEventListener('pointercancel', (e) => this.onMouseUp(e));
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement) this.releaseCapture('pointerlock');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseCapture('hidden');
    });
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(Math.sign(e.deltaY) * 1.4);
      this.noteIntent('zoom');
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mouseenter', () => { this.hoverActive = true; });
    canvas.addEventListener('mouseleave', () => {
      this.hoverActive = false;
      this.setHoverCursor('default');
    });
    this.updateCursor();
  }

  /** Move the camera in/out, clamped to the zoom limits. Shared by wheel + touch pinch. */
  zoomBy(delta: number): void {
    this.camDist = Math.min(22, Math.max(3, this.camDist + delta));
  }

  /** True while a mouse button is held for camera drag. */
  isDragging(): boolean {
    return this.leftDown || this.rightDown;
  }

  /** Update hand / sword / shield cursor from a hover pick (called once per frame). */
  setHoverCursor(kind: HoverCursorKind): void {
    if (this.hoverKind === kind) return;
    this.hoverKind = kind;
    this.updateCursor();
  }

  isMouseCameraMode(): boolean {
    return this.mouseCameraEnabled;
  }

  setMouseCameraEnabled(on: boolean): void {
    this.mouseCameraEnabled = on;
    if (on && document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
    this.updateCursor();
  }

  captureNextKey(cb: (code: string | null) => void): void {
    this.captureCb = cb;
  }

  setCameraSpeed(mult: number): void {
    this.lookSensitivity = BASE_LOOK_SENS * mult;
  }

  setTouchMove(move: TouchMoveInput): void {
    const changed = move.forward !== this.touchMove.forward || move.back !== this.touchMove.back
      || move.strafeLeft !== this.touchMove.strafeLeft || move.strafeRight !== this.touchMove.strafeRight;
    this.touchMove = move;
    if (move.forward || move.back) this.autorun = false;
    if (changed) this.noteIntent('move');
  }

  clearTouchMove(): void {
    const changed = this.touchMove.forward || this.touchMove.back || this.touchMove.strafeLeft || this.touchMove.strafeRight;
    this.touchMove = { forward: false, back: false, strafeLeft: false, strafeRight: false };
    if (changed) this.noteIntent('move');
  }

  // A touch jump is momentary: the on-screen button arms this flag and the next
  // readMoveInput() poll consumes it, yielding a single frame of jump=true (the
  // sim only launches when grounded, so one frame is enough — same as a Space tap).
  triggerTouchJump(): void {
    this.touchJump = true;
  }

  // Touch-reachable autorun toggle (the keyboard path is the 'autorun' edge action).
  // Returns the new state so the on-screen button can reflect it.
  toggleAutorun(): boolean {
    this.autorun = !this.autorun;
    return this.autorun;
  }

  setTouchLook(active: boolean): void {
    if (active !== this.touchLookActive) this.noteIntent('look');
    this.touchLookActive = active;
  }

  setTouchLookVector(v: { x: number; y: number }): void {
    if (v.x !== this.touchLookVector.x || v.y !== this.touchLookVector.y) this.noteIntent('look');
    this.touchLookVector = v;
  }

  applyTouchLookDelta(dx: number, dy: number): void {
    this.camYaw -= dx * this.lookSensitivity;
    this.camPitch = Math.min(1.35, Math.max(-0.4, this.camPitch + dy * this.lookSensitivity));
    if (dx !== 0 || dy !== 0) this.noteIntent('look');
  }

  updateTouchLook(dt: number): void {
    if (!this.touchLookActive) return;
    this.camYaw -= this.touchLookVector.x * TOUCH_LOOK_YAW_RATE * dt;
    this.camPitch = Math.min(1.35, Math.max(-0.4, this.camPitch + this.touchLookVector.y * TOUCH_LOOK_PITCH_RATE * dt));
  }

  isMouselookActive(): boolean {
    if (this.mouseCameraEnabled) return this.touchLookActive;
    return this.rightDown || this.touchLookActive;
  }

  setControllerMoveInput(input: unknown, facing?: unknown): void {
    this.controllerMoveInput = sanitizeMoveInput(input);
    if (arguments.length > 1) this.controllerFacing = sanitizeMoveFacing(facing);
  }

  setControllerFacing(facing: unknown): void {
    this.controllerFacing = sanitizeMoveFacing(facing);
  }

  clearControllerMoveInput(): void {
    this.controllerMoveInput = null;
    this.controllerFacing = null;
  }

  controllerFacingOverride(): number | null {
    return this.controllerFacing;
  }

  private releaseCapture(reason: string): void {
    const hadInput = this.keys.size > 0 || this.leftDown || this.rightDown;
    // Always drop the mouse-drag state so a button can't stick "held".
    this.leftDown = false;
    this.rightDown = false;
    this.downButton = -1;
    this.pointerLockRequestedForDrag = false;
    // Focus loss (blur / tab hidden) means the OS will swallow the matching
    // keyup, so we must forget held movement keys or they'd stick on. A pointer
    // -lock exit is different: the window still has focus and keyup will fire
    // normally, so clearing keys here would cancel a walk the instant a camera
    // drag ends (every right/left-drag exits pointer lock on release).
    if (reason !== 'pointerlock') this.keys.clear();
    if (reason !== 'pointerlock' && this.emoteWheelHeldCodes.size > 0) {
      this.emoteWheelHeldCodes.clear();
      this.cb.onEmoteWheel(false);
    }
    this.updateCursor();
    if (hadInput) this.noteIntent('move');
  }

  private updateCursor(): void {
    this.canvas.style.cursor = cursorForHover(this.hoverKind, this.isDragging() || document.pointerLockElement === this.canvas);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (this.captureCb) {
      e.preventDefault();
      const cb = this.captureCb;
      this.captureCb = null;
      cb(e.code === 'Escape' ? null : e.code);
      return;
    }
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (this.cb.canUseGameKeys && !this.cb.canUseGameKeys()) return;
    if (e.code === 'Escape') { this.cb.onUiKey('escape'); return; }
    if (e.code === 'Tab') e.preventDefault();
    const action = this.keybinds.actionForCode(e.code);
    if (action === null) return;
    if (actionKind(action) === 'held') {
      if (action === 'emoteWheel') {
        this.emoteWheelHeldCodes.add(e.code);
        this.cb.onEmoteWheel(true);
        e.preventDefault();
        return;
      }
      this.keys.add(e.code);
      if (action === 'forward' || action === 'back') this.autorun = false;
      this.noteIntent('move');
      return;
    }
    this.dispatchEdge(action);
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (this.keys.delete(e.code)) this.noteIntent('move');
    if (this.emoteWheelHeldCodes.delete(e.code) && this.emoteWheelHeldCodes.size === 0) {
      this.cb.onEmoteWheel(false);
      e.preventDefault();
    }
  }

  private dispatchEdge(action: string): void {
    if (action.startsWith('slot')) { this.cb.onAbility(Number(action.slice(4))); return; }
    switch (action) {
      case 'autorun': this.autorun = !this.autorun; this.noteIntent('move'); return;
      case 'target': this.cb.onTab(); return;
      case 'targetFriendly': this.cb.onTargetFriendly(); return;
      case 'targetFriendlyNext': this.cb.onCycleFriendly(); return;
      case 'interact': this.cb.onUiKey('interact'); return;
      case 'bags': this.cb.onUiKey('bags'); return;
      case 'char': this.cb.onUiKey('char'); return;
      case 'spellbook': this.cb.onUiKey('spellbook'); return;
      case 'talents': this.cb.onUiKey('talents'); return;
      case 'questlog': this.cb.onUiKey('questlog'); return;
      case 'map': this.cb.onUiKey('map'); return;
      case 'nameplates': this.cb.onUiKey('nameplates'); return;
      case 'meters': this.cb.onUiKey('meters'); return;
      case 'social': this.cb.onUiKey('social'); return;
      case 'arena': this.cb.onUiKey('arena'); return;
      case 'leaderboard': this.cb.onUiKey('leaderboard'); return;
      case 'chat': this.cb.onUiKey('chat'); return;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) this.leftDown = true;
    if (e.button === 2) this.rightDown = true;
    if (e.button === 0 || e.button === 2) this.noteIntent(e.button === 2 ? 'look' : 'move');
    this.downButton = e.button;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.dragDistance = 0;
    // Pointer lock is requested lazily once a drag actually begins (see
    // onMouseMove) — NOT on every press, which spammed the browser "mouse
    // capture" banner on every right-click used to attack/look (#116).
    this.pointerLockRequestedForDrag = false;
    this.updateCursor();
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.leftDown = false;
    if (e.button === 2) this.rightDown = false;
    if (e.button === 0 || e.button === 2) this.noteIntent(e.button === 2 ? 'look' : 'move');
    const pick = clickPickFromMouseGesture({
      button: e.button,
      downButton: this.downButton,
      downX: this.downX,
      downY: this.downY,
      upX: e.clientX,
      upY: e.clientY,
      movementDrag: this.dragDistance,
      releaseOnCanvas: e.target === this.canvas || document.pointerLockElement === this.canvas,
      pointerLocked: document.pointerLockElement === this.canvas,
    });
    if (!this.mouseCameraEnabled && !this.leftDown && !this.rightDown && document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (pick) this.cb.onClickPick(pick.x, pick.y, pick.button);
    this.downButton = -1;
    this.pointerLockRequestedForDrag = false;
    this.updateCursor();
  }

  private onMouseMove(e: MouseEvent): void {
    if (e.target === this.canvas) {
      this.hoverX = e.clientX;
      this.hoverY = e.clientY;
    }
    if (!this.leftDown && !this.rightDown) return;
    const mx = e.movementX ?? 0, my = e.movementY ?? 0;
    if (mx === 0 && my === 0) return;
    this.dragDistance += Math.abs(mx) + Math.abs(my);
    // Engage pointer lock only once the press turns into an actual camera drag —
    // one banner per drag, none for a plain click (#116).
    if (!this.mouseCameraEnabled && this.dragDistance > 5 && !this.pointerLockRequestedForDrag) {
      this.pointerLockRequestedForDrag = true;
      this.canvas.requestPointerLock?.();
    }
    this.camYaw -= mx * this.lookSensitivity;
    this.camPitch = Math.min(1.35, Math.max(-0.4, this.camPitch + my * this.lookSensitivity));
    if (mx !== 0 || my !== 0) this.noteIntent('look');
  }

  private noteIntent(kind: 'move' | 'look' | 'zoom'): void {
    this.cb.onInputIntent?.(kind);
  }

  readMoveInput(): MoveInput {
    if (this.suspendMovement) {
      return { forward: false, back: false, turnLeft: false, turnRight: false, strafeLeft: false, strafeRight: false, jump: false };
    }
    if (this.controllerMoveInput) return { ...this.controllerMoveInput };
    const k = this.keys;
    const held = (id: string) => this.keybinds.codesForAction(id).some((c) => k.has(c));
    const bothButtons = this.leftDown && this.rightDown;
    const forward = held('forward') || bothButtons || this.autorun || this.touchMove.forward;
    const back = held('back') || this.touchMove.back;
    const jump = held('jump') || this.touchJump;
    this.touchJump = false;

    if (this.mouseCameraEnabled) {
      return {
        forward, back, jump,
        turnLeft: false,
        turnRight: false,
        strafeLeft: held('strafeLeft') || held('turnLeft') || this.touchMove.strafeLeft,
        strafeRight: held('strafeRight') || held('turnRight') || this.touchMove.strafeRight,
      };
    }

    const mouselook = this.isMouselookActive();
    const aHeld = held('turnLeft');
    const dHeld = held('turnRight');
    return {
      forward, back, jump,
      strafeLeft: held('strafeLeft') || (mouselook && aHeld) || this.touchMove.strafeLeft,
      strafeRight: held('strafeRight') || (mouselook && dHeld) || this.touchMove.strafeRight,
      turnLeft: !mouselook && aHeld,
      turnRight: !mouselook && dHeld,
    };
  }
}
