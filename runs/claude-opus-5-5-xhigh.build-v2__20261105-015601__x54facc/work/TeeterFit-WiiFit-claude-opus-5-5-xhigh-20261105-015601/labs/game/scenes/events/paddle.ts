/**
 * @file Paddle Glide (PLAN.md section 6): stand on a board. Forward lean is speed, side lean steers, feet alternating at
 * about 1.2 Hz give +30% and a kick. Twelve buoy gates round the lagoon with seeded jitter. A ferry wake at gate 7 and a
 * crossing turtle at gate 9 shove your centre. A topple is a splash and a 3-second remount.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'paddle');
 */
import { holdAt, type Player } from '../bot/players';
import { GATES, LAGOON } from '../data/courses';
import { SEA_Y } from '../data/stations';
import { after, castOf, enter, moveProp, propFor, say, steps } from './kit';
import type { Activity, Ctx } from './types';

/** How close to a buoy counts, m; how long the course is open, s; how fast side lean turns, rad/s. */
const GATE_REACH = 4.6;
const LENGTH = 75;
const TURN = 1.2;

/** The glide's state. */
interface PaddleData {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  gate: number;
  gates: number[][];
  props: number[];
  board: number;
  boost: number;
  lastFoot: string;
  footT: number;
  time: number;
  finished: number;
  wake: number;
  turtle: number;
  shoved: number[];
  paddleT: number;
}

/** Puts the gates' props right: the next one is the lit one. */
function lightGate(c: Ctx, d: PaddleData): void {
  const [x, z] = d.gates[Math.min(d.gate, d.gates.length - 1)];
  moveProp(c.w, d.props[0], x, SEA_Y, z, 0);
}

