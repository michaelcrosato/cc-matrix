// ---- the hunt: one scene that runs a plan of segments (sites, the trophy, a bonus game) --------------------------------
// Phases of a segment: intro (a card) -> play -> outro (what you got) -> tally (the x-ray Shot Chart) -> the next one.
// The plan: a campaign is three hunts of [site, site, site, trophy, bonus]; a single hunt is one of those; the Hub
// round is three sites of Hollow Creek; practice is one site with no clock; the attract mode is the campaign's first
// hunt, played by the bot (see 70-attract.js).
const BARK = {
  start: ['BUCKS ONLY! DOES ARE OFF LIMITS, FOLKS!', 'PUMP BETWEEN SHOTS, SHOOTER. KEEP YOUR HEAD!'],
  kill: { heart: 'HEART SHOT! THAT\'S A BUCK!', lungs: 'LUNG SHOT! HE\'S GOING DOWN!', head: 'BIG HEAD! BIG PLATE! BIG DEAL!', neck: 'NECK SHOT! CLEAN AS A WHISTLE!', finished: 'FINISHED HIM OFF! CLEAN!' },
  wound: 'HE\'S HIT! TRACK HIM!',
  doe: 'DOE! YOU\'RE OUT! BENCHED FOR THE SITE!',
  doePenalty: 'DOE! THAT\'S A PENALTY, PARDNER!',
  bluebird: 'BLUEBIRD! THEY\'RE PROTECTED, SHOOTER!',
  skunk: 'SKUNK! EVERYBODY GET DOWN!',
  bessie: 'BESSIE! NOT THE COW! NOT THE COW!',
  crow: 'CAW! CAW! CROW IN THE BAG!',
  coon: 'COON! BIG ONE, TOO!',
  escape: 'THE ONE THAT GOT AWAY!',
  lost: 'WOUNDED AND LOST! TOUGH BREAK.',
  call: 'CALLING! STAND STILL, GENTLEMEN.',
  reload: 'RELOAD! PUMP IT TO LOAD THE TUBE!',
  trophy: 'THAT\'S THE ONE! THE LEGEND!',
  sweep: 'CLEAN SWEEP! PERFECT SITE!',
  siteEnd: 'SITE DONE! CHECK THE SHOT CHART!',
};
const CAST_LINES = {
  Dub: ['Easy now. The big one bedded down behind the birch.', 'Shoot clean, son. A doe is a doe, no matter how she looks at you.'],
  'Granny Mae': ['Y\'all, I\'ve shot more bucks than you\'ve had hot dinners.', 'The creek talks if you listen, sugar.'],
  Dwayne: ['Ha! Watch this one, folks. Watch him go.', 'I bet a bottle he runs straight at me!'],
  Loretta: ['That elk sure is handsome, and so are the rest of y\'all.', 'Hush now, he\'s coming out of the aspens.'],
  Earl: ['Sound carries off that ridge, so mind your breathing.', 'Hunting season, boys. Pump, don\'t panic.'],
  Hank: ['That is Bessie. Bessie is not in the sky.', 'Snow means the moose come down, so keep your eyes open.'],
};

const HUNT_RUN = {
  active: false, mode: 'campaign', plan: [], seg: 0, phase: 'intro', phaseT: 0, clock: 0, timeline: [], site: null,
  hunt: HUNTS[0], world: null, worldIndex: -1, totals: null, caption: null, banner: null, pops: [], bot: false,
  initials: ['D', 'U', 'B'], initCur: 0, ended: false, resumed: false, lastCallT: -9, savedRank: null, lastStanding: 0,
};
const H_ = HUNT_RUN;

// the practice range: four stations, each with its own targets and goal (Uncle Dub's, not scored anywhere)
const RANGE = [
  { label: 'STATION 1 • PAPER', seconds: 60, goal: 5, lines: 'Five paper targets. Pump between every shot, now.', spawns: () => [.2, .35, .5, .65, .8].map((x, i) => ({ at: 1 + i * .5, species: 'paper', d: .3 + i * .08, dir: 1, x, static: true })) },
  { label: 'STATION 2 • CROWS', seconds: 50, goal: 3, lines: 'Crows cross the range. Lead them a little.', spawns: () => [0, 1, 2, 3, 4].map(i => ({ at: 1 + i * 6, species: 'crow', d: .2, dir: i % 2 ? -1 : 1, x: null })) },
  { label: 'STATION 3 • PUMP DRILL', seconds: 45, goal: 6, lines: 'Targets pop up one at a time. Rack, aim, fire.', spawns: () => [0, 1, 2, 3, 4, 5].map(i => ({ at: 1 + i * 3, species: 'paper', d: .45 + (i % 3) * .12, dir: 1, x: .15 + (i * .14) % .7, static: true })) },
  { label: 'STATION 4 • LONG SHOT', seconds: 40, goal: 1, lines: 'One buck, far off, standing still. Use the scope.', spawns: () => [{ at: 1, species: 'buck', d: .14, dir: 1, x: .5, static: true }] },
];

