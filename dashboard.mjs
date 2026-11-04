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

// Restart (on the page) starts the dashboard again, so it runs its code as it is now. For that, `node dashboard.mjs`
// keeps the dashboard itself in a child process and starts it again whenever it exits with RESTART_CODE; any other
// exit ends this one too. Ctrl-C and SIGTERM are passed on to it: in a process group of its own it doesn't get the
// terminal's Ctrl-C itself (on Windows every process in the console gets Ctrl-C, so only SIGTERM is passed on there).
// The terminal closing (SIGHUP) quits it the way SIGTERM does.
const RESTART_CODE = 75;
if (!process.env.MATRIX_DASHBOARD_CHILD) {
  const win = process.platform === 'win32';
  let child = null;
  const start = (again) => {
    child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', detached: !win,
      env: { ...process.env, MATRIX_DASHBOARD_CHILD: '1', ...(again ? { MATRIX_DASHBOARD_RESTARTED: '1' } : {}) } });
    child.on('exit', (code, sig) => code === RESTART_CODE ? start(true) : process.exit(code ?? (sig ? 1 : 0)));
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { if (!win || sig !== 'SIGINT') child?.kill(sig === 'SIGHUP' ? 'SIGTERM' : sig); });
  start(false);
  await new Promise(() => {}); // the rest of this file is the child's
}
for (const s of [process.stdout, process.stderr]) s.on('error', () => {}); // the terminal closed: what's printed goes nowhere

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
// This start of the dashboard: the page reloads itself when it changes (Restart), to get the page as it is now too.
const BOOT = crypto.randomUUID();

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
  claude: { instructions: ['.claude/CLAUDE.md'], isolatedSkips: ['.claude/CLAUDE.md'], suggested: true,
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
  grok: { instructions: ['.grok/AGENTS.md', '.claude/CLAUDE.md'], isolatedSkips: ['.claude/CLAUDE.md'],
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
  muse: { instructions: ['.claude/CLAUDE.md', '.codex/AGENTS.md'], isolatedSkips: ['.claude/CLAUDE.md', '.codex/AGENTS.md'],
    models: async () => {
      const dir = path.join(process.env.XDG_DATA_HOME || path.join(HOME, '.local/share'), 'muse/model-catalog');
      const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => readJSON(path.join(dir, f), {}).rows ?? []);
      return rows.filter((r) => r.visibility === 'visible').map((r) => ({ id: r.model_id, default: !!r.is_default,
        efforts: (r.reasoning_effort_variants ?? []).map((v) => v.tier).sort(byEffort) }));
    } },
};

// isolate: runs are isolated (the config's isolate, run-matrix.mjs), so the files in isolatedSkips aren't loaded:
// they're listed apart (skipped) instead.
async function detectCli(p, bins, isolate = true) {
  const info = CLI_INFO[p] ?? {}, bin = bins[p] || p;
  const files = (info.instructions ?? []).filter((f) => fs.existsSync(path.join(HOME, f))), skips = isolate ? info.isolatedSkips ?? [] : [];
  const v = await runCmd(bin, ['--version']);
  const r = { id: p, bin, installed: v.code === 0, suggested: !!info.suggested,
    version: v.code === 0 ? (v.out.trim() || v.err.trim()).split('\n')[0] : null,
    error: v.code === 0 ? null : (v.err.trim() || `"${bin} --version" failed`).split('\n').pop(),
    instructions: files.filter((f) => !skips.includes(f)).map((f) => '~/' + f), skipped: files.filter((f) => skips.includes(f)).map((f) => '~/' + f), models: [] };
  if (r.installed && info.models) {
    try { r.models = await info.models(bin); } catch (e) { r.modelsError = e.message; }
  }
  return r;
}

