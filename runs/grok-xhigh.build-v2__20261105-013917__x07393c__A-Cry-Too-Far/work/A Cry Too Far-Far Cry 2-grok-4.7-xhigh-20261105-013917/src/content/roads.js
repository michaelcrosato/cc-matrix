/** Polylines in world metres. Painted as dirt and given no fire fuel. */
export const ROADS = [
  { id: 'north', pts: [[0, 40], [40, -20], [90, -80], [40, -170], [150, -300]] },
  { id: 'west', pts: [[0, 40], [-100, 40], [-200, 30], [-260, 240], [-330, 395]] },
  { id: 'fort', pts: [[-200, 30], [-320, -90], [-430, -180], [-260, -300]] },
  { id: 'east', pts: [[0, 40], [170, 90], [250, 80], [400, 280]] },
  { id: 'siding', pts: [[250, 80], [430, -60], [470, -180]] },
  { id: 'salt', pts: [[400, 280], [300, 390], [200, 470]] },
  { id: 'back', pts: [[0, 40], [120, 230], [300, 390]] },
  { id: 'pass', pts: [[-260, -300], [-420, -360], [-590, -430]] },
  { id: 'ridge', pts: [[150, -300], [40, -400], [-130, -520]] },
  { id: 'ford', pts: [[0, 40], [-60, 300]] },
];

export const RIVER = [
  [600, -640], [420, -320], [300, -120], [250, 80], [120, 230],
  [-60, 300], [-240, 380], [-420, 430], [-640, 470],
];

export const RAIL = [
  [-640, 110], [-400, 100], [0, 70], [270, -5], [430, -60], [640, -110],
];

export const BRIDGES = [
  { x: 250, z: 80 },
  { x: 120, z: 230 },
  { x: -60, z: 300 },
];

export function distToPoly(x, z, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0];
    const az = pts[i - 1][1];
    const bx = pts[i][0];
    const bz = pts[i][1];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / l2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return best;
}

export function nearRoad(x, z, width = 8) {
  for (const road of ROADS) if (distToPoly(x, z, road.pts) < width) return true;
  return false;
}

export function nearRiver(x, z, width = 8) {
  return distToPoly(x, z, RIVER) < width;
}

export function onBridge(x, z) {
  for (const b of BRIDGES) if (Math.hypot(x - b.x, z - b.z) < 16) return true;
  return false;
}
