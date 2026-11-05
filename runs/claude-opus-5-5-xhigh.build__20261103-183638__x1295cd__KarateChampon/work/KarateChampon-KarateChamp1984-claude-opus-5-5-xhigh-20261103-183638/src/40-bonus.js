/* =====================================================================================================================
 * BONUS STAGES, in one scene with the hero's Karateka and the same twin-stick input:
 *  BREAK THE BOARDS (tameshiwari): hold R down (or the cross, or K) to breathe the KI gauge up, release to chop.
 *  POTS AHOY! (evade): pots, bonsai, boulders and steaming bowls thrown at three heights; break, dodge or catch (block).
 *  STOP THE BULL: a charging bull; one of five techniques at the right moment stops it.
 * data: { id, story, auto (the attract mode's perfect autopilot), variant: { n, mat, difficulty }, done(points) }.
 * ===================================================================================================================== */
const LANES = { high: 52, mid: 36, low: 10 };
KC.Bull = class {
  constructor() { this.x = 372; this.st = 'idle'; this.t = 0; this.v = 0; this.gal = 0; this.head = 0; this.eyes = 0; this.dir = -1; }
  // the head's front, in world x (the strike window is measured to it)
  get nose() { return this.x + this.dir * 36; }
  update(dt) {
    this.t += dt;
    if (this.st === 'charge') { this.x += this.dir * this.v * dt; this.gal += dt * this.v / 22; }
    else if (this.st === 'walkBack') { this.x += -this.dir * 70 * dt; this.gal += dt * 3; }
    else if (this.st === 'trample') { this.x += this.dir * this.v * .6 * dt; this.gal += dt * this.v / 22; }
    this.head = approach(this.head, this.st === 'charge' || this.st === 'paw' ? 1 : 0, dt * 4); this.eyes = approach(this.eyes, this.st === 'charge' ? 1 : 0, dt * 6);
  }
  draw(r) {
    const s = r.view.scale, P = (dx, z) => r.w(this.x + this.dir * dx, -2, z), T = E.tones('#4a2e22'), H = E.tones('#e8dcc0');
    r.queue(this.x, -2, 0, g => {
      const legs = [[22, 0], [16, .5], [-18, .25], [-24, .75]], walk = this.st === 'charge' || this.st === 'walkBack' || this.st === 'trample', paw = this.st === 'paw';
      for (const [lx, ph] of legs) {   // two-segment legs on a gallop
        const a = walk ? Math.sin(this.gal * TAU + ph * TAU) : paw && lx > 0 && lx < 20 ? Math.max(0, Math.sin(this.t * 9)) : 0;
        const hip = P(lx, 30), knee = P(lx + a * 6, 15 + Math.max(0, a) * 4), hoof = P(lx + a * 10, Math.max(0, a) * 6);
        px.line(g, Math.round(hip[0]), Math.round(hip[1]), Math.round(knee[0]), Math.round(knee[1]), T.sh, Math.round(5 * s)); px.line(g, Math.round(knee[0]), Math.round(knee[1]), Math.round(hoof[0]), Math.round(hoof[1]), T.sh, Math.round(4 * s));
        px.rect(g, Math.round(hoof[0]) - 3, Math.round(hoof[1]) - 2, 6, 3, '#1a1008');
      }
      const c = P(0, 32), bw = Math.round(40 * s), bh = Math.round(17 * s);
      px.ell(g, Math.round(c[0]), Math.round(c[1]), bw, bh, T.sh); px.ell(g, Math.round(c[0]) - this.dir, Math.round(c[1]) - 3, bw - 3, bh - 4, T.base); px.ell(g, Math.round(c[0]) - this.dir * 8, Math.round(c[1]) - 8, Math.round(bw * .5), 4, T.lt);
      const hump = P(14, 42); px.ell(g, Math.round(hump[0]), Math.round(hump[1]), Math.round(14 * s), Math.round(10 * s), T.base);
      const tail = P(-40, 34 + Math.sin(this.t * 5) * 4), tb = P(-38, 40); px.line(g, Math.round(tb[0]), Math.round(tb[1]), Math.round(tail[0]), Math.round(tail[1] + 8), T.sh, 2); px.disc(g, Math.round(tail[0]), Math.round(tail[1] + 9), 2, '#1a1008');
      const hd = P(34 + this.head * 2, 36 - this.head * 12), hx = Math.round(hd[0]), hy = Math.round(hd[1]);   // the head, lowered to charge
      px.ell(g, hx, hy, Math.round(10 * s), Math.round(9 * s), T.sh); px.ell(g, hx + this.dir * 6, hy + 4, Math.round(7 * s), Math.round(6 * s), '#c88a7a');
      px.disc(g, hx + this.dir * 9, hy + 6, 2, '#e8c040');   // the nose ring
      for (const k of [-1, 1]) { px.line(g, hx - this.dir * 2, hy - 7, hx - this.dir * 2 + k * 5 - this.dir * 6, hy - 16, H.base, 3); px.line(g, hx - this.dir * 2 + k * 5 - this.dir * 6, hy - 16, hx + k * 8 - this.dir * 2, hy - 22, H.lt, 2); }
      px.rect(g, hx + this.dir * 2 - 1, hy - 3, 3, 2, this.eyes > .5 ? '#ff2a1a' : '#1a1008');
      if (this.st === 'stopped') for (let i = 0; i < 4; i++) { const a = this.t * 5 + i * TAU / 4; px.sprite(g, KC.SPRITES.star, Math.round(hx + Math.cos(a) * 12) - 2, Math.round(hy - 26 + Math.sin(a) * 4)); }
    }, { bias: 1 });
    r.shadow(this.x, -2, 30, .35);
  }
};

