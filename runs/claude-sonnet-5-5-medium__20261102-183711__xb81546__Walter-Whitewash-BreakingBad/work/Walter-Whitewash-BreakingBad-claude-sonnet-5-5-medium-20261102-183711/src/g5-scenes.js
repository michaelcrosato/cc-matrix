// ===== part 5: the attract mode's brain, the scenes, saving, the AI Hub session, the debug handle ====================

// ---- the attract mode: an AI that plays the real game, and cheats freely ---------------------------------------------------------
function makeAuto() {
  const a = { cheat: true, i: 0, t: 0, stuck: 0, last: null, banner: 'DEMO: PRESS ANY BUTTON', fired: false, label: '' };
  const walk = (tx, ty, c, dt, speed = 1) => {
    flow.update(tx, ty);
    const d = Math.hypot(tx - hero.x, ty - hero.y), f = flow.dir(hero.x, hero.y, tx, ty) || [0, 0], fl = Math.hypot(f[0], f[1]) || 1;
    c.mx = f[0] / fl * speed; c.my = f[1] / fl * speed;
    if (a.last === null || Math.abs(d - a.last) > 6) { a.last = d; a.stuck = 0; } else a.stuck += dt;
    if (a.stuck > 3) { hero.x = tx - (tx - hero.x) * .15; hero.y = ty - (ty - hero.y) * .15; a.stuck = 0; }   // no clip: the demo may cheat
    return d;
  };
  const near = (id, d) => { const s = stations.find(q => q.id === id); return s ? Math.hypot(s.x - hero.x, s.y - hero.y) < (d || s.r * .7) : false; };
  const pos = id => stations.find(q => q.id === id);
  const STEPS = [
    ['Cook a batch at the RV', (c, dt) => { const s = pos('cook'); if (mode === 'cook') return false; if (a.entered && !cook) return true; if (near('cook')) { c.interact = true; a.entered = true; S.ingredients = Math.max(1, S.ingredients); } else walk(s.x, s.y, c, dt); return false; }],
    ['Sell to a customer', (c, dt) => {
      if (!S.bricks.length) return true;
      let cu = lists.customers.filter(q => q.state === 'wait').sort((p, q) => dist(p, hero) - dist(q, hero))[0];
      if (!cu) { fillCustomers(6); return a.t > 6; }
      if (dist(cu, hero) < 17) { c.interact = true; return a.t > 1 && cu.state !== 'wait'; }
      walk(cu.x, cu.y, c, dt); return false; }],
    ['Launder at the car wash', (c, dt) => { const s = pos('counter'); if (near('counter')) { c.interact = true; return a.t > 1.2; } walk(s.x, s.y, c, dt); return false; }],
    ['Fight the rival crew', (c, dt) => {
      const t = lists.thugs.filter(q => !q.dead).sort((p, q) => dist(p, hero) - dist(q, hero))[0];
      if (!t) { fillThugs(); return a.t > 4; }
      const d = dist(t, hero); c.aim = ang(hero, t);
      if (S.weapon !== (d > 55 ? 'pistol' : 'fists') && a.t % 1.4 < dt * 1.5) c.swap = true;
      if (d > 48) walk(t.x, t.y, c, dt, .9); else { c.mx = c.my = 0; }
      if (a.t % .32 < dt * 1.2) c.attack = true; c.attackHeld = S.weapon === 'pistol';
      return t.dead && a.t > 2 || a.t > 16; }],
    ['Ask Gus for an order', (c, dt) => { const s = pos('gus'); if (a.talked && mode === 'walk') return true; if (near('gus')) { c.interact = true; a.talked = true; } else walk(s.x, s.y, c, dt); return false; }],
    ['Make the delivery', (c, dt) => {
      if (!a.had) { a.had = true; if (!S.contract) giveContract(); }
      const k = S.contract; if (!k) return true;
      if (!R.canFill(S, k)) for (let i = 0; i < k.n; i++) S.bricks.push(Math.max(k.minPurity, 90));
      const s = pos('drop-' + k.at); if (!s) return true;
      if (near('drop-' + k.at, 22)) { c.interact = true; return a.t > 2 && !S.contract; }
      walk(s.x, s.y, c, dt); return false; }],
    ['Go down to the Superlab', (c, dt) => {
      if (mapName === 'lab') return true;
      S.day = Math.max(S.day, 5); const s = pos('hatch'); if (near('hatch', 18)) { c.interact = true; } else walk(s.x, s.y, c, dt); return false; }],
    ['Beat Gus Frying', (c, dt) => {
      if (!boss) return a.t > 3; if (boss.done) return true;
      const d = dist(boss, hero); c.aim = ang(hero, boss); c.attackHeld = true;
      if (S.weapon !== 'pistol' && a.t % 1 < dt * 1.5) c.swap = true;
      if (a.t % .25 < dt * 1.2) c.attack = true;
      if (d > 85) walk(boss.x, boss.y, c, dt, .8); else if (d < 50) { c.mx = -Math.cos(c.aim) * .6; c.my = -Math.sin(c.aim) * .6; }
      else { c.mx = Math.cos(c.aim + 1.57) * .5; c.my = Math.sin(c.aim + 1.57) * .5; }
      boss.hp -= dt * 15;
      if (a.t % 3 < dt * 1.2) c.dodge = true; return false; }]
  ];
  a.ctrl = (dt, c) => {
    if (mode !== 'walk') return c;
    a.t += dt; const st = STEPS[a.i % STEPS.length]; a.label = st[0];
    a.banner = 'DEMO: ' + st[0].toUpperCase() + '   (PRESS ANY BUTTON)';
    if (st[1](c, dt)) { a.i++; a.t = 0; a.entered = false; a.talked = false; a.had = false; a.last = null; if (a.i >= STEPS.length) { a.i = 0; } }
    return c;
  };
  a.think = () => {};
  return a;
}
function pollPad() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  for (const p of navigator.getGamepads() || []) if (p) { if (p.buttons.some(b => b.pressed) || p.axes.some(v => Math.abs(v) > .55)) lastInputAt = nowMs(); }
}
if (typeof window !== 'undefined') for (const ev of ['keydown', 'mousedown', 'mousemove', 'wheel', 'pointerdown', 'touchstart']) window.addEventListener(ev, () => { lastInputAt = nowMs(); }, { passive: true });

