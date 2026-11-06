// Time trial / test drive helpers for RaceScene: a solo sim, the ghost of your best lap, pass-the-pad. Plan section 6 (Arcade), 14.
import { THREE, toonMaterial } from '../../pixel-engine.js';
import { App, fmtTime, saveProfile } from '../app.js';
import { RaceSim } from '../sim/race.js';
import { CarView } from '../render/carview.js';
import { tunedParams, defaultInstall } from '../sim/tuning.js';
import { packGhost, unpackGhost, STRIDE } from '../sim/replay.js';
import { TRACKS } from '../data/tracks.js';
import { getTrack } from '../sim/race.js';
export function makeTrialSim(cfg) {
  const t = cfg.trial, { tr } = getTrack(cfg.track), L = tr.length;
  return new RaceSim({ track: cfg.track, laps: cfg.drive ? 1 : 99, start: 'flying', startS: L - 70, startSpeed: 20, contact: false, rain: cfg.rain, seed: 3, wearMul: 0.3, env: {}, field: [{ id: 'player', carId: t.carId, name: 'YOU', player: true, skill: 1, install: t.install ?? defaultInstall(), colour: 'red' }] });
}
export function initTrial(sc, ctx) {
  const key = sc.cfg.track + '|' + sc.cfg.trial.carId; sc.ghostKey = key; const g = App.profile.ghosts?.[key]; sc.ghost = null; sc.pass = sc.cfg.trial.pass ? { cur: 0, best: [Infinity, Infinity] } : null; sc.sim.state = 'racing'; sc.sim.greenAt = 0;
  if (g && !sc.cfg.drive) { const d = unpackGhost(g.data); const p = tunedParams(sc.cfg.trial.carId, defaultInstall()); const v = new CarView(sc.cfg.trial.carId, p, { name: 'GHOST', ghost: 'cyan' }); ctx.scene.add(v.root); sc.ghost = { v, rec: d.rec, time: g.time, hz: d.hz }; }
}
export function trialEvent(sc, ctx, ev) {
  if (ev.type !== 'lap') return; const f = sc.focus, frames = Math.round(ev.time * 30), rec = sc.sim.record.slice(-frames).map((r) => r.slice(0, STRIDE)); const best = App.profile.ghosts?.[sc.ghostKey];
  if (sc.pass) { const p = sc.pass; p.best[p.cur] = Math.min(p.best[p.cur], ev.time); const names = ['PLAYER 1', 'PLAYER 2']; sc.say(`${names[p.cur]} ${fmtTime(ev.time)}.  ${names[1 - p.cur]}: YOUR TURN`, 'sand', 4); p.cur = 1 - p.cur; }
  if (!sc.cfg.drive && !App.dev.changed && (!best || ev.time < best.time)) { App.profile.ghosts ??= {}; App.profile.ghosts[sc.ghostKey] = { time: ev.time, data: packGhost(rec) }; const rec2 = App.profile.records[sc.cfg.track]; if (!rec2 || ev.time < rec2.time) App.profile.records[sc.cfg.track] = { time: ev.time, car: sc.cfg.trial.carId }; saveProfile(); sc.say('NEW BEST LAP ' + fmtTime(ev.time), 'lime', 3); }
  if (sc.cfg.drive) { sc.over = true; sc.endT = 0; }
}
const v3 = new THREE.Vector3();
export function updateGhost(sc, ctx, ui, dt) {
  const g = sc.ghost; if (!g) return; const f = sc.focus; if (f.crossings < 1) { g.v.root.visible = false; return; } const t = sc.sim.time - f.lapStart, fr = t * g.hz; if (fr >= g.rec.length - 1) { g.v.root.visible = false; return; } g.v.root.visible = true; const a = Math.floor(fr), u = fr - a, A = g.rec[a], B = g.rec[a + 1], q = (k) => A[k] + (B[k] - A[k]) * u; let dy = B[3] - A[3]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  g.v.place({ x: q(0), y: q(1), z: q(2), yaw: A[3] + dy * u, delta: q(6), u: 20, ax: 0, ay: 0, vy: 0 }, { dt, pitchRoad: q(4) }); v3.set(q(0), q(1) + 2.2, q(2)).project(ctx.camera.camera); if (v3.z < 1 && Math.abs(v3.x) < 1 && Math.abs(v3.y) < 1) ui.text(Math.round((v3.x + 1) / 2 * ui.W - 14), Math.round((1 - v3.y) / 2 * ui.H), 'GHOST ' + fmtTime(g.time, 1), { color: 'cyan' });
}
