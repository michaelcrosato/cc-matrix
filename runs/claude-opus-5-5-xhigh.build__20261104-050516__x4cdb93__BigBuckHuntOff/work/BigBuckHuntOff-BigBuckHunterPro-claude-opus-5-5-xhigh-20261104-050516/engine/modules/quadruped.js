/*!
my-3D2dge module QUADRUPED v0.85.2-bbho: four-legged animals as 3D skeletons posed by math (gaits with planted hooves, grazing, alert, calls, death), antlers from a seed, and birds
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine. Needs: no other module.

The Humanoid's way for deer, elk, moose, dogs, cows and small critters: a skeleton posed every step from continuous
inputs, drawn as shaded pixel volumes through any E.View; hooves locked to the ground in stance, swung to the predicted
touchdown in swing; four gaits (walk, trot, gallop, bound) blended by speed; poses (graze, alert, look, call, hurt, limp,
jump, death) blended in and out. Its hit volumes come from the same joints, so a shot matches what is drawn.
- const rig = new E.Quadruped({ species: 'whitetail' | 'elk' | 'moose' | 'fox' | 'coyote' | 'wolf' | 'cow' |
  'squirrel' | 'rabbit' | 'hare' | 'raccoon' | 'skunk' | 'marmot' | 'beaver', sex: 'm' | 'f', young, size, colors,
  antlers: { points, seed, spread } });
- rig.update(dt, { x, y, z, vx, vy, facing, ground: (x, y) -> z, alert, graze, look: { x, y, z }, hurt, limp: leg or -1,
  jump, dead: 0..1, deadSide: 1 | -1, call, flag, swim, crouch }); rig.J: joints (world, from rig.x/y/z); rig.zones():
  hit volumes in world space ({ id, kind: 'sphere' | 'capsule', a, b, r }); rig.toLocal(p) for a hit's place on the body.
- rig.draw(g, ox, oy, view) (a billboard: (ox, oy) is where its root lands); rig.drawXray(g, x, y, scale, hits, o);
  rig.drawMount(g, x, y, size); rig.debug(g, ox, oy, view); rig.height (units) for its billboard's box.
- const bird = new E.Bird({ kind: 'crow' | 'raven' | 'grouse' | 'duck' | 'loon' | 'eagle' | 'turkey' | 'golden' });
  bird.update(dt, { x, y, z, vx, vy, vz, flap, swim, walk, strut, dead }); bird.draw(g, ox, oy, view); bird.zones().
- E.Antlers.make(kind, points, seed, o) -> [[ [x, y, z], ... ] polylines (or a polygon for a palm)], in the head's frame.
Rules: units are world units (16 a metre); a rig's root is the ground under its middle; update before draw.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module QUADRUPED: load engine/my-3d2dge.js first');
const { clamp, lerp, px } = E, tones = E.tones, TAU = Math.PI * 2;
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const V = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], len: a => Math.hypot(a[0], a[1], a[2]), dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };
const tcache = new Map(); const T = c => { let t = tcache.get(c); if (!t) { t = tones(c); tcache.set(c, t); } return t; };

/* ---------- species: the skeleton at rest (local: x forward, y right, z up; world units), proportions, colours, gaits ---------- */
const DEER = {
  pelvis: [-10, 0, 14.5], withers: [8, 0, 15.8], hip: [-10, 2.6, 12], sh: [8, 2.4, 10.8],
  fore: [3.8, 4.6, 3.8, 1.4], hind: [4.6, 5.2, 4.4, 1.4], legR: [1.5, 1.05, .62, .5],
  neck: [9, 0, 15.5], head: [15.2, 0, 21], headLen: 5.6, headR: 1.9, muzR: 1.05, neckR: [2.7, 1.7], flagTail: true,
  sections: [[11, 16.4, 10.4, 2.4], [6, 16.4, 8.8, 3.2], [-2, 15.4, 9.6, 3.4], [-9, 15.4, 10.6, 3.0], [-12, 14.6, 11.6, 2.2]],
  tail: [-12, 0, 14.6], tailLen: 3.5, tailR: 1.2, ears: 2.8, earW: 1.1,
  speeds: [1.3, 3.4, 8.5], run: 'bound', stride: [1.25, 2.2, 3.6], hp: 1,
  colors: { coat: '#8c7052', back: '#6e5640', belly: '#ece4d6', throat: '#f2eee6', muzzle: '#4a382c', nose: '#1a1210', leg: '#7a5e44', hoof: '#2a2220', tailUp: '#7a5a40', tailUnder: '#f6f2ec', earIn: '#c8a88e', eye: '#140e0c', ring: '#ece4d6', antler: '#d8c8a4' }
};
function scaled(base, s, over) {   // a species from another, scaled, then changed
  const S = JSON.parse(JSON.stringify(base)), m = v => Array.isArray(v) ? v.map(x => typeof x === 'number' ? x * s : x) : v;
  for (const k of ['pelvis', 'withers', 'hip', 'sh', 'fore', 'hind', 'neck', 'head', 'tail']) S[k] = m(S[k]);
  for (const k of ['headLen', 'headR', 'muzR', 'tailLen', 'tailR', 'ears', 'earW']) S[k] *= s;
  S.legR = S.legR.map(v => v * s); S.neckR = S.neckR.map(v => v * s); S.sections = S.sections.map(r => r.map(v => v * s));
  return Object.assign(S, over);
}
const SPECIES = {
  whitetail: DEER,
  elk: scaled(DEER, 1.5, { neck: [13, 0, 22.4], head: [23.5, 0, 33.5], headLen: 9.2, neckR: [4.9, 3.0], mane: true, rump: true, flagTail: false, speeds: [1.4, 4.0, 9.0], run: 'gallop', stride: [1.7, 2.8, 4.2], hp: 1.5, tailLen: 2.6,
    colors: { coat: '#b89468', back: '#a8865c', belly: '#5a4028', throat: '#4a3020', mane: '#4e3220', muzzle: '#3a2818', nose: '#140c08', leg: '#5a3e28', hoof: '#201812', tailUp: '#e6d6b0', tailUnder: '#e6d6b0', rumpC: '#eadcb8', earIn: '#8a6a4a', eye: '#100a08', ring: '#4a3020', antler: '#c8b48c' } }),
  moose: (() => { const S = scaled(DEER, 1.9, {}); S.fore = S.fore.map(v => v * 1.15); S.hind = S.hind.map(v => v * 1.15); for (const k of ['pelvis', 'withers', 'hip', 'sh', 'neck', 'head', 'tail']) S[k][2] += 2.8; S.sections = S.sections.map(r => [r[0], r[1] + 2.8, r[2] + 2.8, r[3]]); S.sections[1][1] += 3.4; S.sections[0][1] += 3.0; S.withers[2] += 3.2;
    return Object.assign(S, { head: [S.neck[0] + 8, 0, S.neck[2] + 4.5], headLen: 15.5, headR: 3.7, muzR: 3.2, neckR: [6.2, 4.2], bell: true, hump: true, tailLen: 1.6, flagTail: false, droop: .5, speeds: [1.5, 4.5, 8.0], run: 'trot', stride: [2.1, 3.2, 4.4], hp: 2,
      colors: { coat: '#3e2e22', back: '#2e2218', belly: '#2a1e16', throat: '#2a1e16', muzzle: '#4a382a', nose: '#1a120c', leg: '#a89a84', hoof: '#2a2420', tailUp: '#3e2e22', tailUnder: '#3e2e22', earIn: '#5a4a3a', eye: '#0c0806', ring: '#3e2e22', antler: '#cdbb98', bell: '#2e2218' } }); })(),
  fox: { pelvis: [-6, 0, 7.6], withers: [5, 0, 8.2], hip: [-6, 1.6, 6.6], sh: [5, 1.5, 6.2], fore: [2.2, 2.6, 2.2, .9], hind: [2.6, 3.0, 2.6, .9], legR: [.8, .55, .4, .35],
    neck: [6, 0, 8.2], head: [9.4, 0, 10.6], headLen: 3.6, headR: 1.45, muzR: .55, neckR: [1.7, 1.2], sections: [[6.4, 9, 5.8, 1.7], [3, 9, 5.4, 2.0], [-2, 8.6, 5.8, 1.9], [-6, 8.4, 6.0, 1.8]], tail: [-7.6, 0, 7.8], tailLen: 6.5, tailR: 1.5, ears: 1.9, earW: .9, pointy: true, bushy: true,
    speeds: [1.4, 3.6, 10], run: 'gallop', stride: [.8, 1.4, 2.8], hp: .5, digit: true,
    colors: { coat: '#c8642a', back: '#b05220', belly: '#f2e8dc', throat: '#f4ece0', muzzle: '#d0702e', nose: '#140c0c', leg: '#2a1c18', hoof: '#1a1210', tailUp: '#c0602a', tailUnder: '#c0602a', tailTip: '#f4ece4', earIn: '#2a1a14', eye: '#1a0c08', ring: '#f4ece0' } },
  cow: { pelvis: [-13, 0, 19], withers: [11, 0, 19.8], hip: [-13, 4.2, 15.5], sh: [11, 3.8, 14.5], fore: [4.4, 5.2, 4, 1.6], hind: [5.4, 5.8, 4.6, 1.6], legR: [2.4, 1.6, 1.0, .9],
    neck: [12, 0, 18], head: [19, 0, 19.5], headLen: 7, headR: 3.0, muzR: 2.4, neckR: [5, 3.2], sections: [[14, 21, 11, 4.2], [8, 21.5, 9.5, 5.6], [-2, 21, 9, 6.0], [-11, 21, 11, 5.4], [-15, 19.5, 12.5, 4]], tail: [-15.5, 0, 19], tailLen: 9, tailR: .8, ears: 2.4, earW: 1.6, horns: true, bellC: true,
    speeds: [1.0, 2.0, 4.0], run: 'trot', stride: [1.5, 2.2, 2.8], hp: 3,
    colors: { coat: '#f2eee6', back: '#e8e2d6', belly: '#f0ece4', throat: '#f4f0e8', muzzle: '#e8a8a0', nose: '#c87878', leg: '#ece6dc', hoof: '#3a3028', tailUp: '#1e1a18', tailUnder: '#1e1a18', earIn: '#e8a8a0', eye: '#100c0a', ring: '#f2eee6', patch: '#1e1a1c', horn: '#e8dcc0', bell: '#c8a040' } },
  squirrel: { pelvis: [-1.8, 0, 2.6], withers: [1.6, 0, 2.8], hip: [-1.8, .6, 2.0], sh: [1.6, .55, 2.1], fore: [.8, .8, .5, .3], hind: [1.0, 1.1, .8, .4], legR: [.42, .3, .2, .2],
    neck: [1.9, 0, 3.0], head: [3.0, 0, 3.9], headLen: 1.2, headR: .75, muzR: .32, neckR: [.7, .55], sections: [[2.2, 3.4, 1.9, .75], [.6, 3.6, 1.6, .95], [-1.4, 3.4, 1.6, .95], [-2.4, 3.0, 1.9, .7]], tail: [-2.4, 0, 2.8], tailLen: 4.4, tailR: 1.25, ears: .7, earW: .4, bushy: true, curl: true,
    speeds: [.8, 2.0, 4.5], run: 'bound', stride: [.25, .45, .8], hp: .2,
    colors: { coat: '#8a7a6e', back: '#7a6a5e', belly: '#ece6dc', throat: '#ece6dc', muzzle: '#8a7a6e', nose: '#1a1210', leg: '#7a6a5e', hoof: '#3a3028', tailUp: '#9a8a7e', tailUnder: '#c8bcb0', earIn: '#b8a090', eye: '#0c0806', ring: '#ece6dc' } },
  rabbit: { pelvis: [-1.6, 0, 3.0], withers: [1.6, 0, 3.4], hip: [-1.8, .8, 2.2], sh: [1.5, .7, 2.2], fore: [.9, 1.0, .6, .3], hind: [1.5, 1.6, 1.5, .5], legR: [.6, .4, .28, .3],
    neck: [1.9, 0, 3.6], head: [3.0, 0, 4.6], headLen: 1.6, headR: .95, muzR: .45, neckR: [.9, .7], sections: [[2.0, 4.0, 2.2, .95], [.4, 4.4, 1.6, 1.25], [-1.6, 4.4, 1.4, 1.35], [-2.8, 3.8, 1.6, 1.1]], tail: [-3.1, 0, 3.2], tailLen: .5, tailR: .65, ears: 2.4, earW: .55, longEars: true,
    speeds: [.8, 2.5, 7], run: 'bound', stride: [.3, .7, 1.6], hp: .3, hop: true,
    colors: { coat: '#9a826a', back: '#86705a', belly: '#e8e0d4', throat: '#e0d6c8', muzzle: '#a89078', nose: '#4a2a2a', leg: '#8a725c', hoof: '#5a4a3a', tailUp: '#f6f2ec', tailUnder: '#f6f2ec', earIn: '#c89a8a', eye: '#0c0806', ring: '#e8e0d4' } },
  raccoon: { pelvis: [-2.6, 0, 4.4], withers: [2.4, 0, 3.8], hip: [-2.6, 1.2, 3.4], sh: [2.4, 1.1, 2.8], fore: [1.2, 1.2, .7, .4], hind: [1.5, 1.6, 1.0, .5], legR: [.7, .5, .36, .36],
    neck: [2.8, 0, 3.9], head: [4.4, 0, 4.4], headLen: 1.8, headR: 1.2, muzR: .4, neckR: [1.2, .95], sections: [[3.2, 4.8, 2.2, 1.2], [1.2, 5.6, 1.9, 1.7], [-1.2, 6.0, 2.0, 1.8], [-3.2, 5.4, 2.6, 1.5]], tail: [-3.6, 0, 4.8], tailLen: 3.6, tailR: .9, ears: .8, earW: .55, rings: true, mask: true,
    speeds: [.8, 2.0, 4.5], run: 'gallop', stride: [.4, .7, 1.2], hp: .3,
    colors: { coat: '#8a8680', back: '#6a6660', belly: '#a8a49c', throat: '#c8c4bc', muzzle: '#e8e4dc', nose: '#1a1616', leg: '#3a3634', hoof: '#2a2624', tailUp: '#8a8680', tailUnder: '#8a8680', tailRing: '#2a2624', earIn: '#e8e4dc', eye: '#0a0808', ring: '#e8e4dc', maskC: '#1e1a1a' } },
  skunk: { pelvis: [-2.4, 0, 3.6], withers: [2.2, 0, 3.2], hip: [-2.4, 1.0, 2.6], sh: [2.2, 1.0, 2.2], fore: [.9, .9, .5, .3], hind: [1.2, 1.3, .8, .4], legR: [.6, .45, .3, .3],
    neck: [2.6, 0, 3.2], head: [4.0, 0, 3.6], headLen: 1.6, headR: 1.0, muzR: .4, neckR: [1.0, .8], sections: [[3.0, 4.2, 1.8, 1.0], [1.0, 5.0, 1.5, 1.5], [-1.2, 5.4, 1.6, 1.6], [-3.0, 4.8, 2.2, 1.3]], tail: [-3.3, 0, 4.6], tailLen: 5, tailR: 1.6, ears: .5, earW: .45, bushy: true, curl: true, stripe: true,
    speeds: [.6, 1.4, 3.2], run: 'gallop', stride: [.3, .5, .9], hp: .3,
    colors: { coat: '#18161a', back: '#18161a', belly: '#18161a', throat: '#18161a', muzzle: '#18161a', nose: '#2a1e22', leg: '#141216', hoof: '#0a0a0c', tailUp: '#18161a', tailUnder: '#18161a', stripeC: '#f4f2f0', earIn: '#18161a', eye: '#3a2420', ring: '#18161a' } },
  marmot: { pelvis: [-2.6, 0, 3.6], withers: [2.4, 0, 3.6], hip: [-2.6, 1.3, 2.6], sh: [2.4, 1.2, 2.4], fore: [1.0, 1.0, .5, .3], hind: [1.2, 1.2, .7, .4], legR: [.8, .6, .4, .35],
    neck: [2.8, 0, 3.8], head: [4.4, 0, 4.4], headLen: 1.8, headR: 1.25, muzR: .55, neckR: [1.3, 1.0], sections: [[3.0, 5.0, 1.6, 1.4], [1.0, 5.8, 1.4, 2.0], [-1.4, 6.0, 1.5, 2.1], [-3.2, 5.0, 1.8, 1.6]], tail: [-3.6, 0, 3.8], tailLen: 2.4, tailR: .6, ears: .45, earW: .45,
    speeds: [.7, 1.8, 4.0], run: 'gallop', stride: [.35, .6, 1.0], hp: .3, rear: true,
    colors: { coat: '#9a7a52', back: '#7a5e3e', belly: '#c8a878', throat: '#c8a878', muzzle: '#d8c8b0', nose: '#2a1e18', leg: '#5a4430', hoof: '#2a2018', tailUp: '#6a5034', tailUnder: '#6a5034', earIn: '#5a4430', eye: '#0a0806', ring: '#d8c8b0' } },
  beaver: { pelvis: [-3, 0, 3.4], withers: [2.6, 0, 3.2], hip: [-3, 1.4, 2.4], sh: [2.6, 1.3, 2.2], fore: [.9, .9, .5, .3], hind: [1.1, 1.2, .8, .5], legR: [.7, .5, .35, .4],
    neck: [3.0, 0, 3.4], head: [4.8, 0, 3.8], headLen: 2.0, headR: 1.3, muzR: .7, neckR: [1.4, 1.1], sections: [[3.4, 4.6, 1.6, 1.4], [1.0, 5.6, 1.2, 2.2], [-1.6, 5.8, 1.2, 2.3], [-3.6, 4.8, 1.6, 1.8]], tail: [-4.2, 0, 2.4], tailLen: 4.2, tailR: 1.4, ears: .4, earW: .4, flatTail: true,
    speeds: [.6, 1.4, 2.6], run: 'trot', stride: [.3, .5, .8], hp: .4,
    colors: { coat: '#6a4a2e', back: '#5a3e26', belly: '#7a5a3a', throat: '#7a5a3a', muzzle: '#4a3422', nose: '#1a120c', leg: '#3a2818', hoof: '#2a1e14', tailUp: '#2e2622', tailUnder: '#2e2622', earIn: '#3a2818', eye: '#0a0806', ring: '#6a4a2e', teeth: '#e89a3a' } }
};
SPECIES.coyote = Object.assign(scaled(SPECIES.fox, 1.35, {}), { speeds: [1.5, 4, 11], hp: .8, colors: Object.assign({}, SPECIES.fox.colors, { coat: '#a89070', back: '#7a6650', muzzle: '#b09a7a', leg: '#9a8466', tailUp: '#8a7458', tailUnder: '#c8b89a', tailTip: '#2a2018', earIn: '#6a5240', belly: '#e0d6c4' }) });
SPECIES.wolf = Object.assign(scaled(SPECIES.fox, 1.75, {}), { speeds: [1.6, 4.5, 12], hp: 1, colors: Object.assign({}, SPECIES.fox.colors, { coat: '#8a8a8e', back: '#5e5c60', muzzle: '#a8a6a8', leg: '#8a8a8e', tailUp: '#6e6c70', tailUnder: '#b8b6b8', tailTip: '#2a282c', earIn: '#4a484c', belly: '#d8d6d2', throat: '#e0dedc' }) });
SPECIES.hare = Object.assign(scaled(SPECIES.rabbit, 1.15, {}), { colors: Object.assign({}, SPECIES.rabbit.colors, { coat: '#f2f0ee', back: '#e2e0e2', belly: '#f8f6f4', muzzle: '#eceae8', leg: '#e8e6e4', earIn: '#d8c8c8', tailUp: '#ffffff' }), earTip: '#2a2422' });
E.QUADRUPEDS = SPECIES;

