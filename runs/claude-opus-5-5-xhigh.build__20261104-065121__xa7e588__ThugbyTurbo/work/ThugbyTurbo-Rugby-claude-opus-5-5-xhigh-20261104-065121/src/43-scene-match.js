/* ---- THE MATCH SCENE: live, a drill, the attract demo or an AI Hub session. data: { home, away, venue, weather, time,
 * halfLen, sudden, cup (round), drill (id), attract, session, seed, seats: [{ kind, input, team, label, color }] } ---- */
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
E.VIEWS.postsE = new E.View('postsE', 'Kicker', -90, 22, 1.25, 1);
E.VIEWS.postsW = new E.View('postsW', 'Kicker', 90, 22, 1.25, 1);
const VIEW_OF = { Broadcast: 'broadcast', High: 'threequarter', Overhead: 'topdown' };
const MS = TT.MS = { m: null, pres: null, hud: null, comm: null, rep: null, ctx: null, endT: 0, data: null };
TT.newSeed = () => (TT.game ? (TT.game.real * 1000 | 0) : 0) ^ ((Date.now ? Date.now() : 7) & 0xffffff) ^ 0x5eed;
const matchScene = {
  view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], input: KEYS, res: 'ps1', expand: true, touch: [], pausable: true,
  camera: { zoom: [.7, 1.45], start: .9 },
  enter(data = {}) {
    const game = TT.game, st = game.settings;
    this.pausable = !data.session;
    data = MS.data = Object.assign({ home: 'mud', away: 'bad', venue: 'muddington', weather: 'venue', seed: TT.newSeed() }, data);
    const seats = data.seats || (data.attract ? [] : [{ kind: 'local', input: game.input, team: 0, label: 'P1', color: E.PLAYER_COLORS[0] }]);
    const halves = { '2 min': 120, '3 min': 180, '4 min': 240, '5 min': 300 }[st.halves] || 120;
    const diff = st.difficulty || 'Pro';
    const opp = data.away && TT.TEAMS[data.away] ? TT.TEAMS[data.away].diff : 'Pro';
    const cupDiff = data.cup !== undefined ? TT.diffStep(opp, TT.DIFF_ORDER.indexOf(diff) - 1) : diff;
    MS.m = new TT.Match({
      home: data.home, away: data.away, venue: data.venue, weather: data.weather, time: data.time, seed: data.seed,
      halfLen: data.halfLen || (data.attract ? 9999 : null) || (TUNE.v.halfLength !== 120 ? null : halves),
      sudden: data.sudden !== undefined ? data.sudden : st.suddenDeath === 'On', cup: data.cup !== undefined, attract: !!data.attract, session: !!data.session, drill: data.drill || null,
      // difficulty shapes the CPU opponents; a side with a human on it plays at the normal level
      diff: data.attract ? 'Pro' : cupDiff, homeDiff: data.homeDiff || (seats.some(s => s.team === 0) ? 'Pro' : undefined), awayDiff: data.awayDiff || (seats.some(s => s.team === 1) ? 'Pro' : undefined),
      seats, autoSwitch: st.autoSwitch, passAssist: st.passAssist === 'On', replays: st.replays,
      noClock: !!data.attract || !!data.drill, skipIntro: !!data.drill || !!data.skipIntro, noPowerups: !!data.noPowerups || !!data.drill, noHazard: !!data.noHazard || !!data.drill
    });
    if (data.drill) MS.m.noClock = true;
    const m = MS.m;
    MS.pres = new TT.Pres(m); MS.hud = new TT.Hud(this); MS.comm = new TT.Commentary(game, { seed: data.seed }); MS.rep = new TT.Replay(m);
    MS.ctx = { match: m, subs: [], seats: m.seats, pres: MS.pres, hoverId: -1, seatColor: i => (m.seats[i] && m.seats[i].color) || '#ffe060', I: game.input, aimSign: 1, attract: !!data.attract, session: data.session, large: st.uiScale === 'Large' };
    MS.ctx.pick = (x, y) => game.r && game.r.pick ? game.r.pick(x, y) : [];
    MS.endT = 0; MS.replayCool = -99; MS.wasView = null; MS.halfLine = null; MS.paused = false;
    TT.sound.hook(TT.bus, MS.ctx); MS.comm.hook(TT.bus, MS.ctx); MS.hud.listen(); this.fx(MS.ctx);
    if (!data.session && !data.attract) game.allowJoin(false);
    game.weather = m.weather ? Object.assign({}, m.weather) : null;
    game.setView(data.session ? 'broadcast' : VIEW_OF[st.camera] || 'broadcast');
    game.cam.bounds = null; game.follow(null); game.cam.smooth = .22;
    TT.sound.music(m.venue.music);
    if (data.drill && TT.Drills) TT.Drills.start(m, data.drill, data);
    if (data.attract && TT.Attract) TT.Attract.start(m, data);
    if (data.session && TT.Net) TT.Net.attach(m, data);
    if (data.cup !== undefined) { const node = TT.STORY[TT.CUP[data.cup].half]; MS.halfLine = node && node.nodes[0].say.replace(/\{[^}]*\}/g, ''); }
    TT.bus.emit('matchStart', { m, data });
  },
  exit() {
    const game = TT.game;
    if (MS.ctx) MS.ctx.subs.forEach(f => f());
    if (MS.hud) MS.hud.unlisten();
    game.weather = null; game.timeScale = 1;
    if (TT.Attract) TT.Attract.stop();
    if (TT.Drills) TT.Drills.stop();
    if (TT.dev) TT.dev.close(true);
    game.lights.enabled = false;
    MS.m = null; MS.pres = null;
  },
  /** effects on the match's events (dust, hits, confetti, fireworks, flames, lightning) */
  fx(ctx) {
    const game = TT.game, P = game.particles, on = (n, f) => ctx.subs.push(TT.bus.on(n, d => { if (ctx.match && !ctx.quiet) f(d, ctx.match); }));
    const session = !!MS.data.session, freeze = s => { if (!session && !game.reduceMotion) game.freeze(s); };
    const mudCol = ['#5a3a1e', '#7a5430', '#3a2a14'], grass = ['#4a8a3a', '#6aa04a', '#3a6a2a'];
    const at = (d, m) => d.id !== undefined ? m.players[d.id] : d;
    on('tackle', (d, m) => { const p = at(d, m); P.dust(p.x, p.y, 2, 6); P.bits(p.x, p.y, 4, 5, m.hazardKind === 'mud' ? mudCol : grass); TT.babble.grunt(p.d, 2); });
    on('diveTackle', (d, m) => { const p = at(d, m); P.dust(p.x, p.y, 2, 8); });
    on('bigHit', (d, m) => { const p = m.players[d.on]; game.hitFx(p.x, p.y, 18, { power: 1, sound: false, rumble: true }); freeze(.08); game.shake(4); P.dust(p.x, p.y, 2, 10); TT.babble.grunt(p.d, 3); });
    on('monsterHit', (d, m) => {
      const p = m.players[d.on]; freeze(.12); game.shake(6); game.flash('#ffffff', .1, .5); P.ring(p.x, p.y, 4, 40, '#fff0c0', .4); P.sparks(p.x, p.y, 18, 20); P.text(p.x, p.y, 40, 'WHUMP!', '#ffe060', { scale: 2, bounce: true }); P.dust(p.x, p.y, 2, 12);
      for (const q of game.players) q.rumble(.9, .35);
      TT.babble.grunt(p.d, 4);
      if (!session && !game.reduceMotion) { const z0 = game.zoom || 1; game.setZoom(z0 * 1.1); game.after(.25, () => game.setZoom(z0)); }
    });
    on('land', (d, m) => { const p = m.players[d.id]; P.dust(p.x, p.y, 2, 12); P.bits(p.x, p.y, 4, 8, m.hazardKind === 'mud' ? mudCol : grass); });
    on('try', (d, m) => {
      const p = m.players[d.id], k = m.kits[p.team]; MS.pres.lastScorer = d.id; MS.pres.cheer = 3; MS.pres.cheerTeam = p.team;
      for (let i = 0; i < 6; i++) P.bits(p.x + (i - 3) * 10, p.y, 30, 12, [k.cloth, k.trim, '#ffffff']);
      if (m.time !== 'day') for (let i = 0; i < 5; i++) game.after(i * .3, () => { const x = G.CX + (i - 2) * 160; P.explosion(x, G.Y0 - 20, 160 + i * 10, 1.2, { debris: false, freeze: false, shake: 0 }); TT.sound.play('firework'); });
      if (m.venue.id === 'megadome') game.flash('#a060ff', .15, .3);
    });
    on('convMade', (d, m) => { MS.pres.cheer = 1.5; MS.pres.cheerTeam = d.team; });
    on('dropGoal', (d, m) => { MS.pres.cheer = 2; MS.pres.cheerTeam = d.team; });
    on('kick', (d, m) => P.dust(d.x, d.y, 1, 4));
    on('bounce', (d, m) => { if (d.v > 60) P.dust(d.x, d.y, 1, 2); });
    on('superStart', (d, m) => { const p = m.players[d.id]; P.ring(p.x, p.y, 4, 30, '#ffe060', .4); P.glints(p.x, p.y, 20, 10, '#ffe060'); });
    on('powerupTake', (d, m) => { const p = m.players[d.id]; P.glints(p.x, p.y, 20, 12, '#fff0a0'); });
    on('toasted', (d, m) => { const p = m.players[d.id]; P.fire(p.x, p.y, 10, 10); P.smoke(p.x, p.y, 24, 8); });
    on('hazard', (d, m) => { if (d.kind === 'lightning') { game.flash('#ffffff', .12, .7); P.sparks(d.x, d.y, 4, 30); P.ring(d.x, d.y, 4, 36, '#c0e0ff', .35); game.shake(5); } if (d.kind === 'flames') P.fire(d.x, d.y, 4, 14, { size: 1.4 }); });
    on('chickenHit', (d, m) => { const p = m.players[d.id]; P.bits(p.x, p.y, 20, 10, ['#ffffff', '#f0f0e0', '#f0d040']); });
    on('card', () => { MS.pres.boo = 2; });
    on('refDown', (d, m) => P.dust(m.ref.x, m.ref.y, 2, 10));
    on('scrumEngage', (d, m) => { if (m.setp) { P.dust(m.setp.x, m.setp.y, 2, 14); game.shake(2); } });
    on('ruck', (d, m) => P.dust(d.x, d.y, 3, 10));
    on('fend', (d, m) => { const p = m.players[d.on]; P.impact(p.x, p.y, 20, .8, '#ffffff'); });
    on('doink', (d, m) => { const b = m.ball; P.sparks(b.x, b.y, b.z, 8); });
    on('mud', (d, m) => { const p = m.players[d.id]; P.bits(p.x, p.y, 4, 10, mudCol); });
    on('onFire', (d, m) => { const p = m.players[d.id]; P.fire(p.x, p.y, 10, 16); });
    on('sputter', (d, m) => { const p = m.players[d.id]; if (p.ctl >= 0) P.smoke(p.x, p.y, 6, 3, { size: .6 }); });
    on('fulltime', (d, m) => { if (d.winner >= 0) { MS.pres.cheer = 6; MS.pres.cheerTeam = d.winner; } });
  },
  update(dt) {
    const game = TT.game, m = MS.m; if (!m) return;
    const data = MS.data, ctx = MS.ctx;
    if (TT.dev && TT.dev.open) { TT.dev.update(dt); if (TT.dev.frozen) { this.present(0); return; } }
    if (game.input.pressed('dev') && TT.dev && TT.dev.enabled && !data.session) TT.dev.toggle();
    // the camera view: V or R3 cycles it
    if (!data.attract && game.players.some(q => q.pressed('view')) && m.phase !== 'setkick') { game.nextView(); game.note(game.view.label.toUpperCase()); }
    // an instant replay holds the match; any button skips it
    if (MS.rep.play) {
      if (game.players.some(q => q.pressed('x') || q.pressed('confirm') || q.pressed('ci') || q.pressed('start'))) { MS.rep.stop(); game.input.consumeAll(); }
      const V = MS.rep.play ? MS.rep.step(dt) : null;
      if (V) { MS.V = V; MS.pres.update(dt, V); MS.pres.camera(dt, V, game, { focus: MS.rep.focus() }); MS.hud.update(dt); MS.comm.update(dt); return; }
      game.setZoom(MS.zoom0 || 1); game.timeScale = 1;
    }
    // the seats' devices to intents
    ctx.aimSign = this.aimSign();
    for (const s of m.seats) if (s.kind === 'local') TT.readIntent(s, game, m, ctx);
    if (data.attract && TT.Attract) TT.Attract.update(dt);
    if (data.drill && TT.Drills) TT.Drills.update(dt);
    if (data.session && TT.Net) TT.Net.update(dt);
    const hold = data.session && SESSION && AIHub.time() < 0;
    if (!hold && !(data.session && TT.Net && !TT.Net.isHost())) {
      m.step(dt);
      MS.rep.record();
      this.replayCheck(m, data);
    }
    this.present(dt);
    if (m.over && !data.attract && !data.drill && !data.session) { MS.endT += dt; if (MS.endT > 4.5 || (MS.endT > 1.5 && game.players.some(q => q.pressed('confirm') || q.pressed('x')))) this.finish(); }
  },
  /** everything that follows the state: rigs, camera, HUD, commentary, the music's layers, the crowd */
  present(dt) {
    const game = TT.game, m = MS.m, V = TT.Net && TT.Net.mirror ? TT.Net.mirror : m;
    MS.V = V;
    if (TT.cfg.present || TT.forcePresent) MS.pres.update(dt, V);
    // set kicks are taken in the behind-the-kicker camera
    if (V.phase === 'setkick' && V.setp && V.setp.sub !== 'result') { const id = V.dir[V.setp.team] > 0 ? 'postsE' : 'postsW'; if (game.view.id !== id) { MS.wasView = MS.wasView || game.view.id; game.setView(id); } }
    else if (MS.wasView && V.phase !== 'setkick') { game.setView(MS.wasView); MS.wasView = null; }
    if (V.phase === 'setkick' && V.setp) { const tee = V.teePos(), line = V.oppLine(V.setp.team); game.focus(lerp(tee.x, line, .45), lerp(tee.y, G.CY, .45), 30); }
    else MS.pres.camera(dt, V, game);
    MS.hud.update(dt); MS.comm.update(dt);
    // the music's layers: the drums in an opponents' 22, the hype layer when a meter is full or someone is on fire
    const c = V.ball.st === 'held' ? V.players[V.ball.holder] : null;
    TT.sound.layer('drums', !!(c && V.adv1(c.team, c.x) > G.W / 2 - G.L22));
    TT.sound.layer('hype', V.hype[0] >= 100 || V.hype[1] >= 100 || V.players.some(p => p.fire > 0));
    TT.sound.crowd(dt, MS.pres.excite, !MS.data.session || true);
    if (V.phase === 'setkick' && V.setp && V.setp.sub !== 'flight' && V.setp.sub !== 'result') TT.sound.clap(dt, clamp(V.setp.clockT / 20, .25, 1) * .9);
  },
  aimSign() { const g = TT.game; if (!g.view || !g.view.p) return 1; const a = g.view.p(G.X1, G.CY), b = g.view.p(G.X1, G.CY + 10); return b[0] >= a[0] ? 1 : -1; },
  replayCheck(m, data) {
    const ask = m.replayAsk; if (!ask) return;
    if (data.session || TT.game.settings.replays === 'Off' || data.drill) { m.replayAsk = null; return; }
    if (m.t < ask.t + 1) return;   // a second more of the moment, then play it
    m.replayAsk = null;
    if (!ask.force && m.t - MS.replayCool < 30) return;
    if (TT.game.settings.replays === 'All tries' && ask.kind !== 'try' && !data.attract) return;
    MS.replayCool = m.t;
    if (MS.rep.start(ask)) { MS.zoom0 = TT.game.zoom || 1; TT.game.setZoom(MS.zoom0 * 1.35); }
  },
  finish() {
    const m = MS.m, data = MS.data;
    if (!m || this._finishing) return;
    const res = TT.summarize(m, data);
    TT.game.go('results', res);
  },
  draw(r) {
    const m = MS.m; if (!m || (MS.data.session && TT.Net && TT.Net.server)) return;
    const V = MS.V || m, ctx = MS.ctx, game = TT.game;
    ctx.myTeam = ctx.seats[0] ? ctx.seats[0].team : undefined; ctx.shared = ctx.seats.length > 1;
    ctx.replay = !!MS.rep.play; ctx.I = game.input; ctx.halfLine = MS.halfLine; ctx.dialogUp = MS.comm.talk.open;
    ctx.waiting = TT.Net && TT.Net.waiting && TT.Net.waiting(); ctx.drill = !!MS.data.drill;
    MS.pres.draw(r, V, { refCone: game.settings.refCone === 'On', seatColor: ctx.seatColor, seatLabel: i => ctx.seats[i] ? ctx.seats[i].label : '', myTeam: ctx.myTeam });
    MS.hud.draw(r, V, ctx);
    if (!ctx.replay) { const n = ctx.seats.filter(s => s.kind !== 'cpu').length; MS.comm.draw(r, { left: n >= 1 ? 112 : 6, right: n >= 2 ? 112 : 6 }); }
    if (MS.data.drill && TT.Drills) TT.Drills.draw(r);
    if (MS.data.attract && TT.Attract) TT.Attract.draw(r);
    if (MS.data.session && TT.Net) TT.Net.draw(r);
    if (m.over && !MS.data.attract && !MS.data.drill && !MS.data.session) r.overlay(g => { FONT.title(g, 'FULL TIME', r.W / 2, r.H * .3, { align: 'center', scale: 4, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 }); UI.txt(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, r.W / 2, r.H * .3 + 40, '#ffffff', { align: 'center', scale: 2 }); });
    if (TT.dev && TT.dev.enabled) TT.dev.draw(r);
  },
  back() { return false; }
};
TT.scenes = TT.scenes || {};
TT.scenes.match = matchScene;
/** a finished match's summary: the score, four tiles, the player of the match, records */
TT.summarize = (m, data) => {
  const w = m.result ? m.result.winner : (m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1), st = m.stats;
  const hT = m.seats.length ? m.seats[0].team : 0;
  const pool = m.players.filter(p => w < 0 || p.team === w);
  const potm = pool.map(p => [p, p.tries * 10 + p.monsters * 4 + p.tackles + metres(p.metres) / 10 + p.breaks * 3 + p.turnovers * 3]).sort((a, b) => b[1] - a[1])[0][0];
  const total = st[0].poss + st[1].poss || 1;
  return {
    home: m.teamIds[0], away: m.teamIds[1], venue: m.venue.id, score: m.score.slice(), winner: w, data,
    tiles: [['TRIES', st[0].tries + ' - ' + st[1].tries], ['BIG HITS', st[0].bigHits + ' - ' + st[1].bigHits], ['METRES', Math.round(metres(st[0].metres)) + ' - ' + Math.round(metres(st[1].metres))], ['POSSESSION', Math.round(st[0].poss / total * 100) + '% - ' + Math.round(st[1].poss / total * 100) + '%']],
    potm: { team: potm.team, slot: potm.slot, nick: potm.nick, name: potm.name, line: potm.tries + ' TRIES, ' + potm.tackles + ' TACKLES', line2: Math.round(metres(potm.metres)) + ' METRES CARRIED' },
    records: { margin: Math.abs(m.score[0] - m.score[1]), tries: Math.max(...m.players.filter(p => p.team === hT).map(p => p.tries).concat(0)), hit: Math.round(Math.max(0, ...m.players.filter(p => p.team === hT).map(p => p.hitBest)) * 10) },
    humanTeam: m.seats.length ? m.seats[0].team : 0, cup: data.cup, exhibition: !!data.exhibition, stats: st
  };
};
