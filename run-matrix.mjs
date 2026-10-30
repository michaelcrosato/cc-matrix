#!/usr/bin/env node
// run-matrix.mjs — run every combination in matrix.config.json headless through
// Claude Code (`claude -p`), Codex (`codex exec`), Grok (`grok --prompt-file`), Antigravity
// (`agy -p`) and/or Muse Code (`muse exec`), and record time, tokens and cost for
// each run. No dependencies; Node 18+.
// Usually driven by the dashboard (node dashboard.mjs), but works on its own.
//
// costUsd is only ever what the CLI itself reports: Claude Code (at API list prices) and Grok (at its own,
// lower rate). Every run also gets apiCostUsd, its tokens at the labs' public API list prices (PRICES), to
// compare runs across CLIs. Codex and Grok print less than they use (subagents, /goal helpers): their
// session logs fill that in (sessionLogs).
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
//        --resume-failed              a failed Claude Code run that got partway continues its session instead of
//                                     starting over (canResume); with --rerun-failed the others start over
//        --reparse                    re-read tokens/cost from each run's saved agent.out and the CLIs' session
//                                     logs (after parser or price changes)
//        --control                    take setting changes mid-batch on stdin (the dashboard; see control())

import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ------------------------------------------------------------------ args
const args = { config: fs.existsSync('matrix.config.json') ? 'matrix.config.json' : 'matrix.config.mjs',
  out: 'runs', concurrency: 2, perCli: Infinity, only: [], pick: [], limit: Infinity, repeat: 1, timeout: 0,
  budget: Infinity, dryRun: false, json: false, report: false, reparse: false, rerunFailed: false, resumeFailed: false, smoke: null, smokeGoal: false, control: false };
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
  else if (a === '--resume-failed') args.resumeFailed = true;
  else if (a === '--control') args.control = true;
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

// A finished run counts for the combination it ran, by the id it would get now. A run made before a
// dimension was added doesn't have it (in its folder name or result.json), so it counts as that
// dimension's variant marked olderRuns, else its first: adding a field to the prompt doesn't redo
// every finished run. A dimension removed since is left out, so its runs count for what's left.
// A declaration too: the report fills these in.
function olderVariant(d) { return (cfg.dimensions[d].find((v) => v.olderRuns) ?? cfg.dimensions[d][0])?.id; }
function runKey(r) {
  const parts = r.id.split('__'), last = parts.at(-1);
  const rep = parts.length > 1 && /^r\d+$/.test(last) && !dimNames.some((d) => r[d] === last) ? last : null;
  return [parts[0], ...dimNames.map((d) => r[d] ?? olderVariant(d)), rep].filter(Boolean).join('__');
}
// Finished runs by key, read once. Two with the same key (a dimension was removed) count as one:
// an OK one if there is one, else the latest. An unreadable result.json counts as not done.
let finishedRuns = null;
function prevRun(run) {
  if (!finishedRuns) {
    finishedRuns = new Map();
    const better = (a, b) => (a.status === 'ok') !== (b.status === 'ok') ? a.status === 'ok' : (a.startedAt ?? '') > (b.startedAt ?? '');
    for (const dir of fs.existsSync(outDir) ? fs.readdirSync(outDir) : []) {
      const r = readResult(dir);
      if (!r?.id) continue;
      const k = runKey(r), cur = finishedRuns.get(k);
      if (!cur || better(r, cur.r)) finishedRuns.set(k, { r, dir });
    }
  }
  return finishedRuns.get(run.id) ?? null;
}
// --resume-failed: a failed run that got partway continues its CLI session where it stopped instead of
// starting over (resumeOne). Claude Code only (`claude -p --resume`). It needs the same folder and model,
// output already made (one that failed on its first request, like on a usage limit, just starts over),
// its session still on disk and, with a time limit, time left of it.
const RESUMABLE = new Set(['claude']);
function canResume(run, p = prevRun(run)) {
  const r = p?.r;
  if (!args.resumeFailed || !r || r.status === 'ok' || !RESUMABLE.has(run.agent.provider) || p.dir !== run.id) return false;
  if (!r.sessionId || !(r.outputTokens > 0) || r.model !== run.agent.model) return false;
  const limit = +(run.agent.timeout || args.timeout || 0);
  if (limit && (r.wallMinutes ?? 0) >= limit) return false;
  return !!claudeTranscript(r.sessionId, path.join(outDir, p.dir, 'work'));
}
// Claude Code keeps each session as <config dir>/projects/<its folder, every other character a dash>/<id>.jsonl
// (a long folder name is shortened, so it's also looked for in the others).
function claudeTranscript(sessionId, cwd) {
  const root = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects'), file = `${sessionId}.jsonl`;
  const own = path.join(root, cwd.replace(/[^a-zA-Z0-9]/g, '-'), file);
  if (fs.existsSync(own)) return own;
  try { for (const d of fs.readdirSync(root)) if (fs.existsSync(path.join(root, d, file))) return path.join(root, d, file); } catch {}
  return null;
}
const isDone = (run) => { const p = prevRun(run); return !!p && (p.r.status === 'ok' || !(args.rerunFailed || canResume(run, p))); };

