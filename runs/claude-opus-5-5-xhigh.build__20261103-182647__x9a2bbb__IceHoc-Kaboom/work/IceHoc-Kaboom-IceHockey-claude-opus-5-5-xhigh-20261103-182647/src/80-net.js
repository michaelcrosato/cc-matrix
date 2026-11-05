/* ---- NET (section 14): AI Hub sessions, shared-world. The host runs Match.step with the CPU and every remote player's
 * intent; it sends a snapshot 15 times a second (unreliable, integers, under 1,200 bytes) with the recent events, and
 * calls AIHub.finish once. Clients send their intent 15 times a second (press counters, so a lost packet loses no tap),
 * draw the others about 120 ms behind the newest snapshot, predict their own skater with the pure skateStep, and play
 * the effects, sounds and commentary of the events they receive. Only the hub carries traffic ---- */
const Net = (() => {
  const st = { active: false, info: null, role: 'off', me: -1, players: [], seat: {}, ended: false, endReason: null, started: false, card: null, finished: false, ready: false,
    snaps: [], lastAt: -Infinity, seq: 0, pend: [], counters: { pass: 0, shoot: 0, deke: 0, lob: 0, chirp: 0, switch: 0 }, inputs: {}, applied: {}, acks: {}, seen: new Set(), evq: [], sentT: 0, tick: 0, pred: null, overlay: false, leftIds: new Set(), startedWith: 0, msgs: 0, msgT: 0 };
  const PH = ['intro', 'faceoff', 'play', 'stoppage', 'goal', 'replay', 'periodEnd', 'intermission', 'fight', 'final', 'shootout', 'so_card', 'so_result', 'intermission_wait'];
  const SST = ['skate', 'stop', 'wind', 'shoot', 'pass', 'check', 'deke', 'poke', 'stun', 'down', 'getup', 'celebrate', 'faceoff', 'fight', 'bin', 'frozen', 'buried', 'slip', 'offbal', 'blasted'];
  const GST = ['ready', 'shuffle', 'butterfly', 'glove', 'blocker', 'stack', 'poke', 'cover', 'blasted', 'celebrate', 'down', 'manual'];
  const BTN = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch'];
  const EVS = ['goal', 'save', 'post', 'hit', 'glass', 'fight_start', 'fight_end', 'fight_hit', 'kaboom_start', 'kaboom_end', 'shot', 'pass', 'stop', 'item', 'hazard', 'period_end', 'final', 'faceoff_drop', 'stoppage', 'chirp', 'blast', 'knockdown', 'deke', 'item_throw', 'sin_bin', 'sin_bin_end', 'onetimer', 'turtle', 'gloves', 'mascot_down', 'thin_ice_break', 'plunge', 'rattle', 'puck_boards', 'puck_glass', 'pass_complete', 'possession', 'ot_start', 'hat_trick', 'windup'];
  const STR = ['', 'wrist', 'slap', 'onetimer', 'kaboom', 'deke', 'rebound', 'deflect', 'own', 'scramble', 'glove', 'blocker', 'pad', 'body', 'bump', 'check', 'big', 'cracked', 'shattered', 'pickup', 'catch', 'battle', 'center', 'freeze', 'out', 'fight', 'hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox', 'cocoa', 'octopus', 'rat', 'saucer', 'blast', 'blast-held'];
  const NUMS = ['team', 'by', 'victim', 'goalie', 'winner', 'loser', 'a', 'b', 'power', 'speed', 'net', 'panel', 'line', 'from', 'to', 'who', 'n', 'target'];
  const STRS = ['kind', 'state', 'why', 'how', 'dot'];
  const BOOLS = ['big', 'freeze', 'ppg', 'onGoal', 'bar', 'draw', 'ot', 'spin', 'gilded'];
  const enc = e => { const o = [e.id, EVS.indexOf(e.type), Math.round(e.x || 0), Math.round(e.y || 0)]; let mask = 0; NUMS.forEach((k, i) => { if (typeof e[k] === 'number') { mask |= 1 << i; o.push(Math.round(e[k])); } }); o.splice(4, 0, mask); let sm = 0; const sv = []; STRS.forEach((k, i) => { if (typeof e[k] === 'string' && STR.indexOf(e[k]) >= 0) { sm |= 1 << i; sv.push(STR.indexOf(e[k])); } }); let bm = 0; BOOLS.forEach((k, i) => { if (e[k]) bm |= 1 << i; }); o.push(sm, ...sv, bm); if (e.assists) o.push(e.assists.length, ...e.assists); return o; };
  const dec = a => { const e = { id: a[0], type: EVS[a[1]], x: a[2], y: a[3] }; const mask = a[4]; let k = 5; NUMS.forEach((n, i) => { if (mask & (1 << i)) e[n] = a[k++]; }); const sm = a[k++]; STRS.forEach((n, i) => { if (sm & (1 << i)) e[n] = STR[a[k++]]; }); const bm = a[k++]; BOOLS.forEach((n, i) => { if (bm & (1 << i)) e[n] = true; }); if (k < a.length) { const nA = a[k++]; e.assists = a.slice(k, k + nA); } return e; };
  const q = v => Math.round(v);
  /** the host's snapshot of the match */
  function snapshot(m) {
    const ents = m.skaters.map(s => [s.id, q(s.x), q(s.y), q(s.vx), q(s.vy), Math.round(((s.facing % TAU) + TAU) % TAU / TAU * 255), SST.indexOf(s.state), q(s.stateT * 10), (m.puck.owner === s ? 1 : 0) | (s.turboOn ? 2 : 0) | (s.offIce ? 4 : 0) | (s.charging ? 8 : 0) | (s.state === 'bin' ? 16 : 0), q(s.turbo * 100), q(s.charge * 100)])
      .concat(m.goalies.map(g => [g.id, q(g.x), q(g.y), 0, q(g.vy), 0, GST.indexOf(g.state), q(g.stateT * 10), g.offIce ? 4 : 0, 0, 0]));
    const pk = m.puck, ev = st.evq.filter(e => m.t - e._t < 1.1).slice(-8).map(e => enc(e));
    const s = { t: 's', n: st.tick, at: Math.round(AIHub.time()), ph: PH.indexOf(m.phase), p: m.period, k: q(m.clock * 10), sc: [m.teams[0].score, m.teams[1].score], b: [q(m.boom[0]), q(m.boom[1]), q(m.kaboom[0] * 10), q(m.kaboom[1] * 10)],
      pk: [q(pk.x * 2), q(pk.y * 2), q(pk.z * 2), q(pk.vx), q(pk.vy), q(pk.vz), pk.owner ? pk.owner.id : -1, pk.onFire ? 1 : 0, pk.inNet], e: ents, hu: m.humans.map(h => [h.pid === undefined ? -1 : h.pid, h.skater.id]), ack: st.acks, ev,
      it: m.items.slice(0, 6).map(i => [STR.indexOf(i.kind), q(i.x), q(i.y), q(i.z)]), sh: [m.teams[0].shots, m.teams[1].shots], gl: Rink.panels.filter(p => p.state !== 'ok').map(p => p.i * 2 + (p.state === 'shattered' ? 1 : 0)), ice: (m.ice || []).map(p => p.hole > 0 ? 2 : p.hp < 100 ? 1 : 0) };
    if (m.fight) { const F = m.fight, a = m.byId(F.a), b = m.byId(F.b); s.f = [F.a, F.b, q(F.x), q(F.y), q(a.fight ? a.fight.bal : 0), q(b.fight ? b.fight.bal : 0), q(a.fight ? a.fight.sta : 0), q(b.fight ? b.fight.sta : 0), MOVE_I(a), MOVE_I(b), F.winner]; }
    if (m.so) s.so = [m.so.marks[0].map(Number), m.so.marks[1].map(Number)];
    return s;
  }
  const MOVES_L = [null, 'jab', 'hay', 'duck', 'yank'], MOVE_I = s => s.fight && s.fight.act ? MOVES_L.indexOf(s.fight.act) * 10 + (s.fight.ph === 'wind' ? 1 : s.fight.ph === 'active' ? 2 : 3) : 0;
  /** host: a client's intent as the skater's intent (counters become presses) */
  function intentFor(m, s) {
    const hu = s.ctrl.human, it = s.intent; if (!hu) return;
    const pk = st.inputs[hu.pid]; AI.clearPress(it);
    if (!pk || st.leftIds.has(hu.pid)) { it.mx = it.my = 0; it.held.shoot = it.held.lob = it.held.turbo = false; return; }
    it.mx = (pk.mx || 0) / 100; it.my = (pk.my || 0) / 100; it.face = null; it.back = false;
    it.held.shoot = !!(pk.h & 1); it.held.lob = !!(pk.h & 2); it.held.turbo = !!(pk.h & 4);
    it.aim = pk.ax !== undefined ? [pk.ax, pk.ay] : null;
    const was = st.applied[hu.pid] || (st.applied[hu.pid] = pk.c.slice());
    BTN.forEach((b, i) => { const d = ((pk.c[i] - was[i]) % 256 + 256) % 256; if (d > 0 && d < 128) { it.press[b] = true; was[i] = (was[i] + 1) % 256; } });
  }
  /** client: this copy's intent for the host, counting presses */
  function sendInput(dt) {
    const I = game.input, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    for (const b of BTN) if (I.pressed(b)) st.counters[b] = (st.counters[b] + 1) % 256;
    st.sentT += dt; if (st.sentT < 1 / 15) return; st.sentT = 0;
    const pkt = { t: 'in', s: ++st.seq, at: Math.round(AIHub.time()), mx: Math.round(d[0] * 100), my: Math.round(d[1] * 100), h: (I.down('shoot') ? 1 : 0) | (I.down('lob') ? 2 : 0) | (I.down('turbo') ? 4 : 0), c: BTN.map(b => st.counters[b]) };
    const w = I.lastDevice === 'mouse' ? Cam.mouseWorld() : null; if (w) { pkt.ax = Math.round(w[0]); pkt.ay = Math.round(w[1]); }
    st.pend.push({ s: pkt.s, mx: d[0], my: d[1], turbo: !!(pkt.h & 4) }); if (st.pend.length > 60) st.pend.shift();
    send(pkt, { to: st.info.host, reliable: false });
  }
  function send(data, o) { if (st.ended) return; try { AIHub.send(data, o); st.msgs++; } catch (e) { game.fail('net send', e); } }
  /** client: take a snapshot into the match (the others interpolated later, the own skater reconciled) */
  function onSnap(s) {
    if (s.at < st.lastAt) return; st.lastAt = s.at; st.snaps.push(s); if (st.snaps.length > 12) st.snaps.shift();
    const m = Match.m; if (!m) return;
    const ph = PH[s.ph] || 'play'; if (ph !== m.phase) { if (ph === 'replay' && !Replay.on) Replay.startGoal(m); if (ph !== 'replay' && Replay.on) Replay.stop(); m.phase = ph; }
    m.period = s.p; m.clock = s.k / 10; m.teams[0].score = s.sc[0]; m.teams[1].score = s.sc[1]; m.boom[0] = s.b[0]; m.boom[1] = s.b[1]; m.kaboom[0] = s.b[2] / 10; m.kaboom[1] = s.b[3] / 10; m.teams[0].shots = s.sh[0]; m.teams[1].shots = s.sh[1];
    // who holds whom
    for (const [pid, sid] of s.hu) { const hu = m.humans.find(h => h.pid === pid), sk = m.byId(sid); if (hu && sk && hu.skater !== sk) { const old = hu.skater; sk.ctrl = old.ctrl; old.ctrl = { kind: 'cpu' }; hu.skater = sk; } }
    for (const p of Rink.panels) p.state = 'ok'; for (const v of s.gl || []) { const p = Rink.panels[v >> 1]; if (p) p.state = v & 1 ? 'shattered' : 'cracked'; }
    (s.ice || []).forEach((v, i) => { const p = m.ice[i]; if (p) { p.hole = v === 2 ? 1 : 0; p.hp = v ? 50 : 100; } });
    m.items = (s.it || []).map(([k, x, y, z]) => ({ kind: STR[k], x, y, z, t: 10 }));
    if (s.so) m.so = m.so || { marks: [[], []], att: null }, m.so.marks = s.so.map(a => a.map(Boolean));
    if (s.f) { const [a, b, fx, fy, ba, bb, sa, sb, ma, mb, w] = s.f, A2 = m.byId(a), B = m.byId(b); m.fight = { a, b, x: fx, y: fy, gear: (m.fight && m.fight.gear) || [], winner: w }; for (const [S2, bal, sta, mv] of [[A2, ba, sa, ma], [B, bb, sb, mb]]) { S2.fight = S2.fight || { yanks: [] }; S2.fight.bal = bal; S2.fight.sta = sta; const act = MOVES_L[Math.floor(mv / 10)], ph2 = mv % 10; S2.fight.act = act; S2.fight.ph = ph2 === 1 ? 'wind' : ph2 === 2 ? 'active' : 'recover'; } } else if (m.fight) { for (const S2 of m.skaters) S2.fight = null; m.fight = null; }
    for (const a of s.ev || []) { if (st.seen.has(a[0])) continue; st.seen.add(a[0]); if (st.seen.size > 400) st.seen = new Set(Array.from(st.seen).slice(-200)); const e = dec(a); if (e.type) try { Bus.present(e); } catch (err) { game.fail('net event', err); } }
    // reconcile the own skater: the snapshot's state, then the intents the host hasn't seen yet
    const hu = m.humans.find(h => h.kind === 'local'); if (hu) { const row = s.e.find(r => r[0] === hu.skater.id), ack = s.ack ? s.ack[st.me] || 0 : 0; if (row) { const p = { x: row[1], y: row[2], vx: row[3], vy: row[4], facing: row[5] / 255 * TAU, stopT: 0, turbo: row[9] / 100, rest: 0 }; for (const it of st.pend) if (it.s > ack) for (let k = 0; k < 8; k++) Skater.skateStep(p, { mx: it.mx, my: it.my, turbo: it.turbo }, { vmax: Skater.vmax(hu.skater, m) }, 1 / 120); st.pend = st.pend.filter(it => it.s > ack); st.pred = p; } }
  }
  /** client: each frame, the others between the two snapshots around render time, the own skater predicted */
  function clientStep(m, dt) {
    const S2 = st.snaps; if (!S2.length) return;
    const rt = AIHub.time() - 120; let a = S2[0], b = S2[S2.length - 1];
    for (let i = 0; i < S2.length - 1; i++) if (S2[i].at <= rt && S2[i + 1].at >= rt) { a = S2[i]; b = S2[i + 1]; break; }
    const k = b.at > a.at ? clamp((rt - a.at) / (b.at - a.at), 0, 1.2) : 1, own = (m.humans.find(h => h.kind === 'local') || {}).skater;
    const lerpRow = (ra, rb) => ra && rb ? ra.map((v, i) => i === 5 ? v : lerp(v, rb[i], k)) : ra || rb;
    for (const ent of m.skaters.concat(m.goalies)) {
      const ra = a.e.find(r => r[0] === ent.id), rb = b.e.find(r => r[0] === ent.id), r = lerpRow(ra, rb); if (!r) continue;
      const isG = ent.id >= 100;
      if (ent === own && st.pred) { const p = st.pred; Skater.skateStep(p, (() => { const mv = game.input.move(), d = game.view.screenDirToGround(mv[0], mv[1]); return { mx: d[0], my: d[1], turbo: game.input.down('turbo') }; })(), { vmax: Skater.vmax(own, m) }, dt); Rink.clampBody(p, 7); const ex = p.x - own.x, ey = p.y - own.y; if (Math.hypot(ex, ey) > 48) { own.x = p.x; own.y = p.y; } else { own.x += ex * Math.min(1, dt / .1); own.y += ey * Math.min(1, dt / .1); } own.vx = p.vx; own.vy = p.vy; own.facing = p.facing; }
      else { ent.x = r[1]; ent.y = r[2]; ent.vx = r[3]; ent.vy = r[4]; if (!isG) ent.facing = (rb || ra)[5] / 255 * TAU; }
      const row = rb || ra;
      if (isG) { ent.state = GST[row[6]] || 'ready'; ent.stateT = row[7] / 10; ent.offIce = !!(row[8] & 4); }
      else { ent.state = SST[row[6]] || 'skate'; ent.stateT = row[7] / 10; ent.turboOn = !!(row[8] & 2); ent.offIce = !!(row[8] & 4); ent.charging = !!(row[8] & 8); ent.turbo = row[9] / 100; ent.charge = row[10] / 100; ent.shootHeld = ent.charging ? .3 : 0; }
    }
    const pa = a.pk, pb = b.pk, own2 = pb[6] >= 0 ? m.byId(pb[6]) : null;
    m.puck.owner = own2; m.puck.onFire = !!pb[7]; m.puck.inNet = pb[8];
    if (own2) { const [bx, by] = Skater.blade(own2); m.puck.x = bx; m.puck.y = by; m.puck.z = 0; } else { m.puck.x = lerp(pa[0], pb[0], k) / 2; m.puck.y = lerp(pa[1], pb[1], k) / 2; m.puck.z = lerp(pa[2], pb[2], k) / 2; m.puck.vx = pb[3]; m.puck.vy = pb[4]; }
    for (const s of m.skaters) Skater.pose(m, s, dt);
    for (const g of m.goalies) { const hk = g.rig.hk; hk.gst = g.state === 'butterfly' || g.state === 'cover' ? 'butterfly' : g.state === 'stack' ? 'stack' : g.state === 'shuffle' ? 'shuffle' : 'ready'; hk.gw = 1; g.facing = Goalie.out(m, g) > 0 ? 0 : PI; g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.facing, down: g.state === 'blasted' ? 1 : 0, pose: g.state === 'celebrate' ? 'cheer' : null }); }
    Replay.record(m);
  }
  /** host: the round's result for the hub (once) */
  function finish(m, why) {
    if (st.finished || !st.info || !st.info.isHost) return; st.finished = true;
    const humans = m.humans.filter(h => h.pid !== undefined && !st.leftIds.has(h.pid)), ids = t => humans.filter(h => h.team === t).map(h => h.pid);
    const s0 = m.teams[0].score, s1 = m.teams[1].score, w = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;
    let standings; if (w < 0) standings = [humans.map(h => h.pid)]; else standings = [ids(w), ids(1 - w)].filter(a => a.length);
    if (!standings.length) standings = [[]];
    const scores = {}, stats = {}; for (const h of m.humans) { if (h.pid === undefined) continue; const S2 = m.skaters.filter(s => s.team === h.team); const me = h.skater; scores[h.pid] = (me.stats.goals + me.stats.assists); stats[h.pid] = { Goals: me.stats.goals, Assists: me.stats.assists, Hits: me.stats.hits, Fights: me.stats.fightsWon }; void S2; }
    const stars = Match.threeStars(m), awards = []; stars.forEach((id, i) => { const h = m.humans.find(hh => hh.skater && hh.skater.id === id && hh.pid !== undefined); if (h) awards.push({ id: h.pid, title: ['1st Star', '2nd Star', '3rd Star'][i], detail: h.name }); });
    const res = { standings, scores, stats, awards }; if (humans.length === 1 && st.players.length === 1) res.won = w === humans[0].team;
    try { send(Object.assign(snapshot(m), { over: 1 }), { reliable: true }); AIHub.finish(res); } catch (e) { game.fail('net finish', e); }
    Bus.emit('session_finish', { why });
  }
  async function connect() {
    if (!HUB) return null;
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
    if (!info) { st.active = false; game.go('title'); return null; }
    st.active = true; st.info = info; st.me = info.me; st.players = info.players.slice().sort((a, b) => a.id - b.id); st.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
    const rng = AIHub.rng('setup'), pool = TEAM_ORDER.filter(id => !TEAMS[id].locked), home = pool[Math.floor(rng() * pool.length)], awayPool = pool.filter(id => id !== home), away = awayPool[Math.floor(rng() * awayPool.length)], arena = ARENA_ORDER[Math.floor(rng() * ARENA_ORDER.length)];
    st.players.forEach((p, i) => { st.seat[p.id] = st.players.length === 1 ? 0 : i % 2; });
    const humans = st.players.map(p => ({ team: st.seat[p.id], pid: p.id, name: U.sanitize(p.name), color: p.color || E.PLAYER_COLORS[p.id] || '#ffd36a', tag: U.sanitize(p.name, 6).toUpperCase(), kind: p.id === st.me && !info.server ? 'local' : 'remote', input: p.id === st.me && !info.server ? game.input : null }));
    const simRng = AIHub.rng('sim'), seed = Math.floor(simRng() * 1e9);
    const cfg = { mode: 'session', home, away, arena, periods: 1, periodLen: 180, ot: 'sudden', otLen: 60, otCap: 60, shootout: false, intros: false, replays: 'auto', flood: 'never', humans, seed, difficulty: 'pro', noAutoSwitch: false };
    const m = Match.create(cfg); m.setPhase('intro', 1e9);
    // a 2-on-1: the lone human's CPU teammates get +.15 (aiSkill does it)
    st.startedWith = st.players.length;
    AIHub.on('card', c => { st.card = c; });
    AIHub.on('start', () => { st.started = true; Synth.music(m.arena.music === 'play' ? 'play' : m.arena.music); });
    AIHub.on('message', (data, from) => {
      if (!data || st.ended) return;
      if (st.info.isHost && data.t === 'in') { const prev = st.inputs[from]; if (!prev || data.s > prev.s) { st.inputs[from] = data; st.acks[from] = data.s; } }
      else if (!st.info.isHost && from === st.info.host && data.t === 's') { onSnap(data); if (data.over) st.over = true; }
    });
    AIHub.on('leave', ({ id }) => {
      st.leftIds.add(id); const hu = m.humans.find(h => h.pid === id); if (hu && hu.skater) { hu.skater.ctrl = { kind: 'cpu' }; hu.skater.ai.thinkT = 0; hu.gone = true; }
      if (st.info.isHost && st.startedWith >= 2 && m.humans.filter(h => h.pid !== undefined && !st.leftIds.has(h.pid)).length <= 1) finish(m, 'leave');
    });
    AIHub.on('time-up', () => { if (st.info.isHost) finish(m, 'time-up'); });
    AIHub.on('end', ({ reason }) => { st.ended = true; st.endReason = reason; Synth.music(null); try { A.mute(true); } catch (e) { /* no sound */ } Synth.crowdOff(); });
    World.prepare(m); st.ready = true;
    AIHub.ready();
    return info;
  }
  /** each step of the session scene */
  function step(dt) {
    const m = Match.m; if (!m || !st.active || st.ended) return;
    const t = AIHub.time();
    if (st.info.isHost) {
      if (st.started && t >= 0 && m.phase === 'intro') Match.placeFaceoff(m, 'center');
      if (t >= 0 || m.phase !== 'intro') Match.step(dt);
      if (m.phase === 'final' && m.phaseT <= 2) finish(m, 'final');
      st.tick++; st.snapT = (st.snapT || 0) + dt; if (st.snapT >= 1 / 15 && st.players.length + (st.info.server ? 0 : 0) > 0) { st.snapT = 0; if (st.players.some(p => p.id !== st.me)) send(snapshot(m), { reliable: false }); }
    } else { sendInput(dt); clientStep(m, dt); }
  }
  // the host keeps the recent events for its snapshots
  Bus.on('*', e => { if (st.active && st.info && st.info.isHost && EVS.includes(e.type)) { e._t = Match.m ? Match.m.t : 0; st.evq.push(e); if (st.evq.length > 40) st.evq.shift(); } });
  return { st, connect, step, intentFor, snapshot, onSnap, finish, enc, dec, state: () => ({ role: st.role, players: st.players.length, ended: st.ended, started: st.started, finished: st.finished }), get ended() { return st.ended; }, get active() { return st.active; } };
})();
