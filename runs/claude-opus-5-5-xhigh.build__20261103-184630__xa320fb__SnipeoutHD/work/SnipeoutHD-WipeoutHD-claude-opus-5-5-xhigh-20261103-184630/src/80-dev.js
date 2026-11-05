// SNIPEOUT HD: dev mode, from the pause menu (and OPTIONS ▸ DEV MODE). Four tabs: CHEATS, TUNING (every important
// gameplay number as a live slider, a reset per row and RESET ALL TO DEFAULTS), WORLD (time scale, teleport, the free
// camera, the overclock zone, weather, HUD, the debug overlay) and INFO (the live state). Controller, keyboard and
// mouse all work: L1 / R1, Q / E or a click switch tabs; up and down pick a row; left and right (held: faster) or a drag
// on the bar change a slider; ✕ / Enter / a click acts; △ / Tab resets the row; ○ / Esc closes.
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px, V = SN.v, U = 16;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o));
const TW = (s, o = {}) => E.font.width(s, o);
const TABS = ['CHEATS', 'TUNING', 'WORLD', 'INFO'];
const D = SN.dev = {
  isOpen: false, race: null, tab: 0, focus: 0, group: 0, give: 0, confirmReset: false, timeScale: 1, teleport: 50, hold: 0, rows: [], onClose: null,
  open(race, onClose) { D.isOpen = true; D.race = race; D.focus = 0; D.confirmReset = false; D.onClose = onClose || null; SN.audio.sfx('ui_ok'); },
  close() { D.isOpen = false; SN.audio.sfx('ui_back'); const f = D.onClose; D.onClose = null; if (f) f(); },
  player() { return D.race && D.race.player; },
  cheatRows() {
    const R = D.race, pl = D.player(), C = SN.cheats, tog = (label, key) => ({ label, value: () => C[key] ? 'ON' : 'OFF', act: () => { C[key] = !C[key]; } });
    return [
      tog('God mode (no damage)', 'god'), tog('Infinite weapon', 'infiniteWeapon'),
      { label: 'Give weapon', value: () => SN.WEAPONS[SN.WEAPON_ORDER[D.give]].name, left: () => { D.give = (D.give + 9) % 10; }, right: () => { D.give = (D.give + 1) % 10; }, act: () => { if (R && pl) R.weapons.give(pl, SN.WEAPON_ORDER[D.give]); }, need: true },
      tog('AI weapons off', 'aiWeaponsOff'), tog('Freeze AI', 'freezeAI'), tog('Ghost AI (no collisions)', 'ghostAI'),
      { label: 'Refill energy', act: () => { if (pl) pl.energy = 100; }, need: true }, { label: 'Energy to 10%', act: () => { if (pl) pl.energy = 10; }, need: true },
      { label: 'Skip to final lap', act: () => { if (R && pl && !R.rules.endRun) { const L = R.track.L, want = (R.laps - 1); while ((pl.lapsDone || 0) < want) { pl.p += L; pl.lapsDone = (pl.lapsDone || 0) + 1; pl.laps.push(0); } pl.sector = 0; R.events.push({ t: 'finallap', ship: pl }); } }, need: true },
      { label: 'Win now', act: () => { if (!R || !pl) return; if (R.state === 'intro' || R.state === 'grid' || R.state === 'countdown') R._go(); if (R.mode === 'overclock') R.zoneUp(10); else if (R.rules.target) { pl.points = R.rules.target; } else { for (const s of R.ships) if (s !== pl && !s.finished) { s.p = Math.min(s.p, pl.p - 2000); } pl.p = Math.max(pl.p, (R.laps) * R.track.L - 10); pl.lapsDone = R.laps; R._finish(pl); } }, need: true },
      { label: 'Eliminate all AI', act: () => { if (R) for (const s of R.ships) if (s.control === 'ai' && !s.elim) R.eliminate(s, null, 'dev'); }, need: true },
      { label: 'Unlock everything', act: () => { const d = SN.save.data; d.unlocked.classes = SN.CLASS_ORDER.slice(); d.unlocked.champion = true; for (const e of ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10']) d.medals[e] = d.medals[e] || 'bronze'; d.started = true; SN.save.write(); } },
      { label: D.confirmReset ? 'Reset season: press again to confirm' : 'Reset season progress', act: () => { if (!D.confirmReset) { D.confirmReset = true; return; } D.confirmReset = false; SN.save.reset(); } }
    ];
  },
  tuneRows() {
    const groups = SN.Tune.groups(), G0 = groups[D.group];
    const rows = [{ label: 'GROUP', value: () => G0 + ' (' + (D.group + 1) + '/' + groups.length + ')', left: () => { D.group = (D.group + groups.length - 1) % groups.length; }, right: () => { D.group = (D.group + 1) % groups.length; } }];
    for (const k of SN.Tune.inGroup(G0)) { const sp = SN.Tune.specs[k]; rows.push({ key: k, label: sp.label, slider: sp }); }
    rows.push({ label: 'RESET ALL TO DEFAULTS', act: () => SN.Tune.reset() });
    return rows;
  },
  worldRows() {
    const R = D.race, F = SN.flags, tog = (label, key) => ({ label, value: () => F[key] ? 'ON' : 'OFF', act: () => { F[key] = !F[key]; } }), TS = [.25, .5, 1, 2];
    return [
      { label: 'Time scale', value: () => '×' + D.timeScale, left: () => { D.timeScale = TS[Math.max(0, TS.indexOf(D.timeScale) - 1)]; E.current.timeScale = D.timeScale; }, right: () => { D.timeScale = TS[Math.min(3, TS.indexOf(D.timeScale) + 1)]; E.current.timeScale = D.timeScale; } },
      { label: 'Teleport to', value: () => D.teleport + '% OF THE LAP', left: () => { D.teleport = Math.max(0, D.teleport - 5); }, right: () => { D.teleport = Math.min(95, D.teleport + 5); }, act: () => { if (R && R.player) SN.debugTeleport(R, R.track.L * D.teleport / 100, 0, R.player.speed); }, need: true },
      tog('Free camera', 'freeCam'),
      { label: 'Overclock zone +1', act: () => { if (R && R.mode === 'overclock') R.zoneUp(1); }, need: true },
      tog('Weather', 'weather'), tog('HUD', 'hud'), tog('Debug overlay', 'debug')
    ];
  },
  update(dt, I) {
    if (I.pressed('tabL')) { D.tab = (D.tab + 3) % 4; D.focus = 0; SN.audio.sfx('ui_tab'); }
    if (I.pressed('tabR')) { D.tab = (D.tab + 1) % 4; D.focus = 0; SN.audio.sfx('ui_tab'); }
    if (I.pressed('cancel')) { I.consumeAll(); D.close(); return; }
    const rows = D.rows = D.tab === 0 ? D.cheatRows() : D.tab === 1 ? D.tuneRows() : D.tab === 2 ? D.worldRows() : [];
    const n = rows.length;
    if (n) { if (I.repeat('up')) { D.focus = (D.focus + n - 1) % n; SN.audio.sfx('ui_move'); } if (I.repeat('down')) { D.focus = (D.focus + 1) % n; SN.audio.sfx('ui_move'); } }
    D.focus = Math.min(D.focus, Math.max(0, n - 1));
    const r = rows[D.focus];
    // sliders: left / right step (held: it speeds up), △ resets the row
    const held = I.down('left') || I.down('right'); D.hold = held ? D.hold + dt : 0;
    const fast = D.hold > 1.2 ? 10 : D.hold > .5 ? 3 : 1;
    if (r && r.slider) {
      const sp = r.slider; if (I.repeat('left', .3, .05)) SN.Tune.set(r.key, SN.Tune.T[r.key] - sp.step * fast); if (I.repeat('right', .3, .05)) SN.Tune.set(r.key, SN.Tune.T[r.key] + sp.step * fast);
      if (I.pressed('more')) SN.Tune.reset(r.key);
    } else if (r) { if (I.repeat('left') && r.left) { r.left(); SN.audio.sfx('ui_tab'); } if (I.repeat('right') && r.right) { r.right(); SN.audio.sfx('ui_tab'); } if (I.pressed('confirm') && r.act) { D.run(r); I.consumeAll(); } }
    // the mouse: hover moves the focus; a click on a tab, a row, a bar (drag), the reset icon
    const p = I.pointer(), c = I.clicked(), L = D._layout;
    if (L && p && I.lastDevice === 'mouse') { const k = L.rows.findIndex(q => p[1] >= q[1] && p[1] < q[1] + q[3] && p[0] >= q[0] && p[0] < q[0] + q[2]); if (k >= 0 && k !== D.focus && D._lp && (D._lp[0] !== p[0] || D._lp[1] !== p[1])) D.focus = k; }
    D._lp = p ? p.slice() : null;
    if (L && p && I.down('fire') && I.lastDevice === 'mouse' && r && r.slider) { const q = L.bars[D.focus]; if (q && p[0] >= q[0] - 4 && p[0] <= q[0] + q[2] + 4 && Math.abs(p[1] - (q[1] + 3)) < 8) { const sp = r.slider; SN.Tune.set(r.key, sp.min + (sp.max - sp.min) * E.clamp((p[0] - q[0]) / q[2], 0, 1)); } }
    if (c && L) {
      const tk = L.tabs.findIndex(q => c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]); if (tk >= 0) { D.tab = tk; D.focus = 0; I.consumeAll(); return; }
      if (L.close && c[0] >= L.close[0] && c[0] < L.close[0] + L.close[2] && c[1] >= L.close[1] && c[1] < L.close[1] + L.close[3]) { I.consumeAll(); D.close(); return; }
      const rk = L.resets.findIndex(q => q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]); if (rk >= 0) { SN.Tune.reset(rows[rk].key); I.consumeAll(); return; }
      const k = L.rows.findIndex(q => c[1] >= q[1] && c[1] < q[1] + q[3] && c[0] >= q[0] && c[0] < q[0] + q[2]);
      if (k >= 0) { D.focus = k; const rr = rows[k]; if (rr.slider) { } else if (rr.act) D.run(rr); else if (rr.right) rr.right(); I.consumeAll(); }
    }
  },
  run(r) { if (r.need && !D.race) { SN.UI.flash = { t: SN.UI.t, text: 'START A RACE FOR THIS ONE' }; SN.audio.sfx('ui_locked'); return; } r.act(); SN.audio.sfx('ui_ok'); },
  draw(r) {
    if (!D.isOpen) return;
    r.overlay(g => {
      const W = Math.min(r.W - 16, 400), H = r.H - 16, x0 = (r.W - W) / 2, y0 = 8, L = D._layout = { tabs: [], rows: [], bars: [], resets: [], close: null };
      g.save(); g.globalAlpha = .9; g.fillStyle = '#060812'; g.fillRect(x0, y0, W, H); g.restore(); g._c = null; px.rect(g, x0, y0, W, 1, '#ff3ab4');
      T(g, 'DEV MODE', x0 + 6, y0 + 4, '#ff3ab4', { scale: 2 });
      const cw = 44; L.close = [x0 + W - cw - 4, y0 + 3, cw, 14]; px.rect(g, L.close[0], L.close[1], cw, 14, '#2a0a1a'); T(g, 'CLOSE', L.close[0] + 9, L.close[1] + 4, '#ffffff');
      let tx = x0 + 96; TABS.forEach((t, k) => { const w = TW(t) + 12; L.tabs.push([tx, y0 + 4, w, 13]); px.rect(g, tx, y0 + 4, w, 13, k === D.tab ? '#ff3ab4' : '#1a1a2a'); T(g, t, tx + 6, y0 + 7, k === D.tab ? '#05040c' : '#c8c8d8', { outline: false }); tx += w + 3; });
      const I = E.current.input, ry0 = y0 + 24, rh = 14;
      if (D.tab === 3) { D.info(g, x0 + 8, ry0, W - 16); }
      else D.rows.forEach((row, k) => {
        const y = ry0 + k * rh, f = k === D.focus; L.rows.push([x0 + 4, y - 2, W - 8, rh]);
        if (f) { px.rect(g, x0 + 4, y - 2, W - 8, rh - 1, '#16243a'); px.rect(g, x0 + 4, y - 2, 2, rh - 1, '#ffffff'); T(g, '▸', x0 + 8, y + 1, '#ffffff'); }
        T(g, row.label, x0 + 16, y + 1, f ? '#ffffff' : '#b8c4dc');
        if (row.slider) {
          const sp = row.slider, v = SN.Tune.T[row.key], bx = x0 + W * .48, bw = W * .3, k2 = (v - sp.min) / (sp.max - sp.min), dk = (sp.def - sp.min) / (sp.max - sp.min);
          px.rect(g, bx, y + 2, bw, 5, '#1a1a2a'); px.rect(g, bx, y + 2, Math.round(bw * k2), 5, SN.Tune.isDefault(row.key) ? '#29c8e8' : '#ffd36a'); px.rect(g, bx + Math.round(bw * dk), y, 1, 9, '#ffffff'); L.bars[k] = [bx, y, bw, 5];
          T(g, (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2)) + '', bx + bw + 6, y + 1, '#ffffff');
          if (!SN.Tune.isDefault(row.key)) { L.resets[k] = [x0 + W - 18, y - 1, 12, 11]; T(g, '↺', x0 + W - 16, y + 1, '#ffd36a'); }
        } else if (row.value) T(g, (row.left ? '◀ ' : '') + row.value() + (row.right ? ' ▶' : ''), x0 + W - 10, y + 1, '#ffd36a', { align: 'right' });
      });
      if (D.tab === 1) T(g, 'Dot: default · amber: changed · ↺ or ' + I.label('more') + ' resets a row', x0 + 8, y0 + H - 26, '#7a8aa8', { font: 'tiny' });
      SN.glyph.bar(g, [['tabL', ''], ['tabR', 'TAB'], ['confirm', 'DO'], D.tab === 1 ? ['more', 'RESET ROW'] : null, ['cancel', 'CLOSE']].filter(Boolean), x0 + W - 6, y0 + H - 16, { right: true });
      if (SN.UI.flash && SN.UI.t - SN.UI.flash.t < 1.6) T(g, SN.UI.flash.text, r.W / 2, y0 + H / 2, '#ff8a8a', { scale: 2, align: 'center' });
    });
  },
  info(g, x, y, w) {
    const R = D.race, s = D.player(), tw = SN.render.tw, W = tw && tw.world, lines = [];
    if (s) {
      const srf = R.track.surface(s.s, s.u);
      lines.push(['s / u / h', (s.s / U).toFixed(1) + ' m  ' + (s.u / U).toFixed(2) + ' m  ' + (s.h / U).toFixed(2) + ' m'], ['progress', (s.p / U).toFixed(0) + ' m  lap ' + s.lap + '  sector ' + s.sector],
        ['speed', s.speed.toFixed(0) + ' u/s  ' + s.kmh.toFixed(0) + ' km/h  top ' + (s.st.top * s.topK * SN.KMH).toFixed(0)], ['energy', s.energy.toFixed(1) + '  place ' + s.place], ['airborne', (s.grounded ? 'no' : 'yes ' + s.airT.toFixed(2) + ' s')],
        ['slice', R.track.idx(s.s) + ' / ' + R.track.N + '  ' + srf.kind + (srf.ceil ? ' tunnel' : '') + (srf.pit ? ' pit' : '')], ['seed / hash', R.seed + '  ' + R.hash()], ['race', R.mode + ' ' + R.cls + ' ' + R.state + ' t ' + R.t.toFixed(2)]);
    } else lines.push(['race', 'none (open dev mode from the pause menu in a race for the live values)']);
    lines.push(['backend', E.World3D ? E.World3D.backend : 'none (headless)']);
    if (W) lines.push(['world', W.stats.calls + ' calls  ' + Math.round(W.stats.tris / 1000) + 'k tris  ' + W.stats.drawMs.toFixed(1) + ' ms']);
    lines.push(['steps / s', String(Math.round(E.current.fps || 0)) + ' fps']);
    lines.forEach(([k, v], i) => { T(g, k, x, y + i * 12, '#7af0ff'); T(g, v, x + 80, y + i * 12, '#ffffff'); });
  }
};
/** put the player at (s, u) at speed v (dev and tests) */
SN.debugTeleport = (R, s, u = 0, v = 0) => { const pl = R.player; if (!pl) return; const sOld = pl.s; pl.putOn(R.track, s, u, v); pl.p += R.track.dS(sOld, pl.s); pl.rescue = null; };
/** the debug overlay in 3D: the centre line, slice frames, the racing line by target speed, collision spheres, pads, AI targets, camera spots */
SN.debugDraw = (w, race) => {
  if (!SN.flags.debug || !race) return;
  const T0 = race.track, pen = w.pen, pl = race.player || race.ships[0]; pen.at();
  const i0 = T0.idx(pl.s - 200 * U), prof = T0.vprof[race.cls];
  for (let n = 0; n < 220; n += 2) {
    const i = (i0 + n) % T0.N, j = (i + 2) % T0.N;
    pen.tube(T0.Cx[i], T0.Cy[i], T0.Cz[i] + 4, T0.Cx[j], T0.Cy[j], T0.Cz[j] + 4, 1, '#ffffff');
    const a = T0.point(i * T0.ds, T0.lineU[i], 6), b = T0.point(j * T0.ds, T0.lineU[j], 6), k = Math.min(1, prof[i] / SN.CLASSES[race.cls].top);
    pen.tube(a[0], a[1], a[2], b[0], b[1], b[2], 2, SN.hsl(120 * k, 100, 55));
    if (n % 20 === 0) { const c = [T0.Cx[i], T0.Cy[i], T0.Cz[i]]; pen.tube(c[0], c[1], c[2], c[0] + T0.Rx[i] * 60, c[1] + T0.Ry[i] * 60, c[2] + T0.Rz[i] * 60, 1.5, '#ff4a4a'); pen.tube(c[0], c[1], c[2], c[0] + T0.Ux[i] * 60, c[1] + T0.Uy[i] * 60, c[2] + T0.Uz[i] * 60, 1.5, '#4aff4a'); }
  }
  for (const s of race.ships) { if (s.hidden) continue; for (const k of [26, -26]) w.glow(s.P[0] + s.F[0] * k, s.P[1] + s.F[1] * k, s.P[2] + s.F[2] * k, 6, '#ff3ab4'); if (s.control === 'ai' && s._brain_ai) { const A = s._brain_ai; const q = T0.point(s.s + .42 * s.speed + 220, T0.line(s.s + .42 * s.speed + 220) + (A.avoid || 0), 10); w.glow(q[0], q[1], q[2], 5, '#ffd23f'); } }
  for (const p of T0.pads) { if (Math.abs(T0.dS(pl.s, p.s)) > 4000) continue; for (const [ds, du] of [[-p.hl, -p.hw], [p.hl, -p.hw], [p.hl, p.hw], [-p.hl, p.hw]]) { const q = T0.point(p.s + ds, p.u + du, 4); w.glow(q[0], q[1], q[2], 4, p.kind === 'speed' ? '#3ad8ff' : '#ffb000'); } }
  for (const sp of SN.spotsFor(T0)) if (Math.abs(T0.dS(pl.s, sp.s)) < 4000) w.glow(sp.p[0], sp.p[1], sp.p[2], 10, '#ffffff');
};
})();
