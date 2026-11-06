/**
 * @file Cliff Plunge (PLAN.md section 6): three dives from a 14 m cliff. Compose: hold ring and breath for 4 s to fill
 * power. Go: release both feet as a swinging gauge peaks. Air: lean y spins you, lean x twists, scrubbing a rotation
 * strip. Enter the water within 15 degrees of vertical. Three Gulls hold up score cards, 0 to 10; one always scores 4.
 * Wait too long at the lip and you slip off anyway: a small splash, low cards.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'plunge');
 */
import { holdAt, type Player } from '../bot/players';
import { SEA_Y } from '../data/stations';
import { bothFeet, inRing } from '../wobble';
import { after, castOf, enter, propFor, say } from './kit';
import type { Activity, Ctx } from './types';

/** Seconds: how long composing may wait, the gauge's swing, the cards. */
const WAIT = 12;
const SWING = 1.4;
const GO_BOX = 5;
const CARDS_FOR = 3.2;
const RING = 0.28;
/** Gravity on a diver, m/s2. */
const FALL = 9.5;
/** Fifteen degrees, the clean entry. */
const CLEAN = (15 * Math.PI) / 180;
/** How many dives. */
const DIVES = 3;

/** The dives' state. */
interface PlungeData {
  dive: number;
  power: number;
  gauge: number;
  q: number;
  y: number;
  vy: number;
  z: number;
  x: number;
  angle: number;
  twist: number;
  lipY: number;
  lipZ: number;
  cards: number[][];
  sum: number;
  slip: boolean;
  entry: number;
  airT: number;
}

/** The three judges' cards for a dive. */
function cardsOf(c: Ctx, d: PlungeData): number[] {
  if (d.slip) return [1, 2, 4];
  const full = Math.PI + 2 * Math.PI * Math.max(0, Math.round((d.angle - Math.PI) / (2 * Math.PI)));
  const err = Math.abs(d.angle - full);
  d.entry = err;
  const entry = err <= CLEAN ? 1 : Math.max(0, 1 - (err - CLEAN) / 1.05);
  const flips = Math.floor((Math.abs(d.angle) + CLEAN) / (2 * Math.PI)) + (Math.abs(d.angle) > 2.5 ? 0.5 : 0);
  const twists = Math.abs(d.twist) > 5 ? 1 : 0;
  const base = 1 + 5 * entry + 2 * d.q + (flips >= 1 ? 1 : 0) + twists;
  const j1 = Math.max(0, Math.min(10, Math.round(base)));
  const j2 = Math.max(0, Math.min(10, Math.round(base + c.w.rng('judges').range(-0.6, 0.4))));
  return [j1, j2, 4];
}

/** Sets up the next dive at the lip. */
function toLip(c: Ctx, d: PlungeData): void {
  const guest = castOf(c.w, 'guest');
  const e = c.seats[0].wobble;
  Object.assign(e, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, sync: 0, calm: 0, lungs: 0, recover: 0 });
  Object.assign(d, {
    power: 0,
    gauge: 0,
    q: 0,
    y: d.lipY,
    vy: 0,
    z: d.lipZ,
    x: c.station.x,
    angle: 0,
    twist: 0,
    slip: false,
    airT: 0,
  });
  if (guest)
    Object.assign(guest.cast, {
      hold: true,
      x: d.x,
      y: d.lipY,
      z: d.z,
      yaw: Math.PI,
      pose: 'DiveReady',
      poseT: 0,
      leanX: 0,
      leanY: 0,
    });
  c.hud.title = `Dive ${d.dive + 1} of ${DIVES}`;
  enter(c, 'compose');
  say(c, 'plumb', 'plunge.compose');
}

