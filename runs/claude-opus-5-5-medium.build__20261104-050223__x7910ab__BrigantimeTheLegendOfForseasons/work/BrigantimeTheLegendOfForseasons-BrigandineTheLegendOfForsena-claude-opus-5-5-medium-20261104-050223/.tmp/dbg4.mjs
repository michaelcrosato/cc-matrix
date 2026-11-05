import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; G.tune.aiPlayerBoost = 1;
const s = G.CampaignSim.create({ humans: ['verdance'], seed: 21 }); for (let i = 0; i < 8; i++) s.autoSeason();
const S = s.state; for (const c of s.castlesOf('verdance')) console.log(c, S.castles[c].knights.map(k => k + ':' + Math.round(s.troopPower(k)) + (S.knights[k].quest ? 'Q' : '') + (S.knights[k].wounded ? 'W' : '')).join(' '), 'res', S.castles[c].reserve.length);
console.log('dawnwatch', S.castles.dawnwatch.knights.map(k => k + ':' + Math.round(s.troopPower(k))), 'def', G.CampaignAI.defense(s, 'dawnwatch'), 'mana', S.realms.verdance.mana, 'ag', G.CampaignAI.aggression(s, 'verdance'));
