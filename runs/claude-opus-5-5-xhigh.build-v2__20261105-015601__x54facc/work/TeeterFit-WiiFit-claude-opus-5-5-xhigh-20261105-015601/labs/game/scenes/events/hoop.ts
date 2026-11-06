/**
 * @file Hoop Patrol (PLAN.md section 6): hoops fly in from Tare. Spin your stick in circles: angular speed in the band keeps
 * every hoop up; outside it they sink and fall. A new hoop every 8 s from a telegraphed side: lean that way within 0.6 s
 * to catch it. Up to eight at once. Alternate feet at 2.5 Hz counts as spinning too; a mouse circles. Every seat plays.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'hoop');
 */
import type { Player } from '../bot/players';
import { MAT_OFFSETS } from '../data/stations';
import { enter, floorShape, say, standSeats, steps } from './kit';
import type { Activity, Ctx, SeatEntity } from './types';

/** Seconds: the whole class, a new hoop, the warning, the catch. */
const LENGTH = 60;
const EVERY = 8;
const WARN = 1.2;
const WINDOW = 0.6;
const MAX_HOOPS = 8;
/** Hoop·seconds a very good class earns: 1000. */
const FULL = 275;
const FULL_SHORT = 150;

/** One seat's numbers. */
interface HoopSeat {
  angle: number;
  was: number[];
  spin: number;
  footT: number;
  lastFoot: string;
  hoops: number[];
  sum: number;
  shape: number[];
  caught: number;
  inBand: boolean;
  mouseAngle: number;
}

/** The class's state. */
interface HoopData {
  seats: HoopSeat[];
  next: number;
  side: number;
  phase: 'wait' | 'warn' | 'catch';
  phaseT: number;
  lead: number;
  waist: number[];
  length: number;
}

/** One seat's step. */
function stepSeat(c: Ctx, d: HoopData, e: SeatEntity): void {
  const s = d.seats[e.seat.index];
  const { w } = c;
  const { seat } = e;
  // The stick's angle round the centre.
  const size = Math.hypot(seat.lx, seat.ly);
  let rate = 0;
  if (size > 0.4) {
    const angle = Math.atan2(seat.ly, seat.lx);
    if (s.was.length) {
      const prior = s.was[0];
      const change = Math.atan2(Math.sin(angle - prior), Math.cos(angle - prior));
      rate = Math.abs(change) * w.hz;
    }
    s.was = [angle];
    s.angle = angle;
  } else s.was = [];
  // The mouse: its heading turning is a circle.
  if (seat.moved > 0.002) {
    const heading = Math.atan2(seat.my, seat.mx);
    const change = Math.atan2(Math.sin(heading - s.mouseAngle), Math.cos(heading - s.mouseAngle));
    rate = Math.max(rate, Math.abs(change) * w.hz);
    s.mouseAngle = heading;
    s.angle = heading;
  }
  // Alternating feet at 2.5 Hz or more counts as spinning.
  s.footT += 1;
  const foot = seat.pfl ? 'L' : seat.pfr ? 'R' : '';
  let feet = 0;
  if (foot && foot !== s.lastFoot) {
    if (s.footT <= w.hz / 2.5 + 2) feet = 7;
    s.footT = 0;
    s.lastFoot = foot;
  }
  if (feet > 0) rate = Math.max(rate, feet);
  if (s.footT < w.hz / 2.5 + 2 && s.lastFoot) rate = Math.max(rate, 7);
  s.spin += (rate - s.spin) * (1 - Math.exp(-w.dt / 0.22));
  const lo = w.settings.get<number>('game.hoop.bandMin');
  const hi = w.settings.get<number>('game.hoop.bandMax');
  s.inBand = s.spin >= lo && s.spin <= hi;
  // Hoops rise toward the waist in the band, and sink out of it.
  const speed = s.inBand ? 0.6 : -0.55;
  s.hoops = s.hoops.map((h) => Math.min(1, h + speed * w.dt));
  const before = s.hoops.length;
  s.hoops = s.hoops.filter((h) => h > 0);
  if (s.hoops.length < before) w.emit('hoopDrop', { seat: seat.index, left: s.hoops.length });
  s.sum += s.hoops.length * w.dt;
  const cast = w.get(seat.actor)?.cast;
  const y = d.waist[seat.index];
  s.shape.forEach((id, i) => {
    const ring = w.get(id)?.matRing;
    if (!ring || !cast) return;
    const shown = i < s.hoops.length;
    ring.telegraph = shown ? (i % 2 ? 'telegraph:hoop2' : 'telegraph:hoop') : '';
    const h = s.hoops[i] ?? 0;
    const wig = 0.05 * Math.sin(s.angle + i * 1.6);
    ring.position = [cast.x + wig, y - 0.55 + h * 0.55 + i * 0.07, cast.z + 0.05 * Math.cos(s.angle + i * 1.6)];
  });
  if (cast) {
    cast.pose = 'HipCircle';
    cast.poseT = (s.angle + Math.PI) / (2 * Math.PI);
    cast.leanX = cast.leanY = 0;
  }
}

