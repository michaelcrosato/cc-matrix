/* scenes/attract.js: nobody's here, so Tare shows the empty room around. 10 s without input on the title or a top-level menu
 * starts it; any input returns and swallows the press. It cheats freely and never touches saves or unlocks. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const SLICE = 15;
const star = () => ({ name: 'Marisol', regular: 'marisol', skill: 'expert', local: true, color: '#ff7a59' });
const run = (id, o = {}) => ({ id, start() { game.setView(G.activities[id].view); this.ctx = G.makeRun(id, Object.assign({ tier: 0, mode: 'attract', dur: SLICE, short: true, cheat: true, seed: 55, contestants: [star()] }, o)); G.music(G.activities[id].music); },
  update(dt) { G.stepRun(this.ctx, dt); if (this.ctx.done) { G.previewRun(this.ctx, dt); this.over = true; } }, draw(r) { G.drawRun(r, this.ctx); }, stop() { if (this.ctx.def.stop) this.ctx.def.stop(this.ctx); } });
const ITEMS = [
  { id: 'island', start() { G.Island.build(); game.setView('threequarter'); this.b = new E.Body({ x: G.Island.door.x, y: G.Island.door.y + 8, r: 5 }); this.rig = G.regularRig('marisol', 1.05); this.tare = new G.TareBody(this.b.x, this.b.y + 16); this.tare.scale = .9; this.goalI = 0; this.goals = ['stork', 'squat', 'step', 'tray'].map(id => G.Island.mats.find(m => m.id === id)); G.Island.flow.update(this.goals[0].x, this.goals[0].y); game.cam.smooth = .15; game.cam.bounds = v => G.Island.map.bounds(v); G.music('islandAM'); G.setDayLight('morning'); },
    update(dt) { const g0 = this.goals[this.goalI % 4], d = Math.hypot(g0.x - this.b.x, g0.y - this.b.y); if (d < 14) { this.goalI++; const n = this.goals[this.goalI % 4]; G.Island.flow.update(n.x, n.y); } const dd = G.Island.flow.dir(this.b.x, this.b.y, g0.x, g0.y) || [0, 0]; this.b.vx = dd[0] * 170; this.b.vy = dd[1] * 170; this.b.update(dt, G.Island.map); G.Island.updatePeople(dt); this.tare.update(dt, [this.b.x - 14, this.b.y + 12]); this.rig.update(dt, { x: this.b.x, y: this.b.y, z: 0, vx: this.b.vx * .6, vy: this.b.vy * .6, facing: Math.atan2(this.b.vy, this.b.vx), expr: 'smile' }); game.focus(this.b.x, this.b.y, 10); },
    draw(r) { G.Island.drawWorld(r, { demo: true, allOpen: true }); G.drawRig(r, this.rig, this.b.x, this.b.y); this.tare.draw(r, { scale: .9 }); }, stop() { game.cam.bounds = null; game.cam.smooth = 0; G.L.enabled = false; } },
  { id: 'bodycheck', start() { game.setView('brawler'); this.c = G.BodyCheck.make({ bot: 'expert', demo: true, rig: G.regularRig('marisol', 2) }); this.c.step = 'still'; G.music('studio'); },
    update(dt) { G.stageCam(30, 8); const c = this.c; c.tare.update(dt); G.BodyCheck.stepRig(c, dt, true); if (c.step === 'still' || c.step === 'lean') { if (G.BodyCheck.tests(c, dt)) { c.step = 'reading'; c.t = 0; } } else { c.t += dt; } },
    draw(r) { const c = this.c; G.BodyCheck.drawStage(r, c); r.overlay(g => { if (c.step === 'reading') { const W = game.W; G.panel(g, W / 2 - 120, 30, 240, 36, { r: 8 }); txt(g, G.line('attractReading.0', { d: c.ducks.toFixed(1) }), W / 2, 36, '#20404c', { align: 'center' }); txt(g, G.DATA.lines.attractReading[1], W / 2, 48, '#5f7f8a', { align: 'center' }); } else G.BodyCheck.hudTests(g, c); }); }, stop() {} },
  run('stork'), run('flow'), run('candle'), run('squat'), run('pushup'), run('lunge'), run('step'), run('hoop'), run('jog'), run('slalom'), run('tray'), run('laundry'),
  { id: 'class4', start() { game.setView('brawler'); const who = ['gertrude', 'kevin', 'okafor', 'twin1']; this.ctx = G.makeRun('stork', { mode: 'class', dur: SLICE, short: true, cheat: true, seed: 77, contestants: who.map((id, i) => ({ name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], regular: id, skill: ['good', 'expert', 'average', 'good'][i], local: i === 0 })) }); G.music('festival'); },
    update(dt) { G.stepRun(this.ctx, dt); if (this.ctx.done) G.previewRun(this.ctx, dt); }, draw(r) { G.drawRun(r, this.ctx); }, stop() {} },
  { id: 'results', start() { game.setView('brawler'); this.tare = new G.TareBody(-90, 10); this.tare.scale = 2; const def = G.activities.stork; this.res = new G.Results(def, 0, .97, 3, 'Steadiness 97%. Falls: 0.', { add: 2.5, got: [] }, {}); G.music('festival'); },
    update(dt) { G.stageCam(30, 8); this.res.update(dt); this.tare.update(dt); }, draw(r) { G.ROOMS.studio(r); G.drawMat(r, -90, 10, 40, 10, '#bfeee0'); this.tare.draw(r, { scale: 2 }); r.overlay(g => this.res.draw(g)); }, stop() {} },
  run('candle', { mode: 'duel', dur: SLICE })
];
ITEMS[ITEMS.length - 1].id = 'duel';
G.ATTRACT_ITEMS = ITEMS.map(i => i.id);
let saved = null, idx = 0, it = null, t = 0, lineT = 0, lineI = 0;
const open = i => { if (it && it.stop) it.stop(); idx = i % ITEMS.length; it = ITEMS[idx]; it.over = false; t = 0; G.talk.close(); G.L.enabled = false; it.start(); G.attractSeen = G.attractSeen || {}; G.attractSeen[it.id] = true; lineT = 1; };
G.scenes.attract = {
  view: 'brawler', camera: { zoom: false }, pausable: false,
  enter() { saved = { s: G.S, slot: G.Save.slot, dev: Object.assign({}, G.DEV) }; G.attractOn = true; G.Save.slot = null; G.S = G.freshMember('Marisol'); G.S.instructor = 'alder'; G.S.arrived = true; G.S.checked = true; G.S.freePlay = true; G.dbg.activity = 'attract'; open(0); },
  exit() { if (it && it.stop) it.stop(); it = null; G.talk.close(); G.S = saved.s; G.Save.slot = saved.slot; Object.assign(G.DEV, saved.dev); G.attractOn = false; game.cam.bounds = null; game.cam.smooth = 0; G.L.enabled = false; game.setView('brawler'); },
  update(dt) {
    t += dt; G.talk.update(dt); it.update(dt);
    lineT -= dt; if (lineT <= 0) { lineT = 9; const L = G.DATA.lines.tare.attract; G.mutter('tare', L[lineI++ % L.length], { attract: true, auto: 3.4, face: 'happy' }); }
    if (t >= SLICE) open(idx + 1);
  },
  draw(r) {
    it.draw(r);
    r.overlay(g => {
      const W = game.W, H = game.H; G.panel(g, 8, H - 26, 44, 17, { r: 6, bg: '#ff7a59', border: '#e0553a' }); txt(g, 'DEMO', 30, H - 21, '#ffffff', { align: 'center' });
      E.font.title(g, G.TITLE, 56, H - 24, { scale: 1, colors: ['#7fe6f8', '#14a8c8'], align: 'left', depth: 1, depthColor: '#0d7f97', outline: false });
      if (Math.floor(game.real * 1.4) % 2 === 0) { const s = game.input.lastDevice === 'gamepad' ? 'Press any button' : 'Press any key'; G.panel(g, W / 2 - 58, H - 21, 116, 15, { r: 6 }); txt(g, s, W / 2, H - 17, '#20404c', { align: 'center' }); }
    });
    G.talk.draw(r);
  },
  now: () => idx
};

/* ---- the idle watch: 10 s without input on the title or a top-level menu starts it; any input ends it ---- */
const MENUS = new Set(['title', 'about', 'member', 'freeplay']);
let idleT = 0, mt = -1, wasPad = 0;
game.hook('input', (a, b) => {
  const dt = typeof a === 'number' ? a : b; if (G.inSession) return; const I = game.input, name = game.sceneName;
  const stick = I.padMove ? Math.hypot(I.padMove[0], I.padMove[1]) : 0, moved = I.mouse && I.mouse.t !== mt; if (moved) mt = I.mouse.t;
  const active = I.anyPressed() || stick > .25 || moved || !!I.clicked() || (I.held && I.held.size > 0);
  if (name === 'attract') { if (active) { I.consumeAll(); G.go('title', { fromAttract: true }, { fade: 0 }); } idleT = 0; return; }
  if ((!MENUS.has(name) && !(name === 'class' && G.classIdle && G.classIdle())) || G.talk.open || (game.shell && game.shell.screen) || game._fade) { idleT = 0; return; }
  if (active) { idleT = 0; return; }
  idleT += dt; G.idleT = idleT;
  if (idleT >= 10) { idleT = 0; G.go('attract', null, { fade: 0 }); }
});
})();
