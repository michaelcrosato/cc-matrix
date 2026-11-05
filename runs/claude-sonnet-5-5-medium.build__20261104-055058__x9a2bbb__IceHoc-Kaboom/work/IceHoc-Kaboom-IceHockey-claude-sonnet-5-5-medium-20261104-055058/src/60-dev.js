/* ---- PRACTICE DRILLS ---- */
const Drills = (() => {
  let st = null;
  const cfgOf = (id) => ({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, periodLen: 600, ot: false, shootout: false, humans: [{ side: 0, input: game.input, seat: 0 }], noBoom: id !== 7, noItems: true, noFight: id !== 6, noReplay: true, noIntro: true, noSwitch: true, drill: id, noSinBin: true, freezeAI: id === 1 || id === 3 || id === 5 || id === 6 || id === 7, flood: false, intros: false, replays: false, practice: id === 6 ? 'spar' : null, noGoalie: id === 3, seed: 100 + id });
  function start(id, ret) { Scenes.drillRet = ret; game.go('match', { cfg: cfgOf(id), ret: 'practice', kind: 'drill' }, { fade: 'wipe' }); }
  const park = (m, sides) => { for (const s of m.sk) if (sides.includes(s.side) && s !== m.humans[0].sk) { s.state = 'bin'; s.bin = 1e9; } };
  function begin(m, id) {
    const dr = DRILLS[id - 1], me = m.humans[0].sk; st = { id, dr, n: 0, need: dr.need, t: 0, done: false, intro: 7, gate: 0, flags: {}, fin: 0, saucer: 0, corners: {}, tleft: 25 };
    m.phase = 'play'; m.fo = null; m.noPickup = id === 1 || id === 5 || id === 6; m.hideHud = false; m.clock = 600;
    me.x = Rink.CX - 200; me.y = Rink.CY; me.heading = 0; me.vx = me.vy = 0;
    if (id === 1) { park(m, [1]); for (const s of m.sk) if (s.side === 0 && s !== me) { s.state = 'bin'; s.bin = 1e9; } m.puck.frozen = true; m.puck.x = Rink.CX; m.puck.y = Rink.CY; st.gates = [[Rink.CX - 200, Rink.CY - 120], [Rink.CX - 40, Rink.CY + 130], [Rink.CX + 120, Rink.CY - 120], [Rink.CX + 280, Rink.CY + 20], [Rink.CX + 60, Rink.CY + 20], [Rink.CX - 260, Rink.CY + 80]]; }
    if (id === 2) { park(m, [1]); respawn(m); }
    if (id === 3) { park(m, [1]); st.targets = [[1, -1], [1, 1], [0, -1], [0, 1]]; respawn(m); }
    if (id === 4) { for (const s of m.sk) if (s.side === 1 && s.slot !== 99) { s.state = 'bin'; s.bin = 1e9; } respawn(m); }
    if (id === 5) { for (const s of m.sk) if (s.side === 0 && s !== me) { s.state = 'bin'; s.bin = 1e9; } m.puck.x = Rink.CX; m.puck.frozen = true; st.dummies = m.sk.filter(s => s.side === 1); st.dummies.forEach((s, i) => { s.state = 'skate'; s.x = Rink.X0 + 110 + i * 40; s.y = Rink.Y0 + 36 + (i % 2) * 6; s.vx = s.vy = 0; s.freeze = true; s.rt.hit = 1; }); me.x = Rink.CX - 120; me.y = Rink.CY + 90; }
    if (id === 6) { for (const s of m.sk) if (s !== me && s !== m.sk.find(q => q.side === 1 && q.slot === 2)) { s.state = 'bin'; s.bin = 1e9; } const lou = m.sk.find(q => q.side === 1 && q.slot === 2); me.x = Rink.CX - 12; me.y = Rink.CY; lou.x = Rink.CX + 12; lou.y = Rink.CY; lou.state = 'skate'; lou.nick = 'BIG LOU'; me.grudge[lou.id] = 50; lou.grudge[me.id] = 50; m.puck.frozen = true; st.fightT = 1.2; }
    if (id === 7) { park(m, [1]); for (const s of m.sk) if (s.side === 0 && s !== me) { s.state = 'bin'; s.bin = 1e9; } respawn(m); Sim.addBoom(m, 0, 100); }
    Synth.babble(dr.teach, 'marge'); st.begun = true;
  }
  function respawn(m) {
    if (!st) return; const me = m.humans[0].sk, p = m.puck; m.phase = 'play'; m.phaseNoPlay = false; p.frozen = false; p.inNet = -1; p.out = false; p.fire = false; for (const g of m.gl) { g.state = 'ready'; g.save = null; if (st.id === 3) { g.x = Rink.X0 - 80; g.y = Rink.CY - 200; } else { g.x = Sim.ownGoalX(m, g.side) + Sim.attackDir(m, g.side) * 12; g.y = Rink.CY; } } m.noPickup = false;
    if (me.state === 'celebrate') me.state = 'skate'; for (const s of m.sk) if (s.state === 'celebrate') { s.state = 'skate'; }
    me.state = 'skate'; me.hasPuck = false; me.vx = me.vy = 0;
    if (st.id === 4) { const mate = m.sk.find(s => s.side === 0 && s !== me); me.x = Rink.CX + 280; me.y = Rink.CY - 20; me.heading = 0; mate.x = Rink.CX + 250; mate.y = Rink.CY + 80; mate.state = 'skate'; mate.vx = mate.vy = 0; p.owner = null; Puck.take(m, mate); st.feed = 1.2; }
    else { me.x = Rink.CX + (st.id === 7 ? 120 : st.id === 3 ? 220 : 0); me.y = Rink.CY + (RNG.sim() - .5) * 60; me.heading = 0; p.owner = null; p.x = me.x + 10; p.y = me.y; p.vx = p.vy = 0; Puck.take(m, me); }
  }
  function step(m, dt) {
    if (!st || !m.cfg.drill) return; const me = m.humans[0].sk; st.t += dt; if (st.intro > 0) st.intro -= dt;
    if (st.done) { st.fin -= dt; if (st.fin <= 0 && !m.over) { m.over = true; } return; }
    for (const s of m.sk) { if (s.freeze && s.state === 'skate') { s.vx *= .9; s.vy *= .9; } }
    const id = st.id;
    if (id === 1) { st.tleft -= dt; const g = st.gates[st.gate]; if (g && Math.hypot(me.x - g[0], me.y - g[1]) < 16 && (st.gate < 5 || st.stopped)) { st.gate++; st.n++; Synth.sfx('pickup'); } if (st.n >= 6) complete(m); else if (st.tleft <= 0) { st.tleft = 25; st.gate = 0; st.n = 0; st.stopped = false; UI.toast('TOO SLOW - AGAIN!', '#ff8a6a', 2); } }
    if (id === 4 && st.feed != null) { st.feed -= dt; const mate = m.sk.find(s => s.side === 0 && s !== me); if (st.feed <= 0 && mate.hasPuck) { st.feed = null; Puck.pass(m, mate, me.x, me.y + 10, me, false); } }
    if (id === 5 && st.glass && st.n >= 3) complete(m);
    if (id === 6) { if (st.fightT > 0) { st.fightT -= dt; if (st.fightT <= 0 && !m.fight) { const lou = m.sk.find(q => q.side === 1 && q.slot === 2); Fight.begin(m, me, lou); } } }
    if (id === 7 && me.state !== 'wind' && !me.hasPuck && !m.puck.owner && m.puck.age > 4 && Math.hypot(m.puck.vx, m.puck.vy) < 10) respawn(m); if (id === 7 && m.kaboom[0] <= 0 && !st.done) Sim.addBoom(m, 0, 100);
    if ((id === 2 || id === 3 || id === 4) && !me.hasPuck && !m.puck.owner && Math.hypot(m.puck.vx, m.puck.vy) < 6 && m.puck.age > 3 && m.phase === 'play' && !m.puck.frozen && m.humans[0].sk) { st.idle = (st.idle || 0) + dt; if (st.idle > 3) { st.idle = 0; respawn(m); } } else st.idle = 0;
    if (id === 2 && !m.puck.owner && false) {}
  }
  function complete(m) { if (st.done) return; st.done = true; st.fin = 3; Save.get().drills[st.id] = true; Save.write(); UI.banner('DRILL COMPLETE!', { size: 4, dur: 2.5 }); Synth.sfx('star'); Synth.babble('Not bad, kid. Not bad at all.', 'marge', { excl: true }); }
  Bus.on('pass_complete', e => { const m = Match.cur(); if (!st || !m || !m.cfg.drill || st.id !== 2 || st.done) return; if (e.from === m.humans[0].sk) { if (m.puck.saucer) { st.saucer++; m.puck.saucer = false; } else if (st.n < 5) st.n++; if (st.n >= 5 && st.saucer >= 1) complete(m); if (st.n >= 5) st.need = 6; } });
  Bus.on('goal', e => { const m = Match.cur(); if (!st || !m || !m.cfg.drill || st.done) return; const me = m.humans[0].sk; if (st.id === 3 && e.scorer === me) { const key = (st.shotHigh ? 1 : 0) + ':' + (st.lastY > Rink.CY ? 1 : -1); if (!st.corners[key]) { st.corners[key] = 1; st.n++; } if (st.n >= 4) complete(m); } if (st.id === 4 && e.shot === 'onetimer' && e.scorer === me) { st.n++; if (st.n >= 3) complete(m); } if (st.id === 7 && e.fire) complete(m); });
  Bus.on('stop', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 1 && e.s === m.humans[0].sk && st.gate === 5 && Math.hypot(e.s.x - st.gates[5][0], e.s.y - st.gates[5][1]) < 60) st.stopped = true; });
  Bus.on('shot', e => { if (st) { st.shotHigh = e.kind === 'slap' || e.kind === 'kaboom'; } });
  Bus.on('goal_line', () => { const m = Match.cur(); if (st && m && m.cfg.drill) { st.lastZ = m.puck.z; st.lastY = m.puck.y; } });
  Bus.on('big_hit', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 5 && e.b.freeze && e.a.side === 0) { st.n++; e.b.x = Rink.X0 + 110 + (st.n % 3) * 40; } }); Bus.on('glass_shatter', () => { if (st && st.id === 5) st.glass = true; });
  Bus.on('fight_end', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 6) { if (e.w && e.w.side === 0) complete(m); else st.fightT = 1.5; } });
  Bus.on('fight_over', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 6 && !st.done) { const me = m.humans[0].sk; me.state = 'skate'; const lou = m.sk.find(q => q.side === 1 && q.slot === 2); lou.state = 'skate'; if (lou.bin > 0) { lou.bin = 0; } me.grudge[lou.id] = 50; lou.grudge[me.id] = 50; m.phase = 'play'; m.after = null; m.phaseNoPlay = false; me.x = Rink.CX - 12; lou.x = Rink.CX + 12; me.y = lou.y = Rink.CY; m.sinBin = []; } });
  function finish(m) { const r = Scenes.drillRet; if (r && r.warm) game.go('pregame', { id: r.id, choice: r.choice, warm: true }, { fade: 'wipe' }); else game.go('practice', null, { fade: 'wipe' }); }
  function draw(g, r, m) {
    if (!st || !m.cfg.drill) return; const dr = st.dr; UI.box(g, 6, 6, 118, 36, { border: UI.GOLD, alpha: .9 }); UI.txt(g, 'DRILL ' + dr.id + ': ' + dr.name.toUpperCase(), 12, 10, UI.GOLD); UI.txt(g, st.id === 2 ? 'PASSES ' + st.n + '/5   SAUCER ' + Math.min(1, st.saucer) + '/1' : st.id === 1 ? 'GATES ' + st.n + '/6   TIME ' + Math.ceil(st.tleft) : st.id === 3 ? 'TARGETS ' + st.n + '/4  (WRIST = LOW, SLAP = HIGH)' : st.id === 4 ? 'ONE-TIMERS ' + st.n + '/3' : st.id === 5 ? 'DUMMIES ' + st.n + '/3  GLASS ' + (st.glass ? '+' : '-') : st.id === 6 ? 'WIN THE SPAR' : 'KABOOM GOAL', 12, 22, '#fff');
    if (st.id === 1 && st.gates) st.gates.forEach((gt, i) => { }); if (st.intro > 0) { UI.box(g, r.W / 2 - 150, r.H - 62, 300, 34, { border: '#ffd36a', alpha: .95 }); UI.txt(g, 'COACH MARGE', r.W / 2 - 140, r.H - 58, '#ffd36a'); UI.txt(g, dr.teach, r.W / 2 - 140, r.H - 46, '#fff', { font: 'tiny' }); } UI.drawBanners(g, r, game.dt || 1 / 60);
  }
  function world(r, m) { if (!st || !m.cfg.drill) return; if (st.id === 1 && st.gates) st.gates.forEach((gt, i) => { const ok = i < st.gate, nx = i === st.gate; r.queue(gt[0], gt[1], 0, g => { const [x, y] = r.w(gt[0], gt[1], 0), [x2, y2] = r.w(gt[0], gt[1], 22); px.line(g, Math.round(x), Math.round(y), Math.round(x2), Math.round(y2), ok ? '#4a6a4a' : nx ? '#ffd36a' : '#ff6a3a', 2); px.disc(g, Math.round(x2), Math.round(y2), 3, ok ? '#4a6a4a' : nx ? '#ffd36a' : '#ff6a3a'); E.font.text(g, String(i + 1), Math.round(x), Math.round(y2) - 10, '#fff', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: nx }); });
    if (st.id === 3) for (const [hi, sd] of st.targets) { const gx = Rink.CX + 376 + 0, gy = Rink.CY + sd * 11, key = hi + ':' + sd; r.queue(Rink.goalLineX(1), gy, 0, g => { const [x, y] = r.w(Rink.goalLineX(1), gy, hi ? 17 : 4); px.disc(g, Math.round(x), Math.round(y), 3, st.corners[key] ? '#4ae04a' : '#ff4a4a'); }, { emissive: true }); } }
  return { start, begin, step, draw, world, respawn, finish, get st() { return st; } };
})();

