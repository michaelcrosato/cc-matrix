// Every input device, read per pad. The engine merges all pads into one and has no analog triggers,
// so pads are polled here. Keys and mouse come from ctx.input. Also tracks the last device used (for
// prompts) and any input at all (for attract mode).
export const PAD = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };
const DEAD = 0.18;

const newPad = () => ({ connected: false, values: new Array(17).fill(0), down: new Array(17).fill(false), edge: new Array(17).fill(false), up: new Array(17).fill(false), axes: [0, 0, 0, 0], actuator: null, id: '' });

const NAV_KEYS = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
};

export class Devices {
  constructor() {
    this.pads = [newPad(), newPad(), newPad(), newPad()];
    this.last = 'kbm';
    this.frame = -1;
    this.nav = { up: false, down: false, left: false, right: false, confirm: false, back: false, tabL: false, tabR: false, start: false, more: false };
    this.navHeld = { up: 0, down: 0, left: 0, right: 0 };
    this.any = false;
    this.anyPress = false;
    this.mouseMoved = false;
    this.px = 0;
    this.py = 0;
    this.lastPointer = [0, 0];
    this.keyEvent = false;
    this.pressEvent = false;
    this.moveEvent = false;
    this.listening = false;
    this.swallow = 0;
    this.usedPad = false;
    this.lastPadIndex = 0;
  }

  listen() {
    if (this.listening || typeof window === 'undefined') return;
    this.listening = true;
    window.addEventListener('keydown', (e) => { if (!e.repeat) { this.keyEvent = true; } }, true);
    window.addEventListener('pointerdown', (e) => { this.pressEvent = true; if (e.pointerType === 'touch') this.touchEvent = true; }, true);
    window.addEventListener('pointermove', () => { this.moveEvent = true; }, true);
    window.addEventListener('wheel', () => { this.moveEvent = true; }, { capture: true, passive: true });
  }

  poll(ctx) {
    if (ctx.engine.frame === this.frame) return;
    this.frame = ctx.engine.frame;
    const dt = Math.min(0.1, this.dt ?? 1 / 60);
    const input = ctx.input;
    const got = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let padActive = false, padPress = false;
    for (let i = 0; i < 4; i++) {
      const src = got[i];
      const p = this.pads[i];
      if (!src || !src.connected) {
        p.connected = false;
        p.down.fill(false); p.edge.fill(false); p.up.fill(false); p.values.fill(0); p.axes.fill(0);
        continue;
      }
      p.connected = true;
      p.id = src.id;
      p.actuator = src.vibrationActuator ?? null;
      for (let b = 0; b < 17; b++) {
        const btn = src.buttons[b];
        const v = btn ? (typeof btn === 'object' ? btn.value : btn) : 0;
        const dn = btn ? (typeof btn === 'object' ? btn.pressed || v > 0.5 : v > 0.5) : false;
        p.edge[b] = dn && !p.down[b];
        p.up[b] = !dn && p.down[b];
        p.down[b] = dn;
        p.values[b] = v;
        if (p.edge[b]) { padPress = true; this.lastPadIndex = i; }
        if (v > 0.1) padActive = true;
      }
      for (let a = 0; a < 4; a++) {
        const raw = src.axes[a] ?? 0;
        p.axes[a] = Math.abs(raw) < DEAD ? 0 : raw;
        if (p.axes[a] !== 0) padActive = true;
      }
    }
    if (padActive) { this.last = 'pad'; this.usedPad = true; }

    // Pointer in art pixels.
    const hud = ctx.hud;
    const pt = input.pointer;
    this.px = ((pt.x + 1) / 2) * hud.width;
    this.py = ((1 - pt.y) / 2) * hud.height;
    this.mouseMoved = this.moveEvent && (Math.abs(this.lastPointer[0] - pt.x) > 1e-3 || Math.abs(this.lastPointer[1] - pt.y) > 1e-3 || input.wheel !== 0);
    this.lastPointer[0] = pt.x;
    this.lastPointer[1] = pt.y;
    const kbmNow = this.keyEvent || (this.pressEvent && !this.touchEvent) || this.mouseMoved;
    if (kbmNow) this.last = 'kbm';
    this.any = padActive || this.keyEvent || this.pressEvent || this.moveEvent;
    this.anyPress = padPress || this.keyEvent || this.pressEvent;
    this.keyEvent = false;
    this.pressEvent = false;
    this.moveEvent = false;
    this.touchEvent = false;

    // Menu navigation: edges with repeat, merged from every device.
    const heldDir = {
      up: NAV_KEYS.up.some((k) => input.isDown(k) || input.wasPressed(k)),
      down: NAV_KEYS.down.some((k) => input.isDown(k) || input.wasPressed(k)),
      left: NAV_KEYS.left.some((k) => input.isDown(k) || input.wasPressed(k)),
      right: NAV_KEYS.right.some((k) => input.isDown(k) || input.wasPressed(k)),
    };
    let confirm = input.wasPressed('Enter') || input.wasPressed('Space');
    let back = input.wasPressed('Escape');
    let tabL = input.wasPressed('KeyQ');
    let tabR = input.wasPressed('KeyE');
    let start = false, more = input.wasPressed('KeyM');
    for (const p of this.pads) {
      if (!p.connected) continue;
      if (p.down[PAD.up] || p.axes[1] < -0.5) heldDir.up = true;
      if (p.down[PAD.down] || p.axes[1] > 0.5) heldDir.down = true;
      if (p.down[PAD.left] || p.axes[0] < -0.5) heldDir.left = true;
      if (p.down[PAD.right] || p.axes[0] > 0.5) heldDir.right = true;
      // Create + Options belongs to the hub: ignore Options while Create is held.
      confirm = confirm || p.edge[PAD.cross];
      back = back || p.edge[PAD.circle];
      tabL = tabL || p.edge[PAD.l1];
      tabR = tabR || p.edge[PAD.r1];
      start = start || (p.edge[PAD.options] && !p.down[PAD.create]);
      more = more || p.edge[PAD.triangle];
    }
    for (const k of ['up', 'down', 'left', 'right']) {
      const was = this.navHeld[k];
      if (heldDir[k]) {
        this.navHeld[k] = was + dt;
        const fresh = NAV_KEYS[k].some((c) => input.wasPressed(c));
        if (fresh) this.navHeld[k] = dt;
        this.nav[k] = fresh || was === 0 || (was > 0.36 && Math.floor((was - 0.36) / 0.11) !== Math.floor((was + dt - 0.36) / 0.11));
      } else {
        this.navHeld[k] = 0;
        this.nav[k] = false;
      }
    }
    this.nav.confirm = confirm;
    this.nav.back = back;
    this.nav.tabL = tabL;
    this.nav.tabR = tabR;
    this.nav.start = start || input.wasPressed('Escape');
    this.nav.more = more;
    this.click = input.wasPressed('MouseLeft');
    this.rightClick = input.wasPressed('MouseRight');
    this.wheel = input.wheel;
  }

  rumble(index, { strong = 0.5, weak = 0.5, ms = 120 } = {}) {
    const p = this.pads[index ?? this.lastPadIndex];
    if (!p?.connected || !p.actuator?.playEffect) return false;
    try { p.actuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); return true; } catch { return false; }
  }
}
