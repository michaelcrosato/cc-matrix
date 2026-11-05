// Bundles the engine, the AI Hub client and src/*.js into the one HTML file in the folder above; also writes dev/index.html.
// node tools/build.mjs [--release]   (release fails without ../exit-interview.json)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..'), out = path.resolve(root, '..');
const NAME = path.basename(root), release = process.argv.includes('--release');
const src = readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort();
for (const f of src) { try { execFileSync(process.execPath, ['--check', path.join(root, 'src', f)], { stdio: 'pipe' }); } catch (e) { console.error('syntax error in src/' + f + '\n' + e.stderr); process.exit(1); } }
const engine = readFileSync(path.join(root, 'engine/my-3d2dge.js'), 'utf8');
const session = readFileSync(path.join(root, 'vendor/aihub/session.js'), 'utf8');
// the About screen's data: from the exit interview
const ei = path.join(out, 'exit-interview.json');
let about = null;
if (existsSync(ei)) about = JSON.parse(readFileSync(ei, 'utf8'));
else if (release) { console.error('release build needs ../exit-interview.json'); process.exit(1); }
const aboutJs = 'globalThis.DQ = globalThis.DQ || {}; DQ.ABOUT = ' + JSON.stringify(about) + ';';
// the boot splash, from the engine itself
const c = { console }; vm.createContext(c); vm.runInContext(engine, c);
const splash = c.My3D2dge.bootSplash('DRAGON QUILT BUILDERS');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const metas = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Dragon Quilt Builders</title>
<meta name="description" content="Dragon Quilt Builders: gather, craft and build block by block to mend a patchwork world unravelled by a dragon. An original game inspired by Dragon Quest Builders.">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Raise the Quilt Barn together, then defend it from the Knotted raid">
<meta name="hub:session-howto" content="Move stick/WASD · Jump ✕/Space · Break □/Click · Place △/Right-click · Items L1 R1/wheel · Talk ○/F">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${esc(session)}
</script>
${metas}
</head>
<body>
${splash}
<canvas id="screen"></canvas>
<script>
${esc(engine)}
</script>
<script>
${esc(aboutJs)}
${src.map(f => '// ---- src/' + f + ' ----\n' + esc(readFileSync(path.join(root, 'src', f), 'utf8'))).join('\n')}
</script>
</body>
</html>
`;
const file = path.join(out, NAME + '.html');
writeFileSync(file, html);
const dev = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script src="../vendor/aihub/session.js"></script>
${metas}
</head>
<body>
${splash}
<canvas id="screen"></canvas>
<script src="../engine/my-3d2dge.js"></script>
<script>${aboutJs}</script>
${src.map(f => `<script src="../src/${f}"></script>`).join('\n')}
</body>
</html>
`;
writeFileSync(path.join(root, 'dev/index.html'), dev);
console.log('built ' + path.relative(process.cwd(), file) + ' (' + (html.length / 1024 | 0) + ' KB, ' + src.length + ' modules' + (about ? ', about from exit-interview.json' : ', no exit interview yet') + ')');
