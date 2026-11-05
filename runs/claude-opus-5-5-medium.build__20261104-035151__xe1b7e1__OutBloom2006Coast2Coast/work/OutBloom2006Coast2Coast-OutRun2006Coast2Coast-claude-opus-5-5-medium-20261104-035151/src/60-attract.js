/* The attract mode (PLAN §7.22): 10 s without input on the title and menu screens starts a looping, bot-played demo
 * with every cheat on (no collisions, infinite time, perfect requests, auto drift). Each cycle shows the start line
 * and a perfect start, a fork and a checkpoint, a Love in Bloom request, a split-screen Versus or a drift duel, a goal
 * ending and the high-score table, rotating through all fifteen stages. Any input ends it at once and goes back to
 * the screen it came from; that input does nothing else. It never touches the save. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL, SEG = OB.SEG;
const S = OB.SCENES = OB.SCENES || {}, game = () => OB.game;
const CHEATS = { noCollide: true, infiniteTime: true, perfectRequests: true, autoDrift: true };
const IDS = Object.keys(OB.STAGES);
const ORDER = (() => { const r = OB.rand.stream('attract', 9), a = IDS.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
const SEGS = ['start', 'fork', 'love', 'duel', 'ending', 'table'];
const LEN = { start: 22, fork: 15, love: 20, duel: 18, ending: 11, table: 6 };

OB.Attract = {
  start(from) { if (OB.env.hub || (OB.Dev && OB.Dev.active)) return; game().go('attract', { from, focus: game().scene && game().scene.scr ? game().scene.scr.i : 0 }, { fade: 'dissolve' }); }
};
S.attract = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(d = {}) {
    this.from = d.from || 'title'; this.cycle = this.cycle || 0; this.seg = 0; this.t = 0; this.inner = null; this.idleIn = 0;
    OB.attractActive = true; OB.Profile.noSave(true); OB.bus.emit('attract:start', {});
    this.begin();
  },
  exit() { if (this.inner && this.inner.exit) this.inner.exit(); this.inner = null; OB.attractActive = false; OB.Profile.noSave(false); OB.bus.emit('attract:end', {}); OB.Sound.mutedFx = false; },
  stage(k) { return ORDER[(this.cycle * 3 + k) % ORDER.length]; },
  begin() {
    if (this.inner && this.inner.exit) this.inner.exit();
    this.t = 0; const name = SEGS[this.seg], st = this.stage(this.seg), base = { attract: true, noLeave: true, cheats: CHEATS, keepMusic: this.seg > 0, silent: false, seed: 11 + this.cycle, car: ['orchidea', 'gardenia', 'magnolia', 'girasole', 'primavera'][this.cycle % 5], passenger: OB.PASSENGERS[this.cycle % 3], driver: OB.DRIVERS[this.cycle % 2], station: this.cycle % 5, overlay: (g, W, H) => this.overlay(g, W, H) };
    OB.Sound.mutedFx = false;
    this.phase = name; (OB.__phases || (OB.__phases = new Set())).add(name);
    if (name === 'start') { this.inner = S.race; S.race.enter(Object.assign(base, { mode: 'arcade', startStage: 'S1', bot: { plan: ['L', 'R', 'L', 'R'] }, attractSound: true })); OB.race.p1.car.cheats = OB.race.cheats; }
    else if (name === 'fork') { const id = this.forkStage(); this.inner = S.race; S.race.enter(Object.assign(base, { mode: 'arcade', startStage: id, startline: false, bot: { plan: [this.cycle % 2 ? 'R' : 'L'] } })); const Sx = OB.World.get(id); OB.race.teleport(OB.race.p1, id, (Sx.juncStart - 110) * SEG, 250); }
    else if (name === 'love') { const id = this.loveStage(), sl = OB.STAGES[id].slots[this.cycle % OB.STAGES[id].slots.length]; this.inner = S.race; S.race.enter(Object.assign(base, { mode: 'love', startStage: id, startline: false, bot: { plan: ['L'] } })); const Sx = OB.World.get(id); OB.race.teleport(OB.race.p1, id, Math.max(30, sl.at * Sx.len - 20) * SEG, 220); }
    else if (name === 'duel') {
      if (this.cycle % 2 === 0) { this.inner = S.race; S.race.enter(Object.assign(base, { mode: 'versus', players: 2, route: { stages: OB.ROUTES.flower.stages, end: 'sprint' }, cars: [{ model: 'orchidea', passenger: 'marisol' }, { model: 'gardenia', paint: '#9ae84a', passenger: 'juni', driver: 'lea' }], bots: [{}, { skill: .97 }], startline: false })); OB.race.teleport(OB.race.p1, 'S2', 120 * SEG, 230, -.5); OB.race.players[1].car.stage = 'S2'; OB.race.players[1].car.z = 120 * SEG + 900; OB.race.players[1].car.v = 230; OB.race.players[1].car.x = .5; OB.race.players[1].stages = ['S2']; }
      else { this.inner = S.race; S.race.enter(Object.assign(base, { mode: 'mission', route: { stages: ['S2'], end: 'sprint' }, rules: OB.MISSION.B2, rivals: [OB.PERSONAS.kiki], bot: { plan: ['L'] }, clock: 'up', startline: false })); OB.race.teleport(OB.race.p1, 'S2', 140 * SEG, 240); }
    }
    else if (name === 'ending') { const goals = ['A', 'B', 'C', 'D', 'E'], goal = goals[this.cycle % 5], moods = ['bloom', 'bud', 'wilt']; this.inner = S.ending; S.ending.enter({ goal, mood: moods[this.cycle % 3], passenger: OB.PASSENGERS[this.cycle % 3], driver: 'leo', car: base.car, paint: null, outfit: 0, finished: true, mode: 'arcade', score: 0, stats: {} }); S.ending.t = 2.6; }
    else { this.inner = null; game().splitScreen(0); }
  },
  forkStage() { const rows = IDS.filter(id => OB.STAGES[id].row < 5); return rows[(this.cycle * 2 + 1) % rows.length]; },
  loveStage() { return ORDER[(this.cycle * 3 + 2) % ORDER.length]; },
  update(dt) {
    this.t += dt;
    // any input (a key, a pad, a mouse move or click) ends it; a tap on a touch-only screen doesn't
    const touchOnly = OB.Touch && OB.Touch.only();
    if (this.t > .25 && OB.UI.anyInput && !(touchOnly && game().input.lastDevice === 'touch')) { this.leave(); return; }
    if (touchOnly && game().input.clicked && game().input.clicked()) { const ck = game().input.clicked(); if (OB.Touch.settingsHit(ck)) { game().menu('settings'); return; } OB.Touch.flash = 1; }
    const name = SEGS[this.seg];
    if (this.inner) { this.inner.update(dt); if (name === 'ending') S.ending.t = Math.min(S.ending.t, 12.4); }
    if (name === 'start' && OB.race && OB.race.phase === 'countdown') { OB.race.p1.car.rpm = 6500; }
    if (this.t > LEN[name]) { this.seg++; if (this.seg >= SEGS.length) { this.seg = 0; this.cycle++; } this.begin(); }
  },
  leave() {
    OB.Sound.play('ok'); const from = this.from;
    for (const P of game().players) P.consumeAll(); game().input.consumeAll();
    game().go(from, from === 'menu' ? {} : from === 'garage' ? { mode: 'arcade', back: 'menu' } : {}, { fade: 0 });
  },
  draw(r) {
    if (this.inner) this.inner.draw(r); else this.table(r);
    if (!this.inner || this.phase === 'ending') r.overlay(g => this.overlay(g, r.W, r.H));
  },
  hud(r) { if (this.inner && this.inner.hud) this.inner.hud(r); },
  table(r) {
    r.sky(['#1a0a3a', '#5a2a6a', '#ff7a59']);
    r.overlay(g => { OB.drawLogo(g, r.W, 10, this.t, 3); });
    if (OB.arcade) OB.arcade.drawTable(r, 'arcade', 70, 'HIGH SCORES');
  },
  overlay(g, W, H) {
    px.blend(g, .65, 'normal', () => px.rect(g, 6, 6, 74, 15, '#140a28'));
    T(g, 'DEMO PLAY', 12, 10, C.pink);
    if (Math.floor(this.t * 2) % 2 === 0) { if (OB.Touch && OB.Touch.only()) T(g, 'Controller or keyboard required', W / 2, H - 22, '#ffffff', { align: 'center' }); else OB.UI.pressStart(g, W / 2, H - 26, { scale: 1 }); }
    if (OB.Touch && OB.Touch.only()) OB.Touch.drawNotice(g, W, H, this.t, true);
  }
};
})();
