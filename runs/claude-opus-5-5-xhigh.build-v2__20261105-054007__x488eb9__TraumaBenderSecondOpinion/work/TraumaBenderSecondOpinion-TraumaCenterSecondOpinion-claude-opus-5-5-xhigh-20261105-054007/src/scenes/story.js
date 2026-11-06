// The story scene: painted stages, large busts, typed lines with gibberish voices. Content is data: defStory(id, steps) (CONTENT.md).
// A step: [who, line, expr?], or { stage, music, enter: [[id, side, expr, masked]], leave, expr: [id, expr], choose: [..], replies: [[who, line], ..],
// card: [big, small], cine: id, narr: line, sfx, shake, flash, wait, set }.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph;
const SRC = G.STORIES = {}, NODES = G.STORY_NODES = {};
G.EXPRS = ['neutral', 'smile', 'angry', 'sad', 'shock', 'shout', 'smirk', 'tired', 'cry'];
G.defStory = (id, steps) => { SRC[id] = steps; const out = []; let n = 0;
  for (const s of steps) {
    if (Array.isArray(s)) { const [who, say, expr] = s; out.push({ event: 'cue', cue: { speak: who, expr } }); out.push({ who, say }); }
    else if (s.choose) { const k = '_r' + (n++); out.push({ who: s.who || 'vale', say: s.prompt || '...', choices: s.choose.map((text, i) => ({ text, set: { [k]: i } })) }); s.replies.forEach((r, i) => { out.push({ if: k + ' == ' + i, event: 'cue', cue: { speak: r[0], expr: r[2] } }); out.push({ if: k + ' == ' + i, who: r[0], say: r[1] }); }); }
    else if (s.narr) { out.push({ event: 'cue', cue: { speak: null } }); out.push({ say: s.narr }); }
    else if (s.card || s.cine || s.wait) out.push({ event: 'cue', wait: true, cue: s });
    else out.push({ event: 'cue', cue: s });
  }
  NODES[id] = out; };

