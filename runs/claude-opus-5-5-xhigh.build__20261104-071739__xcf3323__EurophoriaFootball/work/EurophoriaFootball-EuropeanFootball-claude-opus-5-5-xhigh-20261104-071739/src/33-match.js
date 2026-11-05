/* THE MATCH SCENE: builds a Match from options (Kick-About, a cup tie, Penalties, a session, training, attract), runs it
 * (or plays a replay), and drives the view, the HUD, the commentary, the camera and the sound from its events.
 * data: { opts (Match options), onEnd(result), backTo, label } */
EF.scenes = EF.scenes || {};
/* ---- the match's sound: effects, whistles and the crowd from its events ---- */
class MatchAudio {
  constructor(m) {
    this.m = m; this.unsub = EF.bus.on('*', ev => { if (ev.match === m || ev.type === 'replayCue') this.on(ev); });
    EF.crowdAudio.start(m.stadium.crowd ? m.stadium.crowd.size : 600); this.chantT = 6; this.oleT = 0;
  }
  dispose() { if (this.unsub) this.unsub(); EF.crowdAudio.stop(); }
  on(ev) {
    const m = this.m, C = EF.crowdAudio, s = EF.sfx;
    switch (ev.type) {
      case 'replayCue': s(ev.cue === 'shot' ? 'shot' : ev.cue === 'woodwork' ? 'doink' : 'touch', { pitch: .7 }); break;
      case 'touch': if (!m.replay) s('touch'); break;
      case 'pass': s('pass'); break;
      case 'shot': s(ev.screamer ? 'shot' : 'kick'); if (ev.screamer) s('screamer'); if (m.replayRec) m.replayRec.cue('shot'); break;
      case 'bounce': if (ev.speed > 30) s(ev.surf === 'puddle' || ev.surf === 'wet' ? 'splash' : ev.surf === 'snow' ? 'crunch' : 'grass', { vol: clamp(ev.speed / 200, .2, 1) }); break;
      case 'boards': s('thump'); break;
      case 'woodwork': s('doink'); C.react('ooh'); if (m.replayRec) m.replayRec.cue('woodwork'); break;
      case 'netHit': s('net'); break;
      case 'goal': case 'ownGoal': s('net'); C.react('roar'); EF.sting('goal'); if (!ev.shootout) { game.after(1.6, () => EF.crowdAudio.chant(m.teams[ev.side].chant)); } break;
      case 'nearMiss': C.react('ooh'); break;
      case 'catch': s('catch'); break;
      case 'parry': case 'tip': s('parry'); break;
      case 'save': C.react(ev.kind === 'catch' ? 'clap' : 'ooh'); break;
      case 'whistle': if (ev.kind === 'half') { s('whistle'); game.after(.35, () => s('whistleLong')); } else if (ev.kind === 'full') { s('whistle'); game.after(.3, () => s('whistle')); game.after(.6, () => s('whistleLong')); } else if (ev.kind === 'end') { s('whistleLong'); } else if (ev.kind !== 'none') s(ev.kind === 'kickoff' ? 'whistleLong' : 'whistle'); break;
      case 'card': s('card'); C.react('boo'); break;
      case 'foul': C.react('whistles'); break;
      case 'slide': s('slide'); break;
      case 'knockdown': case 'launched': s('thud'); break;
      case 'skill': s('swish'); if (ev.kind === 'nutmeg' || ev.kind === 'rainbow') C.react('gasp'); break;
      case 'nutmeg': s('nutmeg'); EF.crowdAudio.chant('ole'); break;
      case 'euphoriaLevel': s('chime'); if (ev.level >= 67) EF.crowdAudio.chant(m.teams[ev.side].chant); break;
      case 'euphoriaFull': s('chime', { pitch: 1.5 }); break;
      case 'europhoria': s('stab'); for (const t of ['eudrums', 'eubass', 'eubrass']) EF.layer(t, 1, .4); EF.crowdAudio.chant(m.teams[ev.side].chant); break;
      case 'europhoriaEnd': for (const t of ['eudrums', 'eubass', 'eubrass']) EF.layer(t, 0, 1); break;
      case 'superCharge': s('superCharge'); break;
      case 'superStrike': s('superRelease'); s('sizzle'); break;
      case 'saveDuel': EF.layer('heart', 1, .1); EF.layer('tension', 1, .2); break;
      case 'saveDuelResult': EF.layer('heart', 0, .3); EF.layer('tension', 0, .5); s(ev.result === 'miss' ? 'buzz' : 'perfect'); break;
      case 'var': for (let i = 0; i < 4; i++) game.after(i * .5, () => s('beep')); break;
      case 'diveBooked': C.react('boo'); break;
      case 'gullLand': case 'gullAway': s('squawk'); break;
      case 'beachHit': s('boing'); break;
      case 'beachPop': s('kick', { pitch: 2 }); break;
      case 'event': if (ev.id === 'floodlight') s('powerDown'); if (ev.id === 'fireworks') s('firework'); break;
      case 'bus': s('horn'); break;
      case 'busHit': s('thump', { pitch: .6 }); break;
      case 'busSmashed': s('superRelease'); break;
      case 'shootoutStart': EF.layer('tension', 1, .5); EF.layer('heart', 1, .5); break;
      case 'shootoutEnd': EF.layer('tension', 0, .5); EF.layer('heart', 0, .5); C.react('roar'); break;
      case 'shootoutKick': if (!ev.scored) C.react('ooh'); else C.react('roar'); break;
      case 'passDone': if (ev.chain >= 5 && m.teams[ev.who.side].chant === 'pasapasa') EF.crowdAudio.chant('ole'); break;
      case 'refHit': C.react('gasp'); break;
      case 'half': EF.music('halftime'); break;
      case 'secondHalf': EF.music('matchbed'); break;
      case 'kickoff': if (m.half === 1 && m.clock < 1) game.after(.8, () => EF.crowdAudio.chant(m.teams[0].chant)); break;
    }
  }
  update(dt, view) {
    const m = this.m, mood = view ? Math.max(view.crowd.mood[0], view.crowd.mood[1]) : .3;
    EF.crowdAudio.set(m.mode === 'goal' || m.mode === 'celebrate' ? 1 : m.mode === 'var' ? .35 : mood, dt);
    this.chantT -= dt; if (this.chantT <= 0 && m.mode === 'play') { this.chantT = 14 + EF.fx(0, 10); const s = m.euphoria[0] >= m.euphoria[1] ? 0 : 1; EF.crowdAudio.chant(m.teams[s].chant); }
  }
}
EF.MatchAudio = MatchAudio;
/* ---- the scene ---- */
EF.cur = null;   // { m, view, comm, replay, audio } of the match on screen
EF.scenes.match = {
  view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], input: EF.KEYS, res: 'ps1', touch: [], camera: { zoom: [.7, 1.7], start: 1 },
  get pausable() { return !EF.inSession && !(EF.cur && EF.cur.attract); },
  enter(d) {
    d = d || {}; const o = Object.assign({}, d.opts || EF.defaultMatchOpts());
    if (o.seed === undefined && EF.link.seed !== null) o.seed = EF.link.seed;
    if (!o.humans) o.humans = [{ input: game.input, side: 0 }];
    const m = new EF.Match(o);
    const cur = EF.cur = { m, view: new EF.MatchView(m), comm: new EF.Commentary(m), replay: new EF.Replay(m), audio: EF.inSession && AIHub.server ? null : new MatchAudio(m), d, endT: 0, ended: false, ht: null, attract: !!d.attract, label: d.label || null, src: m };
    m.replayRec = cur.replay;
    m.replayHook = r => cur.replay;
    EF.Camera.reset(m, m.pitch.map); game.setView(EF.CAMERAS[game.settings.camera] || 'broadcast');
    const W = m.weather; game.weather = W && (W.kind === 'rain' || W.kind === 'snow') ? { kind: W.kind, amount: W.amount, wind: W.wind || 0 } : null;
    m.fog = o.fogStart || 0; m.fogTarget = o.fogStart || m.fogTarget || 0;
    EF.music(o.kind === 'attract' ? 'attract' : 'matchbed');
    m.onEnd = r => { cur.result = r; cur.endT = 0; };
    if (o.kind !== 'training' && o.kind !== 'attract' && !o.shootoutOnly) cur.comm.announce(H.fill(EF.PA_LINES[0], { stadium: EF.titleCase(m.stadium.name), crowd: String(m.stadium.capacity || 3112) }));
    if (o.challenge) { const ch = EF.get('challenge', o.challenge), st = { side: 0 }; cur.chUnsub = EF.bus.on('*', ev => { if (ev.match === m && !m.challengeDone && ch.test(ev, st)) { m.challengeDone = true; EF.toast("GAFFER'S CHALLENGE COMPLETE!", { sub: ch.name }); } }); cur.challenge = ch; cur.chState = st; }
    cur.lineUnsub = EF.bus.on('commentaryLine', ev => { if (ev.match === m && !EF.inSession) { const d2 = EF.Save.data(); d2.heard = (d2.heard || 0) + 1; if (d2.heard >= 50) EF.Save.sticker('barrytrev'); } });
    cur.keithUnsub = EF.bus.on('invaderTackled', ev => { if (ev.match === m && ev.id === 'invader-keith') m.keithTackled = true; });
    game.input.consumeAll();
    EF.bus.emit('matchStart', { match: m });
  },
  exit() { const c = EF.cur; if (c) { c.view.dispose(); c.comm.dispose(); if (c.audio) c.audio.dispose(); for (const u of [c.chUnsub, c.lineUnsub, c.keithUnsub]) if (u) u(); } EF.cur = null; game.timeScale = 1; game.weather = null; EF.music(null); },
  update(dt) {
    const c = EF.cur; if (!c) return;
    const m = c.m;
    if (EF.Dev && EF.Dev.frozen()) { c.view.update(0, c.src); EF.Camera.update(dt, m, c.src); return; }
    // the replay: the match waits while the recording plays
    if (m.mode === 'replay') {
      if (!c.replay.playing) { if (!c.replay.start(m.lastGoal ? m.lastGoal.t : m.t)) { m.endReplay(); } else { c.comm.say('replay', 20, {}, 'replayStart'); } }
      const skip = !c.attract && (game.input.pressed('confirm') || game.input.clicked());
      if (c.replay.playing && (skip || !c.replay.advance(dt))) { c.replay.stop(); m.endReplay(); }
      c.src = c.replay.proxy || m;
    } else { m.update(dt); c.replay.record(); c.src = m; }
    if (m.fogTarget !== undefined) m.fog = approach(m.fog || 0, m.fogTarget, dt * .1);
    game.timeScale = (m.wantScale || 1) * EF.T.gameSpeed;
    c.view.update(dt, c.src); c.comm.update(dt); if (c.audio) c.audio.update(dt, c.view);
    EF.Camera.update(dt, m, c.src);
    if (EF.Hub && EF.Hub.matchStep) EF.Hub.matchStep(dt, c);
    if (c.result && !c.ended) { c.endT += dt / Math.max(.05, game.timeScale); if (c.endT > 1.2) { c.ended = true; game.timeScale = 1; if (c.d.onEnd) c.d.onEnd(c.result, m); else game.go('results', { result: c.result, opts: m.o, again: c.d }); } }
  },
  draw(r) {
    const c = EF.cur; if (!c) return;
    c.view.draw(r, c.src);
    EF.HUD.draw(r, c.m, c.src);
    if (c.m.mode === 'halftime') r.overlay(g => EF.halftimePanel(g, r, c.m));
    c.comm.draw(r);
    if (c.attract && EF.attractOverlay) EF.attractOverlay(r, c);
    if (EF.Hub && EF.Hub.matchOverlay) EF.Hub.matchOverlay(r, c);
  }
};
EF.defaultMatchOpts = () => ({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse', kind: 'kickabout', draws: game.settings.draws || 'allowed' });
EF.restartMatch = () => { const c = EF.cur; if (!c) return; game.resume && game.resume(); const d = Object.assign({}, c.d, { opts: Object.assign({}, c.m.o, { seed: undefined, onEnd: undefined }) }); delete d.opts.humans; d.opts.humans = c.m.humans.filter(h => h.input).map(h => ({ input: h.input, side: h.side })); game.go('match', d); };
/** the half-time overlay: the score, two big stats, a line */
EF.halftimePanel = (g, r, m) => {
  const w = Math.min(r.W - 40, 280), x = Math.round((r.W - w) / 2), y = Math.round(r.H * .18), h = 116;
  E.ui.box(g, x, y, w, h, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .94 });
  E.font.title(g, 'HALF TIME', r.W / 2, y + 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
  EF.drawCrest(g, m.teams[0], x + 30, y + 54, 24); EF.drawCrest(g, m.teams[1], x + w - 30, y + 54, 24);
  E.font.text(g, m.score[0] + ' - ' + m.score[1], r.W / 2, y + 44, '#ffffff', { align: 'center', scale: 3, outline: '#000' });
  const tot = Math.max(1, m.possT[0] + m.possT[1]), pos = Math.round(m.possT[0] / tot * 100);
  E.font.text(g, 'SHOTS  ' + m.stats.shots[0] + ' - ' + m.stats.shots[1], r.W / 2, y + 74, '#c8d0e8', { align: 'center', outline: false });
  E.font.text(g, 'POSSESSION  ' + pos + '% - ' + (100 - pos) + '%', r.W / 2, y + 88, '#c8d0e8', { align: 'center', outline: false });
};
