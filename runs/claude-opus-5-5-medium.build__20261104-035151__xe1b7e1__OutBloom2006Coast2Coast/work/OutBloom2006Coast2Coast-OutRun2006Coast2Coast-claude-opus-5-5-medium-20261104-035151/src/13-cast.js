/* The cast as the engine's Humanoid rigs (PLAN §7.13): dressed per §8.5 and animated by the rig's own system (poses,
 * expressions, breathing, hair). Portraits for the HUD and menus; a rig drawn into a small canvas and scaled onto the
 * road (Bruno waving his sunflower flag at the start, spectators); the side-view car for endings and the garage. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E;
const rigs = {};
OB.Cast = {
  /** a rig for a cast member (and an outfit index): made once, kept */
  rig(id, outfit = 0, extra) {
    const key = id + ':' + outfit + (extra ? ':' + extra : '');
    if (rigs[key]) return rigs[key];
    const c = OB.CAST[id] || OB.CAST.marisol, o = JSON.parse(JSON.stringify(c.rig));
    o.size = o.size || 1.3; o.colors = Object.assign({}, o.colors);
    const of = c.outfits && c.outfits[outfit]; if (of) { o.colors.cloth = of.cloth; if (o.colors.coat) o.colors.coat = of.cloth; o.colors.trim = of.trim; }
    let rig = null; try { rig = new E.Humanoid(o); } catch (e) { rig = null; }
    const R = rigs[key] = { id, rig, state: { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0 }, t: 0 };
    return R;
  },
  /** advance a rig: pose, expression, facing, walking speed */
  pose(R, dt, st) { if (!R || !R.rig) return; Object.assign(R.state, st); R.t += dt; try { R.rig.update(dt, R.state); } catch (e) { /* a pose this rig lacks */ } },
  /** a live portrait: the rig's own close-up, framed */
  portrait(g, id, x, y, size, o = {}) {
    const R = OB.Cast.rig(id, o.outfit || 0); if (!R.rig) { px.disc(g, x + size / 2, y + size / 2, size / 2, (OB.CAST[id] || {}).color || '#888'); return; }
    if (o.expr) R.state.expr = o.expr;
    try { R.rig.drawPortrait(g, x, y, size, { zoom: o.zoom || 2.6, turn: o.turn !== undefined ? o.turn : .35, bg: o.bg === undefined ? (OB.CAST[id].color ? E.shade(OB.CAST[id].color, -.45) : '#2a1450') : o.bg, frame: o.frame !== false }); }
    catch (e) { px.disc(g, x + size / 2, y + size / 2, size / 2, '#888'); }
  },
  /** draw a rig into a scratch canvas and paste it scaled at (sx, sy) on screen: hUnits tall in world units */
  paste(g, R, sx, sy, k, hUnits, view) {
    if (!R || !R.rig || !view) return;
    const ph = hUnits * k; if (ph < 3) return;
    const cv = R.cv || (R.cv = E.mkCanvas(96, 112)), cg = E.ctx2d(cv);
    if (!cg || !cg.clearRect) return;
    cg.clearRect(0, 0, 96, 112);
    try { R.rig.draw(cg, 48, 104, view); } catch (e) { return; }
    const s = ph / 70, w = 96 * s, h = 112 * s;
    g.drawImage(cv, Math.round(sx - w / 2), Math.round(sy - h * (104 / 112)), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  },
  tickAll(dt) { for (const k in rigs) { const R = rigs[k]; if (R.rig && R.live) OB.Cast.pose(R, dt, {}); } }
};

