#!/usr/bin/env node
// dashboard.mjs — local web dashboard for the matrix runner.
//   node dashboard.mjs            then open http://localhost:4173
//   node dashboard.mjs --port 5000 --config matrix.config.json --out runs --open
// No dependencies; Node 18+. Works the same on Ubuntu, macOS and Windows (PowerShell).
// Listens on 127.0.0.1 only: it can launch agents with permissions bypassed. For the same reason it
// only answers its own page: see refused() for why other websites can't drive it.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const opts = { port: 4173, config: 'matrix.config.json', out: 'runs', open: false, allowHosts: [] };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--port') opts.port = +process.argv[++i];
  else if (a === '--config') opts.config = process.argv[++i];
  else if (a === '--out') opts.out = process.argv[++i];
  else if (a === '--open') opts.open = true;
  else if (a === '--allow-host') opts.allowHosts.push(...process.argv[++i].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}
const CONFIG = path.resolve(HERE, opts.config);
const OUT = path.resolve(HERE, opts.out);
const RUNNER = path.join(HERE, 'run-matrix.mjs');
const PAGE = path.join(HERE, 'dashboard.html');
const AUDIT = path.join(HERE, 'audit.json');
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- helpers
const readJSON = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };
const templatePath = () => path.resolve(path.dirname(CONFIG), readJSON(CONFIG, {}).templateFile || 'prompt-template.md');
// Same hash run-matrix.mjs saves with each run as promptVersion.
const promptVersion = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 8);

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const body = (req) => new Promise((resolve, reject) => {
  let s = ''; req.on('data', (c) => { s += c; if (s.length > 20e6) reject(new HttpError(413, 'too large')); });
  req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { reject(new HttpError(400, 'The request body isn\'t valid JSON.')); } });
  req.on('error', reject);
});

// Listening on 127.0.0.1 alone doesn't keep other websites out: a page open in any tab can POST
// here (a text/plain POST needs no CORS preflight), and a domain that resolves to 127.0.0.1
// (DNS rebinding) can read and write like this page does. Either could start agents with
// permissions off or point a CLI's command at anything. So: the Host must be this machine (or
// one passed with --allow-host), and a write must be JSON from this page's own origin.
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);
const hostOk = (host) => { const h = String(host ?? '').toLowerCase().replace(/:\d+$/, ''); return LOCAL.has(h) || opts.allowHosts.includes(h); };
function refused(req) {
  if (!hostOk(req.headers.host)) return 'Unknown host. Open the dashboard at http://localhost:' + opts.port;
  if (req.method === 'GET' || req.method === 'HEAD') return null;
  const site = req.headers['sec-fetch-site'], origin = req.headers.origin;
  if (site && site !== 'same-origin' && site !== 'none') return 'Cross-site request refused.';
  if (origin) { let o; try { o = new URL(origin).host; } catch {} if (o !== String(req.headers.host).toLowerCase()) return 'Cross-origin request refused.'; }
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) return 'Send JSON (Content-Type: application/json).';
  return null;
}

// ------------------------------------------------------------------- CLIs
// What the Setup tab shows per CLI: version, the models it offers (with the effort levels
// each takes) and the global instruction files it loads into every run. Checked in the
// background at start and cached until Re-check.
const HOME = os.homedir();
const EFFORT_ORDER = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
const byEffort = (a, b) => EFFORT_ORDER.indexOf(a) - EFFORT_ORDER.indexOf(b);

function runCmd(bin, args, ms = 30000) {
  return new Promise((resolve) => {
    let out = '', err = '', done = false;
    const finish = (code) => { if (!done) { done = true; clearTimeout(timer); resolve({ code, out, err }); } };
    const child = spawn(bin, args, { cwd: os.tmpdir(), shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { child.kill(); err += `\ntimed out after ${ms / 1000}s`; }, ms);
    child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { err += e.message; finish(null); });
    child.on('close', finish);
  });
}

