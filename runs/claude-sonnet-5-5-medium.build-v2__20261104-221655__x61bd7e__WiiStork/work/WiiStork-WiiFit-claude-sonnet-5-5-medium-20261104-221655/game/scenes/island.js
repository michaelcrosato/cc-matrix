// the island hub (threequarter), bungalow
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C, U = 16;
const W = 44, H = 26;
function genRows() {
  const g = Array.from({ length: H }, () => Array(W).fill('~')), inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (inEll(x, y, 22, 12, 20.5, 10.5)) g[y][x] = inEll(x, y, 22, 12, 19, 9) ? ',' : '.'; }
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };
  fill(3, 2, 9, 7, '^'); fill(20, 3, 33, 7, '='); fill(26, 16, 41, 21, '='); fill(13, 17, 18, 21, '.'); fill(6, 21, 24, 23, '.');
  // buildings: [x0,y0,x1,y1] walls with a door gap on the south side
  const bld = (x0, y0, x1, y1, doorX) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y === y0 || x === x0 || x === x1 || (y === y1 && x !== doorX && x !== doorX + 1)) g[y][x] = '#'; };
  bld(11, 6, 17, 9, 14); bld(30, 9, 41, 13, 35); bld(18, 13, 23, 15, 20); bld(4, 12, 10, 16, 7);
  return g.map(r => r.join(''));
}
const cellP = (cx, cy) => [cx * U + U / 2, cy * U + U / 2];
G.ISLAND = {
  mats: [['stork', 24, 5], ['flow', 27, 5], ['candle', 30, 5], ['squat', 33, 12], ['pushup', 36, 12], ['lunge', 39, 12], ['step', 29, 18], ['hoop', 33, 18], ['jog', 39, 18], ['tray', 12, 19], ['laundry', 16, 19], ['slalom', 8, 6]],
  npcs: [['gertrude', 25, 8, 'gertrude'], ['dennis', 21, 16, 'dennis'], ['marisol', 36, 20, 'marisol'], ['kevin', 36, 14, 'kevin'], ['okafor', 31, 20, 'okafor'], ['lou', 40, 17, 'lou'], ['twinA', 14, 22, 'twins'], ['twinB', 15, 22, 'twins']],
  tare: [14, 10], bed: [5, 14], rail: [9, 14], start: [14, 12]
};
const FLOORS = { grass: (x, y) => { const v = ((x >> 3) + (y >> 3)) & 1; return v ? [127, 208, 154] : [118, 200, 146]; }, sand: (x, y) => [236 - ((x + y) & 3), 222, 190], board: (x, y) => [217 - (y >> 2 & 1) * 6, 189 - (y >> 2 & 1) * 6, 150], sea: (x, y, t) => { const w = ((x >> 3) + (y >> 3) * 2) & 3; return [66 + w * 4, 176 + w * 3, 196]; }, snow: (x, y) => [244 - ((x >> 3) + (y >> 3) & 1) * 6, 250, 252] };
G.scenes.island = {
  pausable: true, view: 'threequarter', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT, propSize: 1.2,
  enter(d) {
    const S = G.S; this.t = 0; G.game.lights.enabled = G.time() !== 'noon'; G.game.lights.ambient = G.time() === 'morning' ? .92 : .62 + (G.time() === 'noon' ? .38 : 0); if (G.time() === 'noon') G.game.lights.enabled = false;
    this.map = new E.TileMap({ rows: genRows(), legend: { '~': { floor: 'sea', block: true }, ',': { floor: 'grass' }, '.': { floor: 'sand' }, '=': { floor: 'board' }, '^': { floor: 'snow' }, '#': 1 }, types: { 1: { h: 22, top: '#ff8f6e', side: '#fdf5ec', face: 'plaster', roof: 'tiles' } }, floorTex: (x, y, tag) => (FLOORS[tag] || FLOORS.grass)(x, y), ao: 3, outside: '#49b6c9' });
    this.hero = new E.Body({ x: cellP(...G.ISLAND.start)[0], y: cellP(...G.ISLAND.start)[1], r: 5 }); if (d && d.from === 'bungalow') { const b = cellP(7, 17); this.hero.x = b[0]; this.hero.y = b[1]; }
    this.fig = G.playerFigure({ x: this.hero.x, y: this.hero.y }); this.fig.rig.o.size = 1.1; this.fig.set('Idle_Subtle');
    this.flow = new E.FlowField(this.map); this.target = null; this.walkTo = null;
    this.tare = G.tare = new G.Tare(); this.tx = cellP(...G.ISLAND.tare)[0]; this.ty = cellP(...G.ISLAND.tare)[1]; this.tfig = { x: this.tx, y: this.ty };
    this.people = G.ISLAND.npcs.map(([id, cx, cy, bank], i) => { const f = G.castFigure(id, { size: 1.1 }); const p = cellP(cx, cy); f.x = f.hx = p[0]; f.y = f.hy = p[1]; f.bank = bank; f.ph = i * 1.7; f.lineI = 0; f.moves = !['lou'].includes(id); f.set(id === 'lou' ? 'Sleeping' : 'Idle_Subtle'); return f; });
    this.mats = G.ISLAND.mats.map(([id, cx, cy]) => { const p = cellP(cx, cy); return { kind: 'mat', id, x: p[0], y: p[1], act: G.acts[id] }; });
    this.things = [{ kind: 'bed', x: cellP(...G.ISLAND.bed)[0], y: cellP(...G.ISLAND.bed)[1] }];
    this.hover = null; this.near = null; this.idleT = 0; this.sunT = 0; this.mode = 'walk'; this.pills = null; this.suggested = G.S.suggestion;
    G.song(G.time() === 'dusk' ? 'islandPM' : 'islandAM'); this.mx = 0; this.lastClick = null; G.cap = null;
    if (G.pendingUnlocks && G.pendingUnlocks.length) this.announceUnlocks();
    else if (G.S.gertNod === 1) { G.S.gertNod = 2; const gp = this.people.find(q => q.id === 'gertrude'); if (gp) gp.set('Greeting', { once: true }); G.caption(G.tareSay('nudge'), 'Tare', 5); }
    else if (G.S.done === 0 && !G.S.briefed) { G.S.briefed = G.S.day; G.caption(G.line(G.LINES.goalByDay[Math.min(4, G.S.day - 1)]), 'Tare', 4); }
    G.game.follow && G.game.follow(this.hero, { z: 10 }); G.game.cam.bounds = v => this.map.bounds(v);
  },
  announceUnlocks() { const u = G.pendingUnlocks.shift(); G.say([u.text], { name: 'Tare', onDone: () => { if (G.pendingUnlocks.length) this.announceUnlocks(); } }); if (u.id === 'sunhat') G.S.wear.sunhat = G.S.wear.sunhat || false; },
  update(dt) {
    const input = G.game.input, S = G.S; this.t += dt; G.tick(dt); this.tare.update(dt); this.fig.rig.o.size = 1.1;
    if (G.talk.update(dt)) return;
    if (this.mode === 'bed') { const r = this.pills.update(dt, input); if (r && (r.pick === 1 || r.cancel)) { this.mode = 'walk'; } else if (r && r.pick === 0) { this.goToBed(); } return; }
    const m = input.move(), d = G.game.view.screenDirToGround(m[0], m[1]), sp = 105; let dx = d[0], dy = d[1], moving = Math.hypot(m[0], m[1]) > .1;
    // mouse: click a thing or the ground to walk there
    const click = input.clicked && input.clicked(); let ptr = input.pointer && input.pointer();
    if (click) { const hit = G.game.r && G.game.r.pick ? G.game.r.pick(click[0], click[1]) : null; if (hit && hit.kind) { this.walkTo = hit; } else { const gp = G.game.mouseGround(); if (gp) this.walkTo = { kind: 'ground', x: gp[0], y: gp[1] }; } }
    if (moving) this.walkTo = null;
    if (this.walkTo) { const w = this.walkTo; this.flow.update(w.x, w.y); const fd = this.flow.dir(this.hero.x, this.hero.y, w.x, w.y); dx = fd[0]; dy = fd[1]; const dist = Math.hypot(w.x - this.hero.x, w.y - this.hero.y); if (dist < (w.kind === 'ground' ? 5 : 12)) { this.walkTo = null; dx = dy = 0; if (w.kind !== 'ground') this.interact(w); } else moving = true; }
    this.hero.vx = moving ? dx * sp : 0; this.hero.vy = moving ? dy * sp : 0; this.hero.update(dt, this.map);
    if (moving) { this.hero.facing = Math.atan2(this.hero.vy, this.hero.vx); this.idleT = 0; this.mx = Math.min(1, this.mx + dt * 4); } else { this.mx = Math.max(0, this.mx - dt * 4); this.idleT += dt; }
    const f = this.fig; f.x = this.hero.x; f.y = this.hero.y; f.vx = this.hero.vx; f.vy = this.hero.vy; f.tgt = this.hero.facing || 0; f.set(moving ? 'Walk_Loop' : 'Idle_Subtle'); f.speed = moving ? 1.1 : 1; f.update(dt);
    // tare follows at a polite distance
    const tdx = this.hero.x - this.tx, tdy = this.hero.y - this.ty, td = Math.hypot(tdx, tdy); if (td > 30) { this.tx += tdx / td * (td - 28) * Math.min(1, dt * 3); this.ty += tdy / td * (td - 28) * Math.min(1, dt * 3); if (Math.random() < dt * 1.5) { this.tare.jump(60); } }
    // people
    this.people.forEach(p => { if (p.moves) { const a = this.t * .35 + p.ph, nx = p.hx + Math.cos(a) * 14, ny = p.hy + Math.sin(a * 1.3) * 10; p.vx = nx - p.x; p.vy = ny - p.y; p.tgt = Math.atan2(p.vy, p.vx); p.x = nx; p.y = ny; p.set('Walk_Loop'); p.speed = .6; } p.update(dt); });
    // nearest thing
    let best = null, bd = 1e9; const cand = [...this.mats, ...this.people.filter(p => p.id !== 'twinB').map(p => ({ kind: 'npc', p, x: p.x, y: p.y })), ...this.things];
    for (const t of cand) { const dd = Math.hypot(t.x - this.hero.x, t.y - this.hero.y); if (dd < bd && dd < (t.kind === 'mat' ? 16 : 20)) { bd = dd; best = t; } }
    this.near = best;
    if (ptr) { const h = G.game.r && G.game.r.pick ? G.game.r.pick(ptr[0], ptr[1]) : null; this.hover = h && h.kind ? h : null; }
    if (best && input.pressed('interact')) this.interact(best);
    if (!best && input.pressed('pause') && false) { }
    if (this.idleT > 25 && !G.cap) { this.idleT = 0; G.caption(G.line(G.LINES.tare.idle), 'Tare', 3.5); }
    if (G.S.pauses > 2 && G.S.pauseSaid !== G.S.day && !G.cap) { G.S.pauseSaid = G.S.day; G.caption(G.tareSay('paused', { n: G.S.pauses }), 'Tare', 4.5); }
  },
  interact(t) {
    if (t.kind === 'mat') { if (!t.act) return; if (!G.isOpen(t.id)) { G.snd('miss'); G.caption('That mat opens on Day ' + G.openDay(t.id) + '. It is not ready. Neither am I.', 'Tare', 3); return; }
      if (G.S.done >= 3 && !G.S.free) { G.caption('Three sessions is the number for today. Bed is the other direction.', 'Tare', 3); return; }
      G.lastActData = { mode: 'story', tier: 1, day: G.S.day }; G.game.go('act_' + t.id, Object.assign({}, G.lastActData)); }
    else if (t.kind === 'npc') { const p = t.p, bank = G.LINES[p.bank]; const line = bank[p.lineI++ % bank.length]; G.caption(line, G.CAST[p.id].name, 4); p.rig.kick && p.rig.kick(.3); }
    else if (t.kind === 'bed') { this.mode = 'bed'; this.pills = new G.Pills([{ label: 'Go to bed' }, { label: 'Not yet' }], { w: 110, y: 130, h: 16 }); if (G.S.done < 3 && !G.S.free) G.caption(G.line(G.LINES.tare.early), 'Tare', 3); }
  },
  goToBed() { if (G.S.done < 3 && !G.S.free && G.S.day <= 5) { G.S.early = true; } G.game.go('evening'); },
  draw(r) {
    const map = this.map, S = G.S, hero = this.hero;
    G.game.focus(hero.x, hero.y, 10);
    map.drawFloor(r);
    const hov = this.hover;
    this.mats.forEach(m => { const open = G.isOpen(m.id), col = open ? { Stillness: '#7fe3b8', Strength: '#8fd3f4', Cardio: '#ff9f86', Balance: '#f5c842' }[m.act.discipline] : '#b8c4c8', pulse = .6 + .4 * Math.sin(this.t * 3 + m.x);
      r.decal(g => { r.groundDisc && r.groundDisc(m.x, m.y, 12, col); });
      r.queue(m.x, m.y, 0, g => { const p = r.w(m.x, m.y, 0); px.ell(g, p[0], p[1], 15, 7.5, 'rgba(32,64,76,.2)'); px.ell(g, p[0], p[1], 14, 7, col); px.ell(g, p[0], p[1], 10, 5, E.mix(col, '#ffffff', .5)); if (!open) { px.rect(g, p[0] - 3, p[1] - 3, 6, 5, '#8a8f98'); px.line(g, p[0] - 2, p[1] - 3, p[0] - 2, p[1] - 6, '#8a8f98', 1); } if (S.suggestion === m.id && open && S.done < 3) { const y = p[1] - 26 + Math.sin(this.t * 3) * 2; G.drawStar(g, p[0], y, 6, '#f5b700', '#fff3b0'); } if (hov === m || this.near === m) px.ell(g, p[0], p[1], 17, 9, 'rgba(255,255,255,.35)'); }, { pick: m, bias: -2 });
      r.actor(m.x, m.y + 11, 0, g => { const p = r.w(m.x, m.y + 11, 0); G.txt(g, m.act.name, p[0], p[1] - 4, '#20404c', { align: 'center' }); }, { pick: m, bias: 40 }); });
    map.queueWalls(r);
    // decor
    const dec = (cx, cy, name, o) => { const p = cellP(cx, cy); r.prop && r.prop(name, p[0], p[1], 0, o || {}); };
    [[16, 12, 'palm'], [22, 10, 'palm'], [28, 9, 'bush'], [8, 9, 'pine'], [6, 4, 'pine'], [9, 3, 'pine'], [32, 15, 'bush'], [24, 20, 'palm'], [18, 12, 'flowers'], [20, 18, 'flowers'], [26, 14, 'bush'], [38, 6, 'palm'], [3, 11, 'palm'], [12, 15, 'bush']].forEach(([cx, cy, n]) => dec(cx, cy, n));
    // signs
    const sg = (cx, cy, txt) => { const p = cellP(cx, cy); r.queue(p[0], p[1], 0, g => { const s = r.w(p[0], p[1], 0); px.rect(g, s[0] - 1, s[1] - 14, 2, 14, '#a07848'); G.rr(g, s[0] - G.tw(txt) / 2 - 4, s[1] - 28, G.tw(txt) + 8, 13, '#ffffff'); G.txt(g, txt, s[0], s[1] - 25, C.INK, { align: 'center' }); }); };
    sg(14, 11, 'Reception'); sg(26, 8, 'Stillness Deck'); sg(35, 14, 'Iron Room'); sg(21, 17, 'Juice Bar'); sg(7, 18, 'Bungalow'); sg(10, 21, 'Balance Park'); sg(34, 21, 'Aerobics Pier'); sg(8, 8, 'Mount Posture');
    // bed marker
    this.things.forEach(t => r.queue(t.x, t.y, 0, g => { const s = r.w(t.x, t.y, 0); px.rect(g, s[0] - 10, s[1] - 8, 20, 8, '#fff'); px.rect(g, s[0] - 10, s[1] - 4, 20, 4, '#2cc6e6'); px.rect(g, s[0] - 10, s[1] - 12, 7, 5, '#f6fafa'); if (this.near === t) G.txt(g, 'Bed', s[0], s[1] - 22, C.INK, { align: 'center' }); }, { pick: t }));
    this.people.forEach(p => { p.draw(r, { pick: { kind: 'npc', p, x: p.x, y: p.y } }); const hh = hov && hov.p === p; if (hh || (this.near && this.near.p === p)) r.queue(p.x, p.y, 0, g => { const s = r.w(p.x, p.y, 34); G.txt(g, G.CAST[p.id].name, s[0], s[1], C.INK, { align: 'center' }); }, { bias: 50 }); });
    this.fig.draw(r);
    r.shadow && r.shadow(this.tx, this.ty, 8);
    r.actor(this.tx, this.ty, 0, (g, ox, oy) => { this.tare.look = Math.sign(hero.x - this.tx); this.tare.draw(g, ox, oy, 1); }, { pick: { kind: 'tare', x: this.tx, y: this.ty } });
    // HUD
    const ca = G.game.cornerArea && G.game.cornerArea(), right = ca ? Math.min(r.W - 8, ca.x0 - 6) : r.W - 8;
    r.overlay(g => {
      G.rr(g, 8, 8, 112, 24, 'rgba(255,255,255,.9)'); G.txt(g, 'Day ' + Math.min(5, S.day) + ' · ' + G.dayName(S.day), 14, 11, C.INK); for (let i = 0; i < 3; i++) { px.disc(g, 18 + i * 11, 25, 3.5, i < S.done ? C.ACC : '#cfdde1'); }
      G.txt(g, G.time() === 'morning' ? 'Morning' : G.time() === 'noon' ? 'Noon' : 'Dusk', 112, 22, C.MUTED, { align: 'right' });
      const a = S.shownAge || G.spineAge(), w = 118; G.rr(g, right - w, 8, w, 24, 'rgba(255,255,255,.9)'); G.txt(g, 'Spine Age ' + a, right - w + 6, 11, C.ACC2); G.txt(g, 'Gerald ' + S.minutes.toFixed(1) + ' min', right - w + 6, 21, C.INK);
    });
    if (this.near && this.mode === 'walk') { const n = this.near, lab = n.kind === 'mat' ? (G.isOpen(n.id) ? n.act.name : 'Locked: Day ' + G.openDay(n.id)) : n.kind === 'npc' ? 'Talk' : 'Bed'; G.prompt(r, [['interact', lab]]); }
    else if (this.mode === 'walk') G.prompt(r, [['@' + (G.game.input.lastDevice === 'gamepad' ? 'Left stick' : 'WASD / click') , 'Walk']]);
    if (this.mode === 'bed') this.pills.draw(r);
    G.drawCaption(r, r.H - 50); G.talk.draw(r);
  }
};
// bungalow: wake up, wardrobe, go to the body check
G.scenes.bungalow = {
  pausable: true, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter() {
    this.t = 0; this.stage = 'wake'; this.fig = G.playerFigure({ x: -50, y: 2, tgt: 1.4 }); this.fig.rig.o.size = 2; this.fig.set('Stretch_Yawn', { once: true }); G.game.lights.enabled = true; G.game.lights.ambient = .92; G.song('islandAM'); this.mkPills();
    G.cap = null; const d = G.DAYS[Math.min(4, G.S.day - 1)]; G.caption('Day ' + G.S.day + ': ' + d.name + '. ' + d.goal, 'Tare', 4.5);
    if (G.S.absence) { G.caption(G.tareSay('absence', { n: G.S.absence }), 'Tare', 4.5); G.S.absence = 0; }
  },
  mkPills() { const S = G.S, it = [{ label: S.checked ? 'Go outside' : 'Body Check' }]; const has = ['towel', 'headband', 'sunhat', 'spare'].filter(k => G.hasUnlock(k)); if (has.length) it.push({ label: 'The Rail' }); this.pills = new G.Pills(it, { w: 120, y: 150, h: 17, cancel: false }); this.rail = false; },
  update(dt) {
    this.t += dt; G.tick(dt); this.fig.update(dt); if (G.talk.update(dt)) return;
    if (this.rail) { const r = this.pills.update(dt, G.game.input); if (r && r.pick != null) { const it = this.pills.items[r.pick]; if (it.label === 'Back') { this.mkPills(); } else { const k = it.key; G.S.wear[k] = !G.S.wear[k]; if (G.S.wear[k]) for (const o of ['towel', 'headband', 'sunhat', 'spare']) if (o !== k) G.S.wear[o] = false; this.fig = G.playerFigure({ x: -50, y: 2, tgt: 1.4 }); this.fig.rig.o.size = 2; this.fig.set('Idle_Subtle'); this.railPills(); G.snd('pop'); G.saveNow(); } } if (r && r.cancel) this.mkPills(); return; }
    const r = this.pills.update(dt, G.game.input); if (!r || r.pick == null) return; const lab = this.pills.items[r.pick].label;
    if (lab === 'Body Check') G.game.go('bodycheck'); else if (lab === 'Go outside') G.game.go('island', { from: 'bungalow' }); else if (lab === 'The Rail') { this.rail = true; this.railPills(); }
  },
  railPills() { const it = ['towel', 'headband', 'sunhat', 'spare'].filter(k => G.hasUnlock(k)).map(k => ({ key: k, label: ({ towel: 'Towel', headband: 'Headband', sunhat: 'Sunhat', spare: "Gertrude's Hat" })[k] + ': ' + (G.S.wear[k] ? 'on' : 'off') })); it.push({ label: 'Back' }); this.pills = new G.Pills(it, { w: 130, y: 120, h: 16 }); },
  draw(r) { G.game.focus(0, 0, 18); G.rooms.bungalow(r, this.t); this.fig.draw(r); const tp = r.w(30, 14, 0); r.overlay(g => { G.tare.draw(g, tp[0], tp[1], 1.3, 'happy'); G.txt(g, 'The Rail', r.W - 60, 40, C.MUTED, { align: 'center' }); const names = ['towel', 'headband', 'sunhat', 'bowtie', 'spare', 'friend']; names.forEach((k, i) => { const on = G.hasUnlock(k); G.rr(g, r.W - 100 + (i % 3) * 30, 52 + ((i / 3) | 0) * 20, 26, 16, on ? C.MINT : '#e6eef0'); G.txt(g, on ? '✓' : '·', r.W - 87 + (i % 3) * 30, 56 + ((i / 3) | 0) * 20, on ? C.INK : '#9db3ba', { align: 'center' }); }); }); this.pills.draw(r); G.prompt(r, [['confirm', 'Pick']]); G.drawCaption(r, 30); G.talk.draw(r); }
};
})();
