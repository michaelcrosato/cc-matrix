/* 52-attract: after 10 s idle on the title or its menus, a looping reel of vignettes, each a real system driven by a bot
   that cheats freely (no suspicion, endless film and stamina, perfect aim). Any input returns to the title. */
def('missions', 'a-corner', { tod: 'nightRain', clock: '23:00', start: [33.4, 31], crowd: 12, corner: { rate: .45, night: true, patrols: true }, music: 'corner', noCam: true,
  setup(M) { M.P.hidden = true; M.P.immune = true; M.camAt = at16(30.5, 33); } });
def('missions', 'a-eyes', { tod: 'day', clock: '16:00', start: [42.6, 30.85], crowd: 14, corner: { rate: .6 }, film: 99,
  setup(M) { setCover(M, { pose: 'sit', x: W(42.6), y: W(30.85), face: Math.PI, why: 'bench' }); M.P.immune = true; } });
const reel = [
  { id: 'corner', s: 12, cap: 'THE CORNER · Gaither & Ridley never really closes', go: () => game.go('field', { beat: { ref: 'a-corner', kind: 'field' } }, { fade: 'dissolve' }), tick: (A, t) => { if (A.at(4) || A.at(8)) game.rotateView(90); } },
  { id: 'eyes', s: 10, cap: 'EYES ON · photograph the hand-to-hand', go: () => game.go('field', { beat: { ref: 'a-eyes', kind: 'field' } }, { fade: 'dissolve' }),
    tick: (A, t) => { const M = Mission.M; if (!M || !M.sim) return; const b = A.bot; b.watch = t > 1.2; const tgt = M.sim.all().filter(x => x.act && ACTS.includes(x.act.kind))[0] || M.sim.moneyman; b.botAim = () => game.r && tgt ? game.r.w(tgt.x, tgt.y, tgt.z + 22) : [game.W / 2, game.H / 2]; if (tgt && Cam.target === tgt) Cam.focus = 1; if (tgt && tgt.act && Cam.target === tgt && !A.shot) { A.shot = true; b.tap('photo'); } } },
  { id: 'tail', s: 10, cap: 'THE TAIL · when he stops, don\'t stop', go: () => { STATE.meters.heat = 20; game.go('field', { beat: { ref: 'tail', kind: 'field' } }, { fade: 'dissolve' }); },
    tick: (A, t) => { const M = Mission.M; if (!M || !M.tail) return; M.P.immune = true; const tg = M.tail.a, P = M.P, d = dist2(P, tg); for (const k in tg.minds) tg.minds[k].reset(); const b = A.bot; b.mv = [0, 0];
      if (d > 110) { P.goTo(tg.x - Math.cos(angTo(P, tg)) * 100, tg.y - Math.sin(angTo(P, tg)) * 100, 60); } if (A.at(6)) { M.partner.place(tg.x - 120, tg.y + 40); b.tap('partner'); } } },
  { id: 'chase', s: 9, cap: 'THE CHASE · vault, tackle, cuff', go: () => game.go('field', { beat: { ref: 'chase', kind: 'field' } }, { fade: 'dissolve' }),
    tick: (A, t) => { const M = Mission.M; if (!M || !M.chase) return; const P = M.P, r = M.ppl.corey; P.stamina = 100; P.immune = true; const ch = M.chase;
      if (ch.state === 'run') { P.locked = false; P.sprinting = true; const d = dist2(P, r); if (d > 14) { P.goal = null; const dir = Flow.dir(P, r.x, r.y); P.vx = dir[0] * 130; P.vy = dir[1] * 130; P.walkTo = null; A.bot.run = true; } if (d < 16) ch.tackle(); }
      else if (ch.state === 'down') A.bot.held.add('interact'); else A.bot.held.delete('interact'); } },
  { id: 'wire', s: 10, cap: 'THE WIRE · minimize, log, decode', go: () => { Object.assign(STATE.numbers, { P1: { n: '555-0187', known: true, tapped: true }, P2: { n: '555-0143', known: true, tapped: true }, P3: { n: '555-0129', known: true, tapped: true }, PG: { n: '555-0110', known: true, tapped: true } }); game.go('stage', { beat: { kind: 'stage', room: 'wire', system: 'wire', ref: 's1' } }, { fade: 'dissolve' }); },
    tick: (A, t) => { if (!Wire.s) return; if (!Wire.cur) { const nx = Wire.calls.find(c => !c.done); if (nx) Wire.clock = Math.max(Wire.clock, nx.at); } const c = Wire.cur; if (!c) return;
      if (c.id === 'S1-1' && c.t > 1.5 && !c.min) Wire.minimize(); if (c.id === 'S1-1' && c.t > 2.5) Wire.endCall();
      if (c.id === 'S1-2') { c.t += .2; if (c.li === 3 && c.typer && !c.logged) Wire.log(); if (c.li >= 4) Wire.endCall(); }
      if (c.id === 'S1-3' && !A.dec) { A.dec = true; Wire.panel = 2; Wire.render(); Wire.decode('l1'); game.after(1.2, () => Cipher.turn(-1)); game.after(2.6, () => { if (Cipher.s) UI.close(Cipher.s); }); } } },
  { id: 'board', s: 7, cap: 'THE BOARD · faces, roles, red string', go: () => { const s = EP_PRESETS[3](); s.board.pins = {}; s.board.links = []; STATE = s; game.go('annex', { beat: { kind: 'annex', time: 'day', story: 'up3', tasks: [{ at: 'stairs', label: '', final: true }] } }, { fade: 'dissolve' }); },
    tick: (A, t) => { if (A.at(.8)) Board.open(); const order = [['tee', 'lieutenant'], ['rook', 'muscle'], ['corey', 'stash'], ['pigeon', 'lookout1']]; for (let i = 0; i < order.length; i++) if (A.at(1.5 + i * 1)) { Board.pin(order[i][1], order[i][0]); if (Board.s) UI.render(Board.s); } if (A.at(6)) { Board.tier = 3; Board.pin('P1', 'tee'); if (Board.s) UI.render(Board.s); } } },
  { id: 'box', s: 8, cap: 'THE BOX · lean, then offer a way out', go: () => game.go('stage', { beat: { kind: 'stage', room: 'box', system: 'box', ref: 'corey' } }, { fade: 'dissolve' }),
    tick: (A, t) => { if (!Box.s) return; if (A.at(1.5)) Box.st.resolve = 70; if (!Box.busy() && t > 1.6 && !A.a1) { A.a1 = true; Box.pick('right'); } else if (!Box.busy() && A.a1 && !A.a2) { A.a2 = true; Box.pick('bottom'); } } },
  { id: 'versus', s: 10, cap: 'THE GAME · cops hide in the crowd, the corner calls them out', go: () => Versus.startLocal({ humans: 2, allBots: true, minutes: 3 }),
    tick: (A, t) => { const S = Versus.sim; if (!S) return; if (A.at(3)) { const lt = S.players.find(p => p.role === 'lt'), det = S.players.find(p => p.side === 'detail'); if (lt && det) S.callout(lt, det.agent); } if (A.at(6)) { const det = S.players.filter(p => p.side === 'detail')[1] || S.players.find(p => p.side === 'detail'); if (det) { S.ev += 25; S.emit('photo', { id: det.id, pts: 25, why: 'The stash!' }); } } } },
  { id: 'count', s: 8, cap: 'THE COUNT · every week somebody comes up short', go: () => game.go('field', { beat: { ref: 'a-corner', kind: 'field' } }, { fade: 'dissolve' }),
    tick: (A, t) => { const M = Mission.M; if (A.at(1) && M && M.sim) { M.sim.L.taken = 1840; TeeShift.M = M; TeeShift.o = { after: () => {} }; TeeShift.target = 2000; TeeShift.count(); } } }
];
const Attract = {
  i: -1, t: 0, saved: null, bot: null,
  start() {
    if (Globals.attract) return; this.saved = JSON.stringify(STATE); Globals.attract = true; Globals.auto = true; Globals.choose = () => 0; this.i = -1; this.next();
    if (shell) shell.hud({}); bus.emit('attract', { on: true });
  },
  next() {
    if (!Globals.attract) return; this.i = (this.i + 1) % reel.length; this.t = 0; this.prev = -1; this.shot = false; this.dec = false; this.a1 = this.a2 = false;
    this.bot = new BotCtl(); Globals.botCtl = this.bot; UI.closeAll(); Talk.stop();
    try { STATE = Object.assign(EP_PRESETS[3](), {}); reel[this.i].go(); } catch (e) { game.fail('attract ' + reel[this.i].id, e); }
    this.loops = (this.loops || 0) + (this.i === 0 ? 1 : 0);
  },
  at(s) { return this.prev < s && this.t >= s; },
  tick(dt) {
    if (!Globals.attract) return; const v = reel[this.i]; this.prev = this.t; this.t += dt;
    if (this.bot) this.bot.tick();
    try { if (v.tick) v.tick(this, this.t); } catch (e) { game.fail('attract tick ' + v.id, e); }
    if (this.t >= v.s) this.next();
  },
  exit() {
    if (!Globals.attract) return; Globals.attract = false; Globals.auto = false; Globals.choose = null; Globals.botCtl = null; this.bot = null;
    try { restoreState(JSON.parse(this.saved)); } catch (e) { STATE = newState(); }
    UI.closeAll(); Talk.stop(); game.splitScreen(0); Globals.idle = 0; game.input.consumeAll(); game.go('title', {}, { fade: 'dissolve' }); bus.emit('attract', { on: false });
  },
  draw(r) {
    if (!Globals.attract || !reel[this.i]) return; const v = reel[this.i];
    r.overlay(g => {
      const bar = Math.max(14, Math.round(r.H * .08)); px.rect(g, 0, 0, r.W, bar, '#000'); px.rect(g, 0, r.H - bar, r.W, bar, '#000');
      E.font.title(g, 'WIRETAP', 8, 3, { scale: 1, colors: ['#fff6dc', '#ffcf7a', '#e08a2a'], depth: 1, depthColor: '#3a1a0a' });
      const ca = game.cornerArea && game.cornerArea(), bx = ca && ca.y0 < 30 ? Math.floor(ca.x0) - 44 : r.W - 44; px.rect(g, bx, 3, 38, 11, '#c82a2a'); E.font.text(g, 'DEMO', bx + 19, 5, '#ffffff', { align: 'center', outline: false });
      E.font.text(g, v.cap, r.W / 2, r.H - bar + 3, '#e8e0d0', { align: 'center', outline: false });
      if (Math.floor(game.real * 2) % 2 === 0) { const lab = Globals.touchOnly ? 'Tap' : Prompts.pad() ? Prompts.label('confirm') : 'Any key'; Glyph.prompt(g, Globals.touchOnly ? 'Tap' : lab, Globals.touchOnly ? 'to return' : 'Press any button', r.W / 2, r.H - bar + 13 > r.H - 12 ? r.H - 12 : r.H - bar + 13, '#ffb347', 'center'); }
    });
  }
};
