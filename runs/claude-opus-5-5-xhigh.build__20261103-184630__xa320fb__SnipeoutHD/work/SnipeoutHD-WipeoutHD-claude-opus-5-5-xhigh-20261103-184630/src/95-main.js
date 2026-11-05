// SNIPEOUT HD: the game. new E.Game with the game's settings and pause items, the boot (the 3D engine, the circuits, the
// hangar, the sound), the scenes (title, the front end, loading, race, results, replay, attract, the AI Hub session),
// the flow between them, and game.debug for the tests.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16, UI = SN.UI, R3 = SN.render;
const HUBON = SN.hub.active;
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', group: 'Game', options: [['Easy', 'Easy'], ['Normal', 'Normal'], ['Hard', 'Hard']], value: 'Normal', help: 'How fast and how aggressive the AI pilots are, and how much they catch up' },
  { key: 'units', label: 'Speed units', group: 'Game', options: [['kmh', 'km/h'], ['mph', 'mph']], value: 'kmh' },
  { key: 'defaultCam', label: 'Default camera', group: 'Game', options: [['chase', 'Chase'], ['far', 'Far chase'], ['cockpit', 'Cockpit']], value: 'chase' },
  { key: 'hudSize', label: 'HUD size', group: 'Display', options: [['normal', 'Normal'], ['large', 'Large']], value: 'normal' },
  { key: 'subtitles', label: 'Subtitles', group: 'Game', value: true, help: 'The announcer and the race radio as text' },
  { key: 'announcer', label: 'Announcer voice', group: 'Game', value: true },
  { key: 'speedLines', label: 'Speed lines', group: 'Display', value: true },
  { key: 'bloom', label: 'Neon glow', group: 'Display', value: true, apply: (g, v) => { for (const w of [R3.tw && R3.tw.world, R3.hangar && R3.hangar.world]) if (w) w.filter.bloom = !!v; } },
  { key: 'picture3d', label: 'Picture', group: 'Display', options: [['pixels', 'Pixels'], ['balanced', 'Balanced'], ['full', 'HD']], value: 'pixels', help: 'Pixels: the native chunky look. HD: the screen\'s full resolution' },
  { key: 'shadows3d', label: 'Shadows', group: 'Display', value: true },
  { key: 'filter3d', label: 'Filter', group: 'Display', options: [['clean', 'None'], ['cel', 'Comic cel'], ['pixel', 'Pixel']], value: 'clean' }
];
let race = null, cfg = null, tw = null, cams = [], ctls = [], tv = null, ghostRec = null, ghostData = null, ghostShip = null, resultsT = 0, toastT = 0, devFromPause = false, freeCam = null;
const pauseItems = () => {
  if (HUBON || !race || game.sceneName !== 'race') return [];
  return [
    ['Restart', () => { game.shell && game.shell.hide(); SN.flow.start(Object.assign({}, cfg)); }],
    ['Camera: ' + camLabel(cams[0] && cams[0].mode), () => { cycleCam(0); game.shell && game.shell.show('pause'); }],
    ['How to play', () => game.shell && game.shell.show('help', helpSpec())],
    ['Dev mode', () => { game.shell && game.shell.hide(); openDev(); }],
    race.rules.endRun ? ['End run', () => { game.shell && game.shell.hide(); race.endRun(); }] : null
  ];
};
const game = SN.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: SN.INPUT, id: 'snipeout-hd', autoPause: !HUBON,
  menu: { items: pauseItems, settings: SETTINGS, controls: SN.CONTROL_NAMES, quit: HUBON ? false : 'title' } });
game.input.touchEnabled = false;
const camLabel = m => ({ chase: 'Chase', far: 'Far chase', cockpit: 'Cockpit' }[m] || 'Chase');
const cycleCam = i => { const c = cams[i]; if (!c) return; c.mode = c.mode === 'chase' ? 'far' : c.mode === 'far' ? 'cockpit' : 'chase'; c.reset(); };
const helpSpec = () => {
  const I = game.input, L = a => I.label(a) || '-';
  return { title: 'How to play', keys: [[L('thrust'), 'Thrust (hold)'], [L('left') + ' ' + L('right'), 'Steer'], [L('brakeL') + ' ' + L('brakeR'), 'Airbrakes: tighter turns, both to brake'], [L('shiftL') + ' ' + L('shiftR'), 'Side-shift; a barrel roll in the air'], [L('fire'), 'Fire (hold for cannon / railshot)'], [L('absorb'), 'Absorb the weapon into shield'], [L('camera'), 'Camera'], [L('lookBack'), 'Look back']],
    sections: [['Energy', 'Walls, weapons and rolls cost shield. The green pit strip recharges it. At zero you are eliminated.'], ['Pads', 'Blue chevrons boost. Amber pads give a weapon.'], ['Launch', 'Hold thrust as the lights count down: release the revs in the green band for a perfect start.']] };
};

