import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; const s = G.CampaignSim.create({ humans: ['verdance'], seed: 3 }); s.beginSeason();
console.log(s.eventsFor('tidings', 'verdance'), G.get('event','tutorial').if(s,'verdance'));
