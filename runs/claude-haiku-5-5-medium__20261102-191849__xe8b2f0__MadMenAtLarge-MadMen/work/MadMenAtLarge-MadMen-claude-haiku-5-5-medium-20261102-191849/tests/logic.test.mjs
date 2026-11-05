// Unit tests for the rules in src/logic.js (no engine, no DOM). Run: node --test tests/
// Each system has its own block: stats, the clock, the bourbon and cigarettes, the encounters, the pitch, the endings,
// the attract AI's press rule, and the touch-only check.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = new URL('../src/logic.js', import.meta.url);
const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(fileURLToPath(here), 'utf8'), ctx, { filename: 'logic.js' });
const MM = ctx.MM;
// values made inside the VM are from another realm: compare them as plain data
const plain = x => JSON.parse(JSON.stringify(x));

test('a new run starts at the stated stats, on day 1, with four cigarettes', () => {
  const s = MM.newState();
  assert.deepEqual(plain([s.standing, s.composure, s.whiskey, s.home]), [40, 70, 0, 60]);
  assert.equal(s.day, 1);
  assert.equal(s.cigs, MM.CIGARETTES_PER_DAY, 'a run starts with a full case');
  MM.beginDay(s, 1);
  assert.equal(s.cigs, MM.CIGARETTES_PER_DAY, 'each day is issued four');
  assert.deepEqual(plain(s.accounts), []);
});

test('stats clamp to 0..100 and an unknown stat is refused', () => {
  const s = MM.newState();
  assert.equal(MM.adjust(s, 'standing', 500), 100);
  assert.equal(MM.adjust(s, 'whiskey', -50), 0);
  assert.throws(() => MM.adjust(s, 'luck', 1));
});

test('time: the clock runs 9:00 AM to 5:00 PM across the day and the day ends at its length', () => {
  const s = MM.newState();
  assert.equal(MM.clockLabel(s), '9:00 AM');
  s.t = s.dayLength / 2;
  assert.equal(MM.clockLabel(s), '1:00 PM');
  s.t = s.dayLength;
  assert.equal(MM.clockLabel(s), '5:00 PM');
  assert.equal(MM.dayOver(s), true);
  assert.equal(MM.meetingCalled(MM.newState()), false);
  const t = MM.newState(); t.t = MM.meetingAt(t);
  assert.equal(MM.meetingCalled(t), true, 'the meeting is called half way through the day');
});

test('tick: composure drains, the bourbon wears off, home drifts; the day counter stops at its length', () => {
  const s = MM.newState();
  s.whiskey = 50;
  MM.tick(s, 10);
  assert.ok(Math.abs(s.composure - (70 - 0.35 * 10)) < 1e-9, 'composure drains');
  assert.ok(Math.abs(s.whiskey - (50 - 1.2 * 10)) < 1e-9, 'whiskey wears off');
  assert.ok(s.home < 60, 'home drifts');
  MM.tick(s, 1e6);
  assert.equal(s.t, s.dayLength);
});

test('bourbon: +18 whiskey, +12 composure, and it reports tipsy then blurry', () => {
  const s = MM.newState();
  assert.equal(MM.drink(s), 'fine');
  assert.equal(s.whiskey, 18); assert.equal(s.composure, 82); assert.equal(s.drinks, 1);
  s.whiskey = 45; assert.equal(MM.drink(s), 'tipsy');
  s.whiskey = 70; assert.equal(MM.drink(s), 'blurry');
});

test('cigarettes: each one costs a pack-count and steadies the hands; empty means no', () => {
  const s = MM.newState(); MM.beginDay(s, 1);
  const before = s.composure;
  assert.equal(MM.smoke(s), true);
  assert.equal(s.cigs, MM.CIGARETTES_PER_DAY - 1);
  assert.equal(s.composure, before + 16);
  s.cigs = 0;
  assert.equal(MM.smoke(s), false);
});

