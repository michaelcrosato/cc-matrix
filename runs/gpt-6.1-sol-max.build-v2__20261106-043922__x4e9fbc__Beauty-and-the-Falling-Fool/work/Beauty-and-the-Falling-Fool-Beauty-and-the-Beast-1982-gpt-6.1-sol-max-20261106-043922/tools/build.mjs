import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve('..');
const c = vm.createContext({});
vm.runInContext(fs.readFileSync('content/tower.js', 'utf8'), c);
const { BUILD, TITLE } = c.FF;
const esc = (s) => s.replace(/<\/script/gi, '<\\/script');
const script = (file) =>
  '<script>\n' + esc(fs.readFileSync(file, 'utf8')) + '\n</script>\n';
const interview = JSON.parse(
  fs.readFileSync(path.join(root, 'exit-interview.json'), 'utf8'),
);
const html =
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>\n' +
  fs.readFileSync('vendor/ai-hub/lib/hub/session.js', 'utf8') +
  '\n</script>\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="8">\n' +
  '<meta name="hub:session-goal" content="Rescue Mabel from Hank, then depart by biplane as a team."><meta name="hub:session-howto" content="Stick / WASD: run and climb open windows. Cross / Space: jump. Options / Escape: local settings. Hearts empower both climbers.">\n' +
  '<meta name="description" content="A comic arcade climb through timed shutters, rolling boulders and a rooftop rescue. Solo, local co-op and AI Hub.">\n' +
  `<meta name="build-id" content="${BUILD}"><title>${TITLE}</title><style>${fs.readFileSync('src/style.css', 'utf8')}</style></head><body><canvas id="screen" aria-label="Beauty and the Falling Fool game"></canvas><div id="context-controls"><button id="window-action" data-act="up" hidden>Climb ↑</button></div><span id="build-identity">FALLING FOOL · 1.0</span>\n` +
  script('vendor/engine/dist/handoff/my-3d2dge.js') +
  script('content/tower.js') +
  '<script>FF.INTERVIEW=' +
  esc(JSON.stringify(interview)) +
  ';</script>\n' +
  ['simulation', 'presentation', 'audio', 'network', 'app']
    .map((n) => script('src/' + n + '.js'))
    .join('') +
  '<!-- ' +
  fs.readFileSync('vendor/engine/LICENSE', 'utf8').replace(/--/g, '—') +
  ' -->\n</body></html>';
fs.writeFileSync(path.join(root, BUILD + '.html'), html);
fs.writeFileSync(
  'artifacts/build.json',
  JSON.stringify(
    {
      title: TITLE,
      file: BUILD + '.html',
      bytes: Buffer.byteLength(html),
      engine: '0.89.1',
      engineCommit: '8ecc2f62353761187bdfe226f327b7ea5d2eb691',
      hub: '1.4.0',
      hubCommit: '35a1047f2067b2af3de3943f0fe452f39105d869',
    },
    null,
    2,
  ),
);
