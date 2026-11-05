/* ---- STORY MODE: The Grand Kerfuffle. Progress (chapter reached, stars per chapter, tea treats, best results) goes
 * through game.saves' autosave slot, written after each chapter's result and on the story map; Continue loads
 * saves.latest(). The county map: five grounds on a road (an E.Path) with the minibus driving between them and three
 * stars a chapter. Cutscenes: a three-quarter vignette with posed rigs and a Dialog with portraits and markup,
 * skippable with a held confirm (a ring fills over 1 s). A loss offers Retry, Retry on Village difficulty, or the Map. ---- */
const Story = {
  data: null,
  fresh() { return { chapter: 1, stars: {}, best: {}, treats: [], done: false, lessons: {} }; },
  newGame() { this.data = this.fresh(); this.save(); },
  latest() { try { const s = game.saves.latest(); return s && s.data ? s : null; } catch (e) { return null; } },
  load() { const s = this.latest(); this.data = s && s.data ? Object.assign(this.fresh(), s.data) : this.fresh(); return this.data; },
  save() { try { game.saves.autosave(); } catch (e) { /* storage blocked: kept for the visit */ } },
  ch(n) { return CHAPTERS[n - 1]; },
  /** the MatchConfig for chapter n */
  config(n, village) {
    const c = this.ch(n), cfg = { mode: 'story', chapter: n, teams: ['ker', c.opp], ground: c.ground, overs: c.overs, wickets: c.wickets, difficulty: village ? 'village' : K.settings('difficulty'), kerfuffleRules: c.kerfuffle,
      humans: { 0: [game.input] }, toss: false, battingFirst: c.battingFirst || 0, scenario: c.scenario ? Object.assign({}, c.scenario) : null, timeOfDay: c.time || null, weather: c.weather || null, tutorial: !!c.tutorial };
    return cfg;
  },
  /** play chapter n: the pre scene, the Nets lessons it teaches (first time), the match with its beats, the result */
  play(n, village) {
    const c = this.ch(n), lessons = (c.lessons || []).filter(l => !this.data.lessons[l]);
    const toMatch = () => this.match(n, village);
    const afterPre = () => lessons.length ? game.go('nets', { lessons, then: toMatch, story: true }) : toMatch();
    game.go('cutscene', { scene: c.pre, then: afterPre });
  },
  match(n, village) {
    const c = this.ch(n), cfg = this.config(n, village), beats = [];
    beats.push({ scene: c.mid, when: m => n === 4 ? m.phase === 'rainDelay' && m.pt > .5 : m.innNo === 1 && m.phase === 'setup' && m.inn.balls === 0 && m.pt > .3 });
    if (n === 4) cfg.forceRain = true;
    game.go('match', { cfg, hooks: { beats, onEnd: (m, r) => this.result(n, m, r, village), extra: this.extraFor(n) } });
  },
  /** chapter-specific match rules: the rain delay at Dustbowl Downs, the Thrumptonator's boss over, goal flags */
  extraFor(n) {
    const flags = {};
    return {
      pre(dt, m) {
        if (n === 4 && m.innNo === 1 && m.phase === 'between' && m.inn.balls === 3 && !flags.rain) { flags.rain = true; m.cur.overEnd = false; m.startChaos('rain'); }
        if (n === 5 && m.innNo === 1 && m.phase === 'setup' && m.inn.balls === (m.inn.overs - 1) * 6 && !flags.boss) { flags.boss = true; flags.bossWk = m.inn.wkts; m.cfg.forceBowler = 'machine'; m.setBowler('machine'); }
        if (n === 5 && flags.boss && m.innNo === 1) m.flags.bossClean = m.inn.wkts === flags.bossWk && (m.inn.done || m.inn.balls >= m.inn.overs * 6);
      },
      step(dt, m) { if (n === 3 && m.innNo === 1 && !m.chaos.some(c => c.id === 'tide') && m.phase === 'setup' && !flags.tide) { flags.tide = true; m.startChaos('tide'); } }
    };
  },
  result(n, m, r, village) {
    const c = this.ch(n), won = !!r.won;
    const stars = c.goals.map(([label, f]) => [label, !!f(m, r)]);
    r.stars = stars;
    const prev = this.data.stars[n] || [false, false, false]; this.data.stars[n] = prev.map((s, i) => s || stars[i][1]);
    if (won) { this.data.chapter = Math.max(this.data.chapter, n + 1); if (n === 5) this.data.done = true; Profile.unlock(c.opp); }
    this.data.best[n] = Math.max(this.data.best[n] || 0, stars.filter(s => s[1]).length);
    this.save();
    const next = won ? () => game.go('cutscene', { scene: c.win, then: () => n === 5 ? game.go('about', { ending: true }) : game.go('storymap') }) : () => game.go('cutscene', { scene: 'loss', then: () => game.go('storymap', { retry: n }) });
    game.go('results', { m, r, onContinue: next, continueLabel: 'CONTINUE' });
    void village;
  }
};
game.saves.write = () => ({ data: Story.data || Story.fresh(), place: Story.data ? (CHAPTERS[Math.min(5, Story.data.chapter) - 1] || CHAPTERS[4]).title : 'The Grand Kerfuffle', level: Story.data ? Math.min(5, Story.data.chapter) : 1 });
game.saves.read = s => { Story.data = Object.assign(Story.fresh(), s && s.data); };
/* ---- the county map ---- */
const MAP_PINS = [[70, 150], [150, 92], [240, 138], [320, 80], [400, 120]];
scenes.storymap = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    if (!Story.data) Story.load();
    Story.save(); Audio.music('map'); Idle.reset(); this.t = 0;
    this.sel = Math.min(5, Story.data.chapter) - 1; this.bus = this.sel; this.retry = d && d.retry ? d.retry : null;
    this.path = new E.Path(MAP_PINS.map(p => [p[0], p[1], 0]), { smooth: 'catmull' });
    this.menu = null;
  },
  update(dt) {
    this.t += dt; const I = game.input, open = Math.min(5, Story.data.chapter);
    if (Idle.step(dt) > 10 && !this.menu) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    this.bus = approach(this.bus, this.sel, dt * 1.5);
    if (this.menu) { this.menu.update(dt, I); return; }
    if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { this.sel = Math.min(open - 1, this.sel + 1); K.sfx('select'); }
    if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { this.sel = Math.max(0, this.sel - 1); K.sfx('select'); }
    const L = this.layout, p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (L) for (let i = 0; i < open; i++) { const [x, y] = L.pin(i); if (p && hyp(p[0] - x, p[1] - y) < 12 && I.mouse && I.clock - I.mouse.t < .05) this.sel = i; if (c && hyp(c[0] - x, c[1] - y) < 14) { this.sel = i; this.openMenu(); } }
    if (I.pressed('confirm')) { I.consume('confirm'); this.openMenu(); }
    if (I.pressed('cancel')) { I.consume('cancel'); game.go('title'); }
  },
  openMenu() {
    const n = this.sel + 1, played = Story.data.stars[n];
    this.menu = new UIList({ w: 180, rowH: 16, y: 160, onBack: () => { this.menu = null; }, items: [
      { label: played ? 'REPLAY' : 'PLAY', act: () => Story.play(n, false) },
      { label: 'RETRY ON VILLAGE', hidden: () => this.retry !== n, act: () => Story.play(n, true), help: 'The same match at Village difficulty.' },
      { label: 'BACK', act: () => { this.menu = null; } }
    ] });
    K.sfx('confirm');
  },
  back() { if (this.menu) { this.menu = null; return true; } game.go('title'); return true; },
  draw(r) {
    const W = r.W, H = r.H, sx = W / 470, sy = H / 240, k = Math.min(sx, sy), ox = (W - 470 * k) / 2, oy = (H - 240 * k) / 2;
    const pin = i => [ox + MAP_PINS[i][0] * k, oy + MAP_PINS[i][1] * k]; this.layout = { pin };
    r.sky(['#7ab0d8', '#a8d0e8', '#c8e0d0']);
    r.overlay(g => {
      // the painted county: fields, hedgerows, a river, the sea at Sunburnt Bay
      px.rect(g, 0, 0, W, H, '#8ab86a');
      const rnd = E.rng(5); for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * H, w = 30 + rnd() * 60, h = 20 + rnd() * 40; px.rect(g, x, y, w, h, ['#7aa85a', '#9ac87a', '#a8b86a', '#c8c070'][i % 4]); px.rect(g, x, y, w, 1, '#4a7a3a'); px.rect(g, x, y, 1, h, '#4a7a3a'); }
      for (let x = 0; x < W; x += 2) { const y = H * .7 + Math.sin(x * .03) * 12; px.rect(g, x, y, 2, 3, '#5a9ad0'); }
      px.rect(g, ox + 438 * k, 0, 14 * k, H, '#e8d8a0'); px.rect(g, ox + 448 * k, 0, W, H, '#5aa8e0'); px.ell(g, ox + 240 * k, oy + 196 * k, 46 * k, 22 * k, '#e8d8a0'); px.ell(g, ox + 240 * k, oy + 200 * k, 40 * k, 18 * k, '#5aa8e0');
      for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H; px.disc(g, x, y, 4, '#3a7a32'); px.disc(g, x - 1, y - 1, 3, '#5a9a4a'); }
      // the road and the minibus
      for (let d = 0; d < this.path.length; d += 3) { const p = this.path.at(d); px.rect(g, ox + p.x * k - 1, oy + p.y * k - 1, 3, 3, '#c8b088'); }
      const open = Math.min(5, Story.data.chapter);
      for (let i = 0; i < 5; i++) {
        const [x, y] = pin(i), c = CHAPTERS[i], on = i === this.sel, locked = i >= open, st = Story.data.stars[i + 1] || [];
        px.disc(g, x, y, on ? 9 : 7, '#1a1a1a'); px.disc(g, x, y, on ? 8 : 6, locked ? '#6a6a6a' : TEAMS[c.opp].chip);
        if (on) UI.ball(g, x, y - 16, this.t);
        UI.text(g, String(i + 1), x + 1, y - 3, '#ffffff', { align: 'center' });
        for (let s = 0; s < 3; s++) UI.text(g, '★', x - 9 + s * 7, y + 9, st[s] ? '#ffd36a' : '#3a3a3a', { font: 'default' });
      }
      const bi = Math.floor(this.bus), bf = this.bus - bi, a = pin(bi), b = pin(Math.min(4, bi + 1)), bx = lerp(a[0], b[0], bf), by = lerp(a[1], b[1], bf) - 10 + Math.abs(Math.sin(this.t * 8)) * -1;
      px.rect(g, bx - 9, by - 4, 18, 8, '#2f6b3a'); px.rect(g, bx - 9, by - 4, 18, 3, '#efe4c8'); px.rect(g, bx - 6, by - 3, 4, 2, '#9fd8f0'); px.rect(g, bx, by - 3, 4, 2, '#9fd8f0'); px.disc(g, bx - 5, by + 4, 2, '#1a1a1a'); px.disc(g, bx + 5, by + 4, 2, '#1a1a1a');
      // the chapter card
      const c = CHAPTERS[this.sel], G2 = GROUNDS[c.ground];
      UI.panel(g, 8, 8, Math.min(220, W - 16), 54);
      UI.text(g, 'CHAPTER ' + c.n + ': ' + c.title.toUpperCase(), 14, 14, UI.gold);
      UI.text(g, TEAMS[c.opp].name + ' at ' + G2.name, 14, 26, '#ffffff', { font: 'tiny' });
      c.goals.forEach(([label], i) => { const s = (Story.data.stars[c.n] || [])[i]; UI.text(g, (s ? '★ ' : '- ') + label, 14, 36 + i * 8, s ? '#ffd36a' : '#c8c0a8', { font: 'tiny' }); });
      E.font.title(g, 'THE GRAND KERFUFFLE', W / 2, H - 34, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#c8a040'], depth: 1 });
      if (this.menu) { this.menu.y = Math.round(H / 2); this.menu.draw(g, r); }
      UI.footer(g, r, game.input, this.menu ? [['confirm', 'SELECT'], ['cancel', 'BACK']] : [['left', 'CHAPTER'], ['confirm', 'PLAY'], ['cancel', 'TITLE']]);
    });
  }
};
/* ---- cutscenes ---- */
const PLACES = { green: { ground: 'green', at: [0, -560], sky: ['#ffb870', '#ffd8a0', '#fff0c8'], amb: .82 }, hall: { ground: 'hall', at: [-60, -530], peacock: [40, -510], sky: ['#9aa6b4', '#b8c2cc', '#cfd6dc'], amb: .8 }, bay: { ground: 'bay', at: [300, -420], sky: ['#3fb8ff', '#7fd4ff', '#bff0ff'], amb: .95 }, downs: { ground: 'downs', at: [300, -480], sky: ['#ffcf8a', '#ffe0b0', '#fff0d0'], amb: .85 }, dome: { ground: 'dome', at: [0, 820], sky: ['#05050f', '#0a0a1e', '#141030'], amb: .5 } };
scenes.cutscene = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    d = Object.assign({}, d);
    if (!SCENES[d.scene]) { d.scene = 'prologue'; if (!d.then && !d.next) d.next = { scene: 'title' }; }   // opened by a bare link: the prologue, then the title
    this.d = d; const S = SCENES[d.scene]; this.S = S; this.t = 0; this.hold = 0; this.done = false;
    K.game.setView(Views.v.story); Audio.music(S.place === 'dome' ? 'dome' : 'tea');
    const P = PLACES[S.place] || PLACES.green; this.P = P;
    this.cast = S.cast.map((id, i) => ({ id, rig: Cast.portraitOf((SPEAKERS[id] || {}).rig || id), x: P.at[0] + (i - (S.cast.length - 1) / 2) * 30, y: P.at[1] + (i % 2) * 10 }));
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', voice: null, bg: '#10201a', border: '#e8c060' });
    const lines = S.lines.slice(), next = () => {
      const l = lines.shift(); if (!l) { this.finish(); return; }
      const sp = SPEAKERS[l[0]] || SPEAKERS.aubrey; this.speaker = l[0];
      this.talk.say(l[1], { name: sp.name, portrait: Cast.portraitOf(sp.rig), portraitOpts: { zoom: 3, turn: .4 }, onDone: next }); Voice.say(l[1], sp.voice);
    };
    next();
    if (d.scene === 'prologue' || d.scene.endsWith('pre')) Audio.sting('chapter');
  },
  finish() { if (this.done) return; this.done = true; const d = this.d; if (d.then) d.then(); else if (d.next) game.go(d.next.scene, d.next.data || {}); else game.go('storymap'); },
  update(dt) {
    this.t += dt; const I = game.input, B = Ground.get(this.P.ground);
    if (I.down('confirm') || I.down('shot')) { this.hold += dt; if (this.hold >= 1) { this.talk.close(); this.finish(); return; } } else this.hold = 0;
    this.talk.update(dt);
    for (const c of this.cast) { const talking = this.speaker === c.id; c.rig._talk = talking && this.talk.open; c.rig.update(dt, { x: B.OX + c.x, y: B.OY + c.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t * .3 + c.x) * .2, expr: talking ? (c.id === 'thrumpton' ? 'angry' : 'smile') : null, pose: c.id === 'crumb' && talking ? 'hips' : null }); }
  },
  draw(r) {
    const B = Ground.get(this.P.ground), P = this.P, g = game;
    g.lights.enabled = true; g.lights.ambient = P.amb;
    r.sky(P.sky); B.map.drawFloor(r); B.map.queueWalls(r);
    for (const [id, x, y, f] of GROUNDS[P.ground].props) K.drawProp(r, id, B.OX + x, B.OY + y, f);
    for (const t of GROUNDS[P.ground].targets) if (t.shape) r.shape(t.shape, B.OX + t.at[0], B.OY + t.at[1], 0, { facing: t.face || 0 });
    if (this.S.props && this.S.props.includes('minibus')) r.shape('KERFUFFLE:minibus', B.OX + P.at[0] - 90, B.OY + P.at[1] + 20, 0, { facing: 0 });
    if (P.peacock) r.shape('KERFUFFLE:peacock', B.OX + P.peacock[0], B.OY + P.peacock[1], 0, { facing: Math.PI / 2 + Math.sin(game.time * .4) * .6 });
    if (this.S.props && this.S.props.includes('phantomCar')) r.shape('KERFUFFLE:phantomCar', B.OX + P.at[0] + 80, B.OY + P.at[1] + 30, 0, { facing: Math.PI });
    r.shape('KERFUFFLE:teaUrn', B.OX + P.at[0] - 60, B.OY + P.at[1] - 16, 0); r.shape('KERFUFFLE:cakeStand', B.OX + P.at[0] - 72, B.OY + P.at[1] - 16, 0); r.shape('KERFUFFLE:teapot', B.OX + P.at[0] - 48, B.OY + P.at[1] - 16, 0);
    if (P.ground === 'dome') { for (const [fx, fy] of [[-820, -380], [820, -380], [-820, 720], [820, 720]]) g.lights.add(B.OX + fx, B.OY + fy, 220, 1100, .75, { color: '#fff4dc' }); }
    for (const c of this.cast) { r.shadow(B.OX + c.x, B.OY + c.y, 5, .35); r.actor(B.OX + c.x, B.OY + c.y, 0, (gg, ox, oy) => c.rig.draw(gg, ox, oy, r.view), c.id === 'ghost' ? { alpha: .6 } : {}); }
    g.focus(B.OX + P.at[0], B.OY + P.at[1], 10);
    this.talk.draw(r);
    r.overlay(gg => { if (this.hold > 0) { const k = this.hold; for (let a = 0; a < TAU * k; a += .15) px.dot(gg, r.W - 20 + Math.cos(a - Math.PI / 2) * 8, 20 + Math.sin(a - Math.PI / 2) * 8, '#ffd36a'); } Glyphs.row(gg, r.W - 34, 32, game.input, [['confirm', 'HOLD TO SKIP']], { align: 'right', color: '#c8c0a8' }); if (this.d.scene === 'prologue' && this.t < 3) E.font.title(gg, 'THE GRAND KERFUFFLE', r.W / 2, 30, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#c8a040'], depth: 1 }); });
  }
};
K.Story = Story;
