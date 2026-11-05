// Scenes: title (with attract after 10 s idle), play, attract. Room 7 is a mode of play.
const SC = S7.scenes = {};
const sim5 = S7.sim, st5 = S7.st;
let game5 = null;
S7.touchOnly = () => { try { const mm = q => window.matchMedia && window.matchMedia(q).matches; const pads = (navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []); return mm('(hover: none) and (pointer: coarse)') && !pads.length && !('onkeydown' in window && mm('(hover: hover)')); } catch (e) { return false; } };
S7.quitToTitle = function () { if (S7.hub.active) return; UI.stack.length = 0; game5.go('title'); };
S7.newGame = function () {
  S7.newState({ difficulty: (game5.settings.difficulty || 'Normal').toLowerCase() }); UI.stack.length = 0;
  sim5.loadArea('room7', 'c'); sim5.enterRoom7(); st5.fadeIn = .6; game5.go('play');
};
S7.startEchoRun = function () {
  const old = S7.hub.loadEcho(); sim5.startEcho({ ghost: old ? old.rec : null, countdown: 3 }); UI.stack.length = 0; game5.go('play');
};
S7.continueGame = function () {
  const s = game5.saves.latest(); if (!s) return false; return game5.saves.load(s.slot);
};

// ---- the shared per-step sim drive
function drive(dt, I) {
  sim5.update(dt, I);
  if (st5.area !== S7.pres.areaId && st5.mode !== 'transition') S7.pres.load(st5.area);
  S7.pres.step(dt);
  if (st5.echo) S7.hub.tick(dt);
  if (st5.fadeIn > 0) st5.fadeIn = Math.max(0, st5.fadeIn - dt);
}
let prevPtr = null;
function clicks(game, I) {
  const cur = game.input.pointer(), moved = !!(cur && prevPtr && (cur[0] !== prevPtr[0] || cur[1] !== prevPtr[1])); prevPtr = cur ? cur.slice() : null;
  const hp = game.input.lastDevice !== 'gamepad' && moved && cur;
  if (hp) for (const z of UI.zones) if (z.kind === 'branch' && hp[0] >= z.r[0] && hp[0] < z.r[0] + z.r[2] && hp[1] >= z.r[1] && hp[1] < z.r[1] + z.r[3]) I.hover = z.i;
  const c = game.input.clicked && game.input.clicked(); if (!c) return;
  for (const z of UI.zones) if (c[0] >= z.r[0] && c[0] < z.r[0] + z.r[2] && c[1] >= z.r[1] && c[1] < z.r[1] + z.r[3]) {
    if (z.kind === 'branch') I.branch = z.i; else if (z.kind === 'spot') I.clickSpot = z.id; else if (z.kind === 'slot') { S7.sim.switchTo(S7.ROSTER[z.i]); } else if (z.kind === 'talk') I.confirm = true; break;
  }
}

// ---------------------------------------------------------------- title
SC.title = {
  enter() {
    if (S7.hub.active) return;   // in an AI Hub round there is no title: the hub starts and ends rounds
    this.idle = 0; this.t = 0; this.touch = S7.touchOnly();
    S7.newState({ difficulty: 'normal' }); sim5.loadArea('room7', 'c'); st5.cheats.god = true; S7.pres.load('room7'); S7.audio.music('title'); S7.audio.ambience('hum');
    const g = game5, items = [];
    const last = g.saves.latest ? g.saves.latest() : null;
    if (!this.touch) {
      if (last) items.push({ label: 'CONTINUE', onPick: () => { if (!S7.continueGame()) S7.audio.sfx('deny'); } });
      items.push({ label: 'NEW GAME', onPick: () => S7.newGame() }, { label: 'ECHO RUN', onPick: () => S7.startEchoRun() });
    }
    items.push({ label: 'SETTINGS', onPick: () => g.menu('settings') });
    if (!this.touch) items.push({ label: 'CONTROLS', onPick: () => g.menu('controls') });
    items.push({ label: 'ABOUT', onPick: () => UI.push(new S7.screens.About(false)) });
    this.list = new UI.FocusList(items, { x: 20, y: 120, w: 110, rowH: 14 });
  },
  update(dt) {
    if (S7.hub.active) { game5.go('play'); return; }
    const g = game5, n = UI.updateTop(dt, g) ? null : UI.readNav(g);
    this.t += dt; const any = g.input.anyPressed() || (g.input.pointer() && (this._p ? (g.input.pointer()[0] !== this._p[0] || g.input.pointer()[1] !== this._p[1]) : false)); this._p = g.input.pointer() ? g.input.pointer().slice() : null;
    if (any || UI.top()) this.idle = 0; else this.idle += dt;
    if (n) { this.list.o.y = g.H - 14 * this.list.items.length - 24; this.list.update(n); }
    if (this.idle >= 10 && !UI.top() && !g.paused) { game5.go('attract'); return; }
    st5.mode = 'rail'; sim5.update(dt, S7.noIntent()); S7.pres.step(dt);
  },
  draw(r) {
    if (S7.hub.active) return;
    S7.pres.draw(r); const W = r.W, H = r.H;
    r.overlay(g => {
      g.fillStyle = '#000'; g.globalAlpha = .45; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      S7.E.font.title(g, 'SKILLER7', 18, 24, { scale: 4, colors: ['#ffffff', '#d81e2a'], outline: '#000', depth: 3, depthColor: '#4a0810' });
      UI.text(g, 'SEVEN KILLERS, ONE MOUNTAIN', 20, 62, '#e8e4f0'); UI.text(g, 'A GAME INSPIRED BY KILLER7', 20, 72, col.dim);
      if (this.touch) { UI.panel(g, W / 2 - 150, H / 2 - 30, 300, 36, { fill: '#000', alpha: .8, border: col.red }); UI.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, H / 2 - 20, '#fff', { align: 'center' }); UI.text(g, 'Open settings below. The demo plays by itself.', W / 2, H / 2 - 8, col.dim, { align: 'center' }); }
      this.list.draw(g);
      UI.text(g, 'v' + S7.VERSION, W - 8 - UI.w('v' + S7.VERSION), H - 10, col.dim);
      if (!this.touch) UI.promptRow(g, [['confirm', 'SELECT']], W - 8, H - 24, 'right');
      if (this.idle > 6 && this.idle < 10) UI.text(g, 'DEMO IN ' + Math.ceil(10 - this.idle), W - 10 - UI.w('DEMO IN 0'), 8, col.dim);
    });
    UI.drawStack(r);
  }
};

