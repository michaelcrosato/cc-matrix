/* ---- PLAY: solo and local co-op (1-4 on one screen). Floor cards, the descent, rising again, continue, game over ---- */
const HB = id => W && W.heroes.find(h => h.id === id);
const RUN_DEMO = () => !!(W && W.role === 'attract');

function realmCardFor(index, prevIndex) {
  const F = get('floors', FLOOR_ORDER[index]), P2 = prevIndex >= 0 ? get('floors', FLOOR_ORDER[prevIndex]) : null;
  if (F.treasure) return null;
  return !P2 || P2.realm !== F.realm || P2.treasure ? F.realm : null;
}
scenes.play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, touch: [], camera: CAM, propSize: 1.3,
  enter(d = {}) {
    game.input.touchEnabled = false;
    const index = d.floor || 0, prev = d.prev === undefined ? index - 1 : d.prev;
    for (const h of PARTY) { if (!h.alive) { h.alive = true; h.hp = Math.max(h.hp, startHealth() * .5); } h.sinkT = 0; }
    buildWorld(index, { role: d.role || 'local', seed: RUN ? RUN.seed : 1 });
    W.leash = null; camBounds();
    this.state = d.card === false ? 'play' : 'card'; this.cardT = 0; this.realm = realmCardFor(index, prev); this.cardStage = this.realm ? 'realm' : 'floor';
    if (this.realm && index === 0 && W.descent > 1) this.cardStage = 'realm';
    this.cont = 0; this.sinkT = 0; floorBanner = 0;
    if (game.settings.camView && game.view.id !== game.settings.camView) game.setView(game.settings.camView);
    game.setView && game.view.id;
    L.enabled = true; game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null;
    music(W.treasure ? 'hoard' : REALM_SONG[W.realm] || 'larder', { sync: true });
    if (!RUN_DEMO()) game.allowJoin({ max: 4, onJoin: q => joinMidPlay(q) });
    this.frameCam();
    lighting();
    if (this.state === 'play') this.begin();
  },
  exit() { game.cam.frame && game.cam.frame(null); },
  begin() {
    this.state = 'play'; floorBanner = 3;
    if (W.index === 0 && W.descent === 1) { say('start', null, 2); for (const h of W.heroes) say('welcome_' + h.cls, h, 2); }
    if (W.F.no === 6 && game.settings.allyStun && W.heroes.length > 1) say('ally_stun_on', null, 2);
    if (W.treasure) say('hoard', null, 2);
    if (W.F.boss) say('king_near', null, 2);
  },
  frameCam() {
    const live = W.heroes.filter(h => h.alive && !h.remote);
    if (live.length === 1) { game.cam.frame(null); game.follow(live[0], { z: 12, lead: 12 }); }
    else if (live.length > 1) { game.follow(null); game.cam.frame(live, { margin: 64, zoom: [.55, .75] }); }
  },
  update(dt) {
    stepNarrator(dt);
    const P2 = game._players || [game.input];
    if (P2.some(I => I.pressed('view')) && !SESSION) { game.nextView(); game.settings.set('camView', game.view.id); game.note('VIEW: ' + game.view.label.toUpperCase()); }
    if (this.state === 'card') {
      this.cardT += dt;
      if ((this.cardT > .6 && P2.some(I => I.pressed('fire') || I.pressed('confirm') || I.pressed('start'))) || game.input.clicked() || this.cardT > 5) {
        P2.forEach(I => I.consumeAll());
        if (this.cardStage === 'realm') { this.cardStage = 'floor'; this.cardT = 0; speak(line(W.F.intro || 'start'), 'gaunt'); } else this.begin();
      }
      return;
    }
    // intents: each hero from its player's input (or the bot)
    for (const h of W.heroes) {
      if (h.bot) botIntent(h, dt);
      else if (h.input) { if (!h.alive) { idleIntent(h); if (h.input.pressed('fire') || h.input.pressed('confirm')) rise(h); } else inputIntent(h, h.input); }
      if (h.joinT > 0 && h.input) joinChoose(h);
    }
    this.leash();
    if (this.state === 'continue') return this.continueStep(dt);
    if (this.state === 'sink') { this.sinkT += dt; for (const h of W.heroes) if (h.alive) h.sinkT = this.sinkT; if (this.sinkT > .6) this.next(); return; }
    stepWorld(dt);
    floorBanner = Math.max(0, floorBanner - dt);
    if (W.heroes.length && !W.heroes.some(h => h.alive)) { this.state = 'continue'; this.cont = 10; say('continue', null, 3); sfx('die'); return; }
    if (W.done) { this.state = 'sink'; this.sinkT = 0; return; }
    this.frameCam();
    musicLayers();
  },
  leash() {
    const live = W.heroes.filter(h => h.alive && !h.remote);
    if (live.length < 2) { W.leash = null; return; }
    const R = screenRect(live[0]); W.leash = [Math.max(80, (R.x1 - R.x0) - 64), Math.max(60, (R.y1 - R.y0) - 64)];
  },
  continueStep(dt) {
    this.cont -= dt;
    const P2 = game._players || [game.input];
    if (P2.some(I => I.pressed('fire') || I.pressed('start') || I.pressed('confirm'))) {
      P2.forEach(I => I.consumeAll());
      W.heroes.forEach((h, i) => { const s = W.p.starts[i % W.p.starts.length]; h.alive = false; rise(h); h.x = mid(s.cx); h.y = mid(s.cy); });
      this.state = 'play'; return;
    }
    if (this.cont <= 0) { game.go('over', {}, { fade: 'dissolve', seconds: .6 }); }
  },
  next() {
    const d = W.done, at = d.by && d.by.alive ? d.by : W.heroes.find(h => h.alive);
    for (const h of W.heroes) { h.deepest = Math.max(h.deepest, (W.F.no || 0) + 1); h.stair = 0; }
    if (d.to === 'ending' || d.to >= FLOOR_ORDER.length) { game.go('ending', {}, { fade: 'white', seconds: .8 }); return; }
    game.go('play', { floor: d.to, card: true, prev: W.index }, { fade: 'iris', at: at || undefined, seconds: .45 });
  },
  draw(r) {
    drawWorld(r);
    if (this.state === 'card') { drawCard(r, this); return; }
    drawHud(r);
    r.overlay(g => {
      if (KING_LINE.end > game.real && W.boss) { const w = Math.min(r.W - 40, 300); E.ui.box(g, (r.W - w) / 2, 46, w, 20, { bg: ['#3a1040', '#1a0820'], border: '#e8c040', alpha: .9 }); tx(g, 'KING FAMISH: ' + KING_LINE.text, r.W / 2, 52, '#ffe8b0', { align: 'center' }); }
      if (this.state === 'continue') { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#300808')); tx(g, 'CONTINUE?', r.W / 2, r.H / 2 - 40, INK, { align: 'center', scale: 3 }); tx(g, String(Math.max(0, Math.ceil(this.cont))), r.W / 2, r.H / 2 - 10, GOLD, { align: 'center', scale: 4 }); tx(g, 'RISE, OR BE SUPPER.  ' + key(game.input, 'fire'), r.W / 2, r.H / 2 + 28, '#ffb0a0', { align: 'center' }); }
      for (const h of W.heroes) if (h.joinT > 0 && h.input) { const free = freeClasses(h); tx(g, h.name + ': ' + h.D.name + (free.length ? '  ◂ ▸ CHANGE  ' + key(h.input, 'fire') + ' KEEP' : ''), r.W / 2, r.H - 40 - W.heroes.indexOf(h) * 10, h.color, { align: 'center' }); }
    });
  }
};
/** a floor card: the realm's vignette first when the realm changes, then the floor's number, name and line */
function drawCard(r, sc) {
  r.overlay(g => {
    const t = sc.cardT;
    if (sc.cardStage === 'realm') {
      drawShaft(g, r, game.real * 1.6, { gauntlet: false, speed: 240 });
      CLASSES.forEach((c, i) => { if (!W.heroes.some(h => h.cls === c)) return; drawRigAt(g, frontRig(c), r.W / 2 + (i - 1.5) * 26 + Math.sin(game.real * 3 + i) * 4, r.H / 2 + 30 + Math.sin(game.real * 5 + i) * 6, 1 / 60, { pose: 'cheer', facing: Math.PI / 2 + Math.sin(game.real * 2 + i) }); });
      const R = REALMS[W.realm];
      E.font.title(g, 'REALM ' + R.numeral, r.W / 2, 30, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
      E.font.title(g, R.name, r.W / 2, 54, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 });
      const lines = E.font.wrap(STORY[R.story], Math.min(r.W - 40, 360)); lines.forEach((l, i) => tx(g, l, r.W / 2, r.H - 56 + i * 11, '#ffe8b0', { align: 'center' }));
      if (t > .6) tx(g, key(game.input, 'fire'), r.W / 2, r.H - 14, '#a89a88', { align: 'center' });
      return;
    }
    px.blend(g, .72, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#140808'));
    const F = W.F, label = F.treasure ? 'TREASURE ROOM' : F.boss ? 'THE BANQUET' : 'FLOOR ' + F.no;
    if (W.descent > 1) tx(g, 'DESCENT II', r.W / 2, 22, '#ff8a6a', { align: 'center' });
    E.font.title(g, label, r.W / 2, 36, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 });
    tx(g, F.name, r.W / 2, 68, '#ffe8b0', { align: 'center', scale: 2 });
    tx(g, line(F.intro || 'start'), r.W / 2, 90, '#e8c890', { align: 'center' });
    if (W.index > 0) W.heroes.forEach((h, i) => {
      const y = 112 + i * 20, x = r.W / 2 - 120;
      tx(g, h.D.name, x, y, h.color); tx(g, 'SCORE ' + h.score, x + 96, y, INK); tx(g, 'KILLS ' + h.stats.kills, x + 176, y, '#c8b8a0');
    });
    if (t > .6) tx(g, 'GO DOWN  ' + key(game.input, 'fire'), r.W / 2, r.H - 16, Math.floor(game.real * 2) % 2 ? '#ffffff' : '#ffe8b0', { align: 'center' });
  });
}
/** the camera stays inside the floor (a little of the dark round it shows) */
function camBounds() { game.cam.bounds = v => { if (!W) return null; const b = W.map.bounds(v); return { x0: b.x0 - 8, y0: b.y0 - 40, x1: b.x1 + 8, y1: b.y1 + 8 }; }; }
/** the music follows the fight: drums when a horde closes in, a heartbeat when a hero is starving */
function musicLayers() {
  if (!A.song || !W) return;
  const local2 = W.heroes.filter(h => h.alive && !h.remote);
  const horde = local2.some(h => W.monsters.filter(m => !m.dead && near(m, h, 8 * T)).length >= 12);
  const heart = local2.some(h => h.hp < 200);
  if (horde !== musicLayers.horde) { musicLayers.horde = horde; A.layer('horde', horde ? 1 : 0, .8); }
  if (heart !== musicLayers.heart) { musicLayers.heart = heart; A.layer('heart', heart ? 1 : 0, .5); }
}
/** WebGPU lighting where it exists (Settings, Enhanced lighting); the canvas lighting stands in elsewhere */
let GPU = null;
function lighting() {
  if (HEADLESS || !W) return;
  const want = game.settings.gpuLight === 'on' || (game.settings.gpuLight === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches);
  try { if (want && !GPU && typeof navigator !== 'undefined' && navigator.gpu) GPU = game.enableGPU({ map: W.map }); if (GPU) Object.assign(GPU, { map: W.map, enabled: want }); } catch (e) { GPU = null; }
}

