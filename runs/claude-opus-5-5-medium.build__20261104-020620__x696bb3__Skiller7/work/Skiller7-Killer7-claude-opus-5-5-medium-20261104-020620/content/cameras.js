/* SKILLER7 content — hand-authored camera shots for the set-piece edges (Killer7's high corners, low angles, dollies
 * and cranes). Shots: s: [from, to] share of the edge; at / path in tiles and metres; look 'hero'. Every other edge
 * gets the director's automatic fixed shots. The content suite checks each authored camera stands in open space with
 * a clear line to the hero along its whole range. */
S7.CAMERAS = {
  '00B': {
    'c1-j5': [{ s: [0, 1], shot: 'dolly', path: [[7, 4.3, 2.6], [15, 4.3, 2.6]], look: 'hero', fov: 50 }],
    'j5-c2': [{ s: [0, 1], shot: 'fixed', at: [28.6, 6.4, 1.3], look: 'hero', lookUp: 1.4, fov: 46 }],
    'c2-l1': [{ s: [0, 1], shot: 'crane', at: [33, 4.4], zFrom: 1.6, zTo: 2.8, look: 'hero', fov: 52 }],
    'g3-c4': [{ s: [0, 1], shot: 'fixed', at: [34.6, 19.2, 2.7], look: 'hero', fov: 52 }],
    'c3-j6': [{ s: [0, 1], shot: 'fixed', at: [12.6, 17.2, 2.6], look: 'hero', fov: 52 }]
  },
  '01A': {
    'f1-mk': [{ s: [0, .5], shot: 'fixed', at: [40, 12.6, 6], look: 'hero', fov: 50 }, { s: [.5, 1], shot: 'dolly', path: [[44, 16.6, 2], [56, 16.6, 2]], look: 'hero', fov: 52 }],
    'mk-r7a': [{ s: [0, 1], shot: 'crane', at: [61, 12.4], zFrom: 2, zTo: 6, look: 'hero', fov: 54 }],
    'ls-tq': [{ s: [0, 1], shot: 'fixed', at: [44.6, 34.4, 1.2], look: 'hero', lookUp: 1.4, fov: 48 }],
    'f1-ch': [{ s: [0, .55], shot: 'follow', back: 3.6, side: 1.1, up: 1.9, ahead: 2.5, fov: 55, lag: .12 }, { s: [.55, 1], shot: 'fixed', at: [16, 9, 7], look: 'hero', fov: 54 }],
    'ht-ls': [{ s: [0, 1], shot: 'dolly', path: [[13, 30.4, 2.4], [30, 30.4, 2.4]], look: 'hero', fov: 52 }]
  },
  '01B': {
    'sc-at': [{ s: [0, .5], shot: 'fixed', at: [17.6, 19.4, 2.6], look: 'hero', fov: 48 }, { s: [.5, 1], shot: 'fixed', at: [22.5, 15.5, 4.5], look: 'hero', fov: 52 }],
    'at-hm': [{ s: [0, 1], shot: 'crane', at: [22, 13.5], zFrom: 1.8, zTo: 5, look: 'hero', fov: 54 }],
    'hm-hw': [{ s: [0, 1], shot: 'fixed', at: [36, 8, 2.2], look: 'hero', fov: 50 }],
    'bb-br': [{ s: [0, .25], shot: 'fixed', at: [55.6, 12.6, 3], look: 'hero', fov: 52 }, { s: [.25, 1], shot: 'fixed', at: [57.5, 29.6, 5], look: 'hero', fov: 56 }],
    'at-cf': [{ s: [0, 1], shot: 'fixed', at: [20.5, 32.5, 3], look: 'hero', fov: 52 }]
  },
  '01E': {
    'gl-ig': [{ s: [0, 1], shot: 'dolly', path: [[2, 19.4, 1.5], [12, 19.4, 2]], look: 'hero', fov: 50 }],
    'ig-ec': [{ s: [0, 1], shot: 'fixed', at: [12, 22.6, 3.5], look: 'hero', fov: 52 }],
    'ec-lv': [{ s: [0, .5], shot: 'fixed', at: [26, 19.3, 1.2], look: 'hero', lookUp: 1.4, fov: 48 }, { s: [.5, 1], shot: 'fixed', at: [41.6, 23.4, 3.8], look: 'hero', fov: 52 }],
    'iv-sr': [{ s: [0, 1], shot: 'fixed', at: [43, 31, 4], look: 'hero', fov: 52 }]
  }
};
for (const a in S7.CAMERAS) for (const id in S7.CAMERAS[a]) { const e = S7.AREAS[a].edges.find(x => (x.id || x.a + '-' + x.b) === id); if (!e) throw new Error('cameras: no edge ' + a + ':' + id); e.cams = S7.CAMERAS[a][id]; }
