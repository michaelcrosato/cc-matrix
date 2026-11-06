// Searches the test bots' settings, event by event and skill by skill, for the ones that best print PLAN.md's measured scores.
// The result, tools/plan-fits.json, is used only by tools/test-fits.mjs. Nothing in the game reads it.
// A fitted bot reaching a score shows this build can produce it, and guards against the physics drifting. It says no more than that.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launch, logicPage, here, waitForRoom } from './lib.mjs';

const SK = ['sharp', 'average', 'clumsy'];
const OUT = join(here, 'plan-fits.json');
export const ROWS = {
  poses: [[0, { noBreath: true }, [95, 66, 54]], [1, { noBreath: true }, [74, 58, 46]], [2, { noBreath: true }, [55, 41, 33]], [0, { breathAuto: true }, [100, 91, 78]], [1, { breathAuto: true }, [100, 85, 71]], [2, { breathAuto: true }, [96, 62, 57]]],
  stillWater: [[0, null, [100, 95, 80]], [1, null, [86, 71, 48]], [2, null, [62, 49, 31]]],
  plank: [[0, null, [80, 62, 53]], [1, null, [62, 51, 53]], [2, null, [54, 48, 50]]],
  cairn: [[1, { noBreath: true }, [5.3, 4.8, 2]], [1, { breathAuto: true }, [8, 8, 6.3]], [2, { breathAuto: true }, [10, 5.8, 1.5]], [2, { noBreath: true }, [1.3, 1, 2]]],
  grandHold: [[0, null, [99, 70, 37]]],
  roomService: [[0, { braceK: 0.2, braceEarly: true }, [5, 5, 5]], [0, { braceK: 0 }, [3.5, 2.5, 4]], [1, { braceK: 0.2, braceEarly: true }, [3.8, 4, 4.5]], [2, { braceK: 0.2, braceEarly: true }, [2, 4, 3.5]]],
  springboard: [[0, { spinAt: 0.5, tryDive: false }, [85, 68, 45]], [0, { spinAt: 1, tryDive: false }, [43, 35, 13]]],
};
export const SCALE = { cairn: 10, roomService: 18 };
const FEEDBACK = (table) => { const out = []; for (const see of [0, 0.03, 0.05, 0.07, 0.09, 0.11, 0.13, 0.15]) for (const tremble of table.noise ? [0.85, 0.95, 1.05, 1.15, 1.25] : [1]) for (const noise of table.noise ? [table.noise, table.noise * 1.5] : [0]) out.push({ see, tremble, noise }); return out; };
const LOADED = (table) => { const out = []; for (const f of [0.7, 0.85, 1, 1.15, 1.3]) for (const g of [0.8, 1, 1.25]) out.push({ delay: +(table.delay * f).toFixed(3), gainLoad: +(table.gainLoad * g).toFixed(3) }); return out; };
const TABLE = { sharp: { delay: 0.16, gainLoad: 0.7, noise: 0 }, average: { delay: 0.26, gainLoad: 0.55, noise: 0.03 }, clumsy: { delay: 0.38, gainLoad: 0.45, noise: 0.07 } };
const CANDIDATES = {
  poses: FEEDBACK, stillWater: FEEDBACK, plank: FEEDBACK, cairn: LOADED, grandHold: LOADED, roomService: LOADED,
  springboard: () => [0.06, 0.1, 0.14, 0.18, 0.22, 0.26, 0.3, 0.36, 0.42, 0.5].map((stopErr) => ({ stopErr })),
};
export const SEEDS = { poses: [1, 2], stillWater: [1, 2], plank: [1, 2, 3], cairn: [1, 2, 3, 4], grandHold: [1, 2], roomService: [1, 2, 3], springboard: [1, 2, 3, 4, 5, 6, 7, 8] };

export const measure = (page, o) => page.evaluate((o) => {
  const T = window.__TEST__, g = T.game;
  g.save.settings.autoBreathe = false; T.setSeed(o.seed); T.startEvent(o.id, o.tier, {});
  const ev = g.currentEvent, l = ev.lanes[0];
  if (o.setup) Object.assign(l, o.setup);
  if (o.id === 'roomService') ev.cfg = { ...ev.cfg, gary: false };
  if (o.fit && o.fit.stopErr !== undefined) l.stopErr = o.fit.stopErr;
  T.bot(o.skill);
  let t = 0, set = false;
  while (t < 140 && !ev.isDone()) {
    T.advance(0.25); t += 0.25;
    if (!set && l.testBot) { l.testBot.s = { ...l.testBot.s, ...(o.fit || {}) }; set = true; }
  }
  T.bot(null);
  const r = ev.laneResult(l);
  const x = o.id === 'stillWater' ? 100 * ev.inT / Math.max(1, Math.min(ev.t, ev.cfg.time))
    : o.id === 'plank' ? 100 * ev.inT / ev.cfg.time
    : o.id === 'grandHold' ? 100 * ev.lastIn / Math.max(1, ev.lastT)
    : o.id === 'cairn' ? l.onSlab
    : o.id === 'roomService' ? l.tumblers.filter((q) => q.on).length
    : o.id === 'springboard' ? 100 * l.dives.filter((d) => d.kind === 'Splash').length / Math.max(1, l.dives.length)
    : r.form;
  T.goto('menu');
  return x;
}, o);

