/* The play scene, the attract mode, Dev Tools, and the game's start. */
const INTRO = {
  0: 'The Larder is where the food goes to wait. Wait with it. Mind the hungry ones.', 1: 'More halls. More hunger. The generators breed faster when watched.', 2: 'The Long Pantry. Pot-Lobbers live here. Duck. Then eat.',
  3: 'A hoard! Grab everything before the lid drops.', 4: 'The Ossuary: everyone here is on a diet. Permanently.', 5: 'Thieves lurk and a bell hangs unrung. Do not ring it. Ring it.', 6: 'The Tithe stalks the Gravy Crypt. Keep a flask. Keep two.',
  7: 'Another hoard. Gold does not taste of anything, but it scores.', 8: 'The Furnace: the kitchen of the kitchen. Mind the heat. Mind the gravy.', 9: 'The Last Simmer. Everything left is angry and warm.', 10: 'The king is at the head of the table. You are the main course.'
};
const DEVUI = { open: false, page: 0, i: 0, spawnType: 'n', spawnRank: 1, scroll: 0 };
let pendingJoin = [];

function startFloor(d) {
  const step = d.step || 0, P = PLAN[step];
  if (RUN.attract) RUN.seed = 4242;
  buildWorld(step, { players: RUN.heroes.length });
  W.heroes = RUN.heroes.slice();
  W.heroes.forEach(h => { h.shot = null; h.stairT = 0; h.combo.cancel(); h.bell = 0; h.local = true; h.gone = false; });
  placeHeroes(W.heroes, W.starts);
  W.allyStun = OPT.allyStun && (P.no >= 6 || RUN.descent2 || P.kind === 'boss' || P.kind === 'treasure' && step > 4);
  W.cardT = RUN.attract ? 0 : 5; W.cardLine = (P.kind === 'floor' && [0, 4, 8].includes(step) || P.kind === 'boss' ? REALMS[P.realm !== undefined ? P.realm : 3].line + ' ' : '') + (INTRO[step] || '');
  W.attract = !!RUN.attract;
  RUN.maxFloor = Math.max(RUN.maxFloor || 1, P.no || RUN.maxFloor || 1);
  if (W.allyStun && step === 5 + 0) say('stun', { force: true });
  game.cam.bounds = v => W && W.map ? W.map.bounds(v) : null;
  game.cam.smooth = .12;
  const hh = W.heroes.find(h => !h.down) || W.heroes[0];
  game.follow && game.follow(null);
  game.cam.frame(W.heroes, { margin: 64, zoom: [.5, .65] });
  game.setZoom && game.setZoom(.65);
  game.focus(hh.x, hh.y, 12); game.cam.snap = true;
  music(P.kind === 'boss' ? 'boss' : P.kind === 'treasure' ? 'hoard' : REALMS[P.realm].music);
  if (!W.attract) { if (step === 0) say('hint1', { again: true }); }
  for (const h of W.heroes) h.combo.cancel();
  if (RUN.attract) { for (const h of W.heroes) { h.bot = makeBot(true); } }
  else if (DEV.bot && W.heroes[0]) W.heroes[0].bot = makeBot(true);
  if (RUN.attract && P.kind === 'boss' && W.boss) { W.boss.hp = W.boss.maxhp * .6; W.boss.phase = 2; W.boss.state = 'idle'; }
}

function camStep() {
  const alive = W.heroes.filter(h => !h.down && !h.gone), list = alive.length ? alive : W.heroes.filter(h => !h.gone);
  if (!list.length) return;
  if (list.length === 1) { game.cam.frame(null); game.focus(list[0].x, list[0].y, 12); }
  else game.cam.frame(list, { margin: 64, zoom: [.45, .65] });
}

