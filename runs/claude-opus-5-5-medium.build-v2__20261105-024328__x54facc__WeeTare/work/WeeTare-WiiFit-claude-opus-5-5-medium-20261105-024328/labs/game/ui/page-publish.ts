/**
 * @file `window.__game`, the small read-only handle tests read: the screen, attract, the last device, the glyph set, the volumes, the
 * day, the activity, the focus, and a sound probe.
 */
import { probeAudio } from '../audio/probe';
import type { Sound } from '../audio/sound';
import { GUEST_BUILDS, guestBody } from '../cast/people';
import type { Flow } from '../scenes/types';
import type { Settings } from './ctx';
import { TITLE } from './titles';

export function publishGame(a: {
  screen: string;
  attract: boolean;
  touchOnly: boolean;
  focusIn: HTMLElement;
  root: HTMLElement;
  settings: Settings;
  sound: Sound;
  flow: Flow;
  setting: (key: string) => unknown;
}): void {
  const { flow, settings, sound } = a;
  (window as unknown as { __game: object }).__game = {
    screen: a.screen,
    attract: a.attract,
    device: a.root.dataset.device,
    glyphs: settings.icons,
    music: sound.audio.volume('music'),
    effects: sound.audio.volume('effects'),
    day: flow.day,
    mode: flow.mode,
    event: flow.ev?.id ?? '',
    phase: flow.ev?.phase ?? '',
    focus: (a.focusIn.querySelector('[data-focus="1"]') as HTMLElement | null)?.dataset.id ?? '',
    touchOnly: a.touchOnly,
    title: TITLE,
    probeAudio,
    setting: a.setting,
    builds: GUEST_BUILDS.length,
    body: guestBody(settings.look, settings.colour, settings.headband),
  };
}
