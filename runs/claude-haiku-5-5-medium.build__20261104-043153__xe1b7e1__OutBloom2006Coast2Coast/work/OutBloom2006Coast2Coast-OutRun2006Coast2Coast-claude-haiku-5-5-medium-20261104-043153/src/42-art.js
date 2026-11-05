// The art (plan §9): the cars and the traffic drawn by code, from behind, with their lights and wheels; the request
// objects (balloons, gnomes, cones, arches); the passengers' portraits and the speech bubble. Everything is px drawing
// so it reads as the engine's pixel style; nothing is an image file.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px, clamp } = E;
const G = () => OB.game;
OB.Art = OB.Art || {};

/** a car body from behind: the lower body, the glass, the lights, the tyres. s: pixels a unit; W: its width in pixels */
function carBody(g, sx, sy, W, col, o = {}) {
  const Hh = W * .42, dark = E.shade ? E.shade(col, -.3) : col;
  px.ell(g, sx, sy + 1, W * .55, Math.max(1, W * .04), 'rgba(0,0,0,.35)');
  px.rect(g, sx - W / 2, sy - Hh * .7, W, Hh * .7, col);
  px.rect(g, sx - W * .36, sy - Hh * 1.2, W * .72, Hh * .55, dark);
  px.rect(g, sx - W * .32, sy - Hh * 1.1, W * .64, Hh * .34, '#a8d4ee');
  px.rect(g, sx - W * .45, sy - Hh * .15, W * .16, Hh * .15, '#141414');
  px.rect(g, sx + W * .29, sy - Hh * .15, W * .16, Hh * .15, '#141414');
  // the tail lamps: red, brighter when braking
  const lampCol = o.brake ? '#ff2a1a' : '#c02018';
  px.rect(g, sx - W * .46, sy - Hh * .52, W * .14, Hh * .13, lampCol);
  px.rect(g, sx + W * .32, sy - Hh * .52, W * .14, Hh * .13, lampCol);
  if (o.blink && o.blink > 0) { const on = Math.floor((G().time || 0) * 4) % 2; if (on) { px.rect(g, sx - W * .5, sy - Hh * .65, W * .06, Hh * .1, '#ffb020'); px.rect(g, sx + W * .44, sy - Hh * .65, W * .06, Hh * .1, '#ffb020'); } }
  if (o.roof) px.rect(g, sx - W * .08, sy - Hh * 1.32, W * .16, Hh * .14, '#ffe060');
}
/** a bigger vehicle: a bus, a truck, a van with a box: a body and a row of windows and lamps */
function boxBody(g, sx, sy, W, H, col, trim) {
  px.ell(g, sx, sy + 1, W * .55, Math.max(1, W * .04), 'rgba(0,0,0,.35)');
  px.rect(g, sx - W / 2, sy - H, W, H, col);
  px.rect(g, sx - W / 2, sy - H * .32, W, H * .08, trim);
  px.rect(g, sx - W * .4, sy - H * .8, W * .8, H * .3, '#a8d4ee');
  px.rect(g, sx - W * .45, sy - H * .22, W * .14, H * .16, '#c02018');
  px.rect(g, sx + W * .31, sy - H * .22, W * .14, H * .16, '#c02018');
  px.rect(g, sx - W * .45, sy - H * .4, W * .9, Math.max(1, H * .03), '#ffe060');
}
/** pre-rendered sprites (plan §9.3): a body drawn once into its own canvas, keyed by what it looks like, then blitted */
const SPR = new Map();
function spriteOf(key, w, h, draw) {
  let c = SPR.get(key);
  if (!c) {
    c = E.mkCanvas(Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
    draw(E.ctx2d(c));
    if (SPR.size > 600) SPR.delete(SPR.keys().next().value);
    SPR.set(key, c);
  }
  return c;
}
OB.Art.spriteCount = () => SPR.size;
/** a traffic vehicle drawn at the foot (sx, sy) at scale s (pixels a unit), by its body type. Its width is its
 *  half-width in half roads, doubled and in world units, so it sits in its lane the way the sim puts it. */
function vehicleShape(g, body, sx, sy, W, col, o) {
  switch (body) {
    case 'bus': boxBody(g, sx, sy, W * 1.05, W * .9, col, '#ffffff'); break;
    case 'truck': boxBody(g, sx, sy, W * 1.05, W * .95, col, '#c0306a'); break;
    case 'van': boxBody(g, sx, sy, W, W * .8, col, '#70b8e0'); break;
    case 'pickup': carBody(g, sx, sy, W, col, { brake: o.brake }); break;
    case 'tractor': boxBody(g, sx, sy, W * .9, W * .6, col, '#202020'); break;
    case 'scooter': carBody(g, sx, sy, W * .8, col, {}); break;
    default: carBody(g, sx, sy, W, col, { brake: o.brake, roof: o.roof, blink: o.blink });
  }
}
/** a traffic vehicle drawn at the foot (sx, sy) at scale s (pixels a unit), by its body type. Its width is its
 *  half-width in half roads, doubled and in world units, so it sits in its lane the way the sim puts it. */
OB.Art.vehicle = (g, v, sx, sy, s) => {
  const d = v.def, W = v.w * 2 * OB.HALF * .5 * s;
  if (W < 2) return;
  const Wr = Math.round(W), bw = Math.ceil(Wr * 1.3) + 8, bh = Math.ceil(Wr * 1.1) + 8, ax = bw / 2, ay = bh - 4;
  const brake = d.body === 'pickup' ? v.kmh < 60 : (v.blink > 0 && false), blinkOn = v.blink > 0 && Math.floor((G().time || 0) * 4) % 2 === 1;
  const o = { brake: d.body === 'pickup' ? v.kmh < 60 : false, roof: d.roof, blink: blinkOn ? 1 : 0 };
  const key = ['v', d.body, v.col, Wr, o.brake, !!o.roof, o.blink, v.blink > 0 ? 1 : 0].join('|');
  const c = spriteOf(key, bw, bh, g2 => vehicleShape(g2, d.body, ax, ay, W, v.col, o));
  g.drawImage(c, Math.round(sx - ax), Math.round(sy - ay));
};

/** the player's car from behind: its paint, the lean into the steer, the bounce, the drift's tilt */
OB.Art.playerCar = (g, sx, sy, s, o = {}) => {
  const W = 118 * s, lean = (o.steer || 0) * 4 * s + (o.drift || 0) * 10 * s, bounce = o.rough ? Math.round(Math.sin((G().time || 0) * 40)) * s : 0;
  const y = sy + bounce;
  // the body (a convertible: the deck, the rear hoops, the tyres, the lamps), pre-rendered per paint and lean
  const cw = Math.ceil(W * 1.12) + 12, top = Math.ceil(W * .5) + 6, ch = top + Math.ceil(W * .14) + 6, ax = cw / 2, ay = top;
  const lk = Math.round(lean), bl = o.brake ? 1 : 0, key = ['car', o.paint, Math.round(W), lk, bl, s.toFixed(2)].join('|');
  // (the under layer, then the seats and rigs, then the over layer: the rear panel hides the occupants' legs, as the plan's layers do)
  const body = spriteOf(key, cw, ch, g2 => {
    const yy = ay, sx2 = ax, L = lk;
    px.ell(g2, sx2, yy + 1, W * .56, Math.max(1, 4 * s), 'rgba(0,0,0,.4)');
    px.poly(g2, [[sx2 - W / 2, yy - W * .08], [sx2 - W / 2 + 6 * s + L, yy - W * .42], [sx2 + W / 2 - 6 * s + L, yy - W * .42], [sx2 + W / 2, yy - W * .08]], o.paint);
    px.rect(g2, sx2 - W * .42, yy - W * .18, W * .14, 4 * s, bl ? '#ff3020' : '#ff6a40');
    px.rect(g2, sx2 + W * .28, yy - W * .18, W * .14, 4 * s, bl ? '#ff3020' : '#ff6a40');
    px.rect(g2, sx2 - W * .12 + L, yy - W * .48, W * .24, 3 * s, '#c8d8e8');
    for (const k of [-1, 1]) px.rect(g2, sx2 + k * W * .42 - 6 * s, yy - W * .06, 12 * s, W * .07, '#141414');
    px.line(g2, sx2 - W * .32 + L, yy - W * .4, sx2 - W * .32, yy - W * .12, '#e8e8f0', Math.max(1, s));
    px.line(g2, sx2 + W * .32 + L, yy - W * .4, sx2 + W * .32, yy - W * .12, '#e8e8f0', Math.max(1, s));
  });
  g.drawImage(body, Math.round(sx - ax), Math.round(y - ay));
  // the seats and the two rigs (live: they pose every frame)
  // the driver (left) and the passenger (right): their rigs, seated (the Humanoid's down pose), drawn at the seats; the
  // drawn heads are the fallback where a rig cannot draw
  for (const [k, who, rig0] of [[-.2, 'driver', OB.Art.driverRig()], [.2, o.passengerKey || 'marisol', null]]) {
    const hx = sx + W * k + lean, hy = y - W * .14, pe = k < 0 ? (o.driver || {}) : (o.passenger || {});
    if (k > 0 && !o.passenger) continue;
    try {
      const rig = rig0 || OB.Art.seatRig(who);
      rig.update(1 / 60, { down: .35, facing: 0, expr: 'smile' });
      rig.draw(g, hx, hy, o.view || OB.game.view);
    } catch (e) {
      px.disc(g, hx, hy, 6 * s, pe.skin || '#e8b088'); px.disc(g, hx, hy - 3 * s, 6 * s, k < 0 ? '#3a2010' : (o.passengerHair || '#e8c050'));
    }
  }
  // the over layer: the rear panel, which hides the occupants' legs
  const over = spriteOf('over|' + o.paint + '|' + Math.round(W) + '|' + s.toFixed(2), cw, ch, g2 => {
    px.rect(g2, ax - W / 2, ay - W * .12, W, W * .14, E.shade ? E.shade(o.paint, -.25) : o.paint);
  });
  g.drawImage(over, Math.round(sx - ax), Math.round(y - ay));
};

/** a request's object, drawn at its foot (sx, sy) at scale s: a balloon, a gnome, a cone, an arch */
OB.Art.requestObj = o => (g, sx, sy, s) => {
  const t = G().time || 0, W = 40 * s, H = 60 * s;
  if (W < 1) return;
  if (o.kind === 'balloons') {
    const bob = Math.sin(t * 2 + o.z * .01) * 4 * s;
    px.disc(g, sx, sy - H * .6 + bob, 9 * s, '#ff5a8a'); px.disc(g, sx - 2 * s, sy - H * .7 + bob, 2 * s, '#ffd0e0');
    px.line(g, sx, sy - H * .6 + bob + 9 * s, sx, sy, '#806080', Math.max(1, s));
  } else if (o.kind === 'gnomes') {
    px.rect(g, sx - W * .25, sy - H * .5, W * .5, H * .5, '#3a7ad8');
    px.disc(g, sx, sy - H * .6, W * .25, '#f0c8a0');
    px.poly(g, [[sx - W * .3, sy - H * .6], [sx + W * .3, sy - H * .6], [sx, sy - H * 1.1]], '#d83030');
    px.disc(g, sx - 2 * s, sy - H * .65, Math.max(1, s), '#101010');
  } else if (o.kind === 'cones') {
    px.poly(g, [[sx - W * .3, sy], [sx + W * .3, sy], [sx, sy - H * .7]], '#ff7020');
    px.rect(g, sx - W * .32, sy - H * .05, W * .64, H * .06, '#ffffff');
  } else if (o.kind === 'arches') {
    px.rect(g, sx - W * .8, sy - H * .9, W * .12, H * .9, '#ffffff');
    px.rect(g, sx + W * .68, sy - H * .9, W * .12, H * .9, '#ffffff');
    for (let k = 0; k < 4; k++) px.disc(g, sx - W * .7 + k * W * .46, sy - H * .92, 4 * s, k % 2 ? '#ffd0e0' : '#ff7ab8');
  } else if (o.kind === 'bee') {
    const b = Math.sin(t * 9 + o.z) * 6 * s;
    px.disc(g, sx + b, sy - H * .9, 5 * s, '#ffcf30'); px.rect(g, sx + b - 3 * s, sy - H * .95, 6 * s, 1.5 * s, '#202020');
    px.disc(g, sx + b - 4 * s, sy - H * .98, 3 * s, 'rgba(255,255,255,.8)'); px.disc(g, sx + b + 4 * s, sy - H * .98, 3 * s, 'rgba(255,255,255,.8)');
  } else if (o.kind === 'bouquet') {
    px.rect(g, sx - 2 * s, sy - H * .4, 4 * s, H * .4, '#4a8a3a');
    for (let k = 0; k < 5; k++) px.disc(g, sx + (k - 2) * 5 * s, sy - H * .5 + (k % 2) * 3 * s, 4 * s, ['#ff5a8a', '#ffd040', '#ffffff'][k % 3]);
  } else if (o.kind === 'ribbon') {
    px.rect(g, sx - W * .9, sy - H * .6, 3 * s, H * .6, '#f0f0f0'); px.rect(g, sx + W * .9, sy - H * .6, 3 * s, H * .6, '#f0f0f0');
    px.line(g, sx - W * .9, sy - H * .6, sx + W * .9, sy - H * .5 + Math.sin(t * 6) * 2 * s, '#ff7ab8', Math.max(1, 2 * s));
  } else if (o.kind === 'gate') {
    const c = { pink: '#ff5fa2', blue: '#3ac8e0', yellow: '#ffcf4a' }[o.color] || '#ffffff';
    px.rect(g, sx - W * .6, sy - H * .9, 4 * s, H * .9, '#e8e8f0'); px.rect(g, sx + W * .6, sy - H * .9, 4 * s, H * .9, '#e8e8f0');
    px.rect(g, sx - W * .6, sy - H * .9, W * 1.2, H * .35, c);
  } else if (o.kind === 'photo') {
    const L = (o.len || 400) * s * .5, W2 = 180 * s;
    px.rect(g, sx - W2, sy - L, W2 * 2, L * 2, 'rgba(255,255,255,.35)');
    px.line(g, sx - W2, sy - L, sx + W2, sy - L, '#ffffff', Math.max(1, s)); px.line(g, sx - W2, sy + L, sx + W2, sy + L, '#ffffff', Math.max(1, s));
    px.line(g, sx - W2, sy - L, sx - W2, sy + L, '#ffffff', Math.max(1, s)); px.line(g, sx + W2, sy - L, sx + W2, sy + L, '#ffffff', Math.max(1, s));
  } else {
    px.disc(g, sx, sy - H * .5, 6 * s, '#ffcf4a');
  }
};

/** the driver's rig (Leo): a heroic build, short hair, an open-collar shirt, seated in the car */
OB.Art.driverRig = () => {
  if (!rigs.driver) rigs.driver = new E.Humanoid({ size: .7, build: 'heroic', hair: 'short', outfit: 'shirt', sleeves: 'short', weapon: null, colors: { skin: '#e8b088', hair: '#3a2010', cloth: '#e0503a' } });
  return rigs.driver;
};
/** a passenger's rig for the seat (smaller than the portrait's): the same rig, sized to sit in the car */
OB.Art.seatRig = who => {
  const key = 'seat-' + who;
  if (!rigs[key]) { const c = OB.CAST[who]; rigs[key] = new E.Humanoid({ size: .7, build: 'heroic', hair: c.hairStyle, outfit: c.outfit, hat: c.hat || null, weapon: null, sleeves: 'short', colors: { skin: '#f0c8a0', hair: c.hair, cloth: c.fill } }); }
  return rigs[key];
};
/** a passenger's portrait: her rig (the engine's Humanoid, in her hair and outfit) with her mood face. The drawn head is
 *  the fallback where the rig cannot draw. */
const rigs = {};
OB.Art.rig = who => {
  if (!rigs[who]) {
    const c = OB.CAST[who];
    rigs[who] = new E.Humanoid({ size: 1.2, build: 'heroic', hair: c.hairStyle, outfit: c.outfit, hat: c.hat || null, weapon: null, sleeves: 'short',
      colors: { skin: '#f0c8a0', hair: c.hair, cloth: c.fill } });
  }
  return rigs[who];
};
OB.Art.portrait = (g, who, x, y, size, mood = 'happy') => {
  px.rect(g, x, y, size, size, '#1e1040'); px.rect(g, x + 2, y + 2, size - 4, size - 4, '#3a2050');
  try {
    const rig = OB.Art.rig(who);
    rig.update(0, { expr: mood === 'pouty' ? 'wince' : 'smile', facing: 0 });
    rig.drawPortrait(g, x + 2, y + 2, size - 4, { zoom: 2.4, turn: .15 });
    return;
  } catch (e) { /* no rig here: the drawn head below */ }
  const c0 = OB.CAST[who] || { hair: '#7a3a20', fill: '#ffb3d1' }, s = size / 40;
  const worn = OB.Progress && OB.Progress.owns && OB.Progress.owns('outfit-' + who);
  const c = worn ? Object.assign({}, c0, { fill: { marisol: '#ffe27a', vivi: '#f0f0ff', juni: '#4a6a3a' }[who] || c0.fill }) : c0;
  px.disc(g, x + size / 2, y + size * .6, size * .34, c.fill);
  px.disc(g, x + size / 2, y + size * .42, size * .24, '#f0c8a0');
  px.disc(g, x + size / 2, y + size * .3, size * .26, c.hair);
  px.disc(g, x + size * .36, y + size * .42, Math.max(1, s * 1.5), '#101010'); px.disc(g, x + size * .64, y + size * .42, Math.max(1, s * 1.5), '#101010');
  const my = y + size * .56;
  if (mood === 'happy') px.rect(g, x + size * .42, my, size * .16, Math.max(1, s), '#c02040');
  else if (mood === 'pouty') px.rect(g, x + size * .42, my + s, size * .16, Math.max(1, s), '#c02040');
  else px.rect(g, x + size * .44, my, size * .12, Math.max(1, s), '#c02040');
};

/** the speech bubble's text is drawn in the HUD; this is its box */
OB.Art.bubble = (g, x, y, w, h) => { OB.UI.panel(g, x, y, w, h, { bg: ['#fff8ea', '#ffe6c0'], border: '#8a4a2a', flat: true }); };
})();
