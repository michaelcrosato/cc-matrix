/* ---- Drills: Coach Marge's seven practice drills at the Ol' Icebox, built from match primitives (PLAN 11.4) ---- */
const Drills = (() => {
  const C = Rink.C;
  const LIST = [
    { n: 1, title: 'Wheels', text: 'Skate through the 6 gates in order. Gate 4 wants a hockey stop.', marge: "Wheels first. Hold {turbo} to turbo, push the stick hard the other way to stop.", time: 25 },
    { n: 2, title: 'Tape to Tape', text: '5 completed passes to moving teammates, plus 1 saucer over the sled.', marge: "{pass} passes, {lob} flips a saucer. Tape to tape, kid.", time: 60 },
    { n: 3, title: 'Top Shelf', text: 'Hit the 4 corner targets on the empty net.', marge: "Tap {shoot}: a wrister, low. Hold it: a clapper, top shelf. Stick up or down picks the side.", time: 90 },
    { n: 4, title: 'One-Timers', text: "3 one-timer goals on Lemmy from Dunny's feeds.", marge: "When Dunny feeds you, hit {shoot} before it lands. Bang.", time: 60 },
    { n: 5, title: 'Finish Your Check', text: 'Big-hit 3 dummies and break a pane of glass.', marge: "No puck? {shoot} checks. Hold {turbo} into it. Put 'em through the glass.", time: 60 },
    { n: 6, title: 'Gloves Off', text: 'Win a spar with Big Lou. He goes easy.', marge: "{pass} jab, {shoot} haymaker, {deke} duck, {lob} yank. Lou won't hurt you. Much.", time: 60 },
    { n: 7, title: 'KABOOM!', text: 'Score a KABOOM goal, then survive Lou\'s KABOOM check.', marge: "Meter's full. Hold {shoot} all the way for a KABOOM shot. Then watch Lou: when he winds up, get out of his line.", time: 60 }
  ];
  let D = null;   // { n, t, count, need, state, gates, ... }
  const human = () => M.humans[0] && M.humans[0].s;
  function cfg(n, extra = {}) {
    return Object.assign({ home: 'muskrats', away: n === 6 || n === 7 ? 'drillers' : 'drillers', arena: 'icebox', periods: 1, len: 999, practice: true, noClock: true, noItems: true, noTalk: true, noFights: n !== 6, replays: false, intros: false,
      humans: [{ input: game.input, team: 0, slot: n === 4 ? 1 : n === 6 ? 0 : 0 }], seed: 50 + n, drill: n, onOver: () => {}, init: () => init(n), script: dt => script(dt) }, extra);
  }
  function start(n, after) { D = { n, t: 0, count: 0, need: [6, 6, 4, 3, 4, 1, 2][n - 1], done: false, after: after || null, msgT: 0 }; game.go('match', cfg(n), { fade: 'wipe' }); }
  function place(s, x, y, f) { Object.assign(s, { x, y, vx: 0, vy: 0, facing: f || 0, state: 'skate', off: false }); }
  function init(n) {
    const s = human(), g1 = Skater.attackGoal(0), dir = -Rink.outDir(g1.side);
    for (const o of M.skaters) if (o !== s) { o.off = true; o.x = -999; }
    M.goalies[1].disabled = n === 3 || n === 1 || n === 2 || n === 5; M.goalies[0].disabled = true;
    for (const g of M.goalies) if (g.disabled) { g.x = -999; }
    M.puck.held = false; M.puck.dead = false;
    if (n === 1) { place(s, C.x - 300, C.y, 0); D.gates = [[C.x - 150, C.y - 80], [C.x, C.y - 120], [C.x + 180, C.y - 60], [C.x + 260, C.y + 60, 'stop'], [C.x + 60, C.y + 120], [C.x - 160, C.y + 60]]; D.gate = 0; M.puck.dead = true; M.puck.x = -999; }
    if (n === 2) { place(s, C.x - 200, C.y, 0); Puck.take(s, M.puck); const mates = M.skaters.filter(o => o.team === 0 && o !== s); mates.forEach((m, k) => { place(m, C.x + 40 + k * 60, C.y - 90 + k * 180, 0); m.drillPath = k; }); D.sled = [C.x - 80, C.y]; D.saucer = false; }
    if (n === 3) { place(s, g1.x + dir * 120, C.y, dir > 0 ? PI : 0); s.facing = Math.atan2(0, g1.x - s.x); Puck.take(s, M.puck); D.targets = [[-1, 4], [1, 4], [-1, 16], [1, 16]].map(([sy, z]) => ({ y: C.y + sy * 11, z, hit: false })); }
    if (n === 4) { const g = M.goalies[1]; g.disabled = false; const dunny = M.skaters[0]; place(dunny, g1.x + dir * 30, C.y - 70, 0); place(s, g1.x + dir * 60, C.y + 40, 0); s.facing = Math.atan2(C.y - s.y, g1.x - s.x); Puck.take(dunny, M.puck); D.feedT = 1.5; }
    if (n === 5) { place(s, C.x, C.y, 0); D.dummies = M.skaters.filter(o => o.team === 1); D.dummies.forEach((d, k) => { place(d, C.x - 160 + k * 160, Rink.Y0 + 22, PI / 2); d.dummy = true; }); M.puck.dead = true; M.puck.x = -999; D.glass = false; }
    if (n === 6) { const lou = M.skaters.find(o => o.team === 1 && o.slot === 2); lou.def = Object.assign({}, TEAMS.muskrats.skaters[2], { fgt: 2 }); lou.rig = Rigs.skater(lou.def, 'drillers', false); lou.name = 'Big Lou'; place(lou, C.x + 20, C.y, PI); place(s, C.x - 10, C.y, 0); lou.ai.skill = .3; M.puck.dead = true; M.puck.x = -999; Fight.begin(s, lou); }
    if (n === 7) { place(s, g1.x + dir * 150, C.y, 0); s.facing = Math.atan2(0, g1.x - s.x); Puck.take(s, M.puck); Boom.start(0); M.goalies[1].disabled = false; D.stage = 0; }
    Talk.close(); M.cfg.noTalk = true;
    const lst = LIST[n - 1]; Talk.sayAs('marge', lst.marge.replace(/\{(\w+)\}/g, (m, a) => (game.input.label(a) || a).toUpperCase()));
  }
  function success() {
    if (D.done) return; D.done = true; D.doneT = 0; Save.data.drills[D.n] = true; Save.write(); A.sfx('star'); Fx.setBanner('DRILL COMPLETE!', null, 2.4, LIST[D.n - 1].title.toUpperCase());
    Bus.emit('drill_done', { n: D.n });
  }
  function script(dt) {
    if (!D || !M) return;
    D.t += dt; const s = human(); if (!s) return;
    if (D.done) { D.doneT += dt; if (D.doneT > 2.6) { const after = D.after; D = Object.assign({}, D, { finished: true }); if (after) after(); else game.go('practice', null, { fade: 'wipe' }); } return; }
    if (D.t > LIST[D.n - 1].time) { Fx.setBanner('TIME!', null, 1.4, 'Try again'); D.t = 0; D.count = 0; init(D.n); return; }
    const g1 = Skater.attackGoal(0), dir = -Rink.outDir(g1.side);
    if (D.n === 1) {
      const gt = D.gates[D.gate]; if (!gt) return success();
      const d = Math.hypot(s.x - gt[0], s.y - gt[1]);
      if (d < 26 && (gt[2] !== 'stop' || s.state === 'stop')) { D.gate++; D.count = D.gate; A.sfx('pick'); }
    }
    if (D.n === 2) {
      for (const m of M.skaters.filter(o => o.team === 0 && o !== s)) { const k = m.drillPath, a = D.t * .45 + k * PI, p = M.puck; m.scripted = !p.owner && (p.passTo === m || (p.lastTouch === s && Math.hypot(p.x - m.x, p.y - m.y) < 90)) ? [p.x + p.vx * .2, p.y + p.vy * .2] : [C.x + 100 + Math.cos(a) * 95, C.y + Math.sin(a) * 90]; if (M.puck.owner === m) { Skater.pass(m, { to: s }); } }
      if (!M.puck.owner && !M.puck.passTo && Math.hypot(M.puck.vx, M.puck.vy) < 5 && Math.hypot(M.puck.x - s.x, M.puck.y - s.y) > 40) { Puck.take(s, M.puck); }
    }
    if (D.n === 3) {
      if (!M.puck.owner && (M.puck.inNet || Math.hypot(M.puck.vx, M.puck.vy) < 10 || M.puck.dead)) { D.resetT = (D.resetT || 0) + dt; if (D.resetT > .8) { D.resetT = 0; M.puck.inNet = false; M.puck.dead = false; place(s, g1.x + dir * 120, C.y + (RNG.sim() - .5) * 60, 0); s.facing = Math.atan2(C.y - s.y, g1.x - s.x); Puck.take(s, M.puck); } }
      D.count = D.targets.filter(t => t.hit).length; if (D.count >= 4) success();
    }
    if (D.n === 4) {
      const dunny = M.skaters[0]; dunny.scripted = [g1.x + dir * 20, C.y - 70];
      if (M.puck.owner === dunny) { D.feedT -= dt; if (D.feedT <= 0) { Skater.pass(dunny, { to: s }); D.feedT = 1.6; } }
      if (!M.puck.owner && !M.puck.inNet && (M.puck.passTo !== s || Math.hypot(M.puck.vx, M.puck.vy) < 8)) { D.resetT = (D.resetT || 0) + dt; if (D.resetT > 1.2) { D.resetT = 0; M.puck.held = false; M.puck.dead = false; Puck.take(dunny, M.puck); } }
      if (M.puck.owner === s && s.ctrl !== 'cpu') { D.ownT = (D.ownT || 0) + dt; if (D.ownT > 2.5) { D.ownT = 0; Puck.take(dunny, M.puck); } } else D.ownT = 0;
      if (D.count >= 3) success();
    }
    if (D.n === 5) { for (const d of D.dummies) { d.vx *= .9; d.vy *= .9; if (d.ai) d.ai.target = [d.x, d.y]; } if (D.count >= 3 && D.glass) success(); }
    if (D.n === 6) { /* the fight resolves it */ }
    if (D.n === 7) {
      if (D.stage === 1) {
        // Lou's KABOOM charge: he winds up facing you (a readable tell), then charges in a straight line; step out of it
        D.survive -= dt; const lou = D.lou; D.louT -= dt; lou.holdTurbo = true;
        if (D.louMode === 'aim') { lou.scripted = [lou.x, lou.y]; lou.vx *= .8; lou.vy *= .8; lou.facing = Math.atan2(s.y - lou.y, s.x - lou.x); D.louDir = lou.facing; if (D.louT <= 0) { D.louMode = 'charge'; D.louT = .8; Skater.check(lou); lou.stateT = -.5; A.sfx('zip'); } }
        else { const a = D.louDir; lou.vx = Math.cos(a) * 270; lou.vy = Math.sin(a) * 270; lou.facing = a; lou.scripted = [lou.x + Math.cos(a) * 200, lou.y + Math.sin(a) * 200]; lou.hitDone = lou.hitDone || {}; if (D.louT <= 0) { D.louMode = 'aim'; D.louT = .6; lou.state = 'skate'; lou.hitDone = {}; } }
        if (s.state === 'down') { Fx.setBanner('FLATTENED!', null, 1.2, 'Again'); D.stage = 0; D.count = 0; D.t = 0; init(7); } else if (D.survive <= 0) { D.count = 2; success(); }
      }
    }
  }
  // what the drills count
  Bus.on('pass_complete', e => { if (D && M && M.cfg.practice && D.n === 2 && M.byId[e.by] && M.byId[e.by].human) { D.count++; A.sfx('pick'); if (D.count >= 5 && D.saucer) success(); } });
  Bus.on('pass', e => { if (D && M && M.cfg.practice && D.n === 2 && e.kind === 'saucer' && M.byId[e.from] && M.byId[e.from].human) { D.saucerPending = true; } });
  Bus.on('possession', e => { if (D && M && M.cfg.practice && D.n === 2 && D.saucerPending) { D.saucerPending = false; const s = M.byId[e.by]; if (s && s.team === 0 && !s.human) { D.saucer = true; UI.toast('SAUCER!', 'Over the sled'); if (D.count >= 5) success(); } } });
  Bus.on('goal', e => {
    if (!D || !M || !M.cfg.practice) return;
    const p = M.puck;
    if (D.n === 3) for (const t of D.targets) if (!t.hit && Math.abs(p.y - t.y) < 6 && Math.abs(p.z - t.z) < 6) { t.hit = true; A.sfx('ping'); }
    if (D.n === 4 && e.kind === 'onetimer') D.count++;
    if (D.n === 7 && e.kind === 'kaboom' && D.stage === 0) { D.stage = 1; D.count = 1; D.survive = 6; const lou = M.skaters.find(o => o.team === 1); lou.def = Object.assign({}, TEAMS.muskrats.skaters[2]); lou.rig = Rigs.skater(lou.def, 'drillers', false); lou.name = 'Big Lou'; place(lou, C.x, C.y, 0); Boom.start(1); M.kaboomT[1] = 30; Fx.setBanner("LOU'S COMING!", null, 1.4, 'Dodge his charges for 6 seconds'); D.lou = lou; D.louMode = 'aim'; D.louT = .9; }
  });
  Bus.on('hit', e => { if (D && M && M.cfg.practice && D.n === 5 && e.big) { D.count++; } });
  Bus.on('glass', e => { if (D && M && M.cfg.practice && D.n === 5) { D.glass = true; if (D.count >= 3) success(); } });
  Bus.on('fight_end', e => { if (D && M && M.cfg.practice && D.n === 6) { if (e.winner && M.byId[e.winner].human) { D.count = 1; success(); } else { Fx.setBanner('AGAIN!', null, 1.2); D.t = 0; } } });
  /** the drill's HUD: its title, the counter and the clock */
  function hud(r) {
    if (!D || !M || !M.cfg.practice) return;
    r.overlay(g => {
      const sf = Hud.safe(r), L2 = LIST[D.n - 1], w = 240;
      UI.panel(g, r.W / 2 - w / 2, sf.y0 + 34, w, 30, { border: '#c86ab0' });
      UI.text(g, 'DRILL ' + D.n + ': ' + L2.title.toUpperCase(), r.W / 2, sf.y0 + 38, UI.GOLD, { align: 'center' });
      const cnt = D.n === 1 ? 'GATE ' + Math.min(6, D.gate + 1) + ' / 6' : D.n === 2 ? 'PASSES ' + D.count + ' / 5   SAUCER ' + (D.saucer ? 'OK' : '-') : D.n === 5 ? 'BIG HITS ' + D.count + ' / 3   GLASS ' + (D.glass ? 'OK' : '-') : D.n === 7 ? (D.stage ? 'SURVIVE ' + Math.ceil(D.survive) : 'KABOOM GOAL ' + D.count + ' / 1') : D.count + ' / ' + D.need;
      UI.text(g, cnt + '    TIME ' + Math.max(0, Math.ceil(L2.time - D.t)), r.W / 2, sf.y0 + 50, '#ffffff', { align: 'center' });
    });
  }
  function world(r) {
    if (!D || !M || !M.cfg.practice) return;
    if (D.n === 1) D.gates.forEach((gt, i) => { if (i < D.gate) return; for (const sd of [-1, 1]) { const x = gt[0], y = gt[1] + sd * 18; r.queue(x, y, 0, g => { const [X, Y] = r.w(x, y, 0); px.poly(g, [[X, Y - 9], [X - 3, Y], [X + 3, Y]], i === D.gate ? '#ff7a1a' : '#a05010'); px.rect(g, X - 2, Y - 5, 4, 1, '#ffffff'); }); } if (gt[2]) r.decal(g => { const [X, Y] = r.w(gt[0], gt[1], 0); E.font.text(g, 'STOP', X, Y - 3, '#ff3a3a', { font: 'tiny', align: 'center', outline: false }); }); });
    if (D.n === 2 && D.sled) r.queue(D.sled[0], D.sled[1], 0, g => { const [X, Y] = r.w(D.sled[0], D.sled[1], 0); px.rect(g, X - 10, Y - 5, 20, 5, '#8a3a2a'); px.rect(g, X - 11, Y, 22, 1, '#c8c8d0'); });
    if (D.n === 7 && D.stage === 1 && D.lou && D.louMode === 'aim') { const l = D.lou; r.queue(l.x, l.y, 60, g => { const [x, y] = r.w(l.x, l.y, 58); if (Math.floor(game.time * 12) % 2) E.font.text(g, '!', x, y - 8, '#ff4a2a', { scale: 2, align: 'center', outline: '#000' }); }, { emissive: true }); }
    if (D.n === 3 && D.targets) { const g1 = Skater.attackGoal(0); for (const t of D.targets) if (!t.hit) r.queue(g1.x, t.y, t.z, g => { const [X, Y] = r.w(g1.x, t.y, t.z); px.disc(g, X, Y, 3.5, '#ff3a3a'); px.disc(g, X, Y, 2, '#ffffff'); px.dot(g, X, Y, '#ff3a3a'); }, { emissive: true }); }
  }
  function cfgFor(n) { D = { n, t: 0, count: 0, need: [6, 6, 4, 3, 4, 1, 2][n - 1], done: false, after: null, msgT: 0 }; return cfg(n); }
  return { LIST, start, cfgFor, warmup(n) { let k = 1; const nextDrill = () => { if (k > 3) return game.go('pregame', { n }); start(k++, nextDrill); }; nextDrill(); }, hud, world, get D() { return D; }, set D(v) { D = v; } };
})();

