// HUSH: the strains (section 8). Plain data, ticked in world time so Long Breath slows them.
(() => {
const G = (window.GAME ||= {}), T = G.T, Op = G.Op, def = G.defObject, geo = G.geo, { clamp, hyp, rnd, ev } = G.OpHelpers;
const sameTool = t => (S, o, tool) => tool === t;
const sm = () => T('strainSpeed'), hp = () => T('strainHealth');
// ---------- Staccato
def('nest', { drain: .15, label: 'nest', slash: (S, o) => !o.cut, strain: true, init(S, o, sp) { o.hid = sp.hid !== false; o.ax = [1, 0]; o.depth = 16; o.prog = 0; o.par = 2; o.cut = false; o.sr = 12; o.free = false; o.cap = sp.cap || 3; o.beat = rnd(S) * .4; },
  onSlash(S, o, p) { Op.award(S, p, o.x, o.y, 'Clean', 80); }, grip: (S, o) => o.cut, tools: (S, o, t) => (t === 'scalpel' && !o.cut) || (t === 'forceps' && o.cut), pt: (S, o) => [o.x0, o.y0],
  tick(S, o, dt) { if (!o.cut || true) { o.beat -= dt; if (o.beat <= 0 && !o.cut) { o.beat = T('staccatoBeat') / sm() / (S.speedUp || 1) * 4 / T('spawn'); const mine = S.objs.filter(b => b.type === 'bead' && !b.done && b.nest === o.id).length; if (mine < o.cap) Op.add(S, 'bead', { x: o.x + (rnd(S) - .5) * 20, y: o.y + (rnd(S) - .5) * 20, nest: o.id }); } } } });
def('bead', { drain: .12, label: 'bead', strain: true, init(S, o) { o.tx = o.x; o.ty = o.y; o.tele = 0; o.hop = rnd(S) * .5 + .3; o.bites = 0; o.life = 1e9; }, burn: () => .12 * hp(), tools: sameTool('cautery'),
  tick(S, o, dt) {
    const nests = S.objs.some(n => n.type === 'nest' && !n.done && !n.cut) ; if (!nests && o.life > 3) o.life = 3; o.life -= dt; if (o.life <= 0) { o.done = true; return; }
    if (o.tele > 0) { o.tele -= dt; if (o.tele <= 0) { o.x = o.tx; o.y = o.ty; o.sq = .4; o.bites++; if (o.bites % 2 === 0 && Op.inCav(o.x, o.y, 10)) { Op.add(S, 'laceration', { x: o.x, y: o.y, r: 9, noBleed: true, bite: true, ph: S.ph }); Op.slip(S, null, o.x, o.y, 0, 'bite'); S.vitals = Math.max(0, S.vitals - 1.5 * T('strainDmg')); ev(S, 'bite', o.x, o.y); } o.hop = (T('staccatoBeat') + rnd(S) * .3) / sm(); } }
    else { o.hop -= dt; if (o.hop <= 0) { for (let k = 0; k < 8; k++) { const a = rnd(S) * 6.283, d = 22 + rnd(S) * 28, x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d; if (Op.inCav(x, y, 14)) { o.tx = x; o.ty = y; break; } } o.tele = .5; ev(S, 'tele', o.tx, o.ty); } }
    if (o.sq > 0) o.sq -= dt * 3; } });
// ---------- Legato (the worm)
const ROUTES = [[[60, 150], [110, 90], [170, 120], [220, 70], [270, 110], [330, 80], [370, 120]], [[370, 160], [320, 130], [260, 170], [200, 140], [150, 175], [90, 140], [60, 110]]];
const legMarks = (S, o, n) => { o.marks = []; for (let i = 0; i < n; i++) { const s = o.rl * (.2 + .6 * i / Math.max(1, n - 1)), pt = geo.polyAt(o.route, s), q = geo.polyAt(o.route, s + 6), a = Math.atan2(q[1] - pt[1], q[0] - pt[0]) + 1.57; const inc = Op.add(S, 'incision', { pts: [[pt[0] - Math.cos(a) * 11, pt[1] - Math.sin(a) * 11], [pt[0] + Math.cos(a) * 11, pt[1] + Math.sin(a) * 11]], len: 22, short: true, req: false, slur: true, ph: S.ph }); o.marks.push({ s, id: inc.id, used: false }); } };
def('legato', { drain: .3, label: 'Legato', strain: true, init(S, o, sp) { o.route = sp.route || ROUTES[(sp.which || 0) % 2]; o.rl = geo.polyLen(o.route); o.s = 0; o.gen = sp.gen || 0; o.hid = true; o.state = 'under'; o.depth = o.gen ? 50 : 76; o.prog = 0; o.maxSpeed = 40; o.snaps = 0; o.barbs = o.gen ? [30] : [26, 52]; o.bi = 0; o.clamped = false; o.free = false; legMarks(S, o, o.gen ? 2 : 3); o.x = o.route[0][0]; o.y = o.route[0][1]; o.x0 = o.x; o.y0 = o.y; o.ax = [1, 0]; o.up = 0; },
  tick(S, o, dt) {
    if (o.clamped && o.bp >= 1) { Op.award(S, null, o.x, o.y, 'Clean', 90); o.clamped = false; o.bp = 0; o.bi++; ev(S, 'barbdone', o.x, o.y); }
    if (o.state === 'under') { o.s += (o.gen ? 22 : 14) * sm() * dt; if (o.s >= o.rl) o.s = 0; const pt = geo.polyAt(o.route, o.s); o.x = pt[0]; o.y = pt[1];
      for (const m of o.marks) { const inc = Op.byId(S, m.id); if (inc && inc.cut && !m.used && Math.abs(o.s - m.s) < 38) { m.used = true; o.state = 'up'; o.hid = false; const q = geo.polyAt(o.route, o.s + 8), a = Math.atan2(q[1] - o.y, q[0] - o.x); o.ax = [-Math.cos(a), -Math.sin(a)]; o.x0 = o.x; o.y0 = o.y; o.prog = 0; o.bi = 0; o.clamped = false; o.free = false; ev(S, 'surface', o.x, o.y); inc.done = true; } } }
    else if (o.state === 'up') {
      if (!S.pl.some(p => p.g && p.g.id === o.id) && !o.clamped) { o.up += dt; if (o.up > 6 && o.prog < 4) { o.state = 'under'; o.hid = true; o.up = 0; ev(S, 'dive', o.x, o.y); } } else o.up = 0;
      if (o.prog >= o.depth - .5 && o.gen === 0 && !o.split) { o.split = true; for (const p of S.pl) if (p.g && p.g.id === o.id) p.g = null; o.state = 'under'; o.hid = true; o.free = false; o.prog = 0; o.gen = 1; o.s = 0; o.route = ROUTES[1]; o.rl = geo.polyLen(o.route); o.depth = 50; o.barbs = [30]; o.bi = 0; o.clamped = false; ev(S, 'split', o.x, o.y); legMarks(S, o, 2); }
    }
  },
  grip: (S, o) => o.state === 'up' && !o.clamped, pulling(S, o, p) { const b = o.barbs[o.bi]; if (b != null && o.prog >= b - 1 && !o.clamped && !o.free) { o.prog = b - 1; o.free = true; if (!S.zones.some(z => z.for === o.id)) { S.zones.push({ x: o.x0 + o.ax[0] * (b + 24), y: o.y0 + o.ax[1] * (b + 24), r: 22, for: o.id }); } ev(S, 'barb', o.x, o.y); } },
  onTear(S, o) { o.snaps++; if (o.prog < 8 && o.snaps % 2 === 0) { o.state = 'under'; o.hid = true; o.s = Math.max(0, o.s - 40); o.prog = 0; ev(S, 'snap', o.x, o.y); for (const p of S.pl) if (p.g && p.g.id === o.id) p.g = null; for (const m of o.marks) { m.used = false; const inc = Op.byId(S, m.id); if (!inc || inc.cut) { const ni = Op.add(S, 'incision', { pts: inc ? inc.pts : [[o.x - 10, o.y], [o.x + 10, o.y]], len: 22, req: false, slur: true, ph: S.ph }); m.id = ni.id; } } } },
  release(S, o, p, g) { const z = S.zones.find(q => q.for === o.id && hyp(q.x - o.x, q.y - o.y) < q.r + 6); const b = o.barbs[o.bi];
    if (z && b != null && o.prog < o.depth - 1) { o.clamped = true; o.free = false; o.x = o.x0 + o.ax[0] * o.prog; o.y = o.y0 + o.ax[1] * o.prog; S.zones = S.zones.filter(q => q !== z); ev(S, 'clamp', o.x, o.y); return; }
    if (o.gen === 1 && o.prog >= o.depth - 1) { o.done = true; o.marks.forEach(m => { const q = Op.byId(S, m.id); if (q) q.done = true; }); Op.award(S, p, o.x, o.y, g.tears ? 'Clean' : 'Textbook', 200); ev(S, 'caught', o.x, o.y, 'legato'); return; }
    o.free = false; o.x = o.x0 + o.ax[0] * o.prog; o.y = o.y0 + o.ax[1] * o.prog; ev(S, 'drop', o.x, o.y); },
  partial: true, burn: (S, o) => o.clamped ? 1.0 : 0, tools: (S, o, t) => (o.state === 'up' && t === 'forceps' && !o.clamped) || (o.clamped && t === 'cautery') || (o.state === 'under' && t === 'sonar'),
  pt: (S, o) => o.clamped ? [o.x, o.y] : [o.x0, o.y0], catchAnywhere: true });
// the burn finishes a barb, not the creature: undo its 'done' flag as it happens
const legBurnOK = G.OBJ.legato; legBurnOK.onDone = null;
Op.undoneBurn = true;
// ---------- Tremolo (first boss)
def('tremolo', { drain: (S, o) => .6 * o.amp, label: 'Tremolo', strain: true, req: true, init(S, o, sp) { o.amp = 1; o.stage = 1; o.bp = 0; o.reeds = []; o.flare = 0; o.wake = 6; o.pins = 0; o.depth = 40; o.prog = 0; o.ax = [1, 0]; o.maxSpeed = 50; o.crawl = 0; o.free = false; o.sr = 14; o.par = 6;
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + .3, r = Op.add(S, 'reed', { x: o.x + Math.cos(a) * 34, y: o.y + Math.sin(a) * 34, parent: o.id, a }); o.reeds.push(r.id); } o.x0 = o.x; o.y0 = o.y; },
  tick(S, o, dt) { if (o.flare > 0) o.flare -= dt; if (o.stage === 1 && o.amp <= .2) { o.stage = 2; ev(S, 'crack', o.x, o.y); }
    if (o.stage === 2) { o.wake -= dt; if (o.wake <= 0) { o.wake = 6 / sm(); const r = o.reeds.map(id => Op.byId(S, id)).filter(r => r && r.asleep > 0); if (r.length) { r[0].asleep = 0; o.amp = Math.min(1, o.amp + .2); ev(S, 'wake', r[0].x, r[0].y); } } if (o.bp > .5) { o.crawl += dt; if (o.crawl > 4) { o.crawl = 0; Op.add(S, 'laceration', { x: o.x + (rnd(S) - .5) * 30, y: o.y + 18, r: 8, noBleed: true, ph: S.ph }); } } }
    if (o.stage === 2 && o.bp >= 1) { o.stage = 3; o.bp = 0; ev(S, 'stage3', o.x, o.y); } },
  partial: true, burn: (S, o) => o.stage === 2 && o.amp <= .2 ? 3 * hp() : 0, grip: (S, o) => o.stage === 3, tools: (S, o, t) => (o.stage === 2 && t === 'cautery' && o.amp <= .2) || (o.stage === 3 && t === 'forceps'), pt: (S, o) => [o.x, o.y], catchAnywhere: true,
  onDone(S, o) { /* burned: the stage machine moves on, the creature lives until pulled */ },
  release(S, o, p, g) { o.done = true; Op.award(S, p, o.x, o.y, g.tears ? 'Clean' : 'Textbook', 300); ev(S, 'caught', o.x, o.y, 'tremolo'); },
  letgo() {} });
// burning must not finish tremolo: wrap tick so done is undone when stage 2 -> 3
const trTick = G.OBJ.tremolo.tick; G.OBJ.tremolo.tick = (S, o, dt) => { if (o.done && o.stage === 2) { o.done = false; } trTick(S, o, dt); };
G.OBJ.tremolo.burn = (S, o) => (o.stage === 2 && o.amp <= .2 ? 3 * hp() : 0);
Op.listen = S => { for (const o of S.objs) if (o.type === 'beatHook') {} };
def('reed', { label: 'reed', strain: true, req: false, init(S, o) { o.asleep = 0; o.sr = 8; }, sed: (S, o) => { const t = Op.byId(S, o.parent); return t && !(o.asleep > 0) && t.stage <= 2; }, tools: (S, o, t) => { const tr = Op.byId(S, o.parent); return t === 'syringe' && tr && !(o.asleep > 0) && tr.flare > 0; },
  dose(S, o, p, grade, e) { const t = Op.byId(S, o.parent); if (t && t.flare > 0) { t.amp = Math.max(0, t.amp - .2 * e); o.asleep = 1; ev(S, 'reedsed', o.x, o.y); Op.award(S, p, o.x, o.y, grade, 100); } else { Op.add(S, 'laceration', { x: o.x + 10, y: o.y + 10, r: 8, ph: S.ph, noBleed: true }); S.vitals -= 2 * T('strainDmg'); ev(S, 'spit', o.x, o.y); } },
  tick(S, o, dt) { const t = Op.byId(S, o.parent); if (!t || t.done) { o.done = true; } } });
// tremolo's beat: flare .3 s after each heartbeat
Op.beatHooks = (S) => { for (const o of S.objs) { if (o.type === 'tremolo') o.flare = .3; if (o.type === 'fermata') {} } };
// ---------- Da Capo
def('lobe', { partial: true, drain: .25, label: 'lobe', strain: true, req: true, init(S, o, sp) { o.k = sp.k; o.per = { A: 6, B: 7, C: 9 }[sp.k]; o.win = { A: 2.5, B: 2.5, C: 3 }[sp.k]; o.dead = false; o.stage = 0; o.depth = 22; o.prog = 0; o.ax = [0, -1]; o.par = 3; o.sr = 12; o.cut = false; o.sedd = false; o.sal = 0; o.sx = 1; o.open = false; },
  tick(S, o, dt) { if (o.bp >= 1 && !o.dead) Op.lobeDie(S, o, null); const per = o.per / (S.speedUp || 1); o.open = !o.dead && ((S.t + (o.k === 'B' ? 1.5 : o.k === 'C' ? 3 : 0)) % per) < o.win; if (o.dead) return; },
  slash: (S, o) => o.k === 'B' && o.open && !o.cut, onSlash(S, o, p) { Op.award(S, p, o.x, o.y, 'Clean', 100); },
  burn: (S, o) => (o.open && o.k === 'A') ? 1 : 0,
  sed: (S, o) => o.k === 'C' && o.open && !o.sedd, dose(S, o, p, g) { o.sedd = true; o.r = 16; G.cellsFor(o); ev(S, 'sedated', o.x, o.y); Op.award(S, p, o.x, o.y, g, 80); },
  grip: (S, o) => o.k === 'B' && o.cut && o.open, tools: (S, o, t) => !o.dead && o.open && ((o.k === 'A' && t === 'cautery') || (o.k === 'B' && ((t === 'scalpel' && !o.cut) || (t === 'forceps' && o.cut))) || (o.k === 'C' && ((t === 'syringe' && !o.sedd) || (t === 'salve' && o.sedd)))), pt: (S, o) => [o.x, o.y], catchAnywhere: true,
  release(S, o, p, g) { Op.lobeDie(S, o, p); }, onDone(S, o, p) { if (o.k === 'C') { o.done = false; Op.lobeDie(S, o, p); } } });
Op.lobeDie = (S, o, p) => { o.cells = null; o.sedd = false; o.dead = true; o.done = false; o.free = false; o.bp = 0; o.prog = 0; o.cut = false; const dc = S.objs.find(q => q.type === 'dacapo'); if (dc && !dc.cd) { dc.cd = 10; ev(S, 'dccount'); } ev(S, 'lobedead', o.x, o.y); Op.award(S, p, o.x, o.y, 'Clean', 160); };
def('dacapo', { label: 'Da Capo', req: true, hidden: true, init(S, o, sp) { o.round = sp.round || 1; o.cd = 0; S.speedUp = o.round === 2 ? 2 : 1; const xs = [130, 213, 296]; ['A', 'B', 'C'].forEach((k, i) => Op.add(S, 'lobe', { k, x: xs[i], y: 110 + (i === 1 ? -20 : 18), ph: S.ph })); if (o.round === 2) Op.add(S, 'nest', { x: 213, y: 170, hid: false, ph: S.ph, cap: 2 }); },
  tick(S, o, dt) { const lobes = S.objs.filter(l => l.type === 'lobe'); if (lobes.length && lobes.every(l => l.dead)) { for (const l of lobes) { l.done = true; l.dead = true; } S.objs.filter(b => b.type === 'bead' || b.type === 'nest').forEach(b => b.done = true); o.done = true; S.speedUp = 1; ev(S, 'dcwon'); return; }
    if (o.cd > 0) { o.cd -= dt; if (o.cd <= 0) { o.cd = 0; for (const l of lobes) if (l.dead) { l.dead = false; l.cut = false; l.sedd = false; l.bp = 0; l.prog = 0; l.free = false; } S.vitals = Math.max(1, S.vitals - 8); ev(S, 'repeat'); } } } });
// ---------- Fermata
def('fermata', { drain: .2, label: 'Fermata', strain: true, init(S, o, sp) { o.stage = 1; o.domes = []; o.nextDome = 2; o.eye = 0; o.hits = 0; o.bp = 0; o.depth = 30; o.prog = 0; o.ax = [0, -1]; o.maxSpeed = 24; o.free = false; o.sr = 10; o.par = 8; },
  tick(S, o, dt) {
    for (const d of o.domes) { d.age += dt; if (d.age >= 5 && !d.gone) { d.gone = true; if (o.stage === 1 && o.hits < 3) { o.eye = .7; ev(S, 'eyeopen', o.x, o.y); } } }
    o.domes = o.domes.filter(d => !d.gone || d.age < 5.3); if (o.stage === 1) { o.nextDome -= dt; if (o.nextDome <= 0 && o.domes.filter(d => !d.gone).length < 3) { o.nextDome = 4 / sm(); const a = rnd(S) * 6.283; const x = clamp(o.x + Math.cos(a) * (50 + rnd(S) * 60), 70, 356), y = clamp(o.y + Math.sin(a) * (30 + rnd(S) * 30), 60, 176); o.domes.push({ x, y, r: 34, age: 0 }); ev(S, 'dome', x, y); } }
    for (const q of S.objs) if (q !== o && !q.done && q.type !== 'pool') q.paused = o.domes.some(d => !d.gone && hyp(d.x - q.x, d.y - q.y) < d.r) ? true : false; // everything inside waits
    if (o.eye > 0) o.eye -= dt; if (o.stage === 1 && o.hits >= 3) { o.stage = 2; o.hid = true; o.domes = []; const a = Op.scatter(S, 1, { margin: 50 })[0]; o.x = a[0]; o.y = a[1]; o.x0 = o.x; o.y0 = o.y; ev(S, 'flee', o.x, o.y); for (let i = 0; i < 2; i++) Op.add(S, 'legato', { gen: 1, which: i, ph: S.ph }); }
    if (o.stage === 2 && o.mk > S.rt && !S.objs.some(q => q.type === 'legato' && !q.done)) { o.hid = false; o.stage = 3; ev(S, 'stage3', o.x, o.y); }
  },
  partial: true, burn: (S, o) => o.stage === 1 && o.eye > 0 ? .3 : 0, burning(S, o) {}, grip: (S, o) => o.stage === 3, tools: (S, o, t) => (o.stage === 1 && t === 'cautery' && o.eye > 0) || (o.stage === 3 && t === 'forceps') || (o.stage === 2 && t === 'sonar'), pt: (S, o) => [o.x, o.y], catchAnywhere: true,
  onDone(S, o) { /* each burn is one of three */ }, release(S, o, p, g) { o.done = true; Op.award(S, p, o.x, o.y, g.tears ? 'Clean' : 'Textbook', 300); ev(S, 'caught', o.x, o.y, 'fermata'); } });
G.OBJ.fermata.burn = (S, o) => (o.stage === 1 && o.eye > 0 ? .3 : 0);
const fTick = G.OBJ.fermata.tick; G.OBJ.fermata.tick = (S, o, dt) => { if (o.stage === 1 && o.bp >= 1) { o.bp = 0; o.hits++; o.eye = 0; ev(S, 'eyehit', o.x, o.y); Op.award(S, null, o.x, o.y, 'Clean', 100); } fTick(S, o, dt); };
Op.domeAt = (S, x, y) => { for (const o of S.objs) if (o.type === 'fermata') for (const d of o.domes) if (!d.gone && hyp(d.x - x, d.y - y) < d.r) return true; return false; };
// ---------- Cantor (final)
def('cantor', { label: 'Cantor', req: true, strain: false, init(S, o, sp) { o.mov = sp.mov || 1; o.t = 0; o.beat = 0; o.stage = 0; o.cnt = 0; o.rw = 0; o.next = 20; o.sedd = 0; o.static = 0; o.step = 0; Op.cantorEnter(S, o); },
  tick(S, o, dt) { Op.cantorTick(S, o, dt); } });
Op.cantorEnter = (S, o) => {
  const m = o.mov; S.clock += m > 1 ? 120 : 0;
  if (m === 1) { for (let i = 0; i < 3; i++) Op.add(S, 'tendril', { x: 90 + i * 120, y: 70 + (i % 2) * 90, ph: S.ph }); for (let i = 0; i < 3; i++) Op.add(S, 'mouth', { x: 80 + i * 130, y: 160 - (i % 2) * 95, ph: S.ph }); Op.add(S, 'nest', { x: 213, y: 170, hid: false, ph: S.ph, cap: 2 }); }
  if (m === 2) { Op.add(S, 'voicebox', { x: 213, y: 100, ph: S.ph }); S.hush = true; }
  if (m === 3) { S.hush = false; o.next = 12; }
  if (m === 4) { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * 5.2 + .5, r = 8 + i / 40 * 56; pts.push([213 + Math.cos(a * 1.4) * r * 1.6, 116 + Math.sin(a * 1.4) * r * .85]); } Op.add(S, 'spiral', { pts, ph: S.ph }); S.hush = false; }
};
Op.cantorTick = (S, o, dt) => {
  o.t += dt; const m = o.mov;
  if (m === 1) { const left = S.objs.filter(q => (q.type === 'tendril' || q.type === 'mouth') && !q.done).length; if (!left) { S.objs.filter(q => q.type === 'bead' || q.type === 'nest').forEach(q => q.done = true); o.done = true; } o.beat -= dt; if (o.beat <= 0) { o.beat = 3.2 / sm(); if (S.objs.filter(q => q.type === 'bleeder' && !q.done).length < 3) { const [p] = Op.scatter(S, 1, { sep: 40 }); Op.add(S, 'bleeder', { x: p[0], y: p[1], ph: S.ph }); } } }
  if (m === 2) { const vb = S.objs.find(q => q.type === 'voicebox'); S.static = ((S.t % 30) < 15) ? 1 : 0; S.hush = true; if (!vb) { S.static = 0; S.hush = false; o.done = true; } }
  if (m === 3) { const rp = S.objs.find(q => q.type === 'repeat'); o.next -= dt; if (!rp && o.next <= 0 && o.cnt < 6) { Op.add(S, 'repeat', { x: 213, y: 116, ph: S.ph }); ev(S, 'windup'); }
    if (rp && rp.done && rp.byPlayer) { o.cnt++; o.next = 14; ev(S, 'cantorcount', o.cnt); Op.award(S, null, 213, 116, 'Textbook', 150); }
    if (o.cnt >= 6) { S.objs.filter(q => q.type === 'repeat').forEach(q => q.done = true); o.done = true; } }
  if (m === 4) { /* the spiral and the note are objects */ const sp = S.objs.find(q => q.type === 'spiral'), nt = S.objs.find(q => q.type === 'note'); if (!sp && !nt && !o.noted) { o.noted = true; S.hush = true; Op.add(S, 'note', { x: 213, y: 116, ph: S.ph }); } if (!sp && !nt && o.noted) { o.done = true; } }
};
def('tendril', { drain: .1, label: 'baton tendril', strain: true, slash: (S, o) => o.open, sr: 11, init(S, o) { o.open = false; o.cyc = rnd(S) * 3; o.sr = 12; }, tick(S, o, dt) { o.cyc += dt * sm(); o.open = (o.cyc % 3.2) > 2.3; }, onSlash(S, o, p) { o.done = true; Op.award(S, p, o.x, o.y, 'Clean', 120); ev(S, 'tendrildead', o.x, o.y); }, tools: (S, o, t) => t === 'scalpel' && o.open, pt: (S, o) => [o.x, o.y] });
def('mouth', { drain: .2, label: 'mouth', strain: true, burn: () => 1.5 * hp(), tools: sameTool('cautery'), init(S, o) { o.sing = 0; } , tick(S, o, dt) { o.sing = (o.sing || 0) + dt; } });
def('voicebox', { drain: .4, label: 'voice box', strain: true, hid: true, init(S, o) { o.hid = true; o.need = 3; o.sedN = 0; o.win = 0; o.cyc = 0; o.sr = 10; },
  tick(S, o, dt) { o.cyc += dt; o.win = (o.cyc % 2.4) < .7 ? 1 : 0; if (o.sedN >= 3) { o.done = true; ev(S, 'voiceboxdead', o.x, o.y); } },
  sed: (S, o) => true, tools: (S, o, t) => t === 'syringe' && o.win, dose(S, o, p, g) { if (o.win) { o.sedN++; o.cyc = 0; Op.award(S, p, o.x, o.y, g, 200); ev(S, 'sedated', o.x, o.y); const a = rnd(S) * 6.28; o.x = clamp(o.x + Math.cos(a) * 80, 80, 346); o.y = clamp(o.y + Math.sin(a) * 40, 70, 170); o.hid = true; o.mk = 0; } else { S.vitals -= 3; ev(S, 'spit', o.x, o.y); } } });
