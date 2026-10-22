// Entry point: boot checks, the screen state machine, and the frame loop.
// States: boot -> title -> menu -> (levelselect | settings | controls | about | playing) ...
// playing -> paused | results | gameover; attract runs the AI pilot on the title and yields to any input.
import * as THREE from 'three/webgpu';
import { ABOUT_HTML } from './credits.js';
import { audio } from './audio.js';
import { AttractPilot } from './attract.js';
import * as campaign from './campaign.js';
import { FX } from './fx.js';
import { Game } from './game.js';
import { Gfx } from './gfx.js';
import { HUD } from './hud.js';
import { input } from './input.js';
import { arwing, planet } from './models.js';
import { Physics } from './physics.js';
import { loadSettings, saveSettings, settings } from './settings.js';
import { CAMPAIGN_ORDER, STAGES } from './stages.js';
import { CONTROLS_BODY, UI, settingsItems } from './ui.js';
import { formatTime } from './util.js';

const $ = (id) => document.getElementById(id);
const ATTRACT_IDLE = 10;

const app = {
  state: 'boot',
  game: null,
  pilot: null,
  idle: 0,
  mode: null, // 'mission' | 'standalone' | 'attract' | null
  standalone: null,
  result: null,
};

let gfx;
let physics;
let fx;
let hud;
let ui;
let backdrop;
let backdropTime = 0;

function applyHud() {
  document.documentElement.style.setProperty('--hud-scale', String(settings.hudScale / 100));
}

// ----- Screens ------------------------------------------------------------

function setState(name) {
  app.state = name;
  document.body.dataset.state = name;
}

function showTitle() {
  setState('title');
  ui.hide();
  $('title').classList.remove('hidden');
  hud.setVisible(false);
  app.idle = 0;
  audio.setMusic('title');
  endSession();
}

function showMainMenu() {
  setState('menu');
  $('title').classList.add('hidden');
  ui.show({
    title: 'STARFOXTASTIC 64',
    sub: 'Main menu',
    items: [
      { label: 'Start campaign', hint: 'Aurelia to the Vorrack Citadel', action: startMission },
      { label: 'Stage select', hint: 'Replay any unlocked stage', action: showStageSelect },
      { label: 'Settings', action: () => showSettings(showMainMenu) },
      { label: 'Controls', action: () => showControls(showMainMenu) },
      { label: 'About and credits', action: () => showAbout(showMainMenu) },
      { label: 'Progress reset', hint: 'Clears cleared stages and medals', action: confirmReset },
    ],
    onBack: showTitle,
  });
}

function confirmReset() {
  setState('menu');
  ui.show({
    title: 'Reset progress?',
    sub: 'This clears cleared stages, medals and best scores. Settings are kept.',
    items: [
      { label: 'Reset progress', action: () => { campaign.resetProgress(); showMainMenu(); } },
      { label: 'Cancel', action: showMainMenu },
    ],
    onBack: showMainMenu,
  });
}

function medalLabel(id) {
  const m = campaign.save.medals[id];
  return m ? `${m} medal` : 'not cleared';
}

function showStageSelect() {
  setState('levelselect');
  ui.show({
    title: 'Stage select',
    sub: 'Clear a stage to unlock the next one on its route',
    items: CAMPAIGN_ORDER.map((id) => {
      const st = STAGES[id];
      const unlocked = campaign.isUnlocked(id);
      return {
        label: st.name,
        hint: unlocked ? st.sub : 'Locked',
        value: () => (unlocked ? medalLabel(id) : ''),
        disabled: !unlocked,
        action: () => startStandalone(id),
      };
    }),
    onBack: showMainMenu,
  });
}

function showSettings(back) {
  setState('settings');
  ui.show({
    title: 'Settings',
    sub: 'Invert toggles fix sticks that read backwards',
    items: settingsItems({
      back: () => {
        saveSettings();
        back();
      },
      applyHud,
      refresh: () => ui.refresh(),
    }),
    onBack: () => {
      saveSettings();
      back();
    },
    footer: 'Change: left / right   Select: Cross   Back: Circle',
  });
}

function showControls(back) {
  setState('controls');
  ui.show({
    title: 'Controls',
    body: CONTROLS_BODY,
    items: [{ label: 'Back', action: back }],
    onBack: back,
  });
}

function showAbout(back) {
  setState('about');
  ui.show({
    title: 'About and credits',
    body: ABOUT_HTML,
    items: [{ label: 'Back', action: back }],
    onBack: back,
    footer: 'Back: Circle / Esc',
  });
}

