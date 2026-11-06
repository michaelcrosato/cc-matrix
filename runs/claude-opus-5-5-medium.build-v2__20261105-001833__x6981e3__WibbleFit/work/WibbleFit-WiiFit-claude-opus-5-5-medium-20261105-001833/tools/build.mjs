// tools/build.mjs: bundles everything into the one html the brief names, in root.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = new URL('..', import.meta.url).pathname;
process.chdir(root);
mkdirSync('.build', { recursive: true });
writeFileSync('src/data/credits.gen.js', `// Generated from the kit's CREDITS.md by tools/build.mjs.\nexport const CREDITS_TEXT = ${JSON.stringify(readFileSync('CREDITS.md', 'utf8'))};\n`);
const { DELIVERABLE, SOURCE_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, AI_HUB } = await import(pathToFileURL(root + 'src/data/about.js') + `?t=${Date.now()}`);
const { TITLE } = await import(pathToFileURL(root + 'src/data/title.js'));
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--platform=browser', '--target=esnext', '--charset=utf8', '--outfile=.build/bundle.js', '--log-level=warning'], { stdio: 'inherit' });
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const HUB_METAS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Score the most across three events. Stay in the circle.">
<meta name="hub:session-howto" content="Left stick, WASD or mouse: lean. R2, Space or click: breathe. L1/R1, F/J: step.">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">`;
const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<script>${readFileSync('vendor/hub/session.js', 'utf8')}</script>
${HUB_METAS}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<link rel="icon" href="data:,"><title>${TITLE}</title>
<style>html, body { margin: 0; height: 100%; background: #0d0b14; } #app { position: fixed; inset: 0; }</style>
</head><body><div id="app"></div>
<script type="module">${safe(readFileSync('.build/bundle.js', 'utf8'))}</script>
</body></html>`;
const out = `../${DELIVERABLE}.html`;
writeFileSync(out, html);
writeFileSync('.build/game.html', html);
const interview = { sourceInformation: SOURCE_INFO, testingFeedback: TESTING_FEEDBACK, engineFeedback: ENGINE_FEEDBACK, promptFeedback: PROMPT_FEEDBACK, aiHub: AI_HUB };
writeFileSync('../exit-interview.json', JSON.stringify(interview, null, 2) + '\n');
JSON.parse(readFileSync('../exit-interview.json', 'utf8'));
console.log(`built ${out} ${(html.length / 1e6).toFixed(1)} MB`);
