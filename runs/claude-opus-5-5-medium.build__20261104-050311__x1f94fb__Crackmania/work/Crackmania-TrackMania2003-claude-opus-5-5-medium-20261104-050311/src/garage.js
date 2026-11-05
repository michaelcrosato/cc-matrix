// The garage: a workshop of its own (a text level: brick walls, shelves, barrels, a car lift and torches) with the car
// on a turntable. The paint shop: body, accent, pattern (3 free, 5 for coppers), pattern colour, number, rims, helmet.
import { CARS } from './config.js';
import { SWATCHES, PATTERNS, ENV_INFO } from './data.js';
import { drawCar, defaultPaint } from './view.js';
import { Focus, text, tw, big, panel, promptBar, coinIcon, lockIcon, COL } from './ui.js';
import { U } from './v3.js';
import { FRONT_INPUT } from './front.js';

const E = globalThis.My3D2dge, px = E.px;
const LEVEL = { rows: [
  '########################',
  '#t.....ss......ss.....t#',
  '#......................#',
  '#b....................c#',
  '#b....................c#',
  '#......................#',
  '#a....................r#',
  '#......................#',
  '#b....................c#',
  '#......................#',
  '#t....................t#',
  '#......................#',
  '#......................#',
  '########################'],
  legend: { s: { shape: 'shelf', facing: Math.PI / 2 }, b: { shape: 'barrel' }, c: { shape: 'crate' }, a: { shape: 'anvil' }, r: { shape: 'bench', facing: Math.PI } },
  ground: 'tiles', side: 'brick', colors: { base: '#6a6a72', dark: '#4a4a52', light: '#8a8a92' } };
