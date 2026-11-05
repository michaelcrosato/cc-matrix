/* ---- THE MATCH SCENE: the match running on the screen. It feeds the human inputs into the simulation, steps it, turns
 * its events into callouts, commentary, sound and camera, and draws the pitch, the players and the HUD. Every match
 * mode (Story, Quick Match, Versus, Nets, the Showdown, the hub round and the attract showreel) runs here. ---- */
G.startMatch = (cfg, opts = {}) => {
  G.cfg = cfg;
  G.match = new G.Match(cfg);
  G.frameRing = []; G.lastRec = -1;
  if (cfg.startHype) G.match.hype = cfg.startHype.slice();   // a lesson may start with a full meter
  G.matchOpts = opts;
  G.callouts = [];
  G.timing = null;
  G.swingPose = null;
  G.swingState = null;
  G.marker = { x: G.W.PX, y: G.W.BAT_CREASE + 70 };
  G.aimHeld = null;
  G.lastCfg = cfg;
  G.game.go('match', null, { fade: 'black', seconds: 0.25 });
};

G.say = (tag, vars) => {
  const pool = G.LINES[tag];
  if (!pool || G.devFlags.muteCommentary) return;
  const voices = [['A', pool.A], ['D', pool.D]].filter(([, l]) => l && l.length);
  if (!voices.length) return;
  const [who, lines] = voices[Math.floor(G.rng.cosmetic() * voices.length)];
  const text = G.fill(lines[Math.floor(G.rng.cosmetic() * lines.length)], vars || {});
  if (G.setting('captions') === 'On') G.talk && G.talk.say(text, { name: who === 'A' ? 'SIR AUBREY' : 'DAZZA', auto: 3, modal: false, alpha: .85, place: 'top', y: 40 });
  G.voice && G.voice.say(text, who === 'A' ? 'aubrey' : 'dazza');
};
G.fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? String(v[k]) : m));
G.callout = (text, color, secs = 0.9) => { G.callouts.unshift({ text, color, t: secs, max: secs }); if (G.callouts.length > 3) G.callouts.length = 3; };

G.matchNames = () => {
  const m = G.match, cfg = m.cfg;
  const a = G.TEAMS[cfg.teams[0]], b = G.TEAMS[cfg.teams[1]];
  return { a, b };
};

/* ---- the scene ---- */
G.scenes = G.scenes || {};
G.scenes.match = {
  pausable: true,
  view: 'broadcast',
  enter() {
    G.game.lights.enabled = true;
    G.game.lights.ambient = G.mapGround ? G.match.ground.ambient : 0.9;
    G.game.lights.dark = [18, 22, 40];
    G.game.lights.refresh && G.game.lights.refresh();
    G.game.setView(G.view);
    G.game.cam.smooth = 0.18;
    G.game.cam.bounds = null;
    G.game.cam.zoomLimit = null;
    G.makeWorld();
    G.game.audio.music(G.SONG_MATCH, { loop: true });
    G.talk = G.talk || new E.Dialog(G.game, { lines: 2, place: 'bottom', border: '#e8c070', speed: 60 });
    G.voice && G.voice.resume && G.voice.resume();
    G.match.cfg.onStart && G.match.cfg.onStart(G.match);
    G.game.debug = G.debugHandle;
    G.say('start', { ground: G.match.ground.name, team: G.TEAMS[G.match.cfg.teams[0]].name });
  },
  exit() {
    G.game.audio.music(null);
    G.game.lights.enabled = false;
    G.talk && G.talk.close && G.talk.close();
  },
  update(dt) {
    const m = G.match;
    const I = G.game.input;
    if (!m) return;
    // the dev panel takes the controls while it is open
    if (G.dev && G.dev.open) { G.dev.update(dt); return; }
    if (G.talk && G.talk.update(dt)) return;   // a modal line holds play
    if (G.matchOpts.attract) G.attractInput(I);
    const step = dt * G.T('timeScale');
    if (G.hubRound && G.hubRound.frozen) return;
    G.tickThirdUmpire(dt);
    if (G.replayTick(dt)) { G.drainEvents(); return; }   // the replay holds the play still
    G.humanInput(I, step);
    G.tickRigs(dt, m);
    G.recordFrame(m);
    // the simulation runs in fixed steps, scaled by the game speed and the slow-motion of a big moment
    const slow = G.slowT > 0 ? 0.35 : 1;
    if (G.slowT > 0) G.slowT -= dt;
    if (G.rainWait > 0) G.rainWait -= dt;
    if (m.phase !== 'end') m.update(step * slow);
    G.drainEvents();
    G.updateFx(dt);
    G.devApply();
    G.cameraFor(dt);
    if (m.phase === 'end') { if (!G.endQueued) { G.endQueued = true; G.endMatch(); } }
    if (G.matchOpts.onUpdate) G.matchOpts.onUpdate(dt);
  },
  draw(r) {
    const m = G.match;
    if (!m) return;
    r.sky(m.ground.sky);
    G.drawSky(r, m);
    if (G.replay) { r.sky(m.ground.sky); G.map.drawFloor(r); G.drawReplayFrame(r, G.replay); G.drawThirdUmpire(r); return; }
    G.map.drawFloor(r);
    G.drawTide(r, m);
    G.drawSightscreen(r);
    G.drawScenery(r, m);
    G.drawStumps(r, G.W.SY);
    G.drawStumps(r, G.W.BY);
    G.drawCrowd(r, m, G.game.time);
    G.drawTargets(r, m);
    G.drawItems(r, m);
    G.drawChaos(r, m);
    G.drawPeacock(r, m);
    G.drawNightLights(r, m);
    G.drawPlayers(r, m);
    G.drawMarker(r, m);
    G.ballFx(r, m);
    G.drawTrajectory(r, m);
    G.drawCatchRing(r, m);
    G.drawFireworks(r);
    G.drawFog(r, m);
    G.drawOwlEye(r, m);
    G.drawThirdUmpire(r);
    G.drawHUD(r, m);
    G.drawCallouts(r);
    if (G.talk) G.talk.draw(r);
    if (G.dev && G.dev.open) G.dev.draw(r);
    if (G.matchOpts.attract) G.attractDraw(r);
  }
};

