// 1 Dot, 2 clips, 3 data, 12 voice, 13 engine hash.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { analyzeClip, checkModel, compileClips, Engine, HERO_MODEL, HERO_RIG, parseSong, THREE, validateClip, validateTexture } from '../../pixel-engine.js';
import { assert, done, eq, test } from '../lib.mjs';
import { Dot } from '../../src/core/dot.js';
import { BotBrain, blankInput } from '../../src/core/drivers.js';
import { T } from '../../src/core/tunables.js';
import { GAME_CLIPS } from '../../src/art/clips.js';
import { GAME_MODELS, MODELS } from '../../src/art/models.js';
import { GAME_TEXTURES } from '../../src/art/textures.js';
import { SONGS, STEP_BPM, STEP_SONG } from '../../src/audio/songs.js';
import { syllabify, voiceLength, VOICES, revealAt } from '../../src/audio/voice.js';
import { GLYPH_NAMES } from '../../src/art/glyphs.js';
import { allLines } from '../../src/data/alllines.js';
import { ACTIVITIES, ACTIVITY_IDS, CLASSMATE_SCORES } from '../../src/data/activities.js';
import { POSES } from '../../src/data/poses.js';
import { REPS } from '../../src/data/reps.js';
import { STATIONS } from '../../src/data/stations.js';
import { DAYS } from '../../src/data/week.js';
import { MILESTONES } from '../../src/data/unlocks.js';
import { QUESTIONS } from '../../src/data/questions.js';
import { BOARDS } from '../../src/data/boards.js';
import { STEP_CHART, STEP_CHART_HARD, STEP_CHART_MEDLEY } from '../../src/data/charts.js';
import { RESULT_LINES } from '../../src/data/lines.js';
import { MEDLEY } from '../../src/data/medley.js';
import { hasGlyph, sanitize, wrap } from '../../src/ui/font.js';
import { AI_HUB, CREDITS, ENGINE_FEEDBACK, PROMPT_FEEDBACK, SOURCE_INFO, TESTING_FEEDBACK, exitInterview } from '../../src/data/about.js';
import { TITLE } from '../../src/data/title.js';

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function ringTime(skill, ring = 0.3, seeds = 40) {
  const dt = 1 / 60;
  let total = 0;
  for (let s = 0; s < seeds; s++) {
    const r = rng(s * 97 + 11), d = new Dot(r), b = new BotBrain(skill, r), o = blankInput();
    let inside = 0, n = 0;
    for (let i = 0; i < 35 * 60; i++) {
      b.lean(o, d, 0, 0, dt);
      d.step(dt, o.x, o.y, T);
      if (i >= 120) { n++; if (Math.hypot(d.x, d.y) <= ring) inside++; }
    }
    total += inside / n;
  }
  return (100 * total) / seeds;
}

await test('dot: idle bot under 20% at ring .30', () => assert(ringTime('idle') < 20));
await test('dot: average bot 35-65% at ring .30', () => { const v = ringTime('average'); assert(v > 35 && v < 65, `${v}`); });
await test('dot: good bot over 80% at ring .30', () => assert(ringTime('good') > 80));
await test('dot: expert bot over 95% at ring .30', () => assert(ringTime('expert') > 95));
await test('dot: stays inside 1.2, impulses add to velocity', () => {
  const d = new Dot(rng(1));
  for (let i = 0; i < 600; i++) d.step(1 / 60, 1, 1, T);
  assert(Math.hypot(d.x, d.y) <= 1.2001);
  const v = d.vx;
  d.impulse(0.5, 0);
  assert(Math.abs(d.vx - v - 0.5) < 1e-9);
});

