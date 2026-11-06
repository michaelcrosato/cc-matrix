import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const { stem } = JSON.parse(readFileSync('selection.json', 'utf8'));
const result = spawnSync(
  'bun',
  [
    'build',
    'src/main.js',
    '--target',
    'browser',
    '--minify',
    '--outfile',
    'bundle.js',
  ],
  { encoding: 'utf8' },
);
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(1);
}
const js = readFileSync('bundle.js', 'utf8').replaceAll(
  '</script',
  '<\\/script',
);
const session = readFileSync('vendor/session.js', 'utf8');
let page = readFileSync('src/page.html', 'utf8')
  .replace('<!--HUB_CLIENT-->', () => `<script>${session}</script>`)
  .replace('/*INLINE_CSS*/', () => readFileSync('src/style.css', 'utf8'))
  .replace('<!--GAME_SCRIPT-->', () => `<script type="module">${js}</script>`);
page = page.replace(
  '<!--LIBRARY_LICENSES-->',
  () =>
    '<script type="text/plain" id="third-party-licenses">' +
    readFileSync('LICENSES.txt', 'utf8').replaceAll('</script', '<\\/script') +
    '</script>',
);
const credits = JSON.parse(readFileSync('credits.json', 'utf8'));
page = page.replace('/*CREDITS_DATA*/', () => JSON.stringify(credits));
writeFileSync(resolve('..', stem + '.html'), page);
writeFileSync('game.html', page);
console.log('Built ' + stem + '.html');

const interview = {
  sourceInformation: credits.sourceInformation,
  testingFeedback: credits.testingFeedback,
  engineFeedback: credits.engineFeedback,
  promptFeedback: credits.promptFeedback,
  aiHub: JSON.parse(readFileSync('catalogue.json', 'utf8')),
};
const interviewPath = resolve('..', 'exit-interview.json');
writeFileSync(interviewPath, JSON.stringify(interview, null, 2) + '\n');
const parsed = JSON.parse(readFileSync(interviewPath, 'utf8'));
if (
  Object.keys(parsed).length !== 5 ||
  Object.keys(parsed.sourceInformation).length !== 15 ||
  parsed.testingFeedback.length !== 4 ||
  parsed.engineFeedback.length !== 6 ||
  parsed.promptFeedback.length !== 4 ||
  Object.values(parsed.sourceInformation).some(
    (value) => typeof value !== 'string' || !value.length,
  ) ||
  parsed.sourceInformation.usage !== 'added on import' ||
  parsed.aiHub.tags.length < 3 ||
  parsed.aiHub.tags.length > 6
)
  throw new Error('Exit interview shape is invalid.');