const GAITS = {   // per-leg phase offsets [LF, RF, LH, RH], the stance's share of the cycle, how high a hoof lifts (share of leg), body bob
  walk: { off: [.25, .75, 0, .5], stance: .65, lift: .14, bob: .01 },
  trot: { off: [0, .5, .5, 0], stance: .45, lift: .2, bob: .025 },
  gallop: { off: [.5, .6, 0, .1], stance: .3, lift: .26, bob: .05 },
  bound: { off: [.45, .5, 0, .05], stance: .25, lift: .32, bob: .09 }
};
E.GAITS = GAITS;

/* ---------- antlers ---------- */
const Antlers = {
  /** polylines in the head's frame (x forward, y right, z up from the top of the skull), world units at the species' size:
   *  kind 'typical' (whitetail), 'elk', 'palm' (moose). Returns { lines: [[p, ...]], palms: [[p, ...]], points, spread } */
  make(kind, points, seed, o = {}) {
    const R = E.rng((seed | 0) * 9301 + 49297), s = o.size || 1, lines = [], palms = [], jit = a => a + (R() - .5) * a * .12;
    if (kind === 'typical') {
      const per = [Math.ceil(points / 2), Math.floor(points / 2)];
      for (const [si, sd] of [[0, -1], [1, 1]]) {
        const n = Math.max(2, per[si]), sp = (o.spread || 1) * s;
        const beam = [[0, sd * .9 * s, .2 * s], [-1.2 * s, sd * 2.3 * sp, 2.4 * s], [-.4 * s, sd * 4.1 * sp, 4.6 * s], [1.8 * s, sd * 4.6 * sp, 5.7 * s], [4.4 * s, sd * 3.6 * sp, 6.1 * s], [5.6 * s, sd * 2.4 * sp, 5.9 * s]].map(p => p.map(jit));
        lines.push(beam);
        if (n >= 2) lines.push([V.lerp(beam[0], beam[1], .45), [jit(.8 * s), sd * 1.7 * s, jit(3.0 * s)]]);   // the brow tine
        const tines = n - 2;
        for (let t = 0; t < tines; t++) {
          const u = 2.1 + t * (2.7 / Math.max(1, tines)), i = Math.min(4, Math.floor(u)), f = u - i, b = V.lerp(beam[i], beam[i + 1], f), L = jit((t === tines - 1 ? 2.6 : 3.4) * s);
          lines.push([b, [b[0] + jit(.9 * s), b[1] - sd * .25 * s, b[2] + L]]);
        }
        if (o.kicker && si === 0) { const b = V.lerp(beam[2], beam[3], .5); lines.push([b, [b[0] - 1.2 * s, b[1] + sd * 1.1 * s, b[2] + 1.6 * s]]); }
        if (o.drop && si === 1) { const b = V.lerp(beam[3], beam[4], .4); lines.push([b, [b[0] + .3 * s, b[1] + sd * .8 * s, b[2] - 2.6 * s]]); }
      }
    } else if (kind === 'elk') {
      const per = Math.max(4, Math.round(points / 2));
      for (const sd of [-1, 1]) {
        const beam = [[0, sd * 1.1 * s, 0], [-2.6 * s, sd * 3.6 * s, 4.6 * s], [-6.8 * s, sd * 5.2 * s, 9.6 * s], [-9.8 * s, sd * 4.8 * s, 13.6 * s], [-10.6 * s, sd * 3.4 * s, 17.4 * s], [-9.4 * s, sd * 2.2 * s, 20 * s]].map(p => p.map(jit));
        lines.push(beam);
        const T = [[.15, [5.6, .2, 2.0]], [.32, [5.0, .0, 2.6]], [.5, [4.6, -.3, 3.4]], [.62, [5.8, -.6, 4.6]], [.8, [3.6, -.4, 3.6]], [.92, [2.4, -.2, 3.0]], [.72, [2.0, .4, 3.4]]];
        for (let t = 0; t < Math.min(per - 1, T.length); t++) {
          const [u, d] = T[t], k = u * 5, i = Math.min(4, Math.floor(k)), b = V.lerp(beam[i], beam[i + 1], k - i);
          lines.push([b, [b[0] + jit(d[0] * s), b[1] + sd * jit(d[1] * s), b[2] + jit(d[2] * s)]]);
        }
      }
    } else {   // palm: a moose's paddles, spread in inches (40..72): broad, tilted out, back and up, tines round the rim
      const inch = (o.spread || 48), half = inch * 2.54 / 100 * 16 / 2 * s / 1.9 * 1.45, pts = Math.max(5, Math.round(points / 2));   // (an arcade boost: palms read at range)
      for (const sd of [-1, 1]) {
        const base = [0, sd * 1.6 * s, .4 * s], stem = [-.4 * s, sd * half * .28, 2.0 * s];
        lines.push([base, stem]);
        const nrm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
        const u = nrm([-.5, sd * .72, .4]), v = nrm([.62, sd * .08, .78]), c = V.add(stem, V.mul(u, half * .52));
        const rim = [];
        for (let i = 0; i <= 14; i++) { const th = -2.2 + i / 14 * 3.4, ru = half * .56, rv = half * .44; rim.push(V.add(c, V.add(V.mul(u, Math.cos(th) * ru), V.mul(v, Math.sin(th) * rv)))); }
        palms.push([stem].concat(rim));
        for (let t = 0; t < pts; t++) { const th = -1.25 + t / Math.max(1, pts - 1) * 2.35, p = V.add(c, V.add(V.mul(u, Math.cos(th) * half * .56), V.mul(v, Math.sin(th) * half * .44))), out = V.add(V.mul(u, Math.cos(th)), V.mul(v, Math.sin(th))); lines.push([p, V.add(p, V.mul(out, jit(1.6 * s)))]); }
      }
    }
    return { lines, palms, points, kind };
  }
};
E.Antlers = Antlers;

