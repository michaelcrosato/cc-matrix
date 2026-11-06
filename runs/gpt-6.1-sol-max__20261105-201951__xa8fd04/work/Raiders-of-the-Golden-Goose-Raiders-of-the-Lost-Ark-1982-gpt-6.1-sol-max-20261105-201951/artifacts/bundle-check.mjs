const REPORT={"sourceInformation":{"date":"2026-11-05 20:19:51","source":"Raiders of the Lost Ark (1982, as supplied)","plan":"none","genre":"Action-adventure with traversal, combat and environmental puzzles","perspective":"3D cinematic overhead / three-quarter camera","tech":"Three.js r180 (0.180.0), WebGPURenderer with WebGL2 compatibility fallback; Rapier 3D 0.19.3; Gamepad API; Web Audio; HTML/CSS/JavaScript; AI Hub session client 1.4.0","artDirection":"Original procedural low-poly geometry, cel-shaded materials, ink silhouettes and edges, warm sandstone, jungle teal and pulp-paper UI","animation":"Three.js AnimationMixer, AnimationClip and NumberKeyframeTrack; original idle, run, whip, shoot, jump, roll, grapple, downed and vault-door clips; procedural secondary effects","audio":"Code-written adaptive procedural adventure music at 10% default music volume, synthesized effects and Animalese-style gibberish voices; no audio files","online":"1–4 player AI Hub shared-world co-op with host authority, snapshots, input replication and dedicated-server support; standalone 1–4 player couch co-op","testing":"112 passing automated checks: complete default-balance solo and online playthroughs, all curios, clean exchange, failure/retry, saves, live tuning, two/four couch seats, emulated standard gamepad and multitouch, assisted gap jump, offline music/effects/voice renders, unmodified AI Hub harness with 2 and 4 seats, 150 ms latency, 50 ms jitter, 5% loss, host departure and dedicated server; visual checks at 1920×1080, 844×390 and 390×844. Physical controller, physical touch devices and real iPhone/iPad: unknown.","research":"none for the source; native model knowledge. Only the supplied AI Hub integration documentation and pinned dependency code were read.","environment":"Codex CLI (headless); Linux / Ubuntu on WSL2","model":"OpenAI, gpt-6.1-sol, reasoning effort max","usage":"added on import"},"testingFeedback":["Testing caught and fixed 6 game/UI/integration defects: accessible button names, a blocked escape doorway, touch attack input, attract-mode interaction range, four-seat readiness timing, and initial snapshot reliability. Additional test-driver setup issues were corrected. The final complete suite passed 112/112 checks.","2 blocking defects: the escape route collider prevented completion, and cold shader warm-up caused four-seat sessions to miss the readiness deadline. Both were fixed.","The ordinary-action, default-balance whole-expedition script: it found the blocked escape and verified the lens chain, combat, all three curios, clean idol swap and victory; the same run also completed through a real shared-world session.","A single live byte-based audio-level read was least helpful: quiet 10% music rounded to silence. Separate offline renders of music, effects and voices provided measurable nonzero RMS and peak levels instead."],"engineFeedback":["Three.js combined cel materials, procedural geometry, instancing and AnimationMixer clips cleanly; Rapier supplied stable collision, jumping and movable debris.","Yes. Headless WebGPU presentation and Chromium socket-path limits needed test-driver corrections. I also initially awaited shader warm-up before Hub readiness, which missed the four-seat deadline; initialization now separates networking readiness from GPU warm-up.","The adventure state machine, traversal and combat actions, checkpoint saves, controller focus and adaptive prompts, touch assistance, and host-authoritative co-op replication.","Coordinating fixed-step Rapier simulation, native animation, cold WebGPU pipeline compilation and Hub session timing across multiple copies.","none","A first-class controller-focused game UI and character-controller integration would reduce the amount of custom infrastructure."],"promptFeedback":["The concrete stack, controller-first goals, procedural audio and required developer tools gave the vertical slice a clear identity; the supplied multiplayer harness made integration verifiable.","The source is labelled 1982; whether the film or a particular game adaptation was intended is unknown. I retained the supplied label and used native knowledge of the pulp-adventure premise.","Polishing one continuous adventure across keyboard/mouse, standard gamepads, touch, couch co-op and network co-op while retaining a single-file export.","Clarify the source edition and the expected standalone multiplayer mode. Retain the developer-tool and integration-harness requirements."],"aiHub":{"name":"Raiders of the Golden Goose","tagline":"Fortune favours the slightly reckless.","description":"Whip across a ruined river temple, redirect ancient sunlight and liberate a very valuable goose from rival treasure hunters. Make the swap, then outrun the temple's enormous objection in a complete solo or co-op pulp adventure.","type":"Game","genre":"Adventure","source":"Raiders of the Lost Ark (1982)","series":"Indiana Jones","players":"1–4","controls":"Left stick / WASD move; Square / LMB whip; R2 / RMB shoot; Cross / Space jump; Circle / Ctrl roll; Triangle / E interact; L2 / Shift sprint; Options / Esc pause.","tags":["3d","co-op","puzzle","low-poly","adventure","third-person"]}};
import * as THREE from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
const TITLE = "Raiders of the Golden Goose";
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const testMode = new URLSearchParams(location.search).get("test") === "1";
const DEFAULT_TUNING = Object.freeze({
  moveSpeed: 6.3,
  jumpPower: 8,
  whipReach: 3.7,
  enemyAggression: 1,
  trapTempo: 1,
  boulderSpeed: 6.8,
  damageScale: 1,
});
const tuning = { ...DEFAULT_TUNING };
const settings = {
  master: 0.7,
  music: 0.1,
  sfx: 0.8,
  glyphs: "PlayStation",
  zoom: 1,
  shake: 0.65,
  assist: true,
};
const safeStore = {
  get(key) {
    try {
      return localStorage.getItem("goldengoose:" + key);
    } catch {
      return null;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem("goldengoose:" + key, val);
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem("goldengoose:" + key);
    } catch {}
  },
};
if (!AIHub.active) {
  try {
    Object.assign(settings, JSON.parse(safeStore.get("settings") || "{}"));
  } catch {}
}
let scene,
  camera,
  renderer,
  physics,
  groundMat,
  actors,
  worldObjects,
  playerId = 0;
let actorsRoot,
  decorRoot,
  effectRoot,
  ambientTime = 0,
  renderTime = 0,
  shakeTime = 0;
let shadowLight,
  worldReady = false;
const cameraTarget = new THREE.Vector3(0, 0, -10);
const cameraPosition = new THREE.Vector3();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const materials = {};
// RGBA is used because WebGPU texture formats have no RGB8 equivalent.
const celTexture = new THREE.DataTexture(
  new Uint8Array([80, 80, 80, 255, 174, 174, 174, 255, 255, 255, 255, 255]),
  3,
  1,
  THREE.RGBAFormat,
);
celTexture.needsUpdate = true;
celTexture.minFilter = THREE.NearestFilter;
celTexture.magFilter = THREE.NearestFilter;
function toon(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materials[key])
    materials[key] = new THREE.MeshToonMaterial({ color, gradientMap: celTexture, ...options });
  return materials[key];
}
const inkMat = new THREE.MeshBasicMaterial({ color: 0x122526, side: THREE.BackSide });
const lineMat = new THREE.LineBasicMaterial({ color: 0x1d3231, transparent: true, opacity: 0.5 });
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 8),
  rock: new THREE.IcosahedronGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 7),
  leaf: new THREE.SphereGeometry(1, 6, 3),
  torus: new THREE.TorusGeometry(1, 0.13, 6, 20),
};
function mesh(g, m, parent, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, outline = false) {
  const obj = new THREE.Mesh(g, m);
  obj.position.set(x, y, z);
  obj.scale.set(sx, sy, sz);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  if (outline) {
    const ink = new THREE.Mesh(g, inkMat);
    ink.scale.setScalar(1.055);
    ink.castShadow = false;
    obj.add(ink);
  }
  return obj;
}
function box(parent, m, x, y, z, w, h, d, outline = false) {
  return mesh(geo.box, m, parent, x, y, z, w, h, d, outline);
}
const staticGroups = new Map();
const edgePositions = [];
const tempObj = new THREE.Object3D();
function stamp(g, m, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, edges = false) {
  const key = g.uuid + "/" + m.uuid;
  let batch = staticGroups.get(key);
  if (!batch) {
    batch = { g, m, matrices: [] };
    staticGroups.set(key, batch);
  }
  tempObj.position.set(x, y, z);
  tempObj.rotation.set(rx, ry, rz);
  tempObj.scale.set(sx, sy, sz);
  tempObj.updateMatrix();
  batch.matrices.push(tempObj.matrix.clone());
  if (edges) {
    const e = new THREE.EdgesGeometry(g, 30);
    const a = e.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).applyMatrix4(tempObj.matrix);
      edgePositions.push(v.x, v.y, v.z);
    }
    e.dispose();
  }
}
function finishStatic() {
  for (const b of staticGroups.values()) {
    const im = new THREE.InstancedMesh(b.g, b.m, b.matrices.length);
    b.matrices.forEach((mt, i) => im.setMatrixAt(i, mt));
    im.castShadow = true;
    im.receiveShadow = true;
    decorRoot.add(im);
  }
  staticGroups.clear();
  const eg = new THREE.BufferGeometry();
  eg.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  decorRoot.add(new THREE.LineSegments(eg, lineMat));
  edgePositions.length = 0;
}
function solid(x, y, z, w, h, d, options = {}) {
  const body = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
  const co = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(0.85);
  if (options.sensor) co.setSensor(true);
  const collider = physics.createCollider(co, body);
  return { body, collider };
}
function rngFactory(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
const artRand = rngFactory(19821105);
function makeLabel(text, w = 5, color = "#f1d99f", size = 52) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = "bold " + size + "px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64, 490);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), m);
  return plane;
}
function burst(x, y, z, color = 0xf5c666, n = 12, force = 4) {
  if (!worldObjects) return;
  for (let i = 0; i < n; i++) {
    const part = mesh(geo.rock, toon(color), effectRoot, x, y, z, 0.045 + artRand() * 0.09);
    worldObjects.particles.push({
      mesh: part,
      v: new THREE.Vector3((artRand() - 0.5) * force, artRand() * force + 1, (artRand() - 0.5) * force),
      life: 0.5 + artRand() * 0.6,
      max: 1,
    });
  }
}
function lineBetween(a, b, color = 0xf8cb75, width = 1) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: width }));
}
function clearEffects() {
  if (!worldObjects) return;
  for (const p of worldObjects.particles) {
    effectRoot.remove(p.mesh);
  }
  worldObjects.particles = [];
  for (const p of worldObjects.projectiles) {
    effectRoot.remove(p.mesh);
  }
  worldObjects.projectiles = [];
}
function resize() {
  if (!renderer) return;
  const w = innerWidth,
    h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(w, h, false);
  const span = (h > w ? 30 : 24) * settings.zoom;
  camera.left = (-span * w) / h / 2;
  camera.right = (span * w) / h / 2;
  camera.top = span / 2;
  camera.bottom = -span / 2;
  camera.updateProjectionMatrix();
}
function screenToWorld(cx, cy) {
  raycaster.setFromCamera(new THREE.Vector2((cx / innerWidth) * 2 - 1, (-cy / innerHeight) * 2 + 1), camera);
  const p = new THREE.Vector3();
  return raycaster.ray.intersectPlane(aimPlane, p);
}
async function initEngine() {
  await RAPIER.init();
  physics = new RAPIER.World({ x: 0, y: -22, z: 0 });
  physics.timestep = 1 / 60;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x426b68);
  scene.fog = new THREE.FogExp2(0x426b68, 0.009);
  camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 240);
  if (!AIHub.active || !AIHub.server) {
    renderer = new THREE.WebGPURenderer({
      canvas: $("scene"),
      antialias: true,
      powerPreference: "high-performance",
      forceWebGL: new URLSearchParams(location.search).has("webgl"),
    });
    renderer.setClearColor(0x426b68);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    await renderer.init();
    renderer.onDeviceLost = (info) => {
      window.__deviceLoss = info;
      console.error("GPU device lost: " + JSON.stringify(info));
      if (AIHub.active) AIHub.fail("The graphics device was lost.");
      $("loadtext").textContent = "The graphics device was lost. Reload to resume your checkpoint.";
      $("loading").hidden = false;
    };
  }
  scene.add(new THREE.HemisphereLight(0xfff0ce, 0x2b6566, 2.3));
  shadowLight = new THREE.DirectionalLight(0xffdc95, 3.1);
  shadowLight.position.set(-17, 30, 8);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.set(2048, 2048);
  shadowLight.shadow.camera.left = -24;
  shadowLight.shadow.camera.right = 24;
  shadowLight.shadow.camera.top = 28;
  shadowLight.shadow.camera.bottom = -28;
  shadowLight.shadow.camera.far = 90;
  shadowLight.shadow.bias = -0.0006;
  shadowLight.shadow.normalBias = 0.04;
  scene.add(shadowLight);
  scene.add(shadowLight.target);
  const rim = new THREE.DirectionalLight(0x8bdbd1, 1.1);
  rim.position.set(15, 12, -30);
  scene.add(rim);
  decorRoot = new THREE.Group();
  actorsRoot = new THREE.Group();
  effectRoot = new THREE.Group();
  scene.add(decorRoot, actorsRoot, effectRoot);
  resize();
  addEventListener("resize", resize);
  worldReady = true;
}

class PulpAudio {
  constructor() {
    this.ctx = null;
    this.nextNote = 0;
    this.note = 0;
    this.played = { music: 0, effects: 0, voices: 0 };
    this.muted = false;
    this.level = 0;
    this.lastVoice = 0;
  }
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = settings.master;
        this.music = this.ctx.createGain();
        this.music.gain.value = settings.music;
        this.sfx = this.ctx.createGain();
        this.sfx.gain.value = settings.sfx;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.music.connect(this.master);
        this.sfx.connect(this.master);
        this.master.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        const a = this.noise.getChannelData(0),
          r = rngFactory(903);
        for (let i = 0; i < a.length; i++) a[i] = r() * 2 - 1;
        this.nextNote = this.ctx.currentTime + 0.1;
      } catch {
        return;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }
  updateSettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : settings.master, t, 0.05);
    this.music.gain.setTargetAtTime(settings.music, t, 0.05);
    this.sfx.gain.setTargetAtTime(settings.sfx, t, 0.05);
  }
  tone(freq, time, duration, gain = 0.1, type = "triangle", dest = this.sfx, endFreq = null) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), time + duration);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.connect(g);
    g.connect(dest);
    o.start(time);
    o.stop(time + duration + 0.02);
  }
  hiss(duration, gain = 0.15, filter = 1700) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      t = c.currentTime,
      b = c.createBufferSource(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    b.buffer = this.noise;
    f.type = "bandpass";
    f.frequency.value = filter;
    f.Q.value = 0.6;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    b.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    b.start(t);
    b.stop(t + duration);
  }
  effect(kind) {
    if (!this.ctx || this.muted) return;
    this.played.effects++;
    const t = this.ctx.currentTime;
    switch (kind) {
      case "whip":
        this.hiss(0.16, 0.38, 2400);
        this.tone(180, t + 0.06, 0.07, 0.22, "sawtooth", this.sfx, 45);
        break;
      case "shot":
        this.hiss(0.22, 0.5, 950);
        this.tone(100, t, 0.15, 0.3, "square", this.sfx, 28);
        break;
      case "hit":
        this.tone(150, t, 0.13, 0.15, "sawtooth", this.sfx, 55);
        this.hiss(0.1, 0.1, 600);
        break;
      case "jump":
        this.tone(200, t, 0.18, 0.05, "triangle", this.sfx, 420);
        break;
      case "roll":
        this.hiss(0.25, 0.12, 500);
        break;
      case "pickup":
        [523, 659, 784].forEach((n, i) => this.tone(n, t + i * 0.07, 0.23, 0.08));
        break;
      case "lens":
        this.tone(330, t, 0.3, 0.1, "sine");
        this.tone(660, t + 0.1, 0.4, 0.07, "triangle");
        this.hiss(0.1, 0.1, 700);
        break;
      case "gate":
        this.hiss(1.3, 0.3, 190);
        this.tone(65, t, 1.1, 0.12, "sawtooth");
        break;
      case "grapple":
        this.hiss(0.35, 0.17, 1400);
        this.tone(220, t, 0.35, 0.08, "sine", this.sfx, 640);
        break;
      case "dart":
        this.hiss(0.13, 0.08, 3500);
        break;
      case "empty":
        this.tone(900, t, 0.035, 0.035, "square");
        break;
      case "ui":
        this.tone(440, t, 0.065, 0.035, "triangle");
        break;
      case "rumble":
        this.hiss(0.6, 0.27, 100);
        this.tone(38, t, 0.6, 0.18, "sawtooth");
        break;
      case "win":
        [262, 330, 392, 523, 659, 784, 1046].forEach((n, i) =>
          this.tone(n, t + i * 0.16, 0.65, 0.11, "triangle"),
        );
        break;
      case "fail":
        [220, 207, 196, 147].forEach((n, i) => this.tone(n, t + i * 0.2, 0.45, 0.08, "triangle"));
        break;
    }
  }
  voice(text, low = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (t - this.lastVoice < 0.6) return;
    this.lastVoice = t;
    this.played.voices++;
    const syllables = Math.min(22, Math.max(5, Math.floor(text.length / 4)));
    for (let i = 0; i < syllables; i++) {
      const base = (low ? 125 : 210) + ((text.charCodeAt(i % text.length) * 13 + i * 17) % 190);
      this.tone(base, t + i * 0.075, 0.063, 0.027, "sawtooth");
      this.tone(base * 2.3, t + i * 0.075, 0.04, 0.009, "sine");
    }
  }
  scheduleMusic(phase, t) {
    const melody = [
      0, 7, 12, 10, 7, 3, 5, 7, 0, 7, 12, 15, 14, 10, 7, 5, 3, 7, 10, 12, 7, 5, 3, 2, 0, 3, 7, 10, 7, 5, 2, 0,
    ];
    const fast = phase === "escape",
      beat = fast ? 0.205 : 0.32;
    while (this.nextNote < t + 0.12) {
      const k = this.note % 32,
        root = fast ? 146.83 : 130.81,
        n = melody[k],
        f = root * 2 ** (n / 12);
      this.tone(f, this.nextNote, beat * 0.83, 0.22, "triangle", this.music);
      if (k % 4 === 0) {
        this.tone(root / 2, this.nextNote, beat * 3, 0.23, "triangle", this.music);
        this.tone(f * 1.5, this.nextNote, beat * 1.8, 0.07, "sine", this.music);
      }
      if (k % 2 === 0) this.tone(k % 4 === 0 ? 60 : 120, this.nextNote, 0.11, 0.16, "sine", this.music, 24);
      this.note++;
      this.played.music++;
      this.nextNote += beat;
    }
  }
  tick(phase, dt) {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    this.updateSettings();
    const t = this.ctx.currentTime;
    if (this.nextNote < t - 0.5) this.nextNote = t + 0.05;
    this.scheduleMusic(phase, t);
    const bins = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(bins);
    this.level = Math.sqrt(bins.reduce((s, x) => s + x * x, 0) / bins.length);
  }
  async renderCheck() {
    const output = {};
    for (const kind of ["music", "effects", "voices"]) {
      const ctx = new OfflineAudioContext(1, 88200, 44100),
        a = new PulpAudio();
      a.ctx = ctx;
      a.master = ctx.createGain();
      a.master.gain.value = 0.7;
      a.music = ctx.createGain();
      a.music.gain.value = 0.1;
      a.sfx = ctx.createGain();
      a.sfx.gain.value = 0.8;
      a.music.connect(a.master);
      a.sfx.connect(a.master);
      a.master.connect(ctx.destination);
      a.noise = ctx.createBuffer(1, 44100, 44100);
      const noise = a.noise.getChannelData(0),
        r = rngFactory(903);
      for (let i = 0; i < noise.length; i++) noise[i] = r() * 2 - 1;
      a.lastVoice = -10;
      a.nextNote = 0.05;
      if (kind === "music") a.scheduleMusic("escape", 1.35);
      if (kind === "effects") {
        a.effect("whip");
        a.effect("shot");
      }
      if (kind === "voices") a.voice("Ancient warnings. Recent bullets. Promising.");
      const buffer = await ctx.startRendering(),
        samples = buffer.getChannelData(0);
      let energy = 0,
        peak = 0;
      for (const v of samples) {
        energy += v * v;
        peak = Math.max(peak, Math.abs(v));
      }
      output[kind] = {
        rms: Math.sqrt(energy / samples.length),
        peak,
        events: a.played[kind],
        gain: kind === "music" ? 0.1 : 0.8,
      };
    }
    return output;
  }
  stop() {
    this.muted = true;
    if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
  }
  resume() {
    this.muted = false;
    this.updateSettings();
  }
}
const audio = new PulpAudio();

