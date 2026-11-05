/* ---------- attract mode: an exhibition bout, the bonus reel, how to fight, the scores, the title; any input exits ---------- */
KC.attractSteps = ['bout', 'bonus', 'howto', 'scores', 'title'];
KC.scenes.attract = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    const g = KC.game; this.loop = (d && d.loop) || ((KC._attractLoop = (KC._attractLoop || 0) + 1)); this.step = -1; this.t = 0; this.quit = false; KC._attractLoop = this.loop; g.follow(null); g.audio.duck && g.audio.duck(true);
    this.calls = []; KC.current = this; this.stepName = null; this.seen = {}; KC.idle.t = 0; this.next();
  },
  exit() { KC.game.audio.duck && KC.game.audio.duck(false); KC.game.timeScale = T().gameSpeed; },
  rng() { return this.R; },
  next() {
    this.step++; this.t = 0; const g = KC.game, name = KC.attractSteps[this.step % KC.attractSteps.length]; this.stepName = name; this.R = E.rng(this.loop * 977 + this.step * 31 + 5);
    if (this.step >= KC.attractSteps.length) { this.loop++; KC._attractLoop = this.loop; this.step = 0; this.stepName = KC.attractSteps[0]; this.R = E.rng(this.loop * 977 + 5); }
    const n = this.stepName; this.bout = null; this.bonus = null;
    if (n === 'bout') this.startBout(); else if (n === 'bonus') this.startBonus(); else if (n === 'howto') this.startHowto(); else if (n === 'scores') { this.stage = new Stage('stadium'); KC.music('title'); } else if (n === 'title') { this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .32 }); KC.music('title'); this.tr = KC.makeRig(KC.FIGHTER.taro, 0, 'white'); this.mr = KC.makeRig(KC.FIGHTER.mei, 1, 'black5'); }
  },
  startBout() {
    const R = this.R, ids = [], pool = KC.ROSTER.map(f => f.id); ids.push(pool[Math.floor(R() * pool.length)]); do { ids[1] = pool[Math.floor(R() * pool.length)]; } while (ids[1] === ids[0]);
    const stages = KC.STAGES.slice(0, 8).map(s => s.id), stg = stages[Math.floor(R() * stages.length)]; this.stage = new Stage(stg);
    this.ais = ids.map((id, i) => new KarateAI({ id, level: 10, seed: this.loop * 13 + i, mode: 'showcase', start: i * 7 + this.loop * 3 }));
    this.bout = new Bout({ ids, seed: this.loop * 5 + 1, single: true, ctrl: this.ais.map(a => (m, f, b) => a.intent(m, f, b)), mode: 'attract' });
    this.hud = new FightHUD(this.bout, { names: ids.map(i => KC.FIGHTER[i].name.split(' ')[0]), hideScore: true }); this.bout.on('point', p => KC.scenes.fight.onPoint.call(this, p)); this.bout.on('block', p => KC.scenes.fight.onBlock.call(this, p));
    this.bout.on('call', c => { this.seen[c.id] = (this.seen[c.id] || 0) + 1; }); this.bout.on('aiuchi', () => KC.sfx('crowdOoh')); this.d = { noSlow: true };
    // the director: half, full, aiuchi, a sweep, a flip, a time-out hantei
    this.dir = { ex: 0, mode: 'fresh' }; this.bout.o.single = true; this.bout.start(); this.camX = undefined; KC.music(this.stage.d.music);
    this.bout.on('hajime', () => this.directExchange()); this.bout.on('card', () => {});
    this.bout.on('point', () => { this.dir.ex++; }); this.bout.on('aiuchi', () => { this.dir.ex++; });
  },
  directExchange() {
    const b = this.bout, ex = this.dir.ex, A = this.ais; b.invincible = [false, false]; b.directorQ = null; A.forEach(a => { a.queue = []; });
    const plan = [['half', 0, ['frontSweep']], ['full', 1, ['frontFlip', 'upLunge']], ['aiuchi', 0, []], ['full', 0, ['jumpSide']], ['half', 1, ['frontKick']], ['time', 0, []]][Math.min(ex, 5)];
    let [kind, who, q] = plan;
    if ((kind === 'half' || kind === 'full') && b.pts[who] + (kind === 'full' ? 1 : .5) >= T().pointsToWin) kind = 'time';
    if (kind === 'half') { b.invincible[1 - who] = true; b.invincible[who] = false; b.directorQ = .15; A[who].queue = q.slice(); A[1 - who].noBlock = true; }
    else if (kind === 'full') { b.invincible[1 - who] = true; b.directorQ = 1; A[who].queue = q.slice(); A[1 - who].noBlock = true; }
    else if (kind === 'aiuchi') { b.f[0].x = 185; b.f[1].x = 215; this.forceAiuchi = 60; }
    else if (kind === 'time') { b.invincible = [true, true]; const m = Math.max(b.pts[0], b.pts[1]); b.pts = [m, m]; b.clock = 6; }
    A.forEach(a => { a.noBlock = kind !== 'aiuchi' && false; });
  },
  startBonus() {
    this.sub = ['boards', 'pots', 'bull'][0]; this.subIdx = 0; this.mkBonus(0); KC.music('bonus');
  },
  mkBonus(i) {
    const kinds = ['boards', 'pots', 'bull']; this.subIdx = i; const k = kinds[i]; this.stage = new Stage(KC.BONUS[k].stage); const o = { auto: true, seed: this.loop, params: k === 'boards' ? { n: 5, mat: 0 } : undefined, visit: this.loop };
    this.bonus = k === 'boards' ? new Boards(o) : k === 'pots' ? new Pots(o) : new BullStage(o); this.bonus.cardT = .8; this.bt = 0; if (k === 'bull') { this.bonus.charges = 1; } if (k === 'pots') { this.bonus.seq = this.bonus.seq.slice(0, 9); }
  },
  startHowto() {
    this.stage = new Stage('dojo'); this.me = new Karateka('negi', 0, { belt: 'black1' }); this.dum = new Karateka('kamaboko', 1, { belt: 'white' }); this.list = ['frontKick', 'roundKick', 'lowKick', 'upLunge', 'frontSweep', 'upperPunch', 'backRound', 'jumpSide', 'frontFlip', 'block']; this.li = 0; this.lt = 0; this.me.reset(); this.dum.reset(); this.dum.face = -1; KC.music('practice');
  },
  update(dt) {
    const g = KC.game; this.t += dt;
    if (KC.anyInput(g)) { KC.idle.t = 0; if (this.t > .25) { if (KC.touchGate() && g.input.lastDevice !== 'touch') KC._gateLifted = true; g.go('title'); return; } }
    this.stage && this.stage.update(dt); g.focus(200, 0, 50);
    const n = this.stepName;
    if (n === 'bout' && this.bout) {
      if (this.forceAiuchi > 0 && this.bout.phase === 'fight') { this.forceAiuchi = 0; const [a, b] = this.bout.f; a.x = 183; b.x = 217; a.start('roundKick', b, 'n', 'r'); b.start('roundKick', a, 'n', 'l'); }
      this.bout.update(dt); KC.updateReferee(this.bout, dt); KC.fightCamera(this, dt, this.bout); KC.scenes.fight.footsteps.call(this);
      if (this.bout.done || this.t > 70) this.next();
    } else if (n === 'bonus' && this.bonus) {
      this.bt += dt; this.bonus.update(dt); if (this.bonus.done || this.bt > (this.subIdx === 1 ? 15 : 14)) { if (this.subIdx < 2) this.mkBonus(this.subIdx + 1); else this.next(); }
    } else if (n === 'howto') {
      this.lt += dt; const id = this.list[this.li % this.list.length], t = KC.TECHS[id]; this.me.frozen = false; this.me.x = 150; this.dum.x = 150 + PUSH + 36;
      if (this.lt > 2.6) { this.lt = 0; this.li++; this.me.endTech(); this.me.start(this.list[this.li % this.list.length], this.dum, 'n', null); }
      if (this.me.tech) this.me.step(this.dum, null); this.me.update(dt, this.dum); this.dum.update(dt, this.me); if (this.t > 30 || this.li >= this.list.length) this.next();
    } else if (n === 'scores') { if (this.t > 6) this.next(); }
    else if (n === 'title') { this.tr.update(dt, { x: 150, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard' }); this.mr.update(dt, { x: 250, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, stance: 'guard' }); if (this.t > 5) this.next(); }
  },
  draw(r) {
    const n = this.stepName; this.stage && this.stage.draw(r);
    if (n === 'bout' && this.bout) { for (const f of this.bout.f) f.draw(r); KC.drawReferee(r, this.bout); this.hud.draw(r); }
    else if (n === 'bonus' && this.bonus) { this.bonus.draw(r); r.overlay(g => { if (this.bonus.msgT > 0 && this.bonus.msg) E.font.title(g, this.bonus.msg, r.W / 2, Math.round(r.H * .26), { scale: 2, align: 'center', colors: GOLD, depth: 2 }); if (this.bonus.state === 'card') { KC.title(g, 'BONUS STAGE!', r.W / 2, Math.round(r.H * .3), 2); } }); }
    else if (n === 'howto') {
      const id = this.list[this.li % this.list.length], t = KC.TECHS[id]; this.me.draw(r); this.dum.draw(r);
      r.overlay(g => { KC.panel(g, r.W / 2 - 120, 8, 240, 50, { alpha: .8 }); KC.title(g, 'HOW TO FIGHT', r.W / 2, 12, 1); KC.text(g, t.name, r.W / 2, 28, '#ffd060', { align: 'center' }); KC.glyphTech(g, id, Math.round(r.W / 2 - 24), 40, {}); });
    } else if (n === 'scores') { r.overlay(g => px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#07060d'))); KC.cab.drawTable(r, 'story', 24, 'CHAMPON ROAD - HIGH SCORES'); }
    else if (n === 'title') { r.actor(150, 0, 0, (g, ox, oy) => this.tr.draw(g, ox, oy, r.view)); r.actor(250, 0, 0, (g, ox, oy) => this.mr.draw(g, ox, oy, r.view)); r.overlay(g => { px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#07060d')); E.font.title(g, 'KARATE', r.W / 2, 14, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 }); E.font.title(g, 'CHAMPON', r.W / 2, 50, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 }); }); }
    r.overlay(g => { if (Math.floor(KC.game.real * 1.6) % 2 === 0 || true) KC.text(g, 'DEMO - PRESS ' + (KC.family() === 'key' ? 'ENTER' : 'START'), r.W / 2, r.H - 14, Math.floor(KC.game.real * 2) % 2 ? '#ffd060' : '#fff6e8', { align: 'center', scale: 1 }); });
  }
};
