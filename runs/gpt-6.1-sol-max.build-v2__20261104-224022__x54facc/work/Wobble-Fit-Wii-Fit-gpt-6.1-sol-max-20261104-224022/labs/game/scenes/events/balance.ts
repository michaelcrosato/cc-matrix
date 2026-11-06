/** @file Morning checks, scrubbed poses, and the pond's entirely unnecessary prompts. */
import { balanceBot, clamp, emptyLean } from '../wobble';
import { POSES, classPoses } from '../data/poses';
import type { ActivityRun, EventConfig, Guide } from './types';
import type { Lean, Wobble } from '../wobble';
export function balanceGuide(r: ActivityRun, c: EventConfig): Guide {
  const t = r.tick / 60;
  if (r.id === 'pond')
    return {
      x: 0,
      y: 0,
      ring: 0.22,
      title: 'Seated Nothing',
      instruction: 'Hold both feet to breathe in. Release to breathe out. Ignore the rest.',
      pose: 'Nothing',
      foot: 0,
    };
  if (r.id === 'check') {
    if (r.short)
      return {
        x: 0,
        y: 0,
        ring: 0.22,
        title: 'Still Ring',
        instruction: 'Lean gently to keep your dot in the ring. Breathe together.',
        pose: 'Stand',
        foot: 0,
      };
    if (t < 24)
      return {
        x: 0,
        y: 0,
        ring: t >= 14 && t < 18 ? 0.16 : 0.22,
        title: t < 6 ? 'A small question' : '01 / Still Ring',
        instruction:
          t < 6
            ? r.offset
              ? 'Tare: I know. Thank you for your answer.'
              : [
                  'Have you ever stood on one foot when nobody was looking? Either foot answers.',
                  'Did you sleep on your left side? Either foot answers.',
                  'Have you been leaning toward a decision? Either foot answers.',
                  'Have you noticed the marbles? Either foot answers.',
                  'Do you trust a small rock? Either foot answers.',
                ][Math.min(4, c.day - 1)]
            : t >= 18
              ? 'Good. Six targets next. They will wait.'
              : 'Keep your dot inside the ring. There is no hurry.',
        pose: 'Stand',
        foot: 0,
      };
    if (t >= 48 && t < 56)
      return {
        x: 0,
        y: 0,
        ring: 0.22,
        title: 'A short recalibration',
        instruction: 'The targets have been noted. One foot next.',
        pose: 'Stand',
        foot: 0,
      };
    if (t < 56) {
      const a = ((r.count % 6) * Math.PI) / 3 + r.seed * 0.1;
      return {
        x: Math.cos(a) * 0.48,
        y: Math.sin(a) * 0.48,
        ring: 0.16,
        title: '02 / Reach',
        instruction: `${Math.min(6, r.count + 1)} of 6 · Move to the coral target. Hold for half a second.`,
        pose: 'Stand',
        foot: 0,
      };
    }
    if (t >= 64)
      return {
        x: 0,
        y: 0,
        ring: 0.3,
        title: 'Recalibrating',
        instruction: 'Both feet may return. Tare is preparing one large number.',
        pose: 'Stand',
        foot: 0,
      };
    return {
      x: 0,
      y: 0,
      ring: 0.3,
      title: '03 / One Foot',
      instruction: 'Hold the left foot. Your other foot may enjoy the view.',
      pose: 'Heron',
      foot: 1,
    };
  }
  const ids = classPoses(c.day),
    block = r.length / ids.length;
  const pose = ids[Math.min(ids.length - 1, Math.floor(r.tick / block))];
  const p = POSES[pose],
    local = r.tick % block;
  const hold = c.get('pose.hold') * 60;
  const follow = local < 240 ? 0 : local < 840 ? Math.min(1, r.progress + 0.08) : 1;
  const x = p.x * follow * (p.id === 'Comma' && local > block * 0.65 ? -1 : 1);
  const instruction =
    local < 240
      ? 'Watch Plumb. Accept to begin when you are ready.'
      : local < 840
        ? 'Now you. Follow the ring into the pose.'
        : r.progress < 0.98 && local < 1440
          ? 'We will call that a start.'
          : local < 840 + hold
            ? p.line
            : 'And rest. You may continue breathing.';
  return {
    x,
    y: p.y * follow,
    ring: Math.min(p.ring, c.get('pose.ring')) * (c.expert ? 0.8 : 1),
    title: p.name,
    instruction,
    pose: p.id,
    foot: p.foot,
  };
}
export function stepBalance(r: ActivityRun, w: Wobble, input: Lean, c: EventConfig): void {
  if (r.id === 'pose') {
    const block = r.length / 3,
      part = Math.min(2, Math.floor(r.tick / block));
    if (part !== r.phase) {
      r.phase = part;
      r.progress = 0;
    }
  }
  const g = balanceGuide(r, c),
    distance = Math.hypot(w.x - g.x, w.y - g.y);
  const inRing = distance < g.ring;
  const footOkay = g.foot === 0 || (g.foot === 1 ? input.l > 0.5 && input.r < 0.5 : input.l > 0.5 && input.r > 0.5);
  if (r.id === 'pose') {
    const local = r.tick % (r.length / 3);
    if (local >= 240 && local < 840 && distance < 0.18 && footOkay) r.progress = Math.min(1, r.progress + 1 / 360);
  }
  if (r.id === 'pond') {
    const moved = Math.hypot(input.x, input.y) > 0.25 || input.act || input.l > 0.5 !== input.r > 0.5;
    if (moved && r.tick - r.lastTap >= 60) {
      r.composure = Math.max(0, r.composure - c.get('pond.penalty'));
      r.mistakes++;
      r.lastTap = r.tick;
    }
    r.breath += w.sync;
    r.samples++;
    r.score = Math.round(r.composure * (0.5 + (0.5 * r.breath) / r.samples));
    return;
  }
  if (r.id === 'check' && !r.short) {
    const t = r.tick / 60;
    if (t < 6 && (input.l > 0.5 || input.r > 0.5)) r.offset = input.l > 0.5 ? 1 : -1;
    if (t >= 6 && t < 18) {
      r.total += inRing ? 1 : 0;
      r.samples++;
    }
    if (t >= 24 && t < 48 && r.count < 6) {
      r.hold = inRing ? r.hold + 1 : 0;
      if (r.hold >= 30) {
        r.count++;
        r.hold = 0;
        if (r.count === 6) r.scores[2] = r.tick - 24 * 60;
      }
    }
    if (t >= 56 && t < 64) {
      r.scores[0] += inRing && input.l > 0.5 && input.r < 0.5 ? 1 : 0;
      r.scores[1]++;
    }
    const a = r.samples ? r.total / r.samples : 0,
      b = r.count === 6 ? 1 - r.scores[2] / (24 * 60) : 0,
      one = r.scores[1] ? r.scores[0] / r.scores[1] : 0;
    r.score = Math.round(clamp((0.45 * a + 0.3 * b + 0.25 * one) * 1000, 0, 1000));
    return;
  }
  if (r.id === 'pose' && input.act && r.tick % (r.length / 3) < 240) r.tick += 240;
  const quality = inRing && footOkay ? 1 : 0;
  r.total += quality;
  r.breath += w.sync;
  r.samples++;
  const b = r.breath / r.samples;
  r.score = clamp(
    Math.round(1000 * ((r.total / r.samples) * (g.foot ? 1 : 0.7) + (g.foot ? 0 : 0.3) * b) - w.topples * 35),
    0,
    1000,
  );
}
export function botBalance(r: ActivityRun, w: Wobble, c: EventConfig, kind: string): Lean {
  if (kind === 'idle') return emptyLean();
  const g = balanceGuide(r, c);
  if (r.id === 'pond')
    return {
      x: 0,
      y: 0,
      l: r.tick % (c.wobble.period * 60) < c.wobble.period * 30 ? 1 : 0,
      r: r.tick % (c.wobble.period * 60) < c.wobble.period * 30 ? 1 : 0,
      act: false,
    };
  const input = balanceBot(w, r.tick, c.wobble, [g.x, g.y], kind);
  if (g.foot === 1) {
    input.l = 1;
    input.r = 0;
  }
  if (g.foot === 3) input.l = input.r = 1;
  return input;
}
