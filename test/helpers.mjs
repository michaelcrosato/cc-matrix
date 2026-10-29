// Shared by the tests: a throwaway config + runs folder wired to the fake CLIs in test/fake-cli,
// so nothing real is ever started and nothing is spent.
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RUNNER = path.join(ROOT, 'run-matrix.mjs');
export const DASHBOARD = path.join(ROOT, 'dashboard.mjs');
export const FAKE = path.join(ROOT, 'test', 'fake-cli');
const CLIS = ['claude', 'codex', 'grok', 'agy', 'muse'];

export function sandbox({ agents, dimensions, template = 'Make a small game.\n\nTesting: {{testing}}\n', bins = {}, ...extra }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'matrix-test-'));
  fs.writeFileSync(path.join(dir, 'prompt.md'), template);
  const cfg = { templateFile: 'prompt.md', agents, dimensions, bins: { ...Object.fromEntries(CLIS.map((p) => [p, path.join(FAKE, p)])), ...bins }, ...extra };
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg, null, 2));
  const sb = { dir, config: path.join(dir, 'config.json'), out: path.join(dir, 'runs'), log: path.join(dir, 'fake.log') };
  // The fake codex and grok write their session logs here (and the runner reads them from here, not ~).
  sb.env = { ...process.env, FAKE_LOG: sb.log, FAKE_SLEEP_MS: '20', CODEX_HOME: path.join(dir, 'codex-home'), GROK_HOME: path.join(dir, 'grok-home') };
  return sb;
}
export const cleanup = (sb) => fs.rmSync(sb.dir, { recursive: true, force: true });

export function runner(sb, args, env = {}) {
  const r = spawnSync(process.execPath, [RUNNER, '--config', sb.config, '--out', sb.out, ...args],
    { encoding: 'utf8', env: { ...sb.env, ...env }, timeout: 120000 });
  return { ...r, all: `${r.stdout}${r.stderr}` };
}
export const result = (sb, id) => JSON.parse(fs.readFileSync(path.join(sb.out, id, 'result.json'), 'utf8'));
export const calls = (sb) => fs.existsSync(sb.log) ? fs.readFileSync(sb.log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
export const callFor = (sb, id) => calls(sb).find((c) => c.cwd === path.join(sb.out, id, 'work'));

export const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

// Starts the dashboard on a free port; resolves once it's listening.
export async function dashboard(sb, extraArgs = []) {
  const port = await freePort();
  const child = spawn(process.execPath, [DASHBOARD, '--port', String(port), '--config', sb.config, '--out', sb.out, ...extraArgs], { env: sb.env });
  let out = '';
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`dashboard didn't start: ${out}`)), 15000);
    const on = (d) => { out += d; if (out.includes('Matrix dashboard:')) { clearTimeout(t); resolve(); } };
    child.stdout.on('data', on); child.stderr.on('data', on);
    child.on('exit', (code) => { clearTimeout(t); reject(new Error(`dashboard exited (${code}): ${out}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  // Same-origin JSON, the way the page talks to it.
  const api = async (p, method = 'GET', body, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  };
  return { port, base, api, child, output: () => out, stop: () => new Promise((r) => { child.once('exit', r); child.kill('SIGTERM'); }) };
}

// fetch() won't send a made-up Host header, so tests of Host checks use http directly.
export const raw = (port, { method = 'GET', path: p = '/', headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, method, path: p, headers }, (res) => {
    let text = ''; res.on('data', (c) => { text += c; }); res.on('end', () => resolve({ status: res.statusCode, text }));
  });
  req.on('error', reject); req.end(body);
});

export const waitFor = async (fn, ms = 20000, step = 100) => {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error('timed out waiting'); await new Promise((r) => setTimeout(r, step)); }
};
