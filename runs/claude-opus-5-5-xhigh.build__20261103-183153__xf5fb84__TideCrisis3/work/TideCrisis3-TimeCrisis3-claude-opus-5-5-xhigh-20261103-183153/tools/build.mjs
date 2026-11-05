// node tools/build.mjs [--js-only]: src/*.js (file-name order) -> build/game.js (one IIFE), then the single HTML in the
// work folder's root: <meta charset>, the AI Hub session client (unmodified, first script in <head>), the hub tags, the
// viewport meta, the style, E.bootSplash's markup, the canvas, the engine, the game. Also writes exit-interview.json.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url), at = p => new URL(p, root);
const NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153';
const files = readdirSync(at('src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => '// ---- ' + f + ' ----\n' + readFileSync(at('src/' + f), 'utf8')).join('\n');
const js = '(() => {\n"use strict";\nconst E = My3D2dge;\n' + body + '\n})();\n';
mkdirSync(at('build'), { recursive: true });
writeFileSync(at('build/game.js'), js);
if (process.argv.includes('--js-only')) process.exit(0);

const engine = readFileSync(at('engine/my-3d2dge.js'), 'utf8');
const session = readFileSync(at('hub/session.js'), 'utf8');
// the About data and the exit interview, from src/99-about.js run headless
const ctx = { console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout };
vm.createContext(ctx);
vm.runInContext(engine, ctx);
ctx.TC_BUILD = true;
vm.runInContext(js, ctx);
const about = ctx.TC && ctx.TC.ABOUT;
if (!about) throw new Error('TC.ABOUT missing');
writeFileSync(new URL('../' + 'exit-interview.json', root), JSON.stringify(about.exitInterview, null, 2) + '\n');

const H = about.hub, esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const splash = (() => { try { return ctx.My3D2dge.bootSplash('TIDE CRISIS 3'); } catch (e) { return ''; } })();
const scriptSafe = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${scriptSafe(session)}
</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="${esc(H.goal)}">
<meta name="hub:session-howto" content="${esc(H.howto)}">
<meta name="hub:session-minutes" content="${H.minutes}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tide Crisis 3</title>
<style>html,body{margin:0;height:100%;background:#04060c;overflow:hidden}canvas#screen{display:block;width:100vw;height:100vh;touch-action:none;outline:none}</style>
</head>
<body>
${splash}
<canvas id="screen" tabindex="0"></canvas>
<script>
${scriptSafe(engine)}
</script>
<script>
${scriptSafe(js)}
</script>
</body>
</html>
`;
writeFileSync(new URL('../' + NAME + '.html', root), html);
console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB), ' + files.length + ' fragments');
