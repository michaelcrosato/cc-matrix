/* ---- THE DEBUG HANDLE (game.debug): tests and tools/check.mjs read it. snapshot() gives the scene, the UI's device
 * and prompts, the match (score, players, hype, fire, items, result), the ball, the last ball's record, the director,
 * story, attract, hub and dev state, the coverage flags and the errors; idealPress(), forceDelivery(spec),
 * forceOutcome(kind), startMatch(cfg), startChapter(n, beat), setTuning(k, v), spawnItem(id, at), triggerChaos(id),
 * skipTo(state). Also: dev mode over every scene, the dev overlays, and the story goals' flags. ---- */
game.debug = {
  snapshot() {
    const m = Play.m, I = game.input, inn = m && m.inn, b = m && m.ball, last = inn && inn.recs[inn.recs.length - 1];
    return {
      scene: game.sceneName, mode: m ? m.cfg.mode : null,
      ui: { device: Glyphs.device(I), glyphs: Glyphs.style(I), touchGate: touchOnly() && game.sceneName === 'title', prompts: ['shot', 'loft', 'block', 'special', 'run', 'back', 'charge', 'confirm'].map(a => ({ a, info: Glyphs.info(I, a) })), menuFocus: scenes.title && scenes.title.menu ? scenes.title.menu.i : null, titleState: scenes.title ? scenes.title.state : null },
      match: m && inn ? { innings: m.innNo, runs: inn.runs, wkts: inn.wkts, balls: inn.balls, over: m.over, target: inn.target, need: m.need(), freeHit: inn.freeHit, striker: m.striker && m.striker.id, nonStriker: m.nonStriker && m.nonStriker.id, bowler: m.bowlerP && m.bowlerP.id, hype: m.hype.slice(), fire: Object.assign({}, m.fire), items: m.items.map(x => x.slice()), result: m.result, phase: m.phase, pt: m.pt, field: m.fieldPreset, overRound: m.overRound, reviews: m.reviews.slice(), chaos: m.chaos.map(c => c.id), targetsHit: Object.keys(m.targetsHit), weather: m.weather, time: m.timeOfDay, fog: m.fog, lights: game.lights.enabled, tokens: m.tokens.length, decision: m.decision ? { kind: m.decision.kind, given: m.decision.given, truth: m.decision.truth, reviewing: !!m.decision.reviewing, final: m.decision.final } : null, catchRing: !!m.catchRing, holder: m.holder ? m.holder.id : null, kmh: m.cur && m.cur.kmh, marker: m.marker && m.marker.slice() } : null,
      ball: b ? { phase: b.phase, x: b.x, y: b.y, z: b.z, v: hyp(b.vx, b.vy, b.vz), pitched: b.pitched, fx: b.fx, hidden: !!b.hidden } : null,
      last: last ? { delivery: last.delivery, kmh: last.kmh, shot: last.shot, grade: last.grade, runs: last.runs, ran: last.ran, boundary: last.boundary, extras: last.extras, wicket: last.wicket, bonus: last.bonus, meter: last.meter, aftertouch: last.aftertouch, pitch: last.pitch, target: last.target, charged: !!last.charged, noBall: last.noBall } : null,
      director: { cam: MatchView.cam, replay: !!MatchView.replay },
      story: Story.data ? { chapter: Story.data.chapter, stars: Story.data.stars, done: Story.data.done, flags: m ? Object.keys(m.flags).filter(k => m.flags[k]) : [] } : null,
      attract: { active: game.sceneName === 'attract', segment: Attract.seg },
      hub: { active: !!game.hubActive, phase: Hub.phase, sent: Object.assign({}, Hub.sent), ended: Hub.ended },
      dev: { open: Dev.isOpen, tab: Dev.tab, row: Dev.row, changed: Tuning.changed() },
      coverage: Object.assign({}, coverage.seen), errors: game.errors.map(e => e.message || String(e))
    };
  },
  idealPress(btn = 'shot', aim) { return Play.m ? Play.m.idealPress(btn, aim) : null; },
  forceDelivery(spec) { if (Play.m) Play.m.force.delivery = Object.assign({ grade: 'green' }, spec); },
  forceOutcome(kind, o = {}) { const m = Play.m; if (!m) return; m.force.outcome = Object.assign({ kind }, o); m.cpuPlan = null; if (m.phase === 'setup') AI.planBowling(m); },
  startMatch(cfg = {}, hooks) { game.go('match', { cfg: quickConfig(Object.assign({ toss: false }, cfg)), hooks }, { fade: 0 }); },
  startChapter(n, beat = 'match') { if (!Story.data) Story.newGame(); const c = CHAPTERS[n - 1]; if (beat === 'pre') game.go('cutscene', { scene: c.pre, then: () => Story.match(n) }, { fade: 0 }); else Story.match(n); },
  setTuning(k, v) { Tuning.set(k, v); Dev.after(k); },
  spawnItem(id, at) { if (Play.m) Play.m.spawnToken(id, at); },
  triggerChaos(id) { if (Play.m) Play.m.startChaos(id); },
  skipTo(state) { const m = Play.m; if (!m) return; if (state === 'lastOver') { m.inn.balls = (Math.ceil(m.inn.overs) - 1) * 6; m.over = Math.floor(m.inn.balls / 6); } if (state === 'secondInnings' && m.innNo === 0) { m.inn.done = true; m.inn.end = 'overs'; m.endInnings(); m.afterBreak(); } },
  match: () => Play.m, K
};
/* dev mode over every scene: while it's open the scene below is frozen and gets no input (called once, at the start) */
function wrapScenes() { for (const [name, S] of Object.entries(scenes)) {
  const up = S.update, dr = S.draw;
  S.update = function (dt) { if (Dev.isOpen) { Dev.update(dt); return; } if (Dev.toggles.slowmo && Play.m && game.sceneName === name && S.pausable) { if (game.timeScale > .26) game.timeScale = .25; } return up.call(this, dt); };
  S.draw = function (r) { dr.call(this, r); if (Dev.isOpen) Dev.draw(r); else if (S.pausable) DevOverlays.draw(r); };
} }
/* the dev overlays: hitboxes and zones, AI intent, fielder assignments, skeletons */
const DevOverlays = {
  draw(r) {
    const m = Play.m, t = Dev.toggles, B = MatchView.B; if (!m || !B || !m.inn) return;
    const W = (x, y, z = 0) => r.w(x + B.OX, y + B.OY, z);
    if (t.hitboxes) r.overlay(g => {
      const box = (x0, y0, z0, x1, y1, z1, c) => { for (const [a, b] of [[[x0, y0, z0], [x1, y0, z0]], [[x0, y0, z1], [x1, y0, z1]], [[x0, y0, z0], [x0, y0, z1]], [[x1, y0, z0], [x1, y0, z1]], [[x0, y1, z0], [x1, y1, z0]], [[x0, y1, z1], [x1, y1, z1]]]) { const p = W(...a), q = W(...b); px.line(g, p[0], p[1], q[0], q[1], c); } };
      box(-3.6, -.5, 0, 3.6, .5, 12.6, '#ff4a4a'); box(-3.6, 319.5, 0, 3.6, 320.5, 12.6, '#ff4a4a');
      const pb = Batting.padBox(m); box(pb.xa, pb.y0, 0, pb.xb, pb.y1, pb.z1, '#4aa8ff');
      if (m.shotPress) { const s = SHOTS[m.shotPress.shotId], h = m.hand, pl = m.shotPress.plane, xa = -h * s.line[0], xb = -h * s.line[1]; box(Math.min(xa, xb), pl - .5, s.z[0], Math.max(xa, xb), pl + .5, s.z[1], '#6aff8a'); }
      for (const f of m.fielders) { const p = W(f.x, f.y, 10); for (let a = 0; a < TAU; a += .5) px.dot(g, p[0] + Math.cos(a) * 9 * r.view.scale, p[1] + Math.sin(a) * 4 * r.view.scale, '#ffd36a'); }
    });
    if (t.intent) r.overlay(g => { if (m.cpuPlan && (m.phase === 'setup' || m.phase === 'runup')) { const p = W(m.cpuPlan.tx, m.cpuPlan.ty); px.disc(g, p[0], p[1], 3, '#ff8ad8'); UI.text(g, 'CPU: ' + m.cpuPlan.id + (m.cpuPlan.special ? ' +SPECIAL' : '') + ' ' + m.cpuPlan.grade, p[0] + 5, p[1] - 4, '#ff8ad8', { font: 'tiny' }); } if (m.batPlan && m.batPlan.decided) { const s = m.striker, p = W(s.x, s.y, 30); UI.text(g, 'CPU BAT: ' + (m.batPlan.btn || 'leave') + (m.batPlan.sector !== null && m.batPlan.sector !== undefined ? ' ' + Math.round(m.batPlan.sector) + ' deg' : ''), p[0], p[1], '#ff8ad8', { font: 'tiny', align: 'center' }); } });
    if (t.assign && m.phase === 'inPlay') r.overlay(g => { for (const f of m.fielders) if ((f.task === 'chase' || f.task === 'backup') && f.chase) { const a = W(f.x, f.y), b = W(f.chase.x, f.chase.y); px.line(g, a[0], a[1], b[0], b[1], f.task === 'chase' ? '#ffd36a' : '#6ae8ff'); UI.text(g, f.task.toUpperCase(), a[0], a[1] - 8, '#ffffff', { font: 'tiny', align: 'center' }); } });
    if (t.skeleton) for (const a of m.fielders.concat(m.batters)) { const rig = MatchView.rigFor(a, m); if (rig.debug) rig.debug(r); }
  }
};
/* the story goals' flags, from the bus */
bus.on('*', (d, type) => {
  const m = d && d.match; if (!m || m !== Play.m) return;
  const H = s => m.isHuman(s);
  if (type === 'wicket' && d.how === 'caught' && m.cur.catchGrade === 'perfect' && H(m.bowlSide)) m.flags.perfectCatch = true;
  if (type === 'wicket' && d.how === 'stumped' && H(m.bowlSide)) m.flags.stumpedOne = true;
  if (type === 'review:result' && d.overturned && H(d.side)) m.flags.wonReview = true;
  if (type === 'boundary' && d.n === 6 && m.contact && m.contact.shot === 'hook' && H(m.bat)) m.flags.hookSix = true;
  if (type === 'run:dive') m.cur.dived = true;
  if (type === 'match:end' && m.innings.length) { const i = m.inn, last = i && i.recs[i.recs.length - 1]; if (last && last.dived && H(m.sideOf(i.bat))) m.flags.diveWin = true; }
  if (type === 'wicket' && m.cfg.cheat.invincible && H(m.bat) && m.cur.wicket) { m.cur.wicket = null; m.cur.devSaved = true; }
  if (type === 'ball:done') { const r = d.rec; if (r.wicket || r.boundary === 6 || r.bonus || r.screamer) { const h = m.highlights[m.highlights.length - 1]; if (h && h.rec === r && !h.frames) h.frames = Recorder.window(6).map(f => JSON.parse(JSON.stringify(f))); } }
  if (type === 'match:start' || type === 'innings:start') Dev.applyToggles();
});
