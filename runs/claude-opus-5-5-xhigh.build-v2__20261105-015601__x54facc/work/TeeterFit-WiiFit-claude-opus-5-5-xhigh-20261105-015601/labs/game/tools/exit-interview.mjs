/**
 * @file Writes exit-interview.json from labs/game/ui/about-data.ts, so the About screen, the chat reply and the interview
 * agree (PLAN.md section 19). Usage, from the dev folder: node labs/game/tools/exit-interview.mjs <output.json>
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const about = await import(pathToFileURL(resolve('labs/game/ui/about-data.ts')).href);
const answers = (list) => list.map(([, answer]) => answer);
const interview = {
  sourceInformation: { ...about.SOURCE_INFO },
  testingFeedback: answers(about.TESTING_FEEDBACK),
  engineFeedback: answers(about.ENGINE_FEEDBACK),
  promptFeedback: answers(about.PROMPT_FEEDBACK),
  aiHub: {
    name: 'Teeter Fit',
    tagline: 'Stand still. It is harder than it looks.',
    description:
      'A deadpan wellness retreat on an island balanced on one rock. Eleven balance activities, one verb, a Wobble Age, and a storm where your thumb holds the island level.',
    type: 'Game',
    genre: 'Sports',
    source: 'Wii Fit',
    series: '',
    players: '1–4',
    controls: 'Lean: left stick, WASD or mouse · Feet: L2 R2, Q E or mouse buttons · Breathe: both',
    tags: ['3d', 'third-person', 'comedy', 'arcade', 'sports', 'story'],
  },
};
const text = `${JSON.stringify(interview, null, 2)}\n`;
JSON.parse(text);
writeFileSync(process.argv[2], text);
