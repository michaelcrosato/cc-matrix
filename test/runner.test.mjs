// run-matrix.mjs end to end through the fake CLIs: command lines, how each CLI gets the prompt,
// parsing, what's measured, failures, the budget, stopping, and the reports.
// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { sandbox, cleanup, runner, result, callFor, RUNNER, waitFor } from './helpers.mjs';

const one = { testing: [{ id: 'a', text: 'variant A' }] };

test('every CLI: command line, how the prompt is sent, and what is parsed', (t) => {
  const sb = sandbox({ dimensions: one, agents: [
    { id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['high', 'high-uc'] },
    { id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['max'] },
    { id: 'grok', provider: 'grok', model: 'grok-4.7', efforts: ['xhigh'] },
    { id: 'gem', provider: 'agy', model: 'gemini-4-argon', efforts: ['high'] },
    { id: 'muse', provider: 'muse', model: 'muse-wonder-1.0', efforts: ['max'] }] });
  t.after(() => cleanup(sb));
  const r = runner(sb, ['-j', '3']);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /6 runs → /);

  const claude = result(sb, 'opus-high__a');
  assert.equal(claude.status, 'ok');
  assert.equal(claude.costUsd, 0.0425);
  // two models in modelUsage: 1200+10 uncached, 9000 cache reads, 800+5 cache writes
  assert.deepEqual([claude.inputTokens, claude.cachedTokens, claude.cacheWriteTokens, claude.uncachedInputTokens, claude.outputTokens, claude.reasoningTokens, claude.totalTokens],
    [11015, 9000, 805, 1210, 660, 120, 11675]);
  assert.equal(Object.keys(claude.models).length, 2);
  assert.equal(claude.subagents, 1);
  assert.equal(claude.cliVersion, '9.9.0');
  assert.ok(claude.delivered && claude.kb > 0 && claude.files >= 2 && claude.todos === 0);
  assert.match(claude.entry, /^opus-high__a\/work\/Fake-Game-claude-opus-5-5\.html$/);
  assert.ok(fs.existsSync(path.join(sb.out, 'opus-high__a', 'reply.md')));
  assert.equal(claude.variantHashes.testing, crypto.createHash('sha1').update('variant A').digest('hex').slice(0, 8));
  const cc = callFor(sb, 'opus-high__a');
  assert.deepEqual(cc.argv.slice(0, 7), ['-p', '--output-format', 'json', '--model', 'claude-opus-5-5', '--effort', 'high']);
  assert.equal(cc.argv[cc.argv.indexOf('--settings') + 1], '{"ultracode":false}');
  assert.ok(cc.argv.includes('--dangerously-skip-permissions'));
  assert.match(cc.stdin, /Testing: variant A/); // the prompt goes in on stdin
  const uc = callFor(sb, 'opus-high-uc__a');
  assert.equal(uc.argv[uc.argv.indexOf('--settings') + 1], '{"ultracode":true}');
  assert.equal(result(sb, 'opus-high-uc__a').ultracode, true);

  const codex = result(sb, 'sol-max__a'), cx = callFor(sb, 'sol-max__a');
  assert.equal(codex.costUsd, null);
  assert.deepEqual([codex.inputTokens, codex.cachedTokens, codex.uncachedInputTokens, codex.outputTokens, codex.reasoningTokens, codex.turns], [10200, 9000, 1200, 640, 120, 1]);
  assert.deepEqual(cx.argv, ['exec', '--json', '-m', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=max', '--yolo', '-']);
  assert.match(cx.stdin, /Testing: variant A/);

  const grok = result(sb, 'grok-xhigh__a'), gx = callFor(sb, 'grok-xhigh__a');
  assert.equal(grok.costUsd, 0.0425);
  assert.equal(gx.argv[gx.argv.indexOf('--prompt-file') + 1], path.join(sb.out, 'grok-xhigh__a', 'prompt.md'));
  assert.ok(gx.argv.includes('--always-approve') && gx.argv.includes('streaming-messages-json'));

  const agy = result(sb, 'gem-high__a'), ax = callFor(sb, 'gem-high__a');
  assert.deepEqual([agy.inputTokens, agy.cachedTokens, agy.uncachedInputTokens, agy.outputTokens, agy.turns], [10200, 9000, 1200, 640, 3]);
  assert.match(ax.argv[ax.argv.indexOf('-p') + 1], /Testing: variant A/); // agy gets the prompt as an argument
  assert.equal(ax.argv[ax.argv.indexOf('--effort') + 1], 'high');

  const muse = result(sb, 'muse-max__a'), mx = callFor(sb, 'muse-max__a');
  // the main run and a subagent run report separately and add up
  assert.deepEqual([muse.inputTokens, muse.cachedTokens, muse.uncachedInputTokens, muse.outputTokens, muse.reasoningTokens, muse.turns], [10500, 9100, 1400, 690, 130, 7]);
  assert.equal(mx.argv[mx.argv.indexOf('--reasoning-effort') + 1], 'max');
  assert.ok(mx.argv.includes('--prompt-file'));

  const csv = fs.readFileSync(path.join(sb.out, 'results.csv'), 'utf8').trim().split('\n');
  assert.equal(csv.length, 7);
  assert.ok(fs.readFileSync(path.join(sb.out, 'index.html'), 'utf8').includes('Matrix runs (6)'));
});

test('/goal: the message is the command and TASK.md holds the prompt; Codex gets the plain prompt', (t) => {
  const sb = sandbox({ template: 'Build it. {{testing}}', dimensions: { ...one, goal: [{ id: 'on', text: 'the game file exists.' }] }, agents: [
    { id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] },
    { id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  const c = callFor(sb, 'opus-low__a__on');
  assert.equal(c.argv[1], '/goal Read TASK.md in the current folder and complete the task it describes. Done when: the game file exists.');
  assert.equal(c.stdin, '');
  assert.match(fs.readFileSync(path.join(sb.out, 'opus-low__a__on', 'work', 'TASK.md'), 'utf8'), /Build it\. variant A/);
  assert.ok(fs.existsSync(path.join(sb.out, 'opus-low__a__on', 'goal.md')));
  assert.equal(result(sb, 'opus-low__a__on').rounds, 2);
  const x = result(sb, 'sol-low__a__on');
  assert.equal(x.goalSkipped, true);
  assert.match(callFor(sb, 'sol-low__a__on').stdin, /Build it\. variant A/);
});

test('failures keep each CLI\'s own error message', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'f', text: 'FAKE:fail=You hit the rate limit (429)' }] }, agents: [
    { id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }, { id: 'sol', provider: 'codex', model: 'm', efforts: ['low'] },
    { id: 'gem', provider: 'agy', model: 'm', efforts: ['low'] }, { id: 'muse', provider: 'muse', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const r = runner(sb, ['-j', '4']);
  assert.equal(r.status, 0, r.all);
  for (const id of ['opus-low__f', 'sol-low__f', 'gem-low__f', 'muse-low__f']) {
    const x = result(sb, id);
    assert.equal(x.status, 'failed', id);
    assert.match(x.error, /rate limit \(429\)/, `${id}: ${x.error}`);
  }
});

test('variant text is sent exactly, $ patterns included', (t) => {
  const text = "Costs $$5, keep $& and $' and $` as typed";
  const sb = sandbox({ dimensions: { testing: [{ id: 'd', text }] }, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  assert.ok(fs.readFileSync(path.join(sb.out, 'opus-low__d', 'prompt.md'), 'utf8').includes(`Testing: ${text}`));
  const dry = JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim());
  assert.ok(dry.sample.includes(text));
});

test('one run that can\'t start fails on its own; the batch carries on', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'bad', text: 'uses {{nothing}}' }, { id: 'good', text: 'fine' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  const bad = result(sb, 'opus-low__bad');
  assert.equal(bad.status, 'failed');
  assert.match(bad.error, /Not started: Unfilled placeholders in prompt: \{\{nothing\}\}/);
  assert.equal(result(sb, 'opus-low__good').status, 'ok');
});

test('a variant whose text file is missing fails that run only', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'gone', file: 'no-such-file.md' }, { id: 'good', text: 'fine' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  assert.match(result(sb, 'opus-low__gone').error, /Not started: ENOENT/);
  assert.equal(result(sb, 'opus-low__good').status, 'ok');
});

test('an unreadable result.json counts as not done and is redone; reports skip it', (t) => {
  const sb = sandbox({ dimensions: one, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  fs.writeFileSync(path.join(sb.out, 'opus-low__a', 'result.json'), '{"id": "opus-low__a", "stat');
  assert.equal(runner(sb, ['--report']).status, 0);
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /▶ opus-low__a/);
  assert.equal(result(sb, 'opus-low__a').status, 'ok');
});

test('adding a dimension keeps finished runs done: they count as its olderRuns variant, else its first', (t) => {
  const sb = sandbox({ dimensions: one, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  const cfg = JSON.parse(fs.readFileSync(sb.config, 'utf8'));
  const setup = (dimensions, template) => { fs.writeFileSync(sb.config, JSON.stringify({ ...cfg, dimensions }));
    fs.writeFileSync(path.join(sb.dir, 'prompt.md'), template); };
  const dry = () => { const j = JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim()); return [j.count, j.alreadyDone]; };
  // the variant older runs count as can sit anywhere in the list
  setup({ ...one, audio: [{ id: 'loud', text: 'loud' }, { id: 'free', text: 'your choice', olderRuns: true }] }, 'Testing: {{testing}}\nAudio: {{audio}}\n');
  assert.deepEqual(dry(), [2, 1]);
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /· skip opus-low__a__free \(already ok as opus-low__a\)/);
  assert.match(r.all, /▶ opus-low__a__loud/);
  assert.doesNotMatch(r.all, /▶ opus-low__a__free/);
  // the spreadsheet shows the older run as the variant it counts as, like the dashboard
  const [head, ...rows] = fs.readFileSync(path.join(sb.out, 'results.csv'), 'utf8').trim().split('\n').map((l) => l.split(','));
  const audioOf = (id) => rows.find((x) => x[0] === id)?.[head.indexOf('audio')];
  assert.equal(audioOf('opus-low__a'), 'free');
  assert.equal(audioOf('opus-low__a__loud'), 'loud');
  // unmarked, they count as the first variant: loud (done twice over) and not free
  setup({ ...one, audio: [{ id: 'loud', text: 'loud' }, { id: 'free', text: 'your choice' }] }, 'Testing: {{testing}}\nAudio: {{audio}}\n');
  assert.deepEqual(dry(), [2, 1]);
  assert.match(runner(sb, ['--dry-run']).stdout, /opus-low__a__free/);
  // a dimension removed since is left out: what's left still counts as done
  setup({ audio: [{ id: 'loud', text: 'loud' }] }, 'Audio: {{audio}}\n');
  assert.deepEqual(dry(), [1, 1]);
});

test('retrying a failed run from before a dimension was added replaces it', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'FAKE:fail=boom' }] }, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  assert.equal(result(sb, 'opus-low__a').status, 'failed');
  const cfg = JSON.parse(fs.readFileSync(sb.config, 'utf8'));
  fs.writeFileSync(sb.config, JSON.stringify({ ...cfg, dimensions: { testing: [{ id: 'a', text: 'fine' }], audio: [{ id: 'free', text: 'your choice' }] } }));
  fs.writeFileSync(path.join(sb.dir, 'prompt.md'), 'Testing: {{testing}}\nAudio: {{audio}}\n');
  assert.match(runner(sb, []).all, /· skip opus-low__a__free \(already failed as opus-low__a\)/);
  const r = runner(sb, ['--rerun-failed']);
  assert.equal(r.status, 0, r.all);
  assert.equal(result(sb, 'opus-low__a__free').status, 'ok');
  assert.ok(!fs.existsSync(path.join(sb.out, 'opus-low__a')));
});

