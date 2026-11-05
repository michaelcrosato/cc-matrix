// ---- art: the landscape, the trees and the animals, drawn in code with the engine's pixel primitives ------------------
// Coordinates here are normalized: x and y are fractions of the screen (0..1), so the picture fills any shape of
// screen. The horizon is at y = HORIZON; an animal's foot y runs from the horizon (far) to the bottom (near).
const HORIZON = .5;
const footY = d => HORIZON + .42 * d;          // depth d: 0 far, 1 near
const hFrac = (d, sz) => (.085 + .24 * d) * sz; // a body's height as a fraction of the screen height

// ---- the world of one hunt: its trees, rocks and cattails, generated from a fixed seed so every run looks the same
function buildWorld(hunt, index) {
  const rng = mulberry(101 + index * 37);
  const trees = [];
  const n = hunt.id === 'muskeg' ? 50 : 60;
  for (let i = 0; i < n; i++) {
    const d = Math.pow(rng(), .7);
    const kinds = hunt.id === 'hollow' ? ['broad', 'broad', 'pine', 'aspen'] : hunt.id === 'ridge' ? ['pine', 'pine', 'aspen'] : ['pine', 'pine', 'tamarack'];
    trees.push({ x: rng(), d, kind: kinds[Math.floor(rng() * kinds.length)], s: .8 + rng() * .5,
      c: hunt.treeMix[Math.floor(rng() * hunt.treeMix.length)] });
  }
  trees.sort((a, b) => a.d - b.d);
  const peaks = [];
  for (let i = 0; i <= 14; i++) peaks.push({ x: i / 14, h: .1 + rng() * .14 });
  return { trees, peaks, rocks: Array.from({ length: 14 }, () => ({ x: rng(), d: .1 + rng() * .8, s: .6 + rng() * .8 })) };
}

function paintSky(g, W, H, hunt) {
  const [top, mid, low] = hunt.sky;
  const hz = Math.round(H * HORIZON);
  for (let y = 0; y < hz; y++) {
    const t = y / hz;
    const c = t < .6 ? E.mix(top, mid, t / .6) : E.mix(mid, low, (t - .6) / .4);
    E.px.rect(g, 0, y, W, 1, c);
  }
  if (hunt.sun) E.px.blend(g, .35, 'add', () => E.px.disc(g, hunt.sun.x * W, hunt.sun.y * H, hunt.sun.r * H * 2.4, hunt.sun.c));
  if (hunt.sun) E.px.disc(g, hunt.sun.x * W, hunt.sun.y * H, hunt.sun.r * H, hunt.sun.c);
}

function paintMountains(g, W, H, hunt, world) {
  const hz = H * HORIZON;
  const pts = [[0, hz]];
  for (const p of world.peaks) pts.push([p.x * W, hz - p.h * H]);
  pts.push([W, hz]);
  E.px.poly(g, pts, hunt.hills[0]);
  if (hunt.snowCaps) {
    for (const p of world.peaks) if (p.h > .16) E.px.poly(g, [[p.x * W - H * .05, hz - p.h * H + H * .06], [p.x * W, hz - p.h * H], [p.x * W + H * .05, hz - p.h * H + H * .06]], '#f3e6ff');
  }
  const pts2 = [[0, hz]];
  for (let i = 0; i <= 20; i++) pts2.push([i / 20 * W, hz - H * (.03 + .03 * Math.sin(i * 1.7 + hunt.id.length))]);
  pts2.push([W, hz]);
  E.px.poly(g, pts2, hunt.hills[1]);
}

function paintTree(g, W, H, tr, hunt) {
  const d = tr.d, x = tr.x * W, base = footY(d) * H, s = tr.s * H * (.07 + .25 * d);
  if (s < 2) return;
  if (tr.kind === 'pine' || tr.kind === 'tamarack') {
    const c = tr.kind === 'tamarack' ? tr.c : hunt.pine;
    ln(g, x, base, x, base - s * .3, '#3a2a1e', Math.max(1, s * .08));
    for (let k = 0; k < 3; k++) {
      const top = base - s * (.3 + k * .3), w = s * (.42 - k * .08);
      E.px.poly(g, [[x, top - s * .42], [x - w, top], [x + w, top]], c);
    }
  } else if (tr.kind === 'aspen') {
    E.px.rect(g, x - s * .04, base - s, Math.max(1, s * .08), s, '#e8e0d0');
    E.px.ell(g, x, base - s * .9, s * .28, s * .26, tr.c);
  } else {
    E.px.rect(g, x - s * .05, base - s * .6, Math.max(1, s * .1), s * .6, '#4a3424');
    E.px.disc(g, x, base - s * .8, s * .34, tr.c);
    E.px.disc(g, x - s * .15, base - s * .95, s * .2, E.mix(tr.c, '#ffffff', .15));
  }
}