function addLocalHero(inp) {
  if (!W || RUN.mode === 'net' || W.attract || W.time < (W.noJoinUntil || 0)) { if (W && inp !== game.input && game.players.includes(inp) && W.time < (W.noJoinUntil || 0)) game.removePlayer(inp); return; }
  const taken = new Set(W.heroes.map(h => h.cls)), free = [0, 1, 2, 3].find(i => !taken.has(i));
  if (free === undefined) return;
  const h = makeHero(W.heroes.length, free, inp); h.local = true; h.name2 = null; h.pickT = 3.5;
  const near = W.heroes.find(o => !o.down) || W.heroes[0]; h.x = near.x + 8; h.y = near.y; h.invuln = 1.5;
  W.heroes.push(h); RUN.heroes = W.heroes;
  game.audio.sfx('rise'); W.texts.push({ x: h.x, y: h.y, z: 24, str: h.C.name, col: h.C.color, t: 0, life: 1.5 });
}

function playUpdate(dt) {
  if (!W) return;
  if (W.cardT > 0) {
    W.cardT -= dt; camStep(); animateAll(0);
    if (W.heroes.some(h => h.input && (h.input.pressed('fire') || h.input.pressed('confirm') || h.input.pressed('start'))) && W.cardT < 4.5) W.cardT = 0;
    if (W.cardT <= 0) { W.cardT = 0; }
    return;
  }
  if (DEVUI.open) { devUpdate(dt); camStep(); return; }
  for (const j of pendingJoin.splice(0)) addLocalHero(j);
  // class switch for a just-joined player
  for (const h of W.heroes) if (h.pickT > 0 && h.input) {
    h.pickT -= dt; const I = h.input, d = I.pressed('magic') ? 1 : 0; h.int.magic = false;
    if (d) { const taken = new Set(W.heroes.filter(o => o !== h).map(o => o.cls)); let c = h.cls; for (let k = 0; k < 4; k++) { c = (c + d + 4) % 4; if (!taken.has(c)) break; } if (c !== h.cls) { const o = { x: h.x, y: h.y }; Object.assign(h, { cls: c, C: CLASSES[c], rig: CLASSES[c].rig(), combo: new E.Combo(CLASSES[c].moves, { window: .45 }), name: CLASSES[c].name }); h.x = o.x; h.y = o.y; game.audio.sfx('menu'); } }
  }
  if (!W.descend && !W.gameOver) simStep(dt);
  else if (W.descend) { W.descend.t += dt; for (const m of W.mons) m.vx = m.vy = 0; if (W.descend.t > .9 && !W.leaving) leaveFloor(); }
  if (W.gameOver && !W.leaving) { W.leaving = true; game.go('over', {}); }
  animateAll(dt);
  for (const h of W.heroes) if (h.sound !== false) { if (h.hp < 200 && !h.down && h.local && Math.floor(W.time * 2) !== h.beatT) { h.beatT = Math.floor(W.time * 2); sfx('heart', { vol: .5 }); } }
  camStep();
  for (const h of W.heroes) if (h.hurtRaw > 0) { if (h.hurtRaw > 3) Voice.bark(h); h.hurtRaw = 0; }
}
function leaveFloor() {
  W.leaving = true; const d = W.descend;
  for (const h of W.heroes) h.floors++;
  if (d.to === -1) { game.go('ending', {}, { fade: 'white', seconds: .8 }); return; }
  RUN.step = d.to;
  game.go('play', { step: d.to }, { fade: 'iris', seconds: .6, at: { x: d.by.x, y: d.by.y, z: 8 } });
}

function playDraw(r) {
  if (!W) return;
  drawWorld(r); drawHud(r);
  if (DEVUI.open) drawDev(r);
}

const SCENE_PLAY = {
  pausable: true, view: 'threequarter', input: GD_INPUT, res: 'ps1', expand: true, propSize: 1.3, camera: { zoom: [.55, 1.5], start: .65, tall: 1.25 },
  enter(d) { RUN.attract = false; if (RUN.mode === 'net') return; game.allowJoin({ max: 4, onJoin: inp => pendingJoin.push(inp) }); startFloor(d || { step: 0 }); },
  update: playUpdate, draw: playDraw
};