const PALETTE = {
  stone: 0xc5a371,
  light: 0xe1c18b,
  dark: 0x987b54,
  edge: 0x655b44,
  sand: 0xc8b77d,
  moss: 0x547b55,
  leaf: 0x377465,
  lightleaf: 0x619277,
  trunk: 0x66553b,
  gold: 0xf4ba46,
  water: 0x285e61,
  red: 0x9f483b,
  teal: 0x388c89,
};
function stoneBlock(x, y, z, w, h, d, c = PALETTE.stone, edges = true) {
  stamp(geo.box, toon(c), x, y, z, w, h, d, 0, 0, 0, edges);
}
function ground(x1, x2, z1, z2, kind = "stone") {
  const lo = Math.min(z1, z2),
    hi = Math.max(z1, z2);
  solid((x1 + x2) / 2, -0.55, (lo + hi) / 2, x2 - x1, 1.1, hi - lo);
  stamp(geo.box, toon(0x4a5545), (x1 + x2) / 2, -0.43, (lo + hi) / 2, x2 - x1, 0.6, hi - lo);
  for (let x = x1 + 0.98; x < x2; x += 2)
    for (let z = lo + 0.98; z < hi; z += 2) {
      const c =
        kind === "sand"
          ? [0xb5a272, 0xc6b481, 0xb9ab7c][Math.floor(artRand() * 3)]
          : [0xc6ab7b, 0xb59b70, 0xd1b584, 0xbca174][Math.floor(artRand() * 4)];
      stamp(geo.box, toon(c), x, -0.14, z, 1.93, 0.28, 1.93, 0, 0, 0, false);
      if (artRand() < 0.13)
        stamp(
          geo.box,
          toon(PALETTE.moss),
          x + (artRand() - 0.5),
          0.015,
          z + (artRand() - 0.5),
          0.35 + artRand() * 0.8,
          0.025,
          0.2 + artRand() * 0.8,
          0,
          artRand() * 3,
          0,
        );
    }
}
function column(x, z, h = 4.5) {
  stoneBlock(x, 0.25, z, 1.5, 0.5, 1.5, PALETTE.dark);
  stoneBlock(x, 0.65, z, 1.2, 0.3, 1.2, PALETTE.light);
  stamp(geo.cylinder, toon(PALETTE.stone), x, h / 2 + 0.6, z, 0.47, h, 0.47, 0, 0, 0, true);
  for (let k = 1; k < 4; k++)
    stamp(geo.torus, toon(PALETTE.dark), x, 0.75 + (k * h) / 4, z, 0.49, 0.49, 0.49, Math.PI / 2);
  stoneBlock(x, h + 0.7, z, 1.4, 0.45, 1.4, PALETTE.light);
  solid(x, h / 2, z, 1.2, h, 1.2);
}
function arch(x, z, w = 7, h = 5) {
  column(x - w / 2, z, h);
  column(x + w / 2, z, h);
  stoneBlock(x, h + 1, z, w + 2, 1.1, 1.7, PALETTE.dark);
  stoneBlock(x, h + 1.65, z, w + 2.5, 0.3, 2, PALETTE.light);
  for (let i = -2; i <= 2; i++)
    stoneBlock(x + i * 1.05, h + 1.05, z + 0.88, 0.7, 0.55, 0.08, i === 0 ? PALETTE.gold : PALETTE.light);
  for (let side of [-1, 1]) {
    stamp(geo.cone, toon(PALETTE.gold), x + side * (w / 2), h + 2, z, 0.5, 0.8, 0.5);
  }
}
function palm(x, z, s = 1) {
  const lean = (artRand() - 0.5) * 0.25;
  stamp(geo.cylinder, toon(PALETTE.trunk), x, 3.8 * s, z, 0.3 * s, 7.6 * s, 0.3 * s, 0, 0, lean);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + artRand() * 0.2;
    stamp(
      geo.leaf,
      toon(k % 2 ? PALETTE.leaf : PALETTE.lightleaf),
      x + Math.sin(a) * 1.5 * s,
      7.7 * s,
      z + Math.cos(a) * 1.5 * s,
      0.65 * s,
      0.18 * s,
      2.8 * s,
      0.18,
      a,
      0.08,
    );
  }
  for (let k = 0; k < 3; k++)
    stamp(
      geo.sphere,
      toon(PALETTE.trunk),
      x + (artRand() - 0.5) * 0.6 * s,
      7 * s,
      z + (artRand() - 0.5) * 0.6 * s,
      0.23 * s,
    );
}
function fern(x, z, s = 1) {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    stamp(
      geo.leaf,
      toon(k % 2 ? PALETTE.moss : PALETTE.leaf),
      x + Math.sin(a) * 0.45 * s,
      0.35 * s,
      z + Math.cos(a) * 0.45 * s,
      0.22 * s,
      0.12 * s,
      1.1 * s,
      -0.4,
      a,
      0,
    );
  }
}
function brazier(x, z) {
  stoneBlock(x, 0.4, z, 0.7, 0.8, 0.7, PALETTE.edge);
  stamp(geo.cylinder, toon(PALETTE.gold), x, 0.95, z, 0.44, 0.3, 0.44);
  const flame = new THREE.Group();
  flame.position.set(x, 1.3, z);
  mesh(geo.cone, new THREE.MeshBasicMaterial({ color: 0xffa23c }), flame, 0, 0, 0, 0.22, 0.8, 0.22);
  mesh(geo.cone, new THREE.MeshBasicMaterial({ color: 0xffe8a0 }), flame, 0, -0.1, 0.05, 0.12, 0.5, 0.12);
  decorRoot.add(flame);
  worldObjects.flames.push(flame);
}
function makeGoose(parent, scale = 1) {
  const goose = new THREE.Group();
  parent.add(goose);
  goose.scale.setScalar(scale);
  const gold = toon(PALETTE.gold),
    shade = toon(0xc4882d);
  mesh(geo.sphere, gold, goose, 0, 0.45, 0, 0.56, 0.43, 0.8, true);
  mesh(geo.sphere, shade, goose, 0.48, 0.51, -0.05, 0.12, 0.28, 0.48, true);
  mesh(geo.sphere, shade, goose, -0.48, 0.51, -0.05, 0.12, 0.28, 0.48, true);
  mesh(geo.cylinder, gold, goose, 0, 0.98, -0.4, 0.16, 0.78, 0.16, true);
  mesh(geo.sphere, gold, goose, 0, 1.4, -0.47, 0.29, 0.26, 0.32, true);
  mesh(geo.cone, toon(0xee8c32), goose, 0, 1.36, -0.86, 0.15, 0.4, 0.15, true).rotation.x = -Math.PI / 2;
  for (let s of [-1, 1]) {
    mesh(geo.sphere, inkMat, goose, s * 0.235, 1.46, -0.61, 0.055);
    box(goose, shade, s * 0.23, 0.07, 0.06, 0.26, 0.07, 0.45);
  }
  return goose;
}
function makeExplorer(colorIndex = 0, enemy = false, boss = false) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.name = "rig";
  root.add(rig);
  const jacket = toon(
    enemy ? (boss ? 0x754b3e : 0x756b4a) : [0x966241, 0x398985, 0xb37046, 0x71855a][colorIndex % 4],
  );
  const shirt = toon(enemy ? 0xbeb485 : 0xead3a4),
    skin = toon([0xd59b68, 0xb87b55, 0xdfb37a, 0x9a674e][colorIndex % 4]),
    pants = toon(enemy ? 0x434c45 : 0x5b6256),
    boot = toon(0x383d35),
    band = toon(enemy ? 0x6a312a : [0xd7a445, 0xe3b871, 0x5aada6, 0xc37b5d][colorIndex % 4]);
  const body = new THREE.Group();
  body.name = "torso";
  body.position.y = 1.03;
  rig.add(body);
  box(body, jacket, 0, 0.09, 0, 0.68, 0.69, 0.36, true);
  box(body, shirt, 0, 0.13, -0.193, 0.27, 0.56, 0.045);
  box(body, boot, 0, -0.16, -0.01, 0.72, 0.1, 0.4);
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 1.67, 0);
  rig.add(head);
  mesh(geo.sphere, skin, head, 0, 0, 0, 0.27, 0.31, 0.25, true);
  box(head, toon(0x4b3e31), 0, 0.11, 0.07, 0.49, 0.2, 0.33);
  for (let s of [-1, 1]) box(head, toon(0x16272b), s * 0.1, 0.02, -0.24, 0.04, 0.055, 0.02);
  box(head, skin, 0, -0.02, -0.29, 0.08, 0.09, 0.12);
  if (!enemy || boss) {
    mesh(geo.cylinder, toon(enemy ? 0x594a3a : 0x9c7443), head, 0, 0.27, 0, 0.46, 0.075, 0.4, true);
    mesh(geo.cylinder, toon(enemy ? 0x594a3a : 0x9c7443), head, 0, 0.4, 0, 0.29, 0.25, 0.27, true);
    mesh(geo.cylinder, band, head, 0, 0.3, 0, 0.295, 0.055, 0.275);
  } else {
    mesh(geo.cylinder, toon(0x665d45), head, 0, 0.27, 0, 0.31, 0.16, 0.3, true);
    box(head, boot, 0, 0.23, -0.3, 0.5, 0.05, 0.24);
  }
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = s < 0 ? "legL" : "legR";
    leg.position.set(s * 0.2, 0.77, 0);
    rig.add(leg);
    box(leg, pants, 0, -0.24, 0, 0.25, 0.53, 0.29, true);
    box(leg, boot, 0, -0.57, -0.06, 0.29, 0.17, 0.43, true);
    const arm = new THREE.Group();
    arm.name = s < 0 ? "armL" : "armR";
    arm.position.set(s * 0.46, 1.32, 0);
    rig.add(arm);
    box(arm, jacket, 0, -0.22, 0, 0.24, 0.43, 0.27, true);
    mesh(geo.sphere, skin, arm, 0, -0.49, -0.015, 0.135, 0.16, 0.13, true);
  }
  const satchel = box(rig, toon(0x6b4d32), 0.38, 0.84, 0.2, 0.29, 0.4, 0.22, true);
  satchel.rotation.z = -0.15;
  box(rig, band, -0.1, 1.08, -0.21, 0.075, 0.8, 0.04).rotation.z = -0.55;
  const gun = new THREE.Group();
  gun.name = "gun";
  rig.getObjectByName("armL").add(gun);
  box(gun, boot, 0, -0.5, -0.18, 0.12, 0.13, 0.48, true);
  box(gun, toon(0x7d6749), 0, -0.61, -0.06, 0.12, 0.21, 0.13);
  gun.visible = enemy;
  const loop = mesh(geo.torus, toon(0x61452e), rig, 0.48, 0.7, -0.1, 0.2, 0.3, 0.2);
  loop.rotation.y = 0.2;
  const mixer = new THREE.AnimationMixer(rig),
    clips = {};
  function clip(name, duration, tracks) {
    const c = new THREE.AnimationClip(name, duration, tracks);
    clips[name] = mixer.clipAction(c);
    return clips[name];
  }
  const track = (path, ts, vs) => new THREE.NumberKeyframeTrack(path, ts, vs);
  clip("idle", 2, [
    track("torso.position[y]", [0, 1, 2], [1.03, 1.065, 1.03]),
    track("head.rotation[z]", [0, 1, 2], [0.025, -0.025, 0.025]),
  ]);
  const ts = [0, 0.15, 0.3, 0.45, 0.6];
  clip("run", 0.6, [
    track("legL.rotation[x]", ts, [-0.65, 0, 0.65, 0, -0.65]),
    track("legR.rotation[x]", ts, [0.65, 0, -0.65, 0, 0.65]),
    track("armL.rotation[x]", ts, [0.6, 0, -0.6, 0, 0.6]),
    track("armR.rotation[x]", ts, [-0.6, 0, 0.6, 0, -0.6]),
    track("torso.position[y]", ts, [1.02, 1.09, 1.02, 1.09, 1.02]),
  ]);
  clip("whip", 0.43, [
    track("armR.rotation[x]", [0, 0.12, 0.21, 0.43], [-0.1, -2.9, -1.3, 0]),
    track("armR.rotation[z]", [0, 0.12, 0.21, 0.43], [0, -0.4, 0.55, 0]),
    track("torso.rotation[y]", [0, 0.12, 0.23, 0.43], [0, -0.4, 0.5, 0]),
  ]);
  clip("shoot", 0.25, [track("armL.rotation[x]", [0, 0.06, 0.13, 0.25], [-1.5, -1.8, -1.55, 0])]);
  clip("jump", 0.7, [
    track("legL.rotation[x]", [0, 0.2, 0.5, 0.7], [0, -0.65, -0.4, 0]),
    track("legR.rotation[x]", [0, 0.2, 0.5, 0.7], [0, 0.35, 0.6, 0]),
    track("armR.rotation[x]", [0, 0.2, 0.5, 0.7], [0, -2.2, -1.5, 0]),
    track("armL.rotation[x]", [0, 0.2, 0.5, 0.7], [0, -1.9, -1.1, 0]),
  ]);
  clip("roll", 0.5, [
    track("rig.rotation[x]", [0, 0.125, 0.25, 0.375, 0.5], [0, -Math.PI / 2, -Math.PI, -Math.PI * 1.5, -TAU]),
    track("rig.position[y]", [0, 0.2, 0.35, 0.5], [0, 0.5, 0.4, 0]),
  ]);
  clip("grapple", 1.15, [
    track("armR.rotation[x]", [0, 0.2, 0.85, 1.15], [-1, -3, -2.9, 0]),
    track("legL.rotation[x]", [0, 0.4, 0.85, 1.15], [0, -0.8, 0.3, 0]),
    track("legR.rotation[x]", [0, 0.4, 0.85, 1.15], [0, -0.6, 0.6, 0]),
  ]);
  clip("down", 0.7, [
    track("rig.rotation[z]", [0, 0.3, 0.7], [0, 1.2, Math.PI / 2]),
    track("rig.position[y]", [0, 0.4, 0.7], [0, -0.2, -0.2]),
  ]);
  clips.idle.play();
  let base = "idle",
    oneShot = "";
  return {
    root,
    rig,
    mixer,
    clips,
    gun,
    animate(name, move = 0, dt = 1 / 60) {
      const target = move > 0.2 ? "run" : "idle";
      if (target !== base) {
        clips[base].fadeOut(0.15);
        clips[target].reset().fadeIn(0.15).play();
        base = target;
      }
      clips.run.timeScale = Math.max(0.65, move / 5);
      if (name && name !== oneShot && clips[name]) {
        if (oneShot && clips[oneShot]) clips[oneShot].fadeOut(0.08);
        const a = clips[name];
        a.reset().setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = false;
        a.fadeIn(0.04).play();
        oneShot = name;
      }
      if (!name) oneShot = "";
      mixer.update(dt);
    },
  };
}
function makeSnake() {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  for (let i = 0; i < 7; i++) {
    const part = mesh(
      geo.sphere,
      toon(i % 2 ? 0x6e8050 : 0x9a9a57),
      body,
      Math.sin(i * 0.9) * 0.13,
      0.14,
      -i * 0.16,
      0.18 - i * 0.013,
      0.15,
      0.23,
      true,
    );
    part.name = "coil" + i;
  }
  const head = mesh(geo.sphere, toon(0x9da468), body, 0, 0.22, 0.2, 0.23, 0.2, 0.3, true);
  for (let s of [-1, 1]) mesh(geo.sphere, toon(0xf3bf57), head, s * 0.7, 0.25, 0.55, 0.1);
  const mixer = new THREE.AnimationMixer(body),
    tracks = [];
  for (let i = 0; i < 7; i++)
    tracks.push(
      new THREE.NumberKeyframeTrack(
        "coil" + i + ".position[x]",
        [0, 0.3, 0.6, 0.9, 1.2],
        [
          Math.sin(i) * 0.15,
          Math.sin(i + 1.5) * 0.15,
          Math.sin(i + 3) * 0.15,
          Math.sin(i + 4.5) * 0.15,
          Math.sin(i) * 0.15,
        ],
      ),
    );
  mixer.clipAction(new THREE.AnimationClip("slither", 1.2, tracks)).play();
  return {
    root,
    mixer,
    animate(name, move, dt) {
      mixer.update(dt);
    },
  };
}
function makePickup(kind, x, z, id) {
  const group = new THREE.Group();
  group.position.set(x, 0.55, z);
  decorRoot.add(group);
  if (kind === "treasure") {
    mesh(geo.rock, toon(PALETTE.gold), group, 0, 0.12, 0, 0.3, 0.42, 0.3, true);
    mesh(geo.torus, toon(PALETTE.gold), group, 0, 0.14, 0, 0.55, 0.55, 0.55).rotation.x = Math.PI / 2;
  } else {
    box(group, toon(kind === "health" ? 0xe2cfa4 : 0x72573a), 0, 0, 0, 0.7, 0.5, 0.5, true);
    if (kind === "health") {
      box(group, toon(0xaf5945), 0, 0.27, 0, 0.12, 0.02, 0.38);
      box(group, toon(0xaf5945), 0, 0.275, 0, 0.4, 0.02, 0.12);
    } else
      for (let i = 0; i < 3; i++)
        mesh(geo.cylinder, toon(0xe5b660), group, (i - 1) * 0.17, 0.35, 0, 0.05, 0.22, 0.05);
  }
  const aura = mesh(
    geo.torus,
    new THREE.MeshBasicMaterial({
      color: kind === "treasure" ? 0xffc654 : 0xaed7b9,
      transparent: true,
      opacity: 0.5,
    }),
    group,
    0,
    -0.47,
    0,
    0.65,
    0.65,
    0.65,
  );
  aura.rotation.x = Math.PI / 2;
  return { id, kind, x, z, mesh: group, taken: false };
}
function createEnemy(kind, x, z, id) {
  const actor = kind === "snake" ? makeSnake() : makeExplorer(2, true, kind === "boss");
  actorsRoot.add(actor.root);
  actor.root.position.set(x, 0, z);
  const maxHp = kind === "boss" ? 9 : kind === "snake" ? 2 : 3;
  const radius = kind === "snake" ? 0.3 : 0.36,
    half = kind === "snake" ? 0.12 : 0.46;
  const body = physics.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, half + radius + 0.06, z)
      .lockRotations()
      .setLinearDamping(6)
      .setCcdEnabled(true),
  );
  const collider = physics.createCollider(RAPIER.ColliderDesc.capsule(half, radius).setMass(2), body);
  const hpRoot = new THREE.Group();
  hpRoot.position.y = kind === "snake" ? 0.9 : 2.25;
  box(hpRoot, toon(0x253936), 0, 0, 0, 1, 0.085, 0.07);
  const bar = box(hpRoot, toon(kind === "boss" ? 0xf0ab52 : 0xc67652), 0, 0, -0.02, 0.95, 0.06, 0.08);
  actor.root.add(hpRoot);
  hpRoot.visible = false;
  return {
    id,
    kind,
    x,
    z,
    y: 0,
    angle: 0,
    hp: maxHp,
    maxHp,
    body,
    collider,
    actor,
    bar,
    hpRoot,
    cooldown: 1 + id * 0.2,
    stun: 0,
    telegraph: 0,
    dead: false,
    spawn: { x, z },
    height: half + radius + 0.06,
  };
}
function createWorld() {
  worldObjects = {
    mirrors: [],
    flames: [],
    particles: [],
    projectiles: [],
    enemies: [],
    pickups: [],
    traps: [],
    rubble: [],
    beams: [],
    door: null,
    sideDoor: null,
    boulder: null,
    goose: null,
  };
  ground(-10, 10, 14, -17, "sand");
  ground(-10, 10, -24, -58);
  ground(-12, 12, -58, -84);
  ground(10, 26, -70, -80);
  ground(16, 26, -80, -49);
  ground(16, 26, -45, 24, "sand");
  // The river is real negative space in the collision world.
  stamp(geo.box, toon(0x173d45), 0, -4, -20.5, 75, 1, 7);
  stamp(geo.box, toon(PALETTE.water), 0, -3.15, -20.5, 75, 0.08, 6.7);
  stamp(geo.box, toon(PALETTE.water), 21, -3.1, -47, 10, 0.08, 4);
  for (let k = 0; k < 32; k++)
    stamp(
      geo.box,
      toon(k % 2 ? 0x448a85 : 0x3a7779),
      -34 + k * 2.2,
      -3.09,
      -20.5 + (artRand() - 0.5) * 4,
      1.3,
      0.02,
      0.07,
    );
  for (const z of [-17, -24]) {
    stoneBlock(0, -0.25, z, 20, 0.6, 0.5, PALETTE.dark);
    for (const x of [-9, -6, 6, 9]) stoneBlock(x, 0.28, z, 1, 0.6, 0.7, PALETTE.stone);
  }
  for (let z = 9; z > -17; z -= 6)
    for (const x of [-10.4, 10.4]) {
      stoneBlock(x, 0.45, z, 1, 0.9, 4, PALETTE.dark);
      solid(x, 0.45, z, 1, 0.9, 4);
    }
  for (let z = -28; z > -82; z -= 6)
    for (const x of [-11, 11]) {
      if (x === 11 && z === -76) continue;
      stoneBlock(x, 1.2, z, 1.4, 2.4, 5.8, PALETTE.dark);
      solid(x, 1.2, z, 1.4, 2.4, 5.8);
      stoneBlock(x, 2.55, z, 1.7, 0.3, 5.9, PALETTE.light);
    }
  for (let z = -31; z > -80; z -= 12) for (const x of [-8.6, 8.6]) column(x, z, z < -58 ? 5 : 3.7);
  arch(0, -27, 13, 4.5);
  arch(0, -57.5, 6, 5.5);
  for (const x of [-7.8, 7.8]) {
    stoneBlock(x, 1.65, -57.5, 9, 3.3, 1.2, PALETTE.dark);
    solid(x, 1.65, -57.5, 9, 3.3, 1.2);
  }
  arch(0, -82, 13, 6);
  arch(21, 16, 8, 4);
  // Stepped skyline, reliefs and small shrines.
  for (let s = 0; s < 5; s++)
    stoneBlock(
      0,
      1 + s * 1.3,
      -86 - s * 0.9,
      29 - s * 3,
      1.3,
      6 + s * 0.4,
      s % 2 ? PALETTE.dark : PALETTE.stone,
    );
  for (let i = -3; i <= 3; i++) {
    stoneBlock(i * 3.5, 3, -83.7, 2.3, 2.9, 0.25, PALETTE.light);
    stamp(geo.rock, toon(PALETTE.gold), i * 3.5, 3.1, -83.4, 0.65, 0.85, 0.1, 0, Math.PI / 4);
  }
  for (let z = -76; z < 18; z += 6)
    for (const x of [15.5, 26.5]) {
      if (x === 15.5 && z === -76) continue;
      stoneBlock(x, 0.65, z, 1, 1.3, 5.8, PALETTE.dark);
      solid(x, 0.65, z, 1, 1.3, 5.8);
      if (z % 12 === -4) column(x, z, 3.2);
    }
  for (let z = -80; z < 18; z += 14) {
    brazier(25.4, z);
    stamp(geo.cone, toon(PALETTE.gold), 16.8, 0.12, z + 3, 0.35, 0.05, 0.6, 0, Math.PI);
  }
  for (let i = 0; i < 45; i++) {
    const side = i % 2 ? 1 : -1,
      x = side * (13 + artRand() * 16),
      z = 18 - artRand() * 108;
    if (x > 14 && x < 28 && z > -81 && z < 26) continue;
    palm(x, z, 0.7 + artRand() * 0.65);
    for (let k = 0; k < 2; k++) fern(x + (artRand() - 0.5) * 5, z + (artRand() - 0.5) * 4, 0.7 + artRand());
  }
  for (let i = 0; i < 65; i++) {
    const side = i % 2 ? 1 : -1,
      z = 12 - artRand() * 90;
    fern(side * (8.7 + artRand() * 2), z, 0.6 + artRand() * 0.7);
  }
  for (let i = 0; i < 30; i++) {
    const x = -9 + artRand() * 18,
      z = 10 - artRand() * 90;
    if (Math.abs(x) < 4 || z < -70 || Math.abs(z + 20) < 6) continue;
    stamp(
      geo.rock,
      toon(i % 2 ? PALETTE.dark : PALETTE.moss),
      x,
      0.15,
      z,
      0.2 + artRand() * 0.5,
      0.3 + artRand() * 0.4,
      0.4,
      0,
      artRand() * 4,
    );
  }
  // Camp at the start, including a route map and a very optimistic exit sign.
  stamp(geo.cone, toon(0xd7bd80), -6, 1.3, 9, 2.4, 2.7, 2.1, 0, Math.PI / 4);
  stoneBlock(-6, 0.05, 8, 3, 0.1, 2, 0x3d5446);
  for (let x of [-7.5, -6, -4.5]) {
    stoneBlock(x, 0.35, 10.4, 0.9, 0.7, 0.8, 0x74563a);
  }
  const sign = makeLabel("QUINN & CO.  ·  BASE CAMP", 6.2, "#e9d3a0", 31);
  sign.position.set(-5, 2.8, 10);
  decorRoot.add(sign);
  const anchor = new THREE.Group();
  anchor.position.set(0, 6.5, -20.5);
  mesh(geo.torus, toon(PALETTE.gold), anchor, 0, 0, 0, 0.8, 0.8, 0.8, true);
  mesh(geo.cylinder, toon(PALETTE.edge), anchor, 0, 1.8, 0, 0.12, 2.8, 0.12);
  decorRoot.add(anchor);
  worldObjects.anchor = anchor;
  const marker = makeLabel("WHIP ANCHOR", 3.6, "#ffd080", 43);
  marker.position.set(0, 8, -20.5);
  decorRoot.add(marker);
  // Light puzzle. Cardinal routes are legible both from beams and the expedition journal.
  const mirrorData = [
    [-6, -36, 0, 1, "I"],
    [6, -36, 2, 0, "II"],
    [6, -49, 1, 3, "III"],
  ];
  mirrorData.forEach(([x, z, rotation, correct, label], id) => {
    const base = new THREE.Group();
    base.position.set(x, 0, z);
    decorRoot.add(base);
    box(base, toon(PALETTE.dark), 0, 0.3, 0, 1.65, 0.6, 1.65, true);
    mesh(geo.cylinder, toon(PALETTE.stone), base, 0, 0.9, 0, 0.48, 1, 0.48, true);
    const rotor = new THREE.Group();
    rotor.position.y = 1.8;
    base.add(rotor);
    mesh(geo.torus, toon(PALETTE.gold), rotor, 0, 0, 0, 0.66, 0.66, 0.66, true);
    const mirror = mesh(
      geo.cylinder,
      toon(0x9ed9ca, { emissive: 0x1d4b48, emissiveIntensity: 0.4 }),
      rotor,
      0,
      0,
      0,
      0.53,
      0.08,
      0.53,
    );
    mirror.rotation.x = Math.PI / 2;
    const arrow = mesh(geo.cone, toon(PALETTE.gold), rotor, 0, 0.02, -0.92, 0.18, 0.5, 0.18);
    arrow.rotation.x = -Math.PI / 2;
    const text = makeLabel(label, 1.3);
    text.position.set(0, 0.7, 0.88);
    base.add(text);
    solid(x, 0.75, z, 1.5, 1.5, 1.5);
    worldObjects.mirrors.push({ id, x, z, rotation, correct, rotor, base, powered: false });
  });
  const receiver = new THREE.Group();
  receiver.position.set(0, 0, -49);
  decorRoot.add(receiver);
  box(receiver, toon(PALETTE.dark), 0, 0.35, 0, 1.2, 0.7, 1.2, true);
  mesh(geo.cylinder, toon(PALETTE.stone), receiver, 0, 1.05, 0, 0.3, 1.1, 0.3, true);
  const receiverMaterial = new THREE.MeshBasicMaterial({ color: 0x9a8351 });
  worldObjects.receiver = mesh(geo.torus, receiverMaterial, receiver, 0, 1.82, 0, 0.67, 0.67, 0.67, true);
  solid(0, 1, -49, 1.1, 2, 1.1);
  for (let z = -50.4; z > -56.5; z -= 1) stoneBlock(0, 0.013, z, 0.09, 0.025, 0.6, PALETTE.gold, false);
  const sun = new THREE.Group();
  sun.position.set(-6, 1.8, -28.8);
  mesh(geo.torus, toon(PALETTE.gold), sun, 0, 0, 0, 0.9, 0.9, 0.9);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    mesh(
      geo.cone,
      toon(PALETTE.gold),
      sun,
      Math.sin(a) * 1.2,
      Math.cos(a) * 1.2,
      0,
      0.12,
      0.4,
      0.12,
    ).rotation.z = -a;
  }
  decorRoot.add(sun);
  const plaque = makeLabel("FOLLOW THE SUN  ·  I → II → III → VAULT", 12, "#f0d49a", 29);
  plaque.position.set(0, 4.8, -28);
  decorRoot.add(plaque);
  // The sealed vault door moves on a native animation track.
  const door = new THREE.Group();
  door.name = "vaultDoor";
  door.position.set(0, 0, -57.5);
  box(door, toon(PALETTE.dark), 0, 2, 0, 5.8, 4.5, 0.8, true);
  for (let i = -1; i <= 1; i++) {
    box(door, toon(PALETTE.gold), i * 1.8, 2, -0.43, 0.14, 3.3, 0.07);
    mesh(geo.rock, toon(PALETTE.light), door, i * 1.8, 2, 0.45, 0.32, 0.65, 0.12);
  }
  decorRoot.add(door);
  const ds = solid(0, 2, -57.5, 5.8, 4.5, 0.8);
  const dm = new THREE.AnimationMixer(door);
  const dc = new THREE.AnimationClip("open", 2.1, [
    new THREE.NumberKeyframeTrack(".position[y]", [0, 2.1], [0, 5.5]),
  ]);
  worldObjects.door = {
    mesh: door,
    body: ds.body,
    collider: ds.collider,
    mixer: dm,
    action: dm.clipAction(dc),
  };
  for (const x of [-8, -4, 4, 8]) brazier(x, -54);
  for (const x of [-9, 9]) for (const z of [-64, -77]) brazier(x, z);
  const pedestal = new THREE.Group();
  pedestal.position.set(0, 0, -77);
  decorRoot.add(pedestal);
  box(pedestal, toon(PALETTE.dark), 0, 0.25, 0, 3, 0.5, 3, true);
  box(pedestal, toon(PALETTE.light), 0, 0.9, 0, 2, 1, 2, true);
  box(pedestal, toon(PALETTE.gold), 0, 1.46, 0, 2.3, 0.12, 2.3, true);
  worldObjects.goose = makeGoose(pedestal, 0.85);
  worldObjects.goose.position.y = 1.55;
  const gooseSign = makeLabel("THE GOLDEN GOOSE", 5.5, "#ffe0a0", 43);
  gooseSign.position.set(0, 4, -80);
  decorRoot.add(gooseSign);
  const side = new THREE.Group();
  side.position.set(11.2, 0, -74.8);
  box(side, toon(PALETTE.dark), 0, 1.7, 0, 0.7, 3.4, 5, true);
  box(side, toon(PALETTE.gold), -0.4, 1.7, 0, 0.05, 2.2, 0.25);
  decorRoot.add(side);
  const sb = solid(11.2, 1.7, -74.8, 0.7, 3.4, 5);
  worldObjects.sideDoor = { mesh: side, body: sb.body, collider: sb.collider };
  const escapeSign = makeLabel("RIVER EXIT  →", 4.3, "#f0d89f", 42);
  escapeSign.position.set(5.5, 3.1, -76);
  decorRoot.add(escapeSign);
  for (const [x, z, kind, id] of [
    [-7, -10, "treasure", 0],
    [-7, -48, "treasure", 1],
    [7, -79, "treasure", 2],
    [6, -28, "health", 3],
    [-7, -63, "health", 4],
    [23, -31, "health", 5],
    [4, 0, "ammo", 6],
    [-4, -52, "ammo", 7],
    [24, -65, "ammo", 8],
    [7, -66, "ammo", 9],
  ])
    worldObjects.pickups.push(makePickup(kind, x, z, id));
  for (const [kind, x, z] of [
    ["snake", -4, -3],
    ["snake", 4, -9],
    ["snake", -4, -28],
    ["hunter", 3, -31],
    ["hunter", -5, -44],
    ["hunter", 4, -63],
    ["hunter", -6, -70],
    ["boss", 0, -69],
  ])
    worldObjects.enemies.push(createEnemy(kind, x, z, worldObjects.enemies.length));
  const trapData = [
    [-6, "dart", "main"],
    [-31, "dart", "main"],
    [-51, "spike", "main"],
    [-64, "dart", "escape"],
    [-55, "spike", "escape"],
    [-25, "dart", "escape"],
    [-4, "spike", "escape"],
  ];
  trapData.forEach(([z, kind, zone], id) => {
    const cx = zone === "main" ? 0 : 21,
      w = zone === "main" ? 17 : 8,
      group = new THREE.Group();
    group.position.set(cx, 0, z);
    decorRoot.add(group);
    box(group, toon(0x655c45), 0, 0.025, 0, w, 0.05, 1.8);
    for (let x = -w / 2 + 0.4; x < w / 2; x += 0.7) {
      if (kind === "spike") mesh(geo.cone, toon(0x8f9784), group, x, -0.3, 0, 0.14, 0.8, 0.14);
      else {
        box(group, toon(0xd19a55), x, 0.065, -0.55, 0.36, 0.05, 0.08);
        box(group, toon(0xd19a55), x, 0.065, 0.55, 0.36, 0.05, 0.08);
      }
    }
    const warning = box(
      group,
      new THREE.MeshBasicMaterial({ color: 0xf38d4e, transparent: true, opacity: 0 }),
      0,
      0.09,
      0,
      w,
      0.02,
      1.7,
    );
    worldObjects.traps.push({
      id,
      z,
      kind,
      zone,
      mesh: group,
      warning,
      clock: id * 0.73,
      active: false,
      fired: false,
    });
    if (kind === "dart") {
      for (const side of [-1, 1]) {
        stoneBlock(cx + side * (w / 2 + 0.3), 1, z, 0.6, 2.1, 2.2, PALETTE.dark);
        for (let k = 0; k < 3; k++)
          stamp(
            geo.cylinder,
            toon(0x2f423b),
            cx + side * (w / 2 + 0.65),
            0.7 + k * 0.35,
            z,
            0.13,
            0.1,
            0.13,
            0,
            0,
            Math.PI / 2,
          );
      }
    }
  });
  for (const z of [-39, -17, 6]) {
    const x = 21 + (z === -17 ? 1.8 : -1.6);
    const body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 0.55, z).setLinearDamping(1),
    );
    physics.createCollider(RAPIER.ColliderDesc.cuboid(0.7, 0.55, 0.65).setMass(5), body);
    const obj = box(decorRoot, toon(0x9c7751), x, 0.55, z, 1.4, 1.1, 1.3, true);
    worldObjects.rubble.push({ body, mesh: obj });
  }
  const boulderMesh = mesh(geo.rock, toon(0x8c8d72), actorsRoot, 21, 2.7, -82, 2.6, 2.6, 2.6, true);
  boulderMesh.visible = false;
  const bb = physics.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(21, 2.6, -82),
  );
  const bc = physics.createCollider(RAPIER.ColliderDesc.ball(2.6).setFriction(1), bb);
  bc.setEnabled(false);
  worldObjects.boulder = { mesh: boulderMesh, body: bb, collider: bc, z: -82, active: false };
  // A waiting launch, the unmistakable destination of the escape.
  const boat = new THREE.Group();
  boat.position.set(21, -0.1, 28);
  decorRoot.add(boat);
  box(boat, toon(0x624e38), 0, 0.2, 0, 3.8, 0.7, 6, true);
  box(boat, toon(0xddd0a2), 0, 0.8, -1, 3.4, 0.7, 2.2, true);
  box(boat, toon(0x3b6965), 0, 1.1, -1, 2.8, 0.3, 1.8);
  mesh(geo.cone, toon(0x624e38), boat, 0, 0.2, 3.2, 2, 2.4, 2, true).rotation.x = Math.PI / 2;
  const escapeFlag = makeLabel("HOME. MORE OR LESS.", 6.5, "#ffe1a0", 37);
  escapeFlag.position.set(21, 4, 23);
  decorRoot.add(escapeFlag);
  finishStatic();
  updateMirrors(true);
}
function updateMirrors(instant = false) {
  if (!worldObjects) return;
  for (const beam of worldObjects.beams) {
    decorRoot.remove(beam);
    beam.geometry.dispose();
    beam.material.dispose();
  }
  worldObjects.beams = [];
  const mirrors = worldObjects.mirrors;
  let powered = true;
  const add = (a, b, hot) => {
    const line = lineBetween(
      new THREE.Vector3(a.x, 1.82, a.z),
      new THREE.Vector3(b.x, 1.82, b.z),
      hot ? 0xffdf85 : 0x56817a,
      hot ? 0.98 : 0.3,
    );
    decorRoot.add(line);
    worldObjects.beams.push(line);
    if (hot) {
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, dist(a, b), 6),
        new THREE.MeshBasicMaterial({ color: 0xffd071, transparent: true, opacity: 0.7 }),
      );
      glow.position.set((a.x + b.x) / 2, 1.82, (a.z + b.z) / 2);
      glow.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(),
      );
      decorRoot.add(glow);
      worldObjects.beams.push(glow);
    }
  };
  add({ x: -6, z: -28.8 }, mirrors[0], true);
  worldObjects.receiver.material.color.setHex(
    mirrors.every((m) => m.rotation === m.correct) ? 0xffdc7d : 0x9a8351,
  );
  mirrors.forEach((m, i) => {
    m.powered = powered;
    if (instant) m.rotor.rotation.y = (-m.rotation * Math.PI) / 2;
    const directions = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ],
      v = directions[m.rotation];
    const correct = m.rotation === m.correct;
    const next = correct
      ? i < 2
        ? mirrors[i + 1]
        : { x: 0, z: -49 }
      : { x: m.x + v[0] * 4, z: m.z + v[1] * 4 };
    add(m, next, powered);
    powered = powered && correct;
  });
}

