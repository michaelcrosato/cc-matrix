// 41-play.js: the play scene. It owns one Sim, drives it from the players' devices (or the Autopilot, or the network),
// turns the sim's events into effects, sounds, banners and radio lines, and draws each viewport: the rasterized world,
// the engine's rigs as billboards, the FX and the HUD. One Play per stage run; the screens around it are in 43-screens.js.
//
// cfg: { mode: 'arcade' | 'stage' | 'coop' | 'range' | 'attract' | 'host' | 'replica', stage, difficulty, seats: [{ input,
//        name, color, agent, bot }], carry, seed, intro (play the stage's opening), cheats, attract, autoFire }

TC.ENVS = {
  night: { top: '#050a1e', horizon: '#1d2a52', silhouette: '#070b18', fog: '#0c1430', fogNear: 280, ambient: 0.46,
    sunDir: TC.V.norm([-0.3, 0.5, 0.8]), sunK: 0.36, moon: [-0.3, 0.45, 0.6], skyline: 1 },
  storm: { top: '#0a0e1a', horizon: '#2a3446', silhouette: '#080a10', fog: '#161c2a', fogNear: 220, ambient: 0.4,
    sunDir: TC.V.norm([0.2, 0.2, 0.9]), sunK: 0.2, moon: null, skyline: 1.2 },
  dawn: { top: '#2a4a86', horizon: '#f0a070', silhouette: '#2a1e2a', fog: '#c08a78', fogNear: 320, ambient: 0.6,
    sunDir: TC.V.norm([0.6, 0.2, 0.5]), sunK: 0.5, moon: null, skyline: 0.8 },
  day: { top: '#5a8ac8', horizon: '#c8d8e8', silhouette: '#6a7a8a', fog: '#b8c8d8', fogNear: 360, ambient: 0.66,
    sunDir: TC.V.norm([0.5, 0.3, 0.8]), sunK: 0.45, moon: null, skyline: 0 },
};
TC.envFor = function (stageId) {
  const st = TC.get('stage', stageId);
  const sky = (st.env && st.env.sky) || 'night';
  return Object.assign({}, TC.ENVS[sky] || TC.ENVS.night);
};

// The static triangles of a world: each box once, cached on the box, and skipped once it is gone.
TC.worldTris = function (world) {
  if (world._tris) return world._tris;
  const out = [];
  for (const b of world.boxes) {
    b._tris = TC.boxTris(b.b, b.mat, []);
    out.push(b);
  }
  world._tris = out;
  return out;
};

TC.Play = class Play {
  constructor(game, cfg) {
    this.game = game;
    this.cfg = cfg;
    this.seats = cfg.seats || [];
    this.fx = new TC.FX();
    this.rasters = [];
    this.threatRings = new Map();
    this.hitMarker = 0; this.hitHead = false;
    this.dialog = null;
    this.radio = null;
    this.radioQueue = [];
    this.coverToggle = [];
    this.aims = [];
    this.lastVp = {};
    this.time = 0;
    this.over = false;
    this.sim = new TC.Sim({
      mode: cfg.mode || 'stage', stage: cfg.stage || 1, seed: cfg.seed || 1, difficulty: cfg.difficulty || 'Normal',
      players: this.seats.map(s => ({ name: s.name, color: s.color, agent: s.agent })),
      carry: cfg.carry || null, cheats: cfg.cheats || {}, sceneIndex: cfg.sceneIndex || 0, autoFire: cfg.autoFire !== false,
    });
    this.aims = this.sim.players.map(() => [0, 0]);
    this.env = TC.envFor(this.sim.stageId);
    this.world = this.sim.world;
    this.sim.frozen = false;
    this.introT = cfg.intro ? 0 : -1;
    // A shared-world round: the hub code reads its one play (the host decides the round; the replicas follow it).
    if (cfg.hub) { TC.Hub.play = this; TC.Hub.ended = null; TC.Hub.finished = false; TC.Hub.inputs = {}; TC.Hub.presses = {}; TC.Hub.lastSnap = null; }
    this.lastPhase = '';
    this.stageDoneT = 0;
  }

  // The per-frame command of each seat: its device, its bot, or the network (a remote seat on a shared world).
  commands(dt) {
    return this.seats.map((s, i) => {
      if (s.bot) return s.bot.command(this.sim, i, dt);
      if (s.net) return TC.Hub.netCommand(this, i);
      if (!s.input) return {};
      return TC.commandFor(this, i, s, dt);
    });
  }

  update(dt) {
    const tg = TC.tune.time.gameSpeed || 1;
    this.time += dt;
    // The wall-clock cost of the last frame, for the performance readout (presentation only).
    const now = (typeof performance !== 'undefined') ? performance.now() : 0;
    if (this.lastNow) this.frameMs = now - this.lastNow;
    this.lastNow = now;
    this.fx.update(dt);
    this.updateRadio(dt);
    const hub = this.cfg.hub;
    if (hub) {
      // A shared world: the replica applies the host's state, the host waits for the start, and both send their input.
      if (this.cfg.role === 'replica') {
        if (TC.Hub.lastSnap) TC.Hub.applySnap(this, TC.Hub.lastSnap.snap);
        // Our own cover is predicted here at the same speeds as the sim, so it answers at once.
        const mine = this.sim.players[TC.Hub.me];
        const myInput = this.seats[TC.Hub.me] && this.seats[TC.Hub.me].input;
        if (mine && myInput) {
          const want = myInput.down('cover') ? 1 : 0;
          const full = want ? TC.tune.player.coverIn : TC.tune.player.coverOut;
          const dir = want - mine.c, step = dt / full;
          mine.c = Math.abs(dir) <= step ? want : mine.c + Math.sign(dir) * step;
        }
        if (this.netQ && this.netQ.length) { this.handleEvents(this.netQ); this.netQ = []; }
        if (this.seats[TC.Hub.me] && this.seats[TC.Hub.me].input) TC.Hub.sendInput(this.game, this, dt);
        return;
      }
      if (AIHub.time() < 0) return;
    }
    if (this.dialog && this.dialog.open) {
      this.dialog.update(dt);
      return;
    }
    this.sim.frozen = false;
    const cmds = this.commands(dt);
    this.sim.step(dt * tg, cmds);
    const events = this.sim.drain();
    this.handleEvents(events);
    if (hub) {
      // The host copy, with a player or as a server with none, runs the world and reports it.
      const isHost = this.cfg.role === 'host' || this.cfg.role === 'server';
      if (isHost) TC.Hub.hostSend(this, events, dt);
      if (this.seats[TC.Hub.me] && this.seats[TC.Hub.me].input) TC.Hub.sendInput(this.game, this, dt);
      if (this.sim.over && isHost && !TC.Hub.finished) TC.Hub.finishRound(this.sim, this.sim.result ? this.sim.result.won : false);
      return;
    }
    for (const seat of this.seats) if (seat.input && seat.input.lastDevice) this.lastDevice = seat.input.lastDevice;
    if (this.sim.over && !this.over) this.finish();
  }

  // Each event becomes an effect, a sound, a banner or a line of radio.
  handleEvents(events) {
    const sim = this.sim, game = this.game;
    for (const e of events) {
      switch (e.type) {
        case 'flare': {
          this.fx.add({ kind: 'flash', at: e.from, life: 0.08, r: 9, color: '#ffe9a0' });
          this.fx.add({ kind: 'spark', at: e.from, life: 0.12, n: 6, spread: 6, color: '#fff2b0', seed: e.t });
          this.fx.lights = this.fx.lights || []; this.fx.lights.push({ x: e.from[0], y: e.from[1], z: e.from[2], r: 90, k: 0.8, t: 0, life: 0.09 });
          break;
        }
        case 'shot': {
          const w = e.weapon;
          TC.sfx(game, w === 'handgun' ? 'shot' : w === 'mg' ? 'mg' : w === 'shotgun' ? 'shotgun' : 'gl');
          break;
        }
        case 'miss': {
          const dir = e.dir;
          this.fx.add({ kind: 'tracer', from: e.from, to: [e.from[0] + dir[0] * 900, e.from[1] + dir[1] * 900, e.from[2] + dir[2] * 900], life: 0.1, color: '#ffe9a0' });
          break;
        }
        case 'miss-shot': {
          this.fx.add({ kind: 'tracer', from: e.from, to: e.to, life: 0.22, color: '#ffb36b', width: 1 });
          TC.sfx(game, 'flare', { vol: 0.5 });
          break;
        }
        case 'hit': {
          this.hitMarker = 0.22; this.hitHead = !!e.head;
          this.fx.add({ kind: 'spark', at: e.at || [0, 0, 0], life: 0.2, n: 8, spread: 12, color: e.head ? '#ffd36a' : '#ffffff', seed: e.t });
          TC.sfx(game, e.head ? 'head' : 'hit');
          break;
        }
        case 'impact': {
          this.fx.add({ kind: 'spark', at: e.at, life: 0.25, n: 7, spread: 10, color: '#ffe0a0', seed: e.t });
          TC.sfx(game, 'impact', { vol: 0.3 });
          break;
        }
        case 'kill': {
          const at = e.at || [0, 0, 0];
          TC.sfx(game, 'kill');
          this.fx.popup(at, e.head ? 'HEADSHOT' : e.quick ? 'QUICK!' : 'DOWN', e.head ? '#ffd36a' : '#ffffff', 0.9);
          break;
        }
        case 'score': {
          if (e.at && e.pts) this.fx.popup(e.at, (e.pts > 0 ? '+' : '') + TC.fmt(e.pts), e.pts > 0 ? '#ffe9a0' : '#ff3b30', 0.9);
          break;
        }
        case 'threat': {
          this.threatRings.set(e.id, { id: e.id, target: e.target, muzzle: e.muzzle, t0: e.t0, dur: e.dur, kind: e.kind, ticked: false, chirped: false });
          break;
        }
        case 'threatHit': {
          this.fx.hurt = 1; this.fx.shake = 0.6;
          TC.sfx(game, 'hurt');
          if (game.input && game.input.rumble) this.rumbleFor(e.player, 0.6, 0.25);
          this.threatRings.delete(e.id);
          break;
        }
        case 'blocked': {
          TC.sfx(game, 'ping', { vol: 0.5 });
          this.threatRings.delete(e.id);
          const bp = sim.players[e.player];
          if (bp) {
            const c = sim.coverPose(bp);
            this.fx.add({ kind: 'spark', at: [c[0] + 12, c[1], c[2] - 4], life: 0.2, n: 8, spread: 8, color: '#ffe9a0', seed: e.t });
          }
          break;
        }
        case 'threatDown': {
          this.threatRings.delete(e.id);
          break;
        }
        case 'lifeLost': {
          TC.sfx(game, 'hurt', { vol: 0.8 });
          this.fx.banner('-1 LIFE', '#ff3b30', 0.8, 2);
          break;
        }
        case 'timeup': {
          TC.sfx(game, 'timeup');
          this.fx.banner("TIDE'S IN!", '#ff3b30', 1.6, 4);
          this.radioSay('juno', 'Tide is in! Get back under cover, now!');
          break;
        }
        case 'timeExtend': {
          TC.sfx(game, 'extend');
          this.fx.banner('TIME EXTEND +' + e.s, '#9fe3ff', 1, 2);
          break;
        }
        case 'pickup': {
          if (e.kind === 'ammo') {
            TC.sfx(game, 'pickup');
            this.fx.banner(TC.get('weapon', e.weapon).short + ' +' + e.n, '#ffd36a', 1.2, 2);
            if (e.first) this.fx.banner('NEW WEAPON', '#9fe3ff', 1.8, 2, TC.get('weapon', e.weapon).name);
          }
          else if (e.kind === 'ring') { TC.sfx(game, 'ring'); this.fx.banner('1UP!', '#ff5a5a', 1.2, 4); }
          else if (e.kind === 'intel') { TC.sfx(game, 'intel'); this.intelFound(e.intel); }
          break;
        }
        case 'reload': { TC.sfx(game, 'reload'); break; }
        case 'reloaded': { TC.sfx(game, 'reloaded'); break; }
        case 'switch': { TC.sfx(game, 'switch'); break; }
        case 'empty': { TC.sfx(game, 'empty'); this.fx.banner('RELOAD!', '#ff3b30', 0.6, 2); break; }
        case 'cover-in': case 'cover-out': { TC.sfx(game, 'bark', { vol: 0.2 }); break; }
        case 'scene': { this.onScene(e); break; }
        case 'actionStart': { TC.sfx(game, 'chirp'); this.fx.banner('ACTION!', '#ffd36a', 1.0, 4); break; }
        case 'clear': { TC.sfx(game, 'clear'); this.fx.banner('AREA CLEAR', '#9fe3ff', 1.4, 3, e.bonus ? '+' + TC.fmt(e.bonus) : null); break; }
        case 'phase': { this.lastPhase = e.phase; break; }
        case 'boss': { this.onBoss(e); break; }
        case 'bossHit': { this.hitMarker = 0.22; this.hitHead = false; TC.sfx(game, 'hit', { vol: 0.8 }); break; }
        case 'ping': { TC.sfx(game, 'ping'); break; }
        case 'partDown': { TC.sfx(game, 'explode'); this.fx.banner(e.label + ' DOWN', '#ffd36a', 1.4, 3); break; }
        case 'bossDown': { TC.sfx(game, 'boom'); this.fx.banner('CLEAR!', '#ffd36a', 2, 4); break; }
        case 'bossPhase': { this.fx.banner('PHASE 2', '#ff5a2a', 1.4, 3); TC.sfx(game, 'chirp'); break; }
        case 'explode': { this.fx.add({ kind: 'boom', at: e.at, life: 0.5, rad: e.rad }); TC.sfx(game, 'explode'); this.fx.shake = Math.max(this.fx.shake, 0.3); break; }
        case 'barrel': { this.fx.add({ kind: 'boom', at: e.at, life: 0.6, rad: 56 }); TC.sfx(game, 'boom', { vol: 0.9 }); break; }
        case 'break': { this.fx.add({ kind: 'spark', at: e.at, life: 0.3, n: 10, spread: 14, color: '#c9a060', seed: e.t }); TC.sfx(game, 'impact', { vol: 0.5 }); break; }
        case 'civilian': { TC.sfx(game, 'civilian'); this.fx.banner('HOLD YOUR FIRE!', '#ff9ac2', 1.4, 3); this.radioSay('festival', 'Hey! Hey! We are civilians!'); break; }
        case 'escaped': { this.fx.banner('QUARTERMASTER GONE', '#ffb36b', 1.0, 2); break; }
        case 'lob': { TC.sfx(game, 'lob'); break; }
        case 'glFire': { TC.sfx(game, 'gl'); break; }
        case 'shootdown': { TC.sfx(game, 'ping', { vol: 0.7 }); break; }
        case 'wave': break;
        case 'out': { TC.sfx(game, 'gameover', { vol: 0.5 }); this.fx.banner(sim.players[e.player].name + ' DOWN', '#ff3b30', 1.2, 2); break; }
        case 'continue': case 'rejoin': { TC.sfx(game, 'cont'); this.fx.banner('CONTINUE!', '#ffd36a', 1.2, 3); break; }
        case 'restart': { this.fx.banner('AGAIN!', '#ffd36a', 1.0, 3); break; }
        default: break;
      }
    }
  }

  // The stage's opening: its intro lines in a modal dialog, with the play frozen until the last line closes.
  intro() {
    const lines = TC.INTROS[this.sim.stageId];
    if (this.introT < 0 || !lines || this.cfg.attract) return;
    this.dialog = TC.Story.run(this.game, lines, () => { this.dialog = null; });
  }

  // Dev actions (44-dev.js).
  restartArea() { this.sim.restartScene(); this.fx.banner('AGAIN!', '#ffd36a', 1, 3); }
  skipArea(dir) {
    const sim = this.sim, last = sim.world.scenes.length - 1;
    const next = sim.sceneIdx + dir;
    if (next < 0) return;
    if (next > last) { sim.stageClear(); return; }
    sim.enterScene(next, false);
  }
  killAll() {
    for (const e of this.sim.enemies) if (e.alive) { e.hp = 0; this.sim.killEnemy(e, this.sim.players[0], false, [e.x, e.y, 14], null, null); }
  }
  allWeapons() {
    for (const p of this.sim.players) {
      for (const w of ['mg', 'shotgun', 'gl']) { p.owned[w] = true; p.pool[w] = TC.get('weapon', w).pool; }
    }
  }

  // Scenes: the rail rides to the next area with WAIT, and the area's cue plays on its first step.
  onScene(e) {
    this.fx.banner('WAIT', '#ffffff', TC.ARRIVE, 3);
    const cue = TC.cueFor(this.sim.stageId, e.id);
    if (cue) this.radioSay(cue.speaker, cue.line, true);
  }

  onBoss(e) {
    const boss = TC.get('boss', e.id);
    this.fx.banner(boss.name, '#ff5a2a', 2.2, 4, boss.title);
    if (this.game.audio) this.game.audio.music(TC.get('song', 'boss'));
    TC.sfx(this.game, 'boom', { vol: 0.5 });
    this.radioSay('juno', 'Target is armored. Take out the turrets first!');
  }

  // An intel bottle: its note is shown for a few seconds, and kept in the records (once).
  intelFound(text) {
    this.intelText = text;
    this.intelT = 4;
    const have = E.store.get('intel', []);
    if (!have.includes(text)) E.store.set('intel', have.concat([text]));
  }

  // Radio: a line of Animalese and subtitles, in the box at the top. Modal lines are dialog; radio lines are not.
  radioSay(speaker, line, first) {
    if (this.cfg.attract) return;
    this.radioQueue.push({ speaker, line, t: 0, typed: 0 });
    if (first) TC.animalese(this.game, speaker, line, this.sim.rng('voice'));
  }
  updateRadio(dt) {
    if (!this.radioQueue.length) return;
    const cur = this.radioQueue[0];
    cur.t += dt;
    if (cur.t > Math.max(2.4, cur.line.length / 26)) this.radioQueue.shift();
  }

  // The end of a stage: the results or the game over, after the outro's beat.
  finish() {
    this.over = true;
    const result = this.sim.result;
    this.stageDoneT = 0;
    this.endResult = result;
  }

  // Rumble the seat's pad when its player is hit (seat index equals player id).
  rumbleFor(pid, strength, secs) {
    const s = this.seats[pid];
    if (s && s.input && s.input.rumble) s.input.rumble(strength, secs);
  }

  // Drawing: each viewport is rendered with its player's camera.
  viewports(W, H) {
    const n = this.sim.players.length;
    // An online copy draws only its own player, full screen; a local game splits the screen between its players.
    if (this.cfg.viewer !== undefined) return [{ i: this.cfg.viewer, x: 0, y: 0, w: W, h: H }];
    if (n <= 1) return [{ i: 0, x: 0, y: 0, w: W, h: H }];
    const out = [];
    const cols = 2, rows = n <= 2 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const w = Math.floor(W / cols), h = Math.floor(H / rows);
      out.push({ i, x: c * w, y: r * h, w: c === cols - 1 ? W - c * w : w, h: r === rows - 1 ? H - r * h : h });
    }
    return out;
  }

  draw(r) {
    const W = r.W, H = r.H;
    const vps = this.viewports(W, H);
    const sim = this.sim;
    // Each viewport: its player's camera, the rasterized world, the billboards, then the FX and the HUD.
    r.overlay(g => {
      for (const vp of vps) {
        const p = sim.players[vp.i];
        if (!p) continue;
        this.lastVp[vp.i] = vp;
        const ras = this.rasterFor(vp.i, vp.w, vp.h);
        const cam = this.cameraFor(p, vp);
        ras.begin(cam, this.env, this.time, this.lightsNow());
        ras.drawTris(this.triangles());
        this.drawActors(ras, cam);
        ras.present(g, vp.x, vp.y);
        this.fx.drawWorld(g, ras, vp.x, vp.y);
        if (!this.cfg.flyover) TC.drawHUD(this, g, vp, p, cam);
        if (!this.cfg.flyover) TC.drawDevView(this, g, vp, ras, cam);
      }
      if (!this.cfg.flyover) TC.drawGlobal(this, g, W, H);
    });
    if (this.dialog && this.dialog.open) this.dialog.draw(r);
    if (this.cfg.hub && this.cfg.role === 'server') {
      r.overlay(g => {
        TC.panel(g, 40, 80, r.W - 80, 80);
        TC.text(g, 'HOSTING THE ROUND', r.W / 2, 92, TC.PALETTE.gold, { align: 'center', scale: 2 });
        TC.text(g, this.sim.players.length + ' AGENTS · ' + TC.get('stage', this.sim.stageId).name + ' · AREA ' + (this.sim.sceneIdx + 1), r.W / 2, 118, TC.PALETTE.text, { align: 'center', scale: 2 });
      });
    }
    if (this.cfg.hub && TC.Hub.ended) {
      r.overlay(g => {
        g.fillStyle = '#05070fcc'; g.fillRect(0, 0, r.W, r.H);
        const head = TC.Hub.ended === 'host-left' ? 'HOST LEFT: ROUND VOID' : TC.Hub.ended === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER';
        TC.text(g, head, r.W / 2, r.H / 2 - 12, TC.PALETTE.gold, { align: 'center', scale: 3 });
      });
    }
  }

  // The viewport a player draws in (recorded each frame): the input's pointer maps through it.
  vpOf(i) { return this.lastVp[i] || null; }

  rasterFor(i, w, h) {
    this.rasters[i] = this.rasters[i] || new TC.Raster();
    this.rasters[i].size(w, h);
    return this.rasters[i];
  }

  // The camera as drawn: the logical pose, with the presentation's shake and hit jolt, and the reticle's aim.
  cameraFor(p, vp) {
    const cam = this.sim.camFor(p);
    const t = this.time;
    const sh = this.fx.shake * this.fx.shake * 1.5;
    const jolt = this.fx.hurt * 4 * Math.PI / 180;
    cam.yaw = Math.sin(t * 18) * sh * Math.PI / 180;
    cam.pitch = (-p.recoil * Math.PI / 180) * 0.6 + Math.sin(t * 15) * sh * 0.5 * Math.PI / 180;
    cam.roll = (cam.roll || 0) + jolt;
    cam.fov = TC.tune.view.fov;
    return cam;
  }

  // Actors: the enemies are the engine's rigs, drawn as billboards from a view that faces the camera.
  drawActors(ras, cam) {
    const list = [];
    for (const e of this.sim.enemies) {
      if (e.gone || !e.rig || (e.def && e.def.mesh)) continue;   // a drone is drawn as its own mesh (triangles())
      const p = ras.project([e.x, e.y, 0]);
      if (!p) continue;
      list.push({ e, z: p[2] });
    }
    list.sort((a, b) => b.z - a.z);
    for (const it of list) TC.billboard(ras, it.e.rig, [it.e.x, it.e.y, it.e.z], it.e.facing, cam, it.e.hitT || 0);
    // The boss' parts are boxes in the world (see triangles()), drawn with the world.
  }

  // The static world plus the boss' parts (boxes), as triangles.
  triangles() {
    const tris = [];
    for (const b of TC.worldTris(this.world)) {
      if (b.gone) continue;
      for (const t of b._tris) tris.push(t);
    }
    // The rail ride's boat deck, under the cover walls, while the rail carries the camera.
    const rd = this.sim.ride;
    if (rd && rd.started && !rd.done) TC.boxTris([this.sim.base - 40, -44, -10, this.sim.base + 40, 44, 0], 'hull', tris);
    // Enemies with their own meshes: a drone is a quadrotor body with four rotor arms and a red eye; a jet-ski is a ski.
    for (const e of this.sim.enemies) {
      if (e.gone || !e.alive && e.deathT > 0.3) continue;
      if (e.def && e.def.mesh === 'drone') {
        const x = e.x, y = e.y, z = e.z || 0;
        TC.boxTris([x - 6, y - 6, z - 3, x + 6, y + 6, z + 3], 'hull', tris);
        TC.boxTris([x - 1.5, y + 5, z - 1, x + 1.5, y + 8, z + 1], 'lamp', tris);
        for (const [ax, ay] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
          TC.boxTris([x + ax - 3, y + ay - 3, z + 3, x + ax + 3, y + ay + 3, z + 5], 'steel', tris);
        }
      } else if (e.def && e.def.ski && e.alive) {
        TC.boxTris([e.x - 9, e.y - 4, 0, e.x + 9, e.y + 4, 4], 'hull', tris);
      }
    }
    if (this.sim.boss && !this.sim.boss.defeated) {
      const boss = this.sim.boss;
      boss.def.parts.forEach((part, i) => {
        const bp = boss.parts[i];
        if (bp.down && !bp.decor) return;
        const box = this.sim.bossPartBox(part);
        TC.boxTris(box, part.mat || 'hull', tris);
      });
    }
    return tris;
  }

  // Light from the FX (flashes, explosions) for this frame.
  lightsNow() {
    const out = [];
    for (const f of this.fx.lights || []) out.push({ x: f.x, y: f.y, z: f.z, r: f.r, k: f.k * (1 - f.t / f.life) });
    this.fx.lights = (this.fx.lights || []).filter(f => f.t < f.life);
    for (const f of this.fx.list) if (f.kind === 'boom') out.push({ x: f.at[0], y: f.at[1], z: f.at[2], r: 160, k: 1.4 * (1 - f.t / f.life) });
    return out;
  }
};

