// The game's shell: the engine's game object, its scenes (title, attract, the operation card, play, tally, ending, the
// lost screen, high scores, About, the dev screen), the sounds, the captions, and the debug handle the tests use.
// The rules live in 20-battle.js; this file only feeds it input and shows it.
(() => {
'use strict';
const WP = globalThis.WP;
const E = globalThis.My3D2dge;
const { clamp } = WP;

// the controls: the engine's shoot-'em-up preset, with a reload key added (fire, bomb = grenade, reload)
const INPUT = Object.assign({}, E.Input.SHMUP, { reload: ['KeyR', 'Pad2'] });

// a rough check for a phone or tablet with no mouse, keyboard or pad: those get the notice, and the attract mode runs
const touchOnly = () => typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
WP.touchOnly = touchOnly;

const game = new E.Game({
  canvas: 'screen', res: [WP.W, WP.H], view: 'overhead', bg: '#05040a', input: INPUT,
  menu: {
    items: [
      ['DEV MODE', () => game.go('dev', { back: 'play' })],
      // a co-op seat (not player 1) drops out of the battle; its crosshair goes and its score stays on the board
      ['DROP OUT', () => {
        const b = battle && battle.players.length > 1 ? battle.players[battle.players.length - 1] : null;
        if (b) { b.down = true; b.left = true; ui.note = { text: 'PLAYER ' + b.id + ' DROPPED OUT', t: 3 }; }
      }],
    ],
    settings: [{ key: 'difficulty', label: 'Difficulty', options: [['recruit', 'Recruit'], ['veteran', 'Veteran'], ['arcade', 'Arcade']], value: 'veteran' }],
    quit: 'title',
  },
});
game.input.glyphs = 'playstation';
const ui = { lastPointer: null };
// the high-score table and the initials entry (the engine's arcade frame)
WP.arcade = new E.Arcade(game, { id: 'operation-wolfpack', lives: 0, hud: false, idle: 10, demo: 30, scores: 6 });
const box = (g, x, y, w, h, c) => { if (w > 0 && h > 0) E.px.rect(g, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), c); };

// the sounds: all written here, from the engine's voices (no files)
const A = game.audio;
A.define('wp_shot', [{ wave: 'noise', freq: 2600, to: 500, dur: 0.09, vol: 0.5, filter: 'lowpass' }, { wave: 'square', freq: 140, to: 60, dur: 0.07, vol: 0.25 }]);
A.define('wp_kill', { wave: 'noise', freq: 900, to: 260, dur: 0.12, vol: 0.3, filter: 'lowpass' });
A.define('wp_hurt', [{ wave: 'square', freq: 320, to: 90, dur: 0.22, vol: 0.4 }, { wave: 'noise', freq: 1200, to: 200, dur: 0.2, vol: 0.3 }]);
A.define('wp_boom', [{ wave: 'noise', freq: 700, to: 40, dur: 0.7, vol: 0.7, filter: 'lowpass' }, { wave: 'square', freq: 80, to: 30, dur: 0.6, vol: 0.3 }]);
A.define('wp_throw', { wave: 'noise', freq: 1400, to: 500, dur: 0.18, vol: 0.2, filter: 'highpass' });
A.define('wp_reload', [{ wave: 'square', freq: 420, dur: 0.05, vol: 0.2 }, { wave: 'square', freq: 260, dur: 0.05, vol: 0.2, step: 0 }]);
A.define('wp_launch', { wave: 'noise', freq: 900, to: 1800, dur: 0.5, vol: 0.35, filter: 'highpass' });
A.define('wp_shootdown', { wave: 'square', freq: 1400, to: 200, dur: 0.18, vol: 0.3 });
A.define('wp_volley', { wave: 'noise', freq: 2000, to: 300, dur: 0.3, vol: 0.5, filter: 'lowpass' });
A.define('wp_bosshit', { wave: 'square', freq: 260, to: 120, dur: 0.1, vol: 0.4 });
A.define('wp_drop', { wave: 'square', freq: 660, to: 990, dur: 0.12, vol: 0.2 });
A.define('wp_civ', { wave: 'square', freq: 220, to: 110, dur: 0.35, vol: 0.35 });
A.define('wp_bleat', { wave: 'saw', freq: 480, to: 620, dur: 0.3, vol: 0.2, vib: 0.3 });
A.define('wp_crate', { wave: 'noise', freq: 1600, to: 600, dur: 0.2, vol: 0.4, filter: 'lowpass' });
A.define('wp_blip', { wave: 'square', freq: 540, to: 620, dur: 0.035, vol: 0.09 });
const sfx = (name, o) => A.sfx(name, o || {});

// the captions: a radio line types out at the top of the screen, a blip every couple of letters (the voices are blips)
let captions = [];
const caption = key => {
  const t = WP.TEXT[key];
  if (!t) return;
  captions.push({ who: t[0], text: t[1], t: 0, n: 0 });
  if (captions.length > 2) captions.shift();
};
const updateCaptions = dt => {
  for (const c of captions) {
    c.t += dt;
    const n = Math.floor(c.t * 28);
    // the voice: each letter has its own pitch (a gibberish 'Animalese' blip, not words)
    if (n > c.n) { for (let i = c.n; i < n && i < c.text.length; i++) { if (c.text[i] !== ' ') sfx('wp_blip', { pitch: 0.7 + (c.text.charCodeAt(i) % 13) / 18 }); } c.n = n; }
  }
  captions = captions.filter(c => c.t < c.text.length / 28 + 3.2);
};
const drawCaptions = g => {
  if (!captions.length) return;
  const c = captions[captions.length - 1], shown = c.text.slice(0, Math.min(c.text.length, Math.floor(c.t * 28)));
  E.ui.box(g, 8, 6, WP.W - 16, 50, { bg: ['#140f22', '#0a0712'], border: '#5a4a8a', alpha: 0.9 });
  E.font.text(g, c.who, 16, 11, '#ffe060', { shadow: '#000' });
  E.font.text(g, shown, 16, 21, '#f4f0ff', { shadow: '#000', wrap: WP.W - 40 });
};

// the run: what the player carries from one operation to the next, and the battle being played
let run = null, battle = null;
const newRun = () => {
  const T = WP.T;
  run = {
    seed: (Math.random() * 1e9) | 0,
    op: 'op1',
    carry: { score: 0, damage: 0, spares: T.spares, grenades: T.grenades, saved: 0, lost: 0, civHit: 0, kills: { soldier: 0, vehicle: 0, boss: 0 } },
    opStart: null, cleared: 0,
  };
  run.opStart = JSON.parse(JSON.stringify(run.carry));
  captions = [];
};
const difficulty = () => game.settings.difficulty || 'veteran';
const startBattle = (opId, o = {}) => {
  battle = new WP.Battle(opId, Object.assign({ difficulty: difficulty(), carry: run.carry, seed: run.seed + WP.OPS[opId].n }, o));
  captions = [];
  return battle;
};

// the player's input for one step: the keyboard and the mouse aim, the stick, and the trigger
const playerInput = b => {
  if (WP.override) return WP.override(b, 1 / 120);
  return b.players.map((pl, i) => seatInput(pl, i === 0 ? game.input : game.players[i] || null, i === 0));
};
const seatInput = (pl, I, mouse) => {
  if (!I) return {};
  const pointer = mouse ? I.pointer() : null;
  let mx = (I.down('left') ? -1 : 0) + (I.down('right') ? 1 : 0), my = (I.down('up') ? -1 : 0) + (I.down('down') ? 1 : 0);
  if (I.padMove && (Math.abs(I.padMove[0]) > 0 || Math.abs(I.padMove[1]) > 0)) { mx += I.padMove[0]; my += I.padMove[1]; }
  if (I.padAim) { mx += I.padAim[0]; my += I.padAim[1]; }
  let aim = null;
  if (mouse) {
    if (pointer && ui.lastPointer && (pointer[0] !== ui.lastPointer[0] || pointer[1] !== ui.lastPointer[1])) aim = pointer;
    ui.lastPointer = pointer;
  }
  return { mx: clamp(mx, -1, 1), my: clamp(my, -1, 1), aim, fire: I.down('fire'), grenade: I.pressed('bomb'), reload: I.pressed('reload') };
};

// the events of a step: sounds, captions and the music's change on the boss
const playEvents = b => {
  for (const ev of b.events) {
    switch (ev.k) {
      case 'shot-fired': sfx('wp_shot', { vol: 0.8, vary: 0.08 }); break;
      case 'kill': sfx('wp_kill', { vol: 0.8 }); break;
      case 'hurt': sfx('wp_hurt'); game.shake(2); break;
      case 'boom': sfx('wp_boom'); game.shake(3); break;
      case 'throw': sfx('wp_throw'); break;
      case 'reload': case 'reloaded': sfx('wp_reload'); break;
      case 'radio': caption(ev.key); break;
      case 'launch': sfx('wp_launch'); break;
      case 'shootdown': sfx('wp_shootdown'); break;
      case 'volley': sfx('wp_volley'); game.shake(2); break;
      case 'bosshit': sfx('wp_bosshit'); break;
      case 'drop': sfx('wp_drop', { vol: 0.5 }); break;
      case 'pickup': sfx('coin'); break;
      case 'crate': sfx('wp_crate'); break;
      case 'animal': sfx('wp_bleat'); break;
      case 'civhit': sfx('wp_civ'); caption('civ.hit'); break;
      case 'hostagelost': sfx('wp_civ'); caption('hostage.lost'); break;
      case 'freed': caption('hostage.freed'); break;
      case 'saved': sfx('coin'); caption('hostage.saved'); break;
      case 'boss':
        if (ev.phase === 'fight') { A.music(E.songs.boss); }
        if (ev.phase === 'enraged') caption('boss.enraged');
        break;
      case 'bossdown': caption('boss.down'); game.flash('#ffffff', 0.25); A.stopMusic(0.4); sfx('wp_boom', { vol: 1 }); break;
      case 'lost': caption(ev.why === 'ammo' ? 'lost.ammo' : 'lost.down'); break;
      case 'down': sfx('wp_hurt', { vol: 1 }); caption('down.one'); break;
      case 'fury': sfx('coin'); caption('fury.on'); break;
      case 'dynamite': sfx('wp_boom', { vol: 1 }); game.shake(6); game.flash('#ffe0a0', 0.2); caption('dyn.boom'); break;
      case 'flame': sfx('wp_volley', { vol: 0.7 }); break;
      case 'drop': if (ev.what === 'emergency') caption('drop.emergency'); sfx('wp_drop', { vol: 0.5 }); break;
      default: break;
    }
  }
};

// a small menu: the rows, the arrows or the mouse pick one, and a click or confirm takes it
const menuOf = (items) => ({ items, sel: 0, rects: [] });
const menuUpdate = (m, I) => {
  if (I.pressed('up')) m.sel = (m.sel + m.items.length - 1) % m.items.length;
  if (I.pressed('down')) m.sel = (m.sel + 1) % m.items.length;
  const c = I.clicked();
  if (c) for (let i = 0; i < m.rects.length; i++) {
    const r = m.rects[i];
    if (c[0] >= r.x && c[0] <= r.x + r.w && c[1] >= r.y && c[1] <= r.y + r.h) return i;
  }
  const p = I.pointer();
  if (p) for (let i = 0; i < m.rects.length; i++) {
    const r = m.rects[i];
    if (p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h) m.sel = i;
  }
  if (I.pressed('confirm') || I.pressed('start')) return m.sel;
  return -1;
};
const menuDraw = (g, m, x, y, gap = 16) => {
  m.rects = [];
  m.items.forEach((label, i) => {
    const on = i === m.sel, yy = y + i * gap, text = (on ? '> ' : '  ') + label;
    const w = E.font.width(text) + 8;
    m.rects.push({ x: x - 4, y: yy - 3, w: w, h: gap - 2 });
    E.font.text(g, text, x, yy, on ? '#ffe060' : '#c8c0e8', { shadow: '#000' });
  });
};

// the sky behind the menus: the operation's own sky, dimmed
const sky = (r, op) => r.sky(['#0c0a1e', '#2a1a3a', '#5a2a3a']);

WP.playEvents = playEvents;
WP.seatInput = seatInput;

// ---- scenes ---------------------------------------------------------------------------------------------------------
// co-op: a pad that presses Start joins until the operation starts (then the seats are fixed for that operation)
const openJoin = () => game.allowJoin({ max: 4, onJoin: (input, n) => { ui.note = { text: 'PLAYER ' + n + ' JOINED', t: 3 }; sfx('coin'); } });
const title = {
  enter() { ui.idle = 0; ui.menu = menuOf(['START MISSION', 'HIGH SCORES', 'ABOUT']); A.music(E.songs.title); openJoin(); },
  update(dt) {
    const I = game.input;
    if (ui.note) ui.note.t -= dt;
    const active = I.anyPressed() || I.clicked() || (I.pointer() && (I.pointer()[0] !== ui.pointerLast?.[0]));
    ui.pointerLast = I.pointer();
    ui.idle = active ? 0 : ui.idle + dt;
    if (ui.idle > 10) { game.go('attract', { op: 'op1' }); return; }
    const pick = menuUpdate(ui.menu, I);
    if (pick === 0 && !touchOnly()) { newRun(); game.go('cut', { id: 'briefing', next: 'card', nextData: { op: 'op1' } }); }
    else if (pick === 1) game.go('scores');
    else if (pick === 2) game.go('about', { back: 'title' });
  },
  draw(r) {
    sky(r);
    r.overlay(g => {
      if (ui.note && ui.note.t > 0) E.font.text(g, ui.note.text, WP.W / 2, 8, '#7ae0a0', { align: 'center', shadow: '#000' });
      E.font.title(g, 'OPERATION', WP.W / 2, 40, { scale: 3, align: 'center', colors: ['#ffe9a0', '#ff9a4a'] });
      E.font.title(g, 'WOLFPACK', WP.W / 2, 78, { scale: 4, align: 'center', colors: ['#ffe9a0', '#ff6a3a'] });
      E.font.text(g, 'AN ORIGINAL RAIL SHOOTER INSPIRED BY OPERATION WOLF', WP.W / 2, 124, '#c8c0e8', { align: 'center', shadow: '#000' });
      menuDraw(g, ui.menu, 180, 156, 20);
      if (touchOnly()) E.font.text(g, WP.TOUCH_NOTICE, WP.W / 2, 220, '#ff6a4a', { align: 'center', shadow: '#000' });
      else E.font.text(g, 'PRESS ' + game.input.label('confirm') + ' OR CLICK', WP.W / 2, 246, '#8a7ca8', { align: 'center', shadow: '#000' });
    });
  },
};

const attract = {
  enter(data) {
    const op = (data && data.op) || 'op1';
    const seedRun = { op, carry: { score: 0, damage: 0, spares: WP.T.spares, grenades: WP.T.grenades, saved: 0, lost: 0, civHit: 0, kills: { soldier: 0, vehicle: 0, boss: 0 } } };
    battle = new WP.Battle(op, { god: true, infinite: true, difficulty: 'veteran', carry: seedRun.carry, seed: 77 + WP.OPS[op].n });
    attract.op = op;
    captions = [];
    A.music(E.songs.adventure);
  },
  exit() { A.stopMusic(0.3); },
  update(dt) {
    if (game.input.anyPressed() || game.input.clicked()) { game.go('title', null, { fade: 0 }); return; }
    const input = WP.bot(battle, dt);
    battle.step(dt, input);
    playEvents(battle);
    updateCaptions(dt);
    if (battle.finished) game.go('attract', { op: WP.OP_ORDER[(WP.OP_ORDER.indexOf(attract.op) + 1) % WP.OP_ORDER.length] }, { fade: 0 });
  },
  draw(r) {
    r.overlay(g => {
      WP.drawBattle(g, battle);
      drawCaptions(g);
      if (Math.floor(game.time * 2) % 2) E.font.text(g, 'PRESS ANY BUTTON', WP.W / 2, 150, '#ffffff', { align: 'center', shadow: '#000' });
      E.font.text(g, 'ATTRACT: THE PACK PLAYS ITSELF', WP.W / 2, 4, '#8a7ca8', { align: 'center', shadow: '#000' });
    });
  },
};

const card = {
  enter(data) { card.op = data.op; card.t = 0; if (run) run.op = data.op; openJoin(); },
  update(dt) {
    card.t += dt;
    if (card.t > 3.2 || game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked()) game.go('play', { op: card.op }, { fade: 'wipe', seconds: 0.4 });
  },
  draw(r) {
    sky(r);
    const [a, b] = WP.CARDS[card.op];
    r.overlay(g => {
      E.font.text(g, a, WP.W / 2, 60, '#ffd060', { align: 'center', shadow: '#000', scale: 2 });
      E.font.title(g, b, WP.W / 2, 96, { scale: 4, align: 'center', colors: ['#ffe9a0', '#ff6a3a'] });
      E.font.text(g, WP.OPS[card.op].card, WP.W / 2, 160, '#f4f0ff', { align: 'center', shadow: '#000' });
    });
  },
};

const play = {
  pausable: true,
  enter(data) {
    if (data && data.resume) return;
    const op = (data && data.op) || (run && run.op) || 'op1';
    startBattle(op, { players: Math.max(1, game.players.length) });
    run.op = op;
    if (dev.ops) { battle.god = dev.ops.god; battle.infinite = dev.ops.infinite; }
    A.music(E.songs.adventure);
    ui.lastPointer = null;
  },
  update(dt) {
    if (ui.note) ui.note.t -= dt;
    if (!battle || battle.finished) return;
    // a pad that starts mid-operation joins the battle with a fresh loadout
    while (game.players.length > battle.players.length) battle.addPlayer(battle.players.length + 1);
    const input = playerInput(battle);
    battle.step(dt, input);
    playEvents(battle);
    updateCaptions(dt);
    if (battle.finished) {
      if (battle.result === 'won') game.go('tally', { op: battle.opId }, { fade: 'wipe', seconds: 0.4 });
      else game.go('lost', { op: battle.opId }, { fade: 0 });
    }
  },
  draw(r) {
    r.overlay(g => { WP.drawBattle(g, battle); drawCaptions(g); });
  },
};

const tally = {
  enter(data) {
    const op = WP.OPS[data.op], p = battle.p;
    tally.op = data.op;
    run.carry = { score: p.score, damage: Math.max(0, Math.round(p.damage) - op.heal), spares: p.spares, grenades: p.grenades, saved: battle.saved, lost: battle.lost, civHit: battle.civShot, kills: Object.assign({}, p.kills) };
    run.cleared = Math.max(run.cleared || 0, WP.OP_ORDER.indexOf(data.op) + 1);
    tally.acc = Math.round(battle.accuracy * 100);
    tally.best = Math.max(...battle.players.map(p => p.bestStreak));
    tally.t = 0;
    tally.perk = op.perk;
    run.opStart = JSON.parse(JSON.stringify(run.carry));
  },
  update(dt) {
    tally.t += dt;
    if (tally.t < 1.2) return;
    if (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked()) {
      const op = WP.OPS[tally.op];
      if (tally.op === 'op6') game.go('ending', null, { fade: 'wipe', seconds: 0.4 });
      else if (op.cut) game.go('cut', { id: op.cut }, { fade: 'wipe', seconds: 0.4 });
      else game.go('map', null, { fade: 'wipe', seconds: 0.4 });
    }
  },
  draw(r) {
    sky(r);
    const c = run.carry, op = WP.OPS[tally.op];
    r.overlay(g => {
      E.ui.box(g, 60, 26, WP.W - 120, 218, { bg: ['#1a1430', '#0c0818'], border: '#5a4a8a' });
      E.font.title(g, op.name + ' CLEAR', WP.W / 2, 40, { scale: 2, align: 'center', colors: ['#ffe9a0', '#ff8a3a'] });
      const rows = [
        ['SCORE', String(c.score).padStart(6, '0')],
        ['RANK', WP.rankFor(c.score)],
        ['ACCURACY', tally.acc + '%'],
        ['BEST STREAK', String(tally.best)],
        ['SOLDIERS', String(run.carry.kills.soldier)],
        ['VEHICLES', String(run.carry.kills.vehicle)],
        ['CIVILIANS HIT', String(c.civHit)],
        ['WORKERS ON THE TRUCK', String(c.saved) + ' OF ' + battle.hostagesTotal],
        ['DAMAGE CARRIED', c.damage + '%'],
        ['PERK', op.perk === 'commsDown' ? 'RADIO DOWN: NO MORE CALLS FROM THE HILL' : 'VILLAGE AID: THE HUTS ARE OURS'],
      ];
      rows.forEach(([k, v], i) => {
        const y = 72 + i * 15;
        E.font.text(g, k, 96, y, '#c8b8ff', { shadow: '#000' });
        E.font.text(g, v, WP.W - 96, y, '#ffffff', { align: 'right', shadow: '#000' });
      });
      if (tally.t > 1.2 && Math.floor(game.time * 2) % 2) E.font.text(g, 'PRESS ' + game.input.label('confirm') + ' TO CONTINUE', WP.W / 2, 248, '#ffe060', { align: 'center', shadow: '#000' });
    });
  },
};

const ending = {
  enter() {
    const total = WP.OP_ORDER.reduce((n, id) => n + WP.OPS[id].hostages.length, 0);
    const share = total ? run.carry.saved / total : 0, e = WP.ENDINGS.find(x => share >= x.min);
    ending.e = e; ending.t = 0; A.music(E.songs.victory);
  },
  update(dt) {
    ending.t += dt;
    if (ending.t < 1.5) return;
    if (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked()) {
      if (WP.arcade.qualifies(run.carry.score, '')) game.go('initials', null, { fade: 0 });
      else game.go('title');
    }
  },
  draw(r) {
    sky(r);
    r.overlay(g => {
      E.font.title(g, ending.e.title, WP.W / 2, 50, { scale: 2, align: 'center', colors: ['#ffe9a0', '#ff8a3a'] });
      E.font.text(g, ending.e.text, WP.W / 2, 96, '#f4f0ff', { align: 'center', wrap: 380, shadow: '#000' });
      E.font.text(g, 'SCORE ' + String(run.carry.score).padStart(6, '0') + '   RANK ' + WP.rankFor(run.carry.score), WP.W / 2, 176, '#ffe060', { align: 'center', shadow: '#000' });
      if (ending.t > 1.5 && Math.floor(game.time * 2) % 2) E.font.text(g, 'PRESS ' + game.input.label('confirm'), WP.W / 2, 236, '#ffffff', { align: 'center', shadow: '#000' });
    });
  },
};

// the initials for a high score: the arcade frame takes the letters, and the table is kept for the visit
const initials = {
  enter() { WP.arcade.enter(run.carry.score, '', () => game.go('scores', null, { fade: 0 })); },
  update(dt) { WP.arcade.update(dt); },
  draw(r) { sky(r); r.overlay(g => E.font.text(g, 'NEW HIGH SCORE: ' + String(run.carry.score).padStart(6, '0'), WP.W / 2, 20, '#ffe060', { align: 'center', shadow: '#000' })); WP.arcade.draw(r); },
};

// the map: the six operations in order, the cleared ones marked; the next one is the one to fly to
const map = {
  enter() { map.t = 0; },
  update(dt) {
    map.t += dt;
    if (map.t < 0.6) return;
    if (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked()) {
      const next = WP.OP_ORDER[Math.min(WP.OP_ORDER.length - 1, run.cleared || 0)], op = WP.OPS[next];
      if (op.pre) game.go('cut', { id: op.pre, next: 'card', nextData: { op: next } }, { fade: 'wipe', seconds: 0.4 });
      else game.go('card', { op: next }, { fade: 'wipe', seconds: 0.4 });
    }
  },
  draw(r) {
    sky(r);
    r.overlay(g => {
      E.font.title(g, 'THE HYENA LEGION', WP.W / 2, 22, { scale: 2, align: 'center', colors: ['#ffe9a0', '#ff8a3a'] });
      WP.OP_ORDER.forEach((id, i) => {
        const op = WP.OPS[id], x = 40 + i * 76, y = 110, cleared = i < (run.cleared || 0), next = i === (run.cleared || 0);
        px_line(g, x, y, x + 76, y, '#5a4a8a');
        E.px.disc(g, x, y, 8, cleared ? '#7ae0a0' : next ? '#ffe060' : '#3a3450');
        E.font.text(g, 'OP ' + op.n, x - 12, y - 22, next ? '#ffe060' : '#c8b8ff', { shadow: '#000' });
        E.font.text(g, op.name, x - 12, y + 14, cleared ? '#7ae0a0' : '#f4f0ff', { shadow: '#000', wrap: 70 });
      });
      E.font.text(g, 'SCORE ' + String(run.carry.score).padStart(6, '0') + '   WORKERS HOME ' + run.carry.saved, WP.W / 2, 180, '#c8c0e8', { align: 'center', shadow: '#000' });
      if (Math.floor(game.time * 2) % 2) E.font.text(g, 'PRESS ' + game.input.label('confirm') + ' TO FLY', WP.W / 2, 236, '#ffffff', { align: 'center', shadow: '#000' });
    });
  },
};
const px_line = (g, x0, y0, x1, y1, c) => E.px.line(g, x0, y0, x1, y1, c, 2);

// a cutscene: a few lines of the radio and the cell, a card each, in the source's terse voice
const CUTS = {
  interrogation: ['A SOLDIER IS TIED TO A CHAIR IN THE CAMP WIRE SHACK.', 'HE GIVES UP THE KENNEL: THE WORKERS ARE THERE, NORTH OF THE MANGROVES.', 'THE PACK HAS A NAME FOR IT NOW. THE KENNEL.'],
  briefing: ['GENERAL KRAGG HAS SEIZED THE BRIMSTONE COAST. FIVE WORKERS ARE IN HIS HANDS.', 'NO ARMY WILL GO IN. THE PACK IS GOING IN. SIX OPERATIONS, ONE WAY OUT.', 'FIRST: THE RADIO HILL. KILL THE TRANSMITTER BEFORE HE TALKS TO HIS FRIENDS.'],
  takeoff: ['THE WORKERS ARE ALL ABOARD THE CARGO PLANE. THE GUNSHIP IS ON THE TAIL.', 'THE PILOT HAS ONE RUNWAY AND ONE CHANCE. SHOOT WHAT IS SHOOTABLE.', 'WHEELS UP IN THE STORM. HOLD ON.'],
  kennel: ['THE KENNEL IS QUIET. THE GUARDS ARE IN THE MUD, AND THE PENS ARE OPEN.', 'FIVE WORKERS ARE ON THE TRUCK, MUDDY AND ALIVE. THE PACK IS HOME ON THE STRIP.', 'THE LAST PLANE IS WARMING UP. MAJOR TUSK IS NOT GOING TO LET IT GO.'],
};
const cut = {
  enter(data) { cut.id = (data && data.id) || 'interrogation'; cut.lines = CUTS[cut.id] || []; cut.i = 0; cut.t = 0; cut.next = (data && data.next) || 'map'; cut.nextData = (data && data.nextData) || null; },
  update(dt) {
    cut.t += dt;
    if (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked() || cut.t > 9) {
      if (++cut.i >= cut.lines.length) game.go(cut.next, cut.nextData, { fade: 'wipe', seconds: 0.4 });
      else cut.t = 0;
    }
  },
  draw(r) {
    r.sky(['#05040a', '#1a1428']);
    r.overlay(g => {
      E.ui.box(g, 40, 70, WP.W - 80, 110, { bg: ['#140f22', '#0a0712'], border: '#5a4a8a' });
      E.font.text(g, cut.lines[cut.i] || '', WP.W / 2, 96, '#f4f0ff', { align: 'center', wrap: WP.W - 120, shadow: '#000' });
      E.font.text(g, (cut.i + 1) + ' / ' + cut.lines.length, WP.W - 50, 160, '#8a7ca8', { shadow: '#000' });
      if (cut.t > 0.6 && Math.floor(game.time * 2) % 2) E.font.text(g, 'PRESS ' + game.input.label('confirm'), WP.W / 2, 236, '#ffffff', { align: 'center', shadow: '#000' });
    });
  },
};

const lost = {
  enter(data) { lost.op = data.op; lost.m = menuOf(['TRY AGAIN', 'TITLE']); lost.t = 0; },
  update(dt) {
    lost.t += dt;
    if (lost.t < 0.8) return;
    const pick = menuUpdate(lost.m, game.input);
    if (pick === 0) { run.carry = JSON.parse(JSON.stringify(run.opStart)); game.go('card', { op: lost.op }, { fade: 'wipe', seconds: 0.4 }); }
    else if (pick === 1) game.go('title');
  },
  draw(r) {
    sky(r);
    r.overlay(g => {
      E.font.title(g, 'DOWN', WP.W / 2, 60, { scale: 4, align: 'center', colors: ['#ff8a6a', '#8a2a1a'] });
      E.font.text(g, 'THE PACK IS CALLING YOU BACK.', WP.W / 2, 116, '#f4f0ff', { align: 'center', shadow: '#000' });
      menuDraw(g, lost.m, 200, 160, 20);
    });
  },
};

const scores = {
  update() { if (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start') || game.input.clicked()) game.go('title'); },
  draw(r) {
    sky(r);
    r.overlay(g => {
      WP.arcade.drawTable(r, '', 36, 'HIGH SCORES');
      E.font.text(g, 'PRESS ' + game.input.label('confirm') + ' TO GO BACK', WP.W / 2, 252, '#8a7ca8', { align: 'center', shadow: '#000' });
    });
  },
};

// the About and Credits screen: the lines, then the feedback sections, a page at a time
const about = {
  enter(data) { about.back = (data && data.back) || 'title'; about.lines = WP.CREDITS; about.top = 0; },
  update() {
    const I = game.input, max = Math.max(0, about.lines.length - 19);
    if (I.pressed('down')) about.top = Math.min(max, about.top + 1);
    if (I.pressed('up')) about.top = Math.max(0, about.top - 1);
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('start') || I.clicked()) game.go(about.back);
  },
  draw(r) {
    sky(r);
    r.overlay(g => {
      E.ui.box(g, 8, 8, WP.W - 16, WP.H - 16, { bg: ['#140f22', '#0a0712'], border: '#5a4a8a', alpha: 0.9 });
      about.lines.slice(about.top, about.top + 19).forEach((l, i) => E.font.text(g, l.replace(/^#/, ''), 16, 16 + i * 12, l.startsWith('#') ? '#ffe060' : '#e8e0ff', { shadow: '#000', font: 'tiny' }));
      E.font.text(g, 'UP DOWN SCROLL   ' + game.input.label('confirm') + ' BACK', WP.W / 2, 252, '#8a7ca8', { align: 'center', shadow: '#000' });
    });
  },
};

// back from the dev screen: to the battle it came from (resumed, not restarted), or to the title
const leaveDev = () => (dev.back === 'play' ? game.go('play', { resume: true }, { fade: 0 }) : game.go(dev.back));
// the dev screen: the live sliders (the balance numbers), the toggles, and the buttons. It is reached from the pause menu.
const dev = {
  enter(data) {
    dev.back = (data && data.back) || 'title';
    dev.sel = 0;
    dev.rows = [
      ...WP.TUNING_SPEC.map(s => ({ kind: 'slider', key: s[0], label: s[1], spec: s, hint: s[6] })),
      { kind: 'toggle', key: 'god', label: 'Invulnerable', hint: 'the damage meter stays where it is' },
      { kind: 'toggle', key: 'infinite', label: 'Infinite ammo', hint: 'magazines never run dry' },
      { kind: 'select', key: 'difficulty', label: 'Difficulty', hint: 'Recruit, Veteran or Arcade; applies to the next battle' },
      { kind: 'action', key: 'skip', label: 'Skip to the boss', hint: 'ends the rail here, with the quota met' },
      { kind: 'action', key: 'reset', label: 'Reset to defaults', hint: 'every slider and toggle back to its default' },
      { kind: 'action', key: 'back', label: 'Back', hint: '' },
    ];
    dev.ops = dev.ops || { god: false, infinite: false };
  },
  update(dt) {
    const I = game.input, rows = dev.rows;
    if (I.pressed('up')) dev.sel = (dev.sel + rows.length - 1) % rows.length;
    if (I.pressed('down')) dev.sel = (dev.sel + 1) % rows.length;
    const row = rows[dev.sel];
    const dir = (I.pressed('right') ? 1 : 0) - (I.pressed('left') ? 1 : 0);
    if (row.kind === 'slider' && dir) {
      const [k, , , min, max, step] = row.spec;
      WP.T[k] = clamp(Math.round((WP.T[k] + dir * step) / step) * step, min, max);
    }
    if (row.kind === 'toggle' && (dir || I.pressed('confirm'))) dev.ops[row.key] = !dev.ops[row.key];
    if (row.kind === 'select' && (dir || I.pressed('confirm'))) {
      const order = ['recruit', 'veteran', 'arcade'], cur = game.settings.difficulty || 'veteran';
      game.settings.set('difficulty', order[(order.indexOf(cur) + (dir || 1) + 3) % 3]);
    }
    if (row.kind === 'action' && I.pressed('confirm')) {
      if (row.key === 'reset') { WP.resetTuning(); dev.ops = { god: false, infinite: false }; }
      if (row.key === 'skip' && battle) battle.skipToBoss();
      if (row.key === 'back') leaveDev();
    }
    if (battle) { battle.god = dev.ops.god; battle.infinite = dev.ops.infinite; }
    if (I.pressed('cancel')) leaveDev();
  },
  draw(r) {
    sky(r);
    r.overlay(g => {
      E.ui.box(g, 8, 8, WP.W - 16, WP.H - 16, { bg: ['#140f22', '#0a0712'], border: '#5a4a8a', alpha: 0.92 });
      E.font.text(g, 'DEV MODE: LIVE BALANCE', 16, 14, '#ffe060', { shadow: '#000' });
      dev.rows.forEach((row, i) => {
        const y = 24 + i * 11, on = i === dev.sel;
        const label = (on ? '> ' : '  ') + row.label;
        E.font.text(g, label, 16, y, on ? '#ffffff' : '#c8c0e8', { shadow: '#000' });
        let val = '';
        if (row.kind === 'slider') {
          const v = WP.T[row.key], [, , , min, max] = row.spec;
          val = row.spec[5] < 1 ? v.toFixed(1) : String(v);
          box(g, 220, y + 2, 180, 5, '#2a2430');
          box(g, 220, y + 2, 180 * clamp((v - min) / (max - min), 0, 1), 5, on ? '#ffe060' : '#8a7ca8');
        }
        else if (row.kind === 'toggle') val = dev.ops[row.key] ? 'ON' : 'OFF';
        else if (row.kind === 'select') val = (WP.DIFF[game.settings.difficulty || 'veteran'] || WP.DIFF.veteran).label;
        E.font.text(g, val, 408, y, '#ffffff', { shadow: '#000', align: 'right' });
      });
      const hint = dev.rows[dev.sel].hint;
      if (hint) E.font.text(g, hint, 16, 246, '#8a7ca8', { shadow: '#000' });
    });
  },
};
// the scenes are handed to 99-main.js, which starts the game once every file has loaded
WP.game = game;
WP.scenes = { title, attract, card, play, tally, map, cut, ending, initials, lost, scores, about, dev };
WP.newRun = newRun;
WP.battle = () => battle;
WP.debugHandle = {
  snapshot: () => ({
    scene: game.sceneName, run: run && { op: run.op, carry: run.carry }, captions: captions.length,
    battle: battle && battle.snapshot(), touchOnly: touchOnly(), tuning: Object.assign({}, WP.T),
  }),
  start: (op, o = {}) => { if (!run) newRun(); run.seed = o.seed === undefined ? run.seed : o.seed; run.carry = o.carry || run.carry; run.opStart = JSON.parse(JSON.stringify(run.carry)); game.go('card', { op }, { fade: 0 }); },
  battle: () => battle,
  override: fn => { WP.override = fn; },
  tune: (k, v) => { WP.T[k] = v; },
  dev: () => { game.go('dev', { back: 'play' }, { fade: 0 }); },
  reset: () => WP.resetTuning(),
};
})();
