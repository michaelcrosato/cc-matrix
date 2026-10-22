// Bootstrap and top-level flow: title, options, briefing, missions, results, attract.
import * as THREE from 'three/webgpu';
import { input } from './input.js';
import { settings, saveSettings, DEFAULTS } from './settings.js';
import { initAudio, applyVolumes, playMusic, stopMusic, sfx } from './audio.js';
import { Physics } from './physics.js';
import { Game } from './game.js';
import { Hud } from './hud.js';
import { Menus } from './menus.js';
import { STAGES } from './stages.js';
import * as A from './assets.js';
import { ABOUT_HTML } from './credits.js';

const $ = (id) => document.getElementById(id);
const stageEl = $('stage');
const hudEl = $('hud');
const menuEl = $('menu');
const bootEl = $('boot');

const hud = new Hud(hudEl);
const menus = new Menus(menuEl);

const IDLE_TO_ATTRACT = 10;

let renderer = null;
let physics = null;
let camera = null;
let titleScene = null;
let titleArwing = null;
let game = null;
let mode = 'boot';
let idle = 0;
let pendingEnd = null;
let campaignStage = 0;
let lastResult = null;
let attractIndex = 0;
let attractGrace = 0;
let attractTag = null;
let touchOnly = false;
let pausedFromPlay = false;

// Controller or keyboard only: touch-only devices get the required-input notice.
function isTouchOnly() {
  return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
}

// Button hints adapt to the last device used, so the prompt matches the controller in hand.
function hint(pad, kb) {
  return input.lastDevice === 'pad' ? pad : kb;
}

function keyHints() {
  return hint(
    '&#10005; Select &nbsp; &#9675; Back &nbsp; D-pad / Left stick: Move',
    'Enter Select &nbsp; Esc Back &nbsp; Arrows / WASD: Move',
  );
}

// ---- Screens ----------------------------------------------------------------

function titleScreen() {
  return {
    id: 'title',
    kicker: 'A SPIRITUAL SUCCESSOR',
    title: 'STARFOCK 64',
    subtitle: 'Shardfall is coming. Your squadron needs you.',
    items: [
      { label: 'Start Mission', onSelect: () => openBriefing(0) },
      { label: 'Options', onSelect: openOptions },
      { label: 'About &amp; Credits', onSelect: openAbout },
    ],
    footer: keyHints(),
  };
}

function briefingScreen(i) {
  const st = STAGES[i];
  return {
    id: 'briefing',
    kicker: `MISSION ${i + 1} OF ${STAGES.length}`,
    title: st.name,
    subtitle: st.brief,
    items: [
      { label: 'Launch', onSelect: () => launch(i) },
      { label: 'Back to Title', onSelect: goTitle },
    ],
    onBack: goTitle,
    footer: keyHints(),
  };
}

function optionsScreen(from) {
  const back = () => {
    if (from === 'pause') menus.show(pauseScreen());
    else if (touchOnly) openTouchNotice();
    else goTitle();
  };
  const pct = (v) => `${Math.round(v * 100)}%`;
  const onOff = (b) => (b ? 'ON' : 'OFF');
  const slider = (key, step, min, max, fmt) => ({
    label: '',
    value: () => fmt(settings[key]),
    onAdjust: (dir) => {
      settings[key] = Math.round(Math.min(max, Math.max(min, settings[key] + dir * step)) * 100) / 100;
      applyVolumes();
      saveSettings();
    },
  });
  const toggle = (key) => ({
    label: '',
    value: () => onOff(settings[key]),
    onSelect: () => {
      settings[key] = !settings[key];
      saveSettings();
    },
    onAdjust: () => {
      settings[key] = !settings[key];
      saveSettings();
    },
  });
  const items = [
    { ...toggle('invertX'), label: 'Invert Stick Left / Right' },
    { ...toggle('invertY'), label: 'Invert Stick Up / Down' },
    { ...slider('sensitivity', 0.1, 0.5, 1.5, pct), label: 'Stick Sensitivity' },
    { ...slider('deadzone', 0.05, 0.05, 0.3, pct), label: 'Stick Dead Zone' },
    { ...slider('musicVol', 0.1, 0, 1, pct), label: 'Music Volume' },
    { ...slider('sfxVol', 0.1, 0, 1, pct), label: 'Effects Volume' },
    { ...toggle('shake'), label: 'Camera Shake' },
    {
      label: 'Stick Test',
      live: true, // refreshed each frame by menus.patch()
      value: () => {
        const s = input.stick;
        return `X ${s.x >= 0 ? '+' : ''}${s.x.toFixed(2)}   Y ${s.y >= 0 ? '+' : ''}${s.y.toFixed(2)}`;
      },
    },
    {
      label: 'Reset to Defaults',
      onSelect: () => {
        Object.assign(settings, DEFAULTS);
        applyVolumes();
        saveSettings();
      },
    },
    { label: 'Back', onSelect: back },
  ];
  return {
    id: 'options',
    kicker: 'SETTINGS',
    title: 'Options',
    subtitle: 'If the stick feels reversed, flip the Invert options. Move the stick to check the readout.',
    items,
    onBack: back,
    footer: keyHints(),
    wide: true,
  };
}

