// Grand Rounds on one couch: four seats, press to join, add AI colleagues, start. One shared screen. And the team's result, with awards.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph;
G.scenes = G.scenes || {};
G.grandAwards = S => { const live = S.hands.filter(h => !h.gone), best = (f, min = 0) => { let b = null, v = min; for (const h of live) { const q = f(h); if (q > v) { v = q; b = h; } } return b ? { h: b, v } : null; }, out = [];
  const add = (title, f, fmt) => { const b = best(f); if (b) out.push({ id: b.h.id, title, detail: fmt(b.v) }); };
  add('Steadiest Hand', h => h.acts ? h.tb / h.acts : 0, v => Math.round(v * 100) + '% Textbook'); add('Needlework', h => h.stitches, v => v + ' stitches'); add('Hoover', h => h.sucked, v => Math.round(v) + ' mL suctioned'); add('Firebrand', h => h.burns, v => v + ' burns'); return out; };
G.grandStandings = S => { const live = S.hands.filter(h => !h.gone).slice().sort((a, b) => b.score - a.score), st = []; for (const h of live) { const last = st[st.length - 1]; if (last && Math.round(last[0].score) === Math.round(h.score)) last.push(h); else st.push([h]); } return st; };
G.scenes.lobby = {
  pausable: false, view: 'overhead', camera: { zoom: false, wheel: false },
  enter() {
    const game = G.game; this.t = 0; this.i = 0; G.Screen.cursor(game, true); G.Music.play('tension'); game.input.consumeAll();
    this.seats = [{ kind: 'p', input: game.input, name: 'P1' }, null, null, null]; for (const q of game.players.slice(1)) game.removePlayer(q);
    this.join = game.allowJoin({ max: 4, onJoin: (inp) => { const k = this.seats.findIndex(s => !s); if (k >= 0) { this.seats[k] = { kind: 'p', input: inp, name: 'P' + (k + 1) }; G.Sfx.menuOk(); } } });
    this.menu = new E.Menu(game, ['Start the rounds', 'Add AI colleague', 'Remove AI colleague', 'Back'], { x: 'center', y: 128, scale: 2, rows: 4, bg: '#06181c', border: '#4fd0c4', pick: '#ffd36a', sound: false, onMove: () => G.Sfx.menuMove(), onPick: i => this.pick(i), onCancel: () => this.back() });
  },
  exit() { const game = G.game; if (game.allowJoin) game.allowJoin(false); },
  back() { const game = G.game; G.Sfx.tick(); for (const q of game.players.slice(1)) game.removePlayer(q); game.go('menu'); },
  pick(i) {
    const game = G.game;
    if (i === 0) { G.Sfx.menuOk(); const seats = this.seats.filter(Boolean); G.Flow.origin = 'rounds'; game.go('op', { caseId: 'grandrounds', mode: 'rounds', difficulty: game.settings.difficulty, seats, seed: (Math.random() * 1e9) | 0 }); }
    else if (i === 1) { const k = this.seats.findIndex(s => !s); if (k >= 0) { this.seats[k] = { kind: 'bot', name: ['Dr. Vale', 'Quill', 'Odalys', 'Percy'][k] }; G.Sfx.menuOk(); } else G.Sfx.miss(); }
    else if (i === 2) { for (let k = 3; k >= 0; k--) if (this.seats[k] && this.seats[k].kind === 'bot') { this.seats[k] = null; G.Sfx.tick(); break; } }
    else this.back();
  },
  update(dt) { this.t += dt; const game = G.game; game.focus(game.W / 2, game.H / 2, 0); this.menu.update(dt); },
  draw(r) {
    const W = r.W, H = r.H; G.Stage.draw(r, 'gallery', this.t);
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a')); E.font.text(g, 'GRAND ROUNDS', W / 2, 6, '#ffd36a', { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, 'A ferry has gone down off Pier Four. One patient. Up to four surgeons.', W / 2, 26, '#c8e0dc', { align: 'center', outline: false });
      const sw = 92, gap = 8, x0 = Math.round(W / 2 - (sw * 4 + gap * 3) / 2), y = 42; this.seats.forEach((s, i) => { const x = x0 + i * (sw + gap); Pix.panel(g, x, y, sw, 76, { alpha: .9, line: s ? G.SEATS[i] : '#2c6a68' }); px.rect(g, x + 2, y + 2, sw - 4, 3, s ? G.SEATS[i] : '#16343a'); if (s) { const id = s.kind === 'bot' ? ['vale', 'quill', 'odalys', 'percy'][i] : i === 0 ? 'vale' : i === 1 ? 'sokolova' : i === 2 ? 'percy' : 'odalys', cv = G.bust(id, { maskUp: true, blink: (this.t + i) % 3 < .1 ? 1 : 0 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, 28, 16, 56, 62, x + 18, y + 8, 56, 52); px.reset(g); } Pix.text(g, s.name + (s.kind === 'bot' ? ' (AI)' : ''), x + sw / 2, y + 63, G.SEATS[i], { align: 'center' }); } else { Pix.text(g, 'Empty', x + sw / 2, y + 26, '#6a8a88', { align: 'center' }); Pix.text(g, 'Start on a pad,', x + sw / 2, y + 40, '#a8c8c0', { align: 'center' }); Pix.text(g, 'or key 2', x + sw / 2, y + 50, '#a8c8c0', { align: 'center' }); } });
    });
    this.menu.draw(r);
  },
};
G.scenes.roundsend = {
  pausable: false, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) { this.S = d.S; this.t = 0; this.d = d; const S = this.S, won = S.status === 'closed'; this.won = won; G.Sfx.stamp(); G.Screen.cursor(G.game, true); this.st = G.grandStandings(S); this.aw = G.grandAwards(S); G.game.input.consumeAll(); },
  update(dt) { const game = G.game, I = game.input; this.t += dt; game.focus(game.W / 2, game.H / 2, 0); if (this.d.autoT !== undefined) return; if (this.t > 1 && (I.pressed('confirm') || I.clicked())) { G.Sfx.menuOk(); game.go('lobby'); } },
  draw(r) {
    const W = r.W, H = r.H, S = this.S; G.Stage.draw(r, 'gallery', this.t);
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a')); E.font.text(g, this.won ? 'THE PATIENT LIVED' : 'THE PATIENT DIED', W / 2, 10, this.won ? '#ffe27a' : '#ff7a6a', { scale: 2, align: 'center', outline: false, shadow: '#000' });
      let y = 36, place = 1; for (const tier of this.st) { for (const h of tier) { const x = W / 2 - 110; Pix.panel(g, x, y, 220, 16, { alpha: .85 }); E.font.text(g, String(place), x + 7, y + 4, '#ffd36a', { outline: false }); E.font.text(g, h.name, x + 22, y + 4, h.color, { outline: false }); E.font.text(g, String(Math.round(h.score)), x + 212, y + 4, '#ffffff', { outline: false, align: 'right' }); y += 19; } place += tier.length; }
      y += 4; for (const a of this.aw) { const h = S.hands.find(q => q.id === a.id); Pix.text(g, a.title, W / 2 - 110, y, '#ffd36a'); Pix.text(g, (h ? h.name : '') + ': ' + a.detail, W / 2 + 110, y, h ? h.color : '#fff', { align: 'right' }); y += 11; }
      if (this.t > 1 && this.d.autoT === undefined) { const I = G.game.input, w = Glyph.width(I, 'confirm'); Glyph.action(g, I, 'confirm', W - w - 56, H - 14); Pix.text(g, 'Continue', W - 53, H - 13, '#ffffff'); }
    });
  },
};
})();