/* ---------- 3x3 frames ---------- */
function frame(yaw, pitch, roll) {   // columns: forward, right, up
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const f = [cy * cp, sy * cp, sp], r0 = [-sy, cy, 0], u0 = [-cy * sp, -sy * sp, cp];
  const u = [u0[0] * cr + r0[0] * sr, u0[1] * cr + r0[1] * sr, u0[2] * cr + r0[2] * sr], r = [r0[0] * cr - u0[0] * sr, r0[1] * cr - u0[1] * sr, r0[2] * cr - u0[2] * sr];
  return { f, r, u };
}
const tw = (F, p) => [F.f[0] * p[0] + F.r[0] * p[1] + F.u[0] * p[2], F.f[1] * p[0] + F.r[1] * p[1] + F.u[1] * p[2], F.f[2] * p[0] + F.r[2] * p[1] + F.u[2] * p[2]];
const tl = (F, p) => [V.dot(F.f, p), V.dot(F.r, p), V.dot(F.u, p)];

/* ---------- drawing helpers (the Humanoid's look: a dark shape, a base shifted to the light, a lit edge) ---------- */
function cap(g, A, B, ra, rb, col, dx = 0, dy = 0) {
  const ax = A[0] + dx, ay = A[1] + dy, bx = B[0] + dx, by = B[1] + dy, vx = bx - ax, vy = by - ay, L = Math.hypot(vx, vy);
  if (ra < .7 && rb < .7) { px.line(g, ax, ay, bx, by, col, 1); return; }
  if (L > .01) { const nx = -vy / L, ny = vx / L; px.poly(g, [[ax + nx * ra, ay + ny * ra], [bx + nx * rb, by + ny * rb], [bx - nx * rb, by - ny * rb], [ax - nx * ra, ay - ny * ra]], col); }
  px.disc(g, ax, ay, Math.max(0, ra - .35), col); px.disc(g, bx, by, Math.max(0, rb - .35), col);
}
function limb(g, A, B, ra, rb, c, far) {
  const t = T(c); cap(g, A, B, ra, rb, far ? t.deep : t.sh);
  if (ra > 1.1 || rb > 1.1) cap(g, A, B, Math.max(.45, ra - .75), Math.max(.45, rb - .75), far ? t.sh : t.base, -.5, -.5);
  else if (!far) px.line(g, A[0] - .5, A[1] - .5, B[0] - .5, B[1] - .5, t.base);
}
function hull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function insetPoly(pts, d) { let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= pts.length; cy /= pts.length; return pts.map(p => { const vx = p[0] - cx, vy = p[1] - cy, l = Math.hypot(vx, vy) || 1, m = Math.max(0, l - d) / l; return [cx + vx * m - .6, cy + vy * m - .6]; }); }
E.qHull = hull;

/* =============================================================================
 * QUADRUPED
 * ========================================================================== */
