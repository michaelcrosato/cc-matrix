/* MASH TV — 01-input: the two presets (menus and play), the preset-sync hook (engine patch P1), how a contestant reads
 * its intent, the any-input clock for the attract mode, touch-only detection and the button glyphs (PlayStation and Xbox). */

// menus: arrows and WASD navigate, Enter/Space confirm, Esc/Backspace back, Q/E turn pages (L1/R1 on a pad)
MT.MASH_MENU = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], extra: ['KeyM', 'Pad3']
};
// play: WASD (or the left stick) moves, the arrows aim and fire in eight ways, the mouse aims and Left click fires
MT.MASH_PLAY = {
  up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
// the menu's names on the Controls screen
MT.CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)',
  aimDown: 'Fire down (keyboard)', aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, extra: false };

// Which preset every player should use right now: the menu's while the pause menu or one of our overlays is open
MT.overlays = [];   // open overlays (dev panel, episode map, how to play); each has .open
MT.wantPreset = game => {
  const sc = game.scene;
  if (game.paused || MT.overlays.some(o => o.open) || (MT.NET && MT.netOverlay && MT.netOverlay.open) || MT.PLAY.mapOverlay || MT.PLAY.howOverlay || !sc || sc.mtPreset !== 'play') return 'menu';
  return 'play';
};
E.HOOKS.input.push((game) => {
  if (!game.players) return;
  const want = MT.wantPreset(game);
  for (const p of game.players) {
    if (p._mtPreset === want) continue;
    p.use(want === 'play' ? MT.MASH_PLAY : MT.MASH_MENU); p._mtPreset = want;
  }
});

// Any input on any device (the attract clock and the title's touch notice); DOM listeners are added by 99-main
MT.inputSerial = 0; MT.lastDevice = 'keyboard'; MT.keyedAt = 0;
MT.noteInput = (kind) => { MT.inputSerial++; if (kind) MT.lastDevice = kind; };
MT.pollPads = () => {   // a pad's button or a stick past .5 counts (the browser's pad list)
  const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
  let any = false;
  for (const p of pads) if (p) { if (p.buttons.some(b => b.pressed || b.value > .5) || p.axes.some(a => Math.abs(a) > .5)) any = true; }
  if (any) MT.noteInput('gamepad');
  return any;
};
MT.touchOnly = () => {
  if (typeof navigator === 'undefined' || !navigator.maxTouchPoints) return false;
  const fine = typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches;
  return !fine && !MT.padConnected() && MT.inputSerial === 0 || (!fine && MT.lastDevice === 'touch' && !MT.padConnected());
};
MT.padConnected = () => { try { return typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean); } catch (e) { return false; } };

// How a contestant reads its intent each step (§4.3). Bots and remote players produce the same object.
MT.intentFrom = (I, c, game, world) => {
  const out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, source: 'none' };
  const m = I.move(), mag = Math.min(1, Math.hypot(m[0], m[1]));
  if (mag > .05) { const d = game.view.screenDirToGround(m[0], m[1]), L = Math.hypot(d[0], d[1]) || 1; out.move = [d[0] / L * mag, d[1] / L * mag]; }
  const autoFire = game.settings.autoFire !== false;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .35) {
    const d = game.view.screenDirToGround(I.padAim[0], I.padAim[1]);
    out.aim = Math.atan2(d[1], d[0]); out.fire = autoFire; out.source = 'stick';
  } else if (I.down('aimUp') || I.down('aimDown') || I.down('aimLeft') || I.down('aimRight')) {
    const sx = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), sy = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    const d = game.view.screenDirToGround(sx, sy); out.aim = Math.atan2(d[1], d[0]); out.fire = true; out.source = 'arrows';
  } else if (I.lastDevice === 'mouse' && I === game.input) {
    const g = game.mouseGround && game.mouseGround();
    if (g) out.aim = Math.atan2(g[1] - c.y, g[0] - c.x);
    out.fire = I.down('fire'); out.source = 'mouse';
  } else {
    out.fire = I.down('fire');
    out.aim = c.aim;
  }
  if (out.fire === false && I.down('fire') && out.aim !== null) out.fire = true;
  if (out.aim !== null && world && game.settings.aimAssist !== false && I.lastDevice === 'gamepad') {   // aim assist: pad only, within 170 and ±10°
    let best = null, bd = 170;
    for (const e of world.enemies) {
      if (!e.alive || e.kind === 'mime' && !e.counted) continue;
      const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy); if (d > bd) continue;
      let da = Math.atan2(dy, dx) - out.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < .175) { best = { d, a: Math.atan2(dy, dx), da }; bd = d; }
    }
    if (best) out.aim = out.aim + best.da * .5;
  }
  out.slide = I.pressed('slide'); out.bomb = I.pressed('bomb'); out.showboat = I.pressed('showboat');
  return out;
};

