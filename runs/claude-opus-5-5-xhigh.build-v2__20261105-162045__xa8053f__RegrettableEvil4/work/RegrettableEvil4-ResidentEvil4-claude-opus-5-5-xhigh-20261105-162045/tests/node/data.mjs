// Strings fit the font; every model, texture, clip, song, sound and voice is sound.
import { checkModel, validateTexture, validateClip, HERO_RIG, parseSong, renderSound } from '../../pixel-engine.js';
import { readdirSync, readFileSync } from 'node:fs';
import { ALL_DEFS, ICONS, MODELS } from '../../src/models/index.js';
import { CLIP_DEFS } from '../../src/data/clips.js';
import { SONGS } from '../../src/audio/songs.js';
import { SOUNDS } from '../../src/audio/sfx.js';
import { SPEAKER_NAMES, syllableDef } from '../../src/audio/voice.js';
import { S, ALL_TANNOY_LINES, DAME_BARKS, PYM_HINTS, CHAPTER_CARDS } from '../../src/data/dialogue.js';
import { NOTES } from '../../src/data/notes.js';
import { ITEMS, TREASURE, KEY_ITEMS } from '../../src/data/items.js';
import { WEAPONS, TUNE_STATS } from '../../src/data/weapons.js';
import { ENEMIES, ISLE_BARKS, MONK_BARKS, DROWNED_BARKS } from '../../src/data/enemies.js';
import { BARKS, SPECIAL_STOCK, TANNOY_PRIZES } from '../../src/data/shop.js';
import { DIFFICULTY, TUNING_SPEC } from '../../src/data/tuning.js';
import { SOURCE_INFORMATION, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, CREDITS, SOURCE_LABELS, TESTING_QUESTIONS, ENGINE_QUESTIONS, PROMPT_QUESTIONS, exitInterview } from '../../src/data/about.js';
import { LEVELS } from '../../src/data/levels/index.js';
import { DEV_TELEPORTS } from '../../src/data/levels/teleports.js';

const OK = /^[0-9A-Z.,:;\-+=/()[\]{}%_!?<>#'‘’“”*@°·&|\\~^$\s]*$/;

function walk(v, seen, out, path) {
  if (typeof v === 'string') { out.push([path, v]); return; }
  if (!v || typeof v !== 'object' || seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, seen, out, `${path}[${i}]`)); return; }
  for (const k of Object.keys(v)) walk(v[k], seen, out, `${path}.${k}`);
}

