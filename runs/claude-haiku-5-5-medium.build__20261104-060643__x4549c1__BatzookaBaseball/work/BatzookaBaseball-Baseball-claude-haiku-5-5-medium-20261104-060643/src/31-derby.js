// The Batzooka Derby: a pitch machine, one batter, no fielders. Every fair ball is measured where it lands, and the total
// of those feet is the score. A whiff or a foul is an out; a pitch let go is not. The round ends at the outs limit or the
// clock. Local play is hot-seat for 1 to 4 players, in turns; the AI Hub round is one copy of it, with the other players
// as ghosts (36-hub.js). The pitches come from the deal stream, so every copy in a session throws the same ones.
BZ.derbyPitch = (rng = BZ.rng.deal) => {
  const pitch = BZ.pick(rng, BZ.PITCH_IDS);
  return BZ.planPitch({ pitch, aimLat: (rng() - .5) * 1.7, aimH: 1.7 + rng() * 1.9, release: .5 + (rng() - .5) * .3, rng });
};

// A new derby run: the players (local: one or more, in turns; hub: one), and where it is.
BZ.newDerby = (players, mode = 'local') => ({
  mode, hub: mode === 'hub', talk: null, rigs: BZ.makeRigs(BZ.TEAMS[1]),
  players: players.map((p, i) => ({ name: p.name, color: p.color, input: p.input || null, index: i,
    score: 0, hits: 0, hr: 0, longest: 0, outs: 0, swings: 0, done: false })),
  cur: 0, round: null, phase: 'intro', clock: 0, afterT: 2.4, meter: 0, finished: false
});

// A round: the batter's state for one player's turn at the plate.
BZ.newRound = D => ({
  p: D.players[D.cur], outs: 0, clock: 0,
  plan: null, pt: 0, pitchPos: null, swung: false, ball: null,
  reticle: { lat: 0, h: 2.6 }, prevPointer: null,
  stamp: null, afterT: 0, ended: false, last: null
});

BZ.derbyScene = {
  pausable: true, view: 'threequarter', touch: false,
  enter() {
    BZ.field = BZ.field || BZ.buildField();
    BZ.talkFor(BZ.game);
    BZ.game.lights.enabled = BZ.park === 'moondome';
    BZ.game.lights.ambient = .5;
    BZ.playSong('derby');
  },
  exit() { BZ.game.lights.enabled = false; BZ.playSong(null); },
  update(dt) { BZ.derbyUpdate(BZ.game, BZ.D, dt); },
  draw(r) { BZ.derbyDraw(r, BZ.D); }
};

// The clock left in a round: from the AI Hub's timeline in a session, else from the setting.
BZ.derbyTimeLeft = D => {
  if (D.hub && BZ.hub) return Math.max(0, BZ.hub.limitS - Math.max(0, AIHub.time() / 1000));
  return Math.max(0, BZ.TUNE.derbySeconds - D.clock);
};

// Each frame: the intro, a pitch and its swing, the ball's flight, the result, and the pause before the next pitch.
BZ.derbyUpdate = (game, D, dt) => {
  if (!D || D.finished) return;
  if (D.hub) { BZ.hubCardInput(game); if (BZ.hubDerbyUpdate(game, D, dt)) return; }
  D.clock += dt;
  BZ.derbyRigs(D, dt);
  if (D.phase === 'intro') {
    D.afterT -= dt;
    if (D.afterT <= 0) { D.phase = 'play'; D.round = BZ.newRound(D); BZ.derbyNewPitch(D); }
    return;
  }
  const R = D.round;
  if (!R) return;
  if (R.stamp) { R.stamp.t -= dt; if (R.stamp.t <= 0) R.stamp = null; }
  if (R.ended) {
    R.afterT -= dt;
    if (R.afterT <= 0) BZ.derbyAfter(game, D);
    return;
  }
  if (BZ.derbyTimeLeft(D) <= 0 || R.outs >= BZ.TUNE.derbyOuts) { BZ.derbyEndRound(game, D); return; }
  // the camera: the plate's view while the pitch comes; the field, out to take in the ball, once it is hit
  BZ.setZoomTo(game, R.ball ? .55 : 1);
  if (R.ball) {
    game.focus(BZ.lerp(BZ.HX, R.ball.x, .6), BZ.lerp(BZ.HY, R.ball.y, .6) - 60, R.ball.z * .3);
    BZ.stepBall(R.ball, dt);
    if (R.ball.stopped) BZ.derbyResult(game, D, R);
    return;
  }
  R.pt += dt;
  const plan = R.plan;
  R.pitchPos = BZ.pitchAt(plan, Math.min(1, R.pt / plan.time));
  const I = R.p.input;
  if (I && !R.swung) {
    const ret = BZ.batterAim(game, R, I, dt);
    const click = game.input.clicked();
    const inWindow = R.pt > plan.time - .5 && R.pt < plan.time + .3;
    if (inWindow && (I.pressed('confirm') || click)) {
      const bz = !!I.pressed('power') && D.meter >= 100;
      if (bz) D.meter = 0;
      BZ.derbySwing(game, D, R, ret, bz);
      return;
    }
  }
  if (R.pt > plan.time + .35 && !R.swung) BZ.derbyMiss(game, D, R, 'take');
};

