// run-matrix.mjs end to end through the fake CLIs: command lines, how each CLI gets the prompt,
// parsing, what's measured, failures, the budget, stopping, and the reports.
// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { sandbox, cleanup, runner, result, calls, callFor, RUNNER, waitFor } from './helpers.mjs';

const one = { testing: [{ id: 'a', text: 'variant A' }] };

test('every CLI: command line, how the prompt is sent, and what is parsed', (t) => {
  const sb = sandbox({ dimensions: one, agents: [
    { id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['high', 'high-uc'] },
    { id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['max'] },
    { id: 'grok', provider: 'grok', model: 'grok-4.7', efforts: ['xhigh'] },
    { id: 'gem', provider: 'agy', model: 'gemini-4-argon', efforts: ['high'] },
    { id: 'muse', provider: 'muse', model: 'muse-wonder-1.0', efforts: ['max'] }],
    prices: { 'muse-wonder-1.0': { input: 1, cachedInput: 0.1, output: 2 } } }); // overrides the built-in price
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
  // from the stream: 2 responses (the first in two events), a tool call in each event, one failed, a compaction,
  // and the plan's limits at the start and end; its own cost is already at list price
  assert.deepEqual([claude.apiCalls, claude.toolCalls, claude.toolErrors, claude.compactions, claude.firstTokenMs], [2, 2, 1, 1, 900]);
  assert.deepEqual(claude.tools, { Read: 1, Edit: 1 });
  assert.deepEqual(claude.plan.windows.map((w) => [w.name, w.usedPct, w.startPct]), [['5h', 12, 10], ['week', 51, 50]]);
  assert.equal(claude.plan.windows[0].resetsAt, new Date(1793275800 * 1000).toISOString());
  assert.equal(claude.apiCostUsd, 0.0425);
  assert.equal(claude.cliVersion, '9.9.0');
  assert.ok(claude.delivered && claude.kb > 0 && claude.files >= 2 && claude.todos === 0);
  assert.match(claude.entry, /^opus-high__a\/work\/Fake-Game-claude-opus-5-5\.html$/);
  assert.ok(fs.existsSync(path.join(sb.out, 'opus-high__a', 'reply.md')));
  assert.equal(claude.variantHashes.testing, crypto.createHash('sha1').update('variant A').digest('hex').slice(0, 8));
  const cc = callFor(sb, 'opus-high__a');
  assert.deepEqual(cc.argv.slice(0, 8), ['-p', '--output-format', 'stream-json', '--verbose', '--model', 'claude-opus-5-5', '--effort', 'high']);
  assert.equal(cc.argv[cc.argv.indexOf('--settings') + 1], '{"ultracode":false}');
  assert.ok(cc.argv.includes('--dangerously-skip-permissions'));
  assert.match(cc.stdin, /Testing: variant A/); // the prompt goes in on stdin
  const uc = callFor(sb, 'opus-high-uc__a');
  assert.equal(uc.argv[uc.argv.indexOf('--settings') + 1], '{"ultracode":true}');
  assert.equal(result(sb, 'opus-high-uc__a').ultracode, true);

  const codex = result(sb, 'sol-max__a'), cx = callFor(sb, 'sol-max__a');
  assert.equal(codex.costUsd, null);
  // the main thread (10200 in, 9000 of it cached; 640 out) plus, from Codex's session logs, its subagent
  // (3000 in, 2000 cached; 300 out), not counting the history the subagent's log starts with
  assert.equal(codex.sessionLog, 'read');
  assert.deepEqual([codex.inputTokens, codex.cachedTokens, codex.uncachedInputTokens, codex.outputTokens, codex.reasoningTokens, codex.turns], [13200, 11000, 2200, 940, 170, 1]);
  assert.deepEqual(codex.helpers, { agents: 1, inputTokens: 3000, cachedTokens: 2000, cacheWriteTokens: 0, outputTokens: 300, reasoningTokens: 50, apiCalls: 2 });
  assert.deepEqual([codex.subagents, codex.apiCalls, codex.toolCalls, codex.toolErrors, codex.firstTokenMs], [1, 4, 4, 1, 1234]);
  assert.deepEqual(codex.tools, { command_execution: 3, file_change: 1 });
  assert.deepEqual(codex.plan, { tier: 'pro', windows: [
    { name: '5h', usedPct: 12, startPct: 10, resetsAt: new Date(1793275800 * 1000).toISOString() },
    { name: 'week', usedPct: 41, startPct: 40, resetsAt: new Date(1793774604 * 1000).toISOString() }] });
  // gpt-6.1-sol at $2 in, $0.10 cached, $10 out per million
  assert.equal(+codex.apiCostUsd.toFixed(6), +((2200 * 2 + 11000 * 0.1 + 940 * 10) / 1e6).toFixed(6));
  assert.deepEqual(cx.argv, ['exec', '--json', '-m', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=max', '--yolo', '-']);
  assert.match(cx.stdin, /Testing: variant A/);

  const grok = result(sb, 'grok-xhigh__a'), gx = callFor(sb, 'grok-xhigh__a');
  // its stream covers the main session; the /goal helpers' own sessions add theirs, and the planner,
  // which the main session's usage.json already includes, counts once
  assert.equal(grok.sessionLog, 'read');
  assert.equal(+grok.costUsd.toFixed(6), 0.1025);
  assert.deepEqual([grok.inputTokens, grok.cachedTokens, grok.uncachedInputTokens, grok.outputTokens, grok.reasoningTokens], [13500, 10600, 2100, 890, 530]);
  assert.deepEqual([grok.subagents, grok.apiCalls, grok.toolCalls, grok.toolErrors, grok.compactions], [2, 9, 2, 1, 1]);
  assert.deepEqual(grok.tools, { read_file: 1, search_replace: 1 });
  assert.equal(grok.plan, undefined);
  // at grok-4.7's list price ($2 in, $0.50 cached, $6 out; a cache write as input), helpers' grok-4.7-build too
  assert.equal(+grok.apiCostUsd.toFixed(6), +((1200 * 2 + 9000 * 0.5 + 800 * 2 + 640 * 6 + 400 * 2 + 100 * 0.5 + 50 * 6 + 500 * 2 + 1500 * 0.5 + 200 * 6) / 1e6).toFixed(6));
  assert.equal(gx.argv[gx.argv.indexOf('--prompt-file') + 1], path.join(sb.out, 'grok-xhigh__a', 'prompt.md'));
  assert.ok(gx.argv.includes('--always-approve') && gx.argv.includes('streaming-messages-json'));

  const agy = result(sb, 'gem-high__a'), ax = callFor(sb, 'gem-high__a');
  assert.deepEqual([agy.inputTokens, agy.cachedTokens, agy.uncachedInputTokens, agy.outputTokens, agy.turns], [10200, 9000, 1200, 640, 3]);
  assert.equal(ax.argv[ax.argv.indexOf('--output-format') + 1], 'stream-json');
  assert.deepEqual([agy.apiCalls, agy.toolCalls, agy.toolErrors], [2, 2, 1]);
  assert.deepEqual(agy.tools, { run_command: 1, view_file: 1 });
  // gemini-4-argon: $2 in, $0.10 cached, $10 out (thinking included) per million until its price doubles on 2026-12-01
  const argon = new Date().toISOString().slice(0, 10) >= '2026-12-01' ? 2 : 1;
  assert.equal(+agy.apiCostUsd.toFixed(6), +(argon * (1200 * 2 + 9000 * 0.1 + 640 * 10) / 1e6).toFixed(6));
  assert.match(ax.argv[ax.argv.indexOf('-p') + 1], /Testing: variant A/); // agy gets the prompt as an argument
  assert.equal(ax.argv[ax.argv.indexOf('--effort') + 1], 'high');

  const muse = result(sb, 'muse-max__a'), mx = callFor(sb, 'muse-max__a');
  // the main run and a subagent run report separately and add up
  assert.deepEqual([muse.inputTokens, muse.cachedTokens, muse.uncachedInputTokens, muse.outputTokens, muse.reasoningTokens, muse.turns], [10500, 9100, 1400, 690, 130, 7]);
  assert.deepEqual([muse.apiCalls, muse.toolCalls, muse.toolErrors], [7, 2, 1]);
  assert.deepEqual(muse.plan, { tier: 'Muse Code High Usage', windows: [
    { name: 'window', usedPct: 9, resetsAt: new Date(1793268601000).toISOString() }, { name: 'week', usedPct: 11, resetsAt: new Date(1793577600000).toISOString() }] });
  assert.equal(+muse.apiCostUsd.toFixed(6), +((1400 * 1 + 9100 * 0.1 + 690 * 2) / 1e6).toFixed(6)); // the config's price
  assert.equal(mx.argv[mx.argv.indexOf('--reasoning-effort') + 1], 'max');
  assert.ok(mx.argv.includes('--prompt-file'));

  const csv = fs.readFileSync(path.join(sb.out, 'results.csv'), 'utf8').trim().split('\n');
  assert.equal(csv.length, 7);
  for (const c of ['apiCostUsd', 'apiCalls', 'toolCalls', 'toolErrors', 'compactions']) assert.ok(csv[0].split(',').includes(c), c);
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

test('a variant\'s text can use placeholders: other dimensions and the run\'s own', (t) => {
  const sb = sandbox({ dimensions: { source: [{ id: 'z', text: 'Zelda' }], premise: [{ id: 'p', text: 'A successor to {{source}} by {{model}}.' }] },
    agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }], template: 'SOURCE: {{source}}\n\n## Goal\n\n{{premise}}\n' });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  assert.equal(fs.readFileSync(path.join(sb.out, 'opus-low__z__p', 'prompt.md'), 'utf8'), 'SOURCE: Zelda\n\n## Goal\n\nA successor to Zelda by m.\n');
});

test('fields left out of folder names: matched by their saved fields, and runs never share a folder', (t) => {
  const agents = [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }];
  const sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'A' }], tone: [{ id: 't1', text: 'dry' }] }, agents, template: 'Testing: {{testing}}\nTone: {{tone}}\n' });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  assert.equal(result(sb, 'opus-low__a__t1').status, 'ok');
  const cfg = JSON.parse(fs.readFileSync(sb.config, 'utf8'));
  const set = (c) => fs.writeFileSync(sb.config, JSON.stringify({ ...cfg, ...c }));
  const dry = () => JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim());
  // Left out: the name ends in a code for the left-out variants instead, and the finished run still counts.
  set({ omitFromName: ['tone'] });
  let d = dry();
  assert.match(d.ids[0], /^opus-low__a__x[0-9a-f]{6}$/);
  assert.equal(d.alreadyDone, 1);
  // Two variants of a left-out field get folders of their own.
  set({ omitFromName: ['tone'], dimensions: { testing: [{ id: 'a', text: 'A' }], tone: [{ id: 't1', text: 'dry' }, { id: 't2', text: 'warm' }] } });
  d = dry();
  assert.equal(new Set(d.ids).size, 2);
  assert.deepEqual([d.count, d.alreadyDone], [2, 1]);
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /· skip opus-low__a__x[0-9a-f]{6} \(already ok as opus-low__a__t1\)/);
  const t2 = d.ids.find((id) => fs.existsSync(path.join(sb.out, id, 'result.json')));
  assert.equal(result(sb, t2).tone, 't2');
  assert.equal(result(sb, 'opus-low__a__t1').status, 'ok'); // untouched
  // A folder already holding another combination's run is never cleared: that run doesn't start instead.
  set({ omitFromName: ['tone'], dimensions: { testing: [{ id: 'a', text: 'A' }], tone: [{ id: 't3', text: 'odd' }] } });
  const t3 = dry().ids[0];
  fs.cpSync(path.join(sb.out, t2), path.join(sb.out, t3), { recursive: true });
  const r3 = runner(sb, []);
  assert.match(r3.all, /✘ \S+ {2}not started: its folder holds a different run/);
  assert.equal(result(sb, t3).tone, 't2');
});

