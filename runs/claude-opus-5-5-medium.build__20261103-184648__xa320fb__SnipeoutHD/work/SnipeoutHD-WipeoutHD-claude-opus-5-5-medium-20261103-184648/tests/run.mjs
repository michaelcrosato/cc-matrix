// THE one command: node tests/run.mjs [suite ...] [--node]. Runs the Node suites, then the browser and hub suites;
// prints only failures and one final line: "N passed, M failed (node a, browser b, hub c) in S s"
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url).pathname, args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--')), nodeOnly = args.includes('--node');
const t0 = Date.now(), tally = { node: [0, 0], browser: [0, 0], hub: [0, 0] };
const suites = [];
for (const f of readdirSync(root + 'tests/node').filter(f => f.endsWith('.test.mjs')).sort()) suites.push(['node', 'tests/node/' + f]);
if (!nodeOnly) { for (const f of readdirSync(root + 'tests/browser').filter(f => f.endsWith('.test.mjs')).sort()) suites.push(['browser', 'tests/browser/' + f]); suites.push(['hub', 'tests/hub/hub.test.mjs']); }
const pick = suites.filter(([, f]) => !only.length || only.some(o => f.includes(o)));
const env = Object.assign({}, process.env, { TMPDIR: root + '.tmp' });
const runOne = ([kind, f]) => new Promise(res => {
  const p = spawn(process.execPath, [root + f], { cwd: root, env }); let out = '';
  p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
  p.on('close', code => {
    const m = /RESULT (\d+) (\d+)/.exec(out), name = f.split('/').pop().replace('.test.mjs', '');
    for (const line of out.split('\n')) if (line.startsWith('FAIL ')) console.log(name + ' › ' + line.slice(5));
    if (!m) { console.log(name + ' › crashed (exit ' + code + '): ' + out.split('\n').filter(l => /Error|error/.test(l)).slice(0, 3).join(' | ')); tally[kind][1]++; }
    else { tally[kind][0] += +m[1]; tally[kind][1] += +m[2]; }
    res();
  });
});
// node suites in parallel (4 at a time), then browser and hub one by one
const nodeS = pick.filter(s => s[0] === 'node'), rest = pick.filter(s => s[0] !== 'node');
await Promise.all(Array.from({ length: 4 }, async () => { while (nodeS.length) await runOne(nodeS.shift()); }));
for (const s of rest) await runOne(s);
const P = Object.values(tally).reduce((a, b) => a + b[0], 0), F = Object.values(tally).reduce((a, b) => a + b[1], 0);
console.log(`${P} passed, ${F} failed (node ${tally.node[0] + tally.node[1]}, browser ${tally.browser[0] + tally.browser[1]}, hub ${tally.hub[0] + tally.hub[1]}) in ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(F ? 1 : 0);