/* ---- boot ---- */
const wait3D = () => new Promise((ok, no) => {
  if (!SN.browser) return ok();
  const t0 = performance.now();
  const tick = () => {
    if (E.World3D) { SN._t3dMod = performance.now(); return E.World3D.init(game).then(() => { SN._w3dInit = true; SN._t3dInit = performance.now(); ok(); }, no); }
    if (window.__sn3dFail || performance.now() - t0 > 30000) return no(new Error('The 3D engine could not load (three.js from cdn.jsdelivr.net). Check the connection and reload.'));
    setTimeout(tick, 50);
  };
  tick();
});
// an AI Hub session joins in one step chained on promises (not one step a frame): the 3D engine, the connection, the
// event's world and race, then ready(); the copies of a round share a page's thread, and the hub gives each 20 s
const mark = k => { (SN._tm = SN._tm || {})[k] = Math.round(typeof performance !== 'undefined' ? performance.now() : 0); };
const joinHub = () => (mark('boot'), wait3D()).then(() => { mark('3d'); return SN.hub.begin(game); }).then(ok => { mark('connected');
  SN.audio.define(); SN.save.init(game);
  if (!ok) { for (const id of SN.TRACK_ORDER) SN.getTrack(id); R3.hangarWorld(); R3.trackWorld('solenne'); return; }
  const H = SN.hub; tw = R3.trackWorld(H.event.track); mark('world'); race = H.makeRace(tw); R3.attach(tw, race, { prepare: false }); mark('attached');
  // no all-at-once warm-up in a session: the terrain streams in a few chunks a frame and the shaders build as they first
  // draw, during the card (a heavy first frame would hold up the other copies sharing the page's thread)
  if (tw.world) { tw.world._warm = true; tw._prepared = true; }
  if (!H.readyCalled) { H.readyCalled = true; AIHub.ready(); mark('ready'); }
});
const boot = { title: 'SNIPEOUT HD', version: SN.VERSION, messages: ['Calibrating the anti-gravity field', 'Polishing the neon', 'Briefing ORACLE', 'Negotiating with QWIK-FUEL'], steps: HUBON ? [['Joining the AI Hub session', joinHub]] : [
  ['Waking the 3D engine', wait3D],
  ['Surveying the circuits', () => { for (const id of SN.TRACK_ORDER) SN.getTrack(id); }],
  ['Tuning the synthesizers', () => SN.audio.define()],
  ['Opening the saves', () => SN.save.init(game)],
  ['Building the hangar', () => R3.hangarWorld()],
  ['Building Port Solenne', () => R3.trackWorld('solenne')]
] };

/* ---- the flow ---- */
const F = SN.flow;
F.toTitle = () => { UI.reset(); game.go('title', {}, { fade: 'wipe', seconds: .25 }); };
F.toMenu = () => F.toFront(() => UI.reset(SN.screens.main()));
F.toSeason = () => F.toFront(() => { UI.reset(SN.screens.main()); SN.flow.season(); });
F.toFront = then => { game.go('front', { then }, { fade: 'wipe', seconds: .25 }); };
/** start a race from a config: { mode, track, cls, laps, team, pilot, season, gpRound, target, versusMode, players } */
F.start = c => { cfg = Object.assign({ laps: 3, cls: 'SPARK', track: 'solenne', team: SN.save.data.team || 'kestrel', pilot: SN.save.data.pilot || 'vale' }, c); if (cfg.mode === 'gp' || cfg.mode === 'season') cfg.cls = cfg.cls || 'STORM'; game.go('loading', { cfg }, { fade: 'wipe', seconds: .25 }); };
F.replay = r => game.go('replay', { race: r }, { fade: 'wipe', seconds: .25 });
/** a race from a config: the field, the rules */
F.makeRace = (c, T) => {
  const mode = c.mode, humans = mode === 'versus' ? (c.players || []).map(p => ({ pilot: p.pilot, team: p.team })) : [{ pilot: c.pilot, team: c.team, champion: c.champion }];
  let ent, rules = {};
  if (mode === 'timetrial' || mode === 'hotlap' || mode === 'overclock' || mode === 'academy') {
    ent = [{ pilot: c.pilot, team: c.team, control: 'human', pi: 0, champion: c.champion }];
    if (mode === 'academy') ent.unshift({ pilot: 'hex', team: 'nullset', control: 'drone' });
    if ((mode === 'timetrial' || mode === 'hotlap')) { const gd = SN.save.data.ghosts[T.id + '/' + c.cls + '/' + mode]; if (gd) ent.unshift({ pilot: c.pilot, team: c.team, control: 'ghost', color: '#7af0ff', label: 'GHOST' }); }
  } else ent = SN.field({ humans, size: 8, seed: 1 });
  if (mode === 'snipeout' && c.target) rules.target = c.target;
  if (mode === 'gp' || (c.season && mode === 'race')) rules = Object.assign(rules, {});
  const seed = c.seed || ((typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000) : 1) ^ 0x5eed) >>> 0;
  const R = new SN.Race({ track: T, mode: mode === 'gp' ? 'gp' : mode, cls: mode === 'overclock' ? 'SPARK' : c.cls, laps: c.laps || 3, seed, entrants: ent, difficulty: game.settings.difficulty || 'Normal', intro: c.intro !== false, rules, versusMode: c.versusMode, drill: c.drill || 0 });
  R.cfg = c; return R;
};