/* ---- joining mid-floor: a free class, beside the party, full health; left and right change it for a few seconds ---- */
function freeClasses(h) { return CLASSES.filter(c => !W.heroes.some(q => q !== h && q.cls === c)); }
function joinMidPlay(q) {
  if (!W || !RUN || W.heroes.length >= 4) return;
  const seat = [0, 1, 2, 3].find(s => !W.heroes.some(h => h.seat === s)), cls = freeClasses({})[0] || CLASSES[seat];
  const h = newHero(seat, cls, { input: q, name: 'P' + (seat + 1), color: SEAT_COLORS[seat] });
  const ally = W.heroes.find(x => x.alive) || { x: mid(W.p.starts[0].cx), y: mid(W.p.starts[0].cy) };
  h.x = ally.x + 12; h.y = ally.y; h.inv = 2; h.joinT = 5; h.deepest = W.F.no || 1;
  if (W.map.cell(cellOf(h.x), cellOf(h.y))) { h.x = ally.x; h.y = ally.y; }
  PARTY.push(h); W.heroes.push(h);
  say('joined', h, 2); bark(h, 'join');
}
function joinChoose(h) {
  const I = h.input, free = freeClasses(h);
  if (I.pressed('fire') || I.pressed('confirm')) { h.joinT = 0; I.consumeAll(); return; }
  const d = I.pressed('right') ? 1 : I.pressed('left') ? -1 : 0; if (!d || !free.length) return;
  const all = [h.cls, ...free].sort((a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b)), i = all.indexOf(h.cls), c = all[(i + d + all.length) % all.length];
  h.cls = c; h.D = get('heroes', c); h.combo = new E.Combo(h.D.melee.moves.map(m => new E.Attack(m, { hold: .1 })), { window: .35 }); h.joinT = 5; sfx('move');
}
function dropOut(n) {
  const q = game.players[n - 1]; if (!q || !W) return;
  const h = W.heroes.find(x => x.input === q); if (!h) return;
  W.heroes.splice(W.heroes.indexOf(h), 1); PARTY.splice(PARTY.indexOf(h), 1); RIGS.delete(h);
  game.removePlayer(q); sfx('leave'); game.resume();
}
/** the pause menu's own items (the engine adds Settings, Controls, Full screen and Quit to title) */
function pauseItems() {
  if (SESSION || RUN_DEMO()) return [];
  const items = [['How to Play', () => game.shell.show('help', helpSpec())]];
  if (W) { items.push(['Dev Tools', () => devTools()]); items.push(['Restart floor', () => { game.resume(); game.go('play', { floor: W.index, card: false }); }]); }
  const by = game.pausedBy || 1; if (by > 1 && W && W.heroes.some(h => h.input === game.players[by - 1])) items.push(['Drop out (P' + by + ')', () => dropOut(by)]);
  return items;
}
/** How to Play inside the pause menu (the canvas pages can't run while paused): the same eight cards */
function helpSpec() {
  const I = game.input;
  return { title: 'How to Play', keys: [[keysIn('{move}', I), 'Move'], [keysIn('{aim}', I), 'Aim'], [I.label('fire'), 'Fire (hold); strikes up close'], [I.label('magic'), 'Magic: a Blast Flask'], [I.label('plant'), 'Plant: stand and shoot'], [I.label('view'), 'Camera view'], [I.label('pause'), 'Pause']],
    sections: HOWTO.map(p => [p.title, keysIn(p.text, I)]) };
}

