// fake.mjs: stands in for claude, codex, grok, agy and muse so the runner and the dashboard can be
// tested end to end without spending anything. Each wrapper in this folder calls run('<cli>').
// It reads the prompt the way the real CLI gets it (stdin, --prompt-file, the -p argument, or
// TASK.md for /goal), writes a small game into the work folder and prints that CLI's output format.
//
// Directives anywhere in the prompt (usually a variant's text) steer one run:
//   FAKE:fail=<message>   exit 1 with this error, in the CLI's own error format
//   FAKE:sleep=<ms>       take this long (default FAKE_SLEEP_MS, else 150)
//   FAKE:hang             codex: write its session logs, then work until stopped and exit 0 like the real one,
//                         never printing the turn's usage. claude (not when resumed): get going (a response and a
//                         dev file, the response in its transcript as it's made, like the real one), then work until
//                         stopped, never printing the result; FAKE:hang=state also saves the session's totals as it stops.
//                         FAKE:hang=alone: get going, then a second later finish the game on its own (its last response
//                         and the session's totals in its transcript, like a real one left going after its runner died),
//                         printing nothing more, and exit 0
//   FAKE:nogame           finish OK without writing a game file
//   FAKE:noreply          finish OK with an empty final reply
//   FAKE:todo             leave a TODO in the game
//   FAKE:limit            claude: work a while (a dev file, tokens), then stop on the 5-hour usage limit
//   FAKE:limit=start      claude: stop on the usage limit at the first request, having done nothing
//   FAKE:plan             write PLAN.md instead of a game (a planning stage)
//   FAKE:game=<name>      name the game file <name>.html (default Fake-Game-<model>.html)
//   FAKE:noexit           leave no exit-interview.json (written beside the game whenever the prompt names that file)
//   FAKE:badexit          leave an exit-interview.json that isn't valid JSON
//   FAKE:hubmeta          put AI Hub session <meta> tags (hub:session, hub:session-players, hub:players) in the game's head
//   FAKE:saypath          end the reply with the work folder's full path
//   FAKE:noreview         leave no planner-exit-interview.json (written whenever the prompt names that file)
//   FAKE:goal=unmet       claude with /goal: its transcript has 9 goal checks that weren't met and Claude Code ending the
//                         turn itself (by default, one check that was)
// A run in stages gets its stage's text as the message (or in STAGE.md, with /goal) and the brief in TASK.md;
// both are read. Given a game already (a later stage), the fake adds to it, so the game it leaves is its own.
// FAKE_LOG=<file> appends {cli, argv, cwd, stdin} per call, for tests to check the command line.
// With CODEX_HOME or GROK_HOME set, codex and grok also write session logs there the way the real ones
// do (a Codex subagent thread; Grok /goal helper sessions), for the runner to find. With CLAUDE_CONFIG_DIR
// set, claude keeps its session's transcript there and `--resume <id>` carries on with it like the real
// one: the limit has passed, and the totals it reports include what the session used before.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readStdin = () => new Promise((resolve) => {
  if (process.stdin.isTTY) return resolve('');
  let s = ''; process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { s += d; }); process.stdin.on('end', () => resolve(s)); process.stdin.on('error', () => resolve(s));
});
const after = (argv, flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
const line = (o) => process.stdout.write(JSON.stringify(o) + '\n');

const MODELS = {
  codex: { models: [
    { slug: 'gpt-6.1-sol', display_name: 'GPT-6.1 Sol', visibility: 'list', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'medium' }, { effort: 'high' }, { effort: 'xhigh' }, { effort: 'max' }] },
    { slug: 'gpt-6-luna', display_name: 'GPT-6 Luna', visibility: 'list', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'medium' }, { effort: 'high' }] },
    { slug: 'gpt-6.1-terra', display_name: 'GPT-6.1 Terra', visibility: 'list', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'medium' }, { effort: 'high' }, { effort: 'xhigh' }, { effort: 'max' }] },
    { slug: 'gpt-6-astra', display_name: 'GPT-6 Astra', visibility: 'list', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'medium' }, { effort: 'high' }, { effort: 'xhigh' }, { effort: 'max' }] },
    { slug: 'gpt-hidden', display_name: 'Hidden', visibility: 'hide', supported_reasoning_levels: [] }] },
  grok: '  * grok-4.7 (default)\n  - grok-4.6\n',
  agy: 'gemini-4-argon-low\tGemini 4 Argon (Low)\ngemini-4-argon-medium\tGemini 4 Argon (Medium)\ngemini-4-argon-high\tGemini 4 Argon (High)\ngemini-3.8-flash-high\tGemini 3.8 Flash (High)\n',
};

