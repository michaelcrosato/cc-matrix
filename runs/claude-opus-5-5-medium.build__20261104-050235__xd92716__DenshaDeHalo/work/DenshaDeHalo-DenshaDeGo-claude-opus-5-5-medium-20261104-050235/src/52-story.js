/* DENSHA DE HALO! · story: speech with portraits and Babble voices through the engine's Dialog. Radio chatter is
 * non-modal and queued so lines never overlap; briefings are modal. Subtitles carry the meaning (on by default); with
 * them off the voices still speak. Tips show once per save (the "Show tips" setting brings them back). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px;
const speakerIcon = (col, kind) => (g, x, y, size) => {   // the PA horn or the dispatcher's radio
  px.rect(g, x, y, size, size, '#1a2238'); px.rect(g, x + 1, y + 1, size - 2, size - 2, '#2a3458');
  const cx = x + size / 2, cy = y + size / 2;
  if (kind === 'pa') { px.poly(g, [[cx - 8, cy - 4], [cx - 2, cy - 4], [cx + 7, cy - 10], [cx + 7, cy + 10], [cx - 2, cy + 4], [cx - 8, cy + 4]], col); for (let i = 1; i < 3; i++) px.rect(g, cx + 9 + i * 3, cy - 6 + i, 1, 12 - i * 2, col); }
  else { px.rect(g, cx - 6, cy - 6, 12, 14, col); px.rect(g, cx - 4, cy - 4, 8, 4, '#1a2238'); px.rect(g, cx + 3, cy - 13, 2, 7, col); for (let i = 0; i < 3; i++) px.rect(g, cx - 4, cy + 2 + i * 2, 8, 1, '#1a2238'); }
};
const portraitOf = who => {
  if (who === 'haro') return DH.haroPortrait;
  if (who === 'pa') return speakerIcon('#b8c8e8', 'pa');
  if (who === 'dispatch') return speakerIcon('#9ae0c0', 'radio');
  if (who === 'driver') return null;
  return DH.castRig(who);
};
DH.portraitOf = portraitOf;
class Story {
  constructor() { this.q = []; this.talk = new E.Dialog(game, { speed: 40, lines: 2 }); this.cur = null; this.y = null; this.callSub = null; }
  say(who, line, o = {}) { if (o.soft && this.q.length > 1) return; this.q.push({ who, line, o }); }
  clear() { this.q.length = 0; this.talk.close(); this.cur = null; }
  update(dt, y) {
    if (this.callSub) { this.callSub.t += dt; if (this.callSub.t > 2.2) this.callSub = null; }
    const T = this.talk;
    if (!T.open && this.q.length) {
      const it = this.q.shift(), C = DH.CAST[it.who] || DH.CAST.pa, subs = game.settings.subtitles !== false;
      this.cur = it; T.nameColor = C.color; T.voice = DH.Babble.dialogHook(C.voice);
      const portrait = portraitOf(it.who), len = Math.max(2.5, it.line.length / 18 + 1.2);
      T.say(it.line, { name: C.name, portrait: portrait || undefined, portraitSize: 26, auto: len, modal: false, y: y !== undefined ? y : undefined, alpha: subs ? .85 : 0, place: 'top' });
      if (!subs) { T._hidden = true; DH.Babble.say(it.line, C.voice); T.voice = null; } else T._hidden = false;
      game.audio.duck(true); this._duckT = len;
    }
    if (this._duckT !== undefined) { this._duckT -= dt; if (this._duckT <= 0 && !T.open) { game.audio.duck(false); this._duckT = undefined; } }
    T.update(dt);
  }
  draw(r) { if (this.talk.open && !this.talk._hidden) this.talk.draw(r); }
  /** a call's subtitle: the romaji, then the English */
  call(phrase, grade) { this.callSub = { phrase, grade, t: 0 }; DH.Babble.say(phrase[0], 'driver'); }
  drawCall(g, W, y) {
    const c = this.callSub; if (!c || game.settings.subtitles === false) return;
    const a = c.t < 1.8 ? 1 : 1 - (c.t - 1.8) / .4;
    if (a <= 0) return;
    const w = Math.max(E.font.width(c.phrase[0], { scale: 2 }), E.font.width(c.phrase[1])) + 16, x = Math.round(W / 2 - w / 2);
    px.blend(g, .75, 'normal', () => px.rect(g, x, y, w, 30, '#0b0d18'));
    E.font.text(g, c.phrase[0], Math.round(W / 2), y + 3, '#ffffff', { align: 'center', scale: 2 });
    E.font.text(g, c.phrase[1] + (c.grade ? '   ' + c.grade : ''), Math.round(W / 2), y + 20, c.grade === 'GREAT' ? '#5ae0ff' : '#c8d0e8', { align: 'center' });
  }
}
DH.Story = Story;
/** tips: once per save, unless "Show tips" is on (then once per run) */
DH.tipWanted = id => { if (DH.attractOn) return false; if (game.settings.tips) return true; return !DH.tipsSeen[id]; };
DH.tipShown = id => { DH.tipsSeen[id] = 1; DH.saveTips(); };
})();
