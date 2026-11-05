/* BENTOU 2: BIRTH OF THE LUNCHBOX ASSASSINS
 * Core loop: slip through the lantern-lit street of Kokaku, unseen. Steal the ledger from the storehouse roof, then
 * slip out by the east gate. Shadow Sight hides guards you cannot see (the Ki gauge senses the nearest ones). Silent
 * Cut from behind (or from a roof above) to take a guard down quietly. Being seen makes them search, then hunt you.
 * Keys: WASD move, Shift sprint, Space jump / climb, C crouch, J strike or Silent Cut, K block / parry, L roll,
 * V camera view, [ ] turn the camera, mouse wheel zoom. Pad: left stick, X jump, Square strike, Circle crouch,
 * Triangle block, R1 roll, Options pause.
 * Built on the my-3D2dge stealth kit's mission code (roofs, guards, takedowns) and rewritten for this game.
 */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;

/* ---- SHELL ----------------------------------------------------------------------------------- */
const TUNE_DEFAULTS = {
  sightRange: 110, sightFov: 1.5, kiRange: 160, suspRise: 1.6, suspDecay: .25,
  heroRun: 70, guardRun: 70, guardWalk: 30, heroHp: 3, godMode: false, reveal: false
};
const TUNE = { ...TUNE_DEFAULTS };
const DIFFICULTY = { Ninja: { perception: 1, damage: 1 }, Novice: { perception: .8, damage: .6 }, 'Grand Master': { perception: 1.2, damage: 1.4 } };
const T = k => TUNE[k];
const diff = () => DIFFICULTY[game.settings.difficulty] || DIFFICULTY.Ninja;
const CHARS = {
  sojiro: { name: 'Sojiro', weapon: 'katana', run: 70, hp: 3, cutSpeed: 1, colors: { cloth: '#3a4a6a', coat: '#c8c0b0', pants: '#3a3448', cape: '#2a3a5a', hair: '#1a1a22' } },
  kaede: { name: 'Kaede', weapon: 'sword', run: 80, hp: 2, cutSpeed: 1.25, colors: { cloth: '#3a6a4a', coat: '#c8d8c0', pants: '#2a3a30', cape: '#1e4a32', hair: '#2a1a1a' } }
};
const ACTIONS = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'start', 'jump', 'attack', 'crouch', 'block', 'dodge', 'sprint'];
const CHAR_KEYS = Object.keys(CHARS);

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'iso', bg: '#07060d',
  menu: {
    items: [['Dev Mode', () => openDev()], ['Restart mission', () => restartMission()]],
    settings: [{ key: 'difficulty', label: 'Difficulty', options: Object.keys(DIFFICULTY), value: 'Ninja' }],
    quit: 'title'
  }
});
const P = game.particles, L = game.lights, A = game.audio;
const scenes = {};
const ui = new E.Shell(game, { theme: { accent: '#e8b04a', ink: '#f4ead5', paper: 'rgba(20,12,12,.92)', danger: '#d8402a', line: 'rgba(232,176,74,.35)' } });
const touchOnly = () => { try { return !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0; } catch (e) { return false; } };