// An exit interview the way an agent writes one: answers in the shape the prompt gives, some of them not quite the
// catalogue's way (a lowercase type and genre, "1-2" players, tags as one string with a repeat, a model it guessed).
const EXIT = (cli, model) => ({
  sourceInformation: { date: '2026-11-02 10:00', source: 'Fake Source', genre: 'shooter', perspective: 'top-down', tech: 'canvas 2D',
    artDirection: 'flat', animation: 'tweens', audio: 'none', online: 'none', testing: 'a smoke test', research: 'none',
    environment: `${cli} (fake)`, model, usage: 'unknown' },
  testingFeedback: ['3 issues', '1 critical', 'the smoke test', 'none'],
  engineFeedback: ['small', 'no', 'the loop', 'nothing', 'nothing', 'nothing'],
  promptFeedback: ['clear', 'nothing', 'the game', 'a real play-test'],
  aiHub: { name: 'Fake Game', tagline: 'A stand-in for tests', description: 'Fake Game is a test double.', type: 'game', genre: 'shooter',
    source: 'Fake Source', series: '', players: '1-2', controls: ['WASD to move', 'Space to fire'], tags: 'Arcade, 2D, arcade', model: 'a guess' },
});

export async function run(cli) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--version') return console.log(`${cli} ${process.env.FAKE_VERSION ?? '9.9.0'} (fake)`);
  if (argv[0] === 'update') return console.log(`${cli} is up to date (fake)`);
  if (cli === 'codex' && argv[0] === 'debug' && argv[1] === 'models') return console.log(JSON.stringify(MODELS.codex));
  if ((cli === 'grok' || cli === 'agy') && argv[0] === 'models') return process.stdout.write(MODELS[cli]);

  // The message: stdin (claude without /goal, codex), a file (grok, muse) or an argument (agy, /goal).
  const stdin = await readStdin();
  const msg = cli === 'codex' ? stdin
    : cli === 'claude' ? (argv[1] && argv[1] !== '--output-format' ? argv[1] : stdin)
    : cli === 'agy' ? after(argv, '-p')
    : after(argv, '--prompt-file') ? fs.readFileSync(after(argv, '--prompt-file'), 'utf8')
    : cli === 'grok' ? after(argv, '-p') : argv[argv.length - 1];
  const goal = /^\/goal /.test(msg ?? '');
  const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const prompt = goal ? (/STAGE\.md/.test(msg) ? `${read('STAGE.md')}\n${read('TASK.md')}` : read('TASK.md'))
    : `${msg ?? ''}${/TASK\.md/.test(msg ?? '') ? `\n${read('TASK.md')}` : ''}`;
  // env: what keeps a run on its own (the runner's isolate), as the CLI got it.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(DISPLAY|WAYLAND_DISPLAY|CLAUDE_CODE_DISABLE_(AUTO_MEMORY|CLAUDE_MDS)|GROK_(MEMORY|CLAUDE_\w+_ENABLED))$/.test(k)));
  if (process.env.FAKE_LOG) fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ cli, argv, cwd: process.cwd(), stdin, goal, env }) + '\n');

  const fail = prompt.match(/FAKE:fail=([^\n]*)/)?.[1];
  // claude --resume <id>: the same session, so the usage limit it stopped on has passed.
  const resume = cli === 'claude' ? after(argv, '--resume') : undefined;
  const limit = cli === 'claude' && !resume ? prompt.match(/FAKE:limit(=start)?/) : null;
  const hang = cli === 'claude' && !resume ? prompt.match(/FAKE:hang(=state|=alone)?/) : null;
  const transcript = cli === 'claude' && process.env.CLAUDE_CONFIG_DIR
    ? path.join(process.env.CLAUDE_CONFIG_DIR, 'projects', process.cwd().replace(/[^a-zA-Z0-9]/g, '-'), `${resume ?? 'fake-session'}.jsonl`) : null;
  if (resume && !(transcript && fs.existsSync(transcript))) { process.stderr.write(`No conversation found with session ID: ${resume}\n`); process.exit(1); }
  await sleep(+(prompt.match(/FAKE:sleep=(\d+)/)?.[1] ?? process.env.FAKE_SLEEP_MS ?? 150));
  const model = after(argv, '--model') ?? after(argv, '-m') ?? 'unknown';
  let reply = 'Done.\n\n## Source Information\n- Model: fake\n\n## Engine Feedback\nnone\n\n## Prompt Feedback\nnone';
  if (limit) {
    reply = 'You\'ve hit your 5-hour limit · resets 10:10am (America/Vancouver)';
    if (!limit[1]) { fs.mkdirSync('src', { recursive: true }); fs.writeFileSync(path.join('src', 'partial.js'), 'console.log("half a game");\n'); }
  } else if (/smoke\.txt/.test(prompt)) { fs.writeFileSync('smoke.txt', 'ok\n'); reply = 'SMOKE-OK'; }
  else if (!fail && /FAKE:plan/.test(prompt)) fs.writeFileSync('PLAN.md', `# Plan by ${model}\n\n1. Engine\n2. Levels\n3. Polish\n`);
  else if (!fail && !hang && !/FAKE:nogame/.test(prompt)) { // a hang makes its dev file below, as it gets going
    fs.mkdirSync('src', { recursive: true });
    fs.writeFileSync(path.join('src', 'main.js'), 'console.log("game");\n');
    const given = fs.readdirSync('.').filter((f) => /\.html$/.test(f)).length; // a later stage adds content to the game it was given
    const head = /FAKE:hubmeta/.test(prompt) ? '<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:players" content="1-4">' : '';
    const body = `<!doctype html><title>Fake</title>${head}<script>${'let x = 1;\n'.repeat(200)}${/FAKE:todo/.test(prompt) ? '// TODO finish\n' : ''}`
      + `${given ? `// content added by ${cli} ${model}\n` : ''}</script>`;
    fs.writeFileSync(`${prompt.match(/FAKE:game=(\S+)/)?.[1] ?? `Fake-Game-${model}`}.html`, body);
    // The exit interview, when the prompt asks for one: exit-interview.json beside the game (see EXIT above).
    if (/exit-interview\.json/.test(prompt) && !/FAKE:noexit/.test(prompt))
      fs.writeFileSync('exit-interview.json', /FAKE:badexit/.test(prompt) ? '{"sourceInformation": {"date": "' : JSON.stringify(EXIT(cli, model), null, 2));
  }
  // A stage's review of its prompt, when its text asks for one: each question with its answer.
  if (!fail && /planner-exit-interview\.json/.test(prompt) && !/FAKE:noreview/.test(prompt))
    fs.writeFileSync('planner-exit-interview.json', JSON.stringify([{ question: 'What was confusing?', answer: `Which file wins for the file name (${model}).` },
      { question: 'What would you change in this prompt?', answer: 'Nothing.' }], null, 2));
  if (/FAKE:saypath/.test(prompt)) reply += `\n\nThe game is in ${process.cwd()}`;
  if (/FAKE:noreply/.test(prompt)) reply = '';
  const tok = { input: 1200, cacheRead: 9000, cacheWrite: 800, output: 640, reasoning: 120 };

  if (cli === 'claude' || cli === 'grok') {
    if (fail && cli === 'grok' && /start/.test(fail)) { line({ type: 'error', message: fail }); process.exit(1); }
    const sessionId = cli === 'grok' ? crypto.randomUUID() : resume ?? 'fake-session';
    // What the session had used before this part (the cost-state its transcript saved), which the totals include.
    const since = resume ? JSON.parse(fs.readFileSync(transcript, 'utf8').trim().split('\n').filter((l) => l.includes('"cost-state"')).pop() ?? 'null') : null;
    if (hang) { // cut off mid-way: one response (and its tool call), then working until stopped
      const usage = { input_tokens: 100, cache_creation_input_tokens: 600, cache_read_input_tokens: 5000, output_tokens: 400 };
      const msg = { id: 'msg_h1', model, content: [{ type: 'tool_use', id: 'h1', name: 'Write', input: {} }], usage };
      line({ type: 'system', subtype: 'init', model, session_id: sessionId });
      line({ type: 'assistant', message: { ...msg, usage: { ...usage, output_tokens: 5 } } }); // the stream's usage is from the response's start
      fs.mkdirSync('src', { recursive: true }); fs.writeFileSync(path.join('src', 'partial.js'), 'console.log("half a game");\n');
      if (transcript) {
        fs.mkdirSync(path.dirname(transcript), { recursive: true });
        const at = new Date().toISOString();
        fs.appendFileSync(transcript, jsonl([{ type: 'user', timestamp: at, message: { content: 'turn' } }, { type: 'assistant', timestamp: at, message: msg }]));
      }
      if (hang[1] === '=alone') return setTimeout(() => { // its runner is gone by now: nobody reads its output
        fs.writeFileSync(`Fake-Game-${model}.html`, `<!doctype html><title>Fake</title><script>${'let x = 1;\n'.repeat(200)}</script>`);
        if (/exit-interview\.json/.test(prompt)) fs.writeFileSync('exit-interview.json', JSON.stringify(EXIT(cli, model), null, 2));
        const at = new Date().toISOString(), last = { id: 'msg_h2', model, content: [{ type: 'text', text: reply }],
          usage: { input_tokens: 20, cache_creation_input_tokens: 100, cache_read_input_tokens: 6000, output_tokens: 300 } };
        if (transcript) fs.appendFileSync(transcript, jsonl([{ type: 'user', timestamp: at, message: { content: [{ type: 'tool_result', tool_use_id: 'h1', content: 'ok' }] } },
          { type: 'assistant', timestamp: at, message: last }, { type: 'last-prompt', sessionId },
          { type: 'cost-state', totalCostUSD: 0.05, totalAPIDuration: 900, modelUsage: { [model]: { inputTokens: 120, outputTokens: 700,
            cacheReadInputTokens: 11000, cacheCreationInputTokens: 700, costUSD: 0.05 } } }]));
        process.exit(0);
      }, 1000);
      process.on('SIGTERM', () => {
        if (hang[1] === '=state' && transcript) claudeTranscript(transcript, { totalCostUSD: 0.03, totalAPIDuration: 700,
          modelUsage: { [model]: { inputTokens: 100, outputTokens: 400, cacheReadInputTokens: 5000, cacheCreationInputTokens: 600, costUSD: 0.03 } } });
        process.exit(143);
      });
      return setInterval(() => {}, 60000);
    }
    if (limit?.[1]) { // stopped at the first request: nothing used
      line({ type: 'system', subtype: 'init', model, session_id: sessionId });
      line({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'five_hour', utilization: 1, resetsAt: 1793293800 } });
      line({ type: 'assistant', message: { id: 'msg_0', content: [{ type: 'text', text: reply }] } });
      line({ type: 'result', subtype: 'success', is_error: true, duration_ms: 300, duration_api_ms: 0, num_turns: 1, result: reply,
        session_id: sessionId, total_cost_usd: 0, usage: { input_tokens: 0, output_tokens: 0 }, modelUsage: {} });
      claudeTranscript(transcript, { totalCostUSD: 0, totalAPIDuration: 0, modelUsage: {} });
      process.exit(1);
    }
    // The stream (Claude Code's stream-json, Grok's copy of it): two responses, the first in two events (one per
    // content block) with a tool call each; one tool fails; one compaction; Claude Code's plan limits twice.
    const [read, edit] = cli === 'grok' ? ['read_file', 'search_replace'] : ['Read', 'Edit'];
    line({ type: 'system', subtype: 'init', model, session_id: sessionId });
    if (cli === 'claude') line({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: {
      five_hour: { utilization: 0.1, resetsAt: 1793275800 }, seven_day: { utilization: 0.5, resetsAt: 1793559600 } } } });
    line({ type: 'assistant', message: { id: 'msg_1', content: [{ type: 'tool_use', id: 't1', name: read, input: {} }] } });
    line({ type: 'assistant', message: { id: 'msg_1', content: [{ type: 'tool_use', id: 't2', name: edit, input: {} }] } });
    line({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }, { type: 'tool_result', tool_use_id: 't2', is_error: true, content: 'no match' }] } });
    line({ type: 'system', subtype: 'compact_boundary', compact_metadata: { trigger: 'auto', pre_tokens: 1000 } });
    line({ type: 'assistant', message: { id: 'msg_2', content: [{ type: 'text', text: reply }] } });
    if (cli === 'claude') line({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: {
      five_hour: { utilization: 0.12, resetsAt: 1793275800 }, seven_day: { utilization: 0.51, resetsAt: 1793559600 } } } });
    // Grok's result has no helper model and costs its main model 0.0425.
    const modelUsage = { [model]: { inputTokens: tok.input, outputTokens: tok.output, cacheReadInputTokens: tok.cacheRead,
      cacheCreationInputTokens: tok.cacheWrite, ...(cli === 'claude' ? { thinkingTokens: tok.reasoning } : {}), costUSD: cli === 'claude' ? 0.04 : 0.0425 },
      ...(cli === 'claude' ? { 'claude-haiku-5-5': { inputTokens: 10, outputTokens: 20, cacheReadInputTokens: 0, cacheCreationInputTokens: 5, costUSD: 0.0025 } } : {}) };
    // A resumed session's totals include what it used before; a usage limit is an error with its message as the result.
    for (const [id, b] of Object.entries(since?.modelUsage ?? {})) {
      const u = modelUsage[id] ??= {};
      for (const [k, v] of Object.entries(b)) u[k] = (u[k] ?? 0) + v;
    }
    const cost = 0.0425 + (since?.totalCostUSD ?? 0), apiMs = 1500 + (since?.totalAPIDuration ?? 0);
    line({ type: 'result', subtype: fail ? 'error_during_execution' : 'success', is_error: !!(fail || limit), ...(fail ? { errors: [fail] } : {}),
      duration_ms: 2000, duration_api_ms: apiMs, num_turns: 4, ...(goal ? { result_index: 1 } : {}), result: fail ? '' : reply,
      session_id: sessionId, total_cost_usd: cost, ...(cli === 'claude' ? { subagent_stats: { spawned: 1 }, ttft_ms: 900 } : {}), modelUsage });
    if (cli === 'grok' && process.env.GROK_HOME) grokSession(sessionId);
    if (transcript) claudeTranscript(transcript, { totalCostUSD: cost, totalAPIDuration: apiMs, modelUsage }, goal && !fail && !limit ? goalChecks(prompt) : []); // a session that errored got no check
    process.exit(fail || limit ? 1 : 0);
  }
  if (cli === 'codex') {
    const thread = crypto.randomUUID();
    line({ type: 'thread.started', thread_id: thread });
    if (fail) { line({ type: 'turn.failed', error: { message: fail } }); process.exit(1); }
    line({ type: 'item.completed', item: { id: 'item_0', type: 'command_execution', status: 'completed', exit_code: 0 } });
    line({ type: 'item.completed', item: { id: 'item_1', type: 'command_execution', status: 'failed', exit_code: 1 } });
    line({ type: 'item.completed', item: { id: 'item_2', type: 'file_change', status: 'completed' } });
    line({ type: 'item.completed', item: { id: 'item_3', type: 'agent_message', text: reply } });
    if (/FAKE:hang/.test(prompt)) { // stopped mid-turn: its logs have the usage so far, its output never will
      if (process.env.CODEX_HOME) codexRollouts(thread, model);
      process.on('SIGTERM', () => process.exit(0));
      return setInterval(() => {}, 60000);
    }
    line({ type: 'turn.completed', usage: { input_tokens: tok.input + tok.cacheRead, cached_input_tokens: tok.cacheRead, output_tokens: tok.output, reasoning_output_tokens: tok.reasoning } });
    if (process.env.CODEX_HOME) codexRollouts(thread, model);
    process.exit(0);
  }
  if (cli === 'agy') {
    const result = { status: fail ? 'ERROR' : 'SUCCESS', response: fail ? '' : reply, ...(fail ? { error: fail } : {}), num_turns: 3,
      usage: { input_tokens: tok.input, output_tokens: tok.output, thinking_tokens: tok.reasoning, cache_read_tokens: tok.cacheRead, total_tokens: tok.input + tok.output },
      conversation_id: 'fake-conv' };
    if (after(argv, '--output-format') !== 'stream-json') { line(result); process.exit(fail ? 1 : 0); }
    // stream-json: two model responses whose usage adds up to the result's, a tool call that works and one that fails.
    const step = (i, o) => line({ event: 'step_update', step_update: { conversation_id: 'fake-conv', step_index: i, ...o } });
    line({ event: 'init', conversation_id: 'fake-conv', init: { model } });
    step(0, { state: 'DONE', step_type: 'user_input' });
    step(1, { state: 'DONE', step_type: 'agent_response', usage: { input_tokens: 700, output_tokens: 400, thinking_tokens: 100, cache_read_tokens: 4000, total_tokens: 1100 } });
    step(2, { state: 'ACTIVE', step_type: 'tool', tool_name: 'run_command' });
    step(2, { state: 'DONE', step_type: 'tool', tool_name: 'run_command' });
    step(3, { state: 'ERROR', step_type: 'tool', tool_name: 'view_file' });
    step(4, { state: 'ACTIVE', step_type: 'agent_response', text_delta: 'Do' });
    step(4, { state: 'DONE', step_type: 'agent_response', usage: { input_tokens: 500, output_tokens: 240, thinking_tokens: 20, cache_read_tokens: 5000, total_tokens: 740 } });
    line({ event: 'result', result });
    process.exit(fail ? 1 : 0);
  }
  // muse
  line({ stream: { kind: 'session', id: 'fake-muse-session' }, payload_type: 'session.started', payload: {} });
  line({ payload_type: 'session.run.linked', payload: { run_stream: { id: 'run-1' } } });
  // Like the real thing: input_tokens includes the cached ones, and the main run doesn't include its subagents.
  line({ payload_type: 'tool.result', payload: { run_stream: { id: 'run-1' }, correlation_facts: { outcome: 'success', tool_name: 'read_file' } } });
  line({ payload_type: 'tool.result', payload: { run_stream: { id: 'run-1' }, correlation_facts: { outcome: 'failure', tool_name: 'bash' } } });
  line({ payload_type: 'run.usage', payload: { run_stream: { id: 'run-1' }, calls: 5, children_included: false,
    allowance: { tier: 'Muse Code High Usage', window: { used_percent: 9, resets_at_ms: 1793268601000 }, weekly: { used_percent: 11, resets_at_ms: 1793577600000 } },
    models: [{ model, input_tokens: tok.input + tok.cacheRead, cached_tokens: tok.cacheRead, output_tokens: tok.output, reasoning_tokens: tok.reasoning }] } });
  line({ payload_type: 'run.usage', payload: { run_stream: { id: 'run-sub' }, calls: 2, children_included: false,
    models: [{ model, input_tokens: 300, cached_tokens: 100, output_tokens: 50, reasoning_tokens: 10 }] } });
  line({ payload_type: fail ? 'run.terminal.failed' : 'run.terminal.completed', payload: { run_stream: { id: 'run-1' },
    terminal: fail ? 'failed' : 'completed', ...(fail ? { reason: fail } : { text: reply }) } });
  process.exit(fail ? 1 : 0);
}

