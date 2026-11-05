/* ---- SCENES ---- */
const scenes = {};
const anyInput = () => game.players.some(p => p.anyPressed() || Math.hypot(...p.move()) > .5) || !!I.clicked();
const cityBg = new E.Backdrop({ sky: ['#0a0818', '#1a1430', '#3a2040', '#6a3048'], moon: { x: .72, y: .2, r: 10, color: '#f0e0c0' }, stars: 60, starsY: .5,
  layers: [{ kind: 'city', color: '#140e20', y: .62, height: .34, parallax: .02 }, { kind: 'city', color: '#1e1428', y: .74, height: .26, parallax: .05, seed: 3 }, { kind: 'fog', color: '#5a2a48', y: .86, height: .1, parallax: 0, drift: 3 }] });
let saveSlotsReady = false;
function setupSaves() {
  if (saveSlotsReady || HUB) return; saveSlotsReady = true;
  const sv = game.saves;
  sv.write = () => ({ data: S.snap || S, place: (CHAPTERS[S.ch] || CHAPTERS[0]).title, level: S.ch + 1 });
  sv.read = save => { resetStory(); Object.assign(S, JSON.parse(JSON.stringify(save.data))); S.snap = JSON.parse(JSON.stringify(save.data)); startChapter(CHAPTERS[S.ch].id, { noSave: true }); };
}

/* TITLE: Sal and the SUV under the Jersey night; the menu; ten idle seconds start the attract mode */
const titleSal = rigOf('sal', false);
const titleState = { idle: 0, menu: null, touchMenu: null };
function buildTitleMenu() {
  setupSaves();
  const has = !HUB && game.saves.any;
  const items = [{ label: 'CONTINUE', disabled: !has }, 'NEW STORY', 'THE COLLECTION  (1-2 PLAYERS)', 'SETTINGS', 'ABOUT & CREDITS'];
  titleState.menu = new E.Menu(game, items, { x: 'center', y: 150, onPick: i => {
    A.sfx('confirm');
    if (i === 0) { const s = game.saves.latest(); if (s) game.saves.load(s.slot); }
    else if (i === 1) { resetStory(); startChapter('prologue'); }
    else if (i === 2) game.go('play', { mode: 'collect' });
    else if (i === 3) game.menu('settings');
    else if (i === 4) game.go('about', {});
  } });
  titleState.menu.i = has ? 0 : 1;
  titleState.touchMenu = new E.Menu(game, ['SETTINGS'], { x: 'center', y: 170, onPick: () => game.menu('settings') });
}
scenes.title = {
  enter() { music('title'); hideHud(); game.follow(null); game.cam.bounds = null; L.enabled = false; game.weather = null; titleState.idle = 0; buildTitleMenu(); W.demo = false; game.allowJoin(false); game.resetCamera(); },
  update(dt) {
    titleState.idle += dt;
    const p = I.pointer(); if (p && (titleState.lastP && (p[0] !== titleState.lastP[0] || p[1] !== titleState.lastP[1]))) titleState.idle = 0; titleState.lastP = p;
    if (anyInput()) titleState.idle = 0;
    if (touchLocked) titleState.touchMenu.update(dt); else titleState.menu.update(dt);
    if (titleState.idle > 10) game.go('attract', {});
    game.focus(0, 0, 0);
    titleSal.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(game.time * .4) * .3, pose: 'hips' });
  },
  draw(r) {
    cityBg.draw(r);
    const cx = r.W / 2, m = Math.round(r.H / 2);
    // a street, the SUV, Sal
    r.overlay(g => {
      px.rect(g, 0, r.H - 52, r.W, 52, '#1a1820'); px.rect(g, 0, r.H - 53, r.W, 2, '#3a3440');
      for (let x = (game.time * 10) % 24 - 24; x < r.W; x += 24) px.rect(g, Math.round(x), r.H - 28, 12, 2, '#c8a840');
      const sx = Math.round(r.W * .78), sy = r.H - 34;
      titleSal.draw(g, Math.round(r.W * .2), r.H - 30, E.VIEWS ? E.charView(game.view) : game.view);
      // the lamp
      px.rect(g, sx + 40, r.H - 110, 3, 80, '#2a2a30'); px.rect(g, sx + 30, r.H - 112, 16, 4, '#3a3a40'); px.blend(g, .25, 'add', () => { px.disc(g, sx + 38, r.H - 104, 9, '#ffd080'); px.disc(g, sx + 38, r.H - 104, 5, '#fff0c0'); });
      E.font.title(g, 'THE BARITONES', cx, m - 92, { scale: 4, align: 'center', colors: ['#fff4d8', '#ffd36a', '#e8a040', '#a85a20'], depth: 3, depthColor: '#3a1a0a' });
      txt(g, 'A family. A business. A lot of feelings.', cx, m - 50, '#e8d8c8', { align: 'center' });
    });
    if (touchLocked) {
      r.overlay(g => { E.ui.box(g, cx - 120, m - 30, 240, 40, { bg: ['#2a1a14', '#120a08'], border: '#e8b84a' }); txt(g, 'Controller or keyboard required', cx, m - 22, '#ffd36a', { align: 'center' }); txt(g, 'Connect one, or press a key, to play', cx, m - 8, '#f4ecd8', { align: 'center' }); });
      titleState.touchMenu.y = m + 20; titleState.touchMenu.draw(r);
    } else {
      titleState.menu.y = m - 30; titleState.menu.draw(r);
      const dev = I.lastDevice, how = dev === 'gamepad' ? `D-pad or stick, ${label('confirm')} to pick · ${label('start')}: menu` : 'Arrows and Enter, or click · Esc: menu';
      r.text(how, cx, r.H - 14, '#b8a8a0', { align: 'center', shadow: '#000', outline: false });
    }
    r.text(E.versionLabel ? 'my-3D2dge ' + E.versionLabel() : '', 4, r.H - 8, '#5a5060', { font: 'tiny' });
  }
};

