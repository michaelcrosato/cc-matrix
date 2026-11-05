// WIRE ON THE CORNER: one shift on Fayette & Monroe. A plainclothes detective has eight minutes of the night (16:00 to
// 24:00, one real second a game minute) to bank four of the five pieces of a case at the Lieutenant's office. Tune the
// pole for a line on the wire, talk to the people who know, keep out of the lookouts' sight, and mind the heat: three
// burns and the corner is done with you. Threequarter view by default; topdown and iso are one key (or button) away.
// Built on the my-3D2dge engine (the full build, bundled into the page). Settings, pause, controls and full screen are
// the engine's own; the hub client (session.js) is the first script and decides whether this is an AI Hub session.
(() => {
const E = My3D2dge;
const LIVE = typeof AIHub !== 'undefined' && !!AIHub.active;            // an AI Hub round: no title, the hub starts and ends it
const TOUCH_ONLY = typeof matchMedia === 'function' && matchMedia('(any-hover: none)').matches && matchMedia('(any-pointer: coarse)').matches;

// ----- rules -----
const SHIFT_START = 16 * 60;      // 16:00, in minutes
const SHIFT_SECONDS = 480;        // eight real minutes: one second is one minute of the shift
const NEED = 4;                   // pieces of the case to bank (five exist)
const HEAT_MAX = 3;               // burns that end the shift
const BURN_AFTER = 1.1;           // seconds a lookout watches before the corner burns
const QUIET_SECONDS = 20;         // the corner goes quiet after a burn
const TUNE_WINS = 3;              // good locks on the pole for a line on the wire
const KIND_NAME = { pager: 'pager', photos: 'photos', ledger: 'ledger', wire: 'wire tap', statement: 'statement' };
const QUOTE = {
  case: 'Everybody has a number. Yours just got called.',
  burned: 'The corner always knows who is watching it. It just takes them a while to say so.',
  time: 'The shift ends whether the case does or not. Same corner tomorrow night.'
};
const HEADLINE = { case: 'CASE MADE', burned: 'BURNED', time: 'OUT OF TIME' };
const clockText = sec => {
  const m = Math.floor(SHIFT_START + sec), h = Math.floor(m / 60) % 24, mm = m % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};
const remaining = sec => Math.max(0, Math.ceil(SHIFT_SECONDS - sec));

// ----- the game -----
const game = new E.Game({
  canvas: 'screen', res: 'snes', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'],
  menu: {
    controls: { confirm: 'Interact • tune • talk', dash: 'Run', attack: false, skill: false, jump: false },
    settings: [
      { key: 'invertX', label: 'Invert left-right', value: false },
      { key: 'invertY', label: 'Invert up-down', value: false },
      { key: 'glyphs', label: 'Button prompts', options: ['PlayStation', 'Xbox'], value: 'PlayStation' }
    ],
    quit: LIVE ? false : 'title'   // a hub round is the hub's: returning to the title does nothing there
  }
});
game.input.touchEnabled = false;   // no touch controls: a touch-only device gets the "controller or keyboard" notice
const ui = new E.Shell(game);
const talk = new E.Dialog(game, { voice: 'gruff' });
game.audio.define('gruff', { wave: 'saw', freq: 190, to: 150, dur: .05, vol: .10 });
const bg = new E.Backdrop('city-night');

// ----- the block: rowhouses, the corner, the office; drawn as text rows, so it is easy to read and change -----
const W = 28, H = 18;
const cells = Array.from({ length: H }, () => Array(W).fill('.'));
const box = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells[y][x] = ch; };
const at = (x, y, ch) => { cells[y][x] = ch; };
box(0, 0, W - 1, 0, '#'); box(0, H - 1, W - 1, H - 1, '#'); box(0, 0, 0, H - 1, '#'); box(W - 1, 0, W - 1, H - 1, '#');
box(1, 1, 6, 4, '#'); box(1, 6, 6, 9, '#'); box(1, 11, 6, 15, '#');   // rowhouses and the laundromat, west
box(21, 1, 26, 6, 'H'); box(21, 10, 26, 15, '#');                       // the office, and the rowhouses east
box(12, 2, 12, 3, '='); box(10, 13, 10, 14, '=');                       // fences
at(8, 2, '@');                                                          // the alley where the shift starts
[[11, 5], [15, 6], [13, 12]].forEach(([x, y]) => at(x, y, 'L'));       // lookouts
at(13, 8, 'P');                                                         // the pole
at(16, 11, 'M');                                                        // Tonic
at(8, 13, 'W');                                                         // Delores, by the laundromat
[[9, 9], [14, 14], [17, 4]].forEach(([x, y]) => at(x, y, 'E'));        // evidence
at(23, 7, 'D');                                                         // the office door
[[17, 13], [19, 3], [9, 16]].forEach(([x, y]) => at(x, y, 'C'));       // people on the street
[[7, 7], [19, 10], [10, 15]].forEach(([x, y]) => at(x, y, 'l'));       // street lamps
const map = new E.TileMap({
  rows: cells.map(r => r.join('')),
  legend: { '#': 1, '=': 2, H: 3, '@': 'start', L: 'lookout', E: 'ev', P: 'pole', M: 'man', W: 'witness', D: 'hq', C: 'civ', l: 'lamp' },
  types: {
    1: { h: 40, top: '#5a4c48', side: '#3a2c2a', face: 'brick', roof: 'tiles' },
    2: { h: 12, top: '#6a5a3c', side: '#4a3a26', face: 'plank', roof: 'slab' },
    3: { h: 56, top: '#5c6070', side: '#363a48', face: 'stone', roof: 'slab' }
  },
  floorMat: 'cobble'
});
const DRESS = [['barrel', 18, 14, { facing: .5 }], ['crate', 19, 8, { facing: .2 }], ['cart', 9, 5, { facing: 0 }], ['barrel', 4, 9, { facing: 2 }]];
const cellXY = (cx, cy) => [cx * 16 + 8, cy * 16 + 8];
for (const [id, cx, cy, o] of DRESS) { const [x, y] = cellXY(cx, cy); map.solid(id, x, y, 0, o); }

// ----- sprites and the people in them -----
const EVSPR = E.sprite(['.bbbbbb.', 'bwwwwwwb', 'bwbwwbwb', 'bwwbbwwb', 'bwwwwwwb', '.bbbbbb.'], { b: '#3a2a1a', w: '#e8dcb0' }, 1);
const rigs = {};
function makeRigs() {
  rigs.hero = new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, hat: 'cap', outfit: 'coat', sleeves: 'long',
    colors: { skin: '#8a5a40', hair: '#1c1612', cloth: '#4a4a54', coat: '#34343e', pants: '#2a2a32', boot: '#1c1410' } });
  rigs.look = ['#7a4e34', '#b07a58', '#5a3a28'].map((skin, i) => new E.Humanoid({ size: 1.15, build: 'chibi', weapon: null,
    hat: i === 1 ? 'band' : 'cap', outfit: 'tunic', hair: i === 0 ? 'spiky' : 'short',
    colors: { skin, hair: '#14100c', cloth: ['#7a2a2a', '#2a4a6a', '#3a5a2a'][i], pants: '#2a2630' } }));
  rigs.man = new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, hat: 'cap', outfit: 'coat',
    colors: { skin: '#6a4430', cloth: '#2a5a3a', coat: '#1e3a28', pants: '#1a1a1a' } });
  rigs.wit = new E.Humanoid({ size: 1.1, build: 'chibi', weapon: null, outfit: 'robe', hair: 'long',
    colors: { skin: '#9a6a4a', cloth: '#8a3a5a', hair: '#101010' } });
  rigs.lt = new E.Humanoid({ size: 1.25, build: 'heroic', weapon: null, hat: 'cap', outfit: 'shirt', sleeves: 'long',
    colors: { skin: '#c49070', cloth: '#303848', pants: '#20242e', hair: '#7a7068' } });
  rigs.civ = ['shirt', 'coat', 'tunic'].map((outfit, i) => new E.Humanoid({ size: 1.1, build: 'chibi', weapon: null, outfit,
    hair: i === 2 ? 'long' : 'short', colors: { skin: ['#a06a48', '#704a30', '#c08a68'][i], cloth: ['#5a6a7a', '#6a5a3a', '#7a3a3a'][i], hair: '#18120e' } }));
}
makeRigs();

