function dedupe(points) {
  const out = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(point.x - prev.x, point.y - prev.y, point.z - prev.z) > 0.08) {
      out.push(point);
    }
  }
  if (out.length > 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z) < 0.08) out.pop();
  }
  return out;
}

function stadiumPoints(straight, radius, hill) {
  const half = straight / 2;
  const side = Math.max(12, Math.round(straight / 5));
  const cap = 28;
  const raw = [];
  const push = (x, z) => {
    const y = hill(x, z, raw.length);
    raw.push({ x, y, z });
  };
  for (let i = 0; i <= side; i++) push(-half + (straight * i) / side, -radius);
  for (let i = 1; i <= cap; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / cap;
    push(half + Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  for (let i = 1; i <= side; i++) push(half - (straight * i) / side, radius);
  for (let i = 1; i < cap; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / cap;
    push(-half + Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return dedupe(raw);
}

function smoothHill(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function buildCourse(def) {
  const points = def.points;
  const segLen = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    segLen.push(len);
    total += len;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxY = 0;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
    maxY = Math.max(maxY, point.y);
  }
  return {
    ...def,
    points,
    segLen,
    length: total,
    bounds: { minX, maxX, minZ, maxZ, maxY },
  };
}

export function sampleCourse(course, distance) {
  const length = course.length;
  let d = distance % length;
  if (d < 0) d += length;
  let acc = 0;
  for (let i = 0; i < course.points.length; i++) {
    const seg = course.segLen[i];
    const last = i === course.points.length - 1;
    if (d <= acc + seg || last) {
      const t = seg > 0 ? Math.max(0, Math.min(1, (d - acc) / seg)) : 0;
      const a = course.points[i];
      const b = course.points[(i + 1) % course.points.length];
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const z = a.z + (b.z - a.z) * t;
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      return {
        x,
        y,
        z,
        heading,
        right: { x: Math.cos(heading), y: 0, z: -Math.sin(heading) },
      };
    }
    acc += seg;
  }
  const a = course.points[0];
  return { x: a.x, y: a.y, z: a.z, heading: 0, right: { x: 1, y: 0, z: 0 } };
}

export function pointOnCourse(course, progress, lateral, lift = 0) {
  const sample = sampleCourse(course, progress);
  return {
    x: sample.x + sample.right.x * lateral,
    y: sample.y + lift,
    z: sample.z + sample.right.z * lateral,
    heading: sample.heading,
    right: sample.right,
  };
}

export function placeKart(course, kart, progress, lateral) {
  const sample = pointOnCourse(course, progress, lateral, 0);
  kart.progress = progress;
  kart.lateral = lateral;
  kart.x = sample.x;
  kart.y = sample.y;
  kart.z = sample.z;
  kart.heading = sample.heading;
  return sample;
}

export function lapForProgress(progress, length) {
  if (progress < length) return 1;
  if (progress < length * 2) return 2;
  return 3;
}

// Road strip in the same frame as sampleCourse. Vertex pairs are (right, left).
// Triangle order is right, left, next-right so the cross product points +y
// (heading π/2 travels +x and right is -z; that cross is +y).
export function roadStrip(course, half, lift) {
  const count = Math.max(24, Math.floor(course.length / 4));
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= count; i++) {
    const sample = sampleCourse(course, (i % count) * (course.length / count));
    const y = sample.y + lift;
    positions.push(
      sample.x + sample.right.x * half, y, sample.z + sample.right.z * half,
      sample.x - sample.right.x * half, y, sample.z - sample.right.z * half,
    );
    normals.push(0, 1, 0, 0, 1, 0);
  }
  for (let i = 0; i < count; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return { positions, normals, indices };
}

const cinder = buildCourse({
  id: "cinder-loop",
  name: "Cinder Loop",
  kind: "circuit",
  blurb: "A warm quarry oval. The shoulders are made of bad ideas.",
  laps: 3,
  roadHalf: 8,
  wallHalf: 12.2,
  sky: 0xf2b48a,
  road: 0x3c4454,
  shoulder: 0xc6a36e,
  grass: 0x6ea24a,
  wall: 0x8d4636,
  fog: 0xf2b48a,
  accent: 0xffb703,
  points: stadiumPoints(130, 42, (x, z) => {
    const ramp = smoothHill((x - 40) / 50);
    const cap = Math.max(0, 1 - Math.abs(z) / 42);
    return ramp * cap * 7.5;
  }),
});

const lantern = buildCourse({
  id: "lantern-causeway",
  name: "Lantern Causeway",
  kind: "circuit",
  blurb: "Night harbor, narrow bridge, one rude hairpin.",
  laps: 3,
  roadHalf: 6.6,
  wallHalf: 10.4,
  sky: 0x14182e,
  road: 0x2c3448,
  shoulder: 0x3e4c5c,
  grass: 0x16343c,
  wall: 0xd0893a,
  fog: 0x14182e,
  accent: 0xffc56b,
  points: stadiumPoints(168, 30, (x, z) => {
    if (z > 10) {
      const along = smoothHill((x + 84) / 168);
      const crest = Math.sin(along * Math.PI);
      return crest * 8.2;
    }
    if (x < -70) return smoothHill((Math.abs(z) - 8) / 24) * 2.2;
    return 0;
  }),
});

export const BALLOON_YARD = {
  id: "balloon-yard",
  name: "Balloon Yard",
  kind: "arena",
  blurb: "A walled yard. Three balloons. Do not be polite.",
  laps: 0,
  roadHalf: 99,
  wallHalf: 99,
  width: 72,
  depth: 52,
  sky: 0x9fd4ff,
  road: 0xd9c7a6,
  shoulder: 0xcbb892,
  grass: 0xd9c7a6,
  wall: 0x6b4a38,
  fog: 0x9fd4ff,
  accent: 0xff5d8f,
  obstacles: [
    { type: "cyl", x: 0, z: 0, r: 4.2 },
    { type: "box", x: -18, z: -10, hx: 4.2, hz: 2.6 },
    { type: "box", x: 18, z: 10, hx: 4.2, hz: 2.6 },
    { type: "cyl", x: -20, z: 14, r: 2.4 },
    { type: "cyl", x: 20, z: -14, r: 2.4 },
    { type: "box", x: 0, z: 16, hx: 7, hz: 1.6 },
    { type: "box", x: 0, z: -16, hx: 7, hz: 1.6 },
  ],
  spawns: [
    { x: 0, z: -18, heading: 0 },
    { x: 0, z: 18, heading: Math.PI },
    { x: -26, z: 0, heading: Math.PI / 2 },
    { x: 26, z: 0, heading: -Math.PI / 2 },
  ],
  boxSpots: [
    { x: -12, z: -12 },
    { x: 12, z: -12 },
    { x: -12, z: 12 },
    { x: 12, z: 12 },
    { x: -28, z: -18 },
    { x: 28, z: 18 },
  ],
  bounds: { minX: -36, maxX: 36, minZ: -26, maxZ: 26, maxY: 0 },
  length: 1,
  points: [],
  segLen: [],
};

function withBoxes(course) {
  if (course.kind !== "circuit") return course;
  const boxes = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    boxes.push({
      progress: ((i + 0.5) * course.length) / count,
      lateral: i % 2 === 0 ? -3.1 : 3.1,
    });
  }
  return { ...course, boxSpots: boxes };
}

export const CINDER_LOOP = withBoxes(cinder);
export const LANTERN_CAUSEWAY = withBoxes(lantern);
export const COURSES = [CINDER_LOOP, LANTERN_CAUSEWAY];
export const CUP_IDS = ["cinder-loop", "lantern-causeway"];

export function courseById(id) {
  if (id === BALLOON_YARD.id) return BALLOON_YARD;
  return COURSES.find((course) => course.id === id) || CINDER_LOOP;
}
