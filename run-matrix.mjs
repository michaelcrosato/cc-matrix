#!/usr/bin/env node
// run-matrix.mjs — run every combination in matrix.config.json headless through
// Claude Code (`claude -p`), Codex (`codex exec`), Grok (`grok --prompt-file`), Antigravity
// (`agy -p`) and/or Muse Code (`muse exec`), and record time, tokens and cost for
// each run. No dependencies; Node 18+.
// Usually driven by the dashboard (node dashboard.mjs), but works on its own.
//
// Cost is only ever what the CLI itself reports (Claude Code, Grok). Codex, agy
// and Muse don't report cost, so theirs stays blank; their tokens are a rough guide only.
//
//   node run-matrix.mjs --dry-run
//   node run-matrix.mjs -j 3 --pick opus:xhigh,opus:max --only testing=none,open
//   node run-matrix.mjs --budget 40 --timeout 180
//   node run-matrix.mjs --report
//   node run-matrix.mjs --smoke grok:high        one tiny task to check a model works end to end
//
// Flags: --config <file> --out <dir> --concurrency|-j <n> --per-cli <n>
//        --pick agent:effort,...      exact agent+effort pairs (repeatable)
//        --only key=a,b               keys: agent, provider, effort or a dimension (repeatable)
//        --limit <n> --repeat <n> --timeout <min, 0 = none> --budget <usd>
//        --dry-run [--json] --report --rerun-failed --smoke agent:effort [--smoke-goal]
//        --reparse                    re-read tokens/cost from each run's saved agent.out (after parser changes)

import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ------------------------------------------------------------------ args
const args = { config: fs.existsSync('matrix.config.json') ? 'matrix.config.json' : 'matrix.config.mjs',
  out: 'runs', concurrency: 2, perCli: Infinity, only: [], pick: [], limit: Infinity, repeat: 1, timeout: 0,
  budget: Infinity, dryRun: false, json: false, report: false, reparse: false, rerunFailed: false, smoke: null, smokeGoal: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i], next = () => process.argv[++i];
  if (a === '--config') args.config = next();
  else if (a === '--out') args.out = next();
  else if (a === '--concurrency' || a === '-j') args.concurrency = +next();
  else if (a === '--per-cli') args.perCli = +next() || Infinity;
  else if (a === '--smoke') args.smoke = next();
  else if (a === '--smoke-goal') args.smokeGoal = true;
  else if (a === '--only') args.only.push(next());
  else if (a === '--pick') args.pick.push(...next().split(',').filter(Boolean));
  else if (a === '--limit') args.limit = +next();
  else if (a === '--repeat') args.repeat = +next();
  else if (a === '--timeout') args.timeout = +next();
  else if (a === '--budget') args.budget = +next();
  else if (a === '--dry-run') args.dryRun = true;
  else if (a === '--json') args.json = true;
  else if (a === '--report') args.report = true;
  else if (a === '--reparse') args.reparse = true;
  else if (a === '--rerun-failed') args.rerunFailed = true;
  else { console.error(`Unknown flag: ${a}`); process.exit(1); }
}

const configPath = path.resolve(args.config);
const configDir = path.dirname(configPath);
const cfg = configPath.endsWith('.json')
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : (await import(pathToFileURL(configPath).href)).default;
const outDir = path.resolve(args.out);
const stopFile = path.join(outDir, '.stop');
const isWin = process.platform === 'win32';

if (args.report) { writeReport(); process.exit(0); }

// ------------------------------------------------------------ combinations
const dimNames = Object.keys(cfg.dimensions);
const variantText = (v) => v.text ?? (v.file ? fs.readFileSync(path.resolve(configDir, v.file), 'utf8') : '');
// Effort entries: 'high', 'max', 'default', and Claude-only Ultracode variants
// written 'high-uc' (or 'high+uc'). Ultracode is passed as a setting, so it works
// at any effort level.
function parseEffort(e) {
  let s = String(e ?? '').trim().toLowerCase();
  let uc = false;
  const m = s.match(/^(.*?)[\s+-]*(uc|ultracode)$/);
  if (m) { uc = true; s = m[1]; }
  const base = !s || s === 'default' ? null : s;
  return { base, ultracode: uc, label: `${base ?? 'default'}${uc ? '-uc' : ''}` };
}
const effortName = (e) => parseEffort(e).label;

// A dimension named "goal" is special: its text becomes a /goal completion
// condition instead of filling a placeholder. These CLIs run /goal headless;
// the others (Codex) run goal variants with the plain prompt, without /goal.
const GOAL_DIM = 'goal';
const GOAL_CLIS = new Set(['claude', 'grok', 'agy', 'muse']);
const goalText = (combo) => (combo[GOAL_DIM] ? variantText(combo[GOAL_DIM]).trim() : '');

function* product(i = 0, acc = {}) {
  if (i === dimNames.length) { yield { ...acc }; return; }
  for (const v of cfg.dimensions[dimNames[i]]) yield* product(i + 1, { ...acc, [dimNames[i]]: v });
}

const filters = args.only.map((f) => { const [k, v = ''] = f.split('='); return [k, new Set(v.split(','))]; });
const picks = new Set(args.pick);
const matches = (fields) => (!picks.size || picks.has(`${fields.agent}:${fields.effort}`))
  && filters.every(([k, set]) => set.has(String(fields[k])));

