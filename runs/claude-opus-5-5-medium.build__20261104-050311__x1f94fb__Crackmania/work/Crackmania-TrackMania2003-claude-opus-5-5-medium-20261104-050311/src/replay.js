// The replay viewer: a saved run drawn as a real car in its paint, the clock and splits replayed; Chase / TV / Orbit
// cameras, play and pause, scrub, speed 0.25x-4x, a timeline the mouse seeks on.
import { Ghost } from './ghost.js';
import { ChaseCam, tvSpots, tv, orbit } from './cam.js';
import { drawCar } from './view.js';
import { fmt } from './run.js';
import { U, len } from './v3.js';
import { text, big, promptBar, panel, COL, tw } from './ui.js';
import { fromShareCode } from './track.js';

const E = globalThis.My3D2dge, px = E.px;
export const REPLAY_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12', 'PadAxisUp'], down: ['KeyS', 'ArrowDown', 'Pad13', 'PadAxisDown'], left: ['KeyA', 'ArrowLeft', 'Pad14', 'PadAxisLeft'], right: ['KeyD', 'ArrowRight', 'Pad15', 'PadAxisRight'],
  play: ['Space', 'Pad0'], camera: ['KeyC', 'Pad5'], slower: ['Minus', 'Pad6'], faster: ['Equal', 'Pad7'], restart: ['Home', 'Pad3'],
  confirm: ['Enter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], pause: ['KeyP', 'Pad9'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], del: ['KeyX', 'Pad2'], alt: ['KeyT', 'Pad3']
};
const SPEEDS = [.25, .5, 1, 2, 4];
export function replayScene(app) {
  const game = app.game; let S = null;
  function enter(d) {
    const r = d.replay, t = r.trackId ? app.track(r.trackId) : fromShareCode(r.trackCode);
    const P = app.prepare(t, r.trackId || null);
    S = { r, P, g: new Ghost({ data: r.ghost }), t: 0, playing: true, speed: 2, cam: new ChaseCam(), mode: 0, spots: tvSpots(P.course.samples), onExit: d.onExit, prev: null, ang: 0, dist: 14 };
    S.view = app.show(P); app.music('garage');
    app.replayCtl = { restart: () => { S.t = 0; }, save: () => { app.modes.saveReplay(r); game.note('REPLAY SAVED', 1.5); }, exit: () => S.onExit() };
  }
  function update(dt) {
    if (!S) return;
    if (app.devOpen) { app.dev.update(dt); return; }
    const I = game.input, end = S.g.steps;
    if (I.pressed('play')) S.playing = !S.playing;
    if (I.pressed('camera')) { S.mode = (S.mode + 1) % 3; game.note(['CHASE', 'TV', 'ORBIT'][S.mode], 1); }
    if (I.pressed('slower')) S.speed = Math.max(0, S.speed - 1);
    if (I.pressed('faster')) S.speed = Math.min(4, S.speed + 1);
    if (I.pressed('restart')) S.t = 0;
    if (I.pressed('cancel')) return S.onExit();
    const mv = I.move(); let rate = S.playing ? SPEEDS[S.speed] : 0;
    if (Math.abs(mv[0]) > .3) rate = mv[0] * (I.down('play') ? 4 : 2);
    // mouse: drag orbits, the wheel zooms, a click on the timeline seeks
    const c = I.clicked(); if (c && c[1] > game.H - 46 && c[1] < game.H - 30) S.t = Math.max(0, Math.min(1, (c[0] - 20) / (game.W - 40))) * end;
    const pan = I.pan && I.pan(); if (pan) { S.ang += pan[0] * .01; S.mode = 2; }
    if (app.wheel) { S.dist = Math.max(6, Math.min(40, S.dist + app.wheel * 2)); app.wheel = 0; }
    if (game.input.padAim) { S.ang += game.input.padAim[0] * 2 * dt; S.mode = 2; }
    S.t = Math.max(0, Math.min(end, S.t + rate * dt * 120));
    const st = S.g.at(S.t); if (!st) return;
    const car = { p: st.p, f: st.f, u: st.u, r: st.r, v: st.f.map(x => x * st.speed), grounded: st.grounded, flop: 0, boostT: st.boost ? 1 : 0 };
    if (S.mode === 0) S.cam.follow(car, dt, S.P.phys); else if (S.mode === 1) tv(S.cam, S.spots, st.p); else { S.ang += dt * .2; orbit(S.cam, st.p, S.ang, S.dist, 4); }
    S.st = st;
    const w = S.view && S.view.world; if (w) { w.camera.target = { x: st.p[0] * U, y: st.p[1] * U, z: st.p[2] * U }; w.camera.set('fixed'); w.camera.fixed = S.cam.pose(); w.step(dt); }
  }
  function draw(r) {
    if (!S || !S.view) return;
    const st = S.st || S.g.at(0);
    S.view.drawTrack(game.real || 0, { startGate: S.P.course.startGate, lights: 0, cheer: .2 });
    if (st) drawCar(S.view.world.pen, S.r.car, { ...st, wheelSpin: S.t * .3, time: S.t / 120, boost: st.boost ? 1 : 0, lights: S.P.track.env === 'frostpeak' }, S.r.paint);
    S.view.world.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      big(g, fmt(Math.min(S.t, S.r.steps)), W / 2, 8, '#ffffff', 3);
      const splits = (S.r.splits || []).filter(s => s <= S.t); if (splits.length) text(g, 'CP ' + splits.length + '  ' + fmt(splits[splits.length - 1]), W / 2 - 60, 40, COL.blue);
      E.font.text(g, 'REPLAY • ' + S.r.trackName + ' • ' + ['CHASE', 'TV', 'ORBIT'][S.mode] + ' • ' + SPEEDS[S.speed] + 'X' + (S.playing ? '' : ' • PAUSED'), 10, 10, '#ffd23a', { outline: '#10101a' });
      px.rect(g, 20, H - 40, W - 40, 6, '#24305a'); px.rect(g, 20, H - 40, Math.round((W - 40) * S.t / Math.max(1, S.g.steps)), 6, '#ff9a2a');
      for (const s of S.r.splits || []) px.rect(g, 20 + Math.round((W - 40) * s / Math.max(1, S.g.steps)), H - 42, 2, 10, '#5ab0ff');
      promptBar(g, game, [['play', S.playing ? 'PAUSE' : 'PLAY'], ['left', 'SCRUB'], ['camera', 'CAMERA'], ['faster', 'SPEED'], ['cancel', 'EXIT']]);
      if (app.devOpen) app.dev.draw(g, W, H);
    });
  }
  return { pausable: true, input: REPLAY_INPUT, touch: [], camera: false, enter, update, draw, exit() { S = null; } };
}