const pad = (n) => String(n).padStart(2, '0');
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';

// Claude Code: a turn in the session's transcript (and what else it wrote then: `entries`), and the cost-state it saves
// as the process ends (the session's totals so far, which --resume restores).
function claudeTranscript(file, totals, entries = []) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, jsonl([{ type: 'user', timestamp: new Date().toISOString(), message: { content: 'turn' } }, ...entries, { type: 'cost-state', ...totals }]));
}
// What /goal leaves in a Claude Code transcript: a sentinel as the goal is set, then a verdict each time the agent
// tries to stop. Not met 9 times in a row, Claude Code ends the turn itself.
function goalChecks(prompt) {
  const at = new Date().toISOString(), check = (met, reason) => ({ type: 'attachment', timestamp: at, attachment: { type: 'goal_status', met, condition: 'fake', reason } });
  const set = { type: 'attachment', timestamp: at, attachment: { type: 'goal_status', met: false, sentinel: true, condition: 'fake' } };
  if (!/FAKE:goal=unmet/.test(prompt)) return [set, check(true, 'The game is in the folder.')];
  return [set, ...Array.from({ length: 9 }, () => check(false, 'The game exists, but the transcript does not show every feature working.')),
    { type: 'system', subtype: 'informational', timestamp: at, content: 'A hook blocked the turn from ending 9 consecutive times — overriding and ending turn.' }];
}