/* ---- DEV MODE ---- */
const Dev = (() => {
  let visible = false, live = false, tab = 0, lists = [], m = null, flags = { bodies: false, targets: false, fps: false, hud: false }, slow = 1, seedShown = 0;
  const TABS = ['TUNING', 'CHEATS', 'WARP', 'DEBUG']; const cheats = { infTurbo: false, god: false, always: false, magnet: false, freeze: false, noGoalie: false, bigHeads: false, octo: false, glow: false, retro: false };
  const SOUNDS = ['tock', 'thwap', 'snap', 'slap', 'onetimer', 'ping', 'ping2', 'boards', 'glass', 'net', 'thump', 'bighit', 'crack', 'shatter', 'whistle', 'buzzer', 'punch', 'twinkle', 'pickup', 'throw', 'splort', 'boomsub', 'ooga', 'fanfare', 'star'];
  function rows(t) {
    const M = () => Match.cur();
    if (t === 0) { const out = [{ label: 'RESET ALL TO DEFAULTS', action: () => { T.resetAll(); UI.toast('TUNING RESET', UI.GOLD, 2); } }, { label: 'LOG TUNING TO CONSOLE', action: () => { try { console.log('[TUNING]', JSON.stringify(T.nonDefault())); } catch (e) {} UI.toast('LOGGED', UI.GOLD, 1.5); } }]; let grp = ''; for (const [k, d, mn, mx, st_, g, l] of TUNE) { if (g !== grp) { grp = g; out.push({ label: '- ' + g.toUpperCase() + ' -', disabled: true }); } const fix = v => Math.abs(st_) < 1 ? v.toFixed(2) : String(Math.round(v)); out.push({ label: l, value: () => fix(T[k]) + (T[k] !== d ? '  (' + fix(d) + ')' : ''), frac: () => (T[k] - mn) / (mx - mn), adjust: dd => { T[k] = clamp(+(T[k] + st_ * dd).toFixed(4), mn, mx); T.save(); }, reset: () => { T.reset(k); }, slider: f => { T[k] = clamp(+(Math.round((mn + (mx - mn) * f) / st_) * st_).toFixed(4), mn, mx); T.save(); } }); } return out; }
    if (t === 1) { const tg = (k, l) => ({ label: l, value: () => cheats[k] ? 'ON' : 'OFF', toggle: () => { cheats[k] = !cheats[k]; applyCheats(); } }); return [tg('infTurbo', 'Infinite turbo'), tg('god', 'God mode (no knockdowns)'), tg('always', 'Always KABOOM'), tg('magnet', 'Puck magnet'), tg('freeze', 'Freeze AI'), tg('noGoalie', 'CPU goalies off'), tg('bigHeads', 'Big heads'), tg('octo', 'Octopus rain'), tg('glow', 'Glow puck'), tg('retro', 'Retro rigs'), { label: 'Instant BOOM full', action: () => { const mm = M(); if (mm) Sim.addBoom(mm, 0, 100); } }]; }
    if (t === 2) { const w = (l, f) => ({ label: l, action: () => { const mm = M(); if (mm) { try { f(mm); } catch (e) { game.fail('warp', e); } } } }); const out = [];
      STORY.chapters.forEach(ch => out.push({ label: 'Start chapter ' + ch.id + ': ' + ch.title, action: () => { visible = false; Save.get().unlocked = Math.max(Save.get().unlocked, ch.id); Story.startMatch(ch.id, 0); } }));
      out.push(w('Jump to period 2', mm => warpPeriod(mm, 2)), w('Jump to period 3', mm => warpPeriod(mm, 3)), w('Overtime', mm => { warpPeriod(mm, mm.periods); mm.clock = 0; }), w('Shootout', mm => { mm.ot = true; Shootout.begin(mm); }), w('Clock to 0:10', mm => { mm.clock = 10; }), w('Score +1 home', mm => { mm.score[0]++; }), w('Score +1 away', mm => { mm.score[1]++; }), w('Win this game now', mm => { mm.score[0] = Math.max(mm.score[0], mm.score[1] + 1); Flow.finalize(mm); }), w('Lose this game now', mm => { mm.score[1] = Math.max(mm.score[1], mm.score[0] + 1); Flow.finalize(mm); }));
      for (const k of Object.keys(ITEMS)) out.push(w('Spawn ' + ITEMS[k].name, mm => { const o = Items.throwItem(mm, k); o.fly = 0; o.x = Rink.CX; o.y = Rink.CY; }));
      out.push(w('Spawn octopus', mm => mm.octos.push({ x: Rink.CX, y: Rink.CY, t: 20 })), w('Start a fight', mm => { const a = mm.humans[0] ? mm.humans[0].sk : mm.sk[0], b = mm.sk.find(s => s.side !== a.side); if (a && b && !mm.fight) Fight.begin(mm, a, b); }), w('Start KABOOM', mm => Sim.startKaboom(mm, 0)), w('Break the thin ice', mm => { for (const t of mm.thin) { t.hp = 0; t.hole = true; t.re = 30; Sim.emit('thin_ice_break', { t, x: t.x, y: t.y }); } }), w('Shatter a panel', mm => { const p = Rink.panels[10]; p.st = 2; Sim.emit('glass_shatter', { pn: p, s: mm.sk[0], by: null }); }), w('Trigger the Flood Wagon', mm => { Flood.begin(mm, () => { Match.faceoffNow(Rink.CX, Rink.CY, true); }); }));
      out.push({ label: 'Go to results', action: () => { visible = false; const mm = M(); if (mm) { Results.compute(mm); game.go('results', { m: mm, ctx: mm.ctx }); } } }, { label: 'Go to attract', action: () => { visible = false; game.go('attract'); } }, { label: 'Go to about', action: () => { visible = false; game.go('about'); } }, { label: 'Go to animation lab', action: () => { visible = false; game.go('lab'); } }); return out; }
    const tg = (k, l) => ({ label: l, value: () => flags[k] ? 'ON' : 'OFF', toggle: () => { flags[k] = !flags[k]; if (k === 'hud') { const mm = M(); if (mm) mm.hideHud = flags.hud; } } });
    const out = [tg('bodies', 'Show bodies + blade points'), tg('targets', 'Show AI targets + roles'), tg('fps', 'FPS readout'), tg('hud', 'Hide HUD (screenshot mode)'), { label: 'Slow motion', value: () => slow + 'x', adjust: d => { slow = [1, .5, .25][(([1, .5, .25].indexOf(slow)) + (d > 0 ? 1 : 2)) % 3]; game.timeScale = slow; } }, { label: 'RNG seed', value: () => String(M() ? M().cfg.seed : '-'), action: () => {} }];
    out.push({ label: '- SOUND TEST -', disabled: true }); for (const s of SOUNDS) out.push({ label: 'sfx: ' + s, action: () => Synth.sfx(s) }); out.push({ label: 'horn', action: () => Synth.horn(false) }, { label: 'double horn', action: () => Synth.horn(true) });
    for (const k of Object.keys(Synth.ORGAN)) out.push({ label: 'organ: ' + k, action: () => Synth.organ(Synth.ORGAN[k], 140) }); for (const k of Object.keys(Synth.GOALSONG)) out.push({ label: 'goal song: ' + k, action: () => Synth.organ(Synth.GOALSONG[k], 150) });
    for (const k of Object.keys(Synth.SONGS)) out.push({ label: 'song: ' + k, action: () => Synth.music(k, { force: true }) }); for (const k of Object.keys(VOICES)) out.push({ label: 'voice: ' + k, action: () => Synth.babble('Hello there, this is a test of my voice!', k, { excl: true }) });
    for (const k of ['ohh', 'ahh', 'cheer', 'boo', 'roar', 'chant']) out.push({ label: 'crowd: ' + k, action: () => Synth.react(k) }); return out;
  }
  function warpPeriod(mm, p) { mm.period = Math.min(p, mm.periods); mm.clock = mm.cfg.periodLen; mm.phase = 'faceoff'; Match.faceoffNow(Rink.CX, Rink.CY, true); mm.end = (mm.period % 2) ? [0, 1] : [1, 0]; }
  function applyCheats() { const mm = Match.cur(); if (!mm) return; mm.cfg.infTurbo = cheats.infTurbo; mm.cfg.god = cheats.god; mm.cfg.alwaysKaboom = cheats.always; mm.cfg.freezeAI = cheats.freeze; mm.cfg.magnet = cheats.magnet; mm.cfg.noGoalieCpu = cheats.noGoalie; for (const s of mm.sk) s.rig.o.headR = cheats.bigHeads ? 1.8 : undefined; if (cheats.octo) for (let i = 0; i < 6; i++) mm.octos.push({ x: Rink.CX + (RNG.fx() - .5) * 500, y: Rink.CY + (RNG.fx() - .5) * 250, t: 25 }); if (cheats.glow) S_trail('Glow'); }
  const S_trail = v => { try { game.settings.set('puckTrail', v); } catch (e) {} };
  function build() { lists = TABS.map((_, i) => new UI.List(rows(i), { vis: 10 })); }
  function open() { if (HUB) return; visible = true; tab = 0; build(); try { game.resume(); } catch (e) {} Synth.sfx('ok'); }
  function update(dt) {
    if (!visible || HUB) return; const I = game.input; if (!lists.length) build();
    if (I.pressed('cancel') || I.pressed('pause')) { visible = false; game.input.consumeAll(); Synth.sfx('back'); return; }
    if (I.pressed('chirp')) { tab = (tab + 3) % 4; Synth.sfx('mv'); } if (I.pressed('turbo')) { tab = (tab + 1) % 4; Synth.sfx('mv'); }
    if (I.pressed('switch')) { live = !live; UI.toast('LIVE ' + (live ? 'ON' : 'OFF'), UI.GOLD, 1.2); }
    const L = lists[tab]; while (L.rows[L.i] && L.rows[L.i].disabled) L.i = (L.i + 1) % L.rows.length; L.update(dt); while (L.rows[L.i] && L.rows[L.i].disabled) { L.i = (L.i + 1) % L.rows.length; }
    const mm = Match.cur(); if (mm && cheats.magnet && !mm.puck.owner && mm.humans[0] && mm.humans[0].sk) { const s = mm.humans[0].sk, p = mm.puck; p.vx += (s.x - p.x) * .8; p.vy += (s.y - p.y) * .8; }
    if (mm && cheats.noGoalie) for (const g of mm.gl) if (g.side === 1) g.y = Rink.CY + 200;
  }
  function draw(g, r) {
    if (flags.fps) UI.txt(g, 'FPS ' + Math.round(game.fps || 60), r.W - 50, r.H - 10, '#6f6');
    if (!visible || HUB) return; const w = live ? r.W * .45 : r.W - 24, x = live ? r.W - w - 4 : 12, y = 8;
    UI.box(g, x, y, w, r.H - 16, { bg: ['#0a1020', '#05080f'], border: UI.GOLD, alpha: .96 }); TABS.forEach((t, i) => { UI.txt(g, t, x + 12 + i * 62, y + 6, i === tab ? UI.GOLD : '#789'); }); UI.txt(g, 'DEV MODE' + (live ? ' (LIVE)' : ''), x + w - 8, y + 6, '#f66', { align: 'right' });
    const L = lists[tab]; if (L) L.draw(g, x + 8, y + 20, w - 16, 14); UI.txt(g, 'L1/R1 tabs  ←▸ adjust  △ reset row  L2 live  ○ close', x + 10, r.H - 20, '#789', { font: 'tiny' });
  }
  function world(r, m_) {
    if (!flags.bodies && !flags.targets) return; const mm = m_; for (const s of mm.sk) { if (flags.bodies) { const bp = Rigs.stickPoint(s); r.queue(s.x, s.y, 1, g => { const [x, y] = r.w(s.x, s.y, 0), [bx, by] = r.w(bp[0], bp[1], 0); px.ell(g, Math.round(x), Math.round(y), 6, 4, 'rgba(255,60,60,.4)'); px.dot(g, Math.round(bx), Math.round(by), '#ff0'); }, { emissive: true }); } if (flags.targets && s.aiGoal) r.queue(s.x, s.y, 1, g => { const [x, y] = r.w(s.x, s.y, 4), [tx, ty] = r.w(s.aiGoal[0], s.aiGoal[1], 0); px.line(g, Math.round(x), Math.round(y), Math.round(tx), Math.round(ty), s.side ? '#fff' : '#fc4', 1); E.font.text(g, s.state, Math.round(x), Math.round(y) - 30, '#0f0', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true }); }
  }
  return { open, update, draw, world, attach(mm) { m = mm; applyCheats(); }, holds: (mm) => visible && !live && !HUB, get visible() { return visible; }, set visible(v) { visible = v; }, cheats, flags, rows };
})();
