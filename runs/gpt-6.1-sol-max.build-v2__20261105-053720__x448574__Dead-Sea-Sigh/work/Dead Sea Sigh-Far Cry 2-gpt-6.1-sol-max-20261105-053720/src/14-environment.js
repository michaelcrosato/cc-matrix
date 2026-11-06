  /* Structures:    *      concrete with stains, corrugated metal, a container's ribs, planks, sandbags in rows ---- */
  let NOISE = null;
  function noiseTex() {   // value noise that tiles (128 px), grey, filtered and mipmapped: seen from near and far
    if (NOISE) return NOISE;
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), img = g.createImageData(S, S);
    const wn = (x, y, per) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), m = a => ((a % per) + per) % per, h = (a, b) => E.hash2(m(a) + 11, m(b) + 57);
      return lerp(lerp(h(xi, yi), h(xi + 1, yi), su), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), su), sv); };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v = 0, a = .5, t = 0; for (let o = 0, f = 4; o < 5; o++, f *= 2) { v += a * wn(x / S * f, y / S * f, f); t += a; a *= .5; }
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp((v / t - .5) * 1.7 + .5, 0, 1) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); NOISE = new E.THREE.CanvasTexture(cv); NOISE.wrapS = NOISE.wrapT = E.THREE.RepeatWrapping; NOISE.colorSpace = E.THREE.NoColorSpace; NOISE.anisotropy = 4;
    return NOISE;
  }
  function structureMesh(world) {
    const T3 = E.THREE, { attribute, positionWorld, normalWorld, texture, vec2, float, fract, sin, step, abs, mix, floor, max, length } = E.TSL, NZ = noiseTex();
    const geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.Float32BufferAttribute(GEO.P, 3)); geo.setAttribute('normal', new T3.Float32BufferAttribute(GEO.N, 3));
    geo.setAttribute('color', new T3.Float32BufferAttribute(GEO.C, 3)); geo.setAttribute('kind', new T3.Float32BufferAttribute(GEO.K, 1)); geo.setIndex(GEO.I);
    geo.computeBoundingSphere();
    const kind = attribute('kind', 'float'), wp = positionWorld, side = float(1).sub(abs(normalWorld.y)), tn = vec2(normalWorld.z, normalWorld.x.negate());
    const wu = mix(wp.x, wp.xz.dot(tn.div(max(length(tn), .001))), step(.5, side));   // along the face: a wall's own horizontal, a top's x
    const nW = texture(NZ, vec2(wu, wp.y).mul(.21)).r, nT = texture(NZ, wp.xz.mul(.21)).r, n = mix(nT, nW, side), fine = texture(NZ, vec2(wu, wp.y).mul(1.9)).r;
    const concrete = n.sub(.5).mul(.36).add(1).mul(fine.sub(.5).mul(.18).add(1));
    const corr = sin(wu.mul(52)).mul(.09).add(.93).mul(n.sub(.5).mul(.22).add(1));
    const ribs = step(.5, fract(wu.div(.3))).mul(.14).add(.88).mul(n.sub(.5).mul(.34).add(1));
    const planks = step(.06, fract(wp.y.div(.2).add(step(.5, side).oneMinus().mul(wu.div(.2))))).mul(.2).add(.8).mul(fine.sub(.5).mul(.3).add(1));
    const row = floor(wp.y.div(.15)), bu = fract(wu.div(.42).add(row.mul(.5))), bv = fract(wp.y.div(.15)), bag = sin(bu.mul(Math.PI)).mul(sin(bv.mul(Math.PI))).max(0).pow(.5).mul(.4).add(.64);
    const is = i => max(float(0), float(1).sub(abs(kind.sub(i))));   // 1 for its own kind, 0 for the rest
    const k = is(0).mul(concrete).add(is(1).mul(mix(concrete, corr, side))).add(is(2).mul(mix(concrete, ribs, side))).add(is(3).mul(planks)).add(is(4).mul(bag.mul(fine.sub(.5).mul(.2).add(1)))).add(is(5).mul(fine.sub(.5).mul(.12).add(1)));
    const mat = new T3.MeshLambertNodeMaterial({ color: '#ffffff' }); mat.colorNode = attribute('color', 'vec3').mul(k);
    const mesh = new T3.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; world.scene.add(mesh);
    return mesh;
  }

  /* =====================================================================
   * SCATTER: junipers, pines and boulders (shapes) placed chunk by chunk round the player as it moves (in the steps:
   * the trunks near the player are blocks), and grass round the camera (in the frames: only the picture)
   * ===================================================================== */
  const CH = 64 * M, TREE_R = 260 * M, ROCK_R = 170 * M, TRUNK_R = 60 * M;
  const SCAT = {
    juniper: s => ['tree', { params: { h: 26, seed: s }, mats: { l: '#5a6a3a foliage size=3', b: '#5a4636 bark' } }],
    pine: () => ['bottle', { mats: { l: '#8e8a55 foliage size=3', b: '#8e795b bark' } }],
    snag: () => ['pine', { params: { h: 40, tiers: 1 }, mats: { l: '#6a5a44 bark', b: '#7a6650 bark' } }],
    rock: s => ['rock', { params: { r: 7.5, seed: s }, mats: { s: '#b4744e noise' } }]
  };
  /** a chunk's trees and boulders: [kind, seed, x, y, z, facing, scale, trunk radius] (the same every time: its own seed) */
  function chunkItems(world, cx, cy) {
    const out = [], r = E.rng(((cx * 73856093) ^ (cy * 19349663) ^ 0x5bd1e995) | 0), T = world.terrain, nm = [0, 0, 1];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = (cx * 4 + i + .15 + r() * .7) * 16 * M, y = (cy * 4 + j + .15 + r() * .7) * 16 * M, m = x / M, n = y / M, v = r(), s = r(), f = r() * TAU;
      if (biomeAt(m,n)==='salt'||biomeAt(m,n)==='brine') continue;
      if (m < 150 || n < 150 || m > HM - 150 || n > HM - 150 || rs(PADW, m, n) > .02 || rs(ROADC, m, n) > .05) continue;
      const nz = T.normal(x, y, nm)[2], z = T.ground(x, y), river = rs(RIVER, m, n), dens = sstep(.4, .68, fbm(m / 170 + 77, n / 170 + 13, 2)) * .7 + river * .35;
      if (nz > .86 && v < dens * .52) {
        const kind = z > 34 * M || river > .4 ? (s < .7 ? 'pine' : 'snag') : s < .12 ? 'snag' : 'juniper', k = kind === 'juniper' ? 1.4 + s * .9 : kind === 'pine' ? 2.2 + s * 1.2 : 2 + s;
        out.push([kind, 1 + (i + j) % 3, x, y, z - 2, f, k, kind === 'juniper' ? 2.4 * k : 2.6 * k]);
      } else if ((v > .93 && nz > .7) || (nz < .8 && nz > .55 && v > .7)) out.push(['rock', 2 + (i * 3 + j) % 4, x, y, z - 1.5, f, 1 + s * 2.4, 5 * (1 + s * 2.4)]);
    }
    return out;
  }
  const placed = new Map();   // chunk key -> { items, shapes, blocks }
  /** keep the scatter round (x, y): chunks within reach placed (at most `budget` new ones), far ones taken away, trunk
   *  blocks near (x, y) only */
  function streamScatter(world, x, y, budget = 3) {
    const cx0 = Math.floor(x / CH), cy0 = Math.floor(y / CH), R = Math.ceil(TREE_R / CH) + 1, near = [];
    for (let cy = cy0 - R; cy <= cy0 + R; cy++) for (let cx = cx0 - R; cx <= cx0 + R; cx++) {
      if (cx < 0 || cy < 0 || cx >= SIZE / CH || cy >= SIZE / CH) continue;
      const d = Math.hypot((cx + .5) * CH - x, (cy + .5) * CH - y); if (d < TREE_R && !placed.has(cy * 4096 + cx)) near.push([d, cx, cy]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cy] of near.slice(0, budget)) placed.set(cy * 4096 + cx, { cx, cy, items: chunkItems(world, cx, cy), shapes: [], blocks: null });
    for (const [key, c] of placed) {
      const d = Math.hypot((c.cx + .5) * CH - x, (c.cy + .5) * CH - y);
      if (d > TREE_R + CH) { for (const s of c.shapes) world.remove(s); if (c.blocks) for (const b of c.blocks) world.remove(b); placed.delete(key); continue; }
      // shapes: trees within reach, boulders nearer
      const wantRocks = d < ROCK_R;
      const chars=c.items.reduce((v,a)=>v+(Fire.state[cellAt(a[2],a[3])]===2?1:0),0);if (!c.shapes.length || c.rocks !== wantRocks||c.chars!==chars) {c.chars=chars;
        for (const s of c.shapes) world.remove(s); c.shapes = [];
        for (const [kind, seed, ix, iy, iz, f, k] of c.items) if (kind !== 'rock' || wantRocks) { let [id, o] = SCAT[kind](seed);if(kind!=='rock'&&Fire.state[cellAt(ix,iy)]===2){id='charred';o={};} const sh = world.shape(id, ix, iy, iz, Object.assign({ facing: f, scale: k, solid: false }, o)); if (sh) c.shapes.push(sh); }
        c.rocks = wantRocks;
      }
      const wantBlocks = d < TRUNK_R + CH;
      if (wantBlocks && !c.blocks) c.blocks = c.items.map(([kind, , ix, iy, iz, , k, tr]) => world.block({ x: ix, y: iy, z: iz, r: tr, h: kind === 'rock' ? 7 * k : 48 }));
      else if (!wantBlocks && c.blocks) { for (const b of c.blocks) world.remove(b); c.blocks = null; }
    }
  }

  /* ---- grass: 32 m tiles of tufts round the camera, each tile one merged mesh from a pool; every blade leans with the
   *      wind (gusts roll across) and bends away from the player's feet (TSL, in the vertex stage) ---- */
  const GT = 32 * M, GRASS_R = 84 * M, GPOOL = 34, GMAX = 760 * 6 * 3, grass = { pool: [], tiles: new Map(), uT: null, uP: null };
  function grassMeshes(world) {
    const T3 = E.THREE, { attribute, positionLocal, vec3, float, sin, uniform, clamp: cl, length, max } = E.TSL;
    grass.uW=uniform(new T3.Vector2(.12,.06));grass.uT = uniform(0); grass.uP = uniform(new T3.Vector3(0, -999, 0));
    const tip = attribute('tip', 'float'), p = positionLocal;
    const w = sin(grass.uT.mul(1.7).add(p.x.mul(.29)).add(p.z.mul(.17))).mul(.55).add(sin(grass.uT.mul(3.4).add(p.x.mul(.83)).sub(p.z.mul(.61))).mul(.22)).add(.42);
    const d = p.xz.sub(grass.uP.xz), l = max(length(d), .001), near = cl(float(1).sub(l.div(1.15)), 0, 1).mul(cl(float(1.6).sub(p.y.sub(grass.uP.y).abs()), 0, 1));
    const mat = new T3.MeshLambertNodeMaterial({ color: '#ffffff', side: T3.DoubleSide });
    mat.positionNode = p.add(vec3(w.mul(grass.uW.x).add(d.x.div(l).mul(near).mul(.42)), near.mul(-.16), w.mul(grass.uW.y).add(d.y.div(l).mul(near).mul(.42))).mul(tip));
    const bn=E.TSL.texture(Fire.tex,p.xz.div(2048)).level(0).r;mat.positionNode=mat.positionNode.add(vec3(0,bn.mul(tip).mul(-.5),0));mat.colorNode=E.TSL.mix(attribute('color','vec3'),vec3(.02,.018,.016),bn);
    const up = new Float32Array(GMAX * 3); for (let i = 0; i < GMAX; i++) up[i * 3 + 1] = 1;
    const normal = new T3.BufferAttribute(up, 3);
    for (let k = 0; k < GPOOL; k++) {
      const geo = new T3.BufferGeometry();
      geo.setAttribute('position', new T3.BufferAttribute(new Float32Array(GMAX * 3), 3)); geo.setAttribute('normal', normal);
      geo.setAttribute('color', new T3.BufferAttribute(new Float32Array(GMAX * 3), 3)); geo.setAttribute('tip', new T3.BufferAttribute(new Float32Array(GMAX), 1));   // (floats: WebGPU has no one-byte vertex format)
      geo.boundingSphere = new T3.Sphere(new T3.Vector3(), 1); geo.setDrawRange(0, 3);
      const m = new T3.Mesh(geo, mat); m.receiveShadow = true; m.visible = k === 0; m.matrixAutoUpdate = false; world.scene.add(m);   // (one shows at the warm-up: its shader is built)
      grass.pool.push({ mesh: m, key: null, used: -1 });
    }
  }
  /** fill a pooled mesh with tile (tx, ty)'s tufts: golden blades (a sage clump here and there), thinning on roads,
   *  pads, riverbeds and slopes, coloured from the ground under them */
  function buildGrass(world, slot, tx, ty) {
    const geo = slot.mesh.geometry, P = geo.attributes.position.array, C = geo.attributes.color.array, Tp = geo.attributes.tip.array, T = world.terrain;
    const r = E.rng(((tx * 92837111) ^ (ty * 689287499)) | 0), col = [0, 0, 0], nm = [0, 0, 1], step = 1.15; let v = 0;
    const put = (x, y, z, c, k, t) => { P[v * 3] = x / M; P[v * 3 + 1] = z / M; P[v * 3 + 2] = y / M; C[v * 3] = srgb(c[0] * k / 255); C[v * 3 + 1] = srgb(c[1] * k / 255); C[v * 3 + 2] = srgb(c[2] * k / 255); Tp[v] = t; v++; };
    for (let gy = 0; gy < GT / M / step; gy++) for (let gx = 0; gx < GT / M / step; gx++) {
      const x = tx * GT + (gx + r()) * step * M, y = ty * GT + (gy + r()) * step * M, m = x / M, n = y / M, a = r(), b = r();
      const keep = (FUEL[biomeAt(m,n)]?1:0) * (1 - sstep(.05, .5, rs(ROADC, m, n))) * (1 - sstep(.3, .8, rs(PADW, m, n))) * (1 - rs(RIVER, m, n) * .85) * sstep(.78, .9, T.normal(x, y, nm)[2]) * (.55 + N2(m / 9, n / 9) * .6);
      if (a > keep || v > GMAX - 20) continue;
      const z = T.ground(x, y); color(x, y, z, 1, col);
      const sage = N2(m / 14 + 40, n / 14 + 7) > .7 && b < .5, blades = sage ? 5 : 6, hgt = (biomeAt(m,n)==='reeds'?1.3+b*.85:(sage ? .3 : .3 + b * .26)) * M, wid = (sage ? .12 : .042) * M;
      const tint = sage ? [128, 140, 110] : [col[0] * 1.02 + 6, col[1] * 1.02 + 4, col[2] * .9];
      for (let k = 0; k < blades; k++) {
        const ang = (k / blades + b) * TAU, lean = (sage ? .55 : .22 + ((k * 13) % 7) / 30) * hgt, ca = Math.cos(ang), sa = Math.sin(ang), ox = ca * .06 * M, oy = sa * .06 * M;
        put(x + ox - sa * wid, y + oy + ca * wid, z, tint, .62, 0); put(x + ox + sa * wid, y + oy - ca * wid, z, tint, .62, 0);
        put(x + ox + ca * lean, y + oy + sa * lean, z + hgt * (.85 + ((k * 37) % 10) / 40), tint, 1.18, 1);
      }
    }
    for (const a of ['position', 'color', 'tip']) { geo.attributes[a].needsUpdate = true; geo.attributes[a].clearUpdateRanges(); geo.attributes[a].addUpdateRange(0, v * (a === 'tip' ? 1 : 3)); }
    geo.setDrawRange(0, v); geo.boundingSphere.center.set((tx + .5) * GT / M, T.ground((tx + .5) * GT, (ty + .5) * GT) / M, (ty + .5) * GT / M); geo.boundingSphere.radius = GT / M * .75 + 8;
    slot.key = tx + ':' + ty;
  }
  /** a frame's grass round the camera at (x, y): the tiles in reach shown (up to `budget` new ones built), the rest hidden */
  function drawGrass(world, x, y, budget = 2) {
    const f = (grass.frame = (grass.frame || 0) + 1), R = Math.ceil(GRASS_R / GT), tx0 = Math.floor(x / GT), ty0 = Math.floor(y / GT), want = [];
    for (let ty = ty0 - R; ty <= ty0 + R; ty++) for (let tx = tx0 - R; tx <= tx0 + R; tx++) { const d = Math.hypot((tx + .5) * GT - x, (ty + .5) * GT - y); if (d < GRASS_R) want.push([d, tx, ty]); }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, tx, ty] of want) {
      const key = tx + ':' + ty; let s = grass.tiles.get(key);
      if (!s && budget > 0) { s = grass.pool.filter(p => p.used < f - 1).sort((a, b) => a.used - b.used)[0]; if (s) { if (s.key) grass.tiles.delete(s.key); buildGrass(world, s, tx, ty); grass.tiles.set(key, s); budget--; } }
      if (s) s.used = f;
    }
    for (const p of grass.pool) p.mesh.visible = p.used === f;
  }

  /* =====================================================================
   * FX: tracers (streaks that fly from the muzzle to what was hit), bullet holes (a ring of decals), impacts by surface
   * ===================================================================== */
  const TR_MAX = 64, DC_MAX = 160, FL_MAX = 24, FL_V = 3 * (16 + 6 * 2 + 2), fx = { tracers: [], decals: 0, trMesh: null, dcMesh: null, flW: null, flO: null, cam: [0, 0, 0], flashes: { world: [], ov: [] }, stars: [] };
  function fxMeshes(world) {
    const T3 = E.THREE, { attribute } = E.TSL;
    const tg = new T3.BufferGeometry(), ti = [];
    for (let k = 0; k < TR_MAX; k++) ti.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
    tg.setAttribute('position', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setAttribute('color', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setIndex(ti);
    tg.setAttribute('normal', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setDrawRange(0, 6);
    const tm = new T3.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide, fog: false }); tm.colorNode = attribute('color', 'vec3');
    fx.trMesh = new T3.Mesh(tg, tm); fx.trMesh.frustumCulled = false; fx.trMesh.renderOrder = 3; world.scene.add(fx.trMesh);
    const dg = new T3.BufferGeometry(), di = [];
    for (let k = 0; k < DC_MAX; k++) for (let q = 0; q < 6; q++) di.push(k * 7, k * 7 + 1 + q, k * 7 + 1 + (q + 1) % 6);
    dg.setAttribute('position', new T3.BufferAttribute(new Float32Array(DC_MAX * 21), 3)); dg.setAttribute('dc', new T3.BufferAttribute(new Float32Array(DC_MAX * 28), 4));
    dg.setAttribute('normal', new T3.BufferAttribute(new Float32Array(DC_MAX * 21), 3)); dg.setIndex(di);
    const dm = new T3.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: T3.DoubleSide });
    dm.colorNode = attribute('dc', 'vec4').rgb; dm.opacityNode = attribute('dc', 'vec4').a;
    fx.dcMesh = new T3.Mesh(dg, dm); fx.dcMesh.frustumCulled = false; fx.dcMesh.renderOrder = 1; world.scene.add(fx.dcMesh);
    const flashMesh = (sc, mat) => {
      const g = new T3.BufferGeometry(); for (const a of ['position', 'color', 'normal']) g.setAttribute(a, new T3.BufferAttribute(new Float32Array(FL_MAX * FL_V * 3), 3));
      g.setDrawRange(0, 3); const m = new T3.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 4; sc.add(m); return m;
    };
    const tmO = tm.clone(); tmO.colorNode = tm.colorNode; tmO.depthTest = false;   // (on the overlay a flash draws over the gun or the fist that made it)
    fx.flW = flashMesh(world.scene, tm); fx.flO = flashMesh(world.overlay.scene, tmO);
  }
  /** a tracer from a to b (engine units): a bright streak flying at `speed` units a second */
  function tracer(a, b, color = '#ffd890', speed = 9000, width = .5) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (d < 8) return;
    fx.tracers.push({ a: a.slice(), b: b.slice(), d, t: 0, life: d / speed + .03, c: linOf(color), w: width });
    if (fx.tracers.length > TR_MAX) fx.tracers.shift();
  }
  /** a bullet hole (or a scorch: big) at a point on a surface, facing its normal n */
  function decal(p, n, r = .9, color = '#16120e', alpha = .92) {
    const k = fx.decals++ % DC_MAX, g = fx.dcMesh.geometry, P = g.attributes.position.array, Cc = g.attributes.dc.array, c = linOf(color);
    const nl = Math.hypot(n[0], n[1], n[2]) || 1, nx = n[0] / nl, ny = n[1] / nl, nz = n[2] / nl, ax = Math.abs(nz) < .9 ? [0, 0, 1] : [1, 0, 0];
    let tx = ny * ax[2] - nz * ax[1], ty = nz * ax[0] - nx * ax[2], tz = nx * ax[1] - ny * ax[0]; const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx, rot = (fx.decals * 2.39) % TAU;
    const set = (i, x, y, z, a) => { P[(k * 7 + i) * 3] = x / M; P[(k * 7 + i) * 3 + 1] = z / M; P[(k * 7 + i) * 3 + 2] = y / M; const o = (k * 7 + i) * 4; Cc[o] = c[0]; Cc[o + 1] = c[1]; Cc[o + 2] = c[2]; Cc[o + 3] = a; };
    const cx = p[0] + nx * .12, cy = p[1] + ny * .12, cz = p[2] + nz * .12; set(0, cx, cy, cz, alpha);
    for (let q = 0; q < 6; q++) { const a = rot + q * TAU / 6, rr = r * (.8 + ((q * 7 + fx.decals) % 5) * .1), u = Math.cos(a) * rr, v = Math.sin(a) * rr; set(1 + q, cx + tx * u + bx * v, cy + ty * u + by * v, cz + tz * u + bz * v, 0); }
    g.attributes.position.needsUpdate = g.attributes.dc.needsUpdate = true;
  }
  /** a frame's tracers as quads facing the camera (each a streak along its path with a bright head) */
  function drawTracers(dt) {
    const g = fx.trMesh.geometry, P = g.attributes.position.array, C = g.attributes.color.array, cam = fx.cam; let n = 0;
    for (let i = fx.tracers.length - 1; i >= 0; i--) {
      const t = fx.tracers[i]; t.t += dt; if (t.t > t.life) { fx.tracers.splice(i, 1); continue; }
      const u1 = Math.min(1, t.t / t.life * 1.08), u0 = Math.max(0, u1 - Math.min(.5, 260 / t.d)), d = [(t.b[0] - t.a[0]) / t.d, (t.b[1] - t.a[1]) / t.d, (t.b[2] - t.a[2]) / t.d];
      const h = [t.a[0] + d[0] * t.d * u1, t.a[1] + d[1] * t.d * u1, t.a[2] + d[2] * t.d * u1], e = [t.a[0] + d[0] * t.d * u0, t.a[1] + d[1] * t.d * u0, t.a[2] + d[2] * t.d * u0];
      // each end as wide as it needs to be seen at its own distance, thinning to nothing at the eye (a streak that
      // passes the camera never fills the picture)
      const o = n * 12, fade = 1 - t.t / t.life * .5, pts = [[e, -1, .15], [e, 1, .15], [h, 1, 1], [h, -1, 1]];
      pts.forEach(([q, sg, k], j) => {
        const v = [q[0] - cam[0], q[1] - cam[1], q[2] - cam[2]], dist = Math.hypot(...v); let sx = d[1] * v[2] - d[2] * v[1], sy = d[2] * v[0] - d[0] * v[2], sz = d[0] * v[1] - d[1] * v[0]; const sl = Math.hypot(sx, sy, sz) || 1;
        const w = t.w * (1 + dist / 900) * clamp((dist - 12) / 60, 0, 1) * sg; sx = sx / sl * w; sy = sy / sl * w; sz = sz / sl * w;
        P[o + j * 3] = (q[0] + sx) / M; P[o + j * 3 + 1] = (q[2] + sz) / M; P[o + j * 3 + 2] = (q[1] + sy) / M; C[o + j * 3] = t.c[0] * k * fade; C[o + j * 3 + 1] = t.c[1] * k * fade; C[o + j * 3 + 2] = t.c[2] * k * fade;
      });
      if (++n >= TR_MAX) break;
    }
    g.setDrawRange(0, Math.max(6, n * 6)); if (!n) P.fill(0, 0, 12);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
  }
  /** a frame's muzzle flashes as stars facing the eye at cam: a white-hot core, four to six spikes of flame of different
   *  lengths turned at random, a plume along the barrel; additive, so each fades to nothing at its edges and tips. They
   *  last two frames: the shot's, full, and one fading (each its own shape) */
  const FL_PAL = { fire: [[1.7, 1.45, 1], [1.3, .7, .22], [.5, .17, .03]], white: [[1.6, 1.6, 1.55], [1.1, 1, .85], [.35, .3, .26]], blue: [[1.3, 1.6, 1.8], [.45, .9, 1.4], [.08, .24, .5]], purple: [[1.6, 1.4, 1.8], [.95, .55, 1.4], [.3, .1, .5]] };
  /** a hit's star at p (facing d's way, size s, palette 'white', 'blue' or 'purple'): two frames, held through a hit-stop;
   *  (s 0: chips only); shards: chips thrown off it; ov: p is in the eye's frame, drawn on the overlay (over the fist that threw it) */
  function impactStar(p, d, s, pal, shards = 0, ov = false) {
    if (s > 0 && fx.stars.length < 12) fx.stars.push({ p: p.slice(), f: d.slice(), s, pal, t: 0, ov, seed: 1 + Math.floor(Math.abs(p[0] * 31 + p[1] * 17 + p[2] * 7)) % 2147483000 });
    const sd = [-d[1], d[0], 0];
    for (let i = 0; i < shards && fx.stars.length < 24; i++) { const a = (i % 2 ? 1 : -1) * (.4 + Math.random() * .8), v = [(sd[0] * a * 1.6 - d[0] * .4) * 45, (sd[1] * a * 1.6 - d[1] * .4) * 45, 20 + Math.random() * 30]; fx.stars.push({ p: p.slice(), f: d.slice(), s: ov ? .22 : .45, pal, t: 0, v: ov ? mul(v, .5) : v, ov, life: .1, seed: 7 + i * 131 }); }   // (chips thrown aside and back toward the eye, arcing down for six frames)
  }
  function drawFlashes(mesh, list, cam) {
    const g = mesh.geometry, P = g.attributes.position.array, C = g.attributes.color.array, K = [0, 0, 0]; let v = 0;
    const put = (q, c) => { P[v * 3] = q[0] / M; P[v * 3 + 1] = q[2] / M; P[v * 3 + 2] = q[1] / M; C[v * 3] = c[0]; C[v * 3 + 1] = c[1]; C[v * 3 + 2] = c[2]; v++; };
    const tri = (a, ca, b, cb, c, cc) => { put(a, ca); put(b, cb); put(c, cc); };
    for (const fl of list) {
      const { p, s } = fl, h = fl.heat, view = nrm(sub(p, cam)), a = nrm(cross(view, Math.abs(view[2]) < .95 ? UP : [1, 0, 0])), b = cross(a, view);
      let r = fl.seed; const rn = () => (r = (r * 16807) % 2147483647) / 2147483647;
      const pal = FL_PAL[fl.pal || 'fire'], hot = mul(pal[fl.thin && fl.pal !== 'fire' ? 1 : 0], h * (fl.thin ? 1.6 : 1)), warm = mul(pal[1], h * (fl.thin ? 1.6 : 1)), tip = mul(pal[2], h), ring = (rr, t) => add(add(p, a, Math.cos(t) * rr), b, Math.sin(t) * rr);
      const rc = s * (.55 + rn() * .2), dim = mul(warm, h >= 1 ? .16 : 0);
      for (let i = 0; i < 8; i++) { tri(p, hot, ring(rc, i / 8 * TAU), K, ring(rc, (i + 1) / 8 * TAU), K); tri(p, dim, ring(rc * 2.1, i / 8 * TAU), K, ring(rc * 2.1, (i + 1) / 8 * TAU), K); }   // (and the air round it, lit, on the first frame)
      const n = 4 + Math.floor(rn() * 3), rot = rn() * TAU;
      for (let i = 0; i < n; i++) {
        const t = rot + i / n * TAU + (rn() - .5) * .6, d = add(mul(a, Math.cos(t)), b, Math.sin(t)), pp = add(mul(a, -Math.sin(t)), b, Math.cos(t));
        const len = s * (1 + rn() * 1.9) * (i % 2 ? .7 : 1), w = s * (.16 + rn() * .1) * (fl.thin ? .6 : 1), e = add(p, d, len), m = add(p, d, len * .2);
        tri(p, warm, add(m, pp, w), K, e, tip); tri(p, warm, e, tip, add(m, pp, -w), K);
      }
      const wa = cross(fl.f, view), wl = Math.hypot(...wa);
      if (wl > .05) {
        const len = s * (1.8 + rn() * 1.2), e = add(p, fl.f, len), m = add(p, fl.f, len * .3), w = mul(wa, s * .34 / wl);
        tri(p, hot, add(m, w), K, e, tip); tri(p, hot, e, tip, sub(m, w), K);
      }
    }
    g.setDrawRange(0, Math.max(3, v)); if (!v) P.fill(0, 0, 9);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; list.length = 0;
  }

