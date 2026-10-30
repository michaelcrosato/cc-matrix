import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const filename = 'A-Vow-to-the-Verdant-Avowed-gpt-6.1-terra-max-20261029-1050.html';
const image = `data:image/png;base64,${readFileSync(join(directory, 'key-art.png')).toString('base64')}`;
const html = readFileSync(join(directory, 'index.html'), 'utf8')
  .replaceAll('__KEY_ART__', image)
  .replace('__HUB_SCRIPT__', readFileSync(join(directory, 'hub-session.js'), 'utf8'))
  .replace('__GAME_SCRIPT__', readFileSync(join(directory, 'game.js'), 'utf8'));
writeFileSync(join(directory, '..', filename), html);
console.log(`Built ${filename} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`);