function makePlan(mode, hunt, extra) {
  const sites = (h, n, sec, bucks) => Array.from({ length: n }, (_, i) => ({ type: 'site', hunt: h, n: i, seconds: sec, bucks: bucks + i, label: `SITE ${i + 1} OF ${n}` }));
  const H = HUNTS[hunt];
  if (mode === 'bonus') return [{ type: 'bonus', hunt: HUNTS[hunt], game: extra, seconds: 30, label: BONUS[extra].name }];
  if (mode === 'practice') return RANGE.map((st, i) => ({ type: 'range', hunt: HUNTS[0], n: i, seconds: st.seconds, goal: st.goal, lines: st.lines, spawns: st.spawns, label: st.label }));
  if (mode === 'party') {
    // hot seat: every player takes each site in turn, on the same seed, so the animals are the same for all
    const segs = [];
    for (let i = 0; i < 3; i++) for (let p = 0; p < (extra || 2); p++) segs.push({ type: 'site', hunt: HUNTS[0], n: i, seconds: 30, bucks: 3 + i, label: `SITE ${i + 1} OF 3`, player: p, seed: 5000 + i });
    return segs;
  }
  if (mode === 'hub') return sites(HUNTS[0], 3, TUNING.siteSeconds, 3);
  const one = h => [...sites(h, 3, TUNING.siteSeconds, 3), { type: 'trophy', hunt: h, seconds: 40, label: 'THE TROPHY: ' + h.trophyName }, { type: 'bonus', hunt: h, game: h.bonus, seconds: 30, label: BONUS[h.bonus].name }];
  if (mode === 'single') return one(H);
  if (mode === 'attract') return one(HUNTS[0]);
  return HUNTS.flatMap(h => one(h));
}

function huntCard(seg) {
  if (seg.player != null) return `PLAYER ${seg.player + 1} • ${seg.label}`;
  if (seg.type === 'range') return seg.label;
  if (seg.type === 'site') return seg.label + ' • ' + seg.hunt.name.toUpperCase();
  if (seg.type === 'trophy') return 'TROPHY: ' + seg.hunt.trophyName;
  return 'BONUS: ' + BONUS[seg.game].name.toUpperCase();
}

function startHunt(mode, hunt, extra) {
  HUNT_RUN.mode = mode;
  HUNT_RUN.plan = makePlan(mode, hunt, extra);
  HUNT_RUN.hubOver = false;
  HUNT_RUN.seg = 0; HUNT_RUN.totals = { points: 0, bagged: 0, shots: 0, hits: 0, misses: 0, sites: [], trophy: false, bonus: 0, doe: 0 };
  HUNT_RUN.bot = mode === 'attract';
  HUNT_RUN.party = Array.from({ length: mode === 'party' ? (extra || 2) : 0 }, () => 0);
  HUNT_RUN.ended = false; HUNT_RUN.savedRank = null;
  if (mode === 'campaign') HUNT_RUN.hunt = HUNTS[0];
  startSeg();
}

function loadWorld(hunt) {
  const i = HUNTS.indexOf(hunt);
  if (HUNT_RUN.worldIndex !== i) { HUNT_RUN.world = buildWorld(hunt, i); HUNT_RUN.worldIndex = i; }
  HUNT_RUN.hunt = hunt;
  return HUNT_RUN.world;
}

