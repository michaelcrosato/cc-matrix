/**
 * @file Writes exit-interview.json beside the game's .html from the one data file (labs/game/ui/about-data.ts), so the About screen, the
 * chat reply and the interview agree. Usage: node labs/game/tools/interview.mjs <output.json>
 * @example
 * node labs/game/tools/interview.mjs ../exit-interview.json
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ABOUT } from '../ui/about-data.ts';

const out = {
  sourceInformation: ABOUT.source,
  testingFeedback: ABOUT.testingFeedback,
  engineFeedback: ABOUT.engineFeedback,
  promptFeedback: ABOUT.promptFeedback,
  aiHub: ABOUT.hub,
};
const text = JSON.stringify(out, null, 2);
JSON.parse(text);
writeFileSync(resolve(process.argv[2]), `${text}\n`);
