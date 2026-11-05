#!/usr/bin/env node
// run-record.mjs — the record cc-matrix writes into each game it makes, and the tools that read it back. No
// dependencies; Node 18+. run-matrix.mjs writes it (stampGame); anything else can import this file or run it.
//
// Once a run ends, its record goes into the game file as one inert block just before </body>:
//   <script type="application/json" id="cc-matrix-run">{ … }</script>
// Read it in a page with JSON.parse(document.getElementById('cc-matrix-run').textContent), anywhere else with
// readRecord(). Schema 2, every field in run-record.schema.json:
//   schema, tool, stampedAt, id, lab, cli
//   aiHub      AI Hub catalogue fields: named and written the way ai-hub's catalogue has them (its data/overrides.json),
//              so an import can take them as they are
//   stages     only on a run in stages: each step's model, time, tokens and cost (the plan's too, which makes no game
//              of its own), first to last, and them added up
//   result     the run's result.json as the runner wrote it (everything the dashboard shows of a run), minus its
//              session id and the plan's usage, which are the account's
//   prompt     the prompt as filled for this run, its template, each section's variant and the /goal message
//   interview  the agent's exit interview (exit-interview.json, parsed) and its final reply
// Local paths in it are written from ~ (the home folder), and kb, loc, todos and gameSha256 are measured without it.
//
//   node run-record.mjs export <games or folders…>              each record found, one JSON line per game
//   node run-record.mjs rebuild <games or folders…> --out <dir>  a runs folder made from games alone: the dashboard's
//                                                               run history (node dashboard.mjs --out <dir>)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 2;
// What the prompt asks the agent to leave beside the game, its exit interview as one JSON object.
export const EXIT_FILE = 'exit-interview.json';
// What the record leaves out of result.json: the CLI's session id and the plan's usage and tier (the account's), and
// the runner's game check (gameCheck: this computer's look at the game, which can come later than the run, and would
// change the game file each time if it were in it).
export const PRIVATE = ['sessionId', 'plan', 'gameCheck'];

const BLOCK = /<script type="application\/json" id="cc-matrix-run">([\s\S]*?)<\/script>/;
export const STAMP_RE = /\n?<script type="application\/json" id="cc-matrix-run">[\s\S]*?<\/script>\n?/;
export const unstamped = (html) => String(html).replace(STAMP_RE, '');

// The record in a page (any schema, as written), or null.
export function readRecord(html) {
  const m = String(html).match(BLOCK);
  if (!m) return null;
  try { const r = JSON.parse(m[1]); return r && typeof r === 'object' && !Array.isArray(r) ? r : null; } catch { return null; }
}

// A page with its record just before </body> (else </html>, else at the end), replacing one already there. In a
// <script>, only "</script" (or "<!--") could end it early: escaping every < rules both out.
export function stampHtml(html, record) {
  const page = unstamped(html), low = page.toLowerCase();
  const block = `\n<script type="application/json" id="cc-matrix-run">${JSON.stringify(record).replace(/</g, '\\u003c')}</script>\n`;
  const at = [low.lastIndexOf('</body>'), low.lastIndexOf('</html>')].find((i) => i >= 0) ?? page.length;
  return page.slice(0, at) + block + page.slice(at);
}

// ------------------------------------------------------------ exit interview
// A variant's questions: its "- " lines in order (the feedback sections are lists of them).
export const questionsOf = (text) => String(text ?? '').split('\n').map((l) => l.match(/^\s*[-*•]\s+(.+?)\s*$/)?.[1]).filter(Boolean);

// The agent's exit-interview.json: { answers } when it's one JSON object, else { error, text } with the file as
// written. Answers given as a list under a dimension's name (testingFeedback, engineFeedback …) are paired with that
// dimension's questions (questions: name -> [question]), so each answer says what it answers: [{ question, answer }].
export function parseInterview(text, questions = {}) {
  let answers;
  try { answers = JSON.parse(String(text).replace(/^\uFEFF/, '')); } catch (e) { return { error: `not valid JSON (${e.message})`, text }; }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return { error: 'not a JSON object', text };
  for (const [k, qs] of Object.entries(questions)) {
    if (!Array.isArray(answers[k]) || !qs?.length) continue;
    answers[k] = answers[k].map((a, i) => a && typeof a === 'object' && !Array.isArray(a) && 'answer' in a ? a : { question: qs[i] ?? null, answer: a });
  }
  return { answers };
}

