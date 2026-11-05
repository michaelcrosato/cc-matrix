/* THE FRONT END (section 6.23): the title over the Euphorium at night, the main menu, Kick-About's setup with the
 * controller side picker, Penalties' setup, the results, the Sticker Album, About & Credits. All 10-foot: big tiles,
 * few choices per screen, glyph footers; pad, keyboard and mouse alike. */
/* ---- the stage: a stadium behind the menus (the Euphorium at night, Daz doing keepy-uppies) ---- */
EF.Stage = {
  st: null,
  get(stadium) {
    if (this.st && this.st.id === stadium) return this.st;
    const m = new EF.Match({ home: 'kipperton', away: 'opulence', stadium, kind: 'title', seed: 7, halfLength: 999, noReplay: true, humans: [], events: false });
    for (const f of m.players) f.ghost = true;
    const daz = m.players.find(f => f.data.id === 'pilchard'); daz.ghost = false; daz.body.x = P.CX + 20; daz.body.y = P.Y0 + 120; daz.facing = Math.PI / 2;
    m.ref.body.x = -999; m.ref.body.y = -999;
    this.st = { id: stadium, m, view: new EF.MatchView(m), daz, t: 0, fw: 3 };
    return this.st;
  },
  update(dt, o = {}) {
    const S = this.get(o.stadium || 'euphorium'), m = S.m, d = S.daz; S.t += dt; m.t += dt;
    const ph = S.t * 1.9, u = Math.abs(Math.sin(ph * Math.PI / 2)), k = Math.floor(ph) % 4;
    m.ball.x = d.body.x + 6; m.ball.y = d.body.y + 2; m.ball.z = 4 + u * 26; m.ball.roll += dt * 40;
    if (Math.floor(ph) !== S.lastK) { S.lastK = Math.floor(ph); d.kickName = k === 3 ? 'header' : 'touch'; d.kickT = 0; }
    d.kickT += dt; d.look.expr = 'smile';
    S.fw -= dt; if (S.fw <= 0 && m.stadium.id === 'euphorium') { S.fw = 8; S.view.fireworks(3); EF.sfx('firework', { vol: .4 }); }
    S.view.update(dt, m);
    game.focus(P.CX + Math.sin(S.t * .07) * 200, P.Y0 + 10, 0);
  },
  draw(r, o = {}) { const S = this.get(o.stadium || 'euphorium'); S.view.draw(r, S.m); if (o.dim) r.overlay(g => px.blend(g, o.dim, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05060e'))); },
  enter() { game.setView('broadcast'); game.resetCamera(); game.setZoom(.92); game.cam.smooth = .4; game.cam.bounds = null; game.weather = null; }
};
/* ---- tile icons drawn by code ---- */
EF.icon = name => (g, cx, cy, s, foc) => {
  cx = Math.round(cx); cy = Math.round(cy); const k = s / 24, S = v => Math.round(v * k), gold = foc ? '#ffd83a' : '#c8a040';
  switch (name) {
    case 'cup': px.poly(g, [[cx - S(8), cy - S(10)], [cx + S(8), cy - S(10)], [cx + S(5), cy + S(2)], [cx - S(5), cy + S(2)]], gold); px.rect(g, cx - S(2), cy + S(2), S(4), S(5), gold); px.rect(g, cx - S(6), cy + S(7), S(12), S(3), E.shade(gold, -.3)); px.rect(g, cx - S(11), cy - S(8), S(3), S(6), gold); px.rect(g, cx + S(8), cy - S(8), S(3), S(6), gold); px.rect(g, cx - S(5), cy - S(8), S(2), S(6), '#fff6c0'); break;
    case 'ball': px.disc(g, cx, cy, S(10), '#f4f4f0'); px.disc(g, cx, cy, S(3.5), '#26262e'); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; px.disc(g, cx + Math.cos(a) * S(8), cy + Math.sin(a) * S(8), S(2.2), '#26262e'); } break;
    case 'glove': px.rect(g, cx - S(7), cy - S(4), S(14), S(12), '#3ac06a'); for (let i = 0; i < 4; i++) px.rect(g, cx - S(7) + i * S(3.6), cy - S(11), S(3), S(8), '#3ac06a'); px.rect(g, cx + S(7), cy - S(2), S(4), S(6), '#3ac06a'); px.rect(g, cx - S(7), cy + S(6), S(14), S(3), '#f4f4f0'); break;
    case 'cone': px.poly(g, [[cx, cy - S(11)], [cx + S(7), cy + S(8)], [cx - S(7), cy + S(8)]], '#ff7a1a'); px.rect(g, cx - S(4), cy - S(2), S(8), S(3), '#ffffff'); px.rect(g, cx - S(9), cy + S(8), S(18), S(3), '#c85a10'); break;
    case 'sticker': px.rect(g, cx - S(8), cy - S(11), S(16), S(22), '#f4f0e0'); px.rect(g, cx - S(6), cy - S(9), S(12), S(14), '#3a4a8a'); px.disc(g, cx, cy - S(4), S(3), '#f0c8a8'); px.rect(g, cx - S(4), cy, S(8), S(5), '#f08a24'); px.rect(g, cx - S(6), cy + S(6), S(12), S(2), '#9aa6c8'); break;
    case 'cog': px.disc(g, cx, cy, S(8), '#9aa6c8'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; px.disc(g, cx + Math.cos(a) * S(9), cy + Math.sin(a) * S(9), S(2.5), '#9aa6c8'); } px.disc(g, cx, cy, S(3.5), '#16224a'); break;
    case 'info': px.disc(g, cx, cy, S(10), '#3a6aff'); px.rect(g, cx - S(1.5), cy - S(2), S(3), S(9), '#ffffff'); px.rect(g, cx - S(1.5), cy - S(7), S(3), S(3), '#ffffff'); break;
    case 'whistle': px.disc(g, cx + S(2), cy + S(2), S(7), '#c8ccd4'); px.rect(g, cx - S(10), cy - S(3), S(12), S(6), '#c8ccd4'); px.disc(g, cx + S(2), cy + S(2), S(3), '#5a5e6a'); break;
    case 'boot': px.poly(g, [[cx - S(8), cy - S(9)], [cx, cy - S(9)], [cx, cy + S(1)], [cx + S(10), cy + S(3)], [cx + S(10), cy + S(8)], [cx - S(8), cy + S(8)]], '#1a1a20'); px.rect(g, cx - S(8), cy + S(6), S(18), S(2), '#f08a24'); break;
    case 'pens': px.rect(g, cx - S(11), cy - S(8), S(22), S(2), '#f4f4f0'); px.rect(g, cx - S(11), cy - S(8), S(2), S(14), '#f4f4f0'); px.rect(g, cx + S(9), cy - S(8), S(2), S(14), '#f4f4f0'); px.disc(g, cx, cy + S(9), S(3), '#f4f4f0'); px.disc(g, cx, cy + S(9), S(1.2), '#26262e'); break;
  }
};
EF.sceneBase = (stadium, dim) => ({ view: 'broadcast', views: ['broadcast'], input: EF.KEYS, res: 'ps1', touch: [], camera: { zoom: false } });
const RESERVED = ['enter', 'update', 'draw', 'scene', 'music', 'stadium', 'idle', 'dim', 'hideUI'];
const front = (o) => Object.assign(EF.sceneBase(), Object.fromEntries(Object.entries(o).filter(([k]) => !RESERVED.includes(k))), {
  enter(d) { EF.Stage.enter(); if (o.music !== null) EF.music(o.music || 'menu'); if (o.enter) o.enter.call(this, d || {}); if (EF.Attract) EF.Attract.reset(); },
  update(dt) { EF.Stage.update(dt, { stadium: o.stadium }); if (o.update && o.update.call(this, dt)) return; EF.UI.update(dt); if (EF.Attract) EF.Attract.watch(dt, o.idle !== false); },
  draw(r) { EF.Stage.draw(r, { stadium: o.stadium, dim: typeof o.dim === 'function' ? o.dim.call(this) : o.dim === undefined ? .55 : o.dim }); if (o.draw) o.draw.call(this, r); if (!(o.hideUI && o.hideUI.call(this))) EF.UI.draw(r); EF.drawToasts(r, 1 / 60); },
  back() { const s = EF.UI.top(); if (s) { EF.UI.back(s); return true; } return false; }
}, o.scene || {});

/* ---- TITLE ---- */
EF.titleTiles = () => {
  const sv = EF.Save.data(), cup = sv.cup, touch = EF.touchOnly(), why = 'CONTROLLER OR KEYBOARD REQUIRED';
  const cupText = cup && !cup.done ? 'CONTINUE: ' + EF.CUP.rounds[Math.min(4, cup.round)].short : cup && cup.done ? 'WON! PLAY AGAIN' : 'NEW CUP RUN';
  const T = (id, title, text, icon, onPick, playable = true) => ({ id, kind: 'tile', title, text, icon: EF.icon(icon), onPick, disabled: playable && touch, whyNot: why });
  return [
    T('cup', 'CUP RUN', cupText, 'cup', () => game.go('cup', { fresh: !cup || cup.done })),
    T('kickabout', 'KICK-ABOUT', '1-4 PLAYERS', 'ball', () => game.go('setup', { mode: 'kickabout' })),
    T('penalties', 'PENALTIES', 'SHOOTOUT', 'pens', () => game.go('setup', { mode: 'penalties' })),
    T('training', 'TRAINING', Object.keys(sv.drills).length + '/9 DRILLS', 'cone', () => game.go('training', {})),
    T('album', 'STICKER ALBUM', Object.keys(sv.stickers).length + '/51', 'sticker', () => game.go('album', {}), false),
    T('options', 'OPTIONS', 'SETTINGS', 'cog', () => game.menu('settings'), false),
    T('about', 'ABOUT & CREDITS', 'THE MAKING OF', 'info', () => game.go('about', {}), false)
  ];
};
EF.scenes.title = front({ music: 'anthem', idle: true, dim() { return this.state === 'press' ? .1 : .5; }, hideUI() { return this.state === 'press'; },
  enter(d) {
    this.state = d.menu || (EF.titleSeen && !d.press) ? 'menu' : 'press'; EF.titleSeen = true;
    const scr = { id: 'main', widgets: EF.titleTiles(), focus: d.focus || 0, footer: () => [['confirm', 'SELECT'], ['cancel', 'BACK']],
      layout(r) { const top = Math.round(r.H * .3), cw = Math.min(104, Math.floor((r.W - 40) / 4) - 6), ch = Math.min(70, Math.floor((r.H - top - 30) / 2) - 6); EF.UI.grid(this.widgets, 0, top, r.W, r.H - top - 26, 4, cw, ch, 6); },
      onBack: () => { this.state = 'press'; } };
    if (EF.touchOnly()) scr.widgets.push({ id: 'settings', kind: 'button', title: 'SETTINGS', onPick: () => game.menu('settings') });
    EF.UI.set([scr]);
  },
  update(dt) {
    if (this.state === 'press') {
      const I = game.input, any = game.players.some(p => p.pressed('start') || p.pressed('confirm')) || (I.clicked && I.clicked());
      if (EF.touchOnly() && I.clicked && I.clicked()) { const c = I.clicked(); if (this.setBtn && c[0] >= this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] >= this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) { game.menu('settings'); return true; } }
      if (any) { this.state = 'menu'; EF.sfx('confirm'); game.input.consumeAll(); }
      if (EF.Attract) EF.Attract.watch(dt, true);
      return true;
    }
    const top = EF.UI.top(); if (top && top.id === 'main') { const ws = EF.titleTiles(); top.widgets.forEach((w, i) => { if (ws[i]) { w.text = ws[i].text; w.disabled = ws[i].disabled; } }); }
  },
  draw(r) {
    const [mx, my] = EF.HUD.margin(r), press = this.state === 'press';
    r.overlay(g => {
      const ly = press ? Math.round(r.H * .16) : my, sc = press ? (r.W >= 400 ? 4 : 3) : 3;
      E.font.title(g, 'EUROPHORIA', r.W / 2, ly, { align: 'center', scale: sc, colors: ['#fffbe8', '#ffe08a', '#ffc83a', '#e0662a'], depth: 3, depthColor: '#5a2a10' });
      E.font.title(g, 'FOOTBALL', r.W / 2, ly + sc * 9 + 4, { align: 'center', scale: sc - 1, colors: ['#ffffff', '#c8d8ff', '#6a8aff'], depth: 2, depthColor: '#1a2a6a' });
      if (press) E.font.text(g, 'OVER-THE-TOP ARCADE FOOTBALL', r.W / 2, ly + sc * 9 + 4 + (sc - 1) * 9 + 6, '#fff6e0', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, E.versionLabel().replace(/·/g, '-') + '  -  EUROPHORIA ' + EF.version, r.W - mx, r.H - my - 7, '#6a7090', { font: 'tiny', outline: false, align: 'right' });
      if (press) {
        if (EF.touchOnly()) {
          const w = Math.min(r.W - 30, 280), x = Math.round((r.W - w) / 2), y = Math.round(r.H * .62);
          E.ui.box(g, x, y, w, 56, { bg: ['#2a0c18', '#4a1428'], border: '#ff5a4a' });
          E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 8, '#ffffff', { align: 'center', outline: false });
          E.font.text(g, 'Connect a pad or a keyboard to play', r.W / 2, y + 20, '#e8c0c8', { align: 'center', outline: false });
          this.setBtn = [Math.round(r.W / 2 - 50), y + 32, 100, 18]; E.ui.box(g, ...this.setBtn, { bg: '#16224a', border: '#ffc83a' }); E.font.text(g, 'SETTINGS', r.W / 2, y + 37, '#ffc83a', { align: 'center', outline: false });
        } else if (Math.floor(game.real * 2) % 2 === 0) { const I = game.input, w = EF.promptWidth('start', 'PRESS START', { input: I, scale: 2 }); EF.prompt(g, Math.round(r.W / 2 - w / 2), Math.round(r.H * .66), I.lastDevice === 'gamepad' ? 'Pad9' : 'start', 'PRESS START', { input: I, scale: 2 }); }
        const rec = EF.Save.data().records; if (rec.cupsWon) E.font.text(g, 'CUPS WON: ' + rec.cupsWon + (rec.fastestCup ? '   FASTEST CUP: ' + H.mmss(rec.fastestCup) : ''), r.W / 2, r.H - my - 20, '#ffe08a', { align: 'center', outline: '#000' });
      }
    });
  }
});

