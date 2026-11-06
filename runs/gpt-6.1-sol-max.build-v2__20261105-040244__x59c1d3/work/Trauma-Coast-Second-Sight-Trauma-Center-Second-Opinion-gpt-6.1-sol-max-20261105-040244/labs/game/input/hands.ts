/** @file Native absolute mouse aiming, rebindable keyboard actions and four independent controller seats. */
import { defineActionMap, screenRay, onFloor, type EngineFrame, type Input } from '../../../engine';
import type { Hand, Operation, Point } from '../data/types';
import type { Preferences } from '../app/settings';
import { fieldHeight } from '../view/field/sheet';
import { clamp, distanceTo, nearest } from '../scenes/op/geometry';
import { RESPONSE, TOOLS } from '../data/tools';
import { getCase } from '../data/cases';
import { padAction } from './pad';
export const MAP = defineActionMap('actionMap:surgeon', {
  description: 'First-person twin-stick surgery.',
  lock: false,
  move: ['up', 'down', 'left', 'right'],
  actions: {
    left: ['KeyA', 'ArrowLeft', 'PadLeftStickLeft'],
    right: ['KeyD', 'ArrowRight', 'PadLeftStickRight'],
    up: ['KeyW', 'ArrowUp', 'PadLeftStickUp'],
    down: ['KeyS', 'ArrowDown', 'PadLeftStickDown'],
    use: ['Enter', 'MouseLeft', 'PadRightTrigger', 'PadSouth'],
    precision: ['ShiftLeft', 'PadLeftTrigger'],
    gift: ['Space', 'PadNorth'],
    syringe: ['KeyF', 'PadWest'],
    drop: ['KeyR', 'PadEast'],
    previous: ['PadLeftShoulder', 'WheelUp'],
    next: ['PadRightShoulder', 'WheelDown'],
    siteleft: ['KeyQ', 'PadLeft'],
    siteright: ['KeyE', 'PadRight'],
    hint: ['KeyH', 'PadUp'],
    swap: ['Tab', 'PadRightStick'],
  },
});
export class Hands {
  seats: Hand[] = [[0, 0, 3, 0, 0, 0, 0, 0, 0]];
  devices: (number | 'keyboard')[] = ['keyboard'];
  mouse: Point = [0, 0];
  moved = false;
  buttons = new Set<number>();
  keys = new Set<string>();
  lastDevice: 'mouse' | 'keyboard' | 'gamepad' = 'mouse';
  radial: { x: number; y: number; selected: number; pad: boolean } | null = null;
  previousPads: number[][] = [];
  padActions: Record<string, number>[] = [];
  toggles: boolean[] = [];
  dropped: boolean[] = [];
  onActivity: () => boolean = () => false;
  onPause: () => void = () => {};
  onHint: () => void = () => {};
  onMenu: (action: string) => void = () => {};
  onClaim: (device: number | 'keyboard') => boolean = () => false;
  networked = false;
  claimMode = false;
  playing = false;
  touch = !matchMedia('(any-pointer:fine)').matches;
  precision = false;
  toggle = false;
  toggleMode = false;
  pointerUI = false;
  curve = 2.2;
  magnet = 0.55;
  rail = 0.6;
  sew = 0.8;
  menuHold: number[] = [];
  constructor() {
    addEventListener('keydown', (e) => {
      this.lastDevice = 'keyboard';
      this.touch = false;
      if (this.onActivity()) {
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      this.keys.add(e.code);
      if (this.playing) {
        if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (/^Digit[1-8]$/.test(e.code)) this.seats[0][2] = Number(e.code.slice(5)) - 1;
        if (e.code === 'Escape') this.onPause();
        if (e.code === 'Enter') this.toggle = !this.toggle;
      } else {
        if (e.code === 'Enter' && this.onClaim('keyboard')) return;
        this.onMenu(e.code);
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') {
        this.onActivity();
        return;
      }
      this.lastDevice = 'mouse';
      this.pointerUI = !!(e.target as Element).closest('button,input,textarea');
      this.mouse = [e.clientX, e.clientY];
      this.moved = true;
      this.onActivity();
      if (this.radial && !this.radial.pad) {
        const dx = e.clientX - this.radial.x,
          dy = e.clientY - this.radial.y;
        if (Math.hypot(dx, dy) > 18)
          this.radial.selected = (Math.round((Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI / 4)) + 8) % 8;
      }
    });
    addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.onActivity();
        return;
      }
      this.lastDevice = 'mouse';
      this.buttons.add(e.button);
      if (this.onActivity()) return;
      if (this.playing && e.button === 0 && this.toggleMode) this.toggle = !this.toggle;
      if (this.playing && e.button === 2) {
        if (this.buttons.has(0)) this.seats[0][5]++;
        else this.radial = { x: e.clientX, y: e.clientY, selected: this.seats[0][2], pad: false };
      }
      if (this.playing && e.button === 0 && this.buttons.has(2)) this.seats[0][5]++;
    });
    addEventListener('pointerup', (e) => {
      this.buttons.delete(e.button);
      if (e.button === 2 && this.radial) {
        this.seats[0][2] = this.radial.selected;
        this.radial = null;
      }
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener(
      'wheel',
      (e) => {
        if (this.playing) e.preventDefault();
        this.onActivity();
      },
      { passive: false },
    );
    addEventListener('blur', () => {
      this.keys.clear();
      this.buttons.clear();
    });
  }
  claim(device: number | 'keyboard'): boolean {
    if (this.devices.includes(device) || this.devices.length === 4) return false;
    this.devices.push(device);
    this.seats.push([0, 0, 3, 0, 0, 0, 0, 0, 0]);
    return true;
  }
  pollPads(dt: number, prefs: Preferences, s?: Operation, input?: Input): void {
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad?.connected) continue;
      const values = pad.buttons.map((b) => b.value),
        prev = this.previousPads[pad.index] ?? [],
        press = (n: number) => (values[n] ?? 0) > 0.5 && (prev[n] ?? 0) <= 0.5,
        active = values.some((v) => v > 0.1) || pad.axes.some((v) => Math.abs(v) > 0.2);
      if (active) {
        this.lastDevice = 'gamepad';
        this.touch = false;
        if (this.onActivity()) {
          this.previousPads[pad.index] = values;
          continue;
        }
      }
      if (!this.playing) {
        const justClaimed = press(0) && this.claimMode && !this.devices.includes(pad.index);
        if (justClaimed) this.onClaim(pad.index);
        for (const [i, code] of [
          [0, 'Enter'],
          [1, 'Escape'],
          [3, 'KeyT'],
          [9, 'Escape'],
          [12, 'ArrowUp'],
          [13, 'ArrowDown'],
          [14, 'ArrowLeft'],
          [15, 'ArrowRight'],
        ] as [number, string][])
          if (press(i) && !(i === 0 && justClaimed) && !(i === 9 && values[8] > 0.5)) this.onMenu(code);
        const y = pad.axes[1] ?? 0;
        this.menuHold[pad.index] = (this.menuHold[pad.index] ?? 0) + dt;
        if (Math.abs(y) > 0.6 && (Math.abs(prev[20] ?? 0) < 0.6 || this.menuHold[pad.index] > 0.3)) {
          this.onMenu(y > 0 ? 'ArrowDown' : 'ArrowUp');
          this.menuHold[pad.index] = 0;
        }
        values[20] = y;
      } else {
        let index = this.devices.indexOf(pad.index);
        if (index < 0 && this.devices.length === 1 && this.devices[0] === 'keyboard') index = 0;
        if (index < 0) continue;
        const h = this.seats[index],
          old = this.padActions[pad.index] ?? {},
          now: Record<string, number> = {};
        for (const action of Object.keys(MAP.actions))
          now[action] = padAction(pad, input, action, MAP.actions[action] as string[]);
        const hit = (a: string) => now[a] > 0.5 && (old[a] ?? 0) <= 0.5,
          x = now.right - now.left,
          z = now.down - now.up,
          lean = Math.hypot(x, z),
          precise = now.precision > 0.2;
        if (lean > 0.15) {
          const speed = prefs.cursorSpeed * Math.pow(Math.min(1, lean), this.curve) * dt * (precise ? 0.4 : 1);
          h[0] -= (x / lean) * speed;
          h[1] += (z / lean) * speed;
          this.assist(h, s, precise, prefs);
        }
        if (index === 0) this.precision = precise;
        if (prefs.toggleUse && hit('use')) this.toggles[index] = !this.toggles[index];
        h[3] = prefs.toggleUse ? (this.toggles[index] ? 1 : 0) : now.use > 0.1 ? 1 : 0;
        if (hit('gift')) h[4]++;
        if (hit('syringe')) h[2] = 5;
        if (hit('previous')) h[2] = (h[2] + 7) % 8;
        if (hit('next')) h[2] = (h[2] + 1) % 8;
        if (hit('siteleft')) h[6]--;
        if (hit('siteright')) h[6]++;
        if (hit('hint')) this.onHint();
        if (hit('swap')) h[7]++;
        if (s?.code && values[6] > 0.5 && values[7] > 0.5 && ((prev[6] ?? 0) <= 0.5 || (prev[7] ?? 0) <= 0.5)) h[5]++;
        if (press(9) && values[8] < 0.5) this.onPause();
        const rx = pad.axes[2] ?? 0,
          ry = pad.axes[3] ?? 0,
          rad = Math.hypot(rx, ry);
        if (rad > 0.4) {
          this.radial = {
            x: innerWidth * 0.5,
            y: innerHeight * 0.55,
            selected: (Math.round((Math.atan2(ry, rx) + Math.PI / 2) / (Math.PI / 4)) + 8) % 8,
            pad: true,
          };
          h[8] = 1;
        } else if (this.radial?.pad) {
          h[2] = this.radial.selected;
          this.radial = null;
          h[8] = 0;
        }
        if (hit('drop')) {
          this.dropped[index] = true;
          this.toggles[index] = false;
          this.radial = null;
          h[8] = 0;
        }
        if (now.use < 0.1) this.dropped[index] = false;
        if (this.dropped[index]) h[3] = 0;
        this.padActions[pad.index] = now;
      }
      this.previousPads[pad.index] = values;
    }
  }
  private assist(h: Hand, s: Operation | undefined, precision: boolean, prefs: Preferences): void {
    if (!s || !prefs.assist) return;
    const t = s.targets
      .filter((t) => !t.done && t.site === h[6] && RESPONSE[TOOLS[h[2]]][t.kind] === 'effect')
      .sort((a, b) => distanceTo(a, h[0], h[1]) - distanceTo(b, h[0], h[1]))[0];
    if (!t) return;
    const n = t.path.length ? nearest(t.path, h[0], h[1]) : null,
      p = n?.point ?? [t.x, t.z],
      distance = distanceTo(t, h[0], h[1]);
    if (distance < 0.65) {
      let factor = ((precision ? 0.3 : 0.12) * this.magnet) / 0.55;
      if (h[2] === 0 && h[3] && n) factor = Math.max(factor, this.rail * 0.65);
      h[0] += (p[0] - h[0]) * factor;
      h[1] += (p[1] - h[1]) * factor;
    }
    if (h[2] === 2 && h[3] && n && distance > this.sew && distance < 1.5) {
      const f = (distance - this.sew) / distance;
      h[0] += (p[0] - h[0]) * f;
      h[1] += (p[1] - h[1]) * f;
    }
  }
  frame(f: EngineFrame, prefs: Preferences, s?: Operation, input?: Input): Hand[] {
    const read = (key: string, value: number) => Number(f.setting('game.' + key) ?? value);
    this.curve = read('cursorCurve', 2.2);
    this.magnet = read('magnet', 0.55);
    this.rail = read('railAssist', 0.6);
    this.sew = read('sewAssist', 0.8);
    const tuned = {
      ...prefs,
      cursorSpeed: this.networked ? prefs.cursorSpeed : read('cursorSpeed', prefs.cursorSpeed),
    };
    this.toggleMode = prefs.toggleUse;
    this.pollPads(f.dt, tuned, s, input);
    if (!this.playing) return this.seats;
    const h = this.seats[0];
    if (this.lastDevice !== 'gamepad' && this.devices[0] === 'keyboard') {
      if (this.moved) {
        let nx = (this.mouse[0] / innerWidth) * 2 - 1,
          ny = 1 - (this.mouse[1] / innerHeight) * 2;
        const roll = f.camera.roll,
          aspect = innerWidth / innerHeight,
          px = nx;
        nx = nx * Math.cos(roll) - (ny * Math.sin(roll)) / aspect;
        ny = ny * Math.cos(roll) + px * Math.sin(roll) * aspect;
        const ray = screenRay(f.camera, [nx, ny], aspect);
        let p = onFloor(ray, 0);
        if (p && s) for (let i = 0; i < 3; i++) p = onFloor(ray, fieldHeight(p[0], p[2], s)) ?? p;
        if (p) {
          h[0] = p[0];
          h[1] = p[2];
        }
        this.moved = false;
      }
      const dx = (input?.strength('right') ?? 0) - (input?.strength('left') ?? 0),
        dz = (input?.strength('down') ?? 0) - (input?.strength('up') ?? 0);
      this.precision = input?.held('precision') ?? false;
      const speed = tuned.cursorSpeed * f.dt * (this.precision ? 0.4 : 1);
      h[0] -= dx * speed;
      h[1] += dz * speed;
      if (input?.pressed('gift')) h[4]++;
      if (input?.pressed('syringe')) h[2] = 5;
      if (input?.pressed('swap')) h[7]++;
      if (input?.pressed('siteleft')) h[6]--;
      if (input?.pressed('siteright')) h[6]++;
      if (input?.pressed('hint')) this.onHint();
      if (input?.pressed('previous')) h[2] = (h[2] + 7) % 8;
      if (input?.pressed('next')) h[2] = (h[2] + 1) % 8;
      if (input?.pressed('drop')) {
        this.dropped[0] = true;
        this.toggle = false;
      }
      if (!input?.held('use')) this.dropped[0] = false;
      h[3] =
        this.radial || this.dropped[0] || this.pointerUI
          ? 0
          : prefs.toggleUse
            ? this.toggle
              ? 1
              : 0
            : this.buttons.has(0) || input?.held('use')
              ? 1
              : 0;
      h[8] = this.radial ? 1 : 0;
    }
    if (s?.caseId === 'struck-off' && s.phase > 0)
      for (const h of this.seats) h[0] += Math.sin(((s.fieldTicks / 6000) * Math.PI * 2) / 7) * 0.7 * f.dt;
    for (const hand of this.seats) {
      hand[0] = clamp(hand[0], -7.2, 7.2);
      hand[1] = clamp(hand[1], -3.4, 3.4);
      if (s) hand[6] = (Math.round(hand[6]) + 30) % getCase(s.caseId).sites.length;
    }
    return this.seats;
  }
}