function startSeg() {
  const seg = HUNT_RUN.plan[HUNT_RUN.seg];
  if (!seg) { finishRun(); return; }
  loadWorld(seg.hunt);
  HUNT_RUN.phase = 'intro'; HUNT_RUN.phaseT = 0; HUNT_RUN.clock = 0;
  LIVE.length = 0; FX.length = 0; HUNT_RUN.pops = [];
  resetGun();
  HUNT_RUN.site = newSiteStats(huntCard(seg));
  HUNT_RUN.site.bucksWanted = seg.bucks || 0;
  HUNT_RUN.banner = { text: huntCard(seg), color: '#f5d060', t: 2.6 };
  const hunt = seg.hunt;
  if (seg.type === 'range') {
    HUNT_RUN.timeline = seg.spawns();
  } else if (seg.type === 'site') {
    if (seg.seed != null) RNG.spawn = mulberry(seg.seed);   // a party turn: the same animals as the other turns
    HUNT_RUN.timeline = buildTimeline(hunt, seg.seconds === Infinity ? 60 : seg.seconds, seg.bucks, RNG.spawn);
  } else if (seg.type === 'trophy') {
    HUNT_RUN.timeline = [{ at: 3, species: hunt.trophy, d: .62, dir: RNG.spawn() < .5 ? 1 : -1, trophy: true }]
      .concat(buildTimeline(hunt, 40, 0, RNG.spawn).filter(e => SPECIES[e.species].sex === 'critter' || e.at > 12));
  } else {
    HUNT_RUN.timeline = bonusTimeline(BONUS[seg.game], seg.seconds);
  }
  if (seg.type === 'range') {
    HUNT_RUN.caption = { who: 'Dub', text: seg.lines, t: 4 };
    babble('Dub', seg.lines);
  } else if (seg.type !== 'bonus') {
    // the hunt's cast talks at each site: the first site opens with the emcee, the rest with the hunt's own cast
    const who = hunt.cast, lines = CAST_LINES[who] || CAST_LINES.Dub;
    if (seg.type === 'site' && seg.n === 0) HUNT_RUN.caption = { who: 'EMCEE', text: BARK.start[0], t: 4 };
    else HUNT_RUN.caption = { who, text: pickFrom(lines), t: 4 };
    if (who !== 'EMCEE' && HUNT_RUN.caption.who !== 'EMCEE') babble(who, HUNT_RUN.caption.text);
  } else {
    HUNT_RUN.caption = { who: 'EMCEE', text: 'GET READY! ' + BONUS[seg.game].sub.toUpperCase(), t: 4 };
  }
}

// bonus game spawns: a flyer crosses every few seconds; snowmen pop up in place
function bonusTimeline(cfg, seconds) {
  const events = [];
  const n = Math.round(seconds * cfg.spawn);
  for (let i = 0; i < n; i++) {
    const sp = pickFrom(cfg.kinds, RNG.spawn);
    const pop = sp === 'snowman';
    events.push({ at: .8 + i / cfg.spawn + RNG.spawn() * .4, species: sp, d: pop ? rnd(.25, .8, RNG.spawn) : rnd(.08, .4, RNG.spawn),
      dir: RNG.spawn() < .5 ? 1 : -1, x: pop ? rnd(.1, .9, RNG.spawn) : null, pop });
  }
  return events;
}

function spawnEvent(e, hunt) {
  if (e.pop) {
    // a bonus pop-up: the engine's tweens raise it (outBack), hold it, and sink it; then it is removed
    const a = spawnAnimal(e.species, { d: e.d, x: e.x, dir: e.dir, speed: 0 });
    a.pop = 0; a.hn = hFrac(e.d, SPECIES[e.species].size);
    tweenOn(a, { pop: 1 }, .35, { ease: 'outBack' });
    GAME.after(1.75, () => tweenOn(a, { pop: 0 }, .3, { ease: 'inQuad', onDone: () => { a.pop = -1; } }));
    return a;
  }
  const a = spawnAnimal(e.species, { d: e.d, dir: e.dir, x: e.x, trophy: !!e.trophy });
  if (e.trophy) a.trophy = true;
  if (e.static) a.pop = 1;   // a range target: stands where it is until it is hit
  return a;
}

function clearSpawns() { LIVE.length = 0; }

function playEnded(seg) {
  const s = HUNT_RUN.site;
  if (seg.type === 'site') return seg.seconds !== Infinity && HUNT_RUN.clock >= seg.seconds;
  if (seg.type === 'range') return HUNT_RUN.clock >= seg.seconds || (s.shots_hit || 0) >= seg.goal;
  if (seg.type === 'trophy') return (HUNT_RUN.trophyDone || HUNT_RUN.clock >= seg.seconds);
  return HUNT_RUN.clock >= seg.seconds;
}

function endSegPlay() {
  HUNT_RUN.phase = 'outro'; HUNT_RUN.phaseT = 0;
  const seg = HUNT_RUN.plan[HUNT_RUN.seg];
  for (const a of LIVE) if (!a.dead) { a.state = 'bolt'; a.stateT = 9; }
  const s = HUNT_RUN.site;
  const sweep = seg.type === 'site' && s.bucksWanted > 0 && s.bagged >= s.bucksWanted && s.doeShots === 0;
  if (sweep) { s.points += 1000 * TUNING.pointsMult; s.sweep = true; }
  HUNT_RUN.banner = { text: sweep ? BARK.sweep : (seg.type === 'site' ? 'SITE OVER' : 'OVER'), color: sweep ? '#7af07a' : '#f5d060', t: 2.2 };
  HUNT_RUN.caption = { who: 'EMCEE', text: seg.type === 'site' ? BARK.siteEnd : 'WRAP IT UP! ON TO THE NEXT!', t: 3 };
}

