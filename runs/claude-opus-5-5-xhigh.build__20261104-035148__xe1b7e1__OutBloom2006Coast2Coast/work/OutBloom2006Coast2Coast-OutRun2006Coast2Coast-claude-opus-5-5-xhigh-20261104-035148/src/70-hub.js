/* OutBloom — AI Hub sessions (Session Protocol v1, client 1.4.0, mode ghost). The page opens straight into the round:
 * our own card (the logo over the start line, the players as cars on the grid in their seat colours with a READY tick,
 * the goal, the controls for the last device, the countdown), ready() called as soon as we have connected (no key
 * needed), the gantry's GO landing when AIHub.time() reaches 0, our car sent ten times a second and our progress once
 * a second, the others drawn as translucent ghosts in their colours with name tags (in the pixel font, never HTML)
 * while they share our stage, a result at the goal (or on time-up), and silence after the end. No network but the
 * hub's; no dialogs, no navigation; no quit, restart or Dev Mode; Options ignored while Create is held (the engine). */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const game = OB.game, UI = OB.UI, C = UI.COL;
const H = OB.Hub = { active: OB.env.hub, phase: 'off', data: null, card: null, ghosts: new Map(), sent: 0, progressN: 0, result: null, endReason: null, lastSend: 0, lastProg: 0, rnd: null };
H.info = () => ({ active: H.active, phase: H.phase, sent: H.sent, progress: H.progressN, players: H.data && H.data.players ? H.data.players.length : 0 });
const hub = () => window.AIHub;
H.connect = async () => {
  if (!hub() || !hub().active) return null;
  H.phase = 'connecting';
  let info = null; try { info = await hub().connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { info = null; }
  if (!info) { H.active = false; H.phase = 'off'; OB.env.hub = false; game.go('title', null, { fade: 0 }); return null; }
  H.data = info; H.rnd = hub().rng ? hub().rng('card') : () => .5; H.phase = 'card';
  hub().on('card', c => { H.card = c; });
  hub().on('start', () => H.startRound());
  hub().on('message', (data, from) => { if (!data || typeof data !== 'object') return; if (data.t === 'g') H.ghosts.set(from, Object.assign(H.ghosts.get(from) || {}, { stage: String(data.area || ''), z: +data.z || 0, x: +data.x || 0, v: +data.v || 0, yaw: +data.yaw || 0, at: OB.game.real }, H.ghosts.get(from) && H.ghosts.get(from).done ? { done: true } : {})); if (data.t === 'done') { const g = H.ghosts.get(from) || {}; g.done = true; g.time = data.time; H.ghosts.set(from, g); } });
  hub().on('leave', ({ id }) => { H.ghosts.delete(id); });
  hub().on('time-up', () => { const r = OB.Race.current; if (!H.result && r && r.mode === 'hub') { H.result = { score: r.p1.metres() }; try { hub().result({ score: r.p1.metres(), stats: H.stats(r) }); } catch (e) { /* the hub is gone */ } } });
  hub().on('end', ({ reason }) => H.end(reason));
  try { hub().ready(); } catch (e) { game.fail('hub ready', e); }
  return info;
};
H.stats = r => ({ 'Best drift': Math.round(r.p1.stats.bestDrift), 'Near misses': r.p1.stats.nearMisses });
H.startRound = () => {
  if (H.phase === 'race' || H.phase === 'end') return; H.phase = 'race';
  const me = H.data && H.data.players ? H.data.players.find(p => p.id === H.data.me) : null;
  const cfg = { mode: 'hub', route: { stages: OB.ROUTES.flower.stages.slice(), sprint: true }, noIntro: true, clockUp: true, seed: (H.data && H.data.seed) >>> 0 || 1, car: 'orchidea', paint: me ? me.color : '#e8443a', passenger: 'marisol', driver: 'leo', station: 0,
    hubTime: () => { try { return hub().time(); } catch (e) { return 0; } }, after: () => {} };
  game.go('race', cfg, { fade: 0 });
};
/** each race step in a session: ghost sends at 10 Hz, progress once a second (from the start, even at 0) */
H.step = (race, dt) => {
  if (!H.active || H.phase !== 'race' || !race || race.mode !== 'hub') return;
  const now = game.real, d = race.p1;
  if (now - H.lastSend >= .1) { H.lastSend = now; try { hub().send({ t: 'g', area: d.stage, z: Math.round(d.car.z), x: +d.absX().toFixed(3), v: Math.round(d.car.v), yaw: +d.car.yaw.toFixed(2), drift: d.car.drift.on ? 1 : 0 }, { reliable: false }); H.sent++; } catch (e) { /* dropped */ } }
  if (now - H.lastProg >= 1) { H.lastProg = now; try { const st = race.fixed.length, pct = Math.round(clamp(d.car.z / (d.road.stageLen * OB.SEG), 0, 1) * 100); hub().progress({ score: d.metres(), label: 'Stage ' + (d.routeIdx + 1) + '/' + st + ' · ' + pct + '%' }); H.progressN++; } catch (e) { /* the hub is gone */ } }
  if (d.finished && !H.result) { const t = Math.round(hub().time()); H.result = { time: t }; try { hub().result({ time: t, stats: H.stats(race) }); hub().send({ t: 'done', time: t }); } catch (e) { /* the hub is gone */ } }
  // the ghosts, smoothed, while they share our stage
  race.ghosts = [];
  const ps = (H.data && H.data.players) || [];
  for (const [id, g] of H.ghosts) { if (id === (H.data && H.data.me)) continue; const p = ps.find(q => q.id === id); g.sz = g.sz === undefined ? g.z : g.sz + (g.z - g.sz) * Math.min(1, dt * 8); g.sx = g.sx === undefined ? g.x : g.sx + (g.x - g.sx) * Math.min(1, dt * 8); g.z += g.v * OB.UNITS_PER_KMH * dt * .5;
    race.ghosts.push({ id, name: OB.Hub.safeName(p ? p.name : 'P' + (id + 1)), color: p ? p.color : '#ffffff', car: 'orchidea', live: { stage: g.stage, z: g.sz, x: g.sx, yaw: g.yaw } }); }
};
/** names in the pixel font: anything it can't draw becomes '?' */
H.safeName = s => String(s || '').slice(0, 12).replace(/[^\x20-\x7e]/g, '?').toUpperCase();
H.end = reason => {
  H.phase = 'end'; H.endReason = reason;
  try { game.audio.stopMusic(.3); game.audio.loops(false); if (OB.Audio) OB.Audio.stopLoops(.2); game.audio.mute(true); } catch (e) { /* no sound */ }
  game.input.clear(); game.go('hubover', { reason }, { fade: 0 });
};
/** the standings strip on the HUD */
H.standings = (g, race, x, y) => {
  const ps = (H.data && H.data.players) || []; const rows = ps.map(p => { const gh = H.ghosts.get(p.id), mine = p.id === (H.data && H.data.me); const prog = mine ? race.p1.progress() : gh ? (race.fixed.indexOf(gh.stage) + gh.z / (OB.World.stage(gh.stage || 'S1').stageLen * OB.SEG)) : 0; return { p, prog, mine, done: mine ? race.p1.finished : gh && gh.done }; }).sort((a, b) => b.prog - a.prog);
  rows.forEach((r, i) => { px.rect(g, Math.round(x - 92), y + i * 11, 92, 10, '#140a24'); px.rect(g, Math.round(x - 92), y + i * 11, 3, 10, r.p.color); UI.text(g, (i + 1) + ' ' + H.safeName(r.p.name) + (r.done ? ' ★' : ''), x - 86, y + 1 + i * 11, { color: r.mine ? C.sun : '#ffffff', shadow: false }); });
};
/* ---- our card ---- */
OB.SCENES.hubcard = {
  res: [480, 270], expand: true,
  enter() { this.t = 0; UI.screenName = 'hubcard'; if (!H.started) { H.started = true; H.connect(); } if (OB.Audio) OB.Audio.music('title'); },
  update(dt) {
    this.t += dt; const I = game.input;
    if (H.phase !== 'card') return;
    const c = I.clicked && I.clicked(), W = game.W, Hh = game.H;
    const hitReady = c && c[0] > W / 2 - 120 && c[0] < W / 2 - 10 && c[1] > Hh - 58 && c[1] < Hh - 34, hitMore = c && c[0] > W / 2 + 10 && c[0] < W / 2 + 120 && c[1] > Hh - 58 && c[1] < Hh - 34;
    if (I.pressed('confirm') || I.pressed('start') || hitReady) { try { hub().answer('ready'); } catch (e) { /* not on a card */ } OB.sfx('confirm'); }
    if (I.pressed('alt') || hitMore) { try { hub().answer('more'); } catch (e) { /* not on a card */ } OB.sfx('tick'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, Hh = r.H, t = this.t, road = OB.World.stage('S1');
      road.drawTo(g, { x: 0, y: 0, w: W, h: Hh }, { z: 2600, x: 0, h: 1300, focal: OB.FOCAL, horizon: .42, cars: [], sky: (g2, vp) => OB.Sky.draw(g2, vp, Hh * .42, 'beachDawn', 0, t, {}) }, t);
      OB.drawLogo(g, W / 2, 14, t, 4);
      const ps = (H.data && H.data.players) || [], card = H.card || {}, ready = card.ready || [];
      ps.forEach((p, i) => { const x = W / 2 + (i - (ps.length - 1) / 2) * 90, y = Hh * .74; OB.Art.drawCar(g, OB.Art.car('orchidea', p.color), x, y, .45, { yaw: 0 });
        UI.text(g, H.safeName(p.name), x, y + 4, { align: 'center', color: p.color }); if (ready.includes(p.id)) OB.Art.icon(g, 'check', x - 3, y - 54, 2); });
      UI.panel(g, W / 2 - 150, 92, 300, 22, { alpha: .85 }); UI.text(g, 'Fastest to the Flower Sprint goal wins', W / 2, 98, { align: 'center', color: C.sun });
      UI.prompt(g, W / 2 - 150, 120, 'gas', 'Gas', {}); UI.prompt(g, W / 2 - 70, 120, 'brake', 'Brake', {}); UI.prompt(g, W / 2 + 10, 120, 'drift', 'Drift', {}); UI.prompt(g, W / 2 + 80, 120, 'steer', 'Steer', {});
      if (H.phase === 'connecting') UI.text(g, 'Connecting...', W / 2, Hh - 46, { align: 'center' });
      else if (H.phase === 'card') {
        const left = card.left === null || card.left === undefined ? null : Math.ceil(card.left / 1000);
        UI.text(g, card.starting ? 'STARTING...' : card.paused ? 'MORE TIME ASKED (' + (card.asking || 0) + ')' : left !== null ? 'ROUND STARTS IN ' + left : '', W / 2, Hh - 72, { align: 'center', scale: 2, color: '#ffffff' });
        UI.panel(g, W / 2 - 120, Hh - 58, 110, 24, { border: C.good }); UI.prompt(g, W / 2 - 65, Hh - 51, 'confirm', 'READY', { align: 'center' });
        UI.panel(g, W / 2 + 10, Hh - 58, 110, 24, { border: card.asked ? C.sun : C.border }); UI.prompt(g, W / 2 + 65, Hh - 51, 'alt', card.asked ? 'TAKE IT BACK' : 'MORE TIME', { align: 'center' });
      }
    });
  }
};
OB.SCENES.hubover = {
  res: [480, 270], expand: true, enter(d) { this.d = d || {}; this.t = 0; }, update(dt) { this.t += dt; },
  draw(r) { r.overlay(g => { const W = r.W, Hh = r.H; OB.menuBG(g, W, Hh, this.t); UI.panel(g, W / 2 - 100, Hh / 2 - 24, 200, 48, { alpha: .9 }); UI.text(g, 'ROUND OVER', W / 2, Hh / 2 - 14, { align: 'center', scale: 2, color: C.sun }); UI.text(g, 'Thanks for driving!', W / 2, Hh / 2 + 6, { align: 'center' }); }); }
};
})();