const CAR_ORDER = ['coyote', 'pebble', 'moose'], CX = 12, CY = 6.5;
export function garageScene(app) {
  const game = app.game, F = new Focus(game);
  let world = null, S = { car: 'coyote', ang: 0, lights: false, t: 0 };
  const P = () => app.profile;
  const paint = () => P().data.paint[S.car] || (P().data.paint[S.car] = defaultPaint(S.car));
  const carOpen = id => id === 'coyote' || P().envOpen(CARS[id].env);
  function build() {
    if (app.headless) return;
    world = new E.World3D(game, { level: LEVEL, sky: '#1a1420', fog: false, ambient: ['#c8b8a8', '#3a3040', 2.2], torchLights: 4, torchShadows: 1, camera: { mode: 'fixed', mouseLook: false }, sun: { color: '#ffe8c8', intensity: 1.2, dir: [-.3, .5, -.8], area: 200 } });
    world.camera.mouseLook = false; world.prepare();
  }
  const ROWS = [
    ['car', 'CAR'], ['body', 'BODY'], ['accent', 'ACCENT'], ['pattern', 'PATTERN'], ['pcol', 'PATTERN COLOUR'], ['number', 'NUMBER'], ['rims', 'RIMS'], ['helmet', 'HELMET'], ['done', 'DONE']
  ];
  function change(id, k) {
    const p = paint();
    if (id === 'car') { let i = CAR_ORDER.indexOf(S.car); i = (i + k + 3) % 3; S.car = CAR_ORDER[i]; }
    else if (['body', 'accent', 'pcol', 'helmet', 'rims'].includes(id)) { let i = SWATCHES.indexOf(p[id]); if (i < 0) i = 0; p[id] = SWATCHES[(i + k + SWATCHES.length) % SWATCHES.length]; }
    else if (id === 'pattern') p.pattern = (p.pattern + k + PATTERNS.length) % PATTERNS.length;
    else if (id === 'number') p.number = (p.number + k + 100) % 100;
    game.audio.sfx('ui_move'); P().save();
  }
  function enter() { app.music('garage'); S.t = 0; app.race = null; }
  function update(dt) {
    S.t += dt; S.ang += dt * .5;
    if (app.devOpen) { app.dev.update(dt); return; }
    const I = game.input, p = paint();
    const items = ROWS.map(([id, label], i) => ({ id, label, x: 8, y: 30 + i * 20, w: 200, h: 18, draw: (g, it, f) => row(g, it, f) }));
    F.set(items, true);
    F.update(dt, { noLR: true });
    const cur = F.cur && F.cur.id;
    if (I.repeat('left', .3, .1)) change(cur, -1); if (I.repeat('right', .3, .1)) change(cur, 1);
    if (I.pressed('confirm')) {
      if (cur === 'done') return leave();
      if (cur === 'pattern' && !P().hasPattern(p.pattern)) { if (P().buyPattern(p.pattern, 100)) { game.audio.sfx('coin'); game.note(PATTERNS[p.pattern] + ' BOUGHT', 1.5); } else { game.audio.sfx('ui_err'); game.note('NOT ENOUGH COPPERS', 1.5); } }
      else change(cur, 1);
    }
    if (I.pressed('alt')) S.lights = !S.lights;
    if (I.pressed('cancel')) leave();
    if (world) { world.camera.set('fixed'); world.camera.fixed = camAt(.4); world.step(dt); }
  }
  function leave() {
    // a locked pattern isn't kept
    const p = paint(); if (!P().hasPattern(p.pattern)) p.pattern = 0; if (!carOpen(S.car)) S.car = 'coyote';
    P().save(); app.modes.toMenu('main');
  }
  function row(g, it, f) {
    const p = paint(), id = it.id;
    panel(g, it.x, it.y, it.w, it.h, { accent: f ? '#ffffff' : '#3a4a7a', bg: f ? ['#34447a', '#1c2648'] : ['#1c2440', '#121830'] });
    E.font.text(g, it.label, it.x + 5, it.y + 5, f ? '#ffffff' : COL.dim, { outline: '#10101a' });
    const vx = it.x + 92;
    if (id === 'car') E.font.text(g, '< ' + CARS[S.car].name + (carOpen(S.car) ? '' : ' (LOCKED)') + ' >', vx, it.y + 5, carOpen(S.car) ? '#ffd23a' : '#8a8aa0', { outline: '#10101a' });
    else if (['body', 'accent', 'pcol', 'helmet', 'rims'].includes(id)) { px.rect(g, vx, it.y + 3, 60, 12, '#10101a'); px.rect(g, vx + 1, it.y + 4, 58, 10, p[id]); E.font.text(g, '< >', vx + 66, it.y + 5, '#ffffff', { outline: '#10101a' }); }
    else if (id === 'pattern') { const own = P().hasPattern(p.pattern); E.font.text(g, '< ' + PATTERNS[p.pattern] + ' >', vx, it.y + 5, own ? '#ffffff' : '#ffb060', { outline: '#10101a' }); if (!own) { lockIcon(g, it.x + it.w - 14, it.y + 2); } }
    else if (id === 'number') E.font.text(g, '< ' + String(p.number).padStart(2, '0') + ' >', vx, it.y + 5, '#ffffff', { outline: '#10101a' });
  }
  function draw(r) {
    if (world) {
      const p = carOpen(S.car) ? paint() : Object.assign({}, paint(), { body: '#202024', accent: '#202024', pcol: '#202024', number: null });
      const a = S.ang, f = [Math.cos(a), Math.sin(a), 0], rr = [-Math.sin(a), Math.cos(a), 0];
      world.pen.at(CX * 16, CY * 16, 0, 0, 16).tube(0, 0, 0, 0, 0, .15, 3.2, '#5a5a62').tube(0, 0, .15, 0, 0, .2, 3, '#ffd23a');
      const C = CARS[S.car];
      drawCar(world.pen, S.car, { p: [CX, CY, C.ride + .2], f, r: rr, u: [0, 0, 1], wd: [C.ride, C.ride, C.ride, C.ride], lights: S.lights, brake: S.lights, time: S.t }, p);
      world.draw(r);
    }
    r.overlay(g => {
      const W = r.W, H = r.H;
      big(g, 'GARAGE', W / 2 + 70, 8, '#ffffff', 2);
      coinIcon(g, W - 90, H - 60); text(g, String(P().coppers), W - 74, H - 60, '#f0a050');
      F.draw(g);
      const p = paint(); if (F.cur && F.cur.id === 'pattern' && !P().hasPattern(p.pattern)) E.font.text(g, 'PRESS ' + (game.input.label('confirm') || 'ENTER') + ' TO BUY FOR 100 COPPERS', 12, H - 48, '#ffb060', { outline: '#10101a' });
      if (!carOpen(S.car)) E.font.text(g, 'OPEN ' + (S.car === 'pebble' ? 'HEDGEROW' : 'FROSTPEAK') + ' IN RACE TO DRIVE THE ' + CARS[S.car].name, 12, H - 48, '#ffb060', { outline: '#10101a' });
      promptBar(g, game, [['up', 'CHOOSE'], ['left', 'CHANGE'], ['alt', 'LIGHTS'], ['cancel', 'DONE']]);
      if (app.devOpen) app.dev.draw(g, W, H);
    });
  }
  // the attract mode's segment: the three cars spin through paint jobs
  // the camera stands south of the car, a little to its left, looking past it so the car sits right of the menu
  function camAt(k) { const cx = CX * 16 - 40, cy = CY * 16 + 118, tx = CX * 16 - 48 * k, ty = CY * 16; return { x: cx, y: cy, z: 50, yaw: Math.atan2(ty - cy, tx - cx), pitch: -.26, fov: 50 }; }
  function showcaseStep(dt, t) { S.ang += dt * .8; if (world) { world.camera.set('fixed'); world.camera.fixed = camAt(0); world.step(dt); } }
  function showcaseDraw(r, t) {
    if (!world) return;
    const id = CAR_ORDER[Math.floor(t / 3.4) % 3], k = Math.floor(t * 1.5), C = CARS[id], a = S.ang;
    const p = Object.assign(defaultPaint(id), { body: SWATCHES[k % 24], accent: SWATCHES[(k * 7 + 3) % 24], pattern: k % 8, pcol: SWATCHES[(k * 5 + 10) % 24], number: (k * 13) % 100 });
    world.pen.at(CX * 16, CY * 16, 0, 0, 16).tube(0, 0, 0, 0, 0, .15, 3.2, '#5a5a62').tube(0, 0, .15, 0, 0, .2, 3, '#ffd23a');
    drawCar(world.pen, id, { p: [CX, CY, C.ride + .2], f: [Math.cos(a), Math.sin(a), 0], r: [-Math.sin(a), Math.cos(a), 0], u: [0, 0, 1], wd: [C.ride, C.ride, C.ride, C.ride], lights: true, time: t }, p);
    world.draw(r);
  }
  return { showcaseStep, showcaseDraw, pausable: true, input: FRONT_INPUT, touch: [], camera: false, build, enter, update, draw };
}
