/* SHELL: the title (its 3D drain-gate stage, the logo, the menu, the attract timer, the touch-only notice), character
 * creation, About and Credits, game over and the ending's credits and stats. Every menu is the same focus system. */
B.touchOnly = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches && !B.sawKeys;
B.menuWs = (labels, cx, y, w = 150, h = 15, gap = 3) => labels.map((l, i) => ({ id: l.id || l, label: l.label || l, kind: 'item', x: Math.round(cx - w / 2), y: y + i * (h + gap), w, h, skip: !!l.skip }));
B.drawMenu = (g, ws, focus, t) => { for (const w of ws) { const on = w.id === focus; B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: .9, border: on ? B.COL.focus : '#6a5a3a' }); B.text(g, w.label, w.x + w.w / 2, w.y + 4, w.skip ? '#6a5a4a' : on ? B.COL.focus : B.COL.text, { align: 'center' }); if (on) B.focusFrame(g, w.x, w.y, w.w, w.h, t); } };
B.logo = (g, W, y, scale = 3) => {
  const s = W < 380 ? Math.min(scale, 2) : scale;
  E.font.title(g, 'EYE OF THE', W / 2, y, { align: 'center', scale: Math.max(1, s - 1), colors: B.TITLE_COLORS, depthColor: '#2a1a08', depth: 2 });
  E.font.title(g, 'BOLT-HOLDER', W / 2, y + 8 * (s - 1) + 6, { align: 'center', scale: s, colors: B.TITLE_COLORS, depthColor: '#2a1a08', depth: 3 });
  const gl = (B.UI.t * 60) % (W + 200) - 100; g.save(); g.globalAlpha = .25; px.rect(g, gl, y, 6, 8 * s + 14, '#fff6d8'); g.restore();
};
/* ---- TITLE ---- */
B.Title = {
  focus: 'new', idle: 0, last: {},
  items() { const G = B.game, any = G.saves && G.saves.latest && G.saves.latest(); return [any ? { id: 'continue', label: 'Continue' } : null, { id: 'new', label: 'New Game' }, { id: 'load', label: 'Load Game', skip: !any }, { id: 'race', label: 'Rat Run' }, { id: 'settings', label: 'Settings' }, { id: 'about', label: 'About & Credits' }].filter(Boolean); },
  enter() { this.idle = 0; this.idleAt = null; B.Music.play('title'); B.S = null; if (B.stage) B.stage.show('B'); B.game.timeScale = 1; if (!this.items().some(i => i.id === this.focus)) this.focus = this.items()[0].id; },
  update(dt) {
    const G = B.game, I = G.input; B.UI.t = G.real;
    // idle time on the wall clock in a browser (a slow machine's steps lag behind it), in game steps headless
    const wall = typeof document !== 'undefined' && typeof performance !== 'undefined' ? performance.now() / 1000 : null;
    if (B.anyInput(G, this.last)) { this.idle = 0; this.idleAt = wall; if (I.anyPressed()) B.sawKeys = B.sawKeys || I.lastDevice !== 'touch'; }
    else if (wall !== null) { if (this.idleAt == null) this.idleAt = wall; this.idle = wall - this.idleAt; } else this.idle += dt;
    if (this.idle >= 10) { this.idle = 0; this.idleAt = null; G.go('attract', {}); return; }
    if (B.stage) B.stage.update(dt, 'title');
    if (B.touchOnly()) return;
    const ws = B.menuWs(this.items(), B.UI.W / 2, this.menuY(), 150);
    const res = B.Focus.update(G, ws, this); if (!res || !res.w || res.act !== 'ok' || res.w.skip) return;
    G.audio.sfx('uiConfirm');
    switch (res.w.id) {
      case 'continue': { const s = G.saves.load(G.saves.latest().slot); if (!s) G.audio.sfx('uiError'); break; }
      case 'new': G.go('create', {}); break;
      case 'load': G.saves.show('load'); break;
      case 'race': G.go('race', { solo: true }); break;
      case 'settings': G.menu('settings'); break;
      case 'about': G.go('about', { back: 'title' }); break;
    }
  },
  menuY() { return Math.round(B.UI.H * .5); },
  draw(r) {
    const G = B.game; B.UI.W = r.W; B.UI.H = r.H;
    if (B.stage) B.stage.draw(r);
    r.overlay(g => {
      g.save(); g.globalAlpha = .45; px.rect(g, 0, this.menuY() - 10, r.W, r.H, '#05040a'); g.restore();
      B.logo(g, r.W, Math.round(r.H * .1));
      B.text(g, 'A thousand locks. One eye.', r.W / 2, Math.round(r.H * .1) + 46, '#e8d8a8', { align: 'center' });
      if (B.touchOnly()) {
        B.panel(g, r.W / 2 - 120, this.menuY(), 240, 46);
        B.text(g, 'Controller or keyboard required.', r.W / 2, this.menuY() + 10, B.COL.focus, { align: 'center' });
        B.text(g, 'Connect a controller or a keyboard to play.', r.W / 2, this.menuY() + 24, B.COL.text, { align: 'center' });
      } else {
        B.drawMenu(g, B.menuWs(this.items(), r.W / 2, this.menuY(), 150), this.focus, B.UI.t);
        B.prompts(g, G, [['confirm', 'Choose'], ['up', 'Move']], r.W / 2, r.H - 14, 'center', '#c8b890');
      }
      B.text(g, 'v' + B.VERSION + ' · ' + E.versionLabel(), 4, r.H - 9, '#6a5a44', { font: 'tiny' });
    });
  }
};
/* ---- CREATE: four slots, each made or premade; Quick Start fills them ---- */
B.Create = {
  enter() { this.slots = [null, null, null, null]; this.edit = null; this.focus = 'quick'; B.Music.play('camp'); },
  ws(W, H) {
    if (this.edit) return this.editWs(W, H);
    const ws = [], cw = 120, ch = 52;
    for (let i = 0; i < 4; i++) ws.push({ id: 'slot' + i, kind: 'slot', i, x: Math.round(W / 2 - cw - 4 + (i % 2) * (cw + 8)), y: 34 + Math.floor(i / 2) * (ch + 6), w: cw, h: ch });
    ws.push({ id: 'quick', kind: 'btn', label: 'Quick Start', x: W / 2 - 124, y: 154, w: 120, h: 16 });
    ws.push({ id: 'begin', kind: 'btn', label: 'Begin the Descent', x: W / 2 + 4, y: 154, w: 120, h: 16, skip: this.slots.some(s => !s) });
    ws.push({ id: 'diff', kind: 'btn', label: 'Difficulty: ' + B.cap(B.game.settings.difficulty || 'normal'), x: W / 2 - 60, y: 176, w: 120, h: 14 });
    return ws;
  },
  editWs(W, H) {
    const e = this.edit, ws = [];
    if (e.step === 'race') Object.keys(B.RACES).forEach((r, i) => ws.push({ id: r, label: B.RACES[r].name, x: W / 2 - 140 + i * 72, y: 70, w: 64, h: 60 }));
    if (e.step === 'class') { const cls = B.RACES[e.race].cls.split(''); cls.forEach((c, i) => ws.push({ id: c, label: B.CLASSES[c].name, x: Math.round(W / 2 - cls.length * 34 + i * 68), y: 70, w: 62, h: 60 })); }
    if (e.step === 'look') { ws.push({ id: 'prev', label: '<', x: W / 2 - 80, y: 90, w: 20, h: 20 }, { id: 'ok', label: 'This one', x: W / 2 - 40, y: 150, w: 80, h: 16 }, { id: 'next', label: '>', x: W / 2 + 60, y: 90, w: 20, h: 20 }); }
    if (e.step === 'stats') ws.push({ id: 'roll', label: 'Roll again', x: W / 2 - 104, y: 150, w: 100, h: 16 }, { id: 'ok', label: 'Keep', x: W / 2 + 4, y: 150, w: 100, h: 16 });
    if (e.step === 'name') {
      B.NAMES[e.race].forEach((n, i) => ws.push({ id: 'n_' + n, label: n, x: W / 2 - 150 + (i % 4) * 76, y: 70 + Math.floor(i / 4) * 18, w: 72, h: 15 }));
      ws.push({ id: 'rand', label: 'Random', x: W / 2 - 150, y: 130, w: 72, h: 15 }, { id: 'type', label: 'Type a name', x: W / 2 - 74, y: 130, w: 96, h: 15 }, { id: 'ok', label: 'Done', x: W / 2 + 26, y: 130, w: 72, h: 15, skip: !e.name });
      if (e.typing) { const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-\' '; for (let i = 0; i < L.length; i++) ws.push({ id: 'k_' + L[i], label: L[i] === ' ' ? 'Spc' : L[i], x: W / 2 - 150 + (i % 10) * 30, y: 156 + Math.floor(i / 10) * 16, w: 26, h: 14 }); ws.push({ id: 'del', label: 'Del', x: W / 2 + 90, y: 188, w: 56, h: 14 }); }
    }
    return ws;
  },
  premade(i) { return Object.assign({}, B.PREMADE[i]); },
  roll(e) {
    const r = () => { const d = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b); return d[1] + d[2] + d[3]; };
    for (let n = 0; n < 500; n++) {
      const st = { str: r(), dex: r(), con: r(), int: r(), wis: r() }; for (const [k, v] of Object.entries(B.RACES[e.race].mods)) st[k] = clamp(st[k] + v, 3, 18);
      if (Object.entries(B.CLASSES[e.cls].min).every(([k, v]) => st[k] >= v)) { e.stats = st; return; }
    }
    e.stats = Object.assign({ str: 12, dex: 12, con: 12, int: 12, wis: 12 }, B.CLASSES[e.cls].min);
  },
  finishEdit() {
    const e = this.edit, c = B.CLASSES[e.cls], con = B.mod(e.stats.con);
    const gear = { F: { main: 'longSword', off: 'woodenShield', body: 'leatherArmor' }, P: { main: 'longSword', off: 'woodenShield', body: 'chainShirt' }, R: { main: 'shortSword', off: 'shortSword', body: 'leatherArmor' }, C: { main: 'mace', off: 'holySymbol', body: 'leatherArmor' }, M: { main: 'dagger', off: 'spellbook', body: 'travellersRobe' }, T: { main: 'shortSword', body: 'leatherArmor' } }[e.cls];
    const pack = { R: ['shortBow', ['arrows', 20], 'ration'], T: [['darts', 6], 'lockpicks', 'ration'], M: [['darts', 4], 'ration'] }[e.cls] || ['ration'];
    this.slots[e.slot] = { name: e.name, race: e.race, cls: e.cls, look: e.look, stats: e.stats, hp: Math.max(1, c.die + con), gear, pack, book: e.cls === 'M' ? ['sparkDart', 'findSeams', 'slumber'] : [], mem: e.cls === 'M' ? ['sparkDart', 'slumber'] : e.cls === 'C' ? ['mend'] : [] };
    this.edit = null; this.focus = 'slot' + Math.min(3, e.slot + 1);
  },
  update(dt) {
    const G = B.game, I = G.input, W = B.UI.W, H = B.UI.H; B.UI.t = G.real;
    const ws = this.ws(W, H), res = B.Focus.update(G, ws, this); if (!res) return;
    const e = this.edit;
    if (res.act === 'back') { G.audio.sfx('uiBack'); if (!e) return G.go('title'); const order = ['race', 'class', 'look', 'stats', 'name']; const i = order.indexOf(e.step); if (e.typing) { e.typing = false; return; } if (i <= 0) { this.edit = null; return; } e.step = order[i - 1]; this.focus = null; return; }
    if (!e && res.act === 'alt' && res.w && res.w.kind === 'slot') { this.slots[res.w.i] = this.premade(res.w.i); return; }
    if (e && e.step === 'stats' && res.act === 'alt') { this.roll(e); G.audio.sfx('uiTab'); return; }
    if (e && e.step === 'name' && res.act === 'alt2') { e.name = B.NAMES[e.race][Math.floor(Math.random() * 12)]; return; }
    if (res.act !== 'ok' || !res.w || res.w.skip) return;
    G.audio.sfx('uiConfirm'); const id = res.w.id;
    if (!e) {
      if (res.w.kind === 'slot') { this.edit = { slot: res.w.i, step: 'race', race: 'human', cls: 'F', look: 0, name: '' }; this.focus = 'human'; return; }
      if (id === 'quick') { this.slots = [0, 1, 2, 3].map(i => this.premade(i)); this.focus = 'begin'; return; }
      if (id === 'diff') { const d = ['easy', 'normal', 'hard'], cur = G.settings.difficulty || 'normal'; G.settings.set('difficulty', d[(d.indexOf(cur) + 1) % 3]); return; }
      if (id === 'begin') { G.go('cutscene', { which: 'intro', then: { party: this.slots } }); return; }
      return;
    }
    if (e.step === 'race') { e.race = id; e.look = 0; e.step = 'class'; this.focus = B.RACES[id].cls[0]; }
    else if (e.step === 'class') { e.cls = id; e.step = 'look'; this.focus = 'ok'; }
    else if (e.step === 'look') { if (id === 'prev') e.look = (e.look + 5) % 6; else if (id === 'next') e.look = (e.look + 1) % 6; else { e.step = 'stats'; this.roll(e); this.focus = 'ok'; } B.rigCache.clear(); }
    else if (e.step === 'stats') { if (id === 'roll') this.roll(e); else { e.step = 'name'; e.name = e.name || B.NAMES[e.race][e.slot * 3 % 12]; this.focus = 'ok'; } }
    else if (e.step === 'name') {
      if (id.startsWith('n_')) e.name = id.slice(2);
      else if (id === 'rand') e.name = B.NAMES[e.race][Math.floor(Math.random() * 12)];
      else if (id === 'type') { e.typing = true; e.name = ''; this.focus = 'k_A'; }
      else if (id.startsWith('k_')) { if (e.name.length < 10) e.name += e.name.length ? id.slice(2).toLowerCase() : id.slice(2); }
      else if (id === 'del') e.name = e.name.slice(0, -1);
      else if (id === 'ok' && e.name) this.finishEdit();
    }
  },
  /** physical keys type a name directly */
  textEntry(ev) { const e = this.edit; if (!e || e.step !== 'name' || !e.typing) return false; if (ev.key.length === 1 && /[a-zA-Z' -]/.test(ev.key) && e.name.length < 10) { e.name += ev.key; return true; } if (ev.key === 'Backspace') { e.name = e.name.slice(0, -1); return true; } return false; },
  draw(r) {
    const G = B.game, W = r.W, H = r.H; B.UI.W = W; B.UI.H = H;
    if (B.stage) B.stage.draw(r);
    r.overlay(g => {
      g.save(); g.globalAlpha = .7; px.rect(g, 0, 0, W, H, '#0a0806'); g.restore();
      const e = this.edit, ws = this.ws(W, H), t = B.UI.t;
      B.text(g, e ? ['CHOOSE A RACE', 'CHOOSE A CLASS', 'CHOOSE A LOOK', 'ROLL THE STATS', 'NAME THIS HERO'][['race', 'class', 'look', 'stats', 'name'].indexOf(e.step)] : 'GATHER YOUR PARTY', W / 2, 12, B.COL.focus, { align: 'center', scale: 1 });
      if (!e) {
        for (const w of ws) {
          if (w.kind === 'slot') {
            const s = this.slots[w.i]; B.panel(g, w.x, w.y, w.w, w.h, { alpha: .95 });
            if (s) { const m = B.makeMemberPreview(s, w.i); B.memberRig(m).drawPortrait(g, w.x + 4, w.y + 4, 40, { zoom: 2.2, turn: .4, bg: '#2a2218' }); B.text(g, s.name, w.x + 50, w.y + 8, B.COL.focus); B.text(g, B.RACES[s.race].name, w.x + 50, w.y + 20, B.COL.text); B.text(g, B.CLASSES[s.cls].name, w.x + 50, w.y + 31, B.COL.dim); }
            else { B.text(g, 'Empty', w.x + w.w / 2, w.y + 14, B.COL.dim, { align: 'center' }); B.text(g, 'Create or Premade', w.x + w.w / 2, w.y + 28, '#6a5a44', { align: 'center', font: 'tiny' }); }
          } else { B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: .95, border: w.skip ? '#4a3a2a' : B.COL.border }); B.text(g, w.label, w.x + w.w / 2, w.y + 4, w.skip ? '#6a5a4a' : B.COL.text, { align: 'center' }); }
          if (w.id === this.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
        }
        B.prompts(g, G, [['confirm', 'Create'], ['alt', 'Premade'], ['cancel', 'Back']], W / 2, H - 16, 'center');
        return;
      }
      const prev = B.makeMemberPreview({ name: e.name || '?', race: e.race, cls: e.cls, look: e.look, stats: e.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10 }, hp: 1 }, 'p');
      for (const w of ws) {
        B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: .95 });
        if (e.step === 'race') { const m = B.makeMemberPreview({ race: w.id, cls: B.RACES[w.id].cls[0], look: 0, name: 'x', stats: {}, hp: 1 }, 'r' + w.id); B.memberRig(m).drawPortrait(g, w.x + 12, w.y + 4, 40, { zoom: 2.2, bg: '#2a2218' }); B.text(g, w.label, w.x + w.w / 2, w.y + w.h - 10, B.COL.text, { align: 'center' }); }
        else if (e.step === 'class') { const m = B.makeMemberPreview({ race: e.race, cls: w.id, look: e.look, name: 'x', stats: {}, hp: 1 }, 'c' + w.id); B.memberRig(m).drawPortrait(g, w.x + 11, w.y + 4, 40, { zoom: 2.2, bg: '#2a2218' }); B.text(g, w.label, w.x + w.w / 2, w.y + w.h - 10, B.COL.text, { align: 'center' }); }
        else B.text(g, w.label, w.x + w.w / 2, w.y + Math.round(w.h / 2) - 3, w.skip ? '#6a5a4a' : B.COL.text, { align: 'center' });
        if (w.id === this.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
      }
      const fw = ws.find(w => w.id === this.focus);
      if (e.step === 'race' && fw) B.text(g, B.RACES[fw.id].trait, W / 2, 140, B.COL.dim, { align: 'center' });
      if (e.step === 'class' && fw) B.text(g, B.CLASSES[fw.id].desc, W / 2, 140, B.COL.dim, { align: 'center' });
      if (e.step === 'look') { B.memberRig(prev).drawPortrait(g, W / 2 - 32, 64, 64, { zoom: 2, turn: .4, bg: '#2a2218' }); B.text(g, 'Look ' + (e.look + 1) + ' of 6', W / 2, 136, B.COL.dim, { align: 'center' }); }
      if (e.step === 'stats') { ['str', 'dex', 'con', 'int', 'wis'].forEach((k, i) => { B.text(g, k.toUpperCase(), W / 2 - 60, 50 + i * 16, B.COL.dim); B.text(g, String(e.stats[k]), W / 2, 50 + i * 16, B.COL.focus, { scale: 1 }); const md = B.mod(e.stats[k]); if (md) B.text(g, (md > 0 ? '+' : '') + md, W / 2 + 26, 50 + i * 16, md > 0 ? B.COL.good : B.COL.bad); }); B.text(g, 'Hit points ' + Math.max(1, B.CLASSES[e.cls].die + B.mod(e.stats.con)), W / 2, 132, B.COL.text, { align: 'center' }); }
      if (e.step === 'name') { B.panel(g, W / 2 - 70, 40, 140, 20, { rivets: false }); B.text(g, (e.name || '') + (e.typing && Math.floor(t * 2) % 2 ? '_' : ''), W / 2, 46, B.COL.focus, { align: 'center' }); }
      const extra = e.step === 'stats' ? [['alt', 'Roll again']] : e.step === 'name' ? [['alt2', 'Random']] : [];
      B.prompts(g, G, [['confirm', 'Choose']].concat(extra, [['cancel', 'Back']]), W / 2, H - 16, 'center');
    });
  }
};
B.makeMemberPreview = (t, k) => ({ id: 'prev' + k + t.race + t.cls, name: t.name, race: t.race, cls: t.cls, look: t.look || 0, rig: null });
/* ---- ABOUT and CREDITS ---- */
B.About = {
  enter(d) { this.back = (d && d.back) || 'title'; this.page = 0; this.scroll = 0; },
  pages() { const A = B.ABOUT; return [['Game', A.gamePage], ['Source', ['SOURCE INFORMATION'].concat(Object.entries(A.sourceLabels).map(([k, l]) => l + ': ' + A.source[k]))], ['Testing', ['TESTING FEEDBACK'].concat(A.testingQ.map((q, i) => q + ' ' + A.testing[i]))], ['Engine', ['ENGINE FEEDBACK'].concat(A.engineQ.map((q, i) => q + ' ' + A.engine[i]))], ['Prompt', ['PROMPT FEEDBACK'].concat(A.promptQ.map((q, i) => q + ' ' + A.prompt[i]))], ['Credits', A.credits]]; },
  update(dt) {
    const G = B.game, I = G.input; B.UI.t = G.real; const n = this.pages().length;
    if (I.pressed('tabR') || I.pressed('right') || I.pressed('selNext')) { this.page = (this.page + 1) % n; this.scroll = 0; G.audio.sfx('uiTab'); }
    if (I.pressed('tabL') || I.pressed('left')) { this.page = (this.page + n - 1) % n; this.scroll = 0; G.audio.sfx('uiTab'); }
    if (I.repeat('down', .3, .06)) this.scroll += 10; if (I.repeat('up', .3, .06)) this.scroll = Math.max(0, this.scroll - 10);
    if (B.UI.wheel) { this.scroll = Math.max(0, this.scroll + B.UI.wheel * 20); B.UI.wheel = 0; }
    const cl = I.clicked(); if (cl) { if (cl[1] < 40) { const ca = G.cornerArea && G.cornerArea(), i = Math.floor((cl[0] - 10) / Math.max(1, (B.UI.W - 20 - (ca ? B.UI.W - ca.x0 + 2 : 0)) / n)); if (i >= 0 && i < n) { this.page = i; this.scroll = 0; } } else if (cl[1] > B.UI.H - 24) this.close(); }
    if (I.pressed('cancel') || I.pressed('pause') || I.pressed('confirm')) this.close();
  },
  close() { const G = B.game; G.audio.sfx('uiBack'); if (this.back === 'play') G.go('play', { resume: true }, { fade: 0 }); else G.go(this.back); },
  draw(r) {
    const G = B.game, W = r.W, H = r.H; B.UI.W = W; B.UI.H = H;
    if (B.stage) B.stage.draw(r);
    r.overlay(g => {
      g.save(); g.globalAlpha = .8; px.rect(g, 0, 0, W, H, '#0a0806'); g.restore();
      const pages = this.pages(), n = pages.length, ca = G.cornerArea && G.cornerArea(), tw = (W - 20 - (ca ? W - ca.x0 + 2 : 0)) / n;
      pages.forEach(([t], i) => { const x = 10 + i * tw; B.panel(g, x + 1, 8, tw - 2, 16, { rivets: false, alpha: 1, border: i === this.page ? B.COL.focus : '#5a4a2a' }); B.text(g, B.cut(t, tw - 8), x + tw / 2, 12, i === this.page ? B.COL.focus : B.COL.dim, { align: 'center', font: tw < 70 ? 'tiny' : undefined }); });
      B.panel(g, 8, 30, W - 16, H - 58);
      const [, body] = pages[this.page]; let y = 38 - this.scroll;
      g.save(); g.beginPath(); g.rect(10, 32, W - 20, H - 62); g.clip();
      for (const para of body) { for (const l of B.wrap(para, W - 36)) { if (y > 30 && y < H - 30) B.text(g, l, 18, y, B.COL.text); y += 10; } y += 4; }
      g.restore();
      B.prompts(g, G, [['tabR', 'Page'], ['down', 'Scroll'], ['cancel', 'Back']], W - 12, H - 18, 'right');
    });
  }
};
/* ---- GAME OVER ---- */
B.Over = {
  enter() { this.focus = 'last'; B.Music.play(null); B.Music.sting('gameOver'); },
  items() { const any = B.game.saves && B.game.saves.latest && B.game.saves.latest(); return [{ id: 'last', label: 'Load last save', skip: !any }, { id: 'load', label: 'Load game', skip: !any }, { id: 'title', label: 'Title' }]; },
  update(dt) {
    const G = B.game; B.UI.t = G.real;
    const ws = B.menuWs(this.items(), B.UI.W / 2, Math.round(B.UI.H / 2 + 10)), res = B.Focus.update(G, ws, this);
    if (!res || res.act !== 'ok' || !res.w || res.w.skip) return;
    if (res.w.id === 'last') G.saves.load(G.saves.latest().slot); else if (res.w.id === 'load') G.saves.show('load'); else G.go('title');
  },
  draw(r) {
    const W = r.W, H = r.H; B.UI.W = W; B.UI.H = H;
    if (B.view) B.view.draw(r);
    r.overlay(g => {
      g.save(); g.globalAlpha = .7; px.rect(g, 0, 0, W, H, '#0a0204'); g.restore();
      E.font.title(g, 'THE PARTY IS LOST', W / 2, H / 2 - 50, { align: 'center', scale: W < 380 ? 2 : 3, colors: ['#ffe0d8', '#ff7a6a', '#c8202a', '#4a0a08'], depthColor: '#2a0408' });
      B.text(g, B.OVER_LINES[B.S ? B.S.floor : 'f1'] || '', W / 2, H / 2 - 12, '#c8b0a0', { align: 'center' });
      B.drawMenu(g, B.menuWs(this.items(), W / 2, Math.round(H / 2 + 10)), this.focus, B.UI.t);
    });
  }
};
/* ---- ENDING: the cutscene, then the credits roll, then the stats ---- */
B.Ending = {
  enter() { this.t = 0; this.stage = 'credits'; B.Music.play('ending'); },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt; B.UI.t = G.real;
    if (B.stage) B.stage.update(dt, 'D');
    if (this.stage === 'credits' && (this.t > 28 || (this.t > 1 && I.anyPressed()))) { this.stage = 'stats'; this.t = 0; I.consumeAll(); return; }
    if (this.stage === 'stats' && this.t > 1 && (I.pressed('confirm') || I.pressed('use') || I.clicked() || I.pressed('cancel'))) G.go('title');
  },
  draw(r) {
    const G = B.game, W = r.W, H = r.H; B.UI.W = W; B.UI.H = H;
    if (B.stage) B.stage.draw(r);
    r.overlay(g => {
      g.save(); g.globalAlpha = .65; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
      if (this.stage === 'credits') {
        let y = H - this.t * 14; E.font.title(g, 'THE END', W / 2, y, { align: 'center', scale: 3, colors: B.TITLE_COLORS, depthColor: '#2a1a08' }); y += 40;
        for (const l of B.ABOUT.credits) { for (const w of B.wrap(l, W - 40)) { B.text(g, w, W / 2, y, B.COL.text, { align: 'center' }); y += 10; } y += 6; }
      } else {
        const S = B.S; B.panel(g, W / 2 - 120, 30, 240, 160);
        B.text(g, 'THE CITY IS UNLOCKED', W / 2, 38, B.COL.focus, { align: 'center' });
        const L = S ? [['Time', B.fmtTime(S.playTime)], ['Monsters slain', S.stats.kills], ['Secrets found', S.stats.secrets + ' of 3'], ['Hidden deeds', Object.keys(S.special).length + ' of 3'], ['Deaths', S.stats.deaths], ['Potions drunk', S.stats.potions], ['Rests', S.stats.rests]] : [];
        L.forEach(([k, v], i) => { B.text(g, k, W / 2 - 100, 56 + i * 12, B.COL.dim); B.text(g, String(v), W / 2 + 100, 56 + i * 12, B.COL.text, { align: 'right' }); });
        if (S) B.text(g, S.party.members.map(m => m.name + ' ' + m.lvl).join('  '), W / 2, 146, '#c8b890', { align: 'center', font: 'tiny' });
        B.prompts(g, G, [['confirm', 'Title']], W / 2, 172, 'center');
      }
    });
  }
};
