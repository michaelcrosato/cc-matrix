// ---------------------------------------------------------------------------------------------------------------------
// AI HUB (parallel mode), the attract-mode bot, the debug handle, and the start
// ---------------------------------------------------------------------------------------------------------------------
const hub = { info: null, started: false, ended: false, reported: false, acc: 0, standalone: false };
function hubLive() { return !IN_SESSION || hub.standalone || (hub.started && !hub.ended && HUB.time() >= 0); }
function hubTick(dt) {
  hub.acc += dt;
  if (hub.acc >= 1) { hub.acc = 0; try { HUB.progress({ score: computeScore(), label: fmtTime(S.min) + ' · ' + cardCount() + ' cards' }); } catch (e) { /* hub gone */ } }
}
function reportResult() {
  if (!IN_SESSION || hub.reported || hub.standalone) return;
  hub.reported = true; S.score = computeScore();
  const awards = [];
  if (S.ending === 'handshake') awards.push({ title: 'The Handshake', detail: 'Won the account and kept your conscience' });
  if (S.ending === 'account') awards.push({ title: 'The Account', detail: 'Won the account the shiny way' });
  if (cardCount() === 5) awards.push({ title: 'Completionist', detail: 'Found all five cards' });
  try { HUB.result({ score: S.score, stats: { 'Ending': S.ending || 'unfinished', 'Interest': S.interest, 'Cards': cardCount(), 'Haze': S.stats.haze }, awards }); } catch (e) { /* hub gone */ }
}
if (IN_SESSION) {
  HUB.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    hub.info = info; if (!info) hub.standalone = true;
    HUB.ready();
  }).catch(() => { hub.standalone = true; });
  HUB.on('start', () => { hub.started = true; });
  HUB.on('time-up', () => { reportResult(); });
  HUB.on('end', () => { hub.ended = true; try { game.audio.mute(true); } catch (e) { /* ok */ } });
}

