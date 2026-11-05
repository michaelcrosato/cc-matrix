// The attract mode (12.1): after 10 s without input on the title (or a menu reached from it) a looping AI-played demo
// of every operation (the bot, cheating freely: god mode, infinite ammo), then the high-score table, then the title.
// Any input (a key, a mouse move or click, a pad button or stick) wakes it. Also the touch-only notice (14.1).
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E;
const A = WP.Attract = { idle: 0, i: 0, segT: 0, bot: null, phase: 'title', scoresT: 0, seen: null };
A.PLAYLIST = [
  { op: 'op1', d: 300, seconds: 25 }, { op: 'op2', boss: true, seconds: 25 }, { op: 'op3', d: 1390, seconds: 20 },
  { op: 'op4', d: 1790, seconds: 20 }, { op: 'op5', d: 1440, seconds: 25 }, { op: 'op6', partB: true, seconds: 30 }
];
A.reset = () => { A.idle = 0; A.phase = 'title'; };
/** a fingerprint of everything a person can do; any change is input */
const touched = game => {
  const I = game.input, ps = game.players || [I];
  let act = false;
  for (const q of ps) { if (q.anyPressed && q.anyPressed()) act = true; if (q.held && [...q.held].some(c => !c.startsWith('Act:') || c === 'Act:menu')) act = true; const m = q.padMove || [0, 0]; if (Math.hypot(m[0], m[1]) > .3) act = true; if (q.padAim && Math.hypot(q.padAim[0], q.padAim[1]) > .3) act = true; }
  const mt = I.mouse ? I.mouse.t : 0; if (A.seen !== null && mt !== A.seen) act = true; A.seen = mt;
  if (I.clicked && I.clicked()) act = true;
  if (WP.Touch.on && !WP.Touch.keyed) { /* taps don't count on touch-only devices */ if (I.clicked && I.clicked() && !I.held.size) act = false; }
  return act;
};
A.touched = touched;
/** on the title: count idle time; at 10 s start the demo. Returns true when it took over */
A.title = (dt, game, scene) => {
  if (touched(game)) { A.idle = 0; return false; }
  if (game.shell && game.shell.screen) { A.idle = 0; return false; }
  A.idle += dt;
  if (A.idle >= 10) { A.idle = 0; A.start(game); return true; }
  return false;
};
/** on other menu screens: after 10 s idle, back to the title (whose own timer starts the demo) */
A.idleTick = (dt, game) => {
  if (touched(game) || (game.shell && game.shell.screen)) { A.idleM = 0; return false; }
  A.idleM = (A.idleM || 0) + dt; if (A.idleM >= 10) { A.idleM = 0; A.start(game); return true; }
  return false;
};
A.start = game => { A.i = 0; A.bot = WP.Bot.make({ fair: false, seed: 7 }); A.segment(game); };
A.segment = game => {
  const s = A.PLAYLIST[A.i % A.PLAYLIST.length]; A.segT = 0; A.phase = 'demo';
  WP.Flow.newRun({ diff: 'VETERAN', demo: true, hostages: 5 }); WP.Flow.run.demo = true;
  const st = WP.STAGE[s.op], bh = st.holds.find(h => h.until === 'boss'), d = s.boss ? (bh ? bh.d : st.rail[st.rail.length - 1].d) - 1 : (s.d || 0);
  WP.Audio.muteAll = false;
  game.go('play', { op: s.op, d, demo: true, cheats: { god: true, ammo: true, grenades: true }, noCard: false, hostages: 5, fresh: true, seed: 1000 + A.i,
    jump: sim => { if (s.boss) for (const k in sim.quotas) sim.quotas[k] = 0; if (s.partB && WP.Op6) WP.Op6.partB(sim); } }, { fade: 'wipe' });
  if (game.audio && game.audio.setVolume && !A.vol) { A.vol = true; }
};
A.botFrame = (world, p, dt) => WP.Bot.frame(A.bot || (A.bot = WP.Bot.make({ seed: 7 })), world, p, dt);
/** in the demo's play scene: any input wakes it (back to the title); the segment ends -> the next, then the scores */
A.update = (dt, game) => {
  if (touched(game)) { A.wake(game); return true; }
  A.segT += dt;
  const s = A.PLAYLIST[A.i % A.PLAYLIST.length];
  if (A.segT >= s.seconds || WP.Flow.sim && (WP.Flow.sim.state === 'clear' && A.segT > 4)) {
    A.i++;
    if (A.i % A.PLAYLIST.length === 0) { game.go('attractScores', {}, { fade: 'wipe' }); return true; }
    A.segment(game); return true;
  }
  return false;
};
A.wake = game => { A.phase = 'title'; A.idle = 0; WP.Input.override(0, null); game.go('title', {}, { fade: .2 }); };
WP.attractScoresScene = {
  enter() { this.t = 0; },
  update(dt) { const g = WP.ctx.game; this.t += dt; WP.time += dt; if (touched(g)) { A.wake(g); return; } if (this.t > 6) { g.go('title'); } },
  draw(r) { r.overlay(g => { WP.Screens.drawNight(g, r, this.t); WP.Screens.logo(g, WP.W / 2, 14, 2); WP.Screens.table(g, 'campaign', 'HIGH SCORES'); if (Math.floor(this.t * 2) % 2) WP.HUD.F(g, 'PRESS ANY BUTTON', WP.W / 2, 246, '#ffd040', { align: 'center' }); }); }
};
// ---------- touch-only devices: no touch controls; "CONTROLLER OR KEYBOARD REQUIRED" and the settings button ----------
const T = WP.Touch = { on: false, keyed: false };
T.detect = game => {
  const mm = globalThis.matchMedia, nav = globalThis.navigator; if (!mm || !nav) return false;
  const coarse = mm('(any-pointer: coarse)').matches, fine = mm('(any-pointer: fine)').matches, pts = (nav.maxTouchPoints || 0) > 0;
  let pad = false; try { pad = [...(nav.getGamepads ? nav.getGamepads() : [])].some(Boolean); } catch (e) { /* blocked */ }
  T.on = coarse && !fine && pts && !pad && !T.keyed;
  if (game && game.input) game.input.touchEnabled = !T.on ? game.input.touchEnabled : false;
  return T.on;
};
T.init = game => {
  if (typeof globalThis.addEventListener !== 'function') return;
  T.detect(game);
  globalThis.addEventListener('keydown', () => { if (T.on) { T.keyed = true; T.on = false; } });
  globalThis.addEventListener('gamepadconnected', () => { if (T.on) { T.on = false; T.keyed = true; } });
};
/** on the title while touch-only: the SETTINGS button opens the settings; the attract mode runs anyway */
T.update = game => {
  const c = game.input.clicked();
  if (c && c[0] > WP.W / 2 - 70 && c[0] < WP.W / 2 + 70 && c[1] > 170 && c[1] < 200) { game.menu('settings'); return true; }
  return false;
};
T.draw = g => {
  E.ui.box(g, 60, 96, 360, 116, { bg: ['#1a2214', '#0c1208'], border: '#e0b040', alpha: .95 });
  WP.HUD.F(g, 'CONTROLLER OR KEYBOARD REQUIRED', WP.W / 2, 108, '#ffd040', { align: 'center', scale: 2 });
  WP.HUD.F(g, 'CONNECT A GAMEPAD OR A KEYBOARD TO PLAY.', WP.W / 2, 132, '#f2ead3', { align: 'center' });
  WP.HUD.F(g, 'THE DEMO PLAYS ON ITS OWN MEANWHILE.', WP.W / 2, 146, '#a8a890', { align: 'center' });
  E.ui.box(g, WP.W / 2 - 70, 170, 140, 30, { bg: ['#5a4a14', '#3a2a08'], border: '#ffd040' });
  WP.HUD.F(g, 'SETTINGS', WP.W / 2, 177, '#ffffff', { align: 'center', scale: 2 });
};
})();