// ----- the shift's state and world -----
let st, hero, heroRig, lookouts, civs, evs, man, witness, lt, pole, flow, walkTo, goals;

function newRun(attract) {
  st = { attract, elapsed: 0, heat: 0, carry: [], banked: 0, outcome: null, quiet: 0, tune: null, progressT: 0, reported: false };
  const s = map.find('start');
  hero = new E.Body({ x: s.x, y: s.y, r: 4 }); hero.facing = 0; heroRig = rigs.hero;
  lookouts = map.findAll('lookout').map((p, i) => ({ x: p.x, y: p.y, z: 0, base: [0, Math.PI / 2, Math.PI][i % 3], facing: 0, phase: i * 1.7, seen: 0, rig: rigs.look[i % 3] }));
  evs = map.findAll('ev').map((p, i) => ({ x: p.x, y: p.y, kind: ['pager', 'photos', 'ledger'][i], taken: false }));
  const m = map.find('man'), w = map.find('witness'), d = map.find('hq'), pl = map.find('pole');
  man = { x: m.x, y: m.y, rig: rigs.man, done: false };
  witness = { x: w.x, y: w.y, rig: rigs.wit, done: false };
  lt = { x: d.x, y: d.y, rig: rigs.lt };
  pole = { x: pl.x, y: pl.y, tuned: false };
  civs = map.findAll('civ').map((p, i) => ({ body: new E.Body({ x: p.x, y: p.y, r: 4 }), rig: rigs.civ[i % rigs.civ.length], t: 0, dir: Math.random() * 6.28 }));
  walkTo = null;
  flow = new E.FlowField(map);
  goals = attract ? [
    ...evs.map(e => ({ x: e.x, y: e.y, act: () => pickEv(e), done: false })),
    { x: pole.x, y: pole.y, act: () => { pole.tuned = true; st.carry.push('wire'); ui.toast('THE WIRE', 'A line on the pole. Good enough.', 3); }, done: false },
    { x: man.x, y: man.y, act: () => talkMan(0), done: false },
    { x: witness.x, y: witness.y, act: () => talkWitness(0), done: false },
    { x: lt.x, y: lt.y, act: () => talkLieutenant(), done: false }
  ] : null;
}

