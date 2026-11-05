/* 27-presentation: Sonny's commentary on the big moments, Pepper's tutorial tips in the welcome match, and the specials of
 * the final against The House: Golden Glare (Sonny's serves dazzle the receiver, sunglasses are immune), House Edge (one
 * precise line shot per set from Pepper) and Lucky Seven (Sonny's first attack at game point clips the tape and dribbles over). */
G.Match.prototype.commentate = function (key) {
  if (this.o.commentary === false) return;
  const text = G.callLine(key);
  if (!text) return;
  this.commentary = { text, t: 2.6 };
};
G.Match.prototype.tipFor = function (key) {
  if (!this.o.tutorial) return;
  this.tipsSeen = this.tipsSeen || {};
  if (this.tipsSeen[key]) return;
  this.tipsSeen[key] = true;
  const map = { receive: 0, set: 1, spike: 2, serve: 3, block: 4, dive: 5, call: 6, chem: 7 };
  const idx = map[key];
  if (idx === undefined) return;
  const txt = G.LINES.pepper.tips[idx].replace(/\{play\}/g, G.keyLabelFor('play')).replace(/\{shot\}/g, G.keyLabelFor('shot')).replace(/\{dive\}/g, G.keyLabelFor('dive')).replace(/\{call\}/g, G.keyLabelFor('call'));
  this.hint = { text: txt, t: 7 };
};
G.keyLabelFor = function (action) {
  const I = G.game.input, dev = G.devOf(I);
  const code = G.boundCode(I, action, dev === 'kbm' ? 'kbm' : 'pad') || G.boundCode(I, action, 'kbm') || G.boundCode(I, action, 'pad');
  if (!code) return action.toUpperCase();
  if (code.startsWith('Pad')) { const k = G.padIndex(code); return k <= 3 ? G.PAD_SYMBOL[G.padStyle()][k] : (G.PAD_PILL[k] || 'PAD'); }
  return G.keyName(code);
};
G.Match.prototype.hasShades = function (p) { return (p.acc || []).some(a => G.ACCESSORIES[a] && G.ACCESSORIES[a].shades); };
/* specials: called as serves are made and at each touch */
G.Match.prototype.specialServe = function (s) {
  if (this.o.story !== 'final' || s.id !== 'sonny') return;
  this.glare = null;
  if (this.rng() < .5) { this.glare = { t: this.t, server: s }; G.sfx('glare'); this.callFloat(s, 'GLARE!'); }
};
G.Match.prototype.specialTouch = function (p, kind, o) {
  if (this.o.story !== 'final') return o;
  if (p.id === 'pepper' && kind === 'attack' && this.setNo !== undefined) {
    this.houseEdge = this.houseEdge || {};
    if (!this.houseEdge[this.setNo]) { this.houseEdge[this.setNo] = true; o.deep = true; o.shot = false; this.callText = { text: 'HOUSE EDGE!', t: 1.2, side: p.side }; this.houseEdgeLive = { side: 1 - p.side, t: this.t }; }
  }
  if (p.id === 'sonny' && kind === 'attack' && this.score && this.score[p.side] >= this.pointsToWin - 1 && !this.luckyUsed) {
    this.luckyUsed = true; this.luckyNow = true; this.callText = { text: 'LUCKY SEVEN!', t: 1.2, side: p.side };
  }
  return o;
};
/* the timing ring is hidden for a dazzled receiver (not one in sunglasses) */
G.Match.prototype.dazzled = function (p) {
  const g = this.glare; if (!g || !p || !p.human) return false;
  return !this.hasShades(p) && this.pending && this.pending.p === p && this.t < this.pending.ts + .5;
};
/* the commentary and the hint, drawn over the court */
G.Match.prototype.drawCommentary = function (r) {
  const W = r.W, H = r.H;
  if (this.commentary && this.commentary.t > 0) {
    const txt = this.commentary.text;
    r.overlay(g => { const w = Math.min(W - 40, E.font.width(txt, { scale: 1 }) + 14); const x = W - w - 8, y = H - 96; E.ui.box(g, x, y, w, 18, { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', alpha: .92 }); E.font.text(g, txt, x + 7, y + 5, '#fff8e8', { scale: 1, shadow: '#000' }); });
  }
  if (this.hint && this.hint.t > 0) {
    const lines = G.wrapText(this.hint.text, 200, 1);
    r.overlay(g => { E.ui.box(g, 8, H - 120, 214, 12 + lines.length * 10, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 }); lines.forEach((l, i) => E.font.text(g, l, 14, H - 114 + i * 10, '#fff8e8', { scale: 1, shadow: '#000' })); });
  }
};
G.Match.prototype.tickPresentation = function (dt) {
  if (this.commentary) this.commentary.t -= dt;
  if (this.hint) this.hint.t -= dt;
};
