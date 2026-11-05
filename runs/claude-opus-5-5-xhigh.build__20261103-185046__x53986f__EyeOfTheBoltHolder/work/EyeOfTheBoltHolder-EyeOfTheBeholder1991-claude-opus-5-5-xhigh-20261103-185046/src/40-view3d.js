/* =====================================================================================
 * 40-view3d: the Presenter. One E.World3D per floor, built at boot; each frame it mirrors the sim (the camera from the
 * party's tween, doors, features, items, monsters, NPCs, lights) and turns events into effects. It never writes the sim.
 * In Node there is no 3D engine: B.view is the NullView (44).
 * ===================================================================================== */
const NICHE = [['t#', '##'], ['#t', '##'], ['##', 't#'], ['t#', '##']];
const hexA = c => E.hex(c);
/** a floor's ground: flagstones, tiles or plain stone, water channels where the data says, runes in the Vault */
function groundFn(F) {
  const L = F.look, [c0, c1, c2] = L.ground, X = B.idx(Object.keys(B.FLOORS).find(k => B.FLOORS[k] === F));
  const pal = { stones: [c0, E.shade(c0, .05), E.shade(c0, -.05), c2].map(hexA), mortar: hexA(c1), hi: hexA(c2), lo: hexA(E.shade(c1, -.1)), speck: hexA(E.shade(c1, -.2)) };
  const wet = (F.water || []).map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1, ew: y0 === y1, ns: x0 === x1 && y0 !== y1, pool: x0 !== x1 && y0 !== y1 && (x1 - x0) >= 4 }));
  const wcol = hexA(L.water || '#1e3a30'), wlt = hexA(E.shade(L.water || '#1e3a30', .25)), rune = hexA('#4ac8e0');
  const tile = (x, y) => {
    const tx = Math.floor(x / 16), ty = Math.floor(y / 16), lx = x - tx * 16, ly = y - ty * 16, n = E.hash2(tx * 7 + 3, ty * 13 + 5);
    if (lx < 1 || ly < 1) return hexA(c1);
    const base = (tx + ty) % 2 ? c0 : E.shade(c0, -.06); const v = E.hash2(Math.floor(x), Math.floor(y));
    const c = hexA(n > .8 ? E.shade(base, .05) : base); return v > .97 ? hexA(c2) : v < .03 ? hexA(c1) : c;
  };
  const plain = (x, y) => { const v = E.noise2(x * .09, y * .09); return hexA(v > .62 ? c2 : v < .3 ? c1 : c0); };
  return (x, y) => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), lx = x - cx * CELL, ly = y - cy * CELL;
    for (const w of wet) if (cx >= w.x0 && cx <= w.x1 && cy >= w.y0 && cy <= w.y1) {
      const mx = (w.x0 + w.x1 + 1) / 2 * CELL;
      const inW = w.ew ? Math.abs(ly - 16 + Math.sin(x * .08) * 2) < 3.2 : w.ns ? Math.abs(lx - 16) < 3.2 : w.pool ? E.noise2(x * .05, y * .05) > .52 : Math.abs(x - mx + Math.sin(y * .07) * 3) < 3.4;
      if (inW) return E.noise2(x * .3, y * .9) > .7 ? wlt : wcol;
    }
    if (L.runes && cx >= 3 && cx <= 9 && cy >= 1 && cy <= 5) { if ((lx > 15 && lx < 17) || (ly > 15 && ly < 17) || Math.abs(Math.abs(lx - 16) - Math.abs(ly - 16)) < .7 && Math.abs(lx - 16) < 9) return rune; }
    return L.groundStyle === 'tiles' ? tile(x, y) : L.groundStyle === 'plain' ? plain(x, y) : E.tex.flagstone(x, y, pal);
  };
}
/** the level text for a floor: each cell 2 x 2 tiles; a torch feature opens a brazier niche in its wall */
function levelOf(f) {
  const F = B.FLOORS[f], X = B.idx(f), torch = {};
  for (const ft of X.featList) if (ft.kind === 'torch') torch[key(ft.x + DX[ft.dir], ft.y + DY[ft.dir])] = (ft.dir + 2) % 4;
  const rows = [];
  for (let y = 0; y < X.H; y++) for (let k = 0; k < 2; k++) {
    let row = '';
    for (let x = 0; x < X.W; x++) { const c = X.ch(x, y), t = torch[key(x, y)]; row += c === '#' ? (t !== undefined ? NICHE[t][k] : '##') : '..'; }
    rows.push(row);
  }
  const L = F.look, wall = { wall: 48, side: L.side, color: L.color, top: E.shade(L.color, -.35), line: E.shade(L.color, -.3) };
  return { rows, ground: groundFn(F), side: L.side, wallSide: L.side, legend: { '#': wall, '.': {}, t: { torch: true } }, _wall: wall };
}
B.levelOf = levelOf;
const featPos = ft => [mid(ft.x) + DX[ft.dir] * 16, mid(ft.y) + DY[ft.dir] * 16, Math.atan2(DY[(ft.dir + 2) % 4], DX[(ft.dir + 2) % 4]) - PI / 2];
const THING_OF = { lever: 'wallLever', button: 'wallButton', catch: 'catch', alcove: 'alcove', shrine: 'alcove', gearNiche: 'gearNiche', clockFace: 'clockFace', plaque: 'plaque', candle: 'candle',
  greatLock: 'greatLock', raiseShrine: 'raiseShrine', grate: 'grate', pipe: 'pipe', chain: 'chain', gearWall: 'gearWall', eyeRelief: 'eyeRelief' };

