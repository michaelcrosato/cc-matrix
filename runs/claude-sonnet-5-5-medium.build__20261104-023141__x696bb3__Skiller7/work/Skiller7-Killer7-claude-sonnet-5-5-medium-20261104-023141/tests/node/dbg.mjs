import { load } from '../lib/node-harness.mjs';
const { S7 } = load(); const st = S7.st, sim = S7.sim, bot = S7.bot;
S7.newState({}); st.roster.mara.unlocked = true; sim.loadArea('01A', 'v6'); Object.assign(st.cheats, { god: true, infAmmo: true, infRed: true }); st.persona = 'mara'; for (const k of ['tw1','tw2','tw3','tw4','tw5','card']) st.done['01A:'+k] = true;
bot.v = { id: 'x', time: 1e9 }; bot.route = ['station']; bot.t = 0; st.enemies = []; st.mode = 'rail';
for (let i = 0; i < 700; i++) { const I = bot.intents(1 / 60); sim.update(1 / 60, I); if (i % 60 === 0) console.log(i, st.mode, st.node, st.edge, st.s.toFixed(2), 'blk', st.blocked, 'cd', st.skillCd.toFixed(1), 'charge', JSON.stringify(st.charge), 'red', st.red, JSON.stringify({ int: I.interact, go: I.go }), st.toasts.map(t => t.text).join('|')); }
