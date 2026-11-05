// ---------------------------------------------------------------- the attract mode: the real game played by cheating bots, reel by reel
MT.attract = {
  reel: -1, t: 0, played: [],
  next() {
    this.reel = (this.reel + 1) % MT.REELS.length; this.t = 0; this.done = {}; this.played.push(this.reel);
    const R = MT.REELS[this.reel]; MT.lines.clear(); MT.banner.clear();
    if (MT.Show.W) { MT.Show.W.dispose(); MT.Show.W = null; }
    if (this.stage) { this.stage.dispose(); this.stage = null; }
    if (R.kind === 'room') {
      MT.newRun({ mode: 'attract', seed: R.seed, players: [{ slot: 0, look: 0, ctl: 'bot', botOpts: { boat: !!R.boat, noBomb: true } }, { slot: 1, look: 2, ctl: 'bot', botOpts: { boat: !!R.boat, noBomb: true } }] });
      MT.run.introduced = Object.fromEntries(Object.keys(MT.TEXT.intros).map(k => [k, true]));
      MT.Show.onRoomDone = () => true;   // the reel ends by time: a boss's death or an exit never leaves the attract mode
      const W = MT.Show.begin(R.room, 'S', { noCard: true });
      MT.music.play(R.room.endsWith('B') ? 'bossShowdown' : (MT.EPISODES[MT.ROOMS[R.room].ep] || MT.EPISODES[1]).song, { fade: .3 });
      for (const c of W.contestants) { if (R.weapon) W.equip(c, c.slot === 1 && R.weapon2 ? R.weapon2 : R.weapon); if (R.addon) W.equip(c, c.slot === 1 && R.addon2 ? R.addon2 : R.addon); c.bombs = 3; }
      W.phase = 'intro'; W.phaseT = 1.5;
      if (R.prime) MT.later(R.prime, () => { if (MT.Show.W === W) { W.ratings.primeCd = 0; W.ratings.startPrime(W); } });
    } else if (R.kind === 'cold') {
      MT.run = null; this.stage = MT.cut.stage([]); MT.music.play('theme', { fade: .3 });
      MT.lines.say('ANNC', MT.TEXT.cold[0][1], { prio: 3 });
    } else if (R.kind === 'recap') { this.recap = MT.fakeRecap(); MT.music.play('recap', { fade: .3 }); }
    else { MT.music.play('theme', { fade: .3 }); }
    if (R.cap) MT.lines.say('ANNC', MT.TEXT.captions[R.cap], { prio: 3 });
  },
  update(dt) {
    const R = MT.REELS[this.reel]; this.t += dt;
    if (R.kind === 'room') {
      const W = MT.Show.W; if (!W) return;
      if (W.phase === 'done') { W.phase = 'exit'; }
      MT.Show.update(dt);
      if (!MT.Show.W) return;
      const B = W.boss;
      if (R.bossPhase && B && B.introDone !== true) { B.skipIntro(); }
      if (R.bossPhase && B && !this.done.bp) { this.done.bp = true; for (const id of ['armL', 'armR']) { const p = B.part(id); if (p) { p.hp = 0; p.alive = false; } } B.part('body').hp *= .6; B.setPhase(R.bossPhase); }
      if (R.forceSegs && B && !this.done.fs) { this.done.fs = true; B.forced = R.forceSegs.slice(); if (!B.introDone) B.skipIntro(); }
      if (R.forceKey && this.t > R.forceKey && !this.done.key) { this.done.key = true; for (const e of W.enemies) if (e.kind === 'mime') W.kill(e, W.contestants[0]); }
      if (R.bomb && this.t > R.bomb && !this.done.bomb) { this.done.bomb = true; W.showstopper(W.contestants[1], true); }
      if (R.lanceMic && B && !this.done.mic) { this.done.mic = true; if (!B.introDone) B.skipIntro(); B.forcePat = 'mic'; }
      if (R.network && B && this.t > R.network && !this.done.net) { this.done.net = true; const p = B.part('podium'); if (p) p.hp = 0; }
      if (W.phase === 'exit' && W.phaseT > 3) { /* keep the bots fighting on: the reel ends by time */ }
    } else if (R.kind === 'cold') { MT.cast.lance && !MT.cfg.skipRigs && MT.cast.lance.update(dt, { x: AR.cx, y: 70, z: 0, facing: Math.PI / 2, pose: 'wave', expr: 'shout' }); }
    if (this.t >= R.dur) this.next();
  },
  draw(r) {
    const R = MT.REELS[this.reel];
    if (R.kind === 'room' && MT.Show.W) MT.Show.draw(r);
    else if (R.kind === 'cold' && this.stage) { this.stage.arena.fitCamera(MT.game); MT.game.focus(AR.cx, AR.cy - 4, 0); this.stage.draw(r); if (MT.cast.lance && !MT.cfg.skipRigs) { r.shadow(AR.cx, 70, 7, .5); r.actor(AR.cx, 70, 0, (g, ox, oy) => MT.cast.lance.draw(g, ox, oy, r.view)); } r.overlay(g => MT.drawLogo(g, r.W / 2, 20, 2, true)); }
    else if (R.kind === 'recap') { MT.ui.backdrop(r, MT.game.real); r.overlay(g => { MT.ui.title(g, r, 'BIG PRIZES!', 14, '#ff8ad8'); this.recap.forEach((c, k) => c.prizes.forEach((p, i) => { const x = r.W / 2 - 120 + k * 130, y = 50 + i * 26; MT.ui.panel(g, x, y, 120, 22, { alpha: .85, border: c.color }); px.sprite(g, MT.spr.icon(p.icon[0], p.icon[1], p.icon[2]), x + 4, y + 5); MT.ui.T(g, p.name.slice(0, 18), x + 20, y + 4, '#fff7e8', { font: 'tiny' }); MT.ui.T(g, MT.money(p.value), x + 20, y + 12, '#7ad88a', { font: 'tiny' }); })); }); }
    else { MT.ui.backdrop(r, MT.game.real); MT.drawScores(r); }
    r.overlay(g => {
      const T = MT.ui.T; MT.drawLogo(g, 34, 6, 1, true);
      T(g, 'DEMO PLAY', r.W - 8, 6, '#ff2e88', { align: 'right' });
      if (Math.floor(MT.game.real * 2) % 2) { const I = MT.ui.lastI(); T(g, MT.touch.only ? 'TAP TO RETURN' : 'PRESS ANY BUTTON', r.W / 2, r.H - 14, '#ffcc33', { align: 'center', scale: 1 }); }
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.attract = {
  input: MT.MENU, camera: { zoom: false },
  enter(d = {}) { this.from = d.from || 'title'; MT.attract.reel = -1; MT.attract.played = []; MT.attract.next(); this.t = 0; const g = MT.game; g.lights.enabled = true; if (g.audio) g.audio.duck(true); },
  exit() { MT.Show.onRoomDone = null; if (MT.Show.W) { MT.Show.W.dispose(); MT.Show.W = null; } if (MT.attract.stage) { MT.attract.stage.dispose(); MT.attract.stage = null; } MT.run = null; MT.lines.clear(); MT.banner.clear(); if (MT.game.audio) MT.game.audio.duck(false); },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (this.t > .1 && MT.idle.fired) { MT.game.go(MT.touch.only ? 'title' : this.from === 'lobby' ? 'title' : this.from, {}, { fade: 0 }); return; }
    MT.attract.update(dt);
  },
  draw(r) { MT.attract.draw(r); }
};
