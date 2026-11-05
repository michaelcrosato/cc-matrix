/* ---- AI HUB (parallel mode): progress, one result, the end ---- */
let hubLast = 0, hubDone = false;
function hubProgress() {
  if (!HUB.active || hubDone || !window.AIHub) return; const now = performance.now(); if (now - hubLast < 800) return; hubLast = now;
  try { AIHub.progress({ score: Math.max(0, Math.round(scoreNow())), label: S.arrests + ' arrests, ' + S.photos.length + ' photos' }); } catch (e) { /* no hub */ }
}
function hubResult() {
  if (!HUB.active || hubDone || !window.AIHub) return; hubDone = true;
  try { AIHub.result({ score: Math.max(0, Math.round(S.score || scoreNow())), stats: { arrests: S.arrests, photos: S.photos.length, evidence: S.logged.filter(e => e.good).length, burned: S.burn },
    awards: S.integrity >= 3 ? [{ title: 'Clean hands', detail: 'Finished with full integrity' }] : [] }); } catch (e) { /* no hub */ }
}

/* ---- the attract mode: any input exits it ---- */
let attract = { px: null, t: 0 };
const attractInput = () => {
  if (attract.t < .8) return false;
  if (I.anyPressed()) return true;
  if (Math.hypot(I.padMove[0], I.padMove[1]) > .4 || (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .4)) return true;
  const p = I.pointer(); if (p) { if (!attract.px) attract.px = p.slice(); else if (Math.hypot(p[0] - attract.px[0], p[1] - attract.px[1]) > 12) return true; }
  return !!I.clicked();
};
const startAttract = () => { DEMO = true; S = BLANK(); attract = { px: (I.pointer() || null) && I.pointer().slice(), t: 0 }; game.go('street'); };
const exitAttract = () => { DEMO = false; S = BLANK(); toasts.length = 0; game.go('title'); };
/* ---- TITLE ---- */
const skyBg = new E.Backdrop({ sky: ['#0a0812', '#1e1426', '#3a2230'], moon: { x: .78, y: .22, r: 12, color: '#e8dcc0' }, stars: 24, starsY: .5,
  layers: [{ kind: 'city', color: '#17121e', y: .66, height: .34, parallax: .1 }, { kind: 'city', color: '#0e0a14', y: .78, height: .28, parallax: .25 }, { kind: 'fog', color: '#4a3040', y: .92, height: .1, parallax: 0, drift: 3 }] });
const stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#403a46' } }, edges: 'open' });
const MID = 480;
const CAST = ['pike', 'tolly', 'dray', 'boyce'].map((id, i) => ({ id, x: MID + [-150, -112, 112, 150][i], face: i < 2 ? 0 : Math.PI, rig: new E.Humanoid(PORTRAITS[id]) }));
let titleMenu, idle = 0, aboutPage = 0, howPage = 0;
const sceneBack = () => game.go('title');
titleMenu = new E.Menu(game, ['START THE DETAIL', 'HOW TO PLAY', 'SETTINGS', 'ABOUT & CREDITS'], { x: 'center', y: 96, box: true, onPick: i => titlePick(i) });
function titlePick(i) {
  const it = titleMenu.items[i], lab = typeof it === 'string' ? it : it.label;
  if (lab === 'START THE DETAIL') { S = BLANK(); DEMO = false; game.go('street'); }
  else if (lab === 'HOW TO PLAY') { howPage = 0; game.go('howto'); }
  else if (lab === 'SETTINGS') game.menu('settings');
  else if (lab === 'ABOUT & CREDITS') { aboutPage = 0; game.go('about'); }
}
scenes.title = {
  view: 'side', views: ['side'], input: PRESET, res: 'ps1',
  enter() {
    if (HUB.active) { game.go(HUB.last && HUB.last !== 'title' ? HUB.last : 'street'); return; }
    DEMO = false; idle = 0; music('title'); game.resetCamera(); game.follow(null); game.cam.room = null; game.cam.bounds = null; L.enabled = false; game.weather = null;
    titleMenu.items = touchOnly() ? ['SETTINGS'] : ['START THE DETAIL', 'HOW TO PLAY', 'SETTINGS', 'ABOUT & CREDITS']; titleMenu.i = 0;
    attract = { px: null, t: 0 }; syncOpts();
  },
  update(dt) {
    syncOpts();
    const active = I.anyPressed() || Math.hypot(I.padMove[0], I.padMove[1]) > .3 || !!I.clicked();
    const p = I.pointer(); if (p) { if (attract.px && Math.hypot(p[0] - attract.px[0], p[1] - attract.px[1]) > 6) idle = 0; attract.px = p.slice(); }
    idle = active ? 0 : idle + dt;
    if (I.pressed('start')) { I.consumeAll(); titlePick(titleMenu.i); } else titleMenu.update(dt);
    if (idle > 10 && !game.menuOpen) { idle = 0; startAttract(); return; }
    game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    CAST.forEach((c, i) => c.rig.update(dt, { x: c.x, y: 0, z: 32, facing: c.face, vx: 0, vy: 0, pose: i === 2 ? 'hips' : null }));
  },
  draw(r) {
    skyBg.draw(r); stage.draw(r);
    r.prop('streetlamp', MID - 90, 0, 32, { light: false, size: 1.5 }); r.prop('streetlamp', MID + 90, 0, 32, { light: false, size: 1.5 });
    r.prop('firedrum', MID, -6, 32, { size: 1.3, light: false });
    for (const c of CAST) r.actor(c.x, 0, 32, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view));
    titleMenu.y = Math.round(r.H * .5) + 6 + (r.W < 420 ? 20 : 0);
    r.overlay(g => {
      const W = r.W, top = W < 420 ? 26 : 0;
      const sc = W < 300 ? 2 : 3;
      E.font.title(g, 'FIFTY PERCENT', W / 2, 6 + top, { align: 'center', scale: sc, colors: ['#fff6d8', '#ffd36a', '#d8862a', '#a8481a'], depth: 3, depthColor: '#2a1008' });
      E.font.title(g, 'CHANCE OF', W / 2, 6 + top + sc * 9 + 2, { align: 'center', scale: 2, colors: ['#f0f0f0', '#b8b8c8', '#78788a'], depth: 2, depthColor: '#14141c' });
      E.font.title(g, 'PROBABLE CAUSE', W / 2, 6 + top + sc * 9 + 24, { align: 'center', scale: sc, colors: ['#fff6d8', '#ffd36a', '#d8862a', '#a8481a'], depth: 3, depthColor: '#2a1008' });
      E.font.wrap('A wiretap game of the west side. Nobody wins. Somebody clears a case.', W - 16).forEach((ln, i) => txt(g, ln, W / 2, 84 + top + i * 10, '#d8c8a8', { align: 'center' }));
      txt(g, 'v1.0  engine ' + E.version, 6, 6, '#555');
    });
    titleMenu.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (touchOnly()) { panel(g, W / 2 - 110, H - 80, 220, 30, { border: COL.red }); txt(g, 'Controller or keyboard required', W / 2, H - 70, COL.red, { align: 'center' }); txt(g, 'Watch the demo, or open Settings', W / 2, H - 59, '#ccc', { align: 'center' }); }
      else {
        const dev = I.lastDevice;
        const how = dev === 'gamepad' ? 'D-pad / stick + ' + key('confirm') + '      ' + key('start') + ' menu' : 'Arrows or mouse + Enter / click';
        txt(g, how, W / 2, H - 22, '#b8b0d8', { align: 'center' });
        txt(g, 'Idle for 10 seconds and the demo plays', W / 2, H - 11, '#7a7a90', { align: 'center' });
      }
    });
  }
};