// The same bots on keys: a person holds a key until the ring is about where they want it.
export const measureKeys = (page, o) => page.evaluate((o) => {
  const T = window.__TEST__, g = T.game;
  g.save.settings.autoBreathe = false; T.setSeed(o.seed); T.startEvent(o.id, o.tier, {});
  const ev = g.currentEvent, l = ev.lanes[0];
  if (o.setup) Object.assign(l, o.setup);
  T.bot(o.skill);
  const down = new Set();
  const key = (code, on) => { if (on === down.has(code)) return; if (on) down.add(code); else down.delete(code); window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code })); };
  const orig = g.beforePoll;
  let set = false;
  g.beforePoll = (dt) => {
    orig(dt);
    const p = window.__pads[0];
    if (!p) return;
    if (!set && l.testBot) { set = true; l.testBot.s = { ...l.testBot.s, ...(o.fit || {}) }; }
    const m = Math.hypot(p.axes[0], p.axes[1]), k = m > 0.08 ? (m - 0.08) / (0.92 * m) : 0;
    const ax = p.axes[0] * k, az = p.axes[1] * k, v = p.buttons.map((b) => b.value);
    p.axes[0] = 0; p.axes[1] = 0; for (const b of p.buttons) { b.pressed = false; b.value = 0; }
    const i = g.input, dx = ax - i.ringX, dz = az - i.ringZ, band = (o.fit && o.fit.band) || 0.05;
    key('KeyD', dx > band); key('KeyA', dx < -band); key('KeyS', dz > band); key('KeyW', dz < -band);
    key('KeyF', v[2] > 0.5); key('ShiftLeft', v[5] > 0.5);
  };
  let t = 0;
  while (t < 140 && !ev.isDone()) { T.advance(0.5); t += 0.5; }
  g.beforePoll = orig;
  for (const c of [...down]) key(c, false);
  T.bot(null);
  const x = o.id === 'stillWater' ? 100 * ev.inT / Math.max(1, Math.min(ev.t, ev.cfg.time)) : ev.laneResult(l).form;
  T.goto('menu');
  return x;
}, o);
export const KEY_ROWS = [['poses', 0, { noBreath: true }, [98, 62, 54]], ['poses', 1, { noBreath: true }, [86, 58, 34]], ['stillWater', 0, null, [100, 85, 28]]];
// Plate Spinners on keys: alternate A and D at the band's tapping speed.
export const measurePlates = (page, o) => page.evaluate((o) => {
  const T = window.__TEST__;
  T.setSeed(o.seed); T.startEvent('plates', o.tier, {});
  const ev = T.game.currentEvent, l = ev.lanes[0];
  const tap = (k) => { window.dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k })); window.dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k })); };
  const R = { L: 1.35, M: 2.3, S: 3.2 };
  let next = 0.1, side = 'KeyA', t = 0, target = null, wait = 0, x = 12345 + o.seed * 77;
  const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  while (!ev.isDone() && t < 70) {
    wait -= 1 / 120;
    if (wait <= 0) {
      wait = o.react;
      const low = l.plates.filter((p) => p.state === 'on').sort((a, b) => a.energy - b.energy)[0];
      const was = target;
      if (!target || target.state !== 'on' || target.energy > o.full || (low && low.energy < o.alarm)) target = low;
      if (target && target !== was) next = Math.min(next, 1 / R[target.size]);
    }
    next -= 1 / 120;
    if (next <= 0) { tap(side); side = side === 'KeyA' ? 'KeyD' : 'KeyA'; next = (1 / R[target ? target.size : 'M']) * (1 + (rnd() - 0.5) * o.jitter) + (rnd() < o.slips ? 0.5 : 0); }
    T.advance(1 / 120); t += 1 / 120;
  }
  const share = 100 * ev.laneResult(l).raw;
  T.goto('menu');
  return share;
}, o);
export const PLATE_ROWS = [[97, 84, 76], [91, 79, 74], [79, 66, 60]];

