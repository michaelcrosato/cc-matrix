#!/usr/bin/env node
// check-environment.mjs — what this computer has, for the agents that run on it. Writes environments/<computer>.md,
// which a prompt or a stage's text can include with {{machine}} (see run-matrix.mjs). The part between the "checked"
// markers is found out and replaced each time this runs, with the date and time; the rest is written by hand (what no
// script can tell, like there being no controller to hold) and kept as it is. One file per computer, named after it,
// so the computers sharing this repo each keep their own. Run it again after installing or updating anything an agent
// might use, or when the file is old. No dependencies; Node 18+.
//
//   node check-environment.mjs                 check everything, starting each browser once (about 15 s)
//   node check-environment.mjs --quick         without starting the browsers
//   node check-environment.mjs --dir <folder>  write there instead of environments/ (the tests)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = { quick: false, dir: path.join(HERE, 'environments'), config: path.join(HERE, 'matrix.config.json') };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--quick') args.quick = true;
  else if (a === '--dir') args.dir = path.resolve(process.argv[++i]);
  else if (a === '--config') args.config = path.resolve(process.argv[++i]);
  else { console.error(`Unknown option ${a}`); process.exit(1); }
}
export const machineFile = (dir, host = os.hostname()) => path.join(dir, `${host.replace(/[^\w.-]/g, '-')}.md`);
const BEGIN = '<!-- checked: written by node check-environment.mjs, replaced each time it runs -->', END = '<!-- /checked -->';

// A command's output (stdout and stderr, where some tools print their version), or only stdout; null if it won't run.
const run = (cmd, argv, timeout = 8000, stdoutOnly = false) => {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', timeout, env: process.env });
  return r.error ? null : stdoutOnly ? r.stdout ?? '' : `${r.stdout ?? ''}${r.stderr ?? ''}`;
};
const onPath = (cmd) => (process.env.PATH || '').split(path.delimiter).some((d) => d && fs.existsSync(path.join(d, cmd)));
const versionOf = (out) => out?.match(/\d+\.\d+(?:\.\d+)?/)?.[0] ?? out?.match(/version "?(\d+)/i)?.[1] ?? out?.match(/\b(\d+) \d{4}-\d\d-\d\d/)?.[1] ?? null;
const gb = (bytes) => `${Math.round(bytes / 2 ** 30)} GB`, gb1 = (bytes) => `${(bytes / 2 ** 30).toFixed(1)} GB`;
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

// The computer: its name, processor, memory and operating system (Windows' WSL is said so: it shapes what works).
function computer() {
  const cpus = os.cpus(), swap = +(read('/proc/meminfo')?.match(/SwapTotal:\s+(\d+) kB/)?.[1] ?? 0) * 1024;
  const rel = read('/etc/os-release'), name = rel?.match(/^PRETTY_NAME="?([^"\n]+)"?/m)?.[1];
  const wsl = /microsoft/i.test(read('/proc/version') ?? '') ? ' on WSL2' : '';
  const system = name ? `${name}${wsl} (${os.type()} ${os.release()})` : `${os.type()} ${os.release()}`;
  return `${os.hostname()}: ${cpus[0]?.model?.replace(/\s+/g, ' ').trim() ?? 'unknown processor'}, ${cpus.length} cores, ${gb(os.totalmem())} RAM`
    + `${swap ? `, ${gb(swap)} swap` : ''}. ${system}.`;
}
// Space: the home folder's disk, and /tmp, which on Linux is often memory (tmpfs) shared by everything running.
function space() {
  const free = (p) => { try { const s = fs.statfsSync(p); return { total: s.blocks * s.bsize, free: s.bavail * s.bsize }; } catch { return null; } };
  const home = free(os.homedir()), tmp = free(os.tmpdir()), inMemory = (read('/proc/mounts') ?? '').split('\n').some((l) => / \/tmp tmpfs /.test(l));
  return [home ? `${gb(home.free)} free in the home folder` : null,
    tmp ? `${os.tmpdir()}: ${gb1(tmp.total)}${inMemory ? ', in memory (tmpfs)' : ''}, ${gb1(tmp.free)} free when checked` : null].filter(Boolean).join('. ') + '.';
}
// A display: runs are isolated by default (the config's isolate), and an isolated run has DISPLAY unset.
function display() {
  let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(args.config, 'utf8')); } catch {}
  if (cfg.isolate !== false) return 'none for runs (they run with DISPLAY unset), so a headed browser needs xvfb-run' + (onPath('xvfb-run') ? '' : ', which isn\'t installed');
  return process.env.DISPLAY ? `yes (DISPLAY=${process.env.DISPLAY})` : 'none';
}

