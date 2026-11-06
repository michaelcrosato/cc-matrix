// Attract mode: a looping AI-played demo (arcade/kiosk). A director over a list of clips; the bot cheats freely; any input exits.
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { TITLE } from '../config.js';
import { device } from '../core/device.js';
import { Run } from '../core/run.js';
import { Bot } from '../game/bot.js';
import { makeGame } from '../game/flow.js';
import { byId, launchDef } from '../data/levels/index.js';
import { CaseScreen } from './caseScreen.js';
import { ShopScreen, shopStock } from './shopScreen.js';
import { TitleScene } from './title.js';
import { WEAPON_ORDER } from '../data/weapons.js';

function demoRun() {
  const run = new Run('standard'); run.doubloons = 6000;
  for (const w of WEAPON_ORDER) run.addWeapon(w);
  for (const [id, n] of [['ammo_pistol', 100], ['ammo_shells', 24], ['ammo_rifle', 20], ['ammo_bolts', 6], ['samphire', 3], ['flare', 2]]) run.addItem(id, n);
  for (const w of WEAPON_ORDER) { run.mags[w] = run.magSize(w); }
  run.addValuable('pearl'); run.addValuable('amber'); run.addValuable('reliquary');
  run.equipped = 'pistol'; run.hp = run.maxHp; return run;
}
const sq = { x: -1.5, z: 8 };
/** Clips: what to load, for how long, and how to drive it. */
export const CLIPS = [
  { id: 'siege', secs: 40, def: () => byId('quay'), entry: sq, flags: ['arrived', 'mender-done', 'fathom-met'], hurry: (a, t) => { if (t > 18 && a.siegeT0 !== undefined && !a.hasFlag('foghorn')) a.siegeT0 -= 220; }, plan: (a) => [{ x: a.level.wx(30), z: a.level.wz(22), r: 3 }] },
  { id: 'case', secs: 8, montage: 'case' },
  { id: 'shop', secs: 8, montage: 'shop' },
  { id: 'cannery', secs: 30, def: () => byId('cannery'), entry: { x: -2, z: 4 }, flags: ['dame-met'], dame: true, setup: (a) => { a.addDame(a.player.x - 2, a.player.z + 2); const h = []; for (let i = 0; i < 6; i++) a.spawn('gaffer', a.player.x - 8 + i * 3, a.player.z - 9, { state: 'APPROACH' }); a.spawn('carrier', a.player.x + 10, a.player.z - 6, { state: 'APPROACH' }); a.spawn('runner', a.player.x + 6, a.player.z - 9, { state: 'APPROACH' }); }, noScripts: true },
  { id: 'bosun', secs: 25, def: () => byId('yard'), entry: { x: 0, z: -5 }, flags: [], bosunTick: true },
  { id: 'causeway', secs: 15, def: () => byId('causeway'), entry: { x: 0, z: 10 }, flags: [] },
  { id: 'crypt', secs: 15, def: () => byId('abbey'), entry: { x: -14.5, z: 5 }, flags: [], noScripts: true, setup: (a) => { for (let i = 0; i < 3; i++) a.spawn('monk', a.player.x + 3 + i * 2, a.player.z - 4, { state: 'APPROACH' }); a.spawn('knight', a.player.x + 8, a.player.z - 6, { state: 'APPROACH' }); } },
  { id: 'bathysphere', secs: 30, def: () => byId('nave'), entry: { x: 0, z: 8 }, flags: [] },
  { id: 'launch', secs: 15, def: () => launchDef, launch: true },
  { id: 'title', secs: 5, title: true },
];
const att = { i: -1, t: 0, busy: false, seq: 0, band: 0, montage: 0 };
export function startAttract() {
  if (app.attract || app.hub) return;
  app.attract = att; att.i = -1; att.busy = false; att.seq = device.inputSeq; att.t = 0;
  nextClip();
}
export function stopAttract() { app.attract = false; att.busy = false; }
async function nextClip() {
  if (att.busy) return; att.busy = true;
  let guard = 0;
  while (app.attract && guard++ < CLIPS.length) {
    att.i = (att.i + 1) % CLIPS.length; const c = CLIPS[att.i]; att.t = 0; att.clip = c; att.montage = 0; att.keyI = 0;
    try {
      if (c.title) { await app.go(new TitleScene({ attractCard: true })); app.attract = att; att.busy = false; return; }
      const run = demoRun(); app.run = run; app.screens = [];
      let game;
      if (c.launch) { game = makeGame(launchDef, { run }); }
      else {
        const def = c.def ? c.def() : byId('quay');
        game = makeGame({ ...def, scripts: c.noScripts ? [] : def.scripts, ...(c.montage ? { scripts: [] } : {}) }, { run, entry: c.entry, attract: true, noSave: true, noPause: true, dame: c.dame });
        if (c.flags) game.flags = new Set(c.flags);
        const bot = new Bot({ cheat: true, teleportStuck: true }); bot.attach(game);
        game.attractBot = bot;
        game.opts.onReady = (a) => { a.dev.god = true; a.dev.ammo = true; c.setup?.(a); if (c.plan) a.def = { ...a.def, botPlan: c.plan }; };
      }
      await app.go(game);
      app.attract = att;
      if (c.montage) await new Promise((r) => setTimeout(r, 30));
      att.busy = false; return;
    } catch (e) { console.error('attract clip failed', c.id, e); }
  }
  att.busy = false;
}
const KEYS_CASE = [[1.0, 'ArrowRight'], [1.4, 'ArrowRight'], [1.8, 'Enter'], [2.4, 'Enter'], [3.2, 'ArrowDown'], [3.6, 'ArrowDown'], [4.0, 'Enter'], [4.5, 'KeyR'], [5.0, 'ArrowRight'], [5.4, 'Enter'], [6.2, 'KeyF'], [7.0, 'Escape']];
const KEYS_SHOP = [[0.8, 'KeyE'], [1.6, 'KeyE'], [2.4, 'ArrowDown'], [3.0, 'Enter'], [4.0, 'ArrowDown'], [4.4, 'Enter'], [5.2, 'ArrowRight'], [5.6, 'Enter'], [6.4, 'Enter'], [7.2, 'Enter']];
/** Called every frame by whichever game is running. */
export function attractFrame(game, ctx, dt) {
  if (!app.attract) return;
  // any input exits, and does nothing else
  if (device.inputSeq !== att.seq) { exitAttract(); return; }
  const c = att.clip; if (!c) return;
  att.t += 1 / 60;
  if (c.hurry) c.hurry(game, att.t);
  if (c.bosunTick && game.boss && !game.boss.dead) { if (Math.floor(att.t / 0.5) !== Math.floor((att.t - 1 / 60) / 0.5) && game.crane?.lamp && game.crane.state === 'travel') game.crane.release(); }
  if (c.montage) montage(game, ctx, c);
  if (att.t >= c.secs && !att.busy) { app.screens = []; nextClip(); }
  // overlay band
  const W = ui.W, H = ui.H; ui.rect(0, 0, W, 14, 'ink'); ui.text(8, 4, 'DEMO', { color: 'red' }); ui.text(W / 2, 4, TITLE, { align: 'center', color: 'sand' });
  if (Math.sin(att.t * 5) > -0.2) ui.text(W / 2, H - 14, app.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', { align: 'center', color: 'white' });
}
function montage(game, ctx, c) {
  const keys = c.montage === 'case' ? KEYS_CASE : KEYS_SHOP;
  if (!att.montageOpen) { att.montageOpen = true; att.keyI = 0; if (c.montage === 'case') { app.run.addItem('ammo_shells', 5); app.push(new CaseScreen({})); } else app.push(new ShopScreen(shopStock(1))); }
  while (att.keyI < keys.length && att.t >= keys[att.keyI][0]) { const k = keys[att.keyI++][1]; ctx.input.setKey(k, true); att.release = { k, f: 3 }; }
  if (att.release && --att.release.f <= 0) { ctx.input.setKey(att.release.k, false); att.release = null; }
}
async function exitAttract() {
  app.attract = false; att.busy = false; att.montageOpen = false; app.screens = [];
  try { app.engine.input.release?.(); } catch { /* */ }
  app.run = null; await app.go(new TitleScene());
}
app.attractFrame = attractFrame;