if (process.argv[1].endsWith('fit-bots.mjs') && process.argv[2] === 'keys') {
  const fits = JSON.parse(readFileSync(OUT, 'utf8'));
  const browser = await launch();
  let page = await logicPage(browser);
  fits.keys = fits.keys || {}; fits.plateKeys = {}; fits.roomBare = fits.roomBare || {};
  const gains = { sharp: [1, 1.2], average: [0.4, 0.55, 0.8, 1], clumsy: [0.45, 0.6, 0.8, 1] };
  for (let i = 0; i < 3; i++) {
    const skill = SK[i];
    await waitForRoom(3);
    let best = null;
    for (const gain of gains[skill]) for (const see of [0, 0.05, 0.1]) for (const band of [0.05, 0.09, 0.13, 0.17]) for (const tremble of i ? [0.95, 1.1, 1.25] : [1]) {
      const fit = { gain, see, tremble, band }; let err = 0; const got = [];
      for (const [id, tier, setup, plan] of KEY_ROWS) { let s = 0; for (const seed of [1, 2]) s += await measureKeys(page, { id, tier, setup, skill, seed, fit }); const v = s / 2; got.push(+v.toFixed(0)); err += Math.abs(v - plan[i]); }
      err /= KEY_ROWS.length;
      if (!best || err < best.err) best = { err: +err.toFixed(1), fit, got };
    }
    fits.keys[skill] = best.fit;
    console.log(`on keys ${skill.padEnd(8)} err ${String(best.err).padEnd(5)} ${JSON.stringify(best.fit).padEnd(52)} got ${best.got.join(' / ')}  plan ${KEY_ROWS.map((r) => r[3][i]).join(' / ')}`);
    await page.context().close(); page = await logicPage(browser);
    await waitForRoom(3);
    let bestP = null;
    for (const full of [0.6, 0.75, 0.9]) for (const alarm of [0.15, 0.25, 0.35, 0.45]) for (const react of [0.06, 0.12, 0.25, 0.5]) for (const [jitter, slips] of [[0.02, 0], [0.06, 0.005], [0.2, 0.02], [0.3, 0.03], [0.4, 0.05], [0.55, 0.08]]) {
      const fit = { full, alarm, react, jitter, slips }; let err = 0; const got = [];
      for (let t = 0; t < 3; t++) { let s = 0; for (const seed of [1, 2]) s += await measurePlates(page, { tier: t, seed, ...fit }); const v = s / 2; got.push(+v.toFixed(0)); err += Math.abs(v - PLATE_ROWS[t][i]); }
      err /= 3;
      if (!bestP || err < bestP.err) bestP = { err: +err.toFixed(1), fit, got };
    }
    fits.plateKeys[skill] = bestP.fit;
    console.log(`plates  ${skill.padEnd(8)} err ${String(bestP.err).padEnd(5)} ${JSON.stringify(bestP.fit).padEnd(60)} got ${bestP.got.join(' / ')}  plan ${PLATE_ROWS.map((r) => r[i]).join(' / ')}`);
    await page.context().close(); page = await logicPage(browser);
    await waitForRoom(3);
    // Room Service without a brace was measured on its own, so it gets its own fit.
    let bestR = null;
    for (const f of [0.85, 1, 1.15, 1.3, 1.5]) for (const g of [0.3, 0.45, 0.6, 0.8, 1]) {
      const fit = { delay: +(TABLE[skill].delay * f).toFixed(3), gainLoad: +(TABLE[skill].gainLoad * g).toFixed(3) };
      let s = 0; for (const seed of [1, 2, 3, 4, 5, 6]) s += await measure(page, { id: 'roomService', tier: 0, setup: { braceK: 0 }, skill, seed, fit });
      const v = s / 6, err = Math.abs(v - [3.5, 2.5, 4][i]);
      if (!bestR || err < bestR.err) bestR = { err: +err.toFixed(2), fit, v: +v.toFixed(2) };
    }
    fits.roomBare[skill] = bestR.fit;
    console.log(`bare    ${skill.padEnd(8)} err ${String(bestR.err).padEnd(5)} ${JSON.stringify(bestR.fit).padEnd(40)} got ${bestR.v}  plan ${[3.5, 2.5, 4][i]}`);
    writeFileSync(OUT, `${JSON.stringify(fits, null, 1)}\n`);
    await page.context().close(); page = await logicPage(browser);
  }
  await page.context().close();
  await browser.close();
  console.log('FIT DONE');
  process.exit(0);
}
if (process.argv[1].endsWith('fit-bots.mjs')) {
  const only = process.argv.slice(2);
  const fits = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const browser = await launch();
  let page = await logicPage(browser);
  for (const id of Object.keys(ROWS)) {
    if (only.length && !only.includes(id)) continue;
    fits[id] = fits[id] || {};
    for (let i = 0; i < 3; i++) {
      const skill = SK[i];
      await waitForRoom(3);
      let best = null;
      for (const fit of CANDIDATES[id](TABLE[skill])) {
        let err = 0; const got = [];
        for (const [tier, setup, plan] of ROWS[id]) {
          let s = 0;
          for (const seed of SEEDS[id]) s += await measure(page, { id, tier, setup, skill, seed, fit });
          const v = s / SEEDS[id].length; got.push(+v.toFixed(1)); err += Math.abs(v - plan[i]) * (SCALE[id] || 1);
        }
        err /= ROWS[id].length;
        if (!best || err < best.err) best = { err: +err.toFixed(1), fit, got };
      }
      fits[id][skill] = best.fit;
      console.log(`${id.padEnd(12)} ${skill.padEnd(8)} err ${String(best.err).padEnd(5)} ${JSON.stringify(best.fit).padEnd(48)} got ${best.got.join(' / ')}  plan ${ROWS[id].map((r) => r[2][i]).join(' / ')}`);
      writeFileSync(OUT, `${JSON.stringify(fits, null, 1)}\n`);
      await page.context().close(); page = await logicPage(browser);
    }
  }
  await page.context().close();
  await browser.close();
  console.log('FIT DONE');
}
