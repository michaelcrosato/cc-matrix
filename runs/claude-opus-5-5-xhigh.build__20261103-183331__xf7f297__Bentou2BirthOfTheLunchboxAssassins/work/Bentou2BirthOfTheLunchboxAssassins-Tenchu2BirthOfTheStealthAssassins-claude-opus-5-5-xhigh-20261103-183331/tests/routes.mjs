// The playthrough's routes: autopilot beats per mission (teleports and god mode allowed), shared by the playthrough
// test. Each runs the real systems: vaults, Silent Cuts of every kind, the grapple, swimming, bait, smoke, bosses.
export const ROUTES = {
  training: [
    { at: [12, 6], facing: 0 }, { goto: [17, 6], max: 6 },
    { fn: (M, h) => { const g = M.guards.find(g => g.id === 'ume'); h.x = g.x - Math.cos(g.facing) * 14; h.y = g.y - Math.sin(g.facing) * 14; h.z = 0; h.crouch = true; } },
    { cut: 'ume', max: 6 }, { wait: 1.5 },
    { at: [26, 16], facing: 0 }, { wait: .4 }, { cut: 'kiku', from: 'water', water: [26, 16], max: 6 }, { wait: 1.5 },
    { at: [35, 20], facing: 270 }, { grapple: [34, 18, 48], max: 5 }, { wait: .6 },
    { fn: (M, h) => { h.x = 33.5 * 16; h.y = 18.3 * 16; h.z = 48; } }, { cut: 'masa', from: 'above', spot: [33, 18], max: 6 }, { wait: 1.5 },
    { fn: M => { M.cheats.invisible = true; } }, { at: [32, 24], facing: 0 }, { use: 'poisonball' }, { goto: [29, 22], max: 4 }, { until: M => { const g = M.guards.find(g => g.id === 'daikon'); return g.status.sleep > 0; }, max: 25 },
    { fn: M => { M.cheats.invisible = false; } }, { cut: 'daikon', max: 8 }, { wait: 1.5 }, { use: 'smoke', feet: true }, { wait: 1.2 },
    { at: [7, 18], facing: 90 }, { wait: 2.5 }, { fight: 45, until2: M => M.bosses[0].defeated }, { wait: 1 },
    { at: [5, 8], facing: 270 }, { goto: [5, 6], max: 4 }, { wait: 3 }
  ],
  m1: [
    { fn: (M, h) => { M.cheats.invisible = true; } },
    { at: [42, 9] }, { grapple: [42, 7, 48], max: 5 }, { goto: [42, 5], max: 4 }, { wait: .5 },
    { fn: (M, h) => { M.cheats.invisible = false; const k = M.civs.find(c => c.id === 'kanemori'); h.x = k.x - Math.cos(k.facing) * 14; h.y = k.y - Math.sin(k.facing) * 14; h.z = 0; h.crouch = true; for (const g of M.guards) if (g.id === 'hallguard') g.facing = 0; } },
    { cut: 'kanemori', max: 6 }, { wait: 2 },
    { at: [16, 7], facing: 180 }, { fight: 70, until2: M => M.bosses[0].defeated }, { wait: 1.5 },
    { at: [3, 40] }, { goto: [2, 40], max: 4 }, { wait: 3 }
  ],
  m2: [
    { fn: (M, h) => { M.cheats.invisible = true; } },
    { at: [51, 18] }, { interact: 1.8 }, { wait: .5 },
    { at: [35, 31] }, { interact: 1.5 },
    { at: [37, 43] }, { interact: 1.8 },
    { at: [45, 43] }, { interact: 1.8 },
    { at: [53, 43] }, { interact: 1.8 },
    { fn: (M, h) => { M.cheats.invisible = false; const e = M.escort; h.x = 24.5 * 16; h.y = 32.5 * 16; h.z = 0; e.x = h.x + 16; e.y = h.y; e.z = 0; } }, { wait: 2.5 },
    { fight: 70, until2: M => M.bosses[0].defeated }, { wait: 2 },
    { fn: (M, h) => { const e = M.escort; h.x = 5.5 * 16; h.y = 12.5 * 16; h.z = 0; e.x = 6.5 * 16; e.y = 13 * 16; e.z = 0; } }, { wait: 3 }
  ],
  m3: [
    { fn: (M, h) => { M.cheats.invisible = true; } },
    { at: [22, 52] }, { grapple: [22, 51, 56], max: 5 }, { wait: .4 },
    { at: [14, 41] }, { interact: 1.3 }, { wait: .5 },
    { fn: (M, h) => { for (const id of ['dis1', 'dis2', 'dis3']) { const c = M.civs.find(c => c.id === id) || M.guards.find(g => g.id === id); if (c) { c.alive = false; } } } },
    { at: [20, 27] }, { grapple: [20, 25, 64], max: 5 }, { wait: .4 }, { goto: [20, 24], max: 3 }, { grapple: [20, 23, 112], max: 5 }, { wait: .4 }, { goto: [20, 22], max: 3 }, { grapple: [20, 21, 160], max: 5 }, { wait: .6 },
    { fn: (M, h) => { M.cheats.invisible = false; } }, { goto: [19, 19], max: 3 }, { wait: 2.6 },
    { fight: 90, until2: M => M.bosses[0].defeated }, { wait: 3 }
  ],
  delivery: [
    { fn: (M, h) => { M.cheats.invisible = true; } }, { at: [16, 21] }, { wait: .3 },
    { fn: (M, h) => { const k = M.civs.find(c => c.id === 'sakubei'); h.x = k.x - Math.cos(k.facing) * 14; h.y = k.y - Math.sin(k.facing) * 14; h.z = 0; h.crouch = true; M.cheats.invisible = false; } },
    { cut: 'sakubei', max: 6 }, { wait: 1.5 }, { at: [16, 5] }, { goto: [16, 4], max: 4 }, { wait: 3 }
  ]
};
/** run a mission's route to its end (or a time limit): returns the mission */
export function runRoute(t, id, o = {}) {
  const { game, B } = t;
  t.load(id, { mode: o.mode || 'story', character: o.char || 'sojiro', cheats: Object.assign({ god: true }, o.cheats || {}) });
  B.Cutscene.clear();
  const M = B.M; game.debug.autopilot(ROUTES[id], id);
  let s = 0; while (s < (o.limit || 240) && !(M.ended && M.endT > 2)) { game.advance(.25); s += .25; while (B.Cutscene.talk.open && B.Cutscene.talk.modal) { B.Cutscene.clear(); } }
  return M;
}