let cliCheck = null;
function checkClis(refresh) {
  if (refresh || !cliCheck) {
    const conf = readJSON(CONFIG, {}), bins = conf.bins ?? {};
    cliCheck = Promise.all(Object.keys(CLI_INFO).map((p) => detectCli(p, bins, conf.isolate !== false)))
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
  if (running()) throw new Error('Wait for the batch to finish before updating a CLI.');
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

// Turn the dashboard's selection into runner flags. sel.stages ({ stage: ['agent:effort', …] }) runs in stages
// (see stageRuns in run-matrix.mjs) instead of sel.pick. A batch runs from its own copy of the config (see snapshot).
const PICK = /^[\w.-]+:[\w.+-]+$/;
function selectionArgs(sel = {}, config = CONFIG) {
  const a = ['--config', config, '--out', OUT];
  const stages = sel.stages && typeof sel.stages === 'object' ? Object.entries(sel.stages)
    .map(([st, picks]) => [st, (Array.isArray(picks) ? picks : []).filter((p) => typeof p === 'string' && PICK.test(p))])
    .filter(([st, picks]) => /^\w+$/.test(st) && picks.length) : [];
  if (stages.length) for (const [st, picks] of stages) a.push('--stage', `${st}=${picks.join(',')}`);
  else if (!sel.stages && sel.pick?.length) a.push('--pick', sel.pick.join(','));
  else a.push('--pick', '__none__'); // nothing ticked (or picked for a stage) = nothing runs
  for (const [dim, ids] of Object.entries(sel.only ?? {})) a.push('--only', `${dim}=${ids.join(',')}`);
  if (sel.repeat > 1) a.push('--repeat', String(sel.repeat));
  if (sel.rerunFailed) a.push('--rerun-failed');
  if (sel.resumeFailed) a.push('--resume-failed');
  return a;
}

// ------------------------------------------------------------- run state
// The batches running now: Start begins one, Queue adds more while it runs. Each is its own runner
// (run-matrix.mjs --broker) working from a copy of the config and prompt as they were when it was started or
// queued (see snapshot), so editing Setup for the next batch never changes one that's going. They share Parallel
// runs, Max per CLI, the budget, the start gap and Pause, which this server keeps for all of them: a run starts
// only when schedule() grants it. Batches go in the order they were queued, and a later one only gets the slots
// the ones before it can't use: their running runs, and every run they still have to start (a build waiting
// hours for its plan, say), keep theirs. So a batch queued later never holds up an earlier one, and one with
// nothing to wait for ramps up at once in whatever slots are left.
const STOP = path.join(OUT, '.stop');
const batches = [], waiting = []; // this session's batches in order; queued ones not started yet (see startWaiting)
const live = () => batches.filter((b) => b.child);
const running = () => live().length > 0 || waiting.length > 0;
// The session: its log, when it started and ended, what Start sent, and the limits all its batches share. spentBefore:
// what it spent before the dashboard was restarted (see resumeSession); suspended: why it's being kept (see suspend).
const run = { log: [], startedAt: null, finishedAt: null, exitCode: null, settings: null, limits: null, overBudget: false, stopping: false, gapMs: 0,
  spentBefore: 0, suspended: null };
const total = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
const usd = (v) => `$${(v ?? 0).toFixed(2)}`;
const none = (v, unit = '') => v === Infinity || !v ? 'none' : `${unit}${v}`;
const activeRuns = () => new Map(batches.flatMap((b) => [...b.active]));
const spentNow = () => run.spentBefore + batches.reduce((n, b) => n + (b.state?.spent ?? 0), 0);
const note = (line) => { run.log.push(line); if (run.log.length > 3000) run.log.splice(0, run.log.length - 3000); };
const tellBatch = (b, msg) => { if (b.child) b.child.stdin.write(JSON.stringify(msg) + '\n'); };
// What the page shows for the running batches together: the shared limits, spend and the runs left per CLI.
function sessionState() {
  const l = run.limits ?? {}, left = {};
  for (const b of live()) for (const [p, n] of Object.entries(b.state?.left ?? {})) left[p] = (left[p] ?? 0) + n;
  return { concurrency: l.concurrency ?? null, perCli: l.perCli === Infinity ? null : l.perCli ?? null, budget: l.budget === Infinity ? null : l.budget ?? null,
    timeout: l.timeout || null, rerunFailed: !!l.rerunFailed, resumeFailed: !!l.resumeFailed, paused: !!l.paused, overBudget: run.overBudget, spent: spentNow(), left };
}
const shortPicks = (ps) => { const l = (ps ?? []).map((p) => String(p).replace(':', ' · ')); return l.length > 4 ? `${l.slice(0, 3).join(', ')} +${l.length - 3} more` : l.join(', '); };
const describe = (sel) => sel.stages && typeof sel.stages === 'object'
  ? `in stages: ${Object.entries(sel.stages).filter(([, ps]) => ps?.length).map(([st, ps]) => `${st} ${shortPicks(ps)}`).join(' → ') || 'nothing picked'}`
  : `1-shot: ${shortPicks(sel.pick) || 'nothing picked'}`;
const batchList = () => [
  ...batches.map((b) => ({ n: b.n, what: describe(b.sel), stages: !!b.sel.stages, startedAt: b.startedAt, finishedAt: b.finishedAt, running: !!b.child,
    ended: b.ended, active: b.active.size, finished: b.finished, planned: b.planned, left: total(b.state?.left) })),
  ...waiting.map((w) => ({ n: w.n, what: describe(w.sel), stages: !!w.sel.stages, queuedAt: w.queuedAt, waiting: true }))];

// A line from batch b's runner: "@…" lines are for this server (its state, and the runs it offers, takes and
// finishes; see brokered in run-matrix.mjs), the rest go to the log.
function logLine(b, line) {
  if (!line) return;
  if (line[0] === '@') return brokerLine(b, line);
  note(line);
  // ▶ started · ✔ ✘ finished · ■ stopped (discarded) · ↺ ended to start over later
  const m = line.match(/^(▶|✔|✘|■|↺) (\S+)/);
  if (m) {
    if (m[1] === '▶') b.active.set(m[2], new Date().toISOString());
    else { b.active.delete(m[2]); if (m[1] === '✔' || m[1] === '✘') { b.finished++; refreshReport(); saveSession(); } }
    restartIfIdle();
  } else { const p = line.match(/^(\d+) runs(?: \((\d+) already done\))? → /); if (p) b.planned = b.finished + (+p[1]) - (+p[2] || 0); } // runs this batch will do
}
function brokerLine(b, line) {
  const at = line.indexOf(' '), tag = line.slice(1, at < 0 ? undefined : at);
  let v; try { v = JSON.parse(line.slice(at + 1)); } catch { return; } // a line cut short
  if (tag === 'state') {
    b.state = v;
    // Runs this batch will do, now that Retry failed, a skipped CLI or a run ended can change it mid-batch.
    b.planned = b.finished + b.active.size + total(v.left);
    b.waiters.splice(0).forEach((w) => w());
  } else if (tag === 'ready') b.ready = v;
  else if (tag === 'keys') { b.keys = new Set(v.keys); b.state ??= { left: v.left, spent: 0 }; startWaiting(); }
  else if (tag === 'took') { const p = b.granted.get(v); b.granted.delete(v); if (p) b.taken.set(v, p); }
  else if (tag === 'unused') b.granted.delete(v);
  else if (tag === 'freed') b.taken.delete(v);
  else if (tag === 'done' || tag === 'gone') {
    const key = tag === 'done' ? v.key : v;
    b.keys?.delete(key);
    // A batch beside it may be waiting on this run (a build on its plan): it carries on, or leaves that out.
    for (const o of live()) if (o !== b) tellBatch(o, tag === 'done' ? { finished: [v] } : { gone: [key] });
  }
  schedule();
}

// Grants runs while there's room, one per start gap (the config's startGap, default 3 s, so no two runs anywhere
// start in the same second: that names their folders and games). Batches go in order: one's runs that can start
// now come before the next one's, and what an earlier batch still has to start keeps its slots (see run state).
let grantTimer = null, lastGrant = -Infinity;
function schedule() {
  clearTimeout(grantTimer); grantTimer = null;
  const L = run.limits;
  if (!L || !live().length) return;
  const inUse = batches.reduce((n, b) => n + b.taken.size + b.granted.size, 0);
  if (!run.overBudget && spentNow() >= L.budget) {
    run.overBudget = true;
    note(`■ Budget of $${L.budget} reached (spent ${usd(spentNow())}): no new runs start; ${activeRuns().size} still running will finish.`);
  }
  // Once nothing runs any more the batches end (till then a raised budget can still start more).
  if (run.overBudget && !inUse) for (const b of live()) if (!b.ended) { b.ended = true; tellBatch(b, { end: true }); }
  if (run.stopping || L.paused || run.overBudget || restartPending) return;
  for (;;) {
    const wait = lastGrant + run.gapMs - Date.now();
    if (wait > 0) { grantTimer = setTimeout(schedule, wait); return; }
    const g = nextGrant();
    if (!g) return;
    const [b, key, p] = g;
    b.granted.set(key, p); lastGrant = Date.now();
    tellBatch(b, { grant: [key] });
  }
}
// The next run to start: the first one offered, batch by batch, that fits under Parallel runs and its CLI's Max per
// CLI once the slots held for earlier batches are counted. A batch holds one for each run it still has to start
// (waiting for its plan or not), up to what its CLIs can run at once; the ones it's running count as in use.
function nextGrant() {
  const L = run.limits, use = {}, heldCli = {};
  let used = 0, held = 0;
  for (const b of batches) for (const m of [b.taken, b.granted]) for (const p of m.values()) { use[p] = (use[p] ?? 0) + 1; used++; }
  for (const b of live()) {
    if (b.ended) continue;
    for (const [key, p] of b.ready) {
      if (used + held >= L.concurrency) return null;
      if (b.granted.has(key) || b.taken.has(key) || (use[p] ?? 0) + (heldCli[p] ?? 0) >= L.perCli) continue;
      return [b, key, p];
    }
    const mine = {}, asked = {};
    for (const p of b.taken.values()) mine[p] = (mine[p] ?? 0) + 1;
    for (const p of b.granted.values()) { mine[p] = (mine[p] ?? 0) + 1; asked[p] = (asked[p] ?? 0) + 1; }
    for (const [p, n] of Object.entries(b.state?.left ?? {})) {
      const k = Math.max(0, Math.min(n - (asked[p] ?? 0), L.perCli - (mine[p] ?? 0)));
      heldCli[p] = (heldCli[p] ?? 0) + k; held += k;
    }
  }
  return null;
}

// A change to the running batches from the page, checked first. Empty (or 0) perCli, budget or timeout = none;
// requeue and drop name runs that are running; endBatch leaves the rest of one batch out (it runs next time).
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
  const act = activeRuns(), ids = (x) => (Array.isArray(x) ? x : []).filter((id) => typeof id === 'string' && act.has(id));
  return { set, timeoutRunning: !!b.timeoutRunning, requeue: ids(b.requeue), drop: ids(b.drop),
    skipCli: (Array.isArray(b.skipCli) ? b.skipCli : []).filter((p) => typeof p === 'string' && /^\w+$/.test(p)),
    endBatch: Number.isInteger(b.endBatch) ? b.endBatch : null };
}
// Parallel runs, Max per CLI, the budget and Pause are this server's (see schedule); the time limit, Retry and Resume
// failed, runs to end, CLIs to skip and a batch to end go to the runners. Answers once each has applied its part.
async function adjustRun(msg) {
  const L = run.limits, s = msg.set, was = { ...L }, going = activeRuns().size;
  if ('concurrency' in s) {
    L.concurrency = s.concurrency;
    note(`⚙ Parallel runs: ${was.concurrency} → ${L.concurrency}${going > L.concurrency ? ` (${going} still running; no new one starts until fewer than ${L.concurrency} are)` : ''}`);
  }
  if ('perCli' in s) { L.perCli = s.perCli ?? Infinity; note(`⚙ Max per CLI: ${none(was.perCli)} → ${none(L.perCli)}`); }
  if ('budget' in s) {
    L.budget = s.budget ?? Infinity;
    const again = run.overBudget && spentNow() < L.budget;
    if (again) run.overBudget = false;
    note(`⚙ Budget: ${none(was.budget, '$')} → ${none(L.budget, '$')} (spent ${usd(spentNow())})${again ? ': new runs start again' : ''}`);
  }
  if ('paused' in s && s.paused !== !!L.paused) {
    L.paused = s.paused;
    note(L.paused ? `⚙ Paused: no new runs start${going ? ` (${going} still running)` : ''}` : '⚙ Resumed: new runs start again');
  }
  const set = {};
  for (const k of ['timeout', 'rerunFailed', 'resumeFailed']) if (k in s) { set[k] = s[k]; L[k] = k === 'timeout' ? s[k] || 0 : s[k]; }
  const answers = [];
  for (const b of live()) {
    const end = msg.endBatch === b.n && !b.ended;
    const m = { set, timeoutRunning: msg.timeoutRunning, requeue: msg.requeue.filter((id) => b.active.has(id)),
      drop: msg.drop.filter((id) => b.active.has(id)), skipCli: msg.skipCli, ...(end ? { end: true } : {}) };
    if (end) { b.ended = true; note(`■ Batch ${b.n}: the runs it hasn't started are left out (they run next time)`); }
    if (!Object.keys(set).length && !m.requeue.length && !m.drop.length && !m.skipCli.length && !end) continue;
    answers.push(new Promise((resolve) => { const t = setTimeout(resolve, 5000); b.waiters.push(() => { clearTimeout(t); resolve(); }); tellBatch(b, m); }));
  }
  const w = waiting.findIndex((x) => x.n === msg.endBatch); // one not started yet just goes
  if (w >= 0) { const [x] = waiting.splice(w, 1); fs.rmSync(x.dir, { recursive: true, force: true }); note(`■ Batch ${x.n} taken out of the queue`); }
  await Promise.all(answers);
  schedule(); saveSession();
  return sessionState();
}

// A batch's own copy of the config and prompt as they are now: a queued batch starts later, and Setup may change
// meanwhile. A variant whose text is in a file is copied in as text, and the prompt keeps its file's time (the
// prompt history says when a version was saved).
// It's kept in runs/.batches/ until its session ends, so a session picked up after a restart runs as it was started.
function snapshot(n) {
  const c = readJSON(CONFIG, null);
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new HttpError(400, 'The config can\'t be read.');
  fs.mkdirSync(SNAPS, { recursive: true });
  const dir = fs.mkdtempSync(path.join(SNAPS, `batch${n}-`));
  if (c.templateFile) {
    const from = templatePath(), to = path.join(dir, path.basename(from)), st = fs.statSync(from);
    fs.copyFileSync(from, to); fs.utimesSync(to, st.atime, st.mtime);
    c.templateFile = path.basename(from);
  }
  for (const vs of Object.values(c.dimensions ?? {})) for (const v of Array.isArray(vs) ? vs : []) if (v?.text == null && v?.file) { v.text = variantText(v); delete v.file; }
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(c, null, 2));
  return dir;
}

