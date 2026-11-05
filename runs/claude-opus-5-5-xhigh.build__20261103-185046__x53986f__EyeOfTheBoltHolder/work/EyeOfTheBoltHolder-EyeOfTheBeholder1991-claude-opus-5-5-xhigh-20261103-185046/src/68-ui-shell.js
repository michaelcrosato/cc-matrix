/* =====================================================================================
 * 68-ui-shell: the title (over the Drain-gate at night; the attract mode after 10 s idle), party creation, About and
 * Credits, the game over and the ending's credits and stats, the touch-only notice
 * ===================================================================================== */
const TITLE_COLORS = ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'];
const coarseOnly = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches;
B.touchOnly = () => coarseOnly() && !B._sawKeys;
/** a vertical list of big buttons (the title, game over): [{ label, act, disabled }] */
function menuList(items, W, y, w = 150) { return items.map((it, i) => Object.assign({ id: 'b' + i, x: Math.round(W / 2 - w / 2), y: y + i * 17, w, h: 15 }, it)); }
function drawMenuList(g, list, focus) { for (const w of list) { const f = w.id === focus; panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: .88, bg: f ? ['#3a2e18', '#1a140a'] : COL.bg, border: f ? COL.focus : '#7a6236' }); TXT(g, w.label, w.x + w.w / 2 - TW(w.label) / 2, w.y + 4, w.disabled ? '#5a5040' : f ? COL.focus : COL.text); } }
B.menuList = menuList; B.drawMenuList = drawMenuList;
const Title = {
  focus: 'b0', t: 0,
  items() {
    const any = game.saves.latest && game.saves.latest();
    return [
      ...(any ? [{ label: 'Continue', act: () => { const s = game.saves.latest(); if (s) game.saves.load(s.slot); } }] : []),
      { label: 'New Game', act: () => game.go('create') },
      { label: 'Load Game', act: () => game.saves.show('load'), disabled: !(game.saves.any) },
      { label: 'Rat Run', act: () => B.startRace({ solo: true }) },
      { label: 'Settings', act: () => game.menu('settings') },
      { label: 'About & Credits', act: () => game.go('about') }];
  }
};
const scenesShell = {};
scenesShell.title = {
  input: KEYS,
  enter() { Title.t = 0; Title.focus = 'b0'; Idle.reset(); Sound.music('title'); if (B.Stages) B.Stages.enterTitle(); UI.closeAll(); game.timeScale = 1; },
  update(dt) {
    Title.t += dt;
    if (B.Stages) B.Stages.titleStep(dt);
    const idle = Idle.step(dt);
    if (game.input.lastDevice !== 'touch') B._sawKeys = B._sawKeys || game.input.anyPressed();
    if (idle >= 10 && !(game.shell && game.shell.screen)) { game.go('attract'); return; }
    if (B.touchOnly()) return;
    const list = menuList(Title.items(), UI.W, Math.round(UI.H * .5));
    const r = Focus.step(list, Title.focus); Title.focus = r.id;
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H;
    if (B.Stages) B.Stages.drawTitle(r);
    r.overlay(g => {
      const W = r.W, H = r.H, top = Math.round(H * .12);
      g.save(); g.globalAlpha = .45; px.rect(g, 0, Math.round(H * .46), W, H, '#05030a'); g.restore();
      E.font.title(g, 'EYE OF THE', W / 2, top, { scale: 2, align: 'center', colors: TITLE_COLORS, depthColor: '#2a1a08' });
      E.font.title(g, 'BOLT-HOLDER', W / 2, top + 20, { scale: W < 360 ? 3 : 4, align: 'center', colors: TITLE_COLORS, depthColor: '#2a1a08', depth: 3 });
      const gx = (Title.t * 60) % (W + 120) - 60; g.save(); g.globalAlpha = .25; px.rect(g, gx, top + 18, 6, 34, '#fff6d8'); g.restore();
      TXT(g, B.TAGLINE, W / 2 - TW(B.TAGLINE) / 2, top + 58, '#e8d8b0');
      if (B.touchOnly()) {
        panel(g, W / 2 - 130, H * .52, 260, 50);
        TXT(g, 'Controller or keyboard required.', W / 2 - TW('Controller or keyboard required.') / 2, H * .52 + 10, COL.focus);
        TXT(g, 'Connect a controller or a keyboard to play.', W / 2 - TW('Connect a controller or a keyboard to play.') / 2, H * .52 + 26, COL.text);
      } else {
        const list = menuList(Title.items(), W, Math.round(H * .5)); drawMenuList(g, list, Title.focus);
        prompts(g, [['ud', 'Choose'], ['confirm', 'Select']], W / 2, H - 26, { align: 'center' });
      }
      TXT(g, E.versionLabel().replace(/[^\x20-\x7e]/g, '-') + ' - game ' + B.VERSION, 4, H - 10, '#6a6050', { font: 'tiny' });
    });
  }
};
/* ---- creation: a roster of four, each made in five steps, or the premade party ---- */
const Create = {
  roster: [null, null, null, null], slot: -1, step: 0, cur: null, focus: 'r0', kb: false, kbi: 0, upper: true,
  reset() { this.roster = [null, null, null, null]; this.slot = -1; this.step = 0; this.focus = 'r0'; this.kb = false; },
  newHero() { return { race: 'human', sex: 'm', cls: 'F', look: 0, stats: null, name: '' }; },
  roll(h) {
    const R = B.RACES[h.race], min = B.CLASSES[h.cls].min, r6 = () => 1 + Math.floor(Math.random() * 6);
    for (let t = 0; t < 400; t++) {
      const st = {}; for (const k of ['str', 'dex', 'con', 'int', 'wis']) { const d = [r6(), r6(), r6(), r6()].sort((a, b) => a - b); st[k] = clamp(d[1] + d[2] + d[3] + (R.mods[k] || 0), 3, 18); }
      if (Object.entries(min).every(([k, v]) => st[k] >= v)) { h.stats = st; return; }
    }
    h.stats = { str: 12, dex: 12, con: 12, int: 12, wis: 12 }; for (const [k, v] of Object.entries(min)) h.stats[k] = v;
  },
  defOf(h, i) {
    const look = B.dressFor(B.lookOf(h.race, h.sex, h.look), h.cls), hp = B.CLASSES[h.cls].hd + B.statMod(h.stats.con);
    const def = { id: 'hero' + i, name: h.name || B.NAMES[h.race][i], full: h.name || B.NAMES[h.race][i], race: h.race, sex: h.sex, cls: h.cls, stats: h.stats, look, hp: Math.max(1, hp) };
    if (h.cls === 'M') { def.prep = { sparkDart: 1 }; def.book = B.START_GEAR.M.book.slice(); }
    if (h.cls === 'C') def.prep = { mend: 1 };
    return def;
  },
  begin() { const defs = this.roster.map((h, i) => h.premade ? B.clone(B.PREMADE[i]) : this.defOf(h, i)); B.startCampaign(defs); }
};
B.Create = Create;
const KB_ROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ-\' .', '0123456789'];
scenesShell.create = {
  input: KEYS,
  enter() { Create.reset(); Sound.music('title'); UI.closeAll(); this.prev = {}; },
  rigCache: new Map(),
  rigFor(h) { const look = B.dressFor(B.lookOf(h.race, h.sex, h.look), h.cls), k = JSON.stringify(look); let r = this.rigCache.get(k); if (!r) { r = B.rigOf(look); r.facing = PI / 2; this.rigCache.set(k, r); } return r; },
  widgets(W, H) {
    const C = Create, out = [];
    if (C.slot < 0) {
      const cw = Math.min(150, (W - 40) / 2), ch = 52, x0 = W / 2 - cw - 4;
      for (let i = 0; i < 4; i++) {
        const x = x0 + (i % 2) * (cw + 8), y = 34 + Math.floor(i / 2) * (ch + 6);
        out.push({ id: 'r' + i, x, y, w: cw - 46, h: ch, hero: i, act: () => { C.slot = i; C.step = 0; C.cur = C.roster[i] && !C.roster[i].premade ? C.roster[i] : C.newHero(); this.focus = 'o0'; } });
        out.push({ id: 'p' + i, x: x + cw - 44, y, w: 44, h: ch, act: () => { C.roster[i] = { premade: true }; Sound.sfx('uiConfirm'); }, label: 'Premade' });
      }
      out.push({ id: 'quick', x: W / 2 - 75, y: 34 + 2 * (ch + 6) + 4, w: 150, h: 15, label: 'Quick Start', act: () => { C.roster = [0, 1, 2, 3].map(() => ({ premade: true })); C.begin(); } });
      out.push({ id: 'begin', x: W / 2 - 75, y: 34 + 2 * (ch + 6) + 22, w: 150, h: 15, label: 'Begin the Descent', disabled: C.roster.some(r => !r), act: () => C.begin() });
      return out;
    }
    const h = C.cur, step = C.step, x0 = W / 2 - 10, y0 = 50;
    if (step === 0) B.RACE_ORDER.forEach((r, i) => out.push({ id: 'o' + i, x: x0 + (i % 2) * 90, y: y0 + Math.floor(i / 2) * 34, w: 84, h: 30, label: B.RACES[r].name, act: () => { h.race = r; if (!B.RACES[r].cls.includes(h.cls)) h.cls = B.RACES[r].cls[0]; C.step = 1; this.focus = 'o0'; }, hov: () => { h.race = r; } }));
    if (step === 1) B.CLASS_ORDER.filter(c => B.RACES[h.race].cls.includes(c)).forEach((c, i) => out.push({ id: 'o' + i, x: x0 + (i % 2) * 90, y: y0 + Math.floor(i / 2) * 26, w: 84, h: 22, label: B.CLASSES[c].name, act: () => { h.cls = c; C.roll(h); C.step = 2; this.focus = 'o0'; }, hov: () => { h.cls = c; } }));
    if (step === 2) { out.push({ id: 'o0', x: x0, y: y0, w: 26, h: 20, label: '<', act: () => { h.look = (h.look + 5) % 6; } }, { id: 'o1', x: x0 + 140, y: y0, w: 26, h: 20, label: '>', act: () => { h.look = (h.look + 1) % 6; } }, { id: 'o2', x: x0 + 30, y: y0 + 26, w: 106, h: 16, label: h.sex === 'm' ? 'Male' : 'Female', act: () => { h.sex = h.sex === 'm' ? 'f' : 'm'; } }, { id: 'o3', x: x0 + 30, y: y0 + 48, w: 106, h: 16, label: 'This look', act: () => { if (!h.stats) C.roll(h); C.step = 3; this.focus = 'o0'; } }); }
    if (step === 3) out.push({ id: 'o0', x: x0, y: y0 + 74, w: 80, h: 16, label: 'Keep', act: () => { C.step = 4; this.focus = 'o0'; if (!h.name) h.name = B.NAMES[h.race][Math.floor(Math.random() * 12)]; } }, { id: 'o1', x: x0 + 86, y: y0 + 74, w: 80, h: 16, label: 'Roll again', act: () => C.roll(h) });
    if (step === 4) {
      if (C.kb) { KB_ROWS.forEach((row, ry) => row.split('').forEach((ch, rx) => out.push({ id: 'k' + ry + '_' + rx, x: x0 - 20 + rx * 18, y: y0 + 30 + ry * 18, w: 16, h: 16, label: ch, act: () => { if (h.name.length < 12) h.name += C.upper || h.name.length === 0 ? ch : ch.toLowerCase(); } })));
        out.push({ id: 'kdone', x: x0 - 20, y: y0 + 106, w: 60, h: 14, label: 'Done', act: () => { C.kb = false; this.focus = 'o0'; } }, { id: 'kdel', x: x0 + 46, y: y0 + 106, w: 60, h: 14, label: 'Delete', act: () => { h.name = h.name.slice(0, -1); } }); }
      else {
        B.NAMES[h.race].forEach((n, i) => out.push({ id: 'n' + i, x: x0 - 20 + (i % 3) * 62, y: y0 + 26 + Math.floor(i / 3) * 14, w: 58, h: 12, label: n, act: () => { h.name = n; } }));
        out.push({ id: 'o0', x: x0 - 20, y: y0 + 86, w: 90, h: 15, label: 'Keyboard', act: () => { C.kb = true; this.focus = 'k0_0'; } }, { id: 'o1', x: x0 + 76, y: y0 + 86, w: 90, h: 15, label: 'Done', disabled: !h.name, act: () => { C.roster[C.slot] = h; C.slot = -1; this.focus = 'r0'; } });
      }
    }
    return out;
  },
  update(dt) {
    const I = game.input, C = Create;
    if (C.slot >= 0 && C.step === 4) {   // physical keys type the name
      const h = C.cur;
      for (const code of I.held) { if (this.prev[code]) continue; if (/^Key[A-Z]$/.test(code) && h.name.length < 12) h.name += (h.name.length && !I.down('shift') ? code[3].toLowerCase() : code[3]); }
      this.prev = {}; for (const c of I.held) this.prev[c] = true;
      if (I.pressed('mTri') && !C.kb) h.name = B.NAMES[h.race][Math.floor(Math.random() * 12)];
      if (C.kb && I.pressed('mAlt')) h.name = h.name.slice(0, -1);
      if (C.kb && I.pressed('mR')) C.upper = !C.upper;
      if (C.kb && I.pressed('start')) { C.kb = false; this.focus = 'o0'; }
      if (!C.kb && I.held.has('Backspace') && this.bs !== true) { h.name = h.name.slice(0, -1); this.bs = true; return; } if (!I.held.has('Backspace')) this.bs = false;
    }
    if (C.slot >= 0 && C.step === 3 && I.pressed('mAlt')) C.roll(C.cur);
    if (I.pressed('cancel') && !(C.slot >= 0 && C.step === 4 && I.held.has('Backspace'))) { Sound.sfx('uiBack'); if (C.slot < 0) { game.go('title'); return; } if (C.kb) { C.kb = false; return; } if (C.step > 0) { C.step--; this.focus = 'o0'; } else C.slot = -1; return; }
    const list = this.widgets(UI.W, UI.H), r = Focus.step(list, this.focus); this.focus = r.id;
    if (r.cur && r.cur.hov && !r.acted) r.cur.hov();
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H;
    if (B.Stages) B.Stages.drawTitle(r);
    r.overlay(g => {
      const W = r.W, H = r.H, C = Create; g.save(); g.globalAlpha = .7; px.rect(g, 0, 0, W, H, '#05030a'); g.restore();
      E.font.title(g, C.slot < 0 ? 'YOUR PARTY' : ['RACE', 'CLASS', 'LOOK', 'ABILITIES', 'NAME'][C.step], W / 2, 6, { scale: 2, align: 'center', colors: TITLE_COLORS, depthColor: '#2a1a08' });
      const list = this.widgets(W, H);
      if (C.slot < 0) {
        for (const w of list) {
          if (w.hero !== undefined) {
            const h = C.roster[w.hero]; panel(g, w.x, w.y, w.w, w.h, { rivets: false });
            if (!h) TXT(g, 'Create', w.x + w.w / 2 - TW('Create') / 2, w.y + w.h / 2 - 4, COL.dim);
            else { const def = h.premade ? B.PREMADE[w.hero] : C.defOf(h, w.hero), rig = this.rigFor(h.premade ? { race: def.race, sex: def.sex, cls: def.cls, look: 0 } : h); (h.premade ? (this['pr' + w.hero] || (this['pr' + w.hero] = B.rigOf(def.look))) : rig).drawPortrait(g, w.x + 4, w.y + 6, 36, { zoom: 2.4, turn: .4, bg: '#2a2218' }); TXT(g, def.name, w.x + 44, w.y + 10, '#ffe6b0'); TXT(g, B.RACES[def.race].name, w.x + 44, w.y + 22, COL.text, { font: 'tiny' }); TXT(g, B.CLASSES[def.cls].name, w.x + 44, w.y + 30, COL.text, { font: 'tiny' }); }
          } else { panel(g, w.x, w.y, w.w, w.h, { rivets: false, bg: w.disabled ? ['#141210', '#0a0908'] : COL.bg }); TXT(g, w.label, w.x + w.w / 2 - TW(w.label) / 2, w.y + (w.h > 20 ? w.h / 2 - 4 : 4), w.disabled ? '#5a5040' : COL.text); }
        }
        Focus.draw(g, list, this.focus);
        prompts(g, [['confirm', 'Choose'], ['cancel', 'Back']], W - 8, H - 14, { align: 'right' });
        return;
      }
      const h = C.cur, rig = this.rigFor(h); rig.update(1 / 60, { x: 0, y: 0 });
      panel(g, 14, 36, W / 2 - 34, H - 62); rig.drawPortrait(g, 24, 46, Math.min(80, W / 2 - 54), { zoom: 3.2, turn: .5, bg: '#2a2218' });
      let ty = 46 + Math.min(80, W / 2 - 54) + 8; TXT(g, (h.name ? h.name + ', ' : '') + B.RACES[h.race].name + ' ' + B.CLASSES[h.cls].name, 22, ty, '#ffe6b0'); ty += 12;
      const about = C.step === 0 ? B.RACES[h.race].trait : B.CLASSES[h.cls].about; for (const ln of E.font.wrap(about, W / 2 - 50)) { TXT(g, ln, 22, ty, '#d8ccb8'); ty += 10; }
      for (const w of list) { panel(g, w.x, w.y, w.w, w.h, { rivets: false, bg: w.disabled ? ['#141210', '#0a0908'] : COL.bg }); TXT(g, w.label, w.x + w.w / 2 - TW(w.label) / 2, w.y + w.h / 2 - 4, w.disabled ? '#5a5040' : COL.text); }
      if (C.step === 2) TXT(g, 'Look ' + (h.look + 1) + ' of 6', W / 2 + 34, 56, COL.text);
      if (C.step === 3) { const st = h.stats; ['str', 'dex', 'con', 'int', 'wis'].forEach((k, i) => { TXT(g, k.toUpperCase(), W / 2 - 10, 52 + i * 13, COL.dim); TXT(g, st[k], W / 2 + 30, 52 + i * 13, COL.text); const md = B.statMod(st[k]); TXT(g, (md >= 0 ? '+' : '') + md, W / 2 + 50, 52 + i * 13, md > 0 ? COL.good : md < 0 ? COL.bad : COL.dim); }); }
      if (C.step === 4) { panel(g, W / 2 - 20, 52, 170, 16, { rivets: false }); TXT(g, (h.name || '') + (Math.floor(game.real * 2) % 2 ? '_' : ''), W / 2 - 14, 56, '#ffe6b0'); }
      Focus.draw(g, list, this.focus);
      const ps = C.step === 3 ? [['confirm', 'Choose'], ['mAlt', 'Roll'], ['cancel', 'Back']] : C.step === 4 ? (C.kb ? [['confirm', 'Type'], ['mAlt', 'Delete'], ['mR', 'Case'], ['start', 'Done']] : [['confirm', 'Choose'], ['mTri', 'Random'], ['cancel', 'Back']]) : [['confirm', 'Choose'], ['cancel', 'Back']];
      prompts(g, ps, W - 8, H - 14, { align: 'right' });
    });
  }
};
/* ---- About and Credits ---- */
scenesShell.about = {
  input: KEYS, page: 0, scroll: 0,
  enter(d) { this.page = 0; this.scroll = 0; this.from = d && d.from; Idle.reset(); },
  update(dt) {
    const I = game.input, n = B.aboutPages().length;
    if (Idle.step(dt) >= 10 && !this.from) { game.go('attract'); return; }
    if (I.pressed('cancel')) { Sound.sfx('uiBack'); game.go(this.from === 'play' ? 'play' : 'title', this.from === 'play' ? { resume: true } : undefined); return; }
    if (I.pressed('mL') || I.repeat('left', .35, .2)) { this.page = (this.page + n - 1) % n; this.scroll = 0; Sound.sfx('uiTab'); }
    if (I.pressed('mR') || I.repeat('right', .35, .2) || I.pressed('confirm')) { this.page = (this.page + 1) % n; this.scroll = 0; Sound.sfx('uiTab'); }
    if (I.repeat('down', .25, .06)) this.scroll++; if (I.repeat('up', .25, .06)) this.scroll = Math.max(0, this.scroll - 1);
    const z = I.zoom && I.zoom(); if (z && z !== 1) this.scroll = Math.max(0, this.scroll + (z < 1 ? 2 : -2));
    const ck = I.clicked(); if (ck) { if (ck[0] > UI.W / 2) this.page = (this.page + 1) % n; else this.page = (this.page + n - 1) % n; this.scroll = 0; }
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H;
    if (B.Stages) B.Stages.drawTitle(r);
    r.overlay(g => {
      const W = r.W, H = r.H, pages = B.aboutPages(), pg = pages[this.page];
      g.save(); g.globalAlpha = .8; px.rect(g, 0, 0, W, H, '#05030a'); g.restore();
      E.font.title(g, pg.title.toUpperCase(), W / 2, 6, { scale: 1, align: 'center', colors: TITLE_COLORS });
      panel(g, 8, 20, W - 16, H - 44);
      const lines = []; for (const [k, v] of pg.rows) { if (k) lines.push([k, COL.focus]); for (const ln of E.font.wrap(v, W - 40)) lines.push([ln, COL.text]); lines.push(['', null]); }
      const rows = Math.floor((H - 56) / 10); this.scroll = Math.min(this.scroll, Math.max(0, lines.length - rows));
      lines.slice(this.scroll, this.scroll + rows).forEach(([t, c], i) => { if (c) TXT(g, t, 16, 26 + i * 10, c); });
      TXT(g, (this.page + 1) + ' / ' + pages.length, 14, H - 18, COL.dim);
      prompts(g, [['mL', 'Page'], ['ud', 'Scroll'], ['cancel', 'Back']], W - 8, H - 18, { align: 'right' });
    });
  }
};
B.aboutPages = () => {
  const A = B.ABOUT, si = A.sourceInformation;
  return [
    { title: B.TITLE, rows: [[null, B.TAGLINE], ['Version', 'Game ' + B.VERSION + ', built ' + B.BUILD + '. Engine ' + E.versionLabel().replace(/[^\x20-\x7e]/g, '-') + '.'], ['The story', 'Hasp, the City of a Thousand Locks, is being locked in from below. The Council of Keys sends a party of four down through the Drains, the Tumbler Halls and the Gloam Deeps to the Eye\'s Vault, where the Bolt-Holder holds the city\'s bolts.']] },
    { title: 'Source Information', rows: [['Date', si.date], ['Source', si.source], ['Plan', si.plan], ['Genre and Perspective', si.genre + '. ' + si.perspective], ['Tech', si.tech], ['Art Direction', si.artDirection], ['Animation', si.animation], ['Audio', si.audio], ['Online', si.online], ['Testing', si.testing], ['Research', si.research], ['Environment', si.environment], ['Model', si.model], ['Usage', si.usage]] },
    { title: 'Testing Feedback', rows: B.Q.testing.map((q, i) => [q, A.testingFeedback[i]]) },
    { title: 'Engine Feedback', rows: B.Q.engine.map((q, i) => [q, A.engineFeedback[i]]) },
    { title: 'Prompt Feedback', rows: B.Q.prompt.map((q, i) => [q, A.promptFeedback[i]]) },
    { title: 'Credits', rows: A.credits }
  ];
};
/* ---- game over ---- */
scenesShell.over = {
  input: KEYS, focus: 'b0',
  enter() { this.focus = 'b0'; Sound.music(null); Sound.sting('gameOver'); UI.closeAll(); game.timeScale = 1; },
  items() { const last = game.saves.latest && game.saves.latest(); return [{ label: 'Load last save', disabled: !last, act: () => { const s = game.saves.latest(); if (s) game.saves.load(s.slot); } }, { label: 'Load game', disabled: !game.saves.any, act: () => game.saves.show('load') }, { label: 'Title', act: () => game.go('title') }]; },
  update() { const r = Focus.step(menuList(this.items(), UI.W, Math.round(UI.H * .55)), this.focus); this.focus = r.id; },
  back() { game.go('title'); return true; },
  draw(r) {
    UI.W = r.W; UI.H = r.H; B.view.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; g.save(); g.globalAlpha = .65; px.rect(g, 0, 0, W, H, '#0a0204'); g.restore();
      E.font.title(g, 'THE PARTY IS LOST', W / 2, H * .25, { scale: W < 360 ? 2 : 3, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a', '#4a0a10'], depthColor: '#2a0408' });
      const line = (B.FLOORS[S.floor] || {}).over || ''; TXT(g, line, W / 2 - TW(line) / 2, H * .25 + 34, '#e8c8c0');
      drawMenuList(g, menuList(this.items(), W, Math.round(H * .55)), this.focus);
    });
  }
};
/* ---- the end: the cutscene (80), then the credits roll, then the stats ---- */
scenesShell.credits = {
  input: KEYS, t: 0, phase: 'roll',
  enter() { this.t = 0; this.phase = 'roll'; Sound.music('ending'); UI.closeAll(); game.timeScale = 1; },
  lines() { const out = [['THE END', 'title'], ['', null]]; for (const [k, v] of B.ABOUT.credits) { if (k) out.push([k, 'head']); for (const ln of E.font.wrap(v, UI.W - 60)) out.push([ln, 'text']); out.push(['', null]); } return out; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (this.phase === 'roll') { if (I.anyPressed() && this.t > 1) this.t += 6; if (this.t > this.lines().length * .45 + 6) { this.phase = 'stats'; this.t = 0; } }
    else if (this.t > 1 && (I.pressed('confirm') || I.pressed('cancel') || I.clicked())) game.go('title');
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H;
    if (B.Stages) B.Stages.drawEndingBack(r);
    r.overlay(g => {
      const W = r.W, H = r.H; g.save(); g.globalAlpha = .75; px.rect(g, 0, 0, W, H, '#05030a'); g.restore();
      if (this.phase === 'roll') {
        const ls = this.lines(), y0 = H - this.t * 22;
        ls.forEach(([t, k], i) => { const y = y0 + i * 12; if (y < -20 || y > H) return; if (k === 'title') E.font.title(g, t, W / 2, y, { scale: 3, align: 'center', colors: TITLE_COLORS }); else if (t) TXT(g, t, W / 2 - TW(t) / 2, y, k === 'head' ? COL.focus : COL.text); });
      } else {
        const st = S.stats, rows = [['Time', B.clock(S.playTime, false)], ['Monsters slain', st.kills], ['Secrets found', S.stats.secrets + ' of 3'], ['Hidden deeds', Object.keys(S.special).length + ' of 3'], ['Deaths', st.deaths], ['Rests', st.rests], ['Potions drunk', st.potions], ['The party', S.party.members.map(m => m.name + ' ' + m.lvl).join(', ')]];
        panel(g, W / 2 - 140, 30, 280, 30 + rows.length * 14);
        E.font.title(g, 'HASP IS FREE', W / 2, 38, { scale: 1, align: 'center', colors: TITLE_COLORS });
        rows.forEach(([k, v], i) => { TXT(g, k, W / 2 - 128, 56 + i * 14, COL.dim); TXT(g, String(v), W / 2 - 20, 56 + i * 14, COL.text); });
        prompts(g, [['confirm', 'Title']], W / 2, 50 + rows.length * 14 + 20, { align: 'center' });
      }
    });
  }
};
B.scenesShell = scenesShell;
