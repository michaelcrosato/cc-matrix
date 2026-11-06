import * as THREE from "three/webgpu";

const INK = 0x122d36,
  TEAL = 0x00ad9c,
  CORAL = 0xed614f,
  CREAM = 0xf6f1df;
export class Arena {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x12333e);
    this.scene.fog = new THREE.Fog(0x12333e, 65, 115);
    this.camera = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.1, 180);
    this.camera.position.set(0, 37, 31);
    this.target = new THREE.Vector3(0, 0, 0);
    this.camera.lookAt(this.target);
    this.title = true;
    this.particles = [];
    this.mixers = [];
    this.skaterMeshes = [];
    this.time = 0;
    this.shake = 0;
    this.textureCache = new Map();
    this.requestedBackend = "WebGPU";
    this.renderer = this.makeRenderer(
      canvas,
      new URLSearchParams(location.search).get("renderer") === "webgl",
    );
    this.gradient = new THREE.DataTexture(
      new Uint8Array([72, 72, 72, 255, 145, 145, 145, 255, 210, 210, 210, 255, 255, 255, 255, 255]),
      4,
      1,
      THREE.RGBAFormat,
    );
    this.gradient.minFilter = THREE.NearestFilter;
    this.gradient.magFilter = THREE.NearestFilter;
    this.gradient.needsUpdate = true;
    this.materials = new Map();
    this.scene.add(new THREE.HemisphereLight(0xd8ffef, 0x2e556b, 2.8));
    const key = new THREE.DirectionalLight(0xfff4d2, 3.2);
    key.position.set(-14, 25, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -25;
    key.shadow.camera.right = 25;
    key.shadow.camera.top = 22;
    key.shadow.camera.bottom = -22;
    key.shadow.normalBias = 0.05;
    key.shadow.bias = -0.0005;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x50e8dd, 1.7);
    rim.position.set(12, 12, -15);
    this.scene.add(rim);
    this.buildRink();
    this.buildArena();
    for (let i = 0; i < 4; i++) this.skaterMeshes.push(this.makeSkater(i));
    this.puckMesh = this.mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.25, 16), 0x13232c, false);
    this.scene.add(this.puckMesh);
    this.puckHalo = this.flatRing(0.37, 0.48, 0xf6c55d, 0.05);
    this.scene.add(this.puckHalo);
    this.selection = [
      this.flatRing(0.87, 1.03, TEAL, 0.045),
      this.flatRing(0.87, 1.03, CORAL, 0.045),
    ];
    this.selection.forEach((o) => {
      this.scene.add(o);
    });
    this.aimLine = this.makeAimLine();
    this.scene.add(this.aimLine);
    this.chargeRing = this.flatRing(1.1, 1.2, 0xf6c55d, 0.055);
    this.scene.add(this.chargeRing);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  makeRenderer(canvas, forceWebGL = false) {
    const renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
      alpha: false,
      forceWebGL,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.onDeviceLost = (info) => {
      renderer._isDeviceLost = true;
      this.lossInfo = info;
      if (this.initialized && !this.recovering)
        this.recoverGraphics().catch((error) => console.error(error));
    };
    return renderer;
  }
  async init() {
    if (navigator.gpu && new URLSearchParams(location.search).get("renderer") !== "webgl") {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        const info = adapter?.info;
        this.adapterDescription = info
          ? [info.vendor, info.architecture, info.device, info.description].join(" ")
          : "unknown";
        if (/swiftshader|llvmpipe|software/i.test(this.adapterDescription)) {
          this.softwareAdapter = true;
          this.renderer = this.makeRenderer(this.canvas, true);
        }
      } catch {
        /* The renderer handles an unavailable adapter through its own fallback. */
      }
    }
    await this.renderer.init();
    this.backend = this.renderer.backend.isWebGPUBackend
      ? "WebGPU"
      : this.softwareAdapter
        ? "WebGL2 fallback for software WebGPU adapter"
        : "WebGL2 fallback";
    this.initialized = true;
    if (this.lossInfo) await this.recoverGraphics();
  }
  async recoverGraphics() {
    if (this.recovering || this.recovered) return;
    this.recovering = true;
    this.recovered = true;
    const old = this.renderer;
    old.onDeviceLost = () => {};
    await new Promise((resolve) => setTimeout(resolve, 300));
    const canvas = document.createElement("canvas");
    canvas.id = "world";
    canvas.setAttribute("aria-label", "A three dimensional ice hockey rink");
    this.canvas.replaceWith(canvas);
    this.canvas = canvas;
    this.renderer = this.makeRenderer(canvas, true);
    await this.renderer.init();
    this.backend = "WebGL2 recovery after WebGPU device loss";
    this.resize();
    this.recovering = false;
    old.dispose();
  }

  mat(color) {
    if (!this.materials.has(color))
      this.materials.set(color, new THREE.MeshToonMaterial({ color, gradientMap: this.gradient }));
    return this.materials.get(color);
  }
  mesh(geo, color, outline = true) {
    const m = new THREE.Mesh(geo, this.mat(color));
    m.castShadow = true;
    m.receiveShadow = true;
    if (outline) {
      const hull = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }),
      );
      hull.scale.setScalar(1.055);
      m.add(hull);
    }
    return m;
  }
  box(w, h, d, color, x = 0, y = 0, z = 0, parent = this.scene, outline = true) {
    const m = this.mesh(new THREE.BoxGeometry(w, h, d), color, outline);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  flatRing(inner, outer, color, y) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 64),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    return m;
  }
  line(points, color = INK, width = 1, parent = this.scene) {
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, linewidth: width }));
    parent.add(l);
    return l;
  }
  text(text, w = 6, h = 1, color = "#f6f1df", bg = null) {
    const key = [text, w, h, color, bg].join("|");
    if (this.textureCache.has(key)) return this.textureCache.get(key).clone();
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round((1024 * h) / w);
    const c = canvas.getContext("2d");
    if (bg) {
      c.fillStyle = bg;
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    c.fillStyle = color;
    c.font = `900 ${canvas.height * 0.72}px "Arial Narrow",Arial,sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.94);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: !bg,
        side: THREE.DoubleSide,
        depthWrite: !!bg,
      }),
    );
    this.textureCache.set(key, m);
    return m.clone();
  }
  roundedShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2,
      y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  iceTexture() {
    const can = document.createElement("canvas");
    can.width = 2048;
    can.height = 1152;
    const c = can.getContext("2d");
    c.fillStyle = "#d9eee6";
    c.fillRect(0, 0, 2048, 1152);
    let seed = 81;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 14000; i++) {
      const x = rnd() * 2048,
        y = rnd() * 1152;
      c.strokeStyle = i % 3 ? "#92c6be18" : "#ffffff55";
      c.lineWidth = rnd() * 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + rnd() * 60 - 30, y + rnd() * 15 - 7);
      c.stroke();
    }
    const x = (v) => ((v + 18) / 36) * 2048,
      z = (v) => ((v + 10) / 20) * 1152;
    c.strokeStyle = "#e46e6170";
    c.lineWidth = 6;
    for (const xx of [-15, 15]) {
      c.beginPath();
      c.moveTo(x(xx), 0);
      c.lineTo(x(xx), 1152);
      c.stroke();
    }
    c.strokeStyle = "#2b9aa487";
    c.lineWidth = 12;
    for (const xx of [-6, 6]) {
      c.beginPath();
      c.moveTo(x(xx), 0);
      c.lineTo(x(xx), 1152);
      c.stroke();
    }
    c.strokeStyle = "#dc7363a0";
    c.lineWidth = 7;
    c.setLineDash([13, 12]);
    c.beginPath();
    c.moveTo(1024, 0);
    c.lineTo(1024, 1152);
    c.stroke();
    c.setLineDash([]);
    const circle = (xx, zz, r, color) => {
      c.strokeStyle = color;
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(x(xx), z(zz), (r / 36) * 2048, (r / 20) * 1152, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = color;
      c.beginPath();
      c.arc(x(xx), z(zz), 7, 0, 7);
      c.fill();
    };
    circle(0, 0, 3.2, "#257e8399");
    for (const xx of [-11, 11]) for (const zz of [-5.6, 5.6]) circle(xx, zz, 2.6, "#d0756680");
    for (const side of [-1, 1]) {
      c.fillStyle = "#79c6d777";
      c.strokeStyle = "#d56e62aa";
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(
        x(side * 17.5),
        z(0),
        (2.6 / 36) * 2048,
        (3.1 / 20) * 1152,
        0,
        side === 1 ? Math.PI / 2 : -Math.PI / 2,
        side === 1 ? Math.PI * 1.5 : Math.PI / 2,
      );
      c.closePath();
      c.fill();
      c.stroke();
    }
    c.save();
    c.translate(1024, 576);
    c.rotate(-0.12);
    c.font = "900 85px Arial";
    c.fillStyle = "#4f999634";
    c.textAlign = "center";
    c.fillText("R / S", 0, 22);
    c.restore();
    c.font = "800 24px Arial";
    c.fillStyle = "#508e8b66";
    c.textAlign = "center";
    c.fillText("T I D A L   A R E N A", 1024, 1050);
    c.fillText("B R E A K W A T E R   C U P", 1024, 98);
    const t = new THREE.CanvasTexture(can);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  buildRink() {
    const base = this.mesh(
      new THREE.ExtrudeGeometry(this.roundedShape(39, 23, 2.8), {
        depth: 1.2,
        bevelEnabled: true,
        bevelThickness: 0.15,
        bevelSize: 0.25,
        bevelSegments: 2,
        steps: 1,
      }),
      0x092a34,
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -1.5;
    this.scene.add(base);
    const iceGeo = new THREE.ShapeGeometry(this.roundedShape(36.1, 20.1, 1.2));
    const uv = iceGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) + 18.05) / 36.1, (uv.getY(i) + 10.05) / 20.1);
    const ice = new THREE.Mesh(
      iceGeo,
      new THREE.MeshToonMaterial({
        map: this.iceTexture(),
        gradientMap: this.gradient,
        color: 0xffffff,
      }),
    );
    ice.rotation.x = -Math.PI / 2;
    ice.position.y = 0.012;
    ice.receiveShadow = true;
    this.scene.add(ice);
    for (const side of [-1, 1]) {
      this.box(36, 0.95, 0.32, CREAM, 0, 0.47, side * 10.2);
      this.box(36, 0.15, 0.42, side === -1 ? TEAL : CORAL, 0, 1, side * 10.2);
      this.box(36, 0.17, 0.36, 0xf0be50, 0, 0.1, side * 10.18);
      for (let x = -17; x <= 17; x += 2) {
        this.box(0.055, 0.9, 0.035, 0xabc7bf, x, 0.5, side * 10.01, this.scene, false);
      }
      for (const zz of [-6.5, 6.5]) {
        this.box(0.34, 0.95, 7.2, CREAM, side * 18.2, 0.47, zz);
        this.box(0.43, 0.15, 7.2, TEAL, side * 18.2, 1, zz);
        this.box(0.36, 0.15, 7.2, 0xf0be50, side * 18.2, 0.1, zz);
      }
      this.goal(side);
    }
    for (const zz of [-10.05, 10.05]) {
      for (let x = -15; x <= 15; x += 7.5) {
        const label = this.text(
          x === 0 ? "RINK OR SWIM" : x < 0 ? "COOL UNDER PRESSURE" : "STAY SALTY",
          6,
          0.54,
          "#2b6b6e",
        );
        label.position.set(x, 0.62, zz);
        if (zz > 0) label.rotation.y = Math.PI;
        this.scene.add(label);
      }
    }
    const glassmat = new THREE.MeshBasicMaterial({
      color: 0xa3e5db,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const side of [-1, 1]) {
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(36, 2), glassmat);
      glass.position.set(0, 2.1, side * 10.3);
      this.scene.add(glass);
      for (let x = -18; x <= 18; x += 3)
        this.box(0.055, 2.1, 0.055, 0x7da9a3, x, 2.05, side * 10.3, this.scene, false);
    }
  }
  goal(side) {
    const g = new THREE.Group();
    g.position.set(side * 18, 0, 0);
    this.scene.add(g);
    const postmat = this.mat(0xed614f);
    const tube = (a, b, r = 0.09) => {
      const va = new THREE.Vector3(...a),
        vb = new THREE.Vector3(...b),
        v = vb.clone().sub(va);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 8), postmat);
      m.position.copy(va.add(vb).multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
      m.castShadow = true;
      g.add(m);
    };
    for (const z of [-2.7, 2.7]) {
      tube([0, 0, z], [0, 2, z]);
      tube([0, 2, z], [side * 1.7, 1.6, z]);
      tube([side * 1.7, 0, z], [side * 1.7, 1.6, z]);
      tube([0, 0, z], [side * 1.7, 0, z]);
    }
    tube([0, 2, -2.7], [0, 2, 2.7]);
    tube([side * 1.7, 1.6, -2.7], [side * 1.7, 1.6, 2.7]);
    const points = [];
    for (let z = -2.7; z <= 2.71; z += 0.32) {
      points.push(new THREE.Vector3(side * 1.72, 0, z), new THREE.Vector3(side * 1.72, 1.6, z));
      points.push(new THREE.Vector3(0, 2, z), new THREE.Vector3(side * 1.72, 1.6, z));
    }
    for (let y = 0.08; y < 1.7; y += 0.25)
      points.push(new THREE.Vector3(side * 1.72, y, -2.7), new THREE.Vector3(side * 1.72, y, 2.7));
    for (const z of [-2.71, 2.71]) {
      for (let y = 0.1; y < 1.7; y += 0.25)
        points.push(new THREE.Vector3(0, y, z), new THREE.Vector3(side * 1.72, y, z));
      for (let x = 0; x < 1.8; x += 0.3)
        points.push(new THREE.Vector3(side * x, 0, z), new THREE.Vector3(side * x, 1.6, z));
    }
    g.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0xcedfd5, transparent: true, opacity: 0.65 }),
      ),
    );
  }
  buildArena() {
    this.box(60, 0.8, 42, 0x0c2935, 0, -2.3, 0, this.scene, false);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshToonMaterial({ color: 0x0f2c39, gradientMap: this.gradient }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.8;
    floor.receiveShadow = true;
    this.scene.add(floor);
    for (const zside of [-1, 1]) {
      for (let tier = 0; tier < 3; tier++) {
        const z = zside * (13 + tier * 2);
        this.box(
          48,
          1,
          1.8,
          tier % 2 ? 0x21444f : 0x1a3c48,
          0,
          0.1 + tier * 0.8,
          z,
          this.scene,
          false,
        );
        this.box(
          48,
          0.13,
          0.12,
          0x476570,
          0,
          0.68 + tier * 0.8,
          z - zside * 0.85,
          this.scene,
          false,
        );
        for (let i = 0; i < 43; i++) {
          const x = (i - 21) * 1.05;
          const colors = [0xf3dcb8, 0x278b89, 0xe66350, 0x719b9b, 0xe0be64, 0x132e3a];
          const c = colors[(i * 7 + tier * 3 + (zside === 1 ? 3 : 0)) % colors.length];
          const person = new THREE.Group();
          person.position.set(x, 0.75 + tier * 0.8, z);
          const body = this.mesh(new THREE.CapsuleGeometry(0.22, 0.32, 2, 5), c, false);
          body.position.y = 0.3;
          person.add(body);
          const head = this.mesh(
            new THREE.IcosahedronGeometry(0.18, 0),
            i % 4 ? 0xe2b58c : 0x98664c,
            false,
          );
          head.position.y = 0.8;
          person.add(head);
          if (i % 5 === 0) {
            const scarf = this.box(
              0.65,
              0.1,
              0.16,
              i % 2 ? TEAL : CORAL,
              0,
              0.48,
              0.1,
              person,
              false,
            );
            scarf.rotation.z = 0.3;
          }
          this.scene.add(person);
        }
      }
      this.box(49, 1.8, 0.4, 0x102e3a, 0, 3.1, zside * 19.5);
      this.box(49, 0.15, 0.5, TEAL, 0, 4.05, zside * 19.5, this.scene, false);
      const board = this.text(
        "BREAKWATER  •  SKATE HARD. STAY COOL.  •  EST. 1981",
        44,
        1.1,
        "#9abfb8",
      );
      board.position.set(0, 3.25, zside * 19.2);
      if (zside === 1) board.rotation.y = Math.PI;
      this.scene.add(board);
    }
    for (const side of [-1, 1]) {
      for (let t = 0; t < 2; t++) {
        this.box(2, 1, 22, 0x193c49, side * (22 + t * 2), t * 0.85, 0, this.scene, false);
        for (let i = 0; i < 20; i++) {
          const x = side * (22 + t * 2),
            z = (i - 9.5) * 1.0;
          const m = this.mesh(
            new THREE.CapsuleGeometry(0.24, 0.4, 2, 5),
            [0xdb7054, 0x317d81, 0xe3c789, 0x244a57][(i + t) % 4],
            false,
          );
          m.position.set(x, 0.9 + t * 0.85, z);
          this.scene.add(m);
          const head = this.mesh(new THREE.IcosahedronGeometry(0.18, 0), 0xd8ae87, false);
          head.position.set(x, 1.6 + t * 0.85, z);
          this.scene.add(head);
        }
      }
    }
    for (const x of [-22, 22])
      for (const z of [-15, 15]) {
        this.box(0.3, 12, 0.3, 0x456976, x, 4, z);
        this.box(3, 0.4, 1.4, 0xf4e6b8, x, 10, z);
        const lamp = new THREE.PointLight(0xb8f8e4, 45, 28, 2);
        lamp.position.set(x, 9, z);
        this.scene.add(lamp);
      }
    for (const side of [-1, 1]) {
      this.box(8, 0.4, 1, 0xa8865d, side * 9, 1.2, -12);
      this.box(8, 1, 0.2, 0x315764, side * 9, 1.8, -12.5);
      for (let j = 0; j < 4; j++) {
        const flag = new THREE.Group();
        flag.position.set(side * (4 + j * 3), 6.7, -19);
        this.box(1.5, 2.8, 0.07, j % 2 ? CREAM : TEAL, 0, 0, 0, flag);
        const t = this.text(
          j === 0 ? "81" : j === 1 ? "RS" : j === 2 ? "★" : "≋",
          1.3,
          0.9,
          j % 2 ? "#123b43" : "#f6f1df",
        );
        t.position.z = 0.06;
        flag.add(t);
        this.scene.add(flag);
      }
    }
    const puckDisplay = this.mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16), 0xf6c55d);
    puckDisplay.rotation.x = Math.PI / 2;
    puckDisplay.position.set(0, 5.3, -19);
    this.scene.add(puckDisplay);
    const rs = this.text("R/S", 1.4, 0.7, "#122d36");
    rs.position.set(0, 5.3, -18.8);
    this.scene.add(rs);
  }
  makeSkater(i) {
    const team = i < 2 ? 0 : 1,
      color = team === 0 ? TEAL : CORAL,
      group = new THREE.Group();
    this.scene.add(group);
    const visual = new THREE.Group();
    visual.scale.setScalar(1.17);
    group.add(visual);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.87, 24),
      new THREE.MeshBasicMaterial({
        color: 0x123b43,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);
    const body = new THREE.Group();
    body.name = "torso";
    visual.add(body);
    body.position.y = 0.98;
    this.box(1, 0.75, 0.65, CREAM, 0, 0.25, 0, body);
    this.box(1.03, 0.24, 0.68, color, 0, 0.03, 0, body);
    this.box(0.8, 0.25, 0.57, 0x153c4b, 0, -0.24, 0, body);
    const crest = this.text(i % 2 ? "1" : "9", 0.38, 0.45, team === 0 ? "#008c82" : "#ce4e40");
    crest.position.set(0, 0.31, 0.34);
    body.add(crest);
    const head = new THREE.Group();
    head.name = "head";
    head.position.set(0, 0.82, 0.01);
    body.add(head);
    const face = this.mesh(new THREE.SphereGeometry(0.34, 10, 8), i % 2 ? 0xd0a07b : 0xe9b890);
    face.scale.set(1, 1, 0.92);
    head.add(face);
    const helmet = this.mesh(
      new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      color,
    );
    helmet.position.y = 0.08;
    head.add(helmet);
    this.box(0.68, 0.12, 0.55, color, 0, 0.05, 0.15, head);
    this.box(0.53, 0.14, 0.08, 0x1a3844, 0, -0.02, 0.32, head);
    for (const x of [-0.14, 0.14])
      this.box(0.05, 0.06, 0.045, 0xf6f1df, x, -0.01, 0.37, head, false);
    const legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.name = side < 0 ? "legL" : "legR";
      leg.position.set(side * 0.29, 0.74, 0);
      visual.add(leg);
      this.box(0.35, 0.38, 0.4, 0x173c49, 0, -0.1, 0, leg);
      this.box(0.27, 0.36, 0.3, CREAM, 0, -0.4, 0, leg);
      this.box(0.29, 0.1, 0.32, color, 0, -0.34, 0, leg);
      this.box(0.35, 0.18, 0.57, 0x17323c, 0, -0.65, 0.08, leg);
      this.box(0.08, 0.08, 0.63, 0x7c9a9b, 0, -0.79, 0.08, leg);
      legs.push(leg);
    }
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.name = side < 0 ? "armL" : "armR";
      arm.position.set(side * 0.61, 1.45, 0.03);
      visual.add(arm);
      this.box(0.32, 0.48, 0.37, color, 0, -0.12, 0, arm);
      this.box(0.29, 0.28, 0.32, CREAM, 0, -0.42, 0.05, arm);
      this.box(0.35, 0.25, 0.38, 0x183f4c, 0, -0.6, 0.1, arm);
      arm.rotation.z = side * 0.25;
      arms.push(arm);
    }
    const stick = new THREE.Group();
    stick.name = "stick";
    stick.position.set(0.68, 0.86, 0.23);
    visual.add(stick);
    const shaft = this.box(0.075, 1.35, 0.075, 0xd7b87d, 0, -0.18, 0.37, stick);
    shaft.rotation.x = 0.45;
    this.box(0.65, 0.15, 0.14, 0x193a45, -0.23, -0.79, 0.7, stick);
    for (let k = 0; k < 3; k++)
      this.box(0.06, 0.16, 0.16, CREAM, -0.25 - k * 0.1, -0.79, 0.7, stick, false);
    const mixer = new THREE.AnimationMixer(visual);
    const tracks = [
      new THREE.NumberKeyframeTrack("legL.rotation[x]", [0, 0.22, 0.44], [-0.45, 0.45, -0.45]),
      new THREE.NumberKeyframeTrack("legR.rotation[x]", [0, 0.22, 0.44], [0.45, -0.45, 0.45]),
      new THREE.NumberKeyframeTrack(
        "torso.position[y]",
        [0, 0.11, 0.22, 0.33, 0.44],
        [0.98, 1.04, 0.98, 1.04, 0.98],
      ),
      new THREE.NumberKeyframeTrack("armL.rotation[x]", [0, 0.22, 0.44], [0.15, -0.3, 0.15]),
      new THREE.NumberKeyframeTrack("armR.rotation[x]", [0, 0.22, 0.44], [-0.2, 0.3, -0.2]),
    ];
    const skate = mixer.clipAction(new THREE.AnimationClip("skate", 0.44, tracks));
    skate.play();
    const shot = mixer.clipAction(
      new THREE.AnimationClip("shot", 0.27, [
        new THREE.NumberKeyframeTrack(
          "stick.rotation[y]",
          [0, 0.09, 0.18, 0.27],
          [-0.75, -1.2, 1.05, 0],
        ),
        new THREE.NumberKeyframeTrack("torso.rotation[y]", [0, 0.1, 0.27], [0, -0.3, 0]),
      ]),
    );
    shot.setLoop(THREE.LoopOnce, 1);
    shot.clampWhenFinished = false;
    const celebrate = mixer.clipAction(
      new THREE.AnimationClip("celebrate", 0.65, [
        new THREE.NumberKeyframeTrack("armL.rotation[z]", [0, 0.3, 0.65], [0.3, 2.5, 0.3]),
        new THREE.NumberKeyframeTrack("armR.rotation[z]", [0, 0.3, 0.65], [-0.3, -2.5, -0.3]),
      ]),
    );
    this.mixers.push(mixer);
    return { group, visual, skate, shot, celebrate, stick, prevX: 0, prevZ: 0, prevCheck: 0 };
  }
  makeAimLine() {
    const points = [];
    for (let i = 0; i < 10; i++) {
      points.push(new THREE.Vector3(i * 0.6, 0.08, 0), new THREE.Vector3(i * 0.6 + 0.24, 0.08, 0));
    }
    return new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xf5c552, transparent: true, opacity: 0.85 }),
    );
  }
  setTitle(on) {
    this.title = on;
  }
  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    this.renderer.setSize(innerWidth, innerHeight);
    const aspect = innerWidth / innerHeight;
    let halfW = aspect < 1 ? 24 : 25;
    let halfH = halfW / aspect;
    if (halfH < 15) {
      halfH = 15;
      halfW = halfH * aspect;
    }
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }
  worldPoint(clientX, clientY) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2((clientX / this.width) * 2 - 1, (-clientY / this.height) * 2 + 1),
      this.camera,
    );
    const v = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v);
  }
  burst(x, z, color = TEAL, count = 18, goal = false) {
    for (let i = 0; i < count; i++) {
      const m = this.mesh(
        new THREE.BoxGeometry(goal ? 0.17 : 0.08, goal ? 0.35 : 0.08, 0.08),
        color,
        false,
      );
      m.position.set(x, 0.5, z);
      this.scene.add(m);
      const ang = Math.random() * Math.PI * 2,
        sp = 2 + Math.random() * 7;
      this.particles.push({
        m,
        v: new THREE.Vector3(Math.cos(ang) * sp, 3 + Math.random() * 7, Math.sin(ang) * sp),
        life: goal ? 2.2 : 0.5,
        max: goal ? 2.2 : 0.5,
      });
    }
  }
  event(e) {
    if (e.type === "goal") {
      const team = e.team;
      for (const s of this.skaterMeshes.slice(team * 2, team * 2 + 2)) s.celebrate.reset().play();
      this.burst(team === 0 ? 16 : -16, 0, team === 0 ? TEAL : CORAL, 90, true);
      this.burst(0, 0, 0xf6c55d, 50, true);
      this.shake = 0.3;
    }
    if (e.type === "hit") {
      this.burst(e.x, e.z, CREAM, 20);
      this.shake = 0.12;
    }
    if (e.type === "bank") this.burst(e.x, e.z, 0xf6c55d, 8);
    if (e.type === "shot" || e.type === "pass") this.skaterMeshes[e.id].shot.reset().play();
  }
  update(game, dt, { localTeam = 0, input = null, attract = false } = {}) {
    this.time += dt;
    const narrow = innerWidth / innerHeight < 1;
    const desired =
      this.title && !narrow
        ? new THREE.Vector3(-13.5, 0, -0.4)
        : new THREE.Vector3(0, 0, narrow ? 1.5 : 0);
    this.target.lerp(desired, Math.min(1, dt * 3));
    let titleY = this.title ? 40 : 36,
      titleZ = this.title ? 34 : 30;
    if (this.overhead && !this.title) {
      titleY = 52;
      titleZ = 2;
    }
    if (narrow) {
      titleY = 53;
      titleZ = 42;
      if (this.title) this.target.z = 13;
    }
    const shake = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    this.camera.position.set(this.target.x + shake, titleY + shake, this.target.z + titleZ);
    this.camera.lookAt(this.target);
    this.shake = Math.max(0, this.shake - dt);
    for (let i = 0; i < 4; i++) {
      const p = game.players[i],
        s = this.skaterMeshes[i],
        dist = Math.hypot(p.x - s.prevX, p.z - s.prevZ),
        speed = dist / Math.max(dt, 0.001);
      s.group.position.set(p.x, 0, p.z);
      let diff = p.angle - s.group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      s.group.rotation.y += diff * Math.min(1, dt * 12);
      s.visual.rotation.z = THREE.MathUtils.lerp(
        s.visual.rotation.z,
        p.stun > 0 ? 1.3 : Math.max(-0.15, Math.min(0.15, p.vx * 0.012)),
        Math.min(1, dt * 14),
      );
      s.visual.position.y = THREE.MathUtils.lerp(
        s.visual.position.y,
        p.stun > 0 ? -0.45 : 0,
        Math.min(1, dt * 10),
      );
      s.skate.timeScale = Math.max(0.25, speed / 6);
      s.skate.setEffectiveWeight(p.stun > 0 ? 0 : Math.min(1, speed / 2));
      this.mixers[i].update(dt);
      s.prevX = p.x;
      s.prevZ = p.z;
      if (p.check > 1.25 && s.prevCheck < 0.5) s.shot.reset().play();
      s.prevCheck = p.check;
      if (speed > 2 && this.time % 0.09 < dt && game.phase === "play") {
        this.burst(p.x, p.z, 0xb4d9d1, 1);
      }
    }
    const b = game.puck.translation();
    this.puckMesh.position.set(b.x, 0.22, b.z);
    this.puckHalo.position.set(b.x, 0.035, b.z);
    this.puckHalo.material.opacity = 0.55 + Math.sin(this.time * 6) * 0.2;
    for (let team = 0; team < 2; team++) {
      const p = game.players[game.active[team]];
      this.selection[team].position.set(p.x, 0.045, p.z);
      this.selection[team].visible = !this.title && !attract;
      this.selection[team].rotation.z = this.time * 0.6;
    }
    const active = game.players[game.active[localTeam]],
      has = game.possession === active.id;
    this.aimLine.visible = has && !this.title && !attract;
    this.chargeRing.visible = has && active.charge > 0.05 && !attract;
    if (has) {
      let dx = localTeam === 0 ? 1 : -1,
        dz = Math.sin(active.stick * 5.5) * 0.5;
      if (input?.manual) {
        dx = input.ax;
        dz = input.az;
      }
      const a = Math.atan2(dz, dx);
      this.aimLine.position.set(active.x, 0.04, active.z);
      this.aimLine.rotation.y = -a;
      this.aimLine.scale.x = 1 + active.charge * 0.6;
      this.chargeRing.position.set(active.x, 0.055, active.z);
      this.chargeRing.scale.setScalar(1 + Math.min(0.8, active.charge) * 0.35);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.v.y -= dt * 15;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += dt * 4;
      p.m.rotation.z += dt * 3;
      p.m.scale.setScalar(Math.max(0, p.life / p.max));
      if (p.life <= 0 || p.m.position.y < 0.02) {
        this.scene.remove(p.m);
        p.m.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
  render() {
    if (!this.recovering) this.renderer.render(this.scene, this.camera);
  }
}
