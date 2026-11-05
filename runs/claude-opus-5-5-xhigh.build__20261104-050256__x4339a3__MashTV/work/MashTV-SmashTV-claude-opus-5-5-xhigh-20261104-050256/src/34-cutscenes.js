// ---- cutscenes: the cold open, the endings, the credits (coroutines driving actors and lines; all skippable) ----
const CUT = MT.cut = {};
/** a cosmetic actor (Lance, Penny, a contestant in a cutscene): walks to points, poses */
function actor(rig, x, y, o = {}) {
  const a = { rig, x, y, z: o.z || 0, facing: o.facing === undefined ? Math.PI / 2 : o.facing, vx: 0, vy: 0, pose: null, expr: null, to: null, speed: o.speed || 60, mic: !!o.mic, down: 0, light: o.light, glow: o.glow };
  a.walkTo = (x2, y2) => { a.to = [x2, y2]; };
  a.arrived = () => !a.to;
  a.step = dt => {
    if (a.to) { const dx = a.to[0] - a.x, dy = a.to[1] - a.y, d = Math.hypot(dx, dy); if (d < 2) { a.to = null; a.vx = a.vy = 0; } else { a.vx = dx / d * a.speed; a.vy = dy / d * a.speed; a.x += a.vx * dt; a.y += a.vy * dt; a.facing = Math.atan2(dy, dx); } }
    if (!MT.cfg.skipRigs) a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.to ? a.facing : (a.face !== undefined ? a.face : a.facing), pose: a.pose, expr: a.expr, down: a.down });
  };
  a.draw = (r, t) => {
    r.shadow(a.x, a.y, 7, .5);
    r.actor(a.x, a.y, a.z, (g, ox, oy) => { a.rig.draw(g, ox, oy, r.view); if (a.mic) MT.paint.drawMic(g, r, a.rig); if (a.robot) { const h = a.rig.head(), [hx, hy] = r.w(h.x, h.y, h.z); px.dot(g, hx - 2, hy - 1, '#ff3344'); px.dot(g, hx + 2, hy - 1, '#ff3344'); } }, { xray: true });
    if (a.light) game.lights.add(a.x, a.y, 0, 50, .9, { color: a.light });
  };
  return a;
}
CUT.actor = actor;
/** run a cutscene as an overlay: confirm skips a line, holding confirm (or Start) skips the scene */
CUT.overlay = (gen, done, o = {}) => {
  const co = new Co(gen);
  return { hold: 0, full: !!o.full, update(dt) {
    const nav = UI.nav();
    if (nav.confirm) LINES.skip();
    this.hold = nav.holdConfirm ? this.hold + dt : 0;
    if (this.hold > .7) { co.cancel(); LINES.clear(); }
    co.step(dt);
    return !co.done;
  }, draw(r) { if (this.hold > .1) r.overlay(g => { const w = 60, x = r.W - w - 8, y = r.H - 14; px.rect(g, x, y, w, 4, '#0c0618'); px.rect(g, x, y, Math.round(w * Math.min(1, this.hold / .7)), 4, '#ffcc33'); UI.text(g, 'SKIP', x - 4, y - 2, '#fff7e8', { align: 'right', font: 'tiny' }); }); }, done };
};
const untilQuiet = () => () => !LINES.busy();
/** the cold open: a dark studio, the announcer, Lance walks out, the contestants are introduced */
CUT.coldOpen = function* (w) {
  const P = PLAY, run = MT.run;
  game.lights.ambient = .12; MT.music.play(null); MT.babble.crowd('murmur', .5);
  LINES.say('ANNC', MT.TEXT.seq.coldOpen[0][1], 3);
  yield untilQuiet();
  MT.music.play('theme', { fade: .1 }); MT.banners.show('MASH TV', { color: '#ff2e88', sub: MT.TEXT.ui.sub, dur: 2.2 }); MT.babble.crowd('cheer', 1); MT.babble.crowd('applause', 1); STUDIO.cheerT = 2;
  if (game.particles) for (const x of [40, 328]) for (let i = 0; i < 30; i++) game.particles.add({ kind: 'bit', x, y: 220, z: 4, vx: (x < 184 ? 1 : -1) * Math.random() * 90, vy: -60 - Math.random() * 60, vz: 140 + Math.random() * 90, g: 300, max: 1.8, color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'][i % 4], size: 2 });
  for (let t = 0; t < .8; t += w.lastDt || 1 / 120) { game.lights.ambient = lerp(.12, w.arena.set.ambient, t / .8); yield; }
  const lance = actor(makeLance(1.3), 184, 4, { mic: true, speed: 55, light: '#fff6d0' }); P.extras.push(lance);
  w.arena.doors.N.state = 'open'; w.arena.doors.N.u = 1; w.arena.doors.N.hold = 2;
  lance.walkTo(184, 96); yield () => lance.arrived();
  lance.pose = 'wave'; lance.expr = 'smile';
  LINES.say('LANCE', MT.TEXT.seq.coldOpen[1][1], 3); yield untilQuiet();
  lance.pose = 'hips';
  LINES.say('LANCE', fill(MT.TEXT.seq.coldOpen[2][1], { N: run.contestants.length }), 3); yield untilQuiet();
  for (const c of run.contestants) { LINES.say('C' + (c.slot + 1), c.pr.name + ': ' + MT.TEXT.contestantLines[c.pr.look % 4], 3); yield untilQuiet(); }
  LINES.say('PENNY', MT.TEXT.seq.coldOpen2[0][1], 3); yield untilQuiet();
  lance.pose = 'cheer';
  LINES.say('LANCE', MT.TEXT.seq.coldOpen2[1][1], 3); MT.babble.crowd('cheer', 1); yield untilQuiet();
  lance.pose = null; lance.walkTo(184, -10); w.arena.doors.N.state = 'open'; w.arena.doors.N.u = 1; w.arena.doors.N.hold = 2;
  for (let t = 0; t < 1.5 && !lance.arrived(); t += w.lastDt || 1 / 120) yield;
  E.prune(P.extras, x => x === lance); game.lights.ambient = w.arena.set.ambient;
};
// ------------------------------------------------------------------------------------------------ the ending scene
MT.scenes = MT.scenes || {};
MT.scenes.ending = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [],
  enter(data = {}) {
    this.kind = data.kind || 'a'; this.t = 0; this.card = null; this.credits = -1; this.extras = []; this.dark = 0; this.cook = 0;
    this.world = new World({ room: { id: 'END', name: 'THE FINALE', ep: 3, type: 'cut', exits: {} }, set: this.kind === 'b' ? 'studio' : 'rooftop', run: MT.run });
    game.lights.enabled = true; game.lights.ambient = this.world.arena.set.ambient;
    LINES.clear(); MT.music.play('ending', { fade: .5 });
    if (MT.run) MT.run.ending = this.kind;
    this.co = new Co(data.credits ? this.rollCredits() : this.kind === 'b' ? this.endingB() : this.endingA());
    if (!game.headless) this.world.arena.fitCamera();
  },
  lineup() { const run = MT.run, n = run ? run.contestants.length : 1; const out = []; (run ? run.contestants : []).forEach((c, i) => { const a = actor(makeContestantRig(c.slot, c.pr.look), 184 + (i - (n - 1) / 2) * 30, 230, { speed: 60 }); a.walkTo(a.x, 140); out.push(a); this.extras.push(a); }); return out; },
  *endingA() {
    const cs = this.lineup(); yield 1.6;
    LINES.say('PENNY', MT.TEXT.seq.endingA[0][1], 3); for (const a of cs) { a.pose = 'cheer'; a.expr = 'smile'; a.light = '#fff6d0'; } MT.babble.crowd('cheer', 1); yield untilQuiet();
    const L = actor(makeLance(1.3), 184, 20, { light: '#ff3344' }); L.robot = true; L.pose = 'kneel'; this.extras.push(L); MT.sfx('static'); yield 1;
    L.pose = null; L.mic = true; LINES.say('LANCE', MT.TEXT.seq.endingA[1][1], 3); yield untilQuiet();
    this.card = { text: MT.TEXT.ui.endA, sub: MT.TEXT.ui.endAHint, t: 0 }; yield 4;
    yield* this.rollCredits();
  },
  *endingB() {
    const cs = this.lineup(); yield 1.6;
    LINES.say('ANNC', MT.TEXT.seq.endingB[0][1], 3); yield untilQuiet();
    this.switchOn = true; for (const a of cs) a.walkTo(184 + (a.x - 184) * .4, 108); yield 1.5;
    for (const a of cs) a.pose = 'cast'; yield .6; this.switchFlip = true; MT.sfx('slam'); MT.sfx('bigboom'); for (const a of cs) a.pose = 'cheer';
    LINES.say('ANNC', MT.TEXT.seq.endingB[1][1], 3); MT.babble.crowd('cheer', 1); MT.babble.crowd('applause', 1); STUDIO.cheerT = 4;
    for (let i = 0; i < 6; i++) { this.dark = (i + 1) / 6; MT.sfx('slam', { vol: .4 }); yield .5; }
    yield untilQuiet();
    this.card = { text: MT.TEXT.ui.endB, sub: '', t: 0 }; yield 3.5; this.card = null;
    this.cook = 1; MT.sfx('channel'); LINES.say('LANCE', MT.TEXT.seq.endingB2[0][1], 3); yield untilQuiet(); yield 1; this.cook = 0;
    yield* this.rollCredits();
  },
  *rollCredits() { this.card = null; this.credits = 0; const total = MT.TEXT.credits.length * 14 + 260; while (this.credits < total) { this.credits += 22 * (1 / 120) * (UI.nav().holdConfirm ? 4 : 1); yield; } },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); MT.banners.step(dt);
    for (const a of this.extras) a.step(dt);
    const nav = UI.nav(); if (nav.confirm) LINES.skip();
    if (nav.cancel && this.credits >= 0) this.credits = 1e9;
    this.co.step(dt);
    if (this.card) this.card.t += dt;
    MT.studioStep(dt, this.world);
    game.lights.ambient = lerp(this.world.arena.set.ambient, .08, this.dark);
    if (this.co.done) MT.finishRun();
    if (!game.headless) { this.world.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
  },
  draw(r) {
    const t = game.real;
    this.world.draw(r, t);
    if (this.switchOn) r.queue(184, 92, 0, g => { r.box(g, 172, 86, 0, 196, 98, 14, '#3a3448', '#1a1420'); const [sx, sy] = r.w(184, 92, 18); px.rect(g, sx - 6, sy - 10, 12, 12, '#0c0618'); px.rect(g, sx - 5, sy - 9, 10, 10, this.switchFlip ? '#5a1018' : '#ff3344'); E.font.text(g, this.switchFlip ? 'OFF' : 'ON', sx, sy - 7, '#fff7e8', { align: 'center', outline: false, font: 'tiny' }); }, { occluder: true });
    for (const a of this.extras) a.draw(r, t);
    r.overlay(g => {
      if (this.card) { const k = clamp(this.card.t / .5, 0, 1); px.blend(g, .85 * k, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); UI.title(g, this.card.text, r.W / 2, r.H * .38, r.W > 380 ? 2 : 1); if (this.card.sub) UI.text(g, this.card.sub, r.W / 2, r.H * .38 + 30, '#2ee6ff', { align: 'center' }); }
      if (this.cook) { const w = 150, h = 100, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2; px.rect(g, x - 4, y - 4, w + 8, h + 8, '#5a5468'); px.rect(g, x, y, w, h, '#2a1a10'); UI.text(g, MT.TEXT.ui.channel, x + 4, y + 3, '#ffcc33', { font: 'tiny' }); const lr = MT.portraitRig('LANCE'); if (lr) lr.drawPortrait(g, x + 10, y + 20, 48, { zoom: 3, turn: .4, bg: '#2a1a10' }); px.ell(g, x + 110, y + 70, 26, 10, '#8a8f9a'); px.ell(g, x + 110, y + 66, 22, 7, '#f4e8c8'); UI.text(g, 'MASHED POTATOES', x + w / 2, y + h - 12, '#fff7e8', { align: 'center', font: 'tiny' }); }
      if (this.credits >= 0) { px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); MT.TEXT.credits.forEach((ln, i) => { const y = r.H + 20 + i * 14 - this.credits; if (y > -10 && y < r.H + 10) { if (i === 0) UI.title(g, ln, r.W / 2, y - 6, 2); else UI.text(g, ln, r.W / 2, y, i % 5 === 1 ? '#ffcc33' : '#fff7e8', { align: 'center' }); } }); UI.promptBar(g, r, [['confirm', 'FAST'], ['cancel', 'SKIP']]); }
    });
    HUD.draw(r, this.world, t, { noBugs: true, noWaves: true, noTut: true, noReticle: true, onlyLines: true });
  },
};
/** after a run: each qualifying contestant enters initials, then the table, then the title */
MT.finishRun = () => {
  const run = MT.run; if (!run || run.finished) return; run.finished = true;
  const eligible = run.mode === 'arcade' && !run.devTouched && !MT.devActive();
  const queue = eligible ? run.contestants.filter(c => c.input && !c.devBot && MT.cab.qualifies(c.pr.cash, 'show')).sort((a, b) => b.pr.cash - a.pr.cash) : [];
  if (queue.length) game.go('initials', { queue: queue.map(c => ({ slot: c.slot, cash: c.pr.cash, input: c.input, name: c.pr.name })) });
  else game.go('scores', { after: 'title' });
};
