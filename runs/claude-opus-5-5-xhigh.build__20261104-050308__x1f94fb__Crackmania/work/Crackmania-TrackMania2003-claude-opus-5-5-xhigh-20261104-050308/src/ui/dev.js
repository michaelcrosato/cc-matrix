// CRACKMANIA Dev Mode (PLAN §5.10), from the pause menu: a panel over the left of the screen, the game paused (or slowed)
// behind it. TOOLS (teleport between checkpoints, finish now, medals, unlock everything, coppers, reset the profile, the
// bot drives, re-bake medals, time scale, frame step, a free camera, probes, colliders, the racing line, gates, stats,
// jump anywhere, export as content), TUNING (every important number as a live slider, the default marked, reset one
// or all, kept between visits if asked), INFO (the car, the run, the track, the build)
import { ctx, E, U } from '../ctx.js';
import { CFG, SLIDERS, cfgGet, cfgSet, cfgDefault, resetCFG, DEFAULTS } from '../config.js';
import { panel, T1, T2, UI, Focus, rowItem, sliderItem, toast, accent } from './kit.js';
import { promptRow } from './glyphs.js';
import { Plan, Bot } from '../race/bot.js';
import { botRun, thresholds } from '../race/medals.js';
import { FreeCam } from '../car/camera.js';
import { fmt } from '../race/run.js';
import { TYPES, frameAt } from '../track/blocks.js';
import { add, sub, mul, len, norm, cross } from '../lib/v3.js';
import { TRACKS, PUZZLES } from '../data/tracks.js';
import { ENV_IDS } from '../env/envs.js';
const TABS = ['TOOLS', 'TUNING', 'INFO'];
export class Dev {
  constructor(game) { this.game = game; this.open = false; this.tab = 0; this.focus = new Focus(); this.scroll = 0; this.timeScale = 1; this.step1 = false; this.freeCam = null; this.show = this.show.bind(this); this.flags = { probes: false, colliders: false, line: false, gates: false, stats: false }; this.prev = new Set(); this.keep = false; this.jump = false;
    try { const k = E.store.get('crackmania:dev', null); if (k && k.keep) { this.keep = true; this._apply(k.cfg); } } catch (e) { /* none */ } }
  _apply(c) { if (!c) return; for (const [p] of SLIDERS) for (const car of ['coyote', 'pebble', 'moose']) { try { const v = c[p + '|' + car]; if (typeof v === 'number') cfgSet(p, car, v); } catch (e) { /* skip */ } } }
  _save() { if (!this.keep) { E.store.set('crackmania:dev', { keep: false }); return; } const c = {}; for (const [p] of SLIDERS) for (const car of ['coyote', 'pebble', 'moose']) c[p + '|' + car] = cfgGet(p, car); E.store.set('crackmania:dev', { keep: true, cfg: c }); }
  show(tab) { this.open = true; if (typeof tab === 'string') this.tab = Math.max(0, TABS.indexOf(tab)); this.focus.reset(0); this.game.input.consumeAll(); this.game.timeScale = 1; }
  hide() { this.open = false; this.freeCam = null; this.game.timeScale = 1; this.game.input.consumeAll(); this._save(); }
  get car() { const s = ctx.session; return s && s.players[0] ? s.players[0] : null; }
  get model() { const P = this.car; return P ? P.model : 'coyote'; }
  _hit(code) { return this.game.input.held.has(code) && !this.prev.has(code); }
  /** each step while open: true when the game should hold still this step */
  update(dt) {
    const I = this.game.input;
    const tabL = this._hit('KeyQ') || this._hit('Pad4'), tabR = this._hit('KeyE') || this._hit('Pad5'), sq = this._hit('KeyX') || this._hit('Pad2'), tri = this._hit('KeyY') || this._hit('Pad3');
    this.prev = new Set(I.held);
    if (tabL) { this.tab = (this.tab + 2) % 3; this.focus.reset(0); this.scroll = 0; ctx.sound.sfx('move'); }
    if (tabR) { this.tab = (this.tab + 1) % 3; this.focus.reset(0); this.scroll = 0; ctx.sound.sfx('move'); }
    if (I.pressed('cancel') || (I.pressed('pause'))) { this.hide(); return true; }
    if (this.tab === 1) { const q = this.focus.cur; if (sq && q && q.reset) { q.reset(); ctx.sound.sfx('tick'); } if (tri) { resetCFG(); ctx.sound.sfx('confirm'); toast('TUNING RESET TO DEFAULTS'); } }
    // hold left / right: the slider speeds up
    const q = this.focus.cur; this.hold = (I.down('left') || I.down('right')) ? (this.hold || 0) + dt : 0;
    if (q && q.slide && this.hold > .6) { const k = Math.min(8, 1 + (this.hold - .6) * 6); if (I.down('right')) q.slide(k * dt * 6); if (I.down('left')) q.slide(-k * dt * 6); }
    if (this.tab !== 2) this.focus.set(this.items({ W: this.game.W || 427, H: this.game.H || 240 })); this.focus.update(dt, I);
    // the free camera flies with the stick / WASD and the right stick / arrows look
    if (this.freeCam && this.fc) { const F = this.fc, mv = I.move(), sp = I.held.has('ShiftLeft') ? 80 : 30; F.yaw += ((I.padAim ? I.padAim[0] : 0) + (I.held.has('KeyL') ? 1 : 0) - (I.held.has('KeyJ') ? 1 : 0)) * 1.6 * dt; F.pitch = Math.max(-1.4, Math.min(1.4, F.pitch - ((I.padAim ? I.padAim[1] : 0) + (I.held.has('KeyK') ? 1 : 0) - (I.held.has('KeyI') ? 1 : 0)) * 1.2 * dt));
      const fw = [Math.cos(F.yaw) * Math.cos(F.pitch), Math.sin(F.yaw) * Math.cos(F.pitch), Math.sin(F.pitch)], rt = [-Math.sin(F.yaw), Math.cos(F.yaw), 0]; F.p = add(add(F.p, fw, -mv[1] * sp * dt), rt, mv[0] * sp * dt); this.freeCam.set(F.p, add(F.p, fw, 10), 70); }
    if (this.step1) { this.step1 = false; return false; }
    if (this.timeScale < 1) { this.game.timeScale = this.timeScale; return false; }
    return true;
  }
  items(r) {
    const x = 8, w = Math.round(r.W * .45) - 16, h = 20, top = 54, P = this.car, s = ctx.session, out = [];
    let y = top - this.scroll;
    const row = (id, label, value, o = {}) => { out.push(Object.assign({ id, x, y, w, h, label, value, draw: (g, q, foc, k, t) => rowItem(g, q, foc, k, t, { accent: '#5ad0ff' }) }, o)); y += h + 2; };
    if (this.tab === 0) {
      if (s && P) {
        row('tpn', 'Teleport: next checkpoint', '', { onPick: () => this.teleport(1) }); row('tpp', 'Teleport: previous checkpoint', '', { onPick: () => this.teleport(-1) });
        row('fin', 'Finish now', '', { onPick: () => this.finishNow() });
        for (const [m, n] of [[1, 'BRONZE'], [2, 'SILVER'], [3, 'GOLD'], [4, 'AUTHOR']]) row('aw' + m, 'Award medal: ' + n, '', { onPick: () => this.award(m) });
        row('bot', 'Bot drives', P.bot ? 'ON' : 'OFF', { onPick: () => { if (P.bot) P.bot = null; else { P.bot = new Bot(new Plan(s.course, P.model, this.skill ?? 1)); P.bot.relocate(P.run.car); } } });
        row('skill', 'Bot skill', (this.skill ?? 1).toFixed(2), { onLeft: () => { this.skill = Math.max(0, (this.skill ?? 1) - .05); }, onRight: () => { this.skill = Math.min(1.1, (this.skill ?? 1) + .05); } });
        row('bake', 'Re-bake medals for this track', ctx.medals[s.track.id] ? fmt(ctx.medals[s.track.id].author) : '', { onPick: () => { const res = botRun(s.track); if (res) { ctx.medals[s.track.id] = thresholds(res.steps); toast('AUTHOR ' + fmt(res.steps)); } else toast('THE BOT DID NOT FINISH', '#ff5a4a'); } });
      }
      row('ts', 'Time scale', this.timeScale + 'x', { onPick: () => { this.timeScale = this.timeScale === 1 ? .25 : this.timeScale === .25 ? .5 : 1; }, onLeft: () => { this.timeScale = this.timeScale === .5 ? .25 : this.timeScale === 1 ? .5 : .25; }, onRight: () => { this.timeScale = this.timeScale === .25 ? .5 : 1; } });
      row('step', 'Frame step (while paused)', '', { onPick: () => { this.step1 = true; } });
      row('free', 'Free camera', this.freeCam ? 'ON' : 'OFF', { onPick: () => { if (this.freeCam) this.freeCam = null; else { const p = s && P ? add(P.run.car.p, [0, 0, 8]) : [2048, 2048, 60]; this.fc = { p, yaw: s && P ? Math.atan2(P.run.car.f[1], P.run.car.f[0]) : 0, pitch: -.3 }; this.freeCam = new FreeCam(); this.freeCam.set(p, add(p, [1, 0, 0]), 70); } } });
      for (const [k, n] of [['probes', 'Show probes'], ['colliders', 'Show colliders'], ['line', 'Show route and racing line'], ['gates', 'Show gates'], ['stats', 'Show FPS and draw stats']]) row(k, n, this.flags[k] ? 'ON' : 'OFF', { onPick: () => { this.flags[k] = !this.flags[k]; } });
      row('unlock', 'Unlock everything', ctx.profile.p.allUnlocked ? 'ON' : 'OFF', { onPick: () => { ctx.profile.p.allUnlocked = !ctx.profile.p.allUnlocked; for (const k of ['STUNTS', 'LOOPS', 'SURFACES', 'SCENERY']) ctx.profile.p.packs[k] = true; ctx.profile.save(); } });
      row('cop', '+1000 coppers', String(ctx.profile.coppers), { onPick: () => { ctx.profile.earn(1000); } });
      row('reset', 'Reset profile', '', { onPick: () => { this.confirmReset = (this.confirmReset || 0) + 1; if (this.confirmReset >= 2) { ctx.profile.reset(); this.confirmReset = 0; toast('PROFILE RESET'); } else toast('PICK AGAIN TO RESET', '#ff9a6a'); } });
      if (this.game.sceneName === 'editor') row('export', 'Export as content (data/tracks.js)', '', { onPick: async () => { const { exportContent } = await import('../editor/editor.js'); const txt = exportContent(); console.log(txt); try { navigator.clipboard.writeText(txt); } catch (e) { /* not allowed */ } toast('EXPORTED: SEE THE CONSOLE (AND CLIPBOARD)'); } });
      row('keep', 'Keep tuning between visits', this.keep ? 'ON' : 'OFF', { onPick: () => { this.keep = !this.keep; this._save(); } });
      row('jump', 'Jump to...', '', { onPick: () => { this.jump = !this.jump; } });
      if (this.jump) for (const [lab, link] of [...TRACKS.map(t => [t.id + ' ' + t.name, 'race/' + t.id]), ...PUZZLES.map(p => [p.id + ' ' + p.name, 'puzzle/' + p.id]), ...ENV_IDS.map(e => ['Gauntlet ' + e, 'survival/' + e]), ['Title', ''], ['Menu', 'menu/main'], ['Editor', 'editor'], ['Garage', 'garage'], ['Replay', 'replay/last'], ['Split screen', 'split/2/S2'], ['Hot seat', 'hotseat/D1'], ['Credits', 'credits'], ['Attract', 'attract'], ['Block lab', 'lab/blocks'], ['Physics lab', 'lab/physics']])
        row('j' + link, '  ' + lab, '#' + link, { onPick: () => { this.hide(); this.jumpTo(link); } });
    } else if (this.tab === 1) {
      const car = this.model;
      for (const [path, label, mn, mx, st] of SLIDERS) {
        const v = cfgGet(path, car), d = cfgDefault(path, car), dec = st < .01 ? 5 : st < .1 ? 2 : st < 1 ? 1 : 0;
        const set = nv => cfgSet(path, car, Math.round(Math.max(mn, Math.min(mx, nv)) / st) * st);
        out.push({ id: path, x, y, w, h: 22, label: label + (path.startsWith('car') || path.endsWith('.car') ? ' (' + car.toUpperCase() + ')' : ''), val: v, min: mn, max: mx, def: d, text: (+v).toFixed(dec) + (v !== d ? ' *' : ''),
          draw: (g, q, foc, k, t) => sliderItem(g, q, foc, k, t, { accent: '#5ad0ff' }), onLeft: () => set(v - st), onRight: () => set(v + st), slide: k => set(cfgGet(path, car) + st * k), reset: () => cfgSet(path, car, d),
          onClick: p => { const f = (p[0] - (x + 6)) / (w - 70); if (f >= 0 && f <= 1) set(mn + f * (mx - mn)); } });
        y += 24;
      }
    }
    // keep the focused row on screen
    const f = out[this.focus.i]; if (f && (f.y > r.H - 60 || f.y < top)) { this.scroll += f.y > r.H - 60 ? f.y - (r.H - 60) : f.y - top; }
    return out;
  }
  teleport(d) {
    const s = ctx.session, P = this.car; if (!s || !P) return; const G = s.course.gates; if (!G.length) return;
    let i = (this._tp ?? -1) + d; i = (i + G.length) % G.length; this._tp = i; const g = G[i];
    P.run.last = { g, fwd: true }; P.run.respawn(); P.run.respawns--; P.cam.snap(); if (P.bot) P.bot.relocate(P.run.car);
  }
  finishNow() { const s = ctx.session, P = this.car; if (!s || !P || P.run.finished) return; const run = P.run; for (const g of s.course.gates) if (g.kind === 'cp') run.cps.add(g.id); run.phase = 'finished'; run.finished = true; run.finishSteps = run.steps; run.ev.push({ type: 'finish', steps: run.steps, delta: null }); this.hide(); }
  award(m) { const s = ctx.session; if (!s) return; const T = ctx.medals[s.track.id] || (s.track.puzzle && ctx.medals[s.track.puzzle.id]); if (!T) { toast('NO MEDALS HERE'); return; } const steps = [0, T.bronze, T.silver, T.gold, T.author][m]; const P = this.car; P.run.steps = steps; this.finishNow(); }
  jumpTo(link) { import('../scenes/front.js').then(m => { if (!link) this.game.go('title'); else m.deepLink(link); }); }
  draw(r) {
    if (!this.open) { if (this.flags.stats) this._stats(r); return; }
    const W = Math.round(r.W * .45);
    r.overlay(g => {
      panel(g, 0, 0, W, r.H, { alpha: .9, border: '#5ad0ff' });
      T2(g, 'DEV MODE', 8, 6, '#5ad0ff');
      TABS.forEach((t, i) => { const x = 8 + i * (W - 16) / 3, on = i === this.tab; panel(g, x, 26, (W - 16) / 3 - 2, 18, { border: on ? '#5ad0ff' : '#3a3658' }); T1(g, t, x + (W - 16) / 6, 31, on ? '#ffffff' : UI.dim, 'center'); });
      if (this.tab === 2) this._info(g, r, W); else {
        g.save(); g.beginPath(); g.rect(0, 48, W, r.H - 72); g.clip();
        this.focus.set(this.items(r)); this.focus.draw(g);
        g.restore(); g._c = null;
        const ck = this.game.input.clicked && this.game.input.clicked(); if (ck && ck[1] > 24 && ck[1] < 46 && ck[0] < W) { this.tab = Math.min(2, Math.floor((ck[0] - 8) / ((W - 16) / 3))); this.focus.i = 0; }
      }
      promptRow(g, 6, r.H - 18, [['=Q/E', 'TAB'], ['confirm', 'DO'], ['left', 'CHANGE'], this.tab === 1 && ['=X', 'RESET'], this.tab === 1 && ['=Y', 'ALL'], ['cancel', 'CLOSE']].filter(Boolean), {});
    });
    if (this.flags.stats) this._stats(r);
  }
  _info(g, r, W) {
    const s = ctx.session, P = this.car, L = [];
    if (P) { const c = P.run.car; L.push('# CAR ' + P.model.toUpperCase(), 'speed ' + c.kmh.toFixed(1) + ' km/h', 'grounded ' + c.grounded + '  surface ' + c.surface, 'block ' + (c.blockId ?? '-') + ' ' + ((s.track.byId(c.blockId) || {}).type || ''), 'kappa ' + c.kappa.toFixed(3) + '  slip ' + c.slip.toFixed(3) + '  load ' + c.load.toFixed(1), 'air ' + c.air.toFixed(2) + ' s (max ' + c.airMax.toFixed(2) + ')  boost ' + c.boostT.toFixed(2), 'p ' + c.p.map(v => v.toFixed(1)).join(', '), '# RUN', 'steps ' + P.run.steps + ' (' + fmt(P.run.steps) + ')', 'checkpoints ' + P.run.cps.size + '/' + s.course.cpCount + '  respawns ' + P.run.respawns, 'phase ' + P.run.phase); }
    if (s) { const T = ctx.medals[s.track.id]; L.push('# TRACK ' + s.track.id + ' ' + s.track.name, 'blocks ' + s.track.blocks.length + '  route ' + (s.track.route().ok ? 'OK' : 'BROKEN'), T ? 'author ' + fmt(T.author) + '  gold ' + fmt(T.gold) : 'no medal times', T ? 'silver ' + fmt(T.silver) + '  bronze ' + fmt(T.bronze) : ''); }
    const w = ctx.worlds.world; L.push('# BUILD', 'CRACKMANIA 1.0.0 · ' + E.versionLabel(), 'backend ' + E.World3D.backend, w ? 'draw calls ' + w.stats.calls + '  triangles ' + w.stats.tris : '');
    let y = 52; for (const l of L) { T1(g, l.replace(/^# /, ''), 10, y, l.startsWith('#') ? '#5ad0ff' : '#ffffff'); y += l.startsWith('#') ? 14 : 11; }
  }
  _stats(r) { const w = ctx.worlds.world; r.overlay(g => { const st = this.game.stats || {}; T1(g, 'FPS ' + Math.round(1000 / (st.frameMs || 16.7)) + ' · CALLS ' + (w ? w.stats.calls : 0) + ' · TRIS ' + (w ? w.stats.tris : 0) + ' · ' + E.World3D.backend, r.W - 8, 46, '#5ad0ff', 'right'); }); }
  /** the dev drawings in 3D: probes, colliders, the racing line, gates */
  draw3d(pen, w, P) {
    const s = ctx.session; if (!s || !P) return; const c = P.run.car;
    if (this.flags.probes) { const T = P.run.T, hw = T.wheelbase / 2, ht = T.track / 2; for (const [lx, ly] of [[hw, -ht], [hw, ht], [-hw, -ht], [-hw, ht]]) { const o = add(add(add(c.p, c.f, lx), c.r, ly), c.u, .5), e = add(o, c.u, -(.5 + T.ride + .9)); pen.at().bar(o[0] * U, o[1] * U, o[2] * U, e[0] * U, e[1] * U, e[2] * U, 2, 2, c.grounded ? '#5aff7a' : '#ff5a4a'); } const n = add(c.p, c.n, 3); pen.at().bar(c.p[0] * U, c.p[1] * U, c.p[2] * U, n[0] * U, n[1] * U, n[2] * U, 3, 3, '#5ad0ff'); }
    if (this.flags.line && P.bot) { const Q = P.bot.P.q; for (let i = 1; i < Q.length; i += 2) { const a = Q[i - 1], b = Q[i]; if (Math.hypot(a[0] - c.p[0], a[1] - c.p[1]) > 300) continue; pen.at().bar(a[0] * U, a[1] * U, (a[2] + .3) * U, b[0] * U, b[1] * U, (b[2] + .3) * U, 4, 2, '#ffd060'); } }
    else if (this.flags.line) { const S = s.course.samples; for (let i = 1; i < S.length; i++) { const a = S[i - 1].p, b = S[i].p; if (Math.hypot(a[0] - c.p[0], a[1] - c.p[1]) > 300) continue; pen.at().bar(a[0] * U, a[1] * U, (a[2] + .3) * U, b[0] * U, b[1] * U, (b[2] + .3) * U, 4, 2, '#ffd060'); } }
    if (this.flags.gates) { pen.ghost = true; for (const g of s.course.gates) { pen.frame(g.p[0] * U, g.p[1] * U, g.p[2] * U, g.t, g.r, g.u, U).box(0, 0, 3, .3, g.hw * 2, 8, g.kind === 'cp' ? '#5ab4ff' : '#ff5a4a'); } pen.ghost = false; }
    if (this.flags.colliders) { const geo = s.course.geo; for (const [id, gg] of geo) { const b = s.track.byId(id); if (!b) continue; const f = frameAt(b, 0); if (Math.hypot(f.p[0] - c.p[0], f.p[1] - c.p[1]) > 90) continue; for (const C of gg.coll) for (let i = 0; i < C.idx.length; i += 9) { const k = C.idx[i] * 3, l = C.idx[i + 1] * 3, P2 = C.pos; pen.at().bar(P2[k] * U, P2[k + 1] * U, (P2[k + 2] + .05) * U, P2[l] * U, P2[l + 1] * U, (P2[l + 2] + .05) * U, 1.5, 1.5, C.surface === 'wall' ? '#ff5a4a' : '#5aff7a'); } } }
    pen.at();
  }
}
