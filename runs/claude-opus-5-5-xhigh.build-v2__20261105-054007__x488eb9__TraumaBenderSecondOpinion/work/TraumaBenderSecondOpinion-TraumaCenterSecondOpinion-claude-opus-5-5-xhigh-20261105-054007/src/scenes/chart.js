// The chart: one clipboard. Patient, complaint, first opinion. Quill reads it aloud. And the Lightbox: the second opinion as a mechanic (9.1).
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph, U = G.U;
G.scenes = G.scenes || {};
const portrait = (g, id, x, y, o = {}) => { const cv = G.bust(id, o); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, x, y); px.reset(g); } };
G.drawPortrait = portrait;
G.scenes.chart = {
  pausable: true, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) { const game = G.game; this.def = G.CASES[d.caseId]; this.d = d; this.t = 0; this.state = 'read'; this.read = 0; G.Screen.cursor(game, true); game.input.consumeAll(); G.Music.play('tension'); const p = this.def.patient; this.text = [p.complaint, p.human, this.def.lightbox ? 'First opinion: ' + this.def.lightbox.opinion : ''].filter(Boolean); G.Babble.say('quill', this.text[0].slice(0, 46)); this.bonus = d.bonus || 0; if (game.saves) game.saves.canSave = false; this.hp = null; },
  update(dt) {
    const game = G.game, I = game.input; this.t += dt; game.focus(game.W / 2, game.H / 2, 0); if (this.d.autoT !== undefined) { this.d.autoT -= dt; if (this.d.autoT <= 0) this.goOn(); return; }
    if (I.pressed('confirm') || I.clicked()) { if (this.t > .25) { G.Sfx.menuOk(); this.goOn(); } } else if (I.pressed('cancel') && G.Flow.origin === 'files') G.Flow.quitToFiles();
  },
  goOn() { const game = G.game, L = this.def.lightbox; if (L && !this.d.film) game.go('lightbox', { caseId: this.def.id }); else G.Flow.startCase(this.def.id, { lightbox: this.d.bonus > 0, clockAdj: this.d.bonus < 0 ? this.d.bonus : 0 }); },
  draw(r) {
    G.Stage.draw(r, this.def.chartStage || 'corridor', this.t); const W = r.W, H = r.H, def = this.def, p = def.patient;
    r.overlay(g => {
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a'));
      const cw = 300, ch = 204, cx = Math.round(W / 2 - cw / 2) + 34, cy = Math.round(H / 2 - ch / 2) + 2;
      px.rect(g, cx + 3, cy + 3, cw, ch, '#02060a'); px.rect(g, cx, cy, cw, ch, '#8a5a30'); px.rect(g, cx + 4, cy + 14, cw - 8, ch - 18, '#f0ecdc'); px.rect(g, cx + cw / 2 - 26, cy - 3, 52, 15, '#aab4bc'); px.rect(g, cx + cw / 2 - 26, cy - 3, 52, 2, '#e8f0f4');
      const ink = '#1a2428', x = cx + 12; let y = cy + 20; const font = { outline: false };
      E.font.text(g, 'CASE ' + def.n + (def.title ? ': ' + def.title.toUpperCase() : ''), x, y, '#8a2c26', Object.assign({ scale: 1 }, font)); y += 12;
      E.font.text(g, p.name + (p.age ? ', ' + p.age : ''), x, y, ink, Object.assign({ scale: 2 }, font)); y += 20;
      E.font.text(g, p.where, x, y, '#2c5a6a', font); E.font.text(g, 'Surgeon: ' + (def.duo ? 'Vale and Sokolova' : def.doctor === 'vale' ? 'Dr. Vale' : 'Dr. Sokolova'), x + cw - 24, y, '#2c5a6a', Object.assign({ align: 'right' }, font)); y += 12;
      px.rect(g, x, y, cw - 24, 1, '#b8b4a4'); y += 4;
      for (const para of this.text) { const lines = E.font.wrap(para, cw - 88); for (const l of lines) { E.font.text(g, l, x, y, para.startsWith('First opinion') ? '#8a2c26' : ink, font); y += 9; } y += 4; }
      if (p.face) { const cv = G.bust(p.face, { expr: 'neutral', blink: 1 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, 28, 16, 56, 62, cx + cw - 70, cy + 66, 56, 62); px.reset(g); } px.rect(g, cx + cw - 71, cy + 65, 58, 1, '#7a7468'); px.rect(g, cx + cw - 71, cy + 128, 58, 1, '#7a7468'); }
      // what's new in this case
      if (def.teaches) { E.font.text(g, 'New today: ' + def.teaches, x, cy + ch - 26, '#2c6a4a', font); }
      const I = G.game.input, bx = cx + cw - 12, by = cy + ch - 15, label = def.lightbox && !this.d.film ? 'To the lightbox' : 'Scrub in', tw = E.font.width(label), lw = Glyph.width(I, 'confirm'); Glyph.action(g, I, 'confirm', bx - tw - lw - 4, by); E.font.text(g, label, bx - tw, by + 1, ink, font);
    });
  },
};

