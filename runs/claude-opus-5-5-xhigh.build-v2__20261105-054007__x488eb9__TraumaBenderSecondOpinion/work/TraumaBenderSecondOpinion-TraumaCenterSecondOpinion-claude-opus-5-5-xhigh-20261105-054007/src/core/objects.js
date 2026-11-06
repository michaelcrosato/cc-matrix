// Things on the table (section 7): sim behavior only. Draw functions are kept apart in src/art/objects.js; bot plans in src/bot.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, def = G.defObject;
const only = (tool, verb) => (o, t) => t === tool ? verb : null;
const Op = () => G.Op, Score = () => G.Score;

/** give an object an embedded pull (o.ang: the way out, o.depth, o.max, o.par) */
const mkPull = G.mkPull = (o, d = {}) => { const a = o.ang ?? d.ang ?? -Math.PI / 2, depth = o.depth ?? d.depth ?? 18; o.ox = o.x; o.oy = o.y; o.pull = { ax: Math.cos(a), ay: Math.sin(a), depth, prog: 0, t: 0, tears: 0, par: o.par ?? depth / 80 + .7, max: o.max ?? d.max ?? 0 }; };
/** a coverage grid for Salve */
const mkCells = G.mkCells = (o, r) => { o.r = r; const n = Math.ceil(r * 2 / 4), g = []; let c = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const dx = (i + .5) * 4 - n * 2, dy = (j + .5) * 4 - n * 2, inside = dx * dx + dy * dy <= r * r; g.push(inside ? 0 : 2); if (inside) c++; } o.cells = { w: n, h: n, g, n: c, got: 0 }; };
/** a wound's stitch pairs across its line */
const mkStitches = G.mkStitches = (o, n, len, gap) => { o.n = n; o.sewn = 0; o.gsum = 0; o.len = len; o.stitches = []; const ca = Math.cos(o.ang || 0), sa = Math.sin(o.ang || 0); for (let i = 0; i < n; i++) { const s = n === 1 ? 0 : (i / (n - 1) - .5) * len, cx = o.x + ca * s, cy = o.y + sa * s; o.stitches.push({ a: [cx - sa * gap, cy + ca * gap], b: [cx + sa * gap, cy - ca * gap] }); } };

