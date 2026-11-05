// 95-attract: the HunterBot (the attract mode's player, the tests' driver, the balance tool) and the attract mode: after
// ten seconds of no input on the title or a top menu page, a looping demo of fixed-seed clips; any input goes back.
const BOT_SKILL = { novice: { react: .85, noise: 7, smooth: .34, tol: 3.2, scopeAt: 120 }, average: { react: .45, noise: 2.6, smooth: .22, tol: 2.2, scopeAt: 95 }, expert: { react: .2, noise: .7, smooth: .13, tol: 1.6, scopeAt: 85 } };
class HunterBot {
  constructor(o = {}) { this.svx = 0; this.svy = 0; this.o = o; this.S = Object.assign({}, BOT_SKILL[o.skill || 'average']); this.cheat = !!o.cheat; if (this.cheat) Object.assign(this.S, { react: .15, noise: 0, smooth: .09, tol: 1.4 }); this.target = null; this.lock = 0; this.vx = 0; this.vy = 0; this.r = RNG.stream('bot'); this.nz = [0, 0]; this.nzT = 0; this.callT = 0; this.breathT = 0; }
  update(dt, p, H) {
    const S = this.S; p.device = 'bot';
    if (this.cheat) { p.rifle.infinite = H.mode !== 'range'; p.forceAuto = true; }
    p.rifle.update(0);
    const seg = H.seg;
    if (!seg || !seg.canShoot || H.camFX) { this.target = null; p.scope.update(dt, false, false); this.spring(p, dt, H.W / 2, H.H * .52); return; }
    if (seg.kind === 'range' && seg.bot) { seg.bot(p, this, dt); return; }
    // the target: in a bonus game the nearest live target; on a site the best legal animal in view
    let tp = null, tgt = this.target;
    if (H.bonus) {
      if (!tgt || !tgt.alive || tgt.protected) { tgt = null; let best = Infinity; for (const T2 of H.bonus.targets) { if (!T2.alive || T2.protected || T2.kind === 'snowman' && T2.hatOff) continue; const zs = T2.zones ? T2.zones(T2) : [{ a: [T2.x, T2.y, T2.z + (T2.zc || 0)] }]; if (!zs.length) continue; const q = H.lens.project(zs[0].a[0], zs[0].a[1], zs[0].a[2]); if (!q || q[0] < 4 || q[0] > H.W - 4 || q[1] < 4 || q[1] > H.H - 4) continue; const sc = q[3] - (T2.golden ? 1e5 : 0) - (T2.kind === 'snowball' ? 5e4 : 0); if (sc < best) { best = sc; tgt = T2; } } this.target = tgt; this.lock = 0; }
      if (tgt) { const zs = tgt.zones ? tgt.zones(tgt) : [{ a: [tgt.x, tgt.y, tgt.z + (tgt.zc || 0)], r: tgt.r * (tgt.big || 1.25) }]; if (zs.length) { const z = zs[0]; tp = this.project(H, z.a, tgt, this.cheat ? 0 : S.smooth); if (tp) this.zonePx = (z.r || tgt.r || 8) * tp[2]; } }
    } else {
      if (!tgt || !tgt.alive || !tgt.visible || tgt.protected || this.r() < dt * .05) { tgt = this.pick(H); if (tgt !== this.target) this.lock = 0; this.target = tgt; }
      if (tgt) { const z = tgt.zones(), aimZone = this.cheat || this.o.skill === 'expert' ? 'heart' : 'lung', v = z.find(q => q.id === aimZone) || z.find(q => q.id === 'heart') || z.find(q => q.id === 'body') || z[0]; if (v) { tp = this.project(H, v.kind === 'sphere' ? v.a : [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2], tgt, this.cheat ? 0 : S.smooth); if (tp) this.zonePx = v.r * tp[2]; } }
      // the trophies: the Duke comes to a call
      if (!tgt && H.site && H.site.duke && p.call.charges > 0 && !H.site.duke.open && H.site.duke.calls < 4 && (this.callT -= dt) <= 0) { this.callT = 3.5; H.useCall(p); }
    }
    if (!tp) { p.scope.update(dt, false, false); this.spring(p, dt, H.W / 2, H.H * .52); if (!p.rifle.chambered) p.rifle.pump(); return; }
    // scope past its range, hold breath once scoped; call a runner to a stop
    const far = tgt && tgt.x !== undefined ? Math.hypot(tgt.x - H.cam.x, tgt.y - H.cam.y) / M : 0, wantScope = far > S.scopeAt && (!H.bonus || H.bonus.def.id === 'range');
    p.scope.update(dt, wantScope, wantScope && p.scope.up);
    if (tgt && tgt.running && !H.bonus && p.call.charges > 0 && (this.callT -= dt) <= 0 && !tgt.trophy) { this.callT = 4; H.useCall(p); }
    // aim noise drifts slowly; the reticle chases the target on a spring
    this.nzT -= dt; if (this.nzT <= 0) { this.nzT = .35; this.nz = [(this.r() - .5) * 2 * S.noise, (this.r() - .5) * 2 * S.noise]; }
    const sway = p.scope.raise > .05 ? p.scope.sway() : [0, 0], ax = tp[0] - sway[0] + this.nz[0], ay = tp[1] - sway[1] + this.nz[1];
    if (this.cheat && this.lock > S.react * .6) { p.rx = ax; p.ry = ay; this.vx = this.vy = 0; } else this.spring(p, dt, ax, ay);
    this.lock += dt;
    const err = Math.hypot(p.rx + sway[0] - (tp[0] - this.svx * S.smooth * (this.cheat ? 0 : 1)), p.ry + sway[1] - (tp[1] - this.svy * S.smooth * (this.cheat ? 0 : 1)));
    if (!p.rifle.chambered && !p.rifle.busy) { p.rifle.pump(); return; }
    const tol = Math.max(S.tol, (this.zonePx || 0) * .7); this.dbg = [err, tol, this.lock];
    if (this.lock > S.react && err < tol && p.rifle.chambered && !p.rifle.busy && H.time - p.rifle.last > .35) {
      // never fire when the first thing on the ray is protected
      const [sx, sy] = p.aimPoint(), R = resolveRay(H, H.lens.ray(sx, sy));
      if (H.bonus || (R.actor && !R.actor.protected) || (!R.actor && R.kind === 'sky')) { if (!(R.actor && R.actor.protected)) { H.trigger(p); this.lock = S.react * .5; } }
    }
  }
  /** the target's point on the screen, led by its own measured screen velocity times lag (the spring's own lag) */
  project(H, pt, a, lag) {
    const q = H.lens.project(pt[0], pt[1], pt[2]); if (!q || q[0] < -20 || q[0] > H.W + 20 || q[1] < -20 || q[1] > H.H + 20) { this.prevQ = null; return null; }
    const dt = H.dt || 1 / 120;
    if (this.prevQ && this.prevA === a) { this.svx = lerp(this.svx, (q[0] - this.prevQ[0]) / dt, .25); this.svy = lerp(this.svy, (q[1] - this.prevQ[1]) / dt, .25); } else { this.svx = 0; this.svy = 0; }
    this.prevQ = [q[0], q[1]]; this.prevA = a;
    return [q[0] + this.svx * lag, q[1] + this.svy * lag, q[2], q[3]];
  }
  spring(p, dt, x, y) { const st = this.S.smooth; [p.rx, this.vx] = E.smoothDamp(p.rx, x, this.vx, st, dt); [p.ry, this.vy] = E.smoothDamp(p.ry, y, this.vy, st, dt); p.rx = clamp(p.rx, 0, (G.hunt ? G.hunt.W : 480) - 1); p.ry = clamp(p.ry, 0, (G.hunt ? G.hunt.H : 270) - 1); }
  /** the best legal animal in view: bucks first (value over distance, the ones about to escape first), critters when none */
  pick(H) {
    let best = null, bs = -Infinity;
    for (const a of H.actors) {
      if (!a.alive || !a.visible || a.protected || !a.target) continue;
      const d = Math.hypot(a.x - H.cam.x, a.y - H.cam.y) / M, [b] = H.world.bearingOf(H.vantageId, a.x, a.y), edge = Math.min(Math.abs(b - H.fanB[0]), Math.abs(b - H.fanB[1]));
      let s = a.cat === 'animal' ? 1000 + (a.points || 0) * 10 - d * 2 + (edge < 8 ? 300 : 0) + (a.trophy ? 2000 : 0) + (a.wounds ? 400 : 0) : 100 - d;
      if (s > bs) { bs = s; best = a; }
    }
    return best;
  }
}
/* ---------- the attract mode ---------- */
const ATTRACT = [
  { kind: 'hunt', hunt: 'hollow', secs: 43, seed: 11, queue: [{ kind: 'site', id: 'hollow-1' }, { kind: 'tally', auto: true }], label: 'HOLLOW CREEK' },
  { kind: 'hunt', hunt: 'bugle', secs: 25, seed: 12, queue: [{ kind: 'site', id: 'bugle-2' }], label: 'BUGLE RIDGE', skill: 'expert' },
  { kind: 'hunt', hunt: 'bugle', secs: 15, seed: 13, queue: [{ kind: 'bonus', id: 'saucer-season' }], label: 'SAUCER SEASON' },
  { kind: 'hunt', hunt: 'muskeg', secs: 20, seed: 14, queue: [{ kind: 'trophy', id: 'bigmo' }, { kind: 'trophyEnd' }], label: 'BIG MO' },
  { kind: 'tables', secs: 8 }, { kind: 'lodge', secs: 6 }, { kind: 'title', secs: 5 }
];
const attractScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'attract'; this.i = -1; this.t = 0; this.H = null; G.attract = this; this.next(); Idle.reset(); },
  exit() { if (this.H) this.H.dispose(); this.H = null; G.hunt = null; G.attract = null; game.timeScale = 1; },
  get clip() { const c = ATTRACT[this.i]; return c ? (c.label || c.kind) : null; },
  next() {
    if (this.H) { this.H.dispose(); this.H = null; G.hunt = null; }
    this.i = (this.i + 1) % ATTRACT.length; this.t = 0; const c = ATTRACT[this.i]; game.timeScale = 1;
    if (c.kind === 'hunt') { const p = new Player(1, G.game.input); p.bot = new HunterBot({ skill: c.skill || 'expert', cheat: true }); this.H = new Hunt({ mode: 'attract', hunt: c.hunt, seed: c.seed, queue: c.queue, players: [p] }); if (G.sfx) G.sfx.music(c.queue[0].kind === 'bonus' ? 'jamboree' : 'stalk', { fade: .5 }); }
    else if (c.kind === 'lodge') { G.lodge = G.lodge || new Lodge(); G.lodge.reset(true); if (G.sfx) G.sfx.music('lodgefire', { fade: .5 }); }
    else if (c.kind === 'title') { if (G.sfx) G.sfx.music('hoedown', { fade: .5 }); }
  },
  clipDone() { this.t = 1e9; },
  update(dt) {
    const any = Idle.update(dt);
    if (any && this.t > .1) { G.game.input.consumeAll(); G.game.go('title', {}, { fade: .3 }); return; }
    this.t += dt; const c = ATTRACT[this.i];
    if (c.kind === 'hunt' && this.H) { const save = G.hunt; G.hunt = this.H; this.H.update(dt); G.hunt = this.H; if (this.H.finished) this.t = 1e9; }
    else if (c.kind === 'title') showcase().update(dt);
    else if (c.kind === 'lodge' && G.lodge) G.lodge.update(dt, true);
    if (G.sfx) G.sfx.update(dt);
    if (this.t >= c.secs) this.next();
  },
  draw(r) {
    const c = ATTRACT[this.i];
    if (c.kind === 'hunt' && this.H) this.H.draw(r);
    else if (c.kind === 'tables') { r.sky(['#1a120a', '#2a1c10', '#3a2614']); const modes = ['campaign', 'hollow', 'bugle', 'muskeg'], m = modes[Math.floor(this.t / 2) % modes.length]; G.cab.drawTable(r, m, 30, 'BEST ' + (m === 'campaign' ? 'HUNT-OFF' : reg('hunt', m).name.toUpperCase())); }
    else if (c.kind === 'lodge' && G.lodge) G.lodge.draw(r, true);
    else { showcase().draw(r); r.overlay(g => drawLogo(g, r.W, r.H * .3, 1)); }
    r.overlay(g => {
      const W = r.W, Ht = r.H;
      E.font.title(g, 'DEMO', 12, 10, { scale: 2, colors: ['#ffffff', '#ffd040', '#e0602a'], outline: '#1a0c08' });
      if (Math.floor(G.game.real * 1.5) % 2 === 0) E.font.text(g, G.touchOnly ? 'TAP FOR THE TITLE' : 'PRESS ANY BUTTON', W / 2, Ht - 22, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      if (c.label && this.t < 3) E.font.text(g, c.label, W - 12, 12, '#f4ead8', { align: 'right', scale: 2, shadow: '#000' });
    });
  }
};
