/**
 * @file The Line (about 75 s): a 40 m slackline with three flags. Alternate feet to step (0.75 m each, with a sideways kick of
 * `game.line.stepKick`); the same foot twice is a stumble. Lean x fights the kick. Gusts every 6-10 s, telegraphed 1.5 s
 * ahead; at 15 m the Gull lands on your arm (a steady bias) until you flick the stick fast. A fall is a splash, then the
 * boat takes you back to the last flag; after 120 s the boat collects you. Score: 1000 - 150 per fall - 8 per second over
 * 50, times the share of the line crossed. Sim-side.
 * @example
 * LINE_LENGTH; // 40
 */
import { botSeat, noise, type Bot } from '../bot/players';
import { STATIONS } from '../data/world';
import { actorId, placeCast, placeGuest } from '../cast';
import { physicsOf } from '../../../../engine/sim-api';
import { stand } from '../spawn';
import { clamp, go, say, secs, type Activity } from './types';

export const LINE_LENGTH = 40;
const R = {
  p: 1,
  falls: 2,
  flag: 3,
  foot: 4,
  prevL: 5,
  prevR: 6,
  nextGust: 7,
  warn: 8,
  gust: 9,
  gustDir: 10,
  bird: 11,
  flicked: 12,
  prevLx: 13,
  flick: 14,
  stumbles: 15,
  botT: 16,
  botFoot: 17,
};
/** Where the line runs: from the headland at the lagoon's north-west towards the rock. */
export const lineAt = (p: number): [number, number] => [STATIONS.lagoon.at[0] + 4, STATIONS.lagoon.at[1] - 20 + p];
export const line: Activity = {
  id: 'line',
  title: 'The Line',
  station: 'lagoon',
  camera: 'line',
  map: 'balance',
  seconds: 75,
  hasShort: false,
  setup(c) {
    const a = c.run.a;
    a[R.nextGust] = secs(5) + c.w.rng('line').int(0, 200);
    go(c.run, 'walk');
    say(c, 'tare', 'tare.line.begin');
    if (c.lead) {
      // an invisible walkway under the rope, so the guest can really walk it (a fixed body 0.6 m wide at the sea's height)
      const [wx, wz] = lineAt(LINE_LENGTH / 2);
      c.run.a[22] = physicsOf(c.w).addBody({
        type: 'fixed',
        group: 'world',
        position: [wx, 1.9, wz],
        colliders: [{ shape: { type: 'box', size: [0.6, 0.2, LINE_LENGTH + 1] } }],
      } as never);
    }
    if (c.lead && !c.w.settings.get<boolean>('game.lite')) {
      // the rope with a flag post at each third, drawn over the lagoon (the props stand on the sea at y 2)
      const [mx, mz] = lineAt(LINE_LENGTH / 2);
      c.run.ids.push(stand(c.w, 'prop:line', mx, mz, 0, 0.2));
      for (let k = 0; k <= 3; k++) {
        const [px, pz] = lineAt((k * LINE_LENGTH) / 3);
        c.run.ids.push(stand(c.w, 'prop:post', px, pz, 0, 0.2));
      }
    }
  },
  teardown(c) {
    try {
      physicsOf(c.w).removeBody(c.run.a[22]);
    } catch {
      /* the walkway is already gone */
    }
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    const s = me.seat;
    const kick = c.p('game.line.stepKick'),
      gustK = c.p('game.line.gust');
    const pl = s.fl > 0.5 && a[R.prevL] <= 0.5,
      pr = s.fr > 0.5 && a[R.prevR] <= 0.5;
    a[R.prevL] = s.fl;
    a[R.prevR] = s.fr;
    if (b.recover === 0 && (pl || pr)) {
      const foot = pl && pr ? 3 : pl ? 1 : 2;
      if (foot === 3 || foot === a[R.foot]) {
        a[R.stumbles] += 1;
        b.vx += (noise2(a, 1) ? 1 : -1) * kick * 5;
        c.w.emit('stumble', {});
      } else {
        a[R.p] = Math.min(LINE_LENGTH, a[R.p] + 0.75);
        b.vx += (foot === 1 ? 1 : -1) * kick * 10;
        c.w.emit('lineStep', { p: a[R.p] });
      }
      a[R.foot] = foot === 3 ? a[R.foot] : foot;
    }
    // gusts: warn 1.5 s ahead, then push for a second
    if (a[0] === a[R.nextGust]) {
      a[R.warn] = 90;
      a[R.gustDir] = c.w.rng('line').chance(0.5) ? 1 : -1;
      c.w.emit('gustWarn', { dir: a[R.gustDir] });
    }
    if (a[R.warn] > 0) {
      a[R.warn] -= 1;
      if (a[R.warn] === 0) {
        a[R.gust] = 60;
        a[R.nextGust] = a[0] + secs(6) + c.w.rng('line').int(0, 240);
      }
    }
    if (a[R.gust] > 0) {
      a[R.gust] -= 1;
      b.dx += a[R.gustDir] * gustK * 8;
    }
    // the Gull lands at 15 m and leans on your arm until a fast flick
    if (a[R.p] >= 15 && !a[R.bird] && !a[R.flicked]) {
      a[R.bird] = 1;
      c.w.emit('gull', {});
      say(c, 'tare', 'tare.line.gull');
    }
    if (a[R.bird]) b.dx += 2.2;
    a[R.flick] = a[R.flick] * 0.92 + Math.abs(s.lx - a[R.prevLx]);
    a[R.prevLx] = s.lx;
    if (a[R.bird] && a[R.flick] > 1.1) {
      a[R.bird] = 0;
      a[R.flicked] = 1;
      c.w.emit('flick', {});
    }
    if (b.toppled) {
      a[R.falls] += 1;
      a[R.p] = Math.floor(a[R.p] / (LINE_LENGTH / 3)) * (LINE_LENGTH / 3);
      a[R.foot] = 0;
      c.w.emit('splash', { big: 1 });
      say(c, 'tare', 'tare.line.fall');
    }
    const id = actorId(c.w, me.cast.who);
    const [lx, lz] = lineAt(a[R.p]);
    if (c.lead && id >= 0 && a[0] % 6 === 0 && b.recover === 0) placeGuest(c.w, [lx, 2, lz], 0);
    const sec = a[0] / 60;
    if (a[R.p] >= LINE_LENGTH || sec >= 120) {
      const share = a[R.p] / LINE_LENGTH;
      run.score = clamp(1000 - 150 * a[R.falls] - 8 * Math.max(0, sec - 50), 0, 1000) * share;
      run.done = 1;
      if (sec >= 120 && share < 1) say(c, 'tare', 'tare.line.closed');
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const s = me.seat;
    const cadence = bot.kind === 'perfect' ? 24 : bot.kind === 'human' ? 32 : 42;
    botSeat(bot, me.wobble, s, 0, 0, 0, 0);
    s.fl = 0;
    s.fr = 0;
    if (bot.kind === 'idle' || me.wobble.recover > 0) return;
    // flick the bird off: a fast stick flip
    if (a[R.bird]) {
      s.lx = a[0] % 8 < 4 ? 1 : -1;
      return;
    }
    a[R.botT] += 1;
    if (a[R.botT] >= cadence) {
      a[R.botT] = 0;
      a[R.botFoot] = a[R.botFoot] === 1 ? 2 : 1;
      if (bot.kind === 'sloppy' && noise(bot) > 0.85) a[R.botFoot] = a[R.botFoot] === 1 ? 2 : 1;
    }
    if (a[R.botT] < 4 && a[R.botFoot] > 0) {
      if (a[R.botFoot] === 1) s.fl = 1;
      else s.fr = 1;
    }
    void run;
  },
};
const noise2 = (a: number[], k: number): boolean => ((a[0] * 2654435761 + k) >>> 7) % 2 === 0;
void placeCast;
