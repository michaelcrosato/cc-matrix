// CRACKMANIA showcase: a bot lapping a track behind the title and the menus (and the attract mode's races), filmed by
// trackside TV cameras. It runs as a race session inside the current scene (startRace with stay)
import { ctx, E, U } from '../ctx.js';
import { startRace, update as raceUpdate, draw as raceDraw, rememberSteps, raceState } from './race.js';
import { Run } from '../race/run.js';
import { tvSpots, tvPick, poseOf } from '../car/camera.js';
import { add, sub, len, norm } from '../lib/v3.js';
import { ENVS } from '../env/envs.js';

export function showcase(id = 'D3', o = {}) {
  const track = ctx.tracks[id] || o.track, model = ENVS[track.env].car;
  const paint = o.paint || ctx.profile.paint(model);
  const sess = startRace({
    kind: 'demo', stay: true, track, intro: false, countdown: 0, noHud: true, orbit: false, noSlowmo: true,
    players: (o.players || [{ bot: { skill: 1, cheat: true, seed: 3 }, name: 'COCO', model, paint }]),
    ghosts: o.ghosts || [],
    camOverride: (P, alpha) => tvCam(P, alpha, o),
    update: dt => { for (const P of ctx.session.players) if (P.run.finished && (P.doneT = (P.doneT || 0) + dt) > 1.5) { P.doneT = 0; P.run = new Run(ctx.session.course, P.model, { countdown: 0 }); P.bot.reset(0); P.cam.snap(); } }
  });
  sess.tv = tvSpots(sess.course.samples, sess.course.ph); sess.tvCur = null; sess.tvT = 0; sess.cutT = 0;
  if (o.music !== false && ctx.music) ctx.music.play(o.song || 'title');
  return sess;
}
/** a trackside camera that keeps the lead car in frame, cutting to the next spot as it passes (a chase shot between) */
function tvCam(P, alpha, o) {
  const sess = ctx.session, car = P.run.car, g = ctx.game;
  sess.cutT = (sess.cutT || 0) + (g.real - (sess._lastReal || g.real)); sess._lastReal = g.real;
  if (o.chase || (sess.chaseUntil && g.real < sess.chaseUntil)) return P.cam.pose(alpha);
  let cur = sess.tvCur;
  if (!cur || sess.cutT > 2.5 || len(sub(cur.p, car.p)) > 120) { const nx = tvPick(sess.tv, car, sess.course.ph, cur); if (nx && nx !== cur) { sess.tvCur = cur = nx; sess.cutT = 0; } }
  if (!cur) return P.cam.pose(alpha);
  const L = P._lastStep, p = L && alpha < 1 ? add(L.p, sub(car.p, L.p), alpha) : car.p, d = len(sub(cur.p, p));
  return poseOf(null, { pos: cur.p, look: add(p, [0, 0, .8]), up: [0, 0, 1], fov: Math.max(18, Math.min(60, 2 * Math.atan(9 / Math.max(1, d)) * 180 / Math.PI)) });
}
/** run and draw the showcase from another scene */
export function stepShowcase(dt) { rememberSteps(); raceUpdate(dt); }
export function drawShowcase(r) { raceDraw(r); }
export { raceState };