/* ---- MISSION -------------------------------------------------------------------------------- */
const MISSION = (() => {
  const TS = 16, LEDGER = { x: 11.5 * TS, y: 3.5 * TS, z: 48 };
  const SONG = { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'A2 . . A2 . . A2 . | A2 . . A2 . C3 . . | F2 . . F2 . . F2 . | G2 . . G2 . E2 . .' },
    { name: 'tick', wave: 'drums', vol: .06, notes: 'h . . h . . h . h . . h . . h .' },
    { name: 'lead', wave: 'pulse12', vol: .07, notes: 'E5 - . . . . D5 . | C5 - . . B4 . A4 . | . . . . F5 - E5 . | D5 - . . E5 - . . | E5 - . . . . G5 . | F5 - . . E5 . D5 . | C5 - . . D5 - . . | B4 - - - . . . .' },
    { name: 'chase', wave: 'drums', vol: .13, on: false, notes: 'k . h k s . h . k k h . s . h s' },
    { name: 'alarm', wave: 'saw', vol: .06, on: false, notes: 'A3 A3 A4 A3 E4 A3 G4 A3 | A3 A3 A4 A3 C5 A3 B4 A3 | F3 F3 F4 F3 C4 F3 E4 F3 | G3 G3 G4 G3 D4 G3 B3 G3' }] };
  const PAVE = { stones: ['#7a6a60', '#726258', '#806e64'].map(E.hex), mortar: E.hex('#3e3236'), hi: E.hex('#8e7e72'), lo: E.hex('#56484a'), speck: E.hex('#66564e') };
  const map = new E.TileMap({ rows: [
    '############################',
    '#.......................,,,#',
    '#.AAAA...BBBBB....CCCC...,,#',
    '#.AAAA...BBBBB....CCCC.....#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.........................,#',
    '#..,,,.......p.......,,,..,#',
    '#..,,,...............,,,...#',
    '#.DDDD..EEE....FFFFF.......#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.@.......................X#',
    '############################'],
    legend: { '#': 1, A: 2, B: 3, C: 4, D: 5, E: 6, F: 7, G: 8, T: 9, p: 10, ',': { floor: 'grass' }, '@': 'hero', X: 'exit' },
    types: {
      1: { h: 64, top: '#3a3448', side: '#5a5068', face: 'stone', roof: 'plain', cut: true, cutH: 6 },
      2: { h: 40, top: '#8a4a3a', side: '#c8b89a', face: 'plaster', roof: 'tiles', windows: { lit: .3 }, shutters: '#2a5a8a', door: { chance: .4 } },
      3: { h: 48, top: '#5a4a3a', side: '#9a6a4a', face: 'brick', roof: 'slab', windows: { lit: .2 }, balcony: { z: 30, color: '#3a2a1e' } },
      4: { h: 40, top: '#4a6a3a', side: '#b8a888', face: 'timber', roof: 'tiles', arch: { chance: .5 }, windows: true },
      5: { h: 24, top: '#7a4a32', side: '#d0c0a0', face: 'plaster', roof: 'tiles', door: { chance: .5, color: '#5a2a1a' }, windows: { from: 12, lit: .4 } },
      6: { h: 48, top: '#6a5a6a', side: '#7a7a8a', face: 'stone', roof: 'plain', windows: { w: 4, h: 12, lit: .15 } },
      7: { h: 40, top: '#8a5a3a', side: '#c8a888', face: 'plaster', roof: 'tiles', windows: true, shutters: '#6a3a2a', balcony: { z: 24 } },
      8: { h: 24, top: '#4a6a3a', side: '#a89878', face: 'timber', roof: 'tiles', arch: { chance: .6 } },
      9: { h: 72, top: '#7a6a5a', side: '#a89878', face: 'sandstone', roof: 'plain', windows: { w: 3, h: 10, step: 22, lit: .5 } },
      10: { h: 10, top: '#3e7a3a', side: '#5a4a32', face: 'plank', roof: 'leaves' } },
    floorTex: (x, y, tag) => tag === 'grass' ? E.tex.grass(x, y, { base: '#3e6a32', dark: '#2a5226', light: '#5a8a42' }) : E.tex.flagstone(x, y, PAVE)
  });
  const EXIT = map.find('exit'), GRASS = [];
  for (let cy = 0; cy < map.h; cy++) for (let cx = 0; cx < map.w; cx++) if (map.floorAt((cx + .5) * TS, (cy + .5) * TS) === 'grass') GRASS.push([(cx + .5) * TS, (cy + .5) * TS]);
  const LAMPS = [[8.5, 6.2], [16, 8.8], [23.5, 6.2], [12.5, 10.5], [19.5, 1.3]].map(([x, y]) => [x * TS, y * TS]);
  const BOOK = E.sprite(['.bbbb.', 'bBBBBb', 'bBwwBb', 'bBBBBb', '.bbbb.'], { b: '#3a2010', B: '#8a3a20', w: '#f0e0b0' });
  const ROUTES = [
    [[19.5, 3.5, 40], [21.5, 3.5, 40], [21.5, 5.5, 40], [18.5, 5.5, 40]],
    [[6.5, 6.5, 0], [20.5, 6.5, 0], [20.5, 8.5, 0], [6.5, 8.5, 0]],
    [[11.5, 12.2, 0], [20.5, 12.2, 0], [20.5, 8.2, 0], [11.5, 8.2, 0]]
  ];
  // the belfry canopy, drawn in game coordinates
  const BELL = { x: 25 * TS, y: 5 * TS, w: 21, H: 20, z: 72 };
  const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
  const s = { hero: null, rig: null, guards: [], attack: null, checkpoint: null, ledger: false, won: false, over: false, hp: 3, maxHp: 3,
    hurtT: 0, alertT: 0, alerts: 0, kills: 0, wounds: 0, music: false, mode: 'play', char: 'sojiro', autopilot: false, time: 0, noticeT: 0 };
  let flow = null, lastLedger = null, lastAuto = null;

  /* guards */
  function makeGuard(route, i) {
    const [x, y, z] = route[0];
    const g = new E.Mover({ x: x * TS, y: y * TS, z, r: 5, run: T('guardRun'), walk: T('guardWalk'), climbMax: 56, hopMax: 56 });
    Object.assign(g, { i, route: route.map(p => [p[0] * TS, p[1] * TS]), at: 1, mind: new E.Suspicion({ rise: T('suspRise'), decay: T('suspDecay'), forget: 7 }),
      hp: 2, stun: 0, dead: false, flow: new E.FlowField(map, { climb: 56, drop: 56, jump: 60 }), wait: 0, bark: 0, sight: 'calm',
      swing: new E.Attack('overhead', { wind: .38, recover: .3, reach: 9 }),
      rig: new E.Humanoid({ size: 1.2, build: 'heroic', hat: 'helmet', armor: true, weapon: 'sword', colors: { cloth: ['#8a3a32', '#6a3a5a', '#7a4a2a'][i], metal: '#c8c8d8' } }) });
    return g;
  }
  function seenBy(g) {
    if (!s.hero || s.over) return { seen: false, exposure: 0 };
    return E.sees(g, s.hero, { map, range: T('sightRange'), fov: T('sightFov') });
  }
  function guardUpdate(g, dt) {
    if (g.dead) return;
    if (g.stun > 0) { g.stun -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    const seen = seenBy(g), prev = g.mind.state;
    const st = g.mind.update(dt, seen, s.hero);
    g.sight = st;
    if (prev !== 'alert' && st === 'alert') { s.alerts++; A.sfx('select'); g.bark = 1.2; }
    let goal = null, speed = 'walk';
    if (st === 'alert') { goal = s.hero; speed = 'run'; }
    else if (st === 'search' && g.mind.last) goal = g.mind.last;
    else if (st === 'notice') { g.facing = E.approachAng(g.facing, Math.atan2(g.mind.last.y - g.y, g.mind.last.x - g.x), dt * 3); g.update(dt, map, { move: [0, 0] }); return; }
    else { const p = g.route[g.at]; goal = { x: p[0], y: p[1], z: 0 }; if (Math.hypot(p[0] - g.x, p[1] - g.y) < 8) { g.at = (g.at + 1) % g.route.length; g.wait = .8; } }
    if (g.wait > 0 && st === 'calm') { g.wait -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    const d = Math.hypot(s.hero.x - g.x, s.hero.y - g.y), near = st === 'alert' && d < 20 && E.sameLevel(g, s.hero, 10);
    if (near && !g.swing.busy && !s.hero.action) { g.facing = Math.atan2(s.hero.y - g.y, s.hero.x - g.x); g.swing.start(); A.sfx('swing', { vol: .5 }); }
    const began = g.swing.update(dt);
    if (g.swing.busy) { g.update(dt, map, { move: [0, 0] }); if (g.swing.active && began === 'active') strikeHero(g); return; }
    let move = [0, 0], jump = false;
    if (goal) {
      g.flow.update(goal.x, goal.y);
      const nx = g.flow.next(g.x, g.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - g.x, ty - g.y) || 1;
      if (Math.hypot(goal.x - g.x, goal.y - g.y) > 6) move = [(tx - g.x) / l, (ty - g.y) / l];
      if (nx && g.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < g.r + 4) { jump = true; g.facing = Math.atan2(ty - g.y, tx - g.x); }
    }
    if (speed === 'walk') move = move.map(v => v * .5);
    g.update(dt, map, { move, sprint: false, jumpPressed: jump });
  }
  function strikeHero(g) {
    const h = s.hero;
    if (!E.inArc(g, g.facing, h, 20, 1.2, 10) || (h.action && h.action.invulnerable)) return;
    if (game.input.down('block') && !h.action) { A.sfx('hit', { vol: .4 }); P.sparks(h.x, h.y, h.z + 16, 6, g.facing + Math.PI); return; }
    if (T('godMode') || s.mode === 'attract') return;
    s.hp -= diff().damage; s.wounds++; s.hurtT = .4; game.hitFx(h.x, h.y, h.z + 16, { power: 1, angle: g.facing, sound: 'hurt' }); E.knockback(g, h, 140);
    if (s.hp <= 0) lose();
  }

  /* hero */
  function heroTakedown() {
    for (const g of s.guards) {
      if (g.dead || g.action) continue;
      const h = s.hero, dz = h.z - g.z, d = Math.hypot(g.x - h.x, g.y - h.y);
      if (dz > 14 && d < 44 && h.onGround) return [g, true];
      const behind = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - h.y, g.x - h.x))) < 1.1;
      if (E.sameLevel(h, g) && d < 18 && behind && g.mind.state !== 'alert') return [g, false];
    }
    return null;
  }
  function tryCut() {
    const t = heroTakedown();
    if (!t) return false;
    s.hero.play('takedown', { other: t[0], aerial: t[1], map });
    t[0].dead = true; t[0].action = s.hero.action; s.kills++; A.sfx('punch'); game.freeze(.06); game.note(t[1] ? 'Silent Cut: from above' : 'Silent Cut: from behind', 1);
    return true;
  }
  const parrying = () => s.guards.some(g => !g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - s.hero.x, g.y - s.hero.y) < 26);
  const inGrass = b => b.z < 2 && map.floorAt(b.x, b.y) === 'grass';

  function heroUpdate(dt, intent) {
    const h = s.hero, I = intent;
    h.exposure = inGrass(h) && h.crouch ? 0 : 1;
    if (!h.action) {
      if (I.pressed && I.pressed('dodge') && h.dodge(undefined, 34)) A.sfx('whoosh');
      else if (I.pressed && I.pressed('attack') && !tryCut() && s.attack.start()) { if (I.consume) I.consume('attack'); A.sfx('swing'); }
    }
    s.attack.update(dt);
    s.attack.hits(s.guards.filter(g => !g.dead), g => E.inArc(h, h.facing, g, 20, 1.3, 10), g => {
      game.hitFx(g.x, g.y, g.z + 16, { power: g.stun > 0 ? 2 : 1, angle: h.facing }); E.knockback(h, g, 90);
      if (g.stun > 0 || --g.hp <= 0) { g.dead = true; g.action = null; s.kills++; A.sfx('die', { vol: .5 }); }
      else g.mind.level = 1.2;
    });
    if (I.pressed && I.pressed('block')) for (const g of s.guards) if (!g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - h.x, g.y - h.y) < 26) {
      g.swing.cancel(); g.stun = 1.3; A.sfx('kick'); game.flash('#ffffff', .08); P.sparks(g.x, g.y, g.z + 18, 10, h.facing); game.note('Parried', .8);
    }
    h.update(dt, map, s.attack.busy ? { move: [0, 0] } : I);
    if (h.hurt && !T('godMode') && s.mode !== 'attract') { s.hp--; s.wounds++; s.hurtT = .4; game.shake(3); if (s.hp <= 0) lose(); }
    if (h.inHazard) h.respawn();
    if (!s.ledger && E.dist(h, LEDGER) < 12) { s.ledger = true; s.checkpoint = { x: h.x, y: h.y, z: h.z }; A.sfx('powerup'); game.note('The ledger is yours. Now the east gate.', 2.5); }
    if (s.ledger && !s.won && Math.hypot(h.x - EXIT.x, h.y - EXIT.y) < 14 && h.z < 2) { s.won = true; A.music('victory'); results(); }
  }
  function lose() {
    if (T('godMode') || s.mode === 'attract') { s.hp = s.maxHp; return; }
    if (s.checkpoint) { A.sfx('die'); respawnAt(s.checkpoint); }
    else { s.over = true; game.after(.8, () => overScreen()); }
  }
  function respawnAt(cp) {
    Object.assign(s.hero, { x: cp.x, y: cp.y, z: cp.z, vx: 0, vy: 0, vz: 0, onGround: true, action: null }); s.hp = s.maxHp;
    s.guards.forEach((g, i) => { if (!g.dead) { const [x, y, z] = ROUTES[i][0]; Object.assign(g, { x: x * TS, y: y * TS, z, vx: 0, vy: 0, vz: 0, at: 1, stun: 0, action: null }); g.mind.reset(); g.swing.cancel(); } });
    game.cam.snap = true; game.note('Back at the checkpoint', 1.5);
  }

  function results() {
    const alive = s.guards.filter(g => !g.dead).length, rank = rankFor();
    const stat = [['Silent Cuts', String(s.kills)], ['Times spotted', String(s.alerts)], ['Wounds taken', String(s.wounds)], ['Rank', rank]];
    ui.hud({});
    ui.show('results', { kicker: 'Mission complete', title: rank + ' — The ledger is out', text: rank === 'Grand Kaiseki' ? ['Not one bell rang. Eat well, Apprentice.'] : ['The rice is cold, but the box is full.'],
      stats: stat, actions: [{ label: 'Play again', primary: true, fn: () => { ui.hide(); game.go('title'); } }, { label: 'Title', fn: () => { ui.hide(); game.go('title'); } }] });
    E.store.set('bentou2:rank', rank);
  }
  const rankFor = () => s.alerts === 0 && s.wounds === 0 ? 'Grand Kaiseki' : s.alerts <= 1 ? 'Makunouchi' : s.alerts <= 3 ? 'Ekiben' : 'Hinomaru';
  function overScreen() {
    ui.hud({});
    ui.show('over', { kicker: 'Your box is empty', title: 'Defeated', text: ['The guards found the Lunchbox Assassin.'],
      actions: [{ label: 'Retry mission', primary: true, fn: () => { ui.hide(); restartMission(); } }, { label: 'Title', fn: () => { ui.hide(); game.go('title'); } }] });
  }
  function restartMission() { game.go(s.mode, { char: s.char, mode: s.mode }, { fade: 0 }); }
  function skipToExit() { if (!s.ledger) { s.ledger = true; s.checkpoint = { x: EXIT.x - 24, y: EXIT.y, z: 0 }; game.note('Cheat: the ledger is taken', 1.5); } }

  /* the mission's heads-up display (the Shell HUD, plus the Ki gauge drawn beside it) */
  function hud() {
    const k = a => game.input.label(a).toUpperCase(), h = s.hero;
    const td = !h.action && heroTakedown(), alert = s.alertT > 0;
    ui.hud({
      objective: s.ledger ? { step: '02 / 02', title: 'Slip out by the east gate', text: 'Down in the street, at the far end', at: { x: EXIT.x, y: EXIT.y, z: 0 }, from: h }
        : { step: '01 / 02', title: 'Steal the ledger', text: 'On the brick roof', at: LEDGER, from: h },
      status: h.exposure === 0 ? { text: 'Hidden', color: '#9ae89a' } : alert ? { text: 'Hunted', color: '#ff4a3a' } : h.crouch ? 'Crouched' : null,
      bars: [{ label: 'Health', value: s.hp, max: s.maxHp, kind: 'pips', color: '#e8505a' }],
      counts: [['Silent Cuts', s.kills], ['Spotted', s.alerts]],
      prompt: td ? { act: 'attack', label: 'Silent Cut', hint: td[1] ? 'From above' : 'From behind' } : parrying() ? { act: 'block', label: 'Parry' } : null,
      keys: [[k('crouch'), 'Crouch'], [k('attack'), 'Strike / Cut'], [k('block'), 'Block'], [k('dodge'), 'Roll']]
    });
  }

  /* Ki gauge and Shadow Sight, drawn by hand in screen pixels */
  const KI_COL = { calm: '#5ad8c8', notice: '#f0d050', search: '#f09040', alert: '#ff4a3a' };
  function kiReading() {
    let best = null;
    for (const g of s.guards) {
      if (g.dead) continue;
      const d = Math.hypot(g.x - s.hero.x, g.y - s.hero.y);
      if (d > T('kiRange')) continue;
      const k = Math.round(99 * (1 - d / T('kiRange')));
      if (!best || k > best.k) best = { k, state: g.mind.state };
    }
    return best;
  }
  /* Shadow Sight: a guard is visible if it can be seen, sensed if within the Ki range, hidden otherwise */
  function shadowState(g) {
    if (g.dead) return 'dead';
    if (T('reveal')) return 'visible';
    const d = Math.hypot(g.x - s.hero.x, g.y - s.hero.y);
    if (d <= 200 && map.sight(s.hero, g)) return 'visible';
    if (d <= T('kiRange')) return 'sensed';
    return 'hidden';
  }

  /* the autopilot (attract mode): walks the flow field to the ledger, then to the exit, with cheats on */
  function autoIntent(dt) {
    const h = s.hero, goal = !s.ledger ? LEDGER : EXIT;
    if (!flow) flow = new E.FlowField(map, { climb: 30, drop: 56, jump: 40 });
    flow.update(goal.x, goal.y);
    const nx = flow.next(h.x, h.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - h.x, ty - h.y) || 1;
    const move = Math.hypot(goal.x - h.x, goal.y - h.y) > 6 ? [(tx - h.x) / l, (ty - h.y) / l] : [0, 0];
    const jump = !!(nx && h.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < h.r + 4);
    return { move, sprint: false, crouch: false, jumpPressed: jump, pressed: () => false, down: () => false, consume: () => {} };
  }

  /* --- the scene --- */
  function enter(data) {
    const char = CHARS[data && data.char] ? data.char : 'sojiro', C = CHARS[char];
    s.char = char; s.mode = (data && data.mode) || 'play'; s.autopilot = s.mode === 'attract';
    const sp = map.find('hero');
    s.hero = new E.Mover({ x: sp.x, y: sp.y, r: 5, climbAny: true, climbMax: 30, run: T('heroRun') * C.run / 70, walk: 30 }); s.hero.facing = 0;
    s.rig = new E.Humanoid({ size: 1.2, build: 'heroic', hood: char === 'kaede', weapon: C.weapon, bladeLen: 7, outfit: 'coat', sleeves: 'long',
      cape: { len: 6, width: 5, seg: 2.4 }, colors: { ...C.colors, metal: '#e8e8f0' } });
    s.attack = new E.Attack('slash', { reach: 9 });
    s.guards = ROUTES.map(makeGuard);
    s.checkpoint = null; s.ledger = false; s.won = false; s.over = false; s.maxHp = Math.max(1, T('heroHp') - (char === 'kaede' ? 1 : 0)); s.hp = s.maxHp; s.hurtT = 0; s.alertT = 0;
    s.alerts = 0; s.kills = 0; s.wounds = 0; s.time = 0;
    game.follow(s.hero, { z: 18 }); game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -10];
    L.enabled = true; L.ambient = .6;
    A.music(SONG); A.layer('chase', 0, .02); A.layer('alarm', 0, .02);
    if (s.mode !== 'attract') game.note(C.name + ' slips into the street of Kokaku', 2.5);
    if (s.mode === 'attract') game.note('ATTRACT: press any key', 2);
  }

  function update(dt) {
    s.time += dt;
    if (s.hurtT > 0) s.hurtT -= dt;
    const I = s.autopilot ? autoIntent(dt) : game.input;
    if (s.won || s.over) { hud(); s.rig.update(dt, s.hero.rigState({ pose: s.won ? 'cheer' : null })); return; }
    heroUpdate(dt, I);
    for (const g of s.guards) guardUpdate(g, dt);
    const alert = s.guards.some(g => !g.dead && g.mind.state === 'alert');
    if (alert !== s.alertT > 0) { s.alertT = alert ? 1 : 0; A.layer('chase', alert ? 1 : 0, alert ? .4 : 2.5); A.layer('alarm', alert ? 1 : 0, alert ? .8 : 2.5); }
    s.rig.update(dt, s.hero.rigState({ attack: s.attack.state, pose: !s.autopilot && game.input.down('block') && !s.hero.action ? 'block' : null, hurt: s.hurtT > 0 }));
    for (const g of s.guards) {
      if (g.dead) { g.rig.update(dt, g.action && g.action.other === g ? g.action.otherState() : { x: g.x, y: g.y, z: g.z, facing: g.facing, down: 1 }); continue; }
      g.rig.update(dt, g.rigState({ attack: g.swing.state, stance: g.mind.state === 'alert' ? 'ready' : null, hurt: g.stun > 0 }));
      if (g.bark > 0) g.bark -= dt;
    }
    if (s.mode !== 'attract') hud();
  }

  const LAMP_COL = '#ffb060';
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const [x, y] of GRASS) r.prop('grass', x, y, 0, { size: 1.3 });
    for (const [x, y] of LAMPS) r.prop('lamp', x, y, 0, { light: true });
    if (!s.ledger) L.add(LEDGER.x, LEDGER.y, LEDGER.z + 6, 40, .8, { color: '#ffd060' }); else L.add(EXIT.x, EXIT.y, 12, 56, .9, { color: '#80e0ff' });
    const bx = BELL.x, by = BELL.y, w = BELL.w, H = BELL.H, z = BELL.z;
    r.queue(bx, by, z, g => { const P2 = (x, y, zz) => r.w(x, y, zz), c = [P2(bx - w, by - w, z), P2(bx + w, by - w, z), P2(bx + w, by + w, z), P2(bx - w, by + w, z)], tip = P2(bx, by, z + H);
      for (let i = 0; i < 4; i++) px.poly(g, [c[i], c[(i + 1) % 4], tip], ['#7a3a2a', '#9a4a32', '#6a2a22', '#8a4232'][i]);
      px.line(g, tip[0], tip[1], tip[0], tip[1] - 6, '#e8c860'); }, { footprint: [bx - w, by - w, bx + w, by + w] });
    const seen = new Map();
    for (const g of s.guards) {
      const sh = shadowState(g); seen.set(g, sh);
      if (sh === 'visible' && !g.dead) r.sightCone(g, { map, range: T('sightRange'), fov: T('sightFov'), color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .22 : .38 });
    }
    if (!s.ledger) r.sprite(LEDGER.x, LEDGER.y, LEDGER.z + 4 + Math.sin(game.time * 3) * 1.5, BOOK, { glow: .6 });
    const shadow = b => r.shadow(b.x, b.y, 6, .35, undefined, map.groundAt(b.x, b.y, b.r, b.z));
    shadow(s.hero);
    r.actor(s.hero.x, s.hero.y, s.hero.z, (g, ox, oy) => s.rig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: s.hurtT > 0, alpha: s.hero.exposure === 0 ? .55 : 1 });
    for (const g of s.guards) {
      const sh = seen.get(g);
      if (sh === 'hidden') continue;
      if (sh === 'sensed') { r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { alpha: .35, flash: false }); continue; }
      shadow(g); r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { flash: g.stun > 0 && Math.floor(game.time * 10) % 2 === 0 });
    }
    r.marker(s.ledger ? EXIT.x : LEDGER.x, s.ledger ? EXIT.y : LEDGER.y, s.ledger ? 0 : LEDGER.z, { label: s.ledger ? 'EAST GATE' : 'LEDGER', color: s.ledger ? '#80e0ff' : '#ffd040' });
    r.overlay(g => {
      for (const gd of s.guards) if (!gd.dead && gd.mind.state !== 'calm' && seen.get(gd) === 'visible') {
        const [sx, sy] = r.w(gd.x, gd.y, gd.z + 46), a = gd.mind.state === 'alert';
        E.font.text(g, a ? '!' : '?', Math.round(sx), Math.round(sy) - 8, MOOD[gd.mind.state], { align: 'center', shadow: '#000' });
        E.ui.bar(g, Math.round(sx) - 6, Math.round(sy) + 2, 12, 2, Math.min(1, gd.mind.level), MOOD[gd.mind.state]);
      }
      if (s.mode !== 'attract') drawKi(g, r);
    });
  }
  function drawKi(g, r) {
    const k = kiReading(), x = 8, y = r.H - 42;
    E.font.text(g, 'KI', x, y - 10, '#b8a890', { shadow: '#000' });
    const col = k ? KI_COL[k.state] : '#5a5a6a';
    E.font.title(g, k ? String(k.k).padStart(2, '0') : '--', x + 22, y - 12, { scale: 2, colors: [col, col], align: 'left' });
    if (k && k.k >= 50) { const pulse = .5 + .5 * Math.sin(game.time * (2 + k.k / 50) * Math.PI); px.blend(g, pulse * .25, 'add', () => px.rect(g, 0, 0, r.W, r.H, '#ff3020')); }
  }

  return { view: 'iso', views: ['iso', 'threequarter'], input: 'THIRDPERSON', res: 'ps1', pausable: true, touch: [],
    camera: { zoom: [.75, 2], rotate: true }, enter, update, draw, exit() { game.cam.offset = null; L.enabled = false; ui.hud({}); },
    state: () => ({ hero: s.hero, guards: s.guards, map, ledger: s.ledger, won: s.won, hp: s.hp, kills: s.kills, alerts: s.alerts, time: s.time }),
    skipToExit, LEDGER, EXIT };
})();

