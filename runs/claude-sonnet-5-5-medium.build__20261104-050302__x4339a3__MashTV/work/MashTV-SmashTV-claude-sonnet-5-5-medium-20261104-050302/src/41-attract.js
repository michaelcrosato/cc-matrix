// MASH TV: the attract mode. After 10 s idle on any front-end screen the real game plays itself (2 cheating bots), looping 10 reels. Any input exits.
MT.attract = {};
const REELS = [
  { kind: 'cold', dur: 7, caption: 'TONIGHT ON MASH TV!' },
  { room: '1-1', dur: 18, caption: "MASH 'EM!", weapon: [[6, 'spread']] },
  { room: '1-2', dur: 14, caption: "CASH 'EM!", weapon: [[1, 'rockets']], keyAt: 10 },
  { room: '1-B', dur: 16, caption: 'BOSSES THE SIZE OF A STUDIO!', boss: 'mashy2' },
  { room: '2-2', dur: 16, caption: 'PRIME TIME = 5× CASH!', weapon: [[1, 'popcorn'], [3, 'laser']], primeAt: 5 },
  { room: '2-B', dur: 16, caption: 'SPIN THE WHEEL OF MISFORTUNE!', boss: 'wheel' },
  { room: '3-6', dur: 16, caption: 'PLAY TO THE CAMERAS!', weapon: [[1, 'records'], [1, 'shield']], showboat: true },
  { room: '3-B', dur: 24, caption: 'NOBODY CANCELS LANCE LUSTRE!', boss: 'lance' },
  { kind: 'recap', dur: 8, caption: 'BIG PRIZES!' },
  { kind: 'scores', dur: 6, caption: '' }];
