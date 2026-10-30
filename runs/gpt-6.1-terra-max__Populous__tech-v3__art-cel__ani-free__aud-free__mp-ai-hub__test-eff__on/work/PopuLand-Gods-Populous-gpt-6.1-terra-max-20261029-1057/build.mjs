import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(folder, name), 'utf8');
const feedback = read('feedback.txt').trim();
const html = read('index.html')
  .replace('<!-- HUB_SCRIPT -->', `<script>\n${read('session.js')}\n</script>`)
  .replace('/* INLINE_CSS */', read('style.css'))
  .replace('/* INLINE_GAME */', read('game.js'));
writeFileSync(join(folder, '..', 'PopuLand-Gods-Populous-gpt-6.1-terra-max-20261029-1057.html'), `<!--\n${feedback}\n-->\n${html}`);
console.log('Built PopuLand Gods single-file HTML.');
