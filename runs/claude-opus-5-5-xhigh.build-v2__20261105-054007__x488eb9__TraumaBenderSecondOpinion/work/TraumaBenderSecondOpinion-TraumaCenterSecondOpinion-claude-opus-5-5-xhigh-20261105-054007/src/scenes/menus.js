// Case Files (one big folder at a time), About/Credits (one section per page) and the ending's roll.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph;
G.scenes = G.scenes || {};
const STAMP_COL = { S: '#ffe27a', A: '#9fffc0', B: '#bfe6dc', C: '#c8c4b4', D: '#ffa890' };
G.scenes.casefiles = {
  pausable: false, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) { this.t = 0; this.i = d.i || 0; this.hp = null; G.Screen.cursor(G.game, true); G.Music.play('ward'); G.game.input.consumeAll(); this.list = this.entries(); this.i = Math.min(this.i, this.list.length - 1); this.side = 0; },
  entries() { const out = []; for (const id of G.CASE_ORDER) out.push({ kind: 'case', id }); out.push({ kind: 'lab' }); if (G.Flow.endingSeen()) out.push({ kind: 'incoming' }); return out; },
  go() {
    const e = this.list[this.i], game = G.game;
    if (e.kind === 'case') { if (!G.Flow.unlocked(e.id)) { G.Sfx.miss(); return; } G.Flow.origin = 'files'; game.go('chart', { caseId: e.id }); }
    else if (e.kind === 'lab') { G.Flow.origin = 'files'; const seenC = id => G.Flow.unlocked(id), labOnly = ['l1', 'l2', 'l3', 'l9']; if (seenC('lowbrass')) labOnly.push('l4', 'l5', 'l6', 'l7'); if (seenC('whistling')) labOnly.push('l10', 'l11'); if (seenC('fromthetop')) labOnly.push('l8'); game.go('op', { caseId: 'lab', mode: 'lab', difficulty: 'intern', labOnly, dev: { lock: true, freeze: true, noTut: true } }); }
    else if (e.kind === 'incoming') { G.Sfx.tick(); }
    G.Sfx.menuOk();
  },
  update(dt) {
    const game = G.game, I = game.input, W = game.W, H = game.H, n = this.list.length; this.t += dt; game.focus(W / 2, H / 2, 0);
    if (I.repeat('left') || I.pressed('toolPrev')) { this.i = (this.i + n - 1) % n; G.Sfx.menuMove(); this.side = -1; this.flip = .12; } if (I.repeat('right') || I.pressed('toolNext')) { this.i = (this.i + 1) % n; G.Sfx.menuMove(); this.side = 1; this.flip = .12; }
    this.flip = Math.max(0, (this.flip || 0) - dt);
    const c = I.clicked();
    if (c) { if (c[0] < 40) { this.i = (this.i + n - 1) % n; G.Sfx.menuMove(); } else if (c[0] > W - 40) { this.i = (this.i + 1) % n; G.Sfx.menuMove(); } else this.go(); }
    else if (I.pressed('confirm')) this.go(); else if (I.pressed('cancel')) { G.Sfx.tick(); game.go('menu'); }
  },
  draw(r) {
    const W = r.W, H = r.H, e = this.list[this.i], off = Math.round((this.flip || 0) * this.side * 300); G.Stage.draw(r, 'radiology', this.t);
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a')); E.font.text(g, 'CASE FILES', W / 2, 6, '#ffd36a', { align: 'center', outline: false, shadow: '#000' });
      const fw = 330, fh = 192, fx = Math.round(W / 2 - fw / 2) + off, fy = 22;
      px.rect(g, fx + 3, fy + 3, fw, fh, '#02060a'); px.rect(g, fx, fy + 8, fw, fh - 8, '#c8a868'); px.rect(g, fx, fy, 90, 12, '#c8a868'); px.rect(g, fx, fy + 8, fw, 2, '#e8cc88'); px.rect(g, fx + 6, fy + 16, fw - 12, fh - 22, '#efe8d4');
      const ink = '#1a2428', f = { outline: false }, x = fx + 14; let y = fy + 22;
      if (e.kind === 'case') {
        const def = G.CASES[e.id], open = G.Flow.unlocked(e.id); E.font.text(g, 'CASE ' + def.n, fx + 8, fy + 2, '#5a3a10', f);
        E.font.text(g, open ? def.title : '? ? ?', x, y, ink, Object.assign({ scale: 2 }, f)); y += 20;
        if (open) {
          E.font.text(g, def.patient.name + ', ' + def.patient.where, x, y, '#2c5a6a', f); y += 12;
          const F = G.siteField(def.site, W, H, def.seed || 11); if (!F._shadedOnce) { F.shade({ beat: 0 }); F._shadedOnce = true; }
          const pw = 186, ph = 96; if (g.drawImage && F.cv) { g.imageSmoothingEnabled = false; g.drawImage(F.cv, (W - pw) / 2 | 0, (H / 2 - 4 - ph / 2) | 0, pw, ph, x, y, pw, ph); px.reset(g); } px.rect(g, x - 1, y - 1, pw + 2, 1, '#7a7468'); px.rect(g, x - 1, y + ph, pw + 2, 1, '#7a7468');
          const best = G.Flow.bestRanks()[e.id] || {}; ['intern', 'resident', 'attending'].forEach((d, k) => { const bx = x + pw + 10, by = y + k * 33, rk = best[d]; px.rect(g, bx, by, 96, 30, rk ? '#fff8e4' : '#e0d8c4'); E.font.text(g, G.DIFFS[d].label, bx + 3, by + 2, '#6a5a3a', f); if (rk) { E.font.text(g, rk.rank, bx + 46, by + 11, STAMP_COL[rk.rank] === '#ffe27a' ? '#b8841c' : '#8a2c26', Object.assign({ scale: 2, align: 'center' }, f)); if (rk.star) E.font.text(g, '★', bx + 76, by + 13, '#b8841c', f); } else E.font.text(g, '-', bx + 46, by + 13, '#a89878', Object.assign({ align: 'center' }, f)); });
        } else { E.font.text(g, 'Not on your rounds yet, Doctor.', x, y + 30, '#6a5a3a', f); px.rect(g, x + 40, y + 58, 200, 34, '#a84a3a'); px.rect(g, x + 42, y + 60, 196, 30, '#efe8d4'); E.font.text(g, 'LOCKED', x + 140, y + 66, '#a84a3a', Object.assign({ scale: 2, align: 'center' }, f)); }
      } else if (e.kind === 'lab') {
        E.font.text(g, 'LAB', fx + 8, fy + 2, '#5a3a10', f); E.font.text(g, 'Skills Lab', x, y, ink, Object.assign({ scale: 2 }, f)); y += 22; for (const l of ['No clock. Vitals locked.', 'One of everything you have reached, again and again.', '', 'Nurse Quill: "This is a pig\'s trotter. It has signed the waiver."']) { E.font.wrap(l, fw - 34).forEach(q => { E.font.text(g, q, x, y, ink, f); y += 11; }); if (!l) y += 4; }
      } else { E.font.text(g, 'CASE 12', fx + 8, fy + 2, '#5a3a10', f); E.font.text(g, 'Incoming', x, y, ink, Object.assign({ scale: 2 }, f)); y += 30; E.font.text(g, 'The chart is blank.', x, y, ink, f); y += 14; E.font.text(g, 'Next shift starts at seven. Get some sleep, Doctor.', x, y, ink, f); }
      Pix.text(g, '◄', 12, H / 2, '#ffffff', { scale: 2 }); Pix.text(g, '►', W - 24, H / 2, '#ffffff', { scale: 2 });
      const I = G.game.input; let cx = 8; const y2 = H - 14; if (e.kind !== 'incoming') { cx += Glyph.action(g, I, 'confirm', cx, y2) + 3; Pix.text(g, e.kind === 'lab' ? 'Enter the lab' : 'Open the case', cx, y2 + 1, '#ffffff'); cx += 74; } cx += Glyph.action(g, I, 'cancel', cx, y2) + 3; Pix.text(g, 'Back', cx, y2 + 1, '#ffffff');
    });
  },
};

