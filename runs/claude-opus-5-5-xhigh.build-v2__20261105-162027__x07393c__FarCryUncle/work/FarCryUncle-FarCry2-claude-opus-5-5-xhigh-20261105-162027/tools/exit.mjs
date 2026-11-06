// Writes exit-interview.json beside the game's .html, and refreshes the issue counts the About screen shows.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
const log = readFileSync('tests/ISSUES.md', 'utf8').split('\n').filter((l) => l.startsWith('- '));
const all = log.length, critical = log.filter((l) => l.startsWith('- [C]')).length;
writeFileSync('src/content/issue-counts.js', `// Written by tools/exit.mjs from tests/ISSUES.md.\nexport const ISSUE_COUNTS = { all: ${all}, critical: ${critical} };\n`);
const { SOURCE_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, AI_HUB } = await import('../src/content/about.js');
const info = Object.fromEntries(SOURCE_INFO);
const fill = (s) => s.replace('%ISSUES%', all).replace('%CRITICAL%', critical);
const genre = info['GENRE AND PERSPECTIVE'];
const out = {
  sourceInformation: { date: info.DATE, source: info.SOURCE, plan: info.PLAN, genre: 'Open-world first-person shooter with survival pressure and systemic fire', perspective: 'First person on foot, at the wheel and in story scenes, with an optional chase camera in vehicles only', tech: info.TECH, artDirection: info['ART DIRECTION'], animation: info.ANIMATION, audio: info.AUDIO, online: info.ONLINE, testing: info.TESTING, research: info.RESEARCH, environment: info.ENVIRONMENT, model: info.MODEL, usage: info.USAGE },
  testingFeedback: TESTING_FEEDBACK.map(([, a]) => fill(a)),
  engineFeedback: ENGINE_FEEDBACK.map(([, a]) => a),
  promptFeedback: PROMPT_FEEDBACK.map(([, a]) => a),
  aiHub: AI_HUB,
};
writeFileSync(join(ROOT, '..', 'exit-interview.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`exit-interview.json written; ${all} issues, ${critical} critical`);
