/* THE CUP RUN (section 6.24): the bracket, the beat player (tabloid, travel, talk, team talk, challenge, tunnel,
 * match, result), losing and CONTINUE?, the tunnel walkout (also the AI Hub card), and the ending: the trophy, the
 * harbour parade, the closing tabloid and the credits. */
const CUPS = EF.Cup = {
  data() { return EF.Save.data(); },
  start() { const d = this.data(); d.cup = { round: 0, results: [], flags: {}, teamTalks: 0, started: Date.now(), playT: 0, prologue: false, done: false, retries: 0 }; EF.Save.write(); },
  round() { const c = this.data().cup; return c ? EF.CUP.rounds[Math.min(4, c.round)] : EF.CUP.rounds[0]; },
  /** the match options for the current round, from the team talk and flags */
  matchOpts(humans) {
    const c = this.data().cup, R = this.round(), tt = EF.get('teamtalk', c.talk || 'arm'), buffs = [Object.assign({}, tt.buff || {}), {}];
    let eu = tt.euphoria || 0; if (R.id === 'r5') eu += c.flags.loyal ? 20 : c.flags.joke ? 10 : 0;
    return { home: 'kipperton', away: R.opp, stadium: R.stadium, kind: 'cup', draws: 'cup', referee: R.referee, buffs, euphoria: [eu, 0], formation: [c.formation || null, null], humans, challenge: R.challenge, roundIndex: c.round };
  }
};
/* ---- the tabloid page (THE DAILY ROAR) ---- */
EF.drawTabloid = (g, r, st, t, photoRig) => {
  const k = Math.min(1, t / .6), spin = (1 - ease.outCubic(k)) * 6, sc = .3 + .7 * ease.outBack(k), w = Math.round(Math.min(r.W - 30, 330) * sc), h = Math.round(Math.min(r.H - 40, 200) * sc), cx = r.W / 2, cy = r.H / 2 - 8;
  const x = Math.round(cx - w / 2 + Math.sin(spin) * 20 * (1 - k)), y = Math.round(cy - h / 2);
  px.rect(g, x + 4, y + 4, w, h, '#05060a'); px.rect(g, x, y, w, h, '#ece6d6');
  for (let i = 0; i < h; i += 3) px.rect(g, x, y + i, w, 1, i % 6 ? '#e4dccb' : '#efe9da');
  if (k < .85) return;
  px.rect(g, x + 4, y + 4, w - 8, 18, '#c8202a'); E.font.title(g, 'THE DAILY ROAR', cx, y + 6, { align: 'center', scale: 1, colors: ['#ffffff', '#ffe0e0'], outline: '#5a0a10', depth: 0 });
  E.font.text(g, 'EUROPHORIA CUP SPECIAL   ·   ONE KIPPER'.replace('·', '-'), cx, y + 25, '#3a3a3a', { align: 'center', font: 'tiny', outline: false });
  const hl = E.font.wrap(st.headline, w - 16, { scale: 2 }), hs = hl.length > 2 ? 1 : 2, lines = hs === 2 ? hl : E.font.wrap(st.headline, w - 16);
  lines.forEach((ln, i) => E.font.text(g, ln, cx, y + 34 + i * (hs === 2 ? 17 : 10), '#141414', { align: 'center', scale: hs, outline: false }));
  const ty = y + 38 + lines.length * (hs === 2 ? 17 : 10), pw = Math.min(90, Math.round(w * .3)), ph = Math.min(h - (ty - y) - 8, 80);
  if (photoRig && ph > 20) { px.rect(g, x + 8, ty, pw, ph, '#3a3a3a'); photoRig.drawPortrait(g, x + 10, ty + 2, Math.min(pw - 4, ph - 4), { zoom: 2.2, turn: .4, bg: '#7a7a7a' }); px.blend(g, .35, 'multiply', () => px.rect(g, x + 8, ty, pw, ph, '#b8b0a0')); }
  const tx = x + 14 + pw, tw = w - pw - 22;
  E.font.text(g, st.sub, tx, ty, '#141414', { outline: false, wrap: tw });
  const sl = E.font.wrap(st.sub, tw).length; E.font.text(g, st.body || '', tx, ty + sl * 9 + 6, '#4a4a4a', { outline: false, wrap: tw });
};
/* ---- the travel map: a fictional Europe, the minibus "The Old Trout" on a dotted route ---- */
const LANDS = [[[.1, .1], [.45, .05], [.55, .18], [.48, .3], [.36, .34], [.3, .26], [.2, .3], [.12, .22]], [[.36, .34], [.6, .25], [.82, .3], [.86, .55], [.7, .62], [.62, .8], [.55, .88], [.5, .72], [.42, .64], [.3, .62], [.14, .7], [.1, .9], [.3, .96], [.26, .78], [.2, .72], [.3, .52], [.38, .42]], [[.88, .1], [.96, .2], [.92, .4], [.84, .26]]];
EF.drawTravel = (g, r, st, t) => {
  const [mx, my] = EF.HUD.margin(r), w = r.W - 2 * mx, h = r.H - 2 * my - 30, x0 = mx, y0 = my + 20, snow = st.snow && t > 1;
  px.rect(g, x0, y0, w, h, '#2a5a8a'); for (let i = 0; i < 30; i++) px.rect(g, x0 + (i * 53) % w, y0 + (i * 37) % h, 3, 1, '#3a6a9a');
  for (const L of LANDS) { const pts = L.map(([u, v]) => [x0 + u * w, y0 + v * h]); px.poly(g, pts, snow ? '#e8eef6' : '#7a9a5a'); px.poly(g, pts.map(([a, b]) => [a + 2, b - 2]), snow ? '#f8fbff' : '#8aaa6a'); }
  const C = EF.CUP.cities, A = C[st.from], B = C[st.to], ax = x0 + A[0] * w, ay = y0 + A[1] * h, bx = x0 + B[0] * w, by = y0 + B[1] * h;
  for (const k in C) { const c = C[k], X = x0 + c[0] * w, Y = y0 + c[1] * h; px.disc(g, X, Y, 3, '#c8202a'); E.font.text(g, c[2], X, Y + 5, '#ffffff', { align: 'center', font: 'tiny', outline: '#1a1a1a' }); }
  const u = clamp((t - .4) / 3, 0, 1), mxp = lerp(ax, bx, ease.inOut(u)), myp = lerp(ay, by, ease.inOut(u)) - Math.abs(Math.sin(u * 30)) * 2;
  for (let i = 0; i <= 24; i++) { const q = i / 24; if (q > u) px.rect(g, Math.round(lerp(ax, bx, q)), Math.round(lerp(ay, by, q)), 2, 2, '#ffe070'); }
  const dir = bx > ax ? 1 : -1;   // the Old Trout
  px.rect(g, mxp - 9, myp - 9, 18, 8, '#f08a24'); px.rect(g, mxp - 9, myp - 9, 18, 2, '#ffffff'); px.rect(g, mxp + (dir > 0 ? 3 : -8), myp - 7, 5, 3, '#8ac0e8');
  px.disc(g, mxp - 5, myp - 1, 2, '#1a1a1a'); px.disc(g, mxp + 5, myp - 1, 2, '#1a1a1a'); if (Math.floor(t * 6) % 2) px.rect(g, mxp - dir * 11, myp - 4, 2, 2, '#9a9aa0');
  if (st.postcard && t > 1.2) { const pw = Math.min(w - 20, 220); E.ui.box(g, Math.round(r.W / 2 - pw / 2), y0 + h - 40, pw, 30, { bg: ['#f4ecd8', '#e8dcc0'], border: '#8a6a3a' }); E.font.text(g, st.postcard, r.W / 2, y0 + h - 30, '#3a2a1a', { align: 'center', outline: false, wrap: pw - 10 }); }
  E.font.text(g, 'ON THE ROAD: ' + B[2], r.W / 2, my + 4, '#ffe08a', { align: 'center', scale: 2, outline: '#000' });
};
/* ---- the cup scene: the bracket and the beats ---- */
EF.scenes.cup = front({ music: 'menu', stadium: 'smokehouse', idle: true, dim: .65,
  enter(d) {
    if (d.fresh) CUPS.start(); if (!CUPS.data().cup) CUPS.start();
    this.beat = null; this.step = -1; this.t = 0; this.talk = new E.Dialog(game, { lines: 3, speed: 30, border: '#ffc83a', bg: '#0d1430' });
    if (d.after) return this.afterMatch(d.after, d.match);
    if (d.post) return this.post(d.post);
    if (d.round !== undefined) { CUPS.data().cup.round = d.round; CUPS.data().cup.prologue = true; }
    if (d.beat) return this.play(d.beat, d.then);
    this.bracket();
  },
  bracket() {
    const c = CUPS.data().cup; this.beat = null; EF.music('menu');
    EF.UI.set([{ id: 'bracket', widgets: [{ id: 'go', kind: 'button', title: c.round === 0 && !c.prologue ? 'KICK OFF THE CUP RUN' : c.done ? 'BACK TO THE TITLE' : 'PLAY ' + CUPS.round().name, onPick: () => this.next() }],
      layout(r) { const w = this.widgets[0]; w.w = 220; w.h = 22; w.x = r.W / 2 - 110; w.y = r.H - 52; },
      draw: (g, r) => this.drawBracket(g, r), footer: () => [['confirm', 'GO'], ['cancel', 'TITLE']], onBack: () => game.go('title', { menu: true }) }]);
  },
  drawBracket(g, r) {
    const c = CUPS.data().cup, [mx, my] = EF.HUD.margin(r);
    E.font.title(g, 'THE EUROPHORIA CUP', r.W / 2, my, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    const n = 5, cw = Math.min(78, Math.floor((r.W - 2 * mx) / n) - 4), ch = 94, x0 = Math.round(r.W / 2 - (n * (cw + 4)) / 2), y = my + 26;
    EF.CUP.rounds.forEach((R, i) => {
      const x = x0 + i * (cw + 4), cur = i === c.round && !c.done, res = c.results[i], T = EF.get('team', R.opp);
      E.ui.box(g, x, y, cw, ch, { bg: cur ? ['#1c2a5c', '#2a3a74'] : ['#0d1430', '#16224a'], border: cur ? '#ffc83a' : res ? '#5aff7a' : '#2a3a6a' });
      E.font.text(g, R.short, x + cw / 2, y + 4, cur ? '#ffc83a' : '#9aa6c8', { align: 'center', font: 'tiny', outline: false });
      if (i <= c.round || res) EF.drawCrest(g, T, x + cw / 2, y + 34, 26); else { px.disc(g, x + cw / 2, y + 34, 12, '#2a3050'); E.font.text(g, '?', x + cw / 2, y + 28, '#5a6280', { align: 'center', scale: 2, outline: false }); }
      E.font.text(g, i <= c.round || res ? T.short : '???', x + cw / 2, y + 52, '#ffffff', { align: 'center', outline: false });
      E.font.text(g, EF.get('stadium', R.stadium).city, x + cw / 2, y + 63, '#7a86a8', { align: 'center', font: 'tiny', outline: false });
      if (res) E.font.text(g, res.score.join('-') + (res.pens ? ' P' : ''), x + cw / 2, y + 74, '#5aff7a', { align: 'center', scale: 1, outline: false });
      if (cur) { const bx = x + cw / 2 + Math.sin(game.real * 3) * 4; px.rect(g, bx - 7, y + ch + 3, 14, 6, '#f08a24'); px.disc(g, bx - 4, y + ch + 10, 2, '#1a1a1a'); px.disc(g, bx + 4, y + ch + 10, 2, '#1a1a1a'); }
    });
    if (c.done) E.font.text(g, 'CHAMPIONS OF EUROPE!', r.W / 2, y + ch + 16, '#ffe08a', { align: 'center', scale: 2, outline: '#000' });
  },
  /** the next thing in the cup: the prologue, the villain, a round's pre-match beat */
  next() {
    const c = CUPS.data().cup;
    if (c.done) return game.go('title', { menu: true });
    if (!c.prologue) return this.play('prologue', () => { c.prologue = true; EF.Save.sticker('mags'); EF.Save.write(); this.next(); });
    if (c.round === 4 && !c.flags.villain) return this.play('villain', () => this.next());
    this.play('r' + (c.round + 1) + '-pre');
  },
  /** run a beat's steps in order */
  play(id, then) { this.beat = EF.get('beat', id); this.step = -1; this.then = then || null; this.nextStep(); },
  nextStep() {
    const B = this.beat; this.step++; this.t = 0; game.input.consumeAll();
    if (!B || this.step >= B.steps.length) { const f = this.then; this.beat = null; this.then = null; if (f) return f(); return this.bracket(); }
    const st = B.steps[this.step], c = CUPS.data().cup;
    EF.UI.set([]);
    if (st.kind === 'tabloid') { EF.music('tabloid'); EF.sfx('paper'); this.photo = st.photo ? EF.Cast.rig(st.photo.team + ':' + st.photo.player) : null; if (this.photo && st.photo.pose) this.photo.update(.5, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: st.photo.pose, expr: st.photo.expr }); }
    else if (st.kind === 'travel') { EF.music('travel'); }
    else if (st.kind === 'talk') {
      EF.music(st.villain ? 'villain' : 'dressing');
      const lines = st.lines.slice(), sayNext = () => {
        const ln = lines.shift(); if (!ln) return this.nextStep();
        const last = !lines.length, who = ln[0];
        this.talk.say(ln[1], { name: EF.Cast.name(who), portrait: EF.Cast.rig(who), portraitSize: 40, portraitOpts: { zoom: 2.6, turn: .35 }, voice: EF.babble.voiceFor(who), place: 'bottom',
          choices: last && st.choices ? st.choices : null, onChoice: i => this.choice(st, i), onDone: () => { if (!(last && st.choices)) sayNext(); } });
      };
      this.speaker = st.lines[0][0]; sayNext();
    }
    else if (st.kind === 'teamtalk') this.teamTalk();
    else if (st.kind === 'challenge') { EF.sfx('coin'); }
    else if (st.kind === 'tunnel') { const R = CUPS.round(); game.go('tunnel', { opts: CUPS.matchOpts(this.humans()), next: { scene: 'cup', data: { resumeMatch: true } } }); this.leaving = true; }
    else if (st.kind === 'match') this.startMatch();
  },
  humans() { return [{ input: game.input, side: 0 }].concat((EF.cupCoop || []).filter(I => game.players.includes(I)).map(I => ({ input: I, side: 0 }))); },
  choice(st, i) {
    const c = CUPS.data().cup;
    if (this.beat.id === 'prologue') { if (i === 1) { c.prologue = true; EF.Save.sticker('mags'); EF.Save.write(); return game.go('training', { back: { scene: 'cup', data: {} } }); } return this.nextStep(); }
    if (this.beat.id === 'villain') { c.flags.villain = true; if (i === 0) { c.flags.loyal = true; EF.Save.sticker('loyal'); } else c.flags.joke = true; EF.Save.write(); return this.play(i === 0 ? 'villain-loyal' : 'villain-joke', () => this.next()); }
    this.nextStep();
  },
  /** the team talk: three cards; the tactics board asks for a formation; extra players may join for co-op */
  teamTalk() {
    const c = CUPS.data().cup, talks = ['hairdryer', 'arm', 'tactics'].map(id => EF.get('teamtalk', id));
    game.allowJoin({ max: 4, onJoin: I => { EF.cupCoop = (EF.cupCoop || []).concat([I]); } });
    EF.music('dressing');
    const pick = tt => {
      c.talk = tt.id; c.teamTalks++; EF.Save.write();
      const line = tt.lines[c.teamTalks % tt.lines.length];
      if (tt.formation) { EF.UI.push({ id: 'formation', widgets: ['2-2', '1-2-1', '2-1-1'].map(f => ({ id: f, kind: 'tile', title: f, text: f === '2-2' ? 'TWO AND TWO' : f === '1-2-1' ? 'THE DIAMOND' : 'THE KIPPER', icon: (g, cx, cy, s) => EF.drawFormation(g, f, cx, cy, s), onPick: () => { c.formation = f; EF.Save.write(); EF.UI.set([]); this.say('mags', line, () => this.nextStep()); } })),
        layout(r) { EF.UI.grid(this.widgets, 0, 40, r.W, r.H - 70, 3, 96, 96, 8); }, draw: (g, r) => EF.UI.panel(g, r, 'TACTICS BOARD', 'PICK THE FORMATION'), footer: () => [['confirm', 'PICK']] }); return; }
      EF.UI.set([]); this.say('mags', line, () => this.nextStep());
    };
    EF.UI.set([{ id: 'teamtalk', widgets: talks.map(tt => ({ id: tt.id, kind: 'tile', title: tt.name, text: tt.desc, icon: (g, cx, cy, s) => EF.icon(tt.id === 'hairdryer' ? 'whistle' : tt.id === 'arm' ? 'sticker' : 'cone')(g, cx, cy, s), onPick: () => pick(tt) })),
      layout(r) { EF.UI.grid(this.widgets, 0, 40, r.W, r.H - 74, 3, Math.min(124, Math.floor((r.W - 30) / 3) - 6), 104, 6); },
      draw: (g, r) => { EF.UI.panel(g, r, 'TEAM TALK', 'WHAT DOES MAGS SAY?'); if (game.players.length > 1) E.font.text(g, game.players.length + ' KIPPERS PLAYING (CO-OP)', r.W / 2, r.H - 36, '#7aff9a', { align: 'center', outline: '#000' }); else E.font.text(g, 'A FRIEND CAN JOIN: START ON A PAD, OR 2 ON THE KEYBOARD', r.W / 2, r.H - 36, '#9aa6c8', { align: 'center', font: 'tiny', outline: '#000' }); },
      footer: () => [['confirm', 'PICK']] }]);
  },
  say(who, text, done) { this.talk.say(text, { name: EF.Cast.name(who), portrait: EF.Cast.rig(who), portraitSize: 40, portraitOpts: { zoom: 2.6, turn: .35 }, voice: EF.babble.voiceFor(who), onDone: done }); },
  startMatch() {
    game.allowJoin(false);
    const opts = CUPS.matchOpts(this.humans());
    game.go('match', { opts, label: CUPS.round().name, onEnd: (res, m) => game.go('cup', { after: res, match: m }) });
  },
  afterMatch(res, m) {
    const c = CUPS.data().cup, idx = c.round, R = CUPS.round(), won = res.winner === 0;
    c.playT = (c.playT || 0) + (m ? m.t : 0);
    const stickers = m ? EF.matchStickers(m, res) : [];
    EF.quietStickers = true;
    if (m && m.challengeDone && EF.Save.sticker('ch:' + R.challenge, true)) stickers.push('ch:' + R.challenge);
    EF.quietStickers = false;
    if (EF.all('challenge').every(ch => EF.Save.has('ch:' + ch.id))) EF.Save.unlock('balls', 'leather');
    let final = false;
    if (won) {
      c.results[idx] = { opp: R.opp, score: res.score.slice(), pens: res.pens };
      const margin = res.score[0] - res.score[1], rec = CUPS.data().records; if (!rec.biggestWin || margin > rec.biggestWin.margin) rec.biggestWin = { margin, score: res.score.slice(), opp: R.opp };
      if (idx === 4) { final = true; c.done = true; rec.cupsWon = (rec.cupsWon || 0) + 1; if (!rec.fastestCup || c.playT < rec.fastestCup) rec.fastestCup = Math.round(c.playT); EF.Save.unlock('balls', 'golden'); }
      else c.round++;
    }
    EF.Save.write();
    game.go('results', { result: res, opts: { humans: [{ side: 0 }] }, stickers, contLabel: 'CONTINUE', next: () => game.go('cup', { post: { won, round: idx, final } }) });
  },
  post(p) {
    if (p.won) { if (p.final) return game.go('ending', {}); return this.play('r' + (p.round + 1) + '-win', () => this.bracket()); }
    this.play('r' + (p.round + 1) + '-loss', () => this.continueScreen());
  },
  /** CONTINUE? 10 s, arcade style: confirm retries the round from its team talk, cancel goes to the title */
  continueScreen() {
    const c = CUPS.data().cup; this.cont = 10; EF.music('defeat');
    EF.UI.set([{ id: 'continue', widgets: [{ id: 'yes', kind: 'button', title: 'CONTINUE', onPick: () => { c.retries++; EF.Save.write(); this.cont = null; this.play('r' + (c.round + 1) + '-pre-retry'); } }, { id: 'no', kind: 'button', title: 'GIVE UP', onPick: () => { this.cont = null; game.go('title', { menu: true }); } }],
      layout(r) { this.widgets.forEach((w, i) => { w.w = 110; w.h = 22; w.x = Math.round(r.W / 2 - 116 + i * 122); w.y = Math.round(r.H * .62); }); },
      draw: (g, r) => { E.font.title(g, 'KNOCKED OUT!', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 3, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'] }); E.font.text(g, 'CONTINUE?', r.W / 2, Math.round(r.H * .38), '#ffffff', { align: 'center', scale: 2, outline: '#000' }); E.font.text(g, String(Math.max(0, Math.ceil(this.cont || 0))), r.W / 2, Math.round(r.H * .46), '#ffc83a', { align: 'center', scale: 3, outline: '#000' }); },
      footer: () => [['confirm', 'RETRY'], ['cancel', 'GIVE UP']], onBack: () => { this.cont = null; game.go('title', { menu: true }); } }]);
  },
  update(dt) {
    this.t += dt;
    if (this.cont !== null && this.cont !== undefined) { const was = Math.ceil(this.cont); this.cont -= dt; if (Math.ceil(this.cont) < was) EF.sfx('tick'); if (this.cont <= 0) { this.cont = null; game.go('title', { menu: true }); } }
    if (this.talk.open) { this.talk.update(dt); return true; }
    const B = this.beat; if (!B) return false;
    const st = B.steps[this.step]; if (!st) return false;
    if (st.kind === 'tabloid' || st.kind === 'travel' || st.kind === 'challenge') {
      if (st.kind === 'tabloid' && Math.floor(this.t * 12) !== Math.floor((this.t - dt) * 12) && this.t < .6) EF.sfx('typewriter');
      const go = EF.UI.pressed('confirm') || EF.UI.pressed('start') || (game.input.clicked && game.input.clicked()) || (st.kind === 'travel' && this.t > 5.5);
      if (go && this.t > .5) { EF.sfx('confirm'); this.nextStep(); }
      return true;
    }
    if (st.kind === 'teamtalk') return false;
    return true;
  },
  draw(r) {
    const B = this.beat, st = B && B.steps[this.step];
    if (st) r.overlay(g => {
      if (st.kind === 'tabloid') EF.drawTabloid(g, r, st, this.t, this.photo);
      else if (st.kind === 'travel') EF.drawTravel(g, r, st, this.t);
      else if (st.kind === 'challenge') { const R = CUPS.round(), ch = EF.get('challenge', R.challenge), w = Math.min(r.W - 40, 260), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .3); E.ui.box(g, x, y, w, 80, { bg: ['#2a1a4a', '#3a2a6a'], border: '#ffc83a' }); E.font.text(g, "THE GAFFER'S CHALLENGE", r.W / 2, y + 8, '#ffc83a', { align: 'center', outline: false }); E.font.text(g, ch.name, r.W / 2, y + 26, '#ffffff', { align: 'center', scale: 2, outline: '#000', wrap: w - 10 }); E.font.text(g, 'Optional. Do it for a SHINY sticker.', r.W / 2, y + 60, '#c8d0e8', { align: 'center', outline: false }); }
      if (st.kind === 'tabloid' || st.kind === 'travel' || st.kind === 'challenge') EF.prompts(g, r.W / 2, r.H - Math.max(5, Math.round(r.H * .035)) - 12, [['confirm', 'CONTINUE']], { input: game.input });
    });
    this.talk.draw(r);
  },
  scene: {}
});
/* a round's beat again after CONTINUE: straight to the team talk */
/* resuming after the tunnel: the cup scene goes straight to the match */
const _cupEnter = EF.scenes.cup.enter;
EF.scenes.cup.enter = function (d) { if (d && d.resumeMatch) { EF.Stage.enter(); this.talk = new E.Dialog(game, { lines: 3, speed: 30 }); this.beat = null; return this.startMatch(); } return _cupEnter.call(this, d); };
EF.drawFormation = (g, f, cx, cy, s) => {
  const F = EF.get('formation', f), w = s * 1.2, h = s * .8;
  px.rect(g, cx - w / 2, cy - h / 2, w, h, '#2a6a3a'); px.rect(g, cx - w / 2, cy, w, 1, '#8ac08a');
  for (const k in F.roles) { const [u, v] = F.roles[k].base; px.disc(g, cx - w / 2 + v * w, cy + h / 2 - u * h, 3, F.roles[k].keeper ? '#3ac06a' : '#f08a24'); }
};

/* ---- THE TUNNEL (section 6.24): the walkout, the handshakes, the coin toss; also the AI Hub's card ---- */
EF.scenes.tunnel = Object.assign(EF.sceneBase(), {
  enter(d) {
    this.d = d; this.t = 0; this.card = !!d.card; const o = d.opts;
    const m = this.m = new EF.Match({ home: o.home, away: o.away, stadium: o.stadium, kind: 'title', seed: 3, halfLength: 999, noReplay: true, humans: [], events: false, kits: o.kits, weather: o.weather, time: o.time });
    this.view = new EF.MatchView(m); this.dur = d.short ? 5 : 9;
    m.players.forEach((f, i) => { f.body.x = P.CX + (f.side ? 8 : -8); f.body.y = P.Y1 + 50 + (f.idx) * 10; f.facing = -Math.PI / 2; });
    m.ref.body.x = P.CX; m.ref.body.y = P.Y1 + 40;
    EF.Stage.enter(); game.setZoom(1.1); game.cam.smooth = .5;
    const W = m.weather; game.weather = W && (W.kind === 'rain' || W.kind === 'snow') ? { kind: W.kind, amount: W.amount * .6, wind: W.wind || 0 } : null;
    EF.music('anthem'); EF.crowdAudio.start(m.stadium.crowd.size); EF.crowdAudio.set(.8, 1);
    this.coin = 0;
    if (this.card) EF.Hub && EF.Hub.cardEnter && EF.Hub.cardEnter(this);
  },
  exit() { this.view.dispose(); EF.crowdAudio.stop(); game.weather = null; },
  update(dt) {
    const m = this.m, t = this.t += dt; m.t += dt;
    const lineY = P.CY + 30, k = this.card ? Math.min(1, t / 6) : Math.min(1, t / (this.dur * .55));
    m.players.forEach(f => {
      const slot = f.idx, tx = P.CX + (f.side ? 1 : -1) * (24 + slot * 18), ty = lineY - (f.side ? 0 : 0);
      const startY = P.Y1 + 50 + slot * 10, walk = clamp(k * 1.6 - slot * .12, 0, 1), x = lerp(P.CX + (f.side ? 8 : -8), tx, ease.inOut(clamp(walk * 1.4 - .4, 0, 1))), y = lerp(startY, ty, ease.inOut(Math.min(1, walk * 1.3)));
      f.body.vx = (x - f.body.x) / Math.max(dt, 1e-3); f.body.vy = (y - f.body.y) / Math.max(dt, 1e-3); f.body.x = x; f.body.y = y;
      f.facing = walk >= 1 ? Math.PI / 2 : Math.atan2(f.body.vy, f.body.vx || .0001);
      if (walk >= 1) { f.body.vx = f.body.vy = 0; }
      f.look.pose = !this.card && t > this.dur * .6 && t < this.dur * .8 && f.side === 1 ? null : walk >= 1 ? null : null;
    });
    // the handshakes: the away line walks along the home line, arms out
    if (!this.card && t > this.dur * .6 && t < this.dur * .82) { const u = (t - this.dur * .6) / (this.dur * .22); for (const f of m.side[1]) { f.body.x = P.CX + 24 + f.idx * 18 - u * 140; f.body.y = lineY + 10; f.facing = Math.PI; f.body.vx = -60; } }
    m.ref.body.x = P.CX; m.ref.body.y = lerp(P.Y1 + 40, lineY - 20, Math.min(1, k * 1.4)); m.ref.facing = Math.PI / 2;
    for (const f of m.players) f.updateLook(dt, EF.Intent.idle);
    for (const f of m.side[1]) f.look.pose = !this.card && t > this.dur * .6 && t < this.dur * .82 ? 'cast' : null;
    this.view.update(dt, m);
    EF.crowdAudio.set(.7, dt);
    game.focus(P.CX, lineY + 10, 0);
    if (!this.card && t > this.dur * .84) this.coin += dt;
    if (this.card) { if (EF.Hub && EF.Hub.cardStep) EF.Hub.cardStep(dt, this); return; }
    const skip = t > .6 && (EF.UI.pressed('confirm') || EF.UI.pressed('start') || (game.input.clicked && game.input.clicked()));
    if (t > this.dur + .4 || skip) { game.input.consumeAll(); const n = this.d.next; game.go(n.scene, n.data); }
  },
  draw(r) {
    this.view.draw(r, this.m);
    const m = this.m;
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r);
      if (this.card) { if (EF.Hub && EF.Hub.cardDraw) EF.Hub.cardDraw(g, r, this); return; }
      E.ui.box(g, Math.round(r.W / 2 - 150), my, 300, 34, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .9 });
      EF.drawCrest(g, m.teams[0], Math.round(r.W / 2 - 132), my + 17, 22); EF.drawCrest(g, m.teams[1], Math.round(r.W / 2 + 132), my + 17, 22);
      E.font.text(g, m.teams[0].short + '  V  ' + m.teams[1].short, r.W / 2, my + 5, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
      E.font.text(g, m.stadium.name + '  -  ' + (this.d.label || EF.titleCase(m.stadium.city)), r.W / 2, my + 23, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      if (this.coin > 0) { const fr = EF.SPR.coin[Math.floor(this.coin * 12) % 3], up = Math.sin(Math.min(1, this.coin / 1.2) * Math.PI) * 30; px.sprite(g, fr, Math.round(r.W / 2 - 3), Math.round(r.H * .45 - up), { scale: 2 }); if (this.coin > 1.2) E.font.text(g, m.teams[m.rng() < .5 ? 0 : 1].short + ' KICK OFF', r.W / 2, Math.round(r.H * .52), '#ffe08a', { align: 'center', scale: 2, outline: '#000' }); }
      EF.prompts(g, r.W / 2, r.H - my - 12, [['confirm', 'SKIP']], { input: game.input });
    });
  }
});

