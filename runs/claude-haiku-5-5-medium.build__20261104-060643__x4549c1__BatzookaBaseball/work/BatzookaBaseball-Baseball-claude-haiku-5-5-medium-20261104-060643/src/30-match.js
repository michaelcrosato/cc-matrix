// The match: the scene that plays innings. It owns the phases of a plate appearance (intro, ready, windup, meter, pitch,
// inplay, after, final), the input of whoever controls each side, the two views (the Plate Cam for the duel, the field
// for the play), the HUD and the commentary. The rules and physics are the pure modules (10 to 14); this scene asks them
// what happens and shows it.
//
// Control: team 1 (the home team) is player 1; team 0 (the visitors) is player 2 when one has joined, else the CPU.
// On defense the pitcher and the chaser are the fielding team's controller; at the plate, the batting team's.
BZ.LINES = {
  intro: ['Ladies and gentlemen, the game is about to begin. The corn is high and the beer is cold.'],
  ball: ['Ball one. The crowd has something to say about that.', 'That one was outside. Way outside.'],
  strike: ['Strike! The scoreboard is blinking at him.', 'Right down the middle! Hooray!'],
  foul: ['Foul ball! Into the corn!', 'That one went foul, and somebody in row nine is wearing it.'],
  k: ['Strike three! He is out, and he is going home to tell the dog.', 'Struck him out looking! The dugout is crying.'],
  walk: ['Four balls. The pitcher has forgotten the way to the plate.'],
  single: ['A single, and that one has a little spin on it!', 'Base hit! The fans are tossing their hats!'],
  double: ['A double into the gap! Two bases and a cloud of dust!'],
  triple: ['A triple! He is going like corn in a windstorm!'],
  hr: ['WAY BACK! WAY BACK! That one is GONE!', 'Home run! The Batzooka has spoken!'],
  caught: ['Caught on the warning track! Oh my, what a catch!', 'Hauled it in! That fly is an out, folks.'],
  groundOut: ['Grounder to the infield, and the throw beats him. Out!', 'Nimble work in the infield. He is out.'],
  forceOut: ['Out at second! The runner was a bit slow on the basepaths.'],
  safe: ['Safe! By a whisker!', 'He beat the throw. Safe at first.'],
  over: ['That is the ballgame! Thank you for coming out to Kernel Field!'],
  walkoff: ['A walk-off! The home crowd goes wild! Bring the cows out!']
};

// A line of commentary in the announcer's box; the big calls are also babbled (the Animalese voice).
BZ.say = (talk, key) => {
  const pool = BZ.LINES[key];
  if (!pool || !talk) return;
  const line = BZ.pick(BZ.rng.fx, pool);
  talk.say(line, { name: 'PA', auto: 2.8, modal: false });
  if (['hr', 'k', 'over', 'walkoff'].includes(key)) BZ.babble(line, { pitch: 230, rate: .07, vol: .12 });
};

// The match's state for a run: the rules, the two teams' rigs and fielders, the phase and its clocks.
// opts: { innings, human: [visitorsHuman, homeHuman], drill, attract, cpuLevel, seed }.
BZ.newMatchRun = (opts = {}) => {
  BZ.meter = [0, 0];
  BZ.seedMatch(opts.seed || 20261104);
  const S = BZ.newMatch({ innings: opts.innings || BZ.TUNE.innings });
  return {
    opts, S,
    rigs: [BZ.makeRigs(BZ.TEAMS[0]), BZ.makeRigs(BZ.TEAMS[1])],
    fielders: [BZ.makeFielders(), BZ.makeFielders()],
    human: [!!(opts.human && opts.human[0]), !!(opts.human && opts.human[1])],
    phase: 'intro', clock: 0, introT: 2.4, afterT: 0, finalT: 3.2,
    needNewBatter: true, paPrevKey: BZ.halfKey(S), paEnded: false,
    pitchChoice: 'fastball', aim: { lat: 0, h: 2.6 }, fireball: false, pending: null,
    meterT: 0, meterP: .5, windupK: 0, cpuPlanT: 1,
    plan: null, pt: 0, trail: [], pitchPos: null, swung: false, swing: null, swingK: 0, swingPhase: null,
    cpuSwing: null, swingAt: 0, reticle: null, prevPointer: null,
    play: null, ball: null, cam: 'plate', batterRunT: 0, basePx: [],
    stamp: null, talk: null, events: [],
    drill: opts.drill ? { kind: opts.drill.kind, goal: opts.drill.goal, got: 0 } : null
  };
};

// Start a match: the scene switches to it, and it begins with the first half's intro.
BZ.startMatch = (game, opts) => {
  BZ.M = BZ.newMatchRun(opts);
  game.go('match', opts);
};

