/* The road: OB.World builds each stage's segments from its data (curves, hills, junctions, grounds, edges, tunnels,
 * spans, scenery from kit rules, landmarks), answers the sim's questions (OB.World.info), and OB.Road draws a frame:
 * a pseudo-3D road that FORKS. At a junction two road surfaces spread apart, each with its own continuation into the
 * next stage, so both branches are in view until the car commits. Coordinates: z along a stage from its start, x across
 * in half roads; inside a junction x is absolute (the branch centres at -s and +s), elsewhere relative to the centre. */
(() => {
'use strict';
const OBX = window.OB, E = OBX.E, { px } = E;
const SEG = OBX.SEG;

/* ---- building a stage ---- */
const built = {};
function sections(st, rnd) {
  // a seeded layout from the stage's knobs: straight and level for the first FLAT segments, then bends and hills
  const out = [[OBX.FLAT, 0, 0]], L = st.len - 40; let n = OBX.FLAT, sign = rnd() < .5 ? -1 : 1;
  while (n < L) {
    const len = Math.min(L - n, Math.round(34 + rnd() * (st.diff >= 4 ? 34 : 54)));
    let c = 0;
    if (rnd() < st.curveMix) { if (rnd() < .72) sign = -sign; c = sign * Math.round((1 + rnd() * (st.curveMax - 1)) * 2) / 2; }
    const hill = st.hillAmp ? Math.round((rnd() * 2 - 1) * st.hillAmp * Math.min(1.4, len / 50)) : 0;
    out.push([len, c, hill]); n += len;
  }
  out.push([st.len - n, 0, 0]);
  return out;
}
function build(id) {
  const mirror = !!OBX.mirror, key = id + (mirror ? ':m' : '');
  if (built[key]) return built[key];
  const st = OBX.STAGES[id], kit = OBX.KITS[st.kit], rnd = OBX.rand.stream('layout:' + id, 7), m = mirror ? -1 : 1;
  const swap = (a, b) => mirror ? [b, a] : [a, b];
  const [gL, gR] = swap(st.gL, st.gR), [eL, eR] = swap(st.eL || null, st.eR || null);
  const segs = [], secs = sections(st, rnd);
  let y = 0;
  for (const [n, curve, hill] of secs) {
    const e = Math.max(1, Math.min(n / 3, 25));
    for (let k = 0; k < n; k++) {
      const c = k < e ? curve * (k / e) * (k / e) : k > n - e ? curve * OBX.easeInOut(1 - (k - (n - e)) / e) : curve;
      const y0 = y + hill * OBX.easeInOut(k / n), y1 = y + hill * OBX.easeInOut((k + 1) / n);
      segs.push({ i: segs.length, curve: c * m, y0, y1, w: 1, lanes: st.lanes, gL, gR, eL, eR, tunnel: false, span: null, lit: false, event: null, gust: 0, things: [], junc: false, s0: 0, s1: 0 });
    }
    y += hill;
  }
  // a steady climb (the alpine pass), kept off the flat start and the last 40
  if (st.climb) { const a = OBX.FLAT, b = st.len - 40; for (const s of segs) { const f = u => OBX.easeInOut((Math.min(Math.max(u, a), b) - a) / (b - a)) * st.climb; s.y0 += f(s.i); s.y1 += f(s.i + 1); } }
  // zones: a range of the stage with its own options (an edge, a ground, a span, a bend, a hump, lights, an event)
  const fix = (o, from, to, fn) => { const a = Math.max(OBX.FLAT, Math.floor(from * st.len)), b = Math.min(st.len - 41, Math.floor(to * st.len)); for (let i = a; i <= b; i++) fn(segs[i], (i - a) / Math.max(1, b - a), i - a, Math.max(1, b - a)); };
  for (const z of st.zones || []) fix(z, z.from, z.to, (s, u, k, n) => {
    if ('eL' in z) s[mirror ? 'eR' : 'eL'] = z.eL; if ('eR' in z) s[mirror ? 'eL' : 'eR'] = z.eR;
    if (z.gL) s[mirror ? 'gR' : 'gL'] = z.gL; if (z.gR) s[mirror ? 'gL' : 'gR'] = z.gR;
    if (z.w) s.w = 1 + (z.w - 1) * Math.sin(Math.PI * u); if (z.lanes) s.lanes = z.lanes;
    if (z.span && k % (z.spanEvery || 3) === 0) s.span = z.span;
    if (z.curve) s.curve = z.curve * m * Math.sin(Math.PI * u) * (s.curve ? Math.sign(s.curve * m * z.curve) || 1 : 1);
    if (z.hill) { s.y0 += z.hill * Math.sin(Math.PI * u); s.y1 += z.hill * Math.sin(Math.PI * Math.min(1, u + 1 / n)); }
    if (z.lit) s.lit = true; if (z.event) s.event = z.event;
  });
  for (const [f, n] of st.tunnels || []) { const a = Math.floor(f * st.len); for (let i = a; i < Math.min(a + n, st.len - 41); i++) { segs[i].tunnel = true; segs[i].span = null; } }
  for (const f of st.gusts || []) { const a = Math.floor(f * st.len); for (let i = a; i < a + 30; i++) segs[i].gust = (i - a < 15 ? 1 : -1) * (OBX.rand.hash(id, f) % 2 ? 1 : -1) * m; }
  // the end: a junction to the next row, or a goal's run-in
  const yEnd = segs[segs.length - 1].y1, juncStart = segs.length;
  if (st.row < 5) {
    for (let k = 0; k < OBX.JUNC; k++) {
      const u0 = Math.min(1, k / (OBX.JUNC * .7)), u1 = Math.min(1, (k + 1) / (OBX.JUNC * .7));
      segs.push({ i: segs.length, curve: 0, y0: yEnd, y1: yEnd, w: 1, lanes: st.lanes, gL, gR, eL: null, eR: null, tunnel: false, span: null, lit: false, event: null, gust: 0, things: [], junc: true, s0: OBX.SPREAD * OBX.easeInOut(u0), s1: OBX.SPREAD * OBX.easeInOut(u1) });
    }
  } else for (let k = 0; k < OBX.RUNIN; k++) segs.push({ i: segs.length, curve: 0, y0: yEnd, y1: yEnd, w: 1.2, lanes: st.lanes, gL, gR, eL: null, eR: null, tunnel: false, span: null, lit: true, event: null, gust: 0, things: [], junc: false, s0: 0, s1: 0, runin: true });
  const S = { id, data: st, kit, segs, len: st.len, juncStart: st.row < 5 ? juncStart : -1, decide: juncStart + Math.round(OBX.JUNC * .38), juncEnd: segs.length, goalSeg: st.row === 5 ? juncStart + 40 : -1, yEnd, mirror };
  // scenery from the kit's rules, placed by the stage's own seed (the same stage always looks the same)
  const prnd = OBX.rand.stream('scenery:' + id, 3);
  const tall = e => e === 'cliff' || e === 'facade' || e === 'wall';
  for (const s of segs) {
    if (s.i < 24 || s.runin) continue;
    for (const rule of kit.rules) {
      if ((s.i + OBX.rand.hash(rule.a) % rule.every) % rule.every) continue;
      const sides = rule.side === 'B' ? [-1, 1] : [(rule.side === 'L' ? -1 : 1) * m];
      for (const side of sides) {
        if (prnd() > (rule.chance || 1)) continue;
        if (tall(side < 0 ? s.eL : s.eR) && !s.junc) continue;
        if (s.tunnel) continue;
        const off = rule.off[0] + prnd() * (rule.off[1] - rule.off[0]), edge = s.junc ? (s.s0 + 1) : s.w;
        s.things.push({ a: rule.a, x: side * (edge + .12 + off), seed: (prnd() * 1e6) | 0 });
      }
    }
  }
  for (const lm of st.landmarks || []) { const s = segs[Math.floor(lm.at * st.len)]; if (s) s.things.push({ a: lm.a, x: (lm.side === 'L' ? -1 : 1) * m * (s.w + .12 + lm.off), seed: 7, big: true }); }
  // spans, checkpoint arches, the fork's gore (cushions and the sign), the goal
  for (const s of segs) if (s.span) s.things.push({ a: 'span_' + s.span, x: 0, span: true });
  if (st.row > 1) segs[2].things.push({ a: 'checkpoint', x: 0, span: true });
  if (S.juncStart >= 0) {
    for (let k = 34; k < 46; k += 4) segs[juncStart + k].things.push({ a: 'cushion', x: 0, solid: true });
    segs[juncStart + 48].things.push({ a: 'forksign', x: 0, fork: true, solid: true });
  }
  if (S.goalSeg >= 0) {
    segs[S.goalSeg].things.push({ a: 'goalarch', x: 0, span: true, goal: OBX.STAGES[id].goal });
    for (let k = -30; k < 40; k += 3) if (k < -2 || k > 2) for (const side of [-1, 1]) segs[S.goalSeg + k].things.push({ a: 'crowd', x: side * (1.35 + (k & 3) * .1), seed: k * 7 + side });
  }
  // what the sim needs: width in half roads of every thing it can hit
  for (const s of segs) for (const t of s.things) { const art = OBX.ART && OBX.ART[t.a]; t.w = art ? art.w || 0 : 0; if (art && art.solid !== undefined && t.solid === undefined) t.solid = art.solid; }
  built[key] = S;
  return S;
}

OBX.World = {
  get: build,
  reset() { for (const k in built) delete built[k]; },
  /** the road's centre for a junction segment: the branch spread at z */
  spread(S, z) { const i = Math.floor(z / SEG), s = S.segs[Math.min(S.segs.length - 1, Math.max(0, i))]; if (!s.junc) return 0; const u = (z - i * SEG) / SEG; return s.s0 + (s.s1 - s.s0) * u; },
  yAt(S, z) { const n = S.segs.length, i = Math.max(0, Math.min(n - 1, Math.floor(z / SEG))), s = S.segs[i], u = Math.min(1, Math.max(0, (z - i * SEG) / SEG)); return s.y0 + (s.y1 - s.y0) * u; },
  seg(S, z) { return S.segs[Math.max(0, Math.min(S.segs.length - 1, Math.floor(z / SEG)))]; },
  /** what the car feels at (z, x): bend, grade, width, whether it's on the asphalt, the ground, edges, tunnel, gust,
   *  the junction's spread and the side branches (side: the branch it's on; undefined before it chose) */
  info(S, z, x, side) {
    const s = this.seg(S, z), sp = s.junc ? this.spread(S, z) : 0;
    let rel = x; if (s.junc) rel = side ? x - side * sp : (x < 0 ? x + sp : x - sp);
    const zA = z + 400, slope = (this.yAt(S, zA) - this.yAt(S, z - 400)) / 800, crest = this.yAt(S, zA + 600) - 2 * this.yAt(S, zA) + this.yAt(S, zA - 600);
    const ground = rel < 0 ? s.gL : s.gR, edge = rel < 0 ? s.eL : s.eR;
    return { seg: s, curve: s.curve, w: s.w, lanes: s.lanes, rel, onRoad: Math.abs(rel) <= s.w * 1.06, ground, edge, edgeL: s.eL, edgeR: s.eR, tunnel: s.tunnel, gust: s.gust, junc: s.junc, spread: sp, slope, crest, event: s.event, lit: s.lit, runin: s.runin };
  },
  /** the scenery a body half-width hw (half roads) at (z, x) touches: solid things only */
  hits(S, z, x, hw) {
    const s = this.seg(S, z), out = [];
    for (const t of s.things) if (t.solid !== false && t.w && Math.abs(t.x - x) < t.w / 2 + hw) out.push(t);
    return out;
  }
};

/* ---- the sky: a backdrop per stage (its time of day and kit's far layers) plus painted extras ---- */
const skies = {};
OBX.Sky = {
  get(id) {
    const key = id + ':' + (OBX.todOverride || ''); if (skies[key]) return skies[key];
    const st = OBX.STAGES[id] || OBX.STAGES.S1, tod = OBX.TOD[OBX.todOverride || st.tod], kit = OBX.KITS[st.kit];
    const layers = kit.far.map(([kind, color, y, height], i) => ({ kind, color: tod.night ? E.shade(color, -.35 * tod.night) : color, y, height, parallax: .15 + i * .12, snow: kind === 'mountains' && st.kit === 'alpine' ? '#f4f8ff' : undefined, windows: kind === 'city' && tod.night ? '#ffe070' : undefined }));
    return (skies[key] = new E.Backdrop({ sky: tod.sky, sun: tod.sun, moon: tod.moon, stars: tod.stars || 0, starsY: .5, layers }));
  },
  /** extras over the backdrop: hot-air balloons, a rainbow, shooting stars, the aurora, lanterns, fireworks */
  extras(g, vp, st, turn, t, o = {}) {
    const W = vp.w, H = vp.h, X = vp.x, Y = vp.y, kind = st.sky;
    if (kind === 'balloons') for (let i = 0; i < 4; i++) { const bx = X + ((i * 137 + t * 3 - turn * .2) % (W + 80) + W + 80) % (W + 80) - 40, by = Y + H * (.12 + .08 * i) + Math.sin(t * .5 + i) * 3, c = ['#e84a4a', '#f8c020', '#4a8ae8', '#e85ab0'][i]; px.disc(g, bx, by, 6 + i % 2, c); px.rect(g, bx - 3, by + 5, 6, 1, E.shade(c, -.3)); px.rect(g, bx - 2, by + 9, 4, 3, '#8a5a2a'); px.line(g, bx - 3, by + 6, bx - 2, by + 9, '#5a3a2a'); px.line(g, bx + 3, by + 6, bx + 2, by + 9, '#5a3a2a'); }
    if (kind === 'rainbow' || o.rainbow) { const cx = X + W * .7 - turn * .1 % W, cy = Y + H * .62; px.blend(g, .35, 'screen', () => { ['#ff4040', '#ff9a30', '#ffe040', '#50d050', '#4080ff', '#9050e0'].forEach((c, i) => { for (let a = 0; a < 40; a++) { const an = Math.PI + a / 40 * Math.PI; px.rect(g, cx + Math.cos(an) * (70 - i * 3), cy + Math.sin(an) * (70 - i * 3), 2, 2, c); } }); }); }
    if (kind === 'shooting') { const p = (t * .3) % 3; if (p < .6) { const sx = X + W * (.2 + ((Math.floor(t * .3 / 3) * 37) % 60) / 100), sy = Y + H * .1, u = p / .6; px.blend(g, 1 - u, 'add', () => px.line(g, sx + u * 60, sy + u * 25, sx + u * 60 - 14, sy + u * 25 - 6, '#ffffff')); } }
    if (kind === 'aurora') px.blend(g, .4, 'add', () => { for (let b = 0; b < 3; b++) for (let x = 0; x < W; x += 2) { const yy = Y + H * (.12 + b * .06) + Math.sin((x + turn * .3) * .02 + t * .6 + b) * 10 + Math.sin(x * .007 + t * .2) * 12, c = ['#40ff9a', '#40d0ff', '#b060ff'][b]; px.rect(g, X + x, yy, 2, 14 - b * 3, c); } });
    if (o.fireworks) for (let i = 0; i < 3; i++) { const ph = (t * .7 + i * .37) % 1.6; if (ph < 1) { const fx = X + W * (.25 + .25 * i) - (turn * .15 % 60), fy = Y + H * (.15 + .05 * i), c = ['#ff5aa0', '#ffe060', '#60e0ff'][i]; px.blend(g, 1 - ph, 'add', () => { for (let a = 0; a < 14; a++) { const an = a / 14 * Math.PI * 2; px.rect(g, fx + Math.cos(an) * ph * 26, fy + Math.sin(an) * ph * 26 + ph * ph * 8, 2, 2, c); } }); } }
    if (o.lanterns) for (let i = 0; i < 18; i++) { const lx = X + ((i * 53.7 - turn * .25) % W + W) % W, ly = Y + H * .75 - ((t * 8 + i * 37) % (H * .7)); px.blend(g, .8, 'add', () => { px.rect(g, lx, ly, 2, 3, '#ffb040'); px.dot(g, lx, ly + 3, '#ff7020'); }); }
  }
};

/* ---- drawing a frame ----
 * view: { stage, z, x, h, turn, t, objs: [{ stage, z, x, w, draw(g, sx, sy, k, ctx) }], sibling: { stage, lat, alpha },
 * closed: -1 | 1 (a fixed route's closed branch), fov, fx: { night, rain, petals... } } */
const P = { rows: [], map: new Map(), cam: null, vp: null, glows: [] };
OBX.Road = {
  get last() { return P; },
  /** where a road point lands on screen for the frame last drawn: [sx, sy, k (pixels a unit)] or null */
  project(stage, z, x, yOff = 0) {
    const i = Math.floor(z / SEG); let row = P.map.get(stage + ':' + i);
    if (!row) return null;
    const u = (z - i * SEG) / SEG, sc = row.s1 + (row.s2 - row.s1) * u, cx = row.x1 + (row.x2 - row.x1) * u + (row.latRef - row.lat) * OBX.ROADW * sc, cy = row.y1 + (row.y2 - row.y1) * u;
    return [cx + x * OBX.ROADW * sc, cy - yOff * sc * P.yk, sc];
  },
  draw(g, vp, V) {
    const S = OBX.World.get(V.stage), tod = OBX.TOD[OBX.todOverride || S.data.tod], kit = S.kit, t = V.t || 0;
    const fov = V.fov || 100, depth = 1 / Math.tan(fov / 2 * Math.PI / 180), W = vp.w, H = vp.h, hw = Math.min(W / 2, H * .8889), hh = H / 2, yk = hh / hw;
    const camIdx = Math.floor(V.z / SEG), pct = (V.z - camIdx * SEG) / SEG;
    const cam = { x: V.x * OBX.ROADW, y: (V.h || OBX.CAM_H) + OBX.World.yAt(S, V.z), z: V.z, cx: vp.x + W / 2, cy: vp.y + H / 2 };
    P.cam = cam; P.vp = vp; P.yk = yk; P.glows = []; P.rows = []; P.map = new Map();
    // the sky
    const sky = OBX.Sky.get(V.stage), val = value => ({ value }), fake = Object.create(V.r, { ctx: val(g), bw: val(W), bh: val(H), W: val(W), H: val(H), ix: val(V.turn || 0), iy: val(0) });
    g.save(); g.beginPath(); g.rect(vp.x, vp.y, W, H); g.clip();
    g.translate(vp.x, vp.y); try { sky.draw(fake); } catch (e) { px.rect(g, 0, 0, W, H, tod.sky[1]); } g.translate(-vp.x, -vp.y);
    OBX.Sky.extras(g, vp, S.data, V.turn || 0, t, V.fx || {});
    // the paths: A (left branch / the road), B (the right branch, from the junction on), the sibling (just after a fork)
    const next = OBX.forkOf(V.stage), paths = [];
    const mk = (name, lat0) => ({ name, rows: [], lat0 });
    const A = mk('A'), B = S.juncStart >= 0 ? mk('B') : null;
    const pathSeg = (side, k) => {   // the segment k ahead along branch side (-1 left, 1 right, 0 none), with its stage and lateral offset
      const idx = camIdx + k;
      if (idx < S.segs.length) { const s = S.segs[idx]; return { s, stage: V.stage, idx, lat: s.junc ? side * (s.s0 + s.s1) / 2 : 0, latRef: 0, base: 0 }; }
      if (!next) return null;
      const id = next[side < 0 ? 0 : 1], N = OBX.World.get(id), j = idx - S.segs.length; if (j >= N.segs.length) return null;
      return { s: N.segs[j], stage: id, idx: j, lat: side * OBX.SPREAD, latRef: side * OBX.SPREAD, base: S.yEnd };
    };
    const project = (path, getter) => {
      let x = 0, dx = -(S.segs[camIdx] ? S.segs[camIdx].curve : 0) * pct, maxy = vp.y + H;
      for (let k = 0; k < OBX.DRAW; k++) {
        const q = getter(k); if (!q) break;
        const wz = (camIdx + k) * SEG, d1 = wz - V.z, d2 = d1 + SEG;
        const sA = d1 > 1 ? depth / d1 : 0, sB = depth / d2;
        const y0 = q.base + q.s.y0, y1 = q.base + q.s.y1, sp0 = q.s.junc ? q.s.s0 : Math.abs(q.lat), sp1 = q.s.junc ? q.s.s1 : Math.abs(q.lat), sg = Math.sign(q.lat || 0);
        const lat1 = q.s.junc ? sg * sp0 : q.lat, lat2 = q.s.junc ? sg * sp1 : q.lat;
        const row = { k, s: q.s, stage: q.stage, idx: q.idx, lat: lat1, lat2, latRef: q.latRef, path: path.name,
          s1: sA * hw, s2: sB * hw, x1: cam.cx + sA * (x + lat1 * OBX.ROADW - cam.x) * hw, x2: cam.cx + sB * (x + dx + lat2 * OBX.ROADW - cam.x) * hw,
          y1: cam.cy - sA * (y0 - cam.y) * hh, y2: cam.cy - sB * (y1 - cam.y) * hh, d: d1 };
        row.show = d1 > depth * 40 && row.y2 < row.y1 && row.y2 < maxy;
        if (row.show) maxy = row.y2;
        x += dx; dx += q.s.curve;
        path.rows.push(row);
        const key = q.stage + ':' + q.idx; if (path.name === 'A' || !P.map.has(key)) P.map.set(key, row);
      }
    };
    project(A, k => { const q = pathSeg(-1, k); return q; });
    if (B) project(B, k => pathSeg(1, k));
    let Sib = null;
    if (V.sibling && V.sibling.alpha > .02) {
      const N = OBX.World.get(V.sibling.stage); Sib = mk('S'); Sib.alpha = V.sibling.alpha;
      project(Sib, k => { const j = camIdx + k; return j < N.segs.length ? { s: N.segs[j], stage: V.sibling.stage, idx: j, lat: V.sibling.lat, latRef: V.sibling.lat, base: 0 } : null; });
    }
    // objects (cars, request objects, start line) by their row
    const objRows = new Map();
    for (const o of V.objs || []) {
      const i = Math.floor(o.z / SEG), row = P.map.get(o.stage + ':' + i); if (!row || row.d + (o.z - i * SEG) < 520) continue;
      (objRows.get(row) || objRows.set(row, []).get(row)).push(o);
    }
    // far to near
    const fogC = E.hex(V.fog || tod.fog), dens = 4.2, night = tod.night || 0;
    const all = [Sib, B, A].filter(Boolean);
    const n = Math.max(...all.map(p => p.rows.length));
    for (let k = n - 1; k >= 0; k--) {
      const f = 1 - Math.exp(-((k / OBX.DRAW) ** 2) * dens);
      for (const path of all) {
        const row = path.rows[k]; if (!row || !row.show) continue;
        if (path.name === 'B' && row.idx < S.juncStart && row.stage === V.stage) continue;
        const ga = path.alpha === undefined ? 1 : path.alpha;
        if (ga < 1) g.globalAlpha = ga;
        this._band(g, vp, row, path.name === 'A' || (path.name === 'B' && false), path, kit, f, fogC, t, B && path.name === 'A' ? B.rows[k] : null, V);
        g.globalAlpha = 1;
      }
      for (const path of all) {
        const row = path.rows[k]; if (!row || row.d <= 30) continue;
        if (path.name === 'B' && row.idx < S.juncStart && row.stage === V.stage) continue;
        const things = row.s.things, objs = objRows.get(row);
        if (!things.length && !objs) continue;
        const alpha = (1 - f * .85) * (path.alpha === undefined ? 1 : path.alpha);
        if (alpha < .03) continue;
        if (!(path.name === 'B' && row.s.junc && row.stage === V.stage)) for (const th of things) this._thing(g, th, row, row.x1 + (row.latRef - row.lat) * OBX.ROADW * row.s1 + th.x * OBX.ROADW * row.s1, row.y1, row.s1, t, alpha, V);
        if (objs) {
          objs.sort((a, b) => b.z - a.z);
          for (const o of objs) {
            const u = (o.z - row.idx * SEG) / SEG, sc = row.s1 + (row.s2 - row.s1) * u, cx = row.x1 + (row.x2 - row.x1) * u + (row.latRef - row.lat) * OBX.ROADW * sc, cy = row.y1 + (row.y2 - row.y1) * u;
            g.globalAlpha = alpha; E.px.reset(g);
            try { o.draw(g, cx + o.x * OBX.ROADW * sc, cy - (o.y || 0) * sc * yk, sc, { t, glow: (x, y, r, c, a) => P.glows.push([x, y, r, c, a || 1]), night, row, rw: OBX.ROADW * sc }); } catch (e) { OBX.game && OBX.game.fail('draw obj', e); }
            g.globalAlpha = 1;
          }
        }
      }
    }
    g.restore();
    return P;
  },
  // one segment's band: grounds, rumble, asphalt, lane marks, edges, tunnel, lamp pools; fog over it
  _band(g, vp, row, primary, path, kit, f, fog, t, other, V) {
    const s = row.s, alt = Math.floor(row.idx / 3) % 2, X = vp.x, W = vp.w;
    const y1 = Math.ceil(row.y1), y2 = Math.ceil(row.y2);
    const w1 = s.w * OBX.ROADW * row.s1, w2 = s.w * OBX.ROADW * row.s2, x1 = row.x1, x2 = row.x2;
    const tod = OBX.TOD[OBX.todOverride || OBX.STAGES[row.stage].tod], dark = tod.night ? .35 * tod.night : 0, sh = c => dark ? E.shade(c, -dark) : c;
    const kitC = OBX.KITS[OBX.STAGES[row.stage].kit];
    const quad = (a1, b1, a2, b2, c) => px.poly(g, [[a1, row.y1], [b1, row.y1], [b2, row.y2], [a2, row.y2]], c);
    if (primary) {
      // grounds: left of the split, right of it (the split is the road's centre, or the gore's middle in a junction)
      const split1 = s.junc && other ? (x1 + other.x1) / 2 : x1, split2 = s.junc && other ? (x2 + other.x2) / 2 : x2;
      const gc = (kind, side) => {
        const pal = OBX.GROUNDS[kind] || OBX.GROUNDS.grass;
        if (OBX.GROUND_ROWS[kind]) return sh(alt ? pal[0] : pal[1]);
        if (OBX.GROUND_WATER[kind]) return sh((row.idx + Math.floor(t * 6)) % 9 === 0 ? E.shade(pal[0], .25) : pal[alt]);
        return sh(pal[alt]);
      };
      px.poly(g, [[X - 2, row.y1], [split1, row.y1], [split2, row.y2], [X - 2, row.y2]], gc(s.gL, -1));
      px.poly(g, [[split1, row.y1], [X + W + 2, row.y1], [X + W + 2, row.y2], [split2, row.y2]], gc(s.gR, 1));
      // foam where the sea meets the shore
      for (const side of [-1, 1]) if (OBX.GROUND_WATER[side < 0 ? s.gL : s.gR] && !(side < 0 ? s.eL : s.eR)) { const e1 = x1 + side * w1 * 1.18, e2 = x2 + side * w2 * 1.18; quad(e1, e1 + side * w1 * .25, e2, e2 + side * w2 * .25, sh(alt ? '#f0e8c8' : '#ffffff')); }
    }
    if (s.junc && path.name !== 'S' && row.stage === V.stage && OBX.STAGES[row.stage]) {
      // the gore between the branches: a painted chevron island
      const gw1 = Math.max(0, Math.abs(row.lat) - s.w) * OBX.ROADW * row.s1, gw2 = Math.max(0, Math.abs(row.lat2) - s.w) * OBX.ROADW * row.s2;
      if (path.name === 'A' && gw1 > 0) { const c1 = other ? (x1 + other.x1) / 2 : x1, c2 = other ? (x2 + other.x2) / 2 : x2; quad(c1 - gw1, c1 + gw1, c2 - gw2, c2 + gw2, sh(alt ? '#e8e0c0' : '#c8a040')); }
    }
    // rumble strips, then the asphalt, then lane marks
    const rk = 1 + .1;
    quad(x1 - w1 * rk, x1 + w1 * rk, x2 - w2 * rk, x2 + w2 * rk, sh(kitC.rumble[alt]));
    const roadC = kitC.road[alt];
    quad(x1 - w1, x1 + w1, x2 - w2, x2 + w2, sh(s.event === 'shower' ? E.shade(roadC, -.12) : roadC));
    if (!alt) for (let l = 1; l < s.lanes; l++) { const u = -1 + 2 * l / s.lanes; quad(x1 + u * w1 - w1 / 48, x1 + u * w1 + w1 / 48, x2 + u * w2 - w2 / 48, x2 + u * w2 + w2 / 48, sh(kitC.lane)); }
    // a fixed route's closed branch: hatched
    if (V.closed && s.junc && row.stage === V.stage && Math.sign(row.lat) === V.closed && Math.abs(row.lat) > 1.2 && alt) quad(x1 - w1 * .9, x1 + w1 * .9, x2 - w2 * .9, x2 + w2 * .9, sh('#d8c040'));
    // lamp pools on lit roads (drawn after the night grade, additive)
    if (s.lit && row.idx % 6 === 0 && row.s1 > .004) for (const side of [-1, 1]) P.glows.push([x1 + side * w1 * .8, row.y1 - 1, w1 * .35, '#ffd890', .5, 'pool', row.s1]);
    // edges: rails, low stone walls, cliffs and facades along the road
    for (const side of [-1, 1]) {
      const e = side < 0 ? s.eL : s.eR; if (!e) continue;
      const tall = { rail: 140, stonewall: 260, wall: 900, cliff: 7000, facade: 3600, hedge: 500 }[e] || 200, off = tall > 600 ? 1.28 : 1.16;
      const ex1 = x1 + side * w1 * off, ex2 = x2 + side * w2 * off, h1 = tall * row.s1 * P.yk, h2 = tall * row.s2 * P.yk;
      let c = { rail: '#d8dce4', stonewall: '#a89880', wall: '#a8a098', cliff: alt ? '#b8805a' : '#a87250', facade: ['#e8c8a0', '#d8a888', '#f0d8b0', '#c8a0a0'][(row.idx >> 2) % 4], hedge: '#3a7a3a' }[e];
      px.poly(g, [[ex1, row.y1], [ex2, row.y2], [ex2, row.y2 - h2], [ex1, row.y1 - h1]], sh(c));
      if (e === 'rail') { px.poly(g, [[ex1, row.y1 - h1], [ex2, row.y2 - h2], [ex2, row.y2 - h2 * .7], [ex1, row.y1 - h1 * .7]], sh('#f4f4f8')); if (row.idx % 2 === 0) px.rect(g, ex1 - 1, row.y1 - h1, Math.max(1, row.s1 * 30), h1, sh('#8a8a98')); }
      if (e === 'stonewall' && alt) px.poly(g, [[ex1, row.y1 - h1 * .5], [ex2, row.y2 - h2 * .5], [ex2, row.y2 - h2 * .42], [ex1, row.y1 - h1 * .42]], sh('#8a7a68'));
      if (e === 'facade' && row.s1 > .01 && row.idx % 4 === 0) for (let fl = 1; fl < 4; fl++) { const wy = row.y1 - h1 * fl / 4, ww = Math.max(2, Math.abs(ex2 - ex1) * .5); px.rect(g, Math.min(ex1, ex2) + Math.abs(ex2 - ex1) * .25, wy - h1 * .1, ww, h1 * .1, tod.night ? '#ffd070' : sh('#4a5a7a')); }
    }
    // a tunnel: walls up to a roof; a face round its mouth where it begins
    if (s.tunnel) {
      const e1 = w1 * 1.25, e2 = w2 * 1.25, t1 = row.y1 - w1 * .8 * P.yk * 1.4, t2 = row.y2 - w2 * .8 * P.yk * 1.4, wc = alt ? '#5a4a3a' : '#4a3a2e';
      px.poly(g, [[x1 - e1, row.y1], [x2 - e2, row.y2], [x2 - e2, t2], [x1 - e1, t1]], sh(wc));
      px.poly(g, [[x1 + e1, row.y1], [x2 + e2, row.y2], [x2 + e2, t2], [x1 + e1, t1]], sh(wc));
      px.poly(g, [[x1 - e1, t1], [x1 + e1, t1], [x2 + e2, t2], [x2 - e2, t2]], '#2a2420');
      if (row.idx % 8 === 0) for (const side of [-1, 1]) { const lx = x1 + side * e1 * .97, ly = t1 + (row.y1 - t1) * .12, lw = Math.max(1, w1 * .06); px.rect(g, lx - lw / 2, ly, lw, Math.max(1, lw * .4), '#ffd080'); if (lw < 10) P.glows.push([lx, ly, Math.min(5, lw * 1.5), '#ffb040', .6, 'lamp', row.s1]); }
      const S2 = OBX.World.get(row.stage), prev = S2.segs[row.idx - 1];
      if (prev && !prev.tunnel) { const top = Math.max(vp.y, Math.round(t1)), a = Math.round(x1 - e1), b = Math.round(x1 + e1); px.rect(g, X, vp.y, W, top - vp.y, sh('#8a7058')); px.rect(g, X, top, Math.max(0, a - X), y1 - top, sh('#8a7058')); px.rect(g, b, top, Math.max(0, X + W - b), y1 - top, sh('#8a7058')); }
    }
    if (f > .01) { g.fillStyle = `rgba(${fog[0]},${fog[1]},${fog[2]},${Math.min(1, f).toFixed(3)})`; g.fillRect(X, y2, W, Math.max(1, y1 - y2)); px.reset(g); }
  },
  _thing(g, th, row, sx, sy, k, t, alpha, V) {
    const art = OBX.ART && OBX.ART[th.a]; if (!art) return;
    g.globalAlpha = alpha; px.reset(g);
    try { art.draw(g, sx, sy, k, { t, seed: th.seed || 0, th, rw: (row.s.w || 1) * OBX.ROADW * k, yk: P.yk, night: (OBX.TOD[OBX.todOverride || OBX.STAGES[row.stage].tod].night || 0), glow: (x, y, r, c, a) => P.glows.push([x, y, r, c, a || 1]), V, row }); } catch (e) { OBX.game && OBX.game.fail('art ' + th.a, e); }
    g.globalAlpha = 1;
  }
};
})();