// The derby's players are posed each step: the far pitcher and the batter, both in their stance.
BZ.derbyRigs = (D, dt) => {
  if (BZ.cosmetic === false) return;
  D.rigs.far.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, stance: 'ready' });
  D.rigs.batter.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, stance: 'ready' });
};

// A new pitch from the machine.
BZ.derbyNewPitch = D => {
  const R = D.round;
  R.plan = BZ.derbyPitch(); R.pt = 0; R.swung = false; R.ball = null; R.pitchPos = null;
  D.pitchNo = (D.pitchNo || 0) + 1;
};

// A swing: contact sends the ball, and a foul or a whiff is an out.
BZ.derbySwing = (game, D, R, reticle, batzooka) => {
  const c = BZ.contact({ swingT: R.pt - R.plan.time, reticle, plate: BZ.plateLoc(R.plan), batzooka });
  R.swung = true;
  R.p.swings++;
  if (c.type === 'hit') {
    R.ball = BZ.launchBall({ exit: c.exit, launch: c.launch, spray: c.spray, batzooka: c.batzooka });
    BZ.sfx(c.batzooka ? 'rocket' : 'crack');
    if (c.batzooka) BZ.sfx('fire', { vol: .4 });
    if (D.hub) BZ.hubOnHit(Object.assign({}, c));
    return;
  }
  BZ.derbyMiss(game, D, R, c.type === 'foul' ? 'foul' : 'whiff');
};

// A miss: a whiff, a foul (an out), or a pitch let go (no out, the next pitch comes).
BZ.derbyMiss = (game, D, R, why) => {
  if (why !== 'take') { R.outs++; R.p.outs++; }
  R.stamp = why === 'take' ? { text: 'TAKE', color: '#c8d0f0', t: 1, sub: '' }
    : { text: why === 'foul' ? 'FOUL' : 'WHIFF', color: '#ff6a5a', t: 1.3, sub: 'OUT ' + R.outs + ' OF ' + BZ.TUNE.derbyOuts };
  BZ.sfx(why === 'foul' ? 'foul' : why === 'take' ? 'ball' : 'strike');
  R.swung = true;
  BZ.derbyEnd(D, R, 1.5);
};

// A ball is over: a home run, a fair hit (its feet are its landing spot's), or a foul.
BZ.derbyResult = (game, D, R) => {
  const b = R.ball, kind = BZ.ballResult(b), p = R.p;
  if (kind === 'foul' || kind === 'air') {
    R.outs++; p.outs++;
    R.stamp = { text: 'FOUL', color: '#ff6a5a', t: 1.5, sub: 'OUT ' + R.outs + ' OF ' + BZ.TUNE.derbyOuts };
    BZ.sfx('foul');
  } else {
    const feet = Math.round(b.landDist);
    p.hits++; p.score += feet;
    if (kind === 'hr') { p.hr++; BZ.sfx('fanfare'); BZ.sfx('cheer'); }
    else BZ.sfx('cheer', { vol: .5 });
    if (feet > p.longest) p.longest = feet;
    D.meter = Math.min(100, D.meter + Math.min(40, feet / 12) * (BZ.TUNE.meterGain / 35));
    const label = kind === 'hr' ? 'HOME RUN' : feet >= 300 ? 'TRIPLE' : feet >= 240 ? 'DOUBLE' : 'SINGLE';
    R.stamp = { text: label, color: kind === 'hr' ? '#ffb020' : '#ffe6a0', t: 1.9, sub: feet + ' FT' + (b.batzooka ? ' · BATZOOKA' : '') };
    if (kind === 'hr') { BZ.say(BZ.talk, 'hr'); if (BZ.game) BZ.game.particles.explosion(b.x, b.y, 4, 1.2); }
  }
  R.last = { kind, feet: kind === 'foul' ? 0 : Math.round(b.landDist) };
  BZ.derbyEnd(D, R, 1.9);
};

