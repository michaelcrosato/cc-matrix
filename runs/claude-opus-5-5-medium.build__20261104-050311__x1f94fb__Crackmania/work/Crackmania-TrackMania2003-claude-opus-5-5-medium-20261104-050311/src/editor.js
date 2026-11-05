// The track editor (Build) and the puzzles: a cursor on the 32 x 32 x 16 grid, an orbit camera round it, a palette of
// blocks bought with coppers (packs unlock families), place / remove / rotate / raise, undo and redo, test drive,
// validation by driving start to finish (sets the author time), six save slots, share codes. In a puzzle: fixed
// blocks, an inventory, a build zone and no-build cells; Validate earns the medals.
import { BLOCKS, PALETTE, PACKS, DECO, HEAD, localFrame, CELL, LEVEL } from './blocks.js';
import { Track, toWorld, ORIGIN, GRID, LEVELS, shareCode, fromShareCode, cellCenter, worldToCell } from './track.js';
import { PUZZLES, ENV_INFO } from './data.js';
import { ChaseCam } from './cam.js';
import { U, clamp } from './v3.js';
import { fmt } from './run.js';
import { text, tw, big, panel, promptBar, coinIcon, lockIcon, COL, LetterWheel, glyph, codeFor } from './ui.js';
import { drawDeco } from './view.js';

const E = globalThis.My3D2dge, px = E.px;
export const EDIT_INPUT = {
  up: ['KeyW', 'ArrowUp', 'PadAxisUp'], down: ['KeyS', 'ArrowDown', 'PadAxisDown'], left: ['KeyA', 'ArrowLeft', 'PadAxisLeft'], right: ['KeyD', 'ArrowRight', 'PadAxisRight'],
  place: ['Space', 'Enter', 'Pad0', 'Mouse0'], remove: ['Delete', 'Backspace', 'Pad2', 'Mouse2'], rotate: ['KeyR', 'Pad5'], rotateBack: ['KeyF', 'Pad4'],
  levelUp: ['KeyE', 'PageUp', 'Pad7'], levelDown: ['KeyQ', 'PageDown', 'Pad6'], test: ['KeyT', 'Pad3'], undo: ['KeyZ', 'Pad10'], redo: ['KeyY', 'Pad11'],
  palPrev: ['BracketLeft', 'Comma', 'Pad14'], palNext: ['BracketRight', 'Period', 'Pad15'], catPrev: ['Backquote', 'Pad12'], catNext: ['Tab', 'Pad13'],
  confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Pad1', 'KeyX'], start: ['Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], del: ['Delete', 'Pad2'], alt: ['KeyR', 'Pad3']
};
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];

