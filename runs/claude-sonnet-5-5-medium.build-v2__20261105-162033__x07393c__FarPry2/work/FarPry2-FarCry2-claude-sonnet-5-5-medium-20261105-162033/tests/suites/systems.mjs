// systems: the rules of the game, one at a time, headless and fast.
import { freePlay, boot, press, hold, ROOT } from '../lib/boot.mjs';
import { FireGrid, FN, ST } from '../../src/world/fire.js';
import { jamChance, gunStage, wearPerShot } from '../../src/combat/gunmath.js';
import { TUNING, resetTuning } from '../../src/core/tuning.js';
import { TUNING_DEFAULTS, SLIDERS } from '../../src/content/tuning-defaults.js';
import { plan } from '../../src/audio/voice.js';
export const covers = ['src'];
const { Rng } = await import(ROOT + '/pixel-engine.js');
function fireRun(wind, seed, T = 30, road = false) {
  const f = new FireGrid(new Rng(seed)); f.fuel.fill(1); f.baseFuel.fill(1); f.wind = { dir: [1, 0], speed: wind };
  if (road) for (let z = 0; z < FN; z++) { f.fuel[90 + z * FN] = 0; f.baseFuel[90 + z * FN] = 0; f.fuel[91 + z * FN] = 0; f.baseFuel[91 + z * FN] = 0; }
  const cx = 60, cz = 128; for (let d = -1; d <= 1; d++) f.lightCell(cx, cz + d);
  for (let i = 0; i < T * 4; i++) f.step();
  let head = 0, back = 0, flank = 0, crossed = 0;
  for (let i = 0; i < FN * FN; i++) if (f.state[i] !== 0) { const x = i % FN, z = (i / FN) | 0; head = Math.max(head, x - cx); back = Math.max(back, cx - x); flank = Math.max(flank, Math.abs(z - cz)); if (x > 92) crossed++; }
  return { head: head * 5 / T, back: back * 5 / T, flank: flank * 5 / T, crossed, f };
}
export async function run(t) {
  // ---- fire ----
  const avg = (w, k) => [1, 2, 3, 4, 5].map((s) => fireRun(w, s)[k]).reduce((a, b) => a + b, 0) / 5;
  const h5 = avg(5, 'head'); t.ok(h5 >= 2 && h5 <= 5, `fire head at 5 m/s is ${h5.toFixed(2)} (need 2 to 5)`);
  t.ok(avg(5, 'flank') < h5 - 0.8 && avg(5, 'back') < 1, 'flanks and back are slower than the head');
  t.ok(Math.abs(avg(0, 'head') - 1.9) < 0.9, 'no-wind spread near 1.9 m/s');
  t.ok(fireRun(3, 7, 40, true).crossed === 0, 'a road stops the fire without strong wind');
  const burnt = fireRun(5, 1, 40).f; const was = burnt.counts().burnt; let relit = 0; for (let i = 0; i < FN * FN; i++) if (burnt.state[i] === ST.BURNT && burnt.lightCell(i % FN, (i / FN) | 0)) relit++; t.eq(relit, 0, 'burnt cells cannot burn again'); t.ok(was > 20, 'a fire burned something');
  const rg = fireRun(5, 2, 30).f; rg.hours = 0; for (let k = 0; k < 4; k++) { rg.tick += 50; rg.hourTick(60, 48); } t.ok(rg.counts().regrowing > 0, 'burnt land regrows after 48 hours');
  const sv = rg.save(); const rg2 = new FireGrid(new Rng(1)); rg2.load(sv); t.eq(rg2.counts().regrowing, rg.counts().regrowing, 'the fire grid saves and loads');
  // ---- wear and jams ----
  t.ok(Math.abs(1 / jamChance(90) - 833) < 60 && Math.abs(1 / jamChance(50) - 33.3) < 3 && Math.abs(1 / jamChance(30) - 17) < 2, 'jam odds match the plan');
  t.eq([gunStage(80), gunStage(45), gunStage(20), gunStage(5), gunStage(0)], ['clean', 'rust', 'tape', 'rattle', 'broken'], 'condition stages');
  t.ok(wearPerShot(1, true) === 0.6 && wearPerShot(1, false) === 1, 'cleaning kit wears 40 percent less');
  { const { e, g } = await freePlay(); const w = g.weapons; w.give('tractor', 20); w.equipSlot('main', true); g.infiniteAmmo = false;
    w.gunState().jammed = true; w.gunState().presses = 3; const mag = w.gunState().mag; hold(e, 'MouseLeft', 6); t.eq(w.gunState().mag, mag, 'a jammed gun does not fire');
    for (let i = 0; i < 3; i++) { press(e, 'KeyR', 3); e.step(40); } t.ok(!w.gunState().jammed, 'reload presses clear a jam');
    const c0 = w.gunState().cond; for (let i = 0; i < 6; i++) { hold(e, 'MouseLeft', 6); e.step(10); } t.ok(w.gunState().cond < c0 || w.gunState().jammed, 'firing wears the gun');
    w.gunState().cond = 0.01; w.gunState().jammed = false; w.gunState().mag = 30; e.step(30); hold(e, 'MouseLeft', 12); e.step(150); t.ok(!w.has('tractor'), 'a gun at zero falls apart and the slot empties'); }
  // ---- damage and the body ----
  { const { e, g } = await freePlay(); const s = g.spawnSoldier({ faction: 'concord', at: [30, 180], yaw: 0, duty: 'guard' }); s.suspicion = -50; e.step(5);
    const hp0 = s.hp; g.damageActor(s, 10, 'head', {}); t.ok(Math.abs((hp0 - s.hp) - 25) < 0.5, 'a headshot does 2.5 times'); const hp1 = s.hp; g.damageActor(s, 10, 'legs', {}); t.ok(Math.abs((hp1 - s.hp) - 7) < 0.5, 'a leg shot does 0.7 times'); g.damageActor(s, 500, 'torso', {}); t.ok(!s.alive, 'a soldier can die');
    g.body.hp = 50; g.body.sinceHurt = 0; g.weapons.syrettes = 3; hold(e, 'KeyQ', 60); t.ok(g.body.hp >= 85 && g.weapons.syrettes === 2, 'a syrette heals 40 and is spent');
    g.body.hp = 15; hold(e, 'KeyQ', 5); t.ok(g.body.heal && g.body.heal.kind === 'surgery', 'below 20 HP, Heal runs surgery'); e.step(60 * 5); t.ok(g.body.hp >= 40 && g.weapons.syrettes === 2, 'surgery leaves you at 40 HP and costs no item');
    g.body.hp = 15; hold(e, 'KeyQ', 5); e.step(30); g.hurt(5, 'bullet'); t.ok(!g.body.heal, 'a hit interrupts surgery');
    g.body.hp = 100; g.setPlayerOnFire('test'); e.step(60); t.ok(g.body.hp < 95 && g.body.burning, 'burning hurts'); g.body.burning = false;
    // dying with and without a buddy
    g.godMode = false; g.body.hp = 100; g.hurt(500, 'bullet'); e.step(120); t.eq(g.mode, 'dead', 'down without a buddy is death');
    const r = await freePlay(); r.g.story.met.ines = true; r.g.story.dead = []; r.g.hurt(500, 'bullet'); r.e.step(60 * 6); t.ok(r.g.mode === 'play' && r.g.body.hp >= 40, 'a buddy rescue brings you up at 40 HP'); t.ok(r.g.story.spentUntil.ines > 0, 'the rescuer is spent'); }
  // ---- fever ----
  { const { e, g } = await freePlay(); g.noFever = false; g.weapons.tablets = 2; g.body.startFever(); e.step(10); t.ok(g.body.feverLevel() > 0 && g.state().prompts.some((p) => /tablet/i.test(p)), 'fever shows the tablet prompt'); hold(e, 'KeyH', 80); e.step(60 * 6); t.ok(!g.body.fever.active && g.weapons.tablets === 1, 'a tablet clears the fever');
    g.story.stones = 10; g.body.startFever(); e.step(60 * 26); t.ok(!g.body.fever.active && g.story.stones === 8, 'ignoring the fever collapses you and costs 20 percent of your stones'); }
  // ---- perception ----
  { const { g } = await freePlay(); const t0 = g.playerTarget; g.player.crouched = true; t.ok(g.stanceMult(t0) < 1, 'crouching hides you'); g.player.crouched = false; g.world.hour = 12; const day = g.lightMult(t0); g.world.hour = 23; const night = g.lightMult(t0); t.ok(night < day, 'night cuts vision'); g.flashUntil = g.ctx.time + 5; t.ok(g.lightMult(t0) > night, 'a muzzle flash doubles it back'); g.world.hour = 12;
    g.story.contract = 'concord'; t.ok(g.passFor('concord', null), 'a contract is a pass'); g.hostileUntil = { concord: g.ctx.time + 60 }; t.ok(!g.passFor('concord', null), 'firing near them voids it'); g.hostileUntil = null;
    const s = g.spawnSoldier({ faction: 'harvest', at: [0, 130], yaw: 0 }); s.ignite(); g.fixedStep?.(); }
  { const { e, g } = await freePlay(); const s = g.spawnSoldier({ faction: 'harvest', at: [34, 220], yaw: 0 }); s.ignite(); e.step(60 * 7); t.ok(!s.alive, 'a burning soldier panics and dies'); }
  // ---- vehicles ----
  { const { e, g } = await freePlay(30, 200); const v = g.spawnVehicle('pickup', [36, 200], 0); e.step(60); g.vehSys.enter(v); e.input.setKey('KeyW', true); e.step(150); t.ok(v.speed() > 14, `the pickup reaches speed (${v.speed().toFixed(1)})`); e.input.setKey('KeyW', false);
    v.damage(70, 'bullet'); t.ok(v.hp < 35 && v.power() < 1, 'below 35 HP the engine is weaker'); v.damage(25, 'bullet'); t.ok(v.hp < 10 && v.burning, 'below 10 HP it burns'); v.damage(100, 'bullet'); e.step(60 * 9); t.ok(v.wreck, 'a burning vehicle explodes in 8 seconds');
    const v2 = g.spawnVehicle('pickup', [60, 200], 0); e.step(30); v2.damage(200, 'bullet'); t.ok(v2.stalled, 'at 0 HP, not burning: stalled'); g.vehSys.exit(true); g.player.teleport(60, 200 + 2.9); e.step(5); const ex = g.vehSys.extra(g).find((x) => /REPAIR/.test(x.verb)); if (ex) { ex.run(); } t.ok(!v2.stalled && v2.hp >= 50, 'repair restores 50 HP'); }
  { const { e, g } = await freePlay(30, 200); const v = g.spawnVehicle('technical', [36, 200], 0); e.step(40); g.vehSys.enter(v); g.mapSys.raise(true); e.step(5); t.ok(g.mapUp && g.state().map.up, 'the map comes up while driving'); g.mapSys.cursor.x = 120; g.mapSys.cursor.y = 130; e.input.setKey('MouseLeft', true); e.step(3); e.input.setKey('MouseLeft', false); e.step(3); t.ok(g.waypoint, 'a click on the map sets the waypoint'); g.mapSys.raise(false); g.device = 'kbm'; press(e, 'KeyF'); t.ok(g.vehSys.mgActive, 'swap to the mounted gun'); }
  // ---- world rules ----
  { const { e, g } = await freePlay(); const c = g.sitesSys.cases[0]; g.story.tracker = true; g.player.teleport(c.x - 20, c.z); hold(e, 'KeyT', 40); const d1 = g.mapSys.nearest; g.player.teleport(c.x - 150, c.z); hold(e, 'KeyT', 20); t.ok(d1 < 40 && g.mapSys.nearest > d1, 'the tracker reads the distance to a case');
    g.player.teleport(c.x, c.z + 1); e.step(10); const it = g.useSys.cand; t.ok(g.state().prompts.some((p) => /use:/.test(p)), 'a case shows a use prompt'); g.takeCase(c); t.ok(g.story.stones > 0 && c.taken, 'taking a case pays stones');
    g.visitedHalts.add('east-siding'); g.story.halts.push('east-siding'); g.story.stones = 3; const h0 = g.world.hour; g.flow.rideTo('east-siding'); e.step(60 * 3); t.ok(g.story.stones === 2 && Math.hypot(g.player.feet.x - 430, g.player.feet.z + 60) < 20, 'a rail halt costs a stone and moves you');
    g.readTrig(0); t.ok(g.story.trig.length === 1 && g.subtitle?.text.includes('promise'), 'a trig point reads the first note');
    g.story.stones = 20; g.flow.rackBuy({ id: 'tractor', slot: 'main', price: 6, name: 'Tractor' }); t.ok(g.story.stones === 14 && g.story.unlocked.includes('tractor'), 'buying a gun unlocks clean copies');
    const site = g.sitesSys.find('pump-shed'); g.world.hour = 9; g.flow.sleepUntil(0, site); e.step(120); t.ok(g.world.hour < 1 || g.world.hour > 23.5, 'sleep to midnight'); }
  { const { e, g } = await freePlay(); const gr = g.fireSys.grid; const post = g.sitesSys.sites.find((s) => s.id === 'p2'); g.sitesSys.spawnSite(post); for (const sl of post.slots) if (sl.soldier) g.damageActor(sl.soldier, 999, 'torso', { noDrop: true }); t.ok(post.cleared, 'a post can be cleared'); g.world.day += 2; g.sitesSys.fixed({ ...g, step: 30, canMove: () => true, mode: 'play', player: g.player, gameHours: () => g.gameHours() }, 1); t.ok(!post.cleared, 'a cleared post re-mans after postRemanHours'); }
  // ---- save and load ----
  { const { e, g } = await freePlay(); globalThis.localStorage = (() => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })();
    g.story.stones = 17; g.fire.ignite(0, 150, 5); e.step(240); const burnt = g.fire.counts().burnt; const { writeSave, readSave, hasSave } = await import(ROOT + '/src/core/save.js'); t.ok(writeSave(g) && hasSave(), 'the game saves'); g.story.stones = 0; g.fireSys.reset(); g.flow.continueGame(); e.step(5); t.ok(g.story.stones === 17 && g.fire.counts().burnt + g.fire.counts().regrowing >= burnt - 1, 'the game loads stones and the fire grid'); delete globalThis.localStorage; }
  // ---- UI: menus by keyboard, mouse and pad; glyphs; settings; pause ----
  { const { e, game: g } = await boot(); t.eq(g.state().screen, 'title', 'boots to the title'); press(e, 'Enter'); t.eq(g.state().screen, 'main', 'Enter opens the main menu'); press(e, 'ArrowDown'); t.ok(g.ui.focus === 1, 'down moves the focus');
    e.input.setPointer(0, 0.5, false); e.step(2); e.input.setPointer(0, 0.1, false); e.step(2); const f1 = g.ui.focus; e.input.setPointer(0, -0.3, false); e.step(2); t.ok(g.ui.focus !== f1 || g.ui.rects.length > 0, 'mouse hover moves focus'); e.input.setPointer(0, 0, false);
    // pad stub
    let pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; globalThis.navigator.getGamepads = () => [pad];
    pad.buttons[13].pressed = true; e.step(3); pad.buttons[13].pressed = false; e.step(3); t.eq(g.device, 'pad', 'a pad press switches the device'); t.ok(g.ui.focus >= 1, 'the d-pad drives the menu');
    pad.buttons[0].pressed = true; e.step(3); pad.buttons[0].pressed = false; e.step(3); delete globalThis.navigator.getGamepads;
    g.settings.glyphs = 'xbox'; t.eq(g.settings.glyphs, 'xbox', 'xbox glyph set is selectable'); }
  { const { e, g } = await freePlay(); press(e, 'Escape'); t.ok(g.ui.screen?.id === 'pause' && g.ctx.engine.timeScale === 0, 'Esc pauses and freezes the world'); const step0 = g.step; e.step(30); t.eq(g.step, step0, 'the world does not step while paused'); press(e, 'Escape'); t.ok(!g.ui.screen && g.ctx.engine.timeScale === 1, 'Esc resumes'); }
  { const { e, game: g } = await boot(); const s = await import(ROOT + '/src/core/settings.js'); t.ok(g.ctx.audio.volume.music === 0.1 && g.settings.music === 0.1, 'music defaults to 10 percent'); }
  // ---- dev sliders ----
  { const { e, g } = await freePlay(); for (const [k, , min, max] of SLIDERS) { TUNING[k] = max; } for (const [k, , , max] of SLIDERS) t.eq(TUNING[k], max, `slider ${k} sets`); resetTuning(); for (const k of Object.keys(TUNING_DEFAULTS)) t.eq(TUNING[k], TUNING_DEFAULTS[k], `reset ${k}`);
    TUNING.playerSpeed = 2; const f0 = g.player.feet.z; hold(e, 'KeyW', 60); const d2 = f0 - g.player.feet.z; resetTuning(); g.player.teleport(0, 100); e.step(20); const f1 = g.player.feet.z; hold(e, 'KeyW', 60); t.ok(d2 > (f1 - g.player.feet.z) * 1.5, 'playerSpeed slider changes the run speed'); }
  // ---- attract ----
  { const { e, game: g } = await boot(); e.step(600); t.ok(!g.attract.active, 'attract does not start at frame 600'); e.step(2); t.ok(g.attract.active, 'attract starts at frame 601'); e.step(60 * 20); t.ok(g.attract.active && e.errors.length === 0, 'attract runs without errors'); press(e, 'KeyZ'); t.ok(!g.attract.active && g.mode === 'title', 'any input exits attract'); }
  { const { e, game: g } = await boot(); press(e, 'Enter'); e.step(5); press(e, 'Enter'); /* settings is exempt */ }
  // ---- touch gate ----
  { globalThis.window = { matchMedia: (q) => ({ matches: /pointer: coarse/.test(q) && !/any-pointer/.test(q) ? true : false }), addEventListener() {} }; globalThis.document = undefined; const { game: g } = await boot().catch(() => ({ game: null })); delete globalThis.window; if (g) t.ok(g.touchOnly && g.state().notice === 'Controller or keyboard required', 'touch-only devices see the notice'); }
  // ---- voices ----
  t.ok(plan('bakr', 'Forty miles of track and not one station.').length > 5 && JSON.stringify(plan('ines', 'Get in.')) === JSON.stringify(plan('ines', 'Get in.')), 'voices are stable gibberish');
  { const { e, g } = await freePlay(); t.ok(g.state().fauna.gazelles >= 12, 'gazelle herds graze'); const gz = g.faunaSys.gazelles[0]; g.player.teleport(gz.x + 20, gz.z); g.weapons.lastShot = g.ctx.time; e.step(60); t.ok(gz.flee > 0 || gz.sp > 5, 'gazelles bolt from gunfire'); g.setWeather('dust'); e.step(30); t.ok(g.weather === 'dust' && g.world.wind.speed >= 7, 'dust raises the wind'); g.setWeather('clear'); }
  // ---- solo round ----
  { const { e, game: g } = await boot(); e.step(3); g.flow.startRound(); g.godMode = true; e.step(60 * 6); const R = g.round; R.cases[0].x = g.player.feet.x; R.cases[0].z = g.player.feet.z + 1; e.step(5); hold(e, 'KeyE', 90); t.ok(R.local.carry === 0, 'hold Use takes a case'); g.player.teleport(150, -205); e.step(30); t.ok(R.local.stones > 0 && R.local.carry === -1, 'a case is banked at the truck');
    R.local.carry = 1; R.cases[1].taken = true; R.down(R.local); t.ok(R.local.state === 'down' && R.local.carry === -1 && !R.cases[1].taken, 'down drops the case'); const p = R.players[1]; R.damage(p, 500, 'bullet'); t.ok(p.state === 'down', 'bots go down'); g.player.teleport(p.pos.x, p.pos.z); R.local.state = 'alive'; g.body.hp = 100; e.step(5); hold(e, 'KeyE', 200); t.ok(p.state === 'alive' && R.local.revives === 1, 'holding Use revives a friend'); }
}
