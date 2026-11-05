/* any input at all: the attract mode counts it as activity */
function acted(I) { return !!(I.anyPressed && I.anyPressed()) || (I.mouse && I.mouse.active && I.mouse.t > I.clock - .2); }
/* 50-title: the title screen (a sunset beach with the six fighters idling on the sand) and the main menu. */
G.titleRigs = null;
/* the title's fighters idle on their own clips, each a little different */
G.TITLE_CLIPS = ['Dance_Loop', 'Idle_Talking_Loop', 'Victory', 'Wave_Hello', 'Head Nod', 'Stretch_Yawn'];
G.titleTick = function (dt) {
  G.titleT = (G.titleT || 0) + dt;
  G.ensureTitleRigs().forEach((f, i) => { G.mocapSet(f.rig, G.TITLE_CLIPS[i % G.TITLE_CLIPS.length], G.titleT + f.phase); f.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); });
};
G.ensureTitleRigs = function () {
  if (G.titleRigs) return G.titleRigs;
  const list = G.FIGHTERS.map((id, i) => ({ id, rig: G.rigFor(id, { suit: G.CAST[id].signature, acc: G.CAST[id].starts.acc }), x: 0, y: 0, phase: i * .9 }));
  G.titleRigs = list;
  return list;
};
G.titleScene = {
  enter() {
    const game = G.game;
    G.ensureTitleRigs();
    this.bg = new E.Backdrop('dusk');
    this.t = 0; this.idle = 0; this.sentAttract = false;
    game.audio.music && game.audio.music('title');
    game.follow(null); game.cam.bounds = null;
    game.setView(E.VIEWS.threequarter);
    game.focus && game.focus(0, 0, 0);
    this.blink = 0;
  },
  update(dt) {
    const I = G.game.input;
    this.t += dt;
    G.titleTick(dt);
    if (acted(I)) this.idle = 0; else this.idle += dt;
    if (I.pressed('confirm') || I.pressed('start')) { G.game.go('menu', {}); }
    if (I.pressed('cancel')) { /* nothing to cancel on the title */ }
    if (this.idle > 10 && !this.sentAttract) { this.sentAttract = true; G.game.go('attract', {}); }
  },
  draw(r) {
    this.bg.draw(r);
    const W = r.W, H = r.H;
    G.noteDevice();
    if (G.touchOnly()) { G.touchGate(r); return; }
    // the logo and the strap, from the top
    r.overlay(g => {
      E.font.title(g, 'AHEAD OR ALIVE', W / 2, H * .10, { scale: 4, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'] });
      E.font.text(g, 'XTREME BEACH VOLLEYBALL', W / 2, H * .10 + 46, '#ffffff', { scale: 2, align: 'center', shadow: '#0a6a7a' });
    });
    // the fighters in a row on the sand
    const list = G.ensureTitleRigs();
    list.forEach((f, i) => {
      const x = (i - 2.5) * 40, y = 46;
      const sx = W / 2 + x * 1.0;
      r.actor(x, y, 0, (g, ox, oy) => { f.rig.draw(g, ox, oy, r.view); G.dress(g, r, f.rig, ox, oy); }, { pick: f });
    });
    if (Math.floor(this.t * 2) % 2 === 0) G.promptBar(r, [['confirm', 'Press to start']]);
    else G.promptBar(r, [['confirm', 'Press to start']]);
    r.overlay(g => E.font.text(g, E.versionLabel ? E.versionLabel() : 'v0.85', W - 6, H - 30, "#9fd3d6", { align: "right", scale: 1, shadow: "#000" }));
  }
};
/* the main menu: a list at the left; the fighter preview at the right */
G.menuScene = {
  enter() {
    const game = G.game;
    game.audio.music && game.audio.music('title');
    const has = !!G.latestSave();
    const items = [
      { label: 'New Vacation', onPick: () => G.game.go('invitation', {}) },
      { label: 'Continue', disabled: !has, onPick: () => G.continueGame() },
      { label: 'Load', disabled: !has, onPick: () => G.game.saves && G.game.saves.show('load') },
      { label: 'Beach Match', onPick: () => G.game.go('exhibition', {}) },
      { label: 'Album', onPick: () => G.game.go('album', { from: 'menu' }) },
      { label: 'How to Play', onPick: () => G.game.go('howto', { page: 0 }) },
      { label: 'Settings', onPick: () => G.game.menu && G.game.menu('settings') },
      { label: 'About & Credits', onPick: () => G.game.go('about', { page: 0 }) }
    ];
    this.list = new G.List({ items, x: 24, y: 56, w: 200, rowH: 22, max: 6, scale: 2 });
    this.idle = 0; this.sentAttract = false;
    this.list.i = 0;
    this.preview = G.ensureTitleRigs();
    this.t = 0;
    game.setView(E.VIEWS.threequarter);
    this.bg = new E.Backdrop('dusk');
  },
  update(dt) {
    const I = G.game.input;
    this.t += dt;
    if (I.pressed('cancel')) { G.game.go('title', {}); return; }
    this.list.update(I, dt);
    this.idle = acted(I) ? 0 : (this.idle || 0) + dt;
    if (this.idle > 10 && !this.sentAttract) { this.sentAttract = true; G.game.go('attract', {}); }
  },
  draw(r) {
    this.bg.draw(r);
    this.list.draw(r);
    const i = this.list.i, f = this.preview[i % this.preview.length];
    r.actor(r.W * .8, r.H * .62, 0, (g, ox, oy) => { f.rig.draw(g, ox, oy, r.view); G.dress(g, r, f.rig, ox, oy); }, { pick: f });
    r.overlay(g => {
      E.font.text(g, 'MAIN MENU', 24, 30, '#ffd36a', { scale: 2, shadow: '#000' });
      const it = this.list.items[this.list.i];
      if (it && it.sub) E.font.text(g, it.sub, 24, r.H - 40, '#9fd3d6', { shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Select'], ['cancel', 'Back']]);
  }
};
/* the touch-only gate: a device with a touch screen and no key or pad yet gets this panel instead of touch controls */
G.touchGate = function (r) {
  const W = r.W, H = r.H, I = G.game.input, bw = Math.min(W - 60, 300), x = Math.round(W / 2 - bw / 2), y = Math.round(H / 2 - 50);
  r.overlay(g => {
    E.ui.box(g, x, y, bw, 100, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
    E.font.text(g, 'Controller or keyboard required', W / 2, y + 10, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
    E.font.text(g, 'Connect a controller or keyboard to play. The demo keeps running.', W / 2, y + 40, '#fff8e8', { align: 'center', shadow: '#000' });
    E.ui.box(g, W / 2 - 50, y + 70, 100, 18, { bg: ['#ffe9a6', '#f0b04a'], border: '#fff8e8', alpha: 1 });
    E.font.text(g, 'Settings', W / 2, y + 74, '#1a1a24', { align: 'center', shadow: null });
  });
  const hit = I.clicked && I.clicked();
  if (hit && hit[0] >= W / 2 - 50 && hit[0] <= W / 2 + 50 && hit[1] >= y + 70 && hit[1] <= y + 88) G.game.menu && G.game.menu('settings');
  return true;
};
G.latestSave = function () { return G.game && G.game.saves ? G.game.saves.latest() : null; };
G.continueGame = function () { const s = G.latestSave(); if (s) G.game.saves.load(s.slot); };
