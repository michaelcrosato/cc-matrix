// member cards, avatar builder, arrival
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const portrait = (g, look, x, y, size, name) => {
  const old = G.S.look, oldN = G.S.name; G.S.look = look; G.S.name = name; const f = G.playerFigure(); G.S.look = old; G.S.name = oldN; f.update(.016); f.rig.drawPortrait(g, x, y, size, { zoom: 2.4, turn: .4, bg: '#eaf6f8', frame: false });
};
G.scenes.member = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) { this.mode = (d && d.mode) || 'new'; this.t = 0; this.stage = 'slots'; this.i = 0; this.rects = []; this.confirm = null; G.idle = 0; this.cfg = { hair: 0, skin: 0, top: 0, bottom: 0, nick: 0 }; this.slot = 0; this.last = null; },
  meta(i) { return G.slotMeta(i); },
  update(dt) {
    const input = G.game.input; this.t += dt; G.tick(dt);
    if (this.stage === 'slots') {
      if (input.repeat('left')) { this.i = (this.i + 2) % 3; G.snd('tick'); } else if (input.repeat('right')) { this.i = (this.i + 1) % 3; G.snd('tick'); }
      const p = input.pointer && input.pointer(); if (p && (!this.lp || p[0] !== this.lp[0] || p[1] !== this.lp[1])) { this.lp = p; const h = this.rects.findIndex(q => p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]); if (h >= 0 && h !== this.i) { this.i = h; G.snd('tick'); } }
      let pick = input.pressed('confirm'); const c = input.clicked && input.clicked(); if (c) { const h = this.rects.findIndex(q => c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]); if (h >= 0) { this.i = h; pick = true; } }
      if (input.pressed('cancel')) { G.snd('back'); G.game.go('title'); return; }
      if (pick) { const m = this.meta(this.i); G.snd('ok');
        if (this.mode === 'load') { if (m) { G.loadSlot(this.i); G.continueTo(); } }
        else { this.slot = this.i; if (m) { this.stage = 'confirm'; this.pills = new G.Pills([{ label: 'Replace this member' }, { label: 'Cancel' }], { w: 130, y: 150, h: 16 }); } else this.startBuilder(); } }
    } else if (this.stage === 'confirm') {
      const r = this.pills.update(dt, input); if (r && r.pick === 0) this.startBuilder(); else if (r && (r.pick === 1 || r.cancel)) this.stage = 'slots';
    } else if (this.stage === 'build') {
      this.fig.tgt = 1.2 + Math.sin(this.t) * .3; this.fig.update(dt); const r = this.pills.update(dt, input), it = this.pills.items;
      for (const k of ['hair', 'skin', 'top', 'bottom']) this.cfg[k] = it.find(x => x.key === k).idx; this.cfg.nick = it.find(x => x.key === 'nick').idx; this.look();
      if (r && r.pick != null) { const lab = it[r.pick].label; if (lab === 'Reroll') { it.find(x => x.key === 'nick').idx = (Math.random() * G.NAMES.length) | 0; G.snd('pop'); } else if (lab === 'Begin') this.begin(); }
      if (r && r.cancel) this.stage = 'slots';
    }
  },
  startBuilder() { this.stage = 'build'; const L = G.LOOKS, mk = (key, label, n, idx) => ({ key, label, choices: Array.from({ length: n }, (_, i) => key === 'hair' ? L.hair[i] : String(i + 1)), idx: idx || 0, noClickPick: false });
    this.pills = new G.Pills([mk('hair', 'Hair', 5), mk('skin', 'Skin', 6), mk('top', 'Top', 8), mk('bottom', 'Bottom', 4), { key: 'nick', label: 'Name', choices: G.NAMES, idx: (Math.random() * G.NAMES.length) | 0 }, { label: 'Reroll' }, { label: 'Begin' }], { w: 160, y: 40, h: 15, gap: 3 }); this.pills.first(); this.fig = null; this.look(); },
  look() { const L = this.cfg, old = G.S.look, on = G.S.name; G.S.look = { hair: L.hair, skin: L.skin, top: L.top, bottom: L.bottom }; const f = G.playerFigure(); G.S.look = old; f.x = 120; f.y = 10; f.rig.o.size = 2.4; f.tgt = this.fig ? this.fig.tgt : 1.3; if (this.fig) { f.t = this.fig.t; } this.fig = f; f.set('Idle_Subtle'); },
  begin() { const S = G.fresh(this.slot); S.look = { hair: this.cfg.hair, skin: this.cfg.skin, top: this.cfg.top, bottom: this.cfg.bottom }; S.name = G.NAMES[this.cfg.nick]; S.started = true; G.S = S; G.noSave = false; G.devReset(); G.saveNow(); G.game.go('arrival'); },
  draw(r) {
    G.game.focus(0, 0, 18); G.rooms.reception(r, this.t); const W = r.W, H = r.H; this.rects = [];
    r.overlay(g => G.txt(g, this.stage === 'build' ? 'Your Member Card' : this.mode === 'load' ? 'Whose card?' : 'Which card?', W / 2, 12, C.ACC2, { align: 'center', scale: 3 }));
    if (this.stage === 'slots' || this.stage === 'confirm') {
      r.overlay(g => { for (let i = 0; i < 3; i++) { const m = this.meta(i), w = 118, h = 100, x = W / 2 - 180 + i * 122, y = 46, foc = this.i === i; this.rects[i] = [x, y, w, h];
        const gr = foc ? 3 : 0; G.rr(g, x - gr, y - gr + 1, w + gr * 2, h + gr * 2, 'rgba(32,64,76,.25)'); G.rr(g, x - gr, y - gr, w + gr * 2, h + gr * 2, foc ? C.ACC : '#c8dde2'); G.rr(g, x - gr + 2, y - gr + 2, w + gr * 2 - 4, h + gr * 2 - 4, C.WHITE);
        if (m) { portrait(g, m.look, x + w / 2 - 28, y + 6, 56, m.name); G.txt(g, m.name, x + w / 2, y + 66, C.INK, { align: 'center' }); G.txt(g, 'Spine Age ' + m.age, x + w / 2, y + 78, C.ACC2, { align: 'center' }); G.txt(g, 'Day ' + Math.min(5, m.day) + (m.free ? ' · Free Play' : ''), x + w / 2, y + 88, C.MUTED, { align: 'center' }); }
        else { G.txt(g, 'Empty', x + w / 2, y + 40, C.MUTED, { align: 'center', scale: 2 }); G.txt(g, this.mode === 'load' ? 'Nothing here yet' : 'A new member', x + w / 2, y + 62, C.MUTED, { align: 'center' }); } } });
      if (this.stage === 'confirm') this.pills.draw(r);
      G.prompt(r, [['confirm', 'Pick'], ['cancel', 'Back']]);
    } else if (this.stage === 'build') {
      this.fig.draw(r); this.pills.draw(r); const m = r.w(120, 14, 0); r.overlay(g => G.mat(g, m[0], m[1], 70, 20, '#bfeee0')); G.prompt(r, [['confirm', 'Change'], ['cancel', 'Back']]);
    }
  }
};
// arrival: the card, the choice of instructor
G.scenes.arrival = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter() { this.t = 0; this.stage = 'talk'; G.song('studio'); this.tare = G.tare = new G.Tare(); this.tare.face = 'happy'; this.pills = null; this.instA = G.castFigure('birch', { size: 1.9, x: -46, y: 10, tgt: 1.5 }); this.instB = G.castFigure('alder', { size: 1.9, x: 46, y: 10, tgt: 1.6 }); this.instA.set('Greeting'); this.instB.set('Idle_Subtle'); this.fig = G.playerFigure({ x: 0, y: 24, tgt: 1.5 }); this.fig.rig.o.size = 1.8; this.fig.set('Idle_Subtle');
    G.say(G.LINES.arrival.slice(0, 3), { name: 'Tare', onDone: () => { this.stage = 'pick'; this.pills = new G.Pills([{ label: 'Birch', sub: 'Oak. Tall. Patient. Slightly warped.' }, { label: 'Alder', sub: 'Maple. Warm. Was a lot of small decisions.' }], { w: 120, y: 150, h: 16, cancel: false, dir: 'h' }); this.pills.o.x = 'center'; } }); G.talk.name = 'Tare'; },
  update(dt) {
    this.t += dt; this.tare.update(dt); this.tare.talk = G.talk.open ? .2 : 0; [this.instA, this.instB, this.fig].forEach(f => f.update(dt));
    if (G.talk.update(dt)) return; G.tick(dt);
    if (this.stage === 'pick') { const r = this.pills.update(dt, G.game.input); if (this.pills.i === 0) { this.instA.set('Greeting'); this.instB.set('Idle_Subtle'); } else { this.instB.set('Greeting'); this.instA.set('Idle_Subtle'); }
      if (r && r.pick != null) { G.S.inst = r.pick === 0 ? 'birch' : 'alder'; G.S.arrived = true; G.S.day = 1; G.saveNow(); this.stage = 'greet'; G.say([G.LINES[G.S.inst].hello[0], 'Tare will weigh you now. Please step on Tare. Tare is expecting you.'], { name: G.CAST[G.S.inst].name, onDone: () => G.game.go('bungalow') }); } }
  },
  draw(r) { G.game.focus(0, 0, 18); G.rooms.reception(r, this.t); this.instA.draw(r); this.instB.draw(r); this.fig.draw(r); const p = r.w(0, 40, 0); r.overlay(g => { this.tare.draw(g, p[0], p[1], 1.2, this.tare.face); G.txt(g, 'Choose who stands beside you', r.W / 2, 12, C.ACC2, { align: 'center', scale: 2 }); }); if (this.pills) this.pills.draw(r); G.talk.draw(r); G.drawCaption(r); }
};
})();
