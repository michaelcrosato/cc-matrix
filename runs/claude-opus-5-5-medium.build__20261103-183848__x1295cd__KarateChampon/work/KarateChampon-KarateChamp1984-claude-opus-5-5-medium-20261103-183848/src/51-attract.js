/* ---- ATTRACT MODE: after 10 s without input on the title or any menu. A looping, AI-played demo that cheats freely:
 * 1 an exhibition bout whose director forces a half point, a block and counter, an aiuchi, a sweep, a somersault
 * cross-up and a time-out hantei; 2 a bonus reel (a perfect board break, Pots Ahoy! with perfect reads and a bowl catch,
 * one bull charge); 3 HOW TO FIGHT (Senpai demonstrates every technique with its stick prompts); 4 the high scores;
 * 5 the title. Any input exits to the title. Deterministic per loop index. ---- */
Object.assign(KC.Attract, {
  step: null, t: 0,
  start(loop) { this.on = true; this.loop = loop || 1; this.t = 0; this.visited = []; this.exhibition(); },
  stop() { if (!this.on) return; this.on = false; this.step = null; game.audio.musicVolume = game.settings.music; game.audio.applyVolume(); game.timeScale = 1; },
  mark(step) { this.step = step; this.visited.push(step); this.t = 0; game.audio.musicVolume = game.settings.music * .5; game.audio.applyVolume(); },
  exitCheck() { if (this.anyInput()) { this.stop(); game.input.consumeAll(); game.go('title'); return true; } return false; },
  banner(r) { if (!this.on) return; r.overlay(g => { const W = r.W, H = r.H; if (Math.floor(game.real * 2) % 2 === 0) { box(g, W / 2 - 90, H - 34, 180, 18, { bg: ['#5a1010', '#2a0808'], border: '#ffd060' }); T(g, 'DEMO — PRESS START', W / 2 - TW('DEMO — PRESS START') / 2, H - 29, '#fff6d0'); } }); },
  exhibition() {
    this.mark('bout'); const r = U.rng(this.loop * 31 + 7), ids = KC.DATA.roster.map(f => f.id), st = KC.FIGHT_STAGES[this.loop % KC.FIGHT_STAGES.length];
    const a = ids[Math.floor(r() * ids.length)], b = ids.filter(x => x !== a)[Math.floor(r() * (ids.length - 1))], dir = KC.Director(), self = this;
    game.go('fight', { mode: 'attract', stage: st, white: a, red: b, ctrl: [dir.ctl(0), dir.ctl(1)], rounds: 1, points: 5, clock: 99, seed: this.loop, intro: true, onOver: () => self.bonusReel(), director: dir });
  },
  bonusReel() {
    this.mark('bonus'); const self = this;
    game.go('bonus', { kind: 'boards', auto: true, cheat: true, params: { n: 7, mat: 'tile' }, onDone: () => {
      game.go('bonus', { kind: 'pots', auto: true, cheat: true, visit: this.loop, params: { n: 12 }, onDone: () => {
        game.go('bonus', { kind: 'bull', auto: true, cheat: true, params: { charges: [170] }, onDone: () => self.howTo() }); } }); } });
  },
  howTo() { this.mark('howto'); const self = this; game.go('practice', { lesson: 'ALL', autopilot: true, onDone: () => self.scores() }); game.after(30, () => { if (this.on && this.step === 'howto') self.scores(); }); },
  scores() { this.mark('scores'); game.go('attractScores'); }
});
scenes.attract = SC({ enter(d) { KC.Attract.start(d && d.loop); }, update() {}, draw(r) { r.sky(['#000', '#000']); } });
scenes.attractScores = SC({
  enter() { this.t = 0; this.title = false; KC.music('title'); },
  update(dt) { this.t += dt; if (this.t >= 6 && !this.title) { this.title = true; KC.Attract.mark('title'); } if (this.t > 11) { KC.Attract.loop++; KC.Attract.exhibition(); } },
  draw(r) {
    if (this.t < 6) { r.sky(['#10081a', '#2a1440']); r.overlay(g => { const W = r.W, tb = cab.table('story'); KC.title(g, 'HIGH SCORES', W / 2, 10, 3); for (let k = 0; k < 10; k++) { const e = tb[k], y = 46 + k * 15; T(g, (k + 1) + '. ' + (e ? e.name : '---') + '   ' + (e ? U.pad(e.score, 7) : '-------'), W / 2 - 90, y, k ? '#f4ecd8' : '#ffd060', BIG); } }); }
    else { r.sky(['#1a1018', '#2a1a20']); r.overlay(g => { KC.title(g, 'KARATE', r.W / 2, r.H * .25, 3); KC.title(g, 'CHAMPON', r.W / 2, r.H * .25 + 28, 4); T(g, 'TWO STICKS. ONE CLEAN STRIKE.', r.W / 2 - TW('TWO STICKS. ONE CLEAN STRIKE.') / 2, r.H * .6, '#ffd060'); }); }
  }
});

