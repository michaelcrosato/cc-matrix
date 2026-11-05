import { boot } from '../tests/harness.mjs';
import { makeDriver } from '../tests/drive.mjs';
const c4 = boot(), O4 = c4.OLY, g4 = O4.game; g4.advance(.3);
const m4 = O4.flow.newMeet('games', { events: ['sprint', 'javelin', 'diving', 'hockey'], quick: true, players: [{ nat: 'SUN', input: 0, color: '#4a8aff' }, { nat: 'TRB', input: 1, color: '#ff4a4a' }] }); g4.addPlayer({ keys: 'right' }); O4.flow.begin(m4); O4.tune.set('hockey', 'periodLength', 20); g4.go('dayCard'); g4.advance(.6);
const D4 = makeDriver(c4); let last=''; for (let i = 0; i < 60000 && g4.sceneName !== 'title'; i++) { D4.step(.1); if (g4.errors.length) break; const x=O4.ctx; const k=g4.sceneName+' '+(x?x.phase+' '+(x.cur?x.cur.id:''):''); if(k!==last){last=k; if(i>0 && D4.log.length<60) console.log(i, k);} }
console.log(D4.log.join('>'), g4.errors.map(e=>e.message));
