import * as THREE from 'three';

const $ = selector => document.querySelector(selector);
const screens = ['title-screen', 'touch-screen', 'panel-screen', 'hud', 'end-screen'];
const params = new URLSearchParams(location.search);
const infoMarkup = /* BUILD_ABOUT */;
const storageKey = 'splinter-cell-suspicion-settings-v1';
const defaults = { invertX: false, invertY: false, sound: true, sensitivity: 1 };
let settings = { ...defaults };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch {}

const state = {
  mode: 'title', ready: false, stage: 0, score: 0, health: 5, ammo: 12, reserve: 48,
  gadget: 0, gadgets: [2, 2], marks: [], execute: false, time: 0, alert: 0,
  idle: 0, titleIndex: 0, lastInput: 0, endSent: false, subtitleUntil: 0,
  toastUntil: 0, reloadUntil: 0, shotCooldown: 0, footstep: 0, attractTime: 0,
  ended: false, interacting: false, hubPending: false, reportTimer: 0,
};

const elements = {
  canvas: $('#world'), title: $('#title-screen'), touch: $('#touch-screen'),
  panel: $('#panel-screen'), panelTitle: $('#panel-title'), panelContent: $('#panel-content'),
  hud: $('#hud'), end: $('#end-screen'), engine: $('#engine-message'),
  touchEngine: $('#touch-engine'), worldLabels: $('#world-labels'),
};

let renderer, scene, camera, world, RAPIER, controller, playerBody, playerCollider, playerModel;
let audioContext, masterGain, musicClock = 0;
let enemies = [], obstacles = [], terminals = [], decor = [], sparks = [];
let player = { position: new THREE.Vector3(0, 0, 4), yaw: 0, pitch: .12, crouched: false, moving: false, aim: false };
let cameraTarget = new THREE.Vector3();
let lastFrame = performance.now();
let hasKeyboard = false;
let padPrevious = [];
let padNavCooldown = 0;
let pointerLocked = false;
let objectivePrevious = '';
const keys = new Set();
const mouse = { shooting: false, aiming: false };
const coarseOnly = matchMedia('(pointer: coarse) and (hover: none)').matches;
const up = new THREE.Vector3(0, 1, 0);
const scratch = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const clock = new THREE.Clock();
const objectives = [
  { title: 'Reach the listening post', hint: 'Get past the patrol. Interact with the relay.', short: 'RELAY', x: 0, z: -24 },
  { title: 'Pull the shipping manifest', hint: 'Find the terminal in the freight yard.', short: 'MANIFEST', x: 0, z: -54 },
  { title: 'Transmit the evidence', hint: 'Reach the uplink at the far end of the dock.', short: 'UPLINK', x: 0, z: -84 },
];
const stageLines = [
  'They buried the signal in a dead port. That means it matters.',
  'There it is. Names, dates, and a shipment nobody admitted existed.',
  'The uplink is still live. Get the evidence out before they bury it again.',
  'Transmission complete. They can deny it. They cannot erase it.',
];

function showScreen(id) {
  for (const screen of screens) $('#' + screen).classList.toggle('hidden', screen !== id);
}

function saveSettings() {
  try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
  if (masterGain) masterGain.gain.setTargetAtTime(settings.sound ? .15 : 0, audioContext.currentTime, .08);
}

function sound(frequency = 440, duration = .12, type = 'sine', volume = .12, endFrequency = frequency) {
  if (!settings.sound || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), audioContext.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function unlockAudio() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain();
      masterGain.gain.value = settings.sound ? .15 : 0;
      masterGain.connect(audioContext.destination);
    } catch { return; }
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
}

function music(delta) {
  if (!audioContext || !settings.sound || !['playing', 'attract'].includes(state.mode)) return;
  musicClock -= delta;
  if (musicClock <= 0) {
    const sequence = [55, 55, 65.4, 49, 55, 73.4, 65.4, 49];
    const index = Math.floor(state.time / 1.8) % sequence.length;
    sound(sequence[index], 1.65, 'triangle', .12, sequence[index] * .995);
    if (state.alert > .25) sound(sequence[index] * 2, .19, 'sawtooth', .035, sequence[index] * 1.4);
    musicClock = 1.8;
  }
}

function announce(text, seconds = 4) {
  $('#subtitle').textContent = text;
  state.subtitleUntil = state.time + seconds;
}

function toast(text, seconds = 2.4) {
  $('#toast').textContent = text;
  state.toastUntil = state.time + seconds;
}

function setMenuSelection(index) {
  const buttons = [...$('#main-menu').querySelectorAll('button')];
  state.titleIndex = (index + buttons.length) % buttons.length;
  buttons.forEach((button, item) => button.classList.toggle('selected', item === state.titleIndex));
}

function settingsMarkup() {
  return `<p class="panel-intro">Make the controls feel right. Changes save automatically.</p>
    <div class="settings-row"><div><strong>INVERT HORIZONTAL</strong><span>Reverse the look stick and mouse on the X axis.</span></div><button class="secondary setting" data-setting="invertX">${settings.invertX ? 'ON' : 'OFF'}</button></div>
    <div class="settings-row"><div><strong>INVERT VERTICAL</strong><span>Reverse the look stick and mouse on the Y axis.</span></div><button class="secondary setting" data-setting="invertY">${settings.invertY ? 'ON' : 'OFF'}</button></div>
    <div class="settings-row"><div><strong>AUDIO</strong><span>Music and synthesized sound effects.</span></div><button class="secondary setting" data-setting="sound">${settings.sound ? 'ON' : 'OFF'}</button></div>
    <div class="settings-row"><div><strong>LOOK SENSITIVITY</strong><span>Cycle between low, normal and high.</span></div><button class="secondary setting" data-setting="sensitivity">${settings.sensitivity === .65 ? 'LOW' : settings.sensitivity === 1.4 ? 'HIGH' : 'NORMAL'}</button></div>`;
}