const CLI_INFO = {
  claude: { instructions: ['.claude/CLAUDE.md'], suggested: true,
    models: async () => ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'].map((id) => ({ id })) },
  // JSON: { models: [{ slug, display_name, visibility, supported_reasoning_levels: [{ effort }] }] }
  codex: { instructions: ['.codex/AGENTS.md'],
    models: async (bin) => {
      const r = await runCmd(bin, ['debug', 'models']);
      if (r.code !== 0) throw new Error((r.err || r.out).trim().split('\n').pop() || 'codex debug models failed');
      return (JSON.parse(r.out).models ?? []).filter((m) => m.visibility === 'list').map((m) => ({ id: m.slug, label: m.display_name,
        efforts: (m.supported_reasoning_levels ?? []).map((l) => l.effort).sort(byEffort) }));
    } },
  // "  * grok-4.7 (default)" / "  - grok-4.6"
  grok: { instructions: ['.grok/AGENTS.md', '.claude/CLAUDE.md'],
    models: async (bin) => {
      const r = await runCmd(bin, ['models']);
      if (r.code !== 0) throw new Error((r.err || r.out).trim().split('\n').pop() || 'grok models failed');
      return [...r.out.matchAll(/^\s*([*-])\s+([\w.:-]+)(.*)$/gm)].map(([, mark, id, rest]) => ({ id, default: mark === '*' || /default/.test(rest) }));
    } },
  // "gemini-4-argon-high\tGemini 4 Argon (High)": the effort is part of the listed ID.
  agy: { instructions: ['.gemini/GEMINI.md', '.gemini/AGENTS.md'],
    models: async (bin) => {
      const r = await runCmd(bin, ['models']);
      if (r.code !== 0) throw new Error((r.err || r.out).trim().split('\n').pop() || 'agy models failed');
      const base = new Map();
      for (const [, id, label] of r.out.matchAll(/^(\S+)\t(.*)$/gm)) {
        const m = id.match(new RegExp(`^(.+)-(${EFFORT_ORDER.join('|')})$`));
        const key = m ? m[1] : id;
        if (!base.has(key)) base.set(key, { id: key, label: label.replace(/\s*\(.*\)$/, ''), efforts: [] });
        if (m) base.get(key).efforts.push(m[2]);
      }
      return [...base.values()].map((m) => ({ ...m, efforts: m.efforts.sort(byEffort) }));
    } },
  // Muse has no list command; it caches the provider's catalog here.
  muse: { instructions: ['.claude/CLAUDE.md', '.codex/AGENTS.md'],
    models: async () => {
      const dir = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local/share'), 'muse/model-catalog');
      const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => readJSON(path.join(dir, f), {}).rows ?? []);
      return rows.filter((r) => r.visibility === 'visible').map((r) => ({ id: r.model_id, default: !!r.is_default,
        efforts: (r.reasoning_effort_variants ?? []).map((v) => v.tier).sort(byEffort) }));
    } },
};

async function detectCli(p, bins) {
  const info = CLI_INFO[p] ?? {}, bin = bins[p] || p;
  const v = await runCmd(bin, ['--version']);
  const r = { id: p, bin, installed: v.code === 0, suggested: !!info.suggested,
    version: v.code === 0 ? (v.out.trim() || v.err.trim()).split('\n')[0] : null,
    error: v.code === 0 ? null : (v.err.trim() || `"${bin} --version" failed`).split('\n').pop(),
    instructions: (info.instructions ?? []).filter((f) => fs.existsSync(path.join(HOME, f))).map((f) => '~/' + f), models: [] };
  if (r.installed && info.models) {
    try { r.models = await info.models(bin); } catch (e) { r.modelsError = e.message; }
  }
  return r;
}

