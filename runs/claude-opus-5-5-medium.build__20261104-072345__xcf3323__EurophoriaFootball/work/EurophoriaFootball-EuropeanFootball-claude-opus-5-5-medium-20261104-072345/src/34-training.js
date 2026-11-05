/* 34-training: nine drills at Kipperton Rec (registry 'drill'). Each step: Mags (or Sandra for defending) says what to
 * do, then the drill runs with a counter on the HUD until its goal is met. Dummies are footballers that stand, walk or
 * press. A drill's last step completes it (saved). */
const ev_ = (type, count, where) => ({ type, count, where });
const isGoal = kind => (m, e) => e.type === 'goal' && e.side === 0 && (!kind || [].concat(kind).includes(e.kind));
EF.def('drill', 'move', { n: 1, title: 'ON YOUR MARKS', coach: 'mags', teaches: 'Run, sprint, stamina', dummies: 'gone', mates: 0,
  steps: [
    { say: 'Weave through the six cones. In order. The flashing one.', cones: true, goal: (m, st) => st.cone >= 6, label: st => 'CONES ' + (st.cone || 0) + '/6' },
    { say: 'Now SPRINT down the straight. Hold sprint. Feel the wind in your hair, Darren.', goal: (m, st, f) => { if (f.sprinting) st.sp = (st.sp || 0) + 1 / 120; return st.sp > 2; }, label: st => 'SPRINT ' + Math.min(2, st.sp || 0).toFixed(1) + '/2.0 S' },
    { say: 'Puffed out? Stand still and get your breath back. Stamina comes back when you stop sprinting.', start: m => { m.slots[0].f.stamina = 20; }, goal: (m, st, f) => f.stamina >= 90, label: (st, m) => 'STAMINA ' + Math.round(m.slots[0].f.stamina) + '/90' }] });
EF.def('drill', 'passing', { n: 2, title: 'PASS MASTER', coach: 'mags', teaches: 'Pass, through ball, one-two', dummies: 'static', mates: 3,
  steps: [
    { say: 'Five passes to your teammates. Point the stick at who you want. Feet, not faces.', count: ev_('passDone', 5) },
    { say: 'Now two through balls into space. Let your forward run onto it.', count: ev_('passDone', 2, e => e.kind === 'through') },
    { say: 'One-two. Hold switch and pass, then run. The ball comes back to you.', count: ev_('oneTwo', 1) }] });
EF.def('drill', 'shooting', { n: 3, title: 'HIT THE TARGET', coach: 'mags', teaches: 'Power, aim, the sweet spot, curl, the chip', dummies: 'keeper', mates: 0,
  steps: [
    { say: 'Hold shoot to fill the meter, let go to hit it. Aim with the stick, up or down the screen. Score in the corners: four times.', count: ev_('goal', 4, e => e.corner), label: st => 'CORNERS ' + (st.n || 0) + '/4' },
    { say: 'See the gold band on the meter? Let go in the gold for a SCREAMER.', count: ev_('screamer', 1) },
    { say: 'After you shoot, push the stick across the ball to bend it. Curl one.', count: ev_('curl', 1) },
    { say: 'Keeper off his line? Press lob near the goal to chip him.', count: ev_('goal', 1, e => e.kind === 'chip') }] });
EF.def('drill', 'air', { n: 4, title: 'HEADS UP', coach: 'mags', teaches: 'Lobs, crosses, headers, volleys, the bicycle kick', dummies: 'keeper', mates: 2,
  steps: [
    { say: 'Get wide in their half and press lob to cross it into the box.', count: ev_('pass', 1, e => e.kind === 'cross'), start: m => { const f = m.slots[0].f; f.body.x = m.goalX(0) - m.dir(0) * 150; f.body.y = P.Y0 + 50; m.takeBall(f); } },
    { say: 'Now score a header. When the ball is in the air near you, press shoot.', count: ev_('goal', 1, e => e.kind === 'header' || e.kind === 'divingHeader'), feed: 'cross' },
    { say: 'A volley this time: meet a lower ball before it lands.', count: ev_('goal', 1, e => e.kind === 'volley' || e.kind === 'bicycle' || e.kind === 'header'), feed: 'low' },
    { say: 'Bonus: back to goal and a high ball? That is a bicycle kick. Try it, or press start to skip.', count: ev_('bicycle', 1), feed: 'back', optional: true }] });
