/* 37-match-scene: the scene a match is played in (Exhibition, the Tour, Blam Camp, the attract mode and the hub all use
 * it). Each step: the match (37 -> 35), banners, the camera, the crowd's sound, the break card between quarters, the
 * end of the game handed to the mode's flow (S.flow.onEnd). The dev panel, when open, drives the human slots by CPU. */
const FLOW = { onEnd: null, onBreak: null, lesson: null };
function startMatchScene(opts, flow = {}) {
  FLOW.onEnd = flow.onEnd || null; FLOW.onBreak = flow.onBreak || null; FLOW.lesson = flow.lesson || null; FLOW.noBreakCard = !!flow.noBreakCard; FLOW.openDev = !!flow.openDev;
  game.go('match', { match: opts }, { fade: flow.fade === undefined ? 'wipe' : flow.fade });
}
function matchEnter(d) {
  S.dev.open = false; ANN.cap = null; BANNERS.cur = null; BARKS.length = 0;
  newMatch(d.match);
  S.lesson = FLOW.lesson || null; FLOW.lesson = null;
  if (HUB && NET.info) hubAssignSources();
  if (FLOW.openDev && !HUB) { FLOW.openDev = false; S.dev.open = true; }
  cameraReset(); applyCamera(); game.cam.smooth = 0;
  playMusic(ARENA.court.music);
  BREAK.open = false;
  if (S.cheats.bigHeads && !S.match.starredBy) S.match.starred = true;
  game.resetCamera();
}
function matchUpdate(dt) {
  const M = S.match; if (!M) return;
  const realDt = 1 / 120;
  if (HUB && NET.info) { hubMenuUpdate(); if (hubStep(dt)) return; }
  if (SC.match) SC.match.pausable = !HUB && !S.dev.open;
  // the dev panel drives the human slots by CPU while it has the focus
  if (S.dev.open) { devAutopilot(true); devUpdate(); }
  if (M.phase === 'break') { if (BREAK.update(dt)) return; }
  if (S.lesson && S.lesson.update) S.lesson.update(dt);
  matchStep(dt);
  if (M.phase === 'break' && !BREAK.open) { if (FLOW.noBreakCard) { cpuSubs(); nextPeriod(); } else BREAK.show(M.breakKind); if (FLOW.onBreak) FLOW.onBreak(M.breakKind); }
  if (M.phase === 'over' && M.phaseT > 3.2 && !M.ended && !HUB) { M.ended = true; const res = matchResult(); S.lastResult = res; if (FLOW.onEnd) FLOW.onEnd(res); else game.go('results', { res }); }
  bannerStep(dt); cameraStep(dt, realDt); hudSounds();
  crowdTick(realDt, true);
}
/** what a finished match says: winner, score, MVP, the best play, box score, style */
function matchResult() {
  const M = S.match, w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  const all2 = S.players.slice(), mvp = all2.slice().sort((a, b) => (b.stats.PTS * 2 + b.stats.REB + b.stats.AST + b.stats.STL * 2 + b.stats.BLK * 2 + b.stats.DNK) - (a.stats.PTS * 2 + a.stats.REB + a.stats.AST + a.stats.STL * 2 + a.stats.BLK * 2 + a.stats.DNK) + (w >= 0 ? (b.team === w) - (a.team === w) : 0) * 6)[0];
  const best = M.plays.slice().sort((a, b) => b.pts - a.pts)[0] || null;
  return { winner: w, score: M.score.slice(), teams: S.teams.map(t => t.id), court: S.court, mvp: mvp && { id: mvp.def.id, name: mvp.name, team: mvp.team, stats: Object.assign({}, mvp.stats) }, best,
    box: all2.map(p => ({ slot: p.slot, id: p.def.id, name: p.name, team: p.team, human: p.human, stats: Object.assign({}, p.stats) })), style: M.style.slice(), starred: M.starred, mode: S.mode, ot: M.ot, quarters: M.quarters };
}
function matchDraw(r) {
  const M = S.match; if (!M) return;
  if (HUB && NET.role === 'server') { r.sky(['#05040a', '#0a0814']); r.overlay(g => hubOverlay(g, r)); return; }
  drawArena(r); drawTwists(r); drawWorldMarks(r); if (S.lesson && S.lesson.world) S.lesson.world(r);
  for (const p of S.players) drawPlayer(r, p);
  if (M.ref && M.ref.y < OY + CH + 66) { const R = M.ref; r.shadow(R.x, R.y, 6, .4); r.actor(R.x, R.y, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view)); }
  drawBall(r);
  if (S.dev.overlays) devOverlays(r);
  r.overlay(g => {
    if (!S.lesson) drawScoreBug(g, r); drawBanner(g, r); drawHudBottom(g, r);
    if (M.phase === 'sponsor') drawSponsor(g, r);
    if (M.phase === 'tipoff' && M.quarter === 1 && M.ot === 0) E.font.title(g, 'TIP-OFF!', Math.round(r.W / 2), Math.round(r.H * .2), { align: 'center', scale: 2, colors: BANNER_COLORS.info });
    if (M.phase === 'inbound' && M.inbounder && M.inbounder.human !== null && M.inbounder.human !== undefined) promptLine(g, '{pass} INBOUND', Math.round(r.W / 2), Math.round(r.H * .22), { align: 'center', input: game.players[M.inbounder.human] || game.input });
    if (M.phase === 'over') { const w = M.winner; E.font.title(g, w < 0 ? 'TIE GAME' : 'FINAL', Math.round(r.W / 2), Math.round(r.H * .42), { align: 'center', scale: 3, colors: BANNER_COLORS.dunk }); if (w >= 0) E.font.text(g, get('team', S.teams[w].id).name + ' WIN!', Math.round(r.W / 2), Math.round(r.H * .42) + 30, '#ffffff', { align: 'center', outline: '#0c0614' }); }
    if (S.lesson && S.lesson.draw) S.lesson.draw(g, r);
    if (S.attract) drawAttractOverlay(g, r);
  });
  if (M.phase === 'break' && BREAK.open && !HUB) BREAK.draw(r);
  if (S.dev.open) devDraw(r);
  if (HUB && NET.info) r.overlay(g => hubOverlay(g, r));
}
/** the sponsor break after a shattered backboard: a fake commercial card while a cleaning bot fits new glass */
function drawSponsor(g, r) {
  const M = S.match, t = M.phaseT, k = clamp(t / .3, 0, 1), w = Math.min(r.W - 40, 300), h = 92, x = Math.round((r.W - w) / 2), y = Math.round(r.H * .3 - (1 - k) * 200);
  E.ui.box(g, x, y, w, h, { bg: ['#fff4d8', '#ffd8a0'], border: '#d02a2a' });
  E.font.title(g, 'GLOBO-BLAM', x + w / 2, y + 6, { align: 'center', scale: 2, colors: ['#ff5a3a', '#d02a2a', '#8a1010'] });
  px.sprite(g, LOGOS.globo.spr, x + 8, y + 8); px.sprite(g, LOGOS.globo.spr, x + w - 20, y + 8);
  wrapText(M.sponsorPending ? M.sponsorPending.line : '', w - 20).slice(0, 4).forEach((l, i) => E.font.text(g, l, x + w / 2, y + 30 + i * 9, '#3a1a0c', { align: 'center', outline: false }));
  E.font.text(g, 'WE\'LL BE RIGHT BACK!', x + w / 2, y + h - 12, Math.floor(t * 3) % 2 ? '#d02a2a' : '#3a1a0c', { align: 'center', outline: false });
}
