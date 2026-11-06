// AI Hub session: ghost mode round. Same car, same track, lowest time wins. Plan section 14 (In a session), recipe C4.
import { Engine } from '../../pixel-engine.js';
import { App, fmtTime, safeName } from '../app.js';
import { RaceScene } from '../scenes/race.js';
import { defaultInstall } from '../sim/tuning.js';
import { TRACKS } from '../data/tracks.js';
import { CAR_INFO } from '../data/cars.js';
import { CarView } from '../render/carview.js';
import { tunedParams } from '../sim/tuning.js';
import { readPads } from '../input/actions.js';
import { drawTrackMini } from '../ui/screens/main.js';
import { TITLE } from '../data/meta.js';
const ROUNDS = [['kestrel', 2], ['cedar', 2], ['harbour', 2], ['saltline', 4]], CARS = ['ginga', 'ryu', 'brandt32', 'kite'], SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'], SEAT_PAL = ['red', 'blue', 'lime', 'sand'];
export async function startHub(hub, container, opts, afterStart) {
  const info = await hub.connect({ mode: 'ghost', seats: [1, 4], card: true }); if (!info) return null;
  const rr = hub.rng('round'), [track, laps] = ROUNDS[Math.floor(rr() * ROUNDS.length)], carId = CARS[Math.floor(rr() * CARS.length)], hours = [11, 15, 18.5, 21], hour = track === 'harbour' ? 21 : track === 'saltline' ? 18.5 : hours[Math.floor(rr() * 2)], rain = track === 'kestrel' && rr() < 0.3;
  const players = (info.players ?? []).map((p, i) => ({ id: p.id, name: safeName(p.name, i), colour: SEAT_PAL[i % 4], hex: p.color ?? SEAT[i % 4] })); const me = players.find((p) => p.id === info.me) ?? players[0] ?? { id: 0, name: 'P1', colour: 'red' };
  const cfg = { mode: 'hub', hub: true, hubRound: true, track, hour, rain, title: 'ROUND', music: true, sim: { laps, contact: false, start: 'standing', hubHold: true, rain, wearMul: 0.5, seed: info.seed ?? 1, field: [{ id: 'player', carId, name: me.name, player: true, skill: 1, install: defaultInstall(), colour: me.colour }] } };
  const scene = new RaceScene(cfg); scene.hubRound = new HubRound(scene, hub, info, players, me, carId);
  let engine; try { engine = await Engine.start(scene, opts(container, { seed: info.seed ?? 1 })); } catch (e) { hub.fail?.('This game needs WebGPU. ' + (e?.message ?? e)); throw e; }
  afterStart(engine); scene.hubRound.attach(); hub.ready(); return engine;
}
export class HubRound {
  constructor(sc, hub, info, players, me, carId) { this.sc = sc; this.hub = hub; this.info = info; this.players = players; this.me = me; this.carId = carId; this.card = { left: null, ready: [], asked: false }; this.ghosts = new Map(); this.done = false; this.ended = false; this.last = 0; this.stats = { walls: 0, top: 0 }; this.finished = false; this.padPrev = {}; this.startedAt = null; this.resulted = false; }
  attach() { const h = this.hub; this.offs = [h.on('card', (c) => { this.card = c; }), h.on('start', () => { this.started = true; }), h.on('message', (d, from) => this.receive(d, from)), h.on('leave', ({ id }) => this.remove(id)), h.on('time-up', () => this.timeUp()), h.on('end', () => this.end())];
    this.key = (e) => { if (h.time() !== -Infinity) return; if (e.code === 'Enter') h.answer('ready'); if (e.code === 'KeyM') h.answer('more'); }; window.addEventListener('keydown', this.key); }
  receive(d, from) { if (!d || d.t !== 'g' || this.ended) return; let g = this.ghosts.get(from); if (!g) { const pl = this.players.find((p) => p.id === from); const p = tunedParams(this.carId, defaultInstall()); const v = new CarView(this.carId, p, { name: pl?.name, ghost: pl?.colour ?? 'cyan' }); this.sc.ctx.scene.add(v.root); g = { v, buf: [], name: pl?.name ?? 'P' + (from + 1), colour: pl?.colour ?? 'cyan', done: d.done }; this.ghosts.set(from, g); } g.buf.push({ t: performance.now(), x: d.x, y: d.y, z: d.z, yaw: d.yaw, v: d.v, steer: d.steer, br: d.br }); if (g.buf.length > 40) g.buf.shift(); }
  remove(id) { const g = this.ghosts.get(id); if (g) { g.v.root.removeFromParent(); this.ghosts.delete(id); } }
  timeUp() { if (this.resulted) return; this.resulted = true; this.hub.result({ score: this.touchGate ? 0 : Math.floor(Math.max(0, this.sc.focus.prog)), stats: this.statsOut() }); }
  end() { this.ended = true; this.sc.paused = true; App.mix?.stopAll(); for (const o of this.offs ?? []) { try { o(); } catch {} } window.removeEventListener('keydown', this.key); this.sc.cfg.ended = true; }
  statsOut() { const f = this.sc.focus; return { 'Best lap': Math.round((isFinite(f.bestLap) ? f.bestLap : 0) * 100) / 100, 'Top km/h': Math.round(this.stats.top), Walls: this.stats.walls }; }
  get cardActive() { return this.hub.time() === -Infinity; }
  update(ctx, dt, ui) {
    if (this.ended) return; const hub = this.hub, sc = this.sc, sim = sc.sim, f = sc.focus, T = hub.time(), A = sc.A; this.touchGate = App.touchOnly && !A.anyPress && A.last !== 'key' && A.last !== 'pad';
    // pad answers on the card
    if (T === -Infinity) { const pad = readPads()[0]; if (pad) { const b = (i) => pad.buttons[i]?.pressed ? 1 : 0; if (b(0) && !this.padPrev[0]) hub.answer('ready'); if (b(3) && !this.padPrev[3]) hub.answer('more'); this.padPrev = { 0: b(0), 3: b(3) }; } }
    sim.lightT = T === -Infinity ? 0 : T / 1000 + 4; if (T !== -Infinity && T >= 0 && sim.state === 'grid') { sim.green(); sc.say('GO', 'lime', 1.2); ctx.engine.screen.flash('white', { duration: 0.12 }); App.mix?.sfx?.('green'); }
    sc.state = T !== -Infinity && T >= 0 ? 'play' : 'hold'; // controls lock until the green light
    if (sim.state !== 'grid') { f.c.vx; this.stats.top = Math.max(this.stats.top, Math.hypot(f.c.vx, f.c.vz) * 3.6); }
    const now = performance.now(); if (T >= 0 && !this.finished && now - this.last > 100) { this.last = now; const c = f.c, cv = f.cv ?? c; hub.send({ t: 'g', a: sc.cfg.track, x: Math.round(c.x * 10) / 10, y: Math.round(c.y * 10) / 10, z: Math.round(c.z * 10) / 10, yaw: Math.round(c.yaw * 100) / 100, v: Math.round(Math.hypot(c.vx, c.vz) * 10) / 10, s: Math.round(c.loc.s), lap: f.crossings, steer: Math.round(c.delta * 100) / 100, br: f.inp.brake > 0.2 ? 1 : 0 }, { reliable: false }); hub.progress({ score: Math.floor(Math.max(0, f.prog)), label: `LAP ${Math.min(sim.laps, Math.max(1, f.crossings))}/${sim.laps} P${f.positionNow}` }); }
    if (f.finished && !this.finished) { this.finished = true; if (!this.resulted) { this.resulted = true; hub.result({ time: Math.round(hub.time()), stats: this.statsOut(), awards: isFinite(f.bestLap) ? [{ title: 'Best lap', detail: fmtTime(f.bestLap) }] : [] }); } hub.send({ t: 'done', time: Math.round(hub.time()) }); }
    // ghosts: interpolate through a 150 ms buffer
    const tt = now - 150; for (const [id, g] of this.ghosts) { const b = g.buf; if (b.length < 2) continue; let i = b.length - 2; while (i > 0 && b[i].t > tt) i--; const a = b[i], c = b[i + 1], u = Math.max(0, Math.min(1, (tt - a.t) / Math.max(1, c.t - a.t))); let dy = c.yaw - a.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; g.v.place({ x: a.x + (c.x - a.x) * u, y: a.y + (c.y - a.y) * u, z: a.z + (c.z - a.z) * u, yaw: a.yaw + dy * u, delta: a.steer, u: a.v, ax: 0, ay: 0, vy: 0 }, { dt, braking: !!a.br }); g.pos = [a.x + (c.x - a.x) * u, a.y + 2.2, a.z + (c.z - a.z) * u]; }
    // draw
    if (T === -Infinity) this.drawCard(ctx, ui); else { for (const [id, g] of this.ghosts) if (g.pos) { const v = new (this.V3 ??= ctx.camera.camera.position.constructor)(g.pos[0], g.pos[1], g.pos[2]).project(ctx.camera.camera); if (v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1) ui.text(Math.round((v.x + 1) / 2 * ui.W - 14), Math.round((1 - v.y) / 2 * ui.H), g.name, { color: g.colour }); } if (this.touchGate) ui.center(ui.H - 40, 'CONTROLLER OR KEYBOARD REQUIRED', { color: 'orange' }); if (T < 0) ui.center(60, T > -1000 ? '1' : T > -2000 ? '2' : '3', { scale: 3, color: 'red' }); }
  }
  drawCard(ctx, ui) { // the game's own card: lined-up cars, seat colours, track map, how to win, controls, countdown
    const hub = this.hub, W = ui.W, H = ui.H, sc = this.sc; ui.panel(10, 10, 200, 140, 'ink', 'slate'); ui.text(18, 18, TITLE, { scale: 2, color: 'sand' }); const tn = TRACKS[sc.cfg.track].name; ui.text(18, 38, tn + '  ' + sc.sim.laps + ' LAPS', { color: 'white' }); drawTrackMini(ui, sc.cfg.track, 18, 50, 70); ui.text(94, 52, 'LOWEST TIME WINS', { color: 'lime' }); ui.text(94, 63, 'SAME CAR, SAME TRACK', { color: 'mist' }); ui.text(94, 74, CAR_INFO[this.carId].short, { color: 'sky' });
    const pad = ui.device === 'pad'; ui.text(18, 126, pad ? 'STICK STEERS  R2 GO  L2 BRAKE' : 'A D STEER  W GO  S BRAKE', { color: 'white' }); ui.panel(W - 150, 10, 140, 20 + this.players.length * 12, 'ink', 'slate'); ui.text(W - 144, 14, 'PLAYERS', { color: 'sand' }); this.players.forEach((p, i) => { ui.hud.rect(W - 144, 28 + i * 12, 6, 6, p.colour); ui.text(W - 134, 27 + i * 12, p.name, { color: 'white' }); if ((this.card.ready ?? []).includes(p.id)) ui.text(W - 52, 27 + i * 12, 'READY', { color: 'lime' }); });
    const left = this.card.left; ui.center(H - 56, left == null ? (this.card.starting ? 'STARTING' : 'WAITING') : 'STARTS IN ' + Math.ceil(left / 1000) + ' S', { scale: 2, color: 'sand' });
    const r = ui.button('ready', W / 2 - 130, H - 40, 120, 18, 'READY'); const m = ui.button('more', W / 2 + 10, H - 40, 120, 18, this.card.asked ? 'MORE TIME ON' : 'MORE TIME'); if (r.pressed) hub.answer('ready'); if (m.pressed) hub.answer('more'); ui.prompts([['confirm', 'READY'], ['info', 'MORE TIME']]);
  }
}