/* ---- the human inputs: the batter, the non-striker's run calls, the bowler's marker and meter, the fielder's moves and throws ---- */
// the players on each side. Player 1 is Kerfuffle's first; in a 2 v 2 the second joined player is the Gentlemen's...
// (layout '1v1': P1 and P2 face each other; '2v2': P1 and P3 are side 0, P2 and P4 side 1; 'coop': P1 and P2 are side 0)
G.humansOf = side => {
  const P = G.game.players || [G.game.input];
  const L = G.layout || '1v1';
  if (P.length === 1) return [P[0]];   // one player takes whichever side the match makes human
  if (L === 'coop') return side === 0 ? P.slice(0, 2) : [];
  if (L === '2v2') return side === 0 ? [P[0], P[2]].filter(Boolean) : [P[1], P[3]].filter(Boolean);
  return side === 0 ? [P[0]] : (P[1] ? [P[1]] : []);
};
G.humanInput = (I, dt) => {
  const m = G.match;
  if (!m || m.phase === 'end') return;
  const hb = G.humansOf(m.battingSide), hw = G.humansOf(m.bowlingSide);
  const batter = m.humanBats() && hb.length ? hb[0] : null;
  const runner = m.humanBats() && hb.length > 1 ? hb[1] : null;      // the non-striker calls for runs too
  const bowler = m.humanBowls() && hw.length ? hw[m.I.over % hw.length] : null;
  const fielder = m.humanFields() && hw.length ? (hw.length > 1 ? hw[(m.I.over + 1) % hw.length] : hw[0]) : null;
  // the stick: the batter's aim (a batter-frame angle), the bowler's marker, or the fielder's steering
  const mg = G.game.mouseGround && G.game.mouseGround();
  if (batter) {
    const mv = batter.move();
    let aim = null;
    if (mg && G.game.input.mouse && G.mouseMoved(G.game.input)) {
      const sx = G.W.PX + 8, sy = G.W.BAT_CREASE;
      const dx = mg[0] - sx, dy = mg[1] - sy;
      if (Math.hypot(dx, dy) > 12) aim = Math.atan2(-dx * m.handOf(m.striker), dy) * 180 / PI;
    } else if (Math.hypot(mv[0], mv[1]) > 0.35) {
      const d = G.game.view.screenDirToGround(mv[0], mv[1]);
      aim = Math.atan2(-d[0] * m.handOf(m.striker), d[1]) * 180 / PI;
    }
    G.aimHeld = aim;
    if (m.phase === 'flight' && !m.pressed && !m.missed) {
      if (batter.pressed('shot')) m.batPress('shot', aim, null);
      else if (batter.pressed('loft')) m.batPress('loft', aim, null);
      else if (batter.pressed('block')) m.batPress('block', null, null);
      else if (batter.pressed('special') && m.hype[m.battingSide] >= 100) {
        // the striker's own special, or the Kerfuffle Shot for a player without one
        const sp = m.batSpecialOf(m.striker) || 'kfShot';
        m.spendHype(m.battingSide);
        m.batPress('loft', aim, sp);
        G.callout(G.SPECIALS[sp].name, '#ffd23a', 1.0);
      }
      if (batter.pressed('charge')) m.charge();
    }
    if (batter.pressed('run') && m.throwing) m.dive();
    if (batter.pressed('run')) m.callRun();
  }
  if (runner && runner.pressed('run')) m.callRun();
  if (bowler && m.phase === 'setup' && bowler.pressed('run')) {
    // R1 cycles the field: attacking, balanced, defensive, spin
    const k = G.PRESET_ORDER.indexOf(m.preset);
    m.preset = G.PRESET_ORDER[(k + 1) % G.PRESET_ORDER.length];
    m.placeFielders();
    G.callout(G.PRESET_LABEL[m.preset], '#ffe08a', 1.0);
  }
  if (bowler && m.phase === 'setup') {
    const mv = bowler.move();
    // the marker follows the stick (the mouse on the pitch wins while it moves)
    const mk = G.marker;
    if (mg && G.mouseMoved(G.game.input) && mg[1] > G.W.BAT_CREASE && mg[1] < G.W.BOWL_CREASE) { mk.x = clamp(mg[0], G.W.PX - 34, G.W.PX + 34); mk.y = clamp(mg[1], G.W.BAT_CREASE + 10, G.W.BOWL_CREASE - 12); }
    else { mk.x = clamp(mk.x + mv[0] * 60 * dt, G.W.PX - 34, G.W.PX + 34); mk.y = clamp(mk.y + mv[1] * 80 * dt, G.W.BAT_CREASE + 10, G.W.BOWL_CREASE - 12); }
    const fam = m.familyOf(m.I.bowler);
    const kit = G.BOWL_KIT[fam];
    const pick = (bowler.pressed('shot') && kit[0]) || (bowler.pressed('loft') && kit[1]) || (bowler.pressed('block') && kit[2]);
    if (pick) m.startRunup({ key: pick, target: { x: mk.x, y: mk.y }, cpu: false, fam });
    else if (bowler.pressed('special') && m.hype[m.bowlingSide] >= 100) {
      // the bowler's own special delivery, or the Kerfuffle Ball for a bowler without one
      const sp = m.bowlSpecialOf(m.I.bowler) || 'kfBall';
      m.hype[m.bowlingSide] = 0;
      m.startRunup({ key: 'express', target: { x: mk.x, y: mk.y }, cpu: false, fam, special: sp });
    }
  }
  if (bowler && m.phase === 'runup' && m.delivery && !m.delivery.cpu) {
    if (bowler.pressed('shot') || bowler.pressed('loft') || bowler.pressed('block')) m.bowlRelease();
  }
  // the aftertouch: the stick pushed sideways in the first quarter second after release
  if (bowler && m.phase === 'flight') { const mv = bowler.move(); if (Math.abs(mv[0]) > 0.4) m.aftertouch(mv[0]); }
  if (bowler && m.phase === 'dead' && bowler.pressed('special')) m.reviewPress();
  if (batter && m.phase === 'dead' && batter.pressed('special')) m.reviewPress();
  if (fielder && m.phase === 'play' || fielder && m.phase === 'flight') {
    const mv = fielder.move();
    m.fieldMove(mv[0], mv[1], dt);
    if (fielder.pressed('special') && m.hype[m.bowlingSide] >= 100) m.fieldSpecial();
    if (m.catchRing) { if (fielder.pressed('shot')) m.catchPress(); }
    else if (m.humanFieldHold) {
      if (fielder.pressed('shot')) m.fieldAct('A');
      else if (fielder.pressed('loft')) m.fieldAct('B');
      else if (fielder.pressed('block')) m.fieldAct('A');
    }
  }
};
G.mouseMoved = I => {
  const t = I.mouse && I.mouse.t;
  if (t === undefined) return false;
  if (G._mt === undefined) { G._mt = t; return false; }
  if (G._mt !== t) { G._mt = t; G._mouseAt = G.game.time; }
  return G._mouseAt !== undefined && G.game.time - G._mouseAt < 1.2;
};

