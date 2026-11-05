// ---------------------------------------------------------------- cutscenes: the Cold Open and the Green Room's door (game.script sequences on the stage)
MT.cut = {
  stage(contestants) {   // a World used as a set: the studio, the crowd, the jumbotron
    const W = new MT.World({ room: { id: 'STAGE', name: 'LIVE FROM STUDIO 9', ep: 1, set: 'studio' }, contestants: contestants || [], entry: 'S', ratings: new MT.Ratings(), mode: 'cut', intro: false });
    W.ratings.R = 70;
    (contestants || []).forEach((c, k, a) => { c.x = AR.cx + (k - (a.length - 1) / 2) * 30; c.y = 170; c.state = 'play'; c.facing = -Math.PI / 2; c.z = 0; });
    return W;
  },
  lance: { x: AR.cx, y: -20, pose: 'wave' }
};
MT.scenes.cut = {
  input: MT.MENU, skippable: true, camera: { zoom: false },
  enter(d = {}) {
    this.id = d.id || 'cold'; this.t = 0; this.done = false; this.hold = 0;
    const g = MT.game; g.lights.enabled = true; g.lights.ambient = .3;
    this.W = MT.cut.stage(MT.run ? MT.run.contestants : []); MT.cast.build();
    this.L = { x: AR.cx, y: -20, vx: 0, vy: 0 }; this.lanceOn = this.id === 'cold';
    MT.music.play(this.id === 'cold' ? 'theme' : 'recap', { fade: .5 });
    const self = this;
    this.sc = g.script(function* () {
      if (self.id === 'cold') {
        yield 1; MT.babble.crowd('murmur', .4);
        for (const [sp, text] of MT.TEXT.cold) {
          if (sp === 'CONTESTANTS') { for (const c of self.W.contestants) { const bio = MT.TEXT.bios[c.look % 4]; let done = false; MT.lines.say('P' + (c.slot + 1), c.name + '! ' + bio, { prio: 3, onDone: () => { done = true; } }); c.cheer = true; yield () => done; c.cheer = false; } continue; }
          let done = false; MT.lines.say(sp, text, { prio: 3, vars: { N: self.W.contestants.length }, onDone: () => { done = true; } });
          if (sp === 'ANNC') { self.logo = true; MT.babble.crowd('cheer', 1); MT.game.particles && !MT.game.headless && MT.game.particles.bits(-10, 120, 30, 40, ['#ff2e88', '#ffcc33', '#2ee6ff']); }
          if (sp === 'LANCE' && !self.walked) { self.walked = true; MT.sfx('rollup'); }
          yield () => done;
        }
      } else {
        let done = false; MT.lines.sayAll(MT.TEXT.greenOpen, { prio: 3, onDone: () => { done = true; } }); yield () => done;
      }
      yield .4; self.finish();
    });
  },
  finish() {
    if (this.done) return; this.done = true; MT.lines.clear();
    if (this.id === 'cold') MT.game.go('play', { ep: 1 }); else MT.game.go('play', { room: 'GR', noCard: true });
  },
  exit() { if (this.W) this.W.dispose(); for (const c of (MT.run ? MT.run.contestants : [])) c.cheer = false; },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (UI.held('confirm') || UI.held('start')) { this.hold += dt; if (this.hold > .6) this.finish(); } else this.hold = 0;
    if (this.walked && this.L.y < 70) { this.L.vy = 40; this.L.y += 40 * dt; } else this.L.vy = 0;
    const lr = MT.cast.lance; if (lr && !MT.cfg.skipRigs && this.lanceOn) { lr.update(dt, { x: this.L.x, y: this.L.y, z: 0, vx: 0, vy: this.L.vy, facing: Math.PI / 2, pose: this.L.vy ? undefined : ['wave', 'hips', 'cheer'][Math.floor(this.t / 1.5) % 3], expr: MT.lines.current && MT.lines.current.speaker === 'LANCE' ? 'shout' : 'smile' }); }
    for (const c of this.W.contestants) c.pose(dt);
  },
  draw(r) {
    const W = this.W; W.arena.fitCamera(MT.game); MT.game.focus(AR.cx, AR.cy - 4, 0);
    W.draw(r);
    const tn = MT.game.time;
    for (let i = 0; i < 3; i++) { const a = tn * .8 + i * 2.1; MT.game.lights.add(AR.cx + Math.cos(a) * 120, AR.cy + Math.sin(a * 1.2) * 70, 0, 70, .8, { color: ['#ff2e88', '#2ee6ff', '#ffcc33'][i] }); }
    if (this.lanceOn && this.walked && MT.cast.lance && !MT.cfg.skipRigs) { r.shadow(this.L.x, this.L.y, 7, .5); r.actor(this.L.x, this.L.y, 0, (g, ox, oy) => MT.cast.lance.draw(g, ox, oy, r.view)); MT.game.lights.add(this.L.x, this.L.y, 0, 50, 1, { color: '#fff4c0' }); }
    r.overlay(g => {
      if (this.logo) MT.drawLogo(g, r.W / 2, 16, 2, true);
      if (MT.lines.current) MT.ui.lowerThird(g, r);
      MT.ui.T(g, 'HOLD', r.W - 72, 4, '#8a7a9a', { font: 'tiny' }); MT.glyph.draw(g, r.W - 52, 2, 'confirm', MT.ui.lastI()); MT.ui.T(g, 'SKIP', r.W - 30, 4, '#8a7a9a', { font: 'tiny' });
    });
  }
};
