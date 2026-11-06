// The record in each game (run-record.mjs, schema 2) end to end through the fake CLIs: the exit interview, the AI Hub
// fields, stamping again, export, and the dashboard's run history rebuilt from the games alone.
// node --test test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sandbox, cleanup, runner, result, dashboard, ROOT } from './helpers.mjs';
import { titleWords, displayModel, hubFields, parseInterview, readRecord, renameInRecord, stampHtml, unstamped } from '../run-record.mjs';

const RECORD = path.join(ROOT, 'run-record.mjs');
const runIds = (sb, out = sb.out) => fs.readdirSync(out).filter((d) => fs.existsSync(path.join(out, d, 'result.json')));
const recordOf = (sb, id) => readRecord(fs.readFileSync(path.join(sb.out, result(sb, id).entry), 'utf8'));
const read = (dir, f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
// A prompt that asks for the exit interview, with feedback questions the way the real one lists them.
const EXIT_TEMPLATE = 'Make a small game.\n\n## Source Information\n{{sourceInfo}}\n\nTesting Feedback\n\n{{testingFeedback}}\n\n{{source}}\n';
const QUESTIONS = ['How many issues did testing catch?', 'How many were critical?', 'The most helpful test?', 'The least helpful test?'];
const exitDims = (source) => ({
  sourceInfo: [{ id: 'exit', text: 'Also save these answers as exit-interview.json beside the game.' }],
  testingFeedback: [{ id: 'tf', text: QUESTIONS.map((q) => `- ${q}`).join('\n') }],
  source, goal: [{ id: 'on', text: 'the game exists' }] });
const opus = (efforts) => ({ id: 'opus', provider: 'claude', model: 'claude-opus-5-5', efforts });

test('run-record.mjs on its own: model names, catalogue values, the block and the answers', () => {
  for (const [id, name] of [['claude-opus-5-5', 'Claude Opus 5.5'], ['gpt-6.1-sol', 'GPT-6.1 Sol'], ['gpt-6-astra-pro', 'GPT-6 Astra Pro'],
    ['gemini-4-argon', 'Gemini 4 Argon'], ['grok-4.7', 'Grok 4.7'], ['muse-wonder-1.0', 'Muse Wonder 1.0']]) assert.equal(displayModel(id), name);
  // The head gives what ai-hub reads from it, the agent's answers come on top, the runner's on top of those.
  const head = '<html><head><title>Moby-Dusk — A whaling voyage</title><meta name="description" content="Sail &amp; hunt">'
    + '<meta name="theme-color" content="#102E35"><meta name="hub:inspired-by" content="Moby-Dick"><meta name="hub:players" content="1-4"></head><body>';
  assert.deepEqual(hubFields({ id: 'x', model: 'gpt-6.1-sol', effort: 'high-uc', provider: 'codex', startedAt: 'T' }, head,
    { aiHub: { genre: 'rpg', players: '1 to 2', tags: ['Story', 'story', 'unknown'], series: 'none', type: 'tech demo', model: 'mine', provenance: {} } }),
  { name: 'Moby-Dusk', tagline: 'A whaling voyage', description: 'Sail & hunt', themeColor: '#102e35', source: 'Moby-Dick', players: '1–2',
    genre: 'RPG', tags: ['story'], type: 'Tech demo', model: 'GPT-6.1 Sol', effort: 'high-ultracode', harness: 'Codex', sourceDate: 'T',
    provenance: { sourceKind: 'cc-matrix-run', artifactId: 'x', sourceDate: 'T' } });
  // The type is always one of the catalogue's three: a genre written as the type (real games did) becomes the genre.
  const typed = (t, answers) => hubFields({ id: 'y', model: 'm', provider: 'claude', startedAt: 'T' }, `<title>X</title><meta name="hub:type" content="${t}">`, answers);
  assert.deepEqual([typed('Platformer').type, typed('Platformer').genre], ['Game', 'Platformer']);
  assert.deepEqual([typed('Party platformer').type, typed('Party platformer').genre], ['Game', undefined]);
  assert.deepEqual([typed('platformer', { aiHub: { genre: 'Puzzle' } }).type, typed('platformer', { aiHub: { genre: 'Puzzle' } }).genre], ['Game', 'Puzzle']);
  // One inert block, before </body>, replaced when stamped again; nothing in it can end it early.
  assert.equal(stampHtml(stampHtml('<!doctype html><body>x</body>', { a: 1 }), { b: '</script><!--' }),
    '<!doctype html><body>x\n<script type="application/json" id="cc-matrix-run">{"b":"\\u003c/script>\\u003c!--"}</script>\n</body>');
  assert.deepEqual(readRecord(stampHtml('<p>game', { b: '</script><!--' })), { b: '</script><!--' });
  // Answers listed under a dimension's name are paired with its questions.
  assert.deepEqual(parseInterview('{"f": ["x", "y", "z"], "g": ["w"]}', { f: ['Q1?', 'Q2?'] }).answers,
    { f: [{ question: 'Q1?', answer: 'x' }, { question: 'Q2?', answer: 'y' }, { question: null, answer: 'z' }], g: ['w'] });
  assert.match(parseInterview('[1]').error, /not a JSON object/);
  assert.match(parseInterview('{"a": ').error, /not valid JSON/);
});

test('the exit interview goes into the record, and the AI Hub fields are written the catalogue\'s way', (t) => {
  const sb = sandbox({ template: EXIT_TEMPLATE, dimensions: exitDims([{ id: 's', text: 'FAKE:hubmeta' }]), agents: [opus(['xhigh'])] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  const [id] = runIds(sb), r = result(sb, id), rec = recordOf(sb, id), dir = path.join(sb.out, id);
  assert.equal(r.exitInterview, 'ok');
  assert.equal(r.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone);
  assert.equal(rec.interview.file, 'exit-interview.json');
  const a = rec.interview.answers;
  assert.deepEqual(a.testingFeedback, QUESTIONS.map((question, i) => ({ question, answer: ['3 issues', '1 critical', 'the smoke test', 'none'][i] })));
  assert.deepEqual(a.engineFeedback, ['small', 'no', 'the loop', 'nothing', 'nothing', 'nothing']); // not a dimension here: as written
  assert.equal(a.sourceInformation.source, 'Fake Source');
  assert.equal(rec.interview.reply, read(dir, 'reply.md'));
  // The agent's answers as the catalogue writes them; the hub's session fields from the game's head; the model,
  // effort, harness and date from the runner (not the model the agent guessed).
  assert.deepEqual(rec.aiHub, { name: 'Fake Game', tagline: 'A stand-in for tests', description: 'Fake Game is a test double.', type: 'Game',
    genre: 'Shooter', source: 'Fake Source', players: '1–2', controls: 'WASD to move, Space to fire', tags: ['arcade', '2d'],
    session: '1', sessionPlayers: '1-4', model: 'Claude Opus 5.5', effort: 'xhigh', harness: 'Claude Code', sourceDate: r.startedAt,
    provenance: { sourceKind: 'cc-matrix-run', artifactId: id, sourceDate: r.startedAt } });
  // A /goal run: the prompt is TASK.md (prompt.md is the same), the goal the message sent.
  assert.equal(rec.prompt.text, read(dir, 'work/TASK.md')); assert.equal(rec.prompt.text, read(dir, 'prompt.md'));
  assert.equal(rec.prompt.goal, read(dir, 'goal.md').trim());
  assert.deepEqual(Object.keys(rec.prompt.sections), ['sourceInfo', 'testingFeedback', 'source', 'goal']);
});

test('an exit interview left out or not valid JSON is marked so, and the record keeps what there was', (t) => {
  const sb = sandbox({ template: 'Make a small game.\n\n{{x}}\n', agents: [opus(['low'])], dimensions: { x: [
    { id: 'none', text: 'Write exit-interview.json. FAKE:noexit' }, { id: 'bad', text: 'Write exit-interview.json. FAKE:badexit' }, { id: 'unasked', text: 'No interview.' }] } });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['-j', '3']).status, 0);
  const by = Object.fromEntries(runIds(sb).map((id) => [result(sb, id).x, { r: result(sb, id), rec: recordOf(sb, id) }]));
  assert.equal(by.none.r.exitInterview, 'missing'); assert.equal(by.none.rec.interview.file, null);
  assert.equal(by.bad.r.exitInterview, 'invalid'); assert.equal(by.bad.rec.interview.file, 'exit-interview.json');
  assert.match(by.bad.rec.interview.error, /not valid JSON/); assert.equal(by.bad.rec.interview.text, '{"sourceInformation": {"date": "');
  assert.ok(!('exitInterview' in by.unasked.r)); assert.equal(by.unasked.rec.interview.file, null);
  // Without the agent's answers, the AI Hub fields still have what the game's head and the runner give.
  assert.equal(by.unasked.rec.aiHub.name, 'Fake'); assert.equal(by.unasked.rec.aiHub.type, 'Game'); assert.equal(by.unasked.rec.aiHub.model, 'Claude Opus 5.5');
  assert.match(read(sb.out, 'results.csv').split('\n')[0], /,exitInterview,/);
});

test('a later stage leaves its own exit interview, not the one it was given; a plan isn\'t asked for one', (t) => {
  const stages = [{ id: 'plan', text: 'Plan what TASK.md asks. FAKE:plan', game: false }, { id: 'build', text: 'Build what TASK.md asks.' },
    { id: 'content', text: 'Add content to the game TASK.md describes. FAKE:noexit' }];
  const sb = sandbox({ template: 'Make a small game. Save your answers as exit-interview.json.\n\n{{source}}\n', dimensions: { source: [{ id: 'z', text: 'Zelda' }] },
    agents: [opus(['medium'])], stages });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['--stage', 'plan=opus:max', '--stage', 'build=opus:xhigh', '--stage', 'content=opus:medium']).status, 0);
  const all = runIds(sb).map((id) => result(sb, id)), at = (s) => all.find((r) => r.stage === s);
  assert.ok(!('exitInterview' in at('plan')));
  assert.equal(at('build').exitInterview, 'ok');
  assert.equal(at('content').exitInterview, 'missing');
  const dir = path.join(sb.out, at('content').id), rec = recordOf(sb, at('content').id);
  assert.ok(!fs.existsSync(path.join(dir, 'work', 'exit-interview.json')), 'the build\'s was not copied');
  assert.equal(rec.interview.file, null);
  assert.equal(rec.prompt.stageText, read(dir, 'prompt.md')); assert.equal(rec.prompt.text, read(dir, 'work/TASK.md'));
  assert.equal(recordOf(sb, at('build').id).interview.answers.aiHub.name, 'Fake Game');
  // A later stage's record has every step's figures, the plan's included (a plan makes no game of its own), and the
  // totals.
  const fig = (r) => [r.id, r.stage, r.wallMinutes, r.totalTokens, r.outputTokens, r.apiCostUsd ?? null];
  const plan = at('plan'), build = at('build'), madeBy = recordOf(sb, build.id).stages;
  assert.deepEqual(madeBy.steps.map((s) => [s.id, s.stage, s.wallMinutes, s.totalTokens, s.outputTokens, s.apiCostUsd]), [plan, build].map(fig));
  assert.deepEqual([madeBy.steps[0].modelName, madeBy.steps[0].effort, madeBy.steps[0].harness, madeBy.complete], ['Claude Opus 5.5', 'max', 'Claude Code', true]);
  assert.equal(madeBy.total.totalTokens, plan.totalTokens + build.totalTokens);
  assert.equal(madeBy.total.wallMinutes, Math.round((plan.wallMinutes + build.wallMinutes) * 1e6) / 1e6);
  assert.deepEqual(recordOf(sb, at('content').id).stages.steps.map((s) => s.stage), ['plan', 'build', 'content']);
  // Stamped again after the plan's run was deleted, the build keeps the plan's figures from the record already there.
  fs.rmSync(path.join(sb.out, plan.id), { recursive: true });
  assert.equal(runner(sb, ['--stamp']).status, 0);
  assert.deepEqual(recordOf(sb, build.id).stages, madeBy);
});

