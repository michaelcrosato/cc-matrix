/**
 * @file Group Class's join screen (PLAN.md section 9): same screen, up to four pads; keyboard and mouse can hold one seat. Mats
 * light in seat colours as people press Cross or Space. Empty seats go to CPU guests.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new JoinScreen(host));
 */
import { SEAT_COLORS } from '../hud/seatDiscs';
import type { Input } from '../../../../engine';
import { promptHtml } from '../glyphs';
import { layer, type AppHost, type Screen } from './types';

/** The seats' colours. */
const COLORS = SEAT_COLORS;

/** Who holds a seat: a pad's index, or -1 for the keyboard. */
export interface Joined {
  seat: number;
  pad: number;
}

/** The people who joined, kept for the frame reader in app.ts. */
export const joined: Joined[] = [];

/** Reads a pad's seat input: [lean x, lean y, left foot, right foot, act]. */
export function padSeat(pad: Gamepad): number[] {
  const b = pad.buttons;
  const down = (i: number) => (b[i]?.value ?? 0) > 0.5 || Boolean(b[i]?.pressed);
  const trig = (i: number, s: number) => Math.max(b[i]?.value ?? 0, b[s]?.pressed ? 1 : 0);
  const dead = (v: number) => (Math.abs(v) < 0.12 ? 0 : v);
  const lx = dead(pad.axes[0] ?? 0) + (down(15) ? 1 : 0) - (down(14) ? 1 : 0);
  const ly = -dead(pad.axes[1] ?? 0) + (down(12) ? 1 : 0) - (down(13) ? 1 : 0);
  return [lx, ly, trig(6, 4), trig(7, 5), down(0) || down(1) || down(2) || down(3) ? 1 : 0];
}

/** The join screen. */
export class JoinScreen implements Screen {
  readonly name = 'join';
  readonly modal = true;
  private el: HTMLElement;
  private mats: HTMLElement[] = [];
  private foot: HTMLElement;
  private key = '';
  private padsDown = new Set<number>();
  private handler: (event: KeyboardEvent) => void;

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    joined.length = 0;
    this.el = layer(host.root);
    const panel = document.createElement('div');
    panel.className = 'tf-panel tf-card-hub';
    panel.dataset.panel = 'join';
    panel.innerHTML =
      '<div class="tf-h1">Group Class</div><div class="tf-sub">Three classes, four mats. Stand on one. Whoever wobbles least gets a sash.</div>';
    const mats = document.createElement('div');
    mats.className = 'tf-mats';
    panel.append(mats);
    for (let i = 0; i < 4; i++) {
      const mat = document.createElement('div');
      mat.className = 'tf-mat';
      mat.dataset.mat = String(i);
      mats.append(mat);
      this.mats.push(mat);
    }
    this.foot = document.createElement('div');
    this.foot.className = 'tf-prompts';
    this.foot.style.justifyContent = 'flex-start';
    panel.append(this.foot);
    this.el.append(panel);
    this.handler = (event) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      if (event.repeat) return;
      this.joinOrStart(-1);
    };
    addEventListener('keydown', this.handler);
    panel.addEventListener('click', () => this.joinOrStart(-1));
    this.drawMats();
  }

  /** The first press joins; a joined person's next press starts. */
  private joinOrStart(pad: number): void {
    const already = joined.find((j) => j.pad === pad);
    if (already) {
      this.start();
      return;
    }
    if (joined.length >= 4) return;
    joined.push({ seat: joined.length, pad });
    this.host.sound.play('sfx:squeak');
    this.drawMats();
  }

  private start(): void {
    const { host } = this;
    host.freePlay = false;
    host.closeAll();
    host.beginPlay();
    const cpuOn = host.settings.cpuGuests;
    const humans = joined.length;
    const single = humans <= 1;
    const seats = [0, 1, 2, 3].map((i) => {
      if (i < humans) return { kind: single ? 'local' : 'pad' };
      if (!cpuOn) return { kind: 'off' };
      return { kind: 'cpu', skill: 'human', sway: 0.7 + i * 0.2 };
    });
    host.act('game.group', { seats });
  }

  private drawMats(): void {
    this.mats.forEach((mat, i) => {
      const who = joined[i];
      mat.dataset.on = who ? 'true' : 'false';
      mat.style.background = who ? COLORS[i] : '';
      mat.textContent = who
        ? who.pad < 0
          ? 'Keyboard'
          : `Pad ${who.pad + 1}`
        : this.host.settings.cpuGuests
          ? 'CPU guest'
          : 'Empty';
    });
  }

  update(input: Input): void {
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad) continue;
      const down = Boolean(pad.buttons[0]?.pressed);
      if (down && !this.padsDown.has(pad.index)) {
        this.padsDown.add(pad.index);
        this.joinOrStart(pad.index);
      } else if (!down) this.padsDown.delete(pad.index);
    }
    if (input.pressed('uiCancel')) this.host.close(this);
    const key = `${this.host.device()}|${this.host.glyphs()}|${joined.length}`;
    if (key !== this.key) {
      this.key = key;
      const [d, g] = [this.host.device(), this.host.glyphs()];
      this.foot.innerHTML = `${promptHtml(d === 'gamepad' ? 'confirm' : 'both', joined.length ? 'Join, or press again to start' : 'Join', d, g)}${promptHtml('cancel', 'Back', d, g)}`;
    }
  }

  remove(): void {
    removeEventListener('keydown', this.handler);
    this.el.remove();
  }
}
