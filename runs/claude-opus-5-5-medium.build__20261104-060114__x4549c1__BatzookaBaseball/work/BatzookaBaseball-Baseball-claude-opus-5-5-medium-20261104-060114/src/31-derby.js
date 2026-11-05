/* THE BATZOOKA DERBY: the Pitch-O-Matic 3000 throws; any swing that isn't a home run is an out, a taken strike is an out,
 * balls are free. Each homer scores its distance in feet (x2 on every fifth pitch, the Golden Ball) plus target bonuses
 * (the blimp, the MEGA-TRON, drones). Three in a row fill the meter for one Batzooka swing. 10 outs or 2:00. */
function newDerby(o) {
  const m = newMatch({ mode: 'derby', park: o.park || 'megadome', away: o.team || 'COM', home: 'MMX', innings: 99, difficulty: 'pro', seed: o.seed, ctrl: [[o.input || null, null], [null, null]], fast: o.fast, cheats: o.cheats, shows: false, mercy: false, rhubarbs: false });
  m.derby = { outs: 0, maxOuts: o.outs || 10, time: o.time === undefined ? 120 : o.time, score: 0, hrs: 0, streak: 0, pitchN: 0, longest: 0, golden: false, done: false, last: null, hits: [], batter: o.batter || null, onHit: o.onHit || null, clock: !o.noClock };
  m.mercy = false; m.cheats.noCpuSuper = true;
  if (o.batter) { const T = m.teams[0]; T.lineup = [o.batter, ...T.lineup.filter(p => p !== o.batter)].slice(0, 9); T.order = 0; }
  m.phase = 'halfStart'; m.phaseT = 0; halfStartSetup(); setPhase('walkUp');
  if (o.deal) BZ.rng.deal = o.deal;
  return m;
}
/** the Pitch-O-Matic's pitch: 80% in the zone, small breaks, from the deal stream (the same on every hub copy) */
function derbyPitchChoice() {
  const d = BZ.rng.deal, Z = zoneOf(batterNow()), inZ = d() < .8;
  M.derby.pitchN++; M.derby.golden = M.derby.pitchN % 5 === 0;
  const x = inZ ? lerp(-5, 5, d()) : (d() < .5 ? -1 : 1) * (8 + d() * 4), z = inZ ? lerp(Z.z0 + 1, Z.z1 - 1, d()) : (d() < .5 ? Z.z0 - 5 : Z.z1 + 4);
  return { type: 'pitchomatic', slot: 0, x, z, q: 1, wait: M.fast ? 0 : .7 };
}
function derbyCross(cr, swung, inZ) {
  const D = M.derby;
  if (swung || inZ) { derbyOut(swung ? 'WHIFF' : 'STRIKE'); }
  else emit('derbyBall', {});
  return endPitch(swung ? 'out' : inZ ? 'out' : 'ball');
}
function derbyOut(why) { const D = M.derby; D.outs++; D.streak = 0; emit('derbyOut', { why, outs: D.outs }); if (D.outs >= D.maxOuts) derbyDone(); }
function derbyBallStep(dt) {
  const b = M.ball;
  if (b.mode === 'homer') { b.vz -= 520 * M.park.gravityMul * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 30) b.trail.shift(); } if (M.phaseT > (M.fast ? 0 : 1.8)) { M.cam = 'plate'; endPitch('hr'); } return; }
  const ev = ballStep(b, dt, false); hazardBall(b, dt);
  if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 24) b.trail.shift(); }
  if (ev === 'homer' || ev === 'pole') {
    const D = M.derby, dist = carryFeet(b);
    let pts = dist * (D.golden ? 2 : 1), bonus = 0, tag = '';
    if (M.park.id === 'megadome' && Math.abs(thetaOf(b.x, b.y) - .08) < .14) { bonus += 300; tag = 'MEGA-TRON +300'; }
    if (b.z > 160 && Math.abs(thetaOf(b.x, b.y) + .3) < .12) { bonus += 500; tag = 'BLIMP +500'; }
    if (Math.abs(thetaOf(b.x, b.y)) < .05) { bonus += 200; tag = tag || 'BULLSEYE +200'; }
    D.score += pts + bonus; D.hrs++; D.streak++; D.longest = Math.max(D.longest, dist); D.last = { dist, pts: pts + bonus, golden: D.golden, tag };
    D.hits.push({ dist, x: b.x, y: b.y });
    if (D.streak >= 3) { offense().meter = 100; D.streak = 0; emit('meterFull', { team: 0 }); }
    emit('homer', { batter: batterNow(), dist, batzooka: b.kind === 'batzooka', x: b.x, y: b.y, team: 0, derby: true, golden: D.golden });
    emit('derbyHit', { dist, pts: pts + bonus, tag });
    if (D.onHit) D.onHit({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, dist, bz: b.kind === 'batzooka' });
    b.mode = 'homer'; M.phaseT = 0; M.cam = M.fast ? 'plate' : 'moonshot'; if (!M.fast) sting('homer');
    return;
  }
  if (ev === 'grd' || ev === 'outFoul' || b.stopped || (b.bounced && M.phaseT > 1.2) || M.phaseT > 6) {
    if (M.derby.onHit && !b.sent) { b.sent = true; M.derby.onHit({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, dist: 0, bz: false, out: true }); }
    derbyOut(b.fair === false || ev === 'outFoul' ? 'FOUL' : 'NO DOUBT... NOT'); M.cam = 'plate'; return endPitch('out');
  }
}
function derbyTick(dt) {
  const D = M.derby; if (!D || D.done) return;
  if (D.clock && M.phase !== 'walkUp' && M.phase !== 'halfStart') D.time -= dt / Math.max(.01, game.timeScale || 1) * (game.timeScale ? game.timeScale : 1);
  if (D.time <= 0 && D.clock) { D.time = 0; derbyDone(); }
}
function derbyDone() { const D = M.derby; if (D.done) return; D.done = true; emit('derbyEnd', { score: D.score, hrs: D.hrs, longest: D.longest }); }

