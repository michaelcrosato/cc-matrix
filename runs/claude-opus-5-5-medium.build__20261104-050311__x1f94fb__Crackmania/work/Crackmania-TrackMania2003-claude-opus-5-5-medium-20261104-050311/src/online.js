// AI Hub sessions (Session Protocol v1, ghost mode): skip the title and menus, our own card (the track's flyover, the
// players in their seat colours with READY ticks, the goal, the controls, the time left), then three minutes of time
// attack on one track for everyone; each copy shows the others as ghost cars. Progress each second, one result.
import { SESSION_TRACKS, ENV_INFO } from './data.js';
import { Demo } from './demo.js';
import { drawCar, defaultPaint } from './view.js';
import { fmt } from './run.js';
import { quatFromFrame, frameFromQuat, slerp, U } from './v3.js';
import { big, text, tw, panel, promptBar, glyph, COL } from './ui.js';

const E = globalThis.My3D2dge, px = E.px;
const ROUND_MS = 180000;
export class Online {
  constructor(app) {
    this.app = app; this.H = typeof globalThis.AIHub !== 'undefined' ? globalThis.AIHub : null;
    this.active = !!(this.H && this.H.active); this.phase = this.active ? 'connecting' : 'off';
    this.card = { left: null, ready: [], asked: false }; this.remote = {}; this.best = null; this.runN = 0; this.sent = 0; this.lastSend = 0; this.lastProg = 0; this.resulted = false; this.ended = false; this.respawns = 0; this.runs = 0;
  }
  get game() { return this.app.game; }
  /** connect (the page's head starts it at once: window.__hubConnect) and pick the round's track */
  async connect() {
    if (this._conn) return this._conn;
    return (this._conn = (async () => {
      const H = this.H; let info = null;
      try { info = await (globalThis.__hubConnect || H.connect({ mode: 'ghost', seats: [1, 4], card: true })); } catch (e) { info = null; }
      if (!info) { this.active = false; this.phase = 'off'; return null; }
      this.info = info;
      const R = H.rng('track'); this.trackId = SESSION_TRACKS[Math.floor(R() * SESSION_TRACKS.length)];
      this.env = this.app.trackProg(this.trackId).env;
      return info;
    })());
  }
  async maybeStart() {
    if (!this.active) return;
    const H = this.H, app = this.app;
    if (!this.game.headless && E.World3D.backend === 'none') { H.fail('3D graphics are not available'); return; }
    const info = await this.connect(); if (!info) return;
    const id = this.trackId;
    this.track = app.track(id); this.prep = app.prepare(this.track, id); this.car = ENV_INFO[this.track.env].car;
    this.demo = new Demo(app, id, { cheat: true, skill: 1, camSwitch: 5 });
    H.on('card', c => { this.card = c; });
    H.on('start', () => this.start());
    H.on('message', (d, from) => this.message(d, from));
    H.on('leave', e => { delete this.remote[e.id]; });
    H.on('time-up', () => this.report());
    H.on('end', e => this.end(e));
    this.phase = 'card';
    H.ready();
  }
  me() { return this.info && this.info.players.find(p => p.id === this.info.me); }
  frontUpdate(dt) {
    if (this.phase !== 'card') return;
    if (this.demo) this.demo.step(dt);
    const I = this.game.input;
    if (I.pressed('confirm') || I.pressed('start') || I.clicked()) this.H.answer('ready');
    if (I.pressed('alt') || (I.held && I.held.has('KeyM') && !this._m)) this.H.answer('more');
    this._m = I.held && I.held.has('KeyM');
  }
  frontDraw(r) {
    if (this.demo && this.phase === 'card') this.demo.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      if (this.phase !== 'card') { big(g, 'CRACKMANIA', W / 2, H * .4, '#ffd23a', 3); text(g, this.phase === 'connecting' ? 'CONNECTING...' : '', W / 2 - 50, H * .55, '#ffffff'); return; }
      E.font.title(g, 'CRACKMANIA', W / 2, 10, { scale: 3, colors: ['#fff6d0', '#ffd060', '#ff8a2a', '#c8402a'], depth: 2, align: 'center' });
      text(g, this.track.name + ' • ' + ENV_INFO[this.track.env].name, W / 2 - tw(this.track.name + ' • ' + ENV_INFO[this.track.env].name) / 2, 44, '#ffffff');
      const pl = this.info.players; pl.forEach((p, i) => { const x = W / 2 - pl.length * 52 + i * 104 + 4, ready = (this.card.ready || []).includes(p.id); panel(g, x, 66, 96, 34, { accent: p.color }); E.font.text(g, String(p.name).slice(0, 12).toUpperCase(), x + 48, 72, p.color, { align: 'center', outline: '#10101a' }); E.font.text(g, ready ? '+ READY' : '...', x + 48, 86, ready ? '#5ae07a' : '#8a8aa0', { align: 'center', outline: '#10101a' }); });
      const L = ['BEST TIME IN 3 MINUTES WINS', 'RETRY AS OFTEN AS YOU LIKE • OTHERS ARE GHOSTS'];
      L.forEach((l, i) => text(g, l, W / 2 - tw(l) / 2, 112 + i * 20, i ? COL.dim : '#ffd23a'));
      const pad = this.game.input.lastDevice === 'gamepad';
      const C = pad ? 'R2 GAS • L2 BRAKE • STICK STEER • CIRCLE RESPAWN • TRIANGLE RESTART' : 'W/UP GAS • S/DOWN BRAKE • A D STEER • ENTER RESPAWN • R RESTART';
      E.font.text(g, C, W / 2, 158, '#ffffff', { align: 'center', outline: '#10101a' });
      const left = this.card.left; text(g, left == null ? (this.card.paused ? 'PAUSED' : 'STARTING') : 'STARTS IN ' + Math.ceil(left / 1000), W / 2 - 60, 178, '#ffd23a');
      promptBar(g, this.game, [['confirm', this.card.asked ? 'READY' : 'READY'], ['alt', this.card.asked ? 'MORE TIME (ASKED)' : 'MORE TIME (M)']]);
    });
  }
  start() {
    if (this.phase === 'race') return;
    this.phase = 'race'; const app = this.app, me = this.me();
    const paint = Object.assign(defaultPaint(this.car), { body: me ? me.color : '#e8443a' });
    this.game.go('race', {
      mode: 'online', track: this.track, prepared: this.prep, intro: false, countdown: 3, endless: true, noOrbit: true, subtitle: 'AI HUB',
      players: [{ name: me ? me.name : 'YOU', carId: this.car, paint, color: me ? me.color : '#ffd23a' }],
      onFinish: (P, R) => { this.runs++; if (this.best === null || R.finishSteps < this.best) { this.best = R.finishSteps; P.best = this.best; P.newBest = true; this.H.send({ t: 'best', ms: Math.round(this.best * 1000 / 120) }); } },
      onRestart: () => { this.runN++; },
      hooks: {
        update: (S, dt) => {
          const t = this.H.time(), R = S.players[0].run;
          if (this.ended) { S.mute = true; return false; }
          if (t < 0 && R.phase === 'countdown') R.cd = Math.max(.001, -t / 1000);
        },
        after: (S, dt) => this.tick(S),
        draw3d: (S, pen) => this.drawGhosts(S, pen),
        hudExtra: (S, P, g, W, H) => this.hud(S, P, g, W, H)
      }
    });
  }
  tick(S) {
    const H = this.H, t = H.time(), P = S.players[0], R = P.run, c = R.car, now = t;
    if (this.ended) return;
    if (P.run.finished && P.finishT > 1.5 && !this.resulted) this.app.scenes.race.restart(P);
    this.respawns = R.respawns;
    if (now - this.lastSend >= 100 && t >= -3000) {
      this.lastSend = now; const q = quatFromFrame(c.f, c.r, c.u);
      H.send({ t: 'g', area: this.trackId, run: this.runN, ms: Math.max(0, Math.round(R.steps * 1000 / 120)), p: c.p.map(v => Math.round(v * 100) / 100), q: q.map(v => Math.round(v * 1e4) / 1e4), v: Math.round(Math.hypot(...c.v) * 3.6), f: (c.grounded ? 1 : 0) | (c.boostT > 0 ? 2 : 0) }, { reliable: false });
      this.sent++;
    }
    if (now - this.lastProg >= 1000) {
      this.lastProg = now;
      H.progress(this.best !== null ? { score: 2e6 - Math.round(this.best * 1000 / 120), label: 'BEST ' + fmt(this.best) } : { score: R.cpCount * 1000 + Math.round(R.progress), label: 'CP ' + R.cpCount + '/' + S.course.cps.length });
    }
    const limit = Math.min(ROUND_MS, this.info.limitMs ? this.info.limitMs - 5000 : ROUND_MS);
    if (t >= limit) this.report();
  }
  report() {
    if (this.resulted) return; this.resulted = true;
    const stats = { Runs: this.runs, Respawns: this.respawns };
    if (this.best !== null) this.H.result({ time: Math.round(this.best * 1000 / 120), stats });
    else { const R = this.app.race && this.app.race.players[0].run; this.H.result({ score: R ? R.cpCount * 1000 + Math.round(R.progress) : 0, stats }); }
  }
  end(e) {
    this.ended = true; this.endInfo = e; this.phase = 'ended';
    if (!this.resulted) this.resulted = true;
    this.game.audio.mute(true); this.game.input.clear && this.game.input.clear();
    const R = this.app.race; if (R) for (const P of R.players) { P.sound.stop(); P.input = { move: () => [0, 0], analog: () => 0, down: () => false, pressed: () => false, anyPressed: () => false, lastDevice: 'keyboard' }; }
  }
  message(d, from) {
    if (!d || typeof d !== 'object') return;
    const r = this.remote[from] || (this.remote[from] = { buf: [], best: null });
    if (d.t === 'g') { r.buf.push({ at: (typeof performance !== 'undefined' ? performance.now() : Date.now()), ...d }); if (r.buf.length > 30) r.buf.shift(); }
    if (d.t === 'best') r.best = d.ms;
  }
  remoteAt(r) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - 150, B = r.buf; if (!B.length) return null;
    let i = B.length - 1; while (i > 0 && B[i - 1].at > now) i--;
    const a = B[Math.max(0, i - 1)], b = B[i], k = b.at === a.at ? 1 : Math.max(0, Math.min(1, (now - a.at) / (b.at - a.at)));
    if (a.run !== b.run) return Object.assign({}, b, { pp: b.p, qq: b.q });
    return { area: b.area, pp: a.p.map((v, j) => v + (b.p[j] - v) * k), qq: slerp(a.q, b.q, k), v: b.v };
  }
  drawGhosts(S, pen) {
    if (!this.info) return;
    for (const id in this.remote) {
      const r = this.remote[id], s = this.remoteAt(r), pl = this.info.players.find(p => String(p.id) === String(id));
      if (!s || s.area !== this.trackId || !pl) continue;
      const fr = frameFromQuat(s.qq);
      drawCar(pen, this.car, { p: s.pp, f: fr.f, r: fr.r, u: fr.u, wheelSpin: S.t * 3, time: S.t }, Object.assign(defaultPaint(this.car), { body: pl.color }), { ghost: true, tint: pl.color });
      r.screen = s.pp;
    }
  }
  hud(S, P, g, W, H) {
    const t = this.H.time(), left = Math.max(0, Math.min(ROUND_MS, this.info.limitMs ? this.info.limitMs - 5000 : ROUND_MS) - Math.max(0, t));
    E.font.text(g, 'ROUND ' + Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'), 10, 46, '#ffd23a', { outline: '#10101a' });
    if (this.best !== null) { text(g, 'BEST ' + fmt(this.best), W - 130, 30, '#5ae07a'); }
    // name tags over the others' ghosts (the pixel font, never HTML)
    const w = this.app.view && this.app.view.world;
    for (const id in this.remote) { const r = this.remote[id], pl = this.info.players.find(p => String(p.id) === String(id)); if (!r.screen || !pl || !w) continue; const sp = w.project(r.screen[0] * U, r.screen[1] * U, (r.screen[2] + 2.5) * U); if (sp) E.font.text(g, String(pl.name).slice(0, 12).toUpperCase(), sp[0], sp[1], pl.color, { align: 'center', outline: '#10101a' }); }
    let y = 64; for (const id in this.remote) { const r = this.remote[id], pl = this.info.players.find(p => String(p.id) === String(id)); if (pl && r.best) { E.font.text(g, String(pl.name).slice(0, 10).toUpperCase() + ' ' + fmt(Math.round(r.best * 120 / 1000)), 10, y, pl.color, { outline: '#10101a' }); y += 11; } }
    if (this.resulted && !this.ended) big(g, 'WAITING FOR THE OTHERS', W / 2, H * .25, '#ffffff', 2);
    if (this.ended) { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c')); big(g, 'ROUND OVER', W / 2, H * .35, '#ffd23a', 3); }
  }
}
