/**
 * @file The Great Tilt (PLAN.md section 7), the finale: every verb at the scale of the world. The storm comes, the island
 * tips, guests drift downhill politely and a Calm Call leads them to the high side; two carts of your pebbles are cranked
 * uphill; then you stand on the plate that says "Do not", and your balance is the island's. No fail state, only remarks.
 */
import { spawnPerson } from '../../cast/people';
import { drawDrifters, slopePush, stepDrifters, type Drifter } from './tilt-guests';
import { clearBody, setLoop, setPose } from '../../cast/body';
import type { Order, Skill } from '../bot/players';
import { STATIONS } from '../data/stations';
import { gameNumber } from '../settings';
import { cue, islandOf, say, type C, type EvState, type SeatE, type W } from '../types';
import { resetWobble, stepBreath, stepWobble, syncShare } from '../wobble';
import { castOf } from '../cast-ref';
import {
  bothHeld,
  clamp,
  footDown,
  groundAt,
  hover,
  inRing,
  moveProp,
  ownProp,
  phase,
  playing,
  standAt,
  dropActor,
  yawQuat,
  type Activity,
} from './kit';

const STORM = 1200;
const EAST = 4500;
const CARTS = 2700;
const STONE = 3600;
const DAWN = 1500;
const CALM_HOLD = 120;
const WAVE_R = 8;
const START_TILT = 6;

interface TiltData {
  guests: Drifter[];
  delivered: number;
  call: number;
  wave: number;
  cart: number;
  last: string;
  lurch: number;
  ring: number;
  inside: number;
  steps: number;
  x: number;
  z: number;
  carts: number[];
  loungers: number[];
  lx: number[];
  waves: number;
  endScore: number;
  cartLast: number;
  line: number;
  only: string;
  twin: number;
  hide: number[];
  beam: number;
}
const dataOf = (ev: EvState): TiltData => ev.d as unknown as TiltData;

type ActorOf = { actor: C['actor'] & { intents: Record<string, unknown> } };

const walkTo = (w: W, e: SeatE, slope: number): void => {
  const entity = w.get(e.seat.actor) as unknown as ActorOf;
  entity.actor.intents = { move: [clamp(e.seat.input.y - slope * 0.1, -1, 1), clamp(e.seat.input.x, -1, 1)] };
};

function eastStep(w: W, ev: EvState, e: SeatE): void {
  const d = dataOf(ev);
  const island = islandOf(w);
  island.tiltX += (gameNumber(w, 'game.tilt.rate') / 60) * 1;
  walkTo(w, e, slopePush(island.tiltX));
  if (bothHeld(e)) {
    d.call += 1;
    setPose(w, e.seat.actor, 'RETREAT/CalmCall', clamp(d.call / CALM_HOLD, 0, 1));
  } else {
    if (d.call >= CALM_HOLD) {
      d.wave = 40;
      cue(w, 'calmWave');
      const { actor } = w.get(e.seat.actor) as unknown as ActorOf;
      for (const g of d.guests) if (!g.home && Math.hypot(g.x - actor.x, g.z - actor.z) <= WAVE_R) g.follow = true;
    }
    if (d.call > 0) clearBody(w, e.seat.actor);
    d.call = 0;
  }
  d.wave = Math.max(0, d.wave - 1);
  stepDrifters(w, d);
  drawDrifters(w, d);
  // loungers slide through, and go round again
  d.loungers.forEach((id, k) => {
    d.lx[k] -= (slopePush(island.tiltX) * 1.6) / 60;
    if (d.lx[k] < -60) d.lx[k] = 80;
    moveProp(w, id, [d.lx[k], groundAt(w, d.lx[k], 20 + k * 8), 20 + k * 8]);
  });
  const left = d.guests.filter((g) => !g.home && !g.nan).length;
  if (left === 0 || ev.t >= EAST) {
    if (left) say(w, 'tilt.shuffle', 'plumb');
    for (const g of d.guests)
      if (!g.home)
        Object.assign(g, { home: true, x: STATIONS.east.x + (g.body % 7) - 3, z: STATIONS.east.z + (g.body % 5) - 2 });
    drawDrifters(w, d);
    for (const id of d.loungers) moveProp(w, id, [0, -30, 0]);
    (w.get(e.seat.actor) as unknown as ActorOf).actor.intents = {};
    resetWobble(e.wobble);
    island.finale = 3;
    standAt(w, e.seat.actor, -10, 40, Math.PI / 2);
    say(w, 'tilt.carts', 'plumb');
    phase(ev, 'carts');
  }
}

