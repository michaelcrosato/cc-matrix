/* ---- FRONT END: the title (a four-season diorama round Meridian's clock tower), campaign setup, skirmish setup,
 * About & Credits, How to Play, the endings and the credits roll ---- */
G.scenes = G.scenes || {};
const SEASON_BG = {
  spring: { sky: ['#6aa8e0', '#a8d8f0', '#f0f4e0'], sun: { x: .78, y: .22, r: 12, color: '#fff8d0' }, layers: [{ kind: 'mountains', color: '#8ab0c8', y: .55, height: .25, parallax: .1 }, { kind: 'hills', color: '#6ab050', y: .66, height: .2, parallax: .25 }, { kind: 'forest', color: '#3f8a35', y: .76, height: .15, parallax: .4 }] },
  summer: { sky: ['#e09040', '#f0c870', '#fff0c0'], sun: { x: .3, y: .25, r: 16, color: '#fff0a0' }, layers: [{ kind: 'mountains', color: '#c86a3a', y: .58, height: .22, parallax: .1 }, { kind: 'hills', color: '#d8b060', y: .7, height: .16, parallax: .25 }] },
  autumn: { sky: ['#6a3a40', '#c87a50', '#f0c890'], sun: { x: .7, y: .4, r: 14, color: '#ffc080' }, layers: [{ kind: 'hills', color: '#a85a2a', y: .62, height: .22, parallax: .15 }, { kind: 'forest', color: '#c86a1e', y: .74, height: .16, parallax: .35 }] },
  winter: { sky: ['#1a2a50', '#5a7ab0', '#c8d8f0'], moon: { x: .25, y: .2, r: 10, color: '#f0f8ff' }, stars: 40, layers: [{ kind: 'mountains', color: '#d8e4f4', y: .55, height: .3, parallax: .1 }, { kind: 'forest', color: '#2a4a5a', y: .74, height: .16, parallax: .35 }] }
};
const WX = { spring: { kind: 'rain', amount: .2 }, summer: null, autumn: { kind: 'leaves', amount: .4, wind: .3 }, winter: { kind: 'snow', amount: .5 } };
const ledge = (top, side) => new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'stone', side, top, moss: '#4a6a3a' } }, edges: 'open' });
G.scenes.title = {
  view: 'side', views: ['side'], res: 'ps1', input: G.INPUT, touch: [],
  enter() {
    this.bgs = {}; for (const s of G.SEASONS) this.bgs[s] = new E.Backdrop(SEASON_BG[s]);
    this.stage = ledge('#8a8478', '#5a5468'); this.t = 0; this.si = 0; G.idle = 0; G.attract = null;
    this.lineup = ['gareth', 'morgause', 'meliant', 'pellam', 'mordrain'].map((id, i) => ({ id, rig: new E.Humanoid(Object.assign({}, G.get('knight', id).look)), x: 400 + [-150, -105, 0, 105, 150][i], f: i < 2 ? 0 : i > 2 ? Math.PI : Math.PI / 2 }));
    const items = () => { const latest = G.game.saves && G.game.saves.latest && G.game.saves.latest(); return [latest ? { label: 'Continue', id: 'continue' } : null, { label: 'New Campaign', id: 'new' }, { label: 'Skirmish', id: 'skirmish' }, { label: 'Load', id: 'load', disabled: !(G.game.saves && G.game.saves.any), why: 'No saves yet' }, { label: 'How to Play', id: 'help' }, { label: 'Settings', id: 'settings' }, { label: 'About & Credits', id: 'about' }].filter(Boolean); };
    this.items = items; this.menu = new G.ui.List(items()); G.music('title'); G.game.weather = null; G.game.lights.enabled = false;
    G.game.input.touchEnabled = false;
  },
  update(dt) {
    this.t += dt; G.trackIdle(dt);
    if (G.dev.open) { G.devUpdate(dt); return; }
    const s = Math.floor(this.t / 6) % 4; if (s !== this.si) { this.si = s; G.game.weather = WX[G.SEASONS[s]] ? Object.assign({}, WX[G.SEASONS[s]]) : null; }
    for (const h of this.lineup) { const u = (this.t * .4 + h.x * .01) % 4; h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.f, vx: 0, vy: 0, pose: u > 3.4 ? 'cheer' : null }); }
    G.game.focus(400, 0, 32 + (G.game.H / 2 - 44) / -G.game.view.bz);
    if (G.idle > 10) { G.game.go('attract', {}, { fade: 'dissolve' }); return; }
    if (G.touchOnly()) { const c = G.game.input.clicked(); if (c && this.touchBtn && c[0] >= this.touchBtn.x && c[0] <= this.touchBtn.x + this.touchBtn.w && c[1] >= this.touchBtn.y && c[1] <= this.touchBtn.y + this.touchBtn.h) G.game.menu('settings'); return; }
    this.menu.set(this.items());
    const r = this.menu.update(dt);
    if (G.game.input.pressed('help')) { G.game.go('help', { back: 'title' }); return; }
    if (r === 'pick') {
      const id = this.menu.cur.id;
      if (id === 'continue') { const l = G.game.saves.latest(); if (l) G.game.saves.load(l.slot); }
      else if (id === 'new') G.game.go('setup');
      else if (id === 'skirmish') G.game.go('skirmish');
      else if (id === 'load') G.game.saves.show('load');
      else if (id === 'help') G.game.go('help', { back: 'title' });
      else if (id === 'settings') G.game.menu('settings');
      else if (id === 'about') G.game.go('about', { back: 'title' });
    }
  },
  draw(r) {
    const s = G.SEASONS[this.si], k = (this.t % 6) / 6;
    this.bgs[s].draw(r);
    this.stage.draw(r);
    r.shape('bt-clocktower', 400, -70, 32, { scale: .9 });
    for (const x of [300, 500]) r.prop('torch', x, -6, 32, { size: 1.2 });
    for (const h of this.lineup) { r.shadow(h.x, 0, 7, .4, '#000', 32); r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view)); }
    r.overlay(g => {
      if (k > .9) px.blend(g, (k - .9) * 6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#ffffff'));
      E.font.title(g, 'BRIGANTIME', r.W / 2, 12, { align: 'center', scale: 3, colors: ['#fff8e0', '#f0d070', '#c08a30', '#7a4a1a'], depth: 3 });
      G.ui.text(g, 'THE LEGEND OF FORSEASONS', r.W / 2, 42, '#f0e8d8', { align: 'center' });
      G.SEASONS.forEach((se, i) => G.art.seasonIcon(g, se, r.W / 2 - 30 + i * 20, 58, i === this.si ? 4 : 3));
      G.ui.text(g, 'Brigantime ' + G.VERSION + (E.version ? ' - engine ' + E.version : ''), 4, r.H - 9, '#8a86a0', { font: 'tiny' });
      if (G.touchOnly()) { const w = 220, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - 20); G.ui.panel(g, x, y, w, 64, null); G.ui.text(g, 'Controller or keyboard required', r.W / 2, y + 10, '#ffe8a8', { align: 'center' }); this.touchBtn = { x: x + 60, y: y + 30, w: 100, h: 24 }; E.ui.box(g, x + 60, y + 30, 100, 24, { border: '#ffe070' }); G.ui.text(g, 'SETTINGS', r.W / 2, y + 38, '#ffffff', { align: 'center' }); return; }
      const w = 150, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .52); G.ui.panel(g, x - 6, y - 6, w + 12, this.menu.items.length * 13 + 10, null, { alpha: .8 });
      this.menu.draw(g, x, y, w);
    });
    if (!G.touchOnly()) G.ui.prompts(r, [['confirm', 'Select'], ['up', 'Move']]);
    G.ui.drawToasts(r, 1 / 60);
  }
};
// campaign setup: players, realms (one per human, no repeats), difficulty, then Begin
G.scenes.setup = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter() { this.step = 0; this.players = 1; this.picks = []; this.diff = 1; this.bg = new E.Backdrop(SEASON_BG.autumn); this.list = this.mkList(); this.ri = 0; G.idle = 0; this.vis = {}; for (const r of G.PLAYABLE) this.vis[r] = G.art.visual({ kind: 'knight', id: G.get('realm', r).ruler }); },
  mkList() { if (this.step === 0) return new G.ui.List([1, 2, 3, 4].map(n => ({ label: n === 1 ? '1 player' : n + ' players (hot-seat)', id: n }))); if (this.step === 2) return new G.ui.List(['Easy', 'Normal', 'Hard'].map(d => ({ label: d, id: d.toLowerCase() })), { i: 1 }); return null; },
  update(dt) {
    G.trackIdle(dt); if (G.idle > 10) { G.game.go('attract'); return; }
    const I = G.game.input; for (const r in this.vis) this.vis[r].update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
    if (this.step === 1) {
      const avail = G.PLAYABLE.filter(r => !this.picks.includes(r));
      if (I.repeat('left', .25, .1)) { this.ri = (this.ri + avail.length - 1) % avail.length; G.sfx('ui_move'); } if (I.repeat('right', .25, .1)) { this.ri = (this.ri + 1) % avail.length; G.sfx('ui_move'); }
      const p = I.pointer(), c = I.clicked(); if (this.cards) { this.cards.forEach((b, i) => { if (p && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h && this.ptrMoved) this.ri = i; if (c && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h) { this.ri = i; this.pickRealm(avail); } }); } this.ptrMoved = p && (!this.lp || p[0] !== this.lp[0] || p[1] !== this.lp[1]); this.lp = p;
      if (I.pressed('confirm')) this.pickRealm(avail);
      if (I.pressed('cancel')) { G.sfx('ui_cancel'); if (this.picks.length) this.picks.pop(); else { this.step = 0; this.list = this.mkList(); } }
      return;
    }
    if (this.step === 3) { if (I.pressed('confirm') || I.clicked()) { G.sfx('ui_confirm'); G.newCampaign({ realms: this.picks, difficulty: this.diff }); } if (I.pressed('cancel')) { this.step = 2; this.list = this.mkList(); } return; }
    const r = this.list.update(dt);
    if (r === 'back') { if (this.step === 0) G.game.go('title'); else { this.step--; if (this.step === 1) this.picks = []; this.list = this.mkList(); } }
    if (r === 'pick') { if (this.step === 0) { this.players = this.list.cur.id; this.step = 1; this.ri = 0; } else if (this.step === 2) { this.diff = this.list.cur.id; this.step = 3; } this.list = this.mkList(); }
  },
  pickRealm(avail) { const r = avail[this.ri]; if (!r) return; this.picks.push(r); G.sfx('ui_confirm'); this.ri = 0; if (this.picks.length >= this.players) { this.step = 2; this.list = this.mkList(); } },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => {
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
      E.font.title(g, ['PLAYERS', 'CHOOSE A REALM', 'DIFFICULTY', 'BEGIN'][this.step], r.W / 2, 12, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] });
      if (this.step === 0 || this.step === 2) {
        const w = 200, x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x - 6, 50, w + 12, 70, null); this.list.draw(g, x, 56, w);
        if (this.step === 2) { const d = this.list.cur.id; G.ui.wrapText(g, { easy: 'Rivals earn less and attack later. The candle burns 18 seasons. Your knights learn faster.', normal: 'The war as the chroniclers tell it. The candle burns 15 seasons.', hard: 'Rivals are rich and bold, and their battle AI focuses fire. The candle burns 12 seasons.' }[d], x, 128, w, '#e8e0d0'); }
        if (this.step === 0) G.ui.wrapText(g, 'Hot-seat: each player musters and marches in turn on this device. Battles between two humans are fought here too.', x, 128, w, '#c8c0d8');
      }
      if (this.step === 1) {
        const avail = G.PLAYABLE.filter(x => !this.picks.includes(x)), cw = Math.min(100, Math.floor((r.W - 20) / avail.length) - 6), x0 = Math.round(r.W / 2 - (avail.length * (cw + 6)) / 2); this.cards = [];
        G.ui.text(g, 'Player ' + (this.picks.length + 1) + ', choose your realm', r.W / 2, 34, '#e8e0d0', { align: 'center' });
        avail.forEach((rid, i) => { const R = G.get('realm', rid), x = x0 + i * (cw + 6), y = 48, h = 150, foc = i === this.ri; this.cards.push({ x, y, w: cw, h }); G.ui.panel(g, x, y, cw, h, null, { border: foc ? '#ffe070' : R.main });
          G.art.banner(g, rid, x + 6, y + 6, 1.2); G.art.seasonIcon(g, R.season, x + cw - 12, y + 12, 4); try { this.vis[rid].portrait(g, x + cw / 2 - 20, y + 24, 40); } catch (e) { /* no portrait */ }
          G.ui.text(g, R.short, x + cw / 2, y + 70, R.main, { align: 'center' }); G.ui.text(g, G.get('knight', R.ruler).short, x + cw / 2, y + 80, '#ffffff', { align: 'center', font: 'tiny' });
          G.ui.wrapText(g, R.pitch.join(' '), x + 5, y + 92, cw - 10, '#d8d0e0', 9, { font: 'tiny' }); if (foc) px.rect(g, x + 2, y + h - 4, cw - 4, 2, '#ffe070'); });
      }
      if (this.step === 3) { G.ui.text(g, this.picks.map(p => G.get('realm', p).short).join(' • ') + ' • ' + G.cap(this.diff), r.W / 2, 70, '#ffffff', { align: 'center' }); G.ui.text(g, 'The Brigantime begins in Spring, Year 1.', r.W / 2, 90, '#e8d8a8', { align: 'center' }); }
    });
    G.ui.prompts(r, this.step === 1 ? [['left', 'Realm'], ['confirm', 'Choose'], ['cancel', 'Back']] : [['confirm', this.step === 3 ? 'Begin' : 'Choose'], ['cancel', 'Back']]);
  }
};
// skirmish: a map, a season (or the Wheel), 2-4 sides of humans or CPUs, an army per side; Banners of the Wheel preset
G.SKIRMISH_MAPS = G.all('map').filter(m => !['border_meadow', 'clockwork_sanctum'].includes(m.id)).map(m => m.id);
G.armyFor = (realm, level, n, seatAnchor) => {
  const ks = G.all('knight').filter(k => k.realm === realm && k.id !== 'graynight').sort((a, b) => (b.ruler ? 1 : 0) - (a.ruler ? 1 : 0)).slice(0, n);
  const tier = l => l >= 22 ? 3 : l >= 12 ? 2 : 1;
  return ks.map(k => ({ knight: Object.assign(G.makeKnightRec(k.id, Math.max(k.cls === 'knight' || k.cls === 'ranger' || k.cls === 'sorcerer' || k.cls === 'priest' || k.cls === 'beastlord' ? 10 : 1, level)), { equip: {} }), monsters: k.troop.slice(0, n === 1 ? 2 : 4).map(([sp], i) => ({ uid: realm + k.id + i, sp, tier: sp === 'pendulumwyrm' ? 1 : tier(level), lvl: Math.max(1, level - (i > 1 ? 1 : 0)), exp: 0 })), formation: 'vanguard' }));
};
G.skirmishSpec = cfg => {
  const n = cfg.sides.length, shrine = cfg.banners || n > 2, map = shrine ? 'wheel_shrine' : cfg.map, season = cfg.season === 'wheel' ? 'spring' : cfg.season;
  const seats = n === 2 ? ['1', '3'] : n === 3 ? ['1', '2', '3'] : ['1', '2', '3', '4'];
  return { map, season, seed: cfg.seed || 4242, mode: shrine ? 'shrine' : 'siege', wheel: cfg.season === 'wheel', region: season, sides: cfg.sides.map((s, i) => ({ realm: s.realm, name: (s.human ? 'P' + (cfg.sides.slice(0, i + 1).filter(x => x.human).length) + ' ' : 'CPU ') + G.get('realm', s.realm).short, human: s.human, ai: s.ai || 'normal', anchor: shrine ? seats[i] : undefined, troops: G.armyFor(s.realm, s.level, shrine ? 1 : 3), items: s.human ? ['herb', 'herb', 'remedy'] : [] })) };
};
G.scenes.skirmish = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) {
    this.cfg = this.cfg || { map: 'river_ford', season: 'spring', banners: false, sides: [{ human: true, realm: 'verdance', level: 10 }, { human: false, ai: 'normal', realm: 'hoarfast', level: 10 }] };
    this.bg = new E.Backdrop(SEASON_BG.spring); this.list = new G.ui.List(this.rows()); G.idle = 0; this.post = d && d.post;
  },
  rows() {
    const c = this.cfg, out = [{ label: 'Preset: ' + (c.banners ? 'Banners of the Wheel' : 'Custom'), id: 'banners' }];
    if (!c.banners) { out.push({ label: 'Map: ' + G.get('map', c.map).name, id: 'map', disabled: c.sides.length > 2, why: '3-4 sides fight on the Wheel Shrine' }, { label: 'Season: ' + (c.season === 'wheel' ? 'The Wheel (turns each bell)' : G.SEASON_NAME[c.season]), id: 'season' }); }
    out.push({ label: 'Sides: ' + c.sides.length, id: 'sides' });
    c.sides.forEach((s, i) => { out.push({ label: 'Side ' + (i + 1) + ': ' + (s.human ? 'Human' : 'CPU ' + G.cap(s.ai)), id: 'who' + i, color: G.SEAT_COLORS[i] }); out.push({ label: '   Army: ' + G.get('realm', s.realm).short + ' • Level ' + s.level, id: 'army' + i }); });
    out.push({ label: 'FIGHT!', id: 'go', color: '#ffe070' });
    return out;
  },
  update(dt) {
    G.trackIdle(dt); if (G.idle > 10 && !this.post) { G.game.go('attract'); return; }
    const c = this.cfg, r = this.list.update(dt), cycle = (arr, v, d = 1) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
    const dir = r === 'left' ? -1 : r === 'right' || r === 'pick' ? 1 : 0;
    if (r === 'back') { G.game.go('title'); return; }
    if (dir && this.list.cur) {
      const id = this.list.cur.id;
      if (id === 'banners') { c.banners = !c.banners; if (c.banners) { c.season = 'wheel'; } }
      else if (id === 'map') c.map = cycle(G.SKIRMISH_MAPS.filter(m => m !== 'wheel_shrine'), c.map, dir);
      else if (id === 'season') c.season = cycle(['spring', 'summer', 'autumn', 'winter', 'wheel'], c.season, dir);
      else if (id === 'sides') { const n = Math.max(2, Math.min(4, c.sides.length + dir)); while (c.sides.length < n) c.sides.push({ human: false, ai: 'normal', realm: G.PLAYABLE[c.sides.length % 4], level: 10 }); c.sides.length = n; }
      else if (id.startsWith('who')) { const s = c.sides[+id.slice(3)], opts = ['human', 'easy', 'normal', 'hard'], cur = s.human ? 'human' : s.ai, nx = cycle(opts, cur, dir); s.human = nx === 'human'; s.ai = s.human ? 'normal' : nx; }
      else if (id.startsWith('army')) { const s = c.sides[+id.slice(4)]; if (r === 'pick' || r === 'right') { const realms = ['verdance', 'solmark', 'amberlyn', 'hoarfast', 'dominion', 'brigands']; const k = realms.indexOf(s.realm) * 4 + [5, 10, 15, 20].indexOf(s.level) + 1, kk = k % 24; s.realm = realms[Math.floor(kk / 4)]; s.level = [5, 10, 15, 20][kk % 4]; } else s.level = cycle([5, 10, 15, 20], s.level, -1); }
      else if (id === 'go' && r === 'pick') { this.fight(); return; }
      this.list.set(this.rows()); if (r !== 'pick') G.sfx('ui_move');
    }
  },
  fight() {
    const spec = G.skirmishSpec(this.cfg); spec.seed = (Date.now() >>> 0) % 1e9;
    G.startBattle(spec, { back: 'skirmish', shrine: spec.mode === 'shrine', onDone: () => G.game.go('skirmish', { post: true }) });
  },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => { px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, 'SKIRMISH', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] }); const w = 260, x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x - 6, 34, w + 12, Math.min(8, this.list.items.length) * 13 + 12, null); this.list.draw(g, x, 40, w);
      G.ui.wrapText(g, this.cfg.banners || this.cfg.sides.length > 2 ? 'Banners of the Wheel: a free-for-all on the Wheel Shrine. One troop each, six bells, the season turns every bell. Glory for damage, knockouts and holding the Shrine.' : 'Side 1 attacks, side 2 defends the Keep. Humans take turns on this device.', x, r.H - 46, w, '#c8c0d8', 9); });
    G.ui.prompts(r, [['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Title']]);
  }
};
// About & Credits: pages of 10-foot text
G.scenes.about = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) { this.d = d || {}; this.page = 0; this.bg = new E.Backdrop(SEASON_BG.winter); this.scroll = 0; },
  pages() { return G.ABOUT_PAGES(); },
  update(dt) { const I = G.game.input, P = this.pages(); if (I.pressed('right') || I.pressed('next') || I.pressed('confirm')) { this.page = (this.page + 1) % P.length; this.scroll = 0; G.sfx('ui_move'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + P.length - 1) % P.length; this.scroll = 0; G.sfx('ui_move'); } if (I.repeat('down', .2, .06)) this.scroll++; if (I.repeat('up', .2, .06)) this.scroll = Math.max(0, this.scroll - 1); const c = I.clicked(); if (c) { this.page = (this.page + (c[0] < G.game.W / 2 ? P.length - 1 : 1)) % P.length; this.scroll = 0; } if (I.pressed('cancel')) G.game.go(this.d.back && this.d.back !== 'about' ? this.d.back : 'title'); },
  draw(r) {
    this.bg.draw(r); const P = this.pages(), pg = P[this.page];
    r.overlay(g => { px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, pg.title, r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] });
      let y = 34 - this.scroll * 10; const w = Math.min(r.W - 30, 400), x = Math.round(r.W / 2 - w / 2);
      for (const [k, v] of pg.rows) { if (k) { G.ui.text(g, k, x, y, '#ffe8a8'); y += 10; } const lines = E.font.wrap(String(v), w - 10); for (const l of lines) { if (y > 26 && y < r.H - 24) G.ui.text(g, l, x + 8, y, '#e8e4f0'); y += 10; } y += 3; }
      G.ui.text(g, (this.page + 1) + ' / ' + P.length, 8, 8, '#a8a0c0'); });
    G.ui.prompts(r, [['left', 'Page'], ['down', 'Scroll'], ['cancel', 'Back']]);
  }
};
// How to Play: eight pages, each with a small live diorama
const HELP = [
  ['THE WHEEL AND THE SEASONS', 'Each turn is a season: Spring, Summer, Autumn, Winter. A season has three phases: the Tidings (news), the Muster (organize) and the March (attack). Each season favours its realm: its castles yield more mana and its units hit harder. Reach Meridian and defeat the Gray Knight before the Hour-Candle burns out.', ['gareth', 'morgause', 'pellam', 'mordrain']],
  ['MUSTER', 'Choose a castle of yours and press {confirm}: Organize troops, Summon monsters, Move knights to a neighbouring castle, send knights on Quests, Equip items and Promote. Press {command} for the Realm book, Save and End Muster (or hold {command}).', ['lynette']],
  ['SUMMON AND BOND', 'Castles yield mana each season. Summoning a monster costs mana, and each monster costs upkeep. A knight leads up to 6 monsters; their ranks may not exceed the knight\'s Bond. Winter costs more upkeep for non-Winter beasts.', ['wren']],
  ['QUESTS', 'A knight who is not a ruler may leave for a season or two to a quest site. They may return with treasure, a beast, a wandering knight, mana or training, or come back wounded. Some sites hold a story.', ['pelleas']],
  ['MARCH', 'In the March, choose an enemy or brigand castle beside one of yours, then up to 3 troops beside it. Battles are fought in order; you may Command a battle or Delegate it. A castle left without knights falls without a fight.', ['agravain']],
  ['BELLS AND THE KEEP', 'A battle lasts twelve bells. Each bell, troops act by their knight\'s agility: each unit moves and then acts once. The attacker wins by routing the defenders, or by ending the last bell with a knight on the Keep.', ['ragnell']],
  ['WARD, SIZE AND ELEMENTS', 'A monster outside its knight\'s Ward (the dashed ring) is weaker and easier to capture. Large monsters struggle to hit small ones. Spring opposes Autumn and Summer opposes Winter: ↑ strong, ↓ weak. Spells need planted feet.', ['nimue']],
  ['KNIGHTS, RETREAT AND CAPTURE', 'When a knight falls or retreats, its troop leaves the field. Monsters near your knights may be captured. Monsters that fall are gone for good; knights are only wounded. If a ruler falls, the whole side is routed.', ['bertilak']]];
