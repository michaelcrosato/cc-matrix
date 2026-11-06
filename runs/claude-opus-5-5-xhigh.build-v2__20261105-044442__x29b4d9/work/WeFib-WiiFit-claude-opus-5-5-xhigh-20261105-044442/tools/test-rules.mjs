// The plan's rules of play, event by event: do this, and what it promises happens.
// Numbers can all be right with a rule missing, so these push the real inputs and read the result.
export default async function ({ ok, logicPage, browser }) {
  const page = await logicPage(browser);
  const rows = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, STEP = 1 / 120, out = [];
    const say = (label, pass, detail = '') => out.push([label, !!pass, String(detail)]);
    g.save.reset(); g.programme.createProfile(0, 'Rules', 'teal'); g.save.profile.tutorialDone = true;
    g.save.settings.autoBreathe = false;
    const into = (id, tier = 0) => {
      T.resetTuning(); T.bot(null); T.stick(0, 0); T.setSeed(1);
      T.startEvent(id, tier, {});
      const ev = g.currentEvent;
      for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
      g.speech.clear();
      return { ev, l: ev.lanes[0], b: ev.lanes[0].bal };
    };
    const flail = () => { T.press(2); T.advance(STEP * 2); T.press(2, false); };
    const push = (x) => T.stick(x === 0 ? 0 : Math.sign(x) * (0.08 + Math.abs(x) * 0.92), 0);

    // Section 4: falling and getting back up, and breath.
    let s = into('poses');
    const floors = g.save.profile.floorExercises;
    s.ev.forceFall(0);
    say('a fall makes a ragdoll', s.l.fallen && s.l.ragdoll);
    say('a fall counts as a Floor Exercise', g.save.profile.floorExercises === floors + 1, g.save.profile.floorExercises);
    T.advance(2);
    say('still down before the recover time', s.l.fallen);
    T.advance(0.4);
    say('up again after the recover time', !s.l.fallen && !s.l.ragdoll);
    T.advance(1);
    say('recovering does not fall again at once', !s.l.fallen && s.l.falls === 1 && s.b.lean < 0.3, s.b.lean.toFixed(2));
    s = into('poses');
    s.l.breathAuto = true; T.advance(9);
    say('in sync, sway and tremor drop to .6', s.l.breath.inSync && Math.abs(s.b.breathScale - 0.6) < 1e-6, s.b.breathScale);

    // Tug of Peace.
    const tugHit = (stick, at) => {
      const q = into('tug', 1);
      q.ev.easeT = 99; T.stick(0, 0.08 + stick * 0.92); T.advance(3);
      q.ev.ease = 0.8; q.l.sat = 0.5;
      let done = false, fell = false;
      for (let t = 0; t < 2.5; t += STEP) { T.advance(STEP); if (q.l.fallen) fell = true; if (at && !done && q.b.lean * 57.3 >= at) { q.b.flail(); done = true; } }
      T.stick(0, 0);
      return fell;
    };
    say('Tug: the ease-off hit sits you down', tugHit(0.9, 0));
    say('Tug: unless you flail in time', !tugHit(0.8, 19) && !tugHit(0.9, 19) && !tugHit(1, 19));
    say('Tug: a flail too late does not help', tugHit(0.9, 26));
    s = into('tug', 1);
    s.ev.easeT = 99; T.stick(0, 0.08 + 0.85 * 0.92); T.advance(3);
    s.ev.easeT = 0.001; T.advance(STEP * 3);
    say('Tug: leaning .85 is safe when they ease off', s.l.sat === 0, s.l.shareNow.toFixed(2));
    s.ev.easeT = 99; s.ev.ease = 2; T.stick(0, 1); T.advance(1.8); s.ev.easeT = 0.001; s.ev.ease = 0; T.advance(STEP * 3);
    say('Tug: leaning too far when they ease off is hit', s.l.sat > 0, s.l.shareNow.toFixed(2));
    T.stick(0, 0);
    s = into('tug', 0);
    s.ev.rope = 0; s.ev.forceFall(0);
    say('Tug: sitting down, the rope leaps .3 against you', Math.abs(s.ev.rope + 0.3) < 0.01, s.ev.rope.toFixed(2));
    s = into('tug', 0);
    T.stick(0, 0); s.ev.rope = 0; T.advance(6);
    say('Tug: not heaving loses rope', s.ev.rope < -0.1, s.ev.rope.toFixed(2));

    // Still Water.
    s = into('stillWater');
    s.ev.sneezes = [{ at: s.ev.t + 0.05, state: 'wait' }];
    T.advance(0.1);
    say('Still Water: a sneeze warns first', s.ev.sneezes[0].state === 'warn' && s.ev.warned);
    flail(); T.advance(1.4);
    say('Still Water: Flail stifles it', s.ev.sneezes[0].stifled && !(s.ev.push > 0));
    s = into('stillWater');
    s.ev.sneezes = [{ at: s.ev.t + 0.05, state: 'wait' }];
    T.advance(0.1);
    let shove = false;
    for (let t = 0; t < 1.4; t += STEP) { T.advance(STEP); if (s.ev.push > 0) shove = true; }
    say('Still Water: otherwise it is a shove', shove);
    s = into('stillWater');
    s.ev.sneezes = [];
    s.ev.calm = 0.5; push(1); T.advance(1.5);
    let a = s.ev.calm; T.advance(1);
    say('Still Water: calm falls 1/8 a second outside the zone', Math.abs(a - s.ev.calm - 0.125) < 0.02, (a - s.ev.calm).toFixed(3));
    T.advance(4);
    say('Still Water: you cannot fall in', !s.l.fallen);
    T.stick(0, 0);
    s = into('stillWater');
    s.ev.sneezes = []; T.tun.swayScale = 0; T.tun.tremorScale = 0;
    s.ev.calm = 0.5; T.advance(1); a = s.ev.calm; T.advance(1);
    say('Still Water: calm rises 1/30 a second in the zone', Math.abs(s.ev.calm - a - 1 / 30) < 0.005, (s.ev.calm - a).toFixed(3));
    s.ev.calm = 0.85; T.advance(0.2);
    say('Still Water: creatures arrive with calm', s.ev.arrived >= 4, s.ev.arrived);
    T.resetTuning();

    // Plank & Perch.
    s = into('plank');
    s.ev.next = 99; s.ev.addGull(); T.advance(1.5);
    say('Plank: a gull lands and pushes', s.ev.netPush() !== 0, s.ev.netPush().toFixed(2));
    const withGull = s.ev.laneResult(s.l).raw;
    flail();
    say('Plank: Flail shakes the gulls off, for a penalty', s.ev.gulls.every((x) => x.leave) && s.ev.flails === 1 && s.ev.laneResult(s.l).raw < withGull, s.ev.flails);
    s = into('plank');
    s.ev.next = 99; push(1); T.advance(3.2);
    say('Plank: more than 2 s outside the zone is a belly flop', s.ev.flops >= 1, s.ev.flops);
    T.stick(0, 0); T.advance(3);
    say('Plank: and you resume', s.ev.flopT <= 0 && !s.ev.isDone());

    // Log Reps.
    s = into('logReps');
    s.ev.dropLog(s.l);
    say('Log Reps: at .5 m the log goes', s.l.logLost);
    const bandBefore = s.l.bandT; T.advance(1);
    say('Log Reps: that rep is lost while it is gone', s.l.bandT === bandBefore, s.l.bandT.toFixed(2));
    T.advance(1);
    say('Log Reps: Coach hands it back', !s.l.logLost);
    s = into('logReps');
    T.bot('sharp');
    for (let t = 0; t < 60 && !s.ev.isDone(); t += 0.5) T.advance(0.5);
    T.bot(null);
    say('Log Reps: six reps and two bonus reps worth double', s.l.repN === 8 && s.l.maxScore === 10, `${s.l.repN}, ${s.l.maxScore}`);

    // The Cairn.
    s = into('cairn');
    const placedAt = s.ev.placed;
    push(1); T.advance(9); T.stick(0, 0);
    say('Cairn: the next stone still comes', s.ev.placed > placedAt, s.ev.placed);

    // Step Class.
    s = into('stepClass');
    const w = s.ev.windows();
    say('Step Class: windows are 45, 90 and 135 ms', Math.abs(w.perfect - 0.045) < 1e-6 && Math.abs(w.good - 0.09) < 1e-6 && Math.abs(w.ok - 0.135) < 1e-6);
    const foot = s.ev.notes.findIndex((n) => !n.lean);
    s.l.combo = 15; s.ev.score(s.l, foot, 1, 'Perfect');
    say('Step Class: a combo of 16 swings the spotlights', s.l.combo === 16 && s.ev.spots.every((x) => x.intensity >= 100), s.l.combo);
    const next = s.ev.notes.findIndex((n, k) => !n.lean && k > foot);
    s.ev.miss(s.l, next);
    say('Step Class: a miss makes someone trip', s.ev.klass.some((k) => k.tripT > 0) && s.l.combo === 0);
    push(1); T.advance(3); T.stick(0, 0);
    say('Step Class: you cannot fall', !s.l.fallen);

    // Plate Spinners.
    s = into('plates');
    const plate = s.l.plates[0], shards = s.ev.shards.length;
    plate.energy = 0.0005; T.advance(STEP * 4);
    say('Plates: a plate that runs out falls', plate.state === 'off' && s.l.crashes === 1);
    say('Plates: and smashes into six shards', s.ev.shards.length === shards + 6, s.ev.shards.length - shards);
    T.advance(6.2);
    say('Plates: and comes back after 6 s', plate.state === 'on', plate.state);
    s.l.plates.forEach((q) => { q.state = 'on'; q.energy = 0.8; });
    const before = s.l.plates.map((q) => q.energy);
    for (let t = 0; t < 0.1; t += STEP) { s.l.hoop = 5.7; T.advance(STEP); }
    say('Plates: between the bands nothing gains', s.l.plates.every((q, i) => q.energy < before[i]));
    push(1); T.advance(3); T.stick(0, 0);
    say('Plates: you cannot fall', !s.l.fallen);

    // Island Loop.
    s = into('islandLoop');
    const stepOn = (id) => { T.press(id); T.advance(STEP * 3); T.press(id, false); T.advance(STEP * 3); };
    stepOn(6); stepOn(7); const st = s.ev.stumbles;
    stepOn(7);
    say('Island Loop: the same foot twice is a stumble', s.ev.stumbles === st + 1, s.ev.stumbles);
    T.bot('sharp');
    for (let t = 0; t < 110 && !s.ev.isDone(); t += 0.5) T.advance(0.5);
    T.bot(null);
    say('Island Loop: there are shells to pick up', s.ev.shells > 0, s.ev.shells);

    // Fruit Hat.
    s = into('fruitHat');
    s.ev.nextFruit = 1e9;
    const item = (kind) => { s.ev.launch(s.l, kind); return s.ev.items[s.ev.items.length - 1]; };
    const fruit = item('fruit'), boot = item('boot'), pine = item('pineapple');
    say('Fruit Hat: a golden pineapple is worth five and very heavy', pine.value === 5 && pine.mass > boot.mass && boot.mass > fruit.mass);
    s.ev.catchItem(fruit, s.l); s.ev.catchItem(pine, s.l);
    const unbanked = s.ev.laneResult(s.l).raw;
    say('Fruit Hat: unbanked fruit counts half', Math.abs(unbanked - (6 * 1.1) / 2) < 1e-6, unbanked.toFixed(2));
    s.ev.bank(s.l);
    say('Fruit Hat: bigger banks pay more', Math.abs(s.l.raw - 6 * 1.1) < 1e-6 && s.l.hat.length === 0, s.l.raw.toFixed(2));
    say('Fruit Hat: banking takes a second', s.l.bankT === 1, s.l.bankT);
    const hadRaw = s.l.raw, spike = item('urchin');
    s.ev.catchItem(spike, s.l);
    say('Fruit Hat: an urchin costs points', s.l.raw === Math.max(0, hadRaw - 2), s.l.raw.toFixed(2));
    const lost = item('fruit');
    s.ev.catchItem(lost, s.l);
    s.ev.forceFall(0);
    say('Fruit Hat: a fall spills everything unbanked', s.l.hat.length === 0 && lost.state === 'spill');

    // Room Service.
    s = into('roomService');
    s.ev.gustNext = 99;
    const stepRS = (id) => { T.press(id); T.advance(STEP * 3); T.press(id, false); T.advance(STEP * 3); };
    stepRS(6); stepRS(7); const sb = s.l.stumbles;
    stepRS(7);
    say('Room Service: the same foot twice is a stumble', s.l.stumbles === sb + 1, s.l.stumbles);
    s.ev.scheduleGust();
    T.advance(0.2);
    say('Room Service: a gust is telegraphed for a second', s.ev.gust && s.ev.gust.warn > 0.7 && s.ev.gust.warn <= 1, s.ev.gust && s.ev.gust.warn.toFixed(2));
    say('Room Service: and the disc shows where to lean', !!s.l.discView.brace || !!s.l.discView.zone);
    s.ev.gust = null;
    const glasses = s.l.tumblers.filter((x) => x.on).length;
    s.l.dist = 17; s.ev.offEdge(s.l);
    say('Room Service: off the edge you lose a glass and go back to the last buoy', s.l.tumblers.filter((x) => x.on).length === glasses - 1 && s.l.dist === 10 && s.l.splashes === 1, s.l.dist);
    const gary = (lean) => {
      const q = into('roomService', 1);
      q.ev.gustNext = 99; q.ev.garyT = 0.01;
      if (lean) push(lean);
      for (let t = 0; t < 3 && !(q.ev.gary && q.ev.gary.took); t += 0.05) T.advance(0.05);
      T.stick(0, 0);
      return !!(q.ev.gary && q.ev.gary.carried);
    };
    say('Room Service: Gary swoops for a glass', gary(0));
    say('Room Service: unless you lean out of his way', !gary(0.8));

    // Springboard.
    s = into('springboard');
    s.l.boardV = 0.5; s.ev.launch(s.l);
    say('Springboard: launch speed is at least 3', s.l.launchV === 3, s.l.launchV);
    const entry = (angle) => { const q = into('springboard'); q.l.boardV = 4; q.ev.launch(q.l); q.l.topY = 6; q.l.angle = angle; q.ev.enter(q.l); return { d: q.l.dives[0], hit: q.ev.gullHit }; };
    let e = entry(Math.PI / 2);
    say('Springboard: a flat flop is Splash, and knocks Gary out of the sky', e.d.k === undefined && e.d.kind === 'Splash' && e.hit > 0, e.d.kind);
    say('Springboard: scored by error and height', Math.abs(e.d.score - 100 * 1.1) < 1, e.d.score.toFixed(1));
    e = entry(Math.PI);
    say('Springboard: head first is Grace', e.d.kind === 'Grace', e.d.kind);
    e = entry(0);
    say('Springboard: feet first is Grace', e.d.kind === 'Grace', e.d.kind);
    e = entry(Math.PI / 4);
    say('Springboard: anything else is Technically a Dive', e.d.kind === 'Technically a Dive', e.d.kind);
    s = into('springboard');
    s.l.dives = [{ score: 10 }, { score: 50 }, { score: 30 }];
    say('Springboard: the best two of three count', s.ev.laneResult(s.l).raw === 40, s.ev.laneResult(s.l).raw);

    // Tippy Raft.
    s = into('raft');
    const [p0, p1, p2, p3] = s.ev.lanes;
    p0.px = 0; p0.pz = 0; p1.px = 1; p1.pz = 0; p1.vx = 0; p1.vz = 0; p0.cool = 0; p2.px = 3.5; p2.pz = 0; p2.vx = 0; p3.out = true;
    p0.input.flail = true; s.ev.stepLane(p0, STEP); p0.input.flail = false;
    say('Raft: a shove reaches 1.3 m and gives 6 m/s', Math.abs(p1.vx - 6) < 0.01 && p2.vx === 0, p1.vx.toFixed(2));
    say('Raft: with a 2 s cooldown', Math.abs(p0.cool - 2) < 0.01, p0.cool.toFixed(2));
    p0.input.hopPressed = true; s.ev.stepLane(p0, STEP); p0.input.hopPressed = false;
    say('Raft: Hop hops', p0.y > 0 || p0.vy > 0);
    s = into('raft');
    const [q0, q1, q2, q3] = s.ev.lanes;
    q1.px = 20; s.ev.stepLane(q1, STEP);
    say('Raft: off the edge you are out', q1.out);
    q2.out = true; q3.out = true; T.advance(STEP * 2);
    say('Raft: last doll standing wins the round', s.ev.wins[q0.id] === 1 && s.ev.stage === 'between', JSON.stringify(s.ev.wins));
    T.advance(4);
    s.ev.lanes.forEach((n, i) => { if (i > 0) n.out = true; });
    T.advance(STEP * 2);
    say('Raft: best of three', s.ev.wins[q0.id] === 2 && s.ev.finishing);
    T.advance(4);
    say('Raft: and then it ends', s.ev.isDone());

    // The Grand Hold gives a medal whatever happens.
    s = into('grandHold');
    say('The Grand Hold: medals are given anyway', s.ev.laneResult(s.l).form >= 40, s.ev.laneResult(s.l).form.toFixed(0));

    T.resetTuning(); T.goto('menu'); g.save.reset();
    return out;
  });
  for (const [label, pass, detail] of rows) ok(pass, label, detail);
  await page.context().close();
}
