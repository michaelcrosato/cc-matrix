/* ---- DEV MODE: reached from the pause menu (then F2, ` or L3+R3 toggle it; ?dev=1 in the address enables it).
 * Tabs: TUNING (live sliders, RESET ALL at the top), TOGGLES, WARP, INFO. 8 rows a page; up/down select, left/right
 * adjust (hold to accelerate), T or △ resets the focused value, L1/R1 or Q/E or a click change tabs; the mouse drags a
 * slider and clicks a toggle. Stored under 'kc:dev'. While any tuning value is changed the HUD shows DEV and no high
 * scores are recorded. ---- */
const TOGGLES = [['boxes', 'HIT, HURT AND PUSH BOXES'], ['frames', 'FRAME DATA'], ['inputs', 'INPUT DISPLAY'], ['thoughts', 'AI THOUGHTS'], ['invincible', 'P1 INVINCIBLE'],
  ['freezeCpu', 'FREEZE CPU'], ['infTime', 'INFINITE TIME'], ['slowmo', 'SLOW MOTION 0.25X'], ['frameStep', 'FRAME STEP (R1 / E)'], ['fps', 'FPS AND STATS'], ['muteVoices', 'MUTE VOICES'], ['skipCut', 'SKIP CUTSCENES'], ['unlocked', 'UNLOCK ALL']];