export function editorScene(app) {
  const game = app.game; let S = null;
  const P = () => app.profile;
  const sfx = (n, o) => game.audio.sfx(n, o);
  const note = (m, t = 1.5) => game.note(m, t);

  function enter(o = {}) {
    app.race = null;
    if (S && o.resume) { app.music('editor'); rebuild(); return; }   // back from a test drive
    const slots = P().data.slots;
    let track, puzzle = null;
    if (o.puzzle) {
      puzzle = PUZZLES.find(z => z.id === o.puzzle); const sol = app.track(o.puzzle);
      track = new Track({ env: puzzle.env, name: puzzle.name });
      for (const b of sol.blocks) if (/^(ST|CP|FN)$/.test(b.type)) { const nb = track.place(b.type, b.cx, b.cy, b.L, b.rot, true); nb.fixed = true; }
      if (puzzle.canyon) { const [x0, x1, y0, y1] = puzzle.canyon; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) track.chasmExtra.push([x, y, 'canyon']); }
      for (const n of puzzle.noBuild || []) if (n[2] === 'pond') track.chasmExtra.push([n[0], n[1], 'water']);
      track.id = null;
    } else if (o.slot !== undefined && slots[o.slot] && !o.env) {
      const s = slots[o.slot]; track = fromShareCode(s.code) || new Track({ env: s.env, name: s.name }); track.name = s.name;
    } else track = new Track({ env: o.env || 'dustbowl', name: 'MY TRACK ' + ((o.slot || 0) + 1) });
    const st = track.blocks.find(b => b.type === 'ST');
    S = { track, puzzle, slot: o.slot ?? null, cur: st ? [st.cx + 2, st.cy, 0] : [8, 8, 0], rot: 0, cat: 0, item: 0, undo: [], redo: [], yaw: -Math.PI / 2 - .6, pitch: .9, dist: 160, cam: new ChaseCam(), focus: null, t: 0, modal: null, validated: puzzle ? null : (o.slot !== undefined && slots[o.slot] && !o.env ? slots[o.slot].author : null), used: {}, drop: null };
    if (puzzle) { S.cur = [st.cx + 1, st.cy, 0]; S.cat = 0; }
    if (o.importCode) S.modal = { kind: 'import', text: '' };
    rebuild(); app.music('editor');
    if (puzzle) { if (!P().seen('puzzleIntro')) { P().see('puzzleIntro'); app.dialog.say([['coco', 'I built a track and lost some pieces.'], ['coco', 'Find a way from start to finish. The fastest way wins.'], ['coco', 'Place the pieces you have, then VALIDATE: drive it.']]); } }
    else if (!P().seen('editorIntro')) { P().see('editorIntro'); app.dialog.say([['coco', 'My toolbox. Every block costs coppers.', 'wave'], ['coco', 'A track counts only once you drive it, start to finish.'], ['coco', 'Press ' + (game.input.label('test') || 'T') + ' to test drive. VALIDATE is in the menu.']]); }
    app.editorExport = () => { const j = S.track.toJSON(); const txt = "{ id: 'X1', env: '" + j.env + "', name: '" + j.name + "', blocks: " + JSON.stringify(j.blocks) + ' }'; if (typeof console !== 'undefined') console.log('CRACKMANIA content:\n' + txt); S.exported = txt; S.modal = { kind: 'export', code: txt }; if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => { if (S.modal) S.modal.copied = true; }).catch(() => {}); };
    app.editorMenu = editorMenu;
  }
  function rebuild() {
    if (S.P && S.P.phys) S.P.phys.free();
    S.P = app.prepare(S.track); S.route = S.P.course.route; S.view = app.show(S.P);
    S.used = {}; for (const b of S.track.blocks) if (!b.fixed) S.used[b.type] = (S.used[b.type] || 0) + 1;
  }
  // ---- the palette ----
  const items = () => {
    if (S.puzzle) return Object.keys(S.puzzle.inv).map(id => ({ id, left: S.puzzle.inv[id] - (S.used[id] || 0) }));
    const [, list] = PALETTE[S.cat]; return list.filter(id => { const B = BLOCKS[id] || DECO[id]; return !B.envs || B.envs.includes(S.track.env); }).map(id => ({ id }));
  };
  const cats = () => S.puzzle ? [['PIECES']] : PALETTE;
  const curItem = () => { const L = items(); return L[clamp(S.item, 0, L.length - 1)]; };
  const packOf = id => id.startsWith('@') ? 'scenery' : BLOCKS[id].pack;
  const costOf = id => id.startsWith('@') ? DECO[id].cost : BLOCKS[id].cost;
  function why(type, cx, cy, L, rot) {
    if (S.puzzle) {
      const z = S.puzzle.zone, it = items().find(i => i.id === type);
      if (!it || it.left <= 0) return 'NONE LEFT';
      for (const [x, y, l] of S.track.cellsOf(type, cx, cy, L, rot)) { if (x < z[0] || x > z[1] || y < z[2] || y > z[3] || l < z[4] || l > z[5] + 1) return 'OUTSIDE THE BUILD ZONE'; if ((S.puzzle.noBuild || []).some(n => n[0] === x && n[1] === y && l === 0)) return 'CAN\'T BUILD THERE'; }
    } else {
      if (!P().hasPack(packOf(type))) return 'LOCKED: ' + PACKS[packOf(type)].name + ' PACK';
      if (P().coppers < costOf(type)) return 'NOT ENOUGH COPPERS';
    }
    if (type.startsWith('@')) { if (S.track.at(cx, cy, 0) || S.track.deco.some(d => d.cx === cx && d.cy === cy)) return 'SPACE TAKEN'; return ''; }
    return S.track.check(type, cx, cy, L, rot);
  }
  function edited() { S.validated = null; if (S.slot !== null && !S.puzzle) { const s = P().data.slots[S.slot]; if (s) { s.author = null; } } }
  function place() {
    const it = curItem(); if (!it) return;
    const [cx, cy, L] = S.cur, type = it.id, w = why(type, cx, cy, L, S.rot);
    if (w) {
      if (w.startsWith('LOCKED')) { const pk = packOf(type); S.modal = { kind: 'buy', pack: pk }; return; }
      sfx('ui_err'); note(w); return;
    }
    if (type.startsWith('@')) { S.track.deco.push({ kind: type, cx, cy }); S.track.version++; if (!S.puzzle) P().spend(costOf(type)); S.undo.push({ op: 'deco', kind: type, cx, cy }); }
    else { const b = S.track.place(type, cx, cy, L, S.rot); if (!S.puzzle) P().spend(costOf(type)); S.undo.push({ op: 'place', b: { ...b } }); S.drop = { id: b.id, t: 0 }; }
    S.redo = []; if (S.undo.length > 200) S.undo.shift();
    sfx('place'); edited(); rebuild(); advance(type);
    if (type === 'ST' && !S.puzzle) { const k = items().findIndex(i => i.id === 'S'); if (k >= 0) S.item = k; }   // next: a straight
  }
  function advance(type) {   // move the cursor to where the next block would go
    const b = S.track.blocks[S.track.blocks.length - 1]; if (!b || type.startsWith('@')) return;
    const o = S.track.outOf({ b, rev: false, rot: b.rot }); if (o) { S.cur = [clamp(o.cx, 0, GRID - 1), clamp(o.cy, 0, GRID - 1), clamp(o.L, 0, LEVELS - 1)]; S.rot = o.h; }
    else if (type === 'KI') { const H = HEAD[b.rot]; S.cur = [clamp(b.cx + H[0] * 3, 0, GRID - 1), clamp(b.cy + H[1] * 3, 0, GRID - 1), b.L]; }
  }
  function removeAt() {
    const [cx, cy, L] = S.cur; const b = S.track.at(cx, cy, L) || S.track.at(cx, cy, Math.max(0, L - 1));
    const di = S.track.deco.findIndex(d => d.cx === cx && d.cy === cy);
    if (b) {
      if (b.fixed) { sfx('ui_err'); note('THAT PIECE IS FIXED'); return; }
      S.track.remove(b.id); if (!S.puzzle) P().earn(BLOCKS[b.type].cost); S.undo.push({ op: 'remove', b: { ...b } });
    } else if (di >= 0) { const d = S.track.deco.splice(di, 1)[0]; S.track.version++; if (!S.puzzle) P().earn(costOf(d.kind)); S.undo.push({ op: 'undeco', kind: d.kind, cx, cy }); }
    else return;
    S.redo = []; sfx('remove'); edited(); rebuild();
  }
  function apply(op, dir) {   // dir 1: do, -1: undo
    const T = S.track, pay = (n, sign) => { if (S.puzzle) return; if (sign > 0) P().earn(n); else { P().data.coppers -= n; P().save(); } };
    const doPlace = b => { const nb = T.place(b.type, b.cx, b.cy, b.L, b.rot, true); op.b.id = nb.id; pay(BLOCKS[b.type].cost, -1); };
    const doRemove = b => { const ex = T.blocks.find(x => x.type === b.type && x.cx === b.cx && x.cy === b.cy && x.L === b.L && x.rot === b.rot); if (ex) { T.remove(ex.id); pay(BLOCKS[b.type].cost, 1); } };
    if (op.op === 'place') dir > 0 ? doPlace(op.b) : doRemove(op.b);
    else if (op.op === 'remove') dir > 0 ? doRemove(op.b) : doPlace(op.b);
    else if (op.op === 'deco' || op.op === 'undeco') {
      const add = (op.op === 'deco') === (dir > 0);
      if (add) { T.deco.push({ kind: op.kind, cx: op.cx, cy: op.cy }); pay(costOf(op.kind), -1); } else { const i = T.deco.findIndex(d => d.cx === op.cx && d.cy === op.cy); if (i >= 0) { T.deco.splice(i, 1); pay(costOf(op.kind), 1); } }
      T.version++;
    } else if (op.op === 'rename') T.name = dir > 0 ? op.to : op.from;
    edited(); rebuild();
  }
  function undo() { const op = S.undo.pop(); if (!op) return; apply(op, -1); S.redo.push(op); sfx('rotate'); }
  function redo() { const op = S.redo.pop(); if (!op) return; apply(op, 1); S.undo.push(op); sfx('rotate'); }
  // ---- driving it ----
  function testDrive(validate) {
    if (!S.route.ok) { sfx('ui_err'); note(S.route.error || 'NO ROUTE', 2); return; }
    const car = ENV_INFO[S.track.env].car, paint = app.modes.paint(car), track = S.track.clone();
    if (S.puzzle && validate) return app.modes.puzzleValidate(S.puzzle.id, track, () => game.go('editor', { resume: true }));
    game.go('race', {
      mode: validate ? 'validate' : 'test', track, prepared: S.P, subtitle: validate ? 'VALIDATE: DRIVE IT START TO FINISH' : 'TEST DRIVE', intro: validate, countdown: validate ? 3 : 1,
      players: [{ name: P().data.name, carId: car, paint }], quitLabel: 'Back to the editor', onQuit: () => game.go('editor', { resume: true }),
      onDone: R => {
        const steps = R.players[0].run.finishSteps;
        if (validate) { S.validated = steps; save(true); note('VALIDATED ' + fmt(steps), 2.5); game.audio.sfx('coin'); }
        game.go('editor', { resume: true });
      }
    });
  }
  function save(quiet) {
    if (S.puzzle) return;
    const slots = P().data.slots; if (S.slot === null) { S.slot = slots.findIndex(s => !s); if (S.slot < 0) S.slot = 0; }
    slots[S.slot] = { name: S.track.name, env: S.track.env, code: shareCode(S.track), author: S.validated };
    P().save(); if (!quiet) note('SAVED TO SLOT ' + (S.slot + 1));
  }
  function editorMenu() {
    if (!S) return [];
    const M = [];
    if (S.puzzle) { M.push(['Validate', () => testDrive(true)], ['Test drive', () => testDrive(false)], ['Clear my pieces', () => { S.modal = { kind: 'clear' }; }], ['Exit puzzle', () => app.modes.toMenu('puzzles', { env: S.puzzle.env })]); return M; }
    M.push(['Validate', () => testDrive(true)], ['Test drive', () => testDrive(false)], ['Save', () => save()], ['Save as next slot', () => { const slots = P().data.slots; let k = slots.findIndex((s, i) => !s && i !== S.slot); if (k < 0) k = (S.slot + 1) % slots.length; S.slot = k; save(); }],
      ['Rename', () => { S.modal = { kind: 'rename', wheel: new LetterWheel(game, S.track.name, 16) }; }], ['Share code', () => { S.modal = { kind: 'share', code: shareCode(S.track) }; if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(S.modal.code).then(() => { S.modal.copied = true; }).catch(() => {}); }],
      ['Import code', () => { S.modal = { kind: 'import', text: '' }; }], ['Clear track', () => { S.modal = { kind: 'clear' }; }]);
    if (!S.track.blocks.length) M.push(['Environment: ' + ENV_INFO[S.track.env].name, () => { const order = ['dustbowl', 'hedgerow', 'frostpeak'].filter(e => P().envOpen(e)); S.track.env = order[(order.indexOf(S.track.env) + 1) % order.length]; S.track.version++; rebuild(); }]);
    M.push(['Exit editor', () => { if (S.track.blocks.length) save(true); app.modes.toMenu('build'); }]);
    return M;
  }
  // ---- each step ----
  function update(dt) {
    if (!S) return; S.t += dt;
    if (app.devOpen) { app.dev.update(dt); return; }
    const I = game.input;
    camera(dt);
    if (app.dialog.update(dt)) return;
    if (S.modal) { modal(dt); app.typed.length = 0; return; }
    // camera: right stick, middle or alt drag; the wheel zooms (with ctrl), rotates (alone) or changes level (shift)
    if (I.padAim) { S.yaw += I.padAim[0] * 2 * dt; S.pitch = clamp(S.pitch + I.padAim[1] * 1.2 * dt, .45, 1.4); }
    const pan = I.pan && I.pan(); if (pan) { S.yaw += pan[0] * .01; S.pitch = clamp(S.pitch + pan[1] * .006, .45, 1.4); }
    if (app.wheel) { const shift = I.held && (I.held.has('ShiftLeft') || I.held.has('ShiftRight')), ctrl = I.held && (I.held.has('ControlLeft') || I.held.has('ControlRight')); if (ctrl) S.dist = clamp(S.dist * (1 + app.wheel * .1), 60, 400); else if (shift) S.cur[2] = clamp(S.cur[2] - app.wheel, 0, LEVELS - 1); else { S.rot = (S.rot + (app.wheel > 0 ? 1 : 3)) % 4; sfx('rotate'); } app.wheel = 0; }
    // cursor: camera-relative steps
    const fx = Math.cos(S.yaw + Math.PI), fy = Math.sin(S.yaw + Math.PI);
    const step = (dx, dy) => { const ax = Math.abs(dx) > Math.abs(dy); S.cur[0] = clamp(S.cur[0] + (ax ? Math.sign(dx) : 0), 0, GRID - 1); S.cur[1] = clamp(S.cur[1] + (ax ? 0 : Math.sign(dy)), 0, GRID - 1); sfx('ui_move'); };
    // forward on screen = away from the camera: the camera stands at yaw from the target
    const F = [-Math.cos(S.yaw), -Math.sin(S.yaw)], R = [-F[1], F[0]];
    if (I.repeat('up', .25, .09)) step(F[0], F[1]); if (I.repeat('down', .25, .09)) step(-F[0], -F[1]);
    if (I.repeat('left', .25, .09)) step(-R[0], -R[1]); if (I.repeat('right', .25, .09)) step(R[0], R[1]);
    // the mouse picks the cell under it on the cursor's level
    const mc = app.mouseClient; if (mc && S.view && mc.moved) { mc.moved = false; const q = S.view.world.screenToFloor(mc.x, mc.y, S.cur[2] * LEVEL * U); if (q) { const [cx, cy] = worldToCell(q[0] / U, q[1] / U); if (cx >= 0 && cy >= 0 && cx < GRID && cy < GRID) { S.cur[0] = cx; S.cur[1] = cy; } } }
    // the palette: d-pad, [ ] and tab, digits, a click on a tile
    const L = items();
    if (I.pressed('palPrev')) { S.item = (S.item - 1 + L.length) % L.length; sfx('ui_move'); }
    if (I.pressed('palNext')) { S.item = (S.item + 1) % L.length; sfx('ui_move'); }
    if (I.pressed('catNext')) { S.cat = (S.cat + 1) % cats().length; S.item = 0; sfx('ui_move'); }
    if (I.pressed('catPrev')) { S.cat = (S.cat - 1 + cats().length) % cats().length; S.item = 0; sfx('ui_move'); }
    DIGITS.forEach((d, k) => { if (I.held && I.held.has(d) && !S['d' + k]) { if (k < L.length) S.item = k; } S['d' + k] = I.held && I.held.has(d); });
    const c = I.clicked();
    if (c && S.tiles) { const tt = S.tiles.find(t => c[0] >= t.x && c[0] < t.x + t.w && c[1] >= t.y && c[1] < t.y + t.h); if (tt) { if (tt.cat !== undefined) { S.cat = tt.cat; S.item = 0; } else S.item = tt.i; I.suppress && I.suppress('place'); sfx('ui_move'); return; } }
    if (I.pressed('rotate')) { S.rot = (S.rot + 1) % 4; sfx('rotate'); }
    if (I.pressed('rotateBack')) { S.rot = (S.rot + 3) % 4; sfx('rotate'); }
    if (I.pressed('levelUp')) { S.cur[2] = Math.min(LEVELS - 1, S.cur[2] + 1); sfx('level'); }
    if (I.pressed('levelDown')) { S.cur[2] = Math.max(0, S.cur[2] - 1); sfx('level'); }
    if (I.pressed('undo')) undo(); if (I.pressed('redo')) redo();
    if (I.pressed('place')) place();
    if (I.pressed('remove')) removeAt();
    if (I.pressed('test')) testDrive(false);
    if (S.drop) { S.drop.t += dt; if (S.drop.t > .4) S.drop = null; }
    app.typed.length = 0;
  }
  function camera(dt) {   // the camera follows the cursor
    const [ccx, ccy] = cellCenter(S.cur[0], S.cur[1]), tz = S.cur[2] * LEVEL;
    S.focus = S.focus ? S.focus.map((v, k) => v + ([ccx, ccy, tz][k] - v) * Math.min(1, 8 * dt)) : [ccx, ccy, tz];
    const cp = Math.cos(S.pitch), pos = [S.focus[0] + Math.cos(S.yaw) * cp * S.dist, S.focus[1] + Math.sin(S.yaw) * cp * S.dist, S.focus[2] + Math.sin(S.pitch) * S.dist];
    S.cam.set(pos, S.focus, 55);
    if (S.view) { const w = S.view.world; w.camera.set('fixed'); w.camera.fixed = S.cam.pose(); w.camera.target = { x: S.focus[0] * U, y: S.focus[1] * U, z: S.focus[2] * U }; w.step(dt); }
  }
  function modal(dt) {
    const I = game.input, M = S.modal;
    if (M.kind === 'rename') { M.wheel.update(); if (M.wheel.done) { if (!M.wheel.cancel) { S.undo.push({ op: 'rename', from: S.track.name, to: M.wheel.value }); S.track.name = M.wheel.value; } S.modal = null; } }
    else if (M.kind === 'share' || M.kind === 'export') { if (I.pressed('confirm') || I.pressed('cancel') || I.clicked()) S.modal = null; }
    else if (M.kind === 'import') {
      for (const ch of app.typed) { if (ch === '\b') M.text = M.text.slice(0, -1); else if (ch.length === 1) M.text += ch; }
      if (app.pasted) { M.text = app.pasted.trim(); app.pasted = null; }
      if (I.pressed('confirm') && !(I.held && I.held.has('Space'))) { const t = fromShareCode(M.text); if (t) { if (!P().envOpen(t.env)) { note('OPEN ' + ENV_INFO[t.env].name + ' FIRST'); } else { S.track = t; S.validated = null; S.undo = []; S.redo = []; rebuild(); note('TRACK IMPORTED: ' + t.name, 2); S.modal = null; } } else { sfx('ui_err'); note('THAT CODE DOES NOT WORK'); } }
      if (I.pressed('cancel')) S.modal = null;
    } else if (M.kind === 'clear') {
      if (I.pressed('confirm')) { for (const b of S.track.blocks.slice()) if (!b.fixed) { S.track.remove(b.id); if (!S.puzzle) P().earn(BLOCKS[b.type].cost); } for (const d of S.track.deco) if (!S.puzzle) P().earn(costOf(d.kind)); S.track.deco = []; S.undo = []; S.redo = []; edited(); rebuild(); S.modal = null; sfx('remove'); }
      if (I.pressed('cancel')) S.modal = null;
    } else if (M.kind === 'buy') {
      const pk = PACKS[M.pack];
      if (I.pressed('confirm')) { if (P().buyPack(M.pack, pk.price)) { sfx('coin'); game.audio.sting && note(pk.name + ' PACK UNLOCKED', 2); } else { sfx('ui_err'); note('NOT ENOUGH COPPERS'); } S.modal = null; }
      if (I.pressed('cancel')) S.modal = null;
    }
  }
  // ---- the picture ----
  function draw(r) {
    if (!S || !S.view) return;
    const v = S.view, pen = v.world.pen, T = S.track, [cx, cy, L] = S.cur, z0 = L * LEVEL;
    v.drawTrack(game.real || S.t, { startGate: S.P.course.startGate, lights: 0 });
    // the grid at the cursor's level: bars round the cells near it
    pen.at(0, 0, 0, 0, U);
    for (let k = -6; k <= 7; k++) {
      const x = ORIGIN + (cx + k) * CELL, y = ORIGIN + (cy + k) * CELL, ya = ORIGIN + (cy - 6) * CELL, yb = ORIGIN + (cy + 7) * CELL, xa = ORIGIN + (cx - 6) * CELL, xb = ORIGIN + (cx + 7) * CELL;
      if (cx + k >= 0 && cx + k <= GRID) pen.bar(x, Math.max(ORIGIN, ya), z0 + .1, x, Math.min(ORIGIN + GRID * CELL, yb), z0 + .1, .25, .05, k === 0 || k === 1 ? '#ffd23a' : '#9ab0d8');
      if (cy + k >= 0 && cy + k <= GRID) pen.bar(Math.max(ORIGIN, xa), y, z0 + .1, Math.min(ORIGIN + GRID * CELL, xb), y, z0 + .1, .25, .05, k === 0 || k === 1 ? '#ffd23a' : '#9ab0d8');
    }
    // puzzle: the zone's border and the no-build cells
    if (S.puzzle) {
      const z = S.puzzle.zone, x0 = ORIGIN + z[0] * CELL, x1 = ORIGIN + (z[1] + 1) * CELL, y0 = ORIGIN + z[2] * CELL, y1 = ORIGIN + (z[3] + 1) * CELL;
      pen.at(0, 0, 0, 0, U); for (const [a, b, c2, d] of [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]) pen.bar(a, b, .3, c2, d, .3, .6, .3, '#5ae07a');
      for (const n of S.puzzle.noBuild || []) { if (n[2] === 'pond') continue; const [qx, qy] = cellCenter(n[0], n[1]); for (let i = 0; i < 4; i++) drawDeco(pen, { kind: n[2] === 'hedge' ? 'bush' : n[2] === 'pine' ? 'pine' : 'rock', x: qx + (i % 2 - .5) * 14, y: qy + (Math.floor(i / 2) - .5) * 14, yaw: i, s: n[2] === 'hedge' ? 2.4 : 1.6, seed: i }, S.t, T.env); }
      for (const b of T.blocks) if (b.fixed) { const [qx, qy] = cellCenter(b.cx, b.cy); pen.at(qx * U, qy * U, (b.L * LEVEL + 9) * U, S.t, U).box(0, 0, 0, 1.2, 1.2, 1.2, '#ffd23a').box(0, 0, -.9, .5, .5, .8, '#ffd23a'); }
    }
    // open ports: red arrows where nothing links
    if (!S.route.ok && S.route.at) { const b = S.route.at, o = T.outOf({ b, rev: false, rot: b.rot }); if (o) { const [qx, qy] = cellCenter(o.cx, o.cy), H = HEAD[o.h]; const bx = qx - H[0] * 16, by = qy - H[1] * 16, bz = o.L * LEVEL + 2 + Math.sin(S.t * 6) * .5; pen.at(0, 0, 0, 0, U).cone(bx - H[0] * 3, by - H[1] * 3, bz, bx + H[0] * 3, by + H[1] * 3, bz, 1.6, '#ff3a2a'); } }
    // the cursor: a pulsing outline and a preview of the block (green fits, red doesn't)
    const it = curItem(), type = it && it.id, w0 = type ? why(type, cx, cy, L, S.rot) : 'X', okc = !w0 ? '#5ae07a' : '#ff4a3a';
    const [ox, oy] = [ORIGIN + cx * CELL, ORIGIN + cy * CELL], pz = z0 + .3 + Math.sin(S.t * 5) * .15;
    pen.at(0, 0, 0, 0, U); for (const [a, b, c2, d] of [[ox, oy, ox + CELL, oy], [ox + CELL, oy, ox + CELL, oy + CELL], [ox + CELL, oy + CELL, ox, oy + CELL], [ox, oy + CELL, ox, oy]]) pen.bar(a, b, pz, c2, d, pz, .8, .4, okc);
    if (type && !type.startsWith('@')) {
      const B = BLOCKS[type]; pen.ghost = true;
      if (B.path) { const n = Math.max(4, Math.ceil(B.path.len / 3)); for (let i = 0; i < n; i++) { const a = toWorld(localFrame(B, B.path.len * i / n), S.rot, cx, cy, L), b = toWorld(localFrame(B, B.path.len * (i + 1) / n), S.rot, cx, cy, L); pen.at(0, 0, 0, 0, U).slab(a.p[0], a.p[1], a.p[2] + .4, b.p[0], b.p[1], b.p[2] + .4, a.r[0], a.r[1], a.r[2], 12, .3, okc); } }
      else for (const [x, y, l] of T.cellsOf(type, cx, cy, L, S.rot)) { const [qx, qy] = cellCenter(x, y); pen.at(qx * U, qy * U, (l * LEVEL + 4) * U, 0, U).box(0, 0, 0, 30, 30, 8, okc); }
      pen.ghost = false;
      const H = HEAD[S.rot], [qx, qy] = cellCenter(cx, cy); pen.at(0, 0, 0, 0, U).cone(qx - H[0] * 10, qy - H[1] * 10, z0 + 3, qx + H[0] * 4, qy + H[1] * 4, z0 + 3, 2.4, '#ffffff');
    } else if (type) { const [qx, qy] = cellCenter(cx, cy); pen.ghost = true; drawDeco(pen, { kind: { '@tree': 'tree', '@rock': 'rock', '@cactus': 'cactus', '@pine': 'pine', '@hay': 'hay', '@cone': 'cones', '@tyres': 'tyres', '@snowman': 'snowman' }[type], x: qx, y: qy, yaw: 0, s: 1.2, seed: 1 }, S.t, T.env); pen.ghost = false; }
    v.world.draw(r);
    r.overlay(g => hud(g, r.W, r.H, w0));
  }
  function hud(g, W, H, w0) {
    const T = S.track;
    // top bar: name, environment, coppers or pieces, status chips
    panel(g, 6, 6, W - 12, 40, { alpha: .8 });
    E.font.text(g, T.name + ' • ' + ENV_INFO[T.env].name + (S.puzzle ? ' • PUZZLE' : ''), 12, 12, '#ffffff', { outline: '#10101a' });
    const chips = [['START', T.blocks.some(b => b.type === 'ST')], ['FINISH', T.blocks.some(b => b.type === 'FN')], ['CP ' + T.blocks.filter(b => b.type === 'CP').length, true], ['ROUTE', S.route.ok], [S.validated ? 'VALIDATED ' + fmt(S.validated) : 'NOT VALIDATED', !!S.validated]];
    let x = 10; for (const [l, ok] of chips) { const w = E.font.width(l, {}) + 16; px.rect(g, x, 25, w, 15, ok ? '#1e5a2e' : '#5a1e1e'); E.font.text(g, (ok ? '+' : 'x') + ' ' + l, x + 4, 29, ok ? '#8af0a0' : '#ff9a8a', {}); x += w + 4; }
    if (!S.puzzle) { coinIcon(g, W - 80, 10); text(g, String(P().coppers), W - 64, 10, '#f0a050'); }
    E.font.text(g, 'CELL ' + S.cur[0] + ',' + S.cur[1] + '  LEVEL ' + S.cur[2] + '  ' + ['EAST', 'SOUTH', 'WEST', 'NORTH'][S.rot], 12, 52, '#c8c8e0', { outline: '#10101a' });
    if (w0 && w0 !== 'X') E.font.text(g, w0, 12, 64, '#ff9a8a', { outline: '#10101a' });
    if (!S.route.ok && T.blocks.length) E.font.text(g, S.route.error, 12, 76, '#ffb060', { outline: '#10101a' });
    // the palette: category tabs and tiles along the bottom
    const C = cats(), L = items(), ty = H - 86; S.tiles = [];
    C.forEach(([name], i) => { const w = Math.floor((W - 12) / C.length), x0 = 6 + i * w; px.rect(g, x0 + 1, ty, w - 2, 14, i === S.cat ? '#ff9a2a' : '#24305a'); E.font.text(g, name, x0 + w / 2, ty + 4, i === S.cat ? '#10101a' : '#c8c8e0', { align: 'center' }); S.tiles.push({ x: x0, y: ty, w, h: 14, cat: i }); });
    const tw0 = 52, per = Math.max(1, Math.floor((W - 12) / (tw0 + 4))), start = Math.max(0, Math.min(S.item - Math.floor(per / 2), L.length - per));
    L.slice(start, start + per).forEach((it, k) => {
      const i = start + k, x0 = 6 + k * (tw0 + 4), y0 = ty + 17, f = i === S.item, id = it.id, B = BLOCKS[id] || DECO[id], locked = !S.puzzle && !P().hasPack(packOf(id));
      panel(g, x0, y0, tw0, 40, { accent: f ? '#ffffff' : '#3a4a7a', bg: f ? ['#34447a', '#1c2648'] : ['#1c2440', '#121830'] });
      blockIcon(g, id, x0 + 4, y0 + 3);
      E.font.text(g, (B.name || id).slice(0, 9), x0 + tw0 / 2, y0 + 24, f ? '#ffffff' : '#c8c8e0', { align: 'center', font: 'tiny' });
      E.font.text(g, S.puzzle ? 'X' + it.left : costOf(id) + 'C', x0 + tw0 / 2, y0 + 31, S.puzzle ? (it.left > 0 ? '#8af0a0' : '#ff9a8a') : '#f0a050', { align: 'center', font: 'tiny' });
      if (locked) lockIcon(g, x0 + tw0 - 14, y0 + 2);
      S.tiles.push({ x: x0, y: y0, w: tw0, h: 40, i });
    });
    promptBar(g, game, [['place', 'PLACE'], ['remove', 'REMOVE'], ['rotate', 'TURN'], ['levelUp', 'LEVEL'], ['palNext', 'PIECE'], ['test', 'TEST'], ['undo', 'UNDO'], ['pause', 'MENU']]);
    // modals
    const M = S.modal;
    if (M) {
      panel(g, W / 2 - 170, H / 2 - 60, 340, 120, { accent: '#ffd23a' });
      if (M.kind === 'rename') { text(g, 'RENAME TRACK', W / 2 - 60, H / 2 - 50, '#ffd23a'); M.wheel.draw(g, W / 2 - 150, H / 2 - 10); }
      if (M.kind === 'share') { text(g, 'SHARE CODE' + (M.copied ? ' (COPIED)' : ''), W / 2 - 80, H / 2 - 52, '#ffd23a'); const lines = E.font.wrap(M.code, 320, { font: 'tiny' }); lines.slice(0, 9).forEach((l, i) => E.font.text(g, l, W / 2 - 160, H / 2 - 32 + i * 7, '#ffffff', { font: 'tiny' })); if (lines.length > 9) E.font.text(g, '... (' + M.code.length + ' CHARACTERS)', W / 2 - 160, H / 2 + 36, COL.dim, {}); }
      if (M.kind === 'export') { text(g, 'CONTENT ENTRY' + (M.copied ? ' (COPIED)' : ''), W / 2 - 90, H / 2 - 52, '#ffd23a'); const lines = E.font.wrap(M.code, 320, { font: 'tiny' }); lines.slice(0, 9).forEach((l, i) => E.font.text(g, l, W / 2 - 160, H / 2 - 32 + i * 7, '#ffffff', { font: 'tiny' })); E.font.text(g, 'PASTE IT INTO SRC/DATA.JS (ALSO IN THE CONSOLE)', W / 2, H / 2 + 36, COL.dim, { align: 'center' }); }
      if (M.kind === 'import') { text(g, 'IMPORT CODE', W / 2 - 60, H / 2 - 52, '#ffd23a'); E.font.text(g, 'PASTE (CTRL+V) OR TYPE A CODE, THEN ENTER', W / 2, H / 2 - 28, COL.dim, { align: 'center' }); const lines = E.font.wrap(M.text + (Math.floor(S.t * 2) % 2 ? '_' : ''), 320, { font: 'tiny' }); lines.slice(-6).forEach((l, i) => E.font.text(g, l, W / 2 - 160, H / 2 - 12 + i * 7, '#ffffff', { font: 'tiny' })); }
      if (M.kind === 'clear') { text(g, S.puzzle ? 'TAKE BACK ALL YOUR PIECES?' : 'CLEAR THE WHOLE TRACK?', W / 2 - 140, H / 2 - 30, '#ffffff'); E.font.text(g, 'COPPERS ARE REFUNDED', W / 2, H / 2, COL.dim, { align: 'center' }); }
      if (M.kind === 'buy') { const pk = PACKS[M.pack]; text(g, 'UNLOCK ' + pk.name + ' PACK?', W / 2 - 150, H / 2 - 40, '#ffffff'); coinIcon(g, W / 2 - 40, H / 2 - 6); text(g, pk.price + ' COPPERS', W / 2 - 24, H / 2 - 6, '#f0a050'); E.font.text(g, 'YOU HAVE ' + P().coppers, W / 2, H / 2 + 20, COL.dim, { align: 'center' }); }
      if (M.kind !== 'rename') promptBar(g, game, [['confirm', M.kind === 'share' || M.kind === 'export' ? 'OK' : M.kind === 'buy' ? 'BUY' : M.kind === 'clear' ? 'CLEAR' : 'IMPORT'], ['cancel', 'CANCEL']], { y: H / 2 + 40, noBg: true });
    }
    app.dialog.draw(g, W, H);
    if (app.devOpen) app.dev.draw(g, W, H);
  }
  // a top-down icon of a block (its centreline drawn into a 44 x 20 box)
  function blockIcon(g, id, x, y) {
    px.rect(g, x, y, 44, 20, '#0e1426');
    if (id.startsWith('@')) { px.disc(g, x + 22, y + 10, 6, { '@tree': '#3a8a2a', '@rock': '#8a8a80', '@cactus': '#3a8a3a', '@pine': '#2a6a4a', '@hay': '#e0c060', '@cone': '#ff7a1a', '@tyres': '#1e1e22', '@snowman': '#f8fcff' }[id] || '#ffffff'); return; }
    const B = BLOCKS[id]; if (!B.path) return;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9; const pts = [];
    for (let i = 0; i <= 16; i++) { const p = B.path.p(B.path.len * i / 16); pts.push(p); minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1] - p[2] * .4); maxy = Math.max(maxy, p[1] - p[2] * .4); }
    const k = Math.min(38 / Math.max(1, maxx - minx), 16 / Math.max(1, maxy - miny)), col = B.surface === 'dirt' ? '#c88a50' : B.surface === 'ice' ? '#a8e0ff' : id === 'BO' ? '#ff8a1a' : '#d8d8e0';
    for (let i = 0; i < 16; i++) { const a = pts[i], b = pts[i + 1]; px.line(g, Math.round(x + 3 + (a[0] - minx) * k), Math.round(y + 2 + (a[1] - a[2] * .4 - miny) * k), Math.round(x + 3 + (b[0] - minx) * k), Math.round(y + 2 + (b[1] - b[2] * .4 - miny) * k), col, 2); }
    if (B.gate !== null) px.rect(g, x + 20, y + 2, 2, 16, id === 'CP' ? '#5ab0ff' : id === 'ST' ? '#5ae07a' : '#ff5a4a');
  }
  return { pausable: true, input: EDIT_INPUT, touch: [], camera: false, enter, update, draw, exit() {}, get state() { return S; },
    api: { place: (type, cx, cy, L, rot) => { S.cur = [cx, cy, L]; S.rot = rot; const L2 = items(); const k = L2.findIndex(i => i.id === type); if (k < 0) { for (let c = 0; c < cats().length; c++) { S.cat = c; const k2 = items().findIndex(i => i.id === type); if (k2 >= 0) { S.item = k2; break; } } } else S.item = k; place(); }, remove: (cx, cy, L) => { S.cur = [cx, cy, L]; removeAt(); }, undo, redo, save, testDrive, rebuild } };
}
