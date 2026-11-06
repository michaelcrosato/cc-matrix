// The plan's whole time-in-ring table (section 4). Bots on the bare Dot, then the three devices through the real
// input layer: engine input, the real LocalDriver and deadzone, the real Dot. Same conditions as the plan: 35 s, 40 seeds, first 2 s not counted.
import { assert, boot, done, test, App } from '../lib.mjs';
import { installPad, makeHands, stubPad } from './_people.mjs';
import { Dot } from '../../src/core/dot.js';
import { BotBrain, LocalDriver, SKILLS, blankInput } from '../../src/core/drivers.js';
import { T } from '../../src/core/tunables.js';

const RINGS = [0.4, 0.3, 0.22, 0.16];
const TOLERANCE = 4;
const PLAN = {
  idle: [11, 7, 4, 2], sloppy: [21, 13, 7, 4], average: [71, 51, 31, 18], good: [100, 93, 74, 49], expert: [100, 100, 98, 79],
  pad: [71, 51, 31, 18], keyboard: [88, 70, 47, 28], mouse: [95, 82, 59, 36],
};
// The plan doesn't say who its keyboard and mouse players are, so this is measured, not given: its "average" brain sees and
// reacts the same on every device, and these two numbers are fitted to the plan's rows. A stick drifts under the thumb (.8);
// keys are on or off and a mouse stays where it's put, so the hand wanders half as far. Keys go down at a want of .3.
const HAND_ERROR = { pad: SKILLS.average.err, keyboard: 0.38, mouse: 0.38 };
const KEY_PRESS_AT = 0.3;

installPad();
const h = await boot({ scene: 'title' });
const { engine } = h, { input } = engine;
const dt = 1 / 60;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function letGo() {
  for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS']) input.setKey(k, false);
  stubPad.axes[0] = 0; stubPad.axes[1] = 0;
  engine.step(1);
}

/** What a hand does with a wanted lean: the device's own input, never the lean itself. */
function handOn(device, want, dial) {
  if (device === 'keyboard') {
    input.setKey('KeyD', want.x > KEY_PRESS_AT); input.setKey('KeyA', want.x < -KEY_PRESS_AT);
    input.setKey('KeyW', want.y > KEY_PRESS_AT); input.setKey('KeyS', want.y < -KEY_PRESS_AT);
  } else if (device === 'pad') {
    stubPad.axes[0] = want.x; stubPad.axes[1] = -want.y;
    engine.step(1); // the deadzone runs when the engine polls the pad
  } else {
    const { hud } = App.ctx;
    const ax = dial.x + want.x * T.mouseLeanRadius, ay = dial.y - want.y * T.mouseLeanRadius;
    input.setPointer((ax / hud.width) * 2 - 1, 1 - (ay / hud.height) * 2, false);
  }
}

/** Percent of time in each ring. `each(dot)` puts one frame's lean in `out`. */
function measure(makeStep, seeds = 40) {
  const totals = RINGS.map(() => 0);
  for (let s = 0; s < seeds; s++) {
    const r = rng(s * 97 + 11), dot = new Dot(r), step = makeStep(r), out = blankInput();
    const inside = RINGS.map(() => 0);
    let n = 0;
    for (let i = 0; i < 35 * 60; i++) {
      step(out, dot);
      dot.step(dt, out.x, out.y, T);
      if (i < 120) continue;
      n++;
      const m = Math.hypot(dot.x, dot.y);
      RINGS.forEach((R, k) => { if (m <= R) inside[k]++; });
    }
    inside.forEach((v, k) => { totals[k] += v / n; });
  }
  return totals.map((v) => Math.round((100 * v) / seeds));
}

const bot = (skill) => (r) => { const b = new BotBrain(skill, r); return (out, dot) => b.lean(out, dot, 0, 0, dt); };
function byDevice(device) {
  const { ctx } = App;
  const dial = { x: ctx.hud.width / 2, y: ctx.hud.height / 2 };
  return (r) => {
    letGo();
    App.device.last = device; // after the step: it notices keys let go from the row before
    const b = new BotBrain('average', r);
    b.p = { ...SKILLS.average, err: HAND_ERROR[device] };
    const driver = new LocalDriver(), want = { x: 0, y: 0 };
    return (out, dot) => { b.lean(want, dot, 0, 0, dt); handOn(device, want, dial); driver.read(out, ctx, dt, App, dial); };
  };
}
function near(row, plan, what) {
  const worst = Math.max(...row.map((v, i) => Math.abs(v - plan[i])));
  assert(worst <= TOLERANCE, `${what}: ${row.join('/')}, plan ${plan.join('/')}`);
}

