// CRACKMANIA garage (PLAN §5.9): a workshop (its own E.World3D made from a text level: brick walls, braziers, shelves,
// crates, barrels, a car lift) with the car on a turntable. Pick a car (locked ones show a silhouette and what opens
// them), then body and accent colours (24 swatches, or hue / saturation / light sliders), one of 8 patterns (3 free, 5
// at 100 coppers), the pattern's colour, the number, the rims, the helmet; lights on with Triangle. Saved per car
import { ctx, E, U } from '../ctx.js';
import { MENU_INPUT } from '../input.js';
import { drawCar, PATTERNS, SWATCHES, RIMS, DEFAULT_PAINT } from '../car/draw.js';
import { poseOf } from '../car/camera.js';
import { Focus, panel, rowItem, sliderItem, T1, T2, title, UI, toast, drawToasts, accent } from '../ui/kit.js';
import { promptBar } from '../ui/glyphs.js';
import { carSide, coin, lock } from '../ui/icons.js';
import * as C from '../modes/campaign.js';
import { CFG } from '../config.js';
const LEVEL = { rows: [
  '################',
  '#t.....SS.....t#',
  '#..............#',
  '#.c..........b.#',
  '#..............#',
  '#..............#',
  '#.b..........c.#',
  '#..............#',
  '#t.....kk.....t#',
  '################'], ground: 'tiles', colors: { base: '#8a8a92', dark: '#6a6a72', light: '#9a9aa2' }, side: 'brick', wallSide: 'brick',
  legend: { S: { shape: 'shelf', facing: Math.PI / 2 }, c: { shape: 'crate' }, b: { shape: 'barrel' }, k: { shape: 'bench', facing: -Math.PI / 2 } } };
