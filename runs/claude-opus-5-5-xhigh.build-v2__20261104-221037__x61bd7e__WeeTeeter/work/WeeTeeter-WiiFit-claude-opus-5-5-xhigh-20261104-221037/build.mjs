// The one build command: node build.mjs [out.html]. Concatenates the engine, vendor files and game files into a single
// page (session.js first in <head>, every </script escaped), injects the exit interview as G.ABOUT, copies the result to
// tests/hub/game.html, and rewrites game/index.html (the dev page, which loads the same scripts one by one).
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const STEM = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037';
const out = resolve(process.argv[2] || join(here, '..', STEM + '.html'));
const read = f => readFileSync(join(here, f), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const files = JSON.parse(read('game/files.json')).filter(f => existsSync(join(here, f)));
const interviewPath = join(here, '..', 'exit-interview.json');
const about = existsSync(interviewPath) ? JSON.parse(readFileSync(interviewPath, 'utf8')) : {};

const TITLE = 'Wee Teeter', TAG = 'a five-day stay at the Institute for Gentle Improvement';
const DESC = 'A gentle, deadpan balance game: twelve short exercises, one analog skill, a needy talking scale and two serene wooden instructors.';
const CSS = `html,body{margin:0;height:100%;background:#d8f3fb;overflow:hidden}
#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
@media (min-height:700px){.esh-mod{zoom:1.5}} @media (min-height:1000px){.esh-mod{zoom:2}}
.esh button:focus,.esh input:focus{outline:3px solid var(--accent);outline-offset:2px}
[data-sys=need]{background:rgba(5,3,12,.35)!important;align-items:flex-end!important}`;
const BOOT = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#f7fbfb;color:#5f7f8a;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#14a8c8;font-size:16px;letter-spacing:.08em">WEE TEETER</b><span>Zeroing the scale</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#20404c14"><span style="display:block;width:30%;height:100%;background:#2cc6e6;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const head = session => `<meta charset="utf-8">
${session}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE} — ${TAG}</title>
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#2cc6e6">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="Wii Fit">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay steadiest over 3 exercises; most points wins">
<meta name="hub:session-howto" content="Lean: left stick, WASD or mouse. Breathe: R2, Space or click">
<style>${CSS}</style>`;

const session = '<script>' + esc(read('vendor/session.js')) + '</script>';
const scripts = files.map(f => `<script>/* ${f} */\n` + esc(read(f)) + '\n</script>');
const aboutScript = '<script>window.WEE_ABOUT = ' + esc(JSON.stringify(about)) + ';</script>';
const html = `<!doctype html>\n<html lang="en">\n<head>\n${head(session)}\n</head>\n<body>\n${BOOT}\n<canvas id="screen"></canvas>\n${aboutScript}\n${scripts.join('\n')}\n</body>\n</html>\n`;
writeFileSync(out, html);
copyFileSync(out, join(here, 'tests/hub/game.html'));

// the dev page, the same scripts one by one (open it from file:// while working)
const devHead = head('<script src="../vendor/session.js"></script>');
const dev = `<!doctype html>\n<html lang="en">\n<head>\n${devHead}\n</head>\n<body>\n${BOOT}\n<canvas id="screen"></canvas>\n<script>window.WEE_ABOUT = ${JSON.stringify(about)};</script>\n${files.map(f => `<script src="../${f}"></script>`).join('\n')}\n</body>\n</html>\n`;
writeFileSync(join(here, 'game/index.html'), dev);
if (!process.argv.includes('--quiet')) console.log(out + ' ' + (html.length / 1048576).toFixed(2) + ' MB');
