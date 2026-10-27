// ============================================================================
// Game — state machine, sessions (mission co-op / versus), cutscenes, attract
// mode, split-screen rendering, screens
// ============================================================================
function after(sec, fn) { W.timers.push({ t: W.time + sec, fn }); }
W.timers = [];
const STAGES = [Stage1, Stage2];
const TIPS = {
  move: () => `${glyph('move')} Steer your Lockwing`,
  fire: () => `${glyph('fire')} Tap to fire lasers`,
  charge: () => `Hold ${glyph('fire')} to charge · release to fire a <b>homing lock-on shot</b>`,
  boost: () => `${glyph('boost')} Boost · ${glyph('brake')} Brake — they share one gauge`,
  roll: () => `Double-tap ${glyph('l1')} or ${glyph('r1')} to <b>barrel roll</b> and deflect shots · hold to bank`,
  loop: () => `${glyph('loop')} <b>Somersault</b> — loop over enemies behind you · ${glyph('bomb')} Smart bomb`,
  allrange: () => `<b>ALL-RANGE MODE</b> — fly freely · the radar shows enemies (red) and allies (green)`,
  uturn: () => `${glyph('uturn')} <b>U-turn</b> to reverse instantly · ${glyph('loop')} loop to shake a tail`,
};

const Game = {
  state: 'boot', listener: new V3(), cutscene: null, bossBar: null, viewports: [], session: null, stageT: 0, idleRef: performance.now(),
  attractSeg: 0, checkpointS: 0, merged: null, menuCam: null, lastFrame: 0, evIdx: 0, events: [],
  // ---------------------------------------------------------------- boot
  async boot() {
    Input.init(); UI.init();
    this.merged = new MergedPad();
    Input.lastKind = 'keyboard';
    const touchOnly = (navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    try {
      await GFX.init();
    } catch (e) {
      $('#loading').remove();
      const f = el('div', '', `<div class="logo" style="font-size:calc(var(--fs)*2.4)">STAR LOCKS<small>— 64 —</small></div><h2>WebGPU REQUIRED</h2><div class="story">This game renders exclusively with WebGPU and has no fallback.<br>Please use a current Chrome, Edge, or Safari 26+ with WebGPU enabled.</div><div class="lbl">${String(e && e.message || e)}</div>`);
      f.id = 'fatal'; $('#app').appendChild(f); return;
    }
    W.scene = GFX.scene;
    Toon.init(); initGeometries(); FX.init(W.scene); Env.init(W.scene);
    await Phys.init();
    this.menuCam = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 6000);
    $('#loading').remove();
    addEventListener('pointerdown', () => Sound.resume());
    addEventListener('keydown', () => Sound.resume());
    if (touchOnly && Input.gamepadCount() === 0) this.showTouchBlock();
    this.startBackdrop();
    this.showTitle();
    this.lastFrame = performance.now();
    GFX.renderer.setAnimationLoop(() => this.frame());
    window.__game = { Game, W, Rail, Input, Settings, UI, Stage1, Stage2, spawnEnemy, Phys, Comms, FX };
  },
  showTouchBlock() {
    const d = el('div', '', `${logoHTML()}<h2>Controller or keyboard required</h2><div class="story">Star Locks 64 is played with a gamepad (PS5 DualSense recommended) or a keyboard. Connect one to continue.</div><div class="btn" style="max-width:12em">⚙ SETTINGS</div>`);
    d.id = 'touchblock'; $('#app').appendChild(d);
    d.querySelector('.btn').addEventListener('click', () => { d.style.display = 'none'; this.showSettings(() => { d.style.display = 'flex'; this.showTitle(); }); });
    const done = () => { d.remove(); removeEventListener('gamepadconnected', done); removeEventListener('keydown', done); };
    addEventListener('gamepadconnected', done); addEventListener('keydown', done);
  },
  onPadConnected() { Input.lastKind = 'gamepad'; },
  onPadDisconnected() { if (this.state === 'play' && !W.attract) this.pause('Controller disconnected — reconnect it or use another device'); },
  // ---------------------------------------------------------------- loop
  frame() {
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.lastFrame) / 1000); this.lastFrame = now;
    Input.update(); this.merged.sync();
    for (const p of Input.pads.values()) if (p.cur.any && !p.prev.any) Input.lastKind = p.kind === 'keyboard' ? 'keyboard' : 'gamepad';
    if (Input.anyEdge) Sound.resume();
    // attract mode trigger / exit
    if (W.attract) { if (Input.anyEdge) { this.exitAttract(); Input.endFrame(); return; } }
    else if ((this.state === 'menu') && performance.now() - Input.lastInputTime > 10000 && !$('#touchblock')) this.startAttract();
    switch (this.state) {
      case 'menu':
        this.simulateBackdrop(dt);
        if (this.titleWait && Input.anyEdge && !W.attract && now - this.titleShownAt > 300) { this.titleWait = false; Sound.sfx('start'); this.showMain(); }
        else UI.update(dt);
        break;
      case 'lobby': this.simulateBackdrop(dt); this.updateLobby(dt); UI.update(dt); break;
      case 'play': this.updatePlay(dt); break;
      case 'paused': UI.update(dt); break;
      case 'results': this.simulate(dt * 0.5); UI.update(dt); break;
      case 'ending': this.updateEnding(dt); break;
    }
    Comms.update(this.state === 'paused' ? 0 : dt);
    FX.update(this.state === 'paused' ? 0 : dt);
    this.render();
    Input.endFrame();
  },
  render() {
    const r = GFX.renderer;
    r.setScissorTest(false); r.setViewport(0, 0, GFX.width, GFX.height); r.clear();
    if (this.state === 'menu' || this.state === 'lobby' || !this.viewports.length) {
      const c = this.menuCam; c.aspect = GFX.width / GFX.height; c.updateProjectionMatrix();
      GFX.updateSun(this.backdropFocus || c.position); Env.place(c.position); Env.updateDecor(c.position);
      r.render(W.scene, c); return;
    }
    Env.updateDecor(this.viewports[0].ship.cam.position);
    r.setScissorTest(this.viewports.length > 1);
    for (const v of this.viewports) {
      const x = Math.round(v.rect.x * GFX.width), y = Math.round(v.rect.y * GFX.height), w = Math.round(v.rect.w * GFX.width), h = Math.round(v.rect.h * GFX.height);
      r.setViewport(x, y, w, h); r.setScissor(x, y, w, h);
      const cam = v.ship.cam; cam.aspect = w / h; cam.updateProjectionMatrix();
      const hideSelf = v.ship.camMode === 1 && !v.ship.cine;
      if (hideSelf) v.ship.obj.visible = false;
      Env.place(cam.position); GFX.updateSun(v.ship.pos);
      r.render(W.scene, cam);
      if (hideSelf) v.ship.obj.visible = !v.ship.dead;
    }
    // 3-player split: the spare quadrant shows a roaming team camera
    if (this.viewports.length === 3) {
      const x = Math.round(GFX.width / 2), y = Math.round(GFX.height / 2), w = GFX.width - x, h = GFX.height - y;
      const lead = this.viewports[0].ship, c = this.menuCam, t = W.time * 0.15;
      c.position.copy(lead.pos).add(tmpV.set(Math.sin(t) * 70, 30, Math.cos(t) * 70)); c.lookAt(lead.pos);
      c.aspect = w / h; c.updateProjectionMatrix();
      r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); Env.place(c.position); r.render(W.scene, c);
    }
    r.setScissorTest(false);
  },
  // ---------------------------------------------------------------- backdrop (title/menu flyby)
  startBackdrop() {
    this.clearWorld();
    W.mode = 'rail'; W.stage = Stage1; Stage1.build(); Stage1.route = 'canyon';
    Rail.s = rand(500, 4000); Rail.speed = 45; Scenery.genS = Rail.s - 100;
    W.players = [];
    for (let i = 0; i < 4; i++) {
      const s = new Ship({ pilot: TEAM_PILOTS[i], color: PCOLORS[i], ox: [-0, -16, 16, 0][i], oy: [18, 22, 22, 30][i] });
      s.brain = (sh, dt) => { sh.scripted = { x: [0, -16, 16, 0][i] + Math.sin(W.time * 0.6 + i) * 6, y: [18, 22, 22, 30][i] + Math.cos(W.time * 0.5 + i * 2) * 4 }; };
      W.ships.push(s);
    }
    this.backdropT = 0;
  },
  simulateBackdrop(dt) {
    if (W.stage !== Stage1 || W.mode !== 'rail') return;
    W.time += dt; this.backdropT += dt;
    Rail.s += Rail.speed * dt; Scenery.stream(); Env.update(dt, this.menuCam.position);
    for (const s of W.ships) s.update(dt);
    Phys.step(dt, W.scene);
    const lead = W.ships[0]; this.backdropFocus = lead.pos;
    const t = this.backdropT * 0.12;
    const f = Rail.frame(Rail.s);
    this.menuCam.position.copy(lead.pos).addScaledVector(f.right, Math.sin(t) * 46).addScaledVector(UP, 10 + Math.sin(t * 0.7) * 6).addScaledVector(f.fwd, Math.cos(t) * 46);
    this.menuCam.lookAt(tmpV.copy(lead.pos).addScaledVector(UP, 4));
  },
  // ---------------------------------------------------------------- world lifecycle
  clearWorld() {
    for (const s of W.ships) s.remove(); for (const e of W.enemies) e.remove(); for (const b of W.bolts) b.remove(); for (const i of W.items) i.remove();
    if (W.boss) W.boss.remove(); if (W.midboss) W.midboss.remove();
    W.ships = []; W.enemies = []; W.bolts = []; W.items = []; W.props = []; W.players = []; W.boss = null; W.midboss = null; W.timers = []; W.time = 0;
    this.bossBar = null; this.cutscene = null; this.viewports = [];
    Env.clear(); FX.clear(); Phys.reset(); Comms.clear(); UI.clearHUDs(); Scenery.reset();
    Sound.setEngine(false);
  },
  layout(n) {
    if (n === 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
    if (n === 2) return [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }];
    return [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }].slice(0, n);
  },
  // ---------------------------------------------------------------- mission (co-op 1-4)
  newSession(pads, stageIndex = 0) {
    W.attract = false; $('#demo-banner').classList.add('hidden');
    this.session = { pads, stageIndex, hits: pads.map(() => 0), stageHits: [], medals: {}, lives: 2 + pads.length, gates: 0 };
    W.retired = {}; W.wingStatus = { skye: 100, bramble: 100, pip: 100 };
    SaveData.data.totalPlays++; SaveData.save();
    this.startStage(stageIndex);
  },
  startStage(idx, opts = {}) {
    const st = STAGES[idx]; this.session.stageIndex = idx;
    this.clearWorld(); UI.hide();
    W.mode = st.kind === 'rail' ? 'rail' : 'allrange'; W.stage = st; W.lives = this.session.lives; W.versus = null;
    st.build();
    if (st === Stage1 && opts.startS) { st.route = this.session.route || null; st.gates = this.session.gates || 0; }
    Rail.s = opts.startS || 0; Rail.speed = Rail.baseSpeed; Scenery.genS = Math.max(0, Rail.s - 100);
    this.checkpointS = opts.startS || 0;
    this.events = st.events().filter(e => (e.s == null || e.s >= (opts.startS || 0) || e.keepOnRestart)); this.evIdx = 0; this.stageT = 0;
    this.events.sort((a, b) => (a.s ?? a.t) - (b.s ?? b.t));
    // players
    const pads = this.session.pads;
    W.players = pads.map((pad, i) => {
      const s = new Ship({ isPlayer: true, playerIndex: i, pilot: TEAM_PILOTS[i], pad, ox: (i - (pads.length - 1) / 2) * 12, oy: 16 + (i % 2) * 6 });
      W.ships.push(s); return s;
    });
    if (opts.keepStats && this.session.playerStats) W.players.forEach((p, i) => Object.assign(p, this.session.playerStats[i] || {}));
    // AI wingmen fill the remaining pilot seats
    for (let i = pads.length; i < 4; i++) {
      const pilot = TEAM_PILOTS[i];
      if (W.retired[pilot]) continue;
      const w = new Ship({ pilot, color: PCOLORS[i], ox: [0, -16, 16, 0][i], oy: [16, 20, 20, 28][i], maxHp: 100, pad: W.mode === 'rail' ? null : new AIPad() });
      w.hp = W.wingStatus[pilot] ?? 100;
      w.brain = W.mode === 'rail' ? this.railWingBrain(i) : AI.dogfight(0.6);
      w.wingman = true; W.ships.push(w);
    }
    if (W.attract) for (const p of W.players) { p.godMode = true; p.bombs = 9; p.brain = W.mode === 'rail' ? AI.railPilot() : AI.dogfight(0.9); p.pad = new AIPad(); }
    // all-range spawn positions
    if (W.mode !== 'rail') W.ships.forEach((s, i) => { s.pos.set((i - 1.5) * 18, (i % 2) * 8, 700 + i * 6); s.q.identity(); s.speed = 62; });
    this.viewports = this.layout(W.players.length).map((rect, i) => ({ rect, ship: W.players[i] }));
    UI.buildHUDs(this.viewports);
    W.players.forEach(p => p.snapCam = true);
    Sound.play(st.music);
    Sound.setEngine(true);
    this.state = 'play';
    if (!opts.startS && !W.attract && !opts.noIntro) this.startCutscene(st === Stage1 ? 'intro1' : 'intro2');
    else this.titleCard(st, true);
  },
  railWingBrain(i) {
    const base = [[0, 16], [-16, 20], [16, 20], [0, 28]][i];
    let fireT = rand(1, 2);
    return (s, dt) => {
      const lead = W.players.find(p => !p.dead) || W.players[0];
      if (s.chased) {
        const c = s.chased; c.t += dt;
        s.scripted = { x: Math.sin(W.time * 1.3) * 26, y: 22 + Math.cos(W.time * 0.9) * 12 }; s.dzTarget = 70;
        const alive = (s.chasers || []).filter(e => e.alive).length;
        if (alive === 0 && !c.done) { c.done = true; Comms.say(s.pilot, s.chaseLines[1], { priority: true }); s.chased = null; s.dzTarget = null; }
        else if (c.t > c.dur && !c.done) { c.done = true; s.chased = null; s.dzTarget = null; s.hp -= 45; W.wingStatus[s.pilot] = Math.max(0, s.hp); if (s.hp <= 0) this.retireWing(s); else Comms.say(s.pilot, 'Ugh, they tagged me pretty good...', { priority: true }); }
        return;
      }
      s.scripted = { x: clampN(lead.ox + base[0] + Math.sin(W.time * 0.7 + i) * 4, -40, 40), y: clampN(lead.oy + base[1] - 16 + Math.cos(W.time * 0.6 + i) * 3, 6, 44) };
      // wingmen help out with lasers
      fireT -= dt;
      if (fireT <= 0) {
        fireT = rand(1.2, 2.4);
        let tgt = null;
        for (const e of W.enemies) { if (!e.alive || !e.targetable) continue; const d = e.pos.distanceTo(s.pos); if (d < 220 && Rail.toLocal(e.pos, tmpV).z > Rail.s + 20) { tgt = e; break; } }
        if (tgt) { s.aimDir.copy(tgt.pos).sub(s.pos).normalize(); fire('laser', s, s.pos, s.aimDir); }
      }
    };
  },
  retireWing(s) {
    if (s.retired) return;
    s.retired = true; W.retired[s.pilot] = true; W.wingStatus[s.pilot] = 0;
    Comms.say(s.pilot, s.chaseLines ? s.chaseLines[2] : 'I\'m hit! Heading back to the Longhaul for repairs!', { priority: true, force: true });
    FX.explode(s.pos, 1.2);
    s.obj.visible = false; Phys.setGroup(s.collider, GRP.DEBRIS);
  },
  titleCard(st, short) { UI.centerMsg(null, `${st.name}`, st.sub, short ? 2 : 3); },
  tutorial(k) { if (TIPS[k]) UI.tip(null, TIPS[k](), 5.5); },
  // ---------------------------------------------------------------- cutscenes
  startCutscene(type) {
    const c = this.cutscene = { type, t: 0, dur: type === 'intro1' ? 7 : 6 };
    for (const p of W.players) p.cine = { pos: new V3(), look: new V3() };
    if (type === 'intro1') {
      const lh = Models.longhaul(); lh.position.copy(Rail.toWorld(30, 110, -260)); lh.rotation.y = Math.PI * 0.05; Env.group.add(lh); c.lh = lh;
      Comms.say('bolt', 'Lockwings launching. Good luck, Star Locks.');
      UI.centerMsg(null, 'MISSION 1', 'VERDALIS — Planet Defense', 3.2);
    } else {
      Sound.sfx('warp');
      Comms.say('bolt', 'Warp complete. Arriving at the Orbital Ring.');
      UI.centerMsg(null, 'MISSION 2', 'ORBITAL RING — All-Range Battle', 3.2);
    }
    UI.tip(null, `${glyph('confirm')} Skip`, c.dur);
  },
  updateCutscene(dt) {
    const c = this.cutscene; c.t += dt;
    const lead = W.players[0];
    for (const p of W.players) {
      const cine = p.cine;
      if (c.type === 'intro1') {
        const k = c.t / c.dur;
        cine.pos.copy(lead.pos).add(tmpV.set(Math.sin(k * 2.4 + 0.6) * 40, 8 + k * 6, Math.cos(k * 2.4 + 0.6) * -40 + 10));
        cine.look.copy(lead.pos);
        if (c.lh) c.lh.position.z -= dt * 30;
      } else {
        const k = c.t / c.dur;
        cine.pos.copy(lead.pos).add(tmpV.set(20 - k * 30, 6, -60 + k * 40));
        cine.look.copy(lead.pos);
        if (c.t < 1.2) { for (const s of W.ships) s.speed = 220; for (let i = 0; i < 6; i++) FX.spark(tmpV.copy(lead.pos).add(tmpV2.set(rand(-60, 60), rand(-40, 40), rand(-200, -40))), tmpV3.set(0, 0, 400), 0xaee8ff, 0.3, 0.5); }
      }
    }
    if (c.t >= c.dur || Input.anyPressed('confirm') || Input.anyPressed('pause')) this.endCutscene();
  },
  endCutscene() {
    const c = this.cutscene; this.cutscene = null;
    if (c && c.lh) Env.group.remove(c.lh);
    for (const p of W.players) { p.cine = null; p.snapCam = true; }
    UI.tip(null, '', 0.01);
    UI.centerMsg(null, 'GO!', '', 1);
    Sound.sfx('start');
  },
  // ---------------------------------------------------------------- play
  updatePlay(dt) {
    if (!W.attract && Input.anyPressed('pause') && !this.cutscene) { this.pause(); return; }
    if (this.cutscene) {
      this.updateCutscene(dt);
      // ships fly on autopilot during cutscenes
      for (const p of W.players) if (p.pad && p.pad.kind !== 'ai') { p._pad = p._pad || p.pad; }
      const saved = W.players.map(p => p.pad); W.players.forEach(p => p.pad = null);
      this.simulate(dt, true);
      W.players.forEach((p, i) => p.pad = saved[i]);
    } else this.simulate(dt);
    if (W.attract) this.updateAttract(dt);
    UI.updateHUDs(dt);
  },
  simulate(dt, cine = false) {
    W.time += dt; this.stageT += dt;
    for (let i = W.timers.length - 1; i >= 0; i--) if (W.time >= W.timers[i].t) { const t = W.timers[i]; W.timers.splice(i, 1); t.fn(); }
    const st = W.stage;
    if (W.mode === 'rail') {
      let bo = 0, br = 0, n = 0;
      for (const p of W.players) if (!p.dead) { bo += p.boosting ? 1 : 0; br += p.braking ? 1 : 0; n++; }
      n = Math.max(1, n);
      Rail.speed = damp(Rail.speed, Rail.baseSpeed * (1 + 0.45 * bo / n - 0.4 * br / n), 2, dt);
      Rail.s += Rail.speed * dt;
      while (this.evIdx < this.events.length && Rail.s >= this.events[this.evIdx].s) { const e = this.events[this.evIdx++]; if (!e.route || e.route === st.route) e.do(); }
    } else if (W.mode === 'allrange') {
      while (this.evIdx < this.events.length && this.stageT >= this.events[this.evIdx].t) this.events[this.evIdx++].do();
    }
    if (st && st.update) st.update(dt);
    for (const s of W.ships) s.update(dt);
    for (const s of W.ships) if (s.cam) s.updateCamera(dt);
    if (W.midboss && W.midboss.alive) W.midboss.update(dt);
    if (W.boss && W.boss.alive) W.boss.update(dt);
    for (const e of W.enemies) if (e.alive) e.update(dt);
    for (const b of W.bolts) if (b.alive) b.update(dt);
    for (const it of W.items) if (it.alive) it.update(dt);
    Phys.step(dt, W.scene);
    this.cull(W.enemies); this.cull(W.bolts); this.cull(W.items);
    // respawns
    for (const p of W.ships) if (p.dead && p.respawnT <= 0 && !p.retired) this.tryRespawn(p);
    const lp = W.players.find(p => !p.dead) || W.players[0];
    if (lp) { this.listener.copy(lp.pos); Sound.setEngine(true, lp.boosting ? 1.8 : lp.braking ? 0.6 : 1); Env.update(dt, lp.pos); }
  },
  cull(arr) { for (let i = arr.length - 1; i >= 0; i--) if (!arr[i].alive) { arr[i].remove(); arr.splice(i, 1); } },
  onShipDown(ship, src) {
    if (W.mode === 'versus') {
      ship.respawnT = 3;
      if (src && src !== ship && src.versusSlot != null) { src.kills++; Sound.sfx('goldring'); UI.centerMsg(src, 'DOWNED ' + (ship.cpu ? 'CPU' : 'P' + (ship.versusSlot + 1)) + '!', `${src.kills} / ${W.versus.target}`, 1.5); }
      else { ship.kills = Math.max(0, ship.kills - 1); }
      UI.centerMsg(ship, 'SHOT DOWN', 'Respawning…', 2.5);
      if (src && src.kills >= W.versus.target) after(2, () => this.versusOver(src));
      return;
    }
    if (ship.team === 'jackal') { if (W.stage.onShipDown) W.stage.onShipDown(ship); return; }
    if (ship.wingman) { ship.dead = false; ship.hp = 0; this.retireWing(ship); return; }
    if (ship.isPlayer) {
      ship.respawnT = 2.6;
      if (W.lives <= 0 && W.players.every(p => p.dead)) after(2.2, () => { if (W.players.every(p => p.dead) && W.lives <= 0) this.gameOver(); });
      else if (W.lives > 0) UI.centerMsg(ship, 'SHOT DOWN!', `${W.lives} ${W.lives === 1 ? 'life' : 'lives'} left`, 2.2);
      const avail = ['skye', 'bramble', 'pip'].filter(p => !W.retired[p] && !W.players.find(x => x.pilot === p));
      Comms.say(avail.length ? pick(avail) : 'bolt', pick(['Kit! No!', 'Get back in there, Kit!', 'Don\'t give up on us now!']));
    }
  },
  tryRespawn(p) {
    if (W.mode === 'versus') {
      const a = rand(0, TAU); p.respawn(new V3(Math.cos(a) * 500, rand(-80, 80), Math.sin(a) * 500), tmpQ.setFromAxisAngle(UP, -a - Math.PI / 2).clone());
      p.q.setFromRotationMatrix(tmpM.lookAt(p.pos, new V3(0, 0, 0), UP)); p.snapCam = true; return;
    }
    if (!p.isPlayer) return;
    if (W.attract) { p.respawn(); return; }
    if (W.lives <= 0) { p.respawnT = 999; return; }
    W.lives--; this.session.lives = W.lives;
    if (W.mode === 'rail') p.respawn();
    else { p.respawn(new V3(rand(-100, 100), 40, 600)); p.q.identity(); }
    p.snapCam = true;
  },
  checkpoint(item) {
    this.checkpointS = Math.max(0, (item.s || Rail.s) - 30);
    this.session.gates = Stage1.gates; this.session.route = Stage1.route;
    this.session.checkpointStats = W.players.map(p => ({ hits: p.hits, goldRings: p.goldRings, maxHp: p.maxHp }));
  },
  setBossBar(b) { this.bossBar = b; },
  startMidboss(b) { W.midboss = b; this.bossBar = b; Sound.play('boss'); UI.centerMsg(null, b.name, 'Mid-boss', 2); },
  startBoss(b, sub) { W.boss = b; this.bossBar = b; Sound.play('boss'); Sound.sfx('alarm'); UI.centerMsg(null, b.name, sub, 2.6); },
  bossDown(b) {
    this.bossBar = null;
    if (b.mid) { Sound.play(W.stage.music); after(1.5, () => Comms.say('skye', 'Walker down! Too easy.')); return; }
    Sound.stopMusic();
    for (const p of W.players) p.godMode = true;
    for (const e of W.enemies) if (!e.boss && e.alive) e.kill(null);
    after(2.5, () => { Sound.play('victory'); });
    if (W.stage === Stage1) { after(2.6, () => Comms.say('kit', 'The Bastion is down! Verdalis is safe — for now.', { priority: true })); after(6, () => Comms.say('marlowe', 'Outstanding! But Mandrillo\'s flagship is moving on the Orbital Ring. Get up there!', { priority: true })); }
    else { after(1, () => Comms.say('pip', 'The reactor\'s going critical! Everybody get clear!', { priority: true })); after(5, () => Comms.say('kit', 'Mission accomplished. Let\'s go home, team.', { priority: true })); }
    after(W.attract ? 3 : 9.5, () => this.stageClear());
  },
  // ---------------------------------------------------------------- results / game over
  stageClear() {
    if (W.attract) { this.nextAttract(); return; }
    const st = W.stage, s = this.session;
    const hits = W.players.map(p => p.hits);
    const total = hits.reduce((a, b) => a + b, 0);
    const medal = total >= st.medal * (W.players.length > 1 ? 1.4 : 1);
    s.stageHits[s.stageIndex] = total; s.hits = s.hits.map((h, i) => h + (hits[i] || 0));
    if (medal) s.medals[st.id] = true;
    const best = SaveData.data.best[st.id] || 0; const record = total > best;
    if (record) SaveData.data.best[st.id] = total; if (medal) SaveData.data.medals[st.id] = true; SaveData.save();
    s.lives = W.lives;
    s.playerStats = W.players.map(p => ({ laser: p.laser, bombs: Math.max(p.bombs, 3) }));
    for (const w of W.ships) if (w.wingman && !w.retired) W.wingStatus[w.pilot] = Math.min(100, Math.max(30, w.hp + 30));
    this.state = 'results';
    const wing = ['skye', 'bramble', 'pip'].filter(p => !W.players.find(x => x.pilot === p)).map(p => `<div class="stat"><span>${CHARS[p].name}</span><b style="color:${W.retired[p] ? '#ff3b4e' : '#5dff7a'}">${W.retired[p] ? 'REPAIRING' : 'OK · ' + Math.round(W.wingStatus[p]) + '%'}</b></div>`).join('');
    const last = s.stageIndex >= STAGES.length - 1;
    UI.show(`<h2>MISSION ACCOMPLISHED</h2><div class="tagline">${st.name} — ${st.sub}${st === Stage1 ? ` · Route: ${Stage1.route === 'canyon' ? 'Red Rock Canyon (secret)' : 'Ground Base'}` : ''}</div>
      <div class="panel" style="min-width:min(80vw,22em)">
        ${W.players.map((p, i) => `<div class="stat"><span>P${i + 1} ${p.name}</span><b>${p.hits} HITS</b></div>`).join('')}
        ${W.players.length > 1 ? `<div class="stat"><span>TEAM TOTAL</span><b>${total}</b></div>` : ''}
        <div class="stat"><span>MEDAL TARGET</span><b>${Math.round(st.medal * (W.players.length > 1 ? 1.4 : 1))}</b></div>
        ${wing}
      </div>
      <div style="display:flex;align-items:center;gap:1em">${medal ? '<span class="medal">🏅</span><b>MEDAL EARNED!</b>' : '<span class="lbl">No medal this time — shoot down more enemies!</span>'}${record ? '<b style="color:var(--cyan)">NEW RECORD!</b>' : ''}</div>
      <div class="menu"><div class="btn" data-default="1"><span>${last ? 'CONTINUE' : 'NEXT MISSION ▶'}</span></div><div class="btn"><span>RETRY MISSION</span></div><div class="btn"><span>QUIT TO TITLE</span></div></div>`);
    UI.lockT = 1.2;
    UI.items[0]._fn = () => last ? this.startEnding() : this.startStage(s.stageIndex + 1, { keepStats: true });
    UI.items[1]._fn = () => this.startStage(s.stageIndex, { noIntro: true });
    UI.items[2]._fn = () => this.toTitle();
  },
  gameOver() {
    if (this.state !== 'play') return;
    this.state = 'results'; Sound.play('gameover');
    UI.show(`<h2 style="color:var(--red)">GAME OVER</h2><div class="story">"Don't give up, Kit. Verdalis is counting on us." — Bramble</div>
      <div class="menu"><div class="btn" data-default="1"><span>CONTINUE FROM CHECKPOINT</span></div><div class="btn"><span>RESTART MISSION</span></div><div class="btn"><span>QUIT TO TITLE</span></div></div><div class="desc"></div>`);
    UI.lockT = 1.2;
    UI.items[0].dataset.desc = 'Hits reset to the checkpoint. Lives refilled.';
    UI.items[0]._fn = () => { this.session.lives = 2 + this.session.pads.length; const cs = this.session.checkpointStats; this.startStage(this.session.stageIndex, { startS: W.stage === Stage1 ? this.checkpointS : 0, noIntro: true }); if (cs) W.players.forEach((p, i) => Object.assign(p, cs[i] || {})); };
    UI.items[1]._fn = () => { this.session.lives = 2 + this.session.pads.length; this.session.gates = 0; this.session.route = null; this.session.checkpointStats = null; this.startStage(this.session.stageIndex, { noIntro: true }); };
    UI.items[2]._fn = () => this.toTitle();
    UI.setFocus(0, true);
  },
  // ---------------------------------------------------------------- ending
  startEnding() {
    this.state = 'ending'; UI.hide(); UI.clearHUDs(); Comms.clear();
    const s = this.session;
    const total = s.hits.reduce((a, b) => a + b, 0);
    const lines = [
      'The Dreadnought broke apart above the Orbital Ring, raining harmless sparks over Verdalis.',
      'Emperor Mandrillo\'s armada scattered into the dark — but the tyrant himself was nowhere to be found.',
      `"You did it, Star Locks," General Marlowe said. "Verdalis owes you everything."`,
      'Somewhere beyond the Outer Rim, a jackal licked his wounds... and plotted.',
      'TO BE CONTINUED…',
    ];
    this.ending = { t: 0, lines, idx: -1, total };
    for (const p of W.players) p.godMode = true;
    Sound.play('title');
    UI.show(`<div class="story" id="endtext"></div>`, 'clear');
    UI.onBack = () => this.showCredits();
  },
  updateEnding(dt) {
    const e = this.ending; e.t += dt;
    this.simulate(dt);
    const lead = W.players[0];
    if (lead) {
      for (const p of W.players) p.cine = p.cine || { pos: new V3(), look: new V3() };
      lead.cine.pos.copy(lead.pos).add(tmpV.set(Math.sin(e.t * 0.2) * 40, 12, Math.cos(e.t * 0.2) * 40));
      lead.cine.look.copy(lead.pos);
      if (lead.pad && lead.pad.set) lead.pad.set({ lx: 0, ly: -0.2, boost: e.t > 2 });
    }
    const idx = Math.min(e.lines.length - 1, Math.floor(e.t / 4.5));
    if (idx !== e.idx) { e.idx = idx; const t = $('#endtext'); if (t) t.textContent = e.lines[idx]; }
    if (e.t > e.lines.length * 4.5 + 1 || Input.anyPressed('confirm') || Input.anyPressed('pause')) this.showCredits();
    UI.update(dt);
  },
  showCredits() {
    this.state = 'menu'; this.clearWorld(); this.startBackdrop();
    const s = this.session; const medals = Object.keys(s.medals).length;
    UI.show(`${logoHTML()}<h2>THANK YOU FOR PLAYING</h2><div class="panel"><div class="stat"><span>TOTAL HITS</span><b>${s.hits.reduce((a, b) => a + b, 0)}</b></div><div class="stat"><span>MEDALS</span><b>${medals} / ${STAGES.length}</b></div><div class="stat"><span>ROUTE TAKEN</span><b>${s.route === 'canyon' || Stage1.route === 'canyon' ? 'SECRET CANYON' : 'GROUND BASE'}</b></div></div>
      <div class="about" style="max-height:30vh">${ABOUT_TEXT.replace(/</g, '&lt;')}</div><div class="menu"><div class="btn" data-default="1"><span>BACK TO TITLE</span></div></div>`);
    UI.items[0]._fn = () => this.toTitle();
  },
  // ---------------------------------------------------------------- pause
  pause(msg) {
    if (this.state !== 'play') return;
    this.state = 'paused'; Sound.setEngine(false);
    UI.menu('PAUSED', [
      { label: 'RESUME', fn: () => this.resume(), default: true },
      { label: 'RESTART STAGE', fn: () => W.mode === 'versus' ? this.startVersus(W.versus.cfg) : this.startStage(this.session.stageIndex, { noIntro: true }) },
      { label: 'SETTINGS', fn: () => this.showSettings(() => this.pauseMenuAgain()) },
      { label: 'CONTROLS', fn: () => this.showControls(() => this.pauseMenuAgain()) },
      { label: 'QUIT TO TITLE', fn: () => this.toTitle() },
    ], { sub: msg || (W.stage ? W.stage.name : ''), back: () => this.resume() });
  },
  pauseMenuAgain() { this.state = 'play'; this.pause(); },
  resume() { UI.hide(); this.state = 'play'; Sound.setEngine(true); },
  toTitle() { this.clearWorld(); this.startBackdrop(); W.attract = false; $('#demo-banner').classList.add('hidden'); this.showTitle(); },
  // ---------------------------------------------------------------- menus
  showTitle() {
    this.state = 'menu'; Sound.play('title');
    UI.show(`${logoHTML()}<div class="tagline">A Star Locks Squadron Adventure</div><div style="height:6vh"></div><div class="press">PRESS ANY BUTTON</div>
      <div class="hint"><span>Controller recommended (PS5 DualSense)</span><span>Keyboard supported</span></div>`, 'clear');
    UI.screen.addEventListener('click', () => this.showMain());
    this.titleWait = true;
    this.titleShownAt = performance.now(); Input.lastInputTime = performance.now();
  },
  showMain() {
    this.titleWait = false; this.state = 'menu'; Input.lastInputTime = performance.now();
    const medals = Object.keys(SaveData.data.medals).length;
    UI.menu('', [
      { label: 'MISSION MODE', fn: () => this.showLobby('mission'), desc: 'The campaign: Verdalis (on-rails) and the Orbital Ring (all-range). 1–4 players co-op, split-screen.', default: true },
      { label: 'VERSUS BATTLE', fn: () => this.showLobby('versus'), desc: '2–4 player split-screen dogfight. Add CPU pilots to fill the sky.' },
      { label: 'SETTINGS', fn: () => this.showSettings(() => this.showMain()), desc: 'Controls inversion, audio, difficulty, camera and accessibility.' },
      { label: 'CONTROLS', fn: () => this.showControls(() => this.showMain()), desc: 'What every button does — and what your Lockwing can and cannot do.' },
      { label: 'ABOUT / CREDITS', fn: () => this.showAbout(), desc: 'Source information, tech stack and feedback.' },
    ], { logo: true, back: () => this.showTitle(), extra: `<div class="lbl">MEDALS ${medals}/${STAGES.length} · BEST VERDALIS ${SaveData.data.best.verdalis || 0} · BEST ORBITAL RING ${SaveData.data.best.orbital || 0}</div>` });
  },
  showSettings(back) {
    const D = Settings.data;
    const tog = (k) => ({ get: () => D[k], set: () => { D[k] = !D[k]; Settings.save(); }, label: v => v ? 'ON' : 'OFF' });
    const vol = (k) => ({ get: () => D[k], set: (d) => { D[k] = clampN(Math.round((D[k] + d * 0.1) * 10) / 10, 0, 1); Settings.save(); Sound.applyVolumes(); }, label: v => '▮'.repeat(Math.round(v * 10)) + '▯'.repeat(10 - Math.round(v * 10)) });
    UI.menu('SETTINGS', [
      { label: 'Invert Horizontal (gamepad)', opt: tog('invertX'), desc: 'Quick fix if your controller reports left/right reversed.' },
      { label: 'Invert Vertical (gamepad)', opt: tog('invertY'), desc: 'Quick fix if your controller reports up/down reversed.' },
      { label: 'Flight-Stick Y (push up = dive)', opt: tog('pilotY'), desc: 'Classic airplane steering for gamepad and keyboard.' },
      { label: 'Difficulty', opt: { get: () => D.difficulty, set: (d) => { D.difficulty = (D.difficulty + d + 3) % 3; Settings.save(); }, label: v => DIFF[v].name }, desc: 'Easy: less damage taken. Hard: tougher, trigger-happy enemies.' },
      { label: 'Music Volume', opt: vol('music') },
      { label: 'Effects Volume', opt: vol('sfx') },
      { label: 'Radio Voices', opt: tog('voice'), desc: 'Gibberish radio chatter during comms.' },
      { label: 'Screen Shake', opt: tog('shake') },
      { label: 'Controller Rumble', opt: tog('rumble') },
      { label: 'Default Camera', opt: { get: () => D.camera, set: () => { D.camera = 1 - D.camera; Settings.save(); for (const p of W.players) p.camMode = D.camera; }, label: v => v ? 'COCKPIT' : 'CHASE' }, desc: `Switch in-game with ${glyph('cam')}.` },
      { label: 'HUD Size', opt: { get: () => D.hudScale, set: (d) => { D.hudScale = clampN(Math.round((D.hudScale + d * 0.1) * 10) / 10, 0.7, 1.4); Settings.save(); for (const h of UI.huds) h.root.style.setProperty('--hs', D.hudScale * (UI.huds.length > 2 ? 0.62 : UI.huds.length > 1 ? 0.78 : 1)); }, label: v => Math.round(v * 100) + '%' } },
      { label: 'BACK', fn: back },
    ], { back, extra: `<div class="lbl">${glyph('lr')} change value</div>` });
  },
  showControls(back) {
    const row = (a, label, note = '') => `<span>${glyph(a)}</span><span>${label}</span><span class="k">${note}</span>`;
    UI.show(`<h2>CONTROLS</h2><div class="panel"><div class="ctrl-grid">
      ${row('move', 'Steer', 'Settings can invert axes')}
      ${row('fire', 'Fire lasers · hold to charge a homing lock-on shot', '')}
      ${row('bomb', 'Smart bomb — homes on a locked target', 'limited stock')}
      ${row('boost', 'Boost', 'shares gauge with brake')}
      ${row('brake', 'Brake', '')}
      ${row('l1', 'Hold: bank left · double-tap: barrel roll', 'roll deflects shots')}
      ${row('r1', 'Hold: bank right · double-tap: barrel roll', '')}
      ${row('loop', 'Somersault loop', 'uses boost gauge')}
      ${row('uturn', 'U-turn', 'ALL-RANGE only')}
      ${row('cam', 'Chase / cockpit camera', '')}
      ${row('pause', 'Pause', '')}
      </div></div>
      <div class="desc" style="min-height:0">On-rails stages keep you moving forward — you can't turn around there. In ALL-RANGE MODE you fly freely, and the radar helps you hunt.</div>
      <div class="menu"><div class="btn" data-default="1"><span>BACK</span></div></div>`);
    UI.items[0]._fn = back; UI.onBack = back;
  },
  showAbout() {
    UI.show(`<h2>ABOUT / CREDITS</h2><div class="panel about">${ABOUT_TEXT.replace(/</g, '&lt;')}</div><div class="menu"><div class="btn" data-default="1"><span>BACK</span></div></div><div class="hint"><span>${glyph('move')} Scroll</span><span>${glyph('back')} Back</span></div>`);
    UI.items[0]._fn = () => this.showMain(); UI.onBack = () => this.showMain();
  },
  // ---------------------------------------------------------------- lobby
  showLobby(kind) {
    this.state = 'lobby';
    // whoever opened the lobby is P1
    let first = null; let bestT = -1;
    for (const p of Input.pads.values()) if (p.connected && p.lastActive > bestT) { bestT = p.lastActive; first = p; }
    this.lobby = { kind, joined: [first || Input.keyboard], stage: 0, cpus: kind === 'versus' ? 1 : 0, target: 5, joinGrace: 0.3 };
    this.renderLobby();
  },
  renderLobby() {
    const L = this.lobby, mission = L.kind === 'mission';
    const slots = [0, 1, 2, 3].map(i => {
      const p = L.joined[i];
      const isCpu = !p && !mission && i < L.joined.length + L.cpus;
      return `<div class="slot ${p || isCpu ? 'on' : ''}" style="border-color:#${PCOLORS[i].toString(16).padStart(6, '0')}"><div class="pn" style="color:#${PCOLORS[i].toString(16).padStart(6, '0')}">P${i + 1}</div>
        ${p ? `<b>${CHARS[TEAM_PILOTS[i]].name}</b><span class="lbl">${p.kind === 'keyboard' ? 'KEYBOARD' : 'GAMEPAD ' + (p.index + 1)}</span>` : isCpu ? `<b>CPU</b><span class="lbl">${CHARS[TEAM_PILOTS[i]].name}</span>` : `<span class="lbl">Press ${glyph('confirm')} to join</span>`}</div>`;
    }).join('');
    const entries = [];
    entries.push({ label: 'START', fn: () => this.lobbyStart(), default: true, desc: mission ? (L.joined.length > 1 ? `${L.joined.length}-player co-op. Missing pilots fly as AI wingmen.` : 'Solo — Skye, Bramble and Pip fly as your AI wingmen.') : 'First pilot to reach the kill target wins.' });
    if (mission) entries.push({ label: 'Mission', opt: { get: () => L.stage, set: (d) => { L.stage = (L.stage + d + 2) % 2; }, label: v => ['1 · VERDALIS', '2 · ORBITAL RING'][v] }, desc: 'Start from the beginning, or jump straight into all-range mode.' });
    else {
      entries.push({ label: 'CPU Pilots', opt: { get: () => L.cpus, set: (d) => { L.cpus = clampN(L.cpus + d, 0, 4 - L.joined.length); this.renderLobbySlots(); }, label: v => v }, desc: 'Fill empty seats with CPU dogfighters.' });
      entries.push({ label: 'Kills to Win', opt: { get: () => L.target, set: (d) => { L.target = clampN(L.target + d * 2, 3, 9); }, label: v => v } });
    }
    entries.push({ label: 'Difficulty', opt: { get: () => Settings.data.difficulty, set: (d) => { Settings.data.difficulty = (Settings.data.difficulty + d + 3) % 3; Settings.save(); }, label: v => DIFF[v].name } });
    entries.push({ label: 'BACK', fn: () => this.showMain() });
    UI.menu(mission ? 'MISSION MODE' : 'VERSUS BATTLE', entries, { back: () => this.showMain(), extra: `<div class="slots">${slots}</div><div class="lbl">Each player: press ${glyph('confirm')} on your own controller to join · ${glyph('back')} to leave</div>` });
  },
  renderLobbySlots() { const f = UI.focus; this.renderLobby(); UI.setFocus(f, true); },
  updateLobby(dt) {
    const L = this.lobby; L.joinGrace -= dt; if (L.joinGrace > 0) return;
    for (const p of Input.pads.values()) {
      if (!p.connected || p.kind === 'merged') continue;
      const idx = L.joined.indexOf(p);
      if (idx < 0 && p.pressed('confirm') && L.joined.length < 4) {
        L.joined.push(p); L.cpus = Math.min(L.cpus, 4 - L.joined.length); Sound.sfx('start'); this.renderLobbySlots();
        p.prev.confirm = true; p.cur.confirm = false; // consume so the menu doesn't also activate
      } else if (idx > 0 && p.pressed('back')) { L.joined.splice(idx, 1); Sound.sfx('back'); this.renderLobbySlots(); p.cur.back = false; }
    }
  },
  lobbyStart() {
    const L = this.lobby;
    if (L.kind === 'mission') {
      const pads = L.joined.length === 1 ? [this.merged] : L.joined;
      this.newSession(pads, L.stage);
    } else {
      if (L.joined.length + L.cpus < 2) { Sound.sfx('error'); UI.screen.querySelector('.desc').textContent = 'Versus needs at least 2 pilots — add a player or a CPU.'; return; }
      this.startVersus({ pads: [...L.joined], cpus: L.cpus, target: L.target });
    }
  },
  // ---------------------------------------------------------------- versus
  startVersus(cfg) {
    W.attract = false; $('#demo-banner').classList.add('hidden');
    this.clearWorld(); UI.hide();
    W.mode = 'versus'; W.stage = VersusArena; VersusArena.build();
    W.versus = { cfg, target: cfg.target };
    const n = cfg.pads.length + cfg.cpus;
    W.players = [];
    for (let i = 0; i < n; i++) {
      const human = i < cfg.pads.length;
      const s = new Ship({ team: 'p' + i, pilot: TEAM_PILOTS[i], color: PCOLORS[i], isPlayer: human, playerIndex: i, pad: human ? cfg.pads[i] : new AIPad(), cpu: !human, camera: human });
      s.versusSlot = i; s.bombs = 2; s.laser = 1;
      if (!human) s.brain = AI.dogfight(0.55 + Settings.data.difficulty * 0.15);
      const a = i / n * TAU; s.pos.set(Math.cos(a) * 450, (i % 2) * 30, Math.sin(a) * 450);
      s.q.setFromRotationMatrix(tmpM.lookAt(s.pos, new V3(0, 0, 0), UP));
      W.ships.push(s); if (human) W.players.push(s);
    }
    this.viewports = this.layout(W.players.length).map((rect, i) => ({ rect, ship: W.players[i] }));
    UI.buildHUDs(this.viewports);
    W.players.forEach(p => p.snapCam = true);
    Sound.play('versus'); Sound.setEngine(true);
    this.events = []; this.evIdx = 0; this.stageT = 0;
    this.state = 'play';
    UI.centerMsg(null, 'VERSUS BATTLE', `First to ${cfg.target} kills wins!`, 2.5);
    UI.tip(null, `${glyph('uturn')} U-turn · ${glyph('loop')} loop · double-tap ${glyph('l1')}/${glyph('r1')} roll · grab items for lasers & bombs`, 6);
  },
  versusOver(winner) {
    if (this.state !== 'play') return;
    this.state = 'results'; Sound.play('victory');
    const ranked = W.ships.filter(s => s.versusSlot != null).sort((a, b) => b.kills - a.kills);
    UI.show(`<h2>${winner.cpu ? 'CPU' : 'P' + (winner.versusSlot + 1)} WINS!</h2><div class="tagline">${winner.name}</div>
      <div class="panel" style="min-width:min(80vw,20em)">${ranked.map((s, i) => `<div class="stat"><span style="color:#${PCOLORS[s.versusSlot].toString(16).padStart(6, '0')}">${i + 1}. ${s.cpu ? 'CPU' : 'P' + (s.versusSlot + 1)} · ${s.name}</span><b>${s.kills} K / ${s.deaths} D</b></div>`).join('')}</div>
      <div class="menu"><div class="btn" data-default="1"><span>REMATCH</span></div><div class="btn"><span>BACK TO LOBBY</span></div><div class="btn"><span>QUIT TO TITLE</span></div></div>`);
    const cfg = W.versus.cfg; UI.lockT = 1.2;
    UI.items[0]._fn = () => this.startVersus(cfg);
    UI.items[1]._fn = () => { this.toTitle(); this.showLobby('versus'); this.lobby.joined = cfg.pads; this.lobby.cpus = cfg.cpus; this.lobby.target = cfg.target; this.renderLobby(); };
    UI.items[2]._fn = () => this.toTitle();
  },
  // ---------------------------------------------------------------- attract mode
  ATTRACT: [
    { stage: 0, startS: 150, dur: 42 },
    { stage: 0, startS: 1700, dur: 38 },
    { stage: 0, startS: 4500, dur: 26, route: 'canyon' },
    { stage: 0, startS: 6900, dur: 45 },
    { stage: 1, dur: 55, jump: 20 },
  ],
  startAttract() {
    W.attract = true; $('#demo-banner').classList.remove('hidden');
    UI.hide(); this.attractSeg = 0; this.session = { pads: [new AIPad()], stageIndex: 0, hits: [0], stageHits: [], medals: {}, lives: 99, gates: 0 };
    this.runAttractSeg();
  },
  runAttractSeg() {
    const seg = this.ATTRACT[this.attractSeg];
    this.session.gates = seg.route === 'canyon' ? 6 : 0; this.session.route = seg.route || null;
    this.startStage(seg.stage, { startS: seg.startS || 0.01 });
    W.lives = 99;
    if (seg.jump) { this.events = this.events.filter(e => e.t === 6); this.evIdx = 0; Stage2.jackals(); }
    this.attractT = seg.dur;
  },
  updateAttract(dt) { this.attractT -= dt; if (this.attractT <= 0) this.nextAttract(); },
  nextAttract() {
    this.attractSeg++;
    if (this.attractSeg >= this.ATTRACT.length) { this.exitAttract(); return; }
    this.runAttractSeg();
  },
  exitAttract() {
    W.attract = false; $('#demo-banner').classList.add('hidden');
    this.clearWorld(); this.startBackdrop(); this.showTitle();
    Input.lastInputTime = performance.now();
  },
};

Game.boot().catch(e => {
  console.error(e);
  const l = $('#loading'); if (l) l.textContent = 'FAILED TO START: ' + (e && e.message || e);
});
