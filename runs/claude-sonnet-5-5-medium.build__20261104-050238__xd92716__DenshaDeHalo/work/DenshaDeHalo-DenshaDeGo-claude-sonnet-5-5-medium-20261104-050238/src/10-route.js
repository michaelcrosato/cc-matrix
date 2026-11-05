/* The Halo Line: a 15.3 km loop of 12 stations, built once from a fixed seed into 5 m segments.
 * s is metres along the ring (it wraps). x is metres across, + to the right of our track (x = 0). y is metres up. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH;
const SEG = 5;
DH.SEG = SEG;

const STATIONS = [
  { id: 'AKC', name: 'Akari Central', zone: 'city', gap: 1150 },
  { id: 'HKG', name: 'Hikari Gate', zone: 'city', gap: 900 },
  { id: 'TNP', name: 'Tanuki Park', zone: 'park', gap: 1300 },
  { id: 'SKD', name: 'Sakura Dock', zone: 'harbor', gap: 1000 },
  { id: 'RMR', name: 'Ramen Row', zone: 'city', gap: 1200 },
  { id: 'KMB', name: 'Kamome Bridge', zone: 'harbor', gap: 1000 },
  { id: 'YZH', name: 'Yuzu Heights', zone: 'suburb', gap: 1400 },
  { id: 'NKM', name: 'Neko Market', zone: 'city', gap: 1050 },
  { id: 'TSH', name: 'Tsubame Hill', zone: 'hills', gap: 1300 },
  { id: 'MTG', name: 'Matsu Garden', zone: 'park', gap: 1150 },
  { id: 'HSO', name: 'Hoshi Observatory', zone: 'hills', gap: 1000 },
  { id: 'TKT', name: 'Tsuki Terminal', zone: 'suburb', gap: 1050 }
];
const ZONES = {
  city: { g: ['#6d7279', '#656a71'], sky: 'city' },
  suburb: { g: ['#72a257', '#6a9a50'], sky: 'hills' },
  park: { g: ['#4f9f48', '#479641'], sky: 'hills' },
  harbor: { g: ['#8a98a3', '#828f9a'], sky: 'sea' },
  hills: { g: ['#5e8744', '#567f3e'], sky: 'mountain' }
};
DH.ZONES = ZONES;

const BLD = ['#b9b2a6', '#a9b4c0', '#c8a98d', '#9aa5a0', '#cbbf9a', '#8f9bb5', '#d0a8a0', '#b7c4a8'];
const ROOF = ['#6c4a3c', '#3f5560', '#7a3a34', '#4d4d58'];

function build() {
  const rng = E.rng(20261104);
  const R = { SEG, stations: [], signals: [], signs: [], horns: [], crossings: [], stripsBy: null, thingsBy: null };
  let acc = 400; const markers = [];
  for (let i = 0; i < STATIONS.length; i++) { markers.push(acc); acc += STATIONS[i].gap; }
  const LEN = acc - 400; R.length = LEN; R.n = LEN / SEG;
  const N = R.n;
  STATIONS.forEach((st, i) => R.stations.push(Object.assign({ index: i, s: markers[i], next: (i + 1) % STATIONS.length }, st)));
  R.markerOf = i => markers[((i % 12) + 12) % 12];
  const wrapS = s => ((s % LEN) + LEN) % LEN;
  R.wrap = wrapS;
  const ringDist = (a, b) => { const d = wrapS(b - a); return d; };   // forward distance a -> b
  R.fwd = ringDist;
  R.curve = new Float32Array(N + 2); R.height = new Float32Array(N + 2); R.limit = new Float32Array(N + 2).fill(100);
  R.flag = new Uint8Array(N + 2);   // 1 tunnel, 2 bridge, 4 crossing
  R.zone = new Array(N + 2);
  R.stripsBy = Array.from({ length: N + 2 }, () => null);
  R.thingsBy = Array.from({ length: N + 2 }, () => null);
  const addStrip = (s0, s1, st) => {
    const a = Math.floor(wrapS(s0) / SEG), len = Math.ceil((s1 - s0) / SEG);
    st.s0 = s0; st.s1 = s1;
    for (let k = 0; k <= len; k++) { const i = (a + k) % N; (R.stripsBy[i] || (R.stripsBy[i] = [])).push(st); }
  };
  const addThing = (s, th) => { th.s = wrapS(s); const i = Math.floor(th.s / SEG) % N; (R.thingsBy[i] || (R.thingsBy[i] = [])).push(th); return th; };
  R.addStrip = addStrip; R.addThing = addThing;

  // zones and curves
  const intervalOf = s => { s = wrapS(s); for (let i = STATIONS.length - 1; i >= 0; i--) if (s >= markers[i]) return i; return STATIONS.length - 1; };
  R.intervalOf = intervalOf;
  for (let i = 0; i < N; i++) R.zone[i] = ZONES[STATIONS[intervalOf(i * SEG)].zone];
  const curves = [];
  for (let k = 0; k < STATIONS.length; k++) {
    const g = STATIONS[k].gap, n = g > 1250 ? 2 : 1;
    for (let c = 0; c < n; c++) {
      const len = 200 + rng() * 140, center = markers[k] + g * (n === 2 ? (c ? .72 : .33) : .5) + (rng() - .5) * 60, radius = 380 + rng() * 420, sign = rng() < .5 ? -1 : 1;
      curves.push({ s0: center - len / 2, s1: center + len / 2, R: radius, sign, lim: radius < 520 ? 55 : radius < 650 ? 65 : 75 });
    }
  }
  R.curves = curves;
  for (const c of curves) for (let s = c.s0 - 40; s < c.s1 + 40; s += SEG) {
    const i = Math.floor(wrapS(s) / SEG) % N, u = (s - c.s0) / (c.s1 - c.s0);
    const e = Math.min(1, Math.max(0, Math.min(u * 4, (1 - u) * 4)));
    R.curve[i] += c.sign * (25 / c.R) * e * e * (3 - 2 * e);
  }
  // heights: gentle hills away from stations, a bridge, a tunnel
  const nearMarker = s => { let d = 1e9; for (const m of markers) { const q = Math.abs(wrapS(s - m + LEN / 2) - LEN / 2); if (q < d) d = q; } return d; };
  for (let i = 0; i <= N; i++) {
    const s = i * SEG, w = Math.min(1, Math.max(0, (nearMarker(s) - 180) / 280));
    const h = 4.5 * Math.sin(s / 1400 * Math.PI * 2 + .8) + 2.4 * Math.sin(s / 620 * Math.PI * 2 + 2.1);
    R.height[i] = Math.max(0, h + 4.4) * w * (STATIONS[intervalOf(s)].zone === 'hills' ? 1.3 : STATIONS[intervalOf(s)].zone === 'city' ? .35 : .8);
  }
  const bridge = [markers[5] + 350, markers[5] + 850], tunnel = [markers[8] + 420, markers[8] + 760];
  for (let i = 0; i < N; i++) {
    const s = i * SEG;
    if (s >= bridge[0] - 120 && s <= bridge[1] + 120) { const u = Math.min(1, Math.min(s - bridge[0] + 120, bridge[1] + 120 - s) / 140); R.height[i] = Math.max(R.height[i], 7 * u * u * (3 - 2 * u)); }
    if (s >= bridge[0] && s <= bridge[1]) R.flag[i] |= 2;
    if (s >= tunnel[0] && s <= tunnel[1]) R.flag[i] |= 1;
  }
  R.height[N] = R.height[0]; R.curve[N] = R.curve[0];
  R.bridge = bridge; R.tunnel = tunnel;
  // limits
  const lim = new Float32Array(N + 2).fill(100);
  for (let i = 0; i < N; i++) {
    const s = i * SEG; let l = 100;
    for (let k = 0; k < markers.length; k++) {
      const dn = wrapS(markers[k] - s), dp = wrapS(s - markers[k]);
      if (dn < 300) l = Math.min(l, 65); else if (dn < 620) l = Math.min(l, 90);
      if (dp < 120) l = Math.min(l, 60); else if (dp < 400) l = Math.min(l, 85);
    }
    for (const c of curves) { const d = Math.min(wrapS(s - (c.s0 - 60)), 1e9); if (d <= c.s1 - c.s0 + 120) l = Math.min(l, c.lim); }
    lim[i] = l;
  }
  R.limit = lim;
  // limit signs where the limit changes
  for (let i = 0; i < N; i++) { const p = lim[(i + N - 1) % N]; if (lim[i] !== p) { const sg = { s: i * SEG, limit: lim[i], x: 2.0 }; R.signs.push(sg); addThing(sg.s - 2, { k: 'limit', x: 2.0, limit: lim[i], ref: sg }); } }
  // stations: platforms, canopy, building, boards, people, distance boards, marker
  for (const st of R.stations) {
    const m = st.s;
    addStrip(m - 150, m + 30, { x0: -8.6, x1: -1.75, y0: 0, y1: 1.1, kind: 'platform', side: '#8f959c', top: '#b9bec4', edge: '#f0f0f0', tact: '#e8c53a' });
    addStrip(m - 150, m + 30, { x0: 5.5, x1: 12, y0: 0, y1: 1.1, kind: 'platform', side: '#8f959c', top: '#b2b7bd', edge: '#f0f0f0', tact: '#e8c53a' });
    addStrip(m - 120, m - 20, { x0: -7.7, x1: -2.5, y0: 3.8, y1: 4.15, kind: 'canopy', side: '#d8dde2', top: '#c9cfd6', under: '#7a8590' });
    addStrip(m - 135, m + 10, { x0: -16, x1: -10, y0: 0, y1: 8.5, kind: 'building', side: '#cfc5b4', top: '#8a8f99', win: '#3b4d63', lit: '#ffe9a0' });
    for (let d = -115; d <= -25; d += 18) { addThing(m + d, { k: 'pillar', x: -2.7 }); addThing(m + d + 9, { k: 'lamp', x: -2.1 }); }
    addThing(m - 90, { k: 'nameboard', x: -2.9, text: st.name }); addThing(m - 10, { k: 'nameboard', x: -2.9, text: st.name });
    for (const d of [300, 200, 100]) addThing(m - d, { k: 'distboard', x: 2.0, n: d / 100 });
    addThing(m, { k: 'marker', x: -1.55 });
    st.crowd = [];
    for (let q = 0; q < 12; q++) { const p = { k: 'person', x: -2.4 - rng() * 3.2, c: ['#d04a4a', '#3a66c4', '#e0b53a', '#4aa86a', '#8a52b8', '#222a36', '#e8e8e8'][Math.floor(rng() * 7)], ph: rng() * 6.28, h: 1.55 + rng() * .3 }; addThing(m - 140 + rng() * 150, p); st.crowd.push(p); }
    st.dwellRush = false;
  }
  // crossings and horn boards
  for (const c of [{ s: markers[1] + 430 }, { s: markers[3] + 500 }, { s: markers[6] + 650 }, { s: markers[9] + 430 }, { s: markers[11] + 400 }]) {
    const i = Math.floor(c.s / SEG);
    R.flag[i] |= 4; R.flag[i + 1] |= 4; c.i = i; c.id = R.crossings.length; c.obstructed = false; c.cleared = false; R.crossings.push(c);
    addThing(c.s - 250, { k: 'horn', x: 2.0 });
    R.horns.push({ s: c.s - 250, at: c.s, kind: 'crossing', id: c.id });
    addThing(c.s - 6, { k: 'gate', x: -3.0, ref: c }); addThing(c.s - 6, { k: 'gate', x: 5.5, ref: c });
    for (let q = 0; q < 3; q++) addThing(c.s - 9 - q * 4, { k: 'car', x: -6.8, c: ['#c33', '#36c', '#ddd', '#3a3', '#da2'][q % 5], side: -1, ref: c });
  }
  R.horns.push({ s: tunnel[0] - 250, at: tunnel[0], kind: 'tunnel', id: 'tun' }); addThing(tunnel[0] - 250, { k: 'horn', x: 2.0 });
  // signals
  let sid = 0;
  for (let k = 0; k < STATIONS.length; k++) {
    const a = markers[k], b = k + 1 < STATIONS.length ? markers[k + 1] : markers[0] + LEN;
    for (let s = a + 420; s < b - 520; s += 420) {
      const i = Math.floor(s / SEG);
      if ((R.flag[i] & 4) || (R.flag[i + 1] & 4)) continue;
      const sg = { id: sid++, s: i * SEG, aspect: 'G', interval: k };
      R.signals.push(sg); addThing(sg.s, { k: 'signal', x: 2.0, ref: sg });
    }
  }
  // scenery per interval
  for (let k = 0; k < STATIONS.length; k++) {
    const z = STATIONS[k].zone, a = markers[k] + 170, b = (k + 1 < STATIONS.length ? markers[k + 1] : markers[0] + LEN) - 170;
    for (const side of [-1, 1]) {
      let s = a;
      while (s < b) {
        const here = Math.floor(wrapS(s) / SEG) % N, inTunnel = R.flag[here] & 1;
        if (inTunnel) { s += 20; continue; }
        if (z === 'city') {
          const len = 24 + rng() * 40, h = 10 + rng() * 30, near = rng() < .55 ? 10.5 : 15;
          const c = BLD[Math.floor(rng() * BLD.length)];
          addStrip(s, s + len, { x0: side < 0 ? -near - 9 : near + 2, x1: side < 0 ? -near : near + 11, y0: 0, y1: h, kind: 'building', side: c, top: '#7c828c', win: '#35465c', lit: '#ffe9a0', seed: Math.floor(rng() * 1000) });
          if (rng() < .5) addStrip(s + 4, s + len - 6, { x0: side < 0 ? -near - 30 : near + 14, x1: side < 0 ? -near - 16 : near + 28, y0: 0, y1: h + 14 + rng() * 25, kind: 'building', side: BLD[Math.floor(rng() * BLD.length)], top: '#7c828c', win: '#35465c', lit: '#ffe9a0', seed: Math.floor(rng() * 1000) });
          s += len + 2 + rng() * 10;
        } else if (z === 'suburb') {
          const len = 8 + rng() * 6, h = 4.5 + rng() * 2;
          addStrip(s, s + len, { x0: side < 0 ? -18 - rng() * 6 : 12 + rng() * 4, x1: side < 0 ? -11 : 21 + rng() * 6, y0: 0, y1: h, kind: 'house', side: ['#f0e4cc', '#e8cfa8', '#d9e0e8', '#efd6d0'][Math.floor(rng() * 4)], top: ROOF[Math.floor(rng() * 4)], win: '#3b5570', lit: '#ffe9a0', seed: Math.floor(rng() * 1000) });
          if (rng() < .7) addThing(s + 2, { k: 'tree', x: side * (7 + rng() * 3), h: 5 + rng() * 3, c: '#3f8a47' });
          s += len + 6 + rng() * 14;
        } else if (z === 'park') {
          addThing(s, { k: 'tree', x: side * (6 + rng() * 22), h: 6 + rng() * 7, c: ['#3a8a44', '#4ea04a', '#e8a0b0', '#2f7a3c'][Math.floor(rng() * 4)] });
          if (rng() < .25) addThing(s + 3, { k: 'lamp', x: side * 5.5 });
          s += 6 + rng() * 14;
        } else if (z === 'harbor') {
          if (rng() < .55) { const len = 6 + rng() * 8; addStrip(s, s + len, { x0: side < 0 ? -14 - rng() * 4 : 10 + rng() * 3, x1: side < 0 ? -9 : 15 + rng() * 4, y0: 0, y1: 2.6 + (rng() < .3 ? 2.6 : 0), kind: 'container', side: ['#c0392b', '#2a6fb0', '#e1a21f', '#3a8f5a', '#7a4fa0', '#d86a2a'][Math.floor(rng() * 6)], top: '#6a727a', seed: Math.floor(rng() * 100) }); s += len + 1; }
          else { addThing(s, { k: side < 0 && rng() < .3 ? 'crane' : 'pole', x: side * (9 + rng() * 8), h: 22 }); s += 18 + rng() * 30; }
        } else {
          addThing(s, { k: 'pine', x: side * (5 + rng() * 26), h: 7 + rng() * 8, c: '#2d6a3e' });
          s += 5 + rng() * 11;
        }
      }
    }
  }
  // catenary masts every 50 m
  for (let s = 0; s < LEN; s += 50) { if (!(R.flag[Math.floor(s / SEG)] & 1)) addThing(s, { k: 'mast', x: 1.9, alt: Math.floor(s / 50) % 2 }); }
  R.cumHeading = new Float32Array(N + 2); let hd = 0; for (let i = 0; i <= N; i++) { R.cumHeading[i] = hd; hd += R.curve[i % N] * 1.4; }
  R.at = {
    curve: s => R.curve[Math.floor(wrapS(s) / SEG) % N],
    height: s => { s = wrapS(s); const i = Math.floor(s / SEG), f = s / SEG - i; return R.height[i] * (1 - f) + R.height[(i + 1) % N] * f; },
    grade: s => (R.at.height(s + 8) - R.at.height(s - 8)) / 16,
    limit: s => R.limit[Math.floor(wrapS(s) / SEG) % N],
    flags: s => R.flag[Math.floor(wrapS(s) / SEG) % N]
  };
  return R;
}
DH.route = build();
})();