const runs = [];
for (const agent of cfg.agents) {
  for (const e of agent.efforts?.length ? agent.efforts : ['default']) {
    const pe = parseEffort(e), effort = pe.label;
    if (pe.ultracode && agent.provider !== 'claude') continue; // Ultracode is Claude Code only
    for (const combo of product()) {
      const fields = { agent: agent.id, provider: agent.provider, effort, ultracode: pe.ultracode,
        ...Object.fromEntries(dimNames.map((d) => [d, combo[d].id])) };
      if (!matches(fields)) continue;
      for (let r = 1; r <= args.repeat; r++) {
        const id = [`${agent.id}-${effort}`, ...dimNames.map((d) => combo[d].id),
          args.repeat > 1 ? `r${r}` : null].filter(Boolean).join('__');
        runs.push({ id, agent, effort: pe.base, ultracode: pe.ultracode, combo, fields });
      }
    }
  }
}
let queue = runs.slice(0, args.limit);

// ------------------------------------------------------------- prompt
const template = cfg.templateFile ? fs.readFileSync(path.resolve(configDir, cfg.templateFile), 'utf8') : cfg.template;
// Saved with each run so results made with an edited prompt can be told apart (the dashboard
// computes the same hash for the current template).
const cliVersions = {}; // provider -> version, filled in when a batch starts
const textHash = (t) => crypto.createHash('sha1').update(t).digest('hex').slice(0, 8);
const promptVersion = textHash(template ?? '');
// Saved with each run too (variantHashes), so the dashboard can tell exactly which runs used a
// variant's text from before an edit.
const variantHashes = (combo) => Object.fromEntries(dimNames.map((d) => [d, textHash(variantText(combo[d]).trim())]));
const LABS = { claude: 'Anthropic', codex: 'OpenAI', grok: 'xAI', agy: 'Google', muse: 'Meta' };
const CLIS = { claude: 'Claude Code CLI', codex: 'Codex CLI', grok: 'Grok CLI', agy: 'Antigravity CLI', muse: 'Muse Code CLI' };
// agy also serves other labs' models (Claude, GPT-OSS), so the model name decides the lab first.
const MODEL_LABS = [[/^claude/i, 'Anthropic'], [/^(gpt|o\d)/i, 'OpenAI'], [/^gemini/i, 'Google'], [/^grok/i, 'xAI'], [/^muse/i, 'Meta']];
const labOf = (agent) => MODEL_LABS.find(([re]) => re.test(agent.model ?? ''))?.[1] ?? LABS[agent.provider] ?? 'unknown';
const OS = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }[process.platform] ?? process.platform;
const pad = (n) => String(n).padStart(2, '0');

