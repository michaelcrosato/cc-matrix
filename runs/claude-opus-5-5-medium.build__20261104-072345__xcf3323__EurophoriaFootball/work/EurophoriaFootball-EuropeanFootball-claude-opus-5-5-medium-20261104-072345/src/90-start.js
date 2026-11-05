/* 90-start: the About data, content validation, game.debug (the tests' and tools' handle), test hooks, the dev panel
 * wrapped round every scene, and the start: a hub session connects; otherwise the title (or the deep link). */
EF.ABOUT = EF_ABOUT || { sourceInformation: {}, testingFeedback: [], engineFeedback: [], promptFeedback: [] };
/** every reference between entries, every text the font must draw, the pools' sizes; problems go to game.fail */
EF.validate = () => {
  const P_ = [], ok = s => /^[\x20-\x7E]*$/.test(s);
  for (const t of EF.all('team')) {
    if (!EF.get('stadium', t.stadium)) P_.push('team ' + t.id + ': stadium ' + t.stadium);
    if (!EF.get('formation', t.formation)) P_.push('team ' + t.id + ': formation');
    if (!EF.get('tactic', t.tactic)) P_.push('team ' + t.id + ': tactic');
    if (!EF.get('chant', t.chant)) P_.push('team ' + t.id + ': chant');
    if (!EF.get('celebration', t.celebration)) P_.push('team ' + t.id + ': celebration');
    if (t.players.length !== 5) P_.push('team ' + t.id + ': 5 players');
    if (t.players.filter(p => p.captain).length !== 1) P_.push('team ' + t.id + ': one captain');
    if (t.players.filter(p => p.pos === 'GK').length !== 1) P_.push('team ' + t.id + ': one keeper');
    for (const p of t.players) { if (p.captain && !EF.get('super', p.super)) P_.push('captain ' + p.id + ': super'); if (!ok(p.name)) P_.push('font: ' + p.name); }
  }
  for (const s of EF.all('stadium')) for (const e of s.events || []) if (!EF.get('event', e)) P_.push('stadium ' + s.id + ': event ' + e);
  for (const R of EF.ROUNDS) { if (!EF.get('team', R.opp) || !EF.get('stadium', R.stadium) || !EF.get('challenge', R.challenge) || !EF.get('referee', R.referee)) P_.push('round ' + R.id); for (const [w] of R.talk) if (!EF.speakerName(w)) P_.push('speaker ' + w); }
  for (const l of EF.all('lines')) for (const e of l.list) { if (!ok(e.text) || (e.reply && !ok(e.reply.text))) P_.push('font in lines ' + l.id); if (!EF.SPEAKERS[e.who] && e.who !== 'pa') P_.push('speaker ' + e.who); }
  for (const s of EF.all('sticker')) if (!ok(s.name)) P_.push('font: sticker ' + s.id);
  if (P_.length) game.fail('content', new Error(P_.join('; ')));
  return P_;
};
EF.lineCount = () => EF.all('lines').reduce((a, l) => a + l.list.length + l.list.filter(e => e.reply).length, 0);
/* ---- the handle tests and tools read ---- */
game.debug = {
  snapshot() {
    const m = LIVE.m, sc = game.scene || {};
    return { scene: game.sceneName, part: sc.step != null ? sc.step : sc.phase || null, mode: m ? m.mode : null, half: m ? m.half : null, clock: m ? +m.clock.toFixed(2) : null, minute: m ? Math.floor(m.minute) : null, stoppage: m ? m.stoppage : null,
      score: m ? m.score.slice() : null, ball: m ? [Math.round(m.ball.x), Math.round(m.ball.y), Math.round(m.ball.z)] : null, owner: m && m.owner ? m.owner.data.name : null,
      humans: m ? m.slots.map(sl => sl.f ? { p: sl.i, id: sl.f.id, name: sl.f.data.name, x: Math.round(sl.f.body.x), y: Math.round(sl.f.body.y), state: sl.f.state } : null) : [],
      euphoria: m ? m.euph.map(Math.round) : null, europhoria: m ? m.euroT.map(v => +v.toFixed(1)) : null, cards: m ? m.cards.length : 0, sentOff: m ? m.players.filter(f => f.sentOff && f.state !== 'gone').length : 0,
      setpiece: m && m.sp ? m.sp.kind : null, shootout: m && m.so ? m.so.score.slice() : null, stadium: m ? m.st.id : null, weather: game.weather ? game.weather.kind : null,
      cup: EF.Save.data && EF.Save.data.cup ? { round: EF.Save.data.cup.round, results: EF.Save.data.cup.results.length } : null,
      attract: { active: game.sceneName === 'attract', segment: game.sceneName === 'attract' && sc.seg != null ? EF.ATTRACT_SEGS[sc.seg].id : null, idle: +EF.idle.t.toFixed(2) },
      dev: { open: EF.Dev.isOpen, changed: EF.tuneChanged().length }, hub: { active: SESSION, role: EF.Hub.role, sent: EF.Hub.sent, received: EF.Hub.received },
      ui: { focus: sc.menu ? sc.menu.i : null }, errors: game.errors.length };
  },
  teleport(x, y, z = 0) { const m = LIVE.m, f = m && m.slots[0] && m.slots[0].f; if (f) { f.body.x = x; f.body.y = y; f.body.z = z; } }
};
/* ---- test hooks ---- */
EF.test = {
  startMatch(o = {}) { game.go('match', Object.assign({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse', seed: 1, draws: 'allowed' }, o), { fade: 0 }); game.advance(1 / 60); return LIVE.m; },
  giveBall(side, idx, x, y) { const m = LIVE.m, f = m.side[side][idx]; m.mode = 'play'; m.sp = null; if (x != null) { f.body.x = x; f.body.y = y; } m.takeBall(f); return f; },
  place(id, x, y) { const f = LIVE.m.players[id]; f.body.x = x; f.body.y = y; },
  setEuphoria(side, v) { LIVE.m.euph[side] = v; },
  simUntil(pred, max = 60) { let t = 0; while (t < max && !pred()) { game.advance(1 / 60); t += 1 / 60; } return t < max; },
  cheat(name, on = true) { EF.Dev.set(name, on); }
};
/* ---- the dev panel over every scene, the touch-only and hub wrappers ---- */
for (const [id, sc] of Object.entries(EF.scenes)) {
  const up = sc.update, dr = sc.draw;
  sc.update = function (dt) {
    EF.mouseEndStepPending = true;
    if (EF.pendingToasts.length && LIVE.hud) for (const [a, b] of EF.pendingToasts.splice(0)) LIVE.hud.toast(a, b);
    if (EF.Dev.update(dt)) { if (this.isMatch && !(EF.Dev.cheats.freeze && !EF.Dev.stepOnce)) { EF.Dev.syncSlots(true); up.call(this, dt); } else if (!this.isMatch) { /* menus wait */ } EF.mouseEndStep(); return; }
    up.call(this, dt);
    EF.mouseEndStep();
  };
  sc.draw = function (r) { dr.call(this, r); EF.Dev.draw(r); };
  if (SESSION) sc.pausable = false;
}
/* ---- boot ---- */
window.__EF = EF;
const startScene = () => {
  if (SESSION) return 'hubwait';
  const s = LINK.scene;
  if (s === 'dev' && LINK.part === 'anim') return 'animgallery';
  if (s && EF.scenes[s]) return s;
  return 'title';
};
game.start({ scenes: EF.scenes, scene: startScene(), boot: { title: 'EUROPHORIA FOOTBALL', steps: [
  ['Calling the squads', () => { EF.initSpeakers(); EF.initStickers(); }],
  ['Opening the sticker album', () => { EF.Save.load(); for (const st of EF.all('sticker')) if (st.team === 'kipperton' && !EF.Save.data.stickers[st.id]) EF.Save.data.stickers[st.id] = true; }],
  ['Checking the rule book', () => { EF.validate(); }]
] } });
if (LINK.dev && !SESSION) game.after(.2, () => EF.Dev.open());
