/* OutBloom — the world: one E.Road per stage, built from its sections, its kit's grounds and edges, scenery placed by
 * the kit's rules from the stage's own seed (the same stage always looks the same), landmarks, the start grid,
 * checkpoint arches, the fork's junction (80 segments, flat, spreading to two branches with flower-pot cushions and a
 * fork sign in the gore), the goal run-in with its arch, and the physics query info(). */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, SEG = OB.SEG;
const JUNCTION = 80, RUNIN = 60, SPREAD = 2.4, DECIDE = 1.05;
OB.JUNCTION = JUNCTION; OB.SPREAD = SPREAD; OB.DECIDE = DECIDE;

/* scenery sizes in world units: collision width, height (art draws to fit them); solid unless said */
OB.SCENERY = {
  palm: [300, 4600], jpalm: [380, 4200], umbrella: [900, 1300], beachhut: [1800, 1700], lifeguard: [1100, 2500], surfrack: [900, 1100], rock: [900, 750], buoy: [320, 420, 0],
  billboard: [2600, 2800], cypress: [520, 3900], lavender: [520, 420, 0], farmhouse: [4200, 3300], beehives: [1500, 650], fence: [800, 480, 0], haybale: [900, 720],
  sunflowers: [620, 1000, 0], silo: [1600, 5200], barn: [3600, 3200], turbine: [700, 9500], lemontree: [950, 1800], sign: [420, 1500], pine: [650, 4300], boathouse: [2300, 1800],
  reeds: [420, 650, 0], cactus: [520, 1900], mesa: [6400, 9000], cherry: [1300, 2700], chalet: [3100, 2900], cow: [1000, 720, 0], streetlamp: [220, 2700], stall: [1500, 1500],
  planter: [700, 620], villa: [4200, 3100], barrel: [520, 620], winecart: [1400, 1150], flamingo: [320, 760, 0], saltpile: [1900, 1500], lamp: [220, 2500], giantleaf: [950, 1250, 0],
  fern: [720, 620, 0], orchid: [520, 760, 0], parrot: [320, 520, 0], neon: [1300, 2500], yacht: [3200, 1900, 0], nightcactus: [520, 1600, 0], heather: [620, 420, 0],
  standingstone: [620, 1900], sheep: [720, 520, 0], volleyball: [2100, 1400], sailboat: [1600, 3200, 0],
  // landmarks
  ferris: [5200, 8400], watertower: [1300, 4200], chapel: [2500, 3800], terraces: [6000, 4200], crossing: [1700, 2500], haysculpture: [2600, 3400], steamer: [4200, 2700, 0],
  waterfall: [3200, 5200], souvenir: [1700, 1700], dome: [5200, 7400], fountain: [1900, 1700], castle: [6400, 6400], liftbridge: [600, 4200], motel: [3200, 3200], dish: [3200, 4800],
  castleruin: [5200, 4200], ruin: [2600, 2800], casino: [4400, 7600], funicular: [1600, 5400],
  // the road's furniture
  cushion: [620, 560], forksign: [2600, 3000], gantry: [0, 0, 0], barrier: [1900, 900], windsock: [400, 2200], startgrid: [0, 0, 0], spectators: [1800, 900, 0], crowd: [2600, 1000, 0]
};
const sizeOf = k => OB.SCENERY[k] || [600, 1200];

/* a thing on the road: a sprite name drawn by OB.Art (or a custom draw) */
const thing = (kind, o = {}) => ({ kind, w: sizeOf(kind)[0] * (o.size || 1), h: sizeOf(kind)[1] * (o.size || 1), size: o.size || 1, flip: !!o.flip, variant: o.variant || 0, data: o.data,
  draw(g, sx, sy, scale, t, th) { if (OB.Art && OB.Art.drawThing) OB.Art.drawThing(g, this, sx, sy, scale, t, th); } });

