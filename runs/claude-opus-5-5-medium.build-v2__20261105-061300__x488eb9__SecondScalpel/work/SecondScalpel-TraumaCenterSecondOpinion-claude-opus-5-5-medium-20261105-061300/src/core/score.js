// Grades, Flow, slips, vitals and ranks. Every finished action comes through G.grade; every mistake through G.slip.
(() => {
const G = (window.GAME ||= {}), { clamp, ev } = G;
const MULT = { sloppy: .4, clean: 1, textbook: 1.5 };
G.grade = (S, p, x, y, g, verb, base = 10) => {
  S.acts[g]++; if (p) p.stats[g]++;
  if (g === 'sloppy') S.flow = 0; else { S.flow++; if (S.flow > S.bestFlow) S.bestFlow = S.flow; }
  const fm = 1 + Math.min(20, S.flow) * .05, pts = base * MULT[g] * fm;
  S.score += pts; if (p) p.score += pts;
  if (g !== 'sloppy') G.charge(S, g === 'textbook' ? 10 : 5);
  ev(S, 'grade', Math.round(x), Math.round(y), g, p ? p.id : 0);
  G.didVerb(S, verb);
};
G.didVerb = (S, verb) => { if (S.tut && S.tut.verb === verb) { S.tut = null; ev(S, 'tutdone', verb); } };
G.charge = (S, n) => { S.steady = clamp(S.steady + n * G.T.chargeX, 0, 100); };
G.hurt = (S, n) => { if (S.tut || S.lock || G.CHEATS.lockVitals || S.closing) return; S.v = Math.max(0, S.v - n); };
G.heal = (S, n) => { S.v = Math.min(99, S.v + n * G.T.healX); };
G.slip = (S, p, x, y, dmg, why) => {
  S.slips++; S.flow = 0; if (p) p.stats.slips++;
  G.hurt(S, dmg * G.T.slipX); ev(S, 'slip', Math.round(x), Math.round(y), why || 'slip', p ? p.id : 0);
};
G.rankOf = (S, par) => {
  const k = par > 0 ? S.finalScore / par : 0; let r = k >= .95 ? 'S' : k >= .8 ? 'A' : k >= .6 ? 'B' : k >= .4 ? 'C' : 'D';
  if (S.capB && (r === 'S' || r === 'A')) r = 'B';
  return { rank: r, star: r === 'S' && S.diffId === 'attending' && S.slips === 0 };
};
G.finalize = S => { S.finalScore = Math.round(S.score + S.clock * 2 + S.v * 3 + (S.dressBonus || 0)); };
})();
