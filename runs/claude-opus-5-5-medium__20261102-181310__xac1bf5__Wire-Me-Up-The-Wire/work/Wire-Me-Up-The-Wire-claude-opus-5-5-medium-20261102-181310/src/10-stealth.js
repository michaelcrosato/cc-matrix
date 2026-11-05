/* ============================================================================
 * 10-stealth: what both street chapters share. Detectives (up to two at one machine), the camera lens and its
 * photographs, watchers (lookouts, muscle) with eyes and a mind, walkers on errands, cars, toasts, chatter.
 * ========================================================================== */
const noise = (x, y) => E.noise2(x * .13, y * .13);
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const shadeRGB = (c, k) => c.map(v => clamp(Math.round(v * k), 0, 255));
/* the floors of a West Baltimore block, by tag: asphalt, sidewalk, courtyard dirt and grass, alley, lot gravel, pier planks */
function streetFloor(x, y, tag) {
  const n = noise(x, y), h = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1, sp = Math.abs(h);
  if (tag === 'walk') { const seam = (Math.floor(x) % 24 === 0 || Math.floor(y) % 24 === 0); const c = seam ? [92, 90, 86] : shadeRGB([142, 138, 130], .92 + n * .1 + sp * .05); return c; }
  if (tag === 'curb') return shadeRGB([168, 162, 150], .95 + sp * .06);
  if (tag === 'dirt') { const grass = n > .1; return grass ? shadeRGB([74, 92, 52], .85 + sp * .25) : shadeRGB([104, 86, 64], .85 + sp * .2); }
  if (tag === 'alley') { const crack = Math.abs(Math.sin(x * .21 + Math.sin(y * .17) * 2)) < .03; return crack ? [40, 38, 36] : shadeRGB([96, 92, 88], .85 + n * .15 + sp * .05); }
  if (tag === 'lot') return shadeRGB([92, 82, 70], .7 + sp * .5);
  if (tag === 'plank') { const seam = Math.floor(y) % 8 === 0; return seam ? [40, 32, 26] : shadeRGB([92, 74, 56], .8 + n * .2 + sp * .08); }
  if (tag === 'conc') return shadeRGB([96, 98, 102], .82 + n * .14 + sp * .06);
  if (tag === 'water') { const w = Math.sin(x * .3 + y * .1) * .5 + .5; return shadeRGB([22, 36, 52], .8 + w * .3); }
  if (tag === 'line') { const u = ((x % 16) + 16) % 16, v = ((y % 16) + 16) % 16; if (v >= 7 && v < 9 && u < 11) return [196, 176, 70]; }
  // asphalt
  const patch = n > .38; return patch ? shadeRGB([46, 46, 50], .9 + sp * .1) : shadeRGB([58, 58, 62], .85 + sp * .2 + n * .05);
}

/* ---- cars: a wall cell gives the body (solid, low cover); the cabin, glass and wheels are drawn on it ---- */
function drawCarTop(r, car) {
  const { x0, y0, x1, y1, color } = car, horiz = x1 - x0 > y1 - y0, t = E.tones(color);
  r.queue((x0 + x1) / 2, (y0 + y1) / 2, 14, g => {
    const ix = horiz ? (x1 - x0) * .22 : 2, iy = horiz ? 2 : (y1 - y0) * .22;
    if (car.body) r.box(g, x0, y0, 0, x1, y1, 14, t.base, t.sh);
    r.box(g, x0 + ix, y0 + iy, 14, x1 - ix, y1 - iy, 22, t.lt, '#3a4a5a');
    const w = horiz ? [[x0 + 5, y1 + .2], [x1 - 5, y1 + .2]] : [[x1 + .2, y0 + 5], [x1 + .2, y1 - 5]];
    for (const [wx, wy] of w) { const p = r.w(wx, wy, 3); px.disc(g, Math.round(p[0]), Math.round(p[1]), 2, '#101010'); }
    const lp = horiz ? r.w(x1, (y0 + y1) / 2, 9) : r.w((x0 + x1) / 2, y1, 9);
    px.rect(g, Math.round(lp[0]) - 1, Math.round(lp[1]) - 1, 2, 2, car.lit ? '#fff0b0' : '#c8c0a0');
  }, { bias: 2, hides: true });
}
/* the unmarked car: a tired Caprice in detective grey */
const UNMARKED = '#6a6e74';

