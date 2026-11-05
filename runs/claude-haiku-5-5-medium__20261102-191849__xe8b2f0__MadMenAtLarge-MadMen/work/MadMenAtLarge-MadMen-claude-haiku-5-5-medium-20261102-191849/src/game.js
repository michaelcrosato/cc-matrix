/* Mad Men at Large: the engine side. Scenes: session (AI Hub only), title (with the attract demo after 10 s),
 * office (the workday; also the demo), pitch (the boardroom), summary, end, about. The rules are in logic.js (window.MM);
 * the credits are in credits.js (window.MM_CREDITS). Controls are the THIRDPERSON preset: WASD or the stick to walk,
 * E or Y to talk, use, drink or go, Q or LT to smoke, Enter, Space or A to pitch.
 */
(() => {
const E = My3D2dge;
const MM = window.MM;
const CREDITS = window.MM_CREDITS;
const hub = window.AIHub;
const rnd = () => (hub && hub.active && hub.rng) ? hub.rng('deal')() : Math.random();

const game = new E.Game({ canvas: 'screen', res: 'snes', expand: true, view: 'threequarter', views: ['threequarter'],
  input: 'THIRDPERSON',
  menu: { controls: { jump: false, attack: false, sprint: false, crouch: false, block: false, dodge: false, map: false,
    interact: 'Talk, pour, go', use: 'Smoke' } } });
const ui = new E.Shell(game);
game.input.touchEnabled = false;          // no touch controls: a touch-only device is told a controller or keyboard is needed

// the settings the Controller screen shows: the stick's inversion (a common fault on some pads) and the button symbols
game.settings.define({ key: 'mmInvertX', label: 'Invert stick left and right', type: 'toggle', value: false, group: 'Controller' });
game.settings.define({ key: 'mmInvertY', label: 'Invert stick up and down', type: 'toggle', value: false, group: 'Controller' });
game.settings.define({ key: 'mmSymbols', label: 'Button symbols', type: 'select', value: 'playstation', group: 'Controller',
  options: [['playstation', 'PlayStation'], ['xbox', 'Xbox (A B X Y)']], apply(g, v) { g.input.glyphs = v; } });

/* ---------- the office: a map built from rows, so the floor plan reads in the source ---------- */
const W = 30, H = 20;
function buildRows() {
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('#'));
  const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  rect(1, 1, 6, 13, 'k');            // the lobby: linoleum
  rect(8, 1, 18, 12, '.');           // the bullpen: carpet
  rect(20, 1, 28, 6, 'w');           // the partners' corner: wood
  rect(20, 8, 28, 12, 'B');          // the boardroom: walnut
  rect(1, 15, 28, 18, 'l');          // the lounge: red carpet
  rect(4, 14, 4, 14, '.');           // lobby to lounge
  rect(12, 13, 12, 14, '.');         // bullpen to lounge
  rect(7, 4, 7, 4, '.');             // lobby to bullpen
  rect(19, 3, 19, 3, '.');           // bullpen to the partners' corner
  g[10][19] = 'D';                   // the boardroom door
  rect(9, 3, 10, 3, 'd'); rect(13, 3, 14, 3, 'd'); rect(17, 3, 18, 3, 'd');
  rect(9, 7, 10, 7, 'd'); rect(13, 7, 14, 7, 'd'); rect(17, 7, 18, 7, 'd');
  rect(9, 10, 10, 10, 'd'); rect(13, 10, 14, 10, 'd');
  rect(2, 6, 3, 6, 'd');             // the reception desk
  rect(22, 2, 25, 2, 'd');           // the partner's desk
  rect(21, 10, 27, 10, 'd');         // the boardroom table
  rect(13, 16, 19, 16, 'b');         // the bar counter
  rect(25, 16, 26, 17, 'p');         // the telephone booth
  g[2][1] = 'E'; g[2][2] = 'H';      // the elevator, and where you start
  g[5][11] = 'V'; g[5][15] = 'T'; g[4][23] = 'G'; g[4][4] = 'M';   // Vera, Teddy, Gil, Marian
  g[11][15] = 'C';                   // the cigarette case
  g[15][16] = 'Q';                   // the bar
  g[16][24] = 'P';                   // the telephone
  return g.map(r => r.join(''));
}
const MAP_ROWS = buildRows();
const map = new E.TileMap({
  rows: MAP_ROWS,
  legend: { '#': 1, '.': { floor: 'carpet' }, k: { floor: 'lino' }, w: { floor: 'wood' }, B: { floor: 'board' },
    l: { floor: 'lounge' }, d: 2, b: 3, p: 4,
    E: { floor: 'lino', spawn: 'elevator' }, H: { floor: 'lino', spawn: 'hero' }, V: { floor: 'carpet', spawn: 'vera' },
    T: { floor: 'carpet', spawn: 'teddy' }, G: { floor: 'wood', spawn: 'gil' }, M: { floor: 'lino', spawn: 'marian' },
    C: { floor: 'carpet', spawn: 'cigs' }, Q: { floor: 'lounge', spawn: 'bar' }, P: { floor: 'lounge', spawn: 'phone' },
    D: { floor: 'wood', spawn: 'boardroom' } },
  types: {
    1: { h: 44, top: '#d8cfc0', side: '#9d927e', face: 'plaster', roof: 'slab', cut: true },
    2: { h: 9, top: '#7a4a2a', side: '#4e2d18' },
    3: { h: 16, top: '#3a1e12', side: '#24120a' },
    4: { h: 34, top: '#1e3a3a', side: '#14302e', face: 'plank' }
  },
  floorTex(x, y, tag) {
    const alt = (x + y) & 1;
    switch (tag) {
      case 'carpet': { const k = ((x * 7 + y * 3) % 6 === 0) ? 8 : 0; return alt ? [48 + k, 80 + k, 70 + k] : [42 + k, 72 + k, 62 + k]; }
      case 'lino': return alt ? [206, 198, 178] : [184, 176, 158];
      case 'wood': { const s = ((x * 5 + Math.floor(y / 2) * 3) % 4 === 0) ? -18 : 0; return [128 + s, 84 + s, 52 + s]; }
      case 'board': return [84 + ((x + y) % 3 === 0 ? 6 : 0), 50, 34];
      case 'lounge': return alt ? [98, 32, 40] : [90, 28, 36];
      default: return [60, 60, 60];
    }
  }
});
const PROPS = [['lamp', 9, 5], ['lamp', 16, 9], ['lamp', 27, 1], ['pot', 1, 18], ['pot', 28, 18], ['chandelier', 24, 9, 36]];
const MARK = E.sprite(['.y.', '.y.', '.y.', '...', '.y.'], { y: '#ffe080' }, 2);
const SPOT_SPAWN = { elevator: 'elevator', hero: 'hero', vera: 'vera', teddy: 'teddy', gil: 'gil', marian: 'marian', cigs: 'cigs', bar: 'bar', phone: 'phone', boardroom: 'boardroom' };

// the people: Humanoid rigs, dressed for 1963
const rigs = {
  hero: new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short',
    colors: { skin: '#e4bf9a', hair: '#2a2420', cloth: '#2c3440', coat: '#2c3440', pants: '#20262e', trim: '#dcdcdc', belt: '#1a1a1a' } }),
  teddy: new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short',
    colors: { skin: '#f0cfae', hair: '#6a4a30', cloth: '#4a5a78', coat: '#4a5a78', pants: '#343c50', trim: '#c02020', belt: '#101010' } }),
  gil: new E.Humanoid({ size: 1.25, build: 'bulky', weapon: null, outfit: 'coat', hair: 'short', hat: 'band',
    colors: { skin: '#d9ad88', hair: '#c8c4b8', cloth: '#3a3026', coat: '#3a3026', pants: '#2a221c', trim: '#c9a040', belt: '#120e0a' } }),
  vera: new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'tunic', hair: 'long', sleeves: 'long',
    colors: { skin: '#f2d2b6', hair: '#6a3a22', cloth: '#8a3a4a', coat: '#8a3a4a', pants: '#5a2430', trim: '#e0c890', belt: '#202020' } }),
  marian: new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'tunic', hair: 'ponytail',
    colors: { skin: '#e8c4a4', hair: '#c8a040', cloth: '#2a6a6a', coat: '#2a6a6a', pants: '#1e4a4a', trim: '#f0f0e0', belt: '#101010' } }),
  client: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'short', hat: 'band',
    colors: { skin: '#e6b890', hair: '#3a3a3a', cloth: '#3a4a3a', coat: '#3a4a3a', pants: '#283228', trim: '#d0c0a0', belt: '#101010' } })
};
const NPC_OF = { teddy: 'teddy', gil: 'gil', vera: 'vera', marian: 'marian' };

