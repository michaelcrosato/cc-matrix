// AI Hub sessions, shared world. One world for all players, run by the host's copy: it runs every hero (its own player's
// from the keyboard and pad, and the others' from the intents they send), every monster, generator, hazard and the King.
// The other copies send their player's intents to the host (12 a second, unreliable), and show the world the host sends:
// a snapshot of the whole world eight times a second (reliable and ordered, so the copies never fall behind for good),
// and a stage message when the descent moves on. A copy shows its own hero where the host has it, smoothed. The hub's
// card is the game's own (the players lining up, how to win, the controls, the countdown). The host finishes the round
// at time-up, when every hero is down, or at the ending, with the standings by score.
// Outside a session none of this runs.

let HUB = null;
const NET = { intents: new Map(), sendT: 0, snapT: 0, finished: false };
let CARD = { left: null, ready: [], starting: false, asked: false, asking: 0, paused: false };
let ROUND = { ended: false, standings: null, reason: null };
const KINDS = () => Object.keys(MONSTERS);
const HOST = () => !!(HUB && HUB.isHost);
const CLIENT_COPY = () => !!(HUB && !HUB.isHost);
const r1 = v => Math.round(v * 10) / 10;

function hubStart() {
  AIHub.on('card', c => { CARD = Object.assign(CARD, c); });
  AIHub.on('start', () => { game.go('play', { index: 0 }, { fade: 0 }); });
  AIHub.on('time-up', () => { if (HOST()) hostFinish('time'); });
  AIHub.on('end', e => { ROUND.ended = true; ROUND.standings = e && e.standings; ROUND.reason = e && e.reason; game.audio.music(null); });
  AIHub.on('message', (data, from) => onMessage(data, from));
  AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
    if (!info) { game.go('title', null, { fade: 0 }); return; }
    HUB = info;
    // every player's hero, in seat order: the host runs them all; ours takes our own input, the others take the intents
    WORLD.heroes = info.players.map(p => {
      const cls = CLASS_ORDER[p.id % CLASS_ORDER.length];
      const h = makeHero(p.id, cls, p.id === info.me ? game.input : null);
      h.id = p.id; h.name = p.name; h.color = p.color || HEROES[cls].color;
      h.remote = p.id !== info.me ? p.id : null;
      return h;
    });
    WORLD.attract = false;
    loadStage(0);
    AIHub.ready();   // the round's card stays up until the hub's start
  });
}

// --- the messages ---
function onMessage(data, from) {
  if (!data) return;
  if (data.k === 'i' && HOST()) { NET.intents.set(from, data); return; }
  if (data.k === 's' && CLIENT_COPY() && !ROUND.ended) { applySnapshot(data); return; }
  if (data.k === 'st' && CLIENT_COPY()) { loadStage(data.i); game.go('card', { index: data.i }, { fade: 'iris' }); }
}

// The host's intent for a remote player: their last one; their magic counts once.
function remoteIntent(h) {
  const d = NET.intents.get(h.remote);
  if (!d) return NO_INTENT;
  const it = { move: d.m || [0, 0], aim: d.a == null ? null : d.a, fire: !!d.f, magic: !!d.g, plant: !!d.p };
  d.g = false;
  return it;
}

// A client sends its player's intents: every 1/12 s, and at once for a magic press.
function clientSend(dt) {
  const me = WORLD.heroes.find(h => h.id === HUB.me);
  if (!me) return;
  NET.sendT += dt;
  const press = game.input.pressed('magic');
  if (NET.sendT < 1 / 12 && !press) return;
  NET.sendT = 0;
  const it = intentFromInput(game.input, me);
  AIHub.send({ k: 'i', m: [r1(it.move[0]), r1(it.move[1])], a: it.aim == null ? null : +it.aim.toFixed(2), f: it.fire ? 1 : 0, g: press ? 1 : 0, p: it.plant ? 1 : 0 }, { to: HUB.host, reliable: false });
}