// The tools worth knowing about, by command, with their versions: what's on PATH and what isn't.
const TOOLS = [['node', ['--version']], ['npm', ['--version']], ['python3', ['--version']], ['pip3', ['--version']], ['git', ['--version']],
  ['gh', ['--version']], ['curl', ['--version']], ['wget', ['--version']], ['jq', ['--version']], ['ffmpeg', ['-version']], ['ffprobe', ['-version']],
  ['sqlite3', ['--version']], ['zip', ['-v']], ['unzip', ['-v']], ['rustc', ['--version']], ['cargo', ['--version']], ['go', ['version']],
  ['java', ['-version']], ['lighthouse', ['--version']], ['shot-scraper', ['--version']], ['xvfb-run', null], ['magick', ['-version']],
  ['sox', ['--version']], ['esbuild', ['--version']], ['bun', ['--version']], ['deno', ['--version']], ['uv', ['--version']], ['tsc', ['--version']],
  ['wasm-bindgen', ['--version']]];
function tools() {
  const have = [], missing = [];
  for (const [cmd, argv] of TOOLS) {
    if (!onPath(cmd)) { missing.push(cmd); continue; }
    const v = argv && versionOf(run(cmd, argv));
    have.push(v ? `${cmd} ${v}` : cmd);
  }
  return { have, missing };
}
// Rust's toolchains (rustup's), and which have the wasm32 target a Rust engine needs to build for the browser: a repo
// that pins a toolchain (rust-toolchain.toml) gets the one installed here, or downloads it.
function rust() {
  const home = process.env.RUSTUP_HOME || path.join(os.homedir(), '.rustup');
  let all = []; try { all = fs.readdirSync(path.join(home, 'toolchains')).filter((x) => !x.startsWith('.')); } catch {}
  if (!all.length) return null;
  const name = (x) => x.replace(/-(x86_64|aarch64|i686|arm\w*|riscv64\w*)-.*$/, '');
  const wasm = all.filter((x) => fs.existsSync(path.join(home, 'toolchains', x, 'lib', 'rustlib', 'wasm32-unknown-unknown')));
  return `rustup's toolchains ${all.map(name).join(', ')}; ${wasm.length ? `the wasm32-unknown-unknown target on ${wasm.map(name).join(', ')}` : 'no wasm32 target'}`;
}