// The input that controls a team: player 1 is the home team, player 2 (if joined) the visitors; otherwise the CPU.
BZ.controllerInput = (game, team) => {
  const p1 = BZ.M && BZ.M.opts.p1 !== undefined ? BZ.M.opts.p1 : 1;
  return (team === p1 ? game.players[0] : game.players[1]) || null;
};

// Hold the half's key: the same for the whole half-inning, so a change of half is seen.
BZ.halfKey = S => S.inning + (S.top ? 't' : 'b');

// Resolve a swing at the pitch's clock: contact, a foul or a whiff, and the reticle's place. A catch drill's contact is
// a fly ball to center, to give the human fielder something to catch.
BZ.resolveSwing = (M, swingPt, reticle, batzooka) => {
  const plan = M.plan, plate = BZ.plateLoc(plan);
  let c = BZ.contact({ swingT: swingPt - plan.time, reticle, plate, batzooka });
  if (M.drill && M.drill.kind === 'catch' && c.type === 'hit') c = Object.assign(c, { exit: 330, launch: 40, spray: 0 });
  M.swung = true;
  M.swing = Object.assign({ at: swingPt, reticle, batzooka }, c);
  M.swingPhase = 'swing'; M.swingK = 0;
  M.events.push({ type: 'swing', result: c.type, batzooka, q: c.q });
  return c;
};

BZ.matchScene = {
  pausable: true, view: 'threequarter', touch: false,
  enter(data) {
    const game = BZ.game, M = BZ.M;
    BZ.field = BZ.field || BZ.buildField();
    game.lights.enabled = BZ.park === 'moondome';
    game.lights.ambient = .55;
    M.talk = BZ.talkFor(game);
    if (!(data && data.resume)) BZ.beginHalfIntro(M);   // back from the pause menu's dev mode: the match picks up where it was
    BZ.playSong('match');
  },
  exit() { BZ.game.lights.enabled = false; BZ.playSong(null); },
  update(dt) { BZ.matchUpdate(BZ.game, BZ.M, dt); },
  draw(r) { BZ.matchDraw(r, BZ.M); }
};

BZ.talkFor = game => BZ.talk || (BZ.talk = new E.Dialog(game));

// The intro card for a half: TOP or BOTTOM of an inning, with the batting team named.
BZ.beginHalfIntro = M => {
  const S = M.S;
  M.phase = 'intro'; M.clock = 0; M.introT = 2.2; M.cam = 'plate';
  M.needNewBatter = true;
  M.paPrevKey = BZ.halfKey(S);
  M.stamp = { text: (S.top ? 'TOP ' : 'BOTTOM ') + BZ.ordinal(S.inning).toUpperCase(), color: '#ffe6a0', t: 2.2, sub: BZ.TEAMS[BZ.battingTeam(S)].name + ' at bat' };
  M.swung = false; M.swing = null; M.plan = null; M.pending = null;
};

// Each frame. Inputs are read here, once; the phases change the state; the rigs and the camera follow.
BZ.matchUpdate = (game, M, dt) => {
  if (!M) return;
  const S = M.S, bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  const pitcherIn = M.human[ft] ? BZ.controllerInput(game, ft) : null;
  const batterIn = M.human[bt] ? BZ.controllerInput(game, bt) : null;
  M.clock += dt;
  if (M.stamp) { M.stamp.t -= dt; if (M.stamp.t <= 0 && M.phase !== 'intro' && M.phase !== 'after') M.stamp = null; }
  BZ.tickSwing(M, dt);

  switch (M.phase) {
    case 'intro':
      M.introT -= dt;
      if (M.introT <= 0) { M.stamp = null; M.phase = 'ready'; M.clock = 0; M.cpuPlanT = .9 + BZ.rng.fx() * .4; }
      break;
    case 'ready':
      if (M.needNewBatter) { BZ.beginPA(S); M.needNewBatter = false; M.paEnded = false; M.reticle = null; }
      M.cam = 'plate';
      if (!M.human[ft] || M.opts.attract) {
        if (M.clock >= M.cpuPlanT) { M.plan = BZ.botPitch(S); M.phase = 'windup'; M.clock = 0; }
      } else if (pitcherIn) BZ.humanPitchReady(game, M, pitcherIn, dt);
      break;
    case 'windup':
      M.windupK = Math.min(1, M.clock / .55);
      if (M.clock >= .55) {
        if (M.human[ft] && !M.opts.attract) { M.phase = 'meter'; M.meterT = 0; }
        else BZ.release(M, .5);
      }
      break;
    case 'meter':
      M.meterT += dt;
      M.meterP = .5 + .5 * Math.sin(M.meterT * Math.PI * 2 / 1.15 - Math.PI / 2);
      if ((pitcherIn && pitcherIn.pressed('confirm')) || M.meterT > 2.4) BZ.release(M, M.meterP);
      break;
    case 'pitch':
      BZ.pitchUpdate(game, M, dt, batterIn);
      break;
    case 'inplay':
      BZ.playUpdate(game, M, dt, pitcherIn);
      break;
    case 'after':
      M.afterT -= dt;
      if (M.afterT <= 0) BZ.nextAfter(game, M);
      break;
    case 'final':
      M.finalT -= dt;
      if (M.finalT <= 0) BZ.endMatch(game, M);
      break;
  }
  BZ.rigsUpdate(M, dt);
  BZ.focusCam(game, M);
  M.batterRunT = M.ball ? Math.min(1, M.batterRunT + dt / Math.max(.1, BZ.runTime())) : 0;
};

