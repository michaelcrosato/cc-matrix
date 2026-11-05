/* AI Hub sessions (PLAN §7.12; Session Protocol v1, client 1.4.0): mode ghost. Each copy runs its own Flower Sprint
 * (Sunrise Strand > Lavender Ridge > Lake Serenata) with the same traffic (AIHub.rng), sends only its own car ten
 * times a second, reports progress once a second and a time at the finish (a score on time-up). Others show as
 * translucent cars in their seat colours. Our own card: the logo over the start line, the players on the grid, how
 * to win, this player's controls, the countdown; Enter / ✕ is Ready, △ / T is More time. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL;
const S = OB.SCENES = OB.SCENES || {}, game = () => OB.game, H_ = () => window.AIHub;
const clean = s => String(s || '').replace(/[^\x20-\x7e]/g, '?').slice(0, 14);
const HUB = OB.Hub = {
  info: null, card: null, ghostMap: {}, ended: false, started: false, resulted: false, sendT: 0, progT: 0, unsub: [],
  async connect() {
    const A = H_(); if (!A || !A.active) return null;
    let info = null; try { info = await A.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) return null;
    HUB.info = info;
    const on = (n, fn) => HUB.unsub.push(A.on(n, fn));
    on('card', c => { HUB.card = c; });
    on('start', d => { HUB.started = true; HUB.startIn = d && d.in; if (game().sceneName !== 'race') game().go('race', HUB.raceCfg(), { fade: 0 }); });
    on('message', (data, from) => { if (!data || typeof from !== 'number' || from === info.me) return; if (data.t === 'g') { const gh = HUB.ghostMap[from] || (HUB.ghostMap[from] = { id: from, x: data.x, z: data.z }); Object.assign(gh, { area: data.area, tz: data.z, tx: data.x, yaw: data.yaw, v: data.v, drift: data.drift, seen: Date.now() }); if (gh.z === undefined || gh.area !== gh.lastArea) { gh.z = data.z; gh.x = data.x; } gh.lastArea = data.area; gh.prog = data.p; } if (data.t === 'done') { const gh = HUB.ghostMap[from] || (HUB.ghostMap[from] = { id: from }); gh.done = data.time; } });
    on('leave', d => { if (d) delete HUB.ghostMap[d.id]; });
    on('time-up', () => { HUB.timeUp(); });
    on('end', () => { HUB.end(); });
    return info;
  },
  ready() { const A = H_(); if (A && !HUB.readied) { HUB.readied = true; try { A.ready(); } catch (e) { /* the hub will say */ } } },
  me() { const i = HUB.info; return i && i.players.find(p => p.id === i.me) || { id: 0, name: 'You', color: '#e8443a' }; },
  raceCfg() {
    const me = HUB.me();
    return { mode: 'hub', route: { stages: OB.ROUTES.flower.stages, end: 'sprint' }, clock: 'up', car: 'orchidea', paint: me.color, driver: 'leo', passenger: 'marisol', transmission: 'auto', station: 0, seed: (HUB.info && HUB.info.seed) || 1, cruise: true, countdown: 999, hub: true, requestTypes: [] };
  },
  /** each race step in a session: the start sync, the sends, the progress, the finish */
  step(dt, race) {
    const A = H_(); if (!A || HUB.ended) return;
    const t = A.time();
    if (race.phase === 'countdown') race.cd = t === -Infinity ? 999 : Math.max(0, -t / 1000);
    for (const id in HUB.ghostMap) { const gh = HUB.ghostMap[id]; if (gh.tz !== undefined) { gh.z += (gh.tz - gh.z) * Math.min(1, dt * 8); gh.x += (gh.tx - gh.x) * Math.min(1, dt * 8); } }
    if (!HUB.started) return;
    const P = race.p1, c = P.car;
    HUB.sendT += dt; HUB.progT += dt;
    if (HUB.sendT >= .1) { HUB.sendT = 0; try { A.send({ t: 'g', area: c.stage, z: Math.round(c.z), x: +c.x.toFixed(3), v: Math.round(c.v), yaw: +c.yaw.toFixed(2), drift: c.drift.on ? 1 : 0, p: Math.round(HUB.metres(race)) }, { reliable: false }); } catch (e) { /* dropped */ } }
    if (HUB.progT >= 1) { HUB.progT = 0; try { A.progress({ score: Math.round(HUB.metres(race)), label: HUB.label(race) }); } catch (e) { /* the hub keeps the last */ } }
    if (P.finished && !HUB.resulted) {
      HUB.resulted = true; const time = Math.max(0, Math.round(t));
      try { A.result({ time, stats: { 'Best drift': P.stats.bestDrift, 'Near misses': P.stats.nearmiss, 'Overtakes': P.stats.overtakes } }); A.send({ t: 'done', time }); } catch (e) { /* once only */ }
      OB.HUD.banner(P, 'WAITING FOR THE OTHERS...', C.ink, 9999);
    }
  },
  metres(race) { const P = race.p1, route = race.route.stages; let d = 0; for (const id of route) { if (id === P.car.stage) return d + P.car.z / 10; if (P.stages.includes(id)) d += OB.World.get(id).segs.length * OB.SEG / 10; } return d; },
  label(race) { const P = race.p1, route = race.route.stages, i = route.indexOf(P.car.stage), Sx = OB.World.get(P.car.stage); if (P.finished) return 'Finished ' + OB.fmtTime(P.finishT); if (i < 0) return 'Cruising'; return 'Stage ' + (i + 1) + '/' + route.length + ' • ' + Math.min(99, Math.round(P.car.z / (Sx.len * OB.SEG) * 100)) + '%'; },
  timeUp() { const A = H_(); if (!A || HUB.resulted || !OB.race) return; HUB.resulted = true; try { A.result({ score: Math.round(HUB.metres(OB.race)) }); } catch (e) { /* once */ } },
  end() {
    HUB.ended = true; const g = game();
    try { g.audio.stopMusic(); } catch (e) { /* no sound */ }
    OB.Ambience.stop(); if (S.race && S.race.stopSounds) S.race.stopSounds(); g.audio.mute(true);
    g.input.clear(); OB.Hub.roundOver = true;
  },
  ghosts() { const me = HUB.info && HUB.info.me, out = []; for (const id in HUB.ghostMap) { const gh = HUB.ghostMap[id], p = HUB.info && HUB.info.players.find(q => q.id === +id); if (+id === me || gh.area === undefined) continue; out.push({ area: gh.area, z: gh.z, x: gh.x, yaw: gh.yaw || 0, color: p ? p.color : '#ffffff', name: clean(p ? p.name : 'P' + id) }); } return out; },
  standings() { if (!HUB.info) return null; const race = OB.race; return HUB.info.players.map(p => { const gh = HUB.ghostMap[p.id], mine = p.id === HUB.info.me; const prog = mine ? (race ? HUB.metres(race) : 0) : gh ? gh.prog || 0 : 0; return { name: clean(p.name), color: p.color, label: (mine && race && race.p1.finished) || (gh && gh.done) ? 'FIN' : Math.round(prog / 100) / 10 + 'k' }; }); }
};

