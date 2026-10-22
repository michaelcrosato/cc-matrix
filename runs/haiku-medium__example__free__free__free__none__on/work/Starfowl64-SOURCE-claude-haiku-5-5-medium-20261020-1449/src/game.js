import * as THREE from 'three';
import { world, applyPalette, scrollTerrain, burst, addShake, updateParticles, clearParticles } from './world.js';
import { player, updatePlayer, damagePlayer, healPlayer, resetPlayer } from './player.js';
import {
  enemies, enemyShots, playerShots, missiles, pickups,
  updateEnemies, updateProjectiles, damageEnemy, destroyEnemy, clearAll, retire,
} from './entities.js';
import { ROUTES, startStage, updateStage, stageComplete, stageRun } from './stages.js';
import { resetWingmen, updateWingmen, hitWingman, clearWingmen } from './wingmen.js';
import { sfx, startMusic, stopMusic, unlockAudio, setVolumes } from './audio.js';
import { settings, saveSettings } from './input.js';
import { setHudState, addSubtitle, addToast, flashDamage, clearSubtitles, updateHud, drawHud, clearHud } from './hud.js';
import { openMenu, closeMenu, updateMenu, refreshMenu } from './menus.js';
import { ABOUT_HTML, CONTROLS_HTML } from './text.js';

// Top-level game modes:
// title | settings | controls | about | routes | briefing | playing | paused | stageClear | gameover | results | attract

export const game = {
  mode: 'title',
  idle: 0,
  attractAllowed: true,
  timer: 0,
  route: 'alpha',
  routeLog: [],
  checkpoint: { score: 0, rings: 0 },
  deathTimer: undefined,
  run: null,
  attract: null,
  returnTo: null,
};

const TARGET = { x: 0, y: 0, z: 0 };

function freshRun() {
  return { score: 0, rings: 0, kills: 0, shotsFired: 0, shotsHit: 0, rolls: 0, uturns: 0, missiles: 0, deflects: 0, time: 0, shieldLost: 0, bossKilled: false };
}

function setMode(mode) {
  game.mode = mode;
}

// ---------- Menus ----------

export function openTitle() {
  setMode('title');
  game.idle = 0;
  stopMusic();
  startMusic(108);
  applyPalette('space');
  clearAll();
  clearWingmen();
  clearParticles();
  clearHud();
  player.root.visible = true;
  openMenu({
    title: 'Starfowl 64',
    subtitle: `A spiritual successor. Original characters and ships. ${bestMedalLine()}`,
    items: [
      { label: 'Start Mission', action: () => showBriefing('alpha') },
      { label: 'Settings', action: () => openSettings('title') },
      { label: 'Controls', action: openControls },
      { label: 'About & Credits', action: openAbout },
    ],
    footer: 'Up/Down to move. Confirm to select. Attract mode starts after 10 seconds idle.',
  });
}

export function openSettings(from) {
  setMode('settings');
  game.returnTo = from;
  const onBack = () => {
    saveSettings();
    if (from === 'pause') openPause();
    else openTitle();
  };
  const toggle = (label, key) => ({
    label,
    value: () => (settings[key] ? 'On' : 'Off'),
    action: () => { settings[key] = !settings[key]; saveSettings(); refreshMenu(); },
    adjust: () => { settings[key] = !settings[key]; saveSettings(); refreshMenu(); },
  });
  openMenu({
    title: 'Settings',
    items: [
      toggle('Invert horizontal axis', 'invertX'),
      toggle('Invert vertical axis', 'invertY'),
      {
        label: 'Stick sensitivity',
        value: () => settings.sensitivity.toFixed(1),
        action: () => {},
        adjust: (dir) => {
          settings.sensitivity = Math.round(Math.max(0.5, Math.min(1.5, settings.sensitivity + dir * 0.1)) * 10) / 10;
          saveSettings();
        },
      },
      toggle('Subtitles', 'subtitles'),
      toggle('Screen shake', 'screenShake'),
      {
        label: 'Music volume',
        value: () => `${Math.round(musicLevel * 100)}%`,
        action: () => {},
        adjust: (dir) => { musicLevel = Math.max(0, Math.min(1, musicLevel + dir * 0.1)); setVolumes({ music: musicLevel * 0.3, sfxLevel: sfxLevel }); refreshMenu(); },
      },
      {
        label: 'Effects volume',
        value: () => `${Math.round(sfxLevel * 100)}%`,
        action: () => {},
        adjust: (dir) => { sfxLevel = Math.max(0, Math.min(1, sfxLevel + dir * 0.1)); setVolumes({ music: musicLevel * 0.3, sfxLevel: sfxLevel }); refreshMenu(); },
      },
      { label: 'Back', action: onBack },
    ],
    footer: 'Left/Right to change. Inverting axes fixes gamepads that report up and down the wrong way.',
    onBack,
  });
}