// ------------------------------------------------------------ AI Hub fields
// The values ai-hub's catalogue uses (data/overrides.json, games.json, checked 2026-11-02), so a game sorts and
// filters with the rest of the wall. The prompt offers the game genres; Tech Demo and Graphics are for demos.
export const HUB_TYPES = ['Game', 'Tech demo', 'Tool'];
export const HUB_GENRES = ['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer',
  'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy', 'Tech Demo', 'Graphics'];
// ai-hub's "harness": the agent's CLI, by product name.
export const HARNESS = { claude: 'Claude Code', codex: 'Codex', grok: 'Grok', agy: 'Antigravity', muse: 'Muse Code' };

// A model's name as the wall writes it (ai-hub's displayModel): claude-opus-5-5 → Claude Opus 5.5, gpt-6.1-sol → GPT-6.1 Sol.
export function displayModel(model) {
  let slug = String(model ?? '').trim().toLowerCase().split('/').pop();
  if (!slug || slug === 'unknown') return null;
  slug = slug.replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').replace(/(\d)-(\d)(?=-|$)/g, '$1.$2');
  const cap = (w) => w ? w[0].toUpperCase() + w.slice(1) : '';
  if (slug.startsWith('gpt-')) { const [v = '', ...rest] = slug.slice(4).split('-').filter(Boolean); return rest.length ? `GPT-${v} ${rest.map(cap).join(' ')}` : `GPT-${v}`; }
  return slug.split('-').filter(Boolean).map((p) => /^\d/.test(p) ? p : cap(p)).join(' ');
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#'
  ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m);
