/**
 * @file The devices' events the page app listens to (what wakes attract, the pointer's place, mouse lean), and the small
 * read-only state handle `window.__game` that tests read.
 *
 * Game code, a page's.
 *
 * @example
 * // listenDevices(app);
 */
import type { ActivityData, Flow } from '../scenes/components';
import type { App } from './app';

/** Mouse lean, the pointer's place, and what wakes things up. */
export function listenDevices(app: App): void {
  const wake = () => {
    app.idle = 0;
    if (app.attract) app.endAttract();
  };
  const hard = () => {
    if (app.touchOnly && !app.sawKeyOrPad) {
      app.sawKeyOrPad = true;
      app.title?.setTouchOnly(false);
    }
    wake();
  };
  // Tab is the Programme here, not the browser's focus; Esc under pointer lock reaches only the browser, which lets go of
  // the pointer: that is a player asking to pause.
  addEventListener('keydown', (event) => {
    if (event.code === 'Tab') event.preventDefault();
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement !== null;
    const lost = app.wasLocked && !locked;
    app.wasLocked = locked;
    const map = app.mapName();
    if (lost && app.stack.length === 0 && !app.attract && (map === 'actionMap:balance' || map === 'actionMap:roam'))
      app.askPause();
  });
  addEventListener('keydown', () => {
    app.device_ = 'keyboard';
    app.inputSeen = true;
    hard();
  });
  addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') {
      app.idle = 0;
      return;
    }
    app.device_ = 'mouse';
    app.inputSeen = true;
    hard();
  });
  addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 1) {
      wake();
      if (document.pointerLockElement || app.lastFlow?.mode === 'event') app.device_ = 'mouse';
    }
    if (document.pointerLockElement) {
      app.mouse[0] += event.movementX;
      app.mouse[1] += event.movementY;
    }
    const aspect = innerWidth / Math.max(1, innerHeight);
    app.point = [
      ((event.clientX / innerWidth) * 2 - 1) * aspect * 1.25,
      -((event.clientY / innerHeight) * 2 - 1) * 1.25,
      1,
    ];
  });
}

/** Publishes the small read-only handle tests use. */
export function publishState(app: App, flow?: Flow | null, a?: ActivityData | null): void {
  (window as unknown as { __game: unknown }).__game = {
    screen: app.stack.length ? app.stack[app.stack.length - 1].name : (flow?.mode ?? 'boot'),
    stack: app.stack.map((s) => s.name),
    attract: app.attract,
    device: app.device_,
    glyphs: app.settings.glyphs,
    calm: app.calmStep,
    volumes: {
      music: app.sound.audio.volume('music'),
      effects: app.settings.effects,
      voices: app.settings.voices,
    },
    day: flow?.day ?? app.lastFlow?.day ?? 0,
    mode: flow?.mode ?? app.lastFlow?.mode ?? '',
    event: flow?.event ?? '',
    phase: a?.phase ?? '',
    focus: flow?.focus ?? -1,
    map: app.mapName(),
    camera: app.camCode,
    speech: app.speech?.current ?? '',
    touchOnly: app.touchOnly && !app.sawKeyOrPad,
    idle: app.idle,
  };
}

/** A light rumble on any pad, if allowed. */
export function rumble(app: App, strength: number, ms: number): void {
  if (!app.settings.rumble) return;
  for (const pad of navigator.getGamepads?.() ?? []) {
    const actuator = (
      pad as unknown as { vibrationActuator?: { playEffect(kind: string, p: object): Promise<unknown> } } | null
    )?.vibrationActuator;
    if (!actuator) continue;
    try {
      void actuator
        .playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 })
        ?.catch?.(() => undefined);
    } catch {
      // Some pads refuse; a rumble is never important.
    }
  }
}

/** Which device was used last: glyphs follow it, the same frame. Pads are read here; keys and mouse by their events. */
export function updateDevice(app: App): void {
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (!pad) continue;
    const pressed = pad.buttons.some((b) => b.pressed) || pad.axes.some((v) => Math.abs(v) > 0.4);
    if (!pressed) continue;
    app.device_ = 'gamepad';
    app.inputSeen = true;
    app.idle = 0;
    if (app.attract) app.endAttract();
    if (!app.sawKeyOrPad) {
      app.sawKeyOrPad = true;
      app.title?.setTouchOnly(false);
    }
  }
}
