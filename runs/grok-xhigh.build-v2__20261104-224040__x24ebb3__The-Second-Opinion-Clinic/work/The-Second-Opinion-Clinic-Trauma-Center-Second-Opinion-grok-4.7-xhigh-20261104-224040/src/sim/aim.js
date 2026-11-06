/** Tissue height. The heart dome rises about 2 units; other arenas stay low. */
export function heightAt(arena, x, z, pulse = 0) {
  const r2 = x * x * 0.08 + z * z * 0.1;
  if (arena === 'heart') {
    const dome = 2.15 * Math.exp(-(x * x) / 18 - (z * z) / 12);
    return dome + Math.sin(pulse) * 0.12 * Math.exp(-r2);
  }
  if (arena === 'chest') {
    const heart = 1.7 * Math.exp(-((x - 0.4) ** 2) / 10 - ((z + 0.2) ** 2) / 8);
    const lung = 0.55 * Math.exp(-((x + 1.6) ** 2) / 14 - (z * z) / 16);
    return heart + lung + Math.sin(pulse * 0.7) * 0.05;
  }
  if (arena === 'lung') return 0.45 * Math.exp(-(x * x) / 22 - (z * z) / 14) + Math.sin(pulse * 0.6) * 0.08;
  if (arena === 'liver') return 0.7 * Math.exp(-(x * x) / 20 - ((z - 0.2) ** 2) / 12);
  if (arena === 'bone') return 0.35 + 0.25 * Math.exp(-(x * x) / 30);
  if (arena === 'spine') return 0.4 + 0.15 * Math.cos(x * 1.4) * Math.exp(-(z * z) / 10);
  return 0.12 * Math.exp(-r2);
}

/**
 * Mouse aim: iterate the ray onto the raised surface (four steps).
 * origin/dir are {x,y,z}. Returns the surface point.
 */
export function aimOnSurface(arena, origin, dir, pulse = 0) {
  let y = 0;
  let x = origin.x;
  let z = origin.z;
  const dy = dir.y || -1e-6;
  for (let i = 0; i < 4; i++) {
    const t = (y - origin.y) / dy;
    x = origin.x + dir.x * t;
    z = origin.z + dir.z * t;
    y = heightAt(arena, x, z, pulse);
  }
  return { x, y, z };
}
