// ---- the attract mode: after 10 s idle on a front-end screen, a looping demo of reels played by cheating bots ----
const ATT = MT.attract = { reel: 0, t: 0, reels: null, count0: 0, played: [] };
const REELS = ATT.REELS = [
  { id: 'cold', dur: 7, caption: 'TONIGHT ON MASH TV!', room: '1-1', hold: true, setup(w) { LINES.say('ANNC', MT.TEXT.seq.coldOpen[0][1], 3); const L = MT.cut.actor(makeLance(1.3), 184, 40, { mic: true, light: '#fff6d0' }); L.walkTo(184, 100); PLAY.extras.push(L); ATT.lance = L; }, step(w, t) { if (ATT.lance && ATT.lance.arrived()) ATT.lance.pose = 'wave'; } },
  { id: '1-1', dur: 18, caption: "MASH 'EM!", room: '1-1', setup(w) { w.delayed(4, () => MT.placeItem(w, 'spread', [10, 7])); } },
  { id: '1-2', dur: 14, caption: "CASH 'EM!", room: '1-2', weapon: 'rockets', setup(w) { w.delayed(10, () => { if (!w.keyDropped) w.dropKey(AR.CX, AR.CY + 20); }); } },
  { id: 'mashy', dur: 16, caption: 'BOSSES THE SIZE OF A STUDIO!', room: '1-B', setup(w) { }, step(w, t) { const b = w.boss; if (b && b.introDone && !ATT.cut) { ATT.cut = true; for (const id of ['armL', 'armR']) { const p = b.get(id); p.hp = 0; p.alive = false; } const body = b.get('body'); body.hp = body.max * .6; b.setPhase('p2', b.p2()); } if (b && !b.introDone && t > 1.4) { b.introDone = true; b.y = 70; b.setPhase('p1', b.p1()); } } },
  { id: '2-2', dur: 16, caption: 'PRIME TIME = 5× CASH!', room: '2-2', weapon: 'popcorn', weapon2: 'laser', setup(w) { w.delayed(5, () => { w.ratings.primeCD = 0; w.startPrime(); }); } },
  { id: 'spin', dur: 16, caption: 'SPIN THE WHEEL OF MISFORTUNE!', room: '2-B', setup(w) { }, step(w, t) { const b = w.boss; if (b && !b.forcedSet) { b.forcedSet = true; b.forced = [6, 0]; } if (b && !b.introDone && t > 1.4) { b.introDone = true; b.setPhase('p1', b.cycle()); } } },
  { id: '3-6', dur: 16, caption: 'PLAY TO THE CAMERAS!', room: '3-6', addon: 'records', addon2: 'shield', bot0: { boatAt: 6, boats: true }, bot1: { bombAt: 9 } },
  { id: 'lance', dur: 16, caption: 'NOBODY CANCELS LANCE LUSTRE!', room: '3-B', step(w, t) { const b = w.boss; if (b && !b.introDone && t > 1.2) { b.introDone = true; b.y = 80; b.setPhase('lance', b.lancePhase()); } if (b && t > 9 && !ATT.cut) { ATT.cut = true; const pod = b.get('podium'); pod.hp = 0; pod.alive = false; b.setPhase('reveal', b.robotReveal()); } } },
  { id: 'recap', dur: 8, caption: 'BIG PRIZES!', recap: true },
  { id: 'scores', dur: 6, caption: '', scores: true },
];
function attractRun() {
  MT.newRun({ mode: 'attract', diff: 'CONTESTANT', seed: 1000 + ATT.reel });
  for (let i = 0; i < 2; i++) { const c = MT.addRunPlayer({ slot: i, look: (i + ATT.reel) % 4, ctl: 'bot', bot: {}, god: true, infBombs: true }); c.dmgMul = 3; }
  MT.run.keys = 3;
}
ATT.start = (i) => {
  ATT.leaving = false; ATT.reel = i % REELS.length; ATT.t = 0; ATT.cut = false; ATT.lance = null; ATT.played.push(REELS[ATT.reel].id);
  const R = REELS[ATT.reel];
  LINES.clear(); MT.banners.list.length = 0;
  if (R.room) {
    attractRun();
    const run = MT.run; run.contestants.forEach((c, k) => { c.botOpts = Object.assign({ rush: false }, R['bot' + k] || {}); });
    const w = PLAY.load(R.room, 'S', !!R.hold);
    w.quietFx = false;
    const [c0, c1] = run.contestants;
    if (R.weapon) MT.giveItem(w, c0, R.weapon); if (R.weapon2) MT.giveItem(w, c1, R.weapon2);
    if (R.addon) MT.giveItem(w, c0, R.addon); if (R.addon2) MT.giveItem(w, c1, R.addon2);
    for (const c of run.contestants) { c.wT = c.wMax = 99; for (const k in c.addons) if (c.addons[k] > 0) c.addons[k] = 99; }
    if (R.setup) R.setup(w);
    if (R.room.endsWith('B')) MT.music.play('bossShowdown'); else MT.music.play((MT.EPISODES[MT.ROOMS[R.room].ep] || MT.EPISODES[1]).song);
  } else { PLAY.world = null; MT.music.play(R.recap ? 'recap' : 'theme'); ATT.fakePrizes = MT.TEXT.prizes[1 + ATT.reel % 3].slice(0, 4); }
  if (!game.headless) game.audio.duck(true);
};
ATT.next = () => ATT.start(ATT.reel + 1);
ATT.step = (dt, w) => {
  const R = REELS[ATT.reel]; ATT.t += dt;
  if (w && R.step) R.step(w, ATT.t);
  if (ATT.t >= R.dur && !ATT.leaving) { ATT.leaving = true; PLAY.wipe(() => { ATT.leaving = false; ATT.next(); }); }
};
ATT.drawOverlay = r => {
  r.overlay(g => {
    const t = game.real, R = REELS[ATT.reel];
    px.blend(g, .8, 'normal', () => px.rect(g, 0, r.H - 30, r.W, 30, '#0c0618'));
    UI.title(g, 'MASH TV', 40, r.H - 26, 1, { align: 'center' });
    UI.text(g, MT.TEXT.ui.demo, r.W - 6, r.H - 26, '#ff9a3c', { align: 'right' });
    if (R.caption) UI.text(g, R.caption, r.W / 2, r.H - 26, '#ffcc33', { align: 'center', scale: r.W > 380 ? 2 : 1 });
    if (Math.floor(t * 2) % 2 === 0) { const I = UI.lastInput(); UI.text(g, MT.touchOnly() ? 'TAP TO RETURN' : MT.TEXT.ui.pressAny, r.W / 2, r.H - 10, '#fff7e8', { align: 'center', font: 'tiny' }); }
  });
};
ATT.scene = {
  pausable: false, input: MASH_MENU, view: 'threequarter', expand: true, touch: [], camera: { zoom: false },
  enter() { MT.idle.reset(); ATT.count0 = MT.idle.inputCount; ATT.played = []; PLAY.overlay = null; PLAY.trans = null; game.allowJoin(false); ATT.start(0); this.armed = 0; },
  exit() { if (!game.headless) game.audio.duck(false); MT.run = null; PLAY.world = null; LINES.clear(); MT.banners.list.length = 0; },
  update(dt) {
    this.armed += dt;
    MT.idleStep(dt);
    if (this.armed > .15 && MT.idle.inputCount !== ATT.count0) { game.go('title', {}, { fade: 0 }); return; }
    ATT.count0 = MT.idle.inputCount;
    const R = REELS[ATT.reel];
    if (!R.room) { LINES.step(1 / 120); ATT.step(dt, null); if (PLAY.trans) { const T = PLAY.trans; T.t += 1 / 120; if (!T.fired && T.t >= .4) { T.fired = true; T.fn(); } if (T.t >= .8) PLAY.trans = null; } return; }
    MT.scenes.play.update.call(this, dt);
    if (PLAY.world && PLAY.world.phase === 'HOLD') { ATT.step(dt, PLAY.world); }
  },
  draw(r) {
    const R = REELS[ATT.reel], t = game.real;
    if (R.room && PLAY.world) { MT.scenes.play.draw.call(this, r); return; }
    backdrop(r, t, .5);
    if (R.scores) MT.cab.drawTable(r, 'show', 16, MT.TEXT.ui.scores);
    else r.overlay(g => { UI.title(g, 'PRIZE RECAP', r.W / 2, 14, 2); (ATT.fakePrizes || []).forEach((p, i) => { const y = 50 + i * 30; if (ATT.t > .6 + i * 1.2) { px.sprite(g, SPR.prize[p.icon], r.W / 2 - 110, y); UI.text(g, p.name, r.W / 2 - 92, y, '#fff7e8'); UI.text(g, money(p.value), r.W / 2 + 110, y, '#5fe0a0', { align: 'right' }); UI.text(g, p.line, r.W / 2 - 92, y + 10, '#ff8ad8', { font: 'tiny' }); } }); });
    ATT.drawOverlay(r);
    if (PLAY.trans) { const k = PLAY.trans.t < .4 ? PLAY.trans.t / .4 : 1 - (PLAY.trans.t - .4) / .4; r.overlay(g => UI.static(g, r, k, t)); }
  },
};
