/* ---- DEV MODE (15.3): from the pause menu's Dev Mode (or #dev). Four tabs: TUNING (every T value a live slider, its
 * default shown, RESET ALL TO DEFAULTS first, Log tuning), CHEATS, WARP, DEBUG (overlays, FPS, slow motion, frame step,
 * free camera, hide HUD, the seed, the sound test, the animation lab). L1 / R1 / Tab / a click switch tabs; up / down
 * move; left / right adjust (hold to accelerate; L2 / R2 ten steps); △ or R resets a row; ○ / Esc closes. The mouse
 * hovers rows, drags sliders, clicks toggles. While open the match holds (devPause) unless LIVE docks the panel ---- */
const Dev = (() => {
  let open = false, tab = 0, row = 0, scroll = 0, live = false, held = 0, step1 = false, rects = [], drag = null, soundI = 0;
  const TABS = ['TUNING', 'CHEATS', 'WARP', 'DEBUG'];
  const D = { overlays: false, hideHud: false, slow: 1, frameStep: false };
  const CHEATS = [['turbo', 'Infinite turbo'], ['god', 'God mode (no knockdowns)'], ['alwaysKaboom', 'Always KABOOM'], ['magnet', 'Puck magnet'], ['freezeAI', 'Freeze AI'], ['noGoalies', 'CPU goalies off'], ['bigHeads', 'Big heads'], ['octoRain', 'Octopus rain'], ['glowPuck', 'Glow puck'], ['retro', 'Retro rigs'], ['boomFull', 'Instant BOOM full (action)']];
  const WARPS = [['ch1', 'Start chapter 1'], ['ch2', 'Start chapter 2'], ['ch3', 'Start chapter 3'], ['ch4', 'Start chapter 4'], ['ch5', 'Start chapter 5'], ['cut', 'Play a cutscene (ch1-pre)'], ['p2', 'Jump to period 2'], ['p3', 'Jump to period 3'], ['ot', 'Jump to overtime'], ['shootout', 'Go to the shootout'], ['clock10', 'Clock to 0:10'],
    ['homeGoal', 'Home +1'], ['awayGoal', 'Away +1'], ['win', 'Win this game now'], ['lose', 'Lose this game now'], ['item', 'Spawn each item at center'], ['octopus', 'Spawn an octopus'], ['rat', 'Spawn a rubber rat'], ['fight', 'Start a fight'], ['kaboom', 'Start KABOOM'], ['breakIce', 'Break the thin ice'], ['shatter', 'Shatter a panel'], ['flood', 'Trigger the Flood Wagon'], ['results', 'Go to results'], ['attract', 'Go to the attract mode'], ['about', 'Go to About'], ['lab', 'Go to the animation lab']];
  const DEBUGS = () => [['overlays', 'Debug overlays (bodies, blades, AI, puck path, save shapes, grudges, skeletons)', D.overlays], ['fps', 'Show frame rate', !!S('showFps')], ['slow', 'Slow motion: ' + D.slow + 'x', null], ['frameStep', 'Frame step (paused: ✕ advances one step)', D.frameStep], ['freeCam', 'Free camera (stick pans, R2 / Q zoom)', Cam.free], ['hideHud', 'Hide the HUD (screenshots)', D.hideHud], ['seed', 'RNG seed: ' + RNG.seedN, null], ['live', 'LIVE: dock the panel, the game runs behind', live], ['log', 'Log tuning (JSON of non-default values to the console)', null], ['sound', 'Sound test: ' + soundList()[soundI][0] + '  (◂ ▸ choose, ✕ play)', null]];
  function soundList() { const out = []; for (const k in Synth.FX) out.push(['sfx ' + k, () => Synth.sfx(k)]); for (const k in Synth.SONGS) out.push(['song ' + k, () => Synth.music(k, { restart: true })]); for (const k in Synth.STINGS) out.push(['organ ' + k, () => Synth.organ(k)]); for (const k of ['drive', 'beat', 'kaboom', 'toms', 'fight']) out.push(['layer ' + k, () => { Synth.music('play'); Synth.layer(k, 1, .2); }]); out.push(['goal horn', () => Synth.horn()]); for (const k of ['cheer', 'roar', 'ohh', 'ahh', 'boo', 'gasp']) out.push(['crowd ' + k, () => Synth.swell(k)]); out.push(['crowd chant', () => Synth.chant()]); for (const id in CAST) if (CAST[id].voice) out.push(['voice ' + CAST[id].name, () => Synth.say(id === 'marge' ? 'Sit down, shut up, and listen.' : 'Number nine, Dunny MacPhail!', CAST[id].voice)]); return out; }
  const rows = () => tab === 0 ? [{ k: 'resetAll', label: 'RESET ALL TO DEFAULTS' }].concat(T.meta.map(m => ({ k: m.key, m }))) : tab === 1 ? CHEATS.map(([k, l]) => ({ k, label: l })) : tab === 2 ? WARPS.map(([k, l]) => ({ k, label: l })) : DEBUGS().map(([k, l, v]) => ({ k, label: l, v }));
  function openPanel() {
    if (HUB) return;
    if (!Match.m || game.sceneName !== 'match' && game.sceneName !== 'practice') { game.resume && game.resume(); game.go('match', { cfg: Setup.quickCfg({ dev: true }) }); return; }
    if (game.shell && game.shell.hide) try { game.shell.hide(); } catch (e) { /* closed */ }
    game.resume && game.resume(); open = true; Match.m.devPause = !live; game.input.consumeAll(); Synth.sfx('menuSel');
  }
  function close() { open = false; if (Match.m) Match.m.devPause = false; game.timeScale = T.gameSpeed * D.slow; game.input.consumeAll(); Synth.sfx('menuBack'); }
  function cheat(name, on) {
    const m = Match.m; if (name === 'boomFull') { if (m) { Boom.start(m, Math.max(0, m.teams.findIndex(t => t.human))); } return true; }
    if (!m) return false; const v = on === undefined ? !m.cheats[name] : !!on; m.cheats[name] = v;
    if (name === 'bigHeads' || name === 'retro') for (const e of m.skaters.concat(m.goalies)) { if (name === 'bigHeads') e.rig.o.headR = (e.rig._baseHead || (e.rig._baseHead = e.rig.o.headR)) * (v ? 1.8 : 1); else e.rig.o.style = v ? 'classic' : 'hd'; }
    return v;
  }
  /** warps (tests use them through game.debug.warp) */
  function warp(k, o = {}) {
    const m = Match.m;
    if (/^ch[1-5]$/.test(k)) { close(); Story.chapter = +k[2]; game.go('match', { cfg: Story.matchCfg(+k[2]) }); return true; }
    if (k === 'cut') { close(); game.go('cutscene', { id: o.id || 'ch1-pre', then: 'title' }); return true; }
    if (k === 'attract' || k === 'about' || k === 'lab' || k === 'title') { close(); game.go(k); return true; }
    if (!m) return false;
    const human = Math.max(0, m.teams.findIndex(t => t.human));
    if (k === 'p2' || k === 'p3') { const n = +k[1]; while (m.period < n - 1) m.period++; m.clock = 0; m.setPhase('periodEnd', .1); return true; }
    if (k === 'ot') { m.period = m.cfg.periods; m.teams[0].score = m.teams[1].score; m.clock = 0; m.setPhase('periodEnd', .1); return true; }
    if (k === 'shootout') { m.teams[0].score = m.teams[1].score; Match.soStart(m); return true; }
    if (k === 'clock10') { m.clock = Math.min(m.clock, 10); return true; }
    if (k === 'homeGoal' || k === 'awayGoal') { m.teams[k === 'homeGoal' ? 0 : 1].score++; return true; }
    if (k === 'win' || k === 'lose') { const w = k === 'win' ? human : 1 - human; m.teams[w].score = m.teams[1 - w].score + 1; Match.endGame(m, w); return true; }
    if (k === 'item') { let i = 0; for (const kind in ITEM_DEFS) { const it = Items.make(kind, Rink.C.x + (i - 3) * 22, Rink.C.y - 30); m.items.push(it); i++; } return true; }
    if (k === 'octopus' || k === 'rat') { const it = Items.make(k, Rink.C.x + 30, Rink.C.y); m.items.push(it); if (k === 'rat') it.t = 10; else it.t = 999; return true; }
    if (k === 'fight') { if (m.phase !== 'play') m.setPhase('play'); const a = m.teams[human].skaters.find(s => s.ctrl.kind !== 'cpu') || m.teams[human].skaters[0], b = m.teams[1 - human].skaters[0]; b.x = a.x + 16; b.y = a.y; Fight.start(m, a, b); return true; }
    if (k === 'kaboom') { if (m.phase !== 'play' && m.phase !== 'faceoff') m.setPhase('play'); Boom.start(m, human); return true; }
    if (k === 'breakIce') { if (!m.ice.length) Items.setupIce(Object.assign(m, { arena: Object.assign({}, m.arena, { hazards: m.arena.hazards.concat(['thinice']) }) })); const p = m.ice[0]; p.hp = 0; p.hole = 30; Bus.emit('thin_ice_break', { patch: p.i, x: p.x, y: p.y, by: -1, victim: -1, victimTeam: 1 }); return true; }
    if (k === 'shatter') { const p = Rink.panels.find(q => q.side === 'n' && q.state !== 'shattered'); Hits.glass(m, p, 999, m.teams[human].skaters[0]); return true; }
    if (k === 'flood') { close(); game.go('flood', { m, ask: false, auto: false, from: 'match' }); return true; }
    if (k === 'results') { close(); Match.endGame(m, m.teams[0].score >= m.teams[1].score ? 0 : 1); game.go('results', { m }); return true; }
    return false;
  }
  function activate(rw, d) {
    if (tab === 0) { if (rw.k === 'resetAll') { T.resetAll(); Synth.sfx('menuSel'); return; } return; }
    if (tab === 1) { const v = cheat(rw.k); game.note((CHEATS.find(c => c[0] === rw.k) || [])[1] + (rw.k === 'boomFull' ? '' : v ? ' ON' : ' OFF')); return; }
    if (tab === 2) { warp(rw.k); return; }
    const k = rw.k;
    if (k === 'overlays') D.overlays = !D.overlays; else if (k === 'fps') game.settings.set('showFps', !S('showFps'));
    else if (k === 'slow') { D.slow = D.slow === 1 ? .5 : D.slow === .5 ? .25 : 1; game.timeScale = T.gameSpeed * D.slow; }
    else if (k === 'frameStep') D.frameStep = !D.frameStep; else if (k === 'freeCam') Cam.toggleFree(); else if (k === 'hideHud') D.hideHud = !D.hideHud;
    else if (k === 'seed') { RNG.seed((RNG.seedN * 1103515245 + 12345) >>> 0); }
    else if (k === 'live') { live = !live; if (Match.m) Match.m.devPause = !live; }
    else if (k === 'log') { const j = JSON.stringify(T.changed(), null, 1); console.log('Ice Hoc-Kaboom tuning:', j); game.note('TUNING LOGGED TO THE CONSOLE'); }
    else if (k === 'sound') { const L2 = soundList(); if (d) soundI = (soundI + d + L2.length) % L2.length; else L2[soundI][1](); }
  }
  function adjust(rw, d, big) {
    if (tab === 0 && rw.m) { const m2 = rw.m, n = big ? 10 : 1; T.set(m2.key, +(T[m2.key] + d * m2.step * n).toFixed(4)); if (m2.key === 'gameSpeed') game.timeScale = T.gameSpeed * D.slow; return; }
    if (tab === 3 && rw.k === 'sound') activate(rw, d);
    else if (tab === 3 && rw.k === 'slow') activate(rw);
  }
  function update(dt) {
    const I = game.input, R = rows();
    if (I.pressed('cancel') || I.pressed('pause')) { close(); return; }
    if (padPressed(4) || keyPressed('KeyC')) { tab = (tab + 3) % 4; row = 0; scroll = 0; Synth.sfx('menuMove'); }
    if (padPressed(5) || keyPressed('Tab')) { tab = (tab + 1) % 4; row = 0; scroll = 0; Synth.sfx('menuMove'); }
    if (I.repeat('up', .3, .06)) { row = (row + R.length - 1) % R.length; Synth.sfx('menuMove'); }
    if (I.repeat('down', .3, .06)) { row = (row + 1) % R.length; Synth.sfx('menuMove'); }
    const big = codeDown('ShiftLeft') || codeDown('ShiftRight') || padDown(6) || padDown(7);
    if (I.down('left') || I.down('right')) held += dt; else held = 0;
    const accel = held > 1.2 ? .02 : held > .5 ? .05 : .3;
    if (I.repeat('left', .3, accel)) adjust(R[row], -1, big); if (I.repeat('right', .3, accel)) adjust(R[row], 1, big);
    if (I.pressed('confirm') || I.pressed('pass')) { if (D.frameStep && !live && Match.m && tab !== 3) { Match.m.devPause = false; step1 = true; } else activate(R[row]); }
    if ((I.pressed('lob') || keyPressed('KeyR')) && tab === 0 && R[row].m) { T.reset(R[row].m.key); Synth.sfx('menuBack'); }
    // the mouse: hover focuses, a click on a tab, a row (toggles act), a drag on a slider
    const p = UI.pointer(), ck = I.clicked();
    if (p && UI.mouseMoved) { const h = rects.find(q => p[0] >= q.x && p[0] < q.x + q.w && p[1] >= q.y && p[1] < q.y + q.h && q.row !== undefined); if (h) row = h.row; }
    if (ck) { const h = rects.find(q => ck[0] >= q.x && ck[0] < q.x + q.w && ck[1] >= q.y && ck[1] < q.y + q.h); if (h) { if (h.tab !== undefined) { tab = h.tab; row = 0; scroll = 0; } else if (h.slider) { const m2 = R[h.row].m, f = clamp((ck[0] - h.sx) / h.sw, 0, 1); T.set(m2.key, m2.min + Math.round((m2.max - m2.min) * f / m2.step) * m2.step); } else if (h.row !== undefined) { row = h.row; activate(R[row]); } } }
    if (I.mouse && I.mouse.down && p) { const h = rects.find(q => q.slider && p[0] >= q.sx - 4 && p[0] < q.sx + q.sw + 4 && p[1] >= q.y && p[1] < q.y + q.h); if (h) { const m2 = R[h.row].m, f = clamp((p[0] - h.sx) / h.sw, 0, 1); T.set(m2.key, m2.min + Math.round((m2.max - m2.min) * f / m2.step) * m2.step); } }
    if (step1 && Match.m) { Match.step(1 / 120); Match.m.devPause = true; step1 = false; }
  }
  // raw codes: L1 / R1 and Tab switch tabs, L2 / R2 take ten steps (edges tracked here, from the input's held codes)
  const prevHeld = {};
  const codeDown = code => !!(game.input.held && game.input.held.has(code));
  const edge = code => { const on = codeDown(code), was = prevHeld[code]; prevHeld[code] = on; return on && !was; };
  const padPressed = n => edge('Pad' + n), padDown = n => codeDown('Pad' + n), keyPressed = code => edge(code);
  function draw(r) {
    r.overlay(g => {
      const R = rows(), W = live ? Math.round(r.W * .45) : Math.min(r.W - 20, 420), x0 = live ? r.W - W - 4 : Math.round(r.W / 2 - W / 2), y0 = 6, H = r.H - 12, rh = 12, vis = Math.floor((H - 46) / rh);
      rects = [];
      UI.panel(g, x0, y0, W, H, { alpha: .95, border: '#4af0f0', bg: ['#08141e', '#040a10'] });
      E.font.text(g, 'DEV MODE' + (tab === 0 && R[row] && R[row].m ? '  ·  ' + R[row].m.group.toUpperCase() : ''), x0 + 6, y0 + 4, '#4af0f0', { outline: '#000' }); E.font.text(g, (live ? 'LIVE' : 'PAUSED') + '  seed ' + RNG.seedN, x0 + W - 6, y0 + 4, live ? '#7ad87a' : '#ffb347', { align: 'right', font: 'tiny', outline: false });
      TABS.forEach((t2, i) => { const tw = (W - 12) / 4, x = x0 + 6 + i * tw; UI.panel(g, x, y0 + 14, tw - 3, 13, { focus: i === tab, alpha: .9 }); E.font.text(g, t2, x + tw / 2 - 1, y0 + 17, i === tab ? UI.GOLD : UI.MUTED, { align: 'center', outline: false }); rects.push({ x, y: y0 + 14, w: tw - 3, h: 13, tab: i }); });
      if (row < scroll) scroll = row; if (row >= scroll + vis) scroll = row - vis + 1;
      let lastGroup = null;
      for (let k = scroll; k < Math.min(R.length, scroll + vis); k++) {
        const rw = R[k], y = y0 + 32 + (k - scroll) * rh, f = k === row;
        if (f) px.rect(g, x0 + 4, y - 1, W - 8, rh, '#163040');
        rects.push({ x: x0 + 4, y: y - 1, w: W - 8, h: rh, row: k });
        if (rw.m) {
          const m2 = rw.m, v = T[m2.key], frac = (v - m2.min) / (m2.max - m2.min), sx = x0 + W - 150, sw = 60; void lastGroup;
          E.font.text(g, m2.label, x0 + 8, y + 1, f ? '#ffffff' : '#cfe0f4', { outline: false });
          px.rect(g, sx, y + 4, sw, 2, '#2a3a4a'); px.rect(g, sx, y + 4, Math.round(sw * clamp(frac, 0, 1)), 2, v !== m2.value ? '#ffb347' : '#4af0f0'); px.rect(g, sx + Math.round(sw * clamp(frac, 0, 1)) - 1, y + 2, 3, 6, '#ffffff');
          const vs = m2.key.startsWith('aiSkill') && v < 0 ? 'AUTO' : String(+v.toFixed(3)); E.font.text(g, vs, x0 + W - 52, y + 1, v !== m2.value ? '#ffb347' : '#ffffff', { align: 'right', outline: false }); E.font.text(g, '(' + (+m2.value.toFixed(3)) + ')', x0 + W - 8, y + 2, '#5a7a8a', { align: 'right', font: 'tiny', outline: false });
          rects.push({ x: sx - 4, y: y - 1, w: sw + 8, h: rh, row: k, slider: true, sx, sw });
        } else {
          const on = tab === 1 ? !!(Match.m && Match.m.cheats[rw.k]) : rw.v; E.font.text(g, rw.label, x0 + 8, y + 1, f ? (rw.k === 'resetAll' ? '#ff8a8a' : '#ffffff') : rw.k === 'resetAll' ? '#ff6a6a' : '#cfe0f4', { outline: false });
          if ((tab === 1 && rw.k !== 'boomFull') || (tab === 3 && rw.v !== null && rw.v !== undefined)) E.font.text(g, on ? 'ON' : 'OFF', x0 + W - 8, y + 1, on ? '#7ad87a' : '#5a6a7a', { align: 'right', outline: false });
        }
      }
      if (R.length > vis) E.font.text(g, (scroll + 1) + '-' + Math.min(R.length, scroll + vis) + ' of ' + R.length, x0 + W / 2, y0 + H - 22, '#5a7a8a', { align: 'center', font: 'tiny', outline: false });
      Glyphs.text(g, '{chirp}/TAB TABS  {left} ADJUST  {lob} RESET ROW  {confirm} DO  {cancel} CLOSE', x0 + W / 2, y0 + H - 12, { align: 'center', color: '#9fb2cc' });
    });
  }
  /** the debug overlays: bodies and radii, blade points, AI roles and targets, the puck's path, save shapes, grudges, skeletons */
  function drawOverlays(r, m) {
    for (const s of m.skaters) {
      if (s.offIce) continue;
      r.decal(() => { r.groundRing(s.x, s.y, 7, '#4af0f0', 1); const [bx, by] = Skater.blade(s); r.groundRing(bx, by, T.pickupRadius, '#ffd36a', .6); if (s.ai && s.ai.tx !== undefined && s.ctrl.kind === 'cpu') r.groundRing(s.ai.tx, s.ai.ty, 3, '#ff4ab8', 1); });
      r.queue(s.x, s.y, 50, g => { const q = r.w(s.x, s.y, 50); E.font.text(g, (s.ai.role || '') + (Object.values(s.grudge).some(v => v > 0) ? ' G' + Math.round(Math.max(...Object.values(s.grudge))) : ''), q[0], q[1], '#ff4ab8', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true });
      s.rig.debug && s.rig.debug(r);
    }
    for (const gl of m.goalies) { const sc = Goalie.scale(m, gl); r.queue(gl.x, gl.y, 0, g => { const a = r.w(gl.x, gl.y - 8 * sc, 0), b = r.w(gl.x, gl.y + 8 * sc, 22 * sc); px.blend(g, .3, 'normal', () => px.rect(g, Math.min(a[0], b[0]), b[1], Math.abs(b[0] - a[0]) + 1, a[1] - b[1], '#ff4a4a')); }, { emissive: true }); }
    const pk = m.puck; if (!pk.owner) r.decal(() => { let x = pk.x, y = pk.y, vx = pk.vx, vy = pk.vy; for (let k = 0; k < 20; k++) { x += vx * .05; y += vy * .05; const sp = Math.hypot(vx, vy); if (sp < 5) break; const ns = Math.max(0, sp - (T.puckFriction + T.puckDrag * sp) * .05); vx *= ns / sp; vy *= ns / sp; r.groundDisc(x, y, 1.2, '#ffffff', .8); } });
  }
  return { open: openPanel, close, isOpen: () => open, update, draw, warp, cheat, drawOverlays, CHEATS, WARPS, D, get live() { return live; }, set live(v) { live = !!v; }, get hideHud() { return D.hideHud; }, get overlays() { return D.overlays; }, get tab() { return tab; }, set tab(v) { tab = v; }, get row() { return row; }, set row(v) { row = v; } };
})();