export default async function (t) {
  // Strings: everything that reaches the HUD draws in the 5x7 font.
  const strings = [];
  const seen = new Set();
  walk({ S, ALL_TANNOY_LINES, DAME_BARKS, PYM_HINTS, CHAPTER_CARDS, NOTES, BARKS, SPECIAL_STOCK, TANNOY_PRIZES, ISLE_BARKS, MONK_BARKS, DROWNED_BARKS, DIFFICULTY }, seen, strings, 'text');
  for (const [id, d] of Object.entries(ITEMS)) strings.push([`item ${id}`, d.name], [`item ${id}`, d.text]);
  for (const [id, d] of Object.entries(TREASURE)) strings.push([`treasure ${id}`, d.name], [`treasure ${id}`, d.text]);
  for (const [id, d] of Object.entries(KEY_ITEMS)) strings.push([`key ${id}`, d.name], [`key ${id}`, d.text]);
  for (const [id, d] of Object.entries(WEAPONS)) strings.push([`weapon ${id}`, d.name], [`weapon ${id}`, d.text], [`weapon ${id}`, d.perkText]);
  for (const d of Object.values(TUNE_STATS)) strings.push(['tune', d.label], ['tune', d.text]);
  for (const [id, d] of Object.entries(ENEMIES)) strings.push([`enemy ${id}`, d.name]);
  for (const s of TUNING_SPEC) strings.push(['tuning', s[1]]);
  for (const s of DEV_TELEPORTS) strings.push(['teleport', s.label], ['teleport', s.chapter]);
  for (const k of Object.keys(SOURCE_INFORMATION)) strings.push(['about', SOURCE_INFORMATION[k]]);
  for (const s of [...TESTING_FEEDBACK, ...ENGINE_FEEDBACK, ...PROMPT_FEEDBACK, ...CREDITS, ...TESTING_QUESTIONS, ...ENGINE_QUESTIONS, ...PROMPT_QUESTIONS]) strings.push(['about', s]);
  // Text in source: say, hint, flashText, objective, label strings in the level data and screens.
  const scan = (dir) => {
    for (const f of readdirSync(new URL(dir, import.meta.url))) {
      if (f.endsWith('.js')) {
        const src = readFileSync(new URL(`${dir}${f}`, import.meta.url), 'utf8');
        for (const m of src.matchAll(/(?:objective|hint|flashText|setObjective|showHint|label|text|say):?\s*\(?\s*'((?:[^'\\]|\\.)*)'/g)) strings.push([f, m[1].replace(/\\'/g, "'")]);
        for (const m of src.matchAll(/(?:bark|lines)\(?[^'\n]{0,30}'[a-z]+', '((?:[^'\\]|\\.)*)'/g)) strings.push([f, m[1].replace(/\\'/g, "'")]);
      }
    }
  };
  scan('../../src/data/levels/'); scan('../../src/screens/'); scan('../../src/game/setpieces/'); scan('../../src/game/bosses/');
  let bad = 0;
  for (const [where, s] of strings) {
    if (s && !OK.test(String(s).toUpperCase())) { bad++; if (bad < 8) t.ok(false, `${where}: can't draw "${s}"`); }
  }
  t.ok(bad === 0, `all ${strings.length} strings use font characters`);

  // Models, textures, clips.
  for (const d of ALL_DEFS) {
    const r = checkModel(d, { catalog: MODELS });
    t.ok(r.problems.length === 0, `model ${d.id}: ${r.problems[0] ?? ''}`);
  }
  for (const d of ICONS) {
    const r = validateTexture(d);
    t.ok(r.problems.length === 0, `icon ${d.id}: ${r.problems[0] ?? ''}`);
  }
  for (const c of CLIP_DEFS) {
    const p = validateClip(c, HERO_RIG);
    t.ok(p.length === 0, `clip ${c.name}: ${p[0] ?? ''}`);
  }
  t.ok(CLIP_DEFS.length >= 50, `at least 50 new clips (have ${CLIP_DEFS.length})`);

  // Songs parse; sounds render, non-silent, not clipping.
  t.eq(Object.keys(SONGS).length, 10, 'ten songs');
  for (const [name, song] of Object.entries(SONGS)) {
    let parsed = null;
    try { parsed = parseSong(song); } catch (e) { t.ok(false, `song ${name}: ${e.message}`); }
    t.ok(parsed && parsed.notes?.length !== 0, `song ${name} has notes`);
  }
  t.ok(Object.keys(SOUNDS).length >= 45, `at least 45 sounds (have ${Object.keys(SOUNDS).length})`);
  for (const [name, def] of Object.entries(SOUNDS)) {
    const samples = renderSound(def, 22050);
    let peak = 0;
    for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
    t.ok(peak > 0.02, `sound ${name} not silent (peak ${peak.toFixed(3)})`);
    t.ok(peak <= 1.001, `sound ${name} not clipping (peak ${peak.toFixed(3)})`);
  }
  // Voices: every speaker has syllables that make sound.
  for (const sp of SPEAKER_NAMES) {
    for (let v = 0; v < 5; v++) {
      const samples = renderSound(syllableDef(sp, v, v % 2 === 0), 22050);
      let peak = 0;
      for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
      t.ok(peak > 0.02 && peak <= 1.001, `voice ${sp} syllable ${v} peak ${peak.toFixed(3)}`);
    }
  }
  // No guardrail names anywhere in the player-facing text.
  const banned = /\b(leon|ashley|krauser|salazar|saddler|hunnigan|plagas|ganados|umbrella|raccoon)\b/i;
  for (const [where, s] of strings) t.ok(!banned.test(String(s)), `guardrail: ${where}: ${s}`);
  // Levels: every area has a title, a map, a mood.
  for (const [id, def] of Object.entries(LEVELS)) t.ok(def.title && def.map && def.mood, `level ${id} is complete`);
  // The exit interview shape.
  const ex = exitInterview();
  t.eq(typeof JSON.parse(JSON.stringify(ex)).aiHub.name, 'string', 'exit interview parses');
  t.eq(ex.testingFeedback.length, 4, 'four testing answers');
  t.eq(ex.engineFeedback.length, 6, 'six engine answers');
  t.eq(ex.promptFeedback.length, 4, 'four prompt answers');
  t.eq(ex.sourceInformation.usage, 'added on import', 'usage says added on import');
  t.ok(ex.aiHub.tags.length >= 3 && ex.aiHub.tags.length <= 6, 'three to six tags');
  for (const key of SOURCE_LABELS.map((x) => x[1])) t.ok(SOURCE_INFORMATION[key], `source field ${key}`);
}