function ln(g, x0, y0, x1, y1, c, w = 1) { E.px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), c, Math.max(1, Math.round(w))); }

function paintLand(g, W, H, hunt, world, t) {
  paintSky(g, W, H, hunt);
  paintMountains(g, W, H, hunt, world);
  const hz = Math.round(H * HORIZON);
  // ground: two grass tones in bands, nearer = darker
  for (let y = hz; y < H; y++) {
    const k = (y - hz) / (H - hz);
    E.px.rect(g, 0, y, W, 1, E.mix(hunt.grass[0], hunt.grass[1], k));
  }
  // the creek or the lake, with its riffles
  const wy = H * (.66 + .02 * Math.sin(t * .5));
  E.px.poly(g, [[0, wy], [W * .3, wy - H * .02], [W * .6, wy + H * .01], [W, wy - H * .015], [W, H], [0, H]], hunt.water);
  for (let i = 0; i < 9; i++) {
    const x = ((i * .119 + t * .01) % 1) * W, y = wy + H * (.02 + (i % 3) * .02);
    ln(g, x, y, x + W * .04, y, hunt.riffle, 1);
  }
  // far trees, then the fog that sits over them
  for (const tr of world.trees) if (tr.d < .55) paintTree(g, W, H, tr, hunt);
  if (hunt.fog) E.px.blend(g, hunt.fog * .55, 'normal', () => E.px.rect(g, 0, hz - H * .04, W, H * .09, hunt.fogColor));
  for (const tr of world.trees) if (tr.d >= .55 && tr.d < .9 && tr.x > .0) paintTree(g, W, H, tr, hunt);
}

function paintFrontTrees(g, W, H, hunt, world) {
  for (const tr of world.trees) if (tr.d >= .9) paintTree(g, W, H, tr, hunt);
  if (hunt.fog) E.px.blend(g, hunt.fog * .25, 'normal', () => E.px.rect(g, 0, H * .72, W, H * .28, hunt.fogColor));
}

// ---- animal rigs: each one drawn from pixels, facing its direction of travel (dir +1 = right, nose at the right)
function antlers(g, bx, by, h, f, pts, c, t) {
  const side = pts >= 8 ? 4 : 3;
  for (const s of [-1, 1]) {
    const bx0 = bx + f * s * h * .04, tipX = bx + f * h * (.02 + s * .08), tipY = by - h * .55;
    ln(g, bx0, by, tipX, tipY, c, Math.max(1, h * .05));
    for (let k = 1; k <= side; k++) {
      const p = k / (side + 1), px0 = bx0 + (tipX - bx0) * p, py0 = by + (tipY - by) * p;
      ln(g, px0, py0, px0 + f * h * (.1 + .03 * (k % 2)) * (s > 0 ? 1 : -1), py0 - h * .12, c, Math.max(1, h * .03));
    }
  }
}

function drawCrow(g, cx, fy, h, f, a, sp, t) {
  const flap = Math.sin(t * 14 + a.phase) * h * .45;
  E.px.ell(g, cx, fy - h * .5, h * .42, h * .2, sp.coat);
  E.px.poly(g, [[cx - f * h * .1, fy - h * .6], [cx - f * h * .7, fy - h * .6 + flap], [cx - f * h * .2, fy - h * .3]], sp.belly);
  E.px.poly(g, [[cx + f * h * .05, fy - h * .6], [cx + f * h * .3, fy - h * .8 - flap * .4], [cx + f * h * .5, fy - h * .5]], sp.coat);
  E.px.disc(g, cx + f * h * .42, fy - h * .56, h * .12, sp.coat);
  E.px.dot(g, cx + f * h * .5, fy - h * .58, '#e0c040');
}

function drawBird(g, cx, fy, h, f, a, sp, t) {
  const flap = Math.sin(t * 16 + a.phase) * h * .4;
  E.px.ell(g, cx, fy - h * .5, h * .42, h * .24, sp.coat);
  E.px.ell(g, cx + f * h * .1, fy - h * .42, h * .24, h * .15, sp.belly);
  E.px.poly(g, [[cx - f * h * .1, fy - h * .6], [cx - f * h * .6, fy - h * .6 + flap], [cx - f * h * .1, fy - h * .32]], E.mix(sp.coat, '#000000', .2));
  E.px.disc(g, cx + f * h * .5, fy - h * .6, h * .18, sp.coat);
}

