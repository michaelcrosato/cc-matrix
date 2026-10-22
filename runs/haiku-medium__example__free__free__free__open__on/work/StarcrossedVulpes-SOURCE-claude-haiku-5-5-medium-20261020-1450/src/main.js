// Application shell: boot, menus, stage/attract state machine, frame loop.
import * as THREE from 'three';
import { initRender, renderFrame, updateCamera, followShadows, setCameraDirect, setEnvironment, R } from './render.js';
import { input, pollGamepad } from './input.js';
import { initAudio, applyVolumes, playMusic, sfx } from './audio.js';
import { settings, progress, saveAll, resetSettings, resetProgress } from './settings.js';
import { STAGES } from './stages.js';
import { Stage } from './game.js';
import { createAutopilot } from './ai.js';
import { openMenu, closeMenu, closeAll, menuOpen, setPauseHandler } from './menu.js';
import * as fx from './fx.js';
import * as M from './models.js';
import { buildWorld } from './world.js';
import { hud } from './hud.js';
import { CONTROLS_HTML, ABOUT_HTML } from './text.js';

const canvas = document.getElementById('gl');
initRender(canvas);
fx.initFX(R.scene, R.camera);

const ATTRACT_ORDER = ['plains', 'asteroid', 'fortress'];
const RANK = { bronze: 1, silver: 2, gold: 3 };

let mode = 'menu';           // menu | stage | attract
let stage = null;
let pendingFinish = null;
let idle = 0;
let attractIdx = 0;
let touchGate = false;
let showcase = null;
const ai = createAutopilot();
const playerCtl = { move: input.move, down: (a) => input.down(a), hit: (a) => input.hit(a) };

// ---- Progress -------------------------------------------------------------

function refreshUnlocks() {
  const u = progress.unlocked;
  u.plains = true;
  if (progress.cleared.plains) { u.asteroid = true; u.fortress = true; }
  if (progress.cleared.asteroid || progress.cleared.fortress) u.dreadnought = true;
}

function recordClear(r) {
  progress.cleared[r.stageId] = true;
  const prev = progress.medals[r.stageId];
  if (r.medal && (!prev || RANK[r.medal] > RANK[prev])) progress.medals[r.stageId] = r.medal;
  progress.bestScore[r.stageId] = Math.max(progress.bestScore[r.stageId] || 0, r.score);
  refreshUnlocks();
  saveAll();
}

// ---- Menu background (title showcase) ----------------------------------------

function ensureShowcase() {
  if (showcase) return;
  const root = new THREE.Group();
  R.scene.add(root);
  const env = STAGES.plains.env;
  setEnvironment(env);
  buildWorld(env, root, 520, Math.random);
  const ship = M.makeArwing();
  ship.scale.setScalar(1.7);
  root.add(ship);
  showcase = { root, ship, t: 0 };
}

function leaveShowcase() {
  if (!showcase) return;
  R.scene.remove(showcase.root);
  showcase = null;
}

function tickShowcase(dt) {
  ensureShowcase();
  const s = showcase;
  s.t += dt;
  s.ship.position.set(Math.sin(s.t * 0.3) * 6, -8 + Math.sin(s.t * 0.9) * 0.7, Math.cos(s.t * 0.3) * 6);
  s.ship.rotation.set(0.05 * Math.sin(s.t), s.t * -0.3 + Math.PI / 2, 0.12 * Math.sin(s.t * 0.7), 'YXZ');
  const a = s.t * 0.09;
  setCameraDirect(
    new THREE.Vector3(Math.sin(a) * 40, -4 + Math.sin(s.t * 0.2) * 2, Math.cos(a) * 40),
    new THREE.Vector3(0, -9, 0),
    52,
  );
}

// ---- Menus ----------------------------------------------------------------------

const toggle = (label, key, onChange) => ({
  label, kind: 'toggle',
  get: () => settings[key],
  set: (v) => { settings[key] = v; saveAll(); onChange && onChange(); },
});

const slider = (label, key, min, max, step, format, onChange) => ({
  label, kind: 'slider', min, max, step, format,
  get: () => settings[key],
  set: (v) => { settings[key] = v; saveAll(); onChange && onChange(); },
});