// The human pitcher's setup: the pitch (chips, Q/E, a click), the aim (stick, or the mouse), the Fireball, and a press to
// wind up. Clicking the pitch's chip picks it; a click anywhere else on the screen winds up.
BZ.humanPitchReady = (game, M, I, dt) => {
  const S = M.S, plist = BZ.PITCH_IDS, idx = plist.indexOf(M.pitchChoice);
  if (I.pressed('prevPitch')) M.pitchChoice = plist[(idx + plist.length - 1) % plist.length];
  if (I.pressed('nextPitch')) M.pitchChoice = plist[(idx + 1) % plist.length];
  const click = game.input.clicked();
  const onChip = click ? BZ.chipAt(click[0], click[1]) : null;
  const hover = BZ.chipAt(...(game.input.pointer() || [-1, -1]));
  if (onChip) M.pitchChoice = onChip;
  else if (hover) M.pitchChoice = hover;
  // the aim: the stick moves it; a mouse that moves puts it on the pointer
  const pt = game.input.pointer(), mv = I.move();
  if (pt && M.prevPointer && Math.abs(pt[0] - M.prevPointer[0]) + Math.abs(pt[1] - M.prevPointer[1]) > 2) {
    const p = BZ.plateFromScreen(pt[0], pt[1], game.W, game.H);
    M.aim = BZ.clampAim(p.lat, p.h);
  } else if (mv[0] || mv[1]) {
    M.aim = BZ.clampAim(M.aim.lat + mv[0] * 1.8 * dt, M.aim.h - mv[1] * 1.8 * dt);
  }
  M.prevPointer = pt ? pt.slice() : null;
  if (I.pressed('power') && BZ.meter[BZ.fieldingTeam(S)] >= 100) M.fireball = !M.fireball;
  if (I.pressed('confirm') || (click && !onChip)) {
    M.pending = { pitch: M.pitchChoice, aimLat: M.aim.lat, aimH: M.aim.h, superPitch: M.fireball };
    if (M.fireball) { BZ.meter[BZ.fieldingTeam(S)] = 0; M.fireball = false; }
    M.phase = 'windup'; M.clock = 0; M.prevPointer = null;
  }
};

// Pitch selection chips at the bottom-left of the screen: their rectangles for hover and click.
BZ.chipRects = game => BZ.PITCH_IDS.map((id, i) => ({ id, x0: game.W - 126, y0: 14 + i * 34, x1: game.W - 14, y1: 14 + i * 34 + 30 }));
BZ.chipAt = (x, y) => {
  const g = BZ.game;
  if (!g || x < 0) return null;
  for (const c of BZ.chipRects(g)) if (x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) return c.id;
  return null;
};

// The release: the pitch the pitcher chose, with the meter's place, goes. A CPU's plan is ready already.
BZ.release = (M, p) => {
  const S = M.S;
  let plan = M.plan;
  if (M.pending) {
    plan = BZ.planPitch({ pitch: M.pending.pitch, aimLat: M.pending.aimLat, aimH: M.pending.aimH, release: p, superPitch: M.pending.superPitch });
    M.pending = null;
  }
  M.plan = plan;
  M.pt = 0; M.phase = 'pitch'; M.clock = 0; M.trail = []; M.pitchPos = null;
  M.swung = false; M.swing = null; M.cpuSwing = null; M.swingAt = 0;
  // the batter: the CPU decides its swing now, unless a player is at the plate
  const bt = BZ.battingTeam(S);
  if (!M.human[bt] || M.opts.attract) {
    const sw = BZ.cpuSwing(S, plan, BZ.rng.play, M.opts.cpuLevel || BZ.TUNE.cpuLevel);
    if (sw) { M.cpuSwing = sw; M.swingAt = plan.time + sw.swingT; }
    if (M.drill && M.drill.kind === 'catch') { M.cpuSwing = { swingT: 0, reticle: BZ.plateLoc(plan) }; M.swingAt = plan.time; }
  }
  M.events.push({ type: 'pitch', pitch: plan.pitch, time: plan.time, miss: plan.miss, super: plan.super });
};

