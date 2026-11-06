/* scenes/about.js: About / Credits. Paged, big text, no scrolling wall. Everything comes from the exit interview build.mjs
 * injected, so the screen, the file and the chat reply cannot disagree. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const FIELDS = [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'], ['artDirection', 'Art Direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'], ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']];
const Q = {
  'Testing Feedback': ['How many issues did testing catch?', 'How many were critical?', 'Most helpful test', 'Least helpful test'],
  'Engine Feedback': ['Liked most', 'Stuck or guessed wrong', 'Most important thing built', 'Hardest part', 'Changed in the engine', 'One change'],
  'Prompt Feedback': ['Liked most', 'Confusing', 'Hardest', 'Would change']
};
let pages = [], page = 0, pills = null;
function paginate() {
  const A = G.ABOUT, si = A.sourceInformation || {}, W = game.W, maxW = W - 40, H = game.H - 78, lh = 9, out = [];
  const addSection = (title, rows) => { let cur = { title, rows: [] }, used = 0; for (const [k, v] of rows) { const lines = E.font.wrap(String(v === undefined || v === '' ? 'unknown' : v), maxW), need = (lines.length + 1) * lh + 5; if (used + need > H && cur.rows.length) { out.push(cur); cur = { title, rows: [] }; used = 0; } cur.rows.push({ k, lines: lines.slice(0, Math.floor(H / lh) - 1) }); used += need; } out.push(cur); };
  addSection('Source Information', FIELDS.map(([k, label]) => [label, si[k]]));
  const fb = (name, key) => addSection(name, Q[name].map((q, i) => [q, (A[key] || [])[i]]));
  fb('Testing Feedback', 'testingFeedback'); fb('Engine Feedback', 'engineFeedback'); fb('Prompt Feedback', 'promptFeedback');
  addSection('Credits', [['Engine', 'my-3D2dge ' + E.version + ' by Michael Crosato, with its built-in props and modules'], ['Motion', 'Mesh2Motion and Quaternius (CC0); CMU Graphics Lab Motion Capture Database (free for all uses)'], ['Asset store sources', G.DATA.lines.credits.assets], ['Everything else', G.DATA.lines.credits.everythingElse]]);
  return out;
}
G.aboutPages = paginate;
const step = d => { page = (page + d + pages.length) % pages.length; G.A.sfx('tick'); };
G.scenes.about = {
  view: 'brawler', camera: { zoom: false },
  enter() { pages = paginate(); page = 0; G.L.enabled = false; G.music('studio'); G.talk.close();
    pills = new G.Pills([{ label: 'Previous', id: 'prev' }, { label: 'Next', id: 'next' }, { label: 'Back', id: 'back' }], { layout: 'h', y: () => game.H - 30, w: 84, h: 20, i: 1, onPick(i, it) { if (it.id === 'prev') step(-1); else if (it.id === 'next') step(1); else G.go('title'); }, onBack() { G.go('title'); } }); },
  update(dt) { G.stageCam(30, 8); pills.update(dt); },
  draw(r) {
    G.ROOMS.studio(r);
    r.overlay(g => {
      const W = game.W, H = game.H, p = pages[page]; G.panel(g, 10, 8, W - 20, H - 44, { r: 8 });
      txt(g, p.title, 20, 13, '#14a8c8', { scale: 2 }); txt(g, (page + 1) + ' / ' + pages.length, W - 72, 16, '#5f7f8a', { align: 'right' });
      let y = 34; for (const row of p.rows) { txt(g, row.k, 20, y, '#14a8c8'); y += 9; for (const l of row.lines) { txt(g, l, 20, y, '#20404c'); y += 9; } y += 5; }
      pills.draw(g);
    });
  }
};
})();
