/* ---- THE CUP RUN MAP (12.4): a snowy highway, the team bus, five town stops (each sign with the rival's logo and the
 * stars earned, locked until the one before is won). The stop in focus shows its chapter and objectives. Then the
 * pre-game scene, chapter 1's warm-up drills, the pre-game card and the game ---- */
const Bus2 = { x: 0, y: 0, to: null };
scenes.storymap = {
  enter(d) {
    d = d || {}; this.i = clamp((d.chapter || Save.nextChapter()) - 1, 0, 4); if (!Save.unlocked(this.i + 1)) this.i = Math.max(0, Save.nextChapter() - 1); this.reset = 0; this.t = 0;
    const p = this.stopXY(this.i, 427, 240); Bus2.x = d.arrived ? this.stopXY(Math.max(0, this.i - 1), 427, 240)[0] : p[0]; Bus2.y = d.arrived ? this.stopXY(Math.max(0, this.i - 1), 427, 240)[1] : p[1];
    Synth.music('menu'); UI.Idle.reset(); Story.step = 'map';
  },
  stopXY(i, W, H) { const a = STORY.chapters[i].at; return [Math.round(20 + a[0] * (W - 40)), Math.round(40 + a[1] * (H - 110))]; },
  update(dt) {
    this.t += dt; this.reset = Math.max(0, this.reset - dt);
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    const move = d => { let j = this.i + d; if (j < 0 || j > 4) return; this.i = j; Synth.sfx('menuMove'); };
    if (UI.anyRep('left') || UI.anyRep('up')) move(-1); if (UI.anyRep('right') || UI.anyRep('down')) move(1);
    const W = game.W, H = game.H, p = UI.pointer(); if (p && UI.mouseMoved) for (let k = 0; k < 5; k++) { const [x, y] = this.stopXY(k, W, H); if (Math.hypot(p[0] - x, p[1] - y) < 18 && k !== this.i) { this.i = k; Synth.sfx('menuMove'); } }
    const ck = game.input.clicked(); let go = UI.anyP('confirm') || UI.anyP('start');
    if (ck) for (let k = 0; k < 5; k++) { const [x, y] = this.stopXY(k, W, H); if (Math.hypot(ck[0] - x, ck[1] - y) < 18) { this.i = k; go = true; } }
    if (go) { if (!Save.unlocked(this.i + 1)) { Synth.sfx('menuBack'); UI.toast('WIN THE GAME BEFORE IT FIRST', '#ff8a8a'); } else { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); startChapter(this.i + 1); return; } }
    if (UI.anyP('lob')) { if (this.reset > 0) { Save.reset(); this.i = 0; UI.toast('A NEW CUP RUN BEGINS', UI.GOLD); this.reset = 0; } else { this.reset = 2.5; Synth.sfx('menuMove'); } }
    if (UI.anyP('cancel')) { Synth.sfx('menuBack'); game.go('title', { menu: true }); }
    const [tx, ty] = this.stopXY(this.i, W, H); Bus2.x = approach(Bus2.x, tx, 160 * dt); Bus2.y = approach(Bus2.y, ty, 160 * dt);
  },
  draw(r) {
    r.sky(['#cfe0f0', '#e8f0f8', '#f4f8fc']);
    const t = game.real;
    r.overlay(g => {
      // snow, pines, the highway between the stops
      for (let k = 0; k < 60; k++) { const x = E.hash2(k, 1) * r.W, y = 40 + E.hash2(k, 2) * (r.H - 80); px.poly(g, [[x, y - 9], [x + 5, y + 2], [x - 5, y + 2]], '#3a6a4a'); px.poly(g, [[x, y - 13], [x + 3, y - 4], [x - 3, y - 4]], '#4a7a5a'); px.rect(g, x - 1, y + 2, 2, 2, '#5a3a22'); }
      for (let k = 0; k < 4; k++) { const [x0, y0] = this.stopXY(k, r.W, r.H), [x1, y1] = this.stopXY(k + 1, r.W, r.H); px.line(g, x0, y0, x1, y1, '#4a4a54', 7); px.line(g, x0, y0, x1, y1, '#6a6a74', 5); for (let s = 0; s < 1; s += .12) px.dot(g, lerp(x0, x1, s), lerp(y0, y1, s), '#ffe84a'); }
      for (let k = 0; k < 40; k++) { const x = (E.hash2(k, 9) * r.W + t * 14 * (1 + E.hash2(k, 3))) % r.W, y = (E.hash2(k, 8) * r.H + t * 22) % r.H; px.dot(g, x, y, '#ffffff'); }
      STORY.chapters.forEach((c, k) => {
        const [x, y] = this.stopXY(k, r.W, r.H), open = Save.unlocked(k + 1), f = k === this.i, stars = Save.data.stars[k + 1] || [];
        UI.panel(g, x - 16, y - 34, 32, 30, { focus: f, bg: open ? ['#1a3060', '#0a1430'] : ['#2a2a34', '#18181e'] });
        Logo.draw(g, c.rival, x - 12, y - 32, 24); if (!open) { px.blend(g, .6, 'normal', () => px.rect(g, x - 15, y - 33, 30, 28, '#18181e')); E.font.text(g, 'LOCKED', x, y - 22, '#8a8a90', { align: 'center', font: 'tiny', outline: false }); }
        px.rect(g, x - 1, y - 4, 2, 6, '#5a5a64');
        for (let s = 0; s < 3; s++) E.font.text(g, '★', x - 9 + s * 7, y + 3, stars[s] ? UI.GOLD : '#9aa4b4', { outline: '#000' });
        if (Save.data.done[k + 1]) E.font.text(g, 'WON', x, y - 44, '#2a8a3a', { align: 'center', font: 'tiny', outline: false });
      });
      // the bus
      const bx = Math.round(Bus2.x), by = Math.round(Bus2.y) + 26; px.rect(g, bx - 10, by - 6, 20, 8, '#e8b43a'); px.rect(g, bx - 9, by - 5, 18, 3, '#cfe8ff'); px.rect(g, bx - 10, by + 2, 20, 1, '#5a3a22'); px.disc(g, bx - 6, by + 3, 2, '#141418'); px.disc(g, bx + 6, by + 3, 2, '#141418'); E.font.text(g, 'MUK', bx, by - 13, '#5a3a22', { align: 'center', font: 'tiny', outline: false });
      UI.title(g, 'THE CUP RUN', r.W / 2, 6, 2);
      const c = STORY.chapters[this.i], open = Save.unlocked(this.i + 1);
      UI.panel(g, 8, r.H - 66, r.W - 16, 48, {});
      E.font.text(g, 'CHAPTER ' + c.n + ': ' + c.title, 16, r.H - 62, UI.GOLD, { outline: '#000' });
      E.font.text(g, 'vs ' + TEAMS[c.rival].name + ' at ' + ARENAS[c.arena].name, 16, r.H - 52, '#eef4ff', { outline: false });
      Objectives.list(c.objectives).forEach((o, k) => E.font.text(g, ((Save.data.stars[c.n] || [])[k] ? '★ ' : '☆ ') + o.text, 16 + k * Math.floor((r.W - 32) / 3), r.H - 40, (Save.data.stars[c.n] || [])[k] ? UI.GOLD : UI.MUTED, { outline: false }));
      E.font.text(g, 'STARS ' + Save.totalStars() + '/15', r.W - 16, r.H - 62, UI.GOLD, { align: 'right', outline: false });
      UI.legend(g, r, [['confirm', open ? 'PLAY' : 'LOCKED'], ['lob', this.reset > 0 ? 'AGAIN TO ERASE' : 'NEW RUN'], ['cancel', 'BACK']]);
      UI.drawToasts(g, r, 30);
    });
  }
};
/** a chapter: the pre-game scene (with its choice), chapter 1's warm-up drills, the pre-game card, the game */
function startChapter(n) {
  Story.chapter = n; Story.st.attempt = 0; const c = Story.ch(n);
  game.go('cutscene', { id: c.pre, chapter: n, onDone: () => {
    if (c.warmup) game.go('warmup', { n }, { fade: 'wipe' });
    else game.go('pregame', { n }, { fade: 'wipe' });
  } }, { fade: 'wipe' });
}
scenes.warmup = {
  enter(d) { this.n = d.n; this.i = 0; this.menu = new UI.Tiles([{ id: 'yes', label: 'WARM UP', sub: 'DRILLS 1-3 WITH MARGE' }, { id: 'no', label: 'SKIP IT', sub: 'STRAIGHT TO THE GAME' }], { cols: 2, w: 130, h: 44, y: 110, onPick: it => it.id === 'yes' ? Drills.chain([1, 2, 3], () => game.go('pregame', { n: this.n }, { fade: 'wipe' })) : game.go('pregame', { n: this.n }, { fade: 'wipe' }) }); Synth.music('locker'); },
  update(dt) { this.menu.update(dt); },
  draw(r) { r.sky(['#1a1410', '#2a2018', '#3a2a1e']); r.overlay(g => { UI.title(g, 'WARM-UP', r.W / 2, 20, 3); Cutscene.rigOf('marge').drawPortrait(g, r.W / 2 - 20, 54, 40, { zoom: 2.6, turn: .3, bg: '#2a1a14' }); E.font.text(g, '"Lace up. Three drills, then we play."', r.W / 2, 98, '#eef4ff', { align: 'center', outline: false }); this.menu.draw(g, r); UI.legend(g, r, [['confirm', 'SELECT']]); }); }
};
/** the pre-game card (12.6): the matchup, the arena, the objectives with star slots, the tactic chosen; ✕ FACE OFF */
scenes.pregame = {
  enter(d) { this.n = d.n; Synth.music('menu'); this.t = 0; },
  update(dt) { this.t += dt; if (this.t > .4 && (UI.anyP('confirm') || UI.anyP('pass') || game.input.clicked())) { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); game.go('match', { cfg: Story.matchCfg(this.n) }, { fade: 'iris' }); } if (UI.anyP('cancel')) game.go('storymap', { chapter: this.n }); },
  draw(r) {
    const c = Story.ch(this.n), f = Save.data.choices[this.n] || {}, tac = f.tactic ? (f.tactic === 'grit' ? 'MEAN AND LOUD' : 'CLEAN AND FAST') : f.lou ? (f.lou === 'loose' ? 'LOU IS LOOSE' : 'KEEP IT ON THE ICE') : f.bear ? (f.bear === 'hunt' ? 'HUNT THE BEAR' : 'IGNORE THE BEAR') : f.doris ? (f.doris === 'early' ? 'DORIS PLAYS EARLY' : 'DORIS PLAYS LATE') : '';
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    r.overlay(g => {
      E.font.text(g, 'CHAPTER ' + c.n, r.W / 2, 8, UI.MUTED, { align: 'center', outline: false });
      UI.title(g, c.title, r.W / 2, 18, 3);
      Logo.draw(g, 'muskrats', r.W / 2 - 110, 54, 64); Logo.draw(g, c.rival, r.W / 2 + 46, 54, 64);
      E.font.title(g, 'VS', r.W / 2, 74, { align: 'center', scale: 3 });
      E.font.text(g, TEAMS.muskrats.short, r.W / 2 - 78, 122, TEAMS.muskrats.trim, { align: 'center', outline: '#000' }); E.font.text(g, TEAMS[c.rival].short, r.W / 2 + 78, 122, TEAMS[c.rival].trim, { align: 'center', outline: '#000' });
      E.font.text(g, ARENAS[c.arena].name + '  ·  3 x ' + U.mmss(c.periodLen) + (c.ot === 'none' ? '  ·  NO OT, THEN THE SHOOTOUT SHOWCASE' : ''), r.W / 2, 136, '#cfe0f4', { align: 'center', outline: false });
      Objectives.list(c.objectives).forEach((o, k) => E.font.text(g, ((Save.data.stars[c.n] || [])[k] ? '★ ' : '☆ ') + o.text, r.W / 2, 152 + k * 11, (Save.data.stars[c.n] || [])[k] ? UI.GOLD : '#eef4ff', { align: 'center', outline: false }));
      if (tac) E.font.text(g, 'TACTIC: ' + tac, r.W / 2, 190, '#7ad87a', { align: 'center', outline: false });
      E.font.text(g, c.spotlight, r.W / 2, 202, UI.MUTED, { align: 'center', font: 'tiny', outline: false });
      Glyphs.text(g, '{confirm} FACE OFF!      {cancel} BACK', r.W / 2, r.H - 16, { align: 'center', color: UI.GOLD });
    });
  }
};
