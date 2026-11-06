// Pure checks: Dot table, clips, data, save, voice, engine hash.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { analyzeClip, checkModel, compileClips, HERO_RIG, HERO_MODEL, parseSong, validateClip, validateTexture, Rng } from '../../pixel-engine.js';
import { App, boot, check, report } from './lib.mjs';
import { GAME_CLIPS } from '../../src/art/clips.js';
import { MODEL_DEFS, MODELS } from '../../src/art/models.js';
import { TEXTURE_DEFS } from '../../src/art/textures.js';
import { songLevel, SONGS } from '../../src/audio/songs.js';
import { hashWord, syllabify } from '../../src/audio/voice.js';
import { Dot } from '../../src/core/dot.js';
import { blankInput, BotBrain, clear, SKILLS } from '../../src/core/drivers.js';
import { applyResult, dripsFor, goalMet, isOpen, recordTest, shownAge, starsFor, trueAge } from '../../src/core/progress.js';
import { newSlot, Save, SAVE_KEY } from '../../src/core/save.js';
import { T } from '../../src/core/tunables.js';
import { ACT, ACTIVITIES } from '../../src/data/activities.js';
import { ACTIVITY_LINES, BARKS, QUESTIONS, STORY } from '../../src/data/lines.js';
import { STATIONS } from '../../src/data/stations.js';
import { WEEK } from '../../src/data/week.js';
import { allLines } from '../../src/ui/screens/dev.js';
import { LINE_COLS } from '../../src/ui/dialogue.js';
import { hasGlyph, wrap } from '../../src/ui/font.js';
import { ABOUT_PAGES } from '../../src/ui/screens/about.js';
import { AI_HUB } from '../../src/data/about.js';

// 1. The Dot table.
function ringRate(skill, ring, seeds = 40, secs = 35) {
  let total = 0;
  for (let s = 0; s < seeds; s++) {
    const rng = new Rng(1000 + s), dot = new Dot(() => rng.next()), o = blankInput();
    const brain = skill === 'idle' ? null : new BotBrain(SKILLS[skill], rng);
    let inT = 0, N = 0; const dt = 1 / 60;
    for (let i = 0; i < secs * 60; i++) { clear(o); if (brain) brain.lean(dot, 0, 0, dt, o); dot.step(dt, o.x, o.y, T); if (i > 120) { N++; if (dot.dist() <= ring) inT++; } }
    total += inT / N;
  }
  return total / seeds;
}
const r30 = Object.fromEntries(['idle', 'sloppy', 'average', 'good', 'expert'].map((k) => [k, ringRate(k, 0.3)]));
check('dot idle < 20%', r30.idle < 0.2, r30.idle); check('dot average 35-65%', r30.average > 0.35 && r30.average < 0.65, r30.average); check('dot good > 80%', r30.good > 0.8, r30.good); check('dot expert > 95%', r30.expert > 0.95, r30.expert);
check('dot sloppy below average', r30.sloppy < r30.average);

await boot();
// 2. Clips.
{ const m = await App.ctx.loadModel(HERO_MODEL); const compiled = compileClips(GAME_CLIPS, HERO_RIG, m.scene);
  GAME_CLIPS.forEach((d, i) => { check(`clip valid ${d.name}`, validateClip(d, HERO_RIG).length === 0, validateClip(d, HERO_RIG).join()); const r = analyzeClip(m.scene, HERO_RIG, d, compiled[i]); check(`clip clean ${d.name}`, r.problems.length === 0, JSON.stringify(r.problems).slice(0, 200)); }); }
