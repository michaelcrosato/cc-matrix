/* ---- BONUS STAGES: BREAK THE BOARDS (tameshiwari), POTS AHOY! (evade), STOP THE BULL. Each runs with the hero's
 * Karateka and the same twin-stick input; numbers live in KC.DATA.bonus and the dev sliders. ---- */
const CHOP = Object.assign({}, M.overhead, { blade: 0, plane: 'side', reach: 7, crouch: .6, lunge: 1.5 });
const BOARDS = {
  start(B) { const p = B.params; Object.assign(B, { n: p.n || 5, mat: p.mat || 'pine', ki: 0, over: 0, state: 'ready', power: 0, broken: 0, chopT: 0, splits: [], held: false }); B.hero.x = 170; B.hero.face = 1; },
  update(B, dt, ctl) {
    const h = B.hero;
    if (B.state === 'ready') { if (B.t > 1.6) B.state = 'breathe'; return; }
    if (B.state === 'breathe') {
      const hold = ctl.hold;
      if (hold) { B.held = true; const wob = .06 * Math.sin(B.t * 2.2 * Math.PI * 2); B.ki = clamp(B.ki + (.55 * TUNE.kiSpeed + wob) * dt * 100 / 100, 0, 1.15); if (B.ki > 1) { B.over += dt; if (B.over > .3) { B.ki = .6; B.over = 0; B.say('TOO MUCH!'); game.audio.sfx('menuBack'); } } else B.over = 0; if (Math.floor(B.t * 8) !== Math.floor((B.t - dt) * 8)) game.audio.sfx('kiCharge', { pitch: .6 + B.ki }); h.setPose('yoi'); }
      else if (B.held) { B.power = Math.round(clamp(B.ki, 0, 1) * 100); B.state = 'chop'; B.chopT = 0; h.st = 'pose'; h.poseName = 'chop'; KC.Voice.kiai(h.id, true); }
      return;
    }
    if (B.state === 'chop') {
      B.chopT += dt;
      if (B.chopT > .18 && !B.resolved) {
        B.resolved = true; const N = B.n, perfect = B.power >= 95; B.broken = perfect ? N : Math.min(N, Math.floor(B.power / 100 * (N + .99)));
        const mult = KC.MATS[B.mat][1]; B.points = Math.round(B.broken * 200 * mult) + (perfect ? 2000 : 0); B.perfect = perfect;
        for (let i = 0; i < B.broken; i++) B.splits.push({ i, t: 0 });
        if (B.broken) { game.audio.sfx('boardCrack'); game.particles.bits(212, 0, 20 + B.n * 3, 12 + B.broken * 3, [KC.MATS[B.mat][2], E.shade(KC.MATS[B.mat][2], -.2), '#ffffff']); game.particles.dust(212, 0, 4, 10); game.shake(perfect ? 5 : 3); }
        if (!game.reduceMotion) { game.timeScale = .3; game.after(.12, () => { game.timeScale = 1; }); }
        B.callout(perfect ? 'perfect' : B.broken < N / 2 ? 'weak' : null, perfect ? null : B.broken + ' / ' + N + ' BOARDS');
      }
      B.splits.forEach(s => s.t += dt);
      if (B.chopT > 2.6) B.finish();
    }
  },
  rig(B, h) { if (B.state === 'chop') return { attack: { spec: CHOP, phase: B.chopT < .12 ? 'wind' : B.chopT < .22 ? 'active' : 'recover', u: B.chopT < .12 ? B.chopT / .12 : B.chopT < .22 ? (B.chopT - .12) / .1 : 0 }, expr: 'shout' }; return null; },
  draw(B, r) {
    const N = B.n, col = KC.MATS[B.mat][2];
    r.shape('cinder', 200, 0, 0); r.shape('cinder', 224, 0, 0);
    r.queue(212, -2, 8, g => {
      for (let i = 0; i < N; i++) {
        const z = 8 + i * 3, sp = B.splits.find(s => s.i === N - 1 - i), a = r.w(196, 0, z), b = r.w(228, 0, z + 2.5);
        if (sp) { const k = Math.min(1, sp.t * 3), dx = k * 10, dz = k * k * -6; px.rect(g, Math.round(a[0] - dx), Math.round(b[1] - dz), Math.round((b[0] - a[0]) / 2 - 1), Math.max(2, Math.round(a[1] - b[1])), col); px.rect(g, Math.round((a[0] + b[0]) / 2 + 1 + dx), Math.round(b[1] - dz), Math.round((b[0] - a[0]) / 2 - 1), Math.max(2, Math.round(a[1] - b[1])), E.shade(col, -.1)); }
        else { px.rect(g, Math.round(a[0]), Math.round(b[1]), Math.round(b[0] - a[0]), Math.max(2, Math.round(a[1] - b[1])), col); px.rect(g, Math.round(a[0]), Math.round(a[1]) - 1, Math.round(b[0] - a[0]), 1, E.shade(col, -.3)); }
      }
    });
  },
  hud(B, g, W, H) {
    if (B.state === 'breathe' || B.state === 'ready') {
      const x = 22, y = H / 2 - 60, h = 110; box(g, x - 4, y - 18, 30, h + 34, { alpha: .8 }); T(g, 'KI', x + 5, y - 13, '#ffd060');
      px.rect(g, x, y, 22, h, '#1a1424'); const v = clamp(B.ki, 0, 1.15) / 1.15; px.rect(g, x + 2, y + h - Math.round(v * h), 18, Math.round(v * h), B.ki > 1 ? '#ff4a3a' : B.ki >= .95 ? '#ffe070' : '#5ab0ff');
      const p95 = y + h - Math.round(.95 / 1.15 * h), p100 = y + h - Math.round(1 / 1.15 * h); px.rect(g, x - 2, p95, 26, 1, '#ffe070'); px.rect(g, x - 2, p100, 26, 1, '#ff4a3a');
      T(g, Math.round(B.ki * 100) + '%', x - 2, y + h + 4, '#fff');
      const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'R:d' : 'key:K', 'HOLD TO BREATHE'], [d === 'pad' ? 'pad0' : 'key:K', 'RELEASE TO CHOP']], W / 2, H - 40);
      T(g, KC.MATS[B.mat][0] + ' x' + B.n + '   95%+ = PERFECT', W / 2 - TW(KC.MATS[B.mat][0] + ' x' + B.n + '   95%+ = PERFECT') / 2, 56, '#e8e0ff');
    }
  },
  auto(B) { return { hold: B.ki < .97 } }   // the attract mode's perfect breath
};