function recordSeg() {
  const seg = HUNT_RUN.plan[HUNT_RUN.seg], s = HUNT_RUN.site, T = HUNT_RUN.totals;
  T.points += s.points; T.bagged += s.bagged; T.shots += s.shots; T.hits += s.shots_hit || 0; T.misses += s.misses;
  T.sites.push({ label: huntCard(seg), stats: s, seg: seg.type });
  if (seg.type === 'trophy' && s.trophyDown) { T.trophy = true; SAVE.addTrophy(seg.hunt.trophyName); }
  if (seg.type === 'bonus') T.bonus += s.points;
  if (seg.player != null) HUNT_RUN.party[seg.player] += s.points;
  if (s.doeShots) T.doe += s.doeShots;
  bus.emit('segment', { seg, stats: s });
}

function nextPhase() {
  const seg = HUNT_RUN.plan[HUNT_RUN.seg];
  if (HUNT_RUN.phase === 'tally') { HUNT_RUN.seg++; startSeg(); }
  else if (HUNT_RUN.phase === 'intro') { HUNT_RUN.phase = 'play'; HUNT_RUN.clock = 0; }
}

function finishRun() {
  HUNT_RUN.phase = 'results'; HUNT_RUN.phaseT = 0;
  HUNT_RUN.initCur = 0;
  bus.emit('runEnd', { total: HUNT_RUN.totals.points, mode: HUNT_RUN.mode });
}

// the play step: spawns, the bot or the player, the timers and the end rules
function stepPlay(dt, game, I) {
  const seg = HUNT_RUN.plan[HUNT_RUN.seg];
  HUNT_RUN.clock += dt;
  const W = game.W, H = game.H, t = game.time;
  while (HUNT_RUN.timeline.length && HUNT_RUN.timeline[0].at <= HUNT_RUN.clock) spawnEvent(HUNT_RUN.timeline.shift(), HUNT_RUN.hunt);
  if (seg.type === 'bonus') {
    for (let i = LIVE.length - 1; i >= 0; i--) if (LIVE[i].pop === -1) LIVE.splice(i, 1);
  }
  if (!HUNT_RUN.bot) steerGun(I, dt, W, H, t);
  updateGun(dt);
  if (HUNT_RUN.bot) botStep(dt, W, H, t);
  else {
    if (I.pressed('fire')) fireOrReport(W, H, t);
    if (I.pressed('pump')) { const r = pumpGun(); if (r === 'reload') HUNT_RUN.caption = { who: 'EMCEE', text: BARK.reload, t: 2 }; }
    if (I.pressed('call') && GUN.calls > 0 && HUNT_RUN.clock - HUNT_RUN.lastCallT > 1) {
      GUN.calls -= 1; HUNT_RUN.lastCallT = HUNT_RUN.clock;
      const [ax] = aimPoint(t);
      const n = callNear(ax, .3);
      bus.emit('call', { n });
      HUNT_RUN.caption = { who: 'EMCEE', text: BARK.call, t: 2.4 };
    }
  }
  updateAnimals(dt);
  if (seg.type === 'trophy') {
    const tr = LIVE.find(a => a.trophy && !a.dead && !a.gone);
    if (HUNT_RUN.clock > 4 && !tr) HUNT_RUN.trophyDone = true;
  }
  if (playEnded(seg) && HUNT_RUN.phase === 'play') endSegPlay();
  if (seg.type === 'site' && seg.seconds !== Infinity && HUNT_RUN.timeline.length === 0 && LIVE.length === 0 && HUNT_RUN.clock > 5 && HUNT_RUN.clock < seg.seconds) {
    HUNT_RUN.clock = seg.seconds - 0.001;   // every animal is gone: the site is over early
  }
  if (seg.type === 'bonus' && HUNT_RUN.timeline.length === 0 && HUNT_RUN.clock > 5 && LIVE.length === 0) HUNT_RUN.clock = seg.seconds;
}

function fireOrReport(W, H, t) {
  if (!HUNT_RUN.site || HUNT_RUN.phase !== 'play') return;
  const r = fireGun(HUNT_RUN.site, t, W, H);
  if (!r) return;
  if (!r.ok) {
    if (r.why === 'pump') HUNT_RUN.banner = { text: 'PUMP FIRST', color: '#ffd080', t: .8 };
    return;
  }
  bus.emit('shot', r);
  if (r.hit) addPopFromShot(r);
  sfxShot();
}

function addPopFromShot(r) {
  const label = r.penalty ? 'PENALTY ' + fmtPts(r.points || 0) : r.points != null ? '+' + fmtPts(r.points) : (r.wound ? 'WOUNDED' : '');
  if (label) HUNT_RUN.pops.push({ x: r.x, y: r.y, text: label, color: r.penalty ? '#ff7a5a' : '#ffe27a', t: 1.2 });
}

