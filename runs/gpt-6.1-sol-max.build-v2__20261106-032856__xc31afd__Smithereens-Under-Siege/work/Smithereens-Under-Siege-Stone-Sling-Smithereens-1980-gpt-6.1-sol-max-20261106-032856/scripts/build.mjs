import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { REPORT } from '../src/metadata.js';
const root = path.resolve(import.meta.dirname, '..'),
  info = JSON.parse(
    fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'),
  );
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8'),
  seen = new Set(),
  parts = [];
function add(file) {
  if (seen.has(file)) return;
  seen.add(file);
  let s = read(file);
  for (const m of s.matchAll(
    /^import\s+[\s\S]*?\sfrom\s+['"](.+?)['"];?[ \t]*$/gm,
  ))
    add(path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1])));
  s = s
    .replace(/^import\s+[\s\S]*?\sfrom\s+['"].+?['"];?[ \t]*$/gm, '')
    .replace(/^export\s+(?=(?:const|let|function|class)\b)/gm, '');
  parts.push(`\n// ${file}\n${s}`);
}
add('src/entry.js');
new vm.Script(`(()=>{'use strict';${parts.join('\n')}})();`);
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const hub = read('vendor/hub/lib/hub/session.js'),
  engine = read('vendor/engine/dist/handoff/my-3d2dge.js');
if (/<\/script/i.test(hub))
  throw Error('Released Hub client contains an unsafe script terminator.');
const license = read('vendor/engine/LICENSE');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${hub}</script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${info.title}</title>\n<!-- my-3D2dge engine license:\n${license}\n-->\n<meta name="description" content="A right royal demolition derby. Simultaneous artillery, three stones and five collapsing courts.">\n<meta name="theme-color" content="#182d3b">\n<meta name="hub:type" content="Game"><meta name="hub:players" content="1–2">\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="2-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="3">\n<meta name="hub:session-goal" content="Destroy the opposing castle; at the bell, highest castle health percentage then direct-hit score wins.">\n<meta name="hub:session-howto" content="Hold and release Cross / Space / mouse to sling. L1/R1 or Q/E: stone. Circle/C: cancel. Options/Escape: menu. Touch: hold/release.">\n<style>${read('src/style.css')}</style>\n</head><body><canvas id="screen" aria-label="Smithereens Under Siege tournament battlefield"></canvas>\n<script>${safe(engine)}</script>\n<script>(()=>{'use strict';${safe(parts.join('\n'))}\n})();</script>\n</body></html>\n`;
const out = path.join(root, '..', info.base + '.html');
fs.writeFileSync(out, html);
fs.writeFileSync(path.join(root, 'artifacts', 'game.html'), html);
fs.writeFileSync(
  path.join(root, 'artifacts', 'build.json'),
  JSON.stringify(
    {
      title: info.title,
      bytes: Buffer.byteLength(html),
      modules: seen.size,
      engineRevision: info.engineRevision,
      hubRevision: info.hubRevision,
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(root, '..', 'exit-interview.json'),
  JSON.stringify(REPORT, null, 2) + '\n',
);
