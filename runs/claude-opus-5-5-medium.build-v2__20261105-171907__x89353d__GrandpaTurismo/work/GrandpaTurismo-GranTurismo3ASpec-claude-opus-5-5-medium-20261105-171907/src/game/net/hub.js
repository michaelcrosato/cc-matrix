// AI Hub session: ghost mode. Every copy runs its own physics; others are drawn as ghosts through a 150 ms buffer.
import { Engine, withUrlOptions, THREE, PALETTE } from '../../pixel-engine.js';
import { RaceScene } from '../scenes/race.js';
import { hubRoundSetup, SEAT_COLORS } from '../sim/setups.js';
import { CarView } from '../render/carview.js';
import { fmtTime, clean } from '../ui/ui.js';
import { CONTROLS_TEXT } from '../data/text.js';
import { TRACKS } from '../data/tracks.js';
import { CARS } from '../data/cars.js';
import { drawMap } from '../ui/racehud.js';
import { TITLE } from '../data/meta.js';
import { scr } from '../ui/screens/common.js';
const { Vector3 } = THREE;
export class Session {
  constructor(app, hub, info) { this.app = app; this.hub = hub; this.info = info; this.card = { left: null, ready: [], asking: 0, asked: false, starting: false, paused: false }; this.started = false; this.finishedDone = false; this.ghosts = new Map(); this.lastSend = 0; this.over = false; this.lastPad = {}; this.onKey = (e) => this.key(e); this.tagV = new Vector3(); }
  get me() { return this.info.me; }
  wire() {
    const h = this.hub;
    h.on('card', (c) => (this.card = c)); h.on('start', () => { this.started = true; });
    h.on('message', (d, from) => this.receive(d, from)); h.on('leave', ({ id }) => this.remove(id));
    h.on('time-up', () => this.timeUp()); h.on('end', () => this.end());
    addEventListener('keydown', this.onKey);
    addEventListener('pointerdown', (e) => this.pointer(e));
  }
  key(e) { if (this.hub.time() !== -Infinity) return; if (e.code === 'Enter') this.hub.answer('ready'); if (e.code === 'KeyM') this.hub.answer('more'); }
  pointer(e) { if (this.hub.time() !== -Infinity) return; const y = e.clientY / innerHeight, x = e.clientX / innerWidth; if (y > 0.74 && y < 0.92) { if (x < 0.5) this.hub.answer('ready'); else this.hub.answer('more'); } }
  /** Per frame from RaceScene.afterStep: lights, ghost send, progress. */
  tick(sim) {
    const h = this.hub, t = h.time(), me = sim.player, scene = this.app.scene;
    if (!this.started) return;
    if (t < 0) { const n = Math.min(3, Math.floor(t / 1000) + 4); if (n !== this.lights) { this.lights = n; if (n > 0) this.app.mix.play('beepLow'); } sim.lights = Math.max(0, n); sim.phase = 'lights'; return; }
    if (!sim.green) sim.go();
    const now = performance.now();
    if (now - this.lastSend >= 100 && !this.over) {
      this.lastSend = now; const r = (v) => Math.round(v * 10) / 10;
      h.send({ t: 'g', a: sim.setup.track, x: r(me.x), y: r(me.y), z: r(me.z), yaw: Math.round(me.yaw * 100) / 100, v: r(me.u), s: Math.round(me.loc.s), lap: me.lap, steer: Math.round(me.delta * 100) / 100, br: (me.lastInp?.brake ?? 0) > 0.1 ? 1 : 0 }, { reliable: false });
      const metres = Math.max(0, sim.metresOf(me)); this.metres = metres;
      if (!this.finishedDone) h.progress({ score: Math.floor(metres), label: me.lap === 0 ? 'GRID' : `LAP ${Math.min(me.lap, sim.laps)}/${sim.laps} P${this.place(sim, metres)}` });
    }
    void scene;
  }
  place(sim, metres) { let p = 1; for (const g of this.ghosts.values()) { const m = g.lap > 0 ? (g.lap - 1) * sim.tr.length + g.s : 0; if (m > metres) p++; } return p; }
  receive(d, from) { if (d?.t === 'g') { let g = this.ghosts.get(from); if (!g) { g = { id: from, buf: [], view: null, lap: 0, s: 0 }; this.ghosts.set(from, g); } g.buf.push({ at: performance.now(), ...d }); if (g.buf.length > 20) g.buf.shift(); g.lap = d.lap; g.s = d.s; g.a = d.a; } if (d?.t === 'done') { const g = this.ghosts.get(from); if (g) g.done = d.time; } }
  remove(id) { const g = this.ghosts.get(id); g?.view?.dispose(); this.ghosts.delete(id); }
  finished(e) { if (this.finishedDone) return; this.finishedDone = true; const sim = this.app.scene.sim, me = sim.player, stats = { 'Best lap': isFinite(me.bestLap) ? Math.round(me.bestLap * 100) / 100 : 0, 'Top km/h': Math.round(me.topSpeed * 3.6), Walls: me.walls }, awards = me.walls === 0 ? [{ title: 'NO WALLS', detail: 'The barriers were not disturbed.' }] : []; this.hub.result({ time: Math.round(this.hub.time()), stats, awards }); this.hub.send({ t: 'done', time: e.time }); void e; }
  timeUp() { if (this.finishedDone) return; this.finishedDone = true; const sim = this.app.scene?.sim, me = sim?.player; this.hub.result({ score: Math.floor(Math.max(0, me ? sim.metresOf(me) : 0)), stats: me ? { 'Top km/h': Math.round(me.topSpeed * 3.6), Walls: me.walls } : {} }); }
  end() { this.over = true; removeEventListener('keydown', this.onKey); this.app.mix.stopEverything(); this.app.frozenInput = true; if (this.app.scene) this.app.scene.frozen = true; }
  /** After your own finish the camera follows the first ghost still racing. */
  followPos() { if (!this.finishedDone) return null; for (const g of this.ghosts.values()) if (g.pos && g.done == null) return g.pos; return null; }
  toggleMenu() { const ui = this.app.ui; if (ui.top?.id === 'sessionmenu' ) { ui.pop(); return; } if (!ui.top) ui.push(SessionMenu()); }
  // ---- draw ghosts in the scene
  drawGhosts(scene, dt) {
    const now = performance.now() - 150, ctx = scene.ctx, carId = scene.sim.player.carId;
    for (const g of this.ghosts.values()) {
      if (g.a && g.a !== scene.rs.track) continue;
      if (!g.view) { const seat = this.info.players.find((p) => p.id === g.id), col = seat?.color ? parseInt(seat.color.slice(1), 16) : PALETTE[SEAT_COLORS[g.id % 4]]; g.view = new CarView(carId, null, { ghost: col }); ctx.scene.add(g.view.root); g.name = clean(seat?.name ?? `P${g.id + 1}`) || `P${g.id + 1}`; if (/[^A-Z0-9 .,'-]/.test(g.name)) g.name = `P${g.id + 1}`; g.colorName = SEAT_COLORS[g.id % 4]; }
      const b = g.buf; if (!b.length) continue; let a = b[0], c = b[b.length - 1]; for (let i = 0; i < b.length - 1; i++) if (b[i].at <= now && b[i + 1].at >= now) { a = b[i]; c = b[i + 1]; break; }
      const f = c.at > a.at ? Math.max(0, Math.min(1, (now - a.at) / (c.at - a.at))) : 1; let dy = c.yaw - a.yaw; if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI;
      g.pos = { x: a.x + (c.x - a.x) * f, y: a.y + (c.y - a.y) * f, z: a.z + (c.z - a.z) * f, yaw: a.yaw + dy * f, u: c.v, delta: c.steer, brake: !!c.br, s: c.s };
      g.view.pose(g.pos, dt, null);
    }
  }
  /** Name tags and the card. */
  drawOver(scene, ctx) {
    const hud = ctx.hud, cam = ctx.camera.camera; cam.updateMatrixWorld();
    for (const g of this.ghosts.values()) { if (!g.pos || !g.view) continue; const v = this.tagV.set(g.pos.x, g.pos.y + 1.9, g.pos.z).project(cam); if (v.z < 1 && v.z > -1) { const x = Math.round(((v.x + 1) / 2) * hud.width), y = Math.round(((1 - v.y) / 2) * hud.height); hud.text(x - g.name.length * 3, y, g.name, { color: g.colorName }); } }
    if (this.hub.time() === -Infinity || !this.started) this.drawCard(scene, ctx);
    if (this.touchBlocked()) { hud.rect(hud.width / 2 - 120, 110, 240, 20, 'ink'); hud.text(hud.width / 2 - 93, 116, 'CONTROLLER OR KEYBOARD REQUIRED', { color: 'sand' }); }
  }
  touchBlocked() { return this.app.touchGate(); }
  drawCard(scene, ctx) {
    const hud = ctx.hud, W = hud.width, H = hud.height, s = scene.rs, c = this.card, cx = W / 2, a = this.app.actions, dev = a.device === 'pad' ? 'pad' : 'kb';
    hud.rect(cx - 170, 14, 340, 226, 'ink'); hud.text(cx - (TITLE.length * 12) / 2, 22, TITLE, { scale: 2, color: 'sand' });
    hud.text(cx - 160, 44, clean(`${TRACKS[s.track].name}. ${s.laps} LAPS. ${CARS[s.hubCar].shortName}${s.rain ? '. RAIN' : ''}`), { color: 'white' });
    hud.text(cx - 160, 56, 'LOWEST TIME WINS: SAME CAR, SAME TRACK.', { color: 'lime' });
    this.info.players.forEach((p, i) => { const col = SEAT_COLORS[p.id % 4], name = /^[\x20-\x7e]+$/.test(p.name ?? '') ? clean(p.name).slice(0, 14) : `P${p.id + 1}`; hud.rect(cx - 160, 70 + i * 12, 8, 8, col); hud.text(cx - 148, 71 + i * 12, name, { color: 'white' }); hud.text(cx - 40, 71 + i * 12, (c.ready ?? []).includes(p.id) ? 'READY' : '...', { color: (c.ready ?? []).includes(p.id) ? 'lime' : 'mist' }); });
    if (scene.map) drawMap(hud, scene.map, cx + 96, 68, [], null);
    CONTROLS_TEXT[dev].forEach((l, i) => hud.text(cx - 160, 124 + i * 10, l, { color: 'white' }));
    const left = c.left == null ? (c.starting ? 'STARTING' : c.paused ? 'HELD' : '') : `${Math.ceil(c.left / 1000)} S`; hud.text(cx + 100, 44, left, { color: 'sand' });
    hud.rect(cx - 160, 190, 150, 30, c.asked ? 'night' : 'navy'); hud.text(cx - 148, 202, dev === 'pad' ? 'CROSS: READY' : 'ENTER: READY', { color: (c.ready ?? []).includes(this.me) ? 'lime' : 'white' });
    hud.rect(cx + 10, 190, 150, 30, c.asked ? 'plum' : 'navy'); hud.text(cx + 20, 202, dev === 'pad' ? 'TRIANGLE: MORE TIME' : 'M: MORE TIME', { color: c.asked ? 'sand' : 'white' }); if (c.asking) hud.text(cx + 20, 180, `${c.asking} ASKED FOR TIME`, { color: 'mist' });
    if (a.pressed('confirm')) this.hub.answer('ready'); if (a.pressed('info')) this.hub.answer('more');
  }
}
const SessionMenu = () => scr('sessionmenu', { overlay: true, draw(ui) { const app = ui.app; ui.panel(ui.cx - 80, 60, 160, 92, 'ink', 'slate'); ui.center(66, 'THE ROUND GOES ON', { color: 'sand' }); [['sound', 'SOUND AND BUTTONS'], ['handbook', 'HANDBOOK'], ['resume', 'BACK']].forEach(([id, l], i) => { if (ui.button(id, ui.cx - 70, 80 + i * 22, 140, 18, l)) { if (id === 'sound') ui.push(app.screens.Settings()); if (id === 'handbook') ui.push(app.screens.Handbook()); if (id === 'resume') ui.pop(); } }); if (ui.backHit) { ui.backHit = false; ui.pop(); } ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]); } });
export async function startHub(app, hub, container) {
  const info = await hub.connect({ mode: 'ghost', seats: [1, 4], card: true });
  if (!info) return null;
  const session = new Session(app, hub, info); app.session = session; session.wire();
  const setup = hubRoundSetup(hub.rng('round'), info.players); setup.seed = info.seed;
  try {
    const engine = await Engine.start(new RaceScene(app, setup), withUrlOptions(app.engineOptions(container, { seed: info.seed })));
    app.engine = engine; hub.ready();
    return engine;
  } catch (e) { hub.fail(`This game needs WebGPU: ${e?.message ?? e}`); throw e; }
}
void fmtTime;
