import { freePlay, hold } from '../tests/lib/boot.mjs';
import { Bot } from '../tests/lib/bot.mjs';
const { e, g } = await freePlay(); const b = new Bot(e, g);
console.log('fauna', JSON.stringify(g.state().fauna), e.errors.slice(0,2));
g.setWeather('dust'); e.step(120); g.setWeather('clear');
// M4
g.story.done.push('m1','m2'); g.story.met.dov = true; g.missions.begin('m4'); b.tp(200, 420); b.until(()=>g.missions.cur.step.do==='destroy',300,10);
const cv = g.vehSys.list.filter(v=>v.tag==='convoy'); console.log('convoy', cv.length); for (const v of cv) v.damage(999,'bullet'); b.step(30);
console.log('m4 step', g.missions.cur.step.do, g.story.tracker, e.errors.slice(0,2));
const c = g.mission.caseRef; b.tp(c.x, c.z + 1); b.step(10); b.hold('KeyE', 90); b.step(10); console.log('case taken', c.taken, g.missions.cur.step.do);
// M5 without alt
g.missions.abort(); g.story.done.push('m3'); g.missions.begin('m5'); b.tp(-330, 380); b.until(()=>g.missions.cur.step.do==='destroy',300,10);
const pump = g.sitesSys.things.find(t=>t.tag==='pump'); console.log('pump', !!pump); b.tp(pump.x-12,pump.z); g.weapons.give('tube',100); g.weapons.equipSlot('special',true); for(let k=0;k<3&&!pump.dead;k++){ g.weapons.cooldown=0; g.weapons.gunState().mag=1; b.aim(pump.x,pump.y+1,pump.z); b.fire(4); b.step(100);} console.log('pump dead', pump.dead, g.missions.cur.step.do, e.errors.slice(0,2));
