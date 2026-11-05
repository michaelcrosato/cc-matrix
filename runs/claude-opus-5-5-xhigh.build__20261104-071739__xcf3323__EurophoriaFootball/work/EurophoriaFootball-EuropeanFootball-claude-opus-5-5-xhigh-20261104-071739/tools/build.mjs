// Builds Europhoria Football: src/*.js (in name order, sharing one IIFE) -> build/game.js, the dev page build/index.html,
// and the single-file deliverable in the work root (everything inlined, runs from file://). node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
const DEV = new URL('../', import.meta.url), ROOT = new URL('../../', import.meta.url);
const NAME = 'EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739';
const read = (u, f) => readFileSync(new URL(f, u), 'utf8');
mkdirSync(new URL('build/', DEV), { recursive: true });
// EF.ABOUT: the exit interview's answers, so the About pages and the JSON never disagree
let about = null;
try { about = JSON.parse(read(ROOT, 'exit-interview.json')); } catch (e) { about = null; }
if (!about) { const u = 'unknown'; about = { sourceInformation: { date: '2026-11-04 07:17:39', source: 'European football (over the top arcade style)', plan: 'PLAN.md', genre: u, perspective: u, tech: u, artDirection: u, animation: u, audio: u, online: u, testing: u, research: u, environment: 'Claude Code CLI (headless); Linux; browser unknown', model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh', usage: u }, testingFeedback: [u, u, u, u], engineFeedback: [u, u, u, u, u, u], promptFeedback: [u, u, u, u], aiHub: {} }; }
const files = readdirSync(new URL('src/', DEV)).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
let out = "/* Europhoria Football: the game (built by tools/build.mjs from src/; one IIFE on my-3D2dge) */\n(() => {\n'use strict';\nconst E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;\nconst EF_ABOUT = " + JSON.stringify(about) + ";\n";
const map = []; let line = out.split('\n').length;
for (const f of files) {
  const src = read(DEV, 'src/' + f), head = '/* ==== src/' + f + ' ==== */\n';
  out += head; line += 1; map.push([line, f]); out += src + (src.endsWith('\n') ? '' : '\n'); line += src.split('\n').length - (src.endsWith('\n') ? 1 : 0);
}
out += '})();\n';
writeFileSync(new URL('build/game.js', DEV), out);
writeFileSync(new URL('build/linemap.json', DEV), JSON.stringify(map));
// syntax check
try { new vm.Script(out, { filename: 'build/game.js' }); } catch (e) { console.error('SYNTAX ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); process.exit(1); }
const engine = read(DEV, 'engine/my-3d2dge.js'), session = read(DEV, 'vendor/session.js');
const scripts = [['engine/my-3d2dge.js', engine], ['vendor/mocap/readable.js', read(DEV, 'vendor/mocap/readable.js')], ['vendor/mocap/mocap.js', read(DEV, 'vendor/mocap/mocap.js')], ['mocap/ef-clips.js', read(DEV, 'mocap/ef-clips.js')], ['build/game.js', out]];
for (const [f, s] of [['vendor/session.js', session], ...scripts]) if (/<\/script/i.test(s)) { console.error('BUNDLE ' + f + ' contains </script'); process.exit(1); }
// the boot splash's markup, from the engine itself
const ctx = { console: { log() {}, warn() {}, info() {}, error() {} } }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(engine, ctx);
const splash = ctx.My3D2dge.bootSplash('EUROPHORIA FOOTBALL');
const howto = 'Move: stick/WASD · Pass ✕/J · Shoot □/K (hold) · Lob ○/L · Sprint R2/Shift';
if ([...howto].length > 80) { console.error('howto longer than 80'); process.exit(1); }
const metas = [
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<title>Europhoria Football</title>',
  '<meta name="description" content="Europhoria Football: over-the-top arcade 5-a-side football. A broke seaside club rides its fans\' euphoria through Europe\'s grandest cup.">',
  '<meta name="hub:session" content="1">', '<meta name="hub:session-players" content="2-4">', '<meta name="hub:session-mode" content="shared-world">',
  '<meta name="hub:session-minutes" content="4">', '<meta name="hub:session-goal" content="Outscore the other side before the final whistle">',
  '<meta name="hub:session-howto" content="' + howto + '">',
  '<meta name="hub:source" content="European football">', '<meta name="hub:type" content="Game">', '<meta name="hub:genre" content="Sports">', '<meta name="hub:players" content="1–4">',
  '<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>'
].join('\n');
const page = (inline) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  (inline ? '<script>' + session + '</script>\n' : '<script src="../vendor/session.js"></script>\n') + metas + '\n</head>\n<body>\n' + splash + '\n<canvas id="screen"></canvas>\n' +
  scripts.map(([f, s]) => inline ? '<script>' + s + '</script>' : '<script src="../' + f + '"></script>').join('\n') + '\n</body>\n</html>\n';
writeFileSync(new URL('build/index.html', DEV), page(false).replace('<script src="../build/game.js"></script>', '<script src="game.js"></script>'));
writeFileSync(new URL(NAME + '.html', ROOT), page(true));
console.log('built ' + files.length + ' fragments, game.js ' + Math.round(out.length / 1024) + ' KB, deliverable ' + Math.round(page(true).length / 1024) + ' KB');