if (args.dryRun) {
  const byAgent = {}, resuming = queue.filter((r) => canResume(r));
  for (const r of queue) byAgent[r.fields.agent] = (byAgent[r.fields.agent] ?? 0) + 1;
  let sample = '', error = null;
  try { if (queue[0]) { sample = buildPrompt(queue[0]); const g = goalMessage(queue[0]);
    if (g) sample = `Message sent:\n${g}\n\n--- TASK.md ---\n${sample}`; } } catch (e) { error = e.message; }
  if (args.json) {
    console.log(JSON.stringify({ count: queue.length, byAgent, alreadyDone: queue.filter(isDone).length, resumes: resuming.length,
      ids: queue.map((r) => r.id), sampleId: queue[0]?.id ?? null, sample, error, missingClis: missingClis().map(binOf) }));
  } else {
    console.log(`${queue.length} runs  (${Object.entries(byAgent).map(([k, v]) => `${k}: ${v}`).join(', ')})\n`);
    for (const r of queue) console.log('  ' + r.id + (resuming.includes(r) ? '  (resumes)' : ''));
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
    // Resuming (resumeOne): the same session, sent its /goal again or told to carry on.
    const goal = run.resume?.message ?? goalMessage(run);
    if (goal) argv.push(goal); // short, so pass it as the argument like the docs show
    if (run.resume) argv.push('--resume', run.resume.sessionId);
    // stream-json: every event, not just the result (tool calls, compactions, plan limits); it needs --verbose.
    argv.push('--output-format', 'stream-json', '--verbose', '--model', agent.model);
    if (effort) argv.push('--effort', effort);
    // Always set Ultracode explicitly so a global setting can't leak into the comparison.
    argv.push('--settings', JSON.stringify({ ultracode: !!run.ultracode }));
    argv.push(...extra('claude'));
    return { bin: binOf('claude'), argv, promptInArgs: !!goal };
  },
  codex(agent, effort) {
    const argv = ['exec', '--json', '-m', agent.model];
    if (effort) argv.push('-c', `model_reasoning_effort=${effort}`);
    argv.push(...extra('codex'), '-'); // '-' = read prompt from stdin
    return { bin: binOf('codex'), argv };
  },
  grok(agent, effort, prompt, run, promptFile) {
    // A /goal command has to be the message itself; otherwise read the prompt from its file.
    // streaming-messages-json is Claude Code's stream format and ends with the same result line.
    const goal = goalMessage(run);
    const argv = [...(goal ? ['-p', goal] : ['--prompt-file', promptFile]),
      '--output-format', 'streaming-messages-json', '--model', agent.model];
    if (effort) argv.push('--reasoning-effort', effort);
    argv.push(...extra('grok'));
    return { bin: binOf('grok'), argv, promptInArgs: true };
  },
  agy(agent, effort, prompt, run) {
    // agy -p reads neither stdin nor a file, so the prompt is the argument. Model IDs are
    // the base name (gemini-4-argon) with the effort separate; `agy models` lists both.
    const argv = ['-p', goalMessage(run) ?? prompt, '--output-format', 'stream-json', '--model', agent.model];
    if (effort) argv.push('--effort', effort);
    argv.push(...extra('agy'));
    return { bin: binOf('agy'), argv, promptInArgs: true };
  },
  muse(agent, effort, prompt, run, promptFile) {
    const goal = goalMessage(run);
    const argv = ['exec', '--json', '--model', agent.model];
    if (effort) argv.push('--reasoning-effort', effort);
    argv.push(...extra('muse'), ...(goal ? [goal] : ['--prompt-file', promptFile]));
    return { bin: binOf('muse'), argv, promptInArgs: true };
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

// Besides tokens and cost, each parser reports what its CLI's output shows of what the run did: model
// requests (apiCalls), tool calls (toolCalls, and per tool in `tools`), failed tool calls (toolErrors),
// context compactions, and the plan's usage limits as the run ended (`plan`, what /usage or /status shows).
// `models` splits the tokens per model, which apiPrice() prices.
const add = (map, k, n = 1) => { map[k] = (map[k] ?? 0) + n; };
const total = (map) => Object.values(map).reduce((a, b) => a + b, 0);
// One model's tokens in `models`; input counts cache reads and writes.
const modelUse = (input, cached, cacheWrite, output, reasoning) => ({ uncachedInputTokens: input - cached - cacheWrite,
  cacheReadTokens: cached, cacheWriteTokens: cacheWrite, outputTokens: output, reasoningTokens: reasoning });
function addModel(models, id, u) {
  const m = models[id] ??= { uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: null };
  for (const k of ['uncachedInputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens']) m[k] += u[k] ?? 0;
  if (u.reasoningTokens != null) m.reasoningTokens = (m.reasoningTokens ?? 0) + u.reasoningTokens;
  if (u.costUsd != null) m.costUsd = (m.costUsd ?? 0) + u.costUsd;
}

// One of the plan's limit windows: % used as the run ended (and as it started, when the CLI said) and when it resets.
const planWindow = (name, usedPct, startPct, resetsMs) => ({ name, usedPct,
  ...(startPct != null ? { startPct } : {}), ...(resetsMs ? { resetsAt: new Date(resetsMs).toISOString() } : {}) });
const pctOf = (fraction) => fraction == null ? null : Math.round(fraction * 1000) / 10;
const CLAUDE_WINDOWS = { five_hour: '5h', seven_day: 'week', seven_day_opus: 'week (Opus)', seven_day_sonnet: 'week (Sonnet)' };

// Claude Code's rate_limit_event: how much of the subscription's 5-hour and weekly windows is used.
function claudePlan(events) {
  if (!events.length) return undefined;
  const windows = (i) => i.unifiedWindows ?? (i.rateLimitType ? { [i.rateLimitType]: i } : {});
  const first = windows(events[0]), last = windows(events.at(-1));
  return { windows: Object.entries(last).map(([k, w]) => planWindow(CLAUDE_WINDOWS[k] ?? k, pctOf(w.utilization),
    pctOf(first[k]?.utilization), w.resetsAt ? w.resetsAt * 1000 : null)) };
}

// Claude Code's stream-json, which Grok's streaming-messages-json copies: one event per line, then the
// result line. Runs from before stream-json saved only the result line, so they have no tool counts.
function readStream(text) {
  const s = { tools: {}, ids: new Set(), results: [], toolErrors: 0, compactions: 0, limits: [] };
  for (const l of text.split('\n')) {
    if (!l.startsWith('{')) continue;
    let e; try { e = JSON.parse(l); } catch { continue; }
    const content = Array.isArray(e.message?.content) ? e.message.content : [];
    if (e.type === 'assistant') { // a response arrives in several events, one per content block
      if (e.message.id) s.ids.add(e.message.id);
      for (const b of content) if (b.type === 'tool_use' || b.type === 'server_tool_use') add(s.tools, b.name);
    } else if (e.type === 'user') s.toolErrors += content.filter((b) => b.type === 'tool_result' && b.is_error).length;
    else if (e.type === 'system' && e.subtype === 'compact_boundary') s.compactions++;
    else if (e.type === 'rate_limit_event' && e.rate_limit_info) s.limits.push(e.rate_limit_info);
    else if (e.type === 'result') s.results.push(e);
  }
  return s;
}

// A resumed session's result counts the whole session so far: Claude Code restores the cost-state its
// transcript saved as the last part ended (cost, API time, tokens per model). `since` is that state, taken
// off so a part counts only itself (the stream's own events and num_turns are this part's already).
function minusSince(j, since) {
  if (!j || !since) return j;
  const modelUsage = {};
  for (const [id, m] of Object.entries(j.modelUsage ?? {})) {
    const b = since.modelUsage?.[id] ?? {};
    const u = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, typeof v === 'number' && typeof b[k] === 'number' ? v - b[k] : v]));
    if (u.inputTokens || u.outputTokens || u.cacheReadInputTokens || u.cacheCreationInputTokens) modelUsage[id] = u;
  }
  return { ...j, modelUsage, total_cost_usd: j.total_cost_usd == null ? null : j.total_cost_usd - (since.totalCostUSD ?? 0),
    duration_api_ms: j.duration_api_ms == null ? null : j.duration_api_ms - (since.totalAPIDuration ?? 0) };
}

function parseClaude(text, agent, ctx) {
  const s = readStream(text), j = minusSince(s.results.at(-1), ctx?.since);
  if (!j) return { isError: true };
  return { reply: j.result, costUsd: j.total_cost_usd, costSource: j.total_cost_usd != null ? 'reported' : 'none',
    ...usageTotals(j), apiMinutes: j.duration_api_ms ? j.duration_api_ms / 60000 : null,
    // Each /goal round ends with a result line, whose num_turns counts that round only.
    turns: s.results.reduce((n, r) => n + (r.num_turns ?? 0), 0) || j.num_turns,
    rounds: j.result_index != null ? j.result_index + 1 : undefined, subagents: j.subagent_stats?.spawned,
    ...(s.ids.size ? { apiCalls: s.ids.size, toolCalls: total(s.tools), tools: s.tools, toolErrors: s.toolErrors, compactions: s.compactions } : {}),
    firstTokenMs: j.ttft_ms, plan: claudePlan(s.limits),
    // A usage limit ends with is_error and its message as the result, without `errors`.
    isError: !!j.is_error, error: !j.is_error ? undefined : j.errors?.length ? j.errors.join('; ') : j.result || undefined, sessionId: j.session_id };
}

// Grok's stream ends with Claude Code's result line, or {"type":"error","message"} if it couldn't start.
function parseGrok(text) {
  const line = lastJsonLine(text), j = line ? JSON.parse(line) : null;
  if (j?.type === 'error') return { isError: true, error: j.message };
  return parseClaude(text);
}

