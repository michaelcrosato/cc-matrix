// ---- AI Hub, ghost mode (AI Hub Session Protocol v1): up to four copies of the hunt, each with its own rifle --------
// Every copy plays the same hunt (the spawns come from AIHub.rng('hunt')). Each copy sends its reticle to the others,
// and shows theirs as ghosts that do not affect anything. The round is three sites of Hollow Creek, three minutes.
// Outside a session (AIHub.active false, or connect() resolving to null) none of this runs and the game is unchanged.
const HUB = { info: null, started: false, ended: false, resultSent: false, progressT: 0, sendT: 0, ghosts: {}, colors: {}, names: {} };
const HUB_ON = () => typeof AIHub !== 'undefined' && AIHub.active;

function hubBoot() {
  if (!HUB_ON()) return;
  AIHub.on('start', () => { HUB.started = true; });
  AIHub.on('time-up', () => { hubFinish(); });
  AIHub.on('end', () => { HUB.ended = true; GAME.audio.music(null); });
  AIHub.on('message', (data, from) => {
    if (!data || data.t !== 'g') return;
    HUB.ghosts[from] = { x: clampN(+data.x || 0, 0, 1), y: clampN(+data.y || 0, 0, 1), at: GAME.time, scoped: !!data.s };
  });
  AIHub.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) return;
    HUB.info = info;
    for (const p of info.players) { HUB.colors[p.id] = p.color; HUB.names[p.id] = p.name; }
    RNG.spawn = AIHub.rng('hunt');
    AIHub.ready();
  });
}

function hubTick(dt, game) {
  if (!HUB_ON() || !HUB.info) return;
  HUB.progressT -= dt;
  if (HUB.progressT <= 0 && HUNT_RUN.phase !== 'results' && HUNT_RUN.mode === 'hub') {
    HUB.progressT = 1;
    AIHub.progress({ score: HUNT_RUN.totals.points + (HUNT_RUN.site ? HUNT_RUN.site.points : 0), label: 'SCORE ' + fmtPts(HUNT_RUN.totals.points + (HUNT_RUN.site ? HUNT_RUN.site.points : 0)) });
  }
  HUB.sendT -= dt;
  if (HUB.sendT <= 0 && HUNT_RUN.phase === 'play' && !HUB.ended) {
    HUB.sendT = .1;
    AIHub.send({ t: 'g', x: +GUN.x.toFixed(4), y: +GUN.y.toFixed(4), s: GUN.scoped ? 1 : 0 }, { reliable: false });
  }
  if (HUNT_RUN.mode === 'hub' && HUNT_RUN.phase === 'results') hubFinish();
}

function hubFinish() {
  if (!HUB_ON() || !HUB.info || HUB.resultSent) return;
  HUB.resultSent = true;
  // time-up: the round ends where it stands
  if (HUNT_RUN.phase !== 'results') { HUNT_RUN.hubOver = true; finishRun(); }
  const score = HUNT_RUN.totals ? HUNT_RUN.totals.points : 0;
  AIHub.result({ score, stats: { bucks: HUNT_RUN.totals.bagged, shots: HUNT_RUN.totals.shots, doe: HUNT_RUN.totals.doe } });
}

function drawGhosts(g, W, H, t) {
  if (!HUB_ON() || !HUB.info) return;
  const me = HUB.info.me;
  for (const id of Object.keys(HUB.ghosts)) {
    const gh = HUB.ghosts[id];
    if (+id === me || t - gh.at > 2.5) continue;
    const cx = gh.x * W, cy = gh.y * H, rad = Math.max(6, H * .035), col = HUB.colors[id] || '#ffffff';
    E.px.line(g, cx - rad, cy, cx + rad, cy, col, 1);
    E.px.line(g, cx, cy - rad, cx, cy + rad, col, 1);
    E.px.disc(g, cx, cy, Math.max(1, rad * .18), col);
    E.font.text(g, HUB.names[id] || 'P' + id, cx + rad + 4, cy - 6, col, { outline: '#000' });
  }
}

// the hub round's own waiting screen: the card is the hub's, this is only the picture behind it until start
const hubScene = {
  update(dt) {
    if (HUB.started) GAME.go('hunt', { mode: 'hub' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      paintLand(g, W, H, HUNTS[0], titleWorld(), r.game.time);
      E.font.title(g, 'HUB HUNT-OFF', W / 2, H * .3, { scale: Math.max(1, Math.round(H / 170)), colors: ['#fff1b8', '#d88a30'], align: 'center' });
      E.font.text(g, 'Three sites of Hollow Creek. Most points in three minutes wins.', W / 2, H * .46, '#ffffff', { align: 'center', outline: '#000' });
      E.font.text(g, 'Ready up on the hub card.', W / 2, H * .54, '#c8c0e0', { align: 'center', outline: '#000' });
    });
  },
};
