/* ---- THE MATCH SCENE: the toss, then the Match simulation stepped each update, the view and director, the HUD,
 * commentary and crowd; replays after big moments (Settings: Replays); the bowler picker and tea treats (cards);
 * story beats (a scene's lines on a modal dialog while play holds); and the hand-off to the results. Quick Match,
 * Versus, Story, Showdown, Nets, the attract mode and AI Hub rounds all run here, from a MatchConfig. ---- */
const Play = {
  m: null, cfg: null, toss: null, endT: 0, beats: [], talk: null, replayDone: {}, onEnd: null, lesson: null, extra: null, idleNudge: 0,
  /** start a match from a config (and hooks: onEnd(match), extra: a mode controller with step / draw / event) */
  begin(cfg, o = {}) {
    Tuning.difficulty = cfg.difficulty || K.settings('difficulty');
    cfg.fielding = cfg.fielding || K.settings('fielding'); cfg.running = cfg.running || K.settings('running');
    if (cfg.seed === undefined) cfg.seed = Math.floor(Math.random() * 1e9) || 1;   // (Math.random: random on a page, seeded under tests and in AI Hub sessions)
    const m = new Match(cfg); this.m = m; this.cfg = cfg; this.onEnd = o.onEnd || null; this.extra = o.extra || null; this.endT = 0; this.replayDone = {}; this.beats = (o.beats || []).slice(); this.idleNudge = 0;
    MatchView.attach(m); Commentary.attach(m); HUD.callouts = [];
    this.toss = cfg.toss && !cfg.scenario ? { phase: 'flip', t: 0, call: null, side: null, winner: null, choice: null, coin: 0 } : null;
    if (!this.toss) m.start();
    Audio.music(m.ground.music || 'green');
    Audio.layer('drums', 0); Audio.layer('fire', 0);
    if (m.weather === 'rain') K.game.weather = { kind: 'rain', amount: .6, wind: .2 };
    else if (m.ground.id === 'downs' && m.weather === 'clear') K.game.weather = { kind: 'sand', amount: .12, wind: .5 };
    else if (m.ground.id === 'green' || m.ground.id === 'hall') K.game.weather = { kind: 'leaves', amount: .08, wind: .3 };
    else K.game.weather = null;
    coverage.mark('ground:' + m.ground.id); if (m.timeOfDay === 'night') coverage.mark('night'); if (m.fog > 0) coverage.mark('fog');
    return m;
  },
  humans(m) { return [0, 1].flatMap(s => m.humansOf(s)); },
  /** the toss: captains on the square, a coin, "Call: HEADS / TAILS", then "BAT / BOWL" */
  stepToss(dt) {
    const T0 = this.toss, m = this.m, hs = [0, 1].filter(s => m.isHuman(s)), caller = hs.length ? hs[0] : 0, I = hs.length ? m.humansOf(caller)[0] : null;
    T0.t += dt;
    if (T0.phase === 'flip') {
      if (!I) { T0.call = RNG.play() < .5 ? 'heads' : 'tails'; T0.phase = 'spin'; T0.t = 0; }
      else if (I.pressed('shot') || I.pressed('confirm')) { I.consumeAll(); T0.call = 'heads'; T0.phase = 'spin'; T0.t = 0; K.sfx('coin'); Audio.sting('toss'); }
      else if (I.pressed('block') || I.pressed('cancel')) { I.consumeAll(); T0.call = 'tails'; T0.phase = 'spin'; T0.t = 0; K.sfx('coin'); Audio.sting('toss'); }
      else { const c = I.clicked && I.clicked(); if (c) { T0.call = c[0] < K.game.W / 2 ? 'heads' : 'tails'; T0.phase = 'spin'; T0.t = 0; K.sfx('coin'); } }
      if (T0.t > 12) { T0.call = 'heads'; T0.phase = 'spin'; T0.t = 0; }
    } else if (T0.phase === 'spin') {
      T0.coin += dt * 18;
      if (T0.t > 1.6) { const land = RNG.play() < .5 ? 'heads' : 'tails'; T0.land = land; T0.winner = land === T0.call ? caller : 1 - caller; T0.phase = 'choose'; T0.t = 0; K.sfx('coin'); }
    } else if (T0.phase === 'choose') {
      const WI = m.isHuman(T0.winner) ? m.humansOf(T0.winner)[0] : null;
      if (!WI) { if (T0.t > 1.4) { T0.choice = (m.weather === 'overcast' || m.ground.pitch.seam > 1.1) ? 'bowl' : 'bat'; T0.phase = 'done'; T0.t = 0; } }
      else if (WI.pressed('shot') || WI.pressed('confirm')) { WI.consumeAll(); T0.choice = 'bat'; T0.phase = 'done'; T0.t = 0; }
      else if (WI.pressed('block') || WI.pressed('cancel')) { WI.consumeAll(); T0.choice = 'bowl'; T0.phase = 'done'; T0.t = 0; }
      else { const c = WI.clicked && WI.clicked(); if (c) { T0.choice = c[0] < K.game.W / 2 ? 'bat' : 'bowl'; T0.phase = 'done'; T0.t = 0; } }
      if (T0.t > 14) { T0.choice = 'bat'; T0.phase = 'done'; T0.t = 0; }
    } else if (T0.phase === 'done' && T0.t > 1.2) {
      m.cfg.battingFirst = T0.choice === 'bat' ? T0.winner : 1 - T0.winner; this.toss = null; m.start(); coverage.mark('toss');
    }
  },
  drawToss(r) {
    const T0 = this.toss, m = this.m, hs = [0, 1].filter(s => m.isHuman(s)), I = hs.length ? m.humansOf(hs[0])[0] : K.game.input;
    r.overlay(g => {
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
      UI.text(g, 'THE TOSS', r.W / 2, 30, UI.gold, { align: 'center', scale: 2 });
      UI.text(g, m.teams[0].name + '  v  ' + m.teams[1].name, r.W / 2, 52, '#ffffff', { align: 'center' });
      const cx = r.W / 2, cy = r.H / 2 - 6, sq = T0.phase === 'spin' ? Math.abs(Math.cos(T0.coin)) : 1, up = T0.phase === 'spin' ? Math.sin(Math.min(1, T0.t / 1.6) * Math.PI) * 30 : 0, face = T0.phase === 'spin' ? (Math.cos(T0.coin) > 0 ? 'H' : 'T') : (T0.land || 'heads')[0].toUpperCase();
      px.ell(g, cx, cy - up, 14, Math.max(1, 14 * sq), '#8a6a1a'); px.ell(g, cx, cy - up, 12, Math.max(1, 12 * sq), '#e8c060');
      if (sq > .4) UI.text(g, face, cx + 1, cy - up - 3, '#6a4a10', { align: 'center' });
      if (T0.phase === 'flip') { UI.text(g, 'CALL IT', r.W / 2, cy + 30, '#ffffff', { align: 'center' }); Glyphs.row(g, r.W / 2, cy + 44, I, [['shot', 'HEADS'], ['block', 'TAILS']], { align: 'center' }); }
      if (T0.phase === 'choose' || T0.phase === 'done') {
        UI.text(g, (T0.land || '').toUpperCase() + '! ' + m.teams[T0.winner].name.toUpperCase() + ' WIN THE TOSS', r.W / 2, cy + 30, UI.gold, { align: 'center' });
        if (T0.phase === 'choose' && m.isHuman(T0.winner)) Glyphs.row(g, r.W / 2, cy + 46, m.humansOf(T0.winner)[0], [['shot', 'BAT'], ['block', 'BOWL']], { align: 'center' });
        if (T0.phase === 'done') UI.text(g, 'AND CHOOSE TO ' + T0.choice.toUpperCase(), r.W / 2, cy + 46, '#ffffff', { align: 'center' });
      }
    });
  },
  /** a story beat or tutorial card: lines on a modal dialog while the simulation holds */
  playLines(lines, done) {
    const talk = this.talk || (this.talk = new E.Dialog(K.game, { lines: 2, place: 'bottom', voice: null, bg: '#10201a', border: '#e8c060' }));
    const list = lines.slice(), next = () => { const l = list.shift(); if (!l) { if (done) done(); return; } const S = SPEAKERS[l[0]] || SPEAKERS.aubrey; talk.say(l[1], { name: S.name, portrait: Cast.portraitOf(S.rig), portraitOpts: { zoom: 3, turn: .4 }, onDone: next }); Voice.say(l[1], S.voice); };
    next();
  },
  update(dt) {
    const m = this.m; if (!m) return;
    if (this.talk && this.talk.update(dt)) { MatchView.updateRigs(dt * 0); return; }
    if (this.toss) { this.stepToss(dt); MatchView.updateRigs(dt); MatchView.direct(dt); Audio.tick(dt, m.ground.crowd); return; }
    // cards that take input: the bowler picker, tea treats
    if (m.phase === 'pickBowler') { const I = m.bowlerInput(); if (I && !m.cfg.cheat.autoBowl) { const C = HUD.pickCards || (HUD.pickCards = new UICards({ w: 84, h: 112 })); C.cards = m.pickOptions; const res = C.update(dt, I); if (res && res.pick !== undefined) m.pickBowler(res.pick); } }
    if (m.phase === 'inningsBreak' && m.treatPick) { const I = m.humansOf(m.sideOf(m.innings[0].bowl))[0]; if (I) { const C = HUD.teaCards || (HUD.teaCards = new UICards({ w: 96, h: 56 })); C.cards = TEA_TREATS; const res = C.update(dt, I); if (res && res.pick !== undefined) { this.applyTreat(TEA_TREATS[res.pick].id, m.sideOf(m.innings[0].bowl)); m.treatPick = false; } } else m.treatPick = false; }
    // the field special (held in the field: the special button in setup with a full meter and no bowling special ready)
    const wI = m.bowlerInput(); if (wI && m.phase === 'setup' && !m.cfg.cheat.autoBowl && wI.pressed('special') && !m.specialReady(m.bowlSide, 'bowl')) { if (m.fieldSpecial()) wI.consume('special'); }
    // a replay plays over a held simulation; any button skips it
    if (MatchView.replay) { const any = this.humans(m).some(I => I.pressed('shot') || I.pressed('confirm')); if (any || !this.humans(m).length && false) { MatchView.skipReplay(); m.hold = Math.min(m.hold, .2); } }
    const before = m.phase;
    if (this.extra && this.extra.pre) this.extra.pre(dt, m);
    m.step(dt);
    if (this.extra && this.extra.step) this.extra.step(dt, m);
    this.maybeReplay(m, before);
    MatchView.updateRigs(dt); MatchView.direct(dt);
    Commentary.step(dt); HUD.step(dt); Audio.tick(dt, m.ground.crowd);
    this.stepBeats(m);
    if (m.phase === 'done') {
      this.endT += dt;
      if (this.endT > 3.2 && !this.ended) { this.ended = true; const r = this.summary(m); if (this.onEnd) this.onEnd(m, r); else K.game.go('results', { m, r }); }
    } else this.ended = false;
  },
  /** replays after big moments: a six, a wicket, a screamer, a target, a special (Settings: Replays) */
  maybeReplay(m, before) {
    const set = K.settings('replays'); if (set === 'Never' || m.cfg.mode === 'hub' || m.cfg.mode === 'showdown' || (m.cfg.mode === 'attract' && !m.cfg.replays)) return;
    if (m.phase !== 'dead' || m.pt < (m.cur.wicket ? 1.9 : 1.6) || this.replayDone[m.time > 0 ? m.cur.over + ':' + m.cur.ballInOver + ':' + m.innNo : 0]) return;
    const big = m.cur.boundary === 6 || (m.cur.wicket && !m.decision) || m.cur.screamer || m.cur.bonus || m.cur.special || m.cur.batSpecial, any = set === 'Always' && (m.cur.contact || m.cur.wicket);
    if (!big && !any) return;
    this.replayDone[m.cur.over + ':' + m.cur.ballInOver + ':' + m.innNo] = true;
    if (MatchView.startReplay(m.cur.boundary === 6 ? 4.5 : 3.5, m.cur.boundary === 6 || m.cur.bonus ? 'wide' : 'broadcast')) m.hold = MatchView.replay.len / MatchView.replay.speed + .2;
    void before;
  },
  /** story beats: { on: 'innings:end' | 'over:end' | ..., when(m), lines, done } fired once */
  stepBeats(m) {
    for (const b of this.beats) {
      if (b.fired) continue;
      if (b.when(m)) { b.fired = true; m.hold = Math.max(m.hold, .1); this.playLines(SCENES[b.scene].lines, b.done); if (b.after) b.after(m); break; }
    }
  },
  applyTreat(id, side) {
    const m = this.m;
    if (id === 'sponge') m.addHype(side, 40, 'treat'); else if (id === 'tea') { m.flags.teaTime = 2; m.flags.teaSide = side; } else if (id === 'sandwich') m.flags.sandwich = side;
    m.treats[side].push(id); coverage.mark('treat:' + id);
  },
  /** the match's numbers for the results screen and the report */
  summary(m) {
    const res = m.result || {}, H = [0, 1].filter(s => m.isHuman(s)), humanTeam = H.length === 1 ? m.teams[H[0]].id : null;
    const won = humanTeam ? res.winner === humanTeam : null;
    let pom = null, pomScore = -1;
    for (const inn of m.innings) { if (inn.posted) continue; for (const [id, c] of Object.entries(inn.cards)) { const s = c.runs + c.sixes * 2 + (res.winner === inn.bat ? 5 : 0); if (s > pomScore) { pomScore = s; pom = id; } } for (const [id, c] of Object.entries(inn.bowlCards)) { const s = c.wkts * 18 - c.runs * .5 + (res.winner === inn.bowl ? 5 : 0); if (s > pomScore) { pomScore = s; pom = id; } } }
    return { won, humanTeam, pom, report: Report.write(m) };
  },
  draw(r) {
    const m = this.m; if (!m) return;
    MatchView.draw(r);
    if (this.toss) { this.drawToss(r); return; }
    HUD.draw(r);
    const card = this.extra && this.extra.lesson && this.extra.lesson.card && !this.extra.lesson.done;
    if (m.phase === 'intro' && m.cfg.mode !== 'nets') r.overlay(g => { UI.panel(g, r.W / 2 - 140, 40, 280, 40); UI.text(g, m.ground.name.toUpperCase(), r.W / 2, 48, UI.gold, { align: 'center' }); UI.text(g, m.teams[m.bat].name + ' to bat', r.W / 2, 62, '#ffffff', { align: 'center' }); });
    if (!(this.talk && this.talk.open) && !(K.dev && K.dev.isOpen) && !card) Commentary.draw(r);
    if (this.extra && this.extra.draw) this.extra.draw(r, m);
    if (this.talk && this.talk.open) this.talk.draw(r);
    if (m.phase === 'done') r.overlay(g => { UI.panel(g, r.W / 2 - 150, r.H / 2 - 30, 300, 44); UI.text(g, (m.result && m.result.text || '').toUpperCase(), r.W / 2, r.H / 2 - 18, UI.gold, { align: 'center' }); });
  }
};
/* ---- the Wisden-style report: 2-3 sentences picked by the shape of the result ---- */
const Report = {
  write(m) {
    const res = m.result || {}; if (!res.text) return '';
    const all = m.innings.filter(i => !i.posted), bats = [], bowls = [];
    for (const i of all) { for (const [id, c] of Object.entries(i.cards)) bats.push({ id, c, inn: i }); for (const [id, c] of Object.entries(i.bowlCards)) bowls.push({ id, c }); }
    bats.sort((a, b) => b.c.runs - a.c.runs); bowls.sort((a, b) => b.c.wkts - a.c.wkts || a.c.runs - b.c.runs);
    const tb = bats[0], tw = bowls[0], target = m.innings[1] ? m.innings[1].target : '';
    const vars = { winner: res.winner ? TEAMS[res.winner].name : 'Nobody', loser: res.loser ? TEAMS[res.loser].name : 'Everybody', target, topBat: tb ? playerById(tb.id).name : 'nobody', topRuns: tb ? tb.c.runs : 0, notOut: tb && !tb.c.out ? '*' : '',
      sixes: tb ? (tb.c.sixes === 0 ? 'not a six among them' : tb.c.sixes === 1 ? 'one six' : tb.c.sixes + ' sixes') : 'no sixes', targetLine: m.stats.targets.length ? ', one of them through ' + m.ground.targets.find(t => t.id === m.stats.targets[0]).label.toLowerCase() : '', chaosThing: m.stats.chaosThings[0] || 'a stray pigeon', collapse: 'a collapse of ' + (all.find(i => i.bat === res.loser) || {}).wkts + ' wickets',
      topBowl: tw ? playerById(tw.id).name : 'nobody', wkts: tw ? tw.c.wkts : 0, bruns: tw ? tw.c.runs : 0, margin: (res.text || '').replace(/^.* won by /, ''), hero: tb ? playerById(tb.id).name : 'the scorer' };
    const pool = res.tie || res.superOver ? REPORTS.tie : m.innings.some(i => i.revised) ? REPORTS.rain : REPORTS.win;
    const lost = (all.find(i => i.bat === res.loser) || {}).wkts || 0, second = pool === REPORTS.win ? (lost >= 3 ? pool[1] : pool[2]) : pool[1];
    const a = fill(pool[0], vars), b = second ? fill(second, vars) : '';
    return (a + ' ' + b).trim();
  }
};
K.Play = Play; K.Report = Report;