let cliCheck = null;
function checkClis(refresh) {
  if (refresh || !cliCheck) {
    const bins = readJSON(CONFIG, {}).bins ?? {};
    cliCheck = Promise.all(Object.keys(CLI_INFO).map((p) => detectCli(p, bins)))
      .then((list) => ({ checkedAt: new Date().toISOString(), clis: Object.fromEntries(list.map((c) => [c.id, c])) }));
  }
  return cliCheck;
}

// Update a CLI with its own `update` command (Muse's starts Muse instead, so it has none here).
// Never during a batch or a test, so a CLI can't change under a running agent.
const UPDATABLE = ['claude', 'codex', 'agy', 'grok'];
let updating = null;
async function updateCli(p) {
  if (!UPDATABLE.includes(p)) throw new Error(`No update command for ${p}`);
  if (runner) throw new Error('Wait for the batch to finish before updating a CLI.');
  if (Object.values(smokes).some((s) => s.running)) throw new Error('Wait for the tests to finish before updating a CLI.');
  if (updating) throw new Error(`${updating} is already updating.`);
  updating = p;
  try {
    const bin = readJSON(CONFIG, {}).bins?.[p] || p, r = await runCmd(bin, ['update'], 5 * 60000);
    return { ok: r.code === 0, output: `${r.out}\n${r.err}`.trim().slice(-3000), ...(await checkClis(true)) };
  } finally { updating = null; }
}

// ------------------------------------------------------------ smoke tests
// One tiny task per model+effort through the real runner (run-matrix.mjs --smoke).
// Finished results are kept in runs/.smoke.json so they survive a restart.
const SMOKE_FILE = path.join(OUT, '.smoke.json');
const smokes = readJSON(SMOKE_FILE, {});
let smokesRev = 1; // bumped on every change, so /api/status only sends the tests when they changed
function startSmoke(key, goal) {
  smokes[key] = { running: true, goal: !!goal, startedAt: new Date().toISOString() }; smokesRev++;
  const a = [RUNNER, '--config', CONFIG, '--out', OUT, '--smoke', key];
  if (goal) a.push('--smoke-goal');
  const child = spawn(process.execPath, a, { cwd: HERE });
  let out = '', err = '';
  child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { err += d; });
  child.on('close', () => {
    try { smokes[key] = JSON.parse(out.trim().split('\n').pop()); }
    catch { smokes[key] = { key, ok: false, goal: !!goal, at: new Date().toISOString(), error: (err || out || 'The test crashed').trim().slice(-2000) }; }
    smokesRev++;
    fs.writeFileSync(SMOKE_FILE, JSON.stringify(Object.fromEntries(Object.entries(smokes).filter(([, v]) => !v.running)), null, 2));
  });
}

// Turn the dashboard's selection into runner flags.
function selectionArgs(sel = {}) {
  const a = ['--config', CONFIG, '--out', OUT];
  if (sel.pick?.length) a.push('--pick', sel.pick.join(','));
  else a.push('--pick', '__none__'); // nothing ticked = nothing runs
  for (const [dim, ids] of Object.entries(sel.only ?? {})) a.push('--only', `${dim}=${ids.join(',')}`);
  if (sel.repeat > 1) a.push('--repeat', String(sel.repeat));
  if (sel.rerunFailed) a.push('--rerun-failed');
  if (sel.resumeFailed) a.push('--resume-failed');
  return a;
}