/* ---- TITLE, ATTRACT, DEV, ABOUT ------------------------------------------------------------- */
const TITLE = (() => {
  let menu = null, idle = 0, charIndex = 0, lastDev = null;
  const MID = 480;
  const entries = () => {
    const c = CHARS[CHAR_KEYS[charIndex]];
    const list = ['New Mission', 'Character: ' + c.name, 'Settings', 'About', 'Dev Mode'];
    return list;
  };
  const build = () => { menu = new E.Menu(game, entries(), { y: 118, onPick: pick }); };
  function pick(i) {
    if (i === 0) game.go('play', { char: CHAR_KEYS[charIndex] }, { fade: 'iris' });
    else if (i === 1) { charIndex = (charIndex + 1) % CHAR_KEYS.length; build(); }
    else if (i === 2) game.menu('settings');
    else if (i === 3) showAbout(0);
    else if (i === 4) openDev();
  }
  return {
    view: 'side', views: ['side', 'brawler'], input: 'DEFAULT', res: 'ps1', pausable: false, touch: [],
    enter() { idle = 0; lastDev = null; if (!menu) build(); },
    update(dt) {
      const I = game.input, any = I.anyPressed() || (I.lastDevice !== lastDev && lastDev !== null);
      lastDev = I.lastDevice;
      if (any) idle = 0; else idle += dt;
      if (touchOnly()) { if (I.pressed('start')) game.menu('settings'); return; }
      if (idle >= 10) { game.go('attract', { mode: 'attract', char: CHAR_KEYS[charIndex] }, { fade: 0 }); return; }
      menu.update(dt);
    },
    draw(r) {
      const bg = titleBg();
      bg.draw(r);
      r.overlay(g => {
        E.font.title(g, 'BENTOU 2', r.W / 2, 14, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
        E.font.text(g, 'Birth of the Lunchbox Assassins', r.W / 2, 52, '#e8e0ff', { align: 'center', shadow: '#140c1c', outline: false });
      });
      if (touchOnly()) {
        r.overlay(g => {
          E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H / 2 - 10, '#ffe08a', { align: 'center', shadow: '#000', scale: 2 });
          E.font.text(g, 'Connect a controller or a keyboard to play.', r.W / 2, r.H / 2 + 14, '#f4ead5', { align: 'center', shadow: '#000' });
        });
      } else menu.draw(r);
      r.overlay(g => E.font.text(g, 'Kokaku street, the night of the trial', 6, r.H - 12, '#b8a890', { shadow: '#000', outline: false }));
    }
  };
  function titleBg() { return titleBg.bg || (titleBg.bg = new E.Backdrop('castle-night')); }
  return { build, pick, reset() { menu = null; } };
})();

