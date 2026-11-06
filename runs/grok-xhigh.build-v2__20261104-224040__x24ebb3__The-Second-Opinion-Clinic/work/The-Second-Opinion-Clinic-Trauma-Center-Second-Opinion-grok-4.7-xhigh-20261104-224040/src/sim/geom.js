export function dist(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function angDiff(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function linePath(x, z, dx, dz, length, step = 0.22) {
  const mag = Math.hypot(dx, dz) || 1;
  const n = Math.max(2, Math.ceil(length / step));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (length * i) / n;
    pts.push({ x: x + (dx / mag) * t, z: z + (dz / mag) * t });
  }
  return pts;
}

export function arcPath(x, z, length, curve = 0.7) {
  const n = Math.max(4, Math.ceil(length / 0.18));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const d = length * t;
    const ang = curve * t;
    pts.push({ x: x + Math.sin(ang) * d, z: z + d * (0.35 + 0.15 * Math.cos(ang)) });
  }
  return pts;
}

export function circlePath(x, z, radius) {
  const n = 16;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: x + Math.cos(a) * radius, z: z + Math.sin(a) * radius * 0.75 });
  }
  return pts;
}

export function pathLength(path) {
  let n = 0;
  for (let i = 0; i < path.length - 1; i++) n += dist(path[i].x, path[i].z, path[i + 1].x, path[i + 1].z);
  return n;
}

/** Closest point on a polyline. `dev` is the distance off the path, `along` is arc length. */
export function pathMetrics(path, x, z) {
  let bestDev = 1e9;
  let bestAlong = 0;
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i].x;
    const az = path[i].z;
    const bx = path[i + 1].x;
    const bz = path[i + 1].z;
    const dx = bx - ax;
    const dz = bz - az;
    const seglen = Math.hypot(dx, dz) || 1e-6;
    let u = ((x - ax) * dx + (z - az) * dz) / (seglen * seglen);
    u = clamp(u, 0, 1);
    const px = ax + dx * u;
    const pz = az + dz * u;
    const dev = Math.hypot(x - px, z - pz);
    if (dev < bestDev) {
      bestDev = dev;
      bestAlong = acc + seglen * u;
    }
    acc += seglen;
  }
  return { dev: bestDev, along: bestAlong, length: acc };
}

export function woundFrame(e) {
  const dx = e.x2 - e.x;
  const dz = e.z2 - e.z;
  const len = Math.hypot(dx, dz) || 1;
  return { dx, dz, len, nx: -dz / len, nz: dx / len };
}

const KIND_TOOL = {
  pool: 'drain',
  droplet: 'drain',
  hook: 'forceps',
  prop: 'forceps',
  magnet: 'forceps',
  debris: 'forceps',
  core: 'forceps',
  stalk: 'forceps',
  extraction: 'forceps',
  organ: 'forceps',
  fragment: 'forceps',
  clamp: 'forceps',
  unclamp: 'forceps',
  tether: 'forceps',
  incision: 'scalpel',
  pore: 'scalpel',
  tumor: 'scalpel',
  wound: 'suture',
  bleeder: 'suture',
  polyp: 'laser',
  egg: 'laser',
  eye: 'laser',
  cyst: 'laser',
  gel: 'gel',
  sob: 'gel',
  film: 'gel',
  dressing: 'dressing',
  ring: 'syringe',
};

export function toolFor(e) {
  if (!e || e.done) return null;
  if (e.kind === 'plate') {
    if (e.phase === 'lift') return 'forceps';
    if (e.phase === 'burn') return 'laser';
    return 'scalpel';
  }
  return e.tool || KIND_TOOL[e.kind] || null;
}

