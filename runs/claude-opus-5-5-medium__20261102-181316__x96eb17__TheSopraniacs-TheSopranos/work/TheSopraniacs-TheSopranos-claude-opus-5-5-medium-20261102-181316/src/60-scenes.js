/* ---- CHECKPOINTS AND SAVES ---- */
let cp = null;
function snapshot() { return JSON.parse(JSON.stringify(Object.assign({}, S, { area: A ? A.id : 'town', x: hero ? hero.x : S.x, y: hero ? hero.y : S.y, driving, car: car ? { x: car.x, y: car.y, angle: car.angle } : S.car, hp: hero ? hero.hp : S.hp }))); }
function checkpoint() { if (!attract && S && S.mode !== 'run') cp = snapshot(); }
function normalize(st) {
  if (st.step === 'yardfight') st.step = 'yard';
  if (st.step === 'collect' && st.flags.clubFight && !st.jobs.club) st.flags.clubFight = false;
  if (st.step === 'booth' || st.step === 'end') { st.step = 'booth'; st.flags.sat = false; st.flags.song = false; st.flags.bell = false; st.flags.cut = false; }
  st.hp = Math.max(st.hp, 60); return st;
}
function loadState(st, o = {}) {
  S = normalize(JSON.parse(JSON.stringify(st)));
  driving = false; foes = []; pickups = []; fightOn = null; panic = 0; finaleOn = -1; hero2 = null; heroes = [];
  makeCar(); makeTown(); placeVan(S.ch);
  if (o.heat !== undefined) S.heat = o.heat;
  const inCar = st.driving && S.area === 'town';
  game.go('play', { area: S.area, x: S.x, y: S.y, facing: Math.PI / 2, inCar });
}
game.saves.write = () => ({ data: snapshot(), place: A ? A.name : 'North Caldwell', level: 'Chapter ' + S.ch + ': ' + CHAPTERS[S.ch].title });
game.saves.read = save => loadState(save.data);

function newGame(ch = 1) {
  S = newState(); S.mode = 'story';
  driving = false; foes = []; pickups = []; fightOn = null; panic = 0; finaleOn = -1; hero2 = null; heroes = [];
  makeCar(); makeTown(); game.setView('threequarter');
  if (ch > 1) skipTo(ch);
  placeVan(S.ch); chapterCard = 3.2;
  game.go('play', { area: S.area, x: S.x, y: S.y, facing: Math.PI / 2, fresh: true });
}
// chapter select: the state as it would be at the start of each chapter
function skipTo(ch) {
  Object.assign(S, { outfit: 'tony', flags: { paper: true, breathe: ch >= 3 }, money: 200 + (ch - 1) * 900, respect: 10 + (ch - 1) * 3 });
  if (ch === 2) Object.assign(S, { ch: 2, step: 'therapy', area: 'office', x: 6 * T, y: 6 * T });
  if (ch === 3) Object.assign(S, { ch: 3, step: 'pork1', area: 'town', x: 18.5 * T, y: 32.5 * T, car: { x: 22 * T, y: 32.6 * T, angle: 0 }, ammo: 12 });
  if (ch === 4) Object.assign(S, { ch: 4, step: 'yard', area: 'town', x: 18.5 * T, y: 32.5 * T, car: { x: 22 * T, y: 32.6 * T, angle: 0 }, jobs: { pastry: true, vesuvio: true, club: true }, envelopes: 3, ammo: 24 });
  if (ch === 5) Object.assign(S, { ch: 5, step: 'diner', area: 'town', x: 63 * T, y: 32.5 * T, car: { x: 60 * T, y: 33 * T, angle: 0 }, jobs: { pastry: true, vesuvio: true, club: true }, ammo: 24 });
  car.x = S.car.x; car.y = S.car.y; car.angle = S.car.angle;
}
// the Collection Run: three minutes, envelopes all over town, New York guys after them too
const RUN_SPOTS = [[18.5, 32.4], [29.5, 32.4], [43.5, 32.4], [55.5, 32.4], [66.5, 32.4], [46.5, 13.2], [22, 13.3], [47.5, 43], [24, 38], [64, 6], [5, 24], [52, 20], [30, 20], [66, 44], [4, 40], [57, 8]];
function newRun(len = 180) {
  S = newState(); Object.assign(S, { mode: 'run', ch: 3, step: 'end', outfit: 'tony', money: 0, stress: 30, ammo: 12, area: 'town', x: 18.5 * T, y: 32.5 * T, car: { x: 22 * T, y: 32.6 * T, angle: 0 } });
  S.flags.breathe = true;
  driving = false; foes = []; pickups = []; fightOn = null; panic = 0; hero2 = null; heroes = [];
  makeCar(); makeTown(); placeVan('run'); finaleOn = -1; game.setView('threequarter'); runT = 0; runLen = len; runOver = false;
  game.go('play', { area: 'town', x: S.x, y: S.y, facing: Math.PI / 2, run: true });
}
let runOver = false, runSpawnT = 0;
function runTick(dt) {
  if (HUB && hubCountdown() > 0) return;
  runT += dt;
  if (pickups.filter(p => p.kind === 'envelope').length < 6) {
    const free = RUN_SPOTS.filter(([x, y]) => !pickups.some(p => Math.hypot(p.x - x * T, p.y - y * T) < 20) && Math.hypot(hero.x - x * T, hero.y - y * T) > 60);
    const s = E.pick(free); if (s) pickups.push({ kind: 'envelope', x: s[0] * T, y: s[1] * T, z: 0, v: 300 + Math.floor(Math.random() * 8) * 100, t: 0, area: 'town' });
  }
  if ((runSpawnT -= dt) <= 0 && foes.filter(f => !f.dead).length < 3 && !driving) {
    runSpawnT = 9; const a = Math.random() * TAU, x = clamp(hero.x + Math.cos(a) * 140, 30, (TW - 2) * T), y = clamp(hero.y + Math.sin(a) * 110, 30, (TH - 2) * T);
    if (map.walkable(Math.floor(x / T), Math.floor(y / T))) spawnFoe(Math.random() < .25 ? 'gunner' : Math.random() < .3 ? 'bruiser' : 'thug', x, y);
  }
  if (runT >= runLen && !runOver) endRun();
}
function endRun() {
  if (runOver) return; runOver = true;
  if (HUB) hubResult();
  game.go('results', { money: S.money, kos: S.kos });
}