// ------------------------------------------------------------- run state
let runner = null;
// active: run id -> start time. state: what the runner last said about itself (its settings as they
// are now, spend, paused, runs left per CLI); see control() in run-matrix.mjs.
const run = { log: [], startedAt: null, finishedAt: null, exitCode: null, active: new Map(), finished: 0, planned: null, settings: null, state: null };
const stateWaiters = []; // /api/adjust calls waiting for the runner to answer
function logLine(line) {
  if (!line) return;
  if (line.startsWith('@state ')) {
    try { run.state = JSON.parse(line.slice(7)); } catch { return; }
    // Runs this batch will do, now that limits, Retry failed or a skipped CLI can change it mid-batch.
    run.planned = run.finished + run.active.size + Object.values(run.state.left ?? {}).reduce((a, b) => a + b, 0);
    stateWaiters.splice(0).forEach((w) => w(run.state));
    return;
  }
  run.log.push(line);
  if (run.log.length > 3000) run.log.splice(0, run.log.length - 3000);
  // ▶ started · ✔ ✘ finished · ■ stopped (discarded) · ↺ ended to start over later
  const m = line.match(/^(▶|✔|✘|■|↺) (\S+)/);
  if (m) { if (m[1] === '▶') run.active.set(m[2], new Date().toISOString()); else { run.active.delete(m[2]); if (m[1] === '✔' || m[1] === '✘') run.finished++; } }
  else { const p = line.match(/^(\d+) runs(?: \((\d+) already done\))? → /); if (p) run.planned = p[1] - (p[2] ?? 0); } // runs this batch will do
}

// A change to the running batch from the page, checked before it goes to the runner. Empty (or 0)
// perCli, budget or timeout = none; requeue and drop name runs that are running.
function adjustment(b) {
  b = b && typeof b === 'object' ? b : {};
  const s = b.set && typeof b.set === 'object' ? b.set : {}, set = {};
  const num = (k, min) => {
    if (s[k] === '' || s[k] == null) return null;
    const n = +s[k];
    if (!Number.isFinite(n) || n < min) throw new HttpError(400, `${k} must be a number, at least ${min}.`);
    return n;
  };
  if ('concurrency' in s) { const n = num('concurrency', 1); if (n == null) throw new HttpError(400, 'concurrency must be a number, at least 1.'); set.concurrency = Math.floor(n); }
  if ('perCli' in s) { const n = num('perCli', 0); set.perCli = n >= 1 ? Math.floor(n) : null; }
  if ('budget' in s) set.budget = num('budget', 0) || null;
  if ('timeout' in s) set.timeout = num('timeout', 0) || null;
  for (const k of ['rerunFailed', 'resumeFailed', 'paused']) if (k in s) set[k] = !!s[k];
  const ids = (x) => (Array.isArray(x) ? x : []).filter((id) => typeof id === 'string' && run.active.has(id));
  return { set, timeoutRunning: !!b.timeoutRunning, requeue: ids(b.requeue), drop: ids(b.drop),
    skipCli: (Array.isArray(b.skipCli) ? b.skipCli : []).filter((p) => typeof p === 'string' && /^\w+$/.test(p)) };
}
// Hands the change to the runner (a line on its stdin) and answers with its state once it has applied it.
function adjustRun(msg) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(run.state), 5000);
    stateWaiters.push((st) => { clearTimeout(t); resolve(st); });
    runner.stdin.write(JSON.stringify(msg) + '\n');
  });
}

function startRun(s) {
  const a = [RUNNER, ...selectionArgs(s), '-j', String(Math.max(1, +s.concurrency || 1)), '--control'];
  if (+s.perCli > 0) a.push('--per-cli', String(+s.perCli));
  if (+s.budget > 0) a.push('--budget', String(+s.budget));
  if (+s.timeout > 0) a.push('--timeout', String(+s.timeout));
  Object.assign(run, { log: [], startedAt: new Date().toISOString(), finishedAt: null, exitCode: null,
    active: new Map(), finished: 0, planned: null, settings: s, state: null });
  runner = spawn(process.execPath, a, { cwd: HERE });
  runner.stdin.on('error', () => {}); // the runner may have just exited
  let buf = '';
  const onData = (d) => { buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop(); lines.forEach(logLine); };
  runner.stdout.on('data', onData); runner.stderr.on('data', onData);
  runner.on('close', (code) => { logLine(buf); buf = ''; run.exitCode = code; run.finishedAt = new Date().toISOString();
    run.active.clear(); runner = null; stateWaiters.splice(0).forEach((w) => w(run.state)); });
}

