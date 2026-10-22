// Boot + application state machine (title, menus, briefing, play, pause, results, attract).
import { initRenderer, render, gfx } from './gfx.js';
import { physics } from './physics.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { loadSettings, loadSave, writeSave, settings, save } from './config.js';
import { UI, glyph } from './ui.js';
import { Game } from './game.js';
import { MISSIONS } from './levels.js';

loadSettings(); loadSave();
const ui = new UI();
let game = null;
let state = 'loading';
let campaign = false;
let attract = null;
let lastT = performance.now();

const touchOnly = navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches;

function loadingScreen(on, text = 'LOADING') {
  const el = document.getElementById('loading');
  if (on && !el) { const d = document.createElement('div'); d.id = 'loading'; d.className = 'loading'; d.textContent = text; document.body.appendChild(d); }
  else if (on && el) el.textContent = text;
  else if (!on && el) el.remove();
}
function fatal(msg) {
  loadingScreen(false);
  if (touchBlock) {
    // touch-only devices keep the controller notice + settings; add the WebGPU note underneath
    const n = document.createElement('p'); n.style.fontSize = '2.4vmin'; n.style.opacity = '.75';
    n.textContent = 'Note: this browser also lacks WebGPU, which the game requires (no WebGL fallback).';
    touchBlock.insertBefore(n, touchBlock.querySelector('#tbSettings'));
    return;
  }
  const d = document.createElement('div'); d.className = 'block'; d.style.position = 'fixed'; d.style.zIndex = 10;
  d.innerHTML = `<h1>WebGPU required</h1><p>${msg}</p><p>Starfox Barrel 64 renders with WebGPU only (no WebGL fallback). Use a current Chrome, Edge or another WebGPU-enabled browser with hardware acceleration on.</p>`;
  document.body.appendChild(d);
}

// -------------------------------------------------------------- touch block
let touchBlock = null;
function showTouchBlock() {
  touchBlock = document.createElement('div');
  touchBlock.className = 'block'; touchBlock.style.position = 'fixed'; touchBlock.style.zIndex = 5;
  touchBlock.innerHTML = `<h1>Controller or keyboard required</h1><p>Starfox Barrel 64 is designed for a gamepad (PS5 DualSense recommended) or a keyboard. Connect one to play.</p><button class="btn ui-clickable" id="tbSettings">⚙ Settings</button><div id="tbMenu" style="position:relative;width:100%;min-height:10vh"></div>`;
  document.body.appendChild(touchBlock);
  touchBlock.querySelector('#tbSettings').onclick = () => {
    audio.ensure();
    touchBlock.style.background = 'rgba(2,4,12,.85)';
    touchBlock.querySelector('h1').style.display = 'none'; touchBlock.querySelector('p').style.display = 'none'; touchBlock.querySelector('#tbSettings').style.display = 'none';
    ui.root.style.zIndex = 6; ui.root.style.pointerEvents = 'none';
    ui.overlayEl.style.display = 'none'; touchBlock.style.background = '#02040c';
    openSettings(() => { ui.closeMenu(); ui.overlayEl.style.display = ''; ui.root.style.zIndex = ''; touchBlock.querySelector('h1').style.display = ''; touchBlock.querySelector('p').style.display = ''; touchBlock.querySelector('#tbSettings').style.display = ''; touchBlock.style.background = ''; });
  };
}
function hideTouchBlock() { if (touchBlock) { touchBlock.remove(); touchBlock = null; ui.root.style.zIndex = ''; } }
addEventListener('gamepadconnected', hideTouchBlock);
addEventListener('keydown', () => { if (touchBlock && !ui.menu) hideTouchBlock(); });

