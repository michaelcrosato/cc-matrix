/* OLYMPIYIKES! — ceremonies (§7.4), credits, Single Event, Records, How to Play, About & Credits, the Pose Lab. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, ST = () => O.Stadium;

/* ---- the opening ceremony: fireworks, the parade of nations, the playable flame, Max in the tunnel ---- */
O.scene('opening', {
  view: 'brawler', lock: .5,
  enter() {
    const m = O.meet; this.t = 0; this.step = 0; this.hold = 0; this.quick = m.quick;
    const mine = m.players.map(p => p.nat), order = O.NATIONS.filter(n => !mine.includes(n.id)).concat(O.NATIONS.filter(n => mine.includes(n.id)));
    this.order = order; this.marchers = order.map((n, i) => ({ n, rig: O.makeRig(n, 'ceremony'), x: -300 - i * 70, i }));
    this.bar = null; this.lit = null; this.script = this.quick ? [['flame']] : [['fw', 'P:Ladies and gentlemen... welcome to the Games of Mount Glory and Sunny Bay!'], ['talk', 'C:Good evening, everybody! For the first time in history, the Summer and Winter Games are happening at the SAME TIME, in the SAME PLACE! || V:Some called it impossible. Others called it a scheduling error. Tonight we call it... OLYMPIYIKES!'], ['parade'], ['flame'], ['max', 'M:Nice throw. Enjoy it. It\'s the closest you\'ll get to gold. || V:Let the Games... begin!']];
    this.si = -1; this.next();
    game.lights.enabled = true; game.lights.ambient = .4; O.music('parade'); O.Comms.reset();
  },
  next() {
    this.si++; this.st = 0; const s = this.script[this.si];
    if (!s) return this.finish();
    if (s[1]) O.Comms.say(s[1], null, 9);
    if (s[0] === 'parade') { this.pi = -1; this.pt = 99; }
    if (s[0] === 'flame') { this.bar = new O.TimingBar({ hz: .9, zones: [{ from: .44, to: .56, name: 'PERFECT', q: 1 }] }); this.thrown = false; this.lit = null; O.Comms.say('P:The final torchbearer is... YOU!', null, 9); }
  },
  finish() { const m = O.meet; if (this.flameQ >= 1) m.startHype = .25; O.flow.next(); },
  update(dt) {
    this.t += dt; this.st += dt; const s = this.script[this.si]; if (!s) return;
    const I = game.input;
    if (I.down('confirm') || I.down('action')) this.hold += dt; else this.hold = 0;
    if (this.hold > 1 && s[0] !== 'flame') { this.finish(); return; }
    if (Math.floor(this.t * 1.5) !== Math.floor((this.t - dt) * 1.5) && (s[0] === 'fw' || s[0] === 'max' || this.lit)) { O.Art.firework(-200 + E.hash2(Math.floor(this.t), 5) * 400, 230, 160 + E.hash2(Math.floor(this.t), 6) * 80, ['#ff5a3a', '#ffd060', '#3fa8e8', '#ffffff']); O.sfx('firework', { vol: .35 }); }
    for (const mk of this.marchers) { if (s[0] === 'parade' || this.si > 2) mk.x += dt * 34; mk.rig.update(dt, { x: mk.x, y: 70, z: 0, vx: s[0] === 'parade' ? 34 : 0, vy: 0, facing: 0, pose: this.lit && mk.i > 4 ? 'cheer' : null }); O.Pose.set(mk.rig, s[0] === 'parade' ? 'flagCarry' : null); }
    if (s[0] === 'fw' && this.st > 4) this.next();
    else if (s[0] === 'talk' && !O.Comms.current && this.st > 1) this.next();
    else if (s[0] === 'parade') {
      this.pt += dt; const active = this.marchers.find(mk => mk.x > -60 && mk.x < 60 && !mk.said);
      if (active && !O.Comms.current) { active.said = true; const last = active === this.marchers[this.marchers.length - 1] && O.meet.players.some(p => p.nat === active.n.id); O.Comms.say(last ? 'P:And finally... the nation everyone came to see! ' + active.n.name + '!' : 'P:' + active.n.name + '... ' + active.n.parade, null, 8); O.Crowd.excite(.5); }
      if (this.marchers[this.marchers.length - 1].x > 120 && !O.Comms.current) this.next();
      if (this.st > 40) this.next();
    } else if (s[0] === 'flame') {
      if (!this.thrown) { this.bar.update(dt); if (I.pressed('action') || I.pressed('confirm') || I.clicked() || (O.Dev && O.Dev.cheats.autopilot && Math.abs(this.bar.v - .5) < .03)) { const res = this.bar.press(); this.thrown = true; this.flameQ = res.q; this.jt = 0; O.sfx('whooshBig'); } }
      else { this.jt += dt; if (this.jt > 1.2 && !this.lit) { this.lit = this.flameQ >= 1 ? 'cauldron' : 'scoreboard'; O.sfx('flame'); O.Crowd.doWave(4); O.CrowdAudio.cheer(); O.Comms.say(this.lit === 'cauldron' ? 'C:Bullseye! The cauldron is LIT!' : 'C:...and the scoreboard is now the cauldron. Olympiyikes!', null, 9); if (this.lit !== 'cauldron') O.stamp('OLYMPIYIKES!'); }
        if (this.lit && this.jt > 5 && !O.Comms.current) this.next(); }
    } else if (s[0] === 'max' && !O.Comms.current && this.st > 1.5) this.next();
  },
  draw(r) {
    const s = this.script[this.si] || ['max'];
    game.focus(s[0] === 'flame' ? 120 : 0, 70, 40); game.setZoom(s[0] === 'parade' ? 1.6 : 1.1);
    ST().drawVenue(r, { night: true });
    for (const mk of this.marchers) { ST().athleteDraw(r, mk, mk.x, 70, 0); if (s[0] === 'parade' || this.si > 2) r.queue(mk.x + 4, 70, 30, g => { const p = r.w(mk.x + 4, 70, 34); px.rect(g, p[0], p[1], 1, 18, '#c8ccd8'); O.Art.flag(g, p[0] + 1, p[1], 14, 9, mk.n, true); }); }
    // the cauldron tower and the scoreboard
    const cx = 260; r.queue(cx, -30, 0, g => { const a = r.w(cx, -30, 0), b = r.w(cx, -30, 90); px.rect(g, a[0] - 4, b[1], 8, a[1] - b[1], '#8a7a5a'); px.poly(g, [[a[0] - 16, b[1]], [a[0] + 16, b[1]], [a[0] + 9, b[1] + 9], [a[0] - 9, b[1] + 9]], '#c8a050'); }, { bias: -800 });
    if (this.lit === 'cauldron') { r.queue(cx, -30, 92, g => { const p = r.w(cx, -30, 92); for (let i = 0; i < 7; i++) px.disc(g, p[0] + Math.sin(game.real * 9 + i) * 4, p[1] - i * 4, 8 - i, ['#ff5a1a', '#ff7a2a', '#ffb03a', '#ffd060', '#fff0a0', '#ffffff', '#ffffff'][i]); }, { emissive: true }); game.lights.add(cx, -30, 100, 200, 1, { color: '#ffb060' }); }
    const sbx = 360; r.queue(sbx, -30, 60, g => { const p = r.w(sbx, -30, 60); O.Art.jumbo(g, p[0] - 30, p[1] - 10, 60, 20, ['OLYMPIYIKES', 'OPENING']); if (this.lit === 'scoreboard') for (let i = 0; i < 8; i++) px.disc(g, p[0] - 24 + i * 7 + Math.sin(game.real * 8 + i) * 2, p[1] - 14 - (i % 3) * 3, 4, ['#ff5a1a', '#ffb03a', '#ffd060'][i % 3]); }, { bias: -800 });
    if (s[0] === 'flame' && this.thrown && !this.lit) { const u = Math.min(1, this.jt / 1.2), tx = this.flameQ >= 1 ? cx : sbx, x = 120 + (tx - 120) * u, z = 30 + Math.sin(u * Math.PI) * 80 + u * 50; r.queue(x, 40, z, g => { const p = r.w(x, 40, z); px.line(g, p[0] - 8, p[1] + 3, p[0] + 8, p[1] - 3, '#e8e8f0', 1); px.disc(g, p[0] + 8, p[1] - 3, 3, '#ff8a2a'); }, { emissive: true }); }
    r.overlay(g => {
      if (s[0] === 'flame' && !this.thrown) { O.text(g, 'LIGHT THE CAULDRON!', r.W / 2, 30, '#ffd060', { align: 'center', scale: 2 }); this.bar.draw(g, r.W / 2 - 80, r.H - 54, 160, 12); O.Prompt.draw(g, r.W / 2, r.H - 72, 'action', { label: 'THROW ON THE GOLD', align: 'center' }); }
      else if (s[0] !== 'flame') O.Prompt.draw(g, 14, 14, 'confirm', { label: 'HOLD TO SKIP' });
      if (this.hold > 0) O.HUD.power(g, 14, 30, 60, this.hold, '#ffffff');
    });
  }
});

