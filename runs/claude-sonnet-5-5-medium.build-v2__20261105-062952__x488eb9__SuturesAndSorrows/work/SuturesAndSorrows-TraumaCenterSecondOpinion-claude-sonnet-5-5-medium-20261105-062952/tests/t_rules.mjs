import { playCase } from './lib.mjs';
export default async function ({ check, load }) {
  const ctx = load(); const G = ctx.GAME, Op = G.Op;
  const hash = S => { const c = Op.clone(S); delete c.ev; return JSON.stringify(c); };
  // determinism
  const a = playCase(G, 'c2', { maxT: 20, seed: 9 }), b = playCase(G, 'c2', { maxT: 20, seed: 9 });
  check('same seed + inputs = same state', hash(a.S) === hash(b.S));
  // vitals drain adds up (table 7): c1 base .1 + 4 shards*.1
  const S = Op.create(G.CASES.c1, { seed: 1 }); S.learn = false; const v0 = S.vitals; for (let i = 0; i < 60; i++) Op.step(S, [{ x: 20, y: 20, trig: 0, tool: 'forceps' }], 1 / 60);
  check('drain = base + hazards', Math.abs((v0 - S.vitals) - (.1 + .4) * G.DIFF.Resident.drain) < .02, v0 - S.vitals);
  // Long Breath: world .25, hands 1
  const L = Op.create(G.CASES.c1, { seed: 1, steady: 60 }); L.learn = false; const c0 = L.clock;
  Op.step(L, [{ x: 20, y: 20, trig: 0 }], 1 / 60); L.pl[0].gift = 1; Op.step(L, [{ x: 20, y: 20, trig: 0, gift: 1 }], 1 / 60); Op.step(L, [{ x: 20, y: 20, trig: 0 }], 1 / 60);
  const cl1 = L.clock; for (let i = 0; i < 60; i++) Op.step(L, [{ x: 20, y: 20, trig: 0 }], 1 / 60);
  check('long breath on', L.lb && Math.abs((cl1 - L.clock) - .25) < .02, `${L.lb} ${cl1 - L.clock}`);
  // Code Blue: vitals to zero, window, revive
  const C = Op.create(G.CASES.c2, { seed: 2 }); C.learn = false; C.vitals = 0; Op.step(C, [{ x: 20, y: 20, trig: 0 }], 1 / 60);
  check('code blue starts', !!C.cb);
  let hits = 0; const inp = { x: 20, y: 20, trig: 0 };
  for (let i = 0; i < 400 && C.cb; i++) { const ph = C.cb.ph; inp.trig = (ph > .49 && ph < .53 && C.cb.last < Math.floor(C.cb.t / .9)) ? 1 : 0; Op.step(C, [inp], 1 / 60); }
  check('code blue shock revives to 30', !C.cb && C.vitals === 30 && C.cbUsed, `${C.vitals} ${C.over}`);
  const D = Op.create(G.CASES.c2, { seed: 2, difficulty: 'Attending' }); D.learn = false; D.vitals = 0; Op.step(D, [inp], 1 / 60); check('attending has no code blue', D.over === 'lost');
  // Second Look restores exactly
  const R = Op.create(G.CASES.c7, { seed: 4, steady: 90 }); R.learn = false; R.doc = 'sokolova';
  for (let i = 0; i < 120; i++) Op.step(R, [{ x: 100, y: 100, trig: 0, tool: 'forceps' }], 1 / 60);
  const snap = Op.clone(R); const ref = R.buf.find(b => b.rt >= R.rt - 6); 
  for (let i = 0; i < 300; i++) Op.step(R, [{ x: 100, y: 100, trig: 0, tool: 'forceps' }], 1 / 60);
  const want = R.buf.find(b => b.rt >= R.rt - 6).st;
  Op.step(R, [{ x: 100, y: 100, trig: 0, gift: 1 }], 1 / 60);
  check('second look rewinds clock and vitals', Math.abs(R.clock - want.clock) < .03 && Math.abs(R.vitals - want.vitals) < .3 && R.sl > 0, `${R.clock} ${want.clock}`);
  check('second look spends 45 and fills ghosts', R.steady <= 90 + 20 - 45 + 5 && R.ghosts && R.ghosts.s.length > 20);
  // retry restores the phase start with the rank capped
  const Q = playCase(G, 'c2', { maxT: 30 }).S; const ph = Q.ph; Op.retry(Q); check('retry caps rank and restores phase', Q.capped && Q.ph === ph);
}
