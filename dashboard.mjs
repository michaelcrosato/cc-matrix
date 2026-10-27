#!/usr/bin/env node
// dashboard.mjs — local web dashboard for the matrix runner.
//   node dashboard.mjs            then open http://localhost:4173
//   node dashboard.mjs --port 5000 --config matrix.config.json --out runs --open
// No dependencies; Node 18+. Works the same on Ubuntu, macOS and Windows (PowerShell).
// Listens on 127.0.0.1 only: it can launch agents with permissions bypassed.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const opts = { port: 4173, config: 'matrix.config.json', out: 'runs', open: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--port') opts.port = +process.argv[++i];
  else if (a === '--config') opts.config = process.argv[++i];
  else if (a === '--out') opts.out = process.argv[++i];
  else if (a === '--open') opts.open = true;
}
const CONFIG = path.resolve(HERE, opts.config);
const OUT = path.resolve(HERE, opts.out);
const RUNNER = path.join(HERE, 'run-matrix.mjs');
const PAGE = path.join(HERE, 'dashboard.html');
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- helpers
const readJSON = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };
const templatePath = () => path.resolve(path.dirname(CONFIG), readJSON(CONFIG, {}).templateFile || 'prompt-template.md');

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
const body = (req) => new Promise((resolve, reject) => {
  let s = ''; req.on('data', (c) => { s += c; if (s.length > 20e6) reject(new Error('too large')); });
  req.on('end', () => resolve(s)); req.on('error', reject);
});

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

