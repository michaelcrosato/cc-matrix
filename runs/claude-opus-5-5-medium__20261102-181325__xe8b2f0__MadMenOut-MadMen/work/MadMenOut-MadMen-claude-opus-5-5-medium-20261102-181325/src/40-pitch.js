/* MAD MEN OUT — the pitch: the conference room, the client across the table, three slides and the close.
 * Each slide: choose a card (read the client's tell), deliver it on the timing meter (composure widens the window, haze
 * speeds the needle), see how it lands (an angle the client wants lands double, one they fear backfires), pivot out of a
 * bad one with composure. Then the close: a monologue delivered on four beats. Interest past the line wins the account. */
const MULT = { 2: 1.6, 1: 1, 0: .5, '-1': -.6 };
const PT = { ctx: null, phase: 'hello', t: 0, interest: 20, shown: 0, left: [], focus: 0, cur: null, needle: 0, zone: [.4, .6], hit: null, delta: 0,
  wants: null, people: [], reacts: {}, beat: 0, beats: [], beatT: 0, closeHits: [], line: '', lineT: 0, verdict: null, pleased: {}, log: [], dlg: false };
function beginPitch() {
  const D = dayData();
  startPitch({ mode: 'story', client: D.client, deck: S.deck.slice(), composure: S.composure, haze: S.haze, close: D.close, onDone: storyPitchDone, cheat: S.demo, auto: S.demo ? demoPitchAuto : null });
}
function startPitch(ctx) {
  const C = CLIENTS[ctx.client];
  Object.assign(PT, { ctx, phase: 'hello', t: 0, interest: 20, shown: 0, left: ctx.deck.slice(), focus: 0, cur: null, hit: null, delta: 0, verdict: null, log: [], closeHits: [], beat: 0, line: '', lineT: 0, pleased: {}, dlg: false });
  PT.wants = Object.assign({}, C.wants); PT.split = C.split ? JSON.parse(JSON.stringify(C.split)) : null;
  PT.people = C.people.slice(); PT.reacts = {}; PT.people.forEach(p => { PT.reacts[p] = { expr: null, t: 0 }; PT.pleased[p] = 0; });
  PT.composure = ctx.composure !== undefined ? ctx.composure : 70; PT.haze = ctx.haze || 0;
  const rnd = ctx.rng || Math.random, dirs = ['up', 'right', 'down', 'left'];
  PT.beats = Array.from({ length: 4 }, () => dirs[Math.floor(rnd() * 4)]);
  PT.closeLines = ctx.close || ['This isn\'t about ' + C.product + '.', 'It\'s about the person they want to be', 'when nobody is watching,', 'and when everybody is.'];
  game.go('pitch', null, { fade: 'iris', seconds: .5 });
}
const presenter = () => PT.ctx && PT.ctx.presenter || 'jack';
const pInput = () => PT.ctx && PT.ctx.input || game.input;
// how much a card lands with the client (or both clients, averaged)
function landOf(id, deck) {
  const c = CARDS[id], same = deck.filter(d => d !== id && CARDS[d].angle === c.angle).length;
  const power = c.power + (same ? 1 : 0), m = a => MULT[clamp(Math.round(a[c.angle] || 0), -1, 2)];
  if (PT.split) { const ms = Object.keys(PT.split).map(k => m(PT.split[k])); return { power, mult: ms.reduce((a, b) => a + b, 0) / ms.length, per: Object.keys(PT.split).map((k, i) => [k, ms[i]]) }; }
  return { power, mult: m(PT.wants), per: PT.people.map(p => [p, m(PT.wants)]) };
}
function meterWidth() { return clamp(.12 + PT.composure / 100 * .16 + (game.settings.meterAssist ? .1 : 0) + (PT.ctx.cheat ? .3 : 0), .1, .6); }
function setPhase(ph) { PT.phase = ph; PT.t = 0; }
function chooseCard(i) {
  PT.cur = PT.left.splice(i, 1)[0]; PT.focus = 0; A.sfx('card');
  const w = meterWidth(), c = .3 + Math.random() * .4; PT.zone = [c - w / 2, c + w / 2]; PT.needle = 0;
  setPhase('deliver');
}
function deliver() {
  const n = PT.needle, [a, b] = PT.zone, mid = (a + b) / 2, half = (b - a) / 2, d = Math.abs(n - mid);
  PT.hit = d < half * .35 ? 'PERFECT' : d < half ? 'GOOD' : 'FLAT';
  const dm = { PERFECT: 1.3, GOOD: 1, FLAT: .55 }[PT.hit];
  const L_ = landOf(PT.cur, PT.ctx.deck);
  PT.delta = Math.round(L_.power * 8 * L_.mult * dm);
  PT.interest = clamp(PT.interest + PT.delta, 0, 130);
  for (const [p, m] of L_.per) { PT.reacts[p] = { expr: m >= 1 ? 'smile' : m > 0 ? null : 'angry', t: 2 }; if (m >= 1) PT.pleased[p]++; }
  PT.log.push({ card: PT.cur, hit: PT.hit, delta: PT.delta });
  A.sfx(PT.hit === 'PERFECT' ? 'perfect' : PT.hit === 'GOOD' ? 'good' : 'flat');
  if (PT.delta >= 20) { game.flash('#fff0c0', .08, .4); A.sfx('gasp'); }
  if (PT.delta < 0) game.shake(2);
  if (pInput().rumble) pInput().rumble(PT.hit === 'PERFECT' ? .5 : .2, .15);
  setPhase('react');
}
function afterReact() {
  if (PT.delta < 0 && PT.composure >= 25 && !PT.pivoted) { setPhase('pivot'); return; }
  nextSlide();
}
function nextSlide() {
  PT.pivoted = false; PT.cur = null; PT.shown++;
  const C = CLIENTS[PT.ctx.client];
  if (C.turn && PT.shown === C.turn.after && PT.left.length && !PT.turned) {
    PT.turned = true; Object.assign(PT.wants, C.turn.wants);
    PT.dlg = true; say([[C.turn.who, C.turn.line]], () => { PT.dlg = false; setPhase(PT.left.length && PT.shown < 3 ? 'choose' : 'closeIntro'); });
    setPhase('wait'); return;
  }
  setPhase(PT.left.length && PT.shown < 3 ? 'choose' : 'closeIntro');
}
function pivot() {
  PT.composure -= 25; PT.interest = clamp(PT.interest - PT.delta + 4, 0, 130); PT.pivoted = true; A.sfx('whoosh');
  PT.log[PT.log.length - 1].pivot = true;
  PT.dlg = true; say([[presenter(), E.pick(['Forget the slide. Let me tell you what I really think.', 'You\'re right. That\'s what everyone would say. Here\'s what nobody will.', 'Throw that one out. I wanted to see your face when you saw it.'])]], () => { PT.dlg = false; nextSlide(); });
  setPhase('wait');
}
function closeBeat(dir) {
  const due = PT.beatDur, e = PT.beatT - due, ae = Math.abs(e), want = PT.beats[PT.beat];
  let r = 'MISS';
  if (dir === want && ae < .1) r = 'PERFECT'; else if (dir === want && ae < .24) r = 'GOOD';
  PT.closeHits.push(r);
  const add = r === 'PERFECT' ? 4 : r === 'GOOD' ? 2 : 0;
  PT.interest = clamp(PT.interest + add, 0, 130); if (r === 'MISS') PT.composure = Math.max(0, PT.composure - 5);
  A.sfx(r === 'PERFECT' ? 'perfect' : r === 'GOOD' ? 'good' : 'flat', { vol: .7 });
  PT.flashR = { r, t: .6 };
  PT.beat++; PT.beatT = 0;
  if (PT.beat >= PT.beats.length) setPhase('verdict0');
}
function verdict() {
  const C = CLIENTS[PT.ctx.client];
  let bonus = 0;
  if (PT.split && Object.values(PT.pleased).every(v => v >= 1)) { bonus = 8; PT.bothNod = true; }
  PT.interest = clamp(PT.interest + bonus, 0, 130);
  const won = PT.interest >= C.need;
  const billings = won ? Math.round(C.value * clamp(PT.interest / 100, .6, 1.25) / 1000) * 1000 : 0;
  PT.verdict = { won, interest: PT.interest, need: C.need, billings, bonus };
  PT.people.forEach(p => PT.reacts[p] = { expr: won ? 'smile' : 'angry', t: 99 });
  music(won ? 'win' : 'lose');
  if (won) { A.sfx('applause'); game.flash('#fff4d0', .12, .5); for (let i = 0; i < 3; i++) game.after(i * .25, () => P.glints(19.5 * T, 3 * T, 30, 14, '#ffe08a')); }
  PT.dlg = true;
  say([[PT.people[0], won ? C.yes : C.no]], () => { PT.dlg = false; });
  setPhase('verdict');
}