// ---- attract mode: a bot that plays the day, and cheats freely -----------------------------------------------------------------
const bot = { i: 0, wait: 0, goal: null, flow: null, tapAt: -9, picks: [], tab: 0, tabT: 0, noteDone: false };
const BOT_PLAN = [
  { go: 'hollis', picks: [2] }, { go: 'lorraine', picks: [1] }, { go: 'dot', picks: [0, 0] }, { go: 'files' }, { go: 'walt', picks: [0] },
  { go: 'teddy', picks: [1] }, { note: true }, { go: 'bar', picks: [0] }, { go: 'phone', picks: [0, 0] }, { go: 'type', lead: 'family', close: 'truth' },
  { until: 12 * 60 + 40 }, { go: 'smoke', picks: [0] }, { go: 'hollis', picks: [0] }, { go: 'arrive' }, { go: 'garland' }, { pitch: true }
];
function botStart() { bot.i = 0; bot.wait = 1.4; bot.goal = null; bot.picks = []; bot.noteDone = false; ctl.attractLoop = true; bot.tapAt = -9; }
function botTap(a) { bot.tapAt = game.time; I.tap(a); }
function attractInterrupt() {
  const m = I.move(), p = I.pointer();
  const moved = p && stepTimer.lastPtr && (Math.abs(p[0] - stepTimer.lastPtr[0]) + Math.abs(p[1] - stepTimer.lastPtr[1])) > 3;
  stepTimer.lastPtr = p ? p.slice() : null;
  if ((I.anyPressed() && game.time - bot.tapAt > .12) || Math.hypot(m[0], m[1]) > .1 || I.clicked() || moved) { ctl.attractLoop = false; ctl.attract = false; game.go('title'); return true; }
  return false;
}
function botTarget(id) { return targets().find(t => t.id === id); }
function botUpdate(dt) {
  const step = BOT_PLAN[bot.i]; bot.wait -= dt;
  // a dialog is open: read it at a human pace, and answer
  if (talk.open) {
    if (bot.wait <= 0) {
      if (talk.typing) { botTap('confirm'); bot.wait = .3; }
      else if (talk.choices) { talk.choice = clamp(bot.picks.length ? bot.picks.shift() : 0, 0, talk.choices.length - 1); botTap('confirm'); bot.wait = .9; }
      else { botTap('confirm'); bot.wait = 1.0; }
    }
    return;
  }
  if (S.mode === 'note') {
    bot.tabT += dt; if (bot.tabT > 1.3) { bot.tabT = 0; bot.tab++; if (bot.tab > 3) { closeNotebook(); bot.noteDone = true; bot.i++; } else NB.tab = bot.tab; }
    return;
  }
  if (S.mode === 'type') {
    if (bot.wait > 0) return;
    if (TY.phase === 'lead' || TY.phase === 'close') {
      const want = TY.phase === 'lead' ? step.lead : step.close, k = TY.opts.indexOf(want);
      TY.sel = k >= 0 ? k : 0; botTap('confirm'); bot.wait = .6;
    } else if (TY.phase === 'strike' && TY.meter && !TY.meter.done && Math.abs(TY.meter.pos - TY.meter.center) < .03) { botTap('confirm'); bot.wait = .1; }
    else if (TY.phase === 'read') { botTap('confirm'); bot.wait = .6; bot.i++; }
    return;
  }
  if (S.mode === 'pitch') {
    if (bot.wait > 0) return;
    if (PT.phase === 'pick') {
      let best = 0, ba = -999; PT.hand.forEach((id, i) => { const a = cardAff(id); if (a > ba) { ba = a; best = i; } });
      PT.sel = best; botTap('confirm'); bot.wait = .8;
    } else if (PT.phase === 'deliver' && PT.meter && !PT.meter.done && Math.abs(PT.meter.pos - PT.meter.center) < .025) { botTap('confirm'); bot.wait = .1; }
    return;
  }
  if (S.mode === 'ending') return;
  if (S.mode !== 'walk' || bot.wait > 0 || !step) return;
  if (step.until) { if (S.min < step.until) addTime(S.min + 30 < step.until ? 30 : step.until - S.min); bot.i++; return; }
  if (step.note) { bot.tab = 0; bot.tabT = 0; openNotebook(); return; }
  if (step.pitch) { if (!S.flags.pitchStarted) startPitch(); bot.i++; return; }
  if (step.go === 'arrive') { if (S.min < MIN_ARRIVE) addTime(MIN_ARRIVE - S.min); bot.i++; bot.wait = .2; return; }
  const t = botTarget(step.go); if (!t) { bot.i++; return; }
  if (step.go === 'hollis' && S.flags.briefed && S.min >= 12 * 60 + 30 && npcs.hollis.moving) { bot.wait = .5; return; }
  const g = t.kind === 'npc' ? [t.x, t.y] : t.stand;
  const d = Math.hypot(g[0] - hero.x, g[1] - hero.y);
  if (d < (t.kind === 'npc' ? 22 : 6)) {
    hero.vx = hero.vy = 0; hero.facing = dirTo(hero, t); bot.picks = (step.picks || []).slice(); bot.i++; bot.wait = .7; interactWith(t); return;
  }
  bot.flow = bot.flow || new E.FlowField(map); bot.flow.update(g[0], g[1]);
  const dd = bot.flow.dir(hero.x, hero.y, g[0], g[1]); hero.vx = dd[0] * 110; hero.vy = dd[1] * 110; hero.update(dt, map);
  if (Math.hypot(dd[0], dd[1]) > .1) hero.facing = Math.atan2(dd[1], dd[0]);
}

// ---- a handle for tests and tools ----------------------------------------------------------------------------------------------
game.debug = {
  snapshot: () => ({ scene: game.sceneName, mode: S.mode, min: S.min, stats: Object.assign({}, S.stats), rel: Object.assign({}, S.rel), cards: Object.keys(S.cards), items: Object.keys(S.items), tagline: S.tagline && S.tagline.text, interest: S.interest, ending: S.ending, score: S.score, hero: [Math.round(hero.x), Math.round(hero.y)], flags: Object.assign({}, S.flags), talk: talk.open, attract: ctl.attract, phase: PT.phase }),
  S: () => S, hero, npcs, map, talk, ctl, TY, PT, NB, AXIS, DEV, T, THEMES,
  teleport(x, y) { hero.x = x; hero.y = y; hero.vx = hero.vy = 0; },
  interact: id => { const t = targets().find(q => q.id === id); if (t) interactWith(t); return !!t; },
  runNode, startPitch, openTypewriter, openNotebook, closeNotebook, addTime, applyFx, computeScore, decideEnding, cardAff, gradeDelta, touchOnly, flipPad, snapshotState: snapshot, restoreState: restore, newGame, giveCard, hubLive, reportResult, cardCount, objective, fmtTime
};
game.start({ scenes: { title, play, end, about }, scene: IN_SESSION ? 'play' : 'title' });
})();
