// Bundles the manifest's scripts into one self-contained HTML file in the folder above the dev folder.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const emblem = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='#2b3220'/><path d='M12 44 L16 22 L24 30 L32 18 L40 30 L48 22 L52 44 L42 50 L32 54 L22 50 Z' fill='#343c28'/></svg>");
const css = `html,body{margin:0;height:100%;overflow:hidden;background:#232a1a url("${emblem}");background-size:64px 64px}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}`;
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a0e18;color:#a9b1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#ffe0a0;font-size:16px;letter-spacing:.08em">OPERATION WOLFPACK</b><span>Starting the pack</span></div>`;
let html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${man.title}</title><meta name="description" content="A first-person rail shooter for 1 to 4 players: the Wolfpack against the Hyena Legion."><meta name="hub:session" content="1"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-players" content="1-4"><meta name="hub:session-minutes" content="8"><style>${css}</style></head><body>${boot}<canvas id="screen"></canvas>\n`;
for (const s of man.scripts) { const code = readFileSync(path.join(root, s), 'utf8').replace(/<\/script/gi, '<\\/script'); html += `<script>\n/* ${s} */\n${code}\n</script>\n`; }
html += '</body></html>\n';
const out = path.resolve(root, man.out); writeFileSync(out, html); console.log('built', path.basename(out), (html.length / 1024 | 0) + ' KB');
