// App shell: WebGPU boot, renderer + cel/outline/bloom pipeline, state machine, title showcase, attract mode.
import * as THREE from 'three/webgpu';
import { toonOutlinePass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { initPhysics, Physics } from './physics.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { AIPilot } from './ai.js';
import { RailWorld } from './world.js';
import { makeFighter } from './models.js';
import { STAGES } from './levels.js';
import { loadSettings, loadSave, save, writeSave, resetSettings } from './settings.js';

const ATTRACT_SEQ = [
  { stage: 0, startD: 0, dur: 48 },
  { stage: 0, startD: 6560, dur: 46, skipIntro: true },
  { stage: 1, startStep: 'jackals', dur: 50 },
];

class TitleScene {
  constructor(app) {
    this.app = app;
    this.physics = new Physics(-30);
    this.world = new RailWorld(app.scene, this.physics, () => 'A');
    this.d = 1450; this.t = 0;
    this.root = new THREE.Group(); app.scene.add(this.root);
    this.ships = ['tod', 'bramble', 'pippa', 'gizmo'].map((k, i) => {
      const f = makeFighter(k); this.root.add(f.root);
      return { f, off: [[0, 0, 0], [-12, -2, 9], [12, -3, 8], [0, 6, 16]][i], ph: i * 1.3 };
    });
    app.sun.color.setHex(0xfff1dc); app.sun.intensity = 3;
    app.hemi.color.setHex(0xcfe8ff); app.hemi.groundColor.setHex(0x6a7a4a); app.hemi.intensity = 1.4;
  }
  update(dt) {
    this.t += dt; this.d += 45 * dt;
    const base = new THREE.Vector3(0, 34, -this.d);
    for (const s of this.ships) {
      s.f.root.position.set(base.x + s.off[0] + Math.sin(this.t * 0.8 + s.ph) * 2, base.y + s.off[1] + Math.sin(this.t * 1.1 + s.ph) * 1.5, base.z + s.off[2]);
      s.f.root.rotation.set(Math.sin(this.t + s.ph) * 0.05, 0, Math.sin(this.t * 0.8 + s.ph) * 0.25);
      s.f.flame.scale.y = 0.9 + Math.random() * 0.3;
    }
    const cam = this.app.camera, a = this.t * 0.12;
    cam.position.set(base.x + Math.sin(a) * 34 + 10, base.y + 6 + Math.sin(this.t * 0.2) * 4, base.z + Math.cos(a) * 30 - 8);
    cam.lookAt(base.x - 4, base.y + 2, base.z + 2);
    cam.fov = 55; cam.updateProjectionMatrix();
    this.app.sun.target.position.copy(base); this.app.sun.position.copy(base).add(new THREE.Vector3(-140, 240, -120)); this.app.sun.target.updateMatrixWorld();
    this.world.update(this.d, cam.position);
  }
  dispose() { this.app.scene.remove(this.root); this.world.dispose(); this.physics.free(); }
}

class App {
  async boot() {
    loadSettings(); loadSave();
    this.input = new Input();
    this.audio = new Audio();
    const status = document.getElementById('boot-status');
    if (!navigator.gpu) return this.fatal('WebGPU is not available in this browser.', 'Use a current Chrome, Edge, or Safari 26+ / Firefox with WebGPU enabled.');
    let adapter = null;
    try { adapter = await navigator.gpu.requestAdapter(); } catch (e) { adapter = null; }
    if (!adapter) return this.fatal('No WebGPU adapter found.', 'Your GPU or browser configuration does not expose WebGPU.');
    status.textContent = 'Winding up the physics...';
    await initPhysics();
    status.textContent = 'Stitching the renderer...';
    const renderer = this.renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.getElementById('app').appendChild(renderer.domElement);
    await renderer.init();
    if (!renderer.backend || !renderer.backend.isWebGPUBackend) return this.fatal('WebGPU initialisation failed.', 'This game requires WebGPU and has no WebGL fallback.');

    const scene = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.5, 6000);
    const sun = this.sun = new THREE.DirectionalLight(0xfff1dc, 3);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.near = 10; sc.far = 800;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
    scene.add(sun); scene.add(sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a7a4a, 1.4); scene.add(this.hemi);

    // cel pipeline: toon outlines + HDR bloom
    this.post = new THREE.PostProcessing(renderer);
    const scenePass = toonOutlinePass(scene, this.camera, new THREE.Color(0x14121e), 0.0032, 1);
    const bloomPass = bloom(scenePass, 0.55, 0.35, 0.92);
    this.post.outputNode = scenePass.add(bloomPass);

    this.ui = new UI(this);
    addEventListener('resize', () => this.resize());
    this.input.on((type) => { if (type === 'pad' && this.state === 'touch' && this.input.padConnected) this.toTitle(); });
    const unlock = () => this.audio.ensure();
    addEventListener('keydown', unlock); addEventListener('mousedown', unlock); addEventListener('touchstart', unlock);
    document.getElementById('boot').remove();
    this.clock = new THREE.Timer();
    this.state = 'boot';
    const touchOnly = (navigator.maxTouchPoints > 0) && matchMedia('(hover: none) and (pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    if (touchOnly && !this.input.getPad()) { this.state = 'touch'; this.title = new TitleScene(this); this.ui.open('touch'); addEventListener('keydown', () => { if (this.state === 'touch') this.toTitle(); }, { once: true }); }
    else this.toTitle();
    renderer.setAnimationLoop((t) => this.frame(t));
  }
  fatal(msg, sub) {
    const b = document.getElementById('boot');
    b.innerHTML = `<div class="fatal"><div class="logo small">STUFFOX<span>64</span></div><h2>${msg}</h2><p>${sub}</p><p class="muted">This game needs WebGPU and has no fallback renderer.</p></div>`;
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  // ---------------- state transitions ----------------
  ensureTitleScene() { if (!this.title) this.title = new TitleScene(this); }
  disposeGame() { if (this.game) { this.game.disposed = true; this.game.dispose(); this.game = null; } this.ui.showHud(false); this.ui.clearTransient(); }
  toTitle() {
    this.disposeGame();
    this.ensureTitleScene();
    this.state = 'title'; this.ui.stack.length = 0; this.ui.open('title');
    this.audio.playSong('title');
    this.input.touch();
  }
  toMain() { this.state = 'menu'; this.ui.stack.length = 0; this.ui.open('main'); this.input.touch(); }
  startStage(index, carry, campaign) {
    this.campaign = campaign; this.stageIndex = index; this.carry = carry || null;
    this.disposeGame(); this.ensureTitleScene();
    this.state = 'briefing'; this.ui.stack.length = 0;
    this.ui.open('briefing', { stage: STAGES[index] });
    this.audio.voice('woolsey', STAGES[index].briefing[0][1]);
  }
  launch() {
    if (this.title) { this.title.dispose(); this.title = null; }
    this.ui.close();
    this.game = new Game(this, this.stageIndex, { carry: this.carry });
    this.ui.showHud(true);
    this.state = 'playing';
  }
  startAttract(i = 0) {
    if (this.title) { this.title.dispose(); this.title = null; }
    this.disposeGame();
    this.ui.close();
    const seg = ATTRACT_SEQ[i % ATTRACT_SEQ.length];
    this.attractIdx = i; this.attractT = 0; this.attractSeg = seg;
    const opts = { attract: true, startD: seg.startD || 0, skipIntro: seg.skipIntro };
    this.game = new Game(this, seg.stage, opts);
    if (seg.startStep) {
      const idx = STAGES[seg.stage].steps.findIndex((s) => s.do === seg.startStep);
      this.game.stepIdx = Math.max(0, idx);
    }
    this.ai = new AIPilot();
    this.ui.showHud(true);
    this.state = 'attract';
    this.attractStart = performance.now();
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.audio.chargeStop();
    this.ui.open('pause'); this.ui.stack.length = 0;
  }
  resume() { this.ui.close(); this.state = 'playing'; this.resumeGuard = 0.2; }
  showResults() {
    const r = this.game.finalStats();
    const id = r.stage.id;
    save.best[id] = Math.max(save.best[id] || 0, r.carry.score);
    if (r.medal) save.medals[id] = true;
    save.cleared[id] = true; writeSave();
    this.lastResults = r;
    this.disposeGame(); this.ensureTitleScene();
    this.state = 'results'; this.ui.open('results', r);
    this.audio.playSong('title');
    // count-up animation for hits
    const el = document.querySelector('#menu .count');
    if (el) { const to = +el.dataset.to; let v = 0; const iv = setInterval(() => { v = Math.min(to, v + Math.max(1, Math.ceil(to / 40))); el.textContent = v; this.audio.menuMove(); if (v >= to) clearInterval(iv); }, 35); }
  }

  menuAction(act, data, screen) {
    switch (screen) {
      case 'touch': if (act === 'settings') this.ui.push('settings'); break;
      case 'title': if (act !== 'back') this.toMain(); break;
      case 'main':
        if (act === 'new') this.startStage(0, null, true);
        else if (act === 'select') this.ui.push('select');
        else if (act === 'howto') this.ui.push('howto', { tab: 0 });
        else if (act === 'settings') this.ui.push('settings');
        else if (act === 'about') this.ui.push('about');
        else if (act === 'back') this.toTitle();
        break;
      case 'select':
        if (act === 'stage') this.startStage(+data.stage, null, true);
        else if (act === 'back') this.ui.pop();
        break;
      case 'briefing':
        if (act === 'launch') this.launch();
        else if (act === 'back') { this.toTitle(); this.toMain(); }
        break;
      case 'settings':
        if (act === 'reset') { resetSettings(); this.audio.applyVolumes(); this.ui.render(); }
        else if (act === 'back') { if (!this.ui.pop()) this.toTitle(); }
        break;
      case 'howto': case 'about':
        if (act === 'back') { if (!this.ui.pop()) this.toTitle(); }
        break;
      case 'pause':
        if (act === 'resume' || act === 'back') this.resume();
        else if (act === 'restart') { const c = this.game.carry; this.disposeGame(); this.carry = c; this.launch(); }
        else if (act === 'howto') this.ui.push('howto', { tab: 0 });
        else if (act === 'settings') this.ui.push('settings');
        else if (act === 'quit') this.toTitle();
        break;
      case 'results':
        if (act === 'next' || act === 'back') {
          const r = this.lastResults;
          if (r.stage.id === 1) this.startStage(1, r.carry, true);
          else { this.state = 'demoend'; this.ui.open('demoend', { score: r.carry.score }); this.audio.playSong('clear'); }
        }
        break;
      case 'gameover':
        if (act === 'continue') { this.startStage(this.stageIndex, null, this.campaign); }
        else if (act === 'quit' || act === 'back') this.toTitle();
        break;
      case 'demoend':
        if (act === 'credits') this.ui.push('about');
        else this.toTitle();
        break;
    }
  }

  humanCtl() {
    const i = this.input;
    return {
      lx: i.lx, ly: i.ly, fire: i.down.fire, firePressed: i.pressed.fire, fireReleased: i.released.fire, autoFire: false,
      bombPressed: i.pressed.bomb, boost: i.boostAxis, brake: i.brakeAxis, bankL: i.down.bankL, bankR: i.down.bankR,
      rollEvent: i.rollEvent, loopPressed: i.pressed.loop,
    };
  }

  frame() {
    this.clock.update();
    const dt = Math.min(0.05, this.clock.getDelta());
    const input = this.input;
    input.update(dt);
    if (input.anyPressed) this.audio.ensure();
    switch (this.state) {
      case 'touch': this.title && this.title.update(dt); this.ui.updateMenu(input, dt); break;
      case 'title': case 'menu':
        this.title.update(dt);
        this.ui.updateMenu(input, dt);
        if ((this.ui.screen === 'title' || this.ui.screen === 'main') && input.idleSeconds() > 10) this.startAttract(0);
        break;
      case 'briefing': case 'results': case 'demoend': case 'gameover':
        if (this.title) this.title.update(dt);
        this.ui.updateMenu(input, dt);
        break;
      case 'playing': {
        this.resumeGuard = (this.resumeGuard || 0) - dt;
        if (input.pressed.pause && this.resumeGuard <= 0) { this.pause(); break; }
        const g = this.game;
        g.update(dt, this.resumeGuard > 0 ? { ...this.humanCtl(), firePressed: false, bombPressed: false } : this.humanCtl());
        this.ui.updateHud(g.hudState(), this.camera, dt);
        if (g.result) {
          if (g.result.type === 'clear') this.showResults();
          else if (g.result.type === 'gameover') { this.disposeGame(); this.ensureTitleScene(); this.state = 'gameover'; this.ui.open('gameover'); this.audio.playSong('gameover'); }
        }
        break;
      }
      case 'paused':
        this.ui.updateMenu(input, dt);
        if (this.state === 'paused' && input.pressed.pause && this.ui.screen === 'pause' && !input.pressed.back) this.resume();
        break;
      case 'attract': {
        const g = this.game;
        this.attractT += dt;
        g.update(dt, this.ai.update(dt, g));
        this.ui.updateHud(g.hudState(), this.camera, dt);
        if (input.lastInput > this.attractStart + 400) { this.toTitle(); break; }
        if (this.attractT > this.attractSeg.dur || g.result) {
          if (this.attractIdx + 1 >= ATTRACT_SEQ.length) this.toTitle();
          else this.startAttract(this.attractIdx + 1);
        }
        break;
      }
    }
    this.post.render();
  }
}

new App().boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.innerHTML = `<div class="fatal"><h2>Something came unstitched.</h2><p>${String(e && e.message || e)}</p></div>`;
});
