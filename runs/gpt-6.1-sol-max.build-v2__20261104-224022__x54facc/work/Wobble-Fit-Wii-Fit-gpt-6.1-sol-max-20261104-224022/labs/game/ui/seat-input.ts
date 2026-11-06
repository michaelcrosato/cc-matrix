/** @file Independent local seats: keyboard/mouse and up to four standard pads never drive one another's mats. */
import type { Device } from './glyphs';
export class SeatInput {
  private keys = new Set<string>();
  private left = ['KeyQ', 'Space', 'MouseLeft'];
  private right = ['KeyE', 'Space', 'MouseRight'];
  setCodes(left: readonly string[], right: readonly string[]) {
    this.left = [...left];
    this.right = [...right];
  }
  private buttons = 0;
  private active = false;
  private keyboard: number | null = 0;
  private pads = new Map<number, number>();
  constructor() {
    addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (this.active && this.keyboard === null && e.code === 'Space') this.keyboard = this.free();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('pointerdown', (e) => (this.buttons = e.buttons));
    addEventListener('pointerup', (e) => (this.buttons = e.buttons));
    addEventListener('blur', () => {
      this.keys.clear();
      this.buttons = 0;
    });
  }
  private free(): number | null {
    const used = new Set([...this.pads.values(), ...(this.keyboard === null ? [] : [this.keyboard])]);
    for (let i = 0; i < 4; i++) if (!used.has(i)) return i;
    return null;
  }
  begin(device: Device) {
    this.active = true;
    this.pads.clear();
    this.keyboard = device === 'pad' ? null : 0;
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad?.connected) continue;
      const seat = this.free();
      if (seat !== null) this.pads.set(pad.index, seat);
    }
    if (!this.pads.size) this.keyboard = 0;
  }
  camera() {
    const has = (...codes: string[]) => (codes.some((c) => this.keys.has(c)) ? 1 : 0);
    return {
      move: [
        has('KeyD', 'ArrowRight') - has('KeyA', 'ArrowLeft'),
        has('KeyW', 'ArrowUp') - has('KeyS', 'ArrowDown'),
        has('KeyE') - has('KeyQ'),
      ] as [number, number, number],
      fast: !!has('ShiftLeft', 'ShiftRight'),
    };
  }
  values(mouse: readonly number[], cpu: boolean): number[] {
    const values = Array.from({ length: 20 }, () => 0),
      pads = [...(navigator.getGamepads?.() ?? [])].filter((pad): pad is Gamepad => !!pad?.connected);
    for (const [index] of this.pads) if (!pads.some((p) => p.index === index)) this.pads.delete(index);
    for (const pad of pads)
      if (!this.pads.has(pad.index) && pad.buttons.some((b) => b.pressed)) {
        const seat = this.free();
        if (seat !== null) this.pads.set(pad.index, seat);
      }
    for (const pad of pads) {
      const seat = this.pads.get(pad.index);
      if (seat === undefined) continue;
      const j = seat * 5,
        mag = Math.hypot(pad.axes[0], pad.axes[1]),
        gain = mag > 0.18 ? Math.min(1, (mag - 0.18) / 0.82) / mag : 0;
      values[j] = pad.axes[0] * gain;
      values[j + 1] = -pad.axes[1] * gain;
      values[j + 2] = Math.max(pad.buttons[6]?.value ?? 0, pad.buttons[4]?.value ?? 0);
      values[j + 3] = Math.max(pad.buttons[7]?.value ?? 0, pad.buttons[5]?.value ?? 0);
      values[j + 4] = pad.buttons.slice(0, 4).some((b) => b.pressed) ? 2 : 1;
    }
    if (this.keyboard === null && !this.pads.size) this.keyboard = 0;
    if (this.keyboard !== null) {
      const j = this.keyboard * 5,
        has = (...keys: string[]) => (keys.some((k) => this.keys.has(k)) ? 1 : 0),
        gentle = has('ShiftLeft', 'ShiftRight') ? 0.4 : 1;
      values[j] = (has('KeyD', 'ArrowRight') - has('KeyA', 'ArrowLeft') + mouse[0]) * gentle;
      values[j + 1] = (has('KeyW', 'ArrowUp') - has('KeyS', 'ArrowDown') + mouse[1]) * gentle;
      values[j + 2] = this.left.some(
        (c) =>
          this.keys.has(c) ||
          (c === 'MouseLeft' && !!(this.buttons & 1)) ||
          (c === 'MouseRight' && !!(this.buttons & 2)),
      )
        ? 1
        : 0;
      values[j + 3] = this.right.some(
        (c) =>
          this.keys.has(c) ||
          (c === 'MouseLeft' && !!(this.buttons & 1)) ||
          (c === 'MouseRight' && !!(this.buttons & 2)),
      )
        ? 1
        : 0;
      values[j + 4] = has('Enter', 'KeyF') ? 2 : 1;
    }
    if (!cpu) for (let seat = 0; seat < 4; seat++) if (!values[seat * 5 + 4]) values[seat * 5 + 4] = 1;
    return values;
  }
}
