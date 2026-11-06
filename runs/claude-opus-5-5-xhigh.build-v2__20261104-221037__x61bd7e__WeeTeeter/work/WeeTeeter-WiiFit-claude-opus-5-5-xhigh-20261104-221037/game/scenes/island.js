/* scenes/island.js: The Institute for Gentle Improvement, on Lumbar Island. Walk, talk, stand on a mat. Motto on every sign. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const CELL = 16, SPEED = 132;
const COL = { sea: [73, 182, 201], grass: [150, 214, 139], sand: [244, 231, 196], pier: [201, 174, 136], snow: [240, 248, 252], path: [236, 222, 192], deck: [224, 196, 158], iron: [238, 244, 244], park: [176, 224, 160] };
const floorTex = (x, y, tag) => {
  const c = COL[tag] || COL.grass, n = E.hash2 ? E.hash2(Math.floor(x / 2), Math.floor(y / 2)) : 0;
  if (tag === 'pier' || tag === 'deck') { const line = (Math.floor(y) % 8 === 0) ? -26 : 0, jit = (n - .5) * 8; return [c[0] + line + jit, c[1] + line + jit, c[2] + line + jit]; }
  if (tag === 'iron') { const line = (Math.floor(x) % 16 === 0 || Math.floor(y) % 16 === 0) ? -14 : 0; return [c[0] + line, c[1] + line, c[2] + line]; }
  if (tag === 'sea') { const w = Math.sin(x * .12 + Math.sin(y * .08) * 2) * 8 + (n - .5) * 4; return [c[0] - 12 + w, c[1] - 8 + w, c[2] - 2 + w]; }
  const jit = (n - .5) * (tag === 'grass' || tag === 'park' ? 16 : 7); return [c[0] + jit, c[1] + jit, c[2] + jit];
};
/** builds the map and the places on it, once */
const Isl = G.Island = {
  built: false,
  build() {
    if (Isl.built) return; Isl.built = true;
    const D = G.DATA.island, legend = { '~': { floor: 'sea', block: true }, ',': { floor: 'grass' }, '.': { floor: 'sand' }, '=': { floor: 'pier' }, '^': { floor: 'snow' }, 'p': { floor: 'path' }, 'd': { floor: 'deck' }, 'i': { floor: 'iron' }, 'k': { floor: 'park' }, 'R': { tile: 1, floor: 'grass' }, 'B': { tile: 2, floor: 'grass' }, 'J': { tile: 3, floor: 'grass' }, 'E': { floor: 'path', spawn: 'scale' }, '@': { floor: 'path', spawn: 'door' }, 'Z': { floor: 'grass', spawn: 'bed' }, 'W': { floor: 'path', spawn: 'rail' } };
    for (const k in D.mats) legend[k] = { floor: D.floors[k], spawn: 'mat_' + D.mats[k] };
    for (const k in D.people) legend[k] = { floor: 'grass', spawn: 'p_' + D.people[k] };
    Isl.map = new E.TileMap({ rows: D.rows, legend, ao: 4, outside: '#2f97ad', floorTex,
      types: { 1: { h: 32, top: '#ff9a7a', side: '#fbf6ec', face: 'plaster', roof: 'tiles', windows: { w: 6, h: 8, step: 22, from: 10 } }, 2: { h: 28, top: '#7fd8ea', side: '#fbf6ec', face: 'plaster', roof: 'tiles', windows: { w: 6, h: 8, step: 20, from: 9 }, door: { chance: .3, color: '#c49c6c' } }, 3: { h: 12, top: '#f5c84b', side: '#e8a07a', face: 'plank', roof: 'plain' } } });
    const map = Isl.map; Isl.flow = new E.FlowField(map);
    Isl.mats = []; for (const k in D.mats) { const id = D.mats[k], s = map.find('mat_' + id); Isl.mats.push({ kind: 'mat', id, x: s.x, y: s.y, r: 18, label: G.activities[id].short || G.activities[id].name }); }
    Isl.people = [];
    for (const k in D.people) { const id = D.people[k], s = map.find('p_' + id), rig = G.regularRig(id === 'twins' ? 'twin1' : id, 1.05), pe = { kind: 'person', id, x: s.x, y: s.y, r: 15, label: G.DATA.lines.regulars[id].name, rig, hx: s.x, hy: s.y, ph: E.hash2 ? E.hash2(s.x, s.y) * 6 : 0 }; pe.poser = new G.Poser(rig); if (id === 'twins') { pe.rig2 = G.regularRig('twin2', 1.05); } Isl.people.push(pe); }
    Isl.scale = Object.assign(map.find('scale'), { kind: 'tare', id: 'tare', r: 15, label: 'Tare' });
    Isl.bed = Object.assign(map.find('bed'), { kind: 'bed', id: 'bed', r: 16, label: 'Bed' });
    Isl.rail = Object.assign(map.find('rail'), { kind: 'rail', id: 'rail', r: 13, label: 'The rail' });
    Isl.door = map.find('door');
    /* the scatter: a little of everything */
    const rng = E.rng(4242); Isl.scatter = [];
    const R = D.rows;
    for (let i = 0; i < 260; i++) { const cx = Math.floor(rng() * 44), cy = Math.floor(rng() * 26), ch = R[cy][cx], x = cx * CELL + 8 + (rng() - .5) * 10, y = cy * CELL + 8 + (rng() - .5) * 10, v = rng();
      if (ch === ',') { if (v < .22) Isl.scatter.push({ p: 'palm', x, y, s: 1.3, solid: true }); else if (v < .42) Isl.scatter.push({ p: 'bush', x, y, s: .9 }); else if (v < .78) Isl.scatter.push({ p: 'flowers', x, y, s: 1 }); else Isl.scatter.push({ p: 'grass', x, y, s: 1 }); }
      else if (ch === '^') { if (v < .55) Isl.scatter.push({ p: 'pine', x, y, s: 1.2 + v }); else Isl.scatter.push({ p: 'rock', x, y, s: .8, color: '#dbe7ea' }); }
      else if (ch === '.') { if (v < .22) Isl.scatter.push({ p: 'palm', x, y, s: 1.2 }); else if (v < .4) Isl.scatter.push({ p: 'rock', x, y, s: .6, color: '#c8b89a' }); } }
    Isl.scatter = Isl.scatter.filter(s => !Isl.mats.concat(Isl.people, [Isl.scale, Isl.bed, Isl.rail]).some(q => Math.hypot(q.x - s.x, q.y - s.y) < 22));
    Isl.lamps = [[18, 9], [26, 12], [18, 11], [31, 9], [24, 18], [20, 18], [30, 22]].map(([cx, cy]) => ({ x: cx * CELL + 8, y: cy * CELL + 8 }));
    Isl.glints = []; for (let i = 0; i < 120; i++) { const cx = Math.floor(rng() * 44), cy = Math.floor(rng() * 26); if (R[cy][cx] === '~') Isl.glints.push({ x: cx * CELL + rng() * 16, y: cy * CELL + rng() * 16, k: rng() * 6 }); }
    Isl.signs = [{ x: 24 * CELL, y: 10 * CELL, t: G.DATA.lines.motto }, { x: 28 * CELL, y: 2.7 * CELL, t: 'Stillness Deck' }, { x: 36 * CELL, y: 9.6 * CELL, t: 'Iron Room' }, { x: 38 * CELL, y: 19.2 * CELL, t: 'Aerobics Pier' }, { x: 9 * CELL, y: 19 * CELL, t: 'Balance Park' }, { x: 13 * CELL, y: 13.5 * CELL, t: 'Bungalow' }, { x: 14.5 * CELL, y: 16.5 * CELL, t: 'Juice Bar' }, { x: 15.5 * CELL, y: 7 * CELL, t: 'Reception' }, { x: 10.5 * CELL, y: 9 * CELL, t: G.DATA.lines.sign.mount }];
    Isl.signW = q => Math.max(E.font.width(q.t), G.signH(q.t) > 13 ? E.font.width(G.DATA.lines.motto) : 0) + 10;
    Isl.scatter = Isl.scatter.filter(t => !Isl.signs.some(q => Math.abs(t.x - q.x) < Isl.signW(q) / 2 + 8 && t.y > q.y - 8 && t.y < q.y + 44));
  },
  /** the regulars walk small loops */
  updatePeople(dt) {
    for (const p of Isl.people) {
      p.ph += dt * .35;
      if (p.id === 'lou') { p.poser.clip('Sleeping', { loop: true, tgt: 1.57 }); p.poser.update(dt); p.rig.update(dt, { x: p.x, y: p.y, z: 0, vx: 0, vy: 0, facing: p.poser.facing }); continue; }
      const k = p.id === 'marisol' ? 28 : p.id === 'gertrude' ? 0 : 6, nx = p.hx + Math.cos(p.ph) * k, ny = p.hy + Math.sin(p.ph * (p.id === 'marisol' ? 2 : 1)) * k * .5, vx = (nx - p.x) / Math.max(dt, .001), vy = (ny - p.y) / Math.max(dt, .001); p.x = nx; p.y = ny;
      p.rig.update(dt, { x: p.x, y: p.y, z: 0, vx: k ? vx : 0, vy: k ? vy : 0, facing: k ? Math.atan2(vy, vx) : 1.57, expr: 'smile' });
      if (p.rig2) { p.rig2.update(dt, { x: p.x + 14, y: p.y, z: 0, vx, vy, facing: Math.atan2(vy, vx), expr: 'smile' }); }
    }
  },
  drawWorld(r, o = {}) {
    const map = Isl.map, t = game.real;
    map.drawFloor(r);
    /* the sea glints */
    r.decal(g => { for (const q of Isl.glints) if (Math.sin(t * 1.2 + q.k) > .45) { const p = r.w(q.x, q.y, 0); px.rect(g, p[0], p[1], 5, 1, '#b8ecf2'); } });
    map.queueWalls(r);
    for (const s of Isl.scatter) r.prop(s.p, s.x, s.y, 0, { size: s.s, color: s.color });
    /* mats */
    r.decal(g => {
      for (const m of Isl.mats) {
        const open = o.allOpen || G.activityOpen(m.id), a = r.w(m.x - 16, m.y - 9, 0), b = r.w(m.x + 16, m.y + 9, 0), dcol = { Stillness: '#b08be0', Strength: '#ff7a59', Cardio: '#2cc6e6', Balance: '#6fcf8e' }[G.activities[m.id].discipline], glow = .5 + .5 * Math.sin(t * 2.4 + m.x), hov = o.focus === m;
        px.rect(g, a[0] - 3, a[1] - 3, b[0] - a[0] + 6, b[1] - a[1] + 6, hov ? '#ffffff' : open ? E.mix(dcol, '#ffffff', glow * .6) : '#c8d0d4');
        px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], open ? dcol : '#a8b4ba');
        px.rect(g, a[0] + 3, a[1] + 3, b[0] - a[0] - 6, 1, '#ffffff'); px.rect(g, a[0] + 3, b[1] - 4, b[0] - a[0] - 6, 1, '#ffffff');
      }
    });
    for (const m of Isl.mats) { const st = G.S.best[m.id] ? G.bestStars(m.id) : 0; if (st && !o.demo) r.textAt(m.x, m.y, 2, '★'.repeat(st), '#ffb020'); if (G.S.suggestion === m.id && !G.S.freePlay && !o.demo) r.queue(m.x, m.y - 1, 22, g => { const p = r.w(m.x, m.y, 20 + Math.sin(t * 3) * 3); E.font.text(g, '★', p[0], p[1], '#ffb020', { align: 'center', scale: 2, outline: false, shadow: '#a06a10' }); }); }
    /* the scale's mat, the bed, the rail */
    if (Isl.scale) { r.decal(g => { const a = r.w(Isl.scale.x - 13, Isl.scale.y - 7, 0), b = r.w(Isl.scale.x + 13, Isl.scale.y + 7, 0); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#bfeee0'); }); }
    r.shape('bed', Isl.bed.x, Isl.bed.y, 0, { facing: Math.PI / 2 });
    r.queue(Isl.rail.x, Isl.rail.y, 0, g => { const p = r.w(Isl.rail.x, Isl.rail.y, 0); px.rect(g, p[0] - 16, p[1] - 28, 2, 28, '#7a8a94'); px.rect(g, p[0] + 14, p[1] - 28, 2, 28, '#7a8a94'); px.rect(g, p[0] - 16, p[1] - 28, 32, 2, '#7a8a94'); for (const [k, u] of [['towel', '#ffffff'], ['headband', '#2cc6e6'], ['sunhat', '#f6e7b8'], ['hat', '#c9b8e8']].map((v, i) => [v[0], v[1], i]).map(a => [a[0], a[1]])) { const i = ['towel', 'headband', 'sunhat', 'hat'].indexOf(k), on = o.demo || G.unlocked(k); px.rect(g, p[0] - 13 + i * 7, p[1] - 26, 5, on ? 11 : 3, on ? u : '#c8d0d4'); } });
    /* a few benches, lamps and signs */
    r.shape('bench', Isl.people.find(q => q.id === 'lou').x, Isl.people.find(q => q.id === 'lou').y - 2, 0, { facing: Math.PI / 2 });
    for (const l of Isl.lamps) r.prop('streetlamp', l.x, l.y, 0, { size: .9, light: G.L.enabled && G.L.ambient < .8, halo: G.L.enabled && G.L.ambient < .8 });
    for (const s of Isl.signs) r.queue(s.x, s.y, 0, g => { const p = r.w(s.x, s.y, 0); px.rect(g, p[0] - 1, p[1] - 11, 2, 11, '#a57f54'); G.signBoard(g, p[0], p[1] - 11 - G.signH(s.t), s.t); });
    /* the juice bar's blender and olives */
    { const jx = 21.5 * CELL, jy = 15.5 * CELL; r.queue(jx, jy + 12, 12, g => { const p = r.w(jx - 22, jy, 12); px.rect(g, p[0] - 4, p[1] - 4, 8, 4, '#7a8a94'); px.poly(g, [[p[0] - 5, p[1] - 15], [p[0] + 5, p[1] - 15], [p[0] + 3, p[1] - 4], [p[0] - 3, p[1] - 4]], '#bfeee0'); const q = r.w(jx + 18, jy, 12); px.rect(g, q[0] - 5, q[1] - 12, 10, 12, '#dff4f0'); px.rect(g, q[0] - 6, q[1] - 14, 12, 2, '#c49c6c'); for (let i = 0; i < 4; i++) px.disc(g, q[0] - 3 + (i % 2) * 5, q[1] - 3 - (i >> 1) * 4, 2, '#7b9a3a'); const u = r.w(jx, jy, 12); px.rect(g, u[0] - 1, u[1] - 30, 2, 30, '#a57f54'); px.poly(g, [[u[0] - 24, u[1] - 28], [u[0] + 24, u[1] - 28], [u[0], u[1] - 44]], '#ff9a7a'); px.line(g, u[0] - 24, u[1] - 28, u[0] + 24, u[1] - 28, '#ffffff'); }); }
    /* the Regulars */
    for (const p of Isl.people) { G.drawRig(r, p.rig, p.x, p.y, 0, { pick: p }); if (p.rig2) G.drawRig(r, p.rig2, p.x + 14, p.y, 0); }
  }
};

let body, rig, tare, wx, wy, goal, focus = null, idle = 0, mode = 'walk', pills = null, said = false, mouseT = -1, hint = null, hintT = 0, walkT = 0;
const spots = () => Isl.mats.concat(Isl.people, [Isl.scale, Isl.bed, Isl.rail]);
function nearestSpot(x, y, reach) { let best = null, bd = 1e9; for (const q of spots()) { const d = Math.hypot(q.x - x, q.y - y); if (d < (reach === undefined ? q.r : reach) && d < bd) { bd = d; best = q; } } return best; }
function interact(q) {
  goal = null; body.vx = body.vy = 0;
  if (q.kind === 'mat') {
    if (!G.activityOpen(q.id)) { hint = G.line('notes.opensLater', { a: G.activities[q.id].name, d: G.DATA.openOn(q.id) }); hintT = 3.5; G.A.sfx('back'); return; }
    G.Save.save(); G.playActivity(q.id, { from: 'island' });
  } else if (q.kind === 'person') {
    const L = G.DATA.lines.regulars[q.id], line = L.lines[(G.S.day + (q.chat = (q.chat || 0) + 1)) % L.lines.length];
    if (q.id === 'twins') G.say('twins', [L.lines[0], L.lines[1], L.lines[2 + (G.S.day % 2)]]); else G.say(q.id, line);
  } else if (q.kind === 'tare') {
    q.chat = (q.chat || 0) + 1; G.say('tare', G.S.minutes >= 20 && !G.S.seen.bow ? (G.S.seen.bow = 1, G.DATA.lines.tare.bowTie) : q.chat % 3 === 1 ? G.line('tare.favorite') : q.chat % 3 === 2 && game.settings.tips ? G.line('tare.tips') : G.line('tare.gertrude'), { face: 'happy' }); tare.boop();
  } else if (q.kind === 'bed') {
    const left = 3 - G.S.session;
    if (G.S.freePlay) { G.S.session = 3; G.go('evening'); }
    else if (left > 0) { G.say('tare', G.line('tare.earlyBed'), { face: 'worried', choices: ['Go to bed', 'Stay up'], onChoice(i) { if (i === 0) { G.S.session = 3; G.go('evening'); } } }); }
    else G.go('evening');
  } else if (q.kind === 'rail') openRail();
}
function openRail() {
  const un = G.DATA.unlocks.filter(u => u.wear && G.unlocked(u.id));
  if (!un.length) { G.say('tare', G.DATA.lines.tare.railEmpty, { face: 'neutral' }); return; }
  mode = 'rail';
  const build = () => [...un.map(u => ({ label: u.name, sub: G.S.wear[u.id] ? 'Wearing it' : 'On the rail', id: u.id })), { label: 'Done', id: 'done' }];
  pills = new G.Pills(build(), { y: () => 20, x: () => game.W / 2 + 90, w: 160, h: 28, gap: 4, onPick(i, it) { if (it.id === 'done') { mode = 'walk'; return; } G.S.wear[it.id] = !G.S.wear[it.id]; rig = G.playerRig({ size: 1.05 }); pills.set(build()); G.Save.save(); }, onBack() { mode = 'walk'; } });
}
Isl.player = () => body;
G.scenes.island = {
  view: 'threequarter', camera: { zoom: false }, pausable: true,
  enter(d) {
    Isl.build(); const s = G.S; G.dbg.activity = null; mode = 'walk';
    const at = d && d.spot ? Isl.mats.find(m => m.id === d.spot) : null, st = at || Isl.door;
    body = new E.Body({ x: st.x, y: st.y + (at ? 16 : 6), r: 5 }); rig = G.playerRig({ size: 1.05 });
    tare = new G.TareBody(body.x - 18, body.y + 10); tare.scale = .9; goal = null; focus = null; idle = 0; hint = null;
    const phase = G.dayPhase(); G.setDayLight(phase); G.music(phase === 'dusk' ? 'islandDusk' : 'islandAM'); G.talk.close();
    game.cam.smooth = .15; game.cam.bounds = v => Isl.map.bounds(v); game.follow(null); game.focus(body.x, body.y, 10); game.cam.snap = true;
    if (G.pendingLine) { G.mutter('tare', G.pendingLine); G.pendingLine = null; }
    else if (s.nod && !s.seen.nod) { s.seen.nod = 1; G.say('gertrude', 'Mm.', { onDone() { G.mutter('tare', G.DATA.lines.tare.nod); } }); }
    else if (s.freePlay && !s.seen.after) { s.seen.after = 1; G.mutter('tare', G.line('tare.afterDays')); }
  },
  exit() { game.cam.bounds = null; game.cam.smooth = 0; G.L.enabled = false; },
  update(dt) {
    if (G.talk.update(dt)) { rig.update(dt, { x: body.x, y: body.y, z: 0, vx: 0, vy: 0, facing: rig.lastFacing || 1.57 }); tare.update(dt); return; }
    const I = game.input; Isl.updatePeople(dt); tare.update(dt, [body.x - 14, body.y + 12]);
    if (mode === 'rail') { pills.update(dt); rig.update(dt, { x: body.x, y: body.y, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); return; }
    const m = I.move(); let dir = game.view.screenDirToGround(m[0], m[1]);
    const moved = Math.hypot(dir[0], dir[1]) > .1;
    if (moved) { goal = null; idle = 0; }
    /* the mouse: hover highlights, a click walks there and interacts */
    let hover = null;
    if (I.mouse && I.mouse.active && I.lastDevice !== 'gamepad') {
      const P = I.pointer(); if (P && game.r) { const picked = game.r.pick ? game.r.pick(P[0], P[1]) : null, hit = picked && picked.find && picked.find(q => q && q.kind); hover = hit || null; if (!hover) { const mg = game.mouseGround(); if (mg) hover = nearestSpot(mg[0], mg[1], 16); } }
      if (I.mouse.t !== mouseT) { mouseT = I.mouse.t; idle = 0; }
    }
    const ck = I.clicked();
    if (ck) { idle = 0; if (hover) goal = { x: hover.x, y: hover.y, thing: hover }; else { const mg = game.mouseGround(); if (mg) goal = { x: mg[0], y: mg[1] }; } if (goal) { Isl.flow.update(goal.x, goal.y); walkT = 0; } }
    if (goal && !moved) {
      const dg = Math.hypot(goal.x - body.x, goal.y - body.y); walkT += dt;
      if (goal.thing && dg < goal.thing.r) { const q = goal.thing; goal = null; interact(q); }
      else if (dg < 6 || walkT > 7) goal = null;
      else { const dd = Isl.flow.dir(body.x, body.y, goal.x, goal.y); dir = dd && (dd[0] || dd[1]) ? dd : [(goal.x - body.x) / dg, (goal.y - body.y) / dg]; }
    }
    body.vx = dir[0] * SPEED; body.vy = dir[1] * SPEED; body.update(dt, Isl.map);
    const moving = Math.hypot(body.vx, body.vy) > 2 && (moved || goal);
    if (moving) rig.lastFacing = Math.atan2(body.vy, body.vx);
    rig.update(dt, { x: body.x, y: body.y, z: 0, vx: moving ? body.vx * .6 : 0, vy: moving ? body.vy * .6 : 0, facing: rig.lastFacing === undefined ? 1.57 : rig.lastFacing, expr: 'smile' });
    game.focus(body.x, body.y, 10);
    focus = hover && Math.hypot(hover.x - body.x, hover.y - body.y) < 500 ? hover : nearestSpot(body.x, body.y);
    const near = nearestSpot(body.x, body.y);
    if (near && I.pressed('interact')) { I.consumeAll(); interact(near); }
    hintT = Math.max(0, hintT - dt);
    idle += dt; if (idle > 30 && !G.S.freePlay) { idle = 0; G.mutter('tare', G.line('tare.idle')); }
  },
  draw(r) {
    const near = focus;
    Isl.drawWorld(r, { focus: near });
    if (G.L.enabled && G.L.ambient < .8) for (const l of Isl.lamps) G.L.add(l.x, l.y, 40, 90, .9, { color: '#ffb860' });
    G.drawRig(r, rig, body.x, body.y, 0);
    tare.draw(r, { scale: .9 });
    r.overlay(g => {
      for (const m of Isl.mats) { const p = r.w(m.x, m.y - 12, 0); if (p[0] > -40 && p[0] < r.W + 40 && p[1] > 0 && p[1] < r.H) txt(g, m.label, p[0], p[1] - 8, G.activityOpen(m.id) ? '#20404c' : '#7a8a94', { align: 'center', shadow: '#ffffff' }); }
      G.drawDayHud(g);
      if (mode === 'rail') { G.panel(g, game.W / 2 - 150, 20, 150, 124, { r: 8 }); txt(g, 'The rail', game.W / 2 - 75, 26, '#14a8c8', { align: 'center' }); const c = game.W / 2 - 75; G.drawGerald(g, c, 134, 1.6, { friend: G.S.minutes >= 30 }); txt(g, Math.floor(G.S.minutes) + ' minutes', c, 42, '#20404c', { align: 'center' }); const nx = G.DATA.unlocks.find(u => u.minutes > G.S.minutes); if (nx) G.wrapText(g, 'At ' + nx.minutes + ': ' + nx.name, c, 54, 136, '#5f7f8a', { align: 'center' }); pills.draw(g); G.prompts(g, [['confirm', 'Wear it'], ['cancel', 'Back']]); return; }
      if (near && !G.talk.open) {
        const open = near.kind !== 'mat' || G.activityOpen(near.id), verb = near.kind === 'mat' ? (open ? 'Stand on the mat' : 'Not yet') : near.kind === 'person' || near.kind === 'tare' ? 'Talk' : near.kind === 'bed' ? 'Go to bed' : 'Look';
        G.panel(g, game.W / 2 - E.font.width(near.label) / 2 - 8, 42, E.font.width(near.label) + 16, 15, { r: 7 });
        txt(g, near.label, game.W / 2, 46, '#20404c', { align: 'center' });
        G.prompts(g, [['interact', verb]]);
      } else if (!G.talk.open) G.prompts(g, [[game.input.lastDevice === 'gamepad' ? '=Left stick' : game.input.lastDevice === 'mouse' ? '=Click' : '=WASD', 'Walk']]);
      if (hintT > 0) { const w = Math.min(game.W - 40, 300); G.panel(g, (game.W - w) / 2, 62, w, 30, { r: 8 }); G.wrapText(g, hint, game.W / 2, 66, w - 16, '#20404c', { align: 'center' }); }
    });
    G.talk.draw(r);
  }
};
})();
