// dashboard.mjs over HTTP: who may talk to it, its files, and the API the page uses, with the fake CLIs.
// node --test test/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { sandbox, cleanup, dashboard, runner, waitFor, raw, DASHBOARD } from './helpers.mjs';

let sb, d;
before(async () => {
  sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'variant A' }, { id: 'b', text: 'variant B' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }, { id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['max'] }] });
  assert.equal(runner(sb, ['--only', 'testing=a']).status, 0); // two finished runs to start with
  d = await dashboard(sb);
});
after(async () => { await d?.stop(); cleanup(sb); });

test('serves the page', async () => {
  const r = await fetch(d.base + '/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<title>Matrix Dashboard<\/title>/);
});

test('other websites can\'t drive it: foreign Host, cross-origin, cross-site or non-JSON writes are refused', async () => {
  assert.equal((await raw(d.port, { path: '/api/config', headers: { Host: `attacker.example:${d.port}` } })).status, 403); // DNS rebinding
  assert.equal((await raw(d.port, { path: '/api/config', headers: { Host: `127.0.0.1:${d.port}` } })).status, 200);
  const plain = await fetch(d.base + '/api/stop', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(plain.status, 403); // the kind of POST a page on any site can send without a preflight
  assert.equal((await d.api('/api/stop', 'POST', {}, { Origin: 'http://evil.example' })).status, 403);
  assert.equal((await d.api('/api/stop', 'POST', {}, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await d.api('/api/stop', 'POST', {}, { Origin: 'null' })).status, 403);
  assert.equal((await d.api('/api/stop', 'POST', {})).status, 200); // this page itself
  const viaLocalhost = await raw(d.port, { method: 'POST', path: '/api/stop', body: '{}',
    headers: { Host: `localhost:${d.port}`, Origin: `http://localhost:${d.port}`, 'Content-Type': 'application/json' } });
  assert.equal(viaLocalhost.status, 200);
});

test('--allow-host lets a named host (a tunnel) in, and only that one', async () => {
  const d2 = await dashboard(sb, ['--allow-host', 'my-tunnel.example']);
  try {
    assert.equal((await raw(d2.port, { headers: { Host: 'my-tunnel.example' } })).status, 200);
    assert.equal((await raw(d2.port, { headers: { Host: 'other.example' } })).status, 403);
    const write = await raw(d2.port, { method: 'POST', path: '/api/stop', body: '{}',
      headers: { Host: 'my-tunnel.example', Origin: 'https://my-tunnel.example', 'Content-Type': 'application/json' } });
    assert.equal(write.status, 200); // the tunnel's own page
    const other = await raw(d2.port, { method: 'POST', path: '/api/stop', body: '{}',
      headers: { Host: 'my-tunnel.example', Origin: 'https://elsewhere.example', 'Content-Type': 'application/json' } });
    assert.equal(other.status, 403);
    assert.match(d2.output(), /anyone who can reach that address can start agents/);
  } finally { await d2.stop(); }
});

test('run files: served and streamed, nothing outside the runs folder', async () => {
  const ok = await fetch(d.base + '/runs/opus-low__a/prompt.md');
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /variant A/);
  const head = await fetch(d.base + '/runs/opus-low__a/prompt.md', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.ok(+head.headers.get('content-length') > 0);
  assert.equal((await fetch(d.base + '/runs/..%2Fconfig.json')).status, 404);
  assert.equal((await fetch(d.base + '/runs/%E0%A4%A')).status, 400);
  const game = (await d.api('/api/results')).json.find((r) => r.id === 'opus-low__a').entry;
  const g = await fetch(d.base + '/runs/' + game.split('/').map(encodeURIComponent).join('/'));
  assert.equal(g.status, 200); assert.match(g.headers.get('content-type'), /text\/html/);
});

test('config and prompt: read, write, bad input refused, and their signatures move', async () => {
  const c = await d.api('/api/config');
  assert.equal(c.status, 200);
  assert.ok(c.json.rev.config && c.json.rev.template && c.json.rev.results);
  assert.equal((await d.api('/api/config', 'PUT', '[1,2]')).status, 400);
  assert.equal((await d.api('/api/config', 'PUT', '{"not json')).status, 400);
  const put = await d.api('/api/config', 'PUT', c.json.config);
  assert.equal(put.status, 200);
  const t = await d.api('/api/template'), tp = await d.api('/api/template', 'PUT', { text: t.json.text + '\n' });
  assert.equal(tp.status, 200);
  assert.notEqual(tp.json.version, t.json.version);
  assert.notEqual(tp.json.rev.template, c.json.rev.template);
  await d.api('/api/template', 'PUT', { text: t.json.text });
  assert.equal((await d.api('/api/template', 'PUT', { text: 5 })).status, 400);
});

test('status: results signature changes when runs change on disk; tests only sent when they changed', async () => {
  const s1 = (await d.api('/api/status?smokes=')).json;
  assert.ok(s1.smokes && s1.rev.smokes);
  assert.equal((await d.api(`/api/status?smokes=${s1.rev.smokes}`)).json.smokes, undefined);
  assert.equal(runner(sb, ['--only', 'testing=b', '--pick', 'opus:low']).status, 0); // a run from a terminal
  await new Promise((r) => setTimeout(r, 1000)); // past the signature cache
  const s2 = (await d.api('/api/status')).json;
  assert.notEqual(s2.rev.results, s1.rev.results);
  assert.ok((await d.api('/api/results')).json.some((r) => r.id === 'opus-low__b'));
});

test('reviews: 0-10 only, tied to the run attempt they were made for', async () => {
  assert.equal((await d.api('/api/score', 'PUT', { id: 'opus-low__a', score: 11 })).status, 400);
  assert.equal((await d.api('/api/score', 'PUT', { id: 'no-such-run', score: 5 })).status, 400);
  const run = (await d.api('/api/results')).json.find((r) => r.id === 'opus-low__a');
  assert.equal((await d.api('/api/score', 'PUT', { id: run.id, score: 7.5, notes: 'fun', startedAt: run.startedAt })).status, 200);
  let back = (await d.api('/api/results')).json.find((r) => r.id === 'opus-low__a');
  assert.deepEqual([back.score, back.notes], [7.5, 'fun']);
  assert.equal(back.startedAt, run.startedAt);
  // the run is redone (new startedAt): the old review no longer applies
  const f = path.join(sb.out, run.id, 'result.json');
  fs.writeFileSync(f, JSON.stringify({ ...JSON.parse(fs.readFileSync(f, 'utf8')), startedAt: new Date().toISOString() }));
  back = (await d.api('/api/results')).json.find((r) => r.id === 'opus-low__a');
  assert.equal(back.score, undefined);
  // an older review without a startedAt still applies
  fs.writeFileSync(path.join(sb.out, 'scores.json'), JSON.stringify({ 'opus-low__a': { score: 3, notes: '' } }));
  assert.equal((await d.api('/api/results')).json.find((r) => r.id === 'opus-low__a').score, 3);
});

test('delete-run: only run folders, and the review goes with it', async () => {
  for (const id of ['scores.json', 'results.csv', '.smoke.json', '..', '../x', '', 'nope']) assert.equal((await d.api('/api/delete-run', 'POST', { id })).status, 400, id);
  assert.ok(fs.existsSync(path.join(sb.out, 'scores.json')));
  assert.equal((await d.api('/api/delete-run', 'POST', { id: 'opus-low__a' })).status, 200);
  assert.ok(!fs.existsSync(path.join(sb.out, 'opus-low__a')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(sb.out, 'scores.json'), 'utf8'))['opus-low__a'], undefined);
});

test('a batch from the page runs through the fake CLIs and reports progress', async () => {
  const s0 = (await d.api('/api/status')).json;
  assert.equal((await d.api('/api/run', 'POST', { pick: ['opus:low', 'sol:max'], only: { testing: ['a', 'b'] }, concurrency: 2 })).status, 200);
  const done = await waitFor(async () => { const s = (await d.api('/api/status?since=0')).json; return !s.running && s.finishedAt && s.startedAt !== s0.startedAt ? s : null; });
  assert.equal(done.exitCode, 0, done.log.join('\n'));
  assert.equal(done.planned, 2); // opus-low__a was deleted above and sol-max__b never ran
  assert.equal(done.finished, 2);
  assert.ok(done.log.some((l) => l.startsWith('✔ opus-low__a')));
  assert.equal((await d.api('/api/run', 'POST', { pick: [] })).status, 200); // nothing ticked = nothing runs
});

test('Test button: a smoke test runs and its result comes back', async () => {
  assert.equal((await d.api('/api/smoke', 'POST', { tests: [{ key: 'opus:low', goal: false }] })).status, 200);
  const s = await waitFor(async () => { const x = (await d.api('/api/status')).json.smokes?.['opus:low']; return x && !x.running ? x : null; });
  assert.equal(s.ok, true, JSON.stringify(s));
  assert.ok(fs.existsSync(path.join(sb.out, '.smoke.json')));
});

test('the Audit tab\'s data is served when audit.json exists', async () => {
  const r = await d.api('/api/audit');
  assert.equal(r.status, 200);
  if (r.json) assert.ok(Array.isArray(r.json.findings));
});

test('a second dashboard on a port in use says so and exits', async () => {
  const child = spawn(process.execPath, [DASHBOARD, '--port', String(d.port), '--config', sb.config, '--out', sb.out]);
  let err = ''; child.stderr.on('data', (x) => { err += x; });
  const code = await new Promise((r) => child.on('exit', r));
  assert.equal(code, 1);
  assert.match(err, new RegExp(`Port ${d.port} is already in use`));
});
