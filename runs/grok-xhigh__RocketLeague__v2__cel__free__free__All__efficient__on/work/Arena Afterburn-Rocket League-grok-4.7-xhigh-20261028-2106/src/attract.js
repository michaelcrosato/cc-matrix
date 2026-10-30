import { ATTRACT_DELAY } from './constants.js';

export function createAttract() {
  return { idle: 0, active: false };
}

/** Starts only after 10 seconds without input on the title. Any input clears it. */
export function stepAttract(state, dt, inputActive, onTitle) {
  if (!onTitle || inputActive) {
    state.idle = 0;
    if (inputActive || !onTitle) state.active = false;
    return state;
  }
  if (state.active) return state;
  state.idle += dt;
  if (state.idle >= ATTRACT_DELAY) state.active = true;
  return state;
}
