// Content lint: everything referenced exists, text fits and draws, no placeholders, no forbidden names.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ABOUT_PAGES } from '../src/content/about.js';
import { ARENAS } from '../src/content/arenas.js';
import { LINES, SPEAKER_NAMES } from '../src/content/lines.js';
import { CAMPAIGN_OPS, OPS } from '../src/content/ops/index.js';
import { SCENES } from '../src/content/scenes/index.js';
import { SFX_DEFS } from '../src/content/sfx.js';
import { SONGS } from '../src/content/songs.js';
import { glyphsFor, TOKENS } from '../src/ui/prompts.js';
import { ALL_SYLLABLES, renderSyllable, syllableAt, VOICES } from '../src/audio/voice.js';
import { noteFrequency, parseSong, renderSound } from '../pixel-engine.js';
import { TOOLS } from '../src/sim/entities.js';
import { BUSTS } from '../src/content/models/cast.js';

const CHARS = /^[A-Za-z0-9 .,:;!?\-+%/()[\]'"#&*=<>{}]*$/;
const FORBIDDEN = /derek|stiles|angie|thompson|naomi|kimishima|nozomi|weaver|hope hospital|caduceus|delphi|\bguilt\b|kyriaki|deuteros|triti|tetarti|pempti|paraskevi|savato|healing touch/i;
const WRAP_CHARS = 57; // 342 art pixels at 6 per character

function lines(text) {
  const clean = text.replace(/\*/g, '').replace(/\{[a-z]+\}/g, 'XX');
  const out = [];
  let cur = '';
  for (const w of clean.split(' ')) {
    if (cur && (cur.length + 1 + w.length) > WRAP_CHARS) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
}
function collectSay(node, out = []) {
  if (!node) return out;
  if (typeof node === 'string') { if (node.includes('|')) out.push(node); return out; }
  if (Array.isArray(node)) { for (const n of node) collectSay(n, out); return out; }
  if (typeof node === 'object') for (const k of Object.keys(node)) { if (['say', 'lines', 'firstKnockLine', 'halfLine', 'sobLine', 'fibLine', 'arrestLine', 'finalLine'].includes(k)) collectSay(node[k], out); else if (typeof node[k] === 'object') collectSay(node[k], out); }
  return out;
}
const tokensIn = (t) => [...t.matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]);

export async function run(report) {
  const usedTools = new Set();
  const walk = (n) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) { n.forEach(walk); return; } if (n.tools) n.tools.forEach((t) => usedTools.add(t)); for (const v of Object.values(n)) walk(v); };
  for (const op of Object.values(OPS)) {
    walk(op);
    const tables = op.tables ?? [{ arena: op.arena }];
    for (const t of tables) report(`${op.id}: arena ${t.arena ?? op.arena} exists`, !!ARENAS[t.arena ?? op.arena]);
    report(`${op.id}: has a patient chart`, !!(op.patient?.name && op.patient?.objective && ['S', 'A', 'B', 'C'].every((r) => op.patient.followUp?.[r])));
    report(`${op.id}: JSON safe`, JSON.stringify(JSON.parse(JSON.stringify(op))) === JSON.stringify(op));
    if (op.music) report(`${op.id}: music ${op.music} exists`, !!SONGS[op.music] || op.music === 'silence');
    for (const st of op.stages) {
      if (st.music) report(`${op.id}/${st.id}: music ${st.music} exists`, !!SONGS[st.music] || st.music === 'silence');
      if (st.objective) {
        report(`${op.id}/${st.id}: objective fits`, lines(st.objective).length <= 2, st.objective);
        report(`${op.id}/${st.id}: objective font`, CHARS.test(st.objective), st.objective);
        for (const tk of tokensIn(st.objective)) report(`${op.id}/${st.id}: token ${tk}`, TOKENS.includes(tk));
      }
    }
    for (const line of collectSay(op)) {
      const [who, text] = [line.slice(0, line.indexOf('|')), line.slice(line.indexOf('|') + 1)];
      report(`${op.id}: speaker ${who}`, !!SPEAKER_NAMES[who] && !!VOICES[who], line);
      report(`${op.id}: fits two lines: ${text}`, lines(text).length <= 2);
      report(`${op.id}: font: ${text}`, CHARS.test(text));
      for (const tk of tokensIn(text)) report(`${op.id}: token ${tk}`, TOKENS.includes(tk), text);
    }
    for (const v of Object.values(op.patient.followUp)) report(`${op.id}: follow-up font`, CHARS.test(v), v);
  }
  for (const t of TOOLS) report(`tool ${t} used somewhere`, usedTools.has(t));
  for (const sc of Object.values(SCENES)) {
    report(`${sc.id}: music exists`, !!SONGS[sc.music]);
    report(`${sc.id}: 8 to 16 beats`, sc.beats.length >= 8 && sc.beats.length <= 16, String(sc.beats.length));
    for (const b of sc.beats) {
      const t = b.say ?? b.narr;
      if (b.who) {
        report(`${sc.id}: ${b.who} has a bust`, !!BUSTS[b.who]);
        report(`${sc.id}: ${b.who} has a voice`, !!VOICES[b.who]);
      }
      report(`${sc.id}: font: ${t}`, CHARS.test(t));
      report(`${sc.id}: fits: ${t}`, lines(t).length <= (b.narr ? 3 : 2));
    }
  }
  for (const c of CAMPAIGN_OPS) report(`${c.id}: scene exists`, !!SCENES[c.scene]);
  for (const [who, pools] of Object.entries(LINES)) for (const [k, list] of Object.entries(pools)) for (const t of list) {
    report(`lines ${who}.${k}: fits ${t}`, lines(t.replace('{want}', 'FORCEPS')).length <= 2);
    report(`lines ${who}.${k}: font ${t}`, CHARS.test(t));
  }
  // Sound: non-silent, finite.
  for (const [k, def] of Object.entries(SFX_DEFS)) {
    const a = renderSound(def, 22050);
    let peak = 0, finite = true;
    for (const v of a) { if (!Number.isFinite(v)) finite = false; peak = Math.max(peak, Math.abs(v)); }
    report(`sfx ${k} sounds`, finite && peak > 0.005, `peak ${peak}`);
  }
  for (const s of ALL_SYLLABLES) {
    const a = renderSyllable(s.t, s.v, s.o);
    let peak = 0, finite = true;
    for (const v of a) { if (!Number.isFinite(v)) finite = false; peak = Math.max(peak, Math.abs(v)); }
    report(`syllable ${s.name} sounds`, finite && peak > 0.2);
  }
  report('voices are deterministic', JSON.stringify(syllableAt('reyes', 'Doctor!', 1)) === JSON.stringify(syllableAt('reyes', 'Doctor!', 1)));
  for (const [k, song] of Object.entries(SONGS)) {
    let ok = true;
    try { parseSong(song); } catch { ok = false; }
    report(`song ${k} parses`, ok);
  }
  report('note parser', noteFrequency('A4') === 440);
  report('PlayStation glyphs by default', glyphsFor('use', 'pad', 'playstation')[0] === 'R2' && glyphsFor('confirm', 'pad', 'playstation')[0] === 'CROSS');
  report('the Xbox option swaps glyphs', glyphsFor('use', 'pad', 'xbox')[0] === 'RT' && glyphsFor('confirm', 'pad', 'xbox')[0] === 'A' && glyphsFor('tag', 'pad', 'xbox')[0] === 'Y');
  report('keys and mouse glyphs', glyphsFor('use', 'kbm')[0] === 'LMB' && glyphsFor('gift', 'kbm')[0] === 'KEY:SPACE');
  // About has every field the brief lists.
  const flat = ABOUT_PAGES.flatMap((p) => p.rows.map((r) => r[0]));
  for (const f of ['DATE', 'SOURCE', 'PLAN', 'GENRE AND PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE']) report(`about: ${f}`, flat.includes(f));
  for (const title of ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS']) report(`about page: ${title}`, ABOUT_PAGES.some((p) => p.title === title));
  // No placeholders, no forbidden names, in the shipped game's sources.
  const files = [];
  const scan = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) scan(p); else if (/\.js$/.test(f)) files.push(p); } };
  scan(new URL('../src', import.meta.url).pathname);
  files.push(new URL('../game.js', import.meta.url).pathname);
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    report(`${f.split('/').pop()}: no TODO or placeholder`, !/\bTODO\b|\bFIXME\b|\bplaceholder\b|\bstub\b/i.test(t.replace(/PAD_STUB/g, '')));
    if (!f.endsWith('about.js')) report(`${f.split('/').pop()}: no forbidden names`, !FORBIDDEN.test(t), (t.match(FORBIDDEN) ?? [])[0]);
    report(`${f.split('/').pop()}: no HERO_MODEL shown`, !/HERO_MODEL/.test(t));
  }
  // Every sound the code asks for exists.
  const BUILT_IN = new Set(['whoosh']);
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/App\.sfx\('([a-zA-Z0-9]+)'/g)) report(`sfx ${m[1]} is registered`, !!SFX_DEFS[m[1]] || BUILT_IN.has(m[1]), f);
  }
  // Kit tool: every model draws clean.
  try {
    const out = execFileSync('node', ['check.mjs', '--sheets', 'src/content/models/index.js'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    report('check.mjs --sheets has no problems', !/^\s+x /m.test(out));
  } catch (e) {
    report('check.mjs --sheets has no problems', false, String(e.stdout ?? e).split('\n').filter((l) => /^\s+x /.test(l)).slice(0, 4).join(' / '));
  }
}
