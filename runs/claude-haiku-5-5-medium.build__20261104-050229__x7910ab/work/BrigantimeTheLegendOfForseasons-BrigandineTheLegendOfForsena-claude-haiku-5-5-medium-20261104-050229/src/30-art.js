// Art: the rigs of knights and monsters, the battle board, the continent, castles and banners, and the button glyphs.
// Everything is drawn in code (the engine's Humanoid and Blob rigs, and px primitives). No image files.
(() => {
  const H = G, px = E.px;
  H.HEX = 16;                    // a hex's radius in world units
  H.BOARD_TILT = 52;             // the battle view's pitch in degrees
  H.TERRAIN_COLOR = {
    plain: '#7fb868', forest: '#3e7442', hill: '#a08f5e', swamp: '#4f6e56', ruin: '#8a7f78', keep: '#d6b462',
    bridge: '#a77a4a', river: '#2f5f9a', ice: '#c4e8ff', wall: '#6d6876', ash: '#5c5652', dial: '#c9a050', gate: '#4a4456'
  };
  H.TERRAIN_EDGE = { river: '#2a5a94', ice: '#8ac4e8', wall: '#3a3642', keep: '#8a6a2a' };

  // ---- rigs: a knight is a Humanoid dressed by its class and its own look; a monster is a Blob or a bulky/skeleton Humanoid ----
  H.rigFor = unit => {
    if (unit.kind === 'knight') {
      const k = H.get('knight', unit.ref), cls = H.get('class', unit.cls || k.cls);
      const o = Object.assign({ size: 1.15, build: cls.build, weapon: cls.weapon }, k.look);
      if (o.hair == null) o.hair = 'bald';
      for (const key of Object.keys(o)) if (o[key] === null) delete o[key];
      return { rig: new E.Humanoid(o), kind: 'humanoid', moves: cls.moves };
    }
    const sp = H.get('species', unit.species || unit.ref), look = sp.look;
    if (look.kind === 'beast') return { rig: new H.Beast({ body: look.body, colors: look.colors, size: 1 + (unit.form || 0) * .12 }), kind: 'beast', moves: ['slash'] };
    if (look.kind === 'blob') {
      const o = Object.assign({}, look, { R: look.R + (unit.form || 0) * 1.5, colors: look.colors });
      delete o.kind;
      return { rig: new E.Blob(o), kind: 'blob', moves: ['slash'] };
    }
    const o = { size: look.size + (unit.form || 0) * .2, build: look.build, weapon: look.build === 'bulky' ? 'sword' : null, colors: look.colors, outfit: 'shirt' };
    if (look.build === 'skeleton') { o.weapon = 'sword'; o.hair = 'bald'; }
    return { rig: new E.Humanoid(o), kind: 'humanoid', moves: look.build === 'bulky' ? ['haymaker', 'sweep', 'overhead'] : ['slash', 'thrust', 'backslash'] };
  };
  // the sound a skill makes, by its element (a spell of the season's element has that season's voice)
  H.skillSound = id => {
    const sk = H.get('skill', id);
    if (sk.kind === 'passive') return 'chirp';
    if (sk.kind === 'special' && sk.elem !== 'neutral' && sk.elem !== 'user') return { verdant: 'spell_spring', solar: 'spell_summer', ambered: 'spell_autumn', rime: 'spell_winter', hour: 'spell_hour' }[sk.elem] || 'cast_charge';
    if (sk.elem === 'neutral' || sk.elem === 'user') return sk.kind === 'self' ? 'buff' : 'cast_charge';
    return { verdant: 'spell_spring', solar: 'spell_summer', ambered: 'spell_autumn', rime: 'spell_winter', hour: 'spell_hour' }[sk.elem] || 'cast_charge';
  };
  H.statusSound = s => ({ poison: 'poison', burn: 'burn', chill: 'chill', sleep: 'sleep', stop: 'stop', weakened: 'debuff', valor: 'buff', haste: 'buff', warded: 'buff', frostarmor: 'buff', windup: 'buff' })[s] || 'buff';
  // the attack a unit plays for its strike (the engine's move set, the class's own moves)
  H.strikeMove = (unit, n = 0) => {
    const r = H.rigFor(unit);
    return r.moves[n % r.moves.length];
  };

  // ---- the battle board: a tilted view with the hexes laid flat on the ground ----
  H.hexWorldOf = (q, r) => H.hexWorld(q, r, H.HEX);
  H.DIAL_COLOR = ['#8ad870', '#ff8a4a', '#e8b050', '#7ac8ff'];
  H.drawBoard = (r, sim, o) => {
    const S = H.HEX, tiles = sim.s.tiles, reach = o.reach || new Map(), strikeable = o.strike || new Map();
    r.decal(g => {
      for (const k of Object.keys(tiles)) {
        const { q, r: rr } = H.parseKey(k), w = H.hexWorld(q, rr, S);
        const id = tiles[k];
        const pts = H.hexCorners(w.x, w.y, S).map(([x, y]) => r.w(x, y, 0));
        px.poly(g, pts, H.TERRAIN_COLOR[id] || '#7fb868');
        const edge = H.TERRAIN_EDGE[id] || '#2e4a28';
        for (let i = 0; i < 6; i++) { const a = pts[i], b = pts[(i + 1) % 6]; px.line(g, a[0], a[1], b[0], b[1], edge, 1); }
        if (reach.has(k)) px.poly(g, pts, '#e6e87a');
        if (strikeable.has(k)) px.poly(g, pts, '#ff5a4a');
        if (o.plan && o.plan.has(k)) px.poly(g, pts, '#f8f2a0');
      }
      if (o.cursor) {
        const w = H.hexWorld(o.cursor.q, o.cursor.r, S);
        const pts = H.hexCorners(w.x, w.y, S).map(([x, y]) => r.w(x, y, 0));
        for (let i = 0; i < 6; i++) { const a = pts[i], b = pts[(i + 1) % 6]; px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 2); }
      }
    });
    // props on the hexes: forests, hills, ruins, the keep, walls raised as blocks
    for (const k of Object.keys(tiles)) {
      const { q, r: rr } = H.parseKey(k), w = H.hexWorld(q, rr, S), id = tiles[k];
      if (id === 'forest') r.prop('pine', w.x, w.y, 0, { size: .9 });
      if (id === 'hill') r.prop('rock', w.x, w.y, 0, { size: .8 });
      if (id === 'ruin') r.prop('pillar', w.x, w.y, 0, { size: .8, broken: true });
      if (id === 'swamp') r.prop('mushroom', w.x, w.y, 0, { size: .6 });
      if (id === 'keep') r.prop('banner', w.x, w.y, 0, { size: 1 });
      if (id === 'gate') r.prop('pillar', w.x, w.y, 0, { size: 1.4 });
    }
  };
  // the Clockwork Sanctum's dials: each one shows the season it is set to (its colour and its number)
  H.drawDials = (r, sim) => {
    for (const k of Object.keys(sim.s.dials || {})) {
      const { q, r: rr } = H.parseKey(k), w = H.hexWorld(q, rr, H.HEX), v = sim.s.dials[k];
      r.overlay(g => {
        const p = r.w(w.x, w.y, 6);
        px.disc(g, Math.round(p[0]), Math.round(p[1]), 6, '#1a1624');
        px.disc(g, Math.round(p[0]), Math.round(p[1]), 5, H.DIAL_COLOR[v]);
        E.font.text(g, String(v === sim.s.dialTarget ? 'OK' : v), Math.round(p[0]), Math.round(p[1]) - 3, '#101010', { align: 'center' });
      });
    }
  };
  // a hex's centre on the board, for a unit or the cursor
  H.boardCentre = sim => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const k of Object.keys(sim.s.tiles)) {
      const { q, r } = H.parseKey(k), w = H.hexWorld(q, r, H.HEX);
      x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); y0 = Math.min(y0, w.y); y1 = Math.max(y1, w.y);
    }
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0 + H.HEX * 2, h: y1 - y0 + H.HEX * 2 };
  };

  // ---- the continent: the campaign map's world (1000 x 1000) mapped to a panel of the screen ----
  H.mapTransform = (panel) => {
    const s = Math.min(panel.w / 1000, panel.h / 1000);
    return { s, X: x => panel.x + x * s, Y: y => panel.y + y * s };
  };
  H.REALM_FILL = { verdance: '#4ea85a', solmark: '#c8502a', amberlyn: '#b07a2a', hoarfast: '#4a7ab8', dominion: '#4a3c66', free: '#7a6a52' };
  H.drawCastle = (g, x, y, realm, o = {}) => {
    const c = H.REALM_FILL[realm] || '#888';
    const s = o.scale || 1;
    px.rect(g, x - 5 * s, y - 2 * s, 10 * s, 8 * s, '#2a2230');
    px.rect(g, x - 4 * s, y - 1 * s, 8 * s, 6 * s, '#e8dcc0');
    for (let i = -4; i <= 2; i += 3) px.rect(g, x + i * s, y - 4 * s, 2 * s, 2 * s, '#e8dcc0');
    px.rect(g, x - 1 * s, y + 1 * s, 2 * s, 3 * s, '#2a2230');
    px.rect(g, x - 5 * s, y - 6 * s, 2 * s, 4 * s, c);
    if (o.capital) px.poly(g, [[x - 3 * s, y - 6 * s], [x + 3 * s, y - 6 * s], [x, y - 9 * s]], c);
  };

  // ---- button glyphs: a PlayStation shape or Xbox letter for a pad, a keycap for the keyboard, a mouse for the mouse ----
  const PS = { '✕': '#6f9cff', '○': '#ff6a6a', '□': '#e27aff', '△': '#7ad8a0', 'Cross': '#6f9cff' };
  const XB = { A: '#7ad058', B: '#ff6a4a', X: '#6aa6ff', Y: '#ffd24a' };
  // a PlayStation symbol drawn in pixels (the font has no such glyphs); other labels are letters
  const psShape = (g, label, cx, cy, col) => {
    if (label === '✕') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, '#101010', 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, '#101010', 1); }
    else if (label === '○') { px.disc(g, cx, cy, 2, '#101010'); px.disc(g, cx, cy, 1, col); }
    else if (label === '□') px.rect(g, cx - 2, cy - 2, 4, 4, '#101010');
    else if (label === '△') px.poly(g, [[cx, cy - 2], [cx + 2, cy + 2], [cx - 2, cy + 2]], '#101010');
    else E.font.text(g, label.slice(0, 1), cx, cy - 3, '#101010', { align: 'center' });
  };
  H.glyph = (g, label, x, y, device = 'keyboard') => {
    const pad = device === 'gamepad';
    if (pad) {
      const col = PS[label] || XB[label] || '#d8d4e4';
      px.disc(g, x + 4, y + 4, 4, '#1a1624');
      px.disc(g, x + 4, y + 4, 3, col);
      psShape(g, label, x + 4, y + 4, col);
      return 10;
    }
    if (device === 'mouse') {
      px.rect(g, x + 1, y, 6, 9, '#d8d4e4'); px.rect(g, x + 4, y, 1, 4, '#4a4458');
      return 9;
    }
    const w = Math.max(9, E.font.width(label) + 4);
    px.rect(g, x, y, w, 9, '#2a2634'); px.rect(g, x, y + 7, w, 2, '#15131c');
    E.font.text(g, label, x + w / 2, y + 1, '#f0ecff', { align: 'center' });
    return w;
  };
  // the on-screen symbols for the player's device: the glyph and the action name, in a row
  const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
  H.promptRow = (r, game, items, x, y) => {
    const device = game.input.lastDevice || 'keyboard';
    let cx = x;
    r.overlay(g => {
      for (const [action, text] of items) {
        const label = device !== 'gamepad' && ARROW[action] ? ARROW[action] : game.input.label(action, device);
        const w = H.glyph(g, label, cx, y, device);
        E.font.text(g, text, cx + w + 3, y + 1, '#e8e4f4', { shadow: '#000' });
        cx += w + 3 + E.font.width(text) + 10;
      }
    });
  };
})();
