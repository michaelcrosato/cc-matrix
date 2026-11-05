/* ---- CONTROL: seats (each human on a device, a remote player online, or a test script), the intent each seat's
 * player gets from its device, and who drives whom (auto-switch, L1/R1, ○, a click) ---- */
TT.seats = [];
TT.settings = {};   // (game.settings once the game exists)
TT.control = {};
const ACTS = ['x', 'sq', 'ci', 'tri', 'l1', 'r1'];

/** a seat: { kind: 'local' | 'remote' | 'script', input, team, pid, color, label, name, intent } */
TT.control.seat = (o) => Object.assign({ kind: 'local', input: null, team: 0, pid: -1, color: '#ffd23a', label: 'P1', name: 'P1', intent: null, turboOn: false, lastSwitch: 0 }, o);

/** the intent a local seat's devices give this step */
function deviceIntent(seat) {
  const I = seat.input, it = TT.blankIntent();
  if (!I) return it;
  const mv = I.move(), g = TT.game && TT.game.view && TT.game.view.screenDirToGround ? TT.game.view.screenDirToGround(mv[0], mv[1]) : mv;
  it.mx = g[0]; it.my = g[1];
  for (const a of ACTS) { it.p[a] = I.pressed(a); it.h[a] = I.down(a); it.r[a] = I.released(a); }
  for (const a of ['up', 'down', 'left', 'right']) it.p[a] = I.pressed(a);
  // the mouse's left button: power for set kicks and kick-offs (as ○ held)
  if (I.map && I.map.mouseL) { if (I.down('mouseL') && (M && (M.phase === 'setkick' || M.phase === 'kickoff'))) it.h.ci = true; if (I.released('mouseL') && M && (M.phase === 'setkick' || M.phase === 'kickoff')) it.r.ci = true; }
  // turbo: held, or toggled (Settings, Game, Turbo)
  if (TT.settings.turboMode === 'Toggle') { if (I.pressed('turbo')) seat.turboOn = !seat.turboOn; it.turbo = seat.turboOn; } else it.turbo = I.down('turbo');
  // the mouse in the world: a hovered teammate, the kick's aim
  if (TT.cfg.present && I.lastDevice === 'mouse' && TT.mouse) {
    const mg = TT.mouse.ground;
    if (mg) { if (I.down('ci') || I.released('ci')) it.aim = mg; if (M && M.phase === 'kickoff') it.aim = mg; }
    if (TT.mouse.click && seat === TT.seats.find(s => s.kind === 'local' && s.input === TT.game.input)) { it.click = TT.mouse.clickId; it.pick = TT.mouse.pick; }
    if (TT.mouse.kickAim != null && M && M.phase === 'setkick') it.kickAim = TT.mouse.kickAim;
    if (TT.mouse.wheel) it.wheel = TT.mouse.wheel;
  }
  if (seat.uiPick != null) { it.pick = seat.uiPick; seat.uiPick = null; }
  return it;
}
TT.control.deviceIntent = s => deviceIntent(s);

/** this step's intents: the CPU's, then each seat's for its player (after deciding who drives whom) */
TT.control.collect = dt => {
  const out = {};
  if (!M) return out;
  for (const s of TT.seats) s.intent = s.kind === 'local' ? deviceIntent(s) : s.auto && s.pid >= 0 ? TT.ai.intentFor(pl(s.pid), dt) : (s.intent || TT.blankIntent());
  assign(dt);
  for (const p of M.players) p.ctl = -1;
  TT.seats.forEach((s, i) => { if (s.pid >= 0 && pl(s.pid) && onField(pl(s.pid))) pl(s.pid).ctl = i; });
  TT.ai.intents(out, dt);
  TT.seats.forEach(s => { if (s.pid >= 0) out[s.pid] = s.intent; if (s.kind === 'remote' && s.intent) s.intent = Object.assign({}, s.intent, { p: {}, r: {} }); });
  return out;
};

/** who each seat drives */
function assign(dt) {
  const h = holder(), b = M.ball, mode = TT.settings.autoSwitch || 'Assisted';
  const taken = new Set();
  const ok = (p, s) => p && onField(p) && p.team === s.team && !taken.has(p.id);
  const nearestBall = (s, excl) => M.players.filter(p => ok(p, s) && p.id !== excl && standing(p)).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
  // the carrier goes to the nearest seat of his team
  if (h) {
    const mine = TT.seats.filter(s => s.team === h.team);
    if (mine.length) { const s = mine.slice().sort((a, c) => (a.pid >= 0 ? Math.hypot(pl(a.pid).x - h.x, pl(a.pid).y - h.y) : 999) - (c.pid >= 0 ? Math.hypot(pl(c.pid).x - h.x, pl(c.pid).y - h.y) : 999))[0]; if (s.pid !== h.id) { s.pid = h.id; s.lastSwitch = M.t; } taken.add(h.id); }
  }
  for (const s of TT.seats) {
    s.lastSwitch = s.lastSwitch || 0;
    if (s.pid >= 0 && taken.has(s.pid) && pl(s.pid) && pl(s.pid) === h && h.team === s.team) continue;
    let p = s.pid >= 0 ? pl(s.pid) : null;
    if (!ok(p, s)) p = nearestBall(s);
    const it = s.intent, live = M.phase === 'play' || M.phase === 'ruck';
    const defending = !h || h.team !== s.team;
    if (live && defending && it && p && p.superK !== 'hurricane') {
      // switching: L1 / R1 to the next teammate up / down the screen; ○ to the one nearest the ball; a click
      if (it.p.l1 || it.p.r1) {
        const side = it.p.l1 ? -1 : 1;
        const c = M.players.filter(q => ok(q, s) && q !== p && standing(q) && Math.sign(q.y - p.y) === side).sort((a, c2) => Math.abs(a.y - p.y) - Math.abs(c2.y - p.y))[0];
        if (c) { p = c; TT.emit('switch', { pid: c.id }); }
      } else if (it.p.ci && !(h && h.id === p.id)) { const c = nearestBall(s, p.id); if (c && Math.hypot(c.x - b.x, c.y - b.y) < Math.hypot(p.x - b.x, p.y - b.y)) { p = c; TT.emit('switch', { pid: c.id }); } }
      if (it.click >= 0 && ok(pl(it.click), s)) { p = pl(it.click); TT.emit('switch', { pid: p.id }); }
      // auto-switch
      const ballJustMoved = b.st === 'air' && b.t < dt * 1.5 && b.kind !== 'throw';
      if ((mode === 'Assisted' && (ballJustMoved || !standing(p) && M.t - s.lastSwitch > .6)) || (mode === 'Full' && M.t - s.lastSwitch > 1)) {
        const tgt = h || b, c = M.players.filter(q => ok(q, s) && standing(q)).sort((a, c2) => Math.hypot(a.x - tgt.x, a.y - tgt.y) - Math.hypot(c2.x - tgt.x, c2.y - tgt.y))[0];
        if (c && c !== p && (mode === 'Assisted' || Math.hypot(c.x - tgt.x, c.y - tgt.y) + 30 < Math.hypot(p.x - tgt.x, p.y - tgt.y))) { p = c; s.lastSwitch = M.t; }
      }
    }
    if (p && p.id !== s.pid) s.lastSwitch = M.t;
    s.pid = p ? p.id : -1;
    if (p) taken.add(p.id);
  }
}
TT.control.assign = dt => assign(dt);