def('shard', {
  hazard: .1, accept: only('forceps', 'Pull'), reach: 0, worth: 100, init(o) { mkPull(o); o.len = o.len ?? 8 + o.pull.depth * .4; },
  ghost: o => ({ k: 'shard', x: o.x, y: o.y }),
  step(o, S, w) { if (S.tiltOn && o.loose && !o.free) { o.x += S.tilt[0] * .3 * w; o.y += S.tilt[1] * .3 * w; o.ox = o.x; o.oy = o.y; } },
});
def('laceration', {
  hazard: .2, optionalJob: true, prio: 8, accept: only('salve', 'Salve'), worth: 40, reach: 0, init(o) { mkCells(o, o.r || 9); },
  step(o, S, w) { if (!o.dry) { o.feed = (o.feed || 0) + w; if (o.feed > 2) { o.feed = 0; if (U.inCavity(o.x, o.y, 4)) Op().addPool(S, o.x + 2, o.y + 8, 1 * T.bleedX); } } },
});
def('patch', { hazard: .1, accept: only('salve', 'Salve'), worth: 50, reach: 0, init(o) { mkCells(o, o.r || 18); } });
def('wound', {
  sewable: true, reach: 0, worth: 80, hazard: o => .4 * (1 - o.sewn / o.n),
  accept: only('suture', 'Stitch'), init(o) { mkStitches(o, o.n || o.stitchN || 4, o.len || (o.n || 4) * 9, o.gap || 8); }, point: (o, S) => { const s = Op().nextStitch(S, o); return s ? s.a : [o.x, o.y]; },
  ghost: o => ({ k: 'wound', x: o.x, y: o.y }),
});
def('arteryTear', {
  sewable: true, prio: 1, reach: 0, worth: 120, hazard: o => 1 * (1 - o.sewn / o.n), accept: only('suture', 'Stitch'),
  init(o) { mkStitches(o, o.n || 3, o.len || 16, o.gap || 7); }, point: (o, S) => { const s = Op().nextStitch(S, o); return s ? s.a : [o.x, o.y]; },
  step(o, S, w) { if (Op().inDome(S, o.x, o.y)) return; Op().addPool(S, o.x + (o.pdx ?? 12), o.y + (o.pdy ?? 12), 14 * (1 - o.sewn / o.n) * T.bleedX * w); },
});
def('bleeder', {
  prio: 2, r: 3, hazard: .5, accept: only('cautery', 'Burn'), worth: 60, burnNeed: o => o.need ?? T.burnBleeder,
  step(o, S, w) {
    if (Op().inDome(S, o.x, o.y)) { o.paused = true; return; } o.paused = false;
    Op().addPool(S, o.x + (o.pdx ?? 10), o.y + (o.pdy ?? 9), (o.feed ?? 6) * T.bleedX * w);
    if (o.timer !== undefined && o.timer > 0) { o.timer -= w; if (o.timer <= 0) { o.timer = o.timer0 || 12; Score().hurt(S, 15); S.ev.push(['rupture', o.x, o.y]); S.ev.push(['say', 'low']); } }
  },
  init(o) { if (o.timer) o.timer0 = o.timer; },
});
def('pool', {
  prio: 3, accept: only('suction', 'Suck'), reach: o => Op().poolR(o),
  init(o) { o.vol = o.vol ?? 60; },
  step(o, S, w) { if (S.tiltOn) { o.x += S.tilt[0] * w; o.y += S.tilt[1] * w; const C = G.CAV; const dx = (o.x - C.x) / C.rx, dy = (o.y - C.y) / C.ry, d = Math.hypot(dx, dy); if (d > .86) { o.x = C.x + dx / d * .86 * C.rx; o.y = C.y + dy / d * .86 * C.ry; } } },
});
def('polyp', { r: 4, hazard: .1, accept: only('cautery', 'Burn'), worth: 60, burnNeed: () => T.burnPolyp });
def('mass', {
  r: 8, hazard: .2, worth: 160, init(o) { mkPull(o, { depth: 22 }); o.rx = o.rx || 20; o.ry = o.ry || 15; },
  accept: (o, t) => t === 'forceps' && o.ringed ? 'Lift' : null,
});
def('hook', {
  r: 2, hazard: .3, worth: 180, init(o) { mkPull(o, { depth: 40 }); o.barbs = o.barbs ?? 2; }, accept: only('forceps', 'Pull'),
  pullBlocked: o => o.barbs > 0,
});
def('clot', {
  r: 4, hazard: .3, worth: 110, init(o) { mkPull(o, { depth: 16 }); o.dosed = false; },
  accept: (o, t) => t === 'syringe' && !o.dosed ? 'Dissolve' : t === 'forceps' && o.dosed ? 'Pull' : null,
  dose(S, h, o, q) { o.dosed = true; Score().award(S, h, o.x, o.y, q, 60); if (S.tut && S.tut.tool === 'syringe') S.tut = null; },
});
def('nerve', { optional: true, accept: () => null, init(o) { o.x = o.pts[0][0]; o.y = o.pts[0][1]; o.w = o.w ?? 2; } });
def('guide', {
  prio: 4, worth: 100, reach: 0, accept: (o, t) => t === 'scalpel' && !o.done ? 'Cut' : null,
  init(o) { o.len = U.polyLen(o.pts); o.prog = 0; o.sum = 0; o.x = o.pts[0][0]; o.y = o.pts[0][1]; },
  point: o => { const p = U.polyAt(o.pts, o.prog); return [p.x, p.y]; },
  onDone(S, h, o) { if (!o.short) S.marks.push(['line', o.pts, 1.2]); if (o.slurOf) { const q = Op().byId(S, o.slurOf); if (q) G.OBJ[q.type].slurCut(S, h, q, o); } },
});