// ------------------------------------------------------------ smoke tests
// One tiny task per model+effort through the real runner (run-matrix.mjs --smoke).
// Finished results are kept in runs/.smoke.json so they survive a restart.
const SMOKE_FILE = path.join(OUT, '.smoke.json');
const smokes = readJSON(SMOKE_FILE, {});
function startSmoke(key, goal) {
  smokes[key] = { running: true, goal: !!goal, startedAt: new Date().toISOString() };
  const a = [RUNNER, '--config', CONFIG, '--out', OUT, '--smoke', key];
  if (goal) a.push('--smoke-goal');
  const child = spawn(process.execPath, a, { cwd: HERE });
  let out = '', err = '';
  child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { err += d; });
  child.on('close', () => {
    try { smokes[key] = JSON.parse(out.trim().split('\n').pop()); }
    catch { smokes[key] = { key, ok: false, goal: !!goal, at: new Date().toISOString(), error: (err || out || 'The test crashed').trim().slice(-2000) }; }
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
  return a;
}

// ------------------------------------------------------------- run state
let runner = null;
// active: run id -> start time
const run = { log: [], startedAt: null, finishedAt: null, exitCode: null, active: new Map(), finished: 0, settings: null };
function logLine(line) {
  if (!line) return;
  run.log.push(line);
  if (run.log.length > 3000) run.log.splice(0, run.log.length - 3000);
  const m = line.match(/^(▶|✔|✘|■) (\S+)/);
  if (m) { if (m[1] === '▶') run.active.set(m[2], new Date().toISOString()); else { run.active.delete(m[2]); if (m[1] !== '■') run.finished++; } }
}

function startRun(s) {
  const a = [RUNNER, ...selectionArgs(s), '-j', String(Math.max(1, +s.concurrency || 1))];
  if (+s.perCli > 0) a.push('--per-cli', String(+s.perCli));
  if (+s.budget > 0) a.push('--budget', String(+s.budget));
  if (+s.timeout > 0) a.push('--timeout', String(+s.timeout));
  Object.assign(run, { log: [], startedAt: new Date().toISOString(), finishedAt: null, exitCode: null,
    active: new Map(), finished: 0, settings: s });
  runner = spawn(process.execPath, a, { cwd: HERE });
  let buf = '';
  const onData = (d) => { buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop(); lines.forEach(logLine); };
  runner.stdout.on('data', onData); runner.stderr.on('data', onData);
  runner.on('close', (code) => { logLine(buf); buf = ''; run.exitCode = code; run.finishedAt = new Date().toISOString();
    run.active.clear(); runner = null; });
}

// ------------------------------------------------------------------ results
function results() {
  const scores = readJSON(path.join(OUT, 'scores.json'), {});
  const rows = [];
  for (const d of fs.readdirSync(OUT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const r = readJSON(path.join(OUT, d.name, 'result.json'), null);
    if (!r) continue;
    r.hasReply = fs.existsSync(path.join(OUT, d.name, 'reply.md'));
    rows.push({ ...r, ...(scores[r.id] ?? {}) });
  }
  return rows;
}

let reportTimer = null;
const refreshReport = () => { clearTimeout(reportTimer); reportTimer = setTimeout(() =>
  spawn(process.execPath, [RUNNER, '--config', CONFIG, '--out', OUT, '--report'], { cwd: HERE, stdio: 'ignore' }), 1000); };

// ------------------------------------------------------------------ static
const TYPES = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.out': 'text/plain; charset=utf-8', '.err': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.wgsl': 'text/plain', '.glsl': 'text/plain' };

function serveRunFile(res, rel) {
  const file = path.resolve(OUT, decodeURIComponent(rel));
  if (!file.startsWith(OUT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
}

// ------------------------------------------------------------------ routes
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname, m = req.method;

    if (p === '/' && m === 'GET') return send(res, 200, fs.readFileSync(PAGE), 'text/html; charset=utf-8');
    if (p.startsWith('/runs/') && m === 'GET') return serveRunFile(res, p.slice(6));

    if (p === '/api/config' && m === 'GET') return send(res, 200, { config: readJSON(CONFIG, null), path: CONFIG, outDir: OUT, platform: process.platform });
    if (p === '/api/config' && m === 'PUT') {
      const c = JSON.parse(await body(req));
      fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2) + '\n'); refreshReport();
      return send(res, 200, { ok: true });
    }
    if (p === '/api/template' && m === 'GET') return send(res, 200, { text: fs.existsSync(templatePath()) ? fs.readFileSync(templatePath(), 'utf8') : '', path: templatePath() });
    if (p === '/api/template' && m === 'PUT') { fs.writeFileSync(templatePath(), JSON.parse(await body(req)).text); return send(res, 200, { ok: true }); }

    if (p === '/api/preview' && m === 'POST') {
      const s = JSON.parse(await body(req));
      const r = spawnSync(process.execPath, [RUNNER, ...selectionArgs(s), '--dry-run', '--json'], { cwd: HERE, encoding: 'utf8', maxBuffer: 50e6 });
      if (r.status !== 0) return send(res, 400, { error: (r.stderr || r.stdout || 'preview failed').trim() });
      return send(res, 200, JSON.parse(r.stdout.trim().split('\n').pop()));
    }

    if (p === '/api/run' && m === 'POST') {
      if (runner) return send(res, 409, { error: 'A batch is already running.' });
      startRun(JSON.parse(await body(req)));
      return send(res, 200, { ok: true });
    }
    if (p === '/api/stop' && m === 'POST') {
      if (runner) fs.writeFileSync(path.join(OUT, '.stop'), new Date().toISOString());
      return send(res, 200, { ok: true });
    }
    if (p === '/api/status' && m === 'GET') {
      const since = +(url.searchParams.get('since') ?? 0);
      return send(res, 200, { running: !!runner, stopping: fs.existsSync(path.join(OUT, '.stop')),
        startedAt: run.startedAt, finishedAt: run.finishedAt, exitCode: run.exitCode, active: [...run.active.keys()],
        activeSince: Object.fromEntries(run.active), finished: run.finished, settings: run.settings, logTotal: run.log.length,
        log: run.log.slice(Math.max(0, Math.min(since, run.log.length))), smokes });
    }

    if (p === '/api/clis' && m === 'GET') return send(res, 200, await checkClis(url.searchParams.has('refresh')));
    if (p === '/api/smoke' && m === 'POST') {
      const { tests = [] } = JSON.parse(await body(req)); // [{ key: 'agent:effort', goal }]
      for (const t of tests) if (!smokes[t.key]?.running) startSmoke(t.key, t.goal);
      return send(res, 200, { ok: true });
    }

    if (p === '/api/results' && m === 'GET') return send(res, 200, results());
    if (p === '/api/score' && m === 'PUT') {
      const { id, score, notes } = JSON.parse(await body(req));
      const f = path.join(OUT, 'scores.json'), all = readJSON(f, {});
      all[id] = { score: score === '' || score == null ? null : +score, notes: notes ?? '' };
      if (all[id].score == null && !all[id].notes) delete all[id];
      fs.writeFileSync(f, JSON.stringify(all, null, 2)); refreshReport();
      return send(res, 200, { ok: true });
    }
    if (p === '/api/delete-run' && m === 'POST') {
      const { id } = JSON.parse(await body(req));
      const dir = path.resolve(OUT, id);
      if (!dir.startsWith(OUT + path.sep) || run.active.has(id)) return send(res, 400, { error: 'Cannot delete that run.' });
      fs.rmSync(dir, { recursive: true, force: true }); refreshReport();
      return send(res, 200, { ok: true });
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) { send(res, 500, { error: e.message }); }
});

server.listen(opts.port, '127.0.0.1', () => {
  checkClis(); // warm the cache so the Setup tab has it on first load
  const link = `http://localhost:${opts.port}`;
  console.log(`Matrix dashboard: ${link}\nConfig: ${CONFIG}\nRuns:   ${OUT}\nCtrl-C to quit (a running batch keeps its finished results).`);
  if (opts.open) {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', link]]
      : process.platform === 'darwin' ? ['open', [link]] : ['xdg-open', [link]];
    spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
});

// Quitting the dashboard stops a running batch cleanly too.
const quit = () => {
  if (runner) { fs.writeFileSync(path.join(OUT, '.stop'), 'quit'); runner.on('close', () => process.exit(0)); setTimeout(() => process.exit(0), 15000); }
  else process.exit(0);
};
process.on('SIGINT', quit); process.on('SIGTERM', quit);