EF.def('drill', 'skills', { n: 5, title: 'SHOW BOAT', coach: 'mags', teaches: 'Step-over, nutmeg, spin, rainbow flick, knock-on', dummies: 'static', mates: 0,
  steps: [{ say: 'Skill button with the stick: sideways a STEP-OVER, back a SPIN, at a dummy a NUTMEG, twice quick a RAINBOW. Beat dummies with four different moves.', goal: (m, st) => (st.kinds || new Set()).size >= 4, on: (m, e, st) => { if (e.type === 'skillWin') (st.kinds = st.kinds || new Set()).add(e.kind); }, label: st => 'MOVES ' + (st.kinds ? st.kinds.size : 0) + '/4' }] });
EF.def('drill', 'defending', { n: 6, title: 'THE HARBOUR WALL', coach: 'okafor', teaches: 'Poke, slide, barge, switching, interceptions', dummies: 'attack', mates: 2, fouls: true,
  steps: [
    { say: 'Without the ball: pass pokes it, shoot slides, lob barges. Win it back three times. Clean, mind.', count: ev_('tackleWon', 3), alt: ev_('recover', 3) },
    { say: 'Switch to the free man with the switch button. Do it now.', count: ev_('switch', 1) },
    { say: 'Read their passes. Step in front: intercept two.', count: ev_('intercept', 2) }] });
EF.def('drill', 'setpieces', { n: 7, title: 'DEAD BALLS', coach: 'mags', teaches: 'Corners, free kicks, penalties, keeping', dummies: 'keeper', mates: 2,
  steps: [
    { say: 'A corner. Move the ring with the stick, press lob to cross, then attack it.', count: ev_('goal', 1), sp: 'corner' },
    { say: 'A free kick. Aim the target, hold shoot for power, curl it with the stick.', count: ev_('goal', 1), sp: 'freekick' },
    { say: 'A penalty. Pick a corner with the stick and hold shoot. Very gently down the middle is a Panenka.', count: ev_('goal', 1), sp: 'penalty' },
    { say: 'Now you are in goal. Push up or down to guess, and press pass to dive.', count: ev_('save', 1), sp: 'penaltyKeep', alt: ev_('penaltyTaken', 1, e => e.outcome !== 'goal') }] });
EF.def('drill', 'euphoria', { n: 8, title: 'FEED THE CROWD', coach: 'mags', teaches: 'Euphoria, Europhoria, Super Strikes, the Save Duel', dummies: 'press', mates: 2, gain: 3,
  steps: [
    { say: 'The crowd is your power bar. Passes, tricks, tackles and shots fill it. Fill it up!', goal: m => m.euph[0] >= 100, label: (st, m) => 'EUPHORIA ' + Math.round(m.euph[0]) + '%' },
    { say: 'Full! Press switch and skill together (or Space) for EUROPHORIA.', count: ev_('europhoria', 1, e => e.side === 0) },
    { say: 'In Europhoria, a shot at FULL power is a SUPER STRIKE. Score one!', count: ev_('goal', 1, e => e.super), start: m => { if (m.euroT[0] <= 0) { m.euph[0] = 100; m.triggerEurophoria(0); } m.superUsed[0] = false; const f = m.slots[0].f; f.body.x = m.goalX(0) - m.dir(0) * 200; f.body.y = P.CY; m.takeBall(f); } },
    { say: 'Their captain has a Super Strike too. When the rings meet round your keeper, press pass!', count: ev_('saveDuelResult', 1, e => e.result !== 'miss'), alt: ev_('saveDuelResult', 1), duel: true }] });
EF.def('drill', 'theatrics', { n: 9, title: 'THE DARK ARTS', coach: 'mags', teaches: 'Theatrics and the referee', dummies: 'press', mates: 0, fouls: true,
  steps: [
    { say: 'I do not condone it. But: press theatrics when a defender touches you, and the referee might buy it.', count: ev_('diveWon', 1) },
    { say: 'Now dive with nobody near you. Go on. That is what a booking looks like. Now you know.', count: ev_('diveBooked', 1) }] });
