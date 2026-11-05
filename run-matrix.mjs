#!/usr/bin/env node
// run-matrix.mjs — run every combination in matrix.config.json headless through
// Claude Code (`claude -p`), Codex (`codex exec`), Grok (`grok --prompt-file`), Antigravity
// (`agy -p`) and/or Muse Code (`muse exec`), and record time, tokens and cost for
// each run. No dependencies; Node 18+.
// Usually driven by the dashboard (node dashboard.mjs), but works on its own.
//
// costUsd is only ever what the CLI itself reports: Claude Code (at API list prices) and Grok (at its own,
// lower rate). The one exception is a Claude Code session cut off before it could report (see cutPart): that
// part's tokens at the same list prices, costSource estimated. Every run also gets apiCostUsd, its tokens at the
// labs' public API list prices (PRICES), to compare runs across CLIs. Codex and Grok print less than they use
// (subagents, /goal helpers): their session logs fill that in (sessionLogs).
//
// A run cut off mid-way (the dashboard quit or restarted, the computer went down) carries on with its Claude Code
// session the next time a batch has it; other CLIs' start over (see UNFINISHED).
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
//                                     logs (after parser or price changes); games already holding their record get the new figures
//        --stamp                      write each finished run's record into its game file (stampGame, run-record.mjs); new runs get it as they end
//        --check-games                load each finished run's game headless that hasn't been checked yet (checkGame);
//                                     new runs get it as they end when the config has gameCheck
//        --fold-ended                 cut-off runs whose session ended on its own after its runner was gone get their
//                                     result from the session now, without a batch that has them (see foldEnded)
//        --rename-variant dim:old[@hash]=new   file the runs that used an earlier text of a variant under a short name of
//                                     their own (repeatable; with --dry-run, only says which; see renameVariants)
//        --control                    take setting changes mid-batch on stdin (the dashboard; see control())
//        --stage <stage>=agent:effort,...   run in stages instead (repeatable; see stageRuns): each stage in the config's
//                                     "stages" continues from the finished runs of the stage before
//        --stages                     run in stages with the models each stage has in the config ("models"); a
//                                     --stage given too replaces that stage's
//        --broker                     one of several batches at once (the dashboard's queue): start a run only when the
//                                     dashboard says so, which keeps the limits for all of them (see brokered); implies --control
//        --skip-keys <file>           leave out these runs (a JSON list of run keys): a batch running beside this one
//                                     has them, and a run here that continues from one waits for it there

import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EXIT_FILE, STAMP_RE, makeRecord, parseInterview, questionsOf, readRecord, renameInRecord, stampHtml, stepOf, unstamped, upgrade } from './run-record.mjs';

// ------------------------------------------------------------------ args
const args = { config: fs.existsSync('matrix.config.json') ? 'matrix.config.json' : 'matrix.config.mjs',
  out: 'runs', concurrency: 2, perCli: Infinity, only: [], pick: [], limit: Infinity, repeat: 1, timeout: 0,
  budget: Infinity, dryRun: false, json: false, report: false, reparse: false, stamp: false, foldEnded: false, rename: [], rerunFailed: false, resumeFailed: false, smoke: null, smokeGoal: false, control: false, stage: [], stages: false,
  broker: false, skipKeys: null };
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
  else if (a === '--stage') args.stage.push(next());
  else if (a === '--stages') args.stages = true;
  else if (a === '--limit') args.limit = +next();
  else if (a === '--repeat') args.repeat = +next();
  else if (a === '--timeout') args.timeout = +next();
  else if (a === '--budget') args.budget = +next();
  else if (a === '--dry-run') args.dryRun = true;
  else if (a === '--json') args.json = true;
  else if (a === '--report') args.report = true;
  else if (a === '--reparse') args.reparse = true;
  else if (a === '--stamp') args.stamp = true;
  else if (a === '--check-games') args.checkGames = true;
  else if (a === '--fold-ended') args.foldEnded = true;
  else if (a === '--rename-variant') args.rename.push(next());
  else if (a === '--rerun-failed') args.rerunFailed = true;
  else if (a === '--resume-failed') args.resumeFailed = true;
  else if (a === '--control') args.control = true;
  else if (a === '--broker') { args.broker = true; args.control = true; }
  else if (a === '--skip-keys') args.skipKeys = next();
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

// Runs in stages (see stageRuns) are known by their chain: the stage, model and effort of each step from the first
// stage to theirs (plan:claude-opus-5-5-max>build:claude-opus-5-5-xhigh), plus the brief (one variant per dimension).
const chainKey = (chain) => chain.map((c) => `${c.stage}:${c.agent}-${c.effort}`).join('>');

// A run's folder name (its id) starts with its model-effort (and stage). With "folderName" in the config (Setup · Basic
// → Folder names): then the variants of the dimensions in folderName.fields, the date and time the run started
// (date: true) and, once it has made its game, the game's title (title: true; see withTitle). Without it, the older
// scheme: every dimension's variant except those in omitFromName. Runs are matched by the fields in their result.json
// (runKey), never by folder name, so changing this only names runs made from then on. Variants left out become a
// short code (x + 6 hex) where runs could otherwise share a folder: always in the older scheme; with folderName when a
// left-out dimension has more than one variant, and for a stage run after the first, which also encodes the steps
// before it (the same builder on two plans gets two folders). The runs of one batch start at least startGap apart
// (see pool), so their start times differ anyway; the code covers a startGap of 0 and two batches at once.
const FN = cfg.folderName ?? null, omitted = new Set(cfg.omitFromName ?? []);
const inName = (d) => FN ? (FN.fields ?? []).includes(d) : !omitted.has(d);
const pad = (n) => String(n).padStart(2, '0');
// A run's start, to the second: YYYYMMDD-HHMMSS in this computer's time zone (its folder name and {{stamp}}).
const stampOf = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
function runName(head, combo, rep, when, before = []) {
  const left = dimNames.filter((d) => !inName(d));
  const seed = [...left.map((d) => `${d}=${combo[d].id}`), ...(before.length ? [`from=${chainKey(before)}`] : [])];
  const coded = FN ? before.length > 0 || left.some((d) => cfg.dimensions[d].length > 1) : seed.length > 0;
  const code = coded ? 'x' + crypto.createHash('sha1').update(seed.join('|')).digest('hex').slice(0, 6) : null;
  return [head, ...dimNames.filter(inName).map((d) => combo[d].id), FN?.date ? stampOf(when ?? new Date()) : null, code, rep].filter(Boolean).join('__');
}
// A run's name when it starts (runOne): with the date in it, the queue's names are only what they'd be now.
const nameOf = (run, when) => runName(run.head, run.combo, run.rep, when, run.chain ? run.chain.slice(0, -1) : []);

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
        const rep = args.repeat > 1 ? `r${r}` : null, head = `${agent.id}-${effort}`;
        // key: every dimension, what finished runs are matched by (runKey); id: the folder name.
        const key = [head, ...dimNames.map((d) => combo[d].id), rep].filter(Boolean).join('__');
        runs.push({ id: runName(head, combo, rep), head, rep, key, agent, effort: pe.base, ultracode: pe.ultracode, combo,
          fields: { ...fields, ...(rep ? { rep } : {}) } });
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

