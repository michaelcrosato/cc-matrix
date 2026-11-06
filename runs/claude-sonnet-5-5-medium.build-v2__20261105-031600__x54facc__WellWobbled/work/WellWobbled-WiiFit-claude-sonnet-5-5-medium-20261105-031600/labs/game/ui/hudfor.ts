/**
 * @file What the HUD shows for each activity: the Balance Disc's target ring, guide dot or target, whether breath is shown, and
 * the strip text (rep count, combo, gates…), all read from the sim's `act` registers. Page-side; reads only.
 * @example
 * hudFor('morning', run, wobble).ring; // [0, 0, 0.22] during the still ring
 */
import { CLASSES, POSES } from '../scenes/data/poses';
import { guide } from '../scenes/events/pose';
import { EXERCISES, bandAt } from '../scenes/events/reps';
import { LINE_LENGTH } from '../scenes/events/line';
import type { ActData } from '../scenes/components';

export interface Extra {
  ring?: [number, number, number];
  target?: [number, number];
  guideDot?: [number, number];
  breath: boolean;
  disc: boolean;
  left: string;
  right: string;
}
const ORDER = 10;
export function hudFor(id: string, run: ActData, w: { x: number; y: number }, tempo: number, ringPose = 0.2): Extra {
  const a = run.a;
  const e: Extra = { breath: false, disc: true, left: '', right: '' };
  const ph = run.phase;
  if (id === 'morning') {
    if (ph === 'ring') e.ring = [0, 0, a[0] > 480 ? 0.16 : 0.22];
    else if (ph === 'reach') {
      const k = a[ORDER + a[3]] ?? 0;
      const ang = (k * Math.PI) / 3;
      e.target = [Math.sin(ang) * 0.5, Math.cos(ang) * 0.5];
      e.ring = [e.target[0], e.target[1], 0.16];
    } else if (ph === 'foot') {
      e.ring = [0, 0, 0.3];
      e.left = a[8] === 1 ? 'Hold LEFT foot' : 'Hold RIGHT foot';
    }
    e.right = ph === 'ask' ? '' : ph;
  } else if (id.startsWith('pose')) {
    const d = POSES[CLASSES[id][Math.min(CLASSES[id].length - 1, a[1])]];
    if (ph === 'enter') e.guideDot = guide(d, a[2]);
    if (ph === 'hold') {
      const s = d.seat2 && a[9] ? d.seat2 : d.seat;
      e.ring = [s[0], s[1], d.ring ?? ringPose];
    }
    e.breath = d.foot !== 3;
    e.left = d.title;
    e.right = `${Math.min(CLASSES[id].length, a[1] + 1)} / ${CLASSES[id].length}`;
  } else if (id === 'ring') {
    e.ring = [0, 0, a[0] > 450 ? 0.16 : 0.22];
    e.breath = true;
  } else if (id === 'reps') {
    const ex = EXERCISES[a[1]];
    const len = Math.round(tempo * 60);
    const band = bandAt(a[4], len);
    e.target = a[1] === 2 ? [(a[2] % 2 === 0 ? 1 : -1) * band * 0.6, 0] : [0, -band * 0.6];
    e.left = `Rep ${a[8] || a[2]} of ${a[9] || ex.n}`;
    e.right = `${a[1] + 1}/3`;
  } else if (id === 'pond') {
    e.breath = true;
    e.left = `Composure ${Math.round(a[1])}`;
  } else if (id === 'line') {
    e.left = `${a[1].toFixed(0)} m of ${LINE_LENGTH}`;
    e.right = `Falls ${a[2]}`;
  } else if (id === 'paddle') {
    e.left = `Gate ${a[4]} of 12`;
  } else if (id === 'garden') {
    e.disc = false;
    e.left = `Tray ${a[1] + 1} of 5`;
    e.right = `Sunk ${a[2]}`;
  } else if (id === 'cliff') {
    e.ring = [0, 0, 0.25];
    e.breath = false;
    e.left =
      ph === 'compose'
        ? `Power ${Math.round(a[2] * 100)}%`
        : ph === 'go'
          ? 'Release at the peak'
          : `Dive ${a[1] + 1} of 3`;
    e.right = `${Math.abs(Math.round(a[4]))}°`;
  } else if (id === 'hoop') {
    e.left = `Hoops ${a[10]}`;
    e.right = `spin ${a[1].toFixed(1)}`;
  } else if (id === 'jog') {
    e.left = 'Stay near Gerald';
  } else if (id === 'tilt') {
    e.breath = ph === 'stone';
    e.left = ph;
    e.right = `${a[4].toFixed(1)}°`;
    if (ph === 'stone') e.ring = [0, 0, a[18]];
  } else if (id === 'step') {
    e.disc = false;
    e.left = `Combo ${a[4]}`;
    e.right = `Best ${a[5]}`;
  }
  void w;
  return e;
}