// The pause after a pitch's result: then the next pitch, or the end of the round.
BZ.derbyEnd = (D, R, secs) => {
  R.ended = true; R.afterT = secs; R.ball = null; R.plan = null; R.pitchPos = null;
};

// After the pause: the round ends at the outs or the clock; otherwise the next pitch.
BZ.derbyAfter = (game, D) => {
  const R = D.round;
  R.ended = false;
  if (R.outs >= BZ.TUNE.derbyOuts || BZ.derbyTimeLeft(D) <= 0) { BZ.derbyEndRound(game, D); return; }
  BZ.derbyNewPitch(D);
};

// The round is over: the player's total is kept. Hot seat: the next player, or the table. A hub round goes to its end.
BZ.derbyEndRound = (game, D) => {
  const p = D.players[D.cur];
  p.done = true;
  D.round = null;
  if (D.hub) { BZ.hubDerbyEnd(game, D); return; }
  if (D.cur + 1 < D.players.length) { D.cur++; D.phase = 'intro'; D.afterT = 2.4; D.clock = 0; return; }
  D.finished = true;
  const table = BZ.derbyTable(D);
  game.go('derbyResults', { table });
};

// The best scores kept between visits (the top five), and this run's table, best first.
BZ.derbyTable = D => {
  const mine = D.players.map(p => ({ name: p.name, color: p.color, score: p.score, hr: p.hr, longest: p.longest, outs: p.outs }));
  const all = E.store.get('batz-derby', []).concat(mine.map(m => Object.assign({ when: Date.now() }, m)));
  E.store.set('batz-derby', all.sort((a, b) => b.score - a.score).slice(0, 5));
  return mine.sort((a, b) => b.score - a.score);
};

// The draw: the plate, with the pitch; or the field, with the ball in flight.
BZ.derbyDraw = (r, D) => {
  if (!D) return;
  const W = r.W, H = r.H, R = D.round, park = BZ.PARKS[BZ.park];
  if (D.hub && BZ.hubDraw(r, D)) return;
  if (R && R.ball) {
    BZ.drawFieldBase(r);
    r.shadow(R.ball.x, R.ball.y, 4, .45, undefined, 0);
    r.sprite(R.ball.x, R.ball.y, R.ball.z + 4, BZ.BALL_SPR, { glow: .3 });
  } else {
    r.sky(park.night ? ['#060818', '#2a2a5a'] : park.sky);
    r.overlay(g => {
      BZ.drawPlateGround(g, W, H, park);
      BZ.drawZone(g, W, H);
      BZ.drawPlatePlayers(g, W, H, { view: r.view, pitcher: D.rigs.far, batter: D.rigs.batter });
      if (R && R.plan && R.pitchPos) BZ.drawPitchBall(g, W, H, R.plan, Math.min(1, R.pt / R.plan.time), []);
      if (R && R.plan && !R.swung) BZ.drawBatterReticle(g, W, H, { reticle: R.reticle });
      if (R) BZ.drawBat(g, W, H, { swing: R.swung ? 1 : 0, reticle: R.reticle });
    });
  }
  r.overlay(g => BZ.drawDerbyHud(g, r, D));
};

