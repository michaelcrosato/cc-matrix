// AI Hub, ghost mode (Session Protocol v1, client 1.4.0; the protocol is lib/hub/README.md). Each copy runs its own
// Flower Sprint round (S1, S2, S5); the copies send each other only their own car, and show the others' cars only
// while they share its stage. The game's own card answers ready and more time; the round starts on the hub's clock.
// Outside a session none of this runs: OB.env.hub is false and the game plays as it does alone.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const G = () => OB.game;
OB.env.hub = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
const ROUTE = ['S1', 'S2', 'S5'];

const Hub = {
  info: null, ghosts: new Map(), card: { left: null, ready: [], asking: 0, asked: false, starting: false, paused: false },
  started: false, sent: 0, progressT: 0, gateT: 0, sendT: 0, done: false, over: false, time: 0, stats: { drift: 0, near: 0 },
  /** the hub's clock in seconds of the round (negative in the countdown); the protocol's time() is milliseconds */
  clock() { try { return window.AIHub.time() / 1000; } catch (e) { return -1; } },
  /** connect: the hub's round info, or null outside a session; then the card is the game's own */
  connect() {
    if (!OB.env.hub) return Promise.resolve(null);
    window.AIHub.on('card', c => { this.card = Object.assign(this.card, c); });
    window.AIHub.on('start', () => { this.started = true; });
    window.AIHub.on('message', (data, from) => { if (data && data.t === 'g') this.ghosts.set(from, { d: data, at: Date.now() }); if (data && data.t === 'done') { this.ghosts.set(from, { d: Object.assign({}, data), at: Date.now(), done: true }); } });
    window.AIHub.on('leave', d => this.ghosts.delete(d.id));
    window.AIHub.on('time-up', () => this.timeUp());
    window.AIHub.on('end', () => this.end());
    return window.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => { this.info = info; return info; });
  },
  /** the seat colour of this copy, and the names */
  me() { return this.info ? this.info.players.find(p => p.id === this.info.me) : null; },
  name(id) { const p = this.info && this.info.players.find(q => q.id === id); return (p ? p.name : 'P' + id).replace(/[^\x20-\x7e]/g, '?').slice(0, 10); },
  color(id) { const p = this.info && this.info.players.find(q => q.id === id); return p ? p.color : '#ffffff'; },
  /** the round's random streams: the same on every copy */
  seed() { try { return Math.floor(window.AIHub.rng('traffic')() * 1e9) + 1; } catch (e) { return 1234; } },
  /** each frame of the race: the ghost sends, the progress once a second, and the hub's clock for the start */
  tick(race, dt) {
    if (!OB.env.hub || !race) return;
    this.sendT -= dt; this.progressT -= dt;
    if (this.sendT <= 0 && race.car) {
      this.sendT = .1;
      const c = race.car;
      window.AIHub.send({ t: 'g', area: race.stage.def.id, z: Math.round(c.z), x: +c.x.toFixed(3), v: Math.round(c.v), yaw: +c.vx.toFixed(2), drift: c.drift.on ? +c.drift.a.toFixed(2) : 0 }, { reliable: false });
    }
    if (this.progressT <= 0) {
      this.progressT = 1;
      const pct = Math.round(100 * Math.min(1, race.progress() / this.routeLen(race)));
      window.AIHub.progress({ score: Math.round(race.progress() / 200), label: 'Stage ' + race.routeIds.length + '/' + ROUTE.length + ' • ' + pct + '%' });
    }
  },
  routeLen(race) { return ROUTE.reduce((a, id) => a + OB.World.stage(id).len, 0); },
  /** the round's end for this copy: the result on the hub, then wait for the others */
  finished(race) {
    if (this.done) return;
    this.done = true;
    const time = Math.max(0, Math.round(this.clock() * 1000));
    window.AIHub.send({ t: 'done', time }, { reliable: true });
    window.AIHub.result({ time, stats: { 'Best drift': Math.round(race.car.stats.bestDrift || 0), 'Near misses': race.counters.nearmisses } });
  },
  timeUp() { if (this.done || !OB.race) return; this.done = true; window.AIHub.result({ score: Math.round(OB.race.progress() / 200) }); },
  end() { this.over = true; OB.Music.stop(.2); try { if (G().audio) G().audio.muted = true; } catch (e) { /* no sound */ } },
  /** the ghosts that share this stage, as cars to draw (translucent, in their seat colour, with a name tag) */
  visible(race) {
    const out = [];
    for (const [id, g] of this.ghosts) {
      if (!g.d || g.d.t !== 'g' || g.d.area !== race.stage.def.id || Date.now() - g.at > 3000) continue;
      out.push({ id, z: g.d.z, x: g.d.x, v: g.d.v, color: this.color(id), name: this.name(id) });
    }
    return out;
  },
};
OB.Hub = Hub;

