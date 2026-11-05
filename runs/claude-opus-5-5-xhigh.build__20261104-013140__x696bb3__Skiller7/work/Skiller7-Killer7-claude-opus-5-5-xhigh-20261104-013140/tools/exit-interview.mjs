// Writes ../exit-interview.json (TASK.md's shape) from the game's own About data (out/about.json, written from the bundle),
// so the in-game About screen, the chat reply and the run record say the same thing.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const A = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/about.json'), 'utf8'));
const src = Object.fromEntries(A.source);
const out = {
  sourceInformation: {
    date: src['Date'], source: src['Source'], plan: src['Plan'],
    genre: 'On-rails action-adventure shooter: rail movement, stop-and-aim first-person scanning and shooting, persona-switch puzzles, boss fights',
    perspective: 'Third-person cinematic rail cameras that hard-cut while moving; first person while aiming; a schematic top-down map in the pause menu',
    tech: src['Tech'], artDirection: src['Art Direction'], animation: src['Animation'], audio: src['Audio'], online: src['Online'],
    testing: src['Testing'], research: src['Research'], environment: src['Environment'], model: src['Model'], usage: src['Usage']
  },
  testingFeedback: A.testing.map(x => x[1]),
  engineFeedback: A.engine.map(x => x[1]),
  promptFeedback: A.prompt.map(x => x[1]),
  aiHub: {
    name: 'SKILLER7',
    tagline: 'Seven Killers, One Mountain',
    description: 'Seven killers share one body and one snowbound mountain. Ride the rails, stop, scan for the laughing invisible Whiteouts and shoot the warm spot.',
    type: 'Game', genre: 'Shooter', source: 'Killer7', series: '', players: '1–4',
    controls: 'Hold W/✕ to move, RMB/L2 aim, LMB/R2 shoot, Space/L1 scan, Q/R1 skill, Tab/L1 switch killer, E/△ interact',
    tags: ['3d', 'story', 'first-person', 'third-person', 'boss fights', 'retro']
  }
};
const file = path.join(ROOT, '..', 'exit-interview.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(fs.readFileSync(file, 'utf8'));
const empty = [];
(function walk(o, k) { if (typeof o === 'string') { if (!o.trim() && k !== 'aiHub.series') empty.push(k); } else if (Array.isArray(o)) o.forEach((v, i) => walk(v, k + '[' + i + ']')); else for (const x in o) walk(o[x], k ? k + '.' + x : x); })(back, '');
if (empty.length) { console.error('exit-interview: empty fields: ' + empty.join(', ')); process.exit(1); }
console.log('exit-interview.json: parses; ' + Object.keys(back.sourceInformation).length + ' source fields, ' + back.testingFeedback.length + '/' + back.engineFeedback.length + '/' + back.promptFeedback.length + ' answers');