// agy --output-format stream-json: an init line, a step_update per step (a model response with its usage,
// or a tool call with its name) and a result line with status, response, error, num_turns and usage
// {input_tokens, output_tokens, thinking_tokens, cache_read_tokens, total_tokens}. Runs from before saved
// --output-format json: that result object alone. No cost.
function parseAgy(text, agent = {}) {
  const tools = {}, seen = new Set();
  let j, model, calls = 0, toolErrors = 0, streamed = false;
  for (const l of text.split('\n')) {
    if (!l.startsWith('{')) continue;
    let e; try { e = JSON.parse(l); } catch { continue; }
    if (!e.event) { j = e; continue; } // --output-format json
    streamed = true;
    const st = e.step_update, key = st && `${st.conversation_id}:${st.step_index}`;
    if (e.event === 'init') model = e.init?.model;
    else if (e.event === 'result') j = e.result;
    else if (st && st.state !== 'ACTIVE' && !seen.has(key)) { // a step's text streams in while ACTIVE; count it once, when it ends
      seen.add(key);
      if (st.step_type === 'agent_response' && st.usage) calls++;
      else if (st.step_type === 'tool') { add(tools, st.tool_name ?? 'tool'); if (st.state !== 'DONE') toolErrors++; }
    }
  }
  if (!j) return { isError: true };
  // input_tokens leaves out cache reads (and total_tokens is just input + output), so add them
  // to count all input like the other CLIs do. output_tokens already includes thinking.
  const u = j.usage ?? {}, cached = u.cache_read_tokens ?? 0, input = (u.input_tokens ?? 0) + cached;
  return { reply: j.response, costUsd: null, costSource: 'none', inputTokens: input,
    cachedTokens: u.cache_read_tokens ?? null, outputTokens: u.output_tokens ?? 0, reasoningTokens: u.thinking_tokens ?? null,
    turns: j.num_turns, models: { [model ?? agent.model ?? 'unknown']: modelUse(input, cached, 0, u.output_tokens ?? 0, u.thinking_tokens ?? null) },
    ...(streamed ? { apiCalls: calls, toolCalls: total(tools), tools, toolErrors } : {}),
    isError: j.status !== 'SUCCESS', error: j.error || undefined, sessionId: j.conversation_id || undefined };
}

// muse exec --json: JSON lines of runtime events. run.usage (one per run, cumulative) has the
// tokens per model, the model calls and the plan's allowance; tool.result one per tool call;
// run.terminal.<completed|failed|…> the outcome and the final reply.
// Muse reports how much of the plan's allowance is used, not a cost.
function parseMuse(text, agent = {}) {
  const usage = new Map(), tools = {};
  let rootRun, terminal, sessionId, toolErrors = 0;
  for (const l of text.split('\n')) {
    if (!l.startsWith('{')) continue;
    let e; try { e = JSON.parse(l); } catch { continue; }
    const p = e.payload ?? {}, runId = p.run_stream?.id;
    if (e.stream?.kind === 'session') sessionId ??= e.stream.id;
    if (e.payload_type === 'session.run.linked') rootRun ??= runId;
    else if (e.payload_type === 'run.usage' && runId) usage.set(runId, p);
    else if (e.payload_type === 'tool.result') {
      const f = p.correlation_facts ?? {};
      add(tools, f.tool_name ?? 'tool');
      if (f.outcome && f.outcome !== 'success') toolErrors++;
    } else if (e.payload_type?.startsWith('run.terminal.') && (!rootRun || runId === rootRun)) terminal = p;
  }
  // Subagent runs report separately unless the main run already includes them.
  const root = usage.get(rootRun), models = {};
  let input = 0, cached = 0, output = 0, reasoning = 0, calls = 0;
  for (const u of root?.children_included ? [root] : usage.values()) {
    calls += u.calls ?? 0;
    for (const m of u.models ?? []) { input += m.input_tokens ?? 0; cached += m.cached_tokens ?? 0;
      output += m.output_tokens ?? 0; reasoning += m.reasoning_tokens ?? 0;
      addModel(models, m.model ?? agent.model ?? 'unknown', modelUse(m.input_tokens ?? 0, m.cached_tokens ?? 0, 0, m.output_tokens ?? 0, m.reasoning_tokens ?? null)); }
  }
  const a = (root ?? [...usage.values()].at(-1))?.allowance;
  const plan = a && { tier: a.tier ?? undefined, windows: [['window', a.window], ['week', a.weekly]].filter(([, w]) => w)
    .map(([name, w]) => planWindow(name, w.used_percent ?? null, null, w.resets_at_ms)) };
  return { reply: terminal?.text || undefined, costUsd: null, costSource: 'none', inputTokens: input,
    cachedTokens: cached, outputTokens: output, reasoningTokens: reasoning, turns: calls, models,
    apiCalls: calls, toolCalls: total(tools), tools, toolErrors, plan: plan || undefined,
    isError: terminal?.terminal !== 'completed', error: terminal?.reason || undefined, sessionId };
}

// Codex items that aren't tool calls (the rest are command_execution, file_change, web_search, mcp_tool_call, …).
const CODEX_NOT_TOOLS = new Set(['agent_message', 'reasoning', 'todo_list', 'error', 'user_message', 'sub_agent_activity']);

// codex exec --json: the main thread only. usage.input_tokens includes the cached ones and output_tokens
// the reasoning. Its subagents are added from Codex's session logs (codexLogs).
function parseCodex(text, agent = {}) {
  const tools = {};
  let input = 0, cached = 0, cacheWrite = null, output = 0, reasoning = 0, turns = 0, toolErrors = 0, isError = false, sessionId, reply, error;
  for (const l of text.split('\n')) {
    let e; try { e = JSON.parse(l); } catch { continue; }
    if (e.type === 'thread.started') sessionId = e.thread_id;
    if (e.type === 'item.completed' && e.item?.type === 'agent_message') reply = e.item.text;
    else if (e.type === 'item.completed' && e.item?.type && !CODEX_NOT_TOOLS.has(e.item.type)) {
      add(tools, e.item.type);
      if (e.item.status === 'failed') toolErrors++;
    }
    if (e.type === 'turn.completed' && e.usage) {
      turns++; input += e.usage.input_tokens ?? 0; cached += e.usage.cached_input_tokens ?? 0;
      output += e.usage.output_tokens ?? 0; reasoning += e.usage.reasoning_output_tokens ?? 0;
      if (e.usage.cache_write_input_tokens != null) cacheWrite = (cacheWrite ?? 0) + e.usage.cache_write_input_tokens;
    }
    // { type: 'error', message } or { type: 'turn.failed', error: { message } }, e.g. a usage limit
    if (e.type === 'turn.failed' || e.type === 'error') { isError = true; error = e.error?.message ?? e.message ?? error; }
  }
  return { reply, costUsd: null, costSource: 'none', inputTokens: input, cachedTokens: cached, cacheWriteTokens: cacheWrite,
    outputTokens: output, reasoningTokens: reasoning, turns, toolCalls: total(tools), tools, toolErrors,
    models: { [agent.model ?? 'unknown']: modelUse(input, cached, cacheWrite ?? 0, output, reasoning) }, isError, error, sessionId };
}

// ------------------------------------------------------- session logs
// Some CLIs print less than they record. Codex prints only its main thread's usage, though at high efforts
// it spawns subagents that run as threads of their own; Grok's stream covers its main session only, while
// its /goal loop also runs a planner, verifiers and a summarizer as sessions of their own. Both keep each
// thread's or session's usage in their logs, so it's read from there and added: `helpers` has what the
// CLI's own totals left out. Best effort: `sessionLog` says whether the log was read; without it the run
// keeps what the CLI printed. Also from the logs: Codex's plan limits, request count and first-token time,
// and Grok's request count and reasoning tokens.
function sessionLogs(provider, m, ctx) {
  const read = { codex: codexLogs, grok: grokLogs }[provider];
  if (!read || !m.sessionId) return;
  let x; try { x = read(m, ctx); } catch (e) { m.sessionLog = `unreadable: ${e.message}`; return; }
  m.sessionLog = x ? 'read' : 'not found';
  if (!x) return;
  for (const [id, u] of Object.entries(x.models ?? {})) addModel(m.models ??= {}, id, u);
  if (x.tools) {
    for (const [k, n] of Object.entries(x.tools)) add(m.tools ??= {}, k, n);
    m.toolErrors = (m.toolErrors ?? 0) + (x.toolErrors ?? 0); m.toolCalls = total(m.tools ?? {});
  }
  for (const k of ['apiCalls', 'subagents', 'compactions', 'firstTokenMs', 'plan', 'reasoningTokens']) if (x[k] != null) m[k] = x[k];
  if (!x.helpers) return;
  const h = m.helpers = x.helpers;
  m.inputTokens = (m.inputTokens ?? 0) + h.inputTokens;
  m.cachedTokens = (m.cachedTokens ?? 0) + h.cachedTokens;
  if (h.cacheWriteTokens) m.cacheWriteTokens = (m.cacheWriteTokens ?? 0) + h.cacheWriteTokens;
  m.outputTokens = (m.outputTokens ?? 0) + h.outputTokens;
  m.reasoningTokens = (m.reasoningTokens ?? 0) + h.reasoningTokens;
  if (h.costUsd != null && m.costUsd != null) m.costUsd += h.costUsd;
}