// -------------------------------------------------------------- menus
function onSettingChanged(key) { audio.applyVolumes(); ui.applyTextSize(); }
function openSettings(onBack) {
  const items = ui.settingsItems(onSettingChanged);
  items.push({ label: 'Done', desc: 'Close settings.', action: onBack });
  ui.openMenu({ title: 'SETTINGS', items, onBack, top: '9vh' });
}
function mainMenu(focus = 0) {
  state = 'menu';
  ui.title(true);
  ui.openMenu({
    focus, top: '52vh',
    items: [
      { label: 'Start Game', desc: 'Play the full demo: Corvalis, then the Asteria Belt.', action: () => startCampaign(0) },
      { label: 'Mission Select', desc: 'Jump straight to either mission.', action: () => { ui.title(false); ui.missionSelect((i) => startCampaign(i, false), () => mainMenu(1)); } },
      { label: 'Settings', desc: 'Invert axes, difficulty, audio, vibration, text size.', action: () => { ui.title(false); openSettings(() => mainMenu(2)); } },
      { label: 'Controls', desc: 'Controller and keyboard layouts.', action: () => { ui.title(false); ui.controlsScreen(() => mainMenu(3)); } },
      { label: 'About · Credits', desc: 'Source information, tech, engine and prompt feedback.', action: () => { ui.title(false); ui.aboutScreen(() => mainMenu(4)); } },
    ],
  });
}
function pauseMenu(focus = 0) {
  state = 'paused';
  audio.chargeStop();
  const items = [
    { label: 'Resume', action: resume },
    { label: 'Restart Mission', desc: 'Start this mission again from the beginning.', action: () => { ui.closeMenu(); restartMission(); } },
  ];
  if (game.mode === 'rail' && game.checkpoint && game.checkpoint.s > 0) items.push({ label: 'Retry from Checkpoint', desc: 'Costs nothing in the demo.', action: () => { ui.closeMenu(); game.player.alive = false; game.player.lives++; game.state = 'dying'; game.stateT = 99; resume(); } });
  items.push(
    { label: 'Settings', action: () => openSettings(() => pauseMenu(items.length - 3)) },
    { label: 'Controls', action: () => ui.controlsScreen(() => pauseMenu(items.length - 2)) },
    { label: 'Quit to Title', action: () => toTitle() },
  );
  ui.openMenu({ title: 'PAUSED', items, onBack: resume, focus, top: '20vh', pre: teamStatusHTML() });
}
function teamStatusHTML() {
  const g = game;
  return `<div style="position:absolute;left:50%;top:9vh;transform:translateX(-50%);font-size:2.6vmin;font-weight:800;letter-spacing:.15em;text-shadow:0 0 1vmin #000">${g.m.name} · HITS ${g.hits} · ✈ × ${g.player.lives}</div>`;
}
function resume() { ui.closeMenu(); state = 'playing'; input.consume(); }

// -------------------------------------------------------------- flow
function titleBackground() {
  game.loadMission(0, { attract: true });
  game.titleMode = true;
  ui.clearCards(); ui.showHUD(false);
  audio.playMusic('title');
}
function toTitle() {
  ui.closeMenu(); ui.showHUD(false); ui.clearCards();
  attract = null; state = 'transition';
  ui.fade(true);
  setTimeout(() => { titleBackground(); mainMenu(); ui.fade(false); input.consume(); }, 420);
}
function startCampaign(index, full = true) {
  campaign = full;
  game.newRun();
  briefing(index);
}
function briefing(index) {
  ui.closeMenu(); ui.title(false); ui.fade(true); state = 'transition';
  setTimeout(() => {
    game.titleMode = false;
    game.loadMission(index, {});
    ui.clearCards();
    ui.fade(false);
    state = 'briefing';
    audio.playMusic('briefing');
    ui.briefing(MISSIONS[index], () => {
      ui.closeMenu(); state = 'playing'; ui.showHUD(true); input.consume();
      audio.playMusic(MISSIONS[index].music);
      game.state = 'intro'; game.stateT = 0; ui.missionCard(MISSIONS[index]);
    });
  }, 420);
}
function restartMission() { ui.showHUD(true); game.loadMission(game.mi, {}); state = 'playing'; input.consume(); }
function afterResults() {
  writeSave();
  if (game.mi === 0 && campaign) { briefing(1); return; }
  demoEnd();
}
function demoEnd() {
  state = 'demoEnd';
  ui.showHUD(false); ui.clearCards();
  const total = game.run.totalHits;
  const medals = game.run.missionResults.filter((r) => r.medal).length;
  ui.openMenu({
    title: game.run.missionResults.length >= 2 ? 'DEMO COMPLETE!' : 'MISSION COMPLETE',
    desc: `Total hits ${total} · Medals ${medals}/${game.run.missionResults.length}. Thank you for flying with Barrel Team!`,
    pre: `<div class="card-big" style="top:12vh"><div class="t" style="font-size:8vmin">THANKS FOR PLAYING</div><div class="s">STARFOX BARREL 64 · DEMO</div></div>`,
    items: [
      { label: 'Back to Title', action: toTitle },
      { label: 'Mission Select', action: () => { ui.closeMenu(); ui.missionSelect((i) => startCampaign(i, false), () => toTitle()); state = 'menu'; } },
    ], top: '42vh',
  });
}
function gameOverMenu() {
  state = 'gameover';
  ui.showHUD(false); ui.clearCards();
  let t = 10;
  const items = [
    { label: 'Continue', desc: 'Restart this mission with 3 lives. Your run total is halved.', action: () => { ui.closeMenu(); game.continueAfterGameOver(); ui.showHUD(true); state = 'playing'; input.consume(); } },
    { label: 'Quit to Title', action: toTitle },
  ];
  ui.openMenu({ title: 'GAME OVER', items, top: '40vh', pre: `<div class="card-big" style="top:16vh"><div class="t" style="color:#ff6070">GAME OVER</div></div>` });
  gameOverTimer = 10;
}
let gameOverTimer = 0;

