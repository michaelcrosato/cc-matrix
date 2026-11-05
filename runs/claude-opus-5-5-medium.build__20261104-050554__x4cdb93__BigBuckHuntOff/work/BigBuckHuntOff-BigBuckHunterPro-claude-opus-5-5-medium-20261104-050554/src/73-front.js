// The front end: the title (a live vista, the logo, PRESS START by the last device's glyph, the touch-only gate), the
// main menu and its pages (big cards, focus by d-pad, stick or arrows, hover with the mouse), the Lodge (an engine
// side-view room: a log wall, props with lights, Uncle Dub, the trophy wall and the records), About & Credits.
(() => {
const B = BB, E = B.E, px = E.px, game = B.game;

// ---- idle tracking: 10 s without input on the title or a top-level menu page starts the attract mode ----
const idle = B.idle = { t: 0, lastMouse: null, lastAxes: '' };
B.activity = (I = game.input) => {
  let any = I.anyPressed() || !!(I.clicked && I.clicked());
  const p = I.pointer && I.pointer(); if (p && idle.lastMouse && Math.hypot(p[0] - idle.lastMouse[0], p[1] - idle.lastMouse[1]) > 3) any = true; if (p) idle.lastMouse = p;
  const m = I.move(); if (Math.hypot(m[0], m[1]) > .3) any = true;
  for (const a of ['fire', 'scope', 'pump', 'call', 'confirm', 'cancel', 'start']) if (I.down(a)) any = true;
  const held = I.held ? [...I.held].filter(c => !c.startsWith('Act:')).sort().join(',') : ''; if (held !== idle.lastHeld) { if (held) { any = true; if (/(^|,)(Key|Digit|Arrow|Pad|Mouse|Enter|Space|Escape|Shift)/.test(held)) B.touchOnly = false; B.touchCleared = true; } idle.lastHeld = held; }
  return any;
};
B.stepIdle = (dt, allow) => { if (B.activity()) { idle.t = 0; if (B.touchOnly && game.input.lastDevice !== 'touch' && game.input.lastDevice !== 'keyboard') { B.touchOnly = false; B.touchCleared = true; } } else idle.t += dt; if (allow && idle.t >= 10 && !B.HUB) { idle.t = 0; B.startAttract(); } };

// ---- a live vista for the title and menus: Hollow Creek at dawn, deer grazing, a slow pan ----
const backdrop = { world: null, lens: null, actors: [], t: 0 };
B.backdropVista = (dt) => {
  const bd = backdrop;
  if (!bd.world) {
    bd.world = B.loadWorld('hollow'); const v = bd.world.vantages.creekStand;
    bd.lens = new B.Lens({ x: v.x, y: v.y, z: v.z, yaw: v.yaw, pitch: 5, fov: 30 });
    const site = { world: bd.world, lens: bd.lens, v, outOfFan: () => false };
    for (const [b, d, sex, h] of [[-8, 42, 'buck', .4], [6, 50, 'doe', 2.4], [14, 58, 'fawn', 2.1], [-20, 70, 'buck', -.6]]) {
      const [x, y] = B.rel(v, b, d);
      const a = new B.Actor({ cat: 'animal', kind: sex, x, y, heading: v.yaw + h });
      a.rig = new B.Quadruped({ species: 'deer', sex: sex === 'buck' ? 'buck' : 'doe', size: (sex === 'fawn' ? .6 : 1) * 1.1, young: sex === 'fawn', antlers: sex === 'buck' ? { kind: 'whitetail', points: 10, seed: Math.round(d), spread: 0 } : null });
      a.phase = d; bd.actors.push(a);
    }
    bd.site = site;
  }
  bd.t += dt;
  bd.lens.yaw = bd.world.vantages.creekStand.yaw + Math.sin(bd.t * .05) * .18;
  for (const a of bd.actors) { const gz = Math.sin(bd.t * .4 + a.phase) > -.3; a.z = bd.world.groundAt(a.x, a.y); a.rig.update(dt, { x: a.x, y: a.y, z: a.z, heading: a.heading, speed: 0, graze: gz ? 1 : 0, alert: gz ? 0 : 1, look: gz ? 0 : .6, ground: (x, y) => bd.world.groundAt(x, y) }); }
  return bd;
};
B.drawBackdrop = (g, W, H) => { const bd = backdrop; if (!bd.world) B.backdropVista(0); B.drawWorld(g, W, H, { world: bd.world, lens: bd.lens, time: bd.t, actors: bd.actors }); };

const drawLogo = (g, W, y, s = 1) => {
  B.text(g, 'THE 41ST ANNUAL', W / 2, y, '#fff4d0', { align: 'center', scale: 1 });
  B.title(g, 'BIG BUCK', W / 2, y + 10, Math.max(2, Math.round(4 * s)), { colors: ['#fff8e0', '#e8b860', '#8a5a28'], outline: '#f07020', depth: 3, depthColor: '#4a2a10' });
  B.title(g, 'HUNT-OFF', W / 2, y + 10 + 34 * s, Math.max(2, Math.round(4 * s)), { colors: ['#fff8e0', '#e8b860', '#8a5a28'], outline: '#f07020', depth: 3, depthColor: '#4a2a10' });
};
B.drawLogo = drawLogo;

// ---- title ----
B.titleScene = {
  enter() { B.inPlay = false; B.checkTouchOnly(); idle.t = 0; B.music('hoedown'); game.input.touchEnabled = !B.touchOnly; B.attract = null; if (B.pendingAttract) { B.pendingAttract = false; game.after(.05, () => B.startAttract()); } },
  update(dt) {
    B.backdropVista(dt);
    if (B.touchOnly) { B.stepIdle(dt, true); const c = game.input.clicked && game.input.clicked(); if (c && B.touchRect && c[0] >= B.touchRect[0] && c[0] <= B.touchRect[0] + B.touchRect[2] && c[1] >= B.touchRect[1] && c[1] <= B.touchRect[1] + B.touchRect[3]) game.menu('settings'); return; }
    const I = game.input;
    if (I.pressed('start') || I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked())) { B.sfx('confirm'); game.go('menu'); return; }
    B.stepIdle(dt, true);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; B.drawBackdrop(g, W, H);
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H * .48, '#1a0c06'));
      drawLogo(g, W, Math.round(H * .1), Math.min(1.2, W / 480));
      if (B.touchOnly) {
        const w = 250, h = 58, x = W / 2 - w / 2, y = H * .62; B.panel(g, x, y, w, h);
        B.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, y + 10, '#ffd070', { align: 'center' });
        B.text(g, 'Connect a gamepad or a keyboard to play.', W / 2, y + 24, '#e8dcc8', { align: 'center' });
        B.touchRect = [W / 2 - 40, y + 36, 80, 16]; E.ui.box(g, W / 2 - 40, y + 36, 80, 16, { bg: ['#6a3a14', '#3a1e0a'], border: '#ffd070' }); B.text(g, 'SETTINGS', W / 2, y + 40, '#fff4d0', { align: 'center' });
      } else if (Math.floor(game.real * 2) % 2 === 0) {
        const G = B.glyphFor('start', game.input), w = B.glyphW('start', game.input, 2), tw = E.font.width('PRESS ', { scale: 2 });
        const x = Math.round(W / 2 - (tw + w) / 2), y = Math.round(H * .66);
        B.text(g, 'PRESS', x, y + 3, '#ffffff', { scale: 2 }); B.drawGlyph(g, 'start', game.input, x + tw, y, 2);
      }
      B.text(g, '© DUB\'S LODGE · ' + B.VERSION + ' · MY-3D2DGE ' + (E.version || ''), W / 2, H - 10, '#c8b898', { align: 'center' });
    });
  }
};