test('each finished game gets its record: inert, complete, private bits left out, measured without it', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'ends early? </script><b>no' }] }, agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  const r = result(sb, 'opus-low__a'), file = path.join(sb.out, r.entry);
  const page = fs.readFileSync(file, 'utf8');
  const blocks = page.match(/<script type="application\/json" id="cc-matrix-run">([\s\S]*?)<\/script>/g);
  assert.equal(blocks.length, 1);
  assert.ok(!blocks[0].slice(0, -9).includes('</script'), 'a "</script" in the data would end the block early');
  const rec = JSON.parse(blocks[0].replace(/^<script[^>]*>|<\/script>$/g, ''));
  assert.equal(rec.schema, 2); assert.equal(rec.tool, 'cc-matrix'); assert.equal(rec.id, 'opus-low__a');
  assert.equal(rec.lab, 'Anthropic'); assert.equal(rec.cli, 'Claude Code CLI');
  // result is result.json as written, without the session id and the plan's usage (the account's).
  const { sessionId, plan, ...rest } = r;
  assert.ok(sessionId && plan);
  assert.deepEqual(rec.result, rest);
  assert.deepEqual(rec.prompt.sections.testing, { id: 'a', text: 'ends early? </script><b>no', hash: r.variantHashes.testing });
  assert.equal(rec.prompt.text, fs.readFileSync(path.join(sb.out, 'opus-low__a', 'prompt.md'), 'utf8'));
  assert.equal(rec.prompt.template, 'Make a small game.\n\nTesting: {{testing}}\n');
  assert.equal(rec.prompt.number, 1); assert.equal(rec.prompt.version, r.promptVersion); assert.equal(rec.prompt.goal, null);
  assert.equal(rec.interview.reply, fs.readFileSync(path.join(sb.out, 'opus-low__a', 'reply.md'), 'utf8'));
  assert.equal(rec.interview.file, null);
  assert.equal(rec.aiHub.model, 'M'); assert.equal(rec.aiHub.harness, 'Claude Code'); assert.equal(rec.aiHub.sourceDate, r.startedAt);
  // Measured on the game as the agent left it: the record doesn't count.
  const game = page.replace(/\n?<script type="application\/json" id="cc-matrix-run">[\s\S]*?<\/script>\n?/, '');
  assert.equal(r.gameSha256, crypto.createHash('sha256').update(game).digest('hex'));
  assert.equal(r.kb, Math.round(game.length / 1024));
  // --stamp replaces it (one record, before </body>), and the game itself is left as it was.
  fs.writeFileSync(file, '<!doctype html><body><p>game</p></body></html>');
  assert.equal(runner(sb, ['--stamp']).status, 0);
  assert.equal(runner(sb, ['--stamp']).status, 0);
  const again = fs.readFileSync(file, 'utf8');
  assert.equal(again.match(/id="cc-matrix-run"/g).length, 1);
  assert.match(again, /^<!doctype html><body><p>game<\/p>\n<script type="application\/json" id="cc-matrix-run">.*<\/script>\n<\/body><\/html>$/s);
});

