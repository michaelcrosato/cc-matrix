/* ---- DEV MODE: from the pause menu. Live sliders for the balance (reset to defaults), cheats, one-press events,
 * debug overlays and jumps to every part of the game. ` toggles it once it has been opened ---- */
TT.devCheats = null;
/** one-press events (the dev panel's, the attract director's and the tests'): game.debug.force(name, opts) */
TT.force = (name, o = {}) => {
  if (!M) return false;
  const P = M.players, seat0 = TT.seats[0], b = M.ball;
  const carrierOf = t => { const h = holder(); if (h && h.team === t) return h; return P.filter(p => p.team === t && standing(p)).sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0] || P.find(p => p.team === t && onField(p)); };
  const toPlay = () => { if (M.phase !== 'play') { for (const p of P) if (onField(p) && p.st !== 'binned') resetPlayer(p); setPhase('play'); } };
  const t0 = o.team != null ? o.team : seat0 ? seat0.team : 0;
  switch (name) {
    case 'tryHome': case 'tryAway': { const t = name === 'tryHome' ? 0 : 1; toPlay(); const p = carrierOf(t); p.x = tryLineOf(t) + dirOf(t) * 20; p.y = G.CY + 40; giveBall(p, 'restart'); tryScored(p); return true; }
    case 'giveP1': { toPlay(); const p = seat0 && seat0.pid >= 0 ? P[seat0.pid] : carrierOf(0); giveBall(p, 'restart'); return true; }
    case 'to5m': { toPlay(); const p = carrierOf(t0); giveBall(p, 'restart'); p.x = tryLineOf(p.team) - dirOf(p.team) * 51; p.y = G.CY; return true; }
    case 'knockOn': { toPlay(); const p = carrierOf(M.possession); emit('knockOn', { pid: p.id }); stop('KNOCK-ON', 1.4, () => scrum(1 - p.team, p.x, p.y, 'knockOn'), { call: 'KNOCK ON!', noHooter: true }); return true; }
    case 'scrum': scrum(t0, b.x, b.y, 'dev'); return true;
    case 'touch': { toPlay(); const t = M.possession; emit('touch', { team: 1 - t }); stop('TOUCH', 1.2, () => lineout(1 - t, clamp(b.x, G.X0 + 51, G.X1 - 51), b.y < G.CY ? 0 : 1), { call: 'TOUCH!', noHooter: true }); return true; }
    case 'lineout': lineout(t0, clamp(b.x, G.X0 + 51, G.X1 - 51), 0); return true;
    case 'penalty': { const off = P.find(p => p.team !== t0 && onField(p)); toPlay(); stop('PENALTY', 1.2, () => penalty(t0, b.x, b.y, 'dev'), { call: 'PENALTY!', noHooter: true }); emit('foul', { pid: off.id, kind: 'dev' }); return true; }
    case 'yellow': { toPlay(); const off = P.filter(p => p.team === 1 - M.possession && standing(p))[0]; if (!off) return false; emit('cheapUnseen', { pid: off.id }); giveCard(off, 'cheap'); stop('PENALTY', 1.4, () => penalty(1 - off.team, off.x, off.y, 'cheap'), { call: 'PENALTY!', noHooter: true }); return true; }
    case 'kickoff': startKickoff(t0); return true;
    case 'dropout': startKickoff(t0, 'dropout'); return true;
    case 'ruck': { toPlay(); const c = carrierOf(M.possession); giveBall(c, 'restart'); c.st = 'tackled'; c.stT = .5; TT.sp.startRuck(c); if (o.jackal) { M.ph.bar -= .5; M.ph.jackal = true; const j = P.find(p => p.team !== c.team && standing(p)); if (j) emit('jackal', { pid: j.id }); } return true; }
    case 'monsterHit': { toPlay(); const c = carrierOf(M.possession); giveBall(c, 'restart'); const h = P.filter(p => p.team !== c.team && standing(p)).sort((a, d) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(d.x - c.x, d.y - c.y))[0]; if (!h) return false; h.x = c.x + dirOf(c.team) * 10; h.y = c.y; h.facing = Math.atan2(c.y - h.y, c.x - h.x); c.evade = 0; c.fendT = 0; resolveTackle(h, c, 'big', 1, false); return true; }
    case 'powerup': TT.arc.spawnPowerup(o.kind || 'pie'); return true;
    case 'hazard': TT.arc.trigger(o.kind || M.venue.hazard); return true;
    case 'onFire': { const p = seat0 && seat0.pid >= 0 ? P[seat0.pid] : carrierOf(0); p.fire = 90; emit('onFire', { pid: p.id }); return true; }
    case 'thunder': { toPlay(); const c = carrierOf(o.team != null ? o.team : M.possession); giveBall(c, 'restart'); M.hype[c.team] = 100; startSuper(c, 'thunder'); return true; }
    case 'hurricane': { toPlay(); const c = carrierOf(M.possession); giveBall(c, 'restart'); const d = P.filter(p => p.team !== c.team && standing(p)).sort((a, e) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(e.x - c.x, e.y - c.y))[0]; if (!d) return false; M.hype[d.team] = 100; startSuper(d, 'hurricane'); return true; }
    case 'thunderTry': { toPlay(); const t = M.possession, c = carrierOf(t); giveBall(c, 'restart'); c.x = tryLineOf(t) - dirOf(t) * 200; c.y = G.CY + 30; M.hype[t] = 100; startSuper(c, 'thunder'); return true; }
    case 'onFireTry': { toPlay(); const t = M.possession, c = carrierOf(t); giveBall(c, 'restart'); c.fire = 90; emit('onFire', { pid: c.id }); c.x = tryLineOf(t) - dirOf(t) * 120; c.y = G.CY - 60; return true; }
    case 'dropGoal': { toPlay(); const t = M.possession, c = carrierOf(t); giveBall(c, 'restart'); c.x = tryLineOf(t) - dirOf(t) * 160; c.y = G.CY; c.facing = dirOf(t) > 0 ? 0 : PI; for (const p of P) if (p.team !== t && onField(p) && Math.hypot(p.x - c.x, p.y - c.y) < 60) p.x += dirOf(t) * 80; TT.sim.kick(c, .85, Object.assign(TT.blankIntent(), { mx: dirOf(t) })); return true; }
    case 'replay': TT.replay.lastT = -99; TT.replay.trigger('dev', (holder() || P[0]).id, true); return true;
    case 'hooter': M.clock = M.halfLen; return true;
    case 'half': M.half = 1; endHalf(); return true;
    case 'full': M.half = 2; M.hooter = true; M.suddenDeath = true; fullTime(); return true;
    case 'sudden': M.score[1] = M.score[0]; M.half = 2; M.suddenDeath = false; endHalf(); return true;
    case 'scoreHome': M.score[0] = Math.max(0, M.score[0] + (o.n || 5)); return true;
    case 'scoreAway': M.score[1] = Math.max(0, M.score[1] + (o.n || 5)); return true;
    case 'clock': M.clock = Math.max(0, M.clock + (o.n || -30)); return true;
  }
  return false;
};