// ------------------------------------------------------------------ the Lightbox
const FILM = {
  ribs(g, x, y, w, h, t) { const cx = x + w / 2; for (let i = 0; i < 8; i++) { const yy = y + 16 + i * (h - 34) / 8; px.line(g, Math.round(cx), Math.round(yy), Math.round(x + 18), Math.round(yy + 14), '#7c94a2', 2); px.line(g, Math.round(cx), Math.round(yy), Math.round(x + w - 18), Math.round(yy + 14), '#7c94a2', 2); } px.rect(g, Math.round(cx) - 4, y + 10, 8, h - 20, '#b0c4cc'); for (let i = 0; i < 9; i++) px.rect(g, Math.round(cx) - 5, y + 14 + i * (h - 26) / 9, 10, 2, '#d8e8ee'); },
  flank(g, x, y, w, h, t) { const cx = x + w / 2; for (let i = 0; i < 6; i++) { const yy = y + 12 + i * 16; px.line(g, Math.round(cx - 40), yy, Math.round(x + w - 12), yy + 12, '#7c94a2', 2); } px.rect(g, Math.round(cx) - 50, y + 8, 10, h - 16, '#b0c4cc'); px.line(g, x + 30, y + h - 26, x + w - 20, y + 30, '#e8f4f8', 3); px.ell(g, x + w - 26, y + 38, 6, 4, '#e8f4f8'); },
  skull(g, x, y, w, h, t) { const cx = x + w / 2, cy = y + h / 2 - 6; px.ell(g, Math.round(cx), Math.round(cy), w * .38, h * .4, '#a8bcc6'); px.ell(g, Math.round(cx), Math.round(cy), w * .33, h * .35, '#1a2830'); px.rect(g, Math.round(cx) - 22, Math.round(cy + h * .36), 44, 18, '#7c94a2'); for (let i = 0; i < 5; i++) px.rect(g, Math.round(cx) - 20 + i * 9, Math.round(cy + h * .4), 6, 8, '#d8e8ee'); for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 8 + i * 2.3; px.dot(g, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * .8), '#3c4e58'); } },
  belly(g, x, y, w, h, t) { const cx = x + w / 2; px.rect(g, Math.round(cx) - 5, y + 6, 10, h - 12, '#b0c4cc'); for (let i = 0; i < 7; i++) px.rect(g, Math.round(cx) - 6, y + 10 + i * 18, 12, 3, '#d8e8ee'); px.poly(g, [[x + 16, y + h - 12], [x + 34, y + h - 44], [Math.round(cx) - 8, y + h - 34], [Math.round(cx) - 8, y + h - 10]], '#7c94a2'); px.poly(g, [[x + w - 16, y + h - 12], [x + w - 34, y + h - 44], [Math.round(cx) + 8, y + h - 34], [Math.round(cx) + 8, y + h - 10]], '#7c94a2'); },
};
G.scenes.lightbox = {
  pausable: true, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) { const game = G.game; this.d = d; this.def = G.CASES[d.caseId]; this.L = this.def.lightbox; this.t = 0; this.tries = 0; this.state = 'mark'; this.c = G.Cursor.make(213, 120); this.msg = this.L.lines[0]; this.who = 'odalys'; this.expr = 'smile'; this.lineI = 0; this.bonus = 0; this.percy = 'neutral'; this.mouseT = game.input.mouse.t; this.mouseMode = false; G.Music.play('tension'); G.Babble.say('odalys', this.msg.slice(0, 40)); game.input.consumeAll(); G.Screen.cursor(game, false); if (game.saves) game.saves.canSave = false; },
  exit() { G.Screen.cursor(G.game, true); },
  rect(W, H) { const w = 214, h = 186, x = Math.round(W / 2 - w / 2) - 28, y = Math.round(H / 2 - h / 2) + 2; return { x, y, w, h }; },
  markXY(W, H) { const f = this.rect(W, H); return [f.x + this.L.mark[0] * f.w, f.y + this.L.mark[1] * f.h]; },
  update(dt) {
    const game = G.game, I = game.input, W = game.W, H = game.H; this.t += dt; game.focus(W / 2, H / 2, 0);
    if (this.state === 'done') { this.doneT -= dt; if (this.doneT <= 0 || (this.doneT < 1.4 && (I.pressed('confirm') || I.clicked()))) G.Flow.startCase(this.def.id, { lightbox: this.bonus > 0, clockAdj: -10 * this.tries }); return; }
    if (I.mouse.t !== this.mouseT) { this.mouseT = I.mouse.t; this.mouseMode = true; }
    const aim = I.padAim || I.padMove || [0, 0], keys = [(I.down('curR') ? 1 : 0) - (I.down('curL') ? 1 : 0), (I.down('curD') ? 1 : 0) - (I.down('curU') ? 1 : 0)];
    if (Math.hypot(aim[0], aim[1]) > .05 || keys[0] || keys[1]) this.mouseMode = false;
    const p = this.mouseMode ? I.pointer() : null;
    G.Cursor.update(this.c, { stick: I.padAim ? I.padAim : I.padMove, keys, fine: I.down('fine'), mouse: p, speed: 1, bounds: [W, H, 0, 0] }, null, null, dt);
    if (I.pressed('useTool')) {
      const m = this.markXY(W, H), d = U.dist(this.c.x, this.c.y, m[0], m[1]);
      if (d <= 14) { this.bonus = 1; this.state = 'done'; this.doneT = 2.4; this.msg = this.L.right; this.who = 'odalys'; this.expr = 'shout'; G.Sfx.found(); G.Sfx.chime(); game.flash('#ffffff', .1, .4); G.Babble.say('odalys', this.msg.slice(0, 40)); I.rumble(.4, .1); }
      else { this.tries++; G.Sfx.miss(); I.rumble(.3, .1); this.percy = 'smirk'; if (this.tries >= 3) { this.state = 'done'; this.doneT = 3; this.msg = this.L.reveal || 'Right there. It is all right, Doctor. It hums at me too.'; this.who = 'odalys'; this.expr = 'sad'; this.reveal = true; } else { this.msg = this.L.wrong[(this.tries - 1) % this.L.wrong.length]; this.who = 'percy'; this.expr = 'smirk'; } G.Babble.say(this.who, this.msg.slice(0, 40)); }
    }
  },
  draw(r) {
    const W = r.W, H = r.H; G.Stage.draw(r, 'radiology', this.t); const f = this.rect(W, H), L = this.L;
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#02060a'));
      // the glowing frame and the film
      px.rect(g, f.x - 4, f.y - 4, f.w + 8, f.h + 8, '#d8f0ff'); px.rect(g, f.x - 1, f.y - 1, f.w + 2, f.h + 2, '#2a3a44'); px.rect(g, f.x, f.y, f.w, f.h, '#101c24');
      for (let i = 0; i < 34; i++) { const x = f.x + (i * 73) % f.w, y = f.y + (i * 41) % f.h; px.polyDither(g, [[x, y], [x + 24, y + 4], [x + 18, y + 20], [x - 4, y + 16]], '#3a5060', .35); }
      FILM[L.film](g, f.x, f.y, f.w, f.h, this.t);
      // the anomaly: it hums
      const m = this.markXY(W, H), pulse = Math.sin(this.t * 5) * 1.2; px.ell(g, Math.round(m[0]), Math.round(m[1]), 5 + pulse, 4 + pulse, L.anomaly || '#c8e8e8'); if (this.state === 'done' || this.reveal) { Pix.ring(g, m[0], m[1], 12 + pulse, '#5ff0e0'); Pix.ring(g, m[0], m[1], 13 + pulse, '#ffffff', 2); }
      for (let i = 0; i < 90; i++) { const a = (i * 137 + (this.t * 12 | 0) * 31) % f.w, b = (i * 59 + (this.t * 12 | 0) * 17) % f.h; px.dot(g, f.x + a, f.y + b, '#3a4c58'); }
      // the sticky note with the first opinion
      const nx = f.x + f.w + 12, ny = f.y + 2, nw = 104; px.rect(g, nx + 2, ny + 2, nw, 58, '#02060a'); px.rect(g, nx, ny, nw, 58, '#efe07a'); px.rect(g, nx, ny, nw, 8, '#d8c858'); E.font.text(g, 'FIRST OPINION', nx + 4, ny + 1, '#5a4a10', { outline: false, font: 'tiny' }); E.font.wrap(L.opinion, nw - 8).forEach((l, i) => E.font.text(g, l, nx + 4, ny + 12 + i * 9, '#1a1a10', { outline: false })); E.font.text(g, '- ' + (L.by || 'Dr. Whitlock'), nx + nw - 4, ny + 48, '#5a4a10', { outline: false, align: 'right' });
      Pix.text(g, 'Mark what is', nx + nw / 2 - 1, ny + 62, '#ffd36a', { align: 'center' }); Pix.text(g, 'really wrong', nx + nw / 2 - 1, ny + 71, '#ffd36a', { align: 'center' }); for (let i = 0; i < 3; i++) px.rect(g, nx + 30 + i * 16, ny + 80, 12, 6, i < this.tries ? '#7a2020' : '#2a6a68');
      // who is talking
      const cv = G.bust(this.who, { expr: this.expr, talk: (this.t * 9 | 0) % 2 && this.t % 2 < 1.4 ? 1 : 0, blink: (this.t % 3.3) < .1 ? 1 : 0 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, 28, 16, 56, 62, W - 62, H - 66, 56, 62); px.reset(g); }
      const bw = Math.min(W - 80, 330); Pix.panel(g, W - 66 - bw, H - 40, bw, 34, { alpha: .92 }); Pix.text(g, G.castName(this.who), W - 60 - bw, H - 37, '#ffd36a'); E.font.wrap(this.msg, bw - 12).slice(0, 2).forEach((l, i) => Pix.text(g, l, W - 60 - bw, H - 27 + i * 9, '#ffffff'));
      // the pointer
      if (this.state === 'mark') { const X = Math.round(this.c.x), Y = Math.round(this.c.y); Pix.ring(g, X, Y, 8, '#ffffff'); px.rect(g, X - 12, Y, 6, 1, '#ffffff'); px.rect(g, X + 7, Y, 6, 1, '#ffffff'); px.rect(g, X, Y - 12, 1, 6, '#ffffff'); px.rect(g, X, Y + 7, 1, 6, '#ffffff'); const I = G.game.input, w = Glyph.action(g, I, 'useTool', X + 11, Y + 8); Pix.text(g, 'Mark', X + 13 + w, Y + 9, '#ffffff'); }
      if (this.state === 'done' && this.bonus) { E.font.text(g, 'SECOND OPINION CONFIRMED', f.x + f.w / 2, f.y + 10, '#5ff0e0', { align: 'center', outline: false, shadow: '#000' }); E.font.text(g, '+20 seconds  +20 Steady', f.x + f.w / 2, f.y + 22, '#ffffff', { align: 'center', outline: false, shadow: '#000' }); }
    });
  },
};
})();