let musicLevel = 0.7;
let sfxLevel = 0.5;

function openControls() {
  setMode('controls');
  openMenu({
    title: 'Controls',
    html: CONTROLS_HTML,
    items: [{ label: 'Back', action: openTitle }],
    onBack: openTitle,
  });
}

function openAbout() {
  setMode('about');
  openMenu({
    title: 'About & Credits',
    html: `<div class="scroll" id="about-scroll">${ABOUT_HTML}</div>`,
    items: [{ label: 'Back', action: openTitle }],
    footer: 'Stick or arrow keys scroll this page.',
    onBack: openTitle,
  });
}

function showBriefing(routeId) {
  setMode('briefing');
  const r = ROUTES[routeId];
  openMenu({
    title: r.name,
    html: `<p class="big">${r.briefing}</p><p>Shield 100. Bombs 3. Hold lock to scan, release to fire missiles.</p>`,
    items: [{ label: 'Launch', action: () => beginStage(routeId, routeId === 'alpha') }],
    onBack: openTitle,
  });
}

function openRouteChoice() {
  setMode('routes');
  const stationOpen = progress.cleared.includes('canyon') || progress.cleared.includes('station');
  openMenu({
    title: 'Choose Your Route',
    subtitle: 'Both routes lead to the Warden. Pick your path.',
    items: [
      { label: 'Route B: Canyon Run', value: () => 'fast, turret heavy', action: () => showBriefing('canyon') },
      {
        label: 'Route C: Orbital Station',
        value: () => (stationOpen ? 'slow, striker heavy' : 'locked: clear Canyon Run first'),
        disabled: !stationOpen,
        action: () => showBriefing('station'),
      },
    ],
    onBack: openTitle,
  });
}

// ---------- Progress (saved between sessions) ----------

const PROGRESS_KEY = 'starfowl64.progress';
const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };
const progress = loadProgress();

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const p = raw ? JSON.parse(raw) : null;
    if (p && Array.isArray(p.cleared)) return { cleared: p.cleared, bestMedal: p.bestMedal || null, wardensDown: p.wardensDown || 0 };
  } catch (e) { /* storage unavailable or corrupt: start fresh */ }
  return { cleared: [], bestMedal: null, wardensDown: 0 };
}

function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) { /* progress lasts for this session only */ }
}

function recordClear(routeId) {
  if (!progress.cleared.includes(routeId)) progress.cleared.push(routeId);
  saveProgress();
}

function recordMedal(medal) {
  if (!progress.bestMedal || MEDAL_RANK[medal] > MEDAL_RANK[progress.bestMedal]) progress.bestMedal = medal;
  saveProgress();
}

function bestMedalLine() {
  return progress.bestMedal ? `Best medal: ${progress.bestMedal[0].toUpperCase() + progress.bestMedal.slice(1)} · Wardens defeated: ${progress.wardensDown}` : 'No medals yet';
}

function openPause() {
  setMode('paused');
  openMenu({
    title: 'Paused',
    items: [
      { label: 'Resume', action: resume },
      { label: 'Settings', action: () => openSettings('pause') },
      { label: 'Quit to Title', action: () => { closeMenu(); openTitle(); } },
    ],
    onBack: resume,
  });
}

function resume() {
  closeMenu();
  setMode('playing');
}

function openGameover() {
  setMode('gameover');
  openMenu({
    title: 'Arwing Lost',
    subtitle: 'Mission failed. Your stage checkpoint is preserved.',
    items: [
      {
        label: 'Retry Stage',
        action: () => {
          // Roll the run back to the score and rings held at this stage's start.
          game.run.score = game.checkpoint.score;
          game.run.rings = game.checkpoint.rings;
          beginStage(game.route, false);
        },
      },
      { label: 'Title', action: openTitle },
    ],
    onBack: openTitle,
  });
}

