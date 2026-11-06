/**
 * @file The Great Tilt (PLAN.md section 7): the finale, using every verb at the scale of the world. Storm; Everyone East;
 * Counterweights; the Centre Stone, where your CoB is the island's tilt; Dawn. There is no fail state, only remarks, and
 * every step is time boxed. The island's geometry never moves: walkers get a slope push, the camera banks, the sea
 * counter-rotates.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'tilt');
 */
import { stepLurch } from '../tilt';
import { placeActor } from '../../../../engine/sim-api';
import { FLAT_Y, STATIONS } from '../data/stations';
import { TILT_GUESTS } from '../data/guests';
import { bothFeet, inRing } from '../wobble';
import {
  after,
  castOf,
  enter,
  entityFor,
  floorShape,
  isBot,
  moveProp,
  propFor,
  say,
  steps,
  worldFromLean,
} from './kit';
import { tiltBot } from './tiltBot';
import { stepWalkers, type Walker } from './tiltWalkers';
import type { Activity, Ctx } from './types';

/** Seconds of each step (PLAN.md section 7). */
const STORM = 20;
const EAST = 75;
const WEIGHTS = 45;
const STONE = 60;
const DAWN = 16;
/** The Calm Call: how long it takes to charge, how far it reaches, how long they follow. */
const CALL_CHARGE = 2;
const CALL_REACH = 8;
const FOLLOW = 25;

/** The finale's state. */
interface TiltData {
  walkers: Walker[];
  delivered: number;
  charge: number;
  wave: number;
  waveT: number;
  loungers: number[];
  cartProp: number[];
  carts: number[];
  cartFoot: string;
  wavePhase: number;
  stoneIn: number;
  stoneTotal: number;
  syncSum: number;
  ringR: number;
  lurches: number;
  lurchX: number;
  lurchZ: number;
  beam: number;
  attract: boolean;
  remark: number;
  eyes: boolean;
}

/** Spawns the guests and the storm's props. */
function setOut(c: Ctx, d: TiltData): void {
  TILT_GUESTS.forEach((g) => {
    const y = c.ground(g.x, g.z);
    if (g.name === 'guest') {
      const body = entityFor(c, {
        crowdBody: { rig: 'humanoid', look: g.build, size: 0, x: g.x, y, z: g.z, yaw: 1.5, state: {} } as never,
      });
      d.walkers.push({ x: g.x, z: g.z, body, named: '', following: 0, delivered: false });
    } else {
      const person = castOf(c.w, g.name);
      if (person) {
        placeActor(c.w, person.id, [g.x, y, g.z], 1.5);
        Object.assign(person.cast, { hold: false, pose: '', poseT: 0 });
      }
      d.walkers.push({ x: g.x, z: g.z, body: person?.id ?? -1, named: g.name, following: 0, delivered: false });
    }
  });
  for (let i = 0; i < 6; i++) {
    const [lx, lz] = [20 + i * 7, 8 + (i % 3) * 7];
    d.loungers.push(propFor(c, { prop: 'prop:lounger', at: [lx, c.ground(lx, lz), lz], yaw: 1.5 }));
  }
  d.beam = propFor(c, { prop: 'prop:beam', at: [0, -40, 0], yaw: 0 });
}

/** Puts the player on their feet at a place, walking. */
function freeGuest(c: Ctx, x: number, z: number): void {
  const guest = castOf(c.w, 'guest');
  if (!guest) return;
  Object.assign(guest.cast, { hold: false, pose: '', poseT: 0 });
  placeActor(c.w, guest.id, [x, c.ground(x, z), z], 1.5);
}

