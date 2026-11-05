/* ============ 32-cup: the Cup Run: tabloids, talks, the map, team talks, the tunnel, the ending ============ */
const rigCache = {};
EF.speakerRig = id => {
  if (rigCache[id]) return rigCache[id]; const sp = EF.SPEAKERS[id]; let rig;
  if (sp.team) { const t = EF.get('team', sp.team), p = t.players[sp.idx]; rig = EF.makeRig(p, t.kit, p.pos, {}); }
  else rig = new E.Humanoid(Object.assign({ size: 1.15, weapon: null }, sp.rig));
  return (rigCache[id] = rig);
};
EF.Talk = class Talk {
  constructor(lines, done, place = 'bottom') { this.lines = lines; this.i = 0; this.done = done; this.dlg = new E.Dialog(game, { place, lines: 3, border: '#ffc83a', bg: ['#101a40', '#0a1028'], speed: 38 }); this.next(); }
  next() { if (this.i >= this.lines.length) { this.finished = true; if (this.done) this.done(); return; } const [who, text] = this.lines[this.i++]; this.who = who; this.dlg.voice = EF.babble.voiceFor(who); const rig = EF.speakerRig(who); this.dlg.say(text, { name: EF.SPEAKERS[who].name, portrait: rig, portraitSize: 44, portraitOpts: { zoom: 3, turn: .4 }, onDone: () => this.next() }); }
  update(dt) { return this.dlg.update(dt); }
  draw(r) { this.dlg.draw(r); }
};
const wrapTxt = (g, text, x, y, w, c, o = {}) => { const lines = E.font.wrap(text, w, o); lines.forEach((ln, i) => E.font.text(g, ln, x, y + i * ((o.scale || 1) * 9 + 2), c, Object.assign({ outline: false }, o))); return lines.length; };
EF.drawTabloid = (r, t, paper, head, sub, photoTeams, o = {}) => {
  r.overlay(g => {
    const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#d8cfb8'); px.rect(g, 10, 6, W - 20, H - 40, '#efe8d4'); px.rect(g, 10, 6, W - 20, 3, '#14161e');
    E.font.title(g, paper, W / 2, 12, { align: 'center', scale: 2, colors: ['#e03a2a', '#b02018'], depth: 1, depthColor: '#4a0a08' });
    px.rect(g, 16, 34, W - 32, 1, '#14161e'); TXT(g, 'TUESDAY  -  PRICE: A KIPPER  -  EUROPHORIA CUP SPECIAL', W / 2, 38, '#4a4a54', { font: 'tiny', align: 'center', shadow: false });
    const k = Math.min(1, t * 4); const lines = E.font.wrap(head, W - 50, { scale: 2 }); lines.forEach((ln, i) => E.font.text(g, ln, W / 2, 50 + i * 20 + (1 - k) * 10, '#14161e', { scale: 2, align: 'center', outline: false }));
    const py = 50 + lines.length * 20 + 6; px.rect(g, 28, py, 110, 64, '#14161e'); px.rect(g, 30, py + 2, 106, 60, '#b8c8d8');
    px.rect(g, 30, py + 40, 106, 22, '#4a8a4a');
    if (photoTeams) { photoTeams.forEach((tm, i) => { const T = EF.get('team', tm); EF.drawCrest(g, T, 40 + i * 50, py + 8, 2); }); }
    wrapTxt(g, sub, 148, py + 2, W - 176, '#2a2a34', {});
    for (let i = 0; i < 4; i++) for (let l = 0; l < 3; l++) px.rect(g, 28 + i * ((W - 56) / 4), py + 76 + l * 7, (W - 56) / 4 - 8, 3, '#b0a890');
    UI.footer(g, r, [['confirm', 'TURN THE PAGE']]);
  });
};
EF.scenes.cup = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter(d) {
    d = d || {}; this.d = d; this.t = 0; this.step = null; this.queue = []; L.enabled = false; EF.music('tabloid'); EF.lastInput = performance.now(); this.sv = EF.Save.load(); this.pick = EF.cupPick || (EF.cupPick = { talk: null, formation: null });
    game.allowJoin(false);
    if (d.fresh) { EF.cupPick.talk = null; this.queue = [{ k: 'tabloid', p: EF.STORY.prologue.tabloid, teams: ['kip'] }, { k: 'talk', lines: EF.STORY.prologue.talk, place: EF.STORY.prologue.place }, { k: 'choice', prompt: 'READY TO GO TO EUROPE?', items: [['LET\'S PLAY', () => { EF.Save.sticker('x:mags'); this.sv.prologue = true; EF.Save.save(); this.push(this.roundSteps(0)); this.advance(); }], ['TRAINING FIRST', () => { EF.Save.sticker('x:mags'); game.go('training', { back: 'cup' }); }]] }]; }
    else if (d.post) this.queue = this.postSteps(d.res, d.round);
    else this.queue = this.roundSteps(this.sv.round);
    this.advance();
  },
  exit() { game.allowJoin(false); },
  push(steps) { this.queue.unshift(...steps); },
  roundSteps(i) {
    const rd = EF.STORY.rounds[i], steps = []; if (!rd) return [{ k: 'goto', to: 'ending' }];
    if (i === 4) { steps.push({ k: 'talk', lines: EF.STORY.villain.talk, place: EF.STORY.villain.place }, { k: 'choice', prompt: 'THE BARON LEANS IN...', items: EF.STORY.villain.choices.map(([l, id]) => [l, () => { this.sv.loyal = id === 'loyal'; if (id === 'loyal') EF.Save.sticker('x:loyal'); EF.Save.save(); this.push([{ k: 'talk', lines: EF.STORY.villain[id], place: EF.STORY.villain.place }]); this.advance(); }]) }); }
    steps.push({ k: 'bracket', round: i, travel: rd.travel }, { k: 'tabloid', p: rd.pre, teams: ['kip', rd.team] });
    if (rd.talk && rd.talk.length) steps.push({ k: 'talk', lines: rd.talk, place: EF.get('stadium', rd.stadium).name });
    steps.push({ k: 'teamtalk', round: i }, { k: 'tunnel', round: i }); return steps;
  },
  postSteps(res, i) {
    const rd = EF.STORY.rounds[i], win = res.winner === 0, steps = []; const sv = EF.Save.load();
    if (win) { sv.round = Math.max(sv.round, i + 1); EF.Save.save(); }
    steps.push({ k: 'tabloid', p: win ? rd.win : rd.lose, teams: ['kip', rd.team] });
    if (win && rd.after && rd.after.length) steps.push({ k: 'talk', lines: rd.after, place: EF.get('stadium', rd.stadium).name });
    if (win && i === 4) steps.push({ k: 'goto', to: 'ending' });
    else if (win) steps.push({ k: 'stickers' }, { k: 'goto', to: 'cup', data: { resume: true } });
    return steps;
  },
  advance() {
    const s = this.queue.shift(); this.t = 0; this.step = s; if (!s) return game.go('title'); EF.lastInput = performance.now();
    if (s.k === 'goto') { game.go(s.to, s.data); return; }
    if (s.k === 'talk') { EF.music('cup'); this.talk = new EF.Talk(s.lines, () => this.advance(), 'bottom'); }
    else if (s.k === 'tabloid') { EF.music('tabloid'); EF.sfx('whistle2', { vol: .3 }); }
    else if (s.k === 'choice') this.menu = new UI.Menu(s.items.map(([label, fn]) => ({ label, onPick: fn })), { y: 100, w: 230, h: 22, scale: 1 });
    else if (s.k === 'teamtalk') { game.allowJoin({ max: 4, onJoin: (inp, n) => { EF.sfx('confirm'); this.joined = (this.joined || 0) + 1; } }); this.ti = 0; this.sub = null; this.msg = null; this.talkIds = ['hairdryer', 'shoulder', 'board']; }
    else if (s.k === 'tunnel') { game.allowJoin(false); EF.music('title'); EF.sfx('whistle', { vol: .4 }); }
    else if (s.k === 'bracket') { EF.music('cup'); }
    else if (s.k === 'stickers') { if (!EF.newStickers || !EF.newStickers.length) return this.advance(); EF.sfx('euphoriaFull'); }
  },
  update(dt) {
    this.t += dt; const s = this.step; if (!s) return; EF.idleStep(dt, 'cup');
    if (s.k === 'talk') { this.talk.update(dt); if (this.talk.finished) return; }
    else if (s.k === 'tabloid' || s.k === 'stickers') { if (this.t > .3 && (UI.anyP('confirm') || UI.anyP('start'))) { UI.eatAll(); if (s.k === 'stickers') EF.newStickers = []; this.advance(); } }
    else if (s.k === 'bracket') { if (this.t > .5 && (UI.anyP('confirm') || UI.anyP('start'))) { UI.eatAll(); this.advance(); } }
    else if (s.k === 'choice') this.menu.update(dt);
    else if (s.k === 'teamtalk') this.teamTalkUpdate(dt, s);
    else if (s.k === 'tunnel') { if (this.t > 3.2 || (this.t > 1 && UI.anyP('confirm'))) { UI.eatAll(); this.launch(s.round); } }
  },
  teamTalkUpdate(dt, s) {
    if (this.sub === 'formation') { this.fm.update(dt); return; }
    if (this.msg) { this.msgT -= dt; if (this.msgT <= 0 || UI.anyP('confirm')) { UI.eatAll(); this.advance(); } return; }
    if (UI.anyRep('left')) { this.ti = (this.ti + 2) % 3; EF.sfx('select'); } if (UI.anyRep('right')) { this.ti = (this.ti + 1) % 3; EF.sfx('select'); }
    const c = game.input.clicked && game.input.clicked(); if (c && this.cardRects) this.cardRects.forEach((rc, k) => { if (c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3]) { this.ti = k; this.chooseTalk(); } });
    const p = game.input.pointer && game.input.pointer(); if (p && this.cardRects && (p[0] !== this.lpt?.[0])) { this.lpt = [p[0], p[1]]; this.cardRects.forEach((rc, k) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) this.ti = k; }); }
    if (UI.anyP('confirm')) { UI.eatAll(); this.chooseTalk(); }
  },
  chooseTalk() {
    const id = this.talkIds[this.ti]; EF.cupPick.talk = id; EF.cupPick.formation = null; EF.sfx('confirm');
    if (id === 'board') { this.sub = 'formation'; this.fm = new UI.Menu([['2-2', '2-2: TWO BACK, TWO UP'], ['1-2-1', '1-2-1: THE DIAMOND'], ['2-1-1', '2-1-1: SAFETY FIRST']].map(([f, l]) => ({ label: l, onPick: () => { EF.cupPick.formation = f; this.sub = null; this.sayTalk(id); } })), { y: 90, w: 250, h: 22, scale: 1, onCancel: () => { this.sub = null; } }); }
    else this.sayTalk(id);
  },
  sayTalk(id) { const t = EF.get('teamtalk', id), line = t.lines[Math.floor(EF.fxRng() * t.lines.length)]; this.msg = line; this.msgT = 4.2; EF.babble.say('MAGS', line); },
  launch(i) {
    const rd = EF.STORY.rounds[i], humans = [{ idx: 0, side: 0 }]; for (let k = 1; k < game.players.length && k < 4; k++) humans.push({ idx: k, side: 0 });
    const d = { mode: 'cup', round: i, home: 'kip', away: rd.team, stadium: rd.stadium, ref: rd.ref, humans, rules: { needWinner: true }, talk: EF.cupPick.talk, formation: EF.cupPick.formation, seed: 100 + i * 17, euStart: i === 4 ? (this.sv.loyal ? .2 : .1) : 0, onDone: res => game.go('cup', { post: true, res, round: i }) };
    game.go('match', d);
  },
  draw(r) {
    const s = this.step; if (!s) return; const W = r.W, H = r.H;
    if (s.k === 'tabloid') return EF.drawTabloid(r, this.t, s.p.paper, s.p.head, s.p.sub, s.teams);
    UI.stadiumBg(r, game.time);
    if (s.k === 'talk') { r.overlay(g => { TXT(g, s.place || '', W / 2, 10, '#ffe7a8', { scale: 1, align: 'center' }); const who = this.talk.who; px.rect(g, 0, 0, 0, 0, '#000'); const rig = EF.speakerRig(who); rig.drawPortrait(g, Math.round(W / 2 - 40), 28, 80, { zoom: 3, turn: .3 }); }); this.talk.draw(r); }
    else if (s.k === 'choice') { r.overlay(g => TXT(g, s.prompt, W / 2, 60, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false })); this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT']])); }
    else if (s.k === 'bracket') this.drawBracket(r, s);
    else if (s.k === 'teamtalk') this.drawTeamTalk(r, s);
    else if (s.k === 'tunnel') this.drawTunnel(r, s);
    else if (s.k === 'stickers') r.overlay(g => { UI.panel(g, W / 2 - 120, 40, 240, 120); TXT(g, 'NEW STICKERS!', W / 2, 48, '#ffe08a', { scale: 2, align: 'center' }); (EF.newStickers || []).slice(0, 8).forEach((id, i) => { const st = EF.STICKERS.find(x => x.id === id); TXT(g, st ? st.name : id, W / 2, 72 + i * 10, '#e8ecff', { font: 'tiny', align: 'center' }); }); UI.footer(g, r, [['confirm', 'GREAT']]); });
  },
  drawBracket(r, s) {
    const W = r.W, H = r.H, rds = EF.STORY.rounds, cur = s.round, k = Math.min(1, this.t / 2);
    r.overlay(g => {
      E.font.title(g, 'THE EUROPHORIA CUP', W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
      const x0 = 50, x1 = W - 50, y = Math.round(H * .46); px.line(g, x0, y, x1, y, '#3a4a7a', 3); px.line(g, x0, y, x1, y, '#5a6aa0', 1);
      const nx = i => x0 + (x1 - x0) * i / 5;
      // the start (Kipperton) and the five rounds
      EF.drawCrest(g, 'kip', nx(0) - 8, y - 7, 1); rds.forEach((rd, i) => { const x = nx(i + 1), done = i < cur, now = i === cur; px.disc(g, Math.round(x), y, now ? 8 : 6, '#0a0c14'); px.disc(g, Math.round(x), y, now ? 7 : 5, done ? '#5aff7a' : now ? '#ffc83a' : '#3a4a7a'); EF.drawCrest(g, rd.team, Math.round(x) - 8, y - 38, 1.3); TXT(g, rd.name, x, y + 14 + (i % 2) * 22, now ? '#ffe08a' : '#8a9ac8', { font: 'tiny', align: 'center' }); TXT(g, EF.get('stadium', rd.stadium).city, x, y + 22 + (i % 2) * 22, '#6a7ab0', { font: 'tiny', align: 'center' }); });
      // the minibus
      const from = nx(cur), to = nx(cur + 1), bx = Math.round(lerp(from, to - 22, k * .85)), by = y - 6 + Math.round(Math.sin(this.t * 14) * .6);
      px.rect(g, bx - 9, by - 7, 18, 8, '#f08a24'); px.rect(g, bx - 7, by - 6, 4, 3, '#9ad8ff'); px.rect(g, bx - 2, by - 6, 4, 3, '#9ad8ff'); px.rect(g, bx + 3, by - 6, 4, 3, '#9ad8ff'); px.disc(g, bx - 5, by + 1, 2, '#14161e'); px.disc(g, bx + 5, by + 1, 2, '#14161e');
      const rd = rds[cur]; UI.panel(g, W / 2 - 140, H - 80, 280, 52); TXT(g, rd.name + ': ' + EF.get('team', rd.team).name, W / 2, H - 76, '#ffe08a', { align: 'center' }); TXT(g, EF.get('stadium', rd.stadium).name + ', ' + EF.get('stadium', rd.stadium).city, W / 2, H - 65, '#c8d4ff', { font: 'tiny', align: 'center' }); wrapTxt(g, s.travel || ('Gaffer\'s challenge: ' + EF.CHALLENGES[rd.challenge].text), W / 2 - 132, H - 56, 264, '#9aa6c8', { font: 'tiny' });
      UI.footer(g, r, [['confirm', 'ON THE BUS']]);
    });
  },
  drawTeamTalk(r, s) {
    const W = r.W, H = r.H; r.overlay(g => {
      E.font.title(g, 'TEAM TALK', W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); TXT(g, 'MAGS MULLIGAN: "WELL, GAFFER, WHAT DO WE TELL THEM?"', W / 2, 28, '#c8d4ff', { font: 'tiny', align: 'center' });
      const cw = 118, gap = 8, x0 = Math.round((W - cw * 3 - gap * 2) / 2); this.cardRects = [];
      this.talkIds.forEach((id, i) => { const t = EF.get('teamtalk', id), x = x0 + i * (cw + gap), y = 44, foc = i === this.ti; this.cardRects.push([x, y, cw, 100]); px.rect(g, x, y + (foc ? -4 : 0), cw, 100, foc ? '#ffc83a' : '#0a0c14'); px.rect(g, x + 2, y + 2 + (foc ? -4 : 0), cw - 4, 96, foc ? '#24366e' : '#141c3c'); TXT(g, t.name, x + cw / 2, y + 8 + (foc ? -4 : 0), foc ? '#ffffff' : '#9aa6c8', { align: 'center', font: 'tiny' }); wrapTxt(g, t.sub, x + 8, y + 26 + (foc ? -4 : 0), cw - 16, '#ffe7a8', { font: 'tiny' }); wrapTxt(g, t.desc, x + 8, y + 56 + (foc ? -4 : 0), cw - 16, '#c8d4ff', { font: 'tiny' }); });
      const joinedN = Math.max(0, game.players.length - 1); TXT(g, joinedN ? 'CO-OP: ' + (joinedN + 1) + ' PLAYERS ON THE PITCH' : 'FOR CO-OP: PRESS START ON ANOTHER PAD, OR 2 ON THE KEYBOARD', W / 2, 156, joinedN ? '#7aff9a' : '#8a9ac8', { font: 'tiny', align: 'center' });
      if (this.msg) { UI.panel(g, 20, H - 70, W - 40, 40); wrapTxt(g, this.msg, 28, H - 64, W - 56, '#fff6e0', {}); }
      UI.footer(g, r, [['confirm', 'SAY IT'], ['left', 'CHOOSE']]);
    }); if (this.sub === 'formation') this.fm.draw(r);
  },
  drawTunnel(r, s) {
    const rd = EF.STORY.rounds[s.round], W = r.W, H = r.H, k = Math.min(1, this.t / .6), T0 = EF.get('team', 'kip'), T1 = EF.get('team', rd.team);
    r.overlay(g => {
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
      T0.players.forEach((p, i) => { if (!this.tr0) this.tr0 = {}; const rig = this.tr0[i] || (this.tr0[i] = EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: T0.kit }, { kit: T1.kit }] }, 0) : T0.kit, p.pos, {})); rig.drawPortrait(g, Math.round(lerp(-60, 10 + i * 43, k)), 90, 40, { zoom: 3, turn: .5 }); });
      T1.players.forEach((p, i) => { if (!this.tr1) this.tr1 = {}; const rig = this.tr1[i] || (this.tr1[i] = EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: T0.kit }, { kit: T1.kit }] }, 1) : T1.kit, p.pos, {})); rig.drawPortrait(g, Math.round(lerp(W + 20, W - 50 - i * 43, k)), 90, 40, { zoom: 3, turn: -.5 }); });
      EF.drawCrest(g, T0, W * .28 - 18, 36, 3); EF.drawCrest(g, T1, W * .72 - 18, 36, 3); E.font.title(g, 'VS', W / 2, 44, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#e0662a'], depth: 3 });
      TXT(g, T0.name, W * .28, 18, '#ffffff', { align: 'center' }); TXT(g, T1.name, W * .72, 18, '#ffffff', { align: 'center' });
      TXT(g, EF.get('stadium', rd.stadium).name, W / 2, H - 56, '#ffe08a', { scale: 2, align: 'center' }); TXT(g, 'REFEREE: ' + EF.get('referee', rd.ref).name + '   -   CHALLENGE: ' + EF.CHALLENGES[rd.challenge].text, W / 2, H - 36, '#c8d4ff', { font: 'tiny', align: 'center' });
      UI.footer(g, r, [['confirm', 'KICK OFF']]);
    });
  }
};
/* ---- the ending: ceremony, parade, credits ---- */
EF.scenes.ending = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { this.t = 0; EF.music('victory'); L.enabled = false; game.follow(null); game.cam.bounds = null; const sv = EF.Save.load(); sv.round = 5; sv.records.cups++; sv.unlocks.cup = 1; EF.Save.save(); EF.lastInput = performance.now() + 1e9;
    const kip = EF.get('team', 'kip'); this.rigs = kip.players.map((p, i) => ({ rig: EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: kip.kit }, { kit: kip.kit }] }, 0) : kip.kit, p.pos, {}), x: 440 + i * 26 })); this.credits = [['EUROPHORIA FOOTBALL', 'h'], ['', ''], ['A GAME OF THE BEAUTIFUL KIND', ''], ['', '']].concat((ABOUT.sourceInformation ? [['Built on my-3D2dge', ''], ['AI Hub session protocol v1', ''], ['Everything drawn and heard by code', '']] : [])).concat([['', ''], ['THE KIPPERS', 'h'], ...kip.players.map(p => [p.name, '']), ['MAGS MULLIGAN, GAFFER', ''], ['', ''], ['COMMENTARY', 'h'], ['BARRY AND TREV', ''], ['', ''], ['THANK YOU FOR PLAYING', 'h']]); },
  update(dt) {
    this.t += dt; game.focus(480 + 40, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    this.rigs.forEach((h, i) => h.rig.update(dt, { x: h.x, y: 0, z: 32 + Math.abs(Math.sin(this.t * 6 + i)) * (this.t > 14 ? 0 : 4), facing: 0, vx: 0, vy: 0, pose: 'cheer', expr: 'shout' }));
    if (EF.fxRng() < dt * 12) PT.bits(430 + EF.fx(130), 0, 70, 3, ['#f08a24', '#1c2a5a', '#ffd84a', '#ffffff']);
    if (this.t > 5 && (UI.anyP('confirm') || UI.anyP('start')) ) { UI.eatAll(); if (this.t > 30) game.go('title'); else this.t = Math.max(this.t, 30); }
    if (this.t > 70) game.go('title');
  },
  draw(r) {
    titleBg.draw(r); titleStage.draw(r); const view = E.charView(r.view); for (const h of this.rigs) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, view));
    r.queue(560, 0, 32, g => { const [x, y] = r.w(560, 0, 32), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 6, Y - 6, 12, 6, '#a07a10'); px.rect(g, X - 2, Y - 22, 4, 16, '#ffd84a'); px.poly(g, [[X - 9, Y - 38], [X + 9, Y - 38], [X + 5, Y - 22], [X - 5, Y - 22]], '#ffd84a'); px.rect(g, X - 8, Y - 38, 16, 2, '#fff2a0'); }, { emissive: true });
    r.overlay(g => { const W = r.W, H = r.H, t = this.t;
      if (t < 12) { const hd = t < 6 ? EF.STORY.rounds[4].win : { head: 'THE PARADE', sub: 'Down the harbour road on the back of a fish lorry, three thousand people and one very smug seagull.' }; px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, 280, H, '#05060f')); wrapTxt(g, hd.head, 10, 14, 262, '#ffe08a', { scale: 2 }); wrapTxt(g, hd.sub, 10, 70, 262, '#e8ecff', {}); }
      else if (t < 20) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, 280, H, '#05060f')); wrapTxt(g, EF.STORY.ending[2], 10, 40, 262, '#ffe08a', { scale: 2 }); TXT(g, 'AND THE MAGS MULLIGAN INVITATION TO THE NEXT ONE IS ALREADY IN THE POST.', 10, 110, '#c8d4ff', { font: 'tiny' }); }
      else { px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, W, H, '#05060f')); let y = H - (t - 20) * 16; for (const [s, k] of this.credits) { if (y > -10 && y < H + 10) TXT(g, s, W / 2, y, k === 'h' ? '#ffe08a' : '#e8ecff', { align: 'center', scale: k === 'h' ? 2 : 1 }); y += k === 'h' ? 20 : 12; } if (y < -20) { game.go('title'); } }
      UI.footer(g, r, [['confirm', 'SKIP']]); });
  }
};
