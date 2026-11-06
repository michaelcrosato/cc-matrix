/** A hand-built, ink-lined miniature suburb and its moonlit forest escape. */
export function buildWorld(THREE, scene, physics, materials = {}) {
  const RAPIER = materials.RAPIER;
  const root = new THREE.Group();
  root.name = "Moonward neighborhood";
  scene.add(root);
  const targets = [],
    agents = [],
    flowers = [],
    candies = [],
    hoops = [],
    hazards = [],
    decorations = [];
  const ink = new THREE.MeshBasicMaterial({ color: 0x111827, side: THREE.BackSide });
  const edgeInk = new THREE.LineBasicMaterial({ color: 0x10202d, transparent: true, opacity: 0.8 });
  const matCache = new Map();
  const toon = (color) => {
    if (!matCache.has(color)) matCache.set(color, new THREE.MeshToonMaterial({ color }));
    return matCache.get(color);
  };
  const glow = (color, opacity = 1) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity === 1,
    });
  const gold = glow(0xffdf85),
    teal = glow(0x7ff9da),
    windows = glow(0xffd69a);
  let seed = 1982;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pick = (a) => a[Math.floor(random() * a.length)];
  function mesh(geo, material, x = 0, y = 0, z = 0, parent = root, outline = true) {
    const obj = new THREE.Mesh(geo, typeof material === "number" ? toon(material) : material);
    obj.position.set(x, y, z);
    obj.castShadow = true;
    obj.receiveShadow = true;
    parent.add(obj);
    if (outline) {
      const outer = new THREE.Mesh(geo, ink);
      outer.scale.setScalar(1.035);
      obj.add(outer);
    }
    return obj;
  }
  function box(w, h, d, color, x, y, z, parent = root, outline = true) {
    return mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent, outline);
  }
  function ball(r, color, x, y, z, parent = root, sx = 1, sy = 1, sz = 1) {
    const m = mesh(new THREE.SphereGeometry(r, 12, 8), color, x, y, z, parent);
    m.scale.set(sx, sy, sz);
    return m;
  }
  function cylinder(r1, r2, h, color, x, y, z, parent = root, n = 10) {
    return mesh(new THREE.CylinderGeometry(r1, r2, h, n), color, x, y, z, parent);
  }
  function line(points, color = 0x314452, parent = root) {
    const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    parent.add(l);
    return l;
  }
  function collider(x, y, z, hx, hy, hz) {
    if (!RAPIER || !physics) return;
    const b = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    physics.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.7), b);
  }
  function label(text, x, y, z, color = "#ffde9c", scale = 5, parent = root) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext("2d");
    c.fillStyle = "rgba(10,24,39,.85)";
    c.beginPath();
    c.roundRect(8, 18, 496, 92, 24);
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = color;
    c.stroke();
    c.fillStyle = color;
    c.font = "bold 40px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 256, 66);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(scale, scale / 4, 1);
    parent.add(sprite);
    return sprite;
  }
  // Layered paper-like terrain, a quiet road, curbs and pools of streetlight.
  box(77, 0.6, 79, 0x2b5b58, 0, -0.42, -3, root, false);
  box(10, 0.07, 73, 0x28354b, 0, -0.065, -3, root, false);
  box(68, 0.07, 8, 0x28354b, 0, -0.06, 3, root, false);
  for (const side of [-1, 1]) {
    box(1.5, 0.12, 73, 0x8a8f86, side * 5.8, 0, -3, root, false);
    box(31, 0.12, 1.4, 0x8a8f86, side * 20.8, 0, 7.8, root, false);
    box(31, 0.12, 1.4, 0x8a8f86, side * 20.8, 0, -1.8, root, false);
  }
  for (let z = -30; z < 33; z += 6)
    if (Math.abs(z - 3) > 5) box(0.18, 0.03, 2.2, glow(0xadb1a2), 0, 0.005, z, root, false);
  for (let x = -30; x <= 30; x += 6)
    if (Math.abs(x) > 6) box(2.2, 0.03, 0.15, glow(0xadb1a2), x, 0.01, 3, root, false);
  for (let z = -0.5; z <= 6.5; z += 1.2)
    box(1.5, 0.03, 0.55, glow(0xb0bbb0), 4.1, 0.015, z, root, false);
  // Gabled roofs with crisp silhouette edges.
  function roof(w, h, d, color, x, y, z, parent) {
    const vertices = [
      -w / 2,
      0,
      -d / 2,
      w / 2,
      0,
      -d / 2,
      0,
      h,
      -d / 2,
      -w / 2,
      0,
      d / 2,
      0,
      h,
      d / 2,
      w / 2,
      0,
      d / 2,
      -w / 2,
      0,
      -d / 2,
      0,
      h,
      -d / 2,
      -w / 2,
      0,
      d / 2,
      0,
      h,
      -d / 2,
      0,
      h,
      d / 2,
      -w / 2,
      0,
      d / 2,
      w / 2,
      0,
      -d / 2,
      w / 2,
      0,
      d / 2,
      0,
      h,
      -d / 2,
      0,
      h,
      -d / 2,
      w / 2,
      0,
      d / 2,
      0,
      h,
      d / 2,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    const r = mesh(geo, color, x, y, z, parent, false);
    r.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeInk));
    return r;
  }
  function house(x, z, color, roofColor, number) {
    const h = new THREE.Group();
    h.position.set(x, 0, z);
    root.add(h);
    box(8, 4.8, 7, color, 0, 2.4, 0, h);
    roof(9.2, 2.8, 8.2, roofColor, 0, 4.85, 0, h);
    box(0.5, 2.4, 0.6, 0xa98c7c, 2.5, 6.6, -1, h);
    box(0.8, 0.25, 0.8, 0x555d6b, 2.5, 7.8, -1, h);
    box(1.55, 2.8, 0.12, 0x38505b, 0, 1.4, 3.57, h);
    ball(0.07, gold, 0.5, 1.4, 3.68, h);
    box(3.4, 0.25, 1.9, 0xa7aa98, 0, 0.12, 4.15, h);
    for (const wx of [-2.55, 2.55]) {
      box(1.65, 1.65, 0.13, 0x263c49, wx, 2.65, 3.57, h);
      box(1.32, 1.32, 0.08, windows, wx, 2.65, 3.66, h, false);
      box(0.09, 1.4, 0.12, 0x6b5a51, wx, 2.65, 3.73, h);
      box(1.4, 0.09, 0.12, 0x6b5a51, wx, 2.65, 3.73, h);
      box(1.9, 0.18, 0.3, 0x876e59, wx, 1.8, 3.7, h);
      for (let i = -1; i <= 1; i++)
        ball(0.18, pick([0xc9828e, 0xe7bb78, 0xabbc89]), wx + i * 0.45, 2, 3.75, h);
    }
    box(1.4, 1.3, 0.12, windows, 0, 5.6, 3.64, h, false);
    box(0.08, 1.4, 0.15, 0x594d4c, 0, 5.6, 3.7, h);
    const warm = new THREE.PointLight(0xffbb76, 8, 12, 2);
    warm.position.set(0, 2.3, 4);
    h.add(warm);
    label(String(number), 0, 3.4, 3.8, "#fae3ad", 1, h);
    collider(x, 2.4, z, 4, 2.4, 3.5);
    // Shingled roof lines read like pen strokes.
    for (let i = 1; i < 5; i++) {
      const u = i / 5,
        ry = 4.85 + u * 2.8,
        rx = (1 - u) * 4.6;
      line(
        [
          [-rx, ry, -4.13],
          [-rx, ry, 4.13],
        ],
        0x293342,
        h,
      );
      line(
        [
          [rx, ry, -4.13],
          [rx, ry, 4.13],
        ],
        0x293342,
        h,
      );
    }
    // Path, mailbox, garden and safe front yard.
    box(1.5, 0.025, 4, 0x83958b, 0, 0.015, 7.1, h, false);
    cylinder(0.07, 0.07, 1.6, 0x8d765c, -4.5, 0.8, 5.7, h);
    box(0.9, 0.55, 0.65, 0x546d7c, -4.5, 1.6, 5.7, h);
    box(0.1, 0.7, 0.08, 0xd98b67, -4.1, 1.9, 5.7, h);
    for (const side of [-1, 1])
      for (let j = 0; j < 5; j++)
        ball(
          0.48,
          pick([0x35665c, 0x3c7263, 0x457668]),
          side * (2 + j * 0.5),
          0.4,
          5.3,
          h,
          1,
          0.8,
          1,
        );
  }
  house(-26, 21, 0x9ba58b, 0x746586, 17);
  house(26, 21, 0xc29a81, 0x5d6d80, 19);
  house(-27, -7, 0x858fa2, 0x6d566d, 23);
  house(27, -7, 0x91a691, 0x7c6266, 25);
  // Low picket fences keep the yards feeling human-scaled without trapping the player.
  for (const x of [-34, 34])
    for (let z = -26; z < 32; z += 1.1) {
      box(0.14, 1.15, 0.14, 0x959e8b, x, 0.57, z);
    }
  for (const x of [-34, 34]) for (const y of [0.35, 0.85]) box(0.1, 0.12, 58, 0x788b7d, x, y, 3);
  function streetLamp(x, z) {
    cylinder(0.09, 0.14, 6, 0x273949, x, 3, z);
    cylinder(0.35, 0.5, 0.2, 0x465a65, x, 0.1, z);
    box(1.5, 0.12, 0.14, 0x2b3c49, x - 0.55, 5.9, z);
    cylinder(0.55, 0.18, 0.35, 0x526477, x - 1.2, 5.75, z);
    ball(0.23, windows, x - 1.2, 5.52, z, root, 1, 0.45, 1);
    const light = new THREE.PointLight(0xffca8b, 16, 17, 2);
    light.position.set(x - 1.2, 5.4, z);
    root.add(light);
    const disk = mesh(
      new THREE.CircleGeometry(3.5, 28),
      glow(0xe7be7d, 0.07),
      x - 1.2,
      0.04,
      z,
      root,
      false,
    );
    disk.rotation.x = -Math.PI / 2;
  }
  streetLamp(-6.7, 14);
  streetLamp(6.8, -10);
  streetLamp(-6.8, -27);
  function pine(x, z, size = 1, collide = true) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(size);
    root.add(g);
    cylinder(0.14, 0.28, 3.1, 0x655d59, 0, 1.55, 0, g);
    for (let j = 0; j < 3; j++) {
      const p = mesh(
        new THREE.ConeGeometry(1.7 - j * 0.32, 3.3, 7),
        toon([0x254e50, 0x2c5d59, 0x397268][j]),
        0,
        2.8 + j * 1.4,
        0,
        g,
      );
      p.rotation.y = j * 0.42;
    }
    if (collide) collider(x, 1.5 * size, z, 0.25 * size, 1.5 * size, 0.25 * size);
    return g;
  }
  function broadTree(x, z, size = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(size);
    root.add(g);
    cylinder(0.2, 0.42, 3.4, 0x6b5b56, 0, 1.7, 0, g);
    for (let j = 0; j < 5; j++)
      ball(
        1.7,
        pick([0x4b7967, 0x5d866d, 0x3d6c65]),
        Math.sin(j * 2.4) * 1.1,
        4.3 + (j % 2) * 0.6,
        Math.cos(j * 2.4) * 0.8,
        g,
        1,
        1.1,
        1,
      );
    collider(x, 1.5 * size, z, 0.4 * size, 1.5 * size, 0.4 * size);
    return g;
  }
  const keepClear = [
    [-20, 8],
    [20, -8],
    [-16, -22],
    [-7, 15],
    [9, 8],
    [-21, -14],
    [11, -26],
    [0, -35],
    [0, 16],
  ];
  for (let i = 0; i < 46; i++) {
    const x = (random() - 0.5) * 68,
      z = -32 + random() * 65;
    if (
      Math.abs(x) < 9 ||
      Math.abs(z - 3) < 7 ||
      keepClear.some((p) => Math.hypot(p[0] - x, p[1] - z) < 4.6) ||
      (Math.abs(x) > 20 && (Math.abs(z - 21) < 8 || Math.abs(z + 7) < 7))
    )
      continue;
    (i % 3 ? pine : broadTree)(x, z, 0.75 + random() * 0.5);
  }
  for (let i = 0; i < 34; i++) {
    const x = (i % 2 ? -1 : 1) * (35 + random() * 5),
      z = -38 + random() * 77;
    pine(x, z, 1 + random() * 0.7, false);
  }
  // Start-yard keepsakes: an abandoned swing, a red wagon, a ball and a makeshift fort.
  box(2.4, 0.35, 1.2, 0xb65a57, -10, 0.4, 24);
  for (const x of [-10.8, -9.2])
    for (const z of [23.5, 24.5]) {
      const w = cylinder(0.24, 0.24, 0.16, 0x263545, x, 0.25, z);
      w.rotation.z = Math.PI / 2;
    }
  line(
    [
      [-11, 1, 24],
      [-12, 1.5, 24],
    ],
    0x263545,
  );
  ball(0.42, 0xe1b26d, 10, 0.43, 20);
  for (const x of [-16, -11]) {
    const p = box(0.16, 4.2, 0.16, 0x6d7271, x, 2.1, 28);
    p.rotation.z = x === -16 ? -0.12 : 0.12;
  }
  box(5.8, 0.18, 0.2, 0x6d7271, -13.5, 4.1, 28);
  line(
    [
      [-14.4, 4.1, 28],
      [-14.4, 1.3, 28],
    ],
    0xb0ad8e,
  );
  line(
    [
      [-12.6, 4.1, 28],
      [-12.6, 1.3, 28],
    ],
    0xb0ad8e,
  );
  box(2.1, 0.15, 0.8, 0x85685e, -13.5, 1.3, 28);
  const fort = new THREE.Group();
  fort.position.set(13, 0, 26);
  root.add(fort);
  roof(4, 3, 3.5, 0xbb8f73, 0, 0.1, 0, fort);
  box(3.2, 0.05, 2.6, 0x967060, 0, 0.12, 0.2, fort, false);
  // Crayon-like grass tufts, daisies, little rocks and fallen autumn leaves.
  for (let i = 0; i < 210; i++) {
    const x = (random() - 0.5) * 72,
      z = -35 + random() * 72;
    if (Math.abs(x) < 7 || Math.abs(z - 3) < 5) continue;
    if (i % 4 === 0) {
      const r = ball(0.13 + random() * 0.18, pick([0x677d79, 0x597276, 0x8b9587]), x, 0.11, z);
      r.scale.y = 0.45;
    } else {
      const g = mesh(
        new THREE.ConeGeometry(0.12, 0.4 + random() * 0.35, 3),
        toon(pick([0x528270, 0x638f73, 0x376b62])),
        x,
        0.18,
        z,
      );
      g.rotation.z = (random() - 0.5) * 0.5;
    }
    if (i % 9 === 0) {
      const leaf = mesh(
        new THREE.CircleGeometry(0.16, 5),
        toon(0xc79862),
        x,
        0.035,
        z,
        root,
        false,
      );
      leaf.rotation.x = -Math.PI / 2;
    }
  }
  // Findable, oversized household objects; each has a floating luminous marker.
  function collectible(id, name, x, z, color) {
    const g = new THREE.Group();
    g.position.set(x, 1.2, z);
    root.add(g);
    const ring = mesh(
      new THREE.TorusGeometry(1.35, 0.035, 6, 32),
      glow(color),
      0,
      -0.9,
      0,
      g,
      false,
    );
    ring.rotation.x = -Math.PI / 2;
    const marker = mesh(new THREE.OctahedronGeometry(0.22), glow(color), 0, 2.3, 0, g);
    const entry = { id, name, x, z, mesh: g, color, marker, baseY: 1.2 };
    targets.push(entry);
    return g;
  }
  const radio = collectible("radio", "Pocket radio", -20, 8, 0xffd68c);
  box(1.9, 1.25, 0.65, 0x9d6e60, 0, 0, 0, radio);
  box(0.9, 0.78, 0.1, 0x253b48, -0.35, 0.04, 0.38, radio);
  for (let i = 0; i < 5; i++)
    box(0.04, 0.6, 0.06, 0xbba993, -0.7 + i * 0.17, 0.04, 0.46, radio, false);
  ball(0.18, 0xe9d6a9, 0.62, 0.13, 0.4, radio);
  line(
    [
      [0.6, 0.6, 0],
      [0.9, 1.8, 0],
    ],
    0xe1dcc1,
    radio,
  );
  box(0.6, 0.15, 0.1, glow(0x85d8c3), 0.4, 0.4, 0.38, radio, false);
  const battery = collectible("battery", "Power cell", 20, -8, 0x86f6d6);
  box(1.35, 1.4, 1, 0x426a76, 0, 0, 0, battery);
  box(0.85, 0.2, 0.55, 0xbab6a0, 0, 0.8, 0, battery);
  box(0.7, 0.9, 0.1, glow(0x92efba), 0, 0, 0.55, battery, false);
  line(
    [
      [-0.2, 0.2, 0.61],
      [0.15, 0.2, 0.61],
      [-0.15, -0.12, 0.61],
      [0.2, -0.12, 0.61],
    ],
    0x315157,
    battery,
  );
  const dish = collectible("dish", "Makeshift dish", -16, -22, 0xaeb9ff);
  const d = mesh(
    new THREE.SphereGeometry(1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    toon(0xa8b6bd),
    0,
    0.15,
    0,
    dish,
  );
  d.rotation.x = 0.75;
  d.scale.y = 0.32;
  cylinder(0.15, 0.35, 0.8, 0x6e7d87, 0, -0.5, 0, dish);
  line(
    [
      [0, 0.1, 0],
      [0, 1.15, 0.2],
      [0.3, 1.5, 0.5],
    ],
    0x333f56,
    dish,
  );
  ball(0.16, gold, 0.3, 1.5, 0.5, dish);
  // A constellation of candy rewards encourages optional exploration.
  const candySpots = [
    [-9, 18],
    [12, 14],
    [-17, 11],
    [17, -3],
    [-11, -12],
    [23, -18],
    [-23, -25],
    [7, -30],
  ];
  for (let i = 0; i < candySpots.length; i++) {
    const [x, z] = candySpots[i],
      g = new THREE.Group();
    g.position.set(x, 0.6, z);
    root.add(g);
    ball(0.24, pick([0xf1b573, 0xbda6d2, 0x98d6ba]), 0, 0, 0, g, 1.2, 0.75, 0.75);
    for (const side of [-1, 1]) {
      const wrap = mesh(
        new THREE.ConeGeometry(0.21, 0.25, 4),
        toon(i % 2 ? 0xe5ab82 : 0xadc9b8),
        side * 0.35,
        0,
        0,
        g,
      );
      wrap.rotation.z = (side * Math.PI) / 2;
    }
    candies.push({ x, z, mesh: g, collected: false, baseY: 0.6 });
  }
  for (const [x, z] of [
    [-7, 15],
    [9, 8],
    [-21, -14],
    [11, -26],
  ]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    cylinder(0.46, 0.6, 0.7, 0x9b6b64, 0, 0.35, 0, g);
    cylinder(0.39, 0.39, 0.05, 0x403f47, 0, 0.73, 0, g);
    const plant = new THREE.Group();
    plant.position.set(0, 0.75, 0);
    g.add(plant);
    const stem = cylinder(0.045, 0.045, 0.6, 0x758678, 0, 0.3, 0, plant);
    stem.rotation.z = 0.35;
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const petal = ball(
        0.21,
        0x887c99,
        Math.cos(i * 1.257) * 0.25,
        0.64,
        Math.sin(i * 1.257) * 0.25,
        plant,
        1,
        0.4,
        1,
      );
      petals.push(petal);
    }
    ball(0.13, 0xaa9b72, 0, 0.65, 0, plant);
    flowers.push({ x, z, mesh: g, plant, stem, petals, healed: false });
  }
  // Friendly-but-ominous search crews, with visible pools that sweep the ground.
  for (let i = 0; i < 3; i++) {
    const [x, z] = [
        [-13, 1],
        [14, -12],
        [-7, -24],
      ][i],
      g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    cylinder(0.42, 0.5, 1.25, 0x697b80, 0, 1.15, 0, g);
    ball(0.32, 0xbca894, 0, 2, 0, g);
    cylinder(0.42, 0.42, 0.15, 0x465967, 0, 2.18, 0, g);
    for (const sx of [-1, 1]) {
      box(0.27, 0.75, 0.3, 0x364956, sx * 0.25, 0.4, 0, g);
      const arm = box(0.22, 0.95, 0.24, 0x697b80, sx * 0.57, 1.15, 0, g);
      arm.rotation.x = -0.5;
    }
    cylinder(0.14, 0.14, 0.55, 0x273b47, 0.65, 1.25, 0.45, g);
    ball(0.13, windows, 0.65, 1.25, 0.75, g);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(3.3, 9, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffdfa5,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(0.5, 1, 5);
    g.add(cone);
    const pool = mesh(
      new THREE.CircleGeometry(2.5, 32),
      glow(0xffd58a, 0.12),
      0.5,
      0.035,
      7.5,
      g,
      false,
    );
    pool.rotation.x = -Math.PI / 2;
    const a = {
      mesh: g,
      x,
      z,
      baseX: x,
      baseZ: z,
      phase: i * 2.1,
      stunned: 0,
      cone,
      pool,
      heading: 0,
    };
    agents.push(a);
  }
  // Forest clearing and a homemade contact rig.
  box(31, 0.4, 19, 0x315f59, 0, -0.22, -36, root, false);
  const clearing = mesh(new THREE.CircleGeometry(8, 48), toon(0x6c8371), 0, 0.02, -35, root, false);
  clearing.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    if (Math.sin(a) > 0.8) continue;
    ball(0.4, 0x68877a, Math.cos(a) * 7.5, 0.2, -35 + Math.sin(a) * 7.5, root, 1.2, 0.6, 1);
  }
  const signal = new THREE.Group();
  signal.position.set(0, 0.15, -35);
  root.add(signal);
  box(2.6, 0.35, 2, 0x746a62, 0, 0.2, 0, signal);
  box(1.5, 0.7, 1.1, 0x9b856d, 0, 0.7, 0, signal);
  box(0.8, 0.35, 0.1, glow(0x74d6be), 0, 0.8, 0.6, signal, false);
  for (const side of [-1, 1])
    line(
      [
        [side * 0.8, 0.3, 0],
        [0, 2.5, 0],
      ],
      0x9eaaa0,
      signal,
    );
  const antenna = cylinder(0.025, 0.035, 4, 0xbbbdab, 0, 2.1, 0, signal);
  line(
    [
      [-1.3, 3.3, 0],
      [1.3, 3.3, 0],
    ],
    0xbccaba,
    signal,
  );
  line(
    [
      [-0.9, 3.8, 0],
      [0.9, 3.8, 0],
    ],
    0xbccaba,
    signal,
  );
  ball(0.12, teal, 0, 4.2, 0, signal);
  const signalHalo = mesh(
    new THREE.TorusGeometry(3.8, 0.025, 6, 48),
    glow(0x7ff9da, 0.7),
    0,
    0.1,
    0,
    signal,
    false,
  );
  signalHalo.rotation.x = -Math.PI / 2;
  signal.userData.halo = signalHalo;
  label("THE LISTENING CLEARING", 0, 4.8, -36, "#a7e7d5", 7);
  // Full bicycle flight route: changing elevations, firefly rings, silhouetted pines.
  box(46, 0.45, 205, 0x204c49, 0, -0.35, -142, root, false);
  box(5, 0.03, 194, 0x6b7f6b, 0, -0.08, -139, root, false);
  const ringX = [0, -6, 5, -7, 7, 0, -5, 6, -4, 5, 0, 0],
    ringY = [3.4, 4.5, 6, 5, 7, 8, 6, 4.5, 6.5, 7.5, 5, 4];
  for (let i = 0; i < 12; i++) {
    const x = ringX[i],
      y = ringY[i],
      z = -60 - i * 14,
      g = new THREE.Group();
    g.position.set(x, y, z);
    root.add(g);
    mesh(new THREE.TorusGeometry(2.5, 0.09, 8, 48), glow(0x9af6d5), 0, 0, 0, g);
    mesh(new THREE.TorusGeometry(2.72, 0.025, 5, 48), glow(0xffd99b), 0, 0, 0, g, false);
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      ball(0.09, gold, Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0, g);
    }
    hoops.push({ x, y, z, mesh: g, collected: false, passed: false, index: i, radius: 2.5 });
    // Painted light chevrons show the route even between rings.
    for (let j = 0; j < 2; j++) {
      const zz = z + 5 + j * 4;
      const glowDot = ball(0.055, teal, x, y, zz);
      decorations.push({ kind: "route", mesh: glowDot });
    }
  }
  for (let i = 0; i < 110; i++) {
    const z = -43 - random() * 202,
      x = (i % 2 ? -1 : 1) * (12 + random() * 13);
    pine(x, z, 0.9 + random() * 1.3, false);
  }
  // Fallen logs border the path and make the takeoff feel like an escape into wilderness.
  for (let i = 0; i < 12; i++) {
    const z = -44 - i * 15,
      x = (i % 2 ? -1 : 1) * (9 + random() * 3);
    const log = cylinder(0.5, 0.6, 4, 0x6e6455, x, 0.5, z);
    log.rotation.z = Math.PI / 2;
    ball(0.45, 0xafa17c, x + 2, 0.5, z, root, 0.1, 1, 1);
  }
  // Parked search vans are low obstacles: a little lift carries the bicycle safely over.
  for (const [i, x] of [-2, 3, -4, 3, -2].entries()) {
    const z = -81 - i * 28,
      g = new THREE.Group();
    g.position.set(x, 1.7, z);
    root.add(g);
    box(2.9, 2.2, 5, 0x60777b, 0, -0.25, 0, g);
    box(2.8, 0.8, 2.2, 0x50676f, 0, 0.9, 0.8, g);
    box(2.35, 0.6, 0.08, glow(0x97b7b8), 0, 0.9, 1.95, g, false);
    box(2.2, 0.5, 0.08, 0x344d5a, 0, -0.15, 2.56, g);
    box(3.05, 0.2, 0.3, 0xb8b7a1, 0, -1.1, 2.55, g);
    for (const side of [-1, 1]) {
      ball(0.2, windows, side * 0.95, -0.4, 2.57, g, 1, 0.7, 0.3);
      for (const zz of [-1.5, 1.5]) {
        const wheel = cylinder(0.48, 0.48, 0.3, 0x243948, side * 1.5, -1.1, zz, g, 12);
        wheel.rotation.z = Math.PI / 2;
      }
      box(0.05, 0.8, 1.25, 0x344d5a, side * 1.48, 0.2, -0.9, g);
    }
    const beacon = ball(0.18, glow(0xecaa72), 0, 1.5, 0, g, 1, 0.7, 1);
    hazards.push({ x, y: 1.7, z, mesh: g, radius: 1.9, beacon, hit: false });
  }
  const ship = new THREE.Group();
  ship.position.set(0, 3, -235);
  root.add(ship);
  ball(5.4, toon(0x879eac), 0, 0, 0, ship, 1, 0.19, 1);
  ball(3.4, toon(0xb4c8cb), 0, 0.8, 0, ship, 1, 0.5, 1);
  const rim = mesh(new THREE.TorusGeometry(5, 0.12, 8, 64), gold, 0, 0, 0, ship);
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    ball(0.21, i % 2 ? gold : teal, Math.cos(a) * 4.5, -0.25, Math.sin(a) * 4.5, ship, 1, 0.6, 1);
  }
  const beam = mesh(
    new THREE.ConeGeometry(4.8, 6, 40, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xa4f8dd,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    0,
    -2,
    0,
    ship,
    false,
  );
  const shipLight = new THREE.PointLight(0x8bf7d6, 36, 28, 2);
  shipLight.position.set(0, -1, 0);
  ship.add(shipLight);
  const destination = mesh(
    new THREE.CircleGeometry(5, 40),
    glow(0x8ef1ce, 0.17),
    0,
    0.035,
    -235,
    root,
    false,
  );
  destination.rotation.x = -Math.PI / 2;
  // A large gouache moon and a scattered, gently shimmering star field.
  const moon = new THREE.Group();
  moon.position.set(-5, 12.6, -105);
  root.add(moon);
  ball(10.5, glow(0xf3e6ba), 0, 0, 0, moon);
  const craters = [
    [-3, 3, 1.8],
    [4, 1, 1.3],
    [1, -4, 2],
    [-5, -2, 0.8],
    [2, 5, 0.9],
  ];
  for (const [x, y, r] of craters) {
    const zz = Math.sqrt(Math.max(1, 10.5 ** 2 - x * x - y * y)) + 0.04;
    const c = mesh(new THREE.CircleGeometry(r, 16), glow(0xd5d3b3), x, y, zz, moon, false);
    c.rotation.y = x * 0.02;
  }
  const moonHalo = mesh(
    new THREE.SphereGeometry(11.3, 24, 16),
    glow(0xa1d6d6, 0.05),
    0,
    0,
    0,
    moon,
    false,
  );
  moon.traverse((obj) => {
    if (obj.isMesh) {
      obj.material = obj.material.clone();
      obj.material.fog = false;
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  const stars = [];
  for (let i = 0; i < 230; i++) {
    const x = (random() - 0.5) * 210,
      y = 22 + random() * 75,
      z = -40 - random() * 250;
    const s = ball(0.045 + random() * 0.075, glow(i % 4 ? 0xf2e1bb : 0x93d7dd), x, y, z);
    s.material.fog = false;
    s.castShadow = false;
    s.receiveShadow = false;
    stars.push(s);
  }
  const fireflies = [];
  for (let i = 0; i < 65; i++) {
    const x = (random() - 0.5) * 62,
      y = 0.8 + random() * 3.8,
      z = -35 + random() * 64,
      s = ball(0.04, glow(0xc8edaa), x, y, z);
    fireflies.push({ mesh: s, x, y, z, phase: random() * 6.28 });
  }
  const ambient = new THREE.HemisphereLight(0x91b9db, 0x31594f, 2.5);
  root.add(ambient);
  const moonlight = new THREE.DirectionalLight(0xa5c3ed, 2.2);
  moonlight.position.set(-20, 45, -25);
  moonlight.castShadow = true;
  moonlight.shadow.mapSize.set(2048, 2048);
  moonlight.shadow.camera.left = -45;
  moonlight.shadow.camera.right = 45;
  moonlight.shadow.camera.top = 45;
  moonlight.shadow.camera.bottom = -45;
  moonlight.shadow.normalBias = 0.04;
  root.add(moonlight);
  const rimLight = new THREE.DirectionalLight(0xffc591, 0.8);
  rimLight.position.set(15, 20, 30);
  root.add(rimLight);
  const lighting = { ambient, moonlight, rimLight, moon, shipLight, stars };
  function update(t, dt) {
    for (const a of agents) {
      if (a.stunned <= 0) {
        a.x = a.baseX + Math.sin(t * 0.34 + a.phase) * 1.5;
        a.z = a.baseZ + Math.cos(t * 0.29 + a.phase) * 1.5;
        a.heading = a.phase + Math.sin(t * 0.4 + a.phase) * 1.25 + t * 0.12;
        a.mesh.rotation.set(0, a.heading, Math.sin(t * 3 + a.phase) * 0.025);
        a.mesh.position.set(a.x, Math.abs(Math.sin(t * 3 + a.phase)) * 0.025, a.z);
        a.cone.visible = true;
        a.pool.visible = true;
        a.cone.material.opacity = 0.07 + Math.sin(t * 2 + a.phase) * 0.008;
        a.pool.material.opacity = 0.12;
      } else {
        a.mesh.position.set(a.x, -0.12, a.z);
        a.mesh.rotation.z = 0.22;
        a.cone.visible = false;
        a.pool.visible = false;
      }
    }
    for (const h of hazards) {
      h.beacon.scale.setScalar(0.75 + Math.max(0, Math.sin(t * 5 + h.z)) * 0.4);
    }
    for (const target of targets) {
      target.mesh.position.y = target.baseY + Math.sin(t * 1.9 + target.x) * 0.12;
      target.marker.rotation.y = t * 0.8;
      target.marker.position.y = 2.2 + Math.sin(t * 2.4) * 0.1;
    }
    for (let i = 0; i < candies.length; i++) {
      const c = candies[i];
      if (!c.collected) {
        c.mesh.position.y = c.baseY + Math.sin(t * 2 + i) * 0.12;
        c.mesh.rotation.y = t * 0.8 + i;
      }
    }
    for (let i = 0; i < hoops.length; i++) {
      const h = hoops[i];
      if (!h.collected && !h.passed) {
        h.mesh.rotation.z = Math.sin(t * 0.5 + i) * 0.06;
      }
    }
    signalHalo.rotation.z = t * 0.1;
    signalHalo.material.opacity = 0.6 + Math.sin(t * 2) * 0.2;
    ship.position.y = 3 + Math.sin(t * 0.7) * 0.22;
    rim.rotation.z = t * 0.1;
    beam.rotation.y = t * 0.2;
    for (const f of fireflies) {
      f.mesh.position.set(
        f.x + Math.sin(t * 0.4 + f.phase) * 0.7,
        f.y + Math.sin(t * 0.8 + f.phase) * 0.3,
        f.z + Math.cos(t * 0.3 + f.phase) * 0.6,
      );
      f.mesh.scale.setScalar(0.5 + Math.max(0, Math.sin(t * 1.8 + f.phase)) * 0.8);
    }
    for (let i = 0; i < stars.length; i += 5)
      stars[i].scale.setScalar(0.75 + Math.sin(t * 0.8 + i) * 0.25);
    for (const f of flowers) {
      if (f.appliedHealed !== f.healed) {
        f.appliedHealed = f.healed;
        f.stem.material = toon(f.healed ? 0x73b98a : 0x758678);
        const petalMaterial = toon(f.healed ? 0xffddaa : 0x887c99);
        for (const p of f.petals) p.material = petalMaterial;
        f.plant.scale.setScalar(f.healed ? 1.55 : 1);
      }
      f.plant.rotation.z = f.healed ? Math.sin(t * 1.6 + f.x) * 0.045 : 0.35;
    }
  }
  function reset() {
    for (const t of targets) t.mesh.visible = true;
    for (const c of candies) {
      c.collected = false;
      c.mesh.visible = true;
    }
    for (const f of flowers) {
      f.healed = false;
      f.appliedHealed = null;
      f.mesh.scale.setScalar(1);
      f.plant.scale.setScalar(1);
    }
    for (const h of hoops) {
      h.collected = false;
      h.passed = false;
      h.mesh.visible = true;
    }
    for (const a of agents) {
      a.stunned = 0;
      a.x = a.baseX;
      a.z = a.baseZ;
      a.mesh.position.set(a.x, 0, a.z);
      a.mesh.rotation.set(0, 0, 0);
      a.cone.visible = true;
      a.pool.visible = true;
    }
    for (const h of hazards) h.hit = false;
  }
  return {
    root,
    targets,
    agents,
    flowers,
    candies,
    hoops,
    hazards,
    decorations,
    ship,
    signal,
    lighting,
    update,
    reset,
    label,
  };
}