const Scene = G.StoryScene = {
  get() {
    if (G.story) return G.story; const game = G.game, people = {}; for (const k in G.CAST) people[k] = { name: G.CAST[k].name };
    const talk = new E.Dialog(game, { lines: 2, width: Math.min(404, game.W - 16), bg: '#06181c', border: '#4fd0c4', nameColor: '#ffd36a', speed: 52, voice: (ch, i, t) => { const sc = game.scene; if (sc && sc.speaker) G.Babble.letter(sc.speaker, ch, i, t._page ? t._page.join(' ') : ''); } });
    G.story = new E.Story(game, { people, nodes: NODES, dialog: talk, on: { cue(st, step) { const sc = G.game.scene; if (sc && sc.cue) sc.cue(step.cue, step.wait); else if (step.wait) st.resume(); } } });
    return G.story;
  },
};
G.scenes = G.scenes || {};
G.scenes.story = {
  pausable: true, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(data = {}) {
    const game = G.game; this.d = data; this.t = 0; this.stage = data.stage || 'corridor'; this.actors = {}; this.speaker = null; this.card = null; this.logOpen = false; this.logI = 0; this.cine = null; this.ended = false; this.flash = 0; this.shakeT = 0; this.blinkT = 2;
    const st = this.story = Scene.get(); st.talk.width = Math.min(404, game.W - 16); st.talk.speed = { slow: 30, normal: 52, fast: 96 }[game.settings.textSpeed] || 52; st._speed = st.talk.speed; st.auto = data.auto || 0; st.skip = false;
    if (game.saves) game.saves.canSave = false;
    game.setView && game.setView('overhead'); game.focus(game.W / 2, game.H / 2, 0);
    this.startNode(data.node);
  },
  exit() { const L = G.Sfx.loops.rain; if (L) L.stop(); this.rainOn = false; },
  startNode(id) { this.node = id; this.story.run(id, { onDone: () => { this.ended = true; } }); },
  cue(c, held) {
    if (c.stage) this.stage = c.stage;
    if (c.music) G.Music.play(c.music === 'none' ? null : c.music);
    if (c.enter) for (const a of c.enter) { const [id, side, expr, masked] = a; this.actors[id] = { id, side: side || 'right', expr: expr || 'neutral', masked: !!masked, x: side === 'left' ? -130 : side === 'mid' ? G.game.W / 2 - 56 : G.game.W + 20, shake: 0, off: false }; }
    if (c.leave) for (const id of [].concat(c.leave)) if (this.actors[id]) this.actors[id].off = true;
    if (c.expr) { const a = this.actors[c.expr[0]]; if (a) a.expr = c.expr[1]; }
    if (c.mask !== undefined) { for (const k in this.actors) this.actors[k].masked = !!c.mask; }
    if (c.speak !== undefined) { this.speaker = c.speak; if (c.speak && c.expr) { const a = this.actors[c.speak]; if (a) { if (c.expr === 'shock' && a.expr !== 'shock') a.shake = .3; a.expr = c.expr; } } if (c.speak && this.actors[c.speak] === undefined && G.CAST[c.speak]) { this.actors[c.speak] = { id: c.speak, side: G.CAST[c.speak].side || 'right', expr: c.expr || 'neutral', masked: false, x: G.CAST[c.speak].side === 'left' ? -130 : G.game.W + 20, shake: 0, off: false }; } }
    if (c.sfx) G.Sfx[c.sfx] && G.Sfx[c.sfx]();
    if (c.shake) { G.game.shake(c.shake); for (const k in this.actors) this.actors[k].shake = .3; }
    if (c.flash) G.game.flash(c.flash, .25);
    if (c.set) G.Flow.setFlag(c.set);
    if (c.card) { this.card = { big: c.card[0], small: c.card[1], t: 0 }; G.Sfx.foghorn(); }
    else if (c.cine) { if (G.Cine && G.Cine.has(c.cine) && !this.story.skip) { this.cine = G.Cine.start(c.cine, () => { this.cine = null; this.story.resume(); }); } else this.resumeNext = true; }
    else if (c.wait) { this.waitT = c.wait; }
  },
  update(dt) {
    const game = G.game, I = game.input, st = this.story; this.t += dt; if (!this.cine) game.focus(game.W / 2, game.H / 2, 0);
    if (this.resumeNext) { this.resumeNext = false; st.resume(); }
    this.flash = Math.max(0, this.flash - dt);
    for (const k in this.actors) { const a = this.actors[k], tx = a.off ? (a.side === 'left' ? -130 : game.W + 20) : a.side === 'left' ? Math.max(8, game.W * .07 | 0) : a.side === 'mid' ? game.W / 2 - 56 : game.W - 112 - Math.max(8, game.W * .07 | 0); a.x += (tx - a.x) * Math.min(1, dt * 11); a.shake = Math.max(0, a.shake - dt); if (a.off && Math.abs(a.x - tx) < 2) delete this.actors[k]; }
    if (this.ended) { const f = this.d.onDone; this.ended = false; if (f) f(); else G.Flow.advance(); return; }
    if (this.cine) { this.cine.update(dt); return; }
    if (this.card) { const c = this.card; c.t += dt; if ((c.t > .5 && (I.pressed('confirm') || I.clicked() || I.pressed('skip'))) || c.t > 3.2 || st.skip) { this.card = null; st.resume(); } return; }
    if (this.waitT > 0) { this.waitT -= dt; if (this.waitT <= 0) { this.waitT = 0; st.resume(); } return; }
    if (this.logOpen) { if (I.pressed('log') || I.pressed('cancel')) this.logOpen = false; if (I.repeat('up')) this.logI = Math.min(st.log.length - 1, this.logI + 1); if (I.repeat('down')) this.logI = Math.max(0, this.logI - 1); return; }
    if (I.pressed('log') && !this.d.auto) { this.logOpen = true; this.logI = 0; return; }
    st.skip = I.down('skip') && !this.d.auto;
    st.update(dt);
  },
  draw(r) {
    const W = r.W, H = r.H, game = G.game;
    if (this.cine) { this.cine.draw(r); return; }
    G.Stage.draw(r, this.stage, this.t);
    const rainHere = ['harbor', 'corridor', 'office', 'skyline'].includes(this.stage); if (rainHere !== this.rainOn) { this.rainOn = rainHere; const L = G.Sfx.loop('rain'); if (L) L.set(rainHere ? .018 : 0); }
    r.overlay(g => {
      const talkOn = this.story.talk.open && this.story.talk.typing, blink = (this.t % 3.7) < .12;
      const y0 = H - 128 - 8;
      const order = Object.values(this.actors).sort((a, b) => (a.id === this.speaker) - (b.id === this.speaker));
      for (const a of order) {
        const sp = a.id === this.speaker, cv = G.bust(a.id, { expr: a.expr, blink: blink ? 1 : 0, talk: sp && talkOn && (this.t * 11 | 0) % 2 === 0 ? 1 : 0, maskUp: a.masked, look: sp ? 0 : a.side === 'left' ? 1 : -1 });
        const bob = sp && talkOn ? Math.round(Math.abs(Math.sin(this.t * 9)) * 2) : 0, sh = a.shake > 0 ? Math.round(Math.sin(this.t * 80) * 3) : 0, x = Math.round(a.x + sh), y = y0 - bob + (sp ? 0 : 3);
        if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, x, y); px.reset(g); }
        if (!sp && this.speaker) px.blend(g, .001, 'normal', () => {});
      }
      if (this.story.talk.open && !this.d.auto) { let x = 6; x += Glyph.action(g, game.input, 'skip', x, 5) + 3; Pix.text(g, 'Hold: fast', x, 6, '#a8c8c0'); x += 58; x += Glyph.action(g, game.input, 'log', x, 5) + 3; Pix.text(g, 'Log', x, 6, '#a8c8c0'); }
      this.story.draw(r);
      if (this.story.talk.open && !this.story.talk.typing && !this.story.talk.choices && !this.d.auto && Math.sin(this.t * 5) > -.4) { const w = Glyph.width(game.input, 'confirm'); Glyph.action(g, game.input, 'confirm', Math.round(W / 2 + Math.min(404, W - 16) / 2 - w - 5), H - 19); }
      if (this.card) { px.blend(g, .85, 'normal', () => px.rect(g, 0, H / 2 - 42, W, 84, '#04121a')); px.rect(g, 0, H / 2 - 43, W, 1, '#4fd0c4'); px.rect(g, 0, H / 2 + 42, W, 1, '#4fd0c4'); E.font.text(g, this.card.big, W / 2, H / 2 - 30, '#ffd36a', { align: 'center', scale: 2, outline: false, shadow: '#000' }); E.font.text(g, this.card.small, W / 2, H / 2 - 6, '#ffffff', { align: 'center', scale: 3, outline: false, shadow: '#000' }); }
      if (this.logOpen) this.drawLog(g, W, H);
    });
  },
  drawLog(g, W, H) {
    px.blend(g, .92, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a')); Pix.text(g, 'BACKLOG', W / 2, 8, '#ffd36a', { align: 'center' });
    const L = this.story.log, rows = Math.floor((H - 40) / 20); let y = H - 26; for (let i = L.length - 1 - this.logI, n = 0; i >= 0 && n < rows; i--, n++) { const e = L[i], lines = E.font.wrap(e.text, W - 100); y -= lines.length * 9 + 3; lines.forEach((l, k) => Pix.text(g, l, 88, y + k * 9, e.who === 'choice' ? '#9fffc0' : '#ffffff')); if (e.name) Pix.text(g, e.name.slice(0, 13), 8, y, '#ffd36a'); }
    Pix.text(g, 'Up and down to read, back to return', W / 2, H - 12, '#8fb8b0', { align: 'center' });
  },
};
})();