def('repeat', { label: 'repeat sign', strain: true, req: true, init(S, o) { o.age = 0; o.sr = 30; o.open = true; }, slash: (S, o) => true, onSlash(S, o, p) { o.done = true; o.byPlayer = true; Op.award(S, p, o.x, o.y, 'Textbook', 150); ev(S, 'repeatcut', o.x, o.y); }, tools: (S, o, t) => t === 'scalpel', pt: (S, o) => [o.x, o.y],
  tick(S, o, dt) { o.age += dt; if (o.age >= 3) { // it rewinds the field six seconds, unless the player's Second Look just answered
      const c = S.objs.find(q => q.type === 'cantor'); o.done = true; o.byPlayer = false; if (S.ghosts && S.sl > -0.5 && S.rewound && o.countered) {} const k = S.buf.findIndex(b => b.rt >= S.rt - 6); if (k >= 0) { const e = S.buf[k], keep = { steady: S.steady, doc: S.doc }; const cn = c ? c.cnt : 0, cx = c ? c.next : 14; const ch = S.chk, buf = S.buf.slice(0, k), pls = S.pl.map(p => [p.x, p.y]); Op.restore(S, e.st); S.buf = buf; S.chk = ch; S.steady = keep.steady; S.pl.forEach((p, i) => { p.x = pls[i][0]; p.y = pls[i][1]; p.g = null; }); const c2 = S.objs.find(q => q.type === 'cantor'); if (c2) { c2.cnt = cn; c2.next = 20; } S.objs.filter(q => q.type === 'repeat').forEach(q => q.done = true); S.cantorRewound = S.rt; ev(S, 'cantorrewind'); } } } });
