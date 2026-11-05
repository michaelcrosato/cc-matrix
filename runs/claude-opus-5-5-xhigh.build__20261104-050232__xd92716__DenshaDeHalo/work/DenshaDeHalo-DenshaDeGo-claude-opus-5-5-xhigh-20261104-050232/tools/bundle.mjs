// node tools/bundle.mjs: the single-file game, ../DenshaDeHalo-DenshaDeGo-claude-opus-5-5-xhigh-20261104-050232.html
// <meta charset>, then the AI Hub client pasted unmodified as the first script, the hub tags, the title, the boot splash,
// the canvas, then the engine (patched), rail.js and src/*.js inline, in index.html's order. No harness files, no URLs.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { SCRIPTS, HEAD, BOOT } from './gen-index.mjs';
const here = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, here), 'utf8');
const OUT = new URL('../DenshaDeHalo-DenshaDeGo-claude-opus-5-5-xhigh-20261104-050232.html', here);
const session = read('vendor/aihub/session.js');
const safe = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const parts = SCRIPTS.map(f => `<script>/* ${f} */\n${safe(read(f))}\n</script>`).join('\n');
const html = `<!doctype html>\n<html lang="en">\n<head>\n${HEAD.replace('SESSION', '<script>\n' + session + '\n</script>')}\n</head>\n<body>\n${BOOT}\n${parts}\n</body>\n</html>\n`;
writeFileSync(OUT, html);
// sanity: the client is first and byte-for-byte unmodified; no external URLs are loaded
const out = readFileSync(OUT, 'utf8'), i = out.indexOf('<script>'), firstScript = out.slice(i + 9, out.indexOf('</script>', i) - 1);
if (firstScript !== session) { console.error('FAIL the AI Hub client is not the first script, unmodified'); process.exit(1); }
if (/<script[^>]+src=/i.test(out) || /<link[^>]+href=["']https?:/i.test(out)) { console.error('FAIL the bundle loads something from outside'); process.exit(1); }
console.log('wrote ' + decodeURIComponent(OUT.pathname.split('/').pop()) + ' (' + (statSync(OUT).size / 1024).toFixed(0) + ' KB, ' + SCRIPTS.length + ' scripts)');
