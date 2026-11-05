/* 32-cup: the Cup Run. The bracket, then each round's beats in order (the prologue first): a travel map, a tabloid back
 * page, talks with portraits and choices, the team talk (three cards; the tactics board picks a formation; friends can
 * join here for co-op), the Gaffer's Challenge, the tunnel, the match, the result, stickers and the autosave. Losing
 * gives CONTINUE? with a countdown. The final leads to the ending: the trophy, the parade, the back page, the credits. */
EF.Cup = {
  get s() { return EF.Save.data.cup; },
  newRun() { EF.Save.data.cup = { round: 0, results: [], flags: {}, talks: [], challenges: {}, done: false, started: game.real, prologue: false }; EF.Save.save(); },
  matchOpts(round, talk, formation) {
    const R = EF.ROUNDS[round], humans = game.players.map(I => ({ input: I, side: 0 }));
    const buffs = [{ side: 0, kind: talk || 'arm' }];
    if (R.villain && this.s.flags.loyal) buffs.push({ side: 0, kind: 'loyal' }); else if (R.villain && this.s.flags.jetski) buffs.push({ side: 0, kind: 'jetski' });
    return { home: 'kipperton', away: R.opp, stadium: R.stadium, referee: R.referee, humans, draws: 'cup', buffs, formation: formation ? [formation, null] : null, cup: round,
      onEnd: (sum, m) => game.go('cup', { after: sum, round }) };
  }
};
// the Gaffer's Challenge: watched during a cup match
const CH = { st: {}, id: null, done: false };
EF.bus.on('*', ev => {
  const m = LIVE.m; if (!m || ev.match !== m || m.o.cup == null || !CH.id || CH.done) return;
  const c = EF.get('challenge', CH.id); if (!c) return;
  if (c.test(m, ev, CH.st)) { CH.done = true; EF.Cup.s.challenges[CH.id] = true; EF.Save.save(); LIVE.hud && LIVE.hud.toast("GAFFER'S CHALLENGE", 'COMPLETE: ' + c.title, { t: 4 }); EF.sfx('perfect'); EF.bus.emit('challengeDone', { id: CH.id }); }
});
const cupScene = {
  touch: [], view: 'broadcast', idle: true,
  enter(d) {
    d = d || {}; this.t = 0; this.q = []; this.cur = null; this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffc83a' }); this.menu = new UIMenu({ onBack: () => this.back() });
    game.allowJoin(false); EF.idle.reset();
    if (!EF.Cup.s && LINK.scene === 'cup' && LINK.part) { EF.Cup.newRun(); const k = LINK.part === 'final' ? 4 : clamp((+LINK.part.slice(1) || 1) - 1, 0, 4); EF.Cup.s.round = k; EF.Cup.s.prologue = true; LINK.part = null; this.q = this.roundBeats(k); this.next(); return; }
    if (d.after) { this.afterMatch(d.after, d.round); return; }
    if (d.round != null) { this.q = this.roundBeats(d.round); this.next(); return; }
    this.q = [{ kind: 'bracket' }]; this.next();
  },
  exit() { game.allowJoin(false); },
  back() { if (this.cur && this.cur.kind === 'bracket') game.go('title', { menu: true }); },
  next() {
    this.cur = this.q.shift() || { kind: 'bracket' }; this.cur.t = 0; this.talk.close(); EF.idle.reset();
    const c = this.cur;
    const music = { bracket: 'menu', tabloid: 'tabloid', travel: 'travel', talk: c.villain ? 'villain' : 'dressing', teamtalk: 'dressing', challenge: 'dressing', result: null, knocked: 'defeat' }[c.kind];
    if (music !== undefined && EF.musicNow !== music) EF.music(music);
    if (c.kind === 'tabloid') EF.sfx('typewriter');
    if (c.kind === 'talk') this.runTalk(c);
    if (c.kind === 'teamtalk') { game.allowJoin({ max: 4 }); }
    if (c.kind === 'go') { const o = EF.Cup.matchOpts(c.round, EF.Cup.s.talks[c.round], EF.Cup.s.formation); CH.id = EF.ROUNDS[c.round].challenge; CH.st = {}; CH.done = !!EF.Cup.s.challenges[CH.id] && false; game.allowJoin(false); EF.Save.save(); game.go('tunnel', { match: o }); }
    if (c.kind === 'fn') { c.fn(); this.next(); }
  },
  runTalk(c) {
    const lines = c.lines.slice(), say = () => {
      const [who, text] = lines.shift(), last = !lines.length;
      this.talk.voice = EF.babble.voiceFor(who);
      this.talk.say(text, { name: EF.speakerName(who), portrait: EF.portraitOf(who), portraitOpts: { zoom: 3, turn: .35 }, choices: last && c.choices ? c.choices : null,
        onChoice: i => { if (c.onChoice) c.onChoice(i); }, onDone: () => { if (lines.length) say(); else this.next(); } });
    };
    say();
  },
  roundBeats(k) {
    const R = EF.ROUNDS[k], s = EF.Cup.s, q = [];
    if (k === 0 && !s.prologue) {
      q.push({ kind: 'tabloid', paper: EF.PROLOGUE.tabloid });
      q.push({ kind: 'talk', lines: EF.PROLOGUE.talk, choices: EF.PROLOGUE.choices, onChoice: i => { s.prologue = true; EF.Save.sticker('x-mags'); EF.Save.save(); if (i === 1) { this.q = []; game.go('training', { fromCup: true }); } } });
    }
    if (R.postcard) q.push({ kind: 'travel', to: R.city, round: k, postcard: R.postcard });
    q.push({ kind: 'tabloid', paper: R.pre });
    if (R.villain) q.push({ kind: 'talk', villain: true, lines: EF.VILLAIN.talk, choices: EF.VILLAIN.choices, onChoice: i => { if (i === 0) { s.flags.loyal = true; EF.Save.sticker('x-loyal'); this.q.unshift({ kind: 'talk', lines: EF.VILLAIN.loyal }); } else { s.flags.jetski = true; this.q.unshift({ kind: 'talk', lines: EF.VILLAIN.joke }); } EF.Save.save(); } });
    q.push({ kind: 'talk', lines: R.talk });
    q.push({ kind: 'teamtalk', round: k });
    q.push({ kind: 'challenge', id: R.challenge, round: k });
    q.push({ kind: 'go', round: k });
    return q;
  },
  afterMatch(sum, k) {
    const s = EF.Cup.s, R = EF.ROUNDS[k], kipWon = sum.winner === 0;
    s.results[k] = { opp: R.opp, score: sum.score, pens: sum.pens, won: kipWon };
    if (s.challenges[R.challenge]) EF.Save.sticker('g-' + R.challenge, true);
    if (Object.keys(s.challenges).length >= 5) EF.Save.unlockBall('leather');
    this.q = [{ kind: 'result', sum, round: k }, { kind: 'tabloid', paper: Object.assign({ photo: kipWon ? 'pilchard' : R.pre.photo }, kipWon ? R.win : R.loss) }];
    if (kipWon) {
      if (R.after && R.after.length) this.q.push({ kind: 'talk', lines: R.after });
      if (k === 4) { this.q.push({ kind: 'fn', fn: () => { s.done = true; s.round = 5; EF.Save.data.records.cupsWon++; const tm = game.real - (s.started || 0); if (!EF.Save.data.records.fastestCup || tm < EF.Save.data.records.fastestCup) EF.Save.data.records.fastestCup = tm; EF.Save.unlockBall('gold'); EF.Save.save(); game.go('ending', {}); } }); }
      else this.q.push({ kind: 'fn', fn: () => { s.round = k + 1; EF.Save.save(); } }, { kind: 'bracket' });
    } else this.q.push({ kind: 'knocked', round: k });
    this.next();
  },
  items(r) {
    const c = this.cur, W = Math.min(r.W - 40, 400), x = Math.round(r.W / 2 - W / 2), s = EF.Cup.s;
    if (c.kind === 'bracket') {
      const L = [];
      const rr = s ? s.round : 0, rects = EF.layoutColumn(r, 5, { w: W, h: 26, gap: 4, y: Math.round(r.H * .2) });
      EF.ROUNDS.forEach((R, i) => { const res = s && s.results[i], cur = s && i === rr && !s.done; L.push({ rect: rects[i], disabled: !cur, label: R.name, R, i, res, draw: (g, X, Y, w, h, f) => {
        EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : cur ? '#5ae0ff' : '#2a3a6a', alpha: cur || res ? .95 : .6 });
        EF.drawCrest(g, EF.get('team', R.opp), X + 14, Y + h / 2, 18);
        E.font.text(g, R.name, X + 28, Y + 4, cur ? '#ffffff' : '#9aa6c8', { outline: false }); E.font.text(g, 'vs ' + EF.get('team', R.opp).name + ' at ' + EF.get('stadium', R.stadium).name, X + 28, Y + 15, '#ffe08a', { font: 'tiny', outline: false });
        if (res) E.font.text(g, res.score[0] + '-' + res.score[1] + (res.pens ? ' (P ' + res.pens[0] + '-' + res.pens[1] + ')' : '') + (res.won ? '  WON' : '  LOST'), X + w - 8, Y + 9, res.won ? '#5aff7a' : '#ff5a5a', { align: 'right', outline: false });
        else if (cur) { E.font.text(g, 'PLAY', X + w - 8, Y + 9, '#ffc83a', { align: 'right', outline: false }); EF.drawMinibus(g, X + w - 60, Y + h - 4, .7, this.t); }
      }, onPick: () => { this.q = this.roundBeats(i); this.next(); } }); });
      L.push({ label: s ? 'NEW CUP RUN' : 'START THE CUP RUN', rect: [x + W / 2 - 90, rects[4][1] + 34, 180, 24], onPick: () => { EF.Cup.newRun(); this.q = this.roundBeats(0); this.next(); } });
      if (s && !s.done) this.menu.i = Math.min(this.menu.i, L.length - 1);
      if (!s) { L.forEach(it => { if (it.R) it.disabled = true; }); }
      return L;
    }
    if (c.kind === 'teamtalk') {
      const T = EF.all('teamtalk'), w = Math.min(130, Math.floor((W - 16) / 3)), rects = EF.layoutGrid(r, 3, 3, { w, h: 96, y: Math.round(r.H * .22) });
      if (c.pickForm) { const F = ['2-2', '1-2-1', '2-1-1'], fr = EF.layoutGrid(r, 3, 3, { w, h: 60, y: Math.round(r.H * .3) }); return F.map((f, i) => ({ rect: fr[i], label: f, sub: ['ALL OUT ATTACK', 'THE DIAMOND', 'THE CLASSIC'][i], onPick: () => { EF.Cup.s.formation = f; EF.Save.save(); this.next(); } })); }
      return T.map((tt, i) => ({ rect: rects[i], label: tt.name, tt, draw: (g, X, Y, w2, h, f) => { EF.panel(g, X, Y, w2, h, { border: f ? '#ffc83a' : '#2a3a6a' }); E.font.text(g, tt.name, X + w2 / 2, Y + 8, '#ffffff', { align: 'center', outline: false, wrap: w2 - 10 }); EF.textBlock(g, tt.desc, X + 6, Y + 40, w2 - 12, { color: '#ffe08a', font: 'tiny' }); }, onPick: () => {
        EF.Cup.s.talks[c.round] = tt.id; EF.Save.save(); const line = EF.fxPick(tt.lines);
        this.talk.voice = EF.babble.voiceFor('mags');
        this.talk.say(line, { name: 'MAGS MULLIGAN', portrait: EF.portraitOf('mags'), onDone: () => { if (tt.id === 'tactics') { c.pickForm = true; this.menu.i = 0; } else { EF.Cup.s.formation = null; this.next(); } } });
      } }));
    }
    if (c.kind === 'challenge' || c.kind === 'tabloid' || c.kind === 'travel' || c.kind === 'result') return [{ label: 'CONTINUE', rect: [x + W / 2 - 80, r.H - Math.round(r.H * .04) - 44, 160, 22], onPick: () => this.next() }];
    if (c.kind === 'knocked') return [{ label: 'CONTINUE? (' + Math.max(0, Math.ceil(10 - c.t)) + ')', rect: [x + W / 2 - 100, Math.round(r.H * .66), 200, 26], onPick: () => { this.q = [{ kind: 'teamtalk', round: c.round }, { kind: 'challenge', id: EF.ROUNDS[c.round].challenge, round: c.round }, { kind: 'go', round: c.round }]; this.next(); } },
      { label: 'GIVE UP', rect: [x + W / 2 - 100, Math.round(r.H * .66) + 32, 200, 22], onPick: () => { EF.Cup.s.round = c.round; EF.Save.save(); game.go('title', { menu: true }); } }];
    return [];
  },
  update(dt) {
    this.t += dt; const c = this.cur; c.t += dt;
    if (this.talk.open) { this.talk.update(dt); return; }
    if (c.kind === 'knocked' && c.t > 10) { EF.Cup.s.round = c.round; EF.Save.save(); game.go('title', { menu: true }); return; }
    this.menu.set(this.items(game.r || { W: game.W, H: game.H }));
    if (c.kind === 'bracket' && this.menu.cur && this.menu.cur.disabled && this.menu.items.length) { const k = this.menu.items.findIndex(it => !it.disabled); if (k >= 0) this.menu.i = k; }
    if (c.t > .35) this.menu.update(dt);
    if (c.kind === 'bracket' || c.kind === 'teamtalk' || c.kind === 'challenge' || c.kind === 'tabloid') EF.idle.tick(dt);
  },
  draw(r) {
    const c = this.cur;
    if (c.kind === 'tabloid') this.drawTabloid(r, c.paper, c.t);
    else if (c.kind === 'travel') this.drawTravel(r, c);
    else {
      r.sky(c.villain ? ['#0a0410', '#1a0a20', '#2a1030'] : ['#0a0e24', '#141c3a', '#1a2450']);
      r.overlay(g => {
        for (let y = 0; y < r.H; y += 6) px.rect(g, 0, y, r.W, 1, '#ffffff08');
        if (c.kind === 'bracket') { EF.heading(g, 'THE EUROPHORIA CUP', r.W / 2, Math.round(r.H * .04), 3); E.font.text(g, 'THE KIPPERS\' ROAD TO GLORY', r.W / 2, Math.round(r.H * .04) + 28, '#ffe08a', { align: 'center', outline: '#000' }); }
        if (c.kind === 'talk') { EF.drawCrest(g, EF.get('team', 'kipperton'), r.W / 2, r.H * .32, 60); E.font.text(g, c.villain ? 'THE GRAND HOTEL AURELIA. MIDNIGHT.' : 'THE DRESSING ROOM', r.W / 2, r.H * .08, '#ffe08a', { align: 'center', outline: '#000' }); if (c.villain) { const rig = EF.portraitOf('baron'); rig.drawPortrait(g, Math.round(r.W / 2 - 40), Math.round(r.H * .14), 80); } }
        if (c.kind === 'teamtalk') { EF.heading(g, c.pickForm ? 'TACTICS BOARD' : 'TEAM TALK', r.W / 2, Math.round(r.H * .04), 3); E.font.text(g, c.pickForm ? 'PICK A FORMATION' : 'HOW DOES MAGS FIRE THEM UP?  (FRIENDS: PRESS 2 OR START TO JOIN FOR CO-OP: ' + game.players.length + ' PLAYING)', r.W / 2, Math.round(r.H * .04) + 28, '#ffe08a', { align: 'center', outline: '#000', wrap: r.W - 40 }); }
        if (c.kind === 'challenge') { const ch = EF.get('challenge', c.id), w = Math.min(r.W - 60, 320), x = r.W / 2 - w / 2, y = r.H * .25; EF.panel(g, x, y, w, 110, { border: '#ff9ae0' }); E.font.text(g, "THE GAFFER'S CHALLENGE", r.W / 2, y + 10, '#ff9ae0', { align: 'center', outline: false }); EF.heading(g, ch.title, r.W / 2, y + 34, 2, { colors: ['#ffffff', '#ffe08a'] }); E.font.text(g, 'OPTIONAL: COMPLETE IT FOR A SHINY STICKER', r.W / 2, y + 70, '#c8d0f0', { align: 'center', outline: false }); E.font.text(g, EF.ROUNDS[c.round].name + ': vs ' + EF.get('team', EF.ROUNDS[c.round].opp).name, r.W / 2, y + 86, '#9aa6c8', { align: 'center', outline: false }); }
        if (c.kind === 'result') { const s = c.sum, w = c.sum.winner === 0; EF.heading(g, w ? 'THROUGH!' : 'OUT...', r.W / 2, r.H * .12, 4, { colors: w ? ['#ffffff', '#5aff7a', '#20a040'] : ['#ffffff', '#ff5a5a', '#a02020'] }); E.font.text(g, 'KIPPERTON ' + s.score[0] + ' - ' + s.score[1] + ' ' + EF.get('team', s.away).name + (s.pens ? '  (PENS ' + s.pens[0] + '-' + s.pens[1] + ')' : ''), r.W / 2, r.H * .36, '#ffffff', { align: 'center', scale: 1, outline: '#000' }); const ch = EF.get('challenge', EF.ROUNDS[c.round].challenge); E.font.text(g, "GAFFER'S CHALLENGE: " + ch.title + (EF.Cup.s.challenges[ch.id] ? '  DONE!' : '  NOT THIS TIME'), r.W / 2, r.H * .46, EF.Cup.s.challenges[ch.id] ? '#ff9ae0' : '#9aa6c8', { align: 'center', outline: false }); }
        if (c.kind === 'knocked') { EF.heading(g, 'KNOCKED OUT!', r.W / 2, r.H * .2, 4, { colors: ['#ffffff', '#ff5a5a', '#a02020'] }); E.font.text(g, 'THE DREAM IS NOT OVER YET. TRY THE ROUND AGAIN?', r.W / 2, r.H * .46, '#ffe08a', { align: 'center', outline: '#000' }); }
        this.menu.draw(g);
        if (!this.talk.open) EF.footer(g, r, c.kind === 'bracket' ? [['confirm', 'SELECT'], ['cancel', 'TITLE']] : [['confirm', 'CONTINUE']]);
      });
    }
    this.talk.draw(r);
  },
  /** THE DAILY ROAR: a back page dropping in with a spin */
  drawTabloid(r, p, t) {
    r.sky(['#2a2420', '#3a3228', '#4a4034']);
    r.overlay(g => {
      const u = Math.min(1, t / .5), w = Math.min(r.W - 30, 380) * (.3 + .7 * E.ease.outBack(u)), h = Math.min(r.H - 40, 200) * (.3 + .7 * E.ease.outBack(u)), x = r.W / 2 - w / 2, y = r.H * .44 - h / 2;
      px.rect(g, Math.round(x + 4), Math.round(y + 4), Math.round(w), Math.round(h), '#00000080');
      px.rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), '#ece6d6');
      for (let k = 0; k < h; k += 3) if (E.hash2(k, 3) > .7) px.rect(g, Math.round(x), Math.round(y + k), Math.round(w), 1, '#e0d8c6');
      if (u < 1) return;
      px.rect(g, Math.round(x), Math.round(y), Math.round(w), 22, '#c8202a');
      E.font.title(g, 'THE DAILY ROAR', Math.round(x + 8), Math.round(y + 3), { scale: 2, colors: ['#ffffff', '#ffe0e0'], depth: 0, outline: '#600' });
      E.font.text(g, 'EUROPHORIA CUP SPECIAL   ' + 'PRICE: ONE KIPPER', Math.round(x + w - 6), Math.round(y + 8), '#ffe0e0', { align: 'right', font: 'tiny', outline: false });
      const lines = E.font.wrap(p.headline, w - 20, { scale: 3 }).length > 2 ? 2 : 3;
      E.font.text(g, p.headline, Math.round(x + w / 2), Math.round(y + 28), '#141414', { align: 'center', scale: lines, wrap: w - 16, outline: false });
      const ph = { x: x + 10, y: y + h - 86, w: 80, h: 76 };
      px.rect(g, Math.round(ph.x - 1), Math.round(ph.y - 1), ph.w + 2, ph.h + 2, '#141414'); px.rect(g, Math.round(ph.x), Math.round(ph.y), ph.w, ph.h, '#8a8478');
      if (p.photo) EF.portraitOf(p.photo).drawPortrait(g, Math.round(ph.x + 6), Math.round(ph.y + 4), 68, { tint: '#8a8a8a' });
      EF.textBlock(g, p.sub, x + 100, y + h - 82, w - 112, { color: '#2a2a2a', shadow: false });
      E.font.text(g, 'FULL STORY: PAGES 2, 3, 4, 5 AND 94', Math.round(x + 100), Math.round(y + h - 18), '#6a6a6a', { font: 'tiny', outline: false });
      EF.footer(g, r, [['confirm', 'CONTINUE']]);
    });
    this.menu.draw && r.overlay(g => this.menu.draw(g));
  },
  /** the travel map: a fictional Europe, the minibus "The Old Trout" on a dotted road */
  drawTravel(r, c) {
    r.sky(['#2a5a8a', '#3a6a9a', '#4a7aaa']);
    r.overlay(g => {
      const W = r.W, H = r.H, X = u => Math.round(W * u), Y = v => Math.round(H * v);
      const land = [[.05, .2], [.2, .1], [.35, .16], [.5, .08], [.7, .12], [.92, .18], [.95, .5], [.85, .7], [.7, .9], [.55, .82], [.42, .95], [.3, .8], [.15, .85], [.08, .6]];
      const snow = c.round === 2;
      px.poly(g, land.map(([u, v]) => [X(u), Y(v)]), snow ? '#e8ecf4' : '#5a8a4a'); px.poly(g, land.map(([u, v]) => [X(u * .96 + .02), Y(v * .96 + .02)]), snow ? '#d8dce8' : '#6a9a54');
      const C = { kipperton: [.18, .22], solera: [.3, .78], eisenhutte: [.66, .3], castelfortezza: [.56, .7], aurelia: [.8, .55] };
      for (const [k, [u, v]] of Object.entries(C)) { px.disc(g, X(u), Y(v), 3, '#141414'); px.disc(g, X(u), Y(v), 2, k === c.to ? '#ffc83a' : '#ffffff'); E.font.text(g, k.toUpperCase(), X(u), Y(v) + 5, '#141414', { align: 'center', font: 'tiny', outline: false }); }
      const order = ['kipperton', 'solera', 'eisenhutte', 'castelfortezza', 'aurelia'], i = order.indexOf(c.to), from = C[order[Math.max(0, i - 1)]], to = C[c.to];
      const u = Math.min(1, c.t / 3);
      for (let k = 0; k <= 20; k++) if (k % 2 === 0) px.dot(g, X(lerp(from[0], to[0], k / 20)), Y(lerp(from[1], to[1], k / 20) - Math.sin(k / 20 * PI) * .08), '#c8202a');
      EF.drawMinibus(g, X(lerp(from[0], to[0], u)), Y(lerp(from[1], to[1], u) - Math.sin(u * PI) * .08), 1, this.t);
      EF.panel(g, X(.58), Y(.04), X(.4), 34, { bg: ['#f4ecd8', '#e8dcc0'], border: '#c8202a' });
      E.font.text(g, 'POSTCARD', X(.6), Y(.04) + 4, '#c8202a', { font: 'tiny', outline: false }); E.font.text(g, c.postcard, X(.6), Y(.04) + 14, '#2a2a2a', { outline: false, wrap: X(.38) });
      E.font.text(g, 'THE OLD TROUT HEADS FOR ' + c.to.toUpperCase(), W / 2, H - 46, '#ffffff', { align: 'center', outline: '#000' });
      EF.footer(g, r, [['confirm', 'CONTINUE']]);
    });
    r.overlay(g => this.menu.draw(g));
  }
};
EF.scenes.cup = cupScene;