// Placeholders the runner fills per run (in addition to the dimensions).
function runVars(run, d = new Date()) {
  return { model: run.agent.model, effort: `${run.effort ?? 'default'}${run.ultracode ? '-ultracode' : ''}`, lab: labOf(run.agent),
    environment: `${CLIS[run.agent.provider] ?? run.agent.provider} (headless); ${OS}; browser unknown`,
    stamp: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

// With a goal, the full prompt goes to TASK.md and the message sent is the
// /goal command (a command must start the message, and everything after it is
// the condition, capped at 4,000 characters).
function goalMessage(run) {
  const g = goalText(run.combo);
  if (!g || !GOAL_CLIS.has(run.agent.provider)) return null;
  const msg = `/goal Read TASK.md in the current folder and complete the task it describes. Done when: ${g}`;
  if (msg.length > 4000) throw new Error(`Goal condition is ${msg.length} characters; /goal allows 4,000`);
  return msg;
}

// A function, not a string, as the replacement: in a string, $& $' $` and $$ are patterns, so a
// variant text like "$$" or "$'" would be sent changed.
function buildPrompt(run, when) {
  let p = template;
  for (const d of dimNames) if (d !== GOAL_DIM) p = p.replaceAll(`{{${d}}}`, () => variantText(run.combo[d]).trim());
  for (const [k, v] of Object.entries(runVars(run, when))) p = p.replaceAll(`{{${k}}}`, () => v);
  const left = [...new Set(p.match(/\{\{\w+\}\}/g) ?? [])];
  if (left.length) throw new Error(`Unfilled placeholders in prompt: ${left.join(' ')}`);
  return p.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// --------------------------------------------------------------- CLIs
const binOf = (p) => cfg.bins?.[p] || p;
// Whether a command exists on PATH (or at a path), so a missing CLI is reported once.
function findBin(bin) {
  if (/[\\/]/.test(bin)) return fs.existsSync(bin);
  const exts = isWin ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')] : [''];
  return (process.env.PATH || '').split(path.delimiter).some((d) => d && exts.some((e) => fs.existsSync(path.join(d, bin + e))));
}
const missingClis = () => [...new Set(queue.map((r) => r.agent.provider))].filter((p) => !findBin(binOf(p)));

// ------------------------------------------------------------- dry run
// A declaration, so --report (which runs before this point) can use it.
function readResult(id) { try { return JSON.parse(fs.readFileSync(path.join(outDir, id, 'result.json'), 'utf8')); } catch { return null; } }
const isDone = (id) => { const r = readResult(id); return !!r && (r.status === 'ok' || !args.rerunFailed); };

if (args.dryRun) {
  const byAgent = {};
  for (const r of queue) byAgent[r.fields.agent] = (byAgent[r.fields.agent] ?? 0) + 1;
  let sample = '', error = null;
  try { if (queue[0]) { sample = buildPrompt(queue[0]); const g = goalMessage(queue[0]);
    if (g) sample = `Message sent:\n${g}\n\n--- TASK.md ---\n${sample}`; } } catch (e) { error = e.message; }
  if (args.json) {
    console.log(JSON.stringify({ count: queue.length, byAgent, alreadyDone: queue.filter((r) => isDone(r.id)).length,
      ids: queue.map((r) => r.id), sampleId: queue[0]?.id ?? null, sample, error, missingClis: missingClis().map(binOf) }));
  } else {
    console.log(`${queue.length} runs  (${Object.entries(byAgent).map(([k, v]) => `${k}: ${v}`).join(', ')})\n`);
    for (const r of queue) console.log('  ' + r.id);
    if (error) console.log(`\nPrompt error: ${error}`);
    else if (queue[0]) console.log(`\n--- sample prompt (${queue[0].id}) ---\n${sample}`);
  }
  process.exit(0);
}

// -------------------------------------------------------------- providers
// Flags added to every run of a CLI when matrix.config.json has no extraArgs entry for it.
// They turn permission prompts off, which a headless run can't answer.
const DEFAULT_EXTRA = { claude: ['--dangerously-skip-permissions'],
  codex: ['--yolo'],
  grok: ['--always-approve'], agy: ['--dangerously-skip-permissions'], muse: ['--yolo'] };
const extra = (p) => cfg.extraArgs?.[p] ?? DEFAULT_EXTRA[p] ?? [];

// Each returns the command line for one run. promptFile is the run's prompt.md,
// for CLIs that can read the prompt from a file instead of stdin.
const providers = {
  claude(agent, effort, prompt, run) {
    const argv = ['-p'];
    const goal = goalMessage(run);
    if (goal) argv.push(goal); // short, so pass it as the argument like the docs show
    argv.push('--output-format', 'json', '--model', agent.model);
    if (effort) argv.push('--effort', effort);
    // Always set Ultracode explicitly so a global setting can't leak into the comparison.
    argv.push('--settings', JSON.stringify({ ultracode: !!run.ultracode }));
    argv.push(...extra('claude'));
    return { bin: binOf('claude'), argv, parse: parseClaude, promptInArgs: !!goal };
  },
  codex(agent, effort) {
    const argv = ['exec', '--json', '-m', agent.model];
    if (effort) argv.push('-c', `model_reasoning_effort=${effort}`);
    argv.push(...extra('codex'), '-'); // '-' = read prompt from stdin
    return { bin: binOf('codex'), argv, parse: parseCodex };
  },
  grok(agent, effort, prompt, run, promptFile) {
    // A /goal command has to be the message itself; otherwise read the prompt from its file.
    // streaming-messages-json is Claude Code's stream format and ends with the same result line.
    const goal = goalMessage(run);
    const argv = [...(goal ? ['-p', goal] : ['--prompt-file', promptFile]),
      '--output-format', 'streaming-messages-json', '--model', agent.model];
    if (effort) argv.push('--reasoning-effort', effort);
    argv.push(...extra('grok'));
    return { bin: binOf('grok'), argv, parse: parseGrok, promptInArgs: true };
  },
  agy(agent, effort, prompt, run) {
    // agy -p reads neither stdin nor a file, so the prompt is the argument. Model IDs are
    // the base name (gemini-4-argon) with the effort separate; `agy models` lists both.
    const argv = ['-p', goalMessage(run) ?? prompt, '--output-format', 'json', '--model', agent.model];
    if (effort) argv.push('--effort', effort);
    argv.push(...extra('agy'));
    return { bin: binOf('agy'), argv, parse: parseAgy, promptInArgs: true };
  },
  muse(agent, effort, prompt, run, promptFile) {
    const goal = goalMessage(run);
    const argv = ['exec', '--json', '--model', agent.model];
    if (effort) argv.push('--reasoning-effort', effort);
    argv.push(...extra('muse'), ...(goal ? [goal] : ['--prompt-file', promptFile]));
    return { bin: binOf('muse'), argv, parse: parseMuse, promptInArgs: true };
  },
};

// Claude Code and Grok share this usage shape; modelUsage includes subagents and helper models.
// The per-model split (what /usage shows) is kept in result.json as `models`.
function usageTotals(j) {
  let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, thinking = null, models;
  const mu = j.modelUsage && Object.entries(j.modelUsage);
  if (mu?.length) {
    models = {};
    for (const [name, m] of mu) {
      input += m.inputTokens ?? 0; output += m.outputTokens ?? 0;
      cacheRead += m.cacheReadInputTokens ?? 0; cacheWrite += m.cacheCreationInputTokens ?? 0;
      if (m.thinkingTokens != null) thinking = (thinking ?? 0) + m.thinkingTokens;
      models[name] = { uncachedInputTokens: m.inputTokens ?? 0, cacheReadTokens: m.cacheReadInputTokens ?? 0,
        cacheWriteTokens: m.cacheCreationInputTokens ?? 0, outputTokens: m.outputTokens ?? 0,
        reasoningTokens: m.thinkingTokens ?? null, costUsd: m.costUSD ?? null };
    }
  } else {
    const u = j.usage ?? {};
    input = u.input_tokens ?? 0; output = u.output_tokens ?? 0;
    cacheRead = u.cache_read_input_tokens ?? 0; cacheWrite = u.cache_creation_input_tokens ?? 0;
    thinking = u.output_tokens_details?.thinking_tokens ?? null;
  }
  return { inputTokens: input + cacheRead + cacheWrite, cachedTokens: cacheRead, cacheWriteTokens: cacheWrite,
    outputTokens: output, reasoningTokens: thinking, models };
}

// Fields every parser's result gets: uncached input (input minus cache reads and writes) and a
// grand total. cacheWriteTokens stays blank for CLIs that don't report it.
function tokenTotals(m) {
  if (m.inputTokens == null) return m;
  m.uncachedInputTokens = m.inputTokens - (m.cachedTokens ?? 0) - (m.cacheWriteTokens ?? 0);
  m.totalTokens = m.inputTokens + (m.outputTokens ?? 0);
  return m;
}

const lastJsonLine = (text) => text.trim().split('\n').filter((l) => l.startsWith('{')).pop();

function parseClaude(text) {
  const line = lastJsonLine(text);
  if (!line) return { isError: true };
  const j = JSON.parse(line);
  return { reply: j.result, costUsd: j.total_cost_usd, costSource: j.total_cost_usd != null ? 'reported' : 'none',
    ...usageTotals(j), turns: j.num_turns, apiMinutes: j.duration_api_ms ? j.duration_api_ms / 60000 : null,
    // Each /goal round ends with a result; num_turns counts only the last one.
    rounds: j.result_index != null ? j.result_index + 1 : undefined, subagents: j.subagent_stats?.spawned,
    isError: !!j.is_error, error: j.is_error && j.errors?.length ? j.errors.join('; ') : undefined, sessionId: j.session_id };
}

// Grok's stream ends with Claude Code's result line, or {"type":"error","message"} if it couldn't start.
function parseGrok(text) {
  const line = lastJsonLine(text), j = line ? JSON.parse(line) : null;
  if (j?.type === 'error') return { isError: true, error: j.message };
  return parseClaude(text);
}

// agy --output-format json: one object with status, response, error, num_turns and
// usage {input_tokens, output_tokens, thinking_tokens, cache_read_tokens, total_tokens}. No cost.
function parseAgy(text) {
  const line = lastJsonLine(text);
  if (!line) return { isError: true };
  const j = JSON.parse(line), u = j.usage ?? {};
  // input_tokens leaves out cache reads (and total_tokens is just input + output), so add them
  // to count all input like the Claude Code and Grok figures do.
  return { reply: j.response, costUsd: null, costSource: 'none', inputTokens: (u.input_tokens ?? 0) + (u.cache_read_tokens ?? 0),
    cachedTokens: u.cache_read_tokens ?? null, outputTokens: u.output_tokens ?? 0, reasoningTokens: u.thinking_tokens ?? null,
    turns: j.num_turns, isError: j.status !== 'SUCCESS', error: j.error || undefined,
    sessionId: j.conversation_id || undefined };
}

// muse exec --json: JSON lines of runtime events. run.usage (one per run, cumulative) has the
// tokens per model; run.terminal.<completed|failed|…> has the outcome and the final reply.
// Muse reports how much of the plan's allowance is used, not a cost.
function parseMuse(text) {
  const usage = new Map();
  let rootRun, terminal, sessionId;
  for (const l of text.split('\n')) {
    if (!l.startsWith('{')) continue;
    let e; try { e = JSON.parse(l); } catch { continue; }
    const p = e.payload ?? {}, runId = p.run_stream?.id;
    if (e.stream?.kind === 'session') sessionId ??= e.stream.id;
    if (e.payload_type === 'session.run.linked') rootRun ??= runId;
    else if (e.payload_type === 'run.usage' && runId) usage.set(runId, p);
    else if (e.payload_type?.startsWith('run.terminal.') && (!rootRun || runId === rootRun)) terminal = p;
  }
  // Subagent runs report separately unless the main run already includes them.
  const root = usage.get(rootRun);
  let input = 0, cached = 0, output = 0, reasoning = 0, calls = 0;
  for (const u of root?.children_included ? [root] : usage.values()) {
    calls += u.calls ?? 0;
    for (const m of u.models ?? []) { input += m.input_tokens ?? 0; cached += m.cached_tokens ?? 0;
      output += m.output_tokens ?? 0; reasoning += m.reasoning_tokens ?? 0; }
  }
  return { reply: terminal?.text || undefined, costUsd: null, costSource: 'none', inputTokens: input,
    cachedTokens: cached, outputTokens: output, reasoningTokens: reasoning, turns: calls,
    isError: terminal?.terminal !== 'completed', error: terminal?.reason || undefined, sessionId };
}

function parseCodex(text) {
  let input = 0, cached = 0, output = 0, reasoning = 0, turns = 0, isError = false, sessionId, reply, error;
  for (const l of text.split('\n')) {
    let e; try { e = JSON.parse(l); } catch { continue; }
    if (e.type === 'thread.started') sessionId = e.thread_id;
    if (e.type === 'item.completed' && e.item?.type === 'agent_message') reply = e.item.text;
    if (e.type === 'turn.completed' && e.usage) {
      turns++; input += e.usage.input_tokens ?? 0; cached += e.usage.cached_input_tokens ?? 0;
      output += e.usage.output_tokens ?? 0; reasoning += e.usage.reasoning_output_tokens ?? 0;
    }
    // { type: 'error', message } or { type: 'turn.failed', error: { message } }, e.g. a usage limit
    if (e.type === 'turn.failed' || e.type === 'error') { isError = true; error = e.error?.message ?? e.message ?? error; }
  }
  return { reply, costUsd: null, costSource: 'none', inputTokens: input, cachedTokens: cached,
    outputTokens: output, reasoningTokens: reasoning, turns, isError, error, sessionId };
}

// ------------------------------------------------------------------ run
const children = new Set();
let spent = 0, stopping = false, overBudget = false, done = 0, skipped = 0;

// Kill the agent and everything it started (servers, browsers, subagents).
function killTree(child) {
  if (child.exitCode !== null) return;
  if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } }
}

function stopAll(reason) {
  if (stopping) return;
  stopping = true;
  console.log(`■ Stopping (${reason}): ending ${children.size} running agent(s)…`);
  for (const c of children) killTree(c);
}
process.on('SIGINT', () => stopAll('Ctrl-C'));
process.on('SIGTERM', () => stopAll('terminated'));
// The dashboard asks us to stop by creating runs/.stop (works on every OS). A smoke
// test runs beside batches, so it ignores that.
const stopPoll = args.smoke ? null : setInterval(() => { if (fs.existsSync(stopFile)) stopAll('stop requested'); }, 1500);

// Folder layout shared by batch runs and --smoke: prompt.md beside work/; with a goal
// the prompt is also work/TASK.md and the message sent is saved as goal.md.
function prepare(run, dir, prompt) {
  fs.mkdirSync(path.join(dir, 'work'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'prompt.md'), prompt);
  const goal = goalMessage(run);
  if (goal) { fs.writeFileSync(path.join(dir, 'work', 'TASK.md'), prompt); fs.writeFileSync(path.join(dir, 'goal.md'), goal + '\n'); }
}

const lastLine = (file) => { try { return fs.readFileSync(file, 'utf8').trim().split('\n').pop().trim().slice(0, 500); } catch { return ''; } };

// Start the agent in dir/work, wait for it to exit (or hit `limit` minutes) and parse its output.
async function spawnAgent(run, dir, prompt, limit) {
  const { bin, argv, parse, promptInArgs } = providers[run.agent.provider](run.agent, run.effort, prompt, run, path.join(dir, 'prompt.md'));
  const outPath = path.join(dir, 'agent.out'), errPath = path.join(dir, 'agent.err');
  const out = fs.createWriteStream(outPath), err = fs.createWriteStream(errPath);
  const start = Date.now();

  const exitCode = await new Promise((resolve) => {
    // On Windows, npm .cmd shims need a shell; quote args so prompts survive it.
    const a = isWin ? argv.map((x) => `"${String(x).replace(/"/g, '\\"')}"`) : argv;
    const child = spawn(bin, a, { cwd: path.join(dir, 'work'), shell: isWin, detached: !isWin, env: process.env });
    children.add(child);
    child.stdout.pipe(out); child.stderr.pipe(err);
    child.stdin.on('error', () => {});
    child.stdin.end(promptInArgs ? '' : prompt);
    const timer = limit > 0 ? setTimeout(() => { err.write('\n[matrix] timed out\n'); killTree(child); }, limit * 60000) : null;
    child.on('error', (e) => { err.write(`\n[matrix] ${e.message}\n`); });
    child.on('close', (code) => { if (timer) clearTimeout(timer); children.delete(child); resolve(code); });
  });
  await Promise.all([new Promise((r) => out.end(r)), new Promise((r) => err.end(r))]);

  let metrics = {};
  try { metrics = tokenTotals(parse(fs.readFileSync(outPath, 'utf8'), run.agent)); } catch (e) { metrics = { isError: true, parseError: e.message }; }
  metrics.replyChars = String(metrics.reply ?? '').trim().length;
  if ((exitCode !== 0 || metrics.isError) && !metrics.error)
    metrics.error = lastLine(errPath) || metrics.parseError || (exitCode == null ? 'killed' : `exit code ${exitCode}`);
  return { exitCode, metrics, start, bin, argv };
}

async function runOne(run) {
  const dir = path.join(outDir, run.id), resFile = path.join(dir, 'result.json');
  const prev = readResult(run.id); // an unreadable result.json counts as not done
  if (prev && (prev.status === 'ok' || !args.rerunFailed)) { skipped++; console.log(`· skip ${run.id} (already ${prev.status})`); return; }
  fs.rmSync(dir, { recursive: true, force: true });
  const work = path.join(dir, 'work');
  let prompt;
  try {
    prompt = buildPrompt(run);
    prepare(run, dir, prompt);
  } catch (e) { // e.g. a placeholder this variant's text leaves unfilled, or a /goal over the limit: fail this run, keep the batch going
    fs.mkdirSync(dir, { recursive: true });
    const now = new Date().toISOString();
    let hashes; try { hashes = variantHashes(run.combo); } catch {} // a variant whose file can't be read is why we're here
    fs.writeFileSync(resFile, JSON.stringify({ id: run.id, ...run.fields, model: run.agent.model, promptVersion, variantHashes: hashes,
      status: 'failed', exitCode: null, error: `Not started: ${e.message}`, wallMinutes: 0, startedAt: now, finishedAt: now }, null, 2));
    done++; console.log(`✘ ${run.id}  not started: ${e.message}`);
    return;
  }

  for (const d of dimNames) {
    const setup = run.combo[d].setup;
    if (setup) spawnSync(setup, { cwd: work, shell: true, stdio: 'ignore' });
  }

  console.log(`▶ ${run.id}`);
  const { exitCode, metrics, start } = await spawnAgent(run, dir, prompt, +(run.agent.timeout || args.timeout || 0));

  if (stopping) { // interrupted: throw it away so it runs fresh next time
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`■ ${run.id} stopped (discarded)`);
    return;
  }

  if (metrics.reply) fs.writeFileSync(path.join(dir, 'reply.md'), metrics.reply);
  delete metrics.reply;
  const status = exitCode === 0 && !metrics.isError ? 'ok' : 'failed';
  // goalSkipped: a goal variant on a CLI without headless /goal, so it got the plain prompt.
  const goalSkipped = !!goalText(run.combo) && !goalMessage(run);
  const result = { id: run.id, ...run.fields, model: run.agent.model, cliVersion: cliVersions[run.agent.provider], promptVersion,
    variantHashes: variantHashes(run.combo), ...(goalSkipped ? { goalSkipped } : {}), status, exitCode,
    wallMinutes: (Date.now() - start) / 60000, ...metrics, ...measureOutput(work),
    startedAt: new Date(start).toISOString(), finishedAt: new Date().toISOString() };
  fs.writeFileSync(resFile, JSON.stringify(result, null, 2));
  spent += metrics.costUsd ?? 0; done++;
  console.log(`${status === 'ok' ? '✔' : '✘'} ${run.id}  ${result.wallMinutes.toFixed(1)}m  ` +
    `${fmtUsd(metrics.costUsd)}  out:${metrics.outputTokens ?? '?'} tok`);
  writeReport();
}