function aboutScreen() {
  return {
    id: 'about',
    kicker: 'CREDITS',
    title: 'About &amp; Credits',
    body: ABOUT_HTML,
    scroll: true,
    wide: true,
    onBack: goTitle,
    footer: hint('&#9675; Back &nbsp; Left stick: Scroll', 'Esc Back &nbsp; Arrows: Scroll'),
  };
}

function resultsScreen(r) {
  const st = STAGES[r.stageIndex];
  const ratio = r.ringsTotal ? r.rings / r.ringsTotal : 0;
  const medal = r.deaths === 0 && ratio >= 0.9 ? 'PLATINUM' : ratio >= 0.7 ? 'GOLD' : ratio >= 0.4 ? 'SILVER' : 'BRONZE';
  const accuracy = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
  const last = r.stageIndex + 1 >= STAGES.length;
  const body = `
    <div class="stats">
      <div class="stat"><span class="k">Score</span><span class="v">${r.score.toLocaleString('en-US')}</span></div>
      <div class="stat"><span class="k">Enemies down</span><span class="v">${r.kills}</span></div>
      <div class="stat"><span class="k">Rings</span><span class="v">${r.rings} / ${r.ringsTotal}</span></div>
      <div class="stat"><span class="k">Accuracy</span><span class="v">${accuracy}%</span></div>
      <div class="stat"><span class="k">Time</span><span class="v">${formatTime(r.time)}</span></div>
      <div class="stat"><span class="k">Ships lost</span><span class="v">${r.deaths}</span></div>
    </div>
    <div class="medal ${medal.toLowerCase()}">${medal} MEDAL</div>`;
  const items = [];
  if (r.outcome === 'clear' && !last) items.push({ label: `Next Mission: ${STAGES[r.stageIndex + 1].name}`, onSelect: () => openBriefing(r.stageIndex + 1) });
  if (r.outcome === 'clear' && last) items.push({ label: 'Credits', onSelect: openAbout });
  items.push({ label: 'Replay This Mission', onSelect: () => openBriefing(r.stageIndex) });
  items.push({ label: 'Title', onSelect: goTitle });
  return {
    id: 'results',
    kicker: r.outcome === 'clear' ? `${st.name.toUpperCase()} — CLEARED` : 'MISSION REPORT',
    title: last && r.outcome === 'clear' ? 'Mission Complete' : 'Results',
    body,
    items,
    onBack: goTitle,
    footer: keyHints(),
  };
}

function gameOverScreen(r) {
  return {
    id: 'gameover',
    kicker: STAGES[r.stageIndex].name.toUpperCase(),
    title: 'Mission Failed',
    subtitle: 'Your squadron could not hold the line. Regroup and try again.',
    items: [
      { label: 'Retry Mission', onSelect: () => openBriefing(r.stageIndex) },
      { label: 'Title', onSelect: goTitle },
    ],
    onBack: goTitle,
    footer: keyHints(),
  };
}