test('the cigarette case refills two packs once a day, up to the cap', () => {
  const s = MM.newState(); MM.beginDay(s, 1);
  s.cigs = 1;
  assert.equal(MM.refillCigs(s), true);
  assert.equal(s.cigs, 3);
  assert.equal(MM.refillCigs(s), false, 'once a day');
  s.cigs = 5; MM.beginDay(s, 2); s.cigs = 5;
  MM.refillCigs(s);
  assert.equal(s.cigs, MM.CIGARETTES_MAX, 'capped at the maximum');
});

test('phone: one call home a day, +12 home and +6 composure', () => {
  const s = MM.newState(); MM.beginDay(s, 1);
  const home = s.home;
  assert.equal(MM.callHome(s), true);
  assert.equal(s.home, home + 12);
  assert.equal(MM.callHome(s), false);
  MM.beginDay(s, 2);
  assert.equal(MM.callHome(s), true, 'a new day allows another call');
});

test('encounters: each is offered on its day only, applies its choice once, and sets its flag', () => {
  const s = MM.newState(); MM.beginDay(s, 1);
  assert.deepEqual(plain(MM.encountersToday(s)), ['teddy-memo', 'gil-bourbon']);
  const standing = s.standing;
  const reply = MM.chooseEncounter(s, 'teddy-memo', 1);       // "It is my deck now": +9 standing, teddyBitter
  assert.ok(Array.isArray(reply) && reply.length > 0);
  assert.equal(s.standing, standing + 9);
  assert.equal(s.flags.teddyBitter, true);
  assert.deepEqual(plain(MM.encountersToday(s)), ['gil-bourbon']);
  assert.equal(MM.chooseEncounter(s, 'teddy-memo', 0), null, 'a conversation is not replayed');
  assert.throws(() => MM.chooseEncounter(s, 'gil-bourbon', 9), /no choice/);
  assert.throws(() => MM.chooseEncounter(s, 'nobody', 0), /no encounter/);
});

test('every day has two encounters, and every encounter names a colleague who is on the floor', () => {
  const npcs = new Set(['teddy', 'gil', 'vera', 'marian']);
  for (const d of MM.DAYS) {
    assert.equal(d.encounters.length, 2);
    for (const id of d.encounters) assert.ok(MM.ENCOUNTERS[id], id);
  }
  for (const enc of Object.values(MM.ENCOUNTERS)) {
    assert.ok(npcs.has(enc.npc), enc.id);
    assert.equal(enc.choices.length, 2, enc.id + ' has two choices');
  }
});

test('the pitch needle sweeps 0 to 1 and back, and bounces at both ends', () => {
  const period = 1.5;
  let st = { p: 0, dir: 1 };
  st = MM.stepNeedle(st.p, st.dir, period / 2, period);
  assert.ok(Math.abs(st.p - 1) < 1e-9, 'half a period reaches the far end');
  st = MM.stepNeedle(st.p, st.dir, 0.1, period);
  assert.equal(st.dir, -1, 'then it comes back');
  st = MM.stepNeedle(0.01, -1, 10, period);
  assert.deepEqual(plain([st.p, st.dir]), [0, 1]);
});

test('the zone is wider when you are steady, narrower when blurry, and bourbon speeds the needle', () => {
  const s = MM.newState();
  s.composure = 100; const wide = MM.beatHalfWidth(s, 0);
  s.composure = 0;   const narrow = MM.beatHalfWidth(s, 0);
  assert.ok(wide > narrow);
  s.composure = 100; s.whiskey = 90;
  assert.ok(MM.beatHalfWidth(s, 0) < wide, 'blurry narrows it');
  assert.ok(MM.needlePeriod(s) < MM.needlePeriod(MM.newState()), 'bourbon speeds the needle');
});

test('beat scores: 3 in the heart of the zone, 2 in the zone, 1 just outside, 0 well wide', () => {
  const c = 0.5, hw = 0.1;
  assert.equal(MM.beatScore(0.5, c, hw), 3);
  assert.equal(MM.beatScore(0.55, c, hw), 2);
  
  assert.equal(MM.beatScore(0.9, c, hw), 0);
});