/** Paddle Glide. */
export const paddle: Activity = {
  id: 'paddle',
  title: 'Paddle Glide',
  station: 'lagoon',
  map: 'actionMap:balance',
  shot: 'paddle',
  wobble: true,
  setup(c) {
    const rng = c.w.rng('gates');
    const gates = GATES.map((angle) => {
      const r = LAGOON.radius + rng.range(-2.5, 2.5);
      return [LAGOON.x + Math.cos(angle) * r, LAGOON.z + Math.sin(angle) * r];
    });
    const startX = LAGOON.x + Math.cos(Math.PI / 2) * LAGOON.radius;
    const startZ = LAGOON.z + Math.sin(Math.PI / 2) * LAGOON.radius;
    const d: PaddleData = { x: startX, z: startZ, yaw: -Math.PI / 2 + 0.3, speed: 0, gate: 0, gates, props: [], board: -1, boost: 0, lastFoot: '', footT: 999, time: 0, finished: -1, wake: -1, turtle: -1, shoved: [], paddleT: 0 }; // prettier-ignore
    c.a.data = d as unknown as Record<string, unknown>;
    d.props.push(propFor(c, { prop: 'prop:buoyNext', at: [gates[0][0], SEA_Y, gates[0][1]], yaw: 0 }));
    for (const [x, z] of gates) propFor(c, { prop: 'prop:buoy', at: [x, SEA_Y, z], yaw: 0 });
    d.board = propFor(c, { prop: 'prop:paddleboard', at: [startX, SEA_Y + 0.02, startZ], yaw: d.yaw });
    d.wake = propFor(c, { prop: 'prop:wake', at: [0, -20, 0], yaw: 0 });
    d.turtle = propFor(c, { prop: 'prop:turtle', at: [0, -20, 0], yaw: 0 });
    const guest = castOf(c.w, 'guest');
    if (guest)
      Object.assign(guest.cast, {
        hold: true,
        x: startX,
        y: SEA_Y + 0.14,
        z: startZ,
        yaw: d.yaw,
        pose: 'Paddling',
        poseT: 0,
      });
    c.hud.disc = true;
    c.hud.feet = true;
    c.hud.title = 'Paddle Glide';
    enter(c, 'glide');
    say(c, 'tare', 'paddle.start');
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as PaddleData;
    const [{ seat, wobble: wob }] = c.seats;
    const guest = castOf(c.w, 'guest');
    const cast = guest?.cast;
    d.time += 1;
    wob.usesBreath = false;
    if (c.a.phase === 'remount') {
      if (cast) cast.y = c.a.pt < steps(c, 2) ? SEA_Y - 0.6 : SEA_Y + 0.14;
      if (after(c, 3)) {
        Object.assign(wob, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, recover: 0 });
        enter(c, 'glide');
      }
    } else {
      // Feet: alternating at about 1.2 Hz gives +30% and a kick.
      d.footT += 1;
      const foot = seat.pfl ? 'L' : seat.pfr ? 'R' : '';
      if (foot && foot !== d.lastFoot) {
        if (d.footT < c.w.hz * 1.3) {
          d.boost = Math.min(1, d.boost + 0.5);
          d.speed += 0.4;
        }
        d.footT = 0;
        d.lastFoot = foot;
        d.paddleT += 0.5;
        c.w.emit('paddleStroke', { foot });
      }
      d.boost = Math.max(0, d.boost - c.w.dt * 0.7);
      const top = c.w.settings.get<number>('game.paddle.speed') * (1 + 0.3 * d.boost);
      const want = Math.max(0, Math.min(1, wob.y / 0.8)) * top;
      d.speed += (want - d.speed) * (1 - Math.exp(-c.w.dt * 1.4));
      d.yaw -= wob.x * TURN * c.w.dt;
      d.x += Math.sin(d.yaw) * d.speed * c.w.dt;
      d.z += Math.cos(d.yaw) * d.speed * c.w.dt;
      // Gates, in order.
      if (d.gate < d.gates.length) {
        const [gx, gz] = d.gates[d.gate];
        if (Math.hypot(gx - d.x, gz - d.z) <= GATE_REACH) {
          d.gate += 1;
          c.w.emit('gate', { gate: d.gate });
          if (d.gate < d.gates.length) lightGate(c, d);
          else {
            moveProp(c.w, d.props[0], 0, -20, 0, 0);
            d.finished = d.time;
            say(c, 'tare', 'paddle.done');
            c.a.done = true;
          }
        }
      }
      // The ferry's wake and the turtle.
      if (d.gate === 7 && !d.shoved.includes(7)) {
        d.shoved.push(7);
        wob.vy -= 1.5;
        wob.vx += 0.6;
        c.w.emit('wake', {});
        say(c, 'tare', 'paddle.wake');
        moveProp(c.w, d.wake, d.x, SEA_Y + 0.05, d.z + 6, d.yaw);
      }
      if (d.gate === 9 && !d.shoved.includes(9)) {
        d.shoved.push(9);
        wob.vx -= 1.3;
        c.w.emit('turtle', {});
        say(c, 'tare', 'paddle.turtle');
        moveProp(c.w, d.turtle, d.x + Math.sin(d.yaw) * 7, SEA_Y + 0.05, d.z + Math.cos(d.yaw) * 7, d.yaw + 1.4);
      }
      if (wob.recover > 0) {
        c.w.emit('splash', { x: d.x, z: d.z, y: SEA_Y });
        say(c, 'tare', 'paddle.fall');
        d.speed = 0;
        enter(c, 'remount');
      }
    }
    if (cast) {
      cast.x = d.x;
      cast.z = d.z;
      cast.yaw = d.yaw;
      if (c.a.phase === 'glide') cast.y = SEA_Y + 0.14;
      cast.pose = 'Paddling';
      cast.poseT = d.paddleT;
      cast.leanX = wob.x * 0.8;
      cast.leanY = wob.y * 0.6;
    }
    moveProp(c.w, d.board, d.x, SEA_Y + 0.02 + Math.sin(c.a.t * 0.05) * 0.015, d.z, d.yaw);
    const [gx, gz] = d.gates[Math.min(d.gate, d.gates.length - 1)];
    let err = Math.atan2(gx - d.x, gz - d.z) - d.yaw;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    c.hud.ring = [0, 0.55, 0.5];
    c.hud.meter = d.gate / d.gates.length;
    c.hud.meterLabel = `Gate ${Math.min(d.gate + 1, 12)} of 12`;
    c.hud.show = { err, speed: d.speed, seconds: Math.max(0, LENGTH - Math.floor(d.time / c.w.hz)), boost: d.boost };
    if (d.time >= steps(c, LENGTH)) {
      say(c, 'tare', 'paddle.time');
      c.a.done = true;
    }
  },
  bot(c, e, player: Player) {
    const d = c.a.data as unknown as PaddleData;
    const { seat, wobble } = e;
    seat.act = false;
    if (!player.acts) {
      holdAt(c.w, seat, wobble, 0, 0, player);
      seat.fl = seat.fr = 0;
      return;
    }
    const [gx, gz] = d.gates[Math.min(d.gate, d.gates.length - 1)];
    let err = Math.atan2(gx - d.x, gz - d.z) - d.yaw;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    const turn = Math.max(-0.55, Math.min(0.55, -err * 1.2));
    const go = Math.abs(err) < 0.9 ? 0.62 : 0.2;
    holdAt(c.w, seat, wobble, turn, go, player);
    const cycle = Math.round((c.w.hz / 1.2) * (player.name === 'perfect' ? 1 : 1.1));
    const t = c.a.t % cycle;
    const left = Math.floor(c.a.t / cycle) % 2 === 0;
    seat.fl = left && t < 6 ? 1 : 0;
    seat.fr = !left && t < 6 ? 1 : 0;
  },
  score(c) {
    const d = c.a.data as unknown as PaddleData;
    const bonus = d.finished > 0 ? 280 * Math.min(1, (steps(c, LENGTH) - d.finished) / steps(c, 40)) : 0;
    return d.gate * 60 + bonus;
  },
};
