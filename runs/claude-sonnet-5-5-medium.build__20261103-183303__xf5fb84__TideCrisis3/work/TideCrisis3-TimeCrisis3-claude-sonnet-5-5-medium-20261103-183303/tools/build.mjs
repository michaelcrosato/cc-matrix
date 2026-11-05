// build.mjs — concatenates src/*.js (file-name order) into build/game.js, then bundles one self-contained HTML in the
// work folder root (session client first, hub tags, engine, game) and writes exit-interview.json from src/80-about.js.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), work = resolve(root, '..');
const NAME = 'TideCrisis3-TimeCrisis3-claude-sonnet-5-5-medium-20261103-183303';
mkdirSync(join(root, 'build'), { recursive: true });
const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const game = '(() => {\n"use strict";\n' + files.map(f => '// ---- ' + f + ' ----\n' + readFileSync(join(root, 'src', f), 'utf8')).join('\n') + '\n})();\n';
writeFileSync(join(root, 'build', 'game.js'), game);
const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8'), session = readFileSync(join(root, 'hub', 'session.js'), 'utf8');
const ctx = { console }; vm.createContext(ctx); vm.runInContext(engine, ctx);
let splash = ''; try { splash = ctx.My3D2dge.bootSplash('TIDE CRISIS 3'); } catch (e) { }
const about = vm.runInNewContext(readFileSync(join(root, 'src', '80-about.js'), 'utf8').replace(/^function aboutPages[\s\S]*$/m, '') + '\n;ABOUT');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Clear the stage together; most points wins">
<meta name="hub:session-howto" content="Aim mouse/stick · Fire click/R2 · Hold right-click/L2: cover+reload">
<meta name="hub:session-minutes" content="7">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Tide Crisis 3</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style></head>
<body>${splash}<canvas id="screen"></canvas>
<script>${engine}</script>
<script>${game}</script>
</body></html>
`;
writeFileSync(join(work, NAME + '.html'), html);
const ai = { name: 'Tide Crisis 3', tagline: 'Duck. Pop. Shoot. Beat the tide.', description: 'An original arcade light-gun rail shooter in PS1-style pixel 3D: duck behind cover, switch between four weapons and race each area\'s clock to retake an island\'s tidal barrier before the dawn king tide. Play solo, couch co-op or AI Hub co-op for up to four.', type: 'Game', genre: 'Shooter', source: 'Time Crisis 3', series: 'Time Crisis', players: '1–4', controls: 'Mouse or stick aims · left click/R2 fires · hold right click/L2 for cover and reload · wheel/R1 switches weapons', tags: ['first-person', 'arcade', 'co-op', 'boss fights', 'pixel art', 'retro'] };
const si = about.sourceInformation, out = { sourceInformation: { date: si.date, source: si.source, plan: si.plan, genre: si.genre + ' — ' + si.perspective, perspective: si.perspective, tech: si.tech, artDirection: si.artDirection, animation: si.animation, audio: si.audio, online: si.online, testing: si.testing, research: si.research, environment: si.environment, model: si.model, usage: si.usage }, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: ai };
delete out.sourceInformation.perspective; out.sourceInformation.genre = si.genre; out.sourceInformation.perspective = si.perspective;
writeFileSync(join(work, 'exit-interview.json'), JSON.stringify(out, null, 2));
console.log('built', NAME + '.html', (html.length / 1024 | 0) + ' KB');
