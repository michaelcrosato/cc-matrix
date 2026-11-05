/* 33-match: the match scene. It builds a Match from options (teams, stadium, conditions, humans and their sides, cup
 * buffs, draws rule), runs it with its view, HUD, commentary, crowd engine and replay recorder, turns the match's events
 * into sound, crowd, notices, camera moments and rumble, and hands the result on. */
const LIVE = { m: null, view: null, hud: null, com: null, rec: null, opts: null, slow: 0 };
EF.LIVE = LIVE;
/** what the presentation does with each match event */
function present(type, ev) {
  const m = LIVE.m; if (!m || ev.match !== m) return;
  const H = LIVE.hud, V = LIVE.view, C = LIVE.com, CA = EF.crowdAudio, rec = LIVE.rec, quiet = !!LIVE.opts.quiet;
  const rumble = (k, s) => { for (const sl of m.slots) if (sl.ctl && sl.ctl.I && sl.ctl.I.rumble) sl.ctl.I.rumble(k, s); };
  const slowmo = (k, t) => { if (!m.session) { game.timeScale = k * EF.T.gameSpeed; LIVE.slow = t; } };
  V && V.react(type, ev);
  if (C && !quiet) EF.commentaryFor(C, type, ev);
  const who = ev.who != null ? m.players[ev.who] : null, team = ev.side != null ? m.teams[ev.side] : null;
  switch (type) {
    case 'pass': EF.sfx('pass', { vol: .7 }); rec && rec.cue('pass'); break;
    case 'touch': EF.sfx('touch'); break;
    case 'shot': EF.sfx(ev.power > .75 ? 'screamer' : 'kick'); rec && rec.cue('kick'); rumble(.3 + (ev.power || .5) * .5, .12); if (ev.onTarget) { CA.react('ooh', .4); } break;
    case 'screamer': H.notice('SCREAMER!', { t: 1, scale: 2, colors: ['#ffffff', '#ffe08a', '#ff7a2a'] }); break;
    case 'woodwork': EF.sfx('doink'); rec && rec.cue('doink'); CA.react('ooh'); game.shake(3); rumble(.6, .2); H.notice('DOINK!', { t: 1, scale: 3, colors: ['#ffffff', '#c8ccd8', '#8a90a8'] }); break;
    case 'bounce': if (ev.kind === 'net') { EF.sfx('net'); rec && rec.cue('net'); } else if (ev.kind === 'boards') EF.sfx('thump', { vol: .6 }); else if (ev.surf === 'puddle' || ev.surf === 'wet') EF.sfx('splash', { vol: .5 }); else if (ev.surf === 'snow') EF.sfx('crunch', { vol: .5 }); else EF.sfx('thump', { vol: .35 }); if (ev.surf === 'puddle') PFX.bits(ev.x, ev.y, 2, 6, ['#8ab0d0', '#c8e0f0']); break;
    case 'goal': case 'ownGoal':
      EF.sfx('net'); EF.sfx('whistleLong'); CA.react('roar', 1.2); game.flash('#ffffff', .15, .5); game.shake(4); rumble(.9, .5);
      H.notice(type === 'ownGoal' ? 'OWN GOAL!' : 'GOAL!', { t: 2.6, scale: 5, sub: (ev.name || '') + ' ' + (ev.minute || '') });
      try { A.sting(EF.SONGS.goal, { at: 'now' }); } catch (e) { /* no sound */ }
      PFX.sparks(m.ball.x, m.ball.y, 16, 20, null, { color: '#ffe08a' }); PFX.ring(m.ball.x, m.ball.y, 4, 40, '#fff6c0', .5);
      if (team) game.after(0.8, () => EF.chant.sing(team.chant, { reps: 2 }));
      if (C && who && m.goals.length) game.after(3.2, () => C.announce('GOAL FOR ' + team.name + ', SCORED BY NUMBER ' + (who.data.num) + ', ' + who.data.name + '!'));
      break;
    case 'catch': EF.sfx('catch'); break;
    case 'save': EF.sfx(ev.kind === 'catch' ? 'catch' : 'parry'); CA.react('ooh', .8); rumble(.5, .15); if (ev.kind === 'tip') H.notice('TIPPED OVER!', { t: 1, scale: 2 }); else if (ev.kind === 'parry' || ev.kind === 'catch') H.notice('SAVE!', { t: 1, scale: 3, colors: ['#ffffff', '#5ae0ff', '#3a8aff'] }); break;
    case 'whistle': EF.sfx(ev.kind === 'full' ? 'whistleLong' : 'whistle'); if (ev.kind === 'full') { game.after(0.3, () => EF.sfx('whistle')); game.after(0.6, () => EF.sfx('whistleLong')); } if (ev.kind === 'half') game.after(0.3, () => EF.sfx('whistle')); break;
    case 'kickoff': if (ev.fresh) H.notice(m.half === 3 ? 'GOLDEN GOAL!' : ev.half === 2 ? 'SECOND HALF' : 'KICK OFF', { t: 1.6, scale: 3, sub: m.half === 3 ? 'NEXT GOAL WINS IT' : null }); if (ev.fresh && m.teams[ev.side]) game.after(0.6, () => EF.chant.sing(m.teams[ev.side].chant)); break;
    case 'half': H.notice('HALF TIME', { t: 3 }); EF.music('halftime'); game.after(4.2, () => EF.music(null)); break;
    case 'fulltime': H.notice('FULL TIME', { t: 3 }); break;
    case 'extraTime': H.notice('EXTRA TIME', { t: 2.4, sub: 'GOLDEN GOAL: THE NEXT ONE WINS IT' }); break;
    case 'tackleWon': EF.sfx('thump'); rumble(.3, .1); break;
    case 'slide': EF.sfx('slide'); if (m.surface === 'wet') PFX.bits(who.body.x, who.body.y, 2, 6, ['#8ab0d0', '#c8e0f0']); else PFX.dust(who.body.x, who.body.y, 1, 4); break;
    case 'launch': EF.sfx('knock'); game.hitFx(ev.x, ev.y, 12, { power: .8, sound: 'hit', damage: null }); CA.react('ooh', .6); break;
    case 'knockdown': EF.sfx('knock'); PFX.dust(ev.x, ev.y, 1, 6); break;
    case 'foul': CA.react('whistle'); break;
    case 'advantage': H.notice('ADVANTAGE!', { t: 1.2, scale: 2 }); break;
    case 'card': EF.sfx('card'); CA.react('boo', .7); H.notice(ev.kind === 'red' ? (ev.second ? 'SECOND YELLOW... RED!' : 'RED CARD!') : 'YELLOW CARD', { t: 2, scale: 3, colors: ev.kind === 'red' ? ['#ffffff', '#ff5a5a', '#c8202a'] : ['#ffffff', '#ffe060', '#e0a020'], sub: who ? who.data.name : '' }); break;
    case 'diveBooked': H.notice('SIMULATION!', { t: 1.8, scale: 3, colors: ['#ffffff', '#ff9ae0', '#c83a90'] }); CA.react('boo'); break;
    case 'diveWon': H.notice(ev.inBox ? 'HE BOUGHT A PENALTY!' : 'FREE KICK!', { t: 1.4, scale: 2 }); break;
    case 'var': H.notice('VAR CHECK', { t: 2.5, scale: 3, colors: ['#ffffff', '#5ae0ff', '#3a6aff'] }); CA.react('hum'); for (let i = 0; i < 3; i++) game.after(.3 + i * .5, () => EF.sfx('varBeep')); break;
    case 'varDecision': H.notice(ev.kind === 'goal' ? 'GOAL STANDS' : ev.overturned ? 'NO PENALTY' : 'PENALTY STANDS', { t: 2, scale: 3 }); CA.react(ev.overturned ? 'boo' : 'roar', .6); break;
    case 'penaltyAwarded': H.notice('PENALTY!', { t: 1.6, scale: 4 }); CA.react('roar', .5); break;
    case 'crowdThrow': H.notice('INTO THE CROWD!', { t: 1.4, scale: 2 }); break;
    case 'setpiece': if (ev.kind === 'corner') H.notice('CORNER', { t: 1, scale: 2 }); if (ev.kind === 'goalkick') H.notice('GOAL KICK', { t: 1, scale: 2 }); if (ev.kind === 'freekick') H.notice('FREE KICK', { t: 1, scale: 2 }); break;
    case 'skill': EF.sfx('swish'); break;
    case 'nutmeg': EF.sfx('nutmeg'); H.notice('NUTMEG!', { t: 1, scale: 2, colors: ['#ffffff', '#ffe08a', '#ff9a3a'] }); CA.react('ooh', .5); break;
    case 'rainbow': H.notice('RAINBOW FLICK!', { t: 1, scale: 2 }); break;
    case 'euphoriaGain': EF.sfx('segment'); break;
    case 'euphoriaFull': H.notice(m.teams[ev.side].short + ': EUROPHORIA READY', { t: 1.6, scale: 2, colors: ['#ffffff', '#ffc83a', '#ff7a2a'] }); EF.chant.sing(m.teams[ev.side].chant, { reps: 2 }); break;
    case 'europhoria':
      EF.sfx('europhoria'); game.flash(EF.kitFor(m, ev.side).shirt, .25, .6); CA.react('roar', 1); rumble(.8, .4);
      H.notice('EUROPHORIA!', { t: 2.2, scale: 5, colors: ['#ffffff', '#ff7ad0', '#ffc83a', '#ff5a2a'], sub: m.teams[ev.side].name + ': ONE SUPER STRIKE UNLOCKED' });
      if (!m.session) { EF.music('europhoria', { fade: .2 }); for (const t of ['drums', 'bass', 'brass']) try { A.layer(t, 1, .4); } catch (e) { /* */ } }
      break;
    case 'europhoriaEnd': if (!m.session) EF.music(null); break;
    case 'superStrike': EF.sfx('superCharge'); H.notice(ev.name, { t: 2, scale: 4, colors: ['#ffffff', '#ffe08a', '#ff3aa0', '#7a3aff'] }); game.flash('#ffffff', .2, .4); PFX.ring(who.body.x, who.body.y, 4, 60, '#ffe08a', .6); break;
    case 'superRelease': EF.sfx('superBoom'); game.shake(5); rumble(1, .4); break;
    case 'hammer': EF.sfx('superBoom', { vol: .5 }); game.shake(4); PFX.dust(ev.x, ev.y, 1, 12); break;
    case 'slowmo': slowmo(ev.k, ev.t / Math.max(.1, ev.k)); break;
    case 'saveDuel': H.notes = []; try { A.music(EF.SONGS.tension); } catch (e) { /* */ } break;
    case 'saveDuelResult': EF.sfx(ev.result === 'miss' ? 'miss' : 'perfect'); H.notice(ev.result.toUpperCase() + (ev.result === 'miss' ? '' : '!'), { t: 1.6, scale: 4, colors: ev.result === 'miss' ? ['#ffffff', '#ff5a5a', '#a02020'] : ['#ffffff', '#5aff7a', '#20a040'] }); rumble(.9, .3); EF.music(null); break;
    case 'bus': H.notice('THEY\'VE PARKED THE BUS!', { t: 2.4, scale: 3 }); EF.sfx('horn'); break;
    case 'busSmash': H.notice('BUS SMASHED!', { t: 2, scale: 3 }); EF.sfx('smash'); game.shake(6); break;
    case 'busGone': EF.sfx('horn'); break;
    case 'refHit': CA.react('ooh'); EF.sfx('knock'); break;
    case 'event': if (ev.id === 'floodlight') { EF.sfx('powerDown'); } if (ev.id === 'seagull') EF.sfx('gull'); if (ev.id === 'beachball') EF.sfx('boing'); if (ev.id.startsWith('invader')) CA.react('roar', .4); H.notice(ev.name, { t: 1.6, scale: 2, colors: ['#ffffff', '#5ae0ff', '#3a8aff'] }); if (C && ev.id === 'floodlight') game.after(1.5, () => C.announce('APOLOGIES. THE FISH-OIL GENERATOR HAS HAD A MOMENT.')); break;
    case 'gullAway': EF.sfx('gull'); break;
    case 'beachHit': EF.sfx('boing', { vol: .5 }); break;
    case 'beachPop': EF.sfx('card'); PFX.bits(ev.x, ev.y, 10, 10, ['#ff4a4a', '#3a8aff', '#ffd03a']); break;
    case 'invaderTackled': H.notice('INVADER STOPPED!', { t: 1.6, scale: 2 }); CA.react('roar', .7); break;
    case 'shootoutStart': H.notice('PENALTY SHOOTOUT', { t: 2.4, scale: 3 }); try { A.music(EF.SONGS.tension); } catch (e) { /* */ } break;
    case 'shootoutKick': if (ev.goal) { CA.react('roar', .8); EF.sfx('net'); } else { CA.react('groan'); EF.sfx('miss'); } H.notice(ev.goal ? 'SCORED!' : 'MISSED!', { t: 1, scale: 3 }); break;
    case 'shootoutEnd': EF.music(null); H.notice(m.teams[ev.winner].name + ' WIN THE SHOOTOUT', { t: 3, scale: 2 }); break;
    case 'penaltyTaken': if (ev.panenka) H.notice('PANENKA!', { t: 1.2, scale: 3 }); break;
    case 'goldenMoment': H.notice('GOLDEN MOMENT!', { t: 2.4, scale: 3, colors: ['#ffffff', '#ffe060', '#c89020'], sub: "MAXIMILIEN D'OR'S EUROPHORIA" }); break;
    case 'board': H.notice('+' + ev.add + ' MINUTES', { t: 1.6, scale: 2, colors: ['#ffffff', '#ff5a5a', '#c8202a'] }); break;
    case 'celebrate': if (who) EF.babble.shout(who.data.id, EF.fxPick(['WAHEY!', 'YEESH!', 'GET IN!', 'OLE!', 'YES YES YES!'])); break;
    case 'oneTwo': H.notice('ONE-TWO!', { t: .8, scale: 2 }); break;
  }
}
EF.present = present;
EF.bus.on('*', ev => { if (LIVE.m && ev.match === LIVE.m) present(ev.type, ev); });

