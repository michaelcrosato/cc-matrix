// THE test command. Prints only failures, then one line with the count. Exit code 1 on any failure.
//   node tests/run.mjs            the headless suites (sim, the whole-game playthrough, hub encoding, build rules)
//   node tests/run.mjs --browser  also opens the single HTML in Chromium: smoke, screen flow, phone (touch-only) check
//   node tests/run.mjs --hub      also runs the AI Hub harness: 2 and 4 players, a lossy network, a host leaving, a server
import { readFileSync, readdirSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { run as simSuite } from './sim.test.mjs';
import { run as hubSuite } from './hub.test.mjs';
import { run as playSuite } from './playthrough.test.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const work = resolve(root, '..');
const BASE = 'SublimeCrisis3-TimeCrisis3-claude-haiku-5-5-medium-20261103-183312';
let passed = 0, failed = 0;
const check = (what, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log('FAIL ' + what + (detail ? ': ' + detail : ''));
};

// Build first, so the suites run on the code as it is now.
execFileSync(process.execPath, [join(root, 'tools', 'build.mjs')], { stdio: 'pipe' });

simSuite(check);
hubSuite(check);
playSuite(check);

// Build rules: the sim never reads the clock or Math.random; prompts never name a key (the labels come from input).
{
  const simFiles = ['00-core.js', '01-math.js', '02-weapons.js', '03-enemies.js', '04-sim.js', '05-sim-enemies.js', '06-sim-boss.js', '07-world.js', '10-stages.js'];
  const code = (f) => readFileSync(join(root, 'src', f), 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  for (const f of simFiles) {
    const src = code(f);
    check(`${f} uses no Math.random or Date.now`, !/Math\.random|Date\.now|performance\.now/.test(src), f);
  }
  const keyRe = /'(Key[A-Z]|Digit[0-9]|Space|Mouse[0-2]|Pad[0-9]+|Shift(Left|Right))'/;
  for (const f of readdirSync(join(root, 'src'))) {
    if (!f.endsWith('.js') || ['40-input.js'].includes(f)) continue;
    const src = code(f);
    check(`${f} names no key or button code (prompts come from input.label)`, !keyRe.test(src.replace(/'(Key|Digit)[^']*' \+.*/g, '')), f);
  }
  const eng = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
  check('engine patch 1: PlayStation glyphs are the default', /value: 'playstation'/.test(eng) && /this\.glyphs = 'playstation'/.test(eng), '');
}

// The deliverables: the single HTML and the exit interview, in the work folder root, and the interview's shape.
{
  const html = resolve(work, BASE + '.html');
  check('the single HTML exists in the work folder root', existsSync(html), html);
  if (existsSync(html)) {
    const h = readFileSync(html, 'utf8');
    check('the HTML has no external script or stylesheet', !/<script[^>]+src=/i.test(h) && !/<link[^>]+href=/i.test(h), '');
    check('the HTML inlines the engine and the AI Hub client', h.includes('My3D2dge') && h.includes('AIHub'), '');
  }
  const ex = resolve(work, 'exit-interview.json');
  check('exit-interview.json exists in the work folder root', existsSync(ex), ex);
  if (existsSync(ex)) {
    let j = null;
    try { j = JSON.parse(readFileSync(ex, 'utf8')); } catch (e) { check('exit-interview.json parses', false, e.message); }
    if (j) {
      const sec = ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'];
      for (const k of sec) check(`exit-interview.json has ${k}`, j[k] !== undefined, '');
      const empty = (v) => v === '' || v === undefined || v === null || (Array.isArray(v) && v.length === 0);
      const si = j.sourceInformation || {};
      for (const k of ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']) {
        check(`exit-interview sourceInformation.${k} is answered`, !empty(si[k]), '');
      }
      check('testingFeedback answers all four questions', (j.testingFeedback || []).length === 4 && j.testingFeedback.every(a => !empty(a)), '');
      check('engineFeedback answers all six questions', (j.engineFeedback || []).length === 6 && j.engineFeedback.every(a => !empty(a)), '');
      check('promptFeedback answers all four questions', (j.promptFeedback || []).length === 4 && j.promptFeedback.every(a => !empty(a)), '');
      const ai = j.aiHub || {};
      for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls']) check(`aiHub.${k} is set`, ai[k] !== undefined, '');
      check('aiHub.tags has 3 to 6 tags', Array.isArray(ai.tags) && ai.tags.length >= 3 && ai.tags.length <= 6, '');
    }
  }
}

// Browser checks: each is a script that exits 0 when it passes.
const runTool = (name, args = []) => {
  try {
    execFileSync(process.execPath, [join(root, 'tools', name), ...args], { stdio: 'pipe', env: process.env, timeout: 280000 });
    passed++;
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ` + String(e.stdout || e.message).split('\n').filter(Boolean).slice(0, 6).join(' | '));
  }
};
if (process.argv.includes('--browser')) {
  runTool('check.mjs');
  runTool('flow.mjs');
  runTool('touchcheck.mjs');
  runTool('overlaycheck.mjs');
}

// The AI Hub harness: the game copied next to harness.html in hubtest/, served on an OS-picked loopback port by a
// server this run starts, and stopped by its own PID when the checks are done.
if (process.argv.includes('--hub')) {
  const hubDir = join(root, 'hubtest');
  const cache = '/home/micha/.cache/tc3-haiku-20261103/hub/lib/hub';
  mkdirSync(hubDir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) if (existsSync(join(cache, f))) copyFileSync(join(cache, f), join(hubDir, f));
  copyFileSync(join(work, BASE + '.html'), join(hubDir, 'GAME.html'));
  const child = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: hubDir, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const port = await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('the server did not report a port')), 8000);
      child.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) { clearTimeout(t); res(m[1]); } });
      child.on('error', e => { clearTimeout(t); rej(e); });
    });
    const scenarios = [['2'], ['4', '&latency=150&jitter=50&loss=5'], ['2', '&scenario=host-leave'], ['2', '&scenario=server']];
    for (const [n, extra] of scenarios) {
      const args = [join(root, 'tools', 'hubcheck.mjs'), port, n, ...(extra ? [extra] : [])];
      try {
        const out = execFileSync(process.execPath, args, { stdio: 'pipe', timeout: 290000, env: process.env }).toString();
        const j = JSON.parse(out.slice(0, out.lastIndexOf('}') + 1));
        if (j.pass) passed++; else { failed++; console.log('FAIL hub harness ' + n + ' players' + (extra ? ' ' + extra : '') + ': ' + j.checks.filter(c => !c.pass).map(c => c.name + ' (' + c.detail + ')').join('; ')); }
      } catch (e) {
        failed++;
        console.log('FAIL hub harness ' + n + ' players' + (extra ? ' ' + extra : '') + ': ' + String(e.stdout || e.message).slice(0, 300));
      }
    }
  } catch (e) {
    failed++;
    console.log('FAIL hub harness: ' + e.message);
  } finally {
    child.kill();
  }
}

console.log(`${passed + failed} checks: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