function briefingMarkup() {
  return `<p class="panel-intro">The official record says the port is empty. The men guarding it disagree. Get in, find the manifest, and send the truth somewhere they cannot reach.</p>
  <div class="controls-grid">
    <div><strong>MOVE / LOOK</strong><span>Left / right stick · WASD / mouse</span></div>
    <div><strong>AIM / FIRE</strong><span>L2 / R2 · right / left mouse</span></div>
    <div><strong>CROUCH / SPRINT</strong><span>Circle / L3 · C / Shift</span></div>
    <div><strong>INTERACT / TAKEDOWN</strong><span>Cross / Square · E / F</span></div>
    <div><strong>MARK / EXECUTE</strong><span>R1 / L1 · Q / X</span></div>
    <div><strong>GADGET / SELECT</strong><span>Triangle / D-pad left-right · G / 1–2</span></div>
    <div><strong>RELOAD / PAUSE</strong><span>R3 / Options · R / Esc</span></div>
    <div><strong>STAY UNSEEN</strong><span>Crouch behind cover. Break sight to lose a search.</span></div>
  </div><p class="panel-note">A close takedown earns one execution. Mark up to three visible enemies, then execute them. EMP stuns nearby guards; decoys draw them away.</p>`;
}

let panelOrigin = 'title';
function openPanel(type, origin = state.mode) {
  panelOrigin = origin;
  if (origin === 'playing') {
    state.mode = 'paused';
    if (document.pointerLockElement) document.exitPointerLock();
  } else state.mode = 'panel';
  $('#panel-kicker').textContent = type === 'settings' ? 'FIELD CONFIGURATION' : type === 'about' ? 'THE MAKING OF' : 'MISSION INTEL';
  elements.panelTitle.textContent = type === 'settings' ? 'SETTINGS' : type === 'about' ? 'ABOUT / CREDITS' : 'THE BRIEF';
  elements.panelContent.innerHTML = type === 'settings' ? settingsMarkup() : type === 'about' ? infoMarkup : briefingMarkup();
  elements.panel.dataset.panel = type;
  showScreen('panel-screen');
  $('#back').focus({ preventScroll: true });
}

function closePanel() {
  state.idle = 0;
  if (panelOrigin === 'playing') {
    state.mode = 'playing';
    showScreen('hud');
  } else {
    state.mode = 'title';
    showScreen(coarseOnly && !hasKeyboard && !connectedPad() ? 'touch-screen' : 'title-screen');
    setMenuSelection(state.titleIndex);
  }
}

function handleAction(action) {
  unlockAudio();
  if (state.mode === 'attract') { exitAttract(); return; }
  if (action === 'settings') openPanel('settings');
  else if (action === 'briefing') openPanel('briefing');
  else if (action === 'about') openPanel('about');
  else if (action === 'deploy' || action === 'retry') startGame(false);
  else if (action === 'title') returnToTitle();
}

document.addEventListener('click', event => {
  const settingButton = event.target.closest('[data-setting]');
  if (settingButton) {
    const name = settingButton.dataset.setting;
    if (name === 'sensitivity') settings.sensitivity = settings.sensitivity === 1 ? 1.4 : settings.sensitivity === 1.4 ? .65 : 1;
    else settings[name] = !settings[name];
    saveSettings();
    elements.panelContent.innerHTML = settingsMarkup();
    const replacement = elements.panelContent.querySelector(`[data-setting="${name}"]`);
    if (replacement) replacement.focus({ preventScroll: true });
    sound(520, .06);
    return;
  }
  const button = event.target.closest('[data-action]');
  if (button) handleAction(button.dataset.action);
  if (event.target.closest('#back')) closePanel();
});

function inputActivity() {
  state.idle = 0;
  if (state.mode === 'attract') { exitAttract(); return true; }
  return false;
}

window.addEventListener('keydown', event => {
  hasKeyboard = true;
  if (inputActivity()) { event.preventDefault(); return; }
  if (coarseOnly && state.mode === 'title') showScreen('title-screen');
  const code = event.code;
  keys.add(code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) event.preventDefault();
  if (event.repeat) return;
  unlockAudio();
  if (state.mode === 'title') {
    if (code === 'ArrowDown' || code === 'KeyS') setMenuSelection(state.titleIndex + 1);
    if (code === 'ArrowUp' || code === 'KeyW') setMenuSelection(state.titleIndex - 1);
    if (code === 'Enter' || code === 'Space') handleAction([...$('#main-menu').querySelectorAll('button')][state.titleIndex].dataset.action);
  } else if (state.mode === 'panel' || state.mode === 'paused') {
    if (code === 'Escape' || code === 'Backspace') closePanel();
  } else if (state.mode === 'playing') {
    if (code === 'Escape') openPanel('settings', 'playing');
    if (code === 'KeyC') toggleCrouch();
    if (code === 'KeyE') interact();
    if (code === 'KeyF') takedown();
    if (code === 'KeyQ') markEnemy();
    if (code === 'KeyX') executeMarked();
    if (code === 'KeyR') reload();
    if (code === 'KeyG') useGadget();
    if (code === 'Digit1') selectGadget(0);
    if (code === 'Digit2') selectGadget(1);
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); mouse.shooting = false; mouse.aiming = false; });
window.addEventListener('pointerdown', event => {
  if (inputActivity()) { event.preventDefault(); return; }
  if (state.mode !== 'playing') return;
  unlockAudio();
  if (event.button === 0) {
    mouse.shooting = true;
    if (!pointerLocked && event.target === elements.canvas) elements.canvas.requestPointerLock?.();
  }
  if (event.button === 2) mouse.aiming = true;
});
window.addEventListener('pointerup', event => { if (event.button === 0) mouse.shooting = false; if (event.button === 2) mouse.aiming = false; });
window.addEventListener('contextmenu', event => { if (state.mode === 'playing') event.preventDefault(); });
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === elements.canvas; });
window.addEventListener('mousemove', event => {
  if (state.mode !== 'playing' || !pointerLocked) return;
  player.yaw -= event.movementX * .0022 * settings.sensitivity * (settings.invertX ? -1 : 1);
  player.pitch = THREE.MathUtils.clamp(player.pitch + event.movementY * .0018 * settings.sensitivity * (settings.invertY ? -1 : 1), -.45, .65);
});

function connectedPad() { return [...(navigator.getGamepads?.() || [])].find(Boolean); }
window.addEventListener('gamepadconnected', () => { state.idle = 0; if (state.mode === 'title') showScreen('title-screen'); });