// ---- saving ----------------------------------------------------------------------------------------------------------------------
game.saves.write = () => ({ data: { S: JSON.parse(JSON.stringify(S)) }, place: 'Day ' + S.day + ', ' + R.clockText(S.minutes), level: S.day });
game.saves.read = save => { S = Object.assign(R.newState(), save.data.S); ui.hide(); game.go('play', { resume: true }); };

// ---- the About screen: the source information, in the game ---------------------------------------------------------------------------
const INFO = [
  ['Date', '2026-11-02 18:37'], ['Source', 'Breaking Bad (2008-2013)'], ['Genre and Perspective', 'Crime action-adventure with stealth, a cooking minigame and a boss fight. Three-quarter top-down camera, switchable to top-down and isometric.'],
  ['Tech', 'my-3D2dge v0.85.1 (the full engine, handoff package), JavaScript, single HTML file; AI Hub session client 1.3.0.'], ['Art Direction', 'The engine\'s own PS1/SNES hybrid look: HD pixel-rigged characters, textured tiles, canvas lighting with a day and night cycle.'],
  ['Animation', 'The engine\'s Humanoid rigs, E.Combo and E.MOVES for melee, poses, tweens and particles.'], ['Audio', 'All code-written: original songs, synthesised sound effects, gibberish "animalese" voices for every speaker.'],
  ['Online', 'AI Hub session protocol v1, ghost mode: other players\' Walts appear in your town. Cash is the score. Also plays alone.'],
  ['Testing', 'Headless Node tests of every system (rules, world, cook, combat, cops, shop, launder, days, endings, save), a scripted full playthrough, browser checks at several viewports, and the AI Hub harness.'],
  ['Research', 'Light: the source\'s premise and tone, from memory. No web research on the show. Engine and hub docs read.'], ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'], ['Model', 'Anthropic, claude-sonnet-5-5, reasoning effort medium'], ['Usage', 'unknown']
];
function showAbout() {
  ui.show('help', { kicker: 'ABOUT', title: 'Walter Whitewash',
    keys: [[keyOf('interact'), 'Use things, talk, sell'], [keyOf('attack'), 'Hit or shoot'], [keyOf('dodge'), 'Dodge roll'], [keyOf('swap'), 'Wrench or pistol'], [keyOf('sprint'), 'Sprint (cops notice)'], [keyOf('heal'), 'Pain pills'], [keyOf('map'), 'Map'], [keyOf('view'), 'Change the view']],
    sections: [['A story', 'A chemistry teacher with a cough and a bill. Cook, sell, launder. Eighteen thousand dollars clean in five days. An original spiritual successor: names are parodies, the writing is our own.'], ...INFO.map(([h, t]) => [h, t])], back: () => ui.back() });
}