// Runs in stages: the config's stages, each continuing from a finished run of the one before.
const STAGES = [
  { id: 'plan', text: 'Read TASK.md and plan it. FAKE:plan', game: false },
  { id: 'build', text: 'Build what TASK.md asks, from the PLAN.md {{parentModel}} ({{parentEffort}}) wrote.' },
  { id: 'content', text: 'Add content to the game {{parentModel}} built from TASK.md. Steps: {{chain}}' },
];
const stageAgents = [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['medium'] },
  { id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['max'] }, { id: 'sonnet', provider: 'claude', model: 'claude-sonnet-5-5', efforts: ['medium'] }];
const allResults = (sb) => fs.readdirSync(sb.out).filter((d) => fs.existsSync(path.join(sb.out, d, 'result.json'))).map((d) => result(sb, d));

test('stages: a plan branches into builds and each build into content passes, each starting from its parent\'s folder once it\'s done', (t) => {
  const sb = sandbox({ dimensions: { source: [{ id: 'z', text: 'Zelda' }] }, agents: stageAgents, stages: STAGES, template: 'SOURCE: {{source}}\nFile: G-{{model}}-{{effort}}.html\n' });
  t.after(() => cleanup(sb));
  const picks = ['--stage', 'plan=opus:max', '--stage', 'build=opus:xhigh,sol:max', '--stage', 'content=sonnet:medium'];
  const dry = JSON.parse(runner(sb, [...picks, '--dry-run', '--json']).stdout.trim());
  assert.deepEqual([dry.count, dry.byStage, dry.error], [5, { plan: 1, build: 2, content: 2 }, null]);
  assert.match(dry.sample, /^Message sent:\nRead TASK.md and plan it/);
  const r = runner(sb, picks);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /In stages: plan 1, build 2, content 2/);
  const all = allResults(sb), of = (stage) => all.filter((x) => x.stage === stage);
  assert.ok(all.every((x) => x.status === 'ok'), r.all);
  // The plan: no game expected, PLAN.md measured.
  const [plan] = of('plan');
  assert.deepEqual([plan.expectsGame, plan.delivered, plan.planChars > 0, plan.chain.length], [false, false, true, 1]);
  // Builds: from the plan's folder, with TASK.md filled for their own model and the stage text naming the planner.
  for (const b of of('build')) {
    assert.equal(b.parentId, plan.id);
    assert.ok(b.startedAt >= plan.finishedAt, 'a build waits for its plan');
    const work = path.join(sb.out, b.id, 'work');
    assert.ok(fs.readFileSync(path.join(work, 'PLAN.md'), 'utf8').startsWith('# Plan by claude-opus-5-5'));
    assert.match(fs.readFileSync(path.join(work, 'TASK.md'), 'utf8'), new RegExp(`File: G-${b.model}-${b.effort}\\.html`));
    assert.equal(fs.readFileSync(path.join(sb.out, b.id, 'prompt.md'), 'utf8'), 'Build what TASK.md asks, from the PLAN.md claude-opus-5-5 (max) wrote.\n');
    assert.deepEqual([b.delivered, b.entry], [true, `${b.id}/work/Fake-Game-${b.model}.html`]);
  }
  // Content: one per build, in folders of their own; their game is the one they made, not the one they were given.
  const content = of('content');
  assert.deepEqual(content.map((c) => c.parentId).sort(), of('build').map((b) => b.id).sort());
  assert.equal(new Set(content.map((c) => c.id)).size, 2);
  for (const c of content) {
    const parent = all.find((x) => x.id === c.parentId);
    assert.ok(c.startedAt >= parent.finishedAt);
    assert.equal(c.entry, `${c.id}/work/Fake-Game-claude-sonnet-5-5.html`);
    assert.match(fs.readFileSync(path.join(sb.out, c.entry), 'utf8'), /content added by claude claude-sonnet-5-5/);
    assert.ok(fs.existsSync(path.join(sb.out, c.id, 'work', `Fake-Game-${parent.model}.html`)), 'the game it was given stays');
    assert.equal(fs.readFileSync(path.join(sb.out, c.id, 'prompt.md'), 'utf8'), `Add content to the game ${parent.model} built from TASK.md. `
      + `Steps: plan: claude-opus-5-5 max → build: ${parent.model} ${parent.effort} → content: claude-sonnet-5-5 medium\n`);
    assert.deepEqual(c.chain.map((x) => x.stage), ['plan', 'build', 'content']);
  }
  // Everything is known again by its chain: the same picks find all five done.
  assert.equal(JSON.parse(runner(sb, [...picks, '--dry-run', '--json']).stdout.trim()).alreadyDone, 5);
  const csv = fs.readFileSync(path.join(sb.out, 'results.csv'), 'utf8');
  assert.match(csv, /plan:opus-max > build:sol-max > content:sonnet-medium/);
});

