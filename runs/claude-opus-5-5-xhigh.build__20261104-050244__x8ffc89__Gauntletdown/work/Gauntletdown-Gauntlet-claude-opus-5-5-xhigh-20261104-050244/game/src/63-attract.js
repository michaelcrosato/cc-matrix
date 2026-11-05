/* ---- THE ATTRACT MODE: after 10 s idle on any front-end screen. A loop: four bots (invulnerable, endless flasks, they
   jump ahead when stuck) on floors 2, 5 and 7 and at the banquet, the high scores, the prologue, the title; any input
   returns to the title (and is used up) ---- */
const ATTRACT = [
  { kind: 'floor', floor: 'f2', secs: 25, label: 'THE LARDER' },
  { kind: 'floor', floor: 'f5', secs: 20, label: 'THE OSSUARY' },
  { kind: 'floor', floor: 'f7', secs: 15, label: 'THE FURNACE GUT' },
  { kind: 'floor', floor: 'f9', secs: 20, label: 'THE BANQUET', boss: 2 },
  { kind: 'scores', secs: 6 }, { kind: 'prologue', secs: 8 }, { kind: 'title', secs: 4 }
];
scenes.attract = {
  view: 'threequarter', touch: [], camera: false, propSize: 1.3,
  enter(d = {}) {
    this.seg = d.seg || 0; this.t = 0; this.grace = .4; game.allowJoin(false); clearNarrator();
    A.setVolume((game.settings.volume || .7) * .6);
    this.start();
  },
  exit() { A.setVolume(game.settings.volume === undefined ? .7 : game.settings.volume); W = null; game.cam.frame && game.cam.frame(null); game.follow(null); },
  start() {
    const S2 = ATTRACT[this.seg]; this.t = 0;
    if (S2.kind !== 'floor') { W = null; L.enabled = false; game.weather = null; if (S2.kind === 'scores') music('namethyself'); if (S2.kind === 'title') music('throwdown'); if (S2.kind === 'prologue') { music('throwdown'); speak(STORY.prologue.slice(0, 90), 'gaunt'); } return; }
    startRun(CLASSES.map((c, i) => ({ seat: i, cls: c, bot: makeBot({ cheat: true }), name: 'P' + (i + 1) })), { mode: 'attract', seed: 7 + this.seg });
    const index = FLOOR_ORDER.indexOf(S2.floor);
    buildWorld(index, { role: 'attract', seed: 3 });
    for (const h of W.heroes) { h.flasks = 3; h.keys = 2; h.hp = startHealth(); }
    const at = W.F.demo && W.F.demo.at; if (at) W.heroes.forEach((h, i) => { h.x = mid(at[0]) + (i % 2) * 14; h.y = mid(at[1]) + Math.floor(i / 2) * 14; });
    if (S2.boss && W.boss) { W.boss.phase = 1; W.boss.hp = W.boss.max * .69; }
    L.enabled = true; game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null; camBounds();
    music(REALM_SONG[W.realm] || 'larder', { sync: true }); lighting();
    game.follow(null); game.cam.frame(W.heroes, { margin: 70, zoom: [.6, .75] });
  },
  update(dt) {
    this.grace -= dt; stepNarrator(dt);
    if (this.grace <= 0 && ui.anyInput()) { (game._players || [game.input]).forEach(I => I.consumeAll()); game.go('title', {}, { fade: .2 }); return; }
    this.t += dt;
    const S2 = ATTRACT[this.seg];
    if (S2.kind === 'floor' && W) {
      for (const h of W.heroes) botIntent(h, dt);
      stepWorld(dt);
      // the director: a quiet screen gets company; a finished floor moves on
      if ((this.dirT = (this.dirT || 0) - dt) <= 0) { this.dirT = 2.5; const near2 = W.monsters.filter(m => !m.dead && W.heroes.some(h => near(h, m, 9 * T))).length; if (near2 < 6) { const h = W.heroes[0], types = W.realm === 'furnace' ? ['imp', 'gnasher'] : W.realm === 'ossuary' ? ['fryar', 'ghost', 'lobber'] : ['gnasher', 'ghost']; for (let i = 0; i < 4; i++) { const a = i * 1.6 + this.t, p = freeNear(h.x + Math.cos(a) * 70, h.y + Math.sin(a) * 50); if (p) spawnMonster(E.pick(types), p[0], p[1], 2, { rise: .4 }); } } }
      if (W.done) W.done = null;
      game.cam.frame(W.heroes.filter(h => h.alive), { margin: 70, zoom: [.6, .75] });
    }
    if (this.t >= S2.secs) { this.seg = (this.seg + 1) % ATTRACT.length; this.start(); }
  },
  draw(r) {
    const S2 = ATTRACT[this.seg];
    if (S2.kind === 'floor' && W) { drawWorld(r); drawHud(r); }
    r.overlay(g => {
      if (S2.kind === 'scores') { drawShaft(g, r, game.real * .3, { gauntlet: false, speed: 15 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018')); drawTable(g, r, 14); }
      if (S2.kind === 'prologue') { drawShaft(g, r, game.real, {}); px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#100810')); const lines = E.font.wrap(STORY.prologue, Math.min(r.W - 40, 360)), n = Math.floor(this.t * 40); let c = 0; lines.forEach((l, i) => { tx(g, l.slice(0, Math.max(0, n - c)), r.W / 2, 30 + i * 12, '#ffe8b0', { align: 'center' }); c += l.length; }); }
      if (S2.kind === 'title') { drawShaft(g, r, game.real); logo(g, r, 40, r.W > 380 ? 4 : 3); tx(g, 'FOUR FOOLS. ONE HUNGRY DUNGEON.', r.W / 2, 84, '#e8c890', { align: 'center' }); }
      if (S2.kind === 'floor') tx(g, S2.label, r.W / 2, 92, '#e8c890', { align: 'center' });
      const top = S2.kind === 'floor' ? 52 : r.H - 40;
      if (Math.floor(game.real * 2) % 2 === 0) tx(g, 'DEMO', r.W / 2, top, '#ffd060', { align: 'center', scale: 2 });
      tx(g, 'PRESS ANY BUTTON', r.W / 2, top + 20, Math.floor(game.real * 3) % 2 ? '#ffffff' : '#ffe8b0', { align: 'center' });
    });
  }
};
