/* 21-route-compiler: route scripts (sorted [s, command, params]) into a compiled route: 5 m segments with their bends,
 * heights, zones, tracks and the strips and things that touch them, plus the rule data the systems read (signals and
 * their blocks per track, limits, line speeds, stations, horn zones, crossings, workers, call points).
 * Commands: zone, track, curve, grade, line, limit, signal, station, tunnel, bridge, crossing, horn, workers, overpass,
 * viaduct, landmark, scenery, wall, emitter, board, fog (data only). On a loop, s wraps (negative s counts from the end). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, L = DH.L;
const easeIO = u => u <= 0 ? 0 : u >= 1 ? 1 : (1 - Math.cos(u * Math.PI)) / 2;

function compile(def) {
  const len = def.length, loop = !!def.loop, n = Math.round(len / L), A = DH.Art;
  const W = s => loop ? ((s % len) + len) % len : s;
  const R = { id: def.id, name: def.name, length: len, loop, L, wrap: s => loop ? ((s % len) + len) % len : s, segs: [], zones: {}, strips: [], things: [], signals: {}, limits: [], lines: [], stations: [], horns: [], crossings: [], workers: [], tunnels: [], bridges: [], calls: [], emitters: [], boards: [], fog: [], occupied: [], landmarks: [], viaducts: [] };
  for (const id in DH.ZONES) R.zones[id] = DH.ZONES[id];
  R.zones.default = DH.ZONES[def.defaultZone || 'suburb'];
  for (let i = 0; i < n; i++) R.segs.push({ i, s: i * L, curve: 0, y0: 0, y1: 0, hd: 0, zone: def.defaultZone || 'suburb', flags: {}, tracks: [], items: [], gy: 0 });
  const segOf = s => { const i = Math.floor(W(s) / L); return R.segs[loop ? ((i % n) + n) % n : E.clamp(i, 0, n - 1)]; };
  const span = (a, b, fn) => { for (let s = a; s < b; s += L) fn(segOf(s), s); };
  const script = def.script.map(([s, cmd, p]) => [loop ? W(s) : s, cmd, p || {}, s]).sort((a, b) => a[0] - b[0]);
  // ---- zones ----
  const zones = script.filter(c => c[1] === 'zone');
  if (zones.length) for (const sg of R.segs) { let z = zones[zones.length - 1][2]; for (const c of zones) if (c[0] <= sg.s) z = c[2]; sg.zone = typeof z === 'string' ? z : z.id; }
  for (const c of script) if (c[1] === 'zone' && typeof c[2] === 'object' && c[2].id === undefined) c[2] = c[2];
  // ---- curves (eased over 20 m at each end) ----
  for (const [s, cmd, p] of script) if (cmd === 'curve') {
    const c = (p.dir === 'L' ? -1 : 1) * L * L / p.r, e = Math.min(20, p.len / 3);
    span(s, s + p.len, (sg, x) => { const u = x - s, k = Math.min(1, u / e, (p.len - u) / e); sg.curve += c * Math.max(0, k); });
  }
  // headings: the bends added up (radians: curve / L a segment)
  { let h = 0; for (const sg of R.segs) { sg.hd = h; h += sg.curve / L; } R.turn = h; }
  // ---- grades (eased over 50 m at each end), then heights; a loop's closure error spread over its level track ----
  const slope = new Float64Array(n), graded = new Uint8Array(n);
  for (const [s, cmd, p] of script) if (cmd === 'grade') {
    // eased over 50 m centred on each end, so the climb is exactly permille x len
    const g = p.permille / 1000, e = Math.min(50, p.len / 3);
    for (let x = s - e / 2; x < s + p.len + e / 2; x += L) { const u = x - (s - e / 2) + L / 2, k = Math.min(1, u / e, (p.len + e - u) / e), i = segOf(x).i; slope[i] += g * Math.max(0, k); graded[i] = 1; }
  }
  if (loop) { let net = 0, free = 0; for (let i = 0; i < n; i++) { net += slope[i] * L; if (!graded[i]) free++; } if (free) for (let i = 0; i < n; i++) if (!graded[i]) slope[i] -= net / (free * L); }
  { let y = def.y0 || 0; for (let i = 0; i < n; i++) { const sg = R.segs[i]; sg.y0 = y; y += slope[i] * L; sg.y1 = y; sg.grade = slope[i] * 1000; } R.closure = y - (def.y0 || 0); }
  // ---- tracks: each id's lateral x as keyframes; a segment gets every track present at both its ends ----
  // stations that need the tracks moved: an island spreads the other track out; a loop station gets its passing loop
  for (const [st, cmd, p] of script.slice()) if (cmd === 'station') {
    const e = st + (p.len || 180);
    if (p.side === 'R' || p.side === 'terminal') script.push([W(st - 110), 'track', { id: 'B', x: 3.8, to: 7.2, len: 80 }], [W(e + 30), 'track', { id: 'B', x: 7.2, to: 3.8, len: 80 }]);
    if (p.side === 'loop') script.push([W(st - 160), 'track', { id: 'LP', from: 0, x: 0, to: -7.4, len: 110, kind: 'side' }], [W(e + 50), 'track', { id: 'LP', x: -7.4, to: 0, len: 110 }], [W(e + 160), 'track', { id: 'LP', end: true }]);
  }
  script.sort((a, b) => a[0] - b[0]);
  const TK = {};
  for (const t of def.tracks || []) TK[t.id] = { keys: [{ s: t.s === undefined ? 0 : t.s, x: t.x, to: t.x, len: 0 }], el: t.el !== false, kind: t.kind || 'main', end: t.end === undefined ? null : t.end, bed: t.bed };
  for (const [s, cmd, p, raw] of script) if (cmd === 'track') {
    const t = TK[p.id] || (TK[p.id] = { keys: [], el: p.el !== false, kind: p.kind || 'main', end: null, bed: p.bed });
    if (p.end) { t.end = s; continue; }
    if (!t.keys.length || p.from !== undefined) t.start = s;
    t.keys.push({ s, x: p.from !== undefined ? p.from : p.x, to: p.to === undefined ? p.x : p.to, len: p.len || 0 });
    if (p.kind) t.kind = p.kind; if (p.el === false) t.el = false;
  }
  for (const id in TK) TK[id].keys.sort((a, b) => a.s - b.s);
  const txAt = (t, s) => {   // x of a track at s, or null where it doesn't run
    if (t.start !== undefined && s < t.start - 1e-6) return null;
    if (t.end !== null && t.end !== undefined && s >= t.end) return null;
    let x = null; for (const k of t.keys) { if (k.s > s + 1e-6) break; x = k.len ? k.x + (k.to - k.x) * easeIO((s - k.s) / k.len) : k.to; }
    return x;
  };
  // on a loop a track starts where it ended the lap before (a station spread across the seam stays spread)
  if (loop) for (const id in TK) { const t = TK[id]; if (t.start === undefined && t.keys.length > 1 && (t.end === null || t.end === undefined)) { const x = txAt(t, len - 1e-3); t.keys[0].x = t.keys[0].to = x; } }
  for (const sg of R.segs) for (const id in TK) {
    const t = TK[id], a = txAt(t, sg.s), b = txAt(t, sg.s + L - 1e-6);
    if (a !== null && b !== null) sg.tracks.push({ id, x0: a, x1: b, el: t.el, kind: t.kind, bed: t.bed });
  }
  R.trackX = (id, s) => { const t = TK[id]; return t ? txAt(t, W(s)) : null; };
  R.trackIds = Object.keys(TK);
  // the lateral extent the tracks take at s (scenery keeps out of it)
  const extent = sg => { let a = 1e9, b = -1e9; for (const t of sg.tracks) { a = Math.min(a, t.x0, t.x1); b = Math.max(b, t.x0, t.x1); } return a > b ? [0, 0] : [a, b]; };
  // ---- placing things and strips ----
  const addThing = th => { if (!th) return th; th.s = W(th.s); segOf(th.s).items.push(th); R.things.push(th); return th; };
  const addStrip = st => {
    if (!st) return st; if (Array.isArray(st)) { st.forEach(addStrip); return st; }
    if (st._len === undefined) st._len = st.s1 - st.s0;
    if (loop) { st.s0 = W(st.s0); st.s1 = st.s0 + st._len; } R.strips.push(st);
    const a = st.s0, b = st.s1; for (let s = Math.floor(a / L) * L; s < b; s += L) { const sg = segOf(s); if (!sg.items.includes(st)) sg.items.push(st); }
    return st;
  };
  R.addThing = addThing; R.addStrip = addStrip;
  const occupy = (a, b, x0, x1, what) => R.occupied.push({ a: W(a), b: W(a) + (b - a), x0, x1, what });
  const isOcc = (s, x) => { for (const o of R.occupied) { let d = W(s) - o.a; if (loop && d < 0) d += len; if (d >= 0 && d < o.b - o.a && x >= o.x0 && x <= o.x1) return o; } return null; };
  R.isOcc = isOcc;
  const ctx = { R, W, segOf, span, addThing, addStrip, occupy, extent, A, def };
  // ---- commands ----
  let lineV = def.lineSpeed || 85;
  for (const [s, cmd, p, raw] of script) {
    switch (cmd) {
      case 'line': R.lines.push({ s, v: p.v }); break;
      case 'limit': {
        const until = p.until === undefined ? s + (p.len || 300) : (loop ? W(p.until) + (W(p.until) < s ? len : 0) : p.until);
        const tr = p.track || 'A', lim = { id: p.id || 'L' + Math.round(s) + tr, s, until, v: p.v, track: tr, curve: !!p.curve, slow: !!p.slow };
        R.limits.push(lim);
        if (!p.noBoard) {
          const x = (R.trackX(tr, s) || 0) - 2.3;
          lim.board = addThing(A.thing(p.slow ? 'slowBoard' : 'limitBoard', { s, x, v: p.v, pick: 'lim:' + lim.id }));
          addThing(A.thing(p.slow ? 'slowEnd' : 'endBoard', { s: until, x: (R.trackX(tr, until) || 0) - 2.3 }));
          R.calls.push({ id: 'lim:' + lim.id, s, kind: 'limit', track: tr, v: p.v, x });
        }
        break;
      }
      case 'signal': {
        const trs = p.tracks || [p.track || 'A'];
        for (const tr of trs) {
          const id = trs.length > 1 && tr !== 'A' ? p.id + '/' + tr : p.id, x = (R.trackX(tr, s) || 0) + (p.side === 'R' ? 2.2 : -2.2);
          const sig = { id, s, kind: p.kind || 'block', track: tr, x, aspect: 'R', force: p.force || null, beacon: s - 600, station: p.station || null };
          (R.signals[tr] = R.signals[tr] || []).push(sig);
          sig.thing = addThing(A.thing(p.kind === 'shunt' ? 'shuntSignal' : 'signal', { s, x, sig, pick: 'sig:' + id }));
          if (p.kind !== 'shunt' && s - 600 > (loop ? -1e9 : 0)) addThing(A.thing('beacon', { s: s - 600, x: R.trackX(tr, s - 600) || 0 }));
          R.calls.push({ id: 'sig:' + id, s, kind: 'signal', sig, track: tr, x });
        }
        break;
      }
      case 'station': DH.buildStation(ctx, s, p); break;
      case 'tunnel': {
        const a = s, b = s + p.len; R.tunnels.push({ s0: a, s1: b, id: p.id || 'T' + Math.round(s) });
        span(a, b, sg => { sg.flags.tunnel = true; });
        DH.buildTunnel(ctx, a, b, p); occupy(a - 30, b + 30, -60, 60, 'tunnel');
        break;
      }
      case 'bridge': {
        const a = s, b = s + p.len; R.bridges.push({ s0: a, s1: b, kind: p.kind || 'truss', water: p.water });
        span(a, b, sg => { sg.flags.bridge = true; if (p.water) sg.flags.water = true; sg.gy = -(p.drop || 8); });
        DH.buildBridge(ctx, a, b, p); occupy(a - 10, b + 10, -80, 80, 'bridge');
        break;
      }
      case 'viaduct': {
        const a = s, b = s + p.len, h = p.h || 8; R.viaducts.push({ s0: a, s1: b, h });
        span(a - 40, b + 40, (sg, x) => { const u = Math.min(1, Math.max(0, (x - a + 40) / 40), Math.max(0, (b + 40 - x) / 40)); sg.gy = Math.min(sg.gy || 0, -h * easeIO(u)); sg.flags.viaduct = u > .5; });
        DH.buildViaduct(ctx, a, b, p);
        break;
      }
      case 'crossing': DH.buildCrossing(ctx, s, p); break;
      case 'horn': {
        R.horns.push({ id: p.id || 'H' + Math.round(s), s, len: p.len || 150, track: p.track || 'A' });
        addThing(A.thing('hornBoard', { s, x: (R.trackX(p.track || 'A', s) || 0) - 2.3 }));
        break;
      }
      case 'workers': DH.buildWorkers(ctx, s, p); break;
      case 'overpass': addStrip(A.strips('overpass', { s, w: p.w || 14, h: p.h || 7, kind: p.kind || 'road', ext: extent(segOf(s)) })); break;
      case 'landmark': { const th = addThing(A.thing(p.id, Object.assign({ s, x: p.x }, p))); R.landmarks.push(th); occupy(s - (p.clear || 40), s + (p.clear || 40), Math.min(p.x - 30, p.x * 1.5), Math.max(p.x + 30, p.x * 1.5), 'landmark'); break; }
      case 'scenery': {
        const what = p.strip ? addStrip(A.strips(p.strip, Object.assign({ s }, p))) : addThing(A.thing(p.thing, Object.assign({ s }, p)));
        if (p.occupy) occupy(s - p.occupy, s + p.occupy, p.x - 20, p.x + 20, p.thing || p.strip);
        break;
      }
      case 'wall': addStrip(A.strips('wall', Object.assign({ s }, p))); break;
      case 'emitter': {
        const em = { id: p.id, s, crossing: p.crossing, x: (R.trackX('A', s) || 0) - 2.4, on: false };
        R.emitters.push(em); em.thing = addThing(A.thing('emitter', { s, x: em.x, em, pick: 'emit:' + p.id }));
        break;
      }
      case 'board': {
        const b = addThing(A.thing(p.kind, Object.assign({ s, x: (R.trackX(p.track || 'A', s) || 0) - 2.3 }, p)));
        R.boards.push(Object.assign({ s, thing: b }, p));
        if (p.call) R.calls.push({ id: p.call, s, kind: p.kind, track: p.track || 'A', x: b.x, station: p.station });
        break;
      }
      case 'fog': R.fog.push({ s0: s, s1: s + p.len, density: p.density || 3 }); break;
    }
  }
  for (const tr in R.signals) R.signals[tr].sort((a, b) => a.s - b.s);
  R.lines.sort((a, b) => a.s - b.s); R.limits.sort((a, b) => a.s - b.s); R.calls.sort((a, b) => a.s - b.s);
  R.lineAt = s => { s = W(s); let v = def.lineSpeed || 85; if (loop && R.lines.length) v = R.lines[R.lines.length - 1].v; for (const l of R.lines) if (l.s <= s) v = l.v; return v; };
  // ---- auto: masts every 50 m, km posts every 100 m, poles and walls, zone scenery per 50 m cell per side ----
  DH.autoScenery(ctx);
  R.validation = validate(R, def);
  return R;
}

/** checks the designer's route: stations in order, every stop fits the train, home signals before their platforms,
 *  every limit ends, blocks strictly increasing, no signal in a portal, each stage's stops on the route */