// 3. Data.
for (const d of MODEL_DEFS) { const r = checkModel(d, { catalog: MODELS }); check(`model ${d.id}`, r.problems.length === 0, JSON.stringify(r.problems).slice(0, 200)); }
for (const t of TEXTURE_DEFS) check(`texture ${t.id}`, validateTexture(t).problems.length === 0);
for (const [k, s] of Object.entries(SONGS)) { let ok = true; try { parseSong(s); } catch { ok = false; } check(`song parses ${k}`, ok); check(`song level ${k}`, songLevel(s) >= 0.03, songLevel(s)); }
check('step song is 104', SONGS.step.bpm === 104 && SONGS.step.order.length === 32);
for (const a of ACTIVITIES) { const l = ACTIVITY_LINES[a.id]; check(`lines ${a.id}`, l && ['s0', 's1', 's2', 's3', 'first', 'repeat'].every((k) => l[k])); check(`station ${a.id}`, !!STATIONS[a.station]); check(`stars ${a.id}`, a.stars.length === 3); }
const lines = allLines();
check('at least 120 lines beyond the samples', lines.length >= 150, lines.length);
for (const t of lines) { check(`fits: ${t.slice(0, 30)}`, wrap(t, LINE_COLS).length <= 3, wrap(t, LINE_COLS).length); for (const c of t) if (c !== '\n') check(`glyph ${c} in ${t.slice(0, 20)}`, hasGlyph(c)); }
for (const p of ABOUT_PAGES) for (const t of [p.title, ...(p.lines ?? [])]) for (const c of String(t)) if (!hasGlyph(c)) check(`about glyph ${c}`, false, t.slice(0, 30));
for (const w of WEEK) for (const id of w.opens) check(`opens resolve ${id}`, ACT[id] || id === 'locker');
check('hub players field', AI_HUB.players === '1–4');
// Progress rules.
check('stars thresholds', starsFor(ACT.tree, 44) === 0 && starsFor(ACT.tree, 45) === 1 && starsFor(ACT.tree, 90) === 3);
check('drips formula', dripsFor(2, 65) === 2 + 6 + 2, dripsFor(2, 65));
{ const s = newSlot('A', {}, 0); const a = recordTest(s, 0.95), b = recordTest(s, 0.95); const lo = trueAge([0.95, 0.95, 0.95], 0), hi = trueAge([0.05, 0.05, 0.05], 0);
  check('expert age below idle age', lo < hi, `${lo} ${hi}`); check('age clamp', trueAge([0, 0, 0], 0) <= 95 && trueAge([1, 1, 1], 200) >= 18);
  check('shown adds seven', shownAge(s, a) === a + 7); s.confessed = true; check('confession subtracts exactly 7', shownAge(s, a) === a); void b;
  const t = newSlot('B', {}, 0); check('day 1 locks jog', !isOpen(t, 'jog')); check('day 1 opens tree', isOpen(t, 'tree')); t.day = 5; check('day 5 opens jog', isOpen(t, 'jog'));
  const g = newSlot('C', {}, 0); const r1 = applyResult(g, ACT.tree, 95, 3, 60); check('drips with goal not yet', r1.drips === 2 + 9 + 2, r1.drips); check('first flagged', r1.first); const r2 = applyResult(g, ACT.squats, 60, 1, 30); check('goal day 1 fills', r2.goalNow && g.goalDone, JSON.stringify(r2)); check('goal bonus', r2.drips === 2 + 3 + 1 + 5, r2.drips); check('milestone at 10', g.items.includes('band2'));
  check('goal helper', goalMet({ kind: 'count', n: 2 }, g)); }
// 6. Save.
{ const mem = new Map(); const store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const a = new Save(store); a.data.slots[1] = newSlot('Reload', {}, 2); a.data.slots[1].day = 4; a.write();
  const b = new Save(store); check('save reload restores', b.data.slots[1]?.day === 4 && b.data.slots[1].name === 'Reload');
  mem.set(SAVE_KEY, '{broken'); const c = new Save(store); check('corrupt save falls back', c.corrupt && c.data.slots.every((s) => s === null));
  mem.set(SAVE_KEY, JSON.stringify({ version: 999, slots: [] })); const d = new Save(store); check('wrong version falls back', d.corrupt);
  const e = new Save(null); e.data.slots[0] = newSlot('Mem', {}, 0); e.write(); e.load(); check('no storage works', e.data.slots[0]?.name === 'Mem');
  check('music default', e.data.settings.music === 0.1); }
// 12. Voice.
{ const a = syllabify('Please step on me.', 'ounce'), b = syllabify('Please step on me.', 'ounce'); check('syllabify stable', JSON.stringify(a) === JSON.stringify(b)); check('syllables exist', a.length >= 4);
  const c = syllabify('step', 'ounce'), d = syllabify('Well step', 'ounce'); check('same word same vowel', c[0].vowel === d[d.length - 1].vowel && c[0].cons === d[d.length - 1].cons);
  const q = syllabify('Is that close to you today?', 'ounce'), s = syllabify('Is that close to you today.', 'ounce'); check('question rises', q[q.length - 1].f0 > s[s.length - 1].f0);
  const j = syllabify('I am pacing myself today.', 'june'); check('June has no contour', j[0].f0 === j[j.length - 1].f0); check('Ounce higher than Coach', syllabify('hello', 'ounce')[0].f0 > syllabify('hello', 'coach')[0].f0); check('Kevin never speaks', syllabify('hello', 'kevin').length === 0); check('hash stable', hashWord('ow') === hashWord('ow'));
  const dots = syllabify('So...', 'ounce'); check('... slows', dots[0].dur > 1 / 13); }
// 13. Engine untouched.
{ const h = createHash('sha256').update(readFileSync(new URL('../../pixel-engine.js', import.meta.url))).digest('hex'); check('engine hash', h === readFileSync(new URL('../../vendor/pixel-engine.sha256', import.meta.url), 'utf8').trim()); }
void QUESTIONS; void BARKS; void STORY;
const r = report(); console.log(`${r.n - r.fail}/${r.n} passed`); process.exit(r.fail ? 1 : 0);
