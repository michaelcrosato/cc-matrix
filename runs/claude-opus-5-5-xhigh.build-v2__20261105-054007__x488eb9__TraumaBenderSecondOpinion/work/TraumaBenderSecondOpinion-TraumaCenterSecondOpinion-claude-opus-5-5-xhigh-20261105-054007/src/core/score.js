// Grades, Flow, slips, the Steady's charge, and the rank (section 5.6). Every finished action comes through award().
(() => {
const G = (window.GAME ||= {}), T = G.TUNING;
const Score = G.Score = {
  gradeMult: g => g === 'Textbook' ? T.gradeText : g === 'Clean' ? T.gradeClean : T.gradeSloppy,
  /** a finished action: popup, sound, Flow, score, Steady. base: its worth at Clean. o.steady: share of the charge (stitches: half) */
  award(S, h, x, y, grade, base = 100, o = {}) {
    if (grade !== 'Sloppy') { S.flow++; S.bestFlow = Math.max(S.bestFlow, S.flow); } else S.flow = 0;
    const fm = Math.min(T.flowMax, 1 + T.flowStep * S.flow), pts = base * Score.gradeMult(grade) * (grade === 'Sloppy' ? 1 : fm);
    S.score += pts; if (h) { h.score += pts; h.acts++; if (grade === 'Textbook') h.tb++; }
    const st = S.stats; if (grade === 'Textbook') st.tb++; else if (grade === 'Clean') st.cl++; else st.sl++;
    const k = o.steady === undefined ? 1 : o.steady;
    if (grade === 'Clean') Score.charge(S, T.steadyClean * k); else if (grade === 'Textbook') Score.charge(S, T.steadyText * k);
    S.ev.push(['grade', x, y, grade, h ? h.id : 0]);
    if (grade === 'Textbook') S.ev.push(['say', 'textbook']);
  },
  charge(S, n) { S.steady = Math.min(100, S.steady + n * T.chargeX); },
  /** a mistake: costs vitals, breaks Flow, shows in Results */
  slip(S, h, x, y, cost, why) {
    Score.hurt(S, cost * T.slipX); S.flow = 0; S.stats.slips++; if (h) { h.slips++; h.score = Math.max(0, h.score - 25); h.slipT = S.rt; }
    S.ev.push(['slip', x, y, why || '', h ? h.id : 0]); S.ev.push(['say', why === 'nerve' ? 'nerve' : 'slip']);
  },
  hurt(S, n) { if (S.dev && S.dev.lock) return; S.vitals = Math.max(0, S.vitals - n); },
  heal(S, n) { S.vitals = Math.min(99, S.vitals + n * T.healX); },
  /** the end bonus, then the rank against the case's par */
  finish(S) {
    const bonus = S.clock * 2 + S.vitals * 3; S.bonus = bonus; S.score += bonus;
    const def = G.CASES[S.caseId], par = def.par || 4000, f = S.score / par; let rank = f >= .95 ? 'S' : f >= .8 ? 'A' : f >= .6 ? 'B' : f >= .4 ? 'C' : 'D';
    if (S.capB && (rank === 'S' || rank === 'A')) rank = 'B';
    S.rank = rank; S.star = rank === 'S' && S.stats.slips === 0 && S.diff === 'attending' && !S.capB;
    return rank;
  },
  /** share of finished actions at Clean or better, for the Technique tile */
  technique(S) { const s = S.stats, n = s.tb + s.cl + s.sl; return n ? (s.tb + s.cl) / n : 1; },
};
})();