// The pitch in flight: the batter's swing (a player's press or the CPU's timed one), and the umpire's call on arrival.
BZ.pitchUpdate = (game, M, dt, batterIn) => {
  const plan = M.plan, S = M.S, bt = BZ.battingTeam(S);
  M.pt += dt;
  const pos = BZ.pitchAt(plan, Math.min(1, M.pt / plan.time));
  M.pitchPos = pos;
  M.trail.push({ lat: pos.lat, h: pos.h, depth: pos.depth });
  if (M.trail.length > 9) M.trail.shift();
  const clickAt = game.input.clicked();
  if (!M.swung && batterIn && !M.opts.attract) {
    const ret = BZ.batterAim(game, M, batterIn, dt);
    if (batterIn.pressed('confirm') || (clickAt && !BZ.chipAt(clickAt[0], clickAt[1]))) {
      const bz = !!(batterIn.pressed('power') && BZ.meter[bt] >= 100);
      if (bz) BZ.meter[bt] = 0;
      BZ.afterSwing(game, M, BZ.resolveSwing(M, M.pt, ret, bz));
    }
  } else if (!M.swung && M.cpuSwing && M.pt >= M.swingAt) {
    const bz = !!(M.opts.attract && BZ.meter[bt] >= 100);
    if (bz) BZ.meter[bt] = 0;
    BZ.afterSwing(game, M, BZ.resolveSwing(M, M.pt, M.cpuSwing.reticle, bz));
  }
  if (M.phase !== 'pitch') return;
  if (M.pt >= plan.time + .3) {
    if (!M.swung) {
      const at = BZ.plateLoc(plan);
      BZ.countEvent(game, M, BZ.inZone(at.lat, at.h) ? 'strike' : 'ball', false);
    }
    BZ.afterPitch(game, M);
  }
};

// A player's reticle: the stick moves it, the mouse puts it on the pointer; the default is the middle of the plate.
BZ.batterAim = (game, M, I, dt) => {
  const pt = game.input.pointer(), mv = I.move();
  M.reticle = M.reticle || { lat: 0, h: 2.6 };
  if (pt && M.prevPointer && Math.abs(pt[0] - M.prevPointer[0]) + Math.abs(pt[1] - M.prevPointer[1]) > 2) {
    const p = BZ.plateFromScreen(pt[0], pt[1], game.W, game.H);
    M.reticle = { lat: BZ.clamp(p.lat, -1.6, 1.6), h: BZ.clamp(p.h, .6, 4.6) };
  } else if (mv[0] || mv[1]) {
    M.reticle = { lat: BZ.clamp(M.reticle.lat + mv[0] * 1.6 * dt, -1.6, 1.6), h: BZ.clamp(M.reticle.h - mv[1] * 1.6 * dt, .6, 4.6) };
  }
  M.prevPointer = pt ? pt.slice() : null;
  return M.reticle;
};

// The swing's animation timer (the rig's swing and the bat), 0.32 s.
BZ.tickSwing = (M, dt) => {
  if (M.swingPhase === 'swing') {
    M.swingK = Math.min(1, M.swingK + dt / .32);
    if (M.swingK >= 1) M.swingPhase = null;
  }
};

// After a swing: contact sends the ball into play; a foul or a whiff is counted here.
BZ.afterSwing = (game, M, c) => {
  const S = M.S, ft = BZ.fieldingTeam(S);
  M.swing = Object.assign(M.swing, c);
  if (c.type === 'hit') {
    M.ball = BZ.launchBall({ exit: c.exit, launch: c.launch, spray: c.spray, batzooka: c.batzooka });
    M.play = new BZ.Play(S, M.ball, M.fielders[ft]);
    for (const f of M.fielders[ft]) f.human = !!M.human[ft] && !M.opts.attract;
    M.phase = 'inplay'; M.cam = 'field'; M.clock = 0; M.batterRunT = 0;
    BZ.sfx(c.batzooka ? 'rocket' : 'crack', { vol: c.batzooka ? .6 : 1 });
    if (c.batzooka) BZ.sfx('fire', { vol: .4 });
    return;
  }
  if (c.type === 'foul') { BZ.countEvent(game, M, 'foul', false); BZ.afterPitch(game, M); return; }
  BZ.countEvent(game, M, 'strike', true);   // a whiff: a swinging strike
  BZ.afterPitch(game, M);
};