/* ---- where everyone stands: the client(s) across the table, the presenter at the easel, colleagues at the end ---- */
function pitchCast() {
  const out = [], n = PT.people.length;
  PT.people.forEach((p, i) => out.push({ id: p, x: (19.5 + (i - (n - 1) / 2) * 3.4) * T, y: 3.25 * T, face: Math.PI / 2 }));
  out.push({ id: presenter(), x: 25.2 * T, y: 4.4 * T, face: Math.PI, me: true });
  if (PT.ctx.mode === 'story') { out.push({ id: 'monty', x: 13.6 * T, y: 4 * T, face: 0 }); if (S.rapport.ruth >= 0) out.push({ id: 'ruth', x: 13.8 * T, y: 6.6 * T, face: -.3 }); }
  if (PT.ctx.mode === 'versus') out.push({ id: PT.ctx.rival, x: 13.6 * T, y: 4.4 * T, face: 0 });
  return out;
}
const pitchScene = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'brawler', 'iso'], input: KEYS, res: 'ps1', touch: [],
  camera: { zoom: [.75, 2], start: 1.05 },
  enter() {
    buildOffice(); game.follow(null); game.cam.bounds = null;
    L.enabled = true; L.ambient = .5;
    music('pitch'); PT.cast = pitchCast();
    const C = CLIENTS[PT.ctx.client];
    PT.dlg = true;
    game.after(.5, () => say(C.hello.map((t, i) => [PT.people[Math.min(i, PT.people.length - 1)], t]), () => { PT.dlg = false; setPhase(PT.left.length ? 'choose' : 'closeIntro'); }));
  },
  exit() { talk.close(); },
  update(dt) {
    const I = pInput(), ctx = PT.ctx;
    PT.t += dt;
    game.focus(19.6 * T, 3.4 * T, 8);
    if (game.input.pressed('view') && !talk.open) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (PT.flashR) { PT.flashR.t -= dt; if (PT.flashR.t <= 0) PT.flashR = null; }
    for (const c of PT.cast) {
      const rx = PT.reacts[c.id], talking = talk.open && talk.portrait === rigOf(c.id) && talk.typing;
      if (rx) rx.t -= dt;
      let pose = null, expr = rx && rx.t > 0 ? rx.expr : null;
      if (c.me) pose = PT.phase === 'deliver' ? 'cast' : PT.phase === 'close' ? (PT.beat % 2 ? 'wave' : 'cast') : PT.phase === 'verdict' && PT.verdict && PT.verdict.won ? 'cheer' : talking ? 'wave' : 'hips';
      else if (talking) pose = 'wave';
      else if (PT.phase === 'verdict' && PT.verdict && PT.verdict.won && (c.id === 'monty' || c.id === 'ruth')) pose = 'cheer';
      rigOf(c.id).update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.face, pose, expr: expr || (talking ? 'smile' : null) });
    }
    if (talk.update(dt)) { speak(talk); return; }
    speak(talk);
    if (PT.dlg) return;
    if (ctx.auto) ctx.auto(dt);
    const ph = PT.phase;
    if (ph === 'choose') {
      const n = PT.left.length;
      if (I.repeat('right')) { PT.focus = (PT.focus + 1) % n; A.sfx('blip', { vol: .4 }); }
      if (I.repeat('left')) { PT.focus = (PT.focus + n - 1) % n; A.sfx('blip', { vol: .4 }); }
      const p = I.pointer && I.pointer(), c = I.clicked && I.clicked(), boxes = PT.cardBoxes || [];
      if (p && I.lastDevice === 'mouse') boxes.forEach((b, i) => { if (hitRect(p, ...b)) PT.focus = i; });
      if (c) boxes.forEach((b, i) => { if (hitRect(c, ...b)) { PT.focus = i; chooseCard(i); } });
      if (PT.phase === 'choose' && I.pressed('confirm')) { I.consumeAll(); chooseCard(PT.focus); }
    } else if (ph === 'deliver') {
      const sp = (.75 + .28 * PT.haze) * (ctx.cheat ? .6 : 1);
      const u = (PT.t * sp) % 2; PT.needle = u < 1 ? u : 2 - u;
      if (Math.floor(PT.t * sp * 2) !== PT._tick) { PT._tick = Math.floor(PT.t * sp * 2); A.sfx('needle', { vol: .3 }); }
      if (PT.t > .25 && (I.pressed('confirm') || (I.clicked && I.clicked()))) { I.consumeAll(); deliver(); }
      else if (PT.t > 12) { PT.needle = 0; deliver(); }
    } else if (ph === 'react') { if (PT.t > 1.8 || (PT.t > .5 && I.pressed('confirm'))) { I.consumeAll(); afterReact(); } }
    else if (ph === 'pivot') {
      const c = I.clicked && I.clicked();
      if (I.pressed('pivot') || (c && PT.pivotBox && hitRect(c, ...PT.pivotBox[0]))) { I.consumeAll(); pivot(); }
      else if (I.pressed('confirm') || (c && PT.pivotBox && hitRect(c, ...PT.pivotBox[1])) || PT.t > 6) { I.consumeAll(); nextSlide(); }
    } else if (ph === 'closeIntro') { if (PT.t > 1.4) { setPhase('close'); PT.beat = 0; PT.beatT = 0; PT.beatDur = 1.15 / (1 + .15 * PT.haze); } }
    else if (ph === 'close') {
      PT.beatT += dt;
      const dirs = ['up', 'right', 'down', 'left'];
      for (const d of dirs) if (I.pressed(d) && PT.beatT > .25) { closeBeat(d); break; }
      if (PT.phase === 'close' && PT.beatT > PT.beatDur + .32) closeBeat(null);
    } else if (ph === 'verdict0') { if (PT.t > .8) verdict(); }
    else if (ph === 'verdict') { if (PT.t > 1.5 && (I.pressed('confirm') || (I.clicked && I.clicked()) || (ctx.auto && PT.t > 3.5))) { I.consumeAll(); setPhase('done'); ctx.onDone(PT.verdict, PT); } }
  },
  draw(r) {
    const M = OFF.map; M.drawFloor(r); M.queueWalls(r); drawFurniture(r);
    // the room dims for the pitch; a slide projector's warm beam lights the easel, the window the clients
    L.add(26.2 * T, 3.4 * T, 20, 70, .9, { color: '#fff0c8' }); L.add(19.5 * T, 3 * T, 30, 110, .55, { color: '#d8e4ff' }); L.add(19.5 * T, 6 * T, 20, 80, .35, { color: '#ffe0b0' });
    for (const c of PT.cast) { r.shadow(c.x, c.y, 6, .35, '#120a18'); r.actor(c.x, c.y, 0, (g, ox, oy) => rigOf(c.id).draw(g, ox, oy, r.view)); }
    r.overlay(g => drawPitchHud(g, r));
    talk.draw(r);
  }
};

