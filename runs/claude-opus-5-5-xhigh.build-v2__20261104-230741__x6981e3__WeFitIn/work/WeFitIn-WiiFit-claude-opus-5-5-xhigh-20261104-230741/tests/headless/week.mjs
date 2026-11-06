// 5 The full scripted playthrough through the real menus. 6 Save. Weigh-In and Wobble Age.
import { assert, boot, done, eq, MemoryStorage, near, test, App, tick } from '../lib.mjs';
import { ACTIVITIES, HARD_DAY } from '../../src/data/activities.js';
import { goalMet, isOpen, totalStarsOf, ageFromTests, shownAge } from '../../src/core/week.js';
import { MILESTONES } from '../../src/data/unlocks.js';
import { AGE_OFFSET, DAYS } from '../../src/data/week.js';
import { Store, SAVE_KEY } from '../../src/core/save.js';

const storage = new MemoryStorage();
const h = await boot({ scene: 'title', storage });
const { engine } = h;

/** Move the top menu to an item and press Enter, through real key presses. */
function pick(id, screen = App.stack.top) {
  const menu = screen.menu;
  const i = menu.items.findIndex((it) => it.id === id);
  assert(i >= 0, `no item ${id} in ${App.stack.names().join('>')}: ${menu.items.map((x) => x.id).join(',')}`);
  let guard = 0;
  while (menu.focus !== i && guard++ < 30) { h.press('ArrowDown'); h.step(1); }
  eq(menu.focus, i, `focus on ${id}`);
  h.press('Enter');
  h.step(1);
}

async function settle() { await tick(); await h.settle(); }

/** Press through dialogue, questions and the like until a test passes. */
async function drive(pred, { max = 60 * 400, what = '' } = {}) {
  let n = 0;
  while (!pred()) {
    const top = App.stack.top;
    if (top?.name === 'dialogue' || top?.name === 'question' || top?.name === 'feel') h.press('Enter');
    else if (App.scene.id === 'ferry') h.press('Enter');
    else h.step(10);
    await tick();
    n += 10;
    if (App.loading) await settle();
    if (n > max) throw new Error(`drive timed out (${what}): ${JSON.stringify(App.state())}`);
  }
  if (App.loading) await settle();
}

async function doActivity(station, id, { hard = false, skill = 'expert' } = {}) {
  await drive(() => App.scene.id === 'hub' && !App.stack.open, { what: 'back at hub' });
  assert(App.scene.stand(station) === station, `standing at ${station}: near ${App.scene.nearest}`);
  h.step(2);
  h.press('Enter');
  eq(App.stack.top?.name, 'station', `station menu for ${station}`);
  if (hard) { pick('hard'); }
  pick(id);
  await settle();
  eq(App.scene.id, 'activity', `activity ${id}`);
  eq(App.scene.activity, id);
  App.dev.autopilot = skill;
  await h.until(() => App.scene.resultsShown, { max: 60 * 200, every: 30, what: id });
  App.dev.autopilot = null;
  const r = App.scene.lastResult;
  h.step(60 * 2);
  await drive(() => App.stack.top?.name === 'results' && App.stack.top.menuReady, { what: 'results menu' });
  pick('back');
  await settle();
  eq(App.scene.id, 'hub');
  return r;
}

async function morning(day) {
  App.dev.autopilot = 'good';
  await drive(() => App.scene.id === 'hub', { what: `morning of day ${day}` });
  App.dev.autopilot = null;
  await drive(() => !App.stack.open, { what: 'story beat' });
  eq(App.slot.day, day, 'day');
  eq(App.slot.phase, 'day');
}

async function endDay(day) {
  await drive(() => App.scene.id === 'hub' && !App.stack.open);
  App.scene.stand('hammock');
  h.step(2);
  h.press('Enter');
  await drive(() => App.scene.id === 'report', { what: `report of day ${day}` });
  eq(App.slot.phase, 'report');
  h.step(30);
  h.press('Enter'); // into the talk
  await drive(() => App.scene.phase === 'done' || App.scene.id !== 'report', { what: 'report talk' });
  h.step(2);
  h.press('Enter'); // good night
  await drive(() => App.scene.id === 'weighin', { what: 'next morning' });
}