BZ.drawDerbyHud = (g, r, D) => {
  const W = r.W, H = r.H, R = D.round, p = D.players[D.cur];
  if (p) {
    E.ui.box(g, 16, 16, 280, 58, { bg: ['#1a1d2a', '#0b0d16'], border: '#c8a060', alpha: .9 });
    BZ.text(g, p.name + '   ' + p.score + ' FT', 26, 24, '#ffe6a0', { scale: 1.8 });
    BZ.text(g, 'OUTS ' + (R ? R.outs : 0) + ' OF ' + BZ.TUNE.derbyOuts + '    HR ' + p.hr + '    LONGEST ' + p.longest + ' FT', 26, 52, '#c8d0f0', { scale: 1.1 });
  }
  const left = Math.ceil(BZ.derbyTimeLeft(D));
  BZ.text(g, Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), W - 26, 22, '#ffffff', { align: 'right', scale: 2.4 });
  BZ.drawBatzookaMeter(g, W - 178, H - 40, 150, D.meter, 'BATZOOKA', D.meter >= 100);
  if (R && R.stamp) BZ.drawStamp(g, W, H, R.stamp, R.stamp.color, R.stamp.sub);
  if (R && R.plan && !R.swung && p && p.input) {
    const line = BZ.prompt('confirm', 'SWING') + '   STICK AIMS THE BAT   ' + BZ.prompt('power', 'BATZOOKA WHEN FULL');
    const w = line.length * 6.4 + 28;
    E.ui.box(g, W / 2 - w / 2, H - 26, w, 20, { bg: ['#101420', '#060810'], border: '#c8a060', alpha: .85 });
    BZ.text(g, line, W / 2, H - 20, '#ffffff', { align: 'center', scale: 1.2, shadow: null });
  }
  if (D.hub && BZ.hubDrawGhosts) BZ.hubDrawGhosts(g, r, D);
};

// Setup: players join with Start (up to four), and the first player's ✕ begins.
BZ.derbySetupScene = {
  enter() { BZ.game.allowJoin({ max: 4 }); },
  exit() { BZ.game.allowJoin(false); },
  update() {
    const game = BZ.game, I = game.input;
    if (I.pressed('cancel')) { game.go('title'); return; }
    if (I.pressed('confirm')) {
      const players = game.players.map((inp, i) => ({ name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], input: inp }));
      BZ.D = BZ.newDerby(players, 'local');
      game.go('derby');
    }
  },
  draw(r) {
    const W = r.W, H = r.H, n = BZ.game.players.length;
    r.sky(['#101848', '#402a70']);
    r.overlay(g => {
      E.font.title(g, 'HOME RUN DERBY', W / 2, H * .16, { scale: 2, align: 'center' });
      BZ.text(g, 'ONE TO FOUR PLAYERS, IN TURNS. OUTS END THE TURN.', W / 2, H * .36, '#ffe6a0', { align: 'center', scale: 1.4 });
      for (let i = 0; i < 4; i++) {
        const joined = i < n;
        BZ.text(g, 'P' + (i + 1) + (joined ? '  READY' : '  PRESS START TO JOIN'), W / 2, H * .46 + i * 24, joined ? '#ffffff' : '#7a7aa0', { align: 'center', scale: 1.5 });
      }
      BZ.text(g, BZ.prompt('confirm', 'BEGIN') + '      ' + BZ.prompt('cancel', 'BACK'), W / 2, H * .86, '#ffffff', { align: 'center', scale: 1.6 });
    });
  }
};

// The derby's results: the table of this run, and the way on.
BZ.derbyResultsScene = {
  enter(data) { BZ.resultsData = data; BZ.playSong('results'); },
  exit() { BZ.playSong(null); },
  update() {
    const I = BZ.game.input;
    if (I.pressed('confirm')) BZ.game.go('derbySetup');
    if (I.pressed('cancel')) BZ.game.go('title');
  },
  draw(r) {
    const W = r.W, H = r.H, table = (BZ.resultsData && BZ.resultsData.table) || [];
    r.sky(['#101848', '#402a70']);
    r.overlay(g => {
      E.font.title(g, 'DERBY OVER', W / 2, H * .12, { scale: 2, align: 'center' });
      table.forEach((p, i) => {
        BZ.text(g, (i + 1) + '.  ' + p.name, W * .3, H * .3 + i * 40, '#ffffff', { scale: 1.8 });
        BZ.text(g, p.score + ' FT', W * .7, H * .3 + i * 40, '#ffe6a0', { scale: 1.8, align: 'right' });
        BZ.text(g, 'HR ' + p.hr + '    LONGEST ' + p.longest + ' FT', W * .3, H * .3 + i * 40 + 18, '#c8d0f0', { scale: 1.1 });
      });
      BZ.text(g, BZ.prompt('confirm', 'AGAIN') + '      ' + BZ.prompt('cancel', 'TITLE'), W / 2, H * .86, '#ffffff', { align: 'center', scale: 1.6 });
    });
  }
};
