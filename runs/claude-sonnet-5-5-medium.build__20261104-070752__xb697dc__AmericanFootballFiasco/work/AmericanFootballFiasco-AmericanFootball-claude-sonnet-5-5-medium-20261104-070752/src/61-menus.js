/* AMERICAN FOOTBALL FIASCO — the title and its pages (story, exhibition, practice, records, about), the cutscenes, the results, and the attract mode. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, { px, clamp } = E, game = FF.game, UI = FF.UI, T = FF.T;
const SC = FF.scenes = FF.scenes || {};
const DIFF = { Rookie: .35, Pro: .6, 'All-Pro': .82, Legend: .96 };
const applyDifficulty = () => { T.aiSkill = DIFF[game.settings.difficulty] || .6; };
FF.applyDifficulty = applyDifficulty;

/* ---------- the stage behind the menus ---------- */
const stage = { map: null, crowd: null, rigs: [], key: '' };
function ensureStage(stadium, home) {
  const key = stadium + home;
  if (stage.key === key) return; stage.key = key; stage.map = FF.buildMap(stadium, home); stage.crowd = FF.makeCrowd(stage.map.stadium);
  const h = FF.TEAMS[home], o = FF.TEAMS.bruisers;
  stage.rigs = []; for (let i = 0; i < 6; i++) stage.rigs.push({ rig: FF.makeRig(h, i, { size: 1.15 }), x: 470 + i * 30, y: 300 + (i % 2) * 18, pose: ['cheer', 'hips', 'wave'][i % 3] });
  for (let i = 0; i < 4; i++) stage.rigs.push({ rig: FF.makeRig(o, i, { size: 1.15 }), x: 700 + i * 28, y: 296 + (i % 2) * 18, pose: 'kneel' });
}
function drawStage(r, t) {
  const st = stage.map.stadium; game.lights.enabled = true; game.lights.ambient = st.ambient + .08;
  for (let i = 0; i < 5; i++) game.lights.add(420 + i * 120, 120, 90, 220, .8, { color: st.lamp });
  stage.map.drawFloor(r); stage.map.queueWalls(r); FF.drawCrowd(r, stage.crowd, t, .5);
  for (const s of stage.rigs) { r.shadow(s.x, s.y, 6, .4); r.actor(s.x, s.y, 0, (g, ox, oy) => s.rig.draw(g, ox, oy, r.view)); }
}
function updateStage(dt) {
  stage.rigs.forEach((s, i) => s.rig.update(dt, { x: s.x, y: s.y, z: 0, facing: i < 6 ? -Math.PI / 2 + .3 : Math.PI + .3, vx: 0, vy: 0, pose: s.pose, expr: s.pose === 'kneel' ? 'wince' : 'shout' }));
}

/* ---------- attract mode ---------- */
FF.startAttract = () => {
  const pick = FF.TEAM_LIST, a = pick[Math.floor(Math.random() * pick.length)]; let b = pick[Math.floor(Math.random() * pick.length)]; if (b === a) b = pick[(pick.indexOf(a) + 1) % pick.length];
  const sts = Object.keys(FF.STADIUMS);
  applyDifficulty(); game.go('match', { mode: 'attract', home: a, away: b, stadium: sts[Math.floor(Math.random() * sts.length)], humans: [false, false], quarters: 2, qlen: 40 }, { fade: 0 });
};
FF.leaveAttract = () => { game.input.consumeAll(); game.go('title'); };