await test('title: any button opens the main menu', async () => {
  h.step(5);
  eq(App.state().scene, 'title');
  h.press('Enter');
  eq(App.stack.top?.name, 'main');
});
await test('new week: slot, name entry, avatar, ferry', async () => {
  pick('week');
  eq(App.stack.top?.name, 'slots');
  pick('slot0');
  eq(App.stack.top?.name, 'name-entry');
  App.stack.top.typed = 'K'; h.step(1); App.stack.top.typed = 'i'; h.step(1); App.stack.top.typed = 'm'; h.step(1);
  eq(App.stack.top.text, 'Kim');
  h.press('Enter');
  eq(App.stack.top?.name, 'avatar-pick');
  pick('look2');
  await settle();
  eq(App.scene.id, 'ferry');
  eq(App.slot.name, 'Kim');
  eq(App.slot.phase, 'ferry');
});
await test('ferry: skips or plays through to the first Weigh-In', async () => {
  h.step(60 * 2);
  h.press('Enter');
  await drive(() => App.scene.id === 'weighin', { what: 'ferry end' });
  eq(App.slot.phase, 'morning');
});
await test('day 1: she asks first, you step on, "Ow."; intro teaches the Dot, then a test, a question, an age; the age question is never saved', async () => {
  await h.until(() => App.stack.top?.name === 'dialogue', { every: 5, max: 600 });
  assert(!App.scene.onScale, 'not on the scale yet');
  assert(App.stack.top.lines[0].text.includes('Please step on me'), App.stack.top.lines[0].text);
  await drive(() => App.scene.onScale, { what: 'stepping on' });
  await drive(() => App.stack.top?.name === 'dialogue' || App.scene.phase === 'test');
  App.dev.autopilot = 'good';
  await drive(() => App.stack.top?.name === 'feel', { what: 'feel question' });
  App.stack.top.value = 77;
  h.press('Enter');
  await morning(1);
  eq(App.slot.ages.length, 1);
  assert(!JSON.stringify(App.store.data).includes('"feel"'), 'feel not saved');
});

const SCHEDULE = [
  { day: 1, plays: [['pavilion', 'tree'], ['shed', 'squats'], ['beach', 'hoop'], ['pavilion', 'heron']], open: ['tree', 'heron', 'squats', 'hoop'], closed: ['header', 'lunges', 'warrior', 'step', 'tray', 'jog', 'stand'] },
  { day: 2, plays: [['lagoon', 'header'], ['shed', 'lunges'], ['pavilion', 'warrior']], open: ['header', 'lunges', 'warrior'], closed: ['step', 'slackline', 'chair', 'tray'] },
  { day: 3, plays: [['beach', 'step'], ['lagoon', 'slackline'], ['pavilion', 'chair']], open: ['step', 'slackline', 'chair'], closed: ['tray', 'press', 'fold', 'jog'] },
  { day: 4, plays: [['lagoon', 'tray'], ['shed', 'press'], ['pavilion', 'fold']], open: ['tray', 'press', 'fold'], closed: ['jog', 'pier', 'plank'] },
  { day: 5, plays: [['gate', 'jog'], ['lagoon', 'pier'], ['pavilion', 'plank']], open: ['jog', 'pier', 'plank'], closed: ['stand'] },
  { day: 6, plays: [['pavilion', 'tree', true]], open: ['tree'], closed: ['stand'] },
];