/* ---- the tunnel: the walkout, the handshakes, the coin toss (and, in a hub session, the card) ---- */
const tunnelScene = {
  touch: [], view: 'broadcast',
  enter(d) {
    this.d = d || {}; this.t = 0; const o = this.d.match || { home: 'kipperton', away: 'hoofington', stadium: 'smokehouse' };
    this.stage = new Stage(o.stadium || EF.get('team', o.home).stadium, { home: o.home, away: o.away });
    const m = this.stage.m; this.m = m;
    m.players.forEach((f, i) => { f.state = 'run'; f.body.x = P.CX + (f.side ? 10 : -10); f.body.y = P.Y1 + 30 + f.idx * 12; f.facing = -PI / 2; f.walk = i * .25; });
    m.official = null; this.len = this.d.short ? 3.5 : this.d.card ? 1e9 : 8;
    game.setView('broadcast'); game.setZoom(1.4); game.zoomBase = 1.4;
    EF.music('anthem'); EF.crowdAudio.start(.6);
    this.coin = 0;
  },
  exit() { EF.crowdAudio.stop(); },
  update(dt) {
    this.t += dt; const m = this.m;
    m.players.forEach(f => {
      const k = Math.max(0, this.t - f.walk), tx = P.CX + (f.side ? 1 : -1) * (14 + f.idx * 16), ty = P.CY + 40;
      const along = Math.min(1, k / 3.2), sx = P.CX + (f.side ? 10 : -10), sy = P.Y1 + 30 + f.idx * 4;
      const x = lerp(sx, tx, along), y = lerp(sy, ty, along);
      f.body.vx = (x - f.body.x) / dt; f.body.vy = (y - f.body.y) / dt; f.body.x = x; f.body.y = y;
      f.facing = along < 1 ? Math.atan2(f.body.vy, f.body.vx) : PI / 2;
      if (along >= 1) { f.body.vx = f.body.vy = 0; }
    });
    this.stage.update(dt);
    game.focus(P.CX, lerp(P.Y1 + 20, P.CY + 30, Math.min(1, this.t / 4)), 10);
    if (this.t > 5) this.coin = Math.min(1, (this.t - 5) / 1);
    if (this.d.card && EF.Hub) { EF.Hub.cardUpdate(dt, this); return; }
    const skip = this.t > .5 && (game.players.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked());
    if (this.t > this.len || skip) { game.players.forEach(I => I.consumeAll()); game.go('match', this.d.match); }
  },
  draw(r) {
    this.stage.draw(r);
    const m = this.m;
    r.overlay(g => {
      if (this.d.card && EF.Hub) { EF.Hub.cardDraw(g, r, this); return; }
      const t0 = m.teams[0], t1 = m.teams[1];
      const w = Math.min(r.W - 40, 360), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .05);
      EF.panel(g, x, y, w, 46, { alpha: .85 });
      EF.drawCrest(g, t0, x + 22, y + 23, 30); EF.drawCrest(g, t1, x + w - 22, y + 23, 30);
      E.font.text(g, t0.name, x + 44, y + 8, '#ffffff', { outline: false }); E.font.text(g, t1.name, x + w - 44, y + 8, '#ffffff', { align: 'right', outline: false });
      E.font.text(g, 'vs', r.W / 2, y + 8, '#ffc83a', { align: 'center', scale: 2, outline: false });
      E.font.text(g, m.st.name + ', ' + m.st.city + '.  REFEREE: ' + (m.ref ? m.ref.name : ''), r.W / 2, y + 30, '#ffe08a', { align: 'center', font: 'tiny', outline: false });
      if (this.coin > 0) { const k = Math.abs(Math.cos(this.coin * PI * 6)); const cx = Math.round(r.W / 2), cy = Math.round(r.H * .5 - Math.sin(this.coin * PI) * 30); px.ell(g, cx, cy, 7, Math.max(1, Math.round(7 * k)), '#e8c040'); }
      EF.footer(g, r, [['confirm', 'SKIP']]);
    });
  }
};
EF.scenes.tunnel = tunnelScene;

