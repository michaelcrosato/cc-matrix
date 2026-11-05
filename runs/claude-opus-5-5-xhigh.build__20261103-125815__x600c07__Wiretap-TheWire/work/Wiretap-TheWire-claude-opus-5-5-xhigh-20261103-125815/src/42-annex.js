/* 42-annex: the hub between missions. Dana walks the office in iso; stations with a task waiting are lit (a marker and
   a glow); the stairs leave once the beat's other tasks are done. Your desk is the save point. The corkboard on the north
   wall shows what you've pinned. */
const Annex = {
  b: null, done: {},
  tasks() { const b = this.b; return b && b.tasks ? b.tasks.map(t => Object.assign({ ok: this.taskDone(t) }, t)) : []; },
  taskDone(t) { return !!(this.done[t.at + ':' + t.run] || (t.done && this.ranOnce[t.at + ':' + t.run] && t.done())); },
  ready(t) { if (t.final) return this.b.tasks.filter(x => !x.final).every(x => this.taskDone(x)); return !this.taskDone(t); },
  ranOnce: {}
};
scenes.annex = withGlobals({
  view: 'iso', views: ['iso'], pausable: true, camera: { zoom: [1, 2.2], start: 1.6, tall: 1.8 },
  enter(d) {
    const b = Annex.b = d.beat; Annex.done = {}; Annex.ranOnce = {};
    World.cur = roomMap('annex'); World.setTOD(b.time === 'night' ? 'interiorNight' : 'interior'); game.weather = null;
    Snd.music(STATE.ep >= 3 ? 'wire' : 'theme'); Amb.set('annex'); game.saves.canSave = true;
    this.P = makePlayer('dana', W(10), W(7.6)); this.P.facing = -Math.PI / 2; this.ctl = Globals.botCtl || new HumanCtl(game.input);
    const ppl = this.ppl = [];
    const sit = (id, x, y, f, pose) => { const a = new Agent({ person: id, x: x * T, y: y * T }); a.facing = f; a.pose = pose; ppl.push(a); return a; };
    sit('lou', 10.5, 3.3, -Math.PI / 2, 'sit'); sit('hal', 13.5, 7.25, -Math.PI / 2, 'sit'); sit('ren', 7.5, 7.25, -Math.PI / 2, 'sit'); sit('navarre', 18.5, 2.6, Math.PI / 2, 'sit');
    if (['two5', 'major3', 'board1'].includes(b.story)) sit(b.story === 'board1' ? 'navarre' : 'pruitt', 17.6, 3.6, Math.PI, null);
    if (['brief2', 'paper2b'].includes(b.story)) sit('vance', 19.4, 3.6, Math.PI, 'hips');
    for (const a of ppl) Talk.cast[a.person] = a.rig;
    game.follow(null); game.cam.bounds = v => World.cur.bounds(v); game.cam.snap = true; game.resetCamera();
    this.ints = Object.keys(ANNEX_SPOTS).map(k => ({ id: k, x: W(ANNEX_SPOTS[k][0] - .5), y: W(ANNEX_SPOTS[k][1] - .5), r: 20 }));
    const story = ANNEX_STORY[b.story] || [];
    if (!Globals.attract) game.after(.5, () => Talk.play(story));
  },
  exit() { game.saves.canSave = false; Talk.cast = {}; World.cur = World.map; },
  station(id) {
    const b = Annex.b, t = b.tasks.find(x => x.at === id && Annex.ready(x));
    if (t) {
      if (t.final) { Snd.play('door'); Director.done(); return; }
      const key = t.at + ':' + t.run; Annex.ranOnce[key] = true;
      const fin = () => { if (!t.done || t.done()) { Annex.done[key] = true; Snd.play('coin', { vol: .4 }); Toast('Done', t.label); } else if (t.done && !t.done()) Toast('Not yet', t.label); };
      ANNEX_RUN[t.run](fin); return;
    }
    const idle = STATION_IDLE[id] && STATION_IDLE[id](); if (idle) Talk.play(idle);
  },
  update(dt) {
    if (Talk.update(dt)) { if (shell) shell.hud({}); return; }
    const P = this.P, c = this.ctl;
    if (!Globals.blocked()) {
      if (Globals.notebookPressed()) { Notebook.open(); return; }
      if (c.pressed('rotL')) game.rotateView(-90); if (c.pressed('rotR')) game.rotateView(90);
      const mv = c.move(), mag = Math.min(1, Math.hypot(...mv));
      if (mag > .05) { const g = game.view.screenDirToGround(mv[0], mv[1]), l = Math.hypot(g[0], g[1]) || 1, sp = (c.running() ? 85 : 52) * Math.min(1, mag / .62); P.vx = g[0] / l * sp; P.vy = g[1] / l * sp; P.goal = null; }
      else if (!P.goal) { P.vx = P.vy = 0; }
      if (P.walkTo && !P.goal) { const w = P.walkTo; P.walkTo = null; P.goTo(w.x, w.y, 62, () => this.station(w.id)); }
      this.near = this.ints.filter(i => Math.hypot(i.x - P.x, i.y - P.y) < i.r).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0] || null;
      if (this.near && c.pressed('interact')) { game.input.consume('interact'); this.station(this.near.id); }
      const clk = game.input.clicked(); if (clk && this.hover && game.input.lastDevice !== 'gamepad') { const h = this.hover; if (Math.hypot(h.x - P.x, h.y - P.y) < h.r) this.station(h.id); else P.walkTo = { x: h.x, y: h.y, id: h.id }; }
    } else { P.vx = P.vy = 0; }
    P.update(dt); for (const a of this.ppl) a.update(dt);
    game.focus(P.x, P.y, 16); World.focus = P;
    if (shell && !UI.active) {
      const t = Annex.tasks().find(x => !x.ok && Annex.ready(x)) || Annex.tasks().find(x => !x.ok), n = this.near || this.hover;
      shell.hud({ objective: t ? { step: 'EP' + STATE.ep + ' · The Annex', title: t.label, at: { x: W(ANNEX_SPOTS[t.at][0] - .5), y: W(ANNEX_SPOTS[t.at][1] - .5), z: 0 }, from: P } : null,
        place: 'The Annex · Special Detail 9', counts: [['Brass', STATE.meters.brass], ['Heat', Meters.heatWord()], ['Case', STATE.meters.case], ['Fund', money(STATE.meters.fund)]],
        prompt: n ? { act: 'interact', label: (Annex.b.tasks.find(x => x.at === n.id && Annex.ready(x)) || {}).verb || STATION_NAME[n.id], hint: STATION_NAME[n.id] } : null });
    } else if (shell) shell.hud({});
  },
  draw(r) {
    const P = this.P;
    drawRoom(r, 'annex');
    // the corkboard's pins, the CRT glow, desk lamps
    r.queue(10.5 * T, 1.3 * T, 20, g => { const pins = Object.keys(STATE.board.pins); pins.forEach((k, i) => { const [sx, sy] = r.w((8.8 + (i % 7) * .5) * T, 1.25 * T, 30 - Math.floor(i / 7) * 7); px.rect(g, Math.round(sx) - 2, Math.round(sy) - 2, 4, 5, '#f4ecd4'); px.dot(g, Math.round(sx), Math.round(sy) - 2, '#b3261e'); });
      for (let i = 1; i < Math.min(pins.length, 7); i++) { const a = r.w((8.8 + (i - 1) * .5) * T, 1.25 * T, 30), b2 = r.w((8.8 + i * .5) * T, 1.25 * T, 28); px.line(g, a[0], a[1], b2[0], b2[1], '#b3261e'); } }, { bias: 4 });
    for (const [x, y] of [[7.5, 2.3], [10.5, 2.3], [18.5, 1.6], [13.5, 6.3], [7.5, 6.3]]) game.lights.add(x * T, y * T, 20, 46, .7, { color: '#ffd8a0' });
    game.lights.add(3 * T, 1.6 * T, 14, 40, .8, { color: '#8fffb0' });
    // hover and lit stations
    this.hover = null; const ptr = game.input.pointer();
    if (ptr && game.input.lastDevice !== 'gamepad') { let bd = 18; for (const i of this.ints) { const [sx, sy] = r.w(i.x, i.y, 12); const d = Math.hypot(sx - ptr[0], sy - ptr[1]); if (d < bd) { bd = d; this.hover = i; } } }
    for (const t of Annex.tasks()) if (!t.ok && Annex.ready(t)) { const s = ANNEX_SPOTS[t.at]; r.marker(W(s[0] - .5), W(s[1] - .5), 26, { label: STATION_NAME[t.at].toUpperCase(), color: '#ffd040' }); game.lights.add(W(s[0] - .5), W(s[1] - .5), 10, 30, .7, { color: '#ffd040' }); }
    if (this.hover) r.groundRing(this.hover.x, this.hover.y, 10, '#ffb347', .9);
    if (this.near) r.groundRing(this.near.x, this.near.y, 8, '#f2ead8', .6);
    for (const a of this.ppl) drawAgent(r, a);
    drawAgent(r, P, { xray: { actors: true, color: '#ffb347' } });
    Talk.draw(r);
  }
});