test('stamping again keeps the texts the run was sent, paths are written from ~, and export reads every record (schema 1 too)', (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'first text FAKE:saypath' }] }, agents: [opus(['low'])] });
  t.after(() => cleanup(sb));
  const home = { HOME: sb.dir, USERPROFILE: sb.dir };
  assert.equal(runner(sb, [], home).status, 0);
  const [id] = runIds(sb);
  // The reply names the work folder: the record has it from ~, the run's own reply.md as it was.
  if (process.platform !== 'win32') {
    assert.ok(recordOf(sb, id).interview.reply.endsWith(`The game is in ~/runs/${id}/work`));
    assert.ok(!JSON.stringify(recordOf(sb, id)).includes(sb.dir));
    assert.ok(read(path.join(sb.out, id), 'reply.md').endsWith(`The game is in ${path.join(sb.out, id, 'work')}`));
  }
  // Stamping again with nothing new leaves the game as it was (not even a new stampedAt); a change to its record
  // (here its reply) stamps it again.
  const game = path.join(sb.out, result(sb, id).entry), first = fs.readFileSync(game, 'utf8');
  for (const how of ['--stamp', '--reparse']) {
    assert.equal(runner(sb, [how], home).status, 0);
    assert.equal(fs.readFileSync(game, 'utf8'), first, how);
  }
  fs.appendFileSync(path.join(sb.out, id, 'reply.md'), '\nOne more line.');
  assert.equal(runner(sb, ['--stamp'], home).status, 0);
  assert.match(recordOf(sb, id).interview.reply, /One more line\.$/);
  // The variant's text is edited since (same short name): stamped again either way, the record keeps the text sent.
  const cfg = JSON.parse(read(sb.dir, 'config.json')); cfg.dimensions.testing[0].text = 'edited since'; fs.writeFileSync(sb.config, JSON.stringify(cfg));
  for (const how of ['--stamp', '--reparse']) {
    assert.equal(runner(sb, [how], home).status, 0);
    const rec = recordOf(sb, id);
    assert.equal(rec.prompt.sections.testing.text, 'first text FAKE:saypath', how);
    assert.equal(rec.prompt.template, 'Make a small game.\n\nTesting: {{testing}}\n', how);
  }
  // export: one JSON line per game that has a record, in schema 2's shape; a schema 1 record (stamped before) too.
  const old = path.join(sb.dir, 'old.html');
  fs.writeFileSync(old, '<!doctype html><body><p>old</p>\n<script type="application/json" id="cc-matrix-run">' + JSON.stringify({ schema: 1, tool: 'cc-matrix',
    stampedAt: '2026-11-01T00:00:00.000Z', lab: 'Anthropic', cli: 'Claude Code CLI', id: 'old-run', agent: 'opus', provider: 'claude', model: 'claude-opus-5-5',
    effort: 'medium', testing: 'a', status: 'ok', startedAt: '2026-11-01T00:00:00.000Z', variants: { testing: { id: 'a', text: 'old text' } },
    promptNumber: 3, prompt: 'the old prompt', goal: null, reply: 'old reply' }) + '</script>\n</body>');
  const ex = spawnSync(process.execPath, [RECORD, 'export', sb.out, old], { encoding: 'utf8' });
  assert.equal(ex.status, 0, ex.stderr);
  const lines = ex.stdout.trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.record.id).sort(), [id, 'old-run'].sort());
  const o = lines.find((l) => l.record.id === 'old-run');
  assert.equal(o.file, old);
  assert.equal(o.record.schema, 2); assert.equal(o.record.upgradedFrom, 1);
  assert.equal(o.record.result.model, 'claude-opus-5-5'); assert.equal(o.record.result.testing, 'a');
  assert.equal(o.record.prompt.text, 'the old prompt'); assert.equal(o.record.prompt.number, 3);
  assert.deepEqual(o.record.prompt.sections.testing, { id: 'a', text: 'old text', hash: null });
  assert.equal(o.record.interview.reply, 'old reply'); assert.equal(o.record.aiHub.model, 'Claude Opus 5.5');
});