// ------------------------------------------------------------------ About/Credits: from src/about-data.json, the same text as the exit interview and the final reply
const ABOUT_ORDER = [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'], ['artDirection', 'Art Direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'], ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']];
const Q_TEST = ['How many issues did testing catch?', 'How many were critical or game breaking?', 'The most helpful test', 'The least helpful test'], Q_ENGINE = ['What I liked most about the engine', 'Did I get stuck or guess wrong?', 'The most important thing I built myself', 'The hardest part of using the engine', 'What I changed in the engine, and why', 'The one thing I would change'], Q_PROMPT = ['What I liked most about this prompt', 'What was confusing', 'The hardest thing to do', 'What I would change in this prompt'];
G.buildAboutPages = (W, H) => {
  const A = window.GAME_ABOUT || { sourceInformation: {}, testingFeedback: [], engineFeedback: [], promptFeedback: [], credits: [] }, pages = [], maxW = Math.min(W - 40, 400), lines = Math.floor((H - 62) / 10);
  const paged = (title, blocks) => { let cur = [], left = lines; const flush = () => { if (cur.length) pages.push({ title, rows: cur }); cur = []; left = lines; }; for (const b of blocks) { const body = E.font.wrap(String(b.text), maxW - (b.head ? 8 : 0)), need = body.length + (b.head ? 1 : 0) + 1; if (need > left && cur.length) flush(); if (b.head) cur.push({ t: b.head, c: '#ffd36a' }); for (const l of body) cur.push({ t: l, c: b.c || '#ffffff', i: b.head ? 8 : 0 }); cur.push({ t: '', c: '' }); left -= need; } flush(); };
  paged('Source Information', ABOUT_ORDER.map(([k, label]) => ({ head: label, text: A.sourceInformation[k] ?? 'unknown' })));
  paged('Testing Feedback', Q_TEST.map((q, i) => ({ head: q, text: A.testingFeedback[i] ?? 'unknown' })));
  paged('Engine Feedback', Q_ENGINE.map((q, i) => ({ head: q, text: A.engineFeedback[i] ?? 'unknown' })));
  paged('Prompt Feedback', Q_PROMPT.map((q, i) => ({ head: q, text: A.promptFeedback[i] ?? 'unknown' })));
  paged('Credits', (A.credits || []).map(t => ({ text: t })));
  return pages;
};
G.scenes.about = {
  pausable: false, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) { this.t = 0; this.i = 0; this.d = d; this.W0 = 0; G.Screen.cursor(G.game, true); G.game.input.consumeAll(); },
  update(dt) {
    const game = G.game, I = game.input; this.t += dt; game.focus(game.W / 2, game.H / 2, 0); if (this.W0 !== game.W + game.H) { this.W0 = game.W + game.H; this.pages = G.buildAboutPages(game.W, game.H); }
    const n = this.pages.length; if (I.repeat('left') || I.pressed('toolPrev') || I.repeat('up')) { this.i = (this.i + n - 1) % n; G.Sfx.menuMove(); } if (I.repeat('right') || I.pressed('toolNext') || I.repeat('down')) { this.i = (this.i + 1) % n; G.Sfx.menuMove(); }
    const c = I.clicked(); if (c) { if (c[0] < game.W / 2) this.i = (this.i + n - 1) % n; else this.i = (this.i + 1) % n; G.Sfx.menuMove(); }
    if (I.pressed('cancel')) { G.Sfx.tick(); if (this.d.onDone) this.d.onDone(); else game.go('menu'); }
  },
  draw(r) {
    const W = r.W, H = r.H; r.sky(['#04121a', '#061a20']); if (!this.pages) return; const p = this.pages[this.i];
    r.overlay(g => { E.font.text(g, p.title, W / 2, 6, '#5ff0e0', { scale: 2, align: 'center', outline: false, shadow: '#000' }); const x = Math.round(W / 2 - Math.min(W - 40, 400) / 2); let y = 28; for (const q of p.rows) { if (q.t) Pix.text(g, q.t, x + (q.i || 0), y, q.c); y += 10; } Pix.text(g, (this.i + 1) + ' / ' + this.pages.length, W / 2, H - 13, '#8fb8b0', { align: 'center' }); const I = G.game.input; let cx = 8; cx += Glyph.action(g, I, 'cancel', cx, H - 14) + 3; Pix.text(g, 'Back', cx, H - 13, '#ffffff'); const lw = Glyph.width(I, 'toolPrev') + Glyph.width(I, 'toolNext') + 3; Glyph.action(g, I, 'toolPrev', W - lw - 40, H - 14); Glyph.action(g, I, 'toolNext', W - 37 - Glyph.width(I, 'toolNext'), H - 14); Pix.text(g, 'Page', W - 34, H - 13, '#ffffff'); });
  },
};