/* ---- the controller side picker (section 6.27): each joined player moves left (HOME), centre (CPU) or right (AWAY) ---- */
EF.sidePicker = (o) => {
  game.allowJoin({ max: 4 });
  const st = { pos: new Map(), ready: new Set(), t: 0 };
  const pos = I => st.pos.has(I) ? st.pos.get(I) : (I === game.input ? -1 : 0);
  return { id: 'players', title: o.title || 'PLAYERS', widgets: [{ id: 'go', kind: 'button', title: o.goLabel || 'START MATCH', onPick: () => done() }],
    layout(r) { this.widgets[0].x = r.W / 2 - 80; this.widgets[0].y = r.H - 58; this.widgets[0].w = 160; this.widgets[0].h = 22; },
    update(dt) {
      st.t += dt;
      for (const I of game.players) {
        if (I.pressed('left')) { st.pos.set(I, Math.max(o.coop ? -1 : -1, pos(I) - 1)); st.ready.delete(I); EF.sfx('select'); }
        if (I.pressed('right')) { st.pos.set(I, Math.min(o.coop ? 0 : 1, pos(I) + 1)); st.ready.delete(I); EF.sfx('select'); }
        if (I !== game.input && I.pressed('confirm')) { st.ready.add(I); EF.sfx('confirm'); }
        if (I !== game.input && I.pressed('cancel')) { game.removePlayer(I); st.pos.delete(I); }
      }
      if (game.input.pressed('cancel')) { game.allowJoin(false); EF.UI.pop(); game.input.consumeAll(); return true; }
      return false;
    },
    draw(g, r) {
      EF.UI.panel(g, r, o.title || 'PLAYERS', game.players.length < 4 ? 'PRESS START ON A PAD, OR 2 ON THE KEYBOARD, TO JOIN' : 'FOUR PLAYERS!');
      const cy = Math.round(r.H * .3), cols = [r.W * .22, r.W * .5, r.W * .78], labels = o.coop ? [o.homeName || 'HOME', 'SITTING OUT', ''] : [o.homeName || 'HOME', 'CPU', o.awayName || 'AWAY'];
      labels.forEach((l, i) => { if (!l) return; E.ui.box(g, Math.round(cols[i] - 58), cy - 4, 116, 116, { bg: ['#0d1430', '#16224a'], border: i === 1 ? '#3a4a6a' : '#ffc83a', alpha: .9 }); E.font.text(g, l, cols[i], cy + 2, i === 1 ? '#9aa6c8' : '#ffe08a', { align: 'center', outline: false }); if (o.teams && i !== 1 && o.teams[i ? 1 : 0]) EF.drawCrest(g, o.teams[i ? 1 : 0], cols[i], cy + 26, 22); });
      game.players.forEach((I, k) => {
        const p = pos(I), x = Math.round(cols[p + 1]), y = cy + 46 + k * 15, c = E.PLAYER_COLORS[k] || '#fff';
        px.rect(g, x - 34, y, 68, 13, '#0a0a14'); px.rect(g, x - 34, y, 4, 13, c);
        E.font.text(g, I.name + ' ' + (I.device === 'gamepad' || I.lastDevice === 'gamepad' ? 'PAD' : 'KEYS'), x - 26, y + 3, '#ffffff', { outline: false });
        if (st.ready.has(I) || I === game.input) E.font.text(g, 'OK', x + 30, y + 3, '#7aff9a', { align: 'right', outline: false });
      });
      EF.prompts(g, r.W / 2, r.H - 30, [['left', 'MOVE'], ['confirm', 'READY'], ['start', 'JOIN']], { input: game.input });
    },
    onBack: () => { game.allowJoin(false); EF.UI.pop(); } };
  function done() {
    const humans = game.players.map(I => ({ input: I, side: pos(I) < 0 ? 0 : pos(I) > 0 ? 1 : null })).filter(h => h.side !== null);
    if (!humans.length) { EF.toast('PICK A SIDE FIRST', { sound: 'cancel' }); return; }
    game.allowJoin(false); o.onDone(humans);
  }
};

