/* 34-story: speech (E.Dialog with Animalese), cutscenes, the story beats, day end, endings and credits. */
G.idOf = name => { const n = String(name).toUpperCase(); const c = Object.values(G.CAST).find(c => c.name === n); return c ? c.id : 'sonny'; };

class Speech {
  constructor() { this.talk = new E.Dialog(G.game, { speed: 32, voice: () => {} }); this.queue = []; this.done = null; this.rig = {}; }
  get open() { return this.talk.open || this.queue.length > 0; }
  // lines: [[speaker, text], ...]; done: callback after the last
  play(lines, done) { this.queue = lines.slice(); this.done = done || null; this.next(); }
  next() {
    const l = this.queue.shift();
    if (!l) { const d = this.done; this.done = null; if (d) d(); return; }
    const id = G.idOf(l[0]), c = G.CAST[id], opts = l[2] || {};
    this.talk.voice = ch => G.speak(id, ch);
    const rig = this.rig[id] || (this.rig[id] = G.rigOf(id, 1.2));
    this.talk.say(l[1], Object.assign({ name: c.name, portrait: rig, portraitSize: 40, onDone: () => this.next() }, opts));
    this.speaker = id;
  }
  update(dt) { return this.talk.update(dt); }
  draw(r) { this.talk.draw(r); }
  close() { this.queue = []; this.talk.close(); this.done = null; }
}
G.Speech = Speech;

/* ---- the cutscene scene: a stage with the speakers, a backdrop, and the story's lines ---- */
G.scenes.cutscene = G.wrapScene({
  view: 'threequarter', res: 'ps1', expand: true, input: 'DEFAULT', name: 'cutscene', pausable: true,
  enter(d) {
    this.d = d || {}; this.sp = new Speech(); this.t = 0; this.stage = (d.cast || []).map(id => ({ id })); this.bg = d.bg || 'beach';
    G.music(d.music || 'villa'); G.game.follow(null); G.game.focus(0, 0, 14); G.game.lights.enabled = false;
    this.skipT = 0;
    this.sp.play(d.lines || [], () => { if (d.next) d.next(); });
  },
  update(dt) {
    this.t += dt; const I = G.game.input;
    this.sp.update(dt);
    // hold cancel / start to skip the whole scene
    if (I.down('cancel') || I.down('start')) { this.skipT += dt; if (this.skipT > .9) { this.sp.close(); if (this.d.next) { const n = this.d.next; this.d.next = null; n(); } } } else this.skipT = 0;
    const n = this.stage.length;
    this.stage.forEach((s, i) => { const rig = this.sp.rig[s.id] || G.rigOf(s.id, 1.6); s.rig = rig; const x = (i - (n - 1) / 2) * 52; s.x = x; rig.update(dt, { x, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 * 1, pose: this.sp.speaker === s.id && this.sp.talk.typing ? null : null, expr: this.sp.speaker === s.id ? 'smile' : null }); });
  },
  draw(r) {
    const W = r.W, H = r.H, night = this.bg === 'night';
    const bgInfo = G.beach(r, this.t, night ? { sky: ['#06061a', '#0e0e3a', '#1a1a5a', '#2a2a7a', '#3a3a8a'], sunX: .2 } : {});
    this.stage.forEach(s => { r.shadow(s.x, 0, 8, .3); r.actor(s.x, 0, 0, (g, ox, oy) => s.rig.draw(g, ox, oy + 0, r.view)); });
    r.overlay(g => { if (this.d.title) { E.font.title(g, this.d.title, W / 2, 10, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' }); } if (this.skipT > 0) { px.rect(g, 4, H - 8, Math.round((W - 8) * this.skipT / .9), 3, '#ffd24a'); } });
    this.sp.draw(r);
    G.drawPrompts(r, [['confirm', 'Next'], ['cancel', 'Hold: Skip']], 3);
    void bgInfo;
  }
});
// helper to run a cutscene and then something
G.cutscene = (lines, cast, next, o = {}) => G.game.go('cutscene', Object.assign({ lines, cast, next }, o));

/* ---- the invitation card at the start of a vacation ---- */
G.scenes.invitation = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'invitation',
  enter(d) { this.d = d || {}; this.t = 0; this.shown = 0; G.music('title'); G.game.focus(0, 0, 14); this.all = G.TEXT.invitation.join('\n\n'); },
  update(dt) {
    this.t += dt; const prev = Math.floor(this.shown); this.shown = Math.min(this.all.length, this.shown + dt * 28);
    for (let k = prev; k < Math.floor(this.shown); k++) G.speak('sonny', this.all[k]);
    const I = G.game.input;
    if (I.pressed('confirm') || I.clicked()) { if (this.shown < this.all.length) this.shown = this.all.length; else { if (this.d.next) this.d.next(); } }
    if (I.pressed('cancel') && this.d.next) this.d.next();
  },
  draw(r) {
    const W = r.W, H = r.H; r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0a2d3d'); for (let y = 0; y < H; y += 4) px.rect(g, 0, y, W, 2, '#0c3548');
      const w = 300, h = 160, x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2);
      px.rect(g, x + 3, y + 3, w, h, '#00000066'); E.ui.box(g, x, y, w, h, { bg: ['#fff6d8', '#f0dca0'], border: '#c8962a', gradient: true });
      px.rect(g, x + 5, y + 5, w - 10, 2, '#c8962a'); px.rect(g, x + 5, y + h - 7, w - 10, 2, '#c8962a');
      E.font.title(g, 'AHEAD OR ALIVE', x + w / 2, y + 12, { align: 'center', scale: 2, colors: ['#8a2a1a', '#c8402a'], depth: 1, depthColor: '#f4e0a0' });
      const lines = G.wrap(this.all.slice(0, Math.floor(this.shown)), w - 40);
      lines.forEach((ln, i) => E.font.text(g, ln, x + 20, y + 46 + i * 10, '#3a2410', { outline: false }));
      // wax seal
      px.disc(g, x + w - 30, y + h - 28, 12, '#a01828'); px.disc(g, x + w - 30, y + h - 28, 9, '#c82838'); E.font.text(g, 'S', x + w - 32, y + h - 31, '#ffd9a0', { outline: false });
    });
    G.drawPrompts(r, [['confirm', 'Continue']]);
  }
});

