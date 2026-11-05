/* ---------- dev mode: live sliders, toggles, warps, info. Reached from the pause menu; F2 / ` / L3+R3 afterwards ---------- */
KC.dev.tabs = ['TUNING', 'TOGGLES', 'WARP', 'INFO'];
KC.dev.save = () => { try { KC.store.set('kc:dev', { tune: KC.TUNE, t: { showBoxes: KC.dev.showBoxes, showInput: KC.dev.showInput, showFrame: KC.dev.showFrame, aiThoughts: KC.dev.aiThoughts, invincible: KC.dev.invincible, infinite: KC.dev.infinite, muteVoices: KC.dev.muteVoices, skipCut: KC.dev.skipCut, unlocked: KC.dev.unlocked, enabledOnce: KC.dev.enabledOnce, p2mode: KC.dev.p2mode } }); } catch (e) { /* storage blocked */ } };
KC.dev.load = () => { const d = KC.store.get('kc:dev', null); if (!d) return; for (const k in (d.tune || {})) if (k in KC.TUNE && typeof d.tune[k] === 'number') KC.TUNE[k] = d.tune[k]; Object.assign(KC.dev, d.t || {}); KC.applyTune(); };
KC.dev.rows = () => {
  const D = KC.dev, G = KC.game, S = KC.Story, cur = KC.current, rows = [];
  if (D.tab === 0) {
    rows.push({ label: 'RESET ALL TO DEFAULTS', act: () => { KC.resetTune(); KC.dev.save(); KC.sfx('good'); } });
    KC.TUNE_DEFS.forEach(([k, lab, lo, hi, def, st]) => rows.push({ key: k, label: lab, slider: [lo, hi, def, st], get: () => KC.TUNE[k], set: v => { KC.TUNE[k] = Math.round(v / st) * st; KC.applyTune(); KC.dev.save(); } }));
    rows.push({ label: 'COPY TUNING JSON', act: () => { const j = KC.exportTuning(); try { navigator.clipboard.writeText(j); D.note = 'COPIED'; } catch (e) { D.note = 'CLIPBOARD BLOCKED'; } } });
  } else if (D.tab === 1) {
    const T2 = (k, lab, f) => rows.push({ label: lab, toggle: true, get: () => !!D[k], set: v => { D[k] = v; if (f) f(v); KC.dev.save(); } });
    T2('showBoxes', 'SHOW HIT / HURT / PUSH BOXES'); T2('showFrame', 'FRAME DATA'); T2('showInput', 'INPUT DISPLAY'); T2('aiThoughts', 'AI THOUGHTS');
    T2('invincible', 'P1 INVINCIBLE (CPU CANNOT SCORE)', v => { if (cur && cur.bout) cur.bout.invincible[0] = v; }); T2('infinite', 'INFINITE TIME', v => { if (cur && cur.bout) cur.bout.infiniteTime = v; });
    T2('freezeCpu', 'FREEZE CPU'); T2('slow', 'SLOW MOTION 0.25X', v => { KC.TUNE.gameSpeed = v ? .25 : 1; KC.applyTune(); });
    rows.push({ label: 'P2 CONTROL: ' + up(D.p2mode), act: () => { const L = ['cpu', 'stand', 'crouch', 'jump', 'block', 'attack']; D.p2mode = L[(L.indexOf(D.p2mode) + 1) % L.length]; if (cur && cur.dummyMode !== undefined) { cur.dummyMode = D.p2mode === 'cpu' ? 'stand' : D.p2mode; D.freezeCpu = D.p2mode !== 'cpu'; } KC.dev.save(); } });
    T2('freezeAll', 'FREEZE GAME'); rows.push({ label: 'FRAME STEP (CONFIRM = 1 STEP)', act: () => { D.step = 1; }, hold: true });
    T2('fps', 'FPS AND STATS'); T2('muteVoices', 'MUTE VOICES', v => { G.settings.set && G.settings.set('voices', v ? 0 : .8); }); T2('skipCut', 'SKIP CUTSCENES'); T2('unlocked', 'UNLOCK ALL FIGHTERS');
  } else if (D.tab === 2) {
    const go = (scene, d) => { D.open = false; KC.ensureStory(); G.go(scene, d); };
    KC.LADDER.forEach((n, i) => rows.push({ label: (i + 1) + '. ' + up(n.label), act: () => { D.open = false; KC.ensureStory(); KC.Story.s.node = i; KC.Story.launch(); } }));
    rows.push({ label: 'FREE SPAR', act: () => { D.open = false; KC.startFreeSpar(); } }); rows.push({ label: 'TECHNIQUE LAB', act: () => { D.open = false; G.go('lab', { id: 'frontKick' }); } });
    KC.STAGES.slice(0, 8).forEach(s => rows.push({ label: 'QUICK BOUT: ' + s.name, act: () => { D.open = false; G.go('fight', { mode: 'versus', stage: s.id, ids: ['taro', KC.ROSTER[1 + Math.floor(Math.random() * 9)].id], players: ['human', 'cpu'], seed: 3, single: true, hideScore: true, onEnd: () => G.go('title', { menu: true }) }); } }));
    ['boards', 'pots', 'bull'].forEach(b => rows.push({ label: 'BONUS: ' + KC.BONUS[b].title, act: () => { D.open = false; G.go('bonus', { kind: b, onEnd: () => G.go('title', { menu: true }) }); } }));
    ['I', 'II', 'III', 'ALL'].forEach(l => rows.push({ label: 'LESSON ' + l, act: () => { D.open = false; G.go('practice', { lesson: l }); } }));
    rows.push({ label: 'THE ENDING', act: () => go('cutscene', { id: 'ending', stage: 'stadium', story: true, after: () => G.go('title') }) }); rows.push({ label: 'CREDITS', act: () => go('credits', {}) }); rows.push({ label: 'ATTRACT MODE', act: () => { D.open = false; G.go('attract'); } });
    rows.push({ label: 'RANK +1', act: () => { KC.ensureStory(); S.s.belt = Math.min(9, S.s.belt + 1); } }); rows.push({ label: 'RANK -1', act: () => { KC.ensureStory(); S.s.belt = Math.max(0, S.s.belt - 1); } });
    rows.push({ label: '+10000 SCORE', act: () => { KC.ensureStory(); S.s.score += 10000; } });
    rows.push({ label: 'WIN THIS ROUND', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.endRound(0); D.open = false; } } }); rows.push({ label: 'LOSE THIS ROUND', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.endRound(1); D.open = false; } } });
    rows.push({ label: 'WIN THIS MATCH', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.rounds[0] = cur.bout.needRounds - 1; cur.bout.endRound(0); D.open = false; } } }); rows.push({ label: 'LOSE THIS MATCH', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.rounds[1] = cur.bout.needRounds - 1; cur.bout.endRound(1); D.open = false; } } });
    rows.push({ label: () => 'REFEREE CALL: ' + up(Object.keys(KC.CALLS)[D.callIdx || 0]), act: () => { const ids = Object.keys(KC.CALLS); D.callIdx = ((D.callIdx || 0) + 1) % ids.length; if (cur && cur.bout) cur.bout.call(ids[D.callIdx]); } });
    rows.push({ label: 'RESET THE SAVE', act: () => { KC.save.erase(); D.note = 'SAVE ERASED'; } });
  } else {
    const b = cur && cur.bout, a = cur && cur.ais && cur.ais.find(Boolean), lp = b && b.lastPoint;
    rows.push({ label: 'VERSION ' + KC.VERSION + ' / ' + (E.versionLabel ? E.versionLabel() : ''), info: true }); rows.push({ label: 'SCENE ' + (G.scene && G.scene.name) + ' MODE ' + (cur && cur.d && cur.d.mode), info: true });
    rows.push({ label: 'SEED ' + (cur && cur.d && cur.d.seed) + '  BOUT PHASE ' + (b ? b.phase : '-'), info: true }); rows.push({ label: 'FPS ' + Math.round(G.fps || 0), info: true });
    rows.push({ label: a ? 'AI LEVEL ' + a.level + ' ' + a.thought : 'AI -', info: true });
    rows.push({ label: lp && !lp.aiuchi ? 'LAST HIT ' + lp.tech + ' PTS ' + lp.pts + (lp.counter ? ' COUNTER' : '') : 'LAST HIT -', info: true });
    rows.push({ label: lp && !lp.aiuchi ? 'TIMING Q ' + lp.timingQ.toFixed(2) + ' SPACING Q ' + lp.spacingQ.toFixed(2) + ' Q ' + lp.q.toFixed(2) : '', info: true });
  }
  return rows;
};
KC.ensureStory = () => { if (!KC.Story.s) KC.Story.s = KC.Story.fresh(); };
KC.exportTuning = () => JSON.stringify(KC.TUNE, null, 1);
KC.dev.close = () => { KC.dev.open = false; KC.dev.save(); };
KC.devUpdate = (dt, scene) => {
  const D = KC.dev, I = KC.game.input; D.enabledOnce = true; const rows = D.rows(); D.row = clamp(D.row, 0, Math.max(0, rows.length - 1));
  if (I.pressed('tabR')) { D.tab = (D.tab + 1) % 4; D.row = 0; KC.sfx('menuMove'); } if (I.pressed('tabL')) { D.tab = (D.tab + 3) % 4; D.row = 0; KC.sfx('menuMove'); }
  if (I.repeat('up', .35, .1)) { D.row = (D.row + rows.length - 1) % rows.length; KC.sfx('menuMove'); } if (I.repeat('down', .35, .1)) { D.row = (D.row + 1) % rows.length; KC.sfx('menuMove'); }
  const R = rows[D.row]; D.hold = (D.hold || 0) + dt; const dir = I.repeat('left', .3, .04) ? -1 : I.repeat('right', .3, .04) ? 1 : 0;
  if (R && dir) { if (R.slider) { const [lo, hi, def, st] = R.slider; R.set(clamp(R.get() + dir * st, lo, hi)); } else if (R.toggle) { R.set(!R.get()); KC.sfx('menuMove'); } }
  if (R && I.pressed('reset') && R.slider) { R.set(R.slider[2]); KC.sfx('menuBack'); }
  if (R && (I.pressed('confirm') || (R.hold && I.repeat('confirm', .3, .05))) && !R.info) { if (R.act) R.act(); else if (R.toggle) R.set(!R.get()); else if (R.slider && false) { } KC.sfx('menuOk'); I.consumeAll(); }
  // mouse: click a tab, a row, or drag a slider
  const p = I.pointer(), c = I.clicked(); D.hit = D.hit || {};
  if (c && D.hit.tabs) D.hit.tabs.forEach((x, i) => { if (c[0] >= x.x0 && c[0] < x.x1 && c[1] < D.hit.y0) { D.tab = i; D.row = 0; } });
  if (p && D.hit.rows && (I.down('confirm') === false)) { /* hover */ }
  if (c && D.hit.rows) D.hit.rows.forEach((x, i) => { if (c[1] >= x.y && c[1] < x.y + x.h && c[0] >= D.hit.x0 && c[0] < D.hit.x1) { D.row = x.i; const rr = rows[x.i]; if (rr.slider) { const [lo, hi, def, st] = rr.slider, k = clamp((c[0] - D.hit.sx0) / (D.hit.sx1 - D.hit.sx0), 0, 1); rr.set(lo + (hi - lo) * k); } else if (rr.toggle) rr.set(!rr.get()); else if (rr.act && !rr.info) { rr.act(); } } });
  if (I.pressed('devKey') || I.pressed('cancel') || I.pressed('pause')) { I.consumeAll(); D.close(); }
  if (I.down('l3') && I.pressed('r3')) D.close();
  if (D.freezeAll && !D.open) { /* leaving the panel keeps freeze if on */ }
  if (D.invincible && scene.bout) scene.bout.invincible[0] = true;
};
KC.drawDev = (r, scene) => {
  const D = KC.dev, rows = D.rows(), perPage = 8, page = Math.floor(D.row / perPage), start = page * perPage;
  r.overlay(g => {
    const W = r.W, H = r.H, x0 = Math.round(W / 2 - 170), y0 = 16, w = 340, h = 140;
    px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.panel(g, x0, y0, w, h, { alpha: .95 });
    D.hit = { tabs: [], rows: [], y0: y0 + 16, x0: x0, x1: x0 + w };
    KC.dev.tabs.forEach((t, i) => { const tx = x0 + 8 + i * 80; D.hit.tabs.push({ x0: tx, x1: tx + 76 }); KC.text(g, t, tx + 38, y0 + 5, i === D.tab ? '#ffd060' : '#8a84a8', { align: 'center' }); if (i === D.tab) px.rect(g, tx, y0 + 15, 76, 2, '#ffd060'); });
    rows.slice(start, start + perPage).forEach((rw, k) => {
      const i = start + k, y = y0 + 22 + k * 12, sel = i === D.row; D.hit.rows.push({ y: y - 1, h: 12, i }); if (sel) px.rect(g, x0 + 4, y - 1, w - 8, 12, '#5a2a3a');
      const lab = typeof rw.label === 'function' ? rw.label() : rw.label; KC.text(g, lab, x0 + 10, y, sel ? '#fff6d0' : '#cfc8e8');
      if (rw.slider) { const [lo, hi, def, st] = rw.slider, v = rw.get(), sx = x0 + 190, sw = 90; D.hit.sx0 = sx; D.hit.sx1 = sx + sw; px.rect(g, sx, y + 3, sw, 3, '#10101c'); px.rect(g, sx, y + 3, Math.round((v - lo) / (hi - lo) * sw), 3, v === def ? '#7a7a98' : '#ffd060'); px.rect(g, sx + Math.round((def - lo) / (hi - lo) * sw), y + 1, 1, 7, '#fff'); KC.text(g, String(+v.toFixed(2)), x0 + w - 10, y, v === def ? '#9ad8ff' : '#ffd060', { align: 'right' }); }
      else if (rw.toggle) KC.text(g, rw.get() ? 'ON' : 'OFF', x0 + w - 10, y, rw.get() ? '#5ad8a0' : '#8a84a8', { align: 'right' });
    });
    KC.text(g, 'PAGE ' + (page + 1) + '/' + Math.max(1, Math.ceil(rows.length / perPage)) + (D.note ? '   ' + D.note : ''), x0 + 10, y0 + h - 12, '#8a84a8');
    KC.text(g, 'DEV: UP/DOWN SELECT  LEFT/RIGHT ADJUST  RESET: ' + (KC.family() === 'key' ? 'R' : 'TRIANGLE') + '  TABS: Q/E OR L1/R1', W / 2, y0 + h + 6, '#9ad8ff', { align: 'center' });
  });
  KC.promptBar(r, [['confirm', 'DO'], ['cancel', 'CLOSE']]);
};
// hotkeys once dev mode has been enabled: F2 and ` (any fight / bonus scene); L3+R3 is read in devHotkeys each frame
KC.devHotkey = () => { const D = KC.dev, sc = KC.game.scene && KC.game.scene.name; if ((D.enabledOnce || /[?&]dev=1/.test(location.search)) && ['fight', 'bonus'].includes(sc)) { D.open = !D.open; D.enabledOnce = true; if (!D.open) D.save(); } };
// F2, backquote or L3+R3 toggle the panel once dev mode has been enabled (or with ?dev=1)
KC.devPoll = () => { if (SESSION) return; const I = KC.game.input; if (I.pressed('devKey') || (I.down('l3') && I.pressed('r3')) || (I.down('r3') && I.pressed('l3'))) KC.devHotkey(); };
