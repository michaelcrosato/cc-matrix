// CRACKMANIA replays (PLAN §5.8): a run's ghost as a normal car in its paint, the timer and splits replayed, cameras
// CHASE / TV / ORBIT (R1 or C), play and pause, scrub (hold for 4x), speed 0.25x-4x, restart, the mouse orbits and
// a click on the timeline seeks. Custom tracks' replays carry the track
import { ctx, E, U } from '../ctx.js';
import { REPLAY_INPUT } from '../input.js';
import { Ghost } from '../race/ghost.js';
import { Track } from '../track/track.js';
import { ChaseCam, poseOf, tvSpots, tvPick } from '../car/camera.js';
import { drawCar } from '../car/draw.js';
import { fmt } from '../race/run.js';
import { panel, T1, T2, title, UI, toast, drawToasts, accent } from '../ui/kit.js';
import { promptBar } from '../ui/glyphs.js';
import { bigText } from '../ui/hud.js';
import { authorGhost } from '../race/medals.js';
import { ENVS } from '../env/envs.js';
import { add, sub, mul, len, norm, cross } from '../lib/v3.js';
const CAMS = ['CHASE', 'TV', 'ORBIT'];
export const replayInfo = () => ({ t: st.t, steps: st.g ? st.g.steps : 0, cam: st.cam, play: st.play });
const st = { rp: null, g: null, t: 0, play: true, speed: 1, cam: 0, chase: new ChaseCam(), yaw: 0, pitch: .4, dist: 12, tv: [], tvCur: null, tvT: 0, d: null, course: null, saved: false, bar: null };
export const replayScene = {
  input: REPLAY_INPUT, pausable: true, touch: [], camera: { zoom: false },
  enter(d = {}) {
    st.d = d; let rp = d.replay;
    if (!rp && d.demo) { const tr = ctx.tracks[d.demo], a = authorGhost(tr); rp = Object.assign({}, a.ghost, { track: tr.id, trackName: tr.name, env: tr.env, steps: a.steps, car: a.ghost.model, paint: ctx.profile.paint(a.ghost.model) }); }
    st.rp = rp; st.g = Ghost.decode(rp); st.t = 0; st.play = true; st.speed = 1; st.cam = 0; st.saved = !!d.saved;
    const track = rp.custom ? Track.fromJSON(rp.custom) : ctx.tracks[rp.track];
    st.course = ctx.worlds.load(track); st.tv = tvSpots(st.course.samples, st.course.ph); st.tvCur = null; st.chase.snap(); st.chase.mode = 'far';
    st.track = track; ctx.session = null; ctx.music.play('paint'); ctx.game.input.consumeAll();
  },
  pauseItems() { return [['Camera: ' + CAMS[st.cam], () => { st.cam = (st.cam + 1) % 3; }], ['Save replay', () => save()], ['Exit replay', () => exit()]]; },
  quitTo() { exit(); },
  update(dt) {
    const I = ctx.game.input, G = st.g, end = G.steps;
    if (ctx.dev.open && ctx.dev.update(dt)) return;
    if (I.pressed('cancel')) { exit(); return; }
    if (I.pressed('play')) st.play = !st.play;
    if (I.pressed('camera')) { st.cam = (st.cam + 1) % 3; st.chase.snap(); ctx.sound.sfx('move'); }
    if (I.pressed('restart')) { st.t = 0; st.chase.snap(); }
    if (I.pressed('slower')) st.speed = Math.max(.25, st.speed / 2); if (I.pressed('faster')) st.speed = Math.min(4, st.speed * 2);
    if (I.pressed('save')) save();
    const scrub = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0) + (I.padMove ? (Math.abs(I.padMove[0]) > .3 ? Math.sign(I.padMove[0]) : 0) : 0);
    if (scrub) { const hold = I._pt && I._pt.right !== undefined ? 0 : 0; st.scrubT = (st.scrubT || 0) + dt; st.t = Math.max(0, Math.min(end, st.t + scrub * 120 * dt * (st.scrubT > .8 ? 4 : 1.5))); st.chase.snap(); } else st.scrubT = 0;
    if (st.play && !scrub) st.t = Math.min(end, st.t + 120 * dt * st.speed);
    // the mouse: drag orbits, the wheel zooms, a click on the bar seeks
    const pan = I.pan && I.pan(); if (pan) { st.cam = 2; st.yaw += pan[0] * .01; st.pitch = Math.max(.05, Math.min(1.3, st.pitch + pan[1] * .01)); }
    const z = I.zoom && I.zoom(); if (z && z !== 1) st.dist = Math.max(4, Math.min(40, st.dist / z));
    const ck = I.clicked && I.clicked(), B = st.bar; if (ck && B && ck[0] >= B.x && ck[0] <= B.x + B.w && ck[1] >= B.y - 6 && ck[1] <= B.y + B.h + 6) { st.t = (ck[0] - B.x) / B.w * end; st.chase.snap(); }
    if (I.padAim) { st.cam = 2; st.yaw += I.padAim[0] * 2 * dt; st.pitch = Math.max(.05, Math.min(1.3, st.pitch - I.padAim[1] * 1.5 * dt)); }
    // the camera follows a car made from the ghost
    const a = G.at(st.t), b = G.at(Math.max(0, st.t - 4)), v = mul(sub(a.p, b.p), 30);
    st.fake = { p: a.p, f: a.f, r: a.r, u: a.u, v, grounded: a.grounded, flop: 0, boostT: a.boost ? 1 : 0, kmh: a.kmh };
    st.chase.update(st.fake, dt, st.course.ph, { reduce: ctx.game.reduceMotion });
    ctx.worlds.step(dt);
  },
  draw(r) {
    ctx.worlds.draw3d = (w, rr) => draw3d(w);
    ctx.worlds.draw(r);
    const G = st.g, end = G.steps, cps = G.of('cp');
    r.overlay(g => {
      const passed = cps.filter(s => s <= st.t), fin = G.finishSteps;
      bigText(g, fmt(fin !== null && st.t >= fin ? fin : Math.floor(st.t)), r.W / 2, 8, 3);
      if (passed.length) { const last = passed[passed.length - 1]; if (st.t - last < 240) T2(g, 'CP ' + passed.length + '  ' + fmt(last), r.W / 2, 36, '#c8ffd0', 'center'); }
      T2(g, 'REPLAY · ' + (st.rp.trackName || '').toUpperCase(), 10, 8, '#ffffff'); T1(g, CAMS[st.cam] + ' CAMERA · ' + st.speed + 'x' + (st.play ? '' : ' · PAUSED'), 10, 26, UI.dim);
      // the timeline
      const bx = 20, bw = r.W - 40, by = r.H - 44; st.bar = { x: bx, y: by, w: bw, h: 6 };
      E.px.rect(g, bx, by, bw, 6, '#2a2840'); E.px.rect(g, bx, by, Math.round(bw * st.t / end), 6, accent());
      for (const s of cps) E.px.rect(g, bx + Math.round(bw * s / end) - 1, by - 3, 2, 12, '#5ab4ff');
      for (const s of G.of('respawn')) E.px.rect(g, bx + Math.round(bw * s / end) - 1, by - 3, 2, 12, '#ffd060');
      promptBar(g, r, [['play', st.play ? 'PAUSE' : 'PLAY'], ['left', 'SCRUB'], ['camera', 'CAMERA'], ['faster', 'SPEED'], ['restart', 'RESTART'], !st.saved && ['save', 'SAVE'], ['cancel', 'EXIT']].filter(Boolean));
      drawToasts(g, r, 1 / 60);
    });
    ctx.dev.draw(r);
  }
};
function draw3d(w) {
  const G = st.g, a = G.at(st.t), t = ctx.game.real || 0, pen = w.pen;
  let pose;
  if (st.cam === 0) pose = st.chase.pose(1);
  else if (st.cam === 1) {
    st.tvT -= 1 / 60; if (!st.tvCur || st.tvT <= 0 || len(sub(st.tvCur.p, a.p)) > 120) { const nx = tvPick(st.tv, st.fake || { p: a.p }, st.course.ph, st.tvCur); if (nx) { st.tvCur = nx; st.tvT = 2.5; } }
    if (st.tvCur) { const d = len(sub(st.tvCur.p, a.p)); pose = poseOf(null, { pos: st.tvCur.p, look: add(a.p, [0, 0, .8]), up: [0, 0, 1], fov: Math.max(18, Math.min(60, 2 * Math.atan(9 / Math.max(1, d)) * 180 / Math.PI)) }); } else pose = st.chase.pose(1);
  } else { const cp = Math.cos(st.pitch), pos = add(a.p, [Math.cos(st.yaw) * cp * st.dist, Math.sin(st.yaw) * cp * st.dist, Math.sin(st.pitch) * st.dist + 1]); pose = poseOf(null, { pos, look: add(a.p, [0, 0, .7]), up: [0, 0, 1], fov: 60 }); }
  if (pose) { w.camera.pose = pose; w.camera.fixed = pose; }
  w.camera.target.x = a.p[0] * U; w.camera.target.y = a.p[1] * U; w.camera.target.z = a.p[2] * U;
  ctx.worlds.cur.view.draw(pen, { t, lights: 6, near: [a.p[0], a.p[1]] }); ctx.worlds.drawScenery(pen, t, [a.p[0], a.p[1]]);
  drawCar(pen, st.rp.model || st.rp.car || ENVS[st.track.env].car, { p: a.p, f: a.f, r: a.r, u: a.u, steer: 0, spin: st.t * .2, brake: a.brake, boost: a.boost, lights: ENVS[st.track.env].lights, t }, st.rp.paint);
  pen.at();
}
function save() { if (st.saved) return; ctx.profile.addReplay(st.rp); st.saved = true; toast('REPLAY SAVED'); }
function exit() { const d = st.d; ctx.sound.sfx('back'); if (d && d.back === 'results' && d.backData) { ctx.game.go('results', d.backData); } else ctx.game.go('menu', { page: 'replays' }); }
