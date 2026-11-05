/* ECHO RUN (§7.24, §11.11): the Black Run as a time trial, as Dagny, from the start gate to the village. Encounters wait
 * at fixed distances down the course (types and warm spots seeded); a Whiteout that reaches you adds 3 s and a
 * stumble, each crit takes 0.5 s off. Solo, your best run plays back as YOUR ECHO; in an AI Hub session (ghost mode)
 * the other players ski beside you as echoes in their seat colours. */
const ECHO_ENCOUNTERS = [[120, ['giggler', 'giggler']], [260, ['tobogganer']], [420, null], [600, ['tobogganer', 'tobogganer']], [760, ['twins']], [900, ['snowballer', 'snowballer']], [1100, ['giggler', 'giggler', 'giggler']], [1300, ['plow']], [1450, ['tobogganer', 'tobogganer']]];
const ECHO_RANKS = [[95, 'DOUBLE BLACK', 'dblack'], [110, 'BLACK DIAMOND', 'black'], [130, 'BLUE SQUARE', 'blue'], [1e9, 'GREEN CIRCLE', 'green']];
S7.echoRank = (t) => ECHO_RANKS.find(r => t < r[0]);
class EchoRun {
  constructor(sim, o = {}) {
    this.sim = sim; this.o = o; this.t = 0; this.pen = 0; this.crits = 0; this.thawed = 0; this.dist = 0; this.next = 0; this.done = false; this.started = false; this.rec = []; this.recT = 0; this.stumbles = 0;
    this.rng = o.rng || (() => S7.rnd('echo'));
    this.edges = Object.keys(sim.rails.edges);
    S7.bus.on('crit', this._c = () => { if (this.started && !this.done) { this.crits++; } });
    S7.bus.on('kill', this._k = () => { if (this.started && !this.done) this.thawed++; });
  }
  dispose() { S7.bus.off('crit', this._c); S7.bus.off('kill', this._k); }
  penalty(sim) { if (this.done) return; this.pen += 3; this.stumbles++; sim.W.v *= .3; sim.say('+3 S', { big: true }); sim.emit('stumble', {}); }
  time() { return Math.max(0, this.t + this.pen - this.crits * .5); }
  metres() { return Math.round(this.dist / M); }
  update(dt) {
    const sim = this.sim, W = sim.W;
    if (!this.started || this.done) return;
    this.t += dt;
    if (W.edge) { const e = sim.rails.edges[W.edge]; if (e.kind === 'ski') this.dist += W.v * dt; }
    if (W.air) this.dist += 420 * dt;
    // the next encounter, spawned ahead on the line we are skiing
    while (this.next < ECHO_ENCOUNTERS.length && this.dist / M >= ECHO_ENCOUNTERS[this.next][0] - 70) {
      let list = ECHO_ENCOUNTERS[this.next][1];
      const onBlack = W.edge && /bk1|jk/.test(W.edge);
      if (!list) list = onBlack ? ['plow'] : ['giggler', 'giggler', 'giggler'];
      const e = W.edge && sim.rails.edges[W.edge];
      for (let k = 0; k < list.length; k++) {
        const s = e ? Math.min(e.length, W.s + (55 + k * 7) * M) : 0, p = e ? e.path.at(s) : sim.hero;
        const side = (this.rng() - .5) * 14 * M, x = p.x + Math.cos(p.yaw + Math.PI / 2) * side, y = p.y + Math.sin(p.yaw + Math.PI / 2) * side;
        sim.spawnEnemy(list[k], [x, y], { warm: ['head', 'chest', 'belly', 'knee', 'hand'][Math.floor(this.rng() * 5)], reveal: 0 });
      }
      this.next++;
    }
    // the record: where we are every 0.1 s
    this.recT += dt;
    if (this.recT >= .1) { this.recT -= .1; this.rec.push([this.edges.indexOf(W.edge || ''), Math.round(W.s), sim.aim.on ? 1 : 0, Math.round(W.yaw * 100)]); if (this.rec.length > 2400) this.rec.shift(); }
  }
  finish() { if (this.done) return; this.done = true; this.final = this.time(); this.sim.emit('echofinish', { time: this.final }); }
}
S7.EchoRun = EchoRun;
Object.assign(Sim.prototype, {
  /** set up the course: Dagny at the start gate of the Black Run, no story triggers, the shops shut */
  echoSetup() {
    this.resetTransient();
    this.st = this.freshState('piste'); this.st.target = 1; this.o.echo = true; this.o.noClock = true; this.titleMode = false; this.hideHero = false; this.camOverride = null;
    for (const id of PERSONA_ORDER) this.st.roster[id].unlocked = true;
    this.st.persona = 'dagny'; this.st.red = 400; this.st.flags.lawineDone = 1;
    this.enterArea('01C', 'st', { noSave: true, noEnter: true });
    if (this.echoRun) this.echoRun.dispose();
    this.echoRun = new EchoRun(this, { rng: S7.inSession && typeof AIHub !== 'undefined' && AIHub.rng ? AIHub.rng('course') : null });
  }
});

