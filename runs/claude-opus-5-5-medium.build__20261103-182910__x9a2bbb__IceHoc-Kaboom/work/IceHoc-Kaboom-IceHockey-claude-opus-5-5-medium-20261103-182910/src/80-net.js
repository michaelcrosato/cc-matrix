/* ---- Net: AI Hub sessions (Session Protocol v1, shared-world, 1-4 seats). The host runs the match; clients send their
 * intents (press counters, held bits, the stick) at 15 Hz and draw the host's snapshots, interpolated, their own skater
 * predicted (PLAN 14) ---- */
const Net = (() => {
  const ACTS = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch'];
  const PHASES = ['none', 'intro', 'faceoff', 'play', 'stoppage', 'goal', 'replay', 'periodEnd', 'intermission', 'final', 'fight', 'shootout'];
  const STATES = ['skate', 'stop', 'check', 'deke', 'stun', 'down', 'getup', 'celebrate', 'fight', 'bin', 'frozen', 'buried', 'slip'];
  const ACTK = [null, 'pass', 'follow', 'poke'];
  const ITEMK = ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox', 'cocoa', 'octopus', 'rat'];
  const GST = ['ready', 'butterfly', 'glove', 'blocker', 'stack', 'poke', 'cover', 'blasted', 'celebrate'];
  const N = {
    active: false, info: null, role: 'none', card: null, started: false, ended: false, finished: false, seats: [], snaps: [], seq: 0, counters: [0, 0, 0, 0, 0, 0],
    sendT: 0, tick: 0, evSeen: new Set(), evOut: [], startHumans: 0, pred: null, endReason: '', overlay: null, latest: null, setup: null
  };
  const isHost = () => N.active && N.role === 'host';
  const isClient = () => N.active && N.role === 'client';
  /** connect, pick the teams and barn from the shared rng, build the match, then ready() with no key press */
  async function connect() {
    if (!HUB) return null;
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { N.active = false; game.go('title'); return null; }
    N.active = true; N.info = info; N.role = info.isHost ? 'host' : 'client';
    const rng = AIHub.rng('setup'), pairs = [['muskrats', 'drillers'], ['lumberjacks', 'bruisers'], ['marauders', 'muskrats'], ['bruisers', 'lumberjacks'], ['drillers', 'marauders']];
    const pair = pairs[Math.floor(rng() * pairs.length) % pairs.length], arena = ARENA_IDS.slice(0, 4)[Math.floor(rng() * 4) % 4];
    const players = info.players || [];
    N.seats = players.map((p, i) => ({ id: p.id, name: U.sanitize(p.name || 'P' + (i + 1)), color: p.color || E.PLAYER_COLORS[i], team: players.length === 1 ? 0 : i % 2, me: p.id === info.me }));
    const humans = N.seats.map((s, i) => ({ id: s.id, team: s.team, name: s.name, color: s.color, tag: s.name.slice(0, 6), i, slot: Math.floor(i / 2) % 3, remote: !s.me, input: s.me ? game.input : null, net: { mx: 0, my: 0, held: 0, c: [0, 0, 0, 0, 0, 0], last: [0, 0, 0, 0, 0, 0], press: new Set(), seq: 0 } }));
    N.setup = { home: pair[0], away: pair[1], arena };
    Match.start({ home: pair[0], away: pair[1], arena, periods: 1, len: 180, ot: true, shootout: false, session: true, intros: false, replays: true, flood: false, humans, seed: Math.floor(AIHub.rng('sim')() * 1e9), noResults: true, onOver: () => {} });
    M.phase = 'card'; M.held = true;
    // a 2-v-1: the lone human's CPU mates play a little better
    const per = [0, 0]; for (const h of humans) per[h.team]++;
    if (per[0] && per[1] && per[0] !== per[1]) { const lone = per[0] < per[1] ? 0 : 1; M.aiSkill[lone] = Math.min(1, M.aiSkill[lone] + .15); }
    N.startHumans = humans.length;
    AIHub.on('card', c => { N.card = c; });
    AIHub.on('start', () => { N.started = true; });
    AIHub.on('message', (d, from) => receive(d, from));
    AIHub.on('leave', e => leave(e.id));
    AIHub.on('time-up', () => { if (isHost()) finish('time-up'); });
    AIHub.on('end', e => end(e));
    AIHub.ready();
    return info;
  }
  /* ---- the host: remote intents in, snapshots out ---- */
  function receive(d, from) {
    if (!d || N.ended) return;
    if (isHost() && d.t === 'in') {
      const h = M && M.humans.find(x => x.id === from); if (!h || !h.net) return;
      if (d.s <= h.net.seq) return; h.net.seq = d.s;
      h.net.mx = (d.mx || 0) / 100; h.net.my = (d.my || 0) / 100; h.net.held = d.h || 0; h.net.aim = d.ax !== undefined ? [d.ax, d.ay] : null; h.net.sy = (d.sy || 0) / 100;
      d.c.forEach((v, i) => { const diff = (v - h.net.c[i] + 256) % 256; if (diff > 0 && diff < 128) { h.net.c[i] = v; h.net.pend = h.net.pend || new Set(); h.net.pend.add(ACTS[i]); } });
    }
    if (isClient() && d.t === 's') { d.rx = AIHub.time(); N.snaps.push(d); if (N.snaps.length > 30) N.snaps.shift(); N.latest = d; for (const e of d.ev || []) if (!N.evSeen.has(e.id)) { N.evSeen.add(e.id); playEvent(e); } }
  }
  /** the presses that arrived since the last step become this step's presses */
  function hostStep() { if (!M) return; for (const h of M.humans) if (h.remote && h.net) { h.net.press = h.net.pend || new Set(); h.net.pend = null; } }
  function intentFor(h) {
    const n = h.net || {}, it = { mx: n.mx || 0, my: n.my || 0, turbo: !!(n.held & 4), shoot: !!(n.held & 1), lob: !!(n.held & 2), aim: n.aim || null, stickY: n.sy || 0, press: {} };
    if (n.press) for (const a of n.press) it.press[a] = true;
    return it;
  }
  const pressedFor = (h, a) => !!(h && h.net && h.net.press && h.net.press.has(a));
  const heldFor = (h, a) => !!(h && h.net && (h.net.held & ({ shoot: 1, lob: 2, turbo: 4 }[a] || 0)));
  const moveFor = h => h && h.net ? [h.net.mx, h.net.my] : [0, 0];
  function snapshot() {
    const p = M.puck, idx = s => s ? M.skaters.indexOf(s) : -1, r = v => Math.round(v);
    const s = { t: 's', n: ++N.tick, at: r(AIHub.time()), ph: PHASES.indexOf(M.phase), p: M.period, k: r(M.clock * 10), sc: M.score.slice(), b: [r(M.boom[0]), r(M.boom[1]), r(M.kaboomT[0] * 10), r(M.kaboomT[1] * 10)],
      pk: [r(p.x), r(p.y), r(p.z), r(p.vx), r(p.vy), idx(p.owner), (p.onFire ? 1 : 0) | (p.inNet ? 2 : 0) | (p.held ? 4 : 0) | (p.dead ? 8 : 0)],
      e: M.skaters.map(k => [r(k.x), r(k.y), r(k.vx), r(k.vy), r(((k.facing % TAU) + TAU) % TAU / TAU * 255), STATES.indexOf(k.state), r(k.stateT * 10), (k.winding ? 1 : 0) | (k.holdTurbo ? 2 : 0) | (k.off ? 4 : 0) | (ACTK.indexOf(k.act ? k.act.kind : null) << 3), r(k.charge * 100), r(k.turbo * 100)]),
      g: M.goalies.map(g => [r(g.x), r(g.y), r(((g.facing % TAU) + TAU) % TAU / TAU * 255), Math.max(0, GST.indexOf(g.state))]),
      it: M.items.concat(M.hazards).slice(0, 4).map(i => [ITEMK.indexOf(i.kind), r(i.x), r(i.y), r(i.z)]),
      hu: M.humans.map(h => [h.id, idx(h.s)]), sb: M.sinBin.map(b => [idx(b.s), r(b.t)]), gl: Rink.panels.filter(q => q.state !== 'ok').map(q => q.i * 2 + (q.state === 'shattered' ? 1 : 0)),
      ev: N.evOut.slice(-5) };
    if (M.fight) { const F = M.fight; s.f = [idx(F.a.s), idx(F.b.s), r(F.a.bal), r(F.b.bal), r(F.a.sta), r(F.b.sta), r(F.mx), r(F.my)]; }
    return s;
  }
  // the events clients see: sounds, effects and the booth's lines (each repeated in a few snapshots, ids dedupe)
  const SEND = { goal: 1, save: 1, post: 1, hit: 1, glass: 1, shot: 1, pass: 1, stop: 1, whistle: 1, faceoff_drop: 1, kaboom_start: 1, kaboom_end: 1, fight_start: 1, fight_end: 1, fight_hit: 1, sin_bin: 1, item: 1, item_throw: 1, hazard: 1, period_end: 1, final: 1, ot_start: 1, blast: 1, chirp: 1, talk: 1 };
  Bus.on('*', e => {
    if (!isHost() || !SEND[e.type]) return;
    const o = { id: e.id, type: e.type };
    for (const k of ['team', 'by', 'victim', 'kind', 'big', 'state', 'panel', 'x', 'y', 'speed', 'winner', 'winnerTeam', 'winnerName', 'name', 'who', 'text', 'line', 'n', 'bar', 'assists', 'goalie', 'freeze']) if (e[k] !== undefined) o[k] = typeof e[k] === 'number' ? Math.round(e[k]) : e[k];
    N.evOut.push(o); if (N.evOut.length > 5) N.evOut.shift();
  });
  function talk(type, k, who, text) { if (isHost()) Bus.emit('talk', { who, text: String(text).slice(0, 120) }); }
  function playEvent(e) {
    if (!M) return;
    if (e.type === 'talk') { Talk.sayAs(e.who, e.text); return; }
    Fx.event(e, false);
  }
  /* ---- the client: apply snapshots (interpolated ~120 ms behind), predict its own skater ---- */
  function clientApply(dt) {
    const sn = N.snaps; if (!sn.length) return;
    const rt = AIHub.time() - 120;
    let a = sn[0], b = sn[sn.length - 1];
    for (let i = sn.length - 1; i > 0; i--) if (sn[i - 1].at <= rt) { a = sn[i - 1]; b = sn[i]; break; }
    const u = b.at > a.at ? clamp((rt - a.at) / (b.at - a.at), 0, 1) : 1, L = (x, y) => x + (y - x) * u, last = N.latest;
    M.phase = PHASES[last.ph] || 'play'; M.period = last.p; M.clock = last.k / 10; M.score = last.sc.slice(); M.boom = [last.b[0], last.b[1]]; M.kaboomT = [last.b[2] / 10, last.b[3] / 10];
    const p = M.puck; p.x = L(a.pk[0], b.pk[0]); p.y = L(a.pk[1], b.pk[1]); p.z = L(a.pk[2], b.pk[2]); p.vx = b.pk[3]; p.vy = b.pk[4]; p.owner = b.pk[5] >= 0 ? M.skaters[b.pk[5]] : null; p.onFire = !!(b.pk[6] & 1); p.inNet = !!(b.pk[6] & 2); p.held = !!(b.pk[6] & 4); p.dead = !!(b.pk[6] & 8);
    M.skaters.forEach((s, i) => {
      const ea = a.e[i], eb = b.e[i]; if (!ea || !eb) return;
      s.x = L(ea[0], eb[0]); s.y = L(ea[1], eb[1]); s.vx = eb[2]; s.vy = eb[3]; const fa = ea[4] / 255 * TAU, fb = eb[4] / 255 * TAU; s.facing = fa + U.angDiff(fb, fa) * u;
      s.state = STATES[eb[5]] || 'skate'; s.stateT = eb[6] / 10; s.winding = !!(eb[7] & 1); s.holdTurbo = !!(eb[7] & 2); s.off = !!(eb[7] & 4); const ak = ACTK[eb[7] >> 3]; s.act = ak ? { kind: ak, t: .1 } : null; s.charge = eb[8] / 100; s.turbo = eb[9] / 100;
    });
    for (const [id, k] of last.hu) { const h = M.humans.find(x => x.id === id); if (h && M.skaters[k] && h.s !== M.skaters[k]) { if (h.s) { h.s.human = null; h.s.ctrl = 'cpu'; } h.s = M.skaters[k]; h.s.human = h; h.s.ctrl = h.remote ? 'remote' : 'human'; } }
    // my own skater: predicted from my stick, pulled toward the host's word
    const me = M.humans.find(h => !h.remote), s = me && me.s;
    if (s && s.state === 'skate' && M.phase === 'play') {
      const pr = N.pred && N.pred.s === s ? N.pred : (N.pred = { s, x: s.x, y: s.y, vx: s.vx, vy: s.vy, facing: s.facing, state: 'skate', stateT: 0, def: s.def, items: s.items, team: s.team, winding: s.winding });
      const mv = game.input.move(), gd = game.view.screenDirToGround(mv[0], mv[1]);
      Skater.skateStep(pr, gd[0], gd[1], game.input.down('turbo'), dt, true); pr.x += pr.vx * dt; pr.y += pr.vy * dt; Rink.clamp(pr, 7);
      const eb = b.e[M.skaters.indexOf(s)], ax = eb[0] + eb[2] * .12, ay = eb[1] + eb[3] * .12, err = Math.hypot(ax - pr.x, ay - pr.y);
      if (err > 48) { pr.x = ax; pr.y = ay; pr.vx = eb[2]; pr.vy = eb[3]; } else { pr.x += (ax - pr.x) * Math.min(1, dt * 6); pr.y += (ay - pr.y) * Math.min(1, dt * 6); }
      s.x = pr.x; s.y = pr.y; s.vx = pr.vx; s.vy = pr.vy; s.facing = pr.facing; N.err = err;
      if (p.owner === s) { const [bx, by] = Skater.blade(s); p.x = bx; p.y = by; }
    } else N.pred = null;
    M.goalies.forEach((g, i) => { const ga = a.g[i], gb = b.g[i]; if (!ga || !gb) return; g.x = L(ga[0], gb[0]); g.y = L(ga[1], gb[1]); g.facing = gb[2] / 255 * TAU; g.state = GST[gb[3]] || 'ready'; g.rig.hk = g.rig.hk || { mode: 'goalie' }; g.rig.hk.state = g.state; g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.facing }); });
    M.items = (last.it || []).filter(x => x[0] < 7).map(x => ({ kind: ITEMK[x[0]], x: x[1], y: x[2], z: x[3], t: 0, life: 99 })); M.hazards = (last.it || []).filter(x => x[0] >= 7).map(x => ({ kind: ITEMK[x[0]], x: x[1], y: x[2], z: x[3], haz: true, t: 0 }));
    M.sinBin = (last.sb || []).map(([k, t]) => ({ s: M.skaters[k], t }));
    for (const q of Rink.panels) q.state = 'ok'; for (const v of last.gl || []) { const q = Rink.panels[v >> 1]; if (q) q.state = v & 1 ? 'shattered' : 'cracked'; }
    if (last.f) { const [ia, ib, ba, bb, sa, sb, mx, my] = last.f; M.fight = { a: { s: M.skaters[ia], bal: ba, sta: sa, side: -1 }, b: { s: M.skaters[ib], bal: bb, sta: sb, side: 1 }, mx, my, who: [M.skaters[ia], M.skaters[ib]] }; } else M.fight = null;
    for (const s2 of M.skaters) { if (s2.state === 'fight') { s2.rig.update(dt, { x: s2.x, y: s2.y, z: 0, vx: 0, vy: 0, facing: s2.facing, stance: 'guard' }); } else Match.rigStep(s2, dt); }
    for (const r of M.refs) r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: 0, vy: 0, facing: r.facing });
    Cam.update(dt); Crowd.step(dt);
  }
  function clientSend() {
    const I = game.input, mv = I.move(), g = game.view.screenDirToGround(mv[0], mv[1]);
    ACTS.forEach((a, i) => { if (I.pressed(a)) N.counters[i] = (N.counters[i] + 1) % 256; });
    N.sendT -= 1; if (N.sendT > 0) return; N.sendT = 8;   // every 8 steps of 1/120 s: 15 a second
    const me = M.humans.find(h => !h.remote), aim = me && me.reticle;
    const msg = { t: 'in', s: ++N.seq, at: Math.round(AIHub.time()), mx: Math.round(g[0] * 100), my: Math.round(g[1] * 100), sy: Math.round(mv[1] * 100), h: (I.down('shoot') ? 1 : 0) | (I.down('lob') ? 2 : 0) | (I.down('turbo') ? 4 : 0), c: N.counters.slice() };
    if (aim) { msg.ax = Math.round(aim[0]); msg.ay = Math.round(aim[1]); }
    AIHub.send(msg, { to: N.info.host, reliable: false });
  }
  /* ---- leaving, finishing, the end ---- */
  function leave(id) {
    if (!M) return;
    const h = M.humans.find(x => x.id === id); if (!h) return;
    if (h.s) { h.s.ctrl = 'cpu'; h.s.human = null; h.s.ai = AI.fresh(h.s); }
    M.humans.splice(M.humans.indexOf(h), 1); N.seats = N.seats.filter(s => s.id !== id); N.left = (N.left || []).concat([id]);
    if (isHost() && N.startHumans >= 2 && M.humans.length <= 1 && N.started) finish('leave');
  }
  function finish(why) {
    if (!isHost() || N.finished) return; N.finished = true;
    const ids = M.humans.map(h => h.id), w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1, scores = {}, stats = {}, awards = [];
    for (const h of M.humans) { const sid = h.s ? h.s.id : null; let g = 0, a = 0, hits = 0, f = 0; for (const s of M.skaters) if (s.human === h || s.id === sid) { const st = M.stats[s.id]; g += st.goals; a += st.assists; hits += st.hits; f += st.fightsWon; } scores[h.id] = g + a; stats[h.id] = { Goals: g, Assists: a, Hits: hits, Fights: f }; }
    const stars = Match.threeStars(); stars.forEach((s, i) => { const e = M.byId[s.id], h = e && e.human; if (h && ids.includes(h.id)) awards.push({ id: h.id, title: ['1st Star', '2nd Star', '3rd Star'][i], detail: s.line }); });
    let standings;
    if (ids.length === 1) standings = [[ids[0]]];
    else if (w < 0) standings = [ids];
    else standings = [M.humans.filter(h => h.team === w).map(h => h.id), M.humans.filter(h => h.team !== w).map(h => h.id)].filter(x => x.length);
    const out = { standings, scores, stats, awards };
    if (ids.length === 1) out.won = w === M.humans[0].team;
    else if (M.humans.every(h => h.team === M.humans[0].team)) out.won = w === M.humans[0].team;
    try { AIHub.finish(out); } catch (e) { game.fail('finish', e); }
    N.finishWhy = why;
  }
  function end(e) { N.ended = true; N.endReason = e && e.reason; try { A.music(null); A.mute(true); } catch (x) { /* no sound */ } game.input.consumeAll(); }
  /** each step of the session scene */
  function step(dt) {
    if (!N.active || !M || N.ended) return;
    const t = AIHub.time();
    if (M.phase === 'card' || t < 0 || !N.started) {
      if (M.phase === 'card' && N.started && t >= 0) { M.held = false; Match.setupFaceoff([Rink.C.x, Rink.C.y]); }
      else { if (!N.started) cardInput(); Cam.update(dt); for (const s of M.skaters) Match.rigStep(s, dt); return; }
    }
    if (isHost()) {
      hostStep(); Match.step(dt); Talk.update(dt); Fx.step(dt);
      if ((M.phase === 'final' && M.phaseT > 3) || M.finished) finish('final');
      N.sendT -= 1; if (N.sendT <= 0) { N.sendT = 8; const s = snapshot(); s.ack = {}; for (const h of M.humans) if (h.remote && h.net) s.ack[h.id] = h.net.seq; try { AIHub.send(s, { reliable: false }); } catch (e) { game.fail('send', e); } N.lastSize = JSON.stringify(s).length; }
    } else { clientSend(); clientApply(dt); Talk.update(dt); Fx.step(dt); }
  }
  /** the card's answers: Enter or Cross for Ready, Triangle / T / MORE TIME for more time */
  function cardInput() {
    const I = game.input, c = I.clicked();
    if (I.pressed('confirm') || I.pressed('start') || (c && N.readyBtn && inBox(c, N.readyBtn))) { AIHub.answer('ready'); A.sfx('pick'); }
    if (I.pressed('lob') || keyT() || (c && N.moreBtn && inBox(c, N.moreBtn))) { AIHub.answer('more'); A.sfx('move'); }
  }
  let tKey = false; if (typeof addEventListener === 'function') try { addEventListener('keydown', e => { if (e.code === 'KeyT') tKey = true; }); } catch (e) { /* no DOM */ }
  const keyT = () => { const v = tKey; tKey = false; return v; };
  const inBox = (c, b) => c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3];
  return { connect, step, isHost, isClient, intentFor, pressedFor, heldFor, moveFor, talk, finish, snapshot, N, ACTS };
})();

