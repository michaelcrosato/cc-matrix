/* ---- ATTRACT MODE (15.1): after 10 s without input on a title or menu screen, a looping reel built on the real game
 * with every skater on the AI and the cheats free: Puck Drop, Big Hits, Highlight Goal, Gloves Off, KABOOM!, Fan Frenzy,
 * a Story teaser, the Flood Wagon and a Records card (about 75 s), then again with new teams and a new barn. Any input
 * (not a touch-only tap) ends it, consumed, back to the title ---- */
const Attract = (() => {
  const SEG = [['drop', 8], ['hits', 8], ['goal', 12], ['fight', 10], ['kaboom', 10], ['fans', 7], ['story', 8], ['flood', 6], ['records', 5]];
  const st = { i: -1, t: 0, loop: 0, visited: {}, m: null, cut: null, on: false };
  function newMatch() {
    const arena = ARENA_ORDER[st.loop % ARENA_ORDER.length], home = ARENAS[arena].home === 'grizzlies' && !Save.data.finished ? 'muskrats' : ARENAS[arena].home;
    const pool = TEAM_ORDER.filter(id => id !== home && (!TEAMS[id].locked || Save.data.finished)), away = pool[st.loop % pool.length];
    const m = Match.create({ mode: 'attract', home, away, arena, humans: [], intros: true, replays: 'auto', flood: 'never', periodLen: 600, cheats: { allTurbo: true }, rules: { clock: false }, seed: 9000 + st.loop, difficulty: 'legend' });
    m.intro = { order: m.skaters.slice(0, 2).concat(m.goalies.slice(0, 1)), i: 0, t: 0, focus: null, skip: false }; m.setPhase('intro', 99);
    st.m = m; World.prepare(m); Cam.snap(Rink.C.x, Rink.C.y); L.enabled = true; L.ambient = m.arena.ambient; game.weather = m.arena.weather || null;
    Synth.music(m.arena.music === 'play' ? 'theme' : m.arena.music);
    return m;
  }
  function begin(i) {
    st.i = i; st.t = 0; const [id] = SEG[i]; st.visited[id] = (st.visited[id] || 0) + 1; st.cut = null;
    const m = st.m;
    if (id === 'drop') { newMatch(); return; }
    if (!m) return;
    const t0 = m.teams[0], t1 = m.teams[1], dir = m.attackDir(0);
    if (id === 'hits') {
      if (m.phase !== 'play') Match.placeFaceoff(m, 'center'), m.setPhase('play');
      const a = t0.skaters[2], b = t1.skaters[0], p = Rink.panels.find(q => q.side === 'n' && q.i === 6);
      Puck.loose(m, m.puck); m.puck.x = Rink.C.x - 60; m.puck.y = Rink.C.y + 80; m.puck.vx = m.puck.vy = 0;
      b.x = p.mx; b.y = Rink.Y0 + 14; b.vx = 0; b.vy = 0; Skater.setState(b, 'skate'); a.x = p.mx - 150; a.y = Rink.Y0 + 60; a.vx = 230; a.vy = -60; a.facing = Math.atan2(-60, 230); p.state = 'cracked';
      st.forced = { att: a, vic: b, hit: false };
    }
    if (id === 'goal') {
      m.setPhase('play'); const c = t0.skaters[0], w = t0.skaters[1], d = t1.skaters[2], gx = Rink.goalX(m.attackNet(0));
      c.x = gx - dir * 190; c.y = Rink.C.y - 60; w.x = gx - dir * 120; w.y = Rink.C.y + 70; d.x = gx - dir * 110; d.y = Rink.C.y - 10;
      for (const s of [c, w, d]) { s.vx = dir * 120; s.vy = 0; Skater.setState(s, 'skate'); }
      Object.assign(m.puck, Puck.make()); Puck.setOwner(m, m.puck, c, 'attract');
      st.forced = { carrier: c, wing: w, passed: false };
    }
    if (id === 'fight') { if (m.phase !== 'play') m.setPhase('play'); const a = t0.skaters[2], b = t1.skaters[2]; a.x = Rink.C.x - 10; a.y = Rink.C.y; b.x = Rink.C.x + 10; b.y = Rink.C.y; Fight.start(m, a, b); }
    if (id === 'kaboom') {
      if (m.fight) { m.fight = null; for (const s of m.skaters) { s.fight = null; if (s.state === 'fight' || s.state === 'bin') Skater.setState(s, 'skate'); } }
      m.setPhase('play'); Boom.start(m, 0); const c = t0.skaters[0], gx = Rink.goalX(m.attackNet(0));
      c.x = gx - dir * 170; c.y = Rink.C.y + 20; c.vx = dir * 60; Object.assign(m.puck, Puck.make()); Puck.setOwner(m, m.puck, c, 'attract');
      for (const o of t1.skaters) { o.x = Rink.C.x - dir * 120; o.y = Rink.C.y + (o.slot - 1) * 80; }
      st.forced = { shooter: c, fired: false };
    }
    if (id === 'fans') { if (m.phase !== 'play') m.setPhase('play'); for (const k of ['hotsauce', 'poutine', 'boombox', 'tape']) Items.toss(m, k); const it = Items.toss(m, 'octopus'); st.forced = { octo: it }; }
    if (id === 'story') { st.cut = Cutscene.run('teaser', { attract: true, done: () => {} }); game.setView('brawler'); game.setZoom(1.05); game.cam.bounds = null; Synth.music('locker'); }
    if (id === 'flood') { game.setView('threequarter'); game.setZoom(.72); World.prepare(m); for (let k = 0; k < 200; k++) Rink.addScuff(Rink.X0 + 30 + RNG.fx() * 800, Rink.Y0 + 30 + RNG.fx() * 330, .5); Flood.begin({ auto: true }); Synth.music('flood'); }
    if (id === 'records') { Synth.music('theme'); }
  }
  function step(dt) {
    st.t += dt;
    const [id, dur] = SEG[st.i], m = st.m;
    if (id !== 'story' && id !== 'flood' && id !== 'records' && m) {
      Match.m = m;
      if (m.phase === 'intro' && m.intro) introStep(m, dt);
      Match.step(dt);
      const F = st.forced;
      if (id === 'hits' && F && !F.hit) { const a = F.att, b = F.vic; a.intent.mx = Math.sign(b.x - a.x) * .9; a.intent.my = (b.y - a.y) / 60; a.intent.held.turbo = true; a.ai.thinkT = 9; a.ai.tx = b.x; a.ai.ty = b.y; if (U.dist(a, b) < 34 && a.state === 'skate') { a.intent.press.shoot = true; F.hit = true; } b.intent.mx = 0; b.intent.my = -.2; }
      if (id === 'goal' && F) { const c = F.carrier; if (!F.passed && m.puck.owner === c && st.t > 1.2) { F.passed = true; c.passPick = F.wing.id; Shots.pass(m, c, false); F.wing.otArmed = 1; m.cheats.noGoalies = true; } if (F.passed && st.t > 3.2) m.cheats.noGoalies = false; F.wing.intent.held.shoot = F.passed && !m.puck.owner; }
      if (id === 'kaboom' && F && !F.fired && m.puck.owner === F.shooter && st.t > .8) { F.fired = true; F.shooter.ai.shootHold = .18 + T.slapCharge / 2 + .1; F.shooter.ai.shootT = F.shooter.ai.shootHold; F.shooter.intent.press.shoot = true; F.shooter.ai.thinkT = 2; }
      if (id === 'fans' && F && F.octo && !F.done && !F.octo.air && st.t > 1.5) { const s = m.teams[0].skaters[1]; s.x = F.octo.x - 60; s.y = F.octo.y; s.vx = 220; s.vy = 0; s.ai.tx = F.octo.x + 60; s.ai.ty = F.octo.y; s.ai.thinkT = 2; F.done = true; }
      if (m.phase === 'final') Match.placeFaceoff(m, 'center');
      Cam.update(m, dt); Talk.step(dt); Crowd.step(dt, m); Fx.frame(m, dt);
    } else if (id === 'story' && st.cut) { game.focus(170, 60, 18); st.cut.update(dt); if (st.cut.talk && !st.cut.talk.open && st.cut.i >= 0 && !st.cut.done) {} }
    else if (id === 'flood') { Flood.step(dt, null); const c = Flood.car; if (c) game.focus(c.x, c.y, 10); }
    if (st.t >= dur) { if (st.i + 1 >= SEG.length) { st.loop++; begin(0); } else { if (id === 'story' || id === 'flood') { game.setView('threequarter'); game.setZoom(.72); if (st.m) World.prepare(st.m); } begin(st.i + 1); } }
  }
  function drawRecords(g, r) {
    const R2 = Records.get();
    UI.panel(g, r.W / 2 - 150, 40, 300, 160, {});
    E.font.title(g, 'ICE HOC-KABOOM', r.W / 2, 50, { align: 'center', scale: 3 });
    E.font.text(g, 'TOP RECORDS', r.W / 2, 80, UI.GOLD, { align: 'center', outline: false });
    [['HARDEST SHOT', R2.shot ? U.kmh(R2.shot) + ' KM/H' : '—'], ['BIGGEST HIT', R2.hit ? R2.hit + ' POW' : '—'], ['MOST GOALS IN A GAME', R2.goals || '—'], ['CUP RUN STARS', Save.totalStars() + '/15']].forEach(([a, b], i) => { E.font.text(g, a, r.W / 2 - 130, 98 + i * 16, '#cfe0f4', { outline: false }); E.font.text(g, String(b), r.W / 2 + 130, 98 + i * 16, '#ffffff', { align: 'right', outline: false }); });
  }
  return { SEG, st, begin, step, drawRecords, state: () => ({ segment: st.i >= 0 ? SEG[st.i][0] : null, visited: Object.keys(st.visited), loop: st.loop }), newMatch };
})();

