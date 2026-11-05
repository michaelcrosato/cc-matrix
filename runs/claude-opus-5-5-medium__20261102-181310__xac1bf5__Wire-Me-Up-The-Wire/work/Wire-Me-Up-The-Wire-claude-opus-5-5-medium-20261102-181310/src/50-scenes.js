/* ============================================================================
 * 50-scenes: the title (and its attract mode), chapter cards, BURNED, the ending montage and the case result,
 * chapter select, About / Credits.
 * ========================================================================== */
const TITLE = 'WIRE ME UP';
const CHAPTERS = [
  null,
  { scene: 'corner', name: 'THE CORNER', place: 'Monroe & Fulton, West Baltimore', quote: '"They always come back."', by: 'DET. AUGIE PELL' },
  { scene: 'wire', name: 'THE WIRE', place: 'Western District, the basement', quote: '"That\'s the law, not me."', by: 'NICKY, WIRE ROOM' },
  { scene: 'board', name: 'THE BOARD', place: 'Detail office, over a tire shop', quote: '"Man is a rumor with a lawyer."', by: 'DET. AUGIE PELL' },
  { scene: 'meet', name: 'THE MEET', place: 'Locust Point, after midnight', quote: '"Then go fishing, Detective."', by: 'LT. HASKINS' }
];

