import { load } from './lib.mjs';
import { FakeNet } from '../tools/fakehub.mjs';
const scenario = process.argv[2] || 'host';
const net = new FakeNet({ players: 2, server: scenario === 'server' }); net.begin();
const copies = net.copies.map((hub, i) => { const L = load({ AIHub: hub }); return { hub, ...L }; });
await new Promise(r => setTimeout(r, 20));
const step = 1 / 30;
function adv(sec) { for (let t = 0; t < sec; t += step) { net.tick(step * 1000); for (const c of copies) c.game.advance(step); } }
adv(1.5); console.log('scenes', copies.map(c => c.game.sceneName), 'errs', copies.map(c => c.game.errors.length));
// card: enter answers ready
for (const c of copies) c.game.input.tap('confirm'); adv(.3);
console.log('ready', [...net.readySet]); net.cardTick(); adv(.2);
net.startRound(); adv(3.2);
console.log('scenes after start', copies.map(c => c.game.sceneName));
for (const c of copies) { const w = c.MT.worldNow; if (w) { const me = w.cs.find(q => q.kind === 'local'); if (me) me.auto = true; } }
let maxHost = 0;
for (let k = 0; k < 240; k++) { adv(1); if (k % 20 === 19) { const s = copies.map(c => { const sn = c.game.debug.snapshot(); return sn.room + ':' + sn.phase + ':' + sn.alive + ':' + sn.players.map(p => p.cash).join('/'); }); console.log(k + 1, s.join(' | '), 'size', copies[0].MT.net.maxSnap); }
  if (net.record) break; }
console.log('record', JSON.stringify(net.record && net.record.finish).slice(0, 300));
console.log('errors', copies.map(c => c.game.errors.map(e => (e.message || String(e)) + ' ' + (e.stack || '').split('\n').slice(0, 3).join('|'))));
console.log('stats', 'maxBytes', net.stats.maxBytes, 'dropped', net.stats.dropped, 'sent', net.copies.map(c => c._state.sent), 'recv', net.copies.map(c => c._state.recv));
