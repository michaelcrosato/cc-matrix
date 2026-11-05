// CRACKMANIA medals (PLAN §4.9): the author time is the bot at skill 1 without cheats (baked by tools/bake.mjs into
// data/medals.js; tests check the table is fresh). Gold = author x 1.06 rounded up to 0.1 s, Silver x 1.2 up to 1 s,
// Bronze x 1.5 up to 1 s (Dev sliders). Coco's ghost is that same bot run, regenerated when needed
import { CFG } from '../config.js';
import { ctx, E } from '../ctx.js';
import { MEDALS } from '../data/medals.js';
import { Course } from './course.js';
import { Run } from './run.js';
import { Plan, Bot } from './bot.js';
import { ENVS } from '../env/envs.js';
const up = (steps, k, q) => Math.round(Math.ceil(steps / 120 * k / q - 1e-9) * q * 120);
export function thresholds(author, scale = 1) {
  if (!author) return null;
  return { author, gold: up(author, CFG.gold * scale, .1), silver: up(author, CFG.silver * scale, 1), bronze: up(author, CFG.bronze * scale, 1) };
}
/** the medal (0..4) a time earns */
export function medalFor(steps, t) { if (!t || steps === null || steps === undefined) return 0; return steps <= t.author ? 4 : steps <= t.gold ? 3 : steps <= t.silver ? 2 : steps <= t.bronze ? 1 : 0; }
/** the next target above a medal: { medal, steps } */
export function nextTarget(m, t) { if (!t) return null; const k = Math.min(4, m + 1); return { medal: k, steps: [0, t.bronze, t.silver, t.gold, t.author][k] }; }
/** drive a track with the author bot: { steps, ghost, respawns } (null: it didn't finish) */
export function botRun(track, o = {}) {
  const course = o.course || new Course(track, E.RAPIER), model = o.model || ENVS[track.env].car;
  const run = new Run(course, model, { countdown: 0 }), bot = new Bot(new Plan(course, model, o.skill ?? 1, o.seed || 1), o.bot || {});
  const max = (o.maxSeconds || 150) * 120;
  for (let i = 0; i < max && !run.finished; i++) { const c = bot.drive(run.car, 1 / 120, true); if (c.respawn) { run.respawn(); bot.relocate(run.car); } run.step(c); run.ev.length = 0; }
  const out = run.finished ? { steps: run.finishSteps, respawns: run.respawns, ghost: run.rec.encode({ steps: run.finishSteps, model, author: true }), splits: run.splits.slice() } : null;
  if (!o.course) course.free();
  return out;
}
/** every track's thresholds: the baked table, or a live bake for a track it lacks */
export function bakeAll() {
  ctx.medals = {};
  for (const id of Object.keys(ctx.tracks || {})) { const a = MEDALS[id] ?? (botRun(ctx.tracks[id]) || {}).steps ?? null; ctx.medals[id] = thresholds(a); }
  for (const [id, a] of Object.entries(MEDALS)) if (!ctx.medals[id]) ctx.medals[id] = thresholds(a);
}
const authorCache = new Map();
/** Coco's ghost for a track (the author run, made once per session) */
export function authorGhost(track) {
  const key = track.id + ':' + JSON.stringify(CFG.cars[ENVS[track.env].car]).length + ':' + track.version;
  if (!authorCache.has(key)) authorCache.set(key, botRun(track));
  return authorCache.get(key);
}
