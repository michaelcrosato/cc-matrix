/**
 * @file Still Pond (PLAN.md section 6): the funniest thing in the game, and almost no input. Composure starts at 1000.
 * The only correct input is breathing with the guide; anything else is "You moved". Every 6 to 10 s a lure from the
 * seeded table asks you to press something. Doing nothing at all earns exactly 500.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'pond');
 */
import { breathe, type Player } from '../bot/players';
import { LURES } from '../data/lures';
import { MAT_OFFSETS } from '../data/stations';
import { after, castOf, critterAway, critterGo, enter, floorShape, say, standSeats, steps } from './kit';
import type { Activity, Ctx, SeatEntity } from './types';

/** The stick travel, in lean units, that counts as moving. */
const STICK = 0.25;
/** Mouse travel per step that counts. */
const MOUSE = 0.04;
/** Steps a single foot may be down alone before it is a stray foot: the two triggers rarely go down together. */
const FOOT_GRACE = 12;
/** A second's debounce. */
const DEBOUNCE = 60;
/** Length of the sit, s. */
const LENGTH = 75;
const SHORT = 45;
const LEAD = 6;

/** One seat's numbers. */
interface PondSeat {
  composure: number;
  moved: number;
  cool: number;
  alone: number;
  syncSum: number;
  total: number;
}

/** The sit's state. */
interface PondData {
  seats: PondSeat[];
  lure: number;
  lureLeft: number;
  next: number;
  order: number[];
  shown: number;
  frog: number;
  ripple: number;
  rippleT: number;
}

/** Whether this seat moved this step. */
function moved(e: SeatEntity, s: PondSeat): boolean {
  const { seat } = e;
  const oneFoot = seat.fl >= 0.5 !== seat.fr >= 0.5;
  s.alone = oneFoot ? s.alone + 1 : 0;
  return Math.hypot(seat.lx, seat.ly) > STICK || seat.act || s.alone > FOOT_GRACE || seat.moved > MOUSE;
}

