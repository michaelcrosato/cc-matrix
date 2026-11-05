import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; const s = G.CampaignSim.create({ humans: ['solmark'], seed: 2, difficulty: 'easy' }); for (let i = 0; i < 16; i++) s.autoSeason();
const S = s.state; console.log('owners', ['meridian','midnight','dawnwatch','noonspire','vesperhall'].map(c => c + ':' + s.owner(c) + ':' + S.castles[c].knights.length));
for (const c of G.adj.meridian) if (s.owner(c) === 'solmark') console.log(c, S.castles[c].knights.map(k => k + ' L' + S.knights[k].lvl + ' q' + !!S.knights[k].quest + ' w' + S.knights[k].wounded + ' p' + Math.round(s.troopPower(k))));
console.log('meridian def', Math.round(G.CampaignAI.defense(s, 'meridian')), S.castles.meridian.knights.map(k => k + ' L' + S.knights[k].lvl), 'stall', S.realms.solmark.ai.stall, 'ag', G.CampaignAI.aggression(s, 'solmark'));
console.log('all knights', s.knightsOf('solmark').map(k => k.id + '@' + k.castle + (k.quest ? '(Q)' : '')).join(' '));
