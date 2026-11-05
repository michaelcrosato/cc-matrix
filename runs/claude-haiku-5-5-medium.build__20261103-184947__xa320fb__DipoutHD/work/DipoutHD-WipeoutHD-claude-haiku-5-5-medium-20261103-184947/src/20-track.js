// Dipout HD: track geometry. A closed Catmull-Rom loop, resampled to 1 m steps, with a frame per sample:
// centre C, right R, up U (banked), horizontal forward T, slope, curvature and a speed limit for the bend.
// Frame rule (plan §2.4): R = cross(U, F). Bank: a right turn (heading increasing) rolls the right edge down.
(() => {
  const SN = globalThis.SN;
  const WALL_U = 9.0;       // half width of the road, metres
  const BANK_K = 60;        // bank per unit of curvature (radians per 1/m)
  const LAT = 40;           // lateral acceleration a craft holds through a bend, m/s²

  const catmull = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t, out = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      out[k] = 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
    }
    return out;
  };

  const wrapAng = (a) => { while (a > Math.PI) a -= SN.TAU; while (a < -Math.PI) a += SN.TAU; return a; };

  // Build the track. Returns { id, name, L, n, ds, C, R, U, T, slope, kappa, vmax, pads, pickups, wallU, neon, ... }.
  SN.buildTrack = (def) => {
    const P = SN.trackPoints(def), N = P.length, SUB = 24;
    // Dense polyline through the spline.
    const dense = [];
    for (let i = 0; i < N; i++) {
      const p0 = P[(i - 1 + N) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
      for (let k = 0; k < SUB; k++) dense.push(catmull(p0, p1, p2, p3, k / SUB));
    }
    const M = dense.length, cum = new Float64Array(M + 1);
    for (let i = 0; i < M; i++) {
      const a = dense[i], b = dense[(i + 1) % M];
      cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    }
    const L = cum[M];
    const n = Math.round(L);                 // one sample per metre (exact spacing below)
    const ds = L / n;
    const C = new Float64Array(n * 3);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const target = i * ds;
      while (j < M - 1 && cum[j + 1] < target) j++;
      const a = dense[j], b = dense[(j + 1) % M];
      const seg = cum[j + 1] - cum[j] || 1;
      const f = (target - cum[j]) / seg;
      C[i * 3] = a[0] + (b[0] - a[0]) * f;
      C[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
      C[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
    }
    // Heading and curvature (smoothed over ~9 m).
    const hd = new Float64Array(n), kap = new Float64Array(n);
    const at = (i) => ((i % n) + n) % n;
    for (let i = 0; i < n; i++) {
      const a = at(i - 1), b = at(i + 1);
      const dx = C[b * 3] - C[a * 3], dy = C[b * 3 + 1] - C[a * 3 + 1];
      hd[i] = Math.atan2(dy, dx);
    }
    for (let i = 0; i < n; i++) {
      const a = at(i - 1), b = at(i + 1);
      kap[i] = wrapAng(hd[b] - hd[a]) / (2 * ds);
    }
    const ks = new Float64Array(n);
    const W = 4;
    for (let i = 0; i < n; i++) {
      let acc = 0;
      for (let k = -W; k <= W; k++) acc += kap[at(i + k)];
      ks[i] = acc / (2 * W + 1);
    }
    // Frames: horizontal forward T, right R = cross(U, T) with U = up, bank from curvature.
    const T = new Float64Array(n * 3), R = new Float64Array(n * 3), U = new Float64Array(n * 3), slope = new Float64Array(n);
    const bank = new Float64Array(n), vmax = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = at(i - 1), b = at(i + 1);
      const tx = Math.cos(hd[i]), ty = Math.sin(hd[i]);
      T[i * 3] = tx; T[i * 3 + 1] = ty; T[i * 3 + 2] = 0;
      const rx = -ty, ry = tx;   // cross((0,0,1), T)
      const bk = Math.max(-0.5, Math.min(0.5, ks[i] * BANK_K));
      bank[i] = bk;
      const cb = Math.cos(bk), sb = Math.sin(bk);
      // R' = R cos b − U sin b ; U' = U cos b + R sin b  (U = (0,0,1))
      R[i * 3] = rx * cb; R[i * 3 + 1] = ry * cb; R[i * 3 + 2] = -sb;
      U[i * 3] = rx * sb; U[i * 3 + 1] = ry * sb; U[i * 3 + 2] = cb;
      slope[i] = (C[b * 3 + 2] - C[a * 3 + 2]) / (2 * ds);
      vmax[i] = Math.sqrt(LAT / Math.max(Math.abs(ks[i]), 1e-4));
    }
    // Pads and pickups as fractions of the lap.
    const pads = def.pads.map((f) => ({ s: f * L, len: 24 }));
    const pickups = [];
    for (let k = 0; k < 10; k++) {
      const f = (k + 0.5) / 10 + 0.02 * ((k * 7) % 3);
      const u = [-3.5, 0, 3.5][k % 3];
      pickups.push({ s: f * L, u });
    }
    // Speed profile: the slowest the bends allow, cannot exceed the class top (applied by sim).
    return {
      id: def.id, name: def.name, def, L, n, ds, C, R, U, T, slope, kappa: ks, bank, vmax, pads, pickups,
      wallU: WALL_U, neon: def.neon, tint: def.tint, sky: def.sky, lane: def.lane,
    };
  };

  // Sample the frame at arc position s (any real number; wrapped) into out.
  const frameInto = (tr, s, out) => {
    const n = tr.n;
    let x = SN.wrap(s, tr.L) / tr.ds;
    const i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, f = x - Math.floor(x);
    const lerp = (A, k) => A[i0 * 3 + k] + (A[i1 * 3 + k] - A[i0 * 3 + k]) * f;
    out.C = [lerp(tr.C, 0), lerp(tr.C, 1), lerp(tr.C, 2)];
    out.R = [lerp(tr.R, 0), lerp(tr.R, 1), lerp(tr.R, 2)];
    out.U = [lerp(tr.U, 0), lerp(tr.U, 1), lerp(tr.U, 2)];
    out.T = [lerp(tr.T, 0), lerp(tr.T, 1), lerp(tr.T, 2)];
    out.slope = tr.slope[i0] + (tr.slope[i1] - tr.slope[i0]) * f;
    out.kappa = tr.kappa[i0] + (tr.kappa[i1] - tr.kappa[i0]) * f;
    out.bank = tr.bank[i0] + (tr.bank[i1] - tr.bank[i0]) * f;
    out.vmax = tr.vmax[i0] + (tr.vmax[i1] - tr.vmax[i0]) * f;
    return out;
  };
  SN.frameInto = frameInto;

  // World point at (s, u, h): the road point plus h along the banked up vector.
  SN.worldAt = (tr, s, u, h, out = [0, 0, 0], fr = null) => {
    const q = fr || frameInto(tr, s, {});
    out[0] = q.C[0] + q.R[0] * u + q.U[0] * h;
    out[1] = q.C[1] + q.R[1] * u + q.U[1] * h;
    out[2] = q.C[2] + q.R[2] * u + q.U[2] * h;
    return out;
  };
  SN.roadZ = (tr, s, u) => {
    const q = frameInto(tr, s, {});
    return q.C[2] + q.R[2] * u;
  };
})();