function pollGamepad(delta) {
  const pad = connectedPad();
  if (!pad) { padPrevious = []; return null; }
  const buttons = pad.buttons.map(button => button.pressed);
  const pressed = index => buttons[index] && !padPrevious[index];
  const axis = index => Math.abs(pad.axes[index] || 0) > .17 ? pad.axes[index] : 0;
  const moveX = axis(0), moveY = axis(1), lookX = axis(2), lookY = axis(3);
  const changed = buttons.some((value, index) => value && !padPrevious[index]);
  if ((changed || Math.abs(moveX) + Math.abs(moveY) + Math.abs(lookX) + Math.abs(lookY) > .4) && state.mode === 'attract') {
    padPrevious = buttons; exitAttract(); return null;
  }
  if (changed || Math.abs(moveX) + Math.abs(moveY) + Math.abs(lookX) + Math.abs(lookY) > .4) state.idle = 0;
  if (changed) unlockAudio();
  padNavCooldown -= delta;
  if (state.mode === 'title') {
    if (pressed(13) || (moveY > .55 && padNavCooldown <= 0)) { setMenuSelection(state.titleIndex + 1); padNavCooldown = .25; }
    if (pressed(12) || (moveY < -.55 && padNavCooldown <= 0)) { setMenuSelection(state.titleIndex - 1); padNavCooldown = .25; }
    if (pressed(0)) handleAction([...$('#main-menu').querySelectorAll('button')][state.titleIndex].dataset.action);
  } else if (state.mode === 'panel' || state.mode === 'paused') {
    if (pressed(1) || pressed(9)) closePanel();
    else {
      const focusable = [...elements.panel.querySelectorAll('button')];
      const selected = focusable.indexOf(document.activeElement);
      if (pressed(13) || (moveY > .55 && padNavCooldown <= 0)) { focusable[(selected + 1) % focusable.length].focus(); padNavCooldown = .25; }
      if (pressed(12) || (moveY < -.55 && padNavCooldown <= 0)) { focusable[(selected - 1 + focusable.length) % focusable.length].focus(); padNavCooldown = .25; }
      if (pressed(0)) document.activeElement?.click();
    }
  } else if (state.mode === 'playing') {
    player.yaw -= lookX * 2.4 * delta * settings.sensitivity * (settings.invertX ? -1 : 1);
    player.pitch = THREE.MathUtils.clamp(player.pitch + lookY * 1.7 * delta * settings.sensitivity * (settings.invertY ? -1 : 1), -.45, .65);
    if (pressed(1)) toggleCrouch();
    if (pressed(0)) interact();
    if (pressed(2)) takedown();
    if (pressed(3)) useGadget();
    if (pressed(5)) markEnemy();
    if (pressed(4)) executeMarked();
    if (pressed(11)) reload();
    if (pressed(14)) selectGadget(0);
    if (pressed(15)) selectGadget(1);
    if (pressed(9)) openPanel('settings', 'playing');
  } else if (state.mode === 'end') {
    if (pressed(0)) startGame(false);
    if (pressed(1)) returnToTitle();
  }
  padPrevious = buttons;
  return { moveX, moveY, shoot: buttons[7], aim: buttons[6], sprint: buttons[10] };
}

function material(color, emissive = 0x000000) {
  return new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity: .7 });
}
const palette = {
  concrete: 0x222c30, wall: 0x202c30, metal: 0x33474a, crate: 0x48564e,
  yellow: 0xd1a24d, dark: 0x0c1518, blue: 0x91d6d0, red: 0xf06e58,
};

function box(width, height, depth, color, x, y, z, options = {}) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, options.emissive));
  object.position.set(x, y, z);
  object.castShadow = options.shadow !== false;
  object.receiveShadow = true;
  scene.add(object);
  if (options.collider) addObstacle(x, z, width, depth, height, y);
  return object;
}

function addObstacle(x, z, width, depth, height, y) {
  obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, height, y });
  world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2).setTranslation(x, y, z));
}

function lineBlocked(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  for (const object of obstacles) {
    if (object.height < 1.25 && !player.crouched) continue;
    let near = 0, far = 1;
    for (const [start, direction, min, max] of [[from.x, dx, object.minX, object.maxX], [from.z, dz, object.minZ, object.maxZ]]) {
      if (Math.abs(direction) < .00001) { if (start < min || start > max) { near = 2; break; } }
      else {
        let first = (min - start) / direction, second = (max - start) / direction;
        if (first > second) [first, second] = [second, first];
        near = Math.max(near, first); far = Math.min(far, second);
      }
    }
    if (near <= far && near > .01 && near < .99) return true;
  }
  return false;
}

function makePerson(color, hostile = false) {
  const group = new THREE.Group();
  function part(width, height, depth, x, y, z, shade) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(shade));
    mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh); return mesh;
  }
  const torso = part(.55, .67, .3, 0, 1.04, 0, color);
  part(.42, .31, .35, 0, 1.55, 0, hostile ? 0xb6a08d : 0xb8a99a);
  part(.48, .12, .38, 0, 1.72, 0, hostile ? 0x394342 : 0x10191b);
  const leftArm = part(.16, .58, .2, -.37, 1.02, 0, color);
  const rightArm = part(.16, .58, .2, .37, 1.02, 0, color);
  const leftLeg = part(.22, .65, .25, -.16, .37, 0, 0x151e20);
  const rightLeg = part(.22, .65, .25, .16, .37, 0, 0x151e20);
  part(.12, .13, .4, .35, .91, -.27, 0x101718);
  if (!hostile) {
    part(.09, .07, .05, -.14, 1.57, -.19, 0x8fe4b8);
    part(.09, .07, .05, 0, 1.62, -.19, 0x8fe4b8);
    part(.09, .07, .05, .14, 1.57, -.19, 0x8fe4b8);
    part(.32, .4, .14, 0, 1.1, .2, 0x111b1d);
  } else part(.42, .1, .04, 0, 1.56, -.19, 0x192326);
  group.userData.parts = { torso, leftArm, rightArm, leftLeg, rightLeg };
  return group;
}