// one step of the whole scene (called from the engine's update)
function huntUpdate(dt, game, I) {
  const H_ = HUNT_RUN;
  if (H_.bot && I.anyPressed()) { exitAttract(game); return; }
  H_.phaseT += dt;
  if (H_.banner) { H_.banner.t -= dt; if (H_.banner.t <= 0) H_.banner = null; }
  if (H_.caption) { H_.caption.t -= dt; if (H_.caption.t <= 0) H_.caption = null; }
  for (const p of H_.pops) p.t -= dt;
  H_.pops = H_.pops.filter(p => p.t > 0);
  updateFx(dt);
  const seg = H_.plan[H_.seg];
  if (H_.phase === 'intro') {
    if (H_.phaseT > 2.6 || (I.pressed('confirm') && !H_.bot)) { H_.phase = 'play'; H_.clock = 0; }
    return;
  }
  if (H_.phase === 'play') { stepPlay(dt, game, I); return; }
  if (H_.phase === 'outro') {
    updateAnimals(dt);
    if (H_.phaseT > 2.4) { recordSeg(); H_.phase = 'tally'; H_.phaseT = 0; }
    return;
  }
  if (H_.phase === 'tally') {
    const auto = H_.bot || H_.mode === 'hub' ? 6 : 99;
    if (H_.phaseT > auto || (I.pressed('confirm') && !H_.bot)) { H_.seg++; startSeg(); }
    return;
  }
  if (H_.phase === 'results') {
    if (H_.bot) { if (H_.phaseT > 8) exitAttract(game); return; }
    if (H_.mode === 'hub') return;
    if (H_.mode !== 'campaign' && H_.mode !== 'single') {
      if (I.pressed('confirm') || I.pressed('cancel')) game.go('menu', { from: 'results' });
      return;
    }
    const I2 = I;
    if (I2.pressed('up')) H_.initials[H_.initCur] = String.fromCharCode(((H_.initials[H_.initCur].charCodeAt(0) - 65 + 1) % 26) + 65);
    if (I2.pressed('down')) H_.initials[H_.initCur] = String.fromCharCode(((H_.initials[H_.initCur].charCodeAt(0) - 65 + 25) % 26) + 65);
    if (I2.pressed('right')) H_.initCur = Math.min(2, H_.initCur + 1);
    if (I2.pressed('left')) H_.initCur = Math.max(0, H_.initCur - 1);
    if (I2.pressed('confirm')) {
      H_.savedRank = SAVE.saveRecord(H_.initials.join(''), H_.totals.points, H_.mode === 'campaign' ? 'Hunt-Off' : H_.hunt.name);
      game.go('lodge', { from: 'results' });
    }
    if (I2.pressed('cancel')) game.go('menu', { from: 'results' });
  }
}

function exitAttract(game) {
  HUNT_RUN.bot = false;
  game.go('title', { from: 'attract' });
}

// ---- drawing the hunt --------------------------------------------------------------------------------------------------
function huntDraw(r) {
  // after the last segment the results screen is up: the HUD keeps the last segment's name
  const seg = HUNT_RUN.plan[Math.min(HUNT_RUN.seg, HUNT_RUN.plan.length - 1)];
  const world = HUNT_RUN.world, hunt = HUNT_RUN.hunt;
  r.overlay(g => {
    const W = r.W, H = r.H, t = r.game.time;
    if (!world) return;
    paintLand(g, W, H, hunt, world, t);
    const sorted = LIVE.slice().sort((a, b) => a.d - b.d);
    for (const a of sorted) paintAnimal(g, W, H, a, t);
    paintFrontTrees(g, W, H, hunt, world);
    paintFx(g, W, H);
    if (HUNT_RUN.phase === 'play' || HUNT_RUN.phase === 'outro') drawGhosts(g, W, H, t);
    if (HUNT_RUN.phase === 'play') drawReticle(g, W, H, t, r);
    for (const p of HUNT_RUN.pops) {
      const k = clampN(p.t / 1.2, 0, 1);
      E.font.text(g, p.text, p.x * W, p.y * H - 14 - (1 - k) * 12, p.color, { align: 'center', outline: '#000' });
    }
    if (HUNT_RUN.phase !== 'results') drawHud(g, W, H, t, r, seg);
    if (HUNT_RUN.phase === 'tally') drawTally(g, W, H, t, r);
    if (HUNT_RUN.phase === 'results') drawResults(g, W, H, t, r);
    if (HUNT_RUN.phase === 'intro' && HUNT_RUN.banner) drawBanner(g, W, H, HUNT_RUN.banner);
    drawCaption(g, W, H, HUNT_RUN.caption);
  });
}

function drawBanner(g, W, H, b) {
  const a = clampN(b.t / .4, 0, 1);
  E.ui.box(g, W * .15, H * .36, W * .7, H * .16, { bg: ['#1c1408', '#2c1e0c'], alpha: a * .9 });
  E.font.title(g, b.text, W / 2, H * .4, { scale: Math.max(1, Math.round(H / 170)), colors: ['#f7e7a0', '#d88a30'], align: 'center' });
}

