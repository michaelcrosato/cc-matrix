// A full playthrough, headless: every episode's steps by real input (interact, the menus, the cook played by its timing),
// with teleports between places (walking is tested in systems.mjs) and combat finished by killAll after real hits land.
import { load, check, done } from './lib.mjs';
const t = load('');
const { I, dbg } = t, S = () => t.snap();
const at = (p, dy = 0) => { dbg.teleport(p.x, p.y + dy); t.adv(.1); };
const use = () => { t.tap('interact'); t.adv(.25); };
function cook() {
  let m = dbg.modal(), n = 0;
  if (!m || m.kind !== 'cook') return null;
  let pur = null;
  while (dbg.modal() === m && n++ < 120 * 60) {
    if (dbg.talk.open && !m) break;
    const ph = m.phase;
    if (ph === 'measure' && m.t > .3 && Math.abs(m.needle - m.zone.c) < m.zone.w * .12) I.tap('interact');
    if (ph === 'heat') { const b = m.band(); I.hold('interact', m.temp < (b[0] + b[1]) / 2); }
    if (ph === 'cryst') { I.hold('interact', false); const live = m.rings.find(g => !g.done); if (live && Math.abs(m.ringR(live) - 9) < 1) I.tap('interact'); }
    if (ph === 'result') { pur = m.purity; if (m.t > 1) I.tap('confirm'); }
    t.adv(1 / 120);
  }
  return pur;
}
t.adv(.5); t.tap('confirm'); t.adv(1);      // NEW GAME (the first entry without a save)
check('ep1: in town', S().scene === 'town' && S().stepId === 'dusty', JSON.stringify(S()));
at(dbg.spot.dusty, 6); check('ep1: Dusty is in reach', S().near === 'dusty', S().near);
use(); t.talkThrough();
check('ep1: talking to Dusty -> cook step, Dusty follows', S().stepId === 'cook1' && S().partner, JSON.stringify(S()));
at(dbg.spot.rv); check('ep1: the RV is in reach', S().near === 'rv', S().near);
use(); check('ep1: the RV menu opens', S().modal === 'menu', S().modal);
t.tap('confirm'); check('ep1: Cook a batch starts the cook', S().modal === 'cook', S().modal);
const p1 = cook(); t.adv(.2);
check('ep1: a well-timed cook is pure (>= 90%)', p1 >= 90, p1);
check('ep1: product added', S().product === 6, S().product);
t.talkThrough();
check('ep1: next, Rafa', S().stepId === 'rafa', S().stepId);
at(dbg.spot.rafa, 14); check('ep1: Rafa in reach', S().near === 'rafa', S().near);
use(); t.talkThrough();
check('ep1: Rafa\'s crew attacks (4)', S().stepId === 'fight1' && S().enemies === 4, JSON.stringify(S()));
// real hits first: a flask thrown at the nearest thug
const W = dbg.level(), h = W.hero, e0 = W.enemies[0], hp0 = e0.hp;
dbg.teleport(e0.x - 40, e0.y); h.facing = 0; h.aim = 0; t.adv(.05); I.tap('throw'); t.adv(1);
check('ep1: a thrown fulminate flask hurts', e0.hp < hp0 || e0.dead, hp0 + ' -> ' + e0.hp);
dbg.killAll(); t.adv(.5); t.talkThrough();
check('ep1: Rafa pays $5,000', S().dirty >= 5000, S().dirty);
check('ep2 begins: see Lenny', S().ep === 2 && S().stepId === 'lenny', JSON.stringify(S()));
t.adv(1); at(dbg.spot.lenny, 4); check('ep2: Lenny\'s office in reach', S().near === 'lenny', S().near); use(); t.talkThrough();
check('ep2: smoke unlocked, deals step', S().stepId === 'deals' && S().flasks.smoke >= 2, JSON.stringify(S()));
check('ep2: DEA on patrol', S().agents.length >= 2, JSON.stringify(S().agents));
t.adv(3); check('ep2: buyers on corners', S().buyers >= 2, S().buyers);
for (let k = 0; k < 3; k++) {
  const W2 = dbg.level(); W2.agents.forEach(a => { a.stun = 99; });       // the agents look away for this test (detection is tested in systems)
  let b = W2.buyers[0], waited = 0; while (!b && waited++ < 40) { t.adv(.5); b = W2.buyers[0]; }
  if (S().product <= 0) { at(dbg.spot.rv); use(); t.tap('confirm'); cook(); t.adv(.2); t.talkThrough(); }
  b = W2.buyers[0]; at(b, 8); const before = S().dirty; use(); t.talkThrough();
  check('ep2: deal ' + (k + 1) + ' pays', S().dirty > before, before + ' -> ' + S().dirty);
}
check('ep2: launder step', S().stepId === 'launder', S().stepId);
at(dbg.spot.carwash, 2); use(); check('ep2: car wash menu', S().modal === 'menu'); const d0 = S().dirty; t.tap('confirm'); t.talkThrough();
check('ep2: laundering turns dirty into clean at 80%', S().dirty === 0 && S().clean === Math.floor(d0 * .8), JSON.stringify([d0, S().clean]));
check('ep2: sleep step', S().stepId === 'sleep2', S().stepId);
at(dbg.spot.home, 2); check('ep2: home in reach', S().near === 'home', S().near); use(); t.adv(1);
check('ep2: night scene', S().scene === 'night', S().scene); t.talkThrough(); t.adv(2);
check('ep3 begins in town, day 2', S().scene === 'town' && S().ep === 3 && S().day === 2, JSON.stringify(S()));
// buy glassware at Lenny's
dbg.level().agents.forEach(a => { a.stun = 99; });
at(dbg.spot.lenny, 4); use(); check('ep3: Lenny\'s shop opens', S().modal === 'menu');
t.tap('confirm'); t.adv(.1);
check('ep3: bought glassware with clean cash', S().up.glass === true, JSON.stringify(S().up));
t.adv(.3); t.tap('cancel'); t.adv(.3);
at(dbg.spot.taco, 4); use(); t.talkThrough();
check('ep3: Vela wants 90%', S().stepId === 'cook90', S().stepId);
at(dbg.spot.rv); use(); t.tap('confirm'); const p3 = cook(); t.adv(.2); t.talkThrough();
check('ep3: a 90%+ batch passes', p3 >= 90 && S().stepId === 'deliver', p3 + ' ' + S().stepId);
dbg.level().agents.forEach(a => { a.stun = 99; });
at(dbg.spot.back, 0); check('ep3: back door in reach', S().near === 'back', S().near); use();
let n = 0; while (S().talking && n++ < 300) { const tk = dbg.talk; if (tk.choices && !tk.typing) { I.tap('confirm'); t.adv(.1); } else { I.tap('confirm'); t.adv(.06); } }
t.adv(.5); t.talkThrough(); t.adv(4);
check('ep3: delivered, $20,000, alias Schrodinger', S().alias && S().stepId === 'sleep3' && S().dirty >= 20000, JSON.stringify(S()));
at(dbg.spot.home, 2); use(); t.adv(1); t.talkThrough(); t.adv(2);
check('ep4 begins', S().ep === 4 && S().stepId === 'arena', JSON.stringify(S()));
dbg.level().agents.forEach(a => { a.stun = 99; });
at(dbg.spot.arena, 0); t.adv(.3); t.talkThrough(); t.adv(.2);
check('ep4: the cousins (2 bosses)', S().stepId === 'cousins' && S().enemies === 2, JSON.stringify(S()));
dbg.killAll(); t.adv(.5); t.talkThrough();
check('ep4: talk to Lenny', S().stepId === 'lenny4', S().stepId);
dbg.level().agents.forEach(a => { a.stun = 99; });
at(dbg.spot.lenny, 4); use(); t.talkThrough();
at(dbg.spot.home, 2); use(); t.adv(1); t.talkThrough(); t.adv(2);
check('ep5 begins', S().ep === 5 && S().stepId === 'laundry', JSON.stringify(S()));
dbg.level().agents.forEach(a => { a.stun = 99; });
at(dbg.spot.laundry, 0); check('ep5: laundry door in reach', S().near === 'laundry', S().near); use(); t.adv(1.5);
check('ep5: the superlab', S().scene === 'lab' && S().stepId === 'labclear' && S().enemies === 6, JSON.stringify(S()));
t.talkThrough(); dbg.killAll(); t.adv(.5); t.talkThrough();
check('ep5: confront Vela', S().stepId === 'final', S().stepId);
at(dbg.labSpot.vela, 12); check('ep5: Vela in reach', S().near === 'vela', S().near); use(); t.talkThrough(); t.adv(1);
check('the ending plays', S().scene === 'ending', S().scene);
t.adv(3); for (let i = 0; i < 8; i++) { t.tap('confirm'); t.adv(.1); }
check('the credits roll', S().scene === 'credits', S().scene);
t.adv(2); t.tap('confirm'); t.adv(1);
check('back to the title', S().scene === 'title', S().scene);
check('no errors in the whole playthrough', !t.errors().length, t.errors().join(' | '));
done();