MT.attract.REELS = REELS;
const A = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    const game = MT.game; this.idx = d && d.idx || 0; this.t = 0; this.grace = .35; this.loops = 0;
    MT.touchOnly = MT.touchOnly; MT.idle.flag = false; MT.idle.t = 0; game.players.forEach(p => p.consumeAll());
    const run = MT.newRun({ mode: 'attract', diff: 'CONTESTANT', players: [{ slot: 0, look: 0, bot: true }, { slot: 1, look: 1, bot: true }] }); this.run = run; MT.cheatsSave = Object.assign({}, MT.cheats);
    this.cheats = { god: true, infBombs: true, oneHit: false, freezeEnemies: false, noclip: false };
    for (const c of run.cs) { c.input = null; c.kind = 'bot'; c.prizes = []; }
    if (game.audio && !game.headless) { this.mv = game.audio.musicVolume; game.audio.musicVolume = this.mv * .45; try { game.audio.applyVolume(); } catch (e) { /* */ } }
    this.reel(this.idx); MT.hud.cursorOn(true);
  },
  exit() { const game = MT.game; if (this.mv !== undefined && game.audio) { game.audio.musicVolume = this.mv; try { game.audio.applyVolume(); } catch (e) { /* */ } } MT.worldNow = null; this.w = null; MT.hud.banners && 0; MT.lines.clear(); MT.ui.banners.length = 0; },
  reel(i) {
    const R = this.R = REELS[i % REELS.length]; this.idx = i % REELS.length; this.rt = 0; this.fired = {}; MT.ui.banners.length = 0; MT.lines.clear(); MT.worldNow = null; this.w = null;
    const run = this.run; run.seen = {}; MT.seedAll(100 + i);
    if (R.caption) MT.hud.banner(R.caption, '#ffcc33', 3);
    if (R.room) {
      const rm = MT.ROOMS[R.room]; run.ep = rm.ep; run.path = [R.room];
      for (const c of run.cs) { c.hp = c.maxHp; c.lives = 3; c.state = 'alive'; c.wpn = 'blaster'; c.wT = 0; c.addons = {}; c.bombs = 3; c.invuln = 0; c.cash = c.cash || 0; c.botOpts = { forceBoat: false }; }
      if (R.showboat) run.cs[0].botOpts.forceBoat = true;
      const w = this.w = new MT.World({ room: rm, contestants: run.cs, entry: 'S', demo: true, cheats: this.cheats }); MT.worldNow = w; w.dmgBoost = 3; w.cheats = this.cheats;
      w.phase = rm.boss ? 'bossIntro' : 'enter'; if (rm.boss) { w.bossIntroDone = true; }
      MT.music.play(rm.boss ? 'bossShowdown' : MT.EPISODES[rm.ep].song);
    } else if (R.kind === 'recap') {
      for (const c of run.cs) { c.prizes = MT.EPISODES[2].prizes.slice(c.slot, c.slot + 3 + c.slot).map(p => ({ name: p.name, value: p.value, joke: p.joke, ep: 2 })); c.cash = 90000 + c.slot * 31000; run.epStart[c.slot] = 20000; }
      const rc = this.rc = Object.create(MT.scenes.recap); rc.enter({ ep: 2 }); rc.left = true;
    } else if (R.kind === 'cold') { MT.music.play('theme'); MT.lines.say('ANNC', "LIVE FROM STUDIO 9... IT'S... MASH TV!", { prio: 3, force: true }); this.spk = 'ANNC'; }
    else if (R.kind === 'scores') { MT.music.play('theme'); }
  },
  update(dt) {
    const game = MT.game; this.t += dt; this.rt += dt; UI.t += dt; MT.hud.update(dt); this.grace -= dt;
    const any = MT.idle.step(game, dt); if (this.grace > 0) { MT.idle.t = 0; } else if (any) { MT.sfx('back'); MT.idle.t = 0; game.go('title', {}, { fade: 0 }); return; }
    const R = this.R, w = this.w;
    if (this.rc) this.rc.update(dt);
    if (R.kind === 'cold' && this.rt > 3 && !this.fired.lance) { this.fired.lance = 1; this.spk = 'LANCE'; MT.lines.say('LANCE', 'GOOD EVENING, PLANET EARTH! KA-CHING! KA-BOOM!', { prio: 3, force: true }); }
    if (R.kind === 'cold') MT.lines.update(dt);
    if (w) {
      for (const [at, id] of (R.weapon || [])) if (this.rt >= at && !this.fired['w' + at + id]) { this.fired['w' + at + id] = 1; for (const c of w.cs) w.giveWeapon(c, id); for (const c of w.cs) { c.wT = 999; for (const k in c.addons) c.addons[k] = 999; } }
      if (R.keyAt && this.rt >= R.keyAt && !this.fired.key) { this.fired.key = 1; for (const e of w.enemies) if (e.alive && e.placed && e.kind === 'mime') { e.noCash = true; w.killEnemy(e, { slot: 0 }); } }
      if (R.primeAt && this.rt >= R.primeAt && !this.fired.prime) { this.fired.prime = 1; w.startPrime(); }
      if (R.boss && w.phase === 'boss' && !this.fired.boss) { this.fired.boss = 1; const b = w.boss; if (R.boss === 'mashy2') { b.part('armL').hp = 0; b.killPart(w, b.part('armL'), 0); b.killPart(w, b.part('armR'), 0); b.part('body').hp = b.part('body').max * .55; } if (R.boss === 'wheel') b.forced = [6, 0, 3]; if (R.boss === 'lance') { b.pattern = 1; b.startPattern(w); } }
      if (R.boss === 'lance' && this.rt > 10 && !this.fired.cut && w.boss && w.phase === 'boss') { this.fired.cut = 1; const p = w.boss.part('podium'); p.hp = 1; }
      if (R.showboat && this.rt > 8 && !this.fired.bomb) { this.fired.bomb = 1; w.showstopper(w.cs[1]); }
      if (w.phase === 'bossIntro') { w.bossIntroDone = true; }
      for (const c of w.cs) if (c.state === 'out' || c.state === 'dying') { c.lives = 3; }
      if (w.phase === 'exit' && !w.exitPicked) { /* stay put */ }
      w.step(dt); MT.lines.update(dt);
      game.focus(MT.CX, MT.CY, 0); const ex = w.rm.boss && w.rm.boss !== 'mashy' ? 46 : w.rm.boss ? 22 : 6; const z = MT.fitZoom(game, w.map, ex); if (Math.abs(z - (this._z || 0)) > .002) { this._z = z; game.setZoom(z); } game.cam.offset = [0, Math.round(ex / 2)];
      game.cam.bounds = v => w.map.bounds(v);
    }
    if (this.rt >= R.dur) { let n = this.idx + 1; if (n >= REELS.length) { n = 0; this.loops++; } this.rc = null; this.reel(n); }
  },
  draw(r) {
    const R = this.R, w = this.w;
    if (w) { w.draw(r); MT.hud.draw(r, w, this); }
    else if (R.kind === 'cold') { MT.backdrop(r, this.rt); r.overlay(g => { UI.title(g, 'MASH TV', r.W / 2, 22, 5); UI.text(g, MT.TEXT.sub, r.W / 2, 62, '#2ee6ff', { align: 'center' }); MT.drawSpeaker(g, this.spk || 'ANNC', r.W / 2 - 34, 84, 68, this.rt); }); UI.drawLowerThird(r); UI.drawBanners(r); }
    else if (this.rc) { this.rc.draw(r); UI.drawBanners(r); }
    else if (R.kind === 'scores') { MT.scenes.scores.draw.call({ t: this.rt }, r); }
    r.overlay(g => {
      px.rect(g, r.W - 70, 4, 66, 10, 'rgba(10,4,20,.8)'); UI.text(g, 'DEMO PLAY', r.W - 37, 5, '#ff2e88', { align: 'center', font: 'tiny' });
      const pi = MT.lastInput(); if (Math.floor(this.t * 2) % 2 === 0) { const label = 'PRESS ANY BUTTON'; const wd = F.width(label) + 14; px.rect(g, r.W / 2 - wd / 2, r.H - 15, wd, 12, 'rgba(10,4,20,.85)'); UI.text(g, label, r.W / 2, r.H - 13, '#ffe068', { align: 'center' }); }
    });
  }
};
MT.attract.scene = A;
