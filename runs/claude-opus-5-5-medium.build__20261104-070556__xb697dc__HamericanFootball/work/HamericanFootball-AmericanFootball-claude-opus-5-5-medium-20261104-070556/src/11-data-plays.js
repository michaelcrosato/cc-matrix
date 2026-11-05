/* PLAYS: formations, offensive, defensive and special plays (data only). Coordinates are yards from the ball spot:
 * x downfield (+ toward the goal the offense attacks), y across (+ the offense's right). FLIP negates y. Defensive x is
 * yards past the line toward the defense's own goal, in the same frame. The sim converts with the attacking direction. */
(() => {
'use strict';
const FF = window.FF;
const OL = { C: [-0.6, 0], LG: [-0.8, -1.4], RG: [-0.8, 1.4] };
const F = (qb, rb, wr1, wr2) => Object.assign({ QB: qb, RB: rb, WR1: wr1, WR2: wr2 }, OL);
FF.data.formations = {
  pro: F([-1.4, 0], [-6, 0], [-0.8, -13], [-0.8, 12]),
  shotgun: F([-5, 0], [-5, 1.8], [-0.8, -13], [-0.8, 12]),
  tight: F([-1.4, 0], [-5, 0], [-0.8, -6], [-0.8, 3.4]),
  spread: F([-5, 0], [-0.8, 7], [-0.8, -15], [-0.8, 15]),
  punt: Object.assign({ K: [-12, 0], RB: [-5, 1.5], WR1: [-0.8, -20], WR2: [-0.8, 20] }, OL),   // the K replaces the QB
  fieldgoal: Object.assign({ QB: [-7, 0], K: [-9.5, -1.2], RB: [-1, -2.6], WR2: [-1, 2.6] }, OL),   // the QB holds; the K replaces WR1
  // defense (x off the ball on the defense's side)
  base: { DE1: [1.2, -2.8], NT: [1.0, 0], DE2: [1.2, 2.8], LB1: [4.5, -3.5], LB2: [4.5, 3.5], CB: [6, 'WR1'], S: [12, 0] },
  pressure: { DE1: [1.2, -2.8], NT: [1.0, 0], DE2: [1.2, 2.8], LB1: [3, -2.5], LB2: [3, 2.5], CB: [5, 'WR1'], S: [10, 'WR2'] },
  prevent: { DE1: [1.2, -2.8], NT: [3, 0], DE2: [1.2, 2.8], LB1: [10, -8], LB2: [10, 8], CB: [20, -8], S: [20, 8] },
  goalline: { DE1: [0.9, -2.6], NT: [0.8, 0], DE2: [0.9, 2.6], LB1: [2.2, -1.5], LB2: [2.2, 1.5], CB: [1.5, 'WR1'], S: [3, 'WR2'] },
  puntreturn: { DE1: [1.2, -3], NT: [1.0, 0], DE2: [1.2, 3], LB1: [4, -10], LB2: [4, 10], CB: [10, 'WR1'], S: [40, 0] }
};
const pb = zone => ({ block: 'pass', zone }), rb = (target, drive) => ({ block: 'run', target, drive: drive || [1, 0] });
const P = (id, name, tab, formation, type, assign, extra = {}) => Object.assign({ id, name, side: 'off', tab, formation, type, assign }, extra);
const D = (id, name, tab, formation, assign, extra = {}) => Object.assign({ id, name, side: 'def', tab, formation, assign }, extra);

FF.data.plays = [
  P('hb_dive', 'HB DIVE', 'RUN', 'pro', 'run', { QB: { handoff: 'RB', at: .45, fake: [-5, 1] }, RB: { carry: [[-2.5, .6], [2, .8], [8, .8]] }, C: rb('NT'), LG: rb('DE1', [.3, -1]), RG: rb('LB2'), WR1: rb('CB'), WR2: rb('S') }, { tags: ['short'] }),
  P('hb_sweep', 'HB SWEEP', 'RUN', 'pro', 'run', { QB: { pitch: 'RB', at: .55 }, RB: { carry: [[-6.5, 3], [-2, 4.2], [1, 4.2]] }, LG: { pull: [[-1.8, 1.5], [.5, 9]] }, C: rb('NT'), RG: rb('DE2', [0, -1]), WR2: rb('LB2'), WR1: rb('CB') }),
  P('hb_draw', 'HB DRAW', 'RUN', 'shotgun', 'run', { QB: { drop: [-6.5, 0], handoff: 'RB', at: .9 }, RB: { carry: [[-4.5, .5], [3, 0], [9, 0]], wait: .7 }, C: pb('mid'), LG: pb('left'), RG: pb('right'), WR1: { route: [[30, -13]] }, WR2: { route: [[30, 12]] } }),
  P('qb_sneak', 'QB SNEAK', 'RUN', 'tight', 'run', { QB: { keep: [[.5, .3], [2, .3]] }, RB: rb('LB1'), C: rb('NT'), LG: rb('DE1'), RG: rb('DE2'), WR1: pb('left'), WR2: pb('right') }, { tags: ['short'] }),
  P('counter', 'COUNTER', 'RUN', 'pro', 'run', { QB: { handoff: 'RB', at: .55, fake: [-4, -2] }, RB: { carry: [[-5, -1], [-.5, 1.6], [6, 2.6]] }, LG: { pull: [[-2, 0], [0, 3]] }, C: rb('NT'), RG: rb('LB1'), WR1: rb('CB'), WR2: rb('S') }),
  P('toss', 'TOSS', 'RUN', 'shotgun', 'run', { QB: { pitch: 'RB', at: .5 }, RB: { carry: [[-6.5, -3], [-2, -3.4], [1, -3.4]] }, WR1: rb('LB1'), C: rb('DE1', [0, -1]), LG: rb('DE1', [0, -1]), RG: rb('NT'), WR2: rb('S') }),
  P('slants', 'SLANTS', 'PASS', 'shotgun', 'pass', { QB: { drop: [-6, 0], reads: ['WR2', 'WR1', 'RB'], readT: .8 }, WR1: { route: [[2.5, -13], [9, -6]] }, WR2: { route: [[2.5, 12], [9, 5]] }, RB: { route: [[-2, 5], [1, 10]] }, C: pb('mid'), LG: pb('left'), RG: pb('right') }, { tags: ['quick'] }),
  P('curls', 'CURLS', 'PASS', 'shotgun', 'pass', { QB: { drop: [-6.5, 0], reads: ['WR1', 'WR2', 'RB'], readT: .8 }, WR1: { route: [[11, -13], [9, -12]] }, WR2: { route: [[11, 12], [9, 11]] }, RB: { route: [[-3, -6], [1, -11]] }, C: pb('mid'), LG: pb('left'), RG: pb('right') }),
  P('deep_post', 'DEEP POST', 'PASS', 'pro', 'pass', { QB: { drop: [-7, 0], reads: ['WR2', 'WR1', 'RB'], readT: 1.0 }, WR1: { route: [[12, -13], [28, -3]] }, WR2: { route: [[35, 12]] }, RB: { route: [[2, 3], [5, 6]], wait: 1.2 }, C: pb('mid'), LG: pb('left'), RG: pb('right') }, { tags: ['deep'] }),
  P('mesh', 'MESH', 'PASS', 'shotgun', 'pass', { QB: { drop: [-6, 0], reads: ['WR1', 'WR2', 'RB'], readT: 1.05 }, WR1: { route: [[5, -13], [5, 10]] }, WR2: { route: [[7, 12], [7, -10]] }, RB: { route: [[-3, 5], [2, 10], [18, 12]] }, C: pb('mid'), LG: pb('left'), RG: pb('right') }),
  P('out_up', 'OUT & UP', 'PASS', 'shotgun', 'pass', { QB: { drop: [-6.5, 0], reads: ['WR2', 'WR1', 'RB'], readT: .9 }, WR2: { route: [[8, 12], [8, 16], [30, 17]] }, WR1: { route: [[12, -13], [12, -2]] }, RB: { route: [[-1, -4], [2, -9]] }, C: pb('mid'), LG: pb('left'), RG: pb('right') }, { tags: ['sideline', 'deep'] }),
  P('quick_outs', 'QUICK OUTS', 'PASS', 'shotgun', 'pass', { QB: { drop: [-5.5, 0], reads: ['WR2', 'WR1', 'RB'], readT: .5 }, WR1: { route: [[5, -13], [5, -18]] }, WR2: { route: [[5, 12], [5, 17]] }, RB: { route: [[-1, .5], [6, .5]] }, C: pb('mid'), LG: pb('left'), RG: pb('right') }, { tags: ['quick', 'sideline'] }),
  P('hb_screen', 'HB SCREEN', 'TRICK', 'shotgun', 'pass', { QB: { drop: [-5.5, 0], reads: ['RB'], readT: .7 }, RB: { route: [[-3, 5]], settleAt: true }, C: { block: 'pass', zone: 'mid', release: [.95, [1, 5]] }, LG: { block: 'pass', zone: 'left', release: [.95, [0, 7]] }, RG: { block: 'pass', zone: 'right', release: [.95, [2, 8]] }, WR1: { route: [[25, -13]] }, WR2: rb('CB') }, { tags: ['screen'] }),
  P('flea_flicker', 'FLEA FLICKER', 'TRICK', 'pro', 'pass', { QB: { handoff: 'RB', at: .5, drop: [-5, 0], reads: ['WR1', 'WR2'], readT: 1.8, flea: 1.3 }, RB: { carry: [[-2, .5]], flea: true }, WR1: { route: [[30, -8]] }, WR2: { route: [[25, 10]] }, C: pb('mid'), LG: pb('left'), RG: pb('right') }, { tags: ['deep'] }),
  P('hook_lateral', 'HOOK & LATERAL', 'TRICK', 'shotgun', 'pass', { QB: { drop: [-6, 0], reads: ['WR1'], readT: .9 }, WR1: { route: [[10, -12], [9, -12]], lateralTo: 'WR2' }, WR2: { route: [[6, 12], [8, -7], [7, -9]] }, RB: pb('mid'), C: pb('mid'), LG: pb('left'), RG: pb('right') }),
  P('fumblerooski', 'FUMBLEROOSKI', 'TRICK', 'pro', 'run', { QB: { handoff: 'C', at: .45, fake: [-4, 6] }, C: { carry: [[1, -2], [4, -3]] }, RB: { route: [[-4, 6], [0, 11]] }, LG: rb('DE1'), RG: rb('NT'), WR1: rb('CB'), WR2: rb('S') }, { fool: .25 }),
  P('hail_mary', 'HAIL MARY', 'TRICK', 'spread', 'pass', { QB: { drop: [-7, 0], reads: ['WR1', 'WR2'], readT: 1.3, lob: true }, WR1: { route: [[40, -2]] }, WR2: { route: [[42, 2]] }, RB: pb('mid'), C: pb('mid'), LG: pb('left'), RG: pb('right') }, { tags: ['deep'] }),
  P('punt', 'PUNT', 'SPECIAL', 'punt', 'punt', { K: { punt: true }, RB: pb('mid'), C: pb('mid'), LG: pb('left'), RG: pb('right'), WR1: { cover: true }, WR2: { cover: true } }, { kick: true, kSlot: 'QB' }),
  P('field_goal', 'FIELD GOAL', 'SPECIAL', 'fieldgoal', 'fg', { K: { fg: true }, QB: { hold: true }, RB: pb('left'), WR2: pb('right'), C: pb('mid'), LG: pb('left'), RG: pb('right') }, { kick: true, kSlot: 'WR1' }),
  P('fake_punt', 'FAKE PUNT', 'SPECIAL', 'punt', 'pass', { K: { drop: [-12, 3], reads: ['WR1'], readT: .9, runner: true }, WR1: { route: [[8, -10]] }, WR2: { route: [[14, 20]] }, RB: pb('mid'), C: pb('mid'), LG: pb('left'), RG: pb('right') }, { kSlot: 'QB' }),
  P('kneel', 'KNEEL', 'SPECIAL', 'pro', 'kneel', { QB: { kneel: true }, RB: pb('mid'), C: pb('mid'), LG: pb('left'), RG: pb('right'), WR1: pb('left'), WR2: pb('right') })
];
FF.data.dplays = [
  D('cover2', 'COVER 2', 'BASE', 'base', { DE1: { rush: 'contain' }, NT: { rush: 'A' }, DE2: { rush: 'contain' }, LB1: { zone: { at: [6, -7], r: 5 } }, LB2: { zone: { at: [6, 7], r: 5 } }, CB: { zone: { at: [16, -9], r: 10 } }, S: { zone: { at: [16, 9], r: 10 } } }),
  D('man', 'MAN-TO-MAN', 'BASE', 'base', { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, CB: { man: 'WR1' }, S: { man: 'WR2' }, LB2: { man: 'RB' }, LB1: { zone: { at: [8, 0], r: 6 } } }),
  D('qb_spy', 'QB SPY', 'BASE', 'base', { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { spy: 'QB' }, CB: { man: 'WR1' }, S: { man: 'WR2' }, LB2: { man: 'RB' } }),
  D('lb_blitz', 'LB BLITZ', 'PRESSURE', 'pressure', { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { rush: 'A' }, LB2: { rush: 'B' }, CB: { man: 'WR1' }, S: { man: 'WR2' } }, { blitz: true }),
  D('zone_blitz', 'ZONE BLITZ', 'PRESSURE', 'pressure', { NT: { zone: { at: [5, 0], r: 6 } }, LB1: { rush: 'A' }, DE1: { rush: 'C' }, DE2: { rush: 'C' }, LB2: { zone: { at: [6, 6], r: 5 } }, CB: { zone: { at: [15, -9], r: 10 } }, S: { zone: { at: [15, 9], r: 10 } } }, { blitz: true }),
  D('fiasco_blitz', 'FIASCO BLITZ', 'PRESSURE', 'pressure', { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { rush: 'A' }, LB2: { rush: 'B' }, CB: { rush: 'contain' }, S: { zone: { at: [18, 0], r: 14 } } }, { blitz: true }),
  D('prevent', 'PREVENT', 'SPECIAL', 'prevent', { DE1: { rush: 'C' }, DE2: { rush: 'C' }, NT: { spy: 'QB' }, LB1: { zone: { at: [10, -8], r: 7 } }, LB2: { zone: { at: [10, 8], r: 7 } }, CB: { zone: { at: [22, -8], r: 12 } }, S: { zone: { at: [22, 8], r: 12 } } }),
  D('goal_line', 'GOAL LINE', 'SPECIAL', 'goalline', { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { rush: 'B' }, LB2: { rush: 'B' }, CB: { man: 'WR1' }, S: { man: 'WR2' } }),
  D('fg_block', 'FG BLOCK', 'SPECIAL', 'goalline', { DE1: { rush: 'C' }, NT: { rush: 'A', jump: true }, DE2: { rush: 'C' }, LB1: { rush: 'A', jump: true }, LB2: { rush: 'B' }, CB: { rush: 'contain' }, S: { rush: 'contain' } }, { kickOnly: true }),
  D('punt_return', 'RETURN', 'SPECIAL', 'puntreturn', { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { returnBlock: true }, LB2: { returnBlock: true }, CB: { returnBlock: true }, S: { returner: true } }, { kickOnly: true, puntReturn: true }),
  D('punt_block', 'BLOCK THE PUNT', 'SPECIAL', 'pressure', { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { rush: 'A' }, LB2: { rush: 'B' }, CB: { rush: 'contain' }, S: { returner: true } }, { kickOnly: true, puntReturn: true, block: true })
];
// kickoffs, returns and conversions
FF.data.kickoffs = [{ id: 'deep', name: 'DEEP KICK', tab: 'KICKOFF', kickoff: 'deep' }, { id: 'squib', name: 'SQUIB KICK', tab: 'KICKOFF', kickoff: 'squib' }, { id: 'onside', name: 'ONSIDE KICK', tab: 'KICKOFF', kickoff: 'onside' }];
FF.data.returns = [{ id: 'ret_mid', name: 'RETURN MIDDLE', tab: 'RETURN', lane: 0 }, { id: 'ret_left', name: 'RETURN LEFT', tab: 'RETURN', lane: -1 }, { id: 'ret_right', name: 'RETURN RIGHT', tab: 'RETURN', lane: 1 }, { id: 'hands', name: 'HANDS TEAM', tab: 'RETURN', lane: 0, hands: true }];
FF.data.pats = [{ id: 'xp', name: 'KICK XP', tab: 'PAT', pat: 'kick' }, { id: 'two', name: 'GO FOR 2', tab: 'PAT', pat: 'two' }];
FF.play = id => FF.data.plays.find(p => p.id === id) || FF.data.dplays.find(p => p.id === id) || FF.data.kickoffs.find(p => p.id === id) || FF.data.returns.find(p => p.id === id) || FF.data.pats.find(p => p.id === id);
})();