/* ---- the events: callouts, commentary, sound, camera, the hype and the fire ---- */
G.drainEvents = () => {
  const m = G.match;
  for (const ev of m.drain()) {
    const d = ev.data;
    switch (ev.type) {
      case 'innings':
        G.callout(d.k === 0 ? 'FIRST INNINGS' : d.k === 1 ? 'SECOND INNINGS' : 'SUPER OVER', '#ffe08a', 1.4);
        if (d.target) G.say('target', { target: d.target });
        break;
      case 'release': G.game.audio.sfx('select', { vol: 0.2 }); break;
      case 'pitch': G.sfxSafe('pitch'); break;
      case 'contact': {
        G.sfxSafe(d.lofted ? 'batHigh' : 'bat');
        G.timing = { word: d.grade, t: 0.7, max: 0.7, grade: d.grade };
        if (d.grade === 'PERFECT') { G.sfxSafe('ring'); G.game.shake(2); G.flashAt = 0.12; }
        G.swingPose = { t: 0.22, dir: d.theta };
        break;
      }
      case 'edge': G.sfxSafe('edge'); G.callout('EDGE!', '#ffb0a0', 0.8); break;
      case 'beaten': G.callout('BEATEN!', '#c8c8d0', 0.6); G.say('beaten'); break;
      case 'boundary':
        G.signalFor(d.n === 6 ? 'six' : 'four');
        if (d.n === 6) G.requestReplay(3, 'SIX'); else if (G.setting('replays') === 'Always') G.requestReplay(1, 'FOUR');
        if (d.n === 6 && G.mapGround && G.mapGround.light === 'night') G.addFirework(d.x, d.y);
        if (d.n === 6) { G.callout('SIX!', '#ffd23a', 1.4); G.game.shake(4); G.game.flash('#ffe08a', 0.2, 0.6); G.say('six'); G.sfxSafe('six'); G.slowT = 0.6; }
        else { G.callout('FOUR!', '#7ad0ff', 1.1); G.say('four'); G.sfxSafe('four'); }
        G.crowdRoar(d.n);
        break;
      case 'third-umpire': G.thirdUmpire = { out: d.out, margin: d.margin, name: d.name, t: 0 }; G.callout('THIRD UMPIRE', '#9ad0ff', 1.2); break;
      case 'wicket': G.requestReplay(2, 'WICKET'); G.signalFor('wicket'); G.callout('WICKET!', '#ff6b6b', 1.4); G.sfxSafe('stumps'); G.game.shake(3); G.say(d.how === 'bowled' ? 'bowled' : d.how === 'caught' ? 'caught' : d.how === 'lbw' ? 'lbw' : 'runout'); break;
      case 'runout': G.callout('RUN OUT!', '#ff6b6b', 1.4); G.say('runout'); G.sfxSafe('stumps'); break;
      case 'catch': G.celebrate = { key: d.keeper ? 'keeper' : 'f' + d.id, t: 1.2 }; G.callout(d.screamer ? 'SCREAMER!' : 'CAUGHT!', '#ffffff', 1.1); G.say('caught'); G.sfxSafe('catch'); break;
      case 'catch:dropped': G.callout('DROPPED!', '#ffb0a0', 1.1); G.say('dropped'); break;
      case 'catch-ring': break;
      case 'appeal': G.callout('HOWZAT!', '#ffe08a', 1.1); G.voice && G.voice.say('HOWZAT!', 'players'); break;
      case 'dead': if (d.reason === 'wide') { G.say('wide'); G.callout('WIDE', '#ffe08a', 0.9); } if (d.reason === 'noball') { G.say('noball'); G.callout('NO BALL', '#ffe08a', 1.2); } if (d.reason === 'notout') G.callout('NOT OUT', '#ffffff', 1.1); break;
      case 'extra': break;
      case 'over': G.callout('OVER ' + d.n + ' - ' + d.runs + ' RUNS', '#ffffff', 1.2); break;
      case 'run': G.callout(d.n === 1 ? 'ONE' : d.n === 2 ? 'TWO' : d.n + ' RUNS', '#ffffff', 0.8); break;
      case 'running': G.sfxSafe('run'); break;
      case 'throw': G.sfxSafe('throw'); break;
      case 'gather': G.sfxSafe('gloves'); break;
      case 'hype:full': G.callout('KERFUFFLE! SPECIAL READY', '#ffd23a', 1.6); G.sfxSafe('hype'); G.crowdRoar(4); break;
      case 'fire:on': G.callout('ON FIRE!', '#ff8a3a', 1.6); G.sfxSafe('fire'); G.say('fire'); break;
      case 'fire:off': break;
      case 'bowl:fire': G.callout('BOWLER ON FIRE!', '#ff8a3a', 1.4); break;
      case 'special': G.requestReplay(2, 'SPECIAL'); G.sfxSafe('special'); G.callout(d.name, '#ffd23a', 1.6); G.say('special'); G.crowdRoar(4); break;
      case 'charge': G.callout('CHARGE!', '#ffe08a', 0.8); break;
      case 'dive': G.callout('DIVE!', '#ffe08a', 1.0); G.sfxSafe('run'); break;
      case 'pass-through': G.callout('THROUGH THE FIELDER!', '#c8f0ff', 1.0); break;
      case 'silver-tray': G.callout('SILVER TRAY SAVE!', '#ffe08a', 1.4); G.say('caught'); break;
      case 'bells': G.callout('CHURCH BELLS! +10 HYPE', '#ffe08a', 1.2); G.crowdRoar(3); break;
      case 'deflect': G.callout('DEFLECTED!', '#ffb0a0', 0.9); break;
      case 'byes': G.callout('BYES: ' + d.n, '#ffffff', 1.0); break;
      case 'target:hit': G.requestReplay(3, 'BONUS'); G.callout('KERFUFFLE BONUS +' + d.bonus, '#ffe08a', 1.6); G.sfxSafe('glass'); G.slowT = 0.4; G.say('pub', {}); G.crowdRoar(6); break;
      case 'item:spawn': G.callout('A TOKEN ON THE OUTFIELD', '#ffe08a', 1.0); break;
      case 'item:got': G.callout(G.ITEMS[d.id].name + ' ARMED', G.ITEMS[d.id].colour, 1.4); G.sfxSafe('coin'); break;
      case 'item:used': G.callout(d.id === 'teapot' ? 'GOLDEN TEAPOT - DOUBLE!' : d.id === 'horseshoe' ? 'THE HORSESHOE! NOT OUT!' : 'HYPE +40', '#ffe08a', 1.4); break;
      case 'chaos': if (d.id === 'fireworks') for (let k = 0; k < 3; k++) G.addFirework(G.W.PX + (G.rng.cosmetic() - 0.5) * 400, G.W.CY + (G.rng.cosmetic() - 0.5) * 300); G.callout(G.CHAOS[d.id].name, '#ffe08a', 2.2); G.say(d.id === 'cow' ? 'cow' : 'idle'); break;
      case 'rain:start': G.callout('RAIN STOPS PLAY', '#9ad0ff', 2.2); G.say('rain'); G.sfxSafe('rain'); break;
      case 'rain:end': break;
      case 'kerf-method': G.kerfCard = { t: 6, d }; G.callout('KERFUFFLE METHOD', '#9ad0ff', 2.6); break;
      case 'review': G.callout(d.won ? 'REVIEW: OVERTURNED!' : 'REVIEW: LOST', d.won ? '#5fd38a' : '#ff6b6b', 1.8); G.say('review'); break;
      case 'innings:end': G.callout('INNINGS OVER', '#ffe08a', 1.2); break;
      case 'match:end': G.endQueued = false; break;
      case 'ball': G.lastBall = d; break;
    }
  }
};
// the replay's record: every 1/30 s, the ball and every player's state, so the rigs can be posed again
G.recordFrame = m => {
  if (!m || m.t - G.lastRec < 1 / 30 || !m.ball) return;
  G.lastRec = m.t;
  const players = G.playersNow(m).map(p => ({ key: p.key, side: p.side, idx: p.idx, x: p.x, y: p.y, facing: p.facing, role: p.role, bat: !!p.bat, ghost: !!p.ghost, intangible: !!p.intangible }));
  G.frameRing.push({ ball: [m.ball.x, m.ball.y, m.ball.z], players });
  if (G.frameRing.length > 300) G.frameRing.shift();
};
G.sfxSafe = (name, o) => { try { G.game.audio.sfx(name, o); } catch (e) { /* the sound is optional */ } };
G.crowdRoar = n => { G.crowdLevel = Math.min(1, (G.crowdLevel || 0) + n / 10); G.crowdRoarFor(n); };
G.updateFx = dt => {
  for (const c of G.callouts) c.t -= dt;
  G.callouts = G.callouts.filter(c => c.t > 0);
  if (G.timing) { G.timing.t -= dt; if (G.timing.t <= 0) G.timing = null; }
  if (G.swingPose) { G.swingPose.t -= dt; if (G.swingPose.t <= 0) G.swingPose = null; }
  if (G.kerfCard) { G.kerfCard.t -= dt; if (G.kerfCard.t <= 0) G.kerfCard = null; }
  G.crowdLevel = Math.max(0, (G.crowdLevel || 0) - dt * 0.4);
  G.fireworks.forEach(f => { f.t -= dt; });
  G.fireworks = G.fireworks.filter(f => f.t > 0);
  if (G.celebrate) { G.celebrate.t -= dt; if (G.celebrate.t <= 0) G.celebrate = null; }
  G.flashAt = Math.max(0, (G.flashAt || 0) - dt);
  // the swing: the bat angle sweeps from the stance through the contact
  const m = G.match;
  if (G.swingPose && m) {
    const k = 1 - G.swingPose.t / 0.22;
    // the blade's direction for the shot's line (batter's frame: x = -sin, y = cos), swept through the contact
    const th = G.swingPose.dir * PI / 180;
    G.swingPose.angle = Math.atan2(Math.cos(th), -Math.sin(th)) + (1 - k) * 0.7 - 0.35;
    G.swingPose.lift = 10 * Math.sin(Math.min(1, k) * PI);
    G.swingState = { u: clamp(k, 0, 1) };
  } else { G.swingState = null; }
};
G.cameraFor = dt => {
  const m = G.match, g = G.game;
  let fx = G.W.PX, fy = G.W.CY - 30, z = 0;
  if (m.ball && (m.phase === 'play' || m.phase === 'flight') && m.ball.carried && m.ball.z > 25) {
    const ex = m.ball.x - G.W.PX, ey = m.ball.y - G.W.CY;
    fx = G.W.PX + ex * 0.4; fy = G.W.CY + ey * 0.4; z = 0;
  }
  g.focus(fx, fy, z);
  // the wide view follows a lofted ball round the ground; the broadcast view for the rest
  const want = (m.phase === 'play' && m.ball && m.ball.carried && m.ball.z > 25) ? G.wideView : G.view;
  if (g.view !== want) g.setView(want);
};
G.endMatch = () => {
  G.game.after(1.6, () => G.matchEnded && G.matchEnded(G.match));
};

