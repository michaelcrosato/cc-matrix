import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const name = path.basename(dir) + '.html';
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const client = read('vendor/session.js');
if (/<\/script/i.test(client))
  throw Error('Hub client cannot be safely byte-preserved inline');
let html = read('index.template.html');
html = html.replace('<!--HUB-->', () => `<script>${client}</script>`);
const src = [
  'vendor/my-3d2dge.js',
  'src/content.js',
  'src/sim.js',
  'src/platform.js',
  'src/audio.js',
  'src/art.js',
  'src/main.js',
];
html = html.replace('<!--GAME-->', () =>
  src
    .map(
      (f) =>
        `<script>\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`,
    )
    .join('\n'),
);
const interview = JSON.parse(
  fs.readFileSync(path.join(dir, 'interview.json'), 'utf8'),
);
html = html.replace('/*INTERVIEW*/', () =>
  JSON.stringify(interview).replace(/</g, '\\u003c'),
);
fs.writeFileSync(path.join(dir, name), html);
fs.writeFileSync(path.join(dir, '..', name), html);
fs.copyFileSync(
  path.join(dir, 'interview.json'),
  path.join(dir, '..', 'exit-interview.json'),
);
if (process.argv.includes('--report'))
  console.log(name + ' (' + Buffer.byteLength(html) + ' bytes)');