test('stages: a later stage continues from runs of an earlier batch; a failed parent leaves its runs out; node_modules isn\'t copied', (t) => {
  const sb = sandbox({ dimensions: { source: [{ id: 'z', text: 'Zelda' }, { id: 'bad', text: 'FAKE:fail=plan broke' }] }, agents: stageAgents, stages: STAGES,
    template: 'SOURCE: {{source}}\n' });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['--stage', 'plan=opus:max', '--only', 'source=z']).status, 0);
  const [plan] = allResults(sb);
  fs.mkdirSync(path.join(sb.out, plan.id, 'work', 'node_modules', 'big'), { recursive: true });
  // Builds only: they continue from the plan already made.
  let dry = JSON.parse(runner(sb, ['--stage', 'build=sonnet:medium', '--dry-run', '--json']).stdout.trim());
  assert.deepEqual([dry.count, dry.byStage], [1, { build: 1 }]);
  let r = runner(sb, ['--stage', 'build=sonnet:medium']);
  assert.equal(r.status, 0, r.all);
  const build = allResults(sb).find((x) => x.stage === 'build');
  assert.deepEqual([build.status, build.parentId, build.parentStartedAt], ['ok', plan.id, plan.startedAt]);
  assert.ok(!fs.existsSync(path.join(sb.out, build.id, 'work', 'node_modules')));
  // Both sources: Zelda's plan and build are done; the other plan fails, so its build never starts.
  r = runner(sb, ['--stage', 'plan=opus:max', '--stage', 'build=sonnet:medium']);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /· skip \S+\.build\S* \(the run it continues from didn't finish OK\)/);
  const bad = allResults(sb).filter((x) => x.source === 'bad');
  assert.deepEqual(bad.map((x) => [x.stage, x.status]), [['plan', 'failed']]);
  assert.match(r.all, /Done\. 1 ran, 3 skipped/);
});

test('stages: a stage\'s goal goes to /goal with its text in STAGE.md; Codex gets the plain text', (t) => {
  const stages = [{ id: 'build', text: 'Build {{source}} as TASK.md says.', goal: 'the game for {{source}} exists' }];
  const sb = sandbox({ dimensions: { source: [{ id: 'z', text: 'Zelda' }] }, agents: stageAgents, stages, template: 'SOURCE: {{source}}\n' });
  t.after(() => cleanup(sb));
  const r = runner(sb, ['--stage', 'build=opus:high,sol:max']);
  assert.equal(r.status, 0, r.all);
  const [claudeRun] = allResults(sb).filter((x) => x.provider === 'claude'), [codexRun] = allResults(sb).filter((x) => x.provider === 'codex');
  assert.equal(callFor(sb, claudeRun.id).argv[1], '/goal Read STAGE.md in the current folder and do what it says (TASK.md describes the game). Done when: the game for Zelda exists');
  assert.equal(fs.readFileSync(path.join(sb.out, claudeRun.id, 'work', 'STAGE.md'), 'utf8'), 'Build Zelda as TASK.md says.\n');
  assert.equal(callFor(sb, codexRun.id).stdin, 'Build Zelda as TASK.md says.\n');
  assert.deepEqual([codexRun.goalSkipped, claudeRun.goalSkipped, codexRun.delivered], [true, undefined, true]);
});

test('folder names from folderName: the source and start time, then the game\'s title once it\'s made', (t) => {
  const sb = sandbox({ agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }],
    dimensions: { source: [{ id: 'zelda', text: 'Zelda-BOTW' }, { id: 'bad', text: 'Zelda-BOTW FAKE:fail=boom' }],
      package: [{ id: 'p', text: 'File: FAKE:game=MothOfTheWild-Zelda-BOTW-{{model}}-{{effort}}-{{stamp}}' }] },
    template: 'SOURCE: {{source}}\n{{package}}\n', folderName: { fields: ['source'], date: true, title: true } });
  t.after(() => cleanup(sb));
  const dry = JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim());
  assert.ok(dry.ids.every((id) => /^opus-low__(zelda|bad)__\d{8}-\d{6}$/.test(id)), dry.ids.join(' ')); // no code: what's left out has one variant
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  const ok = allResults(sb).find((x) => x.status === 'ok'), failed = allResults(sb).find((x) => x.status !== 'ok');
  // Named when it started (the same stamp the prompt gave the game), then the title once the game was there.
  const [, stamp] = ok.id.match(/^opus-low__zelda__(\d{8}-\d{6})__MothOfTheWild$/) ?? [];
  assert.ok(stamp, ok.id);
  assert.equal(ok.entry, `${ok.id}/work/MothOfTheWild-Zelda-BOTW-claude-opus-5-5-low-${stamp}.html`);
  assert.ok(fs.existsSync(path.join(sb.out, ok.entry)));
  assert.match(r.all, new RegExp(`✔ opus-low__zelda__${stamp}  .* → ${ok.id}`));
  assert.match(failed.id, /^opus-low__bad__\d{8}-\d{6}$/); // no game, no title
  // Matched by their fields: both count as done (the failed one too, without Retry failed).
  assert.equal(JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim()).alreadyDone, 2);
  // A left-out field with two variants adds the code, so runs started the same second (startGap 0, as here) don't share a folder.
  const cfg = JSON.parse(fs.readFileSync(sb.config, 'utf8'));
  cfg.dimensions.package.push({ id: 'q', text: 'File: G-{{model}}' });
  fs.writeFileSync(sb.config, JSON.stringify(cfg));
  const ids = JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim()).ids;
  assert.equal(new Set(ids).size, 4);
  assert.ok(ids.every((id) => /__\d{8}-\d{6}__x[0-9a-f]{6}$/.test(id)), ids.join(' '));
});

