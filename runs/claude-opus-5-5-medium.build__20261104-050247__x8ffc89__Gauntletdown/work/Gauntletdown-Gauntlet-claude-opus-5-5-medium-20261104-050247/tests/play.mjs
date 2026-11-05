// Play suite: the scripted playthrough of the whole game, a balance smoke run, the attract loop, local four players.
import { boot } from './lib.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const ORDER = ['f1', 'f2', 'f3', 't1', 'f4', 'f5', 'f6', 't2', 'f7', 'f8', 'f9'];
function descent(seed) {
  const t = boot({ quiet: true, seed }), { D } = t; t.step(.3);
  D.start(['berserker', 'hexer'], { seed, noCard: true }); t.step(.6);
  D.CHEAT.god = true;   // God mode only: no other cheats
  const seen = [], phases = [], log = [];
  let limitHit = null, guard = 0, last = null, floorT = 0;
  while (guard++ < 20000) {
    const s = t.snap();
    if (s.scene === 'card') { t.I.tap('fire'); t.step(1); continue; }
    if (s.scene === 'ending') break;
    if (s.scene === 'play') {
      if (s.floor !== last) { last = s.floor; seen.push(s.floor); floorT = 0; for (let i = 0; i < D.PARTY.length; i++) D.bot(i, true, false, { noSkip: true }); D.PARTY[1].input = null; }
      if (s.boss && !phases.includes(s.boss.phase)) phases.push(s.boss.phase);
    }
    t.step(1); floorT += 1;
    if (floorT > 360) { limitHit = last + ' (' + (D.PARTY[0].bot && D.PARTY[0].bot.think) + ')'; break; }
  }
  const scoresAtEnd = D.PARTY.map(h => h.score);
  // the ending, the credits, then Descent II's first floor
  t.step(1.6); t.I.tap('fire'); t.step(1.7); t.I.tap('fire'); t.step(1.2);
  const choiceScene = t.snap().scene; t.I.tap('confirm'); t.step(1.5);
  const d2 = t.snap();
  return { t, seen, phases, limitHit, hash: D.stateHash(), scoresAtEnd, choiceScene, d2, errors: t.errors() };
}
export default async function (check) {
  const a = descent(42);
  check('the playthrough visits every floor in order', JSON.stringify(a.seen) === JSON.stringify(ORDER), a.seen.join(' '));
  check('every floor is finished by the bots within 6 minutes', !a.limitHit, a.limitHit);
  check('the King\'s phases come in order', JSON.stringify(a.phases) === '[1,2,3]', JSON.stringify(a.phases));
  check('the ending, the credits, then the Descent II choice', a.choiceScene === 'ending', a.choiceScene);
  check('Descent II begins on floor 1, harder', a.d2.loop === 2 && a.d2.floor === 'f1', JSON.stringify({ loop: a.d2.loop, floor: a.d2.floor, scene: a.d2.scene }));
  check('the playthrough raised no errors', !a.errors.length, a.errors.join(' | '));
  const b = descent(42);
  check('the same seed gives the same game (state hash)', a.hash === b.hash, a.hash + ' vs ' + b.hash);
  // balance smoke: one bot, no cheats, Easy, floors 1-3
  const metrics = [];
  {
    const t = boot({ quiet: true, seed: 5 }), { D } = t; t.step(.3);
    t.game.settings.set('difficulty', 'Easy');
    D.start(['shieldmaiden'], { seed: 5, noCard: true }); t.step(.6); D.bot(0, true, false, { noSkip: true });
    let last = 'f1', ft = 0, hpAtStairs = [];
    for (let k = 0; k < 1500; k++) {
      const s = t.snap();
      if (s.scene === 'card') { t.I.tap('fire'); t.step(1); continue; }
      if (s.scene !== 'play') break;
      if (s.floor !== last) { metrics.push({ floor: last, time: ft, hp: hpAtStairs }); last = s.floor; ft = 0; D.bot(0, true, false, { noSkip: true }); }
      if (s.floor === 't1' || s.floor === 'f4') break;
      hpAtStairs = s.heroes[0].hp; t.step(1); ft++;
    }
    const s = t.snap();
    check('balance: one bot on Easy clears floors 1-3 alive', (s.floor === 't1' || s.floor === 'f4') && s.heroes[0].alive, JSON.stringify({ floor: s.floor, scene: s.scene, hp: s.heroes[0].hp, m: metrics }));
  }
  {
    const t = boot({ quiet: true, seed: 8 }), { D } = t; t.step(.3);
    D.start(['berserker'], { seed: 8, noCard: true }); t.step(.6); D.bot(0, true, false, { noSkip: true });
    let hp = 0, done = false;
    for (let k = 0; k < 400; k++) { const s = t.snap(); if (s.floor !== 'f1') { done = true; break; } hp = s.heroes[0].hp; t.step(.5); }
    metrics.push({ floor: 'f1-normal', hp });
    check('balance: one bot on Normal finishes floor 1 with 300+ health', done && hp >= 300, JSON.stringify({ done, hp }));
  }
  mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
  writeFileSync(new URL('./out/balance.json', import.meta.url), JSON.stringify(metrics, null, 1));
  // the attract loop: 90 s, every segment, it loops, and an input exits
  {
    const t = boot({ quiet: true, seed: 3 }), { D } = t; t.step(10.5);
    const segs = new Set(); for (let k = 0; k < 210; k++) { t.step(.5); segs.add(D.ATTRACT.seg); }
    check('the attract loop plays every segment and loops', segs.size === 7, [...segs].join());
    check('...with no errors', !t.errors().length, t.errors().join(' | '));
    t.I.tap('start'); t.step(.3);
    check('...and an input exits it', t.snap().scene === 'title' && !t.snap().attract, t.snap().scene);
  }
  // four local players: two keyboard halves and two pads, a drop-out
  {
    const t = boot({ quiet: true, seed: 4 }), { D, game } = t; t.step(.3);
    D.start(['berserker'], { seed: 4, noCard: true }); t.step(.6);
    const p2 = game.addPlayer({ keys: 'right' }), p3 = game.addPlayer({ pad: 1 }), p4 = game.addPlayer({ pad: 2 });
    t.step(.1);
    for (const p of [p2, p3, p4]) { p.tap('fire'); }
    t.step(.6); for (const p of [p2, p3, p4]) p.tap('fire'); t.step(.2);
    const cls = D.PARTY.map(h => h.cls);
    check('four players: every class plays, none twice', D.PARTY.length === 4 && new Set(cls).size === 4, cls.join());
    t.step(5);
    check('four players: the floor runs', t.snap().scene === 'play' && !t.errors().length, t.errors().join('|'));
  }
}