// {{machine}}: what this computer has, for the agents: environments/<computer>.md beside the config, which node
// check-environment.mjs writes (and keeps up to date between its markers) and the rest of which is written by hand.
// Filled without its title and its notes to whoever edits it; read once. Named as check-environment.mjs names it.
const machineFile = () => path.join(configDir, 'environments', `${os.hostname().replace(/[^\w.-]/g, '-')}.md`);
let machineText;
function machine() {
  if (machineText === undefined) {
    let t = null; try { t = fs.readFileSync(machineFile(), 'utf8'); } catch {}
    machineText = t ? t.replace(/<!--[\s\S]*?-->\n?/g, '').replace(/^# .*\n+/, '').trim() : null;
  }
  return machineText || undefined;
}

// Placeholders the runner fills per run (in addition to the dimensions).
function runVars(run, d = new Date()) {
  return { model: run.agent.model, effort: `${run.effort ?? 'default'}${run.ultracode ? '-ultracode' : ''}`, lab: labOf(run.agent),
    environment: `${CLIS[run.agent.provider] ?? run.agent.provider} (headless); ${OS}; browser unknown`, machine: machine(),
    stamp: stampOf(d),
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` };
}

// With a goal, the full prompt goes to TASK.md and the message sent is the
// /goal command (a command must start the message, and everything after it is
// the condition, capped at 4,000 characters).
function goalMessage(run) {
  if (run.stage) { // a stage's goal: its text is STAGE.md, which says what TASK.md (the brief) and the other files are for
    const g = stageTexts(run).goal;
    if (!g || !GOAL_CLIS.has(run.agent.provider)) return null;
    const msg = `/goal Read STAGE.md in the current folder and do what it says. Done when: ${g}`;
    if (msg.length > 4000) throw new Error(`Stage ${run.stage.id}'s goal is ${msg.length} characters with its preamble; /goal allows 4,000`);
    return msg;
  }
  const g = goalText(run.combo);
  if (!g || !GOAL_CLIS.has(run.agent.provider)) return null;
  const msg = `/goal Read TASK.md in the current folder and complete the task it describes. Done when: ${g}`;
  if (msg.length > 4000) throw new Error(`Goal condition is ${msg.length} characters; /goal allows 4,000`);
  return msg;
}

// A function, not a string, as the replacement: in a string, $& $' $` and $$ are patterns, so a
// variant text like "$$" or "$'" would be sent changed. A variant's text can hold placeholders too (a
// section saying "a spiritual successor to {{source}}", a file name with {{model}}), so it fills again
// until nothing changes; a few rounds cover any nesting, and a text that names itself stays unfilled.
function buildPrompt(run, when) {
  return fillText(template, run, when, 'prompt').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
// Fills a text's placeholders: the dimensions, the run's own (runVars) and, for a stage's text, the step before it.
function fillText(text, run, when, what, extra = {}) {
  const fill = { ...Object.fromEntries(dimNames.filter((d) => d !== GOAL_DIM).map((d) => [d, variantText(run.combo[d]).trim()])), ...runVars(run, when), ...extra };
  let p = text;
  for (let i = 0; i < 5; i++) { const next = p.replace(/\{\{(\w+)\}\}/g, (m, k) => fill[k] ?? m); if (next === p) break; p = next; }
  const left = [...new Set(p.match(/\{\{\w+\}\}/g) ?? [])];
  if (left.includes('{{machine}}') && !machine())
    throw new Error(`${what} uses {{machine}}, but this computer has no ${path.relative(configDir, machineFile())}: run node check-environment.mjs`);
  if (left.length) throw new Error(`Unfilled placeholders in ${what}: ${left.join(' ')}`);
  return p;
}
// A stage's text and goal, filled for this run. Besides the dimensions and the run's own placeholders they can use
// the step this run continues from: {{parentModel}} {{parentEffort}} {{parentStage}} {{parentAgent}}, and {{chain}},
// every step so far (empty in the first stage). Worked out once per attempt (runOne resets them).
const modelOf = (agentId) => cfg.agents.find((a) => a.id === agentId)?.model ?? agentId;
function stageTexts(run) {
  if (run.texts) return run.texts;
  const p = run.parentInfo ?? {}, extra = { parentModel: p.model ?? '', parentEffort: p.effort ?? '', parentStage: p.stage ?? '', parentAgent: p.agent ?? '',
    chain: run.chain.map((c) => `${c.stage}: ${modelOf(c.agent)} ${c.effort}`).join(' → ') };
  const text = fillText(run.stage.text ?? '', run, run.when, `stage ${run.stage.id}'s text`, extra).trim();
  if (!text) throw new Error(`Stage ${run.stage.id} has no text`);
  return run.texts = { text: text + '\n', goal: fillText(run.stage.goal ?? '', run, run.when, `stage ${run.stage.id}'s goal`, extra).trim() };
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
const briefKey = (r) => dimNames.map((d) => r[d] ?? olderVariant(d)).join('__');
function runKey(r) {
  if (r.chain) return `${chainKey(r.chain)}__${briefKey(r)}`;
  // Model-effort and repeat from the saved fields; runs from before they were saved, from the folder name.
  const parts = r.id.split('__'), last = parts.at(-1), head = r.agent && r.effort ? `${r.agent}-${r.effort}` : parts[0];
  const rep = r.rep ?? (parts.length > 1 && /^r\d+$/.test(last) && !dimNames.some((d) => r[d] === last) ? last : null);
  return [head, ...dimNames.map((d) => r[d] ?? olderVariant(d)), rep].filter(Boolean).join('__');
}
// Finished runs by key, read once. Two with the same key (a dimension was removed) count as one:
// an OK one if there is one, else the latest. An unreadable result.json counts as not done.
let finishedRuns = null;
function finished() {
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
  return finishedRuns;
}
function prevRun(run) { return finished().get(run.key) ?? null; }
// --resume-failed: a failed run that got partway continues its CLI session where it stopped instead of
// starting over (resumeOne). Claude Code only (`claude -p --resume`). It carries on in the folder it ran in
// (whatever that folder is named now) and needs the same model,
// output already made (one that failed on its first request, like on a usage limit, just starts over),
// its session still on disk and, with a time limit, time left of it.
const RESUMABLE = new Set(['claude']);
function canResume(run, p = prevRun(run)) {
  const r = p?.r;
  if (!args.resumeFailed || !r || r.status === 'ok' || !RESUMABLE.has(run.agent.provider)) return false;
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

// A run's folder holds unfinished.json from when its agent starts until its result is in: the run's record so far
// (`base`: what it was made with and, for a run carrying on, its earlier parts' figures), the part going now (`part`)
// and the pids of the runner and the agent. A run cut off mid-way (the dashboard quit or restarted, the runner was
// ended, the computer went down) leaves it behind, and the next batch that has the run carries on with its session
// where it stopped (carryOn), whether or not Resume failed is on. One that can't (another CLI, or a session that hadn't
// got going) starts over. Not a result: the dashboard's results, the report and the stats never count it.
const UNFINISHED = 'unfinished.json';
const readUnfinished = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, UNFINISHED), 'utf8')); } catch { return null; } };
const writeUnfinished = (dir, u) => fs.writeFileSync(path.join(dir, UNFINISHED), JSON.stringify(u, null, 2));
// Whether a process is still going: a pid that's gone, or now this runner's, isn't (on Linux the runner's also has to
// still be a runner, in case its pid was given to something else since).
function alive(pid, runner = false) {
  if (!pid || pid === process.pid) return false;
  try { process.kill(pid, 0); } catch (e) { if (e.code !== 'EPERM') return false; }
  if (runner && process.platform === 'linux') try { return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('run-matrix'); } catch { return false; }
  return true;
}
// An agent still going after its runner is gone (the runner was killed outright): nobody reads what it does any more.
// On Linux it's known by its working folder, the run's work/, so it can be ended before its session carries on.
function orphanOf(u, dir) {
  if (!alive(u.agent) || process.platform !== 'linux') return null;
  try { return fs.readlinkSync(`/proc/${u.agent}/cwd`) === path.join(outDir, dir, 'work') ? u.agent : null; } catch { return null; }
}
// The runs cut off before this batch (key -> { u, dir, orphan }), and those still going in another runner (busy), read once.
let cutCache = null;
function cutRuns() {
  if (!cutCache) {
    cutCache = { cut: new Map(), busy: new Set() };
    for (const dir of fs.existsSync(outDir) ? fs.readdirSync(outDir) : []) {
      const u = readUnfinished(path.join(outDir, dir));
      if (!u?.base?.id) continue;
      const orphan = alive(u.runner, true) ? null : orphanOf(u, dir);
      if (alive(u.runner, true) || (alive(u.agent) && !orphan)) cutCache.busy.add(runKey(u.base));
      else cutCache.cut.set(runKey(u.base), { u, dir, orphan });
    }
  }
  return cutCache;
}
// Ends an orphaned agent (and what it started), and waits up to 10 s for it to be gone.
async function endOrphan(pid) {
  try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch {} }
  for (let i = 0; i < 100 && alive(pid); i++) await new Promise((r) => setTimeout(r, 100));
}
const cutOf = (run) => cutRuns().cut.get(run.key) ?? null;
// Where a cut-off run's session had got to: its id (from the part's output so far), its transcript, the responses
// the part got (see transcriptResponses; up to `to`, when the part after it started, once there is one), when the part
// ended (as it was cut off; after a crash, the last write to its output or transcript) and the minutes it has run in
// all, every part counted.
function cutSession({ u, dir }, to = Infinity) {
  const home = path.join(outDir, dir), part = u.part, mtime = (f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };
  let sessionId = u.base.sessionId ?? null, end = null, responses = new Map(), out = null;
  if (part) {
    out = path.join(home, partFile(part.n, 'out'));
    let head = ''; try { head = fs.readFileSync(out, 'utf8').slice(0, 20000); } catch {}
    sessionId = head.match(/"session_id":"([\w-]+)"/)?.[1] ?? sessionId;
  }
  const file = sessionId ? claudeTranscript(sessionId, path.join(home, 'work')) : null;
  if (part) {
    const start = Date.parse(part.startedAt);
    end = Date.parse(part.endedAt ?? '') || Math.max(start, mtime(out), file ? mtime(file) : 0);
    if (file) responses = transcriptResponses(file, start, to);
  }
  return { sessionId, file, responses, end, minutes: (u.base.wallMinutes ?? 0) + (part ? (end - Date.parse(part.startedAt)) / 60000 : 0) };
}
// A Claude Code transcript's responses from `from` until `to` (ms), by message id: model and usage. It writes each
// response as it's made, with the request's final usage, so it has what a session cut off before its result line used.
function transcriptResponses(file, from, to) {
  const out = new Map();
  try {
    for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!l.includes('"type":"assistant"')) continue;
      let e; try { e = JSON.parse(l); } catch { continue; }
      const m = e.message, at = Date.parse(e.timestamp ?? '');
      if (e.type !== 'assistant' || !m?.id || !m.usage || m.model === '<synthetic>' || !(at >= from && at < to)) continue;
      out.set(m.id, { model: m.model, usage: m.usage });
    }
  } catch {}
  return out;
}
// A cut-off run carries on with its session when its CLI can (Claude Code), with the same model, once its session had
// got going (it made output before, or got a response in the part cut off) and, with a time limit, while there's time left.
function canCarryOn(run, cut) {
  if (!cut || !RESUMABLE.has(run.agent.provider) || cut.u.base.model !== run.agent.model) return false;
  const s = cutSession(cut), limit = +(run.agent.timeout || args.timeout || 0);
  return !!s.file && (cut.u.base.outputTokens > 0 || s.responses.size > 0) && !(limit && s.minutes >= limit);
}
// How a Claude Code session went from `from` (ms) on, from its transcript, and whether it ended by itself (`ended`):
// its last response called no tool, Claude Code saved the session's totals after it (as the process ended) and, with
// a /goal, the goal was met, Claude Code ended the turn itself after the goal check had blocked it 9 times, or an
// error (a response Claude Code made up, like "Credit balance is too low") ended the goal. A session ended mid-turn
// has a tool call last, or a goal check that wasn't met. `at`: its last entry; tools, toolErrors and compactions
// from then on until `to` (the agent's own output may stop short of them, if nobody was reading it).
function sessionEnd(file, from, goal, to = Infinity) {
  let lines; try { lines = fs.readFileSync(file, 'utf8').split('\n'); } catch { return null; }
  let on = false, last = null, at = 0, saved = false, met = false, forced = false, toolErrors = 0, compactions = 0;
  const tools = {}, toolIds = new Set();
  for (const l of lines) {
    let e; try { e = JSON.parse(l); } catch { continue; }
    const t = Date.parse(e.timestamp ?? '');
    if (t >= to) break; // a later part's
    if (!on && !(t >= from)) continue; // the parts before this one; a cost-state has no timestamp, so it goes by place
    on = true;
    if (t) at = Math.max(at, t);
    if (e.type === 'cost-state') saved = !!last;
    else if (e.type === 'assistant' && e.message) {
      const m = e.message;
      if (last?.id !== m.id) last = { id: m.id, text: [], tool: false, madeUp: m.model === '<synthetic>' };
      for (const c of Array.isArray(m.content) ? m.content : []) {
        if (c.type === 'text' && c.text) last.text.push(c.text);
        if (c.type === 'tool_use') { last.tool = true; if (!toolIds.has(c.id)) { toolIds.add(c.id); tools[c.name] = (tools[c.name] ?? 0) + 1; } }
      }
      saved = met = forced = false; // what comes after a response is about it
    } else if (e.type === 'user') {
      for (const c of Array.isArray(e.message?.content) ? e.message.content : []) if (c.type === 'tool_result' && c.is_error) toolErrors++;
    } else if (e.type === 'system') {
      if (e.subtype === 'compact_boundary') compactions++;
      if (/A hook blocked the turn from ending/.test(e.content ?? '')) forced = true;
    } else if (e.attachment?.type === 'goal_status' && !e.attachment.sentinel) met = !!e.attachment.met; // a sentinel marks the goal set
  }
  const ended = !!last && !last.tool && saved && (!goal || met || forced || last.madeUp);
  const text = last?.text.join('\n').trim() ?? '';
  return { ended, at, reply: last?.madeUp ? '' : text, error: last?.madeUp ? text || 'API error' : null, forced, tools, toolErrors, compactions };
}
// A cut-off run whose agent went on without its runner and ended its session by itself (see sessionEnd), or null.
function endedAlone(cut) {
  const { base, part } = cut?.u ?? {};
  if (!part || !RESUMABLE.has(base.provider) || alive(cut.u.agent)) return null;
  const s = cutSession(cut);
  if (!s.file) return null;
  const e = sessionEnd(s.file, Date.parse(part.startedAt), fs.existsSync(path.join(outDir, cut.dir, 'goal.md')));
  return e?.ended ? { s, e } : null;
}
const isDone = (run) => {
  const p = prevRun(run);
  if (p?.r.status === 'ok') return true;
  if (cutOf(run)) return false; // it carries on, or starts over
  return !!p && !(args.rerunFailed || canResume(run, p));
};

// ------------------------------------------------------------------ stages
// Runs in stages (--stage plan=claude-opus-5-5:max --stage build=claude-opus-5-5:xhigh,gpt-6.1-sol:max …), the
// config's "stages" in order: [{ id, text, goal?, game? }]. Every stage after the first continues from a finished
// run of the stage before it, for each brief (one variant per dimension, filtered by --only). A stage's picks
// branch every run of the stage before (1 plan × 2 builders × 2 content passes = 4 games); a stage without picks
// contributes the runs it already has, so a later stage can continue from plans made in an earlier batch. A run
// waits for its parent: it starts once the parent has finished OK, and is left out if the parent fails (see pool).
// It starts from a copy of the parent's work folder, gets TASK.md (the prompt, filled for this run) and is sent its
// stage's text, or with a stage goal on a CLI that has /goal, a /goal that points at STAGE.md (see prepareStage).
// Each stage's models ("agent:effort"): the config's with --stages (Setup · Advanced), a --stage replacing a stage's.
const STAGES = cfg.stages ?? [];
const stagePicks = new Map();
function pickStage(id, list, fromConfig) {
  const st = STAGES.find((x) => x.id === id), out = [];
  if (!st) { console.error(`No stage named "${id}" (the config has ${STAGES.map((x) => x.id).join(', ') || 'none'})`); process.exit(1); }
  for (const pick of list) {
    const [aid, eff] = pick.split(':'), agent = cfg.agents.find((a) => a.id === aid), pe = parseEffort(eff);
    if (!agent && fromConfig) { console.error(`Note: stage ${id} names "${aid}", which isn't in Models; left out.`); continue; }
    if (!agent) { console.error(`No model named "${aid}" for stage ${id}`); process.exit(1); }
    if (pe.ultracode && agent.provider !== 'claude') continue; // Ultracode is Claude Code only
    out.push({ agent, pe });
  }
  stagePicks.set(id, out);
}
if (args.stages) for (const st of STAGES) if (st.models?.length) pickStage(st.id, st.models, true);
for (const s of args.stage) { const [id, list = ''] = s.split('='); pickStage(id, list.split(',').filter(Boolean), false); }
const stageMode = args.stage.length > 0 || args.stages;
const infoOf = (r) => ({ agent: r.agent, model: r.model, effort: r.effort, stage: r.stage });
function stageRuns() {
  const picksAt = STAGES.map((s) => stagePicks.get(s.id) ?? []), last = picksAt.findLastIndex((p) => p.length), out = [];
  // Finished OK stage runs by brief, the steps before them and their stage: what a stage without picks contributes.
  const have = new Map();
  for (const { r, dir } of finished().values()) if (r.chain?.length && r.status === 'ok') {
    const k = `${briefKey(r)}|${chainKey(r.chain.slice(0, -1))}|${r.chain.at(-1).stage}`;
    (have.get(k) ?? have.set(k, []).get(k)).push({ key: runKey(r), chain: r.chain, dir, id: dir, info: infoOf(r) });
  }
  for (const combo of product()) {
    if (!filters.every(([k, set]) => !dimNames.includes(k) || set.has(combo[k].id))) continue;
    const bk = dimNames.map((d) => combo[d].id).join('__'), dims = Object.fromEntries(dimNames.map((d) => [d, combo[d].id]));
    let level = [{ chain: [], key: null, info: null }]; // the brief itself, before any stage
    for (let k = 0; k <= last; k++) {
      const st = STAGES[k], next = [];
      for (const p of level) {
        if (!picksAt[k].length) { next.push(...(have.get(`${bk}|${chainKey(p.chain)}|${st.id}`) ?? [])); continue; }
        for (const { agent, pe } of picksAt[k]) {
          const chain = [...p.chain, { stage: st.id, agent: agent.id, effort: pe.label }];
          const head = `${agent.id}-${pe.label}.${st.id}`;
          const node = { id: runName(head, combo, null, undefined, p.chain), head, key: `${chainKey(chain)}__${bk}`, chain, agent,
            effort: pe.base, ultracode: pe.ultracode, combo, stage: st, parentKey: p.key, parentInfo: p.info, parentDir: p.id ?? null,
            info: { agent: agent.id, model: agent.model, effort: pe.label, stage: st.id },
            fields: { agent: agent.id, provider: agent.provider, effort: pe.label, ultracode: pe.ultracode, ...dims, stage: st.id, chain } };
          out.push(node); next.push(node);
        }
      }
      level = next;
    }
  }
  return out;
}
if (stageMode) {
  const ids = STAGES.map((s) => s.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^\w+$/.test(id))) { console.error(`Stage names must be unique letters, numbers or _ (${ids.join(', ')})`); process.exit(1); }
  if (args.repeat > 1) console.error('Note: Repeat isn\'t used for runs in stages.');
  queue = stageRuns().slice(0, args.limit);
}
// --skip-keys: runs another batch running beside this one has queued or running (the dashboard's queue), left out so
// none runs twice. They stay "coming" (see coming): a run here that continues from one waits for it to finish there.
const elsewhere = new Set(args.skipKeys ? JSON.parse(fs.readFileSync(args.skipKeys, 'utf8')) : []);
if (elsewhere.size) {
  const n = queue.length; queue = queue.filter((r) => !elsewhere.has(r.key));
  if (queue.length < n) console.log(`· ${n - queue.length} run(s) left out: a batch queued before this one has them`);
}
// Runs whose agent is still going in another runner (a terminal, say): left out too, so none runs twice.
if (cutRuns().busy.size) {
  const n = queue.length; queue = queue.filter((r) => !cutRuns().busy.has(r.key) || isDone(r));
  if (queue.length < n) console.log(`· ${n - queue.length} run(s) left out: still running in another process`);
}


