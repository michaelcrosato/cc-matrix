// CRACKMANIA: the game's scenes, HUD, profile and boot. Built on the 2D engine's shell (E.Game scenes, menus, pause,
// settings) and the 3D engine's world (terrain, sky, the pen for code-drawn parts, the camera).
import { U, add, sub, norm } from './lib/vec.js';
import { buildTrack } from './track/turtle.js';
import { TrackScene } from './track/scene.js';
import { makeCar, TUNE } from './car/sim.js';
import { drawCar, drawGate } from './car/draw.js';
import { makeBot, botControls } from './race/bot.js';
import { Run, ghostAt, STEP_HZ } from './race/run.js';
import { TRACKS } from './data/tracks.js';
import { SLIDERS, sliderText, nudge, resetTuning } from './config.js';
import { ABOUT, COCO } from './data/text.js';
import { PAINTS, RIVALS, GAUNTLET, coppersFor, rankRound } from './modes.js';
import { activeHub, roundTrack, attach, poseMessage } from './online.js';
import { ENVIRONMENTS, handlingFor } from './data/environments.js';
import { engineSound, babble } from './sound.js';
import { PUZZLES, PIECES } from './data/editor.js';
import { newEditor, canAdd, addPiece, undo, clear, programFor, solved, makeRoadStore, SLOTS } from './editor.js';

const BEATS = {
  first: { name: 'COCO', lines: ['You finished a road! That is how it starts.', 'Every road has a clock. Yours is the only one that matters.'] },
  guild: { name: 'COCO', lines: ['Tex Mirage, Mlle Gravillon and Bobo Yeti: the Ghost Guild.', 'Finish first or second on every road to go on. Good luck, racer!'] },
  cleared: { name: 'COCO', lines: ['The gauntlet is yours! The Ghost Guild bows.', 'Every road, every rival, one clean run at a time.'] },
  out: { name: 'COCO', lines: ['Third place is out, racer. Not the end of the story.', 'Try the gauntlet again, or ask the Guild for a rematch in the garage.'] },
};
const INTRO = ['Hello! I am Coco Asphalte, the track architect.', 'Race the roads, beat the clock, and keep your ghost honest.', 'Pause, then Dev Mode, to tune the car. Have fun!'];

const SKY = ["#3f7fd0", "#f5dcae"];
const PROFILE_KEY = 'crackmania.profile.v1';
const MEDAL_LETTERS = ['B', 'S', 'G', 'A'], MEDAL_NAMES = ['BRONZE', 'SILVER', 'GOLD', 'AUTHOR'];
const ATTRACT_IDLE = 10;   // seconds without input on the title before the attract demo