/* POTS AHOY!: objects from both edges at three heights. Break pots with a technique of their height (bonsai: kicks
 * only), dodge boulders, catch champon bowls with a block. The first hit ends it. */
const LANES = { H: 50, M: 34, L: 9 };
const POTS = {
  start(B) {
    const p = B.params, r = U.rng(1000 + (B.visit || 0) * 77), n = p.n || 16; B.objs = []; B.state = 'ready'; B.handled = 0; B.points = 0; B.next = 0;
    let t = 1.2;
    for (let i = 0; i < n; i++) {
      const k = i / Math.max(1, n - 1), kindR = r(), kind = i === 3 || i === 11 ? 'bowl' : kindR < .55 ? 'pot' : kindR < .72 ? 'bonsai' : kindR < .9 ? 'boulder' : 'bowl', lane = kind === 'bowl' ? (r() < .5 ? 'H' : 'M') : ['H', 'M', 'L'][Math.floor(r() * 3)];
      B.objs.push({ i, kind, lane, side: r() < .5 ? -1 : 1, at: t, v: lerp(p.v0 || 150, p.v1 || 230, k), st: 'wait', x: 0, z: LANES[lane], rot: 0 });
      t += lerp(p.i0 || 1.4, p.i1 || .8, k);
    }
    B.hero.x = 200;
  },
  phantom(B) { const o = B.objs.find(o => o.st === 'tele' || o.st === 'fly'); return o ? { x: 200 + o.side * 100 } : null; },
  update(B, dt) {
    if (B.state === 'ready') { if (B.t > 1.6) { B.state = 'play'; B.t0 = B.t; } return; }
    if (B.state !== 'play') { if (B.t - B.endT > 2.4) B.finish(); return; }
    const h = B.hero, el = (B.t - B.t0) * TUNE.potSpeed;
    for (const o of B.objs) {
      if (o.st === 'wait' && el >= o.at - .7) { o.st = 'tele'; o.x = 200 + o.side * 260; }
      if (o.st === 'tele' && el >= o.at) { o.st = 'fly'; game.audio.sfx('whooshL', { vol: .4 }); }
      if (o.st !== 'fly') continue;
      o.x -= o.side * o.v * TUNE.potSpeed * dt; o.rot += dt * 8 * -o.side; const t = h.T;
      const dist = (o.x - h.x) * o.side - h.w / 2;   // from the hero's edge facing it
      // a technique of the right height in its active frames breaks it
      if (t && h.st === 'tech' && h.ph === 'a' && Math.sign(o.x - h.x) === h.techFace) {
        const mx = t.pts ? h.reach(t)[1] : 0; if (t.pts && dist <= mx + 6 && dist >= -6) {
          const ht = t.height, hit = o.lane === 'H' ? ['high', 'rising', 'air'].includes(ht) : o.lane === 'M' ? ['mid', 'midlow', 'air'].includes(ht) : ['low', 'midlow'].includes(ht);
          if (hit && o.kind !== 'boulder' && (o.kind !== 'bonsai' || t.move.kick)) { o.st = 'broken'; B.handled++; game.particles.bits(o.x, 0, o.z, 14, o.kind === 'bowl' ? ['#e8e0d0', '#d8a050'] : o.kind === 'bonsai' ? ['#5a8a3a', '#a86a40'] : ['#c8784a', '#8a4a2a']); game.audio.sfx('potShatter');
            if (o.kind === 'bowl') { B.points = Math.max(0, B.points - 500); B.say('MOTTAINAI!'); game.audio.sfx('bowlSplash'); } else { B.points += 200; B.popup(o.x, o.z, '200'); } continue; }
        }
        if (t.kind === 'block' && o.kind === 'bowl' && dist <= 14 && dist >= -6) { o.st = 'caught'; B.handled++; B.points += 1000; B.say('NICE CATCH!'); game.audio.sfx('bowlDing'); B.popup(o.x, o.z, '1000'); continue; }
      }
      if (dist < 2 && dist > -h.w) {
        const air = h.z > (o.lane === 'L' ? 4 : 18), low = h.isLow();
        const dodged = o.lane === 'L' ? air : o.lane === 'H' ? low || (h.st === 'tech' && h.T && h.T.kind === 'roll') : air && h.z > 14;
        if (dodged || DEV.invincible || B.cheat) { if (!o.dodged) { o.dodged = true; } }
        else if (o.kind === 'bowl') { o.st = 'passed'; B.handled++; game.audio.sfx('bowlSplash'); B.popup(o.x, o.z, 'SPLASH'); }
        else { o.st = 'hit'; B.hitBy = o; h.hurt(-o.side, true, false); game.audio.sfx('thwackFull'); game.shake(4); B.say(o.kind === 'boulder' ? 'OUCH!' : 'CLONK!'); B.state = 'over'; B.endT = B.t; return; }
      }
      if ((o.x - 200) * o.side < -280) { if (o.st === 'fly') { o.st = 'passed'; B.handled++; } }
    }
    if (B.objs.every(o => o.st !== 'wait' && o.st !== 'tele' && o.st !== 'fly')) { B.perfect = B.objs.every(o => o.st === 'broken' && o.kind !== 'bowl' || o.st === 'caught' || o.kind === 'boulder' && o.st === 'passed'); if (B.perfect) { B.points += 3000; B.callout('perfect'); } B.state = 'over'; B.endT = B.t; }
  },
  draw(B, r) {
    for (const o of B.objs) {
      if (o.st !== 'fly') continue;
      r.queue(o.x, 0, o.z, g => {
        const [x, y] = r.w(o.x, 0, o.z), X = Math.round(x), Y = Math.round(y);
        if (o.kind === 'pot') { px.ell(g, X, Y, 8, 9, '#b8683a'); px.ell(g, X - 2, Y - 2, 5, 6, '#d8884a'); px.rect(g, X - 5, Y - 10, 10, 3, '#8a4a2a'); }
        else if (o.kind === 'bonsai') { px.rect(g, X - 7, Y + 1, 14, 7, '#6a4a7a'); px.rect(g, X - 1, Y - 6, 2, 8, '#6a4a30'); px.disc(g, X - 4, Y - 8, 5, '#4a8a3a'); px.disc(g, X + 4, Y - 7, 5, '#5aa048'); }
        else if (o.kind === 'boulder') { px.disc(g, X, Y, 10, '#6a6a72'); px.disc(g, X - 3, Y - 3, 6, '#8a8a92'); px.rect(g, X + 2 + Math.round(Math.sin(o.rot) * 3), Y + 1, 3, 2, '#4a4a52'); }
        else { px.ell(g, X, Y + 2, 9, 5, '#e8e0d0'); px.ell(g, X, Y - 1, 8, 2, '#d8a050'); px.rect(g, X - 3, Y - 2, 2, 1, '#c8302a'); px.rect(g, X + 2, Y - 1, 2, 1, '#3a8a3a'); if (Math.floor(B.t * 6) % 2) px.blend(g, .4, 'add', () => px.rect(g, X - 1, Y - 10, 2, 6, '#ffffff')); }
      });
    }
  },
  hud(B, g, W, H, r) {
    for (const o of B.objs) if (o.st === 'tele') {
      const x = o.side > 0 ? W - 22 : 6, y = Math.round(r.w(0, 0, o.z)[1]) - 6, blink = Math.floor(B.t * 10) % 2;
      box(g, x - 2, y - 2, 20, 16, { bg: o.kind === 'boulder' ? ['#5a1a1a', '#2a0a0a'] : o.kind === 'bowl' ? ['#1a4a2a', '#0a2a14'] : ['#2a2440', '#14101c'], border: blink ? '#ffd060' : '#8a7aa0' });
      T(g, o.side > 0 ? '←' : '→', x + 4, y + 2, '#fff'); T(g, o.lane, x + 10, y + 2, '#ffd060');
    }
    const left = B.objs.filter(o => o.st === 'wait' || o.st === 'tele' || o.st === 'fly').length; T(g, 'LEFT ' + left, W / 2 - 20, 56, '#e8e0ff');
    if (B.state !== 'over') { const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'R:u' : 'key:I', 'HIGH'], [d === 'pad' ? 'R:r' : 'key:L', 'MID'], [d === 'pad' ? 'R:d' : 'key:K', 'LOW'], [d === 'pad' ? 'L:l' : 'key:A', '+'], [d === 'pad' ? 'R:r' : 'key:L', 'BLOCK = CATCH']], W / 2, H - 40, 10); }
  },
  // the attract mode / autopilot: perfect reads
  auto(B) {
    const h = B.hero, o = B.objs.filter(o => o.st === 'fly').sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0]; if (!o) return KC.NEUTRAL;
    const dist = (o.x - h.x) * o.side - h.w / 2, scr = d => d === 't' ? (o.side > 0 ? 'r' : 'l') : d === 'a' ? (o.side > 0 ? 'l' : 'r') : d;
    if (!h.free()) return { posture: h.posture === 'd' ? 'd' : 'n', press: null };
    if (o.kind === 'boulder') { if (dist < 34) return o.lane === 'H' ? { posture: 'd', press: null } : o.lane === 'L' ? { posture: 'u', press: null } : { posture: scr('a'), press: scr('a') }; return KC.NEUTRAL; }
    if (o.kind === 'bowl') return dist < 16 ? { posture: scr('a'), press: scr('t') } : KC.NEUTRAL;
    const id = o.lane === 'H' ? 'roundKick' : o.lane === 'M' ? 'frontKick' : 'lowKick', t = KC.TECH[id], lead = o.v * TUNE.potSpeed * (U.steps(t.f[0]) / 120);
    return dist < lead + 22 ? { posture: 'n', press: scr(t.R) } : KC.NEUTRAL;
  }
};

