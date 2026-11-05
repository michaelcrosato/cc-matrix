// Dev mode (§3.15), reached from the pause menu (and OPTIONS > DEV MODE): CHEATS, TUNING (every gameplay variable as a
// live slider, reset per row and RESET ALL), WORLD (time scale, teleport, free camera, overlays), INFO (live numbers).
// The race holds still while the panel is open; Esc / ○ closes it back to the pause menu
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const T = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
SN.devCheats = { god: false, infiniteWeapon: false, giveWeapon: null, aiWeaponsOff: false, freezeAI: false, ghostAI: false };
const TABS = ['CHEATS', 'TUNING', 'WORLD', 'INFO'];
const Dev = SN.Dev = {
  open: false, tab: 0, row: 0, scroll: 0, hudOff: false, overlay: false, giveK: 0, tp: .5, ts: 1, confirmReset: false, rects: [], dragging: null,
  race() { return SN.game.sceneName === 'race' && SN.scenes.race.race; },
  show() { this.open = true; this.row = 0; this.scroll = 0; this.confirmReset = false; const g = SN.game, sc = g.scene; if (g.shell && g.shell._stack && g.shell._stack.length) g.shell.hide(); if (g.paused) g.resume(); if (sc && sc.pausable) { this._held = sc; sc.pausable = false; } SN.game.input.consumeAll(); SN.sfx('ui_ok'); },   // (Esc is the panel's while it is open, not the engine's pause key)
  close() { this.open = false; SN.game.input.consumeAll(); SN.sfx('ui_back'); if (this._held) { this._held.pausable = true; this._held = null; } if (SN.game.sceneName === 'race') SN.game.pause(); },
  apply() { const R = this.race(); if (R) Object.assign(R.cheats, SN.devCheats); },
  rows() {
    const R = this.race(), me = R && R.humans[0], ch = SN.devCheats, onoff = v => v ? 'ON' : 'OFF', toggle = k => ({ value: () => onoff(ch[k]), act: () => { ch[k] = !ch[k]; this.apply(); } });
    if (this.tab === 0) return [
      Object.assign({ label: 'GOD MODE' }, toggle('god')), Object.assign({ label: 'INFINITE WEAPON' }, toggle('infiniteWeapon')),
      { label: 'GIVE WEAPON', value: () => SN.WEAPONS[this.giveK].name, left: () => { this.giveK = (this.giveK + 9) % 10; }, right: () => { this.giveK = (this.giveK + 1) % 10; }, act: () => { ch.giveWeapon = SN.WEAPONS[this.giveK].id; this.apply(); if (me) R.weapons.give(me, ch.giveWeapon); } },
      Object.assign({ label: 'AI WEAPONS OFF' }, toggle('aiWeaponsOff')), Object.assign({ label: 'FREEZE AI' }, toggle('freezeAI')), Object.assign({ label: 'GHOST AI (NO COLLISIONS)' }, toggle('ghostAI')),
      { label: 'REFILL ENERGY', act: () => { if (me) me.energy = 100; }, need: true }, { label: 'ENERGY TO 10%', act: () => { if (me) me.energy = 10; }, need: true },
      { label: 'SKIP TO FINAL LAP', act: () => { if (me && R.laps < 50) { me.p = (R.laps - 1) * R.track.L + me.s; me.lap = R.laps - 1; } }, need: true },
      { label: 'WIN NOW', act: () => { if (!me) return; if (R.mode === 'snipeout') { me.points = R.target; } else if (R.mode === 'overclock') { R.zone += 10; } else if (R.mode === 'academy' && SN.Academy.R === R) { SN.Academy.passed = 11; SN.Academy.finish(); this.open = false; } else { for (const s of R.ships) if (s !== me && !s.finished) s.p = Math.min(s.p, me.p - 2000); me.p = R.laps * R.track.L - 50; me.lap = R.laps - 1; } }, need: true },
      { label: 'ELIMINATE ALL AI', act: () => { if (R) for (const s of R.ships) if (s.control === 'ai' && !s.elim) SN.Ship.eliminate(s, R, me, 'dev'); }, need: true },
      { label: 'UNLOCK EVERYTHING', act: () => { const d = SN.save.data; d.unlocked.classes = SN.CLASSES.map(c => c.id); d.unlocked.champion = true; for (const e of Object.keys(SN.SEASON.events)) if (!d.medals[e]) d.medals[e] = 'bronze'; d.started = true; SN.Save.write(); SN.HUD && SN.HUD.p && SN.HUD.note('UNLOCKED', 0); } },
      { label: this.confirmReset ? 'RESET SEASON: SURE? PRESS AGAIN' : 'RESET SEASON PROGRESS', act: () => { if (!this.confirmReset) { this.confirmReset = true; return; } this.confirmReset = false; SN.Save.reset(); } }
    ];
    if (this.tab === 1) {
      const out = [{ label: 'RESET ALL TO DEFAULTS', act: () => SN.Tune.reset() }];
      for (const [g, keys] of Object.entries(SN.Tune.groups())) { out.push({ label: g.toUpperCase(), head: true }); for (const k of keys) { const d = SN.Tune.defs[k]; out.push({ key: k, label: d.label, slider: d, left: () => { SN.Tune.T[k] = Math.max(d.min, +(SN.Tune.T[k] - d.step).toFixed(4)); }, right: () => { SN.Tune.T[k] = Math.min(d.max, +(SN.Tune.T[k] + d.step).toFixed(4)); }, act: () => SN.Tune.reset(k) }); } }
      return out;
    }
    if (this.tab === 2) {
      const sc = SN.scenes.race, view = sc.vw, cam = view && view.cams[0];
      return [
        { label: 'TIME SCALE', value: () => '×' + this.ts, left: () => { this.ts = [.25, .5, 1, 2][Math.max(0, [.25, .5, 1, 2].indexOf(this.ts) - 1)]; SN.game.timeScale = this.ts; }, right: () => { this.ts = [.25, .5, 1, 2][Math.min(3, [.25, .5, 1, 2].indexOf(this.ts) + 1)]; SN.game.timeScale = this.ts; }, act: () => { this.ts = 1; SN.game.timeScale = 1; } },
        { label: 'TELEPORT: LAP %', value: () => Math.round(this.tp * 100) + '%  [GO]', left: () => { this.tp = Math.max(0, this.tp - .05); }, right: () => { this.tp = Math.min(.99, this.tp + .05); }, act: () => { if (me) { const s = this.tp * R.track.L; SN.Ship.place(me, R, s, 0, me.st.top * .5); me.p = me.lap * R.track.L + s; me._lastS = s; } }, need: true },
        { label: 'FREE CAMERA', value: () => onoff(cam && cam.free), act: () => { if (!cam) return; if (cam.free) cam.free = null; else { const p = view.world ? view.world.camera.pose || {} : {}; cam.free = { x: p.x || me.P[0], y: p.y || me.P[1], z: p.z || me.P[2] + 100, yaw: p.yaw || 0, pitch: p.pitch || -.2 }; } }, need: true },
        { label: 'OVERCLOCK ZONE +1', act: () => { if (R && R.mode === 'overclock') { R.zone++; R.emit({ t: 'zone', n: R.zone }); } }, need: true },
        { label: 'WEATHER', value: () => onoff(view && view.weather ? view.weather.on : false), act: () => { if (view && view.weather) view.weather.on = !view.weather.on; }, need: true },
        { label: 'HUD', value: () => onoff(!this.hudOff), act: () => { this.hudOff = !this.hudOff; } },
        { label: 'DEBUG OVERLAY', value: () => onoff(this.overlay), act: () => { this.overlay = !this.overlay; } }
      ];
    }
    return [];
  },
  update(dt) {
    const I = SN.game.input, rows = this.rows(), R = this.race();
    if (I.pressed('cancel') || I.pressed('pause')) { I.consumeAll(); this.close(); return; }
    if (I.pressed('tabL') || I.pressed('tabR')) { this.tab = (this.tab + (I.pressed('tabL') ? 3 : 1)) % 4; this.row = 0; this.scroll = 0; SN.sfx('ui_tab'); }
    const pick = d => { let k = this.row; for (let n = 0; n < rows.length; n++) { k = (k + d + rows.length) % rows.length; if (!rows[k].head) break; } this.row = k; SN.sfx('ui_move'); };
    if (rows.length) { if (I.repeat('up', .25, .05)) pick(-1); if (I.repeat('down', .25, .05)) pick(1); }
    const row = rows[this.row];
    if (row) {
      const fast = I.repeat('left', .25, .03) || I.repeat('right', .25, .03);
      if (I.repeat('left', .25, .03) && row.left) row.left(); if (I.repeat('right', .25, .03) && row.right) row.right();
      if (I.pressed('confirm') && row.act && !(row.need && !R)) { row.act(); SN.sfx('ui_ok'); }
    }
    // the mouse: hover, click, drag on a slider's bar, click a tab or a reset
    const p = I.pointer(), ck = I.clicked();
    if (p && I.lastDevice === 'mouse') { const k = this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0 && rows[k] && !rows[k].head) this.row = k; }
    if (ck) { for (const t of this.tabRects || []) if (ck[0] >= t[0] && ck[0] < t[0] + t[2] && ck[1] >= t[1] && ck[1] < t[1] + t[3]) { this.tab = t[4]; this.row = 0; this.scroll = 0; } if (this.closeRect && ck[0] >= this.closeRect[0] && ck[0] < this.closeRect[0] + this.closeRect[2] && ck[1] >= this.closeRect[1] && ck[1] < this.closeRect[1] + this.closeRect[3]) { this.close(); return; } const r = this.rects[this.row]; if (r && rows[this.row] && ck[1] >= r[1] && ck[1] < r[1] + r[3]) { const rw = rows[this.row]; if (rw.slider && this.bar && ck[0] >= this.bar[0] && ck[0] < this.bar[0] + this.bar[1]) this.dragging = rw.key; else if (rw.slider && ck[0] >= r[0] + r[2] - 16) rw.act(); else if (!rw.slider && rw.act && !(rw.need && !R)) rw.act(); } }
    if (this.dragging && p && I.down('fire')) { const d = SN.Tune.defs[this.dragging], k = Math.max(0, Math.min(1, (p[0] - this.bar[0]) / this.bar[1])); SN.Tune.T[this.dragging] = Math.round((d.min + (d.max - d.min) * k) / d.step) * d.step; } else this.dragging = null;
  },
  draw(r) {
    r.overlay(g => {
      const Wd = r.W, H = r.H, x = Math.max(6, Wd / 2 - 200), w = Math.min(400, Wd - 12), y = 8, h = H - 16, R = this.race(), I = SN.game.input;
      E.px.blend(g, .92, 'normal', () => px.rect(g, x, y, w, h, '#05060c')); px.rect(g, x, y, w, 1, '#ff3ab4'); px.rect(g, x, y + h - 1, w, 1, '#ff3ab4');
      T(g, 'DEV MODE', x + 8, y + 6, '#ff3ab4', { scale: 2 });
      this.closeRect = [x + w - 52, y + 4, 46, 14]; px.rect(g, ...this.closeRect, '#3a1030'); T(g, 'CLOSE', x + w - 29, y + 7, '#ffffff', { align: 'center' });
      this.tabRects = []; let tx = x + 100; TABS.forEach((t, k) => { const tw = E.font.width(t) + 12; this.tabRects.push([tx, y + 4, tw, 14, k]); px.rect(g, tx, y + 4, tw, 14, k === this.tab ? '#ff3ab4' : '#1a1a2a'); T(g, t, tx + 6, y + 7, '#ffffff'); tx += tw + 3; });
      const rows = this.rows(), rh = 13, top = y + 26, vis = Math.floor((h - 50) / rh);
      if (this.row < this.scroll) this.scroll = this.row; if (this.row >= this.scroll + vis) this.scroll = this.row - vis + 1;
      this.rects = [];
      if (this.tab === 3) return this.info(g, x + 8, top, w - 16, R);
      rows.forEach((rw, k) => {
        if (k < this.scroll || k >= this.scroll + vis) return;
        const yy = top + (k - this.scroll) * rh, on = k === this.row, dis = rw.need && !R; this.rects[k] = [x + 4, yy - 1, w - 8, rh];
        if (rw.head) { T(g, rw.label, x + 8, yy + 2, '#29c8e8', { font: 'tiny' }); return; }
        if (on) { px.rect(g, x + 4, yy - 1, w - 8, rh, '#1a5a78'); px.rect(g, x + 4, yy - 1, 2, rh, '#ffffff'); }
        T(g, rw.label, x + 10, yy + 1, dis ? '#4a5470' : '#ffffff');
        if (rw.slider) {
          const d = rw.slider, v = SN.Tune.T[rw.key], k2 = (v - d.min) / (d.max - d.min), bx = x + 150, bw = w - 230; this.bar = [bx, bw];
          px.rect(g, bx, yy + 3, bw, 4, '#2a3048'); px.rect(g, bx, yy + 3, Math.round(bw * k2), 4, v === d.def ? '#29c8e8' : '#ffd23f'); px.rect(g, bx + Math.round(bw * (d.def - d.min) / (d.max - d.min)), yy + 1, 1, 8, '#ffffff');
          T(g, String(+v.toFixed(3)), x + w - 24, yy + 1, v === d.def ? '#9aa6c0' : '#ffd23f', { align: 'right' }); T(g, '↺'.replace('↺', 'R'), x + w - 14, yy + 1, '#ff3ab4');
        } else if (rw.value) T(g, rw.value(), x + w - 12, yy + 1, '#ffd23f', { align: 'right' });
      });
      const items = [['menu', 'MOVE'], ['confirm', this.tab === 1 ? 'RESET ROW' : 'APPLY'], ['tabL', ''], ['tabR', 'TAB'], ['cancel', 'CLOSE']];
      SN.glyph.row(g, I, items, x + 8, y + h - 16);
    });
  },
  info(g, x, y, w, R) {
    const me = R && R.humans[0], view = SN.view, wd = view && view.world, rows = me ? [
      ['s / u / h', me.s.toFixed(0) + ' / ' + me.u.toFixed(1) + ' / ' + me.h.toFixed(1)], ['progress p', me.p.toFixed(0)], ['speed', SN.Ship.speed(me).toFixed(0) + ' u/s  ' + (SN.Ship.speed(me) * SN.KMH).toFixed(0) + ' km/h'],
      ['energy', me.energy.toFixed(1)], ['lap / sector', me.lap + ' / ' + me.sector], ['position', me.place + ' / ' + R.ships.length], ['airborne', me.grounded ? 'no' : me.airT.toFixed(2) + ' s'],
      ['slice / kind', R.track.idx(me.s) + ' / ' + ['deck', 'gap', 'drop'][R.track.kind[R.track.idx(me.s)]]], ['seed', String(R.seed)], ['hash', R.hash()], ['mode / class', R.mode + ' / ' + R.cls]
    ] : [['race', 'none (front end)']];
    rows.push(['3D backend', E.World3D ? E.World3D.backend : 'none'], ['draw calls / tris', wd ? wd.stats.calls + ' / ' + wd.stats.tris : '-'], ['frame ms', wd ? wd.stats.drawMs.toFixed(1) : '-'], ['fps', String(SN.game.fps || '-')], ['tuning changed', SN.Tune.changed().join(', ') || 'none']);
    rows.forEach(([a, b], k) => { T(g, a, x, y + k * 11, '#29c8e8'); T(g, b, x + 120, y + k * 11, '#ffffff'); });
  },
  /** the debug overlay in 3D: the racing line coloured by target speed, collision spheres, pads, camera spots */
  draw3d(pen, R, view) {
    if (!this.overlay || !R) return; const Tk = R.track, me = view.cams[0].ship || R.ships[0];
    for (let d = -400; d < 2400; d += 48) { const s = SN.wrap(me.s + d, Tk.L), p = Tk.point(s, Tk.line(s), 6), k = Tk.vline(s, R.cls) / (SN.CLASS[R.cls].top); pen.glow(p[0], p[1], p[2], 2.5, k > .95 ? '#5aff5a' : k > .75 ? '#ffd23f' : '#ff3a3a'); const c = Tk.point(s, 0, 3); pen.glow(c[0], c[1], c[2], 1.2, '#ffffff'); }
    for (const sh of R.ships) for (const o of [-26, 26]) { const cx = sh.P[0] + sh.F[0] * o, cy = sh.P[1] + sh.F[1] * o, cz = sh.P[2] + sh.F[2] * o; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; pen.glow(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, cz, 1.2, '#ff3ab4'); } }   // (rings, so the craft stays visible)
    for (const pd of Tk.pads) { if (Math.abs(SN.wrapDiff(me.s, pd.s, Tk.L)) > 3000) continue; for (const [a, b] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) { const p = Tk.point(pd.s + a * pd.hl, pd.u + b * pd.hwid, 4); pen.glow(p[0], p[1], p[2], 2, pd.kind === 'speed' ? '#3ad8ff' : '#ffb000'); } }
    for (const sp of view.spots) if (Math.abs(SN.wrapDiff(me.s, sp.s, Tk.L)) < 4000) pen.glow(sp.x, sp.y, sp.z, 5, '#ffffff');
  }
};
})();
