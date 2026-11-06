/**
 * @file The retreat's plain data: where the day is, what the activity is counting, and the island's tilt.
 * Arrays are given fresh at spawn. Nothing here is remembered in a module variable.
 */
import { defineComponent, type World } from '../../../engine/sim-api';

/** Where the guest is in the day. */
export interface Flow {
  mode: string;
  event: string;
  day: number;
  cursor: number;
  seen: string;
  credits: number;
  line: string;
  result: number;
  age: number;
  pebbles: number;
  rank: string;
  prior: number;
}

/** The activity blackboard. `goals` holds targets, lure times and marble holes. */
export interface Act {
  phase: number;
  tick: number;
  left: number;
  done: number;
  a: number;
  b: number;
  c: number;
  n: number;
  m: number;
  hold: number;
  falls: number;
  dist: number;
  gx: number;
  gy: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  hx: number;
  hz: number;
  calm: number;
  wait: number;
  samples: number;
  acc: number;
  acc2: number;
  top0: number;
  pose: number;
  flags: number;
  foot: number;
  text: string;
  goals: number[];
}

/** The island's lean, in degrees. The mesh never moves. The push does. */
export interface Island {
  tiltX: number;
  tiltZ: number;
  base: number;
}

const num = (description: string) => ({ type: 'number' as const, default: 0, description });
const str = (description: string) => ({ type: 'string' as const, default: '', description });

/** The component `flow`. One entity holds the day. */
export const FLOW = defineComponent('flow', {
  description: 'The day, the activity, the score on the table and whether the credits have rolled.',
  fields: {
    mode: str('title, roam, event, results, evening or credits.'),
    event: str('The activity id while one is running.'),
    day: { type: 'integer', default: 1, description: 'The residency day, from 1.' },
    cursor: { type: 'integer', default: 0, description: 'The programme index.' },
    seen: str('Comma-separated ids already visited.'),
    credits: { type: 'integer', default: 0, description: '1 once the credits have started.' },
    line: str('The line id the page should say.'),
    result: num('The last score, 0 to 1000.'),
    age: num('The last Wobble Age.'),
    pebbles: num('Pebbles stacked so far. They are not spent.'),
    rank: str('The last rank word.'),
    prior: num("Yesterday's Wobble Age, or 0."),
  },
});

/** The component `act`. One entity holds the activity. */
export const ACT = defineComponent('act', {
  description: 'Counters for the activity that is running. Cleared when the next one starts.',
  fields: {
    phase: num('Which part of the activity is playing.'),
    tick: num('Steps since this activity started.'),
    left: num('Steps left in a box, or steps into the current part.'),
    done: num('1 when the activity has ended itself.'),
    a: num('Score part A, or a frozen class score.'),
    b: num('Score part B.'),
    c: num('Score part C.'),
    n: num('A count.'),
    m: num('Another count.'),
    hold: num('Steps the current target has been held.'),
    falls: num('Falls, topples or splashes the score counts.'),
    dist: num('Metres along a line, or a share.'),
    gx: num('Guide or goal, left to right.'),
    gy: num('Guide or goal, back to forward.'),
    px: num('A board, a marble or a guest, east.'),
    py: num('A board, a marble or a guest, south.'),
    vx: num('Speed east.'),
    vy: num('Speed south.'),
    hx: num('Lateral error, or a heading.'),
    hz: num('A second heading or a bias.'),
    calm: num('Composure, or a stored calm.'),
    wait: num('Steps until the next penalty or lure.'),
    samples: num('Steps counted toward a share.'),
    acc: num('Steps that counted, or a sum.'),
    acc2: num('A second sum, usually breath.'),
    top0: num('Topples at the start of a hold.'),
    pose: num('Which pose or tray is up.'),
    flags: num('Small bit flags for the activity.'),
    foot: num('The foot in use. 1 left, 2 right.'),
    text: str('A lure id, a pose id, or a short note.'),
    goals: { type: 'array', items: { type: 'number' }, default: [], description: 'Targets and schedules.' },
  },
});

/** The component `island`. */
export const ISLAND = defineComponent('island', {
  description: 'How far the island is leaning. Geometry stays. People and drinks do not.',
  fields: {
    tiltX: num('Lean toward the west, degrees.'),
    tiltZ: num('Lean toward the north, degrees.'),
    base: num('The story lean for this day, degrees.'),
  },
});

/** Something an activity spawned and must remove. */
export const MADE = defineComponent('made', {
  description: 'An entity an activity spawned. Teardown removes every one.',
  fields: { tag: str('What it was.') },
});

/** A neighbour's lean, sent by the hub. It never moves the local guest. */
export const GHOST = defineComponent('ghost', {
  description: 'Another player on the next mat. Drawn from hub messages. Local play ignores it.',
  fields: {
    on: num('1 while a message has arrived for this seat.'),
    x: num('Their centre, left to right.'),
    y: num('Their centre, back to forward.'),
    seat: { type: 'integer', default: 0, description: 'Their mat.' },
    pose: num('Which class they are in.'),
  },
});

/** Who an actor is. The pilot reads it. */
export const ROLE = defineComponent('role', {
  description: 'Which member of the retreat this actor is.',
  fields: { who: str('guest, plumb, tare, gerald, bex, nan, gull or frog.') },
});

/** A guest drifting in the finale, or a plaque, drawn as a small box. */
export const MARK = defineComponent('mark', {
  description: 'A placed thing: a hidden pebble, a plaque, a drifting guest or a mat.',
  fields: {
    x: { type: 'number', default: 0, unit: 'm', description: 'East.' },
    y: { type: 'number', default: 0, unit: 'm', description: 'Up.' },
    z: { type: 'number', default: 0, unit: 'm', description: 'South.' },
    kind: str('pebble, plaque, guest, mat or cairn.'),
    text: str('A line id, when it has one.'),
    taken: num('1 once a pebble is picked up.'),
    follow: num('1 when a finale guest is walking with you.'),
  },
});

/** A blank activity board with its own array. */
export function emptyAct(): Act {
  return {
    phase: 0,
    tick: 0,
    left: 0,
    done: 0,
    a: 0,
    b: 0,
    c: 0,
    n: 0,
    m: 0,
    hold: 0,
    falls: 0,
    dist: 0,
    gx: 0,
    gy: 0,
    px: 0,
    py: 0,
    vx: 0,
    vy: 0,
    hx: 0,
    hz: 0,
    calm: 0,
    wait: 0,
    samples: 0,
    acc: 0,
    acc2: 0,
    top0: 0,
    pose: 0,
    flags: 0,
    foot: 0,
    text: '',
    goals: [],
  };
}

/** The first entity's component, which boot always spawns. */
export function part<T>(w: World, name: string): T {
  const rows = w.query(name as never) as unknown as Record<string, T>[];
  const row = rows[0];
  if (!row) throw new Error(`missing ${name}`);
  return row[name];
}

/** Records `id` once on the comma list. */
export function visit(flow: Flow, id: string): void {
  const parts = flow.seen ? flow.seen.split(',') : [];
  if (!parts.includes(id)) parts.push(id);
  flow.seen = parts.join(',');
}

/** Clears the board and keeps the same array object only after replacing it. */
export function resetAct(act: Act): void {
  const next = emptyAct();
  Object.assign(act, next);
}
