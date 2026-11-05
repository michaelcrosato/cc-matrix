/* OutBloom — Time Trial (any stage or the Full Coast with forks open, traffic off by default, the clock counting up,
 * splits against your best, your best run as a ghost, medals from par) and Versus (two players on one screen, split:
 * a second pad's Start or 2 on the keyboard joins; each picks a car; a route; a lone player may set P2 to CPU). */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const game = OB.game, UI = OB.UI, C = UI.COL, SC = OB.SCENES, P = () => OB.Profile.data;
const go = (s, d) => game.go(s, d, { fade: 'wipe', seconds: .3 });
/* par times (s) for each stage, from the reference bot on Normal with the Orchidea (tests can rewrite them) */
OB.PAR = { S1: 62, S2: 60, S3: 64, S4: 64, S5: 60, S6: 62, S7: 63, S8: 62, S9: 61, S10: 66, S11: 59, S12: 60, S13: 63, S14: 60, S15: 66, full: 312 };
OB.MEDALS = [['bloom', .98], ['gold', 1.04], ['silver', 1.12], ['bronze', 1.25]];
OB.medalFor = (key, t) => { const par = OB.PAR[key] || 60; for (const [m, k] of OB.MEDALS) if (t <= par * k) return m; return 'none'; };
let tr = null, trScr = null;
const STAGE_IDS = Object.keys(OB.STAGES);
SC.trial = {
  res: [480, 270], expand: true,
  enter() { tr = tr || { sel: 0, traffic: false, t: 0 }; tr.t = 0; UI.screenName = 'trial'; UI.idleT = 0; if (OB.Audio) OB.Audio.music('menu');
    trScr = UI.screen({ name: 'trial', footer: [['nav', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']], back: () => go('menu', { focus: 3 }) }); },
  key() { return tr.sel < STAGE_IDS.length ? STAGE_IDS[tr.sel] : 'full'; },
  layout(W, H) {
    trScr.setItems([
      { id: 'stage', x: W / 2 - 170, y: 40, w: 340, h: 92, left: () => { tr.sel = (tr.sel + STAGE_IDS.length) % (STAGE_IDS.length + 1); }, right: () => { tr.sel = (tr.sel + 1) % (STAGE_IDS.length + 1); }, pick: () => this.next(), draw: (g, it, f) => this.card(g, it, f) },
      { id: 'traffic', x: W / 2 - 170, y: 140, w: 165, h: 26, left: () => { tr.traffic = !tr.traffic; }, right: () => { tr.traffic = !tr.traffic; }, pick: () => { tr.traffic = !tr.traffic; }, label: () => 'TRAFFIC: ' + (tr.traffic ? 'ON' : 'OFF'), scale: 1 },
      { id: 'go', x: W / 2 + 5, y: 140, w: 165, h: 26, label: 'CHOOSE CAR →', scale: 1, pick: () => this.next() }
    ], true);
  },
  card(g, it, f) {
    const key = this.key(), rec = P().records.stage[key], full = key === 'full', S = full ? null : OB.STAGES[key];
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a1a6a', '#7a2a7a'] : C.panel, border: f ? C.sun : C.border });
    px.rect(g, it.x + 8, it.y + 8, 120, 76, '#2a1450'); OB.Sky.draw(g, { x: it.x + 8, y: it.y + 8, w: 120, h: 76 }, it.y + 50, full ? 'title' : S.sky, tr.t * 20, tr.t, {}); px.rect(g, it.x + 8, it.y + 50, 120, 34, full ? '#3a3448' : (OB.KITS[S.kit].groundR.a));
    UI.text(g, full ? 'FULL COAST' : S.name.toUpperCase(), it.x + 138, it.y + 10, { scale: 2, color: f ? C.sun : C.ink });
    UI.text(g, full ? 'All five rows, forks open' : 'Row ' + S.row + ' - ' + OB.KITS[S.kit].name + ' - ' + OB.TOD[S.tod].label, it.x + 138, it.y + 30, { color: C.dim });
    if (!full) for (let k = 0; k < 5; k++) OB.Art.icon(g, k < S.diff ? 'flower' : 'flowerOff', it.x + 138 + k * 9, it.y + 42);
    UI.text(g, 'PAR ' + OB.HUD.fmtT(OB.PAR[key]), it.x + 138, it.y + 56, {});
    UI.text(g, rec ? 'BEST ' + OB.HUD.fmtT(rec.ms / 1000) + '  ' + OB.medalFor(key, rec.ms / 1000).toUpperCase() : 'NO RECORD YET', it.x + 138, it.y + 68, { color: rec ? C.sun : C.dim });
    UI.text(g, '← ' + (tr.sel + 1) + ' / ' + (STAGE_IDS.length + 1) + ' →', it.x + it.w - 8, it.y + it.h - 14, { align: 'right', color: C.dim });
  },
  next() { const key = this.key(); go('garage', { mode: 'trial', trialKey: key, traffic: tr.traffic, back: 'trial' }); },
  update(dt) { tr.t += dt; UI.tickIdle(dt); if (UI.idleT > 10 && OB.Attract) { OB.Attract.start('trial'); return; } this.layout(game.W, game.H); trScr.update(dt); UI.focusId = trScr.current && trScr.current.id; },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; this.layout(W, H); OB.menuBG(g, W, H, tr.t, 'riviera'); UI.text(g, 'TIME TRIAL', W / 2, 12, { align: 'center', scale: 2, color: '#fff4e0' });
    UI.text(g, 'Your best run races you as a ghost. Medals: Bronze, Silver, Gold, Bloom.', W / 2, 178, { align: 'center', color: C.dim }); trScr.draw(g); UI.footer(g, W, H, trScr.footer); }); }
};
OB.Trial = {
  configure(c) {
    const key = c.trialKey || 'S1', rec = P().records.stage[key];
    c.clockUp = true; c.traffic = !!c.traffic; c.noIntro = key !== 'S1' && key !== 'full';
    c.route = key === 'full' ? { pyramid: true } : { stages: [key], sprint: true };
    if (rec && rec.ghost) c.ghost = rec.ghost;
    if (rec && rec.splits) c.bestSplits = rec.splits;
    c.returnTo = 'trial'; return c;
  },
  after(R) {
    const key = R.cfg.trialKey || 'S1', p = R.players[0], out = { medal: null, record: false, split: '' };
    if (!p.finished) return out;
    const t = p.time, old = P().records.stage[key];
    out.medal = OB.medalFor(key, t);
    out.split = old ? (t < old.ms / 1000 ? '-' : '+') + Math.abs(t - old.ms / 1000).toFixed(2) + ' vs best' : 'first run';
    out.record = OB.Profile.trialRecord(key, Math.round(t * 1000), R.ghost, null, p.stageTimes);
    if (out.record) game.audio.sting(OB.JINGLES.record, { duck: .5 });
    P().records.medals[key] = out.medal; OB.Profile.save();
    return out;
  }
};
/* ---- Versus ---- */
let vs = null, vsScr = null;
const VROUTES = ['flower', 'cliff', 'full'];
SC.versus = {
  res: [480, 270], expand: true,
  enter(back) { vs = vs || { route: 0, cars: ['orchidea', 'primavera'], paints: [0, 1], cpu: false, t: 0 }; vs.t = 0; UI.screenName = 'versus'; UI.idleT = 0; if (OB.Audio) OB.Audio.music('menu');
    game.allowJoin({ max: 2, onJoin: () => { OB.sfx && OB.sfx('confirm'); vs.cpu = false; } });
    vsScr = UI.screen({ name: 'versus', footer: [['nav', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']], back: () => { game.allowJoin(false); for (const q of game.players.slice(1)) game.removePlayer(q); go('menu', { focus: 4 }); } }); },
  exit() { game.allowJoin(false); },
  p2() { return game.players[1] || null; },
  layout(W, H) {
    const cars = P().unlocked.cars, cyc = (i, d) => { const k = cars.indexOf(vs.cars[i]); vs.cars[i] = cars[(k + d + cars.length) % cars.length]; vs.paints[i] = 0; };
    vsScr.setItems([
      { id: 'car1', x: 20, y: 40, w: W / 2 - 30, h: 80, left: () => cyc(0, -1), right: () => cyc(0, 1), pick: () => { vs.paints[0] = (vs.paints[0] + 1) % 4; }, draw: (g, it, f) => this.carCard(g, it, f, 0) },
      { id: 'car2', x: W / 2 + 10, y: 40, w: W / 2 - 30, h: 80, left: () => cyc(1, -1), right: () => cyc(1, 1), pick: () => { if (!this.p2()) vs.cpu = !vs.cpu; else vs.paints[1] = (vs.paints[1] + 1) % 4; }, draw: (g, it, f) => this.carCard(g, it, f, 1) },
      { id: 'route', x: W / 2 - 150, y: 130, w: 300, h: 26, left: () => { vs.route = (vs.route + 2) % 3; }, right: () => { vs.route = (vs.route + 1) % 3; }, pick: () => { vs.route = (vs.route + 1) % 3; }, label: () => '← ' + OB.ROUTES[VROUTES[vs.route]].name.toUpperCase() + ' →', scale: 1 },
      { id: 'cpu', x: W / 2 - 150, y: 162, w: 145, h: 24, left: () => { vs.cpu = !vs.cpu; }, right: () => { vs.cpu = !vs.cpu; }, pick: () => { vs.cpu = !vs.cpu; }, label: () => 'P2: ' + (this.p2() ? 'PLAYER' : vs.cpu ? 'CPU' : 'WAITING'), scale: 1 },
      { id: 'go', x: W / 2 + 5, y: 162, w: 145, h: 24, label: 'RACE!', scale: 1, disabled: !this.p2() && !vs.cpu, pick: () => this.start(), onDenied: () => UI.toast('PLAYER 2', 'Join with Start on a second pad, or 2 on the keyboard. Or set P2 to CPU.') }
    ], true);
  },
  carCard(g, it, f, i) {
    const joined = i === 0 || this.p2() || vs.cpu, id = vs.cars[i], paint = OB.CARS[id].paints[vs.paints[i] % 4];
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a1a6a', '#7a2a7a'] : C.panel, border: f ? C.sun : i ? '#ff7a7a' : '#7ab0ff' });
    UI.text(g, i ? (this.p2() ? 'P2' : vs.cpu ? 'P2 CPU' : 'P2') : 'P1', it.x + 6, it.y + 4, { color: i ? '#ff7a7a' : '#7ab0ff', scale: 2 });
    if (!joined) { UI.text(g, 'PRESS START ON A PAD', it.x + it.w / 2, it.y + 34, { align: 'center' }); UI.text(g, 'OR 2 ON THE KEYBOARD', it.x + it.w / 2, it.y + 46, { align: 'center', color: C.dim }); return; }
    OB.Art.drawCar(g, OB.Art.car(id, paint), it.x + it.w / 2, it.y + it.h - 12, .4, { yaw: Math.sin(vs.t + i) * .4 });
    UI.text(g, OB.CARS[id].name, it.x + it.w / 2, it.y + it.h - 10, { align: 'center', color: f ? C.sun : C.ink });
  },
  start() {
    const R = OB.ROUTES[VROUTES[vs.route]], p2 = this.p2();
    const players = [{ car: vs.cars[0], paint: OB.CARS[vs.cars[0]].paints[vs.paints[0] % 4], name: 'P1', driver: 'leo', passenger: 'marisol', input: game.input },
      { car: vs.cars[1], paint: OB.CARS[vs.cars[1]].paints[vs.paints[1] % 4], name: p2 ? 'P2' : 'CPU', driver: 'lea', passenger: 'juni', input: p2 || null, bot: p2 ? null : { skill: 1, targets: false }, cpu: !p2 }];
    game.allowJoin(false);
    go('radio', { mode: 'versus', route: { stages: R.stages.slice(), sprint: !!R.sprint, goal: R.goal || null }, players, clockUp: false, startTime: 75 + (R.stages.length - 1) * 4, versusRoute: vs.route });
  },
  update(dt) { vs.t += dt; UI.tickIdle(dt); if (UI.idleT > 10 && OB.Attract && !this.p2()) { OB.Attract.start('versus'); return; } this.layout(game.W, game.H); vsScr.update(dt); const p2 = this.p2(); if (p2 && p2.pressed('confirm')) this.start(); UI.focusId = vsScr.current && vsScr.current.id; },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; this.layout(W, H); OB.menuBG(g, W, H, vs.t, 'canyon'); UI.text(g, 'VERSUS 2P', W / 2, 12, { align: 'center', scale: 2, color: '#fff4e0' });
    UI.text(g, 'First to the goal wins. If the sun sets, whoever is further along wins.', W / 2, 196, { align: 'center', color: C.dim }); vsScr.draw(g); UI.footer(g, W, H, vsScr.footer); UI.drawToasts(g, W); }); }
};
/* the Versus results: both players, the winner, rematch, change route, menu */
let vr = null, vrScr = null;
SC.versusResults = {
  enter(R) { vr = { R, t: 0 }; this.versus = true; UI.screenName = 'results'; game.audio.music(OB.THEMES.results, { fade: .8 });
    const ps = R.players, winner = ps.slice().sort((a, b) => (b.finished ? 1e6 - (b.time || 0) : b.progress) - (a.finished ? 1e6 - (a.time || 0) : a.progress))[0]; vr.winner = winner;
    vrScr = UI.screen({ name: 'versusResults', footer: [['confirm', 'Select'], ['cancel', 'Menu']], back: () => go('menu') });
    vrScr.setItems([{ id: 'rematch', x: 0, y: 0, w: 1, h: 1, label: 'REMATCH', scale: 1, pick: () => OB.startRace(Object.assign({}, R.cfg, { seed: (R.cfg.seed + 3) >>> 0 })) }, { id: 'route', x: 0, y: 0, w: 1, h: 1, label: 'CHANGE ROUTE', scale: 1, pick: () => go('versus') }, { id: 'menu', x: 0, y: 0, w: 1, h: 1, label: 'MENU', scale: 1, pick: () => go('menu') }]); },
  update(dt) { vr.t += dt; vrScr.update(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; OB.menuBG(g, W, H, vr.t, 'canyon');
    E.font.title(g, vr.winner.name + ' WINS!', Math.round(W / 2), 14, { align: 'center', scale: 4, colors: ['#ffffff', '#ffd23a', '#ff7a3a'], depth: 3 });
    vr.R.players.forEach((p, i) => { const x = 30 + i * (W / 2), w = W / 2 - 60; UI.panel(g, x, 60, w, 100, { alpha: .92, border: p === vr.winner ? C.sun : C.border }); UI.text(g, p.name, x + 8, 66, { scale: 2, color: i ? '#ff7a7a' : '#7ab0ff' });
      UI.text(g, p.finished ? 'TIME ' + OB.HUD.fmtT(p.time) : 'REACHED ' + OB.STAGES[p.stage].name, x + 8, 88, {}); UI.text(g, 'BEST DRIFT ' + p.stats.bestDrift, x + 8, 100, { color: C.dim }); UI.text(g, 'NEAR MISSES ' + p.stats.nearMisses, x + 8, 112, { color: C.dim }); UI.text(g, 'CRASHES ' + p.stats.crashes, x + 8, 124, { color: C.dim }); });
    vrScr.items.forEach((it, i) => { it.x = W / 2 - 165 + i * 112; it.y = 176; it.w = 104; it.h = 26; }); vrScr.draw(g); UI.footer(g, W, H, vrScr.footer); }); }
};
})();
