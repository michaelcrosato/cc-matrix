import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(resolve(here, name), 'utf8');
const session = read('session.js');
const about = read('about.html');
const information = read('information.txt');
const result = read('index.html')
  .replace('<!-- BUILD_INFORMATION -->', `<!--\n${information}\n-->`)
  .replace('<!-- AIHUB_SESSION_CLIENT -->', `<script>\n${session}\n</script>`)
  .replace('/* BUILD_CSS */', read('style.css'))
  .replace('/* BUILD_JS */', read('game.js').replace('/* BUILD_ABOUT */', JSON.stringify(about)));
const output = resolve(here, '..', 'SplinterCellSuspicion-SplinterCellConviction-gpt-6.1-terra-max-20261029-1055.html');
writeFileSync(output, result);
console.log(output);