/* ---- the slide on the easel, drawn big over the scene: an icon for its angle and its line ---- */
function drawIcon(g, angle, cx, cy, s) {
  const col = ANGLES[angle].color, T5 = E.tones(col);
  if (angle === 'DESIRE') { px.ell(g, cx - 5 * s, cy, 6 * s, 3.4 * s, T5.base); px.ell(g, cx + 5 * s, cy, 6 * s, 3.4 * s, T5.base); px.ell(g, cx, cy + 2 * s, 9 * s, 3 * s, T5.sh); px.rect(g, cx - 9 * s, cy, 18 * s, 1, T5.deep); px.ell(g, cx - 3 * s, cy - 1.5 * s, 2 * s, 1 * s, T5.hi); }
  else if (angle === 'STATUS') { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i & 1 ? 4.5 : 11) * s; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } px.poly(g, pts, T5.base); px.poly(g, pts.slice(0, 4).concat([[cx, cy]]), T5.lt); }
  else if (angle === 'NOSTALGIA') { px.poly(g, [[cx - 11 * s, cy], [cx, cy - 10 * s], [cx + 11 * s, cy]], T5.sh); px.rect(g, cx - 8 * s, cy, 16 * s, 9 * s, T5.base); px.rect(g, cx - 2 * s, cy + 3 * s, 4 * s, 6 * s, T5.deep); px.rect(g, cx + 4 * s, cy + 2 * s, 3 * s, 3 * s, '#ffe8a0'); }
  else if (angle === 'SAFETY') { px.poly(g, [[cx - 9 * s, cy - 9 * s], [cx + 9 * s, cy - 9 * s], [cx + 8 * s, cy + 2 * s], [cx, cy + 10 * s], [cx - 8 * s, cy + 2 * s]], T5.base); px.poly(g, [[cx - 9 * s, cy - 9 * s], [cx, cy - 9 * s], [cx, cy + 10 * s], [cx - 8 * s, cy + 2 * s]], T5.lt); }
  else { px.rect(g, cx - 13 * s, cy + 2 * s, 26 * s, 8 * s, '#6a8a5a'); px.poly(g, [[cx - 2 * s, cy + 2 * s], [cx + 2 * s, cy + 2 * s], [cx + 9 * s, cy + 10 * s], [cx - 9 * s, cy + 10 * s]], '#3a3a40'); px.rect(g, cx - .5 * s, cy + 5 * s, 1 * s, 2 * s, '#f4e8a0'); px.disc(g, cx + 6 * s, cy - 4 * s, 4 * s, T5.hi); }
}
function drawSlide(g, x, y, w, h, id) {
  const c = CARDS[id], A_ = ANGLES[c.angle];
  panel(g, x, y, w, h, { bg: ['#f8f2e0', '#e4d8bc'], border: '#2a2018' });
  px.rect(g, x + 4, y + 4, w - 8, h * .55, A_.dark);
  drawIcon(g, c.angle, x + w / 2, y + 4 + h * .27, Math.max(1, Math.round(h / 60)));
  E.font.text(g, c.line, x + w / 2, y + h * .62 + 3, '#1a120c', { outline: false, align: 'center', wrap: w - 12 });
}
function drawPitchHud(g, r) {
  const C = CLIENTS[PT.ctx.client], I = pInput(), W = r.W, H = r.H;
  // interest: a long bar with the client's line marked
  const bw = Math.min(260, W - 140), bx = Math.round((W - bw) / 2), by = 8;
  panel(g, bx - 6, by - 4, bw + 12, 26, { alpha: .9 });
  const f = clamp(PT.interest / 100, 0, 1.3) / 1.3, need = C.need / 130;
  E.ui.bar(g, bx, by + 10, bw, 7, f, PT.interest >= C.need ? '#70c878' : '#e8c36a');
  px.rect(g, bx + Math.round(bw * need), by + 7, 1, 13, '#ffffff');
  txt(g, 'INTEREST ' + Math.round(PT.interest), bx, by, COL.ink, { font: 'tiny' });
  txt(g, 'TO WIN ' + C.need, bx + Math.round(bw * need), by, '#ffffff', { font: 'tiny', align: 'center' });
  txt(g, C.company.toUpperCase(), bx + bw, by, COL.gold, { font: 'tiny', align: 'right' });
  // the presenter's composure and haze
  panel(g, 6, 6, 72, 30, { alpha: .85 });
  txt(g, PT.ctx.label || 'COMPOSURE', 11, 10, PT.ctx.color || COL.dim, { font: 'tiny' }); E.ui.bar(g, 11, 18, 62, 5, PT.composure / 100, PT.composure < 30 ? '#d8483a' : '#5ab0a8');
  txt(g, 'HAZE ' + (PT.haze ? '•'.repeat(PT.haze) : '-') + '  SLIDE ' + Math.min(3, PT.shown + (PT.cur ? 1 : 0)) + '/' + Math.min(3, PT.ctx.deck.length), 11, 27, COL.dim, { font: 'tiny' });
  const ph = PT.phase, sw = Math.min(150, W * .36), sh = Math.round(sw * .62), sx = 10, sy = 44;
  if (ph === 'choose') {
    const n = PT.left.length, cw = 100, ch = 76, x0 = Math.round((W - (n * (cw + 8) - 8)) / 2), y0 = H - ch - 30;
    if (game.settings.tells && C.tells) { const tl = C.tells[PT.shown % C.tells.length], lines = wrap(tl, W - 60).length, th = lines * 10 + 8; panel(g, 20, y0 - th - 10, W - 40, th, { alpha: .88 }); txt(g, tl, W / 2, y0 - th - 5, '#c8e0ff', { align: 'center', wrap: W - 60 }); }
    PT.cardBoxes = PT.left.map((id, i) => [x0 + i * (cw + 8), y0 - (PT.focus === i ? 6 : 0), cw, ch]);
    PT.left.forEach((id, i) => drawCard(g, ...PT.cardBoxes[i].slice(0, 2), id, { w: cw, h: ch, focus: PT.focus === i, full: true }));
    txt(g, 'Present a slide:  ' + (I.lastDevice === 'mouse' ? 'click a card' : keyOf(I, 'left') + ' ' + keyOf(I, 'right') + ' choose  ' + keyOf(I, 'confirm') + ' present'), W / 2, H - 22, COL.ink, { align: 'center' });
  }
  if (PT.cur && (ph === 'deliver' || ph === 'react' || ph === 'pivot' || ph === 'wait')) drawSlide(g, sx, sy, sw, sh, PT.cur);
  if (ph === 'deliver') {
    const mw = Math.min(240, W - 60), mx = Math.round((W - mw) / 2), my = H - 46;
    panel(g, mx - 8, my - 16, mw + 16, 40, { alpha: .92 });
    txt(g, 'DELIVER IT:  ' + (I.lastDevice === 'mouse' ? 'click' : keyOf(I, 'confirm')) + ' in the gold', W / 2, my - 11, COL.ink, { align: 'center' });
    px.rect(g, mx, my, mw, 10, '#2a2018');
    const z0 = Math.round(mx + mw * PT.zone[0]), z1 = Math.round(mx + mw * PT.zone[1]), mid = (z0 + z1) / 2, pw = (z1 - z0) * .35;
    px.rect(g, z0, my, z1 - z0, 10, '#b08a3a'); px.rect(g, Math.round(mid - pw / 2), my, Math.max(2, Math.round(pw)), 10, '#ffe08a');
    const nx = Math.round(mx + mw * PT.needle); px.rect(g, nx - 1, my - 3, 3, 16, '#ffffff'); px.rect(g, nx, my - 3, 1, 16, '#d8483a');
    if (PT.haze) txt(g, 'haze: the needle swings faster', W / 2, my + 14, '#e8a060', { align: 'center', font: 'tiny' });
  }
  if (ph === 'react' || ph === 'pivot') {
    const c = PT.hit === 'PERFECT' ? '#ffe08a' : PT.hit === 'GOOD' ? '#c8e0ff' : '#ff9a7a';
    E.font.title(g, PT.hit, sx + sw / 2, sy + sh + 6, { align: 'center', scale: 2, colors: [c, c, '#5a4a3a'], depth: 1 });
    const L_ = landOf(PT.cur, PT.ctx.deck), what = L_.mult >= 1.5 ? 'It lands. It really lands.' : L_.mult >= 1 ? 'They nod.' : L_.mult > 0 ? 'Polite interest.' : 'A chill crosses the table.';
    panel(g, sx, sy + sh + 24, sw, 26, { alpha: .9 }); txt(g, what, sx + sw / 2, sy + sh + 28, COL.ink, { align: 'center' }); txt(g, (PT.delta >= 0 ? '+' : '') + PT.delta + ' interest', sx + sw / 2, sy + sh + 38, PT.delta < 0 ? '#ff9a7a' : '#a8e0a8', { align: 'center' });
    if (ph === 'pivot') {
      const bw2 = 150, y = H - 44, x1 = Math.round(W / 2 - bw2 - 6), x2 = Math.round(W / 2 + 6);
      PT.pivotBox = [[x1, y, bw2, 20], [x2, y, bw2, 20]];
      panel(g, x1, y, bw2, 20, { bg: ['#e8c36a', '#b08a3a'], border: '#ffffff' }); txt(g, keyOf(I, 'pivot') + '  PIVOT (-25 composure)', x1 + bw2 / 2, y + 7, '#1a120c', { align: 'center', shadow: false });
      panel(g, x2, y, bw2, 20); txt(g, keyOf(I, 'confirm') + '  LET IT RIDE', x2 + bw2 / 2, y + 7, COL.ink, { align: 'center' });
    }
  }
  if (ph === 'closeIntro' || ph === 'close' || ph === 'verdict0') {
    E.font.title(g, 'THE CLOSE', W / 2, 40, { align: 'center', scale: 2, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
    const i = Math.min(PT.beat, PT.closeLines.length - 1), line = ph === 'closeIntro' ? 'Put the boards down. Look them in the eye.' : PT.closeLines[i] || '';
    panel(g, 20, 62, W - 40, 22, { alpha: .9 }); txt(g, '"' + line + '"', W / 2, 69, COL.ink, { align: 'center', wrap: W - 56 });
    if (ph === 'close' && PT.beat < PT.beats.length) {
      const cx = Math.round(W / 2), cy = Math.round(H - 70), u = PT.beatT / PT.beatDur, rad = Math.max(10, Math.round(40 - 28 * Math.min(u, 1.15)));
      r.glowDisc(g, cx, cy, 30, '#e8c36a', .25);
      for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(t) * rad), Math.round(cy + Math.sin(t) * rad), u > .85 && u < 1.15 ? '#ffffff' : '#e8c36a'); }
      for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(t) * 12), Math.round(cy + Math.sin(t) * 12), '#8a6a3a'); }
      const d = PT.beats[PT.beat], glyph = { up: '↑', down: '↓', left: '←', right: '→' }[d];
      E.font.text(g, glyph, cx, cy - 7, '#ffffff', { align: 'center', scale: 2, outline: '#1a120c' });
      txt(g, (I.lastDevice === 'gamepad' ? 'D-pad / stick ' : 'Arrows / WASD ') + glyph + ' as the ring meets the circle', cx, cy + 46, COL.ink, { align: 'center' });
      PT.closeHits.forEach((h, k) => txt(g, h === 'MISS' ? '×' : h === 'PERFECT' ? '★' : '•', cx - 24 + k * 16, cy + 30, h === 'MISS' ? '#ff7a6a' : '#ffe08a', { align: 'center' }));
    }
    if (PT.flashR) txt(g, PT.flashR.r, W / 2, H - 120, PT.flashR.r === 'MISS' ? '#ff7a6a' : '#ffe08a', { align: 'center', scale: 2 });
  }
  if (ph === 'verdict' && PT.verdict) {
    const v = PT.verdict, pw = Math.min(260, W - 40), px0 = Math.round((W - pw) / 2), py = 44;
    panel(g, px0, py, pw, 92, { alpha: .95 });
    E.font.title(g, v.won ? 'ACCOUNT WON' : 'ACCOUNT LOST', W / 2, py + 8, { align: 'center', scale: 2, colors: v.won ? ['#fff6d8', '#e8c36a', '#8a5a20'] : ['#ffd0c8', '#d8483a', '#5a1a1a'], depth: 2 });
    txt(g, 'Interest ' + v.interest + ' of ' + v.need + ' needed' + (v.bonus ? '  (+' + v.bonus + ': both nodded)' : ''), W / 2, py + 34, COL.ink, { align: 'center' });
    txt(g, v.won ? 'Annual billings: ' + money(v.billings) : 'Billings: nothing. The account walks out the door.', W / 2, py + 48, v.won ? '#70c878' : '#ff9a7a', { align: 'center' });
    txt(g, PT.log.map(l => ANGLES[CARDS[l.card].angle].icon + ' ' + l.hit.toLowerCase() + (l.pivot ? ' (pivot)' : '')).join('   ') + '   close ' + PT.closeHits.filter(h => h !== 'MISS').length + '/4', W / 2, py + 62, COL.dim, { align: 'center' });
    if (PT.t > 1.5 && !talk.open) txt(g, (I.lastDevice === 'mouse' ? 'Click' : keyOf(I, 'confirm')) + ' continue', W / 2, py + 76, COL.ink, { align: 'center' });
  }
}
function storyPitchDone(v) {
  const D = dayData(), C = CLIENTS[D.client];
  S.results.push({ day: S.day, client: D.client, company: C.company, won: v.won, interest: v.interest, billings: v.billings });
  if (v.won) { S.won.push(D.client); S.billings += v.billings; }
  S.composure = PT.composure; S.haze = PT.haze;
  goEvening(D.evening, v);
}