const Dev = KC.Dev = {
  active: false, tab: 0, row: 0, scroll: 0, badge: false, held: 0, msg: null,
  TABS: ['TUNING', 'TOGGLES', 'WARP', 'INFO'],
  load() { const s = KC.store('dev'); if (s) { Object.assign(TUNE, s.tune || {}); for (const k of Object.keys(s.toggles || {})) if (k in DEV) DEV[k] = s.toggles[k]; } },
  save() { const tg = {}; TOGGLES.forEach(([k]) => { tg[k] = DEV[k]; }); KC.store('dev', { tune: TUNE, toggles: tg }); },
  open() { if (SESSION) return; DEV.enabled = true; this.active = true; if (game.paused) game.resume(); game.input.consumeAll(); },
  toggle() { if (this.active) this.close(); else this.open(); },
  close() { this.active = false; game.input.consumeAll(); this.save(); },
  rows() {
    if (this.tab === 0) return [{ label: 'RESET ALL TO DEFAULTS', act: () => { KC.resetTune(); this.note('ALL VALUES RESET'); } }, { label: 'COPY TUNING JSON', act: () => this.copy(JSON.stringify(TUNE, null, 1)) }].concat(KC.TUNE_SPEC.map(s => ({ spec: s })));
    if (this.tab === 1) return TOGGLES.map(([k, l]) => ({ toggle: k, label: l })).concat([{ label: () => 'P2 CONTROL: ' + DEV.p2.toUpperCase(), act: () => { const o = ['cpu', 'pad2', 'dummy']; DEV.p2 = o[(o.indexOf(DEV.p2) + 1) % 3]; } }]);
    if (this.tab === 2) return this.warps();
    return [];
  },
  warps() {
    const w = [], go = (label, fn) => w.push({ label, act: () => { this.close(); KC.Attract.stop(); fn(); } });
    go('TECHNIQUE LAB', () => game.go('lab', { tech: 'frontKick' }));
    KC.DATA.ladder.forEach((n, i) => go('ROAD ' + (i + 1) + ': ' + n.label, () => { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.node = i; KC.Story.s.rank = Math.max(0, (KC.DATA.ladder.slice(0, i).filter(x => x.promote).pop() || { promote: 0 }).promote); KC.Story.go(); }));
    KC.FIGHT_STAGES.forEach(s => go('QUICK BOUT: ' + KC.STAGE[s].name, () => game.go('fight', { mode: 'versus', stage: s, white: 'taro', red: 'ebi', cpu: [false, true], cpuLevel: 5, seed: 3 })));
    ['boards', 'pots', 'bull'].forEach(k => go('BONUS: ' + KC.DATA.bonus[k].title, () => game.go('bonus', { kind: k })));
    ['I', 'II', 'III', 'ALL'].forEach(k => go('LESSON ' + k, () => game.go('practice', { lesson: k })));
    go('ENDING', () => { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.node = KC.DATA.ladder.length - 1; KC.Story.go(); }); go('CREDITS', () => game.go('credits', {})); go('ATTRACT MODE', () => game.go('attract', { loop: 1 }));
    w.push({ label: () => 'SET RANK: ' + (KC.Story.s ? KC.RANKS[KC.Story.s.rank][0] : '-'), act: () => { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.rank = (KC.Story.s.rank + 1) % 10; KC.Story.save(); } });
    w.push({ label: '+10,000 SCORE', act: () => { if (KC.Story.s) { KC.Story.add(10000); KC.Story.save(); this.note('+10000'); } } });
    w.push({ label: 'WIN THIS ROUND', act: () => KC.F && KC.F.bout.forceRound(0) }); w.push({ label: 'LOSE THIS ROUND', act: () => KC.F && KC.F.bout.forceRound(1) });
    w.push({ label: 'WIN THE MATCH', act: () => KC.F && KC.F.bout.forceMatch(0) }); w.push({ label: 'LOSE THE MATCH', act: () => KC.F && KC.F.bout.forceMatch(1) });
    Object.keys(KC.CALLS).forEach(id => w.push({ label: 'CALL: ' + KC.calls(id), act: () => { const B = KC.F && game.sceneName === 'fight' ? KC.F.bout : null; if (B) B.say(id); else KC.Voice.speak(KC.calls(id), 'genkotsu', { call: id }); } }));
    w.push({ label: 'RESET THE SAVE', act: () => { KC.store('save', null); KC.store('unlocks', null); this.note('SAVE ERASED'); } });
    return w;
  },
  note(t) { this.msg = { t: 0, text: t }; },
  copy(s) { try { navigator.clipboard.writeText(s); this.note('COPIED TO THE CLIPBOARD'); } catch (e) { this.note('COPY FAILED'); } this.lastCopy = s; },
  adjust(spec, d, fast) { const [k, , mn, mx, st] = spec; TUNE[k] = clamp(Math.round((TUNE[k] + d * st * (fast ? 5 : 1)) / st) * st, mn, mx); TUNE[k] = Math.round(TUNE[k] * 1000) / 1000; this.save(); },
  update(dt) {
    const I = game.input, rows = this.rows(), n = rows.length;
    if (I.pressed('dev') || I.pressed('cancel') || (I.down('l3') && I.pressed('r3'))) { this.close(); return; }
    if (I.pressed('l1')) { this.tab = (this.tab + 3) % 4; this.row = 0; this.scroll = 0; } if (I.pressed('r1')) { this.tab = (this.tab + 1) % 4; this.row = 0; this.scroll = 0; }
    if (n) { if (I.repeat('up', .3, .07)) this.row = (this.row + n - 1) % n; if (I.repeat('down', .3, .07)) this.row = (this.row + 1) % n; }
    if (this.row < this.scroll) this.scroll = this.row; if (this.row >= this.scroll + 8) this.scroll = this.row - 7;
    const it = rows[this.row];
    if (it) {
      const l = I.down('left'), r = I.down('right'); if (l || r) this.held += dt; else this.held = 0;
      if (it.spec && (I.repeat('left', .25, .05) || I.repeat('right', .25, .05))) this.adjust(it.spec, I.down('left') ? -1 : 1, this.held > 1);
      if (it.spec && I.pressed('more')) { TUNE[it.spec[0]] = it.spec[5]; this.save(); }
      if (I.pressed('confirm')) { if (it.toggle) { DEV[it.toggle] = !DEV[it.toggle]; this.save(); } else if (it.act) it.act(); KC.sfx('menuOk'); }
    }
    // the mouse: tabs, rows, slider drags
    const c = I.clicked && I.clicked(), p = I.pointer && I.pointer(), L = this.layout;
    if (L && c) { if (c[1] >= L.y0 - 18 && c[1] < L.y0 - 4) { const k = Math.floor((c[0] - L.x) / (L.w / 4)); if (k >= 0 && k < 4) { this.tab = k; this.row = 0; this.scroll = 0; } } else { const k = Math.floor((c[1] - L.y0) / 16); if (k >= 0 && k < 8 && rows[this.scroll + k]) { this.row = this.scroll + k; const it2 = rows[this.row]; if (it2.toggle) { DEV[it2.toggle] = !DEV[it2.toggle]; this.save(); } else if (it2.act) it2.act(); } } }
    if (L && p && I.down('click') && it && it.spec && p[0] > L.x + L.w - 114) { const sx = L.x + L.w - 110, k = clamp((p[0] - sx) / 100, 0, 1); const [key, , mn, mx, st] = it.spec; TUNE[key] = Math.round((mn + (mx - mn) * k) / st) * st; }
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 2) this.msg = null; }
  },
  draw(r) {
    if (!this.active && !DEV.fps) return;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (DEV.fps) { T(g, 'FPS ' + Math.round(game.fps || 0) + ' T ' + game.time.toFixed(1) + ' ' + (game.sceneName || ''), 4, 30, '#5aff8a', { font: 'tiny' }); }
      if (!this.active) return;
      const w = Math.min(W - 20, 380), x = W / 2 - w / 2, y0 = 52; this.layout = { x, w, y0 };
      box(g, x - 4, y0 - 40, w + 8, 8 * 16 + 70, { alpha: .95, bg: ['#101828', '#05080e'], border: '#5aff8a' });
      T(g, 'DEV MODE', x, y0 - 36, '#5aff8a'); T(g, 'L1/R1 OR Q/E: TABS   T/△: RESET VALUE   ESC: CLOSE', x + 60, y0 - 36, '#8ab0a0', { font: 'tiny' });
      this.TABS.forEach((t, k) => { const tx = x + k * w / 4, on = k === this.tab; px.rect(g, tx, y0 - 18, w / 4 - 2, 13, on ? '#2a5a3a' : '#16241c'); T(g, t, tx + 4, y0 - 15, on ? '#ffffff' : '#7a9a8a'); });
      const rows = this.rows();
      if (this.tab === 3) { this.info().forEach((l, k) => T(g, l, x + 4, y0 + k * 12, '#c8f8d8')); }
      for (let k = 0; k < 8; k++) {
        const i = this.scroll + k, it = rows[i]; if (!it) break; const y = y0 + k * 16, on = i === this.row;
        if (on) px.rect(g, x, y - 2, w, 14, '#1e3a2a');
        if (it.spec) { const [key, label, mn, mx] = it.spec, v = TUNE[key], ch = Math.abs(v - it.spec[5]) > 1e-9; T(g, label, x + 4, y, ch ? '#ffd060' : '#e8f8f0'); const sx = x + w - 110; px.rect(g, sx, y + 3, 100, 3, '#2a3a32'); px.rect(g, sx + Math.round((v - mn) / (mx - mn) * 100) - 2, y, 4, 9, on ? '#5aff8a' : '#a8c8b8'); T(g, String(Math.round(v * 100) / 100), sx - 34, y, '#a8ffc8'); }
        else if (it.toggle) { T(g, it.label, x + 4, y, '#e8f8f0'); T(g, DEV[it.toggle] ? 'ON' : 'OFF', x + w - 30, y, DEV[it.toggle] ? '#5aff8a' : '#6a8a7a'); }
        else T(g, typeof it.label === 'function' ? it.label() : it.label, x + 4, y, '#ffe8a0');
      }
      if (rows.length > 8) T(g, (this.row + 1) + '/' + rows.length, x + w - 30, y0 + 8 * 16 + 2, '#7a9a8a', { font: 'tiny' });
      if (this.msg) T(g, this.msg.text, x + 4, y0 + 8 * 16 + 2, '#ffd060');
    });
  },
  info() {
    const B = KC.F && game.sceneName === 'fight' ? KC.F.bout : null, h = B && B.lastHit, ai = KC.F && KC.F.ai && KC.F.ai[1];
    return ['VERSION ' + KC.VERSION + ' · ' + E.versionLabel(), 'SCENE ' + game.sceneName + (KC.F && game.sceneName === 'fight' ? ' (' + KC.F.mode + ')' : ''), 'BOUT ' + (B ? B.phase + ' ROUND ' + B.round + ' CLOCK ' + B.clock.toFixed(1) + ' PTS ' + B.points.join('-') : '-'),
      'SEED ' + (KC.F && KC.F.d ? KC.F.d.seed : '-') + '   FPS ' + Math.round(game.fps || 0), 'AI ' + (ai ? 'L' + ai.level + ' ' + ai.thought : '-'),
      'LAST HIT ' + (h && !h.block ? h.tech + ' ' + h.pts + (h.full ? ' FULL' : ' HALF') : '-'), h && !h.block ? '  TIMING ' + h.tq.toFixed(2) + ' SPACING ' + h.sq.toFixed(2) + ' Q ' + h.q.toFixed(2) + (h.counter ? ' COUNTER' : '') : '', 'TUNED: ' + (KC.tuneChanged() ? 'YES (NO HIGH SCORES)' : 'NO')];
  }
};
KC.resetTune = () => { Object.assign(TUNE, KC.TUNE_DEFAULTS); Dev.save(); };

