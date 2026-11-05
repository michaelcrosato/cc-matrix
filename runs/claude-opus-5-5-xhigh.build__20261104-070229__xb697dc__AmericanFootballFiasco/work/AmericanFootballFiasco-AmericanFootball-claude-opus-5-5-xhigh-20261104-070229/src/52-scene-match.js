// The match: FF.MatchView ties the sim to everything you see and hear (the stadium, the crowd, the sideline, the rigs,
// the ball, FX, HUD, camera, music layers, replays); the 'match' scene adds the play calls, the coin toss, quarter
// breaks, the halftime show, the results, highlights and records. Drills and the attract mode reuse MatchView.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, ui = FF.ui, bus = FF.bus;
class MatchView {
  /** spec: a scenario (FF.Match's); o: { full (a full crowd), night } */
  constructor(spec, o = {}) {
    FF.bus.clearMods(); if (FF.match && FF.match.ots) FF.match.ots.dispose();
    FF.fx.reset(); FF.talk.reset(); FF.replay.reset(); FF.lightsOut = false; FF.control.coopSlot = null;
    const m = this.m = FF.match = new FF.Match(spec);
    const st = this.stadium = FF.stadium = new FF.Stadium(m.stadium, { night: spec.night, full: spec.fullCrowd });
    FF.ezLeft = m.teams[m.dir(0) > 0 ? 0 : 1].abbr; FF.ezRight = m.teams[m.dir(0) > 0 ? 1 : 0].abbr;
    m.surface = (x, y) => st.surfaceAt(x, y);
    st.enter({ weather: spec.weather });
    m.snow = !!(st.weather && st.weather.kind === 'snow'); m.weatherWet = !!st.weather;
    this.crowd = new FF.Crowd(st, m.teams, { full: spec.fullCrowd });
    this.side = new FF.Sideline(m, st);
    this.rigs = {};
    for (const a of m.all) this.rigs[a.id] = FF.Rigs.athlete(a.p, m.teams[a.side], a.side === 0);
    this.bigHeads = null; this.t = 0; this.lastPhase = null; this.replayFrame = null;
    FF.crowdAudio.scale = st.def.crowdScale || 1; FF.crowdAudio.stop();
    FF.cam.reset(m.los, m.ballY); FF.cam.setView(FF.cam.baseView()); game.cam.smooth = 0; game.cam.bounds = v => { const b = st.map.bounds(v); return { x0: b.x0, y0: b.y0 - 60, x1: b.x1, y1: b.y1 }; };
    FF.audioFx.music(st.def.music, { force: true });
    FF.matchScene = this;
    this.banner = (who, kind) => { FF.hud.banner = { t: 0, kind, name: who.name, rig: this.rigFor(who) }; };
  }
  rigFor(a) { if (!this.rigs[a.id]) this.rigs[a.id] = a.mascot ? FF.Rigs.mascot(this.m.teams[a.side]) : FF.Rigs.athlete(a.p, this.m.teams[a.side], a.side === 0); return this.rigs[a.id]; }
  dispose() { if (this.m.ots) this.m.ots.dispose(); FF.crowdAudio.stop(); game.weather = null; FF.lightsOut = false; FF.replayPlaying = false; FF.replay.playing = null; game.timeScale = 1; }
  /** one step: the sim (unless a replay plays), then the presentation */
  update(dt, rdt, o = {}) {
    const m = this.m; this.t += rdt;
    if (FF.replay.playing) { this.replayFrame = FF.replay.update(rdt); if (o.skip) FF.replay.stop(); }
    else {
      this.replayFrame = null;
      if (!o.frozen) {
        if (!o.noControl) FF.control.update(m, dt);
        if (o.beforeStep) o.beforeStep(dt);
        m.stepSim(dt);
        FF.replay.record(m, dt);
        if (m.phase === 'LIVE' && this.lastPhase !== 'LIVE') FF.replay.start(m);
      }
    }
    if (m.phase !== this.lastPhase) { this.phaseChanged(this.lastPhase, m.phase); this.lastPhase = m.phase; }
    if (FF.fast) return;
    this.present(dt, rdt);
  }
  phaseChanged(from, to) {
    const m = this.m;
    if (to === 'DEAD' && m.result) { const why = m.result.why; this.side.call(why === 'td' ? 'td' : why === 'incomplete' ? 'inc' : why === 'firstDown' ? 'first' : 'spot'); }
    if (to === 'CELEBRATE' && m.result && m.result.why === 'td') this.side.call('td');
    if (to === 'PLAYCALL' && m.callKind === 'scrimmage' && m.down === 1 && m.playNo > 0 && m.stats[m.poss].firstDowns) { /* the refs point first down */ }
    if (to === 'PRESNAP') { const qb = m.bySlot && m.bySlot[m.poss] && m.bySlot[m.poss].QB; if (qb && !FF.fast && m.play && m.play.off.type !== 'kickoff') FF.voice.say(FF.data.lines.cadence[m.teams[m.poss].id] || 'BLUE 42! SET... HUT!', 'qb'); }
    if (to === 'QBREAK') FF.fx.say('END OF THE ' + FF.u.ord(m.quarter - 1 || 1), { scale: 2, dur: 1.5 });
  }
  present(dt, rdt) {
    const m = this.m, rf = this.replayFrame, t = this.t;
    const big = !!(game.settings.bigHeads || m.cheats.bigHeads);
    if (big !== this.bigHeads) { this.bigHeads = big; for (const k in this.rigs) FF.Rigs.bigHeads(this.rigs[k], big); }
    // the rigs from the sim (or the replay's frames)
    const list = rf ? rf.list : m.on.concat(m.extra);
    for (const a of list) { const rig = rf ? this.rigs[a.id] || this.rigFor(m.all.find(x => x.id === a.id) || m.extra.find(x => x.id === a.id) || a) : this.rigFor(a); if (!rig) continue; a.poseT = a.poseT === undefined ? 0 : a.poseT; const b = rf ? rf.ball : m.ball; a.ballAngle = b.vx ? Math.atan2(b.vy, b.vx) : 0; FF.Rigs.drive(rig, a, rf ? rdt * FF.T.replayRate : dt); }
    if (!rf) for (const a of m.all) if (!a.onField) FF.Rigs.drive(this.rigs[a.id], { x: a.x, y: a.y, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: m.phase === 'CELEBRATE' && m.lastScoreSide === a.side ? 'cheer' : 'idle', poseT: t }, dt);
    this.side.update(dt, m); this.crowd.update(rdt, m);
    FF.fx.update(m, dt, rdt); FF.talk.update(rdt);
    FF.crowdAudio.update(this.crowd.E, rdt);
    if (!rf) FF.cam.update(m, rdt); else this.replayCam(rf, rdt);
    // music layers: a Blazing athlete, the red zone; the hurry-up in the last minute
    FF.audioFx.layer('hot', m.on.some(a => a.hot > 0));
    FF.audioFx.layer('redzone', m.phase !== 'COIN' && Math.abs(m.los - m.goalX(m.poss)) <= 20 * YD);
    const hurry = (m.quarter === 2 || m.quarter >= 4) && m.clock < 60 && m.clock > 0;
    if (hurry !== this.hurry) { this.hurry = hurry; try { game.audio.tempo(FF.SONGS[FF.audioFx.song] ? FF.SONGS[FF.audioFx.song].bpm * (hurry ? 1.08 : 1) : 120); } catch (e) { /* no song */ } }
    if ((m.quarter === 2 || m.quarter >= 4) && m.clock <= 120 && !m.twoMinSaid && m.qLen >= 120 && m.clock > 0) { m.twoMinSaid = true; bus.emit('twoMinute', { m }); }
    if (this.stadium.lightsOut !== !!FF.lightsOut) this.stadium.setLightsOut(!!FF.lightsOut);
    // lightning and thunder in the Hog Wallow
    if (this.stadium.weather && this.stadium.weather.lightning && FF.rf() < rdt * .02) { game.flash('#e0e8ff', .08, .5); game.after(.6, () => FF.audioFx.sfx('thunder')); }
  }
  replayCam(rf, rdt) {
    const p = FF.replay.playing; if (!p) return;
    const want = p.shot === 0 ? p.view : p.alt; if (FF.cam.view !== want) FF.cam.setView(want);
    const b = rf.ball, c = FF.cam;
    for (const a of ['x', 'y']) { const r = E.smoothDamp(c.pos[a], b[a], c.vel[a], .25, rdt); c.pos[a] = r[0]; c.vel[a] = r[1]; }
    c.applyZoom(p.shot === 0 ? 1.2 : 1.4); game.focus(c.pos.x, c.pos.y, 0);
  }
  draw(r) {
    const m = this.m, rf = this.replayFrame, view = E.charView(r.view);
    FF.proj = (x, y, z) => r.w(x, y, z);
    this.stadium.draw(r, this.t);
    FF.fx.drawWorld(r, m);
    if (!rf) FF.hud.world(r, m, this);
    this.crowd.draw(r);
    this.side.draw(r, view);
    const list = rf ? rf.list : m.on.concat(m.extra);
    for (const a of list) {
      const rig = this.rigs[a.id]; if (!rig) continue;
      r.shadow(a.x, a.y, a.rad || 6, a.z > 10 ? .2 : .38);
      const o = { pick: a.id };
      if (a.action && a.action.id === 'afterburner') o.ghost = { color: '#3af0f0', life: .25, alpha: .5, owner: a };
      if ((a.hot || a.hot > 0) && FF.lightsOut) o.emissive = false;
      r.actor(a.x, a.y, a.z, (g, ox, oy) => rig.draw(g, ox, oy, view), o);
      if (a.hot > 0 || a.hot === true) r.queue(a.x, a.y, 24, g => { const [x, y] = r.w(a.x, a.y, 4); px.blend(g, .4, 'add', () => px.ddisc ? px.ddisc(g, x, y, 9, '#ff7a2a', .5, r.ix, r.iy) : null); }, { emissive: true });
    }
    if (!rf) for (const a of m.all) if (!a.onField) r.actor(a.x, a.y, 0, (g, ox, oy) => this.rigs[a.id].draw(g, ox, oy, view), { every: 2, key: a, outline: false });
    if (FF.dev && FF.dev.on && !rf) FF.dev.drawWorld(r, this);
    // the ball
    const b = rf ? rf.ball : m.ball;
    if (!(b.state === 'held' && !rf) || (rf && b.state !== 'held')) {
      if (b.state !== 'held') {
        r.shadow(b.x, b.y, Math.max(1.5, 3.5 - b.z * .02), Math.max(.12, .45 - b.z * .002));
        const g0 = m.ball;
        r.queue(b.x, b.y, b.z + 2, g => {
          const [x, y] = r.w(b.x, b.y, b.z + 2), vx = rf ? 1 : g0.vx || 0, vy = rf ? 0 : g0.vy || 0, vz = rf ? 0 : g0.vz || 0, [x2, y2] = r.w(b.x + vx * .03, b.y + vy * .03, b.z + 2 + vz * .03);
          const kick = b.state === 'kick' || (g0.kind && b.state === 'kickLoose'), ang = kick ? (b.spin || 0) * .35 : Math.atan2(y2 - y, x2 - x);
          if (g0.hotPass && b.state === 'pass') { px.blend(g, .6, 'add', () => { px.disc(g, x - (x2 - x) * 3, y - (y2 - y) * 3, 3, '#ff7a2a'); px.disc(g, x - (x2 - x) * 6, y - (y2 - y) * 6, 2, '#ffd84a'); }); }
          if (g0.golden && b.state === 'pass') px.blend(g, .7, 'add', () => { px.dot(g, x - (x2 - x) * 4, y - (y2 - y) * 4 + 1, '#ffe890'); px.dot(g, x - (x2 - x) * 7 + 1, y - (y2 - y) * 7, '#ffd84a'); });
          if (g0.type === 'bullet' && b.state === 'pass') px.line(g, x - (x2 - x) * 8, y - (y2 - y) * 8, x - (x2 - x) * 2, y - (y2 - y) * 2, '#ffffff');
          FF.drawBall(g, x, y, game.zoom || 1, ang, false, Math.floor((b.spin || 0) * 2) % 2 ? 1 : -1);
        }, { bias: 3 });
      }
    }
  }
}
FF.MatchView = MatchView;

