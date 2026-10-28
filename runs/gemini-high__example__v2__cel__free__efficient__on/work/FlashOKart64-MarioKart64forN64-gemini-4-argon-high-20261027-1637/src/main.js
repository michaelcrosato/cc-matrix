// src/main.js
// Core WebGPU Engine, Split-Screen Orchestrator, Attract Mode Director, Ghost System & State Machine

import * as THREE from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';
import { ENGINE_CLASSES, DRIVERS, COURSES } from './config.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { createCelMesh } from './shaders.js';
import { TrackBuilder } from './tracks.js';
import { Kart } from './kart.js';
import { ItemManager } from './items.js';
import { UIManager } from './ui.js';

export class FlashOKartApp {
  constructor() {
    this.settings = {
      invertHorizontal: false,
      invertVertical: false,
      masterVolume: 0.8,
      musicVolume: 0.55,
      sfxVolume: 0.85,
      splitVertical2P: false
    };

    this.sessionConfig = {
      mode: 'gp', // 'gp', 'vs', 'tt', 'battle'
      numPlayers: 1,
      classIndex: 1, // 100cc
      driverIndex: 0, // Captain Flash
      courseIndex: 0 // Flash Raceway 64
    };

    this.state = 'title'; // 'title', 'setup', 'attract', 'racing', 'paused', 'results', 'cup_ceremony'
    this.elapsed = 0;
    this.raceTime = 0;
    this.countdownTimer = 3.2;
    this.lastBeepSecond = 4;

    this.karts = [];
    this.humanKarts = [];
    this.ghostKart = null;
    this.currentGhostRecording = [];
    this.bestGhostRecordings = {}; // keyed by courseId

    this.cameras = [];
    this.viewports = [];
    this.podiumGroup = null;

    // Attract mode camera cycling
    this.attractTimer = 0;
    this.attractCamMode = 0;

    this.audio = new AudioManager();
    this.input = new InputManager(this.settings);
    this.ui = null;
  }

