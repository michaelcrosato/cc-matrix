/* MAD MEN OUT — the typewriter: choose up to three insights for the campaign. Cards that share an angle make a
 * through-line (+1 power each). The tagline types itself as you choose. Keys or pad move the focus, the mouse hovers it,
 * confirm or a click picks; the bottom row has TAKE IT TO THE CLIENT and NOT YET. */
CARDS.wing = { title: 'Pure Charm', angle: 'STATUS', power: 1, line: 'Trust me.', from: 'You', text: 'No idea, no research. Just the suit and the smile.' };
const BR = { cards: [], sel: [], focus: 0, forced: false, ctx: null, typed: 0, timer: 0, pick: null, dlg: null };
function openBrainstorm(forced, ctx) {
  BR.forced = !!forced; BR.ctx = ctx || null;
  BR.cards = ctx ? ctx.hand.slice() : S.insights.slice();
  BR.sel = ctx ? [] : S.deck.filter(id => BR.cards.includes(id));
  BR.focus = 0; BR.typed = 0; BR.timer = ctx && ctx.seconds || 0;
  game.go('brainstorm', null, { fade: 'dissolve', seconds: .35 });
}
const synergy = ids => { const n = {}; ids.forEach(id => { const a = CARDS[id].angle; n[a] = (n[a] || 0) + 1; }); return n; };
const tagline = ids => ids.length ? ids.map(id => CARDS[id].line).join(' ') : '(a blank page)';
function brItems() {   // focusable: the cards, then the two buttons
  const it = BR.cards.map((id, i) => ({ kind: 'card', id, i }));
  it.push({ kind: 'go', label: BR.sel.length ? 'TAKE IT TO THE CLIENT' : (BR.cards.length ? 'CHOOSE UP TO THREE' : 'WING IT') });
  if (!BR.forced && !BR.ctx) it.push({ kind: 'back', label: 'NOT YET' });
  return it;
}
function brLayout(r) {
  const n = BR.cards.length, cw = 98, ch = 42, cols = clamp(Math.floor((r.W - 24) / (cw + 6)), 1, 5), rows = Math.ceil(n / cols);
  const x0 = Math.round((r.W - (Math.min(n, cols) * (cw + 6) - 6)) / 2), y0 = 56;
  const pos = BR.cards.map((id, i) => [x0 + (i % cols) * (cw + 6), y0 + Math.floor(i / cols) * (ch + 6), cw, ch]);
  const by = y0 + Math.max(1, rows) * (ch + 6) + 2;
  const sheetY = by + 24;
  const bw = 150, gap = 10, nb = (!BR.forced && !BR.ctx) ? 2 : 1, bx = Math.round((r.W - (nb * bw + (nb - 1) * gap)) / 2);
  const btn = [[bx, by, bw, 18], [bx + bw + gap, by, bw, 18]];
  return { pos, btn, cols, sheetY };
}
let brL = null;
function brConfirm() {
  const it = brItems()[BR.focus]; if (!it) return;
  if (it.kind === 'card') {
    const k = BR.sel.indexOf(it.id);
    if (k >= 0) { BR.sel.splice(k, 1); A.sfx('cancel'); }
    else if (BR.sel.length < 3) { BR.sel.push(it.id); A.sfx('type'); BR.typed = 0; }
    else { A.sfx('bump'); game.note('THREE IS A CAMPAIGN. FOUR IS A MEMO.'); }
  } else if (it.kind === 'go') brDone();
  else if (it.kind === 'back') { A.sfx('cancel'); game.go('office', { resume: true, at: at(34.6, 4.2) }, { fade: 'dissolve', seconds: .3 }); }
}
function brDone() {
  const deck = BR.sel.length ? BR.sel.slice() : (BR.cards.length ? [BR.cards[0]] : ['wing']);
  A.sfx('carriage');
  if (BR.ctx) { BR.ctx.deck = deck; startPitch(BR.ctx); return; }
  S.deck = deck;
  if (BR.forced) beginPitch();
  else { spend(30); game.go('office', { resume: true, at: at(34.6, 4.2) }, { fade: 'dissolve', seconds: .3 }); toast('THE CAMPAIGN IS WRITTEN', '"' + tagline(deck) + '"', COL.gold); }
}
const brainstormScene = {
  view: 'threequarter', input: KEYS, res: 'ps1', touch: [], pausable: true,
  enter() { L.enabled = false; game.follow(null); music(BR.ctx ? 'pitch' : 'lounge'); BR.pick = null; },
  update(dt) {
    const I = BR.ctx && BR.ctx.input || game.input, items = brItems();
    BR.typed += dt * 26;
    if (BR.ctx && BR.timer > 0) { BR.timer -= dt; if (BR.timer <= 0) { if (!BR.sel.length) BR.sel = BR.cards.slice(0, 3); brDone(); return; } }
    if (BR.ctx && BR.ctx.auto) { BR.ctx.auto(dt); }
    const L_ = brL || (brL = brLayout({ W: game.W, H: game.H }));
    const cols = L_.cols, n = BR.cards.length;
    const mv = (d) => { BR.focus = clamp(BR.focus + d, 0, items.length - 1); A.sfx('blip', { vol: .4 }); };
    if (I.repeat('right')) mv(1); if (I.repeat('left')) mv(-1);
    if (I.repeat('down')) { if (BR.focus < n) mv(Math.min(cols, Math.max(1, n - BR.focus))); else mv(1); }
    if (I.repeat('up')) { if (BR.focus >= n) BR.focus = Math.max(0, n - 1); else mv(-cols); }
    // the mouse: hover focuses, click picks
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    const hit = q => { if (!q) return -1; for (let i = 0; i < L_.pos.length; i++) if (hitRect(q, ...L_.pos[i])) return i; for (let j = 0; j < 2; j++) if (hitRect(q, ...L_.btn[j]) && items[n + j]) return n + j; return -1; };
    if (p && I.lastDevice === 'mouse') { const h = hit(p); if (h >= 0 && h !== BR.focus) BR.focus = h; }
    if (c) { const h = hit(c); if (h >= 0) { BR.focus = h; brConfirm(); return; } }
    if (I.pressed('confirm')) { I.consumeAll(); brConfirm(); return; }
    if (I.pressed('journal') && BR.sel.length) { BR.focus = n; }
    if (I.pressed('cancel') && !BR.forced && !BR.ctx) { BR.focus = items.length - 1; brConfirm(); }
  },
  draw(r) {
    brL = brLayout(r);
    r.sky(['#1a120c', '#2e2016', '#3a2a1c']);
    const C = BR.ctx ? CLIENTS[BR.ctx.client] : clientData(), I = BR.ctx && BR.ctx.input || game.input;
    r.overlay(g => {
      // the desk: a walnut grain across the bottom, lamp light
      for (let y = Math.round(r.H * .55); y < r.H; y += 2) px.rect(g, 0, y, r.W, 1, (y >> 1) & 1 ? '#3a2416' : '#43291a');
      r.glowDisc(g, r.W * .78, 30, 120, '#ffd890', .25);
      E.font.title(g, BR.ctx ? 'THE PITCH GAUNTLET' : 'THE CAMPAIGN', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6d8', '#e8c36a', '#b0802a'], depth: 2 });
      txt(g, C.company + ' - ' + C.product, r.W / 2, 30, COL.ink, { align: 'center' });
      const kw = BR.ctx ? {} : knownWants(), ks = Object.keys(kw);
      txt(g, ks.length ? 'They really want: ' + ks.map(a => (kw[a] > 0 ? '+' : '-') + ANGLES[a].icon + ' ' + a).join('  ') : (BR.ctx ? 'Read the client in the room. ' : 'The brief: ') + (C.brief || C.tells[0]), r.W / 2, 42, ks.length ? '#9ad0ff' : COL.dim, { align: 'center', font: ks.length ? undefined : 'tiny', wrap: r.W - 30 });
      if (BR.ctx && BR.timer > 0) txt(g, Math.ceil(BR.timer) + 's', r.W - 10, 10, BR.timer < 6 ? '#ff7a6a' : COL.ink, { align: 'right', scale: 2 });
      if (BR.ctx && BR.ctx.label) txt(g, BR.ctx.label, 10, 10, BR.ctx.color || COL.gold);
      if (!BR.cards.length) txt(g, 'You have nothing. You will have to go in on charm alone.', r.W / 2, 90, '#ff9a7a', { align: 'center' });
      const syn = synergy(BR.sel), items = brItems();
      BR.cards.forEach((id, i) => { const [x, y, w, h] = brL.pos[i]; drawCard(g, x, y, id, { w, h, sel: BR.sel.includes(id), focus: BR.focus === i });
        if (BR.sel.includes(id) && syn[CARDS[id].angle] > 1) E.font.text(g, '+1', x + w - 28, y + h - 11, '#2a7a3a', { outline: false });
        if (BR.focus === i) px.rect(g, x - 2, y + h + 1, w + 4, 2, '#ffffff'); });
      items.slice(BR.cards.length).forEach((it, j) => { const [x, y, w, h] = brL.btn[j], f = BR.focus === BR.cards.length + j;
        panel(g, x, y, w, h, { bg: f ? ['#e8c36a', '#b08a3a'] : COL.panel, border: f ? '#ffffff' : COL.border }); txt(g, (f ? '▸ ' : '') + it.label, x + w / 2, y + 6, f ? '#1a120c' : COL.ink, { align: 'center', shadow: f ? false : COL.shadow }); });
      // the sheet in the typewriter
      const sw = Math.min(r.W - 40, 360), sx = Math.round((r.W - sw) / 2), sy = brL.sheetY, sh = Math.max(30, r.H - sy - 22);
      px.rect(g, sx, sy, sw, sh, '#f4eedd'); px.rect(g, sx, sy, sw, 1, '#ffffff'); px.rect(g, sx + sw, sy + 2, 2, sh, '#1a120c');
      const full = (BR.sel.length ? C.company.split(' ')[0].toUpperCase() + '. ' : '') + tagline(BR.sel), shown = full.slice(0, Math.floor(BR.typed));
      const tl = E.font.text(g, shown + (Math.floor(game.real * 2) % 2 ? '_' : ''), sx + 8, sy + 5, '#2a2420', { outline: false, wrap: sw - 16 });
      const fc = items[BR.focus] && items[BR.focus].kind === 'card' ? CARDS[items[BR.focus].id] : null;
      if (fc && sh > tl.h + 18) E.font.text(g, '"' + fc.line + '"  ' + (fc.from ? fc.from + ': ' : '') + (fc.text || ''), sx + 8, sy + tl.h + 9, '#6a5a48', { outline: false, wrap: sw - 16 });
      const thr = Object.keys(syn).filter(a => syn[a] > 1);
      if (thr.length) E.font.text(g, 'Through-line: ' + thr.map(a => ANGLES[a].icon + ' ' + a).join(', ') + ' (+1 power each)', sx + 8, sy + sh - 10, '#2a6a3a', { outline: false, font: 'tiny' });
      const hint = (I.lastDevice === 'mouse' ? 'Click' : keyOf(I, 'confirm')) + ' choose' + (!BR.forced && !BR.ctx ? '   ' + keyOf(I, 'cancel') + ' not yet' : '');
      txt(g, hint, r.W / 2, r.H - 12, '#c8bca8', { align: 'center' });
    });
  }
};