// -------------------------------------------------------------- providers
// Flags added to every run of a CLI when matrix.config.json has no extraArgs entry for it.
// They turn permission prompts off, which a headless run can't answer.
const DEFAULT_EXTRA = { claude: ['--dangerously-skip-permissions'],
  codex: ['--yolo'],
  grok: ['--always-approve'], agy: ['--dangerously-skip-permissions'], muse: ['--yolo'] };
const extra = (p) => cfg.extraArgs?.[p] ?? DEFAULT_EXTRA[p] ?? [];

// Each run on its own (the config's isolate; on unless false), so runs compare and nothing of this computer's own
// setup, or of another run, gets in. No window can open: DISPLAY and WAYLAND_DISPLAY are unset, so a headed browser
// fails instead (xvfb-run still works). Claude Code reads no CLAUDE.md, no MCP servers and no auto memory (it would
// share this repo's, which runs inside runs/ read and wrote); Grok no memory and nothing of Claude Code's (CLAUDE.md,
// skills, rules, MCP servers, hooks); Muse no rules or skills of other CLIs. No switch was found for Codex's
// ~/.codex/AGENTS.md, Grok's ~/.grok/AGENTS.md or agy's ~/.gemini/GEMINI.md: those still load.
const ISOLATE = cfg.isolate !== false;
const ISOLATE_ENV = {
  claude: { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' },
  grok: { GROK_MEMORY: '0', ...Object.fromEntries(['AGENTS', 'SKILLS', 'RULES', 'MCPS', 'HOOKS'].map((k) => [`GROK_CLAUDE_${k}_ENABLED`, '0'])) },
};
const ISOLATE_ARGS = { claude: ['--strict-mcp-config'], muse: ['--no-foreign-personal-context'] };
const NO_WINDOW = ['DISPLAY', 'WAYLAND_DISPLAY'];
// A CLI's extra flags, then the isolating ones it doesn't have already.
const flagsOf = (p) => [...extra(p), ...(ISOLATE ? ISOLATE_ARGS[p] ?? [] : []).filter((a) => !extra(p).includes(a))];
// Every run also gets a temp folder of its own, tmp/ beside work/ (TMPDIR, TMP, TEMP, and CLAUDE_CODE_TMPDIR for Claude
// Code's own files): /tmp is shared by the runs going at once, and on some computers it's held in memory. Not copied
// to a later stage, like the rest outside work/.
const TMP_VARS = ['TMPDIR', 'TMP', 'TEMP', 'CLAUDE_CODE_TMPDIR'];
function agentEnv(p, dir) {
  const env = ISOLATE ? { ...process.env, ...ISOLATE_ENV[p] } : { ...process.env };
  if (ISOLATE) for (const k of NO_WINDOW) delete env[k];
  if (dir) { const tmp = path.join(dir, 'tmp'); fs.mkdirSync(tmp, { recursive: true }); for (const k of TMP_VARS) env[k] = tmp; }
  return env;
}
// The same as a shell prefix, for Run → Preview.
const envPrefix = (p) => (ISOLATE ? ['env', ...NO_WINDOW.flatMap((k) => ['-u', k]), ...Object.entries(ISOLATE_ENV[p] ?? {}).map(([k, v]) => `${k}=${v}`)].join(' ') + ' ' : '')
  + TMP_VARS.map((k) => `${k}="$d/tmp"`).join(' ') + ' ';

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
    argv.push(...flagsOf('claude'));
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
    argv.push(...flagsOf('muse'), ...(goal ? [goal] : ['--prompt-file', promptFile]));
    return { bin: binOf('muse'), argv, promptInArgs: true };
  },
};

// A run as you'd type it yourself, from this folder: a fresh work folder (for a later stage, a copy of the one it
// continues from), then its CLI with what it's sent. Every run is one terminal session; a batch only queues them.
// prompt.md beside work/ is the prompt (for a stage, its text), TASK.md in work/ the prompt filled for that run.
const sh = (x) => /^[\w@%+=:,./-]+$/.test(String(x)) ? String(x) : `'${String(x).replace(/'/g, `'\\''`)}'`;
function terminalOf(run, resumes = false) {
  const rel = (id) => path.relative(process.cwd(), path.join(outDir, id)) || '.', dir = rel(run.id);
  const st = run.stage, where = st ? ` · ${STAGES.indexOf(st) + 1} ${st.id}` : '';
  const head = `# ${run.agent.id} ${parseEffort(run.effort ?? 'default').label}${run.ultracode ? '-uc' : ''}${where} (${CLIS[run.agent.provider] ?? run.agent.provider})`;
  if (resumes) {
    const cut = cutOf(run), p = cut ? { dir: cut.dir, r: { sessionId: cutSession(cut).sessionId } } : prevRun(run);
    return [`${head}: carries on with its session where it ${cut ? 'was cut off' : 'stopped'}`, `d=${sh(rel(p.dir))}`, `(cd "$d/work" && ${envPrefix('claude')}${sh(binOf('claude'))} -p … --resume ${sh(p.r.sessionId)} …)`];
  }
  let text;
  try { text = st ? stageTexts(run).text : buildPrompt(run); } catch (e) { return [head, `# can't start: ${e.message}`]; }
  const { bin, argv, promptInArgs } = providers[run.agent.provider](run.agent, run.effort, text, run, '\0prompt.md');
  const args = argv.map((a) => a === '\0prompt.md' ? '../prompt.md' : a === text ? '"$(cat ../prompt.md)"' : sh(a));
  const make = st && run.parentDir ? `cp -r ${sh(rel(run.parentDir) + '/work')} "$d/work"   # a copy of the folder it continues from (without node_modules, .git)`
    : 'mkdir -p "$d/work"';
  const tmp = 'mkdir -p "$d/tmp"   # its temp folder';
  return [head, `d=${sh(dir)}`, make, tmp, `(cd "$d/work" && ${envPrefix(run.agent.provider)}${[sh(bin), ...args].join(' ')}${promptInArgs ? '' : ' < ../prompt.md'})`];
}