/** Hoop Patrol. */
export const hoop: Activity = {
  id: 'hoop',
  title: 'Hoop Patrol',
  station: 'hoopBeach',
  map: 'actionMap:balance',
  shot: 'hoop',
  wobble: false,
  setup(c) {
    const lead = steps(c, c.a.short ? 6 : 2);
    const d: HoopData = {
      seats: [0, 1, 2, 3].map(() => ({
        angle: 0,
        was: [],
        spin: 0,
        footT: 999,
        lastFoot: '',
        hoops: [0.6],
        sum: 0,
        shape: [],
        caught: 0,
        inBand: false,
        mouseAngle: 0,
      })),
      next: lead + steps(c, 3),
      side: 1,
      phase: 'wait',
      phaseT: 0,
      lead,
      waist: [0, 0, 0, 0],
      length: steps(c, c.a.short ? 45 : LENGTH) + lead,
    };
    c.a.data = d as unknown as Record<string, unknown>;
    if (c.round) standSeats(c, MAT_OFFSETS, Math.PI);
    else {
      const guest = c.w.get(c.seats[0].seat.actor)?.cast;
      const [x, z] = [c.station.x, c.station.z];
      if (guest) Object.assign(guest, { hold: true, x, y: c.ground(x, z), z, yaw: Math.PI });
      const tare = c.w.query('cast').find((k) => k.cast.who === 'tare');
      if (tare)
        Object.assign(tare.cast, { hold: true, x: x + 3, y: c.ground(x + 3, z - 3), z: z - 3, yaw: Math.PI + 0.7 });
    }
    for (const e of c.seats) {
      const s = d.seats[e.seat.index];
      const cast = c.w.get(e.seat.actor)?.cast;
      const y = cast ? cast.y + 0.86 : 8.9;
      d.waist[e.seat.index] = y;
      for (let i = 0; i < MAX_HOOPS; i++) s.shape.push(floorShape(c, '', cast?.x ?? 0, y, cast?.z ?? 0));
    }
    c.hud.title = 'Hoop Patrol';
    c.hud.disc = false;
    enter(c, 'play');
    say(c, 'tare', 'hoop.start');
  },
  step(c) {
    const d = c.a.data as unknown as HoopData;
    const now = c.a.t;
    for (const e of c.seats) stepSeat(c, d, e);
    // New hoops.
    d.phaseT += 1;
    if (d.phase === 'wait' && now >= d.next) {
      d.phase = 'warn';
      d.phaseT = 0;
      d.side = c.w.rng('hoops').chance(0.5) ? 1 : -1;
      c.w.emit('hoopWarn', { side: d.side });
    } else if (d.phase === 'warn' && d.phaseT >= steps(c, WARN)) {
      d.phase = 'catch';
      d.phaseT = 0;
      c.w.emit('hoopFly', { side: d.side });
    } else if (d.phase === 'catch') {
      for (const e of c.seats) {
        const s = d.seats[e.seat.index];
        if (s.caught === d.next) continue;
        if (e.seat.lx * d.side > 0.5 || e.seat.mx * d.side > 0.01) {
          s.caught = d.next;
          if (s.hoops.length < MAX_HOOPS) s.hoops.push(0.4);
          c.w.emit('hoopCatch', { seat: e.seat.index, hoops: s.hoops.length });
        }
      }
      if (d.phaseT >= steps(c, WINDOW)) {
        d.phase = 'wait';
        d.next = now + steps(c, EVERY - WARN - WINDOW);
      }
    }
    const me = d.seats[c.seats[0].seat.index];
    const lo = c.w.settings.get<number>('game.hoop.bandMin');
    const hi = c.w.settings.get<number>('game.hoop.bandMax');
    c.hud.show = {
      spin: me.spin,
      lo,
      hi,
      hoops: me.hoops.length,
      phase: d.phase,
      side: d.side,
      angle: me.angle,
      inBand: me.inBand,
    };
    c.hud.meter = 1 - now / d.length;
    if (now >= d.length) c.a.done = true;
  },
  bot(c, e, player: Player) {
    const { seat } = e;
    seat.act = false;
    seat.fl = seat.fr = 0;
    if (!player.acts) {
      seat.lx = seat.ly = 0;
      return;
    }
    const mem = seat.mem as { angle?: number };
    const wobbly = player.name === 'perfect' ? 0 : player.name === 'human' ? 1.2 : 2.5;
    const rate = 7 + wobbly * Math.sin(c.a.t * 0.021 + seat.index);
    mem.angle = (mem.angle ?? 0) + rate * c.w.dt;
    const jitter = player.jitter;
    const rng = c.w.rng('botJitter', seat.index);
    seat.lx = Math.cos(mem.angle) + (jitter ? rng.range(-jitter, jitter) : 0);
    seat.ly = Math.sin(mem.angle) + (jitter ? rng.range(-jitter, jitter) : 0);
  },
  score(c, index) {
    const d = c.a.data as unknown as HoopData;
    return (1000 * d.seats[index].sum) / (c.a.short ? FULL_SHORT : FULL);
  },
};