export function makeEntity(spec) {
  const e = {
    id: spec.id,
    kind: spec.kind,
    x: spec.x ?? 0,
    z: spec.z ?? 0,
    table: spec.table ?? 0,
    r: spec.r ?? 0.55,
    done: false,
    hidden: !!spec.hidden,
    marked: false,
    hiddenBy: spec.hiddenBy || null,
    path: spec.path ? spec.path.map((p) => ({ x: p.x, z: p.z })) : null,
    pulled: 0,
    free: false,
    grabbedBy: -1,
    speedLimit: spec.speedLimit || 0,
    tether: !!spec.tether,
    x2: spec.x2 ?? (spec.x ?? 0),
    z2: spec.z2 ?? (spec.z ?? 0) + (spec.len || 1.2),
    slots: null,
    nextSlot: 0,
    sideSign: 0,
    amp: 0,
    lastTie: 0,
    devSum: 0,
    devN: 0,
    started: false,
    heat: 0,
    cells: null,
    ang: spec.ang ?? 0,
    targetAng: spec.targetAng ?? 0,
    hp: spec.hp ?? 1,
    maxHp: spec.hp ?? 1,
    window: spec.window || null,
    real: spec.real !== false,
    hands: spec.hands || 1,
    bleed: !!spec.bleed,
    vitalOnDone: spec.vitalOnDone || 0,
    painOnDone: spec.painOnDone || 0,
    side: spec.side || '',
    order: spec.order ?? 0,
    firstClot: !!spec.firstClot,
    burn: spec.burn || 0,
    hold: 0,
    openT: 0,
    phase: spec.phase || 'cut',
    vx: spec.vx || 0,
    vz: spec.vz || -1.5,
    optional: !!spec.optional,
    life: spec.life || 0,
    safeUntil: 0,
    film: spec.kind === 'film',
  };
  if (e.kind === 'wound' || e.kind === 'bleeder') {
    const len = spec.len || Math.hypot(e.x2 - e.x, e.z2 - e.z) || 1.2;
    if (spec.x2 == null) {
      e.x2 = e.x + (spec.dx ?? 1) * len;
      e.z2 = e.z + (spec.dz ?? 0) * len;
    }
    const L = Math.hypot(e.x2 - e.x, e.z2 - e.z) || 1;
    const n = Math.max(2, Math.round(L / 0.45));
    e.slots = [];
    for (let i = 0; i < n; i++) e.slots.push({ at: ((i + 0.5) / n) * L, tied: false });
    if (e.kind === 'bleeder') e.bleed = true;
  }
  if (e.kind === 'incision' || e.kind === 'pore' || e.kind === 'tumor' || (e.kind === 'plate' && !e.path)) {
    if (!e.path) {
      if (e.kind === 'tumor') e.path = circlePath(e.x, e.z, spec.radius || 0.7);
      else e.path = linePath(e.x, e.z, spec.dx ?? 1, spec.dz ?? 0, spec.len || (e.kind === 'pore' ? 0.55 : 1.1));
    }
  }
  if (e.kind === 'hook' || e.kind === 'prop' || e.kind === 'magnet' || e.kind === 'debris' || e.kind === 'core' || e.kind === 'stalk' || e.kind === 'extraction' || e.kind === 'organ') {
    if (!e.path) {
      const pull = spec.pull || 1.1;
      e.path = spec.curve != null ? arcPath(e.x, e.z, pull, spec.curve) : linePath(e.x, e.z, spec.dx ?? 0.2, spec.dz ?? 1, pull);
    }
    e.pull = pathLength(e.path);
  }
  if (e.kind === 'dressing') {
    if (!e.path) e.path = linePath(e.x, e.z, spec.dx ?? 1, spec.dz ?? 0.2, spec.len || 1.6);
  }
  if (e.kind === 'gel' || e.kind === 'sob') {
    const w = spec.w || (e.kind === 'sob' ? 2.4 : 1.6);
    const h = spec.h || (e.kind === 'sob' ? 0.45 : 1.2);
    const step = spec.step || 0.4;
    e.cells = [];
    const cols = Math.max(2, Math.round(w / step));
    const rows = Math.max(e.kind === 'sob' ? 1 : 2, Math.round(h / step));
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        e.cells.push({
          x: e.x + (ix / Math.max(1, cols - 1) - 0.5) * w,
          z: e.z + (iy / Math.max(1, rows - 1) - 0.5) * h,
          on: 0,
        });
      }
    }
    e.need = spec.need || (e.kind === 'sob' ? 0.8 : 0.92);
    e.life = spec.life || (e.kind === 'sob' ? 6 : 0);
    e.born = 0;
  }
  if (e.kind === 'ring') e.r = spec.r || 0.75;
  if (e.path) e.pull = e.pull || pathLength(e.path);
  return e;
}

export function coverage(e) {
  if (!e.cells || !e.cells.length) return 0;
  let n = 0;
  for (const c of e.cells) if (c.on) n++;
  return n / e.cells.length;
}
