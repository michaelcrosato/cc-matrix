import * as THREE from 'three/webgpu';
import { Scripts, Handle } from '../core/script.js';
import { Loop } from '../core/loop.js';
import { Save } from '../core/save.js';
import { tun } from '../core/tuning.js';
import { TUNING } from '../data/tuning.js';
import { initPhysics, RAPIER } from '../physics/world.js';
import { IslandPhysics } from '../physics/island.js';
import { IslandArt } from '../art/island.js';
import { Input } from '../input/input.js';
import { AudioEngine } from '../audio/engine.js';
import { UI } from '../ui/ui.js';
import { Speech } from '../ui/speech.js';
import { HUD } from '../ui/hud.js';
import { h } from '../ui/dom.js';
import { makeInk } from '../render/ink.js';
import { Palette } from '../render/palette.js';
import { makeSky } from '../render/sky.js';
import { makeSea } from '../render/sea.js';
import { CameraRig } from '../render/cameraRig.js';
import { Particles } from '../render/particles.js';
import { ComicText } from '../render/comicText.js';
import { geo, toon } from '../art/materials.js';
import { line } from '../data/dialogue.js';
import { Programme } from './programme.js';
import { RESORT } from '../data/config.js';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _iq = new THREE.Quaternion();

/** The whole game: engine parts, one current mode, and the sim-time scripts that drive the flow. */
export class Game {
  constructor(params) {
    this.params = params;
    this.loop = new Loop(this);
    this.scripts = new Scripts();
    let storage = null;
    try { storage = window.localStorage; } catch (e) { storage = null; }
    this.save = new Save(storage);
    this.errors = []; this.paused = false; this.mode = null; this.modeName = 'boot';
    this.stopT = 0; this.wiping = false; this.simTime = 0; this.islandOn = true; this.renderLost = null;
    this.devStep = 0; this.god = false; this.attract = false;
    this.backend = 'none'; this.frames = 0;
    this.touchOnly = false;
    this.inSession = false;
    this.programme = new Programme(this);
  }
  noteError(e) {
    const msg = (e && e.message) || String(e);
    if (this.errors.length < 30) this.errors.push(msg);
  }
  async bootEngine() {
    await initPhysics();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, innerWidth / Math.max(1, innerHeight), 0.1, 1400);
    this.rig = new CameraRig(this.camera);
    this.rig.reduce = this.save.settings.reduceShake;
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.035;
    const sc = this.sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 220;
    this.sun.position.set(38, 70, 42);
    this.sunDir = new THREE.Vector3(38, 70, 42).normalize();
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.35);
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.palette = new Palette(this.sun, this.hemi);
    this.sky = makeSky(this.palette);
    this.sea = makeSea(this.palette);
    this.scene.add(this.sky.group, this.sea.mesh);
    this.fx = new Particles();
    this.fx.addTo(this.scene);
    this.comic = new ComicText(this.scene);
    // Renderer
    if (this.params.render) await this.startRenderer();
    // Island
    this.art = new IslandArt();
    this.scene.add(this.art.holder);
    this.phys = new IslandPhysics();
    this.buildIslandProps();
    this.art.buildMarbles();
    // Input, audio, UI
    this.input = new Input();
    this.input.attach(window);
    this.input.rumbleOn = this.save.settings.rumble;
    this.audio = new AudioEngine(() => this.save.settings);
    this.input.onGesture = () => this.audio.gesture();
    const root = document.getElementById('ui');
    this.hud = new HUD(this, root);
    this.ui = new UI(this, root);
    this.speech = new Speech(this, root);
    this.audioTag = h('div.audio-tag.tag', 'Press a key or click for sound');
    this.audioTag.style.display = 'none';
    root.append(this.audioTag);
    this.programme.syncIsland();
    this.phys.snapTilt();
    this.applySettings();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }
  async startRenderer() {
    const canvasParent = document.body;
    const renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer = renderer;
    await renderer.init();
    this.backend = renderer.backend && renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
    const dev = renderer.backend && renderer.backend.device;
    if (dev && dev.lost) dev.lost.then((info) => { this.renderLost = info.message || 'lost'; });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    canvasParent.prepend(renderer.domElement);
    const ink = makeInk(renderer, this.scene, this.camera);
    this.post = ink.post; this.inkU = ink.u;
  }
  resize() {
    this.camera.aspect = innerWidth / Math.max(1, innerHeight);
    this.camera.updateProjectionMatrix();
    if (this.renderer) this.renderer.setSize(innerWidth, innerHeight);
  }
  applySettings() {
    const s = this.save.settings;
    this.audio.applyLevels();
    document.documentElement.style.setProperty('--s', String(s.uiScale / 100));
    this.input.rumbleOn = s.rumble;
    this.rig.reduce = s.reduceShake;
    this.inkStrength = s.ink / 100;
    this.applyInk();
  }
  applyInk() {
    if (!this.inkU) return;
    const k = this.inkOff ? 0 : this.inkStrength;
    this.inkU.hull.value = tun.hull * k; this.inkU.width.value = tun.lineWidth; this.inkU.boil.value = tun.boil; this.inkU.grain.value = tun.grain;
    this.inkU.strength.value = k;
  }
  buildIslandProps() {
    const oranges = this.phys.props.filter((p) => p.kind === 'orange');
    const m = this.orangeMesh = new THREE.InstancedMesh(geo.sphere(0.14, 12, 10), toon(0xF08A3C), oranges.length);
    m.castShadow = true; m.frustumCulled = false;
    this.art.group.add(m);
    this.propMeshes = [];
    for (const p of this.phys.props) {
      if (p.kind === 'orange') continue;
      let mesh;
      if (p.kind === 'ball') {
        mesh = new THREE.Group();
        const colours = [0xE8443A, 0xFFF3DC, 0x3B82F6];
        for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(geo.sphere(0.32, 14, 10), toon(colours[i])); s.scale.set(1 - i * 0.02, 1 - i * 0.02, i === 0 ? 1 : i === 1 ? 0.62 : 0.28); s.castShadow = i === 0; mesh.add(s); }
      } else {
        mesh = new THREE.Mesh(geo.box(0.6, 0.5, 0.6), toon(0xC99A62)); mesh.castShadow = true;
      }
      this.art.group.add(mesh);
      this.propMeshes.push({ p, mesh });
    }
    this.oranges = oranges;
  }
  /** Step the island's physics. weight 0 when nobody stands on it. */
  stepIsland(dt, weight = 1) { this.phys.step(dt, { weight }); }
  /** Copy island physics to its art. */
  syncIsland(dt) {
    const ph = this.phys, art = this.art;
    art.group.quaternion.set(ph.q.x, ph.q.y, ph.q.z, ph.q.w);
    _iq.set(ph.q.x, ph.q.y, ph.q.z, ph.q.w).invert();
    for (let i = 0; i < this.oranges.length; i++) {
      const t = this.oranges[i].body.translation();
      _p.set(t.x, t.y, t.z); _q.set(0, 0, 0, 1);
      _m.compose(_p, _q, _s);
      this.orangeMesh.setMatrixAt(i, _m);
    }
    this.orangeMesh.instanceMatrix.needsUpdate = true;
    for (const { p, mesh } of this.propMeshes) {
      const t = p.body.translation(), r = p.body.rotation();
      mesh.position.set(t.x, t.y, t.z); mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    art.updateCast(dt, _iq);
    art.heron.root.quaternion.copy(_iq);
    art.walrus.root.quaternion.copy(_iq).multiply(_q.setFromAxisAngle(_p.set(0, 1, 0), 0.5));
    art.gary.root.quaternion.copy(_iq);
    this.audio.setTilt(ph.restNow);
    this.sea.setTilt(ph.tx, ph.tz);
  }
  /** Island in the foreground (hub), far away (scenery), or hidden. */
  setIsland(mode, x = 0, z = 0) {
    const h2 = this.art.holder;
    this.islandMode = mode;
    if (mode === 'home') {
      h2.visible = true; h2.position.set(0, 0, 0); h2.scale.setScalar(1);
      this.sea.setLevel(-6.4); this.sea.setFoam(0, 0, 26);
      this.focus(0, 0, 0, 40);
    } else if (mode === 'far') {
      h2.visible = true; h2.position.set(x, 3, z);
      this.sea.setFoam(x, z, 26);
    } else h2.visible = false;
  }
  setBackdrop(x, z) { this.setIsland('far', x, z); }
  /** Point the sun's shadow frustum at what matters. */
  focus(x, y, z, size = 26) {
    const c = this.sun.shadow.camera;
    if (c.right !== size) { c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.updateProjectionMatrix(); }
    this.sun.target.position.set(x, y, z);
    this.sun.position.set(x, y, z).addScaledVector(this.sunDir, 90);
  }
  programmePalette() {
    const p = this.save.profile;
    if (!p) return 'noon';
    const total = Math.max(1, this.programme.classesToday().length);
    return ['dawn', 'noon', 'golden', 'dusk'][Math.min(3, Math.floor(((p.today.done.length + (p.today.checkin ? 1 : 0)) / (total + 1)) * 4))];
  }
  line(who, sit, vars) { return line(who, sit, vars); }
  /** Say a line and wait for Use. yield* game.say('trudy', 'morning'). */
  *say(who, situation, vars) { yield* this.sayText(who, line(who, situation, vars)); }
  *sayText(who, text) {
    if (!text) return;
    const l = this.speech.say(who, text);
    yield () => l.done || this.speech.line !== l;
  }
  bark(who, situation, vars, auto = 3) { const t = line(who, situation, vars); if (t) this.speech.say(who, t, { auto }); }
  hitStop(sec) { this.stopT = Math.max(this.stopT, sec); }
  onFloorExercise() { const p = this.save.profile; if (p && !this.attract) { p.floorExercises++; } }
  setMode(mode, name) {
    if (this.mode && this.mode.exit) this.mode.exit();
    this.mode = mode; this.modeName = name || (mode && mode.name) || 'none';
    if (mode && mode.enter) mode.enter();
  }
  /** The ink-blot wipe, then fn, then the wipe back. */
  *wipe(fn, dur = 0.32) {
    if (this.inkU) this.inkU.wipe.value = 0;
    this.wiping = true; this.ui.inert = true;
    let t = 0;
    while (t < dur) { t += 1 / 120; if (this.inkU) this.inkU.wipe.value = Math.min(1, t / dur); yield null; }
    if (this.inkU) this.inkU.wipe.value = 1;
    fn();
    yield 0.04;
    this.ui.inert = false;
    t = 0;
    while (t < dur) { t += 1 / 120; if (this.inkU) this.inkU.wipe.value = Math.max(0, 1 - t / dur); yield null; }
    if (this.inkU) this.inkU.wipe.value = 0;
    this.wiping = false;
  }
  go(fn) { return this.scripts.run(this.wipe(fn)); }
  fixed(dt) {
    // Hit-stop holds everything, input included, so a press during it still counts afterwards.
    if (this.stopT > 0 && !this.paused) { this.stopT -= dt; return; }
    try { this._fixed(dt); } catch (e) { this.fatal(e); }
    this.input.endTick();
  }
  _fixed(dt) {
    const input = this.input;
    if (this.beforePoll) this.beforePoll(dt);
    input.poll(dt);
    input.uiBusy = !!(this.ui.top && !this.ui.top.passive) || !!(this.speech.line && !this.speech.line.auto);
    const wasPaused = this.paused, busy = input.uiBusy;
    this.speechInput();
    this.ui.fixed(dt);
    if (!this.inSession && input.verb('pause') && !input.verb('back')) {
      // Options closes the Pause screen as well as opening it.
      if (wasPaused && this.ui.top && this.ui.top.name === 'pause') { this.closePause(); return; }
    }
    if (!this.inSession && this.mode && this.mode.canPause && !wasPaused && !busy && !this.wiping && input.verb('pause')) {
      this.openPause();
      return;
    }
    if (input.lostPads.length && this.mode && this.mode.canPause && !this.paused && this.modeUsesPad(input.lostPads)) {
      this.openPause(`Controller ${input.lostPads[0] + 1} disconnected. Reconnect it, or carry on with another.`);
      return;
    }
    if (this.paused && !this.devStep) { if (this.mode && this.mode.pausedFixed) this.mode.pausedFixed(dt); return; }
    if (this.devStep) this.devStep--;
    this.simTime += dt;
    this.speech.fixed(dt);
    this.scripts.tick(dt);
    if (this.mode && this.mode.fixed) this.mode.fixed(dt);
    if (this.afterFixed) this.afterFixed(dt);
  }
  modeUsesPad(list) {
    const m = this.mode;
    if (!m || !m.ev) return list.includes(this.input.activePad) && this.input.lastDevice === 'pad';
    return m.ev.lanes.some((l) => l.kind === 'local' && (l.source === `pad:${list[0]}` || (l.source === 'any' && this.input.lastDevice === 'pad' && list.includes(this.input.activePad))));
  }
  speechInput() {
    const l = this.speech.line;
    if (!l || l.auto || this.paused) return;
    const input = this.input;
    const used = input.verb('confirm') || (input.btnEdge & 1);
    if (used && !(this.ui.top && !this.ui.top.passive)) {
      input.verbs.delete('confirm');
      input.pressedUse = true;
      this.speech.advance();
    }
  }
  frame(dt) {
    try { this._frame(dt); } catch (e) { this.fatal(e); }
  }
  _frame(dt) {
    this.ui.frame(dt);
    this.hud.frame(dt);
    const sim = this.paused ? 0 : dt;
    if (!this.paused) {
      if (this.mode && this.mode.frame) this.mode.frame(sim);
      this.fx.frame(sim);
      this.comic.frame(sim);
      this.sky.frame(sim);
    }
    const hideCursor = !!(this.mode && this.mode.ev && this.mode.stage === 'play' && !this.paused && this.input.lastDevice === 'kbm');
    if (hideCursor !== this.cursorHidden) { this.cursorHidden = hideCursor; document.body.classList.toggle('hide-cursor', hideCursor); }
    this.palette.frame(dt);
    this.rig.frame(sim || 0.0001);
    if (this.devFrame) this.devFrame(dt);
    this.stuckT = this.audio.stuck() ? (this.stuckT || 0) + dt : 0;
    const stuck = this.stuckT > 3;
    if (this.audioTag.dataset.on !== String(stuck)) { this.audioTag.dataset.on = String(stuck); this.audioTag.style.display = stuck ? '' : 'none'; }
  }
  async render() {
    if (!this.renderer || !this.post || this.paused2) return;
    await this.post.renderAsync();
    this.frames++;
  }
  /** Rapier's panic kills physics for the page. Save and reload; in a session, tell the hub. */
  fatal(e) {
    this.noteError(e);
    const msg = (e && e.message) || String(e);
    if (this._fatal) return;
    if (/unreachable|recursive|memory access/i.test(msg)) {
      this._fatal = true;
      if (window.AIHub && window.AIHub.active) { window.AIHub.fail(`Physics stopped: ${msg}`); return; }
      this.save.write();
      if (!this.params.test) location.reload();
    }
  }
  openPause(note) { import_pause(this, note); }
  closePause() { import_resume(this); }
}
let import_pause = () => {}, import_resume = () => {};
export function setPauseOpener(f, r) { import_pause = f; import_resume = r; }
export { Handle, RAPIER, RESORT, TUNING };
