/* dev.js: Dev Mode, from the pause menu. A canvas panel on the left third; the game keeps running behind it, so balance
 * changes are felt live. Up/down moves, left/right adjusts (held accelerates, L1/R1 coarse), ✕ activates, ○ closes. Arrow
 * keys on a keyboard: WASD keeps leaning. Mouse: drag sliders; the pointer over the panel does not lean. Hidden in a session. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const JUMPS = () => [...G.order.map(id => ({ label: G.activities[id].short || G.activities[id].name, go() { G.devEnsure(); G.go(G.actScene(id), { tier: G.Dev.tier, from: 'dev', back: 'island' }, { fade: 0 }); } })),
  ...[1, 2, 3, 4, 5, 6].map(d => ({ label: 'Day ' + d, go() { G.devEnsure(); G.S.day = d; G.S.session = 0; G.S.checked = false; G.S.tareDay = d > 4; G.go('bodycheck', { day: d }, { fade: 0 }); } })),
  ...['title', 'island', 'member', 'arrival', 'evening', 'tareday', 'games', 'duel', 'ending', 'about', 'class', 'freeplay', 'attract'].map(n => ({ label: n, go() { G.devEnsure(); G.go(n, null, { fade: 0 }); } }))];
G.devEnsure = () => { if (!G.S.instructor) G.S.instructor = 'birch'; G.S.arrived = true; };
const D = G.Dev = {
  on: false, i: 0, top: 0, tier: 0, jump: 0, stars: 3, age: 40, botI: 0, viewer: null, step: false, log: '',
  W() { return Math.floor(game.W * .36); },
  overPanel() { if (!D.on) return false; const p = game.input.pointer(); return !!p && p[0] < D.W(); },
  open() { if (G.inSession) return; D.on = true; D.i = 0; D.top = 0; game.resume(); game.input.consumeAll(); D.rows = D.build(); D.keys = {}; },
  close() { D.on = false; D.viewer = null; game.input.consumeAll(); if (D.step) { D.step = false; G.DEV.timeScale = 1; } game.timeScale = G.DEV.timeScale; },
  build() {
    const rows = []; let grp = null;
    for (const s of G.DEV_SPEC) { if (s.group !== grp) { grp = s.group; rows.push({ head: grp }); } rows.push({ spec: s }); }
    rows.push({ head: 'Tools' });
    const B = ['off', 'poor', 'average', 'good', 'expert'];
    rows.push({ btn: () => 'Reset to defaults', act() { G.devReset(); D.note(G.DATA.lines.notes.devReset); } });
    rows.push({ pick: () => 'Jump: ' + JUMPS()[D.jump % JUMPS().length].label, adj(d) { const n = JUMPS().length; D.jump = (D.jump + d + n) % n; }, act() { JUMPS()[D.jump % JUMPS().length].go(); } });
    rows.push({ pick: () => 'Tier: ' + (D.tier + 1), adj() { D.tier = 1 - D.tier; }, act() { D.tier = 1 - D.tier; } });
    rows.push({ pick: () => 'Finish now: ' + D.stars + ' stars', adj(d) { D.stars = (D.stars + d + 4) % 4; }, act() { D.finish(); } });
    rows.push({ btn: () => 'Unlock all', act() { G.S.freePlay = true; G.S.minutes = Math.max(G.S.minutes, 30); for (const u of G.DATA.unlocks) if (u.wear) G.S.wear[u.id] = true; D.note(G.DATA.lines.notes.devUnlock); } });
    rows.push({ btn: () => '+10 minutes', act() { const r = G.earnMinutes(0, 0, ''); G.S.minutes += 10; for (const u of G.DATA.unlocks) if (u.wear && G.S.minutes >= u.minutes) G.S.wear[u.id] = true; D.note('Minutes: ' + G.S.minutes.toFixed(1)); } });
    rows.push({ pick: () => 'Set Spine Age: ' + D.age, adj(d) { D.age = clamp(D.age + d, 1, 71); }, act() { G.S.devAge = D.age; D.note('Spine Age is now ' + D.age); } });
    rows.push({ btn: () => 'Reset this member', act() { const n = G.S.name, l = G.S.look; G.S = G.freshMember(n, l); G.S.instructor = 'birch'; G.S.arrived = true; G.S.checked = true; G.Save.save(); D.note('A fresh start. Tare remembers.'); } });
    rows.push({ pick: () => 'No stumbles: ' + (G.DEV.noStumble ? 'on' : 'off'), adj() { G.DEV.noStumble = !G.DEV.noStumble; }, act() { G.DEV.noStumble = !G.DEV.noStumble; } });
    rows.push({ pick: () => 'Bot plays: ' + (G.DEV.bot || 'off'), adj(d) { D.botI = (D.botI + d + 5) % 5; G.DEV.bot = D.botI ? B[D.botI] : null; }, act() { D.botI = (D.botI + 1) % 5; G.DEV.bot = D.botI ? B[D.botI] : null; } });
    rows.push({ pick: () => 'Plate trace: ' + (G.DEV.trace ? 'on' : 'off'), adj() { G.DEV.trace = !G.DEV.trace; }, act() { G.DEV.trace = !G.DEV.trace; } });
    rows.push({ btn: () => D.step ? 'Frame step: one more' : 'Frame step', act() { D.step = true; G.DEV.timeScale = 0; D.stepN = 2; } });
    rows.push({ btn: () => 'Force attract', act() { D.close(); G.go('attract', null, { fade: 0 }); } });
    rows.push({ btn: () => 'Pose Viewer', act() { D.openViewer(); } });
    rows.push({ btn: () => 'Log snapshot', act() { console.log('Wee Teeter snapshot', JSON.stringify(game.debug.snapshot())); D.note('Logged to the console.'); } });
    rows.push({ btn: () => 'Close', act() { D.close(); } });
    return rows;
  },
  note(s) { D.log = s; D.logT = 3; G.A.sfx('ok'); },
  finish() {
    const sc = game.scene, r = sc && sc.run && sc.run(); if (!r || r.done) { D.note('No session is running.'); return; }
    const def = r.def, c = r.local, t = G.starTargets(def), pct = D.stars === 0 ? 0 : D.stars === 3 ? Math.max(t[2], .95) : t[D.stars - 1] + .01; r.finished = true; const orig = def.result; G.endRun(r); for (const q of r.contestants) if (q.local) { q.pct = pct; q.stars = G.starsFor(def, pct); q.score = Math.round(pct * 1000); q.detail = G.DATA.lines.notes.devFinish; } D.note('Finished with ' + D.stars + ' stars.');
  },
  adjust(row, dir, big) {
    if (row.adj) { row.adj(dir); G.A.sfx('tick'); return; }
    const s = row.spec; if (!s) return;
    if (s.options) { const k = s.options.indexOf(G.DEV[s.key]), n = s.options.length; G.DEV[s.key] = s.options[clamp((k < 0 ? 0 : k) + dir, 0, n - 1)]; }
    else { const st = s.step * (big ? 5 : 1); G.DEV[s.key] = +clamp(Math.round((G.DEV[s.key] + dir * st) / s.step) * s.step, s.min, s.max).toFixed(3); }
    G.A.sfx('tick', { vol: .5 });
  },
  openViewer() { const name = G.lib.names[0]; D.viewer = { i: 0, t: 0, rig: G.makeRig({ size: 2.1, colors: { cloth: '#ff7a59', pants: '#3b5568' } }) }; D.viewer.poser = new G.Poser(D.viewer.rig); },
  edge(codes) { const I = game.input; let now = false; for (const c of codes) if (I.held.has(c)) now = true; return now; },
  /** the input step: runs paused too */
  input(dt) {
    if (!D.on) return; const I = game.input;
    const OWN = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Pad12', 'Pad13', 'Pad14', 'Pad15', 'Pad0', 'Pad1', 'Pad4', 'Pad5', 'Enter', 'Backspace'];
    const held = c => I.held.has(c);
    const edges = {}; for (const c of OWN.concat(['Escape', 'Mouse0'])) { edges[c] = held(c) && !D.keys[c]; D.keys[c] = held(c); }
    for (const c of OWN) I.suppressCode(c);
    D.hold = D.hold || {}; const rep = (name, code, code2) => { const on = held(code) || held(code2); if (!on) { D.hold[name] = 0; return 0; } D.hold[name] = (D.hold[name] || 0) + dt; if (D.hold[name] === dt) return 1; const k = D.hold[name]; if (k > .35) { D.acc = D.acc || 0; D.acc += dt; const rate = k > 1.4 ? .025 : .07; if (D.acc >= rate) { D.acc = 0; return 1; } } return 0; };
    const coarse = held('Pad4') || held('Pad5') || held('ShiftLeft');
    if (D.viewer) { const v = D.viewer, n = G.lib.names.length, cl = G.lib.clip(G.lib.names[v.i]);
      if (edges.ArrowUp || edges.Pad12) { v.i = (v.i + n - 1) % n; v.t = 0; } if (edges.ArrowDown || edges.Pad13) { v.i = (v.i + 1) % n; v.t = 0; }
      if (rep('l', 'ArrowLeft', 'Pad14')) v.t = Math.max(0, v.t - (coarse ? .1 : .02)); if (rep('r', 'ArrowRight', 'Pad15')) v.t = Math.min(cl.dur, v.t + (coarse ? .1 : .02));
      if (edges.Enter || edges.Pad0) { const row = "  mypose: { clip: '" + cl.name + "', a: " + v.t.toFixed(2) + ", b: " + Math.min(cl.dur, v.t + 1).toFixed(2) + ", tgt: 1.57, name: 'My Pose' },"; console.log(row); D.note('Pose row printed to the console.'); v.printed = row; }
      if (edges.Escape || edges.Backspace || edges.Pad1) D.viewer = null;
      I.suppress('pause'); I.suppress('cancel'); I.suppress('confirm');
      v.poser.scrub(cl.name, v.t, 1.45); v.poser.update(dt || 1 / 120); v.rig.update(dt || 1 / 120, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: v.poser.facing });
      return; }
    if (edges.Escape || edges.Backspace || edges.Pad1) { D.close(); I.suppress('pause'); I.suppress('cancel'); return; }
    if (rep('u', 'ArrowUp', 'Pad12')) D.moveFocus(-1); if (rep('d', 'ArrowDown', 'Pad13')) D.moveFocus(1);
    const row = D.rows[D.i]; const l = rep('l', 'ArrowLeft', 'Pad14'), r = rep('r', 'ArrowRight', 'Pad15');
    if (l && row) D.adjust(row, -1, coarse || (D.hold.l > 1)); if (r && row) D.adjust(row, 1, coarse || (D.hold.r > 1));
    if ((edges.Enter || edges.Pad0) && row && row.act) { row.act(); G.A.sfx('ok'); }
    if (D.stepN > 0) { D.stepN--; game.timeScale = 1; } else game.timeScale = G.DEV.timeScale;
    if (D.logT > 0) D.logT -= dt || 1 / 120;
    /* the mouse: hover moves focus, drag sets a slider, a click activates */
    const P = I.pointer(); if (P && P[0] < D.W()) { I.suppressCode('Mouse0'); I.suppress('breath'); const rows = D.visibleRows(); const hit = rows.find(q => P[1] >= q.y && P[1] < q.y + D.RH); if (I.mouse.t !== D.mt) { D.mt = I.mouse.t; if (hit) D.i = hit.i; }
      if (held('Mouse0') && hit) { D.i = hit.i; const rw = D.rows[hit.i], x0 = 6, x1 = D.W() - 8; if (rw.spec && !rw.spec.options) { const s = rw.spec, k = clamp((P[0] - x0) / (x1 - x0), 0, 1); G.DEV[s.key] = +clamp(Math.round((s.min + (s.max - s.min) * k) / s.step) * s.step, s.min, s.max).toFixed(3); } }
      if (edges.Mouse0 && hit) { const rw = D.rows[hit.i]; if (rw.act) { rw.act(); G.A.sfx('ok'); } else if (rw.spec && rw.spec.options) D.adjust(rw, 1); } }
    I.clickedAtDev = false;
  },
  moveFocus(d) { const n = D.rows.length; let k = D.i; for (let t = 0; t < n; t++) { k = (k + d + n) % n; if (!D.rows[k].head) break; } D.i = k; G.A.sfx('tick', { vol: .5 }); },
  RH: 13,
  visibleRows() { const H = game.H, rows = D.rows, n = Math.floor((H - 26) / D.RH); if (D.i < D.top + 1) D.top = Math.max(0, D.i - 1); if (D.i >= D.top + n - 1) D.top = Math.min(rows.length - n, D.i - n + 2); D.top = Math.max(0, D.top); const out = []; for (let k = 0; k < n && D.top + k < rows.length; k++) out.push({ i: D.top + k, y: 20 + k * D.RH }); return out; },
  draw(r) {
    if (!D.on) return;
    r.overlay(g => {
      const W = D.W(), H = game.H;
      px.rect(g, 0, 0, W, H, '#f7fbfb'); px.rect(g, W, 0, 2, H, '#14a8c8');
      txt(g, 'Dev Mode', 6, 5, '#14a8c8'); txt(g, game.sceneName, W - 6, 5, '#5f7f8a', { align: 'right' });
      if (D.viewer) {
        const v = D.viewer, cl = G.lib.clip(G.lib.names[v.i]);
        txt(g, 'Pose Viewer', 6, 20, '#20404c'); txt(g, cl.name, 6, 32, '#14a8c8'); txt(g, 't ' + v.t.toFixed(2) + ' of ' + cl.dur.toFixed(2), 6, 42, '#5f7f8a');
        E.ui.bar(g, 6, 54, W - 12, 6, v.t / cl.dur, '#2cc6e6', { bg: '#e8f0f2' }); G.wrapText(g, 'Up/down clip. Left/right scrub. Confirm prints a row for data/poses.js. Back closes.', 6, 66, W - 12, '#5f7f8a', {});
        v.rig.draw(g, Math.round(W * .5), H - 18, E.VIEWS.brawler);
        return;
      }
      for (const q of D.visibleRows()) {
        const row = D.rows[q.i], foc = q.i === D.i, y = q.y;
        if (row.head) { txt(g, row.head, 6, y + 3, '#14a8c8'); px.rect(g, 6, y + 11, W - 12, 1, '#c8dde2'); continue; }
        if (foc) px.rect(g, 2, y, W - 4, D.RH - 1, '#d6f4fa');
        if (row.spec) {
          const s = row.spec, v = G.DEV[s.key], cur = s.options ? String(v) : (+v).toFixed(s.step < .1 ? 2 : s.step < 1 ? 2 : 0), changed = v !== s.def;
          txt(g, s.label, 6, y + 1, '#20404c'); txt(g, cur, W - 6, y + 1, changed ? '#e0553a' : '#20404c', { align: 'right' });
          if (!s.options) { const k = (v - s.min) / (s.max - s.min), k0 = (s.def - s.min) / (s.max - s.min), x0 = 6, x1 = W - 8; px.rect(g, x0, y + 9, x1 - x0, 2, '#c8dde2'); px.rect(g, x0, y + 9, (x1 - x0) * k, 2, '#14a8c8'); px.rect(g, x0 + (x1 - x0) * k0, y + 8, 1, 4, '#5f7f8a'); }
        } else txt(g, (row.btn || row.pick)(), 6, y + 3, row.pick ? '#14a8c8' : '#20404c');
      }
      if (D.logT > 0) { G.panel(g, W + 8, 8, Math.min(game.W - W - 16, E.font.width(D.log) + 14), 15, { r: 6 }); txt(g, D.log, W + 15, 12, '#20404c'); }
    });
  }
};
if (!G.inSession) game.hook('input', (a, b) => D.input(typeof a === 'number' ? a : b));
/* every scene draws the panel last */
for (const name in G.scenes) { const s = G.scenes[name], d = s.draw; if (d) s.draw = function (r) { d.call(this, r); D.draw(r); }; }
/* Tare counts your pauses, out loud */
let was = false;
game.hook('input', () => {
  if (G.inSession) return;
  const p = game.paused && !!game.scene && !!game.scene.pausable;
  if (p && !was) { G.S.pauses = (G.S.pauses || 0) + 1; }
  if (!p && was && !D.on && G.S && game.sceneName !== 'title') { const n = G.S.pauses; if (n === 3) G.pendingPauseLine = G.line('tare.paused', { n }); else if (n === 1) G.pendingPauseLine = G.DATA.lines.tare.pausedOne; }
  was = p;
  if (G.pendingPauseLine && !game.paused && !G.talk.open) { G.mutter('tare', G.pendingPauseLine, { face: 'judging' }); G.pendingPauseLine = null; }
});
})();