/* ---- THE ENDING (section 6.24): the trophy lift, the harbour parade, the closing tabloid, the credits ---- */
const HARBOUR_ROWS = (() => {
  const rows = [], C = 90, R = 22;
  for (let r = 0; r < R; r++) { let s = ''; for (let c = 0; c < C; c++) s += r < 4 ? (c % 7 === 6 ? ':' : (c % 7 < 3 ? 'H' : 'h')) : r < 6 ? ':' : r < 12 ? '.' : r < 14 ? ':' : r === 14 ? 'q' : '~'; rows.push(s); }
  return rows;
})();
EF.scenes.ending = Object.assign(EF.sceneBase(), {
  enter() {
    this.t = 0; this.phase = 'ceremony'; this.pt = 0;
    const m = this.m = new EF.Match({ home: 'kipperton', away: 'opulence', stadium: 'euphorium', kind: 'title', seed: 5, halfLength: 999, noReplay: true, humans: [], events: false });
    this.view = new EF.MatchView(m); m.ref.body.x = -999;
    for (const f of m.side[1]) f.ghost = true;
    m.side[0].forEach((f, i) => { f.body.x = P.CX - 40 + i * 20; f.body.y = P.CY + 10; f.facing = Math.PI / 2; });
    this.daz = m.side[0].find(f => f.data.id === 'pilchard');
    EF.Stage.enter(); game.setZoom(1.25); EF.music('ceremony');
    this.harbour = new E.TileMap({ rows: HARBOUR_ROWS, legend: { H: 1, h: 2, ':': { floor: 'pave' }, '.': { floor: 'road' }, q: 3, '~': { floor: 'water', block: true } },
      types: { 1: { h: 44, face: 'plaster', roof: 'tiles', side: '#e8dcc8', top: '#b85a3a' }, 2: { h: 38, face: 'timber', roof: 'tiles', side: '#d8c8a8', top: '#8a4a3a', beam: '#5a3a2a' }, 3: { h: 6, face: 'stone', side: '#7a7a80', top: '#9a9aa0' } },
      floorTex: (x, y, tag) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5; if (tag === 'water') { const w = E.noise2(x * .05 + this.t * .3, y * .08) * 30; return [40 + w * .3, 90 + w, 140 + w + n * 10]; } if (tag === 'road') return [70 + n * 14, 70 + n * 14, 78 + n * 14]; return [150 + n * 20, 140 + n * 20, 128 + n * 20]; } });
    this.fans = []; for (let i = 0; i < 70; i++) this.fans.push({ x: i * 20 + EF.fx(0, 10), y: i % 2 ? 5 * 16 + 4 : 12 * 16 + 10, c: EF.fxPick(['#f08a24', '#1c2a5a', '#ffffff', '#f08a24']), ph: EF.fx(0, 9) });
    this.credits = ['EUROPHORIA FOOTBALL', '', 'A BROKE SEASIDE CLUB.', 'A TYPO.', 'A CUP.', '', 'MADE BY CLAUDE', '(ANTHROPIC, CLAUDE-OPUS-5-5)', '', 'ENGINE: MY-3D2DGE BY MICHAEL CROSATO', '', 'MOTION: QUATERNIUS, MESH2MOTION,', 'THE CMU MOTION CAPTURE DATABASE', '', 'ONLINE: AI HUB SESSIONS', '', 'COMMENTARY: BARRY BELLOW AND TREV BRICKLEY', 'MANAGER: MAGS MULLIGAN', '', 'THE KIPPERS:', 'WALLY CRABB', 'SANDRA OKAFOR', 'AGGIE NOWAK', 'TOMMY TRAN', 'DAZ PILCHARD', '', 'KINGSBRIDGE ALBION HAVE DEMANDED A RECOUNT.', '', 'THANK YOU FOR PLAYING'];
  },
  exit() { this.view.dispose(); game.lights.enabled = false; },
  update(dt) {
    const t = this.t += dt, m = this.m; m.t += dt;
    const skip = EF.UI.pressed('confirm') || EF.UI.pressed('start') || (game.input.clicked && game.input.clicked());
    if (this.phase === 'ceremony') {
      for (const f of m.side[0]) { f.body.z = f === this.daz ? 8 : Math.abs(Math.sin(t * 6 + f.idx)) * 6; f.look.pose = 'cheer'; f.look.expr = 'shout'; f.updateLook(dt, EF.Intent.idle); f.look.pose = 'cheer'; f.look.expr = 'shout'; }
      if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) { game.particles.bits(P.CX + EF.fx(-80, 80), P.CY + EF.fx(-20, 20), 60, 20, EF.SPR.confetti); if (EF.fxRng() < .5) this.view.fireworks(1); }
      this.view.update(dt, m); game.focus(P.CX, P.CY, 20);
      if (t > 9 || (skip && t > 1)) { this.phase = 'parade'; this.pt = 0; game.lights.enabled = false; EF.music('anthem'); game.input.consumeAll(); }
    } else if (this.phase === 'parade') {
      this.pt += dt; const x = 40 + this.pt * 60;
      game.cam.bounds = v => this.harbour.bounds(v); game.focus(x + 60, 8 * 16, 0);
      for (const f of m.side[0]) { const rig = this.view.rigOf(f); rig.update(dt, { x: x + f.idx * 10 - 20, y: 8 * 16 + 4 + (f.idx % 2) * 6, z: 26 + Math.abs(Math.sin(this.pt * 6 + f.idx)) * 4, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'shout' }); }
      if (EF.fxRng() < dt * 6) game.particles.bits(x + EF.fx(-40, 80), EF.fxRng() < .5 ? 5 * 16 : 12 * 16, 20, 4, ['#f08a24', '#1c2a5a', '#ffffff']);
      if (this.pt > 22 || (skip && this.pt > 1)) { this.phase = 'tabloid'; this.tt = 0; game.input.consumeAll(); EF.sfx('paper'); this.photo = EF.Cast.rig('kipperton:pilchard'); this.photo.update(.5, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'shout' }); }
    } else if (this.phase === 'tabloid') { this.tt += dt; if ((skip && this.tt > .8) || this.tt > 8) { this.phase = 'credits'; this.ct = 0; EF.music('credits'); game.input.consumeAll(); } }
    else if (this.phase === 'credits') { this.ct += dt; if (this.ct > this.credits.length * 1.1 + 6 || (skip && this.ct > 1)) { game.go('title', { menu: true }); } }
  },
  draw(r) {
    if (this.phase === 'ceremony') {
      this.view.draw(r, this.m);
      r.queue(P.CX, P.CY + 2, 4, g => r.box(g, P.CX - 60, P.CY - 4, 0, P.CX + 60, P.CY + 8, 6, '#e8e0d0', '#c8b8a0'));
      const d = this.daz, rig = this.view.rigOf(d), h = rig.hand('R');
      r.queue(h[0], h[1], h[2] + 8, g => EF.drawTrophy(g, r, h[0], h[1], h[2] + 2, 1.4), { emissive: true, bias: 5 });
      r.overlay(g => { E.font.title(g, 'CHAMPIONS OF EUROPE!', r.W / 2, Math.round(r.H * .1), { align: 'center', scale: r.W > 380 ? 3 : 2, colors: ['#fffbe8', '#ffe08a', '#ffc83a', '#e0662a'], depth: 3 }); E.font.text(g, 'KIPPERTON ATHLETIC LIFT THE EUROPHORIA CUP', r.W / 2, Math.round(r.H * .1) + 32, '#ffffff', { align: 'center', outline: '#000' }); });
    } else if (this.phase === 'parade' || this.phase === 'credits' || this.phase === 'tabloid') {
      r.sky(['#5a9ad8', '#9ac8f0', '#e8f0f8']);
      this.harbour.drawFloor(r); this.harbour.queueWalls(r);
      const x = 40 + (this.pt || 0) * 60, ty = 8 * 16 + 4;
      r.queue(x, ty + 14, 10, g => { r.box(g, x - 34, ty - 10, 6, x + 34, ty + 14, 24, '#2a4a8a', '#f08a24'); r.box(g, x + 10, ty - 6, 24, x + 28, ty + 10, 44, '#ffffff', '#e8e0d0'); const a = r.w(x - 20, ty + 14, 6), b = r.w(x + 20, ty + 14, 6); px.disc(g, a[0], a[1], 5, '#1a1a1a'); px.disc(g, b[0], b[1], 5, '#1a1a1a'); const n = r.w(x - 10, ty, 26); E.font.text(g, 'KIPPERTON', n[0], n[1] - 2, '#ffffff', { font: 'tiny', outline: '#000' }); });
      r.prop('banner', x + 20, ty, 44, { color: '#f08a24' });
      for (const f of this.m.side[0]) { const rig = this.view.rigOf(f); r.actor(rig.x, rig.y, rig.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
      for (const fan of this.fans) r.queue(fan.x, fan.y, 0, g => { const p = r.w(fan.x, fan.y, 0), up = Math.abs(Math.sin(this.t * 6 + fan.ph)) * 3; px.rect(g, p[0] - 2, p[1] - 8 - up, 5, 6, fan.c); px.rect(g, p[0] - 1, p[1] - 11 - up, 3, 3, '#f0c8a8'); px.rect(g, p[0] - 3, p[1] - 13 - up, 1, 4, fan.c); px.rect(g, p[0] + 3, p[1] - 13 - up, 1, 4, fan.c); });
      for (let i = 0; i < 4; i++) { const gx = x + 100 * Math.sin(this.t * .3 + i * 2), gy = 60 + i * 30; r.sprite(gx, gy, 90 + i * 10, EF.SPR.gull, {}); }
      for (let i = 0; i < 6; i++) r.prop(i % 2 ? 'barrel' : 'crate', 100 + i * 240, 13 * 16, 6);
      if (this.phase === 'tabloid') r.overlay(g => EF.drawTabloid(g, r, EF.get('beat', 'ending').steps[0], this.tt, this.photo));
      if (this.phase === 'credits') r.overlay(g => { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000')); this.credits.forEach((ln, i) => { const y = Math.round(r.H + 10 + i * 14 - this.ct * 14); if (y > -10 && y < r.H + 10) E.font.text(g, ln, r.W / 2, y, i === 0 ? '#ffc83a' : '#ffffff', { align: 'center', scale: i === 0 ? 2 : 1, outline: '#000' }); }); });
      if (this.phase === 'parade') r.overlay(g => E.font.text(g, 'THE KIPPERTON HOMECOMING', r.W / 2, Math.max(5, Math.round(r.H * .035)) + 4, '#ffffff', { align: 'center', scale: 2, outline: '#000' }));
    }
    r.overlay(g => EF.prompts(g, r.W / 2, r.H - Math.max(5, Math.round(r.H * .035)) - 12, [['confirm', 'SKIP']], { input: game.input }));
  }
});
/** the Europhoria Cup: a big-eared silver cup on a plinth */
EF.drawTrophy = (g, r, x, y, z, s = 1) => {
  const p = r.w(x, y, z), X = Math.round(p[0]), Y = Math.round(p[1]), k = v => Math.round(v * s * (r.view.zoom || 1));
  px.rect(g, X - k(5), Y - k(3), k(10), k(3), '#4a3a2a'); px.rect(g, X - k(2), Y - k(8), k(4), k(5), '#c8ccd8');
  px.poly(g, [[X - k(6), Y - k(20)], [X + k(6), Y - k(20)], [X + k(3), Y - k(8)], [X - k(3), Y - k(8)]], '#d8dce8');
  px.rect(g, X - k(4), Y - k(19), k(2), k(9), '#ffffff');
  px.rect(g, X - k(10), Y - k(18), k(3), k(7), '#c8ccd8'); px.rect(g, X + k(7), Y - k(18), k(3), k(7), '#c8ccd8');
  r.glowDisc(g, X, Y - k(14), k(5), '#fff6c0', .25);
};
