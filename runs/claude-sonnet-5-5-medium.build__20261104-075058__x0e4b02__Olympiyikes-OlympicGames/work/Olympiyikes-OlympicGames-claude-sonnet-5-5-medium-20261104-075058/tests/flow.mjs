// scripted playthrough of the whole game through the real menus: title -> menu -> The Games -> 12 days -> closing -> credits
import { load } from './lib.mjs';
const ctx = load(); const O = ctx.OLY, game = O.game, I = game.input;
const out = []; let fails = 0, checks = 0;
const check = (name, ok, detail = '') => { checks++; if (!ok) { fails++; out.push('FAIL ' + name + (detail ? ': ' + detail : '')); } };
const seen = new Set(); const sceneLog = [];
const step = (dt = .1) => { game.advance(dt); if (O.cur && !seen.has(O.cur)) { seen.add(O.cur); sceneLog.push(O.cur); } };
for (let i = 0; i < 5; i++) step();
check('boots to the title', O.cur === 'title', O.cur);
// the touch of a button leaves the title
step(.7); I.tap('confirm'); step(.5); check('menu after confirm', O.cur === 'menu', O.cur);
step(.4); // THE GAMES is the first item (no save)
check('THE GAMES focused', O.curDef.items[O.curDef.menu.i].id === 'games', O.curDef.items[0].id);
I.tap('confirm'); step(.6); check('setup', O.cur === 'gamesSetup', O.cur);
step(.6); for (let k = 0; k < 3; k++) { I.tap('down'); step(.1); } I.tap('confirm'); step(.7); check('nations', O.cur === 'nations', O.cur);
step(.6); I.tap('confirm'); step(.2); for (let k = 0; k < 20; k++) step(.1);
check('nation locked, meet started', O.meet && O.meet.mode === 'games', O.meet && O.meet.mode);
O.cheat.perfect = true;   // the bot plays for the human, through the same event code
let t = 0, last = '', stuck = 0, maxDay = 0;
while (O.cur !== 'closing' && t < 6000) {
  step(.25); t += .25;
  if (O.cur === 'results' || O.cur === 'podium' || O.cur === 'medals' || O.cur === 'daycard' || O.cur === 'eventcard' || O.cur === 'torch' || O.cur === 'beat' || O.cur === 'initials') { if (Math.floor(t * 4) % 4 === 0) I.tap('confirm'); I.tap('action'); }
  if (O.cur === 'initials') { /* confirm thrice */ }
  if (O.meet) maxDay = Math.max(maxDay, O.meet.day);
  if (O.cur === last) stuck += .25; else { stuck = 0; last = O.cur; }
  if (stuck > 120) { check('no scene stuck', false, O.cur + ' for 120 s'); break; }
}
check('reaches the closing ceremony', O.cur === 'closing', O.cur + ' day ' + (O.meet && O.meet.day));
check('played all 12 days', maxDay >= 11, 'maxDay ' + maxDay);
const mt = O.medalTable(O.meet); check('medal table ranks 8 nations', mt.length === 8);
check('gold medals were handed out', mt.reduce((a, b) => a + b.g, 0) === 12, mt.map(x => x.g).join(','));
for (const s of ['title', 'menu', 'gamesSetup', 'nations', 'opening', 'daycard', 'eventcard', 'play', 'results', 'podium', 'medals', 'beat']) check('scene visited: ' + s, seen.has(s));
for (let k = 0; k < 2; k++) { I.tap("confirm"); step(1.2); }
check('credits return to the title', O.cur === 'title' || O.cur === 'closing', O.cur);
check('no errors in the whole playthrough', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 3).join(' | '));
if (out.length) console.log(out.join('\n')); console.log(fails ? `${fails} of ${checks} flow checks FAILED` : `all ${checks} flow checks passed`); process.exit(fails ? 1 : 0);