/* ---- KICK-ABOUT and PENALTIES setup (section 6.23): teams, stadium, conditions, players ---- */
EF.scenes.setup = front({
  enter(d) {
    const pens = d.mode === 'penalties', S = this.sel = Object.assign({ home: 'kipperton', away: 'pasapasa', kit: 'auto', stadium: 'smokehouse', weather: 'auto', time: 'auto', ball: 'auto' }, EF.lastSetup || {}, d.sel || {});
    const teamChoice = (key, label) => ({ id: key, kind: 'custom', title: label, drawFn: (g, x, y, w, h, foc) => { E.ui.box(g, x, y, w, h, { bg: foc ? ['#1c2a5c', '#2a3a74'] : ['#0d1430', '#16224a'], border: foc ? '#ffc83a' : '#2a3a6a' }); const T = EF.get('team', S[key]); E.font.text(g, label, x + w / 2, y + 5, '#9aa6c8', { align: 'center', outline: false }); EF.drawCrest(g, T, x + w / 2, y + h / 2 + 2, Math.min(48, h - 40)); E.font.text(g, T.name, x + w / 2, y + h - 22, '#ffffff', { align: 'center', outline: '#000', wrap: w - 6 }); E.font.text(g, '←  ' + EF.get('tactic', T.tactic).name + '  →', x + w / 2, y + h - 11, foc ? '#ffc83a' : '#5a6280', { align: 'center', outline: false }); },
      kindAdjust: true, get: () => S[key], set: v => { S[key] = v; }, options: EF.TEAM_IDS });
    const teams = { id: 'teams', title: pens ? 'PENALTIES: TEAMS' : 'KICK-ABOUT: TEAMS', widgets: [teamChoice('home', 'HOME'), teamChoice('away', 'AWAY'),
      { id: 'kit', kind: 'choice', title: 'AWAY KIT', options: [['auto', 'Auto'], ['home', 'Home kit'], ['away', 'Away kit']], get: () => S.kit, set: v => { S.kit = v; } },
      { id: 'next', kind: 'button', title: 'NEXT', onPick: () => EF.UI.push(pens ? players() : stadium()) }],
      layout(r) { const w = Math.min(150, (r.W - 40) / 2), h = Math.min(120, r.H - 120); this.widgets[0].x = r.W / 2 - w - 6; this.widgets[1].x = r.W / 2 + 6; for (const k of [0, 1]) { this.widgets[k].y = 50; this.widgets[k].w = w; this.widgets[k].h = h; } this.widgets[2].x = r.W / 2 - 110; this.widgets[2].y = 56 + h; this.widgets[2].w = 220; this.widgets[2].h = 18; this.widgets[3].x = r.W / 2 - 60; this.widgets[3].y = 80 + h; this.widgets[3].w = 120; this.widgets[3].h = 22; },
      draw(g, r) { EF.UI.panel(g, r, pens ? 'PENALTIES' : 'KICK-ABOUT', 'PICK THE TEAMS'); },
      footer: () => [['left', 'CHANGE'], ['confirm', 'NEXT'], ['cancel', 'BACK']], onBack: () => game.go('title', { menu: true, focus: pens ? 2 : 1 }) };
    for (const w of teams.widgets.slice(0, 2)) { w.kind = 'choice'; w.custom = true; }
    const stadium = () => ({ id: 'stadium', widgets: EF.CUP_STADIUMS.map(id => { const st = EF.get('stadium', id); return { id, kind: 'tile', title: st.name.replace('THE ', '').replace('ESTADIO ', '').replace('STADIO ', '').replace(' ARENA', ''), text: st.city, icon: (g, cx, cy, s, foc) => EF.stadiumThumb(g, st, cx, cy, s * 1.6, foc), onPick: () => { S.stadium = id; EF.UI.push(conditions()); } }; }),
      layout(r) { EF.UI.grid(this.widgets, 0, 44, r.W, r.H - 70, Math.min(5, Math.floor((r.W - 20) / 84)), 78, 78, 6); }, draw(g, r) { EF.UI.panel(g, r, 'STADIUM', 'WHERE TO PLAY'); }, focus: EF.CUP_STADIUMS.indexOf(S.stadium), footer: () => [['confirm', 'PICK'], ['cancel', 'BACK']] });
    const balls = () => [['auto', 'Auto']].concat(Object.keys(EF.BALLS).map(k => [k, EF.BALLS[k].name.replace('THE ', '')]));
    const conditions = () => ({ id: 'conditions', widgets: [
      { id: 'weather', kind: 'choice', title: 'WEATHER', options: [['auto', 'As the stadium'], ['sun', 'Sun'], ['rain', 'Rain'], ['snow', 'Snow'], ['fog', 'Fog']], get: () => S.weather, set: v => { S.weather = v; } },
      { id: 'time', kind: 'choice', title: 'TIME', options: [['auto', 'As the stadium'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']], get: () => S.time, set: v => { S.time = v; } },
      { id: 'ball', kind: 'choice', title: 'BALL', options: balls(), get: () => S.ball, set: v => { if (v !== 'auto' && !EF.Save.data().unlocks.balls.includes(v)) { S.ball = v; EF.toast('LOCKED: ' + (v === 'golden' ? 'WIN THE CUP' : 'FINISH ALL 5 CHALLENGES'), { sound: 'cancel' }); } else S.ball = v; } },
      { id: 'half', kind: 'choice', title: 'HALF LENGTH', options: EF.SETTINGS.find(s => s.key === 'halfLength').options, get: () => game.settings.halfLength, set: v => game.settings.set('halfLength', v) },
      { id: 'diff', kind: 'choice', title: 'DIFFICULTY', options: EF.SETTINGS.find(s => s.key === 'difficulty').options, get: () => game.settings.difficulty, set: v => game.settings.set('difficulty', v) },
      { id: 'draws', kind: 'choice', title: 'DRAWS', options: EF.SETTINGS.find(s => s.key === 'draws').options, get: () => game.settings.draws, set: v => game.settings.set('draws', v) },
      { id: 'next', kind: 'button', title: 'NEXT', onPick: () => EF.UI.push(players()) }],
      layout(r) { const w = Math.min(300, r.W - 30); EF.UI.column(this.widgets.slice(0, 6), Math.round(r.W / 2 - w / 2), 44, w, 19, 3); const b = this.widgets[6]; b.x = r.W / 2 - 60; b.y = 44 + 6 * 22 + 4; b.w = 120; b.h = 22; },
      draw(g, r) { EF.UI.panel(g, r, 'CONDITIONS', EF.get('stadium', S.stadium).name); }, footer: () => [['left', 'CHANGE'], ['confirm', 'NEXT'], ['cancel', 'BACK']] });
    const players = () => EF.sidePicker({ title: 'PLAYERS', teams: [EF.get('team', S.home), EF.get('team', S.away)], homeName: EF.get('team', S.home).short, awayName: EF.get('team', S.away).short, goLabel: pens ? 'START SHOOTOUT' : 'START MATCH', onDone: humans => {
      EF.lastSetup = Object.assign({}, S);
      const opts = EF.matchOptsFrom(S, humans, pens);
      game.go('tunnel', { opts, short: true, next: { scene: 'match', data: { opts, again: { mode: d.mode, sel: S } } } });
    } });
    EF.UI.set([teams]);
  },
  scene: {}
});
/* left and right on a team carousel change the team */
EF.matchOptsFrom = (S, humans, pens) => {
  const st = EF.get('stadium', S.stadium), home = EF.get('team', S.home), away = EF.get('team', S.away);
  let kits = EF.Art.pickKits(home, away); if (S.kit !== 'auto') kits = ['home', S.kit];
  const weather = S.weather === 'auto' ? undefined : S.weather === 'sun' ? null : { kind: S.weather, amount: S.weather === 'fog' ? .5 : .7, wind: .2 };
  const o = { home: S.home, away: S.away, stadium: S.stadium, kind: pens ? 'penalties' : 'kickabout', draws: game.settings.draws, kits, humans, referee: H.pick(Math.random, ['haltwhistle', 'patience', 'ironside', 'severo']), shootoutOnly: !!pens };
  if (weather !== undefined) o.weather = weather; if (S.time !== 'auto') o.time = S.time; if (S.ball !== 'auto' && EF.Save.data().unlocks.balls.includes(S.ball)) o.ball = S.ball;
  if (S.weather === 'fog') o.fogStart = .6;
  return o;
};
/** a painted thumbnail of a stadium: its stands, its pitch, its weather */
EF.stadiumThumb = (g, st, cx, cy, s, foc) => {
  const w = Math.round(s * 1.5), h = Math.round(s), x = Math.round(cx - w / 2), y = Math.round(cy - h / 2), sky = st.sky || ['#3a6aa0', '#8ab0d0', '#c8d8e0'];
  px.rect(g, x, y, w, Math.round(h * .35), sky[0]); px.rect(g, x, y + Math.round(h * .2), w, Math.round(h * .15), sky[1]);
  px.rect(g, x, y + Math.round(h * .3), w, Math.round(h * .22), st.seats || '#3a3a52');
  for (let i = 0; i < w; i += 3) px.rect(g, x + i, y + Math.round(h * .32) + (i % 2), 1, 1, i % 6 ? '#e8e0d0' : '#ffc83a');
  const gr = st.grass || ['#3f7a34', '#4a8a3c']; for (let i = 0; i < 6; i++) px.rect(g, x + Math.round(i * w / 6), y + Math.round(h * .52), Math.ceil(w / 6), h - Math.round(h * .52), gr[i % 2]);
  px.rect(g, x + Math.round(w / 2), y + Math.round(h * .52), 1, h - Math.round(h * .52), '#e8ece0');
  const W2 = st.weather; if (W2 && W2.kind === 'rain') for (let i = 0; i < 14; i++) px.rect(g, x + ((i * 37) % w), y + ((i * 23) % h), 1, 3, '#a8c8e8');
  if (W2 && W2.kind === 'snow') for (let i = 0; i < 18; i++) px.rect(g, x + ((i * 41) % w), y + ((i * 29) % h), 1, 1, '#ffffff');
  if (st.time === 'night') px.disc(g, x + w - 6, y + 5, 2, '#fff0c0');
  if (foc) { px.rect(g, x, y, w, 1, '#ffc83a'); px.rect(g, x, y + h - 1, w, 1, '#ffc83a'); }
};
/* the setup's team carousels: left/right steps through the six teams */
const _adjust0 = EF.UI.adjust.bind(EF.UI);
EF.UI.adjust = function (w, d) { if (w.custom) { const o = w.options, i = o.indexOf(w.get()); w.set(o[(i + d + o.length) % o.length]); EF.sfx('select'); return; } return _adjust0(w, d); };
const _drawW0 = EF.UI.drawWidget.bind(EF.UI);
EF.UI.drawWidget = function (g, r, w, foc, s) { if (w.custom && w.drawFn) return w.drawFn(g, Math.round(w.x), Math.round(w.y), Math.round(w.w), Math.round(w.h), foc); return _drawW0(g, r, w, foc, s); };

/* ---- RESULTS (section 6.23) ---- */
EF.scenes.results = front({ music: null,
  enter(d) {
    const R = this.res = d.result, opts = d.opts || {}; this.d = d;
    const win = R.winner, human = (opts.humans || []).map(h => h.side);
    EF.music(win >= 0 && human.includes(win) ? 'victory' : win >= 0 && human.length && !human.includes(win) ? 'defeat' : 'victory');
    this.stickers = d.stickers || [];
    const W = [{ id: 'cont', kind: 'button', title: d.contLabel || 'CONTINUE', onPick: () => { if (d.next) d.next(); else game.go('setup', d.again || { mode: 'kickabout' }); } }];
    if (!d.next) W.push({ id: 'title', kind: 'button', title: 'TITLE', onPick: () => game.go('title', { menu: true }) });
    EF.UI.set([{ id: 'results', widgets: W, layout(r) { const n = this.widgets.length; this.widgets.forEach((w, i) => { w.w = 110; w.h = 22; w.x = Math.round(r.W / 2 - (n * 116) / 2 + i * 116); w.y = r.H - 50; }); }, footer: () => [['confirm', 'SELECT']], onBack: () => { if (!d.next) game.go('title', { menu: true }); } }]);
    this.potmRig = R.potm ? EF.Art.rigFor(R.potm.team, 'home', R.potm.data) : null;
  },
  draw(r) {
    const R = this.res, T = R.teams.map(t => EF.get('team', t)); if (!R) return;
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), cx = r.W / 2;
      E.ui.box(g, Math.round(cx - 130), my + 26, 260, 160, { bg: ['#0d1430', '#16224a'], border: '#2a3a6a', alpha: .92 });
      E.font.title(g, R.winner < 0 ? 'A DRAW' : T[R.winner].short + ' WIN', cx, my + 2, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      EF.drawCrest(g, T[0], cx - 90, my + 52, 34); EF.drawCrest(g, T[1], cx + 90, my + 52, 34);
      E.font.text(g, R.score[0] + ' - ' + R.score[1], cx, my + 38, '#ffffff', { align: 'center', scale: 4, outline: '#000' });
      if (R.pens) E.font.text(g, '(' + R.pens[0] + ' - ' + R.pens[1] + ' ON PENALTIES)', cx, my + 72, '#ffc83a', { align: 'center', outline: '#000' });
      R.goals.slice(0, 4).forEach((gl, i) => E.font.text(g, gl.minute + "'  " + gl.name + (gl.own ? ' (OG)' : gl.super ? ' (SUPER)' : ''), gl.side ? cx + 30 : cx - 30, my + 84 + i * 10, '#c8d0e8', { align: gl.side ? 'left' : 'right', outline: '#000' }));
      const st = R.stats;
      const sy = my + 130; [['SHOTS', st.shots[0], st.shots[1]], ['TACKLES', st.tackles[0], st.tackles[1]], ['SAVES', st.saves[0], st.saves[1]]].forEach(([k, a, b], i) => { E.font.text(g, a + '   ' + k + '   ' + b, cx, sy + i * 11, '#ffffff', { align: 'center', outline: '#000' }); });
      if (this.potmRig && r.W > 300) { E.ui.box(g, mx, my + 34, 74, 92, { bg: ['#0d1430', '#16224a'], border: '#ffc83a' }); this.potmRig.drawPortrait(g, mx + 5, my + 40, 64, { zoom: 2.4, turn: .3 }); E.font.text(g, 'PLAYER OF THE MATCH', mx + 37, my + 108, '#ffc83a', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, R.potm.short, mx + 37, my + 116, '#ffffff', { align: 'center', font: 'tiny', outline: false }); }
      if (this.stickers.length && r.W > 300) { E.ui.box(g, r.W - mx - 84, my + 34, 84, 40, { bg: ['#2a1a4a', '#3a2a6a'], border: '#ffc83a' }); E.font.text(g, 'STICKERS', r.W - mx - 42, my + 40, '#ffe08a', { align: 'center', outline: false }); E.font.text(g, '+' + this.stickers.length, r.W - mx - 42, my + 52, '#ffffff', { align: 'center', scale: 2, outline: false }); }
    });
  }
});

/* ---- THE STICKER ALBUM (section 6.23): a page per team, then stadiums, challenges and specials; L1/R1 turn pages ---- */
EF.scenes.album = front({ music: 'credits',
  enter(d) { this.page = d.page || 0; this.flip = 0; this.rigs = {}; EF.UI.set([{ id: 'album', widgets: [], tabs: { n: EF.ALBUM_PAGES.length, get: () => this.page, set: v => { this.flip = v > this.page ? 1 : -1; this.page = v; } }, footer: () => [['switch', ''], ['skill', 'PAGE'], ['left', 'PAGE'], ['cancel', 'BACK']], onBack: () => game.go('title', { menu: true, focus: 4 }) }]); },
  update(dt) {
    this.flip = approach(this.flip, 0, dt * 4);
    if (EF.UI.pressed('left') || EF.UI.pressed('right')) { const d = EF.UI.pressed('left') ? -1 : 1; this.page = (this.page + d + EF.ALBUM_PAGES.length) % EF.ALBUM_PAGES.length; this.flip = d; EF.sfx('paper'); }
    const c = game.input.clicked && game.input.clicked(); if (c) { const d = c[0] < game.W / 2 ? -1 : 1; this.page = (this.page + d + EF.ALBUM_PAGES.length) % EF.ALBUM_PAGES.length; this.flip = d; EF.sfx('paper'); game.input.consumeAll(); }
  },
  draw(r) {
    const pg = EF.ALBUM_PAGES[this.page], list = EF.all('sticker').filter(s => s.page === pg.id), sv = EF.Save.data().stickers, k = 1 - Math.abs(this.flip);
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), pw = Math.round(Math.min(r.W - 2 * mx, 380) * Math.max(.05, k)), ph = r.H - 2 * my - 20, x0 = Math.round(r.W / 2 - pw / 2), y0 = my;
      E.ui.box(g, x0, y0, pw, ph, { bg: ['#e8dcc0', '#d8c8a0'], border: '#8a6a3a' });
      if (k < .4) return;
      E.font.text(g, pg.title, r.W / 2, y0 + 6, '#3a2a1a', { align: 'center', scale: 2, outline: false });
      E.font.text(g, (this.page + 1) + ' / ' + EF.ALBUM_PAGES.length + '   ' + Object.keys(sv).length + ' / 51', r.W / 2, y0 + ph - 11, '#6a5a3a', { align: 'center', outline: false });
      const cols = list.length > 6 ? 4 : 3, cw = Math.min(88, Math.floor((pw - 20) / cols) - 6), ch = Math.min(Math.floor((ph - 44) / Math.ceil(list.length / cols)) - 6, 90);
      list.forEach((s, i) => {
        const c = i % cols, rr = Math.floor(i / cols), rowN = Math.min(cols, list.length - rr * cols), x = Math.round(r.W / 2 - (rowN * (cw + 6)) / 2 + c * (cw + 6)), y = y0 + 26 + rr * (ch + 6), got = sv[s.id], shiny = got === 'shiny' || (got && s.shiny);
        px.rect(g, x, y, cw, ch, got ? (shiny ? '#ffe070' : '#f8f4e8') : '#b8a888'); px.rect(g, x + 2, y + 2, cw - 4, ch - 18, got ? '#3a4a8a' : '#8a7a5a');
        if (got) EF.drawSticker(g, s, x + 2, y + 2, cw - 4, ch - 18, this);
        else E.font.text(g, '?', x + cw / 2, y + (ch - 18) / 2 - 6, '#5a4a3a', { align: 'center', scale: 2, outline: false });
        E.font.text(g, got ? s.name : s.how, x + cw / 2, y + ch - 14, got ? '#2a1a10' : '#5a4a3a', { align: 'center', font: got && E.font.width(s.name) < cw - 4 ? 'normal' : 'tiny', outline: false, wrap: cw - 4 });
        if (shiny && got) for (let q = 0; q < 3; q++) { const t = (game.real * .7 + q * .33) % 1; px.rect(g, x + Math.round(t * cw), y + 3, 2, 2, '#ffffff'); }
      });
    });
  }
});
EF.drawSticker = (g, s, x, y, w, h, owner) => {
  if (s.kind === 'player') { const key = s.team + ':' + s.ref; const rig = owner.rigs[key] || (owner.rigs[key] = EF.Cast.rig(key)); rig.drawPortrait(g, x + w / 2 - Math.min(w, h) / 2, y, Math.min(w, h), { zoom: 2.4, turn: .3, bg: '#3a4a8a' }); const t = EF.get('team', s.team); EF.drawCrest(g, t, x + w - 8, y + 8, 12); }
  else if (s.kind === 'crest') EF.drawCrest(g, EF.get('team', s.team), x + w / 2, y + h / 2, Math.min(w, h) - 8);
  else if (s.kind === 'stadium') EF.stadiumThumb(g, EF.get('stadium', s.ref), x + w / 2, y + h / 2, Math.min(w / 1.6, h) - 4, false);
  else if (s.kind === 'challenge') { EF.icon(s.ref === 'superGoal' ? 'ball' : s.ref === 'header' ? 'boot' : s.ref === 'nutmeg' ? 'boot' : s.ref === 'freekickGoal' ? 'pens' : 'glove')(g, x + w / 2, y + h / 2, Math.min(w, h) - 10, true); }
  else { const id = s.ref === 'barry' ? 'barry' : s.ref === 'keith' ? null : s.ref === 'bus' ? null : s.ref === 'pilchard' ? 'kipperton:pilchard' : s.ref; if (id) { const rig = owner.rigs[id] || (owner.rigs[id] = EF.Cast.rig(id)); rig.drawPortrait(g, x + w / 2 - Math.min(w, h) / 2, y, Math.min(w, h), { zoom: 2.4, turn: .3, bg: '#3a4a8a' }); } else if (s.ref === 'keith') { px.sprite(g, EF.SPR.kipper, x + w / 2 - 8, y + h / 2 - 5, { scale: 2 }); } else { px.rect(g, x + 6, y + h / 2 - 6, w - 12, 14, '#c8ccd4'); px.rect(g, x + 6, y + h / 2 - 6, w - 12, 4, '#7a1a2a'); px.disc(g, x + 14, y + h / 2 + 8, 3, '#1a1a1a'); px.disc(g, x + w - 14, y + h / 2 + 8, 3, '#1a1a1a'); } }
};