function keyName(e) {
  if (e.code === "ShiftRight") return "rshift";
  const k = (e.key || "").toLowerCase();
  if (k === " " || e.code === "Space") return "space";
  return k;
}
const PS = {
  jump: ["×", "cross"],
  roll: ["○", "circle"],
  whip: ["□", "square"],
  interact: ["△", "triangle"],
  shoot: ["R2", ""],
  sprint: ["L2", ""],
  pause: ["OPTIONS", ""],
  confirm: ["×", "cross"],
  back: ["○", "circle"],
};
const XB = {
  jump: "A",
  roll: "B",
  whip: "X",
  interact: "Y",
  shoot: "RT",
  sprint: "LT",
  pause: "MENU",
  confirm: "A",
  back: "B",
};
const KB = {
  jump: "SPACE",
  roll: "CTRL",
  whip: "LMB",
  interact: "E",
  shoot: "RMB",
  sprint: "SHIFT",
  pause: "ESC",
  confirm: "ENTER",
  back: "ESC",
};
function glyph(action) {
  if (controls?.lastDevice === "pad") {
    if (settings.glyphs === "Xbox")
      return '<span data-glyph="' + action + '" class="key">' + XB[action] + "</span>";
    const a = PS[action];
    return (
      '<span data-glyph="' + action + '" class="key ' + (a[1] ? "ps " + a[1] : "") + '">' + a[0] + "</span>"
    );
  }
  if (controls?.lastDevice === "touch") return '<span data-glyph="' + action + '" class="key">TAP</span>';
  return '<span data-glyph="' + action + '" class="key">' + KB[action] + "</span>";
}
class Controls {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseHeld = new Set();
    this.mousePressed = new Set();
    this.mouse = { x: innerWidth * 0.5, y: innerHeight * 0.5 };
    this.lastDevice = "keyboard";
    this.lastInput = performance.now();
    this.pads = [];
    this.prevPads = [];
    this.menuRepeat = 0;
    this.touchLeft = null;
    this.touchRight = null;
    this.touchVector = { x: 0, z: 0 };
    this.padSuppressed = false;
    this.suppressUntil = 0;
    this.init();
  }
  activity(device) {
    this.lastInput = performance.now();
    if (this.lastDevice !== device) {
      this.lastDevice = device;
      document.body.classList.toggle("touch", device === "touch");
      if (typeof refreshPrompts === "function") refreshPrompts();
    }
    if (game?.attract) {
      exitAttract();
      this.keys.clear();
      this.pressed.clear();
      this.mouseHeld.clear();
      this.mousePressed.clear();
      this.padSuppressed = true;
      this.suppressUntil = performance.now() + 350;
      return false;
    }
    return performance.now() >= this.suppressUntil;
  }
  init() {
    addEventListener("keydown", (e) => {
      const key = keyName(e);
      if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(key))
        e.preventDefault();
      if (!this.activity("keyboard")) return;
      audio.unlock();
      if (!this.keys.has(key)) this.pressed.add(key);
      this.keys.add(key);
      if (ui.screen) {
        if (!e.repeat) menuKey(key);
        return;
      }
      if (key === "escape") {
        e.preventDefault();
        togglePause();
      } else if (key === "j" && !AIHub.active) openMenu("journal", "pause");
    });
    addEventListener("keyup", (e) => this.keys.delete(keyName(e)));
    addEventListener("wheel", () => this.activity("keyboard"), { passive: true });
    addEventListener("blur", () => {
      this.clear();
      if (game?.status === "playing" && !game.attract && !AIHub.active) openMenu("pause");
    });
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") {
        this.moveTouch(e);
        return;
      }
      if (Math.abs(e.clientX - this.mouse.x) + Math.abs(e.clientY - this.mouse.y) > 2)
        this.activity("keyboard");
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!this.activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        audio.unlock();
        if (ui.screen || e.target.closest("button,input,select")) return;
        if (e.pointerType === "touch") {
          this.startTouch(e);
          return;
        }
        this.mouseHeld.add(e.button);
        this.mousePressed.add(e.button);
        if (e.button === 0 && game?.status === "playing") {
          const target = contextFor(getLocalPlayer());
          const point = screenToWorld(e.clientX, e.clientY);
          if (target && point && Math.hypot(point.x - target.x, point.z - target.z) < 2) {
            this.pressed.add("e");
            this.mousePressed.delete(0);
            this.mouseHeld.delete(0);
          }
        }
      },
      true,
    );
    addEventListener("pointerup", (e) => {
      this.mouseHeld.delete(e.button);
      if (this.touchLeft?.id === e.pointerId) {
        this.touchLeft = null;
        this.touchVector = { x: 0, z: 0 };
      }
      if (this.touchRight?.id === e.pointerId) {
        this.touchRight = null;
      }
    });
    addEventListener("pointercancel", (e) => {
      if (this.touchLeft?.id === e.pointerId) {
        this.touchLeft = null;
        this.touchVector = { x: 0, z: 0 };
      }
      if (this.touchRight?.id === e.pointerId) this.touchRight = null;
    });
    addEventListener("contextmenu", (e) => e.preventDefault());
    $("pause-button").addEventListener("click", () => togglePause());
    $("context-button").addEventListener("click", () => {
      if (this.lastDevice === "touch" && game?.phase === "balance") {
        this.pressed.add("e");
      } else this.pressed.add("e");
    });
    $("balance").addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") this.pressed.add("e");
    });
    addEventListener("gamepadconnected", () => {
      toast("Controller ready · " + settings.glyphs + " prompts");
      this.lastDevice = "pad";
      refreshPrompts();
    });
  }
  startTouch(e) {
    if (e.clientX < innerWidth * 0.52 && !this.touchLeft) {
      this.touchLeft = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.touchVector = { x: 0, z: 0 };
    } else {
      this.touchRight = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now() };
      this.pressed.add("q");
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }
  }
  moveTouch(e) {
    if (this.touchLeft?.id === e.pointerId) {
      this.touchVector = {
        x: clamp((e.clientX - this.touchLeft.x) / 52, -1, 1),
        z: clamp((e.clientY - this.touchLeft.y) / 52, -1, 1),
      };
    } else if (this.touchRight?.id === e.pointerId) {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.mouseHeld.clear();
    this.mousePressed.clear();
    this.touchLeft = null;
    this.touchRight = null;
    this.touchVector = { x: 0, z: 0 };
    for (const p of this.pads) {
      p.jump = false;
      p.roll = false;
      p.interact = false;
    }
  }
  poll(dt) {
    this.menuRepeat -= dt;
    let pads = [];
    try {
      pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
    } catch {}
    this.pads = [];
    let any = false;
    pads.forEach((pad, index) => {
      const prev = this.prevPads[pad.index] || [];
      const held = pad.buttons.map((b) => b.pressed || b.value > 0.5),
        pressed = held.map((v, i) => v && !prev[i]);
      const axis = (v) => (Math.abs(v || 0) < 0.18 ? 0 : (Math.sign(v) * (Math.abs(v) - 0.18)) / 0.82);
      const mx = axis(pad.axes[0]),
        mz = axis(pad.axes[1]),
        ax = axis(pad.axes[2]),
        az = axis(pad.axes[3]);
      const active = held.some(Boolean) || Math.abs(mx) + Math.abs(mz) + Math.abs(ax) + Math.abs(az) > 0.1;
      any = any || active;
      if (active && !this.padSuppressed) this.activity("pad");
      this.pads[index] = {
        mx,
        mz,
        ax,
        az,
        jump: pressed[0],
        roll: pressed[1],
        whip: held[2],
        interact: pressed[3],
        shoot: held[7],
        sprint: held[6],
        held,
        pressed,
      };
      this.prevPads[pad.index] = held;
      if (!this.padSuppressed && active) {
        audio.unlock();
        if (ui.screen) {
          if (this.menuRepeat <= 0) {
            if (held[12] || mz < -0.5) {
              menuNavigate(-1);
              this.menuRepeat = 0.2;
            } else if (held[13] || mz > 0.5) {
              menuNavigate(1);
              this.menuRepeat = 0.2;
            }
            if (held[14] || mx < -0.5) {
              menuAdjust(-1);
              this.menuRepeat = 0.16;
            } else if (held[15] || mx > 0.5) {
              menuAdjust(1);
              this.menuRepeat = 0.16;
            }
          }
          if (pressed[0]) menuActivate();
          if (pressed[1] || (pressed[9] && !held[8])) menuBack();
          if (Math.abs(az) > 0.2)
            ($("menu").querySelector(".credits-scroll") || $("menu").querySelector(".sheet"))?.scrollBy(
              0,
              az * dt * 550,
            );
        } else {
          if (pressed[9] && !(AIHub.active && held[8])) togglePause();
          if (!AIHub.active && game?.localCoop && index >= game.players.length && pressed[0])
            joinLocalPlayer();
        }
      }
    });
    if (!any) this.padSuppressed = false;
  }
  frame(slot = 0) {
    const hub = AIHub.active;
    const pad = this.pads[hub ? 0 : slot];
    let mx = 0,
      mz = 0;
    const primary = slot === 0 || hub;
    if (primary) {
      mx = (this.keys.has("d") ? 1 : 0) - (this.keys.has("a") ? 1 : 0);
      mz = (this.keys.has("s") ? 1 : 0) - (this.keys.has("w") ? 1 : 0);
      if ((game?.players.length || 0) < 2) {
        mx += (this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("arrowleft") ? 1 : 0);
        mz += (this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("arrowup") ? 1 : 0);
      }
    } else if (slot === 1) {
      mx = (this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("arrowleft") ? 1 : 0);
      mz = (this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("arrowup") ? 1 : 0);
    }
    const touch = primary && this.lastDevice === "touch";
    if (touch) {
      mx = this.touchVector.x;
      mz = this.touchVector.z;
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    if (pad && !this.padSuppressed && Math.abs(pad.mx) + Math.abs(pad.mz) > 0.08) {
      mx = pad.mx;
      mz = pad.mz;
    }
    let ax = pad?.ax || 0,
      az = pad?.az || 0,
      mouseAim = false;
    if (primary && (this.lastDevice === "keyboard" || !!this.touchRight) && camera) {
      const p = getLocalPlayer(),
        world = screenToWorld(this.mouse.x, this.mouse.y);
      if (p && world) {
        ax = world.x - p.x;
        az = world.z - p.z;
        mouseAim = Math.hypot(ax, az) > 0.4;
        const l = Math.hypot(ax, az);
        if (l > 0) {
          ax /= l;
          az /= l;
        }
      }
    }
    const pk = (k) => this.pressed.has(k),
      hk = (k) => this.keys.has(k),
      secondary = slot === 1 && !hub;
    return {
      mx,
      mz,
      ax,
      az,
      mouseAim,
      whip: !!(
        pad?.whip ||
        (primary &&
          (this.mouseHeld.has(0) || hk("q") || (this.lastDevice === "touch" && !!this.touchRight))) ||
        (secondary && hk("/"))
      ),
      shoot: !!(
        pad?.shoot ||
        (primary &&
          (this.mouseHeld.has(2) ||
            hk("f") ||
            (this.lastDevice === "touch" &&
              this.touchRight &&
              performance.now() - this.touchRight.time > 450))) ||
        (secondary && hk("."))
      ),
      jump: !!(pad?.jump || (primary && pk("space")) || (secondary && pk("enter"))),
      roll: !!(pad?.roll || (primary && (pk("control") || pk("c"))) || (secondary && pk("rshift"))),
      interact: !!(pad?.interact || (primary && pk("e")) || (secondary && pk("'"))),
      sprint: !!(
        pad?.sprint ||
        (primary && (hk("shift") || (((game?.players.length || 0) < 2 || hub) && hk("rshift")))) ||
        (secondary && hk("0")) ||
        (touch && game?.phase === "escape")
      ),
      touch,
    };
  }
  consume() {
    this.pressed.clear();
    this.mousePressed.clear();
    for (const p of this.pads) {
      p.jump = false;
      p.roll = false;
      p.interact = false;
    }
  }
}
let controls;

let game = {
  status: "title",
  phase: "approach",
  players: [],
  localCoop: false,
  attract: false,
  elapsed: 0,
  score: 0,
  treasures: 0,
  kills: 0,
  deaths: 0,
  shots: 0,
  revives: 0,
  gateOpen: false,
  hasRelic: false,
  checkpoint: { name: "Base camp", x: 0, z: 8, phase: "approach" },
  god: false,
  noclip: false,
  balanceTime: 0,
  balanceHits: 0,
  balanceMisses: 0,
  balanceCooldown: 0,
  balanceOwner: 0,
  boulderStarted: false,
  cleanSwap: false,
  dialogue: null,
  toastTimer: 0,
  introFlags: {},
  attractIndex: 0,
  attractTimer: 0,
};
let hubInfo = null,
  hubStarted = false,
  hubEnded = false,
  hubFinished = false,
  netClock = 0,
  netSequence = 0,
  lastSnapshot = 0;
const remoteInputs = new Map(),
  netPending = { jump: false, roll: false, interact: false };
const EMPTY_INPUT = {
  mx: 0,
  mz: 0,
  ax: 0,
  az: 0,
  whip: false,
  shoot: false,
  jump: false,
  roll: false,
  interact: false,
  sprint: false,
};
const objectiveData = {
  approach: [
    "01",
    "Find the temple beyond the river.",
    "Use the bronze whip anchor to cross the broken bridge.",
    "I",
    "THE SUNKEN APPROACH",
  ],
  puzzle: [
    "02",
    "Wake the three sun lenses.",
    "Follow the beam: I → II → III → the bronze receiver.",
    "II",
    "BORROWED SUNLIGHT",
  ],
  vault: [
    "03",
    "Recover the Golden Goose.",
    "Outwit Captain Brass, then make the switch at the altar.",
    "III",
    "A VERY BAD TRADE",
  ],
  balance: [
    "03",
    "Make a careful exchange.",
    "Three presses in the gold band. A steady hand buys you time.",
    "III",
    "A VERY BAD TRADE",
  ],
  escape: [
    "04",
    "Get the goose to the river launch.",
    "Take the eastern door. Sprint, jump the broken floor, keep moving.",
    "IV",
    "GRAVITY HAS OPINIONS",
  ],
  complete: [
    "05",
    "A respectable day’s archaeology.",
    "One goose. Several complaints. Absolutely no receipt.",
    "V",
    "THE GETAWAY",
  ],
};
function createPlayer(id, name, colorIndex = 0) {
  const actor = makeExplorer(colorIndex);
  actorsRoot.add(actor.root);
  const body = physics.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation((id % 2 ? 1 : -1) * 0.7, 0.88, 8 + Math.floor(id / 2) * 1.2)
      .lockRotations()
      .setLinearDamping(7)
      .setCcdEnabled(true),
  );
  const collider = physics.createCollider(
    RAPIER.ColliderDesc.capsule(0.46, 0.32).setMass(1).setFriction(0),
    body,
  );
  const shadow = mesh(
    geo.cylinder,
    new THREE.MeshBasicMaterial({ color: 0x122b29, transparent: true, opacity: 0.3 }),
    actorsRoot,
    0,
    0.025,
    0,
    0.5,
    0.018,
    0.4,
  );
  const carried = makeGoose(actor.rig, 0.29);
  carried.position.set(-0.42, 0.78, 0.22);
  carried.visible = false;
  const rope = lineBetween(new THREE.Vector3(), new THREE.Vector3(), 0xdbc28c);
  rope.visible = false;
  effectRoot.add(rope);
  const whip = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 19 }, () => new THREE.Vector3())),
    new THREE.LineBasicMaterial({ color: 0xe2ba72 }),
  );
  whip.visible = false;
  effectRoot.add(whip);
  const marker = new THREE.Group();
  marker.position.y = 0.04;
  actor.root.add(marker);
  const ring = mesh(
    geo.torus,
    new THREE.MeshBasicMaterial({
      color: [0xf6bf59, 0x7bd1c5, 0xe9966e, 0xb7ce8a][colorIndex % 4],
      transparent: true,
      opacity: 0.75,
    }),
    marker,
    0,
    0,
    0,
    0.53,
    0.53,
    0.53,
  );
  ring.rotation.x = Math.PI / 2;
  return {
    id,
    name,
    active: true,
    actor,
    body,
    collider,
    shadow,
    carried,
    rope,
    whip,
    marker,
    x: 0,
    y: 0.88,
    z: 8,
    angle: 0,
    hp: 6,
    maxHp: 6,
    ammo: 6,
    maxAmmo: 12,
    invuln: 0,
    whipCooldown: 0,
    shootCooldown: 0,
    jumpCooldown: 0,
    rollCooldown: 0,
    rollTime: 0,
    action: "",
    actionTime: 0,
    move: 0,
    down: false,
    grapple: null,
    grounded: true,
    lastSafe: { x: 0, z: 8 },
    netTarget: null,
    input: { ...EMPTY_INPUT },
    reviveTime: 0,
  };
}
function removePlayers() {
  for (const p of game.players) {
    actorsRoot.remove(p.actor.root, p.shadow);
    effectRoot.remove(p.rope, p.whip);
    physics.removeRigidBody(p.body);
  }
  game.players = [];
}
function configurePlayers(count = 1) {
  removePlayers();
  if (AIHub.active && hubInfo) {
    for (const info of hubInfo.players) game.players.push(createPlayer(info.id, info.name, info.id));
    playerId = hubInfo.server ? null : hubInfo.me;
  } else {
    for (let i = 0; i < count; i++)
      game.players.push(createPlayer(i, ["MARA QUINN", "JULES FINCH", "KIT MERCER", "ROBIN VALE"][i], i));
    playerId = 0;
  }
}
function joinLocalPlayer() {
  if (AIHub.active || !game.localCoop || game.players.length >= 4) return;
  const id = game.players.length,
    p = createPlayer(id, ["MARA QUINN", "JULES FINCH", "KIT MERCER", "ROBIN VALE"][id], id),
    leader = game.players[0];
  game.players.push(p);
  warpPlayer(p, leader.x + 1, leader.z + 1);
  toast(p.name + " joined the expedition.");
  refreshPrompts();
}
function getLocalPlayer() {
  return (
    game.players.find((p) => p.id === playerId) ||
    game.players.find((p) => p.active && !p.down) ||
    game.players[0]
  );
}
function warpPlayer(p, x, z, y = 0.88) {
  for (const name of ["down", "roll", "jump", "grapple", "whip", "shoot"]) p.actor.clips[name].stop();
  p.actor.rig.rotation.set(0, 0, 0);
  p.actor.rig.position.set(0, 0, 0);
  p.move = 0;
  p.rollTime = 0;
  p.action = "";
  p.actionTime = 0;
  p.assistLeap = 0;
  p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  p.body.setEnabled(true);
  p.collider.setEnabled(true);
  p.body.setGravityScale(game.noclip ? 0 : 1, true);
  p.body.setTranslation({ x, y, z }, true);
  p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  p.x = x;
  p.y = y;
  p.z = z;
  p.grapple = null;
  p.lastSafe = { x, z };
  p.actor.root.position.set(x, y - 0.8, z);
  p.shadow.position.set(x, 0.025, z);
}
function setActorAction(p, name, time) {
  p.action = name;
  p.actionTime = time;
}
function resetWorldState() {
  clearEffects();
  game.elapsed = 0;
  game.score = 0;
  game.treasures = 0;
  game.kills = 0;
  game.deaths = 0;
  game.shots = 0;
  game.revives = 0;
  game.gateOpen = false;
  game.hasRelic = false;
  game.boulderStarted = false;
  game.cleanSwap = false;
  game.phase = "approach";
  game.checkpoint = { name: "Base camp", x: 0, z: 8, phase: "approach" };
  game.introFlags = {};
  game.balanceHits = 0;
  game.balanceMisses = 0;
  game.dialogue = null;
  game.god = false;
  game.noclip = false;
  for (const m of worldObjects.mirrors) m.rotation = [0, 2, 1][m.id];
  updateMirrors(true);
  const d = worldObjects.door;
  d.action.stop();
  d.mixer.setTime(0);
  d.mesh.position.y = 0;
  d.collider.setEnabled(true);
  worldObjects.sideDoor.mesh.position.y = 0;
  worldObjects.sideDoor.collider.setEnabled(true);
  worldObjects.goose.visible = true;
  const b = worldObjects.boulder;
  b.active = false;
  b.mesh.visible = false;
  b.collider.setEnabled(false);
  b.z = -84;
  b.body.setNextKinematicTranslation({ x: 21, y: 2.6, z: b.z });
  for (const e of worldObjects.enemies) {
    e.hp = e.maxHp;
    e.dead = false;
    e.actor.root.visible = true;
    e.actor.root.rotation.set(0, 0, 0);
    e.body.setEnabled(true);
    e.collider.setEnabled(true);
    e.body.setTranslation({ x: e.spawn.x, y: e.height, z: e.spawn.z }, true);
    e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    e.x = e.spawn.x;
    e.z = e.spawn.z;
    e.stun = 0;
    e.cooldown = 1 + e.id * 0.2;
    e.telegraph = 0;
    e.hpRoot.visible = false;
  }
  for (const p of worldObjects.pickups) {
    p.taken = false;
    p.mesh.visible = true;
  }
  for (const trap of worldObjects.traps) {
    trap.clock = trap.id * 0.73;
    trap.active = false;
    trap.fired = false;
  }
  for (const r of worldObjects.rubble) {
    r.body.setTranslation({ x: r.mesh.position.x, y: 0.55, z: r.mesh.position.z }, true);
    r.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
}
function startGame(coop = false, restore = false) {
  if (AIHub.active && !hubStarted) return;
  const count = AIHub.active
    ? hubInfo.players.length
    : coop
      ? Math.max(2, Math.min(4, controls.pads.length))
      : 1;
  resetWorldState();
  configurePlayers(count);
  game.localCoop = coop;
  game.attract = false;
  game.status = "playing";
  hubFinished = false;
  document.body.setAttribute("data-playing", "");
  closeMenu();
  $("hud").hidden = false;
  controls.clear();
  audio.resume();
  if (restore) loadCheckpoint();
  else {
    for (const p of game.players) warpPlayer(p, (p.id % 2 ? 1 : -1) * 0.7, 8 + Math.floor(p.id / 2));
    say("MARA", "The map says “certain doom.” Finally, clear directions.");
    toast("FIELD EXPEDITION 01 · THE GOLDEN GOOSE", 4.5);
  }
  cameraTarget.set(getLocalPlayer()?.x || 0, 0, (getLocalPlayer()?.z || 8) - 3);
  refreshPrompts();
}
function setCheckpoint(name, x, z, phase = game.phase) {
  if (game.checkpoint.name === name) return;
  game.checkpoint = { name, x, z, phase };
  for (const p of game.players) if (!p.down) p.hp = Math.min(p.maxHp, p.hp + 1);
  saveCheckpoint();
  toast("CHECKPOINT · " + name + " · one heart restored");
  audio.effect("pickup");
}
function saveCheckpoint() {
  if (AIHub.active || game.attract) return;
  const save = {
    version: 1,
    checkpoint: game.checkpoint,
    phase: game.phase,
    mirrors: worldObjects.mirrors.map((m) => m.rotation),
    gateOpen: game.gateOpen,
    hasRelic: game.hasRelic,
    cleanSwap: game.cleanSwap,
    treasures: game.treasures,
    score: game.score,
    elapsed: game.elapsed,
    kills: game.kills,
    pickups: worldObjects.pickups.filter((p) => p.taken).map((p) => p.id),
    dead: worldObjects.enemies.filter((e) => e.dead).map((e) => e.id),
  };
  safeStore.set("checkpoint", JSON.stringify(save));
}
function loadCheckpoint() {
  let saved;
  try {
    saved = JSON.parse(safeStore.get("checkpoint") || "null");
  } catch {}
  if (!saved || saved.version !== 1) return false;
  game.checkpoint = saved.checkpoint;
  game.phase = saved.phase === "balance" ? "vault" : saved.phase;
  game.gateOpen = saved.gateOpen;
  game.hasRelic = saved.hasRelic;
  game.cleanSwap = saved.cleanSwap;
  game.treasures = saved.treasures;
  game.score = saved.score;
  game.elapsed = saved.elapsed;
  game.kills = saved.kills;
  worldObjects.mirrors.forEach((m, i) => (m.rotation = saved.mirrors[i]));
  updateMirrors(true);
  if (game.gateOpen) openVault(true);
  for (const e of worldObjects.enemies)
    if (saved.dead.includes(e.id)) {
      e.hp = 0;
      e.dead = true;
      e.body.setEnabled(false);
      e.actor.root.visible = false;
    }
  for (const p of worldObjects.pickups)
    if (saved.pickups.includes(p.id)) {
      p.taken = true;
      p.mesh.visible = false;
    }
  if (game.hasRelic) {
    worldObjects.goose.visible = false;
    worldObjects.sideDoor.mesh.position.y = 5;
    worldObjects.sideDoor.collider.setEnabled(false);
    worldObjects.boulder.z = -86;
    worldObjects.boulder.active = true;
    worldObjects.boulder.mesh.visible = true;
    worldObjects.boulder.collider.setEnabled(true);
  }
  for (const p of game.players)
    warpPlayer(p, saved.checkpoint.x + (p.id % 2) * 1.2, saved.checkpoint.z + Math.floor(p.id / 2));
  toast("Continuing from " + saved.checkpoint.name);
  return true;
}
function retryCheckpoint() {
  if (AIHub.active) return;
  game.status = "playing";
  game.phase = game.checkpoint.phase;
  game.deaths++;
  for (const p of game.players) {
    p.hp = p.maxHp;
    p.down = false;
    p.ammo = Math.max(6, p.ammo);
    p.invuln = 3;
    p.action = "";
    p.actor.rig.rotation.set(0, 0, 0);
    p.actor.rig.position.set(0, 0, 0);
    warpPlayer(p, game.checkpoint.x + (p.id % 2) * 1.2, game.checkpoint.z + Math.floor(p.id / 2));
  }
  if (game.phase === "escape") {
    game.boulderStarted = false;
    worldObjects.boulder.z = -86;
    worldObjects.boulder.active = true;
    worldObjects.boulder.collider.setEnabled(true);
  }
  clearEffects();
  closeMenu();
  say("JULES", "Good news: your hat survived.");
  audio.resume();
}
function say(speaker, text, time = 4.7) {
  game.dialogue = { speaker, text, time };
  audio.voice(text, speaker === "BRASS");
}
function toast(text, time = 3) {
  $("toast").textContent = text;
  $("toast").classList.add("visible");
  game.toastTimer = time;
}
function openVault(instant = false) {
  game.gateOpen = true;
  worldObjects.door.collider.setEnabled(false);
  if (instant) worldObjects.door.mesh.position.y = 5.5;
  else {
    const action = worldObjects.door.action;
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    audio.effect("gate");
    burst(0, 2, -57, 0xe9be78, 25, 6);
    say("MARA", "Civilisation. It’s mostly moving heavy doors.");
    shakeTime = 0.8;
  }
  if (game.phase !== "escape" && game.phase !== "complete") game.phase = "vault";
}
function contextFor(p) {
  if (!p || p.down || (game.status !== "playing" && !game.attract)) return null;
  if (game.phase === "balance") return { type: "balance", text: "Steady the sand", x: p.x, z: p.z };
  for (const other of game.players)
    if (other.active && other.down && dist(p, other) < 2.4)
      return { type: "revive", id: other.id, text: "Help " + other.name + " up", x: other.x, z: other.z };
  if (Math.abs(p.x) < 4.5 && ((p.z < -11 && p.z > -17.4) || (p.z < -23.5 && p.z > -29.5)))
    return { type: "grapple", text: "Whip across the river", x: 0, z: -20.5 };
  for (const m of worldObjects.mirrors)
    if (dist(p, m) < 2.9)
      return {
        type: "mirror",
        id: m.id,
        text:
          "Turn lens " + ["I", "II", "III"][m.id] + " · " + ["north", "east", "south", "west"][m.rotation],
        x: m.x,
        z: m.z,
      };
  if (!game.hasRelic && dist(p, { x: 0, z: -77 }) < 3.3)
    return {
      type: "goose",
      text: worldObjects.enemies.find((e) => e.kind === "boss").dead
        ? "Swap sand for the goose"
        : "The goose can wait. Brass can’t.",
      x: 0,
      z: -77,
    };
  return null;
}
function interact(p) {
  if (!p || p.down) return;
  const c = contextFor(p);
  if (!c) return;
  switch (c.type) {
    case "balance":
      balancePress(p);
      break;
    case "grapple":
      if (!p.grapple) {
        const dest = p.z > -20 ? -26 : -14.6;
        p.grapple = {
          time: 0,
          duration: 1.15,
          start: { x: p.x, z: p.z, y: p.y },
          end: { x: 0, z: dest, y: 0.88 },
        };
        p.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        p.collider.setEnabled(false);
        p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        setActorAction(p, "grapple", 1.15);
        audio.effect("grapple");
        game.introFlags.grapple = true;
      }
      break;
    case "mirror": {
      const m = worldObjects.mirrors[c.id];
      m.rotation = (m.rotation + 1) % 4;
      updateMirrors();
      audio.effect("lens");
      burst(m.x, 2, m.z, 0xffd77f, 9, 2);
      if (worldObjects.mirrors.every((m) => m.rotation === m.correct) && !game.gateOpen) {
        game.score += 600;
        openVault();
        setCheckpoint("The open vault", 0, -60, "vault");
      }
      break;
    }
    case "goose":
      if (!worldObjects.enemies.find((e) => e.kind === "boss").dead) {
        say("BRASS", "Step away from the bird, Quinn. I have a very expensive buyer.");
        break;
      }
      game.phase = "balance";
      game.balanceTime = 0;
      game.balanceHits = 0;
      game.balanceMisses = 0;
      game.balanceCooldown = 0;
      game.balanceOwner = p.id;
      say("MARA", "Same weight. Different resale value.");
      for (const pp of game.players) pp.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      break;
    case "revive": {
      const other = game.players.find((pp) => pp.id === c.id);
      other.down = false;
      other.hp = 3;
      other.invuln = 3;
      other.actor.rig.rotation.set(0, 0, 0);
      other.actor.rig.position.set(0, 0, 0);
      other.action = "";
      warpPlayer(other, other.x, other.z);
      game.revives++;
      game.score += 100;
      audio.effect("pickup");
      toast(other.name + " is back on their feet.");
      break;
    }
  }
}
function balanceNeedle() {
  return (Math.sin(game.balanceTime * 3.4) + 1) / 2;
}
function balancePress(p, sample = null) {
  if (p.id !== game.balanceOwner || game.balanceCooldown > 0) return;
  game.balanceCooldown = 0.38;
  const needle =
    AIHub.active && p.id !== playerId && Number.isFinite(sample) ? clamp(sample, 0, 1) : balanceNeedle();
  const good = Math.abs(needle - 0.5) < 0.105;
  if (good) {
    game.balanceHits++;
    game.balanceTime += 0.38;
    audio.effect("lens");
    if (game.balanceHits >= 3) takeRelic(true);
  } else {
    game.balanceMisses++;
    audio.effect("rumble");
    shakeTime = 0.35;
    if (game.balanceMisses >= 2) takeRelic(false);
    else toast("Easy. That stonework is judging you.", 1.8);
  }
}
function takeRelic(clean) {
  game.phase = "escape";
  game.hasRelic = true;
  game.cleanSwap = clean;
  game.score += clean ? 1200 : 700;
  worldObjects.goose.visible = false;
  worldObjects.sideDoor.collider.setEnabled(false);
  worldObjects.sideDoor.mesh.position.y = 5;
  const b = worldObjects.boulder;
  b.active = true;
  b.mesh.visible = true;
  b.collider.setEnabled(true);
  b.z = clean ? -92 : -84;
  game.boulderStarted = false;
  setCheckpoint("The river escape", 21, -74, "escape");
  say(
    "JULES",
    clean
      ? "Flawless. Except for the enormous rolling part."
      : "You have the bird. The building has objections.",
    5,
  );
  audio.effect("rumble");
  shakeTime = 1.4;
  burst(0, 3, -77, 0xf2c66f, 40, 7);
}
function aimDirection(p, input) {
  let dx = input.ax || 0,
    dz = input.az || 0;
  const l = Math.hypot(dx, dz);
  if (l > 0.25) return { x: dx / l, z: dz / l };
  return { x: -Math.sin(p.angle), z: -Math.cos(p.angle) };
}
function doWhip(p, input) {
  if (p.whipCooldown > 0 || p.rollTime > 0 || p.grapple) return;
  p.whipCooldown = 0.48;
  setActorAction(p, "whip", 0.43);
  audio.effect("whip");
  const a = aimDirection(p, input);
  for (const e of worldObjects.enemies) {
    if (e.dead) continue;
    const d = dist(p, e);
    if (d > tuning.whipReach) continue;
    const dot = ((e.x - p.x) * a.x + (e.z - p.z) * a.z) / Math.max(0.1, d);
    if (dot > -0.18 || input.touch || (!input.mouseAim && Math.hypot(input.ax, input.az) < 0.3))
      hitEnemy(e, 2, p);
  }
  for (const r of worldObjects.rubble)
    if (dist(p, r.mesh.position) < tuning.whipReach)
      r.body.applyImpulse({ x: a.x * 6, y: 3, z: a.z * 6 }, true);
}
function doShoot(p, input) {
  if (p.shootCooldown > 0 || p.rollTime > 0 || p.grapple) return;
  p.shootCooldown = 0.35;
  if (p.ammo <= 0) {
    audio.effect("empty");
    return;
  }
  p.ammo--;
  game.shots++;
  setActorAction(p, "shoot", 0.25);
  p.actor.gun.visible = true;
  audio.effect("shot");
  let aim = aimDirection(p, input);
  let target = null,
    best = 99;
  for (const e of worldObjects.enemies) {
    if (e.dead) continue;
    const d = dist(p, e);
    const dot = ((e.x - p.x) * aim.x + (e.z - p.z) * aim.z) / Math.max(0.1, d);
    if (
      d < 17 &&
      (dot > 0.82 ||
        input.touch ||
        (settings.assist && !input.mouseAim && Math.hypot(input.ax, input.az) < 0.3)) &&
      d < best
    ) {
      target = e;
      best = d;
    }
  }
  if (target) {
    const d = dist(p, target);
    aim = { x: (target.x - p.x) / d, z: (target.z - p.z) / d };
    p.angle = Math.atan2(-aim.x, -aim.z);
  }
  const origin = { x: p.x + aim.x * 0.55, y: p.y + 0.35, z: p.z + aim.z * 0.55 };
  const ray = new RAPIER.Ray(origin, { x: aim.x, y: 0, z: aim.z });
  const hit = physics.castRay(
    ray,
    19,
    true,
    undefined,
    undefined,
    p.collider,
    undefined,
    (c) => !game.players.some((pp) => pp.collider.handle === c.handle),
  );
  let end = { x: origin.x + aim.x * 19, y: origin.y, z: origin.z + aim.z * 19 };
  if (hit) {
    end = { x: origin.x + aim.x * hit.timeOfImpact, y: origin.y, z: origin.z + aim.z * hit.timeOfImpact };
    const e = worldObjects.enemies.find((e) => !e.dead && e.collider.handle === hit.collider.handle);
    if (e) hitEnemy(e, 1, p);
    else burst(end.x, end.y, end.z, 0xf1cf87, 6, 3);
  }
  const tracer = lineBetween(
    new THREE.Vector3(origin.x, origin.y, origin.z),
    new THREE.Vector3(end.x, end.y, end.z),
    0xffe8a4,
  );
  effectRoot.add(tracer);
  worldObjects.particles.push({ mesh: tracer, v: new THREE.Vector3(), life: 0.075, max: 0.075, line: true });
  burst(origin.x, origin.y, origin.z, 0xffcd69, 4, 2);
}
function hitEnemy(e, damage, source) {
  if (e.dead) return;
  e.hp = Math.max(0, e.hp - damage);
  e.stun = e.kind === "boss" ? 0.2 : 0.65;
  e.hpRoot.visible = true;
  e.bar.scale.x = e.hp / e.maxHp;
  burst(e.x, 0.8, e.z, 0xeec78a, 9, 4);
  audio.effect("hit");
  if (e.hp <= 0) {
    e.dead = true;
    e.body.setEnabled(false);
    game.kills++;
    game.score += e.kind === "boss" ? 1000 : e.kind === "snake" ? 100 : 200;
    e.actor.root.rotation.z = Math.PI / 2;
    e.hpRoot.visible = false;
    if (e.kind === "boss") {
      say("BRASS", "Fine. Keep your ridiculous poultry.");
      toast("CAPTAIN BRASS · OUT OF BUSINESS", 3);
      for (const p of game.players)
        if (!p.down) {
          p.ammo = Math.min(p.maxAmmo, p.ammo + 4);
          p.hp = Math.min(p.maxHp, p.hp + 1);
        }
    }
  } else {
    const d = Math.max(0.1, dist(e, source));
    e.body.applyImpulse({ x: ((e.x - source.x) / d) * 5, y: 1, z: ((e.z - source.z) / d) * 5 }, true);
  }
}
function damagePlayer(p, amount, kind = "hit") {
  if (!p || p.down || p.invuln > 0 || game.god || game.attract || game.noclip) return;
  p.hp = Math.max(0, p.hp - amount * tuning.damageScale);
  p.invuln = 1.15;
  shakeTime = 0.25;
  audio.effect(kind);
  burst(p.x, 0.8, p.z, 0xec9d66, 8, 3);
  if (p.id === playerId) $("hitflash").style.opacity = ".8";
  if (p.hp <= 0) {
    p.down = true;
    p.body.setEnabled(false);
    setActorAction(p, "down", 0.7);
    if (game.players.every((pp) => !pp.active || pp.down)) {
      game.status = "failed";
      audio.effect("fail");
      if (AIHub.active) finishHub(false);
      else if (!game.attract) openMenu("failure");
    } else {
      toast(p.name + " needs a hand. Get close and interact.");
      say("JULES", "On your feet. The ruins are not getting any younger.");
    }
  }
}
function playerStep(p, input, dt) {
  if (!p.active || p.down) return;
  p.input = input;
  for (const key of ["invuln", "whipCooldown", "shootCooldown", "jumpCooldown", "rollCooldown", "actionTime"])
    p[key] = Math.max(0, p[key] - dt);
  if (p.actionTime <= 0) p.action = "";
  if (p.grapple) {
    const g = p.grapple;
    g.time += dt;
    const t = clamp(g.time / g.duration, 0, 1);
    p.body.setNextKinematicTranslation({
      x: lerp(g.start.x, g.end.x, t),
      y: lerp(g.start.y, g.end.y, t) + Math.sin(t * Math.PI) * 4.4,
      z: lerp(g.start.z, g.end.z, t),
    });
    if (t >= 1) {
      p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      p.collider.setEnabled(true);
      p.body.setTranslation(g.end, true);
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      p.grapple = null;
      p.lastSafe = { x: g.end.x, z: g.end.z };
      p.invuln = 0.3;
      if (g.end.z < -20 && game.phase === "approach") {
        game.phase = "puzzle";
        setCheckpoint("The sun gallery", 0, -27, "puzzle");
        say("JULES", "Three lenses. One door. Try not to invent a fourth problem.");
      }
    }
    return;
  }
  if (game.phase === "balance") {
    p.body.setLinvel({ x: 0, y: p.body.linvel().y, z: 0 }, true);
    if (input.interact) balancePress(p, input.balanceSample);
    return;
  }
  const pos = p.body.translation(),
    vel = p.body.linvel();
  p.x = pos.x;
  p.y = pos.y;
  p.z = pos.z;
  const ray = new RAPIER.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 });
  const hit = physics.castRay(ray, 1.05, true, undefined, undefined, p.collider, p.body);
  p.grounded = !!hit && hit.timeOfImpact < 0.86 && vel.y < 1;
  if (p.grounded && p.y < 1.4 && Math.abs(p.x) < 29) p.lastSafe = { x: p.x, z: p.z };
  let mx = input.mx || 0,
    mz = input.mz || 0;
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  let speed = tuning.moveSpeed * (input.sprint ? 1.38 : 1);
  if (input.touch && game.phase === "escape") speed *= 1.1;
  if (game.localCoop && game.players.length > 1 && !game.noclip) {
    const lead = game.players.find((pp) => pp.active && !pp.down && pp !== p);
    if (lead && dist(p, lead) > 17) {
      const dx = lead.x - p.x,
        dz = lead.z - p.z,
        d = Math.hypot(dx, dz);
      mx = lerp(mx, dx / d, 0.7);
      mz = lerp(mz, dz / d, 0.7);
    }
  }
  let jump = input.jump;
  if (input.touch && p.grounded && p.jumpCooldown <= 0) {
    const ahead = { x: p.x + mx * 2.2, z: p.z + mz * 2.2 };
    const gap = p.x > 16 && p.z > -50.8 && p.z < -49.05 && mz > 0.12;
    if (gap) {
      p.assistLeap = (2 * tuning.jumpPower) / 22 + 0.08;
      p.assistDirection = { x: clamp((21 - p.x) * 0.25, -0.3, 0.3), z: 1 };
    }
    if (
      gap ||
      worldObjects.traps.some(
        (t) => t.active && Math.abs(t.z - ahead.z) < 1.8 && (t.zone === "escape") === p.x > 15,
      )
    )
      jump = true;
  }
  if (input.touch && p.assistLeap > 0) {
    p.assistLeap -= dt;
    mx = p.assistDirection.x;
    mz = p.assistDirection.z;
    speed = Math.max(speed, 9.5);
  }
  if (input.roll && p.rollCooldown <= 0 && p.grounded) {
    p.rollTime = 0.38;
    p.rollCooldown = 0.85;
    p.invuln = 0.44;
    p.rollDir = len > 0.1 ? { x: mx, z: mz } : aimDirection(p, input);
    setActorAction(p, "roll", 0.5);
    audio.effect("roll");
  }
  let vy = vel.y;
  if (jump && p.grounded && p.jumpCooldown <= 0 && p.rollTime <= 0) {
    vy = tuning.jumpPower;
    p.jumpCooldown = 0.48;
    p.grounded = false;
    setActorAction(p, "jump", 0.7);
    audio.effect("jump");
  }
  if (p.rollTime > 0) {
    p.rollTime -= dt;
    mx = p.rollDir.x;
    mz = p.rollDir.z;
    speed *= 1.75;
  }
  p.move = Math.hypot(mx, mz) * speed;
  const aimLen = Math.hypot(input.ax || 0, input.az || 0);
  if (aimLen > 0.3 && (input.mouseAim || input.shoot || (aimLen > 0.45 && controls.lastDevice === "pad")))
    p.angle = Math.atan2(-input.ax, -input.az);
  else if (Math.abs(mx) + Math.abs(mz) > 0.1) p.angle = Math.atan2(-mx, -mz);
  if (game.noclip) {
    p.collider.setEnabled(false);
    p.body.setGravityScale(0, true);
    p.body.setLinvel({ x: mx * speed, y: clamp(0.9 - p.y, -5, 5) * 5, z: mz * speed }, true);
  } else {
    p.body.setLinvel({ x: mx * speed, y: vy, z: mz * speed }, true);
  }
  if (input.interact) interact(p);
  if (input.whip || (input.touch && worldObjects.enemies.some((e) => !e.dead && dist(p, e) < 2.8)))
    doWhip(p, input);
  if (input.shoot) doShoot(p, input);
  if (p.y < -7) {
    const where =
      p.x > 15 ? { x: 21, z: p.z < -47 ? -51 : -43 } : p.z > -21 ? { x: 0, z: -14.5 } : { x: 0, z: -26 };
    warpPlayer(p, where.x, where.z);
    damagePlayer(p, 1);
    toast("A narrow escape. One heart for the river.");
    if (game.phase === "escape") worldObjects.boulder.z = Math.min(worldObjects.boulder.z, where.z - 18);
  }
  if (game.gateOpen && p.z < -61 && game.phase === "vault" && !game.introFlags.vault) {
    game.introFlags.vault = true;
    setCheckpoint("The goose chamber", 0, -61, "vault");
    say("BRASS", "Quinn. I expected someone with a bigger expedition.");
  }
  if (game.phase === "escape" && p.x > 16 && p.z > -74) game.boulderStarted = true;
  if (game.phase === "escape" && p.x > 16 && p.x < 27 && p.z > 19) winGame();
}
function enemyStep(e, dt) {
  if (e.dead) return;
  const pos = e.body.translation();
  e.x = pos.x;
  e.z = pos.z;
  e.y = pos.y - e.height;
  e.stun = Math.max(0, e.stun - dt);
  e.cooldown -= dt;
  e.telegraph = Math.max(0, e.telegraph - dt);
  const candidates = game.players.filter(
    (p) =>
      p.active &&
      !p.down &&
      Math.abs(p.z - e.z) < 18 &&
      p.x < 13 &&
      (e.spawn.z < -58 === p.z < -57 || game.gateOpen),
  );
  let target = null,
    d = Infinity;
  for (const p of candidates) {
    const v = dist(e, p);
    if (v < d) {
      d = v;
      target = p;
    }
  }
  if (!target || e.stun > 0 || game.phase === "balance") {
    const v = e.body.linvel();
    e.body.setLinvel({ x: v.x * 0.75, y: v.y, z: v.z * 0.75 }, true);
    return;
  }
  const dx = (target.x - e.x) / d,
    dz = (target.z - e.z) / d;
  e.angle = Math.atan2(-dx, -dz);
  let speed = e.kind === "snake" ? 2.65 : e.kind === "boss" ? 2 : 1.6;
  speed *= tuning.enemyAggression;
  const desired = e.kind === "snake" ? 1 : e.kind === "boss" ? 5 : 6;
  const movement = d > desired ? speed : d < desired - 2 && e.kind !== "snake" ? -speed * 0.45 : 0;
  const vel = e.body.linvel();
  const region = e.spawn.z > -17 ? [-16, 13] : e.spawn.z > -58 ? [-55.7, -25] : [-81, -59.5];
  const nextZ = e.z + dz * movement * dt;
  e.body.setLinvel(
    { x: dx * movement, y: vel.y, z: nextZ < region[0] || nextZ > region[1] ? 0 : dz * movement },
    true,
  );
  e.move = Math.abs(movement);
  if (e.kind === "snake") {
    if (d < 1.05 && e.cooldown <= 0) {
      damagePlayer(target, 1);
      e.cooldown = 1.35 / tuning.enemyAggression;
      e.stun = 0.15;
    }
  } else if (e.cooldown <= 0.65 && e.cooldown > 0) {
    e.telegraph = e.cooldown;
    e.hpRoot.visible = true;
  } else if (e.cooldown <= 0 && d < 14) {
    e.cooldown = (e.kind === "boss" ? 2.4 : 2.1) / tuning.enemyAggression;
    e.telegraph = 0;
    e.fireTime = 0.2;
    const angles = e.kind === "boss" ? [-0.12, 0, 0.12] : [0];
    for (const angle of angles) {
      const c = Math.cos(angle),
        s = Math.sin(angle);
      spawnProjectile(
        e.x + dx * 0.7,
        e.height + 0.22,
        e.z + dz * 0.7,
        (dx * c - dz * s) * 12,
        (dz * c + dx * s) * 12,
        "enemy",
        1,
      );
    }
    audio.effect("shot");
  }
}
function spawnProjectile(x, y, z, vx, vz, kind, damage = 1) {
  const obj = mesh(
    geo.sphere,
    new THREE.MeshBasicMaterial({ color: kind === "dart" ? 0xc9e0b2 : 0xffad52 }),
    effectRoot,
    x,
    y,
    z,
    0.09,
    0.09,
    0.25,
  );
  obj.rotation.y = Math.atan2(vx, vz);
  worldObjects.projectiles.push({ x, y, z, vx, vz, kind, damage, life: 2.7, mesh: obj });
}
function trapStep(t, dt) {
  t.clock += dt * tuning.trapTempo;
  const phase = t.clock % 3.7;
  t.active = phase > 2.65 && phase < 3.15;
  const warning = phase > 1.65 && phase < 2.65;
  t.warning.material.opacity = warning ? 0.12 + Math.sin(phase * 23) * 0.15 : t.active ? 0.34 : 0;
  if (t.kind === "spike") {
    for (const obj of t.mesh.children) if (obj.geometry === geo.cone) obj.position.y = t.active ? 0.35 : -0.4;
    if (t.active)
      for (const p of game.players) {
        if (p.down || p.grapple) continue;
        const inZone = t.zone === "main" ? Math.abs(p.x) < 8.7 : p.x > 16 && p.x < 26;
        if (inZone && Math.abs(p.z - t.z) < 1 && p.y < 1.55) damagePlayer(p, 1);
      }
  } else {
    if (t.active && !t.fired) {
      t.fired = true;
      const cx = t.zone === "main" ? 0 : 21,
        w = t.zone === "main" ? 17 : 8;
      for (const side of [-1, 1])
        for (const offset of [-0.55, 0.45])
          spawnProjectile(cx + side * (w / 2), 1.05, t.z + offset, -side * 15, 0, "dart");
      if (game.players.some((p) => Math.abs(p.z - t.z) < 15)) audio.effect("dart");
    }
    if (!t.active) t.fired = false;
  }
}
function projectileStep(dt) {
  const kept = [];
  for (const b of worldObjects.projectiles) {
    b.life -= dt;
    const prev = { x: b.x, z: b.z };
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.mesh.position.set(b.x, b.y, b.z);
    let hit = false;
    if (b.kind === "enemy") {
      const length = Math.hypot(b.vx, b.vz) * dt,
        ray = new RAPIER.Ray(
          { x: prev.x, y: b.y, z: prev.z },
          { x: b.vx / Math.hypot(b.vx, b.vz), y: 0, z: b.vz / Math.hypot(b.vx, b.vz) },
        );
      hit = !!physics.castRay(ray, length, true, undefined, undefined, undefined, undefined, (c) =>
        c.parent()?.isFixed(),
      );
    }
    for (const p of game.players) {
      if (hit) break;
      if (!p.active || p.down || p.grapple) continue;
      const dx = b.x - prev.x,
        dz = b.z - prev.z,
        l = dx * dx + dz * dz,
        t = l ? clamp(((p.x - prev.x) * dx + (p.z - prev.z) * dz) / l, 0, 1) : 0;
      const d = Math.hypot(prev.x + dx * t - p.x, prev.z + dz * t - p.z);
      if (d < 0.42 && b.y > p.y - 0.7 && b.y < p.y + 0.75) {
        damagePlayer(p, b.damage);
        hit = true;
        break;
      }
    }
    if (b.life <= 0 || hit || Math.abs(b.x) > 29) {
      effectRoot.remove(b.mesh);
      b.mesh.material.dispose();
    } else kept.push(b);
  }
  worldObjects.projectiles = kept;
}
function pickupStep() {
  for (const item of worldObjects.pickups) {
    if (item.taken) continue;
    const p = game.players.find((p) => p.active && !p.down && dist(p, item) < 1.15 && p.y < 1.8);
    if (!p) continue;
    if ((item.kind === "health" && p.hp >= p.maxHp) || (item.kind === "ammo" && p.ammo >= p.maxAmmo))
      continue;
    item.taken = true;
    item.mesh.visible = false;
    if (item.kind === "health") {
      p.hp = Math.min(p.maxHp, p.hp + 2);
      toast("FIELD MEDICINE · +2 hearts");
    }
    if (item.kind === "ammo") {
      p.ammo = Math.min(p.maxAmmo, p.ammo + 6);
      toast("SIX GOOD ARGUMENTS · +6 rounds");
    }
    if (item.kind === "treasure") {
      game.treasures++;
      game.score += 500;
      toast("CURIO RECOVERED · " + game.treasures + " / 3 · +500");
      if (game.treasures === 1) say("MARA", "Small enough for a pocket. Important enough for a museum.");
    }
    audio.effect("pickup");
    burst(item.x, 0.6, item.z, item.kind === "treasure" ? 0xf4c65e : 0xc8e5b4, 14, 3);
  }
}
function boulderStep(dt) {
  const b = worldObjects.boulder;
  if (!b.active) return;
  if (game.boulderStarted) {
    b.z += tuning.boulderSpeed * dt;
    if (game.attract) {
      const p = game.players[0];
      if (p.x > 15) b.z = Math.min(b.z, p.z - 9);
    }
    b.body.setNextKinematicTranslation({ x: 21, y: 2.65, z: b.z });
    b.mesh.rotation.x += (dt * tuning.boulderSpeed) / 2.6;
    for (const p of game.players)
      if (p.active && !p.down && p.x > 16 && Math.abs(p.z - b.z) < 3.2 && p.y < 3) {
        damagePlayer(p, 2);
        p.body.applyImpulse({ x: (p.x - 21) * 2, y: 5, z: 10 }, true);
      }
    if (
      Math.floor(game.elapsed * 2) !== Math.floor((game.elapsed - dt) * 2) &&
      game.players.some((p) => p.x > 14 && Math.abs(p.z - b.z) < 18)
    ) {
      audio.effect("rumble");
      shakeTime = Math.max(shakeTime, 0.13);
    }
  }
  b.mesh.position.set(21, 2.65, b.z);
}
function winGame() {
  if (game.status === "won" || game.status === "ended") return;
  if (game.status !== "playing" && !game.attract) return;
  game.status = "won";
  game.phase = "complete";
  game.score += Math.max(0, Math.floor(1800 - game.elapsed * 2));
  audio.effect("win");
  say("MARA", "One priceless goose. Zero structural engineers. A successful expedition.");
  if (game.attract) {
    game.attractTimer = 0;
    return;
  }
  if (AIHub.active) {
    finishHub(true);
    return;
  }
  safeStore.remove("checkpoint");
  openMenu("victory");
}
function fixedStep(dt = 1 / 60, inputs = null) {
  if (hubEnded || (game.status !== "playing" && !game.attract)) return;
  if (AIHub.active && !hubInfo?.isHost) return;
  game.elapsed += dt;
  game.balanceCooldown = Math.max(0, game.balanceCooldown - dt);
  if (game.phase === "balance") {
    game.balanceTime += dt;
    if (game.balanceTime > 19) takeRelic(false);
  }
  const ai = game.attract ? attractInput(dt) : null;
  for (let i = 0; i < game.players.length; i++) {
    const p = game.players[i];
    let input =
      inputs?.[p.id] ||
      (game.attract
        ? ai
        : AIHub.active
          ? p.id === playerId
            ? ui.screen
              ? EMPTY_INPUT
              : controls.frame(0)
            : remoteInput(p.id)
          : controls.frame(i));
    playerStep(p, input || EMPTY_INPUT, dt);
  }
  for (const e of worldObjects.enemies) enemyStep(e, dt);
  for (const t of worldObjects.traps) trapStep(t, dt);
  boulderStep(dt);
  physics.timestep = dt;
  physics.step();
  for (const p of game.players) {
    if (p.down || !p.active) continue;
    const pos = p.body.translation();
    p.x = pos.x;
    p.y = pos.y;
    p.z = pos.z;
  }
  pickupStep();
  projectileStep(dt);
  if (game.attract && game.status === "won") {
    game.attractTimer += dt;
    if (game.attractTimer > 5) beginAttract();
  }
  if (game.phase === "approach" && !game.introFlags.traps && game.players.some((p) => p.z < -1)) {
    game.introFlags.traps = true;
    say("MARA", "Orange tiles mean trouble. Jump the darts. Roll through the gunfire.");
  }
  if (game.phase === "puzzle" && !game.introFlags.lenses && game.players.some((p) => p.z < -31)) {
    game.introFlags.lenses = true;
    say(
      "JULES",
      "The first lens faces the second. The second faces the third. Even the sun needs directions.",
    );
  }
}
function remoteInput(id) {
  const entry = remoteInputs.get(id);
  if (!entry || performance.now() - entry.time > 750) return EMPTY_INPUT;
  const val = { ...entry.input };
  entry.input.jump = false;
  entry.input.roll = false;
  entry.input.interact = false;
  return val;
}
const attractRoute = [
  { x: 0, z: -13.8, action: "grapple" },
  { x: -6, z: -33.7, action: "lens", id: 0 },
  { x: 0, z: -33 },
  { x: 6, z: -33.7, action: "lens", id: 1 },
  { x: 3, z: -40 },
  { x: 6, z: -46.7, action: "lens", id: 2 },
  { x: 0, z: -51 },
  { x: 0, z: -62 },
  { x: 0, z: -65, action: "boss" },
  { x: 0, z: -74.7, action: "goose" },
  { x: 21, z: -74 },
  { x: 21, z: -50.7 },
  { x: 21, z: 20 },
];
function beginAttract() {
  if (AIHub.active) return;
  startGame(false, false);
  game.attract = true;
  game.god = true;
  game.attractIndex = 0;
  game.attractTimer = 0;
  game.status = "playing";
  game.players[0].ammo = 12;
  game.introFlags = {};
  $("attract-banner").hidden = false;
  $("controls").hidden = true;
  $("pause-button").hidden = true;
  controls.lastInput = performance.now();
  closeMenu();
}
function exitAttract() {
  game.attract = false;
  game.god = false;
  $("attract-banner").hidden = true;
  $("pause-button").hidden = false;
  $("controls").hidden = false;
  showTitle();
}
function attractInput(dt) {
  const p = game.players[0];
  if (!p) return EMPTY_INPUT;
  game.attractTimer += dt;
  p.hp = p.maxHp;
  p.ammo = 12;
  if (game.attractTimer > 100) {
    beginAttract();
    return EMPTY_INPUT;
  }
  const out = { ...EMPTY_INPUT, sprint: true };
  if (game.status === "won") return out;
  if (p.grapple) return out;
  if (game.phase === "balance") {
    out.interact = Math.abs(balanceNeedle() - 0.5) < 0.065 && game.balanceCooldown <= 0;
    return out;
  }
  const wp = attractRoute[game.attractIndex] || attractRoute.at(-1),
    dx = wp.x - p.x,
    dz = wp.z - p.z,
    d = Math.hypot(dx, dz);
  if (d > 0.65) {
    out.mx = dx / d;
    out.mz = dz / d;
  } else {
    let done = true;
    if (wp.action === "grapple") {
      out.interact = true;
    } else if (wp.action === "lens") {
      const m = worldObjects.mirrors[wp.id];
      if (m.rotation !== m.correct) {
        out.interact = true;
        done = false;
      }
    } else if (wp.action === "boss") {
      done = worldObjects.enemies.find((e) => e.kind === "boss").dead;
    } else if (wp.action === "goose") {
      if (!game.hasRelic) {
        out.interact = true;
        done = game.phase === "balance";
      }
    }
    if (done) game.attractIndex = Math.min(attractRoute.length - 1, game.attractIndex + 1);
  }
  let target = null,
    best = 30;
  for (const e of worldObjects.enemies)
    if (!e.dead) {
      const d = dist(p, e);
      if (d < best) {
        best = d;
        target = e;
      }
    }
  if (target && best < 13) {
    out.ax = (target.x - p.x) / best;
    out.az = (target.z - p.z) / best;
    out.whip = best < tuning.whipReach;
    out.shoot = best > 2 && best < 13;
  }
  if (p.x > 16 && p.z > -50.7 && p.z < -48.8 && p.grounded) out.jump = true;
  if (
    worldObjects.traps.some(
      (t) => t.active && Math.abs(t.z - p.z) < 2.5 && (t.zone === "escape") === p.x > 15,
    )
  )
    out.jump = p.grounded;
  return out;
}
function updateVisuals(dt) {
  if (hubInfo?.server) return;
  ambientTime += dt;
  renderTime += dt;
  for (const p of game.players) {
    p.actor.root.visible = p.active;
    if (!p.active) continue;
    if (p.netTarget) {
      const t = 1 - Math.exp(-dt * 16);
      p.x = lerp(p.x, p.netTarget.x, t);
      p.y = lerp(p.y, p.netTarget.y, t);
      p.z = lerp(p.z, p.netTarget.z, t);
      p.angle = p.netTarget.angle;
    }
    p.actor.root.position.set(p.x, p.y - 0.8, p.z);
    p.actor.root.rotation.y = p.angle;
    p.actor.animate(p.action, p.move || 0, dt);
    p.carried.visible = game.hasRelic && p.id === (game.balanceOwner ?? game.players[0].id);
    p.shadow.visible = !p.down;
    p.shadow.position.set(p.x, 0.026, p.z);
    const s = clamp(1 - (p.y - 0.88) * 0.08, 0.4, 1);
    p.shadow.scale.set(s, s, s);
    p.actor.root.traverse((o) => {
      if (o.isMesh && o.material !== inkMat)
        o.visible = p.invuln <= 0 || Math.floor(ambientTime * 14) % 2 === 0 || game.attract;
    });
    p.carried.visible = game.hasRelic && p.id === game.balanceOwner;
    p.actor.gun.visible = p.action === "shoot";
    p.marker.visible = !p.down;
    p.rope.visible = !!p.grapple;
    if (p.grapple) {
      p.rope.geometry.setFromPoints([new THREE.Vector3(0, 6.5, -20.5), new THREE.Vector3(p.x, p.y + 1, p.z)]);
      p.rope.geometry.computeBoundingSphere();
    }
    p.whip.visible = p.action === "whip";
    if (p.whip.visible) {
      const progress = 1 - p.actionTime / 0.43,
        points = [];
      const baseAngle = p.angle + Math.sin(progress * Math.PI) * 1.7 - 1.1;
      for (let i = 0; i < 19; i++) {
        const t = i / 18,
          a = baseAngle + t * 1.3 * (1 - progress);
        points.push(
          new THREE.Vector3(
            p.x - Math.sin(a) * t * tuning.whipReach,
            p.y + 0.5 + Math.sin(t * Math.PI) * 0.35,
            p.z - Math.cos(a) * t * tuning.whipReach,
          ),
        );
      }
      p.whip.geometry.setFromPoints(points);
      p.whip.geometry.computeBoundingSphere();
    }
  }
  for (const e of worldObjects.enemies) {
    e.actor.root.position.set(e.x, e.y || 0, e.z);
    e.actor.root.rotation.y = e.angle + (e.kind === "snake" ? Math.PI : 0);
    if (!e.dead) e.actor.animate(e.fireTime > 0 ? "shoot" : "", e.move || 0, dt);
    e.fireTime = Math.max(0, (e.fireTime || 0) - dt);
    e.bar.scale.x = e.hp / e.maxHp;
    e.hpRoot.visible = !e.dead && (e.hp < e.maxHp || e.telegraph > 0);
    e.hpRoot.scale.setScalar(e.telegraph > 0 ? 1 + Math.sin(ambientTime * 18) * 0.12 : 1);
  }
  for (const m of worldObjects.mirrors) {
    const target = (-m.rotation * Math.PI) / 2;
    let d = target - m.rotor.rotation.y;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    m.rotor.rotation.y += d * Math.min(1, dt * 10);
  }
  worldObjects.door.mixer.update(dt);
  for (const f of worldObjects.flames) {
    f.scale.y = 0.9 + Math.sin(ambientTime * 13 + f.position.z) * 0.15;
    f.rotation.y = ambientTime * 2;
  }
  for (const item of worldObjects.pickups)
    if (!item.taken) {
      item.mesh.position.y = 0.55 + Math.sin(ambientTime * 2 + item.id) * 0.1;
      if (item.kind === "treasure") item.mesh.rotation.y += dt * 0.6;
    }
  for (const r of worldObjects.rubble) {
    const p = r.body.translation(),
      q = r.body.rotation();
    r.mesh.position.set(p.x, p.y, p.z);
    r.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }
  const kept = [];
  for (const p of worldObjects.particles) {
    p.life -= dt;
    if (!p.line) {
      p.v.y -= dt * 6;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.scale.multiplyScalar(Math.max(0.01, 1 - dt * 1.2));
    }
    if (p.life <= 0) {
      effectRoot.remove(p.mesh);
      if (p.line) {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
    } else kept.push(p);
  }
  worldObjects.particles = kept;
  const local = getLocalPlayer();
  let desired = new THREE.Vector3(local?.x || 0, 0, (local?.z || 8) - 3);
  if (game.status === "title") {
    desired.set(3, 0, -46);
    cameraTarget.lerp(desired, Math.min(1, dt * 2));
    cameraPosition.set(cameraTarget.x + 15 + Math.sin(ambientTime * 0.1) * 1.6, 25, cameraTarget.z + 25);
  } else {
    if (game.localCoop && !AIHub.active) {
      const alive = game.players.filter((p) => p.active && !p.down);
      if (alive.length > 1) {
        desired.x = alive.reduce((s, p) => s + p.x, 0) / alive.length;
        desired.z = alive.reduce((s, p) => s + p.z, 0) / alive.length - 3;
      }
    }
    cameraTarget.lerp(desired, Math.min(1, dt * (game.attract ? 3 : 5)));
    cameraPosition.set(cameraTarget.x, 24, cameraTarget.z + 22);
  }
  shakeTime = Math.max(0, shakeTime - dt);
  if (shakeTime > 0) {
    const s = shakeTime * settings.shake * 0.18;
    cameraPosition.x += Math.sin(ambientTime * 71) * s;
    cameraPosition.y += Math.cos(ambientTime * 83) * s;
  }
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget.x, 0.3, cameraTarget.z);
  shadowLight.position.set(cameraTarget.x - 18, 30, cameraTarget.z + 10);
  shadowLight.target.position.copy(cameraTarget);
  shadowLight.target.updateMatrixWorld();
  const opacity = parseFloat($("hitflash").style.opacity) || 0;
  if (opacity > 0) $("hitflash").style.opacity = Math.max(0, opacity - dt * 2);
  if (game.toastTimer > 0) {
    game.toastTimer -= dt;
    if (game.toastTimer <= 0) $("toast").classList.remove("visible");
  }
  if (game.dialogue) {
    game.dialogue.time -= dt;
    if (game.dialogue.time <= 0) game.dialogue = null;
  }
}
function snapshot() {
  return {
    title: TITLE,
    status: game.status,
    phase: game.phase,
    attract: game.attract,
    elapsed: game.elapsed,
    score: game.score,
    treasures: game.treasures,
    kills: game.kills,
    gateOpen: game.gateOpen,
    hasRelic: game.hasRelic,
    cleanSwap: game.cleanSwap,
    balanceHits: game.balanceHits,
    balanceMisses: game.balanceMisses,
    balanceNeedle: balanceNeedle(),
    checkpoint: { ...game.checkpoint },
    screen: ui.screen,
    input: controls.lastDevice,
    renderer: renderer ? (renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2") : "headless server",
    physics: "Rapier 0.19.3",
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      z: p.z,
      hp: p.hp,
      ammo: p.ammo,
      down: p.down,
      grounded: p.grounded,
      action: p.action,
      grapple: !!p.grapple,
    })),
    enemies: worldObjects.enemies.map((e) => ({
      id: e.id,
      kind: e.kind,
      x: e.x,
      z: e.z,
      hp: e.hp,
      dead: e.dead,
    })),
    mirrors: worldObjects.mirrors.map((m) => ({
      rotation: m.rotation,
      correct: m.correct,
      powered: m.powered,
    })),
    boulder: { active: worldObjects.boulder.active, z: worldObjects.boulder.z, started: game.boulderStarted },
    audio: {
      ...audio.played,
      level: audio.level,
      musicVolume: settings.music,
      state: audio.ctx?.state || "locked",
      contextTime: audio.ctx?.currentTime || 0,
      nextNote: audio.nextNote,
      muted: audio.muted,
      masterGain: audio.master?.gain.value,
      musicGain: audio.music?.gain.value,
    },
    hub: {
      active: AIHub.active,
      isHost: hubInfo?.isHost,
      server: hubInfo?.server,
      started: hubStarted,
      ended: hubEnded,
    },
    tuning: { ...tuning },
    god: game.god,
    noclip: game.noclip,
  };
}
function makeNetSnapshot() {
  return {
    t: "w",
    seq: ++netSequence,
    status: game.status,
    phase: game.phase,
    time: game.elapsed,
    score: game.score,
    treasures: game.treasures,
    kills: game.kills,
    gate: game.gateOpen,
    relic: game.hasRelic,
    owner: game.balanceOwner,
    clean: game.cleanSwap,
    balance: [game.balanceTime, game.balanceHits, game.balanceMisses],
    ps: game.players
      .filter((p) => p.active)
      .map((p) => [p.id, p.x, p.y, p.z, p.angle, p.hp, p.ammo, p.down, p.action, p.actionTime, p.move]),
    es: worldObjects.enemies.map((e) => [e.x, e.y, e.z, e.angle, e.hp, e.stun, e.telegraph, e.fireTime || 0]),
    ms: worldObjects.mirrors.map((m) => m.rotation),
    loot: worldObjects.pickups.filter((p) => p.taken).map((p) => p.id),
    ball: [worldObjects.boulder.active, worldObjects.boulder.z, game.boulderStarted],
    bolts: worldObjects.projectiles.slice(0, 24).map((b) => [b.x, b.y, b.z, b.vx, b.vz, b.kind]),
    dialog: game.dialogue,
  };
}
function applyNetSnapshot(s) {
  if (s.seq <= lastSnapshot) return;
  lastSnapshot = s.seq;
  if (s.gate && !game.gateOpen) openVault(true);
  game.status = s.status;
  game.phase = s.phase;
  game.elapsed = s.time;
  game.score = s.score;
  game.treasures = s.treasures;
  game.kills = s.kills;
  game.gateOpen = s.gate;
  game.hasRelic = s.relic;
  game.balanceOwner = s.owner;
  game.cleanSwap = s.clean;
  [game.balanceTime, game.balanceHits, game.balanceMisses] = s.balance;
  worldObjects.goose.visible = !s.relic;
  if (s.relic) {
    worldObjects.sideDoor.collider.setEnabled(false);
    worldObjects.sideDoor.mesh.position.y = 5;
  }
  for (const row of s.ps) {
    const p = game.players.find((p) => p.id === row[0]);
    if (!p) continue;
    p.active = true;
    p.netTarget = { x: row[1], y: row[2], z: row[3], angle: row[4] };
    p.hp = row[5];
    p.ammo = row[6];
    p.down = row[7];
    const old = p.action;
    p.action = row[8];
    p.actionTime = row[9];
    p.move = row[10];
    if (old !== p.action && p.action === "whip") audio.effect("whip");
    if (old !== p.action && p.action === "shoot") audio.effect("shot");
  }
  s.es.forEach((r, i) => {
    const e = worldObjects.enemies[i];
    [e.x, e.y, e.z, e.angle, e.hp, e.stun, e.telegraph, e.fireTime] = r;
    e.dead = e.hp <= 0;
    e.actor.root.rotation.z = e.dead ? Math.PI / 2 : 0;
  });
  let changed = false;
  s.ms.forEach((rot, i) => {
    if (worldObjects.mirrors[i].rotation !== rot) {
      worldObjects.mirrors[i].rotation = rot;
      changed = true;
    }
  });
  if (changed) updateMirrors();
  for (const item of worldObjects.pickups) {
    item.taken = s.loot.includes(item.id);
    item.mesh.visible = !item.taken;
  }
  const b = worldObjects.boulder;
  [b.active, b.z, game.boulderStarted] = s.ball;
  b.mesh.visible = b.active;
  b.mesh.position.set(21, 2.65, b.z);
  if (s.dialog?.text !== game.dialogue?.text && s.dialog)
    audio.voice(s.dialog.text, s.dialog.speaker === "BRASS");
  game.dialogue = s.dialog ? { ...s.dialog } : null;
  for (const b of worldObjects.projectiles) effectRoot.remove(b.mesh);
  worldObjects.projectiles = [];
  for (const row of s.bolts) spawnProjectile(row[0], row[1], row[2], row[3], row[4], row[5]);
}
function finishHub(won) {
  if (!AIHub.active || !hubInfo?.isHost || hubFinished || hubEnded) return;
  hubFinished = true;
  const ids = game.players.filter((p) => p.active).map((p) => p.id),
    scores = {},
    stats = {};
  for (const id of ids) {
    scores[id] = game.score;
    stats[id] = {
      Curios: game.treasures + "/3",
      "Rivals defeated": game.kills,
      "Clean exchange": game.cleanSwap ? "Yes" : "No",
      "Team revives": game.revives,
    };
  }
  AIHub.finish({ standings: [ids], scores, won, stats });
}
async function initNetwork(connection) {
  hubInfo = await connection;
  if (!hubInfo) return false;
  configurePlayers();
  game.status = "hub-wait";
  ui.screen = null;
  $("menu").hidden = true;
  $("hud").hidden = false;
  $("hub-banner").hidden = false;
  $("hub-banner").textContent = "The expedition is assembling…";
  AIHub.on("start", () => {
    if (hubEnded) return;
    hubStarted = true;
    startGame(false, false);
    $("hub-banner").hidden = false;
    // Establish the initial world and each seat's neutral input before lossy motion updates.
    if (hubInfo.isHost) AIHub.send(makeNetSnapshot(), { reliable: true });
    else if (!hubInfo.server)
      AIHub.send(
        { t: "i", seq: ++netSequence, input: { ...EMPTY_INPUT } },
        { to: hubInfo.host, reliable: true },
      );
  });
  AIHub.on("message", (data, from) => {
    if (hubEnded || !data || typeof data !== "object") return;
    if (hubInfo.isHost && data.t === "i" && game.players.some((p) => p.id === from && p.active)) {
      const source = data.input || {},
        input = { ...EMPTY_INPUT };
      for (const key of ["mx", "mz", "ax", "az"])
        input[key] = Number.isFinite(source[key]) ? clamp(source[key], -1, 1) : 0;
      for (const key of ["jump", "roll", "interact", "shoot", "whip", "sprint", "mouseAim", "touch"])
        input[key] = source[key] === true;
      input.balanceSample = Number.isFinite(source.balanceSample) ? clamp(source.balanceSample, 0, 1) : null;
      const old = remoteInputs.get(from);
      for (const key of ["jump", "roll", "interact"]) input[key] = input[key] || !!old?.input[key];
      remoteInputs.set(from, { input, time: performance.now() });
    } else if (!hubInfo.isHost && from === hubInfo.host && data.t === "w") applyNetSnapshot(data);
  });
  AIHub.on("leave", ({ id }) => {
    const p = game.players.find((p) => p.id === id);
    if (p) {
      p.active = false;
      p.actor.root.visible = false;
      p.shadow.visible = false;
      p.body.setEnabled(false);
    }
    remoteInputs.delete(id);
  });
  AIHub.on("time-up", () => finishHub(game.status === "won"));
  AIHub.on("end", () => {
    hubEnded = true;
    game.status = "ended";
    audio.stop();
    controls.clear();
    $("hub-banner").hidden = false;
    $("hub-banner").textContent = "Expedition complete. Waiting for the next adventure.";
    if (ui.screen) closeMenu();
  });
  AIHub.ready();
  return true;
}
function networkTick(dt) {
  if (!AIHub.active || !hubInfo || hubEnded || !hubStarted || AIHub.time() < 0) return;
  netClock += dt;
  if (!hubInfo.isHost && !hubInfo.server) {
    const input = ui.screen ? EMPTY_INPUT : controls.frame(0);
    for (const k of ["jump", "roll", "interact"]) netPending[k] = netPending[k] || input[k];
    if (input.interact) netPending.balanceSample = balanceNeedle();
    if (netClock >= 0.11) {
      AIHub.send(
        { t: "i", seq: ++netSequence, input: { ...input, ...netPending } },
        { to: hubInfo.host, reliable: false },
      );
      for (const k of ["jump", "roll", "interact"]) netPending[k] = false;
      netPending.balanceSample = null;
      netClock = 0;
    }
  } else if (hubInfo.isHost && netClock >= 0.11) {
    AIHub.send(makeNetSnapshot(), { reliable: false });
    netClock = 0;
  }
}