/* ---------- state and helpers ---------- */
let S = null;            // the rules state (logic.js)
let frozen = false;      // an AI Hub round has ended: no input, no sound
let demoMode = false;    // attract mode: the office plays itself
let demoTimer = 0, demoGoal = null, demoAdvance = 0;
let hubResult = null, lastProgress = -99, hubInfo = null, hubJoined = null;
let idle = 0, summaryTimer = 0, pitchState = null;
const talk = new E.Dialog(game);
let hero, npcs = {}, spots = {}, flow;

function roundStarted() { return !(hub && hub.active) || hub.time() >= 0; }

function showToast(title, text) { ui.toast(title, text, 3.5); }
function fx(text, color) { if (hero) game.particles.text(hero.x, hero.y, 26, text, color, { scale: 1, bounce: true }); }

function placeFromMap() {
  const at = tag => map.find(tag);
  const h = at('hero');
  hero = hero || new E.Body({ x: h.x, y: h.y, r: 5 });
  hero.x = h.x; hero.y = h.y; hero.vx = 0; hero.vy = 0; hero.facing = 0;
  for (const id of ['teddy', 'gil', 'vera', 'marian']) {
    const p = at(id);
    npcs[id] = { id, x: p.x, y: p.y, z: 0, rig: rigs[id], facing: Math.PI };
  }
  spots = {
    elevator: at('elevator'), bar: at('bar'), cigs: at('cigs'), phone: at('phone'), boardroom: at('boardroom')
  };
  flow = flow || new E.FlowField(map);
}