test('the prompt gets its version number when a batch first runs it: edits between batches make one version', (t) => {
  const sb = sandbox({ dimensions: { testing: ['a', 'b', 'c'].map((id) => ({ id, text: id })) }, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const tmplFile = path.join(sb.dir, 'prompt.md'), v1 = fs.readFileSync(tmplFile, 'utf8');
  const hist = () => JSON.parse(fs.readFileSync(path.join(sb.out, 'prompt-history.json'), 'utf8'));
  assert.equal(runner(sb, ['--only', 'testing=a']).status, 0);
  let h = hist();
  assert.deepEqual(h.map((e) => [e.v, e.hash, e.text]), [[1, result(sb, 'opus-low__a').promptVersion, v1]]);
  assert.ok(h[0].at <= h[0].ranAt);
  // three edits, a dry run and a batch with nothing to do: still one version
  for (const n of [1, 2, 3]) fs.writeFileSync(tmplFile, `${v1}Edit ${n}.\n`);
  runner(sb, ['--dry-run']); runner(sb, ['--only', 'testing=a']);
  assert.equal(hist().length, 1);
  // the next batch that runs something numbers the prompt as it stands then
  assert.equal(runner(sb, ['--only', 'testing=b']).status, 0);
  h = hist();
  assert.deepEqual(h.map((e) => [e.v, e.text]), [[1, v1], [2, `${v1}Edit 3.\n`]]);
  assert.equal(h[1].hash, result(sb, 'opus-low__b').promptVersion);
  // back to v1's text: it runs as v1
  fs.writeFileSync(tmplFile, v1);
  assert.equal(runner(sb, ['--only', 'testing=c']).status, 0);
  assert.deepEqual([hist().length, result(sb, 'opus-low__c').promptVersion], [2, h[0].hash]);
  // versions only known from runs (the history was lost) are numbered first, by when they ran, without their text
  fs.rmSync(path.join(sb.out, 'prompt-history.json'));
  fs.writeFileSync(tmplFile, `${v1}New.\n`);
  assert.equal(runner(sb, ['--only', 'testing=a', '--repeat', '2']).status, 0);
  h = hist();
  assert.deepEqual(h.map((e) => [e.v, e.text]), [[1, null], [2, null], [3, `${v1}New.\n`]]);
  assert.equal(h[0].ranAt, result(sb, 'opus-low__a').startedAt);
});

test('the budget stops new runs but lets running ones finish', (t) => {
  const sb = sandbox({ dimensions: { testing: [1, 2, 3, 4].map((i) => ({ id: 'v' + i, text: `FAKE:sleep=${i === 1 ? 200 : 1500} v${i}` })) },
    agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const r = runner(sb, ['-j', '2', '--budget', '0.01']);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /Budget of \$0\.01 reached/);
  // v1 finished first and spent the budget; v2 was already running and still finished OK; v3 and v4 never started
  assert.equal(result(sb, 'opus-low__v1').status, 'ok');
  assert.equal(result(sb, 'opus-low__v2').status, 'ok');
  assert.ok(!fs.existsSync(path.join(sb.out, 'opus-low__v3')) && !fs.existsSync(path.join(sb.out, 'opus-low__v4')));
});

test('a stop request ends running agents and throws their runs away', async (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'slow', text: 'FAKE:sleep=20000' }] }, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const child = spawn(process.execPath, [RUNNER, '--config', sb.config, '--out', sb.out], { env: sb.env });
  let out = ''; child.stdout.on('data', (d) => { out += d; });
  await waitFor(() => out.includes('▶ opus-low__slow'));
  fs.writeFileSync(path.join(sb.out, '.stop'), 'test');
  const code = await new Promise((r) => child.on('exit', r));
  assert.equal(code, 0);
  assert.match(out, /stopped \(discarded\)/);
  assert.ok(!fs.existsSync(path.join(sb.out, 'opus-low__slow')));
  assert.ok(!fs.existsSync(path.join(sb.out, '.stop')));
});