function showOptions() {
  openMenu({
    id: 'options',
    title: 'OPTIONS',
    subtitle: 'Sticks: use the invert toggles if a pad reports a flipped axis. They apply to flight and menus.',
    items: [
      toggle('Invert stick horizontal (X)', 'invertX'),
      toggle('Invert stick vertical (Y)', 'invertY'),
      slider('Stick deadzone', 'deadzone', 0.05, 0.35, 0.05, (v) => `${Math.round(v * 100)}%`),
      slider('Music volume', 'musicVol', 0, 10, 1, (v) => String(v), applyVolumes),
      slider('Sound effects', 'sfxVol', 0, 10, 1, (v) => String(v), applyVolumes),
      toggle('Camera shake', 'shake'),
      toggle('Control prompts', 'hints'),
      { label: 'Controls', sub: 'Button reference and what you can and cannot do', kind: 'button', onSelect: showControls },
      {
        label: 'Reset options', sub: 'Restore defaults for everything on this page', kind: 'button',
        onSelect: () => { resetSettings(); applyVolumes(); closeMenu(); showOptions(); },
      },
    ],
  });
}

function showControls() {
  openMenu({ id: 'controls', title: 'CONTROLS', panel: true, html: CONTROLS_HTML });
}

function showAbout() {
  openMenu({ id: 'about', title: 'ABOUT & CREDITS', panel: true, html: ABOUT_HTML });
}

function showMain() {
  playMusic('title');
  openMenu({
    id: 'main',
    title: 'STARCROSSED VULPES',
    subtitle: 'An original spiritual successor to Starfox 64 · vertical slice',
    items: [
      { label: 'Mission route', sub: 'Choose your next sector', kind: 'button', onSelect: showRoute },
      { label: 'Options', kind: 'button', onSelect: showOptions },
      { label: 'About & credits', kind: 'button', onSelect: showAbout },
      {
        label: 'Reset progress', sub: 'Erase cleared missions and medals', kind: 'button',
        onSelect: () => { resetProgress(); refreshUnlocks(); closeMenu(); showMain(); },
      },
    ],
    onBack: null,
  });
}

function routeStatus(id) {
  if (progress.medals[id]) return progress.medals[id].toUpperCase();
  if (progress.cleared[id]) return 'CLEARED';
  if (progress.unlocked[id]) return 'AVAILABLE';
  return 'LOCKED';
}

function showRoute() {
  refreshUnlocks();
  const order = ['plains', 'asteroid', 'fortress', 'dreadnought'];
  const lockNote = {
    plains: '',
    asteroid: 'Clear Lylat Plains to unlock',
    fortress: 'Clear Lylat Plains to unlock',
    dreadnought: 'Clear Asteroid Belt or Fortress Trench to unlock',
  };
  openMenu({
    id: 'route',
    title: 'MISSION ROUTE',
    subtitle: 'Plains first. Then Asteroid Belt or Fortress Trench. Then the Dreadnought.',
    items: order.map((id, i) => {
      const st = STAGES[id];
      const open = !!progress.unlocked[id];
      return {
        label: `${i + 1}. ${st.name}`,
        sub: open ? st.summary : lockNote[id],
        value: routeStatus(id),
        kind: 'button',
        disabled: !open,
        onSelect: () => openBriefing(id),
      };
    }),
  });
}

function openBriefing(id) {
  const st = STAGES[id];
  openMenu({
    id: 'briefing',
    title: st.name,
    subtitle: `${st.code} · ${st.summary}`,
    items: [
      ...st.objectives.map((o) => ({ label: o, kind: 'info' })),
      { label: 'LAUNCH', kind: 'button', onSelect: () => startStage(id) },
    ],
  });
}

function showTouchGate() {
  touchGate = true;
  openMenu({
    id: 'gate',
    title: 'Controller or keyboard required',
    subtitle: 'Starcrossed Vulpes is built for a PlayStation-style controller or a keyboard. Touch controls are not provided.',
    items: [{ label: 'Settings', kind: 'button', onSelect: showOptions }],
    onBack: null,
  });
}

function showResults(r) {
  const st = STAGES[r.stageId];
  const cleared = r.status === 'cleared';
  const rings = r.ringsTotal ? `${r.rings} / ${r.ringsTotal}` : '—';
  const mm = Math.floor(r.time / 60);
  const ss = String(Math.floor(r.time % 60)).padStart(2, '0');
  const stats = [
    ['Medal', cleared ? (r.medal ? r.medal.toUpperCase() : '—') : 'NONE'],
    ['Score', String(r.score)],
    ['Time', `${mm}:${ss}`],
    ['Kills', r.total ? `${r.kills} / ${r.total}` : String(r.kills)],
    ['Rings', rings],
    ['Spare ships lost', String(r.livesLost)],
  ];
  const items = cleared
    ? [{ label: 'CONTINUE', kind: 'button', onSelect: () => { closeAll(); showMain(); showRoute(); } }]
    : [
      { label: 'RETRY MISSION', kind: 'button', onSelect: () => startStage(r.stageId) },
      { label: 'MISSION ROUTE', kind: 'button', onSelect: () => { closeAll(); showMain(); showRoute(); } },
    ];
  openMenu({
    id: 'results',
    title: cleared ? 'MISSION COMPLETE' : 'MISSION FAILED',
    subtitle: st.name,
    stats,
    items,
    onBack: null,
  });
}