// everything the player can act on right now, by distance
function currentSpots() {
  const out = [];
  const day = S.day;
  for (const id of MM.encountersToday(S)) {
    const enc = MM.ENCOUNTERS[id];
    out.push({ kind: 'talk', enc: id, x: npcs[enc.npc].x, y: npcs[enc.npc].y, label: 'Talk to ' + enc.name, enabled: true, npc: enc.npc });
  }
  out.push({ kind: 'drink', x: spots.bar.x, y: spots.bar.y, label: 'Pour a bourbon', enabled: true });
  out.push({ kind: 'refill', x: spots.cigs.x, y: spots.cigs.y, label: S.cigRefilled && S.cigRefilled[day] ? 'Cigarette case, empty' : 'Take a pack from the case',
    enabled: !(S.cigRefilled && S.cigRefilled[day]) });
  out.push({ kind: 'home', x: spots.phone.x, y: spots.phone.y, label: S.homeCalls[day] ? 'The line is busy' : 'Call home',
    enabled: !S.homeCalls[day] });
  if (MM.meetingCalled(S) && !MM.pitchDone(S)) out.push({ kind: 'pitch', x: spots.boardroom.x, y: spots.boardroom.y, label: 'Go in to ' + MM.CLIENTS[MM.dayDef(S).client].brand, enabled: true });
  out.push({ kind: 'leave', x: spots.elevator.x, y: spots.elevator.y, label: MM.canLeave(S) ? 'Take the elevator home' : 'Not until the client has seen the work',
    enabled: MM.canLeave(S) });
  return out;
}
function nearest(list, x, y, range) {
  let best = null, bd = range;
  for (const s of list) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function openEncounter(id) {
  const enc = MM.ENCOUNTERS[id];
  const rig = rigs[enc.npc];
  talk.say(enc.lines, { name: enc.name, portrait: rig, choices: enc.choices.map(c => c.label),
    onChoice: i => {
      const reply = MM.chooseEncounter(S, id, i);
      if (reply) talk.say(reply, { name: enc.name, portrait: rig });
      showToast(enc.name, enc.choices[i].label);
    } });
}

function doAction(s) {
  if (!s) return;
  if (s.kind === 'talk') return openEncounter(s.enc);
  if (s.kind === 'drink') {
    const tier = MM.drink(S);
    fx('+BOURBON', '#e0b060');
    if (tier === 'blurry') showToast('Bourbon', 'The room has gone soft at the edges.');
    else if (tier === 'tipsy') showToast('Bourbon', 'A little warmer than you planned.');
    else showToast('Bourbon', 'Composure is back. Whiskey is a line item.');
    return;
  }
  if (s.kind === 'refill') {
    if (MM.refillCigs(S)) showToast('Cigarette case', 'Two more in the pack. Four days of work in them.');
    else showToast('Cigarette case', 'Empty until tomorrow.');
    return;
  }
  if (s.kind === 'home') {
    if (MM.callHome(S)) showToast('Home', 'The line crackles. Someone asks when you will be back.');
    return;
  }
  if (s.kind === 'pitch') return enterPitch();
  if (s.kind === 'leave') return endOfDay();
}

function smokeNow() {
  if (MM.smoke(S)) fx('+COMPOSURE', '#9ad8ff');
  else showToast('Cigarettes', 'The case is empty. Try the case by the bullpen.');
}

function enterPitch() {
  if (!MM.meetingCalled(S) || MM.pitchDone(S)) return;
  game.go('pitch', { day: S.day, demo: demoMode });
}

function endOfDay() {
  const missed = MM.pitchDone(S) ? null : MM.missPitch(S);
  game.go('summary', { day: S.day, demo: demoMode, result: missed }, { fade: 'iris', at: hero });
}

function demoOpt() { return {}; }

/* ---------- AI Hub: report progress, and the result once ---------- */
function reportProgress() {
  if (!(hub && hub.active) || !S || frozen || hubResult) return;
  if (hub.time() - lastProgress < 1) return;
  lastProgress = hub.time();
  hub.progress({ score: MM.score(S), label: 'Day ' + S.day + ' • ' + S.accounts.length + ' of 3 accounts' });
}
function reportResult() {
  if (!(hub && hub.active) || !S || hubResult) return;
  hubResult = { score: MM.score(S) };
  hub.result({ score: MM.score(S), stats: { Accounts: S.accounts.length, Standing: Math.round(S.standing), Home: Math.round(S.home) } });
}

/* ---------- the demo's brain: walk to whatever the day needs next, and talk, pitch and leave on its own ---------- */
function demoBrain(dt) {
  S.composure = Math.max(S.composure, 82);      // cheats: steady hands, a pack in the case
  S.cigs = Math.max(S.cigs, 2);
  if (talk.open) {
    demoTimer += dt;
    if (talk.choices) { if (demoTimer > 0.9) { demoTimer = 0; talk.onChoice(0); } }
    else if (demoTimer > 0.8) { demoTimer = 0; game.input.tap('confirm'); }
    return null;
  }
  const list = currentSpots();
  let goal = null;
  // the client comes first once the meeting is called; before it, the day's talks, a drink and a call home
  const talkable = list.find(s => s.kind === 'talk');
  if (MM.meetingCalled(S) && !MM.pitchDone(S)) goal = list.find(s => s.kind === 'pitch');
  else if (MM.canLeave(S)) goal = list.find(s => s.kind === 'leave');
  else if (talkable) goal = talkable;
  else if (!S.drinks) goal = list.find(s => s.kind === 'drink');
  else if (!S.homeCalls[S.day]) goal = list.find(s => s.kind === 'home' && s.enabled);
  else goal = list.find(s => s.kind === 'drink');
  demoGoal = goal;
  if (!goal) return null;
  const d = Math.hypot(goal.x - hero.x, goal.y - hero.y);
  if (d < 16) {
    demoAdvance += dt;
    if (demoAdvance > 0.4) { demoAdvance = 0; doAction(goal); }
    hero.vx = 0; hero.vy = 0;
    return goal;
  }
  demoAdvance = 0;
  const dir = flow.dir(hero.x, hero.y, goal.x, goal.y);
  hero.vx = dir[0] * 80; hero.vy = dir[1] * 80;
  if (Math.hypot(dir[0], dir[1]) > .1) hero.facing = Math.atan2(dir[1], dir[0]);
  return goal;
}

/* ---------- scenes ---------- */
let titleMenu = null;
// the engine starts out saying the last device was the keyboard, so a touch-only phone needs its own record of keys and pads
let keyUsed = false, padUsed = false;
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { keyUsed = true; });
  addEventListener('gamepadconnected', () => { padUsed = true; });
}
const title = {
  enter() {
    S = null; idle = 0; frozen = false; demoMode = false;
    game.lights.enabled = false;
    game.focus(0, 0, 0);
    titleMenu = new E.Menu(game, ['NEW ASSIGNMENT', 'ABOUT AND CREDITS', 'SETTINGS'], {
      x: 'center', y: Math.round(game.H * 0.6),
      onPick: i => {
        if (i === 0) game.go('office', { fresh: true });
        else if (i === 1) game.go('about', { from: 'title' });
        else game.menu('settings');
      }
    });
    game.audio.music(null);
  },
  update(dt) {
    const I = game.input;
    const moved = I.move().some(v => Math.abs(v) > .1);
    if (I.anyPressed() || moved) idle = 0; else idle += dt;
    if (idle > 10) return game.go('office', { demo: true }, { fade: 'dissolve' });
    titleMenu.update(dt);
  },
  draw(r) {
    r.sky(['#1a140e', '#3a2a1e', '#0f0a08']);
    const m = Math.round(r.H / 2);
    r.overlay(g => {
      E.font.title(g, 'MAD MEN', r.W / 2, m - 96, { scale: 3, align: 'center', colors: ['#fff6e0', '#e8c890', '#b07a40'], outline: '#1a0c08' });
      E.font.title(g, 'AT LARGE', r.W / 2, m - 56, { scale: 2, align: 'center', colors: ['#fff6e0', '#e8c890', '#b07a40'], outline: '#1a0c08' });
    });
    r.text('A WORKWEEK ON MADISON AVENUE, 1963', r.W / 2, m - 14, '#d8c8a8', { align: 'center', shadow: '#000' });
    titleMenu.draw(r);
    const touchOnly = MM.touchOnly({ maxTouchPoints: navigator.maxTouchPoints || 0,
      finePointer: matchMedia('(any-pointer: fine)').matches,
      lastDevice: keyUsed ? 'keyboard' : (padUsed || game.input.lastDevice === 'gamepad') ? 'gamepad' : 'touch' });
    if (touchOnly) r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 28, '#ffb060', { align: 'center', shadow: '#000' });
    else r.text(('PRESS ' + game.input.label('confirm') + ' • ' + game.input.label('interact') + ' TO TALK').toUpperCase(), r.W / 2, r.H - 22, '#e8dcc0', { align: 'center', shadow: '#000' });
  }
};