/* ---------- the title ---------- */
const mainItems = () => [{ label: 'STORY: THE FIASCO CUP' }, { label: 'EXHIBITION' }, { label: 'PRACTICE' }, { label: 'HALL OF FIASCO' }, { label: 'OPTIONS' }, { label: 'ABOUT & CREDITS' }];
const TS = FF.titleState = { page: 'main', idle: 0, menu: null, setup: null, t: 0, scroll: 0, drillSel: 0, info: '' };
function setPage(p) { TS.page = p; TS.scroll = 0; TS.menu = null; buildMenu(); }
function buildMenu() {
  const go = FF.titleGo;
  if (TS.page === 'main') TS.menu = new UI.VMenu(mainItems(), { onPick: i => go(i) });
  else if (TS.page === 'story') {
    const prog = FF.store.get('story', { ch: 0 }); const items = [];
    if (prog.ch > 0 && prog.ch <= 3) items.push({ label: 'CONTINUE: CHAPTER ' + prog.ch });
    items.push({ label: 'NEW GAME' }); items.push({ label: 'BACK' });
    TS.menu = new UI.VMenu(items, { onPick: (i, it) => { if (it.label === 'BACK') setPage('main'); else FF.startStory(it.label.startsWith('CONTINUE') ? prog.ch : 0); }, onCancel: () => setPage('main') });
  } else if (TS.page === 'drills') {
    TS.menu = new UI.VMenu(FF.DRILLS.map(d => ({ label: d.title.replace(/^DRILL \d: /, '') })).concat([{ label: 'BACK' }]), { onPick: i => { if (i >= FF.DRILLS.length) setPage('main'); else FF.startDrill(i); }, onCancel: () => setPage('main') });
  } else if (TS.page === 'exh') {
    const S = TS.setup = TS.setup || { me: 0, opp: 1, stadium: 1, qlen: 1, players: 0 };
    const names = FF.TEAM_LIST.map(id => FF.TEAMS[id].short), sts = Object.keys(FF.STADIUMS), QL = [[60, '1:00'], [90, '1:30'], [150, '2:30'], [240, '4:00']], PL = ['1 PLAYER', '2 PLAYERS (P2 JOINS)', 'WATCH (CPU vs CPU)'];
    const rows = () => [{ label: 'YOUR TEAM  ← ' + names[S.me] + ' →' }, { label: 'OPPONENT  ← ' + names[S.opp] + ' →' }, { label: 'STADIUM  ← ' + FF.STADIUMS[sts[S.stadium]].name.toUpperCase() + ' →' }, { label: 'QUARTER  ← ' + QL[S.qlen][1] + ' →' }, { label: 'CPU  ← ' + String(game.settings.difficulty || 'Pro').toUpperCase() + ' →' }, { label: 'PLAYERS  ← ' + PL[S.players] + ' →' }, { label: 'KICK OFF!' }, { label: 'BACK' }];
    TS.menu = new UI.VMenu(rows(), { onPick: i => { if (i === 6) FF.startExhibition(S, sts, QL); else if (i === 7) setPage('main'); else bump(i, 1); }, onCancel: () => setPage('main') });
    TS.menu.rows = rows;
    const bump = (i, d) => {
      const n = FF.TEAM_LIST.length;
      if (i === 0) S.me = (S.me + d + n) % n; if (i === 1) S.opp = (S.opp + d + n) % n; if (i === 2) S.stadium = (S.stadium + d + sts.length) % sts.length; if (i === 3) S.qlen = (S.qlen + d + 4) % 4;
      if (i === 4) { const o = ['Rookie', 'Pro', 'All-Pro', 'Legend'], k = o.indexOf(game.settings.difficulty || 'Pro'); game.settings.set('difficulty', o[(k + d + 4) % 4]); }
      if (i === 5) S.players = (S.players + d + 3) % 3;
      FF.ui('blip');
    };
    TS.menu.bump = bump;
  } else if (TS.page === 'records' || TS.page === 'about') TS.menu = new UI.VMenu([{ label: 'BACK' }], { onPick: () => setPage('main'), onCancel: () => setPage('main') });
}
FF.titleGo = i => {
  if (i === 0) setPage('story'); else if (i === 1) setPage('exh'); else if (i === 2) setPage('drills'); else if (i === 3) setPage('records'); else if (i === 4) game.menu('settings'); else if (i === 5) setPage('about');
};
SC.title = {
  view: 'threequarter', input: 'FOOTBALL', res: 'ps1', expand: true,
  enter(d) {
    ensureStage('junction', 'fiascos'); game.cam.smooth = 0; game.setZoom(.8); game.weather = null; game.follow(null); game.timeScale = 1;
    TS.idle = 0; TS.t = 0; setPage(d && d.page || 'main'); FF.music('title'); if (FF.dev && FF.dev.detach) FF.dev.detach();
    FF.resetTune && 0; applyDifficulty();
  },
  update(dt) {
    TS.t += dt; updateStage(dt); game.focus(600 + Math.sin(TS.t * .15) * 30, 215, 10);
    const I = game.input, mv = UI.mouseMoved();
    if (I.anyPressed() || I.clicked() || mv || Math.hypot(...I.move()) > .25) TS.idle = 0; else TS.idle += dt;
    if (TS.idle > 10) { TS.idle = 0; FF.startAttract(); return; }
    if (UI.touchOnly()) { if (I.pressed('start')) game.menu('settings'); return; }
    const m = TS.menu; if (!m) return;
    if (TS.page === 'exh') { const I2 = game.input; if (I2.repeat('left', .3, .12)) m.bump(m.i, -1); if (I2.repeat('right', .3, .12)) m.bump(m.i, 1); m.set(m.rows()); }
    if (TS.page === 'about') { if (I.repeat('down', .15, .03)) TS.scroll += 9; if (I.repeat('up', .15, .03)) TS.scroll = Math.max(0, TS.scroll - 9); }
    m.update();
  },
  draw(r) {
    drawStage(r, TS.t);
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, 'rgba(8,6,24,0.35)');
      const wob = Math.sin(TS.t * 2) * 1.5, main = TS.page === 'main';
      if (main) {
        UI.big(g, 'AMERICAN FOOTBALL', W / 2, 14 + wob, 3, ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a']);
        UI.big(g, 'FIASCO', W / 2, 44 + wob, 5, ['#ffffff', '#ff8a6a', '#e0302a', '#801010']);
        UI.text(g, 'Ninety-nine losses. One field on the line. Zero chill.', W / 2, 88, '#d8d0f0', { align: 'center' });
      } else UI.big(g, 'AMERICAN FOOTBALL FIASCO', W / 2, 6, 2, ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a']);
      if (UI.touchOnly()) { UI.box(g, W / 2 - 120, 112, 240, 60, {}); UI.text(g, 'Controller or keyboard required', W / 2, 124, '#ffe08a', { align: 'center', scale: 2 }); UI.text(g, 'Press START or tap the menu button for Settings', W / 2, 150, '#c8c0e8', { align: 'center' }); return; }
      const m = TS.menu; if (!m) return;
      if (TS.page === 'main') { m.draw(g, W / 2, 104, { w: 230 }); UI.text(g, UI.prompt('confirm', 'Select') + '    Stick / D-pad / mouse: move', W / 2, H - 14, '#c8c0e8', { align: 'center' }); }
      else if (TS.page === 'story') { UI.text(g, 'THE FIASCO CUP', W / 2, 32, '#ffe08a', { align: 'center', scale: 2 }); UI.text(g, 'Win three games. Save the field. Win the giant hot dog.', W / 2, 52, '#c8c0e8', { align: 'center' }); m.draw(g, W / 2, 74, { w: 230 }); }
      else if (TS.page === 'drills') { UI.text(g, 'PRACTICE: LEARN THE GAME', W / 2, 32, '#ffe08a', { align: 'center', scale: 2 }); m.draw(g, W / 2, 56, { w: 250, lh: 17 }); const d = FF.DRILLS[m.i]; if (d) { UI.box(g, 30, H - 44, W - 60, 30, { bg: ['#14122a', '#0a0818'], border: '#e8c860' }); UI.text(g, d.goal, W / 2, H - 38, '#ffe08a', { align: 'center' }); E.font.wrap(d.text, W - 80, {}).slice(0, 2).forEach((ln, i) => UI.text(g, ln, W / 2, H - 28 + i * 9, '#fff', { align: 'center' })); } }
      else if (TS.page === 'exh') { UI.text(g, 'EXHIBITION', W / 2, 30, '#ffe08a', { align: 'center', scale: 2 }); m.draw(g, W / 2, 52, { w: 300, lh: 17, scale: 1 + 0 }); UI.text(g, 'Left / right changes a row.   ' + UI.prompt('confirm', 'Select'), W / 2, H - 14, '#c8c0e8', { align: 'center' }); }
      else if (TS.page === 'records') drawRecords(g, r, m);
      else if (TS.page === 'about') drawAbout(g, r, m);
    });
  }
};
function drawRecords(g, r, m) {
  const W = r.W, H = r.H, s = FF.store.get('stats', {}), prog = FF.store.get('story', { ch: 0 });
  UI.box(g, 40, 34, W - 80, 118, {});
  UI.text(g, 'HALL OF FIASCO', W / 2, 40, '#ffe08a', { align: 'center', scale: 2 });
  const rows = [['Games played', s.games || 0], ['Wins / Losses', (s.wins || 0) + ' / ' + (s.losses || 0)], ['Touchdowns', s.td || 0], ['Big Hits', s.hits || 0], ['Longest touchdown', (s.longest || 0) + ' yd'], ['Best score', s.best || 0], ['Plays called', s.plays || 0], ['Fiasco Cup', prog.done ? 'CHAMPIONS!' : prog.ch > 0 ? 'Chapter ' + prog.ch : 'not started']];
  rows.forEach(([k, v], i) => { const col = i % 2, row = Math.floor(i / 2); UI.text(g, k, 54 + col * 168, 64 + row * 20, '#c8c0e8'); UI.text(g, String(v), 54 + col * 168, 64 + row * 20 + 9, '#fff', { scale: 1 }); });
  m.draw(g, W / 2, 170, { w: 120, lh: 17 });
}
function drawAbout(g, r, m) {
  const W = r.W, H = r.H, A = globalThis.FF_ABOUT || { sourceInformation: {}, testingFeedback: [], engineFeedback: [], promptFeedback: [] };
  const lines = [];
  const add = (txt, col = '#fff') => E.font.wrap(String(txt), W - 90, {}).forEach(l => lines.push([l, col]));
  lines.push(['AMERICAN FOOTBALL FIASCO', '#ffe08a']); add('An over-the-top arcade football game, made for the my-3D2dge engine. Voices are gibberish. The fiascos are real.');
  lines.push(['', '#fff']); lines.push(['SOURCE INFORMATION', '#ffe08a']);
  for (const k in A.sourceInformation) add(k + ': ' + A.sourceInformation[k], '#e0daf8');
  for (const [title, key, qs] of [['TESTING FEEDBACK', 'testingFeedback', ['Issues caught', 'Critical issues', 'Most helpful test', 'Least helpful test']], ['ENGINE FEEDBACK', 'engineFeedback', ['Liked most', 'Stuck or guessed wrong', 'Had to build myself', 'Hardest part', 'Changed in the engine', 'One change']], ['PROMPT FEEDBACK', 'promptFeedback', ['Liked most', 'Confusing', 'Hardest', 'Would change']]]) {
    lines.push(['', '#fff']); lines.push([title, '#ffe08a']); (A[key] || []).forEach((a, i) => add((qs[i] || '') + ': ' + a, '#e0daf8'));
  }
  lines.push(['', '#fff']); lines.push(['CREDITS', '#ffe08a']); add('Engine: my-3D2dge v0.85.2 (modified copy). Hub client: AI Hub session.js 1.4.0. Everything is drawn and sounded by code. Motion: engine rigs.');
  UI.box(g, 20, 30, W - 40, 168, {});
  const view = 100, max = Math.max(0, lines.length * 9 - 156); TS.scroll = Math.min(TS.scroll, max);
  for (let i = 0; i < lines.length; i++) { const y = 36 + i * 9 - TS.scroll; if (y > 30 && y < 188) UI.text(g, lines[i][0], 30, y, lines[i][1], { shadow: '#000' }); }
  void view; UI.text(g, 'Up / down: scroll', W - 30, 188, '#8a84a8', { align: 'right' });
  m.draw(g, W / 2, 208, { w: 120, lh: 15, scale: 1 });
}

