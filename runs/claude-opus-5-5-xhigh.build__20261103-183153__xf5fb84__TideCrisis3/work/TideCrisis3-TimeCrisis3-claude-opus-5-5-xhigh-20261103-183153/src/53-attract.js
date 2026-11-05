/* 53-attract: the Autopilot (it produces the same commands a player does: the tests' 'fair' bot, the attract mode's
 * 'showoff', the dev P2 bot) and the attract mode: after 10 s idle on the title or the menu, a looping demo of
 * highlights (cheats on: god mode, infinite ammo), the high scores, the title; any input goes back to the title. */
const SKILL = { fair: { react: .25, speed: 3.5, head: .3, jitter: .015 }, expert: { react: .18, speed: 3.5, head: .6, jitter: .01 }, showoff: { react: .16, speed: 3.6, head: .55, jitter: .01, show: true } };
class Autopilot {
  constructor(style = 'fair') { this.style = style; this.S = SKILL[style] || SKILL.fair; this.ax = 0; this.ay = 0; this.vx = 0; this.vy = 0; this.lock = null; this.lockT = 0; this.holdCover = 0; this.t = 0; this.fireGap = 0; this.wsel = 0; this.cycle = 0; this.R = E.rng(style.length * 7919 + 1); }
  /** candidate targets: [{ p: world point, r (world radius), pri, kind, ref }] */
  targets(sim, i) {
    const out = [], p = sim.players[i];
    for (const th of sim.threats) if (!th.done && th.target === i && th.kind !== 'grenade' && th.kind !== 'rocket' && th.kind !== 'torpedo' && th.kind !== 'harpoon') { const e = sim.enemyById(th.src); if (e && e.alive && e.vols) out.push({ e, pri: 100 - (th.T - sim.t) * 10, kind: 'threat' }); }
    for (const pr of sim.projectiles) if (pr.alive && pr.owner < 0) out.push({ p: pr.pos.slice(), r: pr.r * 1.5, pri: pr.kind === 'torpedo' ? 120 : 90, kind: 'proj', ref: { id: 'proj:' + pr.id } });
    for (const e of sim.enemies) {
      if (!e.alive || e.civ || e.ally || !e.vols || e.vols.hidden && !e.lean) continue;
      const pri = e.elite ? 60 : e.type === 'rusher' ? 55 : e.type === 'quartermaster' ? 58 : e.type === 'shield' ? 40 : e.type === 'drone' ? 45 : 30;
      out.push({ e, pri: pri + (e.exposed ? 10 : 0) + (e.th ? 20 : 0), kind: 'enemy' });
    }
    const B = sim.boss;
    if (B && !B.dead) {
      for (const part of Object.values(B.parts)) if (part.alive && part.vol && part.open && !part.armor && !part.vol.box) out.push({ p: part.vol.c ? part.vol.c.slice() : V3.lerp(part.vol.a, part.vol.b, .5), r: part.vol.r, pri: part.weak ? 50 : 35, kind: 'boss', ref: { id: 'part:' + part.id } });
      const shielded = Object.values(B.parts).some(q => q.armor && q.alive && q.vol);
      for (const r of B.rigs) if (r.hit && r.hit.open && r.hit.alive && r.vols) out.push({ p: shielded ? V3.lerp(r.vols.legs.a, r.vols.legs.b, .85) : r.vols.torso ? V3.lerp(r.vols.torso.a, r.vols.torso.b, .6) : r.vols.head.c, r: shielded ? 2 : 3, pri: 48, kind: 'boss', ref: { id: 'rig:' + r.hit.id } });
      for (const q of Object.values(B.parts)) if (q.armor && q.alive && q.vol && q.onArmor) { const pl = sim.players[i]; if (pl.ammo.sg > 0 || pl.ammo.gl > 0) out.push({ p: q.vol.c || (q.vol.a ? V3.lerp(q.vol.a, q.vol.b, .5) : [q.vol.cx, q.vol.cy, (q.vol.box[2] + q.vol.box[5]) / 2]), r: 6, pri: 49, kind: 'boss', knock: true, ref: { id: 'armor:' + q.id } }); }
    }
    for (const ob of sim.objects) {
      if (!ob.alive || (ob.K.popup && (!ob.raised || ob.up < .8)) || ob.K.civ) continue;
      const c = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, (ob.box[2] + ob.box[5]) / 2 + (ob.K.popup ? 6 : 0)], cam = sim.cameraFor(i);
      if (Math.hypot(c[0] - cam.x, c[1] - cam.y) > 700) continue;
      if (ob.K.objective || ob.K.popup || ob.K.fly) out.push({ p: c, r: 4, pri: ob.K.objective ? 52 : 38, kind: 'obj', ref: ob });
      else if (ob.K.needs && ob.K.needs.some(w => sim.players[i].ammo[w] > 0)) out.push({ p: c, r: 6, pri: 36, kind: 'obj', ref: ob });
      else if (ob.K.bonus && (this.S.show || this.style === 'fair')) out.push({ p: c, r: 3, pri: 8, kind: 'bonus', ref: ob });
      else if (ob.K.explode && sim.enemies.some(e => e.alive && !e.civ && Math.hypot(e.x - c[0], e.y - c[1]) < ob.K.explode * .8)) out.push({ p: c, r: 5, pri: 33, kind: 'barrel', ref: ob });
    }
    void p; return out;
  }
  pointOf(sim, t) {
    if (t.p) return { p: t.p, r: t.r };
    const V = t.e.vols, head = (this.R() < this.S.head || t.e.type === 'captor') && V.head;
    if (V.body) return { p: V.body.c, r: V.body.r * .7 };
    if (V.shield && t.e.shieldOn) {
      if (t.e.state === 'over' || t.e.state === 'fire') return { p: [V.head.c[0], V.head.c[1], V.head.c[2] + V.head.r * .45], r: V.head.r * .5 };
      const p = sim.players[this.i || 0]; if (p && (p.ammo.sg > 0 || p.ammo.gl > 0)) return { p: V3.lerp(V.shield.a, V.shield.b, .5), r: 5, knock: true };
      return null;
    }
    if (head || !V.torso) return { p: V.head.c, r: V.head.r * .8 };
    return { p: V3.lerp(V.torso.a, V.torso.b, .55), r: V.torso.r * .8 };
  }
  command(sim, i, dt) {
    this.t += dt; const p = sim.players[i], cmd = { aim: [this.ax, this.ay], fireDown: false, firePressed: false, coverDown: false, coverPressed: false, next: false, prev: false, select: 0, reload: false };
    if (sim.cut) { cmd.fireDown = this.style === 'showoff' || this.skipCuts; cmd.firePressed = this.t % .5 < dt; return cmd; }
    if (p.out || sim.phase === 'continue') { cmd.firePressed = this.t % .3 < dt; return cmd; }
    if (sim.phase !== 'action') { this.lock = null; this.ax *= .95; this.ay *= .95; cmd.aim = [this.ax, this.ay]; return cmd; }
    const cam = sim.cameraFor(i), mine = sim.threats.filter(t => !t.done && t.target === i), soon = mine.reduce((m, t) => Math.min(m, t.T - sim.t), 9);
    const unblockable = mine.some(t => t.unblockable && t.T - sim.t < .5);
    // cover: duck when a threat is about to land; reload when empty
    const empty = p.weapon === 'hg' && p.mag === 0, low = p.weapon === 'hg' && p.mag <= 2 && !mine.length;
    // duck for a threat about to land, unless its source is in the sights and should drop first
    const next = mine.slice().sort((a, b) => a.T - b.T)[0], src = next && sim.enemyById(next.src);
    const killable = src && src.alive && this.lock && this.lockKey === 'e' + src.id && Math.hypot(this.lock.a[0] - this.ax, this.lock.a[1] - this.ay) < .05 && src.hp <= reg('weapon', p.weapon).dmg() * 2 && next.T - sim.t > .16;
    if (!unblockable && !killable && (soon < .28 || (p.c > .5 && soon < .45))) this.holdCover = Math.max(this.holdCover, .2);
    if (empty || (low && this.R() < dt * 2)) this.holdCover = Math.max(this.holdCover, tune.player.reload + tune.player.coverIn + .08);
    this.holdCover -= dt;
    cmd.coverDown = this.holdCover > 0;
    // pick a target
    const keyOf = t => t.e ? 'e' + t.e.id : t.ref ? 'r' + t.ref.id : t.kind + Math.round(t.p[0] / 8) + ':' + Math.round(t.p[1] / 8) + ':' + Math.round(t.p[2] / 8);
    const o = [cam.x, cam.y, cam.z];
    this.i = i;
    const ts = this.targets(sim, i).map(t => { const q = this.pointOf(sim, t); return q ? Object.assign(t, q) : null; }).filter(Boolean).filter(t => {
      const a = worldToAim(cam, t.p); if (!a) return false; t.a = a; if (!(Math.abs(a[0]) < 1.75 && Math.abs(a[1]) < .98)) return false;
      if (t.kind === 'proj' || t.kind === 'boss') return true;
      const vis = q => { const d = V3.sub(q, o), L = V3.len(d), w = sim.rayWorld({ o, d: V3.mul(d, 1 / L) }, L, t.kind !== 'obj' && t.kind !== 'bonus' && t.kind !== 'barrel'); return !w || w.t > L - (t.r || 3) - 2; };
      if (vis(t.p)) return true;
      // the torso is hidden (a railing, a low wall): try the head
      if (t.e && t.e.vols && t.e.vols.head && t.p !== t.e.vols.head.c && vis(t.e.vols.head.c)) { t.p = t.e.vols.head.c; t.r = t.e.vols.head.r * .8; const a2 = worldToAim(cam, t.p); if (a2) t.a = a2; return true; }
      return false;
    });
    let best = null, bs = -1e9;
    for (const t of ts) { const d = Math.hypot(t.a[0] - this.ax, t.a[1] - this.ay), s = t.pri - d * 12 + (this.lockKey === keyOf(t) ? 40 : 0); if (s > bs) { bs = s; best = t; } }
    const bk = best ? keyOf(best) : null;
    if (bk !== this.lockKey) { const near = best && Math.hypot(best.a[0] - this.ax, best.a[1] - this.ay) < .15; this.lockKey = bk; this.lockT = near ? Math.min(this.lockT, this.S.react) : 0; }
    this.lock = best; this.lockT += dt;
    // weapons
    if (best && !this.S.noSwitch) {
      let want = 'hg';
      const needs = best.ref && best.ref.K && best.ref.K.needs;
      if (needs) want = needs.find(w => p.ammo[w] > 0) || 'hg';
      else if (best.knock) want = p.ammo.sg > 0 ? 'sg' : p.ammo.gl > 0 ? 'gl' : 'hg';
      else if (best.e && best.e.type === 'rusher' && p.ammo.sg > 0) want = 'sg';
      else if ((best.e && best.e.type === 'drone' || ts.filter(t => t.e).length >= 4) && p.ammo.mg > 0) want = 'mg';
      else if (best.kind === 'boss' && p.ammo.gl > 0 && this.style !== 'fair' && best.a[2] < 200) want = 'gl';
      else if (this.S.show && p.ammo.mg > 0 && (this.cycle++ % 600) < 200) want = 'mg';
      if (want !== p.weapon && p.switchT <= 0 && (want === 'hg' || p.ammo[want] > 0)) cmd.select = TC.WEAPONS.indexOf(want) + 1;
    }
    // aim: a damped spring toward the target, capped by the skill's speed, after the reaction delay
    let tx = this.ax, ty = this.ay;
    if (best && p.weapon === 'gl') { const tt = best.a[2] / 640, drop = Math.max(0, .5 * 240 * tt * tt - 40 * tt), a2 = worldToAim(cam, [best.p[0], best.p[1], best.p[2] + drop]); if (a2) { best.a = a2; } }
    if (best && this.lockT > this.S.react * tune.enemy.reactMul * .5) { tx = best.a[0] + (this.R() - .5) * this.S.jitter; ty = best.a[1] + (this.R() - .5) * this.S.jitter; }
    const k = 18, dmp = 2 * Math.sqrt(k);
    this.vx += ((tx - this.ax) * k * k / 18 - this.vx * dmp) * dt; this.vy += ((ty - this.ay) * k * k / 18 - this.vy * dmp) * dt;
    const sp = Math.hypot(this.vx, this.vy), mx = this.S.speed; if (sp > mx) { this.vx *= mx / sp; this.vy *= mx / sp; }
    this.ax += this.vx * dt; this.ay += this.vy * dt; cmd.aim = [this.ax, this.ay];
    // fire when the reticle is on it
    this.fireGap -= dt;
    if (best && p.c < .2) {
      const rr = Math.max(.012, best.r / best.a[2] / Math.tan(cam.fov * DEG / 2)), on = Math.hypot(best.a[0] - this.ax, best.a[1] - this.ay) < rr;
      if (on) { if (p.weapon === 'mg') cmd.fireDown = true; else if (this.fireGap <= 0) { cmd.firePressed = true; cmd.fireDown = true; this.fireGap = p.weapon === 'hg' ? .17 : .4; } }
    }
    return cmd;
  }
}
TC.Autopilot = Autopilot;

