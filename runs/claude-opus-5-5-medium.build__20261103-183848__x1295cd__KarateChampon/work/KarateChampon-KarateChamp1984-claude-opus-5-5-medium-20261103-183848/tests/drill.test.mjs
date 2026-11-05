import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game, I } = G; G.adv(.3);
  const start = lesson => { let res = null; game.go('practice', { lesson, onDone: S => { res = S; } }, { fade: 0 }); G.adv(.05); return { S: game.scene, get res() { return res; } }; };
  const toYou = S => { for (let k = 0; k < 200 && S.state !== 'you'; k++) G.adv(.05); };
  // each drill accepts its technique (autopilot) for every lesson
  for (const L of ['I', 'II', 'III']) { const r = start(L); r.S.d.autopilot = true; for (let k = 0; k < 2400 && !r.res; k++) G.adv(.05); t.check('lesson ' + L + ' completes with every drill', r.res && r.res.good === KC.DATA.lessons[L].drills.length, r.res && [r.res.good, r.res.i]); }
  // a wrong technique: NO. WATCH AGAIN.; after 3 misses a hint shows
  { const r = start('I'), S = r.S; toYou(S); S.hero.start('lowKick', { x: 270, w: 16 }); S.attempt('lowKick', 'lowKick'); t.check('a wrong technique is rejected', S.result === 'wrong' && S.misses === 1); S.state = 'you'; S.attempt('lowKick', 'lowKick'); S.state = 'you'; S.attempt('lowKick', 'lowKick'); t.check('3 misses -> a hint', S.misses >= 3 && KC.hintFor(KC.TECH.frontKick).length > 0); }
  // SHARP within 50 frames, GOOD later
  { const r = start('I'), S = r.S; toYou(S); S.st = .3; S.attempt('frontKick', 'frontKick'); t.check('a quick copy is SHARP (+400)', S.result === 'sharp' && S.points === 400, [S.result, S.points]); }
  { const r = start('I'), S = r.S; toYou(S); S.st = 2; S.attempt('frontKick', 'frontKick'); t.check('a slow copy is GOOD (+200)', S.result === 'good' && S.points === 200, [S.result, S.points]); }
  // a reverse punch drill is passed by its stick input (front kick's cell, close in)
  { const r = start('II'), S = r.S; S.i = 2; toYou(S); S.attempt('frontKick', 'frontKick'); t.check('the reverse punch drill takes N + toward', S.result === 'good' || S.result === 'sharp', S.result); }
  // start skips a drill
  { const r = start('I'), S = r.S; toYou(S); const i = S.i; I.tap('start'); G.adv(.1); t.check('start skips a drill', S.i === i + 1, [i, S.i]); }
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
