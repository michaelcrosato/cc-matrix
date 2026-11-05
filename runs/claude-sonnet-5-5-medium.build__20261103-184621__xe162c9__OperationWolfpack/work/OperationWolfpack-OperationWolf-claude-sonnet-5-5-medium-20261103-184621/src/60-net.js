// AI Hub session support (shared-world co-op): the host runs the whole sim, clients send crosshair inputs and render snapshots.
// Protocol: client -> host { k: 'in', f: [x, y, fire, grenade, reload, snap] } ; host -> all { k: 'snap', ... } and { k: 'ev', e: [...] }.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, { clamp } = WP;
const W = WP.W, H = WP.H;
const hub = typeof AIHub !== 'undefined' ? AIHub : null;
const Net = WP.Net = { active: !!(hub && hub.active), info: null, started: false, remote: [], inbox: [], outbox: [], snapT: 0, inT: 0, pulse: { g: 0, r: 0, s: 0 }, ended: false, result: null, last: null, tgt: new Map(), progT: 0, finished: false, bytes: 0, lastSend: 0 };
Net.me = () => (hub && hub.me != null ? hub.me : 0);
Net.seats = () => (hub && hub.players ? hub.players.length : 1);
const TYPEIDS = () => Object.keys(WP.TYPES);
let TIDX = null;
const tid = t => { if (!TIDX) { TIDX = {}; TYPEIDS().forEach((k, i) => TIDX[k] = i); } return TIDX[t]; };
const tname = i => TYPEIDS()[i];
const r1 = v => Math.round(v * 10) / 10;

// ---- host side ----
Net.hostFrames = frames => {
  for (const p of WP.G.sim.players) {
    const r = Net.remote[p.pid]; if (!r || p.pid === Net.me()) continue;
    frames[p.pid] = { x: r.x, y: r.y, fire: r.fire, grenade: r.g > 0, reload: r.r > 0, snap: r.s > 0 };
    r.g = r.r = r.s = 0;
  }
};
Net.buildSnap = sim => {
  const ents = sim.ents.filter(e => !e.dead).map(e => [e.id, tid(e.t), r1(e.x), r1(e.y), r1(e.z), r1(e.hp), r1(e.hpMax), e.st, r1(e.aim), r1(e.aimTot), e.tgt && e.tgt.p != null ? e.tgt.p : e.tgt && e.tgt.h ? 9 : -1, r1(e.up || 0), e.flash > 0 ? 1 : 0, e.dir || 1, e.pkind || '', r1(e.age), r1(e.seed), e.ph || 0, e.stun > 0 ? 1 : 0, Math.round(e.dz || 0)]);
  const cx = sim.cam.x, cy = sim.cam.y;
  ents.sort((a, b) => Math.abs(a[2] - cx) + Math.abs(a[3] - cy) - (Math.abs(b[2] - cx) + Math.abs(b[3] - cy)));
  let list = ents.slice(0, 70);
  const pl = sim.players.map(p => [p.active ? 1 : 0, r1(p.x), r1(p.y), p.mag, p.spares, p.grenades, r1(p.dmg), p.score, p.streak, p.down ? 1 : 0, r1(p.fury), r1(p.reload), r1(p.bloom), r1(p.lastFire), r1(p.hitT || 0), p.hits, p.shots, p.kills]);
  const snap = { k: 'snap', t: r1(sim.t), d: r1(sim.d), c: [r1(sim.cam.x), r1(sim.cam.y), r1(sim.cam.h)], ph: sim.phase, qg: [sim.q.got.soldier, sim.q.got.vehicle, sim.q.got.air], h: [sim.host.saved, sim.host.lost], ms: [sim.stats.masts, sim.stats.mastTotal, sim.stats.kills, sim.stats.civHits], pl, en: list, et: r1(sim.endT) };
  let s = JSON.stringify(snap);
  while (s.length > 12000 && list.length > 8) { list = list.slice(0, Math.floor(list.length * .8)); snap.en = list; s = JSON.stringify(snap); }
  return snap;
};
Net.hostUpdate = (dt, sim) => {
  Net.snapT -= dt; Net.progT -= dt;
  // collect the events for clients (the host's own presentation reads sim.events afterwards)
  for (const e of sim.events) { if (e.k === 'shot' || e.k === 'spark' || e.k === 'miss' || e.k === 'snap') { if (Net.outbox.length < 40 && (e.k !== 'shot' || e.pid !== Net.me())) Net.outbox.push(e); continue; } if (Net.outbox.length < 60) Net.outbox.push(e); }
  if (Net.snapT <= 0 && hub) {
    Net.snapT = 1 / 14;
    const snap = Net.buildSnap(sim); snap.ev = Net.outbox.splice(0, 40);
    try { hub.send(snap, { reliable: false }); } catch (e) { /* the hub may be gone */ }
  }
  if (Net.progT <= 0 && hub) { Net.progT = 1; const tot = sim.players.reduce((a, p) => a + (p.active ? p.score : 0), 0); hub.progress({ score: tot, label: 'OP ' + (sim.opIx + 1) + ' ' + sim.phase }); }
};
Net.finish = sim => {
  if (Net.finished) return; Net.finished = true;
  const act = sim.players.filter(p => p.active || true).map(p => ({ id: p.pid, score: p.score })).filter(o => o.id < Net.seats());
  act.sort((a, b) => b.score - a.score);
  const standings = []; let last = null;
  for (const o of act) { if (last !== null && o.score === last) standings[standings.length - 1].push(o.id); else standings.push([o.id]); last = o.score; }
  Net.result = { phase: sim.phase, standings, scores: act, host: sim.host.saved };
  if (hub && Net.isHost()) { try { hub.send({ k: 'end', r: Net.result }); hub.finish({ standings, scores: act.map(o => o.score), cleared: sim.phase === 'clear' }); } catch (e) { } }
  WP.game.go('hubend');
};
Net.isHost = () => !!(hub && hub.isHost);

