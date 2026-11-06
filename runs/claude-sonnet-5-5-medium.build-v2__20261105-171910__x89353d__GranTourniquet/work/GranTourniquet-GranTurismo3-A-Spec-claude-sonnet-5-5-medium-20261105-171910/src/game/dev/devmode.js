// Dev mode: live sliders with reset, tools, overlays and cheats. Reached from the pause menu, the Map menu, or ?dev=1. Plan section 13.
import { SCREENS } from '../ui/nav.js';
import { App, S, saveProfile, resetProfile, money } from '../app.js';
import { EVENTS, eventById } from '../data/events.js';
import { TESTS } from '../data/licences.js';
import { CAR_IDS } from '../data/cars.js';
import { giveCar, recordTest, startEvent, finishSeries } from '../sim/career.js';
import { MEDALS } from '../data/medals.js';
import { goMenu } from '../scenes/flow.js';
export const SLIDERS = [
  ['grip', 'GRIP', 1, 0.5, 1.5, 0.05], ['power', 'POWER', 1, 0.5, 2, 0.05], ['brake', 'BRAKE STRENGTH', 1, 0.5, 1.5, 0.05], ['downforce', 'DOWNFORCE', 1, 0, 2, 0.1], ['wear', 'TYRE WEAR', 1, 0, 5, 0.25], ['fuel', 'FUEL USE', 1, 0, 5, 0.25],
  ['steer', 'STEERING RATE', 3, 1, 8, 0.25], ['asmK', 'STABILITY STRENGTH', 1, 0, 2, 0.1], ['tcsK', 'TRACTION STRENGTH', 1, 0, 2, 0.1], ['pace', 'AI PACE (0 = EVENT)', 0, 0, 1.05, 0.01], ['rubber', 'AI RUBBER BAND', 0, 0, 0.03, 0.005], ['wall', 'WALL SPEED LOSS', 1, 0, 2, 0.1],
  ['slip', 'SLIPSTREAM', 0.65, 0.4, 1, 0.05], ['prize', 'PRIZE MONEY', 1, 0, 5, 0.25], ['chase', 'CHASE DISTANCE', 8.5, 4, 14, 0.5], ['fov', 'FIELD OF VIEW', 58, 40, 90, 2],
];
const DEF = Object.fromEntries(SLIDERS.map((s) => [s[0], s[2]]));
export const sliderVal = (k) => App.dev.sliders[k] ?? DEF[k];
export function markChanged() { App.dev.changed = SLIDERS.some((s) => Math.abs((App.dev.sliders[s[0]] ?? s[2]) - s[2]) > 1e-6) || !!App.dev.sliders.god; }
export function applyLive(sc) { // push slider values into a running race
  const sim = sc?.sim; if (!sim) return; const d = App.dev.sliders, e = sim.env; e.gripScale = d.grip ?? 1; e.powerScale = d.power ?? 1; e.brakeScale = d.brake ?? 1; e.wearRate = d.god ? 0 : 0.0012 * (d.wear ?? 1) * (sim.setup.wearMul ?? 1); e.fuelRate = d.god ? 0 : 0.0018 * (d.fuel ?? 1); e.wallLoss = d.god ? 0 : d.wall ?? 1; e.slip = d.slip ?? 0.65;
  for (const car of sim.cars) { car.p.clA = (car.p.clA0 ??= car.p.clA) * (d.downforce ?? 1); if (!car.player && d.pace) car.skill = car.baseSkill = d.pace; }
  if (sc.cfg) sc.cfg.devApplied = true;
}
const TABS = ['PHYSICS', 'DRIVER', 'AI AND CAMERA', 'TOOLS', 'OVERLAYS', 'CAREER'];
const GROUPS = [[0, 6], [6, 12], [9, 16]];
function slidersTab(ui, sc, a, b, st) { let y = 52; SLIDERS.slice(a, b).forEach(([k, label, def, mn, mx, step]) => { const v = sliderVal(k); const nv = ui.slider('d' + k, 30, y, ui.W - 60, label, v, mn, mx, step, (x) => (Math.round(x * 1000) / 1000), { def }); if (nv !== v) { App.dev.sliders[k] = nv; markChanged(); applyLive(sc); } y += 20; }); }
SCREENS.dev = (nav, t, ctx, ui, sc) => {
  const st = t.s, A = ui.A, race = !!sc?.sim, p = App.profile; st.tab ??= 0; App.dev.on = true; if (A.tabL) st.tab = (st.tab + TABS.length - 1) % TABS.length; if (A.tabR) st.tab = (st.tab + 1) % TABS.length;
  ui.hud.rect(0, 0, ui.W, ui.H, 'ink'); ui.title('DEV MODE', App.dev.changed ? 'DEFAULTS CHANGED: NOTHING IS SAVED' : 'DEFAULTS'); ui.tabs(TABS, st.tab); const x = 30, w = ui.W - 60; let y = 52;
  if (st.tab === 0) slidersTab(ui, sc, 0, 6); else if (st.tab === 1) slidersTab(ui, sc, 6, 12); else if (st.tab === 2) { slidersTab(ui, sc, 9, 12 > 0 ? 16 : 16); }
  else if (st.tab === 3) { // tools
    if (!race) { ui.text(x, y, 'RACE TOOLS ARE AVAILABLE DURING A RACE.', { color: 'mist' }); ui.item('x', 0, 0, 1, 1); y += 16; }
    else { const car = sc.focus, L = sc.sim.tr.length; st.s ??= Math.round(car.c.loc.s); st.s = ui.slider('tp', x, y, w, 'TELEPORT (S)', st.s, 0, Math.floor(L), 20, (v) => v + ' M'); y += 20; if (ui.button('tpg', x, y, 100, 16, 'GO').pressed) { sc.sim.teleport(car, st.s); } if (ui.button('fin', x + 106, y, 150, 16, 'FINISH NOW P' + (st.pos ??= 1)).pressed) { sc.sim.devFinish(st.pos); nav.pop(); } if (ui.button('pp', x + 262, y, 40, 16, '+1').pressed) st.pos = (st.pos % sc.sim.cars.length) + 1; y += 22; if (ui.button('rst', x, y, 100, 16, 'RESET CAR').pressed) { sc.sim.recover(car); nav.pop(); } if (ui.button('end', x + 106, y, 100, 16, 'END RACE').pressed) { sc.sim.devFinish(car.positionNow); nav.pop(); } if (ui.button('rs', x + 212, y, 100, 16, 'RESTART').pressed) { App.restartRace(sc); } y += 22;
      const TS = [0.25, 0.5, 1, 2, 4]; const ti = Math.max(0, TS.indexOf(ctx.engine.timeScale)); const ni = ui.option('ts', x, y, w, 'TIME SCALE', TS.map((q) => q + 'X'), ti < 0 ? 2 : ti); if (TS[ni] !== ctx.engine.timeScale) ctx.engine.timeScale = TS[ni]; y += 20; const ps = ui.option('pz', x, y, w, 'FREEZE', ['OFF', 'ON'], App.dev.sliders.pause ? 1 : 0); App.dev.sliders.pause = ps === 1; if (App.dev.sliders.pause && ui.button('fs', x + w - 90, y + 20, 90, 16, 'STEP').pressed) { sc.sim.step({ player: { throttle: 0.5 } }, 1 / 60); } y += 40; if (ui.button('sv', x, y, 140, 16, 'SAVE STATE').pressed) { App.dev.state = sc.sim.snapshot(); } if (ui.button('ld', x + 146, y, 140, 16, 'LOAD STATE', { disabled: !App.dev.state }).pressed) { sc.sim.restore(App.dev.state); } }
  } else if (st.tab === 4) {
    const ov = App.dev.overlays ??= {}; [['line', 'RACING LINE AND SPEED'], ['telem', 'TELEMETRY STRIP'], ['wheels', 'WHEEL LOAD AND SLIP'], ['surf', 'SURFACE TINT'], ['coll', 'COLLISION CIRCLES'], ['ai', 'AI TARGETS AND LANES']].forEach(([k, label], i) => { const v = ui.option('o' + k, x, y + i * 20, w, label, ['OFF', 'ON'], ov[k] ? 1 : 0); ov[k] = v === 1; }); y += 6 * 20 + 6; const god = ui.option('god', x, y, w, 'GOD MODE', ['OFF', 'ON'], App.dev.sliders.god ? 1 : 0); App.dev.sliders.god = god === 1; markChanged(); applyLive(sc); y += 20; if (race) { const dbg = ui.option('dbg', x, y, w, 'ENGINE DEBUG PANEL', ['OFF', 'ON'], ctx.engine.debugShown ? 1 : 0); if ((dbg === 1) !== ctx.engine.debugShown) ctx.engine.showDebug(dbg === 1); }
  } else {
    if (ui.button('cr', x, y, 150, 16, 'GIVE 100,000 CR').pressed) { p.credits += 100000; saveProfile(); App.mix?.sfx?.('cash'); } if (ui.button('uc', x + 156, y, 150, 16, 'UNLOCK ALL CARS').pressed) { for (const id of CAR_IDS) if (!p.cars.some((c) => c.carId === id)) giveCar(p, id, { prize: true }); saveProfile(); } y += 20;
    if (ui.button('pt', x, y, 150, 16, 'PASS ALL TESTS GOLD').pressed) { for (const q of TESTS) recordTest(p, q.id, MEDALS[q.id].gold - 0.01); saveProfile(); } if (ui.button('we', x + 156, y, 150, 16, 'WIN ALL EVENTS').pressed) { for (const e of EVENTS) { if (!p.wonEvents.includes(e.id)) { startEvent(p, e.id); p.events[e.id].points = 99; finishSeries(p, e, [0]); } } saveProfile(); } y += 20;
    const hr = ui.slider('hour', x, y, w, 'HOUR OF DAY', App.dev.hour ?? 12, 0, 24, 0.5, (v) => v); if (hr !== (App.dev.hour ?? 12)) { App.dev.hour = hr; if (sc.world) sc.world.setHour(hr); else sc.setHour?.(hr); } y += 20; if (ui.button('ev', x, y, 150, 16, 'JUMP: EVENT HALL').pressed) { while (nav.depth) nav.stack.pop(); goMenu('events', {}); } if (ui.button('jt', x + 156, y, 150, 16, 'JUMP: LICENCES').pressed) { goMenu('licence', {}); } y += 20; if (ui.button('jm', x, y, 150, 16, 'JUMP: MAP').pressed) goMenu('map', {}); if (ui.button('at', x + 156, y, 150, 16, 'START ATTRACT').pressed) { App.startAttract?.(sc); } y += 20; if (ui.button('rsv', x, y, 150, 16, 'RESET THE SAVE').pressed) { if (st.conf) { resetProfile(); goMenu('title', {}); } else st.conf = true; } if (st.conf) ui.text(x + 156, y + 4, 'PRESS AGAIN TO ERASE', { color: 'red' });
  }
  if (st.tab <= 2 && ui.button('rall', x, ui.H - 44, 130, 16, 'RESET ALL').pressed || A.info) { App.dev.sliders = {}; markChanged(); applyLive(sc); App.mix?.sfx?.('confirm'); }
  ui.prompts([['tabs', 'TABS'], ['move', 'CHOOSE'], ['confirm', 'RESET ONE'], ['info', 'RESET ALL'], ['back', 'BACK']]); if (A.back) nav.pop();
};
// Race-time overlays: drawn by RaceScene when enabled in Dev mode.
export function drawDevOverlays(sc, ui) {
  const ov = App.dev.overlays; if (!ov) return; const f = sc.focus, c = f.c, hud = ui.hud, W = ui.W, H = ui.H;
  if (ov.telem) { const y = H - 34; hud.rect(W / 2 - 100, y, 200, 14, 'ink'); ui.text(W / 2 - 96, y + 3, `V ${Math.hypot(c.vx, c.vz).toFixed(1)} T ${f.inp.throttle.toFixed(2)} B ${f.inp.brake.toFixed(2)} AX ${c.ax.toFixed(1)} AY ${c.ay.toFixed(1)}`, { color: 'cyan' }); }
  if (ov.wheels) c.fz.forEach((fz, i) => { const x = W / 2 - 60 + (i % 2) * 70, y = 80 + Math.floor(i / 2) * 22; hud.rect(x, y, 4, 16, 'night'); hud.rect(x, y + 16 - Math.min(16, Math.round(fz / 1500)), 4, Math.min(16, Math.round(fz / 1500)), 'lime'); hud.rect(x + 6, y, 4, 16, 'night'); hud.rect(x + 6, y + 16 - Math.min(16, Math.round(c.use[i] * 10)), 4, Math.min(16, Math.round(c.use[i] * 10)), c.use[i] > 1 ? 'red' : 'sand'); });
  if (ov.surf) ui.text(W / 2 - 30, 80, 'SURFACE ' + c.surface.toUpperCase(), { color: c.onTrack ? 'lime' : 'orange' });
}
