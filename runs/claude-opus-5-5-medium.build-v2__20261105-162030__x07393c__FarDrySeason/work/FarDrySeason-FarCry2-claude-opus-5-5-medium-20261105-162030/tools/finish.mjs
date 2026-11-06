// Fills the issue counts into About and writes exit-interview.json beside the game's HTML, from one source.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
const root = resolve(import.meta.dirname, '..'); process.chdir(root);
const lines = readFileSync('tests/ISSUES.md', 'utf8').split('\n').filter((l) => l.startsWith('- '));
const crit = lines.filter((l) => /CRITICAL/.test(l)).length;
let src = readFileSync('src/content/about.js', 'utf8');
src = src.replace(/'(@ISSUES@|\d+)( logged in tests\/ISSUES\.md)/, `'${lines.length}$2`).replace(/'(@CRITICAL@|\d+)(\. Among them)/, `'${crit}$2`);
writeFileSync('src/content/about.js', src);
const { ABOUT } = await import(`../src/content/about.js?${Date.now()}`);
const get = (k) => ABOUT.source.find((r) => r[0] === k)[1];
const out = {
  sourceInformation: { date: get('DATE'), source: get('SOURCE'), plan: get('PLAN'), genre: get('GENRE'), perspective: get('PERSPECTIVE'), tech: get('TECH'), artDirection: get('ART DIRECTION'), animation: get('ANIMATION'), audio: get('AUDIO'), online: get('ONLINE'), testing: get('TESTING'), research: get('RESEARCH'), environment: get('ENVIRONMENT'), model: get('MODEL'), usage: 'added on import' },
  testingFeedback: ABOUT.testing.map((r) => r[1]), engineFeedback: ABOUT.engine.map((r) => r[1]), promptFeedback: ABOUT.prompt.map((r) => r[1]),
  aiHub: { name: 'Far Dry Season', tagline: 'The grass burns whoever lit it', description: 'A first-person war-zone survival shooter in a dying plateau country: guns rust, trucks stall, fever keeps a timetable and grass fire goes where the wind says. A contract story with two endings, plus a four-player Cash Run in a burning mine.', type: 'Game', genre: 'Shooter', source: 'Far Cry 2', series: 'Far Cry', players: '1–4', controls: 'Stick or WASD move, R2 or mouse fire, Square or E use, D-pad Up or M raises the map', tags: ['first-person', 'pixel art', 'co-op', 'versus', 'vehicles', 'story'] },
};
writeFileSync(resolve(root, '..', 'exit-interview.json'), `${JSON.stringify(out, null, 2)}\n`);
JSON.parse(readFileSync(resolve(root, '..', 'exit-interview.json'), 'utf8'));
console.log(`issues ${lines.length}, critical ${crit}; ${basename(root)}`);