// --- the host's snapshots: the whole world, as compact arrays (the nearest of each kind, kept under the message limit) ---
function buildSnapshot() {
  const W = WORLD;
  const hs = W.heroes.map(h => [h.id, r1(h.body.x), r1(h.body.y), Math.round(h.hp), h.score, h.keys, h.flasks, h.down ? 1 : 0, +h.facing.toFixed(2), h.kills, h.treasure || 0, h.hurt > 0 ? 1 : 0, h.stun > 0 ? 1 : 0, h.melee > 0 ? 1 : 0, h.throwT > 0 ? 1 : 0, h.amulet ? h.amulet.type : '', h.specials.join('.'), h.queasy > 0 ? 1 : 0]);
  const ms = W.monsters.filter(m => m.alive).slice(0, 70).map(m => [m.id, KINDS().indexOf(m.kind), m.rank, r1(m.x), r1(m.y), m.hidden ? 1 : 0, +(m.facing || 0).toFixed(2), m.wind > 0 ? 1 : 0]);
  const gs = W.gens.map(g => [Math.round(g.hp), g.alive ? 1 : 0, g.children]);
  const it = W.items.filter(i => i.alive).slice(0, 160).map(i => [i.id, i.ch, r1(i.x), r1(i.y), i.special || '', i.amulet || '']);
  const boss = W.boss ? [Math.round(W.boss.hp), W.boss.max, W.boss.phase, r1(W.boss.x), r1(W.boss.y), W.boss.alive ? 1 : 0, W.boss.state, W.boss.fog > 0 ? 1 : 0, +(W.boss.dying || 0).toFixed(2)] : null;
  return {
    k: 's', t: +W.time.toFixed(2), st: W.index, fc: +W.floorClock.toFixed(2), c: W.caption, ct: +(W.captionT || 0).toFixed(2),
    bell: W.bell ? (W.bell.alive ? 1 : 0) : 0, bh: W.bellHero ? W.bellHero.id : -1, bt: +(W.bellT || 0).toFixed(1), hr: W.hoard ? Math.ceil(W.hoard.left) : null,
    hs, ms, gs, it, doors: W.doors.map(d => d.open ? 1 : 0),
    fakes: [...W.fakes.keys()], cracks: [...W.cracks.entries()], plates: [...W.plates.entries()].filter(([, p]) => p.used).map(([k]) => k),
    shots: W.shots.list.slice(0, 60).map(b => [r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), b.color]),
    foe: W.foeShots.list.slice(0, 40).map(b => [r1(b.x), r1(b.y), b.color]),
    crocks: W.crocks.map(c => [r1(c.sx), r1(c.sy), r1(c.tx), r1(c.ty), +c.t.toFixed(2), c.dur]),
    boss, over: W.over ? 1 : 0
  };
}
function sendSnapshot() {
  const s = buildSnapshot();
  AIHub.send(s, { reliable: true });
}