/* ---- the practice menu: the seven drills, each with its star ---- */
scenes.practice = (() => {
  let menu = null;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter() {
      menu = new UI.Tiles(Drills.LIST.map(d => ({ label: d.n + '. ' + d.title.toUpperCase(), sub: Save.data.drills[d.n] ? '★ DONE' : d.title === 'KABOOM!' ? 'The big one' : '', pick: () => Drills.start(d.n) })),
        { layout: (r, its) => UI.grid(its.length, 4, r.W / 2, 54, Math.min(100, Math.floor((r.W - 40) / 4)), 34, 6, 6), cancel: () => game.go('title', { menu: true }) });
      Synth.music('menu'); UI.Idle.reset();
    },
    update(dt) { Glyphs.sync(); menu.update(dt); if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' }); },
    draw(r) {
      r.sky(['#0a1020', '#121c34', '#1a2a48']);
      r.overlay(g => {
        const sf = Hud.safe(r); UI.title(g, "COACH MARGE'S DRILLS", r.W / 2, sf.y0, 2);
        menu.draw(g, r);
        const d = Drills.LIST[menu.i]; UI.panel(g, r.W / 2 - 160, r.H - 74, 320, 36, { border: '#c86ab0' });
        Rigs.cast('marge').rig.drawPortrait(g, r.W / 2 - 156, r.H - 71, 30, { zoom: 2.4, bg: '#20142a' });
        UI.text(g, d.text, r.W / 2 - 120, r.H - 68, '#ffffff', { wrap: 270 });
        UI.text(g, 'DRILLS DONE ' + Object.keys(Save.data.drills).length + ' / 7' + (Object.keys(Save.data.drills).length >= 7 ? '   MARGE APPROVED!' : ''), r.W / 2, sf.y0 + 26, UI.GOLD, { align: 'center' });
        UI.legend(g, r, [['confirm', 'START'], ['cancel', 'BACK']]);
      });
    }
  };
})();
