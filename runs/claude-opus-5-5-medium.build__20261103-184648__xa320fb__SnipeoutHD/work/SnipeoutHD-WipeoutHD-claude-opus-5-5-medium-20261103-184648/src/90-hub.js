// AI Hub sessions (§3.16, protocol v1, mode ghost): straight into the round (no title or menus), the game's own card
// (a 3D grid shot, the players in seat colours, ready ticks, time left, the goal, this player's controls; Ready / More
// time), ready() once the world is warm, the countdown on the hub's clock, ghosts of the other players from their
// messages, progress about once a second, the result on finishing or at time-up, and silence after end
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px, V = SN.V;
const T = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const H = SN.hub = { active: !!(globalThis.AIHub && globalThis.AIHub.active), info: null, ghosts: new Map(), card: null, started: false, ended: false, reported: false, sent: 0, progressN: 0 };
const SEAT_TEAMS = ['kestrel', 'soratek', 'volta', 'caldera'];
const hubApi = () => globalThis.AIHub;
// in a session, say hello at once (before the 3D engine and the world load): the hub gives a copy ~10 s to connect
if (H.active) { try { H.connecting = globalThis.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { H.connecting = Promise.resolve(null); } }
/** the session scene */
SN.scenes.session = {
  input: SN.INPUT, pausable: false,
  enter() {
    this.phase = 'connecting'; this.t = 0; SN.hubSession = S; S.active = true;
    const A = hubApi();
    if (!A || !A.active) { S.active = false; SN.hubSession = null; SN.game.go('title'); return; }
    (H.connecting || A.connect({ mode: 'ghost', seats: [1, 4], card: true })).then(info => {
      if (!info) { S.active = false; SN.hubSession = null; SN.game.go('title'); return; }
      H.info = info; S.setup(info); this.phase = 'card';
    }).catch(e => { SN.game.fail('hub connect', e); });
  },
  update(dt) {
    this.t += dt; const A = hubApi(), I = SN.game.input;
    if (this.phase === 'card') {
      if (!S.readyCalled && S.vw) { S.readyCalled = true; A.ready(); }
      if (!H.started) {
        if (I.pressed('confirm') || I.pressed('start')) { A.answer('ready'); I.consumeAll(); }
        if (I.pressed('camera') || (SN.game.input.held && SN.game.input.held.has('KeyM') && !this._m)) A.answer('more');
        this._m = SN.game.input.held && SN.game.input.held.has('KeyM');
        const ck = I.clicked(); if (ck && this.btns) for (const [x, y, w, h, a] of this.btns) if (ck[0] >= x && ck[0] < x + w && ck[1] >= y && ck[1] < y + h) A.answer(a);
      }
      if (S.vw) S.vw.step(dt);
      if (H.started) { this.phase = 'race'; SN.game.go('race', { setup: S.setupData }, { fade: 0 }); }
    }
  },
  draw(r) {
    const v = S.vw; if (v && v.world) v.world.draw(r); else r.sky(['#05060c', '#141a2e']);
    r.overlay(g => {
      const Wd = r.W, Hh = r.H, c = H.card || {}, info = H.info, I = SN.game.input;
      if (this.phase === 'connecting' || !info) { T(g, 'CONNECTING TO THE HUB', Wd / 2, Hh / 2, '#ffffff', { align: 'center', scale: 2 }); return; }
      E.px.blend(g, .7, 'normal', () => { px.rect(g, 0, 0, Wd, 60, '#05060c'); px.rect(g, 0, Hh - 74, Wd, 74, '#05060c'); });
      SN.drawLogo(g, Wd / 2, 6, 3, this.t);
      const ev = S.event; T(g, 'GHOST RACE • ' + SN.TRACKS[ev.track].name + ' • ' + SN.CLASS[ev.cls].name + ' • ' + ev.laps + ' LAPS', Wd / 2, 36, '#bff8ff', { align: 'center' });
      T(g, 'FINISH 3 LAPS FIRST: FASTEST TIME WINS', Wd / 2, 47, '#ffd23f', { align: 'center', font: 'tiny' });
      info.players.forEach((p, k) => { const x = 12 + k * Math.floor((Wd - 24) / 4), ready = (c.ready || []).includes(p.id); px.rect(g, x, 66, 10, 10, p.color); T(g, p.name + (p.id === info.me ? ' (YOU)' : ''), x + 14, 67, '#ffffff', { font: 'tiny' }); T(g, ready ? 'READY' : '...', x + 14, 76, ready ? '#5aff9a' : '#9aa6c0', { font: 'tiny' }); });
      const left = c.left == null ? (c.paused ? 'PAUSED' : c.starting ? 'STARTING' : '') : Math.ceil(c.left / 1000) + ' S';
      T(g, left, Wd - 10, Hh - 70, '#ffffff', { align: 'right', scale: 2 });
      // this player's controls (the device seen so far; the keyboard by default)
      SN.glyph.row(g, I, [['steer', 'STEER'], ['thrust', 'THRUST'], ['brakeL', ''], ['brakeR', 'AIRBRAKES'], ['fire', 'FIRE'], ['absorb', 'ABSORB']], 10, Hh - 66);
      this.btns = [];
      const rb = [Wd / 2 - 112, Hh - 44, 104, 24, 'ready'], mb = [Wd / 2 + 8, Hh - 44, 104, 24, 'more'];
      for (const [x, y, w, h, a] of [rb, mb]) { const on = a === 'ready' ? (c.ready || []).includes(info.me) : c.asked; px.rect(g, x, y, w, h, on ? '#5aff9a' : '#ffffff'); px.rect(g, x + 2, y + 2, w - 4, h - 4, a === 'ready' ? '#1a5a78' : '#3a2a50'); const gl = a === 'ready' ? 'confirm' : 'camera'; const gw = SN.glyph.draw(g, I, gl, x + 8, y + 6); T(g, a === 'ready' ? 'READY' : 'MORE TIME', x + 12 + gw, y + 8, '#ffffff'); this.btns.push([x, y, w, h, a]); }
      T(g, 'M: MORE TIME', Wd / 2 + 60, Hh - 14, '#7a86a0', { align: 'center', font: 'tiny' });
    });
  }
};
const S = SN._hubS = {
  active: false, readyCalled: false, view: null, event: null, setupData: null,
  setup(info) {
    const A = hubApi(), r1 = A.rng('event'), r2 = A.rng('race');
    const ev = this.event = { track: SN.TRACK_IDS[Math.floor(r1() * 4)], cls: 'flare', laps: 3, seed: Math.floor(r2() * 2 ** 32) };
    const seat = info.players.findIndex(p => p.id === info.me), team = SEAT_TEAMS[Math.max(0, seat) % 4], pilot = SN.pilotsOf(team)[0].id;
    this.me = { seat, team, pilot, color: (info.players[seat] || {}).color || '#ffffff' };
    // the field: the humans at the back by seat (each copy simulates only its own), AI in front
    const humansN = info.players.length, used = new Set(info.players.map((p, k) => SN.pilotsOf(SEAT_TEAMS[k % 4])[0].id));
    const ai = SN.PILOTS.filter(p => !used.has(p.id)).slice(0, 8 - humansN).map(p => ({ pilot: p.id, team: p.team, control: 'ai' }));
    this.setupData = { mode: 'hub', track: ev.track, cls: ev.cls, laps: ev.laps, team, pilot, seed: ev.seed, intro: false, players: [{ team, pilot }], entrantsOverride: [{ pilot, team, control: 'human', player: 0 }].concat(ai) };
    for (const p of info.players) if (p.id !== info.me) H.ghosts.set(p.id, { id: p.id, name: p.name, color: p.color, samples: [], team: SEAT_TEAMS[info.players.indexOf(p) % 4], done: null });
    A.on('card', c => { H.card = c; });
    A.on('start', () => { H.started = true; });
    A.on('message', (d, from) => { const gh = H.ghosts.get(from); if (!gh || !d) return; if (d.t === 'g') { gh.samples.push(Object.assign({ at: A.time() }, d)); if (gh.samples.length > 30) gh.samples.shift(); } if (d.t === 'done') gh.done = d.ms; });
    A.on('leave', ({ id }) => { H.ghosts.delete(id); });
    A.on('time-up', () => { this.timeUp(); });
    A.on('end', e => { H.ended = true; H.endInfo = e; SN.hubEnded = true; try { SN.game.audio.stopMusic(); SN.Audio && SN.Audio.stopHums(); } catch (err) { /* no sound */ } });
    this.vw = SN.loadView(ev.track);
    // the card's picture: the grid with every player's craft in its seat colour
    const R = this.cardRace = new SN.Race({ track: ev.track, mode: 'hub', cls: ev.cls, laps: 3, seed: 1, entrants: info.players.map((p, k) => ({ pilot: SN.pilotsOf(SEAT_TEAMS[k % 4])[0].id, team: SEAT_TEAMS[k % 4], control: 'ai' })), intro: false });
    this.vw.bind(R); const c = this.vw.cams[0]; c.ship = R.ships[0]; c.tv = true; c.tvTarget = () => R.ships[0];
  },
  /** the race scene hands its race over */
  attach(R, sc) {
    this.R = R; this.sc = sc; this.lastSend = -1; this.lastProg = -1;
    R.externalClock = () => hubApi().time() / 1000;
    R.rules.elim = 'respawn';
    sc.vw.setGhosts([...H.ghosts.values()].map(gh => ({ key: 'hub' + gh.id, color: gh.color, team: gh.team, pose: null, gh })));
    const step = sc.update.bind(sc);
    sc.update = dt => { if (H.ended) { sc.vw.step(0); return; } this.preStep(); step(dt); this.postStep(); };
  },
  preStep() {
    const R = this.R, A = hubApi();
    if (R.state === 'intro' || R.state === 'grid') { R.state = 'countdown'; R.stateT = 0; }
    if (R.state === 'countdown') R.t = Math.min(0, A.time() / 1000);
  },
  postStep() {
    const R = this.R, A = hubApi(), me = R.humans[0], now = A.time(); if (!me || !isFinite(now)) return;
    // ghosts: interpolate toward the latest, 0.1 s behind
    if (this.sc.vw.ghostList) for (const q of this.sc.vw.ghostList) { const s = q.gh.samples, t = now - 100; let a = null, b = null; for (let k = s.length - 1; k >= 0; k--) { if (s[k].at <= t) { a = s[k]; b = s[k + 1] || s[k]; break; } } if (!a && s.length) a = b = s[0]; if (!a) { q.pose = null; continue; } const f = b.at > a.at ? Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at))) : 0, lp = (x, y) => x + (y - x) * f; q.pose = { s: SN.wrap(lp(a.p, b.p), R.track.L), u: lp(a.u, b.u), h: lp(a.h, b.h), yaw: lp(a.y, b.y), roll: lp(a.r, b.r) }; q.p = lp(a.p, b.p); q.lap = b.lap; }
    if (H.ended) return;
    if (now - this.lastSend >= 100 && R.going) {
      this.lastSend = now; const fr = R.track.frameAt(me.s), y = Math.atan2(V.dot(me.F, fr.R), V.dot(me.F, fr.F));
      const ok = A.send({ t: 'g', p: Math.round(me.p), u: Math.round(me.u), h: Math.round(me.h), y: +y.toFixed(3), r: +me.visRoll.toFixed(2), v: Math.round(SN.Ship.speed(me)), lap: me.lap, fin: me.finished ? 1 : 0 }, { reliable: false }); H.sent++;
    }
    if (now - this.lastProg >= 1000 && R.going) { this.lastProg = now; A.progress({ score: Math.round(me.p / 16), label: 'LAP ' + Math.min(R.laps, me.lap + 1) + '/' + R.laps + ' • ' + SN.ord(me.place) }); H.progressN++; }
    if (me.finished && !H.reported) {
      H.reported = true; const ms = Math.max(1, Math.round(me.finishTime * 1000));
      A.result({ time: ms, stats: { 'Best lap': SN.fmtTime(me.bestLap), 'Place vs AI': SN.ord(me.place) }, awards: me.stats.rolls ? [{ title: 'Barrel roller', detail: me.stats.rolls + ' rolls landed' }] : [] });
      A.send({ t: 'done', ms }, { reliable: true });
    }
  },
  timeUp() { if (H.reported) return; H.reported = true; const me = this.R && this.R.humans[0]; hubApi().result({ score: me ? Math.max(0, Math.round(me.p / 16)) : 0 }); },
  /** the HUD's ghost list */
  hud(g, X, Y, Wd, Hh) {
    const R = this.R, me = R.humans[0], list = [{ name: 'YOU', p: me.p, color: this.me.color }].concat((this.sc.vw.ghostList || []).map(q => ({ name: q.gh.name, p: q.p || 0, color: q.gh.color, done: q.gh.done }))).sort((a, b) => (a.done || 1e12) - (b.done || 1e12) || b.p - a.p);
    list.forEach((e, k) => { px.rect(g, X + Wd - 90, Y + 84 + k * 10, 6, 6, e.color); T(g, (k + 1) + ' ' + e.name, X + Wd - 80, Y + 83 + k * 10, '#ffffff', { font: 'tiny' }); });
    if (H.ended) { E.px.blend(g, .7, 'normal', () => px.rect(g, X, Y + Hh / 2 - 30, Wd, 60, '#05060c')); E.font.title(g, 'ROUND OVER', X + Wd / 2, Y + Hh / 2 - 22, { scale: 3, align: 'center', colors: ['#ffffff', '#ffd23f'] }); const st = H.endInfo && H.endInfo.standings; if (st) T(g, st.map((grp, k) => (k + 1) + '. ' + grp.map(id => (H.info.players.find(p => p.id === id) || {}).name).join(' = ')).join('   '), X + Wd / 2, Y + Hh / 2 + 10, '#bff8ff', { align: 'center', font: 'tiny' }); }
  }
};
SN.hubSession = H.active ? S : null;
if (H.active) SN.scenes.race.pausable = false;
})();