/* ---- the hangar: the front end's background ---- */
const hangarCam = (dt, o = {}) => {
  const hg = R3.hangar; if (!hg || !hg.world) return;
  const t = game.real * .12, tt = hg.turntable, podium = o.podium;
  let pose;
  if (podium) { const cx = 20 * U, cy = 17 * U, sw = Math.sin(game.real * .3); pose = SN.poseFrom([cx + sw * 60, cy + 190, 70], [cx, cy, 30], SN.ZUP, 50); }
  else {
    // an orbit round the turntable, the craft framed right of the menus
    const a = Math.PI / 2 - .35 + Math.sin(t * .9) * .45, d = 200, x = tt.x + Math.cos(a) * d, y = tt.y + Math.sin(a) * d, dir = V.norm([0, 0, 0], [tt.x - x, tt.y - y, 0]), rv = V.cross([0, 0, 0], SN.ZUP, dir);
    const team = UI.top() && UI.top().id === 'team'; pose = SN.poseFrom([x, y, team ? 70 : 84], [tt.x - rv[0] * (team ? 62 : 78), tt.y - rv[1] * (team ? 62 : 78), team ? 2 : 20], SN.ZUP, team ? 44 : 50);
  }
  hg.world.camera.fixed = pose; hg.world.step(dt);
};
R3.podiumPilots = (ids, playerPlace) => {
  const hg = R3.hangar; if (!hg || !hg.world) return;
  const w = hg.world; w.reset();
  const marks = ['p1', 'p2', 'p3'];
  ids.slice(0, 3).forEach((id, k) => { if (!id) return; const m = w.marks[marks[k]] && w.marks[marks[k]][0]; if (!m) return; const rig = SN.rigFor(id, true); if (!rig) return; const a = w.hero({ x: m.x, y: m.y, rig }); a.facing = Math.PI / 2; a.anim = { pose: k === 0 ? 'cheer' : k === 1 ? 'wave' : 'hips' }; });
  hg.podiumAt = game.real;
};