/* ---- ABOUT & CREDITS (section 6.32): Source Information, the three feedbacks, the credits; one block per page ---- */
EF.aboutPages = () => {
  const A = EF.ABOUT, S = A.sourceInformation || {}, f = (k, v) => [k, v || 'unknown'];
  const tq = ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'];
  const eq = ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'];
  const pq = ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'];
  const pages = [
    { title: 'SOURCE INFORMATION', rows: [f('Date', S.date), f('Source', S.source), f('Plan', S.plan), f('Genre', S.genre), f('Perspective', S.perspective), f('Tech', S.tech), f('Art Direction', S.artDirection)] },
    { title: 'SOURCE INFORMATION', rows: [f('Animation', S.animation), f('Audio', S.audio), f('Online', S.online), f('Testing', S.testing)] },
    { title: 'SOURCE INFORMATION', rows: [f('Research', S.research), f('Environment', S.environment), f('Model', S.model), f('Usage', S.usage)] },
    { title: 'TESTING FEEDBACK', rows: tq.map((q, i) => f(q, (A.testingFeedback || [])[i])) },
    { title: 'ENGINE FEEDBACK', rows: eq.slice(0, 3).map((q, i) => f(q, (A.engineFeedback || [])[i])) },
    { title: 'ENGINE FEEDBACK', rows: eq.slice(3).map((q, i) => f(q, (A.engineFeedback || [])[i + 3])) },
    { title: 'PROMPT FEEDBACK', rows: pq.map((q, i) => f(q, (A.promptFeedback || [])[i])) },
    { title: 'CREDITS', rows: [['Game', 'Europhoria Football, made by Claude (Anthropic, claude-opus-5-5) from TASK.md and PLAN.md.'], ['Engine', 'my-3D2dge v' + E.version + ' by Michael Crosato (the handoff package), changed as CHANGES-ENGINE.md says.'], ['Motion', 'Quaternius Universal Animation Library (CC0); Mesh2Motion (CC0); CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu, free for all uses, created with funding from NSF EIA-0196217.'], ['Online', 'AI Hub Session Protocol v1, client session.js 1.4.0.'], ['Sound', 'Every note, crowd and voice synthesised in code.'], ['Thanks', 'Kipperton. Population 3,112. Never change.']] }
  ];
  return pages;
};
EF.scenes.about = front({ music: 'credits',
  enter() { this.page = 0; this.pages = EF.aboutPages(); EF.UI.set([{ id: 'about', widgets: [], tabs: { n: this.pages.length, get: () => this.page, set: v => { this.page = v; } }, footer: () => [['switch', ''], ['skill', 'PAGE'], ['left', 'PAGE'], ['cancel', 'BACK']], onBack: () => game.go('title', { menu: true, focus: 6 }) }]); },
  update() { if (EF.UI.pressed('left') || EF.UI.pressed('up')) { this.page = (this.page + this.pages.length - 1) % this.pages.length; EF.sfx('select'); } if (EF.UI.pressed('right') || EF.UI.pressed('down') || EF.UI.pressed('confirm')) { this.page = (this.page + 1) % this.pages.length; EF.sfx('select'); } const c = game.input.clicked && game.input.clicked(); if (c) { this.page = (this.page + (c[0] < game.W / 2 ? this.pages.length - 1 : 1)) % this.pages.length; EF.sfx('select'); game.input.consumeAll(); } },
  draw(r) {
    const p = this.pages[this.page];
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), w = r.W - 2 * mx, x = mx, y = my, h = r.H - 2 * my - 18;
      E.ui.box(g, x, y, w, h, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .95 });
      E.font.text(g, p.title, r.W / 2, y + 6, '#ffc83a', { align: 'center', scale: 2, outline: '#000' });
      E.font.text(g, (this.page + 1) + ' / ' + this.pages.length, x + w - 8, y + 8, '#9aa6c8', { align: 'right', outline: false });
      let yy = y + 28; const lim = y + h - 6;
      for (const [k, v] of p.rows) { if (yy > lim) break; E.font.text(g, k, x + 8, yy, '#ffe08a', { outline: false, wrap: w - 16 }); yy += E.font.wrap(k, w - 16).length * 9 + 1; const lines = E.font.wrap(String(v), w - 22); for (const ln of lines) { if (yy > lim) break; E.font.text(g, ln, x + 14, yy, '#ffffff', { outline: false }); yy += 9; } yy += 4; }
    });
  }
});