TT.dev = {
  open: false, enabled: false, frozen: true, tab: 0, i: 0, scroll: 0, confirmReset: 0, view: {}, holdT: 0,
  TABS: ['TUNING', 'CHEATS', 'EVENTS', 'VIEW', 'JUMP'],
  CHEATS: [['god', 'God mode (my team)'], ['infTurbo', 'Infinite turbo'], ['hypeFull', 'Hype always full'], ['alwaysFire', 'Always ON FIRE'], ['refBlind', 'Ref blind'], ['refStrict', 'Ref strict'], ['cpuFrozen', 'CPU frozen'], ['noClock', 'No clock'], ['bigHeads', 'Big heads']],
  EVENTS: [['tryHome', 'Score a try (home)'], ['tryAway', 'Score a try (away)'], ['giveP1', 'Give P1 the ball'], ['to5m', 'Ball to their 5 m line'], ['knockOn', 'Knock-on > scrum'], ['touch', 'Touch > lineout'], ['penalty', 'Foul > penalty'], ['yellow', 'Yellow card'], ['kickoff', 'Kick-off'], ['dropout', '22 drop-out'], ['ruck', 'A ruck now'], ['monsterHit', 'Monster hit on carrier'],
    ['powerup:pie', 'Spawn MEAT PIE'], ['powerup:iron', 'Spawn IRON SHOULDERS'], ['powerup:boot', 'Spawn MEGA BOOT'], ['powerup:grease', 'Spawn GREASE JERSEY'], ['powerup:horn', 'Spawn AIR HORN'],
    ['hazard:chicken', 'Hazard: chicken'], ['hazard:flames', 'Hazard: flame jets'], ['hazard:lightning', 'Hazard: lightning'], ['hazard:mud', 'Hazard: mud'], ['onFire', 'ON FIRE for P1'], ['thunder', 'Thunder Run'], ['hurricane', 'Hurricane Hit'], ['replay', 'Replay last 5 s'], ['hooter', 'The hooter'], ['half', 'Skip to half-time'], ['full', 'Skip to full time'], ['sudden', 'Sudden death'],
    ['scoreHome:5', 'Home +5'], ['scoreHome:-5', 'Home -5'], ['scoreAway:5', 'Away +5'], ['scoreAway:-5', 'Away -5'], ['clock:-30', 'Clock -30 s']],
  VIEWS: [['shape', 'AI shape slots'], ['cone', "Ref's sight cone (always)"], ['offside', 'Offside lines (always)'], ['ranges', 'Tackle and fend ranges'], ['lanes', 'Pass lanes and receivers'], ['skel', 'Rig skeletons'], ['fps', 'Frame-rate readout'], ['slow', 'Slow motion (0.25x)'], ['state', 'State readout'], ['step', 'Frame step (□ while FROZEN)']],
  JUMPS: () => [['cup:r1', 'Round one match'], ['cup:qf', 'Quarter-final match'], ['cup:sf', 'Semi-final match'], ['cup:gf', 'Grand final match'], ['story:prologue', 'Cutscene: prologue'], ['story:r1', 'Cutscene: round one'], ['story:qf', 'Cutscene: quarter-final'], ['story:sf', 'Cutscene: semi-final'], ['story:gf', 'Cutscene: grand final'], ['story:victory', 'The victory'], ['story:third', 'The third half'], ['credits', 'The credits']].concat(TT.DRILLS.map(d => ['drill:' + d.id, 'Drill: ' + d.name]), [['session', 'Session-style match (75 s halves)'], ['title', 'Title screen']]),
  rows() {
    const t = this.TABS[this.tab];
    if (t === 'TUNING') return [{ kind: 'reset', label: this.confirmReset > 0 ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS' }].concat(TUNE.defs.map(d => ({ kind: 'slider', d, label: d.label })));
    if (t === 'CHEATS') return this.CHEATS.map(([k, l]) => ({ kind: 'toggle', k, label: l }));
    if (t === 'EVENTS') return this.EVENTS.map(([k, l]) => ({ kind: 'event', k, label: l }));
    if (t === 'VIEW') return this.VIEWS.map(([k, l]) => ({ kind: 'view', k, label: l }));
    return this.JUMPS().map(([k, l]) => ({ kind: 'jump', k, label: l }));
  },
  openPanel() { this.enabled = true; this.open = true; this.frozen = true; TT.game.timeScale = this.view.slow ? .25 : 1; },
  close() { this.open = false; },
  /** runs every match step, open or not: the cheats that act each step, the ` toggle */
  tick() {
    if (!M) return;
    const c = TT.devCheats || {};
    if (c.hypeFull) M.hype[0] = M.hype[1] = 100;
    if (c.alwaysFire) for (const p of M.players) if (p.team === 0) p.fire = Math.max(p.fire, 5);
    if (this.view.slow) TT.game.timeScale = .25;
  },
  update(dt) {
    const I = TT.game.input, rows = this.rows();
    this.confirmReset = Math.max(0, this.confirmReset - dt);
    if (I.pressed('cancel') || I.pressed('ci')) { this.close(); I.consumeAll(); return true; }
    if (I.pressed('tri')) this.frozen = !this.frozen;
    // the mouse: hover focuses, click a tab or a row, drag a slider
    const ptr = I.pointer && I.pointer(), click = I.clicked && I.clicked();
    if (ptr && this.geo) {
      const g = this.geo;
      if (click) { const tb = g.tabs.find(t => click[0] >= t[0] && click[0] < t[0] + t[2] && click[1] >= t[1] && click[1] < t[1] + 12); if (tb) { this.tab = tb[3]; this.i = 0; this.scroll = 0; } }
      const k = g.rows.find(rw => ptr[0] >= rw[0] && ptr[0] < rw[0] + rw[2] && ptr[1] >= rw[1] && ptr[1] < rw[1] + rw[3]);
      if (k && I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; this.i = k[4]; }
      if (click && k) { this.i = k[4]; const row = rows[this.i]; if (row.kind === 'slider') { const u = clamp((click[0] - k[5]) / k[6], 0, 1), d = row.d; TUNE.set(d.key, Math.round((d.min + u * (d.max - d.min)) / d.step) * d.step); } else this.activate(row); }
      if (I.down('mouseL') && k && rows[k[4]].kind === 'slider' && ptr[0] >= k[5]) { const d = rows[k[4]].d, u = clamp((ptr[0] - k[5]) / k[6], 0, 1); TUNE.set(d.key, Math.round((d.min + u * (d.max - d.min)) / d.step) * d.step); }
    }
    if (!this.frozen) return false;   // LIVE: the keys go to the match
    if (I.pressed('l1')) { this.tab = (this.tab + 4) % 5; this.i = 0; this.scroll = 0; }
    if (I.pressed('r1')) { this.tab = (this.tab + 1) % 5; this.i = 0; this.scroll = 0; }
    if (I.repeat('up')) this.i = (this.i + rows.length - 1) % rows.length;
    if (I.repeat('down')) this.i = (this.i + 1) % rows.length;
    const row = rows[this.i];
    if (row && row.kind === 'slider') {
      const d = row.d, held = I.down('left') || I.down('right'); this.holdT = held ? this.holdT + dt : 0;
      const mult = this.holdT > 1.5 ? 5 : 1;
      if (I.repeat('left')) TUNE.set(d.key, +(TUNE.base[d.key] - d.step * mult).toFixed(4));
      if (I.repeat('right')) TUNE.set(d.key, +(TUNE.base[d.key] + d.step * mult).toFixed(4));
      if (I.pressed('sq')) TUNE.reset(d.key);
    }
    if (I.pressed('x') || I.pressed('confirm')) { if (row) this.activate(row); }
    if (this.view.step && I.pressed('sq') && (!row || row.kind !== 'slider')) { const it = TT.control.collect(1 / 120); TT.sim.step(1 / 120, it); }
    I.consumeAll();
    return true;
  },
  activate(row) {
    TT.audio.sfx('confirm');
    if (row.kind === 'reset') { if (this.confirmReset > 0) { TUNE.reset(); this.confirmReset = 0; TT.game.note('ALL DEFAULTS RESTORED'); } else this.confirmReset = 2; }
    else if (row.kind === 'toggle') {
      const c = TT.devCheats = TT.devCheats || {}; c[row.k] = !c[row.k]; if (M) M.cheats[row.k] = c[row.k];
      if (row.k === 'bigHeads') TT.applyBigHeads();
    }
    else if (row.kind === 'event') { const [n, v] = row.k.split(':'); const o = {}; if (v != null) { if (isNaN(+v)) o.kind = v; else o.n = +v; } TT.force(n, o); this.frozen = false; }
    else if (row.kind === 'view') { this.view[row.k] = !this.view[row.k]; PR.dbg = this.view; if (row.k === 'slow') TT.game.timeScale = this.view.slow ? .25 : 1; if (row.k === 'fps') TT.settings.set && TT.settings.spec('fps') && TT.settings.set('fps', !!this.view.fps); }
    else if (row.kind === 'jump') { this.close(); TT.jump(row.k); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pw = Math.round(W * .45), x0 = W - pw, rows = this.rows(), vis = Math.max(6, Math.floor((H - 80) / 15));
      E.ui.box(g, x0, 0, pw, H, { bg: ['#0c1428', '#060a14'], border: '#40e0a0', alpha: .94 });
      E.font.text(g, 'DEV MODE', x0 + 8, 6, '#40e0a0', { outline: false, scale: 2 });
      E.font.text(g, this.frozen ? 'FROZEN' : 'LIVE', W - 8, 8, this.frozen ? '#80c0ff' : '#ff8060', { align: 'right', outline: false });
      const tabs = [];
      let tx = x0 + 6;
      this.TABS.forEach((t, k) => { const w = E.font.width(t, { font: 'tiny' }) + 8; E.ui.box(g, tx, 26, w, 12, { bg: k === this.tab ? '#2a6a50' : '#141c30', border: k === this.tab ? '#40e0a0' : '#2a3450', gradient: false }); E.font.text(g, t, tx + 4, 29, '#ffffff', { font: 'tiny', outline: false }); tabs.push([tx, 26, w, k]); tx += w + 3; });
      if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + vis) this.scroll = this.i - vis + 1;
      const geoRows = [];
      rows.slice(this.scroll, this.scroll + vis).forEach((row, j) => {
        const k = j + this.scroll, y = 44 + j * 15, on = k === this.i;
        if (on) E.ui.box(g, x0 + 4, y - 2, pw - 8, 14, { bg: '#1e3a5a', border: '#ffe060', gradient: false });
        E.font.text(g, row.label, x0 + 8, y + 1, on ? '#ffffff' : '#c8d0e8', { outline: false, font: row.kind === 'slider' ? 'tiny' : undefined });
        let sx = 0, sw = 0;
        if (row.kind === 'slider') {
          const d = row.d, v = TUNE.base[d.key], u = (v - d.min) / (d.max - d.min); sw = Math.round(pw * .34); sx = W - sw - 46;
          px.rect(g, sx, y + 3, sw, 4, '#2a3450'); px.rect(g, sx, y + 3, Math.round(sw * u), 4, Math.abs(v - d.value) > 1e-9 ? '#ffb040' : '#40e0a0');
          px.rect(g, sx + Math.round(sw * (d.value - d.min) / (d.max - d.min)), y + 1, 1, 8, '#ffffff');
          E.font.text(g, String(+v.toFixed(3)), W - 8, y + 1, '#ffffff', { align: 'right', font: 'tiny', outline: false });
        } else if (row.kind === 'toggle' || row.kind === 'view') { const onv = row.kind === 'toggle' ? (TT.devCheats || {})[row.k] : this.view[row.k]; E.font.text(g, onv ? 'ON' : 'OFF', W - 10, y + 1, onv ? '#40e0a0' : '#6a7490', { align: 'right', outline: false }); }
        geoRows.push([x0 + 4, y - 2, pw - 8, 14, k, sx, sw]);
      });
      this.geo = { tabs, rows: geoRows };
      if (this.frozen) { TT.prompt(g, '{b:l1}{b:r1} TABS  {b:x} PICK  {b:sq} RESET', x0 + pw / 2, H - 26, TT.game.input); TT.prompt(g, '{b:tri} GO LIVE  {b:ci} CLOSE', x0 + pw / 2, H - 13, TT.game.input); }
      else TT.prompt(g, '{b:tri} FREEZE  {b:ci} CLOSE  MOUSE DRAGS', x0 + pw / 2, H - 13, TT.game.input);
      if (this.view.state && M) E.font.text(g, M.phase + ' ' + M.sub + ' t' + M.phaseT.toFixed(1) + ' poss ' + M.possession + ' ball ' + M.ball.st, 6, H - 60, '#40e0a0', { font: 'tiny', outline: '#000' });
    });
    // the world overlays
    if (!M) return;
    const v = this.view;
    if (v.shape) for (const p of M.players) if (onField(p) && p.tx != null) { r.groundRing(p.tx, p.ty, 3, M.kits[p.team].cloth, .9); }
    if (v.ranges) for (const p of M.players) if (onField(p)) { r.groundRing(p.x, p.y, TUNE.v.tackleRange, '#ff8060', .3); }
    if (v.lanes) { const h = holder(); if (h) for (const q of receivers(h, null)) r.groundRing(q.x, q.y, 6, '#60ff80', .8); }
    if (v.cone) PR.dbg = v;
    if (v.skel) for (const p of M.players) if (onField(p) && PR.rigs[p.id]) PR.rigs[p.id].debug(r);
  }
};
TT.applyBigHeads = () => { const on = (TT.devCheats && TT.devCheats.bigHeads) || TT.settings.bigHeads === 'On'; for (const rig of PR.rigs) { if (!rig.o) continue; rig.o.headR0 = rig.o.headR0 || rig.o.headR; rig.o.headR = rig.o.headR0 * (on ? 1.8 : 1); } };
