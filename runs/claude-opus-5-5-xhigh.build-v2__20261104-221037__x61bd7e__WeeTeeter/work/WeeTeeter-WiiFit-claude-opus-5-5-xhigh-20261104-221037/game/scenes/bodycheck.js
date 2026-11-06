/* scenes/bodycheck.js: the morning ritual, about 50 s. Step onto Tare, Stillness Test, Lean Test, one Silly Question, the
 * Reading in ducks, Spine Age, today's Suggestion. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game, lib = G.lib;
const txt = (...a) => G.txt(...a);
const BC = G.BodyCheck = {
  LEAN: [[0, .6, 'Forward'], [.6, 0, 'Right'], [0, -.6, 'Back'], [-.6, 0, 'Left']],
  make(o = {}) {
    const c = { step: 'on', t: 0, bal: new G.Balance(G.DATA.bodyCheck.set, E.rng(777 + (G.S.day || 1))), tare: new G.TareBody(0, 4), rig: o.rig || G.playerRig({ size: 2 }), intent: G.newIntent(), reader: o.bot ? null : new G.DeviceReader(game.input), brain: o.bot ? new G.BotBrain(o.bot, E.rng(5)) : null, leanI: 0, held: 0, still: 0, ducks: 8 + E.rng(G.S.day * 91 + 7)() * 6, question: null, short: !!o.short, demo: !!o.demo, age: G.spineShownFor ? G.spineShown() : 71 };
    c.poser = new G.Poser(c.rig); c.tare.scale = 2.2; c.rig.hop = 0; c.bal.cheat = !!o.bot;
    return c;
  },
  stepRig(c, dt, tilt) { const k = c.rig; c.poser.clip('Idle_Subtle', { loop: true, tgt: 1.4 }); c.poser.update(dt); k.wob = tilt ? [c.bal.x, c.bal.y] : [0, 0]; const z = c.onZ === undefined ? 12 : c.onZ; k.update(dt, { x: c.rigX || 0, y: 4, z, vx: 0, vy: 0, facing: c.poser.facing, expr: c.bal.inRing ? 'smile' : undefined }); },
  /** one run of the stillness and lean tests; returns true when both are done */
  tests(c, dt) {
    const b = c.bal;
    if (c.brain) { const u = c.brain.hold(dt, b, b.ringX, b.ringY); c.intent.x = u[0]; c.intent.y = u[1]; } else c.reader.read(dt, c.intent);
    b.step(dt, c.intent.x, c.intent.y); G.dbg.lean = [+b.x.toFixed(3), +b.y.toFixed(3)]; G.dbg.source = c.intent.source;
    if (b.inRing && b.streak > .4 && !c.demo) { c.chime = (c.chime || 0) - dt; if (c.chime <= 0) { c.ch = (c.ch || 0) + 1; G.chime(Math.min(10, c.ch)); c.chime = .8; } }
    if (c.step === 'still') { c.t += dt; if (b.inRing) c.still += dt; if (c.t >= 5) { c.step = 'lean'; c.t = 0; c.leanI = 0; c.held = 0; b.set.R = .22; G.A.sfx('ok'); const q = BC.LEAN[0]; b.ringX = q[0]; b.ringY = q[1]; G.mutter('tare', G.line('tare.leanTest'), { auto: 2.2, attract: true, y: 50 }); } return false; }
    if (c.step === 'lean') { c.t += dt; if (b.inRing) c.held += dt; if (c.held >= 1 || c.t > 5) { c.leanI++; c.held = 0; c.t = 0; G.chime(c.leanI * 2); if (c.leanI >= BC.LEAN.length) { b.ringX = b.ringY = 0; return true; } const q = BC.LEAN[c.leanI]; b.ringX = q[0]; b.ringY = q[1]; } return false; }
    return false;
  },
  hudTests(g, c) {
    const W = game.W, H = game.H, b = c.bal;
    G.drawPlate(g, b, { x: W / 2, y: H - 40, r: 34, ring: [b.ringX, b.ringY, b.R], color: '#ff7a59' });
    if (c.step === 'still') { G.panel(g, W / 2 - 80, 8, 160, 34, { r: 8 }); txt(g, 'Stillness Test', W / 2, 12, '#14a8c8', { align: 'center' }); E.ui.bar(g, W / 2 - 66, 26, 132, 8, c.t / 5, '#2cc6e6', { bg: '#e8f0f2' }); }
    if (c.step === 'lean') { const q = BC.LEAN[c.leanI] || BC.LEAN[3]; G.panel(g, W / 2 - 80, 8, 160, 34, { r: 8 }); txt(g, 'Lean: ' + q[2], W / 2, 12, '#14a8c8', { align: 'center' }); E.ui.bar(g, W / 2 - 66, 26, 132, 8, c.held, '#7fe0c3', { bg: '#e8f0f2' }); }
    G.prompts(g, [['lean', 'Lean']]);
  },
  drawStage(r, c) {
    G.ROOMS.reception(r, { dusk: false });
    G.drawMat(r, 0, 4, 46, 12, '#bfeee0');
    c.tare.draw(r, { scale: 2.2 });
    r.queue(0, 5, 0, g => {}, {});
    G.drawRig(r, c.rig, c.rigX || 0, 4, c.onZ === undefined ? 12 : c.onZ, { noShadow: true });
  }
};
let c = null, pills = null, stage = 0, big = 0, t = 0;
BC.live = () => c;
function next(step) { c.step = step; c.t = 0; t = 0;
  if (step === 'still') { c.bal.set.R = .2; c.bal.inRingT = 0; c.bal.totalT = 0; G.mutter('tare', G.line('tare.still'), { auto: 2.5, y: 50 }); }
  if (step === 'question') { const qs = G.DATA.lines.questions, q = qs[(G.S.day + (G.S.runs | 0)) % qs.length]; c.question = q; G.say('tare', [G.line('tare.leanPraise'), q.q], { face: 'neutral', choices: q.a, onChoice(i) { G.say('tare', q.r[i], { face: 'smug', onDone() { next('reading'); } }); } }); }
  if (step === 'reading') { const d = c.ducks.toFixed(1); G.A.sfx('tareBoop'); G.say('tare', G.line('reading', { d }), { face: 'judging', onDone() { next('spine'); } }); }
  if (step === 'spine') { const s = G.S, row = G.DATA.dayOf(s.day), prev = s.history[s.history.length - 1], now = G.spineShown(); c.prev = prev; c.now = now; big = prev;
    let line;
    if (row.hold) line = G.line('tare.plateau');
    else if (row.catchUp && now < prev) line = G.line('tare.catchup');
    else if (now < prev) line = 'Your Spine Age is ' + now + '. ' + G.line('tare.spineDown');
    else if (now >= 71) line = G.DATA.lines.tare.spineTop;
    else line = 'Your Spine Age is ' + now + '. ' + G.line('tare.spineSame');
    if (s.day === 1) line = 'Your Spine Age is ' + now + ". " + G.line('tare.number');
    c.line = line; game.after(1.3, () => { if (c.step === 'spine') { if (now !== prev) G.A.sfx('stamp'); G.say('tare', line, { face: row.hold ? 'sad' : now < prev ? 'happy' : 'neutral', onDone() { c.lineDone = true; } }); } });
    pills = new G.Pills(['Continue'], { y: () => game.H - 34, w: 120, h: 20, onPick() { next('suggest'); } }); pills.enabled = false; }
  if (step === 'suggest') {
    const s = G.S, open = G.order.filter(id => G.activityOpen(id)), pool = open.filter(id => (s.best[id] ? G.bestStars(id) : 0) < 3), list = pool.length ? pool : open, pick = list[(s.day * 7 + (s.runs | 0)) % list.length]; s.suggestion = pick; s.checked = true;
    const nm = G.activities[pick].name; const tip = game.settings.tips && s.day > 1 ? G.line('tare.tips') : null; const lines = [G.line('tare.suggest', { a: nm })]; if (tip) lines.push(tip);
    G.say('tare', lines, { face: 'happy', onDone() { G.Save.save(); G.startDay(); } });
  }
}
G.scenes.bodycheck = {
  view: 'brawler', camera: { zoom: false }, pausable: true,
  enter(d) {
    const s = G.S; if (d && d.day) { s.day = d.day; s.checked = false; } G.dbg.activity = null;
    G.talk.close(); G.setDayLight('morning'); G.music('studio'); c = BC.make({ short: !!G.DATA.dayOf(s.day).shortCheck }); c.step = 'on'; c.onZ = 0; c.rigX = -56; t = 0; c.lineDone = false; pills = null;
    const last = s.lastSeen ? Math.floor((Date.now() - s.lastSeen) / 86400000) : 0;
    const hello = s.day === 1 && !s.seen.first ? (s.seen.first = 1, G.DATA.lines.tare.first[1]) : last >= 2 ? G.line('tare.absent', { n: last }) : G.DATA.dayOf(s.day).games ? G.line('tare.day5') : G.line('tare.hello');
    c.hello = hello; G.say('tare', hello, { face: 'happy', onDone() { c.greeted = true; } });
  },
  update(dt) {
    G.stageCam(30, 8); c.tare.update(dt); t += dt;
    const talk = G.talk.update(dt);
    if (c.step === 'on') { BC.stepRig(c, dt); if (c.greeted) { c.t += dt; const k = clamp(c.t / .7, 0, 1); c.rigX = -56 * (1 - k); c.onZ = Math.sin(k * Math.PI) * 26 + k * 12; if (k >= 1) { c.tare.boop(); G.grunt('member'); if (c.short) next('reading'); else next('still'); } } return; }
    if (talk) { BC.stepRig(c, dt); return; }
    if (c.step === 'still' || c.step === 'lean') { BC.stepRig(c, dt, true); if (BC.tests(c, dt)) next('question'); return; }
    if (c.step === 'spine') { BC.stepRig(c, dt); if (t > .4) big += (c.now - big) * Math.min(1, dt * 2.5); if (c.lineDone) { pills.enabled = true; pills.update(dt); } return; }
    BC.stepRig(c, dt);
  },
  draw(r) {
    BC.drawStage(r, c);
    r.overlay(g => {
      if (c.step === 'still' || c.step === 'lean') BC.hudTests(g, c);
      if (c.step === 'reading' || c.step === 'question') { }
      if (c.step === 'reading') { const n = Math.round(c.ducks), W = game.W; for (let i = 0; i < n; i++) { const x = W / 2 - (n - 1) * 9 + i * 18, y = 58 + Math.sin(game.real * 3 + i) * 2; px.ell(g, x, y, 7, 5, '#ffd166'); px.disc(g, x + 5, y - 6, 4, '#ffd166'); px.rect(g, x + 8, y - 6, 4, 2, '#ff9a3a'); px.dot(g, x + 6, y - 7, '#20404c'); } }
      if (c.step === 'spine' || c.step === 'suggest') {
        const W = game.W, H = game.H, cw = Math.min(330, W - 24), s = G.S, x0 = (W - cw) / 2, y0 = 12;
        G.panel(g, x0, y0, cw, 118, { r: 8 });
        txt(g, 'Spine Age', x0 + 62, y0 + 8, '#5f7f8a', { align: 'center' });
        txt(g, Math.round(big), x0 + 62, y0 + 26, '#ff7a59', { align: 'center', scale: 5, shadow: '#ffd8cc' });
        txt(g, 'Gertrude: 19', x0 + 62, y0 + 90, '#b08be0', { align: 'center' });
        G.drawAgeGraph(g, x0 + 122, y0 + 16, cw - 200, 78, s.history.concat(c.step === 'spine' ? [c.now] : [G.spineShown()]));
        const scores = G.DISCIPLINES.map(G.disciplineScore); G.drawFlower(g, x0 + cw - 38, y0 + 54, 32, scores);
        if (pills && pills.enabled && c.step === 'spine' && !G.talk.open) pills.draw(g);
      }
      if (!G.talk.open) G.drawDayHudMini(g);
    });
    G.talk.draw(r);
  }
};
G.drawDayHudMini = g => { const s = G.S, day = G.DATA.dayOf(s.day); G.panel(g, 8, 8, 72, 28, { r: 7 }); txt(g, 'Day ' + s.day, 14, 12, '#14a8c8'); txt(g, day.name.length > 11 ? day.name.slice(0, 11) : day.name, 14, 22, '#5f7f8a'); };
})();