/* ---- HOW TO PLAY / ABOUT: paged text screens, left and right (or click the arrows) ---- */
const HOW = () => [
  ['THE JOB', ['You are Detective Rhonda Pike. A corner crew runs the Courts for Cornelius "Neely" Boyce.', 'You do not catch him with a gun. You catch him with paper:', 'photographs, a wire, a judge, then a door.', 'The case has five stages: SURVEIL, TIP, TAP, LISTEN, FILE.']],
  ['ON THE STREET', ['Move: ' + (usingPad() ? 'left stick' : 'WASD or arrows') + '.   Hustle: ' + key('sprint') + '.   Crouch: ' + key('crouch') + '.', 'Raise the camera: hold ' + key('camera') + ' and aim with ' + (usingPad() ? 'the right stick' : 'the mouse') + '.', 'Hold the crew in frame until the bar fills. Three photos.', 'Lookouts have sight cones. If one spots you he whistles, the corner scatters, and you are burned. Three burns end the case.']],
  ['THE TIP AND THE TAP', [key('interact') + ' talks to Deacon behind the bodega. You can pay him, or lean on him.', 'Paying is clean and solid. Leaning is cheap and costs you integrity.', 'Then hold ' + key('interact') + ' at the west payphone to plant the tap, crouched, while no lookout is watching.', key('map') + ' opens your notebook anywhere.']],
  ['THE WIRE ROOM', ['Three calls play. Words glow gold as they are spoken.', 'Press ' + key('interact') + ' to LOG the ones that matter. Press it on nothing and you get static.', 'Some gold words are red herrings. A junk card on the board carries no charge.', 'Hold ' + key('sprint') + ' to fast-forward.']],
  ['THE CASE BOARD', ['Pin one card to each of four charges: conspiracy, distribution, possession, weapons.', 'Move up and down to choose a charge, left and right to change the card.', 'Judge Harlow signs if two charges hold. Four is airtight.', 'Lt. Dray will offer you a quick sweep for numbers. It makes his stats, and it ends your case.']],
  ['THE RAID', ['Shove (' + key('attack') + ') knocks a man flat. Shout POLICE! (' + key('shout') + ') freezes the unarmed.', 'Armed men only listen when you are close. Big Lonnie shoots: his aim line flashes red before he fires. Use cover.', 'Hold ' + key('interact') + ' on a downed or frozen suspect to cuff him, and on evidence to seize it.', 'Runners head for the back door. If they get out, they are back on the corner by Monday.']]
];
function pagedScene(name, getPages, getIdx, setIdx, title) {
  const n = () => getPages().length;
  const go = d => { setIdx((getIdx() + d + n()) % n()); sfx('select'); };
  let clickBox = null;
  scenes[name] = {
    view: 'side', views: ['side'], input: PRESET, res: 'ps1',
    enter() { music('title'); game.follow(null); L.enabled = false; },
    back() { sceneBack(); return true; },
    update() {
      if (I.repeat('left')) go(-1); if (I.repeat('right') || I.pressed('confirm')) go(1);
      if (I.pressed('cancel')) { I.consumeAll(); sceneBack(); return; }
      const c = I.clicked(); if (c && clickBox) { if (c[1] > clickBox.by) { if (c[0] < clickBox.w / 3) go(-1); else if (c[0] > clickBox.w * 2 / 3) go(1); else sceneBack(); } else go(1); }
    },
    draw(r) {
      skyBg.draw(r);
      r.overlay(g => {
        const W = r.W, H = r.H, pages = getPages(), p = pages[getIdx()];
        px.rect(g, 0, 0, W, H, '#07060bcc'); clickBox = { w: W, by: H - 26 };
        txt(g, title, W / 2, 10, COL.gold, { align: 'center', scale: 2 });
        const pw = Math.min(W - 20, 360), x = (W - pw) / 2; panel(g, x, 34, pw, H - 72);
        txt(g, p[0], x + 10, 42, COL.blue, { scale: 1 }); let y = 56;
        for (const para of p[1]) { for (const ln of E.font.wrap(para, pw - 22)) { txt(g, ln, x + 10, y, '#eee'); y += 10; } y += 5; if (y > H - 50) break; }
        txt(g, (getIdx() + 1) + ' / ' + pages.length, x + pw - 10, 42, '#999', { align: 'right' });
        txt(g, '← PREV      ' + key('cancel') + ' BACK      NEXT →', W / 2, H - 20, '#bbb', { align: 'center' });
      });
    }
  };
}
pagedScene('howto', HOW, () => howPage, v => { howPage = v; }, 'HOW TO PLAY');
const aboutPages = () => {
  const A2 = ABOUT, pages = [];
  const para = (k, v) => k + ': ' + v;
  const si = A2.sourceInformation;
  pages.push(['SOURCE INFORMATION 1/3', [para('Date', si.date), para('Source', si.source), para('Genre', si.genre), para('Perspective', si.perspective), para('Tech', si.tech), para('Art', si.artDirection)]]);
  pages.push(['SOURCE INFORMATION 2/3', [para('Animation', si.animation), para('Audio', si.audio), para('Online', si.online), para('Testing', si.testing)]]);
  pages.push(['SOURCE INFORMATION 3/3', [para('Research', si.research), para('Environment', si.environment), para('Model', si.model), para('Usage', si.usage)]]);
  const qa = (qs, as) => qs.map((q, i) => q + ' ' + as[i]);
  pages.push(['TESTING FEEDBACK', qa(ABOUT.q.testing, A2.testingFeedback)]);
  pages.push(['ENGINE FEEDBACK 1/2', qa(ABOUT.q.engine.slice(0, 3), A2.engineFeedback.slice(0, 3))]);
  pages.push(['ENGINE FEEDBACK 2/2', qa(ABOUT.q.engine.slice(3), A2.engineFeedback.slice(3))]);
  pages.push(['PROMPT FEEDBACK', qa(ABOUT.q.prompt, A2.promptFeedback)]);
  pages.push(['CREDITS', ['FIFTY PERCENT CHANCE OF PROBABLE CAUSE is an original spiritual successor inspired by The Wire (2002-2008). All characters, places and events are invented.', 'Built on the my-3D2dge engine (v' + E.version + '). Music, sound and voices are synthesised in code; the voices are gibberish.', 'Online play follows the AI Hub Session Protocol v1 (parallel mode).']]);
  return pages;
};
pagedScene('about', aboutPages, () => aboutPage, v => { aboutPage = v; }, 'ABOUT & CREDITS');