/* ---- the HUD: score, overs, the batters and the bowler, the meter, prompts, callouts and the catch ring ---- */
G.drawHUD = (r, m) => {
  const I = m.I;
  const cw = r.W, ch = r.H;
  const bat = G.TEAMS[m.cfg.teams[m.battingSide]];
  const bowl = G.TEAMS[m.cfg.teams[m.bowlingSide]];
  r.overlay(g => {
    // the score bug, top left
    E.ui.box(g, 3, 3, 96, 30, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
    px.rect(g, 6, 6, 3, 24, bat.chip);
    E.font.text(g, bat.id, 12, 6, '#ffffff', { outline: '#0b0814' });
    E.font.text(g, I.runs + '/' + I.wkts, 12, 15, '#ffe08a', { scale: 2, outline: '#0b0814' });
    E.font.text(g, G.oversText(I), 66, 19, '#e8e0f0', { font: 'tiny', outline: '#0b0814' });
    if (I.target !== null) {
      const need = I.target - I.runs, left = (I.overs * 6) - I.legal;
      const txt = need > 0 ? 'NEED ' + need + ' FROM ' + left : 'TARGET ' + I.target;
      E.font.text(g, txt, 6, 36, need > 0 && need <= left * 1.5 ? '#ffe08a' : '#ff8a8a', { font: 'tiny', outline: '#0b0814' });
    }
    // this over, top right
    const ov = m.log.filter(x => x.inn === I.k && x.over === I.over).slice(-6);
    const ox = cw - 6 - 6 * 9;
    E.ui.box(g, ox - 4, 3, 6 * 9 + 6, 14, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
    for (let i = 0; i < 6; i++) {
      const rec = ov[i];
      const x = ox + i * 9, col = !rec ? '#2a2634' : rec.reason === 'wicket' || rec.reason === 'runout' ? '#ff6b6b' : rec.reason === 'boundary' ? (rec.ballRuns === 6 ? '#ffd23a' : '#7ad0ff') : rec.legal ? (rec.ballRuns ? '#f4f4f0' : '#8a8a9a') : '#c8a050';
      px.disc(g, x + 4, 10, 3, col);
      const t = !rec ? '' : rec.reason === 'wicket' ? 'W' : rec.reason === 'wide' ? 'w' : rec.reason === 'noball' ? 'n' : rec.reason === 'boundary' ? String(rec.ballRuns) : rec.ballRuns ? String(rec.ballRuns) : '•';
      if (t) E.font.text(g, t, x + 4 - E.font.width(t, { font: 'tiny' }) / 2, 7, '#0b0814', { font: 'tiny' });
    }
    // the batters and the bowler
    const st = m.striker, ns = m.nonStriker;
    if (st) {
      E.ui.box(g, 3, ch - 30, 116, 27, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
      E.font.text(g, m.batterName(st) + (st.out ? '' : '*'), 7, ch - 27, '#ffffff', { font: 'tiny', outline: '#0b0814' });
      E.font.text(g, st.runs + ' (' + st.balls + ')' + (ns ? '  ' + m.batterName(ns).split(' ').pop() + ' ' + ns.runs : ''), 7, ch - 18, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    }
    E.ui.box(g, cw - 120, ch - 30, 117, 27, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
    E.font.text(g, m.bowlerName(), cw - 116, ch - 27, '#ffffff', { font: 'tiny', outline: '#0b0814' });
    const bo = m.log.filter(x => x.inn === I.k && x.bowler === m.bowlerName());
    const bruns = bo.reduce((s, x) => s + (x.ballRuns || 0), 0), bwk = bo.filter(x => x.reason === 'wicket' || x.reason === 'runout').length;
    E.font.text(g, (I.over) + '.' + I.ballInOver + ' OV  ' + bwk + '-' + bruns, cw - 116, ch - 18, '#c8e0ff', { font: 'tiny', outline: '#0b0814' });
    // the Kerfuffle meter, bottom centre
    const hyp = m.hype[m.battingSide];
    const hb = m.hype[m.bowlingSide];
    const mw = 120, mx = Math.round(cw / 2 - mw / 2), my = ch - 14;
    E.ui.bar(g, mx, my, mw, 6, Math.max(hyp, hb) / 100, m.hype[m.battingSide] >= 100 || m.hype[m.bowlingSide] >= 100 ? '#ffd23a' : '#7a5ad0');
    E.font.text(g, 'KERFUFFLE', mx + mw / 2, my - 9, '#e8e0f0', { font: 'tiny', align: 'center', outline: '#0b0814' });
    if (m.hype[m.battingSide] >= 100 || m.hype[m.bowlingSide] >= 100) {
      G.promptRow(g, [['special', 'SPECIAL']], mx - 40, my + 9);
    }
    if (m.fire[m.battingSide]) E.font.text(g, 'ON FIRE', cw / 2, my + 12, '#ff8a3a', { font: 'tiny', align: 'center', outline: '#0b0814' });
    if (m.freeHit) E.font.text(g, 'FREE HIT', cw / 2, 28, '#ffd23a', { font: 'tiny', align: 'center', outline: '#0b0814' });
    // the timing word, over the batter
    if (G.timing && G.setting('timingWords') === 'On') {
      const col = G.timing.grade === 'PERFECT' ? '#ffd23a' : G.timing.grade === 'GOOD' ? '#5fd38a' : G.timing.grade === 'MISS' ? '#8a8a9a' : '#ff9a6a';
      E.font.text(g, G.timing.word, cw / 2, ch / 2 - 40, col, { scale: 2, align: 'center', outline: '#0b0814' });
    }
    // the bowler's meter, while the run-up runs
    if (m.phase === 'runup' && m.delivery && !m.delivery.cpu && m.delivery.t > m.delivery.dur - 0.7) {
      const u = m.delivery.meter;
      const bw2 = 140, bx = Math.round(cw / 2 - bw2 / 2), by = ch - 34;
      px.rect(g, bx - 1, by - 1, bw2 + 2, 11, '#0b0814');
      const sweet = G.T('meterSweet');
      px.rect(g, bx + Math.round(bw2 * (0.5 - sweet / 2)), by, Math.round(bw2 * sweet), 9, '#5fd38a');
      px.rect(g, bx + Math.round(bw2 * u) - 1, by - 2, 3, 13, '#ffffff');
      E.font.text(g, 'RELEASE', cw / 2, by - 9, '#ffffff', { font: 'tiny', align: 'center', outline: '#0b0814' });
    }
    // the delivery panel for a bowler, the batter's prompts, the fielder's prompts
    const items = [];
    if (m.humanBats() && (m.phase === 'flight' || m.phase === 'play')) {
      if (m.phase === 'flight' && !m.pressed) items.push(['shot', 'GROUND'], ['loft', 'LOFT'], ['block', 'DEFEND']);
      if (m.phase === 'play' && m.runs && !m.runs.active) items.push(['run', 'RUN']);
      if (m.phase === 'play' && m.runs && m.runs.active) items.push(['run', 'AGAIN']);
      if (m.hype[m.battingSide] >= 100) items.push(['special', 'SPECIAL']);
    }
    if (m.humanBowls() && m.phase === 'setup' && !m.delivery) {
      const fam = m.familyOf(m.I.bowler), kit = G.BOWL_KIT[fam];
      items.push(['shot', G.DELIVERIES[kit[0]].label], ['loft', G.DELIVERIES[kit[1]].label], ['block', G.DELIVERIES[kit[2]].label]);
      if (m.hype[m.bowlingSide] >= 100) items.push(['special', 'SPECIAL']);
    }
    if (m.humanBowls() && m.phase === 'runup') items.push(['shot', 'RELEASE']);
    if (m.humanField() && m.humanFieldHold) items.push(['shot', 'STRIKER END'], ['loft', 'BOWLER END']);
    if (m.catchRing) items.push(['shot', 'CATCH!']);
    if (m.phase === 'dead' && m.reviewable && m.review[m.reviewable.side] > 0) items.push(['special', 'REVIEW']);
    if (items.length) {
      G.promptRow(g, items, 8, ch - 42);
    }
    if (G.lastBall && m.phase === 'setup') E.font.text(g, 'OVER ' + m.I.over + '.' + m.I.ballInOver + ' - ' + G.oversText(m.I), cw - 6, 36, '#e8e0f0', { font: 'tiny', align: 'right', outline: '#0b0814' });
    if (G.kerfCard) {
      const d = G.kerfCard.d;
      E.ui.box(g, cw / 2 - 90, 60, 180, 58, { bg: ['#1d3a4a', '#0b1a22'], alpha: 0.92 });
      E.font.text(g, 'THE KERFUFFLE METHOD', cw / 2, 66, '#ffe08a', { font: 'tiny', align: 'center', outline: '#0b0814' });
      E.font.text(g, 'first ' + d.first + ' - target ' + d.after, cw / 2, 80, '#ffffff', { font: 'tiny', align: 'center', outline: '#0b0814' });
      E.font.text(g, 'carry the scone...', cw / 2, 94, '#c8e0ff', { font: 'tiny', align: 'center', outline: '#0b0814' });
    }
  });
};
G.oversText = I => I.over + '.' + I.ballInOver + ' ov' + (I.overs ? '/' + I.overs : '');
G.drawCallouts = r => {
  r.overlay(g => {
    let y = 100;
    for (const c of G.callouts.slice(0, 2)) {
      const sc = c.t > c.max - 0.2 ? 3 : 2;
      E.font.text(g, c.text, r.W / 2, y, c.color, { scale: sc, align: 'center', outline: '#0b0814' });
      y += 22;
    }
  });
};
G.drawCatchRing = (r, m) => {
  const R = m.catchRing;
  if (!R) return;
  const b = r.w(R.f.x, R.f.y, 22);
  r.overlay(g => {
    const rad = 2 + 16 * clamp(R.t / R.total, 0, 1);
    const pts = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; pts.push([b[0] + Math.cos(a) * rad, b[1] + Math.sin(a) * rad * 0.6]); }
    for (let i = 0; i < 24; i++) { const p = pts[i], q = pts[(i + 1) % 24]; px.line(g, p[0], p[1], q[0], q[1], '#5fd38a', 1); }
    px.disc(g, b[0], b[1], 2, '#ffffff');
  });
};
G.drawTargets = (r, m) => {
  for (const tg of m.ground.targets) {
    const hit = m.targetsHit[tg.id];
    r.queue(tg.x, tg.y, 0, g => {
      const p = r.w(tg.x, tg.y, tg.z);
      px.rect(g, p[0] - 5, p[1] - 9, 10, 9, hit ? '#3a3a44' : tg.colour);
      px.rect(g, p[0] - 4, p[1] - 8, 3, 3, hit ? '#1a1a22' : '#ffffff');
      if (!hit) E.font.text(g, '+' + tg.bonus, p[0] - 6, p[1] - 17, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    }, { bias: 0 });
  }
};
G.drawItems = (r, m) => {
  for (const side of [0, 1]) {
    const it = m.items[side];
    if (!it || side !== m.battingSide) continue;
    const pos = r.w(it.x, it.y, 6);
    r.queue(it.x, it.y, 0, g => {
      const bob = Math.sin(G.game.time * 4) * 2;
      px.disc(g, pos[0], pos[1] - 3 + bob, 4, G.ITEMS[it.id].colour);
      px.disc(g, pos[0] - 1, pos[1] - 4 + bob, 1, '#ffffff');
    }, { bias: 0, emissive: true });
  }
};
G.drawSky = (r, m) => {
  // the sun or the cloud, drawn in the sky band over the far stands
  if (m.ground.overcast) {
    r.overlay(g => { px.rect(g, 0, 0, r.W, Math.round(r.H * 0.06), '#7a8496'); });
  }
};
G.SONG_MATCH = { bpm: 140, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };
