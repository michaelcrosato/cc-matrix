// Dipout HD: the game. Engine boot, scenes (title, setup, race, results, about, attract), the pause menu, dev mode.
(() => {
  const E = My3D2dge;
  const SN = globalThis.SN;
  const THREE = () => E.THREE;

  const APP = {
    world: null, worldKey: '', meshes: null, craft: [], projMeshes: new Map(), shockMeshes: new Map(),
    trackId: 'nordlicht', clsIndex: 1, laps: 3, mode: 'race', pilot: 0,
    race: null, tr: null, idle: 0, camMode: 0, devOpen: false, devIndex: 0,
    cheats: { infShield: false, autoWeapon: false }, msg: '', msgT: 0, state: 'countdown', cd: 3,
    controlSt: SN.makeControlState(), device: 'keyboard', glyphs: 'playstation', ends: null,
    attract: false, attractLoop: 0, touchOnly: false, aboutPage: 0, doneT: 0, resultsOf: null,
  };
  SN.APP = APP;

  const trackOf = (id) => {
    if (APP.tr && APP.tr.id === id) return APP.tr;
    APP.tr = SN.buildTrack(SN.trackDef(id));
    return APP.tr;
  };

  // ---------- the 3D world of a track ----------
  const ensureWorld = (game, tr) => {
    if (APP.worldKey === tr.id && APP.world) return APP.world;
    if (APP.world) { APP.world.dispose(); APP.world = null; }
    const world = new E.World3D(game, {
      terrain: { height: () => -60 * 16, color: () => [12, 14, 24] },
      sky: { top: tr.sky[0], horizon: tr.sky[2], ground: '#05060c', sun: '#ffe2b8', haze: 0.25 },
      fog: { color: tr.sky[2], near: 4200, far: 30000 },
      sun: { color: '#fff1d6', intensity: 2.2, dir: [0.35, 0.6, -0.75] },
      ambient: [tr.sky[1], '#0b0d18', 3],
    });
    const m = SN.buildTrackMeshes(THREE(), tr);
    const T = THREE();
    const add = (mesh, mat) => { const o = new T.Mesh(mesh.build(T), mat); world.scene.add(o); return o; };
    const lam = () => new T.MeshLambertNodeMaterial({ vertexColors: true });
    const bas = () => new T.MeshBasicNodeMaterial({ vertexColors: true });
    APP.meshes = {
      road: add(m.road, lam()), wall: add(m.wall, lam()), pill: add(m.pill, lam()),
      glow: add(m.glow, bas()), pad: add(m.pad, bas()),
    };
    world.camera.set('fixed');
    APP.world = world;
    APP.worldKey = tr.id;
    APP.craft = [];
    APP.projMeshes.clear();
    APP.shockMeshes.clear();
    return world;
  };

  // Build craft groups for the race's ships (called when a race starts).
  const buildCraft = (race) => {
    const world = APP.world, T = THREE();
    for (const g of APP.craft) world.scene.remove(g);
    APP.craft = race.ships.map((sh) => {
      const g = SN.buildCraftGroup(T, SN.TEAMS[sh.team], sh.human);
      world.scene.add(g);
      return g;
    });
    for (const m of APP.projMeshes.values()) world.scene.remove(m);
    for (const m of APP.shockMeshes.values()) world.scene.remove(m);
    APP.projMeshes.clear(); APP.shockMeshes.clear();
  };

  // Sync craft and projectile meshes to the sim (called every frame, after the sim steps).
  const syncScene = (race) => {
    const tr = race.track, T = THREE(), world = APP.world;
    race.ships.forEach((sh, i) => {
      const f = SN.frameInto(tr, sh.s, {});
      const pos = [f.C[0] + f.R[0] * sh.u, f.C[1] + f.R[1] * sh.u, sh.zc];
      SN.placeCraft(T, APP.craft[i], pos, f.T, f.U, sh.roll);
      APP.craft[i].visible = !sh.eliminated;
    });
    // Projectiles: one mesh per id.
    const seen = new Set();
    for (const p of race.proj) {
      seen.add(p.id);
      let m = APP.projMeshes.get(p.id);
      if (!m) {
        const col = new T.Color(SN.WEAPONS[p.kind].color);
        const geo = p.kind === 'cannon' ? new T.BoxGeometry(0.4, 0.4, 5) : new T.SphereGeometry(p.kind === 'mine' ? 1.1 : 0.7, 8, 6);
        m = new T.Mesh(geo, new T.MeshBasicNodeMaterial({ color: col }));
        world.scene.add(m); APP.projMeshes.set(p.id, m);
      }
      const f = SN.frameInto(tr, p.s, {});
      m.position.set(f.C[0] + f.R[0] * p.u, p.z, f.C[1] + f.R[1] * p.u);
    }
    for (const [id, m] of APP.projMeshes) if (!seen.has(id)) { world.scene.remove(m); APP.projMeshes.delete(id); }
    // Shockwave rings on the road.
    const seenS = new Set();
    race.shocks.forEach((w, i) => {
      const id = 'w' + i + '_' + Math.round(w.P);
      seenS.add(id);
      let m = APP.shockMeshes.get(id);
      if (!m) {
        m = new T.Mesh(new T.RingGeometry(0.9, 1, 48), new T.MeshBasicNodeMaterial({ color: new T.Color('#8b7bff'), transparent: true, opacity: 0.8 }));
        m.rotation.x = -Math.PI / 2;
        world.scene.add(m); APP.shockMeshes.set(id, m);
      }
      const f = SN.frameInto(tr, w.P, {});
      const k = (SN.WEAPONS.tremor.life - w.life + 0.05) / SN.WEAPONS.tremor.life;
      m.position.set(f.C[0] + f.R[0] * w.u, f.C[2] + 0.3, f.C[1] + f.R[1] * w.u);
      m.scale.setScalar(w.r * Math.min(1, k * 1.2));
    });
    for (const [id, m] of APP.shockMeshes) if (!seenS.has(id)) { world.scene.remove(m); APP.shockMeshes.delete(id); }
  };

  // Camera: chase, far chase or cockpit, behind the human craft (or the leader in attract). Engine units (16/m).
  const setCamera = (race, lookBack) => {
    const world = APP.world;
    const me = race.ships.find((s) => s.human) || race.ships.slice().sort((a, b) => a.rank - b.rank)[0];
    const tr = race.track;
    const f = SN.frameInto(tr, me.s, {});
    const pos = [f.C[0] + f.R[0] * me.u, f.C[1] + f.R[1] * me.u, me.zc];
    const side = lookBack ? -1 : 1;
    const fwd = [f.T[0] * side, f.T[1] * side, f.T[2] * side], up = f.U;
    const modes = [{ back: 16, up: 5, ahead: 12 }, { back: 30, up: 9, ahead: 14 }, { back: -1.5, up: 0.9, ahead: 30 }];
    const m = modes[APP.camMode] || modes[0];
    const eye = [pos[0] - fwd[0] * m.back + up[0] * m.up, pos[1] - fwd[1] * m.back + up[1] * m.up, pos[2] - fwd[2] * m.back + up[2] * m.up];
    const tgt = [pos[0] + fwd[0] * m.ahead, pos[1] + fwd[1] * m.ahead, pos[2] + fwd[2] * m.ahead + 1];
    const dx = tgt[0] - eye[0], dy = tgt[1] - eye[1], dz = tgt[2] - eye[2];
    const hl = Math.hypot(dx, dy);
    world.camera.fixed = {
      x: eye[0] * 16, y: eye[1] * 16, z: eye[2] * 16,
      yaw: Math.atan2(dy, dx), pitch: Math.atan2(dz, hl), roll: -f.bank * 0.6 - me.roll * 0.25, fov: 62,
    };
  };

  // ---------- race lifecycle ----------
  const startRace = (game, o) => {
    const tr = trackOf(o.track);
    const cls = SN.CLASSES[o.cls];
    const human = !o.attract;
    const n = o.mode === 'tt' ? 1 : 8;
    const entrants = [];
    for (let i = 0; i < n; i++) {
      const pilot = SN.PILOTS[((o.pilot || 0) + i) % SN.PILOTS.length];
      entrants.push({ name: pilot.name, team: pilot.team, human: i === 0 && human, skill: pilot.skill });
    }
    const seed = (o.seed != null ? o.seed : Math.floor(Math.random() * 1e9)) >>> 0;
    const race = new SN.Race({ track: tr, cls, laps: o.laps, seed, entrants, mode: o.mode });
    APP.race = race;
    APP.mode = o.mode; APP.attract = !!o.attract; APP.seed = seed;
    APP.state = 'countdown'; APP.cd = 3.0; APP.msg = ''; APP.msgT = 0; APP.doneT = 0;
    ensureWorld(game, tr);
    buildCraft(race);
    setCamera(race);
  };

  const pauseItems = () => {
    const items = [
      ['Restart', () => { startRace(game, APP.lastOpts); game.resume(); }],
      ['Camera', () => { APP.camMode = (APP.camMode + 1) % 3; }],
      ['Dev mode', () => { APP.devOpen = true; APP.devIndex = 0; game.resume(); }],
      ['How to play', () => { APP.showHelp = true; game.resume(); }],
    ];
    return APP.attract ? [] : items;
  };

  // ---------- engine ----------
  const game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, bg: null,
    menu: { items: pauseItems, quit: 'title' },
  });
  APP.game = game;

  const SCENES = {};

  // Title: a backdrop of the track from above, the main menu, the touch notice and the attract timer.
  const titleMenu = () => {
    const items = ['QUICK RACE', 'TIME TRIAL', 'OPTIONS', 'ABOUT'];
    if (APP.touchOnly) items.push('SETTINGS');
    return items;
  };
  SCENES.title = {
    enter() {
      APP.attract = false; APP.idle = 0;
      game.audio.music(SN.SONGS.menu);
      const tr = trackOf('nordlicht');
      ensureWorld(game, tr);
      APP.race = null;
      APP.menu = new E.Menu(game, titleMenu(), {
        x: 'center', y: 118, box: false, color: '#e8e4ff', pick: '#ffd36a',
        onPick: (i, item) => {
          game.audio.sfx(SN.SFX.confirm);
          const label = typeof item === 'string' ? item : item.label;
          if (label === 'QUICK RACE') game.go('setup', { mode: 'race' });
          else if (label === 'TIME TRIAL') game.go('setup', { mode: 'tt' });
          else if (label === 'OPTIONS' || label === 'SETTINGS') game.menu('settings');
          else if (label === 'ABOUT') game.go('about');
        },
      });
    },
    update(dt) {
      const any = anyInput();
      if (APP.menu) APP.menu.update(dt);
      if (any) APP.idle = 0; else APP.idle += dt;
      if (APP.idle >= 10) { game.go('attract'); return; }
      // The backdrop orbits the track's start.
      const t = game.time;
      const tr = APP.tr;
      const f = SN.frameInto(tr, 0, {});
      const ang = t * 0.12;
      const d = 160;
      const eye = [f.C[0] + Math.cos(ang) * d, f.C[1] + Math.sin(ang) * d, f.C[2] + 60];
      const tgt = [f.C[0], f.C[1], f.C[2] + 8];
      const dx = tgt[0] - eye[0], dy = tgt[1] - eye[1], dz = tgt[2] - eye[2];
      APP.world.camera.fixed = { x: eye[0] * 16, y: eye[1] * 16, z: eye[2] * 16, yaw: Math.atan2(dy, dx), pitch: Math.atan2(dz, Math.hypot(dx, dy)), roll: 0, fov: 60 };
      APP.world.step(dt);
    },
    draw(r) {
      APP.world.draw(r);
      r.overlay((g) => {
        E.font.title(g, 'DIPOUT HD', r.W / 2, 26, { scale: 4, colors: ['#ffffff', '#36c8ff'], align: 'center', depth: 2, depthColor: '#0a2a4a' });
        E.font.text(g, 'Stay on the road. Stay in the air.', r.W / 2, 74, '#9fd8ff', { align: 'center', scale: 1, shadow: '#000' });
        if (APP.touchOnly) E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H - 40, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
        E.font.text(g, 'v' + SN.VERSION, 4, r.H - 8, '#6a6488', { scale: 1 });
      });
      if (APP.menu) APP.menu.draw(r);
    },
  };

  SCENES.setup = {
    enter(data) {
      APP.setupMode = (data && data.mode) || 'race';
      APP.setupRow = 0;
      const rows = () => [
        'CLASS  ' + SN.CLASSES[APP.clsIndex].name,
        'TRACK  ' + SN.trackDef(APP.trackId).name,
        'LAPS   ' + APP.laps,
        'START',
      ];
      APP.setupRows = rows;
      APP.menu = new E.Menu(game, rows(), {
        x: 'center', y: 80, title: APP.setupMode === 'tt' ? 'TIME TRIAL' : 'QUICK RACE', box: true,
        onPick: (i) => {
          if (i === 3) {
            APP.lastOpts = { track: APP.trackId, cls: APP.clsIndex, laps: APP.laps, mode: APP.setupMode, pilot: 0 };
            game.audio.sfx(SN.SFX.confirm);
            game.go('race', APP.lastOpts);
          }
        },
        onCancel: () => { game.audio.sfx(SN.SFX.cancel); game.go('title'); },
      });
      game.audio.music(SN.SONGS.menu);
    },
    update(dt) {
      const m = APP.menu;
      const change = (d) => {
        const row = m.i;
        if (row === 0) APP.clsIndex = (APP.clsIndex + d + SN.CLASSES.length) % SN.CLASSES.length;
        if (row === 1) { const k = SN.TRACKS.findIndex((t) => t.id === APP.trackId); APP.trackId = SN.TRACKS[(k + d + SN.TRACKS.length) % SN.TRACKS.length].id; }
        if (row === 2) APP.laps = SN.clamp(APP.laps + d, 1, 6);
        m.items = APP.setupRows();
        game.audio.sfx(SN.SFX.select);
      };
      if (game.input.pressed('left')) change(-1);
      if (game.input.pressed('right')) change(1);
      m.update(dt);
    },
    draw(r) {
      const tr = trackOf(APP.trackId);
      ensureWorld(game, tr);
      const f = SN.frameInto(tr, 0, {});
      const eye = [f.C[0] - f.T[0] * 60 + f.U[0] * 14, f.C[1] - f.T[1] * 60 + f.U[1] * 14, f.C[2] + 14];
      const tgt = [f.C[0] + f.T[0] * 40, f.C[1] + f.T[1] * 40, f.C[2] + 4];
      APP.world.camera.fixed = { x: eye[0] * 16, y: eye[1] * 16, z: eye[2] * 16, yaw: Math.atan2(tgt[1] - eye[1], tgt[0] - eye[0]), pitch: Math.atan2(tgt[2] - eye[2], Math.hypot(tgt[0] - eye[0], tgt[1] - eye[1])), roll: 0, fov: 60 };
      APP.world.step(0);
      APP.world.draw(r);
      const c = SN.CLASSES[APP.clsIndex];
      r.overlay((g) => {
        const info = 'TOP ' + Math.round(c.top * SN.KMH) + ' KM/H   ' + tr.L.toFixed(0) + ' M LAP';
        E.font.text(g, info, r.W / 2, r.H - 34, '#9fd8ff', { align: 'center', scale: 1, shadow: '#000' });
        E.font.text(g, 'LEFT / RIGHT change   ENTER start   ESC back', r.W / 2, r.H - 14, '#e8e4ff', { align: 'center', scale: 1, shadow: '#000' });
      });
      APP.menu.draw(r);
    },
  };

  SCENES.race = {
    pausable: true,
    enter(data) {
      if (data) APP.lastOpts = data;
      startRace(game, data || APP.lastOpts);
      APP.menu = null;
      game.audio.music(SN.SONGS.race);
    },
    exit() { game.audio.music(null); },
    update(dt) {
      const race = APP.race;
      if (!race) return;
      const inputAny = anyInput();
      if (APP.attract) {
        if (inputAny) { game.go('title'); return; }
        race.ships.forEach((s) => { s.energy = Math.max(s.energy, s.energyMax); });
      }
      if (APP.devOpen) { devUpdate(); return; }
      if (APP.state === 'countdown') {
        APP.cd -= dt;
        if (APP.cd <= 0) { APP.state = 'running'; APP.msg = 'GO'; APP.msgT = 1.2; game.audio.sfx(SN.SFX.go); }
        setCamera(race); APP.world.step(dt); return;
      }
      APP.glyphs = game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation';
      if (APP.msgT > 0) APP.msgT -= dt;
      // The human's controls, then the sim step.
      const pad = pickPad();
      const c = SN.readControls(game, pad, APP.controlSt);
      APP.device = padActive(pad) || game.input.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard';
      if (c.camPressed) APP.camMode = (APP.camMode + 1) % 3;
      APP.lookBack = !!c.lookBack;
      // The AI drives every craft but the human's (in attract, all of them).
      const controls = race.ships.map((s) => (s.human ? c : null));
      // The race ends eight seconds after the first craft finishes (the rest are DNF).
      if (race.ships.some((s) => s.finished)) APP.doneT += dt;
      race.step(dt, controls);
      // Presentation of this step's events.
      for (const e of race.events) present(e);
      if (!APP.attract && APP.doneT > 8) race.finished = true;
      setCamera(race, APP.lookBack);
      syncScene(race);
      APP.world.step(dt);
      // The race ends when the field has finished (or the human has, plus a grace period).
      if (race.finished || (APP.mode === 'tt' && race.humanDone() && APP.doneT > 8)) {
        if (APP.attract) { APP.attractLoop++; startRace(game, { track: SN.TRACKS[APP.attractLoop % SN.TRACKS.length].id, cls: APP.attractLoop % 4, laps: 2, mode: 'race', attract: true, seed: 100 + APP.attractLoop }); return; }
        game.go('results', { race });
      }
    },
    draw(r) {
      const race = APP.race;
      if (!race) return;
      syncScene(race);
      APP.world.draw(r);
      if (APP.attract) {
        r.overlay((g) => {
          E.font.text(g, 'ATTRACT  ·  PRESS ANY BUTTON', r.W / 2, 8, '#ffd36a', { align: 'center', scale: 1, shadow: '#000' });
        });
        return;
      }
      const me = race.ships[0];
      const device = APP.device;
      if (APP.state === 'countdown') {
        const n = Math.ceil(APP.cd);
        r.overlay((g) => { E.font.title(g, String(n), r.W / 2, r.H * 0.38, { scale: 5, colors: ['#ffffff', '#ffd36a'], align: 'center', depth: 2, depthColor: '#000' }); });
      }
      SN.drawHUD(E, r, {
        race, me, state: APP.state, lapsTotal: race.laps, message: APP.msg, msgT: APP.msgT,
        glyphStyle: APP.glyphs, device,
      });
      if (APP.devOpen) drawDev(r);
      if (APP.showHelp) drawHelp(r);
    },
  };

  SCENES.results = {
    enter(data) {
      APP.resultsOf = data && data.race ? data.race : APP.race;
      const race = APP.resultsOf;
      const me = race.ships.find((s) => s.human);
      if (me && APP.mode === 'tt' && me.finished) {
        const key = 'dipout.best.' + APP.trackId + '.' + APP.clsIndex;
        const best = E.store.get(key, null);
        if (best == null || me.finishT < best) E.store.set(key, me.finishT);
      }
      APP.menu = new E.Menu(game, ['RETRY', 'TRACK SELECT', 'TITLE'], {
        x: 'center', y: 200, box: false, color: '#e8e4ff', pick: '#ffd36a',
        onPick: (i) => {
          if (i === 0) game.go('race', APP.lastOpts);
          else if (i === 1) game.go('setup', { mode: APP.mode });
          else game.go('title');
        },
      });
      game.audio.music(SN.SONGS.menu);
    },
    update(dt) { APP.menu.update(dt); },
    draw(r) {
      APP.world.draw(r);
      const race = APP.resultsOf;
      const rows = race.results();
      r.overlay((g) => {
        E.ui.box(g, 20, 14, r.W - 40, r.H - 28, { bg: ['#0a0f24', '#141a3a'], alpha: 0.88 });
        E.font.title(g, APP.mode === 'tt' ? 'TIME TRIAL' : 'RESULTS', r.W / 2, 22, { scale: 2, colors: ['#ffffff', '#36c8ff'], align: 'center' });
        let y = 52;
        for (const row of rows.slice(0, 8)) {
          const col = row.human ? '#ffd36a' : '#e8e4ff';
          E.font.text(g, String(row.rank), 34, y, col, { scale: 1 });
          E.font.text(g, row.name, 52, y, col, { scale: 1 });
          E.font.text(g, row.finished ? SN.fmtTime(row.time) : 'DNF', r.W - 34, y, col, { scale: 1, align: 'right' });
          y += 12;
        }
        const me = race.ships.find((s) => s.human);
        if (me && me.lapTimes.length) E.font.text(g, 'BEST LAP ' + SN.fmtTime(Math.min(...me.lapTimes)), r.W / 2, r.H - 52, '#9fd8ff', { align: 'center', scale: 1 });
      });
      APP.menu.draw(r);
    },
  };

  // About: the source information and feedback, in pages.
  SCENES.about = {
    enter() {
      APP.aboutPage = 0;
      APP.aboutPages = aboutPages();
      game.audio.music(SN.SONGS.menu);
    },
    update(dt) {
      if (game.input.pressed('right') || game.input.pressed('confirm')) APP.aboutPage = Math.min(APP.aboutPages.length - 1, APP.aboutPage + 1);
      if (game.input.pressed('left')) APP.aboutPage = Math.max(0, APP.aboutPage - 1);
      if (game.input.pressed('cancel')) game.go('title');
      if (APP.world) APP.world.step(dt);
    },
    draw(r) {
      APP.world.draw(r);
      const page = APP.aboutPages[APP.aboutPage];
      r.overlay((g) => {
        E.ui.box(g, 10, 10, r.W - 20, r.H - 20, { bg: ['#0a0f24', '#141a3a'], alpha: 0.94 });
        E.font.title(g, page.title, r.W / 2, 18, { scale: 2, colors: ['#ffffff', '#36c8ff'], align: 'center' });
        let y = 42;
        for (const line of page.lines) {
          const wrapped = E.font.wrap(line, r.W - 40, { scale: 1 });
          for (const w of wrapped) { E.font.text(g, w, 20, y, '#e8e4ff', { scale: 1 }); y += 10; }
        }
        E.font.text(g, 'PAGE ' + (APP.aboutPage + 1) + ' / ' + APP.aboutPages.length + '   LEFT RIGHT turn the page   ESC back', r.W / 2, r.H - 16, '#9fd8ff', { align: 'center', scale: 1 });
      });
    },
  };

  const aboutPages = () => {
    const A = SN.ABOUT;
    const si = A.sourceInformation;
    const pages = [
      { title: 'ABOUT', lines: [
        'Dipout HD, a playful riff on Wipeout HD. Anti-gravity racing in a world of banked roads, jumps, and weapons.',
        'Built on the my-3D2dge engine (v0.85.2) with three.js r182. Music and effects are synthesized in code.',
      ] },
      { title: 'SOURCE INFORMATION', lines: Object.entries(si).map(([k, v]) => k + ': ' + v) },
      { title: 'TESTING FEEDBACK', lines: A.testingFeedback.length ? A.testingFeedback : ['(filled in at build time)'] },
      { title: 'ENGINE FEEDBACK', lines: A.engineFeedback.length ? A.engineFeedback : ['(filled in at build time)'] },
      { title: 'PROMPT FEEDBACK', lines: A.promptFeedback.length ? A.promptFeedback : ['(filled in at build time)'] },
    ];
    return pages;
  };

  // ---------- events -> sounds and callouts ----------
  const present = (e) => {
    const name = SN.eventSound[e.t];
    if (name && SN.SFX[name]) game.audio.sfx(SN.SFX[name]);
    if (e.t === 'lap' && e.ship === 0) { APP.msg = 'LAP ' + e.lap; APP.msgT = 1.4; }
    if (e.t === 'finish' && e.ship === 0) { APP.msg = 'FINISH ' + (['', '1ST', '2ND', '3RD'][e.place] || e.place + 'TH'); APP.msgT = 2; }
    if (e.t === 'elim' && e.ship === 0) { APP.msg = 'ELIMINATED'; APP.msgT = 1.6; }
    if (e.t === 'pickup' && e.ship === 0) { APP.msg = SN.WEAPONS[e.weapon].name; APP.msgT = 1; }
  };

  // Any input this frame: a key or click (seen by a DOM listener), or a pressed button on a pad.
  const anyInput = () => {
    const seen = APP.inputSeen || game.input.anyPressed() || padActive(pickPad());
    APP.inputSeen = false;
    return !!seen;
  };

  // ---------- pad helpers ----------
  const pickPad = () => {
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) if (p && p.connected) return p;
    } catch (err) { /* blocked */ }
    return null;
  };
  const padActive = (p) => p && (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.2));

  // ---------- dev mode: sliders, cheats, reset ----------
  const devRows = () => {
    const rows = SN.Tune.SLIDERS.map(([k, label]) => ({ kind: 'slider', key: k, label }));
    rows.push({ kind: 'toggle', key: 'infShield', label: 'Infinite shield' });
    rows.push({ kind: 'action', key: 'give', label: 'Give weapon (cycle)' });
    rows.push({ kind: 'action', key: 'reset', label: 'RESET ALL TO DEFAULTS' });
    rows.push({ kind: 'action', key: 'close', label: 'Close' });
    return rows;
  };
  const devUpdate = () => {
    const rows = devRows();
    if (game.input.pressed('up')) APP.devIndex = (APP.devIndex + rows.length - 1) % rows.length;
    if (game.input.pressed('down')) APP.devIndex = (APP.devIndex + 1) % rows.length;
    const row = rows[APP.devIndex];
    const dir = game.input.pressed('left') ? -1 : game.input.pressed('right') ? 1 : 0;
    if (dir && row.kind === 'slider') {
      const [, , min, max, step] = SN.Tune.SLIDERS.find(([k]) => k === row.key);
      SN.Tune.T[row.key] = SN.clamp(Math.round((SN.Tune.T[row.key] + dir * step) / step) * step, min, max);
    }
    if (dir && row.kind === 'toggle') APP.cheats.infShield = !APP.cheats.infShield;
    if (game.input.pressed('confirm')) {
      if (row.kind === 'toggle') APP.cheats.infShield = !APP.cheats.infShield;
      if (row.key === 'give' && APP.race) { const me = APP.race.ships[0]; const k = SN.WEAPON_TABLE.indexOf(me.weapon); me.weapon = SN.WEAPON_TABLE[(k + 1) % SN.WEAPON_TABLE.length]; }
      if (row.key === 'reset') { SN.Tune.reset(); APP.cheats.infShield = false; }
      if (row.key === 'close') APP.devOpen = false;
    }
    if (game.input.pressed('cancel')) APP.devOpen = false;
    if (APP.cheats.infShield && APP.race) APP.race.ships[0].energy = APP.race.ships[0].energyMax * 1.3;
  };
  const drawDev = (r) => {
    const rows = devRows();
    r.overlay((g) => {
      E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#06081a', '#10163a'], alpha: 0.92 });
      E.font.title(g, 'DEV MODE', r.W / 2, 14, { scale: 2, colors: ['#ffffff', '#ffd36a'], align: 'center' });
      let y = 40;
      rows.forEach((row, i) => {
        const sel = i === APP.devIndex;
        const col = sel ? '#ffd36a' : '#e8e4ff';
        let value = '';
        if (row.kind === 'slider') value = '< ' + Number(SN.Tune.T[row.key]).toFixed(2) + ' >';
        if (row.kind === 'toggle') value = APP.cheats.infShield ? 'ON' : 'OFF';
        E.font.text(g, (sel ? '> ' : '  ') + row.label, 16, y, col, { scale: 1 });
        if (value) E.font.text(g, value, r.W - 16, y, col, { scale: 1, align: 'right' });
        y += 9;
      });
    });
  };

  const drawHelp = (r) => {
    r.overlay((g) => {
      E.ui.box(g, 16, 30, r.W - 32, r.H - 60, { bg: ['#06081a', '#10163a'], alpha: 0.94 });
      const lines = [
        'W thrust      A / D steer      Up / Down pitch',
        'Q / E airbrakes      S both brakes      Space fire',
        'Shift absorb      Z / X side-shift      C camera      B look back',
        'Pad: Cross thrust  L2 R2 airbrakes  Square fire  Circle absorb',
        'Hover onto blue pads to boost. Amber pickups give a weapon.',
        'Shield 0 = eliminated: you respawn behind your last clean spot.',
      ];
      lines.forEach((t, i) => E.font.text(g, t, 26, 44 + i * 14, '#e8e4ff', { scale: 1 }));
      E.font.text(g, 'Any key closes this', r.W / 2, r.H - 44, '#9fd8ff', { align: 'center', scale: 1 });
    });
    if (game.input.anyPressed()) APP.showHelp = false;
  };

  // ---------- boot ----------
  // The 3D add-on is a deferred module: wait for it, then initialise the renderer.
  const waitFor3D = () => new Promise((resolve, reject) => {
    const t0 = Date.now();
    const poll = () => {
      if (E.World3D) { Promise.resolve(E.World3D.init(game)).then(resolve, reject); return; }
      if (window.__sn3dFail) { reject(new Error('The 3D engine could not load (three.js from cdn.jsdelivr.net). Check the connection and reload.')); return; }
      if (Date.now() - t0 > 30000) { reject(new Error('The 3D engine could not load (three.js from cdn.jsdelivr.net). Check the connection and reload.')); return; }
      setTimeout(poll, 50);
    };
    poll();
  });
  const boot = () => {
    if (!game.settings.glyphs || game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation');
    APP.touchOnly = !!(navigator.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(any-pointer: fine)').matches));
    APP.lastOpts = { track: 'nordlicht', cls: 1, laps: 3, mode: 'race', pilot: 0 };
  };

  // Scenes that use the attract race.
  SCENES.attract = {
    enter() {
      APP.attract = true;
      const idx = APP.attractLoop % SN.TRACKS.length;
      startRace(game, { track: SN.TRACKS[idx].id, cls: 1, laps: 2, mode: 'race', attract: true, seed: 100 + APP.attractLoop });
      APP.state = 'running';
    },
    exit() { APP.attract = false; },
    update: (dt) => SCENES.race.update(dt),
    draw: (r) => SCENES.race.draw(r),
  };

  // Remember which scene is showing, for the debug handle and the tests.
  for (const k of Object.keys(SCENES)) {
    const sc = SCENES[k], enter = sc.enter;
    sc.enter = function (data) { APP.sceneName = k; return enter ? enter.call(this, data) : undefined; };
  }

  // Input seen by the DOM (keys, clicks), so attract and idle timers see every press.
  window.addEventListener('keydown', () => { APP.inputSeen = true; }, true);
  window.addEventListener('pointerdown', () => { APP.inputSeen = true; }, true);

  // Test handle (game.debug): the state a test script reads, and a way to jump to a scene.
  game.debug = {
    snapshot: () => ({
      scene: APP.sceneName, state: APP.state, mode: APP.mode, attract: APP.attract, devOpen: APP.devOpen,
      ships: APP.race ? APP.race.ships.map((s) => ({ P: +s.P.toFixed(2), s: +s.s.toFixed(2), u: +s.u.toFixed(2), zc: +s.zc.toFixed(2), h: +s.h.toFixed(2), v: +s.v.toFixed(2), energy: +s.energy.toFixed(2), lap: s.lap, finished: s.finished, eliminated: s.eliminated, rank: s.rank })) : [],
      race: APP.race ? { time: APP.race.time, finished: APP.race.finished, laps: APP.race.laps } : null,
      device: APP.device, touchOnly: APP.touchOnly, camMode: APP.camMode,
    }),
    go: (name, data) => game.go(name, data),
    stats: () => (APP.world && APP.world.stats) || null,
    app: APP,
  };
  window.__dipout = game.debug;

  // Race scene: the pause menu comes from the engine (the items above); each scene has its own update and draw.
  game.start({
    scenes: SCENES, scene: 'title',
    boot: { title: 'DIPOUT HD', steps: [
      ['Waking the 3D engine', () => waitFor3D()],
      ['Laying the road', () => { boot(); trackOf('nordlicht'); }],
    ] },
  });
  // (the engine calls scene enter/update/draw; the race needs its scene data from setup)
})();
