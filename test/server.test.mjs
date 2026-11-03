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

test('a batch in stages from the page: picks per stage go to the runner, and the results say who continued from whom', async (t) => {
  const s = sandbox({ dimensions: { testing: [{ id: 'a', text: 'variant A' }] }, agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }],
    stages: [{ id: 'plan', text: 'Read TASK.md and plan it. FAKE:plan', game: false }, { id: 'build', text: 'Build TASK.md from PLAN.md by {{parentModel}}.' }] });
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  const sel = { stages: { plan: ['opus:max'], build: ['opus:high', 'opus:low', 'bad pick'] }, only: { testing: ['a'] } };
  const pre = (await dd.api('/api/preview', 'POST', sel)).json;
  assert.deepEqual([pre.count, pre.byStage], [3, { plan: 1, build: 2 }]);
  assert.equal((await dd.api('/api/preview', 'POST', { stages: {} })).json.count, 0); // nothing picked: nothing runs
  assert.equal((await dd.api('/api/run', 'POST', { ...sel, concurrency: 3 })).status, 200);
  const done = await waitFor(async () => { const st = (await dd.api('/api/status?since=0')).json; return !st.running && st.finishedAt ? st : null; });
  assert.equal(done.exitCode, 0, done.log.join('\n'));
  assert.deepEqual([done.planned, done.finished], [3, 3]);
  const rows = (await dd.api('/api/results')).json, plan = rows.find((r) => r.stage === 'plan');
  assert.deepEqual(rows.filter((r) => r.stage === 'build').map((r) => [r.parentId, r.chain.length, r.status]), [[plan.id, 2, 'ok'], [plan.id, 2, 'ok']]);
});