// ---- the menu: one scene, a page stack ----
const pages = [];
const push = p => { pages.push(p); p.list.t = 0; };
const pop = () => { if (pages.length > 1) pages.pop(); else game.go('title'); };
const diffRow = () => ({ label: 'DIFFICULTY', value: () => ({ easy: 'EASY', normal: 'NORMAL', pro: 'PRO' })[B.setting('difficulty')], slider: d => { const o = ['easy', 'normal', 'pro'], i = o.indexOf(B.setting('difficulty')); game.settings.set('difficulty', o[B.clamp(i + d, 0, 2)]); }, onConfirm: () => { const o = ['easy', 'normal', 'pro'], i = o.indexOf(B.setting('difficulty')); game.settings.set('difficulty', o[(i + 1) % 3]); } });
const huntItem = (h, mode) => { const H = B.get('hunt', h); return { label: H.name.toUpperCase(), value: () => (B.records.best['hunt-' + h] ? 'BEST ' + B.fmt(B.records.best['hunt-' + h]) : H.when.toUpperCase()), act: () => B.begin({ mode, hunts: [h] }), hunt: h }; };
const mainPage = () => ({ title: 'MAIN MENU', top: true, list: new B.List([
  { label: () => (B.records.campaign ? 'CONTINUE HUNT-OFF' : 'HUNT-OFF'), value: () => (B.records.campaign ? 'HUNT ' + (B.records.campaign.hi + 1) + ' OF 3' : '3 HUNTS'), act: () => B.records.campaign ? B.begin({ mode: 'hunt-off', hunts: B.HUNT_IDS.slice(), hi: B.records.campaign.hi, totals: B.records.campaign.totals, seed: B.records.campaign.seed, total: B.records.campaign.total, bragged: B.records.campaign.bragged }) : B.begin({ mode: 'hunt-off', hunts: B.HUNT_IDS.slice() }), help: 'The 41st Annual Big Buck Hunt-Off: three hunts against the lodge regulars.' },
  { label: 'SINGLE HUNT', act: () => push(listPage('SINGLE HUNT', B.HUNT_IDS.map(h => huntItem(h, 'single')).concat([diffRow()]))), help: 'One hunt: three sites, a trophy and a bonus game.' },
  { label: 'PARTY HUNT', value: '1-4 PLAYERS', act: () => push(partyPage()), help: 'Up to four hunters on one screen. Shared bucks, first hit takes it.' },
  { label: 'BONUS GAMES', act: () => push(listPage('BONUS GAMES', B.all('bonus').map(b => ({ label: b.name, value: () => 'BEST ' + B.fmt(B.records.best['bonus-' + b.id] || 0), act: () => B.begin({ mode: 'bonus', bonus: b.id, hunts: [b.hunt] }) })))), help: 'Thirty-second galleries: crows, clays and snowmen.' },
  { label: 'PRACTICE RANGE', value: () => (B.records.range ? 'BADGE EARNED' : '7 STATIONS'), act: () => B.begin({ mode: 'range', hunts: ['range'] }), help: "Uncle Dub's range: learn the rifle, the scope and the call." },
  { label: 'THE LODGE', act: () => game.go('lodge'), help: 'Your trophies, records and the high-score boards.' },
  { label: 'SETTINGS', act: () => game.menu('settings'), help: 'Sound, display, controls, glyphs (PlayStation or Xbox) and the game\'s own.' },
  { label: 'ABOUT & CREDITS', act: () => game.go('about'), help: 'Source information, feedback and credits.' }
]) });
const listPage = (title, items) => ({ title, list: new B.List(items.map(i => Object.assign({}, i))) });
const partyPage = () => {
  const pg = { title: 'PARTY HUNT', party: true, list: null };
  pg.list = new B.List([
    ...B.HUNT_IDS.map(h => ({ label: B.get('hunt', h).name.toUpperCase(), act: () => B.begin({ mode: 'party', hunts: [h], party: true }) })),
    { label: 'QUICK DRAW', value: 'ALL 3 + CLAYS', act: () => B.begin({ mode: 'quickdraw', hunts: ['hollow'], party: true }) },
    { label: 'ADD A CPU HUNTER', value: () => B.cpuCount + ' CPU', act: () => { B.cpuCount = (B.cpuCount + 1) % 4; } },
    diffRow()
  ]);
  game.allowJoin({ max: 4, onJoin: () => B.sfx('confirm') });
  return pg;
};
B.cpuCount = 0;
B.menuScene = {
  enter() { B.inPlay = false; pages.length = 0; push(mainPage()); idle.t = 0; B.music('hoedown'); },
  exit() { game.allowJoin(false); },
  update(dt) {
    B.backdropVista(dt);
    const pg = pages[pages.length - 1];
    B.stepIdle(dt, pg.top);
    if (B.touchOnly) { if (game.input.pressed('cancel')) game.go('title'); return; }
    const r = pg.list.update(game.input, dt);
    if (r && r.back) { if (pg.party) game.allowJoin(false); pop(); }
    else if (r && r.pick && r.pick.act) r.pick.act();
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pg = pages[pages.length - 1];
      B.drawBackdrop(g, W, H);
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#140a04'));
      drawLogo(g, W * .22, 14, .55);
      B.title(g, pg.title, W * .62, 18, 2);
      const lw = Math.min(250, W * .5);
      pg.list.draw(g, Math.round(W * .62 - lw / 2), 46, lw, { h: 20, gap: 4, scale: 1, rows: Math.floor((H - 90) / 24) });
      const it = pg.list.items[pg.list.i];
      if (it && it.help) E.font.wrap(it.help, W * .32).forEach((l, k) => B.text(g, l, 14, 120 + k * 10, '#e8dcc8'));
      if (pg.party) {
        B.text(g, 'HUNTERS', 14, 92, '#f0c060');
        const ps = game.players;
        for (let k = 0; k < 4; k++) { const y = 104 + k * 22, joined = k < ps.length, cpu = !joined && k - ps.length < B.cpuCount; E.ui.box(g, 14, y, W * .32, 18, { bg: ['#2a2018', '#1a140e'], border: joined || cpu ? B.SEATS[k] : '#4a3a2a' }); B.drawReticle(g, { color: B.SEATS[k], shape: ['circle', 'diamond', 'brackets', 'triangle'][k], bloom: 0, dry: 0 }, 26, y + 9); B.text(g, joined ? 'P' + (k + 1) + (k === 0 ? ' · ' + (game.input.lastDevice === 'gamepad' ? 'PAD' : 'KEYS + MOUSE') : ' · PAD') : cpu ? 'CPU HUNTER' : 'PRESS START TO JOIN', 40, y + 6, joined || cpu ? '#ffffff' : '#8a7a6a'); }
      }
      B.drawPrompts(g, [['confirm', 'SELECT'], ['cancel', 'BACK']], game.input, W / 2, H - 16);
    });
  }
};
// start a run from the menu
B.begin = (o) => {
  const players = [];
  if (o.party) {
    game.players.forEach((inp, k) => players.push(new B.Player(k, inp)));
    for (let k = 0; k < B.cpuCount && players.length < 4; k++) { const p = new B.Player(players.length, null, { name: 'CPU' + (k + 1) }); p.bot = new B.Bot(p, { skill: 'average' }); players.push(p); }
    game.allowJoin(false);
  } else players.push(new B.Player(0, game.input, { name: 'YOU' }));
  if (o.total) players[0].total = o.total;
  const run = B.newRun(Object.assign({ players, seed: o.seed || (B.records.stats.hunts * 977 + 13) }, o));
  game.go('hunt', { run });
};