test('the runs of a batch start 3 s apart unless the config says otherwise, so each gets its own start time', (t) => {
  const sb = sandbox({ agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low', 'high'] }],
    dimensions: { source: [{ id: 'z', text: 'Zelda' }] }, template: 'SOURCE: {{source}}\nStarted {{stamp}}, {{date}}\n',
    folderName: { fields: ['source'], date: true }, startGap: undefined });
  t.after(() => cleanup(sb));
  const r = runner(sb, ['-j', '2']);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /\(concurrency 2, starting 3 s apart\)/);
  const [a, b] = allResults(sb).sort((x, y) => x.startedAt.localeCompare(y.startedAt));
  assert.ok(Date.parse(b.startedAt) - Date.parse(a.startedAt) >= 2900, `${a.startedAt} → ${b.startedAt}`); // not both at once, though there was room
  const stamps = [a, b].map((x) => x.id.match(/^opus-(?:low|high)__z__(\d{8}-\d{6})$/)?.[1]);
  assert.ok(stamps[0] && stamps[1] && stamps[0] !== stamps[1], stamps.join(' '));
  // {{stamp}} and {{date}} are the moment that names the folder, to the second.
  const [, y, mo, d, hh, mm, ss] = stamps[0].match(/^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)$/);
  assert.match(fs.readFileSync(path.join(sb.out, a.id, 'prompt.md'), 'utf8'), new RegExp(`Started ${stamps[0]}, ${y}-${mo}-${d} ${hh}:${mm}:${ss}\\n`));
});

test('stages with the models set for them in the config (--stages); --stage replaces a stage\'s', (t) => {
  const stages = STAGES.map((s, i) => ({ ...s, models: [['opus:max'], ['opus:xhigh', 'sol:max', 'gone:max'], ['sonnet:medium']][i] }));
  const sb = sandbox({ dimensions: { source: [{ id: 'z', text: 'Zelda' }] }, agents: stageAgents, stages, template: 'SOURCE: {{source}}\n',
    folderName: { fields: ['source'], date: true, title: true } });
  t.after(() => cleanup(sb));
  const dry = (args) => JSON.parse(runner(sb, [...args, '--dry-run', '--json']).stdout.trim());
  assert.deepEqual(dry(['--stages']).byStage, { plan: 1, build: 2, content: 2 });
  assert.deepEqual(dry(['--stages', '--stage', 'build=sol:max']).byStage, { plan: 1, build: 1, content: 1 });
  assert.match(runner(sb, ['--stages', '--dry-run']).all, /stage build names "gone", which isn't in Models; left out/);
  // Run: each later stage continues from its parent's folder, whatever that folder was renamed to.
  const r = runner(sb, ['--stages', '--stage', 'build=sol:max']);
  assert.equal(r.status, 0, r.all);
  const all = allResults(sb), plan = all.find((x) => x.stage === 'plan'), build = all.find((x) => x.stage === 'build'), content = all.find((x) => x.stage === 'content');
  assert.match(plan.id, /^opus-max\.plan__z__\d{8}-\d{6}$/); // a plan makes no game: no title
  assert.match(build.id, /^sol-max\.build__z__\d{8}-\d{6}__x[0-9a-f]{6}__Fake-Game$/);
  assert.deepEqual([build.parentId, content.parentId, content.status], [plan.id, build.id, 'ok']);
  assert.ok(fs.existsSync(path.join(sb.out, content.id, 'work', 'Fake-Game-gpt-6.1-sol.html')), 'the content pass got the build\'s game');
});

test('the dry run shows each run as the terminal session it stands for', (t) => {
  const agents = [...stageAgents, { id: 'flash', provider: 'agy', model: 'gemini-3.8-flash', efforts: ['high'] }];
  const sb = sandbox({ dimensions: { source: [{ id: 'z', text: 'Zelda' }] }, agents, stages: STAGES, template: 'SOURCE: {{source}}\n' });
  t.after(() => cleanup(sb));
  const dry = (args) => JSON.parse(runner(sb, [...args, '--dry-run', '--json']).stdout.trim());
  const block = (d, head) => d.terminal.find((b) => b.startsWith(head))?.split('\n');
  const d = dry(['--pick', 'opus:medium,sol:max,flash:high']);
  assert.equal(d.terminalTotal, 3);
  const claude = block(d, '# opus medium (Claude Code CLI)');
  assert.match(claude[1], /^d=\S+\/opus-medium__z$/);
  assert.equal(claude[2], 'mkdir -p "$d/work"');
  assert.match(claude[3], /^\(cd "\$d\/work" && \S+\/claude -p --output-format stream-json --verbose --model claude-opus-5-5 --effort medium --settings '\{"ultracode":false\}' --dangerously-skip-permissions < \.\.\/prompt\.md\)$/);
  assert.match(block(d, '# sol max (Codex CLI)')[3], /\/codex exec --json -m gpt-6\.1-sol -c model_reasoning_effort=max --yolo - < \.\.\/prompt\.md\)$/);
  assert.match(block(d, '# flash high (Antigravity CLI)')[3], /\/agy -p "\$\(cat \.\.\/prompt\.md\)" --output-format stream-json --model gemini-3\.8-flash --effort high --dangerously-skip-permissions\)$/);
  // A later stage starts in a copy of the folder of the run it continues from.
  const s = dry(['--stage', 'plan=opus:max', '--stage', 'build=sol:max']), plan = s.ids.find((id) => id.includes('.plan'));
  const build = block(s, '# sol max · 2 build (Codex CLI)');
  assert.ok(build[2].startsWith(`cp -r `) && build[2].includes(`${plan}/work "$d/work"`), build[2]);
  assert.match(runner(sb, ['--pick', 'opus:medium', '--dry-run']).stdout, /--- in a terminal \(every run not done yet\) ---\n# opus medium/);
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

test('--resume-failed: a Claude run that stopped partway carries on with its session, and its parts add up', (t) => {
  const sb = sandbox({ template: 'Build it. {{testing}}', agents: [{ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts: ['low'] }],
    dimensions: { testing: [{ id: 'a', text: 'FAKE:limit' }, { id: 'b', text: 'FAKE:limit=start' }], goal: [{ id: 'on', text: 'the game file exists.' }] } });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  const id = 'opus-low__a__on', dir = path.join(sb.out, id), first = result(sb, id);
  assert.equal(first.status, 'failed');
  assert.match(first.error, /hit your 5-hour limit/); // the limit's own message, not "exit code 1"
  assert.equal(first.outputTokens, 660);
  assert.equal(result(sb, 'opus-low__b__on').outputTokens, 0);

  // Only the one that got partway resumes, and only with time left of its limit.
  let dry = JSON.parse(runner(sb, ['--dry-run', '--json', '--resume-failed']).stdout.trim());
  assert.deepEqual([dry.alreadyDone, dry.resumes], [1, 1]);
  dry = JSON.parse(runner(sb, ['--dry-run', '--json', '--resume-failed', '--timeout', '0.0001']).stdout.trim());
  assert.deepEqual([dry.alreadyDone, dry.resumes], [2, 0]);

  const r = runner(sb, ['--resume-failed']);
  assert.equal(r.status, 0, r.all);
  assert.match(r.all, /Of those, 1 failed partway and resume their session/);
  assert.match(r.all, /▶ opus-low__a__on {2}\(resuming its session, part 2\)/);
  assert.match(r.all, /· skip opus-low__b__on \(already failed\)/);
  // The same session, sent its /goal again, in the same folder: the work from before is still there.
  const c = calls(sb).filter((x) => x.cwd === path.join(dir, 'work')).pop();
  assert.deepEqual(c.argv.slice(0, 4), ['-p', fs.readFileSync(path.join(dir, 'goal.md'), 'utf8').trim(), '--resume', 'fake-session']);
  const x = result(sb, id);
  assert.equal(x.status, 'ok');
  assert.ok(fs.existsSync(path.join(dir, 'work', 'src', 'partial.js')) && x.delivered);
  assert.match(fs.readFileSync(path.join(dir, 'agent.out'), 'utf8'), /5-hour limit/);
  assert.match(fs.readFileSync(path.join(dir, 'reply.md'), 'utf8'), /Source Information/);
  assert.deepEqual([x.resumes, x.parts.length, x.startedAt, x.promptVersion], [1, 2, first.startedAt, first.promptVersion]);
  assert.ok(Math.abs(x.wallMinutes - x.parts[0].wallMinutes - x.parts[1].wallMinutes) < 1e-9);
  // Resumed, Claude Code reports the session's totals so far; each part counts once, so the run's cost is
  // what the session cost in the end.
  const sum = (o) => [o.costUsd, o.outputTokens, o.inputTokens, o.turns, o.toolCalls, o.toolErrors, o.compactions, o.apiCalls, o.subagents].map((v) => +v.toFixed(6));
  const expected = [0.085, 1320, 22030, 8, 4, 2, 2, 4, 2];
  assert.deepEqual(sum(x), expected);
  assert.deepEqual(x.tools, { Read: 2, Edit: 2 });
  assert.equal(+x.models['claude-opus-5-5'].costUsd.toFixed(6), 0.08);
  assert.equal(+x.apiMinutes.toFixed(6), 0.05);
  assert.equal(x.firstTokenMs, 900);

  // --reparse reads each part again, with what its session had used before.
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ ...x, costUsd: 1, outputTokens: 1 }));
  assert.match(runner(sb, ['--reparse']).stdout, /Reparsed 2 run/);
  assert.deepEqual(sum(result(sb, id)), expected);

  // With Retry failed too, one that can't resume starts over.
  const again = runner(sb, ['--resume-failed', '--rerun-failed']);
  assert.match(again.all, /^▶ opus-low__b__on$/m);
  assert.equal(calls(sb).filter((y) => y.cwd === path.join(sb.out, 'opus-low__b__on', 'work')).pop().argv.includes('--resume'), false);
  assert.match(again.all, /· skip opus-low__a__on \(already ok\)/);
});

