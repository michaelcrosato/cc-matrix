// Placements per site, relative to the site's centre: { m: model id, at:[dx,dz], yaw: degrees, use?: interactable, tag? }.
// Data only: add a building by adding a row. Models come from src/art/ or the engine library.
const ring = (m, n, r, o = {}) => Array.from({ length: n }, (_, i) => ({ m, at: [Math.cos(i / n * 6.283) * r, Math.sin(i / n * 6.283) * r], yaw: i / n * 360, ...o }));
const wallRun = (ax, az, bx, bz, m = 'stone-wall') => {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 6)), yaw = Math.atan2(bx - ax, bz - az) * 180 / Math.PI - 90;
  return Array.from({ length: n }, (_, i) => ({ m, at: [ax + (bx - ax) * (i + 0.5) / n, az + (bz - az) * (i + 0.5) / n], yaw, params: { length: len / n } }));
};
export const LAYOUTS = {
  'mile-forty': [
    { m: 'station-platform', at: [0, 28], yaw: 0, use: 'train' }, { m: 'clinic-tent', at: [-30, -6], yaw: 0, use: 'clinic' },
    { m: 'tin-shack', at: [28, -8], yaw: 0, use: 'tibor' }, { m: 'tibor-rack', at: [28, -10], yaw: 0, use: 'rack' },
    { m: 'tin-shack', at: [-4, -16], yaw: 180, use: 'bar' }, { m: 'notice-board', at: [8, 8], yaw: 180, use: 'board' },
    { m: 'market-stall', at: [-14, 10], yaw: 0 }, { m: 'market-stall', at: [-20, 12], yaw: 20 }, { m: 'well', at: [12, -4] }, { m: 'lamp-post', at: [-10, 2] }, { m: 'lamp-post', at: [14, 14] },
    { m: 'crate', at: [20, 16], yaw: 20 }, { m: 'barrel', at: [22, 18] }, { m: 'sack', at: [-26, 12] }, { m: 'park-bench', at: [2, 14], yaw: 90 }, { m: 'wind-cloth', at: [-36, 20] },
    { m: 'tin-shack', at: [-40, 20], yaw: 90 }, { m: 'tin-shack', at: [40, 18], yaw: -90 },
  ],
  'pump-shed': [{ m: 'tin-shack', at: [0, 0], yaw: 0 }, { m: 'safehouse-bed', at: [-1, -1], yaw: 90, use: 'bed' }, { m: 'locker', at: [1.6, -1.6], yaw: 180, use: 'locker' }, { m: 'ammo-crate', at: [-1.6, 1.4], use: 'crate' }, { m: 'barrel', at: [4, 3] }],
  'ranger-post': [{ m: 'tin-shack', at: [0, 4], yaw: 0, use: 'safehouse' }, { m: 'cage-steel', at: [10, -8], use: 'cage' }, { m: 'watchtower', at: [-12, -10] }, { m: 'sandbag-run', at: [4, -14], yaw: 0, cover: true }, { m: 'sandbag-run', at: [-6, 10], yaw: 90, cover: true }, { m: 'barrel', at: [-5, 3] }, { m: 'wind-cloth', at: [14, 6] }],
  'water-tower': [{ m: 'water-tower', at: [0, 0] }, { m: 'tin-shack', at: [8, 6], yaw: 90, use: 'safehouse' }, { m: 'sandbag-run', at: [-8, 6], yaw: 0, cover: true }, { m: 'sandbag-run', at: [8, -8], yaw: 90, cover: true }, { m: 'barrel', at: [3, 8] }],
  'fort-clement': [
    ...wallRun(-42, -42, 42, -42), ...wallRun(-42, -42, -42, 42), ...wallRun(42, -42, 42, 42), ...wallRun(-42, 42, -8, 42), ...wallRun(8, 42, 42, 42),
    { m: 'barracks', at: [-20, -18], yaw: 0 }, { m: 'barracks', at: [20, -18], yaw: 0 }, { m: 'concrete-bunker', at: [0, 12], yaw: 0, use: 'vance' },
    { m: 'watchtower', at: [-36, -36] }, { m: 'watchtower', at: [36, -36] }, { m: 'watchtower', at: [36, 34] }, { m: 'sandbag-run', at: [-8, 30], yaw: 0, cover: true }, { m: 'sandbag-run', at: [10, 30], yaw: 0, cover: true },
    { m: 'radio-mast', at: [26, 10] }, { m: 'barrel', at: [-28, 8] }, { m: 'crate', at: [-26, 12] }, { m: 'wind-cloth', at: [-2, 36] },
  ],
  'long-field': [{ m: 'concrete-bunker', at: [-60, 40], yaw: 90, tag: 'ammo' }, { m: 'sandbag-run', at: [-48, 30], yaw: 90, cover: true }, { m: 'tin-shack', at: [60, -50], yaw: 0 }, { m: 'watchtower', at: [-70, -40] }, { m: 'barrel', at: [-56, 48] }],
  granary: [{ m: 'silo', at: [-14, -8] }, { m: 'silo', at: [-6, -16] }, { m: 'silo', at: [-22, -18] }, { m: 'schoolroom', at: [14, 4], yaw: 0, use: 'ansa' }, { m: 'tin-shack', at: [-10, 14], yaw: 0 }, { m: 'tin-shack', at: [22, -14], yaw: 90 },
    { m: 'sandbag-run', at: [0, 26], yaw: 0, cover: true }, { m: 'sandbag-run', at: [24, 20], yaw: 90, cover: true }, { m: 'watchtower', at: [-30, 18] }, { m: 'barrel', at: [6, -6] }, { m: 'wind-cloth', at: [30, 4] }],
  'east-siding': [{ m: 'fuel-tank', at: [-12, -6], tag: 'fuel-tank' }, { m: 'fuel-tank', at: [0, -14], tag: 'fuel-tank' }, { m: 'fuel-tank', at: [12, -6], tag: 'fuel-tank' }, { m: 'tin-shack', at: [-4, 12], yaw: 0 }, { m: 'oil-drum', at: [6, 4], tag: 'drum' }, { m: 'oil-drum', at: [8, 5], tag: 'drum' },
    { m: 'oil-drum', at: [-8, 8], tag: 'drum' }, { m: 'watchtower', at: [22, 10] }, { m: 'sandbag-run', at: [-20, 8], yaw: 90, cover: true }, { m: 'sandbag-run', at: [18, -2], yaw: 90, cover: true }, { m: 'boxcar', at: [0, 24], yaw: 90 }],
  'three-wells': [...[[-14, -8], [0, -16], [14, -8], [-16, 8], [0, 12], [16, 10]].map(([x, z], i) => ({ m: 'harvest-hut', at: [x, z], yaw: i * 40 })), { m: 'well', at: [-6, 0] }, { m: 'well', at: [6, 0] }, { m: 'well', at: [0, -2] }, { m: 'cistern', at: [0, 22] }, { m: 'wind-cloth', at: [24, 0] }],
  'pump-station': [{ m: 'pump-station', at: [0, 0], yaw: 0, use: 'pump', tag: 'pump' }, { m: 'sandbag-run', at: [8, 8], yaw: 0, cover: true }, { m: 'barrel', at: [-6, 6] }],
  'the-cut': [{ m: 'headframe', at: [-30, -14] }, { m: 'sluice-house', at: [40, 20], yaw: 90, use: 'sluice' }, { m: 'spoil-heap', at: [-10, 40] }, { m: 'spoil-heap', at: [-44, 24] }, { m: 'watchtower', at: [30, -40] }, { m: 'sandbag-run', at: [20, 40], yaw: 90, cover: true }, { m: 'sandbag-run', at: [-30, 30], yaw: 0, cover: true }, { m: 'barrel', at: [32, 16] }, { m: 'tin-shack', at: [-40, -2], yaw: 90 }],
  observatory: [{ m: 'observatory-dome', at: [0, 0], yaw: 0, use: 'harrow' }, { m: 'trig-pillar', at: [8, 6] }, { m: 'radio-mast', at: [-8, 4] }, { m: 'campfire', at: [5, -6] }, { m: 'table', at: [2.5, 5], yaw: 0 }],
  'the-pass': [{ m: 'boulders', at: [-6, -8] }, { m: 'boulders', at: [8, 6] }, { m: 'sandbag-run', at: [0, -12], yaw: 0, cover: true }, { m: 'signpost', at: [-8, 8] }],
};
export const POST_LAYOUT = [{ m: 'boom-gate', at: [0, 0], yaw: 0 }, { m: 'sandbag-run', at: [-7, 3], yaw: 20, cover: true }, { m: 'sandbag-run', at: [7, 3], yaw: -20, cover: true }, { m: 'wind-cloth', at: [5, -3] }, { m: 'oil-drum', at: [-4, -3] }];
// Garrison: roles per site
export const GARRISON = { default: ['rifle', 'rifle', 'rifle', 'mg', 'rifle', 'sniper', 'rifle', 'rifle', 'rocket', 'rifle'] };