KC.BonusScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.d = d; this.finished = false; this.struck = false; this.tumble = 0; this.autoCtl = null; this.B = KC.BONUS[d.id] || KC.BONUS.boards; this.kind = this.B.kind; this.t = 0; this.points = 0; this.state = 'intro'; this.stT = 0; this.msg = null; this.msgT = 0; this.perfect = false;
    g.setView('kcside'); KC.Stage.enter(g, this.B.stage); KC.music('bonus'); KC.scene = this; g.timeScale = 1;
    const hx = this.kind === 'boards' ? 170 : this.kind === 'bull' ? 130 : 200;
    this.hero = new KC.Karateka({ fid: 'taro', side: 0, x: hx, rank: d.story ? KC.Story.rank : 'white' }); this.hero.x0 = 40; this.hero.x1 = 360;
    this.reader = d.auto ? null : new KC.Reader(g.input); this.bus = new KC.Bus(); this.hero.bus = this.bus; this.fx = {}; KC.fx.attach({ bus: this.bus, f: [this.hero] }, g, this.fx);
    this.ref = KC.makeOfficial(1.9);
    const V = Object.assign({}, this.B.params, d.variant || {}), diff = V.difficulty || 'Normal'; this.V = V; this.speedK = diff === 'Easy' ? .8 : diff === 'Hard' ? 1.25 : 1;
    if (this.kind === 'boards') { this.n = V.n || 5; this.mat = KC.DATA.boardMats[V.mat || 'pine']; this.ki = 0; this.over = 0; this.held = false; this.broken = 0; this.chopT = -1; }
    if (this.kind === 'pots') this._potsInit(V);
    if (this.kind === 'bull') { this.bull = new KC.Bull(); this.charge = 0; this.thuds = 0; this.bullSt(); }
    this.ref.update(.05, { x: 300, y: -20, z: 0, facing: PI / 2 });
    this.banner = { boards: KC.TEXT.bonusBoards, pots: KC.TEXT.bonusPots, bull: KC.TEXT.bonusBull }[this.kind];
    KC.Voice.speak(this.banner, 'genkotsu');
  },
  exit() { KC.game.timeScale = 1; KC.scene = null; KC.game.weather = null; },
  say(text, color) { this.msg = text; this.msgT = 1.6; this.msgC = color; KC.Voice.call(text === 'PERFECT!' ? 'perfect' : text === 'WEAK!' ? 'weak' : 'stop', text); },
  update(dt) {
    const g = KC.game, h = this.hero; this.t += dt; this.stT += dt; this.msgT -= dt; KC.Stage.update(dt); KC.fx.step(g, this.fx, dt);
    if (this.state === 'intro') { h.script(this.kind === 'boards' ? 'yoi' : 'kamae', null); if (this.stT > 1.8) { this.state = 'play'; this.stT = 0; h.release(); h.ctlOn = true; if (this.kind === 'boards') h.script('yoi', null); } }
    else if (this.state === 'play') { if (this.kind === 'boards') this._boards(dt); else if (this.kind === 'pots') this._pots(dt); else this._bull(dt); }
    else if (this.state === 'end' && this.stT > 3 && !this.finished) this._finish();
    if (this.kind !== 'boards' || this.state !== 'play' || this.chopT < 0) { if (!(this.kind === 'boards')) { const c = this.reader ? this.reader.read() : this.autoCtl || { posture: 'n', press: null }; h.control(this.state === 'play' ? c : { posture: 'n', press: null }); h.update(dt, this._foe()); } else h.update(dt, null); }
    h.pose(dt);
    KC.poseStep(this.ref, dt, { cross: this.msgT > 0 ? 0 : 1, sig: this.msgT > 0 ? (this.msg === 'WEAK!' || this.msg === KC.TEXT.trampled ? 'nopoint' : 'full') : null, side: 1 }); this.ref.update(dt, { x: 300, y: -20, z: 0, facing: PI / 2 });
    if (this.kind === 'bull') this.bull.update(dt);
    KC.camera(g, this.kind === 'bull' ? [Math.min(h.x, this.bull.x), Math.max(h.x + 140, this.bull.x)] : [200]);
    if (this.d.limit && this.stT > this.d.limit && this.state === 'play' && this.d.auto) this._end(false);
  },
  // a stand-in foe so the hero faces the incoming side
  _foe() { const side = this.kind === 'pots' ? this.facing : 1; return { x: this.hero.x + side * 50, w: 10, airborne: false }; },
  _end(perfect) { if (this.state === 'end') return; this.state = 'end'; this.stT = 0; if (perfect) { this.perfect = true; KC.sting('perfect'); } KC.Voice.crowd(.6, 1); },
  _finish() {
    this.finished = true; const pts = Math.max(0, this.points), d = this.d, g = KC.game;
    if (d.done) { d.done(pts); return; }
    if (d.story) { KC.Story.score += pts; KC.Story.advance(); return; }
    if (KC.Save.qualifies(this.kind, pts)) g.go('initials', { mode: this.kind, score: pts, next: () => g.go('bonusMenu') }); else g.go('bonusMenu');
  },
  /* ---- BOARDS ---- */
  _boards(dt) {
    const h = this.hero, T = KC.TUNE, I = KC.game.input;
    if (this.chopT >= 0) { this.chopT += dt; this._chopStep(dt); return; }
    const down = this.d.auto ? (this.ki < 96 || this.stT < .6) : (I.down('tDown') || I.down('confirm') && false);
    if (down) { this.held = true; this.ki += 55 * T.kiSpeed * dt; h.spose = 'breathe'; if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) KC.sfx('steamHiss', { vol: .4 }); }
    const shown = this.gauge();
    if (this.ki > 100) { this.over += dt; if (this.over > .3) { this.ki = 60; this.over = 0; this.say(KC.TEXT.tooMuch, ['#ffd0c0', '#ff5a4a']); } } else this.over = 0;
    if (!down && this.held) { this.power = clamp(shown, 0, 110); this.held = false; this.chopT = 0; h.spose = 'chop'; KC.Voice.kiai('heavy', 'taro'); KC.sfx('chopWhoosh'); }
  },
  gauge() { return clamp(this.ki + 6 * Math.sin(this.t * TAU * 2.2), 0, 115); },
  _chopStep() {
    const h = this.hero, u = this.chopT / .45;
    h.chop = { spec: { rel: true, plane: 'side', a0: 2.4, a1: -1.3, reach: 7.4, lunge: 1.4, crouch: .6, lean: .55, blade: 0 }, phase: u < .45 ? 'wind' : u < .7 ? 'active' : 'recover', u: u < .45 ? u / .45 : u < .7 ? (u - .45) / .25 : Math.min(1, (u - .7) / .3) };
    if (!this.struck && u >= .6) {
      this.struck = true; const P = this.power, N = this.n, perfect = P >= 95, nb = perfect ? N : Math.min(N, Math.floor(P / 100 * (N + .99)));
      this.broken = nb; this.points += Math.round(nb * 200 * this.mat.mul) + (perfect ? 2000 : 0);
      const g = KC.game; if (!g.reduceMotion) { g.timeScale = .3; this.fx.slowT = .4; }
      g.shake(nb ? 4 : 1); KC.sfx(nb ? 'boardCrack' : 'thudFall'); g.particles.dust(205, 0, 20, 14);
      for (let i = 0; i < nb; i++) g.particles.bits(205, 0, 26 - i * 3, 10, [this.mat.color, E.shade(this.mat.color, -.25), '#f4e8c8']);
      this.say(perfect ? 'PERFECT!' : nb === 0 || nb < N / 2 ? 'WEAK!' : nb + ' BOARDS!', perfect ? null : nb < N / 2 ? ['#ffd0c0', '#ff5a4a'] : null);
      this._end(perfect);
    }
  },
  /* ---- POTS AHOY! ---- */
  _potsInit(V) {
    const R = KC.rng(KC.hash('pots' + (this.d.story ? KC.Story.node : 0) + (V.seed || 0) + (this.d.auto ? 3 : 0))), n = V.count || 16, kinds = ['pot', 'pot', 'bonsai', 'boulder', 'pot', 'bowl', 'pot', 'boulder', 'bonsai', 'pot', 'bowl', 'boulder', 'pot', 'bonsai', 'boulder', 'pot'];
    this.seq = Array.from({ length: n }, (_, i) => { const kind = kinds[i % kinds.length], lane = kind === 'bowl' ? 'mid' : ['high', 'mid', 'low'][Math.floor(R() * 3)]; return { kind, lane, from: R() < .5 ? -1 : 1, at: 0 }; });
    let t = 1; this.seq.forEach((o, i) => { o.at = t; t += lerp(1.4, .8, i / Math.max(1, n - 1)); o.speed = lerp(150, 230, i / Math.max(1, n - 1)); });
    this.objs = []; this.next = 0; this.handled = 0; this.facing = 1; this.potClock = 0;
  },
  _pots(dt) {
    const h = this.hero, T = KC.TUNE; this.potClock += dt;
    // launch on schedule: a telegraph 0.7 s ahead (an edge arrow, a height mark), then the throw
    while (this.next < this.seq.length && this.potClock >= this.seq[this.next].at - .7) {
      const s = this.seq[this.next++], sp = s.speed * T.potSpeed * this.speedK;
      this.objs.push({ kind: s.kind, lane: s.lane, from: s.from, x: s.from < 0 ? -30 : 430, z: LANES[s.lane], vx: -s.from * sp, tele: .7, rot: 0, done: false });
    }
    let firstLive = null;
    for (const o of this.objs) {
      if (o.done) continue;
      if (o.tele > 0) { o.tele -= dt; if (!firstLive) firstLive = o; continue; }
      if (!firstLive) firstLive = o;
      o.x += o.vx * dt; o.rot += dt * 8;
      const front = h.x + Math.sign(o.x - h.x) * h.w / 2, d = Math.abs(o.x - front), toward = Math.sign(o.vx) === -Math.sign(o.x - h.x);
      // a technique of the right height breaks it (bonsai: kicks only); a block catches a bowl
      if (h.st === 'tech' && h.phase === 'active' && toward && d < 34 && Math.sign(o.x - h.x) === h.face) {
        const t = h.T, H = KC.Karateka.heightOf(t), hits = { high: ['high', 'air', 'rising'], mid: ['mid', 'midlow'], low: ['low', 'midlow'] }[o.lane];
        if (o.kind === 'bowl' && t.id === 'block') { o.done = true; this.points += 1000; this.handled++; this.say(KC.TEXT.niceCatch); KC.sfx('bowlDing'); continue; }
        if (o.kind !== 'boulder' && t.scoring && hits.includes(H) && (o.kind !== 'bonsai' || t.limb === 'foot')) {
          o.done = true; this.handled++; const g = KC.game;
          if (o.kind === 'bowl') { this.points -= 500; this.say(KC.TEXT.mottainai, ['#ffd0c0', '#ff5a4a']); KC.sfx('bowlSplash'); g.particles.bits(o.x, 0, o.z, 10, ['#f4f0e8', '#e8a040', '#ffd060']); }
          else { this.points += 200; KC.sfx('potShatter'); g.particles.bits(o.x, 0, o.z, 12, o.kind === 'bonsai' ? ['#3a5a8a', '#3a7a3a', '#5a3a22'] : ['#b8683a', '#8a4a2a', '#e8a070']); g.particles.text(o.x, 0, o.z + 12, '200', '#ffe070', { bounce: false }); }
          continue;
        }
      }
      // it reaches the body: does the posture let it pass?
      if (Math.abs(o.x - h.x) < h.w / 2 + 4) {
        const prof = h.profile(), z0 = h.z + (prof === 'flip' ? 12 : 0), z1 = h.z + (prof === 'crouch' ? h.h * .5 : prof === 'roll' ? 24 : prof === 'flip' ? 40 : h.h * .95);
        if (o.z >= z0 - 6 && o.z <= z1 + 2) {
          if (o.kind === 'bowl') { o.done = true; this.handled++; this.say('SPLASH!'); KC.sfx('bowlSplash'); continue; }
          o.done = true; h.hit('down', o.x); KC.sfx('thwackFull'); KC.game.shake(3); KC.game.particles.impact(o.x, 0, o.z, 10, '#ffffff'); this.say('OUCH!', ['#ffd0c0', '#ff5a4a']); this._end(false); return;
        }
      }
      if ((o.vx > 0 && o.x > 440) || (o.vx < 0 && o.x < -40)) { o.done = true; this.handled++; if (o.kind === 'bowl') this.say('SPLASH!'); }
    }
    // face whatever arrives first (the nearest incoming object; else the next telegraphed one)
    const inc = this.objs.filter(o => !o.done && o.tele <= 0 && Math.sign(o.vx) === -Math.sign(o.x - h.x)).sort((a, b) => Math.abs(a.x - h.x) / Math.abs(a.vx) - Math.abs(b.x - h.x) / Math.abs(b.vx))[0];
    if (inc) this.facing = Math.sign(inc.x - h.x) || 1; else if (firstLive) this.facing = firstLive.from;
    if (this.d.auto) this.autoCtl = this._potsAuto();
    if (this.next >= this.seq.length && this.objs.every(o => o.done)) { const all = this.handled >= this.seq.length; if (all) { this.points += 3000; this.say('PERFECT!'); } this._end(all); }
  },
  // the attract mode's perfect reads: the right answer to the nearest incoming object, timed to its distance
  _potsAuto() {
    const h = this.hero, o = this.objs.filter(o => !o.done && o.tele <= 0).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    if (!o || !h.free) return { posture: 'n', press: null };
    const d = Math.abs(o.x - h.x) - h.w / 2, sp = Math.abs(o.vx), dir = o.x > h.x ? 'r' : 'l';
    if (o.kind === 'boulder') { const rel = o.lane === 'mid' ? Math.max(40, sp - 126) : sp, lead = o.lane === 'low' ? .2 : o.lane === 'high' ? .45 : .42; if (d / rel < lead) return o.lane === 'low' ? { posture: 'u', press: null } : o.lane === 'high' ? { posture: 'd', press: null } : { posture: dir === 'r' ? 'l' : 'r', press: dir === 'r' ? 'l' : 'r' }; return { posture: 'n', press: null }; }
    const id = o.kind === 'bowl' ? 'block' : o.lane === 'high' ? 'roundKick' : o.lane === 'mid' ? 'frontKick' : 'lowKick', t = KC.TECH[id], st = h.frames(t)[0] * STEP + (id === 'block' ? .02 : .03);
    if (d - sp * st < 26 && d > 4) { const c = KC.cellOf(id); return { posture: KC.scrDir(c[0], o.from > 0 ? 1 : -1), press: KC.scrDir(c[1], o.from > 0 ? 1 : -1) }; }
    return { posture: 'n', press: null };
  },
  /* ---- STOP THE BULL ---- */
  bullSt() { const b = this.bull; b.st = 'idle'; b.t = 0; b.x = 372; this.bullT = 0; },
  _bull(dt) {
    const h = this.hero, b = this.bull, sp = [150, 190, 240][Math.min(2, this.charge)] * KC.TUNE.bullSpeed * this.speedK; this.bullT += dt;
    if (b.st === 'idle' && this.bullT > .8) { b.st = 'paw'; this.bullT = 0; KC.sfx('bullSnort'); }
    else if (b.st === 'paw') { if (Math.floor(this.bullT * 2.5) !== Math.floor((this.bullT - dt) * 2.5)) KC.sfx('bullStomp'); KC.game.particles.smoke(b.x - 40, -2, 30, 1, { size: .6, color: '#e8e8e8' }); if (this.bullT > 1.2) { b.st = 'charge'; b.v = sp; this.bullT = 0; KC.sfx('bullBellow'); } }
    else if (b.st === 'charge') {
      const front = h.x + h.w / 2, d = b.nose - front;
      if (h.st === 'tech' && h.phase === 'active' && !h.resolved && h.face > 0 && h.T.scoring) {
        h.resolved = true;
        if (h.T.bull && d >= 8 && d <= 40) { b.st = 'stopped'; this.bullT = 0; this.thuds++; const perfect = Math.abs(d - 24) <= 6; this.points += 3000 + (perfect ? 1000 : 0); this.say(perfect ? 'PERFECT!' : 'THUD!'); KC.sfx('bullThud'); KC.sfx('dizzy'); KC.game.shake(5); KC.game.particles.impact(b.nose, -2, 30, 14, '#ffe070'); KC.Voice.crowd(.8, 1.2); }
        else if (!h.T.bull && d <= 40) { this._trample(); return; }
      }
      if (d < 6) { this._trample(); return; }
    }
    else if (b.st === 'stopped' && this.bullT > 1.5) { b.st = 'walkBack'; this.bullT = 0; }
    else if (b.st === 'walkBack' && b.x > 372) { this.charge++; if (this.charge >= (this.V.charges || 3)) { this.points += this.thuds === 3 ? 0 : 0; this._end(this.thuds >= 3); return; } this.bullSt(); }
    else if (b.st === 'trample' && this.bullT > 2) this._end(false);
    if (this.d.auto) { const front = h.x + h.w / 2, d = b.nose - front, st = h.frames(KC.TECH.frontKick)[0] * STEP; this.autoCtl = b.st === 'charge' && h.free && d - b.v * st < 26 && d - b.v * st > 18 ? { posture: 'n', press: 'r' } : { posture: 'n', press: null }; }
  },
  _trample() { const b = this.bull, h = this.hero; b.st = 'trample'; this.bullT = 0; h.script('trampled', null); h.st = 'script'; h.z = 0; KC.sfx('thwackFull'); KC.game.shake(5); KC.game.particles.dust(h.x, 0, 0, 16); this.say(KC.TEXT.trampled, ['#ffd0c0', '#ff5a4a']); this.tumble = 0; },
  draw(r) {
    const h = this.hero;
    KC.Stage.draw(r, this.B.stage, {});
    r.actor(300, -20, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    if (this.kind === 'bull' && this.bull.st === 'trample' && h.st === 'script') { this.tumble = (this.tumble || 0) + 1 / 60; const k = Math.min(1, this.tumble / 1.2); h.z = Math.sin(k * PI) * 40; h.x = 130 - k * 60; }
    h.draw(r);
    if (this.kind === 'boards') r.queue(205, 0, 0, g => this._drawBoards(g, r));
    if (this.kind === 'pots') for (const o of this.objs) if (!o.done && o.tele <= 0) r.queue(o.x, 0, o.z, g => { const p = r.w(o.x, 0, o.z - 6), x = Math.round(p[0]), y = Math.round(p[1]), s = 1; (o.kind === 'bonsai' ? KC.Props.bonsai : o.kind === 'boulder' ? KC.Props.boulder : o.kind === 'bowl' ? KC.Props.bowl : KC.Props.clayPot)(g, x, y, s); if (o.kind === 'bowl') px.blend(g, .3, 'normal', () => px.ell(g, x, y - 12 - Math.round(Math.sin(this.t * 6) * 2), 3, 2, '#ffffff')); });
    if (this.kind === 'bull') this.bull.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (this.state === 'intro') E.font.title(g, this.banner, mid, Math.round(H * .3), { scale: W > 380 ? 3 : 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
      E.font.text(g, 'BONUS ' + KC.commas(Math.max(0, this.points)), 8, 6, '#fff6e8', { outline: '#000', scale: 2 });
      if (this.d.story) E.font.text(g, '1P ' + KC.pad(KC.Story.score), 8, H - 12, '#fff6e8', { outline: '#000' });
      if (this.msgT > 0) E.font.title(g, this.msg, mid, Math.round(H * .26), { scale: 3, align: 'center', colors: this.msgC || ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
      if (this.kind === 'boards') this._drawKi(g, r);
      if (this.kind === 'pots') {
        E.font.text(g, 'LEFT ' + Math.max(0, this.seq.length - this.handled), W - 8, 6, '#fff6e8', { align: 'right', outline: '#000', scale: 2 });
        for (const o of this.objs) if (!o.done && o.tele > 0) { const x = o.from < 0 ? 10 : W - 22, y = Math.round(r.w(0, 0, o.z)[1]) - 4, blink = Math.floor(this.t * 8) % 2; E.font.text(g, o.from < 0 ? '→' : '←', x, y, blink ? '#ffd060' : '#ff8a3a', { outline: '#000', scale: 2 }); E.font.text(g, o.lane.toUpperCase(), x + (o.from < 0 ? 0 : -6), y + 16, '#fff6e8', { outline: '#000', font: 'tiny' }); }
      }
      if (this.kind === 'bull') E.font.text(g, 'CHARGE ' + Math.min(3, this.charge + 1) + '/3', W - 8, 6, '#fff6e8', { align: 'right', outline: '#000', scale: 2 });
      const tips = { boards: [['tDown', 'HOLD TO BREATHE, RELEASE TO CHOP']], pots: [['tUp', 'HIGH'], ['tRight', 'MID'], ['tDown', 'LOW'], ['up', 'JUMP'], ['down', 'DUCK']], bull: [['tRight', 'FRONT KICK'], [{ kind: 'text', t: 'UPPER/LUNGE/SQUAT PUNCH, BACK KICK' }, '']] }[this.kind];
      if (this.state !== 'end' && !this.d.auto) KC.promptBar(g, W, H, tips);
      if (this.state === 'end' && this.stT > .8) E.font.title(g, 'BONUS ' + KC.commas(Math.max(0, this.points)), mid, Math.round(H * .45), { scale: 2, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'] });
    });
  },
  _drawBoards(g, r) {
    const p = r.w(205, 0, 0), x = Math.round(p[0]), y = Math.round(p[1]), s = r.view.scale, T = E.tones('#8a8a8a');
    for (const k of [-1, 1]) { px.rect(g, x + k * 14 * s - 6 * s, y - 20 * s, 12 * s, 20 * s, T.base); px.rect(g, x + k * 14 * s - 6 * s, y - 20 * s, 12 * s, 2, T.lt); px.rect(g, x + k * 14 * s - 3 * s, y - 15 * s, 6 * s, 8 * s, T.sh); }
    const M = this.mat, bh = Math.max(2, Math.round(3 * s));
    for (let i = 0; i < this.n; i++) {
      const by = y - 20 * s - (i + 1) * bh, broken = this.struck && i >= this.n - this.broken, split = broken ? Math.round(Math.min(12, this.chopT * 60)) : 0;
      if (broken) { px.rect(g, x - 22 * s - split, by + split, 21 * s, bh - 1, M.color); px.rect(g, x + 1 + split, by + split, 21 * s, bh - 1, M.color); }
      else { px.rect(g, x - 22 * s, by, 44 * s, bh - 1, M.color); px.rect(g, x - 22 * s, by, 44 * s, 1, E.shade(M.color, .25)); }
    }
  },
  _drawKi(g, r) {
    const W = r.W, x = W - 40, y = 40, h = 110, v = this.gauge(), k = clamp(v / 110, 0, 1);
    E.ui.box(g, x - 4, y - 14, 28, h + 26, { bg: '#0a0818', border: '#e8d8b0' }); E.font.text(g, 'KI', x + 10, y - 10, '#ffd060', { align: 'center', outline: false });
    px.rect(g, x, y, 20, h, '#2a2438'); const fh = Math.round(h * k), c = v >= 95 && v <= 100 ? '#fff6c0' : v > 100 ? '#ff5a4a' : '#ffb040'; px.rect(g, x, y + h - fh, 20, fh, c);
    const ly = y + h - Math.round(h * 95 / 110); px.rect(g, x - 3, ly, 26, 1, '#ffffff'); E.font.text(g, '95', x - 6, ly - 3, '#ffffff', { align: 'right', outline: '#000', font: 'tiny' });
    E.font.text(g, this.n + ' ' + this.mat.name, x + 10, y + h + 6, '#e8e0ff', { align: 'center', outline: '#000', font: 'tiny' });
  },
  debugState() { return { kind: this.kind, state: this.state, points: this.points, objectsLeft: this.kind === 'pots' ? this.seq.length - this.handled : this.kind === 'bull' ? 3 - this.charge : this.n - (this.broken || 0), ki: this.ki, bull: this.bull && this.bull.st }; }
};
