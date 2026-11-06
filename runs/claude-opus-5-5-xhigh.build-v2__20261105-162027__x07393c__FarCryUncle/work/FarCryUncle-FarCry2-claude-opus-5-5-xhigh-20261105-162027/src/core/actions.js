// Actions, not keys. All gameplay asks for an action; pad and keyboard/mouse codes live here, and so do glyph names.
export const ACT = {
  fire: { pad: ['PadR2'], kbm: ['MouseLeft'], glyph: { ps: 'R2', xb: 'RT', kbm: 'LMB' } },
  aim: { pad: ['PadL2'], kbm: ['MouseRight'], glyph: { ps: 'L2', xb: 'LT', kbm: 'RMB' } },
  use: { pad: ['PadSquare'], kbm: ['KeyE'], glyph: { ps: 'SQUARE', xb: 'X', kbm: 'E' } },
  reload: { pad: ['PadSquare'], kbm: ['KeyR'], glyph: { ps: 'SQUARE', xb: 'X', kbm: 'R' } },
  jump: { pad: ['PadCross'], kbm: ['Space'], glyph: { ps: 'CROSS', xb: 'A', kbm: 'SPACE' } },
  crouch: { pad: ['PadCircle'], kbm: ['KeyC'], glyph: { ps: 'CIRCLE', xb: 'B', kbm: 'C' } },
  sprint: { pad: ['PadL3'], kbm: ['ShiftLeft'], glyph: { ps: 'L3', xb: 'LS', kbm: 'SHIFT' } },
  melee: { pad: ['PadR3'], kbm: ['KeyF'], glyph: { ps: 'R3', xb: 'RS', kbm: 'F' } },
  next: { pad: ['PadTriangle'], kbm: [], glyph: { ps: 'TRIANGLE', xb: 'Y', kbm: 'WHEEL' } },
  throw: { pad: ['PadR1'], kbm: ['KeyG'], glyph: { ps: 'R1', xb: 'RB', kbm: 'G' } },
  heal: { pad: ['PadL1'], kbm: ['KeyQ'], glyph: { ps: 'L1', xb: 'LB', kbm: 'Q' } },
  map: { pad: ['PadUp'], kbm: ['KeyM', 'Tab'], glyph: { ps: 'UP', xb: 'UP', kbm: 'M' } },
  tablet: { pad: ['PadDown'], kbm: ['KeyH'], glyph: { ps: 'DOWN', xb: 'DOWN', kbm: 'H' } },
  tracker: { pad: ['PadLeft'], kbm: ['KeyT'], glyph: { ps: 'LEFT', xb: 'LEFT', kbm: 'T' } },
  mono: { pad: ['PadRight'], kbm: ['KeyV'], glyph: { ps: 'RIGHT', xb: 'RIGHT', kbm: 'V' } },
  pause: { pad: ['PadOptions'], kbm: ['Escape'], glyph: { ps: 'OPTIONS', xb: 'MENU', kbm: 'ESC' } },
  ledger: { pad: ['PadCreate'], kbm: ['KeyJ'], glyph: { ps: 'CREATE', xb: 'VIEW', kbm: 'J' } },
  // Driving.
  gas: { pad: ['PadR2'], kbm: ['KeyW'], glyph: { ps: 'R2', xb: 'RT', kbm: 'W' } },
  brake: { pad: ['PadL2'], kbm: ['KeyS'], glyph: { ps: 'L2', xb: 'LT', kbm: 'S' } },
  handbrake: { pad: ['PadCross'], kbm: ['Space'], glyph: { ps: 'CROSS', xb: 'A', kbm: 'SPACE' } },
  exit: { pad: ['PadSquare'], kbm: ['KeyE'], glyph: { ps: 'SQUARE', xb: 'X', kbm: 'E' } },
  swap: { pad: ['PadTriangle'], kbm: ['KeyF'], glyph: { ps: 'TRIANGLE', xb: 'Y', kbm: 'F' } },
  chase: { pad: ['PadR3'], kbm: ['KeyC'], glyph: { ps: 'R3', xb: 'RS', kbm: 'C' } },
  // A second face of the use button, for two-button prompts (Syrette or Finish It).
  alt: { pad: ['PadTriangle'], kbm: ['KeyF'], glyph: { ps: 'TRIANGLE', xb: 'Y', kbm: 'F' } },
  // Menus.
  menuUp: { pad: ['PadUp'], kbm: ['ArrowUp', 'KeyW'], glyph: { ps: 'UP', xb: 'UP', kbm: '^' } },
  menuDown: { pad: ['PadDown'], kbm: ['ArrowDown', 'KeyS'], glyph: { ps: 'DOWN', xb: 'DOWN', kbm: 'V' } },
  menuLeft: { pad: ['PadLeft'], kbm: ['ArrowLeft', 'KeyA'], glyph: { ps: 'LEFT', xb: 'LEFT', kbm: '<' } },
  menuRight: { pad: ['PadRight'], kbm: ['ArrowRight', 'KeyD'], glyph: { ps: 'RIGHT', xb: 'RIGHT', kbm: '>' } },
  confirm: { pad: ['PadCross'], kbm: ['Enter', 'Space'], glyph: { ps: 'CROSS', xb: 'A', kbm: 'ENTER' } },
  back: { pad: ['PadCircle'], kbm: ['Escape'], glyph: { ps: 'CIRCLE', xb: 'B', kbm: 'ESC' } },
  tabLeft: { pad: ['PadL1'], kbm: ['KeyQ'], glyph: { ps: 'L1', xb: 'LB', kbm: 'Q' } },
  tabRight: { pad: ['PadR1'], kbm: ['KeyE'], glyph: { ps: 'R1', xb: 'RB', kbm: 'E' } },
  resetOne: { pad: ['PadSquare'], kbm: ['KeyR'], glyph: { ps: 'SQUARE', xb: 'X', kbm: 'R' } },
  skip: { pad: ['PadCross'], kbm: ['Enter'], glyph: { ps: 'CROSS', xb: 'A', kbm: 'ENTER' } },
};
const PAD_MAP = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
const ALL = {};
for (const [k, v] of Object.entries(ACT)) ALL[k] = [...v.pad, ...v.kbm];
export const PREVENT = ['Tab', 'Space', 'Escape', 'KeyM'];

