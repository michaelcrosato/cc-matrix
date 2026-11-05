/* =============================================================================
 * 36-dev: DEV MODE, from the pause menu. A big 10-foot panel over the frozen
 * game with six tabs: TUNE (every BZ.TUNE value as a live slider by group, reset
 * all or a group, keep between visits, pin up to 3), SITUATION, CHEATS,
 * TRIGGERS, WARP and INFO (live numbers, frame step, copy snapshot).
 * L1 / R1 (Q / E) change tabs; up / down move; left / right change a value (hold
 * to speed up); ✕ toggles or runs; △ resets a slider or pins it; ○ closes.
 * The mouse hovers, clicks and drags sliders.
 * ========================================================================== */
BZ.DEV_TABS = ['TUNE', 'SITUATION', 'CHEATS', 'TRIGGERS', 'WARP', 'INFO'];
BZ.dev = {
  on: false, tab: 0, i: 0, scroll: 0, hold: 0, pins: [], pinI: 0, sit: null, msg: '', msgT: 0, step1: false,
  isOpen() { return this.on; },
  open() { this.on = true; this.i = 0; this.scroll = 0; this.sit = null; BZ.game.input.consumeAll(); BZ.bus.emit('dev', { open: true }); },
  close() { if (!this.on) return; this.on = false; BZ.game.input.consumeAll(); BZ.saveTune(); BZ.bus.emit('dev', { open: false }); },
  say(t) { this.msg = t; this.msgT = 2.5; },
  /** the rows of the current tab: { label, value(), left(d), act(), reset(), pin() } */
  rows() {
    const M = BZ.M, g = BZ.game, tab = BZ.DEV_TABS[this.tab], rows = [];
    if (tab === 'TUNE') {
      rows.push({ label: 'RESET ALL TO DEFAULTS', act: () => { BZ.resetTune(); this.say('Every value is back to its default.'); } });
      rows.push({ label: 'Keep tuning between visits', value: () => g.settings.keepTune ? 'ON' : 'OFF', act: () => { g.settings.set('keepTune', !g.settings.keepTune); BZ.saveTune(); } });
      let grp = null;
      for (const m of BZ.TUNE_META) {
        const [group, key, label, def, min, max, step] = m;
        if (group !== grp) { grp = group; rows.push({ label: '— ' + group.toUpperCase() + ' —  (✕ resets the group)', head: true, act: () => { BZ.resetTune(group); this.say(group + ' reset.'); } }); }
        rows.push({ label, key, slider: [min, max, step, def], value: () => +TUNE[key].toFixed(3), left: d => { TUNE[key] = clamp(+(TUNE[key] + d * step).toFixed(4), min, max); }, reset: () => { TUNE[key] = def; }, pin: () => { const k = this.pins.indexOf(key); if (k >= 0) this.pins.splice(k, 1); else if (this.pins.length < 3) this.pins.push(key); else this.say('Three pins at most.'); } });
      }
      return rows;
    }
    if (tab === 'SITUATION') {
      if (!M) return [{ label: 'Start a match first (WARP).' }];
      const s = this.sit || (this.sit = { inning: M.inning, half: M.half, outs: M.outs, balls: M.balls, strikes: M.strikes, a: M.teams[0].runs, h: M.teams[1].runs, b1: !!M.bases[0], b2: !!M.bases[1], b3: !!M.bases[2], bat: BZ.offense(M).order, st: Math.round(BZ.staminaOf(M, BZ.defense(M).pitcher)), m0: Math.round(M.teams[0].meter), m1: Math.round(M.teams[1].meter), park: BZ.PARK_ORDER.indexOf(M.parkId), wind: M.park.wind.mph || 0 });
      const num = (label, k, min, max) => ({ label, value: () => s[k], left: d => { s[k] = clamp(s[k] + d, min, max); } });
      const tog = (label, k) => ({ label, value: () => s[k] ? 'ON' : 'OFF', act: () => { s[k] = !s[k]; }, left: () => { s[k] = !s[k]; } });
      rows.push(num('Inning', 'inning', 1, 12), { label: 'Half', value: () => s.half.toUpperCase(), act: () => { s.half = s.half === 'top' ? 'bottom' : 'top'; }, left: () => { s.half = s.half === 'top' ? 'bottom' : 'top'; } },
        num('Outs', 'outs', 0, 2), num('Balls', 'balls', 0, 3), num('Strikes', 'strikes', 0, 2), num('Away runs', 'a', 0, 30), num('Home runs', 'h', 0, 30),
        tog('Runner on first', 'b1'), tog('Runner on second', 'b2'), tog('Runner on third', 'b3'), num('Batter (order)', 'bat', 0, 8), num('Pitcher stamina', 'st', 0, 100),
        num('Away meter', 'm0', 0, 100), num('Home meter', 'm1', 0, 100), { label: 'Park (applies to a new match)', value: () => BZ.get('parks', BZ.PARK_ORDER[s.park]).name, left: d => { s.park = (s.park + d + 6) % 6; } }, num('Wind mph', 'wind', 0, 16),
        { label: 'APPLY', act: () => { this.applySituation(s); } });
      return rows;
    }
    if (tab === 'CHEATS') {
      const c = M ? M.cheats : {};
      const t = (label, k) => ({ label, value: () => c[k] ? 'ON' : 'OFF', act: () => { if (M) c[k] = !c[k]; }, left: () => { if (M) c[k] = !c[k]; } });
      return [t('Perfect contact always', 'perfect'), t('Every pitch a strike', 'allStrikes'), t('Infinite meter', 'infMeter'), t('Infinite turbo', 'infTurbo'), t('Fielders ignore walls (no clip)', 'noclip'), t('The CPU plays my side (autoplay)', 'autoplay'), t('Slow motion x0.25', 'slowmo'), t('Freeze the AI', 'freezeAI'), t('Show the zone always', 'showZone'), t('Show pitch path and timing bar', 'showPath'), t('Show landing markers and AI targets', 'showTargets'), t('Show catch radii', 'showRadii'), t('Sure hands (no errors)', 'surehands')];
    }
    if (tab === 'TRIGGERS') {
      const need = f => () => { if (!M) return this.say('Start a match first.'); f(); this.close(); };
      return [
        { label: 'Force the next pitch: heater, middle', act: need(() => { M.forcePitch = { type: 'heater', target: [0, 17], q: 1 }; }) },
        { label: 'Force the next pitch: curve, low away', act: need(() => { M.forcePitch = { type: 'curve', target: [5, 10], q: 1 }; }) },
        { label: 'Force a home run on the next contact', act: need(() => { M.cheats.homer = true; }) },
        { label: 'Hazard now', act: need(() => BZ.hazards.now(M)) },
        { label: 'Meteor shower (Tranquility)', act: need(() => { if (BZ.hazard && BZ.hazard.shower) BZ.hazard.shower(M); else this.say('Only at Tranquility Dome.'); }) },
        { label: 'Rhubarb!', act: need(() => { if (M.phase === 'atBat' && M.ab) BZ.rhubarb.start(M, 'dev'); }) },
        { label: 'Batzooka cinematic', act: need(() => { BZ.offense(M).meter = 100; BZ.supers.arm(M, BZ.offense(M).side); M.cheats.homer = true; M.forcePitch = { type: 'heater', target: [0, 17], q: 1 }; M.forceContact = 'perfect'; }) },
        { label: 'Replay the last play', act: need(() => { M.cinematic = { kind: 'replay', t: 0, done: false }; BZ.cams.startReplay(M, 6); }) },
        { label: 'End the half-inning', act: need(() => { M.outs = 3; BZ.match.halfOver(M); }) },
        { label: 'Walk-off now', act: need(() => { M.half = 'bottom'; M.inning = Math.max(M.inning, M.innings); M.teams[1].runs = M.teams[0].runs + 1; M.walkoff = true; BZ.bus.emit('walkoff', { team: M.teams[1].id }); BZ.match.final(M); }) },
        { label: 'Win the game', act: need(() => { const s = M.teams.findIndex(T => T.humans.length); const w = s < 0 ? 0 : s; M.teams[w].runs = M.teams[1 - w].runs + 1; BZ.match.final(M); }) },
        { label: 'Lose the game', act: need(() => { const s = M.teams.findIndex(T => T.humans.length); const w = s < 0 ? 1 : 1 - s; M.teams[w].runs = M.teams[1 - w].runs + 1; BZ.match.final(M); }) }
      ];
    }
    if (tab === 'WARP') {
      const go = (scene, data) => () => { this.close(); BZ.attract.on = false; g.go(scene, data); };
      const rows2 = [{ label: 'Title', act: go('title') }, { label: 'Attract mode', act: () => { this.close(); BZ.attract.start(); } }, { label: 'Animation gallery', act: go('gallery') }, { label: 'AI Hub card (mocked)', act: () => { this.close(); BZ.hub.mockCard(); } }, { label: 'Credits', act: go('credits', { ending: false }) }];
      BZ.STOPS.slice(1).forEach((st, i) => { rows2.push({ label: 'Tour: ' + st.title + ' pregame', act: () => { this.close(); BZ.tour.d().tour.stop = i; BZ.tour.d().tour.started = true; BZ.tour.playNext(); } }); rows2.push({ label: 'Tour: ' + st.title + ' game', act: () => { this.close(); BZ.tour.d().tour.stop = i; BZ.tour.startGame(i + 1); } }); rows2.push({ label: 'Tour: ' + st.title + ' postgame (win)', act: () => { this.close(); g.go('story', { steps: BZ.STORY[st.id].win, park: st.park, then: () => g.go('tourMap') }); } }); });
      BZ.LESSONS.forEach((L, i) => rows2.push({ label: 'Lesson ' + (i + 1) + ': ' + L.title, act: () => { this.close(); BZ.training.start(i); } }));
      rows2.push({ label: 'Derby (1 player)', act: go('derby', { players: 1, park: 'kernel' }) });
      BZ.PARK_ORDER.forEach(p => rows2.push({ label: 'Exhibition at ' + BZ.get('parks', p).name, act: () => { this.close(); BZ.startMatch({ mode: 'exhibition', park: p, away: 'krakens', home: BZ.get('parks', p).team === 'krakens' ? 'comets' : BZ.get('parks', p).team, innings: 3, humans: { 0: [], 1: [g.input] }, seed: 9 }); } }));
      rows2.push({ label: 'Unlock everything', act: () => { BZ.tour.unlockAll(); this.say('Everything is unlocked.'); } }, { label: '+5,000 Fan Bucks', act: () => { BZ.tour.addFB(5000); this.say('+5,000 FB.'); } }, { label: 'Reset the save (slots, training, unlocks)', act: () => { BZ.tour.data = BZ.tour.blank(); BZ.tour.setMeta({ training: [], all: false }); try { for (const s of g.saves.list()) g.saves.erase(s.slot); } catch (e) { /* blocked */ } this.say('Save reset.'); } });
      return rows2;
    }
    // INFO
    const b = M ? M.ball : null, lc = M && M.lastContact;
    return [
      { label: 'FPS ' + g.fps + '   scene ' + g.sceneName + (M ? '   phase ' + M.phase + (M.ab ? '/' + M.ab.sub : '') : '') },
      { label: b ? 'Ball ' + b.mode + '  x' + Math.round(b.x - M.park.H.x) + ' y' + Math.round(b.y - M.park.H.y) + ' z' + Math.round(b.z) + '  v' + Math.round(b.vx) + ',' + Math.round(b.vy) + ',' + Math.round(b.vz) : 'No match' },
      { label: lc ? 'Last contact: ' + lc.kind + ' ' + lc.grade + '  timing ' + lc.timingMs + 'ms  dx ' + lc.dx + ' dz ' + lc.dz + '  Q ' + lc.Q + '  EV ' + lc.EV + '  launch ' + lc.launch + '  spray ' + lc.spray : 'No contact yet' },
      { label: 'Seed ' + (M ? M.seed : '-') + '   device ' + g.input.lastDevice + '   glyphs ' + BZ.family() },
      { label: 'Events: ' + BZ.bus.ring.slice(-8).map(e => e.ev).join(' ') },
      { label: 'Engine ' + (E.versionLabel ? E.versionLabel() : E.version) + '   game ' + BZ.version },
      { label: 'FRAME STEP (one 1/120 s step)', act: () => { this.step1 = true; } },
      { label: 'COPY SNAPSHOT (JSON to the clipboard)', act: () => { const s = JSON.stringify(BZ.debug.snapshot()); try { navigator.clipboard.writeText(s); this.say('Snapshot copied.'); } catch (e) { this.say('Clipboard blocked: snapshot in the console.'); } try { console.log(s); } catch (e) { /* no console */ } } }
    ];
  },
  applySituation(s) {
    const M = BZ.M; if (!M) return;
    M.inning = s.inning; M.half = s.half; M.outs = s.outs; M.balls = s.balls; M.strikes = s.strikes; M.teams[0].runs = s.a; M.teams[1].runs = s.h;
    const O = BZ.offense(M); O.order = s.bat % O.lineup.length;
    const pick = k => O.lineup[(O.order + 9 - k) % O.lineup.length];
    M.bases = [s.b1 ? pick(1) : null, s.b2 ? pick(2) : null, s.b3 ? pick(3) : null];
    BZ.match.setupDefense(M); const D = BZ.defense(M); D.stamina[D.pitcher.id] = s.st;
    M.teams[0].meter = s.m0; M.teams[1].meter = s.m1;
    if (M.park.def.wind) M.park.wind = { x: s.wind, y: 0, mph: Math.round(s.wind * 1.4) };
    M.runners = []; M.play = null; M.cinematic = null; BZ.cams.replay = null; BZ.cams.moon = null;
    BZ.match.newAtBat(M); M.balls = s.balls; M.strikes = s.strikes;
    this.say('Situation applied.'); this.close();
  },
  update(dt) {
    const g = BZ.game, P = g.players, rows = this.rows();
    this.msgT = Math.max(0, this.msgT - dt);
    const I = P[0];
    if (I.pressed('r1') || I.pressed('right') && false) { this.tab = (this.tab + 1) % BZ.DEV_TABS.length; this.i = 0; this.scroll = 0; this.sit = null; }
    if (I.pressed('l1')) { this.tab = (this.tab + BZ.DEV_TABS.length - 1) % BZ.DEV_TABS.length; this.i = 0; this.scroll = 0; this.sit = null; }
    if (I.repeat('down', .25, .06)) this.i = Math.min(rows.length - 1, this.i + 1);
    if (I.repeat('up', .25, .06)) this.i = Math.max(0, this.i - 1);
    const row = rows[this.i];
    if (row) {
      const lr = I.down('right') ? 1 : I.down('left') ? -1 : 0;
      if (lr) { this.hold += dt; if (I.pressed('right') || I.pressed('left') || (this.hold > .3 && Math.floor(this.hold * (this.hold > 1.2 ? 30 : 10)) !== Math.floor((this.hold - dt) * (this.hold > 1.2 ? 30 : 10)))) { if (row.left) row.left(lr * (this.hold > 1.2 ? 4 : 1)); } } else this.hold = 0;
      if (I.pressed('south') || I.pressed('confirm')) { if (row.act) row.act(); else if (row.left) row.left(1); BZ.sfx('confirm'); }
      if (I.pressed('north')) { if (row.reset && !I.down('l2')) { row.reset(); this.say(row.label + ' reset.'); } if (row.pin && I.down('l2')) row.pin(); else if (row.pin && !row.reset) row.pin(); }
      if (I.pressed('west') && row.pin) row.pin();
    }
    if (I.pressed('east') || I.pressed('cancel')) { this.close(); return; }
    // the mouse: hover moves, click acts, drag a slider
    if (I.lastDevice === 'mouse' && this.rects) {
      const p = I.pointer(), c = I.clicked();
      this.rects.forEach(([x, y, w, h, k]) => { if (p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) this.i = k; });
      const r0 = rows[this.i];
      if (p && I.down('south') && r0 && r0.slider && this.slider && p[1] >= this.slider[1] - 3 && p[1] <= this.slider[1] + 9 && this.slider[4] === this.i) { const [x, , w] = this.slider, [min, max, step] = r0.slider, u = clamp((p[0] - x) / w, 0, 1); TUNE[r0.key] = clamp(Math.round((min + u * (max - min)) / step) * step, min, max); }
      else if (c && r0 && r0.act) r0.act();
      for (let k = 0; k < BZ.DEV_TABS.length; k++) { const tr = this.tabRects && this.tabRects[k]; if (c && tr && c[0] >= tr[0] && c[0] < tr[0] + tr[2] && c[1] >= tr[1] && c[1] < tr[1] + tr[3]) { this.tab = k; this.i = 0; this.scroll = 0; } }
    }
    if (this.step1 && BZ.M) { this.step1 = false; BZ.match.step(BZ.M, 1 / 120); }
  },
  /** pinned sliders while playing: Create + D-pad (keyboard [ ] adjust, \ picks the next pin) */
  pinInput(dt) {
    if (!this.pins.length) return;
    const I = BZ.game.input, key = this.pins[this.pinI % this.pins.length], m = BZ.tuneMeta(key); if (!m) return;
    const create = I.down('create');
    if (I.pressed('pinNext') || (create && I.pressed('down'))) this.pinI = (this.pinI + 1) % this.pins.length;
    if (I.repeat('pinUp') || (create && I.repeat('right'))) TUNE[key] = clamp(+(TUNE[key] + m[6]).toFixed(4), m[4], m[5]);
    if (I.repeat('pinDown') || (create && I.repeat('left'))) TUNE[key] = clamp(+(TUNE[key] - m[6]).toFixed(4), m[4], m[5]);
    if (create) { I.suppress && I.suppress('left'); I.suppress && I.suppress('right'); }
  },
  drawPins(g, r) {
    if (!this.pins.length || this.on) return;
    const w = 90 * this.pins.length, x = Math.round(r.W / 2 - w / 2);
    E.ui.box(g, x, 2, w, 12, { bg: '#0a0a14', border: '#5affd0', alpha: .8 });
    this.pins.forEach((k, i) => { const m = BZ.tuneMeta(k); E.font.text(g, (i === this.pinI % this.pins.length ? '▸' : '') + m[2].slice(0, 10) + ' ' + (+TUNE[k].toFixed(2)), x + 4 + i * 90, 4, i === this.pinI % this.pins.length ? '#5affd0' : '#ffffff'); });
  },
  draw(r) {
    const rows = this.rows();
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(W - 16, 600), x = Math.round(W / 2 - w / 2), y = 6, h = H - 12;
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#000000'));
      E.ui.box(g, x, y, w, h, { bg: ['#101830', '#05080f'], border: '#5affd0', alpha: .97 });
      E.font.title(g, 'DEV MODE', x + 8, y + 5, { scale: 2, colors: ['#ffffff', '#5affd0'] });
      // tabs
      this.tabRects = [];
      let tx = x + 104;
      BZ.DEV_TABS.forEach((t, k) => { const tw = E.font.width(t) + 10; E.ui.box(g, tx, y + 6, tw, 14, { bg: k === this.tab ? ['#5affd0', '#1a8a6a'] : ['#2a3460', '#141a34'], border: '#5a6aa0' }); E.font.text(g, t, tx + 5, y + 9, k === this.tab ? '#001a10' : '#ffffff'); this.tabRects.push([tx, y + 6, tw, 14]); tx += tw + 3; });
      const top = y + 28, rh = 13, per = Math.floor((h - 60) / rh);
      if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + per) this.scroll = this.i - per + 1;
      this.rects = [];
      rows.slice(this.scroll, this.scroll + per).forEach((row, k) => {
        const idx = this.scroll + k, yy = top + k * rh, sel = idx === this.i;
        if (sel) E.ui.box(g, x + 4, yy - 2, w - 8, rh, { bg: '#2a4a6a', border: '#5affd0' });
        this.rects.push([x + 4, yy - 2, w - 8, rh, idx]);
        E.font.text(g, (row.key && this.pins.includes(row.key) ? '• ' : '') + row.label, x + 10, yy, row.head ? '#ffd040' : '#ffffff');
        if (row.slider) {
          const [min, max, , def] = row.slider, v = TUNE[row.key], sx = x + w * .55, sw = w * .3, u = (v - min) / (max - min), du = (def - min) / (max - min);
          px.rect(g, sx, yy + 3, sw, 2, '#3a4a6a'); px.rect(g, sx + du * sw, yy + 1, 1, 6, '#8a8aa8'); px.rect(g, sx, yy + 3, Math.round(sw * u), 2, v === def ? '#5affd0' : '#ffd040'); px.disc(g, sx + sw * u, yy + 4, 3, sel ? '#ffffff' : '#c8d0e0');
          E.font.text(g, String(row.value()), x + w - 10, yy, v === def ? '#a8b8e8' : '#ffd040', { align: 'right' });
          if (sel) this.slider = [sx, yy + 1, sw, 0, idx];
        } else if (row.value) E.font.text(g, String(row.value()), x + w - 10, yy, '#5affd0', { align: 'right' });
      });
      if (this.msgT > 0) E.font.text(g, this.msg, W / 2, y + h - 30, '#ffd040', { align: 'center' });
      const I = BZ.game.input;
      BZ.drawPrompts(g, I, [['l1', 'TAB'], ['r1', 'TAB'], ['left', 'CHANGE'], ['south', 'TOGGLE'], ['north', 'RESET'], ['west', 'PIN'], ['east', 'CLOSE']], W / 2, y + h - 16, { align: 'center', size: 10 });
    });
  }
};
BZ.saveTune = () => { try { const g = BZ.game; if (g && g.settings && g.settings.keepTune) E.store.set('bz:tune', BZ.TUNE); else E.store.set('bz:tune', null); } catch (e) { /* storage blocked */ } };
BZ.loadTune = () => { try { const t = E.store.get('bz:tune', null); if (t && BZ.game.settings.keepTune) for (const k in t) if (k in BZ.TUNE_DEFAULTS) TUNE[k] = t[k]; } catch (e) { /* storage blocked */ } };