const DRILL = { d: null, step: 0, st: {}, m: null };
EF.DRILL = DRILL;
function drillMatch(d) {
  const mates = d.mates;
  const m = EF.buildMatch({ home: 'kipperton', away: 'hoofington', stadium: 'rec', draws: 'allowed', humans: [{ input: game.input, side: 0 }], training: {
    fouls: !!d.fouls,
    goal: (mm, side, by) => { const kind = mm.shot ? mm.shot.kind : mm.ball.kind; const corner = Math.abs(mm.ball.y - P.CY) > P.GH * .45; mm.emit('goal', { side, who: by && by.id, kind: kind || 'shot', corner, super: !!mm.ball.superName }); drillReset(mm, .8); },
    out: (mm) => drillReset(mm, .5) }, noCards: !d.fouls, seed: 9 });
  // everyone not in the drill goes off; dummies are the other side
  const keepMates = m.side[0].filter(f => !f.gk && f !== m.slots[0].f).slice(0, mates);
  for (const f of m.players) {
    const keep = f === m.slots[0].f || keepMates.includes(f) || (f.gk && f.side === 1 && d.dummies !== 'gone') || (f.side === 1 && !f.gk && (d.dummies === 'static' || d.dummies === 'attack' || d.dummies === 'press'));
    if (!keep) { f.state = 'gone'; f.sentOff = true; f.body.x = -9999; }
  }
  m.gainBoost = d.gain || 1; m.buff.gain[0] = d.gain || 1;
  return m;
}
function drillReset(m, t) {
  const f = m.slots[0].f; if (!f) return;
  m.owner = null; m.shot = null; m.mode = 'dead'; m.dead = { t, then: () => { m.mode = 'play'; drillPlace(m); } };
}
function drillPlace(m) {
  const d = DRILL.d, f = m.slots[0].f, s = d.steps[DRILL.step] || {}, b = m.ball;
  f.state = 'run'; f.body.vx = f.body.vy = 0;
  const dir = m.dir(0), gx = m.goalX(0);
  f.body.x = gx - dir * (d.id === 'shooting' ? 150 : d.id === 'move' ? 380 : 260); f.body.y = P.CY + (d.id === 'air' ? -90 : 0); f.facing = dir > 0 ? 0 : PI;
  b.x = f.body.x + dir * 7; b.y = f.body.y; b.z = 0; b.vx = b.vy = b.vz = 0; b.superPath = null; b.prevPast = null;
  if (s.feed && d.id === 'air') {   // a teammate on the wing crosses it in
    const w = m.side[0].find(p => p !== f && !p.sentOff && !p.gk); if (w) { w.body.x = gx - dir * 120; w.body.y = P.Y0 + 30; m.takeBall(w); m.last = w; w.plan = { k: 'cross', until: m.t + 1.2 }; f.body.x = gx - dir * (s.feed === 'low' ? 90 : 70); f.body.y = P.CY + 10; if (s.feed === 'back') f.facing = dir > 0 ? PI : 0; }
  } else if (d.id !== 'defending' && d.id !== 'theatrics' || DRILL.step > 10) m.takeBall(f);
  else { const a = m.side[1].find(p => !p.sentOff && !p.gk); if (a) { a.body.x = f.body.x + dir * 120; a.body.y = P.CY; m.takeBall(a); } }
  // dummies stand in a line between the player and the goal
  let k = 0; for (const o of m.side[1]) { if (o.sentOff || o.gk) continue; o.body.x = f.body.x + dir * (70 + k * 45); o.body.y = P.CY + ((k % 2) ? 26 : -26) * (d.id === 'skills' ? .3 : 1); o.state = 'run'; k++; }
  let j = 0; for (const t of m.side[0]) { if (t === f || t.sentOff || t.gk) continue; t.body.x = f.body.x + dir * (60 + j * 50); t.body.y = P.CY + (j % 2 ? 90 : -90); j++; }
  if (s.sp) {
    if (s.sp === 'corner') m.startSetpiece('corner', 0, { y: P.Y0 });
    if (s.sp === 'freekick') m.startSetpiece('freekick', 0, { x: gx - dir * 170, y: P.CY + 40 });
    if (s.sp === 'penalty') m.startSetpiece('penalty', 0, {});
    if (s.sp === 'penaltyKeep') { m.startSetpiece('penalty', 1, {}); }
  }
  if (s.duel) { const cap = m.side[1].find(p => p.data.captain) || m.side[1].find(p => !p.gk); cap.sentOff = false; cap.state = 'run'; cap.body.x = m.goalX(1) - m.dir(1) * 190; cap.body.y = P.CY; m.euph[1] = 100; m.euroT[1] = 0; m.triggerEurophoria(1); m.superUsed[1] = false; m.takeBall(cap); cap.plan = { k: 'shoot', power: .97, aimY: .5, until: m.t + 3 }; }
}
EF.drillPlace = drillPlace;
// dummies: stand still, walk, attack with the ball, or press
const dummyIntent = (m, f) => {
  const d = DRILL.d; if (!d || m !== DRILL.m) return null;
  if (d.dummies === 'static' || d.dummies === 'keeper') return { bot: true, move: [0, Math.sin(m.t + f.idx) * .1], pass: {}, shoot: {}, lob: {}, through: {}, skill: {}, dive: {}, sw: {} };
  return null;
};
EF.dummyIntent = dummyIntent;
const trainingScene = {
  touch: [], view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], pausable: !SESSION, isMatch: true, camera: { zoom: [.8, 1.8], start: 1 }, idle: false,
  enter(d) {
    d = d || {}; this.d = d; this.list = true; this.t = 0; this.menu = new UIMenu({ onBack: () => d.fromCup ? game.go('cup', { round: 0 }) : game.go('title', { menu: true }) }); this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffc83a' });
    EF.music('training'); game.setView(EF.CAMS[game.settings.camera] || 'broadcast');
    const id = d.drill || (LINK.scene === 'training' && LINK.part);
    if (id && EF.get('drill', id)) { if (LINK.part === id) LINK.part = null; this.startDrill(EF.get('drill', id)); }
    else { this.stage = new Stage('rec', { weather: false }); }
  },
  exit() { if (DRILL.m) { EF.detach(); DRILL.m = null; } DRILL.d = null; },
  startDrill(d) {
    this.list = false; DRILL.d = d; DRILL.step = 0; DRILL.st = {}; DRILL.done = false;
    const m = DRILL.m = drillMatch(d); EF.attach(m, { quiet: true, noReplay: true }); drillPlace(m);
    this.coach(d.steps[0]);
  },
  coach(s) {
    const d = DRILL.d; DRILL.st = {}; this.talk.voice = EF.babble.voiceFor(d.coach);
    this.talk.say(s.say, { name: EF.speakerName(d.coach), portrait: EF.portraitOf(d.coach), onDone: () => { if (s.start) s.start(DRILL.m); else drillPlace(DRILL.m); if (s.start && !s.sp) {} } });
    if (s.cones) { const m = DRILL.m, f = m.slots[0].f; DRILL.st.cones = Array.from({ length: 6 }, (_, i) => ({ x: f.body.x + m.dir(0) * (60 + i * 50), y: P.CY + (i % 2 ? 40 : -40) })); DRILL.st.cone = 0; }
  },
  stepDone() {
    const d = DRILL.d; EF.sfx('perfect'); LIVE.hud.notice('NICE!', { t: 1.2, scale: 3, colors: ['#ffffff', '#5aff7a', '#20a040'] });
    DRILL.step++;
    if (DRILL.step >= d.steps.length) { DRILL.done = true; EF.Save.data.drills[d.id] = true; EF.Save.save(); EF.bus.emit('drillDone', { id: d.id }); this.talk.voice = EF.babble.voiceFor(d.coach); this.talk.say('That is ' + d.title + ' done. Back to the list.', { name: EF.speakerName(d.coach), portrait: EF.portraitOf(d.coach), onDone: () => this.toList() }); return; }
    this.coach(d.steps[DRILL.step]);
  },
  toList() { EF.detach(); DRILL.m = null; DRILL.d = null; this.list = true; this.stage = new Stage('rec', { weather: false }); EF.music('training'); },
  update(dt) {
    this.t += dt;
    if (this.list) {
      this.stage.update(dt); game.focus(P.CX, P.CY, 0);
      const r = game.r || { W: game.W, H: game.H }, D = EF.all('drill'), w = Math.min(130, Math.floor((r.W - 50) / 3)), rects = EF.layoutGrid(r, D.length, 3, { w, h: 40, gap: 6, y: Math.round(r.H * .2) });
      this.menu.set(D.map((d, i) => ({ rect: rects[i], label: d.n + '. ' + d.title, sub: (EF.Save.data.drills[d.id] ? 'DONE  ' : '') + d.teaches, scale: 1, onPick: () => this.startDrill(d), draw: (g, X, Y, W2, H2, f) => { EF.panel(g, X, Y, W2, H2, { border: f ? '#ffc83a' : EF.Save.data.drills[d.id] ? '#5aff7a' : '#2a3a6a' }); E.font.text(g, d.n + '. ' + d.title, X + 6, Y + 6, '#ffffff', { outline: false }); E.font.text(g, d.teaches, X + 6, Y + 18, '#ffe08a', { font: 'tiny', wrap: W2 - 12, outline: false }); if (EF.Save.data.drills[d.id]) E.font.text(g, 'DONE', X + W2 - 6, Y + 6, '#5aff7a', { align: 'right', outline: false }); } })));
      this.menu.update(dt); return;
    }
    if (this.talk.open || !LIVE.view) { this.talk.update(dt); if (LIVE.view && !this.list) { LIVE.view.update(dt); LIVE.view.camera(dt); } return; }
    const m = DRILL.m, d = DRILL.d, s = d.steps[DRILL.step]; if (!m || !s) return;
    EF.liveStep(dt);
    const f = m.slots[0].f;
    if (s.cones && DRILL.st.cones) { const c = DRILL.st.cones[DRILL.st.cone]; if (c && hyp(f.body.x - c.x, f.body.y - c.y) < 14) { DRILL.st.cone++; EF.sfx('segment'); } }
    if (s.optional && game.input.pressed('start')) return this.stepDone();
    if (s.goal && s.goal(m, DRILL.st, f)) return this.stepDone();
    if (s.count && (DRILL.st.n || 0) >= s.count.count) return this.stepDone();
  },
  draw(r) {
    if (this.list) {
      this.stage.draw(r);
      r.overlay(g => { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#101030')); EF.heading(g, 'TRAINING', r.W / 2, Math.round(r.H * .04), 3); E.font.text(g, 'KIPPERTON REC. MIND THE PUDDLES.', r.W / 2, Math.round(r.H * .04) + 28, '#ffe08a', { align: 'center', outline: '#000' }); this.menu.draw(g); EF.footer(g, r, [['confirm', 'START DRILL'], ['cancel', 'BACK']]); });
      return;
    }
    const m = DRILL.m, d = DRILL.d, s = d.steps[DRILL.step];
    if (s && s.cones && DRILL.st.cones) DRILL.st.cones.forEach((c, i) => { if (i < DRILL.st.cone) return; r.queue(c.x, c.y, 0, g => { const [x, y] = r.w(c.x, c.y, 0); px.poly(g, [[x - 3, y], [x + 3, y], [x, y - 8]], i === DRILL.st.cone && Math.floor(this.t * 6) % 2 ? '#ffffff' : '#ff7a1a'); }); });
    EF.liveDraw(r, { noBug: true, noCommentary: true });
    r.overlay(g => {
      const lab = s ? (s.label ? s.label(DRILL.st, m) : s.count ? (s.count.type.toUpperCase() + ' ' + (DRILL.st.n || 0) + '/' + s.count.count) : '') : 'DONE!';
      EF.panel(g, 8, 8, 200, 36);
      E.font.text(g, d.n + '. ' + d.title + '  (' + Math.min(d.steps.length, DRILL.step + 1) + '/' + d.steps.length + ')', 14, 13, '#ffc83a', { outline: false });
      E.font.text(g, lab, 14, 27, '#ffffff', { outline: false });
      if (s && s.optional) EF.prompt(g, 220, 16, 'start', 'SKIP');
    });
    this.talk.draw(r);
  }
};
EF.scenes.training = trainingScene;
// counting the step's events
EF.bus.on('*', ev => {
  const d = DRILL.d, m = DRILL.m; if (!d || !m || ev.match !== m) return;
  const s = d.steps[DRILL.step]; if (!s) return;
  if (s.on) s.on(m, ev, DRILL.st);
  for (const c of [s.count, s.alt]) if (c && ev.type === c.type && (!c.where || c.where(ev))) { DRILL.st.n = (DRILL.st.n || 0) + 1; EF.sfx('segment'); break; }
});
