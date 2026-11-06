import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const run = JSON.parse(fs.readFileSync(path.join(root, 'run.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const script = (s) => '<script>\n' + s.replace(/<\/script/gi, '<\\/script') + '\n</script>';
const hub = read('vendor/session.js');
const modules = ['content', 'sim', 'art', 'audio', 'net', 'editor', 'app'];
const reportPath = path.join(root, '..', 'exit-interview.json');
const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : 'null';
const html =
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>' +
  hub +
  '</script>\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world">' +
  '<meta name="hub:session-goal" content="Repair circuits, infer the code and disarm one shared device."><meta name="hub:session-howto" content="D-pad / WASD focus; Cross / Space apply and hold; L1/R1 / 1-4 tools; Square / E test; Triangle / R repeat; R2 / Tab evidence; Options / Escape menu."><meta name="hub:session-minutes" content="3">\n' +
  '<meta name="description" content="A complete circuit-repair and code-deduction game for one to four technicians."><title>' +
  run.title +
  '</title>\n' +
  '<style>' +
  read('src/style.css') +
  '</style></head><body><canvas id="screen" aria-label="Bomb Squad All Wired Up native circuit workspace"></canvas>\n' +
  script(read('vendor/my-3d2dge.js')) +
  '\n' +
  script(read('vendor/peerjs-1.5.5.min.js')) +
  '\n' +
  script('globalThis.Wired = globalThis.Wired || {}; globalThis.Wired.REPORT = ' + report + ';') +
  '\n' +
  modules.map((m) => script(read('src/' + m + '.js'))).join('\n') +
  '\n<!-- Dependency license notices\n' +
  read('vendor/ENGINE-LICENSE') +
  '\n' +
  read('vendor/PEERJS-LICENSE') +
  '\nAI Hub client 1.4.0 is included verbatim from michaelcrosato/ai-hub; upstream license unknown.\n-->\n</body></html>\n';
const dest = path.join(root, '..', run.slug + '.html');
fs.writeFileSync(dest, html);
fs.writeFileSync(
  path.join(root, 'evidence/build.json'),
  JSON.stringify(
    {
      artifact: path.basename(dest),
      bytes: Buffer.byteLength(html),
      sha256: crypto.createHash('sha256').update(html).digest('hex'),
      hubSha256: crypto.createHash('sha256').update(hub).digest('hex'),
      engine: '0.89.1',
      engineRevision: '8ecc2f62353761187bdfe226f327b7ea5d2eb691',
      engineSha256: crypto.createHash('sha256').update(read('vendor/my-3d2dge.js')).digest('hex'),
      engineChanges: 'Native Shell focus retention on same-screen refresh; docs/engine-changes.md',
      hub: '1.4.0',
      hubRevision: '35a1047f2067b2af3de3943f0fe452f39105d869',
    },
    null,
    2,
  ) + '\n',
);
if (!process.argv.includes('--quiet')) process.stdout.write(path.basename(dest) + '\n');