/* ---- the closing ceremony, the ending and the credits ---- */
O.scene('closing', {
  view: 'brawler', lock: .5,
  enter() {
    const m = O.meet; this.t = 0; this.rows = O.medalTable(m.medals); this.dancers = O.NATIONS.map((n, i) => ({ n, rig: O.makeRig(n, 'ceremony'), x: -140 + i * 40, y: 50 + (i % 2) * 30 }));
    const mine = m.players.length ? m.players[0].nat : 'SUN', rank = this.rows.findIndex(q => q.nat.id === mine) + 1; this.rank = rank;
    this.ending = rank === 1 ? 'Your nation tops the medal table! Back home they\'re renaming a mountain after you. It\'s a small mountain. It\'s a hill. But it\'s YOUR hill.' : rank <= 3 ? 'A podium nation! Respect. Max sends a fruit basket. It\'s mostly lemons.' : 'The medals didn\'t come, but the highlights did. Your yikes reel has four million views. Next Games, champ.';
    this.party = m.players.length > 1 ? m.players.map((p, k) => ({ k, nat: p.nat, pts: m.party[k] || 0 })).sort((a, b) => b.pts - a.pts) : null;
    this.stage = 0; game.lights.enabled = true; game.lights.ambient = .4; O.music('closing'); O.Comms.reset();
    O.Comms.say('C:What a fortnight, folks! The closing ceremony of the Games of Mount Glory and Sunny Bay!', null, 9);
    O.Cabinet && null;
  },
  update(dt) {
    this.t += dt;
    for (const [i, d] of this.dancers.entries()) d.rig.update(dt, { x: d.x, y: d.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 * (i % 2 ? 1 : -1), pose: Math.floor(this.t + i) % 3 === 0 ? 'cheer' : Math.floor(this.t + i) % 3 === 1 ? 'wave' : null, run: .3 });
    if (Math.floor(this.t * 1.2) !== Math.floor((this.t - dt) * 1.2) && this.t > 18) { O.Art.firework(-200 + E.hash2(Math.floor(this.t), 5) * 400, 230, 160 + E.hash2(Math.floor(this.t), 6) * 80, ['#ff5a3a', '#ffd060', '#3fa8e8', '#ffffff']); O.sfx('firework', { vol: .35 }); }
    if (this.t > 8 && this.stage === 0) { this.stage = 1; O.sfx('boom'); O.stamp('OLYMPIYIKES!'); O.Comms.say('C:The snow cannon has... the snow cannon has put out the cauldron! || V:Of course it has.', null, 9); }
    if (this.t > 14 && this.stage === 1) { this.stage = 2; O.sfx('flame'); O.Crowd.doWave(4); O.Comms.say('V:And look. All eight of them. Relighting it together. ...Give me a second, Chip.', null, 9); }
    if (this.t > 20 && this.stage === 2) { this.stage = 3; O.Comms.say('P:Faster. Higher. Yikes.', null, 9); }
    if (this.t > 2 && (game.input.pressed('confirm') || game.input.clicked())) { if (this.stage < 3) { this.t = Math.max(this.t, [8.1, 14.1, 20.1][this.stage]); } else if (this.t > 22) O.go('credits', {}); }
    if (this.t > 34) O.go('credits', {});
  },
  draw(r) {
    game.focus(0, 70, 40); game.setZoom(1.2);
    ST().drawVenue(r, { night: true });
    for (const d of this.dancers) ST().athleteDraw(r, d, d.x, d.y, 0);
    const cx = 100; r.queue(cx, -30, 0, g => { const a = r.w(cx, -30, 0), b = r.w(cx, -30, 80); px.rect(g, a[0] - 4, b[1], 8, a[1] - b[1], '#8a7a5a'); px.poly(g, [[a[0] - 16, b[1]], [a[0] + 16, b[1]], [a[0] + 9, b[1] + 9], [a[0] - 9, b[1] + 9]], '#c8a050'); if (this.stage !== 1) for (let i = 0; i < 7; i++) px.disc(g, a[0] + Math.sin(game.real * 9 + i) * 4, b[1] - i * 4, 8 - i, ['#ff5a1a', '#ff7a2a', '#ffb03a', '#ffd060', '#fff0a0', '#ffffff', '#ffffff'][i]); else for (let i = 0; i < 5; i++) px.disc(g, a[0] + Math.sin(game.real * 3 + i) * 6, b[1] - i * 6, 5, '#e8f0fb'); }, { emissive: true, bias: -700 });
    game.lights.add(cx, -30, 90, 200, this.stage === 1 ? .3 : 1, { color: '#ffb060' });
    r.overlay(g => {
      // the final medal table on the jumbotron, the yikes reel
      const w = 190, x = r.W - w - 10; O.panel(g, x, 10, w, 104, { alpha: .9 }); O.text(g, 'FINAL MEDAL TABLE', x + w / 2, 14, '#ffd060', { align: 'center' });
      this.rows.slice(0, 8).forEach((q, i) => { O.Art.flag(g, x + 6, 26 + i * 11, 12, 8, q.nat); O.text(g, q.nat.id, x + 22, 26 + i * 11, '#ffffff', { font: 'tiny' }); O.text(g, q.g + '/' + q.s + '/' + q.b, x + 90, 26 + i * 11, '#ffffff', { font: 'tiny' }); O.text(g, 'YIKES ' + (O.meet.yikes[q.nat.id] || 0), x + w - 6, 26 + i * 11, '#ff8a6a', { align: 'right', font: 'tiny' }); });
      if (this.stage >= 3) { O.title(g, 'FASTER. HIGHER. YIKES.', r.W / 2, 20, 2); const bw = Math.min(r.W - 30, 420); O.panel(g, r.W / 2 - bw / 2, r.H - 112, bw, 70); O.text(g, 'YOUR NATION FINISHED #' + this.rank, r.W / 2, r.H - 106, '#ffd060', { align: 'center' }); O.wrap(this.ending, bw - 20, 1).slice(0, 4).forEach((ln, i) => O.text(g, ln, r.W / 2, r.H - 94 + i * 11, '#ffffff', { align: 'center' }));
        if (this.party) { O.text(g, 'PARTY CHAMPION: P' + (this.party[0].k + 1) + ' (' + this.party[0].nat + ') · ' + this.party.map(p => 'P' + (p.k + 1) + ' ' + p.pts).join('  '), r.W / 2, r.H - 54, '#4fe0a8', { align: 'center' }); } }
      O.Prompt.strip(g, r, [['confirm', this.stage >= 3 ? 'Credits' : 'Skip ahead']]);
    });
  }
});
O.scene('credits', {
  menu: false, lock: .4,
  enter() { this.t = 0; this.page = 0; this.pages = O.creditPages(); },
  update(dt) { this.t += dt; const I = game.input; if (I.pressed('right') || I.pressed('confirm') || I.clicked()) { this.page++; this.t = 0; } if (I.pressed('left')) this.page = Math.max(0, this.page - 1); if (I.pressed('cancel') || this.page >= this.pages.length) { O.store.set('games', null); O.go('title', {}); } if (this.t > 7) { this.page++; this.t = 0; } },
  draw(r) { O.bgCard(r); r.overlay(g => { O.stripeBg(g, r, game.real); const p = this.pages[Math.min(this.page, this.pages.length - 1)]; O.title(g, p[0], r.W / 2, 20, 2); p[1].forEach((ln, i) => O.text(g, ln, r.W / 2, 60 + i * 14, '#ffffff', { align: 'center' })); O.pageDots(g, r.W / 2, r.H - 40, this.pages.length, this.page); O.Prompt.strip(g, r, [['confirm', 'Next'], ['cancel', 'Title']]); }); }
});
O.creditPages = () => [['OLYMPIYIKES!', ['Faster. Higher. Yikes.', '', 'An original arcade multi-event game', 'inspired by the Summer and Winter Olympic Games.']],
  ['MADE BY', ['Planned by claude-opus-5-5 (max effort)', 'Built by claude-opus-5-5 (medium effort)', 'for michaelcrosato\'s cc-matrix', '', 'Engine: my-3D2dge ' + E.version + ' (modified, see ABOUT)', 'Online: AI Hub Session Protocol v1, client 1.4.0']],
  ['STARRING', O.NATIONS.map(n => n.athlete + ' · ' + n.name)],
  ['ON THE MIC', ['CHIP BELLOWS, play-by-play', 'DAME VERA VELOCITY, colour', 'THE STADIUM PA', 'and YIKESY, the mascot, as itself']],
  ['THANK YOU FOR PLAYING', ['Every sound, song, voice and picture', 'was written in code.', '', 'See you at the next Games.']]];