/* ---- the title: a corner at dusk, the crew on it, a skyline; the menu over them ---- */
const titleStage = new E.PlatformMap({ rows: ['S'.repeat(70), 'S'.repeat(70)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#5a5a5e' } }, edges: 'open' });
const titleBg = new E.Backdrop({ sky: ['#0e1020', '#3a2a3a', '#a85a3a'], moon: { x: .9, y: .3, r: 9, color: '#f0e0c0' }, stars: 30, starsY: .4,
  layers: [{ kind: 'city', color: '#1a1820', y: .66, height: .34, parallax: .1 }, { kind: 'city', color: '#2a2228', y: .74, height: .22, parallax: .25 }, { kind: 'fog', color: '#6a4a4a', y: .8, height: .1, parallax: .3, drift: 3 }] });
const TMID = 560;
const titleCrew = [
  { rig: CAST.KEV.rig, x: TMID - 150, f: 0 }, { rig: CAST.TATER.rig, x: TMID - 120, f: Math.PI }, { rig: CAST.LOOKOUT.rig, x: TMID + 90, f: Math.PI },
  { rig: CAST.DEE.rig, x: TMID + 175, f: Math.PI, point: true }
];
let titleMenu, titleSub = null, chapterMenu, attract = { on: false, i: 0, t: 0 };
const ATTRACT_SEQ = [['corner', 46], ['wire', 34], ['board', 14], ['meet', 50]];
function newCase() { CASE.reset(); game.go('chapter', { n: 1 }); }
const scenes = {};
scenes.title = {
  view: 'side', views: ['side'], res: 'ps1',
  enter() {
    music('title'); game.resetCamera(); game.follow(null); game.cam.bounds = null; L.enabled = false; game.weather = null; IDLE.t = 0; attract.on = false;
    titleMenu = new E.Menu(game, ['NEW CASE', 'CHAPTERS', 'SETTINGS', 'CONTROLS', 'ABOUT / CREDITS'], { y: 96, onPick: (i) => {
      A.sfx('confirm');
      if (i === 0) newCase(); else if (i === 1) titleSub = 'chapters'; else if (i === 2) game.menu('settings'); else if (i === 3) game.menu('controls'); else game.go('about');
    } });
    chapterMenu = new E.Menu(game, ['1  THE CORNER', '2  THE WIRE', '3  THE BOARD', '4  THE MEET', 'BACK'], { y: 96, onPick: (i) => {
      if (i === 4) { titleSub = null; A.sfx('cancel'); return; }
      A.sfx('confirm'); if (!CASE.photos.length) CASE.reset(); game.go('chapter', { n: i + 1 });
    }, onCancel: () => { titleSub = null; } });
    titleSub = null;
  },
  back() { if (titleSub) { titleSub = null; return true; } return false; },
  update(dt) {
    IDLE.t += dt; if (padActive()) IDLE.t = 0;
    if (IDLE.t > 10) { startAttract(); return; }
    game.focus(TMID, 0, 32 + (game.H / 2 - 40) / -game.view.bz);
    titleCrew.forEach((c, i) => c.rig.update(dt, { x: c.x, y: 0, z: 32, facing: c.f, vx: 0, vy: 0, point: c.point && Math.sin(game.time * .7) > 0, pose: i === 2 ? 'hips' : null }));
    if (touchOnly()) {
      const cl = game.input.clicked(); if (cl) { const b = setBtn(); if (cl[0] >= b.x && cl[0] < b.x + b.w && cl[1] >= b.y && cl[1] < b.y + b.h) game.menu('settings'); }
      return;
    }
    const m = titleSub === 'chapters' ? chapterMenu : titleMenu;
    if (!m.update(dt) && game.input.pressed('start')) { game.input.consumeAll(); m.onPick(m.i, m.items[m.i]); }
    if (titleSub === 'chapters' && game.input.pressed('cancel')) { titleSub = null; A.sfx('cancel'); }
  },
  draw(r) {
    titleBg.draw(r); titleStage.draw(r);
    r.prop('streetlamp', TMID - 80, 0, 32, { size: 1.3, light: false }); r.prop('trashcan', TMID + 70, 4, 32, { size: 1.3 }); r.prop('hydrant', TMID + 10, 6, 32, { size: 1.3 });
    for (const c of titleCrew) r.actor(c.x, 0, 32, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, TITLE, W / 2, 16, { align: 'center', scale: 4, colors: ['#f8f0d8', '#e8c870', '#c87a3a'], outline: '#0a0806', depth: 3, depthColor: '#3a1a10' });
      txt(g, 'a surveillance story of West Baltimore', W / 2, 54, '#d8c8b0', { align: 'center' });
      if (touchOnly()) {
        panel(g, W / 2 - 120, 82, 240, 62, .9);
        txt(g, 'Controller or keyboard required', W / 2, 92, '#ffd060', { align: 'center' });
        txt(g, 'Connect a gamepad or a keyboard to play.', W / 2, 106, '#d8d2c0', { align: 'center' });
        const b = setBtn(); px.rect(g, b.x, b.y, b.w, b.h, '#3a3a44'); px.rect(g, b.x + 1, b.y + 1, b.w - 2, b.h - 2, '#5a5a66'); txt(g, 'SETTINGS', b.x + b.w / 2, b.y + 4, '#ffffff', { align: 'center' });
        txt(g, 'The demo plays by itself if you wait.', W / 2, H - 14, '#a8a090', { align: 'center' });
        return;
      }
      if (titleSub === 'chapters') txt(g, 'CASE FILES', W / 2, 84, '#f0c060', { align: 'center' });
    });
    if (!touchOnly()) (titleSub === 'chapters' ? chapterMenu : titleMenu).draw(r);
    r.overlay(g => {
      if (touchOnly()) return;
      const W = r.W, H = r.H;
      promptRow(g, [[game.input.lastDevice === 'gamepad' ? 'up' : 'Pad:ArrowUp', 'Choose'], ['confirm', 'Select'], ...(titleSub ? [[backAct(), 'Back']] : [])], W / 2, H - 16);
    });
  }
};
const setBtn = () => ({ x: Math.round(game.W / 2 - 40), y: 120, w: 80, h: 16 });

/* ---- the attract mode: the four chapters played by a detective who cannot be seen; any input ends it ---- */
function startAttract() { attract = { on: true, i: 0, t: 0 }; IDLE.any = false; CASE.reset(); game.go(ATTRACT_SEQ[0][0], { attract: true }); }
/** a demo chapter that has shown everything hands over to the next one */
function attractNext() { if (attract.on) attract.t = 1e9; }
function attractTick(dt) {
  if (!attract.on) return false;
  attract.t += dt;
  if (IDLE.any || padActive() && attract.t > .5) { attract.on = false; IDLE.any = false; IDLE.t = 0; game.input.consumeAll(); game.go('title'); return true; }
  if (attract.t > ATTRACT_SEQ[attract.i][1]) { attract.i = (attract.i + 1) % ATTRACT_SEQ.length; attract.t = 0; if (attract.i === 0) CASE.reset(); game.go(ATTRACT_SEQ[attract.i][0], { attract: true }); return true; }
  return false;
}
function attractBanner(r) {
  if (!attract.on) return;
  r.overlay(g => {
    const W = r.W, H = r.H, y = H - 30;
    px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, W, 22, '#000'));
    const blink = Math.floor(game.real * 1.5) % 2 === 0;
    E.font.text(g, 'DEMO  •  ' + TITLE + '  •  ' + CHAPTERS[ATTRACT_SEQ.findIndex(a => a[0] === ATTRACT_SEQ[attract.i][0]) + 1].name, 8, y + 2, '#f0c060', { shadow: '#000', outline: false });
    if (blink) E.font.text(g, 'PRESS ANY BUTTON', W - 8, y + 2, '#ffffff', { align: 'right', shadow: '#000', outline: false });
  });
}