// ---- client side ----
Net.clientUpdate = (dt, sim) => {
  const G = WP.G, me = Net.me();
  // inputs out
  Net.inT -= dt;
  const f = G.readSeat(me, dt, sim);
  if (f) { Net.pulse.g += f.grenade ? 1 : 0; Net.pulse.r += f.reload ? 1 : 0; Net.pulse.s += f.snap ? 1 : 0; G.cf = f; }
  if (Net.inT <= 0 && G.cf && hub) { Net.inT = 1 / 20; const c = G.cf; try { hub.send({ k: 'in', f: [Math.round(c.x), Math.round(c.y), c.fire ? 1 : 0, Net.pulse.g, Net.pulse.r, Net.pulse.s] }, { to: hub.host, reliable: false }); } catch (e) { } Net.pulse.g = Net.pulse.r = Net.pulse.s = 0; }
  // apply the newest snapshot, then ease positions
  while (Net.inbox.length) Net.applySnap(sim, Net.inbox.shift());
  for (const e of sim.ents) { const t = Net.tgt.get(e.id); if (t) { const k = 1 - Math.pow(.0006, dt); e.x += (t.x - e.x) * k; e.y += (t.y - e.y) * k; e.z += (t.z - e.z) * k; } }
  for (const e of sim.ents) { if (e.anc) { e.lx = e.x - sim.cam.x; e.dz = sim.cam.y - e.y; } if (e.flash > 0) e.flash -= dt; if (e.ty.kind === 'proj') e.a = (e.a || 0) + dt; }
  sim.t += dt;
  const p = sim.players[me]; if (p && G.cf) { p.x = G.cf.x; p.y = G.cf.y; }
  sim.beginView();
};
Net.applySnap = (sim, s) => {
  sim.t = s.t; sim.d = s.d; sim.cam.x = s.c[0]; sim.cam.y = s.c[1]; sim.cam.h = s.c[2]; sim.phase = s.ph; sim.endT = s.et || 0;
  sim.q.got.soldier = s.qg[0]; sim.q.got.vehicle = s.qg[1]; sim.q.got.air = s.qg[2]; sim.host.saved = s.h[0]; sim.host.lost = s.h[1]; sim.stats.masts = s.ms[0]; sim.stats.mastTotal = s.ms[1]; sim.stats.kills = s.ms[2]; sim.stats.civHits = s.ms[3];
  s.pl.forEach((a, i) => { const p = sim.players[i]; if (!p) return; const remote = i !== Net.me(); p.active = !!a[0]; if (remote) { p.x = a[1]; p.y = a[2]; } p.mag = a[3]; p.spares = a[4]; p.grenades = a[5]; p.dmg = a[6]; p.score = a[7]; p.streak = a[8]; p.down = !!a[9]; p.fury = a[10]; p.reload = a[11]; p.bloom = a[12]; p.lastFire = a[13] - sim.t + sim.t; p.hitT = a[14]; p.hits = a[15]; p.shots = a[16]; p.kills = a[17]; });
  const old = new Map(sim.ents.map(e => [e.id, e])), ents = [];
  sim.bossEnt = null;
  for (const a of s.en) {
    const type = tname(a[1]), ty = WP.TYPES[type]; if (!ty) continue;
    let e = old.get(a[0]);
    if (!e) { e = { id: a[0], t: type, ty, x: a[2], y: a[3], z: a[4], lx: 0, dz: a[19], anc: false, age: a[15], stT: 0, up: 0, flash: 0, seed: a[16], tgt: null, dir: 1, hold: false }; if (ty.kind === 'boss') { e.boss = WP.BOSSES[sim.st.boss]; const bb = e.boss; e.ty = Object.assign({}, WP.TYPES.boss, { w: bb.w * bb.sc, h: bb.h * bb.sc }); e.wp = { dx: bb.wp.dx * bb.sc, dy: bb.wp.dy * bb.sc, r: bb.wp.r * bb.sc }; } if (ty.kind === 'proj') { e.a = 0; e.T = 2; } }
    Net.tgt.set(a[0], { x: a[2], y: a[3], z: a[4] });
    e.hp = a[5]; e.hpMax = a[6]; e.st = a[7]; e.aim = a[8]; e.aimTot = a[9]; e.tgt = a[10] >= 0 ? (a[10] === 9 ? { h: 1, col: '#ffffff' } : { p: a[10], col: WP.SEAT[a[10]] }) : null; e.up = a[11]; if (a[12]) e.flash = .09; e.dir = a[13]; e.pkind = a[14]; e.ph = a[17]; e.stun = a[18]; e.dz = a[19];
    if (ty.kind === 'pickup') { e.x = a[2]; e.y = a[3]; e.z = a[4]; }
    if (ty.kind === 'boss') sim.bossEnt = e;
    ents.push(e);
  }
  sim.ents = ents;
  for (const id of Net.tgt.keys()) if (!old.has(id) && !ents.some(e => e.id === id)) Net.tgt.delete(id);
  if (s.ev) sim.events.push(...s.ev);
};
if (hub && Net.active) {
  hub.on('message', (data, from) => {
    if (!data || typeof data !== 'object') return;
    if (data.k === 'in' && Net.isHost()) { const f = data.f; if (!Array.isArray(f)) return; const r = Net.remote[from] || (Net.remote[from] = { x: 240, y: 135, fire: false, g: 0, r: 0, s: 0 }); r.x = clamp(+f[0] || 0, 0, W - 1); r.y = clamp(+f[1] || 0, 0, H - 1); r.fire = !!f[2]; r.g += f[3] | 0; r.r += f[4] | 0; r.s += f[5] | 0; }
    else if (data.k === 'snap' && !Net.isHost()) { Net.inbox.push(data); if (Net.inbox.length > 3) Net.inbox.shift(); Net.last = data; }
    else if (data.k === 'end') { Net.result = data.r; if (WP.game.sceneName === 'play') WP.game.go('hubend'); }
  });
  hub.on('leave', info => { const sim = WP.G.sim; if (sim && Net.isHost() && sim.players[info.id]) { sim.players[info.id].active = false; sim.players[info.id].down = true; } });
  hub.on('time-up', () => { if (Net.isHost() && WP.G.sim) Net.finish(WP.G.sim); });
  hub.on('end', () => { Net.ended = true; });
}

