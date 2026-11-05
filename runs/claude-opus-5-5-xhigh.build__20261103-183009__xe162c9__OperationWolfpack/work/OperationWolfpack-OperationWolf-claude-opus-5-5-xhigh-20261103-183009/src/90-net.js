// AI Hub sessions (13.2): Session Protocol v1, mode shared-world. The host runs WP.Sim; clients run a mirror (a Sim
// that is not stepped: its entities come from snapshots), aim and shoot at once, and report their hits to the host.
// Messages: 'i' input (client -> host, unreliable, 15/s), 's' snapshot (host -> all, unreliable, 15/s, < 1100 bytes),
// 'ev' events (host -> all, reliable, batched, <= 3/s). At most 18 messages a second leave any copy.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp } = WP;
const N = WP.Net = { state: null };
const TYPE_LIST = () => N._types || (N._types = Object.keys(WP.TYPES).sort());
const tIdx = t => TYPE_LIST().indexOf(t), tName = i => TYPE_LIST()[i];
const hub = () => typeof AIHub !== 'undefined' ? AIHub : null;
// ---------- the codec: compact, quantized, size-guarded; a token bucket under the client's own limit ----------
const C = WP.Codec = {
  bucket: { tokens: 18, t: 0 },
  allow(now) { const b = C.bucket; b.tokens = Math.min(18, b.tokens + (now - b.t) * 18 / 1000); b.t = now; if (b.tokens < 1) return false; b.tokens -= 1; return true; },
  size: o => JSON.stringify(o).length,
  q: v => Math.round(v),
  /** a snapshot: as many entities as fit under 1100 bytes, round-robin across snapshots */
  snapshot(sim, rr) {
    const P = sim.players, cam = sim.cam;
    const s = { k: 's', t: Math.round(sim.t * 10), d: Math.round(sim.d), c: [C.q(cam.x), C.q(cam.y), Math.round(cam.h * 10), Math.round(cam.angle * 1000), Math.round(cam.pitch * 10)], st: ['play', 'boss', 'clear', 'fail', 'done'].indexOf(sim.state),
      q: Object.keys(sim.quotas).map(k => sim.quotas[k]), o: sim.objective ? sim.objective.done : -1, sp: sim.spotted > 0 ? 1 : 0, fl: sim.flare > 0 ? 1 : 0, hs: [sim.hostages.saved, sim.hostages.lost],
      p: P.filter(p => !p.gone).map(p => [p.pid, Math.round(p.x * 10), Math.round(p.y * 10), Math.round(p.damage), p.mag, p.spares.length, p.grenades, p.score, (p.down ? 1 : 0) | (p.reloadT > 0 ? 2 : 0) | (p.fury > 0 ? 4 : 0), p.streak, p.kills, p.spares.reduce((a, b) => a + b, 0)]),
      e: [] };
    const list = sim.ents.filter(e => !e.gone && (WP.TYPES[e.type].kind !== 'prop' || e.dead || e.hp < e.maxHp || e.fallen || e.out || e.beam));
    let base = C.size(s), n = 0;
    for (let k = 0; k < list.length; k++) {
      const e = list[(rr + k) % list.length], row = C.ent(e), sz = JSON.stringify(row).length + 1;
      if (base + sz > 1060) break; s.e.push(row); base += sz; n++;
    }
    s.n = list.length; return { msg: s, sent: n };
  },
  /** an entity's row: [id, type, x, y, z, facing, flags, a, b, parts] */
  ent(e) {
    const tp = WP.TYPES[e.type], k = tp.kind;
    const pose = { kneel: 1, crouch: 2, down: 3, cheer: 4 }[e.pose] || 0;
    let f = (e.dead ? 1 : 0) | (e.hidden ? 2 : 0) | (e.atk && e.atk.phase === 'tele' ? 4 : 0) | (e.throwing ? 8 : 0) | (e.whistle ? 16 : 0) | (e.chute ? 32 : 0) | ((e.wounded || e.bolt || e.lost) ? 64 : 0) | (e.saved ? 128 : 0) | (e.panic > 0 ? 256 : 0) | (e.grabbedBy ? 512 : 0) | (pose << 10) | (e.fallen ? 8192 : 0) | (e.out ? 16384 : 0);
    let a = 0, b = -1;
    if (e.atk) { a = Math.round(clamp(e.atk.t / e.atk.T, 0, 1) * 99); b = e.atk.pid; }
    else if (e.throwing) a = Math.round(clamp(e.throwing.t / e.throwing.T, 0, 1) * 99);
    else if (k === 'vehicle' || k === 'boat' || k === 'air' || k === 'hostage' || k === 'prop') a = Math.round(e.hp / Math.max(1, e.maxHp) * 99);
    else if (k === 'proj') a = Math.round((e.u || 0) * 99);
    else if (k === 'boss') { a = e.phase; b = e.intro ? 1 : 0; }
    const row = [e.id, tIdx(e.type), C.q(e.x), C.q(e.y), C.q(e.z), Math.round(e.facing * 100), f, a, b, Math.round(e.stt * 10)];
    if (e.parts && e.parts.length) {   // parts: dead bits, and the one telegraphing
      let dead = 0, tele = -1, tu = 0, tp2 = -1; e.parts.forEach((q, i) => { if (q.dead) dead |= 1 << i; if (q.atk && q.atk.phase === 'tele') { tele = i; tu = Math.round(q.atk.t / q.atk.T * 99); tp2 = q.atk.pid; } });
      row.push(dead, tele, tu, tp2);
      if (k === 'boss') row.push(Math.round(WP.Bosses.hp(e)), e.tusk ? [C.q(e.tx), C.q(e.ty), e.tusk.shieldOff > 0 ? 1 : 0, ['walk', 'aim', 'charge', 'back'].indexOf(e.tusk.st)] : 0);
    }
    if (e.anchor === 'cam') row.push('c', C.q(e.lx), C.q(e.dz));
    return row;
  }
};
// ---------- boot: our card while connecting ----------
N.boot = game => {
  const H = hub(); game.go('hubcard');
  H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
    if (!info) { N.state = null; game.go('title'); return; }
    N.setup(game, info);
  });
};
N.setup = (game, info) => {
  const H = hub();
  const op = WP.OPS[Math.floor(H.rng('stage')() * 6) % 6], seed = Math.floor(H.rng('sim')() * 4294967296) >>> 0;
  const role = info.isHost ? (info.server ? 'server' : 'host') : 'client';
  const st = N.state = { info, role, me: info.me, op, seed, card: null, started: false, playing: false, ended: false, finished: false, tSend: 0, tEv: 0, rr: 0, seq: 0, inbox: {}, evq: [], gone: new Set(), lastSnap: 0, g: 0, r: 0, hitsOut: [], hitSeq: 0, ackSeq: {}, fired: 0, firedSent: 0, timeUp: false, snapN: 0, recv: 0, sent: 0 };
  st.players = info.players.map((p, i) => ({ pid: p.id, name: WP.ascii(p.name, 'P' + (p.id + 1)), color: p.color || WP.HUB_SEATS[i % 4], net: p.id !== info.me }));
  WP.Flow.newRun({ diff: 'VETERAN', hostages: 5 }); WP.Flow.run.single = true; WP.Flow.run.hub = true;
  H.on('card', c => { st.card = c; });
  H.on('start', () => { st.started = true; });
  H.on('message', (data, from) => N.onMessage(data, from));
  H.on('leave', ({ id }) => { st.gone.add(id); const s = WP.Flow.sim; if (s) { const p = s.players.find(q => q.pid === id); if (p) { p.gone = true; WP.Input.override(id, null); } } if (st.role !== 'client') N.checkEnd(); });
  H.on('time-up', () => { st.timeUp = true; if (st.role !== 'client') N.finish(); });
  H.on('end', () => N.end(game));
  H.ready();
  st.readyAt = game.real;
};
// ---------- the card (ours): the game, the players with ready ticks, the goal, the controls, the time ----------
N.cardScene = {
  enter() { this.t = 0; this.R = hub() && hub().rng ? hub().rng('card') : () => .5; WP.Music.play(WP.ctx.game, 'map'); },
  update(dt) {
    const g = WP.ctx.game, st = N.state, I = g.input; this.t += dt; WP.time += dt;
    if (!st) return;
    if (!st.started && !st.ended) {
      const c = I.clicked(), inBtn = (b) => c && c[0] >= b[0] && c[0] <= b[0] + b[2] && c[1] >= b[1] && c[1] <= b[1] + b[3];
      if (st.role !== 'server') {
        if (I.pressed('confirm') || inBtn([150, 222, 84, 18])) { hub().answer('ready'); st.answered = true; WP.Audio.play('menuPick'); }
        if (I.pressed('more') || inBtn([246, 222, 84, 18])) { hub().answer('more'); WP.Audio.play('menuMove'); }
      }
    }
    if (st.started && !st.playing) {
      const t = hub().time();
      if (t >= -3000 && !st.built) { st.built = true; N.build(g); }
    }
  },
  draw(r) {
    const st = N.state;
    r.overlay(g => {
      WP.Screens.drawNight(g, r, this.t);
      WP.Screens.logo(g, WP.W / 2, 8, 2);
      const F = WP.HUD.F;
      if (!st) { F(g, 'CONNECTING...', WP.W / 2, 120, '#f2ead3', { align: 'center', scale: 2 }); return; }
      E.ui.box(g, 40, 58, 400, 186, { bg: ['#1a2214', '#0c1208'], border: '#8a9a5a', alpha: .92 });
      F(g, 'OPERATION ' + (WP.OPS.indexOf(st.op) + 1) + ': ' + WP.TEXT.ops[st.op][0], WP.W / 2, 64, '#e0b040', { align: 'center', scale: 2 });
      F(g, WP.TEXT.ops[st.op][1], WP.W / 2, 84, '#f2ead3', { align: 'center' });
      F(g, 'GOAL: CLEAR THE OPERATION AS A TEAM. TOP SCORE WINS.', WP.W / 2, 98, '#c8c0a0', { align: 'center' });
      const ready = (st.card && st.card.ready) || [];
      st.players.forEach((p, i) => { const x = 60 + i * 95, ok = ready.includes(p.pid); E.ui.box(g, x, 112, 86, 40, { bg: ['#222a14', '#141a0c'], border: p.color }); F(g, p.name.slice(0, 10), x + 43, 118, p.color, { align: 'center' }); F(g, ok ? '✓ READY' : '...', x + 43, 134, ok ? '#5aff6a' : '#8a8a7a', { align: 'center' }); });
      const I = WP.ctx.game.input;
      F(g, 'AIM: MOUSE OR STICK  •  FIRE: ' + I.label('fire').toUpperCase() + '  •  GRENADE: ' + I.label('grenade').toUpperCase(), WP.W / 2, 162, '#f2ead3', { align: 'center' });
      F(g, 'RELOAD: ' + I.label('reload').toUpperCase() + '  •  SNAP TO THREAT: ' + I.label('snap').toUpperCase(), WP.W / 2, 174, '#f2ead3', { align: 'center' });
      const c = st.card, left = c && c.left !== null && c.left !== undefined ? Math.ceil(c.left / 1000) : null;
      F(g, st.started ? 'GET READY!' : c && c.paused ? 'PAUSED: MORE TIME ASKED' : left !== null ? 'STARTS IN ' + left : 'WAITING FOR THE SQUAD', WP.W / 2, 192, '#ffd040', { align: 'center', scale: 2 });
      if (st.role !== 'server' && !st.started) {
        E.ui.box(g, 150, 222, 84, 18, { bg: st.answered ? ['#2a5a2a', '#1a3a1a'] : ['#5a4a14', '#3a2a08'], border: '#ffd040' }); F(g, I.label('confirm').toUpperCase() + ' READY', 192, 227, '#ffffff', { align: 'center' });
        E.ui.box(g, 246, 222, 84, 18, { bg: c && c.asked ? ['#5a2a14', '#3a1a08'] : ['#2a3418', '#141a0c'], border: '#a8a890' }); F(g, (I.lastDevice === 'gamepad' ? I.label('more') : 'M') + ' MORE TIME', 288, 227, '#ffffff', { align: 'center' });
      }
    });
  }
};
// ---------- the round: build the world, run it ----------
N.build = game => {
  const st = N.state;
  WP.ctx.locals = {};
  if (st.role !== 'server') WP.ctx.locals[st.me] = { input: game.input };
  const net = WP.ctx.net = {
    role: st.role, me: st.me,
    isMe: pid => pid === st.me,
    update: dt => N.update(game, dt),
    frames: () => N.remoteFrames(),
    events: evs => { if (st.role !== 'client') for (const ev of evs) { const row = N.encodeEv(ev); if (row) st.evq.push(row); } },
    draw: g => N.draw(g)
  };
  game.go('play', { op: st.op, players: st.players, seed: st.seed, net, noCard: true, fresh: true, hostages: 5 }, { fade: 0 });
  st.playing = true;
};
const now = () => (WP.ctx.game ? WP.ctx.game.time * 1000 : 0);   // (game time: a session never pauses; tests run it fast)
N.send = (data, reliable) => { const H = hub(); if (!H || N.state.ended) return false; if (!C.allow(now())) return false; const ok = H.send(data, { reliable }); if (ok !== false) N.state.sent++; return ok; };
/** each step: returns true when the play scene should skip its own simulation (a client, the countdown, the end) */
N.update = (game, dt) => {
  const st = N.state, sim = WP.Flow.sim, H = hub(); if (!st || !sim) return true;
  if (st.ended) return true;
  const t = H.time();
  WP.ctx.timeLeft = st.info.limitMs ? Math.max(0, st.info.limitMs - Math.max(0, t)) : null;
  if (t < 0) { WP.Rigs.update(sim, dt); return true; }   // the countdown: 3-2-1
  st.tSend += dt; st.tEv += dt;
  if (st.role === 'client') { N.clientStep(game, sim, dt); return true; }
  // the host: snapshots at 15/s, events at 3/s
  if (st.tSend >= 1 / 15) { st.tSend = 0; const { msg, sent } = C.snapshot(sim, st.rr); st.rr += Math.max(1, sent); N.send(msg, false); }
  if (st.tEv >= 1 / 3 && st.evq.length) { st.tEv = 0; const l = st.evq.splice(0, 60); N.send({ k: 'ev', l }, true); }
  if (sim.state === 'clear' || sim.state === 'fail') N.finish();
  if (st.role === 'server') { WP.Rigs.update(sim, dt); }
  return false;
};
N.remoteFrames = () => {
  const st = N.state, out = {}; if (!st) return out;
  for (const pid in st.inbox) {
    const m = st.inbox[pid], p = WP.Flow.sim.players.find(q => q.pid === +pid); if (!p || p.gone) continue;
    out[pid] = { x: m.a[0] / 10, y: m.a[1] / 10, fire: false, grenade: m.g > (m.g0 || 0) ? 1 : 0, reload: m.r > (m.r0 || 0) ? 1 : 0, device: 'net' };
    m.g0 = m.g; m.r0 = m.r;
  }
  return out;
};
/** messages: a client's input on the host; snapshots and events on a client */
N.onMessage = (d, from) => {
  const st = N.state; if (!st || !d || st.ended) return; st.recv++;
  if (d.k === 'i' && st.role !== 'client') {
    const prev = st.inbox[from]; if (prev && d.s <= prev.s) return;
    d.g0 = prev ? prev.g : d.g; d.r0 = prev ? prev.r : d.r; st.inbox[from] = d;
    const sim = WP.Flow.sim, p = sim && sim.players.find(q => q.pid === from); if (!p || p.down || p.gone) return;
    // rounds fired since the last message: ammo, the accuracy stat
    const fired = Math.max(0, d.n - (prev ? prev.n : 0));
    if (fired) { p.shots += fired; if (p.fury <= 0) p.mag = Math.max(0, p.mag - fired); p.bloom = Math.min(WP.T.bloomMax, p.bloom + fired * WP.T.bloomPerShot); }
    // the hit batches it hasn't had acknowledged (applied once; reports older than 400 ms are ignored)
    st.ackSeq[from] = st.ackSeq[from] || 0;
    for (const [seq, hits] of d.h || []) {
      if (seq <= st.ackSeq[from]) continue; st.ackSeq[from] = seq;
      for (const [id, part, pp] of hits) {
        const e = sim.byId(id); if (!e || e.gone || (e.dead && WP.TYPES[e.type].kind !== 'prop')) continue;
        const shape = { e, part, pp: pp ? (e.parts || []).find(q => q.name === pp) : null, cover: !!(WP.TYPES[e.type].cover && part === 'prop') };
        WP.Players.applyHit(sim, p, shape, WP.Players.dmg(sim, p));
      }
    }
  } else if (d.k === 's' && st.role === 'client') N.applySnap(d);
  else if (d.k === 'ev' && st.role === 'client') N.applyEvents(d.l);
};
// ---------- events: host -> clients ----------
const EVK = ['spawn', 'kill', 'explode', 'pickup', 'damage', 'radio', 'bossWarn', 'bossDefeat', 'bossPhase', 'rescued', 'hostageLost', 'efire', 'proj', 'intercept', 'clear', 'fail', 'partDown', 'civHit', 'hostageHit', 'stageSwap', 'cut', 'spotted', 'whistle', 'fury', 'chain', 'packFury', 'propDown', 'armored', 'telegraph', 'tip', 'bridgeOut', 'towerFall', 'quotaMet', 'down'];
N.encodeEv = ev => {
  const i = EVK.indexOf(ev.k); if (i < 0) return null;
  const sim = WP.Flow.sim, r = x => Math.round(x || 0);
  switch (ev.k) {
    case 'spawn': { const e = sim.byId(ev.id); if (!e) return null; return [i, e.id, tIdx(e.type), e.beh || 0, e.facade ? e.facade.map(r) : 0, e.variant || 0, e.who || 0, e.carry || 0, e.ptype || 0, e.anchor === 'cam' ? 1 : 0, e.pid || 0]; }
    case 'kill': return [i, ev.id, ev.type, ev.by, ev.part || 0, r(ev.x), r(ev.y), r(ev.z)];
    case 'explode': return [i, r(ev.x), r(ev.y), r(ev.z), r(ev.r), ev.big || 0, ev.kind || 0];
    case 'pickup': return [i, ev.pid, ev.kind, r(ev.x), r(ev.y), r(ev.z)];
    case 'damage': return [i, ev.pid, r(ev.v), ev.dir || 0];
    case 'radio': return [i, ev.key];
    case 'bossWarn': return [i, ev.id, ev.name];
    case 'efire': return [i, ev.id, ev.pid, ev.hit ? 1 : 0, ev.part || 0, ev.proj || 0];
    case 'proj': return [i, ev.id, ev.kind];
    case 'intercept': return [i, ev.id, ev.kind, ev.by, r(ev.x), r(ev.y), r(ev.z)];
    case 'partDown': return [i, ev.id, ev.part, r(ev.x), r(ev.y), r(ev.z)];
    case 'civHit': case 'hostageHit': return [i, ev.id, ev.pid, r(ev.x), r(ev.y), r(ev.z)];
    case 'stageSwap': return [i, ev.id];
    case 'cut': return [i, ev.text];
    case 'propDown': return [i, ev.id, ev.type, r(ev.x), r(ev.y), r(ev.z)];
    case 'armored': return [i, ev.id, r(ev.x), r(ev.y), r(ev.z)];
    case 'rescued': case 'hostageLost': return [i, ev.id, ev.who];
    case 'down': return [i, ev.pid];
    default: return [i, ev.id || 0, ev.pid === undefined ? -1 : ev.pid];
  }
};
N.applyEvents = rows => {
  const sim = WP.Flow.sim; if (!sim) return;
  const evs = [];
  for (const row of rows) {
    const k = EVK[row[0]]; if (!k) continue;
    let ev = { k };
    switch (k) {
      case 'spawn': { const [, id, ti, beh, fac, variant, who, carry, ptype, cam, pid] = row; const e = N.ensure(sim, id, tName(ti)); Object.assign(e, { beh: beh || e.beh, facade: fac || null, variant, who, carry: carry || null, ptype: ptype || e.ptype }); if (cam) e.anchor = 'camNet'; if (pid) e.pid = pid; continue; }
      case 'kill': ev = { k, id: row[1], type: row[2], by: row[3], part: row[4], x: row[5], y: row[6], z: row[7] }; { const e = sim.byId(row[1]); if (e && !e.dead) { e.dead = true; e.stt = 0; } } break;
      case 'explode': ev = { k, x: row[1], y: row[2], z: row[3], r: row[4], big: row[5], kind: row[6] }; break;
      case 'pickup': ev = { k, pid: row[1], kind: row[2], x: row[3], y: row[4], z: row[5] }; { const e = sim.ents.find(q => q.type === 'pickup' && Math.hypot(q.x - row[3], q.y - row[4]) < 20); if (e) e.gone = true; } break;
      case 'damage': ev = { k, pid: row[1], v: row[2], dir: row[3] }; break;
      case 'radio': ev = { k, key: row[1] }; break;
      case 'bossWarn': ev = { k, id: row[1], name: row[2] }; break;
      case 'efire': ev = { k, id: row[1], pid: row[2], hit: !!row[3], part: row[4] || null, proj: row[5] || null }; break;
      case 'proj': ev = { k, id: row[1], kind: row[2] }; break;
      case 'intercept': ev = { k, id: row[1], kind: row[2], by: row[3], x: row[4], y: row[5], z: row[6] }; { const e = sim.byId(row[1]); if (e) e.gone = true; } break;
      case 'partDown': ev = { k, id: row[1], part: row[2], x: row[3], y: row[4], z: row[5] }; break;
      case 'civHit': case 'hostageHit': ev = { k, id: row[1], pid: row[2], x: row[3], y: row[4], z: row[5] }; break;
      case 'stageSwap': ev = { k, id: row[1] }; N.swapMirror(sim, row[1]); break;
      case 'cut': ev = { k, text: row[1] }; break;
      case 'propDown': ev = { k, id: row[1], type: row[2], x: row[3], y: row[4], z: row[5] }; { const e = sim.byId(row[1]); if (e) { e.dead = true; e.stt = 0; } } break;
      case 'armored': ev = { k, id: row[1], x: row[2], y: row[3], z: row[4] }; break;
      case 'rescued': case 'hostageLost': ev = { k, id: row[1], who: row[2] }; break;
      case 'down': ev = { k, pid: row[1] }; break;
      default: ev = { k, id: row[1], pid: row[2] };
    }
    evs.push(ev);
  }
  WP.Flow.events(sim, evs);
};
N.ensure = (sim, id, type) => {
  let e = sim.byId(id); if (e) return e;
  e = { id, type, kind: WP.TYPES[type].kind, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, t: 0, st: 'net', stt: 0, hp: 1, maxHp: 1, dead: false, gone: false, net: true };
  if (WP.TYPES[type].kind === 'boss') { const d = WP.BOSS_DEF[type]; e.parts = d.parts(sim, e); e.hulls = d.hulls || [{ off: [0, 0, 0], box: WP.TYPES[type].box }]; e.phase = 1; sim.boss = e; }
  else if (['vehicle', 'boat', 'air'].includes(WP.TYPES[type].kind)) { const tp = WP.TYPES[type]; e.parts = []; for (let i = 0; i < (tp.gunners || []).length; i++) e.parts.push(WP.Part('gunner' + i, 'gunner', tp.gunners[i], 5, 1)); if (tp.tfire) e.parts.push(WP.Part('turret', 'turret', [0, type === 'heli' ? 14 : 0, tp.box[2] * .8], 6, 9999, { nohit: true })); }
  sim.ents.push(e); return e;
};
N.swapMirror = (sim, id) => {
  const st = WP.STAGE[id]; sim.stage = st; sim.part = 'B'; sim.rail = new WP.Rail(st.rail, st.cam);
  sim.ents = sim.ents.filter(e => WP.TYPES[e.type].kind === 'hostage');
  for (const p of st.props || []) sim.addProp(p);
  sim.quotas = Object.assign({}, st.quotas || {}); sim.quotaMax = Object.assign({}, st.quotas || {});
};
// ---------- a client's world from snapshots ----------
N.applySnap = s => {
  const st = N.state, sim = WP.Flow.sim; if (!sim) return;
  if (s.t < st.lastSnap) return; st.lastSnap = s.t; st.snapN++;
  st.cam = { x: s.c[0], y: s.c[1], h: s.c[2] / 10, angle: s.c[3] / 1000, pitch: s.c[4] / 10, fov: 60 };
  sim.d = s.d; sim.state = ['play', 'boss', 'clear', 'fail', 'done'][s.st] || 'play'; sim.spotted = s.sp ? 1 : 0; sim.flare = s.fl ? 1 : 0;
  Object.keys(sim.quotas).forEach((k, i) => { if (s.q[i] !== undefined) sim.quotas[k] = s.q[i]; });
  if (sim.objective && s.o >= 0) sim.objective.done = s.o;
  sim.hostages.saved = s.hs[0]; sim.hostages.lost = s.hs[1];
  for (const r of s.p) {
    const [pid, x, y, dmg, mag, sp, gren, score, fl, streak, kills, spSum] = r, p = sim.players.find(q => q.pid === pid); if (!p) continue;
    if (pid !== st.me) { p.tx = x / 10; p.ty = y / 10; }
    p.damage = dmg; p.score = score; p.down = !!(fl & 1); p.reloadT = fl & 2 ? Math.max(p.reloadT, .01) : 0; p.fury = fl & 4 ? Math.max(p.fury, 1) : 0; p.streak = streak; p.kills = kills; p.grenades = gren;
    if (pid !== st.me || st.firedSent <= st.fired) { p.mag = mag; const full = Math.round(WP.T.magSize), arr = []; let left = spSum; for (let i = 0; i < sp; i++) { const v = Math.min(full, left - (sp - 1 - i)); arr.push(Math.max(1, v)); left -= arr[i]; } p.spares = arr; }
  }
  const seen = new Set();
  for (const row of s.e) {
    const [id, ti, x, y, z, f, fl, a, b, stt] = row, type = tName(ti); seen.add(id);
    const e = N.ensure(sim, id, type), tp = WP.TYPES[type];
    e.tx = x; e.ty = y; e.tz = z; if (!e.placed) { e.x = x; e.y = y; e.z = z; e.placed = true; }
    e.tf = f / 100; if (e.facing === undefined || !e.placedF) { e.facing = e.tf; e.placedF = true; }
    const wasDead = e.dead; e.dead = !!(fl & 1); if (e.dead && !wasDead) e.stt = 0; else if (!e.dead) e.stt = stt / 10;
    e.hidden = !!(fl & 2); e.chute = !!(fl & 32); e.whistle = fl & 16 ? (e.whistle || { t: 0, T: 2 }) : null;
    e.wounded = tp.kind === 'civ' && !!(fl & 64); e.bolt = tp.kind === 'animal' && !!(fl & 64); e.lost = tp.kind === 'hostage' && !!(fl & 64); e.saved = !!(fl & 128); e.panic = fl & 256 ? 1 : 0; e.grabbedBy = fl & 512 ? 1 : 0;
    e.pose = [null, 'kneel', 'crouch', 'down', 'cheer'][(fl >> 10) & 7]; e.fallen = !!(fl & 8192); e.out = !!(fl & 16384); if (e.fallen && e.topple === undefined) e.topple = 0;
    if (fl & 4) { const spec = tp.fire || WP.TYPES.rifleman.fire; e.atk = { phase: 'tele', t: a / 99, T: 1, pid: b, spec }; } else e.atk = null;
    e.throwing = fl & 8 ? { t: a / 99, T: 1 } : null;
    if (tp.kind === 'vehicle' || tp.kind === 'boat' || tp.kind === 'air' || tp.kind === 'hostage' || tp.kind === 'prop') { e.maxHp = tp.hp || 3; e.hp = a / 99 * e.maxHp; }
    if (tp.kind === 'proj') e.u = a / 99;
    if (tp.kind === 'boss') { e.phase = a; e.intro = !!b; }
    let k = 10;
    if (e.parts && typeof row[k] === 'number') {
      const dead = row[k], tele = row[k + 1], tu = row[k + 2], tpid = row[k + 3]; k += 4;
      e.parts.forEach((q, i) => { q.dead = !!(dead & (1 << i)); q.atk = i === tele ? { phase: 'tele', t: tu / 99, T: 1, pid: tpid, spec: {} } : null; });
      if (tp.kind === 'boss') { e.netHp = row[k]; const tk = row[k + 1]; k += 2; if (tk) { e.tusk = e.tusk || { D: 250, lx: 0, st: 'walk', t: 0, shieldOff: 0 }; e.ttx = tk[0]; e.tty = tk[1]; if (e.tx2 === undefined) { e.tx2 = tk[0]; e.ty2 = tk[1]; } e.tusk.shieldOff = tk[2] ? 1 : 0; e.tusk.st = ['walk', 'aim', 'charge', 'back'][tk[3]]; } }
    }
    if (row[k] === 'c') { e.anchor = 'camNet'; e.lx = row[k + 1]; e.dz = row[k + 2]; }
  }
  // gone: entities the host no longer lists (when every entity fit), or missing for 3 snapshots
  for (const e of sim.ents) { if (seen.has(e.id) || WP.TYPES[e.type].kind === 'prop' && !e.net) { e.miss = 0; continue; } e.miss = (e.miss || 0) + (s.e.length >= s.n ? 3 : 1); if (e.miss >= 3) e.gone = true; }
  sim.ents = sim.ents.filter(e => !e.gone);
};
/** a client's step: smooth the world toward the snapshots, aim and shoot at once, send input and hits */
N.clientStep = (game, sim, dt) => {
  const st = N.state, me = sim.players.find(p => p.pid === st.me);
  sim.t += dt;
  if (st.cam) { const c = sim.cam, k = Math.min(1, dt * 10); for (const f of ['x', 'y', 'h', 'pitch']) c[f] += (st.cam[f] - c[f]) * k; c.angle += WP.lerp(0, st.cam.angle - c.angle, k); sim.view.begin(c); }
  const k = Math.min(1, dt * 12);
  for (const e of sim.ents) {
    e.t += dt; e.stt += dt;
    if (e.tx !== undefined) { const ox = e.x, oy = e.y; e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.z += (e.tz - e.z) * k; e.vx = (e.x - ox) / Math.max(dt, 1e-4); e.vy = (e.y - oy) / Math.max(dt, 1e-4); e.facing += WP.lerp(0, Math.atan2(Math.sin(e.tf - e.facing), Math.cos(e.tf - e.facing)), k); }
    if (e.ttx !== undefined) { e.tx2 += (e.ttx - e.tx2) * k; e.ty2 += (e.tty - e.ty2) * k; e.txx = e.tx2; }
    if (e.parts) WP.placeParts(e);
    if (e.topple !== undefined && e.fallen) e.topple = Math.min(1, e.topple + dt / 1.2);
  }
  if (sim.boss && sim.boss.tusk) { sim.boss.tx = sim.boss.tx2; sim.boss.ty = sim.boss.ty2; }
  for (const p of sim.players) if (p.pid !== st.me && p.tx !== undefined) { p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
  sim.buildShapes();
  // my crosshair, my shots (predicted): tracers and hits at once; the host decides kills
  if (me && !me.down && !me.gone) {
    const ov = WP.Input.overrides[me.pid], f = ov ? ov(sim, me, dt) : WP.Input.local(game, sim, game.input, me.pid, me.slot, dt, {});
    me.x = f.x; me.y = f.y;
    const rate = WP.T.fireRate * (me.fury > 0 ? 2 : 1);
    if (f.grenade) st.g++; if (f.reload) st.r++;
    if (f.fire && me.reloadT <= 0 && (me.mag > 0 || me.fury > 0)) {
      me.fireAcc = (me.fireAcc || 0) - dt;
      if (!me.wasFire || me.fireAcc <= 0) {
        me.fireAcc = 1 / rate; st.fired++; if (me.fury <= 0) me.mag = Math.max(0, me.mag - 1);
        const a = WP.fxr() * Math.PI * 2, rr = Math.sqrt(WP.fxr()) * (WP.T.spreadBase + me.bloom), x = me.x + Math.cos(a) * rr, y = me.y + Math.sin(a) * rr;
        me.bloom = Math.min(WP.T.bloomMax, me.bloom + WP.T.bloomPerShot);
        const s = sim.pick(x, y);
        const fl = s ? null : sim.view.toFloor(x, y), w = s ? sim.view.atDepth(x, y, s.D) : fl ? [fl[0], fl[1], 0] : null;
        if (s) st.hitsOut.push([s.e.id, s.part, s.pp ? s.pp.name : 0]);
        WP.FX.onEvents(sim, [{ k: 'shot', pid: me.pid, sx: x, sy: y, what: s ? WP.TYPES[s.e.type].kind : w ? 'floor' : 'sky', mat: s ? WP.TYPES[s.e.type].mat || 'flesh' : 'dirt', D: s ? s.D : 0, x: w ? w[0] : 0, y: w ? w[1] : 0, z: w ? w[2] : 0, part: s ? s.part : null, id: s ? s.e.id : 0, fury: me.fury > 0 }], WP.ctx);
        WP.Audio.onEvents(sim, [{ k: 'shot', pid: me.pid, sx: x, sy: y, what: s ? 'hit' : 'floor', fury: me.fury > 0 }], WP.ctx);
      }
    }
    me.wasFire = f.fire; me.bloom = Math.max(0, me.bloom - WP.T.bloomRecover * dt);
    if (st.tSend >= 1 / 15) {
      st.tSend = 0; st.seq++;
      if (st.hitsOut.length) { st.hitBatches = (st.hitBatches || []).concat([[++st.hitSeq, st.hitsOut.splice(0, 30)]]).slice(-3); }
      const msg = { k: 'i', s: st.seq, a: [Math.round(me.x * 10), Math.round(me.y * 10)], b: f.fire ? 1 : 0, g: st.g, r: st.r, n: st.fired, h: st.hitBatches || [] };
      if (C.size(msg) > 1100) msg.h = msg.h.slice(-1);
      N.send(msg, false); st.firedSent = st.fired;
    }
  }
  // others' muzzle flashes and tracers from their firing flags would need their fire bit; the host's events carry the rest
  WP.Rigs.update(sim, dt); WP.FX.update(dt); WP.Gun.update(dt, sim.players); WP.HUD.update(dt); WP.Audio.loops(sim, dt);
};
// ---------- the end: finish once (the host), stop on 'end' ----------
N.checkEnd = () => { const sim = WP.Flow.sim; if (sim && !sim.players.some(p => !p.gone && !p.down)) N.finish(); };
N.finish = () => {
  const st = N.state, sim = WP.Flow.sim, H = hub(); if (!st || st.finished || st.role === 'client' || !sim) return;
  st.finished = true;
  const ps = sim.players.filter(p => !p.gone && !st.gone.has(p.pid));
  const groups = {}; for (const p of ps) (groups[p.score] = groups[p.score] || []).push(p.pid);
  const standings = Object.keys(groups).map(Number).sort((a, b) => b - a).map(s => groups[s]);
  const scores = {}, stats = {}; for (const p of ps) { scores[p.pid] = p.score; stats[p.pid] = { kills: p.kills, accuracy: Math.round(p.hits / Math.max(1, p.shots) * 100), headshots: p.headshots, intercepts: p.intercepts, civiliansHit: p.civHits }; }
  const best = (f, inv) => { let b = null; for (const p of ps) if (!b || (inv ? f(p) < f(b) : f(p) > f(b))) b = p; return b; };
  const awards = [];
  if (ps.length) { const a = best(p => p.hits / Math.max(1, p.shots)); awards.push({ id: a.pid, title: 'SHARPSHOOTER', detail: Math.round(a.hits / Math.max(1, a.shots) * 100) + '% accuracy' }); const g = best(p => p.intercepts); awards.push({ id: g.pid, title: 'GUARDIAN', detail: g.intercepts + ' shot out of the air' }); const l = best(p => p.civHits, true); awards.push({ id: l.pid, title: 'LIFESAVER', detail: l.civHits + ' civilians hit' }); }
  const won = sim.state === 'clear' || sim.bossDone;
  H.finish({ standings, scores, won, stats, awards });
  sim.state = 'done';
};
N.end = game => {
  const st = N.state; if (!st) return; st.ended = true;
  WP.Music.stop(game); WP.Audio.muteAll = true; try { game.audio.mute && game.audio.mute(); } catch (e) { /* no sound */ }
  for (const q of game.players || [game.input]) q.clear && q.clear();
};
N.draw = g => {
  const st = N.state, H = hub(); if (!st) return;
  const t = H.time(), F = WP.HUD.F;
  if (t < 0 && t > -4000) { const n = Math.ceil(-t / 1000); E.font.title(g, String(n), WP.W / 2, 90, { scale: 6, colors: ['#ffffff', '#ffd040', '#c86a2a'], outline: '#000', depth: 3, depthColor: '#4a2a08', align: 'center' }); F(g, 'GET READY', WP.W / 2, 150, '#f2ead3', { align: 'center', scale: 2 }); }
  if (st.ended || (WP.Flow.sim && WP.Flow.sim.state === 'done')) { px.blend(g, .5, 'normal', () => px.rect(g, 0, 100, WP.W, 40, '#000')); F(g, 'ROUND OVER', WP.W / 2, 112, '#ffd040', { align: 'center', scale: 2 }); }
  if (st.role === 'server') { px.rect(g, 0, 0, WP.W, WP.H, '#000'); F(g, 'SERVER', 6, 6, '#3a3a3a'); }
};
N.snap = () => { const st = N.state; if (!st) return null; return { role: st.role, me: st.me, op: st.op, started: st.started, playing: st.playing, ended: st.ended, finished: st.finished, sent: st.sent, recv: st.recv, snaps: st.snapN }; };
})();