test('Resume failed: the page hears which failed runs can carry on with their session, and a batch from it resumes them', async (t) => {
  const s = sandbox({ dimensions: { testing: [{ id: 'a', text: 'FAKE:limit' }, { id: 'b', text: 'FAKE:limit=start' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }] });
  assert.equal(runner(s, []).status, 0); // both stop on the usage limit, one partway and one at once
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  assert.equal((await dd.api('/api/config')).json.canResume, true);
  const by = Object.fromEntries((await dd.api('/api/results')).json.map((r) => [r.id, r]));
  assert.deepEqual([by['opus-low__a'].resumable, by['opus-low__b'].resumable], [true, undefined]);
  const sel = { pick: ['opus:low'], only: { testing: ['a', 'b'] }, resumeFailed: true };
  const pv = (await dd.api('/api/preview', 'POST', sel)).json;
  assert.deepEqual([pv.alreadyDone, pv.resumes], [1, 1]);
  assert.equal((await dd.api('/api/run', 'POST', sel)).status, 200);
  const done = await waitFor(async () => { const x = (await dd.api('/api/status?since=0')).json; return !x.running && x.finishedAt ? x : null; });
  assert.equal(done.exitCode, 0, done.log.join('\n'));
  assert.equal(done.finished, 1);
  assert.ok(done.log.some((l) => l.startsWith('✔ opus-low__a  resumed:')), done.log.join('\n'));
  const a = (await dd.api('/api/results')).json.find((r) => r.id === 'opus-low__a');
  assert.deepEqual([a.status, a.resumes, a.resumable], ['ok', 1, undefined]);
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

test('prompt history: saving edits numbers nothing, a batch does (and the page hears of it); runs from before a dimension count as its olderRuns variant', async (t) => {
  const s = sandbox({ dimensions: { testing: [{ id: 'a', text: 'variant A' }] }, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  const t0 = (await dd.api('/api/template')).json;
  assert.deepEqual(t0.history, []);
  assert.ok(t0.savedAt);
  const text = t0.text + 'More.\n';
  for (const x of ['One.\n', 'Two.\n', '']) assert.equal((await dd.api('/api/template', 'PUT', { text: text + x })).status, 200);
  const put = (await dd.api('/api/template')).json;
  assert.deepEqual([put.history, put.version], [[], (await dd.api('/api/template', 'PUT', { text })).json.version]);
  assert.ok(put.savedAt >= t0.savedAt);

  const rev0 = (await dd.api('/api/status')).json.rev.history;
  assert.equal(runner(s, []).status, 0); // a batch from a terminal
  await new Promise((r) => setTimeout(r, 1000)); // past the signature cache
  assert.notEqual((await dd.api('/api/status')).json.rev.history, rev0);
  const hist = (await dd.api('/api/template')).json.history;
  assert.deepEqual(hist.map((e) => [e.v, e.hash, e.text]), [[1, put.version, text]]);

  // a dimension added since: the run shows as its olderRuns variant
  const cfg = (await dd.api('/api/config')).json.config;
  cfg.dimensions.audio = [{ id: 'loud', text: 'loud' }, { id: 'free', text: 'your choice', olderRuns: true }];
  assert.equal((await dd.api('/api/config', 'PUT', cfg)).status, 200);
  const old = (await dd.api('/api/results')).json[0];
  assert.deepEqual([old.id, old.audio, old.predates], ['opus-low__a', 'free', ['audio']]);
});

test('variants runs used: their text from the config while it matches, else read back out of the prompt they were sent', async (t) => {
  const s = sandbox({ template: 'SOURCE: {{source}}\n\nPremise: a successor to {{source}}, {{premise}}\n\nTesting: {{testing}}\n',
    dimensions: { source: [{ id: 'kart', text: 'A kart racer' }], premise: [{ id: 'succ', text: 'remade as {{source}} would be today' }],
      testing: [{ id: 'a', text: 'Test it.\n\nTwice.' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  assert.equal(runner(s, []).status, 0);
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  const ran = { source: [{ id: 'kart', text: 'A kart racer', runs: 1 }], premise: [{ id: 'succ', text: 'remade as {{source}} would be today', runs: 1 }],
    testing: [{ id: 'a', text: 'Test it.\n\nTwice.', runs: 1 }] };
  assert.deepEqual((await dd.api('/api/variants')).json, ran);
  // every text edited since and the source swapped: what ran is read back, the {{source}} in premise's text put back
  const cfg = (await dd.api('/api/config')).json.config;
  cfg.dimensions.source = [{ id: 'golf', text: 'A golf game' }];
  cfg.dimensions.premise[0].text = 'changed'; cfg.dimensions.testing[0].text = 'changed';
  assert.equal((await dd.api('/api/config', 'PUT', cfg)).status, 200);
  await new Promise((r) => setTimeout(r, 1000)); // past the signature cache
  assert.deepEqual((await dd.api('/api/variants')).json, ran);
});

test('a running batch takes changes: limits, pause and ending a run, checked first and answered with its state', async (t) => {
  const sb2 = sandbox({ dimensions: { testing: ['a', 'b', 'c'].map((id) => ({ id, text: `FAKE:sleep=1500 ${id}` })) },
    agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  const d2 = await dashboard(sb2);
  t.after(async () => { await d2.stop(); cleanup(sb2); });
  assert.equal((await d2.api('/api/adjust', 'POST', { set: { concurrency: 2 } })).status, 409); // no batch
  assert.equal((await d2.api('/api/run', 'POST', { pick: ['opus:low'], only: { testing: ['a', 'b', 'c'] }, concurrency: 2 })).status, 200);
  await waitFor(async () => (await d2.api('/api/status')).json.active.length === 2);
  assert.equal((await d2.api('/api/adjust', 'POST', { set: { concurrency: 0 } })).status, 400);
  assert.equal((await d2.api('/api/adjust', 'POST', { set: { budget: 'lots' } })).status, 400);

  const r = await d2.api('/api/adjust', 'POST', { set: { concurrency: 1, perCli: '', budget: 0, timeout: 30, paused: true }, requeue: ['opus-low__a', 'not-running'] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual({ ...r.json.state, spent: 0 }, { concurrency: 1, perCli: null, budget: null, timeout: 30, rerunFailed: false, resumeFailed: false, paused: true, overBudget: false, spent: 0, left: { claude: 1 } });
  const s = await waitFor(async () => { const x = (await d2.api('/api/status?since=0')).json; return x.active.length === 1 ? x : null; });
  assert.ok(s.log.some((l) => l.startsWith('↺ opus-low__a requeued')), s.log.join('\n'));
  assert.ok(s.log.some((l) => l.startsWith('⚙ Parallel runs: 2 → 1')));
  assert.ok(!s.log.some((l) => l.startsWith('@state')), 'state lines leaked into the log');
  assert.equal(s.planned, 3); // a requeued run is still to do
  assert.equal(s.state.paused, true);

  assert.equal((await d2.api('/api/adjust', 'POST', { set: { paused: false, concurrency: 3 } })).status, 200);
  const done = await waitFor(async () => { const x = (await d2.api('/api/status?since=0')).json; return !x.running && x.finishedAt ? x : null; });
  assert.equal(done.exitCode, 0, done.log.join('\n'));
  assert.equal(done.finished, 3);
});

test('Ctrl-C on the dashboard with agents running asks to be pressed again before it ends them', async (t) => {
  const sb3 = sandbox({ dimensions: { testing: [{ id: 'long', text: 'FAKE:sleep=20000' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  const d3 = await dashboard(sb3);
  t.after(() => cleanup(sb3));
  assert.equal((await d3.api('/api/run', 'POST', { pick: ['opus:low'], only: { testing: ['long'] }, concurrency: 1 })).status, 200);
  await waitFor(async () => (await d3.api('/api/status')).json.active.length === 1);
  const exited = new Promise((r) => d3.child.once('exit', r));
  d3.child.kill('SIGINT');
  await waitFor(() => d3.output().includes('Press Ctrl-C again within 5 seconds'));
  await new Promise((r) => setTimeout(r, 500));
  const s = (await d3.api('/api/status')).json;
  assert.equal(s.running, true); assert.equal(s.active.length, 1); // still going after one Ctrl-C
  d3.child.kill('SIGINT');
  await exited;
  assert.ok(!fs.existsSync(path.join(sb3.out, 'opus-low__long')), 'the ended run was kept');
});

// Queued batches (see run state in dashboard.mjs): a runner each, sharing the limits. A later batch gets the slots the
// earlier ones can't use and never holds them up.
const finishedSession = (dd, ms = 30000) => waitFor(async () => { const x = (await dd.api('/api/status?since=0')).json; return !x.running && x.finishedAt ? x : null; }, ms);
const mostAtOnce = (rows) => {
  const ev = rows.flatMap((r) => [[Date.parse(r.startedAt), 1], [Date.parse(r.finishedAt), -1]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let n = 0, most = 0; for (const [, d] of ev) most = Math.max(most, n += d); return most;
};

test('a queued batch starts in the slots the batches before it can\'t use, and never holds them up', async (t) => {
  const s = sandbox({ dimensions: { testing: ['x', 'q1', 'q2', 'q3'].map((id) => ({ id, text: id === 'x' ? 'brief x' : `FAKE:sleep=2000 ${id}` })) },
    agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }],
    stages: [{ id: 'plan', text: 'Plan TASK.md. FAKE:plan FAKE:sleep=1500', game: false }, { id: 'build', text: 'Build it from PLAN.md. FAKE:sleep=800' }] });
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  // 1: a plan, and the two builds waiting for it, hold 3 of the 4 slots
  assert.equal((await dd.api('/api/run', 'POST', { stages: { plan: ['opus:max'], build: ['opus:high', 'opus:low'] }, only: { testing: ['x'] }, concurrency: 4 })).status, 200);
  assert.equal((await dd.api('/api/run', 'POST', { pick: ['opus:low'], only: { testing: ['q1'] } })).status, 409); // Start, not Queue
  // 2: three 1-shot runs with no plan to wait for: one starts at once, in the slot that's left
  const q = await dd.api('/api/run', 'POST', { add: true, pick: ['opus:low'], only: { testing: ['q1', 'q2', 'q3'] } });
  assert.deepEqual([q.status, q.json.batch], [200, 2]);
  const done = await finishedSession(dd);
  assert.equal(done.exitCode, 0, done.log.join('\n'));
  assert.deepEqual(done.batches.map((b) => [b.n, b.finished]), [[1, 3], [2, 3]]);
  assert.ok(done.log.some((l) => l.startsWith('+ Batch 2 queued (1-shot: opus · low)')), done.log.join('\n'));
  const rows = (await dd.api('/api/results')).json, at = (r) => Date.parse(r.startedAt), end = (r) => Date.parse(r.finishedAt);
  const plan = rows.find((r) => r.stage === 'plan'), builds = rows.filter((r) => r.stage === 'build'), queued = rows.filter((r) => !r.stage);
  assert.deepEqual([rows.length, rows.every((r) => r.status === 'ok')], [6, true]);
  assert.ok(Math.min(...queued.map(at)) < end(plan), 'the queued batch waited for the plan');
  for (const b of builds) assert.ok(at(b) - end(plan) < 1000, `a build started ${at(b) - end(plan)} ms after its plan: held up by the queued batch`);
  assert.ok(mostAtOnce(rows) <= 4, 'more runs at once than Parallel runs');
});

test('a queued batch runs from the config and prompt as they were when it was queued', async (t) => {
  const s = sandbox({ dimensions: { testing: [{ id: 'long', text: 'FAKE:sleep=1500 long' }, { id: 'v', text: 'old text' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }] });
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  assert.equal((await dd.api('/api/run', 'POST', { pick: ['opus:low'], only: { testing: ['long'] }, concurrency: 1 })).status, 200);
  assert.equal((await dd.api('/api/run', 'POST', { add: true, pick: ['opus:low'], only: { testing: ['v'] } })).status, 200);
  // Setup changes while it waits for the slot: the variant's text and the prompt
  const c = JSON.parse(fs.readFileSync(s.config, 'utf8')); c.dimensions.testing[1].text = 'new text';
  assert.equal((await dd.api('/api/config', 'PUT', c)).status, 200);
  assert.equal((await dd.api('/api/template', 'PUT', { text: 'Changed prompt.\n\nTesting: {{testing}}\n' })).status, 200);
  const done = await finishedSession(dd);
  assert.equal(done.exitCode, 0, done.log.join('\n'));
  const sent = fs.readFileSync(path.join(s.out, 'opus-low__v', 'prompt.md'), 'utf8');
  assert.match(sent, /Make a small game[\s\S]*old text/);
  assert.doesNotMatch(sent, /new text|Changed prompt/);
});

test('no run is done twice: a queued batch leaves out the runs an earlier one has, and builds on a plan running there', async (t) => {
  const s = sandbox({ dimensions: { testing: [{ id: 'a', text: 'brief a' }] }, agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }],
    stages: [{ id: 'plan', text: 'Plan TASK.md. FAKE:plan FAKE:sleep=1000', game: false }, { id: 'build', text: 'Build it from PLAN.md.' }] });
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  assert.equal((await dd.api('/api/run', 'POST', { stages: { plan: ['opus:max'], build: ['opus:high'] }, only: { testing: ['a'] }, concurrency: 4 })).status, 200);
  // the same plan, another builder: the plan isn't made again, and the new build waits for the one being made
  assert.equal((await dd.api('/api/run', 'POST', { add: true, stages: { plan: ['opus:max'], build: ['opus:low'] }, only: { testing: ['a'] } })).status, 200);
  const done = await finishedSession(dd);
  assert.equal(done.exitCode, 0, done.log.join('\n'));
  assert.ok(done.log.some((l) => l.includes('left out: a batch queued before this one has them')), done.log.join('\n'));
  const rows = (await dd.api('/api/results')).json, plans = rows.filter((r) => r.stage === 'plan');
  assert.equal(plans.length, 1);
  assert.deepEqual(rows.filter((r) => r.stage === 'build').map((r) => [r.effort, r.parentId, r.status]).sort(),
    [['high', plans[0].id, 'ok'], ['low', plans[0].id, 'ok']]);
});

test('the queue: a batch can be taken out of it, and Stop ends every batch', async (t) => {
  const s = sandbox({ dimensions: { testing: ['l1', 'l2', 'l3'].map((id) => ({ id, text: `FAKE:sleep=20000 ${id}` })) },
    agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }] });
  const dd = await dashboard(s);
  t.after(async () => { await dd.stop(); cleanup(s); });
  assert.equal((await dd.api('/api/run', 'POST', { pick: ['opus:low'], only: { testing: ['l1'] }, concurrency: 1 })).status, 200);
  for (const v of ['l2', 'l3']) assert.equal((await dd.api('/api/run', 'POST', { add: true, pick: ['opus:low'], only: { testing: [v] } })).status, 200);
  const st = await waitFor(async () => { const x = (await dd.api('/api/status')).json; return x.active.length === 1 && x.batches.length === 3 && x.batches.every((b) => b.planned === 1) ? x : null; });
  assert.deepEqual(st.batches.map((b) => [b.n, b.active, b.left]), [[1, 1, 0], [2, 0, 1], [3, 0, 1]]); // one slot: the later ones wait
  assert.equal((await dd.api('/api/adjust', 'POST', { endBatch: 2 })).status, 200);
  await waitFor(async () => !(await dd.api('/api/status')).json.batches[1].running);
  assert.equal((await dd.api('/api/stop', 'POST', {})).status, 200);
  const done = await finishedSession(dd);
  assert.deepEqual([done.finished, done.active.length, fs.existsSync(path.join(s.out, '.stop'))], [0, 0, false]);
  assert.ok(done.log.some((l) => l.startsWith('■ Batch 2:')) && done.log.some((l) => l.startsWith('■ opus-low__l1 stopped')), done.log.join('\n'));
  assert.ok(!fs.existsSync(path.join(s.out, 'opus-low__l2')) && !fs.existsSync(path.join(s.out, 'opus-low__l3')));
});