/* STOP THE BULL: a custom quadruped. It paws twice and snorts, lowers its head and charges; strike its head in the window
 * with one of the five bull techniques (upper punch, upper lunge, squat punch, front kick, back kick). */
class Bull {
  constructor() { this.x = 420; this.st = 'idle'; this.t = 0; this.ph = 0; this.head = 0; this.v = 0; this.stars = 0; }
  headX() { return this.x - 36; }
  update(dt) {
    this.t += dt; const run = this.st === 'charge' ? 1 : this.st === 'walkBack' || this.st === 'walk' ? .4 : 0; this.ph += dt * (run ? 4 + this.v / 40 : 0) * Math.PI;
    this.head = approach(this.head, this.st === 'charge' || this.st === 'paw' && this.t > .8 ? 1 : 0, dt * 4);
    if (this.st === 'charge' && Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) { game.audio.sfx('bullStomp', { vol: .5 }); game.particles.dust(this.x + 20, 0, 2, 3); }
    if ((this.st === 'paw' || this.st === 'charge') && E.hash2(Math.floor(this.t * 8), 3) > .8) game.particles.smoke(this.headX() - 6, 0, 26, 1, { size: .5, color: '#e8e8f0' });
  }
  draw(r) {
    const legPh = this.ph, x0 = this.x, red = this.st === 'charge' || this.st === 'paw';
    r.queue(x0, 2, 30, g => {
      const P = (x, z) => { const p = r.w(x, 2, z); return [Math.round(p[0]), Math.round(p[1])]; }, tn = E.tones('#4a2e22');
      // legs: two segments each, gallop phases
      [[-24, 0], [-18, .5], [18, .25], [24, .75]].forEach(([dx, off], i) => {
        const a = Math.sin(legPh + off * Math.PI * 2) * (this.st === 'idle' || this.st === 'stopped' ? 0 : .6), paw = this.st === 'paw' && i === 0 ? Math.max(0, Math.sin(this.t * 10)) * 8 : 0;
        const hip = P(x0 + dx, 30), knee = P(x0 + dx + Math.sin(a) * 8, 16 + paw * .5), hoof = P(x0 + dx + Math.sin(a * 1.4) * 12 - (i === 0 ? paw : 0), Math.max(0, -Math.cos(a) * 2 + 2) + paw * .6);
        px.line(g, hip[0], hip[1], knee[0], knee[1], i % 2 ? tn.sh : tn.base, 5); px.line(g, knee[0], knee[1], hoof[0], hoof[1], i % 2 ? tn.sh : tn.base, 4); px.rect(g, hoof[0] - 3, hoof[1] - 2, 6, 3, '#1a1414');
      });
      const c = P(x0, 34); px.ell(g, c[0], c[1], 40, 20, tn.base); px.ell(g, c[0] + 6, c[1] - 6, 30, 12, tn.lt); px.ell(g, c[0] + 18, c[1] - 10, 16, 10, tn.base); px.ell(g, c[0] - 10, c[1] + 10, 28, 6, tn.sh);
      // tail: a pendulum
      const tl = P(x0 + 34, 38), te = P(x0 + 40 + Math.sin(this.t * 4) * 3, 22); px.line(g, tl[0], tl[1], te[0], te[1], tn.sh, 2); px.disc(g, te[0], te[1], 2, '#1a1414');
      // neck and head (lowered when charging), horns, nose ring, eyes
      const hd = this.head, hx = x0 - 34, hz = 40 - hd * 16, H = P(hx, hz), N = P(x0 - 18, 42);
      px.line(g, N[0], N[1], H[0] + 6, H[1], tn.base, 12);
      px.rect(g, H[0] - 10, H[1] - 8, 18, 16, tn.base); px.rect(g, H[0] - 14, H[1] - 2, 8, 9, tn.lt); px.disc(g, H[0] - 11, H[1] + 5, 4, '#c89a8a');
      px.ell(g, H[0] - 11, H[1] + 8, 3, 2, '#e8c040'); px.rect(g, H[0] - 3, H[1] - 5, 3, 3, red ? '#ff2a1a' : '#f8f0e0'); px.dot(g, H[0] - 2, H[1] - 4, '#000');
      for (const s of [-1, 1]) { px.line(g, H[0] + 2, H[1] - 8, H[0] + 2 - 6 * s * .3 - 6, H[1] - 14 - 4 * s, '#e8dcc0', 2); px.line(g, H[0] - 4, H[1] - 14 - 4 * s, H[0] - 9, H[1] - 18 - 3 * s, '#fff8e8', 2); }
      if (this.st === 'stopped') for (let k = 0; k < 3; k++) { const a = this.t * 5 + k * 2.1, sx = H[0] + Math.cos(a) * 12, sy = H[1] - 20 + Math.sin(a) * 4; T(g, '★', sx - 3, sy - 3, '#ffe060', { shadow: null }); }
    });
    r.shadow(x0, 2, 30, .4);
  }
}
KC.Bull = Bull;
const BULL = {
  start(B) { B.bull = new Bull(); B.charge = 0; B.state = 'ready'; B.points = 0; B.hero.x = 140; B.hero.face = 1; B.bstate('idle'); },
  update(B, dt) {
    const b = B.bull, h = B.hero, sp = (B.params.charges || [150, 190, 240])[B.charge] * TUNE.bullSpeed; b.update(dt);
    if (B.state === 'ready') { if (B.t > 1.6) { B.state = 'play'; B.bstate('paw'); } return; }
    if (B.state === 'over') { if (B.t - B.endT > 2.6) B.finish(); if (b.st === 'trample') { b.x -= 200 * dt; } return; }
    b.st0 = (b.st0 || 0) + dt;
    if (b.st === 'paw') { if (b.st0 > 1.2) { B.bstate('charge'); game.audio.sfx('bullBellow'); } else if (Math.floor(b.st0 * 2.5) !== Math.floor((b.st0 - dt) * 2.5)) game.audio.sfx('bullSnort'); }
    else if (b.st === 'charge') {
      b.v = sp; b.x -= sp * dt; const front = h.x + h.w / 2 * h.face, d = b.headX() - front, t = h.T;
      if (t && h.st === 'tech' && h.ph === 'a' && t.pts && d >= 8 && d <= 40 && !h.hitDone) {
        h.hitDone = true;
        if (t.bull) { B.bstate('stopped'); game.audio.sfx('bullThud'); game.audio.sfx('dizzy'); game.shake(4); game.particles.impact(b.headX(), 0, 26, 1.4, '#ffe070'); const perfect = Math.abs(d - 24) <= 6; B.points += 3000 + (perfect ? 1000 : 0); B.say(perfect ? 'PERFECT THUD!' : 'THUD!'); B.popup(b.headX(), 30, String(3000 + (perfect ? 1000 : 0))); B.perfects = (B.perfects || 0) + (perfect ? 1 : 0); b.v = 0; return; }
      }
      if (d < 2) { if (B.cheat || DEV.invincible) { B.bstate('stopped'); B.points += 3000; return; } B.bstate('trample'); h.hurt(-1, true, false); h.z = 0; game.audio.sfx('thwackFull'); game.audio.sfx('bullBellow'); B.say('TRAMPLED!'); B.state = 'over'; B.endT = B.t; game.shake(5); }
    } else if (b.st === 'stopped') { if (b.st0 > 1.5) B.bstate('walkBack'); }
    else if (b.st === 'walkBack') { b.v = 60; b.x += 60 * dt; if (b.x >= 420) { b.x = 420; B.charge++; if (B.charge >= (B.params.charges || [1, 1, 1]).length) { B.state = 'over'; B.endT = B.t; if (B.perfects === 3) { B.points += 2000; B.callout('perfect'); } else B.say('BULL STOPPED!'); } else B.bstate('paw'); } }
  },
  draw(B, r) { B.bull.draw(r); },
  hud(B, g, W, H) { T(g, 'CHARGE ' + Math.min(3, B.charge + 1) + ' / ' + (B.params.charges || [1, 1, 1]).length, W / 2 - 30, 56, '#e8e0ff'); if (B.state === 'play') { const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'L:d' : 'key:S', '+'], [d === 'pad' ? 'R:u' : 'key:I', 'UPPER PUNCH'], [d === 'pad' ? 'R:r' : 'key:L', 'FRONT KICK']], W / 2, H - 40); T(g, 'HIT THE HEAD AS IT ARRIVES: 5 TECHNIQUES WORK', W / 2 - TW('HIT THE HEAD AS IT ARRIVES: 5 TECHNIQUES WORK') / 2, H - 54, '#c8c0e0'); } },
  auto(B) { const b = B.bull, h = B.hero; if (b.st !== 'charge' || !h.free()) return KC.NEUTRAL; const front = h.x + h.w / 2, d = b.headX() - front, lead = b.v * (U.steps(KC.TECH.frontKick.f[0]) / 120) / h.spd(); return d < lead + 26 ? { posture: 'n', press: 'r' } : KC.NEUTRAL; }
};
const approach = E.approach;
KC.BONUS_KINDS = { boards: BOARDS, pots: POTS, bull: BULL };