/* ---- chapter cards: the epigraph, the way every episode starts ---- */
let card = null;
scenes.chapter = {
  view: 'side', res: 'ps1',
  enter(d) { card = { n: d.n, t: 0 }; music(null); A.sfx('tape'); L.enabled = false; game.weather = null; },
  update(dt) {
    card.t += dt;
    if (card.t > 1 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.pressed('interact') || game.input.clicked()) || card.t > 6.5) { const c = CHAPTERS[card.n]; game.go(c.scene, { keepCase: true }); }
  },
  draw(r) {
    const c = CHAPTERS[card.n];
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#050505');
      const a = Math.min(1, card.t * 1.5);
      if (a > .2) {
        txt(g, c.quote, W / 2, H / 2 - 30, '#e8e2d0', { align: 'center', scale: 1 });
        txt(g, '- ' + c.by, W / 2, H / 2 - 16, '#a8a090', { align: 'center' });
      }
      if (card.t > 1.4) {
        E.font.title(g, 'CHAPTER ' + card.n, W / 2, H / 2 + 6, { align: 'center', scale: 2, colors: ['#f8f0d8', '#c8a060'], depth: 1 });
        txt(g, c.name + '  •  ' + c.place, W / 2, H / 2 + 26, '#f0c060', { align: 'center' });
      }
      if (card.t > 1) promptRow(g, [['confirm', 'Continue']], W / 2, H - 18);
    });
  }
};

/* ---- burned: made, the case gone cold ---- */
let burned = null;
const burnedMenu = new E.Menu(game, ['TRY AGAIN', 'TITLE'], { y: 150, onPick: (i) => { A.sfx('confirm'); if (i === 0) game.go(burned.from, { keepCase: true, skipBrief: true }); else game.go('title'); } });
scenes.burned = {
  view: 'side', res: 'ps1',
  enter(d) { burned = d; burnedMenu.i = 0; music('burned'); L.enabled = false; game.weather = null; },
  back() { game.go('title'); return true; },
  update(dt) { if (!burnedMenu.update(dt) && game.input.pressed('start')) burnedMenu.onPick(burnedMenu.i); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#0a0606');
      for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, '#140a0a');
      E.font.title(g, 'BURNED', W / 2, 40, { align: 'center', scale: 4, colors: ['#ffe0d0', '#ff7a5a', '#a8201a'], depthColor: '#2a0806' });
      txt(g, burned.why, W / 2 - 150, 90, '#e8d8d0', { wrap: 300 });
      burnedMenu.y = Math.round(H / 2 + 30);
    });
    burnedMenu.draw(r);
  }
};

/* ---- the ending: a montage, the way a season ends, then the case's worth ---- */
let ending = null;
const MONTAGE = () => [
  { rig: CAST.TATER.rig, text: 'Friday. The red-door vacant. Eleven vials, a scale, and a sixteen-year-old in an orange cap. The Major had his table by noon.' },
  { rig: CAST.SMOKE.rig, text: 'Smoke was stopped on Route 40 with nothing in the car but a car seat. He was home before dinner.' },
  CASE.meet ? { rig: CAST.DANTE.rig, text: 'A photograph of Dante Pryor went up at the top of the board. A judge looked at it for a long time. Then he signed.' }
    : { rig: null, text: 'The top of the board stayed a question mark. Pell drew a better one, in red.' },
  { rig: CAST.KEV.rig, text: 'Kev made it to his son\'s school meeting. He was forty minutes late. He went.' },
  { rig: CAST.MAJOR.rig, text: 'At COMSTAT the Deputy Ops said "nice table." Major Voss said "thank you, sir."' },
  { rig: CAST.SWEETS.rig, text: 'Sweets sold three t-shirts for ten dollars. Mostly clean.' },
  { rig: CAST.LOOKOUT.rig, text: 'By Sunday, Monroe and Fulton was open again. New kid on the stoop. Same yell.' }
];
scenes.ending = {
  view: 'side', res: 'ps1',
  enter() { ending = { i: 0, t: 0, panels: MONTAGE(), res: false }; music('end'); L.enabled = false; game.weather = null; },
  update(dt) {
    ending.t += dt;
    const skip = game.input.pressed('confirm') || game.input.pressed('interact') || game.input.clicked();
    if (!ending.res) {
      for (const p of ending.panels) if (p.rig) p.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
      if (ending.t > 6 || (skip && ending.t > .5)) { ending.i++; ending.t = 0; if (ending.i >= ending.panels.length) { ending.res = true; A.sfx('right'); } }
    } else if (skip && ending.t > 1) game.go('about', { fromEnd: true });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#060606');
      if (!ending.res) {
        const p = ending.panels[ending.i], a = Math.min(1, ending.t * 2);
        if (p.rig) p.rig.drawPortrait(g, Math.round(W / 2 - 50), 24, 100, { zoom: 3.4, turn: .45, bg: '#1a1a1c', frame: true, tint: '#a0a0a0' });
        else { px.rect(g, W / 2 - 50, 24, 100, 100, '#1a1a1c'); txt(g, '?', W / 2, 54, '#c82a2a', { align: 'center', scale: 4 }); }
        if (a > .3) txt(g, p.text, W / 2 - 150, 136, '#e8e2d0', { wrap: 300 });
        promptRow(g, [['confirm', 'Next']], W / 2, H - 16);
      } else {
        const s = Math.round(CASE.strength()), rank = s >= 1500 ? 'REAL POLICE' : s >= 900 ? 'GOOD POLICE' : s >= 450 ? 'A STAT FOR THE MAJOR' : 'BACK TO THE MARINE UNIT';
        E.font.title(g, 'THE CASE', W / 2, 14, { align: 'center', scale: 3, colors: ['#f8f0d8', '#c8a060'] });
        const rows = [['Photographs', CASE.photos.length], ['Pages decoded', CASE.wire.pages + ' / 3'], ['Pertinent lines flagged', CASE.wire.flagged + ' / 4'], ['Minimization violations', CASE.wire.violations],
          ['Board pinned', CASE.board + ' / 6'], ['Pryor with the connect', CASE.meet ? 'YES' : 'no'], ['Escalade tag', CASE.plate ? 'yes' : 'no'], ['Times made on the corner', CASE.heat]];
        rows.forEach(([k, v], i) => { txt(g, k, W / 2 - 110, 50 + i * 12, '#c8c0a8'); txt(g, String(v), W / 2 + 110, 50 + i * 12, '#f0ead8', { align: 'right' }); });
        txt(g, 'CASE STRENGTH  ' + s, W / 2, 152, '#ffd060', { align: 'center', scale: 2 });
        txt(g, rank, W / 2, 172, '#9ae89a', { align: 'center' });
        txt(g, '"The game is the game."', W / 2, 188, '#a8a090', { align: 'center' });
        if (ending.t > 1) promptRow(g, [['confirm', 'Credits']], W / 2, H - 16);
      }
    });
  }
};

