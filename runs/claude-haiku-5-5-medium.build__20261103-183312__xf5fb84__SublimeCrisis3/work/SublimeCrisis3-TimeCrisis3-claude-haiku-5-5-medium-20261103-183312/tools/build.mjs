// Build: concatenates src/*.js (in file-name order) into one IIFE in build/game.js, which the tests load next to the
// engine. With --html it also bundles the single self-contained HTML file in the work folder root (the engine, the AI Hub
// client and the game inline; nothing fetched), and writes exit-interview.json from src/99-about.js.
//   node tools/build.mjs          build/game.js only
//   node tools/build.mjs --html   + the single HTML and exit-interview.json
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const RUN_BASE = 'SublimeCrisis3-TimeCrisis3-claude-haiku-5-5-medium-20261103-183312';
const workDir = resolve(root, '..');          // the folder the deliverables go in (STAGE.md: the work folder root)

// The About and exit-interview data: one JSON file, written by the builder's author and read by both the game's
// About screens (inlined here) and the exit interview file, so the two always agree.
const aboutJson = readFileSync(join(root, 'tools', 'about-data.json'), 'utf8');
JSON.parse(aboutJson);

const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `// ---- src/${f} ----\n` + readFileSync(join(root, 'src', f), 'utf8')).join('\n');
const game = `(() => {\n'use strict';\nconst E = My3D2dge;\nconst TC_ABOUT = ${aboutJson.trim()};\n${body}\nglobalThis.TC = TC;\n})();\n`;
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'game.js'), game);
console.log(`built build/game.js from ${files.length} fragments (${game.length} bytes)`);

if (process.argv.includes('--html')) {
  const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
  const hub = readFileSync(join(root, 'hub', 'session.js'), 'utf8');
  if (engine.includes('</script')) throw new Error('the engine has a </script in it');
  if (hub.includes('</script')) throw new Error('the AI Hub client has a </script in it');
  if (game.includes('</script')) throw new Error('the game has a </script in it');
  const head = readFileSync(join(root, 'src', 'html-head.html'), 'utf8');
  const html = head
    .replace('/*@HUB@*/', () => hub)
    .replace('/*@ENGINE@*/', () => engine)
    .replace('/*@GAME@*/', () => game);
  const out = join(workDir, RUN_BASE + '.html');
  writeFileSync(out, html);
  console.log('wrote ' + out + ' (' + html.length + ' bytes)');
  // The exit interview: the same data as the About screens, in exactly the shape TASK.md gives.
  const about = JSON.parse(aboutJson);
  const exit = {
    sourceInformation: about.sourceInformation,
    testingFeedback: about.testingFeedback,
    engineFeedback: about.engineFeedback,
    promptFeedback: about.promptFeedback,
    aiHub: about.aiHub,
  };
  writeFileSync(join(workDir, 'exit-interview.json'), JSON.stringify(exit, null, 2) + '\n');
  console.log('wrote exit-interview.json');
}