for (const d of SCHEDULE) {
  await test(`day ${d.day}: the schedule opens what it should, and nothing else`, async () => {
    if (d.day > 1) await morning(d.day);
    const slot = App.slot;
    eq(slot.day, d.day);
    for (const id of d.open) assert(isOpen(slot, id), `${id} should be open on day ${d.day}`);
    for (const id of d.closed) assert(!isOpen(slot, id), `${id} should be closed on day ${d.day}`);
    eq(DAYS[d.day - 1].day, d.day);
    if (d.day >= 2) eq(slot.heardBeat, d.day, 'story beat heard');
  });
  await test(`day ${d.day}: stations, the prescription pays +5, and the record is kept`, async () => {
    const before = App.slot.drips;
    let any = false;
    for (const [station, id, hard] of d.plays) {
      const r = await doActivity(station, id, { hard: !!hard });
      assert(App.slot.records[id].plays >= 1, `${id} recorded`);
      any = true;
      assert(r.stars >= 2, `${id} stars ${r.stars}`);
    }
    assert(any);
    assert(goalMet(App.slot), `goal of day ${d.day}: ${JSON.stringify(App.slot.todayDone)}`);
    assert(App.slot.goalPaid, 'bonus paid');
    assert(App.slot.drips > before + 5);
  });
  await test(`day ${d.day}: the hammock ends the day; the Report leads to morning`, async () => { await endDay(d.day); eq(App.slot.day, d.day + 1); });
}

await test('hard versions are open on day 6, not before', () => {
  eq(HARD_DAY, 6);
});

await test('the jar, the locker and the hall all open and come back', async () => {
  App.dev.autopilot = 'good';
  await morning(7);
  for (const [station, scene] of [['jar', 'jar'], ['locker', 'locker'], ['hall', 'records']]) {
    App.scene.stand(station);
    h.step(2);
    h.press('Enter');
    await settle();
    eq(App.scene.id, scene);
    h.step(120);
    h.press('Escape');
    await settle();
    eq(App.scene.id, 'hub');
  }
});
await test('jar milestones arrive in order, each with a Locker Room item', () => {
  const slot = App.slot;
  const expect = MILESTONES.filter((m) => m.drips <= slot.drips).map((m) => m.id);
  eq(slot.wardrobe.join(), expect.join());
  assert(slot.wardrobe.length >= 4, `only ${slot.wardrobe.length} by day 7 with ${slot.drips} drips`);
});

let shownBefore;
await test('day 7: the hammock refuses; the terrace stands; the Long Stand plays; no way to fail', async () => {
  App.scene.stand('hammock');
  h.step(2);
  h.press('Enter');
  eq(App.stack.top?.name, 'dialogue', 'hammock says not today');
  await drive(() => !App.stack.open);
  eq(App.scene.id, 'hub');
  App.scene.stand('terrace');
  h.step(2);
  h.press('Enter');
  await settle();
  eq(App.scene.activity, 'stand');
  shownBefore = App.slot.ages.map((a) => shownAge(App.slot, a));
  App.dev.autopilot = 'good';
  h.step(60 * 1);
  await h.until(() => App.scene.resultsShown, { max: 60 * 120, every: 30 });
  App.dev.autopilot = null;
  assert(goalMet(App.slot), 'stand fills the prescription');
  eq(App.slot.confessed, false);
  eq(App.slot.phase, 'ending', 'closing the game here must not skip the confession');
  h.step(60 * 2);
  await drive(() => App.stack.top?.name === 'results' && App.stack.top.menuReady);
  pick('continue');
  await settle();
  eq(App.scene.id, 'ending');
});
await test('the confession subtracts exactly 7 from every point', async () => {
  await drive(() => App.scene.phase === 'slide', { what: 'slide' });
  eq(App.slot.confessed, true);
  const after = App.slot.ages.map((a) => shownAge(App.slot, a));
  after.forEach((v, i) => eq(shownBefore[i] - v, AGE_OFFSET, `point ${i}`));
  h.step(60 * 3);
  near(App.scene.slide, AGE_OFFSET, 0.01, 'chart slide');
});
await test('credits roll, then Week 2 opens everything', async () => {
  await drive(() => App.scene.phase === 'credits', { what: 'credits' });
  h.step(60 * 3);
  h.press('Enter');
  await drive(() => App.scene.id === 'weighin', { what: 'week 2 morning' });
  eq(App.slot.week, 2);
  eq(App.slot.day, 1);
  for (const id of Object.keys(ACTIVITIES)) assert(isOpen(App.slot, id), `${id} open in week 2`);
  App.dev.autopilot = 'good';
  await morning(1);
  await drive(() => !App.stack.open);
  eq(App.scene.id, 'hub');
  eq(h.errors().length, 0, h.errors().join(' | '));
});
await test('Week 2 goes on: days keep turning over, ages stay honest', async () => {
  const slot = App.slot;
  const r = await doActivity('pavilion', 'tree');
  assert(r.stars >= 2);
  await endDay(1);
  eq(slot.day, 2);
  const a = slot.ages.length;
  App.dev.autopilot = 'good';
  await morning(2);
  eq(slot.ages.length, a + 1);
  eq(shownAge(slot, slot.ages[a]), slot.ages[a], 'no more adding seven');
});