// Playwright: the Python package and the browsers it has downloaded; with the browsers started, each one's version,
// whether it has WebGL (and how it renders) and WebGPU. WebGPU is only there on a secure page, so the probe opens a
// file:// one (a blank page never has it). Chromium without WebGPU is asked again with check-game.py's WEBGPU flags,
// the ones WebGPU engines need here (in software, on SwiftShader; checked on shardfall, riftlight and my-3dge).
const PROBE = String.raw`
import json, shutil, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
WEBGPU = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader']
JS = r"""async () => { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl');
  const d = g && g.getExtension('WEBGL_debug_renderer_info');
  let gpu = null;
  try { const a = navigator.gpu && await navigator.gpu.requestAdapter(); if (a && await a.requestDevice()) gpu = [a.info?.vendor, a.info?.architecture].filter(Boolean).join(' ') || 'yes'; } catch {}
  return { version: navigator.userAgent.match(/(Chrome|Firefox|Version)\/(\d+(\.\d+)?)/)?.[2] ?? null,
    webgl: g ? (typeof WebGL2RenderingContext !== 'undefined' && g instanceof WebGL2RenderingContext ? 2 : 1) : 0,
    renderer: g ? String(d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) : null, webgpu: gpu }; }"""
home = Path(tempfile.mkdtemp()); page = home / 'probe.html'; page.write_text('<!doctype html><title>probe</title>')
def look(kind, flags=[]):
    b = kind.launch(args=flags)
    try:
        p = b.new_page(); p.goto(page.as_uri()); return p.evaluate(JS)
    finally:
        b.close()
out = {}
with sync_playwright() as p:
    for name in ['chromium', 'firefox', 'webkit']:
        try:
            out[name] = look(getattr(p, name))
            if name == 'chromium' and not out[name]['webgpu']:
                gpu = look(p.chromium, WEBGPU)['webgpu']
                if gpu: out[name].update(webgpu=gpu, webgpuFlags=' '.join(WEBGPU))
        except Exception as e:
            out[name] = {'error': str(e).split('\n')[0][:160]}
shutil.rmtree(home, ignore_errors=True)
print(json.dumps(out))
`;
// Python's Playwright, by version (the browsers it has downloaded are for that version), or null.
const pyPlaywright = versionOf(run('python3', ['-c', 'import importlib.metadata as m; print(m.version("playwright"))']));
function browsers() {
  const py = pyPlaywright;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  let builds = []; try { builds = fs.readdirSync(cache).filter((d) => /^(chromium|firefox|webkit)-\d+$/.test(d)); } catch {}
  const nodeGlobal = (() => { const root = run('npm', ['root', '-g'])?.trim(); return !!root && fs.existsSync(path.join(root, 'playwright')); })();
  const lines = [];
  if (!py && !builds.length) return ['Playwright: not installed.'];
  const names = { chromium: 'Chromium', firefox: 'Firefox', webkit: 'WebKit' };
  let probe = null;
  if (!args.quick && py) { try { probe = JSON.parse(run('python3', ['-c', PROBE], 120000, true)?.trim().split('\n').pop() || 'null'); } catch {} }
  const found = builds.map((b) => b.split('-')[0]);
  const each = Object.keys(names).filter((n) => found.includes(n) || probe?.[n]).map((n) => {
    const x = probe?.[n];
    if (!x) return names[n];
    if (x.error) return `${names[n]} (won't start: ${x.error})`;
    const soft = (s) => /swiftshader|llvmpipe|lavapipe|software/i.test(s ?? '') ? ', software-rendered' : '';
    const webgpu = x.webgpu ? `; WebGPU${soft(x.webgpu)}${x.webgpuFlags ? `, when started with ${x.webgpuFlags}` : ''}` : '';
    return `${names[n]} ${x.version ?? ''}`.trim() + ` (${x.webgl ? `WebGL ${x.webgl}${soft(x.renderer)}` : 'no WebGL'}${webgpu})`;
  });
  const gpu = probe && Object.values(probe).some((x) => x.webgpu);
  lines.push(`Playwright ${py ? `${py} for Python (from playwright.sync_api import sync_playwright)` : '(no Python package)'}, with ${each.join(', ') || 'no browsers'} already downloaded`
    + `${probe && !gpu ? '; no WebGPU' : ''}. Phone and tablet device profiles are built in.`);
  if (gpu) lines.push('WebGPU only works on a secure page: file:// or http://127.0.0.1. A WebGPU canvas can come out blank in a headless screenshot, so check the game\'s state instead.');
  lines.push(nodeGlobal ? 'Playwright for Node is installed globally.'
    : `For Node, \`npm install playwright${py ? `@${py}` : ''}\` in your folder${py ? ' uses the browsers already downloaded; another version downloads its own' : ''}.`);
  if (process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE) lines.push(`Playwright runs here with PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=${process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE} (already set for runs): this OS isn't one it supports by name.`);
  return lines;
}

