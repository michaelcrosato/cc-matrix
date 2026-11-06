/** Calibrated bots. They write a standard-mapped pad; they do not touch game state. */

export const SKILLS = {
  sharp: { delay: 0.16, gain: 1.4, gainLoad: 0.7, noise: 0, reaction: 0.12, speedErr: 0.3, timingSd: 0.028 },
  average: { delay: 0.26, gain: 1.0, gainLoad: 0.55, noise: 0.03, reaction: 0.28, speedErr: 0.8, timingSd: 0.055 },
  clumsy: { delay: 0.38, gain: 0.8, gainLoad: 0.45, noise: 0.07, reaction: 0.5, speedErr: 1.4, timingSd: 0.095 },
};

export function skillOf(name) {
  return SKILLS[name] || SKILLS.average;
}

export function makePad(connected = true) {
  return {
    id: 'virtual',
    index: 0,
    connected,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    vibrationActuator: { playEffect() { return Promise.resolve(); } },
  };
}

export function clearPad(pad) {
  pad.axes.fill(0);
  for (const b of pad.buttons) {
    b.pressed = false;
    b.value = 0;
  }
}

/** Disc-space wish: x right, y up. Written as a stick (axis 1 positive is down). */
export function writeWish(pad, x, yUp) {
  const h = Math.hypot(x, yUp);
  const s = h > 1 ? 1 / h : 1;
  pad.axes[0] = x * s;
  pad.axes[1] = -yUp * s;
}

export function writeButton(pad, index, down, value = null) {
  pad.buttons[index].pressed = !!down;
  pad.buttons[index].value = value == null ? (down ? 1 : 0) : value;
}

export function correctWish(skill, goal, dot, t, loaded, phase = 0) {
  const g = loaded ? skill.gainLoad : skill.gain;
  const n = skill.noise * Math.sin(t * 3.1 + phase);
  const n2 = skill.noise * Math.cos(t * 2.3 + phase * 1.7);
  let x = goal.x + g * (goal.x - dot.x) + n;
  let y = goal.y + g * (goal.y - dot.y) + n2;
  const h = Math.hypot(x, y);
  if (h > 1) { x /= h; y /= h; }
  return { x, y };
}

/** A short history so the bot reacts to where the dot was `delay` seconds ago. */
export function remember(history, t, dot, keep = 1.2) {
  history.push({ t, x: dot.x, y: dot.y });
  const cut = t - keep;
  while (history.length && history[0].t < cut) history.shift();
}

/** Deterministic timing error. Sharp stays inside a perfect window; clumsy often does not. */
export function timingOffset(skill, index) {
  const sign = index % 2 === 0 ? 1 : -1;
  const scale = index % 5 === 0 ? 1.25 : 0.8;
  return sign * (skill?.timingSd ?? 0.05) * scale;
}

export function recall(history, t) {
  if (!history.length) return { x: 0, y: 0 };
  let best = history[0];
  for (const sample of history) {
    if (sample.t <= t) best = sample;
    else break;
  }
  return best;
}