/* ---- the attract playlist ---- */
for (const [id, stage, scene] of [['h1', 1, '1-1'], ['h2', 1, '1-4'], ['h3', 1, '1-B'], ['h4', 2, '2-1'], ['h5', 2, '2-3'], ['h6', 2, '2-B'], ['h7', 3, '3-2'], ['h8', 3, '3-3'], ['h9', 3, '3-B']]) def('highlight', id, { stage, scene, t: 28 });
const Attract = {
  i: 0, state: 'demo', t: 0,
  enter() {
    this.state = 'demo'; this.t = 0; this.prog = 0; this.lastProg = 0;
    this.start();
  },
  start() {
    const H = regAll('highlight'), h = H[this.i % H.length];
    this.h = h; this.t = 0; this.prog = 0; this.watch = 0;
    const sim = new Sim({ mode: 'attract', stage: h.stage, scene: h.scene, difficulty: 'normal', seed: 1000 + this.i, cheats: { god: true, ammo: true }, players: [{ name: 'DEMO', agent: 'kai' }] });
    for (const p of sim.players) { p.ammo.mg = 240; p.ammo.sg = 36; p.ammo.gl = 6; p.seen = { mg: 1, sg: 1, gl: 1 }; }
    this.play = new Play({ sim, inputs: [], bots: { 0: new Autopilot('showoff') }, attract: true });
    this.lastKills = 0;
  },
  update(dt) {
    const I = TC.game.input;
    if (this.t > .3 && (Idle.step(dt) === 0)) { I.consumeAll(); TC.game.go('title'); return; }
    this.t += dt;
    if (this.state === 'demo') {
      this.play.update(dt);
      const s = this.play.sim, kills = s.players[0].stats.kills + (s.boss ? Math.round((1 - s.boss.hpFrac()) * 20) : 0) + s.sceneIdx * 100;
      if (kills !== this.lastKills || s.phase === 'travel') { this.lastKills = kills; this.watch = 0; } else this.watch += dt;
      if (this.t > this.h.t || this.watch > 8 || s.phase === 'done' || s.phase === 'gameover') { this.i++; this.state = this.i % 2 ? 'scores' : 'title'; this.t = 0; }
    } else if (this.state === 'scores' && this.t > 6) { this.state = 'demo'; this.start(); }
    else if (this.state === 'title' && this.t > 8) { this.state = 'demo'; this.start(); }
  },
  draw(r) {
    if (this.state === 'demo') { this.play.draw(r); r.overlay(g => { const W = r.W, H = r.H; logo(g, W - 80, H - 54, this.t, .35); txt(g, 'DEMO PLAY', W - 80, H - 70, '#ffd36a', { align: 'center', outline: '#08142a' });   // (clear of the HUD's score and TIME)
      if (TC.touchOnly()) txt(g, 'Controller or keyboard required', W / 2, H - 58, '#ff9a8a', { align: 'center', outline: '#08142a' });
      else if ((this.t * 2 | 0) % 2) txt(g, TC.game.input.lastDevice === 'gamepad' ? 'PRESS ' + TC.game.input.codeLabel('Pad9') : 'PRESS ANY KEY', W / 2, H - 62, '#ffffff', { align: 'center', scale: 2, outline: '#08142a', shadow: false }); }); return; }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.state === 'scores') { frame(g, W, H, null, this.t); TC.arcade.drawTable({ overlay: f => f(g), W, H, text: (s, x, y, c, o) => txt(g, s, x, y, c, o) }, 'arcade', 30, 'HIGH SCORES'); }
      else { Flyover.draw(g, W, H, 1 / 60); logo(g, W / 2, H * .3, this.t); if ((this.t * 2 | 0) % 2) txt(g, 'PRESS START', W / 2, H * .66, '#ffffff', { align: 'center', scale: 2, outline: '#08142a', shadow: false }); }
    });
  }
};
TC.Attract = Attract; TC.attract = Attract;
