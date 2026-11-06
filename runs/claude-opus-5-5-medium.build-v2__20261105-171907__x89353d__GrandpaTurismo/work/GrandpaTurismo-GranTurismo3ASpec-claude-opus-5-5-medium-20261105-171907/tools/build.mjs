// node tools/build.mjs [out.html]: the single HTML, with the exit interview and the kit's credits embedded.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
const out = process.argv[2] ?? '../GrandpaTurismo-GranTurismo3ASpec-claude-opus-5-5-medium-20261105-171907.html', bundle = 'tools/.bundle.js';
const exitPath = '../exit-interview.json', exit = existsSync(exitPath) ? JSON.parse(readFileSync(exitPath, 'utf8')) : { sourceInformation: {}, testingFeedback: [], engineFeedback: [], promptFeedback: [] };
const credits = readFileSync('src/CREDITS.md', 'utf8').split('\n').slice(0, 400).join('\n');
const version = /\*\*([0-9.]+)\*\*/.exec(readFileSync('src/GUIDE.md', 'utf8'))?.[1] ?? 'unknown';
writeFileSync('src/game/data/about.gen.js', `// Written by tools/build.mjs from the exit interview and the kit's CREDITS.md.\nexport const ABOUT = ${JSON.stringify({ exit, credits, engineVersion: version })};\n`);
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--charset=utf8', '--legal-comments=none', `--outfile=${bundle}`, '--log-level=warning'], { stdio: 'inherit' });
const js = readFileSync(bundle, 'utf8').replace(/<\/script/gi, '<\\/script');
rmSync(bundle);
const session = readFileSync('tools/hub/session.js', 'utf8');
const metas = readFileSync('tools/hub-metas.html', 'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${session}</script><title>Grandpa Turismo</title>
${metas}
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#row{display:flex;width:100vw;height:100vh}#p1{position:relative;width:100vw;height:100vh;overflow:hidden}#p2{display:none;position:relative;height:100vh;overflow:hidden}</style>
</head><body><div id="row"><div id="p1"></div><div id="p2"></div></div><script type="module">${js}</script></body></html>`;
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1048576).toFixed(1)} MB`);
