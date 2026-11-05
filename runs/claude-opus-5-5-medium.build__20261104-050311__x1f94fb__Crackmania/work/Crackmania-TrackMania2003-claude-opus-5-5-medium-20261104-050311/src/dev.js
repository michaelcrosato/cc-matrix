// Dev Mode (pause menu -> Dev Mode): TOOLS (teleport, finish now, medals, unlocks, coppers, bot drives, re-bake, time
// scale, frame step, debug views, jump to), TUNING (live sliders over CFG with reset), INFO (car, run, track, build).
import { SLIDERS, sliderGet, sliderSet, sliderDefault, reset as resetCfg, CFG } from './config.js';
import { TRACKS, PUZZLES, ENV_ORDER } from './data.js';
import { Bot, fmt } from './run.js';
import { placeCar, kmh } from './car.js';
import { add, U } from './v3.js';
import { text, tw, panel, promptBar, COL, MEDAL_COL } from './ui.js';
import { medalTimes } from './app.js';

const E = globalThis.My3D2dge, px = E.px;
export class DevMode {
  constructor(app) { this.app = app; this.tab = 0; this.i = 0; this.scroll = 0; this.flags = { probes: false, route: false, gates: false, fps: false, colliders: false }; this.slow = 1; this.step = false; this.jump = 0; this.confirmReset = false; this.where = null; }
  get game() { return this.app.game; }
  open(where) { this.app.devOpen = true; this.where = where; this.i = 0; this.scroll = 0; this.game.audio.sfx('ui_ok'); }
  close() { this.app.devOpen = false; this.game.timeScale = 1; this.game.audio.sfx('ui_back'); }
  carId() { const R = this.app.race; return R ? R.players[0].carId : 'coyote'; }
  tools() {
    const app = this.app, R = app.race, Pl = R && R.players[0], P = app.profile, T = [];
    const id = R && R.prep.track.id;
    if (R) {
      T.push(['TELEPORT: NEXT CHECKPOINT', () => { const cps = R.course.cps, run = Pl.run, nx = cps.find(c => !run.passed.has(c.i)) || R.course.gates.find(g => g.kind === 'FN'); if (nx) { placeCar(run.car, { p: add(nx.p, nx.t, -10), t: nx.t, u: nx.u, r: nx.r }); run.idx = 0; } }]);
      T.push(['TELEPORT: LAST CHECKPOINT', () => Pl.run.respawn()]);
      T.push(['FINISH NOW', () => { const run = Pl.run; for (const c of R.course.cps) run.passed.add(c.i); run.finished = true; run.finishSteps = Math.max(1, run.steps); run.phase = 'finished'; run.events.push(['finish', run.steps]); if (R.spec.onFinish) R.spec.onFinish(Pl, run); }]);
      if (id && app.medals(id)) for (const m of [1, 2, 3, 4]) T.push(['AWARD ' + ['', 'BRONZE', 'SILVER', 'GOLD', 'AUTHOR'][m] + ' ON ' + id, () => { const M = app.medals(id); P.finish(id, [0, M.bronze, M.silver, M.gold, M.author][m], m, [], null, PUZZLES.some(z => z.id === id) ? 'puzzle' : 'race', R.prep.track.env); this.game.note('AWARDED', 1); }]);
      T.push(['BOT DRIVES: ' + (Pl.bot ? 'ON' : 'OFF'), () => { Pl.bot = Pl.bot ? null : new Bot(Pl.run, { skill: this.botSkill || 1 }); }]);
      T.push(['BOT SKILL: ' + (this.botSkill || 1).toFixed(2), () => { this.botSkill = (Math.round(((this.botSkill || 1) - .05) * 100) / 100); if (this.botSkill < .5) this.botSkill = 1; if (Pl.bot) Pl.bot = new Bot(Pl.run, { skill: this.botSkill }); }]);
      T.push(['RE-BAKE MEDALS FOR THIS TRACK', () => { if (id) { app.rebake(id); R.spec.medals = app.medals(id); this.game.note('AUTHOR ' + fmt(app.authors[id]), 2); } }]);
      T.push(['TIME SCALE: ' + this.slow + 'X', () => { this.slow = this.slow === 1 ? .5 : this.slow === .5 ? .25 : 1; }]);
      T.push(['FRAME STEP', () => { this.step = true; }]);
      T.push(['SHOW PROBES: ' + (this.flags.probes ? 'ON' : 'OFF'), () => { this.flags.probes = !this.flags.probes; }]);
      T.push(['SHOW ROUTE AND LINE: ' + (this.flags.route ? 'ON' : 'OFF'), () => { this.flags.route = !this.flags.route; }]);
      T.push(['SHOW GATES: ' + (this.flags.gates ? 'ON' : 'OFF'), () => { this.flags.gates = !this.flags.gates; }]);
      T.push(['SHOW COLLIDERS: ' + (this.flags.colliders ? 'ON' : 'OFF'), () => { this.flags.colliders = !this.flags.colliders; }]);
    }
    if (this.where === 'editor' && app.editorExport) T.push(['EXPORT AS CONTENT', () => app.editorExport()]);
    T.push(['SHOW FPS AND DRAW STATS: ' + (this.flags.fps ? 'ON' : 'OFF'), () => { this.flags.fps = !this.flags.fps; }]);
    T.push(['UNLOCK EVERYTHING', () => { P.data.unlockAll = true; for (const k of ['stunts', 'loops', 'surfaces', 'scenery']) P.data.packs[k] = true; P.data.patterns = [0, 1, 2, 3, 4, 5, 6, 7]; P.save(); this.game.note('EVERYTHING UNLOCKED', 1.5); }]);
    T.push(['+1000 COPPERS', () => { P.earn(1000); }]);
    T.push([this.confirmReset ? 'RESET PROFILE: PRESS AGAIN' : 'RESET PROFILE', () => { if (!this.confirmReset) { this.confirmReset = true; return; } P.reset(); this.confirmReset = false; this.game.note('PROFILE RESET', 1.5); }]);
    const J = TRACKS.map(t => t.id).concat(PUZZLES.map(p => p.id), ENV_ORDER.map(e => 'SURVIVAL:' + e), ['GARAGE', 'EDITOR', 'CREDITS']);
    T.push(['JUMP TO: < ' + J[this.jump % J.length] + ' >', () => { const j = J[this.jump % J.length]; this.close(); this.game.resume && this.game.resume(); if (/^[DRS]\d$/.test(j)) app.modes.campaign(j); else if (/^P/.test(j)) app.modes.puzzle(j); else if (j.startsWith('SURVIVAL')) app.modes.survival(j.split(':')[1]); else if (j === 'GARAGE') app.modes.garage(); else if (j === 'EDITOR') app.modes.editor({ slot: 0, env: 'dustbowl' }); else app.modes.toMenu('credits'); }, k => { this.jump = (this.jump + k + J.length) % J.length; }]);
    T.push(['CLOSE DEV MODE', () => this.close()]);
    return T;
  }
  rows() {
    if (this.tab === 0) return this.tools();
    if (this.tab === 1) return [['RESET ALL TO DEFAULTS', () => { const la = CFG.loopAssist; resetCfg(); this.app.applySettings(); this.app.authors = {}; this.game.note('DEFAULTS RESTORED', 1.5); }]].concat(SLIDERS.map(s => [s[1], null, k => { const car = this.carId(), v = sliderGet(s[0], car); sliderSet(s[0], car, Math.round(Math.min(s[3], Math.max(s[2], v + k * s[4])) / s[4]) * s[4]); if (s[0] === 'loopAssist') CFG._la = CFG.loopAssist; }, s]));
    return [];
  }
  /** true: the game under it waits */
  update(dt) {
    const I = this.game.input, rows = this.rows();
    if (I.pressed('tabL') || I.pressed('cam1')) { this.tab = (this.tab + 2) % 3; this.i = 0; }
    if (I.pressed('tabR') || I.pressed('cam2')) { this.tab = (this.tab + 1) % 3; this.i = 0; }
    if (I.repeat('up', .3, .07)) this.i = Math.max(0, this.i - 1);
    if (I.repeat('down', .3, .07)) this.i = Math.min(rows.length - 1, this.i + 1);
    const r = rows[this.i];
    if (r) {
      const fast = I.held && (I.held.has('ShiftLeft')) ? 5 : 1;
      if (r[2] && I.repeat('left', .25, .04)) r[2](-fast); if (r[2] && I.repeat('right', .25, .04)) r[2](fast);
      if (I.pressed('confirm') && r[1]) { r[1](); this.game.audio.sfx('ui_ok'); }
      if ((I.pressed('del') || I.pressed('brake') && false) && r[3]) { const s = r[3]; sliderSet(s[0], this.carId(), sliderDefault(s[0], this.carId())); }
      if (I.pressed('alt') && this.tab === 1) { resetCfg(); this.app.applySettings(); this.app.authors = {}; this.game.note('DEFAULTS RESTORED', 1.5); }
    }
    // the mouse: hover picks a row, a click acts, a drag on a slider sets it
    const p = I.pointer(), c = I.clicked(), W = this.game.W, x0 = 10, w = Math.round(W * .5);
    const rowAt = q => { if (!q || q[0] < x0 || q[0] > x0 + w) return -1; const k = Math.floor((q[1] - 46) / 14) + this.scroll; return k >= 0 && k < rows.length && q[1] >= 46 ? k : -1; };
    if (p && (!this.lp || p[0] !== this.lp[0] || p[1] !== this.lp[1])) { const k = rowAt(p); if (k >= 0) this.i = k; } this.lp = p && p.slice();
    if (c) { const k = rowAt(c); if (k >= 0) { this.i = k; const rr = rows[k]; if (rr[1]) rr[1](); else if (rr[2]) rr[2](c[0] > x0 + w * .75 ? 1 : -1); } if (c[1] < 40 && c[0] < x0 + w) { this.tab = Math.min(2, Math.max(0, Math.floor((c[0] - x0) / (w / 3)))); this.i = 0; } }
    if (I.pressed('cancel') || I.pressed('pause')) { this.close(); return true; }
    const per = Math.floor((this.game.H - 90) / 14); if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + per) this.scroll = this.i - per + 1;
    // the game: held, or in slow motion, or one step
    this.game.timeScale = this.slow;
    if (this.step) { this.step = false; return false; }
    return this.slow === 1 || !this.app.race;
  }
  draw(g, W, H) {
    const w = Math.round(W * .5), x0 = 10, rows = this.rows();
    panel(g, x0 - 4, 6, w + 8, H - 40, { alpha: .9, accent: '#5ae07a' });
    ['TOOLS', 'TUNING', 'INFO'].forEach((t, i) => { const x = x0 + i * w / 3; px.rect(g, x + 2, 12, w / 3 - 4, 20, i === this.tab ? '#5ae07a' : '#24305a'); E.font.text(g, t, x + w / 6, 18, i === this.tab ? '#10101a' : '#ffffff', { align: 'center' }); });
    const per = Math.floor((H - 90) / 14);
    if (this.tab < 2) rows.slice(this.scroll, this.scroll + per).forEach((r, k) => {
      const i = k + this.scroll, y = 46 + k * 14, f = i === this.i;
      if (f) px.rect(g, x0, y - 2, w, 13, '#34447a');
      if (r[3]) {
        const s = r[3], car = this.carId(), v = sliderGet(s[0], car), d = sliderDefault(s[0], car), bx = x0 + w * .55, bw = w * .3;
        E.font.text(g, r[0], x0 + 4, y, f ? '#ffffff' : '#c8c8e0', {});
        px.rect(g, bx, y + 2, bw, 4, '#10101a'); px.rect(g, bx, y + 2, Math.round(bw * (v - s[2]) / (s[3] - s[2])), 4, '#5ae07a'); px.rect(g, bx + Math.round(bw * (d - s[2]) / (s[3] - s[2])), y, 1, 8, '#ffd23a');
        E.font.text(g, (+v).toFixed(s[4] < .1 ? 3 : s[4] < 1 ? 2 : 0), x0 + w - 4, y, Math.abs(v - d) < 1e-9 ? '#c8c8e0' : '#ffd23a', { align: 'right' });
      } else E.font.text(g, r[0], x0 + 4, y, f ? '#ffffff' : '#c8c8e0', {});
    });
    else {
      const R = this.app.race, Pl = R && R.players[0], c = Pl && Pl.run.car, L = [];
      if (c) L.push('CAR ' + Pl.carId.toUpperCase() + '  ' + kmh(c).toFixed(1) + ' KM/H', 'GROUNDED ' + c.grounded + '  SURFACE ' + c.surface, 'BLOCK ' + ((R.prep.track.get(c.blockId) || {}).type || '-') + '  KAPPA ' + c.kappa.toFixed(3) + '  LOAD ' + c.load.toFixed(1), 'SLIP ' + c.slip.toFixed(2) + '  AIR ' + c.air.toFixed(2) + '  BOOST ' + c.boostT.toFixed(2), 'POS ' + c.p.map(v => v.toFixed(1)).join(', '), 'RUN STEPS ' + Pl.run.steps + '  CPS ' + Pl.run.cpCount + '/' + R.course.cps.length + '  RESPAWNS ' + Pl.run.respawns);
      if (R) { const id = R.prep.track.id, M = id && this.app.medals(id); L.push('TRACK ' + (id || R.prep.track.name) + '  BLOCKS ' + R.prep.track.blocks.length + '  ROUTE ' + R.course.length.toFixed(0) + ' M'); if (M) L.push('AUTHOR ' + fmt(M.author) + ' GOLD ' + fmt(M.gold) + ' SILVER ' + fmt(M.silver) + ' BRONZE ' + fmt(M.bronze)); }
      L.push('BUILD ' + (E.versionLabel ? E.versionLabel() : E.version), '3D BACKEND ' + E.World3D.backend, 'COPPERS ' + this.app.profile.coppers + '  GOLDS ' + this.app.profile.totalGolds() + '/15');
      L.forEach((l, i) => E.font.text(g, l, x0 + 4, 46 + i * 14, '#ffffff', {}));
    }
    promptBar(g, this.game, [['tabL', 'TAB'], ['up', 'ROW'], ['left', 'ADJUST'], ['confirm', 'DO'], ['del', 'RESET ROW'], ['cancel', 'CLOSE']]);
  }
  /** debug views in 3D (the race draws them) */
  draw3d(S, pen) {
    if (this.flags.colliders) {   // collision triangles within 45 m of the car as a wireframe (walls red, ground green)
      const c = S.players[0].run.car.p, geo = S.course.geo; let n = 0; pen.at(0, 0, 0, 0, U);
      for (const id in geo.blocks) for (const sname in geo.blocks[id].collide) {
        const C = geo.blocks[id].collide[sname], P = C.pos, X = C.idx, col = sname === 'wall' ? '#ff4a3a' : sname === 'boost' ? '#ffb030' : '#5ae07a';
        for (let i = 0; i < X.length && n < 1500; i += 3) {
          const a = X[i] * 3, b = X[i + 1] * 3; if (Math.hypot(P[a] - c[0], P[a + 1] - c[1], P[a + 2] - c[2]) > 45) continue;
          pen.tube(P[a], P[a + 1], P[a + 2] + .05, P[b], P[b + 1], P[b + 2] + .05, .03, col); n++;
        }
      }
    }
    if (this.flags.route) { const s = S.course.samples, Pl = S.players[0], pl = S.course.plan(Pl.carId, 1); for (let i = 0; i < s.length - 1; i += 2) { const a = s[i].p, b = s[i + 1].p; pen.at(0, 0, 0, 0, U).tube(a[0], a[1], a[2] + .3, b[0], b[1], b[2] + .3, .08, '#ffffff'); const p = pl.pts[i], q = pl.pts[i + 1]; pen.tube(p[0], p[1], p[2] + .4, q[0], q[1], q[2] + .4, .1, '#ff4a4a'); } }
    if (this.flags.gates) for (const g of S.course.gates) { pen.at(0, 0, 0, 0, U); for (const sd of [-1, 1]) pen.glow(g.p[0] + g.r[0] * sd * g.hw, g.p[1] + g.r[1] * sd * g.hw, g.p[2] + 1, .6, g.kind === 'CP' ? '#5ab0ff' : '#ff5a4a'); }
    if (this.flags.probes) for (const Pl of S.players) { const c = Pl.run.car; pen.at(0, 0, 0, 0, U).tube(c.p[0], c.p[1], c.p[2], c.p[0] + c.n[0] * 3, c.p[1] + c.n[1] * 3, c.p[2] + c.n[2] * 3, .06, '#5ae07a'); for (let i = 0; i < 4; i++) { const lx = i < 2 ? 1.35 : -1.35, ly = i % 2 ? .8 : -.8, o = add(add(c.p, c.f, lx), c.r, ly); pen.tube(o[0], o[1], o[2], o[0] - c.u[0] * c.wd[i], o[1] - c.u[1] * c.wd[i], o[2] - c.u[2] * c.wd[i], .04, '#ffd23a'); } }
  }
  overlay(g, W, H) {
    if (!this.flags.fps) return;
    const s = this.game.stats || {}, v = this.app.view, ws = v && v.world.stats;
    E.font.text(g, 'FRAME ' + (s.frameMs || 0).toFixed(1) + ' MS  UPDATE ' + (s.updateMs || 0).toFixed(1) + '  DRAW ' + (s.renderMs || 0).toFixed(1) + (ws ? '  CALLS ' + ws.calls + '  TRIS ' + ws.tris : ''), 6, H - 40, '#5ae07a', { outline: '#10101a' });
  }
}
