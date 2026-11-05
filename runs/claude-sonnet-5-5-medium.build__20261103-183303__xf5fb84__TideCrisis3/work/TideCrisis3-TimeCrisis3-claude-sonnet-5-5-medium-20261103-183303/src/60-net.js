// 60-net.js — AI Hub shared-world co-op (protocol v1, lib/hub). The host runs the authoritative Sim with every player;
// clients send inputs (`in`, unreliable ~15/s) and render snapshots (`s`, unreliable ~10/s, <= 1,100 bytes) plus
// batched events (`ev`, reliable). A token bucket keeps each copy under 18 messages a second. Network only via AIHub.send.
const ANIMS = ['idle', 'crouch', 'stand', 'point', 'run', 'walk', 'air', 'land', 'roll', 'climb', 'windup', 'slash', 'panic'];
const KINDS = ['grenade', 'rocket', 'torpedo', 'flare', 'harpoon', 'missile', 'gl'];
const NET = { bucket: 18, last: 0, sent: 0, seq: 0, inbox: {}, evq: [], snapT: 0, inT: 0, stats: { s: 0, ev: 0, in: 0, maxS: 0 }, over: false, types: null, rem: {}, snap: null, snapAt: 0, ended: false };
const q1 = n => Math.round(n);
function netSend(data, reliable) { const A = window.AIHub; if (!A || NET.over) return false; const now = performance.now(); NET.bucket = Math.min(18, NET.bucket + (now - NET.last) / 1000 * 18); NET.last = now; if (NET.bucket < 1) return false; NET.bucket--; const ok = A.send(data, { reliable }); return ok !== false; }
function typeList() { return NET.types || (NET.types = Object.keys(TC.REG.enemy)); }
// ---- host ----
function netHostInit(sim) {
  const A = window.AIHub; NET.over = false; NET.inbox = {}; NET.evq.length = 0; NET.finished = false; NET.t0 = performance.now(); NET.downT = {};
  A.on('message', (d, from) => { if (!d || !sim.players[from]) return; if (d.t === 'in') { const b = NET.inbox[from] || (NET.inbox[from] = { n: 0, k: 0 }); b.a = [d.a[0] / 1000, d.a[1] / 1000]; b.c = !!d.c; b.f = !!d.f; b.n += d.n | 0; b.k += d.k | 0; b.w = d.w; b.r = !!d.r; b.seen = performance.now(); } });
  A.on('leave', ev => { const p = sim.players[ev.id]; if (p) { p.left = true; p.down = true; p.contFail = true; p.contT = 0; sim.threats = sim.threats.filter(t => t.tgt !== ev.id); } });
  A.on('time-up', () => netFinish(sim, true));
}
function netHostCommands(sim) {
  const cmds = []; for (const p of sim.players) { if (p.id === Run.hub.me && !Run.hub.server) continue; const b = NET.inbox[p.id]; if (!b) { cmds[p.id] = { aim: p.aim, coverDown: p.wantCover }; continue; } const c = { aim: b.a, coverDown: b.c, fireDown: b.f && p.weapon === 1 || b.f && p.weapon === 0, autoFire: true }; if (b.n > 0) { c.firePressed = true; b.n--; } if (b.k > 0) { c.next = true; b.k--; } if (b.w != null && b.w !== p.weapon && (b.w === 0 || p.ammo[b.w] > 0)) c.select = b.w + 1; b.w = null; cmds[p.id] = c; }
  return cmds;
}
function netHostStep(sim, dt) {
  const A = window.AIHub; if (!A || NET.over) return; const now = performance.now();
  // recompose events for clients
  for (const ev of sim.events) { const e = Object.assign({}, ev); if (e.pos) e.pos = e.pos.map(q1); if (e.from) e.from = e.from.map(q1); if (e.to) e.to = e.to.map(q1); if (e.sp) e.sp = e.sp.map(q1); delete e.t; if (ev.type === 'threat') { e.at = +(sim.threats.find(t => t.id === ev.id) ? sim.threats.find(t => t.id === ev.id).at : sim.t + ev.tel).toFixed(2); } NET.evq.push(e); }
  if (NET.evq.length > 60) NET.evq.splice(0, NET.evq.length - 60);
  // auto-return of downed players (-5,000)
  for (const p of sim.players) if (p.down && !p.left) { NET.downT[p.id] = (NET.downT[p.id] || 0) + dt; if (NET.downT[p.id] > 6) { NET.downT[p.id] = 0; p.down = false; p.contT = 0; p.contFail = false; p.lives = 3; p.score = Math.max(0, p.score - 5000); p.inv = 2; sim.over = false; if (sim.phase === 'over') sim.phase = 'action'; sim.emit('continue', { p: p.id }); } }
  NET.evAcc = (NET.evAcc || 0) + dt; NET.snapT += dt;
  if (NET.evAcc >= .125 && NET.evq.length) { NET.evAcc = 0; const batch = NET.evq.splice(0, 12); netSend({ t: 'ev', e: batch }, true); NET.stats.ev++; }
  if (NET.snapT >= .1) { NET.snapT = 0; const s = buildSnapshot(sim); const n = JSON.stringify(s).length; NET.stats.maxS = Math.max(NET.stats.maxS, n); if (netSend(s, false)) NET.stats.s++; }
  // end of round
  const alive = sim.players.filter(p => !p.left);
  if (!NET.finished && (sim.phase === 'stageclear' || !alive.length)) netFinish(sim, false);
}
function buildSnapshot(sim) {
  const types = typeList(), pl = sim.players.map(p => [p.id, p.score, p.lives, p.chain, p.weapon, p.ammo[p.weapon] | 0, Math.round(p.c * 100), p.down ? 1 : 0, p.mag, p.ammo[1] | 0, p.ammo[2] | 0, p.ammo[3] | 0]);
  const pose = sim.pose(0); let en = sim.enemies.filter(e => !(e.gone && e.dt > 1)).map(e => [e.id, types.indexOf(e.type), q1(e.x), q1(e.y), q1(e.foot), Math.round(e.p * 100), Math.max(0, ANIMS.indexOf(e.anim)), (e.dead ? 1 : 0) | (e.flash > 0 ? 2 : 0) | (e.shield && e.shieldUp ? 4 : 0) | (e.zapping ? 8 : 0) | (e.civ ? 16 : 0), e.hp > 0 ? Math.round(e.hp * 10) : 0, e.deathStyle === 'flyback' ? 1 : e.deathStyle === 'spin' ? 2 : 0]);
  const pr = sim.proj.filter(p => !p.dead && p.team !== 'p').map(p => [p.id, KINDS.indexOf(p.kind), q1(p.x), q1(p.y), q1(p.z)]);
  const s = { t: 's', at: +sim.t.toFixed(2), ph: ['idle', 'travel', 'action', 'clear', 'boss', 'stageclear', 'over'].indexOf(sim.phase), sc: sim.sceneId, tm: +sim.timer.toFixed(1), d: q1(sim.rail), pt: +sim.pt.toFixed(2), p: pl, e: en, pr };
  if (sim.boss) { const B = sim.boss; s.b = [B.id, B.phase, B.anim.mode || '', q1(B.pos[0]), q1(B.pos[1]), q1(B.pos[2]), Object.keys(B.parts).map(k => Math.round(B.parts[k].hp * 10) * (B.parts[k].dead ? -1 : 1) + (B.parts[k].dead ? -1 : 0)), B.toppled ? 1 : 0, B.shield ? 1 : 0, B.dead ? 1 : 0]; }
  // budget: drop the enemies furthest from the first camera until it fits
  let n = JSON.stringify(s).length; if (n > 1080) { const cx = pose.x, cy = pose.y; s.e.sort((a, b) => Math.hypot(a[2] - cx, a[3] - cy) - Math.hypot(b[2] - cx, b[3] - cy)); while (JSON.stringify(s).length > 1080 && s.e.length > 1) s.e.pop(); }
  return s;
}
function netFinish(sim, timeUp) {
  const A = window.AIHub; if (NET.finished || !A) return; NET.finished = true;
  const ps = sim.players, sorted = ps.map(p => p.id).sort((a, b) => ps[b].score - ps[a].score), standings = []; for (const id of sorted) { const last = standings[standings.length - 1]; if (last && ps[last[0]].score === ps[id].score) last.push(id); else standings.push([id]); }
  const scores = {}, stats = {}, acc = ps.map(p => p.st.shots ? p.st.hits / p.st.shots : 0); for (const p of ps) { scores[p.id] = p.score; stats[p.id] = { Kills: p.st.kills, Accuracy: Math.round(acc[p.id] * 100) + '%', Headshots: p.st.heads, 'Cover saves': p.st.saves, 'Lives lost': p.st.lost }; }
  const awards = []; const best = (f, title, detail) => { let bi = -1, bv = 0; ps.forEach((p, i) => { const v = f(p, i); if (v > bv) { bv = v; bi = i; } }); if (bi >= 0) awards.push({ id: bi, title, detail: detail(bv) }); };
  best((p, i) => p.st.shots > 5 ? acc[i] : 0, 'Sharpshooter', v => Math.round(v * 100) + '% accuracy'); best(p => p.st.kills, 'Pointman', v => v + ' kills'); best(p => p.st.saves, 'Iron Wall', v => v + ' cover saves');
  try { A.finish({ standings, scores, won: !!(sim.boss && sim.boss.dead) || sim.phase === 'stageclear', stats, awards }); } catch (e) { game.fail('hub finish', e); }
}
// ---- client ----
function netClientInit(sim) {
  const A = window.AIHub; NET.over = false; NET.snap = null; NET.evq.length = 0; NET.sentC = { n: 0, k: 0 };
  A.on('message', (d, from) => {
    if (!d) return; if (d.t === 's') { NET.snap = d; NET.snapAt = performance.now(); applySnapshot(sim, d); }
    else if (d.t === 'ev') { for (const e of d.e) NET.evq.push(e); }
  });
  A.on('leave', ev => { const p = sim.players[ev.id]; if (p) p.left = true; });
}
function applySnapshot(sim, s) {
  const types = typeList(); sim.timer = s.tm; sim.rail = s.d; sim.pt = s.pt; const ph = ['idle', 'travel', 'action', 'clear', 'boss', 'stageclear', 'over'][s.ph]; if (ph) { if (ph === 'action' && sim.phase === 'travel') { sim.travelDone = true; sim.actionT = 0; } sim.phase = ph; }
  if (s.sc && s.sc !== sim.sceneId) { sim.jump(+s.sc[0] || sim.stage, s.sc, {}); sim.phase = ph || 'travel'; }
  for (const a of s.p) { const p = sim.players[a[0]]; if (!p) continue; p.score = a[1]; p.lives = a[2]; p.chain = a[3]; if (a[0] !== Run.hub.me) { p.weapon = a[4]; p.c = a[6] / 100; } else { p.weapon = a[4]; p.ammo[p.weapon] = a[5]; } p.down = !!a[7]; p.mag = a[8]; p.ammo[1] = a[9]; p.ammo[2] = a[10]; p.ammo[3] = a[11]; if (a[0] !== Run.hub.me) p.aim = p.aim; if (a[0] === Run.hub.me) { if (Math.abs(p.c - a[6] / 100) > .5) { p.cdis = (p.cdis || 0); } } }
  const seen = new Set(); for (const a of s.e) { let e = sim.enemies.find(x => x.id === a[0]); const dead = !!(a[7] & 1); if (!e) { e = { id: a[0], type: types[a[1]], x: a[2], y: a[3], foot: a[4], z: a[4], bx: a[2], by: a[3], bz: 0, p: a[5] / 100, st: 'rep', hp: 1, maxHp: 1, flash: 0, hurtT: 0, stagger: 0, dead: false, dt: 0, civ: false, size: (reg('enemy', types[a[1]]).look || {}).size || 1, skin: SKIN[a[0] % 4], peek: 'up', anim: 'idle', tx: a[2], ty: a[3], tf: a[4] }; sim.enemies.push(e); }
    e.tx = a[2]; e.ty = a[3]; e.tf = a[4]; e.p = a[5] / 100; e.anim = ANIMS[a[6]] || 'idle'; e.flash = a[7] & 2 ? .08 : 0; e.shield = e.type === 'shield'; e.shieldUp = !!(a[7] & 4); e.zapping = !!(a[7] & 8); e.civ = !!(a[7] & 16); e.hp = a[8] / 10; e.deathStyle = a[9] === 1 ? 'flyback' : a[9] === 2 ? 'spin' : 'crumple'; if (dead && !e.dead) { e.dead = true; e.dt = 0; } seen.add(e.id); }
  sim.enemies = sim.enemies.filter(e => seen.has(e.id) || (e.dead && e.dt < 2.2)); for (const e of sim.enemies) if (!seen.has(e.id) && !e.dead) e.dead = true;
  const keep = new Map(sim.proj.map(p => [p.id, p])); sim.proj = s.pr.map(a => { const old = keep.get(a[0]); const p = old || { id: a[0], team: 'e', hp: 1, r: 6, vx: 0, vy: 0, vz: 0 }; p.kind = KINDS[a[1]]; p.tx = a[2]; p.ty = a[3]; p.tz = a[4]; if (!old) { p.x = a[2]; p.y = a[3]; p.z = a[4]; } return p; });
  if (s.b) { const [id, phase, mode, x, y, z, hps, topp, shield, dead] = s.b; if (!sim.boss || sim.boss.id !== id) { sim.boss = null; sim.replica = true; sim.spawnBoss(id, {}); } const B = sim.boss; B.phase = phase; B.anim.mode = mode; B.pos = [x, y, z]; B.toppled = !!topp; B.shield = !!shield; B.dead = !!dead; B.intro = false; Object.keys(B.parts).forEach((k, i) => { const v = hps[i]; if (v == null) return; const dd = v < 0 || (v === 0 && false); const hp = Math.abs(v) / 10; B.parts[k].hp = dd ? 0 : (B.parts[k].hp > 0 ? hp : hp); B.parts[k].dead = v < 0; }); sim.phase = dead ? sim.phase : 'boss'; } else if (sim.boss && !sim.boss.dead) sim.boss = null;
}
function netReplicaStep(sim, dt, cmds) {
  const me = Run.hub.me, p = sim.players[me], cmd = cmds[me] || {}; sim.events.length = 0; sim.t += dt;
  // predicted cover
  const tgt = cmd.coverDown ? 1 : 0, rate = tgt > p.c ? 1 / tune.player.coverIn : 1 / tune.player.coverOut; p.c = approach(p.c, tgt, rate * dt); if (cmd.aim) p.aim = cmd.aim;
  // smoothing of the world toward the latest snapshot
  const k = Math.min(1, dt * 14); for (const e of sim.enemies) { if (e.tx != null) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.foot += (e.tf - e.foot) * k; } if (e.dead) e.dt += dt; e.flash = Math.max(0, e.flash - dt); } for (const pr of sim.proj) { if (pr.tx != null) { pr.x += (pr.tx - pr.x) * k; pr.y += (pr.ty - pr.y) * k; pr.z += (pr.tz - pr.z) * k; } }
  // events from the host
  const evs = NET.evq.splice(0); for (const e of evs) { if (e.type === 'threat') { sim.threats.push({ id: e.id, src: e.src, tgt: e.tgt, t0: sim.t, at: sim.t + e.tel, tel: e.tel, kind: e.kind, sp: e.sp }); } else if (e.type === 'break' && e.idx >= 0 && sim.objs[e.idx]) sim.objs[e.idx].dead = true; else if (e.type === 'shot' && e.p === me) { sim.events.push(e); continue; } sim.events.push(e); }
  sim.threats = sim.threats.filter(t => t.at > sim.t - .05); if (sim.pt != null && sim.phase === 'travel') sim.pt += dt;
  // input to the host (unreliable, ~15/s)
  NET.inT += dt; if (cmd.firePressed) NET.sentC.n++; if (cmd.next) NET.sentC.k++;
  if (NET.inT >= 1 / 15) { NET.inT = 0; if (netSend({ t: 'in', a: [Math.round(p.aim[0] * 1000), Math.round(p.aim[1] * 1000)], c: cmd.coverDown ? 1 : 0, f: cmd.fireDown ? 1 : 0, n: NET.sentC.n, k: NET.sentC.k, w: p.weapon }, false)) { NET.stats.in++; NET.sentC.n = 0; NET.sentC.k = 0; } }
  p.exposedSince = p.exposedSince || 0; sim.ticks = 0;
}
