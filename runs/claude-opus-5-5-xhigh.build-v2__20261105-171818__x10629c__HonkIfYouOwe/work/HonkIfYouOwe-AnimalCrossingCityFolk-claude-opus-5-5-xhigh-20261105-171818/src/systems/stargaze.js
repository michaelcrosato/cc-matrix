// The Lookout bench at night: the camera glides up until the sky comes down over the town.
// Press on a shooting star to wish. Mark a constellation here, then name it in the Almanac.
import { THREE, Timeline } from '../engine.js';
import { drawText } from '../ui/draw.js';
import { sendMail } from './mail.js';
import { remember } from './memory.js';

export const CONSTELLATIONS = [
  { id: 'book', name: 'The Overdue Library Book', suggest: ['The Fine Keeps Growing', 'Chapter Nine, Probably', 'Due Back Tuesday'], stars: [[60, 50], [100, 44], [104, 74], [64, 80], [60, 50]] },
  { id: 'spoon', name: 'The Big Spoon', suggest: ['The Little Ladle', 'Second Helpings', 'The Spoon I Lost'], stars: [[160, 40], [176, 52], [190, 64], [204, 78], [226, 76], [230, 96], [208, 100], [204, 78]] },
  { id: 'gander', name: 'The Ledger', suggest: ['Seven Percent', 'The Balance Owing', 'Mrs. Gander Is Watching'], stars: [[280, 40], [320, 40], [320, 80], [280, 80], [280, 40], [320, 60], [280, 60]] },
  { id: 'trundle', name: 'The Mayor, Eventually', suggest: ['A Hat, From Far Away', "Rocco's Good Side", 'Ask Me Next Year'], stars: [[380, 60], [396, 44], [412, 52], [408, 68], [392, 72], [380, 60], [352, 74]] },
  { id: 'bus', name: 'The Late Bus', suggest: ['Ten Minutes Late', 'Not In Service', 'The One I Just Missed'], stars: [[80, 130], [148, 130], [148, 158], [80, 158], [80, 130]] },
  { id: 'soup', name: "Tuesday's Bowl", suggest: ['Cold By Now', 'More Salt', "Wednesday's Bowl"], stars: [[250, 130], [264, 164], [306, 164], [320, 130]] },
];
/** What the player calls a constellation: their own name, or what people call it. */
export const starName = (w, c) => w.almanac.starNames[c.id] ?? c.name;
const STAR_FIELD = (() => { const out = []; let s = 7; for (let i = 0; i < 120; i++) { s = (s * 1664525 + 1013904223) >>> 0; const x = s % 480; s = (s * 1664525 + 1013904223) >>> 0; const y = s % 200; s = (s * 1664525 + 1013904223) >>> 0; out.push([x, y, s % 3]); } return out; })();
const GLIDE_UP = 2.4;
const GLIDE_DOWN = 1.6;
const LIFT_SCREENS = 1.4; // how many screen heights the camera rises
const TILT = 3.5; // how far the look-at point rises beyond that, so the camera also tips up
const PRESS_GUARD = 0.25; // the press that sat you down isn't the press that skips the glide
const SCREEN_H = 270;
const HORIZON_Y = 206;
const HAZE = [[170, 6], [179, 4], [188, 3], [197, 2]]; // [first row, every nth pixel] of light above the horizon
class StarScreen {
  constructor(g, onExit) { this.id = 'stargaze'; this.onExit = onExit; this.t = 0; this.next = 2 + ((g.world.clock.minute * 7) % 5); this.shooter = null; this.focus = 0; this.wishes = 0; this.rise = 0; this.glide = null; }
  open(g) {
    g.hideHud = true;
    g.fixedCam = true;
    g.engine.setCamera({ preset: 'fixed', minZoom: 1, maxZoom: 1 }, { syncUrl: false });
    const cam = g.ctx.camera.camera;
    cam.updateMatrixWorld();
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const p = cam.position;
    const target = [p.x + dir.x * 10, p.y + dir.y * 10, p.z + dir.z * 10];
    this.lift = (cam.top - cam.bottom) * LIFT_SCREENS;
    this.ground = { position: [p.x, p.y, p.z], target };
    this.sky = { position: [p.x, p.y + this.lift, p.z], target: [target[0], target[1] + this.lift + TILT, target[2]] };
    this.startGlide(this.ground, this.sky, GLIDE_UP);
  }
  close(g) { g.hideHud = false; g.releaseFixedCam(); this.onExit?.(); }
  startGlide(from, to, seconds, done = null) {
    this.glide = new Timeline({ shots: [{ at: 0, ...from }, { at: seconds, ...to }], bars: 0 });
    this.glide.play();
    this.glideAge = 0;
    this.glideDone = done;
  }
  stepGlide(g, inp, dt) {
    const tl = this.glide;
    this.glideAge += dt;
    const pressed = inp.confirm || inp.back || inp.mouse.click || inp.mouse.rclick;
    if (pressed && this.glideAge > PRESS_GUARD) tl.skip(); else tl.update(dt);
    const shot = tl.camera();
    const cam = g.ctx.camera.camera;
    cam.position.set(...shot.position);
    cam.lookAt(...shot.target);
    this.rise = Math.max(0, Math.min(1, (shot.position[1] - this.ground.position[1]) / this.lift));
    if (tl.ended) { this.rise = Math.round(this.rise); this.glide = null; this.glideDone?.(); }
  }
  labels() { return CONSTELLATIONS.map((c) => starName(this.g.world, c)); }
  focusIndex() { return this.focus; }
  update(g, inp, dt) {
    if (this.glide) { this.stepGlide(g, inp, dt); return; }
    this.t += dt;
    if (inp.nav.left) { this.focus = (this.focus + 5) % 6; g.sound('uiTick'); }
    if (inp.nav.right) { this.focus = (this.focus + 1) % 6; g.sound('uiTick'); }
    this.next -= dt;
    if (this.next <= 0 && !this.shooter) {
      const s = (g.world.clock.day * 131 + Math.floor(this.t * 37)) % 400;
      this.shooter = { x: 40 + s, y: 20 + (s % 60), vx: -180, vy: 90, life: 1.2 };
      this.next = 5 + (s % 7);
      g.sound('star');
      g.events.emit('shootingStar', {});
    }
    if (this.shooter) {
      const st = this.shooter;
      st.x += st.vx * dt; st.y += st.vy * dt; st.life -= dt;
      if (st.life <= 0) this.shooter = null;
    }
    if (inp.confirm || inp.mouse.click) {
      if (this.shooter) { this.wish(g); return; }
      this.markIt(g);
      return;
    }
    if (inp.back || inp.mouse.rclick) {
      g.sound('uiCancel');
      this.shooter = null;
      this.startGlide(this.sky, this.ground, GLIDE_DOWN, () => g.ui.pop(this));
    }
  }
  wish(g) {
    this.shooter = null;
    this.wishes++;
    g.sound('wish');
    g.world.stats.wishes += 1;
    const gifts = ['driftSpoon', 'gem', 'shellConch', 'moonRobe', 'starShades', 'mossyLamp', 'seasideLamp'];
    const gift = gifts[(g.world.stats.wishes + g.world.seed) % gifts.length];
    sendMail(g, { from: 'wish', body: 'Dear {player},\nWe got your wish. We have looked into it. Here is what we could do.\nA Passing Star', gift: gift === 'gem' ? 'driftBottle' : gift });
    remember(g, 'wish', {});
    g.events.emit('wished', { gift });
    g.ui.toastMsg('You wished. Check the post in the morning.');
  }
  markIt(g) {
    const c = CONSTELLATIONS[this.focus];
    const w = g.world;
    if (!w.almanac.stars[c.id]) { w.almanac.stars[c.id] = true; g.sound('star'); g.ui.toastMsg(`You found ${starName(w, c)}. Name it in the Almanac.`); g.events.emit('constellation', { id: c.id }); }
    else g.sound('uiTick');
  }
  prompts() {
    if (this.glide) return null;
    return this.shooter ? [['confirm', 'WISH!'], ['back', 'Stand up']] : [['confirm', 'Mark it'], ['back', 'Stand up']];
  }
  draw(g, hud) {
    // The sky is one sheet that comes down from the top of the screen as the camera rises.
    const off = Math.round((1 - this.rise) * SCREEN_H);
    if (off >= SCREEN_H) return;
    const fill = (x, y, w, h, col) => { const top = Math.max(0, y - off), bottom = y + h - off; if (bottom > top) hud.rect(x, top, w, bottom - top, col); };
    fill(0, 0, 480, SCREEN_H, 'ink');
    for (const [first, every] of HAZE) for (let y = first; y < first + 9; y += 2) for (let x = (y >> 1) % every; x < 480; x += every) fill(x, y, 1, 1, 'night');
    for (const [x, y, k] of STAR_FIELD) fill(x, y, 1, 1, k === 0 ? 'white' : k === 1 ? 'mist' : 'sky');
    CONSTELLATIONS.forEach((c, i) => {
      const focused = i === this.focus;
      const known = g.world.almanac.stars[c.id];
      for (let k = 0; k < c.stars.length; k++) {
        const [x, y] = c.stars[k];
        fill(x - 1, y - 1, 3, 3, focused ? 'sand' : 'white');
        if ((focused || known) && k + 1 < c.stars.length) {
          const [x2, y2] = c.stars[k + 1];
          const n = Math.max(Math.abs(x2 - x), Math.abs(y2 - y));
          for (let j = 0; j < n; j += 3) fill(Math.round(x + ((x2 - x) * j) / n), Math.round(y + ((y2 - y) * j) / n), 1, 1, focused ? 'sand' : 'slate');
        }
      }
    });
    if (this.shooter) { const st = this.shooter; for (let i = 0; i < 12; i++) fill(Math.round(st.x - st.vx * 0.012 * i), Math.round(st.y - st.vy * 0.012 * i), 2, 2, i < 3 ? 'white' : 'sky'); }
    fill(0, HORIZON_Y, 480, SCREEN_H - HORIZON_Y, 'night');
    if (!this.glide) {
      const c = CONSTELLATIONS[this.focus];
      drawText(hud, 240, 214, g.world.almanac.stars[c.id] ? starName(g.world, c) : 'Which one is that, then?', { align: 'center', color: 'sand', scale: 1 });
      drawText(hud, 240, 228, 'Press when a shooting star goes past to make a wish.', { align: 'center', color: 'mist' });
    }
    // A dithered edge where the sky meets the town.
    if (off > 0) for (let row = 0; row < 6; row++) for (let x = row % 2; x < 480; x += row + 2) hud.rect(x, SCREEN_H - off + row, 1, 1, 'night');
  }
}
/** Sits there until the player stands up. The caller seats them first and stands them up after. */
export function* stargaze(g) {
  let watching = true;
  g.ui.push(new StarScreen(g, () => { watching = false; }));
  g.events.emit('stargaze', {});
  while (watching) yield;
}