function startSession(s) {
  fs.rmSync(STOP, { force: true });
  forgetSaved(); // a session left from before: its cut-off runs still carry on whenever they run
  batches.length = 0; waiting.length = 0; lastGrant = -Infinity;
  const c = readJSON(CONFIG, {});
  Object.assign(run, { log: [], startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, settings: s, overBudget: false, stopping: false,
    gapMs: Math.max(0, +(c.startGap ?? 3) || 0) * 1000, spentBefore: 0, suspended: null,
    limits: { concurrency: Math.max(1, Math.floor(+s.concurrency) || 1), perCli: +s.perCli >= 1 ? Math.floor(+s.perCli) : Infinity,
      budget: +s.budget > 0 ? +s.budget : Infinity, timeout: +s.timeout > 0 ? +s.timeout : 0, paused: false,
      rerunFailed: !!s.rerunFailed, resumeFailed: !!s.resumeFailed } });
  return addBatch(s);
}
// Queues a batch: its copy of the config is made now. Retry and Resume failed are the running batches' (they're
// options of the whole queue on the page), the rest of its options too.
function addBatch(s) {
  const n = batches.length + waiting.length + 1, L = run.limits;
  const sel = { ...s, rerunFailed: L.rerunFailed, resumeFailed: L.resumeFailed };
  waiting.push({ n, sel, dir: snapshot(n), queuedAt: new Date().toISOString() });
  if (n > 1) note(`+ Batch ${n} queued (${describe(sel)}): it starts its runs in the slots the batches before it can't use.`);
  startWaiting(); saveSession();
  return n;
}
// Starts the queued batches, each once every running one has said which runs it has (so the new one leaves those
// out, and waits for the ones it continues from).
function startWaiting() {
  while (waiting.length && !run.stopping && live().every((b) => b.keys)) {
    const w = waiting.shift(), skip = [...new Set(live().flatMap((b) => [...b.keys]))];
    const a = [RUNNER, ...selectionArgs(w.sel, path.join(w.dir, 'config.json')), '--broker'];
    if (run.limits.timeout > 0) a.push('--timeout', String(run.limits.timeout));
    if (skip.length) { const f = path.join(w.dir, 'skip-keys.json'); fs.writeFileSync(f, JSON.stringify(skip)); a.push('--skip-keys', f); }
    // A batch picked up after a restart (see resumeSession) keeps when it first started and what it had finished.
    const b = Object.assign(w, { child: spawn(process.execPath, a, { cwd: HERE }), startedAt: w.startedAt ?? new Date().toISOString(), finishedAt: null, exitCode: null,
      active: new Map(), finished: w.finished ?? 0, planned: null, state: null, ready: [], granted: new Map(), taken: new Map(), keys: null, ended: false, cut: false, waiters: [] });
    batches.push(b); saveSession();
    b.child.stdin.on('error', () => {}); // the runner may have just exited
    let buf = '';
    const onData = (d) => { buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop(); lines.forEach((l) => logLine(b, l)); };
    b.child.stdout.on('data', onData); b.child.stderr.on('data', onData);
    b.child.on('close', (code) => { logLine(b, buf); buf = ''; batchEnded(b, code); });
  }
}
function batchEnded(b, code) {
  Object.assign(b, { child: null, exitCode: code, finishedAt: new Date().toISOString(), ready: [] });
  b.active.clear(); b.granted.clear(); b.taken.clear(); b.waiters.splice(0).forEach((w) => w());
  // What it had left won't run now: a batch waiting on one of them leaves that out.
  const gone = [...(b.keys ?? [])]; b.keys = new Set();
  if (gone.length) for (const o of live()) tellBatch(o, { gone });
  startWaiting();
  if (run.suspended) return; // kept as it is now (see suspend)
  saveSession();
  if (!running()) return endSession();
  schedule();
}
function endSession() {
  Object.assign(run, { finishedAt: new Date().toISOString(), stopping: false, exitCode: batches.find((b) => b.exitCode)?.exitCode ?? batches.at(-1)?.exitCode ?? null });
  fs.rmSync(STOP, { force: true }); refreshReport();
  for (const b of batches) if (b.dir) fs.rmSync(b.dir, { recursive: true, force: true });
  clearTimeout(saveTimer); fs.rmSync(SESSION, { force: true });
  restartIfIdle();
}
// Stop: every batch ends its running agents (their work is thrown away), and the queued ones don't start.
function stopAll(why) {
  if (!running()) return;
  run.stopping = true;
  for (const w of waiting.splice(0)) fs.rmSync(w.dir, { recursive: true, force: true });
  fs.writeFileSync(STOP, why);
  for (const b of live()) tellBatch(b, { stop: true });
  if (!live().length) endSession();
}

