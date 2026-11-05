/* ---- THE GAME: its key map, its settings and pause items, and the helpers that read them (made before the scenes,
 * which hang off it). Controls (rebindable on the Controls screen): aim = stick / d-pad / WASD / arrows / the mouse;
 * shot = Cross / J / left click; loft = Square / K / right click; block = Circle / L / Q; special = Triangle / I / F;
 * run = R1 / Space; back = L1 / Shift; charge = R2 / E; pause = Options / Esc / P. Menus: confirm = Cross / Enter /
 * Space / J; cancel = Circle / Esc / Backspace / L. Create (Pad8) is never bound (in AI Hub sessions it is the hub's). ---- */
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  shot: ['KeyJ', 'Mouse0', 'Pad0'], loft: ['KeyK', 'Mouse2', 'Pad2'], block: ['KeyL', 'KeyQ', 'Pad1'], special: ['KeyI', 'KeyF', 'KeyT', 'Pad3'],
  run: ['Space', 'Pad5'], back: ['ShiftLeft', 'ShiftRight', 'Pad4'], charge: ['KeyE', 'Pad7'], tab: ['Tab'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1']
};
const HUB = !!(window.AIHub && window.AIHub.active);
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['County', 'Village', 'Test', 'Kerfuffle!'], value: 'County', help: 'Timing windows, ball speed, the CPU\'s skill and catching' },
  { key: 'defOvers', label: 'Default overs', options: ['2', '1', '3', '5'], value: '2', help: 'Overs an innings in a Quick Match' },
  { key: 'defWickets', label: 'Default wickets', options: ['5', '3', '10', '2'], value: '5', help: 'Wickets an innings in a Quick Match' },
  { key: 'kerfuffleRules', label: 'Kerfuffle rules', value: true, help: 'Items, specials, stadium targets and chaos. Off: purist arcade' },
  { key: 'pitchMarker', label: 'Pitch marker (batting)', value: true, help: 'Shows where the ball will land' },
  { key: 'timing', label: 'Timing feedback', value: true, help: 'PERFECT / GOOD / EARLY / LATE after each shot' },
  { key: 'fielding', label: 'Fielding', options: ['Assisted', 'Manual', 'Auto'], value: 'Assisted', help: 'Assisted: easy catches are taken for you. Manual: steer the chaser. Auto: the CPU fields' },
  { key: 'running', label: 'Running', options: ['Manual', 'Auto'], value: 'Manual', help: 'Auto: the batters call their own runs' },
  { key: 'replays', label: 'Replays', options: ['Big moments', 'Always', 'Never'], value: 'Big moments' },
  { key: 'captions', label: 'Commentary captions', value: true },
  { key: 'voices', label: 'Commentary voices', value: true, help: 'Gibberish voices for the commentators and players' }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: KEYS, bg: '#0c1a10', id: 'cricket-kerfuffle', autoPause: !HUB,
  menu: { items: HUB ? [] : [['Restart Match', () => K.restart()], ['Match Info', () => K.matchInfo()], ['Dev Mode', () => K.dev.open()]], settings: SETTINGS,
    controls: { shot: 'Ground shot / Bowl / Catch', loft: 'Lofted shot / Alt delivery', block: 'Defend / Alt delivery', special: 'Special / Review', run: 'Run / Field', back: 'Stay / Over-Round', charge: 'Charge', tab: false }, quit: HUB ? false : 'title' } });
K.game = game; game.hubActive = HUB;
const SETTING_MAP = { difficulty: v => ({ County: 'county', Village: 'village', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[v] || 'county'), fielding: v => String(v || 'Assisted').toLowerCase(), running: v => String(v || 'Manual').toLowerCase(), defOvers: v => +v || 2, defWickets: v => +v || 5 };
K.settings = key => { const v = game.settings ? game.settings[key] : undefined, def = SETTINGS.find(s => s.key === key); const val = v === undefined ? (def ? def.value : undefined) : v; return SETTING_MAP[key] ? SETTING_MAP[key](val) : val; };
/* the mouse, for player 1: the ground point under the pointer (sim units), fresh while it moved in the last second */
K.mouseAim = I => {
  if (I !== game.input || !game.input.mouse || !game.input.mouse.active || !MatchView.B) return null;
  const p = game.mouseGround(); if (!p) return null;
  const fresh = game.input.clock - game.input.mouse.t < 1, last = K._lastMouse || p, dx = (p[0] - last[0]); K._lastMouse = p;
  return { x: p[0] - MatchView.B.OX, y: p[1] - MatchView.B.OY, fresh, dx: fresh ? dx : 0 };
};
/** the batter's aim: the mouse's ground point relative to the batter while it moved lately, else the stick (screen space) */
K.batAim = (I, m) => {
  if (!I) return null;
  const ms = K.mouseAim(I);
  if (ms && ms.fresh && I.lastDevice === 'mouse') { const dx = ms.x - m.striker.x, dy = ms.y - m.striker.y, d = hyp(dx, dy); if (d > 30) return [dx / d, dy / d]; }
  const mv = I.move(); if (hyp(mv[0], mv[1]) < .3) return null;
  const d = (K.view || game.view).screenDirToGround(mv[0], mv[1]), l = hyp(d[0], d[1]) || 1; return [d[0] / l, d[1] / l];
};
/** a click on (or near) a set of stumps throws there */
K.clickEnd = I => {
  if (I !== game.input) return null; const c = I.clicked && I.clicked(); if (!c || !MatchView.B || !game.r) return null;
  const B = MatchView.B, r = game.r, a = r.w(B.OX, B.OY, 8), b = r.w(B.OX, B.OY + G.BOWL_Y, 8);
  const da = hyp(c[0] - a[0], c[1] - a[1]), db = hyp(c[0] - b[0], c[1] - b[1]);
  return Math.min(da, db) < 40 ? (da < db ? 'S' : 'B') : null;
};