const View3D = {
  worlds: {}, cur: null, f: null, t: 0, fx: [], swings: [], hot: [], ghosts: new Map(), shakeT: 0, flashT: 0, rigs: new Map(),
  /** build every floor's world (boot steps call this per floor) */
  build(f, o = {}) {
    const F = B.FLOORS[f], X = B.idx(f), L = F.look, lv = levelOf(f);
    const Wv = { f, X, doors: {}, blocks: {}, feats: {}, cells: {}, mobs: new Map(), npcs: {}, lights: [], lightN: 0 };
    const world = new W3(game, { level: lv, look: 'card', torchLights: o.light ? 3 : 6, torchShadows: o.light ? 1 : 2, torchPower: 18, torchReach: 170, torchColor: L.torch,
      lights: 11, glowLights: 4, ambient: L.ambient, fog: { color: L.fog[0], near: L.fog[1], far: L.fog[2] }, sky: L.fog[0], camera: { mode: 'fixed' },
      overlay: { fov: 60 }, onDraw: w => this.onDraw(w, Wv) });
    Wv.world = world;
    Wv.eyeHero = world.hero({ x: mid(F.start[0]), y: mid(F.start[1]), r: 4, visible: false });
    world.camera.follow(Wv.eyeHero); world.camera.set('fixed');
    Wv.lamp = world.light({ color: '#ffd8a0', reach: 170, power: 7 });
    for (let i = 0; i < 7; i++) Wv.lights.push(world.light({ color: '#ffffff', reach: 120, power: 0, on: false }));
    // doors, secret walls, illusions
    const wall = lv._wall;
    for (const d of Object.values(X.doors)) {
      const x = mid(d.x), y = mid(d.y), yaw = d.ns ? 0 : PI / 2;
      if (d.kind === 'secret' || d.kind === 'illusion') { Wv.blocks[d.id] = world.wallBlock({ x, y, w: CELL, d: CELL, h: 48, spec: wall }); continue; }
      const kind = d.kind === 'seal' ? 'sealDoor' : d.kind === 'undergate' ? 'undergate' : 'door';
      const o2 = { yaw, w: 32, h: 46, swing: d.kind === 'door' || d.kind === 'lock', color: d.kind === 'gate' ? '#2a2830' : d.kind === 'lock' ? '#4a3220' : '#6a4a2e', frame: E.shade(L.color, .08), locked: d.kind === 'lock' ? 'k' : null };
      Wv.doors[d.id] = world.thing(kind, x, y, 0, o2);
    }
    // wall features
    for (const ft of X.featList) {
      const tk = THING_OF[ft.kind]; if (!tk) continue;
      const [x, y, yaw] = featPos(ft);
      Wv.feats[ft.id] = world.thing(tk, x, y, 0, { yaw, color: E.shade(L.color, .06), look: ft.o.look, shrine: ft.kind === 'shrine' });
    }
    // floor features: plates, traps, pits, stairs, the altar
    for (const p of Object.values(X.plateAt)) Wv.cells['p' + p.id] = world.thing('plateF', mid(p.x), mid(p.y), 0, { color: E.shade(L.ground[0], .1) });
    for (const t of Object.values(X.trapAt)) Wv.cells['t' + t.id] = world.thing('dartTrap', mid(t.x), mid(t.y), 0, { color: E.shade(L.ground[0], -.04) });
    for (const p of Object.values(X.pitAt)) Wv.cells['o' + p.id] = world.thing('pit', mid(p.x), mid(p.y), 0, {});
    for (const [k, st] of Object.entries(X.stairAt)) {
      const [sx, sy] = k.split(',').map(Number), d = [0, 1, 2, 3].find(q => X.ch(sx + DX[q], sy + DY[q]) !== '#');
      if (d === undefined) continue;
      const yaw = Math.atan2(DY[d], DX[d]) - PI / 2;
      Wv.cells['s' + k] = world.thing(st.ladder ? 'ladder' : st.up ? 'stairUp' : 'stairDown', mid(sx) + DX[d] * 15, mid(sy) + DY[d] * 15, 0, { yaw, color: E.shade(L.color, .1), sealed: !!st.sealed, on: !!st.finish });
    }
    if (f === 'f3') Wv.altar = world.thing('altarSlab', mid(18), mid(3), 0, { yaw: 0 });
    if (f === 'f2') { world.thing('forge', mid(12) + 8, mid(1) - 8, 0, { yaw: PI }); world.thing('anvil', mid(9), mid(2) + 6, 0, { yaw: .3 }); world.thing('bench', mid(11), mid(3) + 8, 0, { yaw: 0 }); Wv.forge = world.light({ color: '#ff8a3a', reach: 140, power: 14 }); }
    if (f === 'f1') for (const [x, y, a] of [[3, 7, .4], [9, 11, 1.2], [19, 1, 2], [1, 13, 0]]) world.thing('bones', mid(x) + 6, mid(y) - 6, 0, { yaw: a });
    if (f === 'f3') { for (const [x, y, a] of [[2, 6, 1], [5, 8, 2.4], [1, 5, .2], [12, 11, 1.4]]) world.thing('bones', mid(x) - 5, mid(y) + 5, 0, { yaw: a }); for (const [x, y, d] of [[17, 1, 0], [19, 1, 0], [15, 2, 3], [21, 4, 1]]) { const ft = { x, y, dir: d }; const [bx, by, yaw] = featPos(ft); world.thing('banner', bx, by, 0, { yaw }); } }
    if (f === 'f4') Wv.eyeLight = world.light({ color: '#ffb040', reach: 260, power: 22 });
    // NPCs (as rigs on cards; Ysolde half there)
    for (const [id, x, y, dir, o3] of F.npcs || []) {
      const look = (B.NPCS[id] || B.PEOPLE[id]).look, a = world.mob({ x: mid(x), y: mid(y), r: 4, half: 6, rig: B.rigOf(look), facing: YAW(dir) });
      a.setSolid(false); if (o3 && o3.ghost) a.fade = .45; Wv.npcs[id] = a;
    }
    this.worlds[f] = Wv;
    return Wv;
  },
  /** show a floor's world */
  enter(f) { this.f = f; this.cur = this.worlds[f]; if (!this.cur) return; this.fx.length = 0; this.syncAll(0); },
  get world() { return this.cur && this.cur.world; },
  /** after each sim step: mirror the state, move the creatures, step the world */
  step(dt) {
    const Wv = this.cur; if (!Wv || !S) return;
    if (S.floor !== this.f) this.enter(S.floor);
    this.t += dt;
    this.syncAll(dt);
    Wv.world.step(dt);
  },
  syncAll(dt) {
    const Wv = this.cur, fl = S.floors[this.f], X = Wv.X; if (!fl) return;
    for (const d of Object.values(X.doors)) {
      const st = fl.doors[d.id];
      if (Wv.blocks[d.id]) { const b = Wv.blocks[d.id]; if (d.kind === 'secret') { b.z = -st.open * 47; b.visible = st.open < .99; } b.place(); continue; }
      const t = Wv.doors[d.id]; t.open = st.open; t.locked = st.locked && d.kind === 'lock' ? 'k' : null;
      if (d.kind === 'undergate') { t.bolts = st.want ? 7 : Math.min(7, (st.w_copper ? 2 : 0) + (st.w_brass ? 2 : 0) + (st.w_iron ? 3 : 0) + (S.moment && S.moment.id === 'undergate' ? Math.floor(S.moment.t / 1.1) : 0)); for (const k of ['copper', 'brass', 'iron']) t['w_' + k] = st['w_' + k]; }
    }
    const seeing = B.seeing();
    for (const ft of X.featList) {
      const t = Wv.feats[ft.id]; if (!t) continue; const st = fl.feats[ft.id] || {};
      t.on = ft.kind === 'lever' ? st.on : ft.kind === 'candle' ? st.lit : ft.kind === 'greatLock' ? st.turned : ft.kind === 'clockFace' ? st.running : ft.kind === 'gearNiche' ? !!(fl.feats.CF && fl.feats.CF.running) : st.on;
      t.used = st.used; t.items = (st.items || []).map(i => i.id); t.read = S.notes.includes(ft.o.text);
      t.glint = (ft.kind === 'catch' && !st.used && seeing) || ((ft.kind === 'alcove' || ft.kind === 'shrine') && seeing && t.items.length);
      if (ft.kind === 'button') t.press = Math.max(0, (t.press || 0) - dt * 3);
      if (ft.kind === 'greatLock') { const busy = S.party.busy && S.party.busy.id === ft.id; t.turn = st.turned ? PI / 3 : busy ? S.party.busy.t / 2 * PI / 3 : 0; }
    }
    for (const p of Object.values(X.plateAt)) Wv.cells['p' + p.id].on = fl.plates[p.id];
    for (const tr of Object.values(X.trapAt)) { const t = Wv.cells['t' + tr.id]; t.glint = fl.traps[tr.id] && fl.flags['g' + tr.id]; }
    for (const p of Object.values(X.pitAt)) { const t = Wv.cells['o' + p.id], st = fl.pits[p.id]; t.bridged = st.bridged; t.closed = !st.open && !st.bridged; t.seams = seeing || fl.flags['g' + p.id]; }
    if (Wv.altar) { Wv.altar.items = (fl.items[key(18, 3)] || []).map(i => i.id); Wv.altar.on = !!S.special.sq3; }
    for (const [k, st] of Object.entries(X.stairAt)) { const t = Wv.cells['s' + k]; if (t && st.finish) t.on = true; }
    if (this.f === 'f4' && Wv.feats.GL3) Wv.feats.GL3.color = S.flags.stairLight ? '#fff6d8' : undefined;
    // NPCs
    for (const [id, a] of Object.entries(Wv.npcs)) {
      const n = fl.npcs[id]; const vis = n && (n.state === 'here');
      a.visible = !!vis; if (!vis) continue;
      a.facing = Math.atan2(mid(S.party.cy) - a.y, mid(S.party.cx) - a.x); a.vx = (mid(n.x) - a.x) * 6; a.vy = (mid(n.y) - a.y) * 6;
      a.anim = { expr: S.talk && B.PEOPLE[S.talk.line && S.talk.line.who] && B.PEOPLE[S.talk.line.who].npc === id ? 'smile' : null };
      if (a.rig) a.rig._talk = !!(S.talk && S.talk.line && S.talk.line.who === id);
    }
    this.syncMobs(dt);
    this.syncGhosts(dt);
  },
  /** card monsters as mobs (pen ones draw themselves in onDraw) */
  syncMobs(dt) {
    const Wv = this.cur, world = Wv.world, fl = S.floors[this.f], seen = new Set();
    for (const m of fl.mons) {
      const C = CREATURES[m.type]; if (!C || C.pen) { this.penState(m, dt); continue; }
      seen.add(m.uid);
      let a = Wv.mobs.get(m.uid);
      const [tx, ty] = this.slotPos(m);
      if (!a) {
        const o = { x: tx, y: ty, r: C.r * .6, half: C.rig ? 4 + (C.rig.size || 1) * 3 : 0, fly: !!C.fly, facing: YAW(m.dir) };
        if (C.rig) o.rig = B.rigOf(C.rig); else if (C.blob) o.blob = new E.Blob(B.clone(C.blob)); else o.orb = C.orb;
        a = world.mob(o); a.setSolid(false); a.data.v = { atk: null, strike: 0, sinkT: 0 }; Wv.mobs.set(m.uid, a);
      }
      const v = a.data.v, P = S.party;
      // steer toward its slot; a long way off: there at once (a load, a spawn)
      const dx = tx - a.x, dy = ty - a.y, far = Math.hypot(dx, dy) > 40;
      if (far) a.place(tx, ty); else { a.vx = clamp(dx * 8, -70, 70); a.vy = clamp(dy * 8, -70, 70); }
      const toP = Math.atan2(mid(P.cy) - a.y, mid(P.cx) - a.x);
      a.facing = m.aware && m.hp > 0 ? E.approachAng(a.facing, toP, dt * 8) : Math.hypot(dx, dy) > 2 ? E.approachAng(a.facing, Math.atan2(dy, dx), dt * 8) : a.facing;
      a.flash = m.flash > 0 ? .1 : 0;
      if (v.atk) { v.atk.update(dt); if (!v.atk.busy) v.atk = null; }
      v.strike = Math.max(0, v.strike - dt);
      if (m.hp <= 0) {
        v.sinkT += dt;
        a.anim = C.rig ? { pose: 'die' } : C.blob ? { squash: -.45, squint: true } : null;
        if (C.fly) a.vz = -14;
        if (v.sinkT > 1.3) a.sink = (v.sinkT - 1.3) * 12; if (C.blob) a.fade = Math.max(0, 1 - v.sinkT * .5);
        continue;
      }
      const asleep = m.st === 'asleep' || m.status.sleep > 0;
      if (C.rig) a.anim = { attack: v.atk && v.atk.state, hurt: m.flash > 0, expr: m.wind > 0 ? 'angry' : m.flash > 0 ? 'wince' : null, pose: asleep ? 'kneel' : m.status.held > 0 ? 'guard' : m.zap > 0 ? 'cast' : null };
      else if (C.blob) a.anim = { squash: m.wind > 0 ? -.3 * Math.min(1, (B.T.windup - m.wind) / B.T.windup + .3) : v.strike > 0 ? .3 : Math.sin(this.t * 6 + m.uid) * .06, look: [Math.cos(a.facing), Math.sin(a.facing)], squint: asleep };
      if (C.fly) a.vz = (18 + Math.sin(this.t * 2 + m.uid) * 2 - a.z) * 4;
    }
    for (const [uid, a] of Wv.mobs) if (!seen.has(uid)) { world.remove(a); Wv.mobs.delete(uid); }
  },
  /** where a monster stands in its cell: S in quadrants, M in halves across the party's view, L in the middle */
  slotPos(m) {
    const T = B.MON(m.type), x = mid(m.cx), y = mid(m.cy), P = S.party;
    if (T.size === 'L') return [x, y];
    if (T.size === 'S') return [x + (m.slot % 2 ? 8 : -8), y + (m.slot > 1 ? 8 : -8)];
    const alongX = Math.abs(P.cy - m.cy) >= Math.abs(P.cx - m.cx);
    return alongX ? [x + (m.slot ? 8 : -8), y] : [x, y + (m.slot ? 8 : -8)];
  },
  /** a pen creature's own animation state, kept between frames */
  penState(m, dt) {
    const v = m._v || (m._v = {}); const vs = this.pen || (this.pen = new Map());
    let s = vs.get(m.uid); const [tx, ty] = this.slotPos(m);
    if (!s) { s = { x: tx, y: ty, a: YAW(m.dir), t: m.uid * .37, strike: 0, dead: 0, walk: 0 }; vs.set(m.uid, s); }
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy), sp = 32 / Math.max(.3, B.MON(m.type).move) * (dt || 0);
    if (d > 60) { s.x = tx; s.y = ty; } else if (d > .01) { const k = Math.min(1, sp / d); s.x += dx * k; s.y += dy * k; }
    s.walk = E.approach(s.walk, d > 1 ? 1 : 0, (dt || 0) * 4);
    const P = S.party, toP = Math.atan2(mid(P.cy) - s.y, mid(P.cx) - s.x);
    if (m.hp > 0) s.a = E.approachAng(s.a, m.aware ? toP : d > 1 ? Math.atan2(dy, dx) : s.a, (dt || 0) * 6);
    s.t += dt || 0; s.strike = Math.max(0, s.strike - (dt || 0) * 2.5); s.dead = m.hp <= 0 ? s.dead + (dt || 0) : 0;
    s.wind = m.wind > 0 ? clamp(1 - m.wind / (B.T.windup * (B.MON(m.type).heavy ? 1.6 : 1)), 0, 1) : m.gaze > 0 ? clamp(1 - m.gaze / .6, 0, 1) : 0; s.zap = m.zap || 0; s.hurt = m.flash;
    s.crown = m.type === 'ratknot'; s.alive = m.hp > 0;
  },
  /** the race's ghosts: other players' parties as cloaked rigs in their seat colours */
  setGhost(id, g) {
    const Wv = this.cur; if (!Wv) return;
    let e = this.ghosts.get(id);
    if (!e || e.f !== this.f) {
      if (e && e.a && e.w) e.w.remove(e.a);
      const a = Wv.world.mob({ x: g.x, y: g.y, r: 4, half: 6, rig: B.rigOf({ build: 'heroic', size: 1.2, hood: true, cape: { len: 6, width: 5, seg: 2.5 }, weapon: null, colors: { cloth: g.color, cape: g.color, capeIn: E.shade(g.color, -.4), hair: E.shade(g.color, -.5), skin: '#c8c0d0' } }) });
      a.setSolid(false); a.fade = .45; e = { a, w: Wv.world, f: this.f }; this.ghosts.set(id, e);
    }
    Object.assign(e, g);
  },
  removeGhost(id) { const e = this.ghosts.get(id); if (e) { if (e.a && e.w) e.w.remove(e.a); this.ghosts.delete(id); } },
  syncGhosts(dt) {
    for (const e of this.ghosts.values()) { if (e.f !== this.f) continue; const a = e.a; a.visible = e.area === undefined || e.area === this.f || e.area === 'race'; const dx = e.x - a.x, dy = e.y - a.y; if (Math.hypot(dx, dy) > 60) a.place(e.x, e.y); else { a.vx = dx * 6; a.vy = dy * 6; } a.facing = E.approachAng(a.facing, e.yaw, dt * 6); }
  },
  /** the camera at the party's eyes, from its tween; a bump lurches, a fall drops, a moment looks where it should */
  camera() {
    const P = S.party; let x = mid(P.cx), y = mid(P.cy), yaw = YAW(P.dir), z = EYE, pitch = -.04;
    const tw = P.tw;
    if (tw && tw.dur > 0) {
      const u = clamp(tw.t / tw.dur, 0, 1), s = u * u * (3 - 2 * u);
      x = lerp(mid(tw.fx), x, s); y = lerp(mid(tw.fy), y, s); const y0 = YAW(tw.fd); yaw = y0 + E.angDiff(y0, yaw) * s;
      if (tw.k === 'step' && B.opt.bob && !game.reduceMotion) z -= Math.sin(u * PI) * .8;
    }
    const lurch = Math.sin(P.bump * PI) * 4;
    if (P.floating > 0) z += 3;
    const T = S.transit;
    if (T && T.k === 'fall') { if (!T.swapped) z -= T.t / .55 * 40; else z += Math.max(0, 1 - (T.t - .55) / .35) * 30; }
    if (S.moment && S.moment.id === 'eyeIntro') { const u = clamp(S.moment.t / 1.5, 0, 1) * clamp((S.moment.dur - S.moment.t) / 1, 0, 1); pitch = lerp(-.04, .16, u); }
    if (this.f === 'f4' && S.boss && S.boss.alive && S.boss.awake) { const bx = mid(S.boss.cx), by = mid(S.boss.cy), a = Math.atan2(by - y, bx - x); if (Math.abs(E.angDiff(yaw, a)) < .6) pitch = Math.max(pitch, .05); }
    const k = this.shakeT > 0 ? (Math.random() - .5) * this.shakeT * 3 : 0;
    return { x: x + Math.cos(yaw) * (lurch - 4), y: y + Math.sin(yaw) * (lurch - 4), z: z + k * .3, yaw: yaw + k * .01, pitch, fov: 74 };
  },
  /** draw the floor (the play scene's draw) */
  draw(r) {
    const Wv = this.cur; if (!Wv) return;
    const cam = this.camera(); Wv.world.camera.fixed = cam;
    Wv.eyeHero.place(cam.x, cam.y, 0);
    const P = S.party; Wv.lamp.x = cam.x + Math.cos(cam.yaw) * 6; Wv.lamp.y = cam.y + Math.sin(cam.yaw) * 6; Wv.lamp.z = EYE + 6; Wv.lamp.on = true; Wv.lamp.power = 7 + Math.sin(this.t * 7) * .4;
    this.lightsFrame(Wv);
    Wv.world.draw(r);
    this.hotspots(r);
  },
  /** the floor's own lights: candles, the forge, the Eye, spell flashes (a pool made with the world) */
  lightsFrame(Wv) {
    let n = 0; const take = o => { const L = Wv.lights[n++]; if (L) Object.assign(L, o, { on: true }); };
    const fl = S.floors[this.f];
    if (this.f === 'f3') for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) { if (!fl.feats[id].lit || n >= 5) continue; const ft = Wv.X.feats[id], [x, y] = featPos(ft); take({ x: x - DX[ft.dir] * 3, y: y - DY[ft.dir] * 3, z: 26, color: '#9ac8ff', reach: 110, power: 8 + Math.sin(this.t * 9 + n) * .8 }); }
    if (Wv.forge) { Wv.forge.x = mid(12); Wv.forge.y = mid(1) - 2; Wv.forge.z = 10; Wv.forge.power = 12 + Math.sin(this.t * 5) * 2; Wv.forge.on = true; }
    if (Wv.eyeLight) { const Bs = S.boss; Wv.eyeLight.on = !!Bs && (Bs.alive || Bs.dead < 3); if (Bs) { const [x, y] = this.bossPos(); Wv.eyeLight.x = x; Wv.eyeLight.y = y; Wv.eyeLight.z = 30; Wv.eyeLight.color = Bs.tele && Bs.tele.k === 'lightning' ? '#8af4ff' : Bs.phase === 3 ? '#ff6a3a' : '#ffb040'; Wv.eyeLight.power = Bs.alive ? 9 + Math.sin(this.t * 3) * 1.5 : Math.max(0, 24 - Bs.dead * 7); } }
    for (const f of this.fx) if (f.light && n < Wv.lights.length) take({ x: f.x, y: f.y, z: f.z || 20, color: f.light, reach: f.reach || 140, power: (f.power || 20) * (1 - f.t / f.dur) });
    for (; n < Wv.lights.length; n++) Wv.lights[n].on = false;
  },
  bossPos() { const Bs = S.boss, g = Bs.glide, s = g * g; return [lerp(mid(Bs.cx), mid(Bs.gx), s), lerp(mid(Bs.cy), mid(Bs.gy), s)]; },
  /** each frame's own 3D drawing: the ceiling, floor items, pen creatures, the Eye, projectiles, effects, the hands */
  onDraw(w, Wv) {
    if (!S || Wv !== this.cur) return;
    const pen = w.pen, P = S.party, fl = S.floors[this.f];
    pen.at().box(w.width / 2, w.depth / 2, 50, w.width, w.depth, 4, E.shade(B.FLOORS[this.f].look.color, -.55));
    // items on the floor, near the party
    for (const [k, its] of Object.entries(fl.items)) {
      const [cx, cy] = k.split(',').map(Number); if (Math.abs(cx - P.cx) + Math.abs(cy - P.cy) > 7) continue;
      if (this.f === 'f3' && cx === 18 && cy === 3) continue;
      its.forEach((it, i) => { const q = i % 4, ox = q % 2 ? 7 : -7, oy = q > 1 ? 7 : -7, z = i >= 4 ? (i - 3) * 1.6 : 0; pen.at(mid(cx) + ox, mid(cy) + oy, z, (it.uid * 1.7) % TAU); itemModel(pen, it.id, 0, 0, 0, 0, 1); });
    }
    // pen creatures
    if (this.pen) for (const m of fl.mons) {
      const C = CREATURES[m.type]; if (!C || !C.pen) continue; const s = this.pen.get(m.uid); if (!s) continue;
      if (m.hp <= 0 && s.dead > 2.6) continue;
      pen.at(s.x, s.y, -Math.max(0, s.dead - 1.6) * 6, s.a, 1); pen.flash = m.flash > 0;
      PEN_BODIES[C.pen](pen, s); pen.flash = false;
    }
    if (this.pen) for (const uid of [...this.pen.keys()]) if (!fl.mons.some(m => m.uid === uid)) this.pen.delete(uid);
    // extra parts on card monsters: Latchkin keys, a skeleton's hammer, a Seer's sigil, a Warden's halberd, a golem's padlock
    for (const [uid, a] of Wv.mobs) { const m = fl.mons.find(q => q.uid === uid); if (!m || m.hp <= 0) continue; const C = CREATURES[m.type]; this.extras(pen, a, m, C); }
    // the Eye
    if (this.f === 'f4' && S.boss && (S.boss.alive || S.boss.dead < 4)) {
      const Bs = S.boss, [x, y] = this.bossPos(), a = Math.atan2(mid(P.cy) - y, mid(P.cx) - x);
      pen.at(x, y, 0, a); pen.flash = Bs.flash > 0;
      drawEye(pen, { t: this.t, phase: Bs.phase, out: Object.values(Bs.locks).filter(Boolean).length * 2, iris: Bs.iris, tele: Bs.tele, hurt: Bs.hurtT, dead: Bs.alive ? 0 : Bs.dead, relocked: Bs.relocked });
      pen.flash = false;
      this.bossTele(w, Bs);
    }
    // projectiles
    for (const p of S.proj) {
      const u = clamp(p.u, 0, 1), x = mid(p.x) + DX[p.dir] * CELL * u, y = mid(p.y) + DY[p.dir] * CELL * u, z = p.team === 'mon' ? EYE - 4 : EYE - 6 + (p.kind === 'item' ? -Math.sin(u * PI) * 2 : 0);
      if (p.kind === 'item' || p.kind === 'missile') { pen.at(x, y, z, YAW(p.dir) + (p.kind === 'item' ? this.t * 12 : 0)); itemModel(pen, p.item.id, 0, 0, 0, 0, 1); }
      else if (p.kind === 'spark') w.glow(x, y, z + Math.sin(this.t * 30 + p.id) * 1.5, 1.6, '#d8c8ff', { core: '#ffffff', light: true });
      else if (p.kind === 'orb') w.glow(x, y, z, 4, '#ff9a3a', { core: '#fff2a0', light: true });
      else if (p.kind === 'mbolt') w.glow(x, y, z, 3, '#7ae0ff', { core: '#e8ffff', light: true });
    }
    this.drawFx(w, pen);
    this.drawHands(w);
  },
  extras(pen, a, m, C) {
    const f = a.facing, cx = a.x, cy = a.y;
    if (C.keys) { pen.at(cx, cy, 8 * (C.rig.size || 1), f); for (let i = 0; i < 5; i++) { const q = i * 1.2 + this.t * 2; pen.ball(-1 + Math.cos(q) * 2.4, Math.sin(q) * 2.4, 0, .5, .5, .9, '#c8a050'); } }
    if (C.padlock) { pen.at(cx, cy, 36, f); pen.box(0, 0, 0, 8, 8, 7, '#5a606a').tube(0, -3, 3.5, 0, -3, 7, 1, '#8a8e9a').tube(0, 3, 3.5, 0, 3, 7, 1, '#8a8e9a').tube(0, -3, 7, 0, 3, 7, 1, '#8a8e9a').glow(4.2, 0, 0, .9, '#7ad8ff'); }
    if (C.sigil) { pen.at(cx, cy, 30, f); pen.glow(6, 2, 0, m.zap > 0 ? 2.4 : 1, '#8ae0ff'); }
    if (C.windKey && m.hp > 0) { pen.at(cx, cy, 26, f); const q = this.t * (m.wind > 0 ? 18 : 3); pen.tube(-7, 0, 0, -11, 0, 0, .8, '#c8a868').bar(-11, -Math.cos(q) * 4, -Math.sin(q) * 4, -11, Math.cos(q) * 4, Math.sin(q) * 4, 2, .8, '#c8a868'); }
  },
  /** the Eye's telegraphs: the lightning's path flickering, rings on the cells the bolts will strike */
  bossTele(w, Bs) {
    const T = Bs.tele; if (!T) return;
    if (T.k === 'lightning') { const fl = Math.floor(this.t * 20) % 2; for (const [x, y] of T.cells) { if (fl) w.glow(mid(x), mid(y), 2, 3, '#4ae0ff', { core: '#c8ffff' }); w.arc(mid(x), mid(y), 0, 4, 14, 0, TAU, '#3ad0ff', .25 + T.t / T.dur * .4); } }
    if (T.k === 'rain') for (const [x, y] of T.cells) { const k = T.t / T.dur; w.arc(mid(x), mid(y), 0, 12 - k * 4, 14, 0, TAU, '#ffb84a', .35 + k * .5); w.arc(mid(x), mid(y), 0, 0, 4 + k * 8, 0, TAU, '#ff8a2a', .2 + k * .3); }
  }
};
B.View3D = View3D;