const DEV_LIST = [
  { key: 'sightRange', label: 'Guard sight range', values: [60, 80, 110, 140, 180] },
  { key: 'sightFov', label: 'Guard field of view', values: [1, 1.2, 1.5, 1.8, 2.2] },
  { key: 'kiRange', label: 'Ki sense range', values: [100, 130, 160, 200, 260] },
  { key: 'suspRise', label: 'Suspicion rise speed', values: [.8, 1.2, 1.6, 2.2, 3] },
  { key: 'guardRun', label: 'Guard run speed', values: [50, 60, 70, 85, 100] },
  { key: 'heroRun', label: 'Hero run speed', values: [60, 70, 85, 100, 120] },
  { key: 'heroHp', label: 'Hero health', values: [1, 2, 3, 5, 9] },
  { key: 'godMode', label: 'God mode', values: [false, true] },
  { key: 'reveal', label: 'Reveal all (Shadow Sight off)', values: [false, true] }
];
function openDev() {
  const actions = DEV_LIST.map(d => {
    const v = TUNE[d.key];
    const shown = typeof v === 'boolean' ? (v ? 'On' : 'Off') : String(v);
    return [d.label + ':  ' + shown, () => { const i = d.values.indexOf(v), next = d.values[(i + 1) % d.values.length]; TUNE[d.key] = next; openDev(); }];
  });
  actions.push(['Reset to defaults', () => { Object.assign(TUNE, TUNE_DEFAULTS); openDev(); }]);
  actions.push(['Cheat: take the ledger', () => { MISSION.skipToExit(); }]);
  actions.push(['Back', () => ui.hide()]);
  ui.show('dev', { kicker: 'Dev Mode', title: 'Balance sliders', text: ['Select a row to step its value. Changes apply at once.'], actions });
}
function showAbout(page) {
  const PAGES = BENTOU_ABOUT;
  const p = PAGES[page], next = page + 1 < PAGES.length ? page + 1 : 0, prev = page > 0 ? page - 1 : PAGES.length - 1;
  ui.show('about', { kicker: 'About and credits  ' + (page + 1) + ' / ' + PAGES.length, title: p.title, text: p.text,
    actions: [{ label: 'Previous page', fn: () => showAbout(prev) }, { label: 'Next page', fn: () => showAbout(next), primary: true }, { label: 'Back', fn: () => ui.hide() }] });
}

/* ---- REGISTER SCENES ------------------------------------------------------------------------- */
scenes.title = TITLE;
scenes.play = MISSION;
scenes.attract = { ...MISSION, pausable: false, touch: [],
  update(dt) { if (game.input.anyPressed()) { game.go('title', null, { fade: 0 }); return; } MISSION.update(dt); } };
game.start({ scenes, scene: 'title', boot: { title: 'BENTOU 2', steps: [] } });
window.__BENTOU = { game, scenes, TUNE, TUNE_DEFAULTS, MISSION, TITLE, ui, DIFFICULTY, CHARS };
})();