test('a CLI that isn\'t installed has its runs skipped, not failed', (t) => {
  const sb = sandbox({ dimensions: one, bins: { grok: '/nonexistent/grok' }, agents: [
    { id: 'grok', provider: 'grok', model: 'g', efforts: ['low'] }, { id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /Grok CLI: command "\/nonexistent\/grok" not found, so its 1 run\(s\) are skipped/);
  assert.ok(!fs.existsSync(path.join(sb.out, 'grok-low__a')));
  assert.equal(result(sb, 'opus-low__a').status, 'ok');
});

test('--per-cli keeps one CLI to N runs at a time', (t) => {
  const sb = sandbox({ dimensions: { testing: [1, 2, 3].map((i) => ({ id: 'v' + i, text: 'FAKE:sleep=400' })) }, agents: [
    { id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }, { id: 'sol', provider: 'codex', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['-j', '4', '--per-cli', '1']).status, 0);
  for (const p of ['opus', 'sol']) {
    const spans = [1, 2, 3].map((i) => result(sb, `${p}-low__v${i}`)).map((x) => [Date.parse(x.startedAt), Date.parse(x.finishedAt)]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < spans.length; i++) assert.ok(spans[i][0] >= spans[i - 1][1] - 5, `${p} runs overlapped`);
  }
});

test('--dry-run, --reparse and --smoke', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] }, agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low', 'high'] }] });
  t.after(() => cleanup(sb));
  let dry = JSON.parse(runner(sb, ['--dry-run', '--json', '--pick', 'opus:high']).stdout.trim());
  assert.equal(dry.count, 2);
  assert.deepEqual(dry.ids, ['opus-high__a', 'opus-high__b']);
  assert.equal(runner(sb, ['--pick', 'opus:high', '--only', 'testing=a']).status, 0);
  dry = JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim());
  assert.equal(dry.alreadyDone, 1);

  const f = path.join(sb.out, 'opus-high__a', 'result.json'), r = JSON.parse(fs.readFileSync(f, 'utf8'));
  fs.writeFileSync(f, JSON.stringify({ ...r, outputTokens: 0, totalTokens: 0 }));
  assert.match(runner(sb, ['--reparse']).stdout, /Reparsed 1 run/);
  assert.equal(result(sb, 'opus-high__a').outputTokens, 660);

  const smoke = JSON.parse(runner(sb, ['--smoke', 'opus:low']).stdout.trim().split('\n').pop());
  assert.equal(smoke.ok, true, JSON.stringify(smoke));
  assert.deepEqual(smoke.checks, { exit: true, file: true, reply: true, tokens: true });
  const goal = JSON.parse(runner(sb, ['--smoke', 'opus:low', '--smoke-goal']).stdout.trim().split('\n').pop());
  assert.equal(goal.ok, true, JSON.stringify(goal));
  const none = JSON.parse(runner(sb, ['--smoke', 'nobody:low']).stdout.trim());
  assert.match(none.error, /No model named "nobody"/);
});

test('the static gallery links survive # ? and % in a game\'s file name, and skip stale reviews', (t) => {
  const sb = sandbox({ dimensions: one, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  const f = path.join(sb.out, 'opus-low__a', 'result.json'), r = JSON.parse(fs.readFileSync(f, 'utf8'));
  fs.writeFileSync(f, JSON.stringify({ ...r, entry: 'opus-low__a/work/Kart #1? 100%.html' }));
  fs.writeFileSync(path.join(sb.out, 'scores.json'), JSON.stringify({ 'opus-low__a': { score: 9, notes: 'old attempt', startedAt: '2000-01-01T00:00:00.000Z' } }));
  assert.equal(runner(sb, ['--report']).status, 0);
  const html = fs.readFileSync(path.join(sb.out, 'index.html'), 'utf8');
  assert.ok(html.includes('href="opus-low__a/work/Kart%20%231%3F%20100%25.html"'), html.match(/href="[^"]*work[^"]*"/)?.[0]);
  const csv = fs.readFileSync(path.join(sb.out, 'results.csv'), 'utf8');
  assert.ok(!csv.includes('old attempt'), 'a review of an earlier attempt leaked into the CSV');
});