/* ---- toasts: short notices at the top of the screen ---- */
const TOASTS = [];
function toast(title, text = '', color = '#f0c060', secs = 3) { TOASTS.push({ title, text, color, t: secs, max: secs }); if (TOASTS.length > 3) TOASTS.shift(); }
function drawToasts(g, W, y0 = 20) {
  let y = y0;
  for (const t of TOASTS) {
    const a = Math.min(1, t.t * 3, (t.max - t.t) * 6), w = Math.max(E.font.width(t.title), E.font.width(t.text)) + 16;
    if (a <= 0) continue;
    panel(g, W / 2 - w / 2, y, w, t.text ? 24 : 14, .85 * a);
    txt(g, t.title, W / 2, y + 3, t.color, { align: 'center' });
    if (t.text) txt(g, t.text, W / 2, y + 13, '#d8d2c0', { align: 'center' });
    y += t.text ? 27 : 17;
  }
}
function tickToasts(dt) { for (const t of TOASTS) t.t -= dt; while (TOASTS.length && TOASTS[0].t <= 0) TOASTS.shift(); }

/* ---- chatter: gibberish over a head, subtitled ---- */
const BUBBLES = [];
function bark(who, body, text, secs = 2.6) {
  for (let i = BUBBLES.length - 1; i >= 0; i--) if (BUBBLES[i].body === body) BUBBLES.splice(i, 1);
  BUBBLES.push({ who, body, text, t: secs, n: 0, acc: 0 });
}
function tickBubbles(dt) {
  for (const b of BUBBLES) {
    b.t -= dt; b.acc += dt;
    if (b.n < b.text.length && b.acc > .045) { b.acc = 0; const ch = b.text[b.n++]; if (ch !== ' ' && b.n % 2 && onScreen(b.body)) A.sfx(syllable(b.who, ch), { vol: .7 }); }
  }
  for (let i = BUBBLES.length - 1; i >= 0; i--) if (BUBBLES[i].t <= 0) BUBBLES.splice(i, 1);
}
const onScreen = (b) => { const r = game.r; if (!r || !r.w) return true; const p = r.w(b.x, b.y, b.z || 0); return p[0] > -20 && p[0] < game.W + 20 && p[1] > -20 && p[1] < game.H + 20; };
function drawBubbles(r, g) {
  if (!S.subtitles) return;
  for (const b of BUBBLES) {
    const p = r.w(b.body.x, b.body.y, (b.body.z || 0) + 50), s = b.text.slice(0, b.n), w = Math.min(150, E.font.width(b.text) + 8);
    const lines = E.font.wrap(s, w - 6), h = lines.length * 9 + 4, x = clamp(Math.round(p[0] - w / 2), 2, game.W - w - 2), y = clamp(Math.round(p[1] - h), 2, game.H - h - 2);
    px.blend(g, .75, 'normal', () => px.rect(g, x, y, w, h, '#0a0a0c'));
    lines.forEach((l, i) => txt(g, l, x + 3, y + 2 + i * 9, b.who === 'LOOKOUT' ? '#ffd040' : '#f0ead8'));
  }
}

/* ---- walkers: corner boys, fiends, the lieutenant; bodies that walk to points and stand ---- */
class Walker {
  constructor(x, y, rig, o = {}) {
    this.body = new E.Body({ x, y, r: 4.5 }); this.rig = rig; this.speed = o.speed || 32; this.target = null; this.queue = []; this.facing = o.facing || 0;
    this.who = o.who || 'DEFAULT'; this.hidden = false; this.wait = 0; this.pose = null; this.tag = o.tag || '';
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  go(...pts) { this.queue = pts.map(p => ({ x: p[0], y: p[1], wait: p[2] || 0 })); this.target = null; return this; }
  then(fn) { this.queue.push({ fn }); return this; }
  get idle() { return !this.target && !this.queue.length && this.wait <= 0; }
  update(dt, map) {
    const b = this.body;
    if (this.wait > 0) { this.wait -= dt; b.vx = b.vy = 0; }
    else {
      if (!this.target && this.queue.length) { const q = this.queue.shift(); if (q.fn) q.fn(this); else this.target = q; }
      if (this.target) {
        const dx = this.target.x - b.x, dy = this.target.y - b.y, d = Math.hypot(dx, dy);
        if (d < 3) { b.vx = b.vy = 0; this.wait = this.target.wait; this.target = null; this.stuck = 0; }
        else {
          b.vx = dx / d * this.speed; b.vy = dy / d * this.speed; this.facing = E.approachAng(this.facing, Math.atan2(dy, dx), dt * 8);
          // walled in (a car parked in the way): slide round it, and after a while give up on that point
          if (this.lastD !== undefined && this.lastD - d < this.speed * dt * .3) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > .4) { const s2 = Math.sign(Math.sin(this.stuck * 2)) || 1; b.vx += -dy / d * this.speed * s2; b.vy += dx / d * this.speed * s2; } if (this.stuck > 3) { b.x = this.target.x; b.y = this.target.y; this.stuck = 0; } } else this.stuck = 0;
          this.lastD = d;
        }
      } else { b.vx = b.vy = 0; }
    }
    b.update(dt, map);
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: this.facing, pose: this.pose, expr: this.expr });
  }
  face(x, y) { this.facing = Math.atan2(y - this.body.y, x - this.body.x); }
  draw(r, o = {}) {
    if (this.hidden) return;
    const b = this.body;
    r.shadow(b.x, b.y, 5, .35);
    r.actor(b.x, b.y, b.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), Object.assign({ every: 1, key: this }, o));
  }
}

