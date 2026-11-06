// Writes ../exit-interview.json beside the game's .html from src/content/exit.js.
import { writeFileSync } from 'node:fs';
import { EXIT } from '../src/content/exit.js';
writeFileSync(new URL('../../exit-interview.json', import.meta.url), `${JSON.stringify(EXIT, null, 2)}\n`);
console.log('exit-interview.json written');
