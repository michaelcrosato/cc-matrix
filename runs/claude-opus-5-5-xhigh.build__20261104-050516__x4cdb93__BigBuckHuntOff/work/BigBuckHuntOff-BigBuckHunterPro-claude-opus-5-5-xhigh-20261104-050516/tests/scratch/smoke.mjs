import { load } from '../lib/load.mjs';
const t0 = Date.now();
const L = load({ hash: '#hunt/hollow/1' });
const { game, D, step, errs } = L;
step(.5);
console.log('scene', game.sceneName, 'errs', errs());
step(2);
let s = D.snapshot(); console.log('seg', s.segment, 'site', s.site, 'actors', s.actors.length, 'queue', s.queue.join(','));
step(8); s = D.snapshot(); console.log('t', s.siteTime, 'actors', s.actors.map(a => a.kind + ':' + a.state + '@' + a.x + ',' + a.y).join(' '));
const buck = s.actors.find(a => a.target && a.state !== 'hidden' && a.cat === 'animal');
if (buck) { D.aimAt(1, buck.id, 'heart'); D.fire(1); step(.2); s = D.snapshot(); console.log('after shot', JSON.stringify(s.players[0]), JSON.stringify(s.actors.find(a => a.id === buck.id))); }
step(60); s = D.snapshot(); console.log('later seg', s.segment, JSON.stringify(s.siteResults), 'errs', errs().slice(0, 5), 'ms', Date.now() - t0);
