// src/kart.js
// 3D Cel-Shaded Kart & Character Model, Procedural Animation, Rapier Physics & AI Controller

import * as THREE from 'three/webgpu';
import { createCelMesh, createCelMaterial } from './shaders.js';

export class Kart {
  constructor({
    index,
    driver,
    isHuman = false,
    playerIndex = 0,
    isGhost = false,
    scene,
    rapierWorld,
    RAPIER
  }) {
    this.index = index;
    this.driver = driver;
    this.isHuman = isHuman;
    this.playerIndex = playerIndex;
    this.isGhost = isGhost;
    this.scene = scene;
    this.world = rapierWorld;
    this.RAPIER = RAPIER;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.speed = 0;
    this.steerAngle = 0;

    // Hop & Drift state
    this.hopY = 0;
    this.hopVelY = 0;
    this.isDrifting = false;
    this.driftDir = 0; // -1 left, +1 right
    this.driftCharge = 0;
    this.driftTier = 0; // 0, 1 (Blue), 2 (Orange), 3 (Purple)

    // Boosts & statuses
    this.boostTimer = 0;
    this.boostStrength = 0;
    this.starTimer = 0;
    this.shrinkTimer = 0;
    this.booTimer = 0;
    this.spinOutTimer = 0;
    this.tumbleTimer = 0;
    this.rescueTimer = 0;
    this.draftTimer = 0;

    // Rocket start charge during countdown
    this.rocketCharge = 0;
    this.rocketBurnout = false;

    // Race & Battle state
    this.lap = 1;
    this.maxLaps = 3;
    this.trackT = 0;
    this.lastCheckpointT = 0;
    this.totalProgress = 0;
    this.rank = index + 1;
    this.finished = false;
    this.finishTime = 0;
    this.isWrongWay = false;
    this.wrongWayTimer = 0;
    this.offRoadFactor = 0;
    this.points = 0;

    // Items & Battle balloons
    this.heldItem = null;
    this.heldItemCharges = 0;
    this.goldenMushroomTimer = 0;
    this.rouletteTimer = 0;
    this.orbitShells = 0;
    this.balloons = 3;
    this.eliminated = false;

    // AI state
    this.aiTargetOffset = (Math.random() - 0.5) * 5.0;
    this.aiLaneTimer = 1.5 + Math.random() * 2.5;
    this.aiItemDelay = 1.0 + Math.random() * 2.0;
    this.attractCheat = false;

    // Build 3D hierarchy
    this.root = new THREE.Group();
    this.visualGroup = new THREE.Group();
    this.root.add(this.visualGroup);
    this.scene.add(this.root);

    this._buildKartMesh();
    this._initRapierBody();
  }

  _buildKartMesh() {
    const d = this.driver;
    const outline = this.isGhost ? 0 : 0.038;
    const alphaOpts = this.isGhost ? { transparent: true, opacity: 0.48 } : {};

    // Main Chassis base
    const chassisGeo = new THREE.BoxGeometry(1.55, 0.36, 2.35);
    this.chassisMesh = createCelMesh(
      chassisGeo,
      { hexColor: d.bodyColor, unique: true, ...alphaOpts },
      outline
    );
    this.chassisMesh.position.y = 0.42;
    this.visualGroup.add(this.chassisMesh);

    // Front Nose Cone
    const noseGeo = new THREE.BoxGeometry(1.15, 0.32, 0.85);
    const noseMesh = createCelMesh(
      noseGeo,
      { hexColor: d.trimColor, ...alphaOpts },
      outline
    );
    noseMesh.position.set(0, 0.45, -1.2);
    this.visualGroup.add(noseMesh);

    // Side Pontoons
    const podGeo = new THREE.BoxGeometry(0.32, 0.34, 1.3);
    const podL = createCelMesh(podGeo, { hexColor: d.trimColor, ...alphaOpts }, outline);
    podL.position.set(-0.88, 0.4, 0.05);
    const podR = createCelMesh(podGeo, { hexColor: d.trimColor, ...alphaOpts }, outline);
    podR.position.set(0.88, 0.4, 0.05);
    this.visualGroup.add(podL, podR);

    // Rear Engine Block & Dual Chrome Exhaust Pipes
    const engineGeo = new THREE.BoxGeometry(0.85, 0.55, 0.65);
    const engineMesh = createCelMesh(engineGeo, { hexColor: 0x555b66, ...alphaOpts }, outline);
    engineMesh.position.set(0, 0.68, 0.92);
    this.visualGroup.add(engineMesh);

    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.7, 8);
    pipeGeo.rotateX(Math.PI * 0.38);
    this.exhaustL = createCelMesh(pipeGeo, { hexColor: 0xcccccc, ...alphaOpts }, outline * 0.7);
    this.exhaustL.position.set(-0.34, 0.82, 1.25);
    this.exhaustR = createCelMesh(pipeGeo, { hexColor: 0xcccccc, ...alphaOpts }, outline * 0.7);
    this.exhaustR.position.set(0.34, 0.82, 1.25);
    this.visualGroup.add(this.exhaustL, this.exhaustR);