/* ---- story beats ---- */
G.runStory = key => {
  const s = G.state, T = G.TEXT, flag = 'done:' + s.day + ':' + s.slot;
  const finish = () => { s.flags[flag] = 1; G.finishSlot(); };
  const playMatch = (afterWin, afterLose) => {
    const cfg = G.storyMatch(key);
    G.game.go('match', { cfg, humanTeam: 0, tutorial: key === 'welcome', rematch: false, noQuit: true, music: key === 'final' ? 'match' : 'match', time: key === 'final' ? 'sunset' : undefined,
      onEnd: res => { const out = G.afterStoryMatch(key, res); const lines = res.winner === 0 ? afterWin : afterLose; G.cutscene(lines.concat([['PEPPER', 'Prize money: ' + G.fmtMoney(out.got) + '. Please do not spend it all in one casino.']]), cast(cfg), key === 'welcome' ? () => G.game.go('partner', { next: finish }) : finish, { bg: 'beach' }); } });
  };
  const cast = cfg => [cfg.teams[1][0], cfg.teams[1][1], cfg.teams[0][1]];
  switch (key) {
    case 'arrival': G.cutscene(T.arrival, ['sonny', 'pepper'], finish, { title: 'DAY 1' }); break;
    case 'welcome': G.cutscene(T.welcome, ['sonny', 'pepper', 'mika'], () => playMatch(T.welcomeWin, T.welcomeLose)); break;
    case 'qualifier': G.cutscene(T.qualifier, ['ruby', 'tomo'], () => playMatch(T.qualWin, T.qualLose)); break;
    case 'semifinal': G.cutscene(T.semifinal, ['ines', 'sonny'], () => playMatch(T.semiWin, T.semiLose)); break;
    case 'reveal': G.cutscene(T.reveal, ['sonny', 'pepper'], () => { s.flags.reveal = 1; finish(); }, { bg: 'night', title: 'THE REVEAL' }); break;
    case 'final': G.cutscene(T.final, ['sonny', 'pepper'], () => playMatch(T.finalWin, T.finalLose)); break;
    case 'party': G.cutscene(T.party, ['sonny', 'pepper', 'mika', 'hana', 'gwen'], () => { s.flags[flag] = 1; G.game.go('ending'); }, { bg: 'night', title: 'FAREWELL PARTY' }); break;
    default: finish();
  }
};
// finish a slot: advance the calendar and go on
G.finishSlot = () => {
  const s = G.state, r = G.endSlot(); G.autosave();
  if (r === 'newday') G.game.go('dayend', { day: s.day - 1 }); else G.game.go('map');
};

