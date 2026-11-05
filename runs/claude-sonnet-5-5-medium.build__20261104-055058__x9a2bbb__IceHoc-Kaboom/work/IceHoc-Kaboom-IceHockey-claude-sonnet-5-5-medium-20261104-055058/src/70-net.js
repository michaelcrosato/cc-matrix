/* ---- AI HUB SESSION: shared-world, host-authoritative ---- */
const Net = (() => {
  const H = () => window.AIHub; let info = null, role = 'none', m = null, seq = 0, sendT = 0, snapT = 0, snaps = [], ended = false, finished = false, started = false, cardState = null, myAnswer = null, counters = [0, 0, 0, 0, 0, 0], overlay = false, ovList = null, pred = null, evId = 0, evOut = [], seenEv = new Set(), left = new Set(), roundStartedWith = 0, timeUp = false;
  const PH = ['intro', 'faceoff', 'play', 'goal', 'replay', 'stoppage', 'periodEnd', 'flood', 'final', 'fight', 'shootout']; const ST = ['skate', 'stop', 'wind', 'shoot', 'pass', 'check', 'deke', 'poke', 'stun', 'down', 'getup', 'celebrate', 'faceoff', 'fight', 'bin', 'frozen', 'buried', 'slip'];
  const GS = ['ready', 'shuffle', 'butterfly', 'glove', 'blocker', 'stack', 'poke', 'cover', 'blasted', 'celebrate', 'manual'];
  const seatSide = seat => seat % 2;
  async function boot() {
    if (!HUB) return null; try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; } if (!info) return null;
    role = info.server ? 'server' : info.isHost ? 'host' : 'client'; return info;
  }
  function cfgFor() {
    const rng = AIHub.rng('setup'), ids = TEAMS.filter(t => t.id !== 'grizzlies').map(t => t.id), h = ids[(rng() * ids.length) | 0]; let a = ids[(rng() * ids.length) | 0]; if (a === h) a = ids[(ids.indexOf(h) + 1) % ids.length];
    const humans = info.players.map(p => ({ side: seatSide(p.id), seat: p.id, input: p.id === info.me ? game.input : null, remote: p.id !== info.me, name: U.sanitize(p.name), color: p.color }));
    return { home: h, away: a, arena: ARENA_LIST[(rng() * 4) | 0], periods: 1, periodLen: 180, ot: true, shootout: false, intros: false, noFlood: true, noItems: false, session: true, humans, seed: info.seed >>> 0, diff: 1, noReplay: false, replays: true, goalLen: 3, noIntro: true, remoteClient: role === 'client', holdStart: true };
  }
  function setup() {
    const cfg = cfgFor(); Fx.hook(); m = Match.create(cfg); m.hideHud = true; m.silent = false; roundStartedWith = info.players.length; Dev.attach(m);
    for (const h of m.humans) { h.name = h.name; if (h.sk) { h.sk.nick = U.sanitize(info.players[h.seat] && info.players[h.seat].name || 'P' + (h.seat + 1)).toUpperCase(); } }
    if (role === 'client') { for (const h of m.humans) if (!h.remote) { h.remote = false; } m.cfg.remoteClient = true; }
    if (role === 'server') m.humans.forEach(h => { h.remote = true; });
    m.phase = 'faceoff'; Match.faceoffNow(Rink.CX, Rink.CY, true); m.holdCount = true; Cam.snap(Rink.CX, Rink.CY); Synth.music(null);
    AIHub.on('card', c => { cardState = c; }); AIHub.on('start', () => { started = true; });
    AIHub.on('message', onMessage); AIHub.on('leave', onLeave); AIHub.on('time-up', () => { timeUp = true; if (role !== 'client') doFinish(true); }); AIHub.on('end', () => { ended = true; try { A.music(null); A.mute(true); } catch (e) {} });
    AIHub.ready();
  }
  function onMessage(d, from) {
    if (!m || !d) return;
    if (d.t === 'in' && role !== 'client') { const h = m.humans.find(x => x.seat === from); if (!h) return; const it = h.intent; it.mx = (d.mx || 0) / 100; it.my = (d.my || 0) / 100; it.turbo = !!(d.h & 4); it.shootHeld = !!(d.h & 1); it.lobHeld = !!(d.h & 2); it.aim = d.ax != null ? { x: d.ax, y: d.ay, mouse: true } : Math.hypot(it.mx, it.my) > .3 ? { dx: it.mx, dy: it.my, move: true, stick: true } : null; const K = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch']; K.forEach((k, i) => { if (d.c && d.c[i] != null && d.c[i] !== h.cnt[i]) { it.press[k]++; h.cnt[i] = d.c[i]; } }); }
    else if (d.t === 's' && role === 'client') { snaps.push(d); if (snaps.length > 12) snaps.shift(); applySnap(d); }
  }
  function onLeave(e) { left.add(e.id); const h = m && m.humans.find(x => x.seat === e.id); if (h && h.sk && role !== 'client') { h.sk.ctrl = { kind: 'cpu', input: null, seat: null }; h.sk.chosen = false; h.sk.human = null; m.humans = m.humans.filter(x => x !== h); } if (role !== 'client' && roundStartedWith >= 2 && m && m.humans.filter(x => !x.remote || true).length <= 1 && !finished) doFinish(false); }
  const q = v => Math.round(v);
  function snapshot() {
    return { t: 's', n: ++seq, at: q(AIHub.time()), ph: PH.indexOf(m.phase), p: m.period, k: q(m.clock * 10), sc: m.score.slice(), b: [q(m.boom[0]), q(m.boom[1]), (m.kaboom[0] > 0 ? 1 : 0) | (m.kaboom[1] > 0 ? 2 : 0) | (m.ot ? 4 : 0)], pk: [q(m.puck.x), q(m.puck.y), q(m.puck.z), q(m.puck.vx), q(m.puck.vy), m.puck.owner ? m.sk.indexOf(m.puck.owner) : -1, m.puck.fire ? 1 : 0],
      e: m.sk.map(s => [q(s.x), q(s.y), q(s.vx), q(s.vy), q(((s.heading % TAU) + TAU) % TAU / TAU * 255), ST.indexOf(s.state), q(s.turbo * 100), (s.hood ? 1 : 0) | (s.items.hotsauce > 0 ? 2 : 0) | (s.state === 'bin' ? 4 : 0), s.fightU ? q(s.fightU * 100) : 0]).concat(m.gl.map(g => [q(g.x), q(g.y), GS.indexOf(g.state), q(((g.heading % TAU) + TAU) % TAU / TAU * 255)])), ev: evOut.slice(-5), f: m.fight ? [q(m.fight.ba), q(m.fight.bb), m.sk.indexOf(m.fight.a), m.sk.indexOf(m.fight.b)] : 0 };
  }
  function applySnap(d) {
    m.phase = PH[d.ph] || 'play'; m.period = d.p; m.clock = d.k / 10; if (d.sc[0] !== m.score[0] || d.sc[1] !== m.score[1]) { m.score = d.sc.slice(); } m.boom = [d.b[0], d.b[1]]; m.kaboom = [d.b[2] & 1 ? 5 : 0, d.b[2] & 2 ? 5 : 0]; m.ot = !!(d.b[2] & 4);
    const pk = d.pk; m.puck.x = pk[0]; m.puck.y = pk[1]; m.puck.z = pk[2]; m.puck.vx = pk[3]; m.puck.vy = pk[4]; m.puck.owner = pk[5] >= 0 ? m.sk[pk[5]] : null; m.puck.fire = !!pk[6];
    d.e.slice(0, 6).forEach((e, i) => { const s = m.sk[i]; s.tx_ = e; s.state = ST[e[5]] || 'skate'; s.turbo = e[6] / 100; s.hood = !!(e[7] & 1); s.fightU = e[8] / 100; s.hasPuck = m.puck.owner === s; if (e[7] & 4) s.state = 'bin'; });
    d.e.slice(6).forEach((e, i) => { const g = m.gl[i]; g.tx_ = e; g.state = GS[e[2]] || 'ready'; });
    if (d.f) { m.fight = m.fight || { a: m.sk[d.f[2]], b: m.sk[d.f[3]], ba: 100, bb: 100, sa: 100, sb: 100, cx: 0, cy: 0 }; m.fight.ba = d.f[0]; m.fight.bb = d.f[1]; m.fight.cx = (m.fight.a.x + m.fight.b.x) / 2; m.fight.cy = m.fight.a.y; } else m.fight = null;
    for (const ev of d.ev || []) { if (seenEv.has(ev[0])) continue; seenEv.add(ev[0]); fireEv(ev); }
    snapT = 0; m.lastSnap = d;
  }
  function fireEv(ev) { const [id, type, a, b, c] = ev, sk = i => m.sk[i]; try {
    if (type === 'goal') { const sc = sk(a); m.scorer = sc; Sim.emit('goal', { side: sc.side, scorer: sc, assists: [], shot: c === 1 ? 'slap' : 'wrist', fire: c === 2, pp: false }); sc.stats.goals++; }
    else if (type === 'big_hit') Sim.emit('big_hit', { a: sk(a), b: sk(b), imp: 300 }); else if (type === 'save') Sim.emit('save', { g: m.gl[a], shooter: null, kind: 'pad', froze: false });
    else if (type === 'post') Sim.emit('post', {}); else if (type === 'shatter') Sim.emit('glass_shatter', { pn: Rink.panels[a], s: sk(0), by: null }); else if (type === 'kaboom') Sim.emit('kaboom_start', { side: a });
    else if (type === 'fight') Sim.emit('fight_start', { a: sk(a), b: sk(b) }); else if (type === 'whistle') Sim.emit('whistle', {}); else if (type === 'horn') Sim.emit('horn_period', { period: a }); else if (type === 'final') Sim.emit('final', { score: m.score.slice() }); else if (type === 'shot') Sim.emit('shot', { s: sk(a), kind: b === 1 ? 'slap' : 'wrist', spd: 400, kab: c === 1 }); else if (type === 'stop') Sim.emit('stop', { s: sk(a) });
  } catch (e) {} }
  function hookEvents() {
    const push = (type, a, b, c) => { evOut.push([++evId, type, a, b, c]); if (evOut.length > 12) evOut.shift(); }; const idx = s => m.sk.indexOf(s);
    Bus.on('goal', e => { if (role !== 'client') push('goal', idx(e.scorer), 0, e.fire ? 2 : e.shot === 'slap' ? 1 : 0); }); Bus.on('big_hit', e => { if (role !== 'client') push('big_hit', idx(e.a), idx(e.b)); }); Bus.on('save', e => { if (role !== 'client') push('save', e.g.side); }); Bus.on('post', e => { if (role !== 'client') push('post'); });
    Bus.on('glass_shatter', e => { if (role !== 'client') push('shatter', e.pn.id); }); Bus.on('kaboom_start', e => { if (role !== 'client') push('kaboom', e.side); }); Bus.on('fight_start', e => { if (role !== 'client') push('fight', idx(e.a), idx(e.b)); }); Bus.on('whistle', e => { if (role !== 'client') push('whistle'); });
    Bus.on('horn_period', e => { if (role !== 'client') push('horn', e.period); }); Bus.on('final', e => { if (role !== 'client') push('final'); }); Bus.on('shot', e => { if (role !== 'client') push('shot', idx(e.s), e.kind === 'slap' ? 1 : 0, e.kab ? 1 : 0); }); Bus.on('stop', e => { if (role !== 'client') push('stop', idx(e.s)); });
  }
  function sendInput(dt) {
    sendT += dt; if (sendT < 1 / 15) return; sendT = 0; const mine = m.humans.find(h => h.seat === info.me); if (!mine) return; Match.humanIntent(m, mine, dt); const it = mine.intent, P = it.press;
    const cn = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch'].map(k => P[k] & 255); const msg = { t: 'in', s: ++seq, at: q(AIHub.time()), mx: q(it.mx * 100), my: q(it.my * 100), h: (it.shootHeld ? 1 : 0) | (it.lobHeld ? 2 : 0) | (it.turbo ? 4 : 0), c: cn }; if (it.aim && it.aim.mouse) { msg.ax = q(it.aim.x); msg.ay = q(it.aim.y); }
    try { AIHub.send(msg, { to: info.host, reliable: false }); } catch (e) {}
  }
  function clientStep(dt) {
    // interpolate others ~120 ms behind; own skater predicted
    const mine = m.humans.find(h => h.seat === info.me), me = mine && mine.sk; snapT += dt;
    const blend = Math.min(1, dt * 12);
    for (const s of m.sk) { const e = s.tx_; if (!e) continue; const tx = e[0] + e[2] * snapT, ty = e[1] + e[3] * snapT, ha = e[4] / 255 * TAU; if (s === me && s.state !== 'bin') continue; if (Math.hypot(tx - s.x, ty - s.y) > 80) { s.x = tx; s.y = ty; } else { s.x += (tx - s.x) * blend; s.y += (ty - s.y) * blend; } s.vx = e[2]; s.vy = e[3]; s.heading += U.angDiff(s.heading, ha) * blend; }
    for (const g of m.gl) { const e = g.tx_; if (!e) continue; g.x += (e[0] - g.x) * blend; g.y += (e[1] - g.y) * blend; g.heading += U.angDiff(g.heading, e[3] / 255 * TAU) * blend; }
    if (me && me.tx_) { // predict
      const e = me.tx_; if (!pred) pred = { x: e[0], y: e[1], vx: e[2], vy: e[3], heading: me.heading, state: 'skate', stopT: 0, turbo: e[6] / 100, rt: me.rt, hasPuck: me.hasPuck, winding: false, turboIdle: 0 };
      Match.humanIntent(m, mine, dt); const it = mine.intent; if (['skate', 'stop', 'wind', 'shoot', 'pass'].includes(me.state)) { pred.state = pred.state === 'stop' ? 'stop' : 'skate'; pred.hasPuck = me.hasPuck; pred.rt = me.rt; Skating.skateStep(pred, it, dt, { infiniteTurbo: false }); pred.x += pred.vx * dt; pred.y += pred.vy * dt; Rink.clampBody(pred, 7); }
      else { pred.x = e[0]; pred.y = e[1]; pred.vx = e[2]; pred.vy = e[3]; }
      const err = Math.hypot(e[0] + e[2] * snapT - pred.x, e[1] + e[3] * snapT - pred.y); if (err > 48) { pred.x = e[0]; pred.y = e[1]; pred.vx = e[2]; pred.vy = e[3]; } else { pred.x += (e[0] + e[2] * snapT - pred.x) * Math.min(1, dt * 3); pred.y += (e[1] + e[3] * snapT - pred.y) * Math.min(1, dt * 3); pred.vx += (e[2] - pred.vx) * Math.min(1, dt * 3); pred.vy += (e[3] - pred.vy) * Math.min(1, dt * 3); }
      me.x = pred.x; me.y = pred.y; me.vx = pred.vx; me.vy = pred.vy; me.heading = pred.heading; if (me.hasPuck) { const bp = Rigs.stickPoint(me); m.puck.x = bp[0]; m.puck.y = bp[1]; }
    }
    for (const s of m.sk) { s.pickCool = 0; s.swing = Math.max(0, s.swing - dt); }
    m.t += dt; m.pt += dt; Flow.animate(m, dt); Crowd.step(dt);
  }
  function doFinish(timeup) {
    if (finished || role === 'client') return; finished = true; const sc = m.score, win = sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1; const hs = m.humans.map(h => h.seat).concat(info.players.map(p => p.id).filter(id => !left.has(id) && !m.humans.find(h => h.seat === id))); const alive = info.players.map(p => p.id).filter(id => !left.has(id));
    const win_ids = alive.filter(id => seatSide(id) === win), lose_ids = alive.filter(id => seatSide(id) !== win); const standings = win < 0 ? [alive] : [win_ids, lose_ids].filter(a => a.length);
    const scores = {}, stats = {}; for (const p of info.players) { const h = m.humans.find(x => x.seat === p.id), s = h && h.sk || m.sk.find(x => x.side === seatSide(p.id)); const g = s ? s.stats.goals : 0, a = s ? s.stats.assists : 0; scores[p.id] = g + a; stats[p.id] = { Goals: g, Assists: a, Hits: s ? s.stats.hits : 0, Fights: s ? s.stats.fightsWon : 0 }; }
    Results.compute(m); const awards = []; m.res.stars.forEach((st, i) => { const h = m.humans.find(x => x.sk === st.s); if (h && !st.goalie) awards.push({ id: h.seat, title: ['1st Star', '2nd Star', '3rd Star'][i], detail: st.line }); });
    const args = { standings: standings.length ? standings : [alive], scores, stats, awards }; if (info.players.length === 1) { args.standings = [[info.players[0].id]]; args.won = win === 0; } else if (win >= 0) args.won = undefined;
    try { AIHub.finish(args); } catch (e) { game.fail('finish', e); }
  }
  // ---- scene ----
  const sc = { view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], expand: true, res: 'ps1', pausable: false,
    enter() { hookEvents(); setup(); Backdrop.kill(); m.cfg.holdStart = true; this.t = 0; Synth.crowdStart(); this.phase = 'card'; game.weather = m.arena.weather ? { kind: m.arena.weather, amount: .5 } : null; ovList = new UI.List([{ label: 'Sound', value: () => Math.round(game.settings.volume * 100) + '%', adjust: d => game.settings.set('volume', clamp(game.settings.volume + d * .1, 0, 1)) }, { label: 'Music', value: () => Math.round(game.settings.music * 100) + '%', adjust: d => game.settings.set('music', clamp(game.settings.music + d * .1, 0, 1)) }, { label: 'Voices', value: () => S('voiceVol'), adjust: d => cyc('voiceVol', d) }, { label: 'Button symbols', value: () => S('glyphs'), adjust: d => cyc('glyphs', d), toggle: () => cyc('glyphs', 1) }, { label: 'Camera', value: () => S('camMode'), adjust: d => cyc('camMode', d), toggle: () => cyc('camMode', 1) }, { label: 'Back', action: () => { overlay = false; } }], { vis: 6 }); },
    update(dt) {
      if (!m || ended) { return; } const I = game.input;
      if (role !== 'client') { snapAcc += dt; if (snapAcc >= 1 / 15) { snapAcc = 0; try { AIHub.send(snapshot(), { reliable: false }); } catch (e) { } } } else if (m) { try { sendInput(dt); } catch (e) { } }
      if (!started) { // the card
        this.t += dt; if (I.pressed('confirm') || I.pressed('start')) { myAnswer = 'ready'; AIHub.answer('ready'); } if (I.pressed('lob') || I.pressed('Pad3')) { AIHub.answer('more'); } const c = I.clicked && I.clicked(); if (c) { if (c[0] > game.W / 2 + 10) AIHub.answer('more'); else { AIHub.answer('ready'); } }
        Flow.animate(m, dt); Cam.update(m, dt); return; }
      this.phase = 'play'; m.hideHud = false; const tm = AIHub.time();
      if (tm < 0) { m.holdSim = true; Flow.animate(m, dt); Cam.update(m, dt); return; }
      if (m.holdSim) { m.holdSim = false; Synth.music('play'); }
      if (I.pressed('pause') && !overlay) { overlay = true; } else if (overlay && I.pressed('pause')) overlay = false;
      if (overlay) { ovList.update(dt); for (const h of m.humans) if (!h.remote) { h.input = { move: () => [0, 0], down: () => false, pressed: () => false, released: () => false, clicked: () => null, padAim: null, lastDevice: 'keyboard' }; } } else for (const h of m.humans) if (h.seat === info.me) h.input = game.input;
      if (role === 'client') { clientStep(dt); }
      else { Flow.step(m, dt); if (m.over || m.phase === 'final' && m.pt > 1) doFinish(false); }
      Talk.update(dt); Cam.update(m, dt); if (m.ot && m.clock <= 0 && m.phase === 'play') { m.clock = 0; }
      if (role !== 'client' && m.ot && m.phase === 'play' && m.clock <= 0 && !finished) { Flow.finalize(m); }
    },
    draw(r) {
      if (!m) return; if (role === 'server') { r.sky(['#000', '#112']); r.overlay(g => UI.txt(g, 'HOSTING', 8, 8, '#9ab')); return; }
      DrawMatch.draw(r, m, game.time);
      r.overlay(g => {
        if (!started || AIHub.time() < 0) card(g, r); if (overlay) { UI.box(g, r.W / 2 - 100, 40, 200, 130, { border: UI.GOLD }); UI.txt(g, 'OPTIONS', r.W / 2, 46, UI.GOLD, { align: 'center' }); ovList.draw(g, r.W / 2 - 92, 60, 184, 15); }
        if (ended) { px.rect(g, 0, 0, r.W, r.H, 'rgba(0,0,0,.4)'); UI.txt(g, 'FINAL', r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 3 }); } });
    }
  };
  let snapAcc = 0;
  const cyc = (k, d) => { const o = SETTINGS.find(s => s.key === k).options, i = o.indexOf(S(k)); game.settings.set(k, o[(i + d + o.length) % o.length]); };
  function card(g, r) {
    const tm = started ? AIHub.time() : -Infinity; px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.55)'); UI.title(g, 'ICE HOC-KABOOM', r.W / 2, 8, 3); UI.txt(g, m.teams[0].name + '  vs  ' + m.teams[1].name, r.W / 2, 34, '#fff', { align: 'center' }); UI.txt(g, 'HOW TO WIN: Outscore the other team in one 3-minute period', r.W / 2, 48, UI.GOLD, { align: 'center' });
    info.players.forEach((p, i) => { const x = 30 + i * 70, ready = cardState && cardState.ready && cardState.ready.includes(p.id); UI.box(g, x, 62, 64, 24, { border: p.color }); UI.txt(g, U.sanitize(p.name).toUpperCase(), x + 32, 66, p.color, { align: 'center' }); UI.txt(g, ready ? '+ READY' : '...', x + 32, 76, ready ? '#6ae06a' : '#789', { align: 'center' }); });
    Glyphs.text(g, 'YOUR CONTROLS:  STICK SKATE   {pass} PASS   {shoot} SHOOT   {deke} DEKE   {turbo} TURBO', r.W / 2, 104, { align: 'center', color: '#fff' }); Glyphs.text(g, '{pass} READY      {lob} MORE TIME', r.W / 2, 120, { align: 'center', color: UI.GOLD }); const left = cardState && cardState.left != null ? Math.ceil(cardState.left / 1000) : null;
    if (left != null) UI.txt(g, 'STARTS IN ' + left, r.W / 2, 138, '#cfe', { align: 'center', scale: 2 }); if (started && tm < 0) UI.txt(g, String(Math.ceil(-tm / 1000)), r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 6 });
  }
  return { boot, sc, get info() { return info; }, get role() { return role; }, snapshot: () => m && snapshot(), get active() { return !!info; } };
})();
