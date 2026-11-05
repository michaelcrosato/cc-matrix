/* AI Hub online: ghost mode (protocol 1, client 1.4.0). Each copy runs its own race down the Flower Sprint route; copies
 * send only their own car, 10 times a second. A card scene shows who is here and answers ready or more time. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, game = OB.game, S = OB.scenes, T = OB.txt, Hub = window.AIHub;
const SEAT = ['#ff6a8a', '#3adfff', '#ffd23a', '#9affb0'];
const ghosts = new Map();
const H = OB.hub = {
  active: !!(Hub && Hub.active), info: null, frozen: false, locked: true, ended: false, started: false, finishedSent: false, card: null, sendT: 0, lastProg: 0,
  ghostCars(area) { const out = []; for (const g of ghosts.values()) if (g.area === area && g.car) { g.car.z = g.z + OB.AHEAD; g.car.x = g.x; out.push(g.car); } return out; },
  onRaceEnter(R) { H.race = R; },
  tick(R, dt) {
    if (R.mode !== 'hub' || !H.started) return;
    for (const g of ghosts.values()) { g.z += (g.tz - g.z) * Math.min(1, dt * 8); g.x += (g.tx - g.x) * Math.min(1, dt * 8); }
    H.sendT += dt;
    if (H.sendT >= .1) { H.sendT = 0; Hub.send({ t: 'g', area: R.stageId, z: Math.round(R.z), x: Math.round(R.x * 100) / 100, v: Math.round(R.speed), yaw: Math.round(R.drift.angle * 100) / 100, drift: R.drift.on ? 1 : 0 }, { reliable: false }); }
    const along = Math.round(R.distance);
    Hub.progress({ score: along, label: 'Stage ' + R.route.length + '/3 · ' + Math.round(Math.min(1, R.pz / R.stage.gateZ) * 100) + '%' });
    if (R.state === 'goal' && !H.finishedSent) { H.finishedSent = true; const ms = Math.round(Hub.time()); Hub.result({ time: ms, stats: { 'Best drift': R.stats.bestDrift, 'Near misses': R.stats.near } }); Hub.send({ t: 'done', time: ms }); }
  },
  draw(g, W, Ht, R) {
    if (R.mode !== 'hub') return;
    const players = Hub.players || [], y0 = 54; let i = 0;
    OB.panel(g, 8, y0, 112, 12 + players.length * 9, { bg: '#1a0c2ecc' });
    for (const p of players) { const gh = ghosts.get(p.id), mine = p.id === Hub.me, prog = mine ? R.route.length * 100 + R.pz / R.stage.gateZ * 100 : gh ? gh.prog : 0; T(g, (p.name || 'P' + (i + 1)).slice(0, 10).toUpperCase() + (mine ? ' ◄' : ''), 14, y0 + 5 + i * 9, SEAT[i % 4], { font: 'tiny' }); const pr = mine ? clamp01((R.route.length - 1 + R.pz / R.stage.gateZ) / 3) : gh ? gh.p : 0; px.rect(g, 70, y0 + 6 + i * 9, 44, 3, '#1a1030'); px.rect(g, 70, y0 + 6 + i * 9, Math.round(44 * pr), 3, SEAT[i % 4]); i++; }
    if (H.finishedSent && !H.ended) { OB.panel(g, W / 2 - 80, Ht * .55, 160, 20, { bg: '#2a1346ee' }); T(g, 'Waiting for the others…', W / 2, Ht * .55 + 6, '#ffffff', { align: 'center' }); }
    if (H.ended) { px.rect(g, 0, 0, W, Ht, '#10081c'); E.font.title(g, 'Round over', W / 2, Ht / 2 - 12, { scale: 3, align: 'center', colors: ['#ffffff', '#ffd0ec', '#ff6aa0'] }); }
  }
};
const clamp01 = v => Math.max(0, Math.min(1, v));
H.ghosts = ghosts;
/* ---- the card: shown before the race while the hub waits for everyone ---- */
S.hubcard = {
  view: 'side', res: [480, 270], expand: true,
  enter() { this.t = 0; this.ans = 'none'; OB.playTitle(); OB.fx.clear(); if (!H.card) H.card = { left: 30 }; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (I.pressed('confirm') || (I.clicked() && I.clicked()[1] > 190 && I.clicked()[0] < 240)) { this.ans = 'ready'; Hub.answer('ready'); OB.sfx('confirm'); }
    if (I.pressed('cancel') || I.pressed('radio') || (I.clicked() && I.clicked()[1] > 190 && I.clicked()[0] >= 240)) { this.ans = 'more'; Hub.answer('more'); OB.sfx('select'); }
    if (H.started) game.go('race', { mode: 'hub' }, { fade: 0 });
  },
  draw(r) {
    const W = r.W, Ht = r.H, st = OB.getStage(0); st.road.o.sky = st.sky; st.road.draw(r, { z: 0, x: 0, h: 1000, turn: 0, cars: [] });
    r.overlay(g => {
      E.font.title(g, 'OutBloom 2006', W / 2, 12, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffd0ec', '#ff6aa0', '#c0306a'], depth: 3, depthColor: '#4a1240' }); T(g, 'COAST 2 COAST · FLOWER SPRINT', W / 2, 46, '#ffffff', { align: 'center' });
      T(g, 'Fastest to the Flower Sprint goal wins', W / 2, 58, '#ffe27a', { align: 'center' });
      const players = Hub.players || []; players.forEach((p, i) => { const x = W / 2 - (players.length - 1) * 38 + i * 76; const fk = { car: OB.CARS[0], color: i % 7, passId: 'marisol', drift: { angle: 0, on: false }, bank: 0, crash: 0, speed: 0, x: 0, mood: 80, boost: 0, o: {} }; OB.drawCar(g, x, 160, 1.4, fk, game.time); T(g, (p.name || 'P' + (i + 1)).slice(0, 10).toUpperCase(), x, 164, SEAT[i % 4], { align: 'center', font: 'tiny' }); T(g, p.id === Hub.me ? (this.ans === 'ready' ? '✔ READY' : 'YOU') : '', x, 172, '#9affb0', { align: 'center', font: 'tiny' }); });
      const left = H.card && H.card.left != null ? Math.ceil(H.card.left) : ''; if (left !== '') T(g, String(left), 18, 12, '#ffffff', { scale: 3 });
      OB.panel(g, W / 2 - 150, 190, 300, 28, { bg: '#2a1346ee' }); T(g, game.input.label('confirm') + ' READY      ' + game.input.label('cancel') + ' MORE TIME', W / 2, 198, '#ffe2f4', { align: 'center' });
      T(g, 'Steer ' + game.input.label('left') + game.input.label('right') + '  Gas ' + game.input.label('gas') + '  Brake ' + game.input.label('brake') + '  Slide ' + game.input.label('drift'), W / 2, 226, '#c8b8ff', { align: 'center', font: 'tiny' });
    });
  }
};
/* ---- wiring (only when a hub launched the page) ---- */
H.boot = async () => {
  if (!H.active) return false;
  const info = await Hub.connect({ mode: 'ghost', seats: [1, 4], card: true });
  if (!info) { H.active = false; return false; }
  H.info = info;
  Hub.on('card', c => { H.card = c; });
  Hub.on('start', e => { H.started = true; H.locked = false; H.sendT = 0; H.startIn = Math.max(.3, (e && e.in || 3400) / 1000); });
  Hub.on('message', (data, from) => {
    if (!data || typeof data !== 'object') return;
    if (data.t === 'g') { let g = ghosts.get(from); if (!g) { const idx = (Hub.players || []).findIndex(p => p.id === from); g = { area: data.area, z: data.z, x: data.x, tz: data.z, tx: data.x, p: 0, prog: 0, car: OB.ghostCar(SEAT[(idx < 0 ? ghosts.size + 1 : idx) % 4], ((Hub.players || []).find(p => p.id === from) || {}).name ? String(((Hub.players || []).find(p => p.id === from)).name).slice(0, 8).toUpperCase().replace(/[^A-Z0-9 ]/g, '?') : 'P') }; ghosts.set(from, g); } if (g.area !== data.area) { g.z = data.z; g.x = data.x; } g.area = data.area; g.tz = data.z; g.tx = data.x; g.p = clamp01(((data.area === 0 ? 0 : data.area === 1 ? 1 : 2) + data.z / 150000) / 3); }
  });
  Hub.on('leave', ({ id }) => { ghosts.delete(id); });
  Hub.on('time-up', () => { const R = H.race; if (R && R.mode === 'hub' && !H.finishedSent) { H.finishedSent = true; Hub.result({ score: Math.round(R.distance) }); } });
  Hub.on('end', () => { H.ended = true; H.frozen = true; OB.stopMusic(); try { game.audio.mute && !game.audio.muted && game.audio.mute(); } catch (e) { /* audio gone */ } });
  Hub.probe(() => ({ scene: game.sceneName, world: H.race ? H.race.snapshot() : null, menu: null, input: game.input.lastDevice }));
  Hub.ready();
  return true;
};
})();
