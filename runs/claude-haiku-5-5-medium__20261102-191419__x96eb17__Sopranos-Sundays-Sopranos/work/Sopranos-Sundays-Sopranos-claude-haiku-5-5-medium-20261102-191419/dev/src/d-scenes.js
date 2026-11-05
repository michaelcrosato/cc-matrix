/* ============================================================================
 * SOPRANOS SUNDAYS  (src/d-scenes.js)  the screens, the saves, the AI Hub round, and the start.
 * ========================================================================== */
const SESSION = !!(window.AIHub && AIHub.active);     // an AI Hub round: straight into play, no title or saves
const GAME = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, id: SS.id,
  view: 'threequarter', views: ['threequarter', 'topdown', 'iso'],
  input: SS_INPUT,
  menu: {
    items: [['Journal', () => GAME.go('journal')], ['Camera', () => GAME.nextView()]],
    settings: SS_SETTINGS,
    controls: { attack: 'Melee', gun: 'Pistol', block: 'Guard', dodge: 'Dodge', interact: 'Talk', use: 'Eat', camera: 'Camera', crouch: 'Sneak', sprint: 'Sprint', jump: 'Jump', map: false },
    quit: SESSION ? false : 'title',
    saves: SESSION ? false : { slots: 3, version: 1, write: () => ssSnapshot(), read: rec => ssRestore(rec.data) }
  }
});
ssDefineSounds(GAME);

// ---- saves: the story's state, the hero, the foes that are gone (in the story's vars)
function ssSnapshot() {
  return { data: { state: G.story.state(), hp: G.hp, hero: { x: G.hero.x, y: G.hero.y }, sneak: G.hero.sneak }, place: 'Sunday, chapter ' + G.V.chapter, level: 'Ch ' + G.V.chapter };
}
function ssRestore(data) {
  ssNewWorld({ bot: false, session: false });
  G.story.restore(data.state);
  G.V = G.story.vars;
  G.hp = data.hp || SS.maxHp; G.hero.x = data.hero.x; G.hero.y = data.hero.y;
  ssInitPickups();
  return true;
}

// ---- the title: the menu, the touch-only message, the attract mode after ten seconds with no input
const TITLE = {
  enter() {
    this.idle = 0; this.t = 0;
    this.touchOnly = false;
    this.menu = new E.Menu(GAME, [
      { label: 'NEW SUNDAY', disabled: false },
      { label: 'CONTINUE', disabled: !GAME.saves.latest() },
      { label: 'OPTIONS' },
      { label: 'ABOUT AND CREDITS' }
    ], {
      x: 'center', y: 138, box: false, color: '#f4eee0', pick: '#ffd36a', dim: '#6a6488',
      onPick: (i) => {
        if (i === 0) GAME.go('play', { fresh: true });
        if (i === 1) { const rec = GAME.saves.latest(); if (rec) { ssRestore(GAME.saves.get(rec.slot).data); GAME.go('play', { resume: true }); } }
        if (i === 2) GAME.menu('settings');
        if (i === 3) GAME.go('about');
      }
    });
    GAME.audio.music('title');
  },
  update(dt) {
    const inp = GAME.input;
    this.t += dt;
    this.touchOnly = !matchMedia('(any-pointer: fine)').matches && !matchMedia('(any-hover: hover)').matches && inp.padIndex === null;
    this.menu.items[0].disabled = this.touchOnly;
    this.menu.items[1].disabled = this.touchOnly || !GAME.saves.latest();
    if (this.touchOnly && GAME.settings.touch !== 'off') GAME.settings.set('touch', 'off');
    if (inp.anyPressed()) this.idle = 0; else this.idle += dt;
    if (this.idle > SS.idleToAttract) { GAME.go('demo', { bot: true }); return; }
    this.menu.update(dt);
  },
  draw(r) {
    r.sky(['#07060c', '#1e1428', '#3a1e2a']);
    for (let i = 0; i < 24; i++) {                       // the skyline, dark: a row of buildings with lit windows
      const x = i * 14 - 4, hgt = 26 + ((i * 37) % 30);
      r.overlay(gg => { E.px.rect(gg, x, r.H - 60 - hgt, 12, hgt, '#120d18'); for (let k = 0; k < 3; k++) if ((i + k) % 3) E.px.rect(gg, x + 3 + k * 3, r.H - 56 - hgt + k * 7, 2, 2, '#ffd36a'); });
    }
    r.overlay(gg => E.font.title(gg, SS.title, r.W / 2, 62, { scale: 2, colors: ['#ffe9a8', '#ffb347', '#c0392b'], depth: 3, align: 'center' }));
    r.text(SS.tagline, r.W / 2, 100, '#d8cfe8', { align: 'center', shadow: '#000', outline: false });
    this.menu.draw(r);
    if (this.touchOnly) r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 40, '#ffb0a0', { align: 'center', shadow: '#000', outline: false });
    else r.text(GAME.input.label('confirm') + ' TO CHOOSE', r.W / 2, r.H - 22, '#9d94b8', { align: 'center', shadow: '#000', outline: false });
  }
};