// ---- the Lodge: the engine's side view, a log room, the trophy wall ----
const LODGE_ROWS = [
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  '####################################',
  '####################################'
];
let lodge = null;
const mountCache = new Map();
B.mountCard = (key, spec, w = 56, h = 44) => {
  if (mountCache.has(key)) return mountCache.get(key);
  const T = new B.Target(w, h), ras = new B.Raster();
  const rig = new B.Quadruped({ species: spec.rig, sex: 'buck', size: spec.size || 1, antlers: { kind: spec.antlers, points: spec.points, seed: spec.seed || 5, spread: spec.spread }, colors: spec.colors });
  for (let k = 0; k < 4; k++) rig.update(.1, { x: 0, y: 0, z: 0, heading: Math.PI / 2 + .5, speed: 0, alert: 1, ground: () => 0 });
  const hb = rig.J.headBase, s = spec.size || 1;
  const lens = new B.Lens({ x: hb[0] - .2 * s, y: hb[1] - 2.6 * s * (spec.antlers === 'elk' ? 1.3 : spec.antlers === 'moose' ? 1.3 : 1), z: hb[2] + .25 * s, yaw: Math.PI / 2, pitch: 0, fov: 30, W: w, H: h });
  T.frame.fill(0); T.depth.fill(1e9); T.ids.fill(0);
  ras.begin(T, lens, { sunV: [-.3, -.6, .7], fogC: 0, fogNear: 1e5, fogFar: 2e5, fogMax: 0, outlineC: B.hexPk('#1a1008') });
  for (const p of rig.parts) if (p.zone === 'head' || p.zone === 'neck' || p.zone === 'antler') ras.capsule(...p.a, ...p.b, p.ra, p.rb, p.tone, { id: 1, outline: true, flat: p.flat });
  for (const pm of rig.palms) for (let i = 0; i < pm.rim.length - 1; i++) ras.tri(pm.c, pm.rim[i], pm.rim[i + 1], rig.tones.antler[i % 2 ? 2 : 3], { id: 1, outline: true });
  ras.outlines();
  for (let i = 0; i < T.frame.length; i++) if (T.depth[i] > 1e8) T.frame[i] = 0;
  const cv = T.canvas(); mountCache.set(key, cv); return cv;
};
B.lodgeScene = {
  view: 'side',
  enter(data) {
    B.inPlay = false; idle.t = 0;
    if (!lodge) {
      lodge = { map: new E.PlatformMap({ rows: LODGE_ROWS, legend: { 'B': 2, '#': 1 }, types: { 1: { style: 'wood', side: '#6a4a2a' }, 2: { kind: 'back', style: 'plank', side: '#5a3a22' } } }), dub: new E.Humanoid({ size: 1.3, build: 'bulky', outfit: 'coat', hat: { style: 'cap', color: '#f07020' }, weapon: null, colors: { skin: '#e0a880', hair: '#c8c8c0', cloth: '#7a6a48', coat: '#7a6a48', pants: '#4a4232' } }), hound: new E.Blob({ R: 7, colors: { dk: '#5a3a22', base: '#8a5a32', lt: '#b07a48', spec: '#e0b080', eye: '#100808', pupil: '#000' }, ears: 'cat', tail: true, feet: true }) };
    }
    B.lodgeState = lodge;
    lodge.focus = 0; lodge.cx = 120; lodge.t = 0; lodge.ceremony = data && data.ceremony; lodge.attract = data && data.attract;
    game.lights.enabled = true; game.lights.ambient = .45;
    B.music('lodgefire');
    lodge.items = lodgeItems();
    lodge.list = new B.List(lodge.items.map(i => ({ label: i.name })), { horizontal: true });
  },
  exit() { game.lights.enabled = false; },
  update(dt) {
    lodge.t += dt;
    const groundZ = 32;
    lodge.dub.update(dt, { x: 60, y: 0, z: groundZ, vx: 0, vy: 0, facing: 0, pose: lodge.list.i === 0 && lodge.t % 6 < 2 ? 'wave' : undefined });
    lodge.hound.update(dt, { squash: Math.sin(lodge.t * 1.5) * .05, look: [1, 0], squint: 1 });
    if (lodge.attract) { lodge.list.i = Math.floor(lodge.t / 1.2) % lodge.items.length; if (B.activity()) game.go('title'); if (lodge.t > 6.5 && B.attractNext) B.attractNext(); }
    else {
      const r = lodge.list.update(game.input, dt);
      if (r && r.back) game.go('menu');
      // the mouse: hover a plaque on the wall
      const p = game.input.pointer && game.input.pointer();
      if (p && game.input.lastDevice === 'mouse' && lodge.rects) lodge.rects.forEach((rc, k) => { if (rc && p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) lodge.list.i = k; });
      if (lodge.ceremony && lodge.t > 1 && game.input.pressed('confirm')) game.go('about');
    }
    const it = lodge.items[lodge.list.i];
    lodge.cx += (it.x - lodge.cx) * Math.min(1, dt * 4);
    game.focus(lodge.cx, 0, 80);
  },
  draw(r) {
    const groundZ = 32;
    r.sky(['#1a100a', '#2a1a10']);
    lodge.map.draw(r);
    // logs on the back wall (horizontal bands)
    // the fireplace: stone, a fire, light
    r.queue(30, 0, groundZ, g => { const p = r.w(30, 0, groundZ); px.rect(g, p[0] - 26, p[1] - 56, 52, 56, '#6a6460'); for (let k = 0; k < 7; k++) px.rect(g, p[0] - 26 + (k % 3) * 18, p[1] - 56 + k * 8, 16, 1, '#4a4440'); px.rect(g, p[0] - 16, p[1] - 26, 32, 26, '#1a0c06'); for (let k = 0; k < 5; k++) { const fx = p[0] - 10 + k * 5, fh = 8 + Math.sin(lodge.t * 9 + k * 2) * 4 + (k % 2) * 4; px.poly(g, [[fx - 3, p[1] - 2], [fx, p[1] - 2 - fh], [fx + 3, p[1] - 2]], k % 2 ? '#f8a030' : '#f8d040'); } px.rect(g, p[0] - 34, p[1] - 60, 68, 5, '#4a3020'); }, { emissive: true });
    game.lights.add(30, 0, groundZ + 14, 120, .95 + Math.sin(lodge.t * 11) * .05, { color: '#ffa050' });
    r.prop('lamp', 330, 0, groundZ, { light: true }); r.prop('lamp', 560, 0, groundZ, { light: true });
    r.prop('barrel', 400, 0, groundZ); r.prop('crate', 430, 0, groundZ); r.prop('chest', 600, 0, groundZ); r.prop('banner', 250, 0, groundZ + 70, { color: '#a83a22' });
    r.actor(60, 0, groundZ, (g, ox, oy) => lodge.dub.draw(g, ox, oy, r.view));
    r.actor(95, 0, groundZ, (g, ox, oy) => lodge.hound.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H; lodge.rects = [];
      lodge.items.forEach((it, k) => {
        const p = r.w(it.x, 0, it.z), on = k === lodge.list.i, w = 60, h = 52, x = Math.round(p[0] - w / 2), y = Math.round(p[1] - h);
        lodge.rects[k] = [x, y, w, h];
        px.rect(g, x - 2, y - 2, w + 4, h + 4, on ? '#ffd070' : '#2a1a0e'); px.rect(g, x, y, w, h, '#5a3a20'); px.rect(g, x + 3, y + 3, w - 6, h - 6, '#6a4628');
        it.draw(g, x, y, w, h);
      });
      const it = lodge.items[lodge.list.i];
      B.panel(g, W / 2 - 160, H - 72, 320, 58);
      B.text(g, it.name, W / 2, H - 66, '#ffd070', { align: 'center', scale: 1 });
      E.font.wrap(it.info(), 300).slice(0, 4).forEach((l, i) => B.text(g, l, W / 2, H - 54 + i * 9, '#e8dcc8', { align: 'center' }));
      B.title(g, 'THE LODGE', W / 2, 6, 2);
      B.drawPrompts(g, lodge.attract ? [] : [['left', 'LOOK'], ['cancel', 'BACK']], game.input, W / 2, H - 11);
      if (lodge.attract && B.drawDemoBanner) B.drawDemoBanner(g, W, H);
    });
  }
};
function lodgeItems() {
  const R = B.records, items = [], z0 = 32 + 60;
  const T = (id, sp) => {
    const t = B.get('trophy', id), rec = R.trophies[id] || {}, got = rec.bagged;
    return { name: t.name, x: 0, z: z0, info: () => got ? t.title + '. ' + t.label + '. Bagged ' + (rec.date || '') + ' at ' + rec.best + ' m. ' + t.story[0] : rec.seen ? 'Seen, not bagged. ' + t.story[0] + ' ' + t.rules : 'Unknown. ' + t.story[0],
      draw: (g, x, y, w, h) => { const cv = B.mountCard('t-' + id, sp); if (cv && cv.width) { if (got) g.drawImage(cv, x + 2, y + 2); else { px.blend(g, .9, 'normal', () => { g.globalAlpha = .25; g.drawImage(cv, x + 2, y + 2); g.globalAlpha = 1; }); B.text(g, '?', x + w / 2, y + h / 2 - 6, '#2a1a0e', { align: 'center', scale: 2 }); } } } };
  };
  items.push(T('iron-rack', { rig: 'deer', antlers: 'whitetail', points: 14, size: 1.1 }), T('duke', { rig: 'elk', antlers: 'elk', points: 14, size: 1.5, colors: { coat: '#c09060', mane: '#4a2a18' } }), T('big-mo', { rig: 'moose', antlers: 'moose', points: 12, spread: 72, size: 1.9 }));
  for (const h of B.HUNT_IDS) { const H0 = B.get('hunt', h), bb = R.bestBuck[h]; const sp = { hollow: { rig: 'deer', antlers: 'whitetail', points: 10 }, bugle: { rig: 'elk', antlers: 'elk', points: 12, size: 1.4 }, muskeg: { rig: 'moose', antlers: 'moose', points: 10, spread: 50, size: 1.7 } }[h];
    items.push({ name: 'BEST BUCK: ' + H0.short, x: 0, z: z0, info: () => bb ? bb.label + ', ' + bb.dist + ' m, ' + bb.zone + '. ' + B.fmt(bb.pts) + ' points.' : 'No buck bagged here yet.', draw: (g, x, y) => { const cv = B.mountCard('b-' + h, sp); if (bb && cv && cv.width) g.drawImage(cv, x + 2, y + 2); else B.text(g, 'EMPTY', x + 30, y + 22, '#8a6a48', { align: 'center' }); } }); }
  items.push({ name: 'RANGE BADGE', x: 0, z: z0, info: () => R.range ? "Uncle Dub's range: all seven stations. \"You'll do.\"" : 'Finish the seven stations at the Practice Range.', draw: (g, x, y) => { px.disc(g, x + 30, y + 24, 14, R.range ? '#f0c030' : '#3a2a18'); px.disc(g, x + 30, y + 24, 10, R.range ? '#c88a20' : '#2a1a10'); B.drawAntlerIcon(g, x + 26, y + 20, R.range ? { fill: '#fff4c0' } : {}); } });
  items.push({ name: 'CHAMPION PLAQUE', x: 0, z: z0, info: () => R.champion ? 'Hunt-Off champion. Your name on the lodge wall.' : 'Win the Hunt-Off to hang this one.', draw: (g, x, y) => { B.text(g, R.champion ? 'CHAMP' : '----', x + 30, y + 20, R.champion ? '#f0c030' : '#8a6a48', { align: 'center', scale: 1 }); } });
  items.push({ name: 'HIGH SCORES', x: 0, z: z0, info: () => ['hunt-hollow', 'hunt-bugle', 'hunt-muskeg', 'bonus-crow', 'bonus-saucer', 'bonus-snowball'].map(k => k.replace('hunt-', '').replace('bonus-', '').toUpperCase() + ' ' + B.table(k)[0].name + ' ' + B.fmt(B.table(k)[0].score)).join(' · '), draw: (g, x, y) => { px.rect(g, x + 4, y + 4, 52, 44, '#1e2a22'); B.table('hunt-hollow').slice(0, 4).forEach((e, i) => B.text(g, e.name + ' ' + Math.round(e.score / 100) / 10 + 'K', x + 8, y + 8 + i * 9, '#e8f0e0', { shadow: false })); } });
  items.push({ name: 'STATS', x: 0, z: z0, info: () => { const s = R.stats; return 'Hunts ' + s.hunts + ' · Shots ' + s.shots + ' · Accuracy ' + (s.shots ? Math.round(s.hits / s.shots * 100) : 0) + '% · Bucks ' + s.bucks + ' · Does ' + s.does + ' · Critters ' + s.critters + ' · Longest ' + s.longest + ' m. Favourite rifle sound: "ka-CHUNK".'; }, draw: (g, x, y) => { B.text(g, String(R.stats.bucks), x + 30, y + 14, '#ffffff', { align: 'center', scale: 2 }); B.text(g, 'BUCKS', x + 30, y + 32, '#c8b898', { align: 'center' }); } });
  items.forEach((it, k) => { it.x = 150 + k * 52; });
  return items;
}