// --------------------------------------------------------- the session kept
// runs/.session.json: the batches going and queued, what each was started with, and the limits and log they share,
// saved as they change. Quit (Ctrl-C) and Restart end the runners but keep it (see suspend), and a crash simply never
// ends it. The dashboard started next picks it up where it left off (resumeSession): at once after Restart, else
// when Resume is chosen on the page (it's offered as `saved`). A running agent ended that way is cut off: a Claude
// Code session that got going carries on where it stopped when its batch runs again; other runs start over (see
// UNFINISHED in run-matrix.mjs). Each batch runs from its copy of the config in runs/.batches/ (see snapshot).
const SESSION = path.join(OUT, '.session.json'), SNAPS = path.join(OUT, '.batches');
let saveTimer = null;
function saveSession(now = false) {
  clearTimeout(saveTimer); saveTimer = null;
  if (!now) { saveTimer = setTimeout(() => saveSession(true), 300); return; }
  if (!run.limits || !(running() || run.suspended)) return;
  const L = run.limits, fin = (v) => v === Infinity ? null : v;
  const s = { savedAt: new Date().toISOString(), why: run.suspended, startedAt: run.startedAt, settings: run.settings, gapMs: run.gapMs,
    limits: { ...L, perCli: fin(L.perCli), budget: fin(L.budget) }, spent: spentNow(),
    // done: ended (finished, or taken out of the queue) before the dashboard was; the others are picked up.
    batches: [...batches.map((b) => ({ n: b.n, sel: b.sel, dir: b.dir && path.basename(b.dir), queuedAt: b.queuedAt, startedAt: b.startedAt, finished: b.finished,
      done: b.ended || (!b.child && !b.cut) })), ...waiting.map((w) => ({ n: w.n, sel: w.sel, dir: path.basename(w.dir), queuedAt: w.queuedAt,
      startedAt: w.startedAt ?? null, finished: w.finished ?? 0, done: false }))],
    log: run.log.slice(-500) };
  fs.writeFileSync(SESSION + '.tmp', JSON.stringify(s, null, 2)); fs.renameSync(SESSION + '.tmp', SESSION);
}

