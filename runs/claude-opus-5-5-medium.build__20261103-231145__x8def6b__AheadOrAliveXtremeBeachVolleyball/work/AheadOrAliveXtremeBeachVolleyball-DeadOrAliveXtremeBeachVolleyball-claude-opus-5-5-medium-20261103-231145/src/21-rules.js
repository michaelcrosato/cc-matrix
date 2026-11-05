/* 21-rules: the referee. Rally scoring to pointsToWin, win by 2, a hard cap at pointsToWin + 4; at most three touches a
 * side (a block counts as one), no one touches twice in a row (except straight after her own block); every fault scores
 * for the other side; the serve passes to the team that wins a rally, alternating its servers. */
G.Rules = {
  /** has a side won the set? */
  setWon(score, to) { const [a, b] = score, cap = to + 4; if ((a >= to || b >= to) && Math.abs(a - b) >= 2) return a > b ? 0 : 1; if (a >= cap) return 0; if (b >= cap) return 1; return -1; },
  /** is side s one point from the set? */
  setPoint(score, to, s) { const t = score.slice(); t[s]++; return this.setWon(t, to) === s; },
  /** the server for side s after it wins the serve back: the one who didn't serve last time */
  nextServer(lastServer, s) { return lastServer[s] === 0 ? 1 : 0; },
  CALLS: { in: 'IN!', out: 'OUT!', net: 'NET!', four: '4 TOUCHES', double: 'DOUBLE TOUCH', antenna: 'ANTENNA', ace: 'ACE!', kill: 'KILL!', block: 'BLOCK!', netTouch: 'NET TOUCH', serveFault: 'SERVE FAULT', serveNet: 'SERVE IN THE NET', serveOut: 'SERVE OUT', noServe: 'TOO LATE TO SERVE', under: 'UNDER THE NET' },
  newStats() { return { serves: 0, aces: 0, serveFaults: 0, digs: 0, perfectPasses: 0, sets: 0, kills: 0, attackErrors: 0, blocks: 0, points: 0, touches: 0 }; }
};
/** the judge's windows, scaled by Settings (timing assist) */
G.windows = () => { const a = G.ASSIST[G.setting('assist')] || 1; return { perfect: G.T.perfectWin * a, great: G.T.greatWin * a, ok: G.T.okWin * a }; };
G.judge = (err, w = G.windows()) => { const e = Math.abs(err); return e <= w.perfect ? 'PERFECT' : e <= w.great ? 'GREAT' : e <= w.ok ? 'OK' : 'MISS'; };
G.QUAL = { PERFECT: { r: 4, sp: 1.12, n: 3 }, GREAT: { r: 10, sp: 1, n: 2 }, OK: { r: 20, sp: .85, n: 1 }, STRETCH: { r: 30, sp: .8, n: 0 }, MISS: { r: 60, sp: .6, n: -1 } };
G.lower = q => q === 'PERFECT' ? 'GREAT' : q === 'GREAT' ? 'OK' : 'STRETCH';
G.setting = k => { const s = G.game && G.game.settings; return s ? s[k] : undefined; };
