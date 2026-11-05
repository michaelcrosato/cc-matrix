/* MASH TV — 13-flow: the whole run as one generator (game.script): the cold open, the episode cards, the rooms and their map
 * cards, the boss rooms, the recap, continue, game over, the Green Room, the two endings, the initials and the credits.
 * The play scene (below) only ticks the World; the flow decides what happens next. */

MT.PLAY.lineWait = () => !MT.lineNow && MT.lines.length === 0;
MT.anyConfirm = () => MT.G && (MT.G.players || [MT.G.input]).some(p => p.pressed('confirm') || p.pressed('start') || p.clicked && p.clicked());
// say the lines of a list in order, each for its own time (the babble sets it); confirm skips a line
MT.sayAll = function* (list, speaker) {
  for (const item of list) {
    const [who, text] = Array.isArray(item) ? item : [speaker || 'LANCE', item];
    MT.say(who, text, { prio: 5 });
  }
  yield E.until(MT.PLAY.lineWait);
};
// a card: a static wipe, the title in the broadcast type, and a line; confirm skips it
MT.cardWait = function* (title, sub, line, sec = 2.8, sting) {
  MT.PLAY.card = { title, sub, line, t: 0, sec };
  if (sting) MT.music(sting);
  MT.sfx('static');
  yield E.any([sec, () => MT.anyConfirm()]);
  MT.PLAY.card = null;
};

MT.spawnWorld = (G, run, roomId, entry) => {
  const S = MT.PLAY, players = MT.makeContestants(run, null);
  const W = new World(run, roomId, { entry, players });
  for (const c of players) if (c.state !== 'out') { c.W = W; }
  S.W = W; S.holdWorld = false; S.cutting = false;
  return W;
};

// the flow for one run. Each room: spawn, wait for its end, and go on by the door walked through.
MT.flow = function* (G, run, o = {}) {
  const S = MT.PLAY;
  S.holdWorld = true;
  if (!o.skipCold) yield* MT.coldOpen(G);
  for (let ep = o.startEp || 1; ep <= 3; ep++) {
    run.ep = ep;
    const E1 = MT.EPISODES[ep - 1];
    MT.music(null);
    if (!(o.skipCard && ep === (o.startEp || 1)) && !o.room) {
      const c = MT.cards[ep] || [];
      yield* MT.cardWait('EPISODE ' + ep, E1.title, c[2], 3.4, 'theme');
      yield* MT.sayAll([['LANCE', (MT.TEXT.cards[ep] || [])[2]]]);
    }
    let roomId = (ep === (o.startEp || 1) && o.room) || MT.startRoom(ep), entry = 'S';
    while (true) {
      const set = MT.ROOMS[roomId].set; MT.music(E1.song);
      const W = MT.spawnWorld(G, run, roomId, entry);
      MT.roomArrive(G, W);
      // the room runs until it ends: the exit taken, the boss dead, or everyone out
      while (true) {
        yield E.until(() => W.phase === 'left' || W.bossOver || (MT.allOut(run) && !W.bossOver));
        if (MT.allOut(run) && W.phase !== 'left' && !W.bossOver) {
          // all out: the CONTINUE countdown, then the room restarts with its lives back
          const ok = yield* MT.continueFlow(G, run);
          if (!ok) { yield* MT.gameOver(G, run, ep); return; }
          for (const p of run.players) if (p.c) p.c.continueOn(W);
          continue;
        }
        break;
      }
      if (W.bossOver) { yield* MT.bossDefeat(G, run, ep, W); break; }
      const d = W.leaveDoor || 'N', to = W.leaveTo;
      if (!to) { roomId = MT.startRoom(ep); entry = 'S'; continue; }
      // the NEXT ON MASH TV card, then the walk through the door to the next room
      S.holdWorld = true; S.mapCard = { ep, roomId: to, t: 0 }; MT.sfx('static');
      yield E.any([2.5, () => MT.anyConfirm()]);
      S.mapCard = null; S.holdWorld = false;
      roomId = to; entry = MT.OPP[d];
    }
    if (MT.PLAY.recap) MT.PLAY.recap = null;
  }
  // after episode three: the Green Room, or the first ending
  const keys = run.keys;
  if (keys >= 5) yield* MT.greenRoom(G, run); else yield* MT.endingA(G, run);
  yield* MT.credits(G, run);
  MT.finishRun(G, run);
};
// the first room of an episode, and the start of an arrival: the play scene shows what the room says
MT.startRoom = (ep) => MT.startRoomId(ep);
MT.startRoomId = (ep) => `${ep}-1`;
MT.roomArrive = (G, W) => {
  MT.PLAY.stage = 'room:' + W.id;
  if (W.R.type === 'boss' || W.R.id === '1-1') { /* the lines come from the room's own script */ }
  MT.lineFrom('roomStart', 1);
  MT.banner(W.R.name, '#ffcc33', 2.2);
  if (W.R.tutorial) MT.PLAY.tutor = 0;
  if (W.R.id === '1-1') MT.hintOnce('move');
};
MT.hintOnce = (k) => { const run = MT.run; if (!run) return; run.hints = run.hints || {}; if (run.hints[k]) return; run.hints[k] = 1; MT.say('ANNC', MT.TEXT.hints[k] || '', { prio: 1 }); };
MT.cards = MT.TEXT.cards;