/** The Great Tilt. */
export const tilt: Activity = {
  id: 'tilt',
  title: 'The Great Tilt',
  station: 'plaza',
  map: 'actionMap:balance',
  shot: 'tilt',
  wobble: true,
  setup(c) {
    const attract = Boolean((c.a.data as { attract?: boolean }).attract);
    const d: TiltData = { walkers: [], delivered: 0, charge: 0, wave: -1, waveT: 0, loungers: [], cartProp: [], carts: [0, 0], cartFoot: '', wavePhase: 0, stoneIn: 0, stoneTotal: 0, syncSum: 0, ringR: 0.5, lurches: 0, lurchX: 0, lurchZ: 0, beam: -1, attract, remark: 0, eyes: false }; // prettier-ignore
    c.a.data = d as unknown as Record<string, unknown>;
    const isl = c.w.query('island')[0].island;
    Object.assign(isl, { tiltX: -6, tiltZ: 0, storm: 1, sky: 'storm' });
    d.wave = floorShape(c, '', 0, c.station.y, 0, 0.1);
    setOut(c, d);
    const plumb = castOf(c.w, 'plumb');
    if (plumb)
      Object.assign(plumb.cast, { hold: true, x: 2, y: c.ground(2, 26), z: 26, yaw: 0, pose: 'Upright', poseT: 1 });
    freeGuest(c, 0, 32);
    c.hud.title = 'The Great Tilt';
    c.hud.disc = false;
    enter(c, 'storm');
    c.w.emit('storm', { on: true });
    c.w.emit('cutscene', { id: 'plait' });
    if (attract) enter(c, 'stone');
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as TiltData;
    const [{ seat, wobble: wob }] = c.seats;
    const isl = c.w.query('island')[0].island;
    const guest = castOf(c.w, 'guest');
    const me = guest ? c.w.get(guest.id)?.actor : undefined;
    const rate = c.w.settings.get<number>('game.tilt.rate');
    const forced = Boolean((c.a.data as { jumped?: boolean }).jumped);
    if (forced) (c.a.data as { jumped?: boolean }).jumped = false;
    // The loungers slide through, whatever the phase.
    if (c.a.phase === 'east' || c.a.phase === 'storm') {
      d.loungers.forEach((id, i) => {
        const e = c.w.get(id)?.sceneProp;
        if (!e) return;
        const nx = e.x - (0.9 + i * 0.06) * -isl.tiltX * 0.25 * c.w.dt;
        const wrap = nx < -50 ? 60 : nx;
        moveProp(c.w, id, wrap, c.ground(wrap, e.z), e.z, 1.5 + Math.sin(c.a.t * 0.02 + i) * 0.2);
      });
    }
    switch (c.a.phase) {
      case 'storm': {
        wob.on = false;
        const plumb = castOf(c.w, 'plumb');
        // In the storm the plait swings for the first time: the body sways a hair, and the chain does the rest.
        if (plumb) plumb.cast.x = 2 + Math.sin(c.a.t * 0.16) * 0.07;
        if (c.a.pt === steps(c, 6)) {
          say(c, 'pa', 'tilt.outOfTrue');
          c.w.emit('ferryHorn', {});
        }
        if (c.a.pt === steps(c, 14)) c.w.emit('thunder', {});
        if (seat.actP && c.a.pt > 60) enter(c, 'east');
        else if (after(c, STORM)) {
          say(c, 'pa', 'tilt.east');
          enter(c, 'east');
        }
        c.hud.prompt = 'skip';
        break;
      }
      case 'east': {
        c.hud.prompt = '';
        wob.on = false;
        if (me) {
          const cam = isBot(c, seat.index) ? 0 : c.flow.camYaw;
          const [mx, mz] = worldFromLean(seat.lx, seat.ly, cam);
          me.intents = { move: [mx - isl.tiltX * 0.055, mz] };
          const calling = bothFeet(seat);
          d.charge = calling ? Math.min(1, d.charge + c.w.dt / CALL_CHARGE) : d.charge;
          if (!calling && d.charge >= 1) {
            d.charge = 0;
            d.waveT = steps(c, 1.4);
            let n = 0;
            for (const g of d.walkers) {
              if (!g.delivered && Math.hypot(g.x - me.x, g.z - me.z) <= CALL_REACH) {
                g.following = steps(c, FOLLOW);
                n += 1;
              }
            }
            c.w.emit('calmCall', { n });
            say(c, 'tare', n > 0 ? 'tilt.calmed' : 'tilt.calmedNobody');
          } else if (!calling) d.charge = Math.max(0, d.charge - c.w.dt);
          if (guest) Object.assign(guest.cast, { pose: calling ? 'CalmCall' : '', poseT: d.charge });
          d.waveT = Math.max(0, d.waveT - 1);
          const ring = c.w.get(d.wave)?.matRing;
          if (ring) {
            ring.telegraph = d.waveT > 0 ? 'telegraph:calmWave' : '';
            ring.position = [me.x, me.y + 0.1, me.z];
            ring.size = CALL_REACH * (1 - d.waveT / steps(c, 1.4));
          }
          stepWalkers(c, d, me.x, me.z);
        }
        isl.tiltX -= rate * c.w.dt;
        const show: Record<string, unknown> = {
          delivered: d.delivered,
          charge: d.charge,
          followers: d.walkers.filter((g) => g.following > 0).length,
          tiltDeg: Math.abs(isl.tiltX),
        };
        c.hud.show = show;
        c.hud.meter = 1 - c.a.pt / steps(c, EAST);
        c.hud.meterLabel = 'Everyone East';
        if (d.delivered >= d.walkers.length || after(c, EAST)) {
          if (d.delivered < d.walkers.length) say(c, 'plumb', 'tilt.shuffle');
          setUpWeights(c, d);
        }
        break;
      }
      case 'weights': {
        c.hud.prompt = '';
        wob.on = true;
        wob.usesBreath = false;
        const { x, z } = STATIONS.eastTerrace;
        c.hud.disc = true;
        c.hud.feet = true;
        c.hud.ring = [0.3, 0, 0.32];
        stepWalkers(c, d, x, z);
        const foot = seat.pfl ? 'L' : seat.pfr ? 'R' : '';
        const cart = d.carts[0] < 1 ? 0 : 1;
        if (foot && foot !== d.cartFoot && inRing(wob, 0.3, 0, 0.4)) {
          d.cartFoot = foot;
          d.carts[cart] = Math.min(1, d.carts[cart] + 0.055);
          c.w.emit('crank', { foot, cart });
          if (d.carts[cart] >= 1) {
            isl.tiltX = Math.min(-0.5, isl.tiltX + 1);
            c.w.emit('cartHome', { cart });
          }
        }
        wob.dx += isl.tiltX * 0.8;
        d.cartProp.forEach((id, i) => moveProp(c.w, id, x - 22 + d.carts[i] * 16, FLAT_Y - 0.6, z - 8 + i * 4));
        if (guest)
          Object.assign(guest.cast, {
            hold: true,
            x: x - 19 + d.carts[cart] * 16,
            y: c.ground(x - 19, z - 8 + cart * 4),
            z: z - 8 + cart * 4 - 1.4,
            yaw: 0,
            pose: 'Crank',
            poseT: d.carts[cart] * 8,
            leanX: wob.x,
            leanY: wob.y,
          });
        c.hud.meter = 1 - c.a.pt / steps(c, WEIGHTS);
        c.hud.meterLabel = `Cart ${cart + 1} of 2`;
        c.hud.show = { tiltDeg: Math.abs(isl.tiltX), cart, cartProgress: d.carts[cart] };
        isl.tiltX -= rate * c.w.dt * 0.5;
        if ((d.carts[0] >= 1 && d.carts[1] >= 1) || after(c, WEIGHTS)) {
          if (d.carts[1] < 1) say(c, 'plumb', 'tilt.start');
          setUpStone(c, d);
        }
        break;
      }
      case 'stone': {
        c.hud.prompt = '';
        if (c.a.pt === 1 || forced) setUpStone(c, d);
        wob.on = true;
        wob.usesBreath = true;
        const u = c.a.pt / steps(c, STONE);
        d.ringR = 0.5 - 0.28 * u;
        d.wavePhase += c.w.dt;
        const big = 1 + 2.2 * u;
        wob.dx += Math.sin(d.wavePhase * 0.9) * big;
        wob.dy += Math.sin(d.wavePhase * 1.37 + 1) * big;
        stepLurch(d, wob);
        // The tilt is your CoB.
        isl.tiltX = wob.x * 9 + d.lurchX;
        isl.tiltZ = wob.y * 9 + d.lurchZ;
        d.stoneTotal += 1;
        d.syncSum += wob.sync;
        if (inRing(wob, 0, 0, d.ringR)) d.stoneIn += 1;
        if (guest) Object.assign(guest.cast, { pose: 'StoneStand', poseT: 1, leanX: wob.x * 1.4, leanY: wob.y * 1.4 });
        c.hud.disc = true;
        c.hud.guide = true;
        c.hud.feet = true;
        c.hud.ring = [0, 0, d.ringR];
        c.hud.meter = 1 - u;
        c.hud.meterLabel = 'Hold the island';
        c.hud.show = { tiltDeg: Math.hypot(isl.tiltX, isl.tiltZ), stone: true };
        const lighthouse = STATIONS.lighthouse;
        const beamYaw = c.a.t * 0.012;
        moveProp(c.w, d.beam, lighthouse.x, 16, lighthouse.z, [
          Math.sin(beamYaw / 2) * 0.7,
          Math.sin(beamYaw / 2) * 0.1,
          Math.cos(beamYaw / 2) * 0.7,
          Math.cos(beamYaw / 2),
        ]);
        if (wob.recover === 59) {
          d.lurches += 1;
          say(c, 'plumb', 'tilt.again');
          c.w.emit('lurch', {});
        }
        if (u >= 1 && !d.attract) enter(c, 'dawn');
        else if (u >= 1) c.a.pt = 0;
        break;
      }
      case 'dawn':
      default: {
        wob.on = false;
        c.hud.disc = false;
        c.hud.feet = false;
        c.hud.prompt = '';
        if (c.a.pt === 1) {
          c.a.hud = { title: 'Dawn' };
          Object.assign(isl, { sky: 'dawn', storm: 0, tiltX: 0, tiltZ: 0 });
          c.w.emit('storm', { on: false });
          c.w.emit('cutscene', { id: 'dawn' });
          say(c, 'tare', 'tilt.balanced');
        }
        const plumb = castOf(c.w, 'plumb');
        if (plumb) {
          Object.assign(plumb.cast, {
            hold: true,
            x: 3,
            y: c.ground(3, 4) + 0.1,
            z: 4,
            yaw: Math.PI + 0.3,
            pose: 'Upright',
            poseT: 1,
          });
          const puppet = c.w.get(plumb.id)?.puppet;
          if (puppet && c.a.pt === steps(c, 5)) {
            puppet.body = 'body:plumbOpen';
            say(c, 'plumb', 'tilt.hm');
          }
          if (puppet && c.a.pt === steps(c, 8)) puppet.body = 'body:plumb';
        }
        if (c.a.pt === steps(c, 10)) say(c, 'tare', 'tilt.rock');
        if (after(c, DAWN)) c.a.done = true;
      }
    }
  },
  teardown(c) {
    const isl = c.w.query('island')[0].island;
    Object.assign(isl, { tiltX: 0, tiltZ: 0, storm: 0 });
    if (isl.sky === 'storm') isl.sky = 'day';
    const plumb = castOf(c.w, 'plumb');
    const puppet = plumb ? c.w.get(plumb.id)?.puppet : undefined;
    if (puppet) puppet.body = 'body:plumb';
  },
  bot: tiltBot,
  score(c) {
    const d = c.a.data as unknown as TiltData;
    const guests = d.delivered / Math.max(1, d.walkers.length);
    const held = d.stoneTotal ? d.stoneIn / d.stoneTotal : 0;
    const breath = d.stoneTotal ? d.syncSum / d.stoneTotal : 0;
    return 1000 * (0.35 * guests + 0.45 * held + 0.2 * breath);
  },
};

