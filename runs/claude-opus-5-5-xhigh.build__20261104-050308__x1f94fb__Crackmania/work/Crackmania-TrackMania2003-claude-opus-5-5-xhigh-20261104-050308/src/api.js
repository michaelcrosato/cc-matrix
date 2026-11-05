// CRACKMANIA test handle (game.debug.api, window.__crack.api): what the tests and tools drive the game with. It goes
// through the real scenes and inputs; only the driving can be handed to the bot
import { ctx, E } from './ctx.js';
import { Plan, Bot } from './race/bot.js';
import { snapshot } from './debug.js';
import * as ED from './editor/editor.js';
import { menuState } from './scenes/menu.js';
import { botRun } from './race/medals.js';
export function makeApi() {
  const g = () => ctx.game;
  const api = {
    ctx, snapshot,
    /** run the game until test() or max seconds (exact steps); returns whether test passed */
    until(test, max = 60, step = 1 / 30) { for (let t = 0; t < max; t += step) { if (test()) return true; g().advance(step); } return !!test(); },
    tap(a, I = g().input) { I.tap(a); g().advance(1 / 60); g().advance(1 / 60); },
    hold(a, on = true, I = g().input) { I.hold(a, on); },
    /** the player's car driven by the author bot (or not); the run keeps going through the real race rules */
    botDrives(on = true, skill = 1, cheat = false) { const s = ctx.session; if (!s) return false; const P = s.players.find(q => q.input) || s.players[0]; if (!on) { P.bot = null; return true; } P.bot = new Bot(new Plan(s.course, P.model, skill), { cheat }); P.bot.relocate(P.run.car); return true; },
    /** finish the race in progress with the bot: true when the session reached its after-finish */
    driveToFinish(max = 120) { api.until(() => ctx.session && ctx.game.sceneName !== 'menu' && ctx.game.sceneName !== 'title', 4); api.botDrives(true); return api.until(() => ctx.session && ctx.session.players.every(P => P.run.finished || !P.input), max); },
    editor: { st: ED.ed, place: (type, cx, cy, L = 0, rot = 0) => ED.placeAt(type, { cx, cy, L }, rot), remove: (cx, cy, L = 0) => ED.removeAt({ cx, cy, L }), undo: ED.undo, redo: ED.redo, save: ED.saveSlot, open: ED.openSlot, share: ED.shareCode, import: ED.importCode, test: ED.testDrive, export: ED.exportContent },
    menu: menuState,
    /** screenshots: the player's car put at a share of the route (0..1) at a speed, racing at once */
    warp(frac, kmh = 120) { const s = ctx.session; if (!s) return false; const P = s.players.find(q => q.input) || s.players[0], S = s.course.samples, q = S[Math.max(0, Math.min(S.length - 1, Math.floor(frac * S.length)))]; P.run.phase = 'racing'; P.run.count = 0; import('./scenes/race.js').then(m => { m.raceState.phase = 'racing'; }); const car = P.run.car; car.p = [q.p[0] + q.u[0] * .7, q.p[1] + q.u[1] * .7, q.p[2] + q.u[2] * .7]; car.f = q.t.slice(); car.u = q.u.slice(); car.v = q.t.map(v => v * kmh / 3.6); car.grounded = true; P.cam.snap(); if (P.bot) P.bot.relocate(car); return true; },
    /** the author bot's time on a track (steps), here and now: Node and the browser must agree */
    botTime(id) { const r = botRun(ctx.tracks[id]); return r ? r.steps : null; }
  };
  return api;
}