/* ---- RESULTS ---- */
const EPILOGUE = {
  numbers: ['The sweep makes the Tuesday paper. Twelve kids in cuffs, a table of cash, a lieutenant at a podium.', 'Boyce eats dinner at home. By Monday the corner has new kids and the same man behind them.', 'Somebody downtown calls it a win. You know what it is.'],
  clean: ['The Annex is a crime scene by dawn. Boyce is in a holding cell with a lawyer who billed ahead.', 'The judge reads your affidavit twice. For once it is all true.', 'He makes bail in nine days. The case holds anyway. In this town that is a victory.'],
  mixed: ['Two men in cuffs, one on the run, a ledger in a bag. It is a case. It is also a Tuesday.', 'Boyce has lawyers and a short memory. Somebody fills his chair before the paperwork dries.', 'You file the report. The report is the job.'],
  dirty: ['You got what you needed the way people like you always get it.', 'The case will stand, probably. The man in the paper will not remember what it cost.', 'Deacon will not take your call again. He never said he would.']
};
const RES = (() => {
  let menu = null, lines = [], t = 0, stamped = false;
  function enter() {
    S.score = Math.round(scoreNow()); if (S.ending !== 'numbers') S.ending = S.integrity <= 1 ? 'dirty' : (S.arrests >= 4 && !S.escaped) ? 'clean' : 'mixed';
    lines = EPILOGUE[S.ending]; t = 0; stamped = false; const b = Math.max(E.store.get('bnp:best', 0), S.score); E.store.set('bnp:best', b); S.best = b;
    music('ending'); game.follow(null); L.enabled = false; game.weather = null; toasts.length = 0;
    menu = new E.Menu(game, ['PLAY AGAIN', 'TITLE'], { y: 170, onPick: i => { if (i === 0) { S = BLANK(); game.go('street'); } else game.go('title'); } });
    hubResult();
  }
  function update(dt) {
    t += dt;
    if (DEMO) { if (t > 6) { S = BLANK(); game.go('street'); } return; }
    if (HUB.active) return;
    menu.update(dt);
  }
  function draw(r) {
    skyBg.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#07060bd0');
      E.font.title(g, S.ending === 'numbers' ? 'THE NUMBERS' : 'CASE CLOSED', W / 2, 8, { align: 'center', scale: 3, colors: ['#fff6d8', '#ffd36a', '#a8481a'], depth: 2 });
      const pw = Math.min(W - 24, 300), x = (W - pw) / 2; panel(g, x, 38, pw, 78);
      const rows = [['Arrests', S.arrests], ['Seizures', S.seized], ['Evidence logged', S.logged.filter(e => e.good).length], ['Photos', S.photos.length + ' / 3'], ['Charges held', S.board ? S.board.strength + ' / 4' : 'none'], ['Burned', S.burn + ' / 3'], ['Integrity', Math.max(0, S.integrity) + ' / 3']];
      rows.forEach((rw, i) => { const col = i % 2, row = Math.floor(i / 2); txt(g, rw[0], x + 10 + col * 148, 44 + row * 14, '#bbb'); txt(g, String(rw[1]), x + 10 + col * 148 + 108, 44 + row * 14, '#fff', { align: 'right' }); });
      txt(g, 'SCORE ' + S.score + '     BEST ' + S.best, W / 2, 100, COL.gold, { align: 'center' });
      let y = 122; for (const ln of lines) for (const w of E.font.wrap(ln, pw)) { txt(g, w, W / 2, y, '#ddd', { align: 'center' }); y += 10; }
      if (HUB.active) txt(g, 'Result sent to the hub', W / 2, H - 20, COL.green, { align: 'center' });
    });
    if (!HUB.active && !DEMO) { menu.y = Math.round(r.H - 52); menu.draw(r); }
  }
  return { view: 'side', views: ['side'], input: PRESET, res: 'ps1', enter, update, draw, back() { game.go('title'); return true; } };
})();
scenes.results = RES;

