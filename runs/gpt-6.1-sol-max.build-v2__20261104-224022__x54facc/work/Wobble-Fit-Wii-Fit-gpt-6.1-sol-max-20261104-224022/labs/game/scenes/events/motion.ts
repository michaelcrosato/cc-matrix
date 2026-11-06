/** @file Foot-driven water sports, direct-control reps, rhythm, hoops, dives and the coast jog. */
import { BPMS, CHARTS } from '../data/charts';
import { balanceBot, clamp, emptyLean } from '../wobble';
import type { Lean, Wobble } from '../wobble';
import type { ActivityRun, EventConfig, Guide } from './types';
export function motionGuide(r: ActivityRun, c: EventConfig): Guide {
  const t = r.tick / 60;
  if (r.id === 'reps') {
    const phase = Math.min(2, Math.floor(t / 30));
    const v = 0.5 - 0.5 * Math.cos((t * Math.PI * 2) / c.get('reps.tempo'));
    return {
      x: phase === 2 ? Math.sin((t * Math.PI * 2) / c.get('reps.tempo')) * 0.75 : 0,
      y: phase === 2 ? 0 : -v * 0.8,
      ring: 0.2,
      title: ['Deep Knees', 'Polite Push-Ups', 'Side Lunges'][phase],
      instruction: `${r.count} repetitions · Follow the mint band. Four more. I may be lying.`,
      pose: ['DeepKnee', 'Pushup', 'SideLunge'][phase],
      foot: phase === 1 ? 3 : 0,
    };
  }
  if (r.id === 'line')
    return {
      x: 0,
      y: 0,
      ring: 0.28,
      title: `${Math.min(40, r.progress).toFixed(1)} / 40 m`,
      instruction:
        Math.floor(t) % 8 >= 6
          ? 'A gust is coming. The flag is trying to tell you.'
          : r.progress > 15 && r.progress < 20 && r.gate === 0
            ? 'The gull is a guest too. A fast lean shakes it off.'
            : 'Left foot. Right foot. Keep the dot centred.',
      pose: 'Line',
      foot: 0,
    };
  if (r.id === 'paddle')
    return {
      x: Math.sin((r.gate + 1) * 1.7 + r.seed) * 0.42,
      y: 0.35,
      ring: 0.3,
      title: `Gate ${Math.min(12, r.gate + 1)} / 12`,
      instruction:
        r.gate === 6
          ? 'Ferry wake ahead. It has right of way.'
          : r.gate === 8
            ? 'A turtle is considering the crossing.'
            : 'Steer into the mint channel. Alternate feet to paddle.',
      pose: 'Paddle',
      foot: 0,
    };
  if (r.id === 'step')
    return {
      x: 0,
      y: 0,
      ring: 0.3,
      title: `${Math.round(BPMS[Math.min(2, Math.floor(t / 33.4))] * c.get('step.bpm'))} BPM`,
      instruction: `${r.combo} in a row · Left foot · Right foot · Both to jump`,
      pose: 'Step',
      foot: 0,
    };
  if (r.id === 'hoop')
    return {
      x: Math.cos(t * 7) * 0.7,
      y: Math.sin(t * 7) * 0.7,
      ring: 0.3,
      title: `${r.count} hoops aloft`,
      instruction: 'Circle the stick. Or alternate feet. Keep a pleasantly undignified rhythm.',
      pose: 'HipCircle',
      foot: 0,
    };
  if (r.id === 'dive') {
    const phase = Math.floor((t % 18) / 6);
    return {
      x: 0,
      y: 0,
      ring: 0.25,
      title: `Dive ${Math.min(3, Math.floor(t / 18) + 1)} / 3 · ${['Compose', 'Go', 'Air'][phase]}`,
      instruction: [
        'Hold both feet. Breathe. The sea can wait.',
        'Release both feet at the top of the swinging gauge.',
        'Lean to spin and twist. Return to vertical for entry.',
      ][phase],
      pose: phase === 2 ? 'Somersault' : 'Lighthouse',
      foot: 0,
    };
  }
  return {
    x: Math.sin(t * 0.13) * 0.4,
    y: 0.3,
    ring: 0.28,
    title: 'The Pace Ribbon',
    instruction: 'Stay near Gerald. Alternate feet to find his pace.',
    pose: 'Jog',
    foot: 0,
  };
}
export function rhythmNote(
  r: ActivityRun,
  c: EventConfig,
  tick = r.tick,
): { note: string; beat: number; delta: number } {
  const part = Math.max(0, Math.min(2, Math.floor(tick / 2004))),
    bpm = BPMS[part] * c.get('step.bpm');
  const interval = 3600 / bpm;
  const beat = Math.round(tick / interval),
    delta = tick - beat * interval;
  const chart = CHARTS[part].split(' ');
  return { note: chart[((beat % chart.length) + chart.length) % chart.length], beat, delta };
}
export function stepMotion(r: ActivityRun, w: Wobble, input: Lean, c: EventConfig): void {
  if (r.id === 'reps') r.phase = Math.min(2, Math.floor(r.tick / 1800));
  if (r.id === 'dive') r.phase = Math.floor(((r.tick / 60) % 18) / 6);
  const g = motionGuide(r, c),
    left = input.l > 0.5,
    right = input.r > 0.5;
  const tapL = left && !r.lastL,
    tapR = right && !r.lastR;
  const tap = tapL || tapR,
    foot = tapL ? 1 : 2;
  const stable = Math.hypot(w.x - g.x, w.y - g.y) < g.ring;
  const t = r.tick / 60;
  if (r.id === 'reps') {
    const depth = r.phase === 2 ? w.tx * 0.75 : w.ty * 0.8;
    const target = r.phase === 2 ? g.x : g.y;
    const good = Math.abs(depth - target) < 0.2 && (g.foot !== 3 || (left && right));
    r.total += good ? 1 : 0;
    r.samples++;
    r.count = Math.floor(t / c.get('reps.tempo'));
    r.score = Math.round((r.total / r.samples) * 1000);
  } else if (r.id === 'step') {
    const n = rhythmNote(r, c);
    if (tap) {
      const valid =
        n.note === 'B' ? left && right : n.note === 'L' ? tapL && !right : n.note === 'R' ? tapR && !left : false;
      if (valid && Math.abs(n.delta) <= c.get('step.good') && r.lastTap !== n.beat) {
        r.lastTap = n.beat;
        r.count++;
        r.combo++;
        r.bestCombo = Math.max(r.combo, r.bestCombo);
        r.total += Math.abs(n.delta) <= c.get('step.perfect') ? 1 : 0.7;
      } else {
        r.combo = 0;
        r.mistakes++;
      }
    }
    if (Math.abs(n.delta - c.get('step.good') - 1) < 0.6 && n.note !== '.' && r.lastTap !== n.beat) r.combo = 0;
    r.samples = Math.max(1, Math.floor((t / (60 / 112)) * 0.66));
    r.score = Math.round(clamp(r.total / r.samples, 0, 1) * 1000);
  } else if (r.id === 'line') {
    if (tap && !(left && right)) {
      if (r.lastFoot === foot) {
        r.mistakes++;
        w.vx += foot === 1 ? -0.3 : 0.3;
      } else {
        r.progress = Math.min(40, r.progress + 0.75);
        w.vx += (foot === 1 ? -1 : 1) * c.get('line.stepKick');
      }
      r.lastFoot = foot;
    }
    if (r.tick % 480 > 420) w.vx += (Math.sin(r.seed + Math.floor(t / 8)) * c.get('line.gust')) / 60;
    if (r.progress > 15 && r.progress < 20 && input.x * r.angle < 0 && Math.abs(input.x - r.angle) > 0.8) r.gate = 1;
    r.angle = input.x;
    if (r.progress > 15 && r.progress < 20 && r.gate === 0) w.vx += 0.008;
    if (w.recover === 60) r.progress = Math.floor(r.progress / 15) * 15;
    r.score = Math.round(clamp(((1000 - w.topples * 150 - Math.max(0, t - 50) * 8) * r.progress) / 40, 0, 1000));
    if (r.progress >= 40) r.length = r.tick + 1;
  } else if (r.id === 'paddle') {
    const steering = Math.abs(w.x - g.x) < 0.28;
    if (tap && foot !== r.lastFoot) {
      r.hold = 90;
      r.lastFoot = foot;
    }
    r.hold = Math.max(0, r.hold - 1);
    const speed = Math.max(0, w.y) * c.get('paddle.speed') * (r.hold > 0 ? 1.3 : 1);
    r.progress += (speed / 60) * (steering ? 1 : 0.1);
    r.gate = Math.min(12, Math.floor(r.progress / 8));
    if ((r.gate === 7 || r.gate === 9) && r.tick % 60 === 0) w.vx += 0.8;
    r.score = Math.round(
      clamp(r.gate * 60 + (r.gate >= 12 ? Math.max(0, 1 - t / 75) * 280 : 0) - w.topples * 30, 0, 1000),
    );
    if (r.gate >= 12) r.length = r.tick + 1;
  } else if (r.id === 'hoop') {
    const a = Math.atan2(input.y, input.x),
      da = Math.atan2(Math.sin(a - r.previousAngle), Math.cos(a - r.previousAngle));
    const omega = Math.abs(da * 60);
    if (tap && foot !== r.lastFoot) {
      r.hold = 24;
      r.lastFoot = foot;
    }
    r.hold = Math.max(0, r.hold - 1);
    const spinning =
      (omega >= c.get('hoop.bandMin') && omega <= c.get('hoop.bandMax') && Math.hypot(input.x, input.y) > 0.3) ||
      r.hold > 0;
    r.previousAngle = a;
    r.angle += da;
    r.velocity = clamp(r.velocity + (spinning ? 0.02 : -0.012), 0, 1);
    r.count = Math.min(8, Math.max(0, Math.floor(t / 8) + 1 - Math.floor((1 - r.velocity) * 2)));
    r.total += spinning ? 1 : 0;
    r.samples++;
    r.score = Math.round((r.total / r.samples) * 1000);
  } else if (r.id === 'dive') {
    const local = r.tick % 1080;
    if (r.phase === 0) r.hold = clamp(r.hold + (stable && left && right ? 0.004 : -0.001), 0, 1);
    if (r.phase === 1 && !left && !right && (r.lastL || r.lastR) && r.offset === 0)
      r.offset = 0.5 + 0.5 * Math.sin(local / 25);
    if (r.phase === 2) {
      r.angle += input.y * 0.07;
      r.velocity += input.x * 0.04;
    }
    if (local === 1079) {
      const vertical = 1 - Math.min(1, Math.abs(Math.sin(r.angle)) + Math.abs(Math.sin(r.velocity)));
      const dive = clamp((r.hold * 0.4 + r.offset * 0.3 + vertical * 0.3) * 1000, 0, 1000);
      r.scores.push(dive);
      r.score = Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length);
      r.hold = 0;
      r.offset = 0;
      r.angle = 0;
      r.velocity = 0;
    }
  } else if (r.id === 'jog') {
    if (tap && foot !== r.lastFoot) {
      r.hold = 30;
      r.lastFoot = foot;
    }
    r.hold = Math.max(0, r.hold - 1);
    const pace = Math.abs(input.x - g.x) < 0.4 && input.y > 0.1 && r.hold > 0;
    r.total += pace ? 1 : 0;
    r.samples++;
    r.progress += (pace ? 1 : 0.2) / 60;
    r.score = Math.round((r.total / r.samples) * 1000);
  }
  r.lastL = left;
  r.lastR = right;
}
export function motionBot(r: ActivityRun, w: Wobble, c: EventConfig, kind: string): Lean {
  if (kind === 'idle') return emptyLean();
  const g = motionGuide(r, c),
    input = balanceBot(w, r.tick, c.wobble, [g.x, g.y], kind);
  const error = kind === 'human' ? 3 : kind === 'sloppy' ? 6 : 0;
  if (r.id === 'reps' || r.id === 'jog') {
    input.x = r.id === 'reps' ? g.x / 0.75 : g.x;
    input.y = r.id === 'reps' ? g.y / 0.8 : g.y;
  }
  if (r.id === 'line' || r.id === 'paddle' || r.id === 'jog') {
    const k = Math.floor(r.tick / 24) % 2;
    input.l = r.tick % 24 < 4 && k === 0 ? 1 : 0;
    input.r = r.tick % 24 < 4 && k === 1 ? 1 : 0;
  }
  if (r.id === 'step') {
    const n = rhythmNote(r, c, r.tick - error),
      hit = Math.abs(n.delta) < 0.6;
    input.l = hit && (n.note === 'L' || n.note === 'B') ? 1 : 0;
    input.r = hit && (n.note === 'R' || n.note === 'B') ? 1 : 0;
  }
  if (r.id === 'hoop') {
    input.x = Math.cos((r.tick / 60) * 7) * 0.75;
    input.y = Math.sin((r.tick / 60) * 7) * 0.75;
  }
  if (r.id === 'dive') {
    input.l = input.r = r.tick % 1080 < 511 ? 1 : 0;
    if (r.phase === 2) input.x = input.y = 0;
  }
  if (g.foot === 3) input.l = input.r = 1;
  return input;
}