function drawCaption(g, W, H, c) {
  if (!c) return;
  const line = c.who + ': ' + c.text;
  const w = Math.min(W * .56, 640), x = (W - w) / 2, y = H * .13, lines = E.font.wrap(line, w - 18, {});
  E.ui.box(g, x, y, w, 14 + lines.length * 12, { bg: ['#1a1024', '#120a1a'], alpha: .85 });
  lines.forEach((ln, i) => E.font.text(g, ln, x + 10, y + 8 + i * 12, '#fff3d0', { outline: '#000' }));
}

function drawHud(g, W, H, t, r, seg) {
  const s = HUNT_RUN.site, T = HUNT_RUN.totals;
  const h = Math.max(1, Math.round(H / 240));
  E.ui.box(g, 6, 6, W * .34, H * .085, { bg: ['#1c1408', '#2c1e0c'], alpha: .7 });
  E.font.text(g, HUNT_RUN.hunt.name.toUpperCase() + ' • ' + huntCard(seg).split(' • ')[0], 14, 12, '#f3d98a', { outline: '#000' });
  const left = seg.type === 'site' ? (seg.seconds === Infinity ? '' : 'TIME ' + Math.max(0, Math.ceil(seg.seconds - HUNT_RUN.clock)) + 'S') : seg.type === 'bonus' ? 'TIME ' + Math.max(0, Math.ceil(seg.seconds - HUNT_RUN.clock)) + 'S' : '';
  E.font.text(g, left, 14, 12 + 12 * h, '#ffffff', { outline: '#000' });
  if (seg.type === 'range') E.font.text(g, 'HITS ' + (s.shots_hit || 0) + '/' + seg.goal, 14, 12 + 24 * h, '#c8f0a0', { outline: '#000' });
  if (seg.type === 'site' && seg.bucks) {
    E.font.text(g, 'BUCKS ' + s.bagged + '/' + s.bucksWanted, 14, 12 + 24 * h, s.doeShots ? '#ff7a5a' : '#c8f0a0', { outline: '#000' });
  }
  E.ui.box(g, W - W * .32 - 6, 6, W * .32, H * .085, { bg: ['#1c1408', '#2c1e0c'], alpha: .7 });
  E.font.text(g, 'SCORE ' + fmtPts(T.points + s.points), W - W * .32 + 6, 12, '#ffe27a', { outline: '#000' });
  if (GUN.benched) E.font.text(g, 'BENCHED', W - W * .32 + 6, 12 + 12 * h, '#ff7a5a', { outline: '#000' });
  // the rifle: the tube's shells, the chamber, the reload
  const y0 = H - H * .2, pipW = Math.max(6, Math.round(W / 60));
  E.ui.box(g, 6, y0 - 6, W * .3, H * .18, { bg: ['#1c1408', '#2c1e0c'], alpha: .7 });
  for (let i = 0; i < TUNING.tubeSize; i++) {
    const on = DEV.infiniteShells || i < GUN.tube;
    E.px.rect(g, 14 + i * (pipW + 4), y0 + 6, pipW, H * .03, on ? '#d8b070' : '#3a2a1a');
  }
  const ch = GUN.chamber === 'loaded' ? 'CHAMBER LOADED' : GUN.chamber === 'racking' ? 'RACKING...' : GUN.reloadT > 0 ? 'RELOADING ' + GUN.reloadT.toFixed(1) + 'S' : 'PUMP (' + (I_label('pump')) + ')';
  E.font.text(g, ch, 14, y0 + 6 + H * .05, GUN.chamber === 'loaded' ? '#9fe08a' : '#ffb080', { outline: '#000' });
  E.font.text(g, 'CALLS ' + GUN.calls, 14, y0 + 6 + H * .05 + 12, '#d0c8e8', { outline: '#000' });
  // prompts in the player's own buttons, the last device used
  const prompt = [[I_label('fire'), 'SHOOT'], [I_label('pump'), 'PUMP'], [I_label('scope'), 'SCOPE'], [I_label('call'), 'CALL']];
  let px = W - 10;
  const strs = prompt.map(p => p[0] + ' ' + p[1]).join('   ');
  E.font.text(g, strs, W / 2, H - 12, '#ffffff', { align: 'center', outline: '#000' });
  if (HUNT_RUN.bot) E.font.text(g, 'ATTRACT • PRESS ANY KEY', W / 2, 12, '#ffd080', { align: 'center', outline: '#000' });
}

