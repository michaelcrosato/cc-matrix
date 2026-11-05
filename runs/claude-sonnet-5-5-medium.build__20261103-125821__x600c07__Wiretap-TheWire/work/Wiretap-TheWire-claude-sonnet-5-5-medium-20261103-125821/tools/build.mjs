import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), work = path.resolve(root, '..'), stem = path.basename(root);
const rd = f => fs.readFileSync(path.join(root, f), 'utf8'), safe = s => { if (/<\/script/i.test(s)) s = s.replace(/<\/script/gi, '<\\/script'); return s; };
const credits = JSON.parse(rd('src/credits.json'));
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const game = `(() => { 'use strict'; const CREDITS = ${JSON.stringify(credits)};\n` + files.map(f => `/* ---- ${f} ---- */\n` + rd('src/' + f)).join('\n') + '\n})();';
let splash = '';
try { const ctx = { console, window: undefined }; vm.createContext(ctx); vm.runInContext(rd('engine/my-3d2dge.js'), ctx); splash = (ctx.My3D2dge.bootSplash && ctx.My3D2dge.bootSplash('WIRETAP')) || ''; if (typeof splash !== 'string') splash = ''; } catch (e) { splash = ''; }
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${safe(rd('vendor/aihub-session.js'))}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Detectives: build the best case in five minutes. Photograph deals mid-sale, don't get made."><meta name="hub:session-howto" content="Move: stick/WASD · Watch: L2/RMB · Photo: R2/LMB · Act: ✕/E">
<title>WIRETAP</title><style>${rd('src/ui.css')}</style></head><body>${splash}<canvas id="screen"></canvas><div id="ui"></div>
<script>${safe(rd('engine/my-3d2dge.js'))}</script>
<script>${safe(game)}</script></body></html>`;
const out = path.join(work, stem + '.html'); fs.writeFileSync(out, html);
const ei = credits.exitInterview; fs.writeFileSync(path.join(work, 'exit-interview.json'), JSON.stringify(ei, null, 2)); JSON.parse(fs.readFileSync(path.join(work, 'exit-interview.json'), 'utf8'));
console.log('built', out, (html.length / 1e6).toFixed(2) + ' MB');