const session = {
  enter() {
    frozen = false;
    hubJoined = null;
    hub.on('end', () => { frozen = true; game.audio.music(null); });
    hub.on('time-up', () => { if (S) reportResult(); });
    hub.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
      if (!info) { hubJoined = 'none'; return; }
      hubInfo = info; hubJoined = 'ready';
      hub.ready();
    });
  },
  update() {
    if (hubJoined === 'none') return game.go('title', null, { fade: 0 });
    if (hubJoined === 'ready') return game.go('office', { fresh: true }, { fade: 0 });
  },
  draw(r) {
    r.sky(['#1a140e', '#3a2a1e', '#0f0a08']);
    r.text('JOINING THE ROUND', r.W / 2, Math.round(r.H / 2), '#e8dcc0', { align: 'center', shadow: '#000' });
  }
};

const office = {
  pausable: !(hub && hub.active),
  enter(data) {
    data = data || {};
    demoMode = !!data.demo;
    if (data.fresh || !S || demoMode) {
      S = MM.newState({ demo: demoMode });
      MM.beginDay(S, 1);
    } else if (data.day) {
      MM.beginDay(S, data.day);
    }
    frozen = false;
    placeFromMap();
    talk.close();
    game.follow(hero, { z: 16 });
    game.cam.bounds = v => map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .6;
    demoTimer = 0; demoAdvance = 0; demoGoal = null; lastProgress = -99;
    if (!demoMode) showToast('Day ' + S.day + ' • ' + MM.dayDef(S).name, 'The Starbrite meeting is in the afternoon. Learn the room.');
    if (demoMode) showToast('Attract mode', 'Press any button to play');
  },
  exit() { talk.close(); game.lights.enabled = false; ui.hud({}); },
  update(dt) {
    if (frozen) return;
    const I = game.input;
    if (demoMode && I.anyPressed()) return game.go('title', null, { fade: 'dissolve' });
    if (!roundStarted()) return;                            // AI Hub: the countdown is running
    if (demoMode) demoBrain(dt); else if (!talk.open) playerMove(dt);
    if (talk.update(dt)) return;                            // a dialog box is open: play waits
    if (!demoMode) {
      if (I.pressed('interact')) { const s = nearest(currentSpots(), hero.x, hero.y, 24); if (s) doAction(s); }
      if (I.pressed('use')) smokeNow();
    }
    if (MM.dayOver(S)) return endOfDay();
    MM.tick(S, dt);
    if (MM.meetingCalled(S) && !S.flags['meet' + S.day]) { S.flags['meet' + S.day] = true; showToast('Meeting called', 'Boardroom, now. ' + MM.CLIENTS[MM.dayDef(S).client].brand + ' is waiting.'); }
    reportProgress();
    updateHud();
  },
  draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const [name, cx, cy, z] of PROPS) {
      const c = map.center(cx, cy);
      r.prop(name, c.x, c.y, z || 0, { light: true, size: 1.2 });
    }
    const bob = Math.sin(game.time * 4) * 2;
    for (const id of MM.encountersToday(S)) {
      const n = npcs[MM.ENCOUNTERS[id].npc];
      r.sprite(n.x, n.y, 46 + bob, MARK, { glow: .8 });
    }
    if (!demoMode && !MM.pitchDone(S) && MM.meetingCalled(S)) r.sprite(spots.boardroom.x, spots.boardroom.y, 46 + bob, MARK, { glow: .8 });
    const actors = [[hero, rigs.hero, true]];
    for (const id of Object.keys(npcs)) actors.push([npcs[id], npcs[id].rig, false]);
    for (const [b, rig, isHero] of actors) {
      r.shadow(b.x, b.y, 7, .35, undefined, b.groundZ || 0);
      r.actor(b.x, b.y, b.z || 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    }
    if (!roundStarted()) r.text('WAITING FOR THE ROUND TO START', r.W / 2, 8, '#ffe0a0', { align: 'center', shadow: '#000' });
    talk.draw(r);
  }
};

