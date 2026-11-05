// The hunt scene: every mode's flow as a queue of segments in one scene (the loaded land, timers and particles
// survive between them): the hunt card and briefing, three sites with tallies and walk-ins, the trophy (legend, the
// encounter, the Trophy Cam), the bonus game and its tally, results with rank, rivals and initials, then the next hunt
// (the Hunt-Off campaign autosaves) or the ceremony. Modes: hunt-off, single, party, quickdraw, bonus, range, attract.
(() => {
const B = BB, E = B.E, px = E.px, game = B.game;
const HUNTS = ['hollow', 'bugle', 'muskeg'];
B.HUNT_IDS = HUNTS;

// ---- a run ----
B.newRun = (o = {}) => {
  const run = Object.assign({ mode: 'single', hunts: ['hollow'], hi: 0, seed: (o.seed || 1) >>> 0, totals: {}, results: [] }, o);
  if (!run.players) run.players = [new B.Player(0, game.input)];
  return run;
};
const card = (title, sub, dur = 2.6, extra) => Object.assign({ kind: 'card', title, sub, dur }, extra || {});
B.huntQueue = (run, h) => {
  const H = B.get('hunt', h), q = [], m = run.mode;
  if (m === 'bonus') { const b = B.get('bonus', run.bonus); return [card(b.name, b.rules, 2.4), { kind: 'story', lines: b.intro.map(l => [b.host, l]) }, { kind: 'site', id: b.site }, { kind: 'bonusTally' }, { kind: 'results' }]; }
  if (m === 'range') return [card("UNCLE DUB'S RANGE", 'Seven stations. Learn the rifle.', 2.2), { kind: 'story', lines: 'range-intro' }, { kind: 'site', id: 'range' }, { kind: 'results' }];
  if (m === 'quickdraw') {
    for (const id of HUNTS) { const HH = B.get('hunt', id); q.push(card('QUICK DRAW', HH.name.toUpperCase() + ' · 45 SECONDS', 1.8, { hunt: id })); q.push({ kind: 'site', id: HH.sites[0], o: { timeBox: true, time: 45 } }); q.push({ kind: 'tally' }); }
    q.push(card('SAUCER SEASON', 'Clays 75. Golden clay 500.', 1.8, { hunt: 'bugle' }), { kind: 'site', id: 'bonus-saucer' }, { kind: 'bonusTally' }, { kind: 'results' });
    return q;
  }
  q.push(card(H.name.toUpperCase(), H.when.toUpperCase() + ' · ' + H.species.toUpperCase(), 2.6, { hunt: h, big: true }));
  if (m === 'hunt-off' && run.hi === 0) q.push({ kind: 'story', lines: 'welcome' }, { kind: 'story', lines: 'rivals' });
  q.push({ kind: 'story', lines: h + '-intro', kit: true });
  H.sites.forEach((s, i) => {
    q.push({ kind: 'site', id: s }, { kind: 'tally' });
    q.push({ kind: 'walk', to: i < 2 ? B.get('site', H.sites[i + 1]).vantage : B.get('site', B.get('trophy', H.trophy).site).vantage });
  });
  const T = B.get('trophy', H.trophy);
  q.push(card('TROPHY', T.name + ' · ' + T.label, 2.4, { trophy: true }), { kind: 'story', lines: T.story.map(l => ['dub', l]).concat([['dub', T.rules]]) }, { kind: 'site', id: T.site }, { kind: 'tally' });
  const b = B.get('bonus', H.bonus);
  q.push({ kind: 'walk', to: B.get('site', b.site).vantage }, card('BONUS: ' + b.name, b.rules, 2.4), { kind: 'story', lines: b.intro.map(l => [b.host, l]) }, { kind: 'site', id: b.site }, { kind: 'bonusTally' }, { kind: 'results' });
  return q;
};

// ---- the scene ----
let run, play, seg, q, lens, tally, viewWorld, sceneT = 0, trophyCam = null, initials = null, results = null;
B.curRun = () => run;
const S = B.huntScene = {
  get pausable() { return !B.devOpen && !(B.dev && B.dev.freeCam); }, camera: { zoom: false }, touch: [],
  enter(data) {
    run = data && data.run ? data.run : B.newRun();
    B.reseed(run.seed); B.resetIds();
    game.timeScale = B.TUNING.timeScale;
    play = B.play = new B.Play({ players: run.players, mode: run.mode, shared: run.players.length > 1, W: game.W || 480, H: game.H || 270 });
    for (const p of run.players) { p.huntScore = 0; }
    B.inPlay = true; B.clearHud();
    startHunt(data && data.segment);
    if (B.pendingDev) { B.pendingDev = false; B.openDev(); }
  },
  exit() { B.inPlay = false; game.timeScale = 1; trophyCam = null; B.site = null; B.music('hoedown'); },
  update(dt) {
    sceneT += dt;
    const real = game.timeScale > 0 ? dt / game.timeScale : dt;
    if (run.mode === 'attract' && sceneT > .4 && B.activity()) { B.stopAttract(); return; }
    B.stepDevPending();
    if (B.devOpen) B.updateDev(real);
    S.freeCam = seg && seg.kind === 'site' && !B.devOpen && B.stepFreeCam(real, play.site);
    if (!trophyCam) game.timeScale = B.TUNING.timeScale * (B.CHEAT.slow ? .25 : 1);
    play.resize(game.W || 480, game.H || 270);
    B.stepHud(real); B.stepBarks(real);
    if (play.site && seg && seg.kind === 'site') B.ambience(real, play.site.def.hunt);
    if (B.talk.update(real) && seg && seg.kind !== 'site') { if (game.input.pressed('cancel')) B.skipStory(); return; }
    if (!seg) return;
    stepSeg(dt, real);
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.overlay(g => {
      const site = play && play.site;
      const showSite = seg && (seg.kind === 'site' || seg.kind === 'tally' || seg.kind === 'bonusTally') && site;
      if (showSite) {
        B.drawWorld(g, W, H, { site, time: sceneT, fx: play.fx, players: seg.kind === 'site' ? play.players : null, t: play.t });
        B.drawOverlays(g, W, H, { site, time: sceneT, players: seg.kind === 'site' ? play.players : null, play });
        if (seg.kind === 'site') {
          B.drawTags(g, play);
          B.drawHud(g, W, H, play, { corner: !!game.cornerArea() });
          drawRival(g, W, H);
          for (const p of play.players) if (!p.ghost && !(p.scopeK > .5)) B.drawReticle(g, p, p.ret[0], p.ret[1]);
          for (const p of play.players) if (!p.ghost && p.scopeK > .5) B.drawReticle(g, Object.assign({}, p, { shape: 'none' }), -99, -99);
          drawPrompts(g, W, H);
          if (site.def.range) drawRange(g, W, H, site);
          if (trophyCam) drawTrophyCam(g, W, H);
          if (game.input.down('board') && !B.HUB) drawBoard(g, W, H);
          if (site.t < 2.2 && !site.def.range) { const k = site.t / 2.2; if (k < .9 || Math.floor(site.t * 10) % 2) { B.title(g, site.def.name.toUpperCase(), W / 2, H * .38, 3); if (site.def.intro) B.text(g, site.def.intro, W / 2, H * .38 + 30, '#fff4d0', { align: 'center' }); } }
          B.drawDevOverlays(g, W, H, play); B.drawFreeCam(g, W, H, site);
          if (play.flatten > 0) { px.blend(g, Math.min(.8, play.flatten), 'normal', () => px.rect(g, 0, 0, W, H, '#100804')); }
        }
        if (seg.kind === 'tally' && tally) tally.draw(g, W, H);
        if (seg.kind === 'bonusTally') drawBonusTally(g, W, H);
      } else if (lens && viewWorld) {
        B.drawWorld(g, W, H, { world: viewWorld, lens, time: sceneT, actors: [] });
        if (seg && seg.kind === 'walk') { px.blend(g, .3, 'normal', () => { px.rect(g, 0, 0, W, 14, '#000'); px.rect(g, 0, H - 14, W, 14, '#000'); }); B.text(g, 'WALKING TO ' + (seg.name || '').toUpperCase(), W / 2, H - 11, '#e8dcc8', { align: 'center' }); }
      } else px.rect(g, 0, 0, W, H, '#0a0806');
      if (seg && seg.kind === 'card') drawCard(g, W, H, seg);
      if (seg && seg.kind === 'story' && seg.kit) drawKit(g, W, H);
      if (seg && seg.kind === 'results') drawResults(g, W, H);
      if (initials) initials.draw(g, W, H);
      if (run.mode === 'attract' && B.drawDemoBanner) B.drawDemoBanner(g, W, H);
      B.drawDev(g, W, H);
    });
    B.talk.draw(r);
  }
};

function startHunt(at) {
  const h = run.hunts[run.hi] || 'hollow';
  q = run.queue ? run.queue.map(x => Object.assign({}, x)) : B.huntQueue(run, h);
  for (const p of run.players) p.huntScore = 0;
  viewWorld = B.loadWorld(run.mode === 'bonus' ? B.get('bonus', run.bonus).hunt : run.mode === 'range' ? 'range' : run.mode === 'quickdraw' ? 'hollow' : h);
  const first = q.find(s => s.kind === 'site');
  setView(first ? B.get('site', first.id).vantage : null);
  if (at) { const i = q.findIndex(s => s.kind === at.kind && (!at.id || s.id === at.id)); if (i > 0) q.splice(0, i); }
  B.music('hoedown');
  next();
}
function setView(vid, world) {
  viewWorld = world || viewWorld; if (!vid) return;
  const v = viewWorld.vantages[vid]; if (!v) return;
  lens = new B.Lens({ x: v.x, y: v.y, z: v.z, yaw: v.yaw, pitch: 3, fov: 30, W: game.W || 480, H: game.H || 270 });
  lens.vid = vid;
}
function next() {
  seg = q.shift() || null; if (!seg) { finishHunt(); return; }
  seg.t = 0; tally = null;
  const k = seg.kind;
  if (k === 'card' && seg.hunt) { viewWorld = B.loadWorld(seg.hunt); setView(Object.keys(viewWorld.vantages)[0]); }
  if (k === 'story') { B.story(seg.lines, () => { if (seg && seg.kind === 'story') next(); }); }
  if (k === 'site') {
    const def = B.get('site', seg.id);
    viewWorld = B.loadWorld(def.hunt);
    const site = play.startSite(seg.id, Object.assign({ wave: run.hi * 10 }, seg.o || {}));
    B.site = site; B.clearHud();
    B.music(def.bonus ? 'jamboree' : def.range ? 'lodgefire' : 'stalk', { restart: !def.bonus });
    if (run.mode === 'attract' || run.botAll) for (const p of run.players) if (!p.bot) p.bot = new B.Bot(p, { skill: 'expert', cheat: run.mode === 'attract' });
  }
  if (k === 'tally') { tally = new B.Tally(play, { auto: run.mode === 'attract' || run.autoTally, input: game.input, standings: run.mode === 'hunt-off' ? drawStandingsStrip : null }); B.music('results'); }
  if (k === 'walk') { const v0 = play.site ? play.site.v : lens; const v1 = viewWorld.vantages[seg.to]; seg.from = { x: v0.x, y: v0.y, z: v0.z, yaw: play.site ? play.site.lens.yaw : v0.yaw }; seg.to1 = v1; seg.name = v1.name; seg.dur = 3.6; lens = new B.Lens({ x: v0.x, y: v0.y, z: v0.z, yaw: seg.from.yaw, pitch: 2, fov: 32, W: game.W, H: game.H }); B.music('hoedown'); }
  if (k === 'bonusTally') bonusBooks();
  if (k === 'results') { results = computeResults(); B.music('results'); }
}
function stepSeg(dt, real) {
  seg.t += real;
  const I = game.input, k = seg.kind;
  if (k === 'card') { if (seg.t > seg.dur || (seg.t > .5 && (I.pressed('confirm') || I.pressed('fire')))) next(); if (lens) lens.yaw += real * .02; return; }
  if (k === 'story') { if (lens) lens.yaw += real * .015; return; }
  if (k === 'site') {
    if (B.CHEAT.freeze && !trophyCam) return;
    play.update(dt, { held: B.devOpen || S.freeCam });
    if (trophyCam) stepTrophyCam(real);
    const site = play.site;
    // the music's layers: drums while bucks are on screen
    if (!site.ended) { const on = site.herd.list.some(a => a.cat === 'animal' && a.legal && a.live && a.onScreen); B.layer('drums', on ? 1 : 0); }
    if (site.ended && site.endT > (site.flattened ? 2.8 : 1.6) && !trophyCam) next();
    return;
  }
  if (k === 'tally') { tally.update(real, I); if (tally.done) next(); return; }
  if (k === 'walk') {
    const u = Math.min(1, seg.t / seg.dur), e = E.ease.inOutSine(u), f = seg.from, t = seg.to1;
    const x = B.lerp(f.x, t.x, e), y = B.lerp(f.y, t.y, e);
    const dirYaw = Math.atan2(t.y - f.y, t.x - f.x);
    lens.x = x; lens.y = y; lens.z = Math.max(viewWorld.groundAt(x, y) + 1.8 + Math.sin(seg.t * 9) * .05, B.lerp(f.z, t.z, e));
    lens.yaw = u < .2 ? B.lerp(f.yaw, dirYaw, u / .2) + 0 : u > .8 ? dirYaw + B.wrapA(t.yaw - dirYaw) * ((u - .8) / .2) : dirYaw;
    if (u >= 1 || (seg.t > .4 && (I.pressed('confirm') || I.pressed('fire')))) next();
    return;
  }
  if (k === 'bonusTally') { if ((seg.t > .8 && (I.pressed('confirm') || I.pressed('fire'))) || seg.t > (run.mode === 'attract' || run.autoTally ? 3 : 14)) next(); return; }
  if (k === 'results') {
    if (initials) { initials.update(real, I); if (initials.done) initials = null; return; }
    if ((seg.t > 1 && (I.pressed('confirm') || I.pressed('fire'))) || (run.autoTally && seg.t > 2.5) || run.mode === 'attract' && seg.t > 4) next();
    return;
  }
}
B.skipSegment = () => { if (!seg) return; if (seg.kind === 'site' && play.site) play.site.end('time'); else if (seg.kind === 'story') B.skipStory(); else next(); };

// ---- the Trophy Cam: slow motion along the shot's ray, x-ray flash at impact ----
B.bus.on('kill', e => {
  if (!play || !play.site || e.p.ghost) return;
  const mode = B.setting('trophyCam'); if (mode === 'off' || play.shared || run.mode === 'hub') return;
  const site = play.site, last = site.herd.list.filter(a => a.cat === 'animal' && a.legal && !a.trophy).every(a => !a.live) && !site.def.trophy;
  if (!(e.a.trophy || (mode === 'on' && last && e.zone === 'heart'))) return;
  if (game.reduceMotion) { trophyCam = { t: 0, still: true, a: e.a, dur: 1.4 }; return; }
  const L = site.lens; trophyCam = { t: 0, dur: 1.6, a: e.a, from: [L.x, L.y, L.z, L.fov], to: e.res.point, ray: e.res.ray };
  B.sfx('slowmo');
});
function stepTrophyCam(real) {
  const c = trophyCam; c.t += real; const site = play.site;
  if (!c.still) {
    game.timeScale = c.t < 1.2 ? .15 : B.TUNING.timeScale;
    const u = Math.min(1, c.t / 1.1), e = E.ease.inOutCubic(u), back = c.t > 1.25 ? Math.min(1, (c.t - 1.25) / .35) : 0;
    const tx = c.to[0] - c.ray[0] * 3.5, ty = c.to[1] - c.ray[1] * 3.5, tz = c.to[2] - c.ray[2] * 3.5 + .4;
    site.camOverride = L => { const k = e * (1 - back); L.x = B.lerp(c.from[0], tx, k); L.y = B.lerp(c.from[1], ty, k); L.z = B.lerp(c.from[2], tz, k); L.fov = B.lerp(c.from[3], 40, k); };
  }
  if (c.t >= c.dur) { trophyCam = null; site.camOverride = null; game.timeScale = B.TUNING.timeScale; }
}
function drawTrophyCam(g, W, H) {
  const c = trophyCam;
  px.blend(g, .5, 'normal', () => { px.rect(g, 0, 0, W, 18, '#000'); px.rect(g, 0, H - 18, W, 18, '#000'); });
  B.text(g, 'TROPHY CAM', 8, 5, '#f0c030');
  if (c.still || (c.t > .9 && c.t < 1.3)) { const cd = B.xrayCard(c.a, 160, 90); if (cd.cv) { g.drawImage(cd.cv, Math.round(W / 2 - 80), Math.round(H / 2 - 45)); } }
  if (!c.still && c.t < 1) { const s = play.site.lens.project(c.to[0], c.to[1], c.to[2]); if (s) { const k = c.t / 1; px.line(g, Math.round(W / 2), Math.round(H * .6), Math.round(B.lerp(W / 2, s[0], k)), Math.round(B.lerp(H * .6, s[1], k)), '#fff4c0', 2); } }
}

// ---- the lost-animal penalty: the last player to hit it ----
B.bus.on('lost', e => { if (!play || !play.site) return; const h = e.a.hits[e.a.hits.length - 1]; const p = h && play.players.find(q => q.n === h.p); if (p && !p.ghost) { p.site.penalties.push(['LOST', -100]); play.addScore(p, -100, [e.a.x, e.a.y, e.a.z], '-100 LOST', '#ff5040'); } });

// ---- prompts in play: shown when relevant, by the device used last ----
function drawPrompts(g, W, H) {
  const p = play.players[0]; if (!p || p.bot || play.site.ended) return;
  const site = play.site, list = [];
  if (!p.chambered && p.rack <= 0 && p.reload <= 0 && !p.benched) list.push(['pump', p.rounds > 0 ? 'PUMP!' : 'RELOAD!']);
  else if (p.pumpPrompt > 0) list.push(['pump', 'PUMP!']);
  if (!site.def.bonus && (B.records.stats.hunts < 2 || site.t < 8)) {
    const far = site.herd.list.some(a => a.cat === 'animal' && a.legal && a.live && a.onScreen && Math.hypot(a.x - site.lens.x, a.y - site.lens.y) > 85);
    if (far && !p.scoped) list.push(['scope', 'SCOPE']); if (p.scoped) list.push(['breath', 'HOLD BREATH']);
    if (p.calls > 0 && site.t < 10 && !site.def.range) list.push(['call', 'CALL']);
  }
  if (list.length) B.drawPrompts(g, list.slice(0, 3), p.input, W / 2, H - 44, 1);
}
// the rival to beat (campaign)
function drawRival(g, W, H) {
  if (run.mode !== 'hunt-off' || !B.setting('rivalTag')) return;
  const H0 = B.get('hunt', run.hunts[run.hi]); const v = H0.rivals.dwayne;
  B.text(g, 'DWAYNE ' + B.fmt(v), 8, 42, B.CAST.dwayne.color); B.text(g, 'YOU ' + B.fmt(run.players[0].huntScore), 8, 52, '#ffffff');
}
function drawBoard(g, W, H) {
  const ps = play.players.slice().sort((a, b) => b.huntScore - a.huntScore);
  B.panel(g, W / 2 - 80, H / 2 - 12 - ps.length * 7, 160, 20 + ps.length * 14);
  ps.forEach((p, i) => { B.text(g, (i + 1) + '. ' + p.name, W / 2 - 70, H / 2 - 4 - ps.length * 7 + i * 14, p.color, { scale: 1 }); B.text(g, B.fmt(p.huntScore), W / 2 + 70, H / 2 - 4 - ps.length * 7 + i * 14, '#ffffff', { align: 'right' }); });
}
function drawStandingsStrip(g, x, y, w) {
  const H0 = B.get('hunt', run.hunts[run.hi]), me = run.players[0].huntScore, list = [['YOU', me, '#ffffff'], ['DWAYNE', H0.rivals.dwayne, B.CAST.dwayne.color], ['LORETTA', H0.rivals.loretta, B.CAST.loretta.color], ['EARL', H0.rivals.earl, B.CAST.earl.color]];
  list.sort((a, b) => b[1] - a[1]);
  list.forEach((r, i) => B.text(g, (i + 1) + '.' + r[0] + ' ' + B.fmt(r[1]), x + 10 + i * (w - 20) / 4, y, r[2]));
}
function drawCard(g, W, H, s) {
  const k = Math.min(1, s.t / .3);
  px.blend(g, .45, 'normal', () => px.rect(g, 0, H * .3, W, H * .34, '#0a0806'));
  B.title(g, s.title, W / 2 - (1 - k) * 60, H * .36, s.big ? 4 : 3, s.trophy ? { colors: ['#fff8d0', '#f0c030', '#a06a10'] } : {});
  if (s.sub) B.text(g, s.sub, W / 2, H * .36 + (s.big ? 40 : 32), '#fff4d0', { align: 'center', scale: 1 });
}
function drawKit(g, W, H) {   // the hunt's kit, introduced with its glyphs during the briefing
  const H0 = B.get('hunt', run.hunts[run.hi]), I = game.input;
  B.panel(g, 10, 10, 168, 64, { alpha: .8 });
  B.text(g, 'YOUR KIT', 18, 16, '#f0c060');
  const rows = [['fire', 'PUMP RIFLE · 5 ROUNDS'], ['scope', 'SCOPE · ' + B.TUNING.scopeMag.toFixed(1) + 'X'], ['call', H0.callName || 'CALL']];
  rows.forEach(([a, t], i) => { const w = B.drawGlyph(g, a, I, 18, 28 + i * 14); B.text(g, t, 20 + w, 30 + i * 14, '#e8dcc8'); });
}
function drawRange(g, W, H, site) {
  const R = site.rangeState; if (!R) return; const st = B.get('range', 'stations').list, s = st[R.i];
  B.panel(g, 8, 44, 170, 58, { alpha: .85 });
  B.text(g, 'STATION ' + (R.i + 1) + '/7', 16, 50, '#f0c060'); B.text(g, s.name, 16, 60, '#ffffff', { scale: 1 });
  E.font.wrap(s.goal, 150).forEach((l, i) => B.text(g, l, 16, 72 + i * 9, '#c8d8b0'));
  B.drawPrompts(g, s.prompt.map(a => [a, ({ fire: 'SHOOT', pump: 'PUMP', scope: 'SCOPE', breath: 'BREATH', call: 'CALL' })[a]]), game.input, W / 2, H - 56, 1);
  for (let i = 0; i < 7; i++) B.drawAntlerIcon(g, 16 + i * 12, 90 + 2, R.done.includes(i) ? { fill: '#80e060' } : i === R.i ? { live: true } : {});
}

// ---- bonus books: PERFECT doubles the bonus ----
function bonusBooks() {
  const site = play.site, targets = site.herd.list.filter(a => a.cat === 'target' && !a.protected && a.kind !== 'snowman' && a.kind !== 'snowmoose');
  for (const p of play.players) {
    if (p.ghost) continue;
    const s = p.site, all = targets.length && targets.every(a => a.dead), noMiss = s.shots > 0 && s.hits >= s.shots;
    s.perfect = all && noMiss;
    if (s.perfect) play.addScore(p, s.score, null, 'PERFECT!');
  }
  B.music('results');
}
function drawBonusTally(g, W, H) {
  const site = play.site, b = B.get('bonus', site.def.bonus);
  px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
  B.panel(g, W / 2 - 150, H / 2 - 70, 300, 140);
  B.title(g, b.name, W / 2, H / 2 - 62, 2);
  play.players.filter(p => !p.ghost).forEach((p, i) => {
    const y = H / 2 - 30 + i * 22;
    B.text(g, p.name, W / 2 - 130, y, p.color, { scale: 2 }); B.text(g, B.fmt(p.site.score), W / 2 + 130, y, '#ffffff', { scale: 2, align: 'right' });
    B.text(g, p.site.hits + ' HITS · ' + p.site.shots + ' SHOTS' + (p.site.perfect ? ' · PERFECT! x2' : ''), W / 2, y + 15, p.site.perfect ? '#80ff80' : '#c8b898', { align: 'center' });
  });
  B.drawPrompts(g, [['confirm', 'CONTINUE']], game.input, W / 2, H / 2 + 54);
}

// ---- results: total, rank, rivals, records and initials ----
function modeKey() { return run.mode === 'bonus' ? 'bonus-' + run.bonus : run.mode === 'hunt-off' ? 'hunt-' + run.hunts[run.hi] : run.mode === 'party' || run.mode === 'quickdraw' ? run.mode : 'hunt-' + run.hunts[run.hi]; }
function computeResults() {
  const h = run.hunts[run.hi], H0 = run.mode === 'bonus' || run.mode === 'range' || run.mode === 'quickdraw' ? null : B.get('hunt', h), R = B.records;
  const ps = run.players.filter(p => !p.ghost).slice().sort((a, b) => b.huntScore - a.huntScore);
  const res = { hunt: h, players: ps.map(p => ({ p, score: p.huntScore, rank: H0 ? B.rankFor(p.huntScore, H0.par) : null })), mode: run.mode };
  if (run.mode !== 'attract') {
    R.stats.hunts++;
    for (const p of run.players) { if (p.ghost || p.bot) continue; const s = p.stats; R.stats.shots += s.shots; R.stats.hits += s.hits; R.stats.bucks += s.bucks; R.stats.does += s.does; R.stats.critters += s.critters; R.stats.longest = Math.max(R.stats.longest, Math.round(s.longest)); for (const k in s) s[k] = 0; }
    const key = modeKey(); R.best[key] = Math.max(R.best[key] || 0, ps[0] ? ps[0].huntScore : 0);
    if (run.mode === 'range' && play.site && play.site.rangeState && play.site.rangeState.finished) R.range = true;
    B.saveRecords();
    if (ps[0] && !ps[0].bot && run.mode !== 'range' && B.qualifies(key, ps[0].huntScore)) initials = new Initials(ps[0], key);
  }
  if (run.mode === 'hunt-off' && H0) {
    res.rivals = [['DWAYNE', H0.rivals.dwayne], ['LORETTA', H0.rivals.loretta], ['EARL', H0.rivals.earl]];
    const me = run.players[0];
    if (me.huntScore > H0.rivals.dwayne && !run.bragged) { run.bragged = true; play.addScore(me, 1000, null, 'BRAGGING RIGHTS'); res.brag = true; }
    run.totals[h] = me.huntScore;
  }
  return res;
}
// stars, trophies and the best buck go into the records as sites end
B.bus.on('siteEnd', e => {
  if (!run || run.mode === 'attract' || run.mode === 'hub') return;
  const site = e.site, R = B.records, p = run.players[0]; if (!p) return;
  const st = B.stars(p, site); if (!site.def.bonus && !site.def.trophy && !site.def.range) R.stars[site.id] = Math.max(R.stars[site.id] || 0, st);
  for (const a of site.herd.list) if (a.trophy) { const t = R.trophies[a.trophy] || (R.trophies[a.trophy] = { seen: false, bagged: false, best: 0 }); t.seen = true; if (a.dead && a.bagger === p.n) { t.bagged = true; t.best = Math.max(t.best, Math.round(Math.hypot(a.x - site.v.x, a.y - site.v.y))); t.date = new Date().toISOString().slice(0, 10); } }
  for (const k of p.site.kills) if (k.legal && !k.trophy) { const h = site.def.hunt, bb = R.bestBuck[h]; if (!bb || k.pts > bb.pts) R.bestBuck[h] = { pts: k.pts, label: B.get('species', k.species).label(k.points, k.spread), dist: Math.round(k.dist), zone: k.zone }; }
  B.saveRecords();
});
function drawResults(g, W, H) {
  const r = results; if (!r) return;
  px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
  B.panel(g, W / 2 - 170, 18, 340, H - 36);
  const title = run.mode === 'bonus' ? B.get('bonus', run.bonus).name : run.mode === 'range' ? 'RANGE COMPLETE' : run.mode === 'quickdraw' ? 'QUICK DRAW' : B.get('hunt', r.hunt).name.toUpperCase();
  B.title(g, title, W / 2, 26, 3);
  let y = 62;
  r.players.forEach((e, i) => {
    B.text(g, (r.players.length > 1 ? ['1ST', '2ND', '3RD', '4TH'][i] + '  ' : '') + e.p.name, W / 2 - 150, y, e.p.color, { scale: 2 });
    B.text(g, B.fmt(e.p.huntScore), W / 2 + 150, y, '#ffffff', { scale: 2, align: 'right' });
    if (e.rank) B.text(g, e.rank, W / 2 + 150, y + 16, '#f0c060', { align: 'right' });
    y += 30;
  });
  if (r.rivals) { B.text(g, 'THE STANDINGS', W / 2, y, '#c8b898', { align: 'center' }); y += 11; const list = r.rivals.concat([['YOU', run.players[0].huntScore]]).sort((a, b) => b[1] - a[1]); list.forEach((x, i) => { B.text(g, (i + 1) + '. ' + x[0], W / 2 - 80, y, x[0] === 'YOU' ? '#ffffff' : '#c8b898'); B.text(g, B.fmt(x[1]), W / 2 + 80, y, '#ffffff', { align: 'right' }); y += 10; }); if (r.brag) B.text(g, 'YOU BEAT DWAYNE! +1,000 BRAGGING RIGHTS', W / 2, y + 2, '#80ff80', { align: 'center' }); }
  if (run.mode === 'range') B.text(g, B.records.range ? 'THE RANGE BADGE IS ON THE LODGE WALL' : 'COME BACK AND FINISH THE STATIONS', W / 2, y + 6, '#80ff80', { align: 'center' });
  if (!initials) B.drawPrompts(g, [['confirm', 'CONTINUE']], game.input, W / 2, H - 34);
}
class Initials {   // a letter wheel: up/down change, left/right move, confirm takes
  constructor(p, key) { this.p = p; this.key = key; this.name = ['A', 'A', 'A']; this.i = 0; this.done = false; this.t = 0; B.sting('newrecord'); }
  update(dt, I) {
    this.t += dt; const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    const ch = d => { const k = L.indexOf(this.name[this.i]); this.name[this.i] = L[(k + d + L.length) % L.length]; B.sfx('focus'); };
    const II = this.p.input && !this.p.bot ? this.p.input : I;
    if (II.repeat('up')) ch(1); if (II.repeat('down')) ch(-1);
    if (II.pressed('left')) this.i = Math.max(0, this.i - 1); if (II.pressed('right')) this.i = Math.min(2, this.i + 1);
    const c = II.clicked && II.clicked(); if (c && this.rects) for (let k = 0; k < 3; k++) { const r = this.rects[k]; if (c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]) { this.i = k; ch(c[1] < r[1] + r[3] / 2 ? 1 : -1); } }
    if ((II.pressed('confirm') || II.pressed('fire')) && this.t > .4) { if (this.i < 2) this.i++; else { B.addScore(this.key, this.name.join(''), this.p.huntScore); this.done = true; B.sfx('confirm'); } }
  }
  draw(g, W, H) {
    B.panel(g, W / 2 - 110, H / 2 - 40, 220, 92);
    B.text(g, 'NEW HIGH SCORE! ENTER YOUR INITIALS', W / 2, H / 2 - 32, '#f0c060', { align: 'center' });
    this.rects = [];
    for (let k = 0; k < 3; k++) { const x = W / 2 - 45 + k * 32, y = H / 2 - 16; this.rects.push([x - 4, y - 8, 26, 40]); E.ui.box(g, x - 4, y - 2, 26, 30, { bg: k === this.i ? ['#6a3a14', '#3a1e0a'] : ['#2a2018', '#1a140e'], border: k === this.i ? '#ffd070' : '#5a4a36' }); B.text(g, this.name[k], x + 9, y + 5, '#ffffff', { align: 'center', scale: 3 }); if (k === this.i) { px.poly(g, [[x + 9, y - 8], [x + 4, y - 4], [x + 14, y - 4]], '#ffd070'); px.poly(g, [[x + 9, y + 36], [x + 4, y + 32], [x + 14, y + 32]], '#ffd070'); } }
    B.drawPrompts(g, [['up', 'LETTER'], ['confirm', 'NEXT']], this.p.input || game.input, W / 2, H / 2 + 34);
  }
}
B.Initials = Initials;

// ---- after a hunt ----
function finishHunt() {
  const m = run.mode;
  if (m === 'attract') { if (B.attractNext) B.attractNext(); return; }
  if (m === 'hunt-off' && run.hi < run.hunts.length - 1) {
    run.hi++; B.records.campaign = { hi: run.hi, totals: run.totals, seed: run.seed, total: run.players[0].total, bragged: run.bragged }; B.saveRecords();
    const me = run.players[0], H0 = B.get('hunt', run.hunts[run.hi - 1]);
    q = [{ kind: 'story', lines: me.huntScore >= H0.rivals.dwayne ? 'outro-ahead' : 'outro-behind' }];
    seg = null; const rest = () => { startHunt(); };
    B.story(q[0].lines, rest); seg = { kind: 'story', t: 0 };
    return;
  }
  if (m === 'hunt-off') {
    const me = run.players[0], total = me.total, rivalsTotal = HUNTS.reduce((n, h) => n + B.get('hunt', h).rivals.dwayne, 0);
    const champ = total > rivalsTotal; B.records.campaign = null; if (champ) B.records.champion = true;
    if (B.qualifies('hunt-off', total)) B.addScore('hunt-off', 'YOU', total);
    B.saveRecords();
    seg = { kind: 'story', t: 0 };
    B.story(champ ? 'ceremony-win' : 'ceremony-lose', () => { B.sting(champ ? 'fanfare' : 'escaped'); game.go('lodge', { ceremony: true }); });
    return;
  }
  game.go('menu');
}
B.restartSite = () => { if (!seg || seg.kind !== 'site' || !play || !play.site) return; game.resume && game.resume(); const id = play.site.id; for (const p of run.players) { p.huntScore -= p.site.score; p.total -= p.site.score; } trophyCam = null; q.unshift({ kind: 'site', id, o: seg.o }); next(); };
B.restartHunt = () => { if (!run) return; game.resume && game.resume(); for (const p of run.players) { p.total -= p.huntScore; p.huntScore = 0; } startHunt(); };
B.huntDebug = () => ({ seg: seg ? seg.kind : null, segId: seg && seg.id, q: q ? q.map(s => s.kind + (s.id ? ':' + s.id : '')) : [], run, trophyCam: !!trophyCam, initials: !!initials, results });
B.huntInitials = () => initials;
})();