/* ---------- exhibition ---------- */
FF.startExhibition = (S, sts, QL) => {
  applyDifficulty(); const two = S.players === 1, watch = S.players === 2;
  if (two) game.allowJoin({ max: 2, onJoin: () => {} });
  game.go('match', { mode: 'exh', home: FF.TEAM_LIST[S.me], away: FF.TEAM_LIST[S.opp === S.me ? (S.me + 1) % 6 : S.opp], stadium: sts[S.stadium], humans: watch ? [false, false] : [true, two], two, qlen: QL[S.qlen][0], quarters: 4 });
};

/* ---------- story ---------- */
FF.startStory = (ch) => {
  applyDifficulty(); const chap = FF.STORY.chapters;
  if (ch === 0) { FF.store.set('story', { ch: 1 }); game.go('cut', { lines: FF.STORY.prologue, stadium: 'junction', foe: 'bruisers', next: ['cut', { lines: chap[0].pre, title: chap[0].title, stadium: chap[0].stadium, foe: chap[0].opp, next: ['match', storyMatch(0)] }] }); }
  else game.go('cut', { lines: chap[ch - 1].pre, title: chap[ch - 1].title, stadium: chap[ch - 1].stadium, foe: chap[ch - 1].opp, next: ['match', storyMatch(ch - 1)] });
};
function storyMatch(i) { const c = FF.STORY.chapters[i]; return { mode: 'story', chapter: i, home: 'fiascos', away: c.opp, stadium: c.stadium, boss: c.boss, humans: [true, false], quarters: 2, qlen: 75, intro: 'Welcome to ' + FF.STADIUMS[c.stadium].name + '! ' + FF.TEAMS[c.opp].boss + ' leads the ' + FF.TEAMS[c.opp].short + '!' }; }

