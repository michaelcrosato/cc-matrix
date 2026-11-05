/* ---- PRACTICE: COACH MARGE'S DRILLS (11.4), built from match primitives at the Ol' Icebox with the house lights half on.
 * 1 Wheels, 2 Tape to Tape, 3 Top Shelf, 4 One-Timers, 5 Finish Your Check, 6 Gloves Off, 7 KABOOM! Each opens with a
 * voiced Marge line and a prompt panel, tracks its counter, saves its completion; all 7 earn "Marge Approved" ---- */
const Drills = (() => {
  const LIST = [
    { n: 1, title: 'WHEELS', teach: 'Skating, turbo, stops', line: "Skate the gates in order. Twenty-five seconds. The red gate wants a hockey stop.", help: 'STICK SKATE   {turbo} TURBO   REVERSE THE STICK AT SPEED TO STOP' },
    { n: 2, title: 'TAPE TO TAPE', teach: 'Passes, saucers, aim', line: 'Five passes to your mates on the move. Then flip a saucer over the sled.', help: '{pass} PASS   {lob} SAUCER   THE STICK (OR MOUSE) AIMS' },
    { n: 3, title: 'TOP SHELF', teach: 'Shots, aim, lift', line: 'Empty net, four corners. Ping every target.', help: 'TAP {shoot} WRISTER   HOLD {shoot} SLAPSHOT   STICK UP / DOWN PICKS THE SIDE' },
    { n: 4, title: 'ONE-TIMERS', teach: 'One-timers', line: "Dunny feeds you across the crease. Don't stop it. Hit it.", help: 'PASS COMING? {shoot} ONE-TIMER' },
    { n: 5, title: 'FINISH YOUR CHECK', teach: 'Checks, turbo hits, the glass', line: 'Three big hits on the dummies. Put one through the glass.', help: 'NO PUCK: {shoot} CHECK   {turbo} TURBO INTO IT' },
    { n: 6, title: 'GLOVES OFF', teach: 'The fight controls', line: "Big Lou'll spar you. He goes easy. Mostly.", help: '{pass} JAB   {shoot} HAYMAKER   {deke} DUCK   {lob} YANK' },
    { n: 7, title: 'KABOOM!', teach: 'KABOOM mode', line: "Full meter. Score with a KABOOM shot, then dance away from Lou's KABOOM check.", help: 'HOLD {shoot} FULL FOR A KABOOM SHOT   {deke} DEKE HIS CHECK' }
  ];
  let chainList = null, chainDone = null;
  function chain(list, done) { chainList = list.slice(); chainDone = done; next(); }
  function next() { if (!chainList || !chainList.length) { const d = chainDone; chainList = null; chainDone = null; if (d) d(); return; } const n = chainList.shift(); game.go('match', { cfg: cfg(n, true) }, { fade: 'wipe' }); }
  const GATES = [[Rink.C.x - 250, Rink.C.y - 110], [Rink.C.x, Rink.C.y - 140], [Rink.C.x + 260, Rink.C.y - 90], [Rink.C.x + 300, Rink.C.y + 110, 'stop'], [Rink.C.x, Rink.C.y + 130], [Rink.C.x - 300, Rink.C.y + 60]];
  const TARGETS = [[-11, 16], [11, 16], [-11, 4], [11, 4]];
  function cfg(n, chained) {
    const D = LIST[n - 1];
    const c = { mode: 'drill', drill: n, home: 'muskrats', away: n === 6 || n === 7 ? 'muskrats' : 'drillers', arena: 'icebox', intros: false, flood: 'never', replays: n === 4 || n === 7 ? 'auto' : 'off', periods: 1, periodLen: 600,
      humans: [{ team: 0, input: game.input, name: 'P1' }], rules: { clock: false, fights: n === 6, items: false, hazards: false, boom: n === 7 }, noAutoSwitch: true, noSwitch: true, seed: 4200 + n, events: [] };
    if (c.away === c.home) c.away = 'drillers';
    c.onStart = m => setup(m, n);
    c.tick = (m, dt) => tick(m, n, dt);
    c.drawExtra = (r, m) => drawExtra(r, m, n);
    c.onFinal = m => { if (m.drillState.ok) { Save.drillDone(n); if (Save.data.badge && !Save.data.badgeSeen) { Save.data.badgeSeen = true; UI.toast('BADGE: MARGE APPROVED!', UI.GOLD, 4); } } if (chained) next(); else game.go('practice', { drill: n, passed: m.drillState.ok }, { fade: 'wipe' }); };
    return c;
  }
  function setup(m, n) {
    const D = LIST[n - 1], h = m.humans[0], ds = m.drillState = { n, t: 0, count: 0, need: [6, 6, 4, 3, 4, 1, 2][n - 1], ok: false, gate: 0, hits: [], intro: 3.2, msg: null, part: 0, feed: 0 };
    Talk.init(); Synth.say(D.line, CAST.marge.voice); L.ambient = .45;
    const off = s => { s.offIce = true; Skater.setState(s, 'skate'); s.x = Rink.C.x + s.id * 30 - 80; s.y = Rink.Y0 - 30; };
    const keep = s => { s.offIce = false; };
    for (const s of m.skaters) s.drillStay = true;
    m.drillKeep = [];
    const human = m.teams[0].skaters[n === 4 ? 1 : n === 5 || n === 7 ? 2 : 0];
    if (h.skater !== human) Match.swap(m, h, human);
    if (n === 1) { for (const s of m.skaters) if (s !== human) off(s); for (const g of m.goalies) g.offIce = true; }
    if (n === 2) { for (const s of m.teams[1].skaters) off(s); for (const g of m.goalies) g.offIce = true; }
    if (n === 3) { for (const s of m.skaters) if (s !== human) off(s); for (const g of m.goalies) g.offIce = true; }
    if (n === 4) { for (const s of m.teams[1].skaters) off(s); m.teams[0].skaters[2].offIce = true; replaceGoalie(m, 1, TEAMS.muskrats.goalie); m.goalies[0].offIce = true; }
    if (n === 5) { for (const s of m.teams[0].skaters) if (s !== human) off(s); for (const g of m.goalies) g.offIce = true; m.teams[1].skaters.forEach((s, i) => { s.dummy = true; s.def = Object.assign({}, s.def, { name: 'DUMMY ' + (i + 1) }); }); }
    if (n === 6) { for (const s of m.skaters) if (s !== human && s.id !== 3) off(s); for (const g of m.goalies) g.offIce = true; const lou = m.teams[1].skaters[0]; lou.def = Object.assign({}, TEAMS.muskrats.players[2], { team: 'muskrats' }); lou.rig = Rigs.skater(lou.def, false); lou.hairColor = lou.rig.C.hair; lou.helmetColor = lou.rig.hkGear.helmet; m.cfg.aiBonus = [0, -.4]; }
    if (n === 7) { for (const s of m.teams[0].skaters) if (s !== human) off(s); m.teams[1].skaters.forEach((s, i) => { if (i > 0) off(s); }); const lou = m.teams[1].skaters[0]; lou.def = Object.assign({}, TEAMS.muskrats.players[2], { team: 'muskrats' }); lou.rig = Rigs.skater(lou.def, false); lou.hairColor = lou.rig.C.hair; lou.helmetColor = lou.rig.hkGear.helmet; lou.offIce = true; replaceGoalie(m, 1, TEAMS.drillers.goalie); m.goalies[0].offIce = true; }
    m.setPhase('drill', 999);
    place(m, n);
  }
  function replaceGoalie(m, t, def) { const g = m.teams[t].goalie, ng = Goalie.make(m, t, def, t === 0); ng.cpu = true; ng.stats = g.stats; Object.assign(g, { def: ng.def, rig: ng.rig }); }
  /** put the drill's bodies and the puck where the drill starts */
  function place(m, n) {
    const ds = m.drillState, hs = m.humans[0].skater, pk = m.puck;
    Object.assign(pk, Puck.make()); m.noPuck = n === 1 || n === 5 || n === 6;
    for (const s of m.skaters) { s.vx = s.vy = 0; if (s.state !== 'fight') Skater.setState(s, 'skate'); }
    for (const g of m.goalies) { const nt = m.defNet(g.team); g.x = Rink.goalX(nt) - Rink.intoNet(nt) * 12; g.y = Rink.C.y; g.state = 'ready'; }
    if (n === 1) { hs.x = Rink.C.x - 330; hs.y = Rink.C.y; pk.x = -999; pk.y = -999; pk.out = true; }
    if (n === 2) { hs.x = Rink.C.x - 100; hs.y = Rink.C.y; const [a, b] = m.teams[0].skaters.filter(s => s !== hs); a.x = Rink.C.x + 60; a.y = Rink.C.y - 110; b.x = Rink.C.x + 60; b.y = Rink.C.y + 110; Puck.setOwner(m, pk, hs, 'drill'); }
    if (n === 3) { hs.x = Rink.C.x + 200; hs.y = Rink.C.y + (RNG.sim() - .5) * 120; hs.facing = 0; Puck.setOwner(m, pk, hs, 'drill'); }
    if (n === 4) { const gx = Rink.goalX(m.attackNet(0)), dir = m.attackDir(0); hs.x = gx - dir * 78; hs.y = Rink.C.y + 34; hs.facing = dir > 0 ? 0 : PI; const d = m.teams[0].skaters[0]; d.x = gx - dir * 50; d.y = Rink.C.y - 80; Puck.setOwner(m, pk, d, 'drill'); ds.feed = 1.2; }
    if (n === 5) { hs.x = Rink.C.x - 100; hs.y = Rink.C.y + 40; m.teams[1].skaters.forEach((s, i) => { s.offIce = false; s.x = Rink.C.x - 180 + i * 180; s.y = Rink.Y0 + 22; s.facing = PI / 2; }); pk.out = true; pk.x = -999; }
    if (n === 6) { const lou = m.teams[1].skaters[0]; hs.x = Rink.C.x - 20; hs.y = Rink.C.y; lou.x = Rink.C.x + 10; lou.y = Rink.C.y; lou.offIce = false; pk.out = true; pk.x = -999; }
    if (n === 7) { hs.x = Rink.C.x + 120; hs.y = Rink.C.y; Puck.setOwner(m, pk, hs, 'drill'); m.boom[0] = 99.5; Boom.add(m, 0, 5); }
  }
  function tick(m, n, dt) {
    const ds = m.drillState; if (!ds) return; if (ds.done) { if (m.phase !== 'drill_done') m.setPhase('drill_done', 1.6); return; } ds.t += dt; ds.intro = Math.max(0, ds.intro - dt);
    const hs = m.humans[0].skater, pk = m.puck;
    if (m.phase === 'faceoff') { m.setPhase('play'); place(m, n); }
    if (m.phase !== 'play' && m.phase !== 'fight' && m.phase !== 'goal' && m.phase !== 'replay' && m.phase !== 'stoppage' && m.phase !== 'drill_done') m.setPhase('play');
    if (m.phase === 'stoppage' && m.phaseT < -1) { m.setPhase('play'); place(m, n); }
    const success = () => { if (ds.ok) return; ds.ok = true; ds.done = true; Synth.sfx('star'); Synth.say("That's the way. Next!", CAST.marge.voice); Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 2.6); };
    if (n === 1) {
      const g = GATES[ds.gate]; if (g && Math.hypot(hs.x - g[0], hs.y - g[1]) < 26) { if (g[2] === 'stop' && Math.hypot(hs.vx, hs.vy) > 30) { ds.msg = 'STOP IN THE RED GATE!'; } else { ds.gate++; ds.count = ds.gate; Synth.sfx('pickup'); } }
      if (ds.gate >= GATES.length) success(); else if (ds.t > 25 + 3) { ds.t = 0; ds.gate = 0; ds.count = 0; place(m, n); Synth.say('Again. Faster.', CAST.marge.voice); }
    }
    if (n === 2) {
      const mates = m.teams[0].skaters.filter(s => s !== hs && !s.offIce);
      mates.forEach((s, i) => { const a = ds.t * .7 + i * PI; s.ai.tx = Rink.C.x + 60 + Math.cos(a) * 120; s.ai.ty = Rink.C.y + Math.sin(a) * 120; s.ai.thinkT = 9; });
      if (pk.owner && pk.owner !== hs && pk.owner.team === 0) { ds.back = (ds.back || 0) + dt; if (ds.back > .7) { ds.back = 0; pk.owner.passPick = hs.id; Shots.pass(m, pk.owner, false); } }
      if (pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 5)) { ds.idle = (ds.idle || 0) + dt; if (ds.idle > 1.2 || pk.out) { ds.idle = 0; pk.out = false; Puck.setOwner(m, pk, hs, 'drill'); } }
    }
    if (n === 3 && (pk.inNet >= 0 || pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 10 && ds.t > 1))) { ds.reset = (ds.reset || 0) + dt; if (ds.reset > .5) { ds.reset = 0; pk.inNet = -1; pk.out = false; m.setPhase('play'); place(m, n); } }
    if (n === 4) {
      const d = m.teams[0].skaters[0]; d.ai.tx = Rink.goalX(m.attackNet(0)) - m.attackDir(0) * 50; d.ai.ty = Rink.C.y - 80; d.ai.thinkT = 9;
      if (pk.owner === d) { ds.feed -= dt; if (ds.feed <= 0) { ds.feed = 1.4; d.passPick = hs.id; Shots.pass(m, d, false); } }
      hs.ai.tx = hs.x; if ((pk.inNet >= 0 && m.phase !== 'goal') || pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 10 && ds.t > 1) || (pk.owner && pk.owner === hs && ds.t > 2)) { ds.reset = (ds.reset || 0) + dt; if (ds.reset > .6) { ds.reset = 0; pk.inNet = -1; pk.out = false; m.setPhase('play'); place(m, n); } }
    }
    if (n === 5) { for (const s of m.teams[1].skaters) { s.intent.mx = s.intent.my = 0; s.ai.thinkT = 9; if (s.state === 'skate' && Math.hypot(s.vx, s.vy) < 5 && ds.t > 1) { const i = m.teams[1].skaters.indexOf(s); s.x = approach(s.x, Rink.C.x - 180 + i * 180, 40 * dt); s.y = approach(s.y, Rink.Y0 + 22, 40 * dt); } } if (ds.bigs >= 3 && ds.glass) success(); ds.count = Math.min(3, ds.bigs || 0) + (ds.glass ? 1 : 0); }
    if (n === 6 && !m.fight && !ds.started && ds.t > 1.5) { ds.started = true; Fight.start(m, hs, m.teams[1].skaters[0]); }
    if (n === 6 && ds.started && !m.fight && !ds.done && m.phase !== 'fight') { if (ds.won) success(); else { ds.started = false; ds.t = 0; place(m, n); Synth.say('Up you get. Again.', CAST.marge.voice); } }
    if (n === 7) {
      if (m.kaboom[0] <= 0 && ds.part === 0 && ds.t > 1) { m.boom[0] = 100; Boom.start(m, 0); }
      if (ds.part === 0 && (pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 8 && ds.t > 2 && m.phase === 'play'))) { place(m, n); }
      if (ds.part === 1) { const lou = m.teams[1].skaters[0]; lou.offIce = false; m.kaboom[1] = Math.max(m.kaboom[1], 5); lou.ai.tx = hs.x; lou.ai.ty = hs.y; lou.ai.thinkT = 9; lou.ai.turbo = true; if (U.dist(lou, hs) < 28 && lou.checkCD <= 0 && lou.state === 'skate') lou.intent.press.shoot = true; ds.louT = (ds.louT || 0) + dt;
        if (ds.dodged) success(); else if (hs.state === 'down') { ds.louT = 0; ds.part = 1; lou.x = hs.x + 200; lou.y = hs.y; Synth.say('Deke him! When he lunges!', CAST.marge.voice); } else if (ds.louT > 7) success(); }
    }
  }
  function wire() {
    const M = () => Match.m, ds = () => M() && M().cfg.mode === 'drill' ? M().drillState : null;
    Bus.sim('pass_complete', e => { const d = ds(); if (!d || d.n !== 2) return; const m = M(), from = m.byId(e.from); if (from && from.ctrl.kind === 'human') { if (m.puck.passKind === 'saucer' || d.lastKind === 'saucer') d.saucer = true; d.count++; if (d.count >= 5 && d.saucer) { d.ok = true; d.done = true; Synth.sfx('star'); Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 2.6); } } });
    Bus.sim('pass', e => { const d = ds(); if (d && d.n === 2) d.lastKind = e.kind; });
    Bus.sim('goal', e => { const d = ds(); if (!d) return; const m = M();
      if (d.n === 3) { const pk = m.puck, dy = pk.y - Rink.C.y, k = TARGETS.findIndex((t2, i) => !d.hits.includes(i) && Math.abs(dy - t2[0]) < 6 && Math.abs(pk.z - t2[1]) < 6); if (k >= 0) { d.hits.push(k); d.count = d.hits.length; Synth.sfx('post'); if (d.hits.length >= 4) { d.ok = true; d.done = true; Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 2.6); } } }
      if (d.n === 4 && e.kind === 'onetimer') { d.count++; if (d.count >= 3) { d.ok = true; d.done = true; Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 4); } }
      if (d.n === 7 && e.kind === 'kaboom' && d.part === 0) { d.part = 1; d.count = 1; const lou = m.teams[1].skaters[0], hs = m.humans[0].skater; lou.offIce = false; lou.x = Rink.C.x - 200; lou.y = Rink.C.y; Synth.say("Now Lou's coming. Deke him!", CAST.marge.voice); m.kaboom[1] = 8; }
    });
    Bus.sim('hit', e => { const d = ds(); if (d && d.n === 5 && e.big) d.bigs = (d.bigs || 0) + 1; });
    Bus.sim('glass', e => { const d = ds(); if (d && d.n === 5 && e.state === 'shattered') d.glass = true; });
    Bus.sim('fight_end', e => { const d = ds(); if (d && d.n === 6) { const m = M(), w = m.byId(e.winner); d.won = !!(w && w.ctrl.kind === 'human'); } });
    Bus.sim('deke_dodge', e => { const d = ds(); if (d && d.n === 7 && d.part === 1) { const m = M(), s = m.byId(e.by); if (s && s.ctrl.kind === 'human') { d.dodged = true; d.count = 2; } } });
  }
  function drawExtra(r, m, n) {
    const ds = m.drillState; if (!ds) return; const D = LIST[n - 1];
    if (n === 1) GATES.forEach((g, i) => { const done = i < ds.gate, cur = i === ds.gate; r.decal(() => { r.groundRing(g[0], g[1], 24, g[2] === 'stop' ? '#ff4a4a' : done ? '#5ad85a' : cur ? '#ffd36a' : '#7ab8ff', 1); }); r.queue(g[0], g[1], 30, gg => { const q = r.w(g[0], g[1], 30); E.font.text(gg, String(i + 1), q[0], q[1], cur ? '#ffd36a' : '#ffffff', { align: 'center', scale: 2, outline: '#000' }); if (g[2] === 'stop') E.font.text(gg, 'STOP', q[0], q[1] + 14, '#ff6a6a', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true }); });
    if (n === 2) r.queue(Rink.C.x - 20, Rink.C.y, 0, g => r.box(g, Rink.C.x - 26, Rink.C.y - 30, 0, Rink.C.x - 14, Rink.C.y + 30, 7, '#c83a2a', '#8a2a1a'));
    if (n === 3) { const gx = Rink.goalX(m.attackNet(0)); TARGETS.forEach((t2, i) => r.queue(gx, Rink.C.y + t2[0], t2[1], g => { const q = r.w(gx, Rink.C.y + t2[0], t2[1]); px.disc(g, q[0], q[1], 4, ds.hits.includes(i) ? '#5ad85a' : '#ff4a4a'); px.disc(g, q[0], q[1], 2, '#ffffff'); }, { emissive: true, bias: 2 })); }
    r.overlay(g => {
      UI.panel(g, 8, r.H - 54, Math.min(r.W - 130, 300), 40, { border: '#7ad87a', bg: ['#10281a', '#08140c'] });
      E.font.text(g, 'DRILL ' + n + ': ' + D.title, 14, r.H - 50, '#7ad87a', { outline: '#000' });
      Glyphs.text(g, D.help, 14, r.H - 38, { color: '#eef4ff' });
      const label = n === 1 ? 'GATE ' + Math.min(6, ds.gate + 1) + '/6   ' + U.mmss(Math.max(0, 28 - ds.t)) : n === 2 ? 'PASSES ' + Math.min(5, ds.count) + '/5   SAUCER ' + (ds.saucer ? '✓' : '—') : n === 3 ? 'TARGETS ' + ds.hits.length + '/4' : n === 4 ? 'ONE-TIMER GOALS ' + ds.count + '/3' : n === 5 ? 'BIG HITS ' + Math.min(3, ds.bigs || 0) + '/3   GLASS ' + (ds.glass ? '✓' : '—') : n === 6 ? 'WIN THE SPAR' : 'KABOOM GOAL ' + (ds.part > 0 ? '✓' : '—') + '   DODGE LOU ' + (ds.dodged ? '✓' : '—');
      E.font.text(g, label.replace(/✓/g, 'OK'), 14, r.H - 26, UI.GOLD, { outline: '#000' });
      if (ds.intro > 0) { const w = Math.min(r.W - 40, 330); UI.panel(g, r.W / 2 - w / 2, 60, w, 46, { border: '#7ad87a' }); Cutscene.rigOf('marge').drawPortrait(g, r.W / 2 - w / 2 + 4, 64, 38, { zoom: 2.4, turn: .3, bg: '#1a2a1a' }); E.font.text(g, D.line, r.W / 2 - w / 2 + 46, 66, '#eef4ff', { wrap: w - 54, outline: false }); }
      if (ds.msg) { E.font.text(g, ds.msg, r.W / 2, r.H * .4, '#ff8a8a', { align: 'center', scale: 2, outline: '#000' }); ds.msgT = (ds.msgT || 0) + 1 / 60; if (ds.msgT > 1.5) { ds.msg = null; ds.msgT = 0; } }
    });
  }
  return { LIST, cfg, chain, wire, place };
})();