class G { name = 'g'; assets = [HERO_MODEL]; async setup(ctx) { this.model = (await ctx.loadModel(HERO_MODEL)).scene; } cameraTarget() { return new THREE.Vector3(); } }
const g = new G();
await Engine.headless(g, {});
const compiled = compileClips(GAME_CLIPS, HERO_RIG, g.model);
for (let i = 0; i < GAME_CLIPS.length; i++) {
  const d = GAME_CLIPS[i];
  await test(`clip ${d.name}`, () => {
    const v = validateClip(d, HERO_RIG);
    assert(!v.length, v.join(';'));
    const a = analyzeClip(g.model, HERO_RIG, d, compiled[i]);
    assert(!a.problems.length, a.problems.join(';'));
    // An unknown ease name passes both of those and bakes NaN, which makes the avatar vanish.
    for (const track of compiled[i].tracks) assert(!track.values.some(Number.isNaN), `NaN in ${track.name}`);
  });
}
for (const m of GAME_MODELS) await test(`model ${m.id}`, () => { const r = checkModel(m, { catalog: MODELS }); assert(!r.problems.length, r.problems.join(';')); });
for (const t of GAME_TEXTURES) await test(`texture ${t.id}`, () => { const r = validateTexture(t); assert(!r.problems.length, r.problems.join(';')); });
for (const [name, song] of Object.entries(SONGS)) {
  await test(`song ${name} parses`, () => { parseSong(song); });
  await test(`song ${name} is loud enough at 10%`, () => {
    const sum = Object.values(song.tracks).reduce((a, t) => a + (t.volume ?? 0.5), 0);
    assert(sum * 0.1 * 0.8 >= 0.03, `level ${sum * 0.08}`);
  });
}
await test('step song is 104 BPM, 32 bars, and each bar is one chart line', () => {
  eq(STEP_BPM, 104);
  eq(STEP_SONG.order.length, 32);
  eq(STEP_CHART.length, 32);
  eq(STEP_CHART_HARD.length, 32);
  eq(STEP_CHART_MEDLEY.length, 24);
  for (const bar of [...STEP_CHART, ...STEP_CHART_HARD]) { eq(bar.length, 8, bar); assert(/^[LR.]{8}$/.test(bar), bar); }
});
await test('every id resolves', () => {
  for (const id of ACTIVITY_IDS) {
    const a = ACTIVITIES[id];
    assert(SONGS[a.song], `song ${a.song}`);
    if (a.pose) assert(POSES[a.pose], `pose ${a.pose}`);
    if (a.rep) assert(REPS[a.rep], `rep ${a.rep}`);
    assert(STATIONS[a.station], `station ${a.station}`);
    assert(CLASSMATE_SCORES[id], `scores ${id}`);
    assert(RESULT_LINES[id], `lines ${id}`);
  }
  for (const s of Object.values(STATIONS)) for (const a of s.activities ?? []) assert(ACTIVITIES[a], `station activity ${a}`);
  for (const e of MEDLEY.events) for (const o of e.options) assert(ACTIVITIES[o], `medley ${o}`);
  eq(DAYS.length, 7); eq(QUESTIONS.length, 7); eq(MILESTONES.length, 7);
  assert(BOARDS.length === 3);
  assert(GLYPH_NAMES.includes('cross') && GLYPH_NAMES.includes('a'));
});
await test('every activity has lines for 0-3 stars, first time and repeat', () => {
  for (const id of ACTIVITY_IDS) for (const k of ['0', '1', '2', '3', 'first', 'repeat']) assert(RESULT_LINES[id][k]?.length, `${id} ${k}`);
});
const SAMPLES = ["Hello! I'm Ounce. Please step on me.", 'Ow.', "That was a joke. I can't feel pain. I can only keep records.", 'How old do you feel? This is not binding.', "Your Wobble Age is 68. Is that close? No? I'm so sorry.", 'Thank you. I have written that down.', 'You wobbled 14 times. I only counted the ones you noticed.', "Your left side is doing very well. I'll let your right side know.", 'No change since yesterday. Which is, in a way, consistent.', 'Excellent! ...Compared to Dennis.', "I'm not angry. Scales don't get angry. We get accurate.", "Have you been stretching? Please don't lie. I'm very sensitive.", "Today's concern: your ankles. I've been concerned all night.", "Good morning. You look rested. I can't see. But you felt rested.", 'Kevin has been with us eleven years. He has never once held a pose.', 'This is a recording. The person in it is doing better than you.', 'I have been adding seven. To everyone. For years. It felt motivating.', 'See you tomorrow. Bring your knees.', 'You are a tree. A tree does not check its phone.', 'Your left knee has wandered off. Please collect it.', 'Breathe in. Not like that.', 'Good. Again. That was also good. Again.', 'Hold. You may blink on Thursday.', 'I am eighty-one. I say this so that you feel something.', 'Stillness is a muscle. So is regret. We train both here.', 'The floor is your friend. It has never once let go.', 'Both hips, new. Knee, new. Opinions, original.', 'I used to do this professionally. Not this. Something near it.', "It's fine. It's just the one leg.", "I'm pacing myself.", "My gran says you're doing your best. She said it very slowly."];
await test('every sample line from the plan is in the game, verbatim', () => {
  const blob = allLines().map((l) => l.text).join(' | ');
  for (const s of SAMPLES) assert(blob.includes(s), `missing: ${s}`);
});
await test('the line bank has 120+ lines beyond the samples', () => assert(allLines().length - SAMPLES.length >= 120, `${allLines().length}`));
await test('every line fits its box: 3 lines of 52 characters', () => {
  for (const l of allLines()) assert(wrap(l.text, 52).length <= 3, `too long: ${l.text}`);
});
await test('every character of every string has a glyph', () => {
  const strings = [...allLines().map((l) => l.text), ...Object.values(ACTIVITIES).map((a) => a.name), ...Object.values(STATIONS).map((s) => s.name), ...MILESTONES.map((m) => m.name), ...Object.values(SOURCE_INFO), ...CREDITS, TITLE, ...[TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK].flatMap((b) => [...b.questions, ...b.answers])];
  for (const s of strings) for (const ch of s) assert(hasGlyph(ch) || ch === '\n', `no glyph for "${ch}" in: ${s}`);
  eq(sanitize('Zoë ☃'), 'Zo? ?', 'sanitize');
});
await test('no bad words in the plan\'s forbidden list', () => {
  const banned = /\b(wii|mii|wuhu|balance board|fit age)\b/i;
  for (const l of allLines()) assert(!banned.test(l.text), l.text);
  for (const a of Object.values(ACTIVITIES)) assert(!banned.test(a.name), a.name);
  assert(!banned.test(TITLE));
});
await test('exit interview has the exact shape', () => {
  const e = exitInterview();
  for (const k of ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']) assert(typeof e.sourceInformation[k] === 'string' && e.sourceInformation[k].length, k);
  eq(e.sourceInformation.usage, 'added on import');
  eq(e.testingFeedback.length, 4); eq(e.engineFeedback.length, 6); eq(e.promptFeedback.length, 4);
  for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls']) assert(typeof AI_HUB[k] === 'string' && AI_HUB[k].length, k);
  assert(AI_HUB.tags.length >= 3 && AI_HUB.tags.length <= 6);
  eq(AI_HUB.name, TITLE);
  for (const list of [e.testingFeedback, e.engineFeedback, e.promptFeedback]) for (const a of list) assert(a !== 'unknown' && a.length > 3, 'every feedback answer is filled in');
});

await test('voice: syllabify is stable and the same word gives the same syllables', () => {
  const a = syllabify('Thank you. Thank you.', 'ounce').filter((s) => !s.tick);
  const b = syllabify('Thank you. Thank you.', 'ounce').filter((s) => !s.tick);
  eq(JSON.stringify(a), JSON.stringify(b));
  eq(a[0].vowel, a[2].vowel, 'same word');
  eq(a[0].cons, a[2].cons, 'same word');
});
await test('voice: a question rises; declination falls', () => {
  const q = syllabify('Is that close to anything at all?', 'ounce').filter((s) => !s.tick);
  const flat = syllabify('Is that close to anything at all.', 'ounce').filter((s) => !s.tick);
  assert(q[q.length - 1].f0 > flat[flat.length - 1].f0 * 1.1, 'rises');
  assert(flat[0].f0 > flat[flat.length - 1].f0 * 0.98, 'falls');
});
await test('voice: June has no contour, Coach is low and slow, Ounce high and quick', () => {
  const june = syllabify('Are you nearly done?', 'june').filter((s) => !s.tick);
  assert(new Set(june.map((s) => s.f0.toFixed(2))).size === 1, 'june flat');
  const coach = syllabify('You are a tree.', 'coach'), ounce = syllabify('You are a tree.', 'ounce');
  assert(coach[0].f0 < ounce[0].f0);
  assert(voiceLength(coach) > voiceLength(ounce));
  eq(syllabify('Squawk.', 'kevin').length, 0, 'kevin never speaks');
  assert(Object.keys(VOICES).length >= 6);
});
await test('voice: the typewriter reveals in step, and ends with the whole line', () => {
  const text = 'Thank you. I have written that down.';
  const syl = syllabify(text, 'ounce');
  const end = voiceLength(syl);
  assert(revealAt(syl, text, end * 0.3) < revealAt(syl, text, end * 0.8));
  assert(revealAt(syl, text, end + 0.2) >= text.length - 2);
});
await test('engine untouched: pixel-engine.js hash equals the kit\'s', () => {
  const want = readFileSync('vendor/pixel-engine.sha256', 'utf8').split(/\s+/)[0];
  eq(createHash('sha256').update(readFileSync('pixel-engine.js')).digest('hex'), want);
});
await test('hub client untouched and first in the build', () => {
  const html = readFileSync('tools/build.mjs', 'utf8');
  assert(html.includes('vendor/hub/session.js'));
  assert(readFileSync('vendor/hub/session.js', 'utf8').length > 5000);
});
done();