const score = () => st.banked * 1000 + (st.outcome === 'case' ? 1000 : 0) + remaining(st.elapsed) * 5 - st.heat * 250;

function finish(outcome) {
  if (st.outcome) return;
  st.outcome = outcome; st.endT = 0;
  if (st.attract) return;   // the demo shows its own card and starts the next shift in place
  if (LIVE && !st.reported) {
    st.reported = true;
    AIHub.result({ score: score(), stats: { Banked: st.banked + ' of ' + NEED, Heat: String(st.heat), 'Shift left': remaining(st.elapsed) + ' s', Outcome: HEADLINE[outcome] } });
  }
  game.audio.music(outcome === 'case' ? 'victory' : null);
  game.go('results');
}

function outcomeCard(r) {
  const m = Math.round(r.H / 2), o = st.outcome, cx = r.W / 2;
  r.overlay(g => E.ui.box(g, cx - 150, m - 108, 300, 214, { bg: '#07060c', border: '#a08050', alpha: .86 }));
  r.overlay(g => E.font.title(g, HEADLINE[o] || 'OUT OF TIME', cx, m - 88, { scale: 3, align: 'center' }));
  const lines = [['PIECES BANKED', st.banked + ' of ' + NEED], ['HEAT', String(st.heat) + ' of ' + HEAT_MAX], ['SHIFT LEFT', remaining(st.elapsed) + ' s'], ['SCORE', String(score())]];
  lines.forEach(([k, v], i) => { r.text(k, cx - 130, m - 40 + i * 14, '#d8cfe8', { shadow: '#000' }); r.text(v, cx + 130 - E.font.width(v), m - 40 + i * 14, '#ffd36a', { shadow: '#000' }); });
  E.font.wrap(QUOTE[o] || QUOTE.time, r.W - 60).forEach((l, i) => r.text(l, r.W / 2, m + 36 + i * 12, '#c8b890', { align: 'center', shadow: '#000' }));
}

function addHeat(n) {
  if (st.attract) return;
  st.heat += n;
  if (st.heat >= HEAT_MAX) finish('burned');
}

function burn() {
  if (st.attract) return;
  lookouts.forEach(o => { o.seen = 0; });
  st.quiet = QUIET_SECONDS;
  game.audio.sfx('hurt'); game.shake(6); game.flash('#ff5a3a', .15);
  addHeat(1);
  if (st.outcome) return;
  ui.toast('BURNED', 'The corner saw you. It goes quiet for a while.', 4);
}

function pickEv(e) {
  if (e.taken) return;
  e.taken = true; st.carry.push(e.kind);
  game.audio.sfx('pickup');
  ui.toast('EVIDENCE', 'Got the ' + KIND_NAME[e.kind] + '.', 3);
}

function bank(extra) {
  st.banked += st.carry.length; st.carry = [];
  st.elapsed += extra;
  game.audio.sfx('confirm');
  ui.toast('BANKED', st.banked + ' of ' + NEED + ' pieces in the case.', 3);
  if (st.banked >= NEED) finish('case');
}