// ---- scenes ----
Net.scenes = (G, game, drawWorld, handleEvents) => {
  const begin = () => {
    if (Net.started) return; Net.started = true;
    const n = clamp(Net.seats(), 1, 4); G.nSeats = n; G.localSeats = [Net.me()]; G.carry = null; G.op = 0; G.seed = hub.seed || 1;
    G.role = Net.isHost() ? 'host' : 'client';
    G.startOp(0);
    game.go('play');
  };
  if (hub && Net.active) {
    hub.connect({ mode: 'shared-world', seats: [1, 4] }).then(info => {
      Net.info = info;
      if (!info) { WP.G.role = 'solo'; game.go('title'); return; }
      hub.on('start', () => begin());
      hub.ready();
    });
  }
  return {
    hubcard: {
      enter() { G.t = 0; },
      update(dt) { G.t += dt; if (!Net.info && G.t > 11) { G.role = 'solo'; game.go('title'); } },
      draw(r) {
        r.overlay(g => {
          px.rect(g, 0, 0, W, H, '#0a0e18');
          E.font.title(g, 'OPERATION', W / 2, 40, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffa030'] });
          E.font.title(g, 'WOLFPACK', W / 2, 68, { scale: 4, align: 'center', colors: ['#ffffff', '#ff8a30'] });
          const n = hub ? hub.players.length : 1;
          E.font.text(g, Net.info ? 'CONNECTED. WAITING FOR THE SQUAD...' : 'CONNECTING TO THE HUB...', W / 2, 130, '#ffe6c0', { align: 'center', outline: '#000' });
          for (let i = 0; i < 4; i++) { const on = i < n; px.rect(g, 150 + i * 46, 160, 40, 16, on ? WP.SEAT[i] : '#20202a'); E.font.text(g, on ? (i === Net.me() ? 'YOU' : 'P' + (i + 1)) : '--', 170 + i * 46, 164, on ? '#000' : '#6a6a7a', { align: 'center', font: 'tiny' }); }
          E.font.text(g, 'CO-OP: SHARED WORLD, ONE OPERATION', W / 2, 200, '#a8b0c0', { align: 'center', font: 'tiny' });
        });
      }
    },
    hubend: {
      enter() { G.t = 0; },
      update(dt) { G.t += dt; },
      draw(r) {
        const rs = Net.result || { standings: [], scores: [], phase: '' };
        r.overlay(g => {
          px.rect(g, 0, 0, W, H, '#0a0e18');
          E.font.title(g, rs.phase === 'clear' ? 'OPERATION CLEAR' : 'MISSION OVER', W / 2, 30, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffa030'] });
          (rs.scores || []).forEach((s, i) => { E.font.text(g, (i + 1) + '.  P' + (s.id + 1) + (s.id === Net.me() ? ' (YOU)' : ''), 140, 90 + i * 18, WP.SEAT[s.id], { outline: '#000' }); E.font.text(g, String(s.score), 340, 90 + i * 18, '#ffffff', { align: 'right', outline: '#000' }); });
          E.font.text(g, 'THE HUB WILL TAKE IT FROM HERE', W / 2, H - 20, '#a8b0c0', { align: 'center', outline: '#000' });
        });
      }
    }
  };
};
})();