test('--rename-variant files the runs that used an earlier text under a name of their own, in result.json and the game', async (t) => {
  const sb = sandbox({ dimensions: { testing: [{ id: 'a', text: 'first text' }] }, agents: [opus(['low'])], folderName: { fields: ['testing'], date: true } });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, []).status, 0);
  const [id] = runIds(sb), file = path.join(sb.out, result(sb, id).entry), before = fs.readFileSync(file, 'utf8'), hash = result(sb, id).variantHashes.testing;
  // The text edited by hand under the same short name: the run counts as done for the new text.
  const cfg = JSON.parse(read(sb.dir, 'config.json')), edit = (text) => { cfg.dimensions.testing[0].text = text; fs.writeFileSync(sb.config, JSON.stringify(cfg)); };
  const done = () => JSON.parse(runner(sb, ['--dry-run', '--json']).stdout.trim()).alreadyDone;
  edit('second text');
  assert.equal(done(), 1);
  // With --dry-run it only says which runs would move.
  const said = runner(sb, ['--rename-variant', 'testing:a=a-old', '--dry-run']);
  assert.equal(said.status, 0, said.all);
  assert.match(said.stdout, new RegExp(`testing "a" → "a-old": 1 run\\(s\\) \\(text ${hash}\\) would move\\n  ${id}\\n`));
  assert.equal(result(sb, id).testing, 'a');
  // Moved: the name in result.json and the game's record; the text sent, its hash and the game stay as they were.
  assert.equal(runner(sb, ['--rename-variant', 'testing:a=a-old']).status, 0);
  const r = result(sb, id), rec = recordOf(sb, id), after = fs.readFileSync(file, 'utf8');
  assert.equal(r.testing, 'a-old'); assert.equal(r.variantHashes.testing, hash);
  assert.equal(rec.result.testing, 'a-old');
  assert.deepEqual(rec.prompt.sections.testing, { id: 'a-old', text: 'first text', hash });
  assert.deepEqual(renameInRecord(readRecord(before), 'testing', 'a', 'a-old'), rec);
  assert.equal(unstamped(after), unstamped(before));
  assert.match(read(sb.out, 'results.csv'), /,a-old,/);
  assert.equal(done(), 0); // the new text runs now
  // Nothing left to move. A name runs used for other text, or a spec it can't read, is refused and nothing changes.
  assert.match(runner(sb, ['--rename-variant', 'testing:a=a-old']).stdout, /: 0 run\(s\)\n/);
  await new Promise((ok) => setTimeout(ok, 1000)); // a folder named in another second
  assert.match(runner(sb, []).all, /✔ opus-low__a__/);
  edit('third text');
  const clash = runner(sb, ['--rename-variant', 'testing:a=a-old']);
  assert.equal(clash.status, 1); assert.match(clash.all, /1 run\(s\) used testing "a-old" for other text/);
  assert.deepEqual(runIds(sb).map((x) => result(sb, x).testing).sort(), ['a', 'a-old']);
  assert.match(runner(sb, ['--rename-variant', 'testing:a']).all, /write it dimension:old=new/);
  assert.match(runner(sb, ['--rename-variant', 'audio:a=b']).all, /no dimension "audio"/);
  // Folders named without the date: a moved run keeps the folder a new run of the old name would get, and that's said.
  const plain = sandbox({ dimensions: { testing: [{ id: 'a', text: 'first text' }] }, agents: [opus(['low'])] });
  t.after(() => cleanup(plain));
  assert.equal(runner(plain, []).status, 0);
  fs.writeFileSync(plain.config, JSON.stringify({ ...JSON.parse(read(plain.dir, 'config.json')), dimensions: { testing: [{ id: 'a', text: 'second text' }] } }));
  assert.match(runner(plain, ['--rename-variant', 'testing:a=a-old', '--dry-run']).stdout, /opus-low__a {2}⚠ a new run of "a" would get this folder/);
  // A schema 1 record (stamped before 2026-11-02) keeps the name in its own places.
  assert.deepEqual(renameInRecord({ schema: 1, testing: 'a', variants: { testing: { id: 'a', text: 't' } } }, 'testing', 'a', 'b'),
    { schema: 1, testing: 'b', variants: { testing: { id: 'b', text: 't' } } });
});

