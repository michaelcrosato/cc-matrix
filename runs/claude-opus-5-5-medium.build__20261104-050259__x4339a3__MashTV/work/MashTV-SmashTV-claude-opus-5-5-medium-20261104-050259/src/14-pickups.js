// ---------------------------------------------------------------- pickups: cash, prizes, keys, capsules, bombs, lives, the statuette
MT.PICKUPS = {
  bill: { value: 100, cash: true, spr: () => MT.spr.bill },
  stack: { value: 500, cash: true, spr: () => MT.spr.stack },
  gold: { value: 1000, cash: true, spr: () => MT.spr.gold },
  case: { value: 5000, cash: true, spr: () => MT.spr.case },
  prize: { spr: p => [MT.spr.prizeR, MT.spr.prizeB, MT.spr.prizeG][(p.id || 0) % 3] },
  key: { permanent: true, spr: () => MT.spr.key },
  cap: { cap: true },
  bomb: { spr: () => MT.spr.bulb },
  life: { spr: () => MT.spr.star },
  statue: { permanent: true, spr: () => MT.spr.statue }
};
MT.Pickup = class Pickup {
  constructor(kind, x, y, o = {}) {
    this.id = o.id || MT.nid(); this.kind = kind; this.x = x; this.y = y; this.z = o.z || 0; this.vx = o.vx || 0; this.vy = o.vy || 0; this.vz = o.vz || 0;
    this.w = o.w || null; this.prize = o.prize || null; this.placed = !!o.placed; this.dropFrom = o.dropFrom || 0;
    const P = MT.PICKUPS[kind]; this.ttl = P.permanent || o.placed ? Infinity : 9; this.t = 0; this.dead = false;
  }
  update(dt, W) {
    this.t += dt; this.ttl -= dt; if (this.ttl <= 0) { this.dead = true; return; }
    if (this.z > 0 || this.vz) { this.vz -= 500 * dt; this.z += this.vz * dt; if (this.z <= 0) { this.z = 0; this.vz = Math.abs(this.vz) > 60 ? -this.vz * .3 : 0; } }
    this.x += this.vx * dt; this.y += this.vy * dt; const k = Math.exp(-dt * 4); this.vx *= k; this.vy *= k;
    const push = W.arena.conveyorPush(this);
    if (push) { this.x += push * dt; if (this.kind === 'key') { if (this.x < AR.x0 - 4) this.x = AR.x1 + 2; else if (this.x > AR.x1 + 4) this.x = AR.x0 - 2; } }
    if (!(this.kind === 'key' && W.arena.hazards.conveyor)) MT.clampInterior(this, 4);
    else { this.y = clamp(this.y, AR.y0 + 4, AR.y1 - 4); }
  }
  draw(r, W) {
    if (this.ttl < 2.5 && Math.floor(this.t * 10) % 2) return;
    const bob = Math.sin(this.t * 4 + this.id) * 1.5 + 3, z = this.z + bob, tn = MT.game.time;
    r.shadow(this.x, this.y, 4, .35);
    if (this.kind === 'cap') {
      r.queue(this.x, this.y, z + 6, g => { const p = r.w(this.x, this.y, z + 6); MT.drawCapsule(g, p[0], p[1], this.w, 1, tn); }, { emissive: true });
      MT.game.lights.add(this.x, this.y, 6, 26, .5, { color: (MT.WEAPONS[this.w] || MT.ADDONS[this.w]).color });
      return;
    }
    const P = MT.PICKUPS[this.kind], spr = P.spr(this);
    r.sprite(this.x, this.y, z, spr, { glow: this.kind === 'key' || this.kind === 'statue' ? .9 : .4 });
    if (this.kind === 'key' || this.kind === 'statue') { MT.game.lights.add(this.x, this.y, 8, 40, .8, { color: '#ffd060' }); if (Math.floor(tn * 3) % 2) r.queue(this.x, this.y, z + 10, g => { const p = r.w(this.x + 4, this.y, z + 10); px.dot(g, p[0], p[1], '#ffffff'); px.dot(g, p[0] - 1, p[1], '#fff0a0'); px.dot(g, p[0] + 1, p[1], '#fff0a0'); px.dot(g, p[0], p[1] - 1, '#fff0a0'); px.dot(g, p[0], p[1] + 1, '#fff0a0'); }, { emissive: true }); }
  }
};
