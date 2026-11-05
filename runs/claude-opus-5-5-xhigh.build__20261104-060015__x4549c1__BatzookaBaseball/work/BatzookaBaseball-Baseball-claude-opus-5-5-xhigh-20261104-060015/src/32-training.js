/* =============================================================================
 * 32-training: SPRING TRAINING with Grandpa Ike. Eight lessons, each a drill in
 * the real match engine with a goal on screen, prompts in the player's own
 * glyphs, slow motion on the first pitches of lessons 1-2, and LESSON PASSED!
 * Then the House Rules card: what you can't do. Each lesson can be replayed.
 * A lesson is data: its intro, its goal counters and a few hooks.
 * ========================================================================== */
const IKE = 'ike';
BZ.LESSONS = [
  { id: 'bp', title: 'BATTING PRACTICE', intro: ['Easy heaters, kid. Move the ring onto the ball and swing as it gets to the plate.', 'Early pulls it, late pushes it. Three fair balls and we\'ll call it a lesson.'],
    goals: [['fair', 3, 'FAIR BALLS']], side: 'bat', slow: 2,
    pitch: () => ({ type: 'heater', target: [(BZ.R() - .5) * 6, 13 + BZ.R() * 7], q: .1 }), speed: .72,
    on: { playEnd: (L, d) => { if (d.kind === 'batted' && d.reason !== 'foul') L.add('fair'); } } },
  { id: 'power', title: 'POWER AND BUNTS', intro: ['Meatballs! The power swing has a small spot and a big bang. Put one over the fence.', 'Then square around: hold to bunt it fair. Let go to pull the bat back.'],
    goals: [['hr', 1, 'POWER HOME RUN'], ['bunt', 1, 'FAIR BUNT']], side: 'bat', slow: 2, ev: 1.18,
    pitch: () => ({ type: 'heater', target: [(BZ.R() - .5) * 3, 15 + BZ.R() * 4], q: 0 }), speed: .75,
    on: { homer: L => L.add('hr'), playEnd: (L, d, M) => { if (d.kind === 'batted' && d.reason !== 'foul' && M.lastBatted && M.lastBatted.bunt) L.add('bunt'); } } },
  { id: 'zone', title: 'READING THE ZONE', intro: ['A smart hitter waits for a good one. The grid is the zone; the ball has to cross it.', 'Take two balls, then hit two strikes. Curves love to sneak off the edge.'],
    goals: [['balls', 2, 'BALLS TAKEN'], ['strikes', 2, 'STRIKES HIT']], side: 'bat',
    pitch: () => { const ball = BZ.R() < .5; return { type: BZ.R() < .4 ? 'curve' : 'heater', target: ball ? [(BZ.R() < .5 ? -1 : 1) * (10 + BZ.R() * 2), 10 + BZ.R() * 12] : [(BZ.R() - .5) * 7, 12 + BZ.R() * 9], q: .5 }; }, speed: .85,
    on: { call: (L, d) => { if (d.kind === 'ball') L.add('balls'); }, contact: (L, d, M) => { const c = M.ab && M.ab.pitch && M.ab.pitch.cross(); if (c && BZ.inZone(c.x, c.z)) L.add('strikes'); } } },
  { id: 'mound', title: 'ON THE MOUND', intro: ['Your turn on the bump. Pick a pitch with its button, aim the target, then press again as the ring closes.', 'Bend it early with the stick. Three strikes with three different pitches, one PERFECT release, one bend.'],
    goals: [['types', 3, 'STRIKES, 3 PITCH TYPES'], ['perfect', 1, 'PERFECT RELEASE'], ['after', 1, 'AFTERTOUCH']], side: 'pitch',
    on: { call: (L, d, M) => { if (d.kind === 'strike' && M.ab) { L.types = L.types || new Set(); L.types.add(M.ab.type); L.set('types', L.types.size); } }, perfectRelease: L => L.add('perfect'), aftertouch: L => L.add('after') } },
  { id: 'field', title: 'LEATHER AND LASERS', intro: ['I\'ll hit you some flies and grounders. The ring on the grass is where a fly comes down.', 'Catch two flies, throw a grounder to first in time, and turn a double play.'],
    goals: [['fly', 2, 'FLY CATCHES'], ['first', 1, 'OUT AT FIRST'], ['dp', 1, 'DOUBLE PLAY']], side: 'field', fungo: true,
    on: { catch: (L, d) => { if (d.fly) L.add('fly'); }, runnerOut: (L, d) => { if (d.how === 'force' && d.base === 1) L.add('first'); }, doublePlay: L => L.add('dp') } },
  { id: 'wheels', title: 'WHEELS', intro: ['Baserunning! I\'ll do the hitting. R1 sends everybody, L1 brings them back, L2 is turbo.', 'Advance on a hit, tag up on a fly, steal second, use turbo, and slide in safe.'],
    goals: [['adv', 1, 'ADVANCE ON A HIT'], ['tag', 1, 'TAG UP'], ['steal', 1, 'STEAL SECOND'], ['turbo', 1, 'USE TURBO'], ['slide', 1, 'SLIDE IN SAFE']], side: 'run', speed: .8,
    pitch: () => ({ type: 'heater', target: [0, 16], q: .2 }),
    on: { hit: L => L.add('adv'), tagUp: L => L.add('tag'), steal: (L, d) => { if (d.ok) L.add('steal'); }, slide: L => L.add('slide') } },
  { id: 'zooka', title: 'BATZOOKA!', intro: ['The crowd\'s roaring, so your grandma\'s bat is hot. R1 arms it; then swing.', 'Hit a Batzooka home run, then on defense throw your super pitch and a Laser Arm throw.'],
    goals: [['zhr', 1, 'BATZOOKA HOME RUN'], ['sp', 1, 'SUPER PITCH'], ['laser', 1, 'LASER ARM THROW']], side: 'both', ev: 1.1,
    pitch: () => ({ type: 'heater', target: [(BZ.R() - .5) * 4, 15 + BZ.R() * 4], q: 0 }), speed: .8,
    on: { homer: (L, d) => { if (d.batzooka) L.add('zhr'); }, super: (L, d, M) => { if (d.kind === 'pitch' && M.teams[d.side] && M.teams[d.side].humans.length) L.add('sp'); if (d.kind === 'laser') L.add('laser'); } } },
  { id: 'rhubarb', title: 'RHUBARB 101', intro: ['Sometimes the benches empty. It\'s all slapstick: nobody gets hurt.', '✕ punches, □ shoves, △ grabs and tosses, ○ dodges. Land five punches, a shove and a toss on the grounds crew.'],
    goals: [['punch', 5, 'PUNCHES'], ['shove', 1, 'SHOVE'], ['toss', 1, 'TOSS']], side: 'rhubarb' }
];
BZ.training = {
  /** start a lesson in the match scene */
  start(i) {
    const L = BZ.LESSONS[i], g = BZ.game, I = g.input;
    const humans = L.side === 'pitch' || L.side === 'field' ? { 0: [], 1: [I] } : { 0: [I], 1: [] };
    const data = { mode: 'training', away: L.side === 'pitch' || L.side === 'field' ? 'crew' : 'comets', home: L.side === 'pitch' || L.side === 'field' ? 'comets' : 'crew', park: 'kernel', innings: 99, difficulty: 'rookie', cpuLevel: 'rookie', humans, seed: 11 + i, mercy: false, lesson: i,
      onInstall: M => this.install(M, i), onStep: (M, dt) => this.step(M, dt), onFinal: () => BZ.game.go('lessonList') };
    if (L.side === 'run') data.bots = { 0: { level: 'allstar', perfect: false } };
    BZ.startMatch(data);
  },
  install(M, i) {
    const L = BZ.LESSONS[i], st = { i, def: L, prog: {}, passed: false, t: 0, pitches: 0, intro: true };
    st.add = k => { st.prog[k] = (st.prog[k] || 0) + 1; this.check(M); };
    st.set = (k, v) => { st.prog[k] = v; this.check(M); };
    M.lesson = st;
    if (L.ev) M.evMul = L.ev;
    if (L.speed) M.lessonSpeed = L.speed;
    M.cheats.noRhubarb = true;
    for (const [ev, fn] of Object.entries(L.on || {})) M.unsub.push(BZ.bus.on(ev, d => { if (M.lesson && !M.lesson.passed) fn(M.lesson, d, M); }));
    // Grandpa Ike pitches batting practice (a pitcher of the Comets' for the drill)
    if (L.side === 'bat' || L.side === 'run' || L.side === 'both') { const ike = BZ.get('players', 'comets-grandpa-ike-kowalski'); M.teams[1].pitcher = ike; BZ.match.setupDefense(M); }
    if (L.id === 'zooka') { M.teams[0].meter = 100; }
    if (L.id === 'rhubarb') {
      const crew = BZ.get('teams', 'crew').lineup.slice(0, 5);
      M.phase = 'training';
      BZ.wait(.1, () => BZ.rhubarb.start(M, 'training', { crew, human: BZ.game.input, dur: 999 }));
    }
    M.unsub.push(BZ.bus.on('rhubarbEnd', () => {}));
    const intro = L.intro.map(t => ['say', IKE, t]);
    BZ.talk.cut(intro.concat([['call', () => { st.intro = false; }]]), null);
    BZ.music('training');
  },
  check(M) {
    const st = M.lesson; if (st.passed) return;
    if (st.def.goals.every(([k, n]) => (st.prog[k] || 0) >= n)) {
      st.passed = true; st.passT = 0;
      BZ.hud.stamp('LESSON PASSED!', { prio: 3, scale: 4, dur: 3, colors: ['#ffffff', '#8affb0', '#1a8a4a'] });
      BZ.sting('victory');
      BZ.bus.emit('lesson', { id: st.def.id, passed: true });
      if (BZ.tour) BZ.tour.lessonDone(st.def.id);
    }
  },
  step(M, dt) {
    const st = M.lesson; if (!st) return;
    st.t += dt;
    const L = st.def;
    if (st.passed) { st.passT += dt; if (st.passT > 3 || (st.passT > 1 && BZ.match.anyAdvance(M))) { if (M.rhubarb) M.rhubarb = null; BZ.game.go('lessonList', { done: st.def.id }); } return; }
    // practice never ends: outs and runners are reset between plays
    if (M.phase === 'playOver' || M.phase === 'halfEnd') { M.outs = Math.min(M.outs, 2); if (M.phase === 'halfEnd') { M.phase = 'playOver'; M.outs = 0; } }
    if (M.outs >= 3) M.outs = 0;
    if (M.phase === 'atBat' && M.ab && M.ab.sub === 'walkup') { M.outs = 0; if (L.side === 'bat' || L.side === 'pitch') M.bases = [null, null, null]; }
    // slow motion on the first pitches of lessons 1-2
    if (L.slow && !BZ.cams.moon) BZ.game.timeScale = st.pitches < L.slow && M.phase === 'atBat' ? .6 : TUNE.gameSpeed;
    if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && M.ab.t < dt * 1.5) st.pitches++;
    if (L.pitch && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && !M.forcePitch) M.forcePitch = L.pitch();
    if (L.id === 'zooka') {
      // bat first: the meter is always full; once the homer is in, the Comets take the field
      if (!st.prog.zhr) { M.teams[0].meter = 100; }
      else if (!st.swapped && (M.phase === 'atBat' || M.phase === 'playOver')) { st.swapped = true; const I = BZ.game.input; M.teams[0].humans = []; M.teams[1].humans = [{ input: I, role: 'captain' }]; M.teams[1].id = 'comets'; M.half = 'top'; M.outs = 0; M.bases = [null, null, null]; const away = M.teams[0]; M.teams[0] = M.teams[1]; M.teams[1] = away; M.teams[0].side = 0; M.teams[1].side = 1; BZ.match.setupDefense(M); BZ.match.newAtBat(M); BZ.hud.toast('NOW ON DEFENSE: THROW YOUR SUPER PITCH'); }
      if (st.swapped) { const D = BZ.defense(M); D.meter = Math.max(D.meter, 100); M.forcePitch = null; if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select') M.forceContact = 'perfect'; M.cheats.perfectCPU = true; }
    }
    if (L.id === 'wheels') this.wheels(M, st);
    if (L.fungo && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && M.ab.t > .6) this.fungo(M, st);
    if (L.id === 'rhubarb' && M.rhubarb) { const R = M.rhubarb; st.prog.punch = R.punches; st.prog.shove = R.shoves; st.prog.toss = R.tosses; this.check(M); if (st.passed) { R.dur = R.t + .1; } }
    if (L.id === 'rhubarb' && !M.rhubarb && !st.passed && st.t > 1) BZ.rhubarb.start(M, 'training', { crew: BZ.get('teams', 'crew').lineup.slice(0, 5), human: BZ.game.input, dur: 999 });
    // turbo use counts for Wheels
    if (L.id === 'wheels' && M.phase === 'inPlay' && M.runners.some(r => r.turbo && r.turboHeld)) st.add('turbo');
  },
  /** Ike's fungo bat: a fly, a grounder, or a double-play ball with a runner on first */
  fungo(M, st) {
    const P = M.park, H = P.H, k = st.fungoN = (st.fungoN || 0) + 1;
    const needDP = (st.prog.fly || 0) >= 2 && (st.prog.first || 0) >= 1, fly = !needDP && (st.prog.fly || 0) < 2 && k % 2 === 1;
    if (needDP) M.bases = [BZ.get('teams', 'crew').lineup[2], null, null]; else M.bases = [null, null, null];
    const th = fly ? (BZ.R() - .5) * 50 : needDP ? -18 + BZ.R() * 8 : (BZ.R() - .5) * 40, ph = fly ? 38 : -8, ev = fly ? 560 : 330;
    const t = th * Math.PI / 180, p = ph * Math.PI / 180;
    BZ.sfx('crack');
    BZ.match.contact(M, { v: [ev * Math.cos(p) * Math.sin(t), -ev * Math.cos(p) * Math.cos(t), ev * Math.sin(p)], Q: .5, EV: ev, theta: th, phi: ph, spin: 0, grade: 'OK' }, { x: 0, z: 18 });
    void H;
  },
  wheels(M, st) {
    // set up the situation for the next skill: a runner on first to steal, on third to tag, or a hit to advance on
    if (M.phase !== 'atBat' || !M.ab || M.ab.sub !== 'walkup') return;
    const R = BZ.get('teams', 'comets').lineup[1], p = st.prog;
    if (!p.steal) { M.bases = [R, null, null]; M.scriptHit = null; BZ.bot.sides[0] && (BZ.bot.sides[0].take = true); BZ.hud.toast('STEAL SECOND: HOLD L1 AND PRESS △ (OR Q + 2)'); }
    else if (!p.tag) { M.bases = [null, null, R]; BZ.bot.sides[0].take = false; M.scriptHit = res => { const th = 0, ph = 36, ev = 640, t = th, pp = ph * Math.PI / 180; res.v = [0, -ev * Math.cos(pp), ev * Math.sin(pp)]; res.kind = 'contact'; void t; return res; }; BZ.hud.toast('TAG UP: WAIT FOR THE CATCH, THEN R1'); }
    else { M.bases = [R, null, null]; BZ.bot.sides[0].take = false; M.scriptHit = res => { const ph = 8 * Math.PI / 180, th = 22 * Math.PI / 180, ev = 600; res.v = [ev * Math.cos(ph) * Math.sin(th), -ev * Math.cos(ph) * Math.cos(th), ev * Math.sin(ph)]; res.kind = 'contact'; return res; }; BZ.hud.toast('A HIT: R1 TO RUN, L2 FOR TURBO, ✕ TO DIVE IN'); }
  },
  hud(g, r, M) {
    const st = M.lesson; if (!st || BZ.talk.cutscene) return;
    const L = st.def, w = 150, x = r.W - w - 12, y = 58;
    E.ui.box(g, x, y, w, 16 + L.goals.length * 12, { bg: ['#1a3a1a', '#0a1a0a'], border: '#8aff8a', alpha: .9 });
    E.font.text(g, 'LESSON ' + (st.i + 1) + ': ' + L.title, x + 5, y + 4, '#ffd040');
    L.goals.forEach(([k, n, label], i) => { const v = Math.min(n, st.prog[k] || 0), done = v >= n; E.font.text(g, (done ? '✓ ' : '') + v + ' / ' + n + ' ' + label, x + 5, y + 16 + i * 12, done ? '#8aff8a' : '#ffffff'); });
  }
};
BZ.scenes.lessonList = {
  enter(data) {
    this.t = 0; BZ.idle = 0;
    const done = BZ.tour.trainingDone();
    this.menu = new BZ.CardMenu(BZ.LESSONS.map((L, i) => ({ label: (i + 1) + '. ' + L.title, sub: done.includes(L.id) ? 'PASSED ✓' : 'NEW', id: i })).concat([{ label: 'HOUSE RULES', sub: 'WHAT YOU CAN\'T DO', id: 'rules' }]), { cols: 3, start: data && data.done ? Math.min(8, BZ.LESSONS.findIndex(L => L.id === data.done) + 1) : 0 });
    BZ.music('training'); this.rules = false;
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    if (this.rules) { if ((g.input.pressed('cancel') || g.input.pressed('east') || g.input.pressed('south') || g.input.pressed('confirm')) && this.t > .3) { this.rules = false; g.input.consumeAll(); } return; }
    const res = this.menu.update(dt);
    if (res && res.pick !== undefined) { const id = this.menu.items[res.pick].id; if (id === 'rules') { this.rules = true; this.t = 0; } else BZ.training.start(id); }
    if (res && res.cancel) g.go(BZ.tour.returnTo || 'title');
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a1a10', '#1a3a20', '#3a3a1a']);
    r.overlay(g => {
      E.font.title(g, 'SPRING TRAINING', r.W / 2, 8, { scale: 3, align: 'center', colors: ['#ffffff', '#b0ffb0', '#3a9a3a'], depth: 2 });
      const ike = BZ.castRig('ike'); if (ike && BZ.cosmetic) ike.drawPortrait(g, 12, 6, 36, { zoom: 2.6 });
      if (this.rules) {
        const w = Math.min(r.W - 30, 320), x = Math.round(r.W / 2 - w / 2);
        E.ui.box(g, x, 46, w, 30 + BZ.HOUSE_RULES.length * 13, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' });
        E.font.text(g, 'HOUSE RULES: WHAT YOU CAN\'T DO', r.W / 2, 52, '#ffd040', { align: 'center' });
        BZ.HOUSE_RULES.forEach((t, i) => E.font.text(g, '• ' + t, x + 12, 68 + i * 13, '#ffffff'));
        BZ.legend(g, r, [['south', 'GOT IT']]);
        return;
      }
      this.menu.draw(g, r, r.W / 2, 50, { w: Math.min(140, (r.W - 30) / 3), h: 40, scale: 1, gap: 6 });
      BZ.legend(g, r, [['south', 'START'], ['east', 'BACK']]);
    });
  }
};