function openResults(victory) {
  setMode('results');
  const r = game.run;
  const accuracy = r.shotsFired ? Math.round((r.shotsHit / r.shotsFired) * 100) : 0;
  const medal = r.score >= 20000 ? 'gold' : r.score >= 12000 ? 'silver' : 'bronze';
  const medalName = medal[0].toUpperCase() + medal.slice(1);
  if (victory) recordMedal(medal);
  const seconds = Math.round(r.time);
  const html = `
    <p class="big"><span class="medal-${medal}">${medalName} Medal</span></p>
    <div class="stats">
      <p>Score ${r.score}</p>
      <p>Kills ${r.kills}</p>
      <p>Rings ${r.rings}</p>
      <p>Accuracy ${accuracy}%</p>
      <p>Barrel rolls ${r.rolls}, U-turns ${r.uturns}, missiles ${r.missiles}, deflections ${r.deflects}</p>
      <p>Time ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}</p>
    </div>`;
  openMenu({
    title: victory ? 'Warden Destroyed' : 'Mission Report',
    html,
    items: [
      { label: 'Play Again', action: () => openTitle() },
      { label: 'Title', action: openTitle },
    ],
    onBack: openTitle,
  });
  if (victory) sfx('fanfare');
  sfx('medal');
}

// ---------- Stages ----------

// `fresh` starts a new run (mission start); otherwise the current run continues (route or retry).
function beginStage(routeId, fresh = false) {
  closeMenu();
  unlockAudio();
  const r = ROUTES[routeId];
  game.route = routeId;
  if (!game.run || fresh) game.run = freshRun();
  game.checkpoint = { score: game.run.score, rings: game.run.rings };
  clearAll();
  clearParticles();
  clearSubtitles();
  clearHud();
  resetPlayer();
  player.root.visible = true;
  resetWingmen();
  game.deathTimer = undefined;
  pendingStageEnd = false;
  applyPalette(r.palette);
  startStage(routeId);
  setHudState({ stageName: r.name, score: game.run.score, rings: game.run.rings });
  stopMusic();
  startMusic(r.bossStage ? 140 : 122);
  setMode(game.attract ? 'attract' : 'playing');
  addToast(r.name.split(':')[0], '#7fdcff');
}

function say(speaker, text) {
  addSubtitle(speaker, text);
}

function bomb() {
  sfx('bomb');
  addShake(1.0);
  burst(player.x, player.y, 0, 120, 0x44ffaa, 40, 1.2);
  for (const s of enemyShots) retire(s);
  for (const e of [...enemies]) {
    if (!e.alive) continue;
    const dmg = e.boss ? 12 : 4;
    if (damageEnemy(e, dmg)) addKill(e);
  }
}

function addKill(e) {
  game.run.kills++;
  game.run.score += e.score;
  setHudState({ score: game.run.score });
  if (e.boss) {
    game.run.bossKilled = true;
    addToast('WARDEN DOWN', '#ff6fa3');
  }
}

function collide() {
  const r = game.run;
  // Lasers and missiles vs enemies
  for (const s of playerShots) {
    if (s.dead) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = s.x - e.x, dy = s.y - e.y, dz = s.z - e.z;
      if (dx * dx + dy * dy + dz * dz < (e.radius + 0.5) * (e.radius + 0.5)) {
        retire(s);
        if (s.owner === 'player') {
          r.shotsHit++;
          player.stats.shotsHit++;
        }
        if (damageEnemy(e, 1) && s.owner === 'player') addKill(e);
        break;
      }
    }
  }
  for (const m of missiles) {
    if (m.dead) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = m.x - e.x, dy = m.y - e.y, dz = m.z - e.z;
      if (dx * dx + dy * dy + dz * dz < (e.radius + 1) * (e.radius + 1)) {
        retire(m);
        if (damageEnemy(e, 3)) addKill(e);
        break;
      }
    }
  }

  // Enemy shots vs player (barrel roll deflects)
  for (const s of enemyShots) {
    if (s.dead) continue;
    if (hitWingman(s.x, s.y, s.z)) {
      retire(s);
      continue;
    }
    const dx = s.x - player.x, dy = s.y - player.y, dz = s.z;
    if (dx * dx + dy * dy + dz * dz < 2.2 * 2.2) {
      retire(s);
      if (player.roll.active) {
        r.deflects++;
        player.stats.deflects++;
        r.score += 50;
        sfx('barrel');
        addToast('DEFLECT +50', '#7fdcff');
        burst(s.x, s.y, s.z, 14, 0x7fdcff, 12, 0.5);
      } else {
        const before = player.shield;
        if (damagePlayer(s.dmg * 8)) onPlayerDown();
        r.shieldLost += before - player.shield;
        flashDamage();
        addShake(0.5);
        sfx('hit');
      }
    }
  }

  // Ships ramming the player
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - player.x, dy = e.y - player.y, dz = e.z;
    const reach = e.radius + 1.2;
    if (dx * dx + dy * dy + dz * dz < reach * reach) {
      if (e.boss || e.type === 'striker') {
        const before = player.shield;
        if (damagePlayer(20)) onPlayerDown();
        r.shieldLost += before - player.shield;
        flashDamage();
        addShake(0.8);
      } else {
        destroyEnemy(e);
        const before = player.shield;
        if (damagePlayer(15)) onPlayerDown();
        r.shieldLost += before - player.shield;
        flashDamage();
        addShake(0.6);
      }
    }
  }

  // Pickups
  for (const p of pickups) {
    if (p.dead) continue;
    const dx = p.x - player.x, dy = p.y - player.y, dz = p.z;
    if (dx * dx + dy * dy + dz * dz < p.radius * p.radius) {
      retire(p);
      sfx('pickup');
      if (p.kind === 'ring') {
        r.rings++;
        r.score += 50;
        addToast('RING +50', '#ffd34d');
      } else if (p.kind === 'bomb') {
        player.bombs = Math.min(player.maxBombs, player.bombs + 1);
        addToast('BOMB +1', '#44ffaa');
      } else {
        healPlayer(25);
        addToast('SHIELD +25', '#66aaff');
      }
    }
  }

  setHudState({ score: r.score, rings: r.rings });
}

