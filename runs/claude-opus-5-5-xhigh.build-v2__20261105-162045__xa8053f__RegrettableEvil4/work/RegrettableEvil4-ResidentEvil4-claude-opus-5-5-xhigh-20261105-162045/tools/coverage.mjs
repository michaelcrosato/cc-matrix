// Which of the game's functions no test ever runs, in Node or in a browser, across every suite.
//   node tools/coverage.mjs            run everything, then report
//   node tools/coverage.mjs --report   report on the last run
// A function nested in one that never ran isn't listed until its parent is. A name reused in one file counts as
// never run if any instance of it might be, so this can only over-report.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(DEV, '.scratch', 'coverage');
const NODE = join(ROOT, 'node'); const BROWSER = join(ROOT, 'browser');
// esbuild renames clashes (step2) and V8 names some methods by their path (a.b.c): compare the last part, undecorated.
const bare = (name) => (name.split('.').pop() ?? '').replace(/\d+$/, '');

spawnSync('node', ['tools/build.mjs'], { cwd: DEV, stdio: 'ignore' });
const bundle = readFileSync(join(DEV, 'dist/bundle.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const marks = [...bundle.matchAll(/^\/\/ (src\/[^\n]+)$/gm)].map((m) => [m.index, m[1]]);
const moduleAt = (offset) => { let lo = 0; let hi = marks.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (marks[mid][0] <= offset) lo = mid; else hi = mid - 1; } return marks[lo][1]; };

if (!process.argv.includes('--report')) {
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(NODE, { recursive: true }); mkdirSync(BROWSER, { recursive: true });
  const n = spawnSync('node', ['tools/test.mjs', '--fast'], { cwd: DEV, env: { ...process.env, NODE_V8_COVERAGE: NODE }, encoding: 'utf8' });
  console.log(`node suites: ${(n.stdout ?? '').trim().split('\n').pop()}`);
  for (const f of readdirSync(join(DEV, 'tests/browser')).filter((x) => x.endsWith('.py') && !x.startsWith('_')).sort()) {
    const r = spawnSync('python3', ['-u', join('tests/browser', f)], { cwd: DEV, env: { ...process.env, G_COV_DIR: BROWSER, G_COV_START: String(marks[0][0]) }, encoding: 'utf8' });
    const fails = (r.stdout ?? '').split('\n').filter((l) => l.startsWith('@@FAIL'));
    console.log(`${f}: ${(r.stdout ?? '').split('\n').filter((l) => l.startsWith('@@COUNT')).pop() ?? 'no count'} ${fails.slice(0, 2).join(' ').slice(0, 200)}`);
  }
}

// Node: never-run functions, by file and name.
const nodeSeen = new Map();
for (const f of readdirSync(NODE)) {
  let j; try { j = JSON.parse(readFileSync(join(NODE, f), 'utf8')); } catch { continue; }
  for (const r of j.result) {
    if (!r.url.startsWith('file://')) continue;
    const path = decodeURIComponent(r.url.replace('file://', ''));
    if (!path.startsWith(join(DEV, 'src/'))) continue;
    const mod = path.slice(DEV.length + 1);
    const m = nodeSeen.get(mod) ?? new Map();
    for (const fn of r.functions) {
      const key = fn.ranges[0].startOffset;
      const e = m.get(key) ?? { name: fn.functionName, count: 0, start: key };
      e.count += fn.ranges[0].count;
      m.set(key, e);
    }
    nodeSeen.set(mod, m);
  }
}
// Browser: per file and name, did every instance run?
const browserSeen = new Map();
for (const f of readdirSync(BROWSER)) {
  for (const [start, end, count, name] of JSON.parse(readFileSync(join(BROWSER, f), 'utf8'))) {
    const key = `${start}:${end}`;
    const e = browserSeen.get(key) ?? { start, name, count: 0 };
    e.count += count;
    browserSeen.set(key, e);
  }
}
const coldInBrowser = new Set(); const hotInBrowser = new Set();
for (const e of browserSeen.values()) {
  if (!e.name) continue;
  (e.count > 0 ? hotInBrowser : coldInBrowser).add(`${moduleAt(e.start)}|${bare(e.name)}`);
}
let total = 0; let coldNode = 0; const never = [];
for (const [mod, m] of [...nodeSeen].sort()) {
  const src = readFileSync(join(DEV, mod), 'utf8');
  const line = (o) => src.slice(0, o).split('\n').length;
  for (const e of m.values()) {
    if (!e.name) continue;
    total++;
    if (e.count > 0) continue;
    coldNode++;
    const key = `${mod}|${bare(e.name)}`;
    if (hotInBrowser.has(key) && !coldInBrowser.has(key)) continue;
    never.push(`${mod}:${line(e.start)} ${e.name}${hotInBrowser.has(key) ? ' (another of this name ran)' : ''}`);
  }
}
console.log(`named functions ${total}; not run in Node ${coldNode}; not run anywhere (at most) ${never.length}`);
for (const n of never) console.log(`  ${n}`);
