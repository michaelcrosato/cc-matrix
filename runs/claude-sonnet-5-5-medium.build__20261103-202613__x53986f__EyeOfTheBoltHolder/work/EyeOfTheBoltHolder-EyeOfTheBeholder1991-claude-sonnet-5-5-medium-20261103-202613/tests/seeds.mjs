import { run } from './bot.test.mjs';
const seeds = process.argv.slice(2).map(Number);
for (const seed of seeds) { const t = Date.now(); const o = run({ seed, maxSeconds: 900 }); console.log(seed, 'ended', o.ended, 'over', o.over, 'floor', o.floor, 'sim t', o.t.toFixed(0), o.party.join(','), ((Date.now() - t) / 1000).toFixed(0) + 's wall'); }