// --reparse: refresh token and cost fields of finished runs from their saved agent.out (and the
// TODO count from the saved game), leaving status, timing, other measurements and scores alone.
function reparseAll() {
  const parsers = { claude: parseClaude, codex: parseCodex, grok: parseGrok, agy: parseAgy, muse: parseMuse };
  const metricKeys = ['costUsd', 'costSource', 'inputTokens', 'cachedTokens', 'cacheWriteTokens', 'uncachedInputTokens',
    'outputTokens', 'reasoningTokens', 'totalTokens', 'turns', 'rounds', 'subagents', 'replyChars', 'apiMinutes', 'models'];
  if (!fs.existsSync(outDir)) return;
  let n = 0;
  for (const d of fs.readdirSync(outDir)) {
    const resFile = path.join(outDir, d, 'result.json'), outFile = path.join(outDir, d, 'agent.out');
    if (!fs.existsSync(resFile) || !fs.existsSync(outFile)) continue;
    const r = JSON.parse(fs.readFileSync(resFile, 'utf8')), parse = parsers[r.provider];
    if (!parse) continue;
    let m; try { m = tokenTotals(parse(fs.readFileSync(outFile, 'utf8'), {})); } catch (e) { console.log(`· ${d}: ${e.message}`); continue; }
    m.replyChars = String(m.reply ?? '').trim().length;
    for (const k of metricKeys) if (m[k] !== undefined) r[k] = m[k];
    try { if (r.entry) r.todos = markers(fs.readFileSync(path.join(outDir, r.entry), 'utf8')); } catch {}
    fs.writeFileSync(resFile, JSON.stringify(r, null, 2)); n++;
  }
  console.log(`Reparsed ${n} run(s).`);
}