// ---------- the attract mode ----------
const ATTRACT = [
  { kind: 'floor', step: 1, t: 25 }, { kind: 'floor', step: 5, t: 20 }, { kind: 'floor', step: 8, t: 15 }, { kind: 'floor', step: 10, t: 20 },
  { kind: 'scores', t: 6 }, { kind: 'prologue', t: 8 }, { kind: 'title', t: 4 }
];
let att = null;
function attractSeg() {
  const s = ATTRACT[att.i % ATTRACT.length]; att.seg = s; att.t = 0;
  if (s.kind === 'floor') {
    RUN.attract = true; RUN.descent2 = false; RUN.seed = 4242 + att.i; RUN.mode = 'solo';
    RUN.heroes = CLASSES.map((c, i) => { const h = makeHero(i, i, null); h.bot = makeBot(true); h.hp = 800; h.flasks = 3; return h; });
    startFloor({ step: s.step });
    for (const h of W.heroes) { h.bot = makeBot(true); h.hp = 800; h.flasks = 3; }
    W.director = 0;
    W.heroes.forEach(h => { h.local = true; });
    music(s.step === 10 ? 'boss' : s.step >= 8 ? 'furnace' : s.step >= 4 ? 'ossuary' : 'larder');
  } else { W = null; music(s.kind === 'title' ? 'title' : 'title'); }
}
const SCENE_ATTRACT = {
  pausable: false, view: 'threequarter', input: GD_INPUT, res: 'ps1', expand: true, propSize: 1.3,
  enter() { att = { i: 0, t: 0, ignore: .5 }; game.allowJoin(false); attractSeg(); },
  exit() { RUN.attract = false; W = null; DEV.bot = false; },
  update(dt) {
    att.ignore -= dt; att.t += dt;
    if (att.ignore < 0 && activity()) { RUN.attract = false; RUN.heroes = []; W = null; idle = 0; game.go('title', {}, { fade: .2 }); game.input.consumeAll(); return; }
    const s = att.seg;
    if (s.kind === 'floor' && W) {
      // a director keeps monsters coming when the screen is quiet
      W.director -= dt; const alive = W.mons.filter(m => !m.dead).length;
      if (W.director <= 0 && alive < 14 && W.kind !== 'boss') { W.director = 1.5; const h = W.heroes[Math.floor(Math.random() * 4)], a = rnd(TAU), x = h.x + Math.cos(a) * 130, y = h.y + Math.sin(a) * 130; if (!W.map.solidAt(x, y)) { const ch = pick(PLAN[W.step].mons.filter(c => c !== 'x')); const m = newMonster(ch, x, y, 2, { emerge: .4 }); W.mons.push(m); } }
      if (W.step === 5 && W.time > 2 && W.bellObj && !W.bellObj.rung) { const h = W.heroes[0]; ringBell(h); }
      if (W.step === 5 && W.time > 4 && !W.titheSpawned) spawnTithe();
      if (W.kind === 'boss' && W.boss) { W.boss.state = W.boss.state === 'sleep' ? 'idle' : W.boss.state; }
      for (const h of W.heroes) { h.hp = Math.max(h.hp, 300); h.flasks = Math.max(h.flasks, 1); }
      if (W.step === 8) for (const h of W.heroes) if (W.time < 3) h.hp = 800;
      if (!W.descend) simStep(dt); animateAll(dt); camStep();
      if (W.descend) W.descend = null;
    }
    if (att.t >= s.t) { att.i++; attractSeg(); }
  },
  draw(r) {
    const s = att.seg;
    if (s.kind === 'floor' && W) { drawWorld(r); drawHud(r); }
    else if (s.kind === 'scores') { titleBack(r, game.real * .4); r.overlay(g => drawScores(g, r, -1)); }
    else if (s.kind === 'prologue') {
      titleBack(r, game.real * .4);
      r.overlay(g => { const L = ['DEEP BELOW THE KING\'S TABLE, THE GAUNT IS HUNGRY.', 'EVERY FLOOR HE EATS A LITTLE MORE.', 'FOUR FOOLS HAVE COME TO FEED HIM SOMETHING ELSE.']; L.forEach((l, i) => { if (att.t > i * 2.2) E.font.text(g, l, r.W / 2, 60 + i * 24, '#ffe9b8', { align: 'center', shadow: '#000' }); }); });
    } else SCENE_TITLE.draw(r);
    r.overlay(g => { E.font.title(g, 'DEMO', 30, r.H - 24, { scale: 1, colors: ['#ffd860', '#a06010'], outline: '#000', align: 'center' }); if (blink(1.5)) E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 14, '#ffffff', { align: 'center', outline: '#000' }); });
  }
};

