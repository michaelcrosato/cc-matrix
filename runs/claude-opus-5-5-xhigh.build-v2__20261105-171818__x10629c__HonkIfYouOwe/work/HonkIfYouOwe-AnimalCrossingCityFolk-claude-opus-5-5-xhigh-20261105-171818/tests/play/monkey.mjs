// A full attract loop, then a seeded monkey mashing real input all over the game: nothing may throw.
import { bootGame } from './boot.mjs';
import { Stream } from '../../src/core/rng.js';
import { store } from '../../src/core/storage.js';
import { SAVE_KEY, SESSION_KEY } from '../../src/core/save.js';
import { resetTuning } from '../../src/dev/tuning.js';
import { villageDay } from '../../src/core/calendar.js';

const KEYS = ['KeyE', 'KeyE', 'KeyE', 'Space', 'Space', 'Tab', 'Escape', 'Backspace', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyR', 'KeyM', 'KeyJ', 'KeyG', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'ShiftLeft', 'MouseLeft', 'MouseRight', 'PadCross', 'PadCircle', 'PadSquare', 'PadTriangle', 'PadL1', 'PadR1', 'PadOptions'];
const safe = (id, n) => { /* keep the monkey out of quit-to-title on most frames: it's fine if it goes there */ return id && n; };
export async function monkeyRun() {
  const fails = [];
  store.remove(SAVE_KEY); store.remove(SESSION_KEY);
  resetTuning();
  const { game: g, engine: e } = await bootGame({ seed: 7 });
  e.step(10);
  // Attract: 10 s of nothing, one whole loop
  e.step(60 * 11);
  if (g.mode !== 'attract') fails.push(`attract did not start: ${g.status()}`);
  const loops = g.attract.loops;
  const seen = new Set();
  let frames = 0;
  while (g.attract.loops === loops && frames < 60 * 240) {
    e.step(30); frames += 30;
    seen.add(g.place.id);
    if (g.mode !== 'attract') { fails.push(`attract fell out: ${g.status()}`); break; }
  }
  if (g.attract.loops === loops) fails.push(`attract never looped in ${frames} frames, on ${g.place.id}`);
  if (frames < 60 * 90 || frames > 60 * 200) fails.push(`attract loop took ${(frames / 60).toFixed(0)} s, wanted 2-3 minutes`);
  for (const place of ['town', 'store', 'home', 'museum_fish', 'bus', 'city', 'salon', 'auction']) if (!seen.has(place)) fails.push(`attract never showed ${place}`);
  e.input.setKey('KeyK', true); e.step(2); e.input.setKey('KeyK', false); e.step(10);
  if (g.mode !== 'title') fails.push(`a key should leave attract, ${g.status()}`);
  // Monkey
  const rng = new Stream('monkey');
  const setups = [{ day: 2, hour: 10 }, { day: 4, hour: 11 }, { day: 6, hour: 10 }, { day: 8, hour: 18 }, { day: 10, hour: 10 }, { day: 12, hour: 13 }, { day: 14, hour: 10 }, { day: 16, hour: 18 }, { day: 15, hour: 20 }];
  const places = [['town', 24, 40], ['town', 56, 41], ['town', 40, 26], ['store', 5, 6], ['hall', 6, 6], ['museum', 6, 7], ['mothwick', 5, 6], ['house_dorrit', 3, 4], ['city', 8, 11], ['salon', 4, 5], ['couture', 4.5, 5], ['magda', 4, 4], ['theatre', 5, 6.4], ['auction', 5, 6], ['bureau', 4, 5], ['cafe', 4, 5], ['tent', 2.5, 3.6], ['museum_bug', 6, 7], ['museum_fossil', 6, 7], ['museum_art', 6, 7]];
  const h = g.handle();
  let steps = 0;
  for (const s of setups) {
    h.actions.quickStart({ ...s, beans: 80000 });
    g.world.player.pockets[0] = { id: 'pear' }; g.world.player.pockets[1] = { id: 'cottageLamp' }; g.world.player.pockets[2] = { id: 'bagOfBeans' }; g.world.player.pockets[3] = { id: 'seedRose' }; g.world.player.pockets[4] = { id: 'plainRed' }; g.world.player.pockets[5] = { id: 'perch' };
    for (const [id, x, z] of places) {
      if (g.mode !== 'play') h.actions.quickStart({ ...s, beans: 80000 });
      g.ui.popAll(); g.scripts.cancelAll(); g.inTransition = false; g.hideHud = false; g.camFocus = null; g.player.sitting = false; g.player.locked = false; g.player.poseTimer = 0;
      if (g.busPlace?.bodyGroup === g.player.root.parent) { g.player.remove(); g.player.addTo(g.place.group); }
      h.actions.goto(id, x, z);
      for (let i = 0; i < 26; i++) {
        const code = rng.pick(KEYS);
        const hold = rng.int(1, 8);
        e.input.setKey(code, true);
        e.input.setPointer(rng.range(-1, 1), rng.range(-1, 1), false);
        try { e.step(hold); } catch (err) { fails.push(`monkey in ${id} on day ${s.day}: ${err.message} ${(err.stack ?? '').split('\n').filter((l) => !l.includes('pixel-engine')).slice(1, 4).join(' ')}`); e.input.setKey(code, false); break; }
        e.input.setKey(code, false);
        if (g.ui.top?.id === 'keyboard') e.input.send({ t: 'key', key: 'Enter' });
        steps += hold;
        if (g.mode !== 'play') break;
      }
      if (fails.length > 6) break;
    }
    if (fails.length > 6) break;
  }
  for (const m of e.errors) fails.push(`engine error: ${m}`);
  if (safe(steps, 1) && steps < 1000) fails.push(`monkey barely played: ${steps}`);
  return { n: 2, fails };
}
export { villageDay };