if (args.rename.length) { try { renameVariants(args.rename); } catch (e) { console.error(e.message); process.exit(1); } process.exit(0); }
if (args.dryRun) {
  // resumes: failed runs that carry on (Resume failed); carriesOn: cut-off runs that do; startsOver: cut-off runs that can't;
  // endedAlone: cut-off runs that finished on their own, which get their result from their session and run nothing.
  const byAgent = {}, cut = queue.filter((r) => cutOf(r) && !isDone(r)), ended = cut.filter((r) => endedAlone(cutOf(r)));
  const carrying = cut.filter((r) => !ended.includes(r) && canCarryOn(r, cutOf(r)));
  const resuming = [...carrying, ...queue.filter((r) => !cutOf(r) && canResume(r))];
  for (const r of queue) byAgent[r.fields.agent] = (byAgent[r.fields.agent] ?? 0) + 1;
  let sample = '', error = null;
  try {
    const r0 = queue[0];
    if (r0?.stage) { // a later stage's parent may not exist yet: its text names the model picked for it
      const brief = buildPrompt(r0), g = goalMessage(r0), t = stageTexts(r0).text;
      sample = `Message sent:\n${g ?? t}\n\n${g ? `--- STAGE.md ---\n${t}\n` : ''}--- TASK.md ---\n${brief}`;
    } else if (r0) { sample = buildPrompt(r0); const g = goalMessage(r0); if (g) sample = `Message sent:\n${g}\n\n--- TASK.md ---\n${sample}`; }
  } catch (e) { error = e.message; }
  const byStage = {};
  for (const r of queue) if (r.stage) byStage[r.stage.id] = (byStage[r.stage.id] ?? 0) + 1;
  // The batch as terminal sessions (the first 100; Run → Preview shows them): the runs not done yet, in queue order.
  const todo = queue.filter((r) => !isDone(r) && !ended.includes(r)), terminal = todo.slice(0, 100).map((r) => terminalOf(r, resuming.includes(r)).join('\n'));
  if (args.json) {
    console.log(JSON.stringify({ count: queue.length, byAgent, byStage, alreadyDone: queue.filter(isDone).length, resumes: resuming.length - carrying.length,
      carriesOn: carrying.length, startsOver: cut.length - carrying.length - ended.length, endedAlone: ended.length,
      ids: queue.map((r) => r.id), sampleId: queue[0]?.id ?? null, sample, error, missingClis: missingClis().map(binOf), terminal, terminalTotal: todo.length }));
  } else {
    console.log(`${queue.length} runs  (${Object.entries(byAgent).map(([k, v]) => `${k}: ${v}`).join(', ')})\n`);
    for (const r of queue) console.log('  ' + r.id + (ended.includes(r) ? '  (finished on its own after it was cut off: its result comes from its session)'
      : carrying.includes(r) ? '  (carries on: cut off)' : cut.includes(r) ? '  (cut off: starts over)' : resuming.includes(r) ? '  (resumes)' : ''));
    if (error) console.log(`\nPrompt error: ${error}`);
    else if (queue[0]) console.log(`\n--- sample prompt (${queue[0].id}) ---\n${sample}`);
    if (terminal.length) console.log(`\n--- in a terminal (${terminal.length === todo.length ? 'every run not done yet' : `the first ${terminal.length} of ${todo.length}`}) ---\n${terminal.join('\n\n')}`);
  }
  process.exit(0);
}

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
// last: the latest response's text (see parseClaude).
function readStream(text) {
  const s = { tools: {}, ids: new Set(), results: [], toolErrors: 0, compactions: 0, limits: [], last: null };
  for (const l of text.split('\n')) {
    if (!l.startsWith('{')) continue;
    let e; try { e = JSON.parse(l); } catch { continue; }
    const content = Array.isArray(e.message?.content) ? e.message.content : [];
    if (e.type === 'assistant') { // a response arrives in several events, one per content block
      if (e.message.id) s.ids.add(e.message.id);
      if (!e.message.id || s.last?.id !== e.message.id) s.last = { id: e.message.id, text: [], madeUp: e.message.model === '<synthetic>' };
      for (const b of content) {
        if (b.type === 'tool_use' || b.type === 'server_tool_use') add(s.tools, b.name);
        else if (b.type === 'text' && b.text) s.last.text.push(b.text);
      }
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

// The reply is the result line's text. When Claude Code ends a /goal turn itself (the check blocked the stop
// 9 times in a row), that text is empty, though the agent's last response holds its final answer: the reply is
// then that response's text, as for a session that ended without its runner (see sessionEnd).
function parseClaude(text, agent, ctx) {
  const s = readStream(text), j = minusSince(s.results.at(-1), ctx?.since);
  if (!j) return { isError: true };
  const last = s.last && !s.last.madeUp ? s.last.text.join('\n').trim() : '';
  return { reply: j.result || (j.is_error ? j.result : last), costUsd: j.total_cost_usd, costSource: j.total_cost_usd != null ? 'reported' : 'none',
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
  // Codex prints a turn's usage when the turn ends, so a run stopped mid-turn (by the time limit, say) printed
  // less than its log has for the main thread: the log's figures stand in for the printed ones then.
  const main = x.main;
  if (main && (main.input_tokens ?? 0) + (main.output_tokens ?? 0) > (m.inputTokens ?? 0) + (m.outputTokens ?? 0)) {
    m.inputTokens = main.input_tokens ?? 0; m.cachedTokens = main.cached_input_tokens ?? 0;
    m.cacheWriteTokens = main.cache_write_input_tokens ?? m.cacheWriteTokens;
    m.outputTokens = main.output_tokens ?? 0; m.reasoningTokens = main.reasoning_output_tokens ?? 0;
    m.models = { [ctx.model ?? 'unknown']: modelUse(m.inputTokens, m.cachedTokens, m.cacheWriteTokens ?? 0, m.outputTokens, m.reasoningTokens) };
  }
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
    compactions: top.compactions, firstTokenMs: top.firstTokenMs, plan, main: top.usage };
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
let spent = 0, stopping = false, keeping = false, overBudget = false, paused = false, done = 0, skipped = 0;
// The batch loop (pool) sleeps until a run ends or a setting changes; wake() lets it check again.
let wakeUp = null;
function wake() { const w = wakeUp; wakeUp = null; w?.(); }

// Kill the agent and everything it started (servers, browsers, subagents).
function killTree(child) {
  if (child.exitCode !== null) return;
  if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } }
}

// Stop throws the running agents' runs away (they start over next time). With keep (the dashboard quitting or
// restarting, or this runner being ended) they're cut off instead: see cutOff.
function stopAll(reason, keep = false) {
  if (stopping) return;
  stopping = true; keeping = keep;
  console.log(`■ Stopping (${reason}): ending ${live.size} running agent(s)${keep && live.size ? '; a Claude Code run that got going carries on with its session next time' : ''}…`);
  for (const c of live.values()) killTree(c.child);
  wake(); // a paused batch with nothing running has nothing else to wake it
}

// A model's own time limit wins over the batch's.
const limitOf = (run) => +(run.agent.timeout || args.timeout || 0);
// (Re)arm a running agent's time limit, counted from when it started: one already past it ends now.
function setLimit(c, min) {
  clearTimeout(c.timer); c.timer = null;
  if (min > 0) c.timer = setTimeout(() => { c.timedOut = true; c.err.write('\n[matrix] timed out\n'); killTree(c.child); },
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
process.on('SIGTERM', () => stopAll('terminated', true));
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

// A stage run's folder: its parent's work folder copied (without node_modules and .git: they can be big, and are
// made again; nor its exit interview, so the one this run leaves is its own; and its games as their agent left
// them, without the record stampGame put in, which is about the run before), TASK.md (the prompt, filled for this
// run, so its file name and Source Information name this model),
// prompt.md beside work/ (the stage's text, what it's sent) and, with a /goal, that text as STAGE.md and the
// command as goal.md. Returns the parent's root .html files (name -> hash), so measureOutput can tell the game
// this run made from the ones it was given.
const PLANNER_FILE = 'planner-exit-interview.json'; // a stage run's review of its prompt (see plannerInterview)
const NOT_COPIED = new Set(['node_modules', '.git', EXIT_FILE, PLANNER_FILE]);
function prepareStage(run, dir, brief, parent) {
  const work = path.join(dir, 'work');
  if (parent) {
    fs.cpSync(path.join(outDir, parent.dir, 'work'), work, { recursive: true, filter: (src) => !NOT_COPIED.has(path.basename(src)) });
    for (const f of fs.readdirSync(work)) if (/\.html?$/i.test(f)) try {
      const file = path.join(work, f), t = fs.readFileSync(file, 'utf8');
      if (STAMP_RE.test(t)) fs.writeFileSync(file, unstamped(t));
    } catch {}
  }
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(path.join(work, 'TASK.md'), brief);
  const { text } = stageTexts(run), goal = goalMessage(run);
  fs.writeFileSync(path.join(dir, 'prompt.md'), text);
  if (goal) { fs.writeFileSync(path.join(work, 'STAGE.md'), text); fs.writeFileSync(path.join(dir, 'goal.md'), goal + '\n'); }
  else fs.rmSync(path.join(work, 'STAGE.md'), { force: true }); // the parent's
  return parent ? rootHtml(work) : null;
}
const rootHtml = (work) => new Map(fs.readdirSync(work).filter((f) => /\.html?$/i.test(f) && fs.statSync(path.join(work, f)).isFile())
  .map((f) => [f, crypto.createHash('sha1').update(fs.readFileSync(path.join(work, f))).digest('hex')]));
// What a stage run records besides the usual: its parent (folder and start, so a later redo of the parent shows),
// whether its stage makes a game (a plan's doesn't), the parent's games it was given, and PLAN.md's size.
function stageFields(run, work, parent, given) {
  if (!run.stage) return {};
  let planChars; try { planChars = fs.readFileSync(path.join(work, 'PLAN.md'), 'utf8').length; } catch {}
  return { parentId: parent?.dir ?? null, parentStartedAt: parent?.r.startedAt ?? null, ...(run.stage.game === false ? { expectsGame: false } : {}),
    ...(given?.size ? { givenHtml: Object.fromEntries(given) } : {}), ...(planChars != null ? { planChars } : {}) };
}
// plannerInterview: a stage run's review of the prompt it was given (TASK.md and its stage's text), when the stage's
// text asks for one: planner-exit-interview.json in its folder, a JSON list of { question, answer }. ok, invalid or
// missing, and when ok the answers (plannerAnswers), kept in result.json: a plan makes no game to carry a record, and
// each question goes with its answer, so answers still read right after the questions change. A later stage isn't
// given the file (NOT_COPIED).
function plannerInterview(home) {
  const read = (f) => { try { return fs.readFileSync(path.join(home, f), 'utf8'); } catch { return null; } };
  if (!(read('prompt.md') ?? '').includes(PLANNER_FILE)) return {};
  const text = read(path.join('work', PLANNER_FILE));
  if (text == null) return { plannerInterview: 'missing' };
  let j; try { j = JSON.parse(text); } catch { return { plannerInterview: 'invalid' }; }
  const list = Array.isArray(j) ? j : Object.values(j ?? {}).find(Array.isArray); // also { "answers": [...] }
  if (!list?.length || !list.every((x) => typeof x?.question === 'string' && typeof x?.answer === 'string')) return { plannerInterview: 'invalid' };
  return { plannerInterview: 'ok', plannerAnswers: list.map((x) => ({ question: x.question.trim(), answer: x.answer.trim() })) };
}
// exitInterview: whether a run left the exit interview its prompt asks for (exit-interview.json beside the game, one
// JSON object; see run-record.mjs): ok, invalid or missing. Left out when its prompt (TASK.md for a stage run) doesn't
// ask for one, and for a plan, which makes no game.
function exitInterview(home, stage, expectsGame) {
  const read = (f) => { try { return fs.readFileSync(path.join(home, f), 'utf8'); } catch { return null; } };
  if (expectsGame === false || !(read(stage ? 'work/TASK.md' : 'prompt.md') ?? '').includes(EXIT_FILE)) return {};
  const text = read(path.join('work', EXIT_FILE));
  return { exitInterview: text == null ? 'missing' : parseInterview(text).error ? 'invalid' : 'ok' };
}
// goalOutcome: how a run's /goal went, from its Claude Code transcript (the CLI's own output doesn't say). goalMet:
// whether its last goal check passed (false when it never got one, like a session that failed first); goalChecks: how
// many checks it got; goalForced: Claude Code ended the turn itself after the check had blocked it 9 times in a row,
// so the run finished without the goal; goalReason: what the last check said was missing, when it wasn't met. {} for
// a run sent no /goal, and for one whose transcript isn't on this computer (made on another one, say), which keeps
// what it has. A run ended by its time limit never printed its result, so its session is the one its output started.
// GOAL_KEYS: these fields, for --reparse to replace.
const GOAL_KEYS = ['goalMet', 'goalChecks', 'goalForced', 'goalReason'];
function goalOutcome(home, r) {
  if (r.provider !== 'claude' || !fs.existsSync(path.join(home, 'goal.md'))) return {};
  let sid = r.sessionId; if (!sid) try { sid = firstLine(path.join(home, 'agent.out'))?.session_id; } catch {}
  const file = sid && claudeTranscript(sid, path.join(home, 'work'));
  let text; try { text = file && fs.readFileSync(file, 'utf8'); } catch {}
  if (!text) return {};
  let checks = 0, last = null, forced = false;
  for (const l of text.split('\n')) {
    if (!l.includes('"goal_status"') && !l.includes('A hook blocked the turn from ending')) continue;
    let e; try { e = JSON.parse(l); } catch { continue; }
    // A sentinel marks the goal being set or cleared, not a check; forced is about the checks before it.
    if (e.attachment?.type === 'goal_status' && !e.attachment.sentinel) { checks++; last = e.attachment; forced = false; }
    else if (e.type === 'system' && /A hook blocked the turn from ending/.test(e.content ?? '')) forced = true;
  }
  const met = !!last?.met;
  return { goalMet: met, goalChecks: checks, ...(forced && !met ? { goalForced: true } : {}),
    ...(!met && last?.reason ? { goalReason: String(last.reason).slice(0, 1500) } : {}) };
}
// The time zone of this computer's clock, saved with each run: its folder name and {{stamp}} are in local time.
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const lastLine = (file) => { try { return fs.readFileSync(file, 'utf8').trim().split('\n').pop().trim().slice(0, 500); } catch { return ''; } };

// leftovers: what a run's agent left running once it exited, like a test server it never stopped. Claude Code runs a
// background command in a session of its own, so ending the agent's process group misses it. Stopped (SIGTERM): a
// process started since the run did, with no terminal (so never someone's shell), whose working folder or command
// line is in the run's folder. Linux only (it reads /proc). Returns their command lines, for result.json.
let procClock = null;
function stopLeftovers(dir, since) {
  if (process.platform !== 'linux') return [];
  try {
    procClock ??= { tck: +spawnSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).stdout.trim() || 100,
      boot: +fs.readFileSync('/proc/stat', 'utf8').match(/^btime (\d+)/m)[1] * 1000 };
  } catch { return []; }
  const root = path.resolve(dir), inside = (x) => x === root || x.startsWith(root + path.sep), out = [];
  let pids = []; try { pids = fs.readdirSync('/proc').filter((p) => /^\d+$/.test(p) && +p !== process.pid); } catch {}
  for (const p of pids) {
    try {
      // /proc/<pid>/stat after "(name) ": state, ppid, pgrp, session, tty_nr … and starttime 20th, in clock ticks.
      const stat = fs.readFileSync(`/proc/${p}/stat`, 'utf8'), f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      if (+f[4] !== 0 || procClock.boot + (+f[19] / procClock.tck) * 1000 < since - 1000) continue;
      let cwd = ''; try { cwd = fs.readlinkSync(`/proc/${p}/cwd`).replace(/ \(deleted\)$/, ''); } catch {}
      const cmd = fs.readFileSync(`/proc/${p}/cmdline`, 'utf8').split('\0').filter(Boolean).join(' ');
      if (!inside(cwd) && !cmd.includes(root + path.sep)) continue;
      process.kill(+p, 'SIGTERM');
      out.push(cmd.slice(0, 200));
    } catch {}
  }
  return out;
}

// gameCheck: a run's game, loaded once in headless Chromium and left alone for a few seconds (check-game.py), when the
// config's gameCheck is on (true, or { "seconds": n }; 60 by default: an attract mode starts after 10 s of the game's
// own time, which a slow software renderer stretches): its page errors, console errors and failed
// requests (each a count, and the first few as *First), how long it took to load, and a screenshot, game-check.png
// in the run's folder. { skipped } when Playwright for Python or its Chromium isn't installed. Kept out of the game's
// record (see PRIVATE in run-record.mjs): it's about this computer's look at the game, not the run.
const CHECK_GAME = fileURLToPath(new URL('./check-game.py', import.meta.url));
function checkGame(home, entry) {
  const secs = +(cfg.gameCheck?.seconds ?? 60) || 60;
  return new Promise((resolve) => {
    let out = '';
    const child = spawn(isWin ? 'python' : 'python3', [CHECK_GAME, path.join(outDir, entry), path.join(home, 'game-check.png'), String(secs)],
      { stdio: ['ignore', 'pipe', 'ignore'] });
    const timer = setTimeout(() => child.kill('SIGKILL'), (secs + 90) * 1000);
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', () => { clearTimeout(timer); resolve({ skipped: 'Python 3 is not installed' }); });
    child.on('close', () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(out.trim().split('\n').pop())); } catch { resolve({ error: 'the check printed nothing it could read' }); }
    });
  });
}
// After a run is saved: its game checked (when gameCheck is on and it left one), and result.json written again with it.
async function checkSaved(home, result) {
  if (!cfg.gameCheck || !result.delivered || !result.entry) return;
  result.gameCheck = await checkGame(home, result.entry);
  fs.writeFileSync(path.join(home, 'result.json'), JSON.stringify(result, null, 2));
}

// Start the agent in dir/work, wait for it to exit (or hit `limit` minutes) and parse its output. A resumed
// run's later parts write their own output files (partFile) and say what the session had used before (since).
// base: the run's record so far, written with this part to unfinished.json as the agent starts (see UNFINISHED).
async function spawnAgent(run, dir, prompt, limit, part = 0, since = null, base = null) {
  const { bin, argv, promptInArgs } = providers[run.agent.provider](run.agent, run.effort, prompt, run, path.join(dir, 'prompt.md'));
  const outPath = path.join(dir, partFile(part, 'out')), errPath = path.join(dir, partFile(part, 'err'));
  const out = fs.createWriteStream(outPath), err = fs.createWriteStream(errPath);
  const start = Date.now();
  let timedOut = false;

  const exitCode = await new Promise((resolve) => {
    // On Windows, npm .cmd shims need a shell; quote args so prompts survive it.
    const a = isWin ? argv.map((x) => `"${String(x).replace(/"/g, '\\"')}"`) : argv;
    const child = spawn(bin, a, { cwd: path.join(dir, 'work'), shell: isWin, detached: !isWin, env: agentEnv(run.agent.provider, dir) });
    const c = { run, child, start, err, timer: null };
    live.set(run.id, c);
    if (base) writeUnfinished(dir, { base, part: { n: part, startedAt: new Date(start).toISOString(), cliVersion: cliVersions[run.agent.provider],
      ...(since ? { since } : {}) }, runner: process.pid, agent: child.pid });
    child.stdout.pipe(out); child.stderr.pipe(err);
    child.stdin.on('error', () => {});
    child.stdin.end(promptInArgs ? '' : prompt);
    setLimit(c, limit);
    child.on('error', (e) => { err.write(`\n[matrix] ${e.message}\n`); });
    child.on('close', (code) => { clearTimeout(c.timer); live.delete(run.id); timedOut = !!c.timedOut; resolve(code); });
  });
  await Promise.all([new Promise((r) => out.end(r)), new Promise((r) => err.end(r))]);

  let metrics = {};
  try { metrics = readMetrics(run.agent.provider, fs.readFileSync(outPath, 'utf8'), run.agent, { cwd: path.join(dir, 'work'), start, end: Date.now(), since }); }
  catch (e) { metrics = { isError: true, parseError: e.message }; }
  metrics.replyChars = String(metrics.reply ?? '').trim().length;
  const left = stopLeftovers(dir, start);
  if (left.length) metrics.leftovers = left;
  // The time limit ending a run makes it a failure, also when the CLI exits 0 on being stopped (Codex does).
  if (timedOut) metrics.isError = true;
  if ((exitCode !== 0 || metrics.isError) && !metrics.error)
    metrics.error = lastLine(errPath) || metrics.parseError || (exitCode == null ? 'killed' : `exit code ${exitCode}`);
  return { exitCode, metrics, start, bin, argv };
}

