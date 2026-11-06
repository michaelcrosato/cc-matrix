import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const identity = JSON.parse(read('identity.json'));
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const hub = read('vendor/hub/session.js');
if (/<\/script/i.test(hub))
  throw Error(
    'Official Hub client contains a closing-script sequence; cannot inline unchanged',
  );
const scripts = [
  'vendor/my-3d2dge.js',
  'content/rooms.js',
  'src/sim.js',
  'src/render.js',
  'src/audio.js',
  'src/network.js',
  'src/main.js',
];
let interview = null;
try {
  interview = JSON.parse(read('metadata.json'));
} catch {}
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><script>${hub}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world">
<meta name="hub:goal" content="Clear six chambers, intercept the Gildwing, and banish the Wizard to free the dungeon.">
<meta name="hub:how-to" content="Move with WASD or left stick; aim with mouse, arrows or right stick; fire with click, Space or R2 / Cross. One bolt per warden. Watch radar and shoot bell posts.">
<meta name="hub:minutes" content="12"><meta name="description" content="An original occult arcade maze shooter. One lantern. One bolt. Six chambers of very bad company.">
<title>${identity.title}</title><style>${read('style.css')}</style></head>
<body data-mode="boot"><canvas id="screen" aria-label="${identity.title}: dungeon arena"></canvas><div id="brand-seal">A MENAGERIE OF BAD COMPANY</div>
${interview ? '<script>globalThis.WIZARD_INTERVIEW=' + safe(JSON.stringify(interview)) + ';</script>' : ''}
${scripts.map((p) => '<script>\n' + safe(read(p)) + '\n</script>').join('\n')}
</body></html>`;
writeFileSync(resolve(root, 'game.html'), html);
writeFileSync(resolve(root, 'index.html'), html);
if (process.argv.includes('--release')) {
  if (!interview) throw Error('Release requires complete metadata.json');
  writeFileSync(resolve(root, '..', identity.base + '.html'), html);
  writeFileSync(
    resolve(root, '..', 'exit-interview.json'),
    JSON.stringify(interview, null, 2) + '\n',
  );
}
if (!process.argv.includes('--quiet'))
  console.log(
    `Built ${identity.title}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KiB`,
  );
