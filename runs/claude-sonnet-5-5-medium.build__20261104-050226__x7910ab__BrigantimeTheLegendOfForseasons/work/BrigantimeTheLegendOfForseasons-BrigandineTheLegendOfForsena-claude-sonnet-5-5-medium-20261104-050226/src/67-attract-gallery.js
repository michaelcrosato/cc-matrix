/* ---- Attract mode (a looping AI-played reel) and the gallery ---- */
G.AttractScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.seed = 11; }
  enter() {
    this.t = 0; this.beat = 'map'; this.bt = 0; this.seed++; G.clearRigs(); G.fxs = []; this.cs = new G.CampaignScene(); this.mapRounds = 0; this.startMap(); this.startReal = performance.now() / 1000;
  }
  exit() { G.run = null; }
  startMap() {
    this.beat = 'map'; this.bt = 0; this.step = 0; const S = C.create({ human: this.seed % 4, seed: this.seed * 77 }); S.turn = 0; C.startTidings(S);
    G.run = { S, stage: 'resolve', cursor: 0 }; this.S = S; this.cs.stack = []; this.cs.t = 0; this.cs.marching = false; this.cs.cursor = 0;
  }
  nextSeasonStep() {
    const S = this.S; this.step++;
    if (this.step === 1) { for (const r of S.realms) if (r.alive && r.id !== 5) { C.aiMuster(S, r.id); } G.music(['spring', 'summer', 'autumn', 'winter'][S.season]); }
    if (this.step === 2) { for (const r of S.realms) if (r.alive && r.id !== 5) C.aiMarch(S, r.id); S.queue = S.marches.map(m => ({ realm: m.realm, to: m.to, from: m.from.slice() })); G.sfx('quest'); }
    if (this.step === 3) { C.resolveAI(S, true); S.marches = []; G.sfx('fanfare', { vol: .3 }); }
    if (this.step === 4) { C.endSeason(S); S.stats; this.mapRounds++; this.step = 0; this.cs.cards = []; G.sfx('season'); }
  }
  startBattle() {
    this.beat = 'battle'; this.bt = 0; G.fxs = []; const seed = this.seed * 13 + 5; const spec = G.makeSkirmish(seed, { ai: true, realms: [seed % 4, (seed + 2) % 4], season: seed % 4 });
    this.bv = new G.BattleView(spec, { auto: true, noInput: true, cursor: false, overDelay: 1.5, onOver: () => { this.beat = 'sum'; this.bt = 0; G.music('victory'); } }); G.music('battle', { restart: true }); G.motesInit(30);
  }
  update(dt) {
    this.t += dt; this.bt += dt; UI.pump();
    if ((G.lastActivity || 0) > this.startReal + .03 || UI.moved || UI.click || G.game.input.anyPressed()) { G.run = null; G.game.go('title'); return; }
    if (this.beat === 'map') {
      this.cs.t += dt; G.fxUpdate(dt); 
      if (this.bt > 3.2 * (this.step + 1) && this.step < 4) { this.nextSeasonStep(); this.cs.cards = this.S.cards; }
      if (this.step >= 4 || this.bt > 3.2 * 5) { this.nextSeasonStep(); }
      if (this.mapRounds >= 2) { this.startBattle(); }
    } else if (this.beat === 'battle') {
      this.bv.update(dt); if (this.bt > 38) this.bv.o.quick = true;
    } else if (this.beat === 'sum') { G.fxUpdate(dt); if (this.bt > 3.5) { this.seed++; this.mapRounds = 0; this.startMap(); G.music('title'); } }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin();
      if (this.beat === 'map') {
        const cs = this.cs, S = this.S; cs.rect = { x: 14, y: 22, w: W - 28, h: H - 54 }; G.run.stage = 'resolve';
        G.drawWorldBackdrop(g, W, H, S.season, cs.t, true); cs.drawMap(g, W, H); G.drawMotes(g, W, H, S.season, cs.t, .6); cs.drawTop(g, W, H);
        const cap = [['The seasons turn.', 'Realms muster monsters and knights.', 'Armies declare their marches.', 'Castles change hands.'][Math.min(3, this.step)]]; G.box(g, W / 2 - 100, H - 46, 200, 14, { alpha: .9 }); G.T(g, cap[0], W / 2 - G.TW(cap[0]) / 2, H - 43, '#ffe8a0');
      } else if (this.beat === 'battle') { this.bv.draw(g, r, W, H); }
      else {
        this.bv.draw(g, r, W, H); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55); const s = this.bv.S, t = (s.winner === 0 ? s.sides[0].name : s.sides[1].name) + ' wins the field'; E.font.title(g, 'BATTLE OVER', W / 2, H / 2 - 24, { scale: 2, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'] }); G.T(g, t, W / 2 - G.TW(t) / 2, H / 2 + 2, '#f4eed8');
      }
      px.rect(g, 0, H - 15, W, 15, '#0a0614cc'); const pulse = Math.floor(UI.t * 2) % 2; G.T(g, pulse ? 'DEMO: press any button' : 'DEMO', W / 2 - G.TW('DEMO: press any button') / 2, H - 12, '#ffe8a0');
    });
  }
};
/* gallery: creatures, knights, sound */
G.GalleryScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.tab = 0; }
  enter() { this.t = 0; this.tab = 0; this.mk(); G.activity(); G.music(null); }
  mk() {
    if (this.tab === 0) this.list = new UI.List(G.all('monster').map(m => ({ label: m.names[0], id: m.id, tag: G.SEASONS[m.el] || 'Hour', tagCol: G.SEASON_COL[m.el] })), { rows: 10, tabs: true });
    else if (this.tab === 1) this.list = new UI.List(Object.values(G.KNIGHTS).map(k => ({ label: k.short, id: k.id, tag: G.REALMS[k.realm].short || G.REALMS[k.realm].name, tagCol: G.REALMS[k.realm].col })), { rows: 10, tabs: true });
    else this.list = new UI.List(Object.keys(G.SONGS).map(s => ({ label: 'Music: ' + s, id: 'm:' + s })).concat(Object.keys(G.SFX).map(s => ({ label: 'Sound: ' + s, id: 's:' + s }))), { rows: 10, tabs: true });
    this.list.id = 'gal';
  }
  update(dt) {
    this.t += dt; UI.pump(); const r = this.list.update();
    if (this.rig) this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
    if (r && r.cancel) { G.game.go('title'); }
    else if (r && (r.next || r.prev)) { this.tab = (this.tab + (r.next ? 1 : 2)) % 3; this.mk(); G.sfx('cursor'); }
    else if (r && r.pick != null && this.tab === 2) { const id = this.list.items[r.pick].id; if (id.startsWith('m:')) { G.musicNow = null; G.music(id.slice(2)); } else G.sfx(id.slice(2)); }
    if (this.tab === 1) { const it = this.list.cur(); if (it && this.rigId !== it.id) { const k = G.KNIGHTS[it.id]; this.rig = new E.Humanoid(G.knightLook(it.id, k.line, 1, k.realm, 1.6)); this.rigId = it.id; } }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); px.rect(g, 0, 0, W, H, '#161026'); G.drawWorldBackdrop(g, W, H, Math.floor(t / 4) % 4, t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
      ['Creatures', 'Knights', 'Sound'].forEach((n, i) => { const x = 10 + i * 70; px.rect(g, x, 4, 66, 12, i === this.tab ? '#6a5aa8' : '#2a2046'); G.T(g, n, x + 33 - G.TW(n) / 2, 7, i === this.tab ? '#fff8d8' : '#8a82a8'); });
      G.box(g, 10, 20, 120, 160); this.list.draw(g, 14, 26, 112);
      G.box(g, 136, 20, W - 146, 160); const it = this.list.cur();
      if (it && this.tab === 0) { const sp = G.get('monster', it.id); for (let f = 0; f < 3; f++) { G.drawMon(g, sp, f, 180 + f * 80, 90 + (sp.fly ? 10 : 0), { t, scale: 1.6 + f * .1, dir: 1 }); G.T(g, sp.names[f], 180 + f * 80 - G.TW(sp.names[f]) / 2, 104, '#ffe8a0'); } G.T(g, `${sp.kind} - ${sp.size} - ${G.SEASONS[sp.el] || 'Hour'}`, 146, 28, G.SEASON_COL[sp.el]); G.T(g, `HP ${sp.hp} ATK ${sp.atk} DEF ${sp.def} INT ${sp.int} MOV ${sp.mov}`, 146, 124, '#d8d0f0'); G.T(g, `Range ${sp.rangeSpec[0]}-${sp.rangeSpec[1]} - Bond ${sp.bond} - Summon ${sp.cost}`, 146, 136, '#d8d0f0'); }
      else if (it && this.tab === 1 && this.rig) { const k = G.KNIGHTS[it.id]; px.ell(g, 200, 120, 22, 7, '#00000066'); this.rig.draw(g, 200, 120, G.game.view); G.T(g, k.name, 146, 28, '#ffe8a0'); G.T(g, G.LINES[k.line].names.join(' > '), 146, 38, '#d8d0f0'); UI.text(g, k.blurb, 250, 56, W - 266, '#f4eed8', 10); }
      else if (this.tab === 2) { G.T(g, 'Confirm plays the song or sound.', 146, 28, '#d8d0f0'); UI.text(g, 'All music, effects and voices are written in code. Voices are Animalese babble, pitched per speaker.', 146, 46, W - 166, '#a8a0c8', 10); }
      UI.prompts(g, W, H, [['confirm', 'Play'], ['prev', 'Tab'], ['next', 'Tab'], ['cancel', 'Back']]);
    });
  }
};
