#!/usr/bin/env node
// run-matrix.mjs — run every combination in matrix.config.json headless through
// Claude Code (`claude -p`), Grok CLI (`grok -p`) and/or Codex (`codex exec`),
// and record time, tokens and cost for each run. No dependencies; Node 18+.
// Usually driven by the dashboard (node dashboard.mjs), but works on its own.
//
// Cost is only ever what the CLI itself reports (Claude Code, Grok). Codex
// doesn't report cost, so its cost stays blank; its tokens are a rough guide only.
//
//   node run-matrix.mjs --dry-run
//   node run-matrix.mjs -j 3 --pick opus:xhigh,opus:max --only testing=none,open
//   node run-matrix.mjs --budget 40 --timeout 180
//   node run-matrix.mjs --report
//
// Flags: --config <file> --out <dir> --concurrency|-j <n>
//        --pick agent:effort,...      exact agent+effort pairs (repeatable)
//        --only key=a,b               keys: agent, provider, effort or a dimension (repeatable)
//        --limit <n> --repeat <n> --timeout <min, 0 = none> --budget <usd>
//        --dry-run [--json] --report --rerun-failed

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ------------------------------------------------------------------ args
const args = { config: fs.existsSync('matrix.config.json') ? 'matrix.config.json' : 'matrix.config.mjs',
  out: 'runs', concurrency: 2, only: [], pick: [], limit: Infinity, repeat: 1, timeout: 0,
  budget: Infinity, dryRun: false, json: false, report: false, rerunFailed: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i], next = () => process.argv[++i];
  if (a === '--config') args.config = next();
  else if (a === '--out') args.out = next();
  else if (a === '--concurrency' || a === '-j') args.concurrency = +next();
  else if (a === '--only') args.only.push(next());
  else if (a === '--pick') args.pick.push(...next().split(',').filter(Boolean));
  else if (a === '--limit') args.limit = +next();
  else if (a === '--repeat') args.repeat = +next();
  else if (a === '--timeout') args.timeout = +next();
  else if (a === '--budget') args.budget = +next();
  else if (a === '--dry-run') args.dryRun = true;
  else if (a === '--json') args.json = true;
  else if (a === '--report') args.report = true;
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
// condition instead of filling a placeholder. Claude Code only.
const GOAL_DIM = 'goal';
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
      if (goalText(combo) && agent.provider !== 'claude') continue; // /goal is Claude Code only
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
const queue = runs.slice(0, args.limit);

// ------------------------------------------------------------- prompt
const template = cfg.templateFile ? fs.readFileSync(path.resolve(configDir, cfg.templateFile), 'utf8') : cfg.template;
const LABS = { claude: 'Anthropic', codex: 'OpenAI', grok: 'xAI' };
const CLIS = { claude: 'Claude Code CLI', codex: 'Codex CLI', grok: 'Grok CLI' };
const OS = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }[process.platform] ?? process.platform;
const pad = (n) => String(n).padStart(2, '0');