test('a stage run without TASK.md: its record holds its stage\'s text as the prompt, and a rebuild doesn\'t invent a TASK.md', (t) => {
  const sb = sandbox({ template: EXIT_TEMPLATE, dimensions: exitDims([{ id: 'a', text: 'Alpha' }]), agents: [opus(['low'])],
    stages: [{ id: 'build', text: 'Build it and save exit-interview.json.', goal: 'it is built' }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['--stage', 'build=opus:low']).status, 0);
  const [id] = runIds(sb), rec = recordOf(sb, id), games = path.join(sb.dir, 'games'), out = path.join(sb.dir, 'rebuilt');
  assert.equal(read(path.join(sb.out, id), 'work/TASK.md'), null);
  assert.deepEqual([rec.prompt.text, rec.prompt.stageText], ['Build it and save exit-interview.json.\n', 'Build it and save exit-interview.json.\n']);
  fs.mkdirSync(games); fs.copyFileSync(path.join(sb.out, result(sb, id).entry), path.join(games, 'game.html'));
  assert.equal(spawnSync(process.execPath, [RECORD, 'rebuild', games, '--out', out], { encoding: 'utf8' }).status, 0);
  assert.equal(read(path.join(out, id), 'work/TASK.md'), null);
  assert.equal(read(path.join(out, id), 'work/STAGE.md'), 'Build it and save exit-interview.json.\n');
});

test('the dashboard\'s run history comes back from the games alone (run-record.mjs rebuild)', async (t) => {
  const sb = sandbox({ template: EXIT_TEMPLATE, dimensions: exitDims([{ id: 'a', text: 'Alpha' }, { id: 'b', text: 'Beta FAKE:saypath' }]),
    stages: [{ id: 'build', text: 'Build what TASK.md asks.', goal: 'it is built' }, { id: 'content', text: 'Add content to what TASK.md describes.' }],
    agents: [opus(['low', 'high-uc']), { id: 'sol', provider: 'codex', model: 'gpt-6.1-sol', efforts: ['max'] }, { id: 'grok', provider: 'grok', model: 'grok-4.7', efforts: ['high'] }] });
  t.after(() => cleanup(sb));
  assert.equal(runner(sb, ['-j', '4']).status, 0);
  assert.equal(runner(sb, ['--stage', 'build=opus:max', '--stage', 'content=sol:max']).status, 0);
  // Every game, copied out of its run folder on its own (two runs' games can share a file name).
  const ids = runIds(sb), games = path.join(sb.dir, 'games'), out = path.join(sb.dir, 'rebuilt');
  assert.equal(ids.length, 12);
  // A later stage starts from the game it was given as its agent left it: the record of the run before isn't in it.
  const content = ids.map((id) => result(sb, id)).find((r) => r.stage === 'content'), work = path.join(sb.out, content.id, 'work');
  assert.ok(read(work, 'Fake-Game-claude-opus-5-5.html').includes('<title>Fake</title>'));
  assert.equal(readRecord(read(work, 'Fake-Game-claude-opus-5-5.html')), null);
  assert.equal(readRecord(read(work, 'Fake-Game-gpt-6.1-sol.html')).id, content.id);
  ids.forEach((id, i) => { const g = result(sb, id).entry; fs.mkdirSync(path.join(games, `${i}`), { recursive: true }); fs.copyFileSync(path.join(sb.out, g), path.join(games, `${i}`, path.basename(g))); });
  const rb = spawnSync(process.execPath, [RECORD, 'rebuild', games, '--out', out], { encoding: 'utf8' });
  assert.equal(rb.status, 0, rb.stderr);
  assert.match(rb.stdout, /Rebuilt 12 run\(s\)/);
  // Each run's folder as the dashboard reads it: result.json (without the session id and plan usage), the prompt,
  // goal, reply and the game; the prompt history with its numbers.
  assert.deepEqual(runIds(sb, out).sort(), ids.sort());
  for (const id of ids) {
    const { sessionId, plan, ...want } = result(sb, id);
    assert.deepEqual(JSON.parse(read(path.join(out, id), 'result.json')), want, id);
    for (const f of ['prompt.md', 'goal.md', 'reply.md', 'work/TASK.md', 'work/STAGE.md']) assert.equal(read(path.join(out, id), f), read(path.join(sb.out, id), f), `${id}/${f}`);
    assert.equal(read(out, result(sb, id).entry), read(sb.out, result(sb, id).entry), `${id}: the game`);
    assert.equal(!!read(path.join(out, id), 'work/exit-interview.json'), !!read(path.join(sb.out, id), 'work/exit-interview.json'), `${id}: exit interview`);
  }
  assert.deepEqual(JSON.parse(read(out, 'prompt-history.json')), JSON.parse(read(sb.out, 'prompt-history.json')));
  // Rebuilding again leaves what's there as it is.
  assert.match(spawnSync(process.execPath, [RECORD, 'rebuild', games, '--out', out], { encoding: 'utf8' }).stdout, /Rebuilt 0 run\(s\).*12 left out/);
  // And the dashboard shows the same history from either folder.
  const a = await dashboard(sb), b = await dashboard({ ...sb, out });
  try {
    const rows = async (d) => Object.fromEntries((await d.api('/api/results')).json.map(({ sessionId, plan, ...r }) => [r.id, r]));
    assert.deepEqual(await rows(b), await rows(a));
    assert.deepEqual((await b.api('/api/template')).json.history, (await a.api('/api/template')).json.history);
  } finally { await a.stop(); await b.stop(); }
});

test('a game\'s title comes out of its file or folder name, from how agents really name them', () => {
  const words = (name, model, effort, sources) => titleWords(name, { model, effort, sources }).join(' ');
  const terra = ['gpt-6.1-terra', 'max'];
  assert.equal(words('Wobble Grove-Wii Fit-gpt-6.1-terra-max-20261105-001542', ...terra, ['Wii Fit', 'wii-fit']), 'Wobble Grove');
  assert.equal(words('Trauma Center: The Healing Hand-Trauma Center: Second Opinion-gpt-6.1-terra-max-20261105-013709.html', ...terra, ['Trauma Center: Second Opinion']), 'Trauma Center: The Healing Hand');
  assert.equal(words('Far-Cry-The-Heat-Far-Cry-2-gpt-6.1-terra-max-20261105-084743', ...terra, ['Far Cry 2', 'FarCry2']), 'Far Cry The Heat');
  assert.equal(words('Far Cry, Hot Skies-Far Cry 2-gpt-6.1-terra-max-20261105-073704', ...terra, [undefined, 'FarCry2']), 'Far Cry, Hot Skies');
  assert.equal(words('TeeterFit-WiiFit-claude-opus-5-5-xhigh-20261105-015601', 'claude-opus-5-5', 'xhigh', ['Wii Fit', 'wii-fit']), 'TeeterFit');
  // A name that leaves out the effort, or that's only the source and the model, says what it can.
  assert.equal(words('Bloom-Wii Fit-claude-opus-5-5-20261105-0156', 'claude-opus-5-5', 'xhigh', ['Wii Fit']), 'Bloom');
  assert.equal(words('Wii Fit-claude-opus-5-5-xhigh-20261105-015601', 'claude-opus-5-5', 'xhigh', ['Wii Fit']), '');
});