/* ---- the Derby's screens: setup (1-4 players, hot seat), the rounds, the initials and the Moonshot Leaders table ---- */
const DB = { n: 1, park: 'megadome', len: 'time', turn: 0, scores: [], menu: null, entry: null };
const derbyTable = () => { try { return E.store.get('bz:derby', null) || [{ n: 'DOT', s: 3200 }, { n: 'IKE', s: 2400 }, { n: 'LOU', s: 1979 }, { n: 'HAP', s: 1500 }, { n: 'PIP', s: 1100 }, { n: 'PEP', s: 900 }, { n: 'MOO', s: 700 }, { n: 'HNK', s: 500 }]; } catch (e) { return []; } };
const derbySave = t => { try { E.store.set('bz:derby', t); } catch (e) { /* storage blocked: the table lasts the visit */ } };
SCENES.derbySetup = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('derby'); DB.len = game.settings.derbyLength || 'time'; MENUBG.park = DB.park;
    DB.menu = new BigMenu([
      { label: 'BATTERS', adjust: d => { DB.n = clamp(DB.n + d, 1, 4); }, value: () => DB.n + (DB.n > 1 ? ' (HOT SEAT)' : '') },
      { label: 'PARK', adjust: d => { DB.park = cycle(parksUnlocked(), DB.park, d); MENUBG.park = DB.park; }, value: () => PARKS[DB.park].name },
      { label: 'LENGTH', adjust: d => { DB.len = DB.len === 'time' ? 'outs' : 'time'; }, value: () => DB.len === 'time' ? '2:00' : '10 OUTS' },
      { label: 'PLAY BALL!', act: () => { DB.turn = 0; DB.scores = []; game.go('derby'); } }
    ], { w: 260, h: 22, gap: 4, onBack: () => game.go('title') });
  },
  update(dt) { commonTick(dt); if (idleTick(dt)) return game.go('attract'); DB.menu.update(game.input, dt); },
  draw(r) {
    menuBackdrop(r, .55);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'BATZOOKA DERBY', W / 2, 10, 3);
      para(g, 'The Pitch-O-Matic 3000 serves them up. Any swing that isn\'t a homer is an out; so is a taken strike. Score the feet. Every 5th pitch is a GOLDEN BALL worth double. Three in a row fills the Batzooka.', W / 2 - 150, 40, 300, '#e8e8f0');
      DB.menu.draw(g, W / 2, 86); legend(g, W, H, [['confirm', 'SELECT'], [null, '←→ CHANGE'], ['cancel', 'BACK']]);
    });
  }
};
const DERBY_BATTERS = () => [TEAMS.COM.roster[0], TEAMS.COM.roster[3], TEAMS.COM.roster[7], TEAMS.COM.roster[4]];
SCENES.derby = {
  pausable: true, input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter() {
    const bat = DERBY_BATTERS()[DB.turn % 4];
    newDerby({ park: DB.park, input: game.input, batter: bat, outs: DB.len === 'outs' ? 10 : 99, time: DB.len === 'time' ? 120 : 9999, noClock: DB.len !== 'time', deal: E.rng(4242 + DB.turn) });
    M.onEnd = m => game.after(1.6, () => { DB.scores[DB.turn] = { n: DB.turn + 1, s: m.derby.score, hrs: m.derby.hrs, longest: m.derby.longest }; DB.turn++; if (DB.turn < DB.n) game.go('derby'); else game.go('derbyResults'); });
    BZ.derbyLabel = DB.n > 1 ? 'PLAYER ' + (DB.turn + 1) + ' UP' : '';
    music('derby'); game.setView('broadcast'); game.weather = M.park.weather; CAMS.z = 1; game.timeScale = TUNE.gameSpeed;
  },
  exit() { BZ.derbyLabel = ''; game.weather = null; },
  update(dt) {
    commonTick(dt); radioTick(dt);
    if (BZ.dev && BZ.dev.open) return devUpdate(dt);
    if (PLAYBOOK.open) return playbookUpdate(dt);
    matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt);
  },
  draw(r) { drawMatchWorld(r); drawHUD(r);  if (PLAYBOOK.open) playbookDraw(r); devDraw(r); }
};
SCENES.derbyResults = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('menu'); const best = DB.scores.slice().sort((a, b) => b.s - a.s)[0];
    SAVE.derbyBest = Math.max(SAVE.derbyBest || 0, best ? best.s : 0);
    const T = derbyTable(); DB.entry = best && (T.length < 8 || best.s > T[T.length - 1].s) ? { letters: [0, 0, 0], at: 0, score: best.s, done: false } : null;
    DB.menu = new BigMenu([{ label: 'AGAIN', act: () => { DB.turn = 0; DB.scores = []; game.go('derby'); } }, { label: 'SETUP', act: () => game.go('derbySetup') }, { label: 'TITLE', act: () => game.go('title') }], { w: 110, h: 20, gap: 4, cols: 3, onBack: () => game.go('title') });
  },
  update(dt) {
    commonTick(dt); const I = game.input, e = DB.entry;
    if (e && !e.done) {
      if (I.repeat('up', .3, .1)) { e.letters[e.at] = (e.letters[e.at] + 1) % 26; sfx('menu'); }
      if (I.repeat('down', .3, .1)) { e.letters[e.at] = (e.letters[e.at] + 25) % 26; sfx('menu'); }
      if (I.pressed('right')) e.at = Math.min(2, e.at + 1); if (I.pressed('left')) e.at = Math.max(0, e.at - 1);
      if (I.pressed('confirm')) { I.consumeAll(); if (e.at < 2) e.at++; else { e.done = true; const T = derbyTable(); T.push({ n: e.letters.map(c => String.fromCharCode(65 + c)).join(''), s: e.score }); T.sort((a, b) => b.s - a.s); derbySave(T.slice(0, 8)); sfx('coin'); } }
      return;
    }
    DB.menu.update(I, dt);
  },
  draw(r) {
    menuBackdrop(r, .65);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'MOONSHOT LEADERS', W / 2, 8, 3);
      DB.scores.forEach((s, i) => text(g, 'PLAYER ' + s.n + ':  ' + fmt(s.s) + ' FT   ' + s.hrs + ' HR   LONGEST ' + s.longest + ' FT', W / 2, 36 + i * 11, '#ffe680', { align: 'center' }));
      const e = DB.entry;
      if (e && !e.done) { const y = 86; text(g, 'NEW RECORD! YOUR INITIALS', W / 2, y, '#ffffff', { align: 'center' }); e.letters.forEach((c, i) => { const x = W / 2 - 30 + i * 30; panel(g, x - 11, y + 12, 22, 26, { border: i === e.at ? '#ffe680' : '#6a6c88' }); text(g, String.fromCharCode(65 + c), x, y + 18, '#ffffff', { align: 'center', scale: 2 }); }); legend(g, W, H, [[null, '↑↓ LETTER'], [null, '→ NEXT'], ['confirm', 'OK']]); return; }
      drawLeaders(g, W / 2, 84);
      DB.menu.draw(g, W / 2, H - 50); legend(g, W, H, [['confirm', 'SELECT'], ['cancel', 'TITLE']]);
    });
  }
};
function drawLeaders(g, cx, y) { const T = derbyTable(); panel(g, cx - 90, y - 4, 180, T.length * 11 + 8, { border: '#ffe680' }); T.forEach((t, i) => text(g, (i + 1) + '.  ' + t.n + '   ' + fmt(t.s) + ' FT', cx - 80, y + i * 11, i ? '#ffffff' : '#ffe680')); }
