// The attract reel: the real game, played by the bot with cheats on, a segment at a time. Any input goes back to the title; it never saves.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px, font } = E;
const op = (caseId, o) => Object.assign({ k: 'op', caseId, seats: 1, dur: 15, phase: 0 }, o);
G.REEL = [
  { k: 'story', id: 'c3_after', dur: 14 },
  op('c1', { dur: 15 }),
  op('c3', { dur: 18, phase: 0, at: [[6, S => { G.Op.jumpPhase(S, 2); S.lock = false; }]] }),
  op('c3', { dur: 10, phase: 3 }),
  op('c6', { dur: 16, phase: 1 }),
  op('c7', { dur: 24, phase: 0, at: [[20.5, (S, V) => { S.steady = 100; V.seats[0].bot.dev.giftNext = true; G.opGift(S, S.players[0]); }]] }),
  op('grandrounds', { dur: 20, seats: 4 }),
  op('c11', { dur: 20, phase: 2 }),
  op('c11', { dur: 12, phase: 3 }),
  { k: 'stamp', dur: 5 },
  { k: 'title', dur: 8 },
];
G.SCENES.attract = { view: 'overhead', camera: { zoom: false, wheel: false },
  enter() { const game = G.game; this.i = -1; this.t = 0; this.loops = 0; this.reelT = 0; game.saves.canSave = false; G.attractOn = true; this.next(); },
  exit() { G.attractOn = false; const game = G.game; game.setView('overhead'); game.weather = null; if (G.storyView) G.story.stop(); G.sfx.stopLoops(); G.choir.silence(); G.sfx.setMode('normal'); G.sfx.setSlow(false); G.music.play(null); },
  next() { const game = G.game; this.i++; if (this.i >= G.REEL.length) { this.i = 0; this.loops++; } this.seg = G.REEL[this.i]; this.t = 0; this.ov = null; this.ati = 0; G.story.stop(); const s = this.seg; game.weather = null; game.setView('overhead'); if (s.k === 'story') { const V = G.storyView; V.reset(); V.autoSkip = false; G.story.auto = 1.6; G.story.run(s.id, { onDone: () => { this.t = 1e9; } }); } else if (s.k === 'op') { const n = s.seats, players = [], seats = []; for (let i = 0; i < n; i++) { players.push({ id: i, color: G.SEATS[i] }); seats.push({ pid: i, bot: new G.Bot({ seed: 5 + i * 3, speed: 420 }) }); } const S = G.Op.create(s.caseId, { seed: 77 + this.i, difficulty: 'resident', players, phase: s.phase, lock: s.caseId !== 'c3' || s.phase !== 0, attract: true, steady: 60 }); this.ov = new G.OpView(game, S, { seats, attract: true, music: 'op' }); G.music.play(G.CASES[s.caseId].music || 'op'); if (s.caseId === 'c11' && s.phase === 2) G.music.play(null); } else if (s.k === 'title') { game.setView('side'); this.titleScene = G.SCENES.title; game.weather = { kind: 'rain', amount: .7, wind: .2 }; G.music.play('title'); } },
  update(dt) { const game = G.game; this.t += dt; this.reelT += dt; const s = this.seg; if (G.idle < .01 && this.reelT > .25 && G.lastPress) { G.lastPress = false; game.input.consumeAll(); game.go('title', { fromAttract: true }); return; } G.lastPress = false; if (s.k === 'story') { G.storyView.update(dt); } else if (s.k === 'op') { const V = this.ov; game.focus(game.W / 2, game.H / 2, 0); if (s.at) while (this.ati < s.at.length && this.t >= s.at[this.ati][0]) { s.at[this.ati++][1](V.S, V); } if (V.S.done) { this.t = s.dur; } else V.update(dt); } else if (s.k === 'title') game.focus(game.W / 2, 0, game.H / 2); else game.focus(game.W / 2, game.H / 2, 0); if (this.t >= s.dur) this.next(); },
  draw(r) { const s = this.seg; if (!s) return; if (s.k === 'story') G.storyView.draw(r); else if (s.k === 'op') this.ov.draw(r); else if (s.k === 'title') { G.SCENES.title.t = this.t + 2; G.drawTitleArt(r, this.t + 2); } else r.overlay(g => { G.drawStage(g, 'scrub', r.W, r.H, this.t); px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#02080a')); font.text(g, 'CASE CLOSED', r.W / 2, 60, '#ff5a4a', { align: 'center', scale: 3, outline: false }); G.ringDraw(g, r.W / 2, 136, 34, '#ff5a4a', 36); font.text(g, 'S', r.W / 2, 118, '#ff5a4a', { align: 'center', scale: 5, outline: false }); }); if (s.k !== 'op') r.overlay(g => G.demoRibbon(g, r, this.reelT)); } };
})();