/* ---------- cutscenes (dialogue over the stadium) ---------- */
const CS = { talk: null, rigs: null, i: 0, d: null, who: 'NARRATOR', t: 0 };
SC.cut = {
  view: 'threequarter', input: 'FOOTBALL', res: 'ps1', expand: true,
  enter(d) {
    CS.d = d; CS.i = 0; CS.t = 0; ensureStage(d.stadium || 'junction', 'fiascos'); game.setZoom(.8); game.weather = FF.STADIUMS[d.stadium || 'junction'].weather ? Object.assign({}, FF.STADIUMS[d.stadium].weather) : null;
    if (!CS.rigs) CS.rigs = FF.makeSpeakerRigs();
    CS.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#e8c860', speed: 30, voice: (ch, i) => FF.babble(CS.who, ch, i) });
    FF.music('story'); next();
  },
  update(dt) {
    CS.t += dt; updateStage(dt); game.focus(600, 310, 10);
    if (CS.talk.update(dt)) return;
    if (game.input.pressed('start')) { CS.i = CS.d.lines.length; }
    if (!CS.talk.open) next();
  },
  draw(r) {
    drawStage(r, CS.t);
    r.overlay(g => { const W = r.W; if (CS.d.title && CS.i <= 1) UI.big(g, CS.d.title, W / 2, 16, 3); UI.text(g, UI.prompt('confirm', 'Next') + '    ' + UI.prompt('start', 'Skip all'), W - 70, 10, '#8a84a8', { align: 'right' }); });
    CS.talk.draw(r);
  }
};
function next() {
  const d = CS.d;
  if (CS.i >= d.lines.length) { const [sc, data] = d.next; game.go(sc, data); return; }
  const [who, text] = d.lines[CS.i++]; CS.who = who;
  const rig = CS.rigs[who] || CS.rigs.COACH;
  CS.talk.say(text, { name: who, portrait: rig, portraitOpts: { zoom: 3, turn: .35 } });
}

