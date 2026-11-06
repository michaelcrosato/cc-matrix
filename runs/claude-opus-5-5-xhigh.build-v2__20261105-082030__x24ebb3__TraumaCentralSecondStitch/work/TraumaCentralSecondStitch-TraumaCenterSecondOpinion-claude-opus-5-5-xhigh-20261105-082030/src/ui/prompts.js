// Prompts follow the last input used: PlayStation glyphs (or Xbox, by setting) for the controller,
// keycaps and mouse icons for keyboard and mouse. Data text carries tokens; nothing hardcodes a button.
const PAD_PS = { use: ['R2'], tool: ['RS'], gift: ['L2'], steady: ['L1'], confirm: ['CROSS'], back: ['CIRCLE'], drop: ['CIRCLE'], syringe: ['SQUARE'], table: ['DPAD'], tag: ['TRIANGLE'], rotate: ['RS'], last: ['R1'], paddles: ['L2', 'R2'], left: ['L2'], right: ['R2'], pause: ['OPTIONS'], remind: ['TRIANGLE'], more: ['TRIANGLE'], tabs: ['L1', 'R1'], move: ['LS'], skip: ['TRIANGLE'] };
const XB = { CROSS: 'A', CIRCLE: 'B', SQUARE: 'X', TRIANGLE: 'Y', L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', OPTIONS: 'MENU' };
const KBM = { use: ['LMB'], tool: ['KEY:1-8'], gift: ['KEY:SPACE'], steady: ['KEY:SHIFT'], confirm: ['KEY:ENTER'], back: ['KEY:ESC'], drop: ['RMB'], syringe: ['KEY:F'], table: ['KEY:TAB'], tag: ['KEY:E'], rotate: ['WHEEL'], last: ['KEY:Q'], paddles: ['LMB', 'RMB'], left: ['LMB'], right: ['RMB'], pause: ['KEY:ESC'], remind: ['KEY:E'], more: ['KEY:M'], tabs: ['KEY:Q', 'KEY:E'], move: ['KEY:WASD'], skip: ['KEY:ESC'] };

export const TOKENS = Object.keys(PAD_PS);

export function glyphsFor(action, device, glyphStyle) {
  if (device === 'pad') {
    const g = PAD_PS[action];
    if (!g) return null;
    return glyphStyle === 'xbox' ? g.map((id) => XB[id] ?? id) : g;
  }
  return KBM[action] ?? null;
}