const squish = (s) => decode(s).replace(/\s+/g, ' ').trim();
const camel = (s) => s.replace(/[-_ ](.)/g, (m, c) => c.toUpperCase()).trim();
// What ai-hub reads from a game's <head> itself (its parseHead): the title as "Name — Tagline", the description and
// theme colour, and every hub:* <meta> (hub:session-players → sessionPlayers; hub:inspired-by is its old name for source).
function headFields(page) {
  const end = page.search(/<\/head\s*>/i), head = page.slice(0, end < 0 ? 65536 : end), out = {}, metas = new Map();
  for (const tag of head.match(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) ?? []) {
    const attrs = {}; for (const [, k, , v1, v2, v3] of tag.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[k.toLowerCase()] = v1 ?? v2 ?? v3;
    const name = (attrs.name || attrs.property || '').toLowerCase();
    if (name && attrs.content != null && !metas.has(name)) metas.set(name, squish(attrs.content));
  }
  const title = squish(head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? ''), sep = title.match(/\s*[—–]\s*|\s+[·•|]\s+|\s*:\s+|\s+[-‒]\s+|\s+\/\s+/);
  if (title) Object.assign(out, sep && sep.index >= 2 && title.slice(sep.index + sep[0].length).trim()
    ? { name: title.slice(0, sep.index).trim(), tagline: title.slice(sep.index + sep[0].length).trim() } : { name: title });
  if (metas.get('description')) out.description = metas.get('description');
  if (/^#[0-9a-f]{3,8}$/i.test(metas.get('theme-color') ?? '')) out.themeColor = metas.get('theme-color').toLowerCase();
  for (const [k, v] of metas) if (k.startsWith('hub:') && v) { const f = camel(k.slice(4)); out[f === 'inspiredBy' ? 'source' : f] = v; }
  return out;
}

// One catalogue value written the catalogue's way, or undefined to leave it out: text trimmed ("unknown", "none" and
// the like are no value), a type and genre from its lists whatever their case, players as 1, 1–2 or 1–4 (en dash),
// tags as a list of lowercase words, the controls as one line.
const NONE = /^(unknown|none|n\/?a|-|—|null)?$/i;
function hubValue(k, v) {
  if (typeof v === 'number' || typeof v === 'boolean') return k === 'players' ? String(v) : v;
  if (Array.isArray(v) && k !== 'tags') v = v.filter((x) => typeof x === 'string').join(', ');
  if (k === 'tags') {
    const list = (Array.isArray(v) ? v : String(v ?? '').split(',')).map((t) => squish(String(t ?? '')).toLowerCase()).filter((t) => !NONE.test(t));
    return list.length ? [...new Set(list)].slice(0, 12) : undefined;
  }
  if (typeof v !== 'string') return undefined;
  const s = squish(v);
  if (NONE.test(s)) return undefined;
  if (k === 'type') return HUB_TYPES.find((t) => t.toLowerCase() === s.toLowerCase()) ?? s;
  if (k === 'genre') return HUB_GENRES.find((g) => g.toLowerCase() === s.toLowerCase()) ?? s;
  if (k === 'players') { const m = s.match(/^(\d+)\s*(?:-|–|—|to)\s*(\d+)$/i); return m ? `${m[1]}–${m[2]}` : s; }
  return s;
}

// The aiHub section, lowest first: what ai-hub would read from the game's <head> (its hub:* session fields, say), the
// agent's own answers under "aiHub" in its exit interview, then what the runner knows for sure: the model and effort
// the run used, its CLI (harness) and when it started (sourceDate, the date ai-hub sorts by). provenance is what
// ai-hub's import registry keeps for a game: where it came from, and the run's id.
export function hubFields(result, page = '', answers = null) {
  const hub = {}, put = (k, v) => { const x = hubValue(k, v); if (x !== undefined) hub[k] = x; };
  for (const [k, v] of Object.entries(headFields(String(page ?? '')))) put(k, v);
  const mine = answers?.aiHub;
  if (mine && typeof mine === 'object' && !Array.isArray(mine)) for (const [k, v] of Object.entries(mine)) if (/^\w+$/.test(k) && k !== 'provenance') put(k, v);
  // The type is one of the catalogue's three. Agents have written a genre there (hub:type "Platformer"): that becomes
  // the genre if there's none, and anything else is left out, so the type is Game.
  if (hub.type && !HUB_TYPES.includes(hub.type)) { const g = hubValue('genre', hub.type); if (HUB_GENRES.includes(g)) hub.genre ??= g; delete hub.type; }
  hub.type ??= 'Game';
  const effort = effortName(result.effort);
  Object.assign(hub, { model: displayModel(result.model), effort, harness: HARNESS[result.provider] ?? result.provider ?? null, sourceDate: result.startedAt ?? null });
  // The catalogue's own fields first, in one order for every game, then any others (the hub's session fields, say).
  const first = Object.fromEntries(HUB_ORDER.filter((k) => k in hub).map((k) => [k, hub[k]]));
  return { ...first, ...hub, provenance: { sourceKind: 'cc-matrix-run', artifactId: result.id, sourceDate: result.startedAt ?? null } };
}
const HUB_ORDER = ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags', 'model', 'effort', 'harness', 'sourceDate'];
// An effort as the catalogue writes it: high-uc → high-ultracode.
const effortName = (e) => String(e ?? '').replace(/-uc$/, '-ultracode') || null;

// ------------------------------------------------------------ the steps of a run in stages
// A later stage's game was made by every step of its chain: the plan it was built from, the build a content pass
// added to. A plan makes no game, so its figures would be in no record: a stage run's record has each step's, first
// to last (its own last), and them added up.
const STEP_SUMS = ['wallMinutes', 'inputTokens', 'outputTokens', 'cachedTokens', 'reasoningTokens', 'totalTokens', 'costUsd', 'apiCostUsd'];
export function stepOf(r) {
  return { id: r.id ?? null, stage: r.stage ?? null, model: r.model ?? null, modelName: displayModel(r.model), effort: effortName(r.effort),
    harness: HARNESS[r.provider] ?? r.provider ?? null, status: r.status ?? null, startedAt: r.startedAt ?? null, finishedAt: r.finishedAt ?? null,
    ...Object.fromEntries(STEP_SUMS.map((k) => [k, typeof r[k] === 'number' ? r[k] : null])) };
}
// earlier: the steps before this run (stepOf each), first first. complete is false when fewer steps were found than
// its chain has (an earlier run deleted since, say); a total is null when any step lacks that figure.
export function stagesOf(earlier, result) {
  const steps = [...earlier, stepOf(result)];
  const add = (k) => steps.some((s) => typeof s[k] !== 'number') ? null : Math.round(steps.reduce((n, s) => n + s[k], 0) * 1e6) / 1e6;
  return { steps, total: Object.fromEntries(STEP_SUMS.map((k) => [k, add(k)])), complete: steps.length >= (result.chain?.length ?? steps.length) };
}

// ------------------------------------------------------------ the record
// Every text in it written from ~ instead of the home folder (a reply or an error naming a file, say).
function scrubbed(value, home) {
  if (!home || home.length < 2) return value;
  const re = new RegExp(home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[\\\\/\\s"\'`),;:])', 'g');
  const walk = (v) => typeof v === 'string' ? v.replace(re, '~') : Array.isArray(v) ? v.map(walk)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;
  return walk(value);
}

// A run's record (schema 2). result: its result.json; page: the game (for what ai-hub reads from its head); prompt:
// { version, number, savedAt, firstRanAt, template, text, stageText?, goal, sections }; interview: { file, answers |
// error + text, reply }; earlier: for a stage run, the steps before it (stepOf each), first first.
export function makeRecord({ result, lab = null, cli = null, page = '', prompt = {}, interview = {}, earlier = [], home = os.homedir() }) {
  const res = Object.fromEntries(Object.entries(result).filter(([k, v]) => !PRIVATE.includes(k) && v !== undefined));
  return scrubbed({ schema: SCHEMA, tool: 'cc-matrix', stampedAt: new Date().toISOString(), id: result.id, lab, cli,
    aiHub: hubFields(result, page, interview.answers), ...(result.stage ? { stages: stagesOf(earlier, result) } : {}), result: res, prompt, interview }, home);
}

// A record in schema 2's shape. Schema 1 (games stamped before 2026-11-02) had result.json's fields at its top level
// beside lab, cli, variants, promptNumber, prompt (prompt.md), goal and reply: they move to where schema 2 has them.
export function upgrade(rec) {
  if (!rec || typeof rec !== 'object') return null;
  if (rec.schema === SCHEMA) return rec;
  if (rec.schema !== 1) return null;
  const { schema, tool, stampedAt, lab, cli, variants = {}, promptNumber = null, prompt = null, goal = null, reply = null, ...result } = rec;
  const sections = Object.fromEntries(Object.entries(variants).map(([d, v]) => [d, { id: v?.id ?? null, text: v?.text ?? null, hash: null }]));
  return { schema: SCHEMA, tool, stampedAt, id: result.id, lab, cli, aiHub: hubFields(result), result,
    prompt: { version: result.promptVersion ?? null, number: promptNumber, template: null, ...(result.stage ? { text: null, stageText: prompt } : { text: prompt }), goal, sections },
    interview: { file: null, reply }, upgradedFrom: 1 };
}

// A record (as written, either schema) with dimension d's variant renamed from one short name to another, where each
// schema keeps it (run-matrix.mjs --rename-variant).
export function renameInRecord(rec, d, from, to) {
  const res = rec.schema === 1 ? rec : rec.result, section = rec.schema === 1 ? rec.variants?.[d] : rec.prompt?.sections?.[d];
  if (res?.[d] === from) res[d] = to;
  if (section?.id === from) section.id = to;
  return rec;
}

// ------------------------------------------------------------ reading games
const HTML = /\.html?$/i, SKIP = new Set(['node_modules', '.git']);
// The .html files under these paths (files or folders, searched all the way down).
export function htmlFiles(paths) {
  const out = [];
  const walk = (p) => {
    let st; try { st = fs.statSync(p); } catch { return; }
    if (st.isFile()) { if (HTML.test(p)) out.push(p); return; }
    if (st.isDirectory()) for (const e of fs.readdirSync(p).sort()) if (!SKIP.has(e)) walk(path.join(p, e));
  };
  for (const p of paths) walk(path.resolve(p));
  return out;
}
// Each game's record ({ file, record }, in schema 2's shape), for the games under these paths that have one. A file
// over 64 MB isn't read (no game is that big; the record is at its end, but a whole read keeps this simple).
export function* records(paths) {
  for (const file of htmlFiles(paths)) {
    let html; try { if (fs.statSync(file).size > 64 * 2 ** 20) continue; html = fs.readFileSync(file, 'utf8'); } catch { continue; }
    if (!html.includes('id="cc-matrix-run"')) continue;
    const record = upgrade(readRecord(html));
    if (record?.id) yield { file, record };
  }
}

// --------------------------------------------------------------- rebuild
// A runs folder made from games alone: for each game with a record, the run's folder as the runner left it, as far as
// the dashboard reads it: result.json, prompt.md, goal.md, reply.md, the game in work/ (with TASK.md, STAGE.md and
// exit-interview.json where the run had them), and prompt-history.json's versions with their numbers. Not in a game,
// so not rebuilt: agent.out and agent.err (the CLI's output), dev files, scores and the session (so it can't resume).
// A folder already there is left as it is.
const safeId = (id) => typeof id === 'string' && /^[\w.-]+$/.test(id) && !id.startsWith('.');
const writeIf = (file, text) => { if (text != null) fs.writeFileSync(file, text); };
export function rebuild(paths, outDir, { log = () => {} } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const histFile = path.join(outDir, 'prompt-history.json');
  let history = []; try { history = JSON.parse(fs.readFileSync(histFile, 'utf8')); } catch {}
  const before = JSON.stringify(history), seen = new Set(), out = { made: [], skipped: [] };
  for (const { file, record: rec } of records(paths)) {
    const id = rec.id, dir = path.join(outDir, id);
    if (!safeId(id) || seen.has(id) || fs.existsSync(dir)) { out.skipped.push(id); log(`· ${id}: ${safeId(id) ? 'already there' : 'not a run id'} (${file})`); continue; }
    seen.add(id);
    const p = rec.prompt ?? {}, iv = rec.interview ?? {}, work = path.join(dir, 'work'), name = path.basename(rec.result?.entry ?? file);
    fs.mkdirSync(work, { recursive: true });
    fs.copyFileSync(file, path.join(work, name));
    fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ ...rec.result, id, entry: `${id}/work/${name}` }, null, 2));
    writeIf(path.join(dir, 'prompt.md'), p.stageText ?? p.text);
    writeIf(path.join(dir, 'goal.md'), p.goal ? p.goal + '\n' : null);
    writeIf(path.join(dir, 'reply.md'), iv.reply || null);
    if (p.goal || rec.result?.stage) writeIf(path.join(work, 'TASK.md'), p.text);
    if (p.goal && rec.result?.stage) writeIf(path.join(work, 'STAGE.md'), p.stageText);
    if (iv.file) writeIf(path.join(work, iv.file), iv.answers ? JSON.stringify(iv.answers, null, 2) + '\n' : iv.text);
    // The prompt's version, numbered as it was where the run was made unless that number is taken here already.
    const hash = rec.result?.promptVersion ?? p.version, ranAt = p.firstRanAt ?? rec.result?.startedAt ?? null;
    if (hash) {
      const e = history.find((x) => x.hash === hash);
      if (e) { if (ranAt && (!e.ranAt || ranAt < e.ranAt)) e.ranAt = ranAt; e.at ??= p.savedAt ?? null; e.text ??= p.template ?? null; }
      else {
        const v = p.number && !history.some((x) => x.v === p.number) ? p.number : history.reduce((m, x) => Math.max(m, x.v), 0) + 1;
        history.push({ v, hash, at: p.savedAt ?? null, ranAt, text: p.template ?? null });
      }
    }
    out.made.push(id); log(`+ ${id}`);
  }
  history.sort((a, b) => a.v - b.v);
  if (JSON.stringify(history) !== before) fs.writeFileSync(histFile, JSON.stringify(history, null, 2) + '\n');
  return out;
}

// ------------------------------------------------------------------ CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2), at = rest.indexOf('--out'), outDir = at >= 0 ? rest[at + 1] : null;
  const paths = at >= 0 ? rest.filter((a, i) => i !== at && i !== at + 1) : rest;
  if (cmd === 'export' && paths.length) {
    for (const { file, record } of records(paths)) process.stdout.write(JSON.stringify({ file, record }) + '\n');
  } else if (cmd === 'rebuild' && paths.length && outDir) {
    const r = rebuild(paths, path.resolve(outDir), { log: (l) => console.log(l) });
    console.log(`Rebuilt ${r.made.length} run(s) in ${path.resolve(outDir)}${r.skipped.length ? `; ${r.skipped.length} left out` : ''}. See them with: node dashboard.mjs --out ${outDir}`);
  } else {
    console.error('Usage:\n  node run-record.mjs export <games or folders…>\n  node run-record.mjs rebuild <games or folders…> --out <runs folder>');
    process.exit(1);
  }
}
