/* 61-play: a descent (solo and local co-op): the floor order, floor and realm cards, play, joining and dropping out,
 * falling and rising, the continue, game over, initials, the ending, credits and Descent II. */

const floorIndexOfNo = no => FLOOR_ORDER.findIndex(id => get('floors', id).no === no);

function startDescent(classes, o = {}) {
  PARTY.length = 0;
  classes.forEach((c, i) => { const inp = o.inputs ? o.inputs[i] : game.players[i] || null; PARTY.push(makeHero(c.cls || c, i, { input: inp })); });
  RUN.loop = o.loop || 1; RUN.floorIdx = o.floorIdx || 0; RUN.cheated = false; RUN.deepest = 1; RUN.started = game.real; RUN.mode = o.attract ? 'attract' : 'local';
  reseed(o.seed || ((Date.now() ^ (Math.random() * 1e9)) >>> 0));
  NARR.reset(o.attract);
  if (!o.attract) for (const h of PARTY) say('welcome', h, 1);
  gotoFloor(RUN.floorIdx, { card: !o.noCard, attract: o.attract });
}
function gotoFloor(idx, o = {}) {
  RUN.floorIdx = idx;
  const id = FLOOR_ORDER[idx], fd = get('floors', id);
  if (fd.no) RUN.deepest = Math.max(RUN.deepest, fd.no);
  newWorld(id, { loop: RUN.loop, attract: o.attract, net: o.net || 'local' });
  if (CHEAT.botP1 && PARTY[0]) PARTY[0].bot = makeBot(PARTY[0]);
  const realmCard = o.card !== false && (idx === 0 || FLOOR_ORDER[idx - 1] && get('floors', FLOOR_ORDER[idx - 1]).realm !== fd.realm && fd.realm !== get('floors', FLOOR_ORDER[idx - 1]).realm);
  if (o.attract) { game.go('play', { attract: true }, { fade: 0 }); return; }
  if (o.card === false) { game.go('play', {}); return; }
  game.go('card', { realm: realmCard ? fd.realm : null, first: idx === 0 && RUN.loop === 1 });
}
function nextFloor() {
  const d = W.done;
  if (d.ending) { game.go('ending', {}, { fade: 'white', seconds: .6 }); return; }
  let idx = RUN.floorIdx + 1;
  if (d.to) { const k = floorIndexOfNo(d.to); if (k > RUN.floorIdx) idx = k; }
  if (idx >= FLOOR_ORDER.length) { game.go('ending', {}); return; }
  for (const h of PARTY) { h.amulet = null; h.stun = 0; }
  gotoFloor(idx, { card: true });
}

/* ---- the floor card ---- */
scenes.card = {
  enter(d) {
    SC.card = { t: 0, realm: d.realm, fd: W.fd, first: d.first };
    music(d.realm ? 'realm' : 'card', { sync: false });
    const key = W.fd.hoard ? 'hoard_' + W.fd.hoard : 'floor_' + W.no;
    NARR.speak(d.realm ? STORY.realm[d.realm][1] : LINES[key] || '');
  },
  update(dt) {
    const c = SC.card; c.t += dt;
    const any = game.players.some(p => p.pressed('fire') || p.pressed('confirm') || p.pressed('start')) || game.input.clicked();
    if ((c.t > .8 && any) || c.t > (c.realm ? 7 : 5)) game.go('play', {}, { fade: 'iris', seconds: .35 });
  },
  draw(r) { drawFloorCard(r, SC.card); }
};

/* ---- play ---- */
scenes.play = {
  pausable: true, world: true, view: 'threequarter', camera: { zoom: [.55, 1.2], start: .72, tall: .9 },
  enter(d) {
    const att = !!(d && d.attract);
    SC.play = { t: 0, attract: att, contT: 0, over: false };
    game.setView(att ? 'threequarter' : S.viewMode);
    setupLights();
    music(musicFor(W.fd), { sync: true, fade: .5 });
    if (!att) { game.allowJoin({ max: 4, onJoin: (inp, n) => joinMidPlay(inp, n) }); NARR.speak(W.no === 1 && RUN.loop === 1 && !W.hoard ? LINES.start : '', 'narrator'); }
    else game.allowJoin(false);
    if (W.hoard) say('hoard', null, 3);
    if (W.no === 6 && allyStunOn()) say('ally_stun_on', null, 2);
    if (W.no === 8) say('king_near', null, 2);
    game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null;
    camFrame(true);
  },
  exit() { game.allowJoin(false); game.weather = null; },
  update(dt) {
    const P = SC.play; P.t += dt;
    if (DEV.open) { devUpdate(dt); return; }
    if (P.attract) { attractStep(dt); }
    if (game.input.pressed('view')) cycleView();
    for (const h of PARTY) h.intent = h.bot ? botIntent(h.bot, dt) : h.input ? localIntent(h, h.input) : IDLE_INTENT;
    for (const h of PARTY) if (h.joinPick) joinPickStep(h);
    stepWorld(dt);
    camFrame(false);
    NARR.update(dt);
    musicLayers(dt);
    if (P.attract) return;
    if (W.done && W.doneT > (W.done.ending ? 1.2 : .7)) { nextFloor(); return; }
    if (!living().length && PARTY.length) {
      P.contT += dt;
      if (P.contT > 1.5 && !P.over) { P.over = true; game.go('over', {}); }
    } else P.contT = 0;
  },
  draw(r) { drawWorld(r); drawHUD(r); if (DEV.open) devDraw(r); }
};
/* ---- dynamic music: drums when a horde is near, a heartbeat when a local hero starves ---- */
function musicLayers(dt) {
  if (!W) return;
  const locals = living().filter(h => !h.remote);
  const near = W.mons.filter(m => locals.some(h => Math.abs(m.x - h.x) < 8 * T && Math.abs(m.y - h.y) < 8 * T)).length;
  const on = near >= 12;
  if (on !== SC.drums) { SC.drums = on; layer('drums', on, 1); }
  SC.beat = (SC.beat || 0) - dt;
  if (locals.some(h => h.hp < 200) && SC.beat <= 0) { SC.beat = .75; sfx('heart'); }
}
function cycleView() { const v = { threequarter: 'topdown', topdown: 'iso', iso: 'threequarter' }[game.view.id] || 'threequarter'; game.settings.set('viewMode', v); game.setView(v); game.note(game.view.label.toUpperCase() + ' VIEW'); }
function musicFor(fd) { return fd.hoard ? 'hoard' : fd.boss ? 'king' : fd.realm; }