// the cold open (§8.1): the studio's dark, the logo, the contestants' one-liners, the FCC line, the title
MT.coldOpen = function* (G) {
  const S = MT.PLAY;
  S.cold = true; S.holdWorld = true; MT.music('theme');
  yield 1.2;
  MT.banner('MASH TV', '#ff2e88', 2.6); MT.sfx('applause'); MT.babble.crowd('applause', .8);
  yield* MT.sayAll(MT.TEXT.coldOpen.map(([who, t]) => [who, MT.fill(t, { N: MT.run.players.length })]));
  for (const p of MT.run.players) { const c = p.c; if (c) MT.say('LANCE', MT.TEXT.look[p.slot], { prio: 5 }); }
  yield E.until(MT.PLAY.lineWait);
  S.cold = false;
};

// a boss room: the intro lines, then the boss's own script runs
MT.bossDefeat = function* (G, run, ep, W) {
  const S = MT.PLAY;
  S.holdWorld = true;
  yield* MT.sayAll(MT.TEXT.bossLine.mashyDown ? [['LANCE', W.boss.kind === 'mashy' ? MT.TEXT.bossLine.mashyDown : W.boss.kind === 'wheel' ? MT.TEXT.bossLine.wheelDown : 'LANCE WAS A ROBOT ALL ALONG!']] : []);
  yield 2.5;
  yield* MT.recap(G, run, ep);
};
MT.recap = function* (G, run, ep) {
  const S = MT.PLAY, E1 = MT.EPISODES[ep - 1];
  MT.music('recap');
  S.recap = { ep, t: 0, rows: run.players.map(p => p.c).filter(Boolean) };
  MT.say('PENNY', MT.TEXT.recapIntro, { prio: 5 });
  for (const c of S.recap.rows) for (const pr of c.prizes) MT.say('PENNY', pr[2], { prio: 2 });
  yield E.any([18, () => MT.anyConfirm() && MT.PLAY.lineWait()]);
  S.recap = null;
  MT.say('LANCE', MT.TEXT.recapOutro, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  S.holdWorld = false;
};
MT.continueFlow = function* (G, run) {
  const hold = { res: null };
  MT.cab.continue(10, ok => { hold.res = ok; });
  MT.say('LANCE', MT.TEXT.continueLine, { prio: 5 });
  yield E.until(() => hold.res !== null);
  return hold.res;
};
MT.gameOver = function* (G, run, ep) {
  MT.music('ending');
  MT.sfx('lose');
  for (const line of MT.TEXT.gameOver) MT.say('LANCE', line, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  yield 1;
  MT.toScene(G, 'gameover', { ep });
};
MT.greenRoom = function* (G, run) {   // §7.4: 40 s, cash and boxes from the ceiling, paparazzi, the statuette at 30 s
  const S = MT.PLAY;
  MT.music('recap');
  yield* MT.cardWait('THE GREEN ROOM', 'THE NETWORK\'S SECRET BONUS', MT.TEXT.greenIntro, 3.2, 'recap');
  const W = MT.spawnWorld(G, run, 'greenroom', 'S');
  W.phase = 'bonus'; W.bonusT = 0; W.bonusWon = false;
  W.tasks.push(MT.task((function* () { for (let k = 0; k < 120; k++) { yield .25; const [x, y] = W.randomFreePoint(); if (W.pickups.length < 40) W.pickups.push(W.mkPickup(k % 3 ? 'bill' : 'stack', x, y)); if (k % 4 === 0 && W.pickups.length < 40) W.pickups.push(W.mkPickup('prize', x, y)); } })()));
  W.tasks.push(MT.task((function* () { yield 30; W.pickups.push(W.mkPickup('statuette', 184, 120)); })()));
  for (let i = 0; i < 6; i++) W.spawnEnemy('paparazzo', MT.rand(60, 300), MT.rand(50, 190), { counted: false });
  yield E.until(() => W.bonusWon || W.bonusT >= 40);
  MT.say('PENNY', W.bonusWon ? MT.TEXT.prize : 'NOTHING! THE NETWORK KEEPS IT ALL!', { prio: 4 });
  yield E.until(MT.PLAY.lineWait);
  yield* MT.endingB(G, run);
};
MT.endingA = function* (G, run) {
  MT.music('ending');
  MT.say('PENNY', MT.TEXT.endingA[0], { prio: 5 });
  MT.say('LANCE', MT.TEXT.endingANext, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  yield* MT.cardWait('MASH TV WILL RETURN.', 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM', '', 4.2);
};
MT.endingB = function* (G, run) {
  MT.music('ending');
  for (const l of MT.TEXT.endingB) MT.say('ANNC', l, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  yield* MT.cardWait('MASH TV - CANCELLED.', 'THANKS FOR WATCHING.', 'CHANNEL 3,000: TONIGHT: MASHED POTATOES!', 4.2);
};
MT.credits = function* (G, run) {
  MT.music('ending');
  MT.PLAY.credits = { t: 0 };
  yield E.any([24, () => MT.anyConfirm()]);
  MT.PLAY.credits = null;
};
// the high-score entry: each qualifying contestant enters initials on their own input (patch P3)
MT.finishRun = (G, run) => {
  const order = run.players.map(p => p.c).filter(Boolean).sort((a, b) => b.cash - a.cash);
  const next = () => {
    const c = order.shift();
    if (!c) { MT.toScene(G, 'scores', { fromRun: true }); return; }
    if (run.mode !== 'arcade' || run.devTouched || !MT.cab.qualifies(c.cash, '')) return next();
    MT.cab.enter(c.cash, '', () => { MT.cab.clear(); next(); }, c.input || G.input);
  };
  next();
};
MT.toScene = (G, name, data) => { MT.PLAY.stop = true; G.go(name, data, { fade: 'black' }); };