// ----- conversations: each one is data, its choices apply the outcome; attract mode plays the first choice -----
let pendingChoice = null;   // the choice a conversation is waiting on (a test or a tool picks it with debug.choose)
function say(lines, o) {
  pendingChoice = o && o.onChoice ? o.onChoice : null;
  if (st.attract) return talk.say(lines, Object.assign({ modal: false, auto: 2.5 }, o));
  return talk.say(lines, o);
}
function talkMan(choice) {
  const opts = [
    () => { addHeat(1); st.carry.push('ledger'); man.done = true; },           // flash the badge: a burn, the ledger
    () => { st.elapsed += 2; st.carry.push('ledger'); man.done = true; },      // buy a bag: two minutes, no heat
    () => { }                                                                  // walk away: he is still there
  ];
  if (st.attract) { say(['TONIC: You ain\'t from the Health Department.'], { name: 'TONIC', portrait: man.rig }); opts[choice](); return; }
  say(['TONIC: You ain\'t from the Health Department.', 'Badge in your pocket. I can see the shape of it through the coat.',
    'The ledger is in the back. I ain\'t saying nothing about no ledger.'],
  { name: 'TONIC', portrait: man.rig, choices: ['Flash the badge, take the ledger', 'Buy a bag, ask about the ledger', 'Walk away'], onChoice: i => opts[i]() });
}
function talkWitness(choice) {
  const opts = [() => { st.carry.push('statement'); witness.done = true; }, () => { witness.done = true; }];
  if (st.attract) { say(['DELORES: I saw everything. Two boys and a Buick.'], { name: 'DELORES', portrait: witness.rig }); opts[choice](); return; }
  say(['DELORES: I ain\'t see nothing.', 'I saw everything. Two boys and a Buick, and a man in a good coat.',
    'You want that on paper, somebody got to promise me something first.'],
  { name: 'DELORES', portrait: witness.rig, choices: ['Promise her protection', 'Let her walk away'], onChoice: i => opts[i]() });
}
function talkLieutenant() {
  if (!st.carry.length) {
    say(['LT. CARROW: Bring me paper, not feelings.', 'The Stat sheet goes out Friday. Don\'t make me explain why the corner is still standing.'],
      { name: 'LT. CARROW', portrait: lt.rig });
    return;
  }
  const opts = [() => bank(0), () => bank(45), () => { }];
  if (st.attract) { say(['LT. CARROW: What you got, paper?'], { name: 'LT. CARROW', portrait: lt.rig }); opts[0](); return; }
  say(['LT. CARROW: What you got, paper?', 'Show me the paper, then tell me what it cost.'],
    { name: 'LT. CARROW', portrait: lt.rig, choices: ['Build it through the courts', 'Hold it for the Stat sheet (45 minutes)', 'Sit on it till morning'], onChoice: i => opts[i]() });
}

// ----- the tuning game on the pole: the needle sweeps; press when it is in the green -----
const tri = t => { const p = t % 2; return p < 1 ? p : 2 - p; };
function startTune() {
  st.tune = { wins: 0, speed: 1.4, half: .12, centre: .3 + Math.random() * .4, t: 0, pos: 0 };
  game.audio.sfx('blip');
}
function tuneUpdate(dt) {
  const T = st.tune, I = game.input;
  T.t += dt; T.pos = tri(T.t * T.speed);
  if (I.pressed('cancel')) { st.tune = null; return; }
  if (!I.pressed('confirm')) return;
  if (Math.abs(T.pos - T.centre) <= T.half) {
    T.wins++; game.audio.sfx('coin');
    T.speed += .35; T.half *= .8; T.centre = .15 + Math.random() * .7;
    if (T.wins >= TUNE_WINS) {
      pole.tuned = true; st.carry.push('wire'); st.tune = null;
      game.audio.sfx('confirm');
      ui.toast('THE WIRE', 'A line on the pole. Clean enough to take to the courts.', 4);
    }
  } else {
    T.wins = 0; T.speed = 1.4; T.half = .12; T.centre = .3 + Math.random() * .4;
    game.audio.sfx('hit');
    ui.toast('STATIC', 'Lost the line. Again.', 1.6);
  }
}

// ----- what is near the hero, and what a press does -----
function interactables() {
  const list = [];
  for (const e of evs) if (!e.taken) list.push({ x: e.x, y: e.y, range: 14, label: 'Pick up the ' + KIND_NAME[e.kind], fn: () => pickEv(e) });
  if (!pole.tuned) list.push({ x: pole.x, y: pole.y, range: 18, label: 'Tune the pole', fn: startTune });
  if (!man.done) list.push({ x: man.x, y: man.y, range: 20, label: 'Talk to Tonic', fn: () => talkMan(0) });
  if (!witness.done) list.push({ x: witness.x, y: witness.y, range: 20, label: 'Talk to Delores', fn: () => talkWitness(0) });
  list.push({ x: lt.x, y: lt.y, range: 22, label: st.carry.length ? 'Take the case to the Lieutenant' : 'See the Lieutenant', fn: talkLieutenant });
  return list;
}
function nearest() {
  let best = null, bd = Infinity;
  for (const t of interactables()) {
    const d = Math.hypot(t.x - hero.x, t.y - hero.y);
    if (d <= t.range && d < bd) { best = t; bd = d; }
  }
  return best;
}