// ---- scenes -------------------------------------------------------------------------------------------------------------------------------
const bg = new E.Backdrop('desert');
function portraits(r, kind) {
  r.overlay(g => {
    const s = Math.round(Math.min(r.H * .46, 120)), y = r.H - s - 6;
    rigFor('walt').drawPortrait(g, r.W - s * 2 + 10, y, s, { zoom: 3, turn: .55, bg: 'rgba(0,0,0,0)', frame: false });
    rigFor(kind || 'gus').drawPortrait(g, r.W - s - 6, y, s, { zoom: 3, turn: -.55, bg: 'rgba(0,0,0,0)', frame: false });
  });
}
const titleScene = {
  enter() {
    auto = null; ui.hide();
    lastInputAt = nowMs();
    game.audio.music(AU.songs.title, { fade: .8 }); musicNow = 'title';
    const saved = game.saves.latest && game.saves.latest();
    const acts = touchOnly ? [] : [
      { label: 'New game', primary: true, fn: () => { ui.hide(); game.go('play', { fresh: true }); } },
      saved && { label: 'Continue (' + (saved.place || 'autosave') + ')', fn: () => { game.saves.load(saved.slot === undefined ? 'auto' : saved.slot); } }
    ];
    acts.push({ label: 'Settings', fn: () => ui.show('settings') });
    if (!touchOnly) acts.push({ label: 'Controls', fn: () => ui.show('controls') });
    acts.push({ label: 'About and credits', fn: showAbout });
    ui.show('title', { name: TITLE, subtitle: touchOnly ? 'Controller or keyboard required' : 'Cook. Sell. Launder. Don\'t get caught.', meta: touchOnly ? ['This game needs a gamepad or a keyboard. Open Settings to change the display.'] : ['A spiritual successor to Breaking Bad (2008-2013)', 'Original story. Parody names.'], footer: 'my-3D2dge ' + E.versionLabel(), actions: acts });
  },
  exit() { ui.hide(); },
  update(dt) {
    pollPad();
    if (ui.screen === 'title' && (nowMs() - lastInputAt) / 1000 >= 10) { ui.hide(); game.go('attract'); }
  },
  draw(r) {
    bg.draw(r);
    r.overlay(g => { const t = game.time; for (let i = 0; i < 40; i++) E.px.dot(g, (i * 97) % r.W, (i * 53) % Math.round(r.H * .5), (Math.sin(t * 2 + i) > .2) ? '#ffffff' : '#8a9ac8'); });
    portraits(r, 'gus');
  }
};

function makePlay(isAuto) {
  return {
    pausable: !isAuto, view: 'threequarter', input: PRESET, camera: { zoom: [.5, 2], start: .8 },
    enter(data) {
      auto = isAuto ? makeAuto() : null; ui.hide(); fx.tutorialShown = false; fx.tutIdx = undefined; fx.tutT = 0; clockPaused = isAuto;   // the demo has no clock: it never has to sleep cook = null; report = null; lastInputAt = nowMs(); sessionDone = false;
      game.audio.music(null); musicNow = null;
      if (isAuto) {
        S = R.newState(); S.day = 3; S.minutes = 10 * 60; S.ingredients = 1; S.dirty = 4200; S.pills = 3; S.flags = { jimmyMet: 1, solMet: 1, gus1: 1, gus2: 1, gus3: 1, c3: 0, hankMet: 1 };
        newMorning(false); S.minutes = 10 * 60; auto.t0 = nowMs(); fx.dx = 1; fx.dy = 0;
      } else if (data && data.resume) { newMorning(false); }
      else {
        S = R.newState(); newMorning(false); S.flags = {};
        if (!inSession) converse(W.script.intro);
      }
      game.focus(hero.x, hero.y, 10); game.lights.enabled = true; game.setZoom(.8);
      if (game.cam.smooth !== undefined) game.cam.smooth = .12;
    },
    exit() { ui.hud({}); game.lights.enabled = false; talk.close(); },
    update(dt) {
      if (isAuto) { pollPad(); if (lastInputAt > auto.t0 + 150) { game.go('title'); return; } }
      if (inSession) sessionGuard();
      if (talk.update(dt)) { babbleStep(); hudStep(); stepRigsIdle(dt); return; }
      if (isAuto && talk.open) return;
      if (sessionWait()) { ui.hud({}); return; }
      if (ui.screen) { stepRigsIdle(dt); return; }
      worldStep(dt);
      if (!ui.screen) hudStep();
    },
    draw(r) { drawWorld(r); }
  };
}
const playScene = makePlay(false), attractScene = makePlay(true);
let sessionDone = false;

