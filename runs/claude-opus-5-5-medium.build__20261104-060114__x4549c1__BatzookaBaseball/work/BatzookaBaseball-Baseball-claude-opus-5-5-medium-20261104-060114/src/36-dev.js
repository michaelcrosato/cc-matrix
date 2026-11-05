/* DEV MODE (from the pause menu): a 10-foot panel over the frozen game with six tabs. TUNE: every balance number as a
 * live slider, by group, with reset per value, per group and for all, and pins (up to 3 shown while playing; [ and ]
 * adjust, \ picks the next). SITUATION: inning, outs, count, score, runners, meters, park. CHEATS. TRIGGERS. WARP. INFO.
 * L1/R1 or Q/E change tabs; up/down move; left/right change (hold to speed up); confirm toggles or runs; north (I)
 * resets a value or pins it; cancel closes. The mouse hovers, clicks and drags. */
const DEV = { open: false, tab: 0, i: 0, scroll: 0, pins: [], pinI: 0, hold: 0, rows: [], drag: null, sit: null, msg: '', msgT: 0 };
BZ.dev = DEV;
const DEV_TABS = ['TUNE', 'SITUATION', 'CHEATS', 'TRIGGERS', 'WARP', 'INFO'];
function devOpen() { DEV.open = true; DEV.i = 0; DEV.scroll = 0; DEV.sit = M ? { inning: M.inning, half: M.half, outs: M.outs, balls: M.balls, strikes: M.strikes, a: M.teams[0].runs, h: M.teams[1].runs, r1: !!runnerOn(1), r2: !!runnerOn(2), r3: !!runnerOn(3), m0: Math.round(M.teams[0].meter), m1: Math.round(M.teams[1].meter), park: M.parkId } : null; emit('devOpen', {}); }
function keepTune() { if (game.settings.keepTune) try { E.store.set('bz:tune', TUNE); } catch (e) { /* storage blocked */ } }
function devRows() {
  const tab = DEV_TABS[DEV.tab], R_ = [];
  if (tab === 'TUNE') {
    R_.push({ label: 'RESET ALL TO DEFAULTS', act: () => { BZ.resetTune(); keepTune(); devMsg('Every value back to its default'); } });
    let grp = null;
    for (const m of TUNE_META) {
      if (m.group !== grp) { grp = m.group; const gname = grp; R_.push({ label: '— ' + grp.toUpperCase() + ' —  (confirm: reset group)', act: () => { BZ.resetTune(gname); keepTune(); devMsg(gname + ' reset'); } }); }
      R_.push({ label: m.label, meta: m, value: () => TUNE[m.key], adjust: d => { TUNE[m.key] = +clamp(TUNE[m.key] + d * m.step, m.min, m.max).toFixed(3); if (m.key === 'gameSpeed') game.timeScale = TUNE.gameSpeed; keepTune(); },
        reset: () => { TUNE[m.key] = m.def; keepTune(); }, pin: () => { const k = DEV.pins.indexOf(m.key); if (k >= 0) DEV.pins.splice(k, 1); else { DEV.pins.push(m.key); if (DEV.pins.length > 3) DEV.pins.shift(); } }, pinned: () => DEV.pins.includes(m.key) });
    }
  } else if (tab === 'SITUATION') {
    const S = DEV.sit; if (!S) { R_.push({ label: 'No match running: warp to one first' }); return R_; }
    const num = (k, label, lo, hi) => R_.push({ label, value: () => S[k], adjust: d => { S[k] = clamp(S[k] + d, lo, hi); } });
    const tog = (k, label) => R_.push({ label, value: () => S[k] ? 'YES' : 'NO', adjust: () => { S[k] = !S[k]; }, act: () => { S[k] = !S[k]; } });
    num('inning', 'Inning', 1, 9); R_.push({ label: 'Half', value: () => S.half ? 'BOTTOM' : 'TOP', adjust: () => { S.half = 1 - S.half; } });
    num('outs', 'Outs', 0, 2); num('balls', 'Balls', 0, 3); num('strikes', 'Strikes', 0, 2); num('a', 'Away runs', 0, 30); num('h', 'Home runs', 0, 30);
    tog('r1', 'Runner on 1st'); tog('r2', 'Runner on 2nd'); tog('r3', 'Runner on 3rd'); num('m0', 'Away meter', 0, 100); num('m1', 'Home meter', 0, 100);
    R_.push({ label: 'Park', value: () => PARKS[S.park].name, adjust: d => { S.park = cycle(PARK_ORDER, S.park, d); } });
    R_.push({ label: 'APPLY', act: () => applySituation() });
  } else if (tab === 'CHEATS') {
    const c = k => M ? !!M.cheats[k] : false, t = (k, label) => R_.push({ label, value: () => c(k) ? 'ON' : 'OFF', act: () => { if (M) M.cheats[k] = !M.cheats[k]; }, adjust: () => { if (M) M.cheats[k] = !M.cheats[k]; } });
    t('perfectContact', 'Perfect contact always (humans)'); t('allStrikes', 'Every pitch a strike'); t('infMeter', 'Infinite meter'); t('infTurbo', 'Infinite turbo');
    t('noclip', 'Fielders ignore walls (no clip)'); t('autoplay', 'The CPU plays my side'); t('noErrors', 'No errors'); t('showZone', 'Show the zone always'); t('showAI', 'Show pitch path, timing bar, reticle');
    R_.push({ label: 'Slow motion x0.25', value: () => TUNE.gameSpeed === .25 ? 'ON' : 'OFF', act: () => { TUNE.gameSpeed = TUNE.gameSpeed === .25 ? 1 : .25; game.timeScale = TUNE.gameSpeed; } });
    R_.push({ label: 'Unlock everything (save)', act: () => { SAVE.unlocked = true; autosave(); devMsg('Every team and park unlocked'); } });
    R_.push({ label: '+5,000 Fan Bucks', act: () => { SAVE.fb += 5000; autosave(); devMsg('Fan Bucks: ' + fmt(SAVE.fb)); } });
    R_.push({ label: 'Reset the save', act: () => { SAVE = SAVE_DEF(); autosave(); devMsg('Save reset'); } });
  } else if (tab === 'TRIGGERS') {
    const need = f => () => { if (!M) return devMsg('No match running'); f(); DEV.open = false; };
    const pitches = Object.keys(PITCHES);
    DEV.fp = DEV.fp || 'heater';
    R_.push({ label: 'Force next pitch', value: () => PITCHES[DEV.fp].name, adjust: d => { DEV.fp = cycle(pitches, DEV.fp, d); }, act: need(() => { M.force = Object.assign(M.force || {}, { nextPitch: { type: DEV.fp, x: 0, z: 17, q: 1 } }); }) });
    R_.push({ label: 'Force a home run on the next contact', act: need(() => { M.force = Object.assign(M.force || {}, { homer: true, contact: 'perfect' }); }) });
    R_.push({ label: 'Hazard now', act: need(() => { const h = M.hz; if (!h) return; if (h.id === 'vents') h.vent = 3; else if (h.id === 'lowgrav') h.meteor = 2.5; else emit('hazard', { kind: { gulls: 'gull', fog: 'fog', drones: 'drone', silo: 'gull' }[h.id] || 'gull' }); }) });
    R_.push({ label: 'Rhubarb now', act: need(() => { if (['select', 'walkUp'].includes(M.phase)) startRhubarb(() => { walk(true); return 'walk'; }, batterNow()); else M.pendingRhubarb = true; }) });
    R_.push({ label: 'Fill both meters (Batzooka ready)', act: need(() => { M.teams[0].meter = M.teams[1].meter = 100; emit('meterFull', { team: M.half }); }) });
    R_.push({ label: 'End the half-inning', act: need(() => { M.outs = 3; if (['select', 'walkUp', 'afterPitch'].includes(M.phase)) toHalfEnd(); }) });
    R_.push({ label: 'Walk-off now', act: need(() => { M.half = 1; M.inning = Math.max(M.inning, M.innings); M.teams[1].runs = M.teams[0].runs + 1; M.walkoff = true; checkWalkoff(); toFinal(); }) });
    R_.push({ label: 'Win the game', act: need(() => { const s = Math.max(0, humanSide()); M.teams[s].runs = M.teams[1 - s].runs + 3; M.winner = s; M.over = true; toFinal(); }) });
    R_.push({ label: 'Lose the game', act: need(() => { const s = Math.max(0, humanSide()); M.teams[1 - s].runs = M.teams[s].runs + 3; M.winner = 1 - s; M.over = true; toFinal(); }) });
  } else if (tab === 'WARP') {
    const w = (label, f) => R_.push({ label, act: () => { DEV.open = false; game.resume(); f(); } });
    w('Title', () => game.go('title')); w('Attract mode', () => game.go('attract')); w('Animation gallery', () => game.go('gallery')); w('AI Hub card (mocked)', () => game.go('hubDerby', { mock: true })); w('Credits', () => game.go('credits'));
    DEV.ws = DEV.ws || 0; R_.push({ label: 'Tour stop', value: () => (DEV.ws + 1) + ': ' + PARKS[STOPS[DEV.ws].park].name, adjust: d => { DEV.ws = (DEV.ws + d + 5) % 5; }, act: () => { DEV.open = false; SAVE.tour.started = true; SAVE.tour.stop = Math.max(SAVE.tour.stop, DEV.ws); playStop(DEV.ws); } });
    DEV.wl = DEV.wl || 0; R_.push({ label: 'Lesson', value: () => LESSONS[DEV.wl].name, adjust: d => { DEV.wl = (DEV.wl + d + LESSONS.length) % LESSONS.length; }, act: () => { DEV.open = false; const L = LESSONS[DEV.wl]; game.go('match', Object.assign(L.cfg(), { mode: 'training', innings: 99, lesson: L })); } });
    DEV.wp = DEV.wp || 'kernel'; R_.push({ label: 'Exhibition at', value: () => PARKS[DEV.wp].name, adjust: d => { DEV.wp = cycle(PARK_ORDER, DEV.wp, d); }, act: () => { DEV.open = false; game.go('match', { mode: 'exhibition', away: 'COM', home: PARKS[DEV.wp].team, park: DEV.wp, innings: 3, ctrl: [[game.input, null], [null, null]] }); } });
    w('Derby', () => { DB.turn = 0; DB.scores = []; DB.n = 1; game.go('derby'); });
  } else {
    R_.push({ label: 'Frame step (one 1/120 s step)', act: () => { if (M) { matchUpdate(1 / 120); animateRigs(1 / 120); } } });
    R_.push({ label: 'Copy snapshot (JSON to the clipboard)', act: () => { const s = JSON.stringify(game.debug.snapshot()); try { navigator.clipboard.writeText(s); devMsg('Snapshot copied'); } catch (e) { devMsg('Clipboard blocked'); } } });
  }
  return R_;
}
function devMsg(s) { DEV.msg = s; DEV.msgT = 2; }
function applySituation() {
  const S = DEV.sit; if (!M || !S) return;
  Object.assign(M, { inning: S.inning, half: S.half, outs: S.outs, balls: S.balls, strikes: S.strikes }); M.teams[0].runs = S.a; M.teams[1].runs = S.h; M.teams[0].meter = S.m0; M.teams[1].meter = S.m1;
  if (S.park !== M.parkId) { M.park = PARKS[S.park]; M.parkId = S.park; M.hz = null; music(M.park.song); game.weather = M.park.weather; }
  M.runners = []; const o = offense(); [S.r1, S.r2, S.r3].forEach((on, i) => { if (on) addRunner(o.lineup[(o.order + 8 - i) % 9], i + 1); });
  M.ball = null; M.play = null; setFielders(); M.cam = 'plate'; setPhase('walkUp'); DEV.open = false; devMsg('Situation applied');
}
function devUpdate(dt) {
  const I = game.input; DEV.msgT = Math.max(0, DEV.msgT - dt);
  if (I.pressed('r1')) { DEV.tab = (DEV.tab + 1) % DEV_TABS.length; DEV.i = 0; DEV.scroll = 0; sfx('menu'); }
  if (I.pressed('l1')) { DEV.tab = (DEV.tab + DEV_TABS.length - 1) % DEV_TABS.length; DEV.i = 0; DEV.scroll = 0; sfx('menu'); }
  const rows = DEV.rows = devRows();
  if (I.repeat('down', .25, .06)) DEV.i = Math.min(rows.length - 1, DEV.i + 1);
  if (I.repeat('up', .25, .06)) DEV.i = Math.max(0, DEV.i - 1);
  const row = rows[DEV.i];
  if (row && row.adjust) { const l = I.down('left'), r = I.down('right'); if (l || r) { DEV.hold += dt; const fast = DEV.hold > .6 ? 4 : 1; if (I.pressed('left') || I.pressed('right') || (DEV.hold > .3 && Math.floor(DEV.hold * 12) !== Math.floor((DEV.hold - dt) * 12))) row.adjust((r ? 1 : -1) * fast); } else DEV.hold = 0; }
  if (I.pressed('south') || I.pressed('confirm')) { I.consumeAll(); if (row && row.act) row.act(); }
  if (I.pressed('north') && row) { if (row.reset && !I.down('l2')) row.reset(); if (row.pin && I.down('l2')) row.pin(); }
  if (I.pressed('r2') && row && row.pin) row.pin();
  if (I.pressed('cancel')) { I.consumeAll(); DEV.open = false; sfx('back'); }
  // the mouse
  const pt = I.pointer && I.pointer(), cl = I.clicked && I.clicked();
  if (pt && DEV.rects) {
    for (const rc of DEV.rects) if (pt[0] >= rc.x && pt[0] < rc.x + rc.w && pt[1] >= rc.y && pt[1] < rc.y + rc.h) { if (I.lastDevice === 'mouse') DEV.i = rc.k; if (cl) { const rw = rows[rc.k]; if (rw && rw.meta && pt[0] > rc.sx) { const m = rw.meta, u = clamp((pt[0] - rc.sx) / rc.sw, 0, 1); TUNE[m.key] = +(Math.round((m.min + u * (m.max - m.min)) / m.step) * m.step).toFixed(3); keepTune(); } else if (rw && rw.act) rw.act(); } }
    for (const tb of DEV.tabRects || []) if (cl && cl[0] >= tb.x && cl[0] < tb.x + tb.w && cl[1] >= tb.y && cl[1] < tb.y + tb.h) { DEV.tab = tb.k; DEV.i = 0; DEV.scroll = 0; }
  }
}
function devDraw(r) {
  if (!DEV.open) return;
  r.overlay(g => {
    const W = r.W, H = r.H, x = 16, y = 12, w = W - 32, h = H - 24;
    px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
    panel(g, x, y, w, h, { border: '#4fe0b0' });
    DEV.tabRects = [];
    const tw = Math.floor((w - 12) / DEV_TABS.length);
    DEV_TABS.forEach((t, k) => { const bx = x + 6 + k * tw; E.ui.box(g, bx, y + 5, tw - 3, 16, { bg: k === DEV.tab ? ['#2a6a4a', '#1a4a32'] : ['#20222e', '#14151f'], border: k === DEV.tab ? '#4fe0b0' : '#4a4c60' }); text(g, t, bx + tw / 2, y + 9, '#ffffff', { align: 'center' }); DEV.tabRects.push({ x: bx, y: y + 5, w: tw - 3, h: 16, k }); });
    const rows = DEV.rows.length ? DEV.rows : devRows(), rh = 13, top = y + 28, vis = Math.floor((h - 60) / rh);
    if (DEV.i < DEV.scroll) DEV.scroll = DEV.i; if (DEV.i >= DEV.scroll + vis) DEV.scroll = DEV.i - vis + 1;
    DEV.rects = [];
    for (let k = DEV.scroll; k < Math.min(rows.length, DEV.scroll + vis); k++) {
      const rw = rows[k], yy = top + (k - DEV.scroll) * rh, foc = k === DEV.i;
      if (foc) px.rect(g, x + 4, yy - 2, w - 8, rh, '#2a3a4a');
      text(g, (rw.pinned && rw.pinned() ? '● ' : '') + rw.label, x + 10, yy, foc ? '#ffe680' : '#e8e8f0');
      const sx = x + w * .55, sw = w * .3;
      if (rw.meta) { const m = rw.meta, u = (TUNE[m.key] - m.min) / (m.max - m.min); px.rect(g, sx, yy + 2, sw, 4, '#3a3c4a'); px.rect(g, sx, yy + 2, sw * u, 4, TUNE[m.key] === m.def ? '#4fe0b0' : '#ffb347'); px.rect(g, sx + sw * (m.def - m.min) / (m.max - m.min), yy, 1, 8, '#ffffff'); text(g, String(+TUNE[m.key].toFixed(3)), x + w - 12, yy, '#ffffff', { align: 'right' }); }
      else if (rw.value) text(g, String(rw.value()), x + w - 12, yy, '#a8ffd0', { align: 'right' });
      DEV.rects.push({ x: x + 4, y: yy - 2, w: w - 8, h: rh, k, sx, sw });
    }
    if (DEV_TABS[DEV.tab] === 'INFO') devInfo(g, x + 10, top + 30, w - 20);
    if (DEV.msgT > 0) text(g, DEV.msg, W / 2, y + h - 30, '#ffe680', { align: 'center' });
    promptRow(g, game.input, [['l1', 'TAB'], ['r1', 'TAB'], [null, '←→ CHANGE'], ['confirm', 'DO'], ['north', 'RESET'], ['r2', 'PIN'], ['cancel', 'CLOSE']], W / 2, y + h - 16, 'center');
  });
}
function devInfo(g, x, y, w) {
  const s = game.debug.snapshot(), lc = M && M.lastContact, lines = [
    'FPS ' + game.fps + '   SCENE ' + s.scene + '   PHASE ' + (s.phase || '-') + '   CAM ' + (s.cam || '-'),
    'BALL ' + (s.ball ? s.ball.x + ', ' + s.ball.y + ', ' + s.ball.z + ' ' + s.ball.mode : '-'),
    'LAST CONTACT ' + (lc ? 'timing ' + lc.timingMs + ' ms, offset ' + lc.dx + '/' + lc.dz + ', Q ' + lc.Q + ', EV ' + lc.EV + ', launch ' + lc.launch + ', spray ' + lc.spray : '-'),
    'SEED ' + (M ? M.seed : '-') + '   DEVICE ' + game.input.lastDevice + '   GLYPHS ' + game.input.glyphs,
    'EVENTS ' + BZ.bus.log.slice(-8).map(e => e.ev).join(' '),
    'ENGINE ' + (E.versionLabel ? E.versionLabel() : E.version) + '   GAME ' + BZ.version
  ];
  lines.forEach((l, i) => para(g, l, x, y + i * 12, w, '#c8e8d8'));
}
/* ---- pinned sliders: a thin strip while playing; [ and ] (or Create + the D-pad) adjust, \ picks the next ---- */
function pinTick() {
  if (!DEV.pins.length) return; const I = game.input, m = TUNE_META.find(t => t.key === DEV.pins[DEV.pinI % DEV.pins.length]); if (!m) return;
  const create = I.down('create');
  if (I.pressed('pinNext') || (create && I.pressed('down'))) DEV.pinI = (DEV.pinI + 1) % DEV.pins.length;
  const d = (I.pressed('pinUp') || (create && I.pressed('right')) ? 1 : 0) - (I.pressed('pinDown') || (create && I.pressed('left')) ? 1 : 0);
  if (d) { TUNE[m.key] = +clamp(TUNE[m.key] + d * m.step, m.min, m.max).toFixed(3); keepTune(); }
}
function pinDraw(r) {
  if (!DEV.pins.length || DEV.open) return;
  r.overlay(g => { const s = DEV.pins.map((k, i) => { const m = TUNE_META.find(t => t.key === k); return (i === DEV.pinI % DEV.pins.length ? '▸' : '') + m.label + ' ' + (+TUNE[k].toFixed(2)); }).join('   '); px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, 10, '#000000')); text(g, s, r.W / 2, 1, '#4fe0b0', { align: 'center' }); });
}