// ----- the attract run: an AI that cheats (it cannot burn) and plays the shift through in order -----
function aiStep(dt) {
  const goal = goals.find(g => !g.done);
  if (!goal) { finish(st.banked >= NEED ? 'case' : 'time'); return; }
  flow.update(goal.x, goal.y);
  const d = flow.dir(hero.x, hero.y, goal.x, goal.y);
  hero.vx = d[0] * 66; hero.vy = d[1] * 66; hero.facing = Math.atan2(d[1], d[0]);
  hero.update(dt, map);
  if (Math.hypot(goal.x - hero.x, goal.y - hero.y) < 9) { goal.done = true; goal.act(); }
}

// ----- one step of the world (the play and the attract scenes share it) -----
function world(dt, attract) {
  const I = game.input;
  game.input.glyphs = game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation';
  if (LIVE && AIHub.time() < 0) { syncRigs(dt, false); return; }   // the hub's countdown: the shift has not begun
  if (st.outcome) { syncRigs(dt, false); return; }
  const modal = talk.update(dt);   // a conversation holds the world (in attract, its lines just turn by themselves)
  if (!attract && modal) { syncRigs(dt, false); hud(null); return; }
  if (!attract && st.tune) { tuneUpdate(dt); syncRigs(dt, false); hud(null); return; }

  let moving = false, run = false;
  if (attract) {
    aiStep(dt); moving = true;
  } else {
    let [mx, my] = I.move();
    if (game.settings.invertX) mx = -mx;
    if (game.settings.invertY) my = -my;
    const c = I.clicked();
    if (Math.hypot(mx, my) > .12) { walkTo = null; const d = game.view.screenDirToGround(mx, my); hero.vx = d[0] * (I.down('dash') ? 96 : 58); hero.vy = d[1] * (I.down('dash') ? 96 : 58); hero.facing = Math.atan2(d[1], d[0]); moving = true; }
    else if (c && I.lastDevice === 'mouse') { const p = game.mouseGround(); if (p) walkTo = Array.isArray(p) ? { x: p[0], y: p[1] } : p; }
    if (!moving && walkTo) {
      const dx = walkTo.x - hero.x, dy = walkTo.y - hero.y;
      if (Math.hypot(dx, dy) < 4) walkTo = null;
      else { flow.update(walkTo.x, walkTo.y); const d = flow.dir(hero.x, hero.y, walkTo.x, walkTo.y); const s = I.down('dash') ? 96 : 58; hero.vx = d[0] * s; hero.vy = d[1] * s; hero.facing = Math.atan2(d[1], d[0]); moving = true; }
    }
    if (!moving) { hero.vx = 0; hero.vy = 0; }
    run = I.down('dash');
    if (I.pressed('confirm')) { const t = nearest(); if (t) t.fn(); }
  }
  hero.update(dt, map);

  // the clock: a game minute a second, and the shift ends at 24:00 whatever is left of the case
  st.elapsed += dt;
  if (st.elapsed >= SHIFT_SECONDS) { finish('time'); return; }

  // the lookouts watch the corner; the heat and the burn are the stealth's
  if (st.quiet > 0) { st.quiet -= dt; if (st.quiet <= 0) ui.toast('CORNER', 'Back on the corner.', 2.5); }
  else if (!attract) {
    for (const o of lookouts) {
      const sees = map.sight(o, hero) && E.inArc(o, o.facing, hero, 96, .6);
      o.seen = sees ? o.seen + dt : Math.max(0, o.seen - dt * .6);
      if (o.seen >= BURN_AFTER) { burn(); return; }
    }
  }
  for (const o of lookouts) o.facing = o.base + Math.sin(game.time * .7 + o.phase) * .9;

  // people: the civilians wander and the rigs follow
  for (const c of civs) {
    c.t -= dt; if (c.t <= 0) { c.dir = Math.random() * 6.28; c.t = 2 + Math.random() * 3; }
    c.body.vx = Math.cos(c.dir) * 22; c.body.vy = Math.sin(c.dir) * 22; c.body.update(dt, map);
    if (c.body.hitWall) c.dir += 3.14;
    c.rig.update(dt, { x: c.body.x, y: c.body.y, z: 0, vx: c.body.vx, vy: c.body.vy, facing: c.dir });
  }
  heroRig.update(dt, { x: hero.x, y: hero.y, z: 0, vx: hero.vx, vy: hero.vy, facing: hero.facing || 0, run: run ? 1 : (moving ? .45 : 0) });
  syncRigs(dt, true);

  // tell the hub how it goes, about once a second
  if (LIVE && !attract && AIHub.time() >= 0) { st.progressT -= dt; if (st.progressT <= 0) { st.progressT = 1; AIHub.progress({ score: score(), label: st.banked + '/' + NEED + ' banked • heat ' + st.heat }); } }

  hud(attract);
}