/* ---- who is your partner: after the welcome match ---- */
G.scenes.partner = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'partner',
  enter(d) {
    this.d = d || {}; this.t = 0; G.music('villa'); G.game.focus(0, 0, 14); this.sp = new Speech();
    this.picking = false; this.menu = null; this.sp.play(G.TEXT.pickPartner, () => this.openMenu());
  },
  openMenu() {
    this.picking = true;
    this.menu = new G.Menu(G.PARTNERS.map(id => ({ label: G.CAST[id].full.split(' ')[0] + '  ' + G.CAST[id].style, id, onPick: it => { G.setPartner(it.id); G.game.go('cutscene', { lines: [[G.CAST[it.id].name, G.rpick(['Partners! Let us get a smoothie and plan world domination.', 'Fine. Do not make me regret it. Fun is optional.', 'I will be there. Probably behind you. Do not turn around.'].slice(0, 3), 'cosmetic')]], cast: [it.id], next: this.d.next }); } })), { y: 82, w: 230, gap: 17 });
  },
  update(dt) { this.t += dt; if (!this.picking) { this.sp.update(dt); } else this.menu.update(dt); },
  draw(r) {
    G.beach(r, this.t, { sky: ['#1a1a4a', '#4a2a7a', '#ff6a5a', '#ffb347', '#ffe08a'] });
    if (this.picking) {
      const W = r.W; r.overlay(g => { G.text(g, 'CHOOSE YOUR PARTNER', W / 2, 20, '#ffd24a', { align: 'center' }); });
      this.menu.draw(r);
      const it = this.menu.items[this.menu.i], c = G.CAST[it.id];
      r.overlay(g => {
        const w = 240, x = Math.round(r.W / 2 - w / 2), y = 142; G.panel(g, x, y, w, 62);
        G.text(g, c.full, x + 6, y + 5, '#ffd24a'); G.text(g, 'Power ' + '★'.repeat(c.stats.power) + '  Speed ' + '★'.repeat(c.stats.speed), x + 6, y + 16, '#bfe9ee');
        G.wrap(c.bio, w - 12).forEach((ln, i) => G.text(g, ln, x + 6, y + 28 + i * 9, '#ffffff'));
        G.text(g, 'Loves: ' + c.loves.map(k => G.LABELS[k]).join(', '), x + 6, y + 52, '#ffb0c0');
      });
      G.drawPrompts(r, [['confirm', 'Choose']]);
    } else this.sp.draw(r);
  }
});

