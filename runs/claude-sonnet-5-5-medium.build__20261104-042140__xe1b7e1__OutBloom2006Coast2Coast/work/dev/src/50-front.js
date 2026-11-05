/* The front end: title, setup (the garage and radio), the Coast 2 Coast Tour, the Garage Garden, About, results and endings. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, game = OB.game, { clamp } = E, S = OB.scenes, T = OB.txt;
const unlocked = (kind, ref) => OB.save[kind === 'car' ? 'cars' : kind === 'color' ? 'colors' : 'songs'].includes(ref);
const fake = () => { const p = OB.save.pick; return { car: OB.CARS.find(c => c.id === p.car) || OB.CARS[0], color: p.color, passId: ['marisol', 'dante', 'wren'][p.pass], drift: { angle: 0, on: false }, bank: 0, crash: 0, speed: 0, x: 0, mood: 80, boost: 0, o: {} }; };
const colorIdx = () => OB.COLORS.map((c, i) => i).filter(i => unlocked('color', OB.COLORS[i].id));
const carList = () => OB.CARS.filter(c => unlocked('car', c.id));
const cycle = (arr, cur, d) => arr[(arr.indexOf(cur) + d + arr.length) % arr.length];
/* ---------------- title ---------------- */
let idle = 0, tz = 0;
S.title = {
  view: 'side', res: [480, 270], expand: true,
  enter() { OB.playTitle(); idle = 0; this.mk(); OB.lastMouseT = game.input.mouse.t; OB.bubble = null; },
  mk() {
    const go = (m) => () => game.go('setup', { mode: m });
    this.list = new OB.List([
      { label: 'Drive: Love in Bloom', pick: go('drive') }, { label: 'Time Trial', pick: go('trial') }, { label: 'Versus (2 players)', pick: go('versus') }, { label: 'Coast 2 Coast Tour', pick: () => game.go('tour') },
      { label: 'Garage Garden', pick: () => game.go('garden') }, { label: 'Settings', pick: () => game.menu('settings') }, { label: 'About', pick: () => game.go('about') }
    ], { y: 112, w: 190, rowH: 15 });
    if (OB.env.touchOnly) this.list.rows.forEach((r, i) => { if (i < 5) r.disabled = true; }), this.list.i = 5;
  },
  update(dt) {
    tz += dt * 1800; this.list.update(); OB.voice.update(dt);
    if (OB.anyInput()) idle = 0; else idle += dt;
    if (idle > 10) game.go('attract', null, { fade: .3 });
  },
  draw(r) {
    const W = r.W, H = r.H, st = OB.getStage(14); st.road.o.sky = st.sky;
    const fk = fake(); fk.speed = 200;
    st.road.draw(r, { z: tz % st.road.length, x: 0, h: 1000, turn: 0, cars: [] });
    r.overlay(g => {
      const p = st.road.project((tz % st.road.length) + OB.AHEAD, 0, 0); if (p) OB.drawCar(g, p[0] + 96, p[1] - 6, Math.max(.6, H / 200) * .9, fk, game.time);
      E.font.title(g, 'OutBloom', W / 2, 12, { scale: 5, align: 'center', colors: ['#fffbe8', '#ffd0ec', '#ff6aa0', '#c0306a'], depth: 3, depthColor: '#4a1240' });
      E.font.title(g, '2006', W / 2, 46, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
      T(g, 'COAST 2 COAST', W / 2, 74, '#ffffff', { align: 'center', scale: 2 });
      T(g, 'One day. One road. Every flower in bloom.', W / 2, 94, '#ffe27a', { align: 'center' });
      if (OB.env.touchOnly) { OB.panel(g, W / 2 - 110, 104, 220, 34, { bg: '#4a1a2aee', border: '#ff9a9a' }); T(g, 'Controller or keyboard required', W / 2, 111, '#ffffff', { align: 'center', scale: 1 }); T(g, 'Settings are still available', W / 2, 124, '#ffd0d0', { align: 'center', font: 'tiny' }); }
      else OB.drawPrompts(g, W, H, [['confirm', 'Select'], ['up', 'Move']]);
      T(g, '(c) 2026 · an original homage', W - 8, H - 10, '#a898c8', { align: 'right', font: 'tiny' });
    });
    this.list.y = OB.env.touchOnly ? 146 : 114; this.list.draw(r);
  }
};
/* ---------------- setup: the garage, the passenger, the radio ---------------- */
S.setup = {
  enter(data) {
    this.d = data || { mode: 'drive' }; const p = OB.save.pick; this.stageSel = this.d.stage != null ? this.d.stage : 0; if (!unlocked('car', p.car)) p.car = 'orchidea'; if (!unlocked('color', OB.COLORS[p.color].id)) p.color = 0; this.t = 0;
    const m = this.d.mode, rows = [];
    if (m === 'trial' || m === 'versus') rows.push({ label: 'Stage', value: () => OB.STAGES[this.stageSel].name, left: () => { this.stageSel = (this.stageSel + 14) % 15; }, right: () => { this.stageSel = (this.stageSel + 1) % 15; } });
    rows.push({ label: 'Car', value: () => OB.CARS.find(c => c.id === p.car).name, left: () => { p.car = cycle(carList().map(c => c.id), p.car, -1); }, right: () => { p.car = cycle(carList().map(c => c.id), p.car, 1); } });
    rows.push({ label: 'Colour', value: () => OB.COLORS[p.color].name, left: () => { p.color = cycle(colorIdx(), p.color, -1); }, right: () => { p.color = cycle(colorIdx(), p.color, 1); } });
    if (m !== 'trial' && m !== 'versus') rows.push({ label: 'Passenger', value: () => OB.CAST[['marisol', 'dante', 'wren'][p.pass]].name, left: () => { p.pass = (p.pass + 2) % 3; }, right: () => { p.pass = (p.pass + 1) % 3; } });
    const songs = () => OB.save.songs.slice();
    rows.push({ label: 'Radio', value: () => OB.SONGDEFS[p.station].name, left: () => { p.station = cycle(songs(), p.station, -1); OB.playSong(p.station, .2); }, right: () => { p.station = cycle(songs(), p.station, 1); OB.playSong(p.station, .2); } });
    rows.push({ label: m === 'tour' ? 'Start the postcard' : m === 'trial' ? 'Start the time trial' : m === 'versus' ? 'Start the duel' : 'Start the day', pick: () => this.start() });
    rows.push({ label: 'Back', pick: () => game.go(m === 'tour' ? 'tour' : 'title') });
    this.list = new OB.List(rows, { x: 12, y: 78, w: 230, rowH: 17, onCancel: () => game.go(m === 'tour' ? 'tour' : 'title') });
    this.list.i = rows.length - 2;
    if (!unlocked('song', p.station)) p.station = 0; OB.playSong(p.station, .3);
  },
  start() { const p = OB.save.pick; OB.persist(); if (this.d.mode === 'versus') return game.go('versus', { car: p.car, color: p.color, pass: p.pass, station: p.station, stage: this.stageSel, seed: (Date.now() & 0xffff) + 1 }); game.go(this.d.mode === 'trial' ? 'race' : 'startline', { mode: this.d.mode, car: p.car, color: p.color, pass: p.pass, station: p.station, stage: this.d.mode === 'trial' ? this.stageSel : this.d.mode === 'tour' ? this.d.mission.stage : 0, mission: this.d.mission || null, seed: (Date.now() & 0xffff) + 1 }); },
  update(dt) { this.t += dt; this.list.update(); OB.voice.update(dt); const p = OB.save.pick; },
  draw(r) {
    const W = r.W, H = r.H, p = OB.save.pick, car = OB.CARS.find(c => c.id === p.car), fk = fake(); OB.menuSky(r, 'dusk');
    r.overlay(g => {
      px.rect(g, 0, H * .62, W, H, '#3a2050'); px.rect(g, 0, H * .62, W, 3, '#ff9ad0'); for (let i = 0; i < 12; i++) px.rect(g, i * 44 - (this.t * 20) % 44, H * .62 + 40, 24, 3, '#6a4a8a');
      OB.heading(g, W, this.d.mode === 'tour' ? this.d.mission.name : this.d.mode === 'trial' ? 'Time Trial' : this.d.mode === 'versus' ? 'Versus' : 'The Garage', 6, 2);
      const cx = W * .6, cy = H * .86; OB.drawCar(g, cx, cy, 2.2, fk, this.t);
      OB.panel(g, W - 214, 78, 204, 52, { bg: '#2a1346dd' });
      T(g, car.name.toUpperCase(), W - 110, 82, '#ffe27a', { align: 'center' }); T(g, 'FIORETTI ' + car.year, W - 110, 91, '#c8b8ff', { align: 'center', font: 'tiny' });
      [['SPEED', (car.top - 240) / 80], ['ACCEL', (car.acc - .9) / .4], ['GRIP', (car.grip - .75) / .6], ['SLIDE', (car.drift - .8) / .5]].forEach(([n, v], i) => { const yy = 99 + i * 7; T(g, n, W - 208, yy, '#ffffff', { font: 'tiny' }); px.rect(g, W - 168, yy + 1, 140, 3, '#1a1030'); px.rect(g, W - 168, yy + 1, Math.round(140 * clamp(v, .08, 1)), 3, '#ff9ad0'); });
      if (this.d.mode !== 'trial' && this.d.mode !== 'versus') { const pid = ['marisol', 'dante', 'wren'][p.pass]; OB.rigUpdate(pid, 1 / 60, Math.floor(this.t / 3) % 2 ? 'wave' : null, 'smile'); OB.portrait(g, pid, W - 66, 138, 52); T(g, OB.CAST[pid].name.toUpperCase(), W - 40, 192, '#ffe27a', { align: 'center' }); }
      const bio = this.d.mode === 'tour' ? this.d.mission.brief : (this.d.mode === 'trial' || this.d.mode === 'versus') ? OB.STAGES[this.stageSel].blurb : OB.CAST[['marisol', 'dante', 'wren'][p.pass]].bio;
      OB.panel(g, 12, 36, 230, 36, { bg: '#2a1346cc' }); E.font.wrap(bio, 214, {}).slice(0, 3).forEach((ln, i) => T(g, String(ln), 20, 41 + i * 9, '#ffffff', {}));
      T(g, car.blurb, W * .6, H - 36, '#ffd0ec', { align: 'center', font: 'tiny' });
      OB.drawPrompts(g, W, H, [['confirm', 'Select'], ['left', 'Change'], ['cancel', 'Back']]);
    });
    this.list.draw(r);
  }
};
/* ---------------- the Coast 2 Coast Tour ---------------- */
S.tour = {
  enter() { OB.playTitle(); this.t = 0; const rows = OB.MISSIONS.map((m, i) => ({ label: () => (OB.save.missions[m.id] ? '★ ' : '  ') + m.name, value: () => OB.STAGES[m.stage].name, pick: () => game.go('setup', { mode: 'tour', mission: m }) }));
    rows.push({ label: 'Back', pick: () => game.go('title') }); this.list = new OB.List(rows, { x: 12, y: 44, w: 246, rowH: 13, onCancel: () => game.go('title') }); },
  update(dt) { this.t += dt; this.list.update(); },
  draw(r) {
    const W = r.W, H = r.H; OB.menuSky(r, 'sunset');
    const m = OB.MISSIONS[this.list.i]; r.overlay(g => {
      px.rect(g, 0, H * .66, W, H, '#3a2050'); px.rect(g, 0, H * .66, W, 3, '#ffe27a');
      OB.heading(g, W, 'Coast 2 Coast Tour', 6, 2); T(g, 'Postcards from Bellafiore  ·  ' + Object.keys(OB.save.missions).length + '/' + OB.MISSIONS.length + ' collected', W / 2, 30, '#ffd0ec', { align: 'center' });
      if (m) { const gv = OB.CAST[m.giver]; OB.rigUpdate(m.giver, 1 / 60, 'wave', 'smile'); OB.panel(g, 268, 50, 200, 150, { bg: '#2a1346ee' }); OB.portrait(g, m.giver, 276, 58, 48); T(g, gv.name.toUpperCase(), 330, 60, '#ffe27a', {}); T(g, gv.bio, 330, 70, '#c8b8ff', { font: 'tiny' });
        E.font.wrap(m.brief, 184, {}).slice(0, 6).forEach((ln, i) => T(g, String(ln), 276, 112 + i * 9, '#ffffff', {}));
        T(g, 'REWARD  ' + m.reward + ' seeds', 276, 176, '#9affb0', {}); const b = OB.save.missions[m.id]; T(g, b ? 'Collected' + (b.time ? ' · best ' + OB.fmtTime(b.time) : '') : 'Not yet collected', 276, 187, b ? '#ffd0ec' : '#a898c8', { font: 'tiny' }); }
      OB.drawPrompts(g, W, H, [['confirm', 'Choose'], ['cancel', 'Back']]);
    });
    this.list.draw(r);
  }
};
/* ---------------- the Garage Garden ---------------- */
S.garden = {
  enter() { OB.playTitle(); this.t = 0; this.msg = ''; this.i = 0; this.sel = 0; },
  seeds() { return OB.save.seeds - OB.save.spent; },
  update(dt) {
    this.t += dt; const I = game.input, n = OB.BEDS.length, cols = 4;
    if (I.repeat('left')) { this.sel = (this.sel + n - 1) % n; OB.sfx('select'); } if (I.repeat('right')) { this.sel = (this.sel + 1) % n; OB.sfx('select'); }
    if (I.repeat('up')) { this.sel = (this.sel + n - cols) % n; OB.sfx('select'); } if (I.repeat('down')) { this.sel = (this.sel + cols) % n; OB.sfx('select'); }
    if (I.mouse.t !== this._mt) { this._mt = I.mouse.t; const h = this.hit(I.pointer()); if (h >= 0) this.sel = h; }
    const ck = this.hit(I.clicked()); if (ck >= 0) this.sel = ck;
    if (I.pressed('confirm') || ck >= 0) this.plant(); if (I.pressed('cancel')) { OB.sfx('cancel'); game.go('title'); }
  },
  hit(p) { if (!p || !this.rects) return -1; return this.rects.findIndex(q => p[0] >= q.x && p[0] < q.x + q.w && p[1] >= q.y && p[1] < q.y + q.h); },
  plant() {
    const b = OB.BEDS[this.sel], S0 = OB.save; if (S0.planted.includes(b.id)) { this.msg = 'Already in bloom.'; OB.sfx('cancel'); return; }
    if (this.seeds() < b.cost) { this.msg = 'Need ' + (b.cost - this.seeds()) + ' more seeds.'; OB.sfx('cancel'); OB.voice.say('Patience dear', 'pia'); return; }
    S0.spent += b.cost; S0.planted.push(b.id); const key = b.kind === 'car' ? 'cars' : b.kind === 'color' ? 'colors' : 'songs'; S0[key].push(b.ref);
    this.msg = b.name + ' is in bloom!'; OB.sfx('powerup'); OB.sfx('petal'); OB.voice.say('Look at it grow', 'pia'); OB.persist();
    for (let i = 0; i < 30; i++) OB.fx.spawn(240 + Math.random() * 120 - 60, 120, (Math.random() - .5) * 90, -30 - Math.random() * 60, 1.2, ['#ff5a8a', '#ffd23a', '#ffffff', '#c07aff'][i % 4], 3, 'petal');
  },
  draw(r) {
    const W = r.W, H = r.H; OB.menuSky(r, 'morning'); this.rects = [];
    r.overlay(g => {
      px.rect(g, 0, H * .55, W, H, '#4a8a4a'); for (let i = 0; i < 30; i++) px.rect(g, (i * 53) % W, H * .55 + ((i * 29) % 50) + 2, 6, 3, '#5aa05a');
      OB.heading(g, W, 'Garage Garden', 6, 2);
      T(g, 'SEEDS', 38, 108, '#9affb0', { align: 'center' }); T(g, String(this.seeds()), 38, 118, '#ffffff', { align: 'center', scale: 2 });
      OB.rigUpdate('pia', 1 / 60, 'wave', 'smile'); OB.portrait(g, 'pia', 12, 34, 52); T(g, 'NONNA PIA', 38, 90, '#ffe27a', { align: 'center' });
      const cols = 4, bw = 96, bh = 38, x0 = 76, y0 = 34;
      OB.BEDS.forEach((b, i) => {
        const cx = x0 + (i % cols) * (bw + 6), cy = y0 + Math.floor(i / cols) * (bh + 4), done = OB.save.planted.includes(b.id), sel = i === this.sel; this.rects.push({ x: cx, y: cy, w: bw, h: bh });
        OB.panel(g, cx, cy, bw, bh, { bg: done ? '#2a5a3acc' : '#4a2a1aee', border: sel ? '#ffe27a' : done ? '#9affb0' : '#a87a4a' });
        const col = b.kind === 'color' ? OB.COLORS.find(c => c.id === b.ref).c : b.kind === 'car' ? '#ff9ad0' : '#7ad8ff';
        if (done) { px.rect(g, cx + bw / 2 - 1, cy + 19, 2, 12, '#3aa04a'); px.disc(g, cx + bw / 2, cy + 17, 6, col); px.disc(g, cx + bw / 2, cy + 17, 3, '#ffe27a'); } else { px.ell(g, cx + bw / 2, cy + 26, 12, 3, '#2a1a10'); px.disc(g, cx + bw / 2, cy + 24, 2, '#9affb0'); }
        T(g, b.name, cx + bw / 2, cy + 3, sel ? '#ffe27a' : '#ffffff', { align: 'center', font: 'tiny' }); T(g, done ? 'IN BLOOM' : b.cost + ' SEEDS', cx + bw / 2, cy + bh - 8, done ? '#9affb0' : '#ffd0a0', { align: 'center', font: 'tiny' });
      });
      OB.fx.step(1 / 60); OB.fx.draw(g);
      const b = OB.BEDS[this.sel]; OB.panel(g, 76, H - 56, 330, 30, { bg: '#2a1346ee' }); T(g, b.kind === 'car' ? 'A new Fioretti for the garage.' : b.kind === 'color' ? 'A new paint colour for any car.' : 'A new song for the radio.', 84, H - 51, '#ffffff', {}); T(g, this.msg, 84, H - 40, '#ffd0ec', {});
      OB.drawPrompts(g, W, H, [['confirm', 'Plant'], ['left', 'Move'], ['cancel', 'Back']]);
    });
  }
};
/* ---------------- about / credits ---------------- */
S.about = {
  enter() { this.page = 0; this.scroll = 0; OB.playTitle(); },
  update(dt) {
    const I = game.input, pages = OB.ABOUT.pages; if (I.repeat('left')) { this.page = (this.page + pages.length - 1) % pages.length; this.scroll = 0; OB.sfx('select'); } if (I.repeat('right') || I.pressed('confirm')) { this.page = (this.page + 1) % pages.length; this.scroll = 0; OB.sfx('select'); }
    if (I.repeat('down')) this.scroll = Math.min(this.max || 0, this.scroll + 9); if (I.repeat('up')) this.scroll = Math.max(0, this.scroll - 9);
    if (I.pressed('cancel')) { OB.sfx('cancel'); game.go('title'); }
  },
  draw(r) {
    const W = r.W, H = r.H, pg = OB.ABOUT.pages[this.page]; OB.menuSky(r, 'night');
    r.overlay(g => {
      OB.heading(g, W, 'About', 6, 2); T(g, (this.page + 1) + '/' + OB.ABOUT.pages.length + '  ' + pg.title.toUpperCase(), W / 2, 28, '#ffe27a', { align: 'center' });
      OB.panel(g, 20, 40, W - 40, H - 66, { bg: '#1a0c2eee' });
      const lines = []; for (const para of pg.lines) lines.push(...E.font.wrap(para, W - 70, {}).map(String), '');
      this.max = Math.max(0, lines.length * 9 - (H - 86));
      const cv = g.canvas, y0 = 46; g.save(); g.beginPath(); g.rect(24, 44, W - 48, H - 72); g.clip();
      lines.forEach((ln, i) => { const yy = y0 + i * 9 - this.scroll; if (yy > 36 && yy < H - 30) T(g, ln, 30, yy, ln.startsWith('•') ? '#ffd0ec' : '#ffffff', {}); });
      g.restore();
      OB.drawPrompts(g, W, H, [['left', 'Page'], ['up', 'Scroll'], ['cancel', 'Back']]);
    });
  }
};
/* ---------------- results and endings ---------------- */
S.results = {
  enter(d) {
    this.d = d; this.t = 0; this.phase = d.goal ? 0 : 1; this.typed = 0; this.done = false; this.award();
    OB.stopMusic(); if (d.goal) A_goal(); else if (d.mode !== 'drive' || d.timeout) OB.sfx(d.ok === false || d.timeout ? 'die' : 'secret');
    this.endText = d.goal ? OB.GOALS[d.goal.idx].end[OB.moodOf(d.grade)].replace(/\{P\}/g, OB.CAST[d.passId].name) : d.timeout ? OB.NOTIME.end.replace(/\{P\}/g, OB.CAST[d.passId].name) : '';
    if (this.phase === 0 || (d.timeout && d.mode === 'drive')) { this.phase = this.endText ? 0 : 1; OB.voice.say(this.endText.slice(0, 40), d.passId); }
  },
  award() {
    const d = this.d, S0 = OB.save; if (d.awarded) return; d.awarded = true; d.seeds = 0;
    if (d.mode === 'drive') { d.seeds = d.petals + (d.goal ? 5 : 0) + Math.floor(d.score / 25000); S0.stats.runs++; S0.stats.petals += d.petals; if (d.goal) S0.endings[d.goal.idx] = d.grade; S0.stats.bestScore = Math.max(S0.stats.bestScore, d.score); }
    else if (d.mode === 'tour' && d.ok) { const first = !S0.missions[d.mission.id]; d.seeds = first ? d.mission.reward : 1; S0.missions[d.mission.id] = { time: Math.min(d.time, (S0.missions[d.mission.id] || {}).time || 1e9) }; }
    else if (d.mode === 'trial' && d.newBest) { d.seeds = 1; }
    S0.seeds += d.seeds; S0.stats.drifts += d.stats.drifts || 0; S0.stats.near += d.stats.near || 0; S0.stats.km += d.stats.km || 0; OB.persist();
  },
  update(dt) {
    this.t += dt; OB.voice.update(dt); const I = game.input;
    if (this.phase === 0) { this.typed += dt; if ((I.pressed('confirm') || I.clicked()) && this.t > 1) { if (this.typed * 38 < this.endText.length) this.typed = 99; else { this.phase = 1; this.t = 0; OB.sfx('confirm'); } } }
    else if (this.t > .8 && (I.pressed('confirm') || I.clicked())) { OB.sfx('confirm'); I.consumeAll(); const d = this.d; if (d.mode === 'tour') game.go('tour'); else if (d.mode === 'trial' || d.mode === 'versus') game.go('setup', { mode: d.mode, stage: d.stage }); else game.go('title'); }
    else if (this.t > .8 && I.pressed('cancel')) game.go('title');
  },
  draw(r) {
    const W = r.W, H = r.H, d = this.d;
    if (this.phase === 0) {
      const g0 = d.goal || { idx: -1 }, gname = g0.idx >= 0 ? OB.GOALS[g0.idx].name : OB.NOTIME.name, gwhere = g0.idx >= 0 ? OB.GOALS[g0.idx].where : 'the sea, where the sun goes to bed'; OB.skyFor('beach', 'sunset').draw(r);
      r.overlay(g => {
        px.rect(g, 0, H * .64, W, H, '#2a5a8a'); for (let i = 0; i < 10; i++) px.rect(g, 40 + i * 44 + Math.sin(game.time + i) * 4, H * .66 + (i % 3) * 9, 26, 2, '#8ad0f0');
        px.rect(g, 0, H * .78, W, H, '#3a2050'); OB.heading(g, W, gname, 8, 2); T(g, gwhere.toUpperCase(), W / 2, 40, '#ffe2f4', { align: 'center' });
        const fk = { car: OB.CARS.find(c => c.id === d.car) || OB.CARS[0], color: d.color, passId: d.passId, drift: { angle: 0, on: false }, bank: 0, crash: 0, speed: 0, x: 0, mood: 90, boost: 0, o: {} };
        OB.drawCar(g, W * .56, H * .66, 2.2, fk, game.time);
        const pose = OB.moodOf(d.grade) === 'love' ? 'cheer' : OB.moodOf(d.grade) === 'fine' ? 'wave' : 'hips', ex = OB.moodOf(d.grade) === 'love' ? 'smile' : OB.moodOf(d.grade) === 'fine' ? 'smile' : 'wince';
        OB.rigUpdate(d.passId, 1 / 60, pose, ex); OB.portrait(g, d.passId, 14, H - 118, 60); T(g, OB.CAST[d.passId].name.toUpperCase(), 44, H - 54, '#ffe27a', { align: 'center' });
        OB.panel(g, 82, H - 100, W - 96, 68, { bg: '#fff6faee', border: '#ff9ad0' });
        E.font.wrap(OB.typed(this.endText, this.typed), W - 120, {}).forEach((ln, i) => T(g, String(ln), 92, H - 94 + i * 9, '#4a1a3a', { shadow: false }));
        OB.drawPrompts(g, W, H, [['confirm', 'Continue']]);
        for (let i = 0; i < 3; i++) if (OB.fx.list.length < 40) OB.fx.spawn(Math.random() * W, -4, (Math.random() - .5) * 20, 30 + Math.random() * 30, 5, ['#ff5a8a', '#ffd23a', '#ffffff'][i], 3, 'petal'); OB.fx.step(1 / 60); OB.fx.draw(g);
      });
    } else {
      OB.skyFor('beach', d.timeout ? 'night' : 'dusk').draw(r);
      r.overlay(g => {
        OB.heading(g, W, d.mode === 'tour' ? (d.ok ? 'Postcard Collected' : 'Not This Time') : d.mode === 'versus' ? 'Versus' : d.mode === 'trial' ? 'Time Trial' : d.goal ? 'Coast to Coast!' : 'Sunset', 8, 2);
        OB.panel(g, W / 2 - 150, 36, 300, H - 70, { bg: '#2a1346f0' });
        let y = 46; const row = (a, b, c = '#ffffff') => { T(g, a, W / 2 - 134, y, '#c8b8ff', {}); T(g, b, W / 2 + 134, y, c, { align: 'right' }); y += 11; };
        if (d.mode === 'versus') { row('Winner', 'PLAYER ' + d.winner, '#ffe27a'); row('Stage', OB.STAGES[d.stage].name); row('Player 1', d.t1 ? OB.fmtTime(d.t1) : 'did not finish'); row('Player 2', d.t2 ? OB.fmtTime(d.t2) : 'did not finish'); }
        else if (d.mode === 'drive') {
          T(g, d.grade, W / 2, y, d.grade.startsWith('A') ? '#ffe27a' : '#ffffff', { align: 'center', scale: 5 }); y += 40; T(g, d.grade === 'AAA' ? 'FULL BLOOM' : d.grade.startsWith('A') ? 'IN LOVE' : d.grade === 'B' || d.grade === 'C' ? 'SMILING' : 'WILTED', W / 2, y - 2, '#ffd0ec', { align: 'center' }); y += 12;
          row('Score', OB.pad(d.score, 7)); row('Petals', d.petals + ' petals'); row('Requests granted', d.stats.reqDone + ' / ' + (d.stats.reqDone + d.stats.reqFail)); row('Route', d.route.map(id => OB.STAGES[id].name.split(' ')[0]).join(' > ').slice(0, 44)); row('Overtakes', String(d.stats.passes)); row('Near misses', String(d.stats.near)); row('Best slide', String(d.stats.bestDrift)); row('Top speed', Math.round(d.stats.maxSpeed) + ' km/h');
        } else if (d.mode === 'trial') {
          row('Stage', OB.STAGES[d.stage].name); row('Time', OB.fmtTime(d.time), '#ffe27a'); row('Best', OB.fmtTime(d.best)); if (d.newBest) row('', 'NEW BEST!', '#9affb0'); row('Top speed', Math.round(d.stats.maxSpeed) + ' km/h'); row('Best slide', String(d.stats.bestDrift));
        } else {
          row('Postcard', d.mission.name); row('Result', d.ok ? 'Collected' : (d.why === 'rival' ? 'Cosimo got there first' : d.why === 'crash' ? 'You crashed' : d.why === 'short' ? 'Target not reached' : 'Out of time'), d.ok ? '#9affb0' : '#ff9a9a'); row('Time', OB.fmtTime(d.time)); row('Overtakes', String(d.stats.passes)); row('Near misses', String(d.stats.near)); row('Best slide', String(d.stats.bestDrift));
        }
        if (d.mode !== 'versus') { y += 4; row('Seeds earned', '+' + d.seeds, '#9affb0'); row('Seeds in the garden', String(OB.save.seeds - OB.save.spent)); }
        OB.drawPrompts(g, W, H, [['confirm', 'Continue']]);
      });
    }
  }
};
const A_goal = () => { OB.sfx('secret'); game.audio.music(OB.GOAL_SONG, { fade: .3 }); };
})();