// ---- About & Credits: one idea per page, left/right to turn ----
B.aboutScene = {
  enter() { this.page = 0; this.t = 0; B.music('lodgefire'); },
  update(dt) {
    this.t += dt; const I = game.input, P = B.REPORT_PAGES;
    if (I.pressed('right') || I.pressed('confirm') || I.pressed('fire')) { this.page = (this.page + 1) % P.length; B.sfx('focus'); }
    if (I.pressed('left')) { this.page = (this.page + P.length - 1) % P.length; B.sfx('focus'); }
    const c = I.clicked && I.clicked(); if (c) { this.page = (this.page + (c[0] > (game.W || 480) / 2 ? 1 : P.length - 1)) % P.length; B.sfx('focus'); }
    if (I.pressed('cancel')) game.go('menu');
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, P = B.REPORT_PAGES[this.page];
      px.rect(g, 0, 0, W, H, '#140c08');
      for (let y = 0; y < H; y += 12) px.rect(g, 0, y, W, 1, '#1e140c');
      B.title(g, P.title, W / 2, 8, 2);
      let y = 34;
      const big = P.rows.length < 7;
      for (const [k, v] of P.rows) {
        if (y > H - 30) break;
        const stack = k && E.font.width(k) > 92;
        if (k) { B.text(g, k, 16, y, '#f0c060'); if (stack) y += 10; }
        const lines = E.font.wrap(B.clean(v), W - (k && !stack ? 130 : 40));
        lines.forEach((l, i) => B.text(g, l, k && !stack ? 112 : 24, y + i * 9, '#e8dcc8'));
        y += Math.max(1, lines.length) * 9 + (big ? 6 : 3);
      }
      B.text(g, (this.page + 1) + '/' + B.REPORT_PAGES.length, W - 10, H - 12, '#8a7a6a', { align: 'right' });
      B.drawPrompts(g, [['left', 'TURN'], ['cancel', 'BACK']], game.input, W / 2, H - 14);
    });
  }
};
})();