// the prompt in the player's own button; a scripted tap is not a device, so it shows the keyboard's name
function I_label(a) {
  if (!GAME) return a;
  const dev = GAME.input.lastDevice === 'touch' ? 'keyboard' : GAME.input.lastDevice;
  return GAME.input.label(a, dev);
}

function drawReticle(g, W, H, t, r) {
  const [ax, ay] = aimPoint(t);
  const cx = ax * W, cy = ay * H;
  const rad = Math.max(8, H * (GUN.scoped ? .16 : .045));
  if (GUN.scoped) {
    // the scope: black outside a ring, a crosshair in it
    for (let y = 0; y < H; y++) {
      const dy = y - cy, inside = Math.abs(dy) < rad;
      const hw = inside ? Math.sqrt(rad * rad - dy * dy) : 0;
      if (!inside) { E.px.rect(g, 0, y, W, 1, '#000000'); continue; }
      const l = cx - hw, rr = cx + hw;
      if (l > 0) E.px.rect(g, 0, y, l, 1, '#000000');
      if (rr < W) E.px.rect(g, rr, y, W - rr, 1, '#000000');
    }
    E.px.line(g, cx - rad, cy, cx + rad, cy, '#e8e8e0', 1);
    E.px.line(g, cx, cy - rad, cx, cy + rad, '#e8e8e0', 1);
  } else {
    E.px.line(g, cx - rad, cy, cx - rad * .35, cy, '#ffffff', 2);
    E.px.line(g, cx + rad * .35, cy, cx + rad, cy, '#ffffff', 2);
    E.px.line(g, cx, cy - rad, cx, cy - rad * .35, '#ffffff', 2);
    E.px.line(g, cx, cy + rad * .35, cx, cy + rad, '#ffffff', 2);
  }
  if (GUN.recoil > .05) E.px.disc(g, cx, cy, rad * GUN.recoil * .5, '#ff8040');
}

function drawTally(g, W, H, t, r) {
  const s = HUNT_RUN.site;
  E.ui.box(g, W * .04, H * .08, W * .92, H * .84, { bg: ['#1a1024', '#0e0818'], alpha: .94 });
  E.font.title(g, 'THE SHOT CHART', W / 2, H * .11, { scale: Math.max(1, Math.round(H / 200)), colors: ['#f7e7a0', '#d88a30'], align: 'center' });
  // the x-ray: a silhouette of the hunt's big game, with every shot at a body on it
  const bx = W * .12, by = H * .26, bw = W * .34, bh = H * .5;
  E.ui.box(g, bx - 8, by - 8, bw + 16, bh + 16, { bg: '#080410', gradient: false });
  const sp = HUNT_RUN.hunt.trophy;
  const ghost = { species: sp, dir: 1, x: .5, fy: .5 + .42 * .9, hn: .44, state: 'stare', antlers: 8, fall: 0, phase: 0 };
  // the silhouette in the middle of the chart, drawn at its real size
  const sx = bx + bw / 2, sy = by + bh * .9;
  const h = bh * .6;
  paintAnimal(g, W, H, { ...ghost, x: sx / W, fy: sy / H, hn: h / H, dir: 1 }, t);
  const bwPx = h * SPECIES[sp].aspect;
  for (const e of s.log) {
    if (!e.hit || e.u == null) continue;
    const dx = (sx - bwPx / 2) + e.u * bwPx, dy = sy - h + e.v * h;
    const col = e.zone === 'heart' || e.zone === 'lungs' || e.zone === 'head' || e.zone === 'neck' ? '#ff4a3a' : '#ffb040';
    E.px.disc(g, dx, dy, Math.max(3, H * .012), col);
  }
  // the numbers on the right
  const rx = W * .5, ry = H * .26, lh = Math.max(16, H * .055);
  const lines = [
    ['SITE', s.name],
    ['BUCKS BAGGED', s.bagged + (s.bucksWanted ? ' of ' + s.bucksWanted : '')],
    ['SHOTS', String(s.shots)],
    ['HITS', String(s.shots_hit || 0)],
    ['MISSES', String(s.misses)],
    ['DOES', s.doeShots ? s.doeShots + ' (BENCHED)' : 'NONE, GOOD'],
    ['SITE POINTS', fmtPts(s.points)],
    ['RUN TOTAL', fmtPts(HUNT_RUN.totals.points + s.points)],
  ];
  lines.forEach(([k, v], i) => {
    E.font.text(g, k, rx, ry + i * lh, '#a89ccc', { outline: '#000' });
    E.font.text(g, v, rx + W * .26, ry + i * lh, '#ffffff', { outline: '#000' });
  });
  E.font.text(g, 'RED: VITALS   ORANGE: WOUNDS   DOTS ARE WHERE THE ROUNDS LANDED', W / 2, H * .83, '#c8b8e8', { align: 'center', outline: '#000' });
  E.font.text(g, 'PRESS ' + I_label('confirm') + ' TO CONTINUE', W / 2, H * .88, '#ffffff', { align: 'center', outline: '#000' });
}