/* ---- end of day ---- */
G.scenes.dayend = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'dayend',
  enter(d) {
    const s = G.state; this.d = d || {}; this.t = 0; this.day = d.day || s.day - 1; G.music('results'); G.sfx('dayend'); G.game.focus(0, 0, 14);
    this.menu = new G.Menu([{ label: s.day > 5 ? 'The Farewell' : 'Start Day ' + s.day, onPick: () => { if (s.day > 5) G.game.go('ending'); else G.game.go('map'); } }, { label: 'Save game', onPick: () => { G.game.saves.show('save'); } }], { y: 150, w: 130, gap: 16 });
    // look for people drifting apart: partners below 15 leave
    this.note = null;
    if (s.partner && G.affinity(s.partner) < 12 && s.day <= 5) { this.note = G.CAST[s.partner].name + ' has had enough of your silence. You are partnerless.'; s.partner = null; s.tempPartner = 'mika'; }
    this.stats = [['Money', G.fmtMoney(s.money)], ['Partner', s.partner ? G.CAST[s.partner].name + ' ' + '♥'.repeat(G.hearts(s.partner)) : 'none'], ['Matches', s.stats.wins + 'W ' + s.stats.losses + 'L'], ['Postcards', '' + s.album.length]];
  },
  update(dt) { this.t += dt; this.menu.update(dt); },
  draw(r) {
    G.beach(r, this.t, { sky: ['#0a0a2a', '#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347'], noPalms: false });
    r.overlay(g => {
      const W = r.W; E.font.title(g, 'DAY ' + this.day + ' COMPLETE', W / 2, 14, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
      const w = 190, x = Math.round(W / 2 - w / 2), y = 44; G.panel(g, x, y, w, 70);
      this.stats.forEach((st, i) => { G.text(g, st[0], x + 8, y + 7 + i * 13, '#bfe9ee'); G.text(g, st[1], x + w - 8, y + 7 + i * 13, '#fff6c8', { align: 'right' }); });
      const nxt = G.DAYS[Math.min(4, G.state.day - 1)]; G.text(g, G.state.day <= 5 ? 'Tomorrow: ' + nxt.title : G.TEXT.vacationEnd, W / 2, y + 76, '#ffeec2', { align: 'center' });
      if (this.note) G.text(g, this.note, W / 2, y + 88, '#ffb0a0', { align: 'center' });
    });
    this.menu.draw(r); G.drawPrompts(r, [['confirm', 'Select']]);
  }
});