S7.addEchoRun = (scenes, game, sim, pres, hud, audio, voice) => {
  let R = null, menu = null;
  const best = () => S7.storeGet('s7:echo', null);
  scenes.echorun = {
    pausable: true, input: S7.INPUT, touch: [],
    enter() {
      sim.o.attract = false; sim.o.bot = false;
      sim.echoSetup();
      R = { count: 3, phase: S7.inSession ? 'wait' : 'count', ghost: null, gi: 0, done: false, shown: 0, progT: 0, sentT: 0, ended: false };
      if (!S7.inSession) { const b = best(); if (b && b.rec) R.ghost = { rec: b.rec, edges: b.edges, name: 'YOUR ECHO', color: '#9ad8ff', i: 0 }; }
      S7.ghosts = []; hud.areaT = 9; hud._area = '01C';
      audio && audio.music('echorun');
      menu = null;
      if (S7.inSession && S7.hub) S7.hub.ready(sim);
    },
    exit() { S7.ghosts = []; if (sim.echoRun) { sim.echoRun.dispose(); sim.echoRun = null; } sim.o.echo = false; S7.pointerLock(false); },
    update(dt) {
      S7.Input.tick(dt); hud.update(dt);
      const E1 = sim.echoRun;
      if (S7.inSession && S7.hub) { S7.hub.tick(sim, R, dt); if (R.ended) { pres.step(0); return; } }
      if (R.phase === 'wait') { pres.step(dt); sim.update(0, S7.noIntents()); return; }
      if (R.phase === 'count') {
        R.count -= dt; if (S7.inSession && S7.hub) R.count = -AIHub.time() / 1000;
        if (R.count <= 0) { R.phase = 'run'; E1.started = true; const ex = sim.rails.exits('st').find(x => x.edge.kind === 'ski'); if (ex) sim.takeBranch(ex); sim.W.v = 60; }
        pres.step(dt); sim.update(dt, S7.noIntents()); return;
      }
      if (R.phase === 'results') {
        if (menu) { const p = menu.update(UI.nav(game), game); void p; }
        pres.step(dt); sim.update(dt, S7.noIntents()); return;
      }
      if (S7.ui.update()) return;
      const I = S7.readIntents(game, hud);
      sim.update(dt, I);
      E1.update(dt);
      // the echo: the best run's place at this time
      if (R.ghost) { const k = Math.min(R.ghost.rec.length - 1, Math.floor(E1.t * 10)); const s = R.ghost.rec[k]; if (s) { const e = sim.rails.edges[R.ghost.edges[s[0]]]; if (e) { const p = e.path.at(s[1]); S7.ghosts = [{ id: 'echo', x: p.x, y: p.y, z: p.z, yaw: s[3] / 100, aim: s[2], name: R.ghost.name, color: R.ghost.color }].concat(S7.ghosts.filter(g => g.id !== 'echo')); } } }
      pres.step(dt); audio && audio.update(dt);
      S7.pointerLock(sim.aim.on && game.settings.mouseMode !== 'pointer' && game.input.lastDevice !== 'gamepad');
      if (E1.done && R.phase === 'run') {
        R.phase = 'results'; S7.pointerLock(false);
        const rk = S7.echoRank(E1.final);
        R.rank = rk;
        if (!S7.inSession) {
          const b = best(); R.newBest = !b || E1.final < b.time;
          if (R.newBest) S7.storeSet('s7:echo', { time: E1.final, rec: E1.rec, edges: E1.edges });
          menu = new ListMenu([{ label: 'RUN AGAIN', on: () => game.go('echorun', {}) }, { label: 'TITLE', on: () => game.go('title', {}) }]);
        }
        audio && audio.music('rank');
      }
    },
    draw(r) {
      pres.draw(r); hud.draw(r);
      const E1 = sim.echoRun; if (!E1) return;
      r.overlay(g => {
        const S = UI.safe(r);
        // the course clock and penalties
        UI.text(g, S7.fmtTime(E1.time()), r.W / 2, S.y0 + 38, '#ffffff', { align: 'center', scale: 3 });
        UI.text(g, E1.metres() + ' M DOWN · +' + E1.pen + ' S · CRITS ' + E1.crits, r.W / 2, S.y0 + 62, MUTED, { align: 'center' });
        // echoes' name tags
        for (const gh of S7.ghosts || []) { const p = hud.proj(gh.x, gh.y, gh.z + 46); if (p && p[0] > 0 && p[0] < r.W) UI.text(g, gh.name, p[0], p[1], gh.color, { align: 'center' }); }
        if (R.phase === 'wait') UI.title(g, 'GET READY', r.W / 2, r.H * .35, 4);
        if (R.phase === 'count') UI.title(g, String(Math.max(1, Math.ceil(R.count))), r.W / 2, r.H * .32, 6);
        if (R.phase === 'run' && E1.t < 1.2) UI.title(g, 'GO!', r.W / 2, r.H * .32, 6);
        if (R.phase === 'results') {
          UI.panel(g, r.W * .2, r.H * .22, r.W * .6, r.H * .58, .9);
          UI.big(g, 'ECHO RUN', r.W / 2, r.H * .25, 2);
          UI.title(g, S7.fmtTime(E1.final), r.W / 2, r.H * .33, 3);
          UI.text(g, R.rank ? R.rank[1] : '', r.W / 2, r.H * .47, R.rank && R.rank[2] === 'blue' ? '#6aa0ff' : R.rank && R.rank[2] === 'green' ? '#6ae08a' : '#ffffff', { align: 'center', scale: 2 });
          UI.text(g, 'PENALTIES +' + E1.pen + ' S · CRITS ' + E1.crits + ' (-' + (E1.crits * .5).toFixed(1) + ' S) · THAWED ' + E1.thawed, r.W / 2, r.H * .55, MUTED, { align: 'center' });
          if (!S7.inSession) { const b = best(); UI.text(g, R.newBest ? 'NEW BEST. YOUR ECHO WILL RACE YOU.' : 'BEST: ' + S7.fmtTime(b ? b.time : E1.final), r.W / 2, r.H * .6, '#ffe0a0', { align: 'center' }); if (menu) menu.draw(g, r.W / 2, r.H * .67, { scale: 2 }); }
          else UI.text(g, R.ended ? 'ROUND OVER' : 'WAITING FOR THE OTHERS', r.W / 2, r.H * .68, '#ffffff', { align: 'center', scale: 2 });
        }
      });
      S7.ui.draw(r);
    }
  };
};
