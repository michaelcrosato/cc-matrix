// ===== 12_main: boot, main loop, attract mode (AI-played kiosk demo), idle detection =====
const Attract = {
  active: false, idx: 0, t: 0, dur: 50,
  // Looping playlist: [stage, start distance, seconds]. The AI cheats freely (invulnerable, infinite bombs).
  list: [
    { lvl: 0, start: 0, dur: 52 }, { lvl: 0, start: 3000, dur: 40 }, { lvl: 0, start: 6200, dur: 90 },
    { lvl: 1, start: 0, dur: 52 }, { lvl: 1, start: 1450, dur: 40 }, { lvl: 1, start: 5800, dur: 100 },
  ],
  start() {
    if (this.active) return;
    this.active = true; this.idx = 0; UI.close(); this.run();
  },
  run() {
    const e = this.list[this.idx % this.list.length];
    this.t = 0; this.dur = e.dur;
    Game.startLevel(e.lvl, { startAt: e.start, attract: true, noIntro: true, fresh: true });
    Player.bombs = 3;
  },
  next() { this.idx++; this.run(); },
  stop(silent) {
    if (!this.active) return;
    this.active = false;
    if (!silent) { Game.exitToTitle(); UI.set('title'); }
  },
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.t > this.dur) this.next();
  },
};

let _frameErr = 0;
let _last = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - (_last || now)) / 1000)); _last = now;
  try {
    Input.poll(dt);
    const act = Input.consumeActivity();
    if (Attract.active && act) { Attract.stop(); }
    UI.update(dt);
    if (Game.mode === 'play' && !UI.cur && !Game.paused && Input.pressed('pause') && Game.phase !== 'done') UI.openPause();
    if (Game.mode === 'menu') Game.showcaseUpdate(dt);
    else if (!Game.paused) Game.update(dt);
    Attract.update(dt);
    if (!Game.paused) { Fx.update(dt); Phys.step(dt); }
    // kiosk idle: 10 s without input on the title / menu screens starts the attract loop
    if (!Attract.active && Game.mode === 'menu' && UI.cur && !UI.touchOnly && Input.idleSeconds() > 10) Attract.start();
    Gfx.render();
  } catch (e) {
    if (_frameErr++ < 5) console.error('Frame error', e);
    try { Gfx.render(); } catch (e2) { /* ignore */ }
  }
}

async function boot() {
  Settings.load(); SaveData.load();
  UI.build();
  Input.init();
  if (!navigator.gpu) {
    UI.fatal('WebGPU is required', `${GAME_TITLE} uses Three.js WebGPURenderer with no fallback.<br>Please use a recent Chrome, Edge or Safari with WebGPU enabled.`);
    return;
  }
  try {
    UI.loadProgress(0.2, 'Warming up the renderer…');
    await Gfx.init($('#gl'));
    UI.loadProgress(0.55, 'Loading physics…');
    await RAPIER.init();
    UI.loadProgress(0.8, 'Planting the stage…');
    Game.init();
    Game.startShowcase();
    UI.loadProgress(1, 'Ready');
  } catch (e) {
    console.error(e);
    UI.fatal('Could not start', `Initialization failed: ${e && e.message ? e.message : e}`);
    return;
  }
  UI.hideLoading();
  UI.set('title');
  Music.play('title');
  Gfx.renderer.setAnimationLoop(frame);
}