const ui = { screen: null, from: "title", focus: 0, aboutTab: 0, lastHud: 0 };
const esc = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const button = (text, action, extra = "", primary = false) =>
  `<button class="menu-btn ${primary ? "primary" : ""}" data-focus data-action="${action}" aria-label="${esc(
    text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )}" ${extra}>${text}</button>`;
const backButton = () => button("← Back", "back", 'class="menu-btn back"');
const titleMark = '<span class="eyebrow">QUINN & COMPANY · FIELD EXPEDITION 01</span>';
function menuItems() {
  return Array.from($("menu").querySelectorAll("[data-focus]")).filter(
    (e) => e.offsetParent !== null && !e.disabled,
  );
}
function setMenuFocus(index, scroll = false) {
  const items = menuItems();
  if (!items.length) return;
  ui.focus = (index + items.length) % items.length;
  for (const [i, item] of items.entries()) {
    item.classList.toggle("focused", i === ui.focus);
    item.closest(".setting")?.classList.toggle("focused", i === ui.focus);
  }
  const el = items[ui.focus];
  if (scroll) el.scrollIntoView({ block: "nearest", behavior: "instant" });
}
function menuNavigate(dir) {
  setMenuFocus(ui.focus + dir, true);
  audio.effect("ui");
}
function menuAdjust(dir) {
  const item = menuItems()[ui.focus];
  if (!item) return;
  if (item.tagName === "INPUT") {
    const step = Number(item.step) || 1;
    item.value = clamp(Number(item.value) + dir * step, Number(item.min), Number(item.max));
    item.dispatchEvent(new Event("input", { bubbles: true }));
    audio.effect("ui");
  } else if (item.tagName === "SELECT") {
    item.selectedIndex = (item.selectedIndex + dir + item.options.length) % item.options.length;
    item.dispatchEvent(new Event("change", { bubbles: true }));
    audio.effect("ui");
  }
}
function menuActivate() {
  if (performance.now() < controls.suppressUntil) return;
  const item = menuItems()[ui.focus];
  if (item?.tagName === "BUTTON") item.click();
}
function menuBack() {
  if (ui.screen === "title") return;
  if (ui.screen === "pause") {
    closeMenu();
    return;
  }
  if (ui.screen === "failure" || ui.screen === "victory") {
    showTitle();
    return;
  }
  openMenu(ui.from === "title" ? "title" : "pause");
}
function menuKey(key) {
  if (key === "arrowup" || key === "w") menuNavigate(-1);
  else if (key === "arrowdown" || key === "s" || key === "tab") menuNavigate(1);
  else if (key === "arrowleft" || key === "a") menuAdjust(-1);
  else if (key === "arrowright" || key === "d") menuAdjust(1);
  else if (key === "enter" || key === "space") menuActivate();
  else if (key === "escape" || key === "backspace") menuBack();
}
function closeMenu() {
  ui.screen = null;
  $("menu").hidden = true;
  controls?.clear();
  $("hud").hidden = game.status === "title";
  $("pause-button").hidden = game.attract;
  refreshPrompts();
}
function togglePause() {
  if (!worldReady || game.status === "title" || game.status === "hub-wait" || game.status === "ended") return;
  if (game.attract) {
    exitAttract();
    return;
  }
  if (ui.screen) closeMenu();
  else openMenu("pause");
}
function showTitle() {
  if (AIHub.active) return;
  document.body.removeAttribute("data-playing");
  game.status = "title";
  game.attract = false;
  game.god = false;
  game.noclip = false;
  game.dialogue = null;
  $("attract-banner").hidden = true;
  $("hud").hidden = true;
  audio.resume();
  if (game.players[0]) warpPlayer(game.players[0], 1, -43);
  controls.lastInput = performance.now();
  openMenu("title");
}
function openMenu(screen, from = null) {
  if (AIHub.active && screen === "title") return;
  ui.screen = screen;
  if (from) ui.from = from;
  ui.focus = 0;
  $("menu").hidden = false;
  controls?.clear();
  renderMenu();
  setMenuFocus(0);
  refreshPrompts();
}
function range(label, key, min, max, step, value, scope = "tuning", format = "") {
  return `<div class="setting"><label for="range-${key}">${label}<output id="out-${key}">${format || Number(value).toFixed(step < 1 ? 2 : 0)}</output></label><input data-focus id="range-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-scope="${scope}" data-key="${key}" aria-label="${label}"></div>`;
}
function renderMenu() {
  let html = "";
  if (ui.screen === "title") {
    const saved = !!safeStore.get("checkpoint");
    html = `<div class="title-menu"><div class="series"><i></i>${titleMark}</div><h1>Raiders of the<span class="gold">Golden Goose</span></h1><p class="tagline">Fortune favours the slightly reckless.</p><div class="menu-actions">${saved ? button("Continue expedition", "continue", "", true) : ""}${button(saved ? "A new solo expedition" : "Begin expedition", "solo", "", !saved)}${button("Bring a partner <small>2–4 explorers · couch co-op</small>", "coop")}${button("The field guide", "help")}${button("Settings", "settings")}${button("About & credits", "about")}</div></div><div class="edition-stamp"><b>AN ORIGINAL PULP ADVENTURE</b>One goose. One bad idea.<br>A rather large rolling stone.</div><div class="menu-footer"><span>${glyph("confirm")} SELECT &nbsp; · &nbsp; ↑ ↓ / LEFT STICK TO BROWSE</span><span>SOLO OR CO-OP &nbsp; / &nbsp; VOL. 01 &nbsp; / &nbsp; 1936</span></div>`;
  } else if (ui.screen === "pause") {
    html = `<section class="sheet pause-sheet"><div class="eyebrow">A MOMENT BETWEEN DISASTERS</div><h2>Catch your breath.</h2><p class="subtitle">${AIHub.active ? "The shared expedition keeps moving while this menu is open." : esc(game.checkpoint.name) + " · progress saved at checkpoints"}</p><div class="menu-actions">${button("Back to the adventure", "resume", "", true)}${button("Field journal & map", "journal")}${button("Settings", "settings")}${!AIHub.active ? button("Developer toolkit", "dev") : ""}${button("About & credits", "about")}${!AIHub.active ? button("Return to title", "title") : ""}</div></section>`;
  } else if (ui.screen === "settings") {
    html = `<section class="sheet"><div class="panel-head"><div><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Settings</h2></div>${button("← Back", "back")}</div><div class="settings-grid">${range("Master volume", "master", 0, 1, 0.05, settings.master, "settings", Math.round(settings.master * 100) + "%")}${range("Music · default 10%", "music", 0, 1, 0.05, settings.music, "settings", Math.round(settings.music * 100) + "%")}${range("Effects & gibberish", "sfx", 0, 1, 0.05, settings.sfx, "settings", Math.round(settings.sfx * 100) + "%")}${range("Camera distance", "zoom", 0.8, 1.3, 0.05, settings.zoom, "settings")}${range("Screen shake", "shake", 0, 1, 0.05, settings.shake, "settings")}<div class="setting"><label for="glyph-choice">Controller prompts</label><select id="glyph-choice" data-focus data-key="glyphs"><option ${settings.glyphs === "PlayStation" ? "selected" : ""}>PlayStation</option><option ${settings.glyphs === "Xbox" ? "selected" : ""}>Xbox</option></select></div></div><div class="toolrow">${button("Aim assistance: " + (settings.assist ? "ON" : "OFF"), "assist")}${button("Reset settings", "reset-settings")}${button("Fullscreen", "fullscreen")}</div><p class="hint-line">Music starts at 10%. Touch play adds automatic close-range whips, gap jumps and escape sprinting.<br>Use left/right on a focused slider. Your preferences are saved on this device.</p></section>`;
  } else if (ui.screen === "dev") {
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">QUINN & CO. · TECHNICAL DEPARTMENT</div><h2>Developer toolkit</h2></div>${button("← Back", "back")}</div><p class="subtitle">Changes take effect immediately. Close the menu to test. Checkpoints retain the current expedition.</p><div class="settings-grid">${range("Movement speed", "moveSpeed", 3, 11, 0.1, tuning.moveSpeed)}${range("Jump power", "jumpPower", 4, 12, 0.25, tuning.jumpPower)}${range("Whip reach", "whipReach", 1.5, 7, 0.1, tuning.whipReach)}${range("Enemy aggression", "enemyAggression", 0.2, 2, 0.1, tuning.enemyAggression)}${range("Trap tempo", "trapTempo", 0.3, 2, 0.1, tuning.trapTempo)}${range("Boulder speed", "boulderSpeed", 3, 12, 0.2, tuning.boulderSpeed)}${range("Damage multiplier", "damageScale", 0.25, 2, 0.25, tuning.damageScale)}</div><div class="toolrow">${button("Invulnerable: " + (game.god ? "ON" : "OFF"), "god")}${button("No clip: " + (game.noclip ? "ON" : "OFF"), "noclip")}${button("Heal & refill", "supply")}${button("Reset defaults", "reset-dev")}</div><div class="eyebrow" style="margin-top:1rem">SCENE TOOLS</div><div class="toolrow">${button("Base camp", "warp-camp")}${button("Sun gallery", "warp-puzzle")}${button("Goose chamber", "warp-vault")}${button("Boulder escape", "warp-escape")}${button("Solve the lenses", "solve")}</div><p class="hint-line">Simulation: fixed 60 Hz · Physics: Rapier 0.19.3 · Renderer: ${snapshot().renderer}<br>Coordinates: ${game.players.map((p) => esc(p.name) + " " + p.x.toFixed(1) + ", " + p.z.toFixed(1)).join(" · ")}</p></section>`;
  } else if (ui.screen === "help") {
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">READ BEFORE DISTURBING THE ANCIENT DEAD</div><h2>The field guide</h2></div>${button("← Back", "back")}</div><div class="help-grid"><div class="help-card"><h3>01 · Boots & a good whip</h3><p>Move with the left stick or WASD. ${glyph("jump")} jumps; ${glyph("roll")} rolls through danger; hold ${glyph("sprint")} to sprint. Near the river’s bronze ring, ${glyph("interact")} swings you across.</p></div><div class="help-card"><h3>02 · Professional disagreements</h3><p>${glyph("whip")} cracks the whip and stuns nearby rivals. Aim with the right stick or mouse, then ${glyph("shoot")} fires the pistol. Shots are limited; the whip never runs dry. Jump darts and watch the orange trap warning.</p></div><div class="help-card"><h3>03 · Borrowed sunlight</h3><p>${glyph("interact")} turns a sun lens a quarter turn. Route the sun from I to II, II to III, then III west toward the bronze receiver. The glowing beam shows your work. The journal keeps the clue.</p></div><div class="help-card"><h3>04 · A bird in the hand</h3><p>Beat Captain Brass and exchange sand for the goose. Three presses inside the gold band earn a head start. Take the eastern door, sprint south, jump the broken floor, and reach the river launch.</p></div></div><p class="hint-line">Couch co-op: player one uses WASD + mouse or pad 1. Player two uses arrows, Enter to jump, Right Shift to roll, / to whip, . to shoot, ' to interact, 0 to sprint, or pad 2. Extra connected pads can join with ${glyph("jump")}. Get close and interact to revive a fallen partner.<br>Touch: drag anywhere on the left to move. Tap or drag on the right to fight and aim. Grappling, lenses, revives and the idol use the contextual button. Jumps and close combat receive assistance.</p></section>`;
  } else if (ui.screen === "journal") {
    const obj = objectiveData[game.phase] || objectiveData.approach;
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">MARA QUINN · PERSONAL FIELD NOTES</div><h2>A map. A plan. Several flaws.</h2></div>${button("← Back", "back")}</div><svg class="journal-map" viewBox="0 0 260 390" aria-label="Route map"><path d="M45 345V240M45 210V145H150V75H75V35H210V345" fill="none" stroke="#e7c17b" stroke-width="22" opacity=".6"/><path d="M8 225h180" stroke="#76ada4" stroke-width="19"/><path d="M195 220h30" stroke="#13282a" stroke-width="14"/><g fill="#f8dd9e" font-family="Georgia" font-size="14"><text x="8" y="378">BASE CAMP</text><text x="60" y="230">RIVER · WHIP</text><text x="55" y="150">I</text><text x="154" y="150">II</text><text x="154" y="80">III</text><text x="5" y="35">GOOSE</text><text x="175" y="380">LAUNCH</text><text transform="translate(245 150) rotate(90)">ESCAPE · SOUTH</text></g><path d="M220 295l-10 20-10-20" fill="none" stroke="#f8dd9e" stroke-width="3"/></svg><div class="journal-copy"><p><b>THE CURRENT JOB</b><br>${esc(obj[1])}<br>${esc(obj[2])}</p><hr><p><b>THE LENS INSCRIPTION</b><br>“First, seek your neighbour.<br>Second, seek the northern eye.<br>Third, return the light to the west.”</p><p class="hint-line">Lens I east → Lens II north → Lens III west.<br>A correct lens can remain dark until the previous one feeds it.</p><hr><p><b>WHAT FITS IN OUR POCKETS</b><br>${game.treasures} / 3 curios · ${game.kills} rivals stopped<br>${game.hasRelic ? "One Golden Goose. Suspiciously heavy." : "One bag of sand. Optimistically measured."}</p><p class="hint-line">Checkpoint: ${esc(game.checkpoint.name)}<br>“If anyone asks, we were very careful.”</p></div></section>`;
  } else if (ui.screen === "about") {
    const tabs = ["Source information", "Testing feedback", "Engine feedback", "Prompt feedback"];
    const questions = [
      [],
      ["Issues caught", "Critical / game-breaking issues", "Most helpful test", "Least helpful test"],
      [
        "What worked best",
        "Where I got stuck or guessed wrong",
        "Most important custom system",
        "Hardest engine task",
        "Engine changes",
        "One desired engine change",
      ],
      ["What worked best", "What was confusing", "Hardest requirement", "One suggested prompt change"],
    ];
    let content = "";
    if (ui.aboutTab === 0) {
      content =
        `<div class="credit-row"><b>RAIDERS OF THE GOLDEN GOOSE</b>An original game by OpenAI Codex for Michael Crosato. Original procedural characters, geometry, animation and sound. Inspired by the supplied source; no original film/game assets or recordings are used.</div>` +
        Object.entries(REPORT.sourceInformation)
          .map(
            ([k, v]) => `<div class="credit-row"><b>${esc(k.replace(/([A-Z])/g, " $1"))}</b>${esc(v)}</div>`,
          )
          .join("") +
        '<div class="credit-row"><b>Libraries & acknowledgements</b>Three.js · MIT · Rapier / Dimforge · Apache-2.0 · AI Hub session client by Michael Crosato. Title chosen with node:crypto.randomInt from 50 original candidates.</div>';
    } else {
      const values = [null, REPORT.testingFeedback, REPORT.engineFeedback, REPORT.promptFeedback][
        ui.aboutTab
      ];
      content = values
        .map((v, i) => `<div class="credit-row"><b>${questions[ui.aboutTab][i]}</b>${esc(v)}</div>`)
        .join("");
    }
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">THE EXPEDITION’S PAPER TRAIL</div><h2>About & credits</h2></div>${button("← Back", "back")}</div><div class="tabs">${tabs.map((t, i) => button(t, "about-tab-" + i, 'aria-pressed="' + (i === ui.aboutTab) + '" ' + (i === ui.aboutTab ? 'data-active="true"' : ""))).join("")}</div><div class="credits-scroll" tabindex="0">${content}</div><p class="hint-line">Scroll with the mouse wheel, touch, or the right stick. Usage: ${esc(REPORT.sourceInformation.usage)}.</p></section>`;
  } else if (ui.screen === "failure") {
    html = `<section class="sheet pause-sheet"><div class="eyebrow">A TEMPORARY SETBACK</div><h2>Another fine mess.</h2><p class="subtitle">The goose is still out there. So is your hat.<br>Continue from ${esc(game.checkpoint.name)} with full health.</p><div class="menu-actions">${button("Try that again", "retry", "", true)}${button("Developer toolkit", "dev")}${button("Return to title", "title")}</div></section>`;
  } else if (ui.screen === "victory") {
    const seconds = Math.floor(game.elapsed),
      time = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    html = `<section class="sheet"><div class="eyebrow">QUINN & COMPANY · EXPEDITION SUCCESSFUL</div><h2>The goose is loose.</h2><p class="subtitle">One priceless bird. A rather large repair bill.<br>“Put it under expenses. What could they possibly object to?”</p><div class="stats"><div class="stat"><strong>${game.score.toLocaleString()}</strong><span>Expedition score</span></div><div class="stat"><strong>${time}</strong><span>Time in the field</span></div><div class="stat"><strong>${game.treasures}/3</strong><span>Curios recovered</span></div></div><p class="hint-line">${game.cleanSwap ? "A perfect exchange. Three steady hands." : "An imperfect exchange. A perfectly good escape."}<br>${game.kills} rivals stopped · ${game.revives} partners revived · ${game.deaths} checkpoint retries</p><div class="menu-actions">${button("Another questionable expedition", "again", "", true)}${button("About & credits", "about")}${button("Return to title", "title")}</div></section>`;
  }
  $("menu").innerHTML = html;
  $("menu")
    .querySelectorAll("[data-action]")
    .forEach((el) =>
      el.addEventListener("click", () => {
        if (performance.now() < controls.suppressUntil) return;
        audio.unlock();
        audio.effect("ui");
        menuAction(el.dataset.action);
      }),
    );
  $("menu")
    .querySelectorAll("[data-focus]")
    .forEach((el) => {
      el.addEventListener("pointerenter", () => setMenuFocus(menuItems().indexOf(el)));
      el.addEventListener("focus", () => setMenuFocus(menuItems().indexOf(el)));
    });
  $("menu")
    .querySelectorAll("input[type=range]")
    .forEach((el) =>
      el.addEventListener("input", () => {
        const obj = el.dataset.scope === "settings" ? settings : tuning;
        obj[el.dataset.key] = Number(el.value);
        $("out-" + el.dataset.key).textContent =
          el.dataset.scope === "settings" && ["master", "music", "sfx"].includes(el.dataset.key)
            ? Math.round(el.value * 100) + "%"
            : Number(el.value).toFixed(Number(el.step) < 1 ? 2 : 0);
        if (el.dataset.scope === "settings") {
          safeStore.set("settings", JSON.stringify(settings));
          resize();
          audio.updateSettings();
        }
      }),
    );
  $("glyph-choice")?.addEventListener("change", (e) => {
    settings.glyphs = e.target.value;
    safeStore.set("settings", JSON.stringify(settings));
    refreshPrompts();
  });
  $("menu")
    .querySelectorAll("[data-active=true]")
    .forEach((el) => el.classList.add("active"));
  setMenuFocus(ui.focus);
}
function menuAction(action) {
  if (action.startsWith("about-tab-")) {
    ui.aboutTab = Number(action.at(-1));
    const index = ui.focus;
    renderMenu();
    setMenuFocus(index);
    return;
  }
  if (action === "back") {
    menuBack();
    return;
  }
  if (action === "solo") {
    startGame(false);
    return;
  }
  if (action === "coop") {
    startGame(true);
    return;
  }
  if (action === "continue") {
    startGame(false, true);
    return;
  }
  if (action === "resume") {
    closeMenu();
    return;
  }
  if (action === "title") {
    showTitle();
    return;
  }
  if (action === "retry") {
    retryCheckpoint();
    return;
  }
  if (action === "again") {
    startGame(game.localCoop);
    return;
  }
  if (["settings", "about", "help", "dev", "journal"].includes(action)) {
    openMenu(action, ui.screen === "title" ? "title" : "pause");
    return;
  }
  if (action === "assist") {
    settings.assist = !settings.assist;
    safeStore.set("settings", JSON.stringify(settings));
    renderMenu();
    return;
  }
  if (action === "reset-settings") {
    Object.assign(settings, {
      master: 0.7,
      music: 0.1,
      sfx: 0.8,
      glyphs: "PlayStation",
      zoom: 1,
      shake: 0.65,
      assist: true,
    });
    safeStore.set("settings", JSON.stringify(settings));
    audio.updateSettings();
    resize();
    renderMenu();
    return;
  }
  if (action === "fullscreen") {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else
      document.documentElement
        .requestFullscreen?.()
        .catch(() => toast("Fullscreen is unavailable in this browser."));
    return;
  }
  devAction(action);
}
function devAction(action) {
  if (AIHub.active) return;
  if (action === "god") {
    game.god = !game.god;
    renderMenu();
    return;
  }
  if (action === "noclip") {
    game.noclip = !game.noclip;
    for (const p of game.players) {
      p.collider.setEnabled(!game.noclip);
      p.body.setGravityScale(game.noclip ? 0 : 1, true);
    }
    renderMenu();
    return;
  }
  if (action === "supply") {
    for (const p of game.players) {
      p.hp = p.maxHp;
      p.ammo = p.maxAmmo;
      p.down = false;
      p.action = "";
      p.actionTime = 0;
      p.actor.clips.down.stop();
      p.actor.clips.roll.stop();
      p.actor.rig.rotation.set(0, 0, 0);
      p.actor.rig.position.set(0, 0, 0);
      p.body.setEnabled(true);
    }
    toast("Everyone patched up. Every chamber full.");
    return;
  }
  if (action === "reset-dev") {
    Object.assign(tuning, DEFAULT_TUNING);
    game.god = false;
    game.noclip = false;
    for (const p of game.players) {
      p.collider.setEnabled(true);
      p.body.setGravityScale(1, true);
    }
    renderMenu();
    return;
  }
  if (action === "solve") {
    worldObjects.mirrors.forEach((m) => (m.rotation = m.correct));
    updateMirrors();
    openVault();
    closeMenu();
    return;
  }
  if (action.startsWith("warp-")) {
    const dest = action.slice(5);
    game.status = "playing";
    if (dest === "vault") {
      openVault(true);
      game.phase = "vault";
    }
    if (dest === "puzzle") game.phase = "puzzle";
    if (dest === "camp") game.phase = "approach";
    if (dest === "escape") {
      openVault(true);
      const boss = worldObjects.enemies.find((e) => e.kind === "boss");
      if (!boss.dead) hitEnemy(boss, boss.hp, game.players[0]);
      takeRelic(false);
    }
    const positions = { camp: [0, 8], puzzle: [0, -28], vault: [0, -61], escape: [21, -74] };
    const [x, z] = positions[dest];
    for (const p of game.players) {
      p.hp = p.maxHp;
      p.ammo = p.maxAmmo;
      p.down = false;
      warpPlayer(p, x + (p.id % 2), z + Math.floor(p.id / 2));
    }
    closeMenu();
    return;
  }
}
function refreshPrompts() {
  if (!controls) return;
  if ($("controls"))
    $("controls").innerHTML =
      game.phase === "escape"
        ? `<span>${glyph("sprint")} Sprint</span><span>${glyph("jump")} Jump the gaps</span><span>${glyph("roll")} Roll</span><span>${glyph("pause")} Pause</span>`
        : `<span>${glyph("whip")} Whip</span><span>${glyph("shoot")} Shoot</span><span>${glyph("jump")} Jump</span><span>${glyph("roll")} Roll</span><span>${glyph("pause")} Pause</span>`;
  if ($("balance-key")) $("balance-key").innerHTML = glyph("interact");
  document.querySelectorAll("[data-glyph]").forEach((el) => {
    el.outerHTML = glyph(el.dataset.glyph);
  });
}
function setText(id, text) {
  if ($(id).textContent !== text) $(id).textContent = text;
}
function renderHUD(dt) {
  if ($("hud").hidden) return;
  if (ui.lastPhase !== game.phase) {
    ui.lastPhase = game.phase;
    refreshPrompts();
  }
  ui.lastHud += dt;
  const p = getLocalPlayer(),
    obj = objectiveData[game.phase] || objectiveData.approach;
  if (ui.lastHud > 0.08) {
    ui.lastHud = 0;
    const vitalHTML = game.players
      .filter((p) => p.active)
      .map(
        (p) =>
          `<div class="vital" style="border-color:${["#f6bf59", "#7bd1c5", "#e9966e", "#b7ce8a"][p.id % 4]}"><div class="name">${esc(p.name)}${p.id === playerId ? " · YOU" : ""}</div><div class="hearts ${p.down ? "down" : ""}">${p.down ? "NEEDS A HAND" : "♥".repeat(Math.ceil(p.hp)) + '<span style="opacity:.22">' + "♥".repeat(Math.max(0, p.maxHp - Math.ceil(p.hp))) + "</span>"}</div><div class="ammo">${p.ammo} / ${p.maxAmmo} ROUNDS ${p.rollCooldown > 0 ? "· ROLL RECOVERING" : ""}</div></div>`,
      )
      .join("");
    if ($("vitals").innerHTML !== vitalHTML) $("vitals").innerHTML = vitalHTML;
    setText("objective-num", obj[0]);
    setText("objective-text", obj[1]);
    setText(
      "objective-detail",
      game.phase === "puzzle"
        ? worldObjects.mirrors.filter((m) => m.rotation === m.correct).length +
            " / 3 lenses aligned. " +
            obj[2]
        : obj[2],
    );
    setText("chapter-num", "CHAPTER " + obj[3]);
    setText("chapter-name", obj[4]);
    const context = contextFor(p);
    $("context").hidden = !context || !!ui.screen || game.attract;
    if (context) {
      const value = glyph("interact") + " " + esc(context.text);
      if ($("context-button").innerHTML !== value) $("context-button").innerHTML = value;
    }
    drawMap(p);
  }
  const d = game.dialogue;
  $("dialogue").hidden = !d || (game.attract && game.status === "won");
  if (d) {
    setText("speaker", d.speaker);
    setText("speech", d.text);
  }
  $("balance").hidden = game.phase !== "balance" || !!ui.screen;
  $("balance-needle").style.left = balanceNeedle() * 100 + "%";
  setText("balance-marks", "● ".repeat(game.balanceHits) + "○ ".repeat(3 - game.balanceHits));
  $("escape-meter").hidden = game.phase !== "escape";
  if (game.phase === "escape" && p) {
    const gap = p.z - worldObjects.boulder.z;
    setText(
      "escape-distance",
      game.boulderStarted
        ? Math.max(0, Math.floor(gap)) + " m ahead of the problem"
        : "THE EASTERN DOOR IS OPEN",
    );
    $("escape-meter").querySelector("i").style.width = clamp(gap / 30, 0, 1) * 100 + "%";
  }
  $("attract-banner").hidden = !game.attract;
  if (AIHub.active && hubStarted && !hubEnded) {
    const t = AIHub.time();
    $("hub-banner").hidden = t >= 0;
    if (t < 0) setText("hub-banner", "Expedition begins in " + Math.ceil(-t / 1000) + "…");
  }
}
function drawMap(p) {
  if (!p || controls.lastDevice === "touch") return;
  const c = $("map").getContext("2d"),
    w = 180,
    s = 2.45;
  c.clearRect(0, 0, w, w);
  c.save();
  c.beginPath();
  c.arc(90, 90, 86, 0, TAU);
  c.clip();
  c.translate(90 - p.x * s, 98 - p.z * s);
  c.fillStyle = "#b4b38966";
  c.fillRect(-10 * s, -84 * s, 20 * s, 101 * s);
  c.clearRect(-11 * s, -24 * s, 22 * s, 7 * s);
  c.fillRect(16 * s, -80 * s, 10 * s, 104 * s);
  c.fillRect(10 * s, -80 * s, 7 * s, 10 * s);
  c.clearRect(16 * s, -49 * s, 10 * s, 4 * s);
  c.fillStyle = "#66a59c";
  c.fillRect(-12 * s, -23.5 * s, 24 * s, 5.8 * s);
  c.strokeStyle = "#e5c080";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-3 * s, -57.5 * s);
  c.lineTo(3 * s, -57.5 * s);
  if (!game.gateOpen) c.stroke();
  for (const m of worldObjects.mirrors) {
    c.fillStyle = m.rotation === m.correct ? "#ffe09a" : "#9ad0bf";
    c.beginPath();
    c.arc(m.x * s, m.z * s, 3, 0, TAU);
    c.fill();
  }
  for (const e of worldObjects.enemies)
    if (!e.dead) {
      c.fillStyle = "#e88765";
      c.beginPath();
      c.arc(e.x * s, e.z * s, 2.6, 0, TAU);
      c.fill();
    }
  for (const player of game.players)
    if (player.active) {
      c.fillStyle = player.id === playerId ? "#ffe2a5" : "#8ed5c4";
      c.beginPath();
      c.arc(player.x * s, player.z * s, 4.5, 0, TAU);
      c.fill();
    }
  if (worldObjects.boulder.active) {
    c.strokeStyle = "#f09e6b";
    c.beginPath();
    c.arc(21 * s, worldObjects.boulder.z * s, 7, 0, TAU);
    c.stroke();
  }
  c.restore();
  const goal =
    game.phase === "escape"
      ? { x: 21, z: 22 }
      : game.phase === "approach"
        ? { x: 0, z: -17 }
        : game.phase === "puzzle"
          ? { x: 0, z: -44 }
          : { x: 0, z: -77 };
  const dx = (goal.x - p.x) * s,
    dz = (goal.z - p.z) * s,
    l = Math.hypot(dx, dz),
    scale = Math.min(1, 69 / Math.max(1, l));
  c.fillStyle = "#ffd57c";
  c.font = "18px Georgia";
  c.textAlign = "center";
  c.fillText("✦", 90 + dx * scale, 104 + dz * scale);
  c.strokeStyle = "#bba97888";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(90, 90, 85, 0, TAU);
  c.stroke();
}

