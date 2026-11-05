// Writes exit-interview.json (in the root, beside the .html) from B.ABOUT, the same source the About screen uses; checks that it parses.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const dev = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), root = path.resolve(dev, '..');
const ctx = vm.createContext({}); for (const f of ['00-core.js', '12-data-text.js', '98-about.js']) vm.runInContext(fs.readFileSync(path.join(dev, 'src', f), 'utf8').replace(/^const B =/m, 'var B ='), ctx);
const A = ctx.B.ABOUT, SI = A.SI;
const o = { sourceInformation: { date: SI.Date, source: SI.Source, plan: SI.Plan, genre: 'Real-time, first-person, grid-based party RPG dungeon crawler', perspective: 'First-person party view on a grid with tweened steps and quarter turns, plus a top-down automap', tech: SI.Tech, artDirection: SI['Art Direction'], animation: SI.Animation, audio: SI.Audio, online: SI.Online, testing: SI.Testing, research: SI.Research, environment: SI.Environment, model: SI.Model, usage: SI.Usage },
  testingFeedback: A.TF.map(x => x[1]), engineFeedback: A.EF.map(x => x[1]), promptFeedback: A.PF.map(x => x[1]),
  aiHub: { name: 'Eye of the Bolt-Holder', tagline: 'A thousand locks. One eye.', description: 'A real-time, first-person party dungeon crawl beneath Hasp, the City of a Thousand Locks: four floors of drains, clockwork halls and eye-cults, levers, plates and keys, spells memorized at camp, and the caged Eye that holds the city\'s bolts. Race the Rat Run against up to three other parties.', type: 'Game', genre: 'RPG', source: 'Eye of the Beholder (1991)', series: 'Eye of the Beholder', players: '1–4', controls: 'Stick/WASD move · D-pad/Q E turn · ✕/F use · □/Space strike · L2 R2/1-6 hands · △/I party', tags: ['3d', 'first-person', 'fantasy', 'retro', 'exploration', 'boss fights'] } };
const file = path.join(root, 'exit-interview.json'); fs.writeFileSync(file, JSON.stringify(o, null, 2)); JSON.parse(fs.readFileSync(file, 'utf8'));
for (const [k, v] of Object.entries(o.sourceInformation)) if (!String(v).trim()) throw new Error('empty ' + k);
console.log('wrote exit-interview.json');