scenes.attract = {
  view: 'threequarter', views: ['threequarter', 'brawler', 'topdown'], camera: { zoom: false },
  enter() { Attract.st.visited = {}; Attract.st.on = true; Attract.begin(0); this.t = 0; game.input.consumeAll(); },
  exit() { Attract.st.on = false; game.weather = null; game.setView('threequarter'); game.setZoom(1); },
  update(dt) {
    this.t += dt;
    if (this.t > .5 && !touchOnly() && UI.anyInput()) { game.players.forEach(I => I.consumeAll()); game.go('title', { menu: false }, { fade: 'dissolve' }); return; }
    if (touchOnly()) { const ck = game.input.clicked(); if (ck && ck[1] < 40 && ck[0] > game.W - 120) game.menu('settings'); }
    Attract.step(dt);
  },
  draw(r) {
    const st = Attract.st, id = st.i >= 0 ? Attract.SEG[st.i][0] : 'drop';
    if (id === 'story' && st.cut) st.cut.draw(r);
    else if (id === 'records') { r.sky(['#060a18', '#0e1a34', '#18284a']); r.overlay(g => Attract.drawRecords(g, r)); }
    else if (id === 'flood' && st.m) { const map = World.map; map.drawFloor(r); Rink.drawScuff(r); Rink.drawBoards(r, st.m.arena.id, st.m.teams[0].def.dark, game.real); Rink.drawNets(r, game.real); Crowd.draw(r, st.m); map.queueWalls(r); Flood.draw(r); }
    else if (st.m) { World.draw(r, st.m); Hud.draw(r, st.m); Talk.draw(r); }
    r.overlay(g => {
      UI.panel(g, 6, 6, 44, 14, { border: '#ff4a4a' }); E.font.text(g, 'DEMO', 28, 9, '#ff6a6a', { align: 'center', outline: false });
      E.font.title(g, 'ICE HOC-KABOOM', r.W - 8, r.H - 40, { align: 'right', scale: 1, colors: ['#ffffff', '#ffb347', '#ff6a2a'] });
      if (Math.floor(game.real * 2) % 2 === 0) { if (touchOnly()) E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H - 22, '#ffffff', { align: 'center', outline: '#000' }); else Glyphs.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 22, { align: 'center', color: '#ffffff' }); }
    });
  }
};