/* ---- scenes ---- */
let titleRace = null, titleTV = null, titleTW = null;
const titleScene = {
  enter() {
    UI.reset(); SN.attract.idleT = 0; SN.hud.reset();
    titleTW = R3.trackWorld('solenne');
    titleRace = new SN.Race({ track: titleTW.T, mode: 'race', cls: 'FLARE', laps: 99, seed: 77, entrants: SN.field({ humans: [], seed: 3 }), intro: false, rules: { infiniteEnergy: () => true, rubberBand: false }, record: false });
    R3.attach(titleTW, titleRace); titleTV = new SN.TVDirector(titleTW.T, titleTW.terrain);
    for (let k = 0; k < 120 * 5; k++) titleRace.step(1 / 120);
    SN.audio.music('zero', { layers: 'all' });
  },
  update(dt) {
    const I = game.input;
    titleRace.step(dt); const pose = titleTV.update(titleRace, dt, { attract: true });
    if (titleTW.world) { titleTW.world.camera.fixed = pose; titleTW.world.step(dt); }
    SN.audio.humStep(titleRace, titleTV.target, titleTW.world, dt, false);
    if (SN.attract.idle(dt, I)) { game.go('attract', {}, { fade: 'wipe', seconds: .3 }); return; }
    const c = I.clicked(), touch = SN.touchOnly();
    if (touch) { const b = titleScene._btn; if (c && b && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]) { I.consumeAll(); game.menu('settings'); } return; }
    if (I.pressed('start') || I.pressed('confirm') || c) { I.consumeAll(); SN.audio.sfx('ui_ok'); F.toMenu(); }
  },
  draw(r) {
    if (titleTW.world) titleTW.world.draw(r);
    r.overlay(g => {
      const T = (s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o));
      g.save(); g.globalAlpha = .35; g.fillStyle = '#05040c'; g.fillRect(0, r.H * .2, r.W, 70); g.restore(); g._c = null;
      SN.drawLogo(g, r.W / 2, r.H * .2 + 10, 1);
      T('ANTI-GRAVITY. ANTI-EVERYONE.', r.W / 2, r.H * .2 + 52, '#7af0ff', { align: 'center' });
      if (SN.touchOnly()) {
        const w = 250, x = r.W / 2 - w / 2, y = r.H * .58; UI.panel(g, x, y, w, 56, '#0a0c18', .92, '#ff3ab4');
        T('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 8, '#ffffff', { scale: 1, align: 'center' });
        const b = titleScene._btn = [r.W / 2 - 50, y + 26, 100, 22]; UI.panel(g, b[0], b[1], b[2], b[3], '#163a5a', .95, '#ffffff'); T('SETTINGS', r.W / 2, b[1] + 4, '#ffffff', { scale: 2, align: 'center' });
      } else if (Math.floor(game.real * 1.6) % 2) {
        const I = game.input, dev = SN.glyph.device(I), act = dev === 'gamepad' ? 'confirm' : dev === 'mouse' ? 'fire' : 'start', w = E.font.width('PRESS START', { scale: 2 });
        const gw = SN.glyph.draw(g, act, -999, -999, { input: I }), x0 = Math.round(r.W / 2 - (gw + 6 + w) / 2);
        SN.glyph.draw(g, act, x0, r.H * .66 + 2, { input: I }); T(dev === 'mouse' ? 'CLICK TO START' : 'PRESS START', x0 + gw + 6, r.H * .66, '#ffffff', { scale: 2 });
      }
      T(E.versionLabel ? E.versionLabel() + ' · SNIPEOUT HD ' + SN.VERSION : SN.VERSION, r.W - 6, r.H - 10, '#5a6a8a', { align: 'right', font: 'tiny' });
      T('© 2161 THE HOVERLINE AUTHORITY. A FICTIONAL LEAGUE.', 6, r.H - 10, '#5a6a8a', { font: 'tiny' });
    });
  }
};
const frontScene = {
  enter(d) {
    SN.hud.reset(); R3.hangarWorld(); SN.audio.music('zero', { layers: 'all' }); SN.attract.idleT = 0;
    if (R3.hangar && R3.hangar.world) R3.hangar.world.reset();
    if (d && d.then) d.then(); else if (!UI.top()) UI.reset(SN.screens.main());
  },
  update(dt) {
    const I = (UI.top() && UI.top().ownerInput) || game.input;
    const podium = !!(R3.hangar && R3.hangar.world && R3.hangar.world.actors.length);
    hangarCam(dt, { podium });
    if (!podium && (!UI.top() || UI.top().id !== 'team')) R3.showCraft(SN.save.data.team || 'kestrel', game.real * .35, SN.save.data.unlocked.champion && SN.setupState.champion);
    else if (podium) R3.showCraft(null);
    if (SN.dev.isOpen) { SN.dev.update(dt, game.input); UI.tick(dt); return; }
    if (SN.story.update(dt, game.input)) { UI.tick(dt); SN.attract.idleT = 0; return; }
    if (!game.paused && !(game.shell && game.shell.screen) && SN.attract.idle(dt, game.input) && !(UI.top() && (UI.top().id === 'results' || UI.top().id === 'credits'))) { game.go('attract', {}, { fade: 'wipe', seconds: .3 }); return; }
    if (game.shell && game.shell.screen) return;
    UI.update(dt, I);
  },
  draw(r) {
    const hg = R3.hangar; if (hg && hg.world) hg.world.draw(r);
    UI.draw(r); SN.story.draw(r); SN.dev.draw(r);
  }
};
const loadingScene = {
  enter(d) { this.cfg = d.cfg; this.t = 0; this.built = false; SN.audio.music(null); },
  update(dt) {
    this.t += dt;
    if (!this.built && this.t > .05) {
      const c = this.cfg, skin = c.mode === 'overclock' ? 'overclock' : 'normal';
      tw = R3.trackWorld(c.track, skin);
      race = F.makeRace(c, tw.T); R3.attach(tw, race);
      this.built = true;
    }
    if (this.built && this.t > .6) game.go('race', { race, cfg: this.cfg }, { fade: 'wipe', seconds: .25 });
  },
  draw(r) {
    const c = this.cfg, D = SN.TRACKS[c.track];
    r.overlay(g => {
      g.fillStyle = '#05040c'; g.fillRect(0, 0, r.W, r.H); g._c = null;
      const T = (s, x, y, col, o = {}) => E.font.text(g, s, x, y, col, Object.assign({ outline: '#05040c' }, o));
      E.font.title(g, D.name, r.W / 2, r.H / 2 - 40, { scale: 3, colors: ['#ffffff', '#9ff4ff', '#29c8e8'], align: 'center' });
      T(D.place, r.W / 2, r.H / 2 - 10, '#b8c4dc', { align: 'center' });
      T(SN.MODES[c.mode].label + ' · ' + (c.mode === 'overclock' ? 'OVERCLOCK SKIN' : c.cls), r.W / 2, r.H / 2 + 2, '#ffd36a', { align: 'center' });
      E.px.rect(g, r.W / 2 - 80, r.H / 2 + 20, 160, 4, '#1a1a2a'); E.px.rect(g, r.W / 2 - 80, r.H / 2 + 20, Math.round(160 * Math.min(1, this.t / .6)), 4, '#29c8e8');
      T(SN.STORY.tips[Math.floor((c.track.length + (c.mode || '').length)) % SN.STORY.tips.length], r.W / 2, r.H / 2 + 36, '#e8ecff', { align: 'center', wrap: r.W - 60 });
    });
  }
};
const openDev = () => { const sc = game.scene; devFromPause = true; if (sc) sc.pausable = false; SN.dev.open(race, () => { if (game.scene === raceScene) { raceScene.pausable = !HUBON; game.menu(); } }); };
const raceScene = {
  pausable: true,
  enter(d) {
    race = d.race; cfg = d.cfg; this.t = 0; resultsT = 0; toastT = 0; SN.hud.reset(); SN.audio.muted = false; freeCam = null;
    raceScene.pausable = true;
    const P = game.players;
    ctls = race.humans.map((s, i) => new SN.Controls(P[i] || game.input, i));
    cams = race.humans.map(() => { const c = new SN.ChaseCam(); c.mode = game.settings.defaultCam || 'chase'; return c; });
    tv = new SN.TVDirector(tw.T, tw.terrain);
    if (race.humans.length > 1) { game.splitScreen(2, { layout: 'rows' }); if (tw.world && tw.world.cameras.length < 2) tw.world.addCamera({ mode: 'fixed', far: 26000, near: 4 }); }
    // ghosts: time trial and hot lap
    ghostRec = (race.mode === 'timetrial' || race.mode === 'hotlap') && race.player ? SN.Ghost.recorder(race, race.player) : null; race.ghostRec = ghostRec;
    ghostShip = race.ships.find(s => s.ghost) || null; ghostData = null;
    if (ghostShip) { const k = race.track.id + '/' + race.cls + '/' + race.mode, gd = SN.save.data.ghosts[k]; ghostData = gd ? SN.Ghost.decode(gd) : null; ghostShip.hidden = true; }
    SN.audio.music(race.mode === 'overclock' ? 'overclock' : SN.TRACKS[race.track.id].song, { sync: true, restart: true, layers: ['pad', 'pad2', 'bass', 'sub'] });
    SN.audio.lastRadio = -99;
  },
  exit() { game.splitScreen(0); SN.audio.silenceHums(); game.timeScale = 1; SN.dev.isOpen = false; R3.hideShip = null; },
  update(dt) {
    const I = game.input;
    if (SN.dev.isOpen) { SN.dev.update(dt, I); if (tw.world) tw.world.step(0); return; }
    this.t += dt; toastT += dt;
    if (race.state === 'intro' && (I.pressed('confirm') || I.clicked())) { race.skipIntro(); I.consumeAll(); }
    // controls: each human's own input (a free camera parks the player's on autopilot)
    race.humans.forEach((s, i) => { const c = ctls[i].read(dt); if (SN.flags.freeCam && i === 0) { race.setControls(i, SN.AI.controls(s, race, { skill: 1, brain: 'free' })); } else race.setControls(i, c); if (c.camera) cycleCam(i); });
    race.step(dt);
    if (ghostRec && race.state === 'racing' && !race.player.finished) ghostRec.step(dt);
    if (ghostShip && ghostData) SN.Ghost.pose(ghostShip, ghostData, race.t, race.track);
    if (tw.world) SN.fx.events(race, tw.world);
    SN.audio.events(race); SN.hud.events(race); SN.hud.step(dt);
    for (const e of race.events) if (e.t === 'go') toastT = 0;
    // cameras
    const W = tw.world;
    race.humans.forEach((s, i) => {
      let pose;
      if (race.state === 'intro') pose = SN.introPose(race, race.stateT);
      else if ((race.state === 'finished' || race.state === 'results') && (s.finished || s.dnf) && race.humans.length === 1) pose = tv.update(race, dt, { target: s.dnf ? null : s });
      else if (SN.flags.freeCam && i === 0) { freeCam = freeCam || new SN.FreeCam(W ? W.camera.pose || { x: s.P[0], y: s.P[1], z: s.P[2] + 200, yaw: 0, pitch: -.3 } : { x: s.P[0], y: s.P[1], z: s.P[2] + 200, yaw: 0, pitch: -.3 }); pose = freeCam.update(I, dt); }
      else { const lb = ctls[i].out.lookBack; pose = cams[i].update(s, dt, race, { lookBack: lb, cut: race.state === 'grid' && race.stateT < .02 }); }
      if (W && W.cameras[i]) W.cameras[i].fixed = pose;
    });
    if (!SN.flags.freeCam) freeCam = null;
    R3.hideShip = cams[0] && cams[0].mode === 'cockpit' && race.state !== 'intro' && !(race.state === 'finished' && race.humans.length === 1) && race.humans.length === 1 ? race.humans[0] : null;
    if (W) { W.camera.target = race.player ? { x: race.player.P[0], y: race.player.P[1], z: race.player.P[2] } : null; W.step(dt); }
    SN.audio.humStep(race, race.player, W, dt, true);
    if (race.state === 'results') { resultsT += dt; if (resultsT > 1.2) { const O = F.outcome(race); game.go('results', { race, O }, { fade: 'wipe', seconds: .3 }); } }
  },
  draw(r) {
    if (tw.world) tw.world.draw(r);
    const vp = r.viewport, i = vp ? vp.i : 0, s = race.humans[i];
    if (tw.world) SN.debugDraw(tw.world, race);
    if (race.state === 'intro' && !vp) r.overlay(g => introCard(g, r));
    else if (s && race.state !== 'intro') SN.hud.draw(r, race, s, vp, { cockpit: cams[i] && cams[i].mode === 'cockpit' && !(race.state === 'finished' && race.humans.length === 1) });
    if (!vp) this.hud(r);
  },
  hud(r) {
    if (race.humans.length > 1 && race.state === 'countdown') r.overlay(g => { const n = 3 - Math.floor(race.stateT); if (n >= 1) E.font.title(g, String(n), r.W / 2, r.H / 2 - 20, { scale: 5, colors: ['#ffffff', '#ff6b6b'], align: 'center' }); });
    if (toastT < 4 && race.state === 'racing' && SN.audio.songId) r.overlay(g => { const s = SN.audio.nowPlaying(SN.audio.songId), w = E.font.width(s) + 12, k = toastT < .3 ? toastT / .3 : toastT > 3.5 ? (4 - toastT) * 2 : 1; UI.panel(g, r.W / 2 - w / 2, 22 - (1 - k) * 10, w, 13, '#05040c', .7 * k, '#ff3ab4'); E.font.text(g, s, r.W / 2 - w / 2 + 6, 25 - (1 - k) * 10, '#ffffff', { outline: false }); });
    if (race.state === 'finished' && race.humans.every(h => h.finished || h.dnf)) r.overlay(g => E.font.text(g, race.player && race.player.dnf ? 'ELIMINATED · SPECTATING' : 'RACE COMPLETE · SPECTATING', r.W / 2, r.H - 66, '#ffd36a', { align: 'center', outline: '#05040c' }));
    SN.dev.draw(r);
  }
};
function introCard(g, r) {
  const D = SN.TRACKS[race.track.id], T = (s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o)), k = Math.min(1, race.stateT / .4);
  UI.panel(g, 0, r.H - 74, r.W * k, 50, '#05040c', .7, '#29c8e8');
  E.font.title(g, D.name, 12, r.H - 68, { scale: 3, colors: ['#ffffff', '#9ff4ff', '#29c8e8'] });
  T(D.place + ' · ' + D.lengthKm.toFixed(2) + ' KM · ' + (race.rules.target ? 'FIRST TO ' + race.rules.target : race.rules.endRun ? SN.MODES[race.mode].label : race.laps + ' LAPS') + ' · ' + race.cls, 12, r.H - 42, '#ffd36a');
  SN.glyph.bar(g, [['confirm', 'SKIP']], r.W - 8, r.H - 16, { right: true });
}
const resultsScene = {
  enter(d) {
    this.race = d.race; this.O = d.O; this.t = 0; this.cleared = false; R3.hangarWorld(); SN.audio.silenceHums();
    const pl = d.race.player, top3 = pl && !d.race.rules.solo && d.O.mine && d.O.mine.place <= 3 && !pl.dnf;
    this.podium = top3;
    if (top3) { R3.podiumPilots(d.O.res.slice(0, 3).map(x => x.pilot), d.O.mine.place - 1); SN.audio.sting(d.O.mine.place === 1 ? 'win' : 'podium'); }
    else if (R3.hangar && R3.hangar.world) R3.hangar.world.reset();
    if (d.O.medal) SN.audio.sting('medal');
    if (d.O.unlocks.length) SN.audio.sting('unlock');
    SN.audio.music('zero', { layers: ['pad', 'pad2', 'arp'] });
    UI.reset(SN.screens.results(d.race, d.O));
  },
  update(dt) {
    this.t += dt; hangarCam(dt, { podium: this.podium && this.t < 4.5 });
    if (this.podium && this.t >= 4.5 && !this.cleared) { this.cleared = true; if (R3.hangar && R3.hangar.world) R3.hangar.world.reset(); }
    if (this.podium && this.t < 4.5) { if (Math.random() < .5 && R3.hangar && R3.hangar.world) game.particles.bits(20 * U + (Math.random() - .5) * 160, 17 * U + (Math.random() - .5) * 40, 110, 2, ['#ffd23f', '#ff3ab4', '#7af0ff', '#ffffff']); if (game.input.pressed('confirm') || game.input.clicked()) { this.t = 4.5; game.input.consumeAll(); } return; }
    if (SN.dev.isOpen) { SN.dev.update(dt, game.input); UI.tick(dt); return; }
    if (SN.story.update(dt, game.input)) { UI.tick(dt); return; }
    UI.update(dt, game.input);
  },
  draw(r) {
    const hg = R3.hangar; if (hg && hg.world) hg.world.draw(r);
    if (this.podium && this.t < 4.5) { r.overlay(g => { E.font.title(g, 'PODIUM', r.W / 2, 14, { scale: 3, colors: ['#ffffff', '#ffd23f'], align: 'center' }); const names = this.O.res.slice(0, 3); names.forEach((x, k) => E.font.text(g, (k + 1) + '. ' + x.name, r.W / 2, r.H - 52 + k * 11, k === 0 ? '#ffd23f' : '#ffffff', { align: 'center', outline: '#05040c' })); SN.glyph.bar(g, [['confirm', 'SKIP']], r.W - 8, r.H - 16, { right: true }); }); return; }
    UI.draw(r); SN.story.draw(r); SN.dev.draw(r);
  }
};
const replayScene = {
  enter(d) {
    this.src = d.race; this.R = SN.Replay.play(d.race.recording); this.speed = 1; this.paused = false; this.camMode = 'tv'; this.follow = this.R.player || this.R.ships[0]; this.done = false; this.desync = false;
    tw = R3.trackWorld(d.race.track.id, d.race.mode === 'overclock' ? 'overclock' : 'normal'); R3.attach(tw, this.R);
    this.tv = new SN.TVDirector(tw.T, tw.terrain); this.cam = new SN.ChaseCam(); SN.hud.reset();
    SN.audio.music(d.race.mode === 'overclock' ? 'overclock' : SN.TRACKS[d.race.track.id].song, { layers: 'all' });
  },
  exit() { SN.audio.silenceHums(); },
  update(dt) {
    const I = game.input, R = this.R;
    if (I.pressed('cancel')) { I.consumeAll(); game.go('results', { race: this.src, O: F.outcome(this.src) }, { fade: 'wipe', seconds: .25 }); return; }
    if (I.pressed('confirm')) this.paused = !this.paused;
    if (I.pressed('tabR')) this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 4;
    if (I.pressed('tabL')) this.speed = this.speed === 4 ? 2 : 1;
    if (I.pressed('camera') || I.pressed('more')) { const M = ['tv', 'chase', 'cockpit', 'heli']; this.camMode = M[(M.indexOf(this.camMode) + 1) % 4]; this.cam.reset(); }
    const c = I.clicked();
    if (c) {
      const L = this._chips || []; const ch = L.find(q => c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]);
      if (ch) ch.fn(); else if (tw.world) { let best = null, bd = 18; for (const s of R.ships) { if (s.hidden || s.drone) continue; const q = tw.world.project(s.P[0], s.P[1], s.P[2] + 8); if (q) { const d2 = Math.hypot(q[0] - c[0], q[1] - c[1]); if (d2 < bd) { bd = d2; best = s; } } } if (best) { this.follow = best; this.camMode = this.camMode === 'tv' ? 'chase' : this.camMode; } }
      I.consumeAll();
    }
    if (!this.paused && !this.done) for (let k = 0; k < this.speed; k++) { R.replay.run(dt); if (R.replay.done) { this.done = true; this.desync = !R.replay.ok; break; } }
    if (tw.world) SN.fx.events(R, tw.world);
    const W = tw.world; let pose;
    if (this.camMode === 'tv') pose = this.tv.update(R, dt, { target: this.follow });
    else if (this.camMode === 'heli') { const s = this.follow; pose = SN.poseFrom([s.P[0] - s.F[0] * 900, s.P[1] - s.F[1] * 900, s.P[2] + 640], s.P, SN.ZUP, 50); }
    else { this.cam.mode = this.camMode === 'cockpit' ? 'cockpit' : 'chase'; pose = this.cam.update(this.follow, dt, R); }
    if (W) { W.camera.fixed = pose; W.step(this.paused ? 0 : dt); }
    SN.audio.humStep(R, this.follow, W, dt, !this.paused);
  },
  draw(r) {
    if (tw.world) tw.world.draw(r);
    r.overlay(g => {
      const T = (s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o)), R = this.R;
      UI.panel(g, r.W / 2 - 34, 4, 68, 14, '#ff3ab4', .9, '#ffffff'); T('REPLAY', r.W / 2, 7, '#05040c', { align: 'center', outline: false });
      T(SN.fmtTime(R.t) + '  ' + (this.follow ? this.follow.name : ''), 8, 8, '#ffffff', { scale: 1 });
      this._chips = []; const chip = (label, on, fn, x) => { const w = E.font.width(label) + 10; UI.panel(g, x, 22, w, 13, on ? '#163a5a' : '#0c1020', .9, on ? '#ffffff' : '#29c8e8'); T(label, x + 5, 25, '#ffffff', { outline: false }); const q = [x, 22, w, 13]; q.fn = fn; this._chips.push(q); return x + w + 4; };
      let x = 8; for (const sp of [1, 2, 4]) x = chip('×' + sp, this.speed === sp, () => { this.speed = sp; }, x);
      x = chip(this.paused ? 'PLAY' : 'PAUSE', this.paused, () => { this.paused = !this.paused; }, x + 6);
      chip('CAM: ' + this.camMode.toUpperCase(), false, () => { const M = ['tv', 'chase', 'cockpit', 'heli']; this.camMode = M[(M.indexOf(this.camMode) + 1) % 4]; }, x + 6);
      if (this.done) T(this.desync ? 'REPLAY DESYNC' : 'END OF REPLAY', r.W / 2, r.H / 2, this.desync ? '#ff6b6b' : '#ffd36a', { scale: 2, align: 'center' });
      T('CLICK A CRAFT TO FOLLOW IT', 8, r.H - 34, '#7a8aa8', { font: 'tiny' });
      SN.glyph.bar(g, [['confirm', this.paused ? 'PLAY' : 'PAUSE'], ['tabL', ''], ['tabR', 'SPEED'], ['camera', 'CAMERA'], ['cancel', 'EXIT']], r.W - 8, r.H - 18, { right: true });
    });
  }
};
const attractScene = {
  enter() { SN.attract.start(0); SN.hud.reset(); game.input.consumeAll(); this.t = 0; },
  exit() { SN.audio.silenceHums(); },
  update(dt) {
    this.t += dt; const I = game.input;
    if (this.t > .3 && SN.attract.anyInput(I)) { I.consumeAll(); SN.attract.idleT = 0; game.go('title', {}, { fade: 0 }); return; }
    SN.attract.step(dt);
  },
  draw(r) { SN.attract.draw(r); }
};
const sessionScene = {
  enter() {
    const H = SN.hub; SN.hud.reset();
    if (!H.info) { this.off = true; game.go('title', {}, { fade: 0 }); return; }
    this.off = false;
    // the world and the race were built as the session joined (ready() already called); the shaders build during the card
    if (!race || race.mode !== 'hub') { tw = R3.trackWorld(H.event.track); race = H.makeRace(tw); R3.attach(tw, race, { prepare: false }); }
    cfg = { mode: 'hub' }; this.prepT = 0;
    ctls = [new SN.Controls(game.input, 0)]; cams = [new SN.ChaseCam()]; tv = new SN.TVDirector(tw.T, tw.terrain);
    SN.audio.music(SN.TRACKS[H.event.track].song, { layers: ['pad', 'pad2', 'bass', 'sub'] });
    if (!H.readyCalled) { H.readyCalled = true; AIHub.ready(); }
  },
  update(dt) {
    if (this.off || !race) return;
    const H = SN.hub, I = game.input, W = tw.world;
    if (H.ended) { if (W) W.step(0); return; }
    if (!H.started) {
      if (!tw._prepared && (this.prepT = (this.prepT || 0) + dt) > .1 && tw.world) { tw.world.prepare(); tw._prepared = true; }
      H.cardInput(I, game.r);
      const g0 = race.track.grid[0], fr = race.track.frameAt(g0.s), eye = race.track.point(g0.s + 40 * U, 10 * U * Math.sin(game.real * .2), 9 * U), look = race.track.point(race.track.grid[7].s, 0, 2 * U);
      if (W) { W.camera.fixed = SN.poseFrom(eye, look, SN.ZUP, 55); W.step(dt); }
      return;
    }
    const c = ctls[0].read(dt); race.setControls(0, c); if (c.camera) cycleCam(0);
    race.step(dt); H.step(race, dt);
    if (W) SN.fx.events(race, W); SN.audio.events(race, { radio: false }); SN.hud.events(race); SN.hud.step(dt);
    const s = race.player; let pose = s.finished ? tv.update(race, dt, { target: s }) : cams[0].update(s, dt, race, { lookBack: ctls[0].out.lookBack });
    if (W) { W.camera.fixed = pose; W.camera.target = { x: s.P[0], y: s.P[1], z: s.P[2] }; W.step(dt); }
    SN.audio.humStep(race, s, W, dt, true);
  },
  draw(r) {
    const H = SN.hub; if (this.off || !race) return;
    // the card is drawn in 2D (the circuit's outline, the players): the copies of a round may share one page's thread
    // while they connect, so the 3D world (its shaders, its terrain) first draws when the round starts
    if (!H.started) { r.overlay(g => H.drawCard(g, r)); return; }
    if (tw.world) tw.world.draw(r);
    SN.hud.draw(r, race, race.player, null);
    if (H.ended) r.overlay(g => {
      UI.panel(g, r.W / 2 - 110, r.H / 2 - 50, 220, 100, '#05040c', .9, '#29c8e8');
      E.font.title(g, 'ROUND OVER', r.W / 2, r.H / 2 - 42, { scale: 3, colors: ['#ffffff', '#7af0ff'], align: 'center' });
      const st = (H.endInfo && H.endInfo.standings) || [], names = id => { const p = (H.info.players || []).find(q => q.id === id); return p ? p.name : '?'; };
      st.slice(0, 4).forEach((grp, k) => E.font.text(g, (k + 1) + '. ' + [].concat(grp).map(names).join(', '), r.W / 2, r.H / 2 - 8 + k * 11, '#ffffff', { align: 'center', outline: '#05040c' }));
    });
  }
};

