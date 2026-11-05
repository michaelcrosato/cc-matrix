// Road objects (plan §7.7, §8.7): the things a request or a mission puts on the road to be hit, passed, or avoided.
// One judge per kind: when the car goes by an object, it is a hit, a miss, a sting, a cut, or a rating. The race
// steps the list each frame, and the drawing is the art module's.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});

/** an object: kind, its place on the road, and what it needs to be judged */
OB.Objects = {
  make(kind, z, x, o = {}) { return Object.assign({ kind, z, x, state: 'live', side: 1, color: null, len: 0, hit: 0 }, o); },
  /** the lane offset for a balloon or gnome: spread, never on the edge */
  /** judge one object as the car passes it (z window: 60 units before to 40 after). Returns an event or null */
  judge(o, car, race) {
    if (o.state !== 'live') return null;
    const dz = car.z - o.z, dx = car.x - o.x;
    switch (o.kind) {
      case 'balloon': case 'gnome': case 'arch': case 'bouquet': case 'bee':
        if (dz >= -60 && dz < 40 && Math.abs(dx) < .32) {
          o.state = 'hit';
          if (o.kind === 'bee') return { type: 'sting' };
          return { type: 'hit', kind: o.kind };
        }
        break;
      case 'cone':   // slalom: correct when the car passes on the cone's side
        if (dz >= -60 && dz < 40 && Math.abs(car.x) > .2) { o.state = 'hit'; return { type: Math.sign(car.x) === o.side ? 'hit' : 'wrong', kind: 'cone' }; }
        break;
      case 'gate':   // a coloured gate: the colour the sequence wants, or a wrong one
        if (dz >= -60 && dz < 40 && Math.abs(dx) < .4) { o.state = 'hit'; return { type: 'gate', color: o.color, ok: o.color === o.want }; }
        break;
      case 'ribbon': // a pair of posts with a gap: through the gap is a cut
        if (dz >= -60 && dz < 40) { o.state = 'hit'; return Math.abs(dx) < .26 ? { type: 'cut' } : { type: 'miss', kind: 'ribbon' }; }
        break;
      case 'photo': { // a box two segments long: the rating is taken on the way out
        const inside = dz >= 0 && dz < o.len;
        if (inside && Math.abs(dx) < .55) { o.inside = (o.inside || 0) + 1; o.maxV = Math.max(o.maxV || 0, car.v); o.minV = o.minV === undefined ? car.v : Math.min(o.minV, car.v); }
        if (dz < o.len) return null;   // (still on the way in or in the box: the rating waits for the car to leave it)
        if (o.state === 'live') {
          o.state = 'hit';
          const n = o.inside || 0;
          const rating = n === 0 ? 'miss' : o.minV < 50 && o.maxV < 60 ? 'perfect' : o.minV < 5 ? 'great' : o.maxV < 100 ? 'good' : 'miss';
          return { type: 'photo', rating };
        }
        return null;
      }
      default: break;
    }
    if (dz >= 40 && o.state === 'live') { o.state = 'miss'; return { type: 'miss', kind: o.kind }; }
    return null;
  },
  /** the object's road point and whether it is on screen for a car at z (for the drawing and the lists) */
  near(o, z) { return o.z > z - 300 && o.z < z + 9000; },
};
})();
