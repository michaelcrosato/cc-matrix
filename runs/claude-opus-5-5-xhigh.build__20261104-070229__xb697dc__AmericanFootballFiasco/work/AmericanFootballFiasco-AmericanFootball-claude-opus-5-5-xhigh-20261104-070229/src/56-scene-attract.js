// The attract mode: after 10 seconds without input on the title, the menu or the setup, a looping demo of about 100
// seconds plays the segments in FF.data.attract: live CPU plays with forced calls and cheats for each highlight, the
// play-call screen, a story snippet, the halftime show, the champions, the records, the logo. DEMO PLAY at the top,
// PRESS ANY BUTTON at the bottom; any input goes back to the screen it came from. Nothing is saved.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, ui = FF.ui, bus = FF.bus;
const AT = FF.attract = { seg: null, k: 0, t: 0, mv: null, seen: {}, from: 'title', loops: 0 };
const SEGS = () => FF.data.attract;
function stopMatch() { if (AT.mv) { AT.mv.dispose(); AT.mv = null; } bus.clearMods(); }
function startSeg(k) {
  stopMatch(); AT.k = k % SEGS().length; if (AT.k === 0 && k > 0) AT.loops++;
  const s = AT.seg = SEGS()[AT.k]; AT.t = 0; AT.state = {};
  if (s.kind === 'match' || s.kind === 'playcall' || s.kind === 'show') {
    const spec = Object.assign({ mode: 'attract', humans: { 0: [], 1: [] }, seed: 11 + AT.k * 7 + AT.loops, quarterLength: 120 }, s.spec);
    AT.mv = new FF.MatchView(spec); const m = AT.mv.m; m.fastCalls = true; m.cheats = Object.assign({}, s.cheats); m.cheatSide = s.cheatSide;
    if (s.calls) m.forceCall = { 0: { play: s.calls[0], flip: false, card: null }, 1: { play: s.calls[1], flip: false, card: null } };
    if (s.forceKick) m.forceKick = s.forceKick; if (s.doinkIn) m.forceDoinkIn = true;
    if (s.mascot !== undefined) m.mascotPlay = s.mascot;
    if (s.lightsOut) m.ots.trigger('lightsOut', { plays: 3 });
    if (s.hot) for (const sl of s.hot) { const a = m.roster[0].find(x => x.homeSlot === sl); if (a) m.ots.setHot(a, 3, 'sauce'); }
    if (s.slowQB) m.onSetup = mm => { const qb = mm.bySlot[mm.poss].QB; if (qb && qb.brain) qb.brain.slow = true; mm.qbHold = 2.4; };
    FF.cam.reset(m.los, m.ballY);
    if (s.kind === 'playcall') AT.state.pcs = [new FF.PlayCall(m, 0, [0]), new FF.PlayCall(m, 1, [1])];
    if (s.kind === 'show') { AT.state.show = true; bus.emit('halftime', { m }); m.phase = 'HALFTIME'; m.holdHalftime = true; FF.cam.reset(F.MID_X + 100, F.SIDE_B); }
  } else if (s.kind === 'champions') { AT.state.stage = new FF.Stage('megadome', { home: 'fiascos', away: 'dynasty' }); AT.state.stage.enter(); AT.state.stage.crowd.excite(1); }
  else { FF.stage().enter(); }
  if (s.kind === 'snippet') { const sp = FF.data.speakers[s.who]; AT.state.talk = new E.Dialog(game, { lines: 3, voice: c => FF.voice.letter(c, sp.voice) }); AT.state.talk.say(s.lines, { name: sp.name, portrait: FF.speakerRig(s.who), portraitSize: 44, auto: 2.2, modal: false }); }
  if (s.expect === 'story' || s.expect === 'champions' || s.expect === 'records' || s.expect === 'title') AT.seen[s.id] = true;
}
// what each segment showed (for the tests)
bus.on('*', d => { const s = AT.seg; if (!s || !AT.mv || d.m !== AT.mv.m) return; if (d.ev === s.expect) AT.seen[s.id] = true; if (s.id === 'snowplow' && d.ev === 'special') AT.seen.snowplow = true; });
FF.scenes.attract = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) { AT.from = (d && d.from) || 'title'; AT.loops = 0; AT.since = 0; AT.seen = {}; AT.idle = 0; game.audio.busVol('voices', game.settings.voices * .6); startSeg(0); FF.audioFx.music('ATTRACT'); FF.idle.reset(); },
  exit() { stopMatch(); game.audio.busVol('voices', game.settings.voices); game.timeScale = 1; },
  update(dt) {
    const s = AT.seg, rdt = game.timeScale > 0 ? dt / game.timeScale : 1 / 120;
    AT.t += rdt; AT.since += rdt;
    // any input leaves, back to where it came from (the input is used up)
    if (FF.idle.update(rdt) === 0 && AT.since > .5) { game.players.forEach(p => p.consumeAll()); game.go(AT.from, null, { fade: 'dissolve' }); return; }
    if (s.kind === 'match' || s.kind === 'show') {
      const m = AT.mv.m;
      if (s.kind === 'show') { AT.mv.update(dt, rdt, { frozen: true }); FF.cam.override = () => ({ x: F.MID_X + 160, y: F.SIDE_B - 20, z: .85 }); FF.cam.update(m, rdt); FF.cam.override = null; if (AT.t > .4 && !AT.state.pyro) { AT.state.pyro = true; FF.fx.pyro(m); FF.audioFx.sfx('cannon'); } }
      else {
        if (m.qbHold) { const qb = m.bySlot && m.bySlot[m.poss] && m.bySlot[m.poss].QB; if (qb && qb.brain && m.phase === 'LIVE' && m.play.t < m.qbHold) qb.brain.readT2 = 1; }
        if (s.special && m.phase === 'LIVE') { const a = m.roster[s.special[1]].find(x => x.homeSlot === s.special[0]); if (a && m.specialReady(a) && !m.specialsUsed[a.special + ':' + a.side]) m.trySpecial(a); }
        if (s.refDown && m.phase === 'LIVE' && m.play.intBy && !AT.state.ref && AT.mv.side) { AT.state.ref = true; const rf = AT.mv.side.refs[1]; const h = m.ball.holder; if (h) { rf.x = h.x + m.dir(h.side) * 40; rf.y = h.y; } }
        if (s.lateHit && (m.phase === 'CELEBRATE' || m.phase === 'DEAD') && !AT.state.late) { AT.state.late = true; const a = m.on.find(x => x.side === 0 && x.downT <= 0); if (a) m.lateHit(a, true); }
        if (s.replay && m.phase === 'CELEBRATE' && !AT.state.replayed && m.phaseT < 1.2 && FF.replay.rec) { FF.replay.rec.after = 0; FF.replay.record(m, 1 / 60); }
        if (s.replay && !AT.state.replayed && FF.replay.last && FF.replay.last.kind === 'td') { AT.state.replayed = true; FF.replay.play(FF.replay.last, { caption: 'INSTANT REPLAY' }); }
        AT.mv.update(dt, rdt, { noControl: true, skip: false });
      }
    } else if (s.kind === 'playcall') {
      const m = AT.mv.m; AT.mv.update(dt, rdt, { frozen: true });
      const want = [{ tab: 'PASS', id: 'deep_post', card: 'HOT_SAUCE' }, { tab: 'BASE', id: 'cover2', card: null }];
      AT.state.pcs.forEach((pc, i) => { const w = want[i], k = Math.floor(AT.t * 2.2); pc.tab = Math.max(0, pc.opt.tabs.indexOf(w.tab)); const ids = pc.plays(); pc.focus.set(ids.map((id, j) => ({ x: 0, y: 0, w: 1, h: 1, id }))); pc.focus.i = Math.min(k % (ids.length + 1), Math.max(0, ids.indexOf(w.id))); if (AT.t > 1.4 && i === 0) { pc.row = 'cards'; pc.card = w.card; } if (AT.t > 2.4 && !pc.done) { pc.row = 'grid'; pc.focus.i = ids.indexOf(w.id); pc.pick(w.id); } });
    } else if (s.kind === 'snippet') { AT.state.talk.update(rdt); FF.stage().update(rdt); }
    else if (s.kind === 'champions') { const st = AT.state.stage; st.update(rdt); st.crowd.excite(1); if (Math.random() < rdt * 4) game.particles.bits(F.MID_X + (Math.random() - .5) * 300, F.MID_Y + 20, 160, 10, ['#e8742a', '#4a2a6a', '#f4e8c8', '#ffd84a']); }
    else FF.stage().update(rdt);
    if (AT.t >= s.dur && !(FF.replay.playing && AT.t < s.dur + 4)) { if (FF.replay.playing) FF.replay.stop(); startSeg(AT.k + 1); }
  },
  draw(r) {
    const s = AT.seg;
    if (AT.mv) AT.mv.draw(r);
    else if (s.kind === 'champions') { const st = AT.state.stage; st.draw(r); r.shape('stage', F.MID_X, F.MID_Y - 40, 0, {}); r.shape('trophy', F.MID_X, F.MID_Y - 46, 12, {}); r.shape('cake', F.MID_X + 60, F.MID_Y - 30, 12, {}); }
    else FF.stage().draw(r);
    r.overlay(g => {
      const m = AT.mv && AT.mv.m;
      if (s.kind === 'match' && m) { if (FF.replay.playing) FF.hud.replayOverlay(g, r, FF.replay.playing); else { FF.hud.scoreBug(g, r, m); FF.fx.drawCenter(g, r); FF.talk.draw(g, r); } }
      if (s.kind === 'playcall' && m) { const w = Math.floor(r.W / 2); AT.state.pcs.forEach((pc, i) => pc.draw(g, r, i * w, w, false)); }
      if (s.kind === 'show') { E.font.title(g, 'HALFTIME SHOW', r.W / 2, 30, { scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'], align: 'center', outline: '#000', depth: 2 }); }
      if (s.kind === 'snippet') { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0a20')); for (let k = 0; k < 8; k++) if (Math.random() < .1) game.flash('#ffffff', .04, .08); E.font.title(g, 'PRESS CONFERENCE', r.W / 2, 40, { scale: 2, colors: ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' }); AT.state.talk.draw(r); }
      if (s.kind === 'champions') { E.font.title(g, 'CHAMPIONS!', r.W / 2, 26, { scale: 4, colors: ['#fff8a0', '#ffd84a', '#ff9a2a', '#e8481a'], align: 'center', outline: '#000', depth: 3 }); ui.T(g, 'THE TUMBLEWEED FIASCOS WIN THE FIASCO CUP', r.W / 2, 64, '#f4e8c8', { align: 'center' }); }
      if (s.kind === 'records') FF.drawRecords(g, r, { page: 0 });
      if (s.kind === 'logo' || s.kind === 'title') { px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, r.W, 56 + (FF.logoTop || 14), '#0a0414')); FF.drawLogo(g, r, s.kind === 'logo' ? AT.t : 3, 14); }
      // DEMO PLAY / PRESS ANY BUTTON
      px.rect(g, 0, 0, r.W, 11, '#000000'); E.font.text(g, 'DEMO PLAY', 6, 2, '#ff4a3a', { outline: false }); if (s.caption) E.font.text(g, s.caption, r.W - 6, 2, '#ffd84a', { outline: false, align: 'right' });
      if (Math.floor(AT.t * 2) % 2 === 0) E.font.title(g, 'PRESS ANY BUTTON', r.W / 2, 16, { scale: 2, colors: ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' });
    });
  }
};
})();