scenes.practice = {
  enter(d) { d = d || {}; this.i = clamp((d.drill || 1) - 1, 0, 6); this.go = !!(d.drill && !('passed' in d)) && !!d.direct; Synth.music('menu'); UI.Idle.reset(); if (d.passed) UI.toast('DRILL ' + d.drill + ' PASSED!', '#7ad87a'); if (d.drill && d.start) { game.go('match', { cfg: Drills.cfg(d.drill) }); } },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    if (UI.anyRep('left')) { this.i = (this.i + 6) % 7; Synth.sfx('menuMove'); } if (UI.anyRep('right')) { this.i = (this.i + 1) % 7; Synth.sfx('menuMove'); }
    const ck = game.input.clicked(); let go = UI.anyP('confirm') || UI.anyP('start');
    if (ck && this.hits) { const h = this.hits.find(h => ck[0] >= h.x && ck[0] < h.x + h.w && ck[1] >= h.y && ck[1] < h.y + h.h); if (h) { if (h.k === 0) go = true; else { this.i = (this.i + h.k + 7) % 7; Synth.sfx('menuMove'); } } }
    const p = UI.pointer(); void p;
    if (go) { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); game.go('match', { cfg: Drills.cfg(this.i + 1) }, { fade: 'wipe' }); }
    if (UI.anyP('cancel')) { Synth.sfx('menuBack'); game.go('title', { menu: true }); }
  },
  draw(r) {
    r.sky(['#0e1a10', '#16281a', '#1e3a24']);
    r.overlay(g => {
      UI.title(g, "COACH MARGE'S DRILLS", r.W / 2, 8, 2, ['#ffffff', '#d8f8d8', '#7ad87a', '#2a6a3a']);
      this.hits = [];
      const cw = Math.min(150, (r.W - 30) / 2.4);
      for (const k of [-1, 0, 1]) {
        const i = (this.i + k + 7) % 7, D = Drills.LIST[i], f = k === 0, w = f ? cw : cw * .7, h = f ? 120 : 90, x = r.W / 2 + k * (cw * .92) - w / 2, y = f ? 40 : 55;
        UI.panel(g, x, y, w, h, { focus: f, bg: f ? ['#1a3a20', '#0a1a0c'] : ['#101a12', '#0a120c'] }); this.hits.push({ x, y, w, h, k });
        E.font.text(g, 'DRILL ' + D.n, x + w / 2, y + 6, f ? '#7ad87a' : UI.MUTED, { align: 'center', outline: false });
        E.font.title(g, D.title, x + w / 2, y + 18, { align: 'center', scale: f ? 2 : 1, colors: f ? ['#ffffff', '#ffe08a', '#ffb347'] : ['#c8d0d8', '#a8b0b8', '#889098'] });
        E.font.text(g, D.teach, x + w / 2, y + (f ? 44 : 34), '#cfe0f4', { align: 'center', wrap: w - 12, outline: false });
        if (f) E.font.text(g, '"' + D.line + '"', x + w / 2, y + 62, UI.MUTED, { align: 'center', wrap: w - 14, outline: false, font: 'tiny' });
        E.font.text(g, Save.data.drills[D.n] ? '★ PASSED' : '☆ NOT YET', x + w / 2, y + h - 12, Save.data.drills[D.n] ? UI.GOLD : '#5a6478', { align: 'center', outline: false });
      }
      E.font.text(g, Object.keys(Save.data.drills).length + '/7 PASSED' + (Save.data.badge ? '   ·   MARGE APPROVED' : ''), r.W / 2, 172, Save.data.badge ? UI.GOLD : UI.MUTED, { align: 'center', outline: false });
      UI.legend(g, r, [['left', 'CHOOSE'], ['confirm', 'START'], ['cancel', 'BACK']]);
      UI.drawToasts(g, r, 186);
    });
  }
};