/** Bruno at the roadside: a flag on a pole, waved overhead in a loop until GO, then a cheer */
OB.brunoObj = (race, stage, z) => ({ stage, z, x: -1.55, draw(g, X, Y, k, c) {
  const R = OB.Cast.rig('bruno'), t = c.t, go = race.phase !== 'countdown';
  OB.Cast.pose(R, 1 / 60, { facing: 0, pose: go ? 'cheer' : null, expr: go ? 'shout' : 'smile', point: !go, aim: !go ? .9 + Math.sin(t * 7) * .6 : 0 });
  OB.Cast.paste(g, R, X, Y, k, 1900, OB.game && OB.game.view);
  // the sunflower flag over his raised arm, waving
  if (k * 1900 > 6) {
    const a = !go ? Math.sin(t * 7) * .8 : Math.sin(t * 12) * .3, hx = X + 120 * k, hy = Y - 1900 * k, tx = hx + Math.sin(a) * 900 * k, ty = hy - Math.cos(a) * 900 * k;
    px.line(g, hx, hy, tx, ty, '#6a4a2a', Math.max(1, 30 * k));
    const wv = Math.sin(t * 14) * 80 * k;
    px.poly(g, [[tx, ty], [tx + 700 * k, ty + wv], [tx + 650 * k, ty + 450 * k + wv], [tx, ty + 420 * k]], '#f8d020');
    px.disc(g, tx + 330 * k, ty + 220 * k + wv / 2, 130 * k, '#6a3a1a');
  }
} });
/** spectators by the start grid: the cast's colours, waving */
OB.fanObj = (stage, z, x, seed) => ({ stage, z, x, draw(g, X, Y, k, c) { OB.ART.crowd.draw(g, X, Y, k, { t: c.t, seed }); } });

/** a car in side view (endings, the garage): pointing right, wheels turning by roll */
OB.drawCarSide = function (g, x, y, s, model, paint, o = {}) {
  const car = OB.CARS[model] || OB.CARS.orchidea, t = E.tones(paint || car.paint), L = 92 * s, H = 16 * s, roll = o.roll || 0;
  px.blend(g, .35, 'multiply', () => px.ell(g, x + L / 2, y, L * .55, 3 * s, '#20202a'));
  const low = car.look === 'wedge' || car.look === 'hyper';
  px.poly(g, [[x, y - 6 * s], [x + 4 * s, y - H], [x + L * .3, y - H - (low ? 0 : 2 * s)], [x + L * .62, y - H], [x + L * .9, y - H * .8], [x + L, y - 8 * s], [x + L, y - 4 * s], [x, y - 4 * s]], t.base);
  px.poly(g, [[x + 2 * s, y - H + 2 * s], [x + L * .9, y - H * .8 + 1 * s], [x + L * .9, y - H * .8 + 3 * s], [x + 2 * s, y - H + 4 * s]], t.lt);
  px.rect(g, x, y - 6 * s, L, 2 * s, t.sh);
  px.poly(g, [[x + L * .55, y - H], [x + L * .62, y - H - 7 * s], [x + L * .64, y - H - 7 * s], [x + L * .6, y - H]], '#a8d8f0');
  if (car.hoops) px.rect(g, x + L * .34, y - H - 6 * s, 3 * s, 6 * s, '#c8c8d0');
  for (const wx of [x + L * .2, x + L * .8]) { px.disc(g, wx, y - 4 * s, 7 * s, '#1a1a20'); px.disc(g, wx, y - 4 * s, 4 * s, '#c8c8d0'); px.line(g, wx, y - 4 * s, wx + Math.cos(roll) * 4 * s, y - 4 * s + Math.sin(roll) * 4 * s, '#6a6a70'); }
  px.rect(g, x + L - 3 * s, y - 11 * s, 3 * s, 3 * s, '#fff4c0'); px.rect(g, x, y - 11 * s, 2 * s, 3 * s, '#e83020');
  if (o.people) for (const [i, id] of o.people.entries()) { const hx = x + L * (.4 + i * .12), hd = OB.CAST[id] && OB.CAST[id].head; if (!hd) continue; px.disc(g, hx, y - H - 5 * s, 3.4 * s, hd.skin); px.disc(g, hx - .6 * s, y - H - 6 * s, 3.4 * s, hd.color); }
};
})();