// Whether the internet works, and what ends programs when memory runs out (earlyoom ends the biggest browser).
async function network() {
  const ok = [];
  for (const url of ['https://github.com', 'https://registry.npmjs.org']) {
    try { const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) }); if (r.status < 500) ok.push(new URL(url).host); } catch {}
  }
  return ok.length ? `internet works (${ok.join(', ')})` : 'no internet access when checked';
}
const earlyoom = () => /earlyoom/.test(run('pgrep', ['-a', 'earlyoom']) ?? '')
  ? 'earlyoom is on: when memory runs out it ends the biggest browser, so "Target closed", "page crashed" or "browser has been closed" means memory ran out, not a bug in your game. Run fewer browsers at once rather than retrying.' : null;

// What a new computer's file starts with below the checked part: what no script can tell. Edit it for the computer.
const BY_HAND = `## What this computer doesn't have

No script can check these, so they're written by hand. Test with the stand-ins; anything that needs the real thing is checked as far as it can be here, never required.

- **No physical controller.** Emulate one: replace navigator.getGamepads with a stub that returns a pad in the standard mapping (Playwright's add_init_script / addInitScript).
- **No touch device.** Use Playwright's phone and tablet profiles, which have touch, and tap with page.touchscreen.
- **Nobody to listen.** Check sound by what Web Audio produces: render it with an OfflineAudioContext, or read levels from an AnalyserNode.
- **No second player.** Play multiplayer with two browser pages (or contexts) on this computer.
- **No real iPhone or iPad.** WebKit with an iPhone profile is the closest; it isn't iOS Safari.
- **No TV.** Judge the 10-foot view from screenshots at 1920×1080.

## Sharing this computer

- Other agents run here at the same time. Keep one or two browsers open at once, and close them when you're done.
- Keep every file you make inside your own folder, not ${os.tmpdir()} or a parent folder: ${os.tmpdir()} is shared.
- The browsers are already downloaded: don't run \`playwright install\` or \`playwright install-deps\`.
${onPath('uv') ? `- The system Python has ${pyPlaywright ? 'Playwright and nothing else' : 'no packages'}. For one (Pillow, numpy …), use uv: \`uv run --with pillow python script.py\``
  + `${pyPlaywright ? `, adding \`--with playwright==${pyPlaywright}\` when the script drives a browser too (a newer Playwright can't find the browsers here)` : ''}.\n` : ''}`;

const when = new Date(), pad = (n) => String(n).padStart(2, '0');
const stamp = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
const t = tools();
const checked = [BEGIN, `Checked ${stamp} (${Intl.DateTimeFormat().resolvedOptions().timeZone}) by node check-environment.mjs${args.quick ? ' --quick (browsers not started)' : ''}.`, '',
  `- **Computer:** ${computer()}`,
  `- **Space:** ${space()}`,
  `- **Display:** ${display()}.`,
  ...browsers().map((l, i) => i ? `  ${l}` : `- **Browsers:** ${l}`),
  `- **Tools:** ${t.have.join(', ') || 'none found'}.`,
  rust() ? `- **Rust:** ${rust()}.` : null,
  t.missing.length ? `- **Not installed:** ${t.missing.join(', ')}.` : null,
  `- **Network:** ${await network()}.`,
  earlyoom() ? `- **Memory:** ${earlyoom()}` : null,
  END].filter((l) => l != null).join('\n');

const file = machineFile(args.dir), was = read(file);
let text;
if (was && was.includes(BEGIN) && was.includes(END)) text = was.slice(0, was.indexOf(BEGIN)) + checked + was.slice(was.indexOf(END) + END.length);
else text = `# ${os.hostname()}: what this computer has\n\n${checked}\n\n${BY_HAND}${was ? `\n<!-- the file as it was, before it had a checked part -->\n${was}` : ''}`;
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, text.replace(/\n*$/, '\n'));
console.log(`${was ? 'Updated' : 'Wrote'} ${path.relative(process.cwd(), file) || file} (checked ${stamp}).`);
