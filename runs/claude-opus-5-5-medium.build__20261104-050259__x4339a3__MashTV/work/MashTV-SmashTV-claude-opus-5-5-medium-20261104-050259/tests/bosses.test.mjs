// each boss: the intro, then its phases in order; armor, weak points, patterns; the reward shower and the recap
import { boot, suite, until, errs } from './lib.mjs';
const setup = (g, room) => { g.MT.newRun({ mode: 'test', seed: 5, players: [{ slot: 0, look: 0, ctl: 'bot' }, { slot: 1, look: 1, ctl: 'bot' }] }); g.MT.CHEATS.god = true; g.game.go('play', { room, noCard: true }); g.adv(.3); return g.MT.Show.W; };
export default async () => {
  const S = suite('bosses'), g = boot(), MT = g.MT;
  // MASHY
  let W = setup(g, '1-B'), seen = new Set(), evs = new Set();
  const off = MT.on('world:bossPhase', d => seen.add(d.phase)), off2 = ['world:cannon', 'world:ring', 'world:throw', 'world:rev', 'world:bossBurst'].map(n => MT.on(n, () => evs.add(n)));
  until(g, () => W.boss && W.boss.introDone, 10);
  S.check('mashy intro ends', W.boss && W.boss.introDone);
  const body = W.boss.part('body'), h0 = body.hp; W.boss.damagePart(body, 10, null); S.check('mashy body tinks while an arm lives', body.hp > h0 - 2, body.hp + ' vs ' + h0);
  until(g, () => seen.has('p3') || W.boss.dead, 200);
  S.check('mashy phases in order', seen.has('p1') && seen.has('p2') && seen.has('p3'), [...seen].join(','));
  const h = W.boss.part('hatch'); h.open = true; const hb = body.hp; W.boss.damagePart(h, 5, null); S.check('the hatch is a x2 weak point', Math.abs((hb - body.hp) - 10) < .01, (hb - body.hp) + '');
  until(g, () => g.snap().scene === 'recap', 200);
  S.check('mashy patterns all fired', ['world:cannon', 'world:ring', 'world:throw', 'world:rev', 'world:bossBurst'].every(n => evs.has(n)), [...evs].join(','));
  S.check('mashy death leads to the recap', g.snap().scene === 'recap');
  off(); off2.forEach(f => f());
  // THE WHEEL: every segment via forced stops, then it breaks loose
  W = setup(g, '2-B'); until(g, () => W.boss && W.boss.introDone, 10);
  const lands = new Set(); const offL = MT.on('world:wheelLand', d => lands.add(d.name)); MT.CHEATS.god = true;
  W.boss.forced = [0, 1, 2, 3, 4, 5, 6, 7]; for (const p of W.boss.parts) if (p.seg !== undefined) p.armor = 0;
  until(g, () => lands.size >= 8, 200, .5);
  S.check('every wheel segment fires', lands.size >= 8, [...lands].join(','));
  for (const p of W.boss.parts) if (p.seg !== undefined) p.armor = 1; MT.setTune('dmgMul', 3, false); let p2 = false; const offP = MT.on('world:wheelLoose', () => { p2 = true; });
  until(g, () => p2, 120); S.check('the wheel breaks loose after 4 segments', p2);
  until(g, () => g.snap().scene === 'recap', 200); S.check('the wheel dies into the recap', g.snap().scene === 'recap');
  offL(); offP(); MT.resetTunes();
  // LANCE -> THE NETWORK
  W = setup(g, '3-B'); const le = new Set(); const offs = ['world:cyclone', 'world:micDrop', 'world:sweep', 'world:commercial', 'world:backFromBreak', 'world:robotReveal', 'world:networkReveal', 'world:channel', 'world:signalLost'].map(n => MT.on(n, () => le.add(n.slice(6))));
  until(g, () => W.boss && W.boss.introDone, 10); MT.setTune('dmgMul', .5, false);
  let away = false; until(g, () => { if (W.boss && W.boss.away && W.boss.form === 'starmaker' && !W.boss.revealing) away = true; return le.has('backFromBreak'); }, 160);
  S.check('commercial break: Lance leaves and returns', away && le.has('backFromBreak'), [...le].join(','));
  MT.setTune('dmgMul', 3, false);
  until(g, () => le.has('networkReveal') && W.boss && W.boss.phase === 'pB', 160);
  S.check('the robot reveal leads to The Network', le.has('robotReveal') && W.boss && W.boss.form === 'network', [...le].join(','));
  const eye = W.boss.part('eye'); S.check('THE EYE is armored while most TVs live', eye.armor() < .3);
  until(g, () => W.boss.parts.filter(p => p.tv !== undefined && p.alive).length <= 4, 120);
  S.check('THE EYE opens after 8 TVs', eye.armor() >= 1);
  until(g, () => g.snap().scene === 'recap', 200);
  S.check('lance patterns all fired', ['cyclone', 'micDrop', 'sweep', 'channel', 'signalLost'].every(n => le.has(n)), [...le].join(','));
  S.check('the network dies into the recap', g.snap().scene === 'recap');
  offs.forEach(f => f()); MT.resetTunes(); MT.CHEATS.god = false;
  S.check('no errors', g.game.errors.length === 0, errs(g).slice(0, 3).join(' | '));
  return S;
};