// The count moves for a called or swung-at pitch. A walk, a strikeout or the half's end finishes the plate appearance.
// kind: 'ball' | 'strike' (called or swung at) | 'foul'. Returns the rules' event.
BZ.countEvent = (game, M, kind, swung) => {
  const S = M.S, ft = BZ.fieldingTeam(S);
  const ev = BZ.pitchCount(S, kind === 'ball' ? 'ball' : kind === 'strike' ? 'strike' : 'foul');
  const count = BZ.countText(S);
  M.events.push({ type: 'call', kind, ev: ev.ev, count });
  if (kind === 'ball') { BZ.sfx('ball'); M.stamp = { text: 'BALL', color: '#7ad0ff', t: 1, sub: count }; if (BZ.rng.fx() < .3) BZ.say(M.talk, 'ball'); }
  if (kind === 'strike') { BZ.sfx('strike'); M.stamp = { text: swung ? 'SWINGING STRIKE' : 'STRIKE', color: '#ffb020', t: 1, sub: count }; if (!swung && BZ.rng.fx() < .5) BZ.say(M.talk, 'strike'); }
  if (kind === 'foul') { BZ.sfx('foul'); M.stamp = { text: 'FOUL', color: '#ffb020', t: 1, sub: count }; if (BZ.rng.fx() < .3) BZ.say(M.talk, 'foul'); }
  if (kind === 'strike' && M.drill && M.drill.kind === 'strikes') M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
  if (ev.ev === 'k') {
    BZ.sfx('out'); BZ.say(M.talk, 'k');
    M.stamp = { text: 'STRIKE THREE', color: '#ff6a5a', t: 1.8, sub: 'OUT' };
    BZ.meter[ft] = Math.min(100, BZ.meter[ft] + 20);
  }
  if (ev.ev === 'walk') { BZ.sfx('confirm'); BZ.say(M.talk, 'walk'); M.stamp = { text: 'BALL FOUR', color: '#7ad0ff', t: 1.8, sub: 'WALK' }; }
  if (ev.ev === 'k' || ev.ev === 'walk' || ev.end || ev.ev === 'gameOver') M.paEnded = true;
  if (M.paEnded) M.needNewBatter = true;
  return ev;
};

// The pitch is over: a pause for the call, then the next pitch, the next batter or the change of half.
BZ.afterPitch = (game, M) => {
  M.phase = 'after'; M.clock = 0;
  M.afterT = M.paEnded ? 2 : 1.1;
};

// The batted ball: the defense plays it, the rules decide the play, and a result stamp says what happened.
BZ.playUpdate = (game, M, dt, pitcherIn) => {
  const human = { move: pitcherIn ? pitcherIn.move() : [0, 0], dive: !!(pitcherIn && pitcherIn.pressed('confirm')) };
  if (M.play.phase === 'fielded' && pitcherIn) {
    if (pitcherIn.pressed('up')) human.pick = 'second';
    else if (pitcherIn.pressed('left')) human.pick = 'third';
    else if (pitcherIn.pressed('right')) human.pick = 'first';
    const click = game.input.clicked();
    if (click) {
      const b = M.basePx.findIndex(p => p && Math.hypot(p[0] - click[0], p[1] - click[1]) < 32);
      if (b >= 0) human.pick = ['first', 'second', 'third', null][b];
    }
  }
  M.play.step(dt, human);
  for (const e of M.play.events.splice(0)) {
    M.events.push({ type: 'play:' + e.type, who: e.fielder || e.target });
    if (e.type === 'caught') BZ.sfx('catch');
    if (e.type === 'fielded') BZ.sfx('thud');
    if (e.type === 'throw') BZ.sfx('throw');
  }
  if (M.play.phase === 'over') BZ.playResolved(game, M);
};