/* ---- About / Credits: the source information and the feedback, as the task asks, in pages ---- */
let about = null;
scenes.about = {
  view: 'side', res: 'ps1',
  enter(d) { d = d || {}; about = { page: 0, scroll: 0, from: d.fromEnd }; L.enabled = false; game.weather = null; if (d.fromEnd) music('title'); },
  back() { game.go('title'); return true; },
  update(dt) {
    const inp = game.input, n = ABOUT.length;
    if (inp.repeat('right')) { about.page = (about.page + 1) % n; about.scroll = 0; A.sfx('blip'); }
    if (inp.repeat('left')) { about.page = (about.page + n - 1) % n; about.scroll = 0; A.sfx('blip'); }
    if (inp.down('down')) about.scroll += dt * 90; if (inp.down('up')) about.scroll -= dt * 90;
    const z = inp.zoom && inp.zoom(); if (z && z !== 1) about.scroll += (z > 1 ? -20 : 20);
    about.scroll = Math.max(0, about.scroll);
    const cl = inp.clicked(); if (cl) { if (cl[0] < game.W * .25) { about.page = (about.page + n - 1) % n; about.scroll = 0; } else if (cl[0] > game.W * .75) { about.page = (about.page + 1) % n; about.scroll = 0; } }
    if (inp.pressed('cancel') || inp.pressed('start')) game.go('title');
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, sec = ABOUT[about.page];
      px.rect(g, 0, 0, W, H, '#0c0d10');
      E.font.title(g, sec.title, W / 2, 8, { align: 'center', scale: 2, colors: ['#f8f0d8', '#c8a060'] });
      txt(g, (about.page + 1) + ' / ' + ABOUT.length, W - 8, 10, '#8a8478', { align: 'right' });
      const x = Math.max(10, W / 2 - 200), w = Math.min(W - 20, 400);
      let y = 34 - about.scroll;
      const maxY = H - 26;
      for (const [k, v] of sec.rows) {
        const lines = E.font.wrap(v, w - (k ? 120 : 0));
        if (k && y > 26 && y < maxY) txt(g, k, x, y, '#f0c060');
        lines.forEach((ln, i) => { const yy = y + i * 10; if (yy > 26 && yy < maxY) txt(g, ln, x + (k ? 120 : 0), yy, '#e8e2d0'); });
        y += lines.length * 10 + 5;
      }
      const total = y + about.scroll - 34; if (about.scroll > total - (maxY - 40)) about.scroll = Math.max(0, total - (maxY - 40));
      px.rect(g, 0, H - 22, W, 22, '#0c0d10');
      promptRow(g, [[game.input.lastDevice === 'gamepad' ? 'Pad14' : 'Pad:ArrowLeft', 'Page'], [game.input.lastDevice === 'gamepad' ? 'Pad13' : 'Pad:ArrowDown', 'Scroll'], [backAct(), 'Back']], W / 2, H - 16);
    });
  }
};
