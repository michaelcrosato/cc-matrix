/* ---- THE ATTRACT MODE: after 10 s without input on the title and front-end screens, a looping showreel of real
 * gameplay on the real match machinery, with cheating autopilots on both sides (chosen deliveries, chosen shots at
 * perfect timing, guaranteed catches and direct hits). Ten segments of about 25 s, each a small data script; then it
 * loops. DEMO blinks, PRESS ANY BUTTON shows the last device's glyph, a TV caption names the ground. Any input returns
 * to the title and is consumed (it never also picks a menu item); nothing is saved; settings are untouched. ---- */
const ATTRACT = [
  { caption: 'THE VILLAGE GREEN', ground: 'green', teams: ['ker', 'mud'], bowler: 'terry', chaos: ['cow'], balls: [{ kind: 'four', theta: 52, token: 'teapot' }, { kind: 'dot' }, { kind: 'four', theta: -60 }] },
  { caption: 'THE LEANING WICKET', ground: 'green', teams: ['ker', 'mud'], bowler: 'terry', replay: true, balls: [{ kind: 'six', target: 'pub' }, { kind: '1' }] },
  { caption: 'THE REVEREND DECIDES', ground: 'green', teams: ['mud', 'ker'], bowler: 'basil', balls: [{ kind: 'review', delivery: 'legbreak' }, { kind: 'bowled', delivery: 'googly' }] },
  { caption: 'THRUMPTON HALL', ground: 'hall', weather: 'overcast', teams: ['ker', 'gen'], bowler: 'peregrine', balls: [{ kind: 'edge', delivery: 'outswing', catches: true }, { kind: 'caught', catches: true }] },
  { caption: 'SUNBURNT BAY', ground: 'bay', teams: ['ker', 'lar'], bowler: 'shazza', chaos: ['tide'], balls: [{ kind: 'bouncer', duck: true }, { kind: 'bouncer' }, { kind: 'dot' }] },
  { caption: 'YES! NO! SORRY!', ground: 'green', teams: ['ker', 'mud'], bowler: 'terry', balls: [{ kind: '1' }, { kind: 'runout', third: true }] },
  { caption: 'DUSTBOWL DOWNS', ground: 'downs', teams: ['ker', 'mag'], bowler: 'spinaldo', chase: 26, balls: [{ kind: 'dot', special: true }, { kind: 'stumped' }, { kind: 'rain' }] },
  { caption: 'WILLOW ABLAZE', ground: 'dome', time: 'night', weather: 'clear', teams: ['ker', 'thr'], bowler: 'thrumpton', balls: [{ kind: 'four', theta: 40 }, { kind: 'six', theta: -50, crowdCatch: true }, { kind: 'four', theta: -80 }, { kind: 'six', target: 'jumbotron', batSpecial: true }] },
  { caption: 'THE MIDNIGHT FINAL', ground: 'dome', time: 'night', weather: 'fog', teams: ['ker', 'thr'], bowler: 'machine', chaos: ['ghosts', 'fog'], balls: [{ kind: 'dot', special: true }, { kind: 'six', theta: -30 }, { kind: 'win' }] },
  { caption: 'HIGH SCORES', table: true }
];
const Attract = {
  seg: 0, i: 0, t: 0,
  extraFor(S) {
    const self = this;
    return {
      pre(dt, m) {
        self.t += dt;
        if (m.phase === 'setup' && m.pt < .02 && !m.force.outcome) {
          const b = S.balls[self.i]; if (!b) return;
          if (b.kind === 'rain') { if (!m.chaos.some(c => c.id === 'rain')) { m.startChaos('rain'); self.i++; } return; }
          if (b.kind === 'win') { m.inn.target = m.inn.runs + 1; m.force.outcome = { kind: 'four', theta: 30 }; self.i++; return; }
          m.force.outcome = Object.assign({}, b);
          m.cfg.cheat.catches = !!b.catches; m.cfg.cheat.lbwGiven = b.kind === 'review' ? false : undefined; m.cfg.cheat.review = b.kind === 'review' ? true : undefined;
          if (b.special) { m.hype[m.bowlSide] = 100; m.force.delivery = null; m.cpuPlan = null; }
          if (b.batSpecial) m.hype[m.bat] = 100;
          if (b.token) { const [ux, uy] = dirOf(b.theta, m.hand); m.tokens.push({ id: b.token, x: ux * 180, y: G.CREASE_S + 16 + uy * 180, z: 6, t: 0, life: 99 }); }
          if (b.third) m.cfg.cheat.thirdUp = true;
          if (b.crowdCatch) m.flags.crowdCatchNext = true;
          m.cpuPlan = null; AI.planBowling(m);   // the scripted ball, planned now that its outcome is set
          self.i++;
        }
        if (m.force.outcome && m.force.outcome.special && m.phase === 'setup' && m.pt > .3) { m.startRunup('special'); }
        if (m.force.outcome && m.force.outcome.batSpecial && m.phase === 'flight' && !m.batSpecialArmed && m.specialReady(m.bat, 'bat')) { m.armBatSpecial(); }
      },
      step(dt, m) {
        const out = self.i >= S.balls.length && (m.phase === 'between' || m.phase === 'done' || m.phase === 'inningsBreak');
        if ((out && m.pt > .6) || self.t > 42) Attract.next();
      },
      draw(r) { Attract.overlay(r, S); }
    };
  },
  next() { this.seg = (this.seg + 1) % ATTRACT.length; K.attractNext = this.seg; game.go('attract', { segment: this.seg }, { fade: 'wipe', seconds: .3 }); },
  overlay(r, S) {
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, r.H - 30, r.W, 30, '#000000'));
      if (Math.floor(K.game.time * 2) % 2 === 0) UI.text(g, 'DEMO', r.W / 2, r.H - 26, '#ff5a4a', { align: 'center', scale: 2 });
      Glyphs.row(g, r.W / 2, r.H - 12, game.input, [[Glyphs.device(game.input) === 'mouse' ? 'shot' : 'confirm', 'PRESS ANY BUTTON']], { align: 'center' });
      if (S && S.caption) { px.rect(g, 4, 40, E.font.width(S.caption) + 16, 14, '#c8202a'); UI.text(g, S.caption, 12, 43, '#ffffff'); }
      if (S && this.t < 3) E.font.title(g, 'CRICKET KERFUFFLE', r.W / 2, 50, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#5ab04a'], depth: 1 });
    });
  }
};
scenes.attract = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    const seg = (d && d.segment !== undefined ? d.segment : 0) % ATTRACT.length, S = ATTRACT[seg];
    Attract.seg = seg; Attract.i = 0; Attract.t = 0; this.S = S; this.t = 0; Idle.reset(); Idle.last = null; this.armed = false;
    Tuning.persist = false;
    coverage.mark('attract:' + seg);
    if (S.table) { Audio.music('attract'); this.table = true; return; }
    this.table = false;
    const cfg = { mode: 'attract', replays: !!S.replay, teams: S.teams, ground: S.ground, overs: 1, wickets: 10, difficulty: 'county', kerfuffleRules: true, humans: {}, toss: false, battingFirst: 0, timeOfDay: S.time || null, weather: S.weather || null, superOver: false, seed: 11 + seg, cheat: { autoBat: true, autoBowl: true }, forceBowler: S.bowler, commentary: true };
    if (S.chase) cfg.scenario = { innings: 1, battingFirst: 1, firstRuns: S.chase - 1, firstWkts: 4 };
    Play.begin(cfg, { extra: Attract.extraFor(S) });
    Audio.music('attract');
    const m = Play.m;
    if (S.chaos) game.after(.1, () => { for (const c of S.chaos) if (Play.m === m && !m.chaos.some(x => x.id === c)) m.startChaos(c); });
  },
  exit() { Tuning.persist = true; },
  update(dt) {
    this.t += dt;
    const I = game.input, P = game.players || [I];
    // any input returns to the title (and is consumed); give the scene a moment so the input that started it can't end it
    if (this.t > .4) { const any = P.some(q => Idle.any(q)); if (any) { P.forEach(q => q.consumeAll()); game.go('title', {}, { fade: .2 }); return; } } else P.forEach(q => Idle.any(q));
    if (this.table) { if (this.t > 7) Attract.next(); return; }
    Play.update(dt);
  },
  draw(r) {
    if (this.table) {
      r.sky(['#0a1a10', '#1a3a20', '#2a5a30']);
      r.overlay(g => K.titleLogo(g, r, 8));
      cab.drawTable(r, 'bat', 84, 'SHOWDOWN: TOP TEN');
      Attract.overlay(r, null);
      return;
    }
    Play.draw(r);
  }
};
K.Attract = Attract; K.ATTRACT = ATTRACT;
