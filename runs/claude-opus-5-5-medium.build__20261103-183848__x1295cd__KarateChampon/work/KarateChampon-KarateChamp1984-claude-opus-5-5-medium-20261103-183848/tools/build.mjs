// Build: src/*.js -> one IIFE (build/game.js, checked with node --check), then the single-file bundle beside PLAN.md
// (session.js first and byte-identical, the hub metas, the engine, the game) and exit-interview.json from data/about.json.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const here = new URL('../', import.meta.url), P = f => new URL(f, here), read = f => readFileSync(P(f), 'utf8');
const NAME = 'KarateChampon-KarateChamp1984-claude-opus-5-5-medium-20261103-183848';
const about = JSON.parse(read('data/about.json'));
const files = readdirSync(P('src')).filter(f => f.endsWith('.js')).sort();
let body = files.map(f => `// ---- ${f} ----\n` + read('src/' + f)).join('\n');
body = body.replace("KC.VERSION = '1.0.0';", () => "KC.VERSION = '1.0.0';\nKC.ABOUT = " + JSON.stringify(about) + ';');
const game = '(() => {\n' + body + '\n})();\n';
mkdirSync(P('build'), { recursive: true }); writeFileSync(P('build/game.js'), game);
execFileSync(process.execPath, ['--check', new URL('build/game.js', here).pathname]);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = read('vendor/aihub/session.js'), engine = read('engine/my-3d2dge.js');
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">KARATE CHAMPON</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8782a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const head = (inline) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${inline ? '<script>' + session + '</script>' : '<script src="vendor/aihub/session.js"></script>'}
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Win bouts: first to 2 points. Winner stays on.">
<meta name="hub:session-howto" content="Move: left stick/WASD · Strike: right stick, face buttons or IJKL">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${about.aiHub.description}">
<title>Karate Champon</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
${boot}
<canvas id="screen"></canvas>
`;
writeFileSync(P('../' + NAME + '.html'), head(true) + '<script>' + esc(engine) + '</script>\n<script>' + esc(game) + '</script>\n</body>\n</html>\n');
writeFileSync(P('dev.html'), head(false) + '<script src="engine/my-3d2dge.js"></script>\n<script src="build/game.js"></script>\n</body>\n</html>\n');
const exit = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
writeFileSync(P('../exit-interview.json'), JSON.stringify(exit, null, 2) + '\n'); JSON.parse(readFileSync(P('../exit-interview.json'), 'utf8'));
console.log('built ' + NAME + '.html (' + Math.round(readFileSync(P('../' + NAME + '.html')).length / 1024) + ' KB)');
