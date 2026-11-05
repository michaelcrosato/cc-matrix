// Course compiler: a course is a list of segments (metres, degrees) -> road sections, a driving line, gates, pads, pits.
// Units out: engine units (16 per metre). x east, y south, z up. Heading 0 = east; +turn = clockwise on screen (right).
const U = 16, RAD = Math.PI / 180;

/** seg: { len, turn (deg over the segment), dz (m), cp, boost, jump (gap m), drop (m), surf ('road'|'dirt'|'ice'), w (width m) } */
export function compile(def) {
  const c0 = compile0(def), b = { x: Math.min(...c0.line.map(p => p.x)), y: Math.min(...c0.line.map(p => p.y)) };
  const sx = 70 - b.x / U, sy = 70 - b.y / U;
  return compile0(Object.assign({}, def, { start: { x: def.start.x + sx, y: def.start.y + sy, angle: def.start.angle } }));
}
function compile0(def) {
  let x = def.start.x * U, y = def.start.y * U, z = 0, a = (def.start.angle || 0) * RAD;
  const sections = []; let cur = null, gates = [], pads = [], pits = [], line = [], dist = 0;
  const begin = (surf, w) => { cur = { pts: [[x, y, z]], surface: surf, width: w * U, pads: [], d0: dist, off: def.off }; sections.push(cur); };
  const first = def.segs[0];
  begin(first.surf || 'road', first.w || def.width || 7);
  gates.push({ kind: 'start', x, y, z, angle: a, hw: (first.w || def.width || 7) * U / 2 + 20 });
  line.push({ x, y, z, angle: a, d: 0, jump: false });
  let id = 0;
  for (const s of def.segs) {
    const surf = s.surf || 'road', w = s.w || def.width || 7;
    if (cur.surface !== surf || Math.abs(cur.width - w * U) > 1) { // new section on a surface or width change: continue from the same point
      const px = x, py = y, pz = z; begin(surf, w); cur.pts = [[px, py, pz]];
    }
    const n = Math.max(1, Math.ceil(s.len / 8)), step = s.len * U / n, dzE = (s.dz || 0) * U;
    const z0 = z;
    for (let i = 1; i <= n; i++) {
      const da = (s.turn || 0) * RAD / n; a += da / 2; x += Math.cos(a) * step; y += Math.sin(a) * step; a += da / 2;
      const t = i / n, zz = z0 + dzE * (t * t * (3 - 2 * t)); z = zz; dist += step;
      cur.pts.push([x, y, z]); line.push({ x, y, z, angle: a, d: dist, jump: !!s.jump && i > n - 2 });
    }
    if (s.boost) { const q = cur.pts[Math.max(0, cur.pts.length - Math.ceil(n / 2) - 1)]; (cur.padPts = cur.padPts || []).push([q[0], q[1]]); }
    if (s.cp) gates.push({ kind: 'cp', id: id++, x, y, z, angle: a, hw: w * U / 2 + 20 });
    if (s.jump) {
      const gap = s.jump * U, drop = (s.drop ?? 2) * U, a0 = a;
      // the gap: straight on along the heading; pits under it; the next section starts on the far side
      const gx0 = x, gy0 = y;
      x += Math.cos(a) * gap; y += Math.sin(a) * gap; z -= drop; dist += gap;
      pits.push({ x0: gx0, y0: gy0, x1: x, y1: y, a: a0, hw: w * U / 2 + 40 });
      for (let k = 1; k <= 8; k++) line.push({ x: gx0 + (x - gx0) * k / 8, y: gy0 + (y - gy0) * k / 8, z: z + drop * (1 - k / 8) * 0.6, angle: a, d: dist - gap + gap * k / 8, jump: true });
      begin(surf, w);
    }
  }
  const last = line[line.length - 1];
  gates.push({ kind: 'finish', x: last.x, y: last.y, z: last.z, angle: last.angle, hw: (def.segs[def.segs.length - 1].w || def.width || 7) * U / 2 + 20 });
  // resolve boost pads: their distance along each section's path
  for (const sec of sections) {
    sec.pts = sec.pts.filter((p, i) => i === 0 || Math.hypot(p[0] - sec.pts[i - 1][0], p[1] - sec.pts[i - 1][1]) > 1);
  }
  return { id: def.id, def, sections, gates, pits, line, length: dist, start: gates[0], finish: gates[gates.length - 1], cpCount: gates.filter(g => g.kind === 'cp').length };
}

/** bounds in engine units with a margin */
export function bounds(c, m = 40 * U) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of c.line) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
}
export { U };