function playerMove(dt) {
  const I = game.input;
  let m = I.move();
  let mx = game.settings.mmInvertX ? -m[0] : m[0];
  let my = game.settings.mmInvertY ? -m[1] : m[1];
  const d = game.view.screenDirToGround(mx, my);
  hero.vx = d[0] * 80; hero.vy = d[1] * 80;
  hero.update(dt, map);
  if (Math.hypot(d[0], d[1]) > .1) hero.facing = Math.atan2(d[1], d[0]);
  for (const id of Object.keys(npcs)) {
    const n = npcs[id];
    const dd = Math.hypot(hero.x - n.x, hero.y - n.y);
    if (dd < 60) n.facing = Math.atan2(hero.y - n.y, hero.x - n.x);
  }
}

function updateHud() {
  const near = nearest(currentSpots(), hero.x, hero.y, 24);
  const day = MM.dayDef(S);
  const meeting = MM.meetingCalled(S);
  const objective = MM.pitchDone(S) ? { title: S.day + ' • ' + day.name, text: 'Done with the client. Go home when you like.' }
    : meeting ? { title: S.day + ' • ' + day.name, text: 'The meeting is called. The boardroom is down the corridor.' }
    : { title: S.day + ' • ' + day.name, text: 'Work the room until the meeting is called.' };
  ui.hud({
    objective,
    status: { text: MM.clockLabel(S), color: '#e8dcc0' },
    bars: [
      { label: 'Composure', value: S.composure, max: 100, color: '#7ad06a' },
      { label: 'Whiskey', value: S.whiskey, max: 100, color: S.whiskey > MM.BLURRY_AT ? '#ff6040' : '#d9a050' },
      { label: 'Standing', value: S.standing, max: 100, color: '#b0a0e0' }
    ],
    counts: [['Cigarettes', S.cigs], ['Accounts', S.accounts.length + ' of 3']],
    prompt: near && near.enabled !== false ? { act: 'interact', label: near.label } : null,
    keys: [[game.input.label('left') + game.input.label('up') + game.input.label('down') + game.input.label('right'), 'Walk'],
      [game.input.label('use'), 'Smoke']]
  });
}