// ---------- Dev Tools ----------
function devRows() {
  const P = DEVUI.page, rows = [];
  const tog = (label, key) => rows.push({ label: label, val: () => DEV[key] ? 'ON' : 'off', act: () => { DEV[key] = !DEV[key]; DEV.touched = true; if (key === 'bot' && W.heroes[0]) W.heroes[0].bot = DEV.bot ? makeBot(true) : null; } });
  if (P === 0) {
    tog('God mode', 'god'); tog('Noclip', 'noclip'); tog('Infinite keys & flasks', 'infinite'); tog('Freeze monsters', 'freeze'); tog('One-hit kills', 'onehit'); tog('Generators off', 'gensOff'); tog('Show hitboxes', 'hitboxes'); tog('Show flow field', 'flow'); tog('Show net stats', 'netstats'); tog('Show bot thoughts', 'botThoughts');
    rows.push({ label: 'Time scale', val: () => 'x' + DEV.timeScale, act: d => { const o = [.25, .5, 1, 2]; DEV.timeScale = o[(o.indexOf(DEV.timeScale) + (d || 1) + 4) % 4]; DEV.touched = DEV.timeScale !== 1 || DEV.touched; } });
  } else if (P === 1) {
    PLAN.forEach((p, i) => rows.push({ label: p.kind === 'floor' ? 'Floor ' + p.no + ': ' + p.name : p.kind === 'treasure' ? 'Treasure room ' + (i < 5 ? 'I' : 'II') : 'Boss: King Famish', val: () => '', act: () => devWarp(i) }));
    rows.push({ label: 'Boss phase 2', val: () => '', act: () => { devWarp(10); setTimeout(() => { if (W.boss) { W.boss.hp = W.boss.maxhp * .6; bossPhaseCheck(W.boss); } }, 50); } });
    rows.push({ label: 'Boss phase 3', val: () => '', act: () => { devWarp(10); setTimeout(() => { if (W.boss) { W.boss.hp = W.boss.maxhp * .3; W.boss.phase = 2; bossPhaseCheck(W.boss); } }, 50); } });
    rows.push({ label: 'Ending', val: () => '', act: () => { DEVUI.open = false; game.go('ending'); } });
    rows.push({ label: 'Game over', val: () => '', act: () => { DEVUI.open = false; game.go('over', {}); } });
    rows.push({ label: 'Descent II (floor 1)', val: () => '', act: () => { RUN.descent2 = true; devWarp(0); } });
    rows.push({ label: 'Restart floor', val: () => '', act: () => devWarp(W.step) });
  } else if (P === 2) {
    const me = () => W.heroes.find(h => !h.down) || W.heroes[0];
    rows.push({ label: '+3 keys', val: () => '', act: () => W.heroes.forEach(h => h.keys = Math.min(heroLimit(h), h.keys + 3)) });
    rows.push({ label: '+3 flasks', val: () => '', act: () => W.heroes.forEach(h => h.flasks = Math.min(heroLimit(h), h.flasks + 3)) });
    rows.push({ label: 'Roast', val: () => '', act: () => dropItem('roast', me().x + 12, me().y) }); rows.push({ label: 'Spoiled stew', val: () => '', act: () => dropItem('stew', me().x + 12, me().y) });
    AMULETS.forEach(a => rows.push({ label: 'Amulet: ' + AMULET_NAMES[a], val: () => '', act: () => { const h = me(); h.amulet = a; h.amuletT = 20; } }));
    rows.push({ label: 'Every special potion', val: () => '', act: () => W.heroes.forEach(h => SPECIALS.forEach(s => h.specials[s] = true)) });
    rows.push({ label: '+1000 score', val: () => '', act: () => W.heroes.forEach(h => h.score += 1000) });
    rows.push({ label: 'Heal the party', val: () => '', act: () => W.heroes.forEach(h => { h.hp = 1000; if (h.down) heroRise(h, me()); }) });
    rows.push({ label: 'Spawn type', val: () => MON[DEVUI.spawnType].name, act: d => { const k = Object.keys(MON).filter(c => c !== 't' || true); DEVUI.spawnType = k[(k.indexOf(DEVUI.spawnType) + (d || 1) + k.length) % k.length]; } });
    rows.push({ label: 'Spawn rank', val: () => String(DEVUI.spawnRank), act: d => { DEVUI.spawnRank = (DEVUI.spawnRank + (d || 1) + 2) % 3 + 1; } });
    rows.push({ label: 'Spawn 5 here', val: () => '', act: () => { const h = me(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, m = newMonster(DEVUI.spawnType, h.x + Math.cos(a) * 50, h.y + Math.sin(a) * 50, DEVUI.spawnRank, { emerge: .4 }); if (!W.map.solidAt(m.x, m.y)) W.mons.push(m); } } });
    rows.push({ label: 'Spawn a generator', val: () => '', act: () => { const h = me(), ch = Object.keys(GEN)[Math.floor(rnd(6))], gd = GENDEF[ch], rk = DEVUI.spawnRank; W.gens.push({ ch, G: GEN[ch], x: h.x + 40, y: h.y, r: 7, rank: rk, rank0: rk, hp: Math.ceil(4 * rk * TUNE.generatorHp), maxhp: Math.ceil(4 * rk * TUNE.generatorHp), t: 1, kids: 0, flash: 0, id: W.gens.length, dead: false, breathe: 0 }); void gd; } });
    rows.push({ label: 'Kill all monsters', val: () => '', act: () => W.mons.forEach(m => { if (!m.dead && !m.isBoss) killMon(m, me()); }) });
    rows.push({ label: 'Destroy all generators', val: () => '', act: () => W.gens.forEach(g => damageGen(g, 999, me())) });
    rows.push({ label: 'Open every door', val: () => '', act: () => W.doors.forEach(d => openDoorGroup(d)) });
    rows.push({ label: 'Reveal secrets', val: () => '', act: () => W.fakes.forEach(f => f.found = 1) });
    rows.push({ label: 'Next impatience stage', val: () => '', act: () => { W.time = Math.max(W.time, W.imp1 ? (W.doorsOpen ? TUNE.impatience + 61 : TUNE.impatience + 1) : TUNE.impatience - 29); } });
    rows.push({ label: 'Start the attract mode', val: () => '', act: () => { DEVUI.open = false; game.go('attract'); } });
    rows.push({ label: 'Bot plays player 1', val: () => DEV.bot ? 'ON' : 'off', act: () => { DEV.bot = !DEV.bot; DEV.touched = true; W.heroes[0].bot = DEV.bot ? makeBot(true) : null; } });
  } else {
    for (const k in TUNE_DEF) { const [d, lo, hi, st, lab] = TUNE_DEF[k]; rows.push({ label: lab, slider: { k, lo, hi, st }, val: () => String(+TUNE[k].toFixed(2)), act: dir => { TUNE[k] = clamp(+(TUNE[k] + dir * st).toFixed(3), lo, hi); tuneSave(); DEV.touched = true; } }); }
    rows.push({ label: 'RESET TUNING TO DEFAULTS', val: () => '', act: () => { tuneReset(); } });
  }
  return rows;
}
const DEV_PAGES = ['CHEATS', 'WARP', 'GIVE & SPAWN', 'TUNING'];
function devWarp(step) { DEVUI.open = false; DEV.touched = true; RUN.step = step; if (W) for (const h of W.heroes) { h.down = false; if (h.hp < 300) h.hp = 700; } game.go('play', { step }, { fade: .2 }); }
function devUpdate(dt) {
  const I = game.input, rows = devRows(); DEVUI.age = (DEVUI.age || 0) + dt; if (DEVUI.age < .25) { I.consumeAll(); return; } DEVUI.i = clamp(DEVUI.i, 0, rows.length - 1);
  const vis = 10;
  if (I.repeat('up', .3, .08)) { DEVUI.i = (DEVUI.i + rows.length - 1) % rows.length; game.audio.sfx('tick'); }
  if (I.repeat('down', .3, .08)) { DEVUI.i = (DEVUI.i + 1) % rows.length; game.audio.sfx('tick'); }
  if (DEVUI.i < DEVUI.scroll) DEVUI.scroll = DEVUI.i; if (DEVUI.i >= DEVUI.scroll + vis) DEVUI.scroll = DEVUI.i - vis + 1;
  const row = rows[DEVUI.i];
  if (I.pressed('magic') || I.pressed('start') && false) { DEVUI.page = (DEVUI.page + 1) % DEV_PAGES.length; DEVUI.i = 0; DEVUI.scroll = 0; }
  const ptr = I.pointer(), clk = I.clicked();
  if (ptr && I.mouse.active) { const r = game.r; for (let k = 0; k < vis; k++) { const idx = DEVUI.scroll + k; if (idx < rows.length && hit(ptr, 20, 40 + k * 15, r.W - 40, 14)) DEVUI.i = idx; } }
  if (clk) { const r = game.r; for (let k = 0; k < DEV_PAGES.length; k++) if (hit(clk, 20 + k * 90, 22, 86, 14)) { DEVUI.page = k; DEVUI.i = 0; DEVUI.scroll = 0; return; } for (let k = 0; k < vis; k++) { const idx = DEVUI.scroll + k; if (idx < rows.length && hit(clk, 20, 40 + k * 15, r.W - 40, 14)) { DEVUI.i = idx; (rows[idx].slider ? () => rows[idx].act(1) : rows[idx].act)(); } } }
  if (I.pressed('confirm') || I.pressed('fire')) { if (row.slider) row.act(1); else row.act(1); game.audio.sfx('menu'); }
  if (I.repeat('right', .3, .06)) { if (row.slider) row.act(1); else if (row.val && row.val() !== '' && !/^[0-9.x]+$/.test('')) row.act(1); }
  if (I.repeat('left', .3, .06)) { if (row.slider) row.act(-1); else if (row.val && row.val() !== '') row.act(-1); }
  if (I.pressed('cancel') || I.pressed('pause')) { DEVUI.open = false; game.audio.sfx('back'); I.consumeAll(); }
}
function drawDev(r) {
  const rows = devRows(); r.overlay(g => {
    px.blend(g, .8, 'normal', () => px.rect(g, 8, 8, r.W - 16, r.H - 16, '#08060e'));
    E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#14101e', '#0a0812'], border: '#ff6040', alpha: .9 });
    E.font.text(g, 'DEV TOOLS', 20, 12, '#ff6040', { outline: '#000' });
    DEV_PAGES.forEach((p, k) => { E.font.text(g, p, 20 + k * 90, 24, k === DEVUI.page ? '#ffd860' : '#7a7090', { font: 'tiny' }); if (k === DEVUI.page) px.rect(g, 20 + k * 90, 32, E.font.width(p, { font: 'tiny' }), 1, '#ffd860'); });
    for (let k = 0; k < 10; k++) {
      const idx = DEVUI.scroll + k, row = rows[idx]; if (!row) break; const y = 40 + k * 15, on = idx === DEVUI.i;
      if (on) px.rect(g, 18, y - 1, r.W - 36, 13, '#2a2040');
      E.font.text(g, row.label, 24, y + 2, on ? '#ffffff' : '#c0b8d8', { font: 'tiny' });
      if (row.slider) { const s = row.slider, u = (TUNE[s.k] - s.lo) / (s.hi - s.lo); px.rect(g, r.W - 150, y + 4, 90, 3, '#2a2438'); px.rect(g, r.W - 150, y + 4, 90 * u, 3, on ? '#ffd860' : '#a08850'); px.rect(g, r.W - 150 + 90 * u - 1, y + 1, 3, 9, '#fff'); }
      E.font.text(g, row.val(), r.W - 24, y + 2, '#ffd860', { align: 'right', font: 'tiny' });
    }
    E.font.text(g, 'up/down: pick   left/right: change   ' + glyph('confirm') + ': do   ' + glyph('magic') + ': next page   ' + glyph('cancel') + ': close', r.W / 2, r.H - 20, '#a098b8', { align: 'center', font: 'tiny' });
  });
}
