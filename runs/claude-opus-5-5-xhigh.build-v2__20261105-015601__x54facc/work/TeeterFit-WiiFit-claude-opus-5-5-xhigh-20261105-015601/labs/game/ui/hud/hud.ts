/**
 * @file The in-play HUD: the disc, the title and meter, the big number, speech, the prompts for the device used last, and
 * each activity's own small widget. It reads the `hud` an activity writes; one idea at a time.
 *
 * Game code, a page's.
 *
 * @example
 * // hud.update(view);
 */
import type { ActivityData, HudData, Seat, Wobble } from '../../scenes/components';
import { glyph, promptHtml, type Device, type GlyphSet, type Verb } from '../glyphs';
import { Disc } from './disc';
import { SeatDiscs, type SeatView } from './seatDiscs';
import { renderWidgets, type WidgetHost } from './widgets';

/** What the HUD reads each frame. */
export interface HudView {
  activity: ActivityData | null;
  hud: HudData | null;
  id: string;
  phase: string;
  wobble?: Wobble;
  seat?: Seat;
  /** Group Class with more than one seat: each gets a small disc, and the big one steps aside. */
  seats?: readonly SeatView[];
  device: Device;
  glyphs: GlyphSet;
  sessionClass?: string;
}

/** The prompts each activity shows, as verbs and words: two or three at most. */
const HINTS: Readonly<Record<string, readonly (readonly [Verb, string])[]>> = {
  morning: [['lean', 'Lean']],
  ring: [['lean', 'Stay in the ring']],
  pond: [['both', 'Breathe, nothing else']],
  reps: [['lean', 'Follow the band']],
  step: [
    ['footL', 'Left'],
    ['footR', 'Right'],
    ['both', 'Both'],
  ],
  line: [
    ['footL', 'Left'],
    ['footR', 'Right'],
    ['lean', 'Lean against it'],
  ],
  paddle: [
    ['lean', 'Lean to go and steer'],
    ['footL', 'Paddle'],
    ['footR', 'Paddle'],
  ],
  garden: [['lean', 'Tilt the tray']],
  plunge: [
    ['both', 'Hold to compose'],
    ['lean', 'Keep in the ring'],
  ],
  'plunge.go': [['both', 'Let go at the top']],
  'plunge.air': [['lean', 'Spin and twist']],
  'plunge.cards': [],
  'pose.demo': [['confirm', 'Skip']],
  'pose.enter': [['lean', 'Follow the dot']],
  pose: [
    ['lean', 'Stay in the ring'],
    ['both', 'Breathe in time'],
  ],
  'pose.chair': [
    ['lean', 'Stay in the ring'],
    ['both', 'Hold both feet'],
  ],
  'pose.heron': [
    ['lean', 'Stay in the ring'],
    ['footL', 'Hold the left foot'],
    ['footR', 'Tap to breathe'],
  ],
  'tilt.storm': [['confirm', 'Skip']],
  'tilt.weights': [
    ['footL', 'Crank'],
    ['footR', 'Crank'],
    ['lean', 'Lean into the slope'],
  ],
  'tilt.stone': [
    ['lean', 'You are the island'],
    ['both', 'Breathe'],
  ],
  'tilt.dawn': [],
  hoop: [
    ['lean', 'Spin in circles'],
    ['footL', 'Or left, right, fast'],
  ],
  jog: [
    ['lean', 'Steer'],
    ['footL', 'Pace'],
    ['footR', 'Pace'],
  ],
  tilt: [
    ['lean', 'Walk'],
    ['both', 'Hold, then let go: Calm Call'],
  ],
  group: [
    ['lean', 'Lean'],
    ['both', 'Breathe'],
  ],
};

/** The HUD. */
export class Hud implements WidgetHost {
  readonly el: HTMLElement;
  private disc: Disc;
  private seatDiscs: SeatDiscs;
  private title: HTMLElement;
  private titleText: HTMLElement;
  private titleSub: HTMLElement;
  private meter: HTMLElement;
  private big: HTMLElement;
  private prompts: HTMLElement;
  readonly widgets: HTMLElement;
  private promptKey = '';
  device: Device = 'keyboard';
  glyphs: GlyphSet = 'playstation';

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tf-hud';
    this.el.dataset.ui = 'hud';
    parent.append(this.el);
    this.disc = new Disc(this.el);
    this.seatDiscs = new SeatDiscs(this.el);
    this.title = document.createElement('div');
    this.title.className = 'tf-chip';
    this.title.style.left = 'var(--safe)';
    this.title.style.top = 'var(--safe)';
    this.titleText = document.createElement('div');
    this.titleSub = document.createElement('small');
    this.meter = document.createElement('div');
    this.meter.className = 'tf-meter';
    this.meter.append(document.createElement('i'));
    this.title.append(this.titleText, this.titleSub, this.meter);
    this.el.append(this.title);
    this.big = document.createElement('div');
    this.big.className = 'tf-big';
    this.el.append(this.big);
    this.prompts = document.createElement('div');
    this.prompts.className = 'tf-prompts tf-chip';
    this.prompts.style.left = 'var(--safe)';
    this.prompts.style.bottom = 'var(--safe)';
    this.el.append(this.prompts);
    this.widgets = document.createElement('div');
    this.el.append(this.widgets);
    this.hide();
  }

  /** Hides everything. */
  hide(): void {
    this.el.style.display = 'none';
  }

  /** A glyph, for a widget. */
  glyph(verb: Verb): string {
    return glyph(verb, this.device, this.glyphs);
  }

  /** One frame. */
  update(view: HudView): void {
    if (!view.hud || !view.activity) {
      this.hide();
      return;
    }
    this.el.style.display = '';
    this.device = view.device;
    this.glyphs = view.glyphs;
    const hud = view.hud;
    this.disc.update(view.wobble, view.seat, view.seats ? { ...hud, disc: false, feet: false } : hud);
    this.seatDiscs.update(view.seats ?? [], hud);
    this.titleText.textContent = hud.title ?? '';
    this.titleSub.textContent = hud.meterLabel ?? '';
    this.titleSub.style.display = hud.meterLabel ? '' : 'none';
    this.meter.style.display = hud.meter === undefined ? 'none' : '';
    (this.meter.firstChild as HTMLElement).style.width = `${Math.round((hud.meter ?? 0) * 100)}%`;
    this.big.textContent = hud.big ?? '';
    this.big.style.display = hud.big ? '' : 'none';
    // Prompts follow the device, the same frame.
    const id = view.sessionClass ?? view.id;
    const isPose = id.startsWith('pose') || id === 'heron';
    const show = (hud.show ?? {}) as { pose?: string; needs?: string };
    const poseKey =
      view.phase === 'hold' && show.needs === 'both'
        ? 'pose.chair'
        : view.phase === 'hold' && show.needs === 'L'
          ? 'pose.heron'
          : view.phase === 'hold'
            ? 'pose'
            : `pose.${view.phase}`;
    const list =
      id === 'podium'
        ? []
        : isPose
          ? (HINTS[poseKey] ?? HINTS.pose)
          : (HINTS[`${id}.${view.phase}`] ?? HINTS[id] ?? HINTS.ring);
    const key = `${id}|${show.needs}|${view.device}|${view.glyphs}|${view.phase}`;
    if (key !== this.promptKey) {
      this.promptKey = key;
      this.prompts.innerHTML = list.map(([verb, word]) => promptHtml(verb, word, view.device, view.glyphs)).join('');
      this.prompts.style.display = list.length ? '' : 'none';
    }
    renderWidgets(this, id, view);
  }
}
