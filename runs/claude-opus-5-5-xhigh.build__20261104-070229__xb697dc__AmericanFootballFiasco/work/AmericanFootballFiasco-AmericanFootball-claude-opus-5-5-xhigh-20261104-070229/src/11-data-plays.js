// Formations and plays. Coordinates are yards from the ball spot: x downfield (+ is the offense's attacking direction),
// y across (+ is the offense's right). Defense spots use the same frame (x is yards past the line toward the defense's
// own goal). FLIP mirrors y. The sim converts with the offense's direction.
(() => {
'use strict';
const FF = window.FF;
const OL = { C: [-0.6, 0], LG: [-0.8, -1.4], RG: [-0.8, 1.4] };
FF.data.formations = {
  pro: Object.assign({ QB: [-1.4, 0], RB: [-6, 0], WR1: [-0.8, -13], WR2: [-0.8, 12] }, OL),
  shotgun: Object.assign({ QB: [-5, 0], RB: [-5, 1.8], WR1: [-0.8, -13], WR2: [-0.8, 12] }, OL),
  tight: Object.assign({ QB: [-1.4, 0], RB: [-5, 0], WR1: [-0.8, -6], WR2: [-0.8, 3.4] }, OL),
  spread: Object.assign({ QB: [-5, 0], RB: [-0.8, 7], WR1: [-0.8, -15], WR2: [-0.8, 15] }, OL),
  punt: Object.assign({ K: [-12, 0], RB: [-5, 1.5], WR1: [-0.8, -20], WR2: [-0.8, 20] }, OL),
  fieldgoal: Object.assign({ QB: [-7, 0], K: [-9.5, -1.2], RB: [-1, -2.6], WR2: [-1, 2.6] }, OL),
  // defense (x = yards off the ball)
  base: { DE1: [1.2, -2.8], NT: [1.0, 0], DE2: [1.2, 2.8], LB1: [4.5, -3.5], LB2: [4.5, 3.5], CB: [6, 'WR1'], S: [12, 0] },
  pressure: { DE1: [1.2, -2.8], NT: [1.0, 0], DE2: [1.2, 2.8], LB1: [3, -2.5], LB2: [3, 2.5], CB: [5, 'WR1'], S: [10, 'WR2'] },
  prevent: { DE1: [1.2, -2.8], NT: [3, 0], DE2: [1.2, 2.8], LB1: [10, -8], LB2: [10, 8], CB: [20, -8], S: [20, 8] },
  goalline: { DE1: [0.9, -2.6], NT: [0.8, 0], DE2: [0.9, 2.6], LB1: [2.2, -1.5], LB2: [2.2, 1.5], CB: [1.5, 'WR1'], S: [3, 'WR2'] },
  // kickoffs: the kicking unit (the defense, with the K for the NT); the receiving unit (the offense)
  kickoff: { K: [-6, 0], DE1: [-0.5, -20], DE2: [-0.5, -12], LB1: [-0.5, -5], LB2: [-0.5, 5], CB: [-0.5, 12], S: [-0.5, 20] },
  kickreturn: { WR1: [44, -4], RB: [44, 4], C: [12, 0], LG: [12, -8], RG: [12, 8], QB: [22, -6], WR2: [22, 6] },
  // punt return (the defense): a returner deep, the rest at the line
  puntreturn: { DE1: [1.2, -3], NT: [1.0, 0], DE2: [1.2, 3], LB1: [5, -6], LB2: [5, 6], S: [12, 0], CB: [40, 0] }
};
const pass = { C: { block: 'pass', zone: 'mid' }, LG: { block: 'pass', zone: 'left' }, RG: { block: 'pass', zone: 'right' } };
const P = [];
// ---- RUN ----
P.push({ id: 'hb_dive', name: 'HB DIVE', side: 'off', tab: 'RUN', formation: 'pro', type: 'run', tags: ['inside'],
  qb: { handoff: 'RB', at: .45, fake: [-5, 1] },
  assign: { RB: { carry: [[-2.5, .6], [2, .8], [8, .8]] }, C: { block: 'run', target: 'NT', drive: [1, 0] }, LG: { block: 'run', target: 'DE1', drive: [.3, -1] },
    RG: { block: 'run', target: 'LB2', climb: true }, WR1: { block: 'run', target: 'CB' }, WR2: { block: 'run', target: 'S' } } });
P.push({ id: 'hb_sweep', name: 'HB SWEEP', side: 'off', tab: 'RUN', formation: 'pro', type: 'run', tags: ['outside'],
  qb: { handoff: 'RB', at: .3, pitch: true },
  assign: { RB: { carry: [[-5, 3.5], [-1.2, 8], [5, 9.5]] }, LG: { pull: [[-1.8, 1.5], [.5, 7]], then: 'lead' }, C: { block: 'run', target: 'NT', drive: [.2, 1] },
    RG: { block: 'run', target: 'DE2', drive: [.2, -1] }, WR2: { block: 'run', target: 'LB2' }, WR1: { block: 'run', target: 'CB' } } });
P.push({ id: 'hb_draw', name: 'HB DRAW', side: 'off', tab: 'RUN', formation: 'shotgun', type: 'run', tags: ['inside', 'fake'],
  qb: { drop: [-6.5, 0], handoff: 'RB', at: .9 },
  assign: { RB: { carry: [[-4.5, .5], [3, 0], [9, 0]], wait: .7 }, C: { block: 'pass', zone: 'mid', then: 'run', at: .9 }, LG: { block: 'pass', zone: 'left', then: 'run', at: .9 },
    RG: { block: 'pass', zone: 'right', then: 'run', at: .9 }, WR1: { route: [[30, -13]], after: 'block' }, WR2: { route: [[30, 12]], after: 'block' } } });
P.push({ id: 'qb_sneak', name: 'QB SNEAK', side: 'off', tab: 'RUN', formation: 'tight', type: 'run', tags: ['inside', 'short'],
  qb: { keep: [[.5, .3], [4, .3], [8, .3]] },
  assign: { RB: { lead: 'QB' }, C: { block: 'run', target: 'NT', drive: [1, 0] }, LG: { block: 'run', target: 'DE1', drive: [1, 0] }, RG: { block: 'run', target: 'DE2', drive: [1, 0] },
    WR1: { block: 'run', target: 'LB1' }, WR2: { block: 'run', target: 'LB2' } } });
P.push({ id: 'counter', name: 'COUNTER', side: 'off', tab: 'RUN', formation: 'pro', type: 'run', tags: ['inside', 'fake'],
  qb: { handoff: 'RB', at: .45 },
  assign: { RB: { carry: [[-6, -1.5], [-3.6, .2], [1, 2.2], [8, 3.5]] }, LG: { block: 'run', target: 'DE1', drive: [.3, -1] }, C: { block: 'run', target: 'NT', drive: [1, -.3] },
    RG: { block: 'run', target: 'DE2', drive: [.3, 1] }, WR1: { block: 'run', target: 'LB1' }, WR2: { block: 'run', target: 'LB2' } } });
P.push({ id: 'toss', name: 'TOSS', side: 'off', tab: 'RUN', formation: 'shotgun', type: 'run', tags: ['outside'],
  qb: { handoff: 'RB', at: .2, pitch: true },
  assign: { RB: { carry: [[-5, -3.5], [-.5, -8], [5, -9.5]] }, WR1: { block: 'run', target: 'LB1' }, C: { block: 'run', target: 'NT', drive: [.2, -1] }, LG: { block: 'run', target: 'DE1', drive: [.2, -1] },
    RG: { block: 'run', target: 'NT', drive: [.5, -.5] }, WR2: { block: 'run', target: 'S' } } });
// ---- PASS ----
P.push({ id: 'slants', name: 'SLANTS', side: 'off', tab: 'PASS', formation: 'shotgun', type: 'pass', tags: ['quick', 'short'],
  qb: { drop: [-6, 0], reads: ['WR2', 'WR1', 'RB'], readT: .6 },
  assign: Object.assign({ WR1: { route: [[2.5, -13], [9, -6]], after: 'settle' }, WR2: { route: [[2.5, 12], [9, 5]], after: 'settle' }, RB: { route: [[-2, 5], [1, 10]], after: 'settle' } }, pass) });
P.push({ id: 'curls', name: 'CURLS', side: 'off', tab: 'PASS', formation: 'shotgun', type: 'pass', tags: ['mid'],
  qb: { drop: [-6.5, 0], reads: ['WR1', 'WR2', 'RB'], readT: .8 },
  assign: Object.assign({ WR1: { route: [[11, -13], [9, -12]], after: 'settle' }, WR2: { route: [[11, 12], [9, 11]], after: 'settle' }, RB: { route: [[-3, -6], [1, -11]], after: 'settle' } }, pass) });
P.push({ id: 'deep_post', name: 'DEEP POST', side: 'off', tab: 'PASS', formation: 'pro', type: 'pass', tags: ['deep'],
  qb: { drop: [-7, 0], reads: ['WR2', 'WR1', 'RB'], readT: 1.0 },
  assign: Object.assign({ WR1: { route: [[12, -13], [28, -3]], after: 'settle' }, WR2: { route: [[35, 12]], after: 'settle' }, RB: { block: 'pass', zone: 'mid', then: 'route', at: 1.2, route: [[2, 3], [5, 6]] } }, pass) });
P.push({ id: 'mesh', name: 'MESH', side: 'off', tab: 'PASS', formation: 'shotgun', type: 'pass', tags: ['short', 'cross'],
  qb: { drop: [-6, 0], reads: ['WR1', 'WR2', 'RB'], readT: .8 },
  assign: Object.assign({ WR1: { route: [[5, -13], [5, 10]], after: 'settle' }, WR2: { route: [[7, 12], [7, -10]], after: 'settle' }, RB: { route: [[-3, 5], [2, 10], [18, 12]], after: 'settle' } }, pass) });
P.push({ id: 'out_up', name: 'OUT & UP', side: 'off', tab: 'PASS', formation: 'shotgun', type: 'pass', tags: ['deep', 'sideline'],
  qb: { drop: [-6.5, 0], reads: ['WR2', 'WR1', 'RB'], readT: .9 },
  assign: Object.assign({ WR2: { route: [[8, 12], [8, 16], [30, 17]], after: 'settle' }, WR1: { route: [[12, -13], [12, -2]], after: 'settle' }, RB: { route: [[-1, -4], [2, -9]], after: 'settle' } }, pass) });
P.push({ id: 'quick_outs', name: 'QUICK OUTS', side: 'off', tab: 'PASS', formation: 'shotgun', type: 'pass', tags: ['quick', 'sideline', 'short'],
  qb: { drop: [-5.5, 0], reads: ['WR2', 'WR1', 'RB'], readT: .5 },
  assign: Object.assign({ WR1: { route: [[5, -13], [5, -18]], after: 'settle' }, WR2: { route: [[5, 12], [5, 17]], after: 'settle' }, RB: { route: [[-1, .5], [6, .5]], after: 'settle' } }, pass) });
// ---- TRICK ----
P.push({ id: 'hb_screen', name: 'HB SCREEN', side: 'off', tab: 'TRICK', formation: 'shotgun', type: 'pass', tags: ['screen', 'short'],
  qb: { drop: [-7.5, 0], reads: ['RB'], readT: 1.4 },
  assign: { RB: { route: [[-3, 5]], after: 'wait' }, C: { block: 'pass', zone: 'mid', then: 'release', at: .8, to: [1, 5] }, LG: { block: 'pass', zone: 'left', then: 'release', at: .8, to: [0, 7] },
    RG: { block: 'pass', zone: 'right', then: 'release', at: .8, to: [2, 8] }, WR1: { route: [[25, -13]], after: 'settle' }, WR2: { block: 'run', target: 'CB' } } });
P.push({ id: 'flea_flicker', name: 'FLEA FLICKER', side: 'off', tab: 'TRICK', formation: 'pro', type: 'pass', tags: ['deep', 'fake'],
  qb: { handoff: 'RB', at: .5, flea: { back: 1.3, to: [-5, 0] }, reads: ['WR1', 'WR2'], readT: 1.8 },
  assign: Object.assign({ RB: { carry: [[-2, .5]], pitchBack: 1.3 }, WR1: { route: [[30, -8]], after: 'settle' }, WR2: { route: [[25, 10]], after: 'settle' } }, pass) });
P.push({ id: 'hook_lateral', name: 'HOOK & LATERAL', side: 'off', tab: 'TRICK', formation: 'shotgun', type: 'pass', tags: ['mid', 'lateral'],
  qb: { drop: [-6, 0], reads: ['WR1'], readT: .9 },
  assign: Object.assign({ WR1: { route: [[10, -12], [9, -12]], after: 'settle', lateralTo: 'WR2' }, WR2: { route: [[6, 12], [9, -7]], after: 'trail', trail: 'WR1' }, RB: { block: 'pass', zone: 'mid' } }, pass) });
P.push({ id: 'fumblerooski', name: 'FUMBLEROOSKI', side: 'off', tab: 'TRICK', formation: 'pro', type: 'run', tags: ['fake', 'inside'],
  qb: { setDown: .2, fake: [-4, 6], fakeTo: [0, 11] },
  assign: { C: { scoop: .6, carry: [[1, -2], [6, -4], [12, -5]] }, RB: { fake: [[-4, 6], [0, 11]] }, LG: { block: 'run', target: 'DE1', drive: [1, 0] }, RG: { block: 'run', target: 'NT', drive: [1, 0] },
    WR1: { block: 'run', target: 'CB' }, WR2: { block: 'run', target: 'S' } }, fool: .8 });
P.push({ id: 'hail_mary', name: 'HAIL MARY', side: 'off', tab: 'TRICK', formation: 'spread', type: 'pass', tags: ['bomb', 'deep'],
  qb: { drop: [-9, 0], reads: ['WR1', 'WR2', 'RB'], readT: 2.2 },
  assign: Object.assign({ WR1: { route: [[40, -2]], after: 'settle' }, WR2: { route: [[42, 2]], after: 'settle' }, RB: { route: [[38, 0]], after: 'settle' } }, pass) });
// ---- SPECIAL (offense) ----
P.push({ id: 'punt', name: 'PUNT', side: 'off', tab: 'SPECIAL', formation: 'punt', type: 'punt', kick: true,
  assign: { RB: { block: 'pass', zone: 'mid', then: 'cover', at: 1.5 }, C: { block: 'pass', zone: 'mid', then: 'cover', at: 1.5 }, LG: { block: 'pass', zone: 'left', then: 'cover', at: 1.5 },
    RG: { block: 'pass', zone: 'right', then: 'cover', at: 1.5 }, WR1: { cover: true }, WR2: { cover: true } } });
P.push({ id: 'field_goal', name: 'FIELD GOAL', side: 'off', tab: 'SPECIAL', formation: 'fieldgoal', type: 'fg', kick: true,
  assign: { RB: { block: 'pass', zone: 'left' }, WR2: { block: 'pass', zone: 'right' }, C: { block: 'pass', zone: 'mid' }, LG: { block: 'pass', zone: 'left' }, RG: { block: 'pass', zone: 'right' } } });
P.push({ id: 'fake_punt', name: 'FAKE PUNT', side: 'off', tab: 'SPECIAL', formation: 'punt', type: 'pass', tags: ['fake'], fakeKick: true,
  qb: { slot: 'K', drop: [-12, 3], reads: ['WR1', 'RB'], readT: .9, roll: [-10, 6] },
  assign: { WR1: { route: [[6, -16], [8, -10]], after: 'settle' }, RB: { route: [[2, 4], [6, 8]], after: 'settle' }, C: { block: 'pass', zone: 'mid' }, LG: { block: 'pass', zone: 'left' },
    RG: { block: 'pass', zone: 'right' }, WR2: { route: [[15, 18]], after: 'settle' } } });
P.push({ id: 'kneel', name: 'KNEEL', side: 'off', tab: 'SPECIAL', formation: 'pro', type: 'kneel',
  assign: Object.assign({ RB: { block: 'pass', zone: 'mid' }, WR1: { block: 'pass', zone: 'left' }, WR2: { block: 'pass', zone: 'right' } }, pass) });
// ---- KICKOFFS AND PATS ----
P.push({ id: 'ko_deep', name: 'DEEP KICK', side: 'off', tab: 'KICKOFF', formation: 'kickoff', type: 'kickoff', kick: 'deep' });
P.push({ id: 'ko_squib', name: 'SQUIB KICK', side: 'off', tab: 'KICKOFF', formation: 'kickoff', type: 'kickoff', kick: 'squib' });
P.push({ id: 'ko_onside', name: 'ONSIDE KICK', side: 'off', tab: 'KICKOFF', formation: 'kickoff', type: 'kickoff', kick: 'onside' });
P.push({ id: 'pat_kick', name: 'KICK XP', side: 'off', tab: 'PAT', formation: 'fieldgoal', type: 'fg', kick: true, pat: true,
  assign: { RB: { block: 'pass', zone: 'left' }, WR2: { block: 'pass', zone: 'right' }, C: { block: 'pass', zone: 'mid' }, LG: { block: 'pass', zone: 'left' }, RG: { block: 'pass', zone: 'right' } } });
P.push({ id: 'pat_two', name: 'GO FOR 2', side: 'off', tab: 'PAT', type: 'two', pat: true });

// ---- DEFENSE ----
const D = [];
D.push({ id: 'cover2', name: 'COVER 2', side: 'def', tab: 'BASE', formation: 'base',
  assign: { DE1: { rush: 'contain' }, NT: { rush: 'A' }, DE2: { rush: 'contain' }, LB1: { zone: { at: [6, -7], r: 5 } }, LB2: { zone: { at: [6, 7], r: 5 } }, CB: { zone: { at: [16, -9], r: 10 } }, S: { zone: { at: [16, 9], r: 10 } } } });
D.push({ id: 'man', name: 'MAN-TO-MAN', side: 'def', tab: 'BASE', formation: 'base',
  assign: { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, CB: { man: 'WR1' }, S: { man: 'WR2' }, LB2: { man: 'RB' }, LB1: { zone: { at: [8, 0], r: 6 } } } });
D.push({ id: 'qb_spy', name: 'QB SPY', side: 'def', tab: 'BASE', formation: 'base',
  assign: { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { spy: 'QB' }, CB: { man: 'WR1' }, S: { man: 'WR2' }, LB2: { man: 'RB' } } });
D.push({ id: 'lb_blitz', name: 'LB BLITZ', side: 'def', tab: 'PRESSURE', formation: 'pressure',
  assign: { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { rush: 'A' }, LB2: { rush: 'B' }, CB: { man: 'WR1' }, S: { man: 'WR2' } } });
D.push({ id: 'zone_blitz', name: 'ZONE BLITZ', side: 'def', tab: 'PRESSURE', formation: 'pressure',
  assign: { NT: { zone: { at: [5, 0], r: 6 } }, LB1: { rush: 'B' }, DE1: { rush: 'C' }, DE2: { rush: 'C' }, LB2: { zone: { at: [6, 6], r: 5 } }, CB: { zone: { at: [15, -9], r: 10 } }, S: { zone: { at: [15, 9], r: 10 } } } });
D.push({ id: 'fiasco_blitz', name: 'FIASCO BLITZ', side: 'def', tab: 'PRESSURE', formation: 'pressure',
  assign: { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { rush: 'A' }, LB2: { rush: 'B' }, CB: { rush: 'contain' }, S: { zone: { at: [18, 0], r: 14 } } } });
D.push({ id: 'prevent', name: 'PREVENT', side: 'def', tab: 'SPECIAL', formation: 'prevent',
  assign: { DE1: { rush: 'C' }, DE2: { rush: 'C' }, NT: { spy: 'QB' }, LB1: { zone: { at: [10, -8], r: 7 } }, LB2: { zone: { at: [10, 8], r: 7 } }, CB: { zone: { at: [22, -8], r: 12 } }, S: { zone: { at: [22, 8], r: 12 } } } });
D.push({ id: 'goal_line', name: 'GOAL LINE', side: 'def', tab: 'SPECIAL', formation: 'goalline',
  assign: { DE1: { rush: 'C' }, NT: { rush: 'A' }, DE2: { rush: 'C' }, LB1: { rush: 'B' }, LB2: { rush: 'B' }, CB: { man: 'WR1' }, S: { man: 'WR2' } } });
D.push({ id: 'fg_block', name: 'FG BLOCK', side: 'def', tab: 'SPECIAL', formation: 'goalline', kickDef: true,
  assign: { DE1: { rush: 'C' }, NT: { rush: 'A', jump: true }, DE2: { rush: 'C' }, LB1: { rush: 'A', jump: true }, LB2: { rush: 'B' }, CB: { rush: 'contain' }, S: { rush: 'B' } } });
// returns (the receiving team's choices on kickoffs and punts)
D.push({ id: 'ret_mid', name: 'RETURN MIDDLE', side: 'def', tab: 'RETURN', type: 'return', lane: 0 });
D.push({ id: 'ret_left', name: 'RETURN LEFT', side: 'def', tab: 'RETURN', type: 'return', lane: -1 });
D.push({ id: 'ret_right', name: 'RETURN RIGHT', side: 'def', tab: 'RETURN', type: 'return', lane: 1 });
D.push({ id: 'hands_team', name: 'HANDS TEAM', side: 'def', tab: 'RETURN', type: 'return', lane: 0, hands: true });
D.push({ id: 'punt_return', name: 'PUNT RETURN', side: 'def', tab: 'PUNTRET', type: 'puntreturn' });
D.push({ id: 'punt_block', name: 'BLOCK THE PUNT', side: 'def', tab: 'PUNTRET', type: 'puntreturn', block: true });

FF.data.plays = Object.fromEntries(P.concat(D).map(p => [p.id, p]));
FF.data.offTabs = ['RUN', 'PASS', 'TRICK', 'SPECIAL'];
FF.data.defTabs = ['BASE', 'PRESSURE', 'SPECIAL'];
FF.data.playsIn = (tab, side) => P.concat(D).filter(p => p.tab === tab && (!side || p.side === side));
FF.data.offPlays = P.filter(p => ['RUN', 'PASS', 'TRICK'].includes(p.tab));
FF.data.defPlays = D.filter(p => ['BASE', 'PRESSURE', 'SPECIAL'].includes(p.tab) && !p.kickDef);
})();