/* ---- PLAY ---- */
const camTarget = { x: 0, y: 0 };
let wantExit = false;
const play = {
  pausable: true, camera: { zoom: [.75, 2], start: 1, tall: 1.4 },
  enter(data = {}) {
    attract = !!data.attract;
    A = AREAS[data.area || 'town']; map = A.map; S.area = A.id;
    hero = makeHero(data.x || S.x, data.y || S.y); hero.facing = data.facing === undefined ? Math.PI / 2 : data.facing; hero.hp = S.hp || 100; hero.lag = hero.hp;
    if (hero2) { Object.assign(hero2, { x: hero.x - 14, y: hero.y + 8, vx: 0, vy: 0, knocked: false, down: 0 }); heroes = [hero, hero2]; } else heroes = [hero];
    shots.clear(); puffs.length = 0; notes.length = 0; logOpen = false; hot = null;
    foes = foes.filter(f => f.area === A.id);
    if (data.inCar) { driving = true; car.x = S.car.x; car.y = S.car.y; car.angle = S.car.angle; } else if (A.id !== 'town') driving = false;
    game.cam.bounds = v => map.bounds(v);
    game.follow(null); camTarget.x = hero.x; camTarget.y = hero.y;
    if (driving) { hero.x = car.x; hero.y = car.y; }
    setTimeOfDay();
    if (!attract) music(S.mode === 'run' ? 'fight' : fightOn ? 'fight' : A.id === 'office' ? 'therapy' : A.id === 'club' ? 'club' : A.id === 'diner' && S.flags.song ? curSong : CHAPTERS[S.ch].song);
    refreshCast();
    if (!HUB && !attract) game.allowJoin({ max: 2, onJoin: (inp) => joinP2(inp) }); else game.allowJoin(false);
    if (data.then) data.then();
    if (attract) attractEnter(data.seg || 0);
  },
  exit() { game.weather = null; },
  update(dt) {
    if (attract && attractExit()) return;
    S.played += dt;
    tickPortraits(dt); voiceTick(talk, dt); voiceTick(phone, dt); phone.update(dt);
    for (const n of notes) n.t -= dt; E.prune(notes, n => n.t <= 0);
    chapterCard -= dt;
    if (HUB && hubEnded) return;
    if (logOpen) { if (input.pressed('log') || input.pressed('cancel')) logOpen = false; return; }
    const talking = talk.update(dt);
    // the world keeps breathing while people talk: rigs, ducks, traffic
    if (A.id === 'town') updateTown(dt);
    for (const n of npcs) { n.update(dt, map); if (!n.vx && !n.vy && E.dist(n, hero) < 50 && n.id !== 'ralphie' && finaleOn < 0) n.facing = E.angleTo(n, hero); driveRig(n, dt); }
    updatePuffs(dt);
    finaleTick(dt);
    if (talking) { driveRig(hero, dt); if (hero2) driveRig(hero2, dt); for (const f of foes) driveRig(f, dt); aimCamera(); return; }
    if (!attract && input.pressed('log')) { logOpen = true; return; }
    if (input.pressed('view')) { game.nextView(); note('Camera: ' + ({ threequarter: 'three-quarter', iso: 'isometric', topdown: 'top-down' })[game.view.id]); }
    if (panic > 0) { panic -= dt; game.timeScale = .7; if (panic <= 0) { game.timeScale = 1; hero.floor = 0; addStress(-10); note('Breathe. In through the nose.'); } }
    if (HUB && hubCountdown() > 0) { driveRig(hero, dt); aimCamera(); return; }
    const I = attract ? attractIntent(dt) : readIntent(input);
    if (driving) {
      const c = attract ? I : { gas: input.down('gas'), brake: input.down('brake'), steer: input.move()[0], sprint: input.down('sprint'), horn: input.pressed('horn') };
      if (!attract && I.interact) wantExit = true;
      if (wantExit) { c.gas = 0; c.brake = 0; car.speed *= 1 - 7 * dt; car.vx *= 1 - 7 * dt; car.vy *= 1 - 7 * dt; }
      if (!attract) driveCar(dt, c);
      if (wantExit && Math.abs(car.speed) < 18) { wantExit = false; exitCar(); }
      driveRig(hero, dt);
    } else controlHero(hero, I, dt);
    if (hero2 && !driving) {
      controlHero(hero2, readIntent(hero2.input), dt);
      if (E.dist(hero2, hero) > 220) { hero2.x = hero.x - 14; hero2.y = hero.y + 8; dust(hero2.x, hero2.y, 5); }
    }
    hero.lag = Math.max(hero.hp, hero.lag - dt * 25);
    // stress and heat over time
    if (breathing) { S.stress = Math.max(0, S.stress - 9 * dt); if ((game.time * .8 | 0) !== ((game.time - dt) * .8 | 0)) audio.sfx('breath'); if (S.step === 'breathe' && S.stress < 30 && !S.flags.breathed) { S.flags.breathed = true; breathePassed(); } }
    else if (hero.fighting) addStress(.7 * dt);
    S.heat = Math.max(0, S.heat - (van && van.alert > 0 ? 0 : 1.1) * dt);
    if (van && A.id === 'town' && van.alert <= 0 && fightOn && foes.some(f => !f.dead && vanSees(f))) van.alert = .5;
    updateFoes(dt);
    shots.update(dt, map);
    shots.hit(foes.filter(f => !f.dead), (b, t) => { const d = b.dmg || 15; t.hp -= d; t.flash = game.real + .06; t.stun = .25; game.hitFx(t.x, t.y, 20, { power: 1, damage: d, sound: 'punchHit', textScale: 2 }); if (t.hp <= 0 && !t.dead) { knock(t, hero, [0, 100, 140]); ko(t); } witnessed(hero, 3); }, 'player');
    shots.hit(heroes.filter(h => h.hp > 0 && !(driving && h === hero)), (b, t) => shotHero(t, b.dmg || 10), 'foe');
    if (driving) shots.hit([car], () => { car.speed *= .9; P.sparks(car.x, car.y, 12, 4); }, 'foe');
    updateFight(dt);
    // what's in reach: a hotspot's prompt, an automatic trigger
    hot = null;
    if (!driving && !attract && hero.hp > 0 && !hero.knocked) {
      let best = 1e9;
      for (const h of hotspots()) {
        const d = Math.hypot(h.x - hero.x, h.y - hero.y);
        if (d > h.r) continue;
        if (h.auto) { h.act(); continue; }
        if ((DOORS.some(q => q.at[0] === h.x) || (h.label && h.label.startsWith('Go outside'))) && fightOn) continue;
        if (d < best) { best = d; hot = h; }
      }
      // the mouse: hovering a thing in reach focuses it, a click uses it (instead of punching)
      if (input.lastDevice === 'mouse') {
        const mg = game.mouseGround();
        if (mg) for (const h of hotspots()) if (!h.auto && Math.hypot(h.x - mg[0], h.y - mg[1]) < 18 && Math.hypot(h.x - hero.x, h.y - hero.y) < Math.max(h.r, 64)) { hot = h; if (input.pressed('attack') && !fightOn) { input.consume('attack'); I.interact = true; } break; }
      }
      if (hot && I.interact && !fightOn) { I.consume('interact'); hot.act(); }
      else if (hot && I.interact && fightOn && !hot.npc) { I.consume('interact'); hot.act(); }
    }
    if (S.mode === 'run') runTick(dt);
    if (HUB) hubTick(dt);
    S.hp = hero.hp;
    aimCamera();
  },
  draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    const nt = night() || (A.id === 'club');
    drawDress(r, A, nt && A.outdoor);
    if (!A.outdoor) roomLights(r);
    if (A.id === 'town') drawTown(r, nt);
    for (const p of pickups) if (p.area === A.id) { const b = Math.sin(game.time * 4 + p.x) * 2; r.shadow(p.x, p.y, 4, .3); r.sprite(p.x, p.y, 6 + b, SPR[p.kind === 'envelope' ? 'envelope' : p.kind], { glow: .6 }); if (p.kind === 'envelope') L.add(p.x, p.y, 10, 30, .5, { color: '#ffe8a0' }); }
    if (S.step === 'paper' && A.id === 'town') { r.shadow(22 * T + 8, 13 * T + 4, 5, .3); r.sprite(22 * T + 8, 13 * T + 4, 1, SPR.paper, { glow: .4 + Math.sin(game.time * 4) * .3 }); }
    // the objective's marker
    const st = STEPS[S.step], tgt = !attract && S.mode !== 'run' && st && st.at && st.at();
    if (tgt && tgt[0] === A.id && !talk.open) r.marker(tgt[1], tgt[2], 34, { label: '' });
    for (const f of foes) drawFighter(r, f);
    for (const n of npcs) drawFighter(r, n);
    if (A.id === 'town') for (const p of peds) drawFighter(r, p);
    if (!driving) drawFighter(r, hero, { xray: true });
    if (hero2 && !driving) drawFighter(r, hero2, { xray: true });
    for (const f of foes) if (f.aiming && !f.dead) r.queue(f.x, f.y, 20, g => { const a = r.w(f.x, f.y, 20), b = r.w(f.x + Math.cos(f.facing) * 120, f.y + Math.sin(f.facing) * 120, 20); px.blend(g, .5, 'normal', () => px.line(g, a[0], a[1], b[0], b[1], '#ff2a2a')); }, { emissive: true });
    if (A.id === 'town' && HUB) drawGhosts(r);
    shots.draw(r);
    for (const p of puffs) r.queue(p.x, p.y, 2 + p.t * 10, g => { const q = r.w(p.x, p.y, 2 + p.t * 10); px.blend(g, .375 * (1 - p.t * 2), 'normal', () => px.disc(g, q[0], q[1], p.s * (1 + p.t * 2), '#d8d0c0')); });
    if (hot && hot.npc) r.textAt(hot.x, hot.y, 46 + Math.sin(game.time * 5) * 2, '↓', '#ffe080');
    if (panic > 0) r.overlay(g => { const k = clamp(panic / 4.5, 0, 1); px.blend(g, .5 * k + .2, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#5a2a6a')); E.font.text(g, 'PANIC ATTACK', r.W / 2, r.H / 2 - 30, '#ffffff', { align: 'center', scale: 2, shadow: '#000', outline: false }); });
    drawHud(r);
    talk.draw(r); phone.draw(r);
  }
};
function aimCamera() {
  let x = hero.x, y = hero.y, z = 18;
  if (driving) { x = car.x + car.vx * .35; y = car.y + car.vy * .35; z = 10; }
  else if (hero2) { x = (hero.x + hero2.x) / 2; y = (hero.y + hero2.y) / 2; }
  camTarget.x = lerp(camTarget.x, x, .12); camTarget.y = lerp(camTarget.y, y, .12);
  game.focus(camTarget.x, camTarget.y, z);
}
function updatePuffs(dt) { for (const p of puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 5; p.vy *= 1 - dt * 5; } E.prune(puffs, p => p.t > .5); }
function drawFighter(r, c, o = {}) {
  if (c.inCar) return;
  if (c.dead && c.dead < 1 && (game.real * 10 | 0) % 2) return;
  r.shadow(c.x, c.y, 7, .35, undefined, c.groundZ || 0);
  const rage = c === hero && S.stress > 75;
  r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { flash: c.flash > game.real ? '#ffffff' : rage && (game.time * 3 | 0) % 2 ? '#ff3a1a' : undefined, flashMix: rage ? .25 : .75, xray: o.xray });
  if (c === hero && breathing) r.queue(c.x, c.y, 40, g => { const q = r.w(c.x, c.y, 44), k = (Math.sin(game.time * 1.6) + 1) / 2; px.blend(g, .25, 'add', () => px.disc(g, q[0], q[1], 6 + k * 8, '#8ac8ff')); }, { emissive: true });
}
function roomLights(r) {
  const W = ROOMS[A.id] ? ROOMS[A.id].rows[0].length * T : 200;
  if (A.id === 'club') { L.add(4 * T, 3 * T, 40, 80, .9, { color: '#ff3a9a' }); L.add(12 * T, 4 * T, 40, 80, .9, { color: '#3a8aff' }); L.add(8 * T, 7 * T, 40, 70, .5, { color: '#ffb050' }); }
  else if (A.id === 'diner') { for (const x of [3, 7, 11]) L.add(x * T, 4 * T, 40, 80, .7, { color: night() ? '#ffd8a0' : '#fff0d0' }); }
  else { L.add(W / 3, 3 * T, 40, 90, .6, { color: '#ffe0b0' }); L.add(W * .7, 5 * T, 40, 90, .5, { color: '#ffe0b0' }); }
}
function drawTown(r, nt) {
  for (const c of traffic) drawCar(r, c, c.x, c.y, 0, c.ang, c.color, c.kind, { night: nt, braking: c.v < c.speed * .5 });
  if (van) { drawCar(r, van, van.x, van.y, 0, van.angle, '#d8d8d0', 'van', { night: nt, label: 'PLUMBING' }); r.decal(() => r.groundArc(van.x, van.y, 10, van.range, van.look - .55, van.look + .55, van.alert > 0 ? '#ff3a3a' : '#ffe080', van.alert > 0 ? .35 : .18)); }
  if (car) drawCar(r, car, car.x, car.y, car.z || 0, car.angle, '#141418', 'suv', { night: nt, braking: driving && input.down('brake') });
  for (const d of ducks) { r.shadow(d.x, d.y, 3, .2); r.actor(d.x, d.y, d.z, (g, ox, oy) => { d.blob.draw(g, ox, oy, r.view); px.rect(g, ox + (d.vx >= 0 ? 3 : -5), oy - 6, 2, 1, '#e88a20'); }); }
  if (nt && S.ch === 4) for (const [x, y] of [[20, 39], [30, 42], [17, 44], [27, 37]]) { r.prop('firedrum', x * T, y * T, 0, { light: true, size: 1.2 }); if (Math.random() < .3) P.fire(x * T, y * T, 18, 1, { size: 1.2 }); }
}

/* ---- TITLE ---- */
let idle = 0, titleMenu = null, titleSub = null, titleTouch = false;
const title = {
  enter() {
    attract = false; idle = 0; game.timeScale = 1; game.weather = null;
    if (!AREAS.town) buildAreas();
    A = AREAS.town; map = A.map; game.cam.bounds = v => map.bounds(v);
    if (!traffic.length) { S = newState(); makeCar(); makeTown(); }
    L.enabled = true; L.ambient = .45;
    music('title'); buildTitleMenu();
  },
  update(dt) {
    idle += dt;
    if (input.anyPressed() || input.clicked() || Math.hypot(...rawMove()) > .3) idle = 0;
    if (idle > 10 && !game.paused) { idle = 0; startAttract(); return; }
    updateTown(dt);
    game.focus(30 * T + Math.sin(game.real * .05) * 300, 24 * T + Math.cos(game.real * .04) * 120, 0);
    if (touchOnly() !== titleTouch) buildTitleMenu();
    if (titleSub) titleSub.update(dt); else titleMenu.update(dt);
  },
  draw(r) {
    map.drawFloor(r); map.queueWalls(r); drawDress(r, A, true); drawTown(r, true);
    r.overlay(g => {
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0406'));
      const m = Math.round(r.H * .26);
      E.font.title(g, 'THE', r.W / 2, m - 24, { scale: 1, align: 'center', colors: ['#ffffff', '#c8c8c8'] });
      E.font.title(g, 'SOPRANIACS', r.W / 2, m - 12, { scale: 4, align: 'center', colors: ['#ffffff', '#f0e0e0', '#e83a3a', '#8a1010'], outline: '#100404', depth: 3, depthColor: '#3a0808' });
      E.font.text(g, 'A NORTH JERSEY FAMILY BUSINESS', r.W / 2, m + 30, '#c8a060', { align: 'center', shadow: '#000', outline: false });
      if (touchOnly()) {
        const bw = Math.min(r.W - 8, Math.max(E.font.width('Controller or keyboard required'), E.font.width('Connect one to play. The demo plays by itself.')) + 20);
        E.ui.box(g, Math.round(r.W / 2 - bw / 2), m + 52, bw, 30, { bg: ['#3a1010', '#1a0606'], border: '#e86a5a' });
        E.font.text(g, 'Controller or keyboard required', r.W / 2, m + 58, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        E.font.text(g, 'Connect one to play. The demo plays by itself.', r.W / 2, m + 69, '#e8c0b0', { align: 'center', shadow: '#000', outline: false });
      }
      E.font.text(g, 'v' + VERSION + '  -  my-3D2dge ' + (E.version || ''), 6, r.H - 10, '#6a5a50', { outline: false });
      if (!touchOnly() && !titleSub) promptRow(g, r.W / 2, r.H - 18, [['confirm', 'Select'], ['cancel', 'Back']], { center: true });
    });
    (titleSub || titleMenu).draw(r);
  }
};
function buildTitleMenu() {
  const latest = !HUB && game.saves.latest && game.saves.latest();
  titleSub = null; titleTouch = touchOnly();
  const items = titleTouch ? ['SETTINGS', 'ABOUT & CREDITS'] : [{ label: 'CONTINUE', disabled: !latest }, 'NEW GAME', 'CHAPTER SELECT', 'COLLECTION RUN', 'SETTINGS', 'ABOUT & CREDITS'];
  titleMenu = new E.Menu(game, items, { y: Math.round(game.H * .26) + (titleTouch ? 90 : 50), onPick(i, it) {
    const l = typeof it === 'string' ? it : it.label;
    if (l === 'CONTINUE') { const s = game.saves.latest(); if (s) game.saves.load(s.slot); }
    else if (l === 'NEW GAME') newGame(1);
    else if (l === 'CHAPTER SELECT') titleSub = new E.Menu(game, CHAPTERS.slice(1).map((c, k) => (k + 1) + '. ' + c.title.toUpperCase()).concat(['BACK']), { y: Math.round(game.H * .26) + 50, title: 'CHAPTER SELECT',
      onPick(j) { if (j < 5) newGame(j + 1); else titleSub = null; }, onCancel() { titleSub = null; } });
    else if (l === 'COLLECTION RUN') newRun(180);
    else if (l === 'SETTINGS') game.menu('settings');
    else if (l === 'ABOUT & CREDITS') game.go('about');
  } });
  titleMenu.bg = '#1a0c0c'; titleMenu.border = '#c8a060'; titleMenu.pick = '#ffd36a';
}

/* ---- ATTRACT MODE: a scripted tour that cheats freely (no damage, the car on rails, teleports) ---- */
const ATTRACT = [
  { len: 13, area: 'town', x: 18.5 * T, y: 32.4 * T, view: 'threequarter', ch: 3, setup() { for (const [k, dx, dy] of [['thug', 60, 10], ['thug', -50, 20], ['bruiser', 30, 40]]) spawnFoe(k, hero.x + dx, hero.y + dy); music('fight'); note('Collect envelopes. Settle disputes.'); } },
  { len: 13, area: 'town', x: 30 * T, y: 15.5 * T, view: 'iso', ch: 3, car: true, setup() { music('town'); note('Drive the SUV around town.'); } },
  { len: 11, area: 'town', x: 26.5 * T, y: 10 * T, view: 'threequarter', ch: 1, setup() { music('town'); note('Feed the ducks. Lower your stress.'); } },
  { len: 15, area: 'town', x: 24 * T, y: 39 * T, view: 'topdown', ch: 4, setup() { for (const [k, dx, dy] of [['thug', 60, 0], ['gunner', -70, 30], ['boss', 40, 60]]) spawnFoe(k, hero.x + dx, hero.y + dy); music('fight'); note('Defend the yard from New York.'); } },
  { len: 12, area: 'office', x: 5 * T, y: 4.5 * T, view: 'threequarter', ch: 2, setup() { music('therapy'); convo([['DR. MELBA', 'And how does that make you feel, Tony?'], ['TONY', 'Like I want to feed some ducks.'], ['DR. MELBA', 'Breathe. In for four, out for four.']]); } },
  { len: 12, area: 'diner', x: 5.5 * T, y: 4 * T, view: 'threequarter', ch: 5, setup() { audio.music(SONGS.juke1); curSong = 'juke1'; convo([['CARLA', 'You ordered the onion rings?'], ['TONY', 'For the table.']]); } }
];
let aSeg = 0, aT = 0, aSaved = null;
function startAttract() { finaleOn = -1; aSaved = S; aSeg = 0; S = newState(); S.mode = 'attract'; Object.assign(S, { outfit: 'tony', flags: { breathe: true } }); makeCar(); makeTown(); foes = []; pickups = []; hero2 = null; goAttract(0); }
function goAttract(i) {
  const sg = ATTRACT[i % ATTRACT.length]; aSeg = i % ATTRACT.length; aT = 0;
  S.ch = sg.ch; S.step = sg.ch === 1 ? 'ducks' : 'end'; foes = []; fightOn = null; talk.open = false;
  placeVan(sg.ch === 3 ? 3 : null); driving = !!sg.car;
  if (sg.car) { const p = RING.at(0); car.x = p.x; car.y = p.y; }
  game.go('play', { attract: true, seg: aSeg, area: sg.area, x: sg.x, y: sg.y, inCar: false });
}
function attractEnter(i) {
  const sg = ATTRACT[i]; game.setView(sg.view); driving = !!sg.car; S.outfit = 'tony'; sg.setup();
  for (const d of ducks) d.fed = sg.ch === 1 ? 8 : 0;
}
function attractExit() {
  aT += 1 / 120;
  const any = input.anyPressed() || input.clicked() || Math.hypot(...rawMove()) > .4;
  if (any) { attract = false; S = aSaved || newState(); game.timeScale = 1; talk.open = false; foes = []; driving = false; game.setView('threequarter'); input.consumeAll(); game.go('title'); return true; }
  if (aT > ATTRACT[aSeg].len) { goAttract(aSeg + 1); return true; }
  return false;
}
// the AI's hands on the controls
let aiD = 0;
function attractIntent(dt) {
  const I = { move: [0, 0], attack: false, heavy: false, dodge: false, interact: false, fire: false, breathe: false, sprint: false, aim: null, consume() {} };
  hero.hp = hero.max; S.stress = 40 + Math.sin(game.time) * 20; S.heat = 20 + Math.sin(game.time * .5) * 15;
  const sg = ATTRACT[aSeg];
  if (sg.car) {   // on rails: the SUV follows the ring road
    aiD = (aiD + 150 * dt) % RING.length; const p = RING.at(aiD); car.x = p.x; car.y = p.y; car.angle = p.angle; car.speed = 150; car.vx = Math.cos(p.angle) * 150; car.vy = Math.sin(p.angle) * 150;
    hero.x = car.x; hero.y = car.y; if (Math.random() < dt * .3) audio.sfx('horn', { vol: .4 }); return I;
  }
  const f = foes.filter(q => !q.dead).sort((a, b) => E.dist(a, hero) - E.dist(b, hero))[0];
  if (f) {
    const d = E.dist(f, hero), a = E.angleTo(hero, f);
    if (d > 26) { const s = toScreenDir(Math.cos(a), Math.sin(a)); I.move = s; }
    else { hero.facing = a; I.attack = Math.random() < .5; I.heavy = Math.random() < .08; }
    if (d > 70 && Math.random() < dt * 1.2) { hero.facing = a; I.fire = true; S.ammo = 99; }
    if (Math.random() < dt * .4) I.dodge = true;
  } else if (sg.ch === 1) {
    const tx = 30 * T, ty = 9.7 * T, d = Math.hypot(tx - hero.x, ty - hero.y);
    if (d > 10) I.move = toScreenDir((tx - hero.x) / d, (ty - hero.y) / d); else { for (const dk of ducks) dk.fed = 6; if (Math.random() < dt) { audio.sfx('quack'); P.bits(hero.x, hero.y, 16, 4, ['#e8c890']); } I.breathe = true; S.flags.breathe = true; }
  } else if (sg.area !== 'town') {
    I.move = [Math.sin(game.time * .7) * .5, Math.cos(game.time * .5) * .3];
  }
  return I;
}
// a world direction as the stick direction that gives it in this view
function toScreenDir(wx, wy) {
  let best = [0, 0], bd = -2;
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, s = [Math.cos(a), Math.sin(a)], w = game.view.screenDirToGround(s[0], s[1]), l = Math.hypot(w[0], w[1]) || 1, dot = (w[0] * wx + w[1] * wy) / l; if (dot > bd) { bd = dot; best = s; } }
  return best;
}

/* ---- GAME OVER / BUSTED ---- */
let overMenu = null, overWhy = 'down';
const over = {
  enter(data = {}) {
    overWhy = data.why || 'down'; music(null); audio.sfx(overWhy === 'busted' ? 'ring' : 'die'); L.enabled = false; game.weather = null;
    if (S.mode === 'run') { endRun(); return; }
    overMenu = new E.Menu(game, ['TRY AGAIN FROM CHECKPOINT', 'QUIT TO TITLE'], { y: Math.round(game.H * .6), onPick(i) {
      if (i === 0) loadState(cp || snapshot(), { heat: overWhy === 'busted' ? 35 : undefined }); else game.go('title');
    } });
  },
  update(dt) { if (overMenu) overMenu.update(dt); },
  draw(r) {
    r.sky(overWhy === 'busted' ? ['#0a1030', '#1a2a6a'] : ['#200606', '#4a1010']);
    r.overlay(g => {
      const m = Math.round(r.H * .3);
      E.font.title(g, overWhy === 'busted' ? 'PINCHED' : "TONY'S DOWN", r.W / 2, m - 20, { scale: 3, align: 'center', colors: overWhy === 'busted' ? ['#ffffff', '#8ab0ff'] : ['#ffffff', '#ff6a5a'], depth: 2 });
      E.font.text(g, overWhy === 'busted' ? '"You have the right to remain silent. I suggest you use it." - Agent Harrow' : '"Whaddya gonna do." - Everybody, at the wake', r.W / 2, m + 20, '#e8e0d0', { align: 'center', wrap: r.W - 40, shadow: '#000', outline: false });
    });
    if (overMenu) overMenu.draw(r);
  }
};

/* ---- THE CUT TO BLACK, THEN THE CREDITS ---- */
let blackT = 0;
const black = {
  enter() { blackT = 0; audio.music(null); curSong = null; L.enabled = false; game.weather = null; },
  update(dt) { blackT += dt; if (blackT > 9) game.go('ending'); },
  draw(r) { r.sky(['#000000', '#000000']); }
};
let endT = 0;
const ending = {
  enter() { endT = 0; music('title'); if (game.saves && !HUB) { try { game.saves.autosave(); } catch (e) { /* blocked */ } } E.store.set('sopraniacs.finished', true); },
  update(dt) { endT += dt; if (endT > 3 && (input.pressed('confirm') || input.pressed('start') || input.pressed('cancel') || input.clicked())) game.go('about', { from: 'ending' }); },
  draw(r) {
    r.sky(['#000000', '#0a0406']);
    const y0 = Math.round(r.H - endT * 18);
    const lines = ['THE SOPRANIACS', '', 'Tony Sopraniaco', 'Carla Sopraniaco', 'T.J. & Medora', 'Paulie Pistachio', 'Chrissy Moltobene', 'Sil Dandi', 'Dr. Jennifer Melba', 'Ma', 'Ralphie (the New York guy)', 'Agent Harrow & his van', 'The Ducks (as themselves)', '',
      'Money: ' + fmt$(S.money), 'Respect: ' + S.respect, 'Panic attacks: ' + S.panics, 'Guys put down: ' + S.kos, 'Time played: ' + Math.round(S.played / 60) + ' min', '', 'Did he? Didn\'t he?', 'Don\'t stop now.', '', 'PRESS ANY BUTTON'];
    r.overlay(g => lines.forEach((l, i) => { const y = y0 + i * 14; if (y > -20 && y < r.H + 10) E.font.text(g, l, r.W / 2, Math.max(y, i === lines.length - 1 ? r.H / 2 : -99), i === 0 ? '#e83a3a' : '#e8e0d0', { align: 'center', scale: i === 0 ? 2 : 1, shadow: '#000', outline: false }); }));
  }
};

/* ---- RESULTS (the Collection Run) ---- */
let resData = {}, resT = 0;
const results = {
  enter(d) { resData = d || {}; resT = 0; music('victory'); E.store.set('sopraniacs.bestRun', Math.max(E.store.get('sopraniacs.bestRun', 0), resData.money || 0)); },
  update(dt) { resT += dt; if (!HUB && resT > 2 && (input.pressed('confirm') || input.pressed('cancel') || input.clicked())) game.go('title'); },
  draw(r) {
    r.sky(['#0a1a0a', '#1a3a1a']);
    r.overlay(g => {
      const m = Math.round(r.H * .3);
      E.font.title(g, "TIME'S UP", r.W / 2, m - 20, { scale: 3, align: 'center', colors: ['#ffffff', '#8af08a'] });
      E.font.text(g, 'You collected ' + fmt$(resData.money || 0), r.W / 2, m + 20, '#ffffff', { align: 'center', scale: 2, shadow: '#000', outline: false });
      E.font.text(g, 'New York guys put down: ' + (resData.kos || 0) + '    Best: ' + fmt$(E.store.get('sopraniacs.bestRun', 0)), r.W / 2, m + 44, '#c8e0c0', { align: 'center', shadow: '#000', outline: false });
      if (!HUB && resT > 2) promptRow(g, r.W / 2, r.H - 30, [['confirm', 'Back to title']], { center: true });
    });
  }
};