// TODO / FIXME left in the game file (the prompt asks for none). Only these two: "not implemented"
// and "placeholder" also turn up in bundled libraries and HTML attributes.
const markers = (t) => (t.match(/\bTODO\b|\bFIXME\b/g) ?? []).length;

// The deliverable is the bundled .html in the work folder's root. Size is
// measured on that file; dev files are counted separately.
function measureOutput(work) {
  let devFiles = 0, entry = null, fallback = null;
  try {
    const roots = fs.readdirSync(work).filter((f) => /\.html?$/i.test(f))
      .map((f) => ({ f, size: fs.statSync(path.join(work, f)).size })).sort((a, b) => b.size - a.size);
    if (roots[0]) entry = path.join(work, roots[0].f);
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (['node_modules', '.git'].includes(e.name)) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else { devFiles++; if (!fallback && /^index\.html?$/i.test(e.name)) fallback = p; }
      }
    };
    walk(work);
  } catch {}
  const file = entry ?? fallback;
  let kb = null, loc = null, todos = null;
  if (file) { const t = fs.readFileSync(file, 'utf8'); kb = Math.round(t.length / 1024); loc = t.split('\n').length; todos = markers(t); }
  return { delivered: !!entry, kb, loc, files: devFiles, todos,
    entry: file ? path.relative(outDir, file).split(path.sep).join('/') : null };
}

