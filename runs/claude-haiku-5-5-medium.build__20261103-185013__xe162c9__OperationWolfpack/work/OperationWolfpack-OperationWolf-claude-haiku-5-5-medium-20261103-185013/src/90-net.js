// AI Hub sessions (Session Protocol v1, mode shared-world). The host runs the battle with one seat per player; every other
// copy sends its inputs to the host and draws the world from the host's snapshots (about 15 a second) and events
// (reliable, about 3 a second). The stage and the simulation's seed come from the hub's shared random streams, so every
// copy builds the same decor and beats. Without a hub (AIHub.connect resolves null), the game runs as a standalone game.
(() => {
'use strict';
const WP = globalThis.WP;
const E = globalThis.My3D2dge;
const hub = () => globalThis.AIHub;

const Net = (WP.Net = {
  active: false, role: null, info: null, op: null, seed: 0, seats: [], me: null, battle: null, view: null,
  inputs: {}, lastCount: {}, sendAcc: 0, inputAcc: 0, evBuf: [], evAcc: 0, started: false, finished: false, reported: false,
  localCross: null, ended: false,
});

const TYPE_LIST = ['soldier', 'vehicle', 'boat', 'air', 'civilian', 'hostage', 'animal', 'crate', 'rocket', 'pickup', 'boss'];

// the hub's welcome: connect as a shared-world session (one seat per player, up to four). null: no hub, play standalone.
Net.connect = async () => {
  const H = hub();
  if (!H || !H.active) return null;
  const info = await H.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) return null;
  Net.active = true;
  Net.info = info;
  Net.me = info.me;
  Net.role = info.isHost ? (info.server ? 'server' : 'host') : 'client';
  Net.seats = info.players.map(p => p.id);
  Net.op = WP.OP_ORDER[Math.floor(H.rng('stage')() * WP.OP_ORDER.length)];
  Net.seed = Math.floor(H.rng('sim')() * 4294967296);
  H.on('start', () => { Net.startAt = true; });
  H.on('card', st => { Net.card = st || null; });
  H.on('message', (data, from) => Net.onMessage(data, from));
  H.on('leave', ({ id }) => Net.onLeave(id));
  H.on('time-up', () => Net.finish(false));
  H.on('end', () => { Net.ended = true; });
  H.ready();
  return info;
};

// the host builds the battle; a client builds a view of the same operation (the same decor and beats) and fills it in
Net.build = () => {
  const players = Math.max(1, Net.seats.length);
  if (Net.role === 'client') {
    const v = new WP.Battle(Net.op, { seed: Net.seed, players, difficulty: 'veteran' });
    v.view = true;
    Net.view = v;
    Net.localCross = { cx: WP.W / 2, cy: 120 };
  } else {
    Net.battle = new WP.Battle(Net.op, { seed: Net.seed, players, difficulty: 'veteran', tempo: 1.3 });
    Net.battle.players.forEach((pl, i) => { pl.netId = Net.seats[i]; });
  }
};

// the host's input for a seat: its own copy's (the keyboard and mouse), or the latest message from that copy
Net.seatInputFor = (pl, localInput) => {
  if (pl.netId === Net.me) return localInput(pl);
  const m = Net.inputs[pl.netId];
  if (!m) return {};
  const last = Net.lastCount[pl.netId] || { g: 0, r: 0 };
  const out = { aim: m.a, fire: !!m.f, grenade: m.g > last.g, reload: m.r > last.r };
  Net.lastCount[pl.netId] = { g: Math.max(last.g, m.g), r: Math.max(last.r, m.r) };
  return out;
};

Net.onMessage = (data, from) => {
  if (!data || typeof data !== 'object') return;
  if (Net.role !== 'client' && data.k === 'i') Net.inputs[from] = data;
  if (Net.role !== 'client') return;
  if (!Net.view) Net.build();   // a snapshot can come before the session scene has entered
  if (data.k === 's') Net.applySnapshot(data);
  if (data.k === 'ev' && Array.isArray(data.l)) { Net.view.events = data.l; WP.playEvents(Net.view); }
};
Net.onLeave = id => {
  if (!Net.battle) return;
  const pl = Net.battle.players.find(p => p.netId === id);
  if (pl) { pl.down = true; pl.left = true; }
  delete Net.inputs[id];
};

// the host's snapshot: the things a copy needs to draw the world, kept small (the nearest twenty entities)
Net.snapshot = b => {
  const r = v => Math.round(v);
  return {
    k: 's', t: +b.t.toFixed(2), d: r(b.dist), c: r(b.camX), ph: b.phase, res: b.result,
    q: b.quota, dn: b.done, sv: b.saved, ls: b.lost, cs: b.civShot,
    p: b.players.map(pl => [pl.netId, r(pl.cx), r(pl.cy), r(pl.damage), pl.mag, pl.spares, pl.grenades, pl.score, pl.streak,
      (pl.down ? 1 : 0) | (pl.fury > 0 ? 2 : 0) | (pl.reload > 0 ? 4 : 0), +pl.muzzle.toFixed(2), +pl.dmgFlash.toFixed(2), +pl.hitFlash.toFixed(2)]),
    e: b.ents.filter(e => !e.gone).sort((x, y) => x.z - y.z).slice(0, 20).map(e => [e.id, e.type, r(e.x), r(e.z), r(e.y || 0), +(e.rise || 0).toFixed(2), e.hp, +e.tg.toFixed(2), e.dead ? 1 : 0, r(e.vx || 0), e.shieldUp ? 1 : 0, e.item || '', e.pk || '']),
    b: b.booms.slice(0, 4).map(q => [r(q.x), r(q.z), q.r, +q.t.toFixed(2), q.big ? 1 : 0]),
  };
};

// the client's view: fill the view from the snapshot (its own crosshair stays its own, moved here at once)
Net.applySnapshot = s => {
  const v = Net.view;
  v.t = s.t; v.dist = s.d; v.camX = s.c; v.phase = s.ph; v.quota = s.q; v.done = s.dn; v.saved = s.sv; v.lost = s.ls; v.civShot = s.cs;
  v.result = s.res;
  v.players = s.p.map(row => {
    const [id, cx, cy, dmg, mag, spares, gren, score, streak, flags, muzzle, dmgFlash, hitFlash] = row;
    const seat = v.players.find(q => q.netId === id) || { id: Net.seats.indexOf(id) + 1, netId: id, bloom: 0, kills: {} };
    Object.assign(seat, { cx, cy, damage: dmg, mag, spares, grenades: gren, score, streak, bestStreak: streak,
      down: !!(flags & 1), fury: flags & 2 ? 1 : 0, reload: flags & 4 ? 1 : 0, muzzle, dmgFlash, hitFlash });
    if (id === Net.me) { seat.cx = Net.localCross.cx; seat.cy = Net.localCross.cy; }
    return seat;
  });
  v.p = v.players.find(q => q.netId === Net.me) || v.players[0];
  v.ents = s.e.map(([id, type, x, z, y, rise, hp, tg, dead, vx, shieldUp, item, pk]) => {
    const def = WP.TYPES[type];
    const boss = WP.BOSSES[type];
    return {
      id, type, kind: def ? def.kind : 'boss', x, z, y, rise, hp, tg, dead: !!dead, gone: false, vx, flash: 0,
      item: item || undefined, pk: pk || undefined, shieldUp: !!shieldUp, t: v.t,
      dyn: type === 'dynamite', dmg: def ? def.dmg : 1,
      w: boss ? boss.w : undefined, h: boss ? boss.h : undefined, sprite: boss ? boss.sprite : undefined, name: boss ? boss.name : undefined,
      shield: boss ? !!boss.shield : false,
    };
  });
  v.booms = s.b.map(([x, z, r, t, big]) => ({ x, z, r, t, big: !!big }));
  v.multiplier = p => 1 + Math.min(3, Math.floor((p ? p.streak : 0) / 5));
};

// the host's tally for the hub: standings best first, the score for each, and the stats for the awards
Net.finish = won => {
  const H = hub();
  if (!H || Net.reported || !Net.battle) return;
  Net.reported = true;
  const b = Net.battle;
  const order = b.players.slice().sort((a, c) => c.score - a.score);
  const standings = [];
  for (const pl of order) {
    const last = standings[standings.length - 1];
    if (last && last._score === pl.score) last.push(pl.netId); else { const g = [pl.netId]; g._score = pl.score; standings.push(g); }
  }
  standings.forEach(g => delete g._score);
  const scores = {}, stats = {};
  for (const pl of b.players) {
    scores[pl.netId] = { score: pl.score };
    stats[pl.netId] = { kills: pl.kills.soldier + pl.kills.vehicle + pl.kills.boat + pl.kills.air, accuracy: pl.shots ? +(pl.hits / pl.shots).toFixed(2) : 0, civiliansHit: b.civShot };
  }
  // the awards: the best shot, the most projectiles shot down, and the most guards taken out (the workers' way out)
  const best = (f) => b.players.reduce((w, pl) => (!w || f(pl) > f(w) ? pl : w), null);
  const acc = pl => (pl.shots ? pl.hits / pl.shots : 0);
  const awards = {};
  const sharp = best(acc), guard = best(pl => pl.intercepts), life = best(pl => pl.guards);
  if (sharp && acc(sharp) > 0) awards.SHARPSHOOTER = sharp.netId;
  if (guard && guard.intercepts > 0) awards.GUARDIAN = guard.netId;
  if (life && life.guards > 0) awards.LIFESAVER = life.netId;
  H.finish({ standings, scores, won: !!won, stats, awards });
};

// the shared timing of a session: the rail is quicker and the holds shorter (about four minutes an operation)
Net.tick = (dt) => {
  if (Net.role === 'client') {
    const v = Net.view, l = Net.localCross;
    if (!v || !v.p) return;
    const I = WP.game.input, mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), my = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0);
    const pointer = I.pointer();
    if (pointer) { l.cx = pointer[0]; l.cy = pointer[1]; }
    else { l.cx += mx * WP.T.crosshairSpeed * dt; l.cy += my * WP.T.crosshairSpeed * dt; }
    l.cx = WP.clamp(l.cx, 0, WP.W - 1); l.cy = WP.clamp(l.cy, 8, WP.PLAY_H - 6);
    Net.inputAcc += dt;
    if (Net.inputAcc >= 1 / 15) {
      Net.inputAcc = 0;
      Net.counts = Net.counts || { g: 0, r: 0 };
      if (I.pressed('bomb')) Net.counts.g++;
      if (I.pressed('reload')) Net.counts.r++;
      hub().send({ k: 'i', a: [Math.round(l.cx), Math.round(l.cy)], f: I.down('fire') ? 1 : 0, g: Net.counts.g, r: Net.counts.r }, { reliable: false });
    }
    return;
  }
};

