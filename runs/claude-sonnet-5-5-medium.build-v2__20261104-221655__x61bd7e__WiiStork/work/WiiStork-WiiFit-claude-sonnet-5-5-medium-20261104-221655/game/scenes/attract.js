// Attract mode: an endless AI-played demo; any input returns to the title
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const PLAY = [['island'], ['bodycheck'], ['act', 'stork'], ['act', 'flow'], ['act', 'candle'], ['act', 'squat'], ['act', 'pushup'], ['act', 'lunge'], ['act', 'step'], ['act', 'hoop'], ['act', 'jog'], ['act', 'slalom'], ['act', 'tray'], ['act', 'laundry'], ['class'], ['results'], ['act', 'duel']];
G.ATTRACT_PLAYLIST = PLAY;
const LINES = ["Nobody's here. I'll just show the room what we do.", 'This is the island. It is five seconds wide.', 'The morning check. I am very calm about it.', 'This is the Stork. It is the whole sport.', 'Breathe in with the ring. Breathe out with the ring.', 'A candle. It is not a metaphor. It is a candle.', 'Squats. The lean is the body.', 'Push-ups. Please do not look at the floor.', 'A lunge. Left, then right.', 'Step class. The click is for you.', 'Hoops. Mr. Okafor believes in circles.', 'The coast. Marisol has already done it.', 'The slope. Gently.', 'Olives. Dennis cannot say why.', 'The laundry line. It is allowed at 10:30.', 'Four mats. Four people. One of them is a Regular.', 'Gerald has swallowed the minutes. He is pleased.', 'The Grand Stillness. Gertrude has been waiting since Thursday.'];
const STARS = ['marisol', 'kevin', 'gertrude', 'okafor', 'dennis', 'twinA'];
G.scenes.attract = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter() { this.t = 0; this.idx = G.attractIdx || 0; this.armed = 0; G.cap = null; this.base = null; G.attractSave = JSON.stringify(G.S); G.noSave = true; this.startItem(); G.game.lights.enabled = true; G.game.lights.ambient = .95; },
  exit() { G.noSave = false; G.attractIdx = this.idx; try { G.S = Object.assign(G.fresh(), JSON.parse(G.attractSave)); } catch (e) {} G.game.weather = null; G.curRun = null; },
  startItem() {
    const it = PLAY[this.idx % PLAY.length]; this.item = it; try { G.game.follow(null); G.game.cam.bounds = null; } catch (e) {} this.it = 0; this.sub = null; this.run = null; G.cap = null; G.game.weather = null; G.caption(LINES[this.idx % LINES.length], 'Tare', 5);
    if (it[0] === 'act') { const def = G.acts[it[1]], c = G.makeContestant({ name: 'Regular', local: false, fig: G.castFigure(STARS[this.idx % STARS.length], { size: 2 }) }); c.bot = new G.Bot('expert', E.rng(50 + this.idx)); c.bal = null;
      this.run = new G.ActRun(def, { tier: 1, contestants: [c], mode: 'attract', cheat: true, seed: 700 + this.idx, inst: false }); G.curRun = this.run; if (def.enter) def.enter(this.run, {}); if (def.start) def.start(this.run); try { G.game.setView(def.view || 'brawler'); } catch (e) {} G.song(def.song || 'studio'); G.game.weather = def.weather || null; }
    else { try { G.game.setView(it[0] === 'island' ? 'threequarter' : 'brawler'); } catch (e) {}
      if (it[0] === 'island') { const S = G.S; S.started = true; S.day = 3; S.spine = S.spine.length ? S.spine : [71]; this.sub = Object.create(G.scenes.island); this.sub.enter({}); this.sub.walkT = 0; this.sub.interact = () => {}; }
      else if (it[0] === 'bodycheck') { const S = G.S; S.day = Math.min(S.day, 3); this.sub = Object.create(G.scenes.bodycheck); this.sub.enter({ bot: 'expert', attract: 'attract', short: false }); this.sub.finish = () => { this.it = 99; }; }
      else if (it[0] === 'class') { this.sub = Object.create(G.scenes.class); this.sub.enter({ attract: 'attract', act: this.idx % 5 }); }
      else if (it[0] === 'results') { this.coins = 0; this.sub = null; G.song('studio'); } }
  },
  anyInput(input) { const p = input.pointer && input.pointer(); const moved = p && this.p0 && Math.hypot(p[0] - this.p0[0], p[1] - this.p0[1]) > 4; if (p && !this.p0) this.p0 = p; const sx = input.value ? Math.max(input.value('axL'), input.value('axR'), input.value('axU'), input.value('axD')) : 0; return input.anyPressed() || (input.clicked && input.clicked()) || moved || sx > .4; },
  update(dt) {
    const input = G.game.input; this.t += dt; this.it += dt; G.tick(dt); G.gerald.update(dt); this.armed += dt;
    if (this.armed > .4 && this.anyInput(input)) { input.consumeAll(); G.attractExit = true; G.game.go('title'); return; }
    if (this.run) { this.run.update(dt); if (this.run.done) this.run.done = false, this.run.time = 0; }
    if (this.sub) { if (this.item[0] === 'island') { this.sub.walkT -= dt; if (this.sub.walkT <= 0) { this.sub.walkT = 3.5; const m = this.sub.mats[(Math.random() * this.sub.mats.length) | 0]; this.sub.walkTo = m; } this.sub.near = null; const s = this.sub; s.update(dt); } else this.sub.update(dt); }
    if (this.item[0] === 'results') { this.coins += dt; if (Math.floor(this.coins * 4) > (this.cl || 0)) { this.cl = Math.floor(this.coins * 4); G.gerald.drop(); G.snd('clink'); G.gerald.clink(); } }
    if (this.it >= 15 || this.it >= 99) { this.idx++; this.cl = 0; this.startItem(); }
  },
  draw(r) {
    const W = r.W, H = r.H;
    if (this.run) { G.game.focus(0, 0, 18); this.run.draw(r); this.run.hud(r); }
    else if (this.sub) { try { this.sub.draw(r); } catch (e) { G.game.fail('attract draw', e); } }
    else { G.game.focus(0, 0, 18); G.rooms.deck(r, this.t); r.overlay(g => { G.rr(g, W / 2 - 120, 20, 240, 100, C.WHITE); G.txt(g, 'Evening', W / 2, 26, C.ACC2, { align: 'center', scale: 2 }); G.gerald.draw(g, W / 2 - 30, 100, 1.6); G.txt(g, 'Gerald has swallowed the minutes.', W / 2, 110, C.INK, { align: 'center' }); }); }
    const input = G.game.input, dev = input.lastDevice === 'gamepad' ? 'Press any button' : 'Press any key';
    r.overlay(g => { G.rr(g, 8, 8, 40, 14, C.ACC); G.txt(g, 'DEMO', 28, 12, '#fff', { align: 'center' }); E.font.title(g, 'WII STORK', 70, 8, { scale: 2, colors: ['#9ff3ff', '#2cc6e6'], outline: '#0e6d84', align: 'left' }); const a = .5 + .5 * Math.sin(this.t * 3); px.blend(g, .6 + .4 * a, 'normal', () => { G.rr(g, W / 2 - 52, H - 18, 104, 13, C.WHITE); G.txt(g, dev, W / 2, H - 15, C.ACC2, { align: 'center' }); }); });
    G.drawCaption(r, H - 52);
  }
};
})();