// second look right after the Cantor's rewind counters it
const oldGift = Op.gift; Op.gift = (S, def) => { const before = S.rewound || 0, cr = S.cantorRewound; oldGift(S, def); if ((S.rewound || 0) > before && cr != null && S.rt - cr < 5) { const c = S.objs.find(q => q.type === 'cantor'); if (c) { c.cnt++; ev(S, 'cantorcount', c.cnt); } S.cantorRewound = null; } };
def('spiral', { label: 'last note guide', init(S, o, sp) { o.pts = sp.pts; o.len = geo.polyLen(o.pts); o.prog = 0; o.cut = false; o.x = o.pts[0][0]; o.y = o.pts[0][1]; o.spiral = true; }, tools: (S, o, t) => t === 'scalpel', pt: (S, o) => geo.polyAt(o.pts, o.prog) });
def('note', { label: 'the Last Note', init(S, o) { o.ax = [0, -1]; o.depth = 70; o.prog = 0; o.maxSpeed = 40; o.par = 12; o.hold = 0; o.free = false; o.sr = 12; }, grip: () => true, tools: sameTool('forceps'), pt: (S, o) => [o.x0, o.y0], catchAnywhere: true,
  carry(S, o, p, dt) { if (o.prog >= o.depth - .5) { o.hold += dt; S.holdSilence = o.hold; if (o.hold >= 3) { o.done = true; for (const q of S.pl) q.g = null; Op.award(S, p, o.x, o.y, 'Textbook', 400); ev(S, 'noteheld'); } } }, release() {} });
// spiral: the stroke may only advance between beats (on the beat is a slip). Handled in tools via hook.
G.beatWindow = S => (S.hb > .08 && S.hb < .85);
})();