test('a resumed run ended mid-way stays as it was; Resume failed turned on mid-batch queues the ones skipped earlier', async (t) => {
  const sb = sandbox({ agents: [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }], dimensions: { testing: [{ id: 'a', text: 'FAKE:limit FAKE:sleep=1500' }, { id: 's', text: 'FAKE:sleep=1200' }],
    goal: [{ id: 'on', text: 'done.' }] } });
  t.after(() => cleanup(sb));
  const id = 'opus-low__a__on', res = path.join(sb.out, id, 'result.json');
  assert.equal(runner(sb, ['--only', 'testing=a']).status, 0);
  const before = fs.readFileSync(res, 'utf8');

  const c = controlled(sb, ['--resume-failed', '--only', 'testing=a']);
  await waitFor(() => c.out.includes(`▶ ${id}`));
  c.send({ drop: [id] });
  assert.equal(await c.exit, 0, c.out);
  assert.match(c.out, /■ opus-low__a__on stopped \(this part discarded; it can be resumed again\)/);
  assert.equal(fs.readFileSync(res, 'utf8'), before);
  assert.ok(!fs.existsSync(path.join(sb.out, id, 'agent.2.out')));

  const d = controlled(sb, ['-j', '1']);
  await waitFor(() => d.out.includes('▶ opus-low__s__on'));
  assert.match(d.out, /· skip opus-low__a__on \(already failed\)/);
  d.send({ set: { resumeFailed: true } });
  assert.equal(await d.exit, 0, d.out);
  assert.match(d.out, /⚙ Resume failed: on \(1 skipped earlier are queued again\)/);
  assert.equal(d.state().resumeFailed, true);
  const x = result(sb, id);
  assert.deepEqual([x.status, x.resumes], ['ok', 1]);
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

test('--reparse reads the session logs again, and keeps a run\'s figures once its log is gone', (t) => {
  const sb = sandbox({ dimensions: one, agents: [{ id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['max'] },
    { id: 'grok', provider: 'grok', model: 'grok-4.7', efforts: ['xhigh'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  // as if made before the runner read session logs: the CLI's own figures only
  for (const id of ['sol-max__a', 'grok-xhigh__a']) {
    const f = path.join(sb.out, id, 'result.json'), { helpers, sessionLog, ...r } = JSON.parse(fs.readFileSync(f, 'utf8'));
    fs.writeFileSync(f, JSON.stringify({ ...r, inputTokens: 1, costUsd: r.provider === 'grok' ? 0.0425 : null }));
  }
  assert.match(runner(sb, ['--reparse']).stdout, /Reparsed 2 run/);
  assert.equal(result(sb, 'sol-max__a').inputTokens, 13200);
  assert.equal(+result(sb, 'grok-xhigh__a').costUsd.toFixed(6), 0.1025);
  // logs cleaned up since: the figures read from them stay
  fs.rmSync(path.join(sb.dir, 'codex-home'), { recursive: true });
  fs.rmSync(path.join(sb.dir, 'grok-home'), { recursive: true });
  const again = runner(sb, ['--reparse']).stdout;
  assert.match(again, /sol-max__a: session log not found now; kept its figures/);
  assert.equal(result(sb, 'sol-max__a').inputTokens, 13200);
  assert.equal(result(sb, 'grok-xhigh__a').helpers.agents, 2);
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

// ------------------------------------------------- changes mid-batch (--control)
// The runner the way the dashboard drives it: changes go in as JSON lines on stdin.
function controlled(sb, args) {
  const child = spawn(process.execPath, [RUNNER, '--config', sb.config, '--out', sb.out, '--control', ...args], { env: sb.env });
  const c = { child, out: '', exit: new Promise((r) => child.on('exit', r)) };
  child.stdout.on('data', (d) => { c.out += d; }); child.stderr.on('data', (d) => { c.out += d; });
  c.send = (msg) => child.stdin.write(JSON.stringify(msg) + '\n');
  c.count = (s) => c.out.split('\n').filter((l) => l.startsWith(s)).length;
  c.state = () => JSON.parse(c.out.split('\n').filter((l) => l.startsWith('@state ')).pop().slice(7));
  return c;
}
const slow = (ms, ...ids) => ({ testing: ids.map((id) => ({ id, text: `FAKE:sleep=${ms} ${id}` })) });
const opus = [{ id: 'opus', provider: 'claude', model: 'm', efforts: ['low'] }];
const span = (sb, id) => { const r = result(sb, id); return [Date.parse(r.startedAt), Date.parse(r.finishedAt)]; };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

test('parallel runs lowered mid-batch: the running ones finish, and no new one starts until there is room', async (t) => {
  const sb = sandbox({ dimensions: slow(1000, 'v1', 'v2', 'v3', 'v4', 'v5'), agents: opus });
  t.after(() => cleanup(sb));
  const c = controlled(sb, ['-j', '3']);
  await waitFor(() => c.count('▶ ') === 3);
  c.send({ set: { concurrency: 1 } });
  assert.equal(await c.exit, 0, c.out);
  assert.match(c.out, /⚙ Parallel runs: 3 → 1 \(3 still running; no new one starts until fewer than 1 are\)/);
  const first = ['v1', 'v2', 'v3'].map((v) => span(sb, `opus-low__${v}`)), v4 = span(sb, 'opus-low__v4'), v5 = span(sb, 'opus-low__v5');
  for (const s of first) assert.equal(result(sb, `opus-low__v${first.indexOf(s) + 1}`).status, 'ok');
  assert.ok(v4[0] >= Math.max(...first.map((s) => s[1])) - 5, 'v4 started before the three running were done');
  assert.ok(v5[0] >= v4[1] - 5, 'v5 overlapped v4 at 1 parallel run');
  assert.equal(c.state().concurrency, 1);
});

test('parallel runs raised mid-batch: queued runs start right away', async (t) => {
  const sb = sandbox({ dimensions: slow(1500, 'v1', 'v2', 'v3'), agents: opus });
  t.after(() => cleanup(sb));
  const c = controlled(sb, ['-j', '1']);
  await waitFor(() => c.out.includes('▶ opus-low__v1'));
  c.send({ set: { concurrency: 3 } });
  assert.equal(await c.exit, 0, c.out);
  const v1 = span(sb, 'opus-low__v1');
  for (const v of ['v2', 'v3']) assert.ok(span(sb, `opus-low__${v}`)[0] < v1[1], `${v} waited for v1`);
});

test('pause holds the queue; a requeued run starts over after resume', async (t) => {
  const sb = sandbox({ dimensions: slow(1200, 'a', 'b', 'c'), agents: opus });
  t.after(() => cleanup(sb));
  const c = controlled(sb, ['-j', '2']);
  await waitFor(() => c.count('▶ ') === 2);
  c.send({ set: { paused: true }, requeue: ['opus-low__a'] });
  await waitFor(() => c.out.includes('↺ opus-low__a requeued'));
  await waitFor(() => c.out.includes('✔ opus-low__b'));
  await pause(400);
  assert.equal(c.count('▶ '), 2, 'a run started while paused');
  assert.equal(c.state().paused, true);
  assert.deepEqual(c.state().left, { claude: 2 }); // a (requeued) and c
  c.send({ set: { paused: false } });
  assert.equal(await c.exit, 0, c.out);
  assert.equal(c.count('▶ opus-low__a'), 2);
  for (const v of ['a', 'b', 'c']) assert.equal(result(sb, `opus-low__${v}`).status, 'ok');
  assert.match(c.out, /⚙ Paused: no new runs start \(1 still running\)[\s\S]*⚙ Resumed/);
});

test('a time limit set mid-batch: new runs only, or the running ones too (counted from their start)', async (t) => {
  const sb = sandbox({ dimensions: slow(2500, 'a', 'b', 'c'), agents: opus });
  t.after(() => cleanup(sb));
  const c = controlled(sb, ['-j', '2']);
  await waitFor(() => c.count('▶ ') === 2);
  c.send({ set: { timeout: 0.02 } }); // 1.2 s, for runs that start from now
  assert.equal(await c.exit, 0, c.out);
  assert.match(c.out, /⚙ Time limit: none → 0\.02 min, for runs that start from now/);
  assert.equal(result(sb, 'opus-low__a').status, 'ok');
  assert.equal(result(sb, 'opus-low__b').status, 'ok');
  const timed = result(sb, 'opus-low__c');
  assert.equal(timed.status, 'failed');
  assert.match(timed.error, /timed out/);

  const sb2 = sandbox({ dimensions: slow(20000, 'long'), agents: opus });
  t.after(() => cleanup(sb2));
  const c2 = controlled(sb2, []);
  await waitFor(() => c2.out.includes('▶ opus-low__long'));
  c2.send({ set: { timeout: 0.01 }, timeoutRunning: true });
  assert.equal(await c2.exit, 0, c2.out);
  assert.match(c2.out, /also for the 1 running/);
  assert.match(result(sb2, 'opus-low__long').error, /timed out/);
});

test('Codex ended by the time limit: failed though it exits 0, with its tokens from the session log', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'FAKE:hang' }] }, agents: [{ id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['max'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['--timeout', '0.02']).status, 0); // 1.2 s
  const r = result(sb, 'sol-max__a');
  assert.deepEqual([r.exitCode, r.status, r.turns], [0, 'failed', 0]);
  assert.match(r.error, /timed out/);
  // it never printed the turn's usage: the main thread's (10200 in, 9000 cached; 640 out) comes from its
  // session log, and its subagent's is added as usual
  assert.deepEqual([r.inputTokens, r.cachedTokens, r.uncachedInputTokens, r.outputTokens, r.reasoningTokens], [13200, 11000, 2200, 940, 170]);
  assert.equal(+r.apiCostUsd.toFixed(6), +((2200 * 2 + 11000 * 0.1 + 940 * 10) / 1e6).toFixed(6));
});

test('raising a spent budget mid-batch lets new runs start again', async (t) => {
  const sb = sandbox({ dimensions: { testing: [['v1', 100], ['v2', 2500], ['v3', 100], ['v4', 100]].map(([id, ms]) => ({ id, text: `FAKE:sleep=${ms} ${id}` })) }, agents: opus });
  t.after(() => cleanup(sb));
  const c = controlled(sb, ['-j', '2', '--budget', '0.01']);
  await waitFor(() => c.out.includes('Budget of $0.01 reached'));
  assert.equal(c.state().overBudget, true);
  c.send({ set: { budget: 5 } });
  assert.equal(await c.exit, 0, c.out);
  assert.match(c.out, /⚙ Budget: \$0\.01 → \$5 \(spent \$0\.04\): new runs start again/);
  for (const v of ['v1', 'v2', 'v3', 'v4']) assert.equal(result(sb, `opus-low__${v}`).status, 'ok');
});

test('Retry failed turned on mid-batch queues the failed runs skipped earlier', async (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'f', text: 'FAKE:fail=boom' }, { id: 's', text: 'FAKE:sleep=1200' }] }, agents: opus });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['--only', 'testing=f']).status, 0);
  const before = result(sb, 'opus-low__f').startedAt;
  const c = controlled(sb, ['-j', '1']);
  await waitFor(() => c.out.includes('▶ opus-low__s'));
  assert.match(c.out, /· skip opus-low__f \(already failed\)/);
  c.send({ set: { rerunFailed: true } });
  assert.equal(await c.exit, 0, c.out);
  assert.match(c.out, /⚙ Retry failed: on \(1 skipped earlier are queued again\)/);
  assert.match(c.out, /Done\. 2 ran, 0 skipped/);
  assert.notEqual(result(sb, 'opus-low__f').startedAt, before);
});