/* ---- OVER ---- */
const OVER = (() => {
  let menu, why = 'burned', from = 'street';
  function enter(d) {
    why = (d && d.why) || 'burned'; music(null); sfx('die'); game.follow(null); L.enabled = false; game.weather = null;
    menu = new E.Menu(game, ['TRY AGAIN', 'TITLE'], { y: 120, onPick: i => { if (i === 0) { if (why === 'down') { S.integrity = Math.max(0, S.integrity); game.go('raid'); } else { S = BLANK(); game.go('street'); } } else game.go('title'); } });
    S.score = Math.round(scoreNow()); hubResult();
  }
  function update(dt) { if (HUB.active) return; menu.update(dt); }
  function draw(r) {
    skyBg.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#14040acc');
      E.font.title(g, why === 'burned' ? 'THE CORNER WENT COLD' : 'OFFICER DOWN', W / 2, 40, { align: 'center', scale: 3, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depth: 2 });
      const msg = why === 'burned' ? ['Three times they saw you coming. Boyce moves his business indoors,', 'and the case goes in a box in a basement.'] : ['The vest stopped some of it. Not enough.', 'The story ends up in a very short paragraph.'];
      msg.forEach((m, i) => txt(g, m, W / 2, 84 + i * 11, '#ddd', { align: 'center' }));
      txt(g, 'SCORE ' + S.score, W / 2, 106, COL.gold, { align: 'center' });
    });
    if (!HUB.active) { menu.y = Math.round(r.H / 2) + 20; menu.draw(r); }
  }
  return { view: 'side', views: ['side'], input: PRESET, res: 'ps1', enter, update, draw, back() { game.go('title'); return true; } };
})();
scenes.over = OVER;

/* ---- hub loading: the game opens straight into the round ---- */
scenes.hubload = { view: 'side', views: ['side'], input: PRESET, res: 'ps1', enter() { L.enabled = false; }, update() {}, draw(r) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#06050a'); txt(g, 'CONNECTING TO THE HUB', r.W / 2, r.H / 2 - 4, COL.gold, { align: 'center' }); }); } };