/* ======== the 'match' scene: exhibitions, story games, hub rounds ======== */
const S = { mv: null, pcs: [], results: null, ht: null, data: null };
FF.restart = () => { if (game.sceneName === 'match' && S.data) game.go('match', S.data); else if (game.sceneName === 'drill' && FF.drillRestart) FF.drillRestart(); };
FF.scenes = FF.scenes || {};
FF.scenes.match = {
  pausable: !FF.inHub, view: FF.views.broadcast.id, views: [FF.views.broadcast.id, FF.views.sky.id, FF.views.blimp.id], input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(data) {
    S.data = data || S.data || { spec: { home: 'fiascos', away: 'mudhogs', humans: { 0: [0], 1: [] } } };
    S.mv = new MatchView(S.data.spec); S.pcs = []; S.results = null; S.ht = null; S.pcPhase = -1; S.endT = 0; S.records = false;
    FF.dev && FF.dev.onMatch && FF.dev.onMatch(S.mv);
    if (S.data.onStart) S.data.onStart(S.mv.m);
  },
  exit() { if (S.mv) S.mv.dispose(); S.mv = null; FF.matchScene = null; },
  update(dt) {
    const mv = S.mv; if (!mv) return;
    const m = mv.m, rdt = game.timeScale > 0 ? dt / game.timeScale : 1 / 120;
    if (FF.net && FF.net.active && S.data.hub) {
      const N = FF.net; N.update(dt, rdt);
      if (N.ended || window.AIHub.time() < 0) { mv.update(dt, rdt, { frozen: true, noControl: true }); return; }
      if (N.isClient()) {
        if (m.phase === 'PLAYCALL') { const mine = [0, 1].filter(s2 => (m.humans[s2] || [])[0] === 0); if (S.pcPhase !== m.playNo + ':' + m.callKind) { S.pcPhase = m.playNo + ':' + m.callKind; S.pcs = mine.map(s2 => new FF.PlayCall(m, s2, [0])); } S.pcs.forEach(pc => pc.update(dt, { W: game.W, H: game.H }, 0, game.W)); } else S.pcs = [];
        const h = m.ball.holder; if (m.play) m.play.passed = !(h && h.slot === 'QB' && h.side === m.poss && (h.x - m.los) * m.dir(m.poss) < 0 && m.ball.state === 'held');
        mv.update(dt, rdt, { frozen: true, noControl: true });
        if (m.over && !S.results) { S.endT += rdt; if (S.endT > 1) S.results = new Results(mv, S.data); }
        return;
      }
    }
    // the camera view: V cycles Broadcast, Sky Cam, Blimp
    if (game.input.pressed('view') && !FF.replay.playing) { const L = ['broadcast', 'sky', 'blimp'], i = L.indexOf(game.settings.camera); game.settings.set('camera', L[(i + 1) % 3]); game.note(FF.views[game.settings.camera].label.toUpperCase()); }
    if (S.results) { S.results.update(dt); mv.update(dt, rdt, { frozen: false, noControl: true }); return; }
    // a replay before the next call: ✕ (or a click) skips it
    const skip = FF.replay.playing && game.players.some(p => p.pressed('b1') || p.pressed('confirm')) || (FF.replay.playing && game.input.clicked());
    if (!FF.replay.playing && m.phase === 'PLAYCALL' && S.lastReplayCheck !== m.playNo) {
      S.lastReplayCheck = m.playNo; const R = FF.replay.last;
      if (R && !R.shown && FF.replay.should(m)) { R.shown = true; FF.replay.play(R, { caption: FF.replay.caption(R, m) }); FF.audioFx.layer('hot', false); game.audio.duck(true); }
    }
    if (!FF.replay.playing && game.audio.ducked && !S.ht) game.audio.duck(false);
    // halftime: the show (exhibition), the locker room (story), a card (hub)
    if (m.phase === 'HALFTIME' && !S.ht) { m.holdHalftime = true; S.ht = { t: 0 }; if (S.data.onHalftime) S.data.onHalftime(m, () => { S.ht.done = true; }); }
    if (S.ht && mv.halftimeDialog && mv.halftimeDialog.open) mv.halftimeDialog.update(rdt);
    if (S.ht) { S.ht.t += rdt; const len = m.mode === 'hub' ? 3 : 7; if (S.ht.done || (!S.data.onHalftime && (S.ht.t > len || (S.ht.t > 1 && game.players.some(p => p.pressed('b1') || p.pressed('confirm')))))) { m.holdHalftime = false; m.phaseT = 0; S.ht = null; FF.audioFx.music(mv.stadium.def.music); } else { if (S.ht.t < .1) FF.audioFx.music('HALFTIME'); mv.update(dt, rdt, { frozen: true }); return; } }
    // the play call: a panel for each human side
    if (m.phase === 'PLAYCALL' && !FF.replay.playing && (!FF.net || !FF.net.active || FF.net.isHost())) {
      if (S.pcPhase !== m.playNo + ':' + m.callKind + ':' + m.pcStamp) { S.pcPhase = m.playNo + ':' + m.callKind + ':' + m.pcStamp; S.pcs = [0, 1].filter(s => m.isHuman(s) && (m.humans[s] || []).some(p => typeof p === 'number')).map(s => new FF.PlayCall(m, s, m.humans[s].filter(p => typeof p === 'number'))); if (S.pcs.length) FF.audioFx.music('HUDDLE'); }
      const w = S.pcs.length > 1 ? Math.floor(game.W / 2) : game.W;
      S.pcs.forEach((pc, i) => { if (FF.autopilot && !pc.done) pc.pick(pc.suggest); else pc.update(dt, { W: game.W, H: game.H }, i * w, w); });
    } else if (S.pcs.length && m.phase !== 'PLAYCALL') { S.pcs = []; if (!FF.replay.playing) FF.audioFx.music(mv.stadium.def.music); }
    if (m.labLoop && m.phase === 'PLAYCALL' && (m.poss !== 0 || Math.abs(m.los - F.MID_X) > 1)) { m.poss = 0; m.los = F.MID_X; m.down = 1; m.toGo = 20; m.lineToGain = m.los + m.dir(0) * 20 * YD; m.callKind = 'scrimmage'; m.patPending = false; m.score = [0, 0]; }
    if (FF.dev && FF.dev.frameStep) { const st = FF.dev.stepOnce || (game.input.pressed('b1') ? 1 / 120 : game.input.pressed('b4') ? .1 : 0); FF.dev.stepOnce = 0; if (st > 0) { for (let t = 0; t < st - 1e-6; t += 1 / 120) mv.update(1 / 120, 1 / 120, { skip: false }); } else mv.update(dt, rdt, { frozen: true }); return; }
    mv.update(dt, rdt, { skip });
    if (m.over && !S.results) { S.endT += rdt; if (S.endT > 2.5) S.results = new Results(mv, S.data); }
  },
  draw(r) {
    const mv = S.mv; if (!mv) return;
    mv.draw(r);
    const m = mv.m;
    if (FF.net && FF.net.server) { r.overlay(g => px.rect(g, 0, 0, r.W, r.H, '#0a0a14')); return; }
    r.overlay(g => {
      if (FF.net && FF.net.active && S.data.hub) {
        const t = window.AIHub.time(); if (t < 0 && t > -Infinity) E.font.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H * .35, { scale: 6, colors: ['#ffffff', '#ffd84a', '#ff9a2a'], align: 'center', outline: '#000', depth: 3 });
        if (FF.net.ended) { const msg = { finished: 'ROUND OVER', void: 'ROUND CANCELLED', 'host-left': 'ROUND CANCELLED', 'sat-out': 'YOU SAT THIS ONE OUT', 'session-ended': 'SESSION OVER' }[FF.net.endReason] || 'ROUND OVER'; ui.panel(g, r.W / 2 - 120, r.H * .15, 240, 30, { alpha: .9 }); ui.T(g, msg, r.W / 2, r.H * .15 + 8, '#ffd84a', { align: 'center', scale: 2 }); }
      }
      if (FF.replay.playing) { FF.hud.replayOverlay(g, r, FF.replay.playing); return; }
      if (S.ht) { if (mv.halftimeDialog) { drawLocker(g, r, m); } else drawHalftime(g, r, m, S.ht); return; }
      FF.hud.overlay(g, r, m, mv);
      if (m.phase === 'COIN') drawCoin(g, r, m);
      if (m.phase === 'PLAYCALL' && S.pcs.length) { const w = S.pcs.length > 1 ? Math.floor(r.W / 2) : r.W; S.pcs.forEach((pc, i) => pc.draw(g, r, i * w, w, S.pcs.length > 1 && !pc.done && false)); if (!S.pcs.length && !m.isHuman(0) && !m.isHuman(1)) ui.T(g, 'CPU VS CPU', r.W / 2, 40, '#ffd84a', { align: 'center', scale: 2 }); }
      if (FF.cam.view.startsWith('kick') && m.phase !== 'PLAYCALL') ui.T(g, 'KICK CAM', r.W - 60, 30, '#ffd84a', { scale: 1 });
      if (S.results) S.results.draw(g, r);
      FF.dev && FF.dev.drawOverlay && FF.dev.drawOverlay(g, r, mv);
    });
  },
  back() { return false; }
};
function drawCoin(g, r, m) {
  const t = 1.5 - m.phaseT, x = r.W / 2, y = r.H * .35 - Math.sin(Math.min(1, t / 1.2) * Math.PI) * 40, w = Math.abs(Math.cos(t * 14)) * 12 + 1;
  px.disc(g, x, y + 50, 10, '#00000060');
  E.ui.box(g, Math.round(x - w), Math.round(y - 12), Math.round(w * 2), 24, { bg: ['#ffe890', '#c89a1a'], border: '#8a5a10', alpha: 1 });
  ui.T(g, 'COIN TOSS', x, r.H * .18, '#ffffff', { align: 'center', scale: 2 });
  if (t > 1.1 && m.toss) ui.T(g, m.teams[m.toss.winner].short + ' WIN THE TOSS', x, r.H * .55, '#ffd84a', { align: 'center', scale: 2 });
}
function drawLocker(g, r, m) {
  px.rect(g, 0, 0, r.W, r.H, '#3a3a44'); px.rect(g, 0, Math.round(r.H * .62), r.W, r.H, '#5a5a64');
  for (let x = 6; x < r.W; x += 30) { px.rect(g, x, 30, 26, Math.round(r.H * .55), '#5a6a7a'); px.rect(g, x + 2, 32, 22, Math.round(r.H * .55) - 4, m.teams[1].colors.primary); for (let k = 0; k < 3; k++) px.rect(g, x + 6, 40 + k * 3, 14, 1, '#2a2a34'); }
  px.rect(g, 0, Math.round(r.H * .55), r.W, 6, '#8a6a4a');
  E.font.title(g, 'THE LOCKER ROOM · HALFTIME', r.W / 2, 8, { scale: 2, colors: ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' });
  ui.T(g, m.teams[1].short + ' ' + m.score[1] + '  -  ' + m.score[0] + ' ' + m.teams[0].short, r.W / 2, 26, '#f4e8c8', { align: 'center' });
  const d = S.mv.halftimeDialog; if (d) d.draw({ W: r.W, H: r.H, overlay: f => f(g) }); 
}
function drawHalftime(g, r, m, ht) {
  ui.panel(g, 20, 14, r.W - 40, r.H - 28, { alpha: .9 });
  E.font.title(g, 'HALFTIME', r.W / 2, 22, { scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], align: 'center', outline: '#140a10', depth: 2 });
  const tiles = [['TOTAL YARDS', m.stats[0].yards, m.stats[1].yards], ['TURNOVERS', m.stats[0].turnovers, m.stats[1].turnovers], ['SACKS', m.stats[0].sacks, m.stats[1].sacks], ['BIGGEST HIT', m.stats[0].bigHit + ' YD', m.stats[1].bigHit + ' YD']];
  const tw = Math.floor((r.W - 70) / 2), th = 34;
  tiles.forEach(([lab, a, b], k) => { const x = 30 + (k % 2) * (tw + 10), y = 56 + Math.floor(k / 2) * (th + 8); ui.panel(g, x, y, tw, th, { alpha: .95, border: '#5a5878' }); ui.T(g, lab, x + tw / 2, y + 3, '#a9a6c0', { align: 'center' }); ui.T(g, m.teams[0].abbr + ' ' + a, x + 8, y + 16, '#f4f0e6', { scale: 1 }); ui.T(g, b + ' ' + m.teams[1].abbr, x + tw - 8, y + 16, '#f4f0e6', { align: 'right' }); });
  ui.T(g, m.teams[0].short + ' ' + m.score[0] + '  -  ' + m.score[1] + ' ' + m.teams[1].short, r.W / 2, 140, '#ffd84a', { align: 'center', scale: 2 });
  ui.T(g, 'THE HALFTIME SHOW: CHEERS, THE BAND, THE MASCOT', r.W / 2, 162, '#c8c4e0', { align: 'center' });
  if (ht.t > 1) ui.prompts(g, [['b1', 'SKIP']], r.W / 2, r.H - 26, { align: 'center' });
}

/* ---- results: FINAL, the scores huge, the player of the game, 4 tiles, the buttons ---- */
class Results {
  constructor(mv, data) {
    this.mv = mv; this.m = mv.m; this.data = data; this.focus = new ui.Focus({ wrap: true }); this.t = 0;
    const m = this.m; this.potg = [...m.roster[0], ...m.roster[1]].sort((a, b) => score(b) - score(a))[0];
    function score(a) { const s = a.stats; return s.tds * 6 + s.yds * .1 + s.recYds * .1 + s.passYds * .05 + s.tackles + s.sacks * 3 + s.ints * 5 + s.bigHits * 2 + (a.side === m.winner ? 3 : 0); }
    this.buttons = data.resultsButtons ? data.resultsButtons(m) : m.mode === 'hub' ? [] : [['WATCH HIGHLIGHTS', () => this.reel()], ['REMATCH', () => game.go('match', data)], ['CHANGE TEAMS', () => game.go('setup', { keep: true })], ['MAIN MENU', () => game.go('menu')]];
    if (FF.replay.highlights.length === 0) this.buttons = this.buttons.filter(b => b[0] !== 'WATCH HIGHLIGHTS');
    if (!S.records && m.mode !== 'hub' && m.mode !== 'attract' && FF.records) { S.records = true; FF.records.afterGame(m); }
    if (m.winner >= 0 && m.isHuman(m.winner)) FF.audioFx.sting('victory'); else if (m.winner >= 0 && (m.isHuman(1 - m.winner))) FF.audioFx.sting('defeat'); else FF.audioFx.sting('victory');
  }
  reel() { const H = FF.replay.highlights.slice(); let k = 0; const next = () => { if (k >= H.length) return; const R = H[k++]; FF.replay.play(R, { reel: true, caption: FF.replay.caption(R, this.m), from: Math.max(0, R.t - 5), rate: .8, onDone: next }); }; next(); }
  layout(r) { const w = Math.min(r.W - 30, 420), x = Math.round(r.W / 2 - w / 2), h = r.H - 24, bw = Math.floor((w - 20 - (this.buttons.length - 1) * 6) / Math.max(1, this.buttons.length)), by = 12 + h - 30; return this.buttons.map((b, k) => ({ x: x + 10 + k * (bw + 6), y: by, w: bw, h: 20, fn: b[1], label: b[0], k })); }
  update(dt) { this.t += dt; if (FF.replay.playing) { if (game.players.some(p => p.pressed('b1') || p.pressed('cancel'))) { const p = FF.replay.playing; p.onDone = null; FF.replay.stop(); } return; } this.focus.set(this.layout({ W: game.W, H: game.H })); if (this.t < .6) return; const it = this.focus.update(); if (it) it.fn(); }
  draw(g, r) {
    if (FF.replay.playing) return;
    const m = this.m, w = Math.min(r.W - 30, 420), x = Math.round(r.W / 2 - w / 2), y = 12, h = r.H - 24;
    ui.panel(g, x, y, w, h, { alpha: .93 });
    E.font.title(g, 'FINAL', r.W / 2, y + 6, { scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], align: 'center', outline: '#140a10', depth: 2 });
    for (const s of [0, 1]) { const t = m.teams[s], cx = r.W / 2 + (s ? 90 : -90); ui.logo(g, t, cx - 18, y + 36, 3); ui.T(g, t.short, cx, y + 76, '#e8e4f0', { align: 'center' }); E.font.title(g, String(m.score[s]), cx, y + 86, { scale: 4, colors: ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' }); }
    const win = m.winner >= 0 ? m.teams[m.winner].short + ' WIN!' : 'A TIE. A FIASCO!'; ui.T(g, win, r.W / 2, y + 52, '#ffd84a', { align: 'center', scale: 2 });
    // the player of the game
    const p = this.potg; if (p) { const rig = this.mv.rigs[p.id]; ui.panel(g, x + 10, y + 122, 150, 38, { alpha: .95, border: '#5a5878' }); if (rig) rig.drawPortrait(g, x + 13, y + 125, 32, { zoom: 3, bg: '#1c2040' }); ui.T(g, 'PLAYER OF THE GAME', x + 50, y + 125, '#ffd84a', { font: 'tiny' }); ui.T(g, p.short + ' #' + p.num, x + 50, y + 134, '#f4f0e6'); const s = p.stats, k = [s.tds && s.tds + ' TD', s.yds + s.recYds > 0 && (s.yds + s.recYds) + ' YDS', s.tackles && s.tackles + ' TKL', s.sacks && s.sacks + ' SACK', s.ints && s.ints + ' INT'].filter(Boolean).slice(0, 2).join('  '); ui.T(g, k || 'ALL HEART', x + 50, y + 145, '#c8c4e0', { font: 'tiny' }); }
    const tiles = [['YARDS', m.stats[0].yards + ' - ' + m.stats[1].yards], ['TURNOVERS', m.stats[0].turnovers + ' - ' + m.stats[1].turnovers], ['BIGGEST HIT', Math.max(m.stats[0].bigHit, m.stats[1].bigHit) + ' YD'], ['LONGEST', Math.max(m.stats[0].longest, m.stats[1].longest) + ' YD']];
    tiles.forEach(([lab, v], k) => { const tx = x + 168 + (k % 2) * ((w - 178) / 2), ty = y + 122 + Math.floor(k / 2) * 20; ui.T(g, lab, tx, ty, '#a9a6c0', { font: 'tiny' }); ui.T(g, v, tx, ty + 7, '#f4f0e6'); });
    for (const it of this.layout(r)) ui.button(g, it.x, it.y, it.w, it.h, it.label, { focus: this.focus.i === it.k, scale: 1 });
  }
}
FF.Results = Results;
})();