  async init() {
    // Enforce WebGPU with no fallback as required by TASK.md
    if (!navigator.gpu) {
      document.body.innerHTML = `
        <div style="color:#fff;background:#111;padding:40px;font-family:sans-serif;text-align:center;">
          <h1>WebGPU Required (No Fallback)</h1>
          <p>This build of Flash-O-Kart 64 requires Three.js R180 WebGPURenderer with native WebGPU support.</p>
        </div>`;
      throw new Error('WebGPU not supported on this browser.');
    }

    await RAPIER.init({});
    this.RAPIER = RAPIER;
    this.rapierWorld = new RAPIER.World({ x: 0, y: -24.0, z: 0 });

    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
      forceWebGL: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = false;
    await this.renderer.init();

    this.scene = new THREE.Scene();
    // Important: scene.background is kept null so WebGPU multi-viewport split-screen
    // does not trigger a full-attachment loadOp clear on subsequent viewports!
    this.scene.background = null;

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x334466, 1.15);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff6e5, 2.2);
    this.sunLight.position.set(85, 140, 65);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    const d = 180;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Subsystems
    this.track = new TrackBuilder(this.scene, this.rapierWorld, this.RAPIER);
    this.items = new ItemManager(this.scene, this.audio);
    this.ui = new UIManager(this);

    // Create 4 viewport cameras
    for (let i = 0; i < 4; i++) {
      const cam = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 1100);
      this.cameras.push(cam);
    }

    window.addEventListener('resize', () => this.onResize());

    // Build initial title background showcase course
    this._setupTitleShowcase();
    this.audio.startMusic('title', 1.0);

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  onResize() {
    if (!this.renderer) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this._updateViewportLayout();
  }

  _clearKarts() {
    for (const k of this.karts) k.destroy();
    this.karts = [];
    this.humanKarts = [];
    if (this.ghostKart) {
      this.ghostKart.destroy();
      this.ghostKart = null;
    }
    if (this.podiumGroup) {
      this.scene.remove(this.podiumGroup);
      this.podiumGroup = null;
    }
  }

  _setupTitleShowcase() {
    this._clearKarts();
    const course = COURSES[0];
    this.track.buildCourse(course, false);
    this.items.spawnCourseItemBoxes(this.track.itemBoxSpawns);

    // Spawn 8 AI demo karts driving around the circuit in the background of the Title Screen
    for (let i = 0; i < 8; i++) {
      const kart = new Kart({
        index: i,
        driver: DRIVERS[i % DRIVERS.length],
        isHuman: false,
        playerIndex: i,
        scene: this.scene,
        rapierWorld: this.rapierWorld,
        RAPIER: this.RAPIER
      });
      kart.resetAtTransform(this.track.startTransforms[i], false, 99);
      kart.attractCheat = true;
      this.karts.push(kart);
    }
    this._updateViewportLayout(1);
    document.getElementById('hud-layer').classList.add('hidden');
    document.getElementById('split-dividers').innerHTML = '';
  }

  startAttractMode() {
    this.state = 'attract';
    this.attractTimer = 0;
    this.attractCamMode = 0;
    this._clearKarts();

    // Pick a dramatic course for Attract Mode
    const attractCourses = [COURSES[0], COURSES[1], COURSES[2], COURSES[3]];
    const chosen = attractCourses[Math.floor(Math.random() * attractCourses.length)];
    this.track.buildCourse(chosen, false);
    this.items.spawnCourseItemBoxes(this.track.itemBoxSpawns);

    for (let i = 0; i < 8; i++) {
      const kart = new Kart({
        index: i,
        driver: DRIVERS[i % DRIVERS.length],
        isHuman: false,
        playerIndex: i,
        scene: this.scene,
        rapierWorld: this.rapierWorld,
        RAPIER: this.RAPIER
      });
      kart.resetAtTransform(this.track.startTransforms[i], chosen.mode === 'battle', 99);
      kart.attractCheat = true;
      kart.heldItem = i % 2 === 0 ? 'red_shell' : 'mushroom';
      this.karts.push(kart);
    }

    this._updateViewportLayout(1);
    this.ui.showScreen('attract');
    document.getElementById('hud-layer').classList.add('hidden');
    this.audio.startMusic(chosen.theme, 1.0);
    this.input.anyInputJustHappened = false;
  }

  exitAttractMode() {
    this.input.resetIdleTimer();
    this.returnToTitle();
  }

  returnToTitle() {
    this.state = 'title';
    this.ui.showScreen('title');
    this._setupTitleShowcase();
    this.audio.startMusic('title', 1.0);
    this.audio.updateEngineSound(0, false, false, false);
  }

  startConfiguredSession() {
    const cfg = this.sessionConfig;
    if (cfg.mode === 'gp') {
      cfg.courseIndex = 0;
      this.cupPoints = new Array(8).fill(0);
    }
    this._launchEvent();
  }

  restartCurrentRace() {
    this._launchEvent();
  }

  _launchEvent() {
    const cfg = this.sessionConfig;
    const engineClass = ENGINE_CLASSES[cfg.classIndex];
    const course = COURSES[cfg.courseIndex];
    const isBattle = cfg.mode === 'battle' || course.mode === 'battle';
    const isTimeTrial = cfg.mode === 'tt';

    this._clearKarts();
    this.track.buildCourse(course, engineClass.mirror);
    this.items.spawnCourseItemBoxes(isTimeTrial ? [] : this.track.itemBoxSpawns);

    const numHuman = isTimeTrial ? 1 : cfg.numPlayers;
    const totalRacers = isTimeTrial ? 1 : 8;

    // Order driver roster so P1 gets their chosen driver
    const orderedDrivers = [...DRIVERS];
    const chosenDriver = DRIVERS[cfg.driverIndex];
    const existingIdx = orderedDrivers.indexOf(chosenDriver);
    if (existingIdx > 0) {
      orderedDrivers.splice(existingIdx, 1);
      orderedDrivers.unshift(chosenDriver);
    }

    for (let i = 0; i < totalRacers; i++) {
      const isHuman = i < numHuman;
      const kart = new Kart({
        index: i,
        driver: orderedDrivers[i % orderedDrivers.length],
        isHuman,
        playerIndex: i,
        scene: this.scene,
        rapierWorld: this.rapierWorld,
        RAPIER: this.RAPIER
      });
      kart.resetAtTransform(this.track.startTransforms[i], isBattle, course.laps || 3);
      if (isTimeTrial) {
        kart.heldItem = 'triple_mushroom';
        kart.heldItemCharges = 3;
      }
      this.karts.push(kart);
      if (isHuman) this.humanKarts.push(kart);
    }

    // Time Trials: Spawn Ghost Kart if a previous recording exists for this course
    this.currentGhostRecording = [];
    if (isTimeTrial && this.bestGhostRecordings[course.id]?.frames?.length > 0) {
      this.ghostKart = new Kart({
        index: 99,
        driver: chosenDriver,
        isHuman: false,
        playerIndex: 0,
        isGhost: true,
        scene: this.scene,
        rapierWorld: this.rapierWorld,
        RAPIER: this.RAPIER
      });
      this.ghostKart.resetAtTransform(this.track.startTransforms[0], false, course.laps || 3);
    }

    this.state = 'racing';
    this.raceTime = 0;
    this.countdownTimer = 3.0;
    this.lastBeepSecond = 4;

    this._updateViewportLayout(numHuman);
    this.ui.buildViewportHUDs(this.viewports, isBattle, isTimeTrial);
    this.ui.showScreen('racing');
    document.getElementById('hud-layer').classList.remove('hidden');

    this.audio.startMusic(course.theme, 1.0);
  }

  _updateViewportLayout(numPlayersOverride = null) {
    const numP = numPlayersOverride ?? (this.state === 'racing' || this.state === 'paused' ? this.humanKarts.length : 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.viewports = [];
    const dividerEl = document.getElementById('split-dividers');
    if (dividerEl) dividerEl.innerHTML = '';

    if (numP <= 1) {
      this.viewports.push({
        x: 0, y: 0, w: W, h: H,
        xPct: 0, yPct: 0, wPct: 100, hPct: 100,
        cam: this.cameras[0]
      });
    } else if (numP === 2) {
      if (this.settings.splitVertical2P) {
        const hw = Math.floor(W / 2);
        this.viewports.push(
          { x: 0, y: 0, w: hw, h: H, xPct: 0, yPct: 0, wPct: 50, hPct: 100, cam: this.cameras[0] },
          { x: hw, y: 0, w: W - hw, h: H, xPct: 50, yPct: 0, wPct: 50, hPct: 100, cam: this.cameras[1] }
        );
        if (dividerEl) dividerEl.innerHTML = `<div class="split-line-v"></div>`;
      } else {
        const hh = Math.floor(H / 2);
        // Remember: in Three.js r180 WebGPURenderer, y=0 is TOP of the canvas!
        this.viewports.push(
          { x: 0, y: 0, w: W, h: hh, xPct: 0, yPct: 0, wPct: 100, hPct: 50, cam: this.cameras[0] },
          { x: 0, y: hh, w: W, h: H - hh, xPct: 0, yPct: 50, wPct: 100, hPct: 50, cam: this.cameras[1] }
        );
        if (dividerEl) dividerEl.innerHTML = `<div class="split-line-h"></div>`;
      }
    } else {
      // 3P or 4P 4-quadrant N64 split-screen (y=0 is top-left in WebGPURenderer!)
      const hw = Math.floor(W / 2);
      const hh = Math.floor(H / 2);
      this.viewports.push(
        { x: 0, y: 0, w: hw, h: hh, xPct: 0, yPct: 0, wPct: 50, hPct: 50, cam: this.cameras[0] },
        { x: hw, y: 0, w: W - hw, h: hh, xPct: 50, yPct: 0, wPct: 50, hPct: 50, cam: this.cameras[1] },
        { x: 0, y: hh, w: hw, h: H - hh, xPct: 0, yPct: 50, wPct: 50, hPct: 50, cam: this.cameras[2] },
        {
          x: hw, y: hh, w: W - hw, h: H - hh,
          xPct: 50, yPct: 50, wPct: 50, hPct: 50,
          cam: this.cameras[3],
          isTelemetryQuadrant: numP === 3
        }
      );
      if (dividerEl) {
        dividerEl.innerHTML = `<div class="split-line-h"></div><div class="split-line-v"></div>`;
      }
    }

    for (const vp of this.viewports) {
      vp.cam.aspect = Math.max(0.2, vp.w / Math.max(1, vp.h));
      vp.cam.updateProjectionMatrix();
    }
  }

  togglePause() {
    if (this.state === 'racing') {
      this.state = 'paused';
      this.ui.showScreen('pause');
      this.audio.updateEngineSound(0, false, false, false);
    } else if (this.state === 'paused') {
      this.state = 'racing';
      this.ui.showScreen('racing');
    }
  }

  _finishEvent() {
    this.state = 'results';
    document.getElementById('hud-layer').classList.add('hidden');
    this.audio.updateEngineSound(0, false, false, false);
    this.audio.startMusic('victory', 1.0);

    const cfg = this.sessionConfig;
    const course = COURSES[cfg.courseIndex];
    const isBattle = cfg.mode === 'battle' || course.mode === 'battle';
    const isTimeTrial = cfg.mode === 'tt';

    // Save Ghost Recording if Time Trial
    if (isTimeTrial && this.humanKarts[0]) {
      const finishTime = this.humanKarts[0].finishTime;
      const prevBest = this.bestGhostRecordings[course.id];
      if (!prevBest || finishTime < prevBest.bestTime) {
        this.bestGhostRecordings[course.id] = {
          bestTime: finishTime,
          frames: [...this.currentGhostRecording]
        };
      }
    }

    // Award Grand Prix Cup points (9, 6, 3, 1)
    const ptsTable = [9, 6, 3, 1, 0, 0, 0, 0];
    const sorted = [...this.karts].filter(k => !k.isGhost).sort((a, b) => a.rank - b.rank);

    if (cfg.mode === 'gp') {
      for (const k of sorted) {
        const addPts = ptsTable[k.rank - 1] || 0;
        this.cupPoints[k.index] = (this.cupPoints[k.index] || 0) + addPts;
        k.points = this.cupPoints[k.index];
      }
    }

    const rows = sorted.map(k => ({
      rank: `${k.rank}.`,
      name: `${k.driver.name} ${k.isHuman ? `(P${k.playerIndex + 1})` : '(CPU)'}`,
      stat: isBattle
        ? `🎈 × ${k.balloons}`
        : cfg.mode === 'gp'
          ? `${this.ui.formatTime(k.finishTime || this.raceTime)}  •  +${ptsTable[k.rank - 1] || 0} pts (Total: ${k.points})`
          : `${this.ui.formatTime(k.finishTime || this.raceTime)}`,
      isHuman: k.isHuman
    }));

    const nextLabel = cfg.mode === 'gp' && cfg.courseIndex < 2
      ? '✕ Next Cup Race'
      : cfg.mode === 'gp' && cfg.courseIndex === 2
        ? '🏆 Trophy Ceremony'
        : '🔄 Play Again';

    this.ui.showResultsScreen({
      title: `${course.name.toUpperCase()} — RESULTS`,
      subtitle: isTimeTrial
        ? `Best Record: ${this.ui.formatTime(this.bestGhostRecordings[course.id]?.bestTime || this.raceTime)}`
        : course.cup,
      rows,
      nextLabel
    });
  }

  advanceFromResults() {
    this.audio.playUIConfirm();
    const cfg = this.sessionConfig;
    if (this.state === 'cup_ceremony') {
      this.returnToTitle();
      return;
    }

    if (cfg.mode === 'gp') {
      if (cfg.courseIndex < 2) {
        cfg.courseIndex++;
        this._launchEvent();
      } else {
        this._showCupCeremony();
      }
    } else {
      this._launchEvent();
    }
  }

  _showCupCeremony() {
    this.state = 'cup_ceremony';
    // Build 3D Gold/Silver/Bronze Podium & Spinning Trophy at start line!
    if (this.podiumGroup) this.scene.remove(this.podiumGroup);
    this.podiumGroup = new THREE.Group();
    const s0 = this.track.getTrackPointAt(0);
    this.podiumGroup.position.copy(s0.point);

    const step1 = createCelMesh(new THREE.BoxGeometry(3.6, 2.2, 3.6), { hexColor: 0xffd700 }, 0.06);
    step1.position.set(0, 1.1, 0);
    const step2 = createCelMesh(new THREE.BoxGeometry(3.4, 1.5, 3.4), { hexColor: 0xcbd5e1 }, 0.06);
    step2.position.set(-3.6, 0.75, 0.4);
    const step3 = createCelMesh(new THREE.BoxGeometry(3.4, 1.0, 3.4), { hexColor: 0xd97706 }, 0.06);
    step3.position.set(3.6, 0.5, 0.8);

    // Golden Cup Trophy
    this.trophyMesh = createCelMesh(
      new THREE.CylinderGeometry(0.95, 0.45, 2.0, 12),
      { hexColor: 0xffdd00, emissiveHex: 0xffaa00, emissiveIntensity: 0.45 },
      0.06
    );
    this.trophyMesh.position.set(0, 4.2, 0);
    this.podiumGroup.add(step1, step2, step3, this.trophyMesh);
    this.scene.add(this.podiumGroup);

    // Sort drivers by total Grand Prix Cup Points
    const standings = [...this.karts]
      .filter(k => !k.isGhost)
      .sort((a, b) => (b.points - a.points) || (a.rank - b.rank));

    // Place top 3 karts onto the podium steps!
    const podiumOffsets = [
      new THREE.Vector3(0, 2.2, 0),
      new THREE.Vector3(-3.6, 1.5, 0.4),
      new THREE.Vector3(3.6, 1.0, 0.8)
    ];
    standings.slice(0, 3).forEach((k, idx) => {
      k.position.copy(s0.point).add(podiumOffsets[idx]);
      k.yaw = Math.PI;
      k.syncVisuals(0, this.elapsed);
    });

    const rows = standings.map((k, idx) => ({
      rank: idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `${idx + 1}.`,
      name: `${k.driver.name} ${k.isHuman ? `(P${k.playerIndex + 1})` : '(CPU)'}`,
      stat: `${k.points} CUP PTS`,
      isHuman: k.isHuman
    }));

    this.ui.showResultsScreen({
      title: '🏆 MUSHROOM-FLASH CUP CHAMPIONSHIP! 🏆',
      subtitle: 'Congratulations! Final 3-Course Grand Prix Standings:',
      rows,
      nextLabel: '🏠 Return to Title Screen'
    });
    this.ui.menuState = 'cup_ceremony';
  }

  _updateRankings(isBattle) {
    const active = this.karts.filter(k => !k.isGhost);
    if (isBattle) {
      active.sort((a, b) => (b.balloons - a.balloons) || (a.index - b.index));
    } else {
      active.sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.totalProgress - a.totalProgress;
      });
    }
    active.forEach((k, idx) => {
      k.rank = idx + 1;
    });
  }

  _updateCameras(dt) {
    if (this.state === 'title' || this.state === 'setup') {
      // Smooth sweeping helicopter camera following demo karts on the title screen
      const targetKart = this.karts[0];
      if (targetKart) {
        const cam = this.cameras[0];
        const angle = this.elapsed * 0.35;
        cam.position.set(
          targetKart.position.x + Math.sin(angle) * 14,
          targetKart.position.y + 6.5,
          targetKart.position.z + Math.cos(angle) * 14
        );
        cam.lookAt(targetKart.position.x, targetKart.position.y + 1.2, targetKart.position.z);
      }
      return;
    }

    if (this.state === 'cup_ceremony' && this.podiumGroup) {
      const cam = this.cameras[0];
      const p = this.podiumGroup.position;
      cam.position.set(p.x + Math.sin(this.elapsed * 0.6) * 11, p.y + 4.5, p.z + 12);
      cam.lookAt(p.x, p.y + 2.2, p.z);
      if (this.trophyMesh) this.trophyMesh.rotation.y = this.elapsed * 2.0;
      return;
    }

    if (this.state === 'attract') {
      this.attractTimer += dt;
      if (this.attractTimer > 5.5) {
        this.attractTimer = 0;
        this.attractCamMode = (this.attractCamMode + 1) % 3;
      }
      const leader = this.karts.find(k => k.rank === 1) || this.karts[0];
      const cam = this.cameras[0];
      const labelEl = document.getElementById('attract-cam-label');

      if (leader) {
        if (this.attractCamMode === 0) {
          // Dynamic Chase Cam
          if (labelEl) labelEl.textContent = `LEADER CHASE CAM — ${leader.driver.name.toUpperCase()}`;
          const backX = Math.sin(leader.yaw);
          const backZ = Math.cos(leader.yaw);
          cam.position.lerp(
            new THREE.Vector3(
              leader.position.x + backX * 7.2,
              leader.position.y + 3.1,
              leader.position.z + backZ * 7.2
            ),
            Math.min(1, dt * 10)
          );
          cam.lookAt(leader.position.x - backX * 4, leader.position.y + 1.2, leader.position.z - backZ * 4);
        } else if (this.attractCamMode === 1) {
          // Dramatic Low Front-Quarter Action Cam
          if (labelEl) labelEl.textContent = `DRIFT ACTION CAM — ${leader.driver.name.toUpperCase()}`;
          const fwdX = -Math.sin(leader.yaw - 0.5);
          const fwdZ = -Math.cos(leader.yaw - 0.5);
          cam.position.set(
            leader.position.x + fwdX * 6.2,
            leader.position.y + 2.0,
            leader.position.z + fwdZ * 6.2
          );
          cam.lookAt(leader.position.x, leader.position.y + 1.0, leader.position.z);
        } else {
          // Helicopter Overhead Cam
          if (labelEl) labelEl.textContent = `N64 HELICOPTER TV CAM`;
          cam.position.set(
            leader.position.x + Math.sin(this.elapsed * 0.8) * 18,
            leader.position.y + 14.0,
            leader.position.z + Math.cos(this.elapsed * 0.8) * 18
          );
          cam.lookAt(leader.position.x, leader.position.y + 1.0, leader.position.z);
        }
      }
      return;
    }

    // Active Racing / Battle Split-Screen Chase Cameras
    for (let i = 0; i < this.viewports.length; i++) {
      const vp = this.viewports[i];
      const cam = vp.cam;
      if (vp.isTelemetryQuadrant) {
        // 3P 4th quadrant shows overhead broadcast camera of leader
        const leader = this.karts.find(k => k.rank === 1) || this.karts[0];
        if (leader) {
          cam.position.set(leader.position.x, leader.position.y + 34, leader.position.z + 18);
          cam.lookAt(leader.position.x, leader.position.y, leader.position.z);
        }
        continue;
      }

      const kart = this.humanKarts[i] || this.karts[i];
      if (!kart) continue;

      const backX = Math.sin(kart.yaw);
      const backZ = Math.cos(kart.yaw);
      const boostDistOffset = kart.boostTimer > 0 ? 1.15 : 0;
      const desiredPos = new THREE.Vector3(
        kart.position.x + backX * (6.8 + boostDistOffset),
        kart.position.y + 2.95,
        kart.position.z + backZ * (6.8 + boostDistOffset)
      );
      cam.position.lerp(desiredPos, Math.min(1, dt * 14));
      cam.lookAt(
        kart.position.x - backX * 5.0,
        kart.position.y + 1.25,
        kart.position.z - backZ * 5.0
      );

      // Dynamic FOV boost kick
      const targetFov = kart.boostTimer > 0 || kart.starTimer > 0 ? 72 : 62;
      if (Math.abs(cam.fov - targetFov) > 0.2) {
        cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, dt * 8);
        cam.updateProjectionMatrix();
      }
    }
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;
    this.elapsed += dt;

    this.input.poll(dt);
    const menuAct = this.input.getMenuAction();

    // Handle Attract Mode 10-second idle countdown on Title screen
    if (this.state === 'title' && !this.ui.settingsOpen && !this.ui.creditsOpen) {
      const idleSec = this.input.getIdleSeconds();
      const rem = Math.max(0, Math.ceil(10.0 - idleSec));
      const timerEl = document.getElementById('attract-timer-val');
      if (timerEl) timerEl.textContent = `${rem}`;
      if (idleSec >= 10.0) {
        this.startAttractMode();
        this.input.endFrame();
        return;
      }
    }

    // Exit Attract Mode immediately on ANY input
    if (this.state === 'attract') {
      if (this.input.anyInputJustHappened) {
        this.exitAttractMode();
        this.input.endFrame();
        return;
      }
    } else if (this.state === 'racing') {
      if (menuAct.options || menuAct.back) {
        this.togglePause();
      } else if (menuAct.settingsBtn) {
        this.togglePause();
        this.ui.openSettings();
      }
    } else {
      this.ui.handleMenuInput(menuAct);
    }

    // Update simulation
    if (this.state === 'title' || this.state === 'setup' || this.state === 'attract') {
      this.rapierWorld.step();
      for (const k of this.karts) {
        const aiCtrl = k.computeAIControls(dt, this.track, this.karts, 1.0);
        k.update(dt, this.elapsed, aiCtrl, this.track, 1.0, null);
        if (aiCtrl.useItemJustPressed) {
          this.items.useKartItem(k, this.karts, this.track);
        }
      }
      this.track.update(dt, this.elapsed, this.karts, null);
      this.items.update(dt, this.elapsed, this.karts, this.track, false);
      this._updateRankings(this.track.isBattle);
    } else if (this.state === 'racing') {
      const cfg = this.sessionConfig;
      const eng = ENGINE_CLASSES[cfg.classIndex];
      const isBattle = cfg.mode === 'battle' || this.track.isBattle;
      const isTimeTrial = cfg.mode === 'tt';

      if (this.countdownTimer > 0) {
        this.countdownTimer -= dt;
        const secCeil = Math.ceil(this.countdownTimer);
        if (secCeil < this.lastBeepSecond && secCeil >= 1) {
          this.lastBeepSecond = secCeil;
          this.audio.playCountdownBeep(false);
        }
        // Check Rocket Start input during countdown
        for (const hk of this.humanKarts) {
          const ctrl = this.input.getPlayerControls(hk.playerIndex, this.humanKarts.length);
          hk.updateCountdownInput(dt, ctrl, this.countdownTimer);
        }
        if (this.countdownTimer <= 0) {
          this.audio.playCountdownBeep(true);
          for (const hk of this.humanKarts) {
            hk.applyCountdownLaunch(this.audio);
          }
        }
      } else {
        this.raceTime += dt;
        this.rapierWorld.step();

        for (const k of this.karts) {
          let ctrl;
          if (k.isHuman && !k.finished) {
            ctrl = this.input.getPlayerControls(k.playerIndex, this.humanKarts.length);
          } else {
            ctrl = k.computeAIControls(dt, this.track, this.karts, eng.aiSkill);
          }
          k.update(dt, this.elapsed, ctrl, this.track, eng.speedMult, this.audio);

          if (ctrl.useItemJustPressed && !k.finished) {
            this.items.useKartItem(k, this.karts, this.track);
          }
          if (k.finished && k.finishTime === 0) {
            k.finishTime = this.raceTime;
          }
        }

        // Update Time Trial Ghost recording & playback
        if (isTimeTrial && this.humanKarts[0]) {
          const p1 = this.humanKarts[0];
          this.currentGhostRecording.push({
            x: p1.position.x,
            y: p1.position.y,
            z: p1.position.z,
            yaw: p1.yaw
          });
          const bestRec = this.bestGhostRecordings[COURSES[cfg.courseIndex].id];
          if (this.ghostKart && bestRec?.frames?.length > 0) {
            const frameIdx = Math.min(bestRec.frames.length - 1, this.currentGhostRecording.length - 1);
            const f = bestRec.frames[frameIdx];
            this.ghostKart.position.set(f.x, f.y, f.z);
            this.ghostKart.yaw = f.yaw;
            this.ghostKart.syncVisuals(dt, this.elapsed);
          }
        }

        this.track.update(dt, this.elapsed, this.karts, this.audio);
        this.items.update(dt, this.elapsed, this.karts, this.track, isTimeTrial);
        this._updateRankings(isBattle);

        // Modulate P1 engine audio & music tempo on Final Lap
        const p1 = this.humanKarts[0];
        if (p1) {
          this.audio.updateEngineSound(
            Math.abs(p1.speed) / p1.driver.topSpeed,
            p1.isDrifting,
            p1.boostTimer > 0,
            true
          );
          if (!isBattle && p1.lap === p1.maxLaps) {
            this.audio.setMusicTempo(1.22);
          }
        }

        // Check event completion
        if (isBattle) {
          const aliveAll = this.karts.filter(k => !k.eliminated);
          const aliveHumans = this.humanKarts.filter(k => !k.eliminated);
          if (aliveAll.length <= 1 || aliveHumans.length === 0) {
            this._finishEvent();
          }
        } else {
          const allHumansDone = this.humanKarts.every(hk => hk.finished);
          if (allHumansDone) {
            // Assign estimated finish times to remaining AI karts
            for (const k of this.karts) {
              if (!k.finished) {
                k.finished = true;
                k.finishTime = this.raceTime + (1.0 - (k.totalProgress % 1.0)) * 12 + k.rank * 0.6;
              }
            }
            this._finishEvent();
          }
        }
      }

      this.ui.updateHUD(
        this.humanKarts,
        this.raceTime,
        this.countdownTimer,
        isBattle,
        isTimeTrial
      );
      this.ui.drawMinimap(this.track, this.ghostKart ? [...this.karts, this.ghostKart] : this.karts);
    }

    // Update Lightning flash overlay
    const flashEl = document.getElementById('lightning-flash');
    if (flashEl) {
      flashEl.style.opacity = this.items.lightningFlashTimer > 0 ? String(this.items.lightningFlashTimer * 2) : '0';
    }

    this._updateCameras(dt);
    this._renderFrame();
    this.input.endFrame();
  }

  _renderFrame() {
    if (!this.renderer || this.viewports.length === 0) return;

    this.renderer.setScissorTest(false);
    this.renderer.setClearColor(0x090d16, 1.0);
    this.renderer.clear(true, true, true);

    this.renderer.setScissorTest(true);
    for (let i = 0; i < this.viewports.length; i++) {
      const vp = this.viewports[i];
      if (i > 0) {
        this.renderer.clearDepth();
      }
      this.renderer.setViewport(vp.x, vp.y, vp.w, vp.h);
      this.renderer.setScissor(vp.x, vp.y, vp.w, vp.h);

      if (this.track.skyDome) {
        this.track.skyDome.position.copy(vp.cam.position);
      }
      this.renderer.render(this.scene, vp.cam);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new FlashOKartApp();
  window.gameApp = app;
  app.init().catch(err => console.error('Flash-O-Kart 64 init error:', err));
});
