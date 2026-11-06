// Headless game harness shared by the node suites.
import { readFile } from 'node:fs/promises';
import { Engine } from '../../pixel-engine.js';
import { app } from '../../src/core/app.js';
import { Area } from '../../src/game/area.js';
import { Launch } from '../../src/game/launch.js';
import { TitleScene } from '../../src/screens/title.js';
import { PauseMenu } from '../../src/screens/pause.js';
import { AttractDirector } from '../../src/screens/attract.js';
import { newRun } from '../../src/core/run.js';
import { BotIntent } from '../../src/core/intent.js';
import { Bot } from '../../src/game/bot.js';
app.factories = { area: Area, launch: Launch, title: TitleScene }; app.PauseMenu = PauseMenu; app.startAttract = (t) => { if (app.attract) return; new AttractDirector(app, !!t).start(); };
const assets = async (p) => new Uint8Array(await readFile(new URL('../../' + p, import.meta.url))).buffer;
let engine = null;
export async function boot() { if (engine) return engine; engine = await Engine.headless(new TitleScene(app), { assets, camera: { preset: 'third', fov: 55 } }); app.attach(engine); return engine; }
export { app, Bot, BotIntent, newRun };
/** Load an area (or jump) and wait for it. */
export async function loadArea(id, o = {}, run = null) { const e = await boot(); app.run = run ?? newRun(o.diff ?? 'standard'); await settle(app.goArea(id, { fromSave: true, ...o })); return e.game; }
export async function settle(p) { let done = false; p?.then?.(() => { done = true; }, (err) => { done = true; throw err; }); const e = await boot(); for (let i = 0; i < 2000 && !done; i++) { await new Promise((r) => setImmediate(r)); e.manual = true; if (app.loading) { try { e.step(1); } catch { /* the swap happens after a frame */ } } } }
export function step(n = 1) { engine.step(n); }
export function steps(s) { engine.step(Math.round(s * 60)); }
export const results = { pass: 0, fail: 0, fails: [] };
export function ok(cond, name, detail) { if (cond) results.pass++; else { results.fail++; results.fails.push(name + (detail != null ? ` (${detail})` : '')); } }
export function done(label = '') { for (const f of results.fails) console.log(`FAIL ${label} ${f}`); console.log(`${results.pass} passed, ${results.fail} failed`); process.exit(results.fail ? 1 : 0); }
export function withBot(a, o = {}) { a.intent = new BotIntent(); a.bot = new Bot(a, o); a.autoDialog = true; a.fastText = true; return a.bot; }
