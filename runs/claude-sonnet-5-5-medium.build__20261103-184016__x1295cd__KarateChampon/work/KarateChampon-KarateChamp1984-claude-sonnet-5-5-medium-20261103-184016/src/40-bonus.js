/* ---------- bonus games: Break the Boards, Pots Ahoy!, Stop the Bull ---------- */
const mkFoe = (x) => ({ x, z: 0, crouching: false, state: 'free', tech: null, stats: { reach: 1, speed: 1, walk: 1 }, hurtable: true, recoil: 0, phase: null, face: 1 });
class BonusBase {
  constructor(o) { this.o = o; this.t = 0; this.state = 'card'; this.score = 0; this.msg = null; this.msgT = 0; this.done = false; this.auto = !!o.auto; this.me = new Karateka('taro', 0, { belt: o.belt || 'white' }); this.me.reset(); this.foe = mkFoe(300); this.reader = o.reader || null; this.steps = 0; this.accum = 0; this.events = []; this.rng = E.rng((o.seed || 1) * 31 + 5); this.result = null; this.cardT = 1.6; }
  say(text, good) { this.msg = text; this.msgT = 1.3; this.msgGood = good !== false; }
  ctrl() { return this.reader ? this.reader.read() : { posture: 'n', tech: null, held: null }; }
  stepMe(c, k) { this.foe.x = this.me.x + this.me.face * 60; this.me.step(this.foe, { posture: c.posture, tech: k === 0 ? c.tech : null }); }
  finish(res) { this.state = 'result'; this.t = 0; this.result = res; if (res.perfect) { KC.sting('perfect'); } else KC.sting('victory'); }
}
/* ---- BREAK THE BOARDS ---- */
class Boards extends BonusBase {
  constructor(o) {
    super(o); const v = o.params || {}; this.n = v.n || 5; this.mat = KC.BONUS.boards.mats[v.mat || 0]; this.gauge = 0; this.over = 0; this.broken = 0; this.boards = Array.from({ length: this.n }, () => ({ alive: true, a: 0, vx: 0, vz: 0, rot: 0 })); this.hold = false; this.chopT = -1; this.power = 0; this.me.x = 170; this.me.mark = 170; this.flash = 0; this.autoTarget = 96; this.lastW = 0; this.me.face = 1;
  }
  get kiMul() { return T().kiSpeed; }
  update(dt, k0) {
    this.t += dt;
    if (this.state === 'card') { this.cardT -= dt; if (this.cardT <= 0) { this.state = 'charge'; this.t = 0; } this.me.update(dt, this.foe); return; }
    const c = this.ctrl(); this.msgT -= dt;
    if (this.state === 'charge') {
      const hold = this.auto ? (this.gauge + (this.wob || 0)) < 96.5 : c.held === 'd';
      if (hold) { this.hold = true; this.gauge += 55 * this.kiMul * dt; this.wob = Math.sin(this.t * 2.2 * TAU) * 6; const g = this.gauge + this.wob; if (g > 100) { this.over += dt; if (this.over > .3) { this.say('TOO MUCH!', false); this.gauge = 60; this.over = 0; KC.sfx('bad'); } } else this.over = 0; }
      else if (this.hold) { this.hold = false; this.release(); }
      this.me.posePose = hold ? 'crouch' : null;
    } else if (this.state === 'chop') {
      this.chopT += dt; const u = clamp(this.chopT / .35, 0, 1);
      if (!this.hitFx && this.chopT > .12) { this.hitFx = true; this.breakBoards(); }
      if (this.chopT > .5) { this.state = 'after'; this.t = 0; }
    } else if (this.state === 'after') {
      if (this.t > 1.4) { const perfect = this.power >= 95; this.finish({ score: this.score, perfect, label: perfect ? 'PERFECT!' : this.broken >= this.n ? 'ALL BROKEN!' : this.broken === 0 ? 'WEAK!' : this.broken + ' BOARDS' }); }
    } else if (this.state === 'result') { if (this.t > 3) this.done = true; }
    // board halves fly
    for (const b of this.boards) if (!b.alive) { b.a += dt; b.vz -= 500 * dt; b.z = (b.z || 0) + b.vz * dt; b.x = (b.x || 0) + b.vx * dt; b.rot += dt * 6 * Math.sign(b.vx || 1); }
    const att = this.state === 'chop' ? { spec: Object.assign({}, E.MOVES.overhead, { wind: .1, active: .1, recover: .3 }), phase: this.chopT < .12 ? 'wind' : this.chopT < .3 ? 'active' : 'recover', u: clamp(this.chopT < .12 ? this.chopT / .12 : this.chopT < .3 ? (this.chopT - .12) / .18 : (this.chopT - .3) / .25, 0, 1) } : null;
    this.me.rig.update(dt, { x: this.me.x, y: 0, z: 0, facing: 0, vx: 0, vy: 0, attack: att || undefined, pose: this.state === 'charge' && this.hold ? 'crouch' : this.state === 'result' && this.result && this.result.perfect ? 'cheer' : undefined, stance: this.state === 'charge' && !this.hold ? 'guard' : undefined });
  }
  release() {
    this.power = clamp(this.gauge + (this.wob || 0), 0, 100); this.state = 'chop'; this.chopT = 0; this.hitFx = false; KC.sfx('whooshH'); KC.Voice.kiai(KC.FIGHTER.taro.voice, true);
  }
  breakBoards() {
    const perfect = this.power >= 95, cnt = perfect ? this.n : Math.min(this.n, Math.floor(this.power / 100 * (this.n + .99)));
    this.broken = cnt; let pts = cnt * 200 * this.mat[1]; if (perfect) pts += 2000; this.score += pts; this.slow = true;
    for (let i = 0; i < cnt; i++) { const b = this.boards[this.n - 1 - i]; b.alive = false; b.vx = (i % 2 ? 1 : -1) * (30 + i * 10); b.vz = 80 + i * 12; b.z = 0; b.x = 0; b.a = 0; }
    this.say(perfect ? 'PERFECT!' : cnt === 0 ? 'WEAK!' : cnt + (cnt === 1 ? ' BOARD!' : ' BOARDS!'), cnt > 0); KC.sfx(cnt ? 'boardCrack' : 'bad');
    if (cnt) { KC.game.particles.bits(240, 0, 20 + cnt * 6, 14 + cnt * 3, [this.mat[2], E.shade(this.mat[2], -.2), '#fff6d0']); KC.game.particles.dust(240, 0, 4, 8); KC.game.shake(perfect ? 4 : 2); if (cnt) KC.game.flash('#fff', .06); }
    if (perfect) KC.game.audio.sfx('bowlDing');
  }
  draw(r) {
    r.queue(240, 0, 0, g => {
      const sx = r.w(240, 0, 0); const base = Math.round(sx[1]), x = Math.round(sx[0]);
      px.rect(g, x - 20, base - 10, 14, 10, '#8a8a92'); px.rect(g, x + 6, base - 10, 14, 10, '#8a8a92'); px.rect(g, x - 20, base - 10, 14, 2, '#b8b8c0'); px.rect(g, x + 6, base - 10, 14, 2, '#b8b8c0');
      let y = base - 14;
      this.boards.forEach((b, i) => { if (b.alive) { px.rect(g, x - 24, y - 5, 48, 5, E.shade(this.mat[2], -.25)); px.rect(g, x - 24, y - 5, 48, 3, this.mat[2]); px.rect(g, x - 24, y - 5, 48, 1, E.shade(this.mat[2], .25)); y -= 5; } });
      this.boards.forEach((b, i) => { if (!b.alive) { const yy = base - 14 - 5 * (this.n - 1 - i) - (b.z || 0) * 0 ; const bx = x + (b.x || 0), by = Math.round(yy - 5 - (b.z || 0)); if (by < base + 20) { px.rect(g, bx - 24 - Math.abs(b.x || 0) * .3, by, 22, 4, this.mat[2]); px.rect(g, bx + 2 + Math.abs(b.x || 0) * .3, by + 2, 22, 4, E.shade(this.mat[2], -.2)); } } });
    });
    this.me.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      // the KI gauge beside the fighter
      const gx = Math.round(r.w(120, 0, 0)[0]), gy = Math.round(r.w(120, 0, 0)[1]) - 80; px.rect(g, gx, gy, 10, 72, '#05040a'); px.rect(g, gx + 1, gy + 1, 8, 70, '#1a1a2a');
      const fill = clamp(this.gauge, 0, 100) / 100 * 68; px.rect(g, gx + 1, Math.round(gy + 69 - fill), 8, Math.round(fill), this.gauge >= 95 && this.gauge <= 100 ? '#ffe070' : this.gauge > 100 ? '#ff5a4a' : '#5ad8a0');
      px.rect(g, gx - 2, gy + 3, 14, 1, '#ffe070'); KC.text(g, 'KI', gx + 5, gy - 10, '#ffd060', { align: 'center' });
      KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8');
      if (this.state === 'charge') KC.text(g, 'HOLD ' + (KC.family() === 'key' ? 'K' : KC.family() === 'xbox' ? 'R STICK DOWN OR A' : 'R STICK DOWN OR ✕') + ' TO BREATHE IN, RELEASE TO CHOP', W / 2, H - 46, '#ffe8a0', { align: 'center' });
    });
  }
}
/* ---- POTS AHOY! ---- */
const LANES = { high: 52, mid: 36, low: 10 };
class Pots extends BonusBase {
  constructor(o) {
    super(o); const rng = E.rng(((o.visit || 1) * 97) + 3); this.me.x = 200; this.me.mark = 200; this.seq = [];
    const kinds = ['clay', 'clay', 'bonsai', 'boulder', 'bowl', 'clay', 'bonsai', 'boulder'], lanes = ['high', 'mid', 'low'];
    for (let i = 0; i < KC.BONUS.pots.count; i++) { let k = kinds[Math.floor(rng() * kinds.length)]; if (i === 3 || i === 9) k = 'bowl'; if (i === 0) k = 'clay'; this.seq.push({ kind: k, lane: lanes[Math.floor(rng() * 3)], side: rng() < .5 ? -1 : 1 }); }
    this.objs = []; this.spawned = 0; this.handled = 0; this.nextAt = 1.2; this.hit = false; this.hurt = false; this.ptsBreak = 0;
  }
  speed() { const k = this.spawned / 15; return lerp(150, 230, clamp(k, 0, 1)) * T().potSpeed; }
  interval() { return lerp(1.4, .8, clamp(this.spawned / 15, 0, 1)) / T().potSpeed; }
  update(dt) {
    this.t += dt; if (this.state === 'card') { this.cardT -= dt; if (this.cardT <= 0) { this.state = 'play'; this.t = 0; } this.me.update(dt, this.foe); return; }
    this.msgT -= dt;
    if (this.state === 'play') {
      const steps = Math.max(1, Math.round(dt * 120)), c = this.auto ? this.autoCtrl() : this.ctrl();
      for (let k = 0; k < steps; k++) { this.stepMe(c, k); this.stepObjs(1 / 120); }
      this.me.update(dt, this.foe);
      if (this.spawned < this.seq.length && this.t >= this.nextAt) { const s = this.seq[this.spawned++]; this.objs.push({ kind: s.kind, lane: s.lane, side: s.side, x: s.side > 0 ? 440 : -40, vx: 0, tele: .7, live: false, id: this.spawned }); this.nextAt = this.t + this.interval(); }
      if (this.hit) { this.state = 'hit'; this.t = 0; this.say('OUCH! POT HIT YOU', false); KC.sfx('bad'); this.me.posePose = 'down'; this.me.downW = 1; }
      else if (this.spawned >= this.seq.length && this.handled >= this.seq.length) { const perfect = true; this.score += 3000; this.say('PERFECT! +3000', true); KC.sting('perfect'); this.finish({ score: this.score, perfect: true, label: 'PERFECT!' }); }
    } else if (this.state === 'hit') { this.me.rig.update(dt, { x: this.me.x, y: 0, z: 0, facing: 0, vx: 0, vy: 0, down: 1 }); if (this.t > 1.6) this.finish({ score: this.score, perfect: false, label: this.handled + '/' + this.seq.length }); }
    else if (this.state === 'result') { this.me.update(dt, this.foe); if (this.t > 3) this.done = true; }
    this.objs = this.objs.filter(o => !o.dead);
  }
  autoCtrl() {
    const me = this.me, o = this.objs.filter(q => !q.dead && q.live).sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0]; const out = { posture: 'n', tech: null };
    const tele = this.objs.filter(q => !q.dead && !q.live)[0];
    if (!o) { if (tele) { me.face = tele.side; } return out; }
    const d = Math.abs(o.x - me.x) - PUSH; me.face = o.side; const toward = o.side > 0 ? 'r' : 'l', away = o.side > 0 ? 'l' : 'r';
    if (me.state !== 'free') return out;
    if (o.kind === 'bowl') { if (d < 55) return { posture: away, tech: toward }; return out; }   // block catches it
    if (o.kind === 'boulder') { if (d < 70) { if (o.lane === 'low') return { posture: 'u', tech: null }; if (o.lane === 'high') return { posture: 'd', tech: null }; return { posture: 'u', tech: null }; } return out; }
    if (d < 36) return { posture: 'n', tech: o.lane === 'high' ? 'u' : o.lane === 'mid' ? toward : 'd' };
    return out;
  }
  stepObjs(dt) {
    const me = this.me;
    for (const o of this.objs) {
      if (o.dead) continue; if (!o.live) { o.tele -= dt; if (o.tele <= 0) { o.live = true; o.vx = -o.side * this.speed(); KC.sfx('whooshL'); } continue; }
      o.x += o.vx * dt; o.rot = (o.rot || 0) + dt * 8; const z = LANES[o.lane], d = o.x - me.x;
      // broken by an active technique of its height
      if (me.tech && me.phase === 'active' && !me.tech.util && !me.hitDone && me.face === o.side) {
        const reach = PUSH / 2 + me.tech.reach[1] * me.stats.reach + 10, hgt = me.tech.height, okH = hgt === (o.lane === 'high' ? 'high' : o.lane === 'mid' ? 'mid' : 'low') || (me.tech.rising && o.lane === 'high') || (me.tech.hitsCrouch && o.lane === 'low');
        if (Math.abs(d) < reach && okH && o.kind !== 'boulder' && (o.kind !== 'bonsai' || me.tech.limb === 'foot')) { me.hitDone = true; this.breakObj(o); continue; }
      }
      if (me.tech && me.tech.id === 'block' && me.t < me.fr[0] + me.fr[1] && Math.abs(d) < PUSH / 2 + 24 && o.kind === 'bowl' && me.face === o.side) { o.dead = true; this.handled++; this.score += 1000; this.say('NICE CATCH! +1000', true); KC.sfx('bowlDing'); KC.game.particles.glints(o.x, 0, 40, 8, '#ffe070'); continue; }
      if (Math.abs(d) < 12) {
        if (o.kind === 'bowl') { o.dead = true; this.handled++; KC.sfx('bowlSplash'); KC.game.particles.smoke(o.x, 0, 20, 6); continue; }
        const evade = o.kind === 'boulder' ? (o.lane === 'low' ? me.z > 14 : o.lane === 'high' ? (me.crouching || (me.tech && me.tech.roll)) : (me.z > 30 || (me.tech && me.tech.flip && me.z > 20))) : (o.lane === 'high' ? (me.crouching || (me.tech && me.tech.roll)) : o.lane === 'low' ? me.z > 14 : false);
        if (evade) { o.passed = true; } else if (!o.passed) { o.dead = true; this.hit = true; KC.game.particles.impact(o.x, 0, z, 1.2, '#ffe070'); KC.game.shake(3); continue; }
      }
      if (o.x < -60 || o.x > 460) { o.dead = true; if (!o.counted) { this.handled++; } }
    }
  }
  breakObj(o) {
    o.dead = true; this.handled++; const z = LANES[o.lane];
    if (o.kind === 'bowl') { this.score -= 500; this.say('MOTTAINAI! -500', false); KC.sfx('bowlSplash'); KC.game.particles.smoke(o.x, 0, z, 8); }
    else { this.score += 200; KC.sfx('potShatter'); KC.game.particles.bits(o.x, 0, z, 14, o.kind === 'bonsai' ? ['#a85a3a', '#4a9a4a', '#6a3a22'] : ['#c87a4a', '#a85a3a', '#e8a070']); KC.game.particles.impact(o.x, 0, z, .9, '#fff'); this.say('+200', true); }
  }
  draw(r) {
    for (const o of this.objs) { if (!o.live) continue; r.queue(o.x, 0, LANES[o.lane], g => { const [x, y] = r.w(o.x, 0, LANES[o.lane]), X = Math.round(x), Y = Math.round(y);
      if (o.kind === 'boulder') { px.disc(g, X, Y, 8, '#4a4a54'); px.disc(g, X - 2, Y - 2, 6, '#7a7a86'); px.dot(g, X + 2 + Math.round(Math.sin(o.rot) * 3), Y, '#2a2a30'); }
      else if (o.kind === 'bowl') { px.ell(g, X, Y + 2, 8, 4, '#f4f0e0'); px.rect(g, X - 8, Y - 3, 16, 6, '#f4f0e0'); px.rect(g, X - 8, Y - 3, 16, 2, '#d8402a'); px.ell(g, X, Y - 3, 7, 2, '#f0b040'); px.dot(g, X + Math.round(Math.sin(o.rot) * 2), Y - 8, '#fff'); }
      else { px.ell(g, X, Y, 7, 7, o.kind === 'bonsai' ? '#a85a3a' : '#c87a4a'); px.rect(g, X - 6, Y - 7, 12, 3, E.shade(o.kind === 'bonsai' ? '#a85a3a' : '#c87a4a', -.2)); if (o.kind === 'bonsai') { px.disc(g, X, Y - 10, 5, '#4a9a4a'); px.disc(g, X - 3, Y - 12, 3, '#6aba5a'); } px.dot(g, X + Math.round(Math.cos(o.rot) * 3), Y + 2, '#6a3a22'); } }); }
    this.me.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      for (const o of this.objs) if (!o.live) { const [, y] = r.w(0, 0, LANES[o.lane]), edge = o.side > 0 ? W - 10 : 10, blink = Math.floor(KC.game.real * 10) % 2; if (blink) { px.poly(g, [[edge + o.side * 6, y], [edge - o.side * 4, y - 7], [edge - o.side * 4, y + 7]], o.kind === 'bowl' ? '#ffd060' : o.kind === 'boulder' ? '#9a9aa8' : '#ff6a4a'); KC.text(g, o.kind === 'boulder' ? 'DODGE' : o.kind === 'bowl' ? 'BLOCK' : o.lane === 'high' ? 'HIGH' : o.lane === 'mid' ? 'MID' : 'LOW', edge - o.side * 24, y - 3, '#fff', { align: 'center' }); } }
      KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8'); KC.text(g, 'OBJECTS ' + Math.min(this.handled, 16) + '/' + this.seq.length, W - 8, H - 14, '#ffd060', { align: 'right' });
    });
  }
}
/* ---- STOP THE BULL ---- */
class Bull {
  constructor() { this.x = 520; this.state = 'idle'; this.t = 0; this.phase = 0; this.stars = 0; this.face = -1; this.leg = 0; this.eye = '#201010'; }
  update(dt, speed) { this.t += dt; if (this.state === 'charge') { this.x -= speed * dt; this.phase += dt * speed / 22; } else if (this.state === 'walkBack') { this.x += 70 * dt; this.phase += dt * 3; } else this.phase += dt * 1; }
  draw(r, o = {}) {
    const g = r.ctx, [sx, sy] = r.w(this.x, 0, 0), X = Math.round(sx), Y = Math.round(sy), dir = this.face, charge = this.state === 'charge', ph = this.phase;
    const tones = E.tones('#7a4a34');
    r.shadow(this.x, 0, 28, .5);
    r.queue(this.x, 0, 0, gg => {
      const legs = [[-24, 0], [-14, .5], [18, .25], [28, .75]];
      for (const [lx, off] of legs) { const sw = charge ? Math.sin((ph + off) * TAU) : this.state === 'walkBack' ? Math.sin((ph + off) * TAU) * .5 : 0, fx = X + dir * lx, up = Math.max(0, -Math.cos((ph + off) * TAU)) * (charge ? 8 : 3); px.line(gg, fx, Y - 22, fx + Math.round(sw * 8), Y - Math.round(up), tones.sh, 3); px.rect(gg, fx + Math.round(sw * 8) - 2, Y - Math.round(up) - 1, 5, 3, '#1a1010'); }
      const bob = charge ? Math.round(Math.sin(ph * TAU * 2) * 1.5) : 0;
      px.ell(gg, X, Y - 32 + bob, 36, 16, tones.base); px.ell(gg, X + dir * 6, Y - 36 + bob, 28, 10, tones.lt); px.ell(gg, X - dir * 8, Y - 27 + bob, 22, 6, E.shade('#7a4a34', -.1));
      const hx = X + dir * (charge ? 40 : 38), hy = Y - 34 + bob + (charge || this.state === 'paw' ? 6 : -2);
      px.ell(gg, X + dir * 28, Y - 36 + bob, 12, 10, tones.base);
      px.ell(gg, hx, hy, 12, 9, tones.base); px.ell(gg, hx + dir * 8, hy + 4, 6, 5, '#8a5a4a'); px.dot(gg, hx + dir * 10, hy + 6, '#e8c8b8'); px.line(gg, hx + dir * 12, hy + 7, hx + dir * 12, hy + 11, '#d8c860', 1);
      px.poly(gg, [[hx - dir * 2, hy - 6], [hx + dir * 4, hy - 14], [hx + dir * 10, hy - 11], [hx + dir * 3, hy - 8]], '#e8dcc0');
      px.dot(gg, hx + dir * 4, hy - 1, charge ? '#ff3a2a' : '#201010'); px.dot(gg, hx + dir * 5, hy - 1, charge ? '#ff8a6a' : '#201010');
      const tl = X - dir * 32, tw = Math.round(Math.sin(this.t * 6) * 4); px.line(gg, tl, Y - 36 + bob, tl - dir * 6 + tw, Y - 22, tones.sh, 2); px.disc(gg, tl - dir * 6 + tw, Y - 21, 2, '#1a1010');
      if (this.state === 'stopped') for (let k = 0; k < 3; k++) { const a = this.t * 5 + k * 2.1; E.font.text(gg, '★', Math.round(hx + Math.cos(a) * 14), Math.round(hy - 18 + Math.sin(a) * 3), '#ffe070', { outline: false, align: 'center' }); }
    }, o);
    if ((charge || this.state === 'paw') && KC.game.particles) { if (Math.floor(this.t * 30) % 5 === 0) KC.game.particles.smoke(this.x + this.face * 44, 0, 28, 1, { size: .6 }); }
  }
}
class BullStage extends BonusBase {
  constructor(o) {
    super(o); this.bull = new Bull(); this.me.x = 130; this.me.mark = 130; this.charges = KC.BONUS.bull.charges; this.k = 0; this.sub = 'pause'; this.subT = 1.4; this.speeds = [150, 190, 240]; this.hits = 0; this.perfects = 0; this.trample = 0; this.dizzy = 0; this.me.face = 1;
  }
  update(dt) {
    this.t += dt; if (this.state === 'card') { this.cardT -= dt; if (this.cardT <= 0) { this.state = 'play'; this.t = 0; } this.me.update(dt, this.foe); return; }
    this.msgT -= dt; const B = this.bull;
    if (this.state === 'play') {
      const c = this.auto ? this.autoCtrl() : this.ctrl(), steps = Math.max(1, Math.round(dt * 120)), sp = this.speeds[Math.min(2, this.k)] * T().bullSpeed;
      this.subT -= dt;
      if (this.sub === 'pause' && this.subT <= 0) { this.sub = 'paw'; this.subT = 1.2; B.state = 'paw'; KC.sfx('bullSnort'); this.pawN = 0; }
      else if (this.sub === 'paw') { const n = Math.floor((1.2 - this.subT) / .4); if (n > (this.pawN || 0)) { this.pawN = n; KC.sfx('bullStomp'); KC.game.shake(1); } if (this.subT <= 0) { this.sub = 'charge'; B.state = 'charge'; KC.sfx('bullBellow'); } }
      else if (this.sub === 'dizzy') { B.state = 'stopped'; if (this.subT <= 0) { this.sub = 'walk'; B.state = 'walkBack'; } }
      else if (this.sub === 'walk' && B.x > 520) { this.k++; if (this.k >= this.charges) { this.finishAll(); } else { this.sub = 'pause'; this.subT = 1; B.state = 'idle'; } }
      B.update(dt, sp);
      for (let k = 0; k < steps; k++) {
        this.stepMe(c, k);
        if (this.sub === 'charge') {
          const me = this.me, head = B.x - 44, dist = head - (me.x + PUSH / 2);
          if (me.tech && me.phase === 'active' && !me.hitDone && !me.tech.util) {
            if (dist >= 8 && dist <= 40 && me.tech.bull) { me.hitDone = true; this.stop(Math.abs(dist - 24) <= 6); }
            else if (dist < 40) { me.hitDone = true; }
          }
          if (this.sub === 'charge' && dist < 4 && !(me.z > 36)) { this.trampled(); break; }
          if (this.sub === 'charge' && dist < -40) { /* jumped clean over */ B.state = 'walkBack'; this.sub = 'walk'; this.say('MISSED IT!', false); B.x += 5; }
        }
      }
      this.me.update(dt, this.foe);
    } else if (this.state === 'trample') { this.trample += dt; this.me.rig.update(dt, { x: this.me.x + this.trample * 80, y: 0, z: Math.max(0, 40 * Math.sin(Math.min(1, this.trample * 1.2) * Math.PI)), facing: 0, vx: 0, vy: 0, down: clamp(this.trample * 2, 0, 1), flip: clamp(this.trample * 1.2, 0, .95) }); B.update(dt, 0); B.state = 'walkBack'; if (this.trample > 1.8) this.finish({ score: this.score, perfect: false, label: 'TRAMPLED!' }); }
    else if (this.state === 'result') { this.me.update(dt, this.foe); B.update(dt, 0); if (this.t > 3) this.done = true; }
  }
  autoCtrl() { const me = this.me, B = this.bull, c = { posture: 'n', tech: null }; if (this.sub !== 'charge') return c; const dist = B.x - 44 - (me.x + PUSH / 2), fire = dist < 24 + 92 * (B.state === 'charge' ? this.speeds[Math.min(2, this.k)] / 240 : 1) * .35; if (me.state === 'free' && dist < 24 + this.autoLead()) return { posture: 'd', tech: 'u' }; return c; }
  autoLead() { const sp = this.speeds[Math.min(2, this.k)] * T().bullSpeed; return sp * (8 / 120 + 7 / 120); }
  stop(perfect) { this.sub = 'dizzy'; this.subT = 1.5; this.bull.state = 'stopped'; this.score += 3000 + (perfect ? 1000 : 0); this.say(perfect ? 'PERFECT THUD! +4000' : 'THUD! +3000', true); KC.sfx('bullThud'); KC.sfx('dizzy'); KC.game.particles.impact(this.bull.x - 44, 0, 36, 1.5, '#ffe070'); KC.game.shake(4); this.hits++; if (perfect) this.perfects++; }
  trampled() { this.state = 'trample'; this.trample = 0; this.say('TRAMPLED!', false); KC.sfx('bullThud'); KC.sfx('bad'); this.bull.state = 'charge'; }
  finishAll() { const perfect = this.perfects >= this.charges; this.finish({ score: this.score, perfect, label: this.hits + '/' + this.charges + ' STOPPED' }); }
  draw(r) {
    this.bull.draw(r); this.me.draw(r);
    r.overlay(g => { const W = r.W, H = r.H; KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8'); KC.text(g, 'CHARGE ' + Math.min(this.k + 1, this.charges) + '/' + this.charges, W - 8, H - 14, '#ffd060', { align: 'right' });
      if (this.sub === 'charge' || this.sub === 'paw') KC.text(g, 'STRIKE WHEN THE HORNS ARE CLOSE: UPPER PUNCH, FRONT KICK, BACK KICK, LUNGE', W / 2, H - 46, '#ffe8a0', { align: 'center' }); });
  }
}
KC.Bonus = { Boards, Pots, BullStage };
KC.scenes.bonus = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; const kind = d.kind || 'boards', st = KC.BONUS[kind].stage; this.stage = new Stage(d.stage || st); KC.game.follow(null); this.visit = (KC.store.get('kc:visits', 0) | 0) + 1; KC.store.set('kc:visits', this.visit);
    const o = { reader: d.auto ? null : new Reader(KC.game.input), auto: !!d.auto || !!KC.autopilot, params: d.params, visit: d.visit || this.visit, belt: KC.Story && KC.Story.s ? KC.BELTS[KC.Story.s.belt].id : 'white' };
    this.g = kind === 'boards' ? new Boards(o) : kind === 'pots' ? new Pots(o) : new BullStage(o); this.kind = kind; KC.music('bonus'); this.spoke = false; this.end = false; KC.current = this; this.camX = 200;
  },
  update(dt) {
    const G = this.g; this.stage.update(dt); KC.game.focus(200, 0, 52);
    if (!this.spoke) { this.spoke = true; KC.speakLine('genkotsu', 'BONUS STAGE!'); KC.sfx('gong'); }
    KC.devPoll(); if (KC.overlayStep(dt)) return; if (KC.dev.open) { KC.devUpdate(dt, this); return; }
    G.update(dt); if (G.msgT > 0 && G.msg && G.msgShown !== G.msg + G.msgT.toFixed(0)) { /* voices */ }
    if (G.done && !this.end) { this.end = true; this.finish(); }
  },
  finish() {
    const G = this.g, d = this.d, score = G.score; KC.cab && 0;
    if (d.onEnd) { d.onEnd(score, G.result); return; }
    if (d.story) { KC.Story.s.score += Math.max(0, score); KC.Story.s.node++; KC.save.write(KC.Story.s); KC.game.go('road'); }
    else KC.finishRun(Math.max(0, score), this.kind, () => KC.game.go('bonusMenu'));
  },
  draw(r) {
    const G = this.g; this.stage.draw(r); G.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, T0 = KC.BONUS[this.kind].title;
      if (G.state === 'card') { px.blend(g, .5, 'normal', () => px.rect(g, 0, H * .3, W, 60, '#05040a')); KC.title(g, 'BONUS STAGE!', W / 2, Math.round(H * .3) + 8, 2); KC.title(g, up(T0) + '!'.slice(0, T0.endsWith('!') ? 0 : 1), W / 2, Math.round(H * .3) + 30, 2); }
      if (G.msgT > 0 && G.msg) E.font.title(g, G.msg, W / 2, Math.round(H * .26), { scale: 2, align: 'center', colors: G.msgGood ? GOLD : ['#fff', '#ff8a6a', '#e0302a'], depth: 2 });
      if (G.state === 'result' && G.result) { px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, G.result.label, W / 2, H / 2 - 24, 3); KC.text(g, 'SCORE ' + fmt(G.score), W / 2, H / 2 + 8, '#fff', { align: 'center', scale: 2 }); }
      if (KC.tuned()) KC.text(g, 'DEV', W / 2, 6, '#ff6a6a', { align: 'center' });
    });
    if (KC.dev.open) KC.drawDev(r, this);
    KC.overlayDraw(r);
  }
};