test('a pitch wins on the total plus standing and briefings, against the client line', () => {
  const s = MM.newState(); MM.beginDay(s, 1);            // Starbrite: line 5
  s.standing = 50;                                       // +2 bonus
  const r = MM.pitchResult(s, [1, 1, 1]);               // total 3 + 2 = 5: a win on the line
  assert.equal(r.effective, 5);
  assert.equal(r.win, true);
  assert.equal(MM.pitchResult(s, [1, 1, 0]).win, false, '4 is short');
  s.flags.veraBrief = true;
  assert.equal(MM.pitchResult(s, [1, 1, 0]).win, true, 'Vera\'s brief is worth one');
});

test('recording a pitch counts a win once and writes the account; missing it loses it', () => {
  const s = MM.newState(); MM.beginDay(s, 1);
  MM.recordPitch(s, MM.pitchResult(s, [3, 3, 3]));
  assert.deepEqual(plain(s.accounts), ['starbrite']);
  assert.equal(s.pitches[1], 'won');
  assert.equal(MM.pitchDone(s), true);
  MM.beginDay(s, 2);
  const miss = MM.missPitch(s);
  assert.equal(miss.missed, true);
  assert.equal(s.pitches[2], 'lost');
  assert.equal(MM.missPitch(s), null, 'a pitch is recorded once');
  assert.deepEqual(plain(s.accounts), ['starbrite'], 'a miss adds no account');
});

test('the elevator home opens only after the client has been seen', () => {
  const s = MM.newState(); MM.beginDay(s, 1);
  assert.equal(MM.canLeave(s), false);
  MM.recordPitch(s, MM.pitchResult(s, [0, 0, 0]));
  assert.equal(MM.canLeave(s), true);
});

test('endings: three wins with standing is Partner; three wins without it is the empty corner office', () => {
  const s = MM.newState();
  s.accounts = ['starbrite', 'kestrel', 'cobalt'];
  s.standing = 80;
  assert.equal(MM.ending(s).id, 'partner');
  s.standing = 10;
  assert.equal(MM.ending(s).id, 'corner-empty');
  s.accounts = ['starbrite', 'kestrel'];
  assert.equal(MM.ending(s).id, 'account-exec');
  s.accounts = ['starbrite'];
  assert.equal(MM.ending(s).id, 'new-hire');
  s.accounts = [];
  assert.equal(MM.ending(s).id, 'pink-slip');
});

test('the ending notes home: quiet when home is low, still there when it is high', () => {
  const s = MM.newState();
  s.home = 10;
  assert.match(MM.ending(s).note, /quiet/);
  s.home = 90;
  assert.match(MM.ending(s).note, /still there/);
});

test('score: 1000 per account, then standing and home', () => {
  const s = MM.newState();
  s.accounts = ['starbrite'];
  s.standing = 50; s.home = 40;
  assert.equal(MM.score(s), 1000 + 500 + 200);
});

test('the attract AI presses only when the needle is near the middle of the zone', () => {
  assert.equal(MM.aiShouldPress(0.5, 0.5, 0.1), true);
  assert.equal(MM.aiShouldPress(0.9, 0.5, 0.1), false);
});

test('touch-only: a touch screen with no fine pointer and no keyboard, controller or mouse in use', () => {
  assert.equal(MM.touchOnly({ maxTouchPoints: 5, finePointer: false, lastDevice: 'touch' }), true);
  assert.equal(MM.touchOnly({ maxTouchPoints: 5, finePointer: false, lastDevice: 'keyboard' }), false, 'a keyboard was used');
  assert.equal(MM.touchOnly({ maxTouchPoints: 5, finePointer: true, lastDevice: 'touch' }), false, 'a mouse is there');
  assert.equal(MM.touchOnly({ maxTouchPoints: 0, finePointer: false, lastDevice: 'touch' }), false, 'no touch at all');
  assert.equal(MM.touchOnly({ maxTouchPoints: 5, finePointer: false, lastDevice: 'gamepad' }), false, 'a controller was used');
});
