/** Pad polling and last-device prompts. Pads are read here, not merged by the engine. */

export const TOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];

const DEAD = 0.28;

export function readPads() {
  const nav = globalThis.navigator;
  if (!nav || typeof nav.getGamepads !== 'function') return [];
  let list = [];
  try {
    list = nav.getGamepads() || [];
  } catch {
    return [];
  }
  const out = [];
  for (const pad of list) if (pad && pad.connected) out.push(pad);
  return out;
}

function axis(pad, i) {
  const v = pad?.axes?.[i] || 0;
  return Math.abs(v) < DEAD ? 0 : v;
}

function button(pad, i) {
  const b = pad?.buttons?.[i];
  if (!b) return 0;
  if (b.pressed) return b.value > 0 ? b.value : 1;
  return b.value || 0;
}

function rising(prev, pad, i) {
  const down = button(pad, i) > 0.4;
  const was = !!prev[i];
  prev[i] = down;
  return down && !was;
}

/** One pad's surgical input, plus menu edges. `prev` is a button array this function mutates. */
export function samplePad(pad, prev) {
  if (!prev.buttons) prev.buttons = [];
  const buttons = prev.buttons;
  const sx = axis(pad, 0);
  const sy = axis(pad, 1);
  const rx = axis(pad, 2);
  const ry = axis(pad, 3);
  const mag = Math.hypot(rx, ry);
  let tool = null;
  if (mag >= 0.65 && !(prev.flick >= 0.65)) {
    const ang = Math.atan2(ry, rx);
    const idx = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    tool = TOOLS[idx];
  }
  prev.flick = mag;
  const r2 = button(pad, 7);
  return {
    index: pad.index || 0,
    sx,
    sz: sy,
    rx,
    ry,
    use: r2 > 0.4 || button(pad, 0) > 0.4,
    useEdge: rising(buttons, pad, 0),
    gift: button(pad, 6) > 0.4,
    steady: button(pad, 4) > 0.4,
    back: rising(buttons, pad, 1),
    square: rising(buttons, pad, 2),
    triangle: rising(buttons, pad, 3),
    l1: rising(buttons, pad, 4),
    r1: rising(buttons, pad, 5),
    options: rising(buttons, pad, 9),
    up: rising(buttons, pad, 12) || (sy < -0.55 && !(prev.sy < -0.55)),
    down: rising(buttons, pad, 13) || (sy > 0.55 && !(prev.sy > 0.55)),
    left: rising(buttons, pad, 14),
    right: rising(buttons, pad, 15),
    tool,
    any: Math.hypot(sx, sy) > 0 || mag > 0 || buttonsDown(pad),
  };
}

function buttonsDown(pad) {
  const list = pad?.buttons || [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b && (b.pressed || b.value > 0.4)) return true;
  }
  return false;
}

export function sampleAll(memory = { pads: [] }) {
  const pads = readPads();
  const sampled = [];
  let any = false;
  pads.forEach((pad, i) => {
    const slot = memory.pads[i] || (memory.pads[i] = { buttons: [], flick: 0, sy: 0 });
    const row = samplePad(pad, slot);
    const sy = axis(pad, 1);
    row.up = row.up || (sy < -0.55 && !(slot.sy < -0.55));
    row.down = row.down || (sy > 0.55 && !(slot.sy > 0.55));
    slot.sy = sy;
    if (row.any) any = true;
    sampled.push(row);
  });
  memory.pads.length = pads.length;
  return { pads: sampled, any };
}

export function promptConfirm(device, glyphs) {
  if (device === 'key' || device === 'mouse') return 'ENTER';
  return glyphs === 'xbox' ? 'A' : 'CROSS';
}

export function toolIndex(name) {
  const i = TOOLS.indexOf(name);
  return i < 0 ? 0 : i;
}
