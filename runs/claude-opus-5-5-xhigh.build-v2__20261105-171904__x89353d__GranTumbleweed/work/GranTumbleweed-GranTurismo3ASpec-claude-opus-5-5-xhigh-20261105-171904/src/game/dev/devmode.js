// Dev mode: a pad-friendly panel over the running game. Live sliders, tools, overlays. Sliders stay for the session; Reset clears them.
import { CAR_IDS, CAR_INFO } from '../data/cars.js';
import { EVENT_IDS, EVENTS } from '../data/events.js';
import { TEST_IDS, TESTS, LICENCE_ORDER, LICENCES } from '../data/licences.js';
import { addCar, carEntry, eventState, newProfile, recordRound, recordTest } from '../sim/career.js';
import { defaultEnv, trackPoint } from '../sim/race.js';
import { THREE } from '../../pixel-engine.js';
const { Vector3 } = THREE;
export const SLIDERS = [
  { id: 'gripScale', name: 'GRIP', def: 1, min: 0.5, max: 1.5, step: 0.05, get: (a) => a.env.gripScale, set: (a, v) => { a.env.gripScale = v; } },
  { id: 'powerScale', name: 'POWER', def: 1, min: 0.5, max: 2, step: 0.05, get: (a) => a.env.powerScale, set: (a, v) => { a.env.powerScale = v; } },
  { id: 'brakeScale', name: 'BRAKE STRENGTH', def: 1, min: 0.5, max: 1.5, step: 0.05, get: (a) => a.env.brakeScale, set: (a, v) => { a.env.brakeScale = v; } },
  { id: 'aeroScale', name: 'DOWNFORCE', def: 1, min: 0, max: 2, step: 0.1, get: (a) => a.env.aeroScale, set: (a, v) => { a.env.aeroScale = v; } },
  { id: 'wearScale', name: 'TYRE WEAR', def: 1, min: 0, max: 5, step: 0.25, get: (a) => a.env.wearScale, set: (a, v) => { a.env.wearScale = v; } },
  { id: 'fuelScale', name: 'FUEL USE', def: 1, min: 0, max: 5, step: 0.25, get: (a) => a.env.fuelScale, set: (a, v) => { a.env.fuelScale = v; } },
  { id: 'steerRate', name: 'STEERING RATE', def: 3, min: 1, max: 8, step: 0.25, get: (a) => a.env.steerRate, set: (a, v) => { a.env.steerRate = v; } },
  { id: 'stability', name: 'STABILITY STRENGTH', def: 1, min: 0, max: 2, step: 0.1, get: (a) => a.env.stability, set: (a, v) => { a.env.stability = v; } },
  { id: 'traction', name: 'TRACTION STRENGTH', def: 1, min: 0, max: 2, step: 0.1, get: (a) => a.env.traction, set: (a, v) => { a.env.traction = v; } },
  { id: 'aiPace', name: 'AI PACE', def: 0, min: 0, max: 1.05, step: 0.01, get: (a) => a.env.aiPace ?? 0, set: (a, v) => { a.env.aiPace = v < 0.7 ? null : v; }, fmt: (v) => (v < 0.7 ? 'EVENT' : v.toFixed(2)) },
  { id: 'rubber', name: 'AI RUBBER BAND', def: 0, min: 0, max: 0.03, step: 0.002, get: (a) => a.env.rubber, set: (a, v) => { a.env.rubber = v; }, fmt: (v) => v.toFixed(3) },
  { id: 'wallLoss', name: 'WALL SPEED LOSS', def: 1, min: 0, max: 2, step: 0.1, get: (a) => a.env.wallLoss, set: (a, v) => { a.env.wallLoss = v; } },
  { id: 'slip', name: 'SLIPSTREAM', def: 0.65, min: 0.4, max: 1, step: 0.05, get: (a) => a.env.slip, set: (a, v) => { a.env.slip = v; } },
  { id: 'prize', name: 'PRIZE MONEY', def: 1, min: 0, max: 5, step: 0.25, get: (a) => a.prizeMult ?? 1, set: (a, v) => { a.prizeMult = v; } },
  { id: 'chase', name: 'CHASE DISTANCE', def: 8.5, min: 4, max: 14, step: 0.5, get: (a) => a.devSliders?.chase ?? 8.5, set: (a, v) => { (a.devSliders ??= { fov: 58 }).chase = v; if (a.scene?.chase) a.scene.chase.distance = v; } },
  { id: 'fov', name: 'CHASE FOV', def: 58, min: 40, max: 90, step: 2, get: (a) => a.devSliders?.fov ?? 58, set: (a, v) => { (a.devSliders ??= { chase: 8.5 }).fov = v; if (a.scene?.chase) a.scene.chase.fovBase = v; }, fmt: (v) => v.toFixed(0) },
];
const PER = 7;
const TABS = ['SLIDERS', 'RACE', 'VIEW', 'WEATHER', 'CAREER', 'JUMP'];
const SCALES = [0.25, 0.5, 1, 2, 4];
export const newDevState = () => ({ overlays: { line: false, load: false, surface: false, circles: false, ai: false, telemetry: false }, freeCam: false, tele: [], savedState: null });
export function devDirty(app) { for (const s of SLIDERS) { const v = s.get(app); if (Math.abs(v - s.def) > 1e-6) return true; } return !!app.env.god; }
export class DevPanel {
  constructor(app, scene) { this.id = 'dev'; this.app = app; this.scene = scene; this.tab = 0; this.page = 0; app.dev = app.dev ?? newDevState(); }
  draw(ui) {
    const app = this.app, w = Math.min(ui.w - 12, 380), x = Math.round(ui.cx - w / 2), h = ui.h - 22;
    ui.panel(x, 3, w, h, { color: 'ink', border: 'red', scan: false });
    ui.text(x + 6, 7, 'DEV MODE', { color: 'red' }); if (devDirty(app)) ui.text(x + w - 6, 7, 'RECORDS ARE OFF', { align: 'right', color: 'orange' });
    ui.tabs('t', x + 3, 17, w - 6, TABS, this.tab, (i) => { this.tab = i; this.focus = null; this.page = 0; ui.box.ready = false; });
    const fn = [this.sliders, this.race, this.view, this.weather, this.career, this.jump][this.tab]; fn.call(this, ui, x + 5, 33, w - 10);
  }
  btn(ui, id, x, y, w, label, fn, o = {}) { ui.button(id, x, y, w, 15, label, { ...o, confirm: fn }); }
  sliders(ui, x, y, w) {
    const app = this.app, pages = Math.ceil(SLIDERS.length / PER), list = SLIDERS.slice(this.page * PER, this.page * PER + PER);
    list.forEach((s, k) => ui.slider(s.id, x, y + k * 18, w, 15, s.name, s.get(app), s.min, s.max, { step: s.step, set: (v) => { s.set(app, Math.round(v / s.step) * s.step); app.devDirty = devDirty(app); }, reset: () => { s.set(app, s.def); app.devDirty = devDirty(app); }, format: s.fmt ?? ((v) => v.toFixed(2)) }));
    const by = y + PER * 18 + 2, bw = (w - 6) / 2;
    this.btn(ui, 'pageNext', x, by, bw, `MORE SLIDERS ${this.page + 1}/${pages}`, () => { this.page = (this.page + 1) % pages; this.focus = null; ui.box.ready = false; });
    this.btn(ui, 'resetAll', x + bw + 6, by, bw, 'RESET ALL', () => this.resetAll());
    ui.prompts([['moveX', 'ADJUST'], ['confirm', 'RESET ONE'], ['info', 'RESET ALL'], ['tabs', 'TAB'], ['back', 'CLOSE']]);
  }
  onInfo() { if (this.tab === 0) this.resetAll(); }
  resetAll() { const app = this.app, d = defaultEnv(); Object.assign(app.env, d); app.prizeMult = 1; app.devSliders = null; if (app.scene?.chase) { app.scene.chase.distance = null; app.scene.chase.fovBase = 58; } app.devDirty = false; app.ui.note('ALL SLIDERS AT THEIR DEFAULTS.'); }
  race(ui, x, y, w) {
    const app = this.app, s = app.scene, sim = s?.sim, bw = (w - 6) / 2;
    if (!sim) { ui.lines(x + 2, y + 2, 'THESE TOOLS WORK DURING A DRIVE. OPEN DEV MODE FROM THE PAUSE MENU.', { chars: 50, color: 'mist' }); this.btn(ui, 'quick', x, y + 26, w, 'START A TEST RACE NOW', () => app.startQuick({ track: 'kestrel', carId: 'ginga', laps: 2, field: 6, difficulty: 'normal' })); ui.prompts([['confirm', 'CHOOSE'], ['tabs', 'TAB'], ['back', 'CLOSE']]); return; }
    const me = s.focusE ?? sim.cars[0], L = sim.tr.length;
    const f = ui.item('teleport', x, y, w, 15, { onX: (d) => { const k = (me.c.loc.s + d * 80 + L) % L; sim.teleport(me.i, k); s.chase?.snap(); app.mix.sfx('tick'); }, confirm: () => sim.teleport(me.i, 0) }); ui.rect(x, y, w, 15, f ? 'navy' : 'night'); ui.text(x + 6, y + 4, 'TELEPORT ALONG THE TRACK', { color: f ? 'white' : 'mist' }); ui.text(x + w - 6, y + 4, `< ${Math.round(me.c.loc.s)} M >`, { align: 'right', color: 'sand' });
    const pos = this.finishPos ?? 1;
    const f2 = ui.item('finish', x, y + 18, w, 15, { onX: (d) => { this.finishPos = Math.max(1, Math.min(sim.cars.length, pos + d)); }, confirm: () => { ui.pop(); ui.pop(); sim.finishNow(me.i, pos); } }); ui.rect(x, y + 18, w, 15, f2 ? 'navy' : 'night'); ui.text(x + 6, y + 22, 'FINISH NOW IN POSITION', { color: f2 ? 'white' : 'mist' }); ui.text(x + w - 6, y + 22, `< ${pos} >`, { align: 'right', color: 'sand' });
    this.btn(ui, 'end', x, y + 36, bw, 'END RACE', () => { ui.pop(); ui.pop(); sim.finishNow(me.i, sim.cars.length); });
    this.btn(ui, 'restart', x + bw + 6, y + 36, bw, 'RESTART', () => app.restartRun(s));
    this.btn(ui, 'reset', x, y + 54, bw, 'RESET CAR', () => sim.recover(me.i));
    this.btn(ui, 'god', x + bw + 6, y + 54, bw, `GOD MODE: ${app.env.god ? 'ON' : 'OFF'}`, () => { app.env.god = !app.env.god; app.devDirty = devDirty(app); });
    const cur = SCALES.indexOf(app.engine.timeScale);
    const f3 = ui.item('scale', x, y + 72, w, 15, { onX: (d) => { const n = SCALES[Math.max(0, Math.min(SCALES.length - 1, (cur < 0 ? 2 : cur) + d))]; app.engine.timeScale = n; }, confirm: () => { app.engine.timeScale = 1; } }); ui.rect(x, y + 72, w, 15, f3 ? 'navy' : 'night'); ui.text(x + 6, y + 76, 'TIME SCALE', { color: f3 ? 'white' : 'mist' }); ui.text(x + w - 6, y + 76, `< ${app.engine.timeScale} >`, { align: 'right', color: 'sand' });
    this.btn(ui, 'frame', x, y + 90, bw, 'STEP ONE FRAME', () => { s.stepFrames = 1; });
    this.btn(ui, 'saveState', x + bw + 6, y + 90, bw, 'SAVE STATE', () => { app.dev.savedState = sim.saveState(); ui.note('STATE SAVED.'); });
    this.btn(ui, 'loadState', x, y + 108, bw, 'LOAD STATE', () => { if (app.dev.savedState) { sim.loadState(app.dev.savedState); s.chase?.snap(); ui.note('STATE LOADED.'); } else ui.note('NOTHING SAVED YET.'); });
    this.btn(ui, 'changeCar', x + bw + 6, y + 108, bw, 'CHANGE CAR', () => { const d = s.data, i = d.cars.findIndex((c) => c.player === 0); if (i < 0) return; const n = CAR_IDS[(CAR_IDS.indexOf(d.cars[i].carId) + 1) % CAR_IDS.length], patch = { ...d, cars: d.cars.map((c, k) => (k === i ? { ...c, carId: n, install: null } : c)) }; app.restartWith(s, patch); });
    ui.prompts([['confirm', 'DO IT'], ['moveX', 'ADJUST'], ['tabs', 'TAB'], ['back', 'CLOSE']]);
  }
  view(ui, x, y, w) {
    const app = this.app, o = app.dev.overlays, bw = (w - 6) / 2, tog = (id, label, on, fn, i) => this.btn(ui, id, x + (i % 2) * (bw + 6), y + Math.floor(i / 2) * 18, bw, `${label}: ${on ? 'ON' : 'OFF'}`, fn);
    [['line', 'RACING LINE'], ['load', 'WHEEL LOAD, SLIP'], ['surface', 'SURFACE TINT'], ['circles', 'COLLISION CIRCLES'], ['ai', 'AI TARGETS'], ['telemetry', 'TELEMETRY']].forEach(([k, label], i) => tog(k, label, o[k], () => { o[k] = !o[k]; if (k === 'line' && app.scene) app.scene.lineOn = o[k]; }, i));
    tog('freeCam', 'FREE CAMERA', app.dev.freeCam, () => { app.dev.freeCam = !app.dev.freeCam; if (app.dev.freeCam) app.dev.driveFreeCam = driveFreeCam; }, 6);
    tog('panel', 'ENGINE DEBUG PANEL', !!app.engine.debugShown, () => app.engine.showDebug(!app.engine.debugShown), 7);
    ui.prompts([['confirm', 'TOGGLE'], ['tabs', 'TAB'], ['back', 'CLOSE']]);
  }
  weather(ui, x, y, w) {
    const app = this.app, s = app.scene, d = s?.data, bw = (w - 6) / 2;
    if (!d) { ui.lines(x + 2, y + 2, 'THE WEATHER CHANGES ONLY ON THE CIRCUIT. IT IS ALWAYS SOMETHING ON THE PENINSULA.', { chars: 50, color: 'mist' }); ui.prompts([['tabs', 'TAB'], ['back', 'CLOSE']]); this.btn(ui, 'attract', x, y + 28, w, 'START ATTRACT MODE NOW', () => app.attract?.start()); return; }
    this.hour = this.hour ?? d.hour ?? 12;
    const f = ui.item('hour', x, y, w, 15, { onX: (k) => { this.hour = (this.hour + k + 24) % 24; s.world?.setHourIf(this.hour); }, confirm: () => app.restartWith(s, { ...d, hour: this.hour }) }); ui.rect(x, y, w, 15, f ? 'navy' : 'night'); ui.text(x + 6, y + 4, 'HOUR OF DAY (CONFIRM RESTARTS WITH LAMPS)', { color: f ? 'white' : 'mist' }); ui.text(x + w - 6, y + 4, `< ${this.hour} >`, { align: 'right', color: 'sand' });
    this.btn(ui, 'rain', x, y + 18, bw, `RAIN: ${d.rain ? 'ON' : 'OFF'}`, () => app.restartWith(s, { ...d, rain: !d.rain }));
    const n = d.cars.length;
    const f2 = ui.item('fieldSize', x + bw + 6, y + 18, bw, 15, { onX: (k) => { this.field = Math.max(1, Math.min(8, (this.field ?? n) + k)); }, confirm: () => { const m = this.field ?? n, me = d.cars.filter((c) => c.player !== null && c.player !== undefined), others = d.cars.filter((c) => c.player === null || c.player === undefined); const pool = others.length ? others : [{ carId: me[0]?.carId ?? 'ginga', name: 'T. HOLLIS', skill: 0.9 }]; const list = []; for (let i = 0; i < m - me.length; i++) list.push({ ...pool[i % pool.length], name: `AI ${i + 1}` }); app.restartWith(s, { ...d, cars: [...list, ...me] }); } }); ui.rect(x + bw + 6, y + 18, bw, 15, f2 ? 'navy' : 'night'); ui.text(x + bw + 12, y + 22, `FIELD < ${this.field ?? n} >`, { color: f2 ? 'white' : 'mist' });
    this.btn(ui, 'attract', x, y + 36, w, 'START ATTRACT MODE NOW', () => app.attract?.start());
    ui.prompts([['confirm', 'APPLY'], ['moveX', 'ADJUST'], ['tabs', 'TAB'], ['back', 'CLOSE']]);
  }
  career(ui, x, y, w) {
    const app = this.app, p = app.profile, bw = (w - 6) / 2;
    this.btn(ui, 'credits', x, y, bw, 'GIVE 100,000 CR', () => { p.credits += 100000; app.save(); ui.note('100,000 CR GIVEN.'); });
    this.btn(ui, 'cars', x + bw + 6, y, bw, 'UNLOCK ALL CARS', () => { for (const id of CAR_IDS) if (!p.cars.some((c) => c.carId === id)) addCar(p, id, { prize: CAR_INFO[id].where === 'prize' }); if (p.current === null) p.current = p.cars[0].uid; app.save(); ui.note('ALL FOURTEEN IN THE GARAGE.'); });
    this.btn(ui, 'gold', x, y + 18, bw, 'ALL TESTS AT GOLD', () => { for (const id of TEST_IDS) recordTest(p, id, TESTS[id].medals.gold - 0.01); app.save(); ui.note('EVERY LICENCE HELD, AT GOLD.'); });
    this.btn(ui, 'winEvent', x + bw + 6, y + 18, bw, 'WIN THE CURRENT EVENT', () => { const id = app.scene?.data?.event ?? EVENT_IDS.find((k) => !p.events[k]?.won) ?? 'gp', e = EVENTS[id]; let last = null; const st = eventState(p, id); for (let i = st.round; i < e.rounds.length; i++) last = recordRound(p, id, ['YOU', 'R. OKADA'], 'YOU'); app.save(); ui.note(`${e.name} WON${last?.prizeCar ? `: ${CAR_INFO[last.prizeCar].short}` : ''}.`); });
    this.btn(ui, 'resetSave', x, y + 36, w, 'RESET THE SAVE', () => { app.profile = newProfile(); app.save(); if (app.profile && app.toTitle) app.toTitle(); });
    ui.text(x + 2, y + 56, `CREDITS ${p.credits.toLocaleString('en-US')}`, { color: 'mist' }); ui.text(x + 2, y + 66, `CURRENT CAR ${carEntry(p) ? CAR_INFO[carEntry(p).carId].short : 'NONE'}`, { color: 'mist' });
    ui.prompts([['confirm', 'DO IT'], ['tabs', 'TAB'], ['back', 'CLOSE']]);
    void LICENCE_ORDER; void LICENCES;
  }
  jump(ui, x, y, w) {
    const app = this.app; const list = [...EVENT_IDS.map((id) => ({ id: `ev-${id}`, label: `EVENT: ${EVENTS[id].name}`, go: () => app.startEventRound(id) })), ...TEST_IDS.map((id) => ({ id: `t-${id}`, label: `TEST ${id}: ${TESTS[id].title}`, go: () => app.startTest(id) })), ...['map', 'dealer', 'tuning', 'service', 'garage', 'museum', 'theatre', 'arcade'].map((id) => ({ id: `m-${id}`, label: `MENU: ${id.toUpperCase()}`, go: () => app.jumpMenu(id) }))];
    const pages = Math.ceil(list.length / PER); list.slice(this.page * PER, this.page * PER + PER).forEach((it, k) => this.btn(ui, it.id, x, y + k * 18, w, it.label, () => { if (app.profile.cars.length === 0 && !it.id.startsWith('m-')) addCar(app.profile, 'kite'); ui.clear(); it.go(); }, { left: true }));
    this.btn(ui, 'pageNext', x, y + PER * 18 + 2, w, `MORE ${this.page + 1}/${pages}`, () => { this.page = (this.page + 1) % pages; this.focus = null; ui.box.ready = false; });
    ui.prompts([['confirm', 'GO'], ['tabs', 'TAB'], ['back', 'CLOSE']]);
  }
}
const FV = new Vector3();
function driveFreeCam(ctx, dt, cam) { // WASD or the left stick moves, the right stick or a right drag looks
  const input = ctx.input, a = FV; this._y = this._y ?? 0;
  let mx = 0, mz = 0, my = 0, lx = 0, ly = 0;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz += 1; if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz -= 1; if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1; if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1; if (input.isDown('KeyE')) my += 1; if (input.isDown('KeyQ')) my -= 1;
  const app = ctx.engine.game?.app; for (const p of app?.actions.pads ?? []) { mx += p.axes[0]; mz -= p.axes[1]; lx += p.axes[2]; ly += p.axes[3]; }
  if (input.isDown('MouseRight')) { lx += (input.mouseDelta.x ?? 0) * 0.3; ly += (input.mouseDelta.y ?? 0) * 0.3; }
  cam.rotation.order = 'YXZ'; cam.rotation.y -= lx * dt * 2; cam.rotation.x = Math.max(-1.4, Math.min(1.4, cam.rotation.x - ly * dt * 2));
  a.set(mx, my, -mz).multiplyScalar(dt * 24).applyEuler(cam.rotation); cam.position.add(a);
}
const P = new Vector3();
// Overlays, drawn over the HUD.
export function drawOverlays(ui, app, scene) {
  const dev = app.dev; if (!dev) return; const o = dev.overlays, sim = scene.sim, cam = scene.cam, me = scene.focusE; if (!sim || !me) return;
  const project = (x, y, z) => { P.set(x, y, z).project(cam); return P.z < 1 ? [(P.x + 1) * 0.5 * ui.w, (1 - P.y) * 0.5 * ui.h] : null; };
  const c = me.c;
  if (o.load) { const bx = ui.w - 96, by = 60; ui.panel(bx - 3, by - 3, 96, 52, { color: 'ink', border: false, scan: true }); for (let i = 0; i < 4; i++) { const load = c.fz[i] / (c.p.mass * 9.81 * 0.5), slip = Math.min(1.6, c.use[i]) / 1.6; ui.text(bx, by + i * 12, ['FL', 'FR', 'RL', 'RR'][i], { color: 'mist' }); ui.bar(bx + 16, by + i * 12, 34, 4, load, 'sky', 'night'); ui.bar(bx + 54, by + i * 12, 34, 4, slip, slip > 0.8 ? 'red' : 'lime', 'night'); } }
  if (o.surface) { const col = { asphalt: 'slate', kerb: 'red', grass: 'green', gravel: 'orange', dirt: 'orange', apron: 'mist' }[c.surface] ?? 'white'; ui.rect(0, 0, ui.w, 2, col); ui.rect(0, ui.h - 2, ui.w, 2, col); ui.text(ui.cx, 8, `SURFACE: ${c.surface.toUpperCase()}`, { align: 'center', color: col }); }
  if (o.circles) for (const e of sim.cars) { for (const off of [-1.35, 0, 1.35]) { const cx = e.c.x + Math.sin(e.c.yaw) * off, cz = e.c.z + Math.cos(e.c.yaw) * off; for (let a = 0; a < 12; a++) { const t = (a / 12) * 6.283, q = project(cx + Math.sin(t) * 0.875, e.c.y + 0.3, cz + Math.cos(t) * 0.875); if (q) ui.rect(q[0], q[1], 1, 1, e === me ? 'lime' : 'red'); } } }
  if (o.ai) for (const e of sim.cars) { if (e.player !== null && !e.autoDrive) continue; const u = Math.hypot(e.c.vx, e.c.vz), idx = (e.c.loc.i + Math.round(Math.max(7, u * 0.62) / sim.tr.ds)) % sim.tr.N, tr = sim.tr, rx = -tr.tz[idx], rz = tr.tx[idx], lane = e.c.laneNow ?? 0, q = project(sim.line.px[idx] + rx * lane, tr.y[idx] + 0.3, sim.line.pz[idx] + rz * lane); if (q) { ui.rect(q[0] - 1, q[1] - 1, 3, 3, 'cyan'); } const n = project(e.c.x, e.c.y + 1.7, e.c.z); if (n) ui.text(n[0], n[1] - 8, `${(e.speeds[e.c.loc.i] * 3.6).toFixed(0)}`, { align: 'center', color: 'cyan' }); }
  if (o.line) { const i = c.loc.i; ui.text(ui.cx, 16, `LINE WANTS ${(me.speeds[i] * 3.6).toFixed(0)} KM/H`, { align: 'center', color: 'lime' }); }
  if (o.telemetry) {
    const T = dev.tele; T.push([Math.abs(c.u) / 90, me.inp?.throttle ?? 0, me.inp?.brake ?? 0, 0.5 + c.ax / 40, 0.5 + c.ay / 40]); if (T.length > 200) T.shift();
    const x0 = ui.cx - 100, y0 = ui.h - 52, H = 26; ui.panel(x0 - 2, y0 - 2, 204, H + 4, { color: 'ink', border: false }); const cols = ['white', 'lime', 'red', 'sky', 'sand']; T.forEach((v, k) => { for (let n = 0; n < 5; n++) ui.rect(x0 + k, y0 + H - Math.round(Math.max(0, Math.min(1, v[n])) * H), 1, 1, cols[n]); });
    ui.text(x0, y0 - 10, 'SPD THR BRK AX AY', { color: 'mist' });
  }
  void trackPoint;
}
