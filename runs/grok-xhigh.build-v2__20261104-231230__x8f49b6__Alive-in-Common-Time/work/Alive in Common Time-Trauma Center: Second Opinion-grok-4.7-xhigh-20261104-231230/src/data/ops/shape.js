/** Plain coordinate helpers. Operations call these once at load and store the arrays. */

const r = (n) => Math.round(n * 1000) / 1000;

export function line(x0, y0, x1, y1, n = 16) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    pts.push([r(x0 + (x1 - x0) * t), r(y0 + (y1 - y0) * t)]);
  }
  return pts;
}

/** Gates spaced about 0.2 apart so a late release still sits inside the tear radius. */
export function gates(x0, y0, x1, y1, n) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 0.06;
    g.push([r(x), r(y)]);
  }
  return g;
}

export function gel(x0 = -1.02, y0 = -0.46, x1 = 0.78, y1 = 0.46) {
  return [x0, y0, x1, y1];
}

/** A field-sized zone whose corners sit inside the drape ellipse. */
export const DRESS = gel(-1.02, -0.42, 0.72, 0.42);

/**
 * Extra gel zones, spawned one at a time after the phase's own zone clears.
 * Zones that exist together are painted in one pass, so each layer waits
 * until the previous gelZone is gone.
 */
export function gelDress(site, extra, rect = DRESS) {
  const on = [];
  for (let i = 1; i <= extra; i++) {
    const when = i === 1
      ? { removed: 'gelZone' }
      : { all: [{ removed: 'gelZone' }, { flag: `dress${i - 1}` }] };
    on.push({
      when,
      once: true,
      do: [
        { spawn: { kind: 'gelZone', site, rect, parTime: 40 } },
        { flag: `dress${i}` },
      ],
    });
  }
  return on;
}