function validate(R, def) {
  const errs = [], W = s => R.loop ? ((s % R.length) + R.length) % R.length : s;
  let last = -1;
  for (const st of R.stations) {
    if (!def.unordered && st.s0 < last) errs.push('station ' + st.id + ' is out of order');
    last = st.s0;
    for (const nCars in st.stop) {
      const t = st.stop[nCars], rel = ((t - st.s0) % R.length + R.length) % R.length;
      if (rel < 20 * nCars - .01 || rel > st.len + .01) errs.push('station ' + st.id + ': the ' + nCars + '-car stop at ' + t + ' does not fit its platform (' + st.s0 + ' + ' + st.len + ')');
    }
    if (st.home) { const sig = (R.signals[st.homeTrack || 'A'] || []).find(g => g.id === st.home); if (sig) { const d = ((st.s0 - sig.s) % R.length + R.length) % R.length; if (d <= 0 || d > 300) errs.push('home signal ' + st.home + ' does not stand before ' + st.id); } }
  }
  for (const l of R.limits) if (!(l.until > l.s)) errs.push('limit at ' + l.s + ' never ends');
  for (const tr in R.signals) { const a = R.signals[tr]; for (let i = 1; i < a.length; i++) if (!(a[i].s > a[i - 1].s)) errs.push('signals on ' + tr + ' are not strictly increasing at ' + a[i].id); }
  for (const tr in R.signals) for (const g of R.signals[tr]) for (const t of R.tunnels) { const d = W(g.s) - W(t.s0), d2 = W(g.s) - W(t.s1); if (Math.abs(d) < 10 || Math.abs(d2) < 10) errs.push('signal ' + g.id + ' stands in a portal'); }
  return errs;
}
DH.compileRoute = compile;
DH.validateRoute = validate;
DH.routes = {};
/** the compiled route by id (compiled once, on first use) */
DH.route = id => DH.routes[id] || (DH.routes[id] = compile(DH.ROUTE_DEFS[id]));
})();
