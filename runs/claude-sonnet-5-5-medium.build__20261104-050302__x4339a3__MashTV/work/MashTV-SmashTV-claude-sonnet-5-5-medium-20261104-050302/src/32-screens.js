// MASH TV: front-end and between-room scenes (title, difficulty, lobby, how to play, episodes, scores, about, cards, recap, endings).
const SC = MT.scenes = MT.scenes || {};
const cx = r => r.W / 2;
// ---- shared backdrop: studio dark with sweeping spotlights and marquee frame ----
MT.backdrop = function (r, t, o = {}) {
  r.sky(o.sky || ['#0a0418', '#2a1050', '#12082a']);
  r.overlay(g => {
    px.blend(g, .22, 'add', () => { for (let i = 0; i < 4; i++) { const a = Math.sin(t * .6 + i * 1.9) * .5, x0 = r.W * (i + .5) / 4, col = ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a60ff'][i]; px.poly(g, [[x0 - 4, 0], [x0 + 4, 0], [x0 + a * r.H * 1.2 + 40, r.H], [x0 + a * r.H * 1.2 - 40, r.H]], col); } });
    px.rect(g, 0, r.H - 40, r.W, 40, '#14081c'); for (let x = 0; x < r.W; x += 12) px.rect(g, x, r.H - 40, 1, 40, '#1c0e2c');
    if (o.bulbs !== false) UI.bulbs(g, 3, 3, r.W - 6, r.H - 6, t, '#fff7a0', true);
  });
};
// front-end idle → attract (10 s without input on any device)
MT.frontIdle = function (dt, ok) {
  const game = MT.game; MT.idle.step(game, dt);
  if (MT.idle.t >= 10 && ok !== false && !(game.menuOpen && game.menuOpen())) { MT.idle.t = 0; game.go('attract'); return true; }
  return false;
};
MT.resetIdle = () => { MT.idle.t = 0; };
function bgText(g, s, x, y, c, o) { UI.text(g, s, x, y, c, o); }

// ---- TITLE ----
SC.title = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; this.state = 'press'; MT.music.play('theme'); MT.hud.cursorOn(true); MT.resetIdle(); MT.touchOnly = MT.detectTouchOnly(); this.menu = null; this.lastTouch = MT.touchOnly; MT.net && MT.net.onTitle && MT.net.onTitle(); this.run = null; MT.run = null; MT.cheatsReset && MT.cheatsReset(); MT.game.timeScale = 1; MT.overlay.open = 0; MT.ov.cur = null; MT.game.allowJoin(false); },
  buildMenu() {
    const game = MT.game;
    this.menu = new UI.Menu([
      { label: 'START THE SHOW', onPick: () => game.go('difficulty') }, { label: 'EPISODES', onPick: () => game.go('episodes') }, { label: 'HOW TO PLAY', onPick: () => game.go('howto') },
      { label: 'TOP EARNERS', onPick: () => game.go('scores', { fresh: false }) }, { label: 'OPTIONS', onPick: () => game.menu('settings') }, { label: 'ABOUT & CREDITS', onPick: () => game.go('about') }], { y: 108, rowH: 18, w: 170, scale: 1 });
  },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game; MT.lines.update(dt);
    if (MT.touchOnly) {
      if (!MT.detectTouchOnly() && (MT.keyEver || MT.padEver)) MT.touchOnly = false;
      const c = UI.clicked(); if (c && this.btn && UI.inRect(c, ...this.btn)) game.menu('settings');
      if (MT.frontIdle(dt)) return; return;
    }
    if (this.state === 'press') {
      if (game.players.some(p => p.anyPressed()) || UI.clicked()) { this.state = 'menu'; this.buildMenu(); MT.sfx('confirm'); MT.resetIdle(); game.players.forEach(p => p.consumeAll()); }
    } else { this.menu.update(dt); }
    MT.frontIdle(dt);
  },
  draw(r) {
    MT.backdrop(r, this.t);
    const game = MT.game, k = E.ease.outBounce(Math.min(1, this.t / 1.1));
    r.overlay(g => {
      const ly = 20 + (k - 1) * 90 + (this.state === 'menu' ? 0 : 20);
      // CRT tv outline with bunny ears
      const tw = 210, th = 70, tx = r.W / 2 - tw / 2, ty = ly + 6;
      px.line(g, r.W / 2 - 4, ty, r.W / 2 - 26, ty - 14, '#c8d0e0', 2); px.line(g, r.W / 2 + 4, ty, r.W / 2 + 26, ty - 14, '#c8d0e0', 2); px.disc(g, r.W / 2 - 26, ty - 14, 2, '#ffcc33'); px.disc(g, r.W / 2 + 26, ty - 14, 2, '#ffcc33');
      E.ui.box(g, tx, ty, tw, th, { bg: ['#1c1034', '#0c0418'], border: '#c8d0e0', alpha: 1 });
      UI.bulbs(g, tx - 2, ty - 2, tw + 4, th + 4, this.t, '#fff7a0', true);
      UI.title(g, 'MASH TV', r.W / 2, ty + 12, 5);
      UI.text(g, MT.TEXT.sub, r.W / 2, ty + th - 14, '#2ee6ff', { align: 'center', scale: 1 });
      const sp = Math.floor(this.t * 3) % 4; px.dot(g, tx + tw - 18, ty + 14 - sp, '#fff'); px.line(g, tx + tw - 18, ty + 9, tx + tw - 18, ty + 19, '#fff', 1); px.line(g, tx + tw - 23, ty + 14, tx + tw - 13, ty + 14, '#fff', 1);
      if (MT.touchOnly) {
        const bw = 250, bh = 78, bx = r.W / 2 - bw / 2, by = r.H / 2 + 10; UI.panel(g, bx, by, bw, bh, { bulbs: true, chase: true });
        UI.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, by + 10, '#ff5a8a', { align: 'center', scale: 1 }); UI.text(g, 'CONNECT A GAMEPAD OR PRESS A KEY', r.W / 2, by + 24, '#c8c0e0', { align: 'center' });
        this.btn = [r.W / 2 - 50, by + 42, 100, 26]; E.ui.box(g, ...this.btn, { bg: ['#5a1a66', '#2a0f40'], border: '#ffcc33', alpha: 1 }); UI.text(g, 'SETTINGS', r.W / 2, by + 49, '#ffe068', { align: 'center', scale: 1 });
      } else if (this.state === 'press') {
        if (Math.floor(this.t * 2) % 2 === 0) { const pi = MT.lastInput(); const w = F.width('PRESS  ') + MT.glyph.width('confirm', pi); UI.text(g, 'PRESS', r.W / 2 - w / 2, r.H / 2 + 42, '#ffe068', { scale: 1 }); MT.glyph.draw(g, r.W / 2 - w / 2 + F.width('PRESS ') + 3, r.H / 2 + 40, 'confirm', pi); }
        UI.text(g, MT.TEXT.tagline, r.W / 2, r.H / 2 + 62, '#c8c0e0', { align: 'center' });
      }
      UI.text(g, E.versionLabel ? E.versionLabel() + ' · MASH TV ' + MT.VERSION : MT.VERSION, 6, r.H - 10, '#7a6a98', { font: 'tiny' });
    });
    if (this.state === 'menu' && !MT.touchOnly) { this.menu.draw(r); UI.promptBar(r, [['confirm', 'SELECT'], ['dpad', 'MOVE']]); }
  }
};
// ---- DIFFICULTY ----
SC.difficulty = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; const g = MT.game; this.menu = new UI.Menu(['ROOKIE', 'CONTESTANT', 'CHAMPION'].map(n => ({ label: n, onPick: () => { this.pick = n; g.go('lobby', { diff: n }); } })), { y: 76, rowH: 24, w: 170, scale: 2, start: 1, onCancel: () => g.go('title') }); MT.resetIdle(); },
  update(dt) { this.t += dt; UI.t += dt; this.menu.update(dt); MT.frontIdle(dt); },
  draw(r) {
    MT.backdrop(r, this.t); const it = ['ROOKIE', 'CONTESTANT', 'CHAMPION'][this.menu.i], d = MT.DIFF[it];
    r.overlay(g => { UI.title(g, 'CHOOSE YOUR ODDS', r.W / 2, 26, 3); const desc = { ROOKIE: 'EASY GOONS. SLOW BULLETS. A SOFT LANDING.', CONTESTANT: 'THE SHOW AS THE NETWORK INTENDED.', CHAMPION: 'ONE HIT AND YOU\'RE A COMMERCIAL BREAK.' }[it];
      UI.panel(g, r.W / 2 - 150, 156, 300, 44, { bulbs: false }); UI.text(g, desc, r.W / 2, 162, '#fff7e8', { align: 'center' }); UI.text(g, 'HP ' + d.hp + '   LIVES ' + d.lives, r.W / 2, 178, '#7affb0', { align: 'center', scale: 1 }); });
    this.menu.draw(r); UI.promptBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
  }
};
// ---- LOBBY ----
SC.lobby = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    const game = MT.game; this.t = 0; this.diff = d.diff || 'CONTESTANT'; this.slots = [{ in: true, ready: false, look: 0, input: game.input }, { in: false }, { in: false }, { in: false }]; this.count = null;
    game.allowJoin({ max: 4, keys: false, onJoin: (input, n) => { const s = this.slots[n - 1]; if (s) { s.in = true; s.ready = false; s.look = n - 1; s.input = input; } } });
    for (let i = 1; i < game.players.length; i++) { const s = this.slots[i]; if (s) { s.in = true; s.ready = false; s.look = i; s.input = game.players[i]; } }
    this.rigs = {}; MT.resetIdle();
  },
  exit() { MT.game.allowJoin(false); },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game; MT.idle.step(game, dt);
    if (MT.idle.t >= 10 && this.slots.filter(s => s.in).length === 1 && !this.slots[0].ready) { MT.idle.t = 0; game.go('attract'); return; }
    this.slots.forEach((s, i) => { if (!s.in) return; const I = s.input; if (!I) return;
      if (!s.ready) { if (I.pressed('left')) { s.look = (s.look + 3) % 4; MT.sfx('blip'); } if (I.pressed('right')) { s.look = (s.look + 1) % 4; MT.sfx('blip'); } if (I.pressed('confirm') || I.pressed('start') && false) { s.ready = true; MT.sfx('confirm'); } else if (I.pressed('cancel')) { if (i === 0) { MT.sfx('back'); game.go('difficulty'); return; } s.in = false; game.removePlayer(I); } }
      else if (I.pressed('cancel')) { s.ready = false; MT.sfx('back'); } });
    const c = UI.clicked(); if (c) { const bw = r_lastW / 4; for (let i = 0; i < 4; i++) { const x = i * bw; if (c[0] >= x && c[0] < x + bw && this.slots[i].in && c[1] > 60 && c[1] < 170) { const s = this.slots[i]; if (c[0] > x + bw * .6 && !s.ready) s.look = (s.look + 1) % 4; else if (c[0] < x + bw * .4 && !s.ready) s.look = (s.look + 3) % 4; else s.ready = !s.ready; MT.sfx('confirm'); } } }
    const ins = this.slots.filter(s => s.in);
    if (ins.length && ins.every(s => s.ready)) { if (this.count === null) { this.count = 2; MT.sfx('mashStart'); } this.count -= dt; if (this.count <= 0) this.start(); } else this.count = null;
  },
  start() {
    const game = MT.game, players = []; this.slots.forEach((s, i) => { if (s.in) players.push({ slot: i, look: s.look, input: s.input }); });
    MT.newRun({ mode: 'arcade', diff: this.diff, players }); game.go('coldOpen');
  },
  draw(r) {
    r_lastW = r.W; MT.backdrop(r, this.t);
    r.overlay(g => {
      UI.title(g, "TONIGHT'S CONTESTANTS", r.W / 2, 12, 2);
      const bw = r.W / 4;
      this.slots.forEach((s, i) => {
        const x = i * bw + 4, w = bw - 8, y = 40, col = MT.PCOL[i];
        E.ui.box(g, x, y, w, 120, { bg: s.in ? ['#2a1446', '#140a24'] : ['#140a24', '#0a0414'], border: s.in ? col : '#3a2a50', alpha: .9 });
        px.blend(g, .25, 'add', () => px.poly(g, [[x + w / 2 - 6, y], [x + w / 2 + 6, y], [x + w - 6, y + 100], [x + 6, y + 100]], s.in ? col : '#444'));
        px.ell(g, x + w / 2, y + 104, w / 2 - 8, 6, s.in ? col : '#3a2a50');
        if (s.in) {
          const L = MT.LOOKS[s.look]; const key = i + ':' + s.look; if (!this.rigs[key]) this.rigs[key] = MT.contestantRig({ look: s.look, color: col }); const rig = this.rigs[key];
          if (rig && !MT.cfg.skipRigs) { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: s.ready ? 'cheer' : 'hips', expr: s.ready ? 'smile' : undefined }); try { rig.drawPortrait(g, x + w / 2 - 22, y + 14, 44, {}); } catch (e) { /* */ } }
          UI.text(g, MT.PNAMES[s.look], x + w / 2, y + 62, col, { align: 'center' }); UI.text(g, 'P' + (i + 1), x + 6, y + 4, col, { scale: 1 });
          const lines = F.wrap(MT.TEXT.looks[MT.PNAMES[s.look]], w - 8, { font: 'tiny' }); lines.slice(0, 4).forEach((l, k) => UI.text(g, l, x + w / 2, y + 74 + k * 7, '#c8c0e0', { align: 'center', font: 'tiny' }));
          UI.text(g, s.ready ? 'READY!' : '←  →', x + w / 2, y + 104, s.ready ? '#7affb0' : '#ffe068', { align: 'center' });
        } else { UI.text(g, 'EMPTY PODIUM', x + w / 2, y + 44, '#6a5a80', { align: 'center' }); { const fake = { lastDevice: 'gamepad', padStyle: () => MT.glyph.family(MT.lastInput()) }; const gw = MT.glyph.width('join', fake); const tw = gw + 4 + F.width('TO JOIN'); MT.glyph.draw(g, Math.round(x + w / 2 - tw / 2), y + 60, 'join', fake); UI.text(g, 'TO JOIN', Math.round(x + w / 2 - tw / 2 + gw + 4), y + 62, '#fff7e8', { scale: 1 }); UI.text(g, 'ON A GAMEPAD', x + w / 2, y + 74, '#c8c0e0', { align: 'center', font: 'tiny' }); } }
      });
      if (this.count !== null) UI.title(g, "LET'S PLAY!  " + Math.max(1, Math.ceil(this.count)), r.W / 2, 172, 3);
    });
    UI.promptBar(r, [['confirm', 'READY'], ['pgL', 'LOOK'], ['cancel', 'BACK']]);
  }
};
let r_lastW = 427;
// ---- HOW TO PLAY ----
SC.howto = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.page = 0; this.t = 0; this.from = d && d.from; MT.resetIdle(); },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game, n = MT.TEXT.howto.length;
    if (UI.anyPressed('right') || UI.anyPressed('tabR')) { this.page = (this.page + 1) % n; MT.sfx('tick'); } if (UI.anyPressed('left') || UI.anyPressed('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('tick'); }
    const c = UI.clicked(); if (c) { if (c[0] > r_lastW / 2) this.page = (this.page + 1) % n; else this.page = (this.page + n - 1) % n; MT.sfx('tick'); }
    if (UI.anyPressed('cancel') || UI.anyPressed('confirm') && this.page === n - 1) { MT.sfx('back'); game.go('title'); } MT.frontIdle(dt);
  },
  draw(r) { r_lastW = r.W; MT.backdrop(r, this.t); MT.drawHowtoPage(r, this.page); UI.promptBar(r, [['pgL', 'PAGE'], ['cancel', 'BACK']]); }
};
MT.drawHowtoPage = function (r, page) {
  const P = MT.TEXT.howto[page], pi = MT.lastInput();
  r.overlay(g => {
    UI.title(g, 'HOW TO PLAY', r.W / 2, 10, 3); UI.panel(g, 16, 36, r.W - 32, r.H - 74, { bulbs: false });
    UI.text(g, P.title + '   ' + (page + 1) + '/' + MT.TEXT.howto.length, r.W / 2, 42, '#ffcc33', { align: 'center', scale: 1 });
    if (P.rows) { P.rows.forEach(([id, label], i) => { const y = 60 + i * 20; MT.glyph.draw(g, 40, y, id, pi); UI.text(g, label, 90, y + 2, '#fff7e8', { scale: 1 }); }); UI.text(g, P.note, r.W / 2, r.H - 56, '#7affb0', { align: 'center', font: 'tiny' }); }
    else if (P.lines) P.lines.forEach((l, i) => UI.text(g, l, r.W / 2, 62 + i * 18, '#fff7e8', { align: 'center' }));
    else if (P.caps) P.caps.forEach((id, i) => {
      const y = 58 + i * 20, W = MT.WEAPONS[id]; let spr = id === 'bomb' ? MT.spr.bomb : id === 'life' ? MT.spr.life : MT.capSprite(id); px.sprite(g, spr, 38, y + 2);
      const nm = id === 'bomb' ? 'SHOWSTOPPER' : id === 'life' ? 'ENCORE' : W.name; UI.text(g, nm, 70, y, '#ffcc33', { scale: 1 }); UI.text(g, MT.TEXT.capLines[id], 70, y + 9, '#c8c0e0', { font: 'tiny' });
    });
  });
};
// ---- EPISODES (rehearsal) ----
SC.episodes = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; const g = MT.game, un = MT.sget('mashtv:unlocked', 1); this.menu = new UI.Menu([1, 2, 3].map(n => ({ label: () => 'EPISODE ' + n + (n > un ? '  (LOCKED)' : ''), disabled: n > un, onPick: () => { MT.newRun({ mode: 'rehearsal', diff: 'CONTESTANT', players: [{ slot: 0, look: 0 }], ep: n }); MT.flow.startEpisode(n); } })), { y: 76, rowH: 24, w: 220, scale: 2, onCancel: () => g.go('title') }); MT.resetIdle(); },
  update(dt) { this.t += dt; UI.t += dt; this.menu.update(dt); MT.frontIdle(dt); },
  draw(r) { MT.backdrop(r, this.t); const n = this.menu.i + 1, E_ = MT.EPISODES[n]; r.overlay(g => { UI.title(g, 'EPISODES', r.W / 2, 22, 3); UI.panel(g, r.W / 2 - 140, 160, 280, 36, {}); UI.text(g, E_.name + ' · ' + E_.place, r.W / 2, 166, '#ffe068', { align: 'center' }); UI.text(g, 'REHEARSAL: NO HIGH SCORES', r.W / 2, 180, '#c8c0e0', { align: 'center', font: 'tiny' }); }); this.menu.draw(r); UI.promptBar(r, [['confirm', 'REHEARSE'], ['cancel', 'BACK']]); }
};
// ---- SCORES ----
SC.scores = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.t = 0; this.fresh = d && d.fresh; this.hold = d && d.hold; this.fromAttract = d && d.attract; MT.resetIdle(); },
  update(dt) { this.t += dt; UI.t += dt; const game = MT.game; if (UI.anyPressed('confirm') || UI.anyPressed('cancel') || UI.clicked()) { MT.sfx('back'); game.go('title'); } MT.frontIdle(dt); },
  draw(r) { MT.backdrop(r, this.t, { sky: ['#2a1a05', '#5a3a0a', '#2a1a05'] }); r.overlay(g => { UI.title(g, 'TOP EARNERS', r.W / 2, 8, 3, { colors: ['#fff7a0', '#e8a818'] }); const t = MT.cab.table('show'); for (let i = 0; i < 10; i++) { const e = t[i], y = 42 + i * 16, c = i === 0 ? '#ffe068' : '#fff7e8'; UI.text(g, (i + 1) + '.', r.W / 2 - 100, y, c, { align: 'right' }); UI.text(g, e ? e.name : '---', r.W / 2 - 90, y, c); UI.text(g, MT.fmt$(e ? e.score : 0), r.W / 2 + 100, y, c, { align: 'right' }); } }); UI.promptBar(r, [['confirm', 'BACK']]); }
};
// ---- ABOUT & CREDITS ----
MT.aboutPages = function () {
  const A = MT.ABOUT, S = A.sourceInformation, pages = [];
  pages.push({ title: 'ABOUT MASH TV', lines: ['A 1-4 PLAYER TWIN-STICK ARENA SHOOTER SET INSIDE THE', 'DEADLIEST GAME SHOW ON TELEVISION.', '', 'THREE EPISODES. THREE BOSSES. NINE GOLDEN KEYS.', 'FIVE OF THEM OPEN THE GREEN ROOM.', '', 'BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED', 'WITH CONFETTI.', '', 'INSPIRED BY SMASH TV (1990). ALL TEXT, ART, MUSIC AND', 'SOUND ARE ORIGINAL AND MADE IN CODE.'] });
  pages.push({ title: 'CREDITS', lines: ['MASH TV', 'MADE WITH THE MY-3D2DGE ENGINE V0.85.2', 'HOSTED ON THE AI HUB (SESSION PROTOCOL V1)', 'MODEL: ANTHROPIC CLAUDE-SONNET-5-5, MEDIUM EFFORT', 'PLAN: PLAN.MD BY CLAUDE-OPUS-5-5', 'ORIGINAL MUSIC, SOUND AND ANIMALESE VOICES SYNTHESIZED', 'IN CODE. NO AUDIO FILES.', '', 'LANCE LUSTRE AND PENNY PRIZE ARE FICTIONAL AND', 'ARE NOT LEGALLY OBLIGATED TO LIKE YOU.'] });
  const kv = (o) => Object.entries(o).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').toUpperCase(), String(v)]);
  const rows = kv(S), groups = []; let cur = [], hh = 0; for (const rw of rows) { const h = 14 + Math.min(8, Math.ceil(rw[1].length / 70)) * 9; if (hh + h > 150 && cur.length) { groups.push(cur); cur = []; hh = 0; } cur.push(rw); hh += h; } if (cur.length) groups.push(cur); groups.forEach((gp, i) => pages.push({ title: 'SOURCE INFORMATION ' + (i + 1) + '/' + groups.length, kv: gp }));
  const Q = { testingFeedback: ['HOW MANY ISSUES DID TESTING CATCH?', 'HOW MANY WERE CRITICAL?', 'MOST HELPFUL TEST?', 'LEAST HELPFUL TEST?'], engineFeedback: ['WHAT DID YOU LIKE MOST?', 'DID YOU GET STUCK OR GUESS WRONG?', 'WHAT DID YOU HAVE TO BUILD YOURSELF?', 'WHAT WAS THE HARDEST PART?', 'WHAT DID YOU CHANGE IN THE ENGINE?', 'WHAT ONE THING WOULD YOU CHANGE?'], promptFeedback: ['WHAT DID YOU LIKE MOST?', 'WHAT WAS CONFUSING?', 'WHAT WAS THE HARDEST THING?', 'WHAT WOULD YOU CHANGE?'] };
  for (const [key, title] of [['testingFeedback', 'TESTING FEEDBACK'], ['engineFeedback', 'ENGINE FEEDBACK'], ['promptFeedback', 'PROMPT FEEDBACK']]) A[key].forEach((a, i) => pages.push({ title: title + ' ' + (i + 1) + '/' + A[key].length, q: Q[key][i], a: String(a) }));
  return pages;
};
SC.about = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; this.page = 0; this.pages = MT.aboutPages(); MT.resetIdle(); },
  update(dt) {
    this.t += dt; UI.t += dt; const n = this.pages.length;
    if (UI.anyPressed('right') || UI.anyPressed('tabR')) { this.page = (this.page + 1) % n; MT.sfx('tick'); } if (UI.anyPressed('left') || UI.anyPressed('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('tick'); }
    const c = UI.clicked(); if (c) { this.page = c[0] > r_lastW / 2 ? (this.page + 1) % n : (this.page + n - 1) % n; MT.sfx('tick'); }
    if (UI.anyPressed('cancel')) { MT.sfx('back'); MT.game.go('title'); } MT.frontIdle(dt);
  },
  draw(r) {
    r_lastW = r.W; MT.backdrop(r, this.t); const P = this.pages[this.page];
    r.overlay(g => {
      UI.title(g, 'ABOUT & CREDITS', r.W / 2, 8, 2); UI.panel(g, 14, 30, r.W - 28, r.H - 66, {}); UI.text(g, P.title + '   [' + (this.page + 1) + '/' + this.pages.length + ']', r.W / 2, 35, '#ffcc33', { align: 'center' });
      const W = r.W - 52;
      if (P.lines) P.lines.forEach((l, i) => UI.text(g, l, r.W / 2, 52 + i * 11, '#fff7e8', { align: 'center' }));
      else if (P.kv) { let y = 50; for (const [k, v] of P.kv) { UI.text(g, k, 24, y, '#7affb0', { font: 'tiny' }); const ls = F.wrap(v, W - 6, {}); ls.slice(0, 8).forEach((l, i) => UI.text(g, l, 24, y + 7 + i * 9, '#fff7e8')); y += 14 + Math.min(8, ls.length) * 9; } }
      else if (P.q) { UI.text(g, P.q, 24, 50, '#7affb0'); F.wrap(P.a, W, {}).slice(0, 12).forEach((l, i) => UI.text(g, l, 24, 66 + i * 10, '#fff7e8')); }
    });
    UI.promptBar(r, [['pgL', 'PAGE'], ['cancel', 'BACK']]);
  }
};
// ---- EPISODE CARD ----
SC.episodeCard = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.left = false; this.ep = MT.EPISODES[d.ep]; MT.music.play('theme'); MT.sfx('mashStart'); this.lines = MT.TEXT.ep[d.ep]; this.li = 0; this.done = false; const g = MT.game; const self = this; MT.lines.clear(); g.script(function* () { yield .8; for (const [s, t] of self.lines) { const h = MT.lines.cut(s, t); yield E.until(() => h.done); } self.done = true; }); },
  update(dt) { this.t += dt; UI.t += dt; MT.lines.update(dt); if (UI.anyPressed('confirm') || UI.anyPressed('start')) { if (MT.lines.cur) MT.lines.skip(); else if (this.t > 1) this.done = true; } if (this.done && this.t > 1.5) { this.done = false; MT.flow.afterEpisodeCard(this.d.ep); } },
  draw(r) { UI.card(r, 'EPISODE ' + this.d.ep, this.ep.name, this.ep.place, this.t, '#ff2e88'); UI.drawLowerThird(r); }
};
// ---- NEXT ON MASH TV (map card) ----
MT.mapNodePos = (rm, r) => { const ox = r.W / 2 - 3 * 64 / 2 - 10, oy = 52; return [ox + rm.cell[0] * 74 + 32, oy + rm.cell[1] * 46 + 16]; };
MT.drawMap = function (r, ep, cur, o = {}) {
  const rooms = Object.values(MT.ROOMS).filter(q => q.ep === ep && q.cell), run = MT.run, t = o.t || 0;
  r.overlay(g => {
    // edges
    for (const rm of rooms) for (const dn in rm.exits) { const to = MT.ROOMS[rm.exits[dn]]; if (!to || !to.cell) continue; const a = MT.mapNodePos(rm, r), b = MT.mapNodePos(to, r), vis = run && run.path.includes(rm.id) && run.path.includes(to.id), chosen = o.to === to.id && o.from === rm.id; px.line(g, a[0], a[1], b[0], b[1], chosen ? (Math.floor(t * 8) % 2 ? '#fff' : '#7affb0') : vis ? '#ffcc33' : '#4a3a70', chosen ? 3 : 2); }
    for (const rm of rooms) {
      const [x, y] = MT.mapNodePos(rm, r), here = rm.id === cur, vis = run && run.path.includes(rm.id), isTo = rm.id === o.to;
      const w = 64, h = 30; const col = isTo ? '#7affb0' : here ? '#ff2e88' : vis ? '#ffcc33' : '#6a5a90';
      E.ui.box(g, x - w / 2, y - h / 2, w, h, { bg: here || isTo ? ['#5a1a66', '#2a0f40'] : ['#2a1446', '#140a24'], border: col, alpha: 1 });
      if ((here || isTo) && Math.floor(t * 4) % 2) UI.bulbs(g, x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, t, '#fff7a0', true);
      UI.text(g, rm.id, x - w / 2 + 3, y - h / 2 + 2, col, { font: 'tiny' }); UI.text(g, rm.name.length > 15 ? rm.name.slice(0, 14) + '.' : rm.name, x, y - 3, '#fff7e8', { align: 'center', font: 'tiny' });
      UI.text(g, MT.TEXT.roomTypes[rm.type] || '', x, y + 6, '#c8c0e0', { align: 'center', font: 'tiny' });
      if (rm.key) px.sprite(g, MT.spr.key, x + w / 2 - 8, y - h / 2 + 1);
    }
  });
};
SC.mapcard = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.left = false; MT.music.play('commercial'); MT.sfx('channelFlip'); this.to = MT.ROOMS[d.to]; },
  update(dt) { this.t += dt; UI.t += dt; if ((UI.anyPressed('confirm') || UI.anyPressed('start')) && this.t > .4) this.t = Math.max(this.t, 2.5); if (this.t >= 2.5 && !this.left) { this.left = true; MT.flow.enterRoom(this.d.to, MT.DOORS[this.d.dir].opp); } },
  draw(r) { MT.backdrop(r, this.t); r.overlay(g => { UI.title(g, 'NEXT ON MASH TV', r.W / 2, 8, 3); UI.text(g, this.to.id + '  ' + this.to.name, r.W / 2, r.H - 40, '#7affb0', { align: 'center', scale: 2 }); }); MT.drawMap(r, this.to.ep, this.d.from, { to: this.d.to, from: this.d.from, t: this.t }); UI.static(r, this.t, Math.max(0, .5 - this.t * 3)); if (this.t > 2.1) UI.static(r, this.t, (this.t - 2.1) * 2); }
};