const LEGS = [['sh', 1, -1], ['sh', 1, 1], ['hip', 0, -1], ['hip', 0, 1]];   // LF, RF, LH, RH: [top joint, fore?, side]
class Quadruped {
  constructor(o = {}) {
    this.o = o; this.species = o.species || 'whitetail';
    const base = SPECIES[this.species] || DEER, sz = (o.size || 1) * (o.young ? .58 : 1);
    this.S = sz === 1 ? base : scaled(base, sz, { speeds: base.speeds, stride: base.stride.map(v => v * sz), run: base.run, hp: base.hp, colors: base.colors, mane: base.mane, rump: base.rump, bell: base.bell, hump: base.hump, pointy: base.pointy, bushy: base.bushy, digit: base.digit, horns: base.horns, bellC: base.bellC, curl: base.curl, longEars: base.longEars, rings: base.rings, mask: base.mask, stripe: base.stripe, flatTail: base.flatTail, hop: base.hop, rear: base.rear, flagTail: base.flagTail, droop: base.droop });
    if (o.young) { this.S.ears *= 1.35; this.S.headR *= 1.2; this.S.headLen *= 1.05; this.S.legR = this.S.legR.map(v => v * 1.1); }
    this.sz = sz; this.C = Object.assign({}, base.colors, o.colors || {});
    if (o.young && this.species === 'whitetail') this.C.coat = '#a07a52', this.spots = true;
    this.sex = o.sex || 'm'; this.young = !!o.young;
    this.antlers = null;
    if (o.antlers && this.sex === 'm' && !o.young) {
      const kind = this.species === 'elk' ? 'elk' : this.species === 'moose' ? 'palm' : 'typical';
      this.antlers = Antlers.make(kind, o.antlers.points || 8, o.antlers.seed || 1, { size: sz * (this.species === 'elk' ? 1.5 : this.species === 'moose' ? 1.9 : 1), spread: o.antlers.spread, kicker: o.antlers.kicker, drop: o.antlers.drop });
    }
    this.antlerScale = 1;
    this.x = 0; this.y = 0; this.z = 0; this.facing = o.facing || 0; this.t = 0; this.phase = 0; this.speed = 0;
    this.gaitW = { walk: 1, trot: 0, gallop: 0, bound: 0 }; this.gait = 'walk';
    this.legs = LEGS.map(() => ({ swing: false, u: 0, from: [0, 0, 0], at: [0, 0, 0], planted: null, idle: false }));
    this.w = { graze: 0, alert: 0, call: 0, hurt: 0, dead: 0, jump: 0, crouch: 0, flag: 0, chew: 0, look: 0, rear: 0, swim: 0 };
    this.head = { yaw: 0, pitch: 0 }; this.ear = [0, 0]; this.tailSw = 0; this.pitch = 0; this.roll = 0; this.bob = 0;
    this.J = {}; this.F = frame(0, 0, 0); this._zones = null; this.deadSide = 1; this.blink = 2;
    this.height = (this.S.head[2] + this.S.headR + (this.antlers ? 10 * sz * (this.species === 'elk' ? 1.6 : this.species === 'moose' ? 1.4 : 1) : 0));
    this.length = (this.S.head[0] + this.S.headLen) - this.S.tail[0];
    this.lean = 0; this._pose(0);
  }
  get hp() { return this.S.hp; }
  /** s: { x, y, z, vx, vy, facing, ground, alert, graze, look, hurt, limp, jump, dead, deadSide, call, flag, swim, crouch, rear } */
  update(dt, s = {}) {
    const S = this.S, M = 16;
    this.t += dt; this.x = s.x === undefined ? this.x : s.x; this.y = s.y === undefined ? this.y : s.y;
    const ground = s.ground || (() => s.z || 0), vx = s.vx || 0, vy = s.vy || 0, sp = Math.hypot(vx, vy);
    this.ground = ground;
    // heading: toward the motion, or as told
    if (s.facing !== undefined && (sp < 2 || s.faceLock)) this.facing = E.approachAng(this.facing, s.facing, dt * 4);
    else if (sp > 2) { const tgt = Math.atan2(vy, vx), d = E.angDiff(this.facing, tgt); this.facing = E.approachAng(this.facing, tgt, dt * (2.2 + sp / M * .6)); this.lean = lerp(this.lean, clamp(d * .4, -.25, .25), Math.min(1, dt * 4)); }
    else this.lean = lerp(this.lean, 0, Math.min(1, dt * 4));
    this.speed = lerp(this.speed, sp, Math.min(1, dt * 10));
    const w = this.w, ap = (k, v, r) => { w[k] = E.approach(w[k], v, dt * r); };
    ap('graze', s.graze || 0, 1.6); ap('alert', s.alert || 0, 3); ap('call', s.call || 0, 2.2); ap('hurt', s.hurt || 0, 6); ap('jump', s.jump || 0, 5); ap('crouch', s.crouch || 0, 4);
    ap('flag', S.flagTail ? (s.flag || (this.speed > S.speeds[1] * M * 1.15 ? 1 : 0)) : 0, 4); ap('swim', s.swim || 0, 2); ap('rear', s.rear || 0, 3);
    ap('look', s.look ? 1 : 0, 2.5); if (s.look) this.lookAt = s.look;
    const dead = s.dead || 0; if (dead > w.dead) w.dead = dead; if (s.deadSide) this.deadSide = s.deadSide;
    w.chew = w.graze > .7 ? (Math.sin(this.t * 9) > 0 ? 1 : 0) : 0;
    this.limp = s.limp === undefined ? -1 : s.limp;
    // gait by speed (m/s), blended
    const ms = this.speed / M, [w0, w1, w2] = S.speeds, run = S.run;
    const want = ms < (w0 + w1) * .55 ? 'walk' : ms < (w1 + w2) * .5 ? 'trot' : run;
    for (const g in this.gaitW) this.gaitW[g] = E.approach(this.gaitW[g], g === want ? 1 : 0, dt * 3.5);
    this.gait = want;
    const off = [0, 0, 0, 0]; let stance = 0, lift = 0, bob = 0, tw0 = 0;
    for (const g in this.gaitW) { const k = this.gaitW[g]; if (!k) continue; const G = GAITS[g]; tw0 += k; stance += G.stance * k; lift += G.lift * k; bob += G.bob * k; for (let i = 0; i < 4; i++) off[i] += G.off[i] * k; }
    stance /= tw0; lift /= tw0; bob /= tw0; for (let i = 0; i < 4; i++) off[i] /= tw0;
    const stride = lerp(lerp(S.stride[0], S.stride[1], clamp((ms - w0) / (w1 - w0), 0, 1)), S.stride[2], clamp((ms - w1) / (w2 - w1), 0, 1)) * M * (this.sz < 1 ? 1 : 1);
    const moving = this.speed > 1.2 && w.dead <= 0;
    const freq = moving ? this.speed / Math.max(1, stride) : 0;
    this.phase = (this.phase + freq * dt) % 1;
    this.cycle = freq > 0 ? 1 / freq : 1;
    this.stance = stance; this.lift = lift;
    // the body: on the ground under its legs, pitched and rolled with it, bobbing with the gait
    const F0 = frame(this.facing, 0, 0), fx = F0.f[0], fy = F0.f[1];
    const hx = S.hip[0], sx = S.sh[0], gF = ground(this.x + fx * sx, this.y + fy * sx), gH = ground(this.x + fx * hx, this.y + fy * hx), gC = ground(this.x, this.y);
    const tgtPitch = Math.atan2(gF - gH, sx - hx) * .85;
    this.pitch = lerp(this.pitch, clamp(tgtPitch, -.5, .5), Math.min(1, dt * 8));
    const gl = ground(this.x + F0.r[0] * -6, this.y + F0.r[1] * -6), gr = ground(this.x + F0.r[0] * 6, this.y + F0.r[1] * 6);
    this.roll = lerp(this.roll, clamp(Math.atan2(gr - gl, 12) * .4, -.15, .15) + this.lean * .5, Math.min(1, dt * 6));
    const ph = this.phase * TAU * (this.gait === 'walk' ? 2 : 1);
    this.bob = moving ? -Math.abs(Math.sin(ph)) * bob * S.withers[2] * (this.gait === 'bound' ? -1.4 : 1) : 0;
    this.z = (gF + gH) * .5 * .6 + gC * .4;
    const z0 = this.z;
    this._pose(dt, off, stance, lift, moving, ground, z0);
  }
  _pose(dt, off, stance, lift, moving, ground, z0) {
    const S = this.S, w = this.w, J = this.J;
    if (!ground) ground = () => this.z; if (z0 === undefined) z0 = this.z;
    // the body frame and its height
    const crouch = w.crouch * .18 + w.hurt * .06, swimDrop = w.swim * S.withers[2] * .62;
    const rearUp = w.rear * .5;
    const F = this.F = frame(this.facing, this.pitch + rearUp - w.graze * .02, this.roll);
    const lift0 = this.bob - crouch * S.withers[2] - swimDrop + w.jump * S.withers[2] * .35;
    const B = (p, dz = 0) => { const q = tw(F, p); return [q[0], q[1], q[2] + lift0 + dz]; };   // body-local -> world offset from the root (x, y, z0)
    this._B = B;
    // spine: pelvis and withers, flexing in a gallop
    const flex = moving && (this.gait === 'gallop' || this.gait === 'bound') ? Math.sin(this.phase * TAU) * .05 : 0;
    J.pelvis = B([S.pelvis[0] * (1 - flex), 0, S.pelvis[2]]); J.withers = B([S.withers[0] * (1 + flex), 0, S.withers[2]]);
    // legs
    const legsOut = [];
    LEGS.forEach(([top, fore, side], i) => {
      const L = this.legs[i], bones = fore ? S.fore : S.hind, len = bones[0] + bones[1] + bones[2] + bones[3];
      const tp = S[top], topL = [tp[0] * (fore ? 1 + flex : 1 - flex), side * tp[1], tp[2]], TJ = B(topL);
      const nx = this.x + TJ[0] + F.f[0] * (fore ? .6 : -.2) * this.sz, ny = this.y + TJ[1] + F.f[1] * (fore ? .6 : -.2) * this.sz;
      const neutral = [nx, ny, ground(nx, ny)];
      if (!L.planted) { L.planted = neutral.slice(); L.at = neutral.slice(); }
      let u = 0, inSwing = false;
      if (moving && off) { const phi = ((this.phase + off[i]) % 1 + 1) % 1; inSwing = phi >= stance; u = inSwing ? (phi - stance) / (1 - stance) : 0; L.idle = false; }
      else if (L.swing) { L.u = Math.min(1, L.u + (dt || 0) / .22); u = L.u; inSwing = u < 1; L.idle = true; }
      else if (dt && w.dead <= 0 && Math.hypot(L.planted[0] - neutral[0], L.planted[1] - neutral[1]) > 3.2 * this.sz && !this.legs.some((q, j) => j !== i && q.swing)) { inSwing = true; u = 0; L.idle = true; }
      if (this.limp === i) lift *= .4;
      if (inSwing && !L.swing) { L.swing = true; L.from = L.planted.slice(); L.u = u; }
      if (L.swing && !inSwing) { L.swing = false; const ex = L.at; L.planted = [ex[0], ex[1], ground(ex[0], ex[1])]; }
      if (L.swing) {
        L.u = u;
        const left = (1 - u) * (1 - stance) * this.cycle + stance * this.cycle * .5, vx = moving ? Math.cos(this.facing) * this.speed : 0, vy = moving ? Math.sin(this.facing) * this.speed : 0;
        const k = this.limp === i ? .4 : 1, tx = neutral[0] + vx * left * k, ty = neutral[1] + vy * left * k, tz = ground(tx, ty), e = sm(u);
        L.at = [lerp(L.from[0], tx, e), lerp(L.from[1], ty, e), lerp(L.from[2], tz, e) + Math.sin(u * Math.PI) * lift * len * (1 + w.jump * 2.5)];
      } else L.at = L.planted;
      // hoof in world -> root-relative; tucked in a jump
      let hoof = [L.at[0] - this.x, L.at[1] - this.y, L.at[2] - z0];
      if (w.jump > 0) { const tuck = B([topL[0] + (fore ? 2 : -2) * this.sz, topL[1], topL[2] - len * .45]); hoof = V.lerp(hoof, tuck, w.jump * .8); }
      if (w.swim > 0) { const pad = B([topL[0] + Math.sin(this.t * 5 + i) * 2 * this.sz, topL[1], topL[2] - len * .7]); hoof = V.lerp(hoof, pad, w.swim); }
      // lower leg (pastern + cannon) angled by the phase; the upper two bones by IK to the knee or hock
      const fold = L.swing ? Math.sin(L.u * Math.PI) : 0, back = fore ? -1 : 1;
      const pa = fore ? .55 + fold * .5 : .45 + fold * .2, ca = fore ? (fold * 1.45) : (-.15 - fold * .35 + (this.S.digit ? -.25 : 0));
      const fl = V.add(hoof, tw(frame(this.facing, 0, 0), [-Math.sin(pa) * bones[3] * .5, 0, Math.cos(pa) * bones[3]]));
      const knee = V.add(fl, tw(frame(this.facing, 0, 0), [back * Math.sin(ca) * bones[2] * (fore ? 1 : -1) * -1, 0, Math.cos(ca) * bones[2]]));
      const hint = tw(F, fore ? [-1, 0, 0] : [1, 0, 0]);
      const [mid, kn] = E.ik3(TJ, knee, bones[0], bones[1], hint);
      legsOut.push({ top: TJ, mid, knee: kn, fet: fl, hoof, fore, side });
    });
    this.legPts = legsOut;
    // neck and head: graze takes the muzzle to the ground; alert lifts it; look turns it; a call stretches it out
    const nb = S.neck, hd = S.head, nL = Math.hypot(hd[0] - nb[0], hd[2] - nb[2]);
    let nAng = Math.atan2(hd[2] - nb[2], hd[0] - nb[0]);
    nAng += w.alert * .18 - w.graze * (nAng + (this.species === 'moose' ? .55 : .9)) + w.call * -.35 + w.hurt * .3 * Math.sin(this.t * 30) + w.swim * -.2;
    if (moving) nAng -= Math.min(.35, this.speed / 16 / 12) * (this.gait === 'walk' ? .5 : 1) + (this.gait === 'walk' ? Math.sin(this.phase * TAU * 2) * .04 : 0);
    let hy = 0; if (w.look > 0 && this.lookAt) { const dx = this.lookAt.x - this.x, dy = this.lookAt.y - this.y; hy = clamp(E.angDiff(this.facing, Math.atan2(dy, dx)), -1.1, 1.1) * w.look; }
    this.head.yaw = lerp(this.head.yaw, hy, Math.min(1, (dt || .1) * 6));
    const reach = nL * (1 + w.call * .12 + w.graze * .12);
    const neckTip = [nb[0] + Math.cos(nAng) * reach * Math.cos(this.head.yaw * .5), Math.sin(this.head.yaw * .6) * reach * .55, nb[2] + Math.sin(nAng) * reach];
    J.neck = B(nb); J.neckMid = B(V.lerp(nb, neckTip, .5)); J.headBase = B(neckTip);
    const hp = -.42 - (S.droop || 0) - w.graze * .75 + w.alert * .12 + w.call * .55 - w.swim * .15, hyaw = this.head.yaw;
    const hdir = [Math.cos(hp) * Math.cos(hyaw), Math.cos(hp) * Math.sin(hyaw), Math.sin(hp)];
    const skull = V.add(neckTip, V.mul(hdir, S.headLen * .32)), muz = V.add(neckTip, V.mul(hdir, S.headLen));
    J.skull = B(skull); J.muzzle = B(muz); this._hdir = hdir; this._hyaw = hyaw; this._hp = hp;
    // ears and tail
    this.ear[0] = lerp(this.ear[0], w.alert * .9 + (Math.sin(this.t * 1.3) > .97 ? .6 : 0), Math.min(1, (dt || .1) * 8)); this.ear[1] = this.ear[0];
    this.tailSw = Math.sin(this.t * (moving ? 8 : 2.2)) * (moving ? .4 : .25) * (Math.sin(this.t * .7) > .5 ? 1 : .3);
    J.tail = B(S.tail);
    // the body's sections in world offsets (for drawing and zones)
    this.secs = S.sections.map(([x, top, bot, hw]) => ({ c: B([x, 0, (top + bot) / 2]), rv: (top - bot) / 2, rh: hw }));
    // death: knees buckle, the chest drops, the hind legs give, the body rolls away from the shot onto its side
    if (w.dead > 0) this._death(w.dead, z0);
    this._zones = null;
  }
  _death(d, z0) {
    const S = this.S, J = this.J, side = this.deadSide || 1;
    const fA = sm(d / .4), fB = sm((d - .25) / .45), roll = sm((d - .45) / .55) * 1.3 * side, settle = sm((d - .55) / .45);
    const H = S.withers[2], drop = H - (S.sections[2][3] + .6);
    const Fd = frame(this.facing, (-.35 * fA + .3 * fB) * (1 - settle) - .02 * settle, roll);
    const pivotZ = S.sections[2][3] * Math.abs(Math.sin(roll)) + (S.sections[2][2] + S.sections[2][1]) / 2 * Math.cos(roll) * 0;
    const lower = (p, local) => {   // a body-local point in the dying pose, as an offset from the root
      const dz = -(fA * .35 + fB * .4) * drop * (1 - settle * .2), q = tw(Fd, [local[0], local[1], local[2] - (S.sections[2][1] + S.sections[2][2]) / 2]);
      return [q[0], q[1], q[2] + (S.sections[2][1] + S.sections[2][2]) / 2 + dz * (1 - Math.abs(Math.sin(roll)) * .6) - Math.abs(Math.sin(roll)) * ((S.sections[2][1] + S.sections[2][2]) / 2 - S.sections[2][3] - .8)];
    };
    J.pelvis = lower(null, S.pelvis); J.withers = lower(null, S.withers); J.neck = lower(null, S.neck);
    const hd = S.head, nb = S.neck, headDown = [nb[0] + (hd[0] - nb[0]) * .9, (hd[1] || 0), lerp(hd[2], nb[2] - 1, settle)];
    J.neckMid = lower(null, V.lerp(nb, headDown, .5)); J.headBase = lower(null, headDown);
    J.skull = lower(null, V.add(headDown, [S.headLen * .3, 0, -.4 * settle])); J.muzzle = lower(null, V.add(headDown, [S.headLen * .9, 0, -S.headLen * .35 * (1 - settle)]));
    J.tail = lower(null, S.tail);
    this.secs = S.sections.map(([x, top, bot, hw]) => ({ c: lower(null, [x, 0, (top + bot) / 2]), rv: (top - bot) / 2, rh: hw, rolled: roll }));
    this.legPts = LEGS.map(([top, fore, sd], i) => {
      const bones = fore ? S.fore : S.hind, tp = S[top], len = bones[0] + bones[1] + bones[2] + bones[3], fold = (fore ? fA : fB) * (1 - settle * .6);
      const topL = [tp[0], sd * tp[1], tp[2]], out = [topL[0] + (fore ? 1.5 : -2.5) * fold * this.sz, topL[1], topL[2] - len * (1 - fold * .45)];
      const mid = V.lerp(topL, out, .45), mid2 = [mid[0] + (fore ? -1 : 1.6) * this.sz * fold, mid[1], mid[2]];
      const kn = V.lerp(topL, out, .72), fet = V.lerp(topL, out, .92);
      return { top: lower(null, topL), mid: lower(null, mid2), knee: lower(null, kn), fet: lower(null, fet), hoof: lower(null, out), fore, side: sd };
    });
    this._deadFrame = Fd;
  }
  /** the body's local frame (forward, right, up) for a hit's place on the chart */
  toLocal(p) { const F = this.w.dead > 0 && this._deadFrame ? this._deadFrame : this.F; const q = [p[0] - this.x, p[1] - this.y, p[2] - this.z]; const l = tl(F, q); return [l[0], l[1], l[2] - (this.w.dead > 0 ? 0 : this.bob)]; }
  /** hit volumes in world space, rebuilt from the joints: { id, kind, a, b, r } (spheres have a only) */
  zones(scale = 1) {
    if (this._zones && this._zs === scale) return this._zones;
    const S = this.S, B = this._B, X = this.x, Y = this.y, Z = this.z, W = p => [X + p[0] * scale, Y + p[1] * scale, Z + p[2] * scale], s = this.sz, J = this.J, out = [];
    const L = p => W(B(p)), sec = S.sections;
    const chestTop = sec[1][1], chestBot = sec[1][2], chestX = sec[1][0];
    if (this.w.dead > 0) return (this._zones = []);
    const sz0 = S.withers[2] / 15.8;   // the species' size against a whitetail
    out.push({ id: 'heart', kind: 'sphere', a: L([chestX + 0 * sz0, 0, chestBot + (chestTop - chestBot) * .26]), r: 1.5 * sz0 * scale });
    out.push({ id: 'lung', kind: 'capsule', a: L([chestX + 1.6 * sz0, 0, chestBot + (chestTop - chestBot) * .52]), b: L([chestX - 3.2 * sz0, 0, chestBot + (chestTop - chestBot) * .52]), r: 2.5 * sz0 * scale });
    out.push({ id: 'head', kind: 'capsule', a: W(J.headBase), b: W(V.lerp(J.headBase, J.muzzle, .6)), r: S.headR * .95 * scale });
    out.push({ id: 'head', kind: 'capsule', a: W(J.skull), b: W(J.muzzle), r: (S.headR + S.muzR) / 2 * .92 * scale });
    out.push({ id: 'neck', kind: 'capsule', a: W(J.neck), b: W(J.neckMid), r: (S.neckR[0] * .9 + S.neckR[1] * .1) * scale });
    out.push({ id: 'neck', kind: 'capsule', a: W(J.neckMid), b: W(J.headBase), r: (S.neckR[0] + S.neckR[1]) / 2 * .9 * scale });
    // the body itself, section by section (ellipsoids in the body's frame): what you see is what you can hit; by region it
    // scores as shoulder, gut or ham unless the round also crossed something better (lungs, the heart)
    const F = this.F, ax = [F.f, F.r, F.u], secs = S.sections, n = secs.length, region = x => x > secs[1][0] - 2 * sz0 ? 'shoulder' : x > secs[3][0] + 2 * sz0 ? 'gut' : 'ham';
    { const o = L([0, 0, 0]), e = L([1, 0, 0]), ex = e[0] - o[0], ey = e[1] - o[1], ez = e[2] - o[2], e2 = ex * ex + ey * ey + ez * ez || 1;
      /** zones.region(p): which of shoulder, gut and ham a world point on the body is in (where a round went in decides
       *  it, so the overlapping sections never score a rump shot as the gut) */
      out.region = p => region(((p[0] - o[0]) * ex + (p[1] - o[1]) * ey + (p[2] - o[2]) * ez) / e2); }
    for (let i = 0; i < n; i++) {
      const [x, top, bot, hw] = secs[i], gap = i < n - 1 ? Math.abs(secs[i][0] - secs[i + 1][0]) : Math.abs(secs[i][0] - secs[i - 1][0]);
      out.push({ id: region(x), kind: 'ell', c: L([x, 0, (top + bot) / 2]), ax, rad: [gap * (i === 0 || i === n - 1 ? .3 : .62) * scale, hw * .98 * scale, (top - bot) / 2 * .98 * scale] });
      if (i < n - 1) { const [x2, top2, bot2, hw2] = secs[i + 1], xm = (x + x2) / 2; out.push({ id: region(xm), kind: 'ell', c: L([xm, 0, ((top + bot) / 2 + (top2 + bot2) / 2) / 2]), ax, rad: [gap * .62 * scale, Math.max(hw, hw2) * .96 * scale, Math.max(top - bot, top2 - bot2) / 2 * .96 * scale] }); }
    }
    for (const z of out) if (z.kind === 'ell') { z.a = z.c; z.r = Math.max(...z.rad); }
    for (const [b0, t0] of this._earPts()) out.push({ id: 'head', kind: 'capsule', a: W(b0), b: W(t0), r: S.earW * .75 * scale });
    { const [b0, t0] = this._tailPts(); out.push({ id: 'ham', kind: 'capsule', a: W(b0), b: W(t0), r: S.tailR * (S.bushy ? 1 : .75) * scale }); }
    for (const lp of this.legPts) if (lp.fore) out.push({ id: 'shoulder', kind: 'sphere', a: W(lp.top), r: 2.2 * sz0 * scale });
    out.push({ id: 'gut', kind: 'capsule', a: L([sec[2][0] + 4 * sz0, 0, (sec[2][1] + sec[2][2]) / 2 - .4 * sz0]), b: L([sec[3][0] + 4.5 * sz0, 0, (sec[3][1] + sec[3][2]) / 2]), r: Math.min(sec[2][3], (sec[2][1] - sec[2][2]) / 2) * .92 * scale });
    out.push({ id: 'ham', kind: 'sphere', a: L([sec[3][0], 0, (sec[3][1] + sec[3][2]) / 2]), r: Math.min(sec[3][3], (sec[3][1] - sec[3][2]) / 2) * .95 * scale });
    for (const lp of this.legPts) {
      out.push({ id: 'leg', kind: 'capsule', a: W(lp.top), b: W(lp.mid), r: S.legR[0] * 1.2 * scale });
      out.push({ id: 'leg', kind: 'capsule', a: W(lp.mid), b: W(lp.knee), r: S.legR[1] * 1.05 * scale });
      out.push({ id: 'leg', kind: 'capsule', a: W(lp.knee), b: W(lp.fet), r: S.legR[2] * 1.1 * scale });
      out.push({ id: 'leg', kind: 'capsule', a: W(lp.fet), b: W(lp.hoof), r: S.legR[3] * 1.15 * scale });
    }
    if (this.antlers) {
      const A = this.antlerScale * scale;
      for (const line of this.antlers.lines) for (let i = 0; i < line.length - 1; i++) out.push({ id: 'antler', kind: 'capsule', a: W(this._antlerPt(line[i], A)), b: W(this._antlerPt(line[i + 1], A)), r: .45 * s * (this.species === 'moose' ? 1.6 : 1) * scale });
      for (const palm of this.antlers.palms) { let c = [0, 0, 0]; for (const p of palm) c = V.add(c, p); c = V.mul(c, 1 / palm.length); out.push({ id: 'antler', kind: 'sphere', a: W(this._antlerPt(c, A)), r: 3.2 * s * scale }); }
    }
    this._zs = scale; return (this._zones = out);
  }
  /** a point of the antlers (head frame) as an offset from the root */
  _antlerPt(p, A = 1) {
    const S = this.S, F = this.F, hy = this._hyaw || 0, hp = this._hp || -.4, Fh = frame(this.facing + hy, this.pitch + hp + .38 + (S.droop || 0) + (this.species === 'elk' ? .5 : 0), this.roll);
    const q = tw(Fh, [p[0] * A, p[1] * A, p[2] * A]), base = V.add(this.J.skull, tw(Fh, [-S.headR * .35, 0, S.headR * .8]));
    return V.add(base, q);
  }
  /** the ears' [base, tip] and the tail's [base, tip] (offsets from the root), as drawn and as hit */
  _earPts() {
    const S = this.S, J = this.J, out = [], ea = this.ear[0];
    for (const sd of [-1, 1]) { const base = V.add(J.skull, tw(this.F, [-S.headR * .5, sd * S.headR * .6, S.headR * .5])), dir = S.longEars ? [-.3, sd * .2, 1] : S.pointy ? [-.1, sd * .35, 1] : [-.4 + ea * .5, sd * (.9 - ea * .3), .5 + ea * .4]; out.push([base, V.add(base, V.mul(tw(this.F, dir), S.ears / Math.hypot(...dir)))]); }
    return out;
  }
  _tailPts() {
    const S = this.S, J = this.J, fl = this.w.flag, tdir = S.curl ? [-.25, 0, 1] : S.bushy ? [-1, 0, -.35 + fl * .9] : S.flatTail ? [-1, 0, -.15] : [-.35 + fl * .1, this.tailSw * .6, -1 + fl * 2.1];
    return [J.tail, V.add(J.tail, V.mul(tw(this.F, tdir), S.tailLen / Math.hypot(...tdir)))];
  }
  /* ---------- drawing ---------- */
  draw(g, ox, oy, view, o = {}) {
    const S = this.S, C = this.C, J = this.J, k = view.scale, ops = this._ops || (this._ops = []);
    ops.length = 0;
    const ax = view.ax, ay = view.ay, bx = view.bx, by = view.by, bz = view.bz, dx = view.dx, dy = view.dy, dz = view.dz;
    const P = p => [ox + ax * p[0] + ay * p[1], oy + bx * p[0] + by * p[1] + bz * p[2], dx * p[0] + dy * p[1] + dz * p[2]];
    const tiny = k * S.withers[2] < 7, small = k * S.withers[2] < 16, xr = o.xray;
    const camR = this.F.r[0] * dx + this.F.r[1] * dy;   // + : the right side faces the camera
    const bodyD = P(V.lerp(J.pelvis, J.withers, .5))[2];
    // legs
    for (const lp of this.legPts) {
      const far = (lp.side > 0) !== (camR > 0), c = C.leg, A = P(lp.top), Bm = P(lp.mid), Kn = P(lp.knee), Fe = P(lp.fet), Ho = P(lp.hoof);
      const r = S.legR.map(v => Math.max(.5, v * k)), dd = (A[2] + Ho[2]) / 2 + (far ? -.5 : .5);
      ops.push({ d: far ? bodyD - 1e3 + dd * 1e-3 : bodyD + .01 + dd * 1e-3, f: () => {
        const cc = this.w.swim > .5 ? null : c;
        limb(g, A, Bm, r[0] * 1.3, r[0], lp.fore ? C.coat : C.coat, far); limb(g, Bm, Kn, r[0] * .95, r[1], c, far);
        if (cc) { limb(g, Kn, Fe, r[2], r[2] * .9, c, far); limb(g, Fe, Ho, r[3], r[3] * 1.1, C.hoof, far); }
      } });
    }
    // torso: the hull of every section's ring, shaded; the belly, the back, the rump
    const ring = (sec, n, v0 = 0, v1 = TAU) => { const out = [], F = sec.rolled !== undefined && this._deadFrame ? this._deadFrame : this.F; for (let i = 0; i < n; i++) { const a = v0 + (v1 - v0) * i / (n - 1); out.push(P(V.add(sec.c, V.add(V.mul(F.u, Math.cos(a) * sec.rv), V.mul(F.r, Math.sin(a) * sec.rh))))); } return out; };
    ops.push({ d: bodyD, f: () => {
      const all = []; for (const s of this.secs) for (const p of ring(s, 12)) all.push(p);
      const H = hull(all), t = T(C.coat), tb = T(C.back);
      if (xr) { px.blend(g, .45, 'normal', () => px.poly(g, H, t.sh)); this._xrayInside(g, P, k); return; }
      px.poly(g, H, t.sh); if (!tiny) px.poly(g, insetPoly(H, 1.1), t.base);
      if (!tiny) {   // the darker back, lit along its ridge
        const top = []; for (const s of this.secs) for (const p of ring(s, 5, -1.1, 1.1)) top.push(p);
        const Ht = hull(top); px.poly(g, insetPoly(Ht, .9), tb.base);
        if (!small) { const ridge = this.secs.map(s => P(V.add(s.c, V.mul(this.F.u, s.rv * .92)))); for (let i = 0; i < ridge.length - 1; i++) px.line(g, ridge[i][0] - .5, ridge[i][1], ridge[i + 1][0] - .5, ridge[i + 1][1], tb.lt); }
        // the pale belly
        if (C.belly !== C.coat && !this.secs[0].rolled) { const bel = []; for (const s of this.secs.slice(1, -1)) for (const p of ring(s, 5, Math.PI - .75, Math.PI + .75)) bel.push(p); if (bel.length > 2) px.poly(g, insetPoly(hull(bel), .3), T(C.belly).base); }
        if (S.rump && C.rumpC) { const rp = []; for (const p of ring(this.secs[this.secs.length - 1], 8)) rp.push(p); for (const p of ring(this.secs[this.secs.length - 2], 8, -1, 1)) rp.push(p); px.poly(g, insetPoly(hull(rp), .8), T(C.rumpC).base); }
        if (C.patch) for (let i = 1; i < this.secs.length - 1; i += 1) { const s = this.secs[i], q = P(V.add(s.c, V.mul(this.F.r, camR > 0 ? s.rh * .8 : -s.rh * .8))); px.ell(g, q[0] + (i % 2 ? 1 : -1) * k, q[1] - s.rv * k * .2, s.rv * k * .55, s.rv * k * .4, T(C.patch).base); }
        if (S.stripe) { const st = this.secs.map(s => P(V.add(s.c, V.mul(this.F.u, s.rv * .95)))); for (let i = 0; i < st.length - 1; i++) px.line(g, st[i][0], st[i][1], st[i + 1][0], st[i + 1][1], C.stripeC, Math.max(1, Math.round(k * .55))); }
        if (this.spots && !small) { const Rr = E.rng(7); for (const s of this.secs.slice(1, -1)) for (let i = 0; i < 3; i++) { const q = P(V.add(s.c, V.add(V.mul(this.F.u, s.rv * (.3 + Rr() * .5)), V.mul(this.F.r, (camR > 0 ? 1 : -1) * s.rh * .8)))); px.dot(g, q[0] + (Rr() - .5) * 2 * k, q[1], '#f0e8dc'); } }
      }
    } });
    // neck, head, ears, muzzle, eye
    const Nk = P(J.neck), Nm = P(J.neckMid), Hb = P(J.headBase), Sk = P(J.skull), Mz = P(J.muzzle);
    const facingCam = V.dot([Math.cos(this.facing), Math.sin(this.facing), 0], [dx, dy, 0]) > 0;
    const headD = (Hb[2] + Mz[2]) / 2, neckD = facingCam ? bodyD + .02 : bodyD - .02;
    ops.push({ d: neckD, f: () => {
      const t = T(C.coat), nr0 = S.neckR[0] * k, nr1 = S.neckR[1] * k;
      if (xr) { px.blend(g, .45, 'normal', () => { cap(g, Nk, Nm, nr0, (nr0 + nr1) / 2, t.sh); cap(g, Nm, Hb, (nr0 + nr1) / 2, nr1, t.sh); }); px.line(g, Nk[0], Nk[1], Hb[0], Hb[1], '#f4f0e0'); return; }
      limb(g, Nk, Nm, nr0, (nr0 + nr1) / 2, S.mane ? C.mane : C.coat, false); limb(g, Nm, Hb, (nr0 + nr1) / 2, nr1, S.mane ? C.mane : C.coat, false);
      if (S.bell && !small) { const b0 = P(V.lerp(J.neckMid, J.headBase, .6)), b1 = [b0[0], b0[1] + nr1 * 1.9]; cap(g, b0, b1, nr1 * .3, nr1 * .18, T(C.bell || C.coat).sh); }
      if (C.throat !== C.coat && !small && !S.mane && facingCam) { const th = P(V.lerp(J.neckMid, J.headBase, .85)); px.ell(g, th[0], th[1] + nr1 * .45, Math.max(1, nr1 * .32), Math.max(1, nr1 * .22), T(C.throat).base); }
    } });
    ops.push({ d: facingCam ? neckD + .02 : neckD - .01, f: () => {
      const t = T(C.coat), hr = S.headR * k, mr = S.muzR * k;
      if (xr) { px.blend(g, .45, 'normal', () => cap(g, Sk, Mz, hr, mr, t.sh)); px.disc(g, Sk[0], Sk[1], Math.max(1, hr * .6), '#f4f0e0'); return; }
      // ears behind the skull
      if (!tiny) for (const [base, tip] of this._earPts()) {
        const A = P(base), Bt = P(tip), ew = Math.max(.7, S.earW * k);
        cap(g, A, Bt, ew, ew * (S.pointy ? .3 : .6), T(C.coat).sh); if (ew > 1.2) cap(g, A, Bt, ew * .5, ew * .3, T(C.earIn).base, -.3, -.3);
        if (this.C.earTip || this.o.earTip) px.dot(g, Bt[0], Bt[1], this.C.earTip || '#2a2420');
      }
      limb(g, Sk, Mz, hr, mr, C.coat, false);
      if (!tiny) {
        px.disc(g, Mz[0], Mz[1], Math.max(.6, mr * .85), T(C.muzzle).base);
        const nose = V.add(J.muzzle, V.mul(tw(this.F, this._hdir || [1, 0, 0]), S.muzR * .7)), N = P(nose); px.disc(g, N[0], N[1], Math.max(.5, mr * .5), C.nose);
        // the eye on the side the camera sees
        const ey = V.add(J.skull, tw(frame(this.facing + (this._hyaw || 0), this.pitch + (this._hp || 0), this.roll), [S.headR * .2, (camR > 0 ? 1 : -1) * S.headR * .72, S.headR * .35])), Ey = P(ey);
        if (S.mask) px.ell(g, Ey[0], Ey[1], Math.max(1, hr * .7), Math.max(1, hr * .35), C.maskC);
        if (hr > 4.5) px.disc(g, Ey[0], Ey[1], Math.max(1, hr * .16), C.ring);
        px.dot(g, Ey[0], Ey[1], C.eye);
        if (this.blink > 1.85 && hr > 2.5) px.dot(g, Ey[0], Ey[1], T(C.coat).sh);
        if (C.teeth && hr > 1.6) px.dot(g, N[0], N[1] + 1, C.teeth);
        if (S.horns) for (const sd of [-1, 1]) { const hb = V.add(J.skull, tw(this.F, [-S.headR * .3, sd * S.headR * .8, S.headR * .8])), ht = V.add(hb, tw(this.F, [.6, sd * 2.2, 1.6])); limb(g, P(hb), P(ht), Math.max(.6, .7 * k), Math.max(.5, .35 * k), C.horn, false); }
      }
      if (S.bellC && !small) { const b0 = P(V.lerp(J.neckMid, J.headBase, .5)); px.disc(g, b0[0], b0[1] + S.neckR[1] * k * 1.1, Math.max(1, k * 1.1), C.bell); }
    } });
    // the tail: down and swishing, or flagged up white
    const fl = this.w.flag, curl = S.curl || S.bushy, [tb, tTip] = this._tailPts();
    ops.push({ d: facingCam ? bodyD - .03 : bodyD + .03, f: () => {
      const A = P(tb), Bt = P(tTip), r = Math.max(.6, S.tailR * k);
      if (xr) { px.line(g, A[0], A[1], Bt[0], Bt[1], '#f4f0e0'); return; }
      if (S.flatTail) { cap(g, A, Bt, r * .5, r, T(C.tailUp).base); return; }
      if (S.rings) { const n = 4; for (let i = 0; i < n; i++) { const a = V.lerp(A, Bt, i / n), b = V.lerp(A, Bt, (i + 1) / n); cap(g, a, b, r, r, i % 2 ? C.tailRing : C.tailUp); } return; }
      if (S.curl) { const mid = P(V.add(tb, V.mul(tw(this.F, [-1, 0, .3]), S.tailLen * .5))); limb(g, A, mid, r * .8, r, C.tailUp, false); limb(g, mid, Bt, r, r * .8, C.tailUp, false); if (S.stripe) px.line(g, A[0], A[1], Bt[0], Bt[1], C.stripeC); return; }
      limb(g, A, Bt, r * .8, r * (curl ? 1.1 : .6), fl > .4 ? C.tailUnder : C.tailUp, false);
      if (C.tailTip) px.disc(g, Bt[0], Bt[1], Math.max(.6, r * .6), C.tailTip);
      if (fl > .4 && !tiny && S.flagTail) px.disc(g, (A[0] + Bt[0]) / 2, (A[1] + Bt[1]) / 2 - 1, Math.max(1, r * .9), '#ffffff');
    } });
    // antlers
    if (this.antlers && !xr) {
      const A = this.antlerScale, lines = this.antlers.lines.map(l => l.map(p => P(this._antlerPt(p, A)))), palms = this.antlers.palms.map(pl => pl.map(p => P(this._antlerPt(p, A))));
      const ad = facingCam ? neckD + .05 : neckD + .03, th = Math.max(1, Math.round(k * .55 * (this.species === 'moose' ? 1.4 : 1))), ac = T(C.antler || '#d8c8a4');
      ops.push({ d: ad, f: () => {
        for (const pl of palms) { px.poly(g, pl, ac.sh); if (k > 1.2) px.poly(g, insetPoly(pl, .8), ac.base); }
        for (const l of lines) for (let i = 0; i < l.length - 1; i++) px.line(g, l[i][0], l[i][1], l[i + 1][0], l[i + 1][1], ac.sh, th + (th > 1 ? 1 : 0));
        for (const l of lines) for (let i = 0; i < l.length - 1; i++) px.line(g, l[i][0] - (th > 1 ? .5 : 0), l[i][1] - (th > 1 ? .5 : 0), l[i + 1][0], l[i + 1][1], i === 0 ? ac.base : ac.lt, Math.max(1, th - 1));
        if (o.glint) for (const l of lines) { const t = l[l.length - 1]; px.dot(g, t[0], t[1], '#fffef0'); }
      } });
    }
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
    if (xr) this._xrayBones(g, P, k, o.hits);
  }
  _xrayInside(g, P, k) {   // heart and lungs inside a see-through body
    const z = this.zones(); for (const q of z) {
      if (q.id === 'lung') { const a = P([q.a[0] - this.x, q.a[1] - this.y, q.a[2] - this.z]), b = P([q.b[0] - this.x, q.b[1] - this.y, q.b[2] - this.z]); cap(g, a, b, q.r * k, q.r * k, '#e89aa8'); }
    }
    for (const q of z) if (q.id === 'heart') { const a = P([q.a[0] - this.x, q.a[1] - this.y, q.a[2] - this.z]); px.disc(g, a[0], a[1], Math.max(1, q.r * k), '#d8283a'); px.dot(g, a[0] - 1, a[1] - 1, '#ff8a90'); }
  }
  _xrayBones(g, P, k, hits) {
    const J = this.J, bone = '#f8f4e8', w = Math.max(1, Math.round(k * .3));
    px.line(g, ...P(J.pelvis).slice(0, 2), ...P(J.withers).slice(0, 2), bone, w); px.line(g, ...P(J.withers).slice(0, 2), ...P(J.neck).slice(0, 2), bone, w);
    px.line(g, ...P(J.neck).slice(0, 2), ...P(J.headBase).slice(0, 2), bone, w); px.line(g, ...P(J.headBase).slice(0, 2), ...P(J.muzzle).slice(0, 2), bone, w);
    for (const lp of this.legPts) { const pts = [lp.top, lp.mid, lp.knee, lp.fet, lp.hoof].map(p => P(p)); for (let i = 0; i < 4; i++) px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], bone, 1); }
    for (let i = 0; i < this.secs.length; i++) { const s = this.secs[i], a = P(V.add(s.c, V.mul(this.F.u, s.rv * .9))), b = P(V.add(s.c, V.mul(this.F.u, -s.rv * .5))); if (i > 0 && i < 3) px.line(g, a[0], a[1], b[0], b[1], '#d8d0c0', 1); }
    if (hits) for (const h of hits) { const p = P(h.w || [0, 0, 0]); px.disc(g, p[0], p[1], 2, '#1a0808'); px.dot(g, p[0], p[1], '#ffe040'); }
  }
  /** a side-on x-ray of the body (the Shot Chart's): body see-through, the skeleton, heart and lungs, a mark where each
   *  round went (hits: [{ local: [x, y, z], zone }]); scale: pixels a unit; facing right */
  drawXray(g, x, y, scale, hits = [], o = {}) {
    const saved = [this.facing, this.pitch, this.roll, this.x, this.y, this.z, this.w.dead, this.w.graze, this.w.alert, this.speed, this.bob, this.head.yaw, this.w.flag, this.w.call, this.w.jump];
    this.facing = 0; this.pitch = 0; this.roll = 0; this.x = 0; this.y = 0; this.z = 0; this.w.dead = 0; this.w.graze = 0; this.w.alert = .5; this.speed = 0; this.bob = 0; this.head.yaw = 0; this.w.flag = 0; this.w.call = 0; this.w.jump = 0;
    const legsSave = this.legs.map(L => [L.planted, L.at, L.swing]);
    for (const L of this.legs) { L.planted = null; L.swing = false; }
    this._pose(0, null, .5, 0, false, () => 0, 0);
    const view = new E.View('xray', 'X-ray', 0, 0, scale, 1);
    const P = p => [x + view.ax * p[0] + view.ay * p[1], y + view.bz * p[2], 0];
    // the body, see-through, dithered
    const all = []; for (const s of this.secs) for (let i = 0; i < 14; i++) { const a = i / 13 * TAU; all.push(P(V.add(s.c, [0, Math.sin(a) * s.rh, Math.cos(a) * s.rv]))); }
    const Hh = hull(all), body = o.body || '#5a7a8a';
    px.polyDither(g, Hh, body, .55); for (let i = 0; i < Hh.length; i++) { const a = Hh[i], b = Hh[(i + 1) % Hh.length]; px.line(g, a[0], a[1], b[0], b[1], o.edge || '#bfe8f4'); }
    const J = this.J, nr = this.S.neckR;
    cap(g, P(J.neck), P(J.headBase), nr[0] * scale * .9, nr[1] * scale * .9, '#3a5a6a'); cap(g, P(J.skull), P(J.muzzle), this.S.headR * scale, this.S.muzR * scale, '#3a5a6a');
    for (const lp of this.legPts) { const pts = [lp.top, lp.mid, lp.knee, lp.fet, lp.hoof].map(P); for (let i = 0; i < 4; i++) cap(g, pts[i], pts[i + 1], Math.max(1, this.S.legR[Math.min(3, i)] * scale), Math.max(1, this.S.legR[Math.min(3, i)] * scale * .8), '#3a5a6a'); }
    this._xrayInside(g, P, scale);
    this._xrayBones(g, P, scale);
    if (this.antlers) { const A = this.antlerScale; for (const l of this.antlers.lines) for (let i = 0; i < l.length - 1; i++) { const a = P(this._antlerPt(l[i], A)), b = P(this._antlerPt(l[i + 1], A)); px.line(g, a[0], a[1], b[0], b[1], '#e8dcc0', Math.max(1, Math.round(scale * .5))); } for (const pl of this.antlers.palms) px.poly(g, pl.map(p => P(this._antlerPt(p, A))), '#c8b890'); }
    const marks = [];
    for (const h of hits) { if (!h.local) continue; const p = P(h.local); marks.push([p[0], p[1], h]); px.disc(g, p[0], p[1], Math.max(2, scale * .9), '#140808'); px.disc(g, p[0], p[1], Math.max(1, scale * .45), h.lethal ? '#ff3a3a' : '#ffd040'); }
    // put the live pose back
    [this.facing, this.pitch, this.roll, this.x, this.y, this.z, this.w.dead, this.w.graze, this.w.alert, this.speed, this.bob, this.head.yaw, this.w.flag, this.w.call, this.w.jump] = saved;
    this.legs.forEach((L, i) => { [L.planted, L.at, L.swing] = legsSave[i]; });
    this._pose(0, null, .5, 0, false, this.ground || (() => this.z), this.z);
    return marks;
  }
  /** the head and antlers on a wooden plaque (the Lodge's wall, HUD icons): size = the plaque's width in pixels */
  drawMount(g, x, y, size, o = {}) {
    const wood = T(o.wood || '#7a4a28'), sc = size / Math.max(12, (this.antlers ? 26 : 16) * this.sz * (this.species === 'elk' ? 1.2 : this.species === 'moose' ? 1.1 : 1));
    if (o.plaque !== false) { const w = size * .42, h = size * .5; px.ell(g, x, y + h * .35, w + 1, h * .55 + 1, '#1a0e08'); px.ell(g, x, y + h * .35, w, h * .55, wood.sh); px.ell(g, x - 1, y + h * .33, w - 2, h * .5 - 2, wood.base); px.line(g, x - w * .6, y + h * .1, x + w * .2, y + h * .05, wood.lt); }
    if (o.dark) { px.disc(g, x, y + size * .12, size * .16, '#1a1410'); return; }
    const C = this.C, t = T(C.coat), S = this.S, hr = S.headR * sc, mr = S.muzR * sc;
    const neckTop = [x, y + size * .05], muz = [x, y + size * .05 + S.headLen * sc * .95];
    cap(g, [x, y + size * .32], neckTop, S.neckR[0] * sc * .8, S.neckR[1] * sc, t.sh); cap(g, [x, y + size * .32], neckTop, S.neckR[0] * sc * .8 - 1, S.neckR[1] * sc - 1, t.base, -.5, -.5);
    for (const sd of [-1, 1]) { const ex = x + sd * hr * 1.5, ey = y - hr * .1; cap(g, [x + sd * hr * .6, y + hr * .2], [ex, ey], Math.max(1, S.earW * sc), Math.max(1, S.earW * sc * .5), t.sh); }
    cap(g, neckTop, muz, hr, mr, t.sh); cap(g, neckTop, muz, Math.max(1, hr - 1), Math.max(1, mr - .8), t.base, -.5, -.5);
    px.disc(g, muz[0], muz[1], Math.max(1, mr * .8), T(C.muzzle).base); px.disc(g, muz[0], muz[1] + 1, Math.max(1, mr * .45), C.nose);
    for (const sd of [-1, 1]) { px.dot(g, x + sd * hr * .55, y + hr * .6, C.eye); }
    if (C.throat !== C.coat && !S.mane) px.ell(g, x, y + size * .24, Math.max(1, hr * .55), Math.max(1, hr * .3), T(C.throat).base);
    if (this.antlers) {
      const ac = T(C.antler || '#d8c8a4'), A = sc * .95, th = Math.max(1, Math.round(sc * .6));
      const Pm = p => [x + p[1] * A, y - S.headR * sc * .4 - p[2] * A * .95 + p[0] * A * .18];
      for (const pl of this.antlers.palms) { const q = pl.map(Pm); px.poly(g, q, ac.sh); px.poly(g, insetPoly(q, 1), ac.base); }
      for (const l of this.antlers.lines) for (let i = 0; i < l.length - 1; i++) { const a = Pm(l[i]), b = Pm(l[i + 1]); px.line(g, a[0], a[1], b[0], b[1], ac.sh, th + 1); px.line(g, a[0] - .5, a[1] - .5, b[0], b[1], ac.lt, th); }
    }
  }
  /** the skeleton over a drawing (dev mode) */
  debug(g, ox, oy, view) {
    const P = p => [ox + view.ax * p[0] + view.ay * p[1], oy + view.bx * p[0] + view.by * p[1] + view.bz * p[2]];
    for (const lp of this.legPts) { const pts = [lp.top, lp.mid, lp.knee, lp.fet, lp.hoof].map(P); for (let i = 0; i < 4; i++) px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#40ff80'); }
    const J = this.J; for (const [a, b] of [['pelvis', 'withers'], ['withers', 'neck'], ['neck', 'headBase'], ['headBase', 'muzzle']]) { const A = P(J[a]), B = P(J[b]); px.line(g, A[0], A[1], B[0], B[1], '#ffe040'); }
  }
}
E.Quadruped = Quadruped;

