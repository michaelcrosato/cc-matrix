// CRACKMANIA game.debug.snapshot(): the state the tests and tools read (PLAN §9.2)
import { ctx } from './ctx.js';
import { ENV_IDS } from './env/envs.js';
import { titleGate } from './scenes/title.js';
import { replayInfo } from './scenes/replay.js';
export function snapshot() {
  const g = ctx.game, s = ctx.session, P = s && (s.players.find(q => q.input) || s.players[0]), run = P && P.run, car = run && run.car, pr = ctx.profile && ctx.profile.p;
  let page = null; try { const m = ctx.api && ctx.api.menu; page = m && m.stack.length ? m.stack[m.stack.length - 1].page : null; } catch (e) { /* none */ }
  return {
    scene: g.sceneName || null, page, mode: s ? s.kind : null, env: ctx.worlds && ctx.worlds.env, track: s ? s.track.id : null,
    run: run ? { phase: run.phase, steps: run.steps, cps: run.cps.size, cpTotal: run.cpTotal, respawns: run.respawns, finished: run.finished, medal: s.result ? s.result.medal : null } : null,
    car: car ? { x: car.p[0], y: car.p[1], z: car.p[2], kmh: car.kmh, grounded: car.grounded, surface: car.surface, block: car.blockId, up: car.u[2] } : null,
    profile: pr ? { coppers: pr.coppers, medals: Object.fromEntries(Object.entries(pr.records).map(([k, v]) => [k, v.medal])), puzzles: Object.fromEntries(Object.entries(pr.puzzles).map(([k, v]) => [k, v.medal])), slots: pr.slots.filter(Boolean).length, replays: pr.replays.length, ended: pr.ended } : null,
    ui: { dialog: !!(ctx.talk && ctx.talk.open), dev: !!(ctx.dev && ctx.dev.open), device: g.input.lastDevice },
    attract: g.sceneName === 'attract', touchGate: g.sceneName === 'title' ? titleGate() : false, hub: { active: !!ctx.hub, phase: ctx.online ? ctx.online.phase : null }, players: g.players ? g.players.length : 1, split: !!g._split,
    replay: g.sceneName === 'replay' ? replayInfo() : null,
    errors: g.errors.length
  };
}
