// WIRETAP input preset (PLAN §4.1) and prompt glyphs (§4.3).
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'],
  interact: ['KeyE', 'Pad0'], crouch: ['KeyC', 'ControlLeft', 'Pad1'], blend: ['KeyF', 'Pad2'], partner: ['KeyQ', 'Pad3'],
  notebook: ['Tab', 'KeyN', 'Pad8'], map: ['KeyM'],
  watch: ['Mouse2', 'Pad6'], photo: ['Mouse0', 'Pad7'], sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'],
  rotL: ['BracketLeft', 'Pad4'], rotR: ['BracketRight', 'Pad5'], camReset: ['KeyR', 'Pad11'],
  tabPrev: ['KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], uiAlt: ['Digit2', 'KeyT', 'Pad2'], uiInfo: ['Digit3', 'KeyI', 'Pad3'], uiFast: ['ShiftLeft', 'Pad7'],
  boxTop: ['Digit1', 'Pad3'], boxLeft: ['Digit2', 'Pad2'], boxRight: ['Digit3', 'Pad1'], boxBottom: ['Digit4', 'Pad0'],
};

// Pad button index -> [PlayStation, Xbox]
const PAD_SYMBOLS = {
  Pad0: ['✕', 'A'], Pad1: ['○', 'B'], Pad2: ['□', 'X'], Pad3: ['△', 'Y'], Pad4: ['L1', 'LB'], Pad5: ['R1', 'RB'],
  Pad6: ['L2', 'LT'], Pad7: ['R2', 'RT'], Pad8: ['Create', 'View'], Pad9: ['Options', 'Menu'], Pad10: ['L3', 'LS'], Pad11: ['R3', 'RS'],
  Pad12: ['↑', '↑'], Pad13: ['↓', '↓'], Pad14: ['←', '←'], Pad15: ['→', '→'],
};

// The name of an action on the player's device, in the chosen symbol set when a pad was used last.
function glyph(game, action) {
  const I = game.input;
  if (I.lastDevice === 'gamepad') {
    const pad = (KEYS[action] || []).find(c => /^Pad\d+$/.test(c));
    if (pad && PAD_SYMBOLS[pad]) return PAD_SYMBOLS[pad][game.settings.padSymbols === 'Xbox' ? 1 : 0];
  }
  return I.label(action);
}

// "✕ Photo" style prompt text for the HUD and legends.
const prompt = (game, action, word) => glyph(game, action) + ' ' + word;

// Footer legend: an array of [action, word] pairs, as text.
const legendText = (game, pairs) => pairs.map(([a, w]) => glyph(game, a) + ' ' + w).join('   ');