// Quit and Restart: every runner ends with its running agents cut off, the queued batches stay queued, and the session
// is kept for the dashboard started next. Resolves once the runners are gone (or after a minute).
function suspend(why) {
  if (!running()) return Promise.resolve();
  const going = activeRuns().size;
  run.suspended = why; run.stopping = true; clearTimeout(grantTimer);
  note(`⏸ ${why === 'restart' ? 'Restarting the dashboard' : 'The dashboard is closing'}${going ? `: the ${plural(going, 'run')} going ${going === 1 ? 'is' : 'are'} cut off` : ''}. `
    + 'The batch picks up where it left off when the dashboard is back.');
  for (const b of live()) { b.cut = true; tellBatch(b, { stop: true, keep: true }); }
  return new Promise((resolve) => {
    const until = Date.now() + 60000, t = setInterval(() => {
      if (live().length && Date.now() < until) return;
      clearInterval(t); saveSession(true); resolve();
    }, 100);
  });
}

// Restart: the session is kept (suspend), and the dashboard exits for the one that started it to start it again
// with its code as it is now (see RESTART_CODE). With idle, no new runs start meanwhile and it waits for the ones
// going to finish first, so none is cut off (restartPending; Restart again or cancel it on the page).
let restartPending = null, restarting = false;
async function restart() {
  if (restarting) return;
  restarting = true; restartPending = null;
  await suspend('restart');
  process.exit(RESTART_CODE);
}
function restartIfIdle() { if (restartPending && !activeRuns().size) restart(); }

