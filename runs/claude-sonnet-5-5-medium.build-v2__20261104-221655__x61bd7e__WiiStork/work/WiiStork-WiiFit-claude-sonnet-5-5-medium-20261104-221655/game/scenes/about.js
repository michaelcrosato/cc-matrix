// About / Credits: paged, big text. Everything comes from G.ABOUT (the exit-interview JSON injected by build.mjs).
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const SI = [['Date', 'date'], ['Source', 'source'], ['Plan', 'plan'], ['Genre', 'genre'], ['Perspective', 'perspective'], ['Tech', 'tech'], ['Art Direction', 'artDirection'], ['Animation', 'animation'], ['Audio', 'audio'], ['Online', 'online'], ['Testing', 'testing'], ['Research', 'research'], ['Environment', 'environment'], ['Model', 'model'], ['Usage', 'usage']];
const QS = { testingFeedback: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'], engineFeedback: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'], promptFeedback: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'] };
G.aboutPages = () => {
  const A = G.ABOUT || {}, si = A.sourceInformation || {}, pages = [], W = 355;
  const lines = t => E.font.wrap(String(t), W, { scale: 1 }).length;
  const paginate = (title, rows) => { const out = []; let cur = [], h = 0; for (const r of rows) { const rh = 10 + lines(r[1]) * 9 + 6; if (cur.length && h + rh > 150) { out.push(cur); cur = []; h = 0; } cur.push(r); h += rh; } if (cur.length) out.push(cur); out.forEach((rs, i) => pages.push({ title: title + (out.length > 1 ? ' ' + (i + 1) + '/' + out.length : ''), rows: rs })); };
  paginate('Source Information', SI.map(([l, k]) => [l, si[k] || 'unknown']));
  for (const [key, title] of [['testingFeedback', 'Testing Feedback'], ['engineFeedback', 'Engine Feedback'], ['promptFeedback', 'Prompt Feedback']]) { const ans = A[key] || []; paginate(title, QS[key].map((q, i) => [q, ans[i] || 'unknown'])); }
  pages.push({ title: 'Credits', rows: [['Engine', 'my-3D2dge v0.89.0 (MIT). Skeleton puppets drawn as pixel art.'], ['Motion', 'Mesh2Motion and Quaternius (CC0). CMU Graphics Lab Motion Capture Database (free for all uses).'], ['Assets', "The engine's own prop library. Everything else, including Tare and Gerald, was drawn in code."], ['Sound', 'Every note, effect and Animalese word is made in code. No audio files.']] });
  return pages;
};
G.scenes.about = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter() { this.t = 0; this.page = 0; this.pages = G.aboutPages(); this.rects = {}; G.song('studio'); G.idle = 0; },
  update(dt) { const i = G.game.input; this.t += dt; G.tick(dt); if (G.idleCheck(dt)) { G.game.go('attract'); return; } if (i.repeat('right') || i.pressed('confirm')) { if (this.page < this.pages.length - 1) { this.page++; G.snd('tick'); } else if (i.pressed('confirm')) { G.game.go('title'); } } if (i.repeat('left') && this.page > 0) { this.page--; G.snd('tick'); } if (i.pressed('cancel')) { G.snd('back'); G.game.go('title'); }
    const c = i.clicked && i.clicked(); if (c) { const R = this.rects; const hit = k => R[k] && c[0] >= R[k][0] && c[0] < R[k][0] + R[k][2] && c[1] >= R[k][1] && c[1] < R[k][1] + R[k][3]; if (hit('next') && this.page < this.pages.length - 1) this.page++; else if (hit('prev') && this.page > 0) this.page--; else if (hit('back')) G.game.go('title'); } },
  draw(r) {
    G.game.focus(0, 0, 18); G.rooms.reception(r, this.t); const W = r.W, H = r.H, pg = this.pages[this.page];
    r.overlay(g => {
      G.rr(g, 14, 8, W - 28, H - 50, 'rgba(255,255,255,.97)'); G.txt(g, 'About / Credits', W / 2, 12, C.MUTED, { align: 'center' }); G.txt(g, pg.title, W / 2, 22, C.ACC2, { align: 'center', scale: 2 });
      let y = 44; for (const [q, a] of pg.rows) { G.txt(g, q, 28, y, C.ACC2); y += 10; const lines = G.wrap(a, W - 72, 1).slice(0, 9); for (const l of lines) { G.txt(g, l, 28, y, C.INK); y += 9; } y += 6; }
      const by = H - 36; this.rects = { prev: [20, by, 50, 14], next: [W - 70, by, 50, 14], back: [W / 2 - 25, by, 50, 14] };
      G.rr(g, 20, by, 50, 14, this.page > 0 ? C.ACC : '#c8dde2'); G.txt(g, 'Prev', 45, by + 3, '#fff', { align: 'center' }); G.rr(g, W - 70, by, 50, 14, this.page < this.pages.length - 1 ? C.ACC : '#c8dde2'); G.txt(g, 'Next', W - 45, by + 3, '#fff', { align: 'center' }); G.rr(g, W / 2 - 25, by, 50, 14, '#8a8f98'); G.txt(g, 'Back', W / 2, by + 3, '#fff', { align: 'center' }); G.txt(g, (this.page + 1) + ' / ' + this.pages.length, W / 2, by - 10, C.MUTED, { align: 'center' });
    });
    G.prompt(r, [['confirm', 'Next'], ['cancel', 'Back']]);
  }
};
})();
