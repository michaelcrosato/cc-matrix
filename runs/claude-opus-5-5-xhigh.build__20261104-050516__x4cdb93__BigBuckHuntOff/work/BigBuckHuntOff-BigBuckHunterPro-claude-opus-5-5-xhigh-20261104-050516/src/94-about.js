// 94-about: About & Credits: Source Information, the Testing, Engine and Prompt Feedback (the same words as the chat
// reply and exit-interview.json: the build puts report.json in as __REPORT__), and the credits. One idea a page, big text;
// left and right (or L1 and R1, Q and E, a click on the arrows) turn the pages; back leaves.
const QUESTIONS = {
  testingFeedback: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engineFeedback: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'],
  promptFeedback: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
};
const SI_LABELS = [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'], ['artDirection', 'Art direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'], ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']];
/** the pages for a screen of W x Ht: fields packed by their wrapped lines, as many as fit, a long one carried over */
function aboutPages(W = 640, Ht = 360) {
  const R = __REPORT__ || {}, SI = R.sourceInformation || {}, pages = [];
  const tw = Math.min(W - 40, 420) - 28, avail = Ht - 62 - 34 - 18;
  const pack = (title, fields) => {
    let cur = { title, items: [] }, used = 0;
    for (const [label, text] of fields) {
      let lines = E.font.wrap(String(text), tw), first = true;
      while (lines.length) {
        const lab = first ? label : label + ' (continued)', labH = E.font.height(E.font.wrap(lab.toUpperCase(), tw).length) + 3, room = Math.floor((avail - used - labH - 6) / 10);
        if (room < Math.min(3, lines.length) && cur.items.length) { pages.push(cur); cur = { title, items: [] }; used = 0; continue; }
        const take = lines.slice(0, Math.max(1, room)); lines = lines.slice(take.length);
        cur.items.push([lab, take]); used += labH + take.length * 10 + 6; first = false;
        if (lines.length) { pages.push(cur); cur = { title, items: [] }; used = 0; }
      }
    }
    if (cur.items.length) pages.push(cur);
  };
  // Source Information: as many fields a page as fit, so every word stays big
  pack('SOURCE INFORMATION', SI_LABELS.map(([k, l]) => [l, SI[k] || 'unknown']));
  for (const [key, title] of [['testingFeedback', 'TESTING FEEDBACK'], ['engineFeedback', 'ENGINE FEEDBACK'], ['promptFeedback', 'PROMPT FEEDBACK']]) {
    const A = R[key] || []; QUESTIONS[key].forEach((q, i) => pack(title, [[q, A[i] || 'unknown']]));
  }
  const credits = [];
  credits.push({ title: 'CREDITS', items: [['Game', 'BIG BUCK HUNT-OFF. Design, code, pixels and sound made in code by Claude (Anthropic claude-opus-5-5), from a plan by claude-opus-5-5.'], ['Engine', 'my-3D2dge v0.85.2 by Michael Crosato (MIT). New modules: vista (the landscape), quadruped (animals and antlers), babble (voices).'], ['Online', 'AI Hub Session Protocol v1, session client 1.4.0.']] });
  credits.push({ title: 'CREDITS', items: [['Sound', 'Every song, sound and voice is synthesized in code: no audio files.'], ['Assets', 'Furniture shapes from the engine\'s core library. Trees, rocks, corn, reeds and buildings painted in code for this game.'], ['The cast', 'Uncle Dub, Granny Mae, Cousin Dwayne, Loretta Pruitt, Big Earl, the Emcee, Hank the scarecrow, Bessie the cow.']] });
  credits.push({ title: 'CREDITS', items: [['Inspired by', 'Big Buck Hunter Pro (Play Mechanix / Raw Thrills, 2006). An original game: its own title, people, places, bonus games, writing, art and sound.'], ['Thanks', 'To every hunter who ever pumped a plastic shotgun at a bar. Bucks only!']] });
  for (const c of credits) pack(c.title, c.items);
  return pages;
}
const aboutScene = {
  camera: { zoom: false }, touch: [],
  enter(o = {}) { G.scene = 'about'; this.pages = aboutPages(G.game.W, G.game.H); this._size = G.game.W + 'x' + G.game.H; this.i = o.credits ? this.pages.findIndex(p => p.title === 'CREDITS') : 0; this.t = 0; if (G.sfx) G.sfx.music('lodgefire', { fade: .6 }); },
  update(dt) {
    this.t += dt; showcase().update(dt); if (G.sfx) G.sfx.update(dt); if (G.ui.screen) return;
    const turn = d => { const j = clamp(this.i + d, 0, this.pages.length - 1); if (j !== this.i) { this.i = j; UISND.focus(); } };
    if (uiRepeat('right') || uiPressed('tabR')) turn(1); if (uiRepeat('left') || uiPressed('tabL')) turn(-1);
    const c = G.game.input.clicked && G.game.input.clicked(); if (c && this.arrows) { if (c[0] < this.arrows[0]) turn(-1); else if (c[0] > this.arrows[1]) turn(1); }
    if ((uiPressed('confirm') && this.i === this.pages.length - 1) || (uiPressed('cancel') && this.t > .3)) { UISND.back(); G.game.go('menu', { page: 'main' }); }
    else if (uiPressed('confirm')) turn(1);
  },
  draw(r) {
    showcase().draw(r);
    r.overlay(g => {
      const W = r.W, Ht = r.H; if (this._size !== W + 'x' + Ht) { const t0 = this.pages[this.i] && this.pages[this.i].title; this.pages = aboutPages(W, Ht); this._size = W + 'x' + Ht; this.i = Math.max(0, Math.min(this.pages.findIndex(p => p.title === t0) , this.pages.length - 1)); }   // (a new window size re-wraps the pages)
      const P = this.pages[this.i]; dim(g, W, Ht, .7);
      const bw = Math.min(W - 40, 420), x = W / 2 - bw / 2, y = 22, bh = Ht - 62;
      E.ui.box(g, x, y, bw, bh, { bg: ['#2e2014', '#140c06'], border: '#c8843a', alpha: .95 });
      E.font.title(g, P.title, W / 2, y + 8, { scale: 2, colors: ['#fff6d8', '#f0b050', '#c86a20'], outline: '#1a0c08', depth: 2, depthColor: '#4a2a10', align: 'center' });
      let yy = y + 34;
      for (const [label, text] of P.items) {
        E.font.text(g, label.toUpperCase(), x + 14, yy, '#ffd040', { outline: false, wrap: bw - 28 }); yy += E.font.height(E.font.wrap(label.toUpperCase(), bw - 28).length) + 3;
        const lines = Array.isArray(text) ? text : E.font.wrap(String(text), bw - 28); for (const l of lines) { E.font.text(g, l, x + 14, yy, '#f0e6d4', { outline: false }); yy += 10; }
        yy += 6;
      }
      E.font.text(g, (this.i + 1) + ' / ' + this.pages.length, W / 2, y + bh - 12, '#b8a488', { align: 'center', outline: false });
      const ax0 = x - 14, ax1 = x + bw + 14; this.arrows = [x, x + bw];
      if (this.i > 0) px.poly(g, [[ax0 + 8, Ht / 2 - 8], [ax0, Ht / 2], [ax0 + 8, Ht / 2 + 8]], '#ff8a3a');
      if (this.i < this.pages.length - 1) px.poly(g, [[ax1 - 8, Ht / 2 - 8], [ax1, Ht / 2], [ax1 - 8, Ht / 2 + 8]], '#ff8a3a');
      promptBar(g, W, Ht, [['left', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