export class Actions {
  device = 'kbm'; triggers = [0, 0]; rs = 0; bot = null; lastPtr = [0, 0];
  constructor(input) { this.input = input; input.gamepadButtons = { ...PAD_MAP }; for (const k of PREVENT) input.preventKeys.add(k); }
  codes(name) { return ALL[name]; }
  down(name) { if (this.bot?.held.has(name)) return true; return this.bot?.only ? false : this.input.anyDown(ALL[name]); }
  /** Once per press, in fixedUpdate. */
  take(name) {
    if (this.bot?.queue.has(name)) { this.bot.queue.delete(name); return true; }
    return this.bot?.only ? false : this.input.consumeAny(ALL[name]);
  }
  /** Once per press, in update (menus). */
  tapped(name) {
    if (this.bot?.taps.has(name)) { this.bot.taps.delete(name); return true; }
    if (this.bot?.only) return false;
    const codes = ALL[name];
    for (let i = 0; i < codes.length; i++) if (this.input.wasPressed(codes[i])) return true;
    return false;
  }
  axis() {
    if (this.bot) { if (this.bot.only || this.bot.move.x || this.bot.move.y) return this.bot.move; }
    return this.input.moveAxis();
  }
  /** Throttle and brake 0..1 from analog triggers when a pad is used, else the keys. */
  analog(name) {
    if (this.bot && this.bot.analog[name] != null) return this.bot.analog[name];
    if (name === 'gas') { if (this.input.anyDown(ACT.gas.kbm)) return 1; return Math.max(this.triggers[1], this.input.isDown('PadR2') ? 1 : 0); }
    if (name === 'brake') { if (this.input.anyDown(ACT.brake.kbm)) return 1; return Math.max(this.triggers[0], this.input.isDown('PadL2') ? 1 : 0); }
    return 0;
  }
  glyph(name, xbox) { const g = ACT[name].glyph; return this.device === 'pad' ? (xbox ? g.xb : g.ps) : g.kbm; }
  /** Per frame: who touched what last. */
  track(usePad) {
    const input = this.input;
    let padActive = false;
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const pads = nav?.getGamepads ? nav.getGamepads() : null;
    let l2 = 0, r2 = 0, rs = 0;
    if (pads) for (const p of pads) {
      if (!p || !p.connected) continue;
      const a = p.axes || [];
      if (Math.hypot(a[0] || 0, a[1] || 0) > 0.35 || Math.hypot(a[2] || 0, a[3] || 0) > 0.35) padActive = true;
      rs = Math.max(rs, Math.hypot(a[2] || 0, a[3] || 0));
      l2 = Math.max(l2, p.buttons?.[6]?.value || 0); r2 = Math.max(r2, p.buttons?.[7]?.value || 0);
    }
    if (l2 !== this.triggers[0] || r2 !== this.triggers[1] || rs !== this.rs) { input.send({ tr: [l2, r2], rs }); }
    for (const cmd of input.commands) if (cmd && cmd.tr) { this.triggers = cmd.tr; this.rs = cmd.rs ?? 0; }
    let keyHit = false;
    const st = input.state();
    const held = st.held ?? st.keys ?? [];
    const queued = st.queued ?? st.presses ?? [];
    const look = (code) => { if (String(code).startsWith('Pad')) padActive = true; else keyHit = true; };
    if (Array.isArray(held)) for (const c of held) look(typeof c === 'string' ? c : c.code ?? c[0]);
    if (Array.isArray(queued)) for (const c of queued) if (c[1] === undefined || c[1] < 0.02) look(typeof c === 'string' ? c : c.code ?? c[0]);
    const pt = input.pointer;
    const moved = pt.x !== this.lastPtr[0] || pt.y !== this.lastPtr[1];
    this.lastPtr[0] = pt.x; this.lastPtr[1] = pt.y;
    const deltaMoved = (input.mouseDelta.x !== 0 || input.mouseDelta.y !== 0) && rs < 0.15;
    if (padActive) this.device = 'pad';
    else if (keyHit || moved || deltaMoved || input.wheel !== 0) this.device = 'kbm';
    return padActive || keyHit || moved || deltaMoved || input.wheel !== 0;
  }
}
export class Bot {
  held = new Set(); queue = new Set(); taps = new Set(); move = { x: 0, y: 0 }; analog = {}; only = true;
  press(name) { this.queue.add(name); this.taps.add(name); }
  hold(name, on = true) { if (on) this.held.add(name); else this.held.delete(name); }
  clear() { this.held.clear(); this.queue.clear(); this.taps.clear(); this.move = { x: 0, y: 0 }; this.analog = {}; }
}
