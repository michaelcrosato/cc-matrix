// A hub session: ghost mode. Every copy runs its own physics; the others are stippled ghosts in seat colours with name tags.
import { Engine } from '../../pixel-engine.js';
import { RaceScene } from '../scenes/race.js';
import { hubSetup } from '../sim/setups.js';
import { TRACKS } from '../data/tracks.js';
import { TITLE, SEAT_COLOURS, SEAT_PAINT } from '../data/meta.js';
import { CAR_INFO } from '../data/cars.js';
import { CarView } from '../render/carview.js';
import { SettingsScreen } from '../ui/screens/settings.js';
import { HandbookScreen } from '../ui/screens/handbook.js';
import { drawGlyph, glyphWidth, specFor } from '../ui/glyphs.js';
import { miniMap } from '../ui/screens/common.js';
import { safeName, wrapText } from '../ui/ui.js';
import { BTN } from '../input/pad.js';
import { engineOptionsFor } from './couch.js';
const BUFFER = 150;
const SEAT_HUD = SEAT_COLOURS.map((c) => parseInt(c.slice(1), 16)); // the HUD takes palette names or numbers
class Ghosts {
  constructor(scene, info) { this.scene = scene; this.info = info; this.list = new Map(); }
  receive(data, from, now) {
    if (!data || data.t !== 'g') { if (data?.t === 'done') { const g = this.list.get(from); if (g) g.done = data.time; } return; }
    let g = this.list.get(from);
    if (!g) { const p = this.info.players.find((x) => x.id === from), scene = this.scene, carId = scene.sim.cars[0].carId, seat = p ? this.info.players.indexOf(p) : 0, view = new CarView(carId, { ghost: SEAT_PAINT[seat % 4] }); scene.ctx.scene.add(view.object); g = { view, snaps: [], name: safeName(p?.name, `P${seat + 1}`), seat, x: 0, y: 0, z: 0, s: 0, lap: 0 }; this.list.set(from, g); }
    g.snaps.push({ at: now, x: data.x, y: data.y, z: data.z, yaw: data.yaw, v: data.v, s: data.s, lap: data.lap, steer: data.steer, br: data.br }); if (g.snaps.length > 24) g.snaps.shift();
  }
  remove(id) { const g = this.list.get(id); if (g) { g.view.dispose(); this.list.delete(id); } }
  update(dt, now) {
    for (const g of this.list.values()) {
      const t = now - BUFFER, S = g.snaps; let a = S[0], b = S[S.length - 1]; for (let i = 0; i + 1 < S.length; i++) if (S[i].at <= t && S[i + 1].at >= t) { a = S[i]; b = S[i + 1]; break; }
      if (!a) continue; const f = b.at > a.at ? Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at))) : 0; let dy = b.yaw - a.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      g.x = a.x + (b.x - a.x) * f; g.y = a.y + (b.y - a.y) * f; g.z = a.z + (b.z - a.z) * f; g.yaw = a.yaw + dy * f; g.s = b.s; g.lap = b.lap; g.v = a.v ?? 0; g.view.update(dt, g.x, g.y, g.z, g.yaw, 0, 0, 0, 0, a.steer ?? 0, a.v ?? 0);
    }
  }
  tags(ui, cam) { const P = this.scene.tagV ??= new (this.scene.cam.position.constructor)(); for (const g of this.list.values()) { P.set(g.x, g.y + 1.9, g.z).project(cam); if (P.z < 1 && P.x > -1 && P.x < 1 && P.y > -1 && P.y < 1) ui.text((P.x + 1) * 0.5 * ui.w, (1 - P.y) * 0.5 * ui.h, g.name, { align: 'center', color: SEAT_HUD[g.seat % 4] }); } }
}
class HubMenu {
  constructor(app) { this.id = 'hubMenu'; this.app = app; }
  onBack(ui) { ui.pop(); return true; }
  draw(ui) { const a = this.app, list = [['resume', 'BACK TO THE RACE', () => ui.pop()], ['settings', 'SETTINGS', () => ui.push(new SettingsScreen(a, { inRace: true, limited: true }))], ['handbook', 'HANDBOOK', () => ui.push(new HandbookScreen(a))]], w = 140, x = ui.cx - w / 2, y = 80; ui.panel(x - 8, y - 22, w + 16, 86, { color: 'ink', border: 'slate' }); ui.text(ui.cx, y - 16, 'THE RACE GOES ON', { align: 'center', color: 'sand' }); list.forEach(([id, l, fn], k) => ui.button(id, x, y + k * 18, w, 15, l, { confirm: fn })); ui.prompts([['confirm', 'CHOOSE'], ['back', 'BACK']]); }
}
export async function startSession(app, info, container) {
  const hub = window.AIHub, rng = hub.rng('round'), setup = hubSetup(rng, info.seed), me = info.players.findIndex((p) => p.id === info.me), player = setup.cars[0];
  player.paint = SEAT_PAINT[Math.max(0, me) % 4];
  let done = false, last = 0, walls = 0, follow = 0, card = { left: null, ready: [], asking: 0, asked: false }, started = false, ended = false, cardAnswered = null;
  const touchOnly = !!app.touchGate;
  const state = { get card() { return card; }, get started() { return started; } };
  const tl = () => hub.time();
  const opts = {
    run: { type: 'hub' }, hideHud: false,
    beforeStep: (sim, inputs) => { if (!started || tl() < 0 || ended) { for (const k in inputs) inputs[k] = { steer: 0, throttle: 0, brake: 0 }; } if (ended) inputs[0] = { steer: 0, throttle: 0, brake: 1 }; },
    afterStep: (sim) => {
      const e = sim.cars[0], t = tl();
      if (started && sim.phase === 'grid' && t >= 0) sim.go();
      if (sim.phase === 'grid' && started) { const lit = Math.max(0, Math.min(3, Math.floor((t + 3000) / 1000) + 1)); if (lit !== sim.lights) { sim.lights = lit; sim.events.push({ type: 'flag', kind: 'lights', n: lit }); } }
      if (!done && e.finished && e.finishTime !== null) { done = true; const stats = { 'Best lap': e.bestLap ? +e.bestLap.toFixed(2) : 0, 'Top km/h': Math.round(e.topSpeed * 3.6), Walls: e.walls }; hub.result({ time: Math.round(tl()), stats, awards: e.walls === 0 ? [{ title: 'Clean', detail: 'No wall was touched.' }] : [] }); hub.send({ t: 'done', time: Math.round(tl()) }); }
      walls = e.walls;
    },
    onFrame: (scene, ctx, dt) => {
      const a = app.actions, sim = scene.sim, e = sim.cars[0], now = performance.now();
      if (!scene.ghosts) { scene.ctx = ctx; scene.ghosts = new Ghosts(scene, info); for (const m of pending) scene.ghosts.receive(m[0], m[1], now); pending.length = 0; }
      scene.ghosts.update(dt, now); scene.ghosts.tags(app.ui, scene.cam);
      // While racing, at 10 Hz.
      if (started && tl() >= 0 && !ended && now - last > 100) {
        last = now; const c = e.c, R = (v, k = 100) => Math.round(v * k) / k, metres = Math.max(0, e.progress);
        hub.send({ t: 'g', a: sim.tr.id, x: R(c.x), y: R(c.y), z: R(c.z), yaw: R(c.yaw, 1000), v: R(c.u), s: R(c.loc.s, 10), lap: e.lap, steer: R(c.delta, 100), br: (e.inp?.brake ?? 0) > 0.05 ? 1 : 0 }, { reliable: false });
        const riders = [...scene.ghosts.list.values()], pos = 1 + riders.filter((g) => (g.lap - 1) * sim.tr.length + g.s > e.progress).length;
        hub.progress({ score: Math.floor(metres), label: `LAP ${Math.max(1, Math.min(e.lap, sim.laps))}/${sim.laps} P${pos}` });
      }
      // The card: the cars lined up, each seat's colour, the map, how to win, the controls, the countdown.
      if (!started) drawCard(app, scene, ctx, card, info, setup);
      // Enter and the pad's Cross answer Ready; Triangle or M asks for more time.
      if (!started) for (const pad of a.pads) { const pb = pad.prevHub ?? (scene.padPrev ??= {})[pad.i] ?? []; const P = (b) => pad.buttons[b] > 0.5 && !(pb[b] > 0.5); if (P(BTN.cross)) answer('ready'); if (P(BTN.triangle)) answer('more'); (scene.padPrev ??= {})[pad.i] = pad.buttons; }
      if (!started && a.clicked) { const ui = app.ui; if (ui.inRect(cardRects.ready)) answer('ready'); else if (ui.inRect(cardRects.more)) answer('more'); }
      // Options or Esc opens settings over the running race. It never pauses, and it offers no quit.
      if (started && !ended && a.pressed('pause') && !a.create && !app.ui.top) app.ui.push(new HubMenu(app));
      // Finished: an AI drives your car while you wait, and your camera can follow another ghost.
      if (e.finished && !ended) {
        const list = [...scene.ghosts.list.values()], ui = app.ui;
        if (list.length && (a.pressed('tabR') || a.pressed('tabL'))) { follow = (follow + 1) % (list.length + 1); scene.chase.snap(); app.mix.sfx('tick'); }
        const g = follow > 0 ? list[follow - 1] : null;
        scene.camOverride = g ? (cam, d) => scene.chase.update(d, { x: g.x, y: g.y, z: g.z, yaw: g.yaw, u: g.v ?? 0 }, {}) : null;
        if (list.length) { const spec = specFor('tabR', a.lastDevice), xbox = app.options.glyphs === 'xbox', label = g ? `WATCHING ${g.name}` : 'WATCH ANOTHER CAR', w = glyphWidth(ctx.hud, spec, xbox) + 4 + ctx.hud.measure(label).width, x0 = Math.round(ui.cx - w / 2), y0 = ui.h - 62; drawGlyph(ctx.hud, x0, y0, spec, xbox); ui.text(x0 + glyphWidth(ctx.hud, spec, xbox) + 4, y0 + 2, label, { color: 'white' }); }
      }
      if (touchOnly && app.touchGate) { const ui = app.ui; ui.panel(ui.cx - 110, 90, 220, 26, { color: 'ink', border: 'red' }); ui.text(ui.cx, 99, 'CONTROLLER OR KEYBOARD REQUIRED', { align: 'center', color: 'sand' }); }
      void walls; void state;
    },
  };
  const pending = [], cardRects = { ready: { x: 0, y: 0, w: 0, h: 0 }, more: { x: 0, y: 0, w: 0, h: 0 } };
  const answer = (w) => { if (cardAnswered === w && w === 'ready') return; cardAnswered = w; hub.answer(w); app.mix.sfx('confirm'); };
  app.cardRects = cardRects;
  const scene = new RaceScene(app, setup, opts);
  const engine = await Engine.start(scene, { ...engineOptionsFor(container), settings: { button: false }, seed: info.seed });
  app.bind(engine);
  engine.audio.setVolume('music', 0.1);
  hub.on('card', (c) => { card = c; });
  hub.on('start', () => { started = true; cardAnswered = 'started'; });
  hub.on('message', (data, from) => { const now = performance.now(); if (scene.ghosts) scene.ghosts.receive(data, from, now); else pending.push([data, from]); });
  hub.on('leave', ({ id }) => scene.ghosts?.remove(id));
  hub.on('time-up', () => { if (!done) { done = true; const e = scene.sim.cars[0]; hub.result({ score: Math.floor(Math.max(0, e.progress)), stats: { 'Best lap': e.bestLap ? +e.bestLap.toFixed(2) : 0, 'Top km/h': Math.round(e.topSpeed * 3.6), Walls: e.walls } }); } });
  hub.on('end', () => { ended = true; app.mix.stopAll(); app.inputDead = true; });
  window.addEventListener('keydown', (e) => { if (hub.time() !== -Infinity) return; if (e.code === 'Enter') answer('ready'); if (e.code === 'KeyM') answer('more'); });
  hub.ready();
  void TRACKS; void CAR_INFO; void TITLE;
  return engine;
}
function drawCard(app, scene, ctx, card, info, setup) {
  const ui = app.ui, hud = ctx.hud, dev = app.actions.lastDevice, xbox = app.options.glyphs === 'xbox', W = Math.min(ui.w - 6, 300), H = Math.min(ui.h - 8, 214), x = Math.round(ui.cx - W / 2), y = Math.round((ui.h - H) / 2), chars = Math.floor((W - 12) / 6);
  ui.panel(x, y, W, H, { color: 'ink', border: 'sand' });
  ui.text(ui.cx, y + 6, TITLE, { align: 'center', scale: W >= 200 ? 2 : 1, color: 'sand' });
  let yy = y + 26;
  for (const l of wrapText(`${TRACKS[setup.track].name.toUpperCase()}, ${setup.laps} LAPS, ${CAR_INFO[setup.cars[0].carId].short}`, chars)) { ui.text(ui.cx, yy, l, { align: 'center' }); yy += 9; }
  yy += 3;
  const mapS = W >= 240 ? 60 : 36, m = miniMap(ui, x + 6, yy, setup.track, mapS, 'mist'), px = x + 12 + mapS;
  info.players.forEach((p, k) => { const row = yy + k * 11, ready = card.ready?.includes(p.id), room = Math.floor((x + W - 6 - (px + 11)) / 6) - 6; ui.rect(px, row, 8, 8, SEAT_HUD[k % 4]); ui.text(px + 11, row + 1, safeName(p.name, `P${k + 1}`).slice(0, Math.max(2, room)), { color: 'white' }); ui.text(x + W - 6, row + 1, ready ? 'READY' : '...', { align: 'right', color: ready ? 'lime' : 'slate' }); });
  yy += Math.max(m.h, info.players.length * 11) + 5;
  for (const l of wrapText('LOWEST TIME WINS: SAME CAR, SAME CIRCUIT.', chars)) { ui.text(x + 6, yy, l, { color: 'sand' }); yy += 9; }
  yy += 2; let gx = x + 6;
  for (const [act, label] of [['steer', 'STEER'], ['throttle', 'GO'], ['brake', 'BRAKE']]) { const spec = specFor(act, dev), need = glyphWidth(hud, spec, xbox) + 3 + hud.measure(label).width + 8; if (gx + need > x + W - 4) { gx = x + 6; yy += 13; } const gw = drawGlyph(hud, gx, yy, spec, xbox); ui.text(gx + gw + 3, yy + 2, label, { color: 'mist' }); gx += need; }
  yy += 15;
  const left = card.left; ui.text(ui.cx, yy, card.starting ? 'STARTING' : card.paused ? 'HOLDING: MORE TIME ASKED' : left !== null && left !== undefined ? `${Math.ceil(left / 1000)} S` : '', { align: 'center', color: 'white' });
  const R = app.cardRects, bw = Math.floor((W - 18) / 2), by = y + H - 24; R.ready = { x: x + 6, y: by, w: bw, h: 20 }; R.more = { x: x + 12 + bw, y: by, w: bw, h: 20 };
  const key = dev === 'mouse' ? 'key' : dev, button = (r, label, act) => { ui.rect(r.x, r.y, r.w, r.h, 'night'); const gw = drawGlyph(hud, r.x + 3, r.y + 4, specFor(act, key), xbox); ui.text(r.x + 3 + gw + (r.w - gw - hud.measure(label).width - 3) / 2, r.y + 6, label, { color: 'white' }); };
  button(R.ready, 'READY', 'confirm'); button(R.more, card.asked ? 'TAKE IT BACK' : 'MORE TIME', 'more');
  void scene;
}