// ------------------------------------------------------------------ the implant of Case 9
def('screw', {
  r: 2, hazard: 0, worth: 90, accept: only('forceps', 'Turn'), init(o) { o.turn = 0; o.need = (o.need ?? 3) * Math.PI * 2; o.la = null; },
  grip(S, h, o) { o.la = null; h.turnT = 0; },
  hold(S, h, o, dt) {
    const dx = h.x - o.x, dy = h.y - o.y, d = Math.hypot(dx, dy); if (d < 2) return;
    const a = Math.atan2(dy, dx); if (o.la !== null) { let da = a - o.la; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; o.turn = Math.max(0, o.turn + Math.abs(da)); S.ev.push(['screw', o.x, o.y, h.id]); } o.la = a;
    if (o.turn >= o.need) { h.held = 0; S.ev.push(['dish', o.x, o.y, h.id]); Op().finishObj(S, o, h, h.heldT < 2.4 ? 'Textbook' : 'Clean', 90, 'forceps'); }
  },
  release(S, h, o) { o.la = null; },
});
G.OBJ.screw.bot = function* (o, S, B) { yield* B.tool('forceps'); yield* B.moveTo(o.x + 5, o.y, undefined, 1.5); B.press(); yield; let a = 0, g = 0; while (!o.done && g++ < 1500) { a += .22; const tx = o.x + Math.cos(a) * 5, ty = o.y + Math.sin(a) * 5, dx = tx - B.c.x, dy = ty - B.c.y, d = Math.hypot(dx, dy); B.steer(dx, dy, d, 300); yield; } B.release(); yield; };
def('lead', { r: 5, hazard: 0, worth: 120, accept: only('cautery', 'Solder'), burnNeed: () => .8 });
def('wire', {
  r: 6, hazard: 0, worth: 110, accept: (o, t, S) => t === 'scalpel' && S.flags.bypassed ? 'Slash' : null, init(o) { o.slashAng = 0; }, job: (o, S) => S.flags.bypassed && (S.flags.wireOrder || [])[S.flags.wireI || 0] === o.sym ? { tool: 'scalpel', o } : null,
  slashed(S, h, o) {
    const next = S.flags.wireOrder[S.flags.wireI || 0];
    if (o.sym === next) { S.flags.wireI = (S.flags.wireI || 0) + 1; S.ev.push(['wireCut', o.x, o.y, o.sym]); Op().finishObj(S, o, h, 'Textbook', 110, 'scalpel'); }
    else { if (S.rt - (S.flags.wrongT ?? -9) < 1) return; S.flags.wrongT = S.rt; Score().slip(S, h, o.x, o.y, 30, 'wire'); S.clock -= 30; S.ev.push(['wireWrong', o.x, o.y]); S.ev.push(['sayp', 'wrongWire']); }
  },
});
def('can', {
  r: 14, hazard: 0, worth: 300, reach: 12, accept: (o, t) => t === 'forceps' && o.liftable ? 'Lift' : null, init(o) { mkPull(o, { depth: 44, max: 34 }); },
  torn(S, h, o) { Score().hurt(S, 6); S.ev.push(['say', 'tension']); },
});

// ------------------------------------------------------------------ Grand Rounds' retractor
def('retractorHandle', {
  r: 4, optional: true, reach: 4, accept: (o, t) => t === 'forceps' ? 'Hold' : null, prio: 6,
  init(o) { o.open = 0; o.gripped = false; o.quillT = 0; },
  grip(S, h, o) { o.gripped = true; h.heldT = 0; S.ev.push(['retract', o.x, o.y]); },
  hold(S, h, o, dt) { o.gripped = true; o.hx = h.x; o.hy = h.y; },
  release(S, h, o) { o.gripped = false; },
  step(o, S, w, dt) {
    const anyHold = S.hands.some(h => h.held === o.id); if (!anyHold) o.gripped = false;
    // alone, Quill holds it at half the window: open half the time. Held by a player: open the whole time.
    o.quillT += dt; const quill = S.hands.filter(h => !h.gone).length === 1 && (o.quillT % 6) < 3.2;
    o.open = U.clamp(o.open + (o.gripped ? 3 : quill ? 2 : -2.4) * dt, 0, 1);
    S.flags.windowOpen = o.open > .6;
    S.flags.quillHolds = quill && !o.gripped;
  },
});
def('windowed', {
  r: 8, hazard: .3, worth: 160, accept: (o, t, S) => t === 'scalpel' && S.flags.windowOpen ? 'Slash' : null, job(o, S, h) { if (S.flags.windowOpen) { if (h && h.held) return null; return { tool: 'scalpel', o }; } const live = S.hands.filter(q => !q.gone), grip = S.objs.find(q => q.type === 'retractorHandle' && !q.done); if (live.length > 1 && grip && live[0] === h && !S.hands.some(q => q.held === grip.id)) return { tool: 'forceps', o: grip, plan: 'holdHandle' }; return null; },
  slashed(S, h, o) { S.ev.push(['slash', o.x, o.y, h.id]); o.hp = (o.hp ?? 1) - 1; if (o.hp <= 0) Op().finishObj(S, o, h, 'Textbook', 160, 'scalpel'); },
});
})();
