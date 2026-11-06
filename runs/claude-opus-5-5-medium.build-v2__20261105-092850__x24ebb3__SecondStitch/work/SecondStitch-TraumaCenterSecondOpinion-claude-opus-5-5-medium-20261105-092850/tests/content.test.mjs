// Content lint: names, text fit, the font's character set, tokens, and no placeholders.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { OPS } from '../src/content/ops/index.js';
import { SCENES } from '../src/content/scenes/index.js';
import { CAST } from '../src/content/cast.js';
import { SETS } from '../src/content/sets.js';
import { LINES } from '../src/content/lines.js';
import { SONGS } from '../src/content/songs.js';
import { SFX_DEFS } from '../src/content/sfx.js';
import { SOURCE_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK } from '../src/content/about.js';
import { TOOLS } from '../src/sim/tools.js';
import { KINDS } from '../src/sim/entities.js';
import { renderSyllable } from '../src/audio/voice.js';
import { parseSong, renderSound } from '../pixel-engine.js';

const FONT = /^[A-Za-z0-9 .,:;!?\-+%/()[\]'"#&*=<>{}]*$/;
const TOKENS = new Set(['use', 'back', 'confirm', 'gift', 'steady', 'quick', 'drop', 'rotate', 'table', 'tag', 'paddles', 'squeeze', 'more', 'pause', 'last', 'remind', 'move', 'tabl', 'tabr', 'skipScene']);
const FORBIDDEN = /derek stiles|angie thompson|naomi kimishima|nozomi weaver|hope hospital|caduceus|delphi|\bguilt\b|kyriaki|deuteros|triti|tetarti|pempti|paraskevi|savato|healing touch/i;
const lineFit = (t) => { const plain = t.replace(/\*/g, '').replace(/\{[^}]+\}/g, 'XX'); const W = 330 / 6; let lines = 1, cur = 0; for (const w of plain.split(' ')) { if (cur + w.length > W) { lines++; cur = 0; } cur += w.length + 1; } return lines; };

function collectStrings(obj, out = [], key = '') {
  if (typeof obj === 'string') out.push([key, obj]);
  else if (Array.isArray(obj)) obj.forEach((o) => collectStrings(o, out, key));
  else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) collectStrings(obj[k], out, k);
  return out;
}
function walk(dir, out = []) { for (const f of readdirSync(dir)) { const p = `${dir}/${f}`; if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); } return out; }