function syncRigs(dt, moving) {
  for (const o of lookouts) o.rig.update(dt, { x: o.x, y: o.y, z: 0, vx: 0, vy: 0, facing: o.facing, pose: 'hips' });
  man.rig.update(dt, { x: man.x, y: man.y, z: 0, vx: 0, vy: 0, facing: 0, pose: 'hips' });
  witness.rig.update(dt, { x: witness.x, y: witness.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
  lt.rig.update(dt, { x: lt.x, y: lt.y, z: 0, vx: 0, vy: 0, facing: Math.PI, pose: 'hips' });
  if (!moving) heroRig.update(dt, { x: hero.x, y: hero.y, z: 0, vx: 0, vy: 0, facing: hero.facing || 0 });
}

function hud(attract) {
  if (!st) return;
  const I = game.input, n = nearest();
  const left = remaining(st.elapsed);
  const obj = st.carry.length || st.banked >= NEED
    ? { step: st.banked + ' / ' + NEED, title: 'Make the case', text: st.carry.length ? 'Take the paper to the Lieutenant' : 'Get the paper to the office', at: { x: lt.x, y: lt.y, z: 20 }, from: hero }
    : { step: st.banked + ' / ' + NEED, title: 'Make the case', text: 'Pick up the paper and tune the pole for the wire', at: { x: evs.length ? evs[0].x : hero.x, y: evs.length ? evs[0].y : hero.y, z: 20 }, from: hero };
  const seen = lookouts.some(o => o.seen > 0);
  ui.hud({
    objective: obj,
    status: seen ? { text: 'SPOTTED', color: '#ff5a3a' } : 'UNSEEN',
    place: 'Fayette & Monroe • ' + clockText(st.elapsed),
    bars: [{ label: 'Heat', value: st.heat, max: HEAT_MAX, kind: 'pips', color: '#e05a3a' }, { label: 'Case', value: Math.min(st.banked, NEED), max: NEED, kind: 'pips', color: '#d8c070' }],
    counts: [['Carrying', st.carry.length], ['Shift', Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0')]],
    prompt: !attract && n && !st.tune && !talk.open ? { act: 'confirm', label: n.label } : null,
    keys: attract ? [] : [[I.label('up') + I.label('left') + I.label('down') + I.label('right'), 'Walk'], [I.label('dash'), 'Run'], [I.label('confirm'), 'Interact']],
    tip: attract ? { title: 'DEMO', text: 'Press any key or button for the title screen.' } : null
  });
}

// ----- drawing the block -----
function drawWorld(r) {
  map.drawFloor(r); map.queueWalls(r);
  for (const [id, cx, cy, o] of DRESS) { const [x, y] = cellXY(cx, cy); r.shape(id, x, y, 0, o); }
  for (const p of map.findAll('lamp')) r.prop('streetlamp', p.x, p.y, 0, { light: true });
  r.queue(pole.x, pole.y, 0, g => {   // a utility pole
    const a = r.w(pole.x, pole.y, 0), b = r.w(pole.x, pole.y, 46), c = r.w(pole.x - 5, pole.y, 42), d = r.w(pole.x + 5, pole.y, 42);
    E.px.line(g, a[0], a[1], b[0], b[1], '#4a3420', 2);
    E.px.line(g, c[0], c[1], d[0], d[1], '#5a4028', 2);
  });
  for (const o of lookouts) {
    if (st.quiet > 0) continue;
    r.decal(() => r.groundArc(o.x, o.y, 4, 96, o.facing - .6, o.facing + .6, o.seen > 0 ? '#ff5a3a' : '#ffe080', .32));
  }
  for (const e of evs) if (!e.taken) { r.sprite(e.x, e.y, 6 + Math.sin(game.time * 3) * 1.5, EVSPR, { glow: .6 }); }
  if (st.tune) game.lights.add(pole.x, pole.y, 30, 40, .6, { color: '#ffd080' });
  const bodies = [[hero, heroRig], [man, man.rig], [witness, witness.rig], [lt, lt.rig]];
  for (const o of lookouts) if (st.quiet <= 0) bodies.push([o, o.rig]);
  for (const c of civs) bodies.push([c.body, c.rig]);
  for (const [b, rig] of bodies) {
    r.shadow(b.x, b.y, 6, .35, undefined, 0);
    r.actor(b.x, b.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  }
}

function drawTune(r) {
  if (!st.tune) return;
  r.overlay(g => {
    const x = Math.round(r.W / 2 - 110), y = Math.round(r.H / 2 + 36), w = 220, h = 26;
    E.ui.box(g, x - 10, y - 30, w + 20, h + 46, { bg: '#0b0a10', border: '#a08050', alpha: .92 });
    E.font.text(g, 'TUNE THE LINE  ' + st.tune.wins + '/' + TUNE_WINS, x, y - 22, '#f0e0b0', { shadow: '#000' });
    E.px.rect(g, x, y, w, h, '#2a2620');
    const c0 = st.tune.centre - st.tune.half, c1 = st.tune.centre + st.tune.half;
    E.px.rect(g, Math.round(x + c0 * w), y, Math.max(2, Math.round((c1 - c0) * w)), h, '#4ac070');
    E.px.rect(g, Math.round(x + st.tune.pos * w) - 1, y - 4, 3, h + 8, '#ffffff');
    E.font.text(g, game.input.label('confirm') + ' to lock • ' + game.input.label('cancel') + ' to stop', x, y + h + 8, '#c8b890', { shadow: '#000' });
  });
}

// ----- scenes -----
const I = () => game.input;
let idle = 0, menu;
let aboutY = 0, aboutLines = [];
const title = {
  pausable: false,
  enter() { idle = 0; game.audio.music(MUSIC.dirge); game.lights.enabled = false; menu = new E.Menu(game, [{ label: 'START SHIFT', disabled: TOUCH_ONLY }, 'OPTIONS', 'CONTROLS', 'ABOUT'], { x: 'center', y: Math.round(game.H / 2) + 8, onPick: pick => { if (pick === 0) game.go('play'); else if (pick === 1) game.menu('settings'); else if (pick === 2) game.menu('controls'); else game.go('about'); } }); },
  update(dt) {
    game.input.glyphs = game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation';
    menu.update(dt);
    if (I().anyPressed() || (I().clicked() && I().lastDevice === 'mouse')) idle = 0; else idle += dt;
    if (idle > 10) game.go('demo');
  },
  draw(r) {
    bg.draw(r);
    const m = Math.round(r.H / 2);
    r.overlay(g => { E.font.title(g, 'WIRE ON', r.W / 2, m - 96, { scale: 3, align: 'center' }); E.font.title(g, 'THE CORNER', r.W / 2, m - 60, { scale: 3, align: 'center' }); });
    E.font.wrap('ONE SHIFT. FAYETTE & MONROE. EVERYBODY HAS A NUMBER.', r.W - 24).forEach((l, i) => r.text(l, r.W / 2, m - 30 + i * 11, '#d8cfe8', { align: 'center', shadow: '#000' }));
    menu.draw(r);
    if (TOUCH_ONLY) r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 26, '#ffb070', { align: 'center', shadow: '#000' });
  }
};

const worldScene = attract => ({
  pausable: !attract,
  view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], res: 'snes', expand: true,
  enter() {
    newRun(attract);
    game.follow(hero, { z: 14 });
    game.cam.bounds = v => map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .32;
    game.audio.music(MUSIC.corner);
    if (!attract) ui.toast('FAYETTE & MONROE', 'Eight minutes of the night. Get the case to the office.', 4);
  },
  exit() { game.lights.enabled = false; ui.hud({}); talk.close(); },
  update(dt) {
    if (attract) {
      if (I().anyPressed()) { game.go('title'); return; }
      if (st.outcome) { st.endT += dt; if (st.endT > 6) newRun(true); return; }   // the card, then the next run
    }
    world(dt, attract);
  },
  draw(r) {
    drawWorld(r);
    drawTune(r);
    talk.draw(r);
    if (attract) {
      r.text('DEMO • PRESS ANY KEY', r.W / 2, 6, '#ffd36a', { align: 'center', shadow: '#000' });
      if (st.outcome) outcomeCard(r);
    }
  }
});

const results = {
  update() {
    if (!LIVE && I().pressed('confirm')) game.go('title');
  },
  draw(r) {
    bg.draw(r);
    outcomeCard(r);
    if (!LIVE) r.text('PRESS ' + I().label('confirm') + ' FOR THE TITLE', r.W / 2, r.H - 26, '#ffffff', { align: 'center', shadow: '#000' });
  }
};

const about = {
  enter() { aboutY = 0; aboutLines = []; for (const [t, text] of ABOUT) { aboutLines.push([t, E.font.wrap(text, game.W - 40)]); } },
  update() {
    const dy = I().move()[1];
    if (dy) aboutY = Math.max(0, Math.min(aboutMax(), aboutY + dy * 3));
    if (I().pressed('confirm') || I().pressed('cancel')) game.go('title');
  },
  draw(r) {
    r.sky(['#0c0a18', '#2a1e30']);
    let y = 40 - aboutY;
    for (const [head, wrapped] of aboutLines) {
      r.text(head, 14, y, '#ffd36a', { shadow: '#000' }); y += 12;
      for (const l of wrapped) { r.text(l, 14, y, '#e8e0f0', { shadow: '#000' }); y += 10; }
      y += 8;
    }
    r.overlay(g => { E.px.rect(g, 0, 0, r.W, 32, '#0c0a18'); E.px.rect(g, 0, r.H - 24, r.W, 24, '#0c0a18'); });
    r.text('ABOUT', 14, 10, '#ffd36a', { shadow: '#000', scale: 2 });
    r.text('UP AND DOWN TO READ • ' + I().label('confirm') + ' TO GO BACK', r.W / 2, r.H - 16, '#c8b890', { align: 'center', shadow: '#000' });
  }
};
const aboutMax = () => { let h = 0; for (const [, w] of aboutLines) h += 22 + w.length * 10; return Math.max(0, h - (game.H - 60)); };

game.debug = {
  snapshot: () => ({ scene: game.sceneName, hero: st ? [Math.round(hero.x), Math.round(hero.y)] : null, heat: st && st.heat, banked: st && st.banked,
    carry: st && st.carry.slice(), elapsed: st && Math.round(st.elapsed * 10) / 10, outcome: st && st.outcome, tune: st && !!st.tune, talking: talk.open }),
  teleport(x, y) { Object.assign(hero, { x, y, vx: 0, vy: 0 }); },
  where: name => { const p = { man, witness, hq: lt, pole, start: hero }[name]; return p ? [p.x, p.y] : null; },
  get state() { return st; },
  nearest: () => { const n = nearest(); return n ? n.label : null; },
  interact: () => { const n = nearest(); if (n) n.fn(); return !!n; },
  evidence: kind => { const e = evs.find(v => v.kind === kind && !v.taken); if (e) pickEv(e); return !!e; },
  lookouts: () => lookouts.map(o => ({ x: o.x, y: o.y, facing: o.facing, seen: o.seen })),
  evSpots: () => evs.map(e => ({ x: e.x, y: e.y, kind: e.kind, taken: e.taken })),
  burn: () => burn(),
  finish: o => finish(o),
  talk: () => talk,
  bank: extra => bank(extra),
  choose: i => { const f = pendingChoice; pendingChoice = null; talk.close(); if (f) f(i); },
  talkMan: c => talkMan(c), talkWitness: c => talkWitness(c), talkLieutenant: () => talkLieutenant(),
  tune: () => startTune(), tuneState: () => st.tune
};

const MUSIC = {
  dirge: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'D2 - - - F2 - - - A1 - - - C2 - - -' },
    { wave: 'square', vol: .05, notes: 'D4 . F4 . A3 . C4 . D4 . F4 . A3 . C4 .' },
    { wave: 'drums', vol: .5, notes: 'k . . . s . . . k . . . s . . .' }] },
  corner: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, notes: 'A2 . A2 . C3 . A2 . G2 . G2 . E2 . G2 .' },
    { wave: 'pulse', vol: .05, notes: 'E4 - C4 . A3 - C4 . G3 - E4 . D4 -' },
    { wave: 'drums', vol: .45, notes: 'k . h . s . h . k . h . s h h .' }] }
};

game.start({
  scene: LIVE ? 'play' : 'title',
  scenes: { title, play: worldScene(false), demo: worldScene(true), results, about },
  boot: false
});
if (LIVE) {   // the round starts in the play scene, which begins the shift
  AIHub.on('time-up', () => finish('time'));
  AIHub.on('end', () => { if (st && !st.outcome) st.outcome = 'time'; });
  AIHub.connect({ mode: 'parallel', seats: [1, 4] }).then(info => { if (info) AIHub.ready(); });   // the game is loaded: ready for the round
}
})();
