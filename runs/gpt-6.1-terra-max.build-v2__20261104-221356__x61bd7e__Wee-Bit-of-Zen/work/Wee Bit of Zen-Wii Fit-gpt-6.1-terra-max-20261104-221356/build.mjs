import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const root = dirname(directory);
const basename = 'Wee Bit of Zen-Wii Fit-gpt-6.1-terra-max-20261104-221356';
const read = path => readFileSync(join(directory, path), 'utf8');
const interview = JSON.parse(readFileSync(join(root, 'exit-interview.json'), 'utf8'));
const scripts = ['engine/my-3d2dge.js', 'vendor/readable.js', 'vendor/mocap.js', 'vendor/fitclips.js', 'src/data.js', 'src/art.js', 'src/modes.js', 'src/game.js'];
const wrap = script => `<script>\n${script.replace(/<\/script/gi, '<\\/script')}\n</script>`;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
${wrap(read('vendor/session.js'))}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="A pleasantly imperfect island retreat for your body, mind, and general wobble.">
<meta name="theme-color" content="#d9eee6">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="Wii Fit">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost"><meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay steadiest over 3 exercises; most points wins"><meta name="hub:session-howto" content="Lean: left stick, WASD or mouse. Breathe: R2, Space or click">
<title>Wee Bit of Zen</title><style>${read('src/style.css')}\n${read('src/extra.css')}</style></head>
<body><canvas id="world" aria-hidden="true"></canvas><div id="app"></div>
${wrap(`window.BUILD_INFO = ${JSON.stringify(interview)};`)}
${scripts.map(path => wrap(read(path))).join('\n')}
</body></html>`;
writeFileSync(join(root, `${basename}.html`), html);
writeFileSync(join(directory, 'tests/hub/game.html'), html);
console.log(`Built ${basename}.html (${Buffer.byteLength(html)} bytes)`);