function showBlocked() {
  setState('blocked');
  $('title').classList.add('hidden');
  ui.show({
    title: 'Controller or keyboard required',
    sub: 'This demo is built for a PS5-compatible controller or a keyboard. Touch controls are not provided.',
    items: [{ label: 'Settings', action: () => showSettings(showBlocked) }],
    onBack: null,
    footer: 'Connect a controller, or open this page on a computer',
  });
}

function showFatal(title, text) {
  $('boot').classList.add('hidden');
  $('fatal-title').textContent = title;
  $('fatal-text').textContent = text;
  $('fatal').classList.remove('hidden');
  setState('fatal');
}

// ----- Game sessions ------------------------------------------------------

function endSession() {
  if (app.game) {
    app.game.dispose();
    app.game = null;
  }
  app.result = null;
  app.mode = null;
  backdrop.visible = true;
  hud.setVisible(false);
  hud.setAttract(false);
}

function startGame(stageId, { mode, ai = null }) {
  endSession();
  backdrop.visible = false;
  $('title').classList.add('hidden');
  app.mode = mode;
  app.game = new Game({ stage: STAGES[stageId], gfx, physics, fx, audio, hud, ai });
  app.game.start();
  hud.setVisible(true);
  hud.setAttract(!!ai);
  ui.hide();
}

function startMission() {
  campaign.mission.start(3);
  startGame(campaign.mission.stage, { mode: 'mission' });
  setState('playing');
}

function startStandalone(id) {
  campaign.mission.end();
  app.standalone = id;
  startGame(id, { mode: 'standalone' });
  setState('playing');
}

function startAttract() {
  const id = CAMPAIGN_ORDER[Math.floor(Math.random() * CAMPAIGN_ORDER.length)];
  app.pilot = new AttractPilot();
  startGame(id, { mode: 'attract', ai: app.pilot });
  setState('attract');
  audio.setMusic(STAGES[id].music);
}

function pauseGame() {
  setState('paused');
  const st = STAGES[app.game.stage.id];
  ui.show({
    title: 'Paused',
    sub: st.name,
    items: [
      { label: 'Resume', action: resumeGame },
      { label: 'Restart stage', action: () => { startGame(st.id, { mode: app.mode }); setState('playing'); } },
      { label: 'Settings', action: () => showSettings(pauseGame) },
      { label: 'Controls', action: () => showControls(pauseGame) },
      { label: 'Abort to menu', action: abortToMenu },
    ],
    onBack: resumeGame,
    footer: 'Select: Cross   Resume: Options / Circle / Esc',
  });
}

function resumeGame() {
  setState('playing');
  ui.hide();
}

function abortToMenu() {
  campaign.mission.end();
  showMainMenu();
}

function resultBody(r) {
  const rows = [
    ['Stage', r.stageName],
    ['Time', formatTime(r.time)],
    ['Enemies downed', `${r.kills} / ${r.total}`],
    ['Shield hits taken', String(r.hitsTaken)],
    ['Bombs left', String(r.bombs)],
    ['Score', String(Math.round(r.score))],
  ];
  if (r.route) rows.push(['Route', r.route === 'kessar' ? 'Kessar Debris Belt' : 'Solace Canyon']);
  const medal = r.medal ? `${r.medal[0].toUpperCase()}${r.medal.slice(1)} medal` : 'No medal';
  return `<div class="stats">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
    <p class="medal ${r.medal || 'none'}">${medal}</p>`;
}

function showResult(r) {
  endSession();
  app.result = r;
  const cleared = r.status === 'cleared';
  if (cleared) campaign.recordResult(r);
  const items = [];
  let title = cleared ? 'Stage clear' : 'Ship lost';

  if (cleared && app.mode === 'mission') {
    const next = campaign.mission.advance(r);
    if (next) {
      items.push({ label: `Continue to ${STAGES[next].name}`, action: () => { startGame(next, { mode: 'mission' }); setState('playing'); } });
    } else {
      title = 'Mission complete';
      campaign.recordMissionComplete();
      items.push({ label: 'Return to title', action: showTitle });
    }
  } else if (cleared) {
    items.push({ label: 'Replay stage', action: () => startStandalone(r.stageId) });
    items.push({ label: 'Stage select', action: showStageSelect });
  } else if (app.mode === 'mission') {
    campaign.mission.lives -= 1;
    if (campaign.mission.lives > 0) {
      items.push({ label: `Retry stage (${campaign.mission.lives} ${campaign.mission.lives === 1 ? 'life' : 'lives'} left)`, action: () => { startGame(r.stageId, { mode: 'mission' }); setState('playing'); } });
      items.push({ label: 'Abort mission', action: abortToMenu });
    } else {
      title = 'Mission failed';
      items.push({ label: 'No lives left. Return to title', action: showTitle });
    }
  } else {
    items.push({ label: 'Retry stage', action: () => startStandalone(r.stageId) });
    items.push({ label: 'Stage select', action: showStageSelect });
  }

  setState('results');
  hud.setVisible(false);
  audio.setMusic('title');
  ui.show({
    title,
    sub: r.stageName,
    body: resultBody(r),
    items,
    onBack: null,
    footer: 'Continue: Cross / Enter',
  });
}