function cartsStep(w: W, ev: EvState, e: SeatE): void {
  const d = dataOf(ev);
  const island = islandOf(w);
  stepBreath(w, e, w.tick);
  stepWobble(w, e, [-slopePush(island.tiltX) * 0.7, 0]);
  const left = footDown(e, 'l');
  const right = footDown(e, 'r');
  if (left !== right) {
    const foot = left ? 'l' : 'r';
    if (foot !== d.last && inRing(e, 0.3, 0, 0.45)) {
      d.cart = Math.min(1, d.cart + 0.03);
      cue(w, 'crank');
    }
    d.last = foot;
  }
  setLoop(w, e.seat.actor, 'RETREAT/Crank', d.cartLast === Math.floor(d.cart * 100) ? 0.2 : 1.2);
  d.cartLast = Math.floor(d.cart * 100);
  d.carts.forEach((id, k) => moveProp(w, id, [-10 + d.cart * 22 - k * 4, 8.1, 42 + k * 2.2]));
  (w.get(e.seat.actor) as unknown as ActorOf).actor.intents = {};
  if (d.cart >= 1 || ev.t >= CARTS) {
    island.tiltX = Math.max(1, island.tiltX - 1.5 * d.cart);
    if (d.cart < 1) say(w, 'tilt.cartsTime', 'plumb');
    else say(w, 'tilt.cartsDone', 'tare');
    resetWobble(e.wobble);
    clearBody(w, e.seat.actor);
    island.finale = 4;
    d.line = 0;
    say(w, 'tilt.stone', 'plumb');
    phase(ev, 'stone');
  }
}

function stoneStep(w: W, ev: EvState, e: SeatE): void {
  const d = dataOf(ev);
  const island = islandOf(w);
  stepBreath(w, e, w.tick);
  const k = ev.t / STONE;
  d.waves = (0.6 + k * 1.2) * 3;
  const shove: [number, number] = [Math.sin(ev.t * 0.021) * d.waves, Math.sin(ev.t * 0.017 + 1) * d.waves * 0.8];
  const before = e.wobble.topples;
  stepWobble(w, e, shove);
  if (e.wobble.topples > before) {
    d.lurch += 3;
    say(w, 'tilt.again', 'plumb');
    cue(w, 'groan');
  }
  d.lurch *= 0.995;
  d.ring = 0.3 - 0.13 * k;
  moveProp(w, d.beam, [STATIONS.lighthouse.x, 18, STATIONS.lighthouse.z], yawQuat(ev.t * 0.018));
  d.steps += 1;
  if (inRing(e, 0, 0, d.ring)) d.inside += 1;
  island.tiltX = e.wobble.x * 8 + d.lurch;
  island.tiltZ = e.wobble.y * 8;
  const y = groundAt(w, d.x, d.z);
  hover(w, e.seat.actor, d.x, y + 0.42, d.z, 0);
  setPose(w, e.seat.actor, 'RETREAT/LineStand', 1);
  if (ev.t >= STONE) {
    const breath = syncShare(e.wobble);
    d.endScore = (0.3 * d.delivered) / 11 + (0.5 * d.inside) / Math.max(1, d.steps) + 0.2 * breath;
    say(w, 'tilt.level', 'plumb');
    cue(w, 'groan');
    phase(ev, 'dawn');
  }
}

function dawnStep(w: W, ev: EvState): void {
  const island = islandOf(w);
  island.storm = Math.max(0, island.storm - 1 / 300);
  island.tiltX *= 0.98;
  island.tiltZ *= 0.98;
  const { plumb } = castOf(w);
  const d = dataOf(ev);
  // Plumb opens their eyes, once: a twin with open eyes stands in for two seconds, the only time it is ever needed
  if (ev.t === 360 && plumb >= 0) {
    say(w, 'tilt.hm', 'plumb');
    const { actor } = w.get(plumb) as unknown as ActorOf;
    d.twin = spawnPerson(w, {
      at: [actor.x, actor.y + 0.05, actor.z],
      body: 'body:plumbOpen',
      build: 'build:plumb',
      speed: 2,
      yaw: actor.yaw,
      secondary: { hair: 'ponytail' },
    });
    ev.owned.push(d.twin);
    d.hide = [actor.x, actor.z];
  }
  if (ev.t >= 362 && ev.t < 480 && plumb >= 0) hover(w, plumb, d.hide[0], -12, d.hide[1], 0);
  if (ev.t === 480 && plumb >= 0) {
    dropActor(w, d.twin);
    ev.owned.splice(ev.owned.indexOf(d.twin), 1);
    standAt(w, plumb, d.hide[0], d.hide[1], 0);
  }
  if (ev.t === 660) say(w, 'tilt.tare', 'tare');
  if (plumb >= 0) setPose(w, plumb, 'RETREAT/Stand', 0);
  if (ev.t >= DAWN) {
    island.finale = 0;
    island.tiltX = 0;
    island.tiltZ = 0;
    ev.score = Math.round(clamp(dataOf(ev).endScore, 0, 1) * 1000);
    ev.done = true;
  }
}

