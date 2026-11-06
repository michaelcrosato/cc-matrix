/**
 * @file Teeter Fit's components: plain data the sim hashes. `flow` is where the game is, `activity` the activity
 * running (its own state in `data`, what the HUD shows in `hud`), `seat` one balancing person's input, `wobble` their
 * body, `cast` a named person on the island, `island` the tilt, `pebble`, `plaque`, `ghost` and `critter` the rest.
 *
 * Game code, sim-side: it imports only engine/sim-api.ts.
 *
 * @example
 * // w.query('seat', 'wobble')[0].wobble.x; // the first seat's centre of balance, x
 */
import { defineComponent } from '../../../engine/sim-api';

export type * from './componentTypes';

/** Number field. */
const n = (value = 0, description = 'A number.') => ({ type: 'number', default: value, description }) as const;
/** Whole-number field. */
const i = (value = 0, description = 'A whole number.') => ({ type: 'integer', default: value, description }) as const;
/** Text field. */
const s = (value = '', description = 'Text.') => ({ type: 'string', default: value, description }) as const;
/** True or false field. */
const b = (value = false, description = 'A flag.') => ({ type: 'boolean', default: value, description }) as const;
/** List field. */
const list = (description = 'A list.') => ({ type: 'array', default: [], description }) as const;
/** Any plain object. */
const obj = (description = 'Plain data.') => ({ type: 'object', default: {}, description }) as const;

defineComponent('flow', {
  description: 'Where the game is: front end, roaming, an activity, a cutscene or results.',
  fields: {
    mode: s('front', 'front, roam, event, cutscene, results.'),
    event: s('', 'The activity running or just finished.'),
    day: i(1, 'The residency day, 1 to 6 (6: after).'),
    done: list('Activity ids finished today.'),
    seen: list('Activities met, for the Noticeboard.'),
    pebbles: i(0, 'Pebbles on the cairn.'),
    found: list('Hidden pebble and plaque ids found.'),
    ages: list('Wobble Ages so far, oldest first.'),
    last: obj('The last result: score, rank, pebbles, event, age.'),
    bests: obj('Best score by activity.'),
    look: i(0, 'Guest look, 0 to 2.'),
    color: s('coral', 'Guest tracksuit colour.'),
    attract: b(false, 'The attract loop is running.'),
    roster: i(0, 'Which attract act is on.'),
    actTick: i(0, 'Steps in this attract act.'),
    focus: i(-1, 'The usable the Guest is looking at, by index.'),
    question: i(0, 'Morning question answer, 1 yes, 2 no.'),
    script: i(0, 'The playthrough script step.'),
    cutTick: i(0, 'Steps in this cutscene.'),
    cut: s('', 'The cutscene playing.'),
    credits: b(false, 'The credits are rolling.'),
    resting: i(0, 'Steps sat on a bench.'),
    camYaw: n(0, 'The camera heading the page reports.'),
  },
});

defineComponent('activity', {
  description: 'The activity running: its id, phase, step counters, seats and its own plain data.',
  fields: {
    id: s('', 'Activity id.'),
    short: b(false, 'The 45-second form for rounds.'),
    phase: s('', 'Where in the activity it is.'),
    t: i(0, 'Steps in this activity.'),
    pt: i(0, 'Steps in this phase.'),
    done: b(false, 'Finished: flow takes it to results.'),
    score: n(0, 'Seat 0 score, 0 to 1000.'),
    scores: list('Score by seat.'),
    data: obj('The activity own state.'),
    hud: obj('What the HUD shows, written by the activity.'),
    spawned: list('Entities to remove at teardown.'),
    actors: list('Actors to remove at teardown.'),
  },
});

defineComponent('seat', {
  description: 'One balancing person: who feeds them and what they press this step.',
  fields: {
    index: i(0, 'Seat number, 0 to 3.'),
    kind: s('local', 'local, pad, cpu, off.'),
    skill: s('', 'cpu seats: which bot.'),
    sway: n(1, 'cpu seats: extra sway multiplier.'),
    actor: i(-1, 'The actor they stand in.'),
    lx: n(0, 'Lean right.'),
    ly: n(0, 'Lean forward.'),
    fl: n(0, 'Left foot, 0 to 1.'),
    fr: n(0, 'Right foot, 0 to 1.'),
    act: b(false, 'An act button is down.'),
    actP: b(false, 'An act button went down this step.'),
    pfl: b(false, 'Left foot went down this step.'),
    pfr: b(false, 'Right foot went down this step.'),
    wasL: b(false, 'Left foot held last step.'),
    wasR: b(false, 'Right foot held last step.'),
    wasA: b(false, 'Act held last step.'),
    gentle: b(false, 'Gentle lean held.'),
    mx: n(0, 'Mouse lean, x, this step.'),
    my: n(0, 'Mouse lean, y, this step.'),
    px: n(0, 'Pointer place x, -1 to 1 (Sand Garden).'),
    py: n(0, 'Pointer place y, -1 to 1.'),
    pointer: b(false, 'The pointer place is live.'),
    moved: n(0, 'Mouse travel this step.'),
    hist: list('Bot memory: recent CoB positions.'),
    mem: obj('Bot memory by activity.'),
  },
});

