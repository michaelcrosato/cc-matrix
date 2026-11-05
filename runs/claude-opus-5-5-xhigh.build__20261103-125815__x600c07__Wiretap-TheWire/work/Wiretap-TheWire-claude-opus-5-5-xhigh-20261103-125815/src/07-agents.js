/* 07-agents: an Agent is an E.Body + a Humanoid + a brain (or a controller). They walk the map on cached FlowFields,
   unstick themselves, bark in speech bubbles with gibberish voices, and pose. The Crowd keeps Penn Row alive. */
const Flow = {
  cache: new Map(), map: null,
  field(x, y) {
    const m = this.map; const [cx, cy] = m.toCell(x, y), k = cx + ',' + cy;
    let f = this.cache.get(k);
    if (!f) { if (this.cache.size > 90) this.cache.delete(this.cache.keys().next().value); f = new E.FlowField(m); this.cache.set(k, f); }
    f.update(W(cx), W(cy)); return f;
  },
  dir(from, tx, ty) { const f = this.field(tx, ty); return f.dir(from.x, from.y, tx, ty); },
  reset(map) { this.map = map; this.cache.clear(); }
};
let AGENT_ID = 0;
class Agent {
  constructor(o = {}) {
    this.uid = ++AGENT_ID; this.id = o.id || ('a' + this.uid); this.person = o.person || null; this.seed = o.seed || this.uid * 7919;
    if (o.rig) this.rig = o.rig; else if (this.person && PEOPLE[this.person] && PEOPLE[this.person].rig) this.rig = new E.Humanoid(Object.assign({ weapon: null }, PEOPLE[this.person].rig, { colors: Object.assign({}, PEOPLE[this.person].rig.colors) }));
    else { const c = civilianRig(this.seed); this.rig = c.rig; this.kid = c.kid; this.voice = c.voice; }
    this.voice = o.voice || this.voice || this.person || 'man' + this.seed;
    this.body = new E.Body({ x: o.x || 0, y: o.y || 0, r: o.r || 4.5 }); this.body.friction = 0;
    this.facing = o.facing || 0; this.walkSpeed = o.walk || 44; this.speed = 0;
    this.role = o.role || 'civ'; this.watcher = !!o.watcher; this.range = o.range || 150; this.fov = o.fov || 1.7;
    this.knows = new Set(); this.minds = {}; this.act = null; this.actHist = []; this.bark = null; this.barkT = 0;
    this.goal = null; this.onArrive = null; this.pose = o.pose || null; this.t = 0; this.wait = 0; this.hidden = false; this.solid = true;
    this.prog = { t: 0, x: this.body.x, y: this.body.y, n: 0 }; this.vx = 0; this.vy = 0; this.crouch = false; this.sprint = false; this.down = 0;
    this.chest = undefined; this.eye = undefined; this.exposure = 1; this.carry = null; this.tags = o.tags || {};
    Object.assign(this, o.extra || {});
  }
  get x() { return this.body.x; } set x(v) { this.body.x = v; }
  get y() { return this.body.y; } set y(v) { this.body.y = v; }
  get z() { return this.body.z; } set z(v) { this.body.z = v; }
  get r() { return this.body.r; }
  place(x, y) { this.body.x = x; this.body.y = y; this.body.vx = this.body.vy = 0; this.goal = null; this.prog = { t: 0, x, y, n: 0 }; return this; }
  goTo(x, y, speed, then) { this.goal = { x, y }; this.speed = speed || this.walkSpeed; this.onArrive = then || null; this.pose = null; return this; }
  stop() { this.goal = null; this.onArrive = null; this.vx = this.vy = 0; }
  faceTo(p) { this.facing = Math.atan2(p.y - this.y, p.x - this.x); }
  /** an evidentiary act right now (sale-money, sale-product, reup-handoff, payphone, stash-access, count-handoff, robbery) */
  doAct(kind, secs, with_) { this.act = { kind, t: secs, with: with_ }; this.actHist.push({ kind, at: game.time }); if (this.actHist.length > 8) this.actHist.shift(); bus.emit('act', { agent: this, kind }); }
  actedWithin(s) { return this.act || this.actHist.some(h => game.time - h.at < s); }
  say(text, secs = 2.6, o = {}) { this.bark = { text: clean(text), t: secs, max: secs, intel: o.intel || null, heard: false, key: o.key }; this.barkT = 0; return this; }
  update(dt) {
    this.t += dt; if (this.act && (this.act.t -= dt) <= 0) this.act = null;
    if (this.bark && (this.bark.t -= dt) <= 0) this.bark = null;
    const m = World.cur || World.map;
    if (this.locked) { this.body.vx = this.body.vy = 0; }
    else if (this.goal) {
      const d = Math.hypot(this.goal.x - this.x, this.goal.y - this.y);
      if (d < 5) { const f = this.onArrive; this.goal = null; this.onArrive = null; this.vx = this.vy = 0; if (f) f(this); }
      else {
        const dir = this.ghost ? [(this.goal.x - this.x) / d, (this.goal.y - this.y) / d] : d < 20 && m.los(this.x, this.y, this.goal.x, this.goal.y) ? [(this.goal.x - this.x) / d, (this.goal.y - this.y) / d] : (m === World.map ? Flow.dir(this, this.goal.x, this.goal.y) : [(this.goal.x - this.x) / d, (this.goal.y - this.y) / d]);
        this.vx = dir[0] * this.speed; this.vy = dir[1] * this.speed;
        this.stuck(dt);
      }
    }
    this.body.vx = this.vx; this.body.vy = this.vy;
    if (!this.ghost) this.body.update(dt, m); else { this.body.x += this.vx * dt; this.body.y += this.vy * dt; }
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 4) this.facing = E.approachAng(this.facing, Math.atan2(this.vy, this.vx), dt * 9);
    if (this.faceGoal != null) this.facing = E.approachAng(this.facing, this.faceGoal, dt * 6);
    if (this.light) { this.rig.C.boot = sp > 60 && Math.floor(this.t * 8) % 2 ? '#ff5af0' : '#e8e8e8'; }
    poseRig(this.rig, dt, { x: this.x, y: this.y, z: this.z, vx: this.vx, vy: this.vy, facing: this.facing, crouch: this.crouch, sprint: this.sprint, down: this.down, run: 0, expr: this.expr }, this.pose, this.t);
  }
  /** less than 4 units of progress in 3 s: nudge sideways, then hop to the nearest walkable cell out of view */
  stuck(dt) {
    const p = this.prog; p.t += dt; if (p.t < 3) return;
    const moved = Math.hypot(this.x - p.x, this.y - p.y);
    if (moved < 4) {
      p.n++;
      if (p.n === 1) { const a = this.facing + Math.PI / 2; this.body.x += Math.cos(a) * 6; this.body.y += Math.sin(a) * 6; }
      else { const w = World.walkableNear(this.goal ? lerp(this.x, this.goal.x, .3) : this.x, this.goal ? lerp(this.y, this.goal.y, .3) : this.y); this.body.x = w.x; this.body.y = w.y; p.n = 0; }
    } else p.n = 0;
    p.t = 0; p.x = this.x; p.y = this.y;
  }
}
function drawAgent(r, a, o = {}) {
  if (a.hidden) return;
  if (!r.visible(a.x, a.y, a.z, 40, 70, 30)) return;
  r.shadow(a.x, a.y, a.down > .5 ? 9 : 5.5, .38);
  if (o.ring) r.groundRing(a.x, a.y, 9, o.ring, .9);
  r.actor(a.x, a.y, a.z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { pick: a, xray: o.xray, alpha: o.alpha, flash: o.flash, every: o.bg ? 2 : 1, key: a, outline: true });
  if (a.carry === 'bike' || a.bike) r.shape('bike', a.x - Math.cos(a.facing) * 2, a.y - Math.sin(a.facing) * 2, 0, { facing: a.facing - Math.PI / 2 + Math.PI });
  if (a.stroller) r.shape('stroller', a.x + Math.cos(a.facing) * 9, a.y + Math.sin(a.facing) * 9, 0, { facing: a.facing - Math.PI / 2 });
}
/** speech bubbles: readable within 48 units of the listener while the speaker isn't wary of them, else "…" */
function drawBubbles(r, agents, listener) {
  r.overlay(g => {
    for (const a of agents) {
      if (!a.bark || a.hidden) continue;
      const [sx, sy] = r.w(a.x, a.y, a.z + 44 * (a.rig.o.size || 1.2) / 1.25); if (sx < -60 || sx > r.W + 60 || sy < -10 || sy > r.H + 10) continue;
      const near = !listener || Math.hypot(a.x - listener.x, a.y - listener.y) < 48 || a.loud;
      const mind = listener && a.minds && a.minds[listener.id], wary = mind && mind.state !== 'calm' && !a.loud;
      const text = near && !wary ? a.bark.text : '…';
      if (near && !wary && a.bark.intel && !a.bark.heard) { a.bark.heard = true; bus.emit('overheard', { agent: a, intel: a.bark.intel, text: a.bark.text }); }
      const lines = E.font.wrap(text, 96), w = Math.max(...lines.map(l => E.font.width(l))) + 8, h = lines.length * 9 + 4, x = Math.round(sx - w / 2), y = Math.round(sy - h - 6);
      px.rect(g, x, y, w, h, '#101010'); px.rect(g, x + 1, y + 1, w - 2, h - 2, a.bark.intel && near && !wary ? '#fff3c8' : '#f4f0e6');
      px.rect(g, Math.round(sx) - 1, y + h, 3, 2, '#101010'); px.dot(g, Math.round(sx), y + h + 2, '#101010');
      lines.forEach((l, i) => E.font.text(g, l, x + 4, y + 3 + i * 9, '#1a1610', { outline: false }));
    }
  });
}
/** a bark heard within earshot plays its babble once */
function speakBark(a, listener) {
  if (!a.bark || a.bark.spoken || !listener) return;
  if (Math.hypot(a.x - listener.x, a.y - listener.y) > 140) return;
  a.bark.spoken = true; const txt = a.bark.text, p = voiceOf(a.voice);
  let i = 0; const step = () => { if (i >= txt.length || !a.bark) return; Voice.char(txt, i, p); i++; game.after(1 / 30, step); }; step();
}