/** human slots from the players who joined: [{ input, side }] */
EF.slotsFor = humans => (humans || []).map((h, i) => ({ side: h.side, ctl: h.ctl || new HumanController(h.input), color: h.input && h.input.player ? h.input.player - 1 : i, label: h.label || (h.input && h.input.name) || ('P' + (i + 1)), switching: h.switching }));
EF.buildMatch = o => {
  const humans = o.humans != null ? o.humans : [{ input: game.input, side: 0 }];
  const m = new Match(Object.assign({}, o, { slots: EF.slotsFor(humans), seed: o.seed != null ? o.seed : (LINK.seed != null ? LINK.seed : (Math.floor(Math.random() * 1e9) >>> 0)), halfLength: o.halfLength || EF.settingHalf() }));
  return m;
};
EF.attach = (m, o = {}) => {
  LIVE.m = m; LIVE.opts = o; LIVE.view = new MatchView(m, { ball: o.ball, noCamera: o.noCamera });
  LIVE.hud = new HUD(); LIVE.com = new Commentary(m, { silent: o.quiet }); LIVE.rec = new Recorder(m); LIVE.slow = 0;
  m.onReplay = c => {
    if (game.settings.replays === 'off' || m.session || o.noReplay || game.headless && !o.headlessReplay && !EF.headlessReplays) return false;
    const g = m.goals[m.goals.length - 1]; if (!g) return false;
    const frames = LIVE.rec.clip(g.t - 4.5, g.t + .8); if (frames.length < 20) return false;
    LIVE.view.replay = new ReplayPlayer(frames, { speed: .5 }); EF.sfx('swish');
    if (LIVE.com) LIVE.com.hear('replay', {});
    game.rotateView(45); EF.bus.emit('replayStart', { match: m });
    return true;
  };
  game.weather = m.st.weather ? Object.assign({}, m.st.weather) : null;
  EF.crowdAudio.start(clamp(((m.st.crowd && m.st.crowd.size) || 600) / 1600, .2, 1));
  return LIVE;
};
EF.replayEnd = () => { const m = LIVE.m, v = LIVE.view; if (!v || !v.replay) return; v.replay = null; game.rotateView(-45); game.resetCamera && game.resetCamera(); game.zoomBase = 0; EF.bus.emit('replayEnd', { match: m }); m.replayDone(); };
/** one step of whatever match is live (the match, training and attract scenes call it) */
EF.liveStep = (dt, o = {}) => {
  const m = LIVE.m; if (!m) return;
  const real = dt / Math.max(.05, game.timeScale);
  if (LIVE.slow > 0) { LIVE.slow -= real; if (LIVE.slow <= 0) game.timeScale = EF.T.gameSpeed; }
  else { const base = EF.T.gameSpeed * (EF.Dev.cheats.slow ? .25 : 1); if (Math.abs(game.timeScale - base) > 1e-6 && !m.session) game.timeScale = base; }
  const v = LIVE.view;
  if (v.replay) {
    v.replay.update(dt); v.update(dt); LIVE.hud.update(dt); LIVE.com.update(dt);
    const skip = game.players.some(I => I.pressed('confirm') || I.pressed('pass')) || EF.mouse.pressed[0];
    if (v.replay.done || skip) EF.replayEnd();
    return;
  }
  // celebration picks
  if (m.celebration && !m.celebration.picked) for (const sl of m.slots) if (sl.side === m.celebration.side && sl.ctl && sl.ctl.celebPick) { const k = sl.ctl.celebPick(); if (k >= 0) m.pickCelebration(k); }
  if (!o.frozen) { m.update(dt, real); LIVE.rec.step(dt); }
  v.update(dt); LIVE.hud.update(dt); LIVE.com.update(dt);
  const mood = Math.max(v.mood[0], v.mood[1]) * .8 + (m.mode === 'goal' ? .6 : 0) + (m.euroT[0] > 0 || m.euroT[1] > 0 ? .4 : 0);
  EF.crowdAudio.update(dt, mood);
};
EF.liveDraw = (r, o = {}) => {
  if (!LIVE.m) return;
  LIVE.view.draw(r);
  if (!o.noHud) LIVE.hud.draw(r, LIVE.m, LIVE.view, o);
  if (LIVE.view.replay) r.overlay(g => { for (let y = 0; y < r.H; y += 3) px.blend(g, .18, 'multiply', () => px.rect(g, 0, y, r.W, 1, '#000')); E.font.title(g, 'REPLAY', Math.round(r.W * .05), Math.round(r.H * .88), { scale: 2, colors: ['#ffffff', '#ff5a5a'], depth: 1 }); EF.prompt(g, Math.round(r.W * .05) + 100, Math.round(r.H * .88) + 2, 'confirm', 'SKIP'); });
  if (!o.noCommentary && !LIVE.m.duel) LIVE.com.draw(r);
};
EF.detach = () => { EF.crowdAudio.stop(); LIVE.m = null; LIVE.view = null; game.weather = null; game.timeScale = EF.T.gameSpeed; LIGHTS.enabled = false; game.zoomBase = 0; };
/** the summary a results screen shows */
EF.summary = m => {
  const tp = m.stats[0].poss + m.stats[1].poss || 1;
  const rating = f => 6 + f.goals * 1.5 + f.tackles * .3 + f.saves * .5 + f.shots * .1 - f.cards * .8 + (m.winner() === f.side ? .5 : 0);
  const potm = m.players.slice().sort((a, b) => rating(b) - rating(a))[0];
  return { home: m.teams[0].id, away: m.teams[1].id, score: m.score.slice(), pens: m.so ? m.so.score.slice() : null, winner: m.winner(), goals: m.goals.map(g => ({ side: g.side, name: g.name, minute: g.minute, kind: g.kind, super: g.super })),
    potm: potm ? { id: potm.data.id, name: potm.data.name, side: potm.side } : null, shots: [m.stats[0].shots, m.stats[1].shots], poss: [Math.round(m.stats[0].poss / tp * 100), Math.round(m.stats[1].poss / tp * 100)], tackles: [m.stats[0].tackles, m.stats[1].tackles], cards: m.cards.slice(), stadium: m.st.id };
};
EF.restartMatch = () => { const o = LIVE.opts && LIVE.opts.restart; if (o) { game.resume(); game.go('match', o); } };
const matchScene = {
  isMatch: true, pausable: !SESSION, touch: [], view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], camera: { zoom: [.8, 1.8], start: 1 },
  enter(o) {
    o = o || {};
    if (!o.home && LINK.scene === 'match') o = EF.deepMatch(LINK.part);
    game.setView(EF.CAMS[game.settings.camera] || 'broadcast');
    this.o = o; this.endT = 0; this.done = false;
    const m = o.match || EF.buildMatch(o);
    EF.attach(m, { ball: o.ball, restart: Object.assign({}, o, { match: null }) });
    if (o.after) o.after(m);
    EF.music(null);
    game.input.consumeAll();
  },
  exit() { EF.detach(); },
  update(dt) {
    const m = LIVE.m; if (!m) return;
    if (this.o.session) {
      const H = EF.Hub; if (H.ended) return;
      const menu = EF.Hub.overlayUpdate(dt);
      if (AIHub.time() < 0) { LIVE.view.update(dt); LIVE.hud.update(dt); return; }
      if (H.role === 'client') { H.clientStep(dt); LIVE.view.update(dt); LIVE.hud.update(dt); LIVE.com.update(dt); EF.crowdAudio.update(dt, Math.max(LIVE.view.mood[0], LIVE.view.mood[1])); return; }
      EF.liveStep(dt); H.hostStep(dt); void menu; return;
    }
    if (EF.Dev.cheats.watch) EF.Dev.syncSlots(true);
    EF.liveStep(dt);
    if (m.mode === 'over' && !this.done && !LIVE.view.replay) {
      this.endT += dt;
      if (this.endT > 2.5) {
        this.done = true; const sum = EF.summary(m), o = this.o;
        EF.bus.emit('matchOver', { summary: sum, match: m, opts: o });
        if (o.onEnd) o.onEnd(sum, m); else game.go('results', { summary: sum, next: () => game.go(o.back || 'title') });
      }
    }
  },
  draw(r) {
    if (this.o.session && EF.Hub.role === 'server') { r.sky(['#000000', '#000000', '#000000']); return; }
    EF.liveDraw(r);
    if (this.o.session) {
      const t = AIHub.time();
      if (t < 0 && t > -Infinity) r.overlay(g => EF.heading(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H * .35, 6));
      EF.Hub.overlayDraw(r);
    }
  }
};