// Runs not done yet (pool skips the others first).
async function runOne(run) {
  // Cut off in an earlier batch: it carries on with its session, or starts over when it can't. One whose agent
  // finished on its own after its runner was gone gets its result from its session instead.
  const cut = cutOf(run);
  if (cut) {
    cutRuns().cut.delete(run.key);
    const ended = endedAlone(cut);
    if (ended) return foldEnded(run, cut, ended);
    if (cut.orphan) { console.log(`· ${cut.dir}: ending its agent, still going since its runner was killed (pid ${cut.orphan})`); await endOrphan(cut.orphan); }
    if (canCarryOn(run, cut)) return resumeOne(run, { r: cutRecord(cut), dir: cut.dir }, true);
    fs.rmSync(path.join(outDir, cut.dir), { recursive: true, force: true });
    if (finished().get(run.key)?.dir === cut.dir) finished().delete(run.key); // it was carrying on from a failed run there
    console.log(`· ${cut.dir} was cut off before and starts over: ${RESUMABLE.has(run.agent.provider)
      ? 'its session hadn\'t got going, or its time limit is used up' : `${CLIS[run.agent.provider] ?? run.agent.provider} can't carry on a session`}`);
  }
  const prev = prevRun(run);
  if (canResume(run, prev)) return resumeOne(run, prev);
  // The start time names the folder (with folderName.date) and fills the prompt's {{stamp}}: the two match.
  run.when = new Date(); run.texts = null;
  if (FN?.date) run.id = nameOf(run, run.when);
  const dir = path.join(outDir, run.id), resFile = path.join(dir, 'result.json');
  // Never clear a folder that holds another combination's run (see runName); left as it is, this one doesn't start.
  const there = readResult(run.id) ?? readUnfinished(dir)?.base;
  if (there?.id && runKey(there) !== run.key) { done++; tell('gone', run); console.log(`✘ ${run.id}  not started: its folder holds a different run`); return; }
  fs.rmSync(dir, { recursive: true, force: true });
  // A failed run being retried that was made before a dimension was added: the new attempt replaces it.
  if (prev && prev.dir !== run.id) fs.rmSync(path.join(outDir, prev.dir), { recursive: true, force: true });
  if (prev) finished().delete(run.key); // its old result is gone, so it isn't done if it's requeued
  const work = path.join(dir, 'work');
  let prompt, parent = null, given = null;
  try {
    if (run.stage) {
      parent = run.parentKey ? finished().get(run.parentKey) ?? null : null;
      if (run.parentKey && parent?.r.status !== 'ok') throw new Error('the run it continues from hasn\'t finished OK');
      if (parent) run.parentInfo = infoOf(parent.r); // the run it actually continues from
      given = prepareStage(run, dir, buildPrompt(run, run.when), parent);
      prompt = stageTexts(run).text;
    } else {
      prompt = buildPrompt(run, run.when);
      prepare(run, dir, prompt);
    }
  } catch (e) { // e.g. a placeholder this variant's text leaves unfilled, or a /goal over the limit: fail this run, keep the batch going
    fs.mkdirSync(dir, { recursive: true });
    const now = new Date().toISOString();
    let hashes; try { hashes = variantHashes(run.combo); } catch {} // a variant whose file can't be read is why we're here
    fs.writeFileSync(resFile, JSON.stringify({ id: run.id, ...run.fields, model: run.agent.model, promptVersion, variantHashes: hashes,
      status: 'failed', exitCode: null, error: `Not started: ${e.message}`, wallMinutes: 0, startedAt: now, finishedAt: now }, null, 2));
    finished().set(run.key, { r: readResult(run.id), dir: run.id }); tell('done', run, run.id);
    done++; console.log(`✘ ${run.id}  not started: ${e.message}`);
    return;
  }

  for (const d of dimNames) {
    const setup = run.combo[d].setup;
    if (setup) spawnSync(setup, { cwd: work, shell: true, stdio: 'ignore' });
  }

  // goalSkipped: a goal (a goal variant, or a stage's goal) on a CLI without headless /goal, so it got the plain text.
  const goalSkipped = (run.stage ? !!stageTexts(run).goal : !!goalText(run.combo)) && !goalMessage(run);
  // What the run is made with, kept in unfinished.json while it runs, so a cut-off run carries on as itself.
  const base = { id: run.id, ...run.fields, model: run.agent.model, cliVersion: cliVersions[run.agent.provider], promptVersion,
    variantHashes: variantHashes(run.combo), ...(goalSkipped ? { goalSkipped } : {}), ...stageFields(run, work, parent, given), timeZone: TIME_ZONE, isolated: ISOLATE };
  console.log(`▶ ${run.id}${parent ? `  (${run.stage.id}, from ${parent.dir})` : ''}`);
  const { exitCode, metrics, start } = await spawnAgent(run, dir, prompt, limitOf(run), 0, null, base);

  if (stopping || run.abort) { // interrupted: cut off, or thrown away so it runs fresh (later in this batch if requeued)
    if (keeping && !run.abort && cutOff(run, dir)) return;
    fs.rmSync(dir, { recursive: true, force: true });
    if (run.abort === 'requeue' && !stopping) { run.abort = null; pending.unshift(run); console.log(`↺ ${run.id} requeued (starts over)`); }
    else { tell('gone', run); console.log(`■ ${run.id} stopped (discarded${keeping ? `: ${RESUMABLE.has(run.agent.provider) ? 'its session hadn\'t got going'
      : `${CLIS[run.agent.provider] ?? run.agent.provider} can't carry on a session`}, so it starts over next time` : ''})`); }
    return;
  }

  if (metrics.reply) fs.writeFileSync(path.join(dir, 'reply.md'), metrics.reply);
  delete metrics.reply;
  const status = exitCode === 0 && !metrics.isError ? 'ok' : 'failed';
  const measured = measureOutput(work, given), end = Date.now();
  const id = status === 'ok' ? withTitle(run.id, measured, run) : run.id, home = path.join(outDir, id);
  const staged = stageFields(run, path.join(home, 'work'), parent, given);
  const result = { id, ...run.fields, model: run.agent.model, cliVersion: cliVersions[run.agent.provider], promptVersion,
    variantHashes: variantHashes(run.combo), ...(goalSkipped ? { goalSkipped } : {}), status, exitCode,
    wallMinutes: (end - start) / 60000, ...metrics, ...measured, ...staged, ...exitInterview(home, !!run.stage, staged.expectsGame),
    ...(run.stage ? plannerInterview(home) : {}), ...goalOutcome(home, { provider: run.agent.provider, sessionId: metrics.sessionId }),
    startedAt: new Date(start).toISOString(), finishedAt: new Date(end).toISOString(), timeZone: TIME_ZONE, isolated: ISOLATE };
  fs.writeFileSync(path.join(home, 'result.json'), JSON.stringify(result, null, 2));
  fs.rmSync(path.join(home, UNFINISHED), { force: true });
  finished().set(run.key, { r: result, dir: id }); // so the runs continuing from it can start
  stampGame(home, result, run.combo);
  spent += metrics.costUsd ?? 0; done++; tell('done', run, id);
  console.log(`${status === 'ok' ? '✔' : '✘'} ${run.id}  ${result.wallMinutes.toFixed(1)}m  ` +
    `${fmtUsd(metrics.costUsd)}  out:${metrics.outputTokens ?? '?'} tok${id !== run.id ? `  → ${id}` : ''}`);
  await checkSaved(home, result);
  if (!args.broker) writeReport(); // with --broker the dashboard writes it, from the config as it is now
}

// With folderName.title, a run that has made its game gets the game's title at the end of its folder's name: the
// agent picks the title as it works, so it isn't known when the folder is made. Renames the folder and points
// `measured.entry` into it; returns the folder's name now (the old one if there's no title or the name is taken).
function withTitle(id, measured, run) {
  if (!FN?.title || !measured.delivered || !measured.entry) return id;
  const t = titleOf(path.basename(measured.entry), run), nid = t ? `${id}__${t}` : null;
  if (!nid || fs.existsSync(path.join(outDir, nid))) return id;
  try { fs.renameSync(path.join(outDir, id), path.join(outDir, nid)); } catch { return id; }
  measured.entry = nid + measured.entry.slice(id.length);
  return nid;
}
// The game's title from its file name, GameTitle-SOURCE-model-effort-stamp.html as the prompt asks for: what's left
// once the stamp, the model and effort, and the source are taken off its end. Letters, digits, . _ - only. The stamp
// is to the second (YYYYMMDD-HHMMSS), or to the minute in a game made before that and resumed since.
function titleOf(file, run) {
  const norm = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let tokens = file.replace(/\.html?$/i, '').split(/[-\s]+/).filter(Boolean);
  const dropEnd = (target) => { const t = norm(target); if (!t) return false;
    for (let k = 1; k <= tokens.length; k++) if (norm(tokens.slice(-k).join('')) === t) { tokens = tokens.slice(0, -k); return true; }
    return false; };
  if (/^\d{8}$/.test(tokens.at(-2) ?? '') && /^\d{4}(\d{2})?$/.test(tokens.at(-1) ?? '')) tokens = tokens.slice(0, -2);
  const v = runVars(run, run.when);
  if (!dropEnd(`${v.model}${v.effort}`)) dropEnd(v.model);
  const src = run.combo.source;
  if (src && !dropEnd(variantText(src))) dropEnd(src.id);
  const t = tokens.join('-').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 60).replace(/[-.]+$/, '');
  return t && !/^(index|game|main)$/i.test(t) ? t : null;
}

// A resumed run's output: the first part's in agent.out and agent.err, part n's in agent.<n>.out and .err.
function partFile(i, ext) { return i ? `agent.${i + 1}.${ext}` : `agent.${ext}`; } // a declaration: the dry run uses it
// Sent to a resumed session that had no /goal (one with a /goal gets it again, from goal.md).
const RESUME_MESSAGE = 'Your session stopped before the task was finished. Continue where you left off and complete it.';

// --resume-failed: carry on with a failed run's session (see canResume) instead of starting over; with carrying, a
// run that was cut off (see cutRecord), whatever the flags. Its folder stays as it is, work and all, and the new
// part's output goes to agent.<n>.out. The result adds up every part and keeps what the run was made with (prompt,
// variants, CLI version) and when it first started; `parts` lists each part's times and `resumes` counts them.
// Ended mid-way (Stop, ↻, ✕), the new part is thrown away and the run stays as it was, so it can be resumed again;
// cut off mid-way, the new part is kept for the next time too.
async function resumeOne(run, prev, carrying = false) {
  run.id = prev.dir; // it carries on in its own folder, whatever a new run would be named now
  const dir = path.join(outDir, prev.dir), work = path.join(dir, 'work'), r = prev.r;
  const parts = r.parts ?? [{ startedAt: r.startedAt, finishedAt: r.finishedAt, wallMinutes: r.wallMinutes, exitCode: r.exitCode, cliVersion: r.cliVersion }];
  const n = parts.length, since = claudeCostState(claudeTranscript(r.sessionId, work));
  let message = RESUME_MESSAGE;
  try { message = fs.readFileSync(path.join(dir, 'goal.md'), 'utf8').trim() || message; } catch {}
  // The time limit counts every part, so this one gets what's left (canResume and canCarryOn checked there's some).
  const limit = limitOf(run) && limitOf(run) - (r.wallMinutes ?? 0);

  console.log(`▶ ${run.id}  (${carrying ? 'carrying on with its session where it was cut off' : 'resuming its session'}, part ${n + 1})`);
  run.resume = { sessionId: r.sessionId, message };
  const { exitCode, metrics, start } = await spawnAgent(run, dir, '', limit, n, since, { ...r, parts });
  run.resume = null;

  if (stopping || run.abort) {
    if (keeping && !run.abort && cutOff(run, dir)) return;
    for (const ext of ['out', 'err']) fs.rmSync(path.join(dir, partFile(n, ext)), { force: true });
    // As it was: a failed run's result.json is still there; a cut-off run stays cut off without this part.
    if (fs.existsSync(path.join(dir, 'result.json'))) fs.rmSync(path.join(dir, UNFINISHED), { force: true });
    else writeUnfinished(dir, { base: r });
    if (run.abort === 'requeue' && !stopping) { run.abort = null; pending.unshift(run); console.log(`↺ ${run.id} requeued (resumes again)`); }
    else { tell('gone', run); console.log(`■ ${run.id} stopped (this part discarded; it can be resumed again)`); }
    return;
  }

  const end = Date.now(), part = { startedAt: new Date(start).toISOString(), finishedAt: new Date(end).toISOString(),
    wallMinutes: (end - start) / 60000, exitCode, cliVersion: cliVersions[run.agent.provider], ...(since ? { since } : {}) };
  const status = exitCode === 0 && !metrics.isError ? 'ok' : 'failed';
  const { result, id } = saveParts(run, prev.dir, r, parts, part, metrics, status);
  spent += metrics.costUsd ?? 0; done++; tell('done', run, id);
  console.log(`${status === 'ok' ? '✔' : '✘'} ${run.id}  resumed: ${part.wallMinutes.toFixed(1)}m more, ${result.wallMinutes.toFixed(1)}m in all  ` +
    `${fmtUsd(metrics.costUsd)}  out:${metrics.outputTokens ?? '?'} tok${id !== run.id ? `  → ${id}` : ''}`);
  await checkSaved(path.join(outDir, id), result);
  if (!args.broker) writeReport();
}