// ----- Frame loop ---------------------------------------------------------

function frame(now) {
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
  frame.last = now;
  input.update(dt);
  if (input.activeThisFrame) audio.resume();

  const st = app.state;
  if (st === 'title') {
    if (input.activeThisFrame) {
      showMainMenu();
    } else {
      app.idle += dt;
      if (app.idle >= ATTRACT_IDLE) startAttract();
    }
    if (input.touchOnly && !input.padConnected) showBlocked();
  } else if (st === 'menu') {
    ui.update();
    app.idle = input.activeThisFrame ? 0 : app.idle + dt;
    if (app.idle >= ATTRACT_IDLE) {
      app.idle = 0;
      startAttract();
    }
  } else if (st === 'blocked') {
    ui.update();
    if (!input.touchOnly || input.padConnected) showTitle();
  } else if (st === 'playing') {
    const ctl = input.gameControls();
    if (ctl.pause) {
      pauseGame();
    } else {
      app.game.update(dt, ctl);
      if (app.game.result) showResult(app.game.result);
    }
  } else if (st === 'attract') {
    if (input.activeThisFrame) {
      showTitle();
    } else {
      const game = app.game;
      game.update(dt, app.pilot.controls(game, dt));
      if (game.result) {
        startAttract();
      }
    }
  } else if (st === 'paused' || st === 'results' || st === 'levelselect' || st === 'settings' || st === 'controls' || st === 'about') {
    ui.update();
  }

  updateBackdrop(dt, st);
  gfx.render();
  requestAnimationFrame(frame);
}

// Title and menu backdrop: a slowly turning Arwing against a planet.
function buildBackdrop() {
  const g = new THREE.Group();
  const ship = arwing(0xc7d1e3, 0xd6402f);
  ship.scale.setScalar(1.5);
  ship.name = 'ship';
  g.add(ship);
  const p = planet(20, 0x3e5c8a, 0x7fb0ff);
  p.position.set(-26, 9, -110);
  g.add(p);
  return g;
}

function updateBackdrop(dt, st) {
  const show = !app.game || st === 'title' || st === 'menu';
  backdrop.visible = show;
  if (!backdrop.visible) return;
  backdropTime += dt;
  const ship = backdrop.getObjectByName('ship');
  ship.rotation.set(Math.sin(backdropTime * 0.6) * 0.15, backdropTime * 0.35, Math.sin(backdropTime * 0.5) * 0.2);
  ship.position.set(0, Math.sin(backdropTime * 0.9) * 0.3, 0);
  gfx.camera.position.set(Math.sin(backdropTime * 0.15) * 2.5, 1.2, 9);
  gfx.camera.lookAt(0, 0, 0);
  gfx.camera.updateMatrixWorld();
  gfx.followFocus(new THREE.Vector3(0, 0, 0));
}

// ----- Boot ---------------------------------------------------------------

async function boot() {
  loadSettings();
  applyHud();
  setState('boot');

  if (!navigator.gpu) {
    showFatal('WebGPU is required', 'This game renders only with WebGPU and has no fallback renderer. Use a current browser with WebGPU enabled, such as Chrome or Edge.');
    return;
  }
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) {
    showFatal('No WebGPU adapter', 'WebGPU is present but no compatible GPU adapter was found. Check that hardware acceleration is enabled.');
    return;
  }

  gfx = new Gfx();
  await gfx.init($('stage'));
  physics = await Physics.create();
  fx = new FX(gfx.scene, physics);
  hud = new HUD($('hud'));
  ui = new UI($('menu'));
  backdrop = buildBackdrop();
  gfx.scene.add(backdrop);
  $('boot').classList.add('hidden');

  if (input.touchOnly && !input.padConnected) showBlocked();
  else showTitle();
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  showFatal('Startup failed', String(err && err.message ? err.message : err));
});