function onPlayerDown() {
  if (game.mode !== 'playing' && game.mode !== 'attract') return;
  burst(player.x, player.y, 0, 90, 0xffaa55, 28, 1.6);
  sfx('bigExplode');
  addShake(1.5);
  if (player.root) player.root.visible = false;
  game.deathTimer = 1.6;
}

// Turns the current turn's edge events into messages and scoring.
function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'fire') game.run.shotsFired++;
    if (ev.type === 'bomb') bomb();
    if (ev.type === 'uturn') addToast('U-TURN', '#ffd34d');
    if (ev.type === 'roll') addToast('BARREL ROLL', '#7fdcff');
    if (ev.type === 'missiles') {
      game.run.missiles += ev.count;
      player.stats.missiles += ev.count;
      addToast(`MISSILES x${ev.count}`, '#ffe066');
    }
  }
  const uturnCount = events.filter((e) => e.type === 'uturn').length;
  const rollCount = events.filter((e) => e.type === 'roll').length;
  game.run.uturns += uturnCount;
  game.run.rolls += rollCount;
}

// Called when a stage's completion timer runs out.
function nextAfterStage() {
  const r = ROUTES[game.route];
  if (!game.attract) recordClear(r.id);
  if (game.attract) {
    // Attract mode loops the whole game with a random route choice; it never shows menus.
    if (r.id === 'alpha') return beginStage(Math.random() < 0.5 ? 'canyon' : 'station');
    if (r.bossStage) return startAttract();
    return beginStage('boss');
  }
  if (r.id === 'alpha') return openRouteChoice();
  if (r.bossStage) return finishRun();
  return showBriefing('boss');
}

function finishRun() {
  game.run.bossKilled = true;
  progress.wardensDown++;
  saveProgress();
  stopMusic();
  startMusic(108);
  openResults(true);
}

// ---------- Attract AI ----------

function startAttract() {
  game.attract = { t: 0, lockT: 0, rollT: 0, uturnT: 0 };
  game.run = freshRun();
  player.godMode = true;
  closeMenu();
  beginStage('alpha', true);
}

function stopAttract() {
  game.attract = null;
  player.godMode = false;
  game.run = null;
  openTitle();
}

// Synthetic input: steer toward the nearest ahead enemy, always fire, cycle locks and rolls.
function attractInput(dt) {
  const a = game.attract;
  a.t += dt;
  a.lockT += dt;
  a.rollT += dt;
  a.uturnT += dt;
  let tx = 0;
  let ty = 0;
  let best = Infinity;
  for (const e of enemies) {
    if (!e.alive || -e.z * player.facing < 0) continue;
    const d = Math.abs(e.x - player.x) + Math.abs(e.y - player.y) * 0.5;
    if (d < best) { best = d; tx = e.x; ty = e.y; }
  }
  const lock = (a.lockT % 6) > 4.3;
  const roll = a.rollT > 6.5;
  if (roll) a.rollT = 0;
  const uturn = a.uturnT > 18;
  if (uturn) a.uturnT = 0;
  const shotsIncoming = enemyShots.length > 8;
  return {
    x: Math.max(-1, Math.min(1, (tx - player.x) * 0.5)),
    y: Math.max(-1, Math.min(1, (ty - player.y) * 0.4)),
    fire: true,
    bomb: shotsIncoming && (a.t % 4) < 0.1,
    barrel: roll,
    boost: (a.t % 9) < 3,
    brake: false,
    uturn,
    lock,
    camera: false,
    pausePressed: false,
    confirmPressed: false,
    backPressed: false,
    upPressed: false,
    downPressed: false,
    leftPressed: false,
    rightPressed: false,
    anyPressed: false,
  };
}

