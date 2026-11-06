export const P = (id, x, z, r, o) => ({ k: 'pool', id, at: [x, z], r, ...o });
export const H = (id, x, z, a, o) => ({ k: 'hook', id, at: [x, z], a, pull: 1.2, arc: 0.4, what: 'hook', ...o });
export const LAC = (id, x, z, a, len, o) => ({ k: 'lac', id, at: [x, z], a, len, ...o });
export const CUT = (id, path, o) => ({ k: 'cut', id, path, ...o });
export const MASK = (id, cx, cz, rx, rz, o) => ({ k: 'mask', id, shape: { cx, cz, rx, rz }, ...o });
export const GELLINE = (id, line, o) => ({ k: 'mask', id, shape: { line }, ...o });
export const DRESS = (id, path, o) => ({ k: 'dress', id, path, ...o });
export const POLYP = (id, x, z, o) => ({ k: 'polyp', id, at: [x, z], r: 0.4, ...o });
export const MARK = (id, x, z, o) => ({ k: 'marker', id, at: [x, z], r: 0.5, ...o });
export const STRAIN = (sk, id, o) => ({ k: 'strain', sk, id, x: 0, z: 0, ...o });
export const DRAG = (id, x, z, to, o) => ({ k: 'drag', id, at: [x, z], to, tol: 0.5, ...o });
// a swallowed prop: lance it (scalpel), then pull it out (forceps); both hidden until scanned
export const PROP = (id, x, z, a, what, o = {}) => [
  CUT('l_' + id, [[x - 0.35, z - 0.1], [x + 0.35, z + 0.1]], { hid: 'scan', x, z }),
  H('h_' + id, x, z, a, { hid: 'scan', needs: 'l_' + id, what, pull: 1.1, arc: 0.2, ...o }),
];
export const OPEN = (id = 'open', y = -0.6, x0 = -3.2, x1 = 3.2) => CUT(id, [[x0, y], [x0 / 2, y - 0.25], [x1 / 2, y + 0.2], [x1, y]]);
export const CLOSE_STAGES = (dressY = 2.2, extra = []) => [
  { id: 'suture', say: 'reyes.suture', hint: 'suture', spawn: [LAC('sut1', -2.4, 1.0, 0.1, 1.4), LAC('sut2', 1.4, 1.2, -0.1, 1.4)], until: { clear: ['lac', 'pool', 'nick'] } },
  { id: 'gel', say: 'reyes.gel', hint: 'gel', spawn: [MASK('gelp', 0, 1.8, 2.2, 0.8)], until: { clear: ['mask'] } },
  { id: 'dress', say: 'reyes.dress', hint: 'dress', spawn: [DRESS('dr', [[-4, dressY], [4, dressY]])], until: { clear: ['dress'] } },
];
