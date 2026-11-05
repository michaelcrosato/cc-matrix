// ---- dev mode (5.19): reached from the pause menu's Dev Mode (or the ` key), a full-screen 10-foot panel over the
// paused match. Tabs TUNING (live sliders, each against its default, Reset all first), TOGGLES, JUMP and INFO.
// L1 / R1 (or Tab, or a click) change tabs; up and down (or hover) pick a row; left and right adjust (held: faster;
// the mouse drags a knob); confirm toggles or acts; special resets the row; cancel closes.
const DEV = { open: false, tab: 0, i: 0, scroll: 0, toggles: { slowmo: false, invincible: false, infHype: false, alwaysFire: false, autoBat: false, autoBowl: false, noChaos: false, hitboxes: false, trajectory: false, aiIntent: false, skeleton: false, stats: false, muteComm: false }, sure: 0, force: 0, del: 0, chaos: 0, item: 0, chapter: 1, seg: 0, song: 0, score: [30, 2], hold: 0 };
const DEV_TABS = ['TUNING', 'TOGGLES', 'JUMP', 'INFO'];
function devOpen() { if (HUB) return false; DEV.open = true; DEV.i = 0; DEV.scroll = 0; if (game.paused) game.resume(); game.input.consumeAll(); cover('dev'); emit('dev:open', {}); return true; }
function devClose() { DEV.open = false; game.input.consumeAll(); }
function devRows() {
  const m = MATCH, t = DEV.tab, D = DEV;
  if (t === 0) return [{ label: 'Reset all to defaults', act: () => { tuneReset(); sfx('confirm'); } }].concat(TUNE_DEFS.map(([k, label, d, mn, mx, st]) => ({ slider: k, label, d, mn, mx, st })));
  if (t === 1) {
    const T_ = [['slowmo', 'Slow motion (×0.25)'], ['invincible', 'Invincible batter'], ['infHype', 'Infinite Hype'], ['alwaysFire', 'Always ON FIRE'], ['autoBat', 'Auto-bat (the CPU bats for you)'], ['autoBowl', 'Auto-bowl and field'], ['noChaos', 'No chaos events'], ['trajectory', 'Show the trajectory (Owl-Eye, live)'], ['hitboxes', 'Show stumps, pad and bat zones'], ['aiIntent', 'Show the CPU batter\'s read'], ['skeleton', 'Skeleton overlay'], ['stats', 'Frame stats'], ['muteComm', 'Mute commentary']];
    const rows = T_.map(([k, label]) => ({ label, toggle: k }));
    if (m) rows.push({ label: 'Weather', options: ['clear', 'overcast', 'rain', 'fog'], get: () => m.weather, set: v => { m.weather = v; m.env.wet = v === 'rain'; CROWD.rain = v === 'rain'; } }, { label: 'Time of day', options: ['day', 'dusk', 'night'], get: () => m.time, set: v => { m.time = v; useGround(m.g.id, m); } });
    return rows;
  }
  if (t === 2) {
    const rows = [
      { label: 'Story: chapter', options: [1, 2, 3, 4, 5], get: () => D.chapter, set: v => { D.chapter = v; } },
      { label: '  Play the chapter (from its scene)', act: () => { devClose(); startChapter(D.chapter); } },
      { label: '  Jump to its match', act: () => { devClose(); const C = CHAPTERS[D.chapter - 1]; startMatch({ mode: 'story', chapter: D.chapter, teams: ['ker', C.opp], ground: C.ground, overs: C.overs, wickets: C.wickets, kerfuffle: C.kerfuffle, humans: [[game.input], []], batFirst: C.batFirst || null, scenario: C.scenario || null, rain: !!C.rain, boss: !!C.boss }); } },
      { label: '  Jump to its ending scene', act: () => { devClose(); storyWin(D.chapter); } },
      { label: 'Start a Quick Match', act: () => { devClose(); startMatch({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', humans: [[game.input], []] }); } }
    ];
    if (m) rows.push(
      { label: 'Skip to the last over', act: () => { const I = m.I; if (I.overs > 1) { I.legal = (I.overs - 1) * 6; I.over = []; m._newOver(); m._go('between'); } } },
      { label: 'Win the innings', act: () => { const I = m.I; I.runs = m.target() ? m.target() : I.runs + 30; I.legal = Math.max(I.legal, 1); m.ballRec = null; m._go('between'); if (m.inningsOver()) { const r = m.nextInnings(); m.breakKind = r; m._go(r === 'result' ? 'over' : 'break'); } } },
      { label: 'Lose the innings', act: () => { const I = m.I; I.wkts = I.wmax; const r = m.nextInnings(); m.breakKind = r; m._go(r === 'result' ? 'over' : 'break'); } },
      { label: 'Set runs', options: [0, 5, 10, 20, 30, 40, 60, 80], get: () => D.score[0], set: v => { D.score[0] = v; } },
      { label: 'Set wickets', options: [0, 1, 2, 3, 4], get: () => D.score[1], set: v => { D.score[1] = v; } },
      { label: '  Apply the score', act: () => { m.I.runs = D.score[0]; m.I.wkts = Math.min(m.I.wmax - 1, D.score[1]); } },
      { label: 'Force the next outcome', options: FORCE_LIST, get: () => FORCE_LIST[D.force], set: v => { D.force = FORCE_LIST.indexOf(v); }, act: () => { m.forceNext(FORCE_LIST[D.force]); callout('NEXT: ' + upper(FORCE_LIST[D.force]), '#7ae0ff', 1.2, { small: true }); } },
      { label: 'Force the next delivery', options: Object.keys(DELIVERIES), get: () => Object.keys(DELIVERIES)[D.del], set: v => { D.del = Object.keys(DELIVERIES).indexOf(v); }, act: () => { m.dev.forceDelivery = { del: Object.keys(DELIVERIES)[D.del] }; } },
      { label: 'Force a review (a wrong LBW call)', act: () => { m.cfg.umpWrong = true; m.forceNext('lbw'); } },
      { label: 'Trigger a chaos event', options: Object.keys(CHAOS), get: () => Object.keys(CHAOS)[D.chaos], set: v => { D.chaos = Object.keys(CHAOS).indexOf(v); }, act: () => m.triggerChaos(Object.keys(CHAOS)[D.chaos]) },
      { label: 'Spawn an item token', options: Object.keys(ITEMS), get: () => Object.keys(ITEMS)[D.item], set: v => { D.item = Object.keys(ITEMS).indexOf(v); }, act: () => m.spawnToken(Object.keys(ITEMS)[D.item]) },
      { label: 'Trigger a Super Over (tie the scores)', act: () => { if (m.i >= 1) { const I = m.I, a = m.inn[m.i - 1]; I.runs = a.runs; I.legal = I.overs * 6; m.ballRec = null; const r = m.nextInnings(); m.breakKind = r; m._go(r === 'result' ? 'over' : 'break'); } else callout('IN THE SECOND INNINGS', '#ff6b6b', 1, { small: true }); } }
    );
    rows.push(
      { label: 'Play attract segment', options: SEGMENTS.map((s, k) => k + 1), get: () => D.seg + 1, set: v => { D.seg = v - 1; }, act: () => { devClose(); game.go('attract', { seg: D.seg, from: 'title' }); } },
      { label: 'Jukebox', options: Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s)), get: () => (Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s)))[D.song], set: v => { D.song = Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s)).indexOf(v); }, act: () => { const id = Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s))[D.song]; if (id.startsWith('sting:')) sting(id.slice(6)); else { musicNow = null; music(id); } } },
      { label: 'Unlock everything', act: () => { profile.unlocked = TEAMS.map(t => t.id); profile.story.chapter = 5; saveProfile(); callout('UNLOCKED', '#5fd38a', 1, { small: true }); } },
      { label: D.sure ? 'Reset the save: press again to confirm' : 'Reset the save', act: () => { if (!D.sure) { D.sure = 1; return; } D.sure = 0; profile = newProfile(); saveProfile(); callout('SAVE RESET', '#ff6b6b', 1, { small: true }); } }
    );
    return rows;
  }
  return devInfo().map(l => ({ label: l, info: true }));
}
function devInfo() {
  const m = MATCH, out = [];
  out.push('Scene: ' + game.sceneName + '   Engine ' + (E.versionLabel ? E.versionLabel() : E.version) + '   Cricket Kerfuffle 1.0');
  out.push('Seeds: match ' + RNG.seed + '   difficulty ' + difficulty + '   tuning changed: ' + (tuneChanged().join(', ') || 'none'));
  if (m) { const I = m.I; out.push('Match: ' + m.cfg.mode + ' at ' + m.g.name + ', innings ' + (m.i + 1) + ', ' + m.teams[I.bat].code + ' ' + I.runs + '/' + I.wkts + ' (' + m.overStr() + ')' + (m.target() ? ' target ' + m.target() : '')); out.push('State: ' + m.state + ' ' + m.st.toFixed(1) + 's   ball ' + m.ball.phase + ' (' + Math.round(m.ball.x) + ', ' + Math.round(m.ball.y) + ', ' + Math.round(m.ball.z) + ')   cam ' + WORLD.shot); if (m.lastRec) out.push('Last ball: ' + JSON.stringify({ runs: m.lastRec.runs, b: m.lastRec.boundary, w: m.lastRec.wicket && m.lastRec.wicket.how, shot: m.lastRec.shot, grade: m.lastRec.grade, kmh: m.lastRec.kmh })); }
  out.push('Floor bakes: ' + (WORLD.map && WORLD.map.floors ? Object.keys(WORLD.map.floors).length : 0) + '   errors: ' + game.errors.length);
  out.push('Last events:'); for (const e of BUS.log.slice(-10)) out.push('• ' + e.t + ' ' + e.type + ' ' + e.data);
  out.push('Last commentary:'); for (const l of COMM.lines.slice(-5)) out.push('• ' + l);
  return out;
}
function devUpdate(dt) {
  const I = game.input, rows = devRows(), n = rows.length;
  if (I.pressed('cancel') || I.pressed('pause')) { devClose(); return; }
  if (I.pressed('run')) { DEV.tab = (DEV.tab + 1) % 4; DEV.i = 0; DEV.scroll = 0; sfx('select'); }
  if (I.pressed('back')) { DEV.tab = (DEV.tab + 3) % 4; DEV.i = 0; DEV.scroll = 0; sfx('select'); }
  if (I.repeat('up', .3, .07)) { DEV.i = (DEV.i - 1 + n) % n; sfx('tick'); }
  if (I.repeat('down', .3, .07)) { DEV.i = (DEV.i + 1) % n; sfx('tick'); }
  const p = !HEADLESS && I.pointer && I.pointer(), c = I.clicked && I.clicked();
  if (DEV.tabR && c) { const k = DEV.tabR.findIndex(r => c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (k >= 0) { DEV.tab = k; DEV.i = 0; DEV.scroll = 0; return; } }
  if (DEV.rowR && p && (!DEV.lastP || p[0] !== DEV.lastP[0] || p[1] !== DEV.lastP[1])) { DEV.lastP = p.slice(); const k = DEV.rowR.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0) DEV.i = k; }
  const row = rows[DEV.i]; if (!row) return;
  // the mouse drags a slider's knob
  if (row.slider && p && DEV.sliderR && DEV.sliderR[DEV.i] && I.down('shot') && I.lastDevice === 'mouse') { const r = DEV.sliderR[DEV.i]; if (p[0] >= r[0] - 4 && p[0] <= r[0] + r[2] + 4 && p[1] >= r[1] - 6 && p[1] <= r[1] + 8) { const u = clamp((p[0] - r[0]) / r[2], 0, 1); tuneSet(row.slider, row.mn + u * (row.mx - row.mn)); applyTune(row.slider); return; } }
  const dir = (I.repeat('left', .3, .05) ? -1 : 0) + (I.repeat('right', .3, .05) ? 1 : 0);
  if (dir && (I.down('left') || I.down('right'))) DEV.hold += dt; else if (!I.down('left') && !I.down('right')) DEV.hold = 0;
  if (dir) {
    if (row.slider) { const mult = DEV.hold > 1.2 ? 10 : DEV.hold > .5 ? 3 : 1; tuneSet(row.slider, TUNE[row.slider] + dir * row.st * mult); applyTune(row.slider); }
    else if (row.options) { const cur = row.get(), k = row.options.indexOf(cur); row.set(row.options[(k + dir + row.options.length) % row.options.length]); sfx('tick'); }
  }
  if (I.pressed('confirm') || I.pressed('shot')) {
    if (row.toggle) { DEV.toggles[row.toggle] = !DEV.toggles[row.toggle]; sfx('select'); if (row.toggle === 'stats') game.settings.set && game.settings.set('showFps', DEV.toggles.stats); }
    else if (row.act) { row.act(); sfx('confirm'); }
    else if (row.options) { const k = row.options.indexOf(row.get()); row.set(row.options[(k + 1) % row.options.length]); }
  }
  if (I.pressed('special')) { if (row.slider) { tuneReset(row.slider); applyTune(row.slider); sfx('cancel'); } else if (row.toggle) DEV.toggles[row.toggle] = false; }
}
function applyTune(k) { if (k === 'camPitch' || k === 'camScale' || k === 'wideScale') { makeViews(); if (VIEWS[WORLD.shot]) game.setView(VIEWS[WORLD.shot]); } if (k === 'boundaryScale' && MATCH) { WORLD.gid = null; useGround(MATCH.g.id, MATCH); } }
function devDraw(r) {
  r.overlay(g => {
    const W = r.W, H = r.H, rows = devRows();
    px.blend(g, .88, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
    E.font.text(g, 'DEV MODE', 8, 6, '#ff6b6b', { scale: 2, shadow: '#000' });
    DEV.tabR = [];
    DEV_TABS.forEach((tn, k) => { const x = 112 + k * Math.min(72, (W - 120) / 4), foc = k === DEV.tab; DEV.tabR.push([x - 2, 4, 68, 16]); px.rect(g, x - 2, 4, 68, 16, foc ? '#3a2a5a' : '#1a1430'); if (foc) px.rect(g, x - 2, 19, 68, 1, '#ffd23a'); E.font.text(g, tn, x + 32, 8, foc ? '#ffd23a' : '#c8c0e0', { align: 'center' }); });
    const lh = 12, top = 26, vis = Math.floor((H - top - 22) / lh);
    if (DEV.i < DEV.scroll) DEV.scroll = DEV.i; if (DEV.i >= DEV.scroll + vis) DEV.scroll = DEV.i - vis + 1;
    DEV.rowR = []; DEV.sliderR = [];
    rows.forEach((row, k) => {
      const y = top + (k - DEV.scroll) * lh; if (k < DEV.scroll || k >= DEV.scroll + vis) { DEV.rowR[k] = null; return; }
      const foc = k === DEV.i; DEV.rowR[k] = [6, y - 2, W - 12, lh];
      if (foc && !row.info) { px.rect(g, 6, y - 2, W - 12, lh, '#2a2048'); px.rect(g, 6, y - 2, 2, lh, '#ffd23a'); }
      E.font.text(g, row.label, 12, y, row.info ? (row.label.startsWith('•') ? '#c8c0e0' : '#f4f0e0') : foc ? '#ffe9a0' : '#f4f0e0');
      if (row.slider) {
        const v = TUNE[row.slider], sx = Math.round(W * .55), sw = Math.round(W * .3), u = (v - row.mn) / (row.mx - row.mn), du = (row.d - row.mn) / (row.mx - row.mn);
        DEV.sliderR[k] = [sx, y + 2, sw, 3];
        px.rect(g, sx, y + 2, sw, 3, '#3a3450'); px.rect(g, sx, y + 2, Math.round(sw * u), 3, v === row.d ? '#7a7490' : '#ffd23a'); px.rect(g, sx + Math.round(sw * du), y, 1, 7, '#7ae0ff'); px.rect(g, sx + Math.round(sw * u) - 1, y - 1, 3, 9, '#ffffff');
        E.font.text(g, (+v.toFixed(3)) + '', sx + sw + 6, y, v === row.d ? '#c8c0e0' : '#ffd23a'); E.font.text(g, '(' + row.d + ')', W - 10, y, '#7a7490', { align: 'right' });
      }
      if (row.toggle) E.font.text(g, DEV.toggles[row.toggle] ? 'ON' : 'OFF', W - 14, y, DEV.toggles[row.toggle] ? '#5fd38a' : '#7a7490', { align: 'right' });
      if (row.options) E.font.text(g, (foc ? '← ' : '') + upper(String(row.get())) + (foc ? ' ▸' : ''), W - 14, y, '#ffd23a', { align: 'right' });
    });
    footer(g, r, [['run', 'Tab'], ['left', 'Adjust'], ['confirm', 'Toggle / Do'], ['special', 'Reset row'], ['cancel', 'Close']]);
  });
}
// the debug overlays (dev toggles): the trajectory, the zones, the CPU's read, skeletons
function devOverlays(r, m) {
  const D = DEV.toggles; if (!m) return;
  if (D.trajectory && m.ball.phase !== 'held' && m.ball.phase !== 'carried') { const path = predict(m.ball, 2, m.env, 1 / 30); r.queue(OX, OY + 160, 0, g => { for (let k = 1; k < path.length; k++) { const a = r.w(OX + path[k - 1].x, OY + path[k - 1].y, path[k - 1].z), b = r.w(OX + path[k].x, OY + path[k].y, path[k].z); px.line(g, a[0], a[1], b[0], b[1], '#3ad8ff'); } }, { bias: 3 }); }
  if (D.hitboxes) { const b0 = m.batters[0], h = m.strikerHand(); r.decal(() => { r.groundRing(OX, OY, STUMPS.hw, '#ff4a4a', 1); r.groundRing(OX + b0.x - 3 * h, OY + (m.swing ? m.swing.cy : 24), 3.8, '#ffd23a', 1); for (const f of m.fielders) r.groundRing(OX + f.x, OY + f.y, 9, '#7ae07a', .5); }); }
  if (D.aiIntent && m.batPlan && m.batPlan.btn) { const b0 = m.batters[0], w = dirOf(m.batPlan.th, m.strikerHand()); r.decal(() => { for (let k = 1; k < 8; k++) r.groundDisc(OX + b0.x + w[0] * k * 10, OY + b0.y + w[1] * k * 10, 1.5, '#ff6bff', .9); }); }
}
