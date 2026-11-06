// node tools/build.mjs <out.html>   (run from the dev folder)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
const out = process.argv[2], bundle = 'tools/.bundle.js';
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--charset=utf8', '--legal-comments=none', `--outfile=${bundle}`, '--log-level=warning'], { stdio: 'inherit' });
const js = readFileSync(bundle, 'utf8').replace(/<\/script/gi, '<\\/script');
rmSync(bundle);
const session = readFileSync('tools/hub/session.js', 'utf8');
const metas = readFileSync('tools/hub-metas.html', 'utf8');
const title = (readFileSync('src/game/data/meta.js', 'utf8').match(/TITLE = '([^']+)'/) || [])[1] ?? 'Game';
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${session}</script><title>${title}</title>
${metas}
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#row{display:flex;width:100vw;height:100vh}#p1{position:relative;width:100vw;height:100vh;overflow:hidden}#p2{display:none;position:relative;height:100vh;overflow:hidden}</style>
</head><body><div id="row"><div id="p1"></div><div id="p2"></div></div><script type="module">${js}</script></body></html>`;
writeFileSync(out, html);
console.log('built', out, (html.length / 1e6).toFixed(1) + ' MB');
