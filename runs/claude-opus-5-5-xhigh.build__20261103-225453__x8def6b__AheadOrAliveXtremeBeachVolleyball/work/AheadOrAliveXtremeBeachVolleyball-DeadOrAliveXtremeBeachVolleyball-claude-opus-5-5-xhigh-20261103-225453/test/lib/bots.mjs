// Helpers that play the game: AI vs AI matches, a match with a human the CPU or a perfect bot plays, a run to a phase.
export function aiMatch(G, game, o = {}) {
  const cfg = G.quickMatchCfg({ seed: o.seed || 1, cast: o.cast });
  for (const team of cfg.teams) for (const p of team) { p.ctl = { kind: 'ai' }; p.skill = o.skill || .55; }
  Object.assign(cfg, o.cfg || {});
  return startCfg(G, game, cfg);
}
/** start a match from a config and wait until its scene is up */
export function startCfg(G, game, cfg) {
  G.startMatch(cfg);
  for (let i = 0; i < 240 && !(G.M && G.M.cfg === cfg && game.sceneName === 'match'); i++) game.advance(1 / 120);
  return G.M;
}
export function runMatch(G, game, M, o = {}) {
  const max = (o.max || 900) * 120, info = { phases: {}, stuck: null, nan: false, off: false, points: [], replays: 0, steps: 0 };
  let ph = M.phase, since = 0, lastPts = 0;
  for (let i = 0; i < max; i++) {
    game.advance(1 / 120); info.steps++;
    if (G.M !== M) break;
    if (M.phase !== ph || M.rallyTouches !== info._rt) { if (M.phase !== ph && M.phase === 'replay') info.replays++; ph = M.phase; info._rt = M.rallyTouches; since = 0; } else since += 1 / 120;   // stuck: no phase change and no touch for 15 s
    if (since > 15 && ph !== 'results' && ph !== 'end' && !info.stuck) info.stuck = ph;
    const b = M.ball; if (![b.x, b.y, b.z].every(Number.isFinite)) info.nan = true; if (b.x < -200 || b.x > 900 || b.y < -200 || b.y > 650) info.off = true;
    const pts = M.rules.rallies; if (pts !== lastPts) { lastPts = pts; info.points.push({ t: M.now, ...M.lastPoint, res: undefined, scorer: undefined }); }
    if (M.phase === 'results' || (o.until && o.until(M))) break;
  }
  info.final = M.rules.score.slice(); info.over = M.over; info.now = M.now;
  return info;
}
/** advance until the dialog closes, answering choices with `pick` (0 or 1) */
export function talkThrough(G, game, pick = 0, max = 30) {
  for (let i = 0; i < max * 120; i++) {
    const D = G.talk; if (!D || !D.open || !D.modal) { game.advance(1 / 120); if (!G.talk || !G.talk.open || !G.talk.modal) { if (i > 4) return true; } continue; }
    if (D.choices && D.i >= D.pages.length - 1 && !D.typing) { D.choice = pick; }
    if (i % 6 === 0) game.input.tap('confirm');
    game.advance(1 / 120);
  }
  return false;
}
/** play out the scene until fn() or max seconds; dialogs are clicked through */
export function playUntil(G, game, fn, max = 60, pick = 0) {
  for (let i = 0; i < max * 120; i++) { if (fn()) return true; if (G.talk && G.talk.open && G.talk.modal) { if (G.talk.choices && G.talk.i >= G.talk.pages.length - 1 && !G.talk.typing) G.talk.choice = pick; if (i % 6 === 0) game.input.tap('confirm'); } game.advance(1 / 120); }
  return fn();
}
/** the match in the current scene, played to the results by the CPU with perfect touches (win) or left idle (lose), then Continue */
export function finishMatch(G, game, win = true, force = false) {
  if (!playUntil(G, game, () => G.M && game.sceneName === 'match', 5)) return null;
  const M = G.M; M.cpuControl = win; M.perfectPlayer = win;
  if (force) { playUntil(G, game, () => M.rules.rallies >= 3, 60); G.debugTools.endMatch(win); }
  else if (!win) G.debugTools.endMatch(false);
  playUntil(G, game, () => M.phase === 'results' && M.resultsUI, win ? 900 : 120);
  const res = M.result; game.advance(1);
  const its = M.resultsUI && M.resultsUI.items(); if (its && its[0]) its[0].onPress();
  game.advance(.1);
  return res;
}