// Take runs round-robin across CLIs so parallel slots go to different services (each keeps
// its config order), and start one only while its CLI has fewer than --per-cli running.
function interleave(list) {
  const lanes = new Map();
  for (const r of list) { const p = r.agent.provider; if (!lanes.has(p)) lanes.set(p, []); lanes.get(p).push(r); }
  const out = [];
  for (let i = 0; out.length < list.length; i++) for (const l of lanes.values()) if (i < l.length) out.push(l[i]);
  return out;
}

// Once the budget is spent, no new run starts; the ones already going finish, since what they've
// spent so far would be thrown away otherwise.
async function pool() {
  const pending = interleave(queue), busy = {}, waiting = [];
  const wakeAll = () => waiting.splice(0).forEach((w) => w());
  const worker = async () => {
    while (pending.length && !stopping && !overBudget) {
      if (spent >= args.budget) {
        overBudget = true;
        console.log(`■ Budget of $${args.budget} reached (spent ${fmtUsd(spent)}): no new runs start; ${children.size} still running will finish.`);
        break;
      }
      const i = pending.findIndex((r) => (busy[r.agent.provider] ?? 0) < args.perCli);
      if (i < 0) { await new Promise((w) => waiting.push(w)); continue; } // every CLI left is at its limit
      const [run] = pending.splice(i, 1), p = run.agent.provider;
      busy[p] = (busy[p] ?? 0) + 1;
      try { await runOne(run); } finally { busy[p]--; wakeAll(); }
    }
    wakeAll();
  };
  await Promise.all(Array.from({ length: Math.max(1, args.concurrency) }, worker));
}