// ------------------------------------------------------------------ results
// Whether a run used different text for one of its variants than the config has now (the variant was
// edited after it ran, so its label is out of date). Runs record a hash of each variant's text
// (variantHashes), so that's exact; for older runs, check whether the saved prompt (prompt.md, or
// goal.md for the goal) still contains the current text.
const textHash = (t) => crypto.createHash('sha1').update(t).digest('hex').slice(0, 8); // same as run-matrix.mjs
const variantText = (v) => { try { return v.text ?? (v.file ? fs.readFileSync(path.resolve(path.dirname(CONFIG), v.file), 'utf8') : ''); } catch { return ''; } };
const sentCache = new Map(); // file -> { mtime, text }; a rerun rewrites the file
const sentText = (file) => {
  try {
    const mtime = fs.statSync(file).mtimeMs, c = sentCache.get(file);
    if (c?.mtime === mtime) return c.text;
    const text = fs.readFileSync(file, 'utf8'); sentCache.set(file, { mtime, text }); return text;
  } catch { return null; }
};
function changedVariants(dir, r, dims, tmpl) {
  const out = [];
  for (const [d, vs] of Object.entries(dims)) {
    const v = vs.find((x) => x.id === r[d]);
    if (!v) continue; // a variant no longer in the config can't be out of date
    const text = variantText(v).trim(), isGoal = d === 'goal';
    if (isGoal ? r.goalSkipped : !tmpl.includes(`{{${d}}}`)) continue; // its text wasn't sent
    if (r.variantHashes?.[d] != null) { if (r.variantHashes[d] !== textHash(text)) out.push(d); continue; }
    if (!text) continue;
    const sent = sentText(path.join(dir, isGoal ? 'goal.md' : 'prompt.md'));
    if (sent != null && !sent.replace(/\s+/g, ' ').includes(text.replace(/\s+/g, ' '))) out.push(d);
  }
  return out;
}

// A review (score, notes, "looked at") belongs to one attempt at a run: it's saved with the run's
// startedAt, so a re-run (Retry failed, or after ✕) starts unreviewed instead of inheriting it.
// Reviews saved before that have no startedAt and still apply.
const SCORES = path.join(OUT, 'scores.json');
const reviewOf = (scores, r) => { const s = scores[r.id]; if (!s || (s.startedAt && s.startedAt !== r.startedAt)) return {};
  const { startedAt, ...rest } = s; return rest; };

// Whether Resume failed would carry on with this failed run's session instead of starting it over, as
// canResume() in run-matrix.mjs decides before any time limit: a Claude Code run that got partway, in the
// folder it ran in, whose session is still on disk (claudeTranscript is the same as there).
function resumable(dir, r) {
  return r.status !== 'ok' && r.provider === 'claude' && !!r.sessionId && r.outputTokens > 0 && path.basename(dir) === r.id
    && !!claudeTranscript(r.sessionId, path.join(dir, 'work'));
}
function claudeTranscript(sessionId, cwd) {
  const root = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude'), 'projects'), file = `${sessionId}.jsonl`;
  const own = path.join(root, cwd.replace(/[^a-zA-Z0-9]/g, '-'), file);
  if (fs.existsSync(own)) return own;
  try { for (const d of fs.readdirSync(root)) if (fs.existsSync(path.join(root, d, file))) return path.join(root, d, file); } catch {}
  return null;
}

