// src/tracks.js
// 3D Cel-Shaded Course & Battle Arena Builder + Rapier 3D Static Colliders & Animated Hazards

import * as THREE from 'three/webgpu';
import {
  createCelMaterial,
  createCelMesh,
  createRainbowRoadMaterial,
  createBoostPadMaterial,
  createSkyDome
} from './shaders.js';

export class TrackBuilder {
  constructor(scene, rapierWorld, RAPIER) {
    this.scene = scene;
    this.world = rapierWorld;
    this.RAPIER = RAPIER;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.curve = null;
    this.trackSamples = [];
    this.roadWidth = 17.0;
    this.totalLength = 1;
    this.isBattle = false;
    this.mirror = false;
    this.courseConfig = null;

    this.skyDome = null;
    this.boostPads = [];
    this.itemBoxSpawns = [];
    this.hazards = [];
    this.animatedProps = [];
    this.colliders = [];
    this.startTransforms = [];
  }

  clear() {
    for (const c of this.colliders) {
      try {
        this.world.removeCollider(c, true);
      } catch (e) {}
    }
    this.colliders = [];
    this.boostPads = [];
    this.itemBoxSpawns = [];
    this.hazards = [];
    this.animatedProps = [];
    this.startTransforms = [];
    this.trackSamples = [];

    while (this.root.children.length > 0) {
      const child = this.root.children.pop();
      this.root.remove(child);
    }
  }

  buildCourse(courseConfig, mirror = false) {
    this.clear();
    this.courseConfig = courseConfig;
    this.mirror = mirror;
    this.isBattle = courseConfig.mode === 'battle';

    // Skybox dome (follows active viewport camera during split-screen render)
    this.skyDome = createSkyDome(
      courseConfig.skyTop,
      courseConfig.skyBottom,
      courseConfig.theme === 'rainbow'
    );
    this.root.add(this.skyDome);

    if (this.isBattle) {
      this._buildBattleArena(courseConfig);
    } else {
      this._buildRaceTrack(courseConfig, mirror);
    }
  }

  _getControlPoints(courseId, mirror) {
    const m = mirror ? -1 : 1;
    if (courseId === 'sunny_circuit') {
      return [
        new THREE.Vector3(0 * m, 0, 0),
        new THREE.Vector3(0 * m, 0, -95),
        new THREE.Vector3(45 * m, 2.5, -165),
        new THREE.Vector3(135 * m, 4.0, -170),
        new THREE.Vector3(190 * m, 1.5, -110),
        new THREE.Vector3(165 * m, 0, -35),
        new THREE.Vector3(95 * m, 0, -10),
        new THREE.Vector3(115 * m, 3.5, 65),
        new THREE.Vector3(185 * m, 6.0, 125),
        new THREE.Vector3(135 * m, 2.5, 195),
        new THREE.Vector3(40 * m, 0, 185),
        new THREE.Vector3(-10 * m, 0, 105)
      ];
    } else if (courseId === 'koopa_cove') {
      return [
        new THREE.Vector3(0 * m, 0, 0),
        new THREE.Vector3(0 * m, 0, -105),
        new THREE.Vector3(-65 * m, 4.5, -175),
        new THREE.Vector3(-155 * m, 9.0, -150),
        new THREE.Vector3(-195 * m, 6.0, -55),
        new THREE.Vector3(-135 * m, 2.0, 15),
        new THREE.Vector3(-175 * m, 5.5, 105),
        new THREE.Vector3(-115 * m, 8.5, 185),
        new THREE.Vector3(-20 * m, 3.0, 175),
        new THREE.Vector3(20 * m, 0, 95)
      ];
    } else {
      // rainbow_road
      return [
        new THREE.Vector3(0 * m, 0, 0),
        new THREE.Vector3(0 * m, 5.0, -110),
        new THREE.Vector3(75 * m, 14.0, -190),
        new THREE.Vector3(175 * m, 8.0, -145),
        new THREE.Vector3(210 * m, -3.0, -35),
        new THREE.Vector3(135 * m, 6.0, 45),
        new THREE.Vector3(170 * m, 15.0, 145),
        new THREE.Vector3(85 * m, 9.0, 210),
        new THREE.Vector3(-15 * m, 2.0, 155),
        new THREE.Vector3(-5 * m, 0, 75)
      ];
    }
  }

