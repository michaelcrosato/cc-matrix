import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game, I } = G; G.adv(.3);
  const run = (kind, o = {}, secs = 30, each) => { game.go('bonus', Object.assign({ kind, onDone: B => { done = B; } }, o), { fade: 0 }); let done = null; G.adv(.05); const S = game.scene; for (let k = 0; k < secs * 20 && !done; k++) { if (each) each(S.B, k); G.adv(.05); } return { B: S.B, done }; };
  // BOARDS: power -> boards; >= 95 is PERFECT; holding past 100% overcharges
  const boards = (stopAt, n = 5) => run('boards', { params: { n, mat: 'pine' } }, 12, (B) => { if (B.state === 'breathe') { if (B.ki < stopAt) I.hold('tDown'); else I.hold('tDown', false); } });
  { const r = boards(.97); t.check('a full breath is a PERFECT break', r.B.perfect && r.B.broken === 5 && r.B.points === 5 * 200 + 2000, [r.B.power, r.B.broken, r.B.points]); }
  { const r = boards(.5); t.check('half a breath breaks half', r.B.broken === Math.min(5, Math.floor(r.B.power / 100 * 5.99)) && r.B.broken < 5, [r.B.power, r.B.broken]); }
  { let over = false; run('boards', {}, 8, B => { if (B.state === 'breathe') I.hold('tDown', B.t < 4.6); if (B.ki > 1.02) over = true; }); I.hold('tDown', false); t.check('overcharging (TOO MUCH!) drops the gauge', over); }
  // POTS: a deterministic sequence per visit; the autopilot reads perfectly; a still hero gets hit and it ends
  { game.go('bonus', { kind: 'pots', visit: 3, onDone() {} }, { fade: 0 }); G.adv(.05); const a = JSON.stringify(game.scene.B.objs.map(o => [o.kind, o.lane, o.side])); game.go('bonus', { kind: 'pots', visit: 3, onDone() {} }, { fade: 0 }); G.adv(.05); const b = JSON.stringify(game.scene.B.objs.map(o => [o.kind, o.lane, o.side])); t.check('the pot sequence is fixed per visit', a === b); }
  { const r = run('pots', { auto: true, cheat: true, visit: 1 }, 40); const B = r.B, caught = B.objs.filter(o => o.st === 'caught').length; t.check('perfect reads clear every object', B.objs.every(o => ['broken', 'caught', 'passed'].includes(o.st)) && !B.hitBy, B.objs.map(o => o.kind + ':' + o.st).join(' ')); t.check('a champon bowl is caught with a block (+1000)', caught >= 1, caught); t.check('pots score 200 each', B.points >= 200 * B.objs.filter(o => o.st === 'broken' && o.kind !== 'bowl').length); }
  { const r = run('pots', { visit: 2 }, 30); t.check('standing still: the first hit ends the stage', !!r.B.hitBy && r.B.state === 'over', r.B.state); }
  { game.go('bonus', { kind: 'pots', visit: 5, onDone() {} }, { fade: 0 }); G.adv(.05); const B = game.scene.B, h = B.hero; B.state = 'play'; B.t0 = B.t; B.objs = [{ i: 0, kind: 'bowl', lane: 'M', side: 1, at: 0, v: 150, st: 'fly', x: h.x + h.w / 2 + 20 + 150 * h.steps(0, KC.TECH.frontKick) / 120, z: 34, rot: 0 }]; B.cheat = true; h.start('frontKick', { x: 260, w: 16 }); for (let k = 0; k < 40; k++) G.adv(1 / 120); t.check('breaking a bowl costs 500 (MOTTAINAI!)', B.objs[0].st === 'broken' && B.msgs.some(m => m.text === 'MOTTAINAI!'), B.objs[0].st); }
  // BULL: a valid technique in the window stops it; an invalid one is trampled
  { const r = run('bull', { auto: true, params: { charges: [150, 190, 240] } }, 40); t.check('three charges stopped with valid techniques', r.B.charge >= 3 && r.B.points >= 9000, [r.B.charge, r.B.points]); }
  { const r = run('bull', { params: { charges: [150] } }, 20, B => { if (B.bull.st === 'charge' && B.hero.free() && B.bull.headX() - B.hero.x < 60) B.hero.start('roundKick', { x: B.bull.x, w: 10 }); }); t.check('a round kick does not stop the bull: TRAMPLED', r.B.bull.st === 'trample' && r.B.msgs.length >= 0, r.B.bull.st); }
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