/* ---- ending, results, credits ---- */
G.scenes.ending = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'ending',
  enter() {
    const s = G.state, won = s.results.final === 'win', fr = s.partner && G.affinity(s.partner) >= 55; s.ending = (won ? 'champion' : 'runner-up') + (fr ? '-partners' : '-solo');
    const P = s.partner ? G.CAST[s.partner].name : 'MIKA', pid = s.partner || 'mika';
    const lines = won ? [
      ['SONNY', 'The island is yours, Jo! Or rather: it is a very large party that you now technically host.'],
      fr ? [P, 'We did it together, you know. Partners for the next vacation, too? Obviously yes.'] : [P, 'Fine. You were good. I will admit it only on this beach.'],
      ['PEPPER', 'Please remember your sunscreen. It has been a pleasure.']
    ] : [
      ['SONNY', 'The House wins! And since I have no other plan, we shall do this every year. Come back. Bring sunscreen.'],
      fr ? [P, 'Next year we get him. Same team. I will bring snacks.'] : [P, 'Next time I pick my own partner. Kidding. Maybe.'],
      ['PEPPER', 'I look forward to seeing you again. Quietly.']
    ];
    G.cutscene(lines, ['sonny', pid, 'pepper'], () => G.game.go('credits'), { bg: 'night', title: won ? 'THE CUP IS YOURS' : 'UNTIL NEXT SUMMER' });
  },
  update() { }, draw() { }
});
G.scenes.credits = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'credits',
  enter() {
    this.t = 0; G.music('title'); G.game.focus(0, 0, 14); const s = G.state;
    this.slides = [['AHEAD OR ALIVE', 'Xtreme Beach Volleyball'], ['A vacation in five days', G.TEXT.vacationEnd], ['The Cast', 'Jo, Mika, Hana, Gwen, Ruby, Tomo, Ines, Sonny and Pepper'], ['Postcards', (s ? s.album.length : 0) + ' collected'], ['Made with', 'my-3D2dge, written code, and a great deal of sunscreen'], ['Thank you for playing', 'Stay ahead. Stay alive. Stay tanned.']];
    this.slideT = 0; this.si = 0;
  },
  update(dt) {
    this.t += dt; this.slideT += dt; const I = G.game.input;
    if (this.slideT > 4.2) { this.slideT = 0; this.si++; if (this.si >= this.slides.length) { G.game.go('results'); return; } }
    if (I.pressed('confirm') || I.pressed('cancel')) { this.slideT = 4.2; }
  },
  draw(r) {
    G.beach(r, this.t, { sky: ['#0a0a2a', '#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347'] });
    const sl = this.slides[Math.min(this.si, this.slides.length - 1)], a = Math.min(1, this.slideT * 2, (4.2 - this.slideT) * 2);
    r.overlay(g => { const W = r.W, H = r.H; if (a > .05) { E.ui.box(g, 30, Math.round(H * .3), W - 60, 60, { bg: ['#1b4a5a', '#0b2430'], border: '#ffd36a', alpha: .9 * a }); E.font.title(g, sl[0], W / 2, Math.round(H * .3) + 8, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'] }); G.wrap(sl[1], W - 80).forEach((ln, i) => G.text(g, ln, W / 2, Math.round(H * .3) + 26 + i * 10, '#fff', { align: 'center' })); } });
    G.drawPrompts(r, [['confirm', 'Skip']]);
  }
});
G.scenes.results = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'results',
  enter() {
    const s = G.state; this.t = 0; G.music('results'); G.game.focus(0, 0, 14); G.sfx('dayend');
    const grade = s.results.final === 'win' ? (s.stats.wins >= 4 ? 'S' : 'A') : s.stats.wins >= 2 ? 'B' : 'C';
    this.grade = grade;
    this.rows = [['Ending', (s.ending || '').replace(/-/g, ' ')], ['Matches', s.stats.wins + ' won, ' + s.stats.losses + ' lost'], ['Aces / Spikes / Blocks', s.stats.aces + ' / ' + s.stats.spikes + ' / ' + s.stats.blocks], ['Perfect touches', '' + s.stats.perfects], ['Money earned', G.fmtMoney(s.stats.earned)], ['Best friend', Object.keys(s.aff).filter(k => G.PARTNERS.includes(k)).sort((a, b) => s.aff[b] - s.aff[a]).map(k => G.CAST[k].name + ' ' + s.aff[k])[0]], ['Postcards', '' + s.album.length]];
    this.menu = new G.Menu([{ label: 'New Vacation+ (keep suits)', onPick: () => { const keep = G.state; G.state = G.newState(keep.seed + 7); G.state.owned = keep.owned; G.state.suit = keep.suit; G.state.plus = (keep.plus || 0) + 1; G.state.money = 2500 + 1500 * G.state.plus; G.reseedWorld(); G.game.go('invitation', { next: () => G.game.go('map') }); } }, { label: 'Main menu', onPick: () => G.game.go('menu') }], { y: 158, w: 170, gap: 16 });
  },
  update(dt) { this.t += dt; this.menu.update(dt); },
  draw(r) {
    G.beach(r, this.t); const W = r.W;
    r.overlay(g => {
      E.font.title(g, 'VACATION RESULTS', W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
      const w = 230, x = Math.round(W / 2 - w / 2), y = 32; G.panel(g, x, y, w, 112);
      this.rows.forEach((rw, i) => { G.text(g, rw[0], x + 8, y + 6 + i * 11, '#bfe9ee'); G.text(g, rw[1], x + w - 8, y + 6 + i * 11, '#fff6c8', { align: 'right' }); });
      E.font.title(g, this.grade, x + w - 24, y + 92, { align: 'center', scale: 3, colors: ['#fff6c8', '#ffd24a', '#ff4f6a'] });
    });
    this.menu.draw(r); G.drawPrompts(r, [['confirm', 'Select']]);
  }
});
