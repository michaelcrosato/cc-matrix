// fake.mjs: stands in for claude, codex, grok, agy and muse so the runner and the dashboard can be
// tested end to end without spending anything. Each wrapper in this folder calls run('<cli>').
// It reads the prompt the way the real CLI gets it (stdin, --prompt-file, the -p argument, or
// TASK.md for /goal), writes a small game into the work folder and prints that CLI's output format.
//
// Directives anywhere in the prompt (usually a variant's text) steer one run:
//   FAKE:fail=<message>   exit 1 with this error, in the CLI's own error format
//   FAKE:sleep=<ms>       take this long (default FAKE_SLEEP_MS, else 150)
//   FAKE:nogame           finish OK without writing a game file
//   FAKE:noreply          finish OK with an empty final reply
//   FAKE:todo             leave a TODO in the game
// FAKE_LOG=<file> appends {cli, argv, cwd, stdin} per call, for tests to check the command line.
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
  const prompt = goal ? fs.readFileSync('TASK.md', 'utf8') : msg ?? '';
  if (process.env.FAKE_LOG) fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ cli, argv, cwd: process.cwd(), stdin, goal }) + '\n');

  const fail = prompt.match(/FAKE:fail=([^\n]*)/)?.[1];
  await sleep(+(prompt.match(/FAKE:sleep=(\d+)/)?.[1] ?? process.env.FAKE_SLEEP_MS ?? 150));
  const model = after(argv, '--model') ?? after(argv, '-m') ?? 'unknown';
  let reply = 'Done.\n\n## Source Information\n- Model: fake\n\n## Engine Feedback\nnone\n\n## Prompt Feedback\nnone';
  if (/smoke\.txt/.test(prompt)) { fs.writeFileSync('smoke.txt', 'ok\n'); reply = 'SMOKE-OK'; }
  else if (!fail && !/FAKE:nogame/.test(prompt)) {
    fs.mkdirSync('src', { recursive: true });
    fs.writeFileSync(path.join('src', 'main.js'), 'console.log("game");\n');
    const body = `<!doctype html><title>Fake</title><script>${'let x = 1;\n'.repeat(200)}${/FAKE:todo/.test(prompt) ? '// TODO finish\n' : ''}</script>`;
    fs.writeFileSync(`Fake-Game-${model}.html`, body);
  }
  if (/FAKE:noreply/.test(prompt)) reply = '';
  const tok = { input: 1200, cacheRead: 9000, cacheWrite: 800, output: 640, reasoning: 120 };

  if (cli === 'claude' || cli === 'grok') {
    if (fail && cli === 'grok' && /start/.test(fail)) { line({ type: 'error', message: fail }); process.exit(1); }
    if (cli === 'grok') line({ type: 'system', subtype: 'init', model });
    line({ type: 'result', subtype: fail ? 'error_during_execution' : 'success', is_error: !!fail, ...(fail ? { errors: [fail] } : {}),
      duration_ms: 2000, duration_api_ms: 1500, num_turns: 4, ...(goal ? { result_index: 1 } : {}), result: fail ? '' : reply,
      session_id: 'fake-session', total_cost_usd: 0.0425, subagent_stats: { spawned: 1 },
      modelUsage: { [model]: { inputTokens: tok.input, outputTokens: tok.output, cacheReadInputTokens: tok.cacheRead,
        cacheCreationInputTokens: tok.cacheWrite, thinkingTokens: tok.reasoning, costUSD: 0.04 },
        'claude-haiku-5-5': { inputTokens: 10, outputTokens: 20, cacheReadInputTokens: 0, cacheCreationInputTokens: 5, costUSD: 0.0025 } } });
    process.exit(fail ? 1 : 0);
  }
  if (cli === 'codex') {
    line({ type: 'thread.started', thread_id: 'fake-thread' });
    if (fail) { line({ type: 'turn.failed', error: { message: fail } }); process.exit(1); }
    line({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text: reply } });
    line({ type: 'turn.completed', usage: { input_tokens: tok.input + tok.cacheRead, cached_input_tokens: tok.cacheRead, output_tokens: tok.output, reasoning_output_tokens: tok.reasoning } });
    process.exit(0);
  }
  if (cli === 'agy') {
    line({ status: fail ? 'ERROR' : 'SUCCESS', response: fail ? '' : reply, ...(fail ? { error: fail } : {}), num_turns: 3,
      usage: { input_tokens: tok.input, output_tokens: tok.output, thinking_tokens: tok.reasoning, cache_read_tokens: tok.cacheRead, total_tokens: tok.input + tok.output },
      conversation_id: 'fake-conv' });
    process.exit(fail ? 1 : 0);
  }
  // muse
  line({ stream: { kind: 'session', id: 'fake-muse-session' }, payload_type: 'session.started', payload: {} });
  line({ payload_type: 'session.run.linked', payload: { run_stream: { id: 'run-1' } } });
  // Like the real thing: input_tokens includes the cached ones, and the main run doesn't include its subagents.
  line({ payload_type: 'run.usage', payload: { run_stream: { id: 'run-1' }, calls: 5, children_included: false,
    models: [{ model, input_tokens: tok.input + tok.cacheRead, cached_tokens: tok.cacheRead, output_tokens: tok.output, reasoning_tokens: tok.reasoning }] } });
  line({ payload_type: 'run.usage', payload: { run_stream: { id: 'run-sub' }, calls: 2, children_included: false,
    models: [{ model, input_tokens: 300, cached_tokens: 100, output_tokens: 50, reasoning_tokens: 10 }] } });
  line({ payload_type: fail ? 'run.terminal.failed' : 'run.terminal.completed', payload: { run_stream: { id: 'run-1' },
    terminal: fail ? 'failed' : 'completed', ...(fail ? { reason: fail } : { text: reply }) } });
  process.exit(fail ? 1 : 0);
}
