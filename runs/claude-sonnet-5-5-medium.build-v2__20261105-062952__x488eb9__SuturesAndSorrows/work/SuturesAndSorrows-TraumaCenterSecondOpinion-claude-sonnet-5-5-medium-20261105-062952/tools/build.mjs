// Bundles the engine, the Hub client and every source in manifest order into ONE html file at the work root, and writes the exit interview.
import { readFileSync, writeFileSync } from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import './gen-about.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.resolve(root, '..');
const man = JSON.parse(readFileSync(path.join(root, 'src/manifest.json'), 'utf8')), about = JSON.parse(readFileSync(path.join(root, 'src/about-data.json'), 'utf8'));
const cfg = readFileSync(path.join(root, 'src/config.js'), 'utf8'); const stem = /FILE_STEM = '([^']+)'/.exec(cfg)[1], title = /GAME_TITLE = '([^']+)'/.exec(cfg)[1];
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = readFileSync(path.join(root, 'vendor/hub/session.js'), 'utf8');
const engine = man.engine.map(f => readFileSync(path.join(root, 'src', f), 'utf8')).join('\n'), game = man.game.map(f => `/* ${f} */\n` + readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const T = cfg.match(/HUB_TAGS = \{ goal: '([^']+)', howto: '([^']+)'/);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="${T[1]}"><meta name="hub:session-howto" content="${T[2]}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${title}</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}html .esh-row small{display:none}html .esh-row:focus-within small{display:block}</style></head>
<body><canvas id="screen"></canvas><script>${esc(engine)}</script><script>${esc(game)}</script></body></html>`;
writeFileSync(path.join(out, stem + '.html'), html);
if (about.sourceInformation && about.sourceInformation.date) {
  const ex = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
  writeFileSync(path.join(out, 'exit-interview.json'), JSON.stringify(ex, null, 2));
}
console.log('built', stem + '.html', (html.length / 1e6).toFixed(2) + ' MB');