/* ---- our card ---- */
S.hubcard = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter() { this.t = 0; this.rnd = H_() && H_().rng ? H_().rng('card') : () => .5; this.sparks = Array.from({ length: 30 }, () => [this.rnd(), this.rnd(), this.rnd()]); game().audio.music(OB.SONGS.title, { fade: .5 }); HUB.ready(); },
  update(dt) {
    this.t += dt; const I = game().input, A = H_(); if (!A || HUB.ended) return;
    const ck = I.clicked && I.clicked(), W = game().W, Hh = game().H, inR = (r, p) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
    this.btnReady = [W / 2 - 130, Hh - 62, 120, 30]; this.btnMore = [W / 2 + 10, Hh - 62, 120, 30];
    if (I.pressed('confirm') || I.pressed('start') || inR(this.btnReady, ck)) { try { A.answer('ready'); } catch (e) { /* not on the card */ } OB.Sound.play('ok'); }
    if (I.pressed('more') || inR(this.btnMore, ck)) { try { A.answer('more'); } catch (e) { /* not on the card */ } OB.Sound.play('toggle'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, Hh = r.H, info = HUB.info || { players: [] }, card = HUB.card || {}, ready = card.ready || [];
      OB.drawBackdropRoad(g, W, Hh, this.t * .3, { r, car: false, speed: 0 });
      px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, Hh, '#5a3a8a'));
      OB.drawLogo(g, W, 8, this.t, 3);
      T(g, 'Fastest to the Flower Sprint goal wins', W / 2, 72, '#ffffff', { align: 'center', scale: 1 });
      // the players lined up on the grid, in their seat colours, with a tick once ready
      const n = Math.max(1, info.players.length);
      info.players.forEach((p, i) => { const x = W / 2 + (i - (n - 1) / 2) * 96, y = 150; OB.drawCar(g, x, y, .09, { model: 'orchidea', paint: p.color, yaw: Math.sin(this.t + i) * .15, t: this.t }); T(g, clean(p.name) + (p.id === info.me ? ' (YOU)' : ''), x, y + 6, p.color, { align: 'center' }); if (ready.includes(p.id)) T(g, 'READY!', x, y + 16, C.good, { align: 'center' }); });
      // the controls for the device used last
      OB.UI.prompts(g, [['left', 'Steer'], ['gas', 'Gas'], ['brake', 'Brake'], ['drift', 'Drift']], W / 2, 186, { align: 'center' });
      const left = card.left === null || card.left === undefined ? null : Math.ceil(card.left / 1000);
      T(g, card.starting ? 'STARTING...' : card.paused ? 'PAUSED: MORE TIME' : left !== null ? 'STARTS IN ' + left : 'GET READY', W / 2, 88, C.sun, { align: 'center', scale: 2 });
      const asked = card.asked;
      for (const [b, lab, act] of [[this.btnReady, 'READY', 'confirm'], [this.btnMore, asked ? 'MORE TIME (ASKED)' : 'MORE TIME', 'more']]) { if (!b) continue; E.ui.box(g, b[0], b[1], b[2], b[3], { bg: act === 'confirm' ? ['#5ae08a', '#2a8a4a'] : ['#3a2470', '#2a1450'], border: '#fff4c0' }); OB.UI.glyph(g, b[0] + 8, b[1] + 9, act); T(g, lab, b[0] + b[2] / 2 + 8, b[1] + 11, '#ffffff', { align: 'center' }); }
    });
  }
};
})();