// A copy applies the host's world: it creates the heroes and monsters it hasn't seen, and sets everything else.
function applySnapshot(s) {
  const W = WORLD, map = W.map;
  if (!map) return;
  W.time = s.t; W.floorClock = s.fc; W.caption = s.c; W.captionT = s.ct;
  W.heroes.forEach(h => { h.seen = false; });
  for (const e of s.hs) {
    const [id, x, y, hp, score, keys, flasks, down, facing, kills, treasure, hurt, stun, melee, throwT, amulet, specials, queasy] = e;
    let h = W.heroes.find(hh => hh.id === id);
    if (!h) continue;
    h.seen = true;
    if (h.body.x === 0 && h.body.y === 0) { h.body.x = x; h.body.y = y; }
    h.tx = x; h.ty = y; h.body.vx = (x - h.body.x) * 8; h.body.vy = (y - h.body.y) * 8;
    h.hp = hp; h.score = score; h.keys = keys; h.flasks = flasks; h.down = !!down; h.facing = facing; h.kills = kills; h.treasure = treasure;
    h.hurt = hurt ? .2 : 0; h.stun = stun ? .3 : 0; h.melee = melee ? .42 : 0; h.throwT = throwT ? .3 : 0;
    h.amulet = amulet ? { type: amulet, t: 20 } : null; h.specials = specials ? specials.split('.') : []; h.queasy = queasy ? 1 : 0;
  }
  // monsters: the host's list, with each one's rig kept from before
  const old = new Map(W.monsters.map(m => [m.id, m]));
  W.monsters = s.ms.map(([id, ki, rank, x, y, hidden, facing, wind]) => {
    const kind = KINDS()[ki];
    const m = old.get(id) || { id, kind, def: MONSTERS[kind], x, y, tx: x, ty: y, rank, spawnRank: rank, hp: 1, alive: true, flash: 0, shrink: 0, fade: 0, r: 6, body: { vx: 0, vy: 0 }, gen: null, facing: 0, bob: 0 };
    m.kind = kind; m.def = MONSTERS[kind]; m.tx = x; m.ty = y; m.rank = rank; m.hidden = !!hidden; m.facing = facing; m.wind = wind ? .3 : 0; m.alive = true;
    return m;
  });
  W.gens.forEach((g, i) => { const v = s.gs[i]; if (v) { g.hp = v[0]; g.alive = !!v[1]; g.children = v[2]; } });
  const itemOld = new Map(W.items.map(i => [i.id, i]));
  W.items = s.it.map(([id, ch, x, y, special, amulet]) => ({ id, ch, def: ITEMS[ch], x, y, r: 5, alive: true, bob: id * 1.3, special: special || null, amulet: amulet || null, cell: '' }));
  void itemOld;
  // the doors and the walls the host has opened
  W.doors.forEach((d, i) => {
    const open = !!s.doors[i];
    if (open && !d.open) for (const [x, y] of d.cells) map.set(x, y, 0);
    if (open !== d.open) { d.open = open; map.version = (map.version || 0) + 1; }
  });
  const fakesNow = new Set(s.fakes);
  for (const [k, f] of [...W.fakes]) if (!fakesNow.has(k)) { W.fakes.delete(k); map.set(f.x, f.y, 0); map.version = (map.version || 0) + 1; }
  for (const k of [...W.cracks.keys()]) if (!s.cracks.some(([kk]) => kk === k)) { const [cx, cy] = k.split(',').map(Number); map.set(cx, cy, 0); map.version = (map.version || 0) + 1; }
  W.cracks = new Map(s.cracks);
  for (const [k, p] of W.plates) p.used = s.plates.includes(k);
  W.shots.list = s.shots.map(([x, y, vx, vy, color]) => ({ x, y, z: 12, vx, vy, r: 3, color, core: '#ffffff', dmg: 0, life: 1, team: 'hero', data: {} }));
  W.foeShots.list = s.foe.map(([x, y, color]) => ({ x, y, z: 12, vx: 0, vy: 0, r: 3, color, core: '#ffe0a0', dmg: 0, life: 1, team: 'foe', data: {} }));
  W.crocks = s.crocks.map(([sx, sy, tx, ty, t, dur]) => ({ sx, sy, tx, ty, t, dur }));
  if (s.boss && W.boss) { const b = W.boss, v = s.boss; b.hp = v[0]; b.max = v[1]; b.phase = v[2]; b.tx = v[3]; b.ty = v[4]; b.alive = !!v[5]; b.state = v[6]; b.fog = v[7] ? 1 : 0; b.dying = v[8]; }
  W.bellHero = W.heroes.find(h => h.id === s.bh) || null; W.bellT = s.bt;
  if (W.bell) W.bell.alive = !!s.bell;
  if (W.hoard) W.hoard.left = s.hr || 0;
  W.over = !!s.over;
}
// Between snapshots the copy's heroes and monsters move toward where the host has them.
function clientSmooth(dt) {
  const k = Math.min(1, dt * 12);
  for (const h of WORLD.heroes) if (h.tx != null) { h.body.x += (h.tx - h.body.x) * k; h.body.y += (h.ty - h.body.y) * k; }
  for (const m of WORLD.monsters) if (m.tx != null) { m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; m.body.x = m.x; m.body.y = m.y; m.bob += dt * 6; }
  if (WORLD.boss && WORLD.boss.tx != null) { WORLD.boss.x += (WORLD.boss.tx - WORLD.boss.x) * k; WORLD.boss.y += (WORLD.boss.ty - WORLD.boss.y) * k; }
}

// The host's stage change: every copy goes to the stage's card.
function announceStage(i) { if (HOST()) AIHub.send({ k: 'st', i }, { reliable: true }); }