function animatePerson(model, moving, elapsed, crouched = false) {
  const parts = model.userData.parts;
  const stride = moving ? Math.sin(elapsed * 10) * .65 : 0;
  parts.leftLeg.rotation.x = stride;
  parts.rightLeg.rotation.x = -stride;
  parts.leftArm.rotation.x = -stride * .6;
  parts.rightArm.rotation.x = stride * .5 - .5;
  model.scale.y = crouched ? .7 : 1;
}

function createTerminal(x, z, label) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.65, .75), material(0x27393a));
  cabinet.position.y = .82; cabinet.castShadow = true; group.add(cabinet);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .55), new THREE.MeshBasicMaterial({ color: 0x8dddc4 }));
  screen.position.set(0, 1.25, .385); group.add(screen);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.1, .04, .04), new THREE.MeshBasicMaterial({ color: 0xdac57c }));
  strip.position.set(0, .55, .39); group.add(strip);
  scene.add(group);
  addObstacle(x, z, 1.45, .75, 1.65, .825);
  const marker = document.createElement('div');
  marker.className = 'world-marker'; marker.innerHTML = `<b>◆</b><span>${label}</span>`;
  elements.worldLabels.appendChild(marker);
  return { group, marker, x, z };
}

function createGuard(x, z, zone, index) {
  const model = makePerson(index % 2 ? 0x57554a : 0x58635a, true);
  model.position.set(x, 0, z); model.rotation.y = Math.PI;
  scene.add(model);
  const marker = document.createElement('div'); marker.className = 'enemy-marker';
  elements.worldLabels.appendChild(marker);
  return { model, marker, position: model.position, home: new THREE.Vector3(x, 0, z), zone, index,
    state: 'patrol', alive: true, stunned: 0, suspicion: 0, shootTimer: 1 + index * .23,
    patrolDirection: index % 2 ? 1 : -1, searchTimer: 0, target: new THREE.Vector3(), marked: false };
}

function createWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b151a);
  scene.fog = new THREE.Fog(0x0b151a, 22, 100);
  camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .08, 160);
  scene.add(new THREE.HemisphereLight(0x9cc8c4, 0x18201e, 1.7));
  const moon = new THREE.DirectionalLight(0xa7c9c1, 2.0);
  moon.position.set(-15, 35, 4); scene.add(moon);
  const ambient = new THREE.AmbientLight(0x6e8c86, .35); scene.add(ambient);
  const floor = box(28, .4, 108, palette.concrete, 0, -.2, -44, { shadow: false });
  floor.receiveShadow = true;
  world.createCollider(RAPIER.ColliderDesc.cuboid(14, .2, 54).setTranslation(0, -.2, -44));
  box(1, 5, 106, palette.wall, -12.5, 2.5, -44, { collider: true });
  box(1, 5, 106, palette.wall, 12.5, 2.5, -44, { collider: true });
  box(25, 5, 1, palette.wall, 0, 2.5, -96, { collider: true });
  box(25, 3, 1, palette.wall, 0, 1.5, 10, { collider: true });
  for (const gateZ of [-30, -60]) {
    box(9.1, 3.5, .7, 0x293b3b, -7.45, 1.75, gateZ, { collider: true });
    box(9.1, 3.5, .7, 0x293b3b, 7.45, 1.75, gateZ, { collider: true });
    box(6, .5, .8, 0x43514a, 0, 3.25, gateZ);
    box(.13, 3, .8, palette.yellow, -2.95, 1.5, gateZ);
    box(.13, 3, .8, palette.yellow, 2.95, 1.5, gateZ);
  }
  const crates = [
    [-4, -8, 3, 2.4], [5, -15, 3, 2.2], [-5, -20, 3.2, 2.7],
    [5, -35, 3.5, 2.5], [-5, -42, 3.5, 2.8], [5, -49, 3.1, 2],
    [-5, -65, 3.4, 2.3], [5, -71, 3.4, 2.7], [-5, -78, 3, 2.5],
  ];
  for (const [x, z, width, depth] of crates) {
    const height = z === -42 || z === -71 ? 3.2 : 1.45;
    box(width, height, depth, palette.crate, x, height / 2, z, { collider: true });
    for (let offset = -width / 2 + .35; offset < width / 2; offset += .7) box(.07, height + .02, depth + .03, 0x637269, x + offset, height / 2, z, { shadow: false });
    box(width + .04, .07, depth + .04, 0x182826, x, .2, z, { shadow: false });
  }
  for (let index = 0; index < 13; index++) {
    const z = 4 - index * 7.5;
    box(.08, .015, 3.3, 0x927b4b, -1.5, .015, z, { shadow: false });
    box(.08, .015, 3.3, 0x927b4b, 1.5, .015, z, { shadow: false });
    if (index % 2 === 0) {
      box(.14, 5.4, .14, 0x3c4b47, 10.8, 2.7, z);
      box(.8, .12, .45, 0xe5c684, 10.5, 5.25, z, { emissive: 0x90723b });
      const light = new THREE.PointLight(0xf3bf68, 16, 12, 2); light.position.set(10.3, 4.8, z); scene.add(light);
    }
    box(2.5, .05, .05, 0x52605a, -11.9, 3.3, z);
    box(2.5, .05, .05, 0x52605a, 11.9, 3.3, z);
  }
  for (let index = 0; index < 7; index++) {
    box(2.3, 2 + index % 3, 2, 0x18282d, -16 - index % 2 * 3, 1 + index % 3 / 2, 5 - index * 15);
    box(3, 3 + index % 2, 2, 0x1b292c, 16 + index % 2 * 3, 1.5 + index % 2 / 2, -index * 15);
  }
  terminals = objectives.map(objective => createTerminal(objective.x, objective.z, objective.short));
  enemies = [
    createGuard(3, -13, 0, 0), createGuard(-3.5, -21, 0, 1),
    createGuard(3.6, -38, 1, 2), createGuard(-3.5, -47, 1, 3),
    createGuard(3.6, -65, 2, 4), createGuard(-3.5, -73, 2, 5),
    createGuard(3, -82, 2, 6),
  ];
  playerModel = makePerson(0x253431);
  scene.add(playerModel);
  playerBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, .95, 4));
  playerCollider = world.createCollider(RAPIER.ColliderDesc.capsule(.55, .3), playerBody);
  controller = world.createCharacterController(.02);
  controller.enableSnapToGround(.2);
  player.position.set(0, 0, 4);
  resetCamera();
}

