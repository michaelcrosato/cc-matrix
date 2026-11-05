// Patterns: a ghost blueprint the builder follows; helper residents fill it from the Town Chest.
(() => {
const { E, T } = DQ;
const A = () => DQ.audio;
DQ.ITEMS.pattern = { id: 'pattern', name: 'Cottage Pattern', kind: 'use', stack: 9, desc: 'A blueprint scroll. Use it to lay out a ghost cottage; residents help build it.' };
DQ.patternCells = function (x0, y0) {
  const cells = [], objs = [];
  for (let k = 0; k < 2; k++) for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { const e = x === 0 || y === 0 || x === 4 || y === 4; if (e && !(x === 2 && y === 4)) cells.push({ x: x0 + x, y: y0 + y, z: k, block: 'cobble' }); }
  objs.push({ x: x0 + 2, y: y0 + 4, type: 'door' }, { x: x0 + 1, y: y0 + 1, type: 'torch' }, { x: x0 + 3, y: y0 + 1, type: 'bed' });
  return { cells, objs };
};
DQ.placePattern = function (cx, cy) {
  const S = DQ.S; if (S.pattern) { DQ.toast('A Pattern is already laid out.', '#ff8a8a'); return false; }
  if (!DQ.inBorder(cx, cy) || !DQ.inBorder(cx + 4, cy + 4)) { DQ.toast('Patterns must fit inside the town border.', '#ff8a8a'); return false; }
  const w = S.world; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (w.objAt(cx + x, cy + y) || w.height(cx + x, cy + y) > 1) { DQ.toast('Clear the ground first.', '#ff8a8a'); return false; }
  S.pattern = { ...DQ.patternCells(cx, cy), x0: cx, y0: cy, t: 0 }; DQ.inv.remove('pattern', 1); DQ.toast('Pattern laid out! Fill the ghost blocks.', '#ffe9a0'); A().sfx('harp'); return true;
};
const cellDone = (c, w) => w.height(c.x, c.y) > c.z && w.blockAt(c.x, c.y, c.z) === DQ.blockId(c.block);
const objDone = (o, w) => { const ob = w.objAt(o.x, o.y); return !!ob && ob.type === o.type; };
DQ.patternProgress = function () { const S = DQ.S, p = S.pattern; if (!p) return null; const w = S.world; return { done: p.cells.filter(c => cellDone(c, w)).length + p.objs.filter(o => objDone(o, w)).length, total: p.cells.length + p.objs.length }; };
DQ.patternTick = function (dt) {
  const S = DQ.S, p = S.pattern; if (!p) return; const w = S.world; p.t += dt;
  // helpers: Wren and the Professor place one missing piece every 8 s, taking materials from the Town Chest
  p.helpT = (p.helpT || 0) - dt;
  if (p.helpT <= 0) {
    p.helpT = 8 / Math.max(.1, DQ.tuning.helperRate || 1); const helper = S.residents.find(r => (r.id === 'selvage' || r.id === 'wren') && r.ko <= 0);
    if (helper) {
      const chest = w.list.find(o => o.type === 'chest' && o.townChest);
      const take = id => { if (!chest) return false; const e = (chest.items || []).find(i => i.id === id && i.n > 0); if (!e) return false; e.n--; if (e.n <= 0) chest.items.splice(chest.items.indexOf(e), 1); return true; };
      const nc = p.cells.find(c => !cellDone(c, w) && w.height(c.x, c.y) === c.z), no = p.objs.find(o => !objDone(o, w) && !w.objAt(o.x, o.y) && w.height(o.x, o.y) === 0);
      if (nc) { if (take(nc.block)) { w.push(nc.x, nc.y, DQ.blockId(nc.block), { town: true }); helper.swing = .35; A().sfx('thud', { vol: .4 }); DQ.stitchFx(nc.x, nc.y, nc.z, '#9a9aa6'); } else DQ.balloon(helper, 'dots', 3); }
      else if (no) { const id = no.type === 'bed' ? 'bed' : no.type; if (take(id)) { w.addObj(no.type, no.x, no.y, { facing: 0 }); A().sfx('stitch'); } else DQ.balloon(helper, 'dots', 3); }
    }
  }
  const pr = DQ.patternProgress();
  if (pr.done >= pr.total) { S.pattern = null; S.stats.patterns = (S.stats.patterns || 0) + 1; DQ.addCheer(20, 'pattern'); DQ.toast('Pattern complete! +20 Cheer', '#8affd0'); A().sfx('fanfare'); DQ.events.emit('patternDone', {}); DQ.dirtyRooms(); }
};
DQ.drawPattern = function (r) {
  const S = DQ.S, p = S.pattern; if (!p) return; const w = S.world, t = S.time;
  for (const c of p.cells) { if (cellDone(c, w)) continue; const z = c.z * T; r.queue(c.x * T + 8, c.y * T + 8, z + 4, g => { const P = [r.w(c.x * T, c.y * T, z + T), r.w((c.x + 1) * T, c.y * T, z + T), r.w((c.x + 1) * T, (c.y + 1) * T, z + T), r.w(c.x * T, (c.y + 1) * T, z + T)]; const wrong = w.height(c.x, c.y) > c.z; E.px.blend(g, .3, 'normal', () => E.px.poly(g, P, wrong ? '#ff5050' : '#a0c8ff')); for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4]; if ((i + Math.floor(t * 2)) % 2) E.px.line(g, a[0], a[1], b[0], b[1], '#fff', 1); } }, { emissive: true }); }
  for (const o of p.objs) { if (objDone(o, w)) continue; r.queue(o.x * T + 8, o.y * T + 8, 6, g => { const q = r.w(o.x * T + 8, o.y * T + 8, 6); E.px.blend(g, .5, 'normal', () => DQ.drawIcon(g, o.type === 'bed' ? 'bed' : o.type, q[0] - 6, q[1] - 12, 12)); }, { emissive: true }); }
};
})();