// 6 Save.
await test('save: reload mid-week restores', () => {
  const again = new Store(storage);
  eq(again.data.slots[0].name, 'Kim');
  eq(again.data.slots[0].week, App.slot.week);
  eq(again.data.slots[0].drips, App.slot.drips);
  assert(storage.getItem(SAVE_KEY).length > 10);
});
await test('save: Drop-In records survive a reload', () => {
  const s2 = new MemoryStorage();
  const st = new Store(s2);
  st.data.dropin = { tree: { best: 70, stars: 2, plays: 1 } };
  st.write();
  eq(new Store(s2).data.dropin.tree.best, 70);
});
await test('save: corrupt JSON falls back safely', () => {
  const s = new MemoryStorage();
  s.setItem(SAVE_KEY, '{not json');
  const st = new Store(s);
  eq(st.recovered, true);
  eq(st.data.slots[0], null);
  eq(st.settings.music, 0.1);
  st.create(1, 'B', {});
  assert(new Store(s).data.slots[1]);
});
await test('save: a wrong version falls back safely', () => {
  const s = new MemoryStorage();
  s.setItem(SAVE_KEY, JSON.stringify({ v: 99, slots: 'nope' }));
  eq(new Store(s).data.slots.length, 3);
});
await test('save: no storage works, in memory', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const st = new Store(broken);
  st.create(0, 'M', {});
  eq(st.slot.name, 'M');
  st.write();
  eq(JSON.parse(st.memory).slots[0].name, 'M');
});

// The numbers.
await test('Wobble Age: expert ends lower than average; idle stays high; clamped 18..95', async () => {
  const ages = {};
  for (const skill of ['idle', 'average', 'expert']) {
    const slot = App.store.create(2, skill, { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
    slot.phase = 'morning';
    slot.introHeard = true;
    for (const test2 of ['stillness', 'lean', 'chase']) {
      await h.go('weighin', { test: test2 });
      App.dev.autopilot = skill;
      await drive(() => App.scene.id === 'weighin' && App.scene.result !== undefined, { what: `${skill} ${test2}` });
      await drive(() => App.scene.id !== 'weighin', { what: 'leave' });
      await settle();
      App.dev.autopilot = null;
    }
    ages[skill] = slot.ages[slot.ages.length - 1];
  }
  assert(ages.expert < ages.average, `expert ${ages.expert} average ${ages.average}`);
  assert(ages.average < ages.idle, `average ${ages.average} idle ${ages.idle}`);
  assert(ages.idle >= 70, `idle ${ages.idle}`);
  eq(ageFromTests([0, 0, 0], 0), 80);
  eq(ageFromTests([1, 1, 1], 200), 18);
  eq(totalStarsOf({ records: { a: { stars: 2 }, b: { stars: 3 } } }), 5);
});
await test('Week: a test of T = 0.5 with no stars is an age of 50, shown as 57', () => {
  eq(ageFromTests([0.5], 0), 50);
  eq(shownAge({ confessed: false }, 50), 57);
  eq(shownAge({ confessed: true }, 50), 50);
});
await test('no game errors anywhere in the week', () => eq(h.errors().length, 0, h.errors().join(' | ')));
done();