// ---- the play: the town, in chapters; pausable unless it is the attract demo
function ssPlayScene(pausable, bot) {
  return {
    pausable,
    enter(data = {}) {
      if (data.resume && G) return;
      G = null;
      G = ssNewWorld({ bot: bot, session: SESSION && !bot });
      ssInitPickups();
      GAME.cam.bounds = v => MAP.bounds(v);
      GAME.follow(G.hero, { z: 16 });
      GAME.audio.music(G.V.chapter === 2 ? 'fight' : 'street');
    },
    update(dt) {
      const inp = GAME.input;
      if (G && G.ended) return;                                // the hub has ended this round
      // any press of a person's exits the demo; the bot's own taps (a quarter second's grace) don't
      if (bot && inp.anyPressed() && GAME.time - (G.botTapAt ?? -9) > .25) { GAME.go('title'); return; }
      if (G.session && AIHub.time() < 0) return;            // the round's countdown
      const talking = G.story.update(dt);
      if (G.bot) ssBotStep(dt);
      if (!talking) ssPlayStep(dt, inp);
      if (G.won && G.after !== undefined) { G.after -= dt; if (G.after <= 0) { if (bot) { GAME.go('title'); return; } ssReport(); GAME.go('end'); } }
      if (G.won && !G.reported) ssReport();
    },
    draw(r) { ssDraw(r); }
  };
}

// ---- AI Hub: the round's result, once, when the player is done or the hub calls time
function ssReport() {
  if (!SESSION || !G || G.reported || G.bot) return;
  G.reported = true;
  AIHub.result({ score: SS.score(G.V), stats: { Cash: G.V.cash, Respect: G.V.respect, Kills: G.V.kills } });
}
if (SESSION) {
  AIHub.on('time-up', () => ssReport());
  AIHub.on('end', () => { if (G) G.ended = true; ssReport(); GAME.audio.music(null); });   // after the end: no input, no reports, no music
  AIHub.on('start', () => { if (G) G.roundT = 0; });
}

// ---- the journal: the quests and the numbers; the talk backlog
const JOURNAL = {
  update(dt) {
    const inp = GAME.input;
    if (inp.pressed('cancel') || inp.pressed('confirm') || inp.pressed('start')) GAME.go('play', { resume: true });
  },
  draw(r) {
    const V = G ? G.V : ssVars();
    r.sky(['#0a0812', '#1a1226', '#2a1a2a']);
    r.overlay(gg => E.font.title(gg, 'JOURNAL', r.W / 2, 14, { scale: 2, colors: ['#ffe9a8', '#ffb347'], align: 'center' }));
    let y = 46;
    const quests = G ? G.story.quests : [];
    if (!quests.length) r.text('No Sunday started yet.', 20, y, '#ffffff', { shadow: '#000', outline: false });
    for (const q of quests) {
      r.text((q.done ? '[done] ' : '▸ ') + q.title.toUpperCase(), 20, y, q.done ? '#8a8aa0' : '#ffe9b0', { shadow: '#000', outline: false });
      r.text(q.text, 28, y + 9, '#c8c0dc', { shadow: '#000', outline: false });
      y += 24;
    }
    r.text('CASH $' + V.cash + '     RESPECT ' + V.respect + '     KILLS ' + V.kills + '     CALM ' + V.calm, 20, r.H - 52, '#e8e4ff', { shadow: '#000', outline: false });
    r.text('SESSIONS ' + V.sessions + '     MEATBALLS ' + V.meatballs + '     PISTOL ' + V.ammo, 20, r.H - 40, '#e8e4ff', { shadow: '#000', outline: false });
    if (G && G.story.log.length) {
      const last = G.story.log.slice(-2).map(e => (e.name ? e.name + ': ' : '') + e.text).join('  /  ');
      r.text(last.slice(-120), 20, r.H - 24, '#9d94b8', { shadow: '#000', outline: false });
    }
    r.text(GAME.input.label('confirm') + ' TO GO BACK', r.W / 2, r.H - 10, '#9d94b8', { align: 'center', shadow: '#000', outline: false });
  }
};

