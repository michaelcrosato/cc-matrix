// Writes ../exit-interview.json from tools/exit-source.json and embeds the same text in src/45-about.js (the About pages).
import { readFileSync, writeFileSync } from 'node:fs';
const src = JSON.parse(readFileSync(new URL('exit-source.json', import.meta.url), 'utf8'));
writeFileSync(new URL('../../exit-interview.json', import.meta.url), JSON.stringify(src, null, 2) + '\n');
const p = new URL('../src/45-about.js', import.meta.url); let s = readFileSync(p, 'utf8');
s = s.replace(/\/\*EXIT-START\*\/[\s\S]*?\/\*EXIT-END\*\//, '/*EXIT-START*/' + JSON.stringify(src) + '/*EXIT-END*/');
writeFileSync(p, s); JSON.parse(readFileSync(new URL('../../exit-interview.json', import.meta.url), 'utf8'));
console.log('exit-interview.json written and parsed');