const json = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const sumOf = (list, k) => list.reduce((s, x) => s + (x[k] ?? 0), 0);
function firstLine(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(1 << 20), n = fs.readSync(fd, buf, 0, buf.length, 0), s = buf.toString('utf8', 0, n);
    return JSON.parse(s.slice(0, s.indexOf('\n') + 1 || undefined));
  } catch { return null; } finally { fs.closeSync(fd); }
}

// Codex: one rollout file per thread, ~/.codex/sessions/YYYY/MM/DD/rollout-<local start time>-<thread id>.jsonl
// (or $CODEX_HOME). A subagent's first line (session_meta) names its parent thread, and its file starts
// with a copy of the history it was given, up to its own thread_settings_applied.
const ROLLOUT = /^rollout-(\d{4})-(\d\d)-(\d\d)T(\d\d)-(\d\d)-(\d\d)-(.+)\.jsonl$/;
const snakeCase = (s) => String(s ?? '').replace(/[A-Z]/g, (c, i) => (i ? '_' : '') + c.toLowerCase());
const codexWindow = (min) => min === 300 ? '5h' : min === 10080 ? 'week' : min ? `${+(min / 60).toFixed(1)}h` : 'window';

function codexLogs(m, { start, end, model }) {
  const root = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions'), files = [];
  for (let t = start - 864e5; t <= end + 864e5; t += 864e5) {
    const d = new Date(t), dir = path.join(root, String(d.getFullYear()), pad(d.getMonth() + 1), pad(d.getDate()));
    for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      const x = f.match(ROLLOUT);
      if (x) files.push({ file: path.join(dir, f), id: x[7], at: new Date(+x[1], x[2] - 1, +x[3], +x[4], +x[5], +x[6]).getTime() });
    }
  }
  const main = files.find((f) => f.id === m.sessionId);
  if (!main) return null;
  // Subagents: threads started during the run whose parent is its main thread or one of its subagents.
  const spawned = files.filter((f) => f !== main && f.at >= start - 60e3 && f.at <= end + 60e3)
    .map((f) => ({ ...f, parent: firstLine(f.file)?.payload?.source?.subagent?.thread_spawn?.parent_thread_id })).filter((f) => f.parent);
  const ids = new Set([main.id]), subs = [];
  for (let grew = true; grew;) {
    grew = false;
    for (const f of spawned) if (!subs.includes(f) && ids.has(f.parent)) { subs.push(f); ids.add(f.id); grew = true; }
  }
  const scan = (f) => {
    const r = { calls: 0, tools: {}, toolErrors: 0, compactions: 0, limits: [], usage: null, model: null, firstTokenMs: null };
    const lines = fs.readFileSync(f.file, 'utf8').split('\n');
    const own = f === main ? 0 : Math.max(0, lines.findIndex((l) => l.includes('"thread_settings_applied"') && l.includes(f.id)));
    for (const l of lines.slice(own)) {
      let e; try { e = JSON.parse(l); } catch { continue; }
      const p = e.payload ?? {}, msg = e.type === 'event_msg' ? p.type : null;
      if (e.type === 'token_usage_record') { if ((p.thread_id ?? f.id) === f.id) r.calls++; } // one per model request
      else if (e.type === 'turn_context') r.model = p.model ?? r.model;
      else if (e.type === 'compacted') r.compactions++;
      else if (msg === 'token_count') { if (p.info?.total_token_usage) r.usage = p.info.total_token_usage; if (p.rate_limits) r.limits.push(p.rate_limits); }
      else if (msg === 'task_complete') r.firstTokenMs ??= p.time_to_first_token_ms ?? null;
      else if (msg === 'item_completed' && p.thread_id === f.id) {
        const t = snakeCase(p.item?.type);
        if (t && !CODEX_NOT_TOOLS.has(t)) { add(r.tools, t); if (p.item.status === 'failed') r.toolErrors++; }
      }
    }
    return r;
  };
  const top = scan(main), h = { agents: subs.length, inputTokens: 0, cachedTokens: 0, cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: 0, apiCalls: 0 };
  const models = {}, tools = {};
  let toolErrors = 0;
  for (const f of subs) {
    const s = scan(f), u = s.usage ?? {};
    const use = modelUse(u.input_tokens ?? 0, u.cached_input_tokens ?? 0, u.cache_write_input_tokens ?? 0, u.output_tokens ?? 0, u.reasoning_output_tokens ?? 0);
    addModel(models, s.model ?? model ?? 'unknown', use);
    h.inputTokens += u.input_tokens ?? 0; h.cachedTokens += use.cacheReadTokens; h.cacheWriteTokens += use.cacheWriteTokens;
    h.outputTokens += use.outputTokens; h.reasoningTokens += use.reasoningTokens; h.apiCalls += s.calls;
    for (const [k, n] of Object.entries(s.tools)) add(tools, k, n);
    toolErrors += s.toolErrors;
  }
  // rate_limits: the plan's primary and secondary windows (used_percent, window_minutes, resets_at in seconds).
  const first = top.limits[0], last = top.limits.at(-1);
  const plan = last && { tier: last.plan_type ?? undefined, windows: ['primary', 'secondary'].filter((k) => last[k]).map((k) =>
    planWindow(codexWindow(last[k].window_minutes), last[k].used_percent ?? null, first[k]?.used_percent ?? null, last[k].resets_at ? last[k].resets_at * 1000 : null)) };
  return { helpers: subs.length ? h : null, models, tools, toolErrors, subagents: subs.length, apiCalls: top.calls + h.apiCalls,
    compactions: top.compactions, firstTokenMs: top.firstTokenMs, plan };
}

// Grok: ~/.grok/sessions/<url-encoded working folder>/<session id>/ (or $GROK_HOME) has usage.json (tokens,
// model calls, cost in 1e-10 USD ticks); with /goal, subagents/<id>/meta.json names each helper's own
// session folder beside it. The main usage.json can already include a helper (the planner), so what it has
// beyond the stream's result line is matched to helpers, which then count once.
function grokLogs(m, { cwd, model }) {
  const root = path.join(process.env.GROK_HOME || path.join(os.homedir(), '.grok'), 'sessions');
  let dir = path.join(root, encodeURIComponent(cwd), m.sessionId);
  if (!fs.existsSync(dir)) dir = (fs.existsSync(root) ? fs.readdirSync(root) : []).map((d) => path.join(root, d, m.sessionId)).find((d) => fs.existsSync(d));
  if (!dir) return null;
  const main = json(path.join(dir, 'usage.json'))?.session, kids = [], subDir = path.join(dir, 'subagents');
  for (const s of fs.existsSync(subDir) ? fs.readdirSync(subDir) : []) {
    const u = json(path.join(path.dirname(dir), json(path.join(subDir, s, 'meta.json'))?.child_session_id ?? s, 'usage.json'))?.session;
    if (u) kids.push(u);
  }
  const extra = (main?.inputTokens ?? 0) - (m.inputTokens ?? 0);
  let inMain = [];
  if (extra > 0 && kids.length <= 16) for (let mask = 1; mask < 1 << kids.length; mask++) {
    const set = kids.filter((_, i) => mask & (1 << i));
    if (sumOf(set, 'inputTokens') === extra) { inMain = set; break; }
  }
  const mainOnly = (k) => main?.[k] != null ? main[k] - sumOf(inMain, k) : null, models = {};
  for (const k of kids) addModel(models, k.primaryModelId ?? model ?? 'unknown', { ...modelUse(k.inputTokens ?? 0, k.cachedReadTokens ?? 0,
    k.cacheCreationTokens ?? 0, k.outputTokens ?? 0, k.reasoningTokens ?? null), costUsd: (k.costUsdTicks ?? 0) / 1e10 });
  const h = { agents: kids.length, inputTokens: sumOf(kids, 'inputTokens'), cachedTokens: sumOf(kids, 'cachedReadTokens'),
    cacheWriteTokens: sumOf(kids, 'cacheCreationTokens'), outputTokens: sumOf(kids, 'outputTokens'), reasoningTokens: sumOf(kids, 'reasoningTokens'),
    apiCalls: sumOf(kids, 'modelCalls'), costUsd: sumOf(kids, 'costUsdTicks') / 1e10 };
  const calls = mainOnly('modelCalls');
  return { helpers: kids.length ? h : null, models, subagents: kids.length, reasoningTokens: mainOnly('reasoningTokens'),
    apiCalls: calls != null ? calls + h.apiCalls : null };
}