EF.scenes.match = matchScene;
/** deep links into a match: #match, #match/<stadium>, #match/corner, freekick, penalty, shootout, super, duel */
EF.deepMatch = part => {
  const st = part && EF.get('stadium', part) ? part : null;
  const o = { home: 'kipperton', away: st ? (EF.all('team').find(t => t.stadium === st && t.id !== 'kipperton') || { id: 'hoofington' }).id : 'hoofington', stadium: st || 'smokehouse', draws: 'allowed' };
  if (part === 'shootout') o.shootoutOnly = true;
  o.after = m => {
    if (part === 'corner') m.startSetpiece('corner', 0, { y: P.Y0 });
    if (part === 'freekick') m.startSetpiece('freekick', 0, { x: m.goalX(0) - m.dir(0) * 180, y: P.CY + 30 });
    if (part === 'penalty') m.startSetpiece('penalty', 0, {});
    if (part === 'super' || part === 'duel') { m.mode = 'play'; m.sp = null; const f = m.side[0].find(p => p.data.captain); m.euph[0] = 100; m.triggerEurophoria(0); m.owner = f; f.body.x = m.goalX(0) - m.dir(0) * 200; f.body.y = P.CY; if (part === 'duel') { m.euph[1] = 100; m.triggerEurophoria(1); const g = m.side[1].find(p => p.data.captain); m.owner = g; g.body.x = m.goalX(1) - m.dir(1) * 200; g.body.y = P.CY; } }
  };
  return o;
};
