/* ---- THE MODES: the Mega Cup (its hub, saves, CONTINUE), story scenes, joining, Exhibition setup, results, the
 * Training Ground's list, the credits ---- */
const Cup = TT.Cup = {
  s: null,
  fresh() { return { round: 0, results: [null, null, null, null], trained: false, losses: 0, seed: TT.newSeed() & 0xffff }; },
  saved() { if (SESSION) return null; try { const s = TT.game.saves.get('auto'); return s && s.data && s.place === 'MEGA CUP' && s.data.round < 4 ? s.data : null; } catch (e) { return null; } },
  save() { if (SESSION || TT.noStore) return; try { TT.game.saves.save('auto', { data: this.s, place: 'MEGA CUP', level: this.s.round + 1 }); } catch (e) { TT.game.fail('cup save', e); } },
  start() { this.s = this.fresh(); this.save(); TT.game.go('story', { node: 'prologue', after: 'prologue' }); },
  continue() { const d = this.saved(); this.s = d ? Object.assign(this.fresh(), d) : this.fresh(); TT.game.go('cup'); },
  playNext() { const R = TT.CUP[this.s.round]; TT.game.go('story', { node: R.pre, after: 'join', home: 'mud', away: R.opp, venue: R.venue }); },
  matchData(seats) { const R = TT.CUP[this.s.round]; return { home: 'mud', away: R.opp, venue: R.venue, cup: this.s.round, seed: TT.seedNext || (this.s.seed * 31 + this.s.round * 7 + this.s.losses), seats }; },
  /** a cup match is over: a win moves the cup on (saved); a loss offers CONTINUE */
  matchDone(res) {
    if (!this.s) this.s = this.fresh();
    if (res.winner === 0) { this.s.results[this.s.round] = res.score.slice(); this.s.round++; this.save(); if (this.s.round >= 4) { TT.unlock('cup'); TT.unlock('meg'); } return true; }
    this.s.losses++; this.save(); return false;
  },
  state() { return this.s ? { round: this.s.round, results: this.s.results.slice(), trained: this.s.trained } : null; }
};
TT.scenes.cup = Object.assign({}, FRONT, {
  enter() {
    if (!Cup.s) Cup.s = Cup.saved() || Cup.fresh();
    BG.ensure(); TT.sound.music('title'); Idle.t = 0; this.sheet = false; this.sel = 0;
    const done = Cup.s.round >= 4;
    this.menu = new UI.BigMenu([
      { label: done ? 'CUP WON!' : 'PLAY ' + TT.CUP[Cup.s.round].round, desc: done ? 'The Mega Cup is in the Muddy Duck\'s trophy cabinet.' : 'Against the ' + TT.TEAMS[TT.CUP[Cup.s.round].opp].name + ' at ' + TT.VENUES[TT.CUP[Cup.s.round].venue].name + '.', disabled: done, fn: () => Cup.playNext() },
      { label: 'TRAINING', desc: 'Coach Gristle\'s drills.', fn: () => TT.game.go('training', { cup: true }) },
      { label: 'TEAM SHEET', desc: 'The Mudlarks: seven people and a dream.', fn: () => { this.sheet = true; this.sel = 0; } },
      { label: 'BACK', desc: 'To the main menu. The cup is saved.', fn: () => TT.game.go('menu') }
    ], { onBack: () => TT.game.go('menu') });
    this.rigs = TT.TEAMS.mud.roster.map(d => TT.makeRig(d, TT.TEAMS.mud.home));
  },
  update(dt) {
    BG.update(dt); if (TT.game.paused) return;
    for (const rg of this.rigs) rg.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2 });
    const I = TT.game.input;
    if (this.sheet) {
      if (I.repeat('right', .3, .1)) this.sel = (this.sel + 1) % 7; if (I.repeat('left', .3, .1)) this.sel = (this.sel + 6) % 7;
      const ck = I.clicked(); if (ck && this.sheetRects) this.sheetRects.forEach((rc, i) => { if (UI.inRect(ck, rc)) this.sel = i; });
      const pt = I.pointer(); if (pt && this.sheetRects) this.sheetRects.forEach((rc, i) => { if (UI.inRect(pt, rc)) this.sel = i; });
      if (I.pressed('cancel')) { this.sheet = false; I.consumeAll(); }
      return;
    }
    this.menu.update(I, TT.game);
  },
  draw(r) {
    BG.draw(r, .6);
    r.overlay(g => {
      FONT.title(g, 'THE MEGA CUP', r.W / 2, 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#e0662a'], depth: 2 });
      if (this.sheet) return this.drawSheet(g, r);
      // the bracket: four big cards
      const w = Math.min(96, (r.W - 40) / 4), gap = 6, x0 = r.W / 2 - (4 * w + 3 * gap) / 2, y = 40;
      TT.CUP.forEach((R, i) => {
        const x = x0 + i * (w + gap), res = Cup.s.results[i], next = i === Cup.s.round, locked = i > Cup.s.round;
        UI.panel(g, x, y, w, 74, { focus: next, alpha: locked ? .6 : .92 });
        UI.txt(g, R.round, x + w / 2, y + 4, next ? '#ffe060' : '#c8d0e8', { align: 'center', font: 'tiny' });
        if (!locked) UI.crest(g, R.opp, x + w / 2 - 7, y + 14, 1); else UI.txt(g, '?', x + w / 2, y + 18, '#5a6078', { align: 'center', scale: 2 });
        UI.txt(g, locked ? '???' : TT.TEAMS[R.opp].short, x + w / 2, y + 34, '#ffffff', { align: 'center' });
        UI.txt(g, locked ? '' : TT.VENUES[R.venue].short.toUpperCase(), x + w / 2, y + 45, '#a8b0c8', { align: 'center', font: 'tiny' });
        UI.txt(g, res ? 'WON ' + res[0] + '-' + res[1] : next ? 'NEXT' : 'LOCKED', x + w / 2, y + 58, res ? '#80ff90' : next ? '#ffe060' : '#5a6078', { align: 'center' });
      });
      this.menu.draw(g, r.W / 2, 124, { scale: 2, w: 220 });
      UI.hints(g, r, '{b:confirm} SELECT   {b:cancel} BACK', TT.game.input);
    });
  },
  drawSheet(g, r) {
    const tm = TT.TEAMS.mud, w = Math.min(58, (r.W - 20) / 7 - 4), x0 = r.W / 2 - (7 * (w + 4)) / 2;
    this.sheetRects = [];
    tm.roster.forEach((d, i) => {
      const x = x0 + i * (w + 4), y = 40, on = i === this.sel;
      this.sheetRects.push([x, y, w, 70]);
      UI.panel(g, x, y, w, 70, { focus: on });
      if (TT.cfg.present) this.rigs[i].drawPortrait(g, x + w / 2 - 18, y + 4, 36, { zoom: 2.4, turn: .3, bg: '#203050' });
      UI.txt(g, d.nick.toUpperCase().slice(0, 9), x + w / 2, y + 44, on ? '#ffe060' : '#ffffff', { align: 'center', font: 'tiny' });
      UI.txt(g, TT.ROLE_NAME[d.role], x + w / 2, y + 54, '#a8b0c8', { align: 'center', font: 'tiny' });
    });
    const d = tm.roster[this.sel], y = 120;
    UI.panel(g, r.W / 2 - 150, y, 300, 86);
    UI.txt(g, d.name.toUpperCase() + '  "' + d.nick.toUpperCase() + '"', r.W / 2, y + 6, '#ffe060', { align: 'center' });
    [['SPEED', d.spd], ['POWER', d.pow], ['HANDS', d.hnd], ['KICKING', d.kck], ['TACKLING', d.tkl]].forEach(([k, v], i) => { UI.txt(g, k, r.W / 2 - 130, y + 22 + i * 12, '#c8d0e8'); UI.bar(g, r.W / 2 - 50, y + 22 + i * 12, 170, 8, v / 10, ['#40d0ff', '#ff8040', '#80ff90', '#ffe060', '#e060ff'][i]); });
    UI.hints(g, r, '{b:left}{b:right} PLAYER   {b:cancel} BACK', TT.game.input);
  }
});
/* ---- story scenes: one E.Story node on a staged set, portraits and babble; △ skips ---- */
const SETS = {};
TT.storySet = kind => {
  if (SETS[kind]) return SETS[kind];
  let rows, types, floorTex, legend;
  if (kind === 'pub' || kind === 'tunnel') {
    const W = 24, H = 14; rows = [];
    for (let r = 0; r < H; r++) { let s = ''; for (let c = 0; c < W; c++) s += r === 0 || c === 0 || c === W - 1 ? '#' : r === H - 1 ? 'f' : r === 1 && kind === 'pub' && c > 2 && c < 12 ? 'b' : '.'; rows.push(s); }
    legend = { '#': 1, b: 2, f: 3, '.': { floor: 'f' } };
    types = kind === 'pub' ? { 1: { h: 40, face: 'plaster', beam: '#5a3a22', side: '#d8c098', top: '#6a4a30' }, 2: { h: 16, face: 'plank', side: '#7a4a28', top: '#9a6a3a' }, 3: { h: 6, cut: true, cutH: 3, face: 'plank', side: '#5a3a22', top: '#7a5434' } } : { 1: { h: 56, face: 'stone', side: '#3a3a44', top: '#2a2a30' }, 2: { h: 10, side: '#2a2a30', top: '#3a3a44' }, 3: { h: 4, cut: true, cutH: 2, side: '#2a2a30', top: '#3a3a44' } };
    // dark varnished floorboards running across the room, seams between them, knots here and there
    floorTex = kind === 'pub' ? (x, y) => { const row = Math.floor(y / 7), off = (row * 37) % 50, seam = (y % 7) < 1 || ((x + off) % 50) < 1, n = E.hash2(Math.floor(x / 3), row) * 18 + E.hash2(Math.floor(x), Math.floor(y)) * 8, k = row % 3 === 0 ? 10 : row % 3 === 1 ? 0 : -8; return seam ? [42, 26, 16] : [104 + k + n, 66 + k * .6 + n * .7, 38 + n * .4]; } : (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) * 20; return [40 + n, 40 + n, 46 + n]; };
  }
  SETS[kind] = rows ? new E.TileMap({ rows, legend, types, floorTex, outside: '#0a0806', ao: 5 }) : null;
  return SETS[kind];
};
TT.scenes.story = {
  view: 'threequarter', views: ['threequarter'], input: KEYS, res: 'ps1', expand: true, touch: [], pausable: false, camera: false,
  enter(data) {
    const game = TT.game; this.data = data; this.t = 0; this.done = false;
    const node = TT.STORY[data.node]; this.node = node; (TT.storySeen || (TT.storySeen = {}))[data.node] = true;
    const set = node.set || 'pitch'; this.set = set;
    this.people = {}; this.actors = [];
    const castRig = id => { const c = TT.CAST[id]; return TT.makeRig(c, c.colors, { hat: c.hat || null, outfit: c.outfit || 'shirt' }); };
    const venue = data.venue || (data.node === 'victory' ? 'megadome' : 'muddington');
    this.stadium = set === 'pitch' || set === 'podium' ? Stadium.get(venue, 'mud') : null;
    const place = (who, x, y, f) => {
      const sp = TT.SPEAKERS[who] || who; let rig, name;
      if (Array.isArray(sp)) { const tm = TT.TEAMS[sp[0]], d = tm.roster[sp[1]]; rig = TT.makeRig(d, tm.home); name = d.nick.toUpperCase(); }
      else if (sp === 'choir') { rig = null; name = 'EVERYONE'; }
      else { rig = castRig(sp); name = TT.CAST[sp].name; }
      const a = { who, rig, x, y, z: 0, f, h: 40 };
      if (rig) this.actors.push(a);
      this.people[who] = { name, portrait: rig || ((g, x0, y0, s) => { px.rect(g, x0, y0, s, s, '#3a2a10'); FONT.text(g, '♪', x0 + s / 2, y0 + s / 2 - 4, '#ffe060', { align: 'center', scale: 2 }); }), at: a };
    };
    const indoor = set === 'pub' || set === 'tunnel', cx = indoor ? 192 : G.CX, cy = indoor ? 112 : G.Y0 + 70;
    const booth = new Set(['barry', 'ros', 'choir']);   // the commentators speak from the booth: portraits only
    const who = [...new Set(node.nodes.map(n => n.who))];
    if (set === 'pub' && node.party) for (const extra of ['dave', 'fridge', 'nan', 'gristle']) if (!who.includes(extra)) who.push(extra);
    const stage = who.filter(w => !booth.has(w));
    who.filter(w => booth.has(w)).forEach(w => place(w, -999, -999, 0));
    stage.forEach((w, i) => place(w, cx + (i - (stage.length - 1) / 2) * 36, cy + (i % 2) * 8, PI / 2));
    for (const w of booth) if (this.people[w]) this.actors = this.actors.filter(a => a.who !== w);
    // the extras: the Mudlarks round the pub's tables; both sides lined up on the pitch; the champions on the podium
    if (set === 'pub') { TT.TEAMS.mud.roster.slice(1).forEach((d, i) => { if (i < 6 && !stage.includes(['gravy', 'tiny', 'rocket', 'boots', 'bus', 'wheels'][i])) this.actors.push({ who: 'm' + i, rig: TT.makeRig(d, TT.TEAMS.mud.home), x: [70, 96, 280, 306, 150, 250][i], y: [150, 160, 150, 160, 176, 176][i], z: 0, f: [0, PI, 0, PI, -PI / 2, -PI / 2][i], extra: true, cheer: !!node.party }); }); this.tables = [[83, 154], [293, 154]]; }
    if (set === 'pitch') {
      const home = TT.TEAMS[data.home || 'mud'], away = TT.TEAMS[data.away || 'bad'];
      home.roster.forEach((d, i) => this.actors.push({ who: 'h' + i, rig: TT.makeRig(d, home.home), x: G.CX - 70 - i * 22, y: G.Y0 + 104 + (i % 2) * 6, z: 0, f: 0, extra: true }));
      away.roster.forEach((d, i) => this.actors.push({ who: 'a' + i, rig: TT.makeRig(d, away.away && TT.TEAMS[data.home || 'mud'].home.cloth === away.home.cloth ? away.away : away.home), x: G.CX + 70 + i * 22, y: G.Y0 + 104 + (i % 2) * 6, z: 0, f: PI, extra: true }));
    }
    if (set === 'podium') TT.TEAMS.mud.roster.forEach((d, i) => this.actors.push({ who: 'p' + i, rig: TT.makeRig(d, TT.TEAMS.mud.home), x: G.CX - 96 + i * 32, y: G.Y0 + 96, z: 0, f: PI / 2, extra: true, cheer: true }));
    this.cam = indoor ? { x: cx, y: set === 'pub' ? 86 : cy + 30 } : set === 'podium' ? { x: G.CX, y: G.Y0 + 80 } : { x: G.CX, y: cy + 10 };
    // the stadium's crowd, boards and posts behind a pitch-side scene: the match presentation's own painters
    if (this.stadium) { const P = this.dress = Object.create(TT.Pres.prototype); Object.assign(P, { stadium: this.stadium, t: 0, excite: .5, cheer: data.node === 'victory' ? 99 : 0, cheerTeam: 0, wave: -999, rigs: [], lastScorer: -1 }); const h = TT.TEAMS[data.home || 'mud'], a = TT.TEAMS[data.away || (set === 'podium' ? 'meg' : 'bad')]; this.dressV = { kits: [h.home, a.home], teams: [h, a], phase: 'intro', time: TT.VENUES[venue].time, score: [0, 0], players: [], hazards: [], powerups: [], dir: [1, -1] }; }
    game.setView(set === 'pub' || set === 'tunnel' ? 'threequarter' : 'broadcast');
    game.lights.enabled = true; game.lights.ambient = set === 'tunnel' ? .3 : set === 'pub' ? .55 : .8;
    TT.sound.music(node.music === 'victory' ? 'victory' : node.music || (set === 'pub' ? 'pub' : 'title'));
    this.story = new E.Story(game, { people: this.people, nodes: { main: node.nodes.map(n => Object.assign({}, n)) }, dialog: new E.Dialog(game, { lines: 3, voice: null, border: '#e8c040', bg: '#141420', speed: 40 }) });
    this.story.talk.onLetter = (ch, i, d) => { const id = Object.keys(this.people).find(k => this.people[k].name === d.name); TT.babble.story = true; TT.babble.letter(ch, TT.voiceFor(id || 'player'), i, d._page.join('')); TT.babble.story = false; };
    this.story.run('main', { onDone: () => this.finish() });
    if (data.node === 'victory' || node.party) for (let i = 0; i < 8; i++) game.after(i * .4, () => game.particles.bits(this.cam.x + (i - 4) * 30, this.cam.y, 80, 16, ['#ffe060', '#4aa0e0', '#ffffff', '#ff6a8a']));
  },
  finish() {
    if (this.done) return; this.done = true;
    const d = this.data, game = TT.game;
    if (d.after === 'prologue') { Cup.s.trained = !!this.story.get('train'); Cup.save(); return game.go(this.story.get('train') ? 'training' : 'cup', { cup: true }); }
    if (d.after === 'join') return game.go('join', { mode: 'cup' });
    if (d.after === 'cup') return game.go('cup');
    if (d.after === 'victory') return game.go('story', { node: 'third', after: 'credits' });
    if (d.after === 'credits') return game.go('credits');
    game.go('cup');
  },
  update(dt) {
    const game = TT.game; this.t += dt;
    for (const a of this.actors) {
      const speaking = this.story.talk.open && this.people[a.who] && this.story.talk.name === this.people[a.who].name;
      if (a.rig) a.rig.update(dt, { x: a.x, y: a.y, z: 0, facing: a.f, pose: a.cheer ? (Math.floor(this.t + a.x) % 3 === 0 ? 'cheer' : 'wave') : speaking ? 'hips' : null, expr: speaking && this.story.talk.typing ? 'shout' : a.cheer ? 'smile' : null, run: a.cheer ? .2 : 0 });
      if (a.blob) { a.x = 300 + Math.sin(this.t) * 40; a.blob.update(dt, { walk: 1, flap: .6, look: [Math.cos(this.t), 0] }); }
    }
    if (game.players.some(q => q.pressed('tri'))) { this.story.talk.close(); this.finish(); return; }
    this.story.update(dt);
    game.focus(this.cam.x, this.cam.y, 20);
  },
  draw(r) {
    const set = this.set, t = this.t;
    if (this.stadium) {
      if (this.dress) { this.dress.t += 1 / 60; this.dress.drawSky(r, this.dressV); } else r.sky(TT.VENUES[this.data.venue || 'muddington'].sky);
      this.stadium.map.drawFloor(r); this.stadium.map.queueWalls(r);
      if (this.dress) { this.dress.drawCrowd(r, this.dressV); this.dress.drawBoards(r, this.dressV); this.dress.drawPosts(r, this.dressV); this.dress.drawDressing(r, this.dressV); this.dress.lights(r, this.dressV); }
    } else {
      r.sky(set === 'tunnel' ? ['#040408', '#08080e', '#0e0e16'] : ['#1a120c', '#2a1a10', '#3a2414']);
      const map = TT.storySet(set); map.drawFloor(r); map.queueWalls(r);
      if (set === 'pub') {
        // the Muddy Duck: barrels behind the bar, the pie warmer glowing on it, lanterns, a dartboard, tables and stools
        for (const x of [40, 64, 210, 234]) r.prop('barrel', x, 26, 0, { size: 1.2 });
        r.prop('crate', 340, 40, 0, { size: 1.1 }); r.prop('crate', 352, 52, 0, { size: 1 });
        for (const x of [70, 192, 310]) r.prop('lantern', x, 18, 38, { light: true, anchor: 'top' });
        r.prop('banner', 150, 17, 34, { color: '#4aa0e0' }); r.prop('window', 270, 17, 26, { colors: ['#f0d080', '#80a0d0'] });
        r.queue(110, 24, 16, g => { const [x, y] = r.w(110, 24, 16), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 12, Y - 14, 24, 14, '#3a2a1a'); px.rect(g, X - 10, Y - 12, 20, 9, '#f0a040'); for (let i = 0; i < 3; i++) px.disc(g, X - 6 + i * 6, Y - 6, 2, '#b06a30'); FONT.text(g, 'PIES', X, Y - 21, '#ffe0a0', { align: 'center', font: 'tiny', outline: '#3a1a0a' }); }, { emissive: true });
        r.queue(50, 17, 30, g => { const [x, y] = r.w(50, 17, 30); px.disc(g, Math.round(x), Math.round(y), 6, '#1a1a1a'); px.disc(g, Math.round(x), Math.round(y), 4, '#c83a2a'); px.disc(g, Math.round(x), Math.round(y), 2, '#2a8a3a'); px.dot(g, Math.round(x), Math.round(y), '#f0f0f0'); });
        for (const [tx, ty] of this.tables || []) { r.queue(tx, ty + 7, 0, g => r.box(g, tx - 14, ty - 7, 0, tx + 14, ty + 7, 12, '#8a5a32', '#5a3a1e')); r.queue(tx, ty, 13, g => { const [x, y] = r.w(tx - 4, ty, 13); px.rect(g, Math.round(x), Math.round(y) - 5, 3, 5, '#f0d080'); px.rect(g, Math.round(x) + 6, Math.round(y) - 5, 3, 5, '#e0a040'); }, { bias: 1 }); }
        TT.game.lights.add(110, 30, 20, 60, .9, { color: '#ffb060' });
      }
      if (set === 'tunnel') TT.game.lights.add(this.cam.x + 40, this.cam.y, 40, 70, 1.4, { color: '#fff0c0' });
    }
    if (set === 'podium') {
      // the MEGA CUP: a gaudy golden cup twice a man's height
      r.queue(G.CX, G.Y0 + 110, 0, g => { const [x, y] = r.w(G.CX, G.Y0 + 110, 0), X = Math.round(x), Y = Math.round(y), sh = Math.sin(t * 3) > .7; px.rect(g, X - 12, Y - 10, 24, 10, '#5a2a8a'); px.rect(g, X - 4, Y - 40, 8, 30, '#c8a030'); px.poly(g, [[X - 20, Y - 80], [X + 20, Y - 80], [X + 10, Y - 40], [X - 10, Y - 40]], '#e8c040'); px.rect(g, X - 20, Y - 82, 40, 4, '#fff0a0'); px.rect(g, X - 28, Y - 74, 8, 3, '#e8c040'); px.rect(g, X + 20, Y - 74, 8, 3, '#e8c040'); if (sh) px.rect(g, X - 8, Y - 70, 2, 16, '#ffffff'); FONT.text(g, 'MEGA', X, Y - 66, '#5a2a8a', { align: 'center', font: 'tiny', outline: false }); }, { emissive: true });
      if (Math.floor(t * 3) % 2) TT.game.particles.bits(G.CX + (Math.sin(t * 7) * 150), G.Y0 + 60, 90, 2, ['#ffe060', '#4aa0e0', '#ff6a8a']);
      TT.game.lights.add(G.CX, G.Y0 + 100, 40, 160, 1.2, { color: '#fff0c0' });
    }
    const view = E.charView(r.view);
    for (const a of this.actors) {
      r.shadow(a.x, a.y, 6, .35);
      if (a.rig) r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, view));
      if (a.blob) r.actor(a.x, a.y, 0, (g, ox, oy) => { a.blob.draw(g, ox, oy, r.view); px.poly(g, [[ox - 2, oy - 28], [ox + 2, oy - 28], [ox, oy - 33]], '#e83a2a'); });
      if (a.who === 'unit' && this.story.talk.open) TT.game.lights.add(a.x, a.y, 30, 50, 1.5, { color: '#fff8d8' });
    }
    if (TT.game.lights.enabled && set !== 'tunnel') TT.game.lights.add(this.cam.x, this.cam.y, 40, 260, .6, { color: '#ffe8c0' });
    this.story.draw(r);
    r.overlay(g => UI.prompt(g, '{b:confirm} NEXT   {b:tri} SKIP SCENE', 8, 8, TT.game.input, { bg: 'rgba(0,0,0,.5)' }));
  }
};
/* ---- joining: Start on a pad (or 2 on the keyboard) joins; each seat picks HOME, AWAY or CPU; ✕ ready ---- */
TT.scenes.join = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data || {}; this.cup = this.data.mode === 'cup';
    BG.ensure(); Idle.t = 0;
    const game = TT.game;
    game.allowJoin({ max: 4, onJoin: (input, n) => { TT.applyGlyphs(); this.sides[n - 1] = this.cup ? 0 : (n % 2 === 0 ? 1 : 0); TT.sound.ui('pick'); } });
    this.sides = game.players.map((p, i) => this.cup ? 0 : i % 2);
    this.ready = game.players.map(() => false); this.t = 0;
  },
  exit() { TT.game.allowJoin(false); },
  update(dt) {
    BG.update(dt); const game = TT.game; this.t += dt;
    if (game.paused) return;
    game.players.forEach((q, i) => {
      if (this.sides[i] === undefined) this.sides[i] = this.cup ? 0 : i % 2;
      if (!this.cup) { if (q.pressed('left')) { this.sides[i] = Math.max(0, this.sides[i] === 2 ? 1 : this.sides[i] - 1); this.ready[i] = false; TT.sound.ui('move'); } if (q.pressed('right')) { this.sides[i] = Math.min(2, this.sides[i] + 1); this.ready[i] = false; TT.sound.ui('move'); } }
      if (q.pressed('confirm') || q.pressed('x')) { this.ready[i] = true; TT.sound.ui('pick'); }
      if (q.pressed('cancel') && i === 0 && this.t > .3) { game.go(this.cup ? 'cup' : 'menu'); }
    });
    if (this.sides.slice(0, game.players.length).every(s => s === 2) && game.players.length) this.sides[0] = 0;
    const ck = game.input.clicked();
    if (ck && this.go && UI.inRect(ck, this.go)) this.ready[0] = true;
    if (this.ready[0] && this.t > .3) this.start();
  },
  start() {
    const game = TT.game, seats = [];
    game.players.forEach((q, i) => { const sd = this.sides[i]; if (sd === 2) return; seats.push({ kind: 'local', input: q, team: sd, label: 'P' + (i + 1), color: E.PLAYER_COLORS[i] }); });
    if (!seats.length) seats.push({ kind: 'local', input: game.input, team: 0, label: 'P1', color: E.PLAYER_COLORS[0] });
    TT.joinedSeats = seats;
    if (this.cup) game.go('match', Cup.matchData(seats));
    else game.go('setup', { seats });
  },
  draw(r) {
    BG.draw(r, .6);
    r.overlay(g => {
      const game = TT.game, cx = r.W / 2;
      FONT.title(g, this.cup ? 'MUDLARKS: WHO\'S PLAYING?' : 'WHO\'S PLAYING?', cx, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
      UI.txt(g, 'PRESS START ON A CONTROLLER, OR 2 ON THE KEYBOARD, TO JOIN (UP TO 4)', cx, 34, '#c8d0e8', { align: 'center' });
      const cols = this.cup ? ['MUDLARKS'] : ['HOME', 'AWAY', 'CPU'], cw = 110, x0 = cx - (cols.length * cw) / 2;
      cols.forEach((c, k) => { UI.panel(g, x0 + k * cw + 4, 50, cw - 8, 20, { alpha: .8 }); UI.txt(g, c, x0 + k * cw + cw / 2, 56, '#ffe060', { align: 'center' }); });
      for (let i = 0; i < 4; i++) {
        const q = game.players[i], y = 78 + i * 26;
        if (!q) { UI.txt(g, 'P' + (i + 1) + '  ---  PRESS START', cx, y + 6, '#4a5068', { align: 'center' }); continue; }
        const sd = this.sides[i] || 0, x = x0 + sd * cw + 4, col = E.PLAYER_COLORS[i];
        UI.panel(g, x, y, cw - 8, 22, { border: col, focus: this.ready[i] });
        UI.txt(g, 'P' + (i + 1) + ' ' + (q.device === 'gamepad' || q.lastDevice === 'gamepad' ? 'PAD' : 'KEYS'), x + (cw - 8) / 2, y + 3, col, { align: 'center' });
        UI.txt(g, this.ready[i] ? 'READY!' : this.cup ? '' : '◂ ▸', x + (cw - 8) / 2, y + 12, this.ready[i] ? '#80ff90' : '#a8b0c8', { align: 'center', font: 'tiny' });
      }
      const gw = 120; this.go = [cx - gw / 2, r.H - 52, gw, 22];
      UI.panel(g, this.go[0], this.go[1], gw, 22, { focus: true }); UI.txt(g, 'PLAY', cx, this.go[1] + 4, '#ffe060', { align: 'center', scale: 2 });
      UI.hints(g, r, (this.cup ? '' : '{b:left}{b:right} SIDE   ') + '{b:confirm} READY (P1 STARTS)   {b:cancel} BACK', game.input);
    });
  }
});
/* ---- Exhibition setup: teams, venue, weather, time, halves, sudden death ---- */
TT.scenes.setup = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data; BG.ensure(); Idle.t = 0;
    const teams = TT.TEAM_ORDER.filter(id => id !== 'meg' || TT.unlocked('meg'));
    this.opts = [
      { key: 'home', label: 'HOME', list: teams, i: 0 },
      { key: 'away', label: 'AWAY', list: teams, i: 1 },
      { key: 'venue', label: 'VENUE', list: TT.VENUE_ORDER, i: 0 },
      { key: 'weather', label: 'WEATHER', list: Object.keys(TT.WEATHERS), i: 0 },
      { key: 'time', label: 'TIME', list: ['venue', 'day', 'dusk', 'night'], i: 0 },
      { key: 'halves', label: 'HALVES', list: ['2 min', '3 min', '4 min', '5 min'], i: Math.max(0, ['2 min', '3 min', '4 min', '5 min'].indexOf(TT.game.settings.halves)) },
      { key: 'sudden', label: 'SUDDEN DEATH', list: ['On', 'Off'], i: TT.game.settings.suddenDeath === 'Off' ? 1 : 0 },
      { key: 'play', label: 'PLAY!', list: [''], i: 0 }
    ];
    this.f = new UI.Focus(this.opts.length);
  },
  val(k) { const o = this.opts.find(q => q.key === k); return o.list[o.i]; },
  update(dt) {
    BG.update(dt); const game = TT.game, I = game.input; if (game.paused) return;
    const r = this.f.update(I, game), o = this.opts[this.f.i];
    let d = 0; for (const q of game.players) { if (q.repeat('left', .3, .1)) d = -1; if (q.repeat('right', .3, .1)) d = 1; }
    const ck = I.clicked(); if (ck && this.arrows) this.arrows.forEach(([rc, k, dd]) => { if (UI.inRect(ck, rc)) { this.f.i = k; d = dd; } });
    if (d && o.list.length > 1) { o.i = (o.i + d + o.list.length) % o.list.length; TT.sound.ui('move'); }
    if (r.picked && o.key === 'play') this.play();
    else if (r.picked) { o.i = (o.i + 1) % o.list.length; }
    if (r.back) game.go('join', { mode: 'exhibition' });
  },
  play() {
    const v = k => this.val(k), venue = v('venue'), game = TT.game;
    game.settings.set('halves', v('halves')); game.settings.set('suddenDeath', v('sudden'));
    game.go('match', { home: v('home'), away: v('away'), venue, weather: v('weather'), time: v('time') === 'venue' ? null : v('time'), seats: this.data.seats, exhibition: true, sudden: v('sudden') === 'On' });
  },
  draw(r) {
    BG.draw(r, .6);
    r.overlay(g => {
      const cx = r.W / 2;
      FONT.title(g, 'EXHIBITION', cx, 6, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      // the two team cards: crest, name, three bars
      for (const t of [0, 1]) {
        const id = this.val(t ? 'away' : 'home'), tm = TT.TEAMS[id], x = t ? cx + 6 : cx - 146, y = 34, on = this.f.i === t;
        UI.panel(g, x, y, 140, 62, { focus: on });
        UI.crest(g, id, x + 6, y + 6, 2);
        UI.txt(g, t ? 'AWAY' : 'HOME', x + 40, y + 4, '#a8b0c8', { font: 'tiny' });
        FONT.wrap(tm.name, 96).forEach((l, i) => UI.txt(g, l, x + 40, y + 12 + i * 9, on ? '#ffe060' : '#ffffff'));
        TT.teamBars(id).forEach((v, i) => { UI.txt(g, ['SPD', 'POW', 'SKL'][i], x + 40, y + 34 + i * 8, '#a8b0c8', { font: 'tiny' }); UI.bar(g, x + 58, y + 34 + i * 8, 76, 5, v, ['#40d0ff', '#ff8040', '#80ff90'][i]); });
        if (on) { UI.txt(g, '◂', x - 8, y + 26, '#ffe060'); UI.txt(g, '▸', x + 143, y + 26, '#ffe060'); }
      }
      this.f.rects = [[cx - 146, 34, 140, 62], [cx + 6, 34, 140, 62]];
      this.arrows = [];
      const rowY = 104, labels = { venue: k => TT.VENUES[k].name, weather: k => TT.WEATHERS[k].label, time: k => k === 'venue' ? 'VENUE DEFAULT' : TT.TIMES[k].label, halves: k => k.toUpperCase(), sudden: k => k.toUpperCase(), play: () => '' };
      this.opts.slice(2).forEach((o, k) => {
        const i = k + 2, y = rowY + k * 17, on = this.f.i === i, w = 260, x = cx - w / 2;
        this.f.rects[i] = [x, y, w, 15];
        UI.panel(g, x, y, w, 15, { focus: on, alpha: .85 });
        if (o.key === 'play') { UI.txt(g, 'PLAY!', cx, y + 4, on ? '#ffe060' : '#ffffff', { align: 'center' }); return; }
        UI.txt(g, o.label, x + 8, y + 4, '#a8b0c8');
        UI.txt(g, '◂ ' + labels[o.key](o.list[o.i]) + ' ▸', x + w - 8, y + 4, on ? '#ffe060' : '#ffffff', { align: 'right' });
        this.arrows.push([[x + w - 120, y, 20, 15], i, -1], [[x + w - 20, y, 20, 15], i, 1]);
      });
      UI.hints(g, r, '{b:up}{b:down} CHOOSE   {b:left}{b:right} CHANGE   {b:confirm} PLAY   {b:cancel} BACK', TT.game.input);
    });
  }
});
/* ---- results: the score with crests, the Player of the Match, four tiles, records (initials), CONTINUE ---- */
TT.scenes.results = Object.assign({}, FRONT, {
  enter(res) {
    this.res = res; this.t = 0; BG.ensure(res.venue, res.home, res.away, 'night');
    const human = res.humanTeam, won = res.winner === human;
    TT.sound.music(null); TT.sound.sting(won ? 'win' : res.winner < 0 ? 'lose' : 'lose');
    this.rig = TT.makeRig(TT.TEAMS[res.potm.team === 0 ? res.home : res.away].roster[res.potm.slot], TT.TEAMS[res.potm.team === 0 ? res.home : res.away].home);
    this.cupWon = res.cup !== undefined ? Cup.matchDone(res) : null;
    // records: any qualifying number opens the initials wheel (never in a demo)
    this.entries = [];
    if (!res.data.attract) for (const mode of ['margin', 'tries', 'hit']) { const v = mode === 'margin' ? (won ? res.records.margin : 0) : res.records[mode]; if (v > 0 && TT.arcade.qualifies(v, mode)) this.entries.push([mode, v]); }
    this.next();
  },
  next() {
    const e = this.entries.shift();
    if (e) TT.arcade.enter(e[1], e[0], () => this.next());
  },
  update(dt) {
    this.t += dt; BG.update(dt);
    this.rig.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, expr: 'smile' });
    TT.arcade.update(dt);
    if (TT.arcade.entry || TT.arcade.continuing) return;
    const game = TT.game;
    if (this.t > 1 && (game.players.some(q => q.pressed('confirm') || q.pressed('x') || q.pressed('start')) || game.input.clicked())) { game.input.consumeAll(); this.leave(); }
  },
  leave() {
    const res = this.res, game = TT.game;
    if (res.cup !== undefined) {
      if (this.cupWon) { const R = TT.CUP[res.cup]; return game.go('story', { node: R.won, after: res.cup === 3 ? 'victory' : 'cup', venue: R.venue }); }
      // a loss: Rule Six, then CONTINUE? (10 s)
      return game.go('story', { node: 'lost', after: 'continue' });
    }
    game.go('menu');
  },
  draw(r) {
    BG.draw(r, .65);
    const res = this.res;
    r.overlay(g => {
      const cx = r.W / 2, w = res.winner;
      const head = w < 0 ? 'A DRAW!' : TT.TEAMS[w === 0 ? res.home : res.away].short + ' WIN!';
      FONT.title(g, head, cx, 8, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      UI.crest(g, res.home, cx - 110, 40, 2); UI.crest(g, res.away, cx + 82, 40, 2);
      UI.txt(g, res.score[0] + '  -  ' + res.score[1], cx, 48, '#ffffff', { align: 'center', scale: 3 });
      UI.txt(g, TT.TEAMS[res.home].short, cx - 96, 76, '#c8d0e8', { align: 'center' }); UI.txt(g, TT.TEAMS[res.away].short, cx + 96, 76, '#c8d0e8', { align: 'center' });
      // the player of the match
      UI.panel(g, cx - 120, 88, 240, 44);
      if (TT.cfg.present) this.rig.drawPortrait(g, cx - 116, 92, 36, { zoom: 2.4, turn: .35, bg: '#203050' });
      UI.txt(g, 'PLAYER OF THE MATCH', cx - 74, 92, '#ffe060');
      UI.txt(g, res.potm.nick.toUpperCase(), cx - 74, 102, '#ffffff');
      UI.txt(g, res.potm.line, cx - 74, 112, '#a8b0c8', { font: 'tiny' }); UI.txt(g, res.potm.line2, cx - 74, 120, '#a8b0c8', { font: 'tiny' });
      // four tiles
      const tw = Math.min(96, (r.W - 30) / 4);
      res.tiles.forEach(([k, v], i) => { const x = cx - 2 * (tw + 4) + i * (tw + 4); UI.panel(g, x, 140, tw, 36, { alpha: .9 }); UI.txt(g, k, x + tw / 2, 144, '#a8b0c8', { align: 'center', font: 'tiny' }); UI.txt(g, v, x + tw / 2, 156, '#ffffff', { align: 'center' }); });
      if (res.cup !== undefined && this.cupWon === false) UI.txt(g, 'NOT TODAY. THE CUP WAITS.', cx, 186, '#ff9080', { align: 'center' });
      if (!TT.arcade.entry) UI.hints(g, r, '{b:confirm} CONTINUE', TT.game.input);
    });
    TT.arcade.draw(r);
  }
});
/* the loss: Gristle's Rule Six, then CONTINUE? counts down; yes replays the round with a new seed, no is the cup hub */
const contScene = Object.assign({}, FRONT, {
  enter() { BG.ensure(); TT.arcade.continue(10, yes => { if (yes) { Cup.s.seed = TT.newSeed() & 0xffff; TT.game.go('match', Cup.matchData(TT.joinedSeats || [{ kind: 'local', input: TT.game.input, team: 0, label: 'P1', color: E.PLAYER_COLORS[0] }])); } else TT.game.go('cup'); }); },
  update(dt) { BG.update(dt); TT.arcade.update(dt); },
  draw(r) { BG.draw(r, .7); TT.arcade.draw(r); r.overlay(g => UI.hints(g, r, '{b:confirm} PLAY AGAIN', TT.game.input)); }
});
TT.scenes['continue'] = contScene;
{ const fin = TT.scenes.story.finish; TT.scenes.story.finish = function () { if (this.data && this.data.after === 'continue') { if (this.done) return; this.done = true; return TT.game.go('continue'); } return fin.call(this); }; }
/* ---- the Training Ground: nine drill cards with a tick when done ---- */
TT.scenes.training = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data || {}; BG.ensure('muddington', 'mud', 'bad', 'day'); Idle.t = 0; TT.sound.music('mud');
    this.f = new UI.Focus(TT.DRILLS.length + 1, { axis: 'h', cols: 3, i: this.data.i || 0 });
    this.coach = TT.makeRig(TT.CAST.gristle, TT.CAST.gristle.colors, { hat: TT.CAST.gristle.hat, outfit: 'coat' });
  },
  update(dt) {
    BG.update(dt); const game = TT.game; if (game.paused) return;
    this.coach.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2 });
    const r = this.f.update(game.input, game);
    if (r.picked) { if (this.f.i === TT.DRILLS.length) return this.back(); game.go('match', { home: 'mud', away: 'bad', venue: 'muddington', drill: TT.DRILLS[this.f.i].id, time: 'day', weather: 'clear', cupTraining: !!this.data.cup }); }
    if (r.back) this.back();
  },
  back() { TT.game.go(this.data.cup ? 'cup' : 'menu'); },
  draw(r) {
    BG.draw(r, .55);
    r.overlay(g => {
      const cx = r.W / 2, done = TT.store.get('thugby:drills', {}) || {};
      FONT.title(g, 'TRAINING GROUND', cx, 6, { align: 'center', scale: 3, colors: ['#ffffff', '#b0f0a0', '#3a8a3a'], depth: 2 });
      const w = Math.min(130, (r.W - 30) / 3), h = 40, x0 = cx - (3 * w + 8) / 2;
      this.f.rects = [];
      TT.DRILLS.forEach((d, i) => {
        const x = x0 + (i % 3) * (w + 4), y = 34 + Math.floor(i / 3) * (h + 4), on = this.f.i === i;
        this.f.rects[i] = [x, y, w, h];
        UI.panel(g, x, y, w, h, { focus: on });
        UI.txt(g, (i + 1) + '. ' + d.name, x + 6, y + 5, on ? '#ffe060' : '#ffffff');
        UI.txt(g, d.teach, x + 6, y + 18, '#a8b0c8', { font: 'tiny' });
        if (done[d.id]) UI.txt(g, '✓', x + w - 10, y + 5, '#80ff90', { scale: 2 });
      });
      const by = 34 + 3 * (h + 4), on = this.f.i === TT.DRILLS.length;
      this.f.rects[TT.DRILLS.length] = [cx - 60, by, 120, 18];
      UI.panel(g, cx - 60, by, 120, 18, { focus: on }); UI.txt(g, this.data.cup ? 'TO THE CUP' : 'BACK', cx, by + 5, on ? '#ffe060' : '#ffffff', { align: 'center' });
      const d = TT.DRILLS[this.f.i];
      if (d) { UI.panel(g, cx - 160, by + 24, 320, 34, { alpha: .9 }); if (TT.cfg.present) this.coach.drawPortrait(g, cx - 156, by + 26, 30, { zoom: 2.2, turn: .3, bg: '#3a2a1a' }); UI.prompt(g, d.coach, cx - 120, by + 28, TT.game.input, {}); UI.txt(g, 'GOAL: ' + d.goal, cx - 120, by + 44, '#ffe7a8', { font: 'tiny' }); }
      UI.hints(g, r, '{b:stick} CHOOSE   {b:confirm} PLAY   {b:cancel} BACK', TT.game.input);
    });
  }
});
/* ---- the credits roll over the third half, then the title ---- */
TT.scenes.credits = Object.assign({}, FRONT, {
  enter() { BG.ensure('muddington', 'mud', 'bad', 'night'); this.t = 0; TT.sound.music('third'); },
  update(dt) { this.t += dt; BG.update(dt); const game = TT.game; if ((this.t > 2 && game.players.some(q => q.pressed('confirm') || q.pressed('cancel') || q.pressed('start'))) || this.t > 40) game.go('title'); },
  draw(r) {
    BG.draw(r, .7);
    r.overlay(g => {
      let y = r.H - this.t * 18;
      for (const [h, t] of TT.CREDITS) { if (h) { UI.txt(g, h, r.W / 2, y, '#ffe060', { align: 'center' }); y += 10; } for (const l of FONT.wrap(t, r.W - 40)) { UI.txt(g, l, r.W / 2, y, '#ffffff', { align: 'center' }); y += 9; } y += 12; }
      UI.hints(g, r, '{b:confirm} SKIP', TT.game.input);
    });
  }
});
