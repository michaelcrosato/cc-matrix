import { load } from '../lib/load.mjs';
const [hunt = 'hollow', n = '1', skill = 'expert', cheat = '1'] = process.argv.slice(2);
const L = load({ hash: '#hunt/' + hunt + '/' + n });
const { game, D, step, errs } = L;
step(.3); D.bot(true, { skill, cheat: cheat === '1' });
let last = '';
for (let t = 0; t < 90; t += .5) { step(.5); const s = D.snapshot(); const line = s.segment + ' ' + (s.sitePhase || '') + ' t=' + s.siteTime + ' score=' + (s.players[0] || {}).score + ' vis=' + s.actors.filter(a => a.visible).map(a => a.kind).join(',') + ' states=' + s.actors.map(a => a.kind[0] + ':' + a.state).join(' '); if (s.segment !== 'site') { console.log('->', s.segment, JSON.stringify(s.siteResults)); break; } if (t % 5 === 0) console.log(line); }
console.log('errs', errs().slice(0, 4));
