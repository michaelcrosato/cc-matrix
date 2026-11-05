// Bundles the game into one HTML file in the work folder's root (and a dev page that loads the files one by one).
// node tools/build.mjs [--release]   (--release fails when exit-interview.json is missing)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(DEV, '..');
const NAME = 'DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-xhigh-20261103-215521';
const release = process.argv.includes('--release');
const srcFiles = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
for (const f of srcFiles) {
  try { execFileSync(process.execPath, ['--check', join(DEV, 'src', f)], { stdio: 'pipe' }); }
  catch (e) { console.error('syntax error in src/' + f + '\n' + String(e.stderr || e.message)); process.exit(1); }
}
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = readFileSync(join(DEV, 'vendor/aihub/session.js'), 'utf8');
const engine = readFileSync(join(DEV, 'engine/my-3d2dge.js'), 'utf8');
let about = null;
const ei = join(ROOT, 'exit-interview.json');
if (existsSync(ei)) { try { about = JSON.parse(readFileSync(ei, 'utf8')); } catch (e) { console.error('exit-interview.json does not parse: ' + e.message); process.exit(1); } }
else if (release) { console.error('release build needs ../exit-interview.json'); process.exit(1); }
const aboutJs = 'globalThis.DQ_ABOUT = ' + JSON.stringify(about) + ';';
const head = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Dragon Quilt Builders</title>
<meta name="description" content="Dragon Quilt Builders: gather, craft and build block by block to mend a patchwork kingdom unravelled by a dragon. An original block-building action RPG inspired by Dragon Quest Builders.">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Raise the Quilt Barn together, then defend it from the Knotted raid">
<meta name="hub:session-howto" content="Move stick/WASD · Jump ✕/Space · Break □/Click · Place △/Right-click · Items L1 R1/Wheel">
<style>html,body{margin:0;height:100%;background:#06051a;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>`;
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#06051a;color:#c8b8e8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffe7a0;font-size:16px;letter-spacing:.08em">DRAGON QUILT BUILDERS</b><span>Unrolling the quilt...</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8c870;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 15s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>`;
const srcs = srcFiles.map(f => `<script>/* src/${f} */\n${esc(readFileSync(join(DEV, 'src', f), 'utf8'))}\n</script>`).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(session)}</script>
${head}
</head>
<body>
${boot}
<script>${esc(engine)}</script>
<script>${esc(aboutJs)}</script>
${srcs}
</body>
</html>
`;
writeFileSync(join(ROOT, NAME + '.html'), html);
const dev = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script src="../vendor/aihub/session.js"></script>
${head}
</head>
<body>
${boot}
<script src="../engine/my-3d2dge.js"></script>
<script>${esc(aboutJs)}</script>
${srcFiles.map(f => `<script src="../src/${f}"></script>`).join('\n')}
</body>
</html>
`;
writeFileSync(join(DEV, 'dev/index.html'), dev);
console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB, ' + srcFiles.length + ' modules' + (about ? ', about data' : ', no about data yet') + ')');