  _buildRaceTrack(cfg, mirror) {
    this.roadWidth = cfg.id === 'rainbow_road' ? 15.5 : 17.5;
    const pts = this._getControlPoints(cfg.id, mirror);
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    this.totalLength = this.curve.getLength();

    const segments = 320;
    const halfW = this.roadWidth * 0.5;
    const kerbW = 1.65;

    // Sample spline frames
    this.trackSamples = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();
      this.trackSamples.push({ t, point, tangent, right, normal });
    }

    // Build road surface ribbon geometry + kerb ribbons
    const roadPositions = [];
    const roadNormals = [];
    const roadUVs = [];
    const roadIndices = [];

    const kerbPositions = [];
    const kerbColors = [];
    const kerbIndices = [];
    const colA = new THREE.Color(cfg.kerbColorA);
    const colB = new THREE.Color(cfg.kerbColorB);

    for (let i = 0; i <= segments; i++) {
      const s = this.trackSamples[i];
      const pL = s.point.clone().addScaledVector(s.right, -halfW);
      const pR = s.point.clone().addScaledVector(s.right, halfW);

      roadPositions.push(pL.x, pL.y, pL.z, pR.x, pR.y, pR.z);
      roadNormals.push(0, 1, 0, 0, 1, 0);
      roadUVs.push(0, i * 0.25, 1, i * 0.25);

      // Left & right kerbs
      const kLOut = s.point.clone().addScaledVector(s.right, -(halfW + kerbW));
      const kROut = s.point.clone().addScaledVector(s.right, halfW + kerbW);
      kerbPositions.push(
         kLOut.x, kLOut.y + 0.08, kLOut.z,
        pL.x, pL.y + 0.08, pL.z,
        pR.x, pR.y + 0.08, pR.z,
        kROut.x, kROut.y + 0.08, kROut.z
      );
      const c = i % 2 === 0 ? colA : colB;
      for (let k = 0; k < 4; k++) {
        kerbColors.push(c.r, c.g, c.b);
      }

      if (i < segments) {
        const base = i * 2;
        roadIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);

        const kb = i * 4;
        // Left kerb quad
        kerbIndices.push(kb, kb + 1, kb + 4, kb + 1, kb + 5, kb + 4);
        // Right kerb quad
        kerbIndices.push(kb + 2, kb + 3, kb + 6, kb + 3, kb + 7, kb + 6);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
    roadGeo.setIndex(roadIndices);

    const roadMat = cfg.theme === 'rainbow'
      ? createRainbowRoadMaterial()
      : createCelMaterial({ hexColor: cfg.roadColor, rimStrength: 0.08, side: THREE.DoubleSide });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.root.add(roadMesh);

    const kerbGeo = new THREE.BufferGeometry();
    kerbGeo.setAttribute('position', new THREE.Float32BufferAttribute(kerbPositions, 3));
    kerbGeo.setAttribute('color', new THREE.Float32BufferAttribute(kerbColors, 3));
    kerbGeo.computeVertexNormals();
    kerbGeo.setIndex(kerbIndices);
    const kerbMat = new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const kerbMesh = new THREE.Mesh(kerbGeo, kerbMat);
    this.root.add(kerbMesh);

    // Ground plane (except on Rainbow Road where space is below)
    if (cfg.theme !== 'rainbow') {
      const groundGeo = new THREE.PlaneGeometry(1200, 1200);
      groundGeo.rotateX(-Math.PI / 2);
      const groundMat = createCelMaterial({ hexColor: cfg.groundColor, rimStrength: 0.0 });
      const groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.position.y = -0.35;
      groundMesh.receiveShadow = true;
      this.root.add(groundMesh);

      // Static ground collider in Rapier
      const groundColDesc = this.RAPIER.ColliderDesc.cuboid(600, 0.5, 600).setTranslation(0, -0.85, 0);
      this.colliders.push(this.world.createCollider(groundColDesc));
    }

    // Starting Grid & Finish Line Arch at t = 0
    this._buildStartFinishGate(this.trackSamples[0]);

    // Compute 8 starting grid positions behind the line
    for (let idx = 0; idx < 8; idx++) {
      const row = Math.floor(idx / 2);
      const col = idx % 2 === 0 ? -1 : 1;
      const startT = (1.0 - (row * 5.8 + 4.5) / this.totalLength) % 1.0;
      const sample = this.getTrackPointAt(startT);
      const pos = sample.point.clone().addScaledVector(sample.right, col * 3.4);
      pos.y += 0.5;
      const yaw = Math.atan2(-sample.tangent.x, -sample.tangent.z);
      this.startTransforms.push({ position: pos, yaw, startT });
    }

    // Add Boost Pads along the track
    const boostFractions = [0.12, 0.28, 0.48, 0.68, 0.86];
    const boostMat = createBoostPadMaterial();
    const boostGeo = new THREE.PlaneGeometry(5.2, 7.5);
    boostGeo.rotateX(-Math.PI / 2);
    for (const bf of boostFractions) {
      const s = this.getTrackPointAt(bf);
      const sideOffset = ((Math.round(bf * 100) % 2 === 0) ? 1 : -1) * 2.8;
      const padPos = s.point.clone().addScaledVector(s.right, sideOffset);
      padPos.y += 0.12;
      const padMesh = new THREE.Mesh(boostGeo, boostMat);
      padMesh.position.copy(padPos);
      padMesh.rotation.y = Math.atan2(-s.tangent.x, -s.tangent.z);
      this.root.add(padMesh);
      this.boostPads.push({ position: padPos, radius: 4.5 });
    }

    // Add Item Box rows along the track
    const itemBoxFractions = [0.09, 0.24, 0.42, 0.61, 0.79, 0.93];
    for (const ibf of itemBoxFractions) {
      const s = this.getTrackPointAt(ibf);
      for (const offset of [-5.2, -1.75, 1.75, 5.2]) {
        const pos = s.point.clone().addScaledVector(s.right, offset);
        pos.y += 1.55;
        this.itemBoxSpawns.push(pos);
      }
    }

    // Add Trackside Guardrails, Scenery & Course-Specific Landmarks
    this._populateTrackScenery(cfg);
  }