// Placeholders the runner fills per run (in addition to the dimensions).
function runVars(run, d = new Date()) {
  return { model: run.agent.model, effort: `${run.effort ?? 'default'}${run.ultracode ? '-ultracode' : ''}`, lab: LABS[run.agent.provider] ?? 'unknown',
    environment: `${CLIS[run.agent.provider] ?? run.agent.provider} (headless); ${OS}; browser unknown`,
    stamp: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

// With a goal, the full prompt goes to TASK.md and the message sent is the
// /goal command (a command must start the message, and everything after it is
// the condition, capped at 4,000 characters).
function goalMessage(run) {
  const g = goalText(run.combo);
  if (!g) return null;
  const msg = `/goal Read TASK.md in the current folder and complete the task it describes. Done when: ${g}`;
  if (msg.length > 4000) throw new Error(`Goal condition is ${msg.length} characters; /goal allows 4,000`);
  return msg;
}

function buildPrompt(run, when) {
  let p = template;
  for (const d of dimNames) if (d !== GOAL_DIM) p = p.replaceAll(`{{${d}}}`, variantText(run.combo[d]).trim());
  for (const [k, v] of Object.entries(runVars(run, when))) p = p.replaceAll(`{{${k}}}`, v);
  const left = [...new Set(p.match(/\{\{\w+\}\}/g) ?? [])];
  if (left.length) throw new Error(`Unfilled placeholders in prompt: ${left.join(' ')}`);
  return p.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ------------------------------------------------------------- dry run
const isDone = (id) => {
  try { const r = JSON.parse(fs.readFileSync(path.join(outDir, id, 'result.json'), 'utf8'));
    return r.status === 'ok' || !args.rerunFailed; } catch { return false; }
};

if (args.dryRun) {
  const byAgent = {};
  for (const r of queue) byAgent[r.fields.agent] = (byAgent[r.fields.agent] ?? 0) + 1;
  let sample = '', error = null;
  try { if (queue[0]) { sample = buildPrompt(queue[0]); const g = goalMessage(queue[0]);
    if (g) sample = `Message sent:\n${g}\n\n--- TASK.md ---\n${sample}`; } } catch (e) { error = e.message; }
  if (args.json) {
    console.log(JSON.stringify({ count: queue.length, byAgent, alreadyDone: queue.filter((r) => isDone(r.id)).length,
      ids: queue.map((r) => r.id), sampleId: queue[0]?.id ?? null, sample, error }));
  } else {
    console.log(`${queue.length} runs  (${Object.entries(byAgent).map(([k, v]) => `${k}: ${v}`).join(', ')})\n`);
    for (const r of queue) console.log('  ' + r.id);
    if (error) console.log(`\nPrompt error: ${error}`);
    else if (queue[0]) console.log(`\n--- sample prompt (${queue[0].id}) ---\n${sample}`);
  }
  process.exit(0);
}

// -------------------------------------------------------------- providers
const providers = {
  claude(agent, effort, prompt, run) {
    const argv = ['-p'];
    const goal = goalMessage(run);
    if (goal) argv.push(goal); // short, so pass it as the argument like the docs show
    argv.push('--output-format', 'json', '--model', agent.model);
    if (effort) argv.push('--effort', effort);
    // Always set Ultracode explicitly so a global setting can't leak into the comparison.
    argv.push('--settings', JSON.stringify({ ultracode: !!run.ultracode }));
    argv.push(...(cfg.extraArgs?.claude ?? []));
    return { bin: cfg.bins?.claude || 'claude', argv, parse: parseClaude, promptInArgs: !!goal };
  },
  codex(agent, effort) {
    const argv = ['exec', '--json', '-m', agent.model];
    if (effort) argv.push('-c', `model_reasoning_effort=${effort}`);
    argv.push(...(cfg.extraArgs?.codex ?? []), '-'); // '-' = read prompt from stdin
    return { bin: cfg.bins?.codex || 'codex', argv, parse: parseCodex };
  },
  grok(agent, effort, prompt) {
    // Grok's headless docs only show the prompt as an argument, so pass it that way.
    const argv = ['-p', prompt, '--output-format', 'json', '--model', agent.model];
    if (effort) argv.push('--effort', effort);
    argv.push(...(cfg.extraArgs?.grok ?? []));
    return { bin: cfg.bins?.grok || 'grok', argv, parse: parseGrok, promptInArgs: true };
  },
};

function parseClaude(text) {
  const line = text.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (!line) return { isError: true };
  const j = JSON.parse(line);
  let input = 0, output = 0, cacheRead = 0, cacheWrite = 0;
  const mu = j.modelUsage && Object.values(j.modelUsage);
  if (mu?.length) { // includes subagents / helper models
    for (const m of mu) { input += m.inputTokens ?? 0; output += m.outputTokens ?? 0;
      cacheRead += m.cacheReadInputTokens ?? 0; cacheWrite += m.cacheCreationInputTokens ?? 0; }
  } else {
    const u = j.usage ?? {};
    input = u.input_tokens ?? 0; output = u.output_tokens ?? 0;
    cacheRead = u.cache_read_input_tokens ?? 0; cacheWrite = u.cache_creation_input_tokens ?? 0;
  }
  return { reply: j.result, costUsd: j.total_cost_usd, costSource: j.total_cost_usd != null ? 'reported' : 'none',
    inputTokens: input + cacheRead + cacheWrite, cachedTokens: cacheRead,
    outputTokens: output, turns: j.num_turns, apiMinutes: j.duration_api_ms ? j.duration_api_ms / 60000 : null,
    isError: !!j.is_error, sessionId: j.session_id };
}

function parseCodex(text) {
  let input = 0, cached = 0, output = 0, reasoning = 0, turns = 0, isError = false, sessionId, reply;
  for (const l of text.split('\n')) {
    let e; try { e = JSON.parse(l); } catch { continue; }
    if (e.type === 'thread.started') sessionId = e.thread_id;
    if (e.type === 'item.completed' && e.item?.type === 'agent_message') reply = e.item.text;
    if (e.type === 'turn.completed' && e.usage) {
      turns++; input += e.usage.input_tokens ?? 0; cached += e.usage.cached_input_tokens ?? 0;
      output += e.usage.output_tokens ?? 0; reasoning += e.usage.reasoning_output_tokens ?? 0;
    }
    if (e.type === 'turn.failed' || e.type === 'error') isError = true;
  }
  return { reply, costUsd: null, costSource: 'none', inputTokens: input, cachedTokens: cached,
    outputTokens: output, reasoningTokens: reasoning, turns, isError, sessionId };
}

// Grok's JSON schema isn't documented yet, so look for the usual field names
// anywhere in the final object. Check one real agent.out and adjust if needed.
function parseGrok(text) {
  const line = text.trim().split('\n').filter((l) => l.trim().startsWith('{')).pop();
  if (!line) return { isError: true };
  const j = JSON.parse(line);
  const find = (o, keys) => {
    if (!o || typeof o !== 'object') return undefined;
    for (const k of keys) if (['number', 'string', 'boolean'].includes(typeof o[k])) return o[k];
    for (const v of Object.values(o)) { const r = find(v, keys); if (r !== undefined) return r; }
  };
  const num = (keys) => { const v = find(j, keys); return v == null ? null : +v; };
  const costUsd = num(['total_cost_usd', 'cost_usd', 'costUSD', 'total_cost', 'cost']);
  return { reply: typeof j.result === 'string' ? j.result : undefined, costUsd,
    costSource: costUsd != null ? 'reported' : 'none',
    inputTokens: num(['input_tokens', 'inputTokens', 'prompt_tokens']),
    cachedTokens: num(['cache_read_input_tokens', 'cached_input_tokens', 'cachedTokens', 'cached_tokens']),
    outputTokens: num(['output_tokens', 'outputTokens', 'completion_tokens']),
    reasoningTokens: num(['reasoning_tokens', 'reasoning_output_tokens', 'reasoningTokens']),
    turns: num(['num_turns', 'turns']), isError: !!find(j, ['is_error', 'isError']),
    sessionId: find(j, ['session_id', 'sessionId']) };
}

// ------------------------------------------------------------------ run
const children = new Set();
let spent = 0, stopping = false, done = 0, skipped = 0;

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
// The dashboard asks us to stop by creating runs/.stop (works on every OS).
const stopPoll = setInterval(() => { if (fs.existsSync(stopFile)) stopAll('stop requested'); }, 1500);

async function runOne(run) {
  const dir = path.join(outDir, run.id), work = path.join(dir, 'work'), resFile = path.join(dir, 'result.json');
  if (fs.existsSync(resFile)) {
    const prev = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    if (prev.status === 'ok' || !args.rerunFailed) { skipped++; console.log(`· skip ${run.id} (already ${prev.status})`); return; }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const prompt = buildPrompt(run);
  fs.writeFileSync(path.join(dir, 'prompt.md'), prompt);
  const goal = goalMessage(run);
  if (goal) { fs.writeFileSync(path.join(work, 'TASK.md'), prompt); fs.writeFileSync(path.join(dir, 'goal.md'), goal + '\n'); }

  for (const d of dimNames) {
    const setup = run.combo[d].setup;
    if (setup) spawnSync(setup, { cwd: work, shell: true, stdio: 'ignore' });
  }

  const { bin, argv, parse, promptInArgs } = providers[run.agent.provider](run.agent, run.effort, prompt, run);
  const outPath = path.join(dir, 'agent.out'), errPath = path.join(dir, 'agent.err');
  const out = fs.createWriteStream(outPath), err = fs.createWriteStream(errPath);
  const start = Date.now();
  console.log(`▶ ${run.id}`);

  const exitCode = await new Promise((resolve) => {
    // On Windows, npm .cmd shims need a shell; quote args so prompts survive it.
    const a = isWin ? argv.map((x) => `"${String(x).replace(/"/g, '\\"')}"`) : argv;
    const child = spawn(bin, a, { cwd: work, shell: isWin, detached: !isWin, env: process.env });
    children.add(child);
    child.stdout.pipe(out); child.stderr.pipe(err);
    child.stdin.on('error', () => {});
    child.stdin.end(promptInArgs ? '' : prompt);
    const limit = +(run.agent.timeout || args.timeout || 0); // minutes; 0 = no limit
    const timer = limit > 0 ? setTimeout(() => { err.write('\n[matrix] timed out\n'); killTree(child); }, limit * 60000) : null;
    child.on('error', (e) => { err.write(`\n[matrix] ${e.message}\n`); });
    child.on('close', (code) => { if (timer) clearTimeout(timer); children.delete(child); resolve(code); });
  });
  await Promise.all([new Promise((r) => out.end(r)), new Promise((r) => err.end(r))]);

  if (stopping) { // interrupted: throw it away so it runs fresh next time
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`■ ${run.id} stopped (discarded)`);
    return;
  }

  let metrics = {};
  try { metrics = parse(fs.readFileSync(outPath, 'utf8'), run.agent); } catch (e) { metrics = { isError: true, parseError: e.message }; }
  if (metrics.reply) fs.writeFileSync(path.join(dir, 'reply.md'), metrics.reply);
  delete metrics.reply;
  const status = exitCode === 0 && !metrics.isError ? 'ok' : 'failed';
  const result = { id: run.id, ...run.fields, model: run.agent.model, status, exitCode,
    wallMinutes: (Date.now() - start) / 60000, ...metrics, ...measureOutput(work),
    startedAt: new Date(start).toISOString(), finishedAt: new Date().toISOString() };
  fs.writeFileSync(resFile, JSON.stringify(result, null, 2));
  spent += metrics.costUsd ?? 0; done++;
  console.log(`${status === 'ok' ? '✔' : '✘'} ${run.id}  ${result.wallMinutes.toFixed(1)}m  ` +
    `${fmtUsd(metrics.costUsd)}  out:${metrics.outputTokens ?? '?'} tok`);
  writeReport();
}

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
  let kb = null, loc = null;
  if (file) { const t = fs.readFileSync(file, 'utf8'); kb = Math.round(t.length / 1024); loc = t.split('\n').length; }
  return { delivered: !!entry, kb, loc, files: devFiles,
    entry: file ? path.relative(outDir, file).split(path.sep).join('/') : null };
}

async function pool() {
  let i = 0;
  const worker = async () => {
    while (i < queue.length && !stopping) {
      if (spent >= args.budget) { stopAll(`budget of $${args.budget} reached`); break; }
      await runOne(queue[i++]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, args.concurrency) }, worker));
}

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(stopFile, { force: true });
const noCost = [...new Set(queue.filter((r) => r.agent.provider === 'codex').map((r) => r.agent.id))];
if (noCost.length && args.budget !== Infinity)
  console.log(`Note: ${noCost.join(', ')} don't report cost, so the budget only counts Claude/Grok spend.`);
console.log(`${queue.length} runs → ${outDir}  (concurrency ${args.concurrency})`);
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
  const rows = fs.readdirSync(outDir)
    .map((d) => path.join(outDir, d, 'result.json')).filter((f) => fs.existsSync(f))
    .map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const dims = cfg.dimensions ? Object.keys(cfg.dimensions) : [];
  const scores = readScores();
  for (const r of rows) Object.assign(r, scores[r.id] ?? {});
  const cols = ['id', 'agent', 'model', 'effort', 'ultracode', ...dims, 'status', 'wallMinutes', 'costUsd', 'costSource', 'inputTokens',
    'cachedTokens', 'outputTokens', 'reasoningTokens', 'turns', 'delivered', 'kb', 'loc', 'files', 'score', 'notes', 'entry'];
  const cell = (v) => v == null ? '' : typeof v === 'number' ? +v.toFixed(4)
    : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
  fs.writeFileSync(path.join(outDir, 'results.csv'),
    [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n');

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const show = ['agent', 'effort', ...dims, 'status', 'delivered', 'wallMinutes', 'costUsd', 'outputTokens', 'kb', 'score'];
  const html = `<!doctype html><meta charset="utf-8"><title>Matrix runs</title>
<style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}table{border-collapse:collapse;width:100%}
th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;white-space:nowrap}th{cursor:pointer;background:#f4f4f4;position:sticky;top:0}
.failed{color:#b00}@media(prefers-color-scheme:dark){body{background:#111;color:#eee}th{background:#222}td,th{border-color:#333}a{color:#8bf}}</style>
<h1>Matrix runs (${rows.length})</h1><p>Static copy. For scoring and comparisons, run <code>node dashboard.mjs</code>.</p>
<table><thead><tr><th>play</th>${show.map((c) => `<th>${c}</th>`).join('')}<th>files</th></tr></thead><tbody>
${rows.map((r) => `<tr class="${r.status}"><td>${r.entry ? `<a href="${esc(r.entry)}">▶</a>` : '—'}</td>${show.map((c) =>
  `<td>${esc(typeof r[c] === 'number' ? +r[c].toFixed(c === 'costUsd' ? 2 : 1) : r[c])}</td>`).join('')}<td><a href="${esc(r.id)}/prompt.md">prompt</a> · <a href="${esc(r.id)}/reply.md">reply</a></td></tr>`).join('\n')}
</tbody></table><script>
document.querySelectorAll('th').forEach((th,i)=>th.onclick=()=>{const tb=th.closest('table').tBodies[0],rs=[...tb.rows],d=th.dataset.d=th.dataset.d==='a'?'d':'a';
rs.sort((x,y)=>{const a=x.cells[i].innerText,b=y.cells[i].innerText,n=parseFloat(a)-parseFloat(b);return (isNaN(n)?a.localeCompare(b):n)*(d==='a'?1:-1)});rs.forEach(r=>tb.append(r))})
</script>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}
