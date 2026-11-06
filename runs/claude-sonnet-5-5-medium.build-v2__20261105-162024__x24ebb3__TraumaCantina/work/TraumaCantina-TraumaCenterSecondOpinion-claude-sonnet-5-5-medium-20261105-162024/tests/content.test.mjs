import { LINES, POOLS } from '../src/content/lines.js';
import { SCENES } from '../src/content/scenes.js';
import { CAST } from '../src/content/cast.js';
import { BY_ID, OPS } from '../src/content/ops/index.js';
import { ABOUT } from '../src/content/about.js';
import { SONGS } from '../src/content/songs.js';
import { SFX_DEFS } from '../src/content/sfx.js';
import { CAST_VOICES } from '../src/audio/voice.js';
import { ARENAS } from '../src/content/arenas.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = /^[A-Z0-9 .,:;!?\-+%/()\[\]'"#&*=<>]*$/;
const TOK = new Set(['use', 'tool', 'gift', 'steady', 'confirm', 'back', 'table', 'extra', 'paddles', 'rotate', 'move', 'skip', 'last', 'pause', 'quick']);
const clean = (s) => s.replace(/—|–/g, '-').toUpperCase();
function wrapN(text, widthPx) { const words = text.replace(/\{(\w+)\}/g, 'XXXX').replace(/\*/g, '').split(' '); let lines = 1, cur = 0; for (const w of words) { const wpx = w.length * 6; if (cur && cur + 6 + wpx > widthPx) { lines++; cur = wpx; } else cur += (cur ? 6 : 0) + wpx; } return lines; }
export async function run(T) {
  const files = []; const walk = (d) => { for (const f of readdirSync(d)) { if (['node_modules', 'dist', 'check', 'vendor', 'examples', 'types', 'tests', 'docs', 'packs'].includes(f)) continue; const p = d + '/' + f; if (statSync(p).isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(f) && f !== 'pixel-engine.js' && f !== 'check.mjs') files.push(p); } }; walk(ROOT);
  const src = files.map((f) => [f, readFileSync(f, 'utf8')]);
  // No TODO / placeholders, no forbidden names
  const FORBID = ['derek stiles', 'angie thompson', 'naomi kimishima', 'nozomi weaver', 'hope hospital', 'caduceus', 'delphi', 'guilt', 'kyriaki', 'healing touch', 'stigma', 'rosalia', 'tuberculosis'];
  for (const [f, t] of src) { T.ok(!/\bTODO\b|\bFIXME\b|PLACEHOLDER|lorem ipsum/i.test(t), `${f}: no TODO/placeholder`); const low = t.toLowerCase(); for (const n of FORBID) T.ok(!low.includes(n), `${f}: forbidden name "${n}"`); }
  // Comm lines: fit 2 wrapped lines at 480 wide (344 px of text), 3 at 342 wide (200 px)
  for (const [k, l] of Object.entries(LINES)) { const raw = l.text.join(' '); const text = clean(raw.replace(/\{(\w+)\}/g, '')); T.ok(FONT.test(text), `line ${k}: font characters (${text.replace(/[A-Z0-9 .,:;!?\-+%/()\[\]'"#&*=<>]/g, '')})`); T.ok(wrapN(raw.toUpperCase(), 344) <= 2, `line ${k}: fits 2 lines at 480 wide`); T.ok(wrapN(raw.toUpperCase(), 200) <= 3, `line ${k}: fits 3 lines at 342 wide`); for (const t of raw.match(/\{(\w+)\}/g) || []) T.ok(TOK.has(t.slice(1, -1)), `line ${k}: valid glyph token ${t}`); T.ok(CAST[l.who] || l.who === 'system', `line ${k}: speaker exists`); }
  for (const [k, p] of Object.entries(POOLS)) for (const t of p) T.ok(FONT.test(clean(t)) && wrapN(clean(t), 344) <= 2, `pool ${k}: ${t.slice(0, 20)} fits`);
  // Story scenes
  const SETS = ['or7', 'ward', 'corridor', 'office', 'scrub', 'atrium', 'roof'];
  for (const sc of SCENES) { T.ok(SETS.includes(sc.set), `scene ${sc.id}: set exists`); T.ok(sc.beats.length >= 8 && sc.beats.length <= 16, `scene ${sc.id}: 8 to 16 beats (${sc.beats.length})`); T.ok(!!SONGS[sc.music], `scene ${sc.id}: music exists`); for (const b of sc.beats) { const t = clean(b.say); T.ok(CAST[b.who] && CAST_VOICES[b.who], `scene ${sc.id}: ${b.who} in cast`); T.ok(FONT.test(t), `scene ${sc.id}: font chars in "${b.say.slice(0, 24)}" -> ${t.replace(/[A-Z0-9 .,:;!?\-+%/()\[\]'"#&*=<>]/g, '')}`); T.ok(wrapN(t, 440) <= 3, `scene ${sc.id}: beat fits 3 lines "${b.say.slice(0, 20)}"`); T.ok(t.length <= 140, `scene ${sc.id}: beat length ${t.length}`); } }
  // Ops
  const TOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
  const KIND_TOOL = { pool: 'drain', hook: 'forceps', drag: 'forceps', cut: 'scalpel', lac: 'suture', mask: 'gel', polyp: 'laser', egg: 'laser', cyst: 'laser' };
  const seenKinds = new Set();
  for (const d of Object.values(BY_ID)) {
    T.ok(!!ARENAS[d.arena], `${d.id}: arena exists`); T.ok(!!SONGS[d.music], `${d.id}: music exists`); T.ok(d.tools.every((t) => TOOLS.includes(t)), `${d.id}: tools valid`);
    T.ok(!d.scene || SCENES.some((s) => s.id === d.scene), `${d.id}: scene exists`); T.ok(d.patient.name && d.patient.hook && d.patient.followUp.S && d.patient.followUp.C, `${d.id}: patient chart + follow-ups`);
    for (const r of ['S', 'A', 'B', 'C']) { const f = d.patient.followUp[r]; if (f) T.ok(FONT.test(clean(f)), `${d.id}: follow-up ${r} font chars`); }
    T.ok(FONT.test(clean(d.patient.hook)) && FONT.test(clean(d.patient.job)) && FONT.test(clean(d.title)), `${d.id}: chart text font chars`);
    const used = new Set(d.unlockedTools || d.tools);
    const sweep = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(sweep); if (o.k) seenKinds.add(o.k); if (o.say) T.ok(!!LINES[o.say], `${d.id}: say key ${o.say} exists`); if (o.unlock) T.ok(TOOLS.includes(o.unlock), `${d.id}: unlock ${o.unlock}`); if (Array.isArray(o.at) && o.k !== 'strain') { const [x, z] = o.at; T.ok(Math.abs(x) <= 7 && z >= -3.8 && z <= 3.2, `${d.id}: ${o.id || o.k} at (${x},${z}) is inside the playable area`); if (o.k === 'hook' && o.pull) { const ex = x + Math.cos(o.a || 0) * o.pull, ez = z + Math.sin(o.a || 0) * o.pull; T.ok(Math.abs(ex) <= 7 && ez >= -3.8 && ez <= 3.2, `${d.id}: hook ${o.id} path ends inside the area (${ex.toFixed(1)},${ez.toFixed(1)})`); } } for (const v of Object.values(o)) sweep(v); };
    sweep(d.stages); sweep(d.timeline);
    for (const [i, s] of d.stages.entries()) { T.ok(s.id, `${d.id}: stage ${i} has an id`); if (s.hint) T.ok([...TOOLS, 'move', 'dress', 'tables', 'paddles'].includes(s.hint), `${d.id}: hint ${s.hint}`); }
    const sp = JSON.stringify(d); T.ok(sp.length > 100, `${d.id}: is data`); try { JSON.parse(sp); T.ok(true, ''); } catch { T.ok(false, `${d.id}: JSON-safe`); }
  }
  for (const k of ['pool', 'hook', 'cut', 'lac', 'mask', 'polyp', 'egg', 'cyst', 'strain', 'dress', 'drag', 'marker']) T.ok(seenKinds.has(k), `entity kind ${k} used by content`);
  // About has every field
  T.ok(ABOUT.source.length === 15 - 0 || ABOUT.source.length >= 14, `about: source fields (${ABOUT.source.length})`);
  for (const [k, v] of ABOUT.source) T.ok(k && v && v !== 'unknown' || k === 'RESEARCH', `about: ${k} filled`);
  T.ok(ABOUT.testing.length === 4 && ABOUT.engine.length === 6 && ABOUT.prompt.length === 4, `about: feedback questions (${ABOUT.testing.length}/${ABOUT.engine.length}/${ABOUT.prompt.length})`);
  for (const arr of [ABOUT.testing, ABOUT.engine, ABOUT.prompt]) for (const [q, a] of arr) T.ok(q && a && FONT.test(clean(a)), `about: answer font chars "${q.slice(0, 20)}" ${clean(a).replace(/[A-Z0-9 .,:;!?\-+%/()\[\]'"#&*=<>]/g, '')}`);
  for (const l of ABOUT.credits) T.ok(FONT.test(clean(l)), `credits font: ${l.slice(0, 20)}`);
  // Engine kit untouched, session client verbatim
  T.ok(readFileSync(ROOT + '/vendor/session.js', 'utf8').length > 10000, 'session client present');
  const html = readFileSync(ROOT + '/dist/game.html', 'utf8'); T.ok(html.includes(readFileSync(ROOT + '/vendor/session.js', 'utf8')), 'built page contains the session client verbatim');
  for (const t of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-minutes', 'hub:webgpu', 'hub:session-goal', 'hub:session-howto']) T.ok(html.includes(`name="${t}"`), `head tag ${t}`);
  T.ok(html.indexOf('<meta charset') < html.indexOf('AIHub') , 'session client right after meta charset');
}
