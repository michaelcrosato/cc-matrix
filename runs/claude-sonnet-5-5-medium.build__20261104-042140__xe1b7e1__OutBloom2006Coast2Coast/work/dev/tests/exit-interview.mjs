// writes exit-interview.json (root) from the same source the About screen uses
import { boot } from './load.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const ctx = boot(); const OB = ctx.OB;
writeFileSync(new URL('../../exit-interview.json', import.meta.url), JSON.stringify(OB.INTERVIEW, null, 2) + '\n');
JSON.parse(readFileSync(new URL('../../exit-interview.json', import.meta.url), 'utf8')); console.log('exit-interview.json written and parses');
process.exit(0);
