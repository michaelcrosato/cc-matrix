import { initWorld, initParticles } from './world.js';
import { buildArwing } from './player.js';
import { initInput, readInput, endInputFrame, hasGamepad } from './input.js';
import { initHud } from './hud.js';
import { game, updateGame, openTitle, openSettings } from './game.js';
import { unlockAudio } from './audio.js';

// Entry point: boots the renderer, input and HUD, then runs the fixed-order frame loop.

const touchBlock = document.getElementById('touch-block');

// Touch-only devices (phones, tablets without a keyboard or controller) get the "Controller or keyboard required" gate.
function isTouchOnly() {
  const coarse = window.matchMedia('(any-pointer: fine)').matches === false;
  return navigator.maxTouchPoints > 0 && coarse && !hasGamepad();
}

function leaveTouchGate() {
  if (touchBlock.classList.contains('hidden')) return;
  touchBlock.classList.add('hidden');
  game.touchOnly = false;
  openTitle();
}

function boot() {
  const canvas = document.getElementById('game');
  const world = initWorld(canvas);
  initParticles();
  buildArwing(world.scene);
  initInput();
  initHud();

  touchBlock.querySelector('[data-action="settings"]').addEventListener('click', () => {
    // Leave the gate state before opening menus, or the game loop stays idle.
    game.touchOnly = false;
    touchBlock.classList.add('hidden');
    openSettings('title');
  });

  // Any key or gamepad input leaves the touch gate (a keyboard can be attached to a tablet).
  window.addEventListener('keydown', leaveTouchGate);
  window.addEventListener('gamepadconnected', leaveTouchGate);

  unlockOnFirstGesture();

  if (isTouchOnly()) {
    game.touchOnly = true;
    touchBlock.classList.remove('hidden');
  } else {
    openTitle();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.touchOnly && hasGamepad()) leaveTouchGate();
    const input = readInput();
    if (!game.touchOnly) updateGame(dt, input);
    endInputFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function unlockOnFirstGesture() {
  const once = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', once);
    window.removeEventListener('keydown', once);
  };
  window.addEventListener('pointerdown', once);
  window.addEventListener('keydown', once);
}

boot();
