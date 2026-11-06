// title, free play menu, idle watch
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
G.idle = 0;
// ten seconds without input on a top-level menu starts the attract mode
G.idleCheck = (dt, input) => {
  input = input || G.game.input; const p = input.pointer && input.pointer(); const sig = (p ? p[0] + '/' + p[1] : '') + '|' + (input.anyPressed() ? 1 : 0) + '|' + (Math.hypot(input.value ? input.value('axL') + input.value('axR') + input.value('axU') + input.value('axD') : 0, 0) > .2 ? 1 : 0);
  if (sig !== G.idleSig || input.anyPressed() || input.clicked()) { G.idleSig = sig; G.idle = 0; } else G.idle += dt;
  return G.idle >= 10;
};
G.slotMeta = i => (E.store && E.store.get('ws:slot' + i, null)) || null;
G.loadSlot = i => { try { G.game.saves.load(i); } catch (e) {} G.S.slot = i; G.noSave = false; const d = G.S.last ? Math.floor((Date.now() - G.S.last) / 86400000) : 0; if (d >= 2) G.S.absence = d; G.S.last = Date.now(); };
G.continueTo = () => { const S = G.S; S.started = true; G.game.go(!S.arrived ? 'arrival' : S.day > 5 || S.free ? 'island' : !S.checked ? 'bungalow' : 'island'); };
const stage = (r, t) => { G.rooms.deck(r, t); };
class Mats { }
G.scenes.title = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) {
    G.game.lights.enabled = false; G.cap = null; G.idle = 0; this.t = 0; G.attractIdx = 0; this.tare = G.tare = new G.Tare(); this.tare.look = 0;
    G.song('studio'); this.sub = null; this.build(); this.tareT = 2; this.said = false; if (G.attractExit) { G.attractExit = false; G.caption("Oh! You're back. I wasn't doing anything.", 'Tare', 4); }
    this.fig = G.castFigure('birch', { size: 1.8, x: -112, y: 12, tgt: 1.3 }); this.fig.set('Greeting'); this.fig2 = G.castFigure('alder', { size: 1.8, x: 10, y: 12, tgt: 1.8 }); this.fig2.set('Idle_Subtle');
    this.back = d && d.back;
  },
  build() {
    const any = [0, 1, 2].some(i => G.slotMeta(i)), items = [{ label: 'Continue', disabled: !any }, { label: 'New Member' }, { label: 'Class' }, { label: 'Free Play', disabled: !(any && [0, 1, 2].some(i => (G.slotMeta(i) || {}).free)) && !G.devUnlocked }, { label: 'Settings' }, { label: 'About' }];
    this.pills = new G.Pills(items, { w: 120, h: 15, gap: 3, y: 100, x: 270, cancel: false }); this.pills.first(); this.pills.i = any ? 0 : 1;
  },
  update(dt) {
    const input = G.game.input; this.t += dt; this.tare.update(dt); this.fig.update(dt); this.fig2.update(dt); G.tick(dt);
    this.tareT -= dt; if (this.tareT <= 0) { this.tare.jump(80); G.snd('boop'); this.tareT = 2.4 + Math.random() * 1.5; this.tare.face = ['happy', 'neutral', 'smug'][(Math.random() * 3) | 0]; }
    if (this.tare.landed) { this.tare.landed = false; }
    if (G.idleCheck(dt)) { G.game.go('attract'); return; }
    const r = this.pills.update(dt, input); if (!r || r.pick == null) return;
    const lab = this.pills.items[r.pick].label;
    if (lab === 'Continue') G.game.go('member', { mode: 'load' }); else if (lab === 'New Member') G.game.go('member', { mode: 'new' }); else if (lab === 'Class') G.game.go('class');
    else if (lab === 'Free Play') G.game.go('freeplay'); else if (lab === 'Settings') G.game.menu('settings'); else if (lab === 'About') G.game.go('about');
  },
  draw(r) {
    G.game.focus(0, 0, 18); stage(r, this.t); const W = r.W;
    const m = r.w(-50, 14, 0); r.overlay(g => G.mat(g, m[0], m[1], 80, 24, '#bfeee0'));
    this.fig.draw(r); this.fig2.draw(r);
    const p = r.w(-50, 14, 0), tr = this.tare; r.overlay(g => { tr.draw(g, p[0], p[1] + 2, 1.6); });
    r.overlay(g => {
      E.font.title(g, 'WII STORK', W / 2, 12, { scale: 4, colors: ['#9ff3ff', '#2cc6e6'], outline: '#0e6d84', depth: 3, depthColor: '#0e7d96', align: 'center' });
      G.txt(g, 'Gently, Or Not At All.', W / 2, 52, C.INK, { align: 'center', scale: 1 });
      G.txt(g, 'The Institute for Gentle Improvement', W / 2, 62, C.MUTED, { align: 'center' });
    });
    this.pills.draw(r); G.prompt(r, [['confirm', 'Pick']]); G.drawCaption(r);
  }
};
// free play: discipline then activity
G.scenes.freeplay = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) { this.t = 0; this.disc = d && d.disc || null; this.rebuild(); G.idle = 0; },
  rebuild() {
    if (!this.disc) { this.pills = new G.Pills([...G.DISCIPLINES.map(d => ({ label: d })), { label: 'Back' }], { w: 120, h: 17, y: 100 }); }
    else { const acts = G.actList.filter(a => a.discipline === this.disc); this.pills = new G.Pills([...acts.map(a => ({ label: a.name, sub: 'Best ' + '★'.repeat(G.bestStars(a.id)) })), { label: 'Back' }], { w: 150, h: 17, y: 100 }); this.acts = acts; }
  },
  update(dt) { this.t += dt; G.tick(dt); if (G.idleCheck(dt)) { G.game.go('attract'); return; } const r = this.pills.update(dt, G.game.input); if (!r) return; if (r.cancel || (r.pick != null && this.pills.items[r.pick].label === 'Back')) { if (this.disc) { this.disc = null; this.rebuild(); } else G.game.go('title'); return; }
    if (r.pick != null) { if (!this.disc) { this.disc = G.DISCIPLINES[r.pick]; this.rebuild(); } else { const a = this.acts[r.pick]; G.lastActData = { mode: 'free', tier: 1, back: 'freeplay' }; G.game.go('act_' + a.id, Object.assign({}, G.lastActData)); } } },
  draw(r) { G.game.focus(0, 0, 18); stage(r, this.t); r.overlay(g => { G.txt(g, this.disc || 'Free Play', r.W / 2, 30, C.ACC2, { align: 'center', scale: 3 }); G.txt(g, this.disc ? 'Choose a mat.' : 'Everything is open. Nobody is watching.', r.W / 2, 66, C.INK, { align: 'center' }); }); this.pills.draw(r); G.prompt(r, [['confirm', 'Pick'], ['cancel', 'Back']]); }
};
})();