/* ---- GAME OVER: the Gaunt is fed; each qualifying player names themself with their own controller ---- */
scenes.over = {
  touch: [], camera: false,
  enter(d = {}) {
    this.t = 0; this.stage = 'over'; music('fed', { loop: false }); speak(LINES.game_over, 'gaunt'); game.allowJoin(false);
    const can = !cheating() && !(RUN && RUN.dev);
    this.queue = can ? PARTY.filter(h => CAB.qualifies(h.score, TABLE_MODE)).sort((a, b) => b.score - a.score) : [];
    this.won = !!d.won; this.hi = null; this.noRecord = !can && PARTY.some(h => h.score > 0);
  },
  update(dt) {
    this.t += dt; CAB.update(dt);
    if (this.stage === 'over' && this.t > 3.5) { this.stage = 'names'; this.nextName(); }
    if (this.stage === 'done' && this.t > .8) game.go('scores', { hi: this.hi }, { fade: 'dissolve' });
  },
  nextName() {
    const h = this.queue.shift();
    if (!h) { this.stage = 'done'; this.t = 0; return; }
    this.who = h; music('namethyself'); speak(LINES.high_score, 'gaunt');
    CAB.enter(h.score, TABLE_MODE, () => { const t = CAB.table(TABLE_MODE); this.hi = t.findIndex(e => e.score === h.score && e.cls === h.cls); this.nextName(); }, { input: h.input || game.input, extra: { cls: h.cls, floor: h.deepest, cont: h.continues } });
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#0a0406');
      drawShaft(g, r, this.t * .2, { gauntlet: false, speed: 8 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a0a0a'));
      if (this.stage === 'over') {
        E.font.title(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, { align: 'center', scale: 4, colors: ['#ffd0c0', '#ff6a4a', '#8a1a0a', '#3a0a04'], depth: 3 });
        tx(g, LINES.game_over, r.W / 2, r.H / 2 + 10, '#ffb0a0', { align: 'center', scale: 2 });
        if (this.noRecord) tx(g, 'DEV TOOLS WERE USED: NO HIGH SCORES THIS RUN', r.W / 2, r.H / 2 + 36, '#a89a88', { align: 'center' });
      }
    });
    CAB.draw(r);
    if (this.stage === 'names' && this.who) r.overlay(g => { tx(g, this.who.D.name + ' (' + this.who.name + ')', r.W / 2, 8, this.who.color, { align: 'center', scale: 2 }); tx(g, LINES.high_score, r.W / 2, 28, '#ffe8b0', { align: 'center' }); });
  }
};

