/* ---- DEV MODE: a full-screen 10-foot panel over the frozen game, reached from the pause menu's Dev Mode (every
 * pausable scene) or the Backquote key; hidden in AI Hub sessions. Tabs (L1 / R1, Tab, or a click): TUNING (live
 * sliders against their defaults, "Reset all to defaults" first), TOGGLES (overlays, play cheats, overrides), JUMP
 * (story chapters, match flow, set the score, force the next delivery / outcome / review / rain / chaos / item, a
 * Super Over, attract segments, the jukebox, unlock all, reset save) and INFO (the snapshot, seeds, versions, the
 * last bus events and commentary lines, the floor bakes). Up / down (or hover) picks a row, left / right adjusts
 * (held: faster; the mouse drags a slider's knob, the wheel scrolls), Cross toggles or runs, Triangle resets the row,
 * Circle closes. Values apply at once; a DEV badge shows on the HUD while any tuning differs from its default. ---- */
const DEV_TABS = ['TUNING', 'TOGGLES', 'JUMP', 'INFO'];
const Dev = {
  isOpen: false, tab: 0, row: 0, scroll: 0, held: 0, t: 0, confirmReset: 0, toggles: {}, score: { runs: 0, wkts: 0 }, sel: { ch: 1, beat: 0, del: 0, out: 0, chaos: 0, item: 0, seg: 0, song: 0 },
  // while the panel is open its scene can't pause (Escape is the panel's back key, not the pause menu's); the lock waits a
  // moment so the engine's pause screen, opened to reach the Dev Mode item, has closed first
  open() { if (HUB) return; this.isOpen = true; this.t = 0; try { game.resume(); } catch (e) { game.paused = false; } game.paused = false; this.scene = game.scene; this.restorePause = false; game.input.consumeAll(); K.sfx('pause'); coverage.mark('dev'); },
  close() { this.isOpen = false; if (this.restorePause && this.scene) this.scene.pausable = true; this.restorePause = false; game.input.consumeAll(); K.sfx('cancel'); },
  toggle() { if (this.isOpen) this.close(); else this.open(); },
  m() { return Play.m; },
  /** the rows of the current tab: { label, value(), left(), right(), act(), reset() } */
  rows() {
    const m = this.m(), self = this;
    if (this.tab === 0) return [{ label: 'RESET ALL TO DEFAULTS', act: () => { Tuning.resetAll(); Views.rebuild('broadcast'); Views.rebuild('wide'); K.sfx('confirm'); } }].concat(Tuning.defs.map(d => ({ label: d.label, slider: d, value: () => fmtNum(Tuning.raw(d.key), d.step) + '  (' + fmtNum(d.def, d.step) + ')', left: k => this.nudge(d, -k), right: k => this.nudge(d, k), reset: () => { Tuning.reset(d.key); this.after(d.key); } })));
    if (this.tab === 1) {
      const tg = (key, label, fn) => ({ label, value: () => (this.toggles[key] ? 'ON' : 'OFF'), act: () => { this.toggles[key] = !this.toggles[key]; this.applyToggles(); if (fn) fn(this.toggles[key]); } });
      const cyc = (label, list, get, set) => ({ label, value: () => get() || 'default', left: () => { const i = list.indexOf(get()); set(list[(i - 1 + list.length) % list.length]); }, right: () => { const i = list.indexOf(get()); set(list[(i + 1) % list.length]); } });
      return [tg('hitboxes', 'Show hitboxes and zones'), tg('trajectory', 'Show the trajectory (Owl-Eye)'), tg('intent', 'Show AI intent'), tg('assign', 'Show fielder assignments'), tg('skeleton', 'Skeleton overlay'), tg('stats', 'Frame stats', v => game.settings.set('showFps', !!v)),
        tg('slowmo', 'Slow motion (x0.25)'), tg('invincible', 'Invincible batter'), tg('infiniteHype', 'Infinite Hype'), tg('alwaysFire', 'Always ON FIRE'), tg('autoBat', 'Auto-bat (autopilot)'), tg('autoBowl', 'Auto-bowl (autopilot)'), tg('noChaos', 'No chaos events'), tg('muteCommentary', 'Mute commentary'),
        cyc('Weather override', ['clear', 'overcast', 'rain', 'fog'], () => m && m.weather, v => { if (!m) return; m.weather = v; m.fog = v === 'fog' ? .6 : 0; game.weather = v === 'rain' ? { kind: 'rain', amount: .6, wind: .2 } : null; if (v === 'fog') coverage.mark('fog'); }),
        cyc('Time of day override', ['day', 'dusk', 'night'], () => m && m.timeOfDay, v => { if (m) { m.timeOfDay = v; if (v === 'night') coverage.mark('night'); } })];
    }
    if (this.tab === 2) {
      const S = this.sel, OUTS = ['dot', '1', '4', '6', 'bowled', 'caught', 'lbw', 'runout', 'stumped', 'wide'], DEL = Object.keys(DELIVERIES), CH = Object.keys(CHAOS), IT = Object.keys(ITEMS), SG = Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s));
      const pick = (label, key, list, act, fmt) => ({ label, value: () => (fmt ? fmt(list[S[key] % list.length]) : String(list[S[key] % list.length])), left: () => { S[key] = (S[key] - 1 + list.length) % list.length; }, right: () => { S[key] = (S[key] + 1) % list.length; }, act: () => act(list[S[key] % list.length]) });
      return [
        pick('Story: start chapter', 'ch', [1, 2, 3, 4, 5], n => this.startChapter(n), n => 'CHAPTER ' + n + ' at ' + ['pre-match scene', 'the match', 'the win scene'][S.beat % 3].toUpperCase()),
        pick('  ...at beat', 'beat', ['pre-match scene', 'the match', 'the win scene'], () => this.startChapter([1, 2, 3, 4, 5][S.ch % 5])),
        { label: 'Start a Quick Match preset', act: () => { this.close(); game.go('match', { cfg: quickConfig({ toss: false }) }); } },
        { label: 'Skip to the last over', act: () => { if (!m || !m.inn) return; m.inn.balls = Math.max(m.inn.balls, (Math.ceil(m.inn.overs) - 1) * 6); m.over = Math.floor(m.inn.balls / 6); K.sfx('confirm'); } },
        { label: 'Win the innings', act: () => { if (!m || !m.inn) return; if (m.inn.target) { m.inn.runs = m.inn.target - 1; m.force.outcome = { kind: 'four' }; } else { m.inn.balls = m.inn.overs * 6 - 1; m.force.outcome = { kind: '6' === '6' ? 'six' : 'six' }; } this.close(); } },
        { label: 'Lose the innings', act: () => { if (!m || !m.inn) return; m.inn.wkts = m.inn.wicketsMax - 1; m.force.outcome = { kind: 'bowled' }; this.close(); } },
        { label: 'Set score: runs', value: () => String(this.score.runs), left: () => { this.score.runs = Math.max(0, this.score.runs - 1); }, right: () => { this.score.runs++; } },
        { label: 'Set score: wickets', value: () => String(this.score.wkts), left: () => { this.score.wkts = Math.max(0, this.score.wkts - 1); }, right: () => { this.score.wkts = Math.min(9, this.score.wkts + 1); } },
        { label: '  Apply the score', act: () => { if (!m || !m.inn) return; m.inn.runs = this.score.runs; m.inn.wkts = Math.min(this.score.wkts, m.inn.wicketsMax - 1); K.sfx('confirm'); } },
        pick('Force next delivery', 'del', DEL, id => { if (!m) return; m.force.delivery = { id, target: [0, 80], grade: 'green' }; K.sfx('confirm'); }, id => DELIVERIES[id].name),
        pick('Force next outcome', 'out', OUTS, k => { if (!m) return; m.force.outcome = { kind: { 4: 'four', 6: 'six' }[k] || k }; m.cpuPlan = null; if (m.phase === 'setup') AI.planBowling(m); if (k !== 'wide') { m.cfg.cheat.catchesOnce = k === 'caught'; } this.close(); }),
        { label: 'Force a review (LBW, wrongly not out)', act: () => { if (!m) return; m.force.outcome = { kind: 'review' }; m.cfg.cheat.lbwGiven = false; m.cpuPlan = null; this.close(); } },
        { label: 'Force the rain delay', act: () => { if (!m) return; if (m.phase === 'setup' || m.phase === 'between') { m.startChaos('rain'); } else m.flags.rainNext = true; this.close(); } },
        pick('Force a chaos event', 'chaos', CH, id => { if (!m) return; if (id === 'rain') m.startChaos('rain'); else m.startChaos(id); this.close(); }, id => CHAOS[id].name),
        pick('Spawn an item token', 'item', IT, id => { if (!m) return; m.spawnToken(id); K.sfx('item'); }, id => ITEMS[id].name),
        { label: 'Trigger a Super Over', act: () => { if (!m || !m.innings[0]) return; if (m.innNo === 0) { m.inn.done = true; m.inn.end = 'overs'; m.endInnings(); } const i1 = m.innings[0], i2 = m.innings[1]; if (i2) { i2.runs = i1.runs; i2.done = true; i2.end = 'overs'; m.innNo = 1; m.endInnings(); } this.close(); } },
        pick('Play attract segment', 'seg', ATTRACT.map((s, i) => i), n => { this.close(); game.go('attract', { segment: n }); }, n => (n + 1) + ': ' + ATTRACT[n].caption),
        pick('Jukebox', 'song', SG, id => { if (id.startsWith('sting:')) Audio.sting(id.slice(6)); else Audio.music(id, { restart: true }); }),
        { label: 'Unlock all teams', act: () => { for (const t of TEAM_IDS) Profile.unlock(t); K.sfx('item'); } },
        { label: 'Reset save', value: () => (this.confirmReset ? 'PRESS AGAIN' : ''), act: () => { if (++this.confirmReset >= 2) { this.confirmReset = 0; Profile.reset(); try { game.saves.erase('auto'); } catch (e) { /* none */ } Story.data = null; K.sfx('cancel'); } } }
      ];
    }
    return [];
  },
  /** jump into story chapter n at the beat chosen on the JUMP tab: its pre-match scene, the match, or the win scene */
  startChapter(n) { const beat = ['pre', 'match', 'win'][this.sel.beat % 3], c = CHAPTERS[n - 1]; this.close(); if (!Story.data) Story.newGame(); if (beat === 'pre') game.go('cutscene', { scene: c.pre, then: () => Story.match(n) }); else if (beat === 'match') Story.match(n); else game.go('cutscene', { scene: c.win, then: () => game.go('storymap') }); },
  nudge(d, k) { Tuning.set(d.key, Tuning.raw(d.key) + d.step * k); this.after(d.key); },
  after(key) { if (key === 'camPitch' || key === 'camScale') { Views.rebuild('broadcast'); if (MatchView.cam === 'broadcast') MatchView.setCam('broadcast'); } if (key === 'wideScale') Views.rebuild('wide'); },
  applyToggles() {
    const m = this.m(), t = this.toggles; if (!m) return;
    Object.assign(m.cfg.cheat, { invincible: !!t.invincible, infiniteHype: !!t.infiniteHype, alwaysFire: !!t.alwaysFire, autoBat: !!t.autoBat || m.cfg.mode === 'attract', autoBowl: !!t.autoBowl || m.cfg.mode === 'attract', noChaos: !!t.noChaos });
  },
  update(dt) {
    this.t += dt; const I = game.input;
    if (!this.restorePause && this.t > .15 && this.scene && this.scene.pausable && this.scene === game.scene) { this.scene.pausable = false; this.restorePause = true; }
    if (I.pressed('cancel') || I.pressed('pause')) { I.consumeAll(); this.close(); return; }
    // R1 / Space / Tab: the next tab; L1 / Shift: the previous one. A tab switch is the whole of that press (Space is also
    // confirm: it must not run the new tab's first row)
    if (I.pressed('run') || I.pressed('tab')) { I.consumeAll(); this.tab = (this.tab + 1) % DEV_TABS.length; this.row = 0; this.scroll = 0; K.sfx('select'); return; }
    if (I.pressed('back')) { I.consumeAll(); this.tab = (this.tab + DEV_TABS.length - 1) % DEV_TABS.length; this.row = 0; this.scroll = 0; K.sfx('select'); return; }
    const rows = this.rows(); if (!rows.length) return;
    if (I.repeat('up', .3, .07)) this.row = (this.row - 1 + rows.length) % rows.length;
    if (I.repeat('down', .3, .07)) this.row = (this.row + 1) % rows.length;
    const R = rows[this.row];
    const lr = I.down('left') ? -1 : I.down('right') ? 1 : 0;
    if (lr) { this.held += dt; } else this.held = 0;
    const accel = this.held > 1.2 ? 5 : this.held > .5 ? 2 : 1;
    if (R && I.repeat('left', .3, .05)) { R.left && R.left(R.slider ? accel : 1); }
    if (R && I.repeat('right', .3, .05)) { R.right && R.right(R.slider ? accel : 1); }
    if (R && (I.pressed('confirm') || I.pressed('shot'))) { I.consumeAll(); if (R.act) R.act(); }
    if (R && I.pressed('special') && R.reset) { R.reset(); K.sfx('cancel'); }
    // the mouse: tabs, hover, a click, dragging a slider's knob
    const L = this.layout; if (!L) return;
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (c) { DEV_TABS.forEach((t, i) => { const x = L.tabX + i * L.tabW; if (c[0] >= x && c[0] < x + L.tabW && c[1] >= L.tabY && c[1] < L.tabY + 14) { this.tab = i; this.row = 0; this.scroll = 0; } }); }
    if (p && I.mouse && I.clock - I.mouse.t < .05) { const k = Math.floor((p[1] - L.y0) / L.rowH) + this.scroll; if (k >= 0 && k < rows.length && p[1] >= L.y0 && p[0] > L.x0 && p[0] < L.x0 + L.w) this.row = k; }
    if (c) { const k = Math.floor((c[1] - L.y0) / L.rowH) + this.scroll; if (k >= 0 && k < rows.length && c[0] > L.x0 && c[0] < L.x0 + L.w && c[1] >= L.y0) { this.row = k; const Q = rows[k]; if (Q.slider) this.dragTo(Q.slider, c[0]); else if (Q.act) Q.act(); } }
    if (I.down('shot') && p && R && R.slider && I.lastDevice === 'mouse') this.dragTo(R.slider, p[0]);
    const wh = I.wheel ? I.wheel() : 0; if (wh) this.scroll = clamp(this.scroll + Math.sign(wh), 0, Math.max(0, rows.length - L.visible));
  },
  dragTo(d, x) { const L = this.layout, u = clamp((x - L.sx) / L.sw, 0, 1); if (x < L.sx - 6 || x > L.sx + L.sw + 6) return; Tuning.set(d.key, d.min + (d.max - d.min) * u); this.after(d.key); },
  draw(r) {
    if (!this.isOpen) return;
    r.overlay(g => {
      px.blend(g, .9, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06080c'));
      UI.text(g, 'DEV MODE', 10, 6, '#ff5a4a', { scale: 2 });
      const ca = game.cornerArea && game.cornerArea(), right = ca && ca.y0 < 30 ? Math.floor(ca.x0) - 4 : r.W - 8, tabW = Math.min(80, Math.floor((right - 112) / 4)), tabX = right - tabW * 4, tabY = 6;   // (clear of the engine's corner buttons)
      DEV_TABS.forEach((t, i) => { const x = tabX + i * tabW; px.rect(g, x, tabY, tabW - 2, 14, i === this.tab ? '#5a4410' : '#1a1a22'); UI.text(g, t, x + tabW / 2 - 1, tabY + 3, i === this.tab ? '#ffd36a' : '#a8a8b8', { align: 'center' }); });
      const rows = this.rows(), rowH = 13, y0 = 30, x0 = 8, w = r.W - 16, visible = Math.floor((r.H - y0 - 22) / rowH);
      if (this.row < this.scroll) this.scroll = this.row; if (this.row >= this.scroll + visible) this.scroll = this.row - visible + 1;
      const sx = x0 + Math.round(w * .52), sw = Math.round(w * .3);
      this.layout = { x0, y0, w, rowH, visible, tabX, tabW, tabY, sx, sw };
      if (this.tab === 3) return this.drawInfo(g, r, y0);
      for (let k = this.scroll; k < Math.min(rows.length, this.scroll + visible); k++) {
        const R = rows[k], y = y0 + (k - this.scroll) * rowH, on = k === this.row;
        if (on) { px.rect(g, x0, y - 2, w, rowH - 1, '#3a2c0c'); px.rect(g, x0, y - 2, 2, rowH - 1, '#ffd36a'); }
        UI.text(g, R.label, x0 + 6, y, on ? '#ffffff' : '#c8c8d0');
        if (R.slider) { const d = R.slider, u = (Tuning.raw(d.key) - d.min) / (d.max - d.min), du = (d.def - d.min) / (d.max - d.min); px.rect(g, sx, y + 3, sw, 3, '#2a2a3a'); px.rect(g, sx, y + 3, Math.round(sw * u), 3, Math.abs(Tuning.raw(d.key) - d.def) > 1e-9 ? '#ff8a4a' : '#5aa04a'); px.rect(g, sx + Math.round(sw * du), y + 1, 1, 7, '#ffffff'); px.rect(g, sx + Math.round(sw * u) - 2, y, 5, 9, on ? '#ffd36a' : '#c8c8c8'); }
        if (R.value) UI.text(g, R.value(), x0 + w - 6, y, on ? '#ffd36a' : '#a8a8b8', { align: 'right' });
      }
      Glyphs.row(g, r.W / 2, r.H - 13, game.input, [['run', 'TAB'], ['left', 'ADJUST'], ['confirm', 'RUN'], ['special', 'RESET'], ['cancel', 'CLOSE']], { align: 'center', color: '#c8c8d0' });
    });
  },
  drawInfo(g, r, y0) {
    const m = this.m(), snap = game.debug && game.debug.snapshot ? game.debug.snapshot() : {};
    let y = y0; const line = (s, c = '#c8c8d0') => { if (y > r.H - 24) return; UI.text(g, String(s).slice(0, 90), 10, y, c, { font: 'tiny' }); y += 8; };
    line('SCENE ' + snap.scene + '   ' + E.versionLabel() + '   game 1.0', '#ffd36a');
    if (m && m.inn) { line('MATCH ' + m.cfg.mode + ' ' + m.teams.map(t => t.code).join(' v ') + ' at ' + m.ground.id + ' - seed ' + m.cfg.seed + ' - phase ' + m.phase + ' ' + m.pt.toFixed(1) + 's'); line('INNINGS ' + (m.innNo + 1) + ': ' + m.inn.runs + '/' + m.inn.wkts + ' (' + m.oversText() + ') target ' + (m.inn.target || '-') + ' - hype ' + m.hype.map(Math.round).join('/') + ' - fire ' + m.fire.bat + '/' + m.fire.bowl); const last = m.inn.recs[m.inn.recs.length - 1]; if (last) line('LAST BALL ' + JSON.stringify({ d: last.delivery, kmh: last.kmh, shot: last.shot, g: last.grade, r: last.runs, w: last.wicket && last.wicket.how })); }
    line('FLOOR BAKES ' + (MatchView.B ? Object.keys(MatchView.B.map.floors).length : 0) + ' - tuning changed: ' + (Tuning.changed().join(', ') || 'none'));
    y += 2; line('LAST 20 EVENTS', '#ffd36a');
    for (const e of bus.log.slice(-20).reverse()) line(e.t.toFixed(2) + '  ' + e.type);
    y += 2; line('LAST 10 COMMENTARY LINES', '#ffd36a');
    for (const l of Commentary.log.slice(-10).reverse()) line(l.who + ': ' + l.text);
  }
};
const fmtNum = (v, step) => (step >= 1 ? String(Math.round(v)) : step >= .1 ? v.toFixed(1) : v.toFixed(2));
K.dev = Dev;
