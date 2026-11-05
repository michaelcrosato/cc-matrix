// CRACKMANIA attract mode (PLAN §5.11): ten seconds without input on the title or a menu page starts a looping demo of
// the whole game (the bots cheat freely); any input returns to the title. Segments, each with its caption: RACE (D5,
// TV cuts), BUILD (R1 built block by block, then driven), PUZZLE (Icy Connect solved), SURVIVAL (R2 against the Ghost
// Guild, the standings), SPLIT SCREEN (two bots on S2), GARAGE (the three cars through paint jobs, the medal case)
import { ctx, E, U } from '../ctx.js';
import { MENU_INPUT } from '../input.js';
import { showcase, stepShowcase, drawShowcase } from '../scenes/showcase.js';
import { startRace, update as raceUpdate, draw as raceDraw, rememberSteps } from '../scenes/race.js';
import { Track } from '../track/track.js';
import { TYPES, GX, GY, CELL } from '../track/blocks.js';
import { puzzleDef, puzzleTrack } from '../modes/puzzle.js';
import { rivalRuns, RIVALS } from '../modes/survival.js';
import { Ghost } from '../race/ghost.js';
import { startSplit } from '../modes/split.js';
import { garageScene, garageState, makeGarage } from '../scenes/garage.js';
import { poseOf } from '../car/camera.js';
import { T1, T2, title, panel, UI } from '../ui/kit.js';
import { medal, coin } from '../ui/icons.js';
import { logo } from '../scenes/title.js';
import { portrait } from '../story/story.js';
import { ENVS } from '../env/envs.js';
import { add } from '../lib/v3.js';
const SEG = [
  { id: 'race', time: 25, caption: 'RACE', sub: '15 TRACKS · LOOPS · THE BIG CRACK' },
  { id: 'build', time: 15, caption: 'BUILD', sub: 'EVERY TRACK IS BLOCKS ON A GRID' },
  { id: 'puzzle', time: 15, caption: 'PUZZLE', sub: 'FIND THE MISSING ROAD' },
  { id: 'survival', time: 20, caption: 'SURVIVAL', sub: 'THREE GHOSTS. ONE ROAD.' },
  { id: 'split', time: 15, caption: 'SPLIT SCREEN', sub: 'UP TO FOUR AT ONCE' },
  { id: 'garage', time: 10, caption: 'GARAGE', sub: 'PAINT YOUR CAR' }
];
const st = { i: 0, t: 0, idle: 0, seg: null, drops: [], build: null };
export class Attract {
  constructor(game) { this.game = game; this.idleT = 0; this._pp = null; this._pa = null; }
  get running() { return this.game.sceneName === 'attract'; }
  poke() { this.idleT = 0; }
  /** call each step on an idle-able screen: true when it just started the attract mode */
  idle(dt, where) {
    if (this.disabled) return false;
    const I = this.game.input, p = I.mouse ? [I.mouse.cx, I.mouse.cy] : null, moved = p && this._pp && (p[0] !== this._pp[0] || p[1] !== this._pp[1]); this._pp = p;
    const stick = I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > 0, aim = !!I.padAim;
    if (I.anyPressed() || moved || stick || aim || (I.clicked && I.clicked()) || I.held.size || (ctx.talk && ctx.talk.open)) { this.idleT = 0; return false; }
    this.idleT += dt;
    if (this.idleT >= 10) { this.idleT = 0; this.game.go('attract', { from: where }); return true; }
    return false;
  }
}
function segEnter(i) {
  const S = SEG[i], g = ctx.game; st.i = i; st.t = 0; st.seg = S; st.drops = []; st.build = null; g.splitScreen(0);
  if (S.id === 'race') showcase('D5', { music: false });
  else if (S.id === 'build') buildStart(ctx.tracks.R1, null);
  else if (S.id === 'puzzle') { const p = puzzleDef('PS1'), full = puzzleTrack(p, true), base = puzzleTrack(p, false); buildStart(full, base, p); }
  else if (S.id === 'survival') {
    const rivals = rivalRuns('hedgerow', 1, 2), track = ctx.tracks.R2;
    startRace({ kind: 'demo', stay: true, track, intro: false, countdown: 0, noHud: false, noTimer: false, orbit: false, noSlowmo: true, players: [{ bot: { skill: 1, cheat: true, seed: 5 }, name: 'YOU', model: 'pebble', paint: ctx.profile.paint('pebble') }],
      ghosts: rivals.filter(v => v.ghost).map(v => ({ ghost: Ghost.decode(v.ghost), model: v.model, paint: v.R.paint, name: v.R.name, color: v.R.color, always: true })) });
    st.rivals = rivals;
  }
  else if (S.id === 'split') { startSplit({ inputs: [], bots: 2, track: ctx.tracks.S2, bestOf: 1, stay: true }); const w = ctx.worlds.world; if (w.cameras.length < 2) w.addCamera({ mode: 'fixed', far: 46000, near: 2 }); g.splitScreen(2, { layout: 'rows' }); }
  else if (S.id === 'garage') { if (!garageState.world) makeGarage(g); garageState.demo = true; garageState.t = 0; }
}
/** BUILD and PUZZLE: blocks drop in one by one (a bounce), coppers tick down, then a short drive by the bot */
function buildStart(full, base, puzzle) {
  const t = base ? base : new Track({ id: full.id + '-b', name: full.name, env: full.env, nobuild: full.puzzle ? full.puzzle.nobuild : undefined });
  if (base) for (const [k, v] of full.chasms) t.chasms.set(k, v);
  const course = ctx.worlds.load(t, { sparse: true }); ctx.session = null;
  const order = full.blocks.filter(b => !(base && base.blocks.some(q => q.type === b.type && q.cx === b.cx && q.cy === b.cy && q.L === b.L)));
  let cop = 2400; const xs = full.blocks.map(b => b.cx), ys = full.blocks.map(b => b.cy);
  st.build = { t, course, order, i: 0, next: .3, cop, puzzle, done: false, centre: [GX + (Math.min(...xs) + Math.max(...xs) + 1) / 2 * CELL, GY + (Math.min(...ys) + Math.max(...ys) + 1) / 2 * CELL], size: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * CELL };
}
function buildStep(dt) {
  const B = st.build; if (!B) return;
  if (B.drive) { rememberSteps(); raceUpdate(dt); return; }
  B.next -= dt;
  if (B.i < B.order.length && B.next <= 0) {
    const o = B.order[B.i++], b = B.t.place({ type: o.type, cx: o.cx, cy: o.cy, L: o.L, rot: o.rot }, { force: true }), g = B.course.addBlock(b);
    ctx.worlds.cur.view.addBlock(b, g); const grp = ctx.worlds.cur.view.groups.get(b.id); if (grp) { grp.position.y = 14; st.drops.push({ grp, t: 0 }); }
    B.cop -= TYPES[b.type].cost; ctx.sound.sfx('place', { vol: .5 }); B.next = (st.seg.time - 5) / Math.max(1, B.order.length) * .8;
  }
  for (const d of st.drops) { d.t += dt; const k = Math.min(1, d.t / .45), e = 1 - Math.pow(1 - k, 3) * Math.cos(k * 9) * (1 - k); d.grp.position.y = 14 * (1 - e) * (1 - k) + (k < 1 ? Math.abs(Math.sin(k * 7)) * (1 - k) * 2 : 0); if (k >= 1) d.grp.position.y = 0; }
  if (B.i >= B.order.length && !B.done && st.t > st.seg.time - 4.5) {
    B.done = true; B.course.refresh();
    if (B.puzzle) B.validated = st.t;
    const model = ENVS[B.t.env].car;
    startRace({ kind: 'demo', stay: true, track: B.t, course: B.course, intro: false, countdown: 0, noHud: true, orbit: false, noSlowmo: true, players: [{ bot: { skill: 1, cheat: true }, name: 'COCO', model, paint: ctx.profile.paint(model) }], ghosts: [] });
    B.drive = true;
  }
}
export const attractScene = {
  input: MENU_INPUT, touch: [], camera: { zoom: false },
  enter(d = {}) { st.from = d.from || 'title'; ctx.music.play('title'); segEnter(0); ctx.game.input.consumeAll(); st.armed = .4; },
  exit() { ctx.game.splitScreen(0); garageState.demo = false; for (const d of st.drops) d.grp.position.y = 0; st.drops = []; ctx.session = null; },
  update(dt) {
    const I = ctx.game.input; st.t += dt; st.armed -= dt;
    const any = I.anyPressed() || (I.clicked && I.clicked()) || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3);
    if (st.armed <= 0 && any) { I.consumeAll(); ctx.game.go('title'); return; }
    const S = st.seg;
    if (S.id === 'race' || S.id === 'survival' || S.id === 'split') { rememberSteps(); raceUpdate(dt); }
    else if (S.id === 'build' || S.id === 'puzzle') buildStep(dt);
    else if (S.id === 'garage') garageScene.update(dt);
    if (st.t > S.time) segEnter((st.i + 1) % SEG.length);
  },
  draw(r) {
    const S = st.seg;
    if (S.id === 'garage') garageScene.draw(r);
    else if (S.id === 'build' || S.id === 'puzzle') { if (st.build && st.build.drive) raceDraw(r); else { ctx.worlds.draw3d = w => orbitCam(w); ctx.worlds.draw(r); } }
    else raceDraw(r);
    if (!r.viewport) attractScene.hud(r);
  },
  hud(r) {
    const S = st.seg, t = st.t;
    r.overlay(g => {
      logo(g, r.W - 90, 6, 2, 9);
      if (t < 2.4) { const k = Math.min(1, t * 3, (2.4 - t) * 3); E.px.blend(g, .7 * k, 'normal', () => E.px.rect(g, 0, r.H * .35, r.W, 56, '#05040a')); title(g, S.caption, r.W / 2, r.H * .35 + 6, 3); T1(g, S.sub, r.W / 2, r.H * .35 + 38, '#ffd060', 'center'); }
      const B = st.build;
      if (B && (S.id === 'build' || S.id === 'puzzle')) { if (S.id === 'build') { coin(g, 18, 20); T2(g, String(B.cop), 28, 14, '#ffb070'); } T1(g, B.i + ' / ' + B.order.length + ' BLOCKS', 12, 36, '#ffffff'); if (B.validated && t - B.validated > 1.2) { const k = Math.min(1, (t - B.validated - 1.2) * 2); medal(g, r.W / 2, 60 + k * 40, 3, 16, Math.sin(t * 4)); T2(g, 'VALIDATED · GOLD', r.W / 2, 128, '#ffd060', 'center'); } }
      if (S.id === 'survival' && t > S.time - 5) { panel(g, r.W / 2 - 150, r.H * .25, 300, 120, { border: '#ffd060' }); T2(g, 'ROUND 2 STANDINGS', r.W / 2, r.H * .25 + 6, '#ffd060', 'center'); const L = (st.rivals || []).slice().sort((a, b) => (a.steps || 1e9) - (b.steps || 1e9)); L.forEach((v, i) => { portrait(v.R.id).drawPortrait(g, r.W / 2 - 140, r.H * .25 + 24 + i * 26, 22, { bg: '#1a1630' }); T2(g, (i + 1) + '. ' + v.R.name, r.W / 2 - 112, r.H * .25 + 28 + i * 26, v.R.color); }); T1(g, 'TEX: "Go home, rookie. Take the scenic route."', r.W / 2, r.H * .25 + 106, '#ffffff', 'center'); }
      if (S.id === 'garage') { const y = r.H - 58; panel(g, r.W / 2 - 110, y, 220, 24, {}); for (let i = 0; i < 4; i++) medal(g, r.W / 2 - 75 + i * 50, y + 12, i + 1, 7, Math.sin(t * 3 + i)); }
      if (Math.floor(t * 1.5) % 2 === 0) { E.px.blend(g, .6, 'normal', () => E.px.rect(g, 0, r.H - 24, r.W, 24, '#05040a')); T2(g, 'DEMO — PRESS ANY BUTTON', r.W / 2, r.H - 19, '#ffffff', 'center'); }
    });
  }
};
function orbitCam(w) {
  const B = st.build, t = ctx.game.real || 0, a = t * .2, d = Math.max(140, B.size * .9), c = B.centre, pos = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, d * .7];
  const pose = poseOf(null, { pos, look: [c[0], c[1], 0], up: [0, 0, 1], fov: 55 }); w.camera.pose = pose; w.camera.fixed = pose; w.camera.target.x = c[0] * U; w.camera.target.y = c[1] * U; w.camera.target.z = 0;
  ctx.worlds.cur.view.draw(w.pen, { t, lights: 6, near: c }); ctx.worlds.drawScenery(w.pen, t, c);
}
export { SEG };
