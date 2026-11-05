// Builds the single deliverable HTML in the root from index.html: the AI Hub client byte for byte as the first script
// after <meta charset>, the head tags, the page CSS, the boot splash, the engine and the game's files inlined in order.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const NAME = 'Olympiyikes-OlympicGames-claude-opus-5-5-xhigh-20261104-074118';
export const OUT = path.resolve(DEV, '..', NAME + '.html');
const read = f => readFileSync(path.join(DEV, f), 'utf8');
const html = read('index.html');
const esc = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const session = read('vendor/hub/session.js');
const metas = [...html.matchAll(/<meta name="hub:[^>]+>|<meta name="(description|theme-color)"[^>]+>/g)].map(m => m[0]).join('\n');
const title = /<title>([^<]*)<\/title>/.exec(html)[1];
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.includes('vendor/hub'));
const css = read('src/page.css');
// the boot splash markup from the engine itself
const ctx = { console: { log() {}, warn() {}, info() {}, error() {} }, addEventListener() {}, location: { hash: '', pathname: '/' } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('engine/my-3d2dge.js'), ctx);
const splash = ctx.My3D2dge.bootSplash ? ctx.My3D2dge.bootSplash('OLYMPIYIKES!') : '';
const icon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="34" r="27" fill="none" stroke="#f2b632" stroke-width="5" stroke-dasharray="7 4"/><path d="M32 54 L16 40 L18 26 L26 20 L24 8 L32 2 Z" fill="#ff6a1a"/><path d="M32 54 L48 40 L46 26 L38 20 L41 8 L32 2 Z" fill="#3fa8e8"/></svg>');
const about = JSON.parse(read('about.json'));
const srcOf = s => s.endsWith('45-about.js') ? read(s).replace('/*ABOUT-JSON*/{}/*END-ABOUT-JSON*/', JSON.stringify(about)) : read(s);
const body = scripts.map(s => `<script>/* ${s} */\n${esc(srcOf(s))}\n</script>`).join('\n');
writeFileSync(path.resolve(DEV, '..', 'exit-interview.json'), JSON.stringify(about, null, 2) + '\n');
const out = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
${metas}
<link rel="icon" href="${icon}">
<style>${css}</style>
</head><body>
${splash}
<canvas id="screen"></canvas>
${body}
</body></html>
`;
writeFileSync(OUT, out);
if (process.argv[1] && process.argv[1].endsWith('bundle.mjs')) console.log('wrote', path.relative(process.cwd(), OUT), (out.length / 1024).toFixed(0) + ' KB');