export async function run(ok) {
  const say = [];
  for (const def of Object.values(OPS)) {
    const check = (c) => { if (!c) return; for (const k of Array.isArray(c) ? c : [c]) { if (Array.isArray(k.say)) say.push([def.id, k.say[0], k.say[1]]); if (k.prompt) say.push([def.id, null, k.prompt]); } };
    for (const st of def.stages) {
      if (Array.isArray(st.say)) say.push([def.id, st.say[0], st.say[1]]);
      check(st.begin); check(st.then); check(st.timed);
      for (const c of Object.values(st.on?.vitalsBelow ?? {})) check(c);
      for (const d of st.spawn ?? []) { ok(`${def.id}: known kind ${d.k}`, !!KINDS[d.k]); check(d.then); }
    }
    ok(`${def.id}: tools all real`, def.tools.every((t) => TOOLS.includes(t)));
    ok(`${def.id}: patient chart is complete`, !!(def.patient?.name && def.patient.objective && def.patient.hook && ['S', 'A', 'B', 'C'].every((r) => def.patient.followUp?.[r])));
    ok(`${def.id}: has a par`, def.par > 0);
  }
  for (const [k, pool] of Object.entries(LINES)) for (const t of pool) say.push([k, k.split('.')[0] === 'false' || k.split('.')[0] === 'mimic' ? 'reyes' : k.split('.')[0], t]);
  for (const sc of Object.values(SCENES)) {
    ok(`${sc.id}: set exists`, !!SETS[sc.set]);
    ok(`${sc.id}: 8 to 16 beats`, sc.beats.length >= 8 && sc.beats.length <= 16, String(sc.beats.length));
    ok(`${sc.id}: music exists`, !!SONGS[sc.music]);
    for (const b of sc.beats) say.push([sc.id, b.who, b.say]);
    for (const c of sc.cast) ok(`${sc.id}: cast ${c}`, !!CAST[c]);
  }
  let bad = [];
  for (const [src, who, text] of say) {
    if (who && !CAST[who]) bad.push(`${src}: who ${who}`);
    if (!FONT.test(text)) bad.push(`${src}: char in "${text}"`);
    if (lineFit(text) > 2) bad.push(`${src}: too long "${text}"`);
    for (const m of text.matchAll(/\{([^}]+)\}/g)) if (!TOKENS.has(m[1]) && !/^tool:[1-8]$/.test(m[1])) bad.push(`${src}: token ${m[1]}`);
    if ((text.match(/\*/g) ?? []).length % 2) bad.push(`${src}: unbalanced * in "${text}"`);
  }
  ok('text: speakers, characters, fit and tokens', !bad.length, bad.slice(0, 12).join(' | '));
  const allTools = new Set(Object.values(OPS).flatMap((d) => d.stages.flatMap((s) => (s.spawn ?? []).map((e) => KINDS[e.k].tool))));
  ok('every instrument is used by some op', ['scalpel', 'forceps', 'suture', 'drain', 'gel', 'laser'].every((t) => allTools.has(t)));
  // No placeholders; no forbidden names.
  const files = [...walk('src'), 'game.js'];
  const hits = [], fb = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (/\b(TODO|FIXME)\b|placeholder|lorem ipsum/.test(text)) hits.push(f);
    if (FORBIDDEN.test(text)) fb.push(`${f}: ${text.match(FORBIDDEN)[0]}`);
  }
  ok('no TODOs or placeholders', !hits.length, hits.join());
  ok('no forbidden source names', !fb.length, fb.join());
  // About has every field.
  ok('about: every field', ['DATE', 'SOURCE', 'PLAN', 'GENRE AND PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE'].every((k) => SOURCE_INFO.some(([a, b]) => a === k && b)));
  ok('about: feedback answers', TESTING_FEEDBACK.length === 4 && ENGINE_FEEDBACK.length === 6 && PROMPT_FEEDBACK.length === 4, `${TESTING_FEEDBACK.length} ${ENGINE_FEEDBACK.length} ${PROMPT_FEEDBACK.length}`);
  // Sound: non-silent and finite.
  for (const [k, def] of Object.entries(SFX_DEFS)) {
    const s = renderSound(def, 8000);
    const peak = s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    if (!(peak > 0.001) || s.some((v) => !Number.isFinite(v))) ok(`sfx ${k}`, false, `peak ${peak}`); else ok(`sfx ${k}`, true);
  }
  for (let t = 0; t < 3; t++) { const s = renderSyllable(t, 'a', 'b'); const peak = s.reduce((m, v) => Math.max(m, Math.abs(v)), 0); ok(`voice timbre ${t} renders`, peak > 0.1 && s.every(Number.isFinite)); }
  for (const [k, song] of Object.entries(SONGS)) { let e = null; try { parseSong(song); } catch (err) { e = err.message; } ok(`song ${k} parses`, !e, e); for (const [tn, inst] of Object.entries(song.tracks)) { const r = renderSound({ ...inst, freq: 440, sustain: 0.05 }, 8000); const peak = r.reduce((m, v) => Math.max(m, Math.abs(v)), 0); ok(`song ${k} track ${tn} sounds`, peak > 0.001 && r.every(Number.isFinite), `peak ${peak}`); } }
  // Each music id referenced exists.
  const musics = Object.values(OPS).flatMap((d) => [d.music, ...d.stages.map((s) => s.music)].filter(Boolean));
  ok('music ids exist', musics.every((m) => m === 'silence' || SONGS[m]), musics.filter((m) => m !== 'silence' && !SONGS[m]).join());
  // Kit's model sheet check.
  let sheet = 0;
  try { execFileSync('node', ['check.mjs', '--sheets', 'src/content/models/index.js'], { stdio: 'pipe', timeout: 240000 }); } catch (e) { sheet = e.status ?? 1; }
  ok('check.mjs --sheets has no problems', sheet === 0, `exit ${sheet}`);
}