/* ---- the crowd: civilians walking the sidewalks, waiting for the bus, sitting on stoops ---- */
const SIDEWALK_POIS = [[3, 12], [20, 12], [40, 12], [62, 12], [3, 15], [20, 15], [44, 15], [7, 20], [20, 26], [27, 26], [36, 26], [44, 26], [52, 26], [63, 26], [70, 26],
  [3, 30], [12, 30], [24, 30], [36, 30], [42, 30], [50, 30], [64, 30], [70, 30], [33, 36], [33, 44], [30, 44], [18, 44], [57, 40], [57, 50], [62, 44], [9, 36], [9, 48], [45, 44], [44, 36], [45, 42], [6, 40], [59, 18]].map(([x, y]) => [W(x), W(y)]);
const EXITS = [[7.5, 1], [32, 1], [58, 1], [7.5, 54.5], [32, 54.5], [58, 54.5], [1, 13.5], [1, 28], [70.5, 13.5], [70.5, 28]].map(([x, y]) => [W(x), W(y)]);
const Crowd = {
  list: [], max: 25, zone: null, seed: 1,
  reset(n, zone, seed = 7) { this.list = []; this.max = n; this.zone = zone || null; this.seed = seed; for (let i = 0; i < n; i++) this.spawn(true); },
  inZone(x, y) { const z = this.zone; return !z || (x > W(z[0]) && x < W(z[2]) && y > W(z[1]) && y < W(z[3])); },
  pois() { return SIDEWALK_POIS.filter(p => this.inZone(p[0], p[1])); },
  spawn(anywhere) {
    const r = RNG.world, P = this.pois(), from = anywhere ? pick(r, P) : pick(r, this.zone ? P : EXITS);
    const a = new Agent({ seed: (this.seed++ * 2654435761) >>> 0, x: from[0] + (r() - .5) * 10, y: from[1] + (r() - .5) * 10, walk: 30 + r() * 18, role: 'civ' });
    a.plan = 0; a.facing = r() * TAU; this.list.push(a); this.next(a); return a;
  },
  next(a) {
    const r = RNG.world, P = this.pois(); a.plan++;
    if (a.plan > 3 + Math.floor(r() * 3) && !this.zone) { const ex = pick(r, EXITS); a.goTo(ex[0], ex[1], a.walkSpeed, () => { a.gone = true; }); return; }
    const roll = r();
    if (roll < .32) { const p = pick(r, P); a.goTo(p[0] + (r() - .5) * 12, p[1] + (r() - .5) * 8, a.walkSpeed, () => this.next(a)); }
    else { a.wait = 4 + r() * 12; a.pose = pick(r, a.kid ? ['crouch', null, 'wave'] : [null, 'phone', 'smoke', 'hips', 'lean', null]); a.idleFor = a.wait; }
    if (roll >= .32 && r() < .25) a.say(pick(r, CIV_BARKS), 3);
  },
  tick(dt, listener) {
    for (const a of this.list) {
      if (a.idleFor > 0) { a.idleFor -= dt; a.vx = a.vy = 0; if (a.idleFor <= 0) { a.pose = null; this.next(a); } }
      a.update(dt); if (listener) speakBark(a, listener);
    }
    const before = this.list.length; this.list = this.list.filter(a => !a.gone);
    for (let i = this.list.length; i < this.max && i < before + 1; i++) this.spawn(false);
  }
};
const CIV_BARKS = ['Bus late again.', 'Orioles ain\'t got no bullpen.', 'It\'s hot for October.', 'You see Darlene\'s nephew?', 'Twenty-two never comes.', 'Rent went up again.', 'Mm-hm.', 'Church at ten, baby.', 'They fixing that streetlight?', 'Hey, how you doing?', 'Lord, these knees.', 'He owes me twenty.', 'They towed my car.', 'Ravens gonna lose.'];