/* ---- the session scene: our own card, the countdown, the round (no pausing), the end ---- */
scenes.session = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, res: 'ps1', pausable: false, camera: { zoom: false }, touch: [],
  enter() { this.opt = null; this.oi = 0; Net.connect().then(info => { if (info && M) { Synth.music(M.arena.music || 'play'); L.enabled = true; } }); },
  update(dt) {
    Glyphs.sync();
    const N = Net.N; if (!N.active || !M) return;
    if (N.ended) return;
    // Options or Esc: a small overlay that doesn't pause (the local skater coasts meanwhile)
    if (game.input.pressed('pause') && N.started) { this.opt = this.opt ? null : true; this.oi = 0; game.input.consumeAll(); }
    if (this.opt) {
      const rows = this.rows(); if (UI.anyRepeat('up')) this.oi = (this.oi + rows.length - 1) % rows.length; if (UI.anyRepeat('down')) this.oi = (this.oi + 1) % rows.length;
      if (UI.anyPressed('confirm') || UI.anyRepeat('left') || UI.anyRepeat('right')) rows[this.oi][1](); if (UI.anyPressed('cancel')) this.opt = null;
      game.input.consumeAll();
    }
    if (N.info && N.info.server) { if (Net.isHost()) Net.step(dt); return; }
    Net.step(dt);
  },
  rows() {
    const st = S();
    return [['SOUND: ' + (A.muted ? 'OFF' : 'ON'), () => A.mute()], ['MUSIC: ' + Math.round((st.music === undefined ? 1 : st.music) * 100) + '%', () => st.set('music', ((Math.round((st.music || 0) * 10) + 2) % 12) / 10)],
      ['VOICES: ' + Math.round((st.voices || 0) * 100) + '%', () => { st.set('voices', ((Math.round((st.voices || 0) * 10) + 2) % 12) / 10); Synth.applyVolumes(); }],
      ['BUTTON SYMBOLS: ' + st.symbols.toUpperCase(), () => st.set('symbols', st.symbols === 'Xbox' ? 'PlayStation' : 'Xbox')], ['CAMERA: ' + st.camera.toUpperCase(), () => st.set('camera', st.camera === 'Overhead' ? 'Broadcast' : 'Overhead')], ['BACK', () => { this.opt = null; }]];
  },
  draw(r) {
    const N = Net.N;
    if (N.info && N.info.server) { r.sky(['#05070c', '#05070c', '#0a0e18']); r.text('HOSTING', 6, 6, '#5a6a8a'); return; }
    if (!M || !N.active) { r.sky(['#05070c', '#0a1020', '#141c34']); r.overlay(g => UI.title(g, 'ICE HOC-KABOOM', r.W / 2, r.H * .4, 3)); return; }
    Draw.world(r);
    const t = AIHub.time();
    if (!N.started || M.phase === 'card') { this.card(r); return; }
    Hud.draw(r, 1 / 60); Talk.draw(r);
    r.overlay(g => {
      if (t < 0) UI.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H * .35, 6);
      else if (t < 900) UI.title(g, 'GO!', r.W / 2, r.H * .35, 5);
      if (this.opt) { const rows = this.rows(), w = 200, x = r.W / 2 - w / 2, y = r.H / 2 - rows.length * 8 - 10; UI.panel(g, x, y, w, rows.length * 16 + 20, { border: UI.GOLD }); rows.forEach(([l], i) => UI.text(g, l, r.W / 2, y + 10 + i * 16, i === this.oi ? UI.GOLD : '#ffffff', { align: 'center' })); }
      if (N.ended) { UI.panel(g, r.W / 2 - 90, r.H * .2, 180, 30, { border: UI.GOLD }); UI.text(g, 'FINAL  ' + M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr, r.W / 2, r.H * .2 + 11, '#ffffff', { align: 'center' }); }
    });
  },
  card(r) {
    const N = Net.N, c = N.card || {};
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05070c'));
      const sf = Hud.safe(r);
      UI.title(g, 'ICE HOC-KABOOM', r.W / 2, sf.y0, 3);
      UI.text(g, ARENAS[M.cfg.arena].name.toUpperCase() + ':  ' + M.teams[0].short + ' vs ' + M.teams[1].short, r.W / 2, sf.y0 + 28, UI.GOLD, { align: 'center' });
      UI.text(g, 'HOW TO WIN: Outscore the other team in one 3-minute period', r.W / 2, sf.y0 + 42, '#ffffff', { align: 'center' });
      N.seats.forEach((s, i) => {
        const x = r.W / 2 + (s.team ? 70 : -70), y = sf.y0 + 60 + Math.floor(i / 2) * 18, ready = (c.ready || []).includes(s.id);
        px.rect(g, x - 60, y, 120, 15, s.color); px.rect(g, x - 59, y + 1, 118, 13, '#101420');
        UI.text(g, (ready ? 'O ' : '  ') + s.name + (s.me ? ' (YOU)' : ''), x - 54, y + 4, s.color);
      });
      UI.text(g, M.teams[0].abbr + ' (HOME)', r.W / 2 - 70, sf.y0 + 52, UI.MUTED, { align: 'center' }); UI.text(g, M.teams[1].abbr + ' (AWAY)', r.W / 2 + 70, sf.y0 + 52, UI.MUTED, { align: 'center' });
      const y2 = sf.y0 + 112;
      UI.text(g, 'YOUR CONTROLS', r.W / 2, y2, UI.GOLD, { align: 'center' });
      Glyphs.text(g, 'MOVE: STICK / WASD   {pass} PASS   {shoot} SHOOT / CHECK', r.W / 2, y2 + 13, '#ffffff', { align: 'center' });
      Glyphs.text(g, '{deke} DEKE / POKE   {lob} SAUCER / GLOVES   {turbo} TURBO', r.W / 2, y2 + 27, '#ffffff', { align: 'center' });
      const left = c.left === null || c.left === undefined ? (c.starting ? 'STARTING...' : c.paused ? 'PAUSED: MORE TIME' : '') : 'STARTS IN ' + Math.ceil(c.left / 1000);
      UI.text(g, left, r.W / 2, y2 + 44, '#ffffff', { align: 'center', scale: 2 });
      N.readyBtn = [Math.round(r.W / 2 - 110), Math.round(y2 + 64), 100, 22]; N.moreBtn = [Math.round(r.W / 2 + 10), Math.round(y2 + 64), 100, 22];
      UI.panel(g, ...N.readyBtn, { border: UI.GOLD }); Glyphs.text(g, '{confirm} READY', N.readyBtn[0] + 50, N.readyBtn[1] + 8, UI.GOLD, { align: 'center' });
      UI.panel(g, ...N.moreBtn, { border: c.asked ? '#ff9a5a' : UI.EDGE }); Glyphs.text(g, '{lob} / T  MORE TIME', N.moreBtn[0] + 50, N.moreBtn[1] + 8, c.asked ? '#ff9a5a' : '#ffffff', { align: 'center' });
    });
  }
};