// ---------- Main per-frame update ----------

// Menu-style modes: the title idles into attract mode; everything else just runs the menu.
const MENU_MODES = ['title', 'settings', 'controls', 'about', 'routes', 'briefing', 'paused', 'gameover', 'results'];

export function updateGame(dt, input) {
  updateHud(dt);

  if (game.mode === 'attract') {
    if (input.anyActive) {
      stopAttract();
      return;
    }
    simulate(dt, attractInput(dt), true);
    return;
  }

  if (game.mode === 'playing') {
    if (input.pausePressed) {
      openPause();
      return;
    }
    simulate(dt, input, false);
    return;
  }

  if (MENU_MODES.includes(game.mode)) {
    if (game.mode === 'title') {
      if (input.anyActive) game.idle = 0;
      else game.idle += dt;
      if (game.idle > 10) {
        game.idle = 0;
        startAttract();
        return;
      }
    }
    if (game.mode === 'about') {
      const el = document.getElementById('about-scroll');
      if (el) el.scrollTop -= input.y * dt * 600;
    }
    updateMenu(input);
    // Pause key resumes only if the menu did not already move us elsewhere (Enter on Settings, etc.).
    if (game.mode === 'paused' && input.pausePressed) resume();
    updateParticles(dt);
    worldDraw(dt, false);
  }
}

let stageClearTimer = 0;
let pendingStageEnd = false;

function simulate(dt, input, attract) {
  if (game.deathTimer !== undefined && game.deathTimer > 0) {
    game.deathTimer -= dt;
    scrollTerrain(player.flow * dt);
    updateParticles(dt);
    updateEnemies(dt, player.flow, TARGET, player.facing);
    updateProjectiles(dt, player.flow);
    worldDraw(dt, false);
    if (game.deathTimer <= 0) {
      game.deathTimer = undefined;
      if (attract) stopAttract();
      else openGameover();
    }
    return;
  }

  game.run.time += dt;
  const events = updatePlayer(dt, input, 1);
  handleEvents(events);
  updateWingmen(dt, player.facing);

  // Stage script and world simulation
  updateStage(dt, say);
  TARGET.x = player.x;
  TARGET.y = player.y;
  TARGET.z = 0;
  updateEnemies(dt, player.flow, TARGET, player.facing);
  updateProjectiles(dt, player.flow);
  scrollTerrain(player.flow * dt);
  collide();
  updateParticles(dt);
  setHudState({ stageName: stageRun.route ? stageRun.route.name : '' });

  // Stage completion. Briefly show a clear toast, then move on.
  if (!pendingStageEnd && stageComplete()) {
    pendingStageEnd = true;
    stageClearTimer = 2.2;
    addToast('SECTOR CLEARED', '#5cf2a6');
    sfx('select');
  }
  if (pendingStageEnd) {
    stageClearTimer -= dt;
    if (stageClearTimer <= 0) nextAfterStage();
  }

  worldDraw(dt, true);
}

// Camera orbits the ship through the U-turn (cos of the turn angle) so it never snaps.
function worldDraw(dt, active) {
  world.time += dt;
  const cam = world.camera;
  const shakeAmt = settings.screenShake ? world.shake : 0;
  world.shake = Math.max(0, world.shake - dt * 2.2);
  const s = active ? shakeAmt * 0.35 : 0;
  const c = Math.cos(player.turnAngle);
  const sn = Math.sin(player.turnAngle);
  cam.position.set(
    player.x * 0.25 + sn * 5 + (Math.random() - 0.5) * s,
    3 + player.y * 0.3 + (Math.random() - 0.5) * s,
    9.5 * c,
  );
  cam.lookAt(player.x * 0.6, player.y * 0.7 + 0.5, -40 * c);
  world.sun.position.set(-40 + player.x, 60, 20);
  world.sun.target.position.set(player.x, 0, -20);
  world.sun.target.updateMatrixWorld();
  world.fill.position.set(player.x * 0.5, 8, -20 * c);

  world.stars.rotation.y += dt * 0.004;
  world.renderer.render(world.scene, cam);
  drawHud(world.time);
}
