/* ---- RECORDS (12.10), ABOUT (12.1) and CREDITS (12.12) ---- */
scenes.records = {
  enter() { this.page = 0; Synth.music('menu'); UI.Idle.reset(); },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    if (UI.anyRep('left') || UI.anyRep('right') || padTab()) { this.page = 1 - this.page; Synth.sfx('menuMove'); }
    const ck = game.input.clicked(); if (ck) { if (ck[0] < 40) this.page = 0; else if (ck[0] > game.W - 40) this.page = 1; }
    if (UI.anyP('cancel') || UI.anyP('confirm')) { Synth.sfx('menuBack'); game.go('title', { menu: true, tile: 3 }); }
  },
  draw(r) {
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    const R2 = Records.get();
    const big = this.page === 0 ? [['HARDEST SHOT', R2.shot ? U.kmh(R2.shot) : 0, 'KM/H'], ['BIGGEST HIT', R2.hit || 0, 'POWER'], ['MOST GOALS IN A GAME', R2.goals || 0, 'GOALS'], ['FIGHTS WON', R2.fights || 0, 'SCRAPS']]
      : [['KABOOMS', R2.kabooms || 0, 'TIMES'], ['CUP RUN STARS', Save.totalStars(), 'OF 15'], ['DRILLS PASSED', Object.keys(Save.data.drills).length, 'OF 7'], ['GAMES WON', R2.wins || 0, 'OF ' + (R2.games || 0)]];
    r.overlay(g => {
      UI.title(g, 'RECORDS', r.W / 2, 8, 3);
      const cw = Math.min(190, (r.W - 30) / 2);
      big.forEach(([lab, v, unit], i) => { const x = r.W / 2 - cw + (i % 2) * cw + 4, y = 46 + Math.floor(i / 2) * 76; UI.panel(g, x, y, cw - 8, 66, {}); E.font.text(g, lab, x + (cw - 8) / 2, y + 6, UI.MUTED, { align: 'center', outline: false }); E.font.text(g, String(v), x + (cw - 8) / 2, y + 22, '#ffffff', { align: 'center', scale: 4, outline: '#000' }); E.font.text(g, unit, x + (cw - 8) / 2, y + 54, UI.GOLD, { align: 'center', font: 'tiny', outline: false }); });
      if (this.page === 1) { const badges = [Save.data.badge ? 'MARGE APPROVED' : null, Save.data.finished ? 'KABOOM CUP CHAMPIONS' : null].filter(Boolean); E.font.text(g, badges.length ? 'BADGES: ' + badges.join('  ·  ') : 'BADGES: none yet. Pass every drill; win the Cup.', r.W / 2, 202, UI.GOLD, { align: 'center', outline: false }); }
      E.font.text(g, '<', 12, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' }); E.font.text(g, '>', r.W - 20, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' });
      E.font.text(g, 'PAGE ' + (this.page + 1) + ' / 2', r.W / 2, r.H - 26, UI.MUTED, { align: 'center', outline: false });
      UI.legend(g, r, [['left', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
/** L1 / R1 page through screens */
const padTab = () => game.players.some(I => I.pressed('chirp') || I.pressed('turbo'));

/* ---- the About pages: Credits, Source Information, Testing / Engine / Prompt Feedback, Engine changes (the same text as
 * the build's chat reply and exit-interview.json) ---- */
const ABOUT = [
  ['CREDITS', [
    'Ice Hoc-Kaboom — game design, code, art, animation, writing and music: Claude Opus 5.5 (claude-opus-5-5), for Michael Crosato\'s cc-matrix.',
    'Engine: my-3D2dge v0.85.2 (MIT), the handoff package, patched (see Engine changes).',
    'Online: AI Hub Session Protocol v1, session client 1.4.0 (shared-world).',
    'Every sound, voice and song is synthesized in code: no audio files. Voices are Animalese-style babble through formant filters.',
    'Props from the engine\'s core shape library (pine, bench). Everything else (rinks, gear, logos, the Flood Wagon, the Cup) is drawn in code.',
    'Built from PLAN.md. Ice hockey is a sport; every team, town and person here is invented.'
  ]],
  ['SOURCE INFORMATION', ['FEEDBACK:source']],
  ['TESTING FEEDBACK', ['FEEDBACK:testing']],
  ['ENGINE FEEDBACK', ['FEEDBACK:engine']],
  ['PROMPT FEEDBACK', ['FEEDBACK:prompt']],
  ['ENGINE CHANGES', ['FEEDBACK:changes']]];
const FEEDBACK = { changes: INTERVIEW.engineChanges, source: INTERVIEW.sourceLines, testing: INTERVIEW.testingFeedback, engine: INTERVIEW.engineFeedback, prompt: INTERVIEW.promptFeedback };
scenes.about = {
  enter() { this.page = 0; this.scroll = 0; Synth.music('menu'); UI.Idle.reset(); },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    const n = ABOUT.length;
    if (UI.anyRep('right') || padTab()) { this.page = (this.page + 1) % n; this.scroll = 0; Synth.sfx('menuMove'); } if (UI.anyRep('left')) { this.page = (this.page + n - 1) % n; this.scroll = 0; Synth.sfx('menuMove'); }
    if (UI.anyRep('down')) this.scroll = Math.min(this.maxScroll || 0, this.scroll + 2); if (UI.anyRep('up')) this.scroll = Math.max(0, this.scroll - 2);
    const ck = game.input.clicked(); if (ck) { if (ck[0] < 40) this.page = (this.page + n - 1) % n; else if (ck[0] > game.W - 40) this.page = (this.page + 1) % n; }
    if (UI.anyP('cancel') || UI.anyP('confirm')) { Synth.sfx('menuBack'); game.go('title', { menu: true, tile: 5 }); }
  },
  draw(r) {
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    const [title, lines0] = ABOUT[this.page], lines = lines0[0] && lines0[0].startsWith('FEEDBACK:') ? FEEDBACK[lines0[0].slice(9)] : lines0;
    r.overlay(g => {
      E.font.text(g, 'ABOUT  ' + (this.page + 1) + ' / ' + ABOUT.length, r.W / 2, 6, UI.MUTED, { align: 'center', outline: false });
      UI.title(g, title, r.W / 2, 16, 2);
      UI.panel(g, 26, 38, r.W - 52, r.H - 62, {});
      const all = []; for (const l of lines) { for (const w of E.font.wrap(l, r.W - 70)) all.push(w); all.push(''); }
      const vis = Math.floor((r.H - 82) / 9); this.maxScroll = Math.max(0, all.length - vis); this.scroll = Math.min(this.scroll, this.maxScroll);
      all.slice(this.scroll, this.scroll + vis).forEach((w, i) => E.font.text(g, w, 34, 44 + i * 9, '#eef4ff', { outline: false }));
      if (this.maxScroll > 0) E.font.text(g, (this.scroll > 0 ? '↑  ' : '') + (this.scroll < this.maxScroll ? 'MORE ↓' : ''), r.W - 34, r.H - 35, UI.GOLD, { align: 'right', outline: false });
      E.font.text(g, '<', 10, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' }); E.font.text(g, '>', r.W - 18, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' });
      UI.legend(g, r, [['left', 'PAGE'], ['up', 'SCROLL'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- CREDITS: the end roll over the Cup Run's highlight replays (or the Icebox at night), then Coach Marge: "Same
 * time next year." and the title, with the Cup on display ---- */
scenes.credits = {
  view: 'threequarter', views: ['threequarter', 'brawler'], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.t = 0; this.ending = !!d.ending; this.h = Replay.hilites.slice(); this.hi = 0;
    this.m = Match.m && this.h.length ? Match.m : Title.background(); World.prepare(this.m); L.enabled = true; L.ambient = .5;
    Synth.music('credits', { restart: true });
    this.lines = ['ICE HOC-KABOOM', '', 'THE MUKLUK FALLS MUSKRATS', '#9 DUNNY MACPHAIL', '#19 SNIPES SANDHU', '#44 BIG LOU BEAUDOIN', '#31 LEMMY KOWALCHUK', 'AND PIPESY AND CLANG', '', 'COACH MARGE PELLETIER', 'DORIS ON THE ORGAN', 'OLD GUS AND THE FLOOD WAGON', '', 'IN THE BOOTH', 'CHUCK WALLOP', 'MOOSE PLUNKETT', '',
      'GAME BY', 'CLAUDE OPUS 5.5', 'FOR MICHAEL CROSATO\'S CC-MATRIX', '', 'ENGINE', 'MY-3D2DGE V0.85.2', '', 'ONLINE', 'AI HUB SESSION PROTOCOL V1', '', 'ALL SOUND MADE IN CODE', '', 'NO PARKING METERS WERE HARMED', '', 'THANKS FOR PLAYING'];
    this.playNext();
  },
  playNext() { if (!this.h.length) return; const c = this.h[this.hi++ % this.h.length]; Replay.play(c.frames, c.label, .6); },
  update(dt) {
    this.t += dt; const m = this.m; Match.m = m;
    if (Replay.on) Replay.step(m, dt, false); else if (this.h.length) this.playNext(); else { Match.step(dt); }
    Cam.update(m, dt); Crowd.step(dt, m);
    const end = this.lines.length * 12 + 260;
    if (this.t * 22 > end || (this.t > 2 && UI.anyP('confirm'))) { if (!this.done) { this.done = true; Replay.stop(); if (this.ending) { Synth.say('Same time next year.', CAST.marge.voice); game.go('cutscene', { id: 'teaser', onDone: () => game.go('title', { menu: true }) }); this.ending = false; } else game.go('title', { menu: true }, { fade: 'wipe' }); } }
  },
  exit() { this.done = false; Replay.stop(); },
  draw(r) {
    World.draw(r, this.m);
    r.overlay(g => {
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a4a6a'));
      const y0 = r.H - this.t * 22;
      this.lines.forEach((l, i) => { const y = y0 + i * 12; if (y < -10 || y > r.H + 10) return; if (i === 0) E.font.title(g, l, r.W / 2, y, { align: 'center', scale: 2 }); else E.font.text(g, l, r.W / 2, y, /^(GAME BY|ENGINE|ONLINE|IN THE BOOTH)$/.test(l) ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' }); });
      if (Replay.on) E.font.text(g, 'HIGHLIGHT: ' + Replay.label, 8, 8, '#ff8a8a', { outline: '#000' });
      Glyphs.text(g, '{confirm} SKIP', r.W - 8, r.H - 14, { align: 'right', color: UI.MUTED });
    });
  }
};