// A resumed run's new part (resumeOne), or a cut-off one read from its session (foldEnded), saved as the run's result
// after the parts before it: the figures added up, what the run was made with kept from its record so far (r) and,
// once it's OK, its folder named after its game. Returns the result and the folder's name now.
function saveParts(run, from, r, parts, part, metrics, status) {
  const work = path.join(outDir, from, 'work'), all = [...parts, part];
  // The earlier parts' figures are the old result's, so they add up even if their output is gone.
  const m = parts.length ? combineParts([r, metrics]) : { ...metrics };
  if (metrics.reply) fs.writeFileSync(path.join(outDir, from, 'reply.md'), metrics.reply);
  delete m.reply;
  if (!metrics.reply) m.replyChars = r.replyChars; // reply.md is still the earlier one
  const given = r.givenHtml ? new Map(Object.entries(r.givenHtml)) : null;
  const kept = Object.fromEntries(['parentId', 'parentStartedAt', 'expectsGame', 'givenHtml', 'isolated'].filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
  let planChars; try { if (r.stage) planChars = fs.readFileSync(path.join(work, 'PLAN.md'), 'utf8').length; } catch {}
  const measured = measureOutput(work, given), id = status === 'ok' ? withTitle(from, measured, run) : from, home = path.join(outDir, id);
  const result = { id, ...run.fields, model: r.model, cliVersion: r.cliVersion, promptVersion: r.promptVersion,
    variantHashes: r.variantHashes, ...(r.goalSkipped ? { goalSkipped: true } : {}), status, exitCode: part.exitCode,
    wallMinutes: all.reduce((s, p) => s + (p.wallMinutes ?? 0), 0), ...m, ...measured, ...kept, ...(planChars != null ? { planChars } : {}),
    ...exitInterview(home, !!r.stage, r.expectsGame), ...(r.stage ? plannerInterview(home) : {}),
    ...goalOutcome(home, { provider: run.agent.provider, sessionId: m.sessionId ?? r.sessionId }),
    startedAt: r.startedAt ?? part.startedAt, finishedAt: part.finishedAt, ...(r.timeZone ? { timeZone: r.timeZone } : {}), resumes: parts.length, parts: all };
  fs.writeFileSync(path.join(home, 'result.json'), JSON.stringify(result, null, 2));
  fs.rmSync(path.join(home, UNFINISHED), { force: true });
  stampGame(home, result, run.combo);
  finished().set(run.key, { r: result, dir: id });
  return { result, id };
}

// A cut-off run whose session ended on its own after its runner was gone (endedAlone: the dashboard's terminal was
// closed, say, and its agent kept working): its last part is read from the session's transcript (cutPart, with the
// tool calls, reply and outcome from sessionEnd) and saved after the parts before it, as if it had been resumed.
// Nothing is sent to the session, and its cost isn't this batch's. With a /goal, the goal check may never have
// passed: Claude Code ends the turn itself after the check blocks it 9 times (see goalOutcome).
function foldEnded(run, cut, { s, e }) {
  const { base, part } = cut.u, start = Date.parse(part.startedAt);
  run.id = cut.dir;
  const parts = base.parts ?? (base.finishedAt ? [{ startedAt: base.startedAt, finishedAt: base.finishedAt, wallMinutes: base.wallMinutes,
    exitCode: base.exitCode, cliVersion: base.cliVersion }] : []);
  const m = endedPart(cut, e, Infinity, s);
  const p = { startedAt: part.startedAt, finishedAt: new Date(e.at).toISOString(), wallMinutes: (e.at - start) / 60000, exitCode: null,
    cliVersion: part.cliVersion, endedAlone: true, ...(part.since ? { since: part.since } : {}) };
  const status = e.error ? 'failed' : 'ok', { result, id } = saveParts(run, cut.dir, base, parts, p, m, status);
  done++; tell('done', run, id);
  console.log(`${status === 'ok' ? '✔' : '✘'} ${cut.dir}  finished on its own after its runner was gone: ` +
    `${parts.length ? `${p.wallMinutes.toFixed(1)}m more, ${result.wallMinutes.toFixed(1)}m in all` : `${p.wallMinutes.toFixed(1)}m`}  ${fmtUsd(m.costUsd)}  out:${m.outputTokens ?? '?'} tok (from its session)${id !== cut.dir ? `  → ${id}` : ''}`);
  if (!args.broker) writeReport();
}
// A part that ended on its own after its runner was gone (foldEnded; --reparse measures it again), from its session:
// what cutPart reads, with the tool calls, reply and outcome its own output may stop short of (see sessionEnd).
function endedPart(cut, e, to = Infinity, s = cutSession(cut, to)) {
  const m = cutPart(cut, to, s), tools = { ...m.tools };
  for (const [k, n] of Object.entries(e.tools)) tools[k] = Math.max(tools[k] ?? 0, n);
  return Object.assign(m, { tools, toolCalls: total(tools), toolErrors: Math.max(m.toolErrors ?? 0, e.toolErrors),
    compactions: Math.max(m.compactions ?? 0, e.compactions), apiCalls: Math.max(m.apiCalls ?? 0, s.responses.size),
    isError: !!e.error, error: e.error ?? undefined, reply: e.reply, replyChars: e.reply.length });
}
// A run as the queue would have it, made from its record (for --fold-ended, outside a batch that has it).
function runFromRecord(r) {
  const agent = cfg.agents.find((a) => a.id === r.agent) ?? { id: r.agent, provider: r.provider, model: r.model }, pe = parseEffort(r.effort);
  const combo = Object.fromEntries(dimNames.map((d) => [d, cfg.dimensions[d].find((v) => v.id === r[d])]).filter(([, v]) => v));
  const fields = Object.fromEntries(['agent', 'provider', 'effort', 'ultracode', ...dimNames, 'rep', 'stage', 'chain'].filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
  return { key: runKey(r), id: r.id, agent, effort: pe.base, ultracode: pe.ultracode, combo, fields, when: new Date(r.startedAt ?? Date.now()) };
}
function foldAllEnded() {
  let n = 0;
  for (const cut of cutRuns().cut.values()) {
    const ended = endedAlone(cut);
    if (ended) { foldEnded(runFromRecord(cut.u.base), cut, ended); n++; }
  }
  console.log(n ? `Folded ${n} run(s) that finished on their own after they were cut off.` : 'No cut-off run has finished on its own.');
}

// The cost-state Claude Code saved in a session's transcript as its last part ended (see minusSince), or null. With
// `to` (ms), the last one before the transcript's entries from then on (a later part's).
function claudeCostState(file, to = Infinity) {
  let last = null;
  try {
    for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
      if (to < Infinity && Date.parse(l.match(/"timestamp":"([^"]+)"/)?.[1] ?? '') >= to) break;
      if (l.includes('"type":"cost-state"')) last = l;
    }
  } catch {}
  if (!last) return null;
  const keep = ['inputTokens', 'outputTokens', 'thinkingTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens', 'costUSD'];
  try {
    const c = JSON.parse(last);
    return { totalCostUSD: c.totalCostUSD ?? 0, totalAPIDuration: c.totalAPIDuration ?? 0, modelUsage: Object.fromEntries(Object.entries(c.modelUsage ?? {})
      .map(([id, u]) => [id, Object.fromEntries(keep.filter((k) => u[k] != null).map((k) => [k, u[k]]))])) };
  } catch { return null; }
}

// A running agent cut off by a quit or restart (stopAll with keep): a run that can carry on with its session keeps its
// folder, work, output and unfinished.json (now with when the part ended) for the next batch that has it, and says so.
// Returns false for one that can't (another CLI, or its session hadn't got going): the caller throws it away.
function cutOff(run, dir) {
  const u = readUnfinished(dir);
  if (!u?.part) return false;
  u.part.endedAt = new Date().toISOString(); u.runner = u.agent = null;
  writeUnfinished(dir, u);
  if (!canCarryOn(run, { u, dir: path.basename(dir) })) return false;
  tell('gone', run); console.log(`■ ${run.id} cut off: it carries on with its session when its batch runs again`);
  return true;
}

// A cut-off run's record so far, for resumeOne to carry on from: what it was made with (unfinished.json's base),
// the part cut off added to any parts before (see cutPart) and its session. Status interrupted; never saved as a result.
function cutRecord(cut) {
  const { base, part } = cut.u;
  if (!part) return base; // cut off, then ended mid-way when it carried on: as it was before that part
  const s = cutSession(cut), m = cutPart(cut, Infinity, s), start = Date.parse(part.startedAt);
  const p = { startedAt: part.startedAt, finishedAt: new Date(s.end).toISOString(), wallMinutes: (s.end - start) / 60000, exitCode: null,
    cliVersion: part.cliVersion, cutOff: true, ...(part.since ? { since: part.since } : {}) };
  const before = base.parts ?? (base.finishedAt ? [{ startedAt: base.startedAt, finishedAt: base.finishedAt, wallMinutes: base.wallMinutes,
    exitCode: base.exitCode, cliVersion: base.cliVersion }] : []);
  return { ...base, ...(before.length ? combineParts([base, m]) : m), status: 'interrupted', error: 'cut off', sessionId: s.sessionId,
    startedAt: base.startedAt ?? part.startedAt, finishedAt: p.finishedAt, wallMinutes: (base.wallMinutes ?? 0) + p.wallMinutes, parts: [...before, p] };
}
// What a cut-off part did. Its output so far has its tool calls, failed ones, compactions and plan limits, but never
// the session's totals (they come with the result line). Its tokens are its responses' in the transcript (see
// transcriptResponses); its cost is those at list price, which is what Claude Code reports too (costSource
// estimated), unless Claude Code saved the session's totals as it stopped (a cost-state newer than the part's since).
// to: when the part after it started, if there is one (--reparse), where this part's entries in the transcript end.
function cutPart(cut, to = Infinity, s = cutSession(cut, to)) {
  const { part } = cut.u, home = path.join(outDir, cut.dir), start = Date.parse(part.startedAt);
  let text = ''; try { text = fs.readFileSync(path.join(home, partFile(part.n, 'out')), 'utf8'); } catch {}
  const st = readStream(text), state = s.file ? claudeCostState(s.file, to) : null;
  let m;
  if (state && JSON.stringify(state) !== JSON.stringify(part.since ?? null)) {
    const j = minusSince({ modelUsage: state.modelUsage, total_cost_usd: state.totalCostUSD, duration_api_ms: state.totalAPIDuration }, part.since);
    m = { costUsd: j.total_cost_usd, costSource: 'reported', ...usageTotals(j), apiMinutes: j.duration_api_ms ? j.duration_api_ms / 60000 : null };
  } else {
    const models = {};
    for (const { model, usage: u } of s.responses.values()) {
      const read = u.cache_read_input_tokens ?? 0, write = u.cache_creation_input_tokens ?? 0;
      const use = modelUse((u.input_tokens ?? 0) + read + write, read, write, u.output_tokens ?? 0, null);
      addModel(models, model, { ...use, costUsd: apiPrice({ models: { [model]: use } }, 'claude', start).apiCostUsd });
    }
    const sum = (k) => Object.values(models).reduce((n, x) => n + x[k], 0), priced = apiPrice({ models }, 'claude', start);
    m = { costUsd: priced.apiCostUsd, costSource: priced.apiCostUsd != null ? 'estimated' : 'none', models,
      inputTokens: sum('uncachedInputTokens') + sum('cacheReadTokens') + sum('cacheWriteTokens'), cachedTokens: sum('cacheReadTokens'),
      cacheWriteTokens: sum('cacheWriteTokens'), outputTokens: sum('outputTokens'), reasoningTokens: null, ...(priced.unpricedModels ? { unpricedModels: priced.unpricedModels } : {}) };
  }
  Object.assign(m, { apiCalls: st.ids.size || s.responses.size, toolCalls: total(st.tools), tools: st.tools, toolErrors: st.toolErrors, compactions: st.compactions,
    plan: claudePlan(st.limits), isError: true, error: 'cut off', sessionId: s.sessionId, replyChars: 0 });
  return Object.assign(tokenTotals(m), apiPrice(m, 'claude', start));
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
  if (ms.some((x) => x.costSource === 'reported')) m.costSource = ms.some((x) => x.costSource === 'estimated') ? 'estimated' : 'reported';
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
// session logs (and the TODO count from the saved game, and exitInterview from its folder), leaving status,
// timing, other measurements and scores alone. A run whose session log was read before but is gone now keeps its figures.
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
    // A resumed run: each part from its own output, with what its session had used before (see resumeOne); a part
    // that was cut off as it was measured then (see cutPart).
    const parts = r.parts ?? [{ startedAt: r.startedAt, finishedAt: r.finishedAt }];
    // A part that ended on its own after its runner was gone, from its session too (see foldEnded).
    const cutAt = (p, i) => ({ u: { base: {}, part: { n: i, startedAt: p.startedAt, endedAt: p.finishedAt, since: p.since } }, dir: d });
    const toOf = (i) => Date.parse(parts[i + 1]?.startedAt ?? '') || Infinity;
    const ended = (p, i) => { const cut = cutAt(p, i), s = cutSession(cut, toOf(i)), e = s.file && sessionEnd(s.file, Date.parse(p.startedAt), false, toOf(i));
      return e ? endedPart(cut, e, toOf(i), s) : cutPart(cut, toOf(i), s); };
    let ms; try { ms = parts.map((p, i) => p.endedAlone ? ended(p, i) : p.cutOff ? cutPart(cutAt(p, i), toOf(i))
      : readMetrics(r.provider, fs.readFileSync(path.join(outDir, d, partFile(i, 'out')), 'utf8'), { model: r.model },
        { cwd: path.join(outDir, d, 'work'), start: Date.parse(p.startedAt), end: Date.parse(p.finishedAt), since: p.since })); } catch (e) { console.log(`· ${d}: ${e.message}`); continue; }
    const m = combineParts(ms);
    if (r.sessionLog === 'read' && m.sessionLog !== 'read') { console.log(`· ${d}: session log ${m.sessionLog ?? 'not found'} now; kept its figures`); continue; }
    const replies = ms.map((x) => String(x.reply ?? '').trim()), reply = replies.findLast(Boolean) ?? '', replyFile = path.join(outDir, d, 'reply.md');
    m.replyChars = reply.length;
    // A reply read now that wasn't then (a /goal turn Claude Code ended itself, see parseClaude) fills in reply.md, and
    // so does a resumed run's last reply where reply.md still holds an earlier part's (an error that part ended on,
    // say). A reply.md that's neither is left as it is.
    let had = ''; try { had = fs.readFileSync(replyFile, 'utf8').trim(); } catch {}
    if (reply && (!had || (had !== reply && replies.slice(0, -1).includes(had)))) fs.writeFileSync(replyFile, reply);
    for (const k of metricKeys) if (m[k] !== undefined) r[k] = m[k]; else delete r[k];
    if (r.status !== 'ok' && m.error) r.error = m.error; // e.g. Claude Code's usage limit, which was "exit code 1" before
    try { if (r.entry) r.todos = markers(unstamped(fs.readFileSync(path.join(outDir, r.entry), 'utf8'))); } catch {}
    const ei = exitInterview(path.join(outDir, d), !!r.stage, r.expectsGame).exitInterview;
    if (ei) r.exitInterview = ei; else delete r.exitInterview;
    if (r.stage) { delete r.plannerInterview; delete r.plannerAnswers; Object.assign(r, plannerInterview(path.join(outDir, d))); }
    const g = goalOutcome(path.join(outDir, d), r); // left as it was when its transcript isn't on this computer
    if (Object.keys(g).length) { for (const k of GOAL_KEYS) delete r[k]; Object.assign(r, g); }
    fs.writeFileSync(resFile, JSON.stringify(r, null, 2)); n++;
    if (isStamped(r)) stampGame(path.join(outDir, d), r); // the record in the game gets the new figures too
  }
  console.log(`Reparsed ${n} run(s).`);
}

// --check-games: the game check (checkGame) for every finished run that left a game and has had none yet, two at a
// time, whatever the config's gameCheck says.
async function checkAllGames() {
  cfg.gameCheck ||= true;
  const todo = [];
  for (const d of fs.existsSync(outDir) ? fs.readdirSync(outDir) : []) {
    const r = readResult(d);
    if (r?.id && r.delivered && r.entry && !r.gameCheck) todo.push([d, r]);
  }
  let n = 0;
  const one = async () => { for (let x; (x = todo.shift());) {
    const [d, r] = x; await checkSaved(path.join(outDir, d), r); n++;
    const g = r.gameCheck ?? {};
    console.log(`· ${d}: ${g.skipped ? `skipped (${g.skipped})` : g.error ? `couldn't check (${g.error})`
      : `${g.pageErrors} page error(s), ${g.consoleErrors} console error(s), ${g.failedRequests} failed request(s)`}`);
  } };
  await Promise.all([one(), one()]);
  console.log(`Checked ${n} game(s).`);
}

// --stamp: put the record into every finished run's game that delivered one (or refresh it).
function stampAll() {
  let n = 0;
  for (const d of fs.existsSync(outDir) ? fs.readdirSync(outDir) : []) {
    const r = readResult(d);
    if (!r?.id || !r.delivered) continue;
    stampGame(path.join(outDir, d), r); n++;
  }
  console.log(`Stamped ${n} game(s).`);
}

// --rename-variant dim:old[@hash]=new. Finished runs are matched by short name, so runs that used an earlier text of a
// variant (edited before the dashboard renamed a variant on edit) count as done for its text now. This gives them a
// name of their own: the runs whose text hashes as @hash, else those whose text isn't the config's (one text at a
// time). The name changes in result.json and in the record in the game; what they were sent stays as it was, and so
// does the folder: named without the date, it's the one a new run of the old name would get, so that run won't start.
function renameVariants(specs) {
  const all = (fs.existsSync(outDir) ? fs.readdirSync(outDir) : []).map((dir) => ({ dir, r: readResult(dir) })).filter((x) => x.r?.id);
  const hashOf = (d, id) => { const v = cfg.dimensions[d]?.find((x) => x.id === id); return v ? textHash(variantText(v).trim()) : null; };
  const moves = specs.map((s) => {
    const m = s.match(/^(\w+):([\w.-]+)(?:@([0-9a-f]{8}))?=([\w.-]+)$/);
    if (!m) throw new Error(`--rename-variant ${s}: write it dimension:old=new, or dimension:old@hash=new`);
    const [, d, from, hash, to] = m, now = hashOf(d, from);
    if (!cfg.dimensions[d]) throw new Error(`--rename-variant ${s}: the config has no dimension "${d}"`);
    if (!hash && !now) throw new Error(`--rename-variant ${s}: ${d} "${from}" isn't in the config, so say which text: dimension:old@hash=new`);
    const pick = all.filter(({ r }) => r[d] === from && r.variantHashes?.[d] && (hash ? r.variantHashes[d] === hash : r.variantHashes[d] !== now));
    const texts = [...new Set(pick.map(({ r }) => r.variantHashes[d]))];
    if (texts.length > 1) throw new Error(`--rename-variant ${s}: those runs used ${texts.length} texts (${texts.join(', ')}); move one at a time with dimension:old@hash=new`);
    const h = texts[0], clash = all.filter(({ r }) => r[d] === to && r.variantHashes?.[d] !== h).length;
    if (pick.length && hashOf(d, to) && hashOf(d, to) !== h) throw new Error(`--rename-variant ${s}: the config's ${d} "${to}" has other text`);
    if (pick.length && clash) throw new Error(`--rename-variant ${s}: ${clash} run(s) used ${d} "${to}" for other text`);
    return { d, from, to, h, pick };
  });
  for (const { d, from, to, h, pick } of moves) {
    console.log(`${d} "${from}" → "${to}": ${pick.length} run(s)${h ? ` (text ${h})` : ''}${args.dryRun ? ' would move' : ''}`);
    for (const { dir } of pick) console.log(`  ${dir}${!FN?.date && runs.some((x) => x.id === dir) ? `  ⚠ a new run of "${from}" would get this folder, so it won't start while this run is in it` : ''}`);
  }
  if (args.dryRun) return;
  for (const { d, from, to, pick } of moves) for (const { dir, r } of pick) {
    r[d] = to;
    fs.writeFileSync(path.join(outDir, dir, 'result.json'), JSON.stringify(r, null, 2));
    const file = r.entry && path.join(outDir, r.entry);
    let html = null; try { html = fs.readFileSync(file, 'utf8'); } catch {}
    const rec = html && readRecord(html);
    if (rec) fs.writeFileSync(file, stampHtml(html, renameInRecord(rec, d, from, to)));
  }
  if (moves.some((x) => x.pick.length)) writeReport();
}

// TODO / FIXME left in the game file (the prompt asks for none). Only these two: "not implemented"
// and "placeholder" also turn up in bundled libraries and HTML attributes.
const markers = (t) => (t.match(/\bTODO\b|\bFIXME\b/g) ?? []).length;

// The deliverable is the bundled .html in the work folder's root. Size is
// measured on that file (without the run's record, see stampGame); dev files are counted separately.
// gameSha256 is the agent's page as it left it, so a copy can be recognised once the record is in it.
function measureOutput(work, given = null) {
  let devFiles = 0, entry = null, fallback = null;
  try {
    // A later stage was given its parent's game: only a root .html it made or changed is its own.
    const now = given ? rootHtml(work) : null;
    const roots = fs.readdirSync(work).filter((f) => /\.html?$/i.test(f) && (!given || now.get(f) !== given.get(f)))
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
  const file = entry ?? (given ? null : fallback);
  let kb = null, loc = null, todos = null, gameSha256 = null;
  if (file) {
    const buf = fs.readFileSync(file), raw = buf.toString('utf8'), t = unstamped(raw);
    kb = Math.round(t.length / 1024); loc = t.split('\n').length; todos = markers(t);
    gameSha256 = crypto.createHash('sha256').update(t === raw ? buf : t).digest('hex'); // the bytes as they are, when unstamped
  }
  return { delivered: !!entry, kb, loc, files: devFiles, todos, gameSha256,
    entry: file ? path.relative(outDir, file).split(path.sep).join('/') : null };
}

// A second pass once a run has ended: its record goes into the game file itself, so a game passed around (or put on
// ai-hub) says what made it, what it took and what the agent said about it, and the run can be rebuilt from the game
// alone. Most of it can't be in the prompt: time, tokens and cost are only known at the end. The format, and the
// tools that read it back, are in run-record.mjs: an inert <script type="application/json" id="cc-matrix-run">
// block just before </body>, with the AI Hub's catalogue fields, result.json, the prompt and the exit interview.
// Stamping again replaces it when it changed (--reparse refreshes stamped games, --stamp stamps finished ones), and
// kb, loc, todos and gameSha256 are measured without it.
const isStamped = (r) => { try { return r.delivered && STAMP_RE.test(fs.readFileSync(path.join(outDir, r.entry), 'utf8')); } catch { return false; } };
function stampGame(dir, r, combo) {
  if (!r.delivered || !r.entry) return;
  const file = path.join(outDir, r.entry);
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
  let html; try { html = fs.readFileSync(file, 'utf8'); } catch { return; }
  // What only the run knew (its template, each variant's text as sent) is kept from the record already in the game
  // (schema 1 too) when it's stamped again without the run at hand (--stamp, --reparse).
  const old = upgrade(readRecord(html)), was = old?.prompt ?? {};
  let history = []; try { history = JSON.parse(fs.readFileSync(path.join(outDir, 'prompt-history.json'), 'utf8')); } catch {}
  const version = history.find((e) => e.hash === r.promptVersion);
  // Each section's variant as it was sent: the run's own, else the one in the record already there, else the config's
  // of that id. Each only if its text hashes as the run's did (variantHashes), so an edit made since never gets in:
  // null when it can't be told (prompt.text is exact either way).
  const sections = { ...was.sections };
  for (const d of dimNames) {
    if (r[d] == null) continue;
    const hash = r.variantHashes?.[d] ?? null, conf = cfg.dimensions[d].find((x) => x.id === r[d]);
    const tries = [() => combo?.[d] && variantText(combo[d]).trim(), () => was.sections?.[d]?.id === r[d] ? was.sections[d].text : null,
      () => hash && conf ? variantText(conf).trim() : null];
    let text = null;
    for (const t of tries) { let x = null; try { x = t(); } catch {} if (typeof x === 'string' && (!hash || textHash(x) === hash)) { text = x; break; } }
    sections[d] = { id: r[d], text, hash };
  }
  // The prompt as filled for this run: prompt.md, or for a stage run TASK.md (its prompt.md is the stage's text).
  const promptMd = read('prompt.md'), text = (r.stage ? read('work/TASK.md') : promptMd) ?? was.text ?? null;
  const prompt = { version: r.promptVersion ?? null, number: version?.v ?? was.number ?? null,
    savedAt: version?.at ?? was.savedAt ?? null, firstRanAt: version?.ranAt ?? was.firstRanAt ?? null,
    template: textHash(template ?? '') === r.promptVersion ? template : version?.text ?? was.template ?? null,
    text, ...(r.stage ? { stageText: promptMd ?? was.stageText ?? null } : {}), goal: read('goal.md')?.trim() || null, sections };
  // The exit interview, its feedback answers paired with the questions they answer.
  const questions = Object.fromEntries(Object.entries(sections).map(([d, s]) => [d, questionsOf(s.text)]).filter(([, q]) => q.length));
  const exit = read(path.join('work', EXIT_FILE));
  const interview = { file: exit == null ? null : EXIT_FILE, ...(exit == null ? {} : parseInterview(exit, questions)), reply: read('reply.md') };
  // A stage run's earlier steps (the plan it was built from …), first first: from their result.json, else, when one
  // has gone since, as the record already in the game has them.
  let earlier = [];
  if (r.stage) {
    for (let id = r.parentId, seen = new Set(); id && !seen.has(id);) { seen.add(id); const p = readResult(id); if (!p) break; earlier.unshift(stepOf(p)); id = p.parentId; }
    const kept = old?.stages?.steps?.slice(0, -1) ?? [];
    if (kept.length > earlier.length) earlier = kept;
  }
  const page = unstamped(html), rec = makeRecord({ result: r, lab: labOf({ model: r.model, provider: r.provider }),
    cli: CLIS[r.provider] ?? r.provider, page, prompt, interview, earlier });
  // A game whose record would only get a new stampedAt is left as it is, so stamping again (--reparse, --stamp)
  // rewrites only the games whose records changed.
  const stamped = readRecord(html), same = (a) => JSON.stringify({ ...a, stampedAt: null });
  if (stamped && same(stamped) === same(rec)) return;
  fs.writeFileSync(file, stampHtml(page, rec));
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
  skipped++; skippedRuns.push(run); tell('done', run, prev.dir);
  console.log(`· skip ${run.id} (already ${prev.r.status}${prev.dir !== run.id ? ` as ${prev.dir}` : ''})`);
}

// Starts runs while there's room: fewer than --concurrency running, the run's CLI under --per-cli,
// not paused, and the budget not spent. Each can change mid-batch (see control), so it's checked
// again whenever a run ends or a setting changes. Lowering a limit never ends a running agent by
// itself: no new one starts until there's room again. Once the budget is spent the ones already
// going finish, since what they've spent so far would be thrown away otherwise.
// A run in a later stage starts once the run it continues from has finished OK (in this batch or before). One
// whose parent failed, was left out or was stopped can't run in this batch: it's left out too (and runs next time).
// Runs start at least startGap seconds apart (the config's, default 3; 0 = together), so no two runs of a batch get
// the same start time, which names their folders and games (stampOf).
const START_GAP_MS = Math.max(0, +(cfg.startGap ?? 3) || 0) * 1000;
const parentOk = (r) => !r.parentKey || finished().get(r.parentKey)?.r.status === 'ok';
const coming = (key) => elsewhere.has(key) || pending.some((r) => r.key === key) || [...live.values()].some((c) => c.run.key === key);
function leaveOutOrphans() {
  for (let again = true; again;) {
    again = false;
    for (const r of [...pending]) {
      if (!r.parentKey || parentOk(r) || coming(r.parentKey)) continue;
      pending.splice(pending.indexOf(r), 1); again = true;
      if (isDone(r)) { skip(r); continue; }
      skipped++; tell('gone', r); console.log(`· skip ${r.id} (the run it continues from didn't finish OK)`);
    }
  }
}

async function pool() {
  pending = interleave(queue);
  const busy = {}, jobs = new Set();
  let lastStart = -Infinity, gapTimer = null;
  for (;;) {
    while (!stopping) {
      if (args.broker) { brokered(busy, jobs); break; }
      if (!overBudget && spent >= args.budget) {
        overBudget = true;
        console.log(`■ Budget of $${args.budget} reached (spent ${fmtUsd(spent)}): no new runs start; ${live.size} still running will finish.`);
      }
      if (paused || overBudget || jobs.size >= Math.max(1, args.concurrency)) break;
      leaveOutOrphans();
      const i = pending.findIndex((r) => (busy[r.agent.provider] ?? 0) < args.perCli && parentOk(r));
      if (i < 0) break; // every CLI left is at its limit, or what's left waits for its parent
      if (isDone(pending[i])) { skip(pending.splice(i, 1)[0]); continue; }
      // Too soon after the last start: check again once the gap is up (a timer can fire a little early, so it's re-checked).
      const wait = lastStart + START_GAP_MS - Date.now();
      if (wait > 0) { gapTimer ??= setTimeout(() => { gapTimer = null; wake(); }, wait); break; }
      const [run] = pending.splice(i, 1), p = run.agent.provider;
      lastStart = Date.now(); busy[p] = (busy[p] ?? 0) + 1;
      const job = runOne(run).catch((e) => { done++; console.log(`✘ ${run.id}  ${e.message}`); })
        .finally(() => { busy[p]--; jobs.delete(job); wake(); });
      jobs.add(job);
    }
    sayState();
    // Done once nothing runs and nothing more will start: the queue is empty, the batch was stopped
    // or the budget is spent. A paused batch waits to be resumed (or stopped).
    if (!jobs.size && (stopping || overBudget || !pending.length)) { clearTimeout(gapTimer); return; }
    await new Promise((r) => { wakeUp = r; });
  }
}

// --broker: one of several batches running at once (the dashboard's queue). The dashboard keeps Parallel runs, Max per
// CLI, the budget, the start gap and Pause for all of them, so a run starts only when it says so. The runner offers
// the runs that could start now ("@ready [[key, cli], …]", in its order, up to READY_MAX per CLI), starts the ones it's
// granted ({ grant: [keys] }: "@took key", or "@unused key" for one that can't start any more) and says when a slot
// is free again ("@freed key"). It also says which runs it will do ("@keys { keys, left }", once), when one has its
// result ("@done { key, dir }", so a batch waiting on it, a build on another batch's plan, can carry on) and when it
// won't run one after all ("@gone key"). Each carries JSON; the lines are the dashboard's and stay out of the log.
const READY_MAX = 64;
const grants = [];
let lastReady = '';
const tell = (what, run, dir) => { if (args.broker) console.log(`@${what} ${JSON.stringify(dir ? { key: run.key, dir } : run.key)}`); };
function brokered(busy, jobs) {
  leaveOutOrphans();
  for (const key of grants.splice(0)) {
    const run = pending.find((r) => r.key === key);
    if (run && isDone(run)) { pending.splice(pending.indexOf(run), 1); skip(run); }
    if (!run || !pending.includes(run) || !parentOk(run)) { console.log(`@unused ${JSON.stringify(key)}`); continue; }
    pending.splice(pending.indexOf(run), 1);
    const p = run.agent.provider;
    busy[p] = (busy[p] ?? 0) + 1; console.log(`@took ${JSON.stringify(key)}`);
    const job = runOne(run).catch((e) => { done++; console.log(`✘ ${run.id}  ${e.message}`); })
      .finally(() => { busy[p]--; jobs.delete(job); console.log(`@freed ${JSON.stringify(key)}`); wake(); });
    jobs.add(job);
  }
  const ready = [], per = {}, open = new Set(pending.map((r) => r.agent.provider)); // CLIs still short of READY_MAX
  for (const r of [...pending]) {
    const p = r.agent.provider;
    if (!open.has(p)) continue;
    if (!parentOk(r)) continue;
    if (isDone(r)) { pending.splice(pending.indexOf(r), 1); skip(r); continue; }
    ready.push([r.key, p]);
    if ((per[p] = (per[p] ?? 0) + 1) >= READY_MAX && (open.delete(p), !open.size)) break;
  }
  const s = JSON.stringify(ready);
  if (s !== lastReady) { lastReady = s; console.log('@ready ' + s); }
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
    for (const r of out) tell('gone', r);
    console.log(`⚙ ${CLIS[p] ?? p}: ${out.filter((r) => !isDone(r)).length} queued run(s) left out of this batch (they run next time)`);
  }
  // --broker: runs to start now; the rest of this batch left out (the budget is spent, or it was taken out of the
  // queue); a stop (with keep, the dashboard is quitting or restarting: the running ones are cut off, see cutOff); and
  // runs another batch had that finished there (one here may continue from it) or won't run.
  if (msg.grant) grants.push(...msg.grant);
  if (msg.end && pending.length) {
    const out = pending.splice(0);
    for (const r of out) tell('gone', r);
    console.log(`■ ${out.filter((r) => !isDone(r)).length} queued run(s) left out of this batch (they run next time)`);
  }
  if (msg.stop) stopAll(msg.keep ? 'the dashboard is closing' : 'stop requested', !!msg.keep);
  for (const { key, dir } of msg.finished ?? []) {
    const r = readResult(dir);
    if (r?.id && runKey(r) === key) finished().set(key, { r, dir });
    elsewhere.delete(key);
  }
  for (const key of msg.gone ?? []) elsewhere.delete(key);
  if (!msg.grant && !msg.finished && !msg.gone) sayState(true); // the dashboard waits for this to answer the change
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
if (args.checkGames) { await checkAllGames(); process.exit(0); }
if (args.stamp) { stampAll(); process.exit(0); }
if (args.foldEnded) { foldAllEnded(); writeReport(); process.exit(0); }
if (args.smoke) { await smoke(); process.exit(0); }

fs.mkdirSync(outDir, { recursive: true });
if (!args.broker) fs.rmSync(stopFile, { force: true }); // with --broker the dashboard clears it: other batches may be stopping
// A CLI that isn't installed would fail every one of its runs; skip them instead (they run next time).
for (const p of missingClis()) {
  const n = queue.filter((r) => r.agent.provider === p).length;
  console.log(`⚠ ${CLIS[p] ?? p}: command "${binOf(p)}" not found, so its ${n} run(s) are skipped. Install it or set its command in CLIs → CLI commands and flags.`);
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
console.log(`${queue.length} runs${already ? ` (${already} already done)` : ''} → ${outDir}  (` + (args.broker ? 'sharing the limits of the batches running now'
  : `concurrency ${args.concurrency}${args.perCli < Infinity ? `, at most ${args.perCli} per CLI` : ''}${START_GAP_MS && queue.length - already > 1 ? `, starting ${START_GAP_MS / 1000} s apart` : ''}`) + ')');
if (stageMode) { const n = {}; for (const r of queue) n[r.stage.id] = (n[r.stage.id] ?? 0) + 1;
  console.log(`In stages: ${STAGES.filter((s) => n[s.id]).map((s) => `${s.id} ${n[s.id]}`).join(', ')}. A run starts once the one it continues from has finished OK.`); }
const endedNow = queue.filter((r) => !isDone(r) && endedAlone(cutOf(r))).length;
const resuming = queue.filter((r) => !cutOf(r) && canResume(r)).length, carrying = queue.filter((r) => !isDone(r) && !endedAlone(cutOf(r)) && canCarryOn(r, cutOf(r))).length;
if (resuming) console.log(`Of those, ${resuming} failed partway and resume their session where it stopped (Resume failed).`);
if (carrying) console.log(`Of those, ${carrying === 1 ? '1 was cut off mid-way and carries on with its session where it stopped'
  : `${carrying} were cut off mid-way and carry on with their sessions where they stopped`}.`);
if (endedNow) console.log(`Of those, ${endedNow === 1 ? '1 was cut off and then finished on its own: its result comes from its session, and nothing is sent to it'
  : `${endedNow} were cut off and then finished on their own: their results come from their sessions, and nothing is sent to them`}.`);
if (queue.length > already) try { recordPromptVersion(); } catch (e) { console.log(`⚠ Prompt history not updated: ${e.message}`); }
if (args.control) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    const lines = (buf + d).split('\n'); buf = lines.pop();
    for (const l of lines) if (l.trim()) try { control(JSON.parse(l)); } catch (e) { console.log(`⚠ Setting change ignored: ${e.message}`); }
  });
  // With --broker, the dashboard gone (it crashed or was killed) leaves nobody to grant runs or read this: its running
  // agents are cut off, so the next batch carries them on, and the runner ends.
  if (args.broker) {
    for (const s of [process.stdout, process.stderr]) s.on('error', () => {}); // what it prints goes nowhere now
    process.stdin.on('end', () => stopAll('the dashboard is gone', true));
  }
}
// What this batch will do, for the dashboard: a batch queued after it leaves these out, and they hold its slots. Said
// once the prompt's version is recorded, since the next batch starts on it (see startWaiting in dashboard.mjs).
if (args.broker) {
  const todo = queue.filter((r) => !isDone(r)), left = {};
  for (const r of todo) left[r.agent.provider] = (left[r.agent.provider] ?? 0) + 1;
  console.log('@keys ' + JSON.stringify({ keys: todo.map((r) => r.key), left }));
}
await pool();
if (args.control) process.stdin.destroy(); // or it keeps the runner alive
clearInterval(stopPoll);
if (!args.broker) { fs.rmSync(stopFile, { force: true }); writeReport(); }
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
  for (const r of rows) if (r.chain) r.path = r.chain.map((c) => `${c.stage}:${c.agent}-${c.effort}`).join(' > ');
  const cols = ['id', 'agent', 'provider', 'model', 'effort', 'ultracode', 'stage', 'path', 'parentId', ...dims, 'cliVersion', 'promptVersion', 'status', 'wallMinutes', 'apiMinutes', 'costUsd', 'costSource', 'apiCostUsd',
    'inputTokens', 'uncachedInputTokens', 'cachedTokens', 'cacheWriteTokens', 'outputTokens', 'reasoningTokens', 'totalTokens', 'turns', 'rounds', 'subagents',
    'apiCalls', 'toolCalls', 'toolErrors', 'compactions',
    'delivered', 'kb', 'loc', 'files', 'todos', 'replyChars', 'exitInterview', 'plannerInterview', 'goalMet', 'goalChecks', 'goalForced', 'score', 'notes', 'error', 'entry', 'startedAt', 'finishedAt', 'timeZone'];
  const cell = (v) => v == null ? '' : typeof v === 'number' ? +v.toFixed(4)
    : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
  fs.writeFileSync(path.join(outDir, 'results.csv'),
    [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n');

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const href = (p) => esc(String(p).split('/').map(encodeURIComponent).join('/')); // a # ? or % in a game's title would break the link
  const show = ['agent', 'effort', 'stage', ...dims, 'status', 'goalMet', 'delivered', 'wallMinutes', 'costUsd', 'apiCostUsd', 'outputTokens', 'kb', 'score'];
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