function step(w: W, ev: EvState): void {
  const [e] = playing(w, ev);
  const island = islandOf(w);
  if (ev.phase === 'storm') {
    island.storm = clamp(ev.t / 300, 0, 1);
    island.tiltX = clamp((ev.t / STORM) * START_TILT, 0, START_TILT);
    if (ev.t === 60) cue(w, 'horn');
    if (ev.t === 240) cue(w, 'thunder');
    if (ev.t === 360) w.emit('plait', { swing: true } as never);
    if (ev.t === 480) say(w, 'tilt.calm', 'plumb');
    const { plumb } = castOf(w);
    if (plumb >= 0) standAt(w, plumb, 3, 28 + Math.sin(ev.t * 0.05) * 0.4, Math.sin(ev.t * 0.04) * 0.35);
    if (ev.t >= STORM || (e.seat.kind === 'human' && e.seat.input.act && ev.t > 300)) {
      island.finale = 2;
      island.tiltX = START_TILT;
      say(w, 'tilt.east', 'plumb');
      phase(ev, 'east');
    }
    return;
  }
  if (ev.phase === 'east') return eastStep(w, ev, e);
  if (ev.phase === 'carts') return cartsStep(w, ev, e);
  if (ev.phase === 'stone') return stoneStep(w, ev, e);
  if (ev.phase === 'dawn') return dawnStep(w, ev);
}

function bot(w: W, ev: EvState, e: SeatE, skill: Skill): Order {
  const d = dataOf(ev);
  const { actor } = w.get(e.seat.actor) as unknown as ActorOf;
  if (ev.phase === 'east') {
    const followers = d.guests.filter((g) => g.follow && !g.home).length;
    const lost = d.guests.filter((g) => !g.follow && !g.home && !g.nan);
    const near = lost.reduce<Drifter | null>(
      (best, g) =>
        !best || Math.hypot(g.x - actor.x, g.z - actor.z) < Math.hypot(best.x - actor.x, best.z - actor.z) ? g : best,
      null,
    );
    const goEast = followers >= 3 || !near;
    const [tx, tz] = goEast ? [STATIONS.east.x, STATIONS.east.z] : [near.x, near.z];
    const far = Math.hypot(tx - actor.x, tz - actor.z);
    if (!goEast && far < 6) {
      const hold = d.call < CALM_HOLD + 4;
      return hold ? { stick: [0, 0], l: 1, r: 1, raw: true } : { stick: [0, 0] };
    }
    return { stick: [clamp((tz - actor.z) / 6, -1, 1), clamp((tx - actor.x) / 6, -1, 1)], raw: true };
  }
  if (ev.phase === 'carts') {
    const beat = w.tick % 40;
    const order: Order = { aim: [0.3, 0] };
    if (beat < 8) order.l = 1;
    else if (beat >= 20 && beat < 28) order.r = 1;
    return order;
  }
  if (ev.phase === 'stone') {
    const steps = Math.round(gameNumber(w, 'game.breath.period') * 60);
    const feet = (w.tick + steps - skill.timing) % steps < steps / 2 ? 1 : 0;
    return { aim: [0, 0], l: feet, r: feet };
  }
  return {};
}

export const TILT: Activity = {
  id: 'tilt', title: 'The Great Tilt', station: 'plaza', shot: 'tilt', map: 'balance', song: 'song:tilt',
  setup(w, ev) {
    const [e] = playing(w, ev);
    const cast = castOf(w);
    const island = islandOf(w);
    resetWobble(e.wobble);
    island.finale = 1;
    ev.s[e.seat.index] = {};
    const rng = w.rng('tilt');
    const guests: Drifter[] = [];
    const named = [cast.gerald, cast.bex, cast.nan];
    for (let k = 0; k < 12; k++) {
      const x = rng.range(-26, 30);
      const z = rng.range(14, 54);
      if (k < 3 && named[k] >= 0) {
        guests.push({ body: named[k], named: true, x, z, follow: false, home: false, nan: named[k] === cast.nan });
      } else {
        const y = groundAt(w, x, z);
        const body = w.spawn({ crowdBody: { rig: 'humanoid', look: 'build:chibi', x, y, z, yaw: 0 } } as never);
        ev.owned.push(body);
        guests.push({ body, named: false, x, z, follow: false, home: false, nan: false });
      }
    }
    const carts = [0, 1].map((k) => ownProp(w, ev, 'prop:cart', [-10 - k * 4, 8.1, 42 + k * 2.2]));
    ownProp(w, ev, 'prop:rails', [1, 8.02, 43]);
    const beam = ownProp(w, ev, 'prop:beam', [0, -60, 0]);
    const loungers = [0, 1, 2].map((k) => ownProp(w, ev, 'prop:lounger', [80 - k * 45, -30, 20 + k * 8]));
    Object.assign(ev.d, { guests, delivered: 0, call: 0, wave: 0, cart: 0, last: '', lurch: 0, ring: 0.3, inside: 0, steps: 0, x: STATIONS.stone.x, z: STATIONS.stone.z, carts, beam, loungers, lx: [80, 35, -10], waves: 0, endScore: 0, cartLast: 0, line: 0 });
    standAt(w, e.seat.actor, 0, 32, Math.PI / 2);
    say(w, 'tilt.storm', 'pa');
    if (ev.d.only === 'stone') {
      island.finale = 4;
      island.storm = 1;
      island.tiltX = START_TILT;
      phase(ev, 'stone');
      return;
    }
    phase(ev, 'storm');
  },
  step, bot,
  teardown(w) {
    const island = islandOf(w);
    Object.assign(island, { finale: 0, tiltX: 0, tiltZ: 0, storm: 0 });
  },
}; // prettier-ignore
