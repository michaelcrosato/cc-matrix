// Results: "CASE CLOSED", then four tiles one at a time, each with a tick, then the rank stamp and Quill's line. No tables. And the Lost screen.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph;
G.scenes = G.scenes || {};
const RANK_LINES = { S: ['...Hm. I shall tell no one. You would only get ideas.', 'I have passed instruments to three people who could do that. Sit down, Doctor.', 'Textbook. I may write the textbook. It would be short.'],
  A: ['Very good, Doctor. The patient will never know how good. That is the job.', 'I have seen that done better, once. She is in a textbook now.', 'That will hold. You may breathe.'],
  B: ['Alive and in one piece. We have had worse Tuesdays.', 'A respectable performance. Nobody fainted. I checked.', 'It will scar neatly. So will you.'],
  C: ['The patient lives. I would not mention the rest at dinner.', 'I have seen worse. He was a plumber. He was also the surgeon.', 'A win is a win, Doctor. Ask the patient. Not yet, though.'],
  D: ['We will call that a learning experience. For everyone in the room.', 'She lived. I would like that noted, and nothing else.', 'I shall get the mop.'] };
const LOST_LINES = { vitals: ['Time of death, oh-four-twelve. I am sorry, Doctor. Wash, and we go again.', 'We do not get that one back. Except here, tonight, we do.', 'She is gone, Doctor. Look at me. Again, from the top of this.'], clock: ['Time of death, oh-four-twelve.', 'We ran out of night, Doctor.'], bomb: ['That was the ship, Doctor. Mercifully, a rehearsal.', 'Boom. As she warned you. Once more.'] };
G.RANK_LINES = RANK_LINES; G.LOST_LINES = LOST_LINES;
G.scenes.results = {
  pausable: false, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) { const game = G.game; this.d = d; this.S = d.S; this.t = 0; this.shown = 0; this.tick = 0; this.stamped = false; this.done = false; const S = this.S; const list = RANK_LINES[S.rank] || RANK_LINES.B; this.line = list[(S.seed >>> 0) % list.length]; G.Screen.cursor(game, true); game.input.consumeAll(); G.Music.play(null); this.tiles = [
      { label: 'Time left', val: fmt(S.clock), f: S.clock / S.clockMax }, { label: 'Pulse held', val: String(Math.round(S.stats.vN ? S.stats.vSum / S.stats.vN : S.vitals)), f: (S.stats.vN ? S.stats.vSum / S.stats.vN : S.vitals) / 99 },
      { label: 'Technique', val: Math.round(G.Score.technique(S) * 100) + '%', f: G.Score.technique(S) }, { label: 'Best Flow', val: 'x' + S.bestFlow, f: Math.min(1, S.bestFlow / 30) } ]; this.who = G.Op.def(S).duo ? 'quill' : (G.Op.def(S).doctor || 'vale'); },
  update(dt) {
    const game = G.game, I = game.input; this.t += dt; game.focus(game.W / 2, game.H / 2, 0);
    const interval = .55; const want = Math.min(4, Math.floor(this.t / interval)); while (this.shown < want) { this.shown++; G.Sfx.tone(600 + this.shown * 120, 600 + this.shown * 120, .07, 'square', .08); I.rumble(.1, .03); }
    if (this.t > 2.6 && !this.stamped) { this.stamped = true; G.Sfx.stamp(); game.shake(3); I.rumble(.7, .2); G.Babble.say('quill', this.line.slice(0, 40)); game.saves && (game.saves.canSave = false); }
    if (this.d.autoT !== undefined) { this.d.autoT -= dt; if (this.d.autoT <= 0) this.d.onDone(); return; }
    if ((I.pressed('confirm') || I.clicked())) { if (!this.stamped) { this.t = 2.6; this.shown = 4; } else if (this.t > 3) { G.Sfx.menuOk(); if (this.d.onDone) this.d.onDone(); else G.Flow.afterResults(); } }
  },
  draw(r) {
    const W = r.W, H = r.H, S = this.S; G.Stage.draw(r, 'gallery', this.t);
    r.overlay(g => {
      px.blend(g, .62, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a'));
      E.font.text(g, 'CASE CLOSED', W / 2, 12, '#ffe27a', { scale: 3, align: 'center', outline: false, shadow: '#3a1a08' }); const def = G.Op.def(S); E.font.text(g, def.patient ? def.patient.name + ', ' + def.title : def.title, W / 2, 38, '#c8e0dc', { align: 'center', outline: false });
      const tw = 96, th = 66, gap = 8, x0 = Math.round(W / 2 - (tw * 4 + gap * 3) / 2) , y = 56; this.tiles.forEach((q, i) => { if (i >= this.shown) return; const x = x0 + i * (tw + gap); Pix.panel(g, x, y, tw, th, { alpha: .92 }); Pix.text(g, q.label, x + tw / 2, y + 5, '#a8c8c0', { align: 'center' }); E.font.text(g, q.val, x + tw / 2, y + 20, '#ffffff', { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.ui.bar(g, x + 8, y + 44, tw - 16, 5, Math.max(0, Math.min(1, q.f)), '#5ff0e0'); Pix.text(g, '✓', x + tw - 11, y + 5, '#9fffc0'); });
      if (this.stamped) {
        const u = Math.min(1, (this.t - 2.6) * 6), s = Math.round(9 - 3 * u), cx = W / 2 - 80, cy = 124; E.font.text(g, S.rank, cx, cy + 4, S.rank === 'S' ? '#ffe27a' : S.rank === 'D' ? '#ff9a8a' : '#e8fbf6', { scale: s, align: 'center', outline: false, shadow: '#3a1a08' }); if (S.star) E.font.text(g, '★ Textbook', cx, cy + 44, '#ffe27a', { align: 'center', outline: false, shadow: '#000' });
        Pix.text(g, 'SCORE ' + Math.round(S.score), W / 2 + 76, 132, '#ffffff', { align: 'center', scale: 1 }); Pix.text(g, G.DIFFS[S.diff].label, W / 2 + 76, 144, '#a8c8c0', { align: 'center' }); if (S.capB) Pix.text(g, 'Retried: rank capped at B', W / 2 + 76, 156, '#ffa890', { align: 'center' }); if (this.d.dev) Pix.text(g, 'DEV: no rank saved', W / 2 + 76, 156, '#ffd36a', { align: 'center' });
        const cv = G.bust('quill', { expr: 'neutral', blink: (this.t % 3) < .1 ? 1 : 0 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, 28, 16, 56, 62, 4, H - 62, 56, 62); px.reset(g); }
        const doc = G.Op.def(S).doctor || 'vale', dc = G.bust(doc, { expr: 'smile', maskUp: this.t < 3.4, blink: (this.t % 3.4) < .1 ? 1 : 0 }); if (g.drawImage && W >= 470) { g.imageSmoothingEnabled = false; g.drawImage(dc, 28, 16, 56, 62, W - 60, H - 62, 56, 62); px.reset(g); }
        const bw = Math.min(W - 70 - (W >= 470 ? 60 : 0), 354); Pix.panel(g, 62, H - 42, bw, 36, { alpha: .92 }); Pix.text(g, 'NURSE QUILL', 67, H - 39, '#ffd36a'); E.font.wrap(this.line, bw - 12).slice(0, 2).forEach((l, i) => Pix.text(g, l, 67, H - 29 + i * 9, '#ffffff'));
        if (this.t > 3 && this.d.autoT === undefined) { const I = G.game.input, w = Glyph.width(I, 'confirm'), x = W - w - 58, y2 = H - 56; Glyph.action(g, I, 'confirm', x, y2); Pix.text(g, 'Continue', x + w + 3, y2 + 1, '#ffffff'); }
      }
    });
  },
};
const fmt = s => String(Math.max(0, s) / 60 | 0).padStart(2, '0') + ':' + String(Math.max(0, s) % 60 | 0).padStart(2, '0');

G.scenes.lost = {
  pausable: false, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) {
    const game = G.game; this.d = d; this.S = d.S; this.t = 0; const list = LOST_LINES[this.S.lost] || LOST_LINES.vitals; this.line = list[(this.S.seed >>> 0) % list.length]; G.Babble.say('quill', this.line.slice(0, 40)); G.Music.sting('lost'); G.Screen.cursor(game, true);
    const items = ['Retry from this phase', 'Restart case']; this.act = ['retry', 'restart'];
    if (d.fails >= 2 && this.S.diff !== 'intern') { items.push('Intern, for this case'); this.act.push('ease'); }
    items.push(G.Flow.origin === 'files' ? 'Back to Case Files' : 'Quit to title'); this.act.push('quit');
    this.menu = new E.Menu(game, items, { x: 'center', y: 118, scale: 2, rows: 4, bg: '#06181c', border: '#ff7a6a', pick: '#ffd36a', sound: false, onMove: () => G.Sfx.menuMove(), onPick: i => this.pick(this.act[i]), onCancel: null }); game.input.consumeAll();
  },
  pick(a) {
    const game = G.game, S = this.S; G.Sfx.menuOk();
    if (a === 'retry') { G.Op.retryPhase(S); game.go('op', { resume: S, caseId: S.caseId }); }
    else if (a === 'restart') G.Flow.startCase(S.caseId, { lightbox: !!S.flags.lightbox, mode: S.mode });
    else if (a === 'ease') { G.Flow.overrideDiff[S.caseId] = 'intern'; G.Flow.startCase(S.caseId, { lightbox: !!S.flags.lightbox, mode: S.mode }); }
    else if (G.Flow.origin === 'files') G.Flow.quitToFiles(); else game.go('title');
  },
  update(dt) { this.t += dt; const game = G.game; game.focus(game.W / 2, game.H / 2, 0); if (this.t > .5) this.menu.update(dt); },
  draw(r) {
    const W = r.W, H = r.H; r.sky(['#040608', '#040608']);
    r.overlay(g => {
      px.rect(g, 0, H / 2 - 70, W, 1, '#6cf0a0'); const k = Math.min(1, this.t / 1.2); px.rect(g, 0, 56, W * k, 2, '#ff6a5a');
      E.font.text(g, this.S.lost === 'bomb' ? 'THE SHIP WENT DOWN' : this.S.lost === 'clock' ? 'OUT OF TIME' : 'PATIENT LOST', W / 2, 14, '#ff7a6a', { scale: 3, align: 'center', outline: false, shadow: '#000' });
      const cv = G.bust('quill', { expr: 'sad', blink: (this.t % 3) < .1 ? 1 : 0 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, 28, 16, 56, 62, 8, 62, 56, 62); px.reset(g); }
      E.font.wrap(this.line, W - 90).slice(0, 3).forEach((l, i) => Pix.text(g, l, 72, 72 + i * 11, '#ffffff'));
      if (this.d.fails >= 2 && this.S.diff !== 'intern') Pix.text(g, 'Doctor. There is no shame in Intern. I will not even look.', W / 2, 106, '#ffd36a', { align: 'center' });
    });
    this.menu.draw(r);
  },
};
})();