/* ---- the ending: the trophy, the parade, the back page, the credits ---- */
const endingScene = {
  touch: [], view: 'broadcast',
  enter() {
    this.t = 0; this.phase = 0; this.stage = new Stage('euphorium', { weather: false }); this.m = this.stage.m;
    this.m.side[0].forEach((f, i) => { f.state = 'run'; f.body.x = P.CX - 32 + i * 16; f.body.y = P.Y0 + 70; f.facing = PI / 2; f.celebrate = i === 4 ? null : 'pile'; });
    game.setView('broadcast'); game.setZoom(1.6); game.zoomBase = 1.6;
    EF.music('ceremony'); EF.crowdAudio.start(1); EF.crowdAudio.react('roar', 1.4);
    this.confetti = 0; this.credits = 0;
  },
  exit() { EF.crowdAudio.stop(); },
  update(dt) {
    this.t += dt; const m = this.m;
    const skip = game.players.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked();
    if (this.phase === 0) {
      this.stage.update(dt); game.focus(P.CX, P.Y0 + 40, 20);
      if ((this.confetti -= dt) <= 0) { this.confetti = .15; PFX.bits(P.CX + EF.fx(-80, 80), P.Y0 + 70 + EF.fx(-40, 40), 80, 6, ['#f08a24', '#1c2a5a', '#ffffff', '#ffc83a']); }
      if (this.t % 2 < dt) this.stage.view.firework(2);
      if (this.t > 7 || (skip && this.t > 1)) { this.phase = 1; this.t = 0; EF.music('anthem'); }
    } else if (this.phase === 1) { if (this.t > 9 || (skip && this.t > 1)) { this.phase = 2; this.t = 0; EF.music('tabloid'); } }
    else if (this.phase === 2) { if (this.t > 6 || (skip && this.t > 1)) { this.phase = 3; this.t = 0; EF.music('credits'); } }
    else { this.credits += dt * 22; if (this.credits > this.creditH + 260 || (skip && this.t > 1)) game.go('title', { menu: true }); }
  },
  draw(r) {
    const t = this.t;
    if (this.phase === 0) {
      this.stage.draw(r);
      const daz = this.m.side[0][4], b = daz.body;
      r.queue(P.CX, P.Y0 + 64, 0, g => { const [x, y] = r.w(P.CX, P.Y0 + 64, 0); px.rect(g, Math.round(x) - 50, Math.round(y) - 8, 100, 10, '#e8e4d8'); px.rect(g, Math.round(x) - 50, Math.round(y) + 2, 100, 4, '#a8a498'); });
      const lift = Math.min(1, Math.max(0, (t - 1.5) / 1.5));
      r.queue(b.x, b.y, 34 + lift * 10, g => { const [x, y] = r.w(b.x, b.y, 34 + lift * 10); EF.drawTrophy(g, x, y, 1, .3 + Math.sin(t * 6) * .2); }, { emissive: true, bias: 5 });
      daz.celebrate = lift > .2 ? { anim: 'cheer' } : null;
      r.overlay(g => { EF.heading(g, 'CHAMPIONS OF EUROPE!', r.W / 2, Math.round(r.H * .06), 3); E.font.text(g, 'KIPPERTON ATHLETIC LIFT THE EUROPHORIA CUP', r.W / 2, Math.round(r.H * .06) + 30, '#ffe08a', { align: 'center', outline: '#000' }); EF.footer(g, r, [['confirm', 'NEXT']]); });
    } else if (this.phase === 1) {
      // the parade: Kipperton harbour by day, the team on the trawler on wheels, the town on both sides
      r.sky(['#6aaee8', '#a8d4f0', '#e8f0e0']);
      r.overlay(g => {
        const W = r.W, H = r.H, road = Math.round(H * .72);
        px.rect(g, 0, Math.round(H * .45), W, Math.round(H * .12), '#3a6a9a'); for (let x = 0; x < W; x += 6) px.rect(g, x + Math.round(t * 8) % 6, Math.round(H * .48 + Math.sin(x * .1 + t) * 2), 3, 1, '#8ab8e0');
        EF.drawSkyline(g, r, EF.get('stadium', 'smokehouse'), t, Math.round(H * .45), W);
        px.rect(g, 0, Math.round(H * .57), W, road - Math.round(H * .57), '#8a8478'); px.rect(g, 0, road, W, H - road, '#4a4a50');
        for (let i = 0; i < 40; i++) { const x = (i * 23 + 5) % W, f = { shirt: i % 2 ? '#f08a24' : '#1c2a5a', shirtSh: '#2a2a2a', skin: ['#e0b090', '#a87050', '#f0c8a8'][i % 3], hair: '#3a2418', scarf: '#f08a24', scarf2: '#1c2a5a', ph: i, kind: i % 3 }; EF.drawFan(g, x, Math.round(H * .64), f, i % 2 ? 2 : 3, t); EF.drawFan(g, (x + 11) % W, H - 6, f, i % 3 ? 1 : 2, t); }
        const tx = ((t * 40) % (W + 300)) - 150;
        EF.drawTrawler(g, tx, road + 10, 1, t);
        for (let i = 0; i < 5; i++) { const f = { shirt: '#f08a24', shirtSh: '#1c2a5a', skin: '#e0b090', hair: '#3a2418', scarf: '#ffffff', scarf2: '#1c2a5a', ph: i, kind: 0 }; EF.drawFan(g, tx - 40 + i * 14, road - 20, f, 2, t); }
        for (let i = 0; i < 4; i++) { const gx = (t * 30 + i * 90) % W, gy = H * .2 + Math.sin(t * 2 + i) * 10; px.line(g, gx - 4, gy, gx, gy - 2, '#ffffff'); px.line(g, gx, gy - 2, gx + 4, gy, '#ffffff'); }
        if (EF.fxRng() < .5) for (let k = 0; k < 2; k++) px.rect(g, Math.round(EF.fx(0, W)), Math.round(EF.fx(0, H * .7)), 2, 2, EF.fxPick(['#f08a24', '#1c2a5a', '#ffffff']));
        EF.heading(g, 'THE PARADE', W / 2, Math.round(H * .04), 3); E.font.text(g, 'ALL 3,112 OF KIPPERTON TURN OUT. AND THEIR CATS.', W / 2, Math.round(H * .04) + 28, '#1c2a5a', { align: 'center', outline: '#fff' });
        EF.footer(g, r, [['confirm', 'NEXT']]);
      });
    } else if (this.phase === 2) cupScene.drawTabloid.call({ menu: {} }, r, EF.ENDING.tabloid, t);
    else {
      r.sky(['#04040c', '#0a0a1a', '#141428']);
      r.overlay(g => {
        const lines = ['EUROPHORIA FOOTBALL', '', 'STARRING', 'KIPPERTON ATHLETIC', 'WALLY CRABB  SANDRA OKAFOR  AGGIE NOWAK', 'TOMMY TRAN  DAZ PILCHARD', 'MANAGER: MAGS MULLIGAN', '', 'COMMENTARY', 'BARRY BELLOW AND TREV BRICKLEY', '', 'THE OPPOSITION', ...EF.all('team').filter(t => t.id !== 'kipperton').map(t => t.name), '', 'THE REFEREES', ...EF.all('referee').map(x => x.name), '', ...EF.CREDITS.flatMap(([k, v]) => [k, ...E.font.wrap(v, r.W - 60)]), '', 'KINGSBRIDGE ALBION HAVE DEMANDED A RECOUNT.', '', 'THANKS FOR PLAYING!'];
        this.creditH = lines.length * 14;
        lines.forEach((l, i) => { const y = Math.round(r.H + 10 + i * 14 - this.credits); if (y > -10 && y < r.H) E.font.text(g, l, r.W / 2, y, i === 0 ? '#ffc83a' : /^[A-Z ]+$/.test(l) && l.length < 20 ? '#ffe08a' : '#e8ecff', { align: 'center', scale: i === 0 ? 2 : 1, outline: false }); });
        EF.footer(g, r, [['confirm', 'SKIP']]);
      });
    }
  }
};
EF.scenes.ending = endingScene;
