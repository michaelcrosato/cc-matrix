// Day 5: The Gentle Games, the Grand Stillness duel, the ending and the credits
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const EVENTS = [['stork', 1, 'Stork Stand'], ['step', 1, 'Step Class'], ['slalom', 1, 'Mount Posture Slalom'], ['duel', 1, 'The Grand Stillness']];
G.scenes.games = {
  pausable: true, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) {
    d = d || {}; this.bot = d.bot || null; this.attract = d.attract || null; this.t = 0; this.ev = d.start || 0; this.phase = 'banner'; this.pt = 0; this.run = null; this.stars = []; G.cap = null; G.game.lights.enabled = true; G.game.lights.ambient = .95; G.song('festival');
    this.regs = ['gertrude', 'dennis', 'marisol', 'kevin', 'okafor', 'twinA'].map((id, i) => { const f = G.castFigure(id, { size: 1.3, x: -120 + i * 48, y: -28, tgt: 1.57 }); f.set('Cheering_Two_Hands'); return f; });
    G.caption('Welcome to the Gentle Games. Please be gentle. That is the whole game.', 'Tare', 5); this.tare = G.tare = new G.Tare(); this.tare.face = 'happy'; this.said = false;
  },
  startEvent() {
    const [id, tier] = EVENTS[this.ev], def = G.acts[id], c = G.makeContestant({ input: G.game.input }); if (this.bot) c.bot = new G.Bot(this.bot, E.rng(31 + this.ev));
    this.run = new G.ActRun(def, { tier, contestants: [c], short: id !== 'duel', mode: this.attract ? 'attract' : 'games', seed: 400 + this.ev, cheat: !!this.attract }); G.curRun = this.run; if (def.enter) def.enter(this.run, {}); if (def.id === 'duel') G.song('duel'); else G.song(def.song || 'festival');
    this.phase = 'count'; this.pt = 0; this.cnt = 3; G.game.weather = def.weather || null;
  },
  update(dt) {
    const input = G.game.input; this.t += dt; this.pt += dt; G.tick(dt); this.tare.update(dt); this.regs.forEach(f => f.update(dt)); if (G.talk.update(dt)) return;
    if (this.phase === 'banner') { if (this.pt > 3.2 || (!this.attract && input.pressed('confirm') && this.pt > .8)) this.startEvent(); }
    else if (this.phase === 'count') { this.run.cs[0].fig.update(dt); const n = Math.ceil(3 - this.pt); if (n !== this.cnt && n > 0) { this.cnt = n; G.snd('boop'); } if (this.pt >= 3) { this.phase = 'play'; this.pt = 0; G.snd('bell'); const d = this.run.def; if (d.start) d.start(this.run); } }
    else if (this.phase === 'play') { this.run.update(dt); G.leanSrc = this.run.cs[0].it.src; if (this.run.done) { const c = this.run.cs[0], r = this.run.result(c), st = G.starsOf(c.pct, this.run.def, 1); this.res = { pct: c.pct, stars: st, detail: r.detail, won: this.run.won }; this.stars.push(st); if (this.run.def.id === 'duel') { G.S.duel = this.run.won ? 'won' : 'lost'; } this.phase = 'score'; this.pt = 0; G.jingle('star' + Math.max(1, st)); if (this.run.def.exit) this.run.def.exit(this.run); G.game.weather = null; } }
    else if (this.phase === 'score') { if (this.pt > 3.6 || (!this.attract && input.pressed('confirm') && this.pt > 1)) { this.ev++; if (this.ev >= EVENTS.length) { this.finish(); } else { this.phase = 'banner'; this.pt = 0; } } }
  },
  finish() { if (this.attract) { G.game.go(this.attract); return; } G.S.gamesDone = true; G.S.finalAge = G.spineAge(); G.saveNow(); G.game.go('ending'); },
  draw(r) {
    const W = r.W, H = r.H;
    if (this.run && (this.phase === 'play' || this.phase === 'count' || this.phase === 'score')) { G.game.focus(0, 0, 18); this.run.draw(r); } else { G.game.focus(0, 0, 18); G.rooms.pier(r, this.t); }
    if (!this.run || this.run.def.room !== false) this.regs.forEach(f => f.draw(r));
    r.overlay(g => { for (let x = 0; x < W; x += 16) { px.line(g, x, 0, x + 16, 5, '#ffffff', 1); px.rect(g, x + 5, 3, 5, 7 + (x % 32 ? 1 : 0), ['#ff7a59', '#2cc6e6', '#f5b700', '#bfeee0'][(x / 16) % 4 | 0]); } });
    if (this.phase === 'banner') r.overlay(g => { G.rr(g, W / 2 - 110, 40, 220, 66, C.WHITE); G.txt(g, 'The Gentle Games', W / 2, 46, C.ACC2, { align: 'center', scale: 2 }); G.txt(g, 'Event ' + (this.ev + 1) + ' of 4', W / 2, 66, C.MUTED, { align: 'center' }); G.txt(g, EVENTS[this.ev][2], W / 2, 80, C.INK, { align: 'center', scale: 2 }); });
    else if (this.phase === 'count') r.overlay(g => { G.bigNum(g, Math.max(1, this.cnt), W / 2, 60, 6, C.ACC2); });
    else if (this.phase === 'play') { this.run.hud(r); }
    else if (this.phase === 'score') r.overlay(g => { G.rr(g, W / 2 - 100, 40, 200, 64, C.WHITE); G.txt(g, EVENTS[this.ev][2], W / 2, 46, C.ACC2, { align: 'center', scale: 2 }); G.drawStars(g, W / 2, 76, this.res.stars, 8); G.txt(g, this.res.detail, W / 2, 92, C.INK, { align: 'center' }); if (this.run.def.id === 'duel') G.txt(g, this.res.won ? 'Well done, dear. I have been waiting since Thursday.' : 'Gertrude smiles. She is very still.', W / 2, 106, C.CORAL, { align: 'center' }); });
    G.drawCaption(r, H - 54); G.talk.draw(r); if (this.phase === 'banner' || this.phase === 'score') G.prompt(r, [['confirm', 'Continue']]);
  }
};
// the ending: Tare tells the truth
G.scenes.ending = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) {
    this.t = 0; this.stage = 'talk'; this.tare = G.tare = new G.Tare(); this.tare.face = 'sad'; this.fig = G.playerFigure({ x: -30, y: 8, tgt: 1.5 }); this.fig.rig.o.size = 2; this.fig.set('Idle_Subtle'); G.game.lights.enabled = true; G.game.lights.ambient = .8; G.song('ending'); G.cap = null; this.auto = d && d.auto;
    const age = G.spineAge(), S = G.S; S.finalAge = age; const tail = age <= 24 ? G.LINES.endingByAge.low : age <= 45 ? G.LINES.endingByAge.mid : G.LINES.endingByAge.high;
    const lines = G.LINES.endingA.concat([tail]); this.age = age; this.gert = G.castFigure('gertrude', { size: 2, x: 60, y: 8, tgt: 1.6 }); this.gert.set('Wave_Hello');
    G.say(lines, { name: 'Tare', onDone: () => { this.stage = 'hat'; this.ht = 0; } });
  },
  update(dt) { this.t += dt; this.tare.update(dt); this.fig.update(dt); this.gert.update(dt); G.tick(dt); this.tare.talk = G.talk.open ? .3 : 0; if (this.auto && G.talk.open && this.t > 1 && Math.floor(this.t * 2) % 2) G.game.input.tap('confirm'); if (G.talk.update(dt)) { if (G.talk.pages && G.talk.i >= G.talk.pages.length - 2) this.tare.face = 'happy'; return; }
    if (this.stage === 'hat') { this.ht += dt; if (this.age <= 24 && !this.hatDone) { this.hatDone = true; G.S.unlocked = G.S.unlocked || []; if (!G.S.unlocked.includes('spare')) G.S.unlocked.push('spare'); G.S.wear.sunhat = true; } if (this.ht > 2.2) { G.S.ending = true; G.S.free = true; G.saveNow(); G.game.go('credits'); } } },
  draw(r) { G.game.focus(0, 0, 18); G.rooms.deck(r, this.t); const W = r.W; this.fig.draw(r); this.gert.draw(r); const p = r.w(0, 18, 0); r.overlay(g => { this.tare.draw(g, p[0], p[1], 1.8, this.tare.face); G.G; }); G.talk.draw(r); G.drawCaption(r); }
};
// credits: paged, big text
G.scenes.credits = {
  pausable: true, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) { this.t = 0; this.page = 0; this.pt = 0; G.song('ending'); this.back = d && d.back; this.fig = G.playerFigure({ x: 0, y: 8, tgt: 1.5 }); this.fig.rig.o.size = 2; this.fig.set('Victory'); this.pages = [['Wii Stork', 'The Institute for Gentle Improvement', 'Five days. One skill. A scale that wrote you a card.'], ['Source', 'Inspired by Wii Fit', 'Everything here is new: the cast, the island, the jokes.'], ['Engine', 'my-3D2dge v0.89.0', 'Skeletons drawn as pixel art. Dialog, Road, Mode 7, Physics, Rhythm modules.'], ['Motion', 'Mesh2Motion and Quaternius (CC0)', 'CMU Graphics Lab Motion Capture Database'], ['Sound', 'Every note and every Animalese word', 'Written in code. No files. Music at ten percent, on purpose.'], ['Thank you', 'Tare, Gerald, Birch, Alder, Gertrude, Dennis', 'And you. You are the one who came.']]; },
  update(dt) { this.t += dt; this.pt += dt; this.fig.update(dt); const input = G.game.input; if ((this.pt > 4.5 || input.pressed('confirm') || (input.clicked && input.clicked())) && this.pt > .6) { this.page++; this.pt = 0; if (this.page >= this.pages.length) { G.game.go(this.back || (G.S.free ? 'island' : 'title'), { from: 'bungalow' }); } } },
  draw(r) { G.game.focus(0, 0, 18); G.rooms.deck(r, this.t); const W = r.W, pg = this.pages[Math.min(this.page, this.pages.length - 1)]; this.fig.draw(r); r.overlay(g => { const a = G.clamp(Math.min(this.pt * 2, (4.5 - this.pt) * 2), 0, 1); px.blend(g, a, 'normal', () => { G.rr(g, W / 2 - 150, 20, 300, 62, 'rgba(255,255,255,.96)'); G.txt(g, pg[0], W / 2, 26, C.ACC2, { align: 'center', scale: 3 }); G.txt(g, pg[1], W / 2, 52, C.INK, { align: 'center' }); G.txt(g, pg[2], W / 2, 64, C.MUTED, { align: 'center' }); }); }); G.prompt(r, [['confirm', 'Next']]); }
};
})();