const endScene = {
  enter(data) {
    const kind = (data && data.kind) || S.over || 'win'; auto = null;
    if (autoWas()) return;
    game.audio.music(AU.songs.victory, { fade: 1 }); musicNow = 'victory';
    const win = kind === 'win';
    const stats = [[money(S.clean), 'Clean cash'], [money(S.dirty), 'Dirty cash'], [String(S.stats.cooks), 'Batches cooked'], [S.stats.bestPurity + '%', 'Best purity'], [String(S.stats.sold), 'Bricks sold'], [String(S.stats.kills), 'Rivals down']];
    const medals = [['Made the number', S.clean >= R.GOAL], ['Beat Gus Frying', S.bossDone], ['Blue Sky batch', S.stats.perfect > 0], ['Never busted', S.stats.busted === 0], ['Rank: ' + R.rank(S), true]];
    const acts = inSession ? [] : [{ label: 'Play again', primary: true, fn: () => { ui.hide(); game.go('play', { fresh: true }); } }, { label: 'Title screen', fn: () => { ui.hide(); game.go('title'); } }];
    ui.show('results', { kicker: win ? 'THE END' : kind === 'late' ? 'TOO LATE' : 'TIME RAN OUT', title: win ? 'I am the one who knocks' : kind === 'late' ? 'You made the number, and Gus still owns the city' : 'The cough won the calendar', emblem: win ? '★' : '✕', stats, medals, actions: acts, text: win ? W.script.endWin.map(l => l[1]).slice(0, 2) : W.script.endLate.map(l => l[1]) });
  },
  exit() { ui.hide(); },
  update() { },
  draw(r) { bg.draw(r); portraits(r, 'jimmy'); }
};
// in attract mode the ending is not shown: the demo starts over
function autoWas() { if (attractRestart) { attractRestart = false; return true; } return false; }
let attractRestart = false;
const goEndingReal = goEnding;
goEnding = function (kind) {
  if (auto) { attractRestart = true; mode = 'cut'; game.after(2.5, () => { if (game.sceneName === 'attract') { game.go('attract'); } }); return; }
  goEndingReal(kind);
};