const pitch = {
  pausable: false,
  enter(data) {
    const day = (data && data.day) || S.day;
    const client = MM.CLIENTS[MM.dayDef(S).client];
    pitchState = { client, phase: 'intro', beat: 0, scores: [], timer: 0, centers: MM.makeCenters(rnd), needle: { p: 0, dir: 1 },
      demo: demoMode || !!(data && data.demo), flash: null, day };
    ui.hud({});
    game.lights.enabled = false;
    talk.say(client.brief.split('. ').concat(['Show us what you have.']), { name: client.rep, portrait: rigs.client,
      onDone: () => { pitchState.phase = 'beat'; } });
  },
  exit() { talk.close(); },
  update(dt) {
    const P = pitchState;
    if (!P) return;
    if (P.demo) {
      P.demoTap = (P.demoTap || 0) + dt;
      if (talk.open && P.demoTap > .8) { P.demoTap = 0; if (!talk.choices) game.input.tap('confirm'); }
    }
    if (talk.update(dt)) return;
    if (P.phase === 'beat') {
      const period = MM.needlePeriod(S);
      const st = MM.stepNeedle(P.needle.p, P.needle.dir, dt, period);
      P.needle = st;
      const hw = MM.beatHalfWidth(S, P.beat);
      const c = P.centers[P.beat];
      let press = game.input.pressed('confirm') || game.input.clicked();
      if (P.demo) press = MM.aiShouldPress(P.needle.p, c, hw);
      if (press) {
        const sc = MM.beatScore(P.needle.p, c, hw);
        P.scores.push(sc);
        P.flash = { text: String(sc), t: 0, color: sc >= 3 ? '#ffe080' : sc > 0 ? '#e8dcc0' : '#ff7060' };
        P.phase = 'flash'; P.timer = 0;
        game.audio.sfx(sc > 0 ? 'select' : 'cancel');
      }
    } else if (P.phase === 'flash') {
      P.timer += dt;
      if (P.timer > .9) {
        P.flash = null;
        P.beat++;
        if (P.beat < 3) { P.phase = 'beat'; P.needle = { p: 0, dir: 1 }; }
        else finishPitch();
      }
    }
  },
  draw(r) {
    const P = pitchState;
    r.sky(['#1a120c', '#2a1c14', '#0c0806']);
    if (!P) return;
    const cw = r.W * .62, cx = (r.W - cw) / 2, by = Math.round(r.H * .66);
    r.overlay(g => {
      // the room: a wall of dark panelling, a framed poster for the client, a wall lamp each side, the long table
      E.px.rect(g, 0, Math.round(r.H * .12), r.W, Math.round(r.H * .46), '#2a1c14');
      for (let x = 0; x < r.W; x += 48) E.px.rect(g, x, Math.round(r.H * .12), 2, Math.round(r.H * .46), '#20140e');
      const pw = Math.round(r.W * .22), px0 = Math.round(r.W / 2 - pw / 2), py0 = Math.round(r.H * .2);
      E.px.rect(g, px0 - 4, py0 - 4, pw + 8, Math.round(r.H * .2) + 8, '#b89050');
      E.px.rect(g, px0, py0, pw, Math.round(r.H * .2), '#a8201c');
      E.px.rect(g, px0 + 8, py0 + 8, pw - 16, 4, '#fff0d0');
      E.px.rect(g, px0 + 8, py0 + 16, Math.round(pw * .6), 4, '#f0c890');
      for (const lx of [Math.round(r.W * .1), Math.round(r.W * .9)]) E.px.disc(g, lx, Math.round(r.H * .16), 5, '#ffd890');
      E.px.rect(g, 0, Math.round(r.H * .58), r.W, Math.round(r.H * .04), '#3a2418');
      E.ui.box(g, cx - 10, by - 42, cw + 20, 118, { bg: ['#2a1c14', '#150e0a'], border: '#c0a060' });
    });
    if (P.phase !== 'intro') {
      const label = P.phase === 'flash' ? '' : 'STOP IT IN THE BAND';
      r.text(MM.BEATS[P.beat] + '  •  ' + label, r.W / 2, by - 28, '#ffe0a0', { align: 'center', shadow: '#000' });
      r.overlay(g => {
        E.px.rect(g, cx, by, cw, 12, '#1a120c');
        const hw = MM.beatHalfWidth(S, P.beat), c = P.centers[P.beat];
        const z0 = Math.round(cx + (c - hw) * cw), z1 = Math.round(cx + (c + hw) * cw);
        E.px.rect(g, z0, by, Math.max(1, z1 - z0), 12, '#3a8a4a');
        E.px.rect(g, Math.round(cx + (c - hw * .4) * cw), by, Math.max(1, Math.round(hw * .8 * cw)), 12, '#7ad06a');
        const nx = Math.round(cx + P.needle.p * cw);
        E.px.rect(g, nx - 1, by - 6, 3, 24, '#fff6e0');
      });
      r.text('scored: ' + P.scores.join(' • '), r.W / 2, by + 26, '#d8c8a8', { align: 'center', shadow: '#000' });
      if (P.phase === 'beat' && !P.demo) r.text('PRESS ' + game.input.label('confirm') + ' OR CLICK', r.W / 2, by + 56, '#e8dcc0', { align: 'center', shadow: '#000' });
    }
    if (P.flash) {
      const f = P.flash; f.t += 1 / 60;
      r.text(f.text, r.W / 2, by - 56, f.color, { align: 'center', scale: 3, shadow: '#000' });
    }
    if (P.phase === 'result') r.text(P.resultLine || '', r.W / 2, by - 56, '#ffe0a0', { align: 'center', scale: 2, shadow: '#000' });
    talk.draw(r);
  }
};