function resetCamera() {
  camera.position.set(player.position.x + 2.2, 3.2, player.position.z + 5.8);
  cameraTarget.set(player.position.x, 1.25, player.position.z - 3);
  camera.lookAt(cameraTarget);
}

function resetGame() {
  state.stage = 0; state.score = 0; state.health = 5; state.ammo = 12; state.reserve = 48;
  state.gadget = 0; state.gadgets = [2, 2]; state.marks = []; state.execute = false;
  state.time = 0; state.alert = 0; state.endSent = false; state.ended = false;
  state.subtitleUntil = 0; state.toastUntil = 0; state.reloadUntil = 0; state.shotCooldown = 0;
  state.attractTime = 0; state.reportTimer = 0; objectivePrevious = '';
  keys.clear(); mouse.shooting = false; mouse.aiming = false;
  player.position.set(0, 0, 4); player.yaw = 0; player.pitch = .12; player.crouched = false; player.aim = false;
  playerBody.setTranslation({ x: 0, y: .95, z: 4 }, true);
  playerBody.setNextKinematicTranslation({ x: 0, y: .95, z: 4 });
  for (const enemy of enemies) {
    enemy.position.copy(enemy.home); enemy.model.visible = true; enemy.model.rotation.y = Math.PI;
    enemy.state = 'patrol'; enemy.alive = true; enemy.stunned = 0; enemy.suspicion = 0;
    enemy.shootTimer = 1 + enemy.index * .23; enemy.marked = false; enemy.searchTimer = 0;
  }
  for (const terminal of terminals) terminal.group.children[1].material.color.setHex(0x8dddc4);
  playerModel.visible = true; resetCamera();
}

function startGame(attract = false) {
  if (!state.ready) { elements.engine.textContent = 'WebGPU is required to deploy. Check browser support and GPU access.'; return; }
  resetGame();
  state.mode = attract ? 'attract' : 'playing';
  showScreen('hud');
  $('#attract-label').classList.toggle('hidden', !attract);
  announce(stageLines[0], 6);
  if (!attract && !connectedPad() && !coarseOnly) toast('CLICK TO CAPTURE MOUSE · ESC TO PAUSE', 4);
  updateHud();
}

function exitAttract() { if (document.pointerLockElement) document.exitPointerLock(); returnToTitle(); }

function returnToTitle() {
  state.mode = 'title'; state.idle = 0; state.ended = false;
  keys.clear(); mouse.shooting = false; mouse.aiming = false;
  if (document.pointerLockElement) document.exitPointerLock();
  showScreen(coarseOnly && !hasKeyboard && !connectedPad() ? 'touch-screen' : 'title-screen');
  setMenuSelection(state.titleIndex);
}

function toggleCrouch() { player.crouched = !player.crouched; sound(170, .07, 'triangle', .05); }
function selectGadget(index) { state.gadget = index; toast(index === 0 ? 'EMP SELECTED' : 'DECOY SELECTED'); sound(400, .08); }

function interact() {
  if (state.mode !== 'playing' && state.mode !== 'attract') return;
  const objective = objectives[state.stage];
  if (!objective) return;
  const distance = Math.hypot(player.position.x - objective.x, player.position.z - objective.z);
  if (distance > 2.65) { toast('GET CLOSER TO THE OBJECTIVE'); return; }
  terminals[state.stage].group.children[1].material.color.setHex(0x365c51);
  state.score += 500; state.stage++;
  sound(620, .14, 'triangle', .12, 900); sound(910, .2, 'sine', .08, 1100);
  if (state.stage >= objectives.length) {
    announce(stageLines[3], 4);
    if (state.mode === 'playing') finishGame(true);
    else state.attractTime = 65;
  } else {
    announce(stageLines[state.stage], 6);
    toast(state.stage === 1 ? 'RELAY ACCESSED · +500' : 'MANIFEST SECURED · +500');
  }
}

function nearestEnemy(range, requireFront = false) {
  const facing = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  let best = null, bestDistance = range;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const direction = enemy.position.clone().sub(player.position); direction.y = 0;
    const distance = direction.length();
    if (distance > bestDistance || lineBlocked(player.position, enemy.position)) continue;
    if (requireFront && facing.dot(direction.normalize()) < .35) continue;
    best = enemy; bestDistance = distance;
  }
  return best;
}

function targetEnemy() {
  const facing = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  let best = null, bestValue = Infinity;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const direction = enemy.position.clone().sub(player.position); direction.y = 0;
    const distance = direction.length();
    if (distance > 26 || distance < .1 || lineBlocked(player.position, enemy.position)) continue;
    const angle = Math.acos(THREE.MathUtils.clamp(facing.dot(direction.normalize()), -1, 1));
    if (angle > (player.aim ? .17 : .24)) continue;
    const value = angle * 20 + distance * .025;
    if (value < bestValue) { best = enemy; bestValue = value; }
  }
  return best;
}

function killEnemy(enemy, points, method) {
  if (!enemy || !enemy.alive) return;
  enemy.alive = false; enemy.state = 'down'; enemy.marked = false;
  enemy.model.rotation.z = Math.PI / 2; enemy.model.position.y = .25;
  enemy.marker.style.display = 'none';
  state.marks = state.marks.filter(mark => mark !== enemy);
  state.score += points;
  if (method) toast(`${method} · +${points}`);
}

function takedown() {
  const enemy = nearestEnemy(2.1);
  if (!enemy) { toast('NO GUARD IN REACH'); return; }
  killEnemy(enemy, 250, 'TAKEDOWN'); state.execute = true;
  sound(100, .18, 'triangle', .18, 50);
  toast('TAKEDOWN · EXECUTION READY');
}

function markEnemy() {
  const enemy = targetEnemy();
  if (!enemy) { toast('AIM TOWARD A VISIBLE GUARD TO MARK'); return; }
  if (enemy.marked) {
    enemy.marked = false; state.marks = state.marks.filter(mark => mark !== enemy); toast('MARK REMOVED');
  } else if (state.marks.length < 3) {
    enemy.marked = true; state.marks.push(enemy); toast(`TARGET MARKED · ${state.marks.length}/3`);
  } else toast('THREE TARGETS MARKED');
  sound(740, .08, 'sine', .1);
}