// The round's end, by the host: standings by score (ties in one array), and each player's score.
function hostFinish(why) {
  if (!HOST() || NET.finished) return;
  NET.finished = true;
  const hs = WORLD.heroes.slice().sort((a, b) => b.score - a.score);
  const standings = [], scores = {};
  for (const h of hs) {
    scores[h.id] = h.score;
    const last = standings[standings.length - 1];
    if (last && WORLD.heroes.find(x => x.id === last[0]).score === h.score) last.push(h.id); else standings.push([h.id]);
  }
  const kills = {}, treasure = {};
  for (const h of WORLD.heroes) { kills[h.id] = h.kills; treasure[h.id] = h.treasure || 0; }
  AIHub.finish({ standings, scores, stats: { Kills: kills, Treasure: treasure }, awards: {} });
}

// The round over.
const roundover = {
  pausable: false,
  enter() { this.t = 0; },
  update(dt) { this.t += dt; },
  draw(r) {
    r.sky(['#06050e', '#2a1a20']);
    r.overlay(g => E.font.title(g, 'ROUND OVER', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    const hs = WORLD.heroes.slice().sort((a, b) => b.score - a.score);
    hs.forEach((h, i) => r.text((i + 1) + '. ' + h.name + '  ' + h.score, r.W / 2, r.H * .5 + i * 12, h.color, { align: 'center', scale: 1, shadow: '#000' }));
    if (ROUND.standings) r.text('STANDINGS SET BY THE HUB', r.W / 2, r.H * .84, '#8a80a8', { align: 'center', shadow: '#000' });
    if (ROUND.reason && ROUND.reason !== 'finished') r.text('ENDED: ' + String(ROUND.reason).toUpperCase(), r.W / 2, r.H - 16, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// The round's own card: the game's name, the players in their colours, who is ready, how to win, this player's controls,
// and the time left. Ready on confirm or fire; more time on magic (the card names it).
const hubcard = {
  pausable: false,
  enter() { game.audio.music(SONGS.throwdown); CARD.asked = false; },
  update() {
    if (!HUB) return;
    if (game.input.pressed('confirm') || game.input.pressed('fire')) AIHub.answer('ready');
    if (game.input.pressed('magic')) AIHub.answer('more');
  },
  draw(r) {
    r.sky(['#0a0816', '#2a1a40']);
    r.overlay(g => E.font.title(g, 'GAUNTLETDOWN', r.W / 2, Math.round(r.H * .12), { scale: 2, align: 'center' }));
    if (!HUB) { r.text('CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#e8e0ff', { align: 'center', shadow: '#000' }); return; }
    r.text('ROUND ' + (HUB.round || 1) + '   ' + (CARD.paused ? 'PAUSED' : CARD.left != null ? 'STARTS IN ' + Math.ceil(CARD.left / 1000) : 'GET READY'), r.W / 2, r.H * .26, '#ffe08a', { align: 'center', scale: 1, shadow: '#000' });
    HUB.players.forEach((p, i) => {
      const x = Math.round(r.W * (i + .5) / HUB.players.length), ready = CARD.ready.includes(p.id);
      r.text(p.name + (ready ? '  READY' : ''), x, r.H * .4, p.color || '#ffffff', { align: 'center', shadow: '#000' });
      r.text(HEROES[CLASS_ORDER[p.id % CLASS_ORDER.length]].name, x, r.H * .4 + 12, '#c8c0e0', { align: 'center', shadow: '#000' });
    });
    r.text('MOST POINTS WHEN THE CLOCK RUNS OUT: TREASURE, KILLS, STAIRS. DON\'T STARVE.', r.W / 2, r.H * .6, '#fff4c8', { align: 'center', shadow: '#000' });
    r.text('MOVE ' + game.input.label('left') + game.input.label('up') + game.input.label('down') + game.input.label('right') + '   FIRE ' + game.input.label('fire') + '   MAGIC ' + game.input.label('magic'), r.W / 2, r.H * .72, '#e8e0ff', { align: 'center', shadow: '#000' });
    r.text('[' + game.input.label('confirm') + '] READY   [' + game.input.label('magic') + '] MORE TIME', r.W / 2, r.H - 16, '#ffd36a', { align: 'center', shadow: '#000' });
  }
};
