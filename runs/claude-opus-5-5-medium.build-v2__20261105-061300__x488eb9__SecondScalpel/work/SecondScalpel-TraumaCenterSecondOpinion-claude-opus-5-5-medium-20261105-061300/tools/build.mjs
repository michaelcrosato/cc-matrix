// Bundles the game into the one HTML file TASK.md names, and writes the exit interview beside it from src/about-data.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
const ROOT = new URL('../', import.meta.url), man = JSON.parse(readFileSync(new URL('src/manifest.json', ROOT)));
const NAME = 'SecondScalpel-TraumaCenterSecondOpinion-claude-opus-5-5-medium-20261105-061300';
const read = p => readFileSync(new URL(p, ROOT), 'utf8'), esc = s => s.replace(/<\/script/gi, '<\\/script');
const engine = read('vendor/my-3d2dge/dist/handoff/my-3d2dge.js'), session = read('vendor/hub/session.js');
const about = existsSync(new URL('src/about-data.json', ROOT)) ? JSON.parse(read('src/about-data.json')) : null;
const game = [...man.core, ...man.game].map(f => read('src/' + f)).join('\n');
for (const f of [...man.core, ...man.game]) new vm.Script(read('src/' + f), { filename: f });   // a source that doesn't compile stops the build here, before it can replace a good file
const cfg = { goal: 'Save the patient together; best hands top the board', howto: 'Aim: right stick or mouse. Use tool: R2 or click. Tools: left stick or 1-8' };
const ctx = { console }; vm.createContext(ctx); vm.runInContext('var My3D2dge;' + engine.slice(0, 0), ctx);
const splash = (() => { const c = { console }; c.window = c; vm.createContext(c); vm.runInContext(engine, c); return c.My3D2dge.bootSplash('Second Scalpel'); })();
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="${cfg.goal}">
<meta name="hub:session-howto" content="${cfg.howto}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Second Scalpel</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}html .esh-row small{display:none}html .esh-row:focus-within small{display:block}</style></head>
<body>${splash}<canvas id="screen"></canvas><script>${esc(engine)}</script><script>${about ? 'window.GAME=window.GAME||{};window.GAME.ABOUT=' + esc(JSON.stringify(about)) + ';' : ''}</script><script>${esc(game)}</script></body></html>`;
writeFileSync(new URL('../' + NAME + '.html', ROOT), html);
writeFileSync(new URL('game.html', ROOT), html);
if (about) { const { credits, ...ei } = about; writeFileSync(new URL('../exit-interview.json', ROOT), JSON.stringify(ei, null, 2) + '\n'); }