/* ---- watchers: lookouts on stoops and corners, muscle on the pier; eyes (E.sees), a mind (E.Suspicion) ---- */
class Watcher extends Walker {
  constructor(x, y, rig, o = {}) {
    super(x, y, rig, o);
    this.range = o.range || 118; this.fov = o.fov || 1.35; this.scan = o.scan || null; this.scanT = Math.random() * 6;
    this.mind = new E.Suspicion({ rise: o.rise || 1.25, decay: .28, forget: 5 }); this.home = [x, y]; this.route = o.route || null; this.at = 0;
    this.flash = !!o.flash; this.alertFired = false;
  }
  look(dt, dets, map) {
    let best = { seen: false, exposure: 0 }, who = null;
    for (const d of dets) {
      if (d.inCar || d.ghost) continue;
      const s = E.sees(this, d.hero, { map, range: this.range, fov: this.fov, facing: this.facing });
      if (s.seen) {
        let ex = s.exposure;
        if (d.lens.on) ex *= 1.6;              // a raised camera draws eyes
        if (d.hero.sprinting) ex *= 1.3;
        if (d.searching) ex *= 2;
        if (ex > best.exposure) { best = Object.assign({}, s, { exposure: Math.min(1, ex) }); who = d; }
      }
    }
    const st = this.mind.update(dt, best.seen && best.exposure > .05 ? best : { seen: false, exposure: 0 }, who ? who.hero : null);
    this.spotted = who;
    return st;
  }
  think(dt, map) {
    const st = this.mind.state;
    if (st === 'notice' || st === 'search' || st === 'alert') {
      if (this.mind.last) { const a = Math.atan2(this.mind.last.y - this.y, this.mind.last.x - this.x); this.facing = E.approachAng(this.facing, a, dt * 4); }
      this.queue = []; this.target = null;
      if (st === 'search' && this.route && this.mind.last) {   // muscle walk over to see
        const dx = this.mind.last.x - this.x, dy = this.mind.last.y - this.y, d = Math.hypot(dx, dy);
        this.body.vx = d > 10 ? dx / d * 30 : 0; this.body.vy = d > 10 ? dy / d * 30 : 0;
      } else if (st === 'alert' && this.route && this.mind.last) {
        const dx = this.mind.last.x - this.x, dy = this.mind.last.y - this.y, d = Math.hypot(dx, dy);
        this.body.vx = d > 6 ? dx / d * 62 : 0; this.body.vy = d > 6 ? dy / d * 62 : 0;
      } else { this.body.vx = this.body.vy = 0; }
      this.body.update(dt, map);
      this.rig.update(dt, { x: this.x, y: this.y, z: this.z, vx: this.body.vx, vy: this.body.vy, facing: this.facing, expr: st === 'alert' ? 'shout' : null, pose: st === 'notice' ? 'hips' : null });
      return;
    }
    if (this.route) {   // patrol
      if (this.idle) { const p = this.route[this.at]; this.at = (this.at + 1) % this.route.length; this.go([p[0], p[1], p[2] || 1.2]); }
      if (this.wait > 0 && this.scan) { this.scanT += dt; this.facing += Math.sin(this.scanT * 1.4) * dt * .9; }
    } else if (this.scan) {   // a lookout: turns his head between the directions he watches
      this.scanT += dt; const n = this.scan.length, k = Math.floor(this.scanT / 3.2) % n;
      this.facing = E.approachAng(this.facing, this.scan[k], dt * 2.2);
    }
    super.update(dt, map);
  }
}