/* ---- THE ENDING: the King falls; the heroes cheer round the raised gauntlet; the credits; Descent II ---- */
scenes.ending = {
  touch: [], camera: false,
  enter() { this.t = 0; music('gauntletdown'); speak(STORY.ending.slice(0, 80), 'gaunt'); game.allowJoin(false); if (RUN) RUN.ended = true; },
  update(dt) {
    this.t += dt; stepNarrator(dt);
    const P2 = game._players || [game.input];
    if (this.t > 2 && (P2.some(I => I.pressed('confirm') || I.pressed('fire') || I.pressed('start')) || game.input.clicked() || this.t > 16)) { P2.forEach(I => I.consumeAll()); game.go('credits', {}, { fade: 'dissolve' }); }
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#1a0e1e');
      for (let i = 0; i < 40; i++) { const x = (E.hash2(i, 1) * r.W + this.t * 6 * (i % 3)) % r.W, y = E.hash2(i, 2) * r.H * .6; px.dot(g, x, y, i % 4 ? '#5a4a6a' : '#ffe8b0'); }
      softGlow(g, r.W / 2, r.H / 2 - 40, 64 + Math.sin(this.t * 2) * 6, '#ffd060');
      drawSpinningGauntlet(g, r.W / 2, r.H / 2 - 46 + Math.sin(this.t * 2) * 3, 3, Math.sin(this.t) * .2);
      PARTY.forEach((h, i) => drawRigAt(g, frontRig(h.cls), r.W / 2 + (i - (PARTY.length - 1) / 2) * 40, r.H / 2 + 50, 1 / 60, { pose: 'cheer', facing: Math.PI / 2 }));
      const lines = E.font.wrap(STORY.ending, Math.min(r.W - 40, 380)), shown = Math.floor(this.t * 30);
      let n = 0; lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, shown - n)); n += l.length; tx(g, s, r.W / 2, 12 + i * 11, '#ffe8b0', { align: 'center' }); });
    });
  }
};
scenes.credits = {
  touch: [], camera: false,
  enter() { this.t = 0; this.menu = null; ui.idle = 0; },
  update(dt) {
    this.t += dt;
    const P2 = game._players || [game.input];
    if (!this.menu && (this.t > 26 || (this.t > 2 && (P2.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked())))) {
      P2.forEach(I => I.consumeAll());
      this.menu = new BigMenu([{ label: 'DESCENT II', fn: () => descentTwo() }, { label: 'NAME THYSELF', fn: () => game.go('over', { won: true }) }], { y: 150 });
      speak(STORY.descent2, 'gaunt');
    }
    if (this.menu) this.menu.update();
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t * .4, { gauntlet: false, speed: 18 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#1a1020'));
      const lines = ['GAUNTLETDOWN', '', 'THE HEROES', ...PARTY.map(h => h.D.who + ' THE ' + h.D.name + '  -  ' + h.score), '', ...ABOUT.credits, '', 'THE GAUNT IS NOT DEAD.', 'IT IS ONLY DIGESTING.', '', STORY.credits_tag];
      const y0 = this.menu ? 20 : r.H - this.t * 22;
      if (!this.menu) lines.forEach((l, i) => { for (const [k, q] of E.font.wrap(l, r.W - 40).entries()) tx(g, q, r.W / 2, y0 + i * 14 + k * 10, i === 0 ? GOLD : '#e8dcc8', { align: 'center', scale: i === 0 ? 2 : 1 }); });
      else { E.font.title(g, 'DESCENT II AWAITS', r.W / 2, 40, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 }); tx(g, STORY.descent2, r.W / 2, 90, '#ffb0a0', { align: 'center' }); this.menu.draw(g, r); }
    });
  }
};
/** Descent II: the same party, the dungeon again, harder (every rank +1, generators +1, drain x1.5) */
function descentTwo() {
  if (!PARTY.length) { game.go('title'); return; }
  RUN.descent = 2; RUN.ended = false;
  for (const h of PARTY) { h.alive = true; h.hp = Math.max(h.hp, startHealth()); h.amulet = null; }
  game.go('play', { floor: 0, card: true, prev: -1 }, { fade: 'iris' });
}