test('a running run can be dropped, and a CLI\'s queued runs left out of the batch', async (t) => {
  const sb = sandbox({ dimensions: slow(1200, 'a', 'b'), agents: [...opus, { id: 'sol', provider: 'codex', model: 'm', efforts: ['low'] }] });
  t.after(() => cleanup(sb));
  const c = controlled(sb, ['-j', '1']);
  await waitFor(() => c.out.includes('▶ opus-low__a'));
  c.send({ drop: ['opus-low__a'], skipCli: ['codex'] });
  assert.equal(await c.exit, 0, c.out);
  assert.match(c.out, /■ opus-low__a stopped \(discarded\)/);
  assert.match(c.out, /⚙ Codex CLI: 2 queued run\(s\) left out of this batch/);
  assert.ok(!fs.existsSync(path.join(sb.out, 'opus-low__a')));
  assert.ok(!fs.existsSync(path.join(sb.out, 'sol-low__a')) && !fs.existsSync(path.join(sb.out, 'sol-low__b')));
  assert.equal(result(sb, 'opus-low__b').status, 'ok');
  assert.deepEqual(c.state().left, {});
});

test('without --control nothing reads stdin and no state lines are printed', (t) => {
  const sb = sandbox({ dimensions: one, agents: opus });
  t.after(() => cleanup(sb));
  const r = runner(sb, []);
  assert.equal(r.status, 0, r.all);
  assert.ok(!r.all.includes('@state'));
});