/* ---------- results ---------- */
const RS = { menu: null, d: null, t: 0 };
SC.results = {
  view: 'threequarter', input: 'FOOTBALL', res: 'ps1', expand: true,
  enter(d) {
    RS.d = d; RS.t = 0; RS.tip = Math.floor(Math.random() * FF.TIPS.length); ensureStage('junction', 'fiascos'); game.setZoom(.8); game.weather = null; const cfg = d.cfg, r = d.M, hs = cfg.humans[0] ? 0 : cfg.humans[1] ? 1 : 0;
    const won = r.winner === hs; RS.won = won; RS.tie = r.winner < 0; RS.hs = hs;
    FF.music(won ? 'win' : 'lose'); FF.sfx(won ? 'fanfare' : 'boo');
    if (cfg.mode !== 'attract' && cfg.mode !== 'drill') { FF.stat('games', 1); FF.stat(won ? 'wins' : 'losses', 1); FF.stat('best', r.score[hs], true); FF.stat('hits', r.stats[hs].hits); }
    const items = [];
    if (cfg.mode === 'story') {
      if (won) { const ch = cfg.chapter; items.push({ label: ch >= 2 ? 'THE ENDING' : 'NEXT CHAPTER' }); FF.store.set('story', { ch: ch >= 2 ? 3 : ch + 2, done: ch >= 2 }); }
      else items.push({ label: 'TRY AGAIN' });
    } else items.push({ label: 'REMATCH' });
    items.push({ label: 'MAIN MENU' });
    RS.menu = new UI.VMenu(items, { onPick: (i, it) => {
      if (it.label === 'MAIN MENU') { game.go('title'); return; }
      if (cfg.mode === 'story') {
        const ch = cfg.chapter, c = FF.STORY.chapters[ch];
        if (!won) { game.go('cut', { lines: c.lose, stadium: c.stadium, foe: c.opp, next: ['match', storyMatch(ch)] }); return; }
        if (ch >= 2) game.go('cut', { lines: c.post.concat(FF.STORY.epilogue), stadium: c.stadium, foe: c.opp, next: ['title', {}] });
        else { const n = FF.STORY.chapters[ch + 1]; game.go('cut', { lines: c.post, stadium: c.stadium, foe: c.opp, next: ['cut', { lines: n.pre, title: n.title, stadium: n.stadium, foe: n.opp, next: ['match', storyMatch(ch + 1)] }] }); }
      } else game.go('match', cfg);
    } });
  },
  update(dt) { RS.t += dt; updateStage(dt); game.focus(600, 310, 10); RS.menu.update(); },
  draw(r) {
    drawStage(r, RS.t);
    r.overlay(g => {
      const W = r.W, H = r.H, d = RS.d, m = d.M, tm = m.teams.map(id => FF.TEAMS[id]); px.rect(g, 0, 0, W, H, 'rgba(8,6,24,0.5)');
      UI.big(g, RS.tie ? 'A TIE?!' : RS.won ? 'VICTORY!' : 'DEFEAT', W / 2, 10, 5, RS.won ? ['#ffffff', '#ffe08a', '#ffb347', '#e0662a'] : ['#e8e8f0', '#a0a8c0', '#6a7090', '#303050']);
      UI.box(g, 50, 52, W - 100, 100, {});
      UI.text(g, tm[0].short + '  ' + m.score[0] + '   -   ' + m.score[1] + '  ' + tm[1].short, W / 2, 58, '#fff', { align: 'center', scale: 2 });
      const rows = [['Yards', 'yards'], ['Passes (done/tried)', null], ['Big Hits', 'hits'], ['Touchdowns', 'tds'], ['Sacks', 'sacks'], ['Turnovers (lost)', null]];
      rows.forEach(([lab, key], i) => {
        const a = m.stats[0], b = m.stats[1]; let va, vb;
        if (key) { va = a[key]; vb = b[key]; } else if (lab.startsWith('Passes')) { va = a.comps + '/' + a.passes; vb = b.comps + '/' + b.passes; } else { va = a.fumbles + (b.ints); vb = b.fumbles + a.ints; }
        UI.text(g, String(va), 72, 82 + i * 11, '#fff'); UI.text(g, lab, W / 2, 82 + i * 11, '#c8c0e8', { align: 'center' }); UI.text(g, String(vb), W - 72, 82 + i * 11, '#fff', { align: 'right' });
      });
      UI.text(g, 'Longest touchdown run: ' + m.longest + ' yd', W / 2, 142, '#ffe08a', { align: 'center' });
      RS.menu.draw(g, W / 2, 162, { w: 200 });
      UI.text(g, 'TIP: ' + FF.TIPS[RS.tip % FF.TIPS.length], W / 2, H - 12, '#c8c0e8', { align: 'center' });
    });
  }
};
})();