/* ---- TECHNIQUE LAB (#lab/<techId>): the hero against a standing dummy; frame data and the measured contact gap ---- */
KC.Lab = {
  /** the largest gap at which a technique (from a standstill) still lands on a standing dummy, by simulation */
  measure(id) {
    const t = KC.TECH[id]; if (!t.pts) return null;
    const hits = gap => {
      const a = new Karateka('taro', 0, { x: 100 }), b = new Karateka('negi', 1, { x: 100 }); b.R = Object.assign({}, b.R, { stats: { walk: 1, reach: 1, speed: 1 } }); a.R = Object.assign({}, a.R, { stats: { walk: 1, reach: 1, speed: 1 }, signature: null });
      b.x = a.x + (a.w + b.w) / 2 + gap; const B = { o: {}, arena: [-1000, 1000] }; a.start(id, b);
      for (let k = 0; k < 400; k++) { a.step(1 / 120, b, [-1000, 1000]); const r = Bout.prototype.check.call(B, a, b); if (r && !r.block) return true; if (a.st !== 'tech') break; }
      return false;
    };
    let lo = -1; for (let g = 0; g <= 200; g += 4) if (hits(g)) lo = g; if (lo < 0) return { max: -1 }; let hi = lo + 4;
    for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (hits(m)) lo = m; else hi = m; }
    return { max: Math.round(lo * 10) / 10, table: t.reach[1] * TUNE.reachScale + (t.travel || 0) + (t.air ? 0 : 0) };
  }
};
const LAB_TECHS = KC.SCORING.concat(['block', 'frontFlip', 'backFlip', 'jump', 'backRoll']);
scenes.lab = SC({
  pausable: true,
  enter(d) { this.i = Math.max(0, LAB_TECHS.indexOf((d && d.tech) || 'frontKick')); this.stage = new Stage('dojo'); this.stage.enter(); this.reset(); this.slow = false; this.boxes = true; KC.music('practice'); this.row = 0; },
  reset() { this.a = new Karateka('taro', 0, { x: 160 }); this.b = new Karateka('negi', 1, { x: 220 }); this.m = KC.Lab.measure(LAB_TECHS[this.i]); this.t = 0; this.played = false; },
  play() { const id = LAB_TECHS[this.i], t = KC.TECH[id]; this.a.reset(160); this.b.reset(160 + (this.a.w + this.b.w) / 2 + (t.reach ? Math.max(0, (t.reach[0] + t.reach[1]) / 2 + (t.travel || 0) * .5) : 40)); this.a.face = 1; this.b.face = -1; this.a.start(id, this.b); this.hit = null; this.bout = { o: {}, arena: [0, 400] }; this.played = true; },
  update(dt) {
    const I = game.input, id = LAB_TECHS[this.i], t = KC.TECH[id];
    if (I.pressed('l1') || I.pressed('left')) { this.i = (this.i + LAB_TECHS.length - 1) % LAB_TECHS.length; this.reset(); } if (I.pressed('r1') || I.pressed('right')) { this.i = (this.i + 1) % LAB_TECHS.length; this.reset(); }
    if (I.pressed('confirm')) this.play(); if (I.pressed('slow')) this.slow = !this.slow;
    if (I.repeat('up', .3, .1)) this.row = (this.row + 4) % 5; if (I.repeat('down', .3, .1)) this.row = (this.row + 1) % 5;
    if (t.f && (I.pressed('tLeft') || I.pressed('tRight'))) { const d = I.pressed('tLeft') ? -1 : 1; if (this.row < 3) t.f[this.row] = Math.max(1, t.f[this.row] + d); else if (t.reach) t.reach[this.row - 3] = Math.max(0, t.reach[this.row - 3] + d * 2); this.m = KC.Lab.measure(id); }
    if (I.pressed('copy')) Dev.copy(JSON.stringify(Object.assign({}, t, { move: undefined })));
    if (I.pressed('cancel')) game.go('title', { menu: true });
    const sdt = dt * (this.slow ? .25 : 1); this.t += sdt;
    this.a.step(sdt, this.b, [0, 400]); this.b.step(sdt, this.a, [0, 400]);
    if (this.played && !this.hit) { const r = Bout.prototype.check.call(this.bout, this.a, this.b); if (r) { this.hit = r; this.a.hitDone = true; game.particles.impact(this.b.x - 8, 0, 36, 1, '#ffe070'); game.audio.sfx(r.full ? 'thwackFull' : 'thwackHalf'); } }
    if (this.a.st !== 'tech' && this.played && this.t > 0) { this.wait = (this.wait || 0) + sdt; if (this.wait > 1) { this.wait = 0; this.play(); } }
    this.a.update(sdt); this.b.update(sdt); KC.stageCam([this.a, this.b]);
  },
  draw(r) {
    this.stage.draw(r); this.a.draw(r); this.b.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, id = LAB_TECHS[this.i], t = KC.TECH[id];
      KC.title(g, 'TECHNIQUE LAB', W / 2, 4, 2); box(g, 6, 28, 170, 100, { alpha: .9 });
      T(g, t.name, 10, 32, '#ffd060'); const rows = ['STARTUP ' + t.f[0], 'ACTIVE ' + t.f[1], 'RECOVERY ' + t.f[2], 'REACH MIN ' + (t.reach ? t.reach[0] : '-'), 'REACH MAX ' + (t.reach ? t.reach[1] : '-')];
      rows.forEach((l, k) => T(g, (k === this.row ? '▸ ' : '  ') + l + (k < 3 ? ' F (' + this.a.steps(k, t) + ' STEPS)' : ''), 10, 44 + k * 10, k === this.row ? '#fff' : '#c8c0e0'));
      if (this.m) T(g, 'MEASURED GAP ' + this.m.max + ' (TABLE ' + this.m.table + ')', 10, 98, Math.abs(this.m.max - this.m.table) <= 4 ? '#5aff8a' : '#ff8a6a');
      if (this.hit && !this.hit.block) T(g, 'HIT ' + this.hit.pts + (this.hit.full ? ' FULL' : ' HALF') + ' GAP ' + this.hit.gap.toFixed(1), 10, 110, '#a8e8ff');
      if (this.boxes && t.reach) { const f = this.a, [mn, mx] = f.reach(t), e = f.x + f.w / 2, c0 = r.w(e + mn, 0, 30), c1 = r.w(e + mx + (t.travel || 0), 0, 30); px.rect(g, c0[0], c0[1], c1[0] - c0[0], 2, '#ff4a4a'); }
      KC.bar(g, [[KC.ok(), 'PLAY'], [KC.dev() === 'pad' ? 'btn:L1' : 'key:Q', ''], [KC.dev() === 'pad' ? 'btn:R1' : 'key:E', 'TECHNIQUE'], [KC.dev() === 'pad' ? 'btn:L2' : 'key:Z', 'SLOW'], [KC.dev() === 'pad' ? 'btn:R2' : 'key:C', 'COPY JSON'], [KC.dev() === 'pad' ? 'R:l' : 'key:J', 'ADJUST']]);
    });
  }
});
