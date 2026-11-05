// Builds the single HTML (root of the work folder) and build/game.js for headless tests.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const here = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, here), 'utf8');
const NAME = 'IceHoc-Kaboom-IceHockey-claude-sonnet-5-5-medium-20261104-055058';
const fb = JSON.parse(rd('tools/feedback.json'));
writeFileSync(new URL('../exit-interview.json', here), JSON.stringify(fb, null, 2));
writeFileSync(new URL('src/05-feedback.js', here), '/* generated from tools/feedback.json by tools/build.mjs */\nconst FEEDBACK = ' + JSON.stringify(fb) + ';\n');
const files = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js')).sort();
const game = '(() => {\n' + files.map(f => `/* ---- ${f} ---- */\n` + rd('src/' + f)).join('\n') + '\n})();\n';
mkdirSync(new URL('build/', here), { recursive: true });
writeFileSync(new URL('build/game.js', here), game);
const tpl = rd('engine/game/index.html');
const boot = (tpl.match(/<div id="e3-boot"[\s\S]*?<\/div>\s*(?=<canvas)/) || [''])[0].replace(/<script[\s\S]*?<\/script>/g, '');
const meta = [
  ['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'shared-world'], ['hub:session-minutes', '5'],
  ['hub:session-goal', 'Outscore the other team in one 3-minute period'],
  ['hub:session-howto', 'Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · R2/Shift turbo'],
  ['hub:type', 'Game'], ['hub:players', '1-4']].map(([k, v]) => `<meta name="${k}" content="${v}">`).join('\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${rd('vendor/session.js')}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ice Hoc-Kaboom</title>
${meta}
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
${boot.replace(/Rooftop[^<]*/g, 'ICE HOC-KABOOM')}
<canvas id="screen"></canvas>
<script>${rd('engine/my-3d2dge.js').replace(/<\/script/gi, '<\\/script')}</script>
<script>${game.replace(/<\/script/gi, '<\\/script')}</script>
</body></html>`;
writeFileSync(new URL('../' + NAME + '.html', here), html);
console.log('built', NAME + '.html', (html.length / 1024 | 0) + ' KB, game.js', (game.length / 1024 | 0) + ' KB');
