// The story scene: a painted stage, big portraits, typed lines with gibberish voices, chapter cards, cinematics, a backlog.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px, font } = E;
const STAFF = { vale: 1, quill: 1, sokolova: 1, oyelaran: 1 };
const LEFT = { vale: 1, sokolova: 1 };
G.SCENES = G.SCENES || {};
G.makeStory = (game) => { const people = {}; for (const id in G.CAST) people[id] = { name: G.CAST[id].name };
  const talk = new E.Dialog(game, { voice: (ch) => G.babble.letter(ch, G.curWho || 'quill'), speed: 46, lines: 2, width: 416, bg: '#06161a', border: '#5ff0e0', nameColor: '#5ff0e0' });
  const story = new E.Story(game, { people, nodes: G.compileStory(), dialog: talk, on: { stage: (s, st) => G.storyView.setStage(st.arg), look: (s, st) => G.storyView.look(st.who, st.expr), card: (s, st) => G.storyView.card(st.arg), cine: (s, st) => G.storyView.cine(st.arg) } });
  return story; };
class StoryView {
  constructor(game) { this.game = game; this.reset(); }
  reset() { this.stage = null; this.slots = { L: null, R: null }; this.t = 0; this.cardT = 0; this.cardText = null; this.player = null; this.backlog = false; this.blinkT = 2; this.speaker = null; }
  setStage(id) { this.stage = id; this.slots = { L: null, R: null }; const m = { harbor: 'tension', gala: 'tension', theatre: 'tension', chapel: 'ward', scrub: 'ward', radiology: 'ward', office: 'tension', ward: 'ward', shipward: 'tension', gallery: 'ward' }[id]; if (!this.silent) G.music.play(m || 'ward'); }
  look(who, expr) { G.curWho = who; this.speaker = who; const side = LEFT[who] ? 'L' : 'R', cur = this.slots[side]; if (cur && cur.who === who) { if (cur.expr !== expr && (expr === 'shock' || expr === 'shout')) cur.shake = .3; cur.expr = expr; } else this.slots[side] = { who, expr, slide: 0, shake: expr === 'shock' ? .3 : 0 }; }
  card(arg) { const [a, b] = arg.split('|'); this.cardText = [a, b]; this.cardT = 2.6; G.sfx.swell(); }
  cine(id) { this.player = new G.CinePlayer(this.game, id); G.sfx.swell(); if (id === 'stormship') { G.sfx.foghorn(); G.sfx.creak(); } }
  ambience(dt) { const id = this.player ? null : this.stage, wet = { harbor: 1, office: .6, ward: .5, radiology: .3, theatre: .25, gala: .2 }[id] || 0; G.sfx.set('rain', { type: 'highpass', f: 2600, q: .4, v: .06 }, wet); this.amb = (this.amb || 6) - dt; if (this.amb <= 0) { this.amb = 11 + Math.random() * 8; if (id === 'harbor') G.sfx.foghorn(); else if (id === 'shipward') G.sfx.creak(); } }
  update(dt) { const game = this.game, I = game.input, story = G.story; this.t += dt; this.ambience(dt); this.blinkT -= dt; if (this.blinkT < -.12) this.blinkT = 2 + Math.random() * 3; for (const k in this.slots) { const q = this.slots[k]; if (q) { q.slide = Math.min(1, q.slide + dt * 4); if (q.shake > 0) q.shake -= dt; } }
    if (this.cardT > 0) { this.cardT -= dt; if (I.pressed('confirm') || I.clicked()) this.cardT = Math.min(this.cardT, .2); if (this.cardT <= 0) { this.cardText = null; story.resume(); } return true; }
    if (this.player) { this.player.update(dt); if (this.player.done || I.pressed('confirm') || I.clicked()) { this.player.finish(); this.player = null; game.focus(game.W / 2, game.H / 2, 0); story.resume(); } return true; }
    game.focus(game.W / 2, game.H / 2, 0);
    if (I.pressed('log')) this.backlog = !this.backlog; if (this.backlog) { if (I.pressed('cancel') || I.pressed('confirm')) this.backlog = false; I.consumeAll(); return true; }
    story.skip = I.down('skip') || !!this.autoSkip; story.update(dt); return story.running; }
  draw(r) { if (this.player) { this.player.draw(r); return; } const talk = G.story.talk; r.overlay(g => { if (this.stage) G.drawStage(g, this.stage, r.W, r.H, this.t); else px.rect(g, 0, 0, r.W, r.H, '#000'); for (const side of ['L', 'R']) this.drawSlot(g, r, side, talk);
      if (this.cardText) { px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#02080a')); const w = r.W; font.text(g, this.cardText[0].toUpperCase(), w / 2, r.H / 2 - 30, '#5ff0e0', { align: 'center', outline: false, shadow: '#000' }); font.title(g, this.cardText[1], w / 2, r.H / 2 - 14, { scale: 3, align: 'center', colors: ['#ffffff', '#a8e8e0'] }); }
      if (this.stage && talk.open && !this.cardText) { const inp = this.game.input; const w = G.promptWidth(inp, 'skip', 'Hold: skip') + G.promptWidth(inp, 'log', 'Log') + 10; let x = 6; x += G.drawPrompt(g, inp, 'skip', 'Hold: skip', x, 4) + 10; G.drawPrompt(g, inp, 'log', 'Log', x, 4); } if (this.backlog) this.drawLog(g, r); });
    G.story.draw(r); }
  drawSlot(g, r, side, talk) { const q = this.slots[side]; if (!q) return; const speaking = q.who === this.speaker, typing = speaking && talk.open && talk.typing, mouth = typing && (this.t * 10 | 0) % 2, c = G.bust(q.who, q.expr, { blink: this.blinkT < 0 && !typing, talk: mouth, maskUp: this.stage === 'theatre' && STAFF[q.who] && q.expr !== 'shock' }), e = 1 - (1 - q.slide) ** 3, W = r.W, base = side === 'L' ? Math.max(12, W * .18 - 56) : Math.min(W - 124, W * .82 - 56), off = (1 - e) * (side === 'L' ? -140 : 140), bob = typing ? Math.sin(this.t * 14) * 1 : Math.sin(this.t * 1.6) * .7, sh = q.shake > 0 ? Math.sin(this.t * 70) * 2 : 0; px.reset(g); g.drawImage(c, base + off + sh | 0, r.H - 128 - 22 + bob + (speaking ? 0 : 3) | 0); px.reset(g); }
  drawLog(g, r) { px.blend(g, .9, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#02080a')); font.text(g, 'BACKLOG', 12, 8, '#5ff0e0', { outline: false }); const L = G.story.log.slice(-9); L.forEach((e, i) => { const y = 24 + i * 24; font.text(g, e.name || '', 12, y, '#5ff0e0', { outline: false }); font.text(g, e.text.slice(0, 90), 12, y + 10, '#e8fbf6', { outline: false }); }); }
}
G.StoryView = StoryView;
G.SCENES.story = { pausable: true, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(d) { const game = G.game; game.saves.canSave = false; const V = G.storyView; V.reset(); V.silent = false; this.then = d.then; G.story.auto = d.auto || 0; V.autoSkip = !!d.autoSkip; G.story.run(d.id, { onDone: () => { this.done = true; } }); this.done = false; },
  exit() { G.sfx.set('rain', { type: 'highpass', f: 2600, q: .4, v: .06 }, 0); },
  update(dt) { G.storyView.update(dt); if (this.done && !G.storyView.player) { this.done = false; const t = this.then; this.then = null; if (t) t(); } },
  draw(r) { G.storyView.draw(r); } };
})();