function results() {
  const scores = readJSON(SCORES, {});
  const dims = readJSON(CONFIG, {}).dimensions ?? {};
  let tmpl = ''; try { tmpl = fs.readFileSync(templatePath(), 'utf8'); } catch {}
  const rows = [];
  for (const d of fs.readdirSync(OUT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(OUT, d.name), r = readJSON(path.join(dir, 'result.json'), null);
    if (!r?.id) continue;
    r.hasReply = fs.existsSync(path.join(dir, 'reply.md'));
    if (resumable(dir, r)) r.resumable = true;
    const changed = changedVariants(dir, r, dims, tmpl);
    if (changed.length) r.changed = changed;
    // A run from before a dimension was added counts as its olderRuns variant (else its first), as in
    // run-matrix.mjs, so it shows, filters and compares as that. predates lists those dimensions.
    for (const [dim, vs] of Object.entries(dims)) {
      const v = vs.find((x) => x.olderRuns) ?? vs[0];
      if (r[dim] == null && v) { r[dim] = v.id; (r.predates ??= []).push(dim); }
    }
    rows.push({ ...r, ...reviewOf(scores, r) });
  }
  return rows;
}

// Cheap signatures of what the page shows, so it can react to any change, wherever it came from:
// a run finishing (also from `node run-matrix.mjs` in a terminal), a score saved in another tab,
// a hand edit to the config or prompt. The page compares them on every status poll.
const stamp = (f) => { try { const s = fs.statSync(f); return `${Math.round(s.mtimeMs)}.${s.size}`; } catch { return '-'; } };
let revCache = null;
function revs(fresh) {
  if (!fresh && revCache && Date.now() - revCache.at < 900) return revCache.value;
  const h = crypto.createHash('sha1');
  try {
    for (const d of fs.readdirSync(OUT, { withFileTypes: true })) if (d.isDirectory())
      h.update(`${d.name}|${stamp(path.join(OUT, d.name, 'result.json'))}|${stamp(path.join(OUT, d.name, 'reply.md'))}\n`);
  } catch {}
  h.update(stamp(SCORES));
  const value = { results: h.digest('hex').slice(0, 12), config: stamp(CONFIG), template: stamp(templatePath()), history: stamp(HISTORY), smokes: smokesRev };
  revCache = { at: Date.now(), value };
  return value;
}

// The prompt's numbered versions (v1, v2 …), written by run-matrix.mjs when a batch first runs one, so
// edits between batches make one version. Until then the prompt as saved is the next one (savedAt).
const HISTORY = path.join(OUT, 'prompt-history.json');
const savedAt = () => { try { return fs.statSync(templatePath()).mtime.toISOString(); } catch { return null; } };

let reportTimer = null;
const refreshReport = () => { clearTimeout(reportTimer); reportTimer = setTimeout(() =>
  spawn(process.execPath, [RUNNER, '--config', CONFIG, '--out', OUT, '--report'], { cwd: HERE, stdio: 'ignore' }), 1000); };

// ------------------------------------------------------------------ static
const TYPES = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.cjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.out': 'text/plain; charset=utf-8', '.err': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.ktx2': 'image/ktx2', '.hdr': 'image/vnd.radiance',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.wgsl': 'text/plain; charset=utf-8', '.glsl': 'text/plain; charset=utf-8' };

// Games, their assets and run files. Streamed, so a long agent.out doesn't sit in memory.
function serveRunFile(req, res, rel) {
  let file; try { file = path.resolve(OUT, decodeURIComponent(rel)); } catch { return send(res, 400, 'Bad path', 'text/plain'); }
  let st; try { st = fs.statSync(file); } catch {}
  if (!file.startsWith(OUT + path.sep) || !st?.isFile()) return send(res, 404, 'Not found', 'text/plain');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

// A run's folder: a direct child of the runs folder with a result.json (never scores.json and the like).
function runDir(id) {
  if (typeof id !== 'string' || !/^[\w.-]+$/.test(id) || id.startsWith('.')) return null;
  const dir = path.join(OUT, id);
  return path.dirname(dir) === OUT && fs.existsSync(path.join(dir, 'result.json')) ? dir : null;
}

// ------------------------------------------------------------------ routes
const server = http.createServer(async (req, res) => {
  try {
    const why = refused(req);
    if (why) return send(res, 403, { error: why });
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname, m = req.method === 'HEAD' ? 'GET' : req.method;

    if (p === '/' && m === 'GET') return send(res, 200, fs.readFileSync(PAGE), 'text/html; charset=utf-8');
    if (p.startsWith('/runs/') && m === 'GET') return serveRunFile(req, res, p.slice(6));
    if (p === '/api/audit' && m === 'GET') return send(res, 200, readJSON(AUDIT, null));

    // canResume: this server takes Resume failed (a page newer than its server hides it).
    if (p === '/api/config' && m === 'GET') return send(res, 200, { config: readJSON(CONFIG, null), path: CONFIG, outDir: OUT, platform: process.platform, rev: revs(true), canResume: true });
    if (p === '/api/config' && m === 'PUT') {
      const c = await body(req);
      if (!c || typeof c !== 'object' || Array.isArray(c)) return send(res, 400, { error: 'Expected the config object.' });
      fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2) + '\n'); refreshReport();
      return send(res, 200, { ok: true, rev: revs(true) });
    }
    if (p === '/api/template' && m === 'GET') {
      const text = fs.existsSync(templatePath()) ? fs.readFileSync(templatePath(), 'utf8') : '';
      return send(res, 200, { text, path: templatePath(), version: promptVersion(text), savedAt: savedAt(), history: readJSON(HISTORY, []) });
    }
    if (p === '/api/template' && m === 'PUT') {
      const { text } = await body(req);
      if (typeof text !== 'string') return send(res, 400, { error: 'Expected { text }.' });
      fs.writeFileSync(templatePath(), text);
      return send(res, 200, { ok: true, version: promptVersion(text), savedAt: savedAt(), rev: revs(true) });
    }

    if (p === '/api/preview' && m === 'POST') {
      const s = await body(req);
      const r = spawnSync(process.execPath, [RUNNER, ...selectionArgs(s), '--dry-run', '--json'], { cwd: HERE, encoding: 'utf8', maxBuffer: 50e6 });
      if (r.status !== 0) return send(res, 400, { error: (r.stderr || r.stdout || 'preview failed').trim() });
      return send(res, 200, JSON.parse(r.stdout.trim().split('\n').pop()));
    }

    if (p === '/api/run' && m === 'POST') {
      if (runner) return send(res, 409, { error: 'A batch is already running.' });
      if (updating) return send(res, 409, { error: `${updating} is updating; start when it's done.` });
      startRun(await body(req));
      return send(res, 200, { ok: true });
    }
    if (p === '/api/adjust' && m === 'POST') {
      const msg = adjustment(await body(req));
      if (!runner) return send(res, 409, { error: 'No batch is running.' });
      return send(res, 200, { ok: true, state: await adjustRun(msg) });
    }
    if (p === '/api/stop' && m === 'POST') {
      if (runner) fs.writeFileSync(path.join(OUT, '.stop'), new Date().toISOString());
      return send(res, 200, { ok: true });
    }
    if (p === '/api/status' && m === 'GET') {
      const since = +(url.searchParams.get('since') ?? 0), known = url.searchParams.get('smokes');
      return send(res, 200, { running: !!runner, stopping: fs.existsSync(path.join(OUT, '.stop')),
        startedAt: run.startedAt, finishedAt: run.finishedAt, exitCode: run.exitCode, active: [...run.active.keys()],
        activeSince: Object.fromEntries(run.active), finished: run.finished, planned: run.planned, settings: run.settings, state: run.state, logTotal: run.log.length,
        log: run.log.slice(Math.max(0, Math.min(since, run.log.length))), updating, rev: revs(),
        ...(known === String(smokesRev) ? {} : { smokes }) }); // the tests only when they changed
    }

    if (p === '/api/clis' && m === 'GET') return send(res, 200, await checkClis(url.searchParams.has('refresh')));
    if (p === '/api/update-cli' && m === 'POST') return send(res, 200, await updateCli((await body(req)).provider));
    if (p === '/api/smoke' && m === 'POST') {
      const { tests = [] } = await body(req); // [{ key: 'agent:effort', goal }]
      if (updating) return send(res, 409, { error: `${updating} is updating; test when it's done.` });
      for (const t of tests) if (!smokes[t.key]?.running) startSmoke(t.key, t.goal);
      return send(res, 200, { ok: true });
    }

    if (p === '/api/results' && m === 'GET') return send(res, 200, results());
    if (p === '/api/score' && m === 'PUT') {
      const { id, score, notes, seen, startedAt } = await body(req);
      if (!runDir(id)) return send(res, 400, { error: 'No such run.' });
      const all = readJSON(SCORES, {}), n = score === '' || score == null ? null : +score;
      if (n != null && !(n >= 0 && n <= 10)) return send(res, 400, { error: 'A score is a number from 0 to 10.' });
      all[id] = { score: n, notes: notes ?? '', ...(seen ? { seen: true } : {}), ...(startedAt ? { startedAt } : {}) };
      if (all[id].score == null && !all[id].notes && !all[id].seen) delete all[id];
      fs.writeFileSync(SCORES, JSON.stringify(all, null, 2)); refreshReport();
      return send(res, 200, { ok: true, rev: revs(true) });
    }
    if (p === '/api/delete-run' && m === 'POST') {
      const { id } = await body(req), dir = runDir(id);
      if (!dir || run.active.has(id)) return send(res, 400, { error: 'Cannot delete that run.' });
      fs.rmSync(dir, { recursive: true, force: true });
      const all = readJSON(SCORES, {}); // its review was of the game just deleted
      if (all[id]) { delete all[id]; fs.writeFileSync(SCORES, JSON.stringify(all, null, 2)); }
      refreshReport();
      return send(res, 200, { ok: true, rev: revs(true) });
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) { if (!res.headersSent) send(res, e instanceof HttpError ? e.code : 500, { error: e.message }); else res.destroy(); }
});

server.on('error', (e) => {
  if (e.code !== 'EADDRINUSE') throw e;
  console.error(`Port ${opts.port} is already in use: the dashboard may be running already (open http://localhost:${opts.port}),\nor start this one on another port: node dashboard.mjs --port ${opts.port + 1}`);
  process.exit(1);
});
server.listen(opts.port, '127.0.0.1', () => {
  checkClis(); // warm the cache so the Setup tab has it on first load
  const link = `http://localhost:${opts.port}`;
  console.log(`Matrix dashboard: ${link}\nConfig: ${CONFIG}\nRuns:   ${OUT}\nCtrl-C to quit (a running batch keeps its finished results).`);
  if (opts.allowHosts.length) console.log(`Also answering as ${opts.allowHosts.join(', ')}: anyone who can reach that address can start agents.`);
  if (opts.open) {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', link]]
      : process.platform === 'darwin' ? ['open', [link]] : ['xdg-open', [link]];
    spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
});

// Quitting the dashboard stops a running batch cleanly too. That ends its running agents and throws their
// work away, so with agents running Ctrl-C asks to be pressed again (the runner leaves Ctrl-C to us).
let ctrlCAt = 0;
const quit = (sig) => {
  if (!runner) process.exit(0);
  if (sig === 'SIGINT' && run.active.size && Date.now() - ctrlCAt > 5000) {
    ctrlCAt = Date.now();
    console.log(`\nA batch is running with ${run.active.size} agent(s) going: quitting ends them and throws away what they've done so far.\n`
      + 'Press Ctrl-C again within 5 seconds to quit anyway, or Pause the batch in the dashboard to let them finish first.');
    return;
  }
  fs.writeFileSync(path.join(OUT, '.stop'), 'quit'); runner.on('close', () => process.exit(0)); setTimeout(() => process.exit(0), 15000);
};
process.on('SIGINT', () => quit('SIGINT')); process.on('SIGTERM', () => quit('SIGTERM'));
