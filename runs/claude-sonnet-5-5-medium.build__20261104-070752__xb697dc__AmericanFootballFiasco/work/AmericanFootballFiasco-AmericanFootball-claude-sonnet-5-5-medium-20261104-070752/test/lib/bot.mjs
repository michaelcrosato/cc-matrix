// A scripted player: presses what a person would, from the sim's state (used by the playthrough tests).
export function makeBot(FF, game, opts = {}) {
  const I = game.input, held = new Set();
  const hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a, true); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
  const dirTo = (p, tx, ty) => { const dx = tx - p.x, dy = ty - p.y, m = Math.max(1, Math.hypot(dx, dy)); hold('right', dx / m > .35); hold('left', dx / m < -.35); hold('down', dy / m > .35); hold('up', dy / m < -.35); };
  let n = 0, selCycle = 0;
  const bot = {
    step() {
      n++; const S = FF.S, M = S.M; if (!M || game.sceneName !== 'match') { for (const a of [...held]) hold(a, false); return; }
      const hs = M.humans[0] ? 0 : 1;
      if (M.phase === 'call') {
        for (const a of [...held]) hold(a, false);
        if (M.needCall() && M.callTime > .5 && n % 6 === 0) {
          if (n % 30 === 0) { selCycle++; I.tap('right'); }
          I.tap('confirm');
        }
      } else if (M.phase === 'set') { for (const a of [...held]) hold(a, false); if (n % 5 === 0) I.tap('a'); }
      else if (M.phase === 'kick') { for (const a of [...held]) hold(a, false); const k = M.kick; if (k && ((k.stage === 1 && k.pw > .9) || (k.stage === 2 && Math.abs(k.ac) < .12))) I.tap('a'); }
      else if (M.phase === 'live' && M.live && !M.live.over) {
        const c = M.ctlOf && M.ctlOf[hs]; if (!c) return;
        const carrier = M.ball.carrier;
        if (c.ball) {
          hold('turbo', true);
          if (M.live.mode === 'pocket' && c === M.live.qb) { dirTo(c, M.los - 40 * (hs ? -1 : 1), M.by); if (M.live.t > 1.3 + (selCycle % 3) * .3) { I.tap(['a', 'b', 'x'][selCycle % 3]); } }
          else { const gx = hs === 0 ? 1180 : 20; dirTo(c, gx, c.y); if (n % 40 === 0) I.tap('a'); if (n % 53 === 0) I.tap('b'); if (n % 71 === 0 && opts.lateral) I.tap('x'); if (M.card[hs] && n % 20 === 0) I.tap('y'); }
        } else {
          hold('turbo', true); const ref = carrier || M.ball; dirTo(c, ref.x, ref.y); if (n % 30 === 0 && Math.hypot(c.x - ref.x, c.y - ref.y) < 28) I.tap('a'); if (M.card[hs] && n % 25 === 0) I.tap('y');
        }
      } else for (const a of [...held]) hold(a, false);
    },
    release() { for (const a of [...held]) hold(a, false); }
  };
  return bot;
}
