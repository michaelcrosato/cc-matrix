/* 63-cutscene: painted interiors (the shop's back room, the lord's moonlit garden), the opening crawl, briefings with
 * live rigs, portraits and gibberish voices, and the ending with its credits roll. Hold Start / Esc to skip. */
const blend = (g, a, mode, fn) => px.blend(g, a, mode, fn);
B.paint = {
  shop(g, W, H, t) {
    px.rect(g, 0, 0, W, H, '#1a1210');
    const fy = Math.round(H * .68);
    for (let x = 0; x < W; x += 34) { px.rect(g, x, 20, 32, fy - 24, '#e8d8b0'); for (let k = 1; k < 4; k++) px.rect(g, x, 20 + k * (fy - 24) / 4, 32, 1, '#6a4a30'); for (let k = 1; k < 3; k++) px.rect(g, x + k * 11, 20, 1, fy - 24, '#6a4a30'); px.rect(g, x + 32, 14, 2, fy - 14, '#3a2418'); }
    px.rect(g, 0, 12, W, 8, '#3a2418'); px.rect(g, 0, fy - 4, W, 4, '#2a1a10');
    blend(g, .35, 'multiply', () => px.rect(g, 0, 20, W, fy - 24, '#c08050'));
    for (let y = fy; y < H; y += 6) px.rect(g, 0, y, W, 5, y % 12 ? '#4a3422' : '#523a26');
    // shelves of lunchboxes
    for (let k = 0; k < 3; k++) { const x = W - 70 + k * 18, y = fy - 10; for (let j = 0; j < 4 - k % 2; j++) { px.rect(g, x, y - j * 7, 15, 6, j % 2 ? '#8a1c1c' : '#1a1214'); px.rect(g, x, y - j * 7, 15, 1, '#e8b04a'); } }
    // the lantern and its glow
    const lx = 46, ly = 34 + Math.sin(t * 1.5) * 1; px.line(g, lx, 12, lx, ly - 8, '#2a1a10');
    blend(g, .25 + Math.sin(t * 7) * .03, 'add', () => { px.disc(g, lx, ly, 46, '#a05a20'); px.disc(g, lx, ly, 24, '#c87a30'); });
    px.ell ? px.ell(g, lx, ly, 6, 8, '#ffb060') : px.disc(g, lx, ly, 7, '#ffb060'); px.rect(g, lx - 4, ly - 9, 8, 2, '#2a1a10'); px.rect(g, lx - 4, ly + 7, 8, 2, '#2a1a10');
    px.sprite(g, B.CREST, lx - 7, ly - 6);
  },
  garden(g, W, H, t) {
    for (let y = 0; y < H; y++) px.rect(g, 0, y, W, 1, E.mix('#0a1030', '#2a3a6a', y / H));
    for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 53) % Math.round(H * .5); px.dot(g, x, y, i % 5 ? '#8a9ad8' : '#ffffff'); }
    const mx = Math.round(W * .72), my = Math.round(H * .24); blend(g, .25, 'add', () => px.disc(g, mx, my, 34, '#5a6aa8')); px.disc(g, mx, my, 20, '#f4ecd0'); px.disc(g, mx + 5, my - 3, 4, '#e0d4b0'); px.disc(g, mx - 6, my + 5, 3, '#e0d4b0');
    const fy = Math.round(H * .66);
    px.poly(g, [[0, fy], [W * .2, fy - 40], [W * .45, fy - 20], [W * .7, fy - 50], [W, fy - 18], [W, fy], [0, fy]], '#141c34');
    // a pine silhouette
    const px0 = Math.round(W * .18); px.rect(g, px0, fy - 70, 4, 70, '#1a1410'); for (let k = 0; k < 4; k++) px.ell ? px.ell(g, px0 + 2 + (k % 2 ? 14 : -10), fy - 70 + k * 14, 22 - k * 3, 6, '#10241a') : px.disc(g, px0 + 2, fy - 70 + k * 14, 14, '#10241a');
    for (let y = fy; y < H; y += 5) px.rect(g, 0, y, W, 4, y % 10 ? '#3a2a1e' : '#42301f');
    const sx = Math.round(W * .85); px.rect(g, sx - 3, fy - 20, 6, 20, '#5a5a62'); px.rect(g, sx - 6, fy - 26, 12, 6, '#6a6a72'); blend(g, .3, 'add', () => px.disc(g, sx, fy - 23, 14, '#a06a30')); px.rect(g, sx - 2, fy - 25, 4, 3, '#ffb060');
  },
  night(g, W, H, t) {
    for (let y = 0; y < H; y++) px.rect(g, 0, y, W, 1, E.mix('#05060f', '#1e1430', y / H));
    for (let i = 0; i < 60; i++) { const x = (i * 131) % W, y = (i * 71) % H; if ((i + Math.floor(t * 2)) % 9) px.dot(g, x, y, '#6a6aa0'); }
    const mx = Math.round(W * .5), my = Math.round(H * .34); blend(g, .2, 'add', () => px.disc(g, mx, my, 60, '#5a4a8a')); px.disc(g, mx, my, 34, '#f0e8d0'); px.disc(g, mx + 8, my - 6, 6, '#ddd0b0'); px.disc(g, mx - 10, my + 8, 4, '#ddd0b0');
  }
};