test('max per CLI lowered mid-batch: the running ones finish, then that CLI stays at the new limit', async (t) => {
  const sb = sandbox({ dimensions: slow(1000, 'a', 'b', 'c', 'd', 'e', 'f'), agents: opus });
  t.after(() => cleanup(sb));
  const c = controlled(sb, ['-j', '3']);
  await waitFor(() => c.count('▶ ') === 3);
  c.send({ set: { perCli: 1 } });
  assert.equal(await c.exit, 0, c.out);
  assert.match(c.out, /⚙ Max per CLI: none → 1/);
  const spans = ['a', 'b', 'c', 'd', 'e', 'f'].map((v) => span(sb, `opus-low__${v}`)).sort((x, y) => x[0] - y[0]);
  const firstEnd = Math.max(...spans.slice(0, 3).map((s) => s[1]));
  for (let i = 3; i < spans.length; i++) {
    assert.ok(spans[i][0] >= firstEnd - 5, 'a run started before the three running were done');
    if (i > 3) assert.ok(spans[i][0] >= spans[i - 1][1] - 5, 'runs of one CLI overlapped at max 1 per CLI');
  }
});

test('Ctrl-C with agents running asks to be pressed again; under the dashboard it is left to the dashboard', async (t) => {
  const sb = sandbox({ dimensions: slow(20000, 'long'), agents: opus });
  t.after(() => cleanup(sb));
  const child = spawn(process.execPath, [RUNNER, '--config', sb.config, '--out', sb.out], { env: sb.env });
  let out = ''; child.stdout.on('data', (d) => { out += d; });
  const exit = new Promise((r) => child.on('exit', r));
  await waitFor(() => out.includes('▶ opus-low__long'));
  child.kill('SIGINT');
  await waitFor(() => out.includes('press Ctrl-C again within 5 s'));
  await pause(300);
  assert.equal(child.exitCode, null, 'one Ctrl-C ended the batch');
  child.kill('SIGINT');
  assert.equal(await exit, 0);
  assert.match(out, /■ opus-low__long stopped \(discarded\)/);

  // The dashboard's runner ignores Ctrl-C, even twice; the dashboard stops it with runs/.stop.
  const c = controlled(sb, []);
  await waitFor(() => c.out.includes('▶ opus-low__long'));
  c.child.kill('SIGINT'); c.child.kill('SIGINT');
  await pause(500);
  assert.equal(c.child.exitCode, null, 'Ctrl-C reached past the dashboard');
  assert.ok(!c.out.includes('stopped'));
  fs.writeFileSync(path.join(sb.out, '.stop'), 'test');
  assert.equal(await c.exit, 0);
  assert.match(c.out, /■ opus-low__long stopped \(discarded\)/);
});