function pauseScreen() {
  return {
    id: 'pause',
    kicker: 'PAUSED',
    title: STAGES[campaignStage].name,
    items: [
      { label: 'Resume', onSelect: closePause },
      { label: 'Options', onSelect: () => openOptions('pause') },
      { label: 'Quit to Title', onSelect: () => { endGame(); goTitle(); } },
    ],
    onBack: closePause,
    footer: keyHints(),
  };
}

function openTouchNotice() {
  setMode('touch');
  menus.show(touchScreen());
}

function touchScreen() {
  return {
    id: 'touch',
    kicker: 'INPUT REQUIRED',
    title: 'Controller or keyboard required',
    subtitle: 'Starfock 64 is played with a PS5 controller or a keyboard. Connect one to continue. Touch controls are not provided.',
    items: [{ label: 'Settings', onSelect: () => openOptions() }],
  };
}

// ---- Transitions ------------------------------------------------------------

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setMode(m) {
  mode = m;
  idle = 0;
}

function goTitle() {
  endGame();
  setAttractTag(false);
  setMode('title');
  hud.show(false);
  stopMusic();
  menus.show(titleScreen());
  if (audioReady) playMusic('title');
}

function openBriefing(i) {
  endGame();
  campaignStage = i;
  setMode('briefing');
  hud.show(false);
  menus.show(briefingScreen(i));
  if (audioReady) playMusic('title');
}

function openOptions(from) {
  if (from === 'pause') {
    menus.show(optionsScreen('pause'));
    return;
  }
  setMode('options');
  menus.show(optionsScreen('title'));
}

function openAbout() {
  setMode('about');
  menus.show(aboutScreen());
}

function openPause() {
  if (!game || mode !== 'play') return;
  setMode('pause');
  pausedFromPlay = true;
  menus.show(pauseScreen());
}

function closePause() {
  setMode('play');
  pausedFromPlay = false;
  menus.hide();
}

function launch(i) {
  endGame();
  setAttractTag(false);
  campaignStage = i;
  setMode('play');
  menus.hide();
  game = makeGame(i, { ai: false, cheat: false });
  game.start();
}

function makeGame(stageIndex, { ai, cheat }) {
  return new Game({
    camera,
    hud,
    physics,
    stageIndex,
    lives: 3,
    ai,
    cheat,
    onEnd: (r) => {
      pendingEnd = { ...r, ai };
    },
  });
}

function endGame() {
  if (game) {
    game.dispose();
    game = null;
  }
  pendingEnd = null;
}

function setAttractTag(on) {
  if (attractTag) attractTag.hidden = !on;
}

function handleEnd(r) {
  if (r.ai) {
    // Attract mode loops through the stages, then returns to the title.
    endGame();
    attractIndex++;
    if (attractIndex < STAGES.length) {
      game = makeGame(attractIndex, { ai: true, cheat: true });
      game.start();
    } else {
      goTitle();
    }
    return;
  }
  endGame();
  hud.show(false);
  lastResult = r;
  if (r.outcome === 'clear') {
    setMode('results');
    menus.show(resultsScreen(r));
  } else {
    setMode('gameover');
    menus.show(gameOverScreen(r));
  }
}

function startAttract() {
  endGame();
  setMode('attract');
  attractIndex = 0;
  attractGrace = 0.6;
  menus.hide();
  hud.show(true);
  setAttractTag(true);
  game = makeGame(attractIndex, { ai: true, cheat: true });
  game.start();
}

// ---- Boot -------------------------------------------------------------------

let audioReady = false;
window.addEventListener('starfock-gesture', () => {
  if (audioReady) return;
  audioReady = true;
  initAudio();
  applyVolumes();
  if (mode === 'title' || mode === 'briefing') playMusic('title');
});

function buildTitleScene() {
  titleScene = new THREE.Scene();
  titleScene.background = new THREE.Color(0x03040d);
  titleScene.add(A.buildStarfield(1600, 200));
  titleScene.add(new THREE.HemisphereLight(0xdfe9ff, 0x222844, 1.4));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.6);
  key.position.set(-6, 10, 8);
  titleScene.add(key);
  titleArwing = A.buildArwing();
  titleArwing.scale.setScalar(1.1);
  titleArwing.position.x = 5.6;
  titleScene.add(titleArwing);
  camera.position.set(0, 0.6, 10);
  camera.lookAt(0, 0, 0);
}