G.scenes.help = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) { this.d = d || {}; this.page = 0; this.bg = new E.Backdrop(SEASON_BG.spring); this.stage = ledge('#7a9a4a', '#5a4a3a'); this.rigs = {}; },
  update(dt) { const I = G.game.input; if (I.pressed('right') || I.pressed('next') || I.pressed('confirm')) { this.page = (this.page + 1) % HELP.length; G.sfx('ui_move'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + HELP.length - 1) % HELP.length; G.sfx('ui_move'); } const c = I.clicked(); if (c) this.page = (this.page + (c[0] < G.game.W / 2 ? HELP.length - 1 : 1)) % HELP.length; if (I.pressed('cancel')) G.game.go(this.d.back && this.d.back !== 'help' ? this.d.back : 'title');
    const ids = HELP[this.page][2]; ids.forEach((id, i) => { const rg = this.rigs[id] || (this.rigs[id] = new E.Humanoid(Object.assign({}, G.get('knight', id).look))); rg.update(dt, { x: 400 + (i - (ids.length - 1) / 2) * 40, y: 0, z: 32, facing: Math.PI / 2, vx: 0, vy: 0, attack: null }); }); G.game.focus(400, 0, 32 + (G.game.H / 2 - 40) / -G.game.view.bz); },
  draw(r) {
    this.bg.draw(r); this.stage.draw(r); const [title, text, ids] = HELP[this.page];
    ids.forEach((id, i) => { const x = 400 + (i - (ids.length - 1) / 2) * 40; r.actor(x, 0, 32, (g, ox, oy) => this.rigs[id] && this.rigs[id].draw(g, ox, oy, r.view)); });
    r.overlay(g => { const w = Math.min(r.W - 20, 380), x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x, 8, w, 104, (this.page + 1) + '/8  ' + title); G.ui.wrapText(g, text.replace(/\{(\w+)\}/g, (m, a) => G.ui.keyLabel(a)), x + 8, 28, w - 16, '#e8e4f0', 10); });
    G.ui.prompts(r, [['left', 'Page'], ['cancel', 'Back']]);
  }
};
// endings: the ending scene (lines), epilogue cards, then the credits roll (or Retry / Title for a bad ending)
G.scenes.ending = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) {
    this.d = d = d || { kind: 'win', realm: 'verdance' }; this.t = 0; this.phase = 'scene';
    const sim = G.run && G.run.sim, realm = d.realm || (sim && sim.state.humans[0]) || 'verdance', human = (sim && sim.state.humans[0]) || realm;
    this.id = d.kind === 'win' ? 'ending_' + realm : d.kind === 'candle' ? 'ending_candle' : d.kind === 'wheel' ? 'ending_wheel_' + realm : 'ending_fallen';
    this.bad = d.kind !== 'win'; this.realm = realm;
    const ev = G.get('event', this.id); this.title = ev.title;
    const ks = sim ? sim.knightsOf(realm).map(k => k.id) : G.all('knight').filter(k => k.realm === realm).map(k => k.id);
    this.epi = this.bad ? [] : ks.filter(k => G.EPILOGUE[k]).slice(0, 8).map(k => [k, G.EPILOGUE[k]]);
    this.bg = new E.Backdrop(this.bad ? { sky: ['#101014', '#2a2a30', '#4a4a50'], layers: [{ kind: 'castle', color: '#1a1a20', y: .6, height: .4, parallax: 0 }] } : SEASON_BG.spring);
    this.started = !!d.after; this.list = new G.ui.List([{ label: 'Retry (latest save)', id: 'retry', disabled: !(G.game.saves && G.game.saves.any), why: 'No save' }, { label: 'Title', id: 'title' }]);
    G.music(this.bad ? 'hourless' : 'ending');
  },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (this.phase === 'scene' && !this.started) { this.started = true; G.game.go('event', { id: this.id, realm: this.realm, applied: true, onDone: () => G.game.go('ending', Object.assign({}, this.d, { after: true })) }); return; }
    if (this.d.after && this.phase === 'scene') this.phase = this.bad ? 'bad' : this.epi.length ? 'epi' : 'credits';
    if (this.phase === 'epi') { if ((I.pressed('confirm') || I.clicked() || (G.autoplay && this.t > .4)) && this.t > .4) { this.t = 0; this.epi.shift(); G.sfx('ui_confirm'); if (!this.epi.length) { this.phase = 'credits'; this.t = 0; } } return; }
    if (this.phase === 'credits') { if (this.t > 26 || I.pressed('confirm') && this.t > 2 || I.pressed('cancel') || (G.autoplay && this.t > 2)) G.game.go('title'); return; }
    if (this.phase === 'bad') { const r = this.list.update(dt); if (r === 'pick') { if (this.list.cur.id === 'retry') { const l = G.game.saves.latest(); if (l) G.game.saves.load(l.slot); } else G.game.go('title'); } if (G.autoplay && this.t > 1) G.game.go('title'); }
  },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => {
      if (this.bad) { px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#808080')); }
      if (this.phase === 'epi' && this.epi.length) { const [k, text] = this.epi[0], v = G.art.visual({ kind: 'knight', id: k }), w = 300, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - 40); G.ui.panel(g, x, y, w, 70, G.get('knight', k).name); try { v.rig.drawPortrait(g, x + 8, y + 20, 40); } catch (e) { /* no portrait */ } G.ui.wrapText(g, text, x + 56, y + 22, w - 64, '#ffffff', 10); }
      if (this.phase === 'credits') { const lines = G.CREDITS(), y0 = r.H - this.t * 18; E.font.title(g, this.title.toUpperCase(), r.W / 2, y0 - 40, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] }); lines.forEach((l, i) => G.ui.text(g, l, r.W / 2, y0 + i * 12, i % 3 === 0 ? '#ffe8a8' : '#e8e4f0', { align: 'center' })); }
      if (this.phase === 'bad') { E.font.title(g, this.title, r.W / 2, r.H / 2 - 50, { align: 'center', scale: 2, colors: ['#e0e0e0', '#a0a0a8', '#606068'] }); const w = 180, x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x - 6, r.H / 2 - 6, w + 12, 40, null); this.list.draw(g, x, r.H / 2, w); }
    });
    if (this.phase !== 'scene') G.ui.prompts(r, [['confirm', 'Next']]);
  }
};