/** Still Pond. */
export const pond: Activity = {
  id: 'pond',
  title: 'Still Pond',
  station: 'pond',
  map: 'actionMap:balance',
  shot: 'pond',
  wobble: true,
  setup(c) {
    const order: number[] = LURES.map((_lure, i) => i);
    const d: PondData = {
      seats: [0, 1, 2, 3].map(() => ({ composure: 1000, moved: 0, cool: 0, alone: 0, syncSum: 0, total: 0 })),
      lure: -1,
      lureLeft: 0,
      next: steps(c, 6 + (c.a.short ? LEAD : 0)),
      order,
      shown: 0,
      frog: 0,
      ripple: -1,
      rippleT: 0,
    };
    c.a.data = d as unknown as Record<string, unknown>;
    c.hud.disc = true;
    c.hud.guide = true;
    c.hud.feet = true;
    c.hud.title = 'Still Pond';
    c.hud.show = { composure: 1000 };
    if (c.round) standSeats(c, MAT_OFFSETS, Math.PI);
    else {
      const guest = castOf(c.w, 'guest');
      if (guest)
        Object.assign(guest.cast, { hold: true, x: c.station.x, y: c.station.y + 0.45, z: c.station.z, yaw: Math.PI });
    }
    for (const e of c.seats) {
      e.wobble.swayMul = 0.2;
      const cast = c.w.get(e.seat.actor)?.cast;
      if (cast) Object.assign(cast, { pose: 'Nothing', poseT: 1 });
    }
    if (!c.round) {
      // You sit on a jetty at dawn, and the Frog is already there.
      c.w.query('island')[0].island.sky = 'dawn';
      const guest = castOf(c.w, 'guest');
      if (guest) critterGo(c, 'frog', guest.cast.x + 1.5, guest.cast.y - 0.2, guest.cast.z - 1.6, 2.6);
      d.ripple = floorShape(c, '', c.station.x, c.station.y - 0.6, c.station.z - 3);
    }
    enter(c, c.a.short ? 'lead' : 'sit');
    say(c, 'plumb', 'pond.start');
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as PondData;
    if (c.a.phase === 'lead') {
      c.hud.big = String(Math.max(1, LEAD - Math.floor(c.a.pt / c.w.hz)));
      if (after(c, LEAD)) {
        c.hud.big = '';
        enter(c, 'sit');
      }
      return;
    }
    const length = steps(c, c.a.short ? SHORT : LENGTH);
    c.hud.meter = 1 - c.a.pt / length;
    for (const e of c.seats) {
      const s = d.seats[e.seat.index];
      s.total += 1;
      s.syncSum += e.wobble.sync;
      s.cool = Math.max(0, s.cool - 1);
      if (moved(e, s) && s.cool === 0) {
        s.cool = DEBOUNCE;
        s.moved += 1;
        s.composure = Math.max(0, s.composure - c.w.settings.get<number>('game.pond.penalty'));
        c.w.emit('moved', { seat: e.seat.index, composure: s.composure });
        const cast = c.w.get(e.seat.actor)?.cast;
        if (cast && e.seat.index === c.seats[0].seat.index) {
          c.w.emit('ripple', { x: cast.x, y: cast.y, z: cast.z - 1.6 });
          d.rippleT = 90;
          // The Frog turns to look.
          if (d.lure < 0) critterGo(c, 'frog', cast.x + 1.5, cast.y - 0.2, cast.z - 1.6, -0.9);
        }
      }
      const cast = c.w.get(e.seat.actor)?.cast;
      if (cast) {
        cast.leanX = -e.wobble.x * 0.5;
        cast.leanY = e.wobble.y * 0.5 + e.wobble.lungs * 0.18;
      }
    }
    if (d.ripple >= 0) {
      d.rippleT = Math.max(0, d.rippleT - 1);
      const ring = c.w.get(d.ripple)?.matRing;
      if (ring) {
        ring.telegraph = d.rippleT > 0 ? 'telegraph:ripple' : '';
        ring.size = 0.6 + (90 - d.rippleT) * 0.09;
      }
    }
    c.hud.show = { composure: d.seats[c.seats[0].seat.index].composure, lure: d.lure >= 0 ? LURES[d.lure].id : '' };
    // The lures.
    if (d.lure >= 0) {
      d.lureLeft -= 1;
      if (d.lureLeft <= 0) {
        const guest = c.w.get(c.seats[0].seat.actor)?.cast;
        if (guest && !c.round) critterGo(c, 'frog', guest.x + 1.5, guest.y - 0.2, guest.z - 1.6, 2.6);
        else critterAway(c, 'frog');
        critterAway(c, 'gull');
        d.lure = -1;
        d.next = steps(c, c.w.rng('pond').range(6, 10));
      }
    } else if (--d.next <= 0 && d.shown < LURES.length) {
      const lure = LURES[d.order[d.shown]];
      d.lure = d.order[d.shown];
      d.shown += 1;
      d.lureLeft = steps(c, lure.stays);
      c.w.emit('lure', { id: lure.id });
      if (lure.who) say(c, lure.who, `pond.lure.${lure.id}`);
      const guest = c.w.get(c.seats[0].seat.actor)?.cast;
      if (guest && lure.critter === 'frog')
        critterGo(c, 'frog', guest.x + 0.25, guest.y + 0.45, guest.z + 0.2, Math.PI);
      if (guest && lure.critter === 'gull') critterGo(c, 'gull', guest.x, guest.y + 1.12, guest.z, 0);
    }
    if (c.a.pt >= length) {
      say(c, 'plumb', 'pond.end');
      c.a.done = true;
    }
  },
  teardown(c) {
    critterAway(c, 'frog');
    critterAway(c, 'gull');
    if (!c.round) c.w.query('island')[0].island.sky = 'day';
  },
  bot(c, e, player: Player) {
    const { seat, wobble } = e;
    const d = c.a.data as unknown as PondData;
    seat.lx = seat.ly = 0;
    seat.act = false;
    breathe(c.w, seat, wobble, player);
    // A person sometimes falls for a lure: the human for the fake pause, the sloppy for three of them.
    if (d.lure >= 0 && d.lureLeft === steps(c, LURES[d.lure].stays) - 30) {
      const lure = LURES[d.lure].id;
      if ((player.name === 'human' && lure === 'pause') || (player.name === 'sloppy' && ['press', 'pause', 'disconnected'].includes(lure))) seat.act = true; // prettier-ignore
    }
  },
  score(c, index) {
    const d = c.a.data as unknown as PondData;
    const s = d.seats[index];
    const sync = s.total > 0 ? s.syncSum / s.total : 0;
    return s.composure * (0.5 + 0.5 * sync);
  },
};