// A session kept by the dashboard before this one (it quit, crashed or restarted): offered on the page, or picked up
// at once after a Restart. Read once this one has its port (a second dashboard on the same runs folder never gets that
// far), when snapshots in runs/.batches/ that no session needs any more are cleared.
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
let saved = null;
function loadSaved() {
  saved = readJSON(SESSION, null);
  if (!saved?.batches?.some((b) => !b.done)) { saved = null; fs.rmSync(SESSION, { force: true }); }
  try { for (const d of fs.readdirSync(SNAPS)) if (!saved?.batches.some((b) => b.dir === d)) fs.rmSync(path.join(SNAPS, d), { recursive: true, force: true }); } catch {}
}
function forgetSaved() {
  if (!saved) return;
  for (const b of saved.batches) if (b.dir) fs.rmSync(path.join(SNAPS, b.dir), { recursive: true, force: true });
  saved = null; savedPlanCache = null; fs.rmSync(SESSION, { force: true });
}
// Picks up the session kept: its log, limits and spend, the batches that had ended as they were, and the rest queued
// again from their own copies of the config. Their runners skip what's done, carry on what was cut off and start the rest.
function resumeSession() {
  const s = saved, L = s.limits ?? {};
  saved = null; savedPlanCache = null;
  fs.rmSync(STOP, { force: true });
  batches.length = 0; waiting.length = 0; lastGrant = -Infinity;
  Object.assign(run, { log: [...(s.log ?? [])], startedAt: s.startedAt, finishedAt: null, exitCode: null, settings: s.settings, overBudget: false, stopping: false,
    suspended: null, gapMs: s.gapMs ?? 3000, spentBefore: s.spent ?? 0,
    limits: { concurrency: Math.max(1, Math.floor(+L.concurrency) || 1), perCli: L.perCli ?? Infinity, budget: L.budget ?? Infinity, timeout: L.timeout || 0,
      paused: !!L.paused, rerunFailed: !!L.rerunFailed, resumeFailed: !!L.resumeFailed } });
  const cut = cutOffRuns(), on = cut.filter((c) => c.carriesOn).length;
  note(`⟳ ${s.why === 'restart' ? 'The dashboard restarted' : 'Resumed'} at ${new Date().toLocaleTimeString()}: carrying on with the batch started ${new Date(s.startedAt).toLocaleString()}`
    + (cut.length ? ` (${on ? `${plural(on, 'cut-off run')} carr${on === 1 ? 'ies' : 'y'} on with ${on === 1 ? 'its session' : 'their sessions'}` : ''}${on && cut.length > on ? ', ' : ''}`
      + `${cut.length > on ? `${cut.length - on} start${cut.length - on === 1 ? 's' : ''} over` : ''})` : '')
    + `${L.paused ? '. It was paused: Resume on the page lets new runs start' : ''}.`);
  for (const b of s.batches) {
    const dir = b.dir ? path.join(SNAPS, b.dir) : null;
    if (b.done) { batches.push({ n: b.n, sel: b.sel, dir, queuedAt: b.queuedAt, startedAt: b.startedAt, finishedAt: s.savedAt, child: null, exitCode: 0,
      active: new Map(), finished: b.finished ?? 0, planned: b.finished ?? 0, state: null, ready: [], granted: new Map(), taken: new Map(), keys: new Set(), ended: true, waiters: [] }); continue; }
    let from = dir;
    if (!dir || !fs.existsSync(path.join(dir, 'config.json'))) { from = snapshot(b.n); note(`⚠ Batch ${b.n}'s copy of the config was gone: it carries on with Setup as it is now.`); }
    waiting.push({ n: b.n, sel: b.sel, dir: from, queuedAt: b.queuedAt, startedAt: b.startedAt, finished: b.finished ?? 0 });
  }
  startWaiting(); saveSession();
}

// The kept session as the page shows it: when and why it ended, its batches and what's left of them. What's left comes
// from each batch's dry run (in the background, again whenever the runs on disk change): runs still to do, and of
// them the cut-off ones that carry on with their session and those that start over.
let savedPlanCache = null;
function savedInfo() {
  if (!saved) return null;
  const key = revs().results;
  if (savedPlanCache?.key !== key) {
    const mine = savedPlanCache = { key, plan: savedPlanCache?.plan ?? null }, L = saved.limits ?? {};
    Promise.all(saved.batches.filter((b) => !b.done).map((b) => new Promise((resolve) => {
      const file = path.join(SNAPS, b.dir ?? '', 'config.json'), a = [RUNNER, ...selectionArgs(b.sel, fs.existsSync(file) ? file : CONFIG), '--dry-run', '--json'];
      if (L.timeout > 0) a.push('--timeout', String(L.timeout));
      const child = spawn(process.execPath, a, { cwd: HERE });
      let out = ''; child.stdout.on('data', (d) => { out += d; });
      child.on('close', () => { try { resolve(JSON.parse(out.trim().split('\n').pop())); } catch { resolve(null); } });
    }))).then((rs) => { mine.plan = rs.reduce((t, r) => r ? { left: t.left + r.count - r.alreadyDone, carriesOn: t.carriesOn + (r.carriesOn ?? 0),
      startsOver: t.startsOver + (r.startsOver ?? 0), resumes: t.resumes + (r.resumes ?? 0) } : t, { left: 0, carriesOn: 0, startsOver: 0, resumes: 0 }); });
  }
  const L = saved.limits ?? {};
  return { why: saved.why, savedAt: saved.savedAt, startedAt: saved.startedAt, spent: saved.spent ?? 0, plan: savedPlanCache.plan,
    limits: { concurrency: L.concurrency, perCli: L.perCli, budget: L.budget, timeout: L.timeout || null, paused: !!L.paused, rerunFailed: !!L.rerunFailed, resumeFailed: !!L.resumeFailed },
    batches: saved.batches.map((b) => ({ n: b.n, what: describe(b.sel), stages: !!b.sel?.stages, finished: b.finished ?? 0, done: !!b.done })) };
}

