/* ---- ATTRACT MODE: a looping AI-played reel on the real simulation; any input ends it ---- */
Scenes.sc.attract = (() => {
  const SEG = ['Puck Drop', 'Big Hits', 'Highlight Goal', 'Gloves Off', 'KABOOM!', 'Fan Frenzy', 'Story Teaser', 'Flood Wagon', 'Records Card'];
  const DUR = [8, 8, 12, 10, 10, 7, 8, 6, 5];
  const cfgFor = (n, loop) => { const a = ARENA_LIST[(loop + n) % 5], ids = TEAMS.filter(t => t.id !== 'grizzlies' || loop % 2).map(t => t.id), h = ids[(loop * 2 + n) % ids.length], aw = ids[(loop * 2 + n + 1 + (loop % 3)) % ids.length]; return { home: h, away: aw === h ? 'drillers' : aw, arena: a, humans: [], periods: 3, periodLen: 60, ot: false, shootout: false, noReplay: false, cheats: true, infTurbo: true, intros: n === 0, introLen: 3, noSinBin: false, seed: 77 + loop * 13 + n }; };
  let S_ = null;
  const sc = { view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], expand: true, res: 'ps1',
    enter() { Fx.hook(); S_ = { seg: -1, t: 0, loop: 0, visited: new Set(), segT: 0 }; this.next(); Synth.crowdStart(); },
    exit() { game.weather = null; },
    next() {
      S_.seg = (S_.seg + 1) % SEG.length; if (S_.seg === 0 && S_.t > 1) S_.loop++; S_.segT = 0; S_.visited.add(S_.seg); Talk.reset(); UI.clearBanners(); Replay.reset(); Cam.reset(); const n = S_.seg;
      if (n === 6) { this.cut = { lines: STORY.chapters[(S_.loop) % 5].pre.slice(0, 3), i: 0, t: 0 }; Synth.music('locker'); return; }
      if (n === 8) { Synth.music('theme'); this.cut = null; return; }
      this.cut = null; const m = Match.create(cfgFor(n, S_.loop)); m.silent = false; m.attract = true; Dev.attach(m); Cam.snap(Rink.CX, Rink.CY); game.weather = m.arena.weather ? { kind: m.arena.weather, amount: .5 } : null; Synth.music(n === 4 ? 'final' : m.arena.music === 'play' ? 'play' : m.arena.music);
      if (n !== 0) { m.phase = 'play'; m.fo = null; m.noPickup = false; }
      if (n === 0) { Match.faceoffNow(Rink.CX, Rink.CY, true); }
      if (n === 1) this.setupHits(m); if (n === 2) this.setupGoal(m); if (n === 3) this.setupFight(m); if (n === 4) this.setupKaboom(m); if (n === 5) this.setupFan(m); if (n === 7) { Rink.resetScuff(); for (let i = 0; i < 400; i++) Rink.addScuff(Rink.X0 + RNG.sim() * 860, Rink.Y0 + RNG.sim() * 380, .7); Flood.begin(m, () => {}); m.fl.state = 'drive'; m.fl.auto = true; m.fl.dur = 5.5; m.phase = 'flood'; Sim.emit('flood_start', {}); }
    },
    setupHits(m) { const a = m.sk[0], b = m.sk[3]; this.script = { t: 0, f: () => { }, done: false }; b.x = Rink.CX; b.y = Rink.Y0 + 70; b.vx = b.vy = 0; b.state = 'skate'; a.x = Rink.CX - 6; a.y = Rink.Y0 + 140; a.heading = -PI / 2; a.vx = 0; a.vy = -150; a.state = 'check'; a.st = .3; a.turbo = 1; a.items.hotsauce = 99; this.hitDo = 0; },
    setupGoal(m) { m.noPickup = false; const a = m.sk[0], b = m.sk[1], dir = Sim.attackDir(m, 0), gx = Sim.oppGoalX(m, 0); a.x = gx - dir * 150; a.y = Rink.CY - 70; b.x = gx - dir * 110; b.y = Rink.CY + 50; m.puck.x = a.x; m.puck.y = a.y; Puck.take(m, a); a.heading = Math.atan2(Rink.CY + 20 - a.y, dir * 60); for (const o of m.sk) if (o.side === 1) { o.x = gx - dir * 250; o.y = Rink.CY + (o.slot - 1) * 80; } this.stage = 0; this.stT = 0; m.gl[1].rfx = 1; },
    setupFight(m) { const a = m.sk[1], b = m.sk[4]; a.x = Rink.CX - 12; b.x = Rink.CX + 12; a.y = b.y = Rink.CY; a.state = 'skate'; b.state = 'skate'; a.grudge[b.id] = 90; b.grudge[a.id] = 90; this.fT = 1.6; a.skill = b.skill = .6; },
    setupKaboom(m) { const a = m.sk[0], dir = Sim.attackDir(m, 0), gx = Sim.oppGoalX(m, 0); a.x = gx - dir * 160; a.y = Rink.CY + 30; m.puck.x = a.x; m.puck.y = a.y; Puck.take(m, a); Sim.addBoom(m, 0, 100); a.heading = Math.atan2(Rink.CY - a.y, dir * 50); for (const o of m.sk) if (o.side === 1) { o.x = gx - dir * 300; o.y = Rink.CY + (o.slot - 1) * 90; } this.kT = 1.3; this.kDone = false; },
    setupFan(m) { Items.throwItem(m, 'hotsauce'); Items.throwItem(m, 'poutine'); Items.throwItem(m, 'boombox'); m.itemT = 2; this.fanT = 0; m.octos.push({ x: Rink.CX + 40, y: Rink.CY, t: 20 }); },
    update(dt) {
      const I = game.input; if (!S_) return; let act = false; try { act = I.anyPressed(); } catch (e) {} const c = I.clicked && I.clicked(); if (c && Idle.touchOnly()) { act = false; } const p = UI.pointer(); if (p && this.lp && Math.abs(p[0] - this.lp[0]) + Math.abs(p[1] - this.lp[1]) > 8) act = true; this.lp = p ? [p[0], p[1]] : this.lp;
      if (act && !(Idle.touchOnly() && !I.anyPressed())) { I.consumeAll(); return game.go('title', null, { fade: 'dissolve' }); }
      S_.t += dt; S_.segT += dt; const n = S_.seg, m = Match.cur();
      if (S_.segT > DUR[n]) { this.next(); return; }
      if (this.cut) { this.cut.t += dt; if (this.cut.t > 2.6) { this.cut.t = 0; this.cut.i = (this.cut.i + 1) % this.cut.lines.length; const [w, tx] = this.cut.lines[this.cut.i]; Synth.babble(tx, Rigs.VOICE_OF[w] || 'gen', { excl: true }); } if (this.cut.t < dt + .001 && this.cut.i === 0) { const [w, tx] = this.cut.lines[0]; Synth.babble(tx, Rigs.VOICE_OF[w] || 'gen'); } return; }
      if (!m) return; m.clock = Math.max(m.clock, 30); Flow.step(m, dt); Cam.update(m, dt); Talk.update(dt); Fx_step(m);
      if (n === 1 && this.hitDo === 0 && this.stT !== undefined) { const a = m.sk[0], b = m.sk[3]; if (Math.hypot(a.x - b.x, a.y - b.y) < 14 || S_.segT > 1.2) { this.hitDo = 1; if (b.state !== 'down') { Hits.bigHit(m, a, b, 340, [0, -1]); b.vy = -300; b.vx = 0; } } }
      if (n === 2) { this.stT += dt; const a = m.sk[0], b = m.sk[1]; if (this.stage === 0 && this.stT > 1) { this.stage = 1; if (a.hasPuck) { b.oneTimerT = .5; Puck.pass(m, a, b.x, b.y, b, false); } } else if (this.stage === 1 && this.stT > 1.6 && !a.hasPuck) { this.stage = 2; if (!b.hasPuck) { b.oneTimerT = .5; } } else if (this.stage === 1 && b.hasPuck) { this.stage = 2; Puck.shoot(m, b, 'onetimer', .9, { far: -1 }); } }
      if (n === 3) { this.fT -= dt; if (this.fT <= 0 && !m.fight && m.phase === 'play') { Fight.begin(m, m.sk[1], m.sk[4]); this.fT = 99; } }
      if (n === 4 && !this.kDone) { this.kT -= dt; if (this.kT <= 0) { const a = m.sk[0]; if (a.hasPuck) { this.kDone = true; a.holdShoot = 2; Puck.shoot(m, a, 'slap', 1, { far: .2 }); } else this.kT = .3; } }
      if (n === 5) { this.fanT += dt; if (this.fanT > 2) { this.fanT = 0; Items.throwItem(m, 'lumber'); } }
    },
    draw(r) {
      const n = S_.seg, m = Match.cur();
      if (this.cut) { r.sky(['#101828', '#18243a']); r.overlay(g => { const ch = this.cut; const [who, tx] = ch.lines[ch.i]; UI.title(g, 'STORY', r.W / 2, 18, 3); const rig = Rigs.portrait(who); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2, expr: 'shout' }); UI.box(g, 30, 80, r.W - 60, 70, { border: UI.GOLD }); Rigs.face(g, rig, 38, 88, 52, { turn: .4 }); UI.txt(g, who, 100, 92, UI.GOLD, { scale: 2 }); const ws = E.font.wrap(tx.replace(/\{[^}]*\}/g, ''), r.W - 140, {}); ws.slice(0, 3).forEach((l, i) => UI.txt(g, l, 100, 110 + i * 11, '#fff')); this.overlayTags(g, r); }); return; }
      if (n === 8 || !m) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.6)'); UI.title(g, 'ICE HOC-KABOOM', r.W / 2, 20, 4); const rc = Save.get().records; UI.txt(g, 'HARDEST SHOT  ' + Math.round(rc.hardest / 16 * 3.6) + ' km/h', r.W / 2, 90, UI.GOLD, { align: 'center' }); UI.txt(g, 'STORY STARS  ' + Save.totalStars() + '/15', r.W / 2, 104, '#cfe', { align: 'center' }); this.overlayTags(g, r); }); return; }
      DrawMatch.draw(r, m, game.time); r.overlay(g => this.overlayTags(g, r));
    },
    overlayTags(g, r) { const n = S_.seg; UI.box(g, 6, r.H - 22, 76, 14, { border: '#ff6a6a', alpha: .9 }); UI.txt(g, 'DEMO - ' + SEG[n].toUpperCase(), 10, r.H - 19, '#ff9a8a', { font: 'tiny' }); UI.txt(g, 'ICE HOC-KABOOM', r.W - 8, r.H - 20, '#ffd36a', { align: 'right', font: 'tiny' }); const msg = Idle.touchOnly() ? 'Controller or keyboard required' : 'PRESS ANY BUTTON'; if (Math.floor(game.time * 2) % 2 || Idle.touchOnly()) { if (Idle.touchOnly()) UI.txt(g, msg, r.W / 2, r.H - 14, '#fff', { align: 'center', scale: 1 }); else Glyphs.text(g, msg, r.W / 2, r.H - 12, { align: 'center', color: '#fff' }); } }
  };
  const Fx_step = m => {};
  sc.state = () => S_ ? { segment: S_.seg, visited: Array.from(S_.visited), loop: S_.loop } : null;
  return sc;
})();
// ---- animation lab (dev) ----
Scenes.sc.lab = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
  enter() { this.i = 0; this.t = 0; this.rig = Rigs.skater(TEAM.muskrats.skaters[0], 0, TEAM.muskrats, false); this.g = Rigs.goalie(TEAM.muskrats.goalie, TEAM.muskrats, false); this.map = Rink.buildMap(ARENAS.icebox); game.cam.bounds = null; Synth.music(null); this.list = ['skate', 'glide', 'hockey stop', 'wrist shot', 'slapshot', 'pass', 'check', 'deke spin', 'poke', 'big hit fall', 'celebrate', 'fight jab', 'fight haymaker', 'goalie ready', 'goalie butterfly', 'goalie glove']; },
  update(dt) { this.t += dt; const I = game.input; if (I.pressed('up')) this.i = (this.i + this.list.length - 1) % this.list.length; if (I.pressed('down')) this.i = (this.i + 1) % this.list.length; if (I.pressed('cancel')) game.go('title'); if (I.pressed('camera')) game.nextView && game.nextView(); },
  draw(r) { const n = this.list[this.i], u = (this.t % 1.2) / 1.2, x = Rink.CX, y = Rink.CY, st = { x, y, z: 0, facing: 0, vx: 0, vy: 0 }; const mv = () => { if (n === 'skate') { st.vx = 120; } if (n === 'hockey stop') st.crouch = .5; if (n.includes('shot') || n === 'pass') st.attack = E.move(n === 'slapshot' ? 'overhead' : 'backslash', u); if (n === 'check') st.attack = E.move('bash', u); if (n === 'poke') st.attack = E.move('thrust', u); if (n === 'deke spin') st.facing = u * TAU; if (n === 'big hit fall') { st.down = .9; st.flip = u; } if (n === 'celebrate') st.pose = 'cheer'; if (n === 'fight jab') { st.stance = 'guard'; st.attack = E.move('jab', u); } if (n === 'fight haymaker') { st.stance = 'guard'; st.attack = E.move('haymaker', u); } }; mv(); this.rig.update(1 / 60, st); this.g.update(1 / 60, { x: x + 60, y, z: 0, facing: PI, crouch: n === 'goalie butterfly' ? 1 : .35, pose: n === 'goalie glove' ? 'wave' : undefined }); game.focus(x + 20, y, 10); game.setZoom(3); this.map.drawFloor(r); const s = { x, y, z: 0, rig: this.rig, heading: st.facing, num: 9, jersey: '#5a3a22', state: 'skate', items: {}, swing: u < .5 ? 1 : 0 }; Rigs.drawSkater(r, s, E.charView(r.view)); Rigs.drawGoalie(r, { x: x + 60, y, z: 0, rig: this.g, heading: PI, def: { padCol: '#f3e6c8' }, num: 31, jersey: '#5a3a22' }, E.charView(r.view)); r.overlay(g => { this.list.forEach((l, i) => UI.txt(g, (i === this.i ? '▸ ' : '  ') + l, 8, 10 + i * 11, i === this.i ? UI.GOLD : '#9ab')); UI.txt(g, 'ANIMATION LAB  ↑↓ pick  ○ back', 8, r.H - 10, '#789', { font: 'tiny' }); }); }
};
