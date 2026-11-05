// Writes exit-interview.json in the work folder from the game's own data (G.EXIT), and checks it parses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from '../test/lib/load.mjs';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { G } = load();
const x = G.EXIT;
const out = { sourceInformation: x.sourceInformation, testingFeedback: x.testingFeedback, engineFeedback: x.engineFeedback, promptFeedback: x.promptFeedback, aiHub: x.aiHub };
const file = path.join(DEV, '..', 'exit-interview.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('wrote and parsed', file);
