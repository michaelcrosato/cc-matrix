// CRACKMANIA online (PLAN §5.7): AI Hub sessions in ghost mode, TrackMania's own online model. Every copy time-attacks
// the same track (picked with AIHub.rng) for three minutes and shows the others as ghost cars. Its own card (the track
// from above, the players in their seat colours, ready ticks, the goal, the controls, the time left), the countdown on
// the hub's clock, ghost traffic at 10 a second, progress each second, one result, and silence at the end
import { ctx, E, U } from '../ctx.js';
import { SESSION_TRACKS } from '../data/tracks.js';
import { ENVS } from '../env/envs.js';
import { startRace, update as raceUpdate, draw as raceDraw, rememberSteps } from '../scenes/race.js';
import { Run, fmt } from '../race/run.js';
import { poseOf } from '../car/camera.js';
import { RACE_INPUT } from '../input.js';
import { T1, T2, title, panel, UI } from '../ui/kit.js';
import { promptRow, promptBar } from '../ui/glyphs.js';
import { logo } from '../scenes/title.js';
import { drawMinimap } from '../scenes/menu.js';
import { quatFromFrame, frameFromQuat, slerp, lerp3, dot, sub } from '../lib/v3.js';
import { fx } from '../ui/fx.js';
const H = () => globalThis.AIHub;
export const active = () => !!(globalThis.AIHub && AIHub.active);
export class Online {
  constructor(game) { this.game = game; this.info = null; this.phase = 'off'; this.ghosts = new Map(); this.best = null; this.runs = 0; this.respawns = 0; this.reported = false; this.cardState = null; this.sent = 0; this.lastSend = 0; this.lastProg = 0; this.standings = null; this.endReason = null; this.trackId = null; }
  /** connect (a boot step in a session): the round's info, the track picked the same on every copy */
  async connect() {
    if (!active()) return null;
    const info = await H().connect({ mode: 'ghost', seats: [1, 4], card: true });
    this.info = info; if (!info) return null;
    const rng = H().rng('track'); this.trackId = SESSION_TRACKS[Math.floor(rng() * SESSION_TRACKS.length)];
    H().on('card', c => { this.cardState = c; });
    H().on('start', () => { this.phase = 'countdown'; this.lastProg = 0; this.progressNow(); });
    H().on('message', (d, from) => this.receive(d, from));
    H().on('leave', ({ id }) => { this.ghosts.delete(id); });
    H().on('time-up', () => this.report());
    H().on('end', ({ reason, standings }) => { this.report(); this.phase = 'over'; this.endReason = reason; this.standings = standings; try { this.game.audio.mute(true); } catch (e) { /* none */ } ctx.sound && ctx.sound.stopCar(); });
    for (const p of info.players) if (p.id !== info.me) this.ghosts.set(p.id, { id: p.id, name: p.name, color: p.color, buf: [], area: null, best: null });
    return info;
  }
  start() { }
  /** seconds: the wall clock in a browser, the game's clock headless (tests run faster than real time) */
  clock() { return this.game.headless ? this.game.real : performance.now() / 1000; }
  get roundMs() { const L = this.info && this.info.limitMs; return Math.min(180000, L ? L - 5000 : 180000); }
  receive(d, from) {
    const g = this.ghosts.get(from); if (!g || !d) return;
    if (d.t === 'g') { g.area = d.area; g.buf.push({ at: this.game.real, p: d.p, q: d.q, v: d.v, run: d.run }); if (g.buf.length > 30) g.buf.shift(); }
    else if (d.t === 'best') { g.best = d.ms; }
  }
  /** a ghost's pose 150 ms in the past, between its two samples */
  pose(g) {
    if (g.area !== this.trackId || !g.buf.length) return null;
    const t = this.game.real - .15, B = g.buf; let i = B.length - 1; while (i > 0 && B[i - 1].at > t) i--;
    const a = B[Math.max(0, i - 1)], b = B[i]; if (!a || !b) return null;
    const k = b.at > a.at ? Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at))) : 1, jump = a.run !== b.run;
    const p = jump ? b.p : lerp3(a.p, b.p, k), q = jump ? b.q : slerp(a.q, b.q, k), F = frameFromQuat(q);
    return { p, f: F.f, r: F.r, u: F.u, kmh: b.v };
  }
  /** each step in a round: the countdown on the hub's clock, ghosts out, progress */
  step(dt) {
    const sess = ctx.session; if (!sess || this.phase === 'over') return;
    const P = sess.players[0], run = P.run, now = H().time();
    if (this.phase === 'countdown' || this.phase === 'card') { if (isFinite(now) && now > -4000) { this.phase = now < 0 ? 'countdown' : 'racing'; } run.count = isFinite(now) ? Math.max(0, -now / 1000) : 99; run.countMax = 3; if (now >= 0 && run.phase === 'countdown') run.count = 0; }
    if (this.phase === 'countdown' && now >= 0) this.phase = 'racing';
    if (this.phase === 'racing' && now >= this.roundMs) { this.report(); this.phase = 'waiting'; sess.locked = true; }
    // ghosts out: ten a second, unreliable, small
    const wall = this.clock();   // (wall-clock in a browser: a slow device still talks ten times a second and reports each second)
    if ((this.phase === 'racing' || this.phase === 'waiting') && wall - this.lastSend >= .1) {
      this.lastSend = wall; const c = run.car, q = quatFromFrame(c.f, c.r, c.u);
      H().send({ t: 'g', area: this.trackId, run: this.runs, ms: Math.round(run.steps * 1000 / 120), p: c.p.map(v => Math.round(v * 100) / 100), q: q.map(v => Math.round(v * 1e4) / 1e4), v: Math.round(c.kmh), f: (c.grounded ? 1 : 0) | (c.boostT > 0 ? 2 : 0) }, { reliable: false }); this.sent++;
    }
    if (wall - this.lastProg >= 1 && this.phase !== 'card') this.progressNow();
  }
  /** the player's standing for the hub's scoreboard */
  progressNow() {
    const sess = ctx.session, P = sess && sess.players[0]; if (!P || !this.info) return;
    this.lastProg = this.clock();
    if (this.best !== null) H().progress({ score: 2e6 - this.best, label: 'BEST ' + fmt(Math.round(this.best * 120 / 1000)) });
    else H().progress({ score: P.run.cps.size * 1000 + Math.round(progressMetres(P)), label: 'CP ' + P.run.cps.size + '/' + sess.course.cpCount });
  }
  /** one result, exactly once */
  report() {
    if (this.reported || !this.info) return; this.reported = true;
    const sess = ctx.session, P = sess && sess.players[0], stats = { Runs: this.runs + 1, Respawns: this.respawns + (P ? P.run.respawns : 0) };
    if (this.best !== null) H().result({ time: this.best, stats });
    else H().result({ score: P ? P.run.cps.size * 1000 + Math.round(progressMetres(P)) : 0, stats });
  }
  finished(ms) {
    const better = this.best === null || ms < this.best; if (better) { this.best = ms; H().send({ t: 'best', ms }, { reliable: true }); }
    return better;
  }
}
function progressMetres(P) { const S = ctx.session.course.samples, c = P.run.car.p; let best = 0, bd = 1e18; for (let i = 0; i < S.length; i += 2) { const d = (S[i].p[0] - c[0]) ** 2 + (S[i].p[1] - c[1]) ** 2 + (S[i].p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = i; } } return best * 2; }
/** the round's race: time attack, restarts as often as you like */
function startRound(O) {
  const track = ctx.tracks[O.trackId], model = ENVS[track.env].car, me = O.info.players.find(p => p.id === O.info.me);
  const sess = startRace({ kind: 'online', stay: true, track, intro: false, countdown: 99, label: 'ONLINE', canRestart: true, noSlowmo: true, orbit: false,
    players: [{ input: ctx.game.input, name: me ? me.name : 'YOU', color: me ? me.color : '#ffffff', model, paint: ctx.profile.paint(model) }],
    ghosts: [...O.ghosts.values()].map(g => ({ live: () => O.pose(g), steps: () => 0, model, paint: { body: g.color, accent: '#ffffff', pattern: 1, patternColor: '#ffffff', number: g.id + 1, rims: 0, helmet: g.color }, name: g.name, color: g.color, always: true, id: g.id, ghost: true })),
    roundClock: () => { const left = Math.max(0, O.roundMs - Math.max(0, H().time())); return isFinite(left) ? fmt(Math.round(left * 120 / 1000)).replace(/\.\d\d$/, '') : '3:00'; },
    targets: () => O.best !== null ? { medal: 3, steps: Math.round(O.best * 120 / 1000), best: null } : null,
    onFinish(s, P) { const ms = Math.round(P.results.steps * 1000 / 120), better = O.finished(ms); if (better) fx.note(P, 'NEW BEST!', '#5ab4ff', 2); s.after = () => restart(O); s.afterTime = 1.8; },
    onRestart() { O.runs++; },
    update: dt => { O.step(dt); if (O.phase === 'waiting' || O.phase === 'over') ctx.session.locked = true; }
  });
  sess.ghosts = sess.ghosts.filter(g => g.live);
  return sess;
}
function restart(O) {
  const s = ctx.session; if (!s || O.phase !== 'racing') return; const P = s.players[0]; O.respawns += P.run.respawns; O.runs++;
  P.run = new Run(s.course, P.model, { countdown: 1 }); P.cam.snap();
}
/* ---- the scene: the card, then the round ---- */
const st = { t: 0, answered: false, more: false, sess: null };
export const onlineScene = {
  input: Object.assign({}, RACE_INPUT, { more: ['KeyM', 'Pad3'] }), touch: [], camera: { zoom: false },
  enter() {
    const O = ctx.online; st.t = 0; st.answered = false;
    if (!O.info) { ctx.game.go('title'); return; }
    O.phase = 'card'; st.sess = startRound(O); ctx.music.play('title');
    try { H().ready(); } catch (e) { /* already */ }
  },
  update(dt) {
    const O = ctx.online, I = ctx.game.input; st.t += dt;
    if (!O.info) return;
    if (O.phase === 'over') return;   // (the hub shows the results; nothing moves)
    // Create + Options is the hub's: Options is ignored while Create is held (no pause here anyway)
    if (O.phase === 'card') {
      const ck = I.clicked && I.clicked();
      if (I.pressed('confirm') || I.pressed('start') || ck) { H().answer('ready'); st.answered = true; ctx.sound.sfx('confirm'); }
      if (I.pressed('more')) { H().answer('more'); st.more = !st.more; ctx.sound.sfx('tick'); }
      O.step(dt);
      return;
    }
    if (O.phase === 'countdown' && ctx.music.cur !== 'heat') ctx.music.race(ctx.session.env, 'online');
    rememberSteps(); raceUpdate(dt);
  },
  draw(r) {
    const O = ctx.online;
    if (!O.info || !ctx.session) { r.overlay(g => T2(g, 'CONNECTING…', r.W / 2, r.H / 2, '#ffffff', 'center')); return; }
    if (O.phase === 'card') return cardDraw(r, O);
    raceDraw(r);
    r.overlay(g => {
      if (O.phase === 'waiting') { panel(g, r.W / 2 - 130, r.H * .4, 260, 40, { border: '#ffd060' }); T2(g, 'WAITING FOR THE OTHERS', r.W / 2, r.H * .4 + 6, '#ffffff', 'center'); T1(g, O.best !== null ? 'YOUR BEST ' + fmt(Math.round(O.best * 120 / 1000)) : 'NO FINISH THIS ROUND', r.W / 2, r.H * .4 + 26, '#ffd060', 'center'); }
      let y = 70; for (const g2 of O.ghosts.values()) { T1(g, g2.name + (g2.best !== null ? ' ' + fmt(Math.round(g2.best * 120 / 1000)) : ''), 8, y, g2.color); y += 11; }
    });
  }
};
function cardDraw(r, O) {
  // the track from above, slowly turning (no Math.random on the card)
  const track = ctx.tracks[O.trackId], w = ctx.worlds.world;
  ctx.worlds.draw3d = ww => { const c = ctx.session.course.samples, mid = c[Math.floor(c.length / 2)].p, a = st.t * .15, d = 260, pos = [mid[0] + Math.cos(a) * d, mid[1] + Math.sin(a) * d, 160]; const pose = poseOf(null, { pos, look: mid, up: [0, 0, 1], fov: 50 }); ww.camera.pose = pose; ww.camera.fixed = pose; ww.camera.target.x = mid[0] * U; ww.camera.target.y = mid[1] * U; ww.camera.target.z = 0; ctx.worlds.cur.view.draw(ww.pen, { t: st.t, lights: 0, near: mid }); ctx.worlds.drawScenery(ww.pen, st.t, mid); };
  ctx.worlds.draw(r);
  const C = O.cardState || {}, ready = new Set(C.ready || []);
  r.overlay(g => {
    E.px.blend(g, .45, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a'));
    logo(g, r.W / 2, 10, r.W > 400 ? 3 : 2, 9);
    T2(g, track.name.toUpperCase() + ' · ' + ENVS[track.env].name, r.W / 2, 44, '#ffd060', 'center');
    panel(g, r.W / 2 - 170, 64, 340, 22 + O.info.players.length * 18, {});
    O.info.players.forEach((p, i) => { const y = 70 + i * 18; E.px.rect(g, r.W / 2 - 160, y + 2, 10, 10, p.color); T2(g, p.name + (p.id === O.info.me ? ' (YOU)' : ''), r.W / 2 - 144, y, p.color); T2(g, ready.has(p.id) ? '✓ READY' : '...', r.W / 2 + 160, y, ready.has(p.id) ? '#5ad06a' : UI.dim, 'right'); });
    const y0 = 92 + O.info.players.length * 18;
    T1(g, 'BEST TIME IN 3 MINUTES WINS · RETRY AS OFTEN AS YOU LIKE', r.W / 2, y0, '#ffffff', 'center');
    const dev = ctx.game.input.lastDevice;
    promptRow(g, r.W / 2, y0 + 16, [['gas', 'GAS'], ['brake', 'BRAKE'], ['left', 'STEER'], ['respawn', 'RESPAWN'], ['restart', 'RESTART']], { align: 'center' });
    drawMinimap(g, track, r.W / 2 - 60, y0 + 34, 120, Math.max(30, r.H - y0 - 90), '#ffffff');
    const left = C.left; T2(g, C.paused ? 'PAUSED: MORE TIME ASKED' : C.starting ? 'STARTING…' : left !== null && left !== undefined ? 'STARTS IN ' + Math.ceil(left / 1000) : 'GET READY', r.W / 2, r.H - 44, '#ffd060', 'center');
    promptBar(g, r, [['confirm', st.answered ? 'READY ✓' : 'READY'], ['more', st.more ? 'MORE TIME ✓' : 'MORE TIME']]);
  });
}
