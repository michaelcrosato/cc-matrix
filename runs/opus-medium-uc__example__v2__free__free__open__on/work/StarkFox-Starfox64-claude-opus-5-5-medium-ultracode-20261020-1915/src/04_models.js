// ===== 04_models.js — procedural cel-shaded models + pilot portraits =====
const Models = (() => {
  const G = {}; // geometry cache
  const geo = (key, make) => G[key] || (G[key] = make());
  const box = (w, h, d) => geo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cyl = (rt, rb, h, s = 12) => geo(`c${rt}_${rb}_${h}_${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
  const sph = (r, ws = 16, hs = 12) => geo(`s${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
  const cone = (r, h, s = 12) => geo(`k${r}_${h}_${s}`, () => new THREE.ConeGeometry(r, h, s));
  const tor = (r, t, rs = 12, ts = 48) => geo(`t${r}_${t}_${rs}_${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts));
  const ico = (r, d = 0) => geo(`i${r}_${d}`, () => new THREE.IcosahedronGeometry(r, d));
  const oct = (r) => geo(`o${r}`, () => new THREE.OctahedronGeometry(r, 0));

  // extruded flat plate from 2D points in XZ plane (shape y -> -z), thickness along Y
  function plate(key, pts, thick, bevel = 0) {
    return geo(key, () => {
      const s = new THREE.Shape();
      pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
      g.rotateX(-Math.PI / 2); // shape XY -> XZ, extrude +Y
      g.translate(0, -thick / 2, 0);
      g.computeVertexNormals();
      return g;
    });
  }
  // fuselage via lathe (profile radius along -Z)
  function lathe(key, prof, segs = 12) {
    return geo(key, () => {
      const g = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), segs);
      g.rotateX(-Math.PI / 2); // lathe Y axis -> -Z
      return g;
    });
  }

  function M(g, mat, o, x = 0, y = 0, z = 0, parent) {
    const m = mkMesh(g, mat, o || {});
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }
  const node = (parent, x = 0, y = 0, z = 0, name) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    if (name) o.name = name;
    parent.add(o);
    return o;
  };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };
  const T = (t) => ({ thickness: t });
  // square-section strut between two local points
  function limb(parent, a, b, w, mat, o) {
    const len = a.distanceTo(b);
    const m = M(box(w, len, w), mat, o, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, parent);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  }
  const NOL = { outline: false, cast: false };

  // ---------- PLAYER / WINGMAN SHIP ----------
  function playerShip(palette = {}) {
    const p = { body: 0xe8ecf2, accent: 0x2f6bff, trim: 0x1b2233, glow: 0x59d6ff, ...palette };
    const root = new THREE.Group();
    const ol = T(0.045);
    const body = M(lathe('shipBody', [[0, -3.4], [0.35, -2.8], [0.62, -1.6], [0.8, -0.2], [0.85, 1.0], [0.7, 1.9], [0.45, 2.3], [0, 2.35]], 10), toon(p.body), ol, 0, 0, 0, root);
    body.scale.set(1, 0.72, 1);
    // nose stripe & intake
    M(box(0.5, 0.18, 2.6), toon(p.accent), T(0.03), 0, 0.42, -1.2, root);
    M(box(1.9, 0.5, 1.4), toon(p.trim), ol, 0, -0.15, 1.2, root);
    const cockpit = M(sph(0.55, 14, 10), toon(0x7fe4ff, { emissive: 0x2a8fd0, emissiveIntensity: 0.6, rim: 0.6 }), T(0.03), 0, 0.5, -0.3, root);
    cockpit.scale.set(0.8, 0.65, 1.7);
    // tail fin
    const fin = M(plate('shipFin', [[0, -0.4], [1.3, 0.9], [1.45, 1.6], [0, 1.7]], 0.12), toon(p.accent), T(0.03), 0, 0.35, 0.5, root);
    fin.rotation.set(0, 0, Math.PI / 2); // plate in XZ -> stand it up (x becomes height)
    // engines
    const engines = [];
    for (const sx of [-0.55, 0.55]) {
      M(cyl(0.32, 0.4, 1.4, 10), toon(p.trim), T(0.03), sx, -0.1, 1.9, root).rotation.x = Math.PI / 2;
      const e = M(cyl(0.28, 0.28, 0.1, 10), glow(p.glow, 3.5), NOL, sx, -0.1, 2.62, root);
      e.rotation.x = Math.PI / 2;
      engines.push(e);
    }
    // wings: swept, with vertical tip fins (blade arms) — pivot at wing root
    const mkWing = (side) => {
      const w = grp(root, side * 0.7, -0.05, 0.6);
      const pts = [[0, -0.9], [3.1, 0.6], [3.3, 1.4], [0, 1.3]].map(([x, z]) => [x * side, z]);
      M(plate('shipWing' + side, pts, 0.14), toon(p.body), ol, 0, 0, 0, w);
      M(plate('shipWingAcc' + side, [[0.6 * side, -0.2], [2.9 * side, 0.95], [3.05 * side, 1.25], [0.6 * side, 0.9]], 0.06), toon(p.accent), NOL, 0, 0.1, 0, w);
      // blade fin at tip, canted up-out (signature silhouette)
      const blade = M(plate('shipBlade', [[0, -0.9], [1.5, 0.2], [1.6, 1.0], [0, 1.6]], 0.12), toon(p.accent), ol, side * 3.15, 0.05, 0.1, w);
      blade.rotation.set(0, 0, Math.PI / 2 - side * 0.3);
      const bladeD = M(plate('shipBladeD', [[0, -0.3], [0.8, 0.5], [0.85, 1.0], [0, 1.3]], 0.1), toon(p.trim), T(0.03), side * 3.15, -0.05, 0.3, w);
      bladeD.rotation.set(0, 0, -Math.PI / 2 + side * 0.3);
      const gun = node(w, side * 1.6, -0.12, -0.1);
      M(cyl(0.16, 0.2, 0.7, 8), toon(p.trim), T(0.025), 0, 0, -0.25, gun).rotation.x = Math.PI / 2;
      M(cyl(0.08, 0.1, 1.5, 6), toon(p.trim), T(0.025), 0, 0, -0.8, gun).rotation.x = Math.PI / 2;
      w.userData.gun = gun;
      return w;
    };
    const wingL = mkWing(-1), wingR = mkWing(1);
    wingL.rotation.z = -0.08; wingR.rotation.z = 0.08;
    // gun muzzle tips (on root, near wing guns, so they persist even if wings detach? they live on wings)
    const gunL = node(wingL, -1.6, -0.12, -1.65, 'gunL');
    const gunR = node(wingR, 1.6, -0.12, -1.65, 'gunR');
    root.userData = { wingL, wingR, engines, gunL, gunR, cockpit, body };
    return root;
  }

  // ---------- ENEMIES ----------
  function fighter() {
    const root = new THREE.Group();
    const ol = T(0.05);
    const body = M(sph(0.9, 12, 8), toon(0xe0542a, { rim: 0.5 }), ol, 0, 0, 0, root);
    body.scale.set(1, 0.7, 1.6);
    M(sph(0.45, 10, 8), toon(0x2b1810), T(0.03), 0, 0.15, -1.1, root).scale.set(1, 0.6, 1);
    const eye = M(sph(0.22, 8, 6), glow(0xffe04a, 3), NOL, 0, 0.2, -1.5, root);
    eye.scale.set(1.6, 0.6, 0.6);
    const muzzles = [];
    for (const s of [-1, 1]) {
      // bent insect wings
      const w = M(plate('fWing' + s, [[0, -0.4], [2.3 * s, -1.4], [2.4 * s, -0.6], [0.4 * s, 0.9]], 0.12), toon(0xff8a3a), ol, s * 0.5, 0, 0.1, root);
      w.rotation.z = s * 0.35;
      M(plate('fWingTip' + s, [[1.6 * s, -1.2], [2.4 * s, -1.4], [2.45 * s, -0.6], [1.7 * s, -0.5]], 0.14), toon(0x3a1f18), NOL, 0, 0.02, 0, w);
      // mandible guns
      const g = M(cone(0.18, 1.1, 6), toon(0x3a1f18), T(0.03), s * 0.55, -0.25, -1.4, root);
      g.rotation.x = -Math.PI / 2;
      muzzles.push(node(root, s * 0.55, -0.25, -2.0));
    }
    const eng = M(cyl(0.3, 0.2, 0.2, 8), glow(0xff6a1a, 3), NOL, 0, 0, 1.45, root);
    eng.rotation.x = Math.PI / 2;
    root.userData = { muzzles, engines: [eng] };
    return root;
  }

  function dart() {
    const root = new THREE.Group();
    const b = M(cone(0.45, 3, 6), toon(0xd8d03a, { rim: 0.5 }), T(0.04), 0, 0, 0, root);
    b.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const f = M(plate('dartFin', [[0, 0], [0.9, 0.5], [0.9, 1.0], [0, 0.9]], 0.08), toon(0x2a2a30), T(0.03), 0, 0, 0.3, root);
      f.rotation.z = (i / 3) * TAU + Math.PI / 2;
    }
    const e = M(sph(0.3, 8, 6), glow(0xff3a2a, 4), NOL, 0, 0, 1.5, root);
    root.userData = { engines: [e], muzzles: [] };
    return root;
  }

  function gunship() {
    const root = new THREE.Group();
    const ol = T(0.08);
    const hull = M(box(2.6, 1.6, 6), toon(0x8a3b2a), ol, 0, 0, 0, root);
    M(box(1.6, 0.9, 2.2), toon(0x3a2620), ol, 0, 1.1, 0.6, root);
    M(box(1.2, 0.5, 1.2), toon(0xffc04a, { emissive: 0xff8a00, emissiveIntensity: 0.6 }), T(0.04), 0, 0.5, -3.0, root);
    const muzzles = [];
    for (const s of [-1, 1]) {
      const w = M(plate('gsWing' + s, [[0, -1.6], [5.4 * s, -0.3], [5.5 * s, 1.0], [0, 2.4]], 0.3), toon(0xb8502e), ol, s * 1.2, 0, 0, root);
      w.rotation.z = -s * 0.08;
      const pod = M(cyl(0.55, 0.55, 3.2, 10), toon(0x3a2620), ol, s * 3.8, -0.4, -0.5, root);
      pod.rotation.x = Math.PI / 2;
      const gl = M(cyl(0.45, 0.45, 0.1, 10), glow(0xff6a1a, 3), NOL, s * 3.8, -0.4, 1.15, root);
      gl.rotation.x = Math.PI / 2;
      muzzles.push(node(root, s * 3.8, -0.4, -2.3));
      M(box(0.25, 2.2, 1.5), toon(0x3a2620), T(0.05), s * 5.3, 0.7, 0.6, root);
    }
    const e = M(box(1.8, 0.8, 0.2), glow(0xff8a2a, 3), NOL, 0, 0, 3.1, root);
    root.userData = { muzzles, engines: [e] };
    return root;
  }

  function mine() {
    const root = new THREE.Group();
    M(ico(1.4, 1), toon(0x5a5f6a, { flat: true }), T(0.06), 0, 0, 0, root);
    const dirs = new THREE.IcosahedronGeometry(1, 0).attributes.position;
    const seen = new Set();
    for (let i = 0; i < dirs.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(dirs, i).normalize();
      const k = v.toArray().map((n) => n.toFixed(2)).join();
      if (seen.has(k)) continue;
      seen.add(k);
      const s = M(cone(0.28, 1.2, 6), toon(0xd8323a), T(0.03), 0, 0, 0, root);
      s.position.copy(v).multiplyScalar(1.6);
      s.quaternion.setFromUnitVectors(V3(0, 1, 0), v);
    }
    const light = M(sph(0.6, 12, 8), glow(0xff2a2a, 4), NOL, 0, 0, 0, root);
    light.scale.setScalar(1.15);
    root.userData = { light };
    return root;
  }

  function ace(palette = {}) {
    const p = { body: 0x3a2a4a, accent: 0xc23bff, ...palette };
    const root = new THREE.Group();
    const ol = T(0.05);
    const body = M(lathe('aceBody', [[0, -3.6], [0.3, -2.8], [0.6, -1.0], [0.75, 0.6], [0.6, 2.2], [0, 2.4]], 8), toon(p.body), ol, 0, 0, 0, root);
    body.scale.set(1, 0.65, 1);
    M(sph(0.45, 12, 8), toon(0xffd84a, { emissive: 0xaa6600, emissiveIntensity: 0.5 }), T(0.03), 0, 0.35, -0.6, root).scale.set(0.8, 0.6, 1.8);
    const muzzles = [], engines = [];
    for (const s of [-1, 1]) {
      // forward-swept wings
      M(plate('aceWing' + s, [[0, 0.4], [3.5 * s, -1.0], [3.6 * s, -0.4], [0.2 * s, 1.8]], 0.12), toon(p.body), ol, s * 0.5, 0, 0.3, root);
      M(plate('aceWingS' + s, [[1.2 * s, -0.1], [3.4 * s, -0.95], [3.5 * s, -0.6], [1.2 * s, 0.4]], 0.05), toon(p.accent, { emissive: p.accent, emissiveIntensity: 0.4 }), NOL, s * 0.5, 0.09, 0.3, root);
      const tf = M(plate('aceTail', [[0, 0], [1.3, 0.8], [1.4, 1.5], [0, 1.6]], 0.1), toon(p.accent), T(0.03), s * 0.55, 0.3, 0.9, root);
      tf.rotation.set(0, 0, Math.PI / 2 - s * 0.5);
      const g = M(cyl(0.08, 0.1, 1.6, 6), toon(0x15101c), T(0.025), s * 3.3, -0.05, -1.4, root);
      g.rotation.x = Math.PI / 2;
      muzzles.push(node(root, s * 3.3, -0.05, -2.3));
      const e = M(cyl(0.25, 0.25, 0.1, 8), glow(0xd05aff, 3.5), NOL, s * 0.4, -0.05, 2.35, root);
      e.rotation.x = Math.PI / 2;
      engines.push(e);
    }
    root.userData = { muzzles, engines };
    return root;
  }

  function turret() {
    const root = new THREE.Group();
    const ol = T(0.07);
    M(cyl(1.8, 2.3, 1.4, 8), toon(0x6a6458), ol, 0, 0.7, 0, root);
    M(cyl(1.3, 1.6, 1.2, 8), toon(0x8a3b2a), ol, 0, 1.9, 0, root);
    const head = node(root, 0, 2.6, 0, 'head');
    M(sph(1.3, 12, 8), toon(0xb8502e), ol, 0, 0.5, 0, head).scale.set(1, 0.8, 1);
    M(box(0.7, 0.35, 0.3), glow(0xffd03a, 3), NOL, 0, 0.8, -1.05, head);
    const barrel = node(head, 0, 0.6, 0, 'barrel');
    for (const s of [-0.45, 0.45]) {
      const b = M(cyl(0.18, 0.24, 3, 8), toon(0x2a2420), T(0.04), s, 0, -1.5, barrel);
      b.rotation.x = Math.PI / 2;
    }
    const muzzle = node(barrel, 0, 0, -3.1, 'muzzle');
    root.userData = { head, barrel, muzzle };
    return root;
  }

  function tank() {
    const root = new THREE.Group();
    const ol = T(0.07);
    const hull = M(box(3.2, 1.3, 5.2), toon(0x7a6a3a), ol, 0, 2.3, 0, root);
    M(box(2.6, 0.5, 4.2), toon(0x4a3f22), T(0.04), 0, 1.5, 0, root);
    const turretG = node(root, 0, 3.2, 0.3, 'turret');
    M(cyl(1.2, 1.4, 0.9, 8), toon(0x9a8a4a), ol, 0, 0.1, 0, turretG);
    M(box(0.5, 0.25, 0.25), glow(0xff4a2a, 3), NOL, 0, 0.35, -1.25, turretG);
    const gun = M(cyl(0.22, 0.28, 3.4, 8), toon(0x2a2420), T(0.04), 0, 0.2, -2.2, turretG);
    gun.rotation.x = Math.PI / 2;
    const muzzle = node(turretG, 0, 0.2, -4.0, 'muzzle');
    const legs = [];
    for (const [x, z] of [[-1.5, -1.8], [1.5, -1.8], [-1.5, 1.8], [1.5, 1.8]]) {
      const sx = Math.sign(x);
      const pv = node(root, x, 2.0, z);
      M(sph(0.55, 8, 6), toon(0x4a3f22), T(0.04), 0, 0, 0, pv);
      limb(pv, V3(0, 0, 0), V3(sx * 1.5, 0.7, 0), 0.5, toon(0x4a3f22), T(0.04));
      limb(pv, V3(sx * 1.5, 0.7, 0), V3(sx * 2.0, -1.8, 0), 0.35, toon(0x2a2420), T(0.04));
      M(sph(0.38, 8, 6), toon(0x9a8a4a), T(0.03), sx * 1.5, 0.7, 0, pv);
      M(cyl(0.45, 0.6, 0.3, 8), toon(0x4a3f22), T(0.03), sx * 2.0, -1.9, 0, pv);
      legs.push(pv);
    }
    root.userData = { turret: turretG, muzzle, legs };
    return root;
  }

  // ---------- BOSS 1: STRIDER ----------
  function strider() {
    const root = new THREE.Group();
    const ol = T(0.25);
    const rust = toon(0xa8432a, { rim: 0.4 }), metal = toon(0x4a4f5a, { rim: 0.4 }), dark = toon(0x22252c), brass = toon(0xd8a03a);
    const hips = node(root, 0, 24, 0, 'hips');
    M(box(9, 3.5, 6), metal, ol, 0, 0, 0, hips);
    const torso = grp(hips, 0, 8, 0);
    M(box(14, 10, 9), rust, ol, 0, 0, 0, torso);
    M(box(10, 4, 7), metal, ol, 0, 6, 0.5, torso);
    // head
    const head = grp(torso, 0, 9.5, -1);
    M(box(6, 3.5, 5), rust, ol, 0, 0, 0, head);
    M(box(4.4, 1.2, 1), dark, T(0.1), 0, 0.2, -2.6, head);
    const eye = M(box(3.6, 0.6, 0.6), glow(0xff2a1a, 4), NOL, 0, 0.2, -3.0, head);
    for (const s of [-1, 1]) M(cone(0.5, 3, 6), brass, T(0.1), s * 2.4, 2.6, 0.5, head).rotation.z = -s * 0.35;
    // core + chest plates
    const core = M(sph(2.6, 16, 12), glow(0x48f0ff, 3.5), NOL, 0, 0, -4.2, torso);
    const coreRing = M(tor(2.9, 0.5, 8, 24), dark, T(0.12), 0, 0, -4.4, torso);
    const chestPlates = [];
    for (const [x, y] of [[-2.2, 1.6], [2.2, 1.6], [-2.2, -1.6], [2.2, -1.6]]) {
      const pl = M(box(4.2, 3.0, 1.2), metal, T(0.15), x, y, -5.2, torso);
      pl.rotation.y = x * 0.05;
      M(box(0.8, 0.8, 0.3), brass, NOL, x * 0.6, y * 0.5, -0.65, pl);
      chestPlates.push(pl);
    }
    // chest cannons
    const cannons = [];
    for (const s of [-1, 1]) {
      const c = M(cyl(0.6, 0.8, 5, 10), dark, T(0.12), s * 5.5, -3, -5, torso);
      c.rotation.x = Math.PI / 2;
      cannons.push(node(torso, s * 5.5, -3, -7.6));
    }
    // arms (shoulder pods = weak points)
    const mkArm = (s) => {
      const arm = grp(torso, s * 9.5, 3, 0);
      M(sph(3.2, 12, 10), rust, ol, 0, 0, 0, arm);
      const pod = M(box(4, 5, 6), metal, ol, s * 1.5, -3.5, -1, arm);
      const weak = M(sph(1.4, 12, 8), glow(0xffb02a, 3.5), NOL, s * 1.5, -3.5, -4.2, arm);
      for (let i = 0; i < 3; i++) {
        const b = M(cyl(0.45, 0.45, 4, 8), dark, T(0.1), s * 1.5 + (i - 1) * 1.2, -6.2, -2.5, arm);
        b.rotation.x = Math.PI / 2;
        cannons.push(node(arm, s * 1.5 + (i - 1) * 1.2, -6.2, -4.8));
      }
      arm.userData.weak = weak;
      arm.userData.pod = pod;
      return arm;
    };
    const armL = mkArm(-1), armR = mkArm(1);
    // legs (digitigrade)
    const mkLeg = (s) => {
      const hip = node(hips, s * 4.5, -1, 0);
      M(sph(2.2, 10, 8), metal, ol, 0, 0, 0, hip);
      M(box(3, 11, 3.4), rust, ol, 0, -5.5, -1, hip).rotation.x = 0.2;
      const knee = node(hip, 0, -11, -2);
      M(sph(1.8, 10, 8), metal, ol, 0, 0, 0, knee);
      M(box(2.4, 11, 2.6), metal, ol, 0, -5.5, 1.4, knee).rotation.x = -0.25;
      M(cyl(0.5, 0.5, 9, 6), brass, T(0.1), s * 1.6, -5, 0.8, knee).rotation.x = -0.25;
      const foot = node(knee, 0, -11, 2.6);
      M(box(5, 2, 8), dark, ol, 0, 0, -1, foot);
      for (const fx of [-1.6, 0, 1.6]) M(cone(0.7, 2.2, 6), brass, T(0.08), fx, -0.2, -5.6, foot).rotation.x = -Math.PI / 2;
      return { hip, knee, foot };
    };
    const legL = mkLeg(-1), legR = mkLeg(1);
    // back exhaust stacks
    for (const s of [-1, 1]) {
      M(cyl(0.9, 1.1, 7, 10), dark, T(0.12), s * 3.5, 6, 5, torso);
      M(cyl(0.7, 0.7, 0.3, 10), glow(0xff7a2a, 3), NOL, s * 3.5, 9.6, 5, torso);
    }
    root.userData = { hips, torso, legL, legR, armL, armR, core, coreRing, chestPlates, cannons, eye, head };
    return root;
  }

  // ---------- BOSS 2: MOTHERSHIP ----------
  function mothership() {
    const root = new THREE.Group();
    const ol = T(0.3);
    const hullM = toon(0x4a3a5e, { rim: 0.45 }), plateM = toon(0x7a5a8e, { rim: 0.4 }), dark = toon(0x1e1a26), gold = toon(0xd8a83a);
    const hull = M(lathe('msHull', [[0, -85], [6, -78], [14, -55], [20, -20], [22, 20], [18, 55], [12, 72], [0, 75]], 8), hullM, ol, 0, 0, 0, root);
    hull.scale.set(1.5, 0.55, 1);
    M(box(26, 8, 60), plateM, ol, 0, 11, 5, root);
    M(box(14, 10, 22), dark, ol, 0, 18, 20, root); // bridge tower
    M(box(10, 2, 2), glow(0xff3a8a, 3), NOL, 0, 20, 8.8, root);
    // prow blades
    for (const s of [-1, 1]) M(plate('msProw' + s, [[0, -80], [14 * s, -40], [30 * s, 10], [24 * s, 30], [8 * s, -20]], 2.5), plateM, ol, 0, -2, 0, root);
    // side pods with shield gens
    const shieldGens = [];
    for (const s of [-1, 1]) {
      const pod = M(cyl(7, 7, 70, 10), hullM, ol, s * 36, -2, 10, root);
      pod.rotation.x = Math.PI / 2;
      M(box(12, 3, 20), dark, T(0.2), s * 24, -2, 10, root);
      for (const z of [-12, 28]) {
        const g = M(sph(4, 14, 10), glow(0x5affd8, 3), NOL, s * 43.5, -2, z, root);
        M(tor(4.6, 0.8, 8, 20), gold, T(0.15), s * 42.8, -2, z, root).rotation.y = Math.PI / 2;
        shieldGens.push(g);
      }
    }
    // turrets on top and bottom
    const turrets = [];
    for (const [x, y, z, flip] of [[-12, 15.5, -20, 0], [12, 15.5, -20, 0], [-10, 15.5, 38, 0], [10, 15.5, 38, 0], [-16, -12, 0, 1], [16, -12, 0, 1]]) {
      const t = grp(root, x, y, z);
      if (flip) t.rotation.z = Math.PI;
      M(cyl(3, 3.6, 2, 10), dark, T(0.15), 0, 0, 0, t);
      M(sph(2.6, 12, 8), plateM, T(0.15), 0, 1.4, 0, t).scale.set(1, 0.7, 1.2);
      for (const bx of [-0.9, 0.9]) M(cyl(0.45, 0.55, 6, 8), dark, T(0.1), bx, 1.6, -3.5, t).rotation.x = Math.PI / 2;
      M(box(2.4, 0.6, 0.4), glow(0xff3a8a, 3), NOL, 0, 2.4, -2.3, t);
      t.userData.muzzle = node(t, 0, 1.6, -6.8);
      turrets.push(t);
    }
    // hangar bay at the front underside
    const hangar = node(root, 0, -10, -35, 'hangar');
    M(box(16, 5, 14), glow(0xffa04a, 1.6), NOL, 0, -7.5, -35, root);
    // reactor core rear-underside
    const core = M(sph(7, 18, 14), glow(0xff3aa0, 3.5), NOL, 0, -9, 60, root);
    M(tor(8, 1.6, 10, 28), gold, T(0.2), 0, -9, 60, root).rotation.x = Math.PI / 2;
    const engines = [];
    for (const [x, y] of [[-12, 0], [12, 0], [0, 6], [-36, -2], [36, -2]]) {
      const r = Math.abs(x) > 30 ? 4.5 : 5;
      const e = M(cyl(r, r, 1, 12), glow(0xb05aff, 3.5), NOL, x, y, Math.abs(x) > 30 ? 45.5 : 74, root);
      e.rotation.x = Math.PI / 2;
      engines.push(e);
    }
    root.userData = { hull, turrets, shieldGens, core, hangar, engines };
    return root;
  }

  // ---------- SCENERY ----------
  const BUILDING_COLS = [0xd8d2c4, 0xc4cfd8, 0xe0c8a8, 0xa8b8c8, 0xd8b8b0, 0xb8c8a8];
  function building(w = 12, h = 40, d = 12, rng = Math.random) {
    const root = new THREE.Group();
    const col = BUILDING_COLS[Math.floor(rng() * BUILDING_COLS.length)];
    const t = Math.max(0.12, Math.min(w, d) * 0.012);
    const mainM = toon(col, { rim: 0.25 });
    const style = Math.floor(rng() * 3);
    M(new THREE.BoxGeometry(w, h, d), mainM, T(t), 0, h / 2, 0, root);
    // window bands (emissive-ish dark glass stripes)
    const glass = toon(0x3a5f8a, { emissive: 0x6ab8ff, emissiveIntensity: 0.25, rim: 0.6 });
    const bands = Math.max(2, Math.floor(h / 6));
    for (let i = 0; i < bands; i++) {
      const y = 4 + i * ((h - 6) / bands);
      M(new THREE.BoxGeometry(w + 0.1, 1.4, d + 0.1), glass, NOL, 0, y, 0, root).receiveShadow = true;
    }
    if (style === 0) {
      // stepped top
      M(new THREE.BoxGeometry(w * 0.7, h * 0.18, d * 0.7), mainM, T(t), 0, h + h * 0.09, 0, root);
      M(cyl(0.2, 0.3, h * 0.25, 6), toon(0x555a66), T(0.08), 0, h * 1.18 + h * 0.125, 0, root);
      M(sph(0.6, 8, 6), glow(0xff3a2a, 4), NOL, 0, h * 1.18 + h * 0.25, 0, root);
    } else if (style === 1) {
      // rooftop units
      for (let i = 0; i < 3; i++) M(box(2.5, 1.8, 2.5), toon(0x7a808a), T(0.08), (rng() - 0.5) * (w - 3), h + 0.9, (rng() - 0.5) * (d - 3), root);
      M(box(w + 0.6, 0.8, d + 0.6), toon(0x6a707a), T(t), 0, h + 0.4, 0, root);
    } else {
      // dome
      const dm = M(sph(Math.min(w, d) * 0.42, 14, 8), toon(0x5ab0c8, { rim: 0.4 }), T(t), 0, h, 0, root);
      dm.scale.y = 0.6;
    }
    return root;
  }

  function arch(width = 40, height = 30) {
    const root = new THREE.Group();
    const ol = T(0.3);
    const m = toon(0xd8c8a0, { rim: 0.35 }), acc = toon(0x2f6bff);
    for (const s of [-1, 1]) {
      M(new THREE.BoxGeometry(5, height, 5), m, ol, s * (width / 2 + 2.5), height / 2, 0, root);
      M(new THREE.BoxGeometry(6.5, 2.5, 6.5), acc, T(0.15), s * (width / 2 + 2.5), 1.25, 0, root);
      M(sph(1.2, 10, 8), glow(0x59d6ff, 3), NOL, s * (width / 2 + 2.5), height + 6.2, 0, root);
    }
    M(new THREE.BoxGeometry(width + 14, 5, 6), m, ol, 0, height + 2.5, 0, root);
    M(new THREE.BoxGeometry(width + 10, 1.4, 6.3), acc, T(0.1), 0, height + 1, 0, root);
    // glowing inner rim
    M(new THREE.BoxGeometry(width, 0.4, 0.6), glow(0x59d6ff, 2.5), NOL, 0, height - 0.2, 0, root);
    return root;
  }

  function tree(rng = Math.random) {
    const root = new THREE.Group();
    const h = 6 + rng() * 6;
    M(cyl(0.35, 0.5, h * 0.35, 6), toon(0x6a4a2a), T(0.06), 0, h * 0.17, 0, root);
    const greens = [0x3f9a4a, 0x4fae52, 0x2f8a46, 0x5aba5a];
    const gm = toon(greens[Math.floor(rng() * greens.length)], { rim: 0.3 });
    for (let i = 0; i < 3; i++) {
      const r = (h * 0.32) * (1 - i * 0.25);
      M(cone(r, h * 0.42, 7), gm, T(0.1), 0, h * 0.3 + i * h * 0.22 + h * 0.15, 0, root).rotation.y = rng() * TAU;
    }
    return root;
  }

  function rockGeo(r, rng, detail = 1, amt = 0.3) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const pos = g.attributes.position;
    const seed = rng() * 100;
    const cache = new Map();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      let s = cache.get(k);
      if (s === undefined) {
        s = 1 + amt * (Noise.n2(x / r * 1.7 + seed, z / r * 1.7 + y / r) + (rng() - 0.5) * 0.6);
        cache.set(k, s);
      }
      pos.setXYZ(i, x * s, y * s, z * s);
    }
    g.computeVertexNormals();
    return g;
  }

  function rock(size = 4, rng = Math.random) {
    const root = new THREE.Group();
    const m = M(rockGeo(size, rng, 0, 0.35), toon(rng() < 0.5 ? 0x8a7a6a : 0x9a8a72, { flat: true, rim: 0.3 }), T(size * 0.03), 0, size * 0.4, 0, root);
    m.scale.y = 0.7;
    return root;
  }

  function asteroid(radius = 10, rng = Math.random) {
    const root = new THREE.Group();
    const cols = [0x7a6e66, 0x8a7a6a, 0x6a6470, 0x907a62];
    M(rockGeo(radius, rng, 1, 0.38), toon(cols[Math.floor(rng() * cols.length)], { flat: true, rim: 0.4 }), T(radius * 0.025), 0, 0, 0, root);
    // a few craters / crystal outcrops
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const v = V3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
      const c = M(oct(radius * 0.18), toon(0x6ad8ff, { emissive: 0x2a8acc, emissiveIntensity: 0.8, flat: true }), T(radius * 0.01), 0, 0, 0, root);
      c.position.copy(v).multiplyScalar(radius * 1.05);
      c.quaternion.setFromUnitVectors(V3(0, 1, 0), v);
      c.scale.set(0.6, 1.8, 0.6);
    }
    return root;
  }

  function tower(rng = Math.random) {
    const root = new THREE.Group();
    const h = 30 + rng() * 15;
    const m = toon(0xd84a3a), w = toon(0xeeeeee);
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const r0 = 2.2 * (1 - i / segs) + 0.4, r1 = 2.2 * (1 - (i + 1) / segs) + 0.4;
      M(cyl(r1, r0, h / segs, 4), i % 2 ? w : m, T(0.1), 0, (i + 0.5) * (h / segs), 0, root);
    }
    M(tor(2.4, 0.25, 6, 16), toon(0x555a66), T(0.06), 0, h * 0.7, 0, root).rotation.x = Math.PI / 2;
    const light = M(sph(0.7, 10, 8), glow(0xff2a2a, 4), NOL, 0, h + 0.6, 0, root);
    const dish = M(geo('dish', () => new THREE.SphereGeometry(2, 12, 6, 0, TAU, 0, Math.PI / 2)), toon(0xdddddd, { side: THREE.DoubleSide }), T(0.06), 1.2, h * 0.82, 0, root);
    dish.rotation.z = -Math.PI / 2.6;
    root.userData = { light };
    return root;
  }

  function supplyCrate() {
    const root = new THREE.Group();
    M(box(3, 3, 3), toon(0x4a8ad8, { rim: 0.4 }), T(0.06), 0, 0, 0, root);
    for (const ax of ['x', 'y', 'z']) {
      const b = M(box(3.15, 0.5, 0.5), toon(0xf0d040), NOL, 0, 0, 0, root);
      if (ax === 'y') b.rotation.z = Math.PI / 2;
      if (ax === 'z') b.rotation.y = Math.PI / 2;
    }
    const s = M(box(1.2, 1.2, 0.1), glow(0xffffff, 2), NOL, 0, 0, -1.56, root);
    root.userData = { light: s };
    return root;
  }

  function ring(kind = 'silver') {
    const root = new THREE.Group();
    if (kind === 'checkpoint') {
      M(tor(16, 0.9, 10, 64), glow(0x59d6ff, 2.5), NOL, 0, 0, 0, root);
      M(tor(17.4, 0.5, 8, 64), toon(0x2f6bff), T(0.1), 0, 0, 0, root);
      const inner = M(new THREE.CircleGeometry(15.5, 48), glow(0x59d6ff, 0.6, { transparent: true, opacity: 0.12, side: THREE.DoubleSide }), NOL, 0, 0, 0, root);
      root.userData = { inner };
      return root;
    }
    const gold = kind === 'gold';
    const r = gold ? 3.2 : 2.6;
    const m = M(tor(r, 0.42, 10, 32), toon(gold ? 0xffc83a : 0xd8e0ea, { emissive: gold ? 0xff9a00 : 0x8aa0c0, emissiveIntensity: gold ? 0.9 : 0.5, rim: 0.6 }), T(0.05), 0, 0, 0, root);
    const shine = M(tor(r, 0.12, 6, 32), glow(gold ? 0xffe08a : 0xffffff, 2.5), NOL, 0, 0, 0.3, root);
    root.userData = { band: m, shine };
    return root;
  }

  function pickup(kind = 'laser') {
    const root = new THREE.Group();
    const col = { laser: 0x3ae05a, bomb: 0xff3a3a, wing: 0x3a8aff }[kind] || 0xffffff;
    const body = M(geo('capsule', () => new THREE.CapsuleGeometry(1, 1.6, 6, 12)), toon(col, { emissive: col, emissiveIntensity: 0.5, rim: 0.6 }), T(0.06), 0, 0, 0, root);
    body.rotation.z = Math.PI / 2;
    M(cyl(1.08, 1.08, 0.5, 14), toon(0xffffff), T(0.04), 0, 0, 0, root).rotation.z = Math.PI / 2;
    // icon
    const icon = grp(root, 0, 0, -1.05);
    const w = glow(0xffffff, 2.5);
    if (kind === 'laser') {
      M(box(0.18, 0.18, 1.4), w, NOL, -0.3, 0, 0, icon);
      M(box(0.18, 0.18, 1.4), w, NOL, 0.3, 0, 0, icon);
      icon.rotation.x = Math.PI / 2;
    } else if (kind === 'bomb') {
      M(sph(0.42, 10, 8), w, NOL, 0, -0.1, 0, icon);
      M(box(0.12, 0.4, 0.12), w, NOL, 0.25, 0.4, 0, icon).rotation.z = -0.6;
    } else {
      M(plate('pickWing', [[-0.7, 0.3], [0, -0.3], [0.7, 0.3], [0, 0.05]], 0.1), w, NOL, 0, 0, 0, icon);
      icon.rotation.x = Math.PI / 2;
    }
    const halo = M(tor(1.9, 0.1, 6, 32), glow(col, 2.5), NOL, 0, 0, 0, root);
    root.userData = { halo, icon, kind };
    return root;
  }

  function carrier() {
    const root = new THREE.Group();
    const ol = T(0.25);
    const white = toon(0xe8ecf2, { rim: 0.35 }), blue = toon(0x2f6bff), dark = toon(0x1b2233);
    const hull = M(lathe('carHull', [[0, -62], [8, -50], [14, -20], [15, 20], [12, 50], [0, 56]], 10), white, ol, 0, 0, 0, root);
    hull.scale.set(1.3, 0.6, 1);
    M(box(10, 3, 80), blue, T(0.15), 0, 9, 0, root);
    M(box(8, 10, 16), white, ol, 0, 14, 22, root);
    M(box(6, 1.2, 0.5), glow(0x59d6ff, 3), NOL, 0, 16, 13.8, root);
    for (const s of [-1, 1]) {
      M(plate('carWing' + s, [[0, -10], [34 * s, 20], [34 * s, 32], [0, 30]], 2), white, ol, s * 12, -1, 0, root);
      M(plate('carWingS' + s, [[6 * s, 0], [32 * s, 22], [32 * s, 26], [6 * s, 8]], 0.5), blue, NOL, s * 12, 0.4, 0, root);
      const e = M(cyl(4, 4, 1, 12), glow(0x59d6ff, 3.5), NOL, s * 8, 0, 56, root);
      e.rotation.x = Math.PI / 2;
      M(cyl(4.8, 4.8, 12, 12), dark, T(0.15), s * 8, 0, 50, root).rotation.x = Math.PI / 2;
    }
    // launch bay
    M(box(10, 4, 1), glow(0xffd08a, 1.8), NOL, 0, -2, -40, root);
    root.userData = { hull };
    return root;
  }

  function debrisChunk(color = 0x6a6458, size = 1) {
    const rng = Math.random;
    const g = rockGeo(size, rng, 0, 0.5);
    const m = mkMesh(g, toon(color, { flat: true }), { thickness: size * 0.06, receive: false });
    return m;
  }

  // ---------- PORTRAITS (SVG, viewBox 0 0 100 100) ----------
  const INK = '#151824';
  let svgId = 0;
  function frame(bg, inner) {
    const gid = 'pg' + (++svgId);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke-linejoin="round" stroke-linecap="round">` +
      `<defs><radialGradient id="${gid}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs>` +
      `<rect width="100" height="100" fill="url(#${gid})"/>` +
      `<g opacity="0.18" stroke="#fff" stroke-width="0.6">${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${i * 8 + 4}" x2="100" y2="${i * 8 + 4}"/>`).join('')}</g>` +
      inner + `</svg>`;
  }
  const suit = (col, acc) =>
    `<path d="M8 100 Q12 78 32 74 L50 80 L68 74 Q88 78 92 100 Z" fill="${col}" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="M32 74 L50 92 L68 74 L60 72 L50 82 L40 72 Z" fill="${acc}" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M16 96 Q18 86 28 82" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/>`;
  const headset = (y = 46, col = '#2a2f3a') =>
    `<path d="M22 ${y} Q50 ${y - 34} 78 ${y}" fill="none" stroke="${INK}" stroke-width="6"/>` +
    `<path d="M22 ${y} Q50 ${y - 34} 78 ${y}" fill="none" stroke="${col}" stroke-width="3"/>` +
    `<rect x="16" y="${y - 6}" width="10" height="14" rx="4" fill="${col}" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M22 ${y + 8} Q24 ${y + 20} 38 ${y + 21}" fill="none" stroke="${INK}" stroke-width="2.2"/>` +
    `<circle cx="39" cy="${y + 21}" r="2.4" fill="#e33" stroke="${INK}" stroke-width="1.5"/>`;
  const eye = (x, y, iris, r = 4.2, look = 0.8) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="#fff" stroke="${INK}" stroke-width="1.8"/>` +
    `<circle cx="${x + look}" cy="${y + 0.4}" r="${r * 0.6}" fill="${iris}"/>` +
    `<circle cx="${x + look}" cy="${y + 0.4}" r="${r * 0.3}" fill="${INK}"/>` +
    `<circle cx="${x + look + 1}" cy="${y - 1}" r="${r * 0.22}" fill="#fff"/>`;

  const PORTRAITS = {
    vix: () => frame(['#ffb36a', '#c2410c'],
      suit('#2f6bff', '#e8ecf2') +
      // ears
      `<path d="M26 40 L22 10 L44 28 Z" fill="#f07a24" stroke="${INK}" stroke-width="2.5"/><path d="M28 34 L26 17 L38 28 Z" fill="#fff1e0"/>` +
      `<path d="M74 40 L78 10 L56 28 Z" fill="#f07a24" stroke="${INK}" stroke-width="2.5"/><path d="M72 34 L74 17 L62 28 Z" fill="#fff1e0"/>` +
      // head
      `<path d="M24 46 Q26 26 50 24 Q74 26 76 46 Q74 60 62 66 L50 76 L38 66 Q26 60 24 46 Z" fill="#f07a24" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M30 54 Q40 52 50 60 Q60 52 70 54 Q66 66 50 76 Q34 66 30 54 Z" fill="#fff6ea" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M30 40 Q38 34 46 40" fill="none" stroke="${INK}" stroke-width="2.5"/><path d="M54 40 Q62 34 70 40" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      eye(39, 46, '#2a7a3a') + eye(61, 46, '#2a7a3a') +
      `<ellipse cx="50" cy="62" rx="3.4" ry="2.4" fill="${INK}"/><path d="M45 67 Q50 70 56 66" fill="none" stroke="${INK}" stroke-width="1.8"/>` +
      `<path d="M30 28 Q40 22 52 24" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2.5"/>` +
      headset(46)),
    marlow: () => frame(['#b8c4d0', '#4a5868'],
      suit('#4a6a3a', '#d8c8a0') +
      `<path d="M34 34 Q24 2 34 0 Q44 4 44 30 Z" fill="#9aa2ac" stroke="${INK}" stroke-width="2.5"/><path d="M36 28 Q30 8 35 5 Q40 8 40 28 Z" fill="#f0c8c8"/>` +
      `<path d="M66 34 Q80 6 72 2 Q60 4 56 30 Z" fill="#9aa2ac" stroke="${INK}" stroke-width="2.5"/><path d="M64 28 Q74 10 71 7 Q62 9 60 28 Z" fill="#f0c8c8"/>` +
      `<path d="M26 50 Q26 28 50 28 Q74 28 74 50 Q74 70 50 76 Q26 70 26 50 Z" fill="#9aa2ac" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M34 60 Q50 54 66 60 Q62 74 50 76 Q38 74 34 60 Z" fill="#eef0f2" stroke="${INK}" stroke-width="2"/>` +
      // goggles on forehead
      `<rect x="28" y="30" width="44" height="10" rx="5" fill="#5a3a22" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="40" cy="35" r="6.5" fill="#7fd0e8" stroke="${INK}" stroke-width="2.2"/><circle cx="60" cy="35" r="6.5" fill="#7fd0e8" stroke="${INK}" stroke-width="2.2"/>` +
      `<circle cx="38" cy="33" r="2" fill="#fff"/><circle cx="58" cy="33" r="2" fill="#fff"/>` +
      `<path d="M35 46 L45 47" stroke="${INK}" stroke-width="2.4"/><path d="M55 47 L65 46" stroke="${INK}" stroke-width="2.4"/>` +
      eye(40, 51, '#6a4a2a', 3.4, 0) + eye(60, 51, '#6a4a2a', 3.4, 0) +
      `<path d="M46 60 L54 60 L50 64 Z" fill="#e88a9a" stroke="${INK}" stroke-width="1.5"/>` +
      `<path d="M50 64 L50 67 M44 69 Q50 72 56 69" fill="none" stroke="${INK}" stroke-width="1.8"/>` +
      `<path d="M40 64 L28 62 M40 66 L29 67 M60 64 L72 62 M60 66 L71 67" stroke="${INK}" stroke-width="1"/>` +
      headset(50)),
    kestrel: () => frame(['#7ab8ff', '#1a3a8a'],
      suit('#d83a3a', '#ffd84a') +
      // crest feathers
      `<path d="M40 30 L30 6 L48 22 L50 2 L58 22 L72 8 L62 32 Z" fill="#2a5ad8" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M26 50 Q26 26 50 26 Q74 26 74 50 Q72 70 50 76 Q28 70 26 50 Z" fill="#3a7aff" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M30 54 Q50 48 70 54 Q66 72 50 76 Q34 72 30 54 Z" fill="#eaf2ff" stroke="${INK}" stroke-width="2"/>` +
      // beak
      `<path d="M42 54 Q50 50 58 54 L52 70 Q50 72 48 68 Z" fill="#ffc83a" stroke="${INK}" stroke-width="2.2"/>` +
      `<path d="M44 58 L56 58" stroke="${INK}" stroke-width="1.4"/>` +
      // cocky brows + eyes
      `<path d="M30 38 L46 43" stroke="${INK}" stroke-width="3.5"/><path d="M70 38 L54 43" stroke="${INK}" stroke-width="3.5"/>` +
      eye(39, 47, '#ff8a1a', 3.8, 1.2) + eye(61, 47, '#ff8a1a', 3.8, 1.2) +
      // half-lid smug
      `<path d="M35 45 L43 46" stroke="#3a7aff" stroke-width="3"/><path d="M57 46 L65 45" stroke="#3a7aff" stroke-width="3"/>` +
      headset(47, '#ffd84a')),
    tobi: () => frame(['#9af08a', '#2a7a3a'],
      suit('#e8a03a', '#5a3a22') +
      `<path d="M20 52 Q18 26 50 24 Q82 26 80 52 Q78 72 50 76 Q22 72 20 52 Z" fill="#5ac86a" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M30 60 Q50 70 70 60 Q66 74 50 76 Q34 74 30 60 Z" fill="#d8f0b8" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="30" cy="36" r="3" fill="#3a9a4a"/><circle cx="68" cy="32" r="2.5" fill="#3a9a4a"/><circle cx="60" cy="28" r="2" fill="#3a9a4a"/>` +
      // big eyes
      eye(37, 44, '#7a3ad8', 9, 0.5) + eye(63, 44, '#7a3ad8', 9, 0.5) +
      `<path d="M38 62 Q50 70 62 62" fill="#c83a4a" stroke="${INK}" stroke-width="2"/>` +
      // wrench clip + cap
      `<path d="M26 30 Q50 10 74 30 L76 34 Q50 22 24 34 Z" fill="#e8a03a" stroke="${INK}" stroke-width="2.2"/>` +
      `<rect x="44" y="18" width="12" height="7" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` +
      headset(50, '#e8a03a')),
    croak: () => frame(['#c88aff', '#3a1458'],
      `<path d="M2 100 Q8 72 30 68 L50 74 L70 68 Q92 72 98 100 Z" fill="#8a1a3a" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M30 68 Q50 86 70 68 L66 78 Q50 92 34 78 Z" fill="#ffd84a" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="50" cy="86" r="4" fill="#3ad8ff" stroke="${INK}" stroke-width="1.8"/>` +
      `<path d="M10 56 Q10 30 50 30 Q90 30 90 56 Q88 74 50 76 Q12 74 10 56 Z" fill="#8a4ac8" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M18 60 Q50 72 82 60 Q78 74 50 76 Q22 74 18 60 Z" fill="#d8b8f0" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M16 58 Q50 70 84 58" fill="none" stroke="${INK}" stroke-width="2.8"/>` +
      // bulging eyes on top
      `<circle cx="32" cy="34" r="11" fill="#8a4ac8" stroke="${INK}" stroke-width="2.5"/><circle cx="68" cy="34" r="11" fill="#8a4ac8" stroke="${INK}" stroke-width="2.5"/>` +
      `<ellipse cx="32" cy="35" rx="7" ry="6" fill="#ffd83a" stroke="${INK}" stroke-width="1.8"/><ellipse cx="68" cy="35" rx="7" ry="6" fill="#ffd83a" stroke="${INK}" stroke-width="1.8"/>` +
      `<rect x="30.5" y="31" width="3" height="8" rx="1.5" fill="${INK}"/><rect x="66.5" y="31" width="3" height="8" rx="1.5" fill="${INK}"/>` +
      `<path d="M22 28 L42 32 M78 28 L58 32" stroke="${INK}" stroke-width="3"/>` +
      // crown
      `<path d="M36 22 L36 6 L43 14 L50 2 L57 14 L64 6 L64 22 Z" fill="#ffc83a" stroke="${INK}" stroke-width="2.2"/>` +
      `<circle cx="50" cy="15" r="3" fill="#e83a5a" stroke="${INK}" stroke-width="1.4"/><circle cx="40" cy="18" r="1.8" fill="#3ad8ff"/><circle cx="60" cy="18" r="1.8" fill="#3ad8ff"/>` +
      `<circle cx="38" cy="50" r="1.5" fill="${INK}"/><circle cx="62" cy="50" r="1.5" fill="${INK}"/>`),
    jackal: () => frame(['#5a4a2a', '#120c08'],
      suit('#1a1620', '#d8a83a') +
      `<path d="M26 44 L20 6 L44 28 Z" fill="#2a2430" stroke="${INK}" stroke-width="2.5"/><path d="M28 36 L25 16 L38 28 Z" fill="#d8a83a"/>` +
      `<path d="M74 44 L80 6 L56 28 Z" fill="#2a2430" stroke="${INK}" stroke-width="2.5"/><path d="M72 36 L75 16 L62 28 Z" fill="#d8a83a"/>` +
      `<path d="M24 46 Q26 26 50 26 Q74 26 76 46 Q72 58 60 64 L50 80 L40 64 Q28 58 24 46 Z" fill="#2a2430" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M38 60 Q50 56 62 60 L50 80 Z" fill="#c8b890" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M30 40 L46 45" stroke="#d8a83a" stroke-width="3"/><path d="M70 40 L54 45" stroke="#d8a83a" stroke-width="3"/>` +
      eye(39, 48, '#ffd83a', 3.6, -0.6) + eye(61, 48, '#ff3a3a', 3.6, -0.6) +
      // scar across right eye
      `<path d="M56 36 L68 58" stroke="#e85a5a" stroke-width="2.4"/><path d="M58 40 L62 39 M61 46 L65 45 M64 52 L68 51" stroke="#e85a5a" stroke-width="1.4"/>` +
      `<ellipse cx="50" cy="74" rx="3" ry="2.2" fill="${INK}"/>` +
      `<path d="M44 66 L47 70 M56 66 L53 70" stroke="#fff" stroke-width="1.6"/>` +
      headset(48, '#d8a83a')),
    hq: () => frame(['#d8c8a0', '#5a4a2a'],
      `<path d="M4 100 Q8 74 30 70 L50 76 L70 70 Q92 74 96 100 Z" fill="#3a5a3a" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M30 70 L50 90 L70 70" fill="none" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="16" y="82" width="14" height="5" fill="#ffd84a" stroke="${INK}" stroke-width="1.4"/><rect x="16" y="89" width="14" height="5" fill="#e83a3a" stroke="${INK}" stroke-width="1.4"/>` +
      // jowly bulldog head
      `<path d="M18 52 Q18 30 50 30 Q82 30 82 52 Q84 72 66 76 Q50 80 34 76 Q16 72 18 52 Z" fill="#c8a07a" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M22 44 Q14 40 14 54 Q18 60 24 56 Z" fill="#8a6a4a" stroke="${INK}" stroke-width="2"/><path d="M78 44 Q86 40 86 54 Q82 60 76 56 Z" fill="#8a6a4a" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M28 60 Q50 54 72 60 Q72 74 50 76 Q28 74 28 60 Z" fill="#e8d0b0" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M34 42 L46 46" stroke="#eee" stroke-width="4"/><path d="M66 42 L54 46" stroke="#eee" stroke-width="4"/>` +
      eye(40, 50, '#4a3a2a', 3, 0) + eye(60, 50, '#4a3a2a', 3, 0) +
      `<ellipse cx="50" cy="60" rx="6" ry="3.5" fill="${INK}"/>` +
      `<path d="M36 68 Q50 64 64 68" fill="none" stroke="${INK}" stroke-width="2"/><path d="M40 68 L41 64 M60 68 L59 64" stroke="#fff" stroke-width="2"/>` +
      // officer cap
      `<path d="M22 34 Q50 8 78 34 Z" fill="#2a4a2a" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M18 34 Q50 40 82 34 L80 38 Q50 44 20 38 Z" fill="#1a1a1a" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="50" cy="26" r="4" fill="#ffd84a" stroke="${INK}" stroke-width="1.6"/>`),
  };
  function portrait(id) {
    return (PORTRAITS[id] || PORTRAITS.hq)();
  }

  return {
    playerShip, fighter, dart, gunship, mine, ace, turret, tank, strider, mothership,
    building, arch, tree, rock, asteroid, tower, supplyCrate, ring, pickup, carrier, debrisChunk,
    portrait, rockGeo,
  };
})();