/* the briefing / story scene: data { lines: [[who, key]], place, then: fn } */
B.scenes.story = {
  view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [],
  enter(d) {
    this.d = d; this.i = -1; this.skipT = 0; this.talk = new E.Dialog(game, { voice: null, speed: B.ts() }); this.talk.voice = null; this.t = 0;
    this.rigs = {}; const who = new Set(d.lines.map(l => l[0] === 'hero' ? B.save.data && B.save.data.character || 'sojiro' : l[0])); let k = 0;
    for (const w of who) { const sp = B.STORY.speakers[w]; if (!sp) continue; const rig = B.RIGS[sp.rig](sp.arg); this.rigs[w] = { rig, x: -70 + (k++) * (140 / Math.max(1, who.size - 1 || 1)), sp }; }
    B.music.play(d.music || 'shop'); game.follow(null); game.cam.bounds = null; game.lights.enabled = false; this.next();
  },
  next() {
    const d = this.d; this.i++;
    if (this.i >= d.lines.length) { const f = d.then; this.d.then = null; if (f) f(); return; }
    let [who, key] = d.lines[this.i]; const ch = (B.save.data && B.save.data.character) || 'sojiro'; if (who === 'hero') who = ch;
    const sp = B.STORY.speakers[who], R = this.rigs[who]; this.who = who;
    const text = B.STORY.line(key, ch) || key;
    this.talk.speed = B.ts(); this.talk.say(Array.isArray(text) ? text : [text], { name: sp ? sp.name : who, portrait: R ? R.rig : null, onDone: () => this.next() });
    this.voice = sp ? sp.voice : 'guard';
  },
  update(dt) {
    this.t += dt; const I = game.input;
    if (I.down('start') || I.down('pause')) { this.skipT += dt; if (this.skipT > .6) { this.skipT = -99; this.talk.close(); const f = this.d.then; this.d.then = null; if (f) f(); return; } } else if (this.skipT > 0) this.skipT = 0;
    this.talk.update(dt); B.Voice.dialog(this.talk, this.voice);
    for (const w in this.rigs) { const R = this.rigs[w]; R.rig.update(dt, { x: R.x, y: 0, z: 0, vx: 0, vy: 0, facing: R.x < 0 ? 0 : Math.PI, pose: w === 'granny' && this.d.place === 'garden' ? 'kneel' : null, expr: w === this.who && this.talk.typing ? 'smile' : null }); R.rig._talk = w === this.who && this.talk.typing; }
    game.focus(0, 0, 44 + (game.H / 2 - 70) / -game.view.bz);
  },
  draw(r) {
    r.sky(['#000000', '#000000', '#000000']);
    const P = B.paint[this.d.place] || B.paint.shop; r.decal(g => P(g, r.W, r.H, this.t));
    for (const w in this.rigs) { const R = this.rigs[w]; r.actor(R.x, 0, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view)); }
    this.talk.draw(r);
    r.overlay(g => { if (this.d.title) { E.font.text(g, this.d.title, r.W / 2, 6, '#e8b04a', { align: 'center', shadow: '#000', outline: false, scale: 1 }); } B.rich(g, 'Hold {a:start} to skip', r.W - 6, 6, '#b8a890', { align: 'right' }); if (this.skipT > 0) E.ui.bar(g, r.W - 60, 18, 54, 2, this.skipT / .6, '#e8b04a'); });
  }
};
/* the opening crawl */
B.scenes.crawl = {
  view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [],
  enter(d) { this.d = d; this.t = 0; this.line = -1; B.music.play('title'); game.follow(null); },
  update(dt) {
    const I = game.input; this.t += dt * (I.down('confirm') ? 3 : 1);
    const L = B.STORY.crawl, k = Math.floor(this.t / 3.4);
    if (k !== this.line && k < L.length) { this.line = k; B.Voice.speak(L[k], 'granny', { vol: .7 }); }
    if (this.t > L.length * 3.4 + 1.5 || I.pressed('start') || I.pressed('pause')) { const f = this.d.then; this.d.then = null; if (f) f(); }
  },
  draw(r) {
    r.sky(['#0a0806', '#14100c', '#1a1410']);
    r.overlay(g => {
      for (let y = 0; y < r.H; y += 3) px.rect(g, 0, y, r.W, 1, y % 6 ? '#16120e' : '#1a150f');
      const L = B.STORY.crawl;
      L.forEach((s, i) => { const a = clamp(this.t / 3.4 - i, 0, 1); if (a <= 0) return; const y = Math.round(r.H * .2 + i * 26 - Math.max(0, this.t - 10) * 3); const lines = E.font.wrap(s, r.W - 60); lines.forEach((ln, j) => E.font.text(g, ln, r.W / 2, y + j * 10, a > .5 ? '#f4ead5' : '#8a8070', { align: 'center', outline: false, shadow: '#000' })); });
      B.drawKanji(g, 'sei', 10, r.H - 40, .9, '#3a1410', '#1a0a08');
      B.rich(g, '{a:confirm} faster   {a:start} skip', r.W - 6, r.H - 12, '#8a7a60', { align: 'right' });
    });
  }
};
/* the ending: panels of the dawn, the shop, the post-credits scene, then the credits over the moon */
B.scenes.ending = {
  view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [],
  enter() {
    this.t = 0; this.phase = 'story'; B.music.play('ending'); game.follow(null);
    B.scenes.story.enter.call(this.st = Object.create(B.scenes.story), { place: 'shop', music: 'ending', lines: [['granny', 'end_1'], ['granny', 'end_2'], ['hero', 'end_3'], ['hero', 'end_4'], ['hotaru', 'end_post']], then: () => { this.phase = 'credits'; this.t = 0; } });
  },
  update(dt) {
    if (this.phase === 'story') { this.st.update(dt); return; }
    const I = game.input; this.t += dt * (I.down('confirm') || I.down('jump') ? 4 : 1);
    if (this.t > B.CREDITS.length * 1.6 + 8 || I.pressed('start')) { game.go('title'); }
  },
  draw(r) {
    if (this.phase === 'story') { B.scenes.story.draw.call(this.st, r); return; }
    r.sky(['#000', '#000', '#000']); r.decal(g => B.paint.night(g, r.W, r.H, this.t));
    r.overlay(g => {
      const y0 = r.H + 10 - this.t * 22;
      B.CREDITS.forEach((c, i) => { const y = Math.round(y0 + i * 16); if (y < -10 || y > r.H + 10) return; const head = c.startsWith('#'); E.font.text(g, head ? c.slice(1) : c, r.W / 2, y, head ? '#e8b04a' : '#f4ead5', { align: 'center', shadow: '#000', outline: false, scale: head ? 1 : 1 }); });
      B.rich(g, 'Hold {a:confirm} faster   {a:start} title', r.W - 6, r.H - 12, '#8a7a60', { align: 'right' });
    });
  }
};
B.CREDITS = ['#BENTOU 2', 'Birth of the Lunchbox Assassins', '', '#An original game', 'inspired by Tenchu 2: Birth of the Stealth Assassins', '(Acquire / Activision, 2000). Not affiliated.', '',
  '#Built by', 'Claude (Anthropic claude-opus-5-5, medium effort)', 'in Claude Code', '', '#Plan', 'PLAN.md', '', '#Engine', 'my-3D2dge v0.85.2 (michaelcrosato/my-3d2dge)', 'with nine small patches', '',
  '#Online', 'AI Hub Session Protocol v1, client 1.4.0', '', '#Art, music, sound and voices', 'all generated in code', '', '#Cast', 'Sojiro  -  Kaede  -  Granny Oshima', 'Lord Mibu Takanori  -  Chamberlain Kurogane',
  'Magistrate Kanemori  -  Gonroku the Iron Ox', 'Hotaru of the Red Lantern  -  Tobei the courier', 'Brother Ittetsu  -  Ume, Kiku and Masa', '', '#Thank you for playing', 'Seen by none. Fed by all.'];