function executeMarked() {
  if (!state.execute) { toast('TAKEDOWN A GUARD TO EARN EXECUTION'); return; }
  const valid = state.marks.filter(enemy => enemy.alive && enemy.position.distanceTo(player.position) < 26 && !lineBlocked(player.position, enemy.position));
  if (!valid.length) { toast('MARK A VISIBLE TARGET FIRST'); return; }
  for (const enemy of valid) killEnemy(enemy, 200, '');
  state.execute = false; toast(`EXECUTED ${valid.length} · +${valid.length * 200}`);
  sound(140, .18, 'sawtooth', .17, 70);
}

function reload() {
  if (state.ammo >= 12 || state.reserve <= 0 || state.reloadUntil > state.time) return;
  state.reloadUntil = state.time + 1.1;
  sound(340, .08, 'triangle', .08, 220); toast('RELOADING');
}

function shoot() {
  if (state.shotCooldown > 0 || state.reloadUntil > state.time) return;
  if (state.ammo <= 0) { reload(); return; }
  state.ammo--; state.shotCooldown = .24;
  sound(125, .09, 'sawtooth', .12, 45);
  const enemy = targetEnemy();
  if (enemy) { killEnemy(enemy, 100, 'NEUTRALIZED'); }
  for (const guard of enemies) if (guard.alive && guard.position.distanceTo(player.position) < 9) {
    guard.state = 'search'; guard.searchTimer = 5; guard.target.copy(player.position);
  }
}

function useGadget() {
  if (state.gadgets[state.gadget] <= 0) { toast('NO GADGETS REMAINING'); return; }
  state.gadgets[state.gadget]--;
  if (state.gadget === 0) {
    let count = 0;
    for (const enemy of enemies) if (enemy.alive && enemy.position.distanceTo(player.position) < 8 && !lineBlocked(player.position, enemy.position)) {
      enemy.stunned = 7; enemy.state = 'stunned'; count++;
    }
    toast(`EMP DEPLOYED · ${count} STUNNED`); sound(800, .55, 'sine', .15, 100);
  } else {
    const direction = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const destination = player.position.clone().addScaledVector(direction, 7);
    destination.x = THREE.MathUtils.clamp(destination.x, -10, 10);
    destination.z = THREE.MathUtils.clamp(destination.z, -93, 8);
    for (const enemy of enemies) if (enemy.alive && enemy.position.distanceTo(destination) < 16 && enemy.stunned <= 0) {
      enemy.state = 'search'; enemy.target.copy(destination); enemy.searchTimer = 9;
    }
    toast('DECOY DEPLOYED'); sound(1100, .3, 'square', .035, 700);
  }
}

function finishGame(won, timedOut = false) {
  if (state.ended) return;
  state.ended = true; state.mode = 'end';
  if (document.pointerLockElement) document.exitPointerLock();
  $('#end-kicker').textContent = won ? 'MISSION COMPLETE' : timedOut ? 'SESSION COMPLETE' : 'AGENT DOWN';
  $('#end-title').textContent = won ? 'THE TRUTH GOT OUT.' : timedOut ? 'TIME IS UP.' : 'THEY FOUND YOU.';
  $('#end-copy').textContent = won ? 'The manifest is out of their hands. The people on it will have to answer for themselves.' : timedOut ? 'Your field report has been submitted. Every piece of evidence counts.' : 'The port is still standing. Get back in and finish the job.';
  $('#final-score').textContent = state.score.toLocaleString();
  showScreen('end-screen');
  sound(won ? 600 : 110, .7, 'triangle', .15, won ? 900 : 55);
  reportResult();
}

function reportResult() {
  if (!state.endSent && window.AIHub?.active) {
    state.endSent = true;
    window.AIHub.result({ score: Math.max(0, Math.round(state.score)) });
  }
}

function updatePlayer(delta, pad) {
  forward.set(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, Math.sin(player.yaw));
  let moveX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + (pad?.moveX || 0);
  let moveY = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0) - (pad?.moveY || 0);
  const movement = new THREE.Vector3().addScaledVector(right, moveX).addScaledVector(forward, moveY);
  if (movement.length() > 1) movement.normalize();
  const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight') || pad?.sprint) && !player.crouched;
  const speed = player.crouched ? 2.05 : sprinting ? 5.8 : 3.7;
  player.aim = mouse.aiming || Boolean(pad?.aim);
  player.moving = movement.length() > .08;
  controller.computeColliderMovement(playerCollider, { x: movement.x * speed * delta, y: -.12, z: movement.z * speed * delta });
  const translation = playerBody.translation(); const computed = controller.computedMovement();
  playerBody.setNextKinematicTranslation({ x: translation.x + computed.x, y: translation.y + computed.y, z: translation.z + computed.z });
  world.step();
  const next = playerBody.translation(); player.position.set(next.x, next.y - .85, next.z);
  playerModel.position.copy(player.position);
  playerModel.rotation.y = -player.yaw;
  animatePerson(playerModel, player.moving, state.time, player.crouched);
  if (player.moving && state.time > state.footstep) { sound(player.crouched ? 90 : 120, .06, 'triangle', .025); state.footstep = state.time + (sprinting ? .26 : .43); }
  if (mouse.shooting || pad?.shoot) shoot();
}