/** Sets up Counterweights. */
function setUpWeights(c: Ctx, d: TiltData): void {
  const { x, z } = STATIONS.eastTerrace;
  const yr = FLAT_Y - 0.8;
  propFor(c, { prop: 'prop:rail', at: [x - 14, yr, z - 8], yaw: 0 });
  propFor(c, { prop: 'prop:rail', at: [x - 14, yr, z - 4], yaw: 0 });
  d.cartProp = [
    propFor(c, { prop: 'prop:cart', at: [x - 22, yr, z - 8], yaw: 0 }),
    propFor(c, { prop: 'prop:cart', at: [x - 22, yr, z - 4], yaw: 0 }),
  ];
  say(c, 'tare', 'tilt.weights');
  enter(c, 'weights');
}

/** Sets up the Centre Stone: the fade takes you there. */
function setUpStone(c: Ctx, d: TiltData): void {
  const { x, z } = STATIONS.centre;
  const guest = castOf(c.w, 'guest');
  if (guest)
    Object.assign(guest.cast, {
      hold: true,
      x,
      y: c.ground(x, z) + 0.74,
      z: z + 0.1,
      yaw: Math.PI,
      pose: 'StoneStand',
      poseT: 1,
      leanX: 0,
      leanY: 0,
    });
  Object.assign(c.seats[0].wobble, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, recover: 0, instMul: 1, swayMul: 1 });
  if (c.a.phase !== 'stone') {
    say(c, 'plumb', 'tilt.stone');
    enter(c, 'stone');
  }
  c.w.emit('fade', {});
  d.remark = 1;
}