/* ---- Single Event: a 4 × 3 grid of event tiles ---- */
O.scene('single', {
  menu: true,
  enter() { this.g = new O.Grid10(12, 4, { i: this.lastI || 0 }); this.t = 0; O.music('menu'); },
  update(dt) {
    this.t += dt; const k = this.g.update(dt);
    if (k === 'cancel') return O.go('menu', {});
    if (k !== null) { this.lastI = k; const id = O.EVENT_LIST[k].id; O.go('nations', { next: 'single', event: id }); }
  },
  draw(r) {
    O.bgCard(r);
    r.overlay(g => {
      O.stripeBg(g, r, this.t); O.title(g, 'SINGLE EVENT', r.W / 2, 8, 3);
      const cols = 4, tw = Math.min(96, (r.W - 40) / cols - 8), th = 56, x0 = r.W / 2 - (cols * (tw + 8)) / 2 + 4, y0 = 44; this.g.rects = [];
      const cab = O.Cabinet.get();
      O.EVENT_LIST.forEach((d, i) => { const x = x0 + (i % cols) * (tw + 8), y = y0 + Math.floor(i / cols) * (th + 6), f = i === this.g.i; this.g.rects.push([x, y, tw, th]);
        O.panel(g, x, y, tw, th, { border: f ? '#ffd86a' : d.season === 'winter' ? '#3fa8e8' : '#ff6b4a', bg: f ? ['#3a2a10', '#1a1406'] : undefined });
        O.Art.picto(g, x + tw / 2 - 16, y + 4, d.pictogram, 2, d.season); O.text(g, d.short.toUpperCase(), x + tw / 2, y + 40, f ? '#ffe9a0' : '#ffffff', { align: 'center' });
        let best = 9; for (const n in cab) if (cab[n][d.id] && cab[n][d.id] < best) best = cab[n][d.id]; if (best < 4) O.Art.medal(g, x + tw - 8, y + 8, best); });
      const d = O.EVENT_LIST[this.g.i]; O.text(g, d.name + ' · ' + d.venue + ' · ' + d.howto.goal, r.W / 2, y0 + 3 * (th + 6) + 4, '#c8d0f0', { align: 'center' });
      O.Prompt.strip(g, r, [['move', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]);
    });
  },
  back() { O.go('menu', {}); return true; }
});

/* ---- Records: per-event top 5, Laurels, Cabinet ---- */
O.scene('records', {
  menu: true,
  enter() { this.tab = 0; this.rects = []; this.t = 0; O.music('table'); },
  update(dt) { this.t += dt; const n = O.EVENT_LIST.length + 2; this.tab = O.tabInput(game.input, this.tab, n, this.rects, true); if (game.input.pressed('cancel')) O.go('menu', {}); },
  draw(r) {
    O.bgCard(r);
    r.overlay(g => {
      O.stripeBg(g, r, this.t); O.title(g, 'RECORDS', r.W / 2, 6, 2);
      const names = O.EVENT_LIST.map(d => d.short.toUpperCase()).concat(['LAURELS', 'CABINET']);
      // show a window of tabs around the current one
      const start = Math.max(0, Math.min(names.length - 5, this.tab - 2)), vis = names.slice(start, start + 5), rr = [];
      O.tabs(g, 14, 30, vis, this.tab - start, rr); this.rects.length = 0; for (let k = 0; k < start; k++) this.rects.push([-99, -99, 0, 0]); this.rects.push(...rr);
      const w = Math.min(r.W - 30, 440), x = r.W / 2 - w / 2, y = 52;
      if (this.tab < O.EVENT_LIST.length) {
        const d = O.EVENT_LIST[this.tab], rows = O.Records.all()[d.id];
        O.panel(g, x, y, w, 26 + rows.length * 20); O.Art.picto(g, x + 8, y + 6, d.pictogram, 1, d.season); O.text(g, d.name + ' · TOP 5', x + 30, y + 9, '#f2b632');
        rows.forEach((row, i) => { const yy = y + 28 + i * 20; O.text(g, String(i + 1), x + 12, yy, '#ffffff', { scale: 1 }); O.Art.flag(g, x + 28, yy - 2, 16, 10, O.NAT[row.nat] || O.NATIONS[0]); O.text(g, row.ini || '---', x + 52, yy, '#ffd060'); O.text(g, row.name, x + 88, yy, '#ffffff'); O.text(g, d.measure.fmt(row.v), x + w - 10, yy, '#ffffff', { align: 'right' }); if (i === 0) O.text(g, d.matchEvent ? 'RECORD' : 'WR', x + w - 90, yy, '#ff6a3a', { align: 'right' }); });
      } else if (this.tab === O.EVENT_LIST.length) {
        const L = O.Laurels.get(); O.EVENT_LIST.forEach((d, i) => { const lx = x + (i % 4) * (w / 4), ly = y + Math.floor(i / 4) * 52, has = d.laurel && L[d.laurel.id]; O.panel(g, lx + 2, ly, w / 4 - 4, 48, { border: has ? '#f2c94c' : '#3a4070' }); O.Art.laurel(g, lx + 14, ly + 12, has ? '#f2c94c' : '#4a5080'); O.text(g, d.laurel.name, lx + 26, ly + 6, has ? '#ffd060' : '#7a82aa', { font: 'tiny' }); O.wrap(d.laurel.text, w / 4 - 16, 1).slice(0, 3).forEach((ln, k) => O.text(g, ln, lx + 6, ly + 20 + k * 9, '#9aa2c8', { font: 'tiny' })); });
      } else {
        const C = O.Cabinet.get(); O.panel(g, x, y, w, 24 + 8 * 18); O.EVENT_LIST.forEach((d, j) => O.Art.picto(g, x + 60 + j * ((w - 70) / 12), y + 4, d.pictogram, 1, d.season));
        O.NATIONS.forEach((n, i) => { const yy = y + 24 + i * 18; O.Art.flag(g, x + 8, yy, 16, 10, n); O.text(g, n.id, x + 28, yy + 1, '#ffffff'); O.EVENT_LIST.forEach((d, j) => { const m = C[n.id] && C[n.id][d.id]; if (m && m < 4) O.Art.medal(g, x + 68 + j * ((w - 70) / 12), yy + 4, m); }); });
        O.text(g, 'Gold in an event turns that nation\'s gear golden for the event.', r.W / 2, y + 24 + 8 * 18 + 6, '#9aa2c8', { align: 'center' });
      }
      O.Prompt.strip(g, r, [['tabL', ''], ['tabR', 'Switch'], ['cancel', 'Back']]);
    });
  },
  back() { O.go('menu', {}); return true; }
});

/* ---- How to Play: basics pages + every event's card ---- */
const BASICS = [
  ['MASH', 'Alternate the two mash buttons as fast as you can. Same button twice in a row = a stumble; keep doing it and you faceplant. Settings → Mash assist offers one-button and hold modes.', [['mashL'], ['mashR']]],
  ['TIMING', 'Needles, rings and beats: press on the gold. Perfect timing gives speed, height, style and HYPE. Settings → Timing assist widens every window.', [['action']]],
  ['HYPE & YIKES TURBO', 'Good play fills your flame. When it is full, fire YIKES TURBO: every event has its own (HYPER ARM, DOLPHIN MODE, ROCKET SKIS, STAR POWER, ON FIRE...).', [['turbo']]],
  ['YIKES!', 'False starts, belly flops, crashes, flips: every event can go gloriously wrong. A yikes gives sympathy hype, so a comeback is always on. The closing ceremony shows each nation\'s yikes reel.', [['alt']]]
];
O.scene('howto', {
  menu: true,
  enter() { this.p = 0; this.t = 0; this.rects = []; },
  update(dt) { this.t += dt; const n = BASICS.length + O.EVENT_LIST.length; this.p = O.tabInput(game.input, this.p, n, this.rects, true); if (game.input.pressed('cancel')) O.go('menu', {}); },
  draw(r) {
    O.bgCard(r);
    r.overlay(g => {
      O.stripeBg(g, r, this.t); O.title(g, 'HOW TO PLAY', r.W / 2, 6, 2);
      const w = Math.min(r.W - 30, 460), x = r.W / 2 - w / 2, y = 40; O.panel(g, x, y, w, r.H - 90);
      if (this.p < BASICS.length) { const [t, txt, acts] = BASICS[this.p]; O.title(g, t, r.W / 2, y + 10, 2); let xx = r.W / 2 - 20; for (const a of acts) xx += O.Prompt.draw(g, xx, y + 40, a[0], { size: 2 }) + 6; O.wrap(txt, w - 30, 1).forEach((ln, i) => O.text(g, ln, r.W / 2, y + 70 + i * 12, '#ffffff', { align: 'center' })); }
      else { const d = O.EVENT_LIST[this.p - BASICS.length]; O.Art.picto(g, x + 12, y + 10, d.pictogram, 2, d.season); O.title(g, d.name, x + 52, y + 12, 2, { align: 'left' }); O.text(g, d.howto.goal, x + 52, y + 34, '#ffd060');
        d.howto.rows.forEach((row, k) => { const yy = y + 56 + k * 22; let xx = x + 20; const [acts, verb] = row; if (acts === 'pair') xx += O.Prompt.pair(g, xx, yy, { size: 2 }) + 8; else if (acts) for (const a of acts) xx += O.Prompt.draw(g, xx, yy, a, { size: 2 }) + 6; O.text(g, verb, Math.max(xx, x + 110), yy + 4, '#ffffff'); });
        O.text(g, 'YIKES: ' + (d.yikesKinds || []).join(' · '), x + 20, y + 60 + d.howto.rows.length * 22, '#ff8a6a'); O.text(g, 'LAUREL: ' + d.laurel.name + ' — ' + d.laurel.text, x + 20, y + 72 + d.howto.rows.length * 22, '#f2c94c'); }
      O.pageDots(g, r.W / 2, r.H - 42, Math.min(16, BASICS.length + O.EVENT_LIST.length), this.p);
      O.Prompt.strip(g, r, [['move', 'Page'], ['cancel', 'Back']]);
    });
  },
  back() { O.go('menu', {}); return true; }
});

/* ---- About & Credits: paged (Source Information · Testing · Engine · Prompt feedback · Credits & engine changes · Controls) ---- */
O.scene('about', {
  menu: true,
  enter() { this.p = 0; this.t = 0; this.rects = []; },
  update(dt) { this.t += dt; this.p = O.tabInput(game.input, this.p, O.ABOUT.pages().length, this.rects, true); if (game.input.pressed('cancel')) O.go('menu', {}); },
  draw(r) {
    O.bgCard(r);
    r.overlay(g => {
      O.stripeBg(g, r, this.t); const pages = O.ABOUT.pages(), pg = pages[this.p];
      O.title(g, pg.title, r.W / 2, 6, 2);
      const w = r.W - 24, x = 12, y = 30; O.panel(g, x, y, w, r.H - 72);
      if (pg.controls) { const acts = [['move', 'Move · steer · aim'], ['mashL', 'Mash left · pass · tuck'], ['mashR', 'Mash right · check · pike'], ['action', 'Action · throw · jump · shoot'], ['turbo', 'YIKES TURBO'], ['alt', 'Hold · breathe · tuck'], ['pause', 'Pause']]; acts.forEach(([a, l], i) => { const yy = y + 10 + i * 20; O.Prompt.draw(g, x + 20, yy, a, { device: 'keyboard', size: 1 }); O.Prompt.draw(g, x + 80, yy, a, { device: 'gamepad', size: 1 }); O.text(g, l, x + 130, yy + 1, '#ffffff'); }); O.text(g, 'Mouse: menus everywhere; archery aims; curling aims the broom; hockey shoots and passes at the cursor.', x + 20, y + 156, '#c8d0f0'); }
      else { let yy = y + 6; for (const ln of pg.lines) { const wr = O.wrap(ln, w - 20, 1); for (const s of wr) { if (yy > r.H - 52) break; O.text(g, s, x + 10, yy, s.endsWith(':') || /^[A-Z][A-Za-z &]+: /.test(s) ? '#ffffff' : '#dfe4ff', { font: 'tiny' }); yy += 8; } yy += 2; } }
      O.pageDots(g, r.W / 2, r.H - 38, pages.length, this.p);
      O.Prompt.strip(g, r, [['move', 'Page'], ['cancel', 'Back']]);
    });
  },
  back() { O.go('menu', {}); return true; }
});

/* ---- the Pose Lab (#poselab): every custom pose on a rig ---- */
O.scene('poselab', {
  view: 'brawler',
  enter(d) { this.i = Math.max(0, O.Pose.names.indexOf(d.pose || '')); this.rig = O.makeRig(O.NATIONS[0], 'track'); this.t = 0; },
  update(dt) { this.t += dt; const I = game.input; if (I.pressed('right')) this.i = (this.i + 1) % O.Pose.names.length; if (I.pressed('left')) this.i = (this.i + O.Pose.names.length - 1) % O.Pose.names.length; if (I.pressed('cancel')) O.go('menu', {});
    const nm = O.Pose.names[this.i]; this.rig.bodyPitch = 0; O.Pose.set(this.rig, nm, { t: this.t, phase: this.t * 4, u: (Math.sin(this.t * 2) + 1) / 2, h: (Math.sin(this.t) + 1) / 2 }); this.rig.update(dt, { x: 0, y: 40, z: 20, vx: 0, vy: 0, facing: 0 }); },
  draw(r) { game.focus(0, 40, 30); game.setZoom(2.5); r.sky(['#202850', '#303a70', '#404a90']); r.actor(0, 40, 20, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view)); r.overlay(g => { O.text(g, 'POSE LAB · ' + O.Pose.names[this.i], r.W / 2, 10, '#ffd060', { align: 'center', scale: 2 }); O.Prompt.strip(g, r, [['move', 'Pose'], ['cancel', 'Back']]); }); }
});
})();