// Codex: the main thread's rollout (2 requests, plan limits at the start and end) and one subagent's, which
// starts with a copy of the parent's history (including a token count that isn't its own).
function codexRollouts(thread, model) {
  const d = new Date(), dir = path.join(process.env.CODEX_HOME, 'sessions', String(d.getFullYear()), pad(d.getMonth() + 1), pad(d.getDate()));
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const limits = (five, week) => ({ plan_type: 'pro', primary: { used_percent: five, window_minutes: 300, resets_at: 1793275800 },
    secondary: { used_percent: week, window_minutes: 10080, resets_at: 1793774604 } });
  const count = (input, cached, output, reasoning, rl) => ({ type: 'event_msg', payload: { type: 'token_count', rate_limits: rl,
    info: { total_token_usage: { input_tokens: input, cached_input_tokens: cached, cache_write_input_tokens: 0, output_tokens: output, reasoning_output_tokens: reasoning } } } });
  const sub = crypto.randomUUID();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `rollout-${stamp}-${thread}.jsonl`), jsonl([
    { type: 'session_meta', payload: { id: thread, source: 'exec' } },
    { type: 'event_msg', payload: { type: 'thread_settings_applied', thread_id: thread } },
    { type: 'turn_context', payload: { model } },
    { type: 'token_usage_record', payload: { thread_id: thread } }, count(5000, 4000, 300, 60, limits(10, 40)),
    { type: 'token_usage_record', payload: { thread_id: thread } }, count(10200, 9000, 640, 120, limits(12, 41)),
    { type: 'event_msg', payload: { type: 'task_complete', time_to_first_token_ms: 1234 } }]));
  fs.writeFileSync(path.join(dir, `rollout-${stamp}-${sub}.jsonl`), jsonl([
    { type: 'session_meta', payload: { id: sub, source: { subagent: { thread_spawn: { parent_thread_id: thread, depth: 1 } } } } },
    { type: 'session_meta', payload: { id: thread } },
    { type: 'token_usage_record', payload: { thread_id: thread } }, count(99999, 0, 9999, 0),
    { type: 'event_msg', payload: { type: 'thread_settings_applied', thread_id: sub } },
    { type: 'turn_context', payload: { model } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: sub, item: { type: 'CommandExecution', status: 'completed' } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: sub, item: { type: 'Reasoning' } } },
    { type: 'token_usage_record', payload: { thread_id: sub } }, { type: 'token_usage_record', payload: { thread_id: sub } },
    count(3000, 2000, 300, 50)]));
}