// ---------------------------------------------------------------- play
SC.play = {
  pausable: true,
  enter() {
    game5.lights && (game5.lights.enabled = false);
    S7.pres.load(st5.area); S7.attract = false;
    if (st5.area === 'room7' && !st5.flags.intro_done && !st5.echo) sim5.playBeat('intro');
    S7.audio.music(S7.graph().A.music); S7.audio.ambience(S7.graph().A.ambience === 'wind' ? 'wind' : S7.graph().A.ambience === 'shaft' ? 'shaft' : 'hum');
    if (st5.echo) S7.audio.music('blackrun');
    this.ptr = null;
  },
  update(dt) {
    const g = game5;
    if (UI.updateTop(dt, g)) { S7.pres.step(0); return; }
    const mouse = st5.mode === 'aim' ? S7.pres.takeMouse() : (S7.pres.takeMouse(), [0, 0]);
    const locked = S7.pres.world && S7.pres.world.camera.locked, ptr = g.input.pointer();
    let look = mouse;
    if (st5.mode === 'aim' && !locked && g.settings.aimAssist !== false && g.input.lastDevice === 'mouse' && ptr) look = [(ptr[0] - g.W / 2) / (g.W / 2) * 5, (ptr[1] - g.H / 2) / (g.H / 2) * 5];
    const I = S7.intents(g, { mouse: look, pointer: ptr, W: g.W, H: g.H });
    clicks(g, I);
    if (S7.hub.ended) return;
    drive(dt, I);
  },
  draw(r) { S7.pres.draw(r); UI.hud(r, game5); S7.dev.draw(r); UI.drawStack(r); }
};

// ---------------------------------------------------------------- attract: the bot plays the real game; any input leaves
SC.attract = {
  enter() { this.t = 0; S7.attract = true; UI.stack.length = 0; S7.bot.setup(S7.bot.idx || 0); S7.pres.load(st5.area); S7.audio.music(S7.graph().A.music); this.p0 = game5.input.pointer() ? game5.input.pointer().slice() : null; this.grace = .6; },
  update(dt) {
    const g = game5; this.t += dt; this.grace -= dt;
    const p = g.input.pointer(), moved = p && this.p0 && Math.hypot(p[0] - this.p0[0], p[1] - this.p0[1]) > 6;
    if (this.grace < 0 && (g.input.anyPressed() || moved)) { S7.attract = false; g.go('title'); return; }
    const I = S7.bot.intents(dt); drive(dt, I);
    if (S7.bot.step(dt)) S7.pres.load(st5.area);
    S7.audio.ambience(S7.graph().A.ambience === 'wind' ? 'wind' : 'hum');
  },
  draw(r) { S7.pres.draw(r); UI.hud(r, game5); const W = r.W, H = r.H; r.overlay(g => { if (Math.floor(this.t * 1.5) % 2 === 0) UI.text(g, 'DEMO PLAY - PRESS ANY BUTTON', W / 2, H - 28, '#fff', { align: 'center', scale: 1 }); }); }
};
S7.bindScenes = g => { game5 = g; };

// ---------------------------------------------------------------- events that open screens
S7.bus.on('open', d => { if (S7.attract) return; const sc = S7.screens; if (d.screen === 'wardrobe') UI.push(new sc.Wardrobe()); else if (d.screen === 'bench') UI.push(new sc.Bench()); else if (d.screen === 'map') UI.push(new sc.Notes(0)); else if (d.screen === 'save') { sim5.saveHere(); game5.saves.show('save'); } });
S7.bus.on('result', d => { if (!S7.attract) UI.push(new S7.screens.Results({ target: d.target, stats: d.stats, rank: d.rank })); });
S7.bus.on('gameover', () => { if (!S7.attract) UI.push(new S7.screens.GameOver()); });
S7.bus.on('credits', () => { if (S7.attract) return; UI.push(new S7.screens.About(true)); S7.audio.music('credits'); });
S7.bus.on('arrived', d => {
  if (S7.attract) return; const st = S7.st;
  try { if (game5 && game5.saves && !st.echo) game5.saves.autosave(); } catch (e) { /* storage blocked */ }
  if (d.area === 'room7' && st.bosses.king && !st.flags.epilogue_done) { st.flags.epilogue_done = true; sim5.playBeat('epilogue'); }
  st.fadeIn = .5;
});
S7.bus.on('area', d => { if (!S7.attract && S7.st.area === '00A' && !S7.st.flags.t00_card) { S7.st.flags.t00_card = true; } });