/* ---- the debug handle (tests, tools/check.mjs) ---- */
game.debug = {
  snapshot() {
    const R = game.sceneName === 'attract' ? SN.attract.race : game.sceneName === 'title' ? titleRace : game.sceneName === 'replay' ? replayScene.R : race;
    const sh = s => ({ id: s.id, name: s.name, p: Math.round(s.p), s: Math.round(s.s), u: Math.round(s.u), h: Math.round(s.h), v: Math.round(s.speed), kmh: Math.round(s.kmh), energy: Math.round(s.energy * 10) / 10, lap: s.lap, place: s.place, weapon: s.weapon, airborne: !s.grounded, finished: s.finished, elim: s.elim, points: s.points, control: s.control });
    return { scene: game.sceneName, screen: UI.top() ? UI.top().id : null, focus: UI.top() ? UI.top().focus : null, state: R && R.state, mode: R && R.mode, track: R && R.track.id, cls: R && R.cls, t: R ? +R.t.toFixed(3) : 0,
      ships: R ? R.ships.map(sh) : [], player: R && R.player ? sh(R.player) : null, hudCallouts: (SN.hud.views[0] || { callouts: [] }).callouts.map(c => c.text), device: game.input.lastDevice, attract: game.sceneName === 'attract', dev: SN.dev.isOpen,
      story: SN.story.active, season: { medals: SN.save.data.medals, unlocked: SN.save.data.unlocked, gp: SN.save.data.gp }, hub: { active: SN.hub.active, connected: !!SN.hub.info, sent: SN.hub.sent, progressCount: SN.hub.progressCount, started: SN.hub.started, ended: SN.hub.ended },
      zone: R && R.zone, backend: E.World3D ? E.World3D.backend : 'none', paused: game.paused, splits: game._split ? game._split.vps.length : 1 };
  },
  teleport(s, u = 0, v = 0) { if (race) SN.debugTeleport(race, s, u, v); },
  give(w) { if (race && race.player) race.weapons.give(race.player, w); },
  setEnergy(x) { if (race && race.player) race.player.energy = x; },
  finishNow() { if (race) race.endRun(); },
  events: () => race ? race.events.slice() : [],
  race: () => race, track: () => race && race.track, tune: SN.Tune, cfg: () => cfg, cams: () => cams, ctls: () => ctls, tw: () => tw
};

game.start({ scenes: { title: titleScene, front: frontScene, loading: loadingScene, race: raceScene, results: resultsScene, replay: replayScene, attract: attractScene, session: sessionScene },
  scene: HUBON ? 'session' : 'title', boot });
if (HUBON) { const g0 = game.go.bind(game); game.booted && game.booted.then && game.booted.then(() => { if (!SN.hub.info && game.sceneName === 'session') g0('title'); }); }
})();