// Grok: the session's usage.json (which, like the real one, already includes the planner) and two /goal
// helpers, each a session of its own beside it, listed in subagents/.
function grokSession(id) {
  const root = path.join(process.env.GROK_HOME, 'sessions', encodeURIComponent(process.cwd()));
  const kids = { planner: { inputTokens: 500, cachedReadTokens: 100, cacheCreationTokens: 0, outputTokens: 50, reasoningTokens: 30, modelCalls: 1, costUsdTicks: 1e8 },
    verifier: { inputTokens: 2000, cachedReadTokens: 1500, cacheCreationTokens: 0, outputTokens: 200, reasoningTokens: 100, modelCalls: 3, costUsdTicks: 5e8 } };
  for (const [name, u] of Object.entries(kids)) {
    const child = `${id}-${name}`;
    fs.mkdirSync(path.join(root, id, 'subagents', child), { recursive: true });
    fs.writeFileSync(path.join(root, id, 'subagents', child, 'meta.json'), JSON.stringify({ child_session_id: child, description: name }));
    fs.mkdirSync(path.join(root, child), { recursive: true });
    fs.writeFileSync(path.join(root, child, 'usage.json'), JSON.stringify({ session: { ...u, primaryModelId: 'grok-4.7-build' } }));
  }
  fs.writeFileSync(path.join(root, id, 'usage.json'), JSON.stringify({ session: { inputTokens: 11000 + 500, cachedReadTokens: 9000 + 100,
    outputTokens: 640 + 50, reasoningTokens: 400 + 30, modelCalls: 5 + 1, costUsdTicks: 4.25e8 + 1e8 } }));
}