class World {
  constructor() { this.cache = new Map(); this.mirror = false; }
  /** the road of a stage (built once; Mirror Roads builds the mirrored set) */
  stage(id) {
    const key = id + (this.mirror ? '~m' : '');
    if (!this.cache.has(key)) this.cache.set(key, this.build(id, this.mirror));
    return this.cache.get(key);
  }
  setMirror(on) { this.mirror = !!on; }
  build(id, mirror) {
    const S = OB.STAGES[id], kit = OB.KITS[S.kit], tod = OB.TOD[S.tod], mi = mirror ? -1 : 1;
    const flipG = (l, r) => mirror ? [r, l] : [l, r];
    const [gL0, gR0] = flipG(S.groundL || kit.groundL, S.groundR || kit.groundR), [eL0, eR0] = flipG(kit.edgeL || null, kit.edgeR || null);
    const colors = { road: kit.road, rumble: kit.rumble, lane: kit.lane, grass: [gL0.a, gL0.b], wall: ['#5a4a3a', '#4a3a2a'], roof: '#2a2420', portal: '#6a5a48' };
    const road = new E.Road({ segment: SEG, width: OB.ROADW, lanes: S.lanes, rumble: 3, draw: 220, height: 1000, loop: false, colors, fog: { color: tod.fog, density: S.tod === 'night' ? 3.2 : 4.2 } });
    road.stage = S; road.id = id; road.mirror = mirror;
    const rnd = OB.rand.stream('scenery:' + id, 7);
    const events = [];
    let segAt = 0;
    for (const [n, curve, hill, op = {}] of S.sections) {
      const o = Object.assign({}, op), [eL, eR] = flipG(o.edgeL !== undefined ? o.edgeL : eL0, o.edgeR !== undefined ? o.edgeR : eR0), [gL, gR] = flipG(o.groundL || gL0, o.groundR || gR0);
      const span = o.span ? Object.assign({}, o.span, { side: (o.span.side || 1) * mi }) : null;
      road.add(n, { curve: curve * mi, hill, tunnel: !!o.tunnel, w: o.w || 1, lanes: o.lanes || S.lanes, groundL: gL, groundR: gR, edgeL: o.tunnel ? null : (o.bridge && !o.edgeL ? null : eL), edgeR: o.tunnel ? null : (o.bridge && !o.edgeR ? null : eR), span, lit: !!o.lit,
        colors: o.colors ? Object.assign({}, colors, o.colors) : null, data: { bridge: !!o.bridge, event: o.event || null, gusts: o.gusts || 0, crossing: !!o.crossing, start: !!o.start } });
      if (o.event) events.push({ kind: o.event, z0: segAt * SEG, z1: (segAt + n) * SEG });
      if (o.gusts) for (let k = 0; k < o.gusts; k++) events.push({ kind: 'gust', z0: (segAt + Math.floor(n * (k + .5) / (o.gusts + .2))) * SEG, dir: (OB.hashStr(id + segAt + k) & 1 ? 1 : -1) * mi });
      segAt += n;
    }
    road.events = events;
    const stageLen = road.segs.length;
    road.stageLen = stageLen;
    // the end: a junction (rows 1-4) or a goal run-in (row 5)
    const last = road.segs[road.segs.length - 1];
    if (S.row < 5) road.add(JUNCTION, { split: [0, SPREAD], lanes: S.lanes, groundL: last.groundL, groundR: last.groundR, gore: { kind: 'grass', a: '#6ab85a', b: '#62b054' }, data: { junction: true } });
    else road.add(RUNIN, { lanes: S.lanes, groundL: last.groundL, groundR: last.groundR, data: { runin: true } });
    road.junctionAt = S.row < 5 ? stageLen * SEG : null;
    // scenery from the kit's rules (or the stage's own), seeded
    const rules = (S.rulesOverride || kit.rules).map(r => Object.assign({}, r, { side: mirror ? (r.side === 'L' ? 'R' : r.side === 'R' ? 'L' : 'both') : r.side }));
    const total = road.segs.length, junc0 = road.junctionAt ? road.junctionAt / SEG : total;
    for (const rule of rules) {
      const every = rule.every || 10;
      for (let i = 4 + Math.floor(rnd() * every); i < total - 2; i += every + Math.round((rnd() - .5) * (rule.jitter || 0) * 2)) {
        if (rule.chance && rnd() > rule.chance) continue;
        const seg = road.segs[i]; if (!seg || seg.tunnel || (seg.data && seg.data.bridge)) continue;
        for (let c = 0; c < (rule.cluster || 1); c++) {
          const sides = rule.side === 'both' ? [-1, 1] : [rule.side === 'L' ? -1 : 1];
          for (const sd of sides) {
            if (rule.side === 'both' && rnd() < .35) continue;
            const edge = sd < 0 ? seg.edgeL : seg.edgeR, gd = sd < 0 ? seg.groundL : seg.groundR;
            const off = rule.off[0] + rnd() * (rule.off[1] - rule.off[0]) + c * .35;
            if (edge && (edge.kind === 'cliff' || edge.kind === 'facade' || edge.kind === 'stonewall' || edge.kind === 'wall' || edge.kind === 'rail') && off > (edge.off || 1.18) - 1.12) continue;
            if (gd && gd.kind === 'water' && !['buoy', 'yacht', 'sailboat', 'flamingo', 'reeds'].includes(rule.s)) continue;
            if (gd && gd.kind !== 'water' && ['buoy', 'yacht', 'sailboat'].includes(rule.s)) continue;
            const size = rule.size ? rule.size[0] + rnd() * (rule.size[1] - rule.size[0]) : 1;
            const th = thing(rule.s, { size, flip: rnd() < .5, variant: Math.floor(rnd() * 4) });
            const zz = (i + c * 2) * SEG, inJ = i >= junc0;
            const t2 = road.place(Math.min(zz, (total - 1) * SEG), sd * (1.12 + off + th.w / OB.ROADW / 2), th, 1, { solid: rule.solid === false ? false : sizeOf(rule.s)[2] !== 0 });
            if (inJ) { t2.branch = sd; }
          }
        }
      }
    }
    // landmarks
    for (const lm of S.landmarks || []) {
      const i = Math.floor(lm.at * stageLen), sd = lm.side * mi, th = thing(lm.kind, { size: 1, flip: sd > 0 });
      road.place(i * SEG, sd * (1.15 + lm.off + th.w / OB.ROADW / 2), th, 1, { solid: sizeOf(lm.kind)[2] !== 0, landmark: true });
    }
    // the start grid (S1) or a checkpoint arch (the rest)
    if (id === 'S1') {
      road.place(20 * SEG, 0, thing('gantry'), 1, { solid: false, gantry: true });
      road.place(19 * SEG, 0, thing('startgrid'), 1, { solid: false });
      road.place(21 * SEG, -1.45 * mi, thing('bruno'), 1, { solid: false, bruno: true });
      road.place(24 * SEG, -1.75 * mi, thing('spectators', { variant: 2 }), 1, { solid: false });
      road.place(23 * SEG, 1.7 * mi, thing('spectators', { variant: 1 }), 1, { solid: false });
    } else {
      road.segs[2].span = { kind: 'banner', color: '#ff5f9a', postColor: '#f4f0e8', h: 2100, checkpoint: true, draw: (g, x, y, half, bh, sc) => OB.Art && OB.Art.bannerText(g, 'CHECKPOINT', x, y, half, bh, sc, '#ffffff', '#c8306a') };
      road.place(3 * SEG, -1.5, thing('spectators', { variant: 2 }), 1, { solid: false });
      road.place(3 * SEG, 1.5, thing('spectators', { variant: 3 }), 1, { solid: false });
    }
    // the junction: cushions and the fork sign in the gore, barriers (shown on a fixed route) on each branch
    if (road.junctionAt) {
      const j0 = stageLen;
      road.place((j0 + 37) * SEG, 0, thing('cushion'), 1, { solid: true, cushion: true });
      road.place((j0 + 40) * SEG, 0, thing('cushion', { variant: 1 }), 1, { solid: true, cushion: true });
      road.place((j0 + 44) * SEG, 0, thing('forksign', { data: { stage: id } }), 1, { solid: true, sign: true });
      road.barriers = [-1, 1].map(sd => { const b = road.place((j0 + 52) * SEG, 0, thing('barrier'), 1, { solid: false, barrier: sd }); b.branch = sd; b.hidden = true; return b; });
      road.place((j0 + 10) * SEG, -1.5, thing('windsock'), 1, { solid: true }).branch = 0;
    } else {
      const gz = (stageLen + 40) * SEG;
      road.segs[stageLen + 40].span = { kind: 'banner', color: '#ffcf3a', postColor: '#ffffff', h: 2300, goal: true, wide: 1.5, draw: (g, x, y, half, bh, sc) => OB.Art && OB.Art.bannerText(g, 'GOAL', x, y, half, bh, sc, '#c8306a', '#ffffff') };
      road.place(gz, -1.7, thing('crowd'), 1, { solid: false }); road.place(gz, 1.7, thing('crowd', { variant: 1 }), 1, { solid: false });
      road.place(gz - 6 * SEG, -1.6, thing('crowd', { variant: 2 }), 1, { solid: false }); road.place(gz - 6 * SEG, 1.6, thing('crowd', { variant: 3 }), 1, { solid: false });
      road.goalZ = gz;
    }
    road.sprintZ = (stageLen - 10) * SEG;
    road.photoZ = Math.floor((S.photo || .5) * stageLen) * SEG;
    road.sky = S.sky; road.tod = S.tod; road.kit = S.kit;
    return road;
  }
  /** a fixed route closes a fork's other branch: show its barrier (and make it solid) */
  closeBranch(id, side) { const road = this.stage(id); if (!road.barriers) return; road.barriers.forEach((b, i) => { const sd = i ? 1 : -1; b.hidden = side === null ? true : sd !== side; b.solid = !b.hidden; }); }
  openAll() { for (const road of this.cache.values()) if (road.barriers) road.barriers.forEach(b => { b.hidden = true; b.solid = false; }); }
  /** the physics query: what the car feels at (z, x) on a stage road. x is in half roads of the branch it is on (rel)
   *  once a fork is decided, else of the junction's frame */
  info(road, z, x, branch = 0) {
    const s = road.seg(z), sp = road.splitAt(z), L = SEG;
    const y0 = road.yAt(z - L), y1 = road.yAt(z), y2 = road.yAt(z + L);
    const absX = branch ? branch * sp + x : x;
    let onRoad, gore = false, edgeSide = 0;
    if (sp > 0) {
      onRoad = Math.abs(absX - sp) <= 1 || Math.abs(absX + sp) <= 1;
      if (!onRoad && sp > 1 && Math.abs(absX) < sp - 1) gore = true;
    } else onRoad = Math.abs(x) <= 1;
    const side = absX < 0 ? -1 : 1, gnd = side < 0 ? s.groundL : s.groundR, edge = side < 0 ? s.edgeL : s.edgeR;
    const hits = [];
    for (const k of [-1, 0, 1]) { const ss = road.segs[s.i + k]; if (!ss) continue; for (const t of ss.things) { if (!t.solid || t.hidden) continue; const toff = t.offset + (t.branch && sp ? t.branch * sp : 0); if (Math.abs(toff - absX) * OB.ROADW < t.w / 2 + OB.PLAYER_HW * OB.ROADW * .8 && Math.abs(ss.z - z) < L * 1.1) hits.push(t); } }
    return { seg: s, curve: s.curve, slope: (y2 - y0) / (2 * L), curv: (y2 - 2 * y1 + y0) / (L * L), w: s.w, lanes: s.lanes, onRoad, gore, split: sp, absX,
      ground: gnd ? gnd.kind : 'grass', edge: s.tunnel ? { kind: 'wall', off: 1.25 } : edge, tunnel: s.tunnel, junction: !!(s.data && s.data.junction), hits, data: s.data || {} };
  }
}
OB.World = new World();
OB.thing = thing;
})();