for (const skill of ['idle', 'sloppy', 'average', 'good', 'expert']) {
  await test(`time in ring, ${skill} bot: the plan's row`, () => near(measure(bot(skill)), PLAN[skill], skill));
}
await test('at ring .30 doing nothing gets no stars, an average player one, a good one three', () => {
  const at30 = (skill) => measure(bot(skill))[1];
  assert(at30('idle') < 45, 'idle');
  const avg = at30('average');
  assert(avg >= 45 && avg < 70, `average ${avg}`);
  assert(at30('good') >= 90, 'good');
});
for (const device of ['pad', 'keyboard', 'mouse']) {
  await test(`time in ring, average person on ${device}, through the real input: the plan's row`, () => {
    near(measure(byDevice(device)), PLAN[device], device);
    letGo();
  });
}

// The same people in a real class. Tree is ring .40 with no twist, so its score should sit near that first column.
async function tree(device, seed) {
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  const hands = makeHands(engine, device);
  hands.announce();
  const s = App.scene;
  hands.press('confirm'); h.step(1); hands.endFrame(); h.step(1);
  const b = new BotBrain('average', rng(seed * 131 + 5));
  b.p = { ...SKILLS.average, err: HAND_ERROR[device] };
  const want = { x: 0, y: 0 };
  for (let n = 0; !s.resultsShown && n < 60 * 120; n++) {
    if (s.phase === 'play') {
      const lane = s.playerLane;
      b.lean(want, lane.dot, 0, 0, dt);
      if (device === 'pad') { stubPad.axes[0] = want.x; stubPad.axes[1] = -want.y; } else handOn(device, want, lane.dial ?? { x: App.ctx.hud.width / 2, y: App.ctx.hud.height / 2 });
    }
    h.step(1);
  }
  letGo();
  hands.letGo();
  assert(s.lastResult, `${device} never finished`);
  return s.lastResult.score;
}
for (const device of ['pad', 'keyboard', 'mouse']) {
  await test(`a real Tree class, average person on ${device}: near the plan's easy ring`, async () => {
    const scores = [];
    for (let seed = 0; seed < 5; seed++) scores.push(await tree(device, seed));
    const mean = scores.reduce((a, v) => a + v, 0) / scores.length;
    const want = PLAN[device][0];
    assert(Math.abs(mean - want) <= 10, `mean ${mean} from ${scores.join(' ')}, plan ${want}`);
  });
}
// The plan's Slackline row: idle never finishes; sloppy rarely; average 38 s with .2 falls; good 28 s with none.
async function slack(skill, k) {
  await h.go('activity', { id: 'slackline', mode: 'dropin', noPractice: true });
  const s = App.scene;
  s.botRand = App.ctx.random.fork(`bot${k}`);
  const r = App.ctx.random.fork(`sway${k}`);
  s.dot.ph = [r.next(), r.next(), r.next(), r.next()].map((v) => v * 6.283);
  h.press('Enter');
  App.dev.autopilot = skill;
  await h.until(() => s.resultsShown, { every: 30, max: 60 * 120, what: `slackline ${skill}` });
  App.dev.autopilot = null;
  App.stack.clear();
  return { time: s.time, falls: s.falls, finished: s.finished };
}
const slackRuns = async (skill, n) => { const out = []; for (let k = 0; k < n; k++) out.push(await slack(skill, k)); return out; };
const meanOf = (runs, f) => runs.reduce((a, x) => a + f(x), 0) / runs.length;
await test('Slackline, the plan\'s row: idle never finishes, sloppy rarely', async () => {
  assert((await slackRuns('idle', 3)).every((x) => !x.finished), 'idle finished');
  assert((await slackRuns('sloppy', 6)).filter((x) => x.finished).length <= 1, 'sloppy finished too often');
});
await test('Slackline, the plan\'s row: average about 38 s with few falls, good about 28 s with none', async () => {
  const avg = await slackRuns('average', 10);
  assert(avg.every((x) => x.finished), 'average always finishes');
  const t = meanOf(avg, (x) => x.time), f = meanOf(avg, (x) => x.falls);
  assert(t >= 34 && t <= 43, `average time ${t}`);
  assert(f <= 0.7, `average falls ${f}`);
  const good = await slackRuns('good', 6);
  assert(good.every((x) => x.finished && x.falls === 0), 'good never falls');
  const g = meanOf(good, (x) => x.time);
  assert(g >= 26 && g <= 31, `good time ${g}`);
});
await test('no game errors in any of that', () => assert(h.errors().length === 0, h.errors().join(' | ')));
done();
