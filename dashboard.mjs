#!/usr/bin/env node
// dashboard.mjs — local web dashboard for the matrix runner.
//   node dashboard.mjs            then open http://localhost:4173
//   node dashboard.mjs --port 5000 --config matrix.config.json --out runs --open
// No dependencies; Node 18+. Works the same on Ubuntu, macOS and Windows (PowerShell).
// Listens on 127.0.0.1 only: it can launch agents with permissions bypassed.

import http from 'node:http';
import fs from 'node:fs';
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
const run = { log: [], startedAt: null, finishedAt: null, exitCode: null, active: new Set(), finished: 0, settings: null };
function logLine(line) {
  if (!line) return;
  run.log.push(line);
  if (run.log.length > 3000) run.log.splice(0, run.log.length - 3000);
  const m = line.match(/^(▶|✔|✘|■) (\S+)/);
  if (m) { if (m[1] === '▶') run.active.add(m[2]); else { run.active.delete(m[2]); if (m[1] !== '■') run.finished++; } }
}

function startRun(s) {
  const a = [RUNNER, ...selectionArgs(s), '-j', String(Math.max(1, +s.concurrency || 1))];
  if (+s.budget > 0) a.push('--budget', String(+s.budget));
  if (+s.timeout > 0) a.push('--timeout', String(+s.timeout));
  Object.assign(run, { log: [], startedAt: new Date().toISOString(), finishedAt: null, exitCode: null,
    active: new Set(), finished: 0, settings: s });
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
        startedAt: run.startedAt, finishedAt: run.finishedAt, exitCode: run.exitCode, active: [...run.active],
        finished: run.finished, settings: run.settings, logTotal: run.log.length,
        log: run.log.slice(Math.max(0, Math.min(since, run.log.length))) });
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