function finishPitch() {
  const P = pitchState;
  const result = MM.pitchResult(S, P.scores);
  MM.recordPitch(S, result);
  P.phase = 'result';
  P.resultLine = result.win ? P.client.brand + ': signed' : 'Not this time';
  const lines = result.win
    ? ['That is the best thing I have seen all year.', P.client.brand + ' is ours. Tell the partners.']
    : ['We will think about it, and we will call you.', 'Thank you for your time. Do not call us.'];
  const day = P.day;
  talk.say(lines, { name: P.client.rep, portrait: rigs.client,
    onDone: () => game.go('summary', { day, demo: P.demo, result }, { fade: 'iris', at: hero }) });
}

let summaryData = null, endingData = null;
const summary = {
  pausable: false,
  enter(data) {
    summaryData = data || {};
    summaryTimer = 0;
    talk.close();
    ui.hud({});
  },
  update(dt) {
    summaryTimer += dt;
    const I = game.input;
    if (summaryData.demo && summaryTimer > 4) return game.go('title', null, { fade: 'dissolve' });
    if (I.pressed('confirm') || I.clicked()) {
      if (!summaryData.demo && S.day < 3) return game.go('office', { day: S.day + 1 }, { fade: 'black' });
      if (!summaryData.demo) return game.go('end', null, { fade: 'black' });
    }
  },
  draw(r) {
    r.sky(['#1a120c', '#2a1c14', '#0c0806']);
    const m = Math.round(r.H / 2);
    const day = MM.dayDef(S);
    r.overlay(g => E.font.title(g, 'DAY ' + S.day + ' CLOSED', r.W / 2, m - 90, { scale: 2, align: 'center', colors: ['#fff6e0', '#e8c890', '#b07a40'], outline: '#1a0c08' }));
    const res = summaryData.result;
    const line = res ? (res.missed ? 'The client did not wait for you.' : res.win ? 'Won: ' + MM.CLIENTS[res.client].brand + '.' : 'Lost: ' + MM.CLIENTS[res.client].brand + '.') : 'No pitch today.';
    r.text(day.name + ' • ' + line, r.W / 2, m - 46, '#e8dcc0', { align: 'center', shadow: '#000' });
    if (res && !res.missed) r.text('Pitch ' + res.effective + ' against the line of ' + res.threshold + '. ' + (res.bonus ? 'Standing and briefings count for ' + res.bonus + '.' : ''), r.W / 2, m - 30, '#d8c8a8', { align: 'center', shadow: '#000' });
    const rows = [['Standing', S.standing, '#b0a0e0'], ['Composure', S.composure, '#7ad06a'], ['Whiskey', S.whiskey, '#d9a050'], ['Home', S.home, '#e0a0a0']];
    rows.forEach(([label, v, color], i) => {
      const y = m - 4 + i * 18;
      r.text(label.toUpperCase(), r.W / 2 - 120, y, '#e8dcc0', { shadow: '#000' });
      r.overlay(g => E.ui.bar(g, r.W / 2 - 20, y + 1, 140, 7, Math.max(0, Math.min(1, v / 100)), color));
    });
    r.text('Log: ' + S.log.slice(-3).join('   •   '), r.W / 2, m + 68, '#a89878', { align: 'center', shadow: '#000' });
    if (!summaryData.demo) r.text('PRESS ' + game.input.label('confirm') + ' TO CONTINUE', r.W / 2, r.H - 26, '#ffffff', { align: 'center', shadow: '#000' });
  }
};