const MODELS = ['coyote', 'pebble', 'moose'], NAMES = { coyote: 'COYOTE', pebble: 'PEBBLE', moose: 'MOOSE' }, NEED = { coyote: null, pebble: 'hedgerow', moose: 'frostpeak' };
const st = { world: null, focus: new Focus(), model: 'coyote', t: 0, lights: false, sub: null, sfocus: new Focus(), spin: 0, demo: false };
export const garageState = st;
export function makeGarage(game) {
  st.world = new E.World3D(game, { level: LEVEL, fog: false, sky: '#1a1420', ambient: ['#ffe8d0', '#3a3040', 2.2], torchLights: 4, torchShadows: 1, camera: { mode: 'fixed', near: 2 }, onDraw: w => draw3d(w), outlines: true });
  st.world.camera.mouseLook = false; return st.world;
}
const unlocked = m => !NEED[m] || C.envOpen(NEED[m]);
const paint = () => ctx.profile.p.paint[st.model] || (ctx.profile.p.paint[st.model] = JSON.parse(JSON.stringify(DEFAULT_PAINT[st.model])));
const save = () => ctx.profile.save();
const cyc = (L, v, d) => L[(L.indexOf(v) + d + L.length) % L.length] ?? L[0];
export const garageScene = {
  input: MENU_INPUT, touch: [], camera: { zoom: false },
  enter(d = {}) { if (!st.world) makeGarage(ctx.game); st.t = 0; st.sub = null; st.focus.reset(0); st.scroll = 0; st.model = MODELS.find(unlocked) || 'coyote'; ctx.music.play('paint'); ctx.session = null; st.demo = !!d.demo; ctx.game.input.consumeAll(); },
  update(dt) {
    const I = ctx.game.input; st.t += dt; st.spin += dt * .45; st.world.step(dt);
    if (st.demo) return;
    if (ctx.talk.update(dt)) return;
    if (I.pressed('secondary')) { st.lights = !st.lights; ctx.sound.sfx('tick'); }
    const vr = { W: ctx.game.W || 427, H: ctx.game.H || 240 };
    if (st.sub) { if (I.pressed('cancel')) { st.sub = null; ctx.sound.sfx('back'); save(); return; } st.sfocus.set(subItems(vr)); st.sfocus.update(dt, I); return; }
    if (I.pressed('cancel')) { save(); ctx.sound.sfx('back'); ctx.game.go('menu'); return; }
    st.focus.set(garageRows(vr)); st.focus.update(dt, I);
  },
  draw(r) {
    const W = st.world; W.draw(r);
    r.overlay(g => {
      const P = paint(), x = 12, w = Math.min(230, r.W * .45), h = 22, lockd = !unlocked(st.model); let y = 50;
      E.px.blend(g, .55, 'normal', () => E.px.rect(g, 0, 0, r.W, 44, '#05040a'));
      title(g, 'GARAGE', 14, 10, 2, ['#ffffff', '#ffe8b0', accent()], 'left'); T1(g, 'THE PAINT SHOP', 16, 30, UI.dim);
      coin(g, r.W - 70, 16); T2(g, String(ctx.profile.coppers), r.W - 60, 10, '#ffb070');
      if (st.demo) return;
      st.focus.set(garageRows(r)); g.save(); g.beginPath(); g.rect(0, 46, r.W, r.H - 74); g.clip(); st.focus.draw(g); g.restore(); g._c = null;
      if (lockd) { carSide(g, st.model, r.W * .7, r.H * .62, 3, '#000', true); lock(g, r.W * .7, r.H * .4, 3); }
      // the locked pattern note
      const pi = P.pattern | 0; if (!lockd && !(ctx.profile.p.patterns[pi] || ctx.profile.p.allUnlocked)) T1(g, 'PREVIEW · PRESS ' + ctx.game.input.label('confirm') + ' ON PATTERN TO BUY (100 ¢)', r.W * .7, r.H - 44, '#ffb070', 'center');
      if (st.sub) subPanel(g, r);
      promptBar(g, r, st.sub ? [['confirm', 'PICK'], ['cancel', 'BACK']] : [['confirm', 'SELECT'], ['left', 'CHANGE'], ['secondary', st.lights ? 'LIGHTS OFF' : 'LIGHTS ON'], ['cancel', 'BACK']]);
      drawToasts(g, r, 1 / 60);
    });
  }
};
function garageRows(r) {
  const P = paint(), x = 12, w = Math.min(230, r.W * .45), h = 22, lockd = !unlocked(st.model), top = 48; let y = top - (st.scroll || 0);
      const rows = [], row = (id, label, value, o = {}) => { rows.push(Object.assign({ id, x, y, w, h, label, value, draw: rowItem }, o)); y += h + 3; };
  const sw = (key) => (g2, q, foc) => { rowItem(g2, q, foc, 0, 0); E.px.rect(g2, q.x + q.w - 30, q.y + 4, 20, q.h - 8, '#1a1a22'); E.px.rect(g2, q.x + q.w - 29, q.y + 5, 18, q.h - 10, key === 'rims' ? RIMS[P.rims] : P[key]); };
  row('car', 'CAR', '◀ ' + NAMES[st.model] + ' ▶', { onLeft: () => { st.model = cyc(MODELS, st.model, -1); }, onRight: () => { st.model = cyc(MODELS, st.model, 1); }, onPick: () => { st.model = cyc(MODELS, st.model, 1); } });
  if (lockd) { row('lock', 'LOCKED: OPEN ' + NEED[st.model].toUpperCase(), '', { disabled: true }); }
  else {
    for (const [key, label] of [['body', 'BODY'], ['accent', 'ACCENT'], ['patternColor', 'PATTERN COLOUR'], ['helmet', 'HELMET']]) row(key, label, '', { draw: (g2, q, foc) => { rowItem(g2, q, foc, 0, 0); E.px.rect(g2, q.x + q.w - 30, q.y + 4, 20, q.h - 8, '#1a1a22'); E.px.rect(g2, q.x + q.w - 29, q.y + 5, 18, q.h - 10, P[key]); }, onLeft: () => { P[key] = cyc(SWATCHES, P[key], -1); save(); }, onRight: () => { P[key] = cyc(SWATCHES, P[key], 1); save(); }, onPick: () => openSwatches(key, label) });
    const pi = P.pattern | 0, have = !!ctx.profile.p.patterns[pi] || ctx.profile.p.allUnlocked;
    row('pattern', 'PATTERN', '◀ ' + PATTERNS[pi] + (have ? '' : ' 100¢') + ' ▶', { onLeft: () => { P.pattern = (pi + 7) % 8; save(); }, onRight: () => { P.pattern = (pi + 1) % 8; save(); }, onPick: () => { if (have) { P.pattern = (pi + 1) % 8; save(); return; } if (ctx.profile.spend(100)) { ctx.profile.p.patterns[pi] = true; save(); ctx.sound.sfx('unlock'); toast(PATTERNS[pi] + ' UNLOCKED', '#5ad06a'); } else { ctx.sound.sfx('error'); toast('NOT ENOUGH COPPERS', '#ff5a4a'); } } });
    row('number', 'NUMBER', '◀ ' + String(P.number).padStart(2, '0') + ' ▶', { onLeft: () => { P.number = (P.number + 99) % 100; save(); }, onRight: () => { P.number = (P.number + 1) % 100; save(); }, onPick: () => { P.number = (P.number + 10) % 100; save(); } });
    row('rims', 'RIMS', '', { draw: sw('rims'), onLeft: () => { P.rims = (P.rims + 5) % 6; save(); }, onRight: () => { P.rims = (P.rims + 1) % 6; save(); }, onPick: () => { P.rims = (P.rims + 1) % 6; save(); } });
    row('reset', 'DEFAULT PAINT', '', { onPick: () => { ctx.profile.p.paint[st.model] = JSON.parse(JSON.stringify(DEFAULT_PAINT[st.model])); save(); } });
  }
  y += 4; row('done', 'DONE', '', { onPick: () => { save(); ctx.game.go('menu'); } });
  const f = rows[st.focus.i], bot = r.H - 30; if (f && f.y + h > bot) st.scroll = (st.scroll || 0) + (f.y + h - bot); else if (f && f.y < top) st.scroll = Math.max(0, (st.scroll || 0) - (top - f.y));
  return rows;
}
function openSwatches(key, label) { st.sub = { key, label }; st.sfocus.i = Math.max(0, SWATCHES.indexOf(paint()[key])); ctx.game.input.consumeAll(); }
function subPanel(g, r) {
  const S = st.sub, x0 = r.W / 2 - 110, y0 = 54;
  panel(g, x0 - 8, y0 - 8, 236, 240, { border: accent() }); T2(g, S.label, r.W / 2, y0 - 4, '#ffffff', 'center');
  st.sfocus.set(subItems(r)); st.sfocus.draw(g);
}
function subItems(r) {
  const P = paint(), S = st.sub, x0 = r.W / 2 - 110, y0 = 54, cols = 6, sz = 28;
  const items = SWATCHES.map((c, i) => ({ id: 's' + i, x: x0 + (i % cols) * (sz + 8), y: y0 + 16 + Math.floor(i / cols) * (sz + 6), w: sz, h: sz, onPick: () => { P[S.key] = c; ctx.profile.save(); }, draw: (g2, q, foc) => { E.px.rect(g2, q.x - (foc ? 2 : 0), q.y - (foc ? 2 : 0), q.w + (foc ? 4 : 0), q.h + (foc ? 4 : 0), foc ? '#ffffff' : '#1a1a22'); E.px.rect(g2, q.x + 1, q.y + 1, q.w - 2, q.h - 2, c); if (P[S.key] === c) T1(g2, '✓', q.x + q.w / 2, q.y + 9, '#000', 'center'); } }));
  // hue, saturation and light sliders for a colour of your own
  const hsl = toHSL(P[S.key]), yy = y0 + 16 + 4 * (sz + 6) + 4;
  [['h', 'HUE', 0, 360], ['s', 'SATURATION', 0, 100], ['l', 'LIGHT', 0, 100]].forEach(([k, label, mn, mx], i) => items.push({ id: k, x: x0, y: yy + i * 26, w: 220, h: 22, label, val: Math.round(hsl[k]), min: mn, max: mx, def: mn, text: String(Math.round(hsl[k])), draw: sliderItem,
    onLeft: () => { hsl[k] = Math.max(mn, hsl[k] - (k === 'h' ? 10 : 5)); P[S.key] = fromHSL(hsl); }, onRight: () => { hsl[k] = Math.min(mx, hsl[k] + (k === 'h' ? 10 : 5)); P[S.key] = fromHSL(hsl); } }));
  return items;
}
function toHSL(hex) { const v = parseInt(hex.slice(1), 16), r = (v >> 16 & 255) / 255, g = (v >> 8 & 255) / 255, b = (v & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return { h, s: s * 100, l: l * 100 }; }
function fromHSL({ h, s, l }) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); const to = x => Math.round(x * 255).toString(16).padStart(2, '0'); return '#' + to(f(0)) + to(f(8)) + to(f(4)); }
function draw3d(w) {
  const pen = w.pen, t = ctx.game.real || 0, cx = 8 * 16, cy = 5 * 16;   // the turntable, engine units (the level's tiles are 16 units)
  const a = Math.PI / 2 + Math.sin(st.t * .2) * .35, d = 8.5, pos = [cx / U + Math.cos(a) * d, cy / U + Math.sin(a) * d, 3.2], lft = [Math.sin(a), -Math.cos(a)];
  const pose = poseOf(null, { pos, look: [cx / U + lft[0] * 2.6, cy / U + lft[1] * 2.6, .7], up: [0, 0, 1], fov: 55 }); w.camera.pose = pose; w.camera.fixed = pose; w.camera.target = { x: cx, y: cy, z: 0 };
  // the turntable and the car lift
  pen.at(cx, cy, 0, st.spin, U).box(0, 0, .06, 6, 6, .12, '#3a3a44');
  for (let i = 0; i < 8; i++) pen.box(Math.cos(i * Math.PI / 4) * 2.6, Math.sin(i * Math.PI / 4) * 2.6, .13, .3, .3, .02, '#ffd030');
  pen.at(cx - 70, cy + 32, 0, 0, U).box(0, -1.4, 1.2, .3, .3, 2.4, '#3a6ae8').box(0, 1.4, 1.2, .3, .3, 2.4, '#3a6ae8').box(0, 0, 1.6 + Math.sin(t * .6) * .3, 3.6, 3, .12, '#c8c8d0');
  const model = st.demo ? MODELS[Math.floor(st.t / 3.3) % 3] : st.model, C2 = CFG.cars[model], s = st.spin, f = [Math.cos(s), Math.sin(s), 0], r = [-Math.sin(s), Math.cos(s), 0];
  const paintD = st.demo ? Object.assign({}, ctx.profile.paint(model), { body: SWATCHES[Math.floor(st.t * 1.3) % 24], pattern: Math.floor(st.t) % 8 }) : ctx.profile.paint(model);
  const pose2 = { p: [cx / U, cy / U, C2.ride + .12], f, r, u: [0, 0, 1], steer: Math.sin(t * .8) * .3, spin: 0, lights: st.lights, brake: st.lights, t, d: [C2.ride, C2.ride, C2.ride, C2.ride] };
  if (unlocked(model) || st.demo) drawCar(pen, model, pose2, paintD); else drawCar(pen, model, pose2, { body: '#0a0a10', accent: '#0a0a10', pattern: 0, patternColor: '#0a0a10', number: 0, rims: 1, helmet: '#0a0a10' });
  pen.at();
}