function checkTouch() {
  touchOnly = isTouchOnly() && !input.padConnected();
  if (touchOnly && mode === 'title') openTouchNotice();
}

function gamepadChanged(e) {
  if (e.detail) {
    if (mode === 'touch') goTitle();
  } else if (mode !== 'touch' && isTouchOnly()) {
    checkTouch();
  }
}

async function boot() {
  bootEl.hidden = false;
  if (!navigator.gpu) {
    bootEl.hidden = true;
    menus.show({
      id: 'nogpu',
      kicker: 'WEBGPU REQUIRED',
      title: 'Your browser has no WebGPU',
      subtitle: 'Starfock 64 renders only with WebGPU and has no fallback. Use a current Chrome, Edge, Safari 26 or Firefox with WebGPU enabled.',
    });
    setMode('nogpu');
    return;
  }
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) {
    bootEl.hidden = true;
    menus.show({
      id: 'nogpu',
      kicker: 'WEBGPU REQUIRED',
      title: 'No WebGPU adapter found',
      subtitle: 'WebGPU exists in this browser, but no GPU adapter was available. Check your graphics drivers and browser flags.',
    });
    setMode('nogpu');
    return;
  }

  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  await renderer.init();
  stageEl.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 700);
  buildTitleScene();
  physics = await Physics.create();

  attractTag = document.createElement('div');
  attractTag.className = 'attract-tag';
  attractTag.hidden = true;
  attractTag.innerHTML = 'ATTRACT MODE &middot; press any button to play';
  document.body.appendChild(attractTag);

  bootEl.hidden = true;
  window.addEventListener('resize', onResize);
  window.addEventListener('starfock-gamepad', gamepadChanged);
  goTitle();
  checkTouch();
  renderer.setAnimationLoop(frame);
  window.__starfock = { get mode() { return mode; }, get game() { return game; }, input, settings, startMission: (i) => launch(i), openOptions, openAbout, goTitle, startAttract };
}

function onResize() {
  if (!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.update();
  hud.tick(dt);

  if (mode === 'play' && game) {
    if (input.tapped('pause')) {
      openPause();
    } else {
      game.update(dt);
      renderer.render(game.scene, camera);
      if (pendingEnd) {
        const r = pendingEnd;
        pendingEnd = null;
        handleEnd(r);
      }
    }
    return;
  }

  if (mode === 'attract' && game) {
    if (attractGrace > 0) attractGrace -= dt;
    else if (input.activity) {
      goTitle();
      return;
    }
    game.update(dt);
    renderer.render(game.scene, camera);
    if (pendingEnd) {
      const r = pendingEnd;
      pendingEnd = null;
      handleEnd(r);
    }
    return;
  }

  if (mode === 'pause' && game) {
    menus.update(dt);
    renderer.render(game.scene, camera);
    return;
  }

  if (mode === 'nogpu' || mode === 'boot' || !renderer) return;

  // Menu-driven modes share the title backdrop.
  if (mode === 'title') {
    if (input.activity) idle = 0;
    else idle += dt;
    if (idle > IDLE_TO_ATTRACT && !touchOnly) {
      startAttract();
      return;
    }
  }
  if (titleArwing) {
    titleArwing.rotation.set(0.15 + Math.sin(now / 1900) * 0.06, now / 3000, Math.sin(now / 1500) * 0.25);
    titleArwing.position.y = -0.6 + Math.sin(now / 1200) * 0.2;
  }
  menus.update(dt);
  renderer.render(titleScene, camera);
}

boot().catch((err) => {
  bootEl.hidden = true;
  console.error(err);
  menus.show({ id: 'nogpu', kicker: 'STARTUP ERROR', title: 'Starfock 64 could not start', subtitle: String(err && err.message ? err.message : err) });
  setMode('nogpu');
});
