/**
 * @file Writes exit-interview.json beside the game's HTML from ui/about-data.ts, so the About screen, the reply and the interview
 * agree. Run from the dev folder: node labs/game/tools/write-interview.mjs <output.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformSync } from 'esbuild';

const source = readFileSync('labs/game/ui/about-data.ts', 'utf8');
const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
const data = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const out = {
  sourceInformation: data.SOURCE_INFORMATION,
  testingFeedback: data.TESTING_FEEDBACK,
  engineFeedback: data.ENGINE_FEEDBACK,
  promptFeedback: data.PROMPT_FEEDBACK,
  aiHub: data.AI_HUB,
};
writeFileSync(resolve(process.argv[2]), `${JSON.stringify(out, null, 2)}\n`);
JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'));