  _buildStartFinishGate(sample0) {
    const halfW = this.roadWidth * 0.5;
    const gateGroup = new THREE.Group();
    gateGroup.position.copy(sample0.point);
    gateGroup.rotation.y = Math.atan2(-sample0.tangent.x, -sample0.tangent.z);

    // Checkered finish strip
    const tileCount = 12;
    const tileW = this.roadWidth / tileCount;
    const tileGeo = new THREE.BoxGeometry(tileW, 0.08, 1.4);
    const whiteMat = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
    const blackMat = new THREE.MeshBasicNodeMaterial({ color: 0x111118 });
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < tileCount; c++) {
        const tile = new THREE.Mesh(tileGeo, (r + c) % 2 === 0 ? whiteMat : blackMat);
        tile.position.set(-halfW + tileW * (c + 0.5), 0.06, (r - 0.5) * 1.4);
        gateGroup.add(tile);
      }
    }

    // Left & Right Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.85, 1.05, 10.5, 12);
    const pillarL = createCelMesh(pillarGeo, { hexColor: 0xff2222 }, 0.06);
    pillarL.position.set(-(halfW + 1.8), 5.25, 0);
    const pillarR = createCelMesh(pillarGeo, { hexColor: 0xff2222 }, 0.06);
    pillarR.position.set(halfW + 1.8, 5.25, 0);
    gateGroup.add(pillarL, pillarR);

    // Top Banner Arch
    const bannerGeo = new THREE.BoxGeometry(this.roadWidth + 5.2, 2.6, 1.2);
    const banner = createCelMesh(bannerGeo, { hexColor: 0xffdd00, rimColor: 0xffffff }, 0.07);
    banner.position.set(0, 10.2, 0);
    gateGroup.add(banner);

    this.root.add(gateGroup);
  }

  _populateTrackScenery(cfg) {
    const halfW = this.roadWidth * 0.5;
    // Place periodic posts / trees / castles / star arches along the spline
    const totalSamples = this.trackSamples.length - 1;
    for (let i = 6; i < totalSamples; i += 8) {
      const s = this.trackSamples[i];
      const side = (i % 16 === 6) ? -1 : 1;

      if (cfg.theme === 'sunny') {
        // Cel-shaded Mushroom Trees & Warp Pipes
        const treePos = s.point.clone().addScaledVector(s.right, side * (halfW + 9 + (i % 5) * 2));
        this._addToonTree(treePos, 1.0 + (i % 3) * 0.25);

        if (i % 32 === 6) {
          // Green N64 Warp Pipe obstacle near outer shoulder
          const pipePos = s.point.clone().addScaledVector(s.right, -side * (halfW - 2.2));
          this._addWarpPipe(pipePos);
        }
        if (i === 46 || i === 190) {
          // Grandstand on straightaways
          const standPos = s.point.clone().addScaledVector(s.right, side * (halfW + 15));
          const yaw = Math.atan2(-s.tangent.x, -s.tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
          this._addGrandstand(standPos, yaw);
        }
      } else if (cfg.theme === 'castle') {
        // Castle torches, stone pillars, and animated Crushing Thwomps!
        const turretPos = s.point.clone().addScaledVector(s.right, side * (halfW + 8));
        this._addCastleTower(turretPos);

        if (i % 40 === 14) {
          // Animated Crushing Thwomp over the track!
          const laneOffset = ((i / 8) % 3 - 1) * 3.8;
          const thwompPos = s.point.clone().addScaledVector(s.right, laneOffset);
          const yaw = Math.atan2(-s.tangent.x, -s.tangent.z);
          this._addThwompHazard(thwompPos, yaw, i * 0.37);
        }
      } else if (cfg.theme === 'rainbow') {
        // Neon Star Rings & Floating Space Crystals
        if (i % 24 === 6) {
          const yaw = Math.atan2(-s.tangent.x, -s.tangent.z);
          this._addStarArch(s.point, yaw, i);
        }
      }
    }
  }

  _addToonTree(pos, scale = 1.0) {
    const g = new THREE.Group();
    g.position.copy(pos);
    const trunk = createCelMesh(
      new THREE.CylinderGeometry(0.6 * scale, 0.9 * scale, 4.0 * scale, 8),
      { hexColor: 0x8b5a2b },
      0.05
    );
    trunk.position.y = 2.0 * scale;
    const crown1 = createCelMesh(
      new THREE.SphereGeometry(2.8 * scale, 10, 8),
      { hexColor: 0x22cc44 },
      0.06
    );
    crown1.position.y = 5.0 * scale;
    const crown2 = createCelMesh(
      new THREE.SphereGeometry(2.0 * scale, 10, 8),
      { hexColor: 0x44ee55 },
      0.05
    );
    crown2.position.set(0.8 * scale, 6.8 * scale, 0.4 * scale);
    g.add(trunk, crown1, crown2);
    this.root.add(g);
    this.animatedProps.push({ mesh: g, type: 'sway', phase: pos.x * 0.1 + pos.z * 0.1 });
  }

  _addWarpPipe(pos) {
    const g = new THREE.Group();
    g.position.copy(pos);
    const body = createCelMesh(
      new THREE.CylinderGeometry(1.35, 1.35, 3.2, 12),
      { hexColor: 0x11bb33 },
      0.06
    );
    body.position.y = 1.6;
    const lip = createCelMesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.8, 12),
      { hexColor: 0x22dd44 },
      0.06
    );
    lip.position.y = 3.0;
    g.add(body, lip);
    this.root.add(g);

    // Rapier static cylinder/cuboid collider + hazard entry
    const colDesc = this.RAPIER.ColliderDesc.cylinder(1.6, 1.45).setTranslation(pos.x, pos.y + 1.6, pos.z);
    this.colliders.push(this.world.createCollider(colDesc));
    this.hazards.push({ type: 'pipe', position: pos.clone(), radius: 1.9, height: 3.4 });
  }

  _addGrandstand(pos, yaw) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = yaw;
    const colors = [0xff3333, 0x2266ff, 0xffdd22];
    for (let step = 0; step < 3; step++) {
      const tier = createCelMesh(
        new THREE.BoxGeometry(24, 2.2 * (step + 1), 3.2),
        { hexColor: colors[step] },
        0.06
      );
      tier.position.set(0, 1.1 * (step + 1), -step * 3.2);
      g.add(tier);
    }
    const roof = createCelMesh(
      new THREE.BoxGeometry(25, 0.8, 11),
      { hexColor: 0xffffff },
      0.06
    );
    roof.position.set(0, 9.2, -3.2);
    g.add(roof);
    this.root.add(g);
  }

  _addCastleTower(pos) {
    const g = new THREE.Group();
    g.position.copy(pos);
    const tower = createCelMesh(
      new THREE.CylinderGeometry(2.5, 2.9, 9.0, 8),
      { hexColor: 0x6b5b53 },
      0.06
    );
    tower.position.y = 4.5;
    const cone = createCelMesh(
      new THREE.ConeGeometry(3.2, 4.0, 8),
      { hexColor: 0xcc2200, emissiveHex: 0xff4400, emissiveIntensity: 0.25 },
      0.06
    );
    cone.position.y = 11.0;
    g.add(tower, cone);
    this.root.add(g);
  }

  _addThwompHazard(basePos, yaw, phase) {
    const g = new THREE.Group();
    g.position.copy(basePos);
    g.rotation.y = yaw;

    const body = createCelMesh(
      new THREE.BoxGeometry(3.4, 3.8, 2.2),
      { hexColor: 0x708090, rimColor: 0xaaccff },
      0.08
    );
    // Angry cel-shaded eyes
    const eyeGeo = new THREE.BoxGeometry(0.7, 0.45, 0.2);
    const eyeMat = new THREE.MeshBasicNodeMaterial({ color: 0xff2200 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.7, 0.4, 1.12);
    eyeL.rotation.z = -0.25;
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.7, 0.4, 1.12);
    eyeR.rotation.z = 0.25;
    body.add(eyeL, eyeR);
    g.add(body);

    this.root.add(g);
    this.hazards.push({
      type: 'thwomp',
      mesh: g,
      basePos: basePos.clone(),
      position: basePos.clone(),
      phase,
      radius: 2.35,
      isDown: false
    });
  }

  _addStarArch(pos, yaw, seed) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = yaw;
    const torusGeo = new THREE.TorusGeometry(this.roadWidth * 0.58, 0.55, 8, 20, Math.PI);
    const archColors = [0x00ffff, 0xff33ff, 0xffee00];
    const arch = createCelMesh(
      torusGeo,
      { hexColor: archColors[seed % archColors.length], emissiveHex: archColors[seed % archColors.length], emissiveIntensity: 0.45 },
      0.06
    );
    g.add(arch);
    this.root.add(g);
  }

  _buildBattleArena(cfg) {
    // Block Fort Donut 64 Battle Arena (130 x 130 walled arena with 4 colored forts!)
    const arenaSize = 130;
    const half = arenaSize * 0.5;
    this.roadWidth = arenaSize;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(
      floorGeo,
      createCelMaterial({ hexColor: cfg.roadColor, rimStrength: 0.05 })
    );
    floorMesh.receiveShadow = true;
    this.root.add(floorMesh);

    const groundCol = this.RAPIER.ColliderDesc.cuboid(half, 0.5, half).setTranslation(0, -0.5, 0);
    this.colliders.push(this.world.createCollider(groundCol));

    // Outer perimeter walls
    const wallHeight = 7.0;
    const wallConfigs = [
      { x: 0, z: -half, w: arenaSize, d: 3 },
      { x: 0, z: half, w: arenaSize, d: 3 },
      { x: -half, z: 0, w: 3, d: arenaSize },
      { x: half, z: 0, w: 3, d: arenaSize }
    ];
    for (const wc of wallConfigs) {
      const wMesh = createCelMesh(
        new THREE.BoxGeometry(wc.w, wallHeight, wc.d),
        { hexColor: 0xfacc15 },
        0.07
      );
      wMesh.position.set(wc.x, wallHeight * 0.5, wc.z);
      this.root.add(wMesh);

      const colDesc = this.RAPIER.ColliderDesc.cuboid(wc.w * 0.5, wallHeight * 0.5, wc.d * 0.5)
        .setTranslation(wc.x, wallHeight * 0.5, wc.z);
      this.colliders.push(this.world.createCollider(colDesc));
    }

    // 4 Colored Block Forts in the 4 quadrants
    const forts = [
      { x: -28, z: -28, color: 0xff3333 },
      { x: 28, z: -28, color: 0x2266ff },
      { x: -28, z: 28, color: 0x22cc44 },
      { x: 28, z: 28, color: 0xffcc00 }
    ];
    for (const f of forts) {
      const fortMesh = createCelMesh(
        new THREE.BoxGeometry(20, 6.0, 20),
        { hexColor: f.color },
        0.08
      );
      fortMesh.position.set(f.x, 3.0, f.z);
      this.root.add(fortMesh);

      const colDesc = this.RAPIER.ColliderDesc.cuboid(10, 3.0, 10).setTranslation(f.x, 3.0, f.z);
      this.colliders.push(this.world.createCollider(colDesc));
      this.hazards.push({ type: 'fort_pillar', position: new THREE.Vector3(f.x, 0, f.z), halfExtent: 10.5 });
    }

    // Central Donut Ring Bumper
    const centerPillar = createCelMesh(
      new THREE.CylinderGeometry(8, 9, 5.5, 16),
      { hexColor: 0xff5522 },
      0.08
    );
    centerPillar.position.set(0, 2.75, 0);
    this.root.add(centerPillar);
    this.colliders.push(
      this.world.createCollider(this.RAPIER.ColliderDesc.cylinder(2.75, 8.5).setTranslation(0, 2.75, 0))
    );
    this.hazards.push({ type: 'pipe', position: new THREE.Vector3(0, 0, 0), radius: 9.0, height: 5.5 });

    // 8 Spawn positions around the arena lanes
    const spawnCoords = [
      { x: 0, z: -48, yaw: Math.PI },
      { x: 0, z: 48, yaw: 0 },
      { x: -48, z: 0, yaw: -Math.PI / 2 },
      { x: 48, z: 0, yaw: Math.PI / 2 },
      { x: -48, z: -48, yaw: -Math.PI * 0.75 },
      { x: 48, z: -48, yaw: Math.PI * 0.75 },
      { x: -48, z: 48, yaw: -Math.PI * 0.25 },
      { x: 48, z: 48, yaw: Math.PI * 0.25 }
    ];
    for (const sc of spawnCoords) {
      this.startTransforms.push({
        position: new THREE.Vector3(sc.x, 0.5, sc.z),
        yaw: sc.yaw,
        startT: 0
      });
    }

    // 16 Item Box spawns in Battle Arena
    const boxRing = [
      [0, -28], [0, 28], [-28, 0], [28, 0],
      [-48, -24], [48, -24], [-48, 24], [48, 24],
      [-24, -48], [24, -48], [-24, 48], [24, 48],
      [-14, -14], [14, -14], [-14, 14], [14, 14]
    ];
    for (const [bx, bz] of boxRing) {
      this.itemBoxSpawns.push(new THREE.Vector3(bx, 1.55, bz));
    }

    // 4 Boost pads in outer lanes
    const boostMat = createBoostPadMaterial();
    const boostGeo = new THREE.PlaneGeometry(5, 7);
    boostGeo.rotateX(-Math.PI / 2);
    for (const [px, pz, pyaw] of [[0, -54, Math.PI / 2], [0, 54, Math.PI / 2], [-54, 0, 0], [54, 0, 0]]) {
      const pPos = new THREE.Vector3(px, 0.1, pz);
      const pm = new THREE.Mesh(boostGeo, boostMat);
      pm.position.copy(pPos);
      pm.rotation.y = pyaw;
      this.root.add(pm);
      this.boostPads.push({ position: pPos, radius: 4.5 });
    }
  }

  getTrackPointAt(t) {
    if (this.isBattle || !this.curve) {
      return {
        t: 0,
        point: new THREE.Vector3(0, 0, 0),
        tangent: new THREE.Vector3(0, 0, -1),
        right: new THREE.Vector3(1, 0, 0),
        normal: new THREE.Vector3(0, 1, 0)
      };
    }
    const wrappedT = ((t % 1.0) + 1.0) % 1.0;
    const idx = Math.min(
      this.trackSamples.length - 1,
      Math.floor(wrappedT * (this.trackSamples.length - 1))
    );
    return this.trackSamples[idx];
  }

  getClosestTrackSample(worldPos) {
    if (this.isBattle || this.trackSamples.length === 0) {
      return {
        t: 0,
        point: new THREE.Vector3(worldPos.x, 0, worldPos.z),
        tangent: new THREE.Vector3(0, 0, -1),
        right: new THREE.Vector3(1, 0, 0),
        lateralOffset: 0,
        distSq: 0
      };
    }
    let bestIdx = 0;
    let bestDistSq = Infinity;
    for (let i = 0; i < this.trackSamples.length; i++) {
      const p = this.trackSamples[i].point;
      const dx = worldPos.x - p.x;
      const dz = worldPos.z - p.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }
    const sample = this.trackSamples[bestIdx];
    const rel = new THREE.Vector3().subVectors(worldPos, sample.point);
    const lateralOffset = rel.dot(sample.right);
    return {
      ...sample,
      lateralOffset,
      distSq: bestDistSq
    };
  }

  update(dt, elapsed, karts, audio) {
    // Animate swaying trees
    for (const prop of this.animatedProps) {
      if (prop.type === 'sway') {
        prop.mesh.rotation.z = Math.sin(elapsed * 2.2 + prop.phase) * 0.05;
      }
    }

    // Animate Thwomps & check hazard collisions
    for (const h of this.hazards) {
      if (h.type === 'thwomp') {
        const cycle = (elapsed * 1.3 + h.phase) % 4.0;
        let heightOffset = 8.5;
        if (cycle < 0.35) {
          // Slam down!
          heightOffset = Math.max(1.9, 8.5 - (cycle / 0.35) * 6.6);
        } else if (cycle < 1.25) {
          // Resting on road
          heightOffset = 1.9;
        } else if (cycle < 2.8) {
          // Rising back up
          heightOffset = 1.9 + ((cycle - 1.25) / 1.55) * 6.6;
        }
        h.isDown = heightOffset < 3.6;
        h.mesh.position.y = h.basePos.y + heightOffset;
        h.position.copy(h.mesh.position);
      }

      // Check collision against karts
      for (const kart of karts) {
        if (kart.isGhost) continue;
        const dx = kart.position.x - h.position.x;
        const dz = kart.position.z - h.position.z;
        if (h.type === 'thwomp' && h.isDown) {
          if (dx * dx + dz * dz < (h.radius + 1.1) ** 2) {
            if (kart.starTimer <= 0 && kart.spinOutTimer <= 0) {
              kart.triggerSpinOut(1.3, true);
              if (kart.isHuman && audio) audio.playHitExplosion();
            }
          }
        } else if (h.type === 'pipe') {
          const distSq = dx * dx + dz * dz;
          const minR = h.radius + 1.15;
          if (distSq < minR * minR && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const nz = dz / dist;
            kart.position.x = h.position.x + nx * minR;
            kart.position.z = h.position.z + nz * minR;
            kart.speed *= 0.65;
          }
        } else if (h.type === 'fort_pillar') {
          const extent = h.halfExtent + 1.1;
          if (Math.abs(dx) < extent && Math.abs(dz) < extent) {
            if (Math.abs(dx) > Math.abs(dz)) {
              kart.position.x = h.position.x + Math.sign(dx) * extent;
            } else {
              kart.position.z = h.position.z + Math.sign(dz) * extent;
            }
            kart.speed *= 0.6;
          }
        }
      }
    }
  }
}