function openPause() {
  openMenu({
    id: 'pause',
    title: 'PAUSED',
    items: [
      { label: 'Resume', kind: 'button', onSelect: () => closeMenu() },
      { label: 'Options', kind: 'button', onSelect: showOptions },
      { label: 'Restart mission', kind: 'button', onSelect: () => startStage(stage.id) },
      { label: 'Abandon to route', kind: 'button', onSelect: abandonStage },
    ],
    onBack: () => closeMenu(),
  });
}

function abandonStage() {
  disposeStage();
  mode = 'menu';
  closeAll();
  showMain();
  showRoute();
}

// ---- Stage flow ---------------------------------------------------------------

function disposeStage() {
  if (stage) stage.dispose();
  stage = null;
  pendingFinish = null;
}

function startStage(id, attract = false) {
  closeAll();
  leaveShowcase();
  disposeStage();
  mode = attract ? 'attract' : 'stage';
  stage = new Stage(id, {
    attract,
    onFinish: (r) => { pendingFinish = { r, attract }; },
  });
  // Start the camera behind the ship so it does not swoop in from the menu view.
  const f = stage.stageFocus();
  setCameraDirect(new THREE.Vector3(f.x * 0.6, f.y + 7.5, f.z + 24), new THREE.Vector3(f.x * 0.3, f.y + 1.2, f.z - 36), 62);
  playMusic(stage.env.music);
  if (!attract) initAudio();
}

function handleFinish() {
  const { r, attract } = pendingFinish;
  pendingFinish = null;
  disposeStage();
  if (attract) {
    attractIdx = (attractIdx + 1) % ATTRACT_ORDER.length;
    startStage(ATTRACT_ORDER[attractIdx], true);
    return;
  }
  mode = 'menu';
  if (r.status === 'cleared') recordClear(r);
  playMusic('results');
  sfx(r.status === 'cleared' ? 'medal' : 'fail');
  showResults(r);
}

function startAttract() {
  closeAll();
  attractIdx = 0;
  document.getElementById('attract').classList.remove('hidden');
  startStage(ATTRACT_ORDER[attractIdx], true);
}

function exitAttract() {
  document.getElementById('attract').classList.add('hidden');
  disposeStage();
  mode = 'menu';
  idle = 0;
  showMain();
}

// ---- Input & lifecycle ----------------------------------------------------------

// Any key, button or stick movement counts as input: it wakes the menus and ends the attract demo.
input.onAny(() => {
  idle = 0;
  initAudio();
  if (mode === 'attract') exitAttract();
});

input.onPress((action, source) => {
  if (touchGate && source !== 'stick') {
    touchGate = false;
    closeAll();
    showMain();
  }
});
addEventListener('pointerdown', () => {
  initAudio();
  idle = 0;
  if (mode === 'attract') exitAttract();
});
addEventListener('gamepadconnected', () => {
  if (touchGate) { touchGate = false; closeAll(); showMain(); }
});

setPauseHandler(() => {
  if (mode === 'stage' && stage && !stage.finished) openPause();
});

const touchOnly = matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;

function tick(dt, realDt) {
  fx.update(dt);
  if (mode === 'stage' || mode === 'attract') {
    if (!(mode === 'stage' && menuOpen())) {
      const ctl = mode === 'attract' ? ai.step(stage, dt) : playerCtl;
      stage.update(dt, ctl);
    }
    if (stage && !stage.finished) {
      const f = stage.stageFocus();
      updateCamera(dt, f, f);
      followShadows(f);
      stage.lateUpdate();
    }
    if (pendingFinish) handleFinish();
    return;
  }
  // Menu mode: showcase background, idle timer for the attract demo.
  tickShowcase(dt);
  if (!touchGate) {
    idle += realDt;
    if (idle >= 10) startAttract();
  }
}

let last = performance.now();
function frame(now) {
  const rawDt = Math.min(60, (now - last) / 1000);  // wall time, for the idle timer (capped only for tab switches)
  const dt = Math.min(0.05, rawDt);                 // simulation step, clamped for slow frames
  last = now;
  pollGamepad(dt);
  tick(dt, rawDt);
  input.endFrame();
  renderFrame();
  requestAnimationFrame(frame);
}

// Boot
applyVolumes();
refreshUnlocks();
if (touchOnly && !input.padConnected) {
  showTouchGate();
} else {
  showMain();
}
requestAnimationFrame(frame);