/** builds the game; returns { game, api } (api is for the headless tests) */
export function createGame(E, { headless = false } = {}) {
  const W3 = E.World3D;
  const INPUT = Object.assign({}, E.Input.DEFAULT, {
    gas: ['KeyW', 'ArrowUp', 'Pad7', 'Pad0'], brake: ['KeyS', 'ArrowDown', 'Pad6', 'Pad2'],
    respawn: ['Enter', 'Backspace', 'Pad1'], restart: ['Delete', 'KeyR', 'Pad3'], camera: ['KeyC', 'Pad5'], ghost: ['KeyG', 'Pad4'],
  });
  const S = {
    world: null, track: null, race: null, cars: [], demo: null, demoIdx: 0, idle: 0, orbitT: 0, camEye: null, res: null,
    resultsSent: false, showGhost: true, dev: { open: false, row: 0, bot: false }, medals: {}, touchOnly: false, menu: null,
    page: 0, mode: null, replay: null, hot: null, sel: 0, remote: {}, session: null,
  };
  const game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, bg: null, input: INPUT, headless,
    menu: {
      settings: W3.SETTINGS,
      items: [['Respawn', () => S.race && S.race.respawn()], ['Restart', () => S.race && S.race.restart()], ['Dev Mode', openDev]],
    },
  });
  const A = game.audio;

  // ---- profile: best times and their ghosts, coppers, the paint, kept in the browser's storage ----
  const memory = {};
  const storage = {
    load() { try { return Object.assign({ best: {}, coppers: 0, paint: 'ember', owned: ['ember'] }, JSON.parse(globalThis.localStorage.getItem(PROFILE_KEY))); } catch (e) { return Object.assign({ best: {}, coppers: 0, paint: 'ember', owned: ['ember'] }, memory.p); } },
    save(p) { memory.p = p; try { globalThis.localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* no storage: kept for the visit */ } },
  };
  S.profile = storage.load();
  const bestOf = id => S.profile.best[id] || null;
  const paintBody = () => (PAINTS.find(p => p.id === S.profile.paint) || PAINTS[0]).body;
  /** keeps a run if it beats the best; returns true when it did */
  function recordBest(id, ms, ghost) {
    const b = S.profile.best[id];
    if (b && ms >= b.ms) return false;
    S.profile.best[id] = { ms, ghost };
    storage.save(S.profile);
    return true;
  }

  // ---- the world: one desert; roads are laid into it one at a time ----
  function makeWorld() {
    S.worlds = {};
    for (const [id, env] of Object.entries(ENVIRONMENTS)) {
      const w = new W3(game, {
        terrain: { height: () => -60 * U, color: () => env.ground },
        sky: env.sky, fog: { color: env.fog, near: 1400, far: 7200 }, camera: { far: 9000 },
        onDraw: x => drawFrame(x),
      });
      w.prepare();
      S.worlds[id] = w;
    }
    S.world = S.worlds.DUSTBOWL;
  }
  function drawFrame(w) {
    const t = S.track;
    if (!t || w !== S.world) return;
    const pen = w.pen;
    t.T.gates.forEach((g, k) => drawGate(pen, t.T, g.i, k === t.T.gates.length - 1, w.time));
    drawBoost(pen, t.T, w.time);
    for (const c of S.cars) drawCar(pen, c.run.car, c.body, c.glass);
    const ref = S.race || S.demo;
    const gh = ref && ref.ghost && S.showGhost ? ghostAt(ref.ghost, ref.steps) : null;
    if (gh) drawCar(pen, { p: gh.p, f: gh.f, u: gh.u }, '#8fd3ff', '#e6f6ff');
    if (S.session && S.session.info) for (const id of Object.keys(S.remote)) {
      const pl = S.session.info.players.find(q => String(q.id) === id), m = S.remote[id];
      if (pl && m) drawCar(pen, { p: m.p, f: m.f, u: m.u }, pl.color, '#e6f6ff');
    }
    if (S.replay) { const p = ghostAt({ frames: S.replay.frames }, S.replay.steps); if (p) drawCar(pen, { p: p.p, f: p.f, u: p.u }, paintBody(), '#f3ede0'); }
  }
  /** chevrons march along each boost strip, one every 6 m, in the road's own frame */
  function drawBoost(pen, T, time) {
    const phase = (time * 1.6) % 1;
    for (let i = 0; i < T.n; i += 6) {
      if (!T.Boost[i]) continue;
      const k = Math.min(T.n - 1, i + Math.round(phase * 6));
      const P = T.P[k].map(v => v * U), up = T.U[k];
      pen.frame(P[0] + up[0] * .1 * U, P[1] + up[1] * .1 * U, P[2] + up[2] * .1 * U, T.F[k], T.R[k], up, 1);
      pen.box(0, 0, .02 * U, 1.2 * U, 6 * U, .05 * U, '#ffb02e');
    }
  }
  function loadTrack(def) {
    if (S.track) S.track.scene.dispose();
    S.world = S.worlds[def.env];
    const T = buildTrack(def.program);
    S.track = { def, T, scene: new TrackScene(S.world, T) };
    return S.track;
  }
  function newRun(ghost, skill = 1) {
    const run = new Run(S.track.T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), { ghost: ghost || null, tune: handlingFor(S.track.def.env, TUNE) });
    run.bot = makeBot(S.track.T, skill);
    return run;
  }

  // ---- cameras ----
  function chaseCamera(dt, c) {
    const want = add(add(c.p, c.f, -11 * U), c.u, 4.2 * U);
    S.camEye = S.camEye && dt > 0 ? S.camEye.map((v, k) => v + (want[k] - v) * Math.min(1, dt * 14)) : want.slice();
    const d = norm(sub(add(c.p, c.f, 7 * U), S.camEye));
    S.world.camera.set('fixed');
    S.world.camera.fixed = { x: S.camEye[0], y: S.camEye[1], z: S.camEye[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.asin(Math.max(-1, Math.min(1, d[2]))), fov: 68, up: c.u };
  }
  function orbitCamera(c) {
    const a = S.orbitT * .16;
    const eye = [c.p[0] + Math.cos(a) * 26 * U, c.p[1] + Math.sin(a) * 26 * U, c.p[2] + 9 * U];
    const d = norm(sub(c.p, eye));
    S.world.camera.set('fixed');
    S.world.camera.fixed = { x: eye[0], y: eye[1], z: eye[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.asin(d[2]), fov: 62, up: c.u };
  }

  // ---- helpers ----
  const fmt = ms => { const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, cs = Math.floor((ms % 1000) / 10); return m + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0'); };
  const signed = ms => (ms >= 0 ? '+' : '−') + (Math.abs(ms) / 1000).toFixed(2);
  const medalFor = (id, ms) => {
    const m = S.medals[id];
    if (!m) return null;
    if (ms <= m.author) return 3;
    if (ms <= m.gold) return 2;
    if (ms <= m.silver) return 1;
    if (ms <= m.bronze) return 0;
    return null;
  };
  const controls = () => {
    const I = game.input, mv = I.move();
    return { steer: Math.abs(mv[0]) > .02 ? mv[0] : 0, gas: Math.max(I.analog('gas'), I.down('gas') ? 1 : 0), brake: Math.max(I.analog('brake'), I.down('brake') ? 1 : 0) };
  };
  function sound(e) {
    if (e === 'go') A.sfx('confirm');
    else if (e.startsWith('count')) A.sfx('blip');
    else if (e === 'gate') A.sfx('pickup');
    else if (e === 'finish') A.sfx('powerup');
    else if (e === 'respawn') A.sfx('warp');
    else if (e === 'boost') A.sfx('swing');
  }
  /** the prompt bar along the bottom: glyph labels from the input in use */
  function prompt(r, items) {
    r.overlay(g => {
      let x = 10;
      for (const [a, word] of items) {
        const t = game.input.label(a) + ' ' + word;
        E.font.text(g, t, x, r.H - 12, '#fff3d0', { shadow: '#000', outline: false });
        x += E.font.width(t) + 14;
      }
    });
  }
  /** Coco talks: babble for each line, scheduled on the game's clock */
  const speak = text => babble(A, text, (fn, at) => (at > 0 ? game.after(at, fn) : fn()));
  /** a one-time talk for a story beat: shown once per profile, then remembered */
  function beat(id) {
    S.profile.beats = S.profile.beats || {};
    if (S.profile.beats[id]) return false;
    const b = BEATS[id];
    S.talk = new E.Dialog(game);
    S.talk.say(b.lines, { name: b.name, onDone: () => { S.profile.beats[id] = true; storage.save(S.profile); } });
    speak(b.lines[0]);
    return true;
  }
  function touchOnlyDevice() {
    try { return !matchMedia('(any-pointer: fine)').matches && !matchMedia('(any-hover: hover)').matches; } catch (e) { return false; }
  }

  // ---- medals: the bot's clean run on each road is the Author time ----
  function bakeMedals() {
    for (const t of TRACKS) {
      const T = buildTrack(t.program), scene = new TrackScene(S.worlds[t.env], T);
      const run = new Run(T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), {}), bot = makeBot(T, 1), dt = 1 / STEP_HZ;
      for (let n = 0; run.phase !== 'done' && n < STEP_HZ * 600; n++) run.step(dt, run.phase === 'run' ? botControls(run.car, bot) : { steer: 0, gas: 0, brake: 0 }, scene);
      const author = Math.ceil(run.ms() / 10) * 10;
      S.medals[t.id] = { author, gold: Math.ceil(author * 1.08 / 10) * 10, silver: Math.ceil(author * 1.25 / 10) * 10, bronze: Math.ceil(author * 1.6 / 10) * 10 };
      scene.dispose();
    }
  }

  // ---- the demo: the bot drives the roads in turn (the title's backdrop and attract mode) ----
  function startDemo() {
    loadTrack(TRACKS[S.demoIdx % TRACKS.length]);
    S.demo = newRun(null);
    S.demo.phase = 'run';
    S.camEye = null;
    S.cars = [{ run: S.demo, body: '#e0532a', glass: '#f3ede0' }];
  }
  function stepDemo(dt, cycle) {
    if (!S.demo) startDemo();
    const run = S.demo;
    S.orbitT += dt;
    run.step(dt, botControls(run.car, run.bot), S.track.scene);
    if (run.phase === 'done' || run.steps > STEP_HZ * 90) {
      if (cycle) S.demoIdx = (S.demoIdx + 1) % TRACKS.length;
      startDemo();
    }
    orbitCamera(S.demo.car);
    S.world.step(dt);
  }

  // ---- dev mode: live sliders over the race; the bot can drive on request ----
  function openDev() { S.dev.open = true; S.dev.row = 0; game.resume(); }
  function devRows() {
    return SLIDERS.map(s => ({ kind: 'slider', s })).concat([
      { kind: 'toggle', label: 'Bot drives' }, { kind: 'button', key: 'respawn', label: 'Respawn' },
      { kind: 'button', key: 'restart', label: 'Restart' }, { kind: 'button', key: 'reset', label: 'Reset to defaults' }, { kind: 'button', key: 'close', label: 'Close' }]);
  }
  const DEV_ROW_Y = 30, DEV_ROW_H = 10, DEV_BAR = { x0: 124, x1: 200 };
  function devUpdate() {
    const I = game.input, rows = devRows(), row = rows[S.dev.row];
    const c = I.clicked();
    if (c) {
      const i = Math.floor((c[1] - DEV_ROW_Y + 4) / DEV_ROW_H);
      if (i >= 0 && i < rows.length && c[0] > 8) {
        S.dev.row = i;
        const hit = rows[i];
        if (hit.kind === 'slider' && c[0] >= DEV_BAR.x0 - 4 && c[0] <= DEV_BAR.x1 + 4) {
          const f = Math.max(0, Math.min(1, (c[0] - DEV_BAR.x0) / (DEV_BAR.x1 - DEV_BAR.x0)));
          const v = hit.s.min + f * (hit.s.max - hit.s.min);
          TUNE[hit.s.key] = +(Math.round((v - hit.s.min) / hit.s.step) * hit.s.step + hit.s.min).toFixed(6);
          TUNE[hit.s.key] = Math.max(hit.s.min, Math.min(hit.s.max, TUNE[hit.s.key]));
        } else if (hit.kind === 'toggle') S.dev.bot = !S.dev.bot;
        else if (hit.kind === 'button') {
          if (hit.key === 'respawn' && S.race) S.race.respawn();
          if (hit.key === 'restart' && S.race) S.race.restart();
          if (hit.key === 'reset') resetTuning();
          if (hit.key === 'close') S.dev.open = false;
        }
      }
    }
    if (I.pressed('cancel') || I.pressed('pause')) { S.dev.open = false; return; }
    if (I.repeat('up', .3, .09)) S.dev.row = (S.dev.row + rows.length - 1) % rows.length;
    if (I.repeat('down', .3, .09)) S.dev.row = (S.dev.row + 1) % rows.length;
    if (row.kind === 'slider') { if (I.repeat('left', .3, .05)) nudge(row.s, -1); if (I.repeat('right', .3, .05)) nudge(row.s, 1); }
    if (row.kind === 'toggle' && (I.pressed('confirm') || I.pressed('left') || I.pressed('right'))) S.dev.bot = !S.dev.bot;
    if (row.kind === 'button' && I.pressed('confirm')) {
      if (row.key === 'respawn' && S.race) S.race.respawn();
      if (row.key === 'restart' && S.race) S.race.restart();
      if (row.key === 'reset') resetTuning();
      if (row.key === 'close') S.dev.open = false;
    }
  }
  function devDraw(r) {
    const rows = devRows();
    r.overlay(g => {
      E.ui.box(g, 6, 6, Math.min(r.W - 12, 240), r.H - 22, { bg: ['#2a1a22', '#120c12'], border: '#ffd36a', alpha: .93 });
      E.font.text(g, 'DEV MODE', 14, 10, '#ffd36a', { scale: 2, shadow: '#000', outline: false });
      rows.forEach((row, i) => {
        const y = 30 + i * 10, sel = i === S.dev.row, col = sel ? '#fff8dc' : '#d8c8b0';
        if (sel) E.font.text(g, '>', 10, y, '#ffffff', { shadow: '#000', outline: false });
        E.font.text(g, row.kind === 'slider' ? row.s.label : row.kind === 'toggle' ? row.label + ': ' + (S.dev.bot ? 'ON' : 'OFF') : row.label, 20, y, col, { shadow: '#000', outline: false });
        if (row.kind === 'slider') {
          E.ui.bar(g, DEV_BAR.x0, y, DEV_BAR.x1 - DEV_BAR.x0, 5, (TUNE[row.s.key] - row.s.min) / (row.s.max - row.s.min), '#ffd36a');
          E.font.text(g, sliderText(row.s), 236, y, '#bff8ff', { align: 'right', shadow: '#000', outline: false });
        }
      });
    });
  }

  // ---- the race's ends: a road's finish (results), a survival round, a hot seat turn ----
  function finishRace() {
    const run = S.race, def = S.track.def, ms = run.ms();
    if (S.puzzle) {
      const ok = solved(S.puzzle, S.track.T.length, true);
      if (ok) { S.profile.puzzles = S.profile.puzzles || {}; S.profile.puzzles[S.puzzle.id] = true; storage.save(S.profile); }
      game.after(1.2, () => game.go('results', { puzzle: S.puzzle, solved: ok, ms, respawns: run.respawns }));
      return;
    }
    if (S.mode && S.mode.kind === 'survival') return finishSurvivalRound(ms);
    if (S.mode && S.mode.kind === 'hotseat') return finishHotSeatTurn(ms);
    const best = bestOf(def.id), medalNow = medalFor(def.id, ms);
    const earned = coppersFor(medalNow, best ? medalFor(def.id, best.ms) : null);
    const newBest = recordBest(def.id, ms, { frames: run.recorded, splits: run.splits.slice() });
    S.profile.coppers += earned; storage.save(S.profile);
    game.after(1.2, () => game.go('results', { track: def, ms, medal: medalNow, best: best ? best.ms : 0, newBest: newBest || !best, respawns: run.respawns, earned }));
  }
  function startSurvival(round = 0) {
    S.mode = { kind: 'survival', round, out: false };
    startSurvivalRound();
  }
  function startSurvivalRound() {
    const m = S.mode, def = GAUNTLET[m.round];
    loadTrack(def);
    S.race = newRun(null);
    S.rivals = RIVALS.map(r => ({ ...r, run: newRun(null, r.skill) }));
    S.cars = [{ run: S.race, body: paintBody(), glass: '#f3ede0' }].concat(S.rivals.map(r => ({ run: r.run, body: r.body, glass: '#2b2b33' })));
    S.camEye = null; S.resultsSent = false;
  }
  function finishSurvivalRound(ms) {
    const m = S.mode;
    const entries = [{ name: 'You', finished: true, ms, progress: 1e9, you: true }].concat(S.rivals.map(r => ({ name: r.name, finished: r.run.finished, ms: r.run.ms(), progress: r.run.progress })));
    const ranked = rankRound(entries), place = ranked.findIndex(e => e.you) + 1;
    m.place = place; m.ranked = ranked;
    S.resultsSent = true;
    game.after(1.5, () => {
      if (place <= 2 && m.round + 1 < GAUNTLET.length) { m.round++; startSurvivalRound(); game.note('ROUND ' + (m.round + 1) + ' · ' + GAUNTLET[m.round].name); }
      else { S.beatNext = place <= 2 ? 'cleared' : 'out'; game.go('results', { survival: true, place, round: m.round, cleared: place <= 2 && m.round + 1 === GAUNTLET.length, out: place > 2, ranked }); }
    });
  }
  function startHotSeat(n) {
    S.hot = { players: Array.from({ length: n }, (_, i) => 'PLAYER ' + (i + 1)), road: 0, turn: 0, times: Array.from({ length: n }, () => []) };
    S.mode = { kind: 'hotseat' };
    startHotSeatTurn();
  }
  function startHotSeatTurn() {
    const h = S.hot, def = CUP[h.road];
    loadTrack(def);
    S.race = newRun(null);
    S.cars = [{ run: S.race, body: paintBody(), glass: '#f3ede0' }];
    S.camEye = null; S.resultsSent = false;
  }
  function finishHotSeatTurn(ms) {
    const h = S.hot;
    h.times[h.turn].push(ms);
    S.resultsSent = true;
    game.after(1.2, () => {
      h.turn++;
      if (h.turn >= h.players.length) { h.turn = 0; h.road++; }
      if (h.road >= CUP.length) { game.go('results', { hotseat: true, standings: standings() }); return; }
      startHotSeatTurn();
      game.note(h.players[h.turn] + ' · ' + CUP[h.road].name);
    });
  }
  const CUP = TRACKS.slice(0, 3);
  function standings() {
    const h = S.hot;
    return h.players.map((name, i) => ({ name, total: h.times[i].reduce((a, b) => a + b, 0), roads: h.times[i].length }))
      .sort((a, b) => a.total - b.total);
  }

  // ---- menus (made before boot, so the scenes can use them) ----
  const roads = makeRoadStore();
  const menus = {
    title: new E.Menu(game, ['RACE', 'SURVIVAL', 'HOT SEAT', 'BUILD', 'PUZZLES', 'GARAGE', 'REPLAYS', 'ABOUT', 'OPTIONS'], { x: 'center', y: 84, onPick: i => {
      if (i === 0) game.go('select');
      if (i === 1) game.go('survival');
      if (i === 2) game.go('hotseat');
      if (i === 3) game.go('editor');
      if (i === 4) game.go('puzzles');
      if (i === 5) game.go('garage');
      if (i === 6) game.go('replays');
      if (i === 7) game.go('about');
      if (i === 8) game.menu('settings');
    } }),
    select: new E.Menu(game, TRACKS.map(t => t.name), { x: 'center', y: 226, onPick: i => game.go('race', { track: TRACKS[i] }) }),
    replays: new E.Menu(game, TRACKS.map(t => t.name), { x: 'center', y: 40, onPick: i => {
      const b = bestOf(TRACKS[i].id);
      if (b && b.ghost) game.go('replay', { track: TRACKS[i], frames: b.ghost.frames, ms: b.ms });
      else game.note('NO REPLAY YET ON THIS ROAD');
    } }),
    puzzles: new E.Menu(game, PUZZLES.map(p => p.name), { x: 'center', y: 150, onPick: i => game.go('editor', { puzzle: PUZZLES[i] }) }),
    survival: new E.Menu(game, ['START THE GAUNTLET', 'BACK'], { x: 'center', y: 150, onPick: i => { if (i === 0) game.go('race', { survival: true }); else game.go('title'); } }),
    hotseat: new E.Menu(game, ['2 PLAYERS', '3 PLAYERS', '4 PLAYERS', 'BACK'], { x: 'center', y: 150, onPick: i => { if (i < 3) game.go('race', { hotseat: i + 2 }); else game.go('title'); } }),
    results: null,
    garage: null,
  };
  menus.results = new E.Menu(game, ['RETRY', 'NEXT ROAD', 'REPLAY', 'ROADS'], { x: 'center', y: 150, onPick: i => {
    const d = S.res;
    if (d.hotseat || d.survival) return game.go('title');
    const idx = TRACKS.indexOf(d.track);
    if (i === 0) game.go('race', { track: d.track });
    if (i === 1) game.go('race', { track: TRACKS[(idx + 1) % TRACKS.length] });
    if (i === 2) { const b = bestOf(d.track.id); if (b && b.ghost) game.go('replay', { track: d.track, frames: b.ghost.frames, ms: b.ms }); }
    if (i === 3) game.go('select');
  } });
  menus.garage = new E.Menu(game, PAINTS.map(p => p.name), { x: 'center', y: 60, onPick: i => {
    const p = PAINTS[i];
    if (S.profile.owned.includes(p.id)) { S.profile.paint = p.id; storage.save(S.profile); game.note(p.name.toUpperCase() + ' EQUIPPED'); return; }
    if (S.profile.coppers >= p.cost) { S.profile.coppers -= p.cost; S.profile.owned.push(p.id); S.profile.paint = p.id; storage.save(S.profile); game.note(p.name.toUpperCase() + ' BOUGHT'); return; }
    game.note('NEED ' + p.cost + ' COPPERS');
  } });

  game.start({
    scene: 'title',
    boot: { title: 'CRACKMANIA', steps: [
      ['Starting the engines', () => W3.init(game)],
      ['Pouring sand, grass and snow', () => makeWorld()],
      ['Laying the roads', () => loadTrack(TRACKS[0])],
      ['Timing the bot', () => bakeMedals()],
    ] },
    scenes: {
      title: {
        input: INPUT,
        enter() {
          if (activeHub()) { game.go('session'); return; }
          A.music('title'); S.idle = 0; S.menu = menus.title; S.touchOnly = touchOnlyDevice(); if (S.touchOnly) { try { game.settings.set('touch', 'off'); } catch (e) { /* no touch settings */ } } if (!S.demo) startDemo();
          if (!S.profile.introSeen) {
            S.talk = new E.Dialog(game);
            S.talk.say(INTRO, { name: 'COCO', onDone: () => { S.profile.introSeen = true; storage.save(S.profile); } });
            speak(INTRO[0]);
          }
        },
        update(dt) {
          if (S.talk && S.talk.update(dt)) return;
          if (game.input.anyPressed()) S.idle = 0; else S.idle += dt;
          if (S.idle > ATTRACT_IDLE) { game.go('attract'); return; }
          S.menu.update(dt);
          stepDemo(dt, false);
        },
        draw(r) {
          S.world.draw(r);
          if (S.talk && S.talk.open) { S.talk.draw(r); return; }
          r.overlay(g => {
            E.font.title(g, 'CRACKMANIA', r.W / 2, 14, { align: 'center', scale: 3, colors: ['#fff8dc', '#ffd36a', '#ff9a3c', '#d9511f'], depth: 3, depthColor: '#4a1b08' });
            E.font.text(g, 'Crack the clock.   Coppers ' + S.profile.coppers, r.W / 2, 56, '#ffeccc', { align: 'center', shadow: '#000', outline: false });
          });
          S.menu.draw(r);
          r.overlay(g => {
            const hint = S.touchOnly ? 'Controller or keyboard required' : 'Five roads of the Dustbowl: medals, ghosts, a gauntlet';
            E.font.text(g, hint, r.W / 2, r.H - 28, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
          });
          prompt(r, [['confirm', 'Select'], ['up', 'Move']]);
        },
      },
      session: {
        input: INPUT,
        enter() {
          const h = activeHub();
          A.music(null);
          S.session = { h, info: null, started: false, ended: false, race: null, lastSend: 0, lastProgress: 0, sent: 0 };
          attach(h, {
            start: () => { S.session.started = true; },
            message: (d, from) => { if (d && d.p) S.remote[String(from)] = { p: d.p, f: d.f, u: d.u }; },
            end: () => { S.session.ended = true; },
          });
          h.connect({ mode: 'ghost', seats: [1, 4] }).then(info => { if (!info) { game.go('title'); return; } S.session.info = info; h.ready(); });
        },
        update() {
          const se = S.session;
          if (se && se.started && se.info) { const track = roundTrack(se.h); game.go('race', { session: true, track }); }
        },
        draw(r) {
          r.sky(SKY);
          r.overlay(g => {
            E.font.title(g, 'CRACKMANIA', r.W / 2, 20, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            const n = S.session && S.session.info ? S.session.info.players.length : 0;
            E.font.text(g, 'AI HUB SESSION · ' + n + ' PLAYER' + (n === 1 ? '' : 'S'), r.W / 2, 60, '#ffeccc', { align: 'center', shadow: '#000', outline: false });
            E.font.text(g, 'Same road for everyone. Your time is your own.', r.W / 2, 74, '#f0e6d6', { align: 'center', shadow: '#000', outline: false });
          });
        },
      },
      attract: {
        input: INPUT,
        enter() { A.music('adventure'); S.idle = 0; if (!S.demo) startDemo(); },
        update(dt) {
          if (game.input.anyPressed()) { game.go('title'); return; }
          stepDemo(dt, true);
        },
        draw(r) {
          S.world.draw(r);
          r.overlay(g => {
            E.font.title(g, 'CRACKMANIA', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            E.font.text(g, 'DEMO: ' + S.track.def.name.toUpperCase(), r.W / 2, r.H - 26, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
            E.font.text(g, 'Press any button', r.W / 2, r.H - 14, '#ffffff', { align: 'center', shadow: '#000', outline: false });
          });
        },
      },
      select: {
        input: INPUT,
        enter() { S.menu = menus.select; },
        update(dt) { if (!S.menu.update(dt) && game.input.pressed('cancel')) game.go('title'); },
        draw(r) {
          r.sky(SKY);
          r.overlay(g => {
            E.font.title(g, 'CHOOSE A ROAD', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            const top = Math.max(0, Math.min(S.menu.i - 4, TRACKS.length - 9)), rows = TRACKS.slice(top, top + 9);
            rows.forEach((t, k) => {
              const i = top + k, y = 30 + k * 22, sel = S.menu.i === i, b = bestOf(t.id), med = b ? medalFor(t.id, b.ms) : null;
              E.ui.box(g, 16, y - 3, r.W - 32, 19, { bg: sel ? ['#7a3212', '#3a1606'] : ['#2a1a22', '#15101a'], border: sel ? '#ffd36a' : '#5a4a5a', alpha: .92 });
              E.font.text(g, ENVIRONMENTS[t.env].name.toUpperCase().slice(0, 3), 22, y + 2, '#c8b8a0', { shadow: '#000', outline: false });
              E.font.text(g, t.name, 52, y + 2, sel ? '#fff8dc' : '#e5d6c0', { shadow: '#000', outline: false });
              E.font.text(g, b ? fmt(b.ms) : '--:--.--', r.W - 26, y + 2, '#bff8ff', { align: 'right', shadow: '#000', outline: false });
              if (med !== null) E.font.text(g, MEDAL_LETTERS[med], r.W - 64, y + 2, '#ffd36a', { shadow: '#000', outline: false });
            });
            E.font.text(g, TRACKS[S.menu.i] ? TRACKS[S.menu.i].blurb : '', r.W / 2, r.H - 34, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
          });
          prompt(r, [['confirm', 'Drive'], ['cancel', 'Back'], ['up', 'Move']]);
        },
      },
      survival: {
        input: INPUT,
        enter() { S.menu = menus.survival; beat('guild'); },
        update(dt) { if (S.talk && S.talk.update(dt)) return; if (!S.menu.update(dt) && game.input.pressed('cancel')) game.go('title'); },
        draw(r) {
          r.sky(SKY);
          r.overlay(g => {
            E.ui.box(g, 16, 16, r.W - 32, 118, { bg: ['#2a1a22', '#120c12'], border: '#ffd36a', alpha: .9 });
            E.font.title(g, 'SURVIVAL', r.W / 2, 22, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            E.font.text(g, 'Five roads, three rivals of the Ghost Guild.', r.W / 2, 52, '#f0e6d6', { align: 'center', shadow: '#000', outline: false });
            E.font.text(g, 'Finish first or second to go on. Third or worse is out.', r.W / 2, 64, '#f0e6d6', { align: 'center', shadow: '#000', outline: false });
            RIVALS.forEach((rv, i) => E.font.text(g, rv.name, r.W / 2, 82 + i * 10, rv.body, { align: 'center', shadow: '#000', outline: false }));
          });
          S.menu.draw(r);
          if (S.talk && S.talk.open) S.talk.draw(r);
          prompt(r, [['confirm', 'Select'], ['cancel', 'Back']]);
        },
      },
      hotseat: {
        input: INPUT,
        enter() { S.menu = menus.hotseat; },
        update(dt) { if (!S.menu.update(dt) && game.input.pressed('cancel')) game.go('title'); },
        draw(r) {
          r.sky(SKY);
          r.overlay(g => {
            E.ui.box(g, 16, 16, r.W - 32, 118, { bg: ['#2a1a22', '#120c12'], border: '#ffd36a', alpha: .9 });
            E.font.title(g, 'HOT SEAT', r.W / 2, 22, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            E.font.text(g, 'Take turns on one controller. Three roads.', r.W / 2, 52, '#f0e6d6', { align: 'center', shadow: '#000', outline: false });
            E.font.text(g, 'Every player drives every road; lowest total wins.', r.W / 2, 64, '#f0e6d6', { align: 'center', shadow: '#000', outline: false });
          });
          S.menu.draw(r);
          prompt(r, [['confirm', 'Select'], ['cancel', 'Back']]);
        },
      },
      replays: {
        input: INPUT,
        enter() { S.menu = menus.replays; },
        update(dt) { if (!S.menu.update(dt) && game.input.pressed('cancel')) game.go('title'); },
        draw(r) {
          r.sky(SKY);
          r.overlay(g => {
            E.font.title(g, 'REPLAYS', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            const t = TRACKS[S.menu.i], b = t && bestOf(t.id);
            E.font.text(g, b && b.ghost ? 'Your best on ' + t.name + ': ' + fmt(b.ms) : 'Finish a road to keep its replay', r.W / 2, r.H - 30, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
          });
          S.menu.draw(r);
          prompt(r, [['confirm', 'Watch'], ['cancel', 'Back']]);
        },
      },
      puzzles: {
        input: INPUT,
        enter() { S.menu = menus.puzzles; },
        update(dt) { if (!S.menu.update(dt) && game.input.pressed('cancel')) game.go('title'); },
        draw(r) {
          r.sky(SKY);
          r.overlay(g => {
            E.font.title(g, 'PUZZLES', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            PUZZLES.forEach((p, i) => {
              const y = 40 + i * 40, sel = S.menu.i === i, done = !!(S.profile.puzzles && S.profile.puzzles[p.id]);
              E.ui.box(g, 16, y - 4, r.W - 32, 34, { bg: sel ? ['#7a3212', '#3a1606'] : ['#2a1a22', '#15101a'], border: sel ? '#ffd36a' : '#5a4a5a', alpha: .92 });
              E.font.text(g, p.name, 26, y + 2, sel ? '#fff8dc' : '#e5d6c0', { scale: 2, shadow: '#000', outline: false });
              E.font.text(g, p.blurb, 26, y + 20, '#c8b8a0', { shadow: '#000', outline: false });
              E.font.text(g, done ? 'SOLVED' : 'OPEN', r.W - 26, y + 6, done ? '#bff8ff' : '#ffd36a', { align: 'right', shadow: '#000', outline: false });
            });
          });
          prompt(r, [['confirm', 'Solve'], ['cancel', 'Back'], ['up', 'Move']]);
        },
      },
      editor: {
        input: INPUT,
        enter(d) {
          S.ed = newEditor(d && d.puzzle ? d.puzzle : null);
          S.ed.slot = 0; S.ed.dirty = true; S.camEye = null; S.orbitT = 0;
          A.music(null);
        },
        update(dt) {
          const ed = S.ed, I = game.input;
          S.orbitT += dt;
          if (I.repeat('up', .25, .1)) ed.pick = (ed.pick + PIECES.length - 1) % PIECES.length;
          if (I.repeat('down', .25, .1)) ed.pick = (ed.pick + 1) % PIECES.length;
          if (I.pressed('left')) ed.slot = (ed.slot + SLOTS - 1) % SLOTS;
          if (I.pressed('right')) ed.slot = (ed.slot + 1) % SLOTS;
          if (I.pressed('confirm')) { if (addPiece(ed)) A.sfx('pickup'); else game.note(ed.puzzle ? 'BUDGET USED UP' : 'NOTHING MORE'); }
          if (I.pressed('cancel')) { if (ed.ids.length) undo(ed); else { game.go(ed.puzzle ? 'puzzles' : 'title'); return; } }
          if (I.pressed('restart')) clear(ed);
          if (I.pressed('ghost')) { roads.save(ed.slot, ed.ids); game.note('SAVED TO SLOT ' + (ed.slot + 1)); }
          if (I.pressed('skill')) { const ids = roads.load(ed.slot); if (ids) { ed.ids = ids.slice(); ed.dirty = true; game.note('LOADED SLOT ' + (ed.slot + 1)); } else game.note('SLOT ' + (ed.slot + 1) + ' IS EMPTY'); }
          if (I.pressed('respawn') && ed.ids.length) { game.go('race', { track: { id: 'build', name: ed.puzzle ? ed.puzzle.name : 'Your road', env: 'DUSTBOWL', program: programFor(ed) }, puzzle: ed.puzzle }); return; }
          if (ed.dirty) {
            ed.dirty = false;
            loadTrack({ id: 'build', name: 'Your road', env: 'DUSTBOWL', program: programFor(ed) });
          }
          const T = S.track.T, mid = T.P[Math.floor(T.n / 2)].map(v => v * U);
          const a = S.orbitT * .2, eye = [mid[0] + Math.cos(a) * 60 * U, mid[1] + Math.sin(a) * 60 * U, mid[2] + 30 * U];
          const dd = norm(sub(mid, eye));
          S.world.camera.set('fixed');
          S.world.camera.fixed = { x: eye[0], y: eye[1], z: eye[2], yaw: Math.atan2(dd[1], dd[0]), pitch: Math.asin(dd[2]), fov: 60 };
          S.world.step(dt);
        },
        draw(r) {
          S.world.draw(r);
          const ed = S.ed;
          r.overlay(g => {
            E.ui.box(g, 4, 4, 150, r.H - 24, { bg: ['#2a1a22', '#120c12'], border: '#5a4a5a', alpha: .9 });
            E.font.text(g, ed.puzzle ? ed.puzzle.name.toUpperCase() : 'BUILD', 10, 8, '#ffd36a', { shadow: '#000', outline: false });
            PIECES.forEach((p, i) => E.font.text(g, (i === ed.pick ? '> ' : '  ') + p.label, 10, 22 + i * 10, i === ed.pick ? '#fff8dc' : '#d8c8b0', { shadow: '#000', outline: false }));
            const used = ed.ids.length;
            E.font.text(g, ed.puzzle ? 'PIECES ' + used + '/' + ed.puzzle.max + '  GOAL ' + ed.puzzle.goal + ' M' : 'PIECES ' + used, r.W - 8, 8, '#ffe7a8', { align: 'right', shadow: '#000', outline: false });
            E.font.text(g, 'ROAD ' + ed.ids.map((id, i) => (i + 1) + '' + PIECES.find(p => p.id === id).label.split(' ')[0].slice(0, 2)).join(' '), r.W - 8, 18, '#c8b8a0', { align: 'right', shadow: '#000', outline: false });
            E.font.text(g, 'SLOT ' + (ed.slot + 1) + ' (left/right)', r.W - 8, 28, '#c8b8a0', { align: 'right', shadow: '#000', outline: false });
          });
          prompt(r, [['confirm', 'Add'], ['cancel', 'Undo'], ['respawn', 'Test drive'], ['restart', 'Clear'], ['ghost', 'Save'], ['skill', 'Load']]);
        },
      },
      garage: {
        input: INPUT,
        enter() { S.menu = menus.garage; },
        update(dt) { if (!S.menu.update(dt) && game.input.pressed('cancel')) game.go('title'); },
        draw(r) {
          r.sky(SKY);
          r.overlay(g => {
            E.font.title(g, 'GARAGE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            E.font.text(g, 'Coppers ' + S.profile.coppers, r.W / 2, 30, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
            PAINTS.forEach((p, i) => {
              const y = 60 + i * 22, sel = S.menu.i === i, own = S.profile.owned.includes(p.id), on = S.profile.paint === p.id;
              E.ui.box(g, 16, y - 5, r.W - 32, 18, { bg: sel ? ['#7a3212', '#3a1606'] : ['#2a1a22', '#15101a'], border: sel ? '#ffd36a' : '#5a4a5a', alpha: .92 });
              E.ui.box(g, 24, y - 2, 12, 10, { bg: [p.body, p.body], border: '#ffffff', gradient: false });
              E.font.text(g, p.name, 46, y, '#fff8dc', { scale: 2, shadow: '#000', outline: false });
              E.font.text(g, on ? 'ON THE CAR' : own ? 'OWNED' : p.cost + ' COPPERS', r.W - 26, y + 2, own ? '#bff8ff' : '#ffd36a', { align: 'right', shadow: '#000', outline: false });
            });
          });
          prompt(r, [['confirm', 'Equip or buy'], ['cancel', 'Back']]);
        },
      },
      race: {
        input: INPUT, pausable: true,
        exit() { if (S.engine) S.engine.stop(); },
        enter(d) {
          A.music(null); if (S.engine) S.engine.stop(); S.mode = null; S.puzzle = (d && d.puzzle) || null; S.hot = S.hot && S.hot.players ? S.hot : null; S.menu = null;
          if (d && d.session) { loadTrack(d.track); S.race = newRun(null); S.race.phase = 'count'; S.cars = [{ run: S.race, body: paintBody(), glass: '#f3ede0' }]; S.camEye = null; S.resultsSent = false; S.session.race = S.race; S.session.lastSend = 0; S.session.lastProgress = 0; return; }
          if (d && d.survival) { startSurvival(0); return; }
          if (d && d.hotseat) { startHotSeat(d.hotseat); return; }
          const def = (d && d.track) || TRACKS[0];
          loadTrack(def);
          const best = bestOf(def.id);
          S.race = newRun(best && best.ghost ? best.ghost : null);
          S.cars = [{ run: S.race, body: paintBody(), glass: '#f3ede0' }];
          S.camEye = null; S.resultsSent = false; S.dev.bot = false;
        },
        update(dt) {
          const run = S.race;
          if (!run) return;
          if (S.dev.open) devUpdate();
          const live = !S.dev.open;
          if (live && game.input.pressed('respawn')) run.respawn();
          if (live && game.input.pressed('restart')) run.restart();
          if (game.input.pressed('ghost')) { S.showGhost = !S.showGhost; game.note(S.showGhost ? 'GHOST ON' : 'GHOST OFF'); }
          const se = S.session;
          if (se && se.race === run) {
            const t = se.h.time();
            if (t < 0 || se.ended) { chaseCamera(dt, run.car); S.world.step(dt); return; }
            if (run.phase === 'count') run.phase = 'run';
            run.step(dt, S.dev.bot ? botControls(run.car, run.bot) : controls(), S.track.scene);
            if (run.steps - se.lastSend >= 4 && !run.finished) { se.lastSend = run.steps; se.h.send(poseMessage(run.car), { reliable: false }); }
            if (run.steps - se.lastProgress >= STEP_HZ && !run.finished) { se.lastProgress = run.steps; se.h.progress({ score: run.progress, label: Math.round(100 * run.progress / S.track.T.n) + '%' }); }
            if (run.finished && !S.resultsSent) { S.resultsSent = true; se.h.result({ time: run.ms() }); game.after(1.2, () => game.go('results', { session: true, ms: run.ms(), respawns: run.respawns, track: S.track.def })); }
            chaseCamera(dt, run.car); S.world.step(dt);
            return;
          }
          const ctl = S.dev.bot ? botControls(run.car, run.bot) : controls();
          run.step(dt, ctl, S.track.scene);
          for (const e of run.events) sound(e);
          if (!S.engine) S.engine = engineSound(A);
          S.engine.update(run.speedKmh(), ctl.gas);
          if (S.mode && S.mode.kind === 'survival') for (const rv of S.rivals) if (!rv.run.finished) rv.run.step(dt, botControls(rv.run.car, rv.run.bot), S.track.scene);
          if (S.mode && S.mode.kind === 'survival' && run.finished && !S.resultsSent) { S.resultsSent = true; finishRace(); }
          else if (!(S.mode && S.mode.kind === 'survival') && run.finished && !S.resultsSent) { S.resultsSent = true; finishRace(); }
          chaseCamera(dt, run.car);
          S.world.step(dt);
        },
        draw(r) {
          S.world.draw(r);
          const run = S.race;
          if (!run) return;
          r.overlay(g => {
            const clock = run.phase === 'count' ? run.countText() : fmt(run.ms());
            E.font.text(g, clock, r.W / 2, 6, run.phase === 'count' ? '#ffd36a' : '#fff8dc', { align: 'center', scale: 3, shadow: '#000', outline: '#000' });
            const best = S.mode ? null : bestOf(S.track.def.id);
            if (best && best.ghost && best.ghost.splits && run.phase === 'run' && run.splits.length) {
              const k = run.splits.length - 1, ref = best.ghost.splits[k];
              if (ref !== undefined) { const d = (run.splits[k] - ref) * 1000 / STEP_HZ; E.font.text(g, signed(d), r.W / 2, 40, d <= 0 ? '#8fd3ff' : '#ff8a7a', { align: 'center', scale: 2, shadow: '#000', outline: false }); }
            }
            const of = S.track.T.gates.length - 1;
            E.font.text(g, S.track.def.name + '  ' + Math.min(run.nextGate, of) + '/' + of, 8, 8, '#ffe7a8', { shadow: '#000', outline: false });
            if (S.mode && S.mode.kind === 'survival') E.font.text(g, 'ROUND ' + (S.mode.round + 1) + '/' + GAUNTLET.length + '  ·  RIVALS ' + S.rivals.filter(v => !v.run.finished).length + ' ON THE ROAD', 8, 18, '#ffd36a', { shadow: '#000', outline: false });
            if (S.mode && S.mode.kind === 'hotseat') E.font.text(g, S.hot.players[S.hot.turn] + '  ·  ROAD ' + (S.hot.road + 1) + '/' + CUP.length, 8, 18, '#ffd36a', { shadow: '#000', outline: false });
            E.font.text(g, Math.round(run.speedKmh()) + ' KM/H', 8, r.H - 40, '#ffffff', { scale: 2, shadow: '#000', outline: false });
            if (run.respawns) E.font.text(g, 'RESPAWNS ' + run.respawns, 8, 28, '#ffb8a8', { shadow: '#000', outline: false });
          });
          prompt(r, [['respawn', 'Respawn'], ['restart', 'Restart'], ['pause', 'Pause']]);
          if (S.session && S.session.ended) r.overlay(g => E.font.text(g, 'ROUND OVER', r.W / 2, r.H / 2, '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false }));
          if (S.dev.open) devDraw(r);
        },
      },
      replay: {
        input: INPUT,
        enter(d) { S.replay = { frames: d.frames, ms: d.ms, track: d.track, steps: 0 }; loadTrack(d.track); A.music(null); },
        update(dt) {
          const R = S.replay;
          R.steps += dt * STEP_HZ;
          const p = ghostAt({ frames: R.frames }, R.steps);
          if (!p || game.input.pressed('cancel') || game.input.pressed('confirm')) { S.replay = null; game.go('select'); return; }
          const f = { p: p.p, f: p.f, u: p.u };
          const want = add(add(f.p, f.f, -11 * U), f.u, 4.2 * U);
          S.world.camera.set('fixed');
          const d2 = norm(sub(add(f.p, f.f, 7 * U), want));
          S.world.camera.fixed = { x: want[0], y: want[1], z: want[2], yaw: Math.atan2(d2[1], d2[0]), pitch: Math.asin(Math.max(-1, Math.min(1, d2[2]))), fov: 68, up: f.u };
          S.world.step(dt);
        },
        draw(r) {
          S.world.draw(r);
          r.overlay(g => {
            E.font.text(g, 'REPLAY · ' + S.replay.track.name + ' · ' + fmt(S.replay.ms), 8, 8, '#ffe7a8', { shadow: '#000', outline: false });
          });
          prompt(r, [['confirm', 'Back']]);
        },
      },
      results: {
        input: INPUT,
        exit() { if (S.engine) S.engine.stop(); },
        enter(d) { S.res = d; A.music('victory'); if (!d.session && !d.puzzle && !d.survival && !d.hotseat) beat('first'); if (d.survival && S.beatNext) { beat(S.beatNext); S.beatNext = null; } if (d.puzzle) { S.menu = new E.Menu(game, ['BACK TO BUILD', 'PUZZLES'], { x: 'center', y: 150, onPick: i => game.go(i === 0 ? 'editor' : 'puzzles', i === 0 ? { puzzle: d.puzzle } : undefined) }); return; } if (!d.session && !d.survival && !d.hotseat) speak(COCO[d.ms % COCO.length]); S.menu = menus.results; if (d.survival || d.hotseat) S.menu = new E.Menu(game, ['BACK TO TITLE'], { x: 'center', y: 176, onPick: () => game.go('title') }); if (d.session) S.menu = new E.Menu(game, [], { x: 'center', y: 176, onPick: () => {} }); },
        update(dt) { if (S.talk && S.talk.update(dt)) return; S.menu.update(dt); },
        draw(r) {
          r.sky(SKY);
          const d = S.res;
          if (S.talk && S.talk.open) { S.talk.draw(r); return; }
          r.overlay(g => {
            if (d.puzzle) {
              E.ui.box(g, r.W / 2 - 150, 30, 300, 96, { bg: ['#3a1e10', '#1a0c08'], border: '#ffd36a', alpha: .94 });
              E.font.title(g, d.solved ? 'SOLVED' : 'NOT YET', r.W / 2, 36, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
              E.font.text(g, d.puzzle.name, r.W / 2, 66, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
              E.font.text(g, d.solved ? 'Goal of ' + d.puzzle.goal + ' m reached in ' + d.puzzle.max + ' pieces' : 'Finish the road and reach ' + d.puzzle.goal + ' m', r.W / 2, 82, '#bff8ff', { align: 'center', shadow: '#000', outline: false });
            } else if (d.session) {
              E.ui.box(g, r.W / 2 - 150, 30, 300, 80, { bg: ['#3a1e10', '#1a0c08'], border: '#ffd36a', alpha: .94 });
              E.font.title(g, 'FINISH', r.W / 2, 36, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
              E.font.text(g, fmt(d.ms), r.W / 2, 62, '#fff8dc', { align: 'center', scale: 3, shadow: '#000', outline: false });
              E.font.text(g, 'TIME SENT TO THE HUB', r.W / 2, 92, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
            } else if (d.survival) {
              E.ui.box(g, r.W / 2 - 150, 8, 300, 150, { bg: ['#3a1e10', '#1a0c08'], border: '#ffd36a', alpha: .94 });
              E.font.title(g, d.cleared ? 'GAUNTLET CLEAR' : d.out ? 'OUT' : 'ROUND ' + (d.round + 1), r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
              d.ranked.forEach((e, i) => E.font.text(g, (i + 1) + '  ' + e.name + (e.you ? '  (YOU)' : ''), r.W / 2, 50 + i * 12, e.you ? '#fff8dc' : '#d8c8b0', { align: 'center', shadow: '#000', outline: false }));
            } else if (d.hotseat) {
              E.ui.box(g, r.W / 2 - 150, 8, 300, 150, { bg: ['#3a1e10', '#1a0c08'], border: '#ffd36a', alpha: .94 });
              E.font.title(g, 'CUP STANDINGS', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
              d.standings.forEach((e, i) => E.font.text(g, (i + 1) + '  ' + e.name + '   ' + fmt(e.total), r.W / 2, 50 + i * 14, i === 0 ? '#ffd36a' : '#d8c8b0', { align: 'center', shadow: '#000', outline: false }));
            } else {
              E.ui.box(g, r.W / 2 - 150, 8, 300, 130, { bg: ['#3a1e10', '#1a0c08'], border: '#ffd36a', alpha: .94 });
              E.font.title(g, 'FINISH', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
              E.font.text(g, fmt(d.ms), r.W / 2, 40, '#fff8dc', { align: 'center', scale: 3, shadow: '#000', outline: false });
              E.font.text(g, 'MEDAL ' + (d.medal === null ? 'NONE' : MEDAL_NAMES[d.medal]) + (d.earned ? '  +' + d.earned + ' COPPERS' : ''), r.W / 2, 64, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
              E.font.text(g, d.best ? 'BEST ' + fmt(d.best) + (d.newBest ? '  NEW BEST' : '') : 'FIRST RUN ON THIS ROAD', r.W / 2, 78, '#bff8ff', { align: 'center', shadow: '#000', outline: false });
              E.font.text(g, d.respawns ? 'RESPAWNS ' + d.respawns : 'NO RESPAWNS', r.W / 2, 92, '#ffb8a8', { align: 'center', shadow: '#000', outline: false });
              E.font.text(g, COCO[d.ms % COCO.length], r.W / 2, 118, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
            }
          });
          S.menu.draw(r);
        },
      },
      about: {
        input: INPUT,
        enter() { S.page = 0; },
        update() {
          const I = game.input;
          if (I.pressed('confirm') || I.pressed('cancel')) { game.go('title'); return; }
          if (I.pressed('right')) S.page = Math.min(ABOUT.length - 1, S.page + 1);
          if (I.pressed('left')) S.page = Math.max(0, S.page - 1);
        },
        draw(r) {
          r.sky(SKY);
          const page = ABOUT[S.page];
          r.overlay(g => {
            E.ui.box(g, 6, 6, r.W - 12, r.H - 26, { bg: ['#2a1a22', '#120c12'], border: '#ffd36a', alpha: .95 });
            E.font.title(g, page.title, r.W / 2, 12, { align: 'center', scale: 2, colors: ['#fff8dc', '#ffd36a'], depth: 2, depthColor: '#4a1b08' });
            let y = 38;
            for (const line of page.lines) for (const t of (line === '' ? [''] : E.font.wrap(line, r.W - 40))) { E.font.text(g, t, 18, y, '#f0e6d6', { shadow: '#000', outline: false }); y += 10; }
            E.font.text(g, (S.page + 1) + ' / ' + ABOUT.length + '   ' + game.input.label('left') + ' ' + game.input.label('right') + ' page   ' + game.input.label('cancel') + ' back', r.W / 2, r.H - 16, '#c8b8a0', { align: 'center', shadow: '#000', outline: false });
          });
        },
      },
    },
  });

  return { game, api: { S, INPUT, loadTrack, newRun, bakeMedals, recordBest, bestOf, medalFor, controls, makeWorld, storage, startSurvival, startHotSeat, standings } };
}