/* ---- the camera: one hero is followed; several share the screen (with a leash) ---- */
function camFrame(snap) {
  const hs = living().filter(h => !h.remote), list = hs.length ? hs : PARTY.filter(h => !h.remote);
  if (!list.length) return;
  const lead = h => isFinite(h.aim) ? h.aim : h.face;
  if (list.length === 1) { game.cam.frame(null); game.focus(list[0].x + Math.cos(lead(list[0])) * 10, list[0].y + Math.sin(lead(list[0])) * 10, 12); }
  else { game.cam.frame(list, { margin: 56, zoom: [.5, .72] }); }
  const xs = list.map(h => h.x), ys = list.map(h => h.y);
  W.cam.x = (Math.min(...xs) + Math.max(...xs)) / 2; W.cam.y = (Math.min(...ys) + Math.max(...ys)) / 2;
  // the visible ground, from the screen's corners (it depends on view, zoom, turn and shape)
  const r = game.r;
  if (r && game.view.toGround) {
    const W0 = r.W, H0 = r.H, z = game.zoom || 1;
    const hw = W0 / 2 / (game.view.scale || 1) / z, hh = H0 / 2 / (game.view.scale || 1) / z / Math.max(.4, game.view.id === 'topdown' ? 1 : .82);
    W.viewHalf = [hw, hh]; W.leash = [Math.max(80, hw - 40), Math.max(50, hh - 34)];
  } else { W.viewHalf = [214, 120]; W.leash = [174, 86]; }
  void snap;
}

/* ---- joining in play: a free controller's Options or 2 on the keyboard; pick a free class on a small overlay ---- */
function joinMidPlay(inp, n) {
  if (PARTY.length >= 4) return;
  const free = HERO_ORDER.filter(c => !PARTY.some(h => h.cls === c));
  const h = makeHero(free[0], PARTY.length, { input: inp });
  h.joinPick = { i: 0, t: 0 };
  PARTY.push(h);
  const ally = living()[0] || W.p.starts[0];
  placeHero(h, ally, 0); h.x += 10; h.body.x = h.x;
  if (!W.map.walkable(Math.floor(h.x / T), Math.floor(h.y / T))) { h.x -= 10; h.body.x = h.x; }
  inp.glyphs = S.padGlyphs;
  happen('join', { pi: h.pi });
}
function joinPickStep(h) {
  const jp = h.joinPick, inp = h.input; jp.t += 1 / 120;
  h.intent = IDLE_INTENT; h.inv = 1;
  const free = HERO_ORDER.filter(c => c === h.cls || !PARTY.some(o => o !== h && o.cls === c));
  if (inp.pressed('left') || inp.pressed('right')) { const k = free.indexOf(h.cls), nk = (k + (inp.pressed('left') ? free.length - 1 : 1)) % free.length; const nh = makeHero(free[nk], h.pi, { input: inp }); Object.assign(h, { cls: nh.cls, D: nh.D, name: nh.name, color: nh.color }); happen('ui', { k: 'move' }); }
  if (jp.t > .4 && (inp.pressed('fire') || inp.pressed('confirm'))) { h.joinPick = null; h.joined = W.t; say('join', h, 2); happen('ui', { k: 'join' }); }
}
function dropOut(pi) {
  const h = PARTY[pi]; if (!h || pi === 0) return;
  game.removePlayer(h.input);
  PARTY.splice(pi, 1); PARTY.forEach((p, i) => { p.pi = i; });
  happen('leave', { pi });
}

/* ---- lights per realm ---- */
function setupLights() {
  const rm = REALMS[W.realm] || REALMS.larder;
  L.enabled = true; L.ambient = rm.ambient; L.dark = W.realm === 'furnace' ? [18, 6, 4] : W.realm === 'ossuary' ? [6, 8, 22] : [12, 6, 16]; L.refresh && L.refresh();
}
