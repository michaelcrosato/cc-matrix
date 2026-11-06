// Tuning Street: eight tiles, four to a page; then the parts in a tile, with an effect in plain words and a before/after number.
// A Setup tab holds the sliders for what you own. Buying an engine part shows a dyno pull.
import { CAR_INFO } from '../../data/cars.js';
import { PAINT_PRICE, PART_IDS, PARTS, RIM_PRICE, SETUP_SLIDERS, TILES } from '../../data/parts.js';
import { LINES } from '../../data/text.js';
import { TYRE_IDS, TYRES } from '../../data/tyres.js';
import { PAINTS, RIM_STYLES } from '../../data/meta.js';
import { buyPaint, buyPart, buyRims, buyTyre, carEntry, setSetup } from '../../sim/career.js';
import { dynoCurve, hasPart, setupValue, sliderAvailable, specOf } from '../../sim/tuning.js';
import { engineData } from '../../audio/mix.js';
import { cr, specCard, statusStrip } from './common.js';
const stageIt = (app, car) => { app.scene?.stage?.('bay', { car: { carId: car.carId, install: car.install, dirt: car.dirt, y: 0.08 }, person: 'benno', personClip: 'MechanicWipe', personAt: [3.8, 0, -1.8], personYaw: -0.6, radius: 8.6, height: 2.3, sun: 0.7, lookX: -1.5, angle: 0.25 }); app.mix.music('socket'); };
const SAY = { engine: 'engine', weight: 'weight', tyres: 'tyres', brakes: 'brakes', suspension: 'susp', drivetrain: 'drive', body: 'body' };
export class TuningScreen {
  constructor(app) { this.id = 'tuning'; this.app = app; this.tab = 0; this.page = 0; }
  enter(ui) { const c = carEntry(this.app.profile); stageIt(this.app, c); ui.say('benno', LINES.benno.hello); }
  resume() { stageIt(this.app, carEntry(this.app.profile)); }
  draw(ui) {
    const app = this.app, car = carEntry(app.profile); statusStrip(ui, app);
    ui.text(10, 19, 'TUNING STREET', { scale: 2, color: 'sand' });
    const w = 168, x = ui.w - w - 8; specCard(ui, x, 20, w, car.carId, car.install, { extra: [['GRIP', (specOf(car.carId, car.install).tyreMu).toFixed(2)], ['DOWNFORCE', (specOf(car.carId, car.install).clA).toFixed(2)]] });
    const lw = Math.min(ui.w - w - 26, 170), lx = 8;
    ui.tabs('t', lx, 38, lw, ['PARTS', 'SETUP'], this.tab, (i) => { this.tab = i; this.focus = null; ui.box.ready = false; });
    if (this.tab === 0) {
      const pages = 2, list = TILES.slice(this.page * 4, this.page * 4 + 4);
      list.forEach((t, k) => { const tw = (lw - 4) / 2, xx = lx + (k % 2) * (tw + 4), yy = 54 + Math.floor(k / 2) * 52, f = ui.item(t.id, xx, yy, tw, 48, { confirm: () => ui.push(new PartsScreen(app, t.id)) }); ui.rect(xx, yy, tw, 48, f ? 'navy' : 'night'); ui.text(xx + 5, yy + 6, t.name, { color: f ? 'sand' : 'white' }); ui.lines(xx + 5, yy + 17, t.line, { chars: Math.floor((tw - 10) / 6), gap: 9, color: 'mist' }); });
      const nav = (d) => { this.page = (this.page + d + pages) % pages; this.focus = null; ui.box.ready = false; };
      ui.button('more', lx, 160, lw, 14, this.page === 0 ? 'MORE: TILES 5 TO 8' : 'BACK TO TILES 1 TO 4', { confirm: () => nav(1) });
    } else {
      const sliders = SETUP_SLIDERS.filter((s) => sliderAvailable(car.install, s));
      if (!sliders.length) ui.lines(lx + 4, 60, 'NOTHING TO SET YET. BUY A RACE GEARBOX, AN LSD, SUSPENSION, RACE BRAKES OR A WING, AND THE SETTING APPEARS HERE.', { chars: Math.floor((lw - 8) / 6), gap: 10, color: 'mist' });
      sliders.forEach((s, k) => { const y = 54 + k * 22; ui.slider(s.id, lx, y, lw, 13, s.name, setupValue(car.install, s.id), s.min, s.max, { step: s.step * (s.step < 0.02 ? 2 : 1), barW: 48, valueW: 26, set: (v) => { setSetup(car, s.id, v); app.save(); }, reset: () => { setSetup(car, s.id, s.def); app.save(); }, format: (v) => v.toFixed(2) }); if (ui.focused(s.id)) { ui.text(lx + 2, y + 14, `${s.low} TO ${s.high}`, { color: 'sand' }); this.help = s.line; } });
      if (this.help && sliders.length) ui.lines(lx, Math.min(ui.h - 62, 54 + sliders.length * 22 + 6), this.help, { chars: Math.floor(lw / 6), gap: 9, color: 'mist' });
    }
    ui.prompts([['confirm', 'CHOOSE'], ['tabs', 'TAB'], ['alt', 'TEST DRIVE'], ['back', 'MAP']]);
  }
  onAlt() { const c = carEntry(this.app.profile); this.app.startTestDrive(c.carId, c.install, { from: 'tuning', uid: c.uid }); }
}
const PER_PAGE = 5;
export class PartsScreen {
  constructor(app, tile) { this.id = 'parts'; this.app = app; this.tile = tile; this.page = 0; }
  resume() { stageIt(this.app, carEntry(this.app.profile)); }
  items(car) {
    if (this.tile === 'tyres') return TYRE_IDS.map((id) => { const t = TYRES[id]; return { id, name: t.name, line: t.line, price: t.price, owned: car.install.tyres.includes(id), on: car.install.tyre === id, kind: 'tyre', after: `GRIP ${t.tyreMu.toFixed(2)}`, before: `GRIP ${specOf(car.carId, car.install).tyreMu.toFixed(2)}` }; });
    if (this.tile === 'body') return [{ id: 'paint', name: 'PAINT', line: 'ANY OF THE SIXTEEN COLOURS. LEFT AND RIGHT TO CHOOSE.', price: PAINT_PRICE, kind: 'paint', value: car.install.paint }, { id: 'rims', name: 'RIMS', line: 'FOUR STYLES. LEFT AND RIGHT TO CHOOSE.', price: RIM_PRICE, kind: 'rims', value: RIM_STYLES[car.install.rims] }];
    return PART_IDS.filter((id) => PARTS[id].cat === this.tile).map((id) => { const P = PARTS[id], s0 = specOf(car.carId, car.install), tmp = { ...car.install, owned: [...new Set([...car.install.owned, id])], on: P.group ? { ...car.install.on, [P.group]: id } : car.install.on }, s1 = specOf(car.carId, tmp); const change = (a, b, u) => (a !== b ? `${a} TO ${b} ${u}` : null); return { id, name: P.name, line: P.line, price: P.price, owned: car.install.owned.includes(id), on: hasPart(car.install, id), kind: 'part', group: P.group, delta: change(s0.ps, s1.ps, 'PS') ?? change(s0.kg, s1.kg, 'KG') ?? (s1.clA !== s0.clA ? `DOWNFORCE ${s1.clA.toFixed(2)}` : s1.brakeG !== s0.brakeG ? `BRAKES ${s1.brakeG.toFixed(2)} G` : s1.shift !== s0.shift ? `SHIFT ${s1.shift.toFixed(2)} S` : null) }; });
  }
  draw(ui) {
    const app = this.app, car = carEntry(app.profile), all = this.items(car), pages = Math.max(1, Math.ceil(all.length / PER_PAGE)), list = all.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE), tile = TILES.find((t) => t.id === this.tile), w = Math.min(ui.w - 18, 300), x = 8;
    statusStrip(ui, app); ui.text(x, 19, tile.name, { scale: 2, color: 'sand' }); if (pages > 1) ui.text(x + w, 25, `PAGE ${this.page + 1}/${pages}`, { align: 'right', color: 'slate' });
    list.forEach((it, k) => {
      const y = 38 + k * 34, h = 30;
      const onX = it.kind === 'paint' ? (d) => { const n = PAINTS.indexOf(this.paintPick ?? car.install.paint), v = PAINTS[(n + d + PAINTS.length) % PAINTS.length]; this.paintPick = v; app.scene?.showCar(car.carId, car.install, { paint: v, y: 0.08 }); } : it.kind === 'rims' ? (d) => { this.rimPick = ((this.rimPick ?? car.install.rims) + d + RIM_STYLES.length) % RIM_STYLES.length; } : null;
      const confirm = () => this.buy(ui, car, it), f = ui.item(it.id, x, y, w, h, { confirm, onX, quiet: true });
      ui.rect(x, y, w, h, f ? 'navy' : 'night');
      ui.text(x + 6, y + 5, it.name, { color: it.on ? 'lime' : f ? 'white' : 'mist' }); ui.text(x + 6, y + 16, it.line, { color: 'slate' });
      if (it.kind === 'paint') { const v = this.paintPick ?? car.install.paint; ui.text(x + w - 6, y + 5, `< ${v.toUpperCase()} >`, { align: 'right', color: v === car.install.paint ? 'lime' : 'sand' }); }
      else if (it.kind === 'rims') { const v = this.rimPick ?? car.install.rims; ui.text(x + w - 6, y + 5, `< ${RIM_STYLES[v]} >`, { align: 'right', color: v === car.install.rims ? 'lime' : 'sand' }); }
      else ui.text(x + w - 6, y + 5, it.on ? 'FITTED' : it.owned ? 'OWNED' : cr(it.price), { align: 'right', color: it.on ? 'lime' : it.owned ? 'sky' : app.profile.credits >= it.price ? 'sand' : 'red' });
      if (f && it.delta) ui.text(x + w - 6, y + 16, it.delta, { align: 'right', color: 'white' });
    });
    this.subtitleAt = pages > 1 ? 1 : undefined; // the last row is a button then: the mechanic speaks from the top
    if (pages > 1) ui.button('morePage', x, 38 + PER_PAGE * 34, w, 13, 'NEXT PAGE', { confirm: () => { this.page = (this.page + 1) % pages; this.focus = null; ui.box.ready = false; } });
    ui.prompts([['confirm', 'FIT'], ['moveX', 'CHOOSE'], ['alt', 'TEST DRIVE'], ['back', 'BACK']]);
  }
  buy(ui, car, it) {
    const app = this.app, p = app.profile; let r;
    if (it.kind === 'tyre') r = buyTyre(p, car, it.id); else if (it.kind === 'part') r = buyPart(p, car, it.id); else if (it.kind === 'paint') r = buyPaint(p, car, this.paintPick ?? car.install.paint); else r = buyRims(p, car, this.rimPick ?? car.install.rims);
    if (!r.ok) { app.mix.sfx('denied'); if (r.why === 'money') ui.note('NOT ENOUGH CREDITS.'); return; }
    app.save(); app.mix.sfx(r.swapped ? 'confirm' : 'register');
    const s = app.scene; s?.showCar(car.carId, car.install, { y: 0.08, dirt: car.dirt });
    if (r.swapped) return;
    if (this.tile === 'aero' && it.id === 'aeroWing') ui.say('benno', LINES.benno.wing); else if (SAY[this.tile]) ui.say('benno', LINES.benno[SAY[this.tile]]);
    if (this.tile === 'engine') { const before = this.prevInstall(car, it.id); ui.push(new DynoScreen(app, car, before)); }
  }
  prevInstall(car, id) { const P = PARTS[id], i = { ...car.install, owned: car.install.owned.filter((x) => x !== id), on: { ...car.install.on } }; if (P.group) i.on[P.group] = null; return i; }
  onAlt() { const c = carEntry(this.app.profile); this.app.startTestDrive(c.carId, c.install, { from: 'parts', tile: this.tile, uid: c.uid }); }
}
// The dyno: the car on rollers, wheels spinning, the curve drawn live, the exhaust shaking, the engine rising.
export class DynoScreen {
  constructor(app, car, before, o = {}) { this.id = 'dyno'; this.app = app; this.car = car; this.t = 0; this.curveA = dynoCurve(car.carId, before); this.curveB = dynoCurve(car.carId, car.install); this.max = Math.max(...this.curveB.map((p) => p.ps), ...this.curveA.map((p) => p.ps)); this.o = o; this.p = { turbo: specOf(car.carId, car.install).turbo, redline: specOf(car.carId, car.install).redline, idle: 900 }; }
  enter() { const a = this.app, s = a.scene; s.stageOpts = { ...s.stageOpts, carFixed: true, carX: 0, carZ: 0, carYaw: Math.PI / 2 + 0.3 }; s.camPos.set(s.base.x - 5.6, 1.9, s.base.z + 5.4); s.wantPos.copy(s.camPos); s.orbitOn = false; s.radius = 7.8; s.orbit = -0.8; s.height = 1.9; a.mix.sfx('confirm'); }
  exit() { const a = this.app, s = a.scene; a.mix.clearCars(); if (s?.stageOpts) { s.stageOpts.carFixed = false; s.orbitOn = true; s.carSpin = 0; if (s.car) s.car.shake = 0; } }
  draw(ui, dt) {
    const app = this.app, s = app.scene, dur = 5.5; this.t += dt; const f = Math.min(1, this.t / dur), n = this.curveB.length - 1, k = Math.round(f * n), pt = this.curveB[k];
    if (s?.car) { s.carSpin = 14 + f * 70; s.car.shake = f < 1 ? 0.006 : 0; if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6) && f < 1) app.ctx.particles.burst('exhaustPop', [s.car.object.position.x - 2, 0.4, s.car.object.position.z - 0.6]); }
    const w = Math.min(ui.w - 30, 280), h = 76, x = Math.round(ui.cx - w / 2), y = 18;
    ui.panel(x, y, w, h + 22, { color: 'ink', border: 'sand' }); ui.text(x + 6, y + 4, `DYNO: ${CAR_INFO[this.car.carId].short}`, { color: 'sand' }); ui.text(x + w - 6, y + 4, `${Math.round(pt.ps)} PS`, { align: 'right', scale: 1 });
    const plotX = x + 8, plotY = y + 15, pw = w - 16, ph = h - 6, redlineX = 1;
    for (let g = 0; g <= 4; g++) ui.rect(plotX, plotY + (g * ph) / 4, pw, 1, 'night');
    const P = (c, i) => [plotX + Math.round((i / n) * pw), plotY + ph - Math.round((c.ps / this.max) * ph * 0.95)];
    for (let i = 0; i <= n; i++) { const [a, b] = P(this.curveA[i], i); ui.rect(a, b, 2, 2, 'slate'); }
    for (let i = 0; i <= k; i++) { const [a, b] = P(this.curveB[i], i); ui.rect(a, b, 2, 2, 'lime'); }
    ui.text(plotX, y + h + 8, 'BEFORE', { color: 'slate' }); ui.text(plotX + 44, y + h + 8, 'AFTER', { color: 'lime' }); ui.text(x + w - 6, y + h + 8, `${Math.round(pt.rpm)} RPM`, { align: 'right', color: 'mist' });
    app.mix.engines([{ key: 'dyno', carId: this.car.carId, p: { ...this.p, sportExhaust: this.car.install.owned.includes('exhaust') }, rpm: f < 1 ? pt.rpm : 900, throttle: f < 1 ? 1 : 0.05, spool: f, gain: 1, pan: 0 }], dt);
    ui.button('done', ui.cx - 40, ui.h - 36, 80, 14, f < 1 ? 'WAIT' : 'THANK YOU', { confirm: () => ui.pop() });
    ui.prompts([['confirm', 'CLOSE']]);
    void redlineX;
  }
}
