/* DICK WHITMAN'S WILD RIDE: the play scene: walking the floor, talking, the clock, the HUD. */
(() => {
'use strict';
const game = window.__game, M = game.MAD, E = M.E, px = E.px, { clamp } = E;
const TS = M.TS;
const CLOCK_SECS = 2.0;   // real seconds per game minute

/* ---------- state ---------- */
function newState() {
  return { clock: 510, composure: 72, haze: 0, heat: 0, rep: 0, cigs: 14, flags: {}, known: {}, slides: ['carousel', 'kitchen', 'jetage', 'penthouse', 'plain', 'corner'],
    headlinePower: 2, world: 'office', pos: null, demo: false, drinks: 0, smokes: 0, blackouts: 0, meltdowns: 0, pitches: {}, played: 0, sprintGrade: null, ended: null };
}
M.S = newState();
M.mode = 'world';
M.toasts = [];
const hero = new E.Body({ x: 0, y: 0, r: 4 });
hero.facing = Math.PI / 2;
let heroRig = null, talk = null, curWho = 'narrator', lastKey = '', lastN = 0, stepT = 0, smokeT = 0, hover = null, autoTarget = null, autoDest = null, cigT = 0, tut = 0;
M.hero = hero;
const portraitCache = {};
const portrait = who => {
  if (who === 'you') return heroRig;
  if (who === 'narrator') return null;
  const w = M.worlds[M.S.world], n = (w.npcs || []).find(n => n.cast === who && n.id === who) || Object.values(M.worlds).flatMap(x => x.npcs || []).find(n => n.cast === who);
  if (n) return n.rig;
  return portraitCache[who] || (portraitCache[who] = M.rigFor(who));
};

/* ---------- helpers ---------- */
const fmtClock = c => { let h = Math.floor(c / 60), m = Math.floor(c % 60); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; };
M.fmtClock = fmtClock;
const W = () => M.worlds[M.S.world];
M.W = W;
function toast(text, color) { M.toasts.push({ text, color: color || '#ffffff', life: 2.6 }); if (M.toasts.length > 5) M.toasts.shift(); }
M.toast = toast;
function stat(key, d, label, good) {
  const S = M.S, before = S[key]; S[key] = key === 'rep' || key === 'cigs' ? S[key] + d : clamp(S[key] + d, 0, 100);
  if (key === 'heat') S.heat = clamp(S.heat, 0, 9);
  if (key === 'cigs') S.cigs = Math.max(0, S.cigs);
  if (S[key] !== before || key === 'rep') toast(label + ' ' + (d > 0 ? '+' : '') + d, good ? '#9ee89a' : '#ff9a8a');
}
M.stat = stat;
function applyFx(fx) {
  if (!fx) return; const S = M.S;
  if (fx.composure) stat('composure', fx.composure, 'COMPOSURE', fx.composure > 0);
  if (fx.haze) stat('haze', fx.haze, 'HAZE', fx.haze < 0);
  if (fx.heat) stat('heat', fx.heat, 'HEAT', fx.heat < 0);
  if (fx.rep) stat('rep', fx.rep, 'REPUTATION', fx.rep > 0);
  if (fx.cig) { stat('cigs', fx.cig, 'CIGARETTES', false); }
  if (fx.min) { S.clock += fx.min; }
  if (fx.slide) M.giveSlide(fx.slide);
  if (fx.know) { M.learn(fx.know); }
  if (fx.flag) S.flags[fx.flag] = 1;
  if (fx.ping && M.P) M.P.interest = clamp(M.P.interest + fx.ping, 0, 140);
}
M.applyFx = applyFx;
M.learn = key => { if (!M.S.known[key]) { M.S.known[key] = 1; const [c, t, k] = key.split(':'); toast('NOTE: ' + M.CLIENTS[c].name.split(' ')[0].toUpperCase() + ' ' + (k === 'love' ? 'LIKES ' : 'DISLIKES ') + M.TAGS[t].n.toUpperCase(), '#ffd36a'); game.audio.sfx('pickup'); } };
M.giveSlide = id => {
  const S = M.S; if (!S.slides.includes(id)) { S.slides.push(id); toast('NEW SLIDE: ' + M.SLIDES[id].t.toUpperCase(), '#ffd36a'); game.audio.sfx('powerup'); }
  if (id === 'farm') { /* heat comes when it is played */ }
};

/* ---------- dialogue runner ---------- */
function showLine(line, then, extra) {
  const [who, text] = line, c = M.CAST[who] || M.CAST.narrator;
  curWho = who;
  talk.nameColor = c.color || '#ffd36a';
  talk.say(text, Object.assign({ name: c.name || null, portrait: portrait(who), onDone: then }, extra || {}));
}
function askNode(a, line, then) {
  M.curAsk = a.ask;
  const who = line ? line[0] : 'you', text = line ? line[1] : 'What do you say?';
  showLine([who, text], null, { choices: a.ask.map(o => o.t), onChoice: i => { const o = a.ask[i]; applyFx(o.fx); run(o.then || [], then); } });
}
function run(nodes, done) {
  let i = 0;
  const step = () => {
    if (i >= nodes.length) { if (done) done(); return; }
    const n = nodes[i++];
    if (!Array.isArray(n)) {
      if (n.fn) { n.fn(); step(); return; }
      if (n.ask) { askNode(n, null, step); return; }
    }
    const nx = nodes[i];
    if (nx && !Array.isArray(nx) && nx.ask) { i++; askNode(nx, n, step); return; }
    showLine(n, step);
  };
  step();
}
M.run = run;
M.say = (who, text, done) => showLine([who, text], done);
M.talking = () => !!(talk && talk.open);

/* ---------- worlds ---------- */
function loadWorld(id, pos) {
  const S = M.S; S.world = id; const w = W();
  const p = pos || w.spawn; hero.x = p[0]; hero.y = p[1]; hero.vx = hero.vy = 0; hero.z = 0;
  game.cam.bounds = v => w.map.bounds(v);
  game.follow(hero, { z: 14 });
  game.audio.music(M.songs[w.music], { fade: .6 });
  autoTarget = autoDest = null;
}
M.loadWorld = loadWorld;
function visibleTargets() {
  const w = W(); return [...(w.npcs || []).filter(n => n.show()).map(n => ({ kind: 'npc', ref: n, x: n.x, y: n.y, label: n.label, r: 12 })),
    ...(w.things || []).filter(t => t.show()).map(t => ({ kind: 'thing', ref: t, x: t.x, y: t.y, label: t.label, r: t.r }))];
}
M.targetById = id => visibleTargets().find(t => t.ref.id === id);
function nearest(x, y, maxd) {
  let best = null, bd = 1e9;
  for (const t of visibleTargets()) { const d = Math.hypot(t.x - x, t.y - y) - (t.r || 0) * .4; if (d < bd && d < maxd + (t.r || 0)) { bd = d; best = t; } }
  return best;
}
function interact(t) {
  if (!t) return;
  game.audio.sfx('confirm');
  if (t.kind === 'npc') {
    const n = t.ref; n.talking = true; n.face = Math.atan2(hero.y - n.y, hero.x - n.x);
    hero.facing = Math.atan2(n.y - hero.y, n.x - hero.x);
    run(n.talk(), () => { n.talking = false; M.afterTalk(n); });
  } else t.ref.use();
}
M.interact = interact;
M.afterTalk = n => { game.autosaveSoon = 1.2; };

/* ---------- consumables ---------- */
function smoke() {
  const S = M.S;
  if (smokeT > 0) return;
  if (S.cigs <= 0) { toast('OUT OF CIGARETTES. ROLAND KEEPS A CARTON.', '#ff9a8a'); game.audio.sfx('cancel'); return; }
  S.cigs--; S.smokes++; smokeT = 2.2;
  stat('composure', 10, 'COMPOSURE', true); stat('haze', 3, 'HAZE', false); S.clock += 2;
  game.audio.sfx('lighter'); game.audio.sfx('flame');
  game.particles.smoke(hero.x, hero.y, 30, 6, { size: 4 });
  game.particles.fire(hero.x + Math.cos(hero.facing) * 5, hero.y + Math.sin(hero.facing) * 5, 24, 3, { size: 1 });
  M.input_rumble && game.input.rumble(.2, .1);
}
M.smoke = smoke;
M.useBarCart = where => {
  const S = M.S;
  run([['narrator', 'You are standing at ' + where + '. The bottles line up like jurors.'], { ask: [
    { t: 'Pour two fingers of rye.', fx: { composure: 14, haze: 14, min: 8 }, then: [{ fn: () => { S.drinks++; game.audio.sfx('clink'); game.audio.sfx('swallow'); } }] },
    { t: 'Pour a glass of water.', fx: { composure: 3, haze: -8, min: 3 }, then: [{ fn: () => game.audio.sfx('pickup') }] },
    { t: 'Walk away from it.', fx: {}, then: [] }] }]);
};
M.useSofa = () => run([['narrator', 'The leather sofa has the shape of someone who has waited here before.'], { ask: [
  { t: 'Close your eyes for a half hour.', fx: { composure: 14, haze: -14, min: 30 }, then: [{ fn: () => game.audio.sfx('heal') }, ['narrator', 'You dream of a porch. When you wake, Gwen is pretending she did not look.']] },
  { t: 'Not now.', fx: {}, then: [] }] }]);
M.useDesk = () => {
  const S = M.S;
  run([['narrator', 'Your desk. A blotter, an ashtray, a photograph facing away from you.'], { ask: [
    { t: 'Open the drawer. Take a pack.', fx: { cig: 6, composure: 2 }, then: [{ fn: () => game.audio.sfx('pickup') }] },
    { t: 'Read the notebook.', fx: {}, then: [{ fn: () => { M.openJournal(); } }] },
    { t: 'Leave it.', fx: {}, then: [] }] }]);
};
M.usePhone = () => {
  const S = M.S;
  run(M.T.grace(), () => {
    S.flags.grace = 1; S.clock = Math.max(S.clock, 17 * 60 + 10); M.toast('THE DAY IS ALMOST OVER', '#ffd36a'); game.audio.music(M.songs.office, { fade: .6 });
  });
};
M.useElevator = from => {
  const S = M.S, f = S.flags;
  if (from === 'office') {
    if (!f.margie || !f.dunn) return run([['you', 'Not yet. The Ember Gold copy first. Then Mr. Dunn. Lunch is for men who have finished something.']]);
    if (!f.pitch1) {
      return run([['narrator', 'The elevator operator has an opinion about everyone and a face that gives none away.'], { ask: [
        { t: 'Go to lunch at the Gilded Fig.', fx: {}, then: [{ fn: () => {
          if (S.clock > 12 * 60 + 40) { f.late1 = 1; toast('YOU ARE LATE', '#ff9a8a'); } S.clock = Math.max(S.clock, 12 * 60 + 30); f.lunch = 1; game.audio.sfx('ding'); M.travel('bar'); } }] },
        { t: 'Not yet.', fx: {}, then: [] }] }]);
    }
    if (!f.pitch2) return run([['you', 'Teague is at three. Nobody leaves before Teague.']]);
    if (!f.grace) return run([['you', 'The phone on my desk is ringing. It always rings at the worst moment, as if it knows.']]);
    return run([['narrator', 'The elevator is empty and has been waiting for you.'], { ask: [
      { t: 'Go home.', fx: {}, then: [{ fn: () => { game.audio.sfx('ding'); M.endDay(); } }] },
      { t: 'One more look around.', fx: {}, then: [] }] }]);
  }
  if (!f.pitch1) return run([['you', 'Hollis is waiting in the back booth. Walking out would be rude, and also expensive.']]);
  run([['narrator', 'Outside the revolving door, Madison Avenue is making noise at itself.'], { ask: [
    { t: 'Back to the office.', fx: {}, then: [{ fn: () => { S.clock = Math.max(S.clock, 14 * 60 + 10); game.audio.sfx('ding'); M.travel('office', M.tc(40, 26)); } }] },
    { t: 'Another minute.', fx: {}, then: [] }] }]);
};
M.travel = (to, pos) => { game.fadeBusy = true; M.pendingTravel = { to, pos }; };

/* ---------- objectives ---------- */
M.objective = () => {
  const f = M.S.flags, wid = M.S.world;
  const at = (world, id, text) => ({ text, world, id });
  if (!f.gwen) return at('office', 'gwen', 'Say good morning at the front desk.');
  if (!f.joyce) return at('office', 'joyce', 'Check in with Joyce in the bullpen.');
  if (!f.margie) return at('office', 'margie', 'Margie has copy for Ember Gold. Find her desk.');
  if (!f.dunn) return at('office', 'dunn', 'Mr. Dunn wants a word. Shoes optional.');
  if (!f.pitch1) return wid === 'office' ? at('office', 'elevator', 'Lunch with Hollis of Sonora. Take the elevator.') : at('bar', 'hollis', 'Find Hollis Brandt in the back booth.');
  if (!f.pitch2) return wid === 'bar' ? at('bar', 'exit', 'Back to the office. Teague is at three.') : at('office', 'teague', 'Ember Gold at three. The conference room.');
  if (!f.grace) return wid === 'bar' ? at('bar', 'exit', 'Back to the office.') : at('office', 'phone', 'Your phone is ringing.');
  return wid === 'bar' ? at('bar', 'exit', 'Back to the office.') : at('office', 'elevator', 'Take the elevator home.');
};

/* ---------- the day's clock and slow-burn consequences ---------- */
function tickClock(dt) {
  const S = M.S, prev = S.clock; S.clock += dt / CLOCK_SECS;
  if (Math.floor(S.clock / 12) !== Math.floor(prev / 12)) { S.haze = Math.max(0, S.haze - 1); S.composure = Math.min(100, S.composure + (S.haze > 60 ? 0 : .6)); }
  if (S.clock > 18 * 60 + 30 && !S.flags.pitch2) { /* the day does not end early: pitch2 is simply late */ }
}
function checkCrises() {
  const S = M.S;
  if (S.demo) { S.composure = Math.max(S.composure, 50); S.haze = Math.min(S.haze, 60); return false; }
  if (S.haze >= 96) {
    S.blackouts++; S.haze = 52; S.composure = 40; S.clock += 120; stat('rep', -5, 'REPUTATION', false);
    run([['narrator', 'The room tilts like a deck. A voice that sounds like yours says something to a person you cannot see.'], ['narrator', 'When the floor returns, two hours are missing and Joyce has covered for you.']]); return true;
  }
  if (S.composure <= 0) {
    S.meltdowns++; S.composure = 35; S.clock += 25; stat('rep', -3, 'REPUTATION', false);
    run([['narrator', 'You find yourself in the stairwell with your forehead against cool paint. A cigarette burns down by itself.'], ['you', 'Breathe. Count to ten. Count to eleven.']]); return true;
  }
  return false;
}

/* ---------- the scene ---------- */
let fresh = true, inited = false;
function init() {
  if (inited) return; inited = true;
  talk = new E.Dialog(game, { voice: null, speed: 46, lines: 3, bg: ['#241a30', '#150f20'], border: '#d8c8a0', color: '#fdf6e6' });
  M.talk = talk;
  M.buildWorlds();
  heroRig = M.rigFor('you', { size: 1.12 });
  M.heroRig = heroRig;
}
M.init = init;
M.newRun = (demo) => {
  init(); M.S = newState(); M.S.demo = !!demo; M.mode = 'world'; M.toasts = []; fresh = false; tut = 0; autoTarget = autoDest = null; talk.close();
  for (const w of Object.values(M.worlds)) for (const n of w.npcs || []) { n.x = n.hx; n.y = n.hy; n.talking = false; }
  loadWorld('office', M.tc(40, 26));
  if (M.hubOnStart) M.hubOnStart();
};

function npcUpdate(dt) {
  const w = W();
  for (const n of w.npcs || []) {
    if (!n.show()) continue;
    let vx = 0, vy = 0;
    if (n.wander && !n.talking) {
      n.wi = n.wi || 0; const [tx, ty] = M.tc(...n.wander[n.wi]), d = Math.hypot(tx - n.x, ty - n.y);
      if (d < 4) n.wi = (n.wi + 1) % n.wander.length; else { vx = (tx - n.x) / d * n.speed; vy = (ty - n.y) / d * n.speed; n.x += vx * dt; n.y += vy * dt; n.face = Math.atan2(vy, vx); }
    } else if (!n.wander) {
      const dh = Math.hypot(hero.x - n.x, hero.y - n.y);
      const want = n.talking || dh < 44 ? Math.atan2(hero.y - n.y, hero.x - n.x) : (n.baseFace === undefined ? (n.baseFace = n.face) : n.baseFace);
      n.face = E.approachAng ? E.approachAng(n.face, want, 6 * dt) : want;
    }
    n.rig.update(dt, Object.assign({ x: n.x, y: n.y, z: 0, vx, vy, facing: n.face }, n.rigX || {}, n.talking ? { expr: 'smile' } : {}));
  }
}

function heroMove(dt) {
  const S = M.S, inp = game.input;
  let m = inp.move(), len = Math.hypot(m[0], m[1]);
  if (S.demo) len = 0;
  let dir = [0, 0], spd = 0;
  if (S.demo && M.aiDir) { dir = M.aiDir; spd = 1; }
  else if (len > .12) { autoTarget = autoDest = null; dir = game.view.screenDirToGround(m[0], m[1]); spd = Math.min(1, len); }
  else if (autoTarget || autoDest) {
    const tx = autoTarget ? autoTarget.x : autoDest[0], ty = autoTarget ? autoTarget.y : autoDest[1], d = Math.hypot(tx - hero.x, ty - hero.y);
    if (autoTarget && d < autoTarget.r + 12) { const t = autoTarget; autoTarget = null; interact(t); }
    else if (!autoTarget && d < 3) autoDest = null;
    else { if (W().flow.update) W().flow.update(tx, ty); dir = W().flow.dir(hero.x, hero.y, tx, ty); spd = 1; }
  }
  let speed = 70 * (inp.down('dash') ? 1.55 : 1) * (S.demo ? 1.5 : 1);
  if (S.haze > 60 && spd > 0) { const w = Math.sin(game.time * 3.1) * (S.haze - 55) / 60; dir = [dir[0] - dir[1] * w * .5, dir[1] + dir[0] * w * .5]; speed *= .88; }
  hero.vx = dir[0] * speed * spd; hero.vy = dir[1] * speed * spd;
  hero.update(dt, W().map);
  const moving = Math.hypot(hero.vx, hero.vy) > 8;
  if (moving) { hero.facing = Math.atan2(hero.vy, hero.vx); stepT -= dt; if (stepT <= 0) { stepT = .3; game.audio.sfx('footstep', { vary: .3 }); } }
  return moving;
}

function worldUpdate(dt) {
  const S = M.S, inp = game.input;
  if (M.pendingTravel) {   // elevator doors: a fade, then the other room
    const p = M.pendingTravel; M.pendingTravel = null; game.go('play', { travel: p, fade: 'iris' }); return;
  }
  if (smokeT > 0) smokeT -= dt;
  const moving = heroMove(dt);
  // interaction
  const near = nearest(hero.x, hero.y, 18); M.near = near;
  if (inp.lastDevice === 'mouse' || inp.lastDevice === 'keyboard') {
    const g = game.mouseGround && game.mouseGround(); hover = g && inp.lastDevice === 'mouse' ? nearest(g[0], g[1], 12) : null;
  } else hover = null;
  if (!S.demo) {
    if (inp.pressed('confirm') && near) interact(near);
    const c = inp.clicked();
    if (c && inp.lastDevice === 'mouse') {
      if (hover) { if (Math.hypot(hover.x - hero.x, hover.y - hero.y) < hover.r + 14) interact(hover); else autoTarget = hover; }
      else { const g = game.mouseGround && game.mouseGround(); if (g) autoDest = g; }
    }
    if (inp.pressed('skill')) smoke();
    if (inp.pressed('jump')) M.openJournal();
  }
  if (inp.pressed('attack') && !S.demo) { game.nextView(); }
  tickClock(dt);
  npcUpdate(dt);
  if (checkCrises()) return;
  if (S.clock > 15 * 60 + 30 && !S.flags.pitch2 && !S.flags.late2) { S.flags.late2 = 1; toast('TEAGUE IS WAITING', '#ff9a8a'); }
  if (S.flags.pitch2 && !S.flags.grace && Math.floor(game.time * 1) % 5 === 0 && Math.floor(game.time * 60) % 60 === 0 && M.mode === 'world' && S.world === 'office') game.audio.sfx('phone');
  heroRig.update(dt, { x: hero.x, y: hero.y, z: hero.z, vx: hero.vx, vy: hero.vy, facing: hero.facing, pose: smokeT > 0 ? 'hips' : undefined, expr: S.composure < 25 ? 'wince' : undefined });
  for (const t of M.toasts) t.life -= dt; M.toasts = M.toasts.filter(t => t.life > 0);
  if (game.autosaveSoon > 0 && (game.autosaveSoon -= dt) <= 0 && !S.demo && !M.HUB) { try { game.saves.autosave(); } catch (e) { /* storage blocked */ } }
}

M.openJournal = () => { M.mode = 'journal'; game.audio.sfx('select'); };

const play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: M.PRESET, res: 'ps1', expand: true, propSize: 1.25, camera: { zoom: [.6, 1.8], start: .85 },
  enter(data) {
    init(); M.syncSettings();
    game.lights.enabled = true;
    if (data && data.travel) { loadWorld(data.travel.to, data.travel.pos); }
    else if (data && data.load) { /* restored by saves.read */ loadWorld(M.S.world, M.S.pos || undefined); }
    else if (data && (data.fresh || fresh)) M.newRun(!!(data && data.demo));
    else loadWorld(M.S.world, [hero.x, hero.y]);
    game.audio.music(M.songs[W().music], { fade: .5 });
    M.mode = M.mode === 'ending' ? 'ending' : 'world';
    talk.close();
    if (M.S.world === 'office' && !M.S.flags.intro && !M.S.demo) { M.S.flags.intro = 1; tut = 14; setTimeout(() => {}, 0); }
    game.saves.canSave = false;
  },
  update(dt) {
    M.syncSettings();
    const S = M.S; talk.speed = S.demo ? 95 : 46;
    if (M.hubGate && M.hubGate(dt)) return;
    if (S.demo && M.demoUpdate) { if (M.demoUpdate(dt)) return; }
    // typed voice: each pair of letters blips at a pitch taken from the letter
    if (talk.open) {
      const key = talk.i + ':' + (talk.pages.length) + ':' + (talk.name || ''), n = Math.floor(talk.shown);
      if (key !== lastKey) { lastKey = key; lastN = 0; }
      if (n > lastN) { const txt = talk.pages[talk.i].join(' '); for (let k = lastN; k < n; k += 2) M.S.demo || M.speak(curWho, txt[k] || 'a'); lastN = n; }
    } else lastKey = '';
    if (talk.update(dt)) { npcUpdate(dt); return; }
    game.saves.canSave = M.mode === 'world' && !S.demo;
    if (M.mode === 'world') worldUpdate(dt);
    else if (M.mode === 'journal') { npcUpdate(dt); if (game.input.pressed('jump') || game.input.pressed('cancel') || game.input.pressed('confirm') || game.input.clicked()) { M.mode = 'world'; game.audio.sfx('cancel'); } }
    else if (M.modes && M.modes[M.mode]) M.modes[M.mode].update(dt);
    if (M.hubTick) M.hubTick(dt);
    if (tut > 0) tut -= dt;
  },
  draw(r) {
    const w = W(), S = M.S;
    w.map.drawFloor(r);
    game.lights.ambient = w.ambient;
    for (const l of w.lights) game.lights.add(l[0], l[1], l[2], l[3], l[4], { color: l[5] });
    w.map.queueWalls(r);
    for (const p of w.props) { const [name, cx, cy, z] = p; r.prop(name, cx * TS, cy * TS, name === 'window' ? (z || 20) : 0, { size: name === 'window' ? 1.6 : 1.1, light: name === 'candelabra' }); }
    for (const n of w.npcs || []) {
      if (!n.show()) continue;
      r.shadow(n.x, n.y, 5);
      r.actor(n.x, n.y, 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { pick: n.id });
    }
    r.shadow(hero.x, hero.y, 5);
    r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => heroRig.draw(g, ox, oy, r.view), { xray: true });
    if (M.drawGhosts) M.drawGhosts(r);
    game.particles && 0;
    const tgt = hover || M.near;
    if (tgt && M.mode === 'world' && !talk.open) {
      r.textAt(tgt.x, tgt.y, 52, tgt.label, '#ffe9a8');
      r.marker && r.marker(tgt.x, tgt.y, 60, { offscreen: false, color: '#ffd040' });
    }
    if (M.mode === 'world' && !talk.open) {
      const ob = M.objective(); const tg = M.targetById(ob.id);
      if (tg && ob.world === S.world && !S.demo) r.marker(tg.x, tg.y, 66, { label: ob.id === 'elevator' ? 'ELEVATOR' : tg.label, color: '#ff8a5c' });
      else if (!S.demo && ob.world !== S.world) { const ex = (W().things || []).find(t => t.id === 'exit' || t.id === 'elevator'); if (ex) r.marker(ex.x, ex.y, 60, { label: 'EXIT', color: '#ff8a5c' }); }
    }
    // haze: a warm drift over everything
    if (S.haze > 35) r.overlay(g => { const a = clamp((S.haze - 35) / 140, 0, .45); px.blend(g, a, 'screen', () => px.rect(g, 0, 0, r.W, r.H, '#c88a50')); });
    if (S.composure < 28) r.overlay(g => { const a = clamp((28 - S.composure) / 70, 0, .35) + Math.sin(game.real * 6) * .03; px.blend(g, a, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#703030')); });
    hud(r);
    if (M.mode !== 'world' && M.modes && M.modes[M.mode]) M.modes[M.mode].draw(r);
    if (M.mode === 'journal') drawJournal(r);
    talk.draw(r);
  }
};
M.playScene = play;

/* ---------- HUD ---------- */
function bar(g, x, y, w, v, col, label) {
  E.font.text(g, label, x, y, '#d8d0e8', { outline: false, shadow: '#05040a' });
  E.ui.bar(g, x + 54, y + 1, w - 54, 6, clamp(v / 100, 0, 1), col);
}
function hud(r) {
  const S = M.S;
  if (M.mode === 'pitch' || M.mode === 'sprint' || M.mode === 'ending') return;
  const corner = game.cornerArea && game.cornerArea();
  r.overlay(g => {
    E.ui.box(g, 5, 5, 170, 62, { bg: ['#1d1528', '#120c1c'], border: '#d8c8a0', alpha: .86 });
    const wd = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][4];
    E.font.text(g, 'THU OCT 17 1963   ' + fmtClock(S.clock), 12, 10, '#ffd36a', { outline: false, shadow: '#05040a' });
    bar(g, 12, 22, 158, S.composure, S.composure < 30 ? '#e8503a' : '#58b0f0', 'COMPOSURE');
    bar(g, 12, 33, 158, S.haze, '#e8a838', 'HAZE');
    E.font.text(g, 'REP ' + S.rep, 12, 46, '#c8f0c0', { outline: false, shadow: '#05040a' });
    E.font.text(g, 'CIG ' + S.cigs, 62, 46, '#e8e0d0', { outline: false, shadow: '#05040a' });
    E.font.text(g, 'HEAT ' + '★'.repeat(Math.min(S.heat, 6)) + '•'.repeat(Math.max(0, 5 - S.heat)), 108, 46, S.heat > 4 ? '#ff7a6a' : '#e8c070', { outline: false, shadow: '#05040a' });
    E.font.text(g, M.W().name.toUpperCase(), 12, 57, '#8f86a8', { outline: false, shadow: '#05040a' });
    const ob = M.objective(), lines = E.font.wrap(ob.text, 160);
    E.ui.box(g, 5, 71, 170, 17 + lines.length * 9, { bg: ['#2a1a1a', '#1a1010'], border: '#d8946a', alpha: .86 });
    E.font.text(g, 'TODAY', 12, 75, '#ff9a6a', { outline: false, shadow: '#05040a' });
    lines.forEach((l, i) => E.font.text(g, l, 12, 84 + i * 9 - 0, '#fdf6e6', { outline: false, shadow: '#05040a' }));
    // toasts
    M.toasts.forEach((t, i) => { const a = Math.min(1, t.life * 2); px.blend(g, a, 'normal', () => E.font.text(g, t.text, r.W - 8, 40 + i * 10 - (corner ? 0 : 20), t.color, { align: 'right', outline: false, shadow: '#05040a' })); });
    // prompts
    if (!talk.open && M.mode === 'world' && !S.demo) {
      const L = M.label, tgt = hover || M.near, parts = [];
      if (tgt) parts.push(L('confirm') + (game.input.lastDevice === 'mouse' && hover ? ' CLICK' : '') + '  ' + (tgt.kind === 'npc' ? 'TALK' : 'USE') + ' ' + tgt.label);
      parts.push(L('skill') + ' SMOKE', L('jump') + ' NOTEBOOK', L('attack') + ' VIEW');
      const txt = parts.join('    '), tw = E.font.width(txt) + 16;
      E.ui.box(g, Math.round(r.W / 2 - tw / 2), r.H - 17, tw, 13, { bg: ['#1d1528', '#120c1c'], border: '#8f86a8', alpha: .8 });
      E.font.text(g, txt, Math.round(r.W / 2 - tw / 2 + 8), r.H - 14, '#fdf6e6', { outline: false, shadow: '#05040a' });
      if (tut > 0 && game.settings.hints !== false) {
        const t = ['MOVE: ' + (game.input.lastDevice === 'gamepad' ? 'LEFT STICK' : 'WASD / ARROWS') + '   TALK: ' + L('confirm') + '   SMOKE: ' + L('skill') + '   NOTEBOOK: ' + L('jump'), 'KEEP COMPOSURE UP AND HAZE DOWN. YOU WILL NEED BOTH AT 3 PM.'];
        t.forEach((s, i) => E.font.text(g, s, Math.round(r.W / 2), r.H - 58 + i * 10, '#ffd36a', { align: 'center', outline: false, shadow: '#05040a' }));
      }
    }
  });
}

/* ---------- the notebook ---------- */
function drawJournal(r) {
  const S = M.S;
  r.overlay(g => {
    px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0610'));
    const x0 = Math.round(r.W / 2 - 205), w = 410;
    E.ui.box(g, x0, 12, w, r.H - 24, { bg: ['#2a2018', '#1a140e'], border: '#d8c8a0' });
    E.font.title(g, 'NOTEBOOK', r.W / 2, 18, { scale: 2, align: 'center', colors: ['#fff6c8', '#e0a85a'] });
    const ob = M.objective();
    E.font.text(g, 'TODAY: ' + ob.text, x0 + 12, 42, '#ffd36a', { outline: false, shadow: '#05040a' });
    E.font.text(g, 'CLIENT NOTES', x0 + 12, 58, '#ff9a6a', { outline: false, shadow: '#05040a' });
    let y = 69;
    for (const cid of ['hollis', 'teague']) {
      const c = M.CLIENTS[cid];
      E.font.text(g, c.name + ', ' + c.firm, x0 + 12, y, '#fdf6e6', { outline: false, shadow: '#05040a' }); y += 10;
      const fmt = (list, kind) => list.map(t => (S.known[cid + ':' + t + ':' + kind]) ? M.TAGS[t].n.toUpperCase() : '???').join(', ');
      E.font.text(g, '  LIKES: ' + fmt(c.love, 'love'), x0 + 12, y, '#9ee89a', { outline: false, shadow: '#05040a' });
      E.font.text(g, 'DISLIKES: ' + fmt(c.hate, 'hate'), x0 + 200, y, '#ff9a8a', { outline: false, shadow: '#05040a' }); y += 13;
    }
    E.font.text(g, 'SLIDES IN YOUR CASE (' + S.slides.length + ')', x0 + 12, y, '#ff9a6a', { outline: false, shadow: '#05040a' }); y += 11;
    S.slides.forEach((id, i) => {
      const s = M.SLIDES[id], t = M.TAGS[s.tag], col = i % 2, row = Math.floor(i / 2);
      const sx = x0 + 12 + col * 198, sy = y + row * 11;
      px.rect(g, sx, sy + 1, 6, 6, t.c);
      E.font.text(g, s.t + '  ' + '★'.repeat(id === 'headline' ? S.headlinePower : s.p), sx + 10, sy, '#fdf6e6', { outline: false, shadow: '#05040a' });
      E.font.text(g, t.n, sx + 148, sy, t.c, { outline: false, shadow: '#05040a' });
    });
    const yy = r.H - 60;
    E.font.text(g, 'HOW IT WORKS', x0 + 12, yy, '#ff9a6a', { outline: false, shadow: '#05040a' });
    ['Talk to everyone. People tell you what clients love and hate.', 'In a pitch, play the slide that suits the client. A hated tag costs you.', 'Cigarettes steady your nerves. Drinks do more, and cost your clarity.'].forEach((s, i) => E.font.text(g, s, x0 + 12, yy + 10 + i * 9, '#d8d0e8', { outline: false, shadow: '#05040a' }));
    E.font.text(g, M.label('jump') + ' / ' + M.label('cancel') + '  CLOSE', r.W / 2, r.H - 20, '#8f86a8', { align: 'center', outline: false, shadow: '#05040a' });
  });
}

M.talkRef = () => talk;
M.hoverRef = () => hover;
M.tutorial = v => { tut = v; };
})();