// The play is over. The stamp says it, the batter's meter fills, the drill counts it, and the count moves on.
BZ.playResolved = (game, M) => {
  const S = M.S, bt = BZ.battingTeam(S), res = M.play.result;
  const ball = M.ball;
  let text = 'OUT', color = '#ff6a5a', sub = '', key = null;
  if (res.kind === 'foul') {
    BZ.countEvent(game, M, 'foul', false);
    M.play = null; M.ball = null;
    BZ.afterPitch(game, M);
    return;
  }
  if (res.kind === 'caught') {
    text = 'CAUGHT'; sub = res.deep ? 'deep fly: the runner tags up' : 'fly out'; key = 'caught';
    BZ.sfx('out');
    if (M.drill && M.drill.kind === 'catch') M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
  } else if (res.kind === 'hit') {
    const T = { single: ['SINGLE', '#ffe6a0'], double: ['DOUBLE', '#ffe6a0'], triple: ['TRIPLE', '#ffb020'], hr: ['HOME RUN', '#ffb020'] }[res.type];
    text = T[0]; color = T[1]; key = res.type;
    BZ.meter[bt] = Math.min(100, BZ.meter[bt] + ({ single: .5, double: 1, triple: 1.3, hr: 2 }[res.type]) * BZ.TUNE.meterGain);
    if (res.type === 'hr' && ball) sub = Math.round(ball.homer ? ball.crossDist : ball.landDist) + ' FT' + (ball.batzooka ? ' · BATZOOKA' : '');
    if (res.type === 'hr') { BZ.sfx('fanfare'); BZ.sfx('cheer'); if (ball) game.particles.explosion(ball.x, ball.y, 4, 1.2); }
    else BZ.sfx('cheer', { vol: .5 });
    if (M.drill && M.drill.kind === 'hit' && res.type !== undefined) M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
    if (M.drill && M.drill.kind === 'homer' && res.type === 'hr' && ball && ball.batzooka) M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
  } else if (res.kind === 'ground') {
    if (res.batterOut) { text = 'OUT AT FIRST'; key = 'groundOut'; BZ.sfx('out'); }
    else if (res.runnerOut) { text = 'FORCE OUT'; key = 'forceOut'; BZ.sfx('out'); }
    else { text = 'SAFE'; color = '#7ad06a'; key = 'safe'; BZ.sfx('confirm'); }
    if (res.r && res.r.runs) sub = res.r.runs + (res.r.runs > 1 ? ' RUNS SCORE' : ' RUN SCORES');
  }
  if (key) BZ.say(M.talk, key);
  M.stamp = { text, color, t: 2, sub };
  M.events.push({ type: 'result', kind: res.kind, text, S_outs: S.outs });
  M.play = null; M.ball = null; M.swing = null;
  M.paEnded = true; M.needNewBatter = true;
  M.phase = 'after'; M.clock = 0; M.afterT = 2.1;
};

// The next thing after a count or a play: the final, the change of half, or the next pitch (the same batter, or the next).
BZ.nextAfter = (game, M) => {
  const S = M.S;
  M.stamp = null;
  const drillDone = M.drill && M.drill.got >= M.drill.goal;
  if (S.over || drillDone) {
    if (drillDone) S.over = true;
    M.phase = 'final'; M.finalT = 3.4; M.clock = 0; M.cam = 'plate';
    BZ.playSong('results');
    BZ.say(M.talk, S.walkoff ? 'walkoff' : 'over');
    return;
  }
  if (BZ.halfKey(S) !== M.paPrevKey) { BZ.beginHalfIntro(M); return; }
  M.paEnded = false;
  M.phase = 'ready'; M.clock = 0; M.cpuPlanT = .9 + BZ.rng.fx() * .4; M.fireball = false;
  M.cam = 'plate'; M.swung = false; M.swing = null; M.trail = []; M.plan = null; M.pitchPos = null;
};

// The match is over: its state goes to the results screen.
BZ.endMatch = (game, M) => {
  if (M.opts.attract) { BZ.startAttract(game); return; }   // the attract mode plays on, match after match
  BZ.M = M;
  BZ.playSong(null);
  game.go('results', { S: M.S, drill: M.drill, opts: M.opts });
};

// The rigs' poses from the state: the wind-up and release, the swing, the stance, the runners on the bases, the fielders.
BZ.rigsUpdate = (M, dt) => {
  if (BZ.cosmetic === false) return;   // headless sims skip the poses: the rules never read them
  const S = M.S, bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  for (const t of [0, 1]) {
    const R = M.rigs[t];
    for (const f of M.fielders[t]) {
      const st = { x: f.x, y: f.y, z: 0, facing: f.face || 0, vx: f.vx || 0, vy: f.vy || 0 };
      if (f.role === 'C') st.pose = 'crouch';
      if (f.role === 'P' && t === ft) {
        if (M.phase === 'windup' || M.phase === 'meter') st.attack = E.move('overhead', M.phase === 'windup' ? M.windupK : .5);
        else if (M.phase === 'pitch') st.attack = E.move('overhead', 1, 'recover');
        R.far.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, attack: st.attack, stance: st.attack ? undefined : 'ready' });
      }
      R.fielders[f.role].update(dt, st);
    }
    const bstate = { x: 0, y: 0, z: 0, facing: Math.PI / 2 };
    if (t === bt && M.swingPhase === 'swing') bstate.attack = E.move('slash', M.swingK);
    else bstate.stance = 'ready';
    R.batter.update(dt, bstate);
    R.runners.forEach((rr, i) => rr.update(dt, { x: 0, y: 0, z: 0, facing: 0, stance: 'ready' }));
  }
};

