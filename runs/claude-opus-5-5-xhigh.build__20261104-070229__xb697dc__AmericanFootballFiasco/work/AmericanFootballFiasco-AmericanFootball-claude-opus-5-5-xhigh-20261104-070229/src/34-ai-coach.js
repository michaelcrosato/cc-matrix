// The coach AI: CPU play calling, 4th downs, PATs, Fiasco Cards, and the COACH SAYS pick for a human side.
(() => {
'use strict';
const FF = window.FF, u = FF.u, T = FF.T, YD = 16;
const P = () => FF.data.plays;
const coach = FF.coach = {};
/** the situation, seen from side s */
coach.situation = (m, s) => {
  const off = s === m.poss, own = m.ydOf(m.poss, m.los), lead = m.score[s] - m.score[1 - s];
  const timeLeft = (m.quarter >= 4 || m.quarter === 2 ? m.clock : m.clock + m.qLen * (m.quarter === 1 ? 1 : m.quarter === 3 ? 1 : 0)) + (m.quarter <= 2 ? 0 : 0);
  return { off, down: m.down, toGo: m.toGo, own, toEZ: 100 - own, lead, trailing: lead < 0, trailingBy: -lead, timeLeft, quarter: m.quarter, late: (m.quarter >= 4 || m.quarter === 2) && m.clock < 60,
    redZone: 100 - own <= 20, fgYards: m.fgDistance(), pat: m.callKind === 'pat', passCall: false, usedHot: !!m.usedHot };
};
coach.call = (m, s, forHuman) => {
  const k = m.callKind, c = coach.situation(m, s), t = m.teams[s], ai = t.ai, R = FF.r;
  let play, flip = R() < .5, card = null;
  if (k === 'kickoff') {
    if (s === m.poss) play = (c.trailingBy > 0 && c.trailingBy <= 8 && m.quarter >= 4 && m.clock < 120) ? 'ko_onside' : R() < .07 ? 'ko_squib' : 'ko_deep';
    else { const opp = coach.situation(m, 1 - s); play = opp.trailingBy > 0 && opp.trailingBy <= 8 && m.quarter >= 4 && m.clock < 120 ? 'hands_team' : u.pick(['ret_mid', 'ret_mid', 'ret_left', 'ret_right']); }
  } else if (k === 'pat') {
    if (s === m.poss) { const diff = m.score[s] - m.score[1 - s]; play = (m.quarter >= 3 && [-2, -5, -9, -10, -12, 1, 5].includes(diff - 0)) ? 'pat_two' : 'pat_kick'; if (m.patNoTwo) play = 'pat_kick'; }
    else play = 'fg_block';
  } else if (s === m.poss) {
    play = coach.offense(m, s, c, ai, R);
  } else {
    play = coach.defense(m, s, c, ai, R);
  }
  // cards: when the trigger matches and the side holds one, at most one per 3 plays
  if (!forHuman && m.cards[s].length && (m.lastCardPlay === undefined || m.playNo - (m.lastCardPlay[s] || -9) >= 3)) {
    const pl = P()[play], role = s === m.poss ? (pl && (pl.type === 'fg' || pl.type === 'punt' || pl.type === 'kickoff') ? 'kick' : 'off') : 'def';
    c.passCall = pl && pl.type === 'pass';
    for (const id of m.cards[s]) { const cd = FF.data.cards[id]; if (FF.cardFits(id, role) && cd.cpu(Object.assign({}, c, { mascot: t.mascot.name }))) { card = id; m.lastCardPlay = m.lastCardPlay || {}; m.lastCardPlay[s] = m.playNo; if (id === 'HOT_SAUCE') m.usedHot = true; break; } }
  }
  if (m.forceCall && m.forceCall[s]) { const f = m.forceCall[s]; play = f.play || play; flip = f.flip !== undefined ? f.flip : flip; card = f.card !== undefined ? f.card : card; }
  return { play, flip, card };
};
coach.offense = (m, s, c, ai, R) => {
  // 4th down: a field goal in range, go for it when short past midfield or late and trailing, punt otherwise
  if (c.down === 4 && m.callKind !== 'two') {
    const K = m.roster[s].find(a => a.homeSlot === 'K'), range = T.cpuFgRange + (K ? K.r.KCK : 5) - 5;
    const goFor = (c.toGo <= 3 && c.own >= 50) || (c.trailing && c.late && c.trailingBy > 3) || (c.trailing && m.quarter >= 4 && m.clock < 120 && c.trailingBy > 3);
    if (c.fgYards <= range && !(c.trailingBy > 3 && c.late) && !(c.toGo <= 1 && c.toEZ <= 5)) return 'field_goal';
    if (goFor) return pickOff(m, s, c, ai, R);
    if (c.toGo <= 5 && R() < .05) return 'fake_punt';
    return 'punt';
  }
  if (c.lead >= 9 && c.late && m.quarter >= 4) return R() < .6 ? 'kneel' : 'hb_dive';
  return pickOff(m, s, c, ai, R);
};
function pickOff(m, s, c, ai, R) {
  const plays = FF.data.offPlays, w = {};
  for (const p of plays) w[p.id] = p.tab === 'RUN' ? ai.run / 6 : p.tab === 'PASS' ? ai.pass / 6 : ai.trick / 6;
  const mul = (ids, k) => { for (const id of ids) if (w[id] !== undefined) w[id] *= k; };
  if (c.down >= 3 && c.toGo >= 10) mul(['deep_post', 'out_up', 'curls', 'mesh', 'hail_mary'], 2.5);
  if (c.toGo < 3) mul(['hb_dive', 'qb_sneak', 'counter', 'slants', 'quick_outs'], 2);
  if (c.toEZ <= 5) { for (const k in w) w[k] *= .3; mul(['hb_dive', 'qb_sneak', 'slants', 'hb_sweep', 'quick_outs'], 6); }
  if (c.trailing && c.late) mul(['quick_outs', 'out_up', 'deep_post'], 3);
  if (c.toEZ < 40) w.hail_mary = (w.hail_mary || 0) * .05;
  if (!(c.trailing && c.late && c.toEZ > 35)) w.hail_mary = (w.hail_mary || 0) * .25;
  if (m.weatherWet) mul(['hb_dive', 'hb_sweep', 'counter', 'toss'], 1.3);
  const ids = Object.keys(w);
  // a pinch of randomness so the CPU can only be read roughly
  return u.pickW(ids, id => w[id] * (.8 + R() * .4), R);
}
coach.defense = (m, s, c0, ai, R) => {
  const c = coach.situation(m, 1 - s);   // the offense's situation
  if (m.callKind === 'two') return R() < .5 ? 'goal_line' : 'man';
  if (c.down === 4) {
    const offCall = m.calls[1 - s];
    if (offCall === 'punt' || (!offCall && c.toGo > 3 && c.own < 60)) return R() < .12 ? 'punt_block' : 'punt_return';
    if (offCall === 'field_goal' || c.fgYards <= T.cpuFgRange) return c.toGo > 3 ? 'fg_block' : 'goal_line';
  }
  const w = { cover2: 1, man: 1, qb_spy: .5, lb_blitz: ai.blitz * 2, zone_blitz: ai.blitz * 1.5, fiasco_blitz: ai.blitz, prevent: .2, goal_line: .2 };
  if (c.down === 3 && c.toGo >= 10) { w.lb_blitz *= 1.8; w.fiasco_blitz *= 1.8; w.zone_blitz *= 1.8; }
  if (c.toEZ <= 3) { w.goal_line = 6; }
  if (c.lead < 0 && c.late) w.prevent = 4;   // the defense leads late: prevent
  if (c.toGo <= 2) { w.goal_line += 1; w.man += .5; }
  if (m.difficulty === 'fiasco' && m.recentTypes) { const runs = m.recentTypes[1 - s].filter(t => t === 'run').length; if (runs >= 3) { w.lb_blitz *= 1.5; w.goal_line *= 2; } else { w.cover2 *= 1.4; w.man *= 1.3; } }
  return u.pickW(Object.keys(w), k => w[k] * (.8 + R() * .4), R);
};
/** COACH SAYS: the coach's pick for a human side (shown with a star; played if the timer runs out) */
coach.suggest = (m, s) => {
  const keep = FF.rng.sim, R = E_rng(m.playNo * 7 + s);
  FF.rng.sim = R; try { return coach.call(m, s, true).play; } finally { FF.rng.sim = keep; }
};
function E_rng(seed) { return My3D2dge.rng(seed + 12345); }
})();