// An actor billboard: the engine's rig drawn into a scratch canvas from a view facing the camera, then composited into
// the viewport where it is nearer than the world.
TC.billboard = function (ras, rig, pos, facing, cam, hitT) {
  const feet = ras.project(pos);
  if (!feet) return;
  const chest = ras.project([pos[0], pos[1], pos[2] + 12 * (rig.o && rig.o.size ? rig.o.size : 1)]);
  if (!chest) return;
  const z = feet[2];
  const k = ras.F / z;            // px per world unit at this distance
  if (k * 26 < 3) return;         // too small to see
  const S = Math.max(24, Math.ceil(k * 48));
  const sc = TC.scratch(S);
  const g = sc.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  // A view that faces the camera: the rig's yaw toward the camera, with the pitch from the ray's downward angle.
  const bearing = Math.atan2(cam.y - pos[1], cam.x - pos[0]);
  const yawDeg = -bearing * 180 / Math.PI - 90;
  const down = Math.atan2(cam.z - pos[2] - 12, Math.hypot(cam.x - pos[0], cam.y - pos[1])) * 180 / Math.PI;
  const pitchDeg = Math.max(3, down);
  const view = TC.viewFor(yawDeg, pitchDeg, k);
  const ox = Math.floor(S / 2), oy = Math.floor(S * 0.9);
  try {
    rig.draw(g, ox, oy, view);
  } catch (e) { return; }
  const img = g.getImageData(0, 0, S, S);
  void facing;
  const tint = hitT > 0 ? 1.6 : 1;
  ras.billboard(img, Math.round(feet[0] - ox), Math.round(feet[1] - oy), S, S, chest[2], tint);
};

// Views for billboards are cached by quantized yaw, pitch and scale (plan 4.1).
TC.viewFor = function (yawDeg, pitchDeg, k) {
  TC.viewCache = TC.viewCache || new Map();
  const key = Math.round(yawDeg / 2) + ':' + Math.round(pitchDeg / 2) + ':' + Math.round(k * 16);
  let v = TC.viewCache.get(key);
  if (!v) {
    v = new E.View('tc-r', 'Rail', Math.round(yawDeg / 2) * 2, Math.round(pitchDeg / 2) * 2, Math.max(0.05, Math.round(k * 16) / 16), 1);
    if (TC.viewCache.size > 400) TC.viewCache.clear();
    TC.viewCache.set(key, v);
  }
  return v;
};

// One scratch canvas for every billboard, grown as needed.
TC.scratch = function (S) {
  if (!TC._scratch) {
    TC._scratch = { cv: null, g: null, size: 0 };
  }
  const sc = TC._scratch;
  if (sc.size < S) {
    sc.cv = document.createElement('canvas');
    sc.cv.width = S; sc.cv.height = S;
    sc.g = sc.cv.getContext('2d', { willReadFrequently: true });
    sc.size = S;
  }
  return sc;
};