// --smoke agent:effort: one tiny task in a temp folder with the same command line and parser
// as a real run, to check install, login, model ID, effort, flags and parsing in about a minute.
// Prints one JSON line (the dashboard's Test button reads it) and deletes the folder.
async function smoke() {
  const [id, eff] = args.smoke.split(':');
  const agent = cfg.agents.find((a) => a.id === id);
  const say = (o) => console.log(JSON.stringify({ key: args.smoke, at: new Date().toISOString(), ...o }));
  if (!agent) return say({ ok: false, error: `No model named "${id}" in ${path.basename(configPath)}` });
  if (args.smokeGoal && !GOAL_CLIS.has(agent.provider)) return say({ ok: false, error: `${CLIS[agent.provider]} has no headless /goal` });
  if (!findBin(binOf(agent.provider))) return say({ ok: false, error: `Command "${binOf(agent.provider)}" not found` });
  const pe = parseEffort(eff ?? agent.efforts?.[0]);
  const combo = args.smokeGoal ? { [GOAL_DIM]: { id: 'smoke', text: 'smoke.txt exists in this folder and contains the word ok.' } } : {};
  const run = { id: 'smoke', agent, effort: pe.base, ultracode: pe.ultracode, combo };
  const task = 'Create a file named smoke.txt in the current folder containing the word ok. Then reply with exactly: SMOKE-OK';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'matrix-smoke-'));
  prepare(run, dir, task);
  const { exitCode, metrics, start, bin, argv } = await spawnAgent(run, dir, task, args.timeout || (args.smokeGoal ? 10 : 4));
  const read = (f, n) => { try { const t = fs.readFileSync(path.join(dir, f), 'utf8'); return t.length > n ? '…' + t.slice(-n) : t; } catch { return ''; } };
  const reply = String(metrics.reply ?? '');
  const status = exitCode === 0 && !metrics.isError ? 'ok' : 'failed';
  const checks = { exit: status === 'ok', file: /ok/i.test(read('work/smoke.txt', 100)),
    reply: args.smokeGoal ? reply.trim().length > 0 : reply.includes('SMOKE-OK'), tokens: (metrics.outputTokens ?? 0) > 0 };
  delete metrics.reply;
  const shown = (x) => { const s = String(x).length > 100 ? String(x).slice(0, 97) + '…' : String(x); return /[\s"'$`]/.test(s) ? JSON.stringify(s) : s; };
  say({ ok: Object.values(checks).every(Boolean), status, checks, provider: agent.provider, model: agent.model,
    effort: pe.label, goal: args.smokeGoal, exitCode, seconds: (Date.now() - start) / 1000, ...metrics,
    reply: reply.slice(0, 2000), command: [bin, ...argv].map(shown).join(' '),
    errTail: read('agent.err', 2000), outTail: read('agent.out', 3000) });
  fs.rmSync(dir, { recursive: true, force: true });
}
if (args.reparse) { reparseAll(); writeReport(); process.exit(0); }
if (args.smoke) { await smoke(); process.exit(0); }

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(stopFile, { force: true });
// A CLI that isn't installed would fail every one of its runs; skip them instead (they run next time).
for (const p of missingClis()) {
  const n = queue.filter((r) => r.agent.provider === p).length;
  console.log(`⚠ ${CLIS[p] ?? p}: command "${binOf(p)}" not found, so its ${n} run(s) are skipped. Install it or set its command in Setup → Advanced.`);
  queue = queue.filter((r) => r.agent.provider !== p);
}
const noCost = [...new Set(queue.filter((r) => !['claude', 'grok'].includes(r.agent.provider)).map((r) => r.agent.id))];
if (noCost.length && args.budget !== Infinity)
  console.log(`Note: ${noCost.join(', ')} don't report cost, so the budget only counts Claude/Grok spend.`);
// Each CLI's version, saved with every run: an update can change results as much as the model.
for (const p of new Set(queue.filter((r) => !isDone(r.id)).map((r) => r.agent.provider))) {
  const v = spawnSync(binOf(p), ['--version'], { encoding: 'utf8', shell: isWin, timeout: 30000 });
  cliVersions[p] = `${v.stdout ?? ''}${v.stderr ?? ''}`.match(/\d+\.\d+[\w.-]*/)?.[0];
}
// The dashboard reads this line for the batch's progress (runs already done are skipped, not redone).
const already = queue.filter((r) => isDone(r.id)).length;
console.log(`${queue.length} runs${already ? ` (${already} already done)` : ''} → ${outDir}  (concurrency ${args.concurrency}${args.perCli < Infinity ? `, at most ${args.perCli} per CLI` : ''})`);
await pool();
clearInterval(stopPoll);
fs.rmSync(stopFile, { force: true });
writeReport();
console.log(`Done. ${done} ran, ${skipped} skipped. Spent ${fmtUsd(spent)} this session.`);

// -------------------------------------------------------------- report
function fmtUsd(v) { return v == null ? '$?' : `$${v.toFixed(2)}`; }

function readScores() {
  try { return JSON.parse(fs.readFileSync(path.join(outDir, 'scores.json'), 'utf8')); } catch { return {}; }
}

// results.csv for spreadsheets, plus a static gallery for when the dashboard isn't running.
function writeReport() {
  if (!fs.existsSync(outDir)) return;
  const rows = fs.readdirSync(outDir).map(readResult).filter((r) => r?.id); // skips a result.json being written
  const dims = cfg.dimensions ? Object.keys(cfg.dimensions) : [];
  const scores = readScores();
  // A review saved with a startedAt belongs to that attempt only (the dashboard does the same).
  for (const r of rows) { const s = scores[r.id]; if (s && (!s.startedAt || s.startedAt === r.startedAt)) { const { startedAt, ...rest } = s; Object.assign(r, rest); } }
  const cols = ['id', 'agent', 'provider', 'model', 'effort', 'ultracode', ...dims, 'cliVersion', 'promptVersion', 'status', 'wallMinutes', 'apiMinutes', 'costUsd', 'costSource',
    'inputTokens', 'uncachedInputTokens', 'cachedTokens', 'cacheWriteTokens', 'outputTokens', 'reasoningTokens', 'totalTokens', 'turns', 'rounds', 'subagents',
    'delivered', 'kb', 'loc', 'files', 'todos', 'replyChars', 'score', 'notes', 'error', 'entry', 'startedAt', 'finishedAt'];
  const cell = (v) => v == null ? '' : typeof v === 'number' ? +v.toFixed(4)
    : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
  fs.writeFileSync(path.join(outDir, 'results.csv'),
    [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n');

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const href = (p) => esc(String(p).split('/').map(encodeURIComponent).join('/')); // a # ? or % in a game's title would break the link
  const show = ['agent', 'effort', ...dims, 'status', 'delivered', 'wallMinutes', 'costUsd', 'outputTokens', 'kb', 'score'];
  const html = `<!doctype html><meta charset="utf-8"><title>Matrix runs</title>
<style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}table{border-collapse:collapse;width:100%}
th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;white-space:nowrap}th{cursor:pointer;background:#f4f4f4;position:sticky;top:0}
.failed{color:#b00}@media(prefers-color-scheme:dark){body{background:#111;color:#eee}th{background:#222}td,th{border-color:#333}a{color:#8bf}}</style>
<h1>Matrix runs (${rows.length})</h1><p>Static copy. For scoring and comparisons, run <code>node dashboard.mjs</code>.</p>
<table><thead><tr><th>play</th>${show.map((c) => `<th>${c}</th>`).join('')}<th>files</th></tr></thead><tbody>
${rows.map((r) => `<tr class="${esc(r.status)}"><td>${r.entry ? `<a href="${href(r.entry)}">▶</a>` : '—'}</td>${show.map((c) =>
  `<td>${esc(typeof r[c] === 'number' ? +r[c].toFixed(c === 'costUsd' ? 2 : 1) : r[c])}</td>`).join('')}<td><a href="${href(r.id)}/prompt.md">prompt</a> · <a href="${href(r.id)}/reply.md">reply</a></td></tr>`).join('\n')}
</tbody></table><script>
document.querySelectorAll('th').forEach((th,i)=>th.onclick=()=>{const tb=th.closest('table').tBodies[0],rs=[...tb.rows],d=th.dataset.d=th.dataset.d==='a'?'d':'a';
rs.sort((x,y)=>{const a=x.cells[i].innerText,b=y.cells[i].innerText,n=parseFloat(a)-parseFloat(b);return (isNaN(n)?a.localeCompare(b):n)*(d==='a'?1:-1)});rs.forEach(r=>tb.append(r))})
</script>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}
