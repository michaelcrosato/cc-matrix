// ---- the arena: the room's TileMap, its four doors (states, spawn queues, exits), hazards, the camera fit ----
const ARENA_ROWS = (() => {
  const rows = [];
  for (let cy = 0; cy < 15; cy++) {
    let s = '';
    for (let cx = 0; cx < 23; cx++) {
      const edge = cy === 0 || cy === 14 || cx === 0 || cx === 22;
      const door = ((cy === 0 || cy === 14) && cx >= 10 && cx <= 12) || ((cx === 0 || cx === 22) && cy >= 6 && cy <= 8);
      s += !edge ? '.' : door ? 'D' : cy === 14 ? '=' : '#';
    }
    rows.push(s);
  }
  return rows;
})();
const DOOR_TIME = { opening: .35, closing: .3, hold: .6 };
class Arena {
  constructor(setId, o = {}) {
    this.set = SETS[setId] || SETS.studio; this.setId = this.set.id;
    const W = this.set.wall;
    this.map = new E.TileMap({ rows: ARENA_ROWS, legend: { '#': 1, '=': 3, 'D': 2 },
      types: { 1: Object.assign({}, W), 2: { h: 26, top: '#000000', side: '#000000', face: 'none' }, 3: Object.assign({}, W, { cut: true, cutH: 6 }) },
      floorTex: (x, y) => this.set.floor(x, y), ao: 4, outside: '#0c0618' });
    const map = this.map, doorIdx = [];
    for (const d of DOOR_IDS) for (const [cx, cy] of DOORS[d].cells) doorIdx.push(cy * 23 + cx);
    const base = map.queueWalls;
    map.queueWalls = function (r) { for (const i of doorIdx) this.cells[i] = 0; try { base.call(this, r); } finally { for (const i of doorIdx) this.cells[i] = 2; } };
    this.doors = {};
    for (const d of DOOR_IDS) this.doors[d] = { id: d, state: 'closed', u: 0, t: 0, queue: [], gapT: 0, hold: 0, sign: null, target: null, spawned: 0 };
    this.hazards = (o.hazards || []).map(h => Object.assign({ t: 0 }, JSON.parse(JSON.stringify(h))));
    for (const h of this.hazards) {
      if (h.kind === 'conveyor') { h.dirs = h.dirs.slice(); h.speed = 40; h.warn = 0; h.phase = 0; h.scroll = 0; }
      if (h.kind === 'pyro') { h.vents = []; for (const cy of h.cys) for (const cx of h.cxs) { const [x, y] = cellW(cx, cy); h.vents.push({ x, y, cx, cy, state: 'idle', t: 0, hit: new Set() }); } h.cycle = 0; h.next = 2.5; h.burst = null; }
    }
    this.solids = [];
    if (o.corner !== false) for (const [id, x, y, f] of this.set.corner) if (E.SHAPES[id]) { try { this.solids.push(map.solid(id, x, y, 0, { facing: f })); } catch (e) { /* shape without a footprint */ } }
    this.cage = null;
    this.crowd = MT.art.makeAudience(this.set);
  }
  /** queue n spawns of a kind at a door, gap seconds apart (the door opens, they pour through, it slams) */
  queueSpawn(id, kind, n, gap = .25, extra) { const d = this.doors[id]; for (let i = 0; i < n; i++) d.queue.push({ kind, gap, extra }); }
  pendingSpawns() { let n = 0; for (const d of DOOR_IDS) n += this.doors[d].queue.length; return n; }
  /** make a door an exit: it opens with a lit sign naming where it goes */
  setExit(id, sign) { const d = this.doors[id]; d.sign = sign; d.target = sign && sign.room; if (d.state === 'closed' || d.state === 'closing') { d.state = 'opening'; d.t = 0; MT.sfx('rollup'); } d.isExit = true; }
  /** a door for the walk-in: open, then slammed behind the contestants */
  entry(id) { const d = this.doors[id]; if (!d) return; d.state = 'open'; d.u = 1; d.hold = 1.3; d.entryHold = true; }
  /** each step: doors animate and pour out their queues (spawn(kind, x, y, door, extra) makes the enemy) */
  update(dt, spawn) {
    for (const id of DOOR_IDS) {
      const d = this.doors[id]; d.t += dt;
      if (d.state === 'closed') { if (d.queue.length) { d.state = 'opening'; d.t = 0; MT.emit('door', { id, kind: 'open' }); } }
      else if (d.state === 'opening') { d.u = clamp(d.t / DOOR_TIME.opening, 0, 1); if (d.u >= 1) { d.state = d.isExit ? 'exit' : 'open'; d.t = 0; d.gapT = 0; } }
      else if (d.state === 'open') {
        if (d.queue.length) {
          d.gapT -= dt; d.hold = DOOR_TIME.hold;
          while (d.queue.length && d.gapT <= 0) { const q = d.queue.shift(); const [x, y] = this.doorSpawnPoint(id, d.spawned++); spawn(q.kind, x, y, id, q.extra); d.gapT += q.gap * MT.T.spawnGap; }
        } else { d.hold -= dt; if (d.hold <= 0) { d.state = 'closing'; d.t = 0; d.entryHold = false; MT.emit('door', { id, kind: 'close' }); } }
      } else if (d.state === 'closing') { d.u = 1 - clamp(d.t / DOOR_TIME.closing, 0, 1); if (d.u <= 0) { d.state = 'closed'; d.u = 0; } }
      else if (d.state === 'exit') { d.u = 1; }
    }
    for (const h of this.hazards) this.stepHazard(h, dt);
  }
  /** where an enemy appears outside a door: 20 units out, spread across the gap */
  doorSpawnPoint(id, k) {
    const D = DOORS[id], off = [-14, 0, 14, -7, 7][k % 5];
    if (id === 'N') return [184 + off, -14]; if (id === 'S') return [184 + off, 254];
    if (id === 'W') return [-14, 120 + off]; return [382, 120 + off];
  }
  /** a door's exit trigger: a contestant pressing into the open gap */
  inExit(c) {
    for (const id of DOOR_IDS) {
      const d = this.doors[id]; if (d.state !== 'exit') continue;
      if (id === 'N' && c.y < AR.Y0 + 8 && Math.abs(c.x - 184) < 22) return id;
      if (id === 'S' && c.y > AR.Y1 - 8 && Math.abs(c.x - 184) < 22) return id;
      if (id === 'W' && c.x < AR.X0 + 8 && Math.abs(c.y - 120) < 22) return id;
      if (id === 'E' && c.x > AR.X1 - 8 && Math.abs(c.y - 120) < 22) return id;
    }
    return null;
  }
  // ---- hazards ----
  stepHazard(h, dt) {
    h.t += dt;
    if (h.kind === 'conveyor') {
      h.phase += dt; const per = 12;
      h.warn = h.phase > per - 1.5 ? 1 : 0;
      const slow = h.warn ? clamp((per - h.phase) / 1.5, 0, 1) : 1;
      h.speed = 40 * slow;
      if (h.phase >= per) { h.phase = 0; h.dirs = h.dirs.map(v => -v); MT.emit('belt', {}); }
      if (h.warn && Math.floor((h.phase - dt) * 2) !== Math.floor(h.phase * 2)) MT.sfx('alarm');
      h.scroll += h.speed * dt;
    } else if (h.kind === 'pyro') {
      for (const v of h.vents) {
        v.t += dt;
        if (v.state === 'tele' && v.t >= 1) { v.state = 'fire'; v.t = 0; v.hit.clear(); MT.sfx('pyro'); }
        else if (v.state === 'fire' && v.t >= 1.2) { v.state = 'idle'; v.t = 0; if (v.again) { v.again = false; v.state = 'tele'; } }
      }
      if (!h.burst) {
        h.next -= dt;
        if (h.next <= 0) {
          h.next = 3.5; const pats = ['rows', 'cols', 'checker', 'allButLane'], p = pats[h.cycle++ % pats.length], R = RNG.ai;
          const cyS = [...new Set(h.vents.map(v => v.cy))], cxS = [...new Set(h.vents.map(v => v.cx))];
          const row = rpick(R, cyS), col = rpick(R, cxS), lane = rpick(R, cxS), par = h.cycle & 1;
          for (const v of h.vents) {
            const on = p === 'rows' ? v.cy === row : p === 'cols' ? v.cx === col : p === 'checker' ? ((cxS.indexOf(v.cx) + cyS.indexOf(v.cy)) & 1) === par : v.cx !== lane;
            if (on && v.state === 'idle') { v.state = 'tele'; v.t = 0; }
          }
        }
      }
    }
  }
  /** the conveyor's push at a point (world units a second along x), 0 off the belts */
  beltAt(x, y) {
    for (const h of this.hazards) if (h.kind === 'conveyor') for (let i = 0; i < h.rows.length; i++) { const [a, b] = h.rows[i], y0 = 16 + a * 16 + 8, y1 = 16 + (b + 1) * 16 + 8; if (y >= y0 && y < y1 && x > AR.X0 && x < AR.X1) return h.dirs[i] * h.speed; }
    return 0;
  }
  pyro() { return this.hazards.find(h => h.kind === 'pyro'); }
  /** the camera: the walled arena fills the screen, a band left top and bottom for the HUD */
  fitCamera() {
    const v = game.baseView || game.view, W = game.screen.W || 427, H = game.screen.H || 240;
    const pts = [[0, 0, 30], [368, 0, 30], [0, 240, 0], [368, 240, 0], [0, 240, 8], [368, 240, 8]].map(p => v.p(p[0], p[1], p[2]));
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const bw = x1 - x0, bh = y1 - y0;
    let z = Math.min(W / bw, (H - 40) / bh); z = clamp(z, .6, 1.6) * MT.T.camZoom;
    if (Math.abs(game.zoom - z) > .004) game.setZoom(z);
    const fc = v.p(184, 120, 0), cy = (y0 + y1) / 2;
    game.cam.offset = [0, Math.round((fc[1] - cy) * z)];
    this.zoom = z;
  }
  draw(r, t, world) {
    const map = this.map;
    map.drawFloor(r);
    for (const h of this.hazards) this.drawHazard(r, h, t);
    MT.art.drawOutside(r, this.set, t, this.crowd, world);
    map.queueWalls(r);
    this.drawMarquee(r, t);
    for (const id of DOOR_IDS) MT.art.drawDoor(r, this.set, this.doors[id], t);
    for (const [id, x, y, f] of this.set.corner) if (E.SHAPES[id]) r.shape(id, x, y, 0, { facing: f, scale: id.includes('palm') ? .55 : 1 });
    if (this.cage && this.cage.h > .5) r.shape('mt:cage', this.cage.x, this.cage.y, this.cage.z || 0);
    MT.art.drawSetLights(r, this.set, t, world);
  }
  /** marquee bulbs chasing along the top of the north wall and the side walls (per frame) */
  drawMarquee(r, t) {
    if (this.setId === 'greenroom') return;
    r.queue(184, 8, 27, g => {
      const step = 8, k = Math.floor(t * 10);
      for (let x = 4; x < 364; x += step) { if (x > 152 && x < 216) continue; const [sx, sy] = r.w(x, 2, 26.5), on = ((x / step) + k) % 4 === 0; px.dot(g, sx, sy, on ? '#fff6b0' : '#8a6a20'); if (on) px.dot(g, sx, sy - 1, '#ffffff'); }
    }, { emissive: true, bias: 1 });
    for (const side of [0, 1]) r.queue(side ? 362 : 6, 120, 27, g => {
      const k = Math.floor(t * 10);
      for (let y = 6; y < 228; y += 8) { if (y > 88 && y < 152) continue; const [sx, sy] = r.w(side ? 362 : 6, y, 26.5), on = ((y / 8) + k) % 4 === 0; px.dot(g, sx, sy, on ? '#fff6b0' : '#8a6a20'); }
    }, { emissive: true });
  }
  drawHazard(r, h, t) {
    if (h.kind === 'conveyor') {
      for (let i = 0; i < h.rows.length; i++) {
        const [a, b] = h.rows[i], y0 = 16 + a * 16 + 8, y1 = 16 + (b + 1) * 16 + 8, dir = h.dirs[i];
        r.decal(g => {
          const p = [r.w(AR.X0, y0, 0), r.w(AR.X1, y0, 0), r.w(AR.X1, y1, 0), r.w(AR.X0, y1, 0)];
          px.poly(g, p, '#2a2830'); px.line(g, p[0][0], p[0][1], p[1][0], p[1][1], h.warn && Math.floor(t * 6) % 2 ? '#ff3344' : '#ffcc33'); px.line(g, p[3][0], p[3][1], p[2][0], p[2][1], h.warn && Math.floor(t * 6) % 2 ? '#ff3344' : '#ffcc33');
          const off = (h.scroll * dir) % 24;
          for (let x = AR.X0 + 12 + ((off + 24) % 24) - 12; x < AR.X1 - 6; x += 24) {
            const yc = (y0 + y1) / 2, q = [r.w(x - 5 * dir, yc - 8, 0), r.w(x + 3 * dir, yc, 0), r.w(x - 5 * dir, yc + 8, 0)];
            px.line(g, q[0][0], q[0][1], q[1][0], q[1][1], '#5a5868', 2); px.line(g, q[1][0], q[1][1], q[2][0], q[2][1], '#5a5868', 2);
          }
          for (let x = AR.X0 + 4; x < AR.X1; x += 8) { const s = r.w(x - ((h.scroll * dir) % 8), y0 + 1, 0); px.dot(g, s[0], s[1], '#4a4858'); }
        });
      }
    } else if (h.kind === 'pyro') {
      for (const v of h.vents) {
        r.decal(g => { const c = v.state === 'tele' ? (Math.floor(t * 12) % 2 ? '#ff6a20' : '#ffcc33') : v.state === 'fire' ? '#ff9a3c' : '#3a3440'; r.groundDisc(v.x, v.y, 9, '#141018', 1); r.groundRing(v.x, v.y, 9, c, 1); for (let k = -6; k <= 6; k += 4) { const a = r.w(v.x - 6, v.y + k, 0), b = r.w(v.x + 6, v.y + k, 0); px.line(g, a[0], a[1], b[0], b[1], c); } }, { emissive: v.state !== 'idle' ? 1 : 0 });
        if (v.state === 'tele' && Math.random() < .3 && game.particles) game.particles.sparks(v.x, v.y, 2, 1, -Math.PI / 2, { color: '#ffcc33' });
        if (v.state === 'fire') {
          const k = Math.min(1, v.t * 6), hh = 34 * k * (1 - Math.max(0, v.t - 1) * 5);
          r.queue(v.x, v.y, 0, g => {
            for (let i = 0; i < 9; i++) { const z = i / 8 * hh, w = 9 * (1 - i / 10) + Math.sin(t * 30 + i) * 1.5, [sx, sy] = r.w(v.x, v.y, z); px.ell(g, sx, sy, w, 3, i < 3 ? '#fff6b0' : i < 6 ? '#ffb030' : '#ff5a20'); }
          }, { emissive: true });
          game.lights.add(v.x, v.y, 14, 70, .9, { color: '#ff9a3c' });
          if (Math.random() < .5 && game.particles) game.particles.fire(v.x, v.y, hh * .8, 1, { size: 1 });
        }
      }
    }
  }
}
MT.Arena = Arena;
