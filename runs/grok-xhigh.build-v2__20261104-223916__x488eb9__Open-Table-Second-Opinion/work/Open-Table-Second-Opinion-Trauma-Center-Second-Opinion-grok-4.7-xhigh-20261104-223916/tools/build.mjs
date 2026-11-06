/* Bundle the self-contained page and the exit interview from the same About object. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = path.resolve(dev, '..');
const scripts = [
  'src/config.js',
  'src/core/sim.js',
  'src/data/content.js',
  'src/art/field.js',
  'src/audio/audio.js',
  'src/about.js',
  'src/bot/bot.js',
  'src/scenes/shell.js',
];

function esc(code) {
  return code.replace(/<\/script/gi, '<\\/script');
}

const session = fs.readFileSync(path.join(dev, 'vendor/hub/session.js'), 'utf8');
const engine = esc(fs.readFileSync(path.join(dev, 'vendor/my-3d2dge/dist/handoff/my-3d2dge.js'), 'utf8'));
const game = esc(scripts.map((rel) => fs.readFileSync(path.join(dev, rel), 'utf8')).join('\n'));

const ctx = {};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dev, 'src/about.js'), 'utf8'), ctx, { filename: 'about.js' });
const about = ctx.GAME.ABOUT;
const title = about.aiHub.name;
const file = 'Open-Table-Second-Opinion-Trauma-Center-Second-Opinion-grok-4.7-xhigh-20261104-223916';

const splash = '<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">OPEN TABLE SECOND OPINION</b><span>Starting · my-3D2dge v0.89.1</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game\'s script did not run: reload, or open the browser\'s console.</span></div>';

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Save the patient together; best hands top the board">
<meta name="hub:session-howto" content="Aim: right stick or mouse. Use tool: R2 or click. Tools: left stick or 1-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${title}</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}html .esh-row small{display:none}html .esh-row:focus-within small{display:block}</style></head>
<body>${splash}<canvas id="screen"></canvas><script>${engine}</script><script>${game}</script></body></html>
`;

const out = path.join(work, file + '.html');
fs.writeFileSync(out, html);
fs.writeFileSync(path.join(dev, 'game.html'), html);
fs.writeFileSync(path.join(work, 'exit-interview.json'), JSON.stringify(about, null, 2) + '\n');

const lines = [];
lines.push('# Notes');
lines.push('');
lines.push('These are the same answers as the About screen and exit-interview.json.');
lines.push('');
lines.push('## Source Information');
for (const [k, v] of Object.entries(about.sourceInformation)) lines.push('- ' + k + ': ' + v);
lines.push('');
lines.push('## Testing Feedback');
about.testingFeedback.forEach((t, i) => lines.push((i + 1) + '. ' + t));
lines.push('');
lines.push('## Engine Feedback');
about.engineFeedback.forEach((t, i) => lines.push((i + 1) + '. ' + t));
lines.push('');
lines.push('## Prompt Feedback');
about.promptFeedback.forEach((t, i) => lines.push((i + 1) + '. ' + t));
lines.push('');
fs.mkdirSync(path.join(dev, 'notes'), { recursive: true });
fs.writeFileSync(path.join(dev, 'notes/feedback.md'), lines.join('\n'));
console.log('wrote ' + out + ' (' + html.length + ' bytes)');
