// Builds the single deliverable HTML and the exit interview, one level up from the dev folder.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DELIVERABLE, TITLE } from '../src/config.js';
const ROOT = new URL('..', import.meta.url).pathname, OUT = `${ROOT}../${DELIVERABLE}.html`;
mkdirSync(`${ROOT}dist`, { recursive: true });
execSync(`esbuild src/main.js --bundle --format=esm --target=es2022 --outfile=dist/bundle.js --log-level=warning`, { cwd: ROOT, stdio: 'inherit' });
const bundle = readFileSync(`${ROOT}dist/bundle.js`, 'utf8').replace(/<\/script/g, '<\\/script');
const session = readFileSync(`${ROOT}vendor/hub/session.js`, 'utf8');
const metas = `<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Hold the quay together until dawn">
<meta name="hub:session-howto" content="Move, hold aim, fire; kick stunned enemies; revive friends">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${session}</script>\n${metas}\n<title>${TITLE}</title><style>html,body{background:#1a1c2c}</style></head><body><div id="app"></div><script type="module">${bundle}</script></body></html>`;
writeFileSync(OUT, html);
// Exit interview from one source.
const { SOURCE_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, AI_HUB, TAGLINE_HUB, DESCRIPTION_HUB } = await import('../src/data/about.js');
const exit = { sourceInformation: SOURCE_INFO, testingFeedback: TESTING_FEEDBACK.map((x) => x[1]), engineFeedback: ENGINE_FEEDBACK.map((x) => x[1]), promptFeedback: PROMPT_FEEDBACK.map((x) => x[1]), aiHub: { name: TITLE, tagline: TAGLINE_HUB, description: DESCRIPTION_HUB, ...AI_HUB } };
writeFileSync(`${ROOT}../exit-interview.json`, JSON.stringify(exit, null, 2)); JSON.parse(readFileSync(`${ROOT}../exit-interview.json`, 'utf8'));
console.log(`built ${DELIVERABLE}.html ${(html.length / 1e6).toFixed(1)} MB`);
