/* 90-gallery: the renderer's look-review shots (#gallery, #gallery=N): fixed cameras on the line at set times of day
 * and weather, with trains where a shot needs them. Left / right (or a click) step through them. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game;
const SHOTS = [
  { cap: 'STRAIGHT, DAY', route: 'halo', s: 1700, h: 11 },
  { cap: 'CURVE AND HILL', route: 'halo', s: 9150, h: 14 },
  { cap: 'STATION APPROACH', route: 'halo', s: 1250, h: 9 },
  { cap: 'ALONGSIDE A PLATFORM', route: 'halo', s: 1520, h: 8.5, crowd: true },
  { cap: 'CLOSE TO A SIGNAL', route: 'halo', s: 2100, h: 12 },
  { cap: 'TUNNEL MOUTH', route: 'halo', s: 5900, h: 10.5 },
  { cap: 'TRUSS BRIDGE', route: 'halo', s: 19120, h: 12 },
  { cap: 'CROSSING, GATES DOWN', route: 'halo', s: 1000, h: 7, gates: 'X1' },
  { cap: 'QUAD TRACK, A TRAIN ALONGSIDE', route: 'halo', s: 12500, h: 17.6, trains: [{ s: 12560, track: 'C', dir: 1, cars: 6, livery: 'skyliner' }] },
  { cap: 'NIGHT, HEADLIGHTS', route: 'halo', s: 19950, h: 23.3, trains: [{ s: 20150, track: 'B', dir: -1, cars: 6, livery: 'h8000' }] },
  { cap: 'RAIN', route: 'halo', s: 3700, h: 10.3, w: 'rain' },
  { cap: 'PLATFORM CAMERA, A TRAIN ARRIVING', route: 'halo', s: 1615, h: 8, dir: -1, h0: 1.7, x: -3.4, trains: [{ s: 1540, track: 'A', dir: 1, cars: 6, livery: 'h8000' }] },
  { cap: 'CHASE CAMERA', route: 'halo', s: 2620, h: 13, h0: 9, x: 2, chase: true, trains: [{ s: 2720, track: 'A', dir: 1, cars: 6, livery: 'h8000' }] },
  { cap: 'DEPOT AT DAWN', route: 'depot', s: 20, h: 5.6, trains: [{ s: 200, track: 'S1', dir: 1, cars: 4, livery: 'h3000' }, { s: 300, track: 'S2', dir: 1, cars: 6, livery: 'h8000' }] },
  { cap: 'HARBOUR', route: 'halo', s: 4400, h: 10.4 },
  { cap: 'TEMPLE TOWN FESTIVAL', route: 'halo', s: 8380, h: 14 },
  { cap: 'SAKURA PARK AT SUNSET', route: 'halo', s: 14550, h: 17.4 },
  { cap: 'KUJIRA-BASHI ARCH', route: 'halo', s: 2520, h: 7.2 }
];
DH.GALLERY = SHOTS;
let i = 0, t = 0;
DH.scenes.gallery = {
  enter(d) { i = E.clamp(d && d.i !== undefined ? d.i : 0, 0, SHOTS.length - 1); t = 0; },
  update(dt) {
    t += dt; const I = game.input;
    if (I.pressed('right') || I.clicked()) i = (i + 1) % SHOTS.length;
    if (I.pressed('left')) i = (i + SHOTS.length - 1) % SHOTS.length;
    if (I.pressed('cancel')) game.go('title');
    const S = SHOTS[i], R = DH.route(S.route);
    if (S.gates) { const X = R.crossings.find(c => c.id === S.gates); if (X) { X.warn = true; X.gate = 0; } }
    for (const tr in R.signals) for (const g of R.signals[tr]) g.aspect = g.force || (g.kind === 'start' ? 'R' : 'G');
  },
  draw(r) {
    const S = SHOTS[i], R = DH.route(S.route), rail = DH.railFor(R), G = DH.grade(S.h, S.w || 'clear');
    const cam = { s: S.s, x: S.x || 0, h: S.h0 || 2.9, dir: S.dir || 1, horizon: S.chase ? .5 : (S.dir || 1) < 0 ? .5 : .42 };
    const trains = (S.trains || []).map(tr => Object.assign({ lights: true }, tr));
    DH.clockNow = S.h * 3600;
    const hd = rail.headingAt(S.s) + (cam.dir < 0 ? Math.PI : 0), zone = R.segs[rail.segAt(S.s)].zone;
    rail.draw(r, cam, { grade: DH.railGrade(G), sky: DH.skyFor(G, zone, hd, 1.2), turn: -hd * 278, t: game.time, wet: S.w === 'rain', headlight: true, fogScale: G.fogScale, actors: trains.map(tr => ({ items: DH.trainItems(tr, R) })) });
    r.overlay(g => {
      E.ui.box(g, 6, r.H - 22, Math.min(r.W - 12, 260), 16, { alpha: .7 });
      E.font.text(g, (i + 1) + '/' + SHOTS.length + '  ' + S.cap, 12, r.H - 18, '#fff8e0', { outline: false });
      if (S.w === 'rain') for (let k = 0; k < 120; k++) { const x = (k * 97 + game.time * 300) % r.W, y = (k * 53 + game.time * 900) % r.H; E.px.line(g, x, y, x - 2, y + 6, '#c8d4e0', 1); }
    });
  }
};
/** one renderer per route (made on first use) */
const rails = new Map();
DH.railFor = R => { let rl = rails.get(R.id); if (!rl) { rl = new E.Rail(R, { fov: 75, draw: 360, fogDist: 900 }); rails.set(R.id, rl); } return rl; };
})();