WP.scenes = WP.scenes || {};
// the session scene: the hub's countdown, then the battle, with the same drawing as play
WP.scenes.net = {
  pausable: false,
  enter() {
    Net.started = false; Net.finished = false; Net.reported = false; Net.evBuf = []; Net.evAcc = 0; Net.sendAcc = 0;
    Net.build();
    WP.game.allowJoin(false);
  },
  update(dt) {
    const H = hub();
    if (!H || !Net.battle && !Net.view) return;
    if (!Net.started) {
      // the hub's card: Confirm (Enter, X, or a click) is Ready; the round starts when every player is ready and the card lifts
      const I = WP.game.input;
      if (I.pressed('confirm') || I.pressed('start') || I.clicked()) { Net.iAmReady = true; H.answer('ready'); }
      if (H.time() >= 0) Net.started = true; else return;
    }
    if (Net.role === 'client') { Net.tick(dt); return; }
    if (Net.finished || !Net.battle) return;
    const b = Net.battle;
    const I = WP.game.input;
    const local = pl => WP.seatInput ? WP.seatInput(pl, I, true) : {};
    b.step(dt, b.players.map(pl => Net.seatInputFor(pl, local)));
    WP.playEvents(b);
    Net.evBuf.push(...b.events);
    Net.evAcc += dt; Net.sendAcc += dt;
    if (Net.sendAcc >= 1 / 15) { Net.sendAcc = 0; H.send(Net.snapshot(b), { reliable: false }); }
    if (Net.evAcc >= 0.33 && Net.evBuf.length) { H.send({ k: 'ev', l: Net.evBuf.slice(0, 40) }); Net.evBuf = []; Net.evAcc = 0; }
    if (b.result !== null && b.finished) { Net.finished = true; Net.finish(b.result === 'won'); }
    if (H.time() > (H.limitMs || Infinity) && !Net.finished) { Net.finished = true; Net.finish(false); }
  },
  draw(r) {
    const H = hub();
    const b = Net.role === 'client' ? Net.view : Net.battle;
    r.overlay(g => {
      if (b) WP.drawBattle(g, b);
      if (!Net.started && H) {
        const ready = (Net.card && Net.card.ready) || [];
        Net.info.players.forEach((pl, i) => {
          const on = ready.includes(pl.id);
          E.font.text(g, (on ? '[X] ' : '[ ] ') + (pl.name || 'P' + (i + 1)), 40, 96 + i * 14, on ? '#7ae0a0' : '#c8c0e8', { shadow: '#000' });
        });
        E.font.text(g, Net.iAmReady ? 'READY. WAITING FOR THE OTHERS.' : 'PRESS ' + WP.game.input.label('confirm') + ' TO READY', WP.W / 2, 220, '#ffe060', { align: 'center', shadow: '#000' });
        const left = Math.ceil(-H.time() / 1000);
        E.font.text(g, left > 0 ? String(Math.min(3, left)) : 'GO', WP.W / 2, 110, '#ffe060', { align: 'center', scale: 4, shadow: '#000' });
        E.font.text(g, 'GET READY, ' + WP.OPS[Net.op].card, WP.W / 2, 60, '#ffffff', { align: 'center', shadow: '#000' });
      }
      if (H && H.limitMs && Net.started) E.font.text(g, 'TIME ' + Math.max(0, Math.ceil((H.limitMs - H.time()) / 1000)), WP.W - 8, 8, '#ffe060', { align: 'right', shadow: '#000' });
      if (Net.finished || Net.ended) E.font.text(g, 'ROUND OVER', WP.W / 2, 120, '#ffe060', { align: 'center', scale: 2, shadow: '#000' });
    });
  },
};
})();
