/**
 * @file The Line (PLAN.md section 6): a 40 m slackline across the lagoon with three flags. Alternate feet to step: each
 * step moves 0.75 m and kicks you sideways; the same foot twice is a stumble. Lean x fights it. Gusts come, telegraphed.
 * At 15 m the Gull lands on your arm until you flick it off. Falling is a large splash; Tare's boat takes you back to the
 * last flag. After 120 s the boat collects you.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'line');
 */
import { holdAt, type Player } from '../bot/players';
import { SEA_Y } from '../data/stations';
import { after, castOf, critterAway, critterGo, enter, moveProp, propFor, say, steps } from './kit';
import type { Activity, Ctx } from './types';

/** The line's length, m, its height over the water, its flags. */
const LENGTH = 40;
const HEIGHT = 3.2;
const FLAGS = [0, 13, 26];
const STEP = 0.75;
/** Par time, s, and the time the line closes. */
const PAR = 50;
const CLOSES = 120;
/** Where the Gull lands, m. */
const GULL_AT = 15;

/** The line's state. */
interface LineData {
  s: number;
  x0: number;
  z0: number;
  last: string;
  cool: number;
  falls: number;
  flag: number;
  gustIn: number;
  gustLeft: number;
  gustDir: number;
  warned: boolean;
  gull: 'waiting' | 'on' | 'gone';
  stickWas: number[];
  boat: number;
  time: number;
  end: boolean;
  walkT: number;
}

