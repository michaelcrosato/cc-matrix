// ---------------------------------------------------------------- the Technique Lab (dev, 14): the hero against a standing dummy.
// Choose a technique, set the gap to the dummy, play it: the lab says whether it connected, the gap, and the frame data.
KC.makeLab = (game, S) => {
  const LIST = KC.DATA.techniqueIds;
  S.lab = {
    pausable: false,
    enter(data) {
      this.i = Math.max(0, LIST.indexOf(data && data.tech) );
      this.gap = this.gap || 30; this.hero = new KC.Karateka({ id: 'taro', side: 'w' }); this.dummy = new KC.Karateka({ id: 'genkotsu', side: 'r' });
      this.rig = KC.View.rigFor('taro', 'w'); this.drig = KC.View.rigFor('kamaboko', 'r');
      this.result = null; this.reset();
      KC.A.music(game, 'practice');
    },
    reset() {
      this.hero.reset(); this.dummy.reset(); this.hero.x = 150; this.hero.facing = 1;
      this.dummy.x = 150 + KC.BODY_W + this.gap; this.dummy.facing = -1; this.dummy.state = 'idle';
      this.hit = false; this.hitGap = null; this.played = null;
    },
    update(d) {
      game.focus(200, 0, 30);
      if (game.input.pressed('right')) { this.i = (this.i + 1) % LIST.length; this.reset(); }
      if (game.input.pressed('left')) { this.i = (this.i + LIST.length - 1) % LIST.length; this.reset(); }
      if (game.input.pressed('up')) { this.gap = Math.min(90, this.gap + 2); this.reset(); }
      if (game.input.pressed('down')) { this.gap = Math.max(0, this.gap - 2); this.reset(); }
      if (game.input.pressed('confirm')) { this.reset(); this.hero.startTech(LIST[this.i]); this.played = LIST[this.i]; }
      if (game.input.pressed('cancel')) return game.go('dev', { back: 'title', resume: true });
      KC.TOGGLES.slowMo ? (game.timeScale = 0.25) : (game.timeScale = KC.TUNE.gameSpeed);
      if (this.played) {
        this.hero.tick(d, this.dummy, true); this.dummy.tick(d, this.hero, false);
        const T = KC.DATA.techniques[this.played];
        if (!this.hit && T.reach && this.hero.tech && this.hero.tech.ph === 1) {
          const gap = Math.abs(this.dummy.x - this.hero.x) - KC.BODY_W;
          if (gap <= T.reach[1] * KC.TUNE.reachScale && this.hero.hittableBy(T, this.dummy)) { this.hit = true; this.hitGap = gap; }
        }
        if (!this.hero.tech && this.hero.state !== 'tech') this.result = this.hit ? 'HIT at gap ' + this.hitGap.toFixed(1) : 'MISS';
      }
      KC.View.applyPose(this.rig, this.hero.poseState(), d);
      KC.View.applyPose(this.drig, this.dummy.poseState(), d);
    },
    draw(r) {
      const id = LIST[this.i], T = KC.DATA.techniques[id];
      KC.View.drawStage(r, KC.DATA.stages.dojo, game.time);
      KC.View.drawFighters(r, [this.hero, this.dummy], { w: this.rig, r: this.drig });
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, 46, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        E.font.text(g, 'LAB  ' + T.name + '  (' + T.jp + ')', 12, 12, '#fffbe8', { outline: '#0b0814', scale: 2 });
        const f = T.f ? 'FRAMES ' + T.f[0] + ' / ' + T.f[1] + ' / ' + T.f[2] + '   ' : '';
        const band = T.reach ? 'REACH ' + T.reach[0] + '-' + T.reach[1] + '   POINTS ' + (T.pts ? T.pts[0] + '-' + T.pts[1] : '-') : '';
        E.font.text(g, f + band, 12, 34, '#fff6d0', { outline: '#0b0814' });
        E.font.text(g, 'DUMMY GAP ' + this.gap + '   ' + (this.result || (this.played ? '...' : 'PLAY TO TEST')), 12, r.H - 40, '#ffe08a', { outline: '#0b0814' });
        E.font.text(g, 'LEFT/RIGHT TECHNIQUE · UP/DOWN GAP · CROSS PLAY · CIRCLE BACK', 12, r.H - 18, '#a9a1c8', { outline: '#0b0814', font: 'tiny' });
      });
    }
  };
  return S;
};
