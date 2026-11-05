/* OutBloom — the attract mode: after 10 s with no input on the title and menu screens, a looping AI-played demo in
 * five segments (about 95 s): the start line and the first bends; a fork, its signs and the checkpoint; a Love in Bloom
 * request rated Perfect; a Drift Duel against Kiki or a split-screen Versus of two bots (alternating); a goal ending,
 * then the score table under the logo. The bot cheats freely (no collisions, endless daylight, perfect requests, auto
 * drift). Any input ends it at once, back to the screen and focus it came from; that input does nothing else. It never
 * writes the profile, and never runs in an AI Hub session. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const game = OB.game, UI = OB.UI, C = UI.COL;
const SEGS = [{ kind: 'start', len: 25 }, { kind: 'fork', len: 15 }, { kind: 'love', len: 20 }, { kind: 'tour', len: 20 }, { kind: 'ending', len: 10 }, { kind: 'table', len: 5 }];
const FORK_STAGES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'], LOVE_STAGES = ['S1', 'S2', 'S5', 'S9', 'S11', 'S12', 'S13', 'S3', 'S6', 'S8', 'S14', 'S4', 'S7', 'S10', 'S15'];
const At = OB.Attract = { on: false, phase: null, seg: 0, t: 0, cycle: 0, from: null, data: null, saved: null };
const CHEATS = ['noCollide', 'infiniteTime', 'perfectRequests', 'autoDrift'];
At.start = (from, data) => {
  if (OB.env.hub || At.on) return;
  At.on = true; At.from = from; At.data = data; At.seg = 0; At.t = 0; At.saved = {}; for (const k of CHEATS) { At.saved[k] = OB.cheats[k]; OB.cheats[k] = true; }
  OB.bus.emit('attract:start', { from }); At.begin();
};
At.stop = () => {
  if (!At.on) return; At.on = false; for (const k of CHEATS) OB.cheats[k] = At.saved[k] || false; At.phase = null;
  const r = OB.Race.current; if (r && r.cfg.mode === 'attract' && r.phase !== 'done') { r.dispose(); r.phase = 'done'; }
  game.input.consumeAll(); for (const q of game.players) q.consumeAll(); UI.idleT = 0;
  game.splitScreen(0); OB.bus.emit('attract:end', {});
  game.go(At.from || 'title', At.data, { fade: 0 });
};
At.begin = () => {
  const s = SEGS[At.seg], c = At.cycle, rot = (a) => a[(c * 3 + At.seg) % a.length];
  At.phase = s.kind; At.t = 0;
  const base = { mode: 'attract', seed: 1000 + c * 17 + At.seg, passenger: OB.PASSENGERS[c % 3], car: OB.CAR_ORDER[c % 5], paint: OB.CARS[OB.CAR_ORDER[c % 5]].paints[0], station: c % 5 };
  if (s.kind === 'start') game.go('race', Object.assign(base, { players: [Object.assign({ bot: { targets: true, drift: true, driftAt: 3.4 }, passenger: base.passenger, car: base.car, paint: base.paint })], introTime: 3 }), { fade: 'wipe' });
  else if (s.kind === 'fork') { const st = rot(FORK_STAGES), road = OB.World.stage(st); game.go('race', Object.assign(base, { route: { pyramid: true }, players: [{ bot: { targets: true }, passenger: base.passenger, car: base.car, paint: base.paint }], noIntro: true, rolling: true }), { fade: 'wipe' }); At.warp = { stage: st, z: road.junctionAt - 110 * OB.SEG }; }
  else if (s.kind === 'love') { const st = rot(LOVE_STAGES), S = OB.STAGES[st], road = OB.World.stage(st), slot = S.requests[c % S.requests.length]; game.go('race', Object.assign(base, { route: { stages: [st], sprint: true }, noIntro: true, rolling: true, zStart: Math.max(6, Math.floor(slot.at * road.stageLen) - 22), rules: [OB.Requests.director({ passenger: base.passenger })], players: [{ bot: { targets: true }, passenger: base.passenger, car: base.car, paint: base.paint }] }), { fade: 'wipe' }); }
  else if (s.kind === 'tour') {
    if (c % 2 === 0) game.go('race', Object.assign(base, { route: { stages: ['S2'], sprint: true }, noIntro: true, rolling: true, zStart: 40, rivals: [{ persona: 'kiki' }], rules: [OB.Rules.driftduel(OB.MISSION.B2)], players: [{ bot: { targets: true, driftAt: 3 }, passenger: 'juni', car: 'orchidea', paint: '#e8463a' }] }), { fade: 'wipe' });
    else game.go('race', Object.assign(base, { route: { stages: ['S1', 'S3', 'S6'], sprint: true }, noIntro: true, rolling: true, zStart: 40, players: [{ bot: { skill: 1 }, car: 'orchidea', paint: '#e8463a', name: 'P1', driver: 'leo', passenger: 'marisol' }, { bot: { skill: 1 }, car: 'gardenia', paint: '#f4f2ee', name: 'P2', driver: 'lea', passenger: 'juni', cpu: true }] }), { fade: 'wipe' });
  }
  else if (s.kind === 'ending') { const goal = 'ABCDE'[c % 5], mood = ['bloom', 'bud', 'wilt'][c % 3]; game.go('ending', { attract: true, mood, clock: 20, cfg: { mode: 'attract', paint: OB.CARS.orchidea.paints[0] }, players: [{ goal, passenger: OB.PASSENGERS[c % 3], car: 'orchidea', score: 0, stats: {} }] }, { fade: 'white' }); }
  else if (s.kind === 'table') game.go('attractTable', {}, { fade: 'wipe' });
};
At.next = () => { At.seg++; if (At.seg >= SEGS.length) { At.seg = 0; At.cycle++; } At.begin(); };
/** each step of an attract scene: any input ends it; else the segment's clock */
At.tick = dt => {
  if (!At.on) return false;
  const tapOnly = OB.Touch && OB.Touch.blocked();
  if (UI.tickIdle(dt) && UI.idleT === 0 && !tapOnly) { At.stop(); return true; }
  if (tapOnly) { const c = game.input.clicked && game.input.clicked(); if (c && OB.Touch.settingsHit(c)) { game.menu('settings'); } }
  At.t += dt; if (At.t > SEGS[At.seg].len) { At.next(); return true; }
  return false;
};
At.update = (dt, race) => {
  if (At.tick(dt)) return true;
  if (At.warp && race.p1) { const w = At.warp; At.warp = null; race.place(race.p1, w.stage, w.z, .2); race.p1.routeIdx = OB.STAGES[w.stage].row - 1; race.p1.routeStr = 'LRLR'.slice(0, race.p1.routeIdx); race.p1.cpDone = true; race.p1.car.v = 240; race.traffic.ensure(w.stage, w.z + 46000); }
  return false;
};
/** the DEMO PLAY tag and the blinking PRESS prompt over every segment */
At.overlay = (g, race, vp) => {
  if (vp.i) return;
  const W = game.W, H = game.H;
  UI.panel(g, 8, H - 30, 82, 20, { alpha: .8, border: C.pink }); UI.text(g, 'DEMO PLAY', 49, H - 24, { align: 'center', color: C.pink });
  if (Math.floor(game.real * 2) % 2 === 0) { const pad = UI.device() === 'pad'; UI.prompt(g, W / 2, H - 26, pad ? 'confirm' : 'start', pad ? 'PRESS' : 'PRESS ENTER', { align: 'center' }); }
  if (OB.Touch && OB.Touch.blocked()) OB.Touch.drawNotice(g, W, H, game.real, true);
};
/* the score table under the logo */
OB.SCENES.attractTable = {
  res: [480, 270], expand: true,
  enter() { this.t = 0; },
  update(dt) { this.t += dt; At.tick(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; OB.menuBG(g, W, H, this.t); OB.drawLogo(g, W / 2, 16, this.t, 4);
    const tb = OB.table('arcade'); UI.panel(g, W / 2 - 120, 96, 240, 130, { alpha: .88 }); UI.text(g, 'BEST DAYS ON BELLAFIORE', W / 2, 102, { align: 'center', color: C.sun });
    const rows = tb.length ? tb : [{ name: 'BRU', score: 900000, goal: 'E' }, { name: 'MAR', score: 650000, goal: 'A' }, { name: 'VIV', score: 500000, goal: 'C' }, { name: 'JUN', score: 420000, goal: 'D' }, { name: 'KIK', score: 300000, goal: 'B' }];
    rows.slice(0, 8).forEach((e, i) => { UI.text(g, (i + 1) + '.', W / 2 - 100, 118 + i * 12, { color: C.dim }); UI.text(g, e.name, W / 2 - 80, 118 + i * 12, {}); UI.text(g, String(e.score), W / 2 + 60, 118 + i * 12, { align: 'right', color: C.sun }); UI.text(g, 'GOAL ' + e.goal, W / 2 + 100, 118 + i * 12, { align: 'right', color: C.dim }); });
    At.overlay(g, null, { i: 0 }); }); }
};
})();