// ------------------------------------------------------------- prices
// Public API list prices, USD per million tokens, to put a comparable price on every run (apiCostUsd): what
// its tokens would cost through the lab's own API at the standard tier and context length (no batch, priority
// or long-context rates). Checked 2026-10-29 on the labs' pricing pages (Muse: Meta's rate card as quoted by
// third parties). In a list, a price applies to runs started on or after its `from` date. Add or override
// models in matrix.config.json under "prices", same shape.
// Claude Code reports its own cost at these list prices, so for its runs that cost is used; the Claude rows
// price Claude models run through agy. Grok reports a discounted cost (34% of these prices in Oct 2026).
const PRICES = {
  'claude-opus-5-5': { input: 4, cachedInput: 0.2, cacheWrite: 5, output: 20 },
  'claude-sonnet-5-5': { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 10 },
  'claude-haiku-5-5': { input: 0.1, cachedInput: 0.01, cacheWrite: 0.125, output: 0.5 },
  'gpt-6.1-sol': { input: 2, cachedInput: 0.1, cacheWrite: 2.5, output: 10 },
  'gpt-6.1-terra': { input: 1, cachedInput: 0.05, cacheWrite: 1.25, output: 5 },
  'grok-4.7': { input: 2, cachedInput: 0.5, output: 6 },
  'gemini-4-argon': [{ input: 2, cachedInput: 0.1, output: 10 }, { from: '2026-12-01', input: 4, cachedInput: 0.2, output: 20 }],
  'muse-wonder-1.0': { input: 4, cachedInput: 0.2, output: 20 },
};
const prices = { ...PRICES, ...cfg.prices };

// A model's price on a day. CLIs report some models with a suffix (grok-4.7-build, gemini-4-argon-trial,
// muse-wonder-1.0-contributor, or agy's effort): they're priced as the model.
function priceFor(model, when) {
  const id = [model, String(model).replace(/-(build|trial|contributor|preview|low|medium|high|xhigh|max)$/, '')].find((k) => prices[k]);
  if (!id) return null;
  const day = new Date(when ?? Date.now()).toISOString().slice(0, 10);
  return [].concat(prices[id]).filter((p) => !p.from || p.from <= day).at(-1) ?? null;
}

// What a run's tokens cost at list prices: Claude Code's own figure, else tokens × price per model.
// Models with no price are listed in unpricedModels.
function apiPrice(m, provider, when) {
  if (provider === 'claude' && m.costUsd != null) return { apiCostUsd: m.costUsd };
  let usd = 0, priced = 0;
  const unpriced = [];
  for (const [id, u] of Object.entries(m.models ?? {})) {
    const p = priceFor(id, when);
    if (!p) { unpriced.push(id); continue; }
    usd += (u.uncachedInputTokens * p.input + u.cacheReadTokens * (p.cachedInput ?? p.input)
      + (u.cacheWriteTokens ?? 0) * (p.cacheWrite ?? p.input) + u.outputTokens * p.output) / 1e6;
    priced++;
  }
  return { apiCostUsd: priced ? usd : null, ...(unpriced.length ? { unpricedModels: unpriced } : {}) };
}

// ------------------------------------------------------------------ run
// The agents running now, by run id: the process, when it started and its time-limit timer, so a
// time limit changed mid-batch can reach them and one can be ended on request.
const live = new Map();
let spent = 0, stopping = false, overBudget = false, paused = false, done = 0, skipped = 0;
// The batch loop (pool) sleeps until a run ends or a setting changes; wake() lets it check again.
let wakeUp = null;
function wake() { const w = wakeUp; wakeUp = null; w?.(); }

// Kill the agent and everything it started (servers, browsers, subagents).
function killTree(child) {
  if (child.exitCode !== null) return;
  if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } }
}

function stopAll(reason) {
  if (stopping) return;
  stopping = true;
  console.log(`■ Stopping (${reason}): ending ${live.size} running agent(s)…`);
  for (const c of live.values()) killTree(c.child);
  wake(); // a paused batch with nothing running has nothing else to wake it
}

// A model's own time limit wins over the batch's.
const limitOf = (run) => +(run.agent.timeout || args.timeout || 0);
// (Re)arm a running agent's time limit, counted from when it started: one already past it ends now.
function setLimit(c, min) {
  clearTimeout(c.timer); c.timer = null;
  if (min > 0) c.timer = setTimeout(() => { c.err.write('\n[matrix] timed out\n'); killTree(c.child); },
    Math.min(2 ** 31 - 1, Math.max(0, c.start + min * 60000 - Date.now())));
}

// End one running agent on request. 'requeue' puts its run back at the front of the queue to start
// over; 'drop' leaves it out of this batch (it runs next time). Either way what it did so far is
// thrown away: an agent can't be picked up where it left off with the same measurements.
function endRun(id, how) {
  const c = live.get(id);
  if (!c || c.run.abort || c.child.exitCode !== null) return false; // gone, or finishing on its own
  c.run.abort = how; killTree(c.child);
  return true;
}
// Ctrl-C ends the running agents and throws their work away, so with agents running it asks to be pressed
// again. Under the dashboard (--control) it's left to the dashboard, which asks the same and then stops the
// batch itself: they share the terminal, so one Ctrl-C reaches both.
let ctrlCAt = 0;
process.on('SIGINT', () => {
  if (args.control) return;
  if (args.smoke || !live.size || Date.now() - ctrlCAt < 5000) return stopAll('Ctrl-C');
  ctrlCAt = Date.now();
  console.log(`\n${live.size} agent(s) running: press Ctrl-C again within 5 s to end them (what they've done so far is thrown away).`);
});
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

// Start the agent in dir/work, wait for it to exit (or hit `limit` minutes) and parse its output. A resumed
// run's later parts write their own output files (partFile) and say what the session had used before (since).
async function spawnAgent(run, dir, prompt, limit, part = 0, since = null) {
  const { bin, argv, promptInArgs } = providers[run.agent.provider](run.agent, run.effort, prompt, run, path.join(dir, 'prompt.md'));
  const outPath = path.join(dir, partFile(part, 'out')), errPath = path.join(dir, partFile(part, 'err'));
  const out = fs.createWriteStream(outPath), err = fs.createWriteStream(errPath);
  const start = Date.now();

  const exitCode = await new Promise((resolve) => {
    // On Windows, npm .cmd shims need a shell; quote args so prompts survive it.
    const a = isWin ? argv.map((x) => `"${String(x).replace(/"/g, '\\"')}"`) : argv;
    const child = spawn(bin, a, { cwd: path.join(dir, 'work'), shell: isWin, detached: !isWin, env: process.env });
    const c = { run, child, start, err, timer: null };
    live.set(run.id, c);
    child.stdout.pipe(out); child.stderr.pipe(err);
    child.stdin.on('error', () => {});
    child.stdin.end(promptInArgs ? '' : prompt);
    setLimit(c, limit);
    child.on('error', (e) => { err.write(`\n[matrix] ${e.message}\n`); });
    child.on('close', (code) => { clearTimeout(c.timer); live.delete(run.id); resolve(code); });
  });
  await Promise.all([new Promise((r) => out.end(r)), new Promise((r) => err.end(r))]);

  let metrics = {};
  try { metrics = readMetrics(run.agent.provider, fs.readFileSync(outPath, 'utf8'), run.agent, { cwd: path.join(dir, 'work'), start, end: Date.now(), since }); }
  catch (e) { metrics = { isError: true, parseError: e.message }; }
  metrics.replyChars = String(metrics.reply ?? '').trim().length;
  if ((exitCode !== 0 || metrics.isError) && !metrics.error)
    metrics.error = lastLine(errPath) || metrics.parseError || (exitCode == null ? 'killed' : `exit code ${exitCode}`);
  return { exitCode, metrics, start, bin, argv };
}

