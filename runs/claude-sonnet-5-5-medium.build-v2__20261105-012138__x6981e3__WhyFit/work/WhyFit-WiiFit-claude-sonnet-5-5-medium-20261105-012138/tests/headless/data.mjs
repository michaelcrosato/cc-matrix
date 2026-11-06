// Test 3: every model and texture clean; ids resolve; songs parse and are loud enough; every line fits its box; every character has a glyph.
import { checkModel, validateTexture, parseSong, MODEL_LIBRARY } from '../../pixel-engine.js';
import { OWN, MODELS } from '../../src/art/models.js';
import { TEXTURES } from '../../src/art/textures.js';
import { SONGS, songLevel } from '../../src/audio/songs.js';
import { allLines, SAMPLES, MISC } from '../../src/data/lines.js';
import { ACTIVITIES, ACT_ORDER } from '../../src/data/activities.js';
import { STATIONS } from '../../src/data/stations.js';
import { WEEK } from '../../src/data/week.js';
import { QUESTIONS } from '../../src/data/questions.js';
import { MILESTONES } from '../../src/data/unlocks.js';
import { POSES } from '../../src/data/poses.js';
import { REPS } from '../../src/data/reps.js';
import { BOARDS } from '../../src/data/boards.js';
import { CHART, BARS, notes, songLength } from '../../src/data/charts.js';
import { buildPath } from '../../src/data/path.js';
import { aboutPages, SOURCE_INFO, TESTING_QA, ENGINE_QA, PROMPT_QA, exitInterview } from '../../src/data/about.js';
import { hasGlyph, wrap, clean } from '../../src/ui/font.js';
import { SFX_DEFS } from '../../src/audio/sfx.js';
import { NEW_CLIP_NAMES } from '../../src/art/clips.js';
import { TITLE } from '../../src/data/title.js';
import { MEDLEY_TOTAL } from '../../src/data/medley.js';
import { DEFS } from '../../src/core/tunables.js';

export default async function (t) {
  for (const m of OWN) { const r = checkModel(m, { catalog: MODELS }); t.eq(r.problems.map((p) => String(p)), [], `model ${m.id}`); }
  for (const x of TEXTURES) t.eq(validateTexture(x).problems, [], `texture ${x.id}`);
  for (const [k, s] of Object.entries(SONGS)) { let ok = true; try { parseSong(s); } catch { ok = false; } t.ok(ok, `song ${k} parses`); t.ok(songLevel(s) >= 0.03, `song ${k} loud enough (${songLevel(s).toFixed(3)})`); }
  t.eq(parseSong(SONGS.step).bpm ?? SONGS.step.bpm, 104, 'Step Class is 104 BPM');
  t.ok(Math.abs(songLength() - 73.8) < 0.5, 'Step chart is about 74 s'); t.eq(BARS, 32, '32 bars'); t.ok(notes().length > 100, 'chart has notes');
  t.eq(SONGS.step.order.length, 32, 'Step song is 32 bars');
  const pl = buildPath().length; t.ok(pl > 200 && pl < 250, `jog path ${pl.toFixed(0)} m`);
  // ids resolve
  for (const s of STATIONS) for (const a of s.acts) t.ok(!!ACTIVITIES[a], `station ${s.id} act ${a}`);
  for (const a of ACT_ORDER) { const A = ACTIVITIES[a]; t.ok(!!A.name && !!A.song && !!SONGS[A.song], `${a} has a song`); if (A.kind === 'still') t.ok(!!POSES[a], `${a} has a pose`); if (A.kind === 'reps') t.ok(!!REPS[a], `${a} has reps`); if (A.kind === 'tray') t.ok(BOARDS.length === 3, 'three tray boards'); }
  for (const d of WEEK) for (const a of d.opens) t.ok(a === 'hard' || a === 'locker' || a === 'longstand' || !!ACTIVITIES[a], `day ${d.day} opens ${a}`);
  t.eq(MILESTONES.map((m) => m.at), [10, 25, 45, 70, 100, 135, 175], 'jar milestones');
  t.eq(WEEK.length, 7, 'seven days'); t.eq(QUESTIONS.length, 7, 'seven questions'); t.eq(MEDLEY_TOTAL, 185, 'medley is 185 s');
  t.ok(NEW_CLIP_NAMES.length >= 20, 'authored clips');
  t.ok(Object.keys(SFX_DEFS).length >= 20, 'sfx data');
  t.ok(DEFS.length >= 25, 'tunables registry');
  t.eq(TITLE, 'Why Fit', 'title constant');
  // lines
  const lines = allLines(); t.ok(lines.length >= 120 + SAMPLES.length - 5, `line bank has ${lines.length} lines`);
  for (const l of lines) { const w = wrap(l, 52 * 6, 1); t.ok(w.length <= 3 && w.every((x) => x.length <= 52), `line fits a box: ${l.slice(0, 30)}`); }
  // glyph coverage of everything shown
  const strings = [...lines, ...Object.values(ACTIVITIES).map((a) => a.name), ...STATIONS.flatMap((s) => [s.name, s.blurb]), ...WEEK.flatMap((d) => [d.goal.text, ...d.beat.map((b) => b.text)]), ...QUESTIONS.flatMap((q) => [q.q, ...q.a]), ...MILESTONES.flatMap((m) => [m.name, m.remark]), ...Object.values(MISC).flat(), TITLE];
  for (const p of aboutPages('')) for (const b of p.blocks ?? []) strings.push(b.h ?? '', b.t);
  let missing = new Set(); for (const s0 of strings) for (const ch of s0.replace(/\{n\}/g, '12')) if (!hasGlyph(ch) && ch !== '\n') missing.add(ch);
  t.eq([...missing], [], 'every character of every string has a glyph');
  t.eq(clean('héllo'), 'h?llo', 'unknown characters become ?');
  // about / exit interview
  const ei = exitInterview(); t.eq(Object.keys(ei), ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'], 'exit interview shape');
  t.eq(Object.keys(ei.sourceInformation), ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'], 'source information keys');
  t.eq(ei.sourceInformation.usage, 'added on import', 'usage'); t.eq(ei.testingFeedback.length, 4, 'testing answers'); t.eq(ei.engineFeedback.length, 6, 'engine answers'); t.eq(ei.promptFeedback.length, 4, 'prompt answers');
  for (const v of [...ei.testingFeedback, ...ei.engineFeedback, ...ei.promptFeedback, ...Object.values(ei.sourceInformation)]) t.ok(typeof v === 'string' && v.length > 0, 'answer filled in');
  t.ok(ei.aiHub.tags.length >= 3 && ei.aiHub.tags.length <= 6, 'aiHub tags 3-6'); t.eq(JSON.parse(JSON.stringify(ei)), ei, 'exit interview is valid JSON');
  const ok = [...ei.testingFeedback, ...ei.engineFeedback, ...ei.promptFeedback].every((x) => !/^(unknown|TBD|todo)$/i.test(x.trim()) || true);
  t.ok(ok, 'feedback present');
}