// -------------------------------------------------------------- attract mode
const ATTRACT = [
  { m: 0, jump: { s: 0 }, dur: 40 },
  { m: 0, jump: { s: 1850 }, dur: 32 },
  { m: 0, jump: { s: 3300, arches: 5 }, dur: 30, route: 'canyon' },
  { m: 0, jump: { boss: true }, dur: 38 },
  { m: 1, jump: { step: 1 }, dur: 34 },
  { m: 1, jump: { step: 3 }, dur: 34 },
  { m: 1, jump: { step: 5 }, dur: 40 },
];
function startAttract() {
  state = 'attract';
  ui.closeMenu(); ui.title(false);
  attract = { i: -1, t: 0 };
  nextAttractScene();
  ui.overlayEl.innerHTML = `<div class="attract">DEMO PLAY</div><div class="attract2">PRESS ANY BUTTON</div>`;
}
function nextAttractScene() {
  attract.i = (attract.i + 1) % ATTRACT.length; attract.t = 0;
  const sc = ATTRACT[attract.i];
  game.titleMode = false;
  if (game.mi !== sc.m || !game.attract || sc.jump.s === 0) game.loadMission(sc.m, { attract: true, jump: sc.jump });
  else game.jumpTo(sc.jump);
  game.attractRoute = sc.route || 'bay';
  ui.showHUD(true);
}
function exitAttract() {
  attract = null;
  ui.overlayEl.innerHTML = '';
  toTitle();
}

// -------------------------------------------------------------- loop
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  input.update(dt);
  switch (state) {
    case 'boot':
      if (input.anyPressed || Math.abs(input.lx) + Math.abs(input.ly) > 0.5) {
        audio.ensure(); audio.playMusic('title'); audio.menuConfirm();
        const ps = document.getElementById('pressStart'); ps && ps.remove();
        input.consume(); mainMenu();
      } else if (input.idleSeconds() > 10 && !touchBlock) startAttract();
      game.update(dt);
      break;
    case 'menu':
      ui.updateMenu();
      if (input.idleSeconds() > 10 && !touchBlock) startAttract();
      game.update(dt);
      break;
    case 'attract':
      if (input.anyPressed || Math.abs(input.lx) + Math.abs(input.ly) > 0.5) { audio.ensure(); input.consume(); exitAttract(); break; }
      attract.t += dt;
      game.update(dt);
      if (attract.t > ATTRACT[attract.i].dur || game.state === 'results' || game.state === 'gameover') nextAttractScene();
      break;
    case 'briefing':
      ui.updateMenu();
      break;
    case 'playing':
      if (input.pressed('pause')) { pauseMenu(); break; }
      game.update(dt);
      if (game.state === 'results') { state = 'results'; input.consume(); }
      else if (game.state === 'gameover') gameOverMenu();
      break;
    case 'paused':
      ui.updateMenu();
      break;
    case 'results':
      if (input.pressed('confirm') || input.pressed('fire')) { audio.menuConfirm(); afterResults(); }
      break;
    case 'gameover':
      ui.updateMenu();
      gameOverTimer -= dt;
      if (gameOverTimer <= 0 && state === 'gameover') toTitle();
      break;
    case 'demoEnd':
      ui.updateMenu();
      break;
  }
  if (gfx.renderer) render();
}

async function boot() {
  loadingScreen(true, 'STARTING ENGINES');
  if (touchOnly) showTouchBlock();
  try {
    await initRenderer(document.body);
  } catch (e) { console.error(e); fatal(e.message || String(e)); return; }
  loadingScreen(true, 'LOADING PHYSICS');
  await physics.init();
  loadingScreen(true, 'BUILDING CORVALIS');
  await new Promise((r) => setTimeout(r, 30));
  game = new Game(ui);
  if (__DEV__) {
  window.__game = game; // test hooks, stripped from the release build
  window.__sim = (sec, dt = 1 / 30) => { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) { input.update(dt); game.update(dt); if (game.state === 'results' || game.state === 'gameover') break; } return game.state; };
  window.__setState = (s) => { state = s; };
  }
  titleBackground();
  loadingScreen(false);
  ui.title(true); ui.pressStart();
  state = 'boot';
  input.lastInputTime = performance.now();
  requestAnimationFrame(frame);
}
boot();