/** The Line. */
export const line: Activity = {
  id: 'line',
  title: 'The Line',
  station: 'lagoon',
  map: 'actionMap:balance',
  shot: 'line',
  wobble: true,
  setup(c) {
    const { x, z } = c.station;
    const [x0, z0] = [x, z + 8];
    const d: LineData = { s: 0, x0, z0, last: '', cool: 0, falls: 0, flag: 0, gustIn: steps(c, c.w.rng('line').range(4, 7)), gustLeft: 0, gustDir: 1, warned: false, gull: 'waiting', stickWas: [], boat: -1, time: 0, end: false, walkT: 0 }; // prettier-ignore
    c.a.data = d as unknown as Record<string, unknown>;
    propFor(c, { prop: 'prop:slackPost', at: [x0, SEA_Y + HEIGHT - 1.2, z0 - 0.4], yaw: 0 });
    propFor(c, { prop: 'prop:slackPost', at: [x0, SEA_Y + HEIGHT - 1.2, z0 + LENGTH + 0.4], yaw: 0 });
    propFor(c, { prop: 'prop:slackLine', at: [x0, SEA_Y + HEIGHT, z0], yaw: 0 });
    for (const flag of FLAGS)
      propFor(c, { prop: 'prop:lineFlag', at: [x0 + 0.4, SEA_Y + HEIGHT - 0.1, z0 + flag], yaw: 0 });
    d.boat = propFor(c, { prop: 'prop:boat', at: [x0 + 5, SEA_Y, z0], yaw: 0 });
    const guest = castOf(c.w, 'guest');
    if (guest)
      Object.assign(guest.cast, { hold: true, x: x0, y: SEA_Y + HEIGHT, z: z0, yaw: 0, pose: 'LineWalk', poseT: 1 });
    const tare = castOf(c.w, 'tare');
    if (tare) Object.assign(tare.cast, { hold: true, x: x0 + 5, y: SEA_Y + 0.3, z: z0, yaw: -1.2 });
    c.hud.disc = true;
    c.hud.feet = true;
    c.hud.title = 'The Line';
    enter(c, 'walk');
    say(c, 'tare', 'line.start');
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as LineData;
    const [{ seat, wobble: wob }] = c.seats;
    const guest = castOf(c.w, 'guest');
    d.time += 1;
    wob.usesBreath = false;
    const cast = guest?.cast;
    if (c.a.phase === 'fall') {
      if (cast) {
        cast.y = Math.max(SEA_Y - 0.8, cast.y - c.w.dt * 7);
        cast.pose = 'LineFall';
        cast.poseT = 1;
        cast.leanX = 0;
      }
      if (c.a.pt === steps(c, 0.45)) c.w.emit('splashBig', { x: d.x0, z: d.z0 + d.s, y: SEA_Y });
      if (after(c, 3)) {
        d.s = FLAGS[d.flag];
        d.last = '';
        Object.assign(wob, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, recover: 0 });
        if (cast) Object.assign(cast, { y: SEA_Y + HEIGHT, pose: 'LineWalk', poseT: 1 });
        enter(c, 'walk');
      }
      moveProp(c.w, d.boat, d.x0 + 3 - Math.min(1, c.a.pt / 90), SEA_Y, d.z0 + d.s, 0);
      return;
    }
    // Steps.
    d.cool = Math.max(0, d.cool - 1);
    const kick = c.w.settings.get<number>('game.line.stepKick');
    const pressed = seat.pfl ? 'L' : seat.pfr ? 'R' : '';
    if (pressed && d.cool === 0) {
      if (pressed === d.last) {
        wob.vx += pressed === 'L' ? -0.9 : 0.9;
        c.w.emit('stumble', { foot: pressed });
      } else {
        d.s = Math.min(LENGTH, d.s + STEP);
        wob.vx += (pressed === 'L' ? 1 : -1) * kick;
        d.walkT = 8;
        c.w.emit('lineStep', { foot: pressed, s: d.s });
        for (let f = FLAGS.length - 1; f > d.flag; f--) {
          if (d.s >= FLAGS[f]) {
            d.flag = f;
            c.w.emit('lineFlag', { flag: f });
            say(c, 'tare', 'line.flag');
            break;
          }
        }
      }
      d.last = pressed;
      d.cool = 6;
    }
    // Gusts, telegraphed 1.5 s ahead.
    if (d.gustLeft > 0) {
      d.gustLeft -= 1;
      wob.dx += d.gustDir * c.w.settings.get<number>('game.line.gust') * 4;
    } else {
      d.gustIn -= 1;
      if (!d.warned && d.gustIn <= steps(c, 1.5)) {
        d.warned = true;
        d.gustDir = c.w.rng('line').chance(0.5) ? 1 : -1;
        c.w.emit('gustWarn', { dir: d.gustDir });
      }
      if (d.gustIn <= 0) {
        d.gustLeft = steps(c, 1.4);
        d.warned = false;
        d.gustIn = steps(c, c.w.rng('line').range(6, 10));
      }
    }
    // The Gull.
    d.stickWas.push(seat.lx);
    if (d.stickWas.length > 15) d.stickWas.shift();
    if (d.gull === 'waiting' && d.s >= GULL_AT && cast) {
      d.gull = 'on';
      say(c, 'tare', 'line.gull');
      c.w.emit('gullLands', {});
    }
    if (d.gull === 'on') {
      wob.dx += 2.6;
      if (cast) critterGo(c, 'gull', cast.x - 0.32, cast.y + 1.3, cast.z, 1.2);
      const flick = Math.max(...d.stickWas) - Math.min(...d.stickWas);
      if (flick > 1.2) {
        d.gull = 'gone';
        critterAway(c, 'gull');
        c.w.emit('gullFlicked', {});
        say(c, 'tare', 'line.flicked');
      }
    }
    if (cast) {
      cast.x = d.x0 - wob.x * 0.3; // they walk away from you: your right is their right, which is west
      cast.z = d.z0 + d.s;
      cast.leanX = wob.x * 1.2;
      cast.leanY = wob.y * 0.5;
      cast.pose = 'LineWalk';
      cast.poseT = 1;
    }
    moveProp(c.w, d.boat, d.x0 + 5, SEA_Y + Math.sin(c.a.t * 0.04) * 0.05, d.z0 + d.s * 0.9, 0);
    c.hud.ring = [0, 0, 0.7];
    const gust = d.warned ? d.gustDir : 0;
    c.hud.meter = d.s / LENGTH;
    c.hud.meterLabel = `${Math.round(d.s)} of ${LENGTH} m`;
    c.hud.show = { gust, gull: d.gull === 'on', falls: d.falls };
    // Falling.
    if (wob.recover > 0) {
      d.falls += 1;
      say(c, 'tare', 'line.fall');
      c.w.emit('lineFall', {});
      enter(c, 'fall');
    } else if (d.s >= LENGTH) {
      say(c, 'tare', 'line.done');
      c.a.done = true;
    } else if (d.time >= steps(c, CLOSES)) {
      say(c, 'tare', 'line.closes');
      c.a.done = true;
    }
  },
  teardown(c) {
    critterAway(c, 'gull');
  },
  bot(c, e, player: Player) {
    const d = c.a.data as unknown as LineData;
    const { seat, wobble } = e;
    seat.act = false;
    holdAt(c.w, seat, wobble, 0, 0, player);
    seat.ly = 0;
    if (!player.acts) {
      seat.fl = seat.fr = 0;
      return;
    }
    const mem = seat.mem as { tick?: number; flick?: number };
    mem.tick = (mem.tick ?? 0) + 1;
    const cadence = player.name === 'perfect' ? 30 : player.name === 'human' ? 44 : 60;
    const foot = mem.tick % cadence;
    const left = Math.floor(mem.tick / cadence) % 2 === 0;
    seat.fl = left && foot < 6 ? 1 : 0;
    seat.fr = !left && foot < 6 ? 1 : 0;
    if (d.gull === 'on') {
      mem.flick = (mem.flick ?? 0) + 1;
      const wait = player.name === 'perfect' ? 30 : player.name === 'human' ? 90 : 240;
      if (mem.flick > wait) seat.lx = mem.flick % 16 < 8 ? 1 : -1;
    }
  },
  score(c) {
    const d = c.a.data as unknown as LineData;
    const seconds = d.time / c.w.hz;
    return Math.max(0, 1000 - 150 * d.falls - 8 * Math.max(0, seconds - PAR)) * (d.s / LENGTH);
  },
};