/** Cliff Plunge. */
export const plunge: Activity = {
  id: 'plunge',
  title: 'Cliff Plunge',
  station: 'cliff',
  map: 'actionMap:balance',
  shot: 'plunge',
  wobble: true,
  setup(c) {
    const { x, z } = c.station;
    const lipY = c.ground(x, z) + 0.2;
    const lipZ = z - 8.6;
    const d: PlungeData = { dive: 0, power: 0, gauge: 0, q: 0, y: lipY, vy: 0, z: lipZ, x, angle: 0, twist: 0, lipY, lipZ, cards: [], sum: 0, slip: false, entry: 0, airT: 0 }; // prettier-ignore
    c.a.data = d as unknown as Record<string, unknown>;
    propFor(c, { prop: 'prop:diveLip', at: [x, lipY - 0.14, z - 6.4], yaw: Math.PI });
    for (let g = 0; g < 3; g++) {
      const [gx, gz] = [x - 11 + g * 2.2, z - 24];
      const judge = c.w.query('critter', 'cast').find((e) => e.cast.who === `judge${g}`);
      if (judge) Object.assign(judge.critter, { goalX: gx, goalY: SEA_Y + 1.2, goalZ: gz, look: 0, away: false });
      propFor(c, { prop: 'prop:scoreCard', at: [gx, SEA_Y + 2.1, gz], yaw: 0 });
    }
    c.hud.disc = true;
    c.hud.feet = true;
    c.hud.guide = true;
    toLip(c, d);
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as PlungeData;
    const [{ seat, wobble: wob }] = c.seats;
    const guest = castOf(c.w, 'guest');
    const cast = guest?.cast;
    if (c.a.phase === 'compose') {
      c.hud.disc = true;
      c.hud.ring = [0, 0, RING];
      if (inRing(wob, 0, 0, RING) && bothFeet(seat)) d.power = Math.min(1, d.power + c.w.dt / 4);
      c.hud.meter = d.power;
      c.hud.meterLabel = 'Compose';
      c.hud.show = { power: d.power };
      if (cast) {
        cast.leanX = wob.x * 1.2;
        cast.leanY = wob.y * 1.2;
        cast.poseT = d.power;
      }
      if (d.power >= 1) {
        say(c, 'plumb', 'plunge.go');
        enter(c, 'go');
      } else if (after(c, WAIT)) {
        d.slip = true;
        say(c, 'tare', 'plunge.slip');
        c.w.emit('slip', {});
        d.q = 0;
        d.vy = 0;
        enter(c, 'air');
      }
      return;
    }
    if (c.a.phase === 'go') {
      const t = (c.a.pt / c.w.hz / SWING) * Math.PI;
      d.gauge = Math.abs(Math.sin(t));
      c.hud.show = { gauge: d.gauge, power: 1 };
      c.hud.meter = d.gauge;
      c.hud.meterLabel = 'Let go at the top';
      if (!bothFeet(seat)) {
        d.q = d.gauge;
        d.vy = 1.5 + d.q * 3;
        c.w.emit('launch', { q: d.q });
        enter(c, 'air');
      } else if (after(c, GO_BOX)) {
        d.slip = true;
        d.q = 0;
        d.vy = 0;
        say(c, 'tare', 'plunge.slip');
        c.w.emit('slip', {});
        enter(c, 'air');
      }
      return;
    }
    if (c.a.phase === 'air') {
      c.hud.disc = false;
      c.hud.feet = false;
      wob.on = false;
      d.vy -= FALL * c.w.dt;
      d.y += d.vy * c.w.dt;
      d.z -= (d.slip ? 3 : 4.6 + d.q * 2.2) * c.w.dt;
      if (!d.slip) {
        const spin = c.w.settings.get<number>('game.dive.spin');
        d.angle += seat.ly * spin * c.w.dt;
        d.twist += seat.lx * spin * c.w.dt;
      } else d.angle += 2.6 * c.w.dt;
      d.airT += 1;
      if (cast) {
        cast.z = d.z;
        cast.y = d.y;
        // Whichever you lean into more is the strip your thumb scrubs.
        const twisting = Math.abs(d.twist) > Math.abs(d.angle);
        cast.yaw = Math.PI + (twisting ? 0 : d.twist);
        cast.pose = twisting ? 'Twist' : 'Somersault';
        cast.poseT = Math.max(0, Math.min(1, Math.abs(twisting ? d.twist : d.angle) / (4 * Math.PI)));
        cast.leanX = cast.leanY = 0;
      }
      c.hud.show = { angle: d.angle, twist: d.twist, air: true };
      if (d.y <= SEA_Y - 0.4) {
        const cards = cardsOf(c, d);
        d.cards.push(cards);
        d.sum += cards[0] + cards[1] + cards[2];
        c.w.emit(d.slip ? 'splash' : 'splashBig', { x: d.x, z: d.z, y: SEA_Y });
        c.w.emit('cards', { cards, dive: d.dive, entry: d.entry });
        say(c, 'tare', d.slip ? 'plunge.slipped' : cards[0] >= 8 ? 'plunge.great' : 'plunge.dive');
        if (cast) Object.assign(cast, { y: SEA_Y - 0.9, pose: 'Splashed', poseT: 1 });
        enter(c, 'cards');
      }
      return;
    }
    // Cards.
    c.hud.show = { cards: d.cards[d.cards.length - 1], dive: d.dive, slip: d.slip };
    if (after(c, CARDS_FOR)) {
      d.dive += 1;
      wob.on = true;
      if (d.dive >= DIVES) c.a.done = true;
      else toLip(c, d);
    }
  },
  teardown(c) {
    for (const e of c.w.query('critter', 'cast')) if (e.cast.who.startsWith('judge')) e.critter.away = true;
  },
  bot(c, e, player: Player) {
    const d = c.a.data as unknown as PlungeData;
    const { seat, wobble } = e;
    seat.act = false;
    if (c.a.phase === 'compose') {
      holdAt(c.w, seat, wobble, 0, 0, player);
      seat.fl = seat.fr = player.acts ? 1 : 0;
    } else if (c.a.phase === 'go') {
      holdAt(c.w, seat, wobble, 0, 0, player);
      seat.fl = seat.fr = player.acts ? 1 : 0;
      const period = SWING * c.w.hz;
      const atPeak = Math.abs((c.a.pt % period) - period / 2) < 1 + player.timing;
      if (player.acts && atPeak && c.a.pt > 10) seat.fl = seat.fr = 0;
    } else if (c.a.phase === 'air') {
      seat.fl = seat.fr = 0;
      if (!player.acts) {
        seat.lx = seat.ly = 0;
        return;
      }
      // Solve the rest of the fall, and turn so as to arrive head down.
      const left = (d.vy + Math.sqrt(Math.max(0, d.vy * d.vy + 2 * FALL * (d.y - SEA_Y + 0.4)))) / FALL;
      const target = 3 * Math.PI;
      const spin = c.w.settings.get<number>('game.dive.spin');
      const lag = player.delay / c.w.hz;
      const want = (target - d.angle) / Math.max(0.1, left + lag * 0.2);
      seat.ly = Math.max(-1, Math.min(1, want / spin));
      seat.lx = player.name === 'sloppy' ? 0 : Math.max(-1, Math.min(1, (6 - d.twist) / Math.max(0.2, left) / spin));
    } else {
      seat.lx = seat.ly = seat.fl = seat.fr = 0;
    }
  },
  score(c) {
    const d = c.a.data as unknown as PlungeData;
    return (d.sum / (24 * DIVES)) * 1000;
  },
};