/* ---- the detective: a Mover, a camera, a toggle crouch, a seat in the car ---- */
const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
class Detective {
  constructor(x, y, castId, inp, o = {}) {
    this.hero = new E.Mover({ x, y, r: 5, climb: false, vault: 0, walk: 42, run: 70, sneak: 30, sprintSpeed: 105, hopMax: 0 });
    this.hero.climbMax = 0; this.hero.facing = o.facing || 0;
    this.rig = o.rig || CAST[castId].rig; this.castId = castId; this.inp = inp; this.crouch = false; this.inCar = !!o.inCar; this.car = o.car || null;
    this.lens = { on: false, x, y, k: 0, range: 150, flash: 0 }; this.shots = 0; this.label = o.label || ''; this.color = o.color || '#f0c060'; this.searching = false; this.ai = null;
  }
  get x() { return this.hero.x; } get y() { return this.hero.y; }
  update(dt, map, ctx) {
    const h = this.hero, inp = this.inp, ai = this.ai;
    const down = a => ai ? !!ai.down[a] : inp.down(a), pressed = a => ai ? !!ai.pressed[a] : inp.pressed(a);
    if (this.inCar) {   // a stakeout: the car's driver's seat
      this.lens.range = 230;
      if (pressed('interact') && !this.lens.on) { this.inCar = false; h.x = this.car.ex; h.y = this.car.ey; A.sfx('door2'); }
    } else this.lens.range = 150;
    if (pressed('crouch') && !this.inCar) { this.crouch = !this.crouch; A.sfx('step', { vol: .4 }); }
    // the lens: hold to raise the camera; the stick, the keys or the mouse move the frame
    const wantAim = down('aim');
    if (wantAim && !this.lens.on) {
      this.lens.on = true; this.lens.x = h.x + Math.cos(h.facing) * 50; this.lens.y = h.y + Math.sin(h.facing) * 50; A.sfx('click');
    } else if (!wantAim && this.lens.on) this.lens.on = false;
    this.lens.k = approach(this.lens.k, this.lens.on ? 1 : 0, dt * 5);
    if (this.lens.flash > 0) this.lens.flash -= dt;
    let mv = [0, 0];
    if (ai) mv = ai.move || [0, 0];
    else mv = stickMove(inp);
    if (this.lens.on) {
      const L2 = this.lens;
      if (ai && ai.lens) { L2.x = approach(L2.x, ai.lens[0], dt * 140); L2.y = approach(L2.y, ai.lens[1], dt * 140); }
      else if (inp.lastDevice === 'mouse' && inp === game.input && game.mouseGround()) { const m = game.mouseGround(); L2.x = m.x !== undefined ? m.x : m[0]; L2.y = m.y !== undefined ? m.y : m[1]; }
      else {
        const rs = rightStick(inp), src = rs && Math.hypot(rs[0], rs[1]) > .1 ? rs : mv, gd = groundDir(src);
        L2.x += gd[0] * 150 * dt; L2.y += gd[1] * 150 * dt;
        if (S.lensAssist && ctx && ctx.subjects && Math.hypot(src[0], src[1]) < .1) {   // a gentle pull to the nearest live subject
          let best = null, bd = 40; for (const s of ctx.subjects) if (s.active()) { const c = subjectCenter(s), d = Math.hypot(c[0] - L2.x, c[1] - L2.y); if (d < bd) { bd = d; best = c; } }
          if (best) { L2.x = approach(L2.x, best[0], dt * 40); L2.y = approach(L2.y, best[1], dt * 40); }
        }
      }
      const dx = L2.x - h.x, dy = L2.y - h.y, d = Math.hypot(dx, dy);
      if (d > L2.range) { L2.x = h.x + dx / d * L2.range; L2.y = h.y + dy / d * L2.range; }
      if (!this.inCar) h.facing = E.approachAng(h.facing, Math.atan2(dy, dx), dt * 10);
      mv = [0, 0];
      if (pressed('snap')) this.snap(ctx);
    }
    if (!this.inCar) {
      const gd = groundDir(mv), sprint = down('sprint') && !this.crouch;
      h.update(dt, map, { move: gd, sprint, crouch: this.crouch });
    }
    const still = Math.hypot(h.vx, h.vy) < 4;
    this.rig.update(dt, h.rigState({ point: this.lens.on, aim: this.lens.on ? .15 : 0, pose: this.searching ? 'kneel' : null }));
    this.still = still;
  }
  /* a photograph: every live subject whose people all sit in the frame, in range, in sight */
  snap(ctx) {
    this.shots++; this.lens.flash = .25; A.sfx('shutter'); game.flash('#ffffff', .06, .35);
    if (!ctx || !ctx.subjects) return;
    const h = this.hero, eye = this.inCar ? { x: h.x, y: h.y, z: 0, eye: 24 } : h, R = 30;
    let got = null, why = '';
    for (const s of ctx.subjects) {
      if (!s.active() || (s.once !== false && CASE.has(s.id))) continue;
      const pts = s.pts(), inFrame = pts.every(p => Math.hypot(p.x - this.lens.x, p.y - this.lens.y) < R);
      if (!inFrame) { if (pts.some(p => Math.hypot(p.x - this.lens.x, p.y - this.lens.y) < R)) why = 'Get them all in the frame'; continue; }
      const far = pts.some(p => Math.hypot(p.x - h.x, p.y - h.y) > this.lens.range + 10);
      if (far) { why = 'Too far for the lens'; continue; }
      const blocked = pts.some(p => !ctx.map.sight(eye, p, { target: 18 }));
      if (blocked) { why = 'Something is in the way'; continue; }
      got = s; break;
    }
    if (got) {
      const fresh = CASE.add({ id: got.id, label: got.label, note: got.note, rigs: got.rigs(), time: ctx.clock ? HOURS(ctx.clock) : '', who: this.castId, chapter: ctx.chapter });
      if (fresh) { toast('PHOTO LOGGED', got.label, '#9ae89a', 3.2); A.sfx('right'); if (got.onShot) got.onShot(this); P.glints(this.lens.x, this.lens.y, 20, 8, '#ffffff'); }
    } else if (why) toast('NO GOOD', why, '#ff9a6a', 2);
  }
  draw(r) {
    const h = this.hero;
    if (this.inCar) return;
    r.shadow(h.x, h.y, 5, .4);
    r.actor(h.x, h.y, h.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { xray: { color: this.color, actors: true } });
  }
  drawLens(r, g) {
    if (this.lens.k < .02) return;
    const L2 = this.lens, p = r.w(L2.x, L2.y, 14), cx = Math.round(p[0]), cy = Math.round(p[1]), k = this.lens.k, rad = Math.round(26 + (1 - k) * 30);
    const c = this.lens.flash > 0 ? '#ffffff' : '#e8ffe8';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, cx + sx * rad, cy + sy * rad, cx + sx * (rad - 8), cy + sy * rad, c); px.line(g, cx + sx * rad, cy + sy * rad, cx + sx * rad, cy + sy * (rad - 8), c); }
    px.line(g, cx - 4, cy, cx + 4, cy, c); px.line(g, cx, cy - 4, cx, cy + 4, c);
    const d = Math.hypot(L2.x - this.hero.x, L2.y - this.hero.y);
    txt(g, Math.round(d / 16 * 1.5) + ' m', cx + rad + 3, cy - rad, d > L2.range - 4 ? '#ff8a6a' : c);
  }
}
function subjectCenter(s) { const pts = s.pts(); let x = 0, y = 0; for (const p of pts) { x += p.x; y += p.y; } return [x / pts.length, y / pts.length]; }

/* the viewfinder over the whole screen while a camera is raised */
function drawViewfinder(g, W, H, det, clock) {
  const k = det.lens.k; if (k < .02) return;
  const bar = Math.round(18 * k);
  px.blend(g, .85, 'normal', () => { px.rect(g, 0, 0, W, bar, '#000'); px.rect(g, 0, H - bar, W, bar, '#000'); });
  if (k > .6) {
    if (Math.floor(game.real * 2) % 2 === 0) px.disc(g, 12, 9, 3, '#e83a3a');
    txt(g, 'REC  ' + (clock ? HOURS(clock) : ''), 20, 6, '#e8e8e8');
    txt(g, 'ISO 1600  1/250  ' + (det.inCar ? '300mm' : '135mm'), W - 6, 6, '#c8c8c8', { align: 'right' });
    txt(g, 'FRAMES ' + det.shots, W - 6, H - 14, '#c8c8c8', { align: 'right' });
  }
}