const end = {
  pausable: false,
  enter() {
    frozen = false;
    game.lights.enabled = false;
    ui.hud({});
    game.audio.music(null);
    endingData = MM.ending(S);
    reportResult();
    summaryTimer = 0;
  },
  update(dt) {
    if (frozen) return;
    summaryTimer += dt;
    const I = game.input;
    if (I.pressed('confirm')) game.go('about', { from: 'end' }, { fade: 'black' });
    if (I.pressed('cancel')) game.go('title', null, { fade: 'black' });
  },
  draw(r) {
    const e = endingData || MM.ending(S);
    r.sky(e.wins === 3 && e.id === 'partner' ? ['#103020', '#2a6a48', '#0c1a12'] : ['#2a1410', '#5a2a22', '#120806']);
    const m = Math.round(r.H / 2);
    r.overlay(g => E.font.title(g, e.title.toUpperCase(), r.W / 2, m - 80, { scale: 2, align: 'center', colors: ['#fff6e0', '#e8c890', '#b07a40'], outline: '#1a0c08' }));
    E.font.wrap(e.text, r.W * .8, {}).forEach((line, i) => r.text(line, r.W / 2, m - 36 + i * 11, '#e8dcc0', { align: 'center', shadow: '#000' }));
    if (e.note) r.text(e.note, r.W / 2, m + 2, '#c8b898', { align: 'center', shadow: '#000' });
    r.text('ACCOUNTS ' + e.wins + ' OF 3   •   SCORE ' + e.score, r.W / 2, m + 30, '#ffe0a0', { align: 'center', shadow: '#000' });
    r.text('PRESS ' + game.input.label('confirm') + ' FOR CREDITS   •   ' + game.input.label('cancel') + ' FOR THE TITLE', r.W / 2, r.H - 24, '#ffffff', { align: 'center', shadow: '#000' });
  }
};

let aboutScroll = 0, aboutFrom = 'title', aboutLines = null;
const about = {
  enter(data) { aboutScroll = 0; aboutFrom = (data && data.from) || 'title'; },
  update(dt) {
    const I = game.input;
    const dy = I.move()[1];
    aboutScroll = Math.max(0, aboutScroll + dy * 120 * dt + (I.pressed('down') ? 12 : 0) - (I.pressed('up') ? 12 : 0));
    if (I.pressed('cancel') || I.pressed('confirm')) game.go(aboutFrom === 'end' ? 'end' : 'title', null, { fade: 'black' });
  },
  draw(r) {
    r.sky(['#141010', '#241a14', '#0a0808']);
    if (!aboutLines) aboutLines = CREDITS.lines.flatMap(l => E.font.wrap(l.text, r.W - 24, {}).map(t => ({ text: t, heading: l.heading })));
    const lines = aboutLines;
    const top = 40 - aboutScroll;
    r.overlay(g => E.font.title(g, 'ABOUT AND CREDITS', r.W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6e0', '#e8c890', '#b07a40'], outline: '#1a0c08' }));
    lines.forEach((line, i) => {
      const y = top + i * 11;
      if (y < 30 || y > r.H - 20) return;
      const color = line.heading ? '#ffe0a0' : '#e8dcc0';
      r.text(line.text, 12, y, color, { shadow: '#000' });
    });
    aboutScroll = Math.min(aboutScroll, Math.max(0, lines.length * 11 - (r.H - 60)));
    r.text(game.input.label('cancel') + ' TO GO BACK • ' + game.input.label('up') + ' / ' + game.input.label('down') + ' TO SCROLL', r.W / 2, r.H - 14, '#c8b898', { align: 'center', shadow: '#000' });
  }
};

// the game's frame: pick the first scene by how it was opened
game.start({
  scenes: { session, title, office, pitch, summary, end, about },
  scene: hub && hub.active ? 'session' : 'title'
});

// a handle for tests and tools (the headless test and the page checks read it)
game.debug = {
  snapshot: () => ({ scene: game.sceneName, day: S ? S.day : null, t: S ? Math.round(S.t * 10) / 10 : null,
    hero: hero ? [Math.round(hero.x), Math.round(hero.y)] : null,
    composure: S ? Math.round(S.composure) : null, whiskey: S ? Math.round(S.whiskey) : null,
    standing: S ? Math.round(S.standing) : null, home: S ? Math.round(S.home) : null,
    accounts: S ? S.accounts.slice() : null, talk: talk.open, demo: demoMode, frozen, score: S ? MM.score(S) : null }),
  state: () => S,
  spots: () => currentSpots(),
  teleport(x, y) { if (hero) { hero.x = x; hero.y = y; hero.vx = 0; hero.vy = 0; } },
  nearest: tag => { const p = map.find(tag); return p ? { x: p.x, y: p.y } : null; },
  startDay: () => { S = MM.newState(); MM.beginDay(S, 1); },
  pitchRun: () => pitchState,
  talk: () => talk,
  hubResult: () => hubResult
};
})();
