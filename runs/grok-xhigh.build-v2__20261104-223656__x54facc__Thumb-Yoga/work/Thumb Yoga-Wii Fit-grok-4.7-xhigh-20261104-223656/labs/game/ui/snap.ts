/**
 * @file What one drawn frame tells the shell. The page reads the sim and never writes it.
 */
import type { EngineFrame } from '../../../engine';
import { ageRemark } from '../scenes/score';

/** One frozen step of the retreat, read for the HUD. */
export interface Snap {
  mode: string;
  event: string;
  day: number;
  cursor: number;
  credits: number;
  line: string;
  result: number;
  age: number;
  prior: number;
  finds: string[];
  pebbles: number;
  rank: string;
  seen: string;
  phase: number;
  text: string;
  calm: number;
  a: number;
  b: number;
  c: number;
  ax: number;
  ay: number;
  wx: number;
  wy: number;
  wz: number;
  guest: boolean;
}

/** Activity ids as the menus name them. */
export const NAMES: Record<string, string> = {
  morning: 'Morning Check',
  'pose-a': 'Pose Class',
  'pose-b': 'Pose Class',
  'pose-c': 'Pose Class',
  pond: 'Still Pond',
  garden: 'Sand Garden',
  paddle: 'Paddle Glide',
  line: 'The Line',
  group: 'Group Class',
  tilt: 'Great Tilt',
  evening: 'Evening',
  credits: 'Credits',
};

/** A blank snap, before the first frame. */
export function emptySnap(): Snap {
  return {
    mode: 'title',
    event: '',
    day: 1,
    cursor: 0,
    credits: 0,
    line: '',
    result: 0,
    age: 0,
    prior: 0,
    finds: [],
    pebbles: 0,
    rank: '',
    seen: '',
    phase: 0,
    text: '',
    calm: 0,
    a: 0,
    b: 0,
    c: 0,
    ax: 0,
    ay: 0,
    wx: 0,
    wy: 1,
    wz: 6,
    guest: false,
  };
}

/** A number field on a frozen component. */
function num(row: Record<string, unknown> | undefined, key: string): number {
  const value = row?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** A string field on a frozen component. */
function str(row: Record<string, unknown> | undefined, key: string): string {
  const value = row?.[key];
  return typeof value === 'string' ? value : '';
}

/** The first entity's component, if the query has one. */
function comp(frame: EngineFrame, query: string, name: string): Record<string, unknown> | undefined {
  const row = frame.world.query(query)[0] as Record<string, unknown> | undefined;
  const part = row?.[name];
  return part && typeof part === 'object' ? (part as Record<string, unknown>) : undefined;
}

/** Reads the day, the balance dot, and the guest's feet. */
export function readSnap(frame: EngineFrame): Snap {
  const flow = comp(frame, 'flow', 'flow');
  const act = comp(frame, 'act', 'act');
  const wobble = comp(frame, 'wobble', 'wobble');
  const snap = emptySnap();
  if (flow) {
    snap.mode = str(flow, 'mode') || 'title';
    snap.event = str(flow, 'event');
    snap.day = num(flow, 'day') || 1;
    snap.cursor = num(flow, 'cursor');
    snap.credits = num(flow, 'credits');
    snap.line = str(flow, 'line');
    snap.result = num(flow, 'result');
    snap.age = num(flow, 'age');
    snap.prior = num(flow, 'prior');
    snap.pebbles = num(flow, 'pebbles');
    snap.rank = str(flow, 'rank');
    snap.seen = str(flow, 'seen');
  }
  snap.phase = num(act, 'phase');
  snap.text = str(act, 'text');
  snap.calm = num(act, 'calm') || num(wobble, 'calm');
  snap.a = num(act, 'a');
  snap.b = num(act, 'b');
  snap.c = num(act, 'c');
  snap.ax = num(wobble, 'x');
  snap.ay = num(wobble, 'y');
  const found: string[] = [];
  for (const row of frame.world.query('mark') as Record<string, unknown>[]) {
    const mark = row.mark;
    if (!mark || typeof mark !== 'object') continue;
    const spot = mark as { kind?: string; taken?: number; text?: string };
    if (spot.kind === 'pebble' && (spot.taken ?? 0) > 0.5 && typeof spot.text === 'string') found.push(spot.text);
  }
  snap.finds = found;
  const actors = frame.world.query('actor') as Record<string, unknown>[];
  for (const actor of actors) {
    const role = actor.role as { who?: string } | undefined;
    const body = actor.actor as { x?: number; y?: number; z?: number } | undefined;
    if (role?.who === 'guest' && body) {
      snap.guest = true;
      snap.wx = body.x ?? 0;
      snap.wy = body.y ?? 0;
      snap.wz = body.z ?? 0;
    }
  }
  return snap;
}

/** Which song this moment uses. Attract follows the activity it is showing. */
export function songFor(snap: Snap): string {
  if (snap.mode === 'results') return 'song:stamp';
  if (snap.mode === 'credits' || (snap.event === 'tilt' && snap.phase >= 3)) return 'song:dawn';
  if (snap.event === 'garden') return 'song:rake';
  if (snap.event === 'line' || snap.event === 'paddle') return 'song:water';
  if (snap.event === 'tilt') return 'song:tilt';
  if (snap.mode === 'title' || snap.mode === 'roam' || snap.event === '') return 'song:lobby';
  return 'song:stillness';
}

/** The results line. A morning puts today's Wobble Age beside yesterday, then the rank. */
export function resultCopy(snap: Snap, rankLine: string): string {
  const score = `${snap.rank}. ${Math.round(snap.result)}. ${rankLine}`;
  if (snap.event !== 'morning') return score;
  return `${ageRemark(snap.age, snap.prior)} ${score}`;
}

/** The mean of a group class, or the stamped result. */
export function runningScore(snap: Snap): number {
  if (snap.mode === 'results') return snap.result;
  const mean = (snap.a + snap.b + snap.c) / 3;
  return Number.isFinite(mean) ? Math.round(mean) : 0;
}