// ---- the about and credits: a scrolling page (the source information and the feedback are in src/z-credits.js)
const ABOUT = {
  enter() { this.y = 0; this.lines = null; },
  update(dt) {
    const inp = GAME.input;
    if (!this.lines) this.lines = ssCreditLines(GAME.screen.W || 300);
    if (inp.pressed('cancel') || inp.pressed('confirm')) { GAME.go('title'); return; }
    const k = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
    this.y = Math.max(0, Math.min(this.lines.length * 9, this.y + k * dt * 90));
  },
  draw(r) {
    r.sky(['#07060c', '#1a1226', '#2a1a2a']);
    if (!this.lines) this.lines = ssCreditLines(r.W - 40);
    r.overlay(gg => E.font.title(gg, 'ABOUT', r.W / 2, 6, { scale: 2, colors: ['#ffe9a8', '#ffb347'], align: 'center' }));
    let y = 40 - this.y;
    for (const l of this.lines) {
      if (y > 26 && y < r.H - 16) r.text(l.text, 20 + (l.indent || 0), y, l.color || '#e8e4ff', { shadow: '#000', outline: false });
      y += 9;
    }
    r.text(GAME.input.label('confirm') + ' TO GO BACK', r.W / 2, r.H - 10, '#9d94b8', { align: 'center', shadow: '#000', outline: false });
  }
};
// the about page's lines, wrapped to the screen: each section a heading and its text
function ssCreditLines(width) {
  const out = [];
  const add = (text, color, indent) => { for (const l of E.font.wrap(String(text), Math.max(120, width - 40 - (indent || 0)))) out.push({ text: l, color, indent }); };
  for (const sec of SS_CREDITS) {
    out.push({ text: sec.title, color: '#ffd36a' });
    for (const [k, v] of sec.rows || []) add(k + ': ' + v, '#e8e4ff', 0);
    for (const t of sec.items || []) add('- ' + t, '#e8e4ff', 0);
    out.push({ text: '' });
  }
  return out;
}

// ---- the end of the Sunday: the numbers, and back to the title
const END = {
  enter() { this.t = 0; },
  update(dt) {
    this.t += dt;
    if (this.t > 1 && (GAME.input.pressed('confirm') || GAME.input.pressed('cancel'))) GAME.go('title');
  },
  draw(r) {
    const V = G ? G.V : ssVars();
    r.sky(['#000000', '#2a0f1a']);
    r.overlay(gg => E.font.title(gg, 'SUNDAY IS OVER', r.W / 2, 50, { scale: 2, colors: ['#ffe9a8', '#ffb347', '#c0392b'], align: 'center' }));
    r.text('Lenny, Gino and Pinky paid. Frankie is in the pool.', r.W / 2, 92, '#e8e4ff', { align: 'center', shadow: '#000', outline: false });
    r.text('CASH $' + V.cash + '    RESPECT ' + V.respect + '    KILLS ' + V.kills + '    SCORE ' + SS.score(V), r.W / 2, 116, '#ffe08a', { align: 'center', shadow: '#000', outline: false });
    r.text(SESSION ? 'Round result sent to the hub.' : 'Mama Ricca says the gravy will keep.', r.W / 2, 140, '#c8c0dc', { align: 'center', shadow: '#000', outline: false });
    if (this.t > 1) r.text(GAME.input.label('confirm') + ' TO THE TITLE', r.W / 2, r.H - 20, '#9d94b8', { align: 'center', shadow: '#000', outline: false });
  }
};

// ---- the story's events, given their own game: the chapter's rules are in src/b-world.js
// the page's start: an AI Hub round goes straight to play; otherwise the title
GAME.start({
  scene: SESSION ? 'play' : 'title',
  scenes: { title: TITLE, play: ssPlayScene(true, false), demo: ssPlayScene(false, true), journal: JOURNAL, about: ABOUT, end: END }
});
// PlayStation symbols until the player picks Xbox in Settings (the engine's _saved holds what was stored)
if (!Object.prototype.hasOwnProperty.call(GAME.settings._saved, 'glyphs')) GAME.settings.set('glyphs', 'playstation');
if (SESSION) {
  AIHub.connect({ mode: 'parallel', seats: [1, 4] }).then(info => { if (info) AIHub.ready(); else { /* no hub after all: the game runs on its own */ } });
}