// Runs cut off mid-way that no runner has now (unfinished.json, see UNFINISHED in run-matrix.mjs), for the page: which
// carry on with their session the next time a batch has them (a Claude Code session that got going) and which start
// over. Read again whenever the runs on disk change.
let cutCache = null;
const pidAlive = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function cutOffRuns() {
  const key = revs().results;
  if (cutCache?.key === key) return cutCache.value;
  const value = [];
  for (const d of fs.readdirSync(OUT, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('.')) continue;
    const dir = path.join(OUT, d.name), u = readJSON(path.join(dir, 'unfinished.json'), null);
    if (!u?.base?.id || pidAlive(u.runner)) continue;
    let head = ''; try { const fd = fs.openSync(path.join(dir, u.part?.n ? `agent.${u.part.n + 1}.out` : 'agent.out'), 'r'), b = Buffer.alloc(20000);
      head = b.toString('utf8', 0, fs.readSync(fd, b, 0, b.length, 0)); fs.closeSync(fd); } catch {}
    const sid = head.match(/"session_id":"([\w-]+)"/)?.[1] ?? u.base.sessionId, file = sid && u.base.provider === 'claude' ? claudeTranscript(sid, path.join(dir, 'work')) : null;
    let going = u.base.outputTokens > 0; if (!going && file) try { going = fs.readFileSync(file, 'utf8').includes('"type":"assistant"'); } catch {}
    const { variantHashes, givenHtml, parts, models, tools, plan, ...fields } = u.base;
    value.push({ ...fields, dir: d.name, carriesOn: !!file && going, cutAt: u.part?.endedAt ?? null, partStartedAt: u.part?.startedAt ?? null, resumes: parts?.length ?? 0 });
  }
  cutCache = { key, value };
  return value;
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

// A run's dimensions' texts as sent: its prompt (TASK.md for a run in stages) matched against the template it was
// filled from, each {{placeholder}} read back out (blank lines collapse when it's built, so any whitespace matches
// any); the goal's from goal.md. {} when the template isn't known any more.
const sectionsCache = new Map(); // file -> { mtime, version, value }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function sentSections(dir, r, templates) {
  const file = path.join(dir, r.stage ? 'work/TASK.md' : 'prompt.md'), tmpl = templates.get(r.promptVersion);
  let mtime = null; try { mtime = fs.statSync(file).mtimeMs; } catch {}
  const c = sectionsCache.get(file);
  if (c && c.mtime === mtime && c.version === r.promptVersion) return c.value;
  const out = {}, text = sentText(file);
  if (tmpl != null && text != null) {
    const names = [], src = tmpl.split(/\{\{(\w+)\}\}/).map((part, i) => i % 2 ? (names.push(part), '([\\s\\S]*?)') : part.split(/\s+/).map(esc).join('\\s*')).join('');
    const m = new RegExp(`^\\s*${src}\\s*$`).exec(text);
    if (m) names.forEach((n, i) => { out[n] ??= m[i + 1].trim(); });
  }
  const goal = r.stage ? null : sentText(path.join(dir, 'goal.md')), at = goal?.indexOf('Done when: ') ?? -1;
  if (at >= 0) out.goal = goal.slice(at + 11).trim();
  sectionsCache.set(file, { mtime, version: r.promptVersion, value: out });
  return out;
}
// The text a run used for dimension d, as read back from what it was sent, if it hashes as the run's did. A text that
// names other fields ("a successor to {{source}}") was sent filled in, so those are put back to check it.
function sentVariant(sent, d, hash) {
  const t = sent[d];
  if (t == null || hash == null || textHash(t) === hash) return t ?? null;
  const others = Object.entries(sent).filter(([o, x]) => o !== d && x.length > 2 && t.includes(x));
  for (const set of [others, ...others.map((o) => [o])]) {
    const back = set.reduce((s, [o, x]) => s.replaceAll(x, `{{${o}}}`), t);
    if (textHash(back) === hash) return back;
  }
  return null;
}