// The zoom of the field view, set only when it changes (setZoom re-draws the world).
BZ.setZoomTo = (game, z) => { if ((game.zoom || 1) !== z) game.setZoom(z); };

// The camera: the Plate Cam has none; the field follows the ball, or the plate while nothing is in play.
BZ.focusCam = (game, M) => {
  BZ.setZoomTo(game, M.cam === 'field' ? .55 : 1);
  if (M.cam !== 'field') return;
  const b = M.ball;
  if (b) game.focus(BZ.lerp(BZ.HX, b.x, .6), BZ.lerp(BZ.HY, b.y, .6) - 60, b.z * .3);
  else game.focus(BZ.HX, BZ.HY - 260, 0);
};

// The draw: the Plate Cam for the duel, the field for the play; then the HUD over both.
BZ.matchDraw = (r, M) => {
  if (!M) return;
  const W = r.W, H = r.H, S = M.S, park = BZ.PARKS[BZ.park];
  if (M.cam === 'field') BZ.drawField(r, M);
  else {
    r.sky(park.night ? ['#060818', '#2a2a5a'] : park.sky);
    const ft = BZ.fieldingTeam(S), bt = BZ.battingTeam(S);
    r.overlay(g => {
      BZ.drawPlateGround(g, W, H, park);
      BZ.drawZone(g, W, H);
      BZ.drawPlatePlayers(g, W, H, { view: r.view, pitcher: M.rigs[ft].far, batter: M.rigs[bt].batter });
      if (M.plan && M.phase === 'pitch' && M.pitchPos) BZ.drawPitchBall(g, W, H, M.plan, Math.min(1, M.pt / M.plan.time), M.trail);
      if (M.phase === 'ready' || M.phase === 'windup' || M.phase === 'meter') BZ.drawAimReticle(g, W, H, M);
      if (M.phase === 'pitch' && !M.swung && M.human[bt]) BZ.drawBatterReticle(g, W, H, M);
      if (M.phase !== 'after' && M.phase !== 'intro') BZ.drawBat(g, W, H, { swing: M.swingPhase === 'swing' ? M.swingK : 0, reticle: M.swing && M.swing.reticle ? M.swing.reticle : (M.reticle || { lat: -.4, h: 2.8 }) });
    });
  }
  r.overlay(g => BZ.drawHud(g, r, M));
  if (M.talk) M.talk.draw(r);
};

