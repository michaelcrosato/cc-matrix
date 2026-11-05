// a human bot: presses play at each planned contact (and serves on time) through the real input
export function humanBot(game, G, skill = 1) {
  return () => {
    const M = G.M; if (!M) return; const I = game.input, me = M.players.find(p => p.input === I && p.isHuman); if (!me) return;
    const t = M.clock;
    if (M.phase === 'serveSetup' && M.server === me && M.phT > .5) I.tap('play');
    if (M.phase === 'toss' && M.server === me && t >= M.tossApex - 1 / 240) I.tap('play');
    if (M.phase === 'rally' && me.plan && !me.pressed && t >= me.plan.t - (skill < 1 ? .2 : 1 / 240)) I.tap('play');
  };
}
export function runMatch(game, G, cfg, o = {}) {
  let res = null; cfg.after = r => { res = r; }; G.startMatch(cfg, { fade: 0 }); game.advance(.05);
  const bot = o.bot ? humanBot(game, G, o.skill) : null, maxPhase = { t: 0, ph: null, worst: 0 };
  for (let s = 0; s < (o.max || 900) * 120 && !res; s++) { if (bot) bot(); game.advance(1 / 120); const M = G.M; if (M.phase !== maxPhase.ph) { maxPhase.ph = M.phase; maxPhase.t = 0; } else { maxPhase.t += 1 / 120; maxPhase.worst = Math.max(maxPhase.worst, maxPhase.ph === 'end' ? 0 : maxPhase.t); } const b = M.ballPos; if (b && (b.some(v => !isFinite(v)))) { o.nan = true; } }
  return { res, stuck: maxPhase.worst, M: G.M };
}