/* =============================================================================
 * BIRD  crows, ravens, grouse, ducks, loons, an eagle, a turkey: a body, a head, wings that beat, a tail, legs to walk
 * ========================================================================== */
const BIRDS = {
  crow: { R: 1.6, wing: 3.6, head: .8, beak: .7, tail: 1.6, colors: { body: '#1e1c24', wing: '#16141c', head: '#22202a', beak: '#2a2a30', eye: '#d0c8a0', belly: '#26242c' } },
  raven: { R: 2.0, wing: 4.6, head: .95, beak: 1.0, tail: 2.0, colors: { body: '#14121a', wing: '#0e0c14', head: '#18161e', beak: '#22222a', eye: '#a89a70', belly: '#1c1a22' } },
  golden: { R: 1.8, wing: 3.9, head: .85, beak: .75, tail: 1.7, colors: { body: '#e8b830', wing: '#f8d860', head: '#f0c840', beak: '#a86a20', eye: '#2a1a08', belly: '#ffe890' } },
  grouse: { R: 2.0, wing: 3.0, head: .8, beak: .4, tail: 1.8, fan: true, colors: { body: '#7a5e40', wing: '#6a5038', head: '#7a5e40', beak: '#3a2a20', eye: '#1a1008', belly: '#a88a68' } },
  duck: { R: 2.0, wing: 3.6, head: .95, beak: 1.0, tail: 1.0, colors: { body: '#8a7a6a', wing: '#5a4e44', head: '#1e6a3a', beak: '#e8c840', eye: '#0a0806', belly: '#c8bca8', ring: '#f4f0e8' } },
  loon: { R: 3.0, wing: 5.0, head: 1.3, beak: 1.6, tail: .8, swim: true, colors: { body: '#1a1a1e', wing: '#1e1e22', head: '#14141a', beak: '#2a2a2e', eye: '#c82020', belly: '#f0f0ec', spots: '#f4f4f0' } },
  eagle: { R: 3.6, wing: 11, head: 1.4, beak: 1.1, tail: 3.0, colors: { body: '#3a2a1e', wing: '#2e2018', head: '#f6f4ee', beak: '#f0c020', eye: '#e8d040', belly: '#3a2a1e', tailC: '#f6f4ee' } },
  turkey: { R: 3.6, wing: 4.6, head: 1.0, beak: .6, tail: 4.6, fan: true, legs: 5.6, wattle: true, colors: { body: '#3a2e26', wing: '#4a3a2a', head: '#c8d8e8', beak: '#c8b8a0', eye: '#0a0806', belly: '#2a221c', fanC: '#6a4a2a', wattleC: '#d82a2a', bar: '#e8dcc8' } }
};
class Bird {
  constructor(o = {}) { this.o = o; this.kind = o.kind || 'crow'; this.S = BIRDS[this.kind] || BIRDS.crow; this.C = Object.assign({}, this.S.colors, o.colors); this.t = (o.seed || 0) * 1.7; this.flapP = 0; this.flap = 1; this.x = 0; this.y = 0; this.z = 0; this.facing = 0; this.bank = 0; this.walkP = 0; this.dead = 0; this.size = o.size || 1; this.height = (this.S.legs || 1) + this.S.R * 2.4; }
  update(dt, s = {}) {
    this.t += dt; Object.assign(this, { x: s.x === undefined ? this.x : s.x, y: s.y === undefined ? this.y : s.y, z: s.z === undefined ? this.z : s.z });
    const sp = Math.hypot(s.vx || 0, s.vy || 0); if (sp > 1) { const tgt = Math.atan2(s.vy, s.vx); this.bank = lerp(this.bank, clamp(E.angDiff(this.facing, tgt) * 2, -.8, .8), Math.min(1, dt * 5)); this.facing = E.approachAng(this.facing, tgt, dt * 6); }
    else if (s.facing !== undefined) this.facing = E.approachAng(this.facing, s.facing, dt * 4);
    this.flap = E.approach(this.flap, s.flap === undefined ? 1 : s.flap, dt * 5); this.flapP += dt * (this.kind === 'eagle' ? 5 : this.kind === 'grouse' ? 26 : 16) * Math.max(.15, this.flap);
    this.vz = s.vz || 0; this.swim = !!s.swim; this.walk = s.walk || 0; this.strut = !!s.strut; this.walkP += dt * this.walk * 10;
    if (s.dead) this.dead = E.approach(this.dead, 1, dt * 3);
  }
  zones(scale = 1) { const S = this.S, sz = this.size * scale, c = [this.x, this.y, this.z + (this.swim ? S.R * .4 : (S.legs || 0) + S.R) * sz]; return [{ id: 'body', kind: 'sphere', a: c, r: S.R * 1.2 * sz }, { id: 'head', kind: 'sphere', a: [c[0] + Math.cos(this.facing) * S.R * 1.3 * sz, c[1] + Math.sin(this.facing) * S.R * 1.3 * sz, c[2] + S.R * .7 * sz], r: S.head * 1.4 * sz }, { id: 'body', kind: 'sphere', a: [c[0], c[1], c[2] + S.R * .3 * sz], r: (this.flap > .3 && !this.swim ? S.wing * .55 : S.R) * sz }]; }
  draw(g, ox, oy, view) {
    const S = this.S, C = this.C, k = view.scale * this.size, f = this.facing, cf = Math.cos(f), sf = Math.sin(f);
    const P = (fx, ry, uz) => { const wx = cf * fx - sf * ry, wy = sf * fx + cf * ry; return [ox + view.ax * wx + view.ay * wy, oy + view.bx * wx + view.by * wy + view.bz * uz]; };
    const base = this.swim ? S.R * .35 : (S.legs || 0) + S.R * (this.walk || this.strut ? 1 : 1), dead = this.dead;
    const bodyZ = lerp(base, S.R * .5, dead), flying = !this.swim && !this.walk && !this.strut && this.flap > .3 && dead < .5;
    const camR = (-sf) * view.dx + cf * view.dy, facingCam = cf * view.dx + sf * view.dy > 0;
    const R = S.R * k, tb = T(C.body), tw2 = T(C.wing);
    // legs (walkers)
    if (S.legs && !flying && dead < .5) for (const sd of [-1, 1]) { const sw = Math.sin(this.walkP + (sd > 0 ? Math.PI : 0)) * 1.2; const hip = P(0, sd * .6, bodyZ - S.R * .6), foot = P(sw, sd * .6, 0); px.line(g, hip[0], hip[1], foot[0], foot[1], '#a88a6a', Math.max(1, Math.round(k * .35))); }
    // tail (a fan for turkeys and grouse)
    const tailB = P(-S.R * .8, 0, bodyZ + (this.strut ? S.R * .5 : 0));
    if (S.fan && (this.strut || this.kind === 'grouse')) { const fan = []; const n = 9, up = this.strut ? 1 : .4; for (let i = 0; i <= n; i++) { const a = -1.3 + 2.6 * i / n; fan.push(P(-S.R * .9 - Math.cos(a) * S.tail * .3, Math.sin(a) * S.tail * 1.05, bodyZ + Math.cos(a) * S.tail * up + S.R * .2)); } fan.unshift(tailB); px.poly(g, fan, T(C.fanC || C.body).sh); px.poly(g, insetPoly(fan, 1), T(C.fanC || C.body).base); if (C.bar && k > 1) for (let i = 1; i < fan.length; i += 2) px.dot(g, fan[i][0], fan[i][1], C.bar); }
    else { const tt = P(-S.R * .8 - S.tail, 0, bodyZ - S.R * .1 + (flying ? 0 : S.R * .2)); cap(g, tailB, tt, R * .45, R * .55, T(C.tailC || C.wing).sh); }
    // wings: beat in flight, folded at rest
    const beat = Math.sin(this.flapP) * this.flap, wingZ = bodyZ + S.R * .3;
    const wingDraw = (sd, far) => {
      if (!flying) { const a = P(S.R * .4, sd * S.R * .7, wingZ), b = P(-S.R * 1.1, sd * S.R * .6, wingZ - S.R * .2); cap(g, a, b, R * .55, R * .4, far ? tw2.deep : tw2.sh); return; }
      const span = S.wing, up = beat * span * .8, root = P(S.R * .2, sd * S.R * .5, wingZ), mid = P(-S.R * .1, sd * span * .55, wingZ + up * .55), tip = P(-S.R * .6 + Math.abs(beat) * 0, sd * span, wingZ + up), back = P(-S.R * .8, sd * span * .4, wingZ + up * .3);
      px.poly(g, [root, mid, tip, back], far ? tw2.deep : tw2.sh); px.line(g, root[0], root[1], tip[0], tip[1], far ? tw2.sh : tw2.lt);
    };
    wingDraw(camR > 0 ? -1 : 1, true);
    // body and head
    const c = P(0, 0, bodyZ); px.ell(g, c[0], c[1], R * 1.15, R * .82, tb.sh); px.ell(g, c[0] - .5, c[1] - .5, Math.max(.5, R * 1.15 - 1), Math.max(.5, R * .82 - 1), tb.base);
    if (C.belly !== C.body && R > 2) px.ell(g, c[0], c[1] + R * .35, R * .8, R * .35, T(C.belly).base);
    if (C.spots && R > 3) for (let i = 0; i < 5; i++) px.dot(g, c[0] - R * .6 + i * R * .3, c[1] - R * .2 + (i % 2), C.spots);
    const neckLen = this.swim ? S.R * 1.0 : S.R * .9, hc = P(S.R * 1.05, 0, bodyZ + neckLen * .7 * (1 - dead)), hr = Math.max(.7, S.head * k);
    if (this.kind === 'loon' || this.kind === 'duck' || this.kind === 'turkey') cap(g, P(S.R * .6, 0, bodyZ + S.R * .2), hc, R * .4, hr * .8, T(C.head).sh);
    px.disc(g, hc[0], hc[1], hr, T(C.head).sh); px.disc(g, hc[0] - .3, hc[1] - .3, Math.max(.5, hr - .7), T(C.head).base);
    if (C.ring && hr > 1.5) px.line(g, hc[0] - hr, hc[1] + hr, hc[0] + hr, hc[1] + hr, C.ring);
    const bk = P(S.R * 1.05 + S.head + S.beak, 0, bodyZ + neckLen * .7 * (1 - dead) - .2); px.line(g, hc[0], hc[1], bk[0], bk[1], C.beak, Math.max(1, Math.round(hr * .5)));
    if (S.wattle) { px.line(g, hc[0] + .5, hc[1] + hr * .5, hc[0] + .5, hc[1] + hr * 2, C.wattleC, Math.max(1, Math.round(k * .5))); }
    if (hr > 1.2) px.dot(g, hc[0] + (facingCam ? 0 : 0) + (camR > 0 ? .4 : -.4) * hr, hc[1] - hr * .2, C.eye);
    wingDraw(camR > 0 ? 1 : -1, false);
  }
}
E.Bird = Bird; E.BIRDS = BIRDS;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