// The field view: the TileMap, the fielders, the runners, the batter's run and the ball, with the bases clickable.
BZ.drawField = (r, M) => {
  const S = M.S, ft = BZ.fieldingTeam(S), bt = BZ.battingTeam(S);
  BZ.drawFieldBase(r);
  for (const f of M.fielders[ft]) {
    const rig = M.rigs[ft].fielders[f.role];
    r.shadow(f.x, f.y, 6, .3, undefined, 0);
    r.actor(f.x, f.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  }
  const bases = BZ.bases();
  bases.forEach((b, i) => { M.basePx[i] = r.w(b.x, b.y, 0); });
  bases.slice(0, 3).forEach((b, i) => {
    if (S.bases[i]) { const rr = M.rigs[bt].runners[i]; r.actor(b.x, b.y, 0, (g, ox, oy) => rr.draw(g, ox, oy, r.view)); }
  });
  if (M.ball && M.batterRunT > 0 && M.batterRunT < 1) {
    const p = bases[0], x = BZ.lerp(BZ.HX, p.x, M.batterRunT), y = BZ.lerp(BZ.HY - 10, p.y, M.batterRunT);
    r.actor(x, y, 0, (g, ox, oy) => M.rigs[bt].batter.draw(g, ox, oy, r.view));
  }
  if (M.ball) {
    const b = M.ball;
    r.shadow(b.x, b.y, 4, .45, undefined, 0);
    r.sprite(b.x, b.y, b.z + 4, BZ.BALL_SPR, { glow: .3 });
  }
};

// The ball's sprite: a white ball with a red seam, drawn once.
BZ.BALL_SPR = E.sprite(['.www.', 'wwrww', 'wrwrw', 'wwrww', '.www.'], { w: '#f8f8f0', r: '#c83a3a' }, 2);

// The HUD for the match: the scorebug, the pitch chips, the meters, the release meter, the stamp and the prompt.
BZ.drawHud = (g, r, M) => {
  const S = M.S, W = r.W, H = r.H;
  BZ.drawScorebug(g, S, 16, 16);
  const bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  if (M.phase === 'ready' && M.human[ft]) BZ.drawChips(g, M);
  if (M.human[bt]) BZ.drawBatzookaMeter(g, W - 178, H * .7, 150, BZ.meter[bt], 'BATZOOKA', BZ.meter[bt] >= 100);
  if (M.human[ft]) BZ.drawBatzookaMeter(g, W - 178, H * .7 + 34, 150, BZ.meter[ft], 'FIREBALL', BZ.meter[ft] >= 100 || M.fireball);
  if (M.phase === 'meter') {
    BZ.drawMeter(g, W / 2 - 80, H * .3, 160, M.meterP);
    BZ.text(g, BZ.prompt('confirm', 'RELEASE IN THE GREEN'), W / 2, H * .3 + 14, '#ffffff', { align: 'center', scale: 1.1 });
  }
  if (M.stamp) BZ.drawStamp(g, W, H, M.stamp, M.stamp.color, M.stamp.sub);
  if (M.drill) BZ.text(g, BZ.drillText(M), W / 2, 14, '#ffe6a0', { align: 'center', scale: 1.4 });
  BZ.drawPrompt(g, W, H, M);
};

BZ.drillText = M => {
  const names = { strikes: 'THROW STRIKES', hit: 'PUT ONE IN PLAY', catch: 'CATCH A FLY', homer: 'HIT A HOMER WITH THE BATZOOKA' };
  return names[M.drill.kind] + '   ' + M.drill.got + '/' + M.drill.goal;
};

// The pitch chips: the one picked is lit. Hover moves to it; a click picks it.
BZ.drawChips = (g, M) => {
  for (const c of BZ.chipRects(BZ.game)) {
    const on = c.id === M.pitchChoice, P = BZ.PITCHES[c.id];
    E.ui.box(g, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, { bg: on ? ['#ffe6a0', '#c8a060'] : ['#1a1d2a', '#0b0d16'], border: on ? '#ffffff' : '#c8a060', alpha: .92 });
    BZ.text(g, P.name, c.x0 + 6, c.y0 + 4, on ? '#1a1020' : '#ffffff', { scale: 1, shadow: null });
    BZ.text(g, P.tag, c.x0 + 6, c.y0 + 17, on ? '#1a1020' : '#c8d0f0', { scale: 1, shadow: null });
  }
};

// The prompt line at the bottom: what this player does now, with the label for their device.
BZ.drawPrompt = (g, W, H, M) => {
  const S = M.S, bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  let line = '';
  if (M.phase === 'ready' && M.human[ft]) line = BZ.prompt('confirm', 'WIND UP') + '   ' + BZ.keys('prevPitch', 'nextPitch') + ' PITCH   STICK AIMS   ' + BZ.prompt('power', 'FIREBALL WHEN FULL');
  else if (M.phase === 'pitch' && M.human[bt] && !M.swung) line = BZ.prompt('confirm', 'SWING') + '   STICK AIMS THE BAT   ' + BZ.prompt('power', 'BATZOOKA WHEN FULL');
  else if (M.phase === 'inplay' && M.human[ft]) line = BZ.prompt('confirm', 'DIVE') + '   STICK RUNS   ' + (M.play && M.play.phase === 'fielded' ? 'UP 2ND   LEFT 3RD   RIGHT 1ST' : '');
  if (line && M.phase !== 'meter') {
    const w = line.length * 6.4 + 28;
    E.ui.box(g, W / 2 - w / 2, H - 26, w, 20, { bg: ['#101420', '#060810'], border: '#c8a060', alpha: .85 });
    BZ.text(g, line, W / 2, H - 20, '#ffffff', { align: 'center', scale: 1.2, shadow: null });
  }
};

// Two keys' labels as one: "Q/E".
BZ.keys = (a, b) => (BZ.game.input.label(a) || '') + '/' + (BZ.game.input.label(b) || '');

// The aim: the pitcher's target on the plate's plane.
BZ.drawAimReticle = (g, W, H, M) => {
  const p = BZ.project(M.aim.lat, M.aim.h, 0, W, H);
  E.px.ell(g, p.x, p.y, Math.max(3, .5 * p.s), Math.max(2, .3 * p.s), '#ffffff88');
  E.px.disc(g, p.x, p.y, 1.5, '#ffe6a0');
};

// The batter's reticle: the bat's head, sized by the bat's reach.
BZ.drawBatterReticle = (g, W, H, M) => {
  const ret = M.reticle || { lat: 0, h: 2.6 };
  const p = BZ.project(ret.lat, ret.h, 0, W, H);
  E.px.ell(g, p.x, p.y, Math.max(3, BZ.TUNE.reach * p.s * .5), Math.max(2, BZ.TUNE.reach * p.s * .3), '#ffe6a055');
  E.px.disc(g, p.x, p.y, 1.5, '#ffe6a0');
};