// ---- AI Hub: ghost mode ------------------------------------------------------------------------------------------------------------
let sessionStarted = !inSession, sendT = 0, progT = 0;
const sessionWait = () => inSession && (!sessionStarted || (HUB.time && HUB.time() < 0));
function sessionGuard() {
  // Create + Options belongs to the hub: ignore Options while Create is held
  try { for (const p of navigator.getGamepads() || []) if (p && p.buttons[8] && p.buttons[8].pressed) { game.input.suppress('pause'); game.input.suppress('start'); } } catch (e) { /* no pads */ }
}
function reportResult() {
  if (sessionDone || !HUB) return; sessionDone = true;
  try { HUB.result({ score: Math.round(S.clean + S.dirty * .5 + (S.bossDone ? 20000 : 0)), stats: { cooks: S.stats.cooks, sold: S.stats.sold, laundered: S.stats.laundered, bestPurity: S.stats.bestPurity }, awards: [S.bossDone && { title: 'The One Who Knocks', detail: 'Beat Gus Frying' }, S.stats.perfect > 0 && { title: 'Blue Sky', detail: 'A 99%+ batch' }].filter(Boolean) }); } catch (e) { /* hub gone */ }
}
function netStep(dt) {
  if (!HUB || !HUB.active || !sessionStarted) return;
  sendT -= dt; progT -= dt;
  if (sendT <= 0) { sendT = .12; HUB.send({ t: 'p', x: Math.round(hero.x * 10) / 10, y: Math.round(hero.y * 10) / 10, f: Math.round(hero.facing * 100) / 100, vx: Math.round(hero.vx), vy: Math.round(hero.vy), m: mapName }, { reliable: false }); }
  if (progT <= 0) { progT = 1; HUB.progress({ score: Math.round(S.clean + S.dirty * .5), label: money(S.clean) + ' clean, day ' + Math.min(S.day, R.LAST_DAY) }); }
}
function netInit() {
  if (!inSession) return;
  HUB.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) { return; }
    HUB.on('start', () => { sessionStarted = true; });
    HUB.on('message', (d, from) => {
      if (!d || d.t !== 'p') return;
      const pl = (HUB.players || []).find(p => p.id === from) || {}, g = lists.ghosts.get(from) || {};
      Object.assign(g, { x: +d.x || 0, y: +d.y || 0, f: +d.f || 0, vx: +d.vx || 0, vy: +d.vy || 0, map: d.m, name: pl.name, color: pl.color }); lists.ghosts.set(from, g);
    });
    HUB.on('leave', e => lists.ghosts.delete(e.id));
    HUB.on('time-up', () => reportResult());
    HUB.on('end', () => { sessionStarted = false; try { game.audio.mute(); } catch (e2) { /* quiet */ } });
    HUB.ready();
  });
}

// ---- the handle for tests and tools -------------------------------------------------------------------------------------------------
game.debug = {
  snapshot: () => ({ scene: game.sceneName, mode, map: mapName, hero: [Math.round(hero.x), Math.round(hero.y)], day: S.day, minutes: Math.round(S.minutes), dirty: S.dirty, clean: S.clean, bricks: S.bricks.length, heat: Math.round(S.heat), hp: Math.round(S.hp), screen: ui.screen, cops: lists.cops.length, thugs: lists.thugs.length, customers: lists.customers.length, auto: auto ? auto.label : null, over: S.over }),
  teleport(x, y) { Object.assign(hero, { x, y, vx: 0, vy: 0 }); }
};
WW.debug = {
  game, E, R, W, fx, S: () => S, setS: s => { S = s; }, hero, lists, stations: () => stations, ui, talk, shots, combo,
  mode: () => mode, setMode: m => { mode = m; }, cook: () => cook, boss: () => boss, mapName: () => mapName, auto: () => auto,
  fn: { getMap: () => map, loadWorld, placeHero, newMorning, spawnCops, fillCustomers, fillThugs, spawnThug, spawnBoss, converse, startCookStation, beginCook, cookStep, cookStop, cookFinish, cookDone, openShop, openLaunder, sellTo, gusTalk, giveContract, deliverContract, hatchAct, finishDay, arrest, knockedOut, hurtHero, hitThug, damageTarget, bossDefeated, heat, worldStep, updateStations, readCtrl, askSleep, jimmyTalk, solTalk, makeAuto, showAbout, openMap, hudStep, objective, goEnding: k => goEnding(k) },
  scenes: () => ({ titleScene, playScene, attractScene, endScene }), flags: () => flags(), flip, touchOnly, inSession, ghosts: lists.ghosts, setLastInput: t => { lastInputAt = t; }, applySettings,
  step: () => ({ cops: lists.cops, thugs: lists.thugs, customers: lists.customers, drops: lists.drops })
};

game.start({
  scenes: { title: titleScene, play: playScene, attract: attractScene, end: endScene },
  scene: inSession ? 'play' : 'title',
  boot: { title: TITLE, steps: [['Mixing the reagents', () => { AU.install(game); }], ['Pouring the town', () => { loadWorld('town'); placeHero('hero'); }], ['Warming up the RV', () => { for (const k of ['walt', 'waltgun', 'hazmat', 'jimmy', 'gus', 'cop', 'hank', 'thug', 'shooter', 'enforcer', 'teacher', 'sol']) rigFor(k); }]] }
});
netInit();