function drawSaucer(g, cx, fy, h, f, a, sp, t) {
  const bob = Math.sin(t * 3 + a.phase) * h * .05, y = fy - h * .5 + bob;
  E.px.ell(g, cx, y, h * .5, h * .14, sp.coat);
  E.px.ell(g, cx, y - h * .12, h * .22, h * .16, '#8ef0ff');
  for (let k = 0; k < 5; k++) {
    const lx = cx + (k - 2) * h * .17, on = Math.sin(t * 8 + k) > 0;
    E.px.disc(g, lx, y + h * .08, Math.max(1, h * .03), on ? sp.belly : '#3a4a52');
  }
}

// a paper target at the range: rings from the outside in, red at the centre
function drawPaper(g, cx, fy, h, f, a, sp) {
  const w = h * sp.aspect, cy = fy - h * .5;
  E.px.rect(g, cx - w / 2, fy - h, w, h, '#f2ecd8');
  E.px.rect(g, cx - w / 2, fy - h, w, 1, '#8a8070');
  const rings = [[.5, '#2a2a2a'], [.4, '#f2ecd8'], [.3, '#2a2a2a'], [.2, '#f2ecd8'], [.1, '#d83a2a']];
  for (const [k, c] of rings) E.px.disc(g, cx, cy, w * k, c);
}

function drawSnowman(g, cx, fy, h, f, a, sp) {
  const up = clampN(a.pop == null ? 1 : a.pop, 0, 1);
  if (up <= 0) return;
  const base = fy, Y = v => base - v * h * up;
  E.px.disc(g, cx, Y(.3), h * .3, sp.coat);
  E.px.disc(g, cx, Y(.68), h * .22, sp.coat);
  E.px.disc(g, cx, Y(.94), h * .15, sp.coat);
  E.px.rect(g, cx - h * .14, Y(1.04), h * .28, h * .05, '#1c1c24');
  E.px.rect(g, cx - h * .09, Y(1.2), h * .18, h * .2, '#1c1c24');
  E.px.poly(g, [[cx + f * h * .02, Y(.98)], [cx + f * h * .24, Y(.94)], [cx + f * h * .02, Y(.9)]], '#f08a20');
  E.px.dot(g, cx - h * .05, Y(.98), '#1a1a1a');
  E.px.dot(g, cx + h * .05, Y(.98), '#1a1a1a');
}

// draw one animal or critter: a is the runtime actor, sp its SPECIES entry, with (x, fy, hn, dir) in fractions
function paintAnimal(g, W, H, a, t) {
  const sp = SPECIES[a.species];
  const cx = a.x * W, fy0 = a.fy * H, h = a.hn * H, f = a.dir >= 0 ? 1 : -1;
  const fall = a.fall || 0;
  const hh = h * (1 - .45 * fall);
  const fyy = fy0 - (a.lift || 0) * H + fall * h * .1;
  if (a.dead || a.state === 'down') {
    E.px.blend(g, .3, 'multiply', () => E.px.ell(g, cx, fy0, h * .4, h * .06, '#000000'));
  } else {
    E.px.blend(g, .3, 'multiply', () => E.px.ell(g, cx, fy0, h * .4, h * .06, '#000000'));
  }
  const drawers = { paper: drawPaper, deer: drawQuad, elk: drawQuad, moose: drawQuad, coon: drawQuad, crow: drawCrow, bird: drawBird, skunk: drawQuad, bessie: drawQuad, saucer: drawSaucer, snowman: drawSnowman };
  const fn = drawers[sp.kind];
  if (fn) fn(g, cx, fyy, Math.max(2, hh), f, a, sp, t);
  if (a.flash > 0) E.px.blend(g, clampN(a.flash, 0, 1) * .6, 'add', () => E.px.ell(g, cx, fyy - hh * .5, hh * .5, hh * .4, '#ffffff'));
}

// the screen's FX: dust puffs, fur, spent shells, snow (cosmetic; drawn after the animals)
const FX = [];
function addFx(p) { if (FX.length < 240) FX.push(Object.assign({ life: 1, vx: 0, vy: 0, g: 0, size: 2 }, p)); }
function updateFx(dt) {
  for (const p of FX) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
  for (let i = FX.length - 1; i >= 0; i--) if (FX[i].life <= 0) FX.splice(i, 1);
}
function paintFx(g, W, H) {
  for (const p of FX) {
    const x = p.x * W, y = p.y * H, s = Math.max(1, Math.round(p.size * (p.life > .5 ? 1 : .5)));
    if (p.kind === 'snow') E.px.rect(g, x, y, s, s, p.color);
    else E.px.disc(g, x, y, s, p.color);
  }
}
function puff(x, y, color, n = 6, speed = .15) {
  for (let i = 0; i < n; i++) addFx({ x, y, vx: rnd(-speed, speed, RNG.fx), vy: rnd(-speed * 1.2, speed * .2, RNG.fx), g: .3, life: rnd(.4, .9, RNG.fx), size: rnd(1, 3, RNG.fx), color });
}