// ------------------------------------------------------------------ the ending's roll, then a last scene, then the title
const ROLL = [['TRAUMA BENDER', 'h'], ['SECOND OPINION', 'h2'], [''], ['Dr. Imogen Vale', 'n'], ['who stopped shaking, and then did not'], [''], ['Bartholomew Quill', 'n'], ['who has seen worse. He was a plumber.'], [''], ['Dr. Yevgenia Sokolova', 'n'], ['at her age, everything happens twice'], [''], ['Chief Marguerite Oyelaran', 'n'], ['who took the money, and gave it back'], [''], ['Dr. Percival Whitlock', 'n'], ['whose stitches are crooked'], [''], ['Odalys Ferreira', 'n'], ['always right, always eating'], [''], ['Dr. Lucian Hale', 'n'], ['who only wanted her not to hurt'], [''], ['Clementine Hale', 'n'], ['who can feel her hands'], [''], ['And the patients', 'n'], ['Agnes Pellow, Slide Achebe, Big Tam Rennie, Captain Harrow,'], ['Ilse Brandt, Yusuf Demir, Sister Perpetua, Dr. Hollis Crane'], [''], [''], ['Made of code. No audio files, no image files.'], ['Built on my-3D2dge. An original work, unaffiliated with its inspiration.'], ['Not a medical training tool. Please do not.'], [''], [''], ['Don\'t let it go quiet.', 'h3']];
G.scenes.credits = {
  pausable: false, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d = {}) { this.t = 0; this.d = d; this.state = 'roll'; G.Music.play('ending'); G.game.input.consumeAll(); this.y = G.game.H + 10; G.Screen.cursor(G.game, true); },
  update(dt) {
    const game = G.game, I = game.input; this.t += dt; game.focus(game.W / 2, game.H / 2, 0); const hurry = I.down('confirm') || I.down('useTool') ? 4 : 1;
    if (this.state === 'roll') { this.y -= dt * 18 * hurry; if (this.y < -ROLL.length * 13 - 14) { this.state = 'last'; this.t = 0; G.Music.play('piano'); } }
    else if (this.state === 'last') { if ((I.pressed('confirm') || I.clicked()) && this.t > 1) { this.t = 99; } if (this.t > 9) { this.state = 'after'; game.go('about', { onDone: () => game.go('title') }); } }
  },
  draw(r) {
    const W = r.W, H = r.H;
    if (this.state === 'roll') { G.Stage.draw(r, 'harbor', this.t); r.overlay(g => { px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#02060c')); ROLL.forEach((q, i) => { const y = this.y + i * 13; if (y < -14 || y > H) return; const k = q[1]; E.font.text(g, q[0], W / 2, Math.round(y), k === 'h' ? '#5ff0e0' : k === 'h2' ? '#ffd36a' : k === 'n' ? '#ffd36a' : k === 'h3' ? '#ffffff' : '#c8e0dc', { align: 'center', outline: false, shadow: '#000' }); }); }); }
    else { r.sky(['#000000', '#000000']); r.overlay(g => { const a = Math.min(1, this.t / 1.5); if (this.t > 1) { E.font.text(g, 'CASE FILES. A NEW FOLDER.', W / 2, H / 2 - 40, '#8fb8b0', { align: 'center', outline: false }); E.font.text(g, 'Chart: Incoming', W / 2, H / 2 - 20, '#ffffff', { align: 'center', scale: 2, outline: false }); } if (this.t > 3.2) E.font.text(g, 'Next shift starts at seven.', W / 2, H / 2 + 12, '#ffffff', { align: 'center', outline: false }); if (this.t > 5) E.font.text(g, 'Get some sleep, Doctor.', W / 2, H / 2 + 26, '#ffd36a', { align: 'center', outline: false }); }); }
  },
};
})();