// Runs not done yet (pool skips the others first).
async function runOne(run) {
  const dir = path.join(outDir, run.id), resFile = path.join(dir, 'result.json');
  const prev = prevRun(run);
  if (canResume(run, prev)) return resumeOne(run, prev);
  fs.rmSync(dir, { recursive: true, force: true });
  // A failed run being retried that was made before a dimension was added: the new attempt replaces it.
  if (prev && prev.dir !== run.id) fs.rmSync(path.join(outDir, prev.dir), { recursive: true, force: true });
  if (prev) finishedRuns.delete(run.id); // its old result is gone, so it isn't done if it's requeued
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
  const { exitCode, metrics, start } = await spawnAgent(run, dir, prompt, limitOf(run));

  if (stopping || run.abort) { // interrupted: throw it away so it runs fresh (later in this batch if requeued)
    fs.rmSync(dir, { recursive: true, force: true });
    if (run.abort === 'requeue' && !stopping) { run.abort = null; pending.unshift(run); console.log(`↺ ${run.id} requeued (starts over)`); }
    else console.log(`■ ${run.id} stopped (discarded)`);
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

// A resumed run's output: the first part's in agent.out and agent.err, part n's in agent.<n>.out and .err.
const partFile = (i, ext) => i ? `agent.${i + 1}.${ext}` : `agent.${ext}`;
// Sent to a resumed session that had no /goal (one with a /goal gets it again, from goal.md).
const RESUME_MESSAGE = 'Your session stopped before the task was finished. Continue where you left off and complete it.';

// --resume-failed: carry on with a failed run's session (see canResume) instead of starting over. Its folder
// stays as it is, work and all, and the new part's output goes to agent.<n>.out. The result adds up every
// part and keeps what the run was made with (prompt, variants, CLI version) and when it first started;
// `parts` lists each part's times and `resumes` counts them. Ended mid-way (Stop, ↻, ✕), the new part is
// thrown away and the run stays as it was, so it can be resumed again.
async function resumeOne(run, prev) {
  const dir = path.join(outDir, prev.dir), work = path.join(dir, 'work'), r = prev.r;
  const parts = r.parts ?? [{ startedAt: r.startedAt, finishedAt: r.finishedAt, wallMinutes: r.wallMinutes, exitCode: r.exitCode, cliVersion: r.cliVersion }];
  const n = parts.length, since = claudeCostState(claudeTranscript(r.sessionId, work));
  let message = RESUME_MESSAGE;
  try { message = fs.readFileSync(path.join(dir, 'goal.md'), 'utf8').trim() || message; } catch {}
  // The time limit counts every part, so this one gets what's left (canResume checked there's some).
  const limit = limitOf(run) && limitOf(run) - (r.wallMinutes ?? 0);

  console.log(`▶ ${run.id}  (resuming its session, part ${n + 1})`);
  run.resume = { sessionId: r.sessionId, message };
  const { exitCode, metrics, start } = await spawnAgent(run, dir, '', limit, n, since);
  run.resume = null;

  if (stopping || run.abort) {
    for (const ext of ['out', 'err']) fs.rmSync(path.join(dir, partFile(n, ext)), { force: true });
    if (run.abort === 'requeue' && !stopping) { run.abort = null; pending.unshift(run); console.log(`↺ ${run.id} requeued (resumes again)`); }
    else console.log(`■ ${run.id} stopped (this part discarded; it can be resumed again)`);
    return;
  }

  const end = Date.now(), part = { startedAt: new Date(start).toISOString(), finishedAt: new Date(end).toISOString(),
    wallMinutes: (end - start) / 60000, exitCode, cliVersion: cliVersions[run.agent.provider], ...(since ? { since } : {}) };
  // The earlier parts' figures are the old result's, so they add up even if their output is gone.
  const m = combineParts([r, metrics]);
  if (metrics.reply) fs.writeFileSync(path.join(dir, 'reply.md'), metrics.reply);
  delete m.reply;
  if (!metrics.reply) m.replyChars = r.replyChars; // reply.md is still the earlier one
  const status = exitCode === 0 && !metrics.isError ? 'ok' : 'failed', all = [...parts, part];
  const result = { id: r.id, ...run.fields, model: r.model, cliVersion: r.cliVersion, promptVersion: r.promptVersion,
    variantHashes: r.variantHashes, ...(r.goalSkipped ? { goalSkipped: true } : {}), status, exitCode,
    wallMinutes: all.reduce((s, p) => s + (p.wallMinutes ?? 0), 0), ...m, ...measureOutput(work),
    startedAt: r.startedAt, finishedAt: part.finishedAt, resumes: n, parts: all };
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(result, null, 2));
  finishedRuns.set(run.id, { r: result, dir: prev.dir });
  spent += metrics.costUsd ?? 0; done++;
  console.log(`${status === 'ok' ? '✔' : '✘'} ${run.id}  resumed: ${part.wallMinutes.toFixed(1)}m more, ${result.wallMinutes.toFixed(1)}m in all  ` +
    `${fmtUsd(metrics.costUsd)}  out:${metrics.outputTokens ?? '?'} tok`);
  writeReport();
}

// The cost-state Claude Code saved in a session's transcript as its last part ended (see minusSince), or null.
function claudeCostState(file) {
  let last = null;
  try { for (const l of fs.readFileSync(file, 'utf8').split('\n')) if (l.includes('"type":"cost-state"')) last = l; } catch {}
  if (!last) return null;
  const keep = ['inputTokens', 'outputTokens', 'thinkingTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens', 'costUSD'];
  try {
    const c = JSON.parse(last);
    return { totalCostUSD: c.totalCostUSD ?? 0, totalAPIDuration: c.totalAPIDuration ?? 0, modelUsage: Object.fromEntries(Object.entries(c.modelUsage ?? {})
      .map(([id, u]) => [id, Object.fromEntries(keep.filter((k) => u[k] != null).map((k) => [k, u[k]]))])) };
  } catch { return null; }
}

// A resumed run's figures, its parts' added up: tokens, cost, time and counts. The reply, outcome, session
// and plan usage are the last part's, the first token the first part's.
const SUMMED = ['costUsd', 'apiCostUsd', 'inputTokens', 'cachedTokens', 'cacheWriteTokens', 'uncachedInputTokens', 'outputTokens',
  'reasoningTokens', 'totalTokens', 'turns', 'rounds', 'subagents', 'apiCalls', 'toolCalls', 'toolErrors', 'compactions', 'apiMinutes'];
function combineParts(ms) {
  if (ms.length < 2) return ms[0];
  const m = { ...ms.at(-1), firstTokenMs: ms[0].firstTokenMs }, tools = {}, models = {};
  for (const k of SUMMED) { const vs = ms.map((x) => x[k]).filter((v) => v != null); m[k] = vs.length ? vs.reduce((a, b) => a + b, 0) : undefined; }
  for (const x of ms) {
    for (const [k, c] of Object.entries(x.tools ?? {})) add(tools, k, c);
    for (const [id, u] of Object.entries(x.models ?? {})) addModel(models, id, u);
  }
  const unpriced = [...new Set(ms.flatMap((x) => x.unpricedModels ?? []))];
  Object.assign(m, { tools: Object.keys(tools).length ? tools : undefined, models: Object.keys(models).length ? models : undefined,
    unpricedModels: unpriced.length ? unpriced : undefined });
  if (ms.some((x) => x.costSource === 'reported')) m.costSource = 'reported';
  return m;
}

// Everything measured from what a run's CLI printed: its parser, then what the CLI's session logs add
// (sessionLogs), the token totals and the list-price estimate. ctx: the run's work folder and start/end times.
const PARSERS = { claude: parseClaude, codex: parseCodex, grok: parseGrok, agy: parseAgy, muse: parseMuse };
function readMetrics(provider, text, agent, ctx) {
  const m = PARSERS[provider](text, agent, ctx);
  sessionLogs(provider, m, { ...ctx, model: agent.model });
  return Object.assign(tokenTotals(m), apiPrice(m, provider, ctx.start));
}

// --reparse: refresh token and cost fields of finished runs from their saved agent.out and the CLIs'
// session logs (and the TODO count from the saved game), leaving status, timing, other measurements and
// scores alone. A run whose session log was read before but is gone now keeps its figures.
function reparseAll() {
  const metricKeys = ['costUsd', 'costSource', 'apiCostUsd', 'unpricedModels', 'inputTokens', 'cachedTokens', 'cacheWriteTokens', 'uncachedInputTokens',
    'outputTokens', 'reasoningTokens', 'totalTokens', 'turns', 'rounds', 'subagents', 'helpers', 'apiCalls', 'toolCalls', 'tools', 'toolErrors',
    'compactions', 'firstTokenMs', 'plan', 'sessionLog', 'replyChars', 'apiMinutes', 'models'];
  if (!fs.existsSync(outDir)) return;
  let n = 0;
  for (const d of fs.readdirSync(outDir)) {
    const resFile = path.join(outDir, d, 'result.json'), outFile = path.join(outDir, d, 'agent.out');
    if (!fs.existsSync(resFile) || !fs.existsSync(outFile)) continue;
    const r = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    if (!PARSERS[r.provider]) continue;
    // A resumed run: each part from its own output, with what its session had used before (see resumeOne).
    const parts = r.parts ?? [{ startedAt: r.startedAt, finishedAt: r.finishedAt }];
    let ms; try { ms = parts.map((p, i) => readMetrics(r.provider, fs.readFileSync(path.join(outDir, d, partFile(i, 'out')), 'utf8'), { model: r.model },
      { cwd: path.join(outDir, d, 'work'), start: Date.parse(p.startedAt), end: Date.parse(p.finishedAt), since: p.since })); } catch (e) { console.log(`· ${d}: ${e.message}`); continue; }
    const m = combineParts(ms);
    if (r.sessionLog === 'read' && m.sessionLog !== 'read') { console.log(`· ${d}: session log ${m.sessionLog ?? 'not found'} now; kept its figures`); continue; }
    m.replyChars = String(ms.findLast((x) => x.reply)?.reply ?? '').trim().length;
    for (const k of metricKeys) if (m[k] !== undefined) r[k] = m[k]; else delete r[k];
    if (r.status !== 'ok' && m.error) r.error = m.error; // e.g. Claude Code's usage limit, which was "exit code 1" before
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

// Runs waiting to start, and the ones skipped as already done (turning Retry failed on mid-batch
// brings the failed ones back).
let pending = [];
const skippedRuns = [];
function skip(run) {
  const prev = prevRun(run);
  skipped++; skippedRuns.push(run);
  console.log(`· skip ${run.id} (already ${prev.r.status}${prev.dir !== run.id ? ` as ${prev.dir}` : ''})`);
}

// Starts runs while there's room: fewer than --concurrency running, the run's CLI under --per-cli,
// not paused, and the budget not spent. Each can change mid-batch (see control), so it's checked
// again whenever a run ends or a setting changes. Lowering a limit never ends a running agent by
// itself: no new one starts until there's room again. Once the budget is spent the ones already
// going finish, since what they've spent so far would be thrown away otherwise.
async function pool() {
  pending = interleave(queue);
  const busy = {}, jobs = new Set();
  for (;;) {
    while (!stopping) {
      if (!overBudget && spent >= args.budget) {
        overBudget = true;
        console.log(`■ Budget of $${args.budget} reached (spent ${fmtUsd(spent)}): no new runs start; ${live.size} still running will finish.`);
      }
      if (paused || overBudget || jobs.size >= Math.max(1, args.concurrency)) break;
      const i = pending.findIndex((r) => (busy[r.agent.provider] ?? 0) < args.perCli);
      if (i < 0) break; // every CLI left is at its limit
      const [run] = pending.splice(i, 1), p = run.agent.provider;
      if (isDone(run)) { skip(run); continue; }
      busy[p] = (busy[p] ?? 0) + 1;
      const job = runOne(run).catch((e) => { done++; console.log(`✘ ${run.id}  ${e.message}`); })
        .finally(() => { busy[p]--; jobs.delete(job); wake(); });
      jobs.add(job);
    }
    sayState();
    // Done once nothing runs and nothing more will start: the queue is empty, the batch was stopped
    // or the budget is spent. A paused batch waits to be resumed (or stopped).
    if (!jobs.size && (stopping || overBudget || !pending.length)) return;
    await new Promise((r) => { wakeUp = r; });
  }
}

// --control (the dashboard): changes to the running batch arrive as JSON lines on stdin, and its state
// goes back as "@state {…}" lines, which the dashboard reads and keeps out of the log.
//   { set: { concurrency, perCli, budget, timeout, rerunFailed, resumeFailed, paused }, timeoutRunning,
//     requeue: [run ids], drop: [run ids], skipCli: [providers] }
// null (or 0) for perCli, budget or timeout means none. A new time limit is for runs that start from
// now, and with timeoutRunning for the ones running too, counted from when each started.
const shown = { perCli: (v) => v === Infinity ? 'none' : v, budget: (v) => v === Infinity ? 'none' : `$${v}`, timeout: (v) => v ? `${v} min` : 'none' };
function control(msg) {
  const s = msg.set ?? {}, was = { ...args }, also = (n, what) => n ? ` (${n} ${what})` : '';
  // Runs being ended first, so the messages below count only the ones that keep going.
  for (const id of msg.requeue ?? []) endRun(id, 'requeue');
  for (const id of msg.drop ?? []) endRun(id, 'drop');
  const going = [...live.values()].filter((c) => !c.run.abort).length;
  if ('concurrency' in s) {
    args.concurrency = Math.max(1, Math.floor(+s.concurrency) || 1);
    console.log(`⚙ Parallel runs: ${was.concurrency} → ${args.concurrency}${also(going > args.concurrency && going,
      `still running; no new one starts until fewer than ${args.concurrency} are`)}`);
  }
  if ('perCli' in s) {
    args.perCli = +s.perCli >= 1 ? Math.floor(+s.perCli) : Infinity;
    console.log(`⚙ Max per CLI: ${shown.perCli(was.perCli)} → ${shown.perCli(args.perCli)}`);
  }
  if ('budget' in s) {
    args.budget = +s.budget > 0 ? +s.budget : Infinity;
    const again = overBudget && spent < args.budget;
    if (again) overBudget = false;
    console.log(`⚙ Budget: ${shown.budget(was.budget)} → ${shown.budget(args.budget)} (spent ${fmtUsd(spent)})${again ? ': new runs start again' : ''}`);
  }
  if ('timeout' in s) {
    args.timeout = +s.timeout > 0 ? +s.timeout : 0;
    const mine = [...live.values()].filter((c) => !c.run.abort && !c.run.agent.timeout); // a model's own limit stays
    if (msg.timeoutRunning) for (const c of mine) setLimit(c, limitOf(c.run));
    console.log(`⚙ Time limit: ${shown.timeout(was.timeout)} → ${shown.timeout(args.timeout)}, ${msg.timeoutRunning && mine.length
      ? `also for the ${mine.length} running` : 'for runs that start from now'}`);
  }
  for (const [k, name] of [['rerunFailed', 'Retry failed'], ['resumeFailed', 'Resume failed']]) {
    if (!(k in s) || !!s[k] === args[k]) continue;
    args[k] = !!s[k];
    const back = args[k] ? skippedRuns.filter((r) => !isDone(r)) : [];
    for (const r of back) { skippedRuns.splice(skippedRuns.indexOf(r), 1); skipped--; }
    pending.push(...back);
    console.log(`⚙ ${name}: ${args[k] ? `on${also(back.length, 'skipped earlier are queued again')}` : 'off'}`);
  }
  if ('paused' in s && !!s.paused !== paused) {
    paused = !!s.paused;
    console.log(paused ? `⚙ Paused: no new runs start${also(going, 'still running')}` : '⚙ Resumed: new runs start again');
  }
  for (const p of msg.skipCli ?? []) {
    const out = pending.filter((r) => r.agent.provider === p);
    if (!out.length) continue;
    pending = pending.filter((r) => r.agent.provider !== p);
    console.log(`⚙ ${CLIS[p] ?? p}: ${out.filter((r) => !isDone(r)).length} queued run(s) left out of this batch (they run next time)`);
  }
  sayState(true); // the dashboard waits for this to answer the change
  wake();
}

let lastState = '';
function sayState(force) {
  if (!args.control) return;
  const fin = (v) => v === Infinity ? null : v, left = {};
  for (const r of pending) if (!isDone(r)) left[r.agent.provider] = (left[r.agent.provider] ?? 0) + 1;
  const s = JSON.stringify({ concurrency: args.concurrency, perCli: fin(args.perCli), budget: fin(args.budget), timeout: args.timeout || null,
    rerunFailed: args.rerunFailed, resumeFailed: args.resumeFailed, paused, overBudget, spent, left });
  if (s !== lastState || force) { lastState = s; console.log('@state ' + s); }
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
for (const p of new Set(queue.filter((r) => !isDone(r)).map((r) => r.agent.provider))) {
  const v = spawnSync(binOf(p), ['--version'], { encoding: 'utf8', shell: isWin, timeout: 30000 });
  cliVersions[p] = `${v.stdout ?? ''}${v.stderr ?? ''}`.match(/\d+\.\d+[\w.-]*/)?.[0];
}
// The dashboard reads this line for the batch's progress (runs already done are skipped, not redone).
const already = queue.filter(isDone).length;
console.log(`${queue.length} runs${already ? ` (${already} already done)` : ''} → ${outDir}  (concurrency ${args.concurrency}${args.perCli < Infinity ? `, at most ${args.perCli} per CLI` : ''})`);
const resuming = queue.filter((r) => canResume(r)).length;
if (resuming) console.log(`Of those, ${resuming} failed partway and resume their session where it stopped (Resume failed).`);
if (queue.length > already) try { recordPromptVersion(); } catch (e) { console.log(`⚠ Prompt history not updated: ${e.message}`); }
if (args.control) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    const lines = (buf + d).split('\n'); buf = lines.pop();
    for (const l of lines) if (l.trim()) try { control(JSON.parse(l)); } catch (e) { console.log(`⚠ Setting change ignored: ${e.message}`); }
  });
}
await pool();
if (args.control) process.stdin.destroy(); // or it keeps the runner alive
clearInterval(stopPoll);
fs.rmSync(stopFile, { force: true });
writeReport();
console.log(`Done. ${done} ran, ${skipped} skipped. Spent ${fmtUsd(spent)} this session.`);

// ------------------------------------------------------- prompt history
// runs/prompt-history.json numbers the prompt's versions v1, v2 … for the dashboard. A version gets its
// number when a batch first runs it, so any number of edits between batches make one new version.
// at: when its text was last saved; ranAt: when it first ran. A version only found in runs from before
// the history existed is numbered too, by when it first ran, without its text.
function recordPromptVersion() {
  const file = path.join(outDir, 'prompt-history.json');
  let list = []; try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const known = new Set(list.map((e) => e.hash)), first = new Map();
  for (const d of fs.readdirSync(outDir)) {
    const r = readResult(d), h = r?.promptVersion;
    if (!h || known.has(h)) continue;
    const t = r.startedAt ?? '';
    if (!first.has(h) || t < first.get(h)) first.set(h, t);
  }
  if (!known.has(promptVersion) && !first.has(promptVersion)) first.set(promptVersion, new Date().toISOString());
  if (!first.size) return;
  let saved = null; try { if (cfg.templateFile) saved = fs.statSync(path.resolve(configDir, cfg.templateFile)).mtime.toISOString(); } catch {}
  let v = list.reduce((m, e) => Math.max(m, e.v), 0);
  for (const [hash, ranAt] of [...first].sort((a, b) => a[1].localeCompare(b[1])))
    list.push(hash === promptVersion ? { v: ++v, hash, at: saved, ranAt, text: template } : { v: ++v, hash, at: null, ranAt: ranAt || null, text: null });
  fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
}

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
  // A run from before a dimension was added shows as the variant it counts as, like in the dashboard.
  for (const r of rows) for (const d of dims) r[d] ??= olderVariant(d);
  const cols = ['id', 'agent', 'provider', 'model', 'effort', 'ultracode', ...dims, 'cliVersion', 'promptVersion', 'status', 'wallMinutes', 'apiMinutes', 'costUsd', 'costSource', 'apiCostUsd',
    'inputTokens', 'uncachedInputTokens', 'cachedTokens', 'cacheWriteTokens', 'outputTokens', 'reasoningTokens', 'totalTokens', 'turns', 'rounds', 'subagents',
    'apiCalls', 'toolCalls', 'toolErrors', 'compactions',
    'delivered', 'kb', 'loc', 'files', 'todos', 'replyChars', 'score', 'notes', 'error', 'entry', 'startedAt', 'finishedAt'];
  const cell = (v) => v == null ? '' : typeof v === 'number' ? +v.toFixed(4)
    : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
  fs.writeFileSync(path.join(outDir, 'results.csv'),
    [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n');

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const href = (p) => esc(String(p).split('/').map(encodeURIComponent).join('/')); // a # ? or % in a game's title would break the link
  const show = ['agent', 'effort', ...dims, 'status', 'delivered', 'wallMinutes', 'costUsd', 'apiCostUsd', 'outputTokens', 'kb', 'score'];
  const html = `<!doctype html><meta charset="utf-8"><title>Matrix runs</title>
<style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}table{border-collapse:collapse;width:100%}
th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;white-space:nowrap}th{cursor:pointer;background:#f4f4f4;position:sticky;top:0}
.failed{color:#b00}@media(prefers-color-scheme:dark){body{background:#111;color:#eee}th{background:#222}td,th{border-color:#333}a{color:#8bf}}</style>
<h1>Matrix runs (${rows.length})</h1><p>Static copy. For scoring and comparisons, run <code>node dashboard.mjs</code>.</p>
<table><thead><tr><th>play</th>${show.map((c) => `<th>${c}</th>`).join('')}<th>files</th></tr></thead><tbody>
${rows.map((r) => `<tr class="${esc(r.status)}"><td>${r.entry ? `<a href="${href(r.entry)}">▶</a>` : '—'}</td>${show.map((c) =>
  `<td>${esc(typeof r[c] === 'number' ? +r[c].toFixed(/Usd$/.test(c) ? 2 : 1) : r[c])}</td>`).join('')}<td><a href="${href(r.id)}/prompt.md">prompt</a> · <a href="${href(r.id)}/reply.md">reply</a></td></tr>`).join('\n')}
</tbody></table><script>
document.querySelectorAll('th').forEach((th,i)=>th.onclick=()=>{const tb=th.closest('table').tBodies[0],rs=[...tb.rows],d=th.dataset.d=th.dataset.d==='a'?'d':'a';
rs.sort((x,y)=>{const a=x.cells[i].innerText,b=y.cells[i].innerText,n=parseFloat(a)-parseFloat(b);return (isNaN(n)?a.localeCompare(b):n)*(d==='a'?1:-1)});rs.forEach(r=>tb.append(r))})
</script>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}