function updateEnemies(delta) {
  let highest = 0;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (enemy.stunned > 0) {
      enemy.stunned -= delta;
      if (enemy.stunned <= 0) { enemy.state = 'search'; enemy.searchTimer = 4; enemy.target.copy(player.position); }
      animatePerson(enemy.model, false, state.time); continue;
    }
    const toPlayer = player.position.clone().sub(enemy.position); toPlayer.y = 0;
    const distance = toPlayer.length();
    const facing = new THREE.Vector3(-Math.sin(enemy.model.rotation.y), 0, -Math.cos(enemy.model.rotation.y));
    const inFront = facing.dot(toPlayer.clone().normalize()) > -.08;
    const range = player.crouched ? 8 : 14;
    const sees = distance < range && (inFront || distance < 3.5) && !lineBlocked(enemy.position, player.position);
    if (sees) {
      enemy.suspicion = Math.min(1, enemy.suspicion + delta * (distance < 5 ? 1.3 : .55));
      enemy.target.copy(player.position); enemy.searchTimer = 6;
      if (enemy.suspicion >= 1) enemy.state = 'attack';
    } else {
      enemy.suspicion = Math.max(0, enemy.suspicion - delta * .18);
      if (enemy.state === 'attack') { enemy.state = 'search'; enemy.searchTimer = 7; }
    }
    if (enemy.state === 'attack') {
      highest = 1;
      enemy.model.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
      enemy.shootTimer -= delta;
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = 1.4 + enemy.index % 3 * .25;
        if (state.mode === 'playing') {
          state.health--; sound(80, .2, 'sawtooth', .16, 40);
          document.body.classList.remove('hit'); void document.body.offsetWidth; document.body.classList.add('hit');
          if (state.health <= 0) { finishGame(false); return; }
        }
      }
      animatePerson(enemy.model, false, state.time);
    } else if (enemy.state === 'search') {
      highest = Math.max(highest, .55); enemy.searchTimer -= delta;
      const direction = enemy.target.clone().sub(enemy.position); direction.y = 0;
      if (direction.length() > 1) {
        direction.normalize(); const candidate = enemy.position.clone().addScaledVector(direction, delta * 1.9);
        if (!lineBlocked(enemy.position, candidate)) enemy.position.copy(candidate);
        enemy.model.rotation.y = Math.atan2(-direction.x, -direction.z);
      }
      animatePerson(enemy.model, direction.length() > .5, state.time);
      if (enemy.searchTimer <= 0) { enemy.state = 'patrol'; enemy.suspicion = 0; }
    } else {
      highest = Math.max(highest, enemy.suspicion * .5);
      enemy.position.x += delta * .65 * enemy.patrolDirection;
      if (Math.abs(enemy.position.x - enemy.home.x) > 1.8) enemy.patrolDirection *= -1;
      enemy.model.rotation.y = enemy.patrolDirection > 0 ? -Math.PI / 2 : Math.PI / 2;
      animatePerson(enemy.model, true, state.time);
    }
  }
  state.alert = THREE.MathUtils.lerp(state.alert, highest, Math.min(1, delta * 2));
}

function updateAttract(delta) {
  state.attractTime += delta;
  const objective = objectives[Math.min(state.stage, 2)];
  const travelTarget = objective.z + 2.1;
  const translation = playerBody.translation();
  const deltaZ = Math.max(-delta * 4.7, travelTarget - player.position.z);
  const deltaX = THREE.MathUtils.clamp(-player.position.x, -delta * 2, delta * 2);
  controller.computeColliderMovement(playerCollider, { x: deltaX, y: -.12, z: deltaZ });
  const computed = controller.computedMovement();
  playerBody.setNextKinematicTranslation({ x: translation.x + computed.x, y: translation.y + computed.y, z: translation.z + computed.z });
  world.step();
  const next = playerBody.translation(); player.position.set(next.x, next.y - .85, next.z);
  player.yaw = Math.sin(state.attractTime * .2) * .08;
  player.crouched = Math.floor(state.attractTime / 8) % 2 === 1;
  playerModel.position.copy(player.position); playerModel.rotation.y = -player.yaw;
  animatePerson(playerModel, true, state.time, player.crouched);
  for (const enemy of enemies) {
    if (enemy.alive && enemy.position.distanceTo(player.position) < 6) {
      if (!state.execute) { killEnemy(enemy, 250, 'TAKEDOWN'); state.execute = true; }
      else { enemy.marked = true; state.marks.push(enemy); executeMarked(); }
    }
  }
  if (Math.abs(player.position.z - travelTarget) < .3) interact();
  if (state.attractTime > 66) startGame(true);
}

function updateCamera(delta) {
  const facing = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const side = new THREE.Vector3(Math.cos(player.yaw), 0, Math.sin(player.yaw));
  const distance = player.aim ? 3.2 : 5.5;
  const desired = player.position.clone().addScaledVector(facing, -distance).addScaledVector(side, player.aim ? .85 : 1.3);
  desired.y += (player.aim ? 2 : 2.8) + player.pitch * 2;
  camera.position.lerp(desired, Math.min(1, delta * 7));
  const target = player.position.clone().addScaledVector(facing, 8);
  target.y += 1.35 - player.pitch * 4;
  cameraTarget.lerp(target, Math.min(1, delta * 8)); camera.lookAt(cameraTarget);
}

function positionMarker(element, position, offset = 2.2) {
  scratch.copy(position); scratch.y += offset; scratch.project(camera);
  const visible = scratch.z < 1 && scratch.z > -1 && Math.abs(scratch.x) < 1.1 && Math.abs(scratch.y) < 1.1;
  element.style.display = visible ? 'block' : 'none';
  if (visible) element.style.transform = `translate(-50%, -50%) translate(${(scratch.x * .5 + .5) * innerWidth}px, ${(-scratch.y * .5 + .5) * innerHeight}px)`;
}

