/* AMERICAN FOOTBALL FIASCO — AI Hub Session Protocol v1, mode "parallel": every player plays the same seeded half against the CPU
 * and reports a score; the hub ranks them. Outside the hub none of this runs. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, game = FF.game;
const H = typeof AIHub !== 'undefined' ? AIHub : null;
const N = FF.net = { active: !!(H && H.active), info: null, started: false, over: false, reported: false, lastP: 0 };
N.hold = () => { if (!FF.flags.hub) return false; if (!N.started && H && H.time() >= 0) N.started = true; return !N.started || N.over || N.reported; };
N.cfg = null;
N.begin = () => {
  FF.flags.hub = true;
  H.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) { FF.flags.hub = false; N.active = false; game.go('title'); return; }
    N.info = info; const rg = H.rng('setup'), teams = FF.TEAM_LIST.slice(1), sts = Object.keys(FF.STADIUMS);
    N.cfg = { mode: 'hub', home: 'fiascos', away: teams[Math.floor(rg() * teams.length)], stadium: sts[Math.floor(rg() * sts.length)], humans: [true, false], quarters: 2, qlen: 70, seed: info.seed | 0 || 777 };
    FF.applyDifficulty && (FF.T.aiSkill = .6);
    game.go('match', N.cfg, { fade: 0 });
    H.on('start', () => { N.started = true; });
    H.on('time-up', () => N.report());
    H.on('end', () => { N.over = true; });
    H.on('leave', () => {});
  });
};
N.score = M => { const my = M.score[0], op = M.score[1]; return (my - op) * 1000 + my * 10 + Math.max(0, M.stats[0].yards); };
N.report = () => {
  const S = FF.S, M = S && S.M; if (!H || !M || N.reported) return; N.reported = true;
  H.result({ score: N.score(M), stats: { 'Points': M.score[0], 'Opponent': M.score[1], 'Big Hits': M.stats[0].hits, 'Touchdowns': M.stats[0].tds }, awards: M.stats[0].hits >= 3 ? [{ title: 'Hit Stick', detail: M.stats[0].hits + ' Big Hits' }] : [] });
};
FF.addHooks({
  enter(d) { if (d.mode === 'hub' && !N.readied) { N.readied = true; H.ready(); } },
  tick(M, dt) { if (!FF.flags.hub || !H || N.reported) return; N.lastP += dt; if (N.lastP > 1) { N.lastP = 0; H.progress({ score: N.score(M), label: (M.ot ? 'OT' : 'Q' + M.q) + ' ' + M.score[0] + '-' + M.score[1] }); } },
  final(M) { if (FF.flags.hub) N.report(); }
});
})();