/* ---------- glyphs: PlayStation and Xbox icons drawn with E.px, keycaps, and the mouse ---------- */
MT.glyph = {
  // which family the setting asks for: PlayStation by default, Xbox (A B X Y) when the Settings option is picked
  family: game => (game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation'),
  // the pad button an action uses (standard mapping)
  padOf: { confirm: 'Pad0', cancel: 'Pad1', slide: 'Pad6', fire: 'Pad7', bomb: 'Pad5', showboat: 'Pad4', start: 'Pad9', pause: 'Pad9', reset: 'Pad3', extra: 'Pad3', tabL: 'Pad4', tabR: 'Pad5', move: 'stick', aim: 'stick' },
  // draws one icon; returns its width
  draw(g, x, y, action, input, o = {}) {
    const game = MT.G, s = o.scale || 1, dev = input ? input.lastDevice : 'keyboard';
    if (dev === 'gamepad') return this.pad(g, x, y, this.padOf[action] || 'Pad0', this.family(game), s, action);
    if (dev === 'mouse' && MT.mouseAction(input, action)) return this.mouse(g, x, y, MT.mouseAction(input, action), s);
    const label = input ? input.label(action) : '';
    return this.keycap(g, x, y, label || '?', s);
  },
  // a row of icons with labels: [[action, 'TEXT'], ...]
  prompt(g, x, y, pairs, input, o = {}) {
    let cx = x; const s = o.scale || 1;
    for (const [a, t] of pairs) {
      cx += this.draw(g, cx, y, a, input, { scale: s }) + 3 * s;
      cx += E.font.text(g, t, cx, y + 2 * s, o.color || '#fff7e8', { scale: s, shadow: '#000' }) + 8 * s;
    }
    return cx - x;
  },
  pad(g, x, y, code, fam, s, action) {   // 11 x 11 at scale 1
    const cx = x + 5 * s, cy = y + 5 * s, R = 5 * s;
    if (code === 'stick') { px.disc(g, cx, cy, R, '#2a2a33'); px.disc(g, cx, cy, R - 1 * s, '#7a7a88'); px.disc(g, cx, cy, 2 * s, '#e8e8f0'); return 11 * s; }
    if (code === 'Pad6' || code === 'Pad7' || code === 'Pad4' || code === 'Pad5') {   // shoulders and triggers: rounded tabs
      const lbl = { Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2' }[code], w = 15 * s, h = 9 * s;
      px.rect(g, x, y + 1 * s, w, h, '#2a2a33'); px.rect(g, x + s, y + 2 * s, w - 2 * s, h - 2 * s, '#c8cad8');
      const txt = fam === 'xbox' ? { Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT' }[code] : lbl;
      E.font.text(g, txt, x + (w - E.font.width(txt, { scale: s })) / 2, y + 2 * s, '#111', { scale: s }); return w + 2 * s;
    }
    if (code === 'Pad9') { px.rect(g, x, y + 2 * s, 11 * s, 6 * s, '#2a2a33'); px.rect(g, x + s, y + 3 * s, 9 * s, 4 * s, '#c8cad8'); return 13 * s; }
    if (code === 'Pad12' || code === 'Pad13' || code === 'Pad14' || code === 'Pad15') {
      px.rect(g, x + 4 * s, y, 3 * s, 11 * s, '#2a2a33'); px.rect(g, x, y + 4 * s, 11 * s, 3 * s, '#2a2a33');
      px.rect(g, x + 4 * s + s, y + s, s, 9 * s, '#c8cad8'); px.rect(g, x + s, y + 4 * s + s, 9 * s, s, '#c8cad8'); return 11 * s;
    }
    // face buttons: a dark disc with the family's symbol
    px.disc(g, cx, cy, R, '#15151c');
    if (fam === 'xbox') {
      const map = { Pad0: ['A', '#3ec45a'], Pad1: ['B', '#e0443a'], Pad2: ['X', '#3a8ae0'], Pad3: ['Y', '#f0c020'] }[code] || ['A', '#3ec45a'];
      px.disc(g, cx, cy, R - s, map[1]); const w = E.font.width(map[0], { scale: s }); E.font.text(g, map[0], cx - w / 2, cy - 3 * s, '#101010', { scale: s });
    } else {
      const k = { Pad0: ['x', '#7aa8ff'], Pad1: ['o', '#ff6a6a'], Pad2: ['s', '#ff8ad8'], Pad3: ['t', '#5fe0a0'] }[code] || ['x', '#7aa8ff'];
      this.symbol(g, cx, cy, k[0], k[1], s);
    }
    return 11 * s;
  },
  symbol(g, cx, cy, k, col, s) {   // ✕ ○ □ △ drawn in lines (the 5x7 font has none)
    const r = 3 * s;
    if (k === 'x') { px.line(g, cx - r, cy - r, cx + r, cy + r, col, s); px.line(g, cx + r, cy - r, cx - r, cy + r, col, s); }
    else if (k === 'o') { px.disc(g, cx, cy, r + s * .5, col); px.disc(g, cx, cy, r - s * .5, '#15151c'); }
    else if (k === 's') { px.line(g, cx - r, cy - r, cx + r, cy - r, col, s); px.line(g, cx + r, cy - r, cx + r, cy + r, col, s); px.line(g, cx + r, cy + r, cx - r, cy + r, col, s); px.line(g, cx - r, cy + r, cx - r, cy - r, col, s); }
    else { px.line(g, cx, cy - r, cx + r, cy + r, col, s); px.line(g, cx + r, cy + r, cx - r, cy + r, col, s); px.line(g, cx - r, cy + r, cx, cy - r, col, s); }
  },
  keycap(g, x, y, label, s) {
    const w = Math.max(11 * s, (E.font.width(label, { scale: s }) + 5 * s)), h = 11 * s;
    px.rect(g, x, y, w, h, '#2a2a33'); px.rect(g, x + s, y + s, w - 2 * s, h - 3 * s, '#e8e8f0');
    E.font.text(g, label, x + (w - E.font.width(label, { scale: s })) / 2, y + 2 * s, '#15151c', { scale: s });
    return w;
  },
  mouse(g, x, y, side, s) {
    const w = 8 * s, h = 11 * s; px.rect(g, x + 1 * s, y, w, h, '#2a2a33'); px.rect(g, x + 2 * s, y + s, w - 2 * s, h - 2 * s, '#c8cad8');
    px.rect(g, x + 2 * s, y + s, 2 * s, 4 * s, side === 'left' ? '#ffcc33' : '#7a7a88');
    px.rect(g, x + 5 * s, y + s, 2 * s, 4 * s, side === 'right' ? '#ffcc33' : '#7a7a88');
    return w + 2 * s;
  }
};
// mouse actions: the keyboard's default bindings with a mouse button (fire, bomb)
MT.mouseAction = (input, action) => {
  const m = input.map && input.map[action]; if (!m) return null;
  const b = m.find(c => c.startsWith('Mouse')); return b ? (b === 'Mouse2' ? 'right' : 'left') : null;
};