/* PLAY: the story's chapters, the Collection, and the attract mode's world */
let playMode = 'story';
scenes.play = {
  pausable: true, camera: { zoom: [.7, 2], start: 1, tall: 1.5 },
  enter(d = {}) {
    playMode = d.mode || 'story'; W.mode = playMode; W.demo = false; fadeOut = 0; W.mini = null; talk.close(); convoQ.length = 0; convoDone = null; W.objective = null;
    if (playMode === 'collect') setupCollection({ hub: !!d.hub });
    else {
      const ch = STORY[d.chapter || CHAPTERS[S.ch].id];
      W.chapter = ch; W.chapterId = d.chapter || CHAPTERS[S.ch].id; ch.setup(); W.stepEntered = -1;
      const c = CHAPTERS[S.ch]; banner(c.title.toUpperCase(), c.sub || '', 3.2);
      W.onHeroDown = h => { if (h === hero()) game.after(2.2, () => game.go('over', {})); else game.after(4, () => { h.dead = 0; h.hp = h.max * .5; h.inv = 2; }); };
    }
    if (!HUB) game.allowJoin({ max: 2, onJoin: (input) => { applyGlyphs(); if (playMode === 'collect') addCollector(input); else addNicky(input); toast('Player 2', 'Nicky\'s in'); } });
    game.cam.snap = true;
  },
  exit() { hideHud(); game.allowJoin(false); game.weather = null; L.enabled = false; },
  update(dt) {
    updateBanner(dt);
    if (HUB) hubTick(dt);
    if (playMode === 'collect' && C.ended) return;
    if (I.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (W.mini) { W.mini.update(dt); updateHud(dt); camera(); return; }
    if (updateTalk(dt)) { for (const n of W.npcs) n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.facing, pose: n.pose || null }); for (const h of W.heroes) { const rig = h.showGun > 0 ? h.rigs.gun : h.rigs.fists; rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, pose: h.dead ? 'die' : null }); } for (const f of W.foes) f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: 0, vy: 0, facing: f.facing, pose: f.dead ? 'die' : f.surrender ? 'kneel' : null }); updateHud(dt); camera(); return; }
    if (playMode === 'story') storyUpdate(dt);
    else if (playMode === 'collect') updateCollection(dt);
    if (playMode === 'collect' && C.hub && C.waitStart) { updateHud(dt, collectHud()); camera(); return; }
    updateWorld(dt);
    updateHover();
    updateHud(dt, playMode === 'collect' ? collectHud() : {});
    camera();
  },
  draw(r) { drawWorld(r); drawOverlay(r); talk.draw(r); drawFade(r); if (playMode === 'collect') drawCollectOverlay(r); }
};
function camera() {
  const live = W.heroes.filter(h => !h.dead || h === hero());
  if (live.length > 1 && !game.headless) game.cam.frame(live, { margin: 40, zoom: [.7, 1] });
  else { game.cam.frame && game.cam.frame(null); const h = hero(); if (h) { const c = h.car; if (c) game.focus(c.x + Math.cos(c.angle) * c.speed * .25, c.y + Math.sin(c.angle) * c.speed * .25, 10); else game.focus(h.x, h.y, 14); } }
}
function drawFade(r) { if (fadeOut > 0) r.overlay(g => px.blend(g, Math.min(1, fadeOut), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'))); }
function drawCollectOverlay(r) {
  if (C.hub && C.waitStart) { const t = AIHub.time(); r.overlay(g => { const s = isFinite(t) ? Math.ceil(-t / 1000) : null; E.font.title(g, s ? String(s) : 'READY', r.W / 2, r.H / 2 - 30, { scale: 4, align: 'center' }); txt(g, 'THE COLLECTION · most cash in three minutes', r.W / 2, r.H / 2 + 10, '#f4ecd8', { align: 'center' }); }); }
  if (!C.over && C.started && C.t < 10) r.overlay(g => E.font.title(g, String(Math.ceil(C.t)), r.W / 2, 30, { scale: 3, align: 'center', colors: ['#ffffff', '#ff8a6a', '#c83a2a'] }));
}

/* the chapter's steps, the nerves, the cold */
function storyUpdate(dt) {
  const ch = W.chapter; if (!ch) return;
  const step = ch.steps[S.step];
  if (step && W.stepEntered !== S.step) { W.stepEntered = S.step; step.enter && step.enter(); }
  if (step && step.update) step.update(dt);
  if (step && W.stepEntered === S.step && !convoBusy() && !W.mini && step.check()) {
    const advance = () => { S.step++; W.stepEntered = -1; if (S.step >= ch.steps.length) { S.hp = hero().hp; startChapter(ch.done()); } };
    if (step.leave) { W.leaving = true; step.leave(() => { W.leaving = false; advance(); }); W.stepEntered = -2; }
    else advance();
  }
  // nerves: they ease off when it's quiet; at 100, the panic attack
  if (!W.foes.some(f => !f.dead) && S.stress < 99) adj('stress', -dt * .5);
  if (S.stress >= 99.5 && !W.mini && !convoBusy() && hero() && !hero().car && !hero().dead) {
    const midFight = W.foes.some(f => !f.dead);
    panicAttack(ok => {
      S.panics = (S.panics || 0) + 1;
      if (ok) { S.stress = 40; hero().focus = 10; banner('STEADY', 'In through the nose. Count it', 2); }
      else { S.stress = 55; adj('respect', -4); fadeOut = 1; game.after(1.2, () => { fadeOut = 0; }); banner('SAL WENT DOWN', 'He wakes up on the floor. Everyone is looking', 2.4); for (const f of W.foes) if (!f.dead) f.push(Math.cos(angTo(hero(), f)) * 200, Math.sin(angTo(hero(), f)) * 200, 0); }
      if (S.flags.panicked && W.chapterId === 'ch1' && !S.flags.after1) { S.flags.after1 = 1; convo([ok ? ['sal', 'I\'m fine. It\'s the heat.'] : ['gino', 'Sal! SAL! Somebody get him a chair! Not that chair!'], ['gino', 'You gotta see somebody about this, Sal. A professional.'], ['sal', 'I am seeing somebody. That\'s the problem.']]); }
      else music(midFight ? 'fight' : W.night ? 'night' : W.place === 'barrens' ? 'barrens' : 'town');
    });
  }
  for (const h of W.heroes) if (h.focus > 0) h.focus -= dt;
  // the cold in the woods: the fire barrels warm you
  if (W.place === 'barrens') {
    const h = hero(), warm = h && W.def.props.some(p => p.warm && Math.hypot(p.x - h.x, p.y - h.y) < 44);
    W.cold = clamp(W.cold + (warm ? 22 : -1.25) * dt, 0, 100);
    if (W.cold <= 0) for (const k of W.heroes) if (!k.dead) { k.hp -= 3 * dt; if (k.hp <= 0) { k.hp = 0; k.dead = .001; if (W.onHeroDown) W.onHeroDown(k); } }
    if (warm && Math.random() < .1) P.add && P.add({ kind: 'ember', x: h.x + rnd(-6, 6), y: h.y, z: 20, vz: 20 });
  }
}

/* THERAPY: the office, two chairs, the clock */
const SEATED = { pose: 'crouch' };
scenes.therapy = {
  camera: { zoom: false },
  enter(d) {
    W.mode = 'story'; W.demo = false; fadeOut = 0; convoQ.length = 0; convoDone = null; talk.close();
    enterPlace('office'); W.heroes = []; music('office');
    const o = OFFICE.at; W.sal = npc('sal', { x: o.sal.x, y: o.sal.y + 8 }, { facing: 0, fixedFacing: true, pose: 'crouch', z: 7 }); W.melfi = npc('melfi', { x: o.melfi.x, y: o.melfi.y + 8 }, { facing: Math.PI, fixedFacing: true, pose: 'crouch', z: 7 });
    W.objective = null; game.setZoom(1.5); game.cam.snap = true;
    const c = CHAPTERS[S.ch]; banner(c.title.toUpperCase(), 'Dr. Marchetti\'s office', 2.5);
    W.sessionId = d.id; W.sessionT = 0; W.sessionStarted = false;
  },
  exit() { game.setZoom(1); hideHud(); },
  update(dt) {
    updateBanner(dt); W.sessionT += dt;
    if (!W.sessionStarted && W.sessionT > 1.2) { W.sessionStarted = true; convo(SESSIONS[W.sessionId](), () => { W.sessionDone = true; game.after(.8, () => { const next = { prologue: 'ch1', session2: 'ch2', session3: 'ch4' }[W.sessionId]; startChapter(next); }); }); }
    updateTalk(dt);
    for (const n of W.npcs) { n.expr = talk.open && speaking === n.who ? 'smile' : null; n.rig.update(dt, { x: n.x, y: n.y, z: n.z, vx: 0, vy: 0, facing: n.facing, pose: 'crouch', expr: speaking === n.who && talk.typing ? 'shout' : null }); }
    game.focus(7 * T, 5 * T, 10);
    hideHud();
  },
  draw(r) { drawWorld(r); r.overlay(g => { const m = Math.min(59, Math.floor(W.sessionT / 5)); txt(g, 'Dr. Marchetti\'s office   4:' + String(m).padStart(2, '0') + ' PM', 8, 8, '#e8d8c0'); }); drawOverlay(r); talk.draw(r); drawFade(r); }
};

/* THE DINER: the booth, the jukebox, the bell over the door */
const SONG_TITLES = ['"Hold On to the Night" · The Turnpikes', '"Sunday Gravy" · Lou Carbone', '"Exit 13" · The Meadowlands'];
scenes.diner = {
  camera: { zoom: false },
  enter() {
    W.mode = 'story'; W.demo = false; fadeOut = 0; convoQ.length = 0; convoDone = null; talk.close(); W.mini = null;
    enterPlace('diner'); W.heroes = []; music(null); game.setZoom(1.35); game.cam.snap = true;
    const D = DINER.at; W.sal = npc('sal', D.door, { facing: -Math.PI / 2 }); W.sal.walkTo = D.sal; W.waitress = npc('waitress', D.waitress, { facing: 0 });
    W.objective = null; banner('EPILOGUE', 'The Moonlight Diner', 2.5); W.dinerScript = game.script(dinerScene);
  },
  exit() { game.setZoom(1); hideHud(); },
  update(dt) { updateBanner(dt); updateTalk(dt); updateWorld(dt); game.focus(9 * T, 5.5 * T, 10); hideHud(); },
  draw(r) {
    drawWorld(r);
    // the jukebox: chrome, colored tubes, a glow
    const j = DINER.at.juke; r.queue(j.x, j.y, 0, g => { const [X, Y] = r.w(j.x, j.y, 0); px.rect(g, X - 7, Y - 26, 14, 26, '#c83a3a'); px.rect(g, X - 6, Y - 25, 12, 10, '#ffd36a'); for (let i = 0; i < 4; i++) px.rect(g, X - 5 + i * 3, Y - 13, 2, 10, ['#ff60c0', '#60d0ff', '#ffe060', '#80ff80'][(i + Math.floor(game.time * 4)) % 4]); px.rect(g, X - 7, Y - 27, 14, 2, '#e8e8f0'); }, { emissive: true });
    L.add(j.x, j.y + 4, 14, 50, .8, { color: '#ff80c0' });
    drawOverlay(r); talk.draw(r); drawFade(r);
  }
};
function* dinerScene() {
  const D = DINER.at;
  yield E.until(() => !W.sal.walkTo); W.sal.facing = -Math.PI / 2; W.sal.pose = null;
  yield .6; W.sal.walkTo = { x: D.juke.x, y: D.juke.y + 14 }; yield E.until(() => !W.sal.walkTo); W.sal.facing = -Math.PI / 2;
  let song = 0;
  convo([{ who: 'sal', id: 'juke', text: 'The jukebox. Three for a quarter. One for a dollar, these days.', choices: SONG_TITLES, on: i => { song = i; S.flags.song = i; return []; } }]);
  yield E.until(() => !convoBusy());
  const J = JSON.parse(JSON.stringify(SONGS.jukebox)); J.bpm = [120, 100, 132][song]; if (song === 1) J.tracks.forEach(t => { if (t.wave !== 'drums') t.wave = 'triangle'; });
  A.music(J, { fade: .3 }); curSong = 'jukebox';
  W.sal.walkTo = D.sal; yield E.until(() => !W.sal.walkTo); W.sal.facing = -Math.PI / 2; W.sal.pose = 'crouch'; W.sal.z = 4;
  convo([['waitress', 'Coffee, hon?'], ['sal', 'And onion rings. For the table.']]); yield E.until(() => !convoBusy());
  // the bell: Donna
  A.sfx('bell'); yield .4; const donna = npc('donna', D.door, { facing: -Math.PI / 2 }); donna.walkTo = D.seats[0]; yield E.until(() => !donna.walkTo); donna.facing = -Math.PI / 2; donna.pose = 'crouch'; donna.z = 4;
  convo([['donna', 'You look tired. Is it over? Whatever it was?'], ['sal', 'It\'s never over. But tonight it\'s quiet.']]); yield E.until(() => !convoBusy());
  // the bell: Junior
  A.sfx('bell'); yield .4; const aj = npc('aj', D.door, { facing: -Math.PI / 2 }); aj.walkTo = D.seats[1]; yield E.until(() => !aj.walkTo); aj.facing = Math.PI / 2; aj.pose = 'crouch'; aj.z = 4;
  convo([['aj', 'You ordered onion rings already? For the table?'], ['sal', 'You know what\'s good about an onion ring? It\'s a circle. It comes back around.'], ['aj', 'That\'s... actually kind of deep, Dad.'],
    ['donna', 'Gia\'s parking.'], ['sal', 'She\'s been parking for ten minutes.']]);
  yield E.until(() => !convoBusy());
  yield 1.2;
  // the bell, once more. Sal looks up.
  A.sfx('bell'); W.sal.facing = Math.PI / 2 + .6; W.sal.expr = null; yield 1.1;
  // CUT TO BLACK. Silence.
  fadeOut = 1; A.music(null); curSong = null;
  yield 5;
  game.go('credits', {}, { fade: 0 });
}

/* GAME OVER: sleeping with the fishes */
const FISH = E.sprite(['..bbb...', '.bBBBb.b', 'bBwBBBbb', '.bBBBb.b', '..bbb...'], { b: '#2a5a8a', B: '#5a9ad8', w: '#ffffff' });
let overMenu = null;
scenes.over = {
  enter() { music(null); A.sfx('die'); hideHud(); game.follow(null); L.enabled = false; game.weather = null; game.allowJoin(false);
    overMenu = new E.Menu(game, ['RETRY THE CHAPTER', 'QUIT TO TITLE'], { x: 'center', y: 150, onPick: i => { if (i === 0) { restoreSnap(); startChapter(CHAPTERS[S.ch].id, { noSave: true }); } else game.go('title'); } }); },
  update(dt) { overMenu.update(dt); game.focus(0, 0, 0); },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#02101e', '#0a2a4a', '#103a5a']);
    r.overlay(g => { for (let i = 0; i < 9; i++) { const x = ((game.time * (12 + i * 3) + i * 70) % (r.W + 40)) - 20, y = 30 + (i * 37) % (r.H - 60) + Math.sin(game.time + i) * 4; px.sprite(g, FISH, Math.round(x), Math.round(y), i % 2 === 0); }
      for (let i = 0; i < 20; i++) px.dot(g, (i * 53 + Math.floor(game.time * 7)) % r.W, r.H - ((game.time * 20 + i * 29) % r.H), '#8ac8f0');
      E.font.title(g, 'SLEEPING WITH', r.W / 2, r.H / 2 - 70, { scale: 3, align: 'center', colors: ['#e0f0ff', '#80b8e8', '#3a6a9a'] });
      E.font.title(g, 'THE FISHES', r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center', colors: ['#e0f0ff', '#80b8e8', '#3a6a9a'] }); });
    overMenu.y = Math.round(r.H / 2) + 4; overMenu.draw(r);
  }
};

/* RESULTS of the Collection */
let resMenu = null, resData = null;
scenes.results = {
  enter(d) { resData = d.results || []; hideHud(); music('win'); L.enabled = false; game.weather = null; resMenu = new E.Menu(game, ['PLAY AGAIN', 'TITLE'], { x: 'center', y: 160, onPick: i => game.go(i ? 'title' : 'play', { mode: 'collect' }) }); },
  update(dt) { resMenu.update(dt); game.focus(0, 0, 0); },
  back() { game.go('title'); return true; },
  draw(r) {
    cityBg.draw(r); const cx = r.W / 2;
    const sorted = [...resData].sort((a, b) => b.cash - a.cash);
    r.overlay(g => { E.font.title(g, 'THE COUNT', cx, 24, { scale: 3, align: 'center' });
      sorted.forEach((p, i) => { const y = 72 + i * 26; E.ui.box(g, cx - 110, y - 4, 220, 22, { bg: ['#2a1a14', '#120a08'], border: i === 0 ? '#ffd36a' : '#6a5a4a' });
        txt(g, (i === 0 ? '★ ' : '') + p.name, cx - 100, y + 3, p.color || '#ffffff'); txt(g, money(p.cash) + '   ' + p.kills + ' down', cx + 100, y + 3, '#8af07a', { align: 'right' }); });
      if (sorted.length > 1) txt(g, sorted[0].name + ' is the earner tonight.', cx, 72 + sorted.length * 26 + 4, '#ffd36a', { align: 'center' }); });
    resMenu.y = Math.max(150, 90 + sorted.length * 26); resMenu.draw(r);
  }
};

/* CREDITS: the ending, then the people */
function endingTitle() { return S.respect >= 70 && S.family >= 60 ? 'THE BOSS WHO WENT HOME FOR DINNER' : S.respect >= 70 ? 'THE LAST BARITONE STANDING' : S.family >= 65 ? 'THE FAMILY MAN' : 'A GUY WHO TRIED'; }
let rollY = 0, creditLines = [];
scenes.credits = {
  enter() { hideHud(); L.enabled = false; game.weather = null; music('title'); rollY = 0; game.follow(null);
    try { if (!HUB) { S.flags.finished = 1; game.saves.autosave(); } } catch (e) { /* storage blocked */ }
    creditLines = [['THE BARITONES', 'title'], ['', ''], [endingTitle(), 'gold'], ['', ''],
      ['Cash on the street: ' + money(S.cash), ''], ['Respect: ' + Math.round(S.respect) + '    Family: ' + Math.round(S.family), ''], ['Panic attacks: ' + (S.panics || 0), ''],
      [S.flags.lennySpared ? 'Lenny the Ledger does taxes in Toms River now.' : S.flags.lennyWalked ? 'Nobody asks about Lenny the Ledger.' : 'Lenny the Ledger was never found. Or looked for.', ''],
      [S.flags.want === 2 ? 'In the spring, new ducks came.' : S.flags.want === 1 ? 'Nobody cried at dinner. Almost nobody.' : 'He was still standing.', ''], ['', ''],
      ['STARRING', 'gold'], ['Sal Baritone', ''], ['Donna Baritone', ''], ['Nicky Baritone', ''], ['Gino "Pistachio" Palmieri', ''], ['Frankie "The Wig" Vitale', ''], ['Dr. Elena Marchetti', ''],
      ['Carmine "The Tenor" Falsetti', ''], ['Lenny the Ledger', ''], ['Rosaria, Murray, Arturo and Sully', ''], ['Three ducks, as themselves', ''], ['', ''],
      ['AN ORIGINAL SPIRITUAL SUCCESSOR TO', 'gold'], ['The Sopranos (HBO, 1999-2007)', ''], ['No characters, lines or music from it are used.', ''], ['', ''],
      ['MADE WITH', 'gold'], ['my-3D2dge v0.85.1 · the AI Hub session protocol v1', ''], ['Code, art, music and voices written in code', ''], ['Claude Opus 5.5 (Anthropic), in Claude Code', ''], ['', ''], ['Thanks for playing.', 'gold']];
  },
  update(dt) { rollY += dt * 22 * (game.players.some(p => p.down('confirm') || p.down('attack')) ? 4 : 1); if (rollY > creditLines.length * 16 + game.H + 40 || game.players.some(p => p.pressed('cancel') || p.pressed('start'))) game.go('title'); game.focus(0, 0, 0); },
  draw(r) { r.sky(['#000000', '#08060c']); r.overlay(g => creditLines.forEach(([s, k], i) => { const y = Math.round(r.H + 10 + i * 16 - rollY); if (y < -20 || y > r.H + 20) return;
    if (k === 'title') E.font.title(g, s, r.W / 2, y, { scale: 3, align: 'center' }); else txt(g, s, r.W / 2, y, k === 'gold' ? '#ffd36a' : '#e8e0d8', { align: 'center' }); })); }
};

/* ABOUT & CREDITS: the source information, how it was tested, and what the engine and the prompt were like */
let aboutPage = 0, aboutScroll = 0;
scenes.about = {
  enter() { aboutPage = 0; aboutScroll = 0; hideHud(); music('office'); L.enabled = false; game.weather = null; },
  update(dt) {
    const p = game.players;
    if (p.some(q => q.pressed('cancel'))) { A.sfx('cancel'); game.go('title'); return; }
    if (p.some(q => q.pressed('right') || q.pressed('confirm'))) { aboutPage = (aboutPage + 1) % ABOUT.length; aboutScroll = 0; A.sfx('select'); }
    if (p.some(q => q.pressed('left'))) { aboutPage = (aboutPage + ABOUT.length - 1) % ABOUT.length; aboutScroll = 0; A.sfx('select'); }
    if (p.some(q => q.down('down'))) aboutScroll += dt * 90; if (p.some(q => q.down('up'))) aboutScroll = Math.max(0, aboutScroll - dt * 90);
    const z = I.zoom ? I.zoom() : 1; if (z !== 1) aboutScroll = Math.max(0, aboutScroll + (z < 1 ? 30 : -30));
    const c = I.clicked(); if (c) { if (c[0] < game.W / 3) aboutPage = (aboutPage + ABOUT.length - 1) % ABOUT.length; else aboutPage = (aboutPage + 1) % ABOUT.length; aboutScroll = 0; }
    game.focus(0, 0, 0);
  },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#120c0a', '#1e1410']);
    const pg = ABOUT[aboutPage], w = Math.min(r.W - 30, 420), x0 = Math.round((r.W - w) / 2);
    r.overlay(g => {
      E.font.title(g, pg[0], r.W / 2, 10, { scale: 2, align: 'center' });
      txt(g, '◂ ' + (aboutPage + 1) + ' / ' + ABOUT.length + ' ▸', r.W / 2, 34, '#c8b8a8', { align: 'center' });
      let y = 50 - Math.round(aboutScroll);
      const maxY = r.H - 22;
      for (const para of pg[1]) {
        const lines = E.font.wrap(para, w); for (const l of lines) { if (y > 44 && y < maxY) txt(g, l, x0, y, para.startsWith('•') ? '#f4ecd8' : '#e8d8c0'); y += 10; } y += 5;
      }
      const total = y + aboutScroll - 50; if (aboutScroll > total) aboutScroll = Math.max(0, total - 40);
      px.rect(g, 0, r.H - 18, r.W, 18, '#120c0a');
      txt(g, `${label('left')} ${label('right')} page · ${label('up')} ${label('down')} scroll · ${label('cancel')} back`, r.W / 2, r.H - 13, '#a89888', { align: 'center' });
    });
  }
};

/* ATTRACT: the demo plays itself; any input goes back to the title */
scenes.attract = {
  camera: { zoom: false },
  enter() {
    W.mode = 'attract'; W.demo = true; fadeOut = 0; W.mini = null; convoQ.length = 0; convoDone = null; talk.close();
    enterPlace('town', { peds: 5, traffic: 4 }); music('town');
    const h = makeHero('sal', TOWN.at.hero.x, TOWN.at.hero.y, null, { robe: true, god: true }); W.heroes = [h]; h.auto = () => ({});
    S.ammo = 99; W.objective = null; game.cam.snap = true;
    AP.script = game.script(function* () { yield* attractDemo(); game.go('attract', {}); });
    AP.t = 0;
  },
  exit() { W.demo = false; hideHud(); game.setView('threequarter'); game.weather = null; L.enabled = false; W.mini = null; },
  update(dt) {
    AP.t += dt; updateBanner(dt);
    if (AP.t > .6 && anyInput()) { game.players.forEach(p => p.consumeAll()); game.go('title'); return; }
    if (W.mini) { W.mini.update(dt); camera(); return; }
    updateTalk(dt);
    updateWorld(dt); camera();
  },
  draw(r) { drawWorld(r); drawOverlay(r); talk.draw(r); drawFade(r);
    r.overlay(g => { if (Math.floor(game.real * 1.5) % 2) txt(g, touchLocked ? 'DEMO · TAP TO RETURN' : 'DEMO · PRESS ANY BUTTON', r.W / 2, r.H - 16, '#ffd36a', { align: 'center' }); E.font.title(g, 'THE BARITONES', 8, 8, { scale: 1, colors: ['#fff4d8', '#e8b84a'] }); }); }
};
