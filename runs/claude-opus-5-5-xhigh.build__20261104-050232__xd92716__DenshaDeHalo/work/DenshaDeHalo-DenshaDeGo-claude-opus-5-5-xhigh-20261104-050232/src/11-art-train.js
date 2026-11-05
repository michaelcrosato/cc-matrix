/* 11-art-train: trains as strips, one per car (20 m, a 0.6 m gap): the body side with windows, doors and the livery's
 * stripes, the roof, the bogies, a pantograph on two cars, and the end faces (the cab front with headlights and the LED
 * destination, the tail lights, the gangways). A train: { s (its front), track, dir (+1 the way the route runs, -1
 * against it), cars, livery, lights: { head, tail }, doors (0..1 open), side ('L' | 'R' door side), tag, colour }. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, Art = DH.Art, M = Art.M, TN = E.tones;
const LIVERIES = {
  h8000: { name: 'HALO 8000', body: '#d4d8de', stripe: '#f2c230', band: '#3aa0e0', skirt: '#3a3c42', roof: '#9a9ea6', door: '#c8ccd4', face: '#e4e6ea', mask: '#1a1c22', led: '#ff9a30', panto: true },
  h3000: { name: 'HALO 3000', body: '#efe6cf', stripe: '#e8782a', band: '#e8782a', skirt: '#4a4440', roof: '#8a8a86', door: '#efe6cf', face: '#efe6cf', mask: '#2a2a30', led: '#f8f0d0', panto: true, round: true },
  skyliner: { name: 'SKY LINER', body: '#c8ccd8', stripe: '#8a4ac8', band: '#5a2a8a', skirt: '#2a2440', roof: '#7a7a8a', door: '#c8ccd8', face: '#5a2a8a', mask: '#101018', led: '#40e0ff', panto: true, nose: true },
  freight: { name: 'MINATO FREIGHT', body: '#2a4a9a', stripe: '#e8e8e0', band: '#2a4a9a', skirt: '#2a2a30', roof: '#5a6a8a', door: '#2a4a9a', face: '#2a4a9a', mask: '#1a1c22', led: '#f8f0d0', freight: true }
};
DH.LIVERIES = LIVERIES;
const CAR = 19.5, GAP = .5, HW = 1.45, FLOOR = 1.15, ROOF = 3.85;
const CONT = ['#c84a2a', '#2a6aa8', '#3a8a4a', '#e8b030', '#8a3a8a', '#d8d8d0', '#2a8a8a'];

// a car's side: the doors (open shows the lit inside), the windows, the stripes, the bogies under it
const sidePattern = (tr, L, idx) => F => {
  const night = F.night > .35, len = CAR, o = tr.doors || 0, dside = tr.doorSide, faceSide = Math.sign(F.x * F.dir - (tr._cx || 0)), showOpen = o > .02 && dside && faceSide === (dside === 'L' ? -tr.dir : tr.dir);
  if (L.freight && idx > 0) return;   // wagons draw their containers instead
  F.rect(F.u0, F.u1, 0, FLOOR - .05, '#2a2a2e');
  for (const b of [3, len - 3]) if (F.k > 1) { F.rect(b - 1.3, b + 1.3, .15, .95, '#1e1e22'); if (F.k > 5) { F.rect(b - 1.0, b - .4, .2, .8, '#3a3a40'); F.rect(b + .4, b + 1.0, .2, .8, '#3a3a40'); } }
  F.rect(F.u0, F.u1, FLOOR - .1, FLOOR + .25, L.skirt);
  if (L.band !== L.stripe) F.rect(F.u0, F.u1, FLOOR + .3, FLOOR + .55, tr.colour || L.band);
  F.rect(F.u0, F.u1, 2.05, 2.2, tr.colour || L.stripe);
  if (F.k < 1.2) return;
  const DOORS = L.freight ? [] : [2.5, 7.2, 12.3, 17.0];
  for (const d of DOORS) {
    F.rect(d - .65, d + .65, FLOOR, 3.15, L.door);
    if (F.k > 3) { F.rect(d - .5, d - .08, 2.3, 3.0, night ? '#ffe8b8' : '#4a5a6a', night); F.rect(d + .08, d + .5, 2.3, 3.0, night ? '#ffe8b8' : '#4a5a6a', night); if (F.k > 6) F.rect(d - .02, d + .02, FLOOR, 3.15, '#5a5e64'); }
    if (showOpen) { const w = .65 * o; F.rect(d - w, d + w, FLOOR, 3.1, night ? '#fff0c8' : '#d8d0b8', true); }
  }
  // windows between the doors (or along a loco's side)
  const WIN = L.freight ? [[3.5, 6], [13.5, 16]] : [[3.8, 5.9], [8.5, 11.0], [13.6, 15.7]];
  for (const [a, b] of WIN) { F.rect(a, b, 2.3, 3.25, night ? '#ffe6b0' : '#3a4a5c', night); if (F.k > 5 && !night) F.rect(a, a + (b - a) * .3, 2.95, 3.2, '#8aa8c0'); }
  if (idx === 0 && L.name && F.k > 8) F.rect(len * .5 - 1.5, len * .5 + 1.5, 3.35, 3.5, L.stripe);
};
// a cab front: the mask and windscreen, the LED destination, head and tail lights, the coupler
const frontPattern = (tr, L, lead) => F => {
  const W0 = F.x, W1 = F.xr, cx = (W0 + W1) / 2, night = F.night > .3, head = lead && tr.lights !== false, tail = !lead && tr.lights !== false;
  F.rect(W0, W1, 0, FLOOR, '#2a2a2e'); F.rect(W0, W1, FLOOR - .1, FLOOR + .35, L.skirt);
  if (L.freight && !lead) { F.rect(cx - .3, cx + .3, .55, .9, '#1a1a1a'); return; }
  F.rect(W0 + .12, W1 - .12, 2.15, 3.45, L.mask);
  F.rect(W0 + .2, W1 - .2, 2.3, 3.3, night ? '#20283a' : '#3a4a5e');
  if (F.k > 6 && !night) F.rect(W0 + .3, cx - .1, 3.0, 3.25, '#7a90a8');
  if (F.k > 10 && lead && tr.driver !== false) { F.rect(cx + .25, cx + .7, 2.3, 2.95, '#1a2030'); F.rect(cx + .32, cx + .62, 2.95, 3.15, '#24304a'); }
  F.rect(W0 + .12, W1 - .12, 1.95, 2.12, tr.colour || L.stripe);
  F.rect(cx - .9, cx + .9, 3.5, 3.78, '#0a0a0c');
  if (lead) { if (F.k > 4) for (let i = 0; i < 9; i++) F.rect(cx - .8 + i * .19, cx - .7 + i * .19, 3.58, 3.7, L.led, true); else F.rect(cx - .8, cx + .8, 3.58, 3.7, L.led, true); }
  for (const s of [-1, 1]) {
    F.rect(cx + s * .95 - .22, cx + s * .95 + .22, 1.45, 1.75, head ? '#fff8e0' : '#5a5e64', head);
    F.rect(cx + s * 1.25 - .1, cx + s * 1.25 + .1, 1.45, 1.75, tail ? '#ff3020' : '#4a1a18', tail);
  }
  F.rect(cx - .35, cx + .35, .55, .95, '#1a1a1a');
};
const gangway = L => F => { const cx = (F.x + F.xr) / 2; F.rect(cx - .45, cx + .45, FLOOR, 3.2, '#2a2a30'); F.rect(F.x, F.xr, 0, FLOOR, '#2a2a2e'); };
const containerPattern = (seed, i) => F => {
  F.rect(F.u0, F.u1, .7, 1.15, '#3a3a40');
  for (const b of [2.5, CAR - 2.5]) F.rect(b - 1.2, b + 1.2, .1, .8, '#1e1e22');
  for (let c = 0; c < 2; c++) { const col = CONT[(seed + i * 3 + c * 5) % CONT.length]; F.rect(.5 + c * 9.7, 9.7 + c * 9.7, 1.2, 3.75, col); if (F.k > 3) for (let u = .8 + c * 9.7; u < 9.6 + c * 9.7; u += .6) F.rect(u, u + .08, 1.3, 3.65, TN(col).sh); }
};

/** the strips (and lamp glows) that draw a train this frame; tr._items is kept and moved each frame */
DH.trainItems = (tr, R) => {
  const L = LIVERIES[tr.livery] || LIVERIES.h8000, n = tr.cars || 6, items = tr._items || (tr._items = []);
  const x = R.trackX(tr.track, tr.s) === null ? (tr.x || 0) : R.trackX(tr.track, tr.s - tr.dir * n * CAR / 2);
  if (items.length !== n + 2 || tr._L !== L) {
    items.length = 0; tr._L = L;
    for (let i = 0; i < n; i++) {
      const lead = i === 0, last = i === n - 1, fr = frontPattern(tr, L, true), rr = frontPattern(tr, L, false), gw = gangway(L);
      const side = L.freight && i > 0 ? { col: null, pattern: containerPattern(tr.seed || 3, i) } : { col: L.body, pattern: sidePattern(tr, L, i), minK: .5 };
      const top = L.freight && i > 0 ? '#5a5e66' : L.roof, faceCol = L.freight && i > 0 ? '#3a3a40' : L.face;
      const st = { kind: 'car', car: i, s0: 0, s1: 0, x0: 0, x1: 0, y0: .1, y1: ROOF, faces: { side, top, end: { col: faceCol, pattern: gw }, end2: { col: faceCol, pattern: gw } } };
      // the leading car's front faces the way the train runs; the last car's back shows its tail lights
      const fk = tr.dir > 0 ? 'end2' : 'end', bk = tr.dir > 0 ? 'end' : 'end2';
      if (lead) st.faces[fk] = { col: L.face, pattern: fr };
      if (last) st.faces[bk] = { col: L.face, pattern: rr };
      items.push(st);
    }
    // the headlight glow and the name tag, drawn after the body
    items.push({ kind: 'glow', s: 0, x: 0, y: 0, bias: -3, near: 2, draw: (g, sx, sy, k, C, th, d) => {
      const m = M(g, sx, sy, k, C), facing = (C.dir || 1) !== tr.dir;
      if (facing && tr.lights !== false) { for (const s of [-.95, .95]) m.glow(s, 1.6, k > 3 ? .5 : 1.2, '#fff4d0', C.night > .3 ? .55 : .3); if (C.night > .3) m.glow(0, 1.6, 3.5, '#fff0c0', .12); if (tr.flash > 0 && Math.floor(tr.flash * 8) % 2 === 0) m.glow(0, 1.6, 6, '#ffffff', .5); }
      if (tr.tag && d < 420) { const col = tr.colour || '#ffffff'; E.font.text(g, tr.tag, Math.round(sx), Math.round(m.Y(5.2)) - 8, col, { align: 'center', outline: '#000000' }); }
    } });
    items.push({ kind: 'panto', s: 0, x: 0, y: ROOF, bias: -2, near: 3, draw: (g, sx, sy, k, C) => {
      if (!L.panto || k < .8) return; const m = M(g, sx, sy, k, C), up = 1.15 + Math.sin(C.t * 7) * .02;
      m.rect(-.8, 0, .8, .15, '#3a3a40'); m.line(-.7, .15, 0, up * .55, '#2a2a30'); m.line(.7, .15, 0, up * .55, '#2a2a30'); m.line(0, up * .55, -.6, up, '#2a2a30'); m.line(0, up * .55, .6, up, '#2a2a30'); m.rect(-.8, up, .8, up + .06, '#5a5a60');
      if (C.night > .5 && Math.sin(C.t * 37) > .92) m.glow(0, up + .1, .3, '#a0d0ff', .6);
    } });
  }
  // place the cars behind the front
  for (let i = 0; i < n; i++) {
    const st = items[i], front = tr.s - tr.dir * i * (CAR + GAP), back = front - tr.dir * CAR, mid = (front + back) / 2, xx = R.trackX(tr.path ? DH.actorTrack(tr, R.loop ? ((mid % R.length) + R.length) % R.length : mid) : tr.track, mid);
    const cx = xx === null ? x : xx;
    st.s0 = Math.min(front, back); st.s1 = Math.max(front, back); st.x0 = cx - HW; st.x1 = cx + HW; st._len = CAR; if (i === 0) tr._cx = cx;
    if (R.loop) { st.s0 = ((st.s0 % R.length) + R.length) % R.length; st.s1 = st.s0 + CAR; }
  }
  const g = items[n], p = items[n + 1], fx = R.trackX(tr.track, tr.s);
  g.s = R.loop ? ((tr.s % R.length) + R.length) % R.length : tr.s; g.x = fx === null ? x : fx;
  const pc = Math.min(1, n - 1), ps = tr.s - tr.dir * (pc * (CAR + GAP) + CAR / 2); p.s = R.loop ? ((ps % R.length) + R.length) % R.length : ps; p.x = R.trackX(tr.track, ps) === null ? x : R.trackX(tr.track, ps);
  return items;
};
DH.TRAIN_CAR = CAR; DH.TRAIN_GAP = GAP;
DH.trainLength = n => n * CAR + (n - 1) * GAP;
DH.DOOR_POS = [2.5, 7.2, 12.3, 17.0];   // metres from a car's front
})();