defineComponent('wobble', {
  description: 'A centre of balance in the unit disc, its velocity, the breath, the sway.',
  fields: {
    x: n(0, 'CoB right.'),
    y: n(0, 'CoB forward.'),
    vx: n(0, 'Velocity x.'),
    vy: n(0, 'Velocity y.'),
    tx: n(0, 'Slewed lean target x.'),
    ty: n(0, 'Slewed lean target y.'),
    mx: n(0, 'Mouse target x.'),
    my: n(0, 'Mouse target y.'),
    dx: n(0, 'Disturbance this step, x.'),
    dy: n(0, 'Disturbance this step, y.'),
    instMul: n(1, 'Instability multiplier.'),
    swayMul: n(1, 'Sway multiplier.'),
    on: b(false, 'Stepped this step.'),
    usesBreath: b(true, 'Both feet are breath here.'),
    over: i(0, 'Steps past the edge.'),
    recover: i(0, 'Steps left of recovery.'),
    topples: i(0, 'Topples so far.'),
    bt: i(0, 'Breath steps counted.'),
    guide: n(0, 'The guide lungs, 0 to 1.'),
    lungs: n(0, 'Your lungs, 0 to 1.'),
    sync: n(0, 'Running match with the guide, 0 to 1.'),
    calm: n(0, 'Calm, 0 to 1.'),
    phases: list('Sway phases.'),
    rates: list('Sway rate ratios.'),
  },
});

defineComponent('cast', {
  description: 'A named person on the island, held in place while an activity or scene wants them there.',
  fields: {
    who: s('', 'guest, plumb, tare, gerald, bex, nan, or class.'),
    hold: b(false, 'Placed each step at x, y, z.'),
    x: n(0, 'Held east.'),
    y: n(0, 'Held up.'),
    z: n(0, 'Held south.'),
    yaw: n(0, 'Held facing.'),
    pose: s('', 'The strip scrubbed.'),
    poseT: n(0, 'Pose progress.'),
    leanX: n(0, 'Lean right, -1 to 1.'),
    leanY: n(0, 'Lean forward, -1 to 1.'),
    home: list('Where it roams from: x, z.'),
  },
});

defineComponent('island', {
  description: 'How far out of true the island is.',
  fields: {
    tilt: n(0.4, 'The story tilt, degrees.'),
    tiltX: n(0, 'Finale tilt east, degrees.'),
    tiltZ: n(0, 'Finale tilt south, degrees.'),
    storm: n(0, 'Storm level, 0 to 1.'),
    sky: s('day', 'day, dusk, dawn, storm.'),
    seaX: n(0, 'Sea drift.'),
    seaZ: n(0, 'Sea drift.'),
  },
});

defineComponent('pebble', {
  description: 'A hidden pebble on the island.',
  fields: { index: i(0, 'Its number.'), prop: i(-1, 'Its prop.') },
});

defineComponent('plaque', {
  description: 'A plaque that creeps downhill by the day.',
  fields: { index: i(0, 'Its number.'), x: n(0, 'East.'), z: n(0, 'South.'), prop: i(-1, 'Its prop.') },
});

defineComponent('cairnStone', {
  description: 'A pebble on your cairn.',
  fields: { index: i(0, 'Which from the bottom.'), prop: i(-1, 'Its prop.') },
});

defineComponent('block', {
  description: 'A plain block, stacked for the pillars of a session: drawn as a stand-in, so it warms no prop.',
  fields: {
    x: { type: 'number', default: 0, unit: 'm', description: 'East.' },
    y: { type: 'number', default: 0, unit: 'm', description: 'Up: the bottom of its box.' },
    z: { type: 'number', default: 0, unit: 'm', description: 'South.' },
    yaw: { type: 'number', default: 0, unit: 'rad', description: 'Its turn.' },
    size: { type: 'number', default: 0.4, unit: 'm', description: 'The side of its box.' },
    material: s('material:white', 'What it is drawn with.'),
  },
});

defineComponent('sea', {
  description: 'The sea prop: the world drifts it.',
  fields: { on: b(true, 'Always.') },
});

defineComponent('slider', {
  description: 'A prop that slides with the story tilt: a drink, for instance.',
  fields: { x: n(0, 'Where it started, east.'), phase: n(0, 'Its phase.'), span: n(0.03, 'How far it slides.') },
});

defineComponent('roller', {
  description: 'A marble that rolls by itself from Day 4.',
  fields: { x: n(0, 'Centre, east.'), z: n(0, 'Centre, south.'), y: n(0, 'Height when shown.') },
});

defineComponent('ferry', {
  description: 'The ferry: it leaves, and does not return.',
  fields: { t: i(0, 'Steps since it left.') },
});

defineComponent('critter', {
  description: 'The Gull or the Frog: a blob on a blob rig, with where it wants to be.',
  fields: {
    kind: s('gull', 'gull or frog.'),
    goalX: n(0, 'Wants to be, east.'),
    goalY: n(0, 'Up.'),
    goalZ: n(0, 'South.'),
    look: n(0, 'Looks towards, rad.'),
    speed: n(6, 'How fast it gets there.'),
    away: b(true, 'Off screen, waiting.'),
    tick: i(0, 'Its clock.'),
  },
});

defineComponent('ghost', {
  description: 'Another player in the session, on their own mat.',
  fields: {
    id: i(0, 'Their player id.'),
    x: n(0, 'Their CoB x.'),
    y: n(0, 'Their CoB y.'),
    e: i(0, 'Which class they are in.'),
    p: s('', 'Their pose.'),
    s: n(0, 'Their score.'),
    gone: b(false, 'They left.'),
    goneT: i(0, 'Steps since they left.'),
    t: i(0, 'Steps since the last message.'),
    actor: i(-1, 'The actor drawn.'),
    active: b(true, 'Shown now.'),
  },
});

defineComponent('matRing', {
  description: 'A ring on the floor of a mat, drawn as a telegraph.',
  fields: {
    telegraph: s('telegraph:matRing', 'The telegraph.'),
    position: { type: 'array', default: [0, 0, 0], description: 'Its place.' },
    yaw: n(0, 'Its turn.'),
    u: n(1, 'Its fill.'),
    size: n(1, 'Its size.'),
    owner: i(-1, 'The entity it follows.'),
  },
});
