/** @file Tilt-table marbles with friction, ridge collisions, cup capture and five data-driven trays. */
import { TRAYS } from '../data/trays';
import { clamp, emptyLean } from '../wobble';
import type { ActivityRun, EventConfig, Guide } from './types';
import type { Lean } from '../wobble';
export function loadTray(r: ActivityRun): void {
  r.marbles = TRAYS[r.tray].starts.map(([x, y]) => ({ x, y, vx: 0, vy: 0, sunk: false }));
}
export function gardenGuide(r: ActivityRun): Guide {
  return {
    x: 0,
    y: 0,
    ring: 0.2,
    title: `Tray ${r.tray + 1} / 5`,
    instruction: 'A gentle tilt. Then let the marble settle into the mint cup.',
    pose: 'Stand',
    foot: 0,
  };
}
export function stepGarden(r: ActivityRun, input: Lean, c: EventConfig): void {
  const tray = TRAYS[r.tray],
    dt = 1 / 60;
  const moving = r.tray === 4 ? Math.sin(r.tick / 90) * 0.18 : 0;
  for (let i = 0; i < r.marbles.length; i++) {
    const m = r.marbles[i];
    if (m.sunk) continue;
    m.vx = (m.vx + ((input.x * c.get('garden.gravity') * c.get('garden.tilt')) / 12) * dt) * 0.975;
    m.vy = (m.vy - ((input.y * c.get('garden.gravity') * c.get('garden.tilt')) / 12) * dt) * 0.975;
    const oldX = m.x,
      oldY = m.y;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    for (const [x1, y1, x2, y2] of tray.ridges) {
      if (x1 === x2 && Math.abs(m.x - x1 - moving) < 0.07 && m.y > y1 - 0.05 && m.y < y2 + 0.05) {
        m.x = oldX;
        m.vx *= -0.4;
      }
      if (y1 === y2 && Math.abs(m.y - y1 - moving) < 0.07 && m.x > x1 - 0.05 && m.x < x2 + 0.05) {
        m.y = oldY;
        m.vy *= -0.4;
      }
    }
    if (Math.abs(m.x) > 0.88 || Math.abs(m.y) > 0.88) {
      if (tray.gap && m.y > 0.88 && Math.abs(m.x) < 0.2) {
        m.x = tray.starts[i][0];
        m.y = tray.starts[i][1];
        r.mistakes++;
      }
      m.x = clamp(m.x, -0.88, 0.88);
      m.y = clamp(m.y, -0.88, 0.88);
      m.vx *= -0.4;
      m.vy *= -0.4;
    }
    const [hx, hy] = tray.holes[i];
    if (Math.hypot(m.x - hx, m.y - hy) < 0.13 && Math.hypot(m.vx, m.vy) < c.get('garden.sink')) {
      m.sunk = true;
      r.sunk++;
    }
  }
  if (r.marbles.every((m) => m.sunk) && r.tray < 4) {
    r.tray++;
    loadTray(r);
  }
  if (r.sunk === 9) r.length = r.tick + 1;
  r.score = Math.round(clamp((r.sunk / 9) * 800 + (r.sunk === 9 ? (1 - r.tick / (90 * 60)) * 200 : 0), 0, 1000));
}
export function gardenBot(r: ActivityRun, kind: string): Lean {
  if (kind === 'idle') return emptyLean();
  const i = r.marbles.findIndex((m) => !m.sunk);
  if (i < 0) return emptyLean();
  const m = r.marbles[i],
    [hx, hy] = TRAYS[r.tray].holes[i];
  let tx = hx,
    ty = hy;
  if (r.tray === 1 && m.x < 0.12) ty = 0.45;
  if (r.tray === 2 && m.y > 0.12 && Math.abs(m.x) < 0.4) tx = m.x < 0 ? -0.55 : 0.55;
  if (r.tray === 3 && m.x * hx < 0 && Math.abs(m.y) < 0.55) ty = m.y < 0 ? -0.65 : 0.65;
  if (r.tray === 4 && m.y > 0.12 && Math.abs(m.x) < 0.4) tx = 0.52;
  const scale = kind === 'sloppy' ? 0.65 : 1;
  return {
    ...emptyLean(),
    x: clamp((tx - m.x) * 3 - m.vx * 3.4) * scale,
    y: -clamp((ty - m.y) * 3 - m.vy * 3.4) * scale,
  };
}
