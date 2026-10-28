// src/items.js
// Item Box Spawner, Roulette Logic, and 12 Active MK64 Item Projectiles & Hazards

import * as THREE from 'three/webgpu';
import { createCelMesh } from './shaders.js';
import { rollItemForRank } from './config.js';

export class ItemManager {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.itemBoxes = [];
    this.projectiles = [];
    this.explosions = [];
    this.lightningFlashTimer = 0;
  }

  clear() {
    this.itemBoxes = [];
    this.projectiles = [];
    this.explosions = [];
    this.lightningFlashTimer = 0;
    while (this.root.children.length > 0) {
      const c = this.root.children.pop();
      this.root.remove(c);
    }
  }

  spawnCourseItemBoxes(spawnPositions) {
    this.clear();
    const boxGeo = new THREE.OctahedronGeometry(1.05, 0);
    const coreGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const boxColors = [0xff3366, 0x33ccff, 0xffdd22, 0x44ee66];

    spawnPositions.forEach((pos, i) => {
      const group = new THREE.Group();
      group.position.copy(pos);

      const outer = createCelMesh(
        boxGeo,
        {
          hexColor: boxColors[i % boxColors.length],
          transparent: true,
          opacity: 0.78,
          emissiveHex: boxColors[i % boxColors.length],
          emissiveIntensity: 0.25
        },
        0.04,
        false,
        false
      );
      const inner = createCelMesh(
        coreGeo,
        { hexColor: 0xffffff, emissiveHex: 0xffff88, emissiveIntensity: 0.4 },
        0,
        false,
        false
      );
      group.add(outer, inner);
      this.root.add(group);

      this.itemBoxes.push({
        group,
        outer,
        inner,
        basePos: pos.clone(),
        respawnTimer: 0,
        phase: i * 0.65
      });
    });
  }

  useKartItem(kart, allKarts, track) {
    if (!kart.heldItem && kart.orbitShells <= 0) return;
    if (kart.rouletteTimer > 0) return;

    // If kart has orbiting triple shells, pressing Use Item fires one forward
    if (kart.orbitShells > 0 && (!kart.heldItem || kart.heldItem === 'triple_green')) {
      kart.orbitShells--;
      if (kart.orbitShells <= 0 && kart.heldItem === 'triple_green') {
        kart.heldItem = null;
      }
      this._spawnShell(kart, 'green', track, allKarts);
      if (kart.isHuman && this.audio) this.audio.playShellShoot();
      return;
    }

    const item = kart.heldItem;
    if (!item) return;

    switch (item) {
      case 'mushroom':
        kart.triggerBoost(1.3, 17.5, this.audio);
        kart.heldItem = null;
        break;

      case 'triple_mushroom':
        kart.triggerBoost(1.25, 17.0, this.audio);
        kart.heldItemCharges--;
        if (kart.heldItemCharges <= 0) {
          kart.heldItem = null;
        }
        break;

      case 'golden_mushroom':
        if (kart.goldenMushroomTimer <= 0) {
          kart.goldenMushroomTimer = 6.0;
        }
        kart.triggerBoost(1.05, 17.5, this.audio);
        break;

      case 'green_shell':
        this._spawnShell(kart, 'green', track, allKarts);
        if (kart.isHuman && this.audio) this.audio.playShellShoot();
        kart.heldItem = null;
        break;

      case 'triple_green':
        kart.orbitShells = 3;
        if (kart.isHuman && this.audio) this.audio.playItemLock();
        break;

      case 'red_shell':
        this._spawnShell(kart, 'red', track, allKarts);
        if (kart.isHuman && this.audio) this.audio.playShellShoot();
        kart.heldItem = null;
        break;

      case 'blue_shell':
        this._spawnShell(kart, 'blue', track, allKarts);
        if (kart.isHuman && this.audio) this.audio.playShellShoot();
        kart.heldItem = null;
        break;

      case 'banana':
        this._spawnHazardDrop(kart, 'banana');
        if (kart.isHuman && this.audio) this.audio.playHop();
        kart.heldItem = null;
        break;

      case 'fake_box':
        this._spawnHazardDrop(kart, 'fake_box');
        if (kart.isHuman && this.audio) this.audio.playHop();
        kart.heldItem = null;
        break;

      case 'star':
        kart.starTimer = 7.5;
        kart.triggerBoost(7.5, 10.5, this.audio);
        kart.heldItem = null;
        break;

      case 'lightning':
        this.lightningFlashTimer = 0.45;
        if (this.audio) this.audio.playLightning();
        for (const other of allKarts) {
          if (other !== kart && !other.isGhost && other.starTimer <= 0 && other.booTimer <= 0) {
            other.shrinkTimer = 7.0;
            other.triggerSpinOut(0.75, false, null, track.isBattle);
          }
        }
        kart.heldItem = null;
        break;

      case 'boo': {
        kart.booTimer = 5.5;
        // Steal an item from another racer or grant a Dash Mushroom
        let stolen = 'mushroom';
        for (const other of allKarts) {
          if (other !== kart && other.heldItem && other.heldItem !== 'boo') {
            stolen = other.heldItem;
            other.heldItem = null;
            break;
          }
        }
        kart.heldItem = stolen;
        kart.heldItemCharges = stolen === 'triple_mushroom' ? 3 : 1;
        if (kart.isHuman && this.audio) this.audio.playItemLock();
        break;
      }
    }
  }

  _spawnShell(owner, shellType, track, allKarts) {
    const fwdX = -Math.sin(owner.yaw);
    const fwdZ = -Math.cos(owner.yaw);
    const spawnPos = new THREE.Vector3(
      owner.position.x + fwdX * 2.4,
      owner.position.y + 0.55,
      owner.position.z + fwdZ * 2.4
    );

    const hex = shellType === 'green' ? 0x22cc44 : shellType === 'red' ? 0xff2222 : 0x1188ff;
    const shellGeo = new THREE.SphereGeometry(0.58, 12, 10);
    const mesh = createCelMesh(
      shellGeo,
      { hexColor: hex, emissiveHex: hex, emissiveIntensity: 0.25 },
      0.045
    );
    mesh.scale.y = 0.76;
    mesh.position.copy(spawnPos);
    this.root.add(mesh);

    // Choose target for Red or Blue shell
    let targetKart = null;
    if (shellType === 'blue') {
      targetKart = allKarts.find(k => k.rank === 1 && !k.isGhost) || null;
    } else if (shellType === 'red') {
      // Find racer immediately ahead in rank, or nearest opponent in Battle Mode
      targetKart = allKarts.find(k => k.rank === Math.max(1, owner.rank - 1) && k !== owner && !k.isGhost);
      if (!targetKart) {
        targetKart = allKarts.find(k => k !== owner && !k.isGhost && !k.eliminated) || null;
      }
    }

    const baseSpeed = shellType === 'blue' ? 74.0 : 62.0;
    this.projectiles.push({
      type: `${shellType}_shell`,
      shellType,
      owner,
      targetKart,
      mesh,
      position: spawnPos,
      velocity: new THREE.Vector3(fwdX * baseSpeed, 0, fwdZ * baseSpeed),
      speed: baseSpeed,
      trackT: owner.trackT,
      bouncesLeft: 5,
      life: 9.0,
      radius: 0.85
    });
  }

  _spawnHazardDrop(owner, dropType) {
    const backX = Math.sin(owner.yaw);
    const backZ = Math.cos(owner.yaw);
    const pos = new THREE.Vector3(
      owner.position.x + backX * 2.3,
      owner.position.y + (dropType === 'banana' ? 0.45 : 1.0),
      owner.position.z + backZ * 2.3
    );

    let mesh;
    if (dropType === 'banana') {
      const geo = new THREE.ConeGeometry(0.48, 1.05, 7);
      mesh = createCelMesh(geo, { hexColor: 0xffee11 }, 0.04);
    } else {
      const geo = new THREE.OctahedronGeometry(0.95, 0);
      mesh = createCelMesh(
        geo,
        { hexColor: 0xff2244, transparent: true, opacity: 0.82, emissiveHex: 0xff0022, emissiveIntensity: 0.35 },
        0.04
      );
    }
    mesh.position.copy(pos);
    this.root.add(mesh);

    this.projectiles.push({
      type: dropType,
      owner,
      mesh,
      position: pos,
      velocity: new THREE.Vector3(0, 0, 0),
      life: 45.0,
      radius: 1.05
    });
  }

  _spawnExplosion(pos, colorHex = 0x1199ff) {
    const geo = new THREE.SphereGeometry(1.0, 14, 12);
    const mesh = createCelMesh(
      geo,
      { hexColor: colorHex, transparent: true, opacity: 0.72, emissiveHex: colorHex, emissiveIntensity: 0.6 },
      0.05,
      false,
      false
    );
    mesh.position.copy(pos);
    this.root.add(mesh);
    this.explosions.push({ mesh, timer: 0.55, maxTimer: 0.55 });
  }

  update(dt, elapsed, karts, track, isTimeTrial = false) {
    if (this.lightningFlashTimer > 0) {
      this.lightningFlashTimer = Math.max(0, this.lightningFlashTimer - dt);
    }

    // 1. Update floating Item Boxes & check collection
    for (const ib of this.itemBoxes) {
      if (ib.respawnTimer > 0) {
        ib.respawnTimer -= dt;
        ib.group.visible = ib.respawnTimer <= 0;
        continue;
      }
      ib.group.position.y = ib.basePos.y + Math.sin(elapsed * 3.2 + ib.phase) * 0.28;
      ib.outer.rotation.y = elapsed * 1.8 + ib.phase;
      ib.outer.rotation.x = elapsed * 1.1 + ib.phase;
      ib.inner.rotation.y = -elapsed * 2.6;

      if (isTimeTrial) continue;

      for (const kart of karts) {
        if (kart.isGhost || kart.eliminated) continue;
        const dx = kart.position.x - ib.group.position.x;
        const dz = kart.position.z - ib.group.position.z;
        if (dx * dx + dz * dz < 2.25 * 2.25) {
          ib.respawnTimer = 4.0;
          ib.group.visible = false;
          if (kart.isHuman && this.audio) this.audio.playItemBoxBreak();

          if (!kart.heldItem && kart.rouletteTimer <= 0) {
            const rolled = rollItemForRank(kart.rank, karts.length, track.isBattle, isTimeTrial);
            kart.heldItem = rolled;
            kart.heldItemCharges = rolled === 'triple_mushroom' ? 3 : 1;
            kart.rouletteTimer = 1.15;
          }
          break;
        }
      }
    }

    // 2. Update active projectiles & hazards
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.root.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.type === 'fake_box') {
        p.mesh.rotation.y -= dt * 2.5;
        p.mesh.rotation.x -= dt * 1.5;
      } else if (p.shellType) {
        p.mesh.rotation.y += dt * 14.0;

        if (p.shellType === 'blue' && !track.isBattle) {
          // Blue shell follows track centerline rapidly until near 1st place target
          const target = p.targetKart;
          const distToTargetSq = target
            ? (target.position.x - p.position.x) ** 2 + (target.position.z - p.position.z) ** 2
            : Infinity;

          if (target && distToTargetSq < 22 * 22) {
            const dir = new THREE.Vector3().subVectors(target.position, p.position).normalize();
            p.velocity.set(dir.x * p.speed, 0, dir.z * p.speed);
          } else {
            p.trackT = (p.trackT + (p.speed * dt) / track.totalLength) % 1.0;
            const s = track.getTrackPointAt(p.trackT);
            p.position.set(s.point.x, s.point.y + 0.65, s.point.z);
            p.velocity.set(0, 0, 0);
          }
        } else if (p.shellType === 'red' && p.targetKart && !p.targetKart.eliminated) {
          // Red shell steers toward target kart
          const dir = new THREE.Vector3().subVectors(p.targetKart.position, p.position);
          dir.y = 0;
          if (dir.lengthSq() > 0.01) {
            dir.normalize();
            p.velocity.x = THREE.MathUtils.lerp(p.velocity.x, dir.x * p.speed, dt * 6.5);
            p.velocity.z = THREE.MathUtils.lerp(p.velocity.z, dir.z * p.speed, dt * 6.5);
          }
        }

        // Advance shell position
        p.position.x += p.velocity.x * dt;
        p.position.z += p.velocity.z * dt;

        // Keep shell at track height & bounce off road boundaries for Green Shells
        if (!track.isBattle) {
          const sample = track.getClosestTrackSample(p.position);
          p.position.y = sample.point.y + 0.55;
          const maxLat = track.roadWidth * 0.5 + 1.2;
          if (p.shellType === 'green' && Math.abs(sample.lateralOffset) > maxLat) {
            // Reflect velocity across track right normal!
            const dotR = p.velocity.x * sample.right.x + p.velocity.z * sample.right.z;
            p.velocity.x -= 2 * dotR * sample.right.x;
            p.velocity.z -= 2 * dotR * sample.right.z;
            p.bouncesLeft--;
            if (this.audio) this.audio.playShellBounce();
            if (p.bouncesLeft <= 0) p.life = 0;
          }
        } else {
          const limit = 62.0;
          if (Math.abs(p.position.x) > limit) {
            p.velocity.x *= -1;
            p.bouncesLeft--;
          }
          if (Math.abs(p.position.z) > limit) {
            p.velocity.z *= -1;
            p.bouncesLeft--;
          }
          if (p.bouncesLeft <= 0) p.life = 0;
        }
        p.mesh.position.copy(p.position);
      }

      // Check collision with Karts
      for (const kart of karts) {
        if (kart.isGhost || kart.eliminated) continue;
        // Brief grace period for owner right after firing
        if (kart === p.owner && p.life > 8.65 && p.shellType) continue;
        if (kart === p.owner && p.life > 44.4 && !p.shellType) continue;

        const dx = kart.position.x - p.position.x;
        const dz = kart.position.z - p.position.z;
        const hitRadius = p.radius + 1.05;
        if (dx * dx + dz * dz < hitRadius * hitRadius) {
          const isBigBlast = p.shellType === 'blue' || p.shellType === 'red' || p.type === 'fake_box';
          kart.triggerSpinOut(isBigBlast ? 1.35 : 1.05, isBigBlast, this.audio, track.isBattle);
          if (p.shellType === 'blue') {
            this._spawnExplosion(p.position, 0x1199ff);
          }
          this.root.remove(p.mesh);
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }

    // 3. Check Kart-to-Kart Starman & Orbiting Shell collisions + Slipstream drafting
    for (let i = 0; i < karts.length; i++) {
      const a = karts[i];
      if (a.isGhost || a.eliminated) continue;
      for (let j = i + 1; j < karts.length; j++) {
        const b = karts[j];
        if (b.isGhost || b.eliminated) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 2.35 * 2.35) {
          if (a.starTimer > 0 && b.starTimer <= 0) {
            b.triggerSpinOut(1.3, true, this.audio, track.isBattle);
          } else if (b.starTimer > 0 && a.starTimer <= 0) {
            a.triggerSpinOut(1.3, true, this.audio, track.isBattle);
          } else if (a.orbitShells > 0 && b.orbitShells <= 0) {
            a.orbitShells--;
            b.triggerSpinOut(1.0, false, this.audio, track.isBattle);
          } else if (b.orbitShells > 0 && a.orbitShells <= 0) {
            b.orbitShells--;
            a.triggerSpinOut(1.0, false, this.audio, track.isBattle);
          }
        }
      }
    }

    // 4. Animate explosion spheres
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.timer -= dt;
      if (ex.timer <= 0) {
        this.root.remove(ex.mesh);
        this.explosions.splice(i, 1);
      } else {
        const prog = 1.0 - ex.timer / ex.maxTimer;
        ex.mesh.scale.setScalar(1.0 + prog * 6.5);
      }
    }
  }
}
