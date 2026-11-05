/* Densha de Halo! · 21-route-compiler: a route script (sorted [s, command, params] rows, section 4.2) becomes 5 m segments:
 * bend (the track's lateral position), height, grade, lanes, flags, and the lists of strips and things that touch them.
 * Designers write scripts; this turns them into geometry. Validation (validate()) checks the rules in section 4.2. */
(() => {
'use strict';
const DH = window.DH;
const SEG = DH.SEG;

const EASE = 50;   // metres over which a grade and a curve ease in and out

/* the zone sets: scenery kinds with weights, ground and backdrop. Buildings come from DH.Town (rail.js) */
DH.ZONES = {
  downtown:   { ground: '#6e6c6a', grass: '#7a7a72', houses: [['office', .4], ['store', .2], ['hotel', .2], ['tree', .2]], props: ['billboard', 'lamp', 'vend'], backdrop: 'city', density: 1.1 },
  'suburb-flowers': { ground: '#5ea23c', grass: '#4f9a3a', houses: [['house', .5], ['apartment', .3], ['greenhouse', .1], ['konbini', .1]], props: ['pole', 'flowers', 'paddy'], backdrop: 'hills', density: .9 },
  riverside:  { ground: '#4a7a3a', grass: '#3f7034', houses: [['shed', .6], ['tree', .4]], props: ['reed', 'boat'], backdrop: 'river', density: .5 },
  harbor:     { ground: '#4a4c52', grass: '#44464c', houses: [['warehouse', .5], ['container', .4], ['tree', .1]], props: ['crane', 'bollard', 'crate'], backdrop: 'sea', density: .8 },
  cliff:      { ground: '#6a7a4a', grass: '#5a7a40', houses: [['shed', .4], ['pine', .6]], props: ['rock', 'wall'], backdrop: 'sea', density: .6 },
  temple:     { ground: '#8a7a5a', grass: '#6a8a42', houses: [['machiya', .6], ['shop', .4]], props: ['lantern', 'maple', 'torii'], backdrop: 'hills', density: .8 },
  hills:      { ground: '#6a8a48', grass: '#58803e', houses: [['terrace', .7], ['cedar', .3]], props: ['retain', 'guard'], backdrop: 'sea', density: .6 },
  city:       { ground: '#5a5a62', grass: '#505058', houses: [['arcade', .4], ['tower', .4], ['apartment', .2]], props: ['sound', 'billboard'], backdrop: 'city', density: 1.0 },
  campus:     { ground: '#5a9a48', grass: '#4e8e40', houses: [['campus', .6], ['ginkgo', .4]], props: ['bike', 'lamp'], backdrop: 'city', density: .7 },
  park:       { ground: '#62a24e', grass: '#57944a', houses: [['pavilion', .3], ['sakura', .7]], props: ['bench', 'lantern', 'wheel'], backdrop: 'hills', density: .6 },
  'hills-north': { ground: '#4c7a3a', grass: '#40703a', houses: [['house', .5], ['cedar', .5]], props: ['pole'], backdrop: 'mountains', density: .5 },
  'river-north': { ground: '#7a8a50', grass: '#6a8042', houses: [['farm', .6], ['tree', .4]], props: ['reed', 'scarecrow'], backdrop: 'mountains', density: .4 },
  depot:      { ground: '#8a8478', grass: '#7a7a58', houses: [['depotshed', .6], ['tree', .4]], props: ['lamp'], backdrop: 'city', density: .5 }
};

/* the route scripts. Each row: [s, command, params]. Commands: zone, tracks, curve, grade, speed, limit, station, signal,
 * tunnel, bridge, crossing, horn, workers, overpass, viaduct, landmark, scenery. Units: metres; s wraps nowhere here: the
 * halo line runs from -300 (depot side of Akari) to 20700 (the terminal's far end). */
DH.ROUTES = {
  halo: {
    id: 'halo', name: 'Halo Line', from: -300, to: 20700,
    script: [
      [-300, 'zone', 'downtown'], [-300, 'tracks', { lanes: [{ id: 'A', x: 0 }, { id: 'B', x: 3.8 }] }], [-300, 'speed', { v: 85 }],
      [-230, 'station', { id: 'akari', name: 'AKARI CENTRAL', side: 'L', len: 245, stop: { 6: 0, 10: 8 }, melody: 'akari', crowd: 3, landmark: 'terminal' }],
      [60, 'signal', { id: 'AK-S', kind: 'start', track: 'A' }],
      [150, 'overpass', { w: 18, h: 7 }],
      [200, 'limit', { v: 45, until: 420 }], [520, 'curve', { len: 260, r: 900, dir: 'R' }],
      [700, 'zone', 'suburb-flowers'], [700, 'signal', { id: 'B101', kind: 'block', track: 'A' }],
      [880, 'limit', { v: 70, until: 1260 }], [900, 'curve', { len: 330, r: 500, dir: 'L' }],
      [1050, 'horn', {}], [1110, 'crossing', { id: 'X1', road: 6, cars: 3, peds: 2 }],
      [1250, 'signal', { id: 'B102', kind: 'block', track: 'A' }],
      [1380, 'signal', { id: 'HB-H', kind: 'home', track: 'A' }],
      [1420, 'station', { id: 'hanabatake', name: 'HANABATAKE', side: 'L', len: 190, stop: { 6: 1600 }, melody: 'hanabatake', crowd: 2, landmark: 'greenhouse' }],
      [1660, 'signal', { id: 'HB-S', kind: 'start', track: 'A' }],
      [1800, 'grade', { len: 300, permille: 8 }], [2150, 'signal', { id: 'B103', kind: 'block', track: 'A' }],
      [2300, 'horn', {}], [2450, 'limit', { v: 75, until: 3250 }], [2500, 'zone', 'riverside'],
      [2600, 'bridge', { len: 600, kind: 'truss', water: 'river' }],
      [2700, 'curve', { len: 400, r: 1200, dir: 'R' }], [2950, 'signal', { id: 'B104', kind: 'block', track: 'A' }],
      [3250, 'signal', { id: 'KJ-H', kind: 'home', track: 'A' }],
      [3290, 'station', { id: 'kujira', name: 'KUJIRA-BASHI', side: 'R', len: 175, stop: { 6: 3450 }, melody: 'kujira', crowd: 2, landmark: 'arch' }],
      [3640, 'signal', { id: 'KJ-S', kind: 'start', track: 'A' }],
      [3700, 'curve', { len: 300, r: 700, dir: 'L' }],
      [3900, 'signal', { id: 'B201', kind: 'block', track: 'A' }], [4300, 'signal', { id: 'B202', kind: 'block', track: 'A' }],
      [4880, 'signal', { id: 'MN-H', kind: 'home', track: 'A' }],
      [4925, 'station', { id: 'minato', name: 'MINATO-MAE', side: 'L', len: 190, stop: { 6: 5100 }, melody: 'minato', crowd: 2, landmark: 'crane' }],
      [5160, 'signal', { id: 'MN-S', kind: 'start', track: 'A' }],
      [5250, 'zone', 'harbor'], [5800, 'zone', 'cliff'], [5600, 'signal', { id: 'M5600', kind: 'block', track: 'A' }],
      [5950, 'horn', {}], [6000, 'signal', { id: 'M6000', kind: 'block', track: 'A' }],
      [6050, 'tunnel', { len: 500 }],
      [6100, 'curve', { len: 400, r: 400, dir: 'R' }],
      [6550, 'limit', { v: 60, until: 6900 }],
      [6600, 'signal', { id: 'B205', kind: 'block', track: 'A' }],
      [6850, 'signal', { id: 'TD-H', kind: 'home', track: 'A' }],
      [6900, 'station', { id: 'todai', name: 'TODAI-SHITA', side: 'L', len: 0, pass: true, melody: 'todai', crowd: 1, landmark: 'lighthouse' }],
      [7600, 'signal', { id: 'B207', kind: 'block', track: 'A' }],
      [7500, 'zone', 'temple'], [8480, 'signal', { id: 'OK-H', kind: 'home', track: 'A' }],
      [8530, 'station', { id: 'okiku', name: 'OKIKU-DERA', side: 'L', len: 185, stop: { 6: 8700 }, melody: 'okiku', crowd: 3, landmark: 'pagoda' }],
      [8900, 'signal', { id: 'OK-S', kind: 'start', track: 'A' }],
      [9050, 'crossing', { id: 'X2', road: 6, cars: 3, peds: 2 }],
      [9200, 'grade', { len: 1100, permille: 25 }],
      [9300, 'curve', { len: 300, r: 600, dir: 'R' }],
      [9450, 'horn', {}],
      [9600, 'workers', { until: 9900, limit: 25, lookout: 9550 }],
      [9900, 'curve', { len: 300, r: 450, dir: 'L' }],
      [9300, 'zone', 'hills'],
      [10330, 'station', { id: 'yuhi', name: 'YUHI-ZAKA', side: 'R', len: 190, stop: { 6: 10450 }, melody: 'yuhi', crowd: 2, landmark: 'shrine' }],
      [10700, 'grade', { len: 750, permille: -20 }],
      [10900, 'curve', { len: 300, r: 500, dir: 'L' }],
      [11150, 'signal', { id: 'OB-E', kind: 'block', track: 'A', obstruct: true }],
      [11400, 'horn', {}],
      [11500, 'crossing', { id: 'X3', road: 6, cars: 2, peds: 3, special: true }],
      [11650, 'tracks', { ramp: 150, lanes: [{ id: 'A', x: 0 }, { id: 'B', x: 14 }, { id: 'C', x: -7 }, { id: 'D', x: 7 }] }],
      [11700, 'viaduct', { len: 1500, h: 8 }],
      [11900, 'station', { id: 'shotengai', name: 'SHOTENGAI', side: 'I', len: 245, stop: { 6: 12100, 10: 12108 }, melody: 'shotengai', crowd: 3, landmark: 'arcade' }],
      [12400, 'curve', { len: 400, r: 800, dir: 'R' }],
      [12170, 'signal', { id: 'SG-S', kind: 'start', track: 'A' }],
      [13000, 'signal', { id: 'B401', kind: 'block', track: 'A' }],
      [13480, 'station', { id: 'daigaku', name: 'DAIGAKU-MAE', side: 'I', len: 245, stop: { 6: 13700, 10: 13708 }, melody: 'daigaku', crowd: 3, landmark: 'clocktower' }],
      [13500, 'signal', { id: 'DG-H', kind: 'home', track: 'A' }], [13770, 'signal', { id: 'DG-S', kind: 'start', track: 'A' }],
      [14000, 'curve', { len: 400, r: 1000, dir: 'L' }], [14350, 'horn', {}],
      [14400, 'signal', { id: 'B403', kind: 'block', track: 'A' }],
      [15080, 'station', { id: 'koen', name: 'SAKURA-KOEN', side: 'I', len: 245, stop: { 6: 15300, 10: 15308 }, melody: 'koen', crowd: 3, landmark: 'wheel' }],
      [15100, 'signal', { id: 'KO-H', kind: 'home', track: 'A' }],
      [15600, 'tracks', { ramp: 150, lanes: [{ id: 'A', x: 0 }, { id: 'B', x: 3.8 }] }],
      [15700, 'curve', { len: 400, r: 600, dir: 'R' }],
      [15750, 'zone', 'park'],
      [16100, 'grade', { len: 800, permille: 15 }], [16200, 'fog', {}],
      [16980, 'station', { id: 'hoshimi', name: 'HOSHIMI-DAI', side: 'L', len: 190, stop: { 6: 17100 }, melody: 'hoshimi', crowd: 2, landmark: 'dome' }],
      [16000, 'zone', 'hills-north'],
      [17500, 'grade', { len: 700, permille: -12 }], [17800, 'curve', { len: 300, r: 700, dir: 'L' }],
      [18680, 'station', { id: 'kawasemi', name: 'KAWASEMI', side: 'R', len: 190, stop: { 6: 18800 }, melody: 'kawasemi', crowd: 2, landmark: 'paddy' }],
      [18000, 'zone', 'river-north'],
      [19100, 'horn', {}], [19200, 'bridge', { len: 300, kind: 'girder', water: 'river' }],
      [19700, 'zone', 'downtown'],
      [20150, 'overpass', { w: 18, h: 7 }],
      [20200, 'limit', { v: 45, until: 20600 }],
      [20350, 'signal', { id: 'AK-H', kind: 'home', track: 'A', forced: 'YY' }],
      [20370, 'station', { id: 'akari-end', name: 'AKARI CENTRAL', side: 'L', len: 245, stop: { 6: 20600, 10: 20608 }, melody: 'akari', crowd: 3, landmark: 'terminal' }]
    ]
  },
  depot: {
    id: 'depot', name: 'Depot Line', from: 0, to: 1000,
    script: [
      [0, 'zone', 'depot'], [0, 'tracks', { lanes: [{ id: 'A', x: 0 }] }], [0, 'speed', { v: 40 }],
      [40, 'signal', { id: 'DP-S', kind: 'shunt', track: 'A' }],
      [300, 'mark', { id: 'mark1', at: 300, label: '1' }], [400, 'curve', { len: 200, r: 800, dir: 'L' }],
      [620, 'mark', { id: 'mark2', at: 620, label: '2' }], [900, 'mark', { id: 'mark3', at: 900, label: '3' }],
      [860, 'station', { id: 'depotgate', name: 'DEPOT GATE', side: 'L', len: 60, stop: {}, melody: 'todai', crowd: 0, landmark: 'depotgate' }]
    ]
  }
};

/* the compiler. Returns a route: { id, name, from, to, len, segs: [{ s0, bend, y0, y1, g0, g1, grade, lanes, flags, zone, strips, things }],
 * signals, stations, limits, calls, horns, crossings, marks, ... } */
DH.compileRoute = (def) => {
  const from = def.from, to = def.to, n = Math.round((to - from) / SEG);
  const segs = [];
  for (let k = 0; k < n; k++) segs.push({ k, s0: from + k * SEG, bend: 0, y0: 0, y1: 0, g0: 0, g1: 0, grade: 0, lanes: null, zone: null, flags: {}, strips: [], things: [], lineSpeed: 85 });
  const at = s => { const k = Math.floor((s - from) / SEG); return k >= 0 && k < n ? k : -1; };
  // pass 1: range commands write per-segment state
  const script = def.script.slice().sort((a, b) => a[0] - b[0]);
  const route = { id: def.id, name: def.name, from, to, len: to - from, segs, signals: [], stations: [], limits: [], calls: [], horns: [], crossings: [], marks: [], workers: [], landmarks: [], script };
  const setRange = (s0, len, fn) => { for (let s = s0; s < s0 + len; s += SEG) { const k = at(s); if (k >= 0) fn(segs[k], s); } };
  let lineSpeed = 85;
  // grades and curves are accumulated over the segments in order
  const grade = new Float64Array(n), curve = new Float64Array(n);
  for (const [s, cmd, p] of script) {
    if (cmd === 'curve') {
      const L = Math.abs(p.r) > 0 ? SEG / p.r : 0, sg = p.dir === 'R' ? 1 : -1, len = p.len;
      for (let s2 = s; s2 < s + len; s2 += SEG) {
        const k = at(s2); if (k < 0) continue;
        const u = Math.min((s2 - s) / EASE, (s + len - s2) / EASE, 1);   // ease the curve in and out
        curve[k] += sg * L * Math.max(0, u);
      }
    }
    if (cmd === 'grade') {
      for (let s2 = s; s2 < s + p.len; s2 += SEG) {
        const k = at(s2); if (k < 0) continue;
        const u = Math.min((s2 - s) / EASE, (s + p.len - s2) / EASE, 1);
        grade[k] += p.permille * Math.max(0, u);
      }
    }
  }
  // the curve's heading recovers after each bend (eased), so the line runs back straight between curves
  let heading = 0;
  for (let k = 0; k < n; k++) {
    heading += curve[k];
    const back = Math.sign(heading) * Math.min(Math.abs(heading), 0.0035);
    if (Math.abs(curve[k]) < 1e-9) heading -= back;
    segs[k].heading = heading;
  }
  let x = 0;
  for (let k = 0; k < n; k++) { x += SEG * Math.sin(segs[k].heading); segs[k].bend = x; }
  // heights: grade per segment, eased in and out
  let y = 0;
  for (let k = 0; k < n; k++) {
    segs[k].grade = grade[k];
    segs[k].y0 = y; y += SEG * grade[k] / 1000; segs[k].y1 = y;
  }
  // pass 2: the commands that set state, in order, and the things they place
  for (const [s, cmd, p] of script) {
    if (cmd === 'zone') (route.zoneStart = route.zoneStart || []).push([s, p]);
    if (cmd === 'speed') lineSpeed = p.v;
    if (cmd === 'tracks') (route.laneCmds = route.laneCmds || []).push({ s, ramp: p.ramp || 0, lanes: p.lanes });
    if (cmd === 'limit') route.limits.push({ s, v: p.v, end: p.until || null, id: 'L' + s });
    if (cmd === 'station') {
      const st = Object.assign({ start: s, end: s + p.len, pass: !!p.pass }, p);
      route.stations.push(st);
      setRange(s, p.len, seg => { seg.flags.station = st.id; });
      if (p.stop) for (const [count, at2] of Object.entries(p.stop)) (st.stops = st.stops || {})[count] = at2;
    }
    if (cmd === 'signal') {
      route.signals.push({ id: p.id, s, kind: p.kind, track: p.track || 'A', obstruct: !!p.obstruct, forced: p.forced || null });
    }
    if (cmd === 'tunnel') setRange(s, p.len, seg => { seg.flags.tunnel = true; });
    if (cmd === 'bridge') setRange(s, p.len, seg => { seg.flags.bridge = true; seg.flags.water = p.water || 'river'; });
    if (cmd === 'viaduct') setRange(s, p.len, seg => { seg.flags.viaduct = p.h; });
    if (cmd === 'crossing') {
      route.crossings.push({ id: p.id, s, road: p.road, cars: p.cars, peds: p.peds, special: !!p.special });
      setRange(s, 8, seg => { seg.flags.crossing = p.id; });
    }
    if (cmd === 'horn') route.horns.push({ s, zone: 150 });
    if (cmd === 'workers') { route.workers.push({ s, until: p.until, limit: p.limit, lookout: p.lookout }); route.limits.push({ s, v: p.limit, end: p.until, id: 'W' + s }); setRange(s, p.until - s, seg => { seg.flags.workers = true; }); }
    if (cmd === 'overpass') setRange(s, SEG * 4, seg => { seg.flags.overpass = p.h; });
    if (cmd === 'mark') route.marks.push({ id: p.id, s: p.at, label: p.label });
    if (cmd === 'fog') setRange(s, 600, seg => { seg.flags.fog = true; });
    if (cmd === 'landmark') route.landmarks.push(Object.assign({}, p, { s }));
  }
  // every segment: its zone (the last zone command at or before it), its lanes (the last tracks command at or before it,
  // tweened from the lanes before over its ramp) and its line speed (the last speed command, or the route default)
  const zones = (route.zoneStart || []).slice().sort((a, b) => a[0] - b[0]), cmds = (route.laneCmds || []).slice().sort((a, b) => a.s - b.s);
  const speeds = script.filter(r => r[1] === 'speed').map(r => [r[0], r[2].v]);
  let prevLanes = [{ id: 'A', x: 0 }, { id: 'B', x: 3.8 }];
  for (let k = 0; k < n; k++) {
    const s = segs[k].s0;
    let z = zones.length ? zones[0][1] : 'downtown';
    for (const [zs, zn] of zones) if (zs <= s) z = zn;
    segs[k].zone = z;
    let sp = def.defaultSpeed || 85;
    for (const [ss, v] of speeds) if (ss <= s) sp = v;
    segs[k].lineSpeed = sp;
    let cur = null, prev = null;
    for (const c of cmds) if (c.s <= s) { prev = cur; cur = c; }
    if (!cur) { segs[k].lanes = prevLanes.map(l => Object.assign({}, l)); continue; }
    const before = prev ? prev.lanes.map(l => ({ id: l.id, x: l.x })) : prevLanes;
    const u = cur.ramp ? DH.clamp((s - cur.s) / cur.ramp, 0, 1) : 1;
    segs[k].lanes = cur.lanes.map(l => {
      const old = before.find(o => o.id === l.id);
      const x0 = old ? old.x : l.x;
      return { id: l.id, x: x0 + (l.x - x0) * u };
    });
    prevLanes = segs[k].lanes;
  }
  route.lineSpeedAt = s => { const k = at(s); return k < 0 ? 85 : segs[k].lineSpeed; };
  route.at = at;
  route.segAt = s => { const k = at(s); return k < 0 ? null : segs[k]; };
  route.heightAt = s => { const k = at(s); if (k < 0) return 0; const seg = segs[k], u = (s - seg.s0) / SEG; return seg.y0 + (seg.y1 - seg.y0) * u; };
  route.bendAt = s => { const k = at(s); if (k < 0) return 0; const seg = segs[k], u = (s - seg.s0) / SEG; const b1 = k + 1 < n ? segs[k + 1].bend : seg.bend; return seg.bend + (b1 - seg.bend) * u; };
  route.gradeAt = s => { const k = at(s); return k < 0 ? 0 : segs[k].grade; };
  route.sigById = id => route.signals.find(g => g.id === id);
  route.stationById = id => route.stations.find(g => g.id === id);
  route.stopOf = (id, count) => { const st = route.stationById(id); return st && st.stops ? st.stops[count] : undefined; };
  route.laneX = (s, id) => { const k = at(s); if (k < 0) return 0; const L = segs[k].lanes.find(l => l.id === id); return L ? L.x : 0; };
  return route;
};

/* checks from section 4.2: every stop fits its platform; home signals stand before the platform; every limit ends; block
 * boundaries increase. Returns a list of problems (empty when the route is good) */
DH.validateRoute = (route) => {
  const bad = [];
  let last = -Infinity;
  for (const st of route.stations) {
    if (st.pass) continue;
    if (st.stops) for (const [count, s] of Object.entries(st.stops)) {
      const need = st.start + 20 * Number(count);
      if (s < need || s > st.end + 0.5) bad.push(`stop ${count} of ${st.id} at ${s} lies outside its platform [${need}, ${st.end}]`);
    }
  }
  for (const sg of route.signals) if (sg.kind === 'home') {
    const st = route.stations.find(x => !x.pass && x.start > sg.s && x.start - sg.s < 400);
    if (!st && route.stations.some(x => !x.pass && x.start - sg.s < 400 && x.start - sg.s > -1)) bad.push(`home ${sg.id} is not before its platform`);
  }
  for (const l of route.limits) if (!l.end) bad.push(`limit at ${l.s} never ends`);
  const blocks = route.signals.filter(x => x.kind !== 'shunt').sort((a, b) => a.s - b.s);
  for (const b of blocks) { if (b.s <= last) bad.push(`block boundary ${b.id} at ${b.s} is out of order`); last = b.s; }
  return bad;
};
})();