function updateHud() {
  const objective = objectives[state.stage];
  if (objective) {
    $('#objective-tag').textContent = `OBJECTIVE 0${state.stage + 1} / 03`;
    $('#objective-text').textContent = objective.title;
    $('#objective-hint').textContent = objective.hint;
    const distance = Math.round(Math.hypot(player.position.x - objective.x, player.position.z - objective.z));
    const promptText = distance <= 2.65 ? '✕ / E  INTERACT' : '';
    $('#prompt-text').textContent = promptText;
    $('#prompt').classList.toggle('hidden', !promptText);
  }
  $('#score').textContent = String(state.score).padStart(5, '0');
  const minutes = Math.floor(state.time / 60).toString().padStart(2, '0');
  const seconds = Math.floor(state.time % 60).toString().padStart(2, '0');
  $('#clock').textContent = `${minutes}:${seconds}`;
  $('#alert').textContent = state.alert > .75 ? 'COMPROMISED' : state.alert > .25 ? 'SEARCHING' : 'UNDETECTED';
  $('#alert').dataset.level = state.alert > .75 ? 'danger' : state.alert > .25 ? 'warning' : 'safe';
  [...$('#health-bars').children].forEach((bar, index) => bar.classList.toggle('lost', index >= state.health));
  $('#stance').textContent = player.crouched ? 'CROUCHED' : 'STANDING';
  $('#execute-label').textContent = state.execute ? 'EXECUTE READY' : 'EXECUTE LOCKED';
  $('#execute-label').classList.toggle('ready', state.execute);
  $('#marks-label').textContent = `MARKED ${state.marks.length}/3`;
  $('#ammo').textContent = String(state.ammo).padStart(2, '0');
  $('#reserve').textContent = String(state.reserve).padStart(2, '0');
  $('#gadget-label').textContent = `${state.gadget === 0 ? 'EMP' : 'DECOY'} ×${state.gadgets[state.gadget]}`;
  $('#subtitle').classList.toggle('hidden', state.time > state.subtitleUntil);
  $('#toast').classList.toggle('hidden', state.time > state.toastUntil);
  const nearby = nearestEnemy(2.1);
  const tutorial = nearby ? '□ / F TAKEDOWN' : state.execute && !state.marks.length ? 'R1 / Q MARK  ·  L1 / X EXECUTE' : state.time < 25 ? 'L2 AIM  ·  R2 FIRE  ·  ○ CROUCH' : '△ GADGET  ·  D-PAD SELECT  ·  OPTIONS PAUSE';
  if (objectivePrevious !== tutorial) { $('#tutorial').textContent = tutorial; objectivePrevious = tutorial; }
  for (let index = 0; index < terminals.length; index++) {
    const terminal = terminals[index];
    if (index === state.stage) positionMarker(terminal.marker, terminal.group.position, 2.5);
    else terminal.marker.style.display = 'none';
  }
  const aimed = targetEnemy();
  $('#reticle').classList.toggle('on-target', Boolean(aimed));
  for (const enemy of enemies) {
    if (!enemy.alive) { enemy.marker.style.display = 'none'; continue; }
    const symbol = enemy.marked ? '◆' : enemy.stunned > 0 ? '✦' : enemy.state === 'attack' ? '!' : enemy.suspicion > .2 ? '?' : '';
    if (symbol) { enemy.marker.textContent = symbol; enemy.marker.classList.toggle('marked', enemy.marked); positionMarker(enemy.marker, enemy.position, 2.25); }
    else enemy.marker.style.display = 'none';
  }
}

function resize() {
  if (!renderer || !camera) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function frame(now) {
  requestAnimationFrame(frame);
  const delta = Math.min(.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
  const pad = pollGamepad(delta);
  if (state.mode === 'title') {
    state.idle += delta;
    if (state.idle >= 10 && state.ready && !(coarseOnly && !hasKeyboard && !pad)) startGame(true);
  }
  if (!state.ready) return;
  if (state.mode === 'playing' || state.mode === 'attract') {
    state.time += delta; state.shotCooldown = Math.max(0, state.shotCooldown - delta);
    if (state.reloadUntil && state.time >= state.reloadUntil) {
      const amount = Math.min(12 - state.ammo, state.reserve); state.ammo += amount; state.reserve -= amount;
      state.reloadUntil = 0; sound(500, .1, 'triangle', .08);
    }
    if (state.mode === 'attract') updateAttract(delta); else updatePlayer(delta, pad);
    updateEnemies(delta);
    if (state.mode === 'playing' || state.mode === 'attract') {
      updateCamera(delta); updateHud(); music(delta);
      if (state.mode === 'playing' && window.AIHub?.active) {
        state.reportTimer += delta;
        if (state.reportTimer >= 2) { state.reportTimer = 0; window.AIHub.progress({ score: state.score, label: objectives[Math.min(state.stage, 2)].short }); }
      }
    }
  } else if (state.mode === 'title' || state.mode === 'panel') {
    camera.position.x = Math.sin(now * .0001) * 2 + 2.2;
    camera.lookAt(0, 1.4, -9);
  }
  renderer.render(scene, camera);
}

async function initialize() {
  setMenuSelection(0);
  if (coarseOnly && !connectedPad()) showScreen('touch-screen'); else showScreen('title-screen');
  requestAnimationFrame(frame);
  if (!navigator.gpu) {
    const message = 'WEBGPU UNAVAILABLE · Use a WebGPU-capable browser and enable GPU acceleration.';
    elements.engine.textContent = message; elements.touchEngine.textContent = message;
    return;
  }
  try {
    const rapierModule = await import('rapier');
    RAPIER = rapierModule.default || rapierModule;
    await RAPIER.init();
    renderer = new THREE.WebGPURenderer({ canvas: elements.canvas, antialias: true });
    renderer._getFallback = null;
    await renderer.init();
    if (!renderer.backend.isWebGPUBackend) throw new Error('WebGPU backend unavailable');
    renderer.setClearColor(0x0b151a);
    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    createWorld(); resize(); state.ready = true;
    elements.engine.textContent = 'SYSTEM READY · WEBGPU ONLINE';
    elements.touchEngine.textContent = 'SYSTEM READY · CONNECT A CONTROLLER';
    if (window.AIHub?.active) window.AIHub.ready();
    if (state.hubPending) startGame(false);
  } catch (error) {
    console.error('Initialization failed:', error);
    elements.engine.textContent = 'WEBGPU INITIALIZATION FAILED · Check GPU acceleration and reload.';
    elements.touchEngine.textContent = 'WEBGPU INITIALIZATION FAILED · Check GPU acceleration and reload.';
  }
}

if (window.AIHub?.active) {
  window.AIHub.on('start', () => { if (state.ready) startGame(false); else state.hubPending = true; });
  window.AIHub.on('time-up', () => { if (state.mode === 'playing') finishGame(false, true); else reportResult(); });
  window.AIHub.on('end', () => { if (state.mode === 'playing') finishGame(false, true); else reportResult(); });
  window.AIHub.connect({ mode: 'parallel', seats: [1, 4] });
}

if (params.has('test')) {
  window.__suspicion = {
    state, start: () => startGame(false), attract: () => startGame(true), interact,
    teleport(x, z) { playerBody.setTranslation({ x, y: .95, z }, true); playerBody.setNextKinematicTranslation({ x, y: .95, z }); player.position.set(x, .1, z); },
    get enemies() { return enemies; }, get player() { return player; }, markEnemy, executeMarked, takedown, useGadget, reload,
  };
}

initialize();