let lastFrame = 0,
  accumulator = 0,
  frameCount = 0,
  runtimeError = null,
  drawReady = false,
  warming = false;
async function boot() {
  const connection = AIHub.connect({ mode: "shared-world", seats: [1, 4] });
  try {
    $("loadtext").textContent = "Waking the sun lenses. Negotiating with gravity.";
    hubInfo = await connection;
    await initEngine();
    createWorld();
    controls = new Controls();
    configurePlayers(1);
    game.status = "title";
    updateVisuals(1 / 60);
    if (!AIHub.active) {
      await renderer.compileAsync(scene, camera);
      await renderer.renderAsync(scene, camera);
      drawReady = true;
    }
    $("loading").hidden = true;
    if (!(await initNetwork(connection))) showTitle();
    if (hubInfo?.server) $("hud").hidden = true;
    if (testMode) {
      window.__GG = {
        snapshot,
        netInputs: () =>
          Object.fromEntries(
            [...remoteInputs].map(([id, v]) => [id, { ...v.input, age: performance.now() - v.time }]),
          ),
        offlineAudio: () => audio.renderCheck(),
        input: (slot = 0) => controls.frame(slot),
        start: (coop = false) => startGame(coop),
        advance(frames, inputs = {}) {
          for (let i = 0; i < frames; i++) fixedStep(1 / 60, inputs);
          updateVisuals(1 / 60);
          renderHUD(1);
          return snapshot();
        },
        warp(id, x, z) {
          const p = game.players.find((p) => p.id === id);
          if (p) warpPlayer(p, x, z);
          return snapshot();
        },
        interact(id = 0) {
          interact(game.players.find((p) => p.id === id));
          return snapshot();
        },
        damage(id = 0, n = 1) {
          damagePlayer(
            game.players.find((p) => p.id === id),
            n,
          );
          return snapshot();
        },
        dev: devAction,
        openMenu,
        closeMenu,
        save: saveCheckpoint,
        restore: () => startGame(false, true),
        idle() {
          controls.lastInput = performance.now() - 11000;
        },
        balancePress: () => balancePress(getLocalPlayer()),
        unlockAudio: () => audio.unlock(),
        audioTick: (phase = "escape") => audio.tick(phase, 1),
        settings,
        exitAttract,
        render: async () => {
          updateVisuals(1 / 60);
          renderHUD(1);
          if (renderer) await renderer.renderAsync(scene, camera);
          return snapshot();
        },
        get frameCount() {
          return frameCount;
        },
      };
    }
    window.__gameReady = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  } catch (error) {
    runtimeError = String(error?.stack || error);
    window.__gameError = runtimeError;
    console.error(error);
    $("loading").hidden = false;
    $("loadtext").textContent =
      "The expedition could not start: " +
      (error.message || error) +
      ". Reload in a current WebGPU or WebGL2 browser. CDN access is needed for the two pinned libraries.";
    if (AIHub.active) AIHub.fail("Unable to initialise graphics or physics: " + (error.message || error));
  }
}
function frame(now) {
  try {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    frameCount++;
    if (!hubInfo?.server) controls.poll(dt);
    const titleMenu = game.status === "title" && ["title", "settings", "about", "help"].includes(ui.screen);
    if (!AIHub.active && titleMenu && now - controls.lastInput >= 10000) beginAttract();
    networkTick(dt);
    const running =
      (game.status === "playing" || game.attract) &&
      (!ui.screen || AIHub.active) &&
      (!AIHub.active || (hubStarted && AIHub.time() >= 0)) &&
      !hubEnded;
    if (running && !testMode) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= 1 / 60 && steps < 6) {
        fixedStep(1 / 60);
        controls.consume();
        accumulator -= 1 / 60;
        steps++;
      }
    } else {
      accumulator = 0;
      if ((AIHub.active && !hubInfo?.isHost) || ui.screen) controls.consume();
    }
    if (AIHub.active && !hubInfo?.isHost && !hubEnded) {
      for (const t of worldObjects.traps) {
        const phase = (game.elapsed + t.id * 0.73) % 3.7;
        t.warning.material.opacity = phase > 1.65 && phase < 3.15 ? 0.25 : 0;
      }
      for (const b of worldObjects.projectiles) {
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.mesh.position.set(b.x, b.y, b.z);
      }
    }
    updateVisuals(dt);
    renderHUD(dt);
    if (!hubEnded) audio.tick(game.phase, dt);
    if (AIHub.active && hubStarted && renderer && !warming && !drawReady) {
      warming = true;
      renderer
        .compileAsync(scene, camera)
        .then(() => {
          drawReady = true;
        })
        .catch((error) => {
          window.__gameError = String(error);
          AIHub.fail("Graphics warm-up failed: " + error.message);
        });
    }
    if (drawReady && renderer) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  } catch (error) {
    runtimeError = String(error?.stack || error);
    window.__gameError = runtimeError;
    console.error(error);
    if (AIHub.active && !hubEnded) AIHub.fail("Simulation failed: " + error.message);
    $("loading").hidden = false;
    $("loadtext").textContent =
      "The expedition stopped: " + error.message + ". Reload to resume your checkpoint.";
  }
}
addEventListener("visibilitychange", () => {
  if (document.hidden && !AIHub.active && game.status === "playing" && !game.attract && !ui.screen)
    openMenu("pause");
});
boot();
