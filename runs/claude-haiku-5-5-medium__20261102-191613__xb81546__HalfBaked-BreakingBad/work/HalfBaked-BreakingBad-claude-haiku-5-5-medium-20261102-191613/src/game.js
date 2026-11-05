/*
 * HALF BAKED: the game. Scenes on the my-3D2dge engine, rules from logic.js, words from text.js,
 * levels from maps.js, sound from audio.js. Pure rules live in logic.js so tests can run them.
 */
(function () {
  'use strict';
  var E = My3D2dge, px = E.px;
  var HB = window.HB, T = HB.TEXT, MAPS = HB.MAPS;
  var SAVE_KEY = 'halfbaked.save.v1';

  // ---- Game and settings -----------------------------------------------------------------
  var game = new E.Game({
    canvas: 'screen',
    res: 'snes',
    expand: true,
    view: 'threequarter',
    views: ['threequarter', 'topdown', 'iso'],
    // Keys PC players expect: WASD or arrows to move, J or X or a click to strike, Shift or K to dash.
    // Space and Enter confirm, so Space never also dashes.
    input: {
      up: ['KeyW', 'ArrowUp', 'Pad12'],
      down: ['KeyS', 'ArrowDown', 'Pad13'],
      left: ['KeyA', 'ArrowLeft', 'Pad14'],
      right: ['KeyD', 'ArrowRight', 'Pad15'],
      confirm: ['Enter', 'Space', 'KeyE', 'Pad0'],
      cancel: ['Escape', 'Backspace', 'Pad1'],
      attack: ['KeyJ', 'KeyX', 'Mouse0', 'Pad2'],
      dash: ['ShiftLeft', 'ShiftRight', 'KeyK', 'Pad5'],
      skill: ['KeyL', 'Pad3'],
      start: ['Enter', 'Pad9'],
      pause: ['Escape', 'KeyP', 'Pad9']
    },
    id: 'half-baked',
    menu: {
      items: [['Start the shift over', function () { startShift(); }]],
      quit: 'title'
    }
  });
  game.input.touchEnabled = false; // controller or keyboard only: no on-screen touch controls
  HB.installAnimalese(game.audio);

  game.settings.define({ key: 'invertX', label: 'Invert stick left/right', type: 'toggle', value: false, group: 'Controller', help: 'Flips the left stick sideways. Fixes drift on some pads.' });
  game.settings.define({ key: 'invertY', label: 'Invert stick up/down', type: 'toggle', value: false, group: 'Controller', help: 'Flips the left stick up and down.' });
  game.settings.define({ key: 'glyphs', label: 'Button glyphs', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox (A B X Y)']], group: 'Controller', help: 'The button names drawn on screen for a controller.' });

  var talk = new E.Dialog(game, { speed: 42 });

  // ---- State -----------------------------------------------------------------------------------
  var S = null;
  function freshShift(seed) {
    return {
      seed: seed, rng: HB.mulberry32(seed), chapter: 'lab', t: 0,
      cash: 0, heat: 0, peakHeat: 0, product: null, cooked: false,
      sold: [false, false, false], busts: 0, purities: [],
      heroHP: HB.BOSS.heroHearts, bossHP: HB.BOSS.hp,
      attract: false, hub: false, resultSent: false, intro: {}
    };
  }
  function startShift(seed) {
    S = freshShift(seed === undefined ? 20261102 : seed);
    saveProgress();
    game.go('lab', {});
  }
  function saveProgress() {
    if (!S || S.attract || S.hub) return;
    E.store.set(SAVE_KEY, {
      chapter: S.chapter, cash: S.cash, product: S.product, cooked: S.cooked,
      sold: S.sold, busts: S.busts, purities: S.purities, seed: S.seed, intro: S.intro, heroHP: S.heroHP
    });
  }

  // ---- Characters ------------------------------------------------------------------------------
  var PALETTE = {
    hollis: { skin: '#d6a27a', hair: '#8a8074', cloth: '#ece6d6', coat: '#434a5c', pants: '#2c3140', boot: '#2a1d14', belt: '#1c1812' },
    cody: { skin: '#e0b28c', hair: '#c9a55a', cloth: '#f2f0ea', coat: '#c2a14a', pants: '#3d4a5e', boot: '#3a2a1a', belt: '#22180e' },
    gil: { skin: '#caa07a', hair: '#2a2420', cloth: '#f4f1e8', coat: '#2f6b4f', pants: '#3a3428', boot: '#201a12', belt: '#1a1510' },
    lupe: { skin: '#b57d55', hair: '#1c1510', cloth: '#b5473a', coat: '#b5473a', pants: '#402a22', boot: '#2a1d14', belt: '#1a120c' },
    ferris: { skin: '#e8c0a0', hair: '#5a4c6e', cloth: '#dcd3e6', coat: '#7d5a9e', pants: '#2f2a3a', boot: '#1f1a25', belt: '#120e18' },
    vance: { skin: '#a8724c', hair: '#101010', cloth: '#f2f2f2', coat: '#1f1f24', pants: '#18181c', boot: '#0c0c0e', belt: '#050505' },
    agent: { skin: '#d8a882', hair: '#5a4a32', cloth: '#6b6250', coat: '#6b6250', pants: '#3d3a30', boot: '#24201a', belt: '#171410' }
  };
  var MAKE = {
    hollis: function () { return new E.Humanoid({ size: 1.3, hat: 'band', outfit: 'coat', hair: 'short', sleeves: 'long', weapon: null, colors: PALETTE.hollis }); },
    cody: function () { return new E.Humanoid({ size: 1.25, hat: 'cap', outfit: 'shirt', hair: 'spiky', sleeves: 'short', weapon: null, colors: PALETTE.cody }); },
    gil: function () { return new E.Humanoid({ size: 1.25, outfit: 'coat', hair: 'short', sleeves: 'long', weapon: null, colors: PALETTE.gil }); },
    lupe: function () { return new E.Humanoid({ size: 1.25, outfit: 'robe', hair: 'long', sleeves: 'short', weapon: null, colors: PALETTE.lupe }); },
    ferris: function () { return new E.Humanoid({ size: 1.25, hat: 'pointed', outfit: 'coat', hair: 'ponytail', sleeves: 'long', weapon: null, colors: PALETTE.ferris }); },
    vance: function () { return new E.Humanoid({ size: 1.9, build: 'bulky', outfit: 'coat', hair: 'bald', sleeves: 'long', weapon: null, colors: PALETTE.vance }); },
    agent: function () { return new E.Humanoid({ size: 1.3, hat: 'helmet', outfit: 'coat', hair: 'short', sleeves: 'long', weapon: 'gun', colors: PALETTE.agent }); }
  };
  var NAMES = { hollis: 'HOLLIS', cody: 'CODY', gil: 'GIL', lupe: 'LUPE', ferris: 'FERRIS', vance: 'VANCE', agent: 'AGENT' };
  var portraitRigs = {};
  function portraitFor(who) {
    if (!portraitRigs[who]) portraitRigs[who] = MAKE[who]();
    return portraitRigs[who];
  }

  // A moving thing on the ground: Body for collision, a rig for the look.
  function actor(who, at, opts) {
    var body = new E.Body({ x: at.x, y: at.y, r: 5 });
    var a = { who: who, body: body, rig: MAKE[who](), facing: (opts && opts.facing) || 0, vx: 0, vy: 0, hurt: 0 };
    return a;
  }
  function rigUpdate(dt, a, extra) {
    var s = { x: a.body.x, y: a.body.y, z: a.body.z || 0, vx: a.body.vx, vy: a.body.vy, facing: a.facing };
    if (extra) for (var k in extra) s[k] = extra[k];
    a.rig.update(dt, s);
  }

  // ---- Rules shared by the chapters ----------------------------------------------------------------
  function fmtMoney(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function fmtTime(sec) {
    var s = Math.floor(sec), m = Math.floor(s / 60);
    return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  // Which way the player is pushing, on the ground. Gamepad sticks respect the invert settings.
  function heroInputDir(dt) {
    var m = game.input.move();
    if (game.input.lastDevice === 'gamepad') {
      m = [HB.axis(m[0], game.settings.invertX), HB.axis(m[1], game.settings.invertY)];
    }
    return game.view.screenDirToGround(m[0], m[1]);
  }

  function setVelocity(a, dir, speed) {
    a.body.vx = dir[0] * speed;
    a.body.vy = dir[1] * speed;
    if (Math.hypot(dir[0], dir[1]) > 0.1) a.facing = Math.atan2(dir[1], dir[0]);
  }

  // Input from the player (or the attract AI) moves the hero; the Body keeps it out of walls.
  function stepHero(dt, H, dir, speed) {
    setVelocity(H.a, dir, speed);
    H.a.body.update(dt, H.map);
    rigUpdate(dt, H.a, { hurt: H.a.hurt > 0 ? 1 : 0, air: false });
  }

  // Walk toward a point with the flow field (walls and cover in the way).
  function dirToward(H, tx, ty) {
    var b = H.a.body;
    if (!H.flow) return [0, 0];
    H.flow.update(tx, ty);
    var d = H.flow.dir(b.x, b.y, tx, ty);
    var dist = Math.hypot(tx - b.x, ty - b.y);
    if (dist < 4) return [0, 0];
    return d;
  }

  function nearest(list, x, y) {
    var best = null, bd = Infinity;
    for (var i = 0; i < list.length; i++) {
      var d = Math.hypot(list[i].x - x, list[i].y - y);
      if (d < bd) { bd = d; best = list[i]; }
    }
    return { item: best, d: bd };
  }

  // ---- Prompts and glyphs ----------------------------------------------------------------------------
  var GLYPH_COLOR = { cross: '#5b8cff', circle: '#ff5a5a', square: '#e46bd6', triangle: '#5fd39a', A: '#5fbf4f', B: '#e05a4a', X: '#4a8fe0', Y: '#e8c341' };
  function drawGlyph(g, x, y, action) {
    var dev = game.input.lastDevice || 'keyboard';
    var label = game.input.label(action, dev === 'touch' ? 'keyboard' : dev);
    var gl = HB.glyph(action, dev, game.settings.glyphs, label);
    if (gl.kind === 'text') {
      var w = E.font.width(gl.text) + 5;
      px.rect(g, x, y, w, 10, '#15111f');
      px.rect(g, x, y + 9, w, 1, '#5a4e74');
      E.font.text(g, gl.text, x + 3, y + 2, '#f4f0ff');
      return w;
    }
    var rr = 5, cx = x + rr, cy = y + rr, c = GLYPH_COLOR[gl.name] || '#ffffff';
    if (gl.style === 'xbox') {
      px.disc(g, cx, cy, rr, GLYPH_COLOR[gl.name] || '#888');
      E.font.text(g, gl.name === 'MENU' ? 'M' : gl.name, cx - 2, cy - 3, '#ffffff', { outline: false, shadow: false });
      return rr * 2 + 2;
    }
    if (gl.name === 'cross') {
      px.disc(g, cx, cy, rr, c);
      px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, '#ffffff', 1);
      px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, '#ffffff', 1);
    } else if (gl.name === 'circle') {
      px.disc(g, cx, cy, rr, c);
      px.disc(g, cx, cy, rr - 2, '#2a1820');
    } else if (gl.name === 'square') {
      px.disc(g, cx, cy, rr, c);
      px.rect(g, cx - 2, cy - 2, 5, 5, '#ffffff');
      px.rect(g, cx - 1, cy - 1, 3, 3, c);
    } else if (gl.name === 'triangle') {
      px.disc(g, cx, cy, rr, c);
      px.poly(g, [[cx, cy - 3], [cx + 3, cy + 2], [cx - 3, cy + 2]], '#ffffff');
    } else {
      var label2 = gl.name === 'options' ? 'OPT' : gl.name === 'r1' ? 'R1' : gl.name;
      var w2 = E.font.width(label2) + 5;
      px.rect(g, x, y, w2, 10, '#2e2a3a');
      E.font.text(g, label2, x + 3, y + 2, '#f4f0ff');
      return w2;
    }
    return rr * 2 + 2;
  }
  // "press [glyph] to <word>" drawn near the centre bottom.
  function promptLine(r, action, word) {
    r.overlay(function (g) {
      var label = word;
      var w = E.font.width(label) + 26;
      var x = Math.round(r.W / 2 - w / 2), y = r.H - 34;
      px.rect(g, x - 4, y - 4, w + 8, 16, '#120e1acc');
      var gw = drawGlyph(g, x, y, action);
      E.font.text(g, label, x + gw + 4, y + 2, '#f4f0ff');
    });
  }

  // ---- HUD (screen pixels) -----------------------------------------------------------------------------
  function hud(r, objective) {
    r.overlay(function (g) {
      px.rect(g, 4, 4, 92, 30, '#120e1ac8');
      E.font.text(g, T.hud.cash, 8, 7, '#d9b77c');
      E.font.text(g, fmtMoney(S.cash), 8, 16, '#f4f0ff');
      var heatCol = S.heat > 70 ? '#ff5a5a' : S.heat > 40 ? '#ffd36a' : '#7fd3a0';
      E.font.text(g, T.hud.heat, 50, 7, '#d9b77c');
      px.rect(g, 50, 17, 40, 5, '#2a2438');
      px.rect(g, 50, 17, Math.round(40 * S.heat / HB.HEAT.max), 5, heatCol);
      if (S.product) {
        E.font.text(g, T.hud.batch + ' ' + S.product.units + ' u', 8, 25, '#f4f0ff');
      }
      if (typeof S.heroHP === 'number' && S.chapter === 'yard') {
        E.ui.hearts(g, r.W - 86, 6, S.heroHP, HB.BOSS.heroHearts);
      }
      if (objective) {
        px.rect(g, 4, r.H - 14, r.W - 8, 10, '#120e1ac8');
        E.font.text(g, objective, 8, r.H - 12, '#f4f0ff');
      }
      if (S.attract) {
        E.font.text(g, T.hud.autoplay, r.W / 2, 6, '#ffd36a', { align: 'center' });
      }
    });
  }

  // Scripted talk: lines are [speaker, text]; `vars` fills {$name} markup.
  function say(list, done, vars) {
    if (S && S.attract) { if (done) done(); return; } // the attract run never waits on a line
    var i = 0;
    function next() {
      if (i >= list.length) { if (done) done(); return; }
      var line = list[i++];
      talk.voice = HB.VOICES[line[0]] || HB.VOICES.narrator;
      var fmt = line[1].replace(/\$\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined ? vars[k] : m; });
      talk.say(fmt, {
        name: NAMES[line[0]] || '',
        portrait: NAMES[line[0]] ? portraitFor(line[0]) : null,
        vars: vars || {},
        onDone: next
      });
    }
    next();
  }

  // ---- Title and attract ------------------------------------------------------------------------------------
  var hubInfo = null, menu = null, idle = 0, touchOnly = false, hasCheckpoint = false;
  var padPrev = {};

  // Any input at all (a key, a click, a pad button), for leaving attract and the idle timer.
  // Unlike game.input.anyPressed(), a key that no action uses still counts.
  var inputFlag = false;
  window.addEventListener('keydown', function () { inputFlag = true; }, true);
  window.addEventListener('pointerdown', function () { inputFlag = true; }, true);
  function anyInputSince() {
    var pressed = inputFlag;
    inputFlag = false;
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < pads.length; i++) {
      if (!pads[i]) continue;
      for (var b = 0; b < pads[i].buttons.length; b++) if (gamepadEdge(i, b)) pressed = true;
    }
    return pressed;
  }

  function gamepadEdge(index, button) {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var pad = pads && pads[index];
    var down = !!(pad && pad.buttons && pad.buttons[button] && pad.buttons[button].pressed);
    var key = index + ':' + button;
    var was = !!padPrev[key];
    padPrev[key] = down;
    return down && !was;
  }

  function detectTouchOnly() {
    var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    var fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
    var pads = 0;
    if (navigator.getGamepads) {
      var list = navigator.getGamepads();
      for (var i = 0; i < list.length; i++) if (list[i]) pads++;
    }
    return HB.isTouchOnly({ touch: touch, finePointer: fine, pads: pads });
  }

  function titleItems() {
    var items = [];
    items.push({ label: 'NEW SHIFT', key: 'new' });
    items.push(hasCheckpoint ? { label: 'CONTINUE', key: 'continue' } : { label: 'CONTINUE', key: 'continue', disabled: true });
    if (hubInfo) items.push({ label: 'PLAY TOGETHER', key: 'hub' });
    items.push({ label: 'OPTIONS', key: 'options' });
    items.push({ label: 'ABOUT & CREDITS', key: 'credits' });
    return items;
  }
  function buildTitleMenu() {
    menu = new E.Menu(game, titleItems(), {
      x: 'center', y: 118,
      onPick: function (i, item) {
        if (item.key === 'new') { startShift(); }
        else if (item.key === 'continue') { continueShift(); }
        else if (item.key === 'hub') { joinHub(); }
        else if (item.key === 'options') { game.menu('settings'); }
        else if (item.key === 'credits') { game.go('credits', {}); }
      }
    });
  }

  function continueShift() {
    var save = E.store.get(SAVE_KEY, null);
    if (!save) return;
    S = freshShift(save.seed);
    S.cash = save.cash || 0; S.product = save.product || null; S.cooked = !!save.cooked;
    S.sold = save.sold || S.sold; S.busts = save.busts || 0; S.purities = save.purities || [];
    S.intro = save.intro || {}; S.heroHP = typeof save.heroHP === 'number' ? save.heroHP : HB.BOSS.heroHearts;
    game.go(save.chapter || 'lab', {});
  }

  var joinedHub = false;
  function joinHub() {
    if (!window.AIHub || !hubInfo) return;
    AIHub.ready();
    joinedHub = true;
  }

  function wireHub(info) {
    AIHub.on('start', function () {
      S = freshShift(info.seed || 1);
      S.hub = true;
      game.go('lab', {});
    });
    AIHub.on('time-up', function () { finishHubRound('time-up'); });
    AIHub.on('end', function () { if (S && S.hub) { game.go('results', { hub: true }); } });
  }
  function finishHubRound(reason) {
    if (!S || !S.hub || S.resultSent) return;
    S.resultSent = true;
    AIHub.result({ score: HB.shiftScore(S.cash), stats: { heat: Math.round(S.peakHeat), purity: S.purities.length ? Math.max.apply(null, S.purities) : 0 } });
    if (reason === 'time-up') game.go('results', { hub: true, timeUp: true });
  }

  // ---- Attract: a scripted run of the three chapters, cheating freely ----------------------------
  function startAttract() {
    anyInputSince(); // forget the input that came before: only new input leaves the attract run
    S = freshShift(777);
    S.attract = true;
    S.product = null; S.cooked = false;
    game.go('lab', { attract: true });
  }

  // Any input while attracting returns to the title.
  function attractExit() {
    if (anyInputSince()) {
      // The state stays until the title takes over (its enter clears it): this frame still draws the chapter.
      game.go('title', {});
      return true;
    }
    return false;
  }

  // ---- Chapter world builder -----------------------------------------------------------------------------------
  function buildMap(name, legend, types, floorTex, outside) {
    return new E.TileMap({
      rows: MAPS[name], legend: legend, types: types,
      floorTex: floorTex, ao: 5, outside: outside
    });
  }

  var LAB_TYPES = {
    1: { h: 30, top: '#8f8c84', side: '#5b5852', face: 'plaster', roof: 'plain' },
    2: { h: 18, top: '#7a5a33', side: '#4a3620', face: 'plank', roof: 'plain' }
  };
  var DESERT_TYPES = {
    1: { h: 26, top: '#d2b07c', side: '#8a6a40', face: 'plaster', roof: 'plain' },
    3: { h: 22, top: '#a88f70', side: '#6a5840', face: 'rock', roof: 'grass' }
  };
  var YARD_TYPES = {
    1: { h: 36, top: '#8c8788', side: '#5a5558', face: 'stone', roof: 'plain' },
    3: { h: 20, top: '#6e6a68', side: '#434040', face: 'rock', roof: 'plain' }
  };

  function labFloor(x, y) {
    return E.tex.flagstone(x, y, {
      stones: [E.hex('#5b5f66'), E.hex('#62666e')], mortar: E.hex('#2f3237'),
      hi: E.hex('#77808a'), lo: E.hex('#41464e'), speck: E.hex('#33373d')
    });
  }
  function desertFloor(x, y) {
    return E.tex.dirt(x, y, { base: E.hex('#c9a66b'), dark: E.hex('#a8844f'), light: E.hex('#e2c58f') });
  }
  // A plain concrete lot, so it reads as ground rather than a wall of bricks.
  function yardFloor(x, y) {
    return E.tex.plain(x, y, { base: E.hex('#5d5a66'), amount: 0.14 });
  }

  // The scene's own state, reset on each enter.
  var W = null;

  function baseWorld(mapName, legend, types, floorFn, outside, view) {
    var map = buildMap(mapName, legend, types, floorFn, outside);
    var H = { map: map, a: null, flow: new E.FlowField(map), npcs: [], props: [] };
    return H;
  }

  function spawnHeroAt(H, tag) {
    var p = H.map.find(tag);
    H.a = actor('hollis', p);
    H.a.body.x = p.x; H.a.body.y = p.y;
    H.a.hp = S.heroHP;
  }

  function focusHero() {
    if (W && W.H && W.H.a) game.focus(W.H.a.body.x, W.H.a.body.y, 10);
  }

  function cycleCamera() {
    game.nextView();
  }
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyV' && !e.repeat) cycleCamera();
  });

  function onChapterStart(name) {
    S.chapter = name;
    saveProgress();
    HB.playSong(game, name === 'lab' ? 'lab' : name === 'street' ? 'street' : 'boss');
  }

  // ---- Chapter 1: the garage (cook) --------------------------------------------------------------------------
  var COOK_DELAY = 0.35;

  function labEnter(data) {
    data = data || {};
    S.attract = !!data.attract;
    onChapterStart('lab');
    var H = baseWorld('lab', { '#': 1, W: 2, '@': 'hero', C: 'cody', B: 'cook', D: 'exit' }, LAB_TYPES, labFloor, false);
    W = { H: H, cook: null, nearStation: false, nearExit: false };
    spawnHeroAt(H, 'hero');
    H.cody = actor('cody', H.map.find('cody'));
    H.cody.body.x = H.map.find('cody').x; H.cody.body.y = H.map.find('cody').y;
    H.station = H.map.find('cook');
    H.exit = H.map.find('exit');
    game.lights.enabled = true;
    game.lights.ambient = 0.45;
    game.cam.bounds = function (v) { return H.map.bounds(v); };
    focusHero();
    if (!S.attract && !S.intro.lab) {
      S.intro.lab = true;
      say(T.lab.intro, null);
    }
  }

  function labExit() {
    W = null;
    talk.close();
    game.lights.enabled = false;
  }

  function cookBegin() {
    W.cook = { stage: 0, t: 0, scores: [], done: false, lockT: 0 };
  }

  function cookPress() {
    var c = W.cook;
    if (!c || c.done || c.lockT < COOK_DELAY) return;
    var st = HB.COOK_STAGES[c.stage];
    var pos = HB.marker(c.t, st.period);
    c.scores.push(HB.stageScore(pos, st.target, st.tol));
    c.stage++;
    c.t = 0;
    c.lockT = 0;
    if (c.stage >= HB.COOK_STAGES.length) {
      var purity = HB.purityFrom(c.scores);
      c.done = true;
      S.product = { purity: purity, units: HB.unitsFor(purity), grade: HB.cookGrade(purity) };
      S.cooked = true;
      S.purities.push(purity);
      saveProgress();
    }
  }

  function cookTick(dt) {
    var c = W.cook;
    c.t += dt;
    c.lockT += dt;
    if (c.done) {
      W.cook = null;
      var vars = { purity: S.product.purity, grade: S.product.grade };
      var line = S.product.purity < 45 ? [T.lab.cookBad] : [T.lab.cookDone];
      say(line, null, vars);
      return;
    }
  }

  function labUpdate(dt) {
    if (gamepadEdge(0, 8)) cycleCamera();
    if (S.attract && attractExit()) return;
    if (talk.update(dt)) return;
    S.t += dt;
    var H = W.H;
    if (W.cook) {
      if (S.attract) aiCookPress();
      else if (game.input.pressed('confirm')) cookPress();
      cookTick(dt);
      if (W.cook && W.cook.done) W.cook = null;
      return;
    }
    // Movement: the player, or the attract AI walking the route.
    var nearStation = Math.hypot(H.a.body.x - H.station.x, H.a.body.y - H.station.y) < 22;
    var nearExit = Math.hypot(H.a.body.x - H.exit.x, H.a.body.y - H.exit.y) < 20;
    if (S.attract) {
      var target = S.cooked ? H.exit : H.station;
      var dir = dirToward(H, target.x, target.y);
      stepHero(dt, H, dir, 60);
      if (!S.cooked && nearStation && !W.cook) cookBegin();
      if (S.cooked && nearExit) return finishLab();
    } else {
      stepHero(dt, H, heroInputDir(dt), 62);
      if (nearStation && !S.cooked && game.input.pressed('confirm') && !W.cook) cookBegin();
      else if (nearStation && S.cooked && game.input.pressed('confirm')) say([['hollis', T.lab.cookedAlready]], null);
      if (nearExit && game.input.pressed('confirm')) {
        if (S.cooked) return finishLab();
        say([['hollis', 'The batch first, then the desert.']], null);
      }
    }
    rigUpdate(dt, H.cody, { air: false });
    W.nearStation = nearStation;
    W.nearExit = nearExit;
    focusHero();
  }

  function finishLab() {
    if (S.attract) {
      game.go('street', { attract: true });
      return;
    }
    game.go('street', {});
  }

  // The attract AI presses at the centre of the marker's target.
  function aiCookPress() {
    var c = W.cook;
    if (!c || c.done) return;
    var st = HB.COOK_STAGES[c.stage];
    var pos = HB.marker(c.t, st.period);
    if (c.lockT >= COOK_DELAY && Math.abs(pos - st.target) < 0.02) cookPress();
  }

  function labDraw(r) {
    var H = W.H;
    if (!H || !H.a) return;
    r.sky(['#16140f', '#2a2620']);
    H.map.drawFloor(r);
    r.prop('brazier', H.station.x, H.station.y, 0, { light: true });
    r.prop('crate', 8 * 16, 3 * 16, 0);
    r.prop('barrel', 17 * 16, 8 * 16, 0);
    r.prop('chest', 3 * 16, 7 * 16, 0);
    r.prop('lantern', 10 * 16, 2 * 16, 14, { anchor: 'top', light: true });
    r.prop('pot', 16 * 16, 2 * 16, 0);
    r.prop('door', H.exit.x, H.exit.y, 0, { open: !!S.cooked });
    r.shadow(H.a.body.x, H.a.body.y, 5);
    r.shadow(H.cody.body.x, H.cody.body.y, 5);
    H.map.queueWalls(r);
    r.actor(H.a.body.x, H.a.body.y, H.a.body.z || 0, function (g, ox, oy) { H.a.rig.draw(g, ox, oy, r.view); });
    r.actor(H.cody.body.x, H.cody.body.y, 0, function (g, ox, oy) { H.cody.rig.draw(g, ox, oy, r.view); });
    talk.draw(r);
    hud(r, T.hud.objectiveLab);
    if (W.cook) cookOverlay(r);
    else if (W.nearStation && !S.cooked && !S.attract) promptLine(r, 'confirm', T.prompts.cook);
    else if (W.nearExit && S.cooked && !S.attract) promptLine(r, 'confirm', T.lab.doorPrompt);
  }

  function cookOverlay(r) {
    var c = W.cook;
    var st = HB.COOK_STAGES[Math.min(c.stage, HB.COOK_STAGES.length - 1)];
    r.overlay(function (g) {
      var bw = Math.min(260, r.W - 60), bh = 12;
      var bx = Math.round(r.W / 2 - bw / 2), by = Math.round(r.H * 0.62);
      px.rect(g, bx - 10, by - 44, bw + 20, 66, '#120e1ae0');
      E.font.text(g, 'STAGE ' + (c.stage + 1) + ' OF 3  ' + st.name, bx, by - 36, '#d9b77c');
      E.font.text(g, T.lab.cookIntro, bx, by - 24, '#a9a1c8');
      px.rect(g, bx, by, bw, bh, '#2a2438');
      var zx = Math.round(bx + (st.target - st.tol) * bw), zw = Math.round(st.tol * 2 * bw);
      px.rect(g, zx, by, zw, bh, '#3aa86a');
      var pos = HB.marker(c.t, st.period);
      var mx = Math.round(bx + pos * bw);
      px.rect(g, mx - 1, by - 4, 3, bh + 8, '#ffffff');
      for (var i = 0; i < c.scores.length; i++) {
        var col = c.scores[i] > 0.75 ? '#7fd3a0' : c.scores[i] > 0.3 ? '#ffd36a' : '#ff5a5a';
        px.rect(g, bx + i * 22, by + 20, 16, 6, col);
      }
      drawGlyph(g, bx + bw - 14, by + 22, 'confirm');
    });
  }

  // ---- Chapter 2: the desert (sell, stealth) ----------------------------------------------------------------
  var BUYERS = [
    { key: 'gil', tag: 'gil', greed: 1.12, patience: 0.4, lines: 'buyerGil' },
    { key: 'lupe', tag: 'lupe', greed: 0.95, patience: 0.6, lines: 'buyerLupe' },
    { key: 'ferris', tag: 'ferris', greed: 1.02, patience: 0.2, lines: 'buyerFerris' }
  ];

  function streetEnter(data) {
    data = data || {};
    S.attract = !!data.attract;
    onChapterStart('street');
    var legend = { '#': 1, R: 3, '@': 'hero', a: 'patrol', g: 'gil', l: 'lupe', f: 'ferris' };
    var H = baseWorld('street', legend, DESERT_TYPES, desertFloor, E.hex('#c9a66b'));
    spawnHeroAt(H, 'hero');
    H.buyers = BUYERS.map(function (b) {
      var p = H.map.find(b.tag);
      var a = actor(b.key, p);
      a.body.x = p.x; a.body.y = p.y;
      a.spec = b;
      return a;
    });
    var waypoints = H.map.findAll('patrol');
    waypoints.sort(function (p, q) { return p.cy - q.cy || p.cx - q.cx; });
    var first = waypoints[0];
    H.agent = actor('agent', first);
    H.agent.body.x = first.x; H.agent.body.y = first.y;
    H.agent.sus = new E.Suspicion();
    H.agent.wp = 0;
    H.agent.waypoints = waypoints;
    H.agent.seen = false;
    H.agent.exposure = 0;
    H.agent.state = 'calm';
    H.sales = 0;
    S.heat = 0;
    W = { H: H, sold: S.sold.slice(), dealing: null, cursor: 0, t: 0 };
    if (!S.product) S.product = { purity: 60, units: HB.unitsFor(60), grade: HB.cookGrade(60), restock: true };
    game.lights.enabled = false;
    game.cam.bounds = function (v) { return H.map.bounds(v); };
    focusHero();
    if (!S.attract && !S.intro.street) {
      S.intro.street = true;
      say(T.street.intro, null);
    }
  }

  function streetExit() {
    W = null;
    talk.close();
  }

  // The batch split across three buyers: earliest gets the biggest share.
  function shareFor(index, total) {
    var a = Math.ceil(total / 3), b = Math.ceil((total - a) / 2), c = total - a - b;
    return [a, b, c][index];
  }

  function unitsLeftForBuyer(index) {
    return shareFor(index, S.product.units);
  }

  function sellTo(buyerIndex, kind) {
    var b = W.H.buyers[buyerIndex];
    var units = unitsLeftForBuyer(buyerIndex);
    var offer = HB.offerFor(b.spec, S.product.purity, units);
    var amount = offer;
    var outcome = 'sold';
    if (kind === 'haggle') {
      var roll = S.rng();
      var h = HB.haggle(offer, b.spec, roll);
      amount = h.amount;
      outcome = h.ok ? 'haggleWon' : 'haggleLost';
    }
    S.cash += amount;
    S.sold[buyerIndex] = true;
    W.sold[buyerIndex] = true;
    W.H.sales++;
    if (S.hub && window.AIHub) AIHub.progress({ score: HB.shiftScore(S.cash) });
    game.flash('#f8e2a0', 0.14, 0.3);
    game.audio.sfx('coin');
    return { amount: amount, outcome: outcome, units: units };
  }

  function buyerIndexNear() {
    var H = W.H, best = -1, bd = 1e9;
    for (var i = 0; i < H.buyers.length; i++) {
      if (W.sold[i]) continue;
      var d = Math.hypot(H.buyers[i].body.x - H.a.body.x, H.buyers[i].body.y - H.a.body.y);
      if (d < 24 && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // The buyer's lines, then the offer on the last line with the three choices under it.
  function openDeal(index) {
    var b = W.H.buyers[index];
    var units = unitsLeftForBuyer(index);
    var offer = HB.offerFor(b.spec, S.product.purity, units);
    var lines = T.street[b.spec.lines];
    W.dealing = index;
    var choices = T.street.choices.map(function (c) { return c.replace('${offer}', fmtMoney(offer)); });
    say(lines.slice(0, lines.length - 1), function () {
      var last = lines[lines.length - 1];
      talk.voice = HB.VOICES[last[0]] || HB.VOICES.narrator;
      talk.say(last[1], {
        name: NAMES[last[0]] || '',
        portrait: NAMES[last[0]] ? portraitFor(last[0]) : null,
        choices: choices,
        onChoice: function (i) {
          if (i === 0) finishDeal(index, sellTo(index, 'sell'));
          else if (i === 1) finishDeal(index, sellTo(index, 'haggle'));
          else { W.dealing = null; say([['hollis', T.street.walked]], null); }
        }
      });
    });
  }

  function finishDeal(index, result) {
    W.dealing = null;
    var line;
    if (result.outcome === 'haggleWon') line = T.street.haggleWon;
    else if (result.outcome === 'haggleLost') line = T.street.haggleLost;
    else line = T.street.sold;
    var tally = ['hollis', fmtMoney(result.amount) + ' for ' + result.units + ' units. That is the number.'];
    say([line, tally], function () {
      if (W.sold.every(function (x) { return x; })) finishStreet();
    });
  }

  function flashSold(result) {
    W.soldFlash = { t: 1.6, text: T.hud.sold + ' ' + fmtMoney(result.amount) };
    if (W.sold.every(function (x) { return x; })) finishStreet();
  }

  function finishStreet() {
    if (W.finishing) return;
    W.finishing = true;
    game.after(S.attract ? 1.2 : 0.6, function () {
      if (S.attract) game.go('yard', { attract: true });
      else game.go('yard', {});
    });
  }

  // The agent's sight: the guard looks along his facing; heat climbs with exposure.
  function agentStep(dt) {
    var H = W.H, ag = H.agent;
    var wps = ag.waypoints;
    var target = wps[ag.wp % wps.length];
    var dist = Math.hypot(target.x - ag.body.x, target.y - ag.body.y);
    if (dist < 6) ag.wp = (ag.wp + 1) % wps.length;
    var dir = dirToward(H, target.x, target.y);
    if (ag.state === 'alert') {
      // Chase: the agent heads for the player.
      dir = dirToward(H, H.a.body.x, H.a.body.y);
    }
    ag.body.vx = dir[0] * (ag.state === 'alert' ? 58 : 30);
    ag.body.vy = dir[1] * (ag.state === 'alert' ? 58 : 30);
    if (Math.hypot(dir[0], dir[1]) > 0.1) ag.facing = Math.atan2(dir[1], dir[0]);
    ag.body.update(dt, H.map);
    var see = E.sees(ag.body, H.a.body, { map: H.map, range: 118, fov: 1.25, facing: ag.facing });
    ag.seen = see.seen;
    ag.exposure = see.exposure || 0;
    ag.state = ag.sus.update(dt, see.seen, H.a.body);
    if (ag.state === 'alert') ag.rigAlert = true; else ag.rigAlert = false;
    if (!S.attract) {
      S.heat = HB.heatStep(S.heat, ag.exposure, dt);
      if (S.heat > S.peakHeat) S.peakHeat = S.heat;
    }
    rigUpdate(dt, ag, { expr: ag.rigAlert ? 'angry' : 'smile' });
    return see;
  }

  function bust() {
    W.busting = true;
    S.busts++;
    S.product = null;
    S.cooked = false;
    S.heat = 0;
    saveProgress();
    talk.close();
    say([T.street.busted, T.street.bustedBack], function () {
      game.go('lab', S.attract ? { attract: true } : {});
    });
  }

  function streetUpdate(dt) {
    if (gamepadEdge(0, 8)) cycleCamera();
    if (S.attract && attractExit()) return;
    if (talk.update(dt)) return;
    if (W.busting) return;
    S.t += dt;
    var H = W.H;
    if (W.soldFlash) { W.soldFlash.t -= dt; if (W.soldFlash.t <= 0) W.soldFlash = null; }
    var see = agentStep(dt);
    if (!S.attract && HB.isBusted(S.heat)) { bust(); return; }
    if (S.attract) {
      // The AI: walk to the next unsold buyer, deal, and keep going.
      var idx = W.sold.indexOf(false);
      if (idx >= 0) {
        var b = H.buyers[idx];
        var dir = dirToward(H, b.body.x, b.body.y);
        stepHero(dt, H, dir, 62);
        if (Math.hypot(b.body.x - H.a.body.x, b.body.y - H.a.body.y) < 20) {
          var result = sellTo(idx, 'sell');
          flashSold(result);
        }
      }
    } else {
      stepHero(dt, H, heroInputDir(dt), 62);
      if (!W.dealing && game.input.pressed('confirm')) {
        var near = buyerIndexNear();
        if (near >= 0) openDeal(near);
      }
    }
    focusHero();
  }

  function streetDraw(r) {
    var H = W.H;
    if (!H || !H.a) return;
    r.sky(['#f2b880', '#e7865a', '#9a4f48']);
    H.map.drawFloor(r);
    r.prop('cactus', 5 * 16, 13 * 16, 0);
    r.prop('palm', 25 * 16, 9 * 16, 0);
    r.prop('sign', 9 * 16, 4 * 16, 0);
    r.prop('barrel', 22 * 16, 2 * 16, 0);
    if (H.agent) r.sightCone(H.agent.body, { map: H.map, range: 118, fov: 1.25, facing: H.agent.facing, color: H.agent.seen ? '#ff6b6b' : '#ffe080', alpha: 0.28 });
    r.shadow(H.a.body.x, H.a.body.y, 5);
    H.map.queueWalls(r);
    H.buyers.forEach(function (b, i) {
      if (W.sold[i]) return;
      r.shadow(b.body.x, b.body.y, 5);
      r.actor(b.body.x, b.body.y, 0, function (g, ox, oy) { b.rig.draw(g, ox, oy, r.view); });
    });
    r.shadow(H.agent.body.x, H.agent.body.y, 5);
    r.actor(H.agent.body.x, H.agent.body.y, 0, function (g, ox, oy) { H.agent.rig.draw(g, ox, oy, r.view); });
    r.actor(H.a.body.x, H.a.body.y, 0, function (g, ox, oy) { H.a.rig.draw(g, ox, oy, r.view); });
    talk.draw(r);
    hud(r, T.hud.objectiveStreet);
    r.overlay(function (g) {
      var bar = Math.round(40 * S.heat / HB.HEAT.max);
      if (S.heat > 0) E.font.text(g, T.hud.heat + ' ' + Math.round(S.heat) + '%', 56, 20, '#ffffff');
      if (W.soldFlash) E.font.text(g, W.soldFlash.text, r.W / 2, r.H / 2 - 40, '#ffd36a', { align: 'center' });
    });
    if (!S.attract && !talk.open) {
      var near = buyerIndexNear();
      if (near >= 0) promptLine(r, 'confirm', T.prompts.sell);
    }
  }

  // ---- Chapter 3: the yard (boss) ---------------------------------------------------------------------------------
  function yardEnter(data) {
    data = data || {};
    S.attract = !!data.attract;
    onChapterStart('yard');
    var legend = { '#': 1, p: 3, '@': 'hero', b: 'boss' };
    var H = baseWorld('yard', legend, YARD_TYPES, yardFloor, false);
    spawnHeroAt(H, 'hero');
    var bp = H.map.find('boss');
    H.boss = actor('vance', bp);
    H.boss.body.x = bp.x; H.boss.body.y = bp.y;
    H.boss.hp = S.bossHP;
    H.boss.state = 'idle';
    H.boss.timer = 1.6;
    H.boss.cool = 0;
    H.boss.attack = new E.Attack('haymaker');
    W = { H: H, combo: new E.Combo(['jab', 'cross', 'hook'], { window: 0.3 }), iframes: 0, dash: 0, dashCool: 0, t: 0, over: false, ai: 0, won: false, tooltip: null };
    game.lights.enabled = true;
    game.lights.ambient = 0.5;
    game.cam.bounds = function (v) { return H.map.bounds(v); };
    focusHero();
    if (!S.attract && !S.intro.yard) {
      S.intro.yard = true;
      say(T.yard.intro, null);
    }
  }

  function yardExit() {
    W = null;
    talk.close();
    game.lights.enabled = false;
  }

  function bossUpdate(dt) {
    var H = W.H, boss = H.boss, hero = H.a;
    var dist = Math.hypot(hero.body.x - boss.body.x, hero.body.y - boss.body.y);
    if (boss.state === 'die') {
      boss.timer -= dt;
      boss.body.vx = 0; boss.body.vy = 0;
      return;
    }
    boss.timer -= dt;
    boss.cool -= dt;
    if (boss.state === 'idle') {
      // Face the hero and pick the next move when the timer runs out.
      boss.facing = Math.atan2(hero.body.y - boss.body.y, hero.body.x - boss.body.x);
      boss.body.vx = 0; boss.body.vy = 0;
      if (boss.timer <= 0) {
        if (S.rng() < 0.6) { boss.state = 'telegraph'; boss.timer = 0.95; boss.tx = hero.body.x; boss.ty = hero.body.y; }
        else { boss.state = 'charge'; boss.timer = 0.9; boss.facing = Math.atan2(hero.body.y - boss.body.y, hero.body.x - boss.body.x); }
      }
    } else if (boss.state === 'telegraph') {
      boss.facing = Math.atan2(hero.body.y - boss.body.y, hero.body.x - boss.body.x);
      if (boss.timer <= 0) {
        boss.state = 'swipe'; boss.timer = 0.5;
        boss.attack.start();
        var hitRadius = HB.BOSS.swipeRadius;
        var inRadius = Math.hypot(hero.body.x - boss.tx, hero.body.y - boss.ty) < hitRadius;
        if (inRadius) hurtHero(boss.tx, boss.ty);
      }
    } else if (boss.state === 'swipe') {
      if (boss.timer <= 0) { boss.state = 'idle'; boss.timer = 1.2 + S.rng() * 1.2; }
    } else if (boss.state === 'charge') {
      var dir = [Math.cos(boss.facing), Math.sin(boss.facing)];
      boss.body.vx = dir[0] * 70; boss.body.vy = dir[1] * 70;
      boss.body.update(dt, H.map);
      if (dist < 16) hurtHero(boss.body.x, boss.body.y);
      if (boss.timer <= 0) { boss.state = 'idle'; boss.timer = 1.0 + S.rng(); boss.body.vx = 0; boss.body.vy = 0; }
    }
    if (boss.attack && boss.attack.update) boss.attack.update(dt);
    rigUpdate(dt, boss, {
      pose: boss.state === 'telegraph' ? 'guard' : boss.state === 'die' ? 'die' : null,
      attack: boss.state === 'swipe' && boss.attack ? boss.attack.state : undefined,
      expr: boss.state === 'telegraph' || boss.state === 'charge' ? 'angry' : 'shout'
    });
  }

  function hurtHero(x, y) {
    var H = W.H;
    if (W.iframes > 0 || S.attract) return;
    W.iframes = 1.0;
    S.heroHP -= 1;
    H.a.hurt = 0.4;
    game.hitFx(H.a.body.x, H.a.body.y, 14, { power: 0.8, damage: 1, rumble: true });
    game.shake(3);
    if (S.heroHP <= 0) {
      // Defeat: start the bout again with a full set of hearts.
      S.heroHP = HB.BOSS.heroHearts;
      say([T.yard.lost], function () {
        game.go('yard', S.attract ? { attract: true } : {});
      });
    }
  }

  function yardUpdate(dt) {
    if (gamepadEdge(0, 8)) cycleCamera();
    if (S.attract && attractExit()) return;
    if (talk.update(dt)) return;
    if (W.over) return;
    S.t += dt;
    var H = W.H, boss = H.boss, hero = H.a;
    W.iframes = Math.max(0, W.iframes - dt);
    W.dashCool = Math.max(0, W.dashCool - dt);
    W.dash = Math.max(0, W.dash - dt);
    var dir;
    if (S.attract) {
      dir = aiYard(dt);
    } else {
      dir = heroInputDir(dt);
      if (game.input.pressed('dash') && W.dashCool <= 0 && (dir[0] || dir[1])) {
        W.dash = 0.22; W.dashCool = 0.8; W.iframes = Math.max(W.iframes, 0.28);
        hero.dashDir = [dir[0], dir[1]];
      }
      if (game.input.buffered('attack') && W.combo.press()) game.input.consume('attack');
    }
    if (W.dash > 0) {
      // A dash moves the hero fast along its line, ignoring the stick for its length.
      hero.body.vx = hero.dashDir[0] * 170; hero.body.vy = hero.dashDir[1] * 170;
      hero.body.update(dt, H.map);
      hero.facing = Math.atan2(hero.dashDir[1], hero.dashDir[0]);
    } else {
      stepHero(dt, H, dir, 62);
    }
    W.combo.update(dt);
    if (boss.state !== 'die') {
      W.combo.hits([boss.body], function (e) { return E.inArc(hero.body, hero.facing, e, 30, 1.3, 14); }, function (e) {
        if (boss.state === 'die') return;
        boss.hp = HB.bossHit(boss.hp, HB.BOSS.hitDamage);
        S.bossHP = boss.hp;
        game.hitFx(boss.body.x, boss.body.y, 20, { power: 1, damage: HB.BOSS.hitDamage, angle: 0 });
        E.knockback(hero.body, boss.body, 40, 0);
        if (boss.hp <= 0) bossDown();
      });
    }
    bossUpdate(dt);
    rigUpdate(dt, hero, { attack: W.combo.state, dash: W.dash > 0, hurt: hero.hurt > 0 ? 1 : 0 });
    hero.hurt = Math.max(0, hero.hurt - dt);
    focusHero();
  }

  function bossDown() {
    var boss = W.H.boss;
    boss.state = 'die';
    boss.timer = 2.4;
    S.bossHP = 0;
    W.over = true;
    game.after(2.2, function () {
      talk.voice = HB.VOICES.vance;
      say([T.yard.won], function () {
        game.go('results', { won: true, attract: S.attract });
      });
    });
  }

  // The attract AI: walks at Vance, strikes when close, and dashes out of the way of his swipes.
  // Returns the ground direction it wants.
  function aiYard(dt) {
    var H = W.H, boss = H.boss, hero = H.a;
    var dx = boss.body.x - hero.body.x, dy = boss.body.y - hero.body.y;
    var dist = Math.max(0.001, Math.hypot(dx, dy));
    if (boss.state === 'telegraph' && W.dashCool <= 0 && dist < 60) {
      W.dash = 0.22; W.dashCool = 0.8; W.iframes = 0.5;
      hero.dashDir = [-dx / dist, -dy / dist];
    }
    W.aiStrike = Math.max(0, (W.aiStrike || 0) - dt);
    if (dist < 26 && W.aiStrike <= 0 && W.combo.press()) W.aiStrike = 0.45;
    return dist > 22 ? [dx / dist, dy / dist] : [0, 0];
  }

  function yardDraw(r) {
    var H = W.H;
    if (!H || !H.a) return;
    r.sky(['#2a2a36', '#15141c']);
    H.map.drawFloor(r);
    if (H.boss.state === 'telegraph') {
      r.groundRing(H.boss.tx, H.boss.ty, HB.BOSS.swipeRadius, '#ff5a5a', 0.9);
      r.groundDisc(H.boss.tx, H.boss.ty, HB.BOSS.swipeRadius, '#ff5a5a', 0.2);
    }
    r.prop('pillar', 3 * 16, 1 * 16, 0);
    r.prop('torch', 17 * 16, 1 * 16, 0, { light: true });
    r.prop('torch', 2 * 16, 11 * 16, 0, { light: true });
    r.prop('crate', 15 * 16, 9 * 16, 0);
    r.shadow(H.a.body.x, H.a.body.y, 5);
    r.shadow(H.boss.body.x, H.boss.body.y, 10);
    H.map.queueWalls(r);
    r.actor(H.boss.body.x, H.boss.body.y, 0, function (g, ox, oy) { H.boss.rig.draw(g, ox, oy, r.view); }, { flash: H.boss.state === 'telegraph' ? '#ff5a5a' : undefined, flashMix: 0.35 });
    r.actor(H.a.body.x, H.a.body.y, 0, function (g, ox, oy) { H.a.rig.draw(g, ox, oy, r.view); }, { flash: W.iframes > 0 && (Math.floor(W.iframes * 20) % 2) ? '#ffffff' : undefined, flashMix: 0.5 });
    talk.draw(r);
    hud(r, T.hud.objectiveYard);
    r.overlay(function (g) {
      // Boss bar across the top centre, clear of the cash box in the corner.
      var bw = Math.round(r.W * 0.4), bx = Math.round(r.W / 2 - bw / 2), w = Math.round(bw * H.boss.hp / HB.BOSS.hp);
      E.font.text(g, T.hud.boss, bx, 4, '#f4f0ff', { align: 'right' });
      px.rect(g, bx, 14, bw, 6, '#2a0f10');
      px.rect(g, bx, 14, w, 6, '#c24a3e');
    });
    if (!S.attract && !talk.open) promptLine(r, 'attack', T.prompts.attack);
  }

  // ---- Results and credits -----------------------------------------------------------------------------------
  var resultsData = null;
  function resultsEnter(data) {
    data = data || {};
    talk.close();
    resultsData = {
      won: !!data.won,
      timeUp: !!data.timeUp,
      hub: !!data.hub,
      attract: !!data.attract,
      t: 0
    };
    if (S && S.hub && !S.resultSent) finishHubRound(data.timeUp ? 'time-up' : 'done');
    if (S && !S.hub && !S.attract) E.store.remove(SAVE_KEY);
    HB.playSong(game, 'victory');
    if (resultsData.attract) resultsData.autoBack = 7;
  }

  function resultsUpdate(dt) {
    resultsData.t += dt;
    if (resultsData.attract) {
      if (anyInputSince()) return game.go('title', {});
      resultsData.autoBack -= dt;
      if (resultsData.autoBack <= 0) return game.go('title', {});
      return;
    }
    if (game.input.pressed('confirm') || game.input.pressed('cancel')) game.go('title', {});
  }

  function resultsDraw(r) {
    r.sky(['#18142a', '#2b2046']);
    r.overlay(function (g) {
      E.font.title(g, T.results.title, r.W / 2, 22, { scale: 2, colors: ['#ffd36a', '#e8a04a'], align: 'center' });
      var rows = [
        [T.results.cash, fmtMoney(S ? S.cash : 0)],
        [T.results.purity, S && S.purities.length ? S.purities[S.purities.length - 1] + ' ' + HB.cookGrade(S.purities[S.purities.length - 1]) : 'none'],
        [T.results.heat, S ? Math.round(S.peakHeat) + '%' : '0%'],
        [T.results.time, fmtTime(S ? S.t : 0)]
      ];
      var y = 70;
      rows.forEach(function (row) {
        E.font.text(g, row[0], r.W / 2 - 110, y, '#a9a1c8');
        E.font.text(g, row[1], r.W / 2 + 110, y, '#f4f0ff', { align: 'right' });
        y += 20;
      });
      var line = resultsData && resultsData.won ? 'The car wash is closed. Tell the people who sent you.' : 'The shift is over. Check the cooler in the morning.';
      E.font.text(g, line, r.W / 2, y + 16, '#d9b77c', { align: 'center' });
      if (resultsData && resultsData.hub) E.font.text(g, 'Score sent to the hub.', r.W / 2, y + 30, '#a9a1c8', { align: 'center' });
      if (resultsData && !resultsData.attract) E.font.text(g, T.results.back, r.W / 2, r.H - 26, '#f4f0ff', { align: 'center' });
    });
  }

  var creditsT = 0;
  function creditsEnter() { creditsT = 0; HB.playSong(game, 'title'); }
  function creditsUpdate(dt) {
    creditsT += dt;
    if (game.input.pressed('confirm') || game.input.pressed('cancel')) game.go('title', {});
  }
  function creditsDraw(r) {
    r.sky(['#0e0c18', '#1d1734']);
    var lines = HB.CREDITS || [];
    r.overlay(function (g) {
      // Long entries wrap to the screen width; the scroll loops once the last line has left the top.
      var y = r.H - creditsT * 16, top = y;
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        var wrapped = ln.h || !ln.t ? [ln.t] : E.font.wrap(ln.t, r.W - 24);
        var parts = Array.isArray(wrapped) ? wrapped : String(wrapped).split('\n');
        for (var k = 0; k < parts.length; k++) {
          if (y > -20 && y < r.H + 10) {
            if (ln.h) E.font.title(g, parts[k], 12, y, { scale: 1, colors: ['#ffd36a', '#e8a04a'] });
            else E.font.text(g, parts[k], 12, y, ln.c || '#dcd6ef');
          }
          y += (ln.h ? 14 : 10);
        }
        y += ln.gap || 0;
      }
      if (y < -20 && top < r.H) { creditsT = 0; }
      px.rect(g, 0, r.H - 20, r.W, 20, '#0e0c18');
      E.font.text(g, 'CONFIRM OR CANCEL TO LEAVE', r.W / 2, r.H - 12, '#a9a1c8', { align: 'center' });
    });
  }

  // ---- Title scene draw/update ----------------------------------------------------------------------------------------
  function titleEnter() {
    game.lights.enabled = false;
    S = null;
    hubInfo = null;
    idle = 0;
    touchOnly = detectTouchOnly();
    var save = E.store.get(SAVE_KEY, null);
    hasCheckpoint = !!save;
    buildTitleMenu();
    HB.playSong(game, 'title');
    if (window.AIHub) {
      AIHub.connect({ mode: 'parallel', seats: [1, 4] }).then(function (info) {
        if (!info) return;
        hubInfo = info;
        wireHub(info);
        buildTitleMenu();
      });
    }
  }
  function titleUpdate(dt) {
    if (!menu) buildTitleMenu();
    if (anyInputSince()) idle = 0; else idle += dt;
    if (gamepadEdge(0, 8)) cycleCamera();
    if (!joinedHub && menu) menu.update(dt);
    if (idle >= HB.ATTRACT_IDLE) {
      idle = 0;
      startAttract();
    }
  }
  function titleDraw(r) {
    r.sky(['#1e1036', '#5a2e3e', '#c8763e']);
    r.overlay(function (g) {
      E.font.title(g, T.title, r.W / 2, 22, { scale: 3, colors: ['#ffd36a', '#e8a04a'], depth: 2, depthColor: '#3a1b10', align: 'center' });
      E.font.text(g, T.tagline, r.W / 2, 66, '#f4e6c8', { align: 'center' });
      if (touchOnly) E.font.text(g, T.needController, r.W / 2, r.H - 40, '#ffd36a', { align: 'center' });
      if (joinedHub) E.font.text(g, 'Waiting for the host to start the round.', r.W / 2, r.H - 26, '#a9a1c8', { align: 'center' });
    });
    if (menu) menu.draw(r);
  }

  // ---- Scenes ------------------------------------------------------------------------------------------------------------
  var scenes = {
    title: { enter: titleEnter, update: titleUpdate, draw: titleDraw, view: 'threequarter', views: ['threequarter'] },
    lab: { pausable: true, enter: labEnter, exit: labExit, update: labUpdate, draw: labDraw, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'] },
    street: { pausable: true, enter: streetEnter, exit: streetExit, update: streetUpdate, draw: streetDraw, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'] },
    yard: { pausable: true, enter: yardEnter, exit: yardExit, update: yardUpdate, draw: yardDraw, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'] },
    results: { enter: resultsEnter, update: resultsUpdate, draw: resultsDraw },
    credits: { enter: creditsEnter, update: creditsUpdate, draw: creditsDraw }
  };
  // The title and results need an attract-able intro too; attract runs chapters one after another.

  // Remember which scene is showing (for the tests and the debug handle below).
  var curScene = 'title';
  Object.keys(scenes).forEach(function (name) {
    var s = scenes[name], enter = s.enter;
    s.enter = function (data) { curScene = name; return enter ? enter.call(this, data) : undefined; };
  });

  game.start({ scene: 'title', scenes: scenes });

  // Debug handle for the browser checks. It only reads state or moves the hero; the game never uses it.
  window.HALF_BAKED = {
    game: game,
    scene: function () { return curScene; },
    state: function () { return S; },
    talk: talk,
    W: function () { return W; },
    teleport: function (x, y) { if (W && W.H && W.H.a) { W.H.a.body.x = x; W.H.a.body.y = y; } },
    teleportBoss: function (x, y) { if (W && W.H && W.H.boss) { W.H.boss.body.x = x; W.H.boss.body.y = y; } },
    heroPos: function () { return W && W.H && W.H.a ? { x: W.H.a.body.x, y: W.H.a.body.y } : null; },
    buyerPos: function (i) { return W && W.H && W.H.buyers ? { x: W.H.buyers[i].body.x, y: W.H.buyers[i].body.y } : null; },
    agentPos: function () { return W && W.H && W.H.agent ? { x: W.H.agent.body.x, y: W.H.agent.body.y, facing: W.H.agent.facing, state: W.H.agent.state } : null; },
    cook: function () { return W && W.cook ? { stage: W.cook.stage, t: W.cook.t, done: W.cook.done } : null; },
    bossHP: function () { return W && W.H && W.H.boss ? W.H.boss.hp : null; },
    stationPos: function () { return W && W.H && W.H.station ? { x: W.H.station.x, y: W.H.station.y } : null; },
    exitPos: function () { return W && W.H && W.H.exit ? { x: W.H.exit.x, y: W.H.exit.y } : null; }
  };
})();
