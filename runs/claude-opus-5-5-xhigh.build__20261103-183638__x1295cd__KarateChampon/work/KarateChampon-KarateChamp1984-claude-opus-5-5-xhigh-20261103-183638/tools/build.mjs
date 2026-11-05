// Karate Champon build: src/*.js (in name order) -> build/game.js (one IIFE, checked with node --check), then the single-file
// bundle beside PLAN.md: <meta charset>, the AI Hub session client (unmodified, the first script), the hub tags, the boot
// splash, the canvas, then the engine, the asset set and the game inline. Also writes ../exit-interview.json from
// data/about.json and checks that it parses. Usage: node tools/build.mjs [--quiet]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), quiet = process.argv.includes('--quiet');
const NAME = basename(root);   // KarateChampon-KarateChamp1984-claude-opus-5-5-xhigh-20261103-183638
const rd = f => readFileSync(join(root, f), 'utf8');
mkdirSync(join(root, 'build'), { recursive: true });

// 1. the game: one IIFE from the fragments
const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const about = JSON.parse(rd('data/about.json'));
let body = files.map(f => `// ---- src/${f} ----\n` + rd('src/' + f)).join('\n');
body = body.replace('/*@ABOUT@*/null', JSON.stringify(about));
const game = `/* Karate Champon: the game (built from src/ by tools/build.mjs) */\n(() => {\n'use strict';\n${body}\n})();\n`;
writeFileSync(join(root, 'build/game.js'), game);
execFileSync(process.execPath, ['--check', join(root, 'build/game.js')]);

// 2. the bundle
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = rd('vendor/aihub/session.js');
const meta = about.hub;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Karate Champon</title>
<meta name="description" content="${about.aiHub.description.replace(/"/g, '&quot;')}">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="${meta.players}">
<meta name="hub:session-mode" content="${meta.mode}">
<meta name="hub:session-minutes" content="${meta.minutes}">
<meta name="hub:session-goal" content="${meta.goal}">
<meta name="hub:session-howto" content="${meta.howto}">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#07060d;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff6d0;font-size:16px;letter-spacing:.08em">KARATE CHAMPON</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8782a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${esc(rd('engine/my-3d2dge.js'))}</script>
<script>${esc(rd('assets/kc-set.js'))}</script>
<script>${esc(game)}</script>
</body>
</html>
`;
const out = join(root, '..', NAME + '.html');
writeFileSync(out, html);

// 3. the dev page (the same scripts by reference, for quick reloads)
writeFileSync(join(root, 'dev.html'), html.replace(/<script>[\s\S]*?<\/script>\n<meta name="viewport"/, '<script src="vendor/aihub/session.js"></script>\n<meta name="viewport"')
  .replace(/<script>(?:(?!<\/script>)[\s\S])*<\/script>\n<script>(?:(?!<\/script>)[\s\S])*<\/script>\n<script>(?:(?!<\/script>)[\s\S])*<\/script>\n<\/body>/, '<script src="engine/my-3d2dge.js"></script>\n<script src="assets/kc-set.js"></script>\n<script src="build/game.js"></script>\n</body>'));

// 4. the exit interview, from the same data as the About screen
const ei = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
const eiText = JSON.stringify(ei, null, 2) + '\n';
JSON.parse(eiText);
writeFileSync(join(root, '..', 'exit-interview.json'), eiText);
if (!quiet) console.log(`built ${files.length} files -> build/game.js (${(game.length / 1024).toFixed(0)} KB), ${basename(out)} (${(html.length / 1024).toFixed(0)} KB), exit-interview.json`);