function drawResults(g, W, H, t, r) {
  const T = HUNT_RUN.totals;
  E.ui.box(g, W * .08, H * .1, W * .84, H * .8, { bg: ['#1a1024', '#0e0818'], alpha: .95 });
  if (HUNT_RUN.mode === 'party') {
    const order = HUNT_RUN.party.map((pts, i) => ({ pts, i })).sort((a, b) => b.pts - a.pts);
    E.font.title(g, 'PLAYER ' + (order[0].i + 1) + ' WINS THE HOT SEAT', W / 2, H * .16, { scale: Math.max(1, Math.round(H / 220)), colors: ['#f7e7a0', '#d88a30'], align: 'center' });
    order.forEach((o, k) => E.font.text(g, 'PLAYER ' + (o.i + 1) + '     ' + fmtPts(o.pts), W / 2, H * .34 + k * H * .07, k === 0 ? '#ffe27a' : '#ffffff', { align: 'center', outline: '#000' }));
    E.font.text(g, 'EACH PLAYER TOOK EVERY SITE ON THE SAME SEED', W / 2, H * .8, '#c8c0e0', { align: 'center', outline: '#000' });
    E.font.text(g, I_label('confirm') + ' TO THE MENU', W / 2, H * .88, '#ffffff', { align: 'center', outline: '#000' });
    return;
  }
  if (HUNT_RUN.mode === 'practice') {
    E.font.title(g, 'PRACTICE RANGE', W / 2, H * .16, { scale: Math.max(1, Math.round(H / 220)), colors: ['#f7e7a0', '#d88a30'], align: 'center' });
    E.font.text(g, 'UNCLE DUB SAYS: THAT\'S HOW IT\'S DONE. NOTHING SAVED.', W / 2, H * .3, '#ffffff', { align: 'center', outline: '#000' });
    E.font.text(g, 'POINTS SCORED  ' + fmtPts(T.points) + '    HITS ' + T.hits, W / 2, H * .4, '#ffe27a', { align: 'center', outline: '#000' });
    E.font.text(g, I_label('confirm') + ' TO THE MENU', W / 2, H * .88, '#ffffff', { align: 'center', outline: '#000' });
    return;
  }
  E.font.title(g, HUNT_RUN.mode === 'hub' ? 'HUB HUNT-OFF' : HUNT_RUN.mode === 'practice' ? 'PRACTICE OVER' : 'THE HUNT-OFF', W / 2, H * .14, { scale: Math.max(1, Math.round(H / 200)), colors: ['#f7e7a0', '#d88a30'], align: 'center' });
  E.font.text(g, 'TOTAL  ' + fmtPts(T.points), W / 2, H * .3, '#ffe27a', { align: 'center', outline: '#000' });
  const rivals = HUNT_RUN.mode === 'campaign' ? HUNTS.map(h => h.rival).slice(0, 3) : [];
  const standing = HUNT_RUN.mode === 'campaign' ? 1 + HUNTS[0].rivalScores.filter(sc => sc > T.points).length : 0;
  E.font.text(g, 'BUCKS BAGGED  ' + T.bagged + '    TROPHY ' + (T.trophy ? 'YES' : 'NO') + '    BONUS ' + fmtPts(T.bonus), W / 2, H * .38, '#cfc8e8', { align: 'center', outline: '#000' });
  if (HUNT_RUN.mode === 'campaign') E.font.text(g, 'STANDING: #' + standing + ' AGAINST THE LODGE REGULARS', W / 2, H * .44, '#ffffff', { align: 'center', outline: '#000' });
  if (HUNT_RUN.mode === 'campaign' || HUNT_RUN.mode === 'single') {
    E.font.text(g, 'ENTER YOUR INITIALS', W / 2, H * .55, '#a89ccc', { align: 'center', outline: '#000' });
    const letters = HUNT_RUN.initials.map((c, i) => (i === HUNT_RUN.initCur && Math.floor(t * 4) % 2 ? '_' : c)).join(' ');
    E.font.title(g, letters, W / 2, H * .6, { scale: Math.max(1, Math.round(H / 200)), colors: ['#ffffff', '#ffffff'], align: 'center' });
    E.font.text(g, 'UP/DOWN LETTER  ' + I_label('confirm') + ' SAVE  ' + I_label('cancel') + ' SKIP', W / 2, H * .78, '#ffffff', { align: 'center', outline: '#000' });
  }
  if (HUNT_RUN.mode === 'hub') E.font.text(g, 'THE HUB HAS YOUR SCORE. GOOD SHOOTING.', W / 2, H * .72, '#ffffff', { align: 'center', outline: '#000' });
}