/* the exhibition's director: scripted exchanges, each from the marks. It cheats: it sets the clock and the score. */
KC.Director = () => {
  const D = { ex: 0, t: 0, phase: null, shown: {} };
  const EX = [
    // 1. red walks in and lands a front kick: HALF POINT
    { w: [['wait', 9]], r: [['walkTo', 20], ['tech', 'frontKick']] },
    // 2. red round kick, white blocks, then counters with a middle lunge in red's recoil: COUNTER, FULL POINT
    { w: [['react', 'block'], ['wait', .25], ['tech', 'midLunge']], r: [['walkTo', 24], ['tech', 'roundKick']] },
    // 3. both strike on the same step: AIUCHI
    { w: [['walkTo', 22], ['sync', 'frontKick']], r: [['walkTo', 22], ['sync', 'frontKick']] },
    // 4. white sweeps: unblockable, knocked down
    { w: [['walkTo', 18], ['tech', 'frontSweep']], r: [['wait', 9]] },
    // 5. red somersaults over white (a cross-up), turns and strikes white in recovery
    { w: [['wait', .55], ['tech', 'roundKick']], r: [['walkTo', 40], ['tech', 'frontFlip'], ['land'], ['wait', .05], ['tech', 'frontKick']] },
    // 6. the clock runs down with both feinting: TIME, then the judges decide (the director evens the score)
    { setup: B => { B.clock = 6; B.points = [Math.max(...B.points), Math.max(...B.points)]; }, w: [['feint']], r: [['feint']] }
  ];
  D.reset = B => { D.prog = [0, 0]; D.t = 0; D.tsub = [0, 0]; D.syncT = 0; const e = EX[D.ex]; if (e && e.setup) e.setup(B); };
  D.ctl = side => (f, foe, B) => {
    if (B.phase !== 'fight') return KC.NEUTRAL;
    if (D.boutPhaseSeen !== B.steps && side === 0) { D.boutPhaseSeen = B.steps; }
    const e = EX[Math.min(D.ex, EX.length - 1)], script = side ? e.r : e.w, i = D.prog[side], cmd = script[i];
    const toward = Math.sign(foe.x - f.x) || f.face, scr = d => d === 't' ? (toward > 0 ? 'r' : 'l') : d === 'a' ? (toward > 0 ? 'l' : 'r') : d;
    const next = () => { D.prog[side]++; D.tsub[side] = 0; };
    D.tsub[side] += 1 / 120;
    if (!cmd) return KC.NEUTRAL;
    const tech = id => { const t = KC.TECH[id]; next(); return { posture: scr(t.L), press: scr(t.R) }; };
    switch (cmd[0]) {
      case 'wait': if (D.tsub[side] >= cmd[1]) next(); return KC.NEUTRAL;
      case 'walkTo': if (f.gapTo(foe) <= cmd[1] || D.tsub[side] > 3) { next(); return KC.NEUTRAL; } return { posture: scr('t'), press: null };
      case 'tech': return f.free() || (f.st === 'tech' && f.ph === 'r') ? tech(cmd[1]) : KC.NEUTRAL;
      case 'react': if (foe.st === 'tech' && foe.ph === 's' && foe.T && foe.T.pts) return tech(cmd[1]); return KC.NEUTRAL;
      case 'land': if (f.grounded() && f.st !== 'tech') next(); return KC.NEUTRAL;
      case 'sync': {   // both strike on the same step: each fires its startup ahead of a shared moment
        if (!D.syncT) { const other = (side ? e.w : e.r)[D.prog[1 - side]]; if (!other || other[0] !== 'sync' || !f.free() || !foe.free()) return KC.NEUTRAL; const S = f.steps(0, KC.TECH[cmd[1]]), So = foe.steps(0, KC.TECH[other[1]]); D.syncS = side ? [So, S] : [S, So]; D.syncT = B.steps + 6 + Math.max(S, So); }
        if (B.steps >= D.syncT - D.syncS[side]) return tech(cmd[1]); return KC.NEUTRAL; }
      case 'feint': return { posture: Math.floor(D.tsub[side] * 2 + side) % 2 ? scr('t') : scr('a'), press: null };
    }
    return KC.NEUTRAL;
  };
  D.hook = B => {
    if (B.phase !== D.phase) { if (B.phase === 'ready') { if (D.phase === 'reset') D.ex++; D.reset(B); } D.phase = B.phase; D.shown[B.phase] = true; }
    if (B.phase === 'fight' && D.tsub[0] > 6 && D.tsub[1] > 6 && D.ex < EX.length - 1) { D.ex++; D.reset(B); }
  };
  return D;
};