    // Boost Flame Cones behind exhausts
    const flameGeo = new THREE.ConeGeometry(0.24, 1.1, 8);
    flameGeo.rotateX(Math.PI * 0.5);
    this.flameMat = new THREE.MeshBasicNodeMaterial({ color: 0xff6600 });
    this.flameL = new THREE.Mesh(flameGeo, this.flameMat);
    this.flameL.position.set(-0.34, 0.82, 1.85);
    this.flameR = new THREE.Mesh(flameGeo, this.flameMat);
    this.flameR.position.set(0.34, 0.82, 1.85);
    this.flameL.visible = false;
    this.flameR.visible = false;
    this.visualGroup.add(this.flameL, this.flameR);

    // 4 Wheels (Front Left/Right have steering pivots)
    this.wheels = [];
    this.frontWheelPivots = [];
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.38, 8);
    hubGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      { x: -0.92, y: 0.42, z: -0.88, front: true },
      { x: 0.92, y: 0.42, z: -0.88, front: true },
      { x: -0.98, y: 0.45, z: 0.82, front: false },
      { x: 0.98, y: 0.45, z: 0.82, front: false }
    ];
    for (const wo of wheelOffsets) {
      const pivot = new THREE.Group();
      pivot.position.set(wo.x, wo.y, wo.z);
      const tire = createCelMesh(wheelGeo, { hexColor: 0x1e222a, ...alphaOpts }, outline * 0.7);
      const hub = createCelMesh(hubGeo, { hexColor: d.trimColor, ...alphaOpts }, 0);
      tire.add(hub);
      pivot.add(tire);
      this.visualGroup.add(pivot);
      this.wheels.push(tire);
      if (wo.front) this.frontWheelPivots.push(pivot);
    }

    // Driver Character Rig (Torso, Head, Hat/Crown/Horns, Arms & Steering Wheel)
    this.driverPivot = new THREE.Group();
    this.driverPivot.position.set(0, 0.6, -0.05);
    this.visualGroup.add(this.driverPivot);

    const torso = createCelMesh(
      new THREE.CylinderGeometry(0.34, 0.42, 0.7, 10),
      { hexColor: d.bodyColor, ...alphaOpts },
      outline
    );
    torso.position.y = 0.35;
    this.driverPivot.add(torso);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.92, 0);
    this.driverPivot.add(this.headGroup);

    const head = createCelMesh(
      new THREE.SphereGeometry(0.38, 12, 10),
      { hexColor: d.skinColor, ...alphaOpts },
      outline
    );
    this.headGroup.add(head);

    // Character Headgear
    if (d.hatType === 'cap') {
      const dome = createCelMesh(
        new THREE.SphereGeometry(0.4, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        { hexColor: d.hatColor, ...alphaOpts },
        outline
      );
      dome.position.y = 0.05;
      const visor = createCelMesh(
        new THREE.BoxGeometry(0.5, 0.08, 0.35),
        { hexColor: d.hatColor, ...alphaOpts },
        outline * 0.6
      );
      visor.position.set(0, 0.12, -0.34);
      this.headGroup.add(dome, visor);
    } else if (d.hatType === 'crown') {
      const crown = createCelMesh(
        new THREE.CylinderGeometry(0.28, 0.22, 0.28, 8),
        { hexColor: 0xffdd00, emissiveHex: 0xffaa00, emissiveIntensity: 0.3, ...alphaOpts },
        outline * 0.7
      );
      crown.position.y = 0.42;
      this.headGroup.add(crown);
    } else if (d.hatType === 'mushroom') {
      const cap = createCelMesh(
        new THREE.SphereGeometry(0.52, 12, 10),
        { hexColor: 0xffffff, ...alphaOpts },
        outline
      );
      cap.position.y = 0.24;
      const spotGeo = new THREE.SphereGeometry(0.16, 8, 8);
      const spot = createCelMesh(spotGeo, { hexColor: d.hatColor, ...alphaOpts }, 0);
      spot.position.set(0, 0.42, -0.36);
      this.headGroup.add(cap, spot);
    } else if (d.hatType === 'horns') {
      const hornGeo = new THREE.ConeGeometry(0.12, 0.42, 6);
      const hornL = createCelMesh(hornGeo, { hexColor: d.hatColor, ...alphaOpts }, outline * 0.6);
      hornL.position.set(-0.28, 0.42, 0);
      hornL.rotation.z = 0.45;
      const hornR = createCelMesh(hornGeo, { hexColor: d.hatColor, ...alphaOpts }, outline * 0.6);
      hornR.position.set(0.28, 0.42, 0);
      hornR.rotation.z = -0.45;
      this.headGroup.add(hornL, hornR);
    } else {
      const crest = createCelMesh(
        new THREE.BoxGeometry(0.14, 0.32, 0.55),
        { hexColor: d.hatColor, ...alphaOpts },
        outline * 0.6
      );
      crest.position.set(0, 0.38, 0.05);
      this.headGroup.add(crest);
    }

    // Steering Wheel
    this.steeringWheel = createCelMesh(
      new THREE.TorusGeometry(0.24, 0.045, 6, 12),
      { hexColor: 0x22222a, ...alphaOpts },
      0
    );
    this.steeringWheel.position.set(0, 0.85, -0.58);
    this.steeringWheel.rotation.x = -0.55;
    this.visualGroup.add(this.steeringWheel);

    // Drift Spark Spheres at Rear Wheels
    this.sparkGroup = new THREE.Group();
    this.sparkMat = new THREE.MeshBasicNodeMaterial({ color: 0x33aaff });
    const sparkGeo = new THREE.OctahedronGeometry(0.26, 0);
    this.sparkL = new THREE.Mesh(sparkGeo, this.sparkMat);
    this.sparkL.position.set(-1.05, 0.25, 0.95);
    this.sparkR = new THREE.Mesh(sparkGeo, this.sparkMat);
    this.sparkR.position.set(1.05, 0.25, 0.95);
    this.sparkGroup.add(this.sparkL, this.sparkR);
    this.sparkGroup.visible = false;
    this.visualGroup.add(this.sparkGroup);

    // Orbiting Triple Shells group
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.position.y = 0.55;
    this.orbitMeshes = [];
    const shellGeo = new THREE.SphereGeometry(0.36, 10, 8);
    for (let i = 0; i < 3; i++) {
      const sm = createCelMesh(shellGeo, { hexColor: 0x22cc44 }, 0.03);
      sm.scale.y = 0.75;
      this.orbitGroup.add(sm);
      this.orbitMeshes.push(sm);
    }
    this.visualGroup.add(this.orbitGroup);

    // Battle Mode 3 Floating Balloons
    this.balloonGroup = new THREE.Group();
    this.balloonGroup.position.set(0, 2.35, 0.65);
    this.balloonMeshes = [];
    const balGeo = new THREE.SphereGeometry(0.38, 10, 10);
    const balOffsets = [
      new THREE.Vector3(-0.48, 0.1, 0),
      new THREE.Vector3(0.48, 0.1, 0),
      new THREE.Vector3(0, 0.55, -0.15)
    ];
    for (let i = 0; i < 3; i++) {
      const bm = createCelMesh(balGeo, { hexColor: d.bodyColor, rimColor: 0xffffff }, 0.03);
      bm.position.copy(balOffsets[i]);
      this.balloonGroup.add(bm);
      this.balloonMeshes.push(bm);
    }
    this.balloonGroup.visible = false;
    this.visualGroup.add(this.balloonGroup);

    // Lakitu Rescue Rig (visible when rescuing or wrong-way)
    this.lakituGroup = new THREE.Group();
    this.lakituGroup.position.set(0, 3.6, -1.2);
    const cloud = createCelMesh(new THREE.SphereGeometry(0.55, 10, 8), { hexColor: 0xffffff }, 0.04);
    cloud.scale.set(1.4, 0.75, 1.0);
    const lakituBody = createCelMesh(new THREE.SphereGeometry(0.36, 10, 8), { hexColor: 0x22cc44 }, 0.04);
    lakituBody.position.y = 0.52;
    this.lakituGroup.add(cloud, lakituBody);
    this.lakituGroup.visible = false;
    this.root.add(this.lakituGroup);
  }

  _initRapierBody() {
    if (this.isGhost || !this.world || !this.RAPIER) return;
    const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 1, 0)
      .setLinearDamping(1.5)
      .setAngularDamping(5.0)
      .lockRotations();
    this.rigidBody = this.world.createRigidBody(bodyDesc);
    const colDesc = this.RAPIER.ColliderDesc.ball(1.05)
      .setRestitution(0.35)
      .setFriction(0.1)
      .setMass(this.driver.mass);
    this.collider = this.world.createCollider(colDesc, this.rigidBody);
  }

  destroy() {
    if (this.rigidBody && this.world) {
      try {
        this.world.removeRigidBody(this.rigidBody);
      } catch (e) {}
      this.rigidBody = null;
    }
    if (this.root && this.scene) {
      this.scene.remove(this.root);
    }
  }

  resetAtTransform(transform, isBattle = false, maxLaps = 3) {
    this.position.copy(transform.position);
    this.yaw = transform.yaw;
    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.hopY = 0;
    this.hopVelY = 0;
    this.isDrifting = false;
    this.driftDir = 0;
    this.driftCharge = 0;
    this.driftTier = 0;

    this.boostTimer = 0;
    this.boostStrength = 0;
    this.starTimer = 0;
    this.shrinkTimer = 0;
    this.booTimer = 0;
    this.spinOutTimer = 0;
    this.tumbleTimer = 0;
    this.rescueTimer = 0;
    this.draftTimer = 0;
    this.rocketCharge = 0;
    this.rocketBurnout = false;

    this.lap = 1;
    this.maxLaps = maxLaps;
    this.trackT = transform.startT || 0;
    this.lastCheckpointT = this.trackT;
    this.totalProgress = 0;
    this.finished = false;
    this.finishTime = 0;
    this.isWrongWay = false;
    this.wrongWayTimer = 0;

    this.heldItem = null;
    this.heldItemCharges = 0;
    this.goldenMushroomTimer = 0;
    this.rouletteTimer = 0;
    this.orbitShells = 0;
    this.balloons = 3;
    this.eliminated = false;
    this.balloonGroup.visible = isBattle;
    this.updateBalloonsVisual();

    if (this.rigidBody) {
      this.rigidBody.setTranslation(
        { x: this.position.x, y: this.position.y + 0.6, z: this.position.z },
        true
      );
      this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    this.syncVisuals(0, 0);
  }

  updateBalloonsVisual() {
    for (let i = 0; i < 3; i++) {
      this.balloonMeshes[i].visible = i < this.balloons;
    }
  }

  triggerBoost(duration = 1.1, strength = 15.0, audio = null) {
    this.boostTimer = Math.max(this.boostTimer, duration);
    this.boostStrength = Math.max(this.boostStrength, strength);
    this.speed = Math.max(this.speed, this.driver.topSpeed * 0.92 + strength * 0.55);
    if (this.isHuman && audio) audio.playBoost();
  }

  triggerSpinOut(duration = 1.1, isExplosion = false, audio = null, isBattle = false) {
    if (this.starTimer > 0 || this.booTimer > 0 || this.rescueTimer > 0) return;
    if (this.orbitShells > 0) {
      // Orbiting shell absorbs the hit!
      this.orbitShells--;
      if (this.isHuman && audio) audio.playShellBounce();
      return;
    }
    if (isExplosion) {
      this.tumbleTimer = duration;
    } else {
      this.spinOutTimer = duration;
    }
    this.speed *= 0.25;
    this.isDrifting = false;
    this.driftCharge = 0;
    this.driftTier = 0;

    if (isBattle && !this.eliminated) {
      this.balloons = Math.max(0, this.balloons - 1);
      this.updateBalloonsVisual();
      if (this.balloons <= 0) {
        this.eliminated = true;
      }
    }
    if (this.isHuman && audio) {
      if (isExplosion) audio.playHitExplosion();
      else audio.playSpinOut();
    }
  }

  updateCountdownInput(dt, controls, countdownTimeLeft) {
    // MK64 Rocket Start mechanic: holding accelerate starting below 1.65s gives Rocket Start;
    // holding too early (> 2.2s) overcharges and causes start burnout!
    if (controls.accel) {
      if (countdownTimeLeft > 2.25) {
        this.rocketBurnout = true;
      } else {
        this.rocketCharge += dt;
      }
    } else {
      this.rocketCharge = Math.max(0, this.rocketCharge - dt * 0.5);
    }
  }

  applyCountdownLaunch(audio) {
    if (this.rocketBurnout) {
      this.spinOutTimer = 0.85;
      if (this.isHuman && audio) audio.playSpinOut();
    } else if (this.rocketCharge > 0.45) {
      this.triggerBoost(1.25, 16.5, audio);
    }
    this.rocketCharge = 0;
    this.rocketBurnout = false;
  }

  update(dt, elapsed, controls, track, speedMult = 1.0, audio = null) {
    if (this.isGhost || this.eliminated) return;

    // Decrement active timers
    if (this.boostTimer > 0) this.boostTimer -= dt;
    if (this.starTimer > 0) this.starTimer -= dt;
    if (this.shrinkTimer > 0) this.shrinkTimer -= dt;
    if (this.booTimer > 0) this.booTimer -= dt;
    if (this.goldenMushroomTimer > 0) {
      this.goldenMushroomTimer -= dt;
      if (this.goldenMushroomTimer <= 0 && this.heldItem === 'golden_mushroom') {
        this.heldItem = null;
      }
    }
    if (this.rouletteTimer > 0) {
      this.rouletteTimer -= dt;
      if (this.rouletteTimer <= 0 && this.isHuman && audio) {
        audio.playItemLock();
      }
    }

    // Lakitu rescue state
    if (this.rescueTimer > 0) {
      this.rescueTimer -= dt;
      this.lakituGroup.visible = true;
      this.hopY = Math.sin((1.2 - this.rescueTimer) * Math.PI) * 3.0;
      if (this.rescueTimer <= 0) {
        this.hopY = 0;
        this.lakituGroup.visible = false;
      }
      this.syncVisuals(dt, elapsed);
      return;
    }

    // Spin-out or Tumble state
    if (this.spinOutTimer > 0 || this.tumbleTimer > 0) {
      if (this.spinOutTimer > 0) this.spinOutTimer -= dt;
      if (this.tumbleTimer > 0) this.tumbleTimer -= dt;
      this.speed = Math.max(0, this.speed - 28 * dt);
    } else {
      // Hop & Drift state machine
      if (controls.driftJustPressed && this.hopY <= 0.01 && Math.abs(this.speed) > 10) {
        this.hopVelY = 6.5;
        if (this.isHuman && audio) audio.playHop();
      }

      if (this.hopY > 0 || this.hopVelY > 0) {
        this.hopY += this.hopVelY * dt;
        this.hopVelY -= 26.0 * dt;
        if (this.hopY <= 0) {
          this.hopY = 0;
          this.hopVelY = 0;
          // Landed from hop: start drift if holding drift button + steering
          if (controls.driftHop && Math.abs(controls.steer) > 0.2 && this.speed > 18) {
            this.isDrifting = true;
            this.driftDir = Math.sign(controls.steer);
            this.driftCharge = 0;
            this.driftTier = 0;
          }
        }
      }

      if (this.isDrifting) {
        if (!controls.driftHop || this.speed < 14) {
          // Release drift -> trigger Mini-Turbo if charged!
          if (this.driftTier >= 1) {
            const boostDur = this.driftTier === 1 ? 0.65 : this.driftTier === 2 ? 1.1 : 1.65;
            const boostPow = this.driftTier === 1 ? 11.0 : this.driftTier === 2 ? 15.0 : 19.5;
            this.triggerBoost(boostDur, boostPow, audio);
          }
          this.isDrifting = false;
          this.driftDir = 0;
          this.driftCharge = 0;
          this.driftTier = 0;
        } else {
          // Charge Mini-Turbo sparks while drifting
          const steerMatch = controls.steer * this.driftDir > 0 ? 1.35 : 0.75;
          this.driftCharge += dt * steerMatch;
          const prevTier = this.driftTier;
          if (this.driftCharge > 2.15) this.driftTier = 3;
          else if (this.driftCharge > 1.25) this.driftTier = 2;
          else if (this.driftCharge > 0.55) this.driftTier = 1;
          if (this.driftTier > prevTier && this.isHuman && audio) {
            audio.playDriftSpark(this.driftTier);
          }
        }
      }

      // Steering
      const turnRate = this.driver.handlingRate;
      if (this.isDrifting) {
        const slideSteer = this.driftDir * 0.68 + controls.steer * 0.52;
        this.yaw -= slideSteer * turnRate * 1.12 * dt;
      } else {
        const speedTurnFactor = Math.min(1.0, Math.abs(this.speed) / 10 + 0.35);
        this.yaw -= controls.steer * turnRate * speedTurnFactor * dt;
      }
      this.steerAngle = controls.steer;

      // Top speed & Acceleration
      let maxSpd = this.driver.topSpeed * speedMult;
      if (this.shrinkTimer > 0) maxSpd *= 0.68;
      if (this.starTimer > 0) maxSpd *= 1.18;
      if (this.boostTimer > 0) maxSpd += this.boostStrength;
      if (this.offRoadFactor > 0 && this.boostTimer <= 0 && this.starTimer <= 0) {
        maxSpd *= (1.0 - this.offRoadFactor * 0.42);
      }

      if (controls.accel) {
        const accel = this.driver.accelRate * (this.boostTimer > 0 ? 2.2 : 1.0);
        if (this.speed < maxSpd) {
          this.speed = Math.min(maxSpd, this.speed + accel * dt);
        } else {
          this.speed = Math.max(maxSpd, this.speed - 18.0 * dt);
        }
      } else if (controls.brake) {
        this.speed = Math.max(-14.0, this.speed - 38.0 * dt);
      } else {
        // Natural coasting drag
        if (this.speed > 0) this.speed = Math.max(0, this.speed - 16.0 * dt);
        else if (this.speed < 0) this.speed = Math.min(0, this.speed + 16.0 * dt);
      }
    }

    // Forward movement vector
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const driftSlipAngle = this.isDrifting ? this.driftDir * 0.24 : 0;
    const moveX = -Math.sin(this.yaw + driftSlipAngle) * this.speed;
    const moveZ = -Math.cos(this.yaw + driftSlipAngle) * this.speed;

    // Step via Rapier RigidBody velocity & read back resolved X/Z
    if (this.rigidBody) {
      const curVel = this.rigidBody.linvel();
      this.rigidBody.setLinvel({ x: moveX, y: curVel.y, z: moveZ }, true);
      const rPos = this.rigidBody.translation();
      this.position.x = rPos.x;
      this.position.z = rPos.z;
    } else {
      this.position.x += moveX * dt;
      this.position.z += moveZ * dt;
    }

    // Track spline projection, elevation & off-road / Lakitu rescue check
    if (!track.isBattle) {
      const sample = track.getClosestTrackSample(this.position);
      const halfW = track.roadWidth * 0.5;
      const absLat = Math.abs(sample.lateralOffset);

      // Smoothly follow track elevation
      this.position.y = THREE.MathUtils.lerp(this.position.y, sample.point.y, Math.min(1, dt * 15));

      if (track.courseConfig.theme === 'rainbow') {
        // Rainbow Road: falling off the edge triggers Lakitu Rescue!
        if (absLat > halfW + 3.2) {
          this._triggerLakituRescue(sample, audio);
          return;
        }
        this.offRoadFactor = 0;
      } else {
        if (absLat > halfW + 16.0) {
          // Soft outer guardrail clamp
          const sign = Math.sign(sample.lateralOffset);
          const clamped = sample.point.clone().addScaledVector(sample.right, sign * (halfW + 15.8));
          this.position.x = clamped.x;
          this.position.z = clamped.z;
          this.speed *= 0.85;
        }
        this.offRoadFactor = absLat > halfW + 1.2 ? Math.min(1.0, (absLat - halfW) / 6.0) : 0;
      }

      // Check wrong-way driving
      const dotTangent = fwdX * sample.tangent.x + fwdZ * sample.tangent.z;
      if (dotTangent < -0.35 && this.speed > 5) {
        this.wrongWayTimer += dt;
        this.isWrongWay = this.wrongWayTimer > 0.65;
      } else {
        this.wrongWayTimer = 0;
        this.isWrongWay = false;
      }

      // Lap & Checkpoint progression
      const prevT = this.trackT;
      this.trackT = sample.t;
      const deltaT = this.trackT - prevT;

      if (Math.abs(this.trackT - this.lastCheckpointT) < 0.28 || (this.lastCheckpointT > 0.78 && this.trackT < 0.22)) {
        if (this.lastCheckpointT > 0.82 && this.trackT < 0.18 && deltaT < -0.5) {
          // Crossed finish line forward!
          this.lap++;
          this.lastCheckpointT = this.trackT;
          if (this.lap > this.maxLaps && !this.finished) {
            this.finished = true;
          } else if (this.isHuman && audio) {
            audio.playLapFanfare(this.lap === this.maxLaps);
          }
        } else if (this.trackT > this.lastCheckpointT) {
          this.lastCheckpointT = this.trackT;
        }
      }
      this.totalProgress = (this.lap - 1) + this.trackT;
    } else {
      // Battle Arena boundary clamp
      this.position.y = 0;
      const limit = 61.5;
      if (Math.abs(this.position.x) > limit) {
        this.position.x = Math.sign(this.position.x) * limit;
        this.speed *= 0.7;
      }
      if (Math.abs(this.position.z) > limit) {
        this.position.z = Math.sign(this.position.z) * limit;
        this.speed *= 0.7;
      }
    }

    // Keep Rapier body synced to track elevation
    if (this.rigidBody) {
      this.rigidBody.setTranslation(
        { x: this.position.x, y: this.position.y + 0.65, z: this.position.z },
        true
      );
    }

    // Check Boost Pads
    for (const pad of track.boostPads) {
      const dx = this.position.x - pad.position.x;
      const dz = this.position.z - pad.position.z;
      if (dx * dx + dz * dz < pad.radius * pad.radius) {
        this.triggerBoost(0.95, 15.5, audio);
      }
    }

    this.syncVisuals(dt, elapsed);
  }

  _triggerLakituRescue(sample, audio) {
    this.rescueTimer = 1.15;
    this.position.copy(sample.point);
    this.yaw = Math.atan2(-sample.tangent.x, -sample.tangent.z);
    this.speed = 0;
    this.isDrifting = false;
    this.driftTier = 0;
    if (this.rigidBody) {
      this.rigidBody.setTranslation(
        { x: this.position.x, y: this.position.y + 0.65, z: this.position.z },
        true
      );
      this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    if (this.isHuman && audio) audio.playSpinOut();
  }

  syncVisuals(dt, elapsed) {
    this.root.position.set(this.position.x, this.position.y + this.hopY, this.position.z);
    this.root.rotation.y = this.yaw;

    // Scale for Lightning Shrink or Hop Squash-and-Stretch
    const shrinkScale = this.shrinkTimer > 0 ? 0.56 : 1.0;
    const hopStretch = this.hopY > 0.05 ? 1.14 : 1.0;
    const hopSquash = this.hopY > 0.05 ? 0.92 : 1.0;
    this.visualGroup.scale.set(
      shrinkScale * hopSquash,
      shrinkScale * hopStretch,
      shrinkScale * hopSquash
    );

    // Spin-out & Tumble rotations + Drift body roll
    if (this.tumbleTimer > 0) {
      this.visualGroup.rotation.x = elapsed * 14.0;
      this.visualGroup.rotation.y = elapsed * 10.0;
      this.visualGroup.position.y = Math.abs(Math.sin(elapsed * 10.0)) * 2.2;
    } else if (this.spinOutTimer > 0) {
      this.visualGroup.rotation.x = 0;
      this.visualGroup.rotation.y = elapsed * 16.0;
      this.visualGroup.position.y = 0;
    } else {
      this.visualGroup.rotation.x = (this.boostTimer > 0 ? -0.06 : 0);
      this.visualGroup.rotation.y = this.isDrifting ? -this.driftDir * 0.28 : 0;
      this.visualGroup.rotation.z = -this.steerAngle * 0.12 - (this.isDrifting ? this.driftDir * 0.1 : 0);
      this.visualGroup.position.y = 0;
    }

    // Animate Wheels, Steering Wheel & Driver Lean
    const wheelSpin = this.speed * dt * 1.8;
    for (const w of this.wheels) {
      w.rotation.x -= wheelSpin;
    }
    for (const fp of this.frontWheelPivots) {
      fp.rotation.y = -this.steerAngle * 0.45;
    }
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = -this.steerAngle * 0.65;
    }
    if (this.driverPivot) {
      this.driverPivot.rotation.z = -this.steerAngle * 0.18;
      this.headGroup.rotation.y = -this.steerAngle * 0.28;
    }

    // Exhaust vibration & Boost Flames
    const boosting = this.boostTimer > 0 || this.starTimer > 0;
    this.flameL.visible = boosting;
    this.flameR.visible = boosting;
    if (boosting) {
      const fScale = 0.85 + Math.sin(elapsed * 45) * 0.25;
      this.flameL.scale.set(fScale, fScale, fScale * 1.3);
      this.flameR.scale.set(fScale, fScale, fScale * 1.3);
      this.flameMat.color.setHex(this.starTimer > 0 ? 0x00ffff : 0xff6600);
    }

    // Drift Spark visibility & Tier colors
    this.sparkGroup.visible = this.isDrifting && this.driftTier > 0;
    if (this.sparkGroup.visible) {
      const sparkColor = this.driftTier === 1 ? 0x22aaff : this.driftTier === 2 ? 0xff7700 : 0xff22ff;
      this.sparkMat.color.setHex(sparkColor);
      const sPulse = 0.8 + Math.sin(elapsed * 38) * 0.35;
      this.sparkL.scale.setScalar(sPulse);
      this.sparkR.scale.setScalar(sPulse);
    }

    // Starman Rainbow flash or Boo Ghost translucency
    if (this.starTimer > 0 && this.chassisMesh) {
      const hue = (elapsed * 2.5) % 1.0;
      this.chassisMesh.material.color.setHSL(hue, 1.0, 0.55);
    } else if (this.chassisMesh) {
      this.chassisMesh.material.color.setHex(this.driver.bodyColor);
    }

    // Orbiting Triple Shells
    for (let i = 0; i < 3; i++) {
      const m = this.orbitMeshes[i];
      m.visible = i < this.orbitShells;
      if (m.visible) {
        const ang = elapsed * 4.2 + (i * Math.PI * 2) / 3;
        m.position.set(Math.cos(ang) * 1.75, 0, Math.sin(ang) * 1.75);
      }
    }

    // Lakitu Wrong-Way hover
    if (this.isWrongWay && this.rescueTimer <= 0) {
      this.lakituGroup.visible = true;
      this.lakituGroup.position.y = 3.2 + Math.sin(elapsed * 6.0) * 0.25;
    } else if (this.rescueTimer <= 0) {
      this.lakituGroup.visible = false;
    }
  }

  computeAIControls(dt, track, allKarts, aiSkill = 0.95) {
    let steer = 0;
    let accel = true;
    let brake = false;
    let driftHop = false;
    let driftJustPressed = false;
    let useItemJustPressed = false;

    this.aiLaneTimer -= dt;
    if (this.aiLaneTimer <= 0) {
      this.aiLaneTimer = 1.8 + Math.random() * 2.5;
      this.aiTargetOffset = (Math.random() - 0.5) * (track.roadWidth * 0.45);
    }

    if (track.isBattle) {
      // Battle Mode AI: steer toward nearest living opponent kart!
      let nearest = null;
      let bestDistSq = Infinity;
      for (const other of allKarts) {
        if (other === this || other.eliminated || other.isGhost) continue;
        const dx = other.position.x - this.position.x;
        const dz = other.position.z - this.position.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          nearest = other;
        }
      }
      if (nearest) {
        const targetYaw = Math.atan2(-(nearest.position.x - this.position.x), -(nearest.position.z - this.position.z));
        let diff = targetYaw - this.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        steer = Math.max(-1, Math.min(1, -diff * 2.2));
      }
    } else {
      // Race Course AI: look ahead along the track spline
      const lookAheadT = (this.trackT + 18.0 / track.totalLength) % 1.0;
      const targetSample = track.getTrackPointAt(lookAheadT);
      const targetPt = targetSample.point.clone().addScaledVector(targetSample.right, this.aiTargetOffset);

      const dx = targetPt.x - this.position.x;
      const dz = targetPt.z - this.position.z;
      const desiredYaw = Math.atan2(-dx, -dz);
      let angleDiff = desiredYaw - this.yaw;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      steer = Math.max(-1, Math.min(1, -angleDiff * 2.6));

      // AI power-slide drifting on sharp corners!
      if (Math.abs(angleDiff) > 0.34 && this.speed > 28) {
        if (!this.isDrifting && this.hopY <= 0.01) {
          driftJustPressed = true;
        }
        driftHop = true;
      } else if (this.isDrifting && this.driftTier >= 2) {
        // Release drift to cash in Mini-Turbo!
        driftHop = false;
      } else if (this.isDrifting) {
        driftHop = Math.abs(angleDiff) > 0.15;
      }
    }

    // AI item usage
    if (this.heldItem && this.rouletteTimer <= 0) {
      this.aiItemDelay -= dt;
      if (this.aiItemDelay <= 0) {
        useItemJustPressed = true;
        this.aiItemDelay = 1.2 + Math.random() * 2.0;
      }
    }

    // Attract mode cheat: periodic automatic mini-turbos & items for spectacle!
    if (this.attractCheat && Math.random() < dt * 0.45 && this.boostTimer <= 0) {
      this.triggerBoost(0.9, 14.0, null);
    }

    return { steer, accel, brake, driftHop, driftJustPressed, useItemJustPressed };
  }
}