// Every variant finished runs used, per dimension, so Setup can bring one back and keep a short name to one text
// (runs are matched by short name, so a name runs used for other text is taken): { dim: [{ id, text, runs }] }, text
// null when it can't be told. A run's text is its variant's in the config while that still matches (changedVariants),
// else it's read back out of the prompt it was sent.
let libCache = null;
function variantLibrary() {
  const rv = revs(), key = [rv.results, rv.config, rv.template, rv.history].join('|');
  if (libCache?.key === key) return libCache.value;
  const dims = readJSON(CONFIG, {}).dimensions ?? {};
  let tmpl = ''; try { tmpl = fs.readFileSync(templatePath(), 'utf8'); } catch {}
  const templates = new Map(readJSON(HISTORY, []).map((e) => [e.hash, e.text]));
  templates.set(textHash(tmpl), tmpl);
  const found = Object.fromEntries(Object.keys(dims).map((d) => [d, new Map()])), known = new Map();
  for (const e of fs.readdirSync(OUT, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(OUT, e.name), r = readJSON(path.join(dir, 'result.json'), null);
    if (!r?.id) continue;
    const changed = changedVariants(dir, r, dims, tmpl);
    for (const [d, vs] of Object.entries(dims)) {
      const id = r[d], hash = r.variantHashes?.[d] ?? null, k = `${d}\n${id}\n${hash}`;
      if (id == null) continue; // from before the dimension existed
      let text = hash != null ? known.get(k) : undefined;
      if (text === undefined) {
        const v = vs.find((x) => x.id === id);
        text = v && !changed.includes(d) ? variantText(v).trim() : sentVariant(sentSections(dir, r, templates), d, hash);
        if (hash != null) known.set(k, text);
      }
      const f = found[d], fk = `${id}\n${text}`;
      if (f.has(fk)) f.get(fk).runs++; else f.set(fk, { id, text, runs: 1 });
    }
  }
  const value = Object.fromEntries(Object.entries(found).map(([d, f]) => [d, [...f.values()]]));
  libCache = { key, value };
  return value;
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
    r.hasInterview = fs.existsSync(path.join(dir, 'work', 'exit-interview.json'));
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
      h.update(`${d.name}|${stamp(path.join(OUT, d.name, 'result.json'))}|${stamp(path.join(OUT, d.name, 'reply.md'))}|${stamp(path.join(OUT, d.name, 'unfinished.json'))}\n`);
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

    // canResume, canQueue, canRestart: this server takes Resume failed, queued batches and Restart (a page newer than its
    // server hides them). boot: this start of the server.
    if (p === '/api/config' && m === 'GET') return send(res, 200, { config: readJSON(CONFIG, null), path: CONFIG, outDir: OUT, platform: process.platform, rev: revs(true),
      canResume: true, canQueue: true, canRestart: true, boot: BOOT });
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

    // Start begins a batch; with add, one is queued beside the batches running now (see run state).
    if (p === '/api/run' && m === 'POST') {
      const s = await body(req);
      if (updating) return send(res, 409, { error: `${updating} is updating; start when it's done.` });
      if (running() && !s?.add) return send(res, 409, { error: 'A batch is already running.' });
      if (run.stopping) return send(res, 409, { error: 'The running batches are stopping; start when they have.' });
      return send(res, 200, { ok: true, batch: running() ? addBatch(s) : startSession(s) });
    }
    if (p === '/api/adjust' && m === 'POST') {
      const msg = adjustment(await body(req));
      if (!running()) return send(res, 409, { error: 'No batch is running.' });
      return send(res, 200, { ok: true, state: await adjustRun(msg) });
    }
    if (p === '/api/stop' && m === 'POST') {
      stopAll(new Date().toISOString());
      return send(res, 200, { ok: true });
    }
    // Restart: now, or with idle once the runs going have finished (cancel takes that back). The answer comes first.
    if (p === '/api/restart' && m === 'POST') {
      const s = await body(req);
      if (updating) return send(res, 409, { error: `${updating} is updating; restart when it's done.` });
      if (s?.cancel) {
        if (restartPending) { restartPending = null; note('⟳ Restart called off: new runs start again'); schedule(); }
        return send(res, 200, { ok: true });
      }
      const going = activeRuns().size, later = !!s?.idle && going > 0;
      if (later && !restartPending) { restartPending = { at: new Date().toISOString() }; note(`⟳ Restarting once the ${plural(going, 'run')} going finish${going === 1 ? 'es' : ''}: no new runs start until then`); }
      send(res, 200, { ok: true, later });
      if (!later) setTimeout(restart, 100);
      return;
    }
    // The session the dashboard before this one kept (see suspend): pick it up, or forget it.
    if (p === '/api/session' && m === 'POST') {
      const s = await body(req);
      if (!saved) return send(res, 409, { error: 'There\'s no batch to pick up.' });
      if (s?.forget) { forgetSaved(); return send(res, 200, { ok: true }); }
      if (running()) return send(res, 409, { error: 'A batch is running; pick the other one up once it\'s done.' });
      if (updating) return send(res, 409, { error: `${updating} is updating; resume when it's done.` });
      resumeSession();
      return send(res, 200, { ok: true });
    }
    if (p === '/api/status' && m === 'GET') {
      const since = +(url.searchParams.get('since') ?? 0), known = url.searchParams.get('smokes'), act = activeRuns();
      // saved: a session the dashboard before this one kept, to pick up (see suspend); cut: runs cut off mid-way;
      // restarting: Restart under way, now or once the runs going finish (idle).
      return send(res, 200, { running: running(), stopping: run.stopping || fs.existsSync(STOP), boot: BOOT,
        startedAt: run.startedAt, finishedAt: run.finishedAt, exitCode: run.exitCode, active: [...act.keys()], activeSince: Object.fromEntries(act),
        finished: batches.reduce((n, b) => n + b.finished, 0), planned: run.startedAt ? batches.reduce((n, b) => n + (b.planned ?? 0), 0) : null,
        settings: run.settings, state: run.limits ? sessionState() : null, batches: batchList(), logTotal: run.log.length,
        log: run.log.slice(Math.max(0, Math.min(since, run.log.length))), updating, rev: revs(),
        restarting: restarting ? 'now' : restartPending ? 'idle' : null, saved: running() ? null : savedInfo(), cut: cutOffRuns(),
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
    if (p === '/api/variants' && m === 'GET') return send(res, 200, variantLibrary());
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
      if (!dir || activeRuns().has(id)) return send(res, 400, { error: 'Cannot delete that run.' });
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
  const link = `http://localhost:${opts.port}`, again = !!process.env.MATRIX_DASHBOARD_RESTARTED;
  console.log(`${again ? '\n⟳ Restarted. ' : ''}Matrix dashboard: ${link}\nConfig: ${CONFIG}\nRuns:   ${OUT}\nCtrl-C to quit (a running batch keeps its finished results).`);
  if (opts.allowHosts.length) console.log(`Also answering as ${opts.allowHosts.join(', ')}: anyone who can reach that address can start agents.`);
  // After Restart the session it kept carries on at once; one kept otherwise waits for Resume on the page.
  loadSaved();
  if (saved && again && saved.why === 'restart') resumeSession();
  else if (saved) console.log(`A batch from ${new Date(saved.startedAt).toLocaleString()} was cut off ${saved.why === 'quit' ? 'when the dashboard quit' : 'when the dashboard stopped'}: Resume it on the Run tab.`);
  if (opts.open && !again) {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', link]]
      : process.platform === 'darwin' ? ['open', [link]] : ['xdg-open', [link]];
    spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
});

// Quitting the dashboard ends a running batch too, but keeps it to pick up (see suspend): its running agents are cut
// off, and only a Claude Code session that got going carries on from where it was. So with agents running Ctrl-C asks
// to be pressed again (the runner leaves Ctrl-C to us).
let ctrlCAt = 0, quitting = false;
const quit = async (sig) => {
  if (quitting) return;
  if (!running()) process.exit(0);
  const going = activeRuns().size;
  if (sig === 'SIGINT' && going && Date.now() - ctrlCAt > 5000) {
    ctrlCAt = Date.now();
    console.log(`\nA batch is running with ${going} agent(s) going. Quitting ends them: a Claude Code run that has got going carries on with its session\n`
      + 'when you resume the batch (the Run tab offers that when the dashboard starts again); runs of other CLIs start over.\n'
      + 'Press Ctrl-C again within 5 seconds to quit, or use Restart on the Run tab to come straight back with the batch going.');
    return;
  }
  quitting = true;
  await suspend('quit');
  process.exit(0);
};
process.on('SIGINT', () => quit('SIGINT')); process.on('SIGTERM', () => quit('SIGTERM'));
