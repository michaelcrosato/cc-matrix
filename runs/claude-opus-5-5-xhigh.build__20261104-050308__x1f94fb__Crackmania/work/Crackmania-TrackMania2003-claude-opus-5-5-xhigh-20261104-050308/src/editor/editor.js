// CRACKMANIA track editor (PLAN §5.4) and puzzles (§5.3): an orbit camera round a cursor on the 32 x 32 x 16 grid, a
// palette carousel (ROADS TURNS HILLS STUNTS SURFACES SCENERY) of blocks bought with coppers, a ghost preview (green
// fits, red doesn't), red arrows on open ends, undo / redo (200 steps, coppers refunded and charged), test drive and
// validate (driving it start to finish sets the author time), 6 save slots, share codes, export as content
import { ctx, E, U } from '../ctx.js';
import { EDIT_INPUT } from '../input.js';
import { TYPES, CATS, PACKS, CELL, LEVEL, GRID, LEVELS, GX, GY, HEAD, frameAt, endsOf, cellWorld, xform, toWorld } from '../track/blocks.js';
import { Track } from '../track/track.js';
import { LIFT, SECTION } from '../track/geometry.js';
import { ENVS, ENV_IDS } from '../env/envs.js';
import { poseOf } from '../car/camera.js';
import { panel, T1, T2, title, UI, toast, drawToasts, LetterWheel, accent } from '../ui/kit.js';
import { promptRow, promptBar } from '../ui/glyphs.js';
import { coin, lock, medal } from '../ui/icons.js';
import { fmt } from '../race/run.js';
import { thresholds, medalFor } from '../race/medals.js';
import { startRace } from '../scenes/race.js';
import { puzzleDef, puzzleTrack, PuzzleRules } from '../modes/puzzle.js';
import { add, sub, mul, norm } from '../lib/v3.js';
const F = () => E.font;
const SURF_COL = { road: '#8a8a96', dirt: '#a07848', ice: '#9ad8ff', boost: '#ffb030' };
export const ed = { track: null, env: 'dustbowl', slot: 0, cur: { cx: 4, cy: 8, L: 0 }, rot: 0, cat: 0, item: 0, yaw: -Math.PI / 2 - .7, pitch: .75, dist: 150, sm: null, undo: [], redo: [], author: null, puzzle: null, rules: null, modal: null, t: 0, name: 'NEW TRACK', dirty: false, wheel: { rot: 0, lvl: 0, zoom: 0 }, mouseCell: null, testing: false, course: null, ops: 0 };
const P = () => ctx.profile;
/* ---- palette ---- */
export function paletteTypes(cat) {
  const env = ed.env;
  if (ed.rules) return ed.rules.types().filter(id => (TYPES[id].cat === CATS[cat]) || (cat === 0 && !CATS.slice(1).includes(TYPES[id].cat)));
  return Object.values(TYPES).filter(T => T.cat === CATS[cat] && T.editor !== false && !T.gap && (!T.envs || T.envs.includes(env)) && !(T.start && false)).map(T => T.id);
}
const cats = () => CATS.map((c, i) => i).filter(i => paletteTypes(i).length);
const selType = () => { const L = paletteTypes(ed.cat); return L[Math.min(ed.item, L.length - 1)] || null; };
const owned = id => ed.rules || !!P().p.packs[TYPES[id].pack] || P().p.allUnlocked;
/* ---- the track ---- */
function loadTrack(track) {
  ed.track = track; ed.env = track.env;
  ed.course = ctx.worlds.load(track, { sparse: true });
  ed.track.version++;
}
function rebuildBlock(b, add) {
  if (!ed.course || !ed.course.ph.pw || ctx.worlds.course !== ed.course) ed.course = ctx.worlds.load(ed.track, { sparse: true });
  const c = ed.course, W = ctx.worlds.cur;
  if (add) { const g = c.addBlock(b); W.view.addBlock(b, g); } else { c.removeBlock(b.id); W.view.removeBlock(b.id); }
  c.refresh(); ed.author = null; ed.dirty = true; ed.decoDue = .6;
}
/** place the selected block at the cursor; returns null or why not */
export function placeAt(type = selType(), cur = ed.cur, rot = ed.rot, o = {}) {
  if (!type) return 'nothing selected';
  const T = TYPES[type], tr = ed.track, pl = { type, cx: cur.cx, cy: cur.cy, L: cur.L, rot };
  const why = tr.check(pl); if (why) return why;
  if (ed.rules) { const r2 = ed.rules.allow(pl); if (r2) return r2; }
  else {
    if (!owned(type)) return 'pack';
    if (P().coppers < T.cost) return 'coppers';
  }
  const b = tr.place(pl); if (typeof b === 'string') return b;
  if (!ed.rules && T.cost) { P().p.coppers -= T.cost; }
  rebuildBlock(b, true);
  if (!o.noUndo) { ed.undo.push({ op: 'place', b: Object.assign({}, b), cost: ed.rules ? 0 : T.cost }); if (ed.undo.length > 200) ed.undo.shift(); ed.redo.length = 0; }
  ed.ops++;
  return null;
}
/** remove the block under the cursor (not a fixed one) */
export function removeAt(cur = ed.cur, o = {}) {
  const b = ed.track.at(cur.cx, cur.cy, cur.L) || ed.track.at(cur.cx, cur.cy, cur.L - 1); if (!b) return 'empty';
  if (b.fixed) return 'fixed';
  ed.track.remove(b.id); rebuildBlock(b, false);
  const T = TYPES[b.type], cost = ed.rules ? 0 : T.cost; if (cost) P().p.coppers += cost;
  if (!o.noUndo) { ed.undo.push({ op: 'remove', b: Object.assign({}, b), cost }); if (ed.undo.length > 200) ed.undo.shift(); ed.redo.length = 0; }
  ed.ops++;
  return null;
}
export function undo() { const u = ed.undo.pop(); if (!u) return false; apply(u, true); ed.redo.push(u); ctx.sound.sfx('remove'); return true; }
export function redo() { const u = ed.redo.pop(); if (!u) return false; apply(u, false); ed.undo.push(u); ctx.sound.sfx('place'); return true; }
function apply(u, inverse) {
  const tr = ed.track, placing = (u.op === 'place') !== inverse;
  if (u.op === 'rename') { ed.name = inverse ? u.from : u.to; tr.name = ed.name; return; }
  if (placing) { const b = tr.place(Object.assign({}, u.b), { force: true }); P().p.coppers -= u.cost; rebuildBlock(b, true); }
  else { const b = tr.byId(u.b.id); if (b) { tr.remove(b.id); rebuildBlock(b, false); P().p.coppers += u.cost; } }
}
/* ---- save slots and codes ---- */
export function saveSlot(i = ed.slot) {
  ed.track.name = ed.name;
  P().p.slots[i] = { name: ed.name, env: ed.env, track: ed.track.toJSON(), author: ed.author, saved: Date.now() };
  ed.slot = i; ed.dirty = false; P().save(); return true;
}
export function openSlot(i) {
  const s = P().p.slots[i]; if (!s) return false;
  const t = Track.fromJSON(s.track); t.id = 'slot' + i; t.name = s.name; ed.name = s.name; ed.slot = i; ed.author = s.author || null; ed.undo = []; ed.redo = [];
  loadTrack(t); ed.author = s.author || null; ed.dirty = false; centreCursor(); return true;
}
function newTrack(env, slot) { const t = new Track({ id: 'slot' + slot, name: 'NEW TRACK', env }); ed.name = 'NEW TRACK'; ed.slot = slot; ed.author = null; ed.undo = []; ed.redo = []; loadTrack(t); ed.cur = { cx: 6, cy: 10, L: 0 }; ed.dirty = false; }
function centreCursor() { const s = ed.track.start || ed.track.blocks[0]; if (s) ed.cur = { cx: s.cx, cy: s.cy, L: s.L }; }
export function shareCode() { ed.track.name = ed.name; return ed.track.shareCode(); }
export function importCode(code) { const t = Track.fromCode(code); t.id = 'slot' + ed.slot; ed.name = t.name; ed.undo = []; ed.redo = []; ed.author = null; ed.env = t.env; loadTrack(t); centreCursor(); return t; }
/** Dev Mode: a data/tracks.js entry for this track (placements and metadata) */
export function exportContent() {
  const j = ed.track.toJSON();
  return "  { id: 'C" + (ed.slot + 1) + "', env: '" + j.env + "', name: '" + ed.name.replace(/'/g, '') + "', blocks: " + JSON.stringify(j.blocks) + ", chasms: " + JSON.stringify(j.chasms) + ', author: ' + (ed.author || 'null') + ' },';
}
/* ---- test drive and validate ---- */
export function testDrive(validate = true) {
  const tr = ed.track, R = tr.route();
  if (!tr.start) { toast('PLACE A START FIRST', '#ff9a6a'); ctx.sound.sfx('error'); return false; }
  if (!tr.finishes.length) { toast('PLACE A FINISH FIRST', '#ff9a6a'); ctx.sound.sfx('error'); return false; }
  ctx.worlds.load(tr, { keep: null });   // (with its scenery for the drive)
  const model = ENVS[ed.env].car, saved = { cur: Object.assign({}, ed.cur), yaw: ed.yaw, pitch: ed.pitch, dist: ed.dist };
  const pid = ed.puzzle && ed.puzzle.id, T = pid ? ctx.medals[pid] : ed.author ? thresholds(ed.author) : null;
  ed.testing = true;
  startRace({ kind: pid ? 'puzzle' : 'validate', track: tr, intro: false, countdown: 1.5, label: pid ? 'VALIDATE YOUR ROUTE' : 'TEST DRIVE',
    players: [{ input: ctx.game.input, name: P().p.name, model, paint: P().paint(model) }],
    targets: T ? (Pl => ({ medal: pid ? Math.min(4, P().medal(pid) + 1) : 4, steps: T.author })) : null,
    onFinish(s, Pl) {
      const steps = Pl.results.steps;
      s.after = () => {
        if (pid) {
          const m = medalFor(steps, T), res = P().finish(pid, 'puzzle', steps, m, Pl.results.ghost, Pl.results.splits, ed.env);
          ctx.game.go('results', { kind: 'puzzle', id: pid, track: tr, result: Object.assign({ steps, medal: m, T, ghost: Pl.results.ghost, respawns: Pl.results.respawns }, res), before: null, retry: () => testDrive(), next: null, custom: false });
        } else {
          ed.author = steps; const tt = thresholds(steps);
          if (P().p.slots[ed.slot]) { P().p.slots[ed.slot].author = steps; P().save(); }
          ctx.game.go('results', { kind: 'validate', id: tr.id, track: tr, custom: true, result: { steps, medal: 4, T: tt, ghost: Pl.results.ghost, respawns: Pl.results.respawns, better: true, newMedal: false, wasMedal: 4, coppers: 0, prevBest: null }, retry: () => testDrive(), next: null });
        }
        ed.back = saved;
      };
    },
    quitTo: () => backToEditor(saved)
  });
  return true;
}
export function backToEditor(saved = ed.back) { ed.testing = false; ctx.game.go('editor', { resume: true, saved }); }
/* ---- the scene ---- */
export const editorScene = {
  input: EDIT_INPUT, pausable: true, touch: [], camera: { zoom: false },
  enter(d = {}) {
    ctx.music.play('blueprint'); ctx.game.splitScreen(0);
    if (d.resume || d.saved) { const sv = d.saved || ed.back; ed.course = ctx.worlds.load(ed.track, { sparse: true }); if (sv) Object.assign(ed, { cur: sv.cur, yaw: sv.yaw, pitch: sv.pitch, dist: sv.dist }); }
    else if (d.puzzle) {
      const p = puzzleDef(d.puzzle); ed.puzzle = p; const t = puzzleTrack(p, false); ed.rules = new PuzzleRules(p, t); ed.name = p.name.toUpperCase(); ed.undo = []; ed.redo = []; ed.author = null;
      loadTrack(t); centreCursor(); ed.cat = cats()[0] || 0; ed.item = 0;
      if (!ctx.profile.seen('puzzleTip')) ctx.talk.beat('puzzleTip');
    } else {
      ed.puzzle = null; ed.rules = null;
      if (d.fresh || !P().p.slots[d.slot ?? 0]) newTrack(d.env || 'dustbowl', d.slot ?? 0); else openSlot(d.slot ?? 0);
      ctx.talk.beat('editor');
    }
    ed.sm = null; ed.modal = null; ed.t = 0; ctx.session = null; ctx.game.input.consumeAll();
  },
  exit() {},
  pauseItems() {
    if (ed.puzzle) return [['Validate (drive it)', () => testDrive()], ['Clear my pieces', () => { for (const b of ed.track.blocks.slice()) if (!b.fixed) { ed.track.remove(b.id); rebuildBlock(b, false); } ed.undo = []; }], ['Exit to puzzles', () => ctx.game.go('menu', { page: 'puzzles' })]];
    return [['Validate', () => testDrive(true)], ['Test drive', () => testDrive(false)], ['Save', () => { saveSlot(); toast('SAVED TO SLOT ' + (ed.slot + 1)); }], ['Save as...', () => { ed.modal = { kind: 'slots', save: true, i: ed.slot }; }],
      ['Load...', () => { ed.modal = { kind: 'slots', save: false, i: ed.slot }; }], ['Rename', () => { ed.modal = { kind: 'name', wheel: new LetterWheel(ed.name, 14) }; }],
      ed.track.blocks.length === 0 && ['Environment: ' + ENVS[ed.env].name, () => { const i = (ENV_IDS.indexOf(ed.env) + 1) % 3; newTrack(ENV_IDS[i], ed.slot); }],
      ['Share code', () => { ed.modal = { kind: 'share', code: shareCode() }; }], ['Import code', () => { ed.modal = { kind: 'import', text: '' }; }],
      ['Clear track', () => { ed.modal = { kind: 'confirm', text: 'CLEAR THE WHOLE TRACK?', yes: () => { for (const b of ed.track.blocks.slice()) removeAt({ cx: b.cx, cy: b.cy, L: b.L }, { noUndo: true }); ed.undo = []; ed.redo = []; } }; }],
      ['Exit', () => { if (ed.dirty) saveSlot(); ctx.game.go('menu', { page: 'build' }); }]].filter(Boolean);
  },
  update(dt) {
    const I = ctx.game.input; ed.t += dt;
    if (ctx.dev.open && ctx.dev.update(dt)) return;
    if (ctx.talk.update(dt)) return;
    ctx.worlds.step(dt);
    if (ed.decoDue > 0 && (ed.decoDue -= dt) <= 0) { /* the scenery waits for the drive */ }
    if (ed.modal) return modalUpdate(dt, I);
    if (ctx.attract) ctx.attract.poke();
    // the camera: right stick / J L I K / a middle or right drag orbits, - = zoom
    const aim = I.padAim; if (aim) { ed.yaw += aim[0] * 2 * dt; ed.pitch = Math.max(.44, Math.min(1.4, ed.pitch - aim[1] * 1.5 * dt)); }
    const pan = I.pan && I.pan(); if (pan) { ed.yaw += pan[0] * .01; ed.pitch = Math.max(.44, Math.min(1.4, ed.pitch + pan[1] * .01)); }
    for (const [k, dy, dp] of [['KeyJ', -1, 0], ['KeyL', 1, 0], ['KeyI', 0, 1], ['KeyK', 0, -1]]) if (I.held.has(k)) { ed.yaw += dy * 1.6 * dt; ed.pitch = Math.max(.44, Math.min(1.4, ed.pitch + dp * 1.2 * dt)); }
    if (I.held.has('Minus')) ed.dist = Math.min(400, ed.dist * (1 + dt)); if (I.held.has('Equal')) ed.dist = Math.max(60, ed.dist * (1 - dt));
    // the mouse wheel: rotate; shift: level; ctrl: zoom
    const W = ed.wheel; if (W.rot) { ed.rot = (ed.rot + (W.rot > 0 ? 1 : 3)) & 3; ctx.sound.sfx('rotate'); } if (W.lvl) level(W.lvl > 0 ? 1 : -1); if (W.zoom) ed.dist = Math.max(60, Math.min(400, ed.dist * (W.zoom > 0 ? 1.12 : .89))); W.rot = W.lvl = W.zoom = 0;
    // the cursor: camera-relative steps, repeating; the mouse picks the cell under the pointer
    const fwd = [-Math.cos(ed.yaw), -Math.sin(ed.yaw)], ax = Math.abs(fwd[0]) > Math.abs(fwd[1]) ? [Math.sign(fwd[0]), 0] : [0, Math.sign(fwd[1])], rt = [-ax[1], ax[0]];
    const mv = (a, d) => { if (I.repeat(a, .22, .07)) { ed.cur.cx = Math.max(0, Math.min(GRID - 1, ed.cur.cx + d[0])); ed.cur.cy = Math.max(0, Math.min(GRID - 1, ed.cur.cy + d[1])); ctx.sound.sfx('tick'); } };
    mv('up', ax); mv('down', [-ax[0], -ax[1]]); mv('right', [-rt[0], -rt[1]]); mv('left', rt);
    const sm = I.padMove; if (sm && Math.hypot(sm[0], sm[1]) > .5) { ed.stickT = (ed.stickT || 0) - dt; if (ed.stickT <= 0) { ed.stickT = .14; const dx = Math.abs(sm[0]) > Math.abs(sm[1]) ? Math.sign(sm[0]) : 0, dy = dx ? 0 : Math.sign(sm[1]); const d = dy ? (dy < 0 ? ax : [-ax[0], -ax[1]]) : (dx > 0 ? [-rt[0], -rt[1]] : rt); ed.cur.cx = Math.max(0, Math.min(GRID - 1, ed.cur.cx + d[0])); ed.cur.cy = Math.max(0, Math.min(GRID - 1, ed.cur.cy + d[1])); } } else ed.stickT = 0;
    if (I.lastDevice === 'mouse' && ed.mouseCell && !paletteHit(I)) { ed.cur.cx = ed.mouseCell[0]; ed.cur.cy = ed.mouseCell[1]; }
    // the palette: d-pad left/right, up/down categories; 1-9; Tab; a click on a tile
    if (I.pressed('palR')) cycleItem(1); if (I.pressed('palL')) cycleItem(-1);
    if (I.pressed('catU')) cycleCat(I.held.has('ShiftLeft') ? -1 : 1); if (I.pressed('catD')) cycleCat(-1);
    for (let k = 1; k <= 9; k++) if (I.held.has('Digit' + k) && !ed['_d' + k]) { ed['_d' + k] = true; const L = paletteTypes(ed.cat); if (L[k - 1]) { ed.item = k - 1; ctx.sound.sfx('move'); } } else if (!I.held.has('Digit' + k)) ed['_d' + k] = false;
    const ck = I.clicked && I.clicked(), ph = ck && paletteHit(I, ck);
    if (ph) { if (ph.cat !== undefined) { ed.cat = ph.cat; ed.item = 0; } else ed.item = ph.item; ctx.sound.sfx('move'); I.consumeAll(); return; }
    if (I.pressed('rotR')) { ed.rot = (ed.rot + (I.held.has('ShiftLeft') ? 3 : 1)) & 3; ctx.sound.sfx('rotate'); }
    if (I.pressed('rotL')) { ed.rot = (ed.rot + 3) & 3; ctx.sound.sfx('rotate'); }
    if (I.pressed('levelUp')) level(1); if (I.pressed('levelDown')) level(-1);
    if (I.pressed('undo')) undo(); if (I.pressed('redo')) redo();
    if (I.pressed('test')) { testDrive(true); return; }
    if (I.pressed('place')) tryPlace();
    if (I.pressed('remove')) { const why = removeAt(); if (why) { ctx.sound.sfx('error'); toast(why === 'fixed' ? 'THAT PIECE IS FIXED' : 'NOTHING HERE', '#ff9a6a'); } else ctx.sound.sfx('remove'); }
  },
  draw(r) {
    ctx.worlds.draw3d = (w, rr) => draw3d(w, rr);
    ctx.worlds.draw(r);
    // the mouse's cell on the cursor's level (for the next step)
    const I = ctx.game.input, w = ctx.worlds.world;
    if (I.mouse && I.mouse.active && w) { const f = w.screenToFloor(I.mouse.cx, I.mouse.cy, (ed.cur.L * LEVEL + LIFT) * U); if (f) { const cx = Math.floor((f[0] / U - GX) / CELL), cy = Math.floor((f[1] / U - GY) / CELL); ed.mouseCell = cx >= 0 && cy >= 0 && cx < GRID && cy < GRID ? [cx, cy] : null; } }
    r.overlay(g => hud(g, r));
    ctx.talk.draw(r); ctx.dev.draw(r);
  },
  quitTo() { if (ed.dirty && !ed.puzzle) saveSlot(); ctx.game.go('menu', { page: ed.puzzle ? 'puzzles' : 'build' }); }
};
function level(d) { ed.cur.L = Math.max(0, Math.min(LEVELS - 1, ed.cur.L + d)); ctx.sound.sfx('level'); }
function cycleItem(d) { const L = paletteTypes(ed.cat); if (!L.length) return; ed.item = (ed.item + d + L.length) % L.length; ctx.sound.sfx('move'); }
function cycleCat(d) { const C = cats(); const k = C.indexOf(ed.cat); ed.cat = C[(k + d + C.length) % C.length]; ed.item = 0; ctx.sound.sfx('move'); }
function tryPlace() {
  const type = selType(), why = placeAt(type);
  if (!why) { ctx.sound.sfx('place'); if (ed.rules && ed.rules.left(type) === 0) ctx.sound.sfx('click'); return; }
  ctx.sound.sfx('error');
  if (why === 'pack') { const pk = PACKS[TYPES[type].pack]; ed.modal = { kind: 'confirm', text: 'BUY ' + pk.name + ' FOR ' + pk.cost + ' ¢?', yes: () => { if (P().spend(pk.cost)) { P().p.packs[TYPES[type].pack] = true; P().save(); ctx.sound.sfx('unlock'); toast(pk.name + ' UNLOCKED', '#5ad06a'); } else { toast('NOT ENOUGH COPPERS', '#ff5a4a'); ed.shake = .4; } } }; return; }
  if (why === 'coppers') { toast('NOT ENOUGH COPPERS', '#ff5a4a'); ed.shake = .4; return; }
  toast({ overlap: 'SOMETHING IS IN THE WAY', grid: 'OFF THE GRID', start: 'ONE START ONLY', nobuild: "CAN'T BUILD THERE", chasm: "CAN'T BUILD OVER THE CHASM", 'none left': 'NONE LEFT', 'outside the zone': 'OUTSIDE THE BUILD ZONE' }[why] || why.toUpperCase(), '#ff9a6a');
}
/* ---- modal screens: slots, the name, share and import codes, confirm ---- */
function modalUpdate(dt, I) {
  const M = ed.modal;
  if (M.kind === 'name') { M.wheel.update(I); if (M.wheel.done) { ed.undo.push({ op: 'rename', from: ed.name, to: M.wheel.name }); ed.name = M.wheel.name; ed.track.name = ed.name; ed.dirty = true; ed.modal = null; } else if (I.pressed('cancel')) ed.modal = null; return; }
  if (M.kind === 'confirm') { if (I.pressed('confirm') || I.pressed('place')) { ed.modal = null; M.yes(); I.consumeAll(); } else if (I.pressed('cancel')) ed.modal = null; return; }
  if (M.kind === 'share') { if (I.pressed('confirm') || I.pressed('place')) { try { navigator.clipboard.writeText(M.code).then(() => toast('COPIED'), () => toast('COPY: SELECT THE CODE BY HAND')); } catch (e) { toast('COPY NOT ALLOWED HERE'); } ed.modal = null; I.consumeAll(); } else if (I.pressed('cancel')) ed.modal = null; return; }
  if (M.kind === 'import') { if (I.pressed('cancel')) { ed.modal = null; return; } if (M.go) { M.go = false; try { importCode(M.text); toast('TRACK IMPORTED', '#5ad06a'); ed.modal = null; } catch (e) { toast('NOT A TRACK CODE', '#ff5a4a'); } } return; }
  if (M.kind === 'slots') {
    if (I.repeat('down', .3, .1)) M.i = (M.i + 1) % 6; if (I.repeat('up', .3, .1)) M.i = (M.i + 5) % 6;
    if (I.pressed('confirm') || I.pressed('place')) { I.consumeAll(); if (M.save) { saveSlot(M.i); toast('SAVED TO SLOT ' + (M.i + 1)); ed.modal = null; } else if (P().p.slots[M.i]) { openSlot(M.i); ed.modal = null; } else ctx.sound.sfx('error'); }
    else if (I.pressed('cancel')) ed.modal = null;
  }
}
if (typeof addEventListener === 'function') {
  addEventListener('keydown', e => { const M = ed.modal; if (M && M.kind === 'import' && ctx.game && ctx.game.sceneName === 'editor') { if (e.key === 'Enter') M.go = true; else if (e.key === 'Backspace') M.text = M.text.slice(0, -1); else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) M.text += e.key; } });
  addEventListener('paste', e => { const M = ed.modal; if (M && M.kind === 'import') { M.text += (e.clipboardData && e.clipboardData.getData('text')) || ''; e.preventDefault(); } });
  addEventListener('wheel', e => { if (!ctx.game || ctx.game.sceneName !== 'editor' || ed.modal) return; if (e.ctrlKey) ed.wheel.zoom += Math.sign(e.deltaY); else if (e.shiftKey) ed.wheel.lvl -= Math.sign(e.deltaY || e.deltaX); else ed.wheel.rot += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
}
/* ---- 3D: the camera, the grid, the cursor and its preview, open ends, the puzzle's zone ---- */
function draw3d(w, r) {
  const pen = w.pen, t = ctx.game.real || 0, c = ed.cur, cz = c.L * LEVEL + LIFT;
  const tx = GX + (c.cx + .5) * CELL, ty = GY + (c.cy + .5) * CELL;
  const want = [tx, ty, cz]; ed.sm = ed.sm ? add(ed.sm, sub(want, ed.sm), .15) : want;
  const T0 = ed.sm, cp = Math.cos(ed.pitch), pos = [T0[0] + Math.cos(ed.yaw) * cp * ed.dist, T0[1] + Math.sin(ed.yaw) * cp * ed.dist, T0[2] + Math.sin(ed.pitch) * ed.dist];
  const pose = poseOf(null, { pos, look: T0, up: [0, 0, 1], fov: 55 }); w.camera.pose = pose; w.camera.fixed = pose;
  w.camera.target.x = T0[0] * U; w.camera.target.y = T0[1] * U; w.camera.target.z = T0[2] * U;
  ctx.worlds.cur.view.draw(pen, { t, lights: 6, near: [T0[0], T0[1]] });
  ctx.worlds.drawScenery(pen, t, [T0[0], T0[1]]);
  pen.at();
  // the grid at the cursor's level, within 6 cells
  for (let k = -6; k <= 7; k++) {
    const x = GX + (c.cx + k) * CELL, y = GY + (c.cy + k) * CELL, hot = k === 0 || k === 1;
    if (c.cx + k >= 0 && c.cx + k <= GRID) pen.bar(x * U, (GY + Math.max(0, c.cy - 6) * CELL) * U, (cz + .05) * U, x * U, (GY + Math.min(GRID, c.cy + 7) * CELL) * U, (cz + .05) * U, hot ? 4 : 2, 1, hot ? '#ffffff' : '#7a86a8');
    if (c.cy + k >= 0 && c.cy + k <= GRID) pen.bar((GX + Math.max(0, c.cx - 6) * CELL) * U, y * U, (cz + .05) * U, (GX + Math.min(GRID, c.cx + 7) * CELL) * U, y * U, (cz + .05) * U, hot ? 4 : 2, 1, hot ? '#ffffff' : '#7a86a8');
  }
  // the puzzle's zone and no-build cells
  if (ed.puzzle) { const [x0, x1, y0, y1] = ed.puzzle.zone, a = [GX + x0 * CELL, GY + y0 * CELL], b = [GX + (x1 + 1) * CELL, GY + (y1 + 1) * CELL], z = (LIFT + .3) * U, col = Math.sin(t * 3) > 0 ? '#ffd060' : '#ff9a2a';
    for (const [p, q] of [[[a[0], a[1]], [b[0], a[1]]], [[b[0], a[1]], [b[0], b[1]]], [[b[0], b[1]], [a[0], b[1]]], [[a[0], b[1]], [a[0], a[1]]]]) pen.bar(p[0] * U, p[1] * U, z, q[0] * U, q[1] * U, z, 8, 3, col); }
  // open ends: red arrows
  for (const { b, e } of ed.track.openEnds()) { const p = add(e.p, [0, 0, LIFT + 1.5]); arrow(pen, p, e.t, '#ff3a2a', t); }
  // a kicker's jump: the corridor to its landing
  for (const k of ed.track.blocks.filter(b => TYPES[b.type].kicker)) { const L = ed.track.jumpFrom(k), f = frameAt(k, TYPES.KI.len); if (L) { const q = add(L.e.p, [0, 0, 3]); pen.bar(f.p[0] * U, f.p[1] * U, (f.p[2] + 5) * U, q[0] * U, q[1] * U, (q[2] + 2) * U, 8, 2, '#5ab4ff'); } else arrow(pen, add(f.p, [0, 0, 5]), f.t, '#ff3a2a', t); }
  // the cursor: a pulsing outline, the selected block's ghost, green or red
  const pulse = .5 + .5 * Math.sin(t * 6), x0 = GX + c.cx * CELL, y0 = GY + c.cy * CELL, zc = (cz + .2) * U, oc = pulse > .5 ? '#ffffff' : accent();
  for (const [p, q] of [[[x0, y0], [x0 + CELL, y0]], [[x0 + CELL, y0], [x0 + CELL, y0 + CELL]], [[x0 + CELL, y0 + CELL], [x0, y0 + CELL]], [[x0, y0 + CELL], [x0, y0]]]) pen.bar(p[0] * U, p[1] * U, zc, q[0] * U, q[1] * U, zc, 10, 4, oc);
  const type = selType();
  if (type) {
    const pl = { type, cx: c.cx, cy: c.cy, L: c.L, rot: ed.rot }, T = TYPES[pl.type], why = ed.track.check(pl) || (ed.rules ? ed.rules.allow(pl) : (!owned(type) ? 'pack' : P().coppers < T.cost ? 'coppers' : null)), col = why ? '#ff4a3a' : '#4aff7a';
    preview(pen, pl, col);
    for (const e of endsOf(pl)) { const links = !!ed.track.partner({ id: -1 }, e); arrow(pen, add(e.p, [0, 0, LIFT + 1]), e.t, links ? '#5ab4ff' : '#ffffff', t); }
  }
  pen.at();
}
function arrow(pen, p, d, col, t) {
  const L = 4 + Math.sin(t * 5) * .6, q = add(p, d, L), side = norm([-d[1], d[0], 0]);
  pen.at().bar(p[0] * U, p[1] * U, p[2] * U, q[0] * U, q[1] * U, q[2] * U, 12, 6, col);
  const a = add(q, d, -1.6), b1 = add(a, side, 1.4), b2 = add(a, side, -1.4);
  pen.bar(q[0] * U, q[1] * U, q[2] * U, b1[0] * U, b1[1] * U, b1[2] * U, 10, 6, col).bar(q[0] * U, q[1] * U, q[2] * U, b2[0] * U, b2[1] * U, b2[2] * U, 10, 6, col);
}
/** a block's ghost: translucent slabs along its path (or its cells for scenery) */
function preview(pen, pl, col) {
  const T = TYPES[pl.type], hw = SECTION[ed.env].hw + SECTION[ed.env].curb;
  pen.ghost = true;
  if (T.path && !T.deco) { const n = Math.max(4, Math.ceil(T.len / 3)); for (let i = 0; i < n; i++) { const a = frameAt(pl, T.len * i / n), b = frameAt(pl, T.len * (i + 1) / n), pa = add(a.p, a.u, LIFT + .2), pb = add(b.p, b.u, LIFT + .2); pen.at().slab(pa[0] * U, pa[1] * U, pa[2] * U, pb[0] * U, pb[1] * U, pb[2] * U, a.r[0], a.r[1], a.r[2], hw * 2 * U, .4 * U, col); } }
  else for (const [x, y, l] of new Track().cellsOf(pl)) pen.at().box((GX + (x + .5) * CELL) * U, (GY + (y + .5) * CELL) * U, (l * LEVEL + 3) * U, (CELL - 4) * U, (CELL - 4) * U, 6 * U, col);
  if (T.cp || T.finish || T.start) { const f = frameAt(pl, T.gateS || T.archS), p = add(f.p, f.u, LIFT); pen.frame(p[0] * U, p[1] * U, p[2] * U, f.t, f.r, f.u, U); for (const sd of [-1, 1]) pen.box(0, sd * (hw + 1), 3.5, .9, .9, 7, col); pen.box(0, 0, 7.4, .8, (hw + 1) * 2 + 1, 1, col); }
  pen.ghost = false; pen.at();
}
/* ---- the HUD: the top bar, status chips, the palette carousel, prompts, modals ---- */
let palRects = [], catRects = [];
function paletteHit(I, p = I.pointer && I.pointer()) { if (!p) return null; for (const q of catRects) if (p[0] >= q.x && p[0] < q.x + q.w && p[1] >= q.y && p[1] < q.y + q.h) return { cat: q.cat }; for (const q of palRects) if (p[0] >= q.x && p[0] < q.x + q.w && p[1] >= q.y && p[1] < q.y + q.h) return { item: q.item }; return null; }
function hud(g, r) {
  const tr = ed.track, R = tr.route(), ac = accent(), dt = 1 / 60;
  // top bar
  E.px.blend(g, .7, 'normal', () => E.px.rect(g, 0, 0, r.W, 40, '#05040a'));
  T2(g, ed.name, 10, 5, '#ffffff'); T1(g, ENVS[ed.env].name + (ed.puzzle ? ' · PUZZLE ' + ed.puzzle.id : ' · SLOT ' + (ed.slot + 1)) + ' · LEVEL ' + ed.cur.L, 10, 24, UI.dim);
  if (!ed.rules) { const sx = ed.shake > 0 ? Math.sin(ed.t * 60) * 3 : 0; ed.shake = Math.max(0, (ed.shake || 0) - dt); coin(g, r.W - 74 + sx, 14); T2(g, String(P().coppers), r.W - 64 + sx, 8, '#ffb070'); }
  const chips = [['START', !!tr.start], ['FINISH', tr.finishes.length > 0], ['CP ' + tr.cps.length, tr.cps.length > 0], ['ROUTE', R.ok], [ed.author ? 'VALIDATED ' + fmt(ed.author) : 'NOT VALIDATED', !!ed.author]];
  let x = Math.max(180, r.W / 2 - 150);
  for (const [s, ok] of chips) { const w = F().width(s) + 18; panel(g, x, 8, w, 16, { border: ok ? '#5ad06a' : '#ff6a4a', alpha: .8 }); T1(g, (ok ? '✓ ' : '× ') + s, x + 5, 12, ok ? '#c8ffd0' : '#ffc8c0'); x += w + 4; if (x > r.W - 140) break; }
  if (!R.ok && tr.start && tr.finishes.length) T1(g, R.why, r.W / 2, 44, '#ff9a6a', 'center');
  // the palette: category tabs and item tiles
  const C = cats(), tabY = r.H - 108, tw = Math.min(70, (r.W - 20) / C.length); catRects = [];
  C.forEach((ci, k) => { const xx = 10 + k * (tw + 2), on = ci === ed.cat; panel(g, xx, tabY, tw, 16, { border: on ? ac : '#3a3658', bg2: on ? '#2a2448' : '#141226' }); T1(g, CATS[ci], xx + tw / 2, tabY + 4, on ? '#ffffff' : UI.dim, 'center'); catRects.push({ x: xx, y: tabY, w: tw, h: 16, cat: ci }); });
  const L = paletteTypes(ed.cat), iw = 64, ih = 62, n = Math.max(1, Math.floor((r.W - 20) / (iw + 4))), start = Math.max(0, Math.min(L.length - n, ed.item - Math.floor(n / 2))); palRects = [];
  for (let k = start; k < Math.min(L.length, start + n); k++) {
    const id = L[k], T = TYPES[id], xx = 10 + (k - start) * (iw + 4), yy = tabY + 18, on = k === ed.item, own = owned(id), left = ed.rules ? ed.rules.left(id) : null;
    panel(g, xx, yy, iw, ih, { border: on ? ac : '#3a3658', bg2: on ? '#2a2448' : '#141226' }); if (on) E.px.rect(g, xx, yy, iw, 2, ac);
    blockIcon(g, id, xx + iw / 2, yy + 22, 40, 28, ed.rot);
    T1(g, T.name.length > 11 ? T.name.slice(0, 11) : T.name, xx + iw / 2, yy + ih - 22, on ? '#ffffff' : UI.dim, 'center');
    if (ed.rules) T1(g, '×' + left, xx + iw / 2, yy + ih - 11, left > 0 ? '#5ad06a' : '#ff6a4a', 'center');
    else { T1(g, T.cost + ' ¢', xx + iw / 2, yy + ih - 11, P().coppers >= T.cost ? '#ffb070' : '#ff6a4a', 'center'); if (!own) { lock(g, xx + iw - 9, yy + 10); } }
    palRects.push({ x: xx, y: yy, w: iw, h: ih, item: k });
  }
  if (ed.rules) { const L = ed.rules.types().reduce((a, k) => a + Math.max(0, ed.rules.left(k)), 0); T1(g, L + ' PIECES LEFT', r.W - 10, 44, '#c8ffd0', 'right'); }
  // left prompts
  const pr = [['place', 'PLACE'], ['remove', 'REMOVE'], ['rotR', 'ROTATE'], ['levelUp', 'LEVEL UP'], ['levelDown', 'LEVEL DOWN']];
  let y = 46; for (const p of pr) { if (y > tabY - 14) break; promptRow(g, 8, y, [p], {}); y += 14; }
  // modals
  const M = ed.modal;
  if (M) {
    E.px.blend(g, .72, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a'));
    if (M.kind === 'name') { T2(g, 'TRACK NAME', r.W / 2, r.H / 2 - 50, '#ffffff', 'center'); M.wheel.draw(g, r.W / 2, r.H / 2 - 16); promptBar(g, r, [['up', 'LETTER'], ['right', 'MOVE'], ['confirm', 'DONE'], ['cancel', 'CANCEL']]); }
    else if (M.kind === 'confirm') { panel(g, r.W / 2 - 150, r.H / 2 - 30, 300, 60, { border: '#ffd060' }); T2(g, M.text, r.W / 2, r.H / 2 - 18, '#ffffff', 'center'); promptRow(g, r.W / 2, r.H / 2 + 8, [['confirm', 'YES'], ['cancel', 'NO']], { align: 'center' }); }
    else if (M.kind === 'share') { panel(g, 20, r.H / 2 - 60, r.W - 40, 120, { border: ac }); T2(g, 'SHARE CODE', r.W / 2, r.H / 2 - 52, '#ffffff', 'center'); const lines = []; for (let i = 0; i < M.code.length; i += 64) lines.push(M.code.slice(i, i + 64)); lines.slice(0, 7).forEach((l, i) => T1(g, l, r.W / 2, r.H / 2 - 30 + i * 10, '#c8ffd0', 'center', { font: 'tiny' })); if (lines.length > 7) T1(g, '(' + M.code.length + ' characters)', r.W / 2, r.H / 2 + 44, UI.dim, 'center'); promptBar(g, r, [['confirm', 'COPY'], ['cancel', 'CLOSE']]); }
    else if (M.kind === 'import') { panel(g, 20, r.H / 2 - 40, r.W - 40, 80, { border: ac }); T2(g, 'IMPORT CODE', r.W / 2, r.H / 2 - 32, '#ffffff', 'center'); T1(g, 'Paste a code (Ctrl+V) and press Enter', r.W / 2, r.H / 2 - 12, UI.dim, 'center'); T1(g, (M.text.slice(-60) || '...') + (Math.floor(ed.t * 2) % 2 ? '_' : ''), r.W / 2, r.H / 2 + 6, '#c8ffd0', 'center'); promptBar(g, r, [['=Enter', 'IMPORT'], ['cancel', 'CANCEL']]); }
    else if (M.kind === 'slots') { T2(g, M.save ? 'SAVE TO SLOT' : 'LOAD A SLOT', r.W / 2, 50, '#ffffff', 'center'); for (let i = 0; i < 6; i++) { const s = P().p.slots[i], yy = 72 + i * 26, on = i === M.i; panel(g, r.W / 2 - 150, yy, 300, 22, { border: on ? ac : '#3a3658' }); T2(g, (i + 1) + '. ' + (s ? s.name : 'EMPTY'), r.W / 2 - 142, yy + 4, on ? '#ffffff' : UI.dim); if (s) T1(g, ENVS[s.env].name + (s.author ? ' · ' + fmt(s.author) : ''), r.W / 2 + 142, yy + 7, UI.dim, 'right'); } promptBar(g, r, [['up', 'CHOOSE'], ['confirm', M.save ? 'SAVE' : 'LOAD'], ['cancel', 'CANCEL']]); }
  } else promptBar(g, r, [['palR', 'BLOCK'], ['catU', 'TAB'], ['test', 'DRIVE'], ['undo', 'UNDO'], ['redo', 'REDO'], ['pause', 'MENU']]);
  drawToasts(g, r, dt);
}
const promptLabel = a => { try { return ctx.game.input.label(a); } catch (e) { return a; } };
/** a block's icon from above: its path as a road, turned by rot, in a w x h box centred at (x, y) */
export function blockIcon(g, id, x, y, w, h, rot = 0) {
  const T = TYPES[id]; if (!T) return;
  if (T.deco) { E.px.disc(g, x, y, 7, { XCACT: '#3a8a3a', XROCK: '#a07858', XSTAND: '#c8c8d0', XTREE: '#3a8a2a', XHAY: '#e8c860', XPINE: '#1e5a3a', XCHALET: '#8a5a32', XBOARD: '#f4f4f4', XTYRE: '#2a2a30', XSNOWMAN: '#f4f8ff', XCOW: '#f4f4ec', XWIND: '#e8e0d0' }[id] || '#888'); return; }
  const pl = { type: id, cx: 0, cy: 0, L: 0, rot }, n = 16, pts = [];
  for (let i = 0; i <= n; i++) { const f = frameAt(pl, T.len * i / n); pts.push([f.p[0] - GX, f.p[1] - GY, f.p[2]]); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const k = Math.min(w / Math.max(16, x1 - x0 + 14), h / Math.max(16, y1 - y0 + 14)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, col = SURF_COL[T.surface] || '#8a8a96';
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; E.px.line(g, x + (a[0] - cx) * k, y + (a[1] - cy) * k - a[2] * k * .4, x + (b[0] - cx) * k, y + (b[1] - cy) * k - b[2] * k * .4, b[2] > 2 ? '#c8c8d8' : col, Math.max(2, Math.round(10 * k))); }
  const mid = pts[n >> 1];
  if (T.boost) E.px.poly(g, [[x - 3, y - 3], [x + 3, y], [x - 3, y + 3]], '#ffd060');
  if (T.cp) E.px.rect(g, x - 1, y - 6, 2, 12, '#3a8ae8');
  if (T.finish || T.start) for (let i = 0; i < 4; i++) E.px.rect(g, x - 4 + i * 2, y - 2 + (i % 2) * 2, 2, 2, T.start ? '#5ad06a' : '#ffffff');
  if (T.kicker) E.px.poly(g, [[x - 5, y + 3], [x + 5, y - 4], [x + 5, y + 3]], '#ffd060');
  if (T.loop) { E.px.disc(g, x, y - 2, 6, '#c8c8d8'); E.px.disc(g, x, y - 2, 4, '#141226'); }
  const s = pts[0]; E.px.rect(g, x + (s[0] - cx) * k - 1, y + (s[1] - cy) * k - 1, 3, 3, '#5ad06a');
}