/* ---- the card: the game's own, before the round: its title, the players in their seats, how to win, the controls ---- */
const hubcard = {
  enter() { OB.Music.play('title'); this.t = 0; },
  update(dt) {
    this.t += dt;
    if (!OB.env.hub) return;
    if (Hub.started) { G().go('race', {}, { fade: 0 }); return; }   // the round starts: the race takes over (its countdown waits for the hub's clock)
    const I = G().input;
    if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked() && this.inRect(I.clicked(), 'ready'))) window.AIHub.answer('ready');
    if (I.pressed('prevTab') || I.pressed('nextTab') || (I.clicked && I.clicked() && this.inRect(I.clicked(), 'more'))) window.AIHub.answer('more');
  },
  rects: {},
  inRect(p, k) { const r = this.rects[k]; return r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]; },
  draw(r) {
    const W = r.W, H = r.H, info = Hub.info, c = Hub.card;
    r.sky(['#2a1450', '#7a2a6a', '#ff9a6a']);
    r.overlay(g => {
      E.font.title(g, 'OutBloom', W / 2, H * .08, { scale: 3, align: 'center' });
      E.font.text(g, 'FLOWER SPRINT • FASTEST TO THE GOAL WINS', W / 2, H * .3, '#ffe6c0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      // the players on the grid, each car in its seat colour, with READY when it is
      const players = info ? info.players : [];
      players.forEach((p, i) => {
        const x = W * (.2 + i * .2), y = H * .58, ready = (c.ready || []).includes(p.id);
        OB.Art.playerCar(g, x, y, Math.max(.8, H / 240), { paint: p.color, steer: 0, brake: false, passenger: { skin: '#f0c8a0' }, passengerHair: OB.CAST.marisol.hair });
        E.font.text(g, p.name.replace(/[^\x20-\x7e]/g, '?').slice(0, 10), x, y + 12, '#ffffff', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
        E.font.text(g, ready ? 'READY' : 'WAITING', x, y + 20, ready ? '#7aff9a' : '#c8b8d8', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      });
      const left = c.left != null ? Math.max(0, Math.ceil(c.left / 1000)) : null;
      if (left !== null) E.font.text(g, 'START IN ' + left, W / 2, H * .78, '#ffd060', { align: 'center', outline: false, shadow: '#000', scale: 1 });
      // the two answers: ready, and more time
      const ready = [W / 2 - 150, H * .86, 130, 22], more = [W / 2 + 20, H * .86, 130, 22];
      this.rects = { ready, more };
      OB.UI.panel(g, ready[0], ready[1], ready[2], ready[3], { bg: ['#3a7a4a', '#5aaa6a'] }); E.font.text(g, 'READY', ready[0] + ready[2] / 2, ready[1] + 7, '#ffffff', { align: 'center', outline: false, scale: 1 });
      OB.UI.panel(g, more[0], more[1], more[2], more[3], { bg: ['#4a3a6a', '#6a5a8a'] }); E.font.text(g, 'MORE TIME', more[0] + more[2] / 2, more[1] + 7, '#ffffff', { align: 'center', outline: false, scale: 1 });
      E.font.text(g, 'GOAL: FASTEST TO THE FLOWER SPRINT GOAL', W / 2, H * .14, '#ffffff', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      OB.UI.footer(r, H - 12, [['confirm', 'Ready'], ['nextTab', 'More time']]);
    });
  },
};
OB.scenes = OB.scenes || {};
OB.scenes.hubcard = hubcard;
})();
