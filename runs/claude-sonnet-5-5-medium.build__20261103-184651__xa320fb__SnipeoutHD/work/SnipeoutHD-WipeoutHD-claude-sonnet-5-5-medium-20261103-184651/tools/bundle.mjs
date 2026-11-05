// Builds ../SnipeoutHD-WipeoutHD-claude-sonnet-5-5-medium-20261103-184651.html as one file. Checks: hub client byte-identical, no TODO/FIXME/XXX/placeholder in game sources, no <script src= left.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.resolve(root, '..', path.basename(root) + '.html');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8'), esc = s => s.replace(/<\/script/gi, '<\\/script');
const manifest = JSON.parse(rd('src/manifest.json')), head = rd('tools/head.html'), hub = rd('vendor/aihub-session.js');
const bad = [];
let game = ''; for (const f of manifest) { const s = rd('src/' + f + '.js'); if (/TODO|FIXME|XXX|placeholder/i.test(s)) bad.push(f + ' contains a forbidden word'); game += '// ==== src/' + f + '.js ====\n' + s + '\n'; }
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>' + esc(hub) + '</script>\n' + head + '</head>\n<body>\n<div id="e3-boot" style="position:fixed;inset:0;background:#06031a;color:#cfc8ff;font:16px monospace;display:flex;align-items:center;justify-content:center">SNIPEOUT HD loading...</div>\n<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>\n<script>' + esc(rd('engine/my-3d2dge.js')) + '</script>\n<script>' + esc(game) + '</script>\n<script type="module" onerror="window.__sn3dFail=\'load\'">' + esc(rd('engine/my-3d2dge-3d.js')) + '</script>\n</body></html>\n';
if (!html.includes(hub)) bad.push('hub client not byte-identical');
if (/<script[^>]*\ssrc=/i.test(head)) bad.push('a <script src=> remains in the page head');
if (bad.length) { console.log('BUNDLE PROBLEMS:\n' + bad.join('\n')); process.exit(1); }
fs.writeFileSync(out, html); console.log('wrote', path.basename(out), (html.length / 1048576).toFixed(2) + ' MB');
