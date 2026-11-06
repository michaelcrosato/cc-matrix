/** @file The game's small automation and credits interface, also used by the acceptance drivers. */
import { TITLE } from '../title';
import { audio } from '../sounds/page';
import { audioCheck } from './audio-check';
import { inspectorDigest } from '../net/lockstep';
import type { Context } from './context';
import type { Attract } from '../attract';
export function publish(ctx: Context, director: Attract): void {
  const gameAPI = {
    title: TITLE,
    audioCheck,
    audio,
    screen: () => (ctx.p?.seat?.data.map && ctx.screen === 'play' ? 'map' : ctx.screen),
    open: (name: string) => ctx.open(name),
    start: (mode = 'story', merc = 0) => ctx.start(mode, merc),
    digest: () => (ctx.inspector() ? inspectorDigest(ctx.inspector()!) : ''),
    context: ctx,
    attract: director,
  };
  (window as unknown as { __game: typeof gameAPI }).__game = gameAPI;
}
