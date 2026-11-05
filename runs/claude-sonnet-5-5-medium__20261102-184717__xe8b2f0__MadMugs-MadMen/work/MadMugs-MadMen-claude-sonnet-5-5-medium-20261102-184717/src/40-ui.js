// ---------------------------------------------------------------------------------------------------------------------
// UI: button prompts that follow the device, the HUD, the conversation runner, the notebook
// ---------------------------------------------------------------------------------------------------------------------
const px = E.px;
const txt = (g, s, x, y, color, o) => E.font.text(g, s, x, y, color || '#fff', Object.assign({ shadow: '#000', outline: false }, o));
const tw = (s, o) => E.font.width(s, o);
const panel = (g, x, y, w, h, o) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#241a30', '#150f1e'], border: '#d8b878', alpha: .96 }, o));

// -- glyphs: PlayStation (✕ ○ □ △) or Xbox (A B X Y) for a pad, key caps for the keyboard, "CLICK" for the mouse ------------
function padIndex(act) { const c = (I.map[act] || []).find(k => /^Pad\d+$/.test(k)); return c ? +c.slice(3) : -1; }
function glyphWidth(act) {
  if (I.lastDevice === 'gamepad') return 13;
  return tw(keyText(act)) + 7;
}
function keyText(act) { return I.lastDevice === 'mouse' && act === 'interact' ? 'CLICK' : upper(I.label(act, 'keyboard') || act); }
function drawGlyph(g, act, x, y) {   // (x, y) = left edge, vertical centre; returns the width used
  if (I.lastDevice === 'gamepad') {
    const idx = padIndex(act), style = I.padStyle(), cx = x + 6, cy = y;
    px.disc(g, cx, cy, 6, '#0c0a12'); px.disc(g, cx, cy, 5, '#2a2638');
    if (style === 'xbox' && idx >= 0 && idx <= 3) {
      const L = ['A', 'B', 'X', 'Y'][idx], c = ['#6fd06f', '#f06a5a', '#6a9af0', '#f0d04a'][idx];
      txt(g, L, cx - 2, cy - 3, c, { shadow: false });
    } else if (idx >= 0 && idx <= 3 && style === 'playstation') {
      const c = ['#7aa6ff', '#ff7a7a', '#ff9ad5', '#7ee0a8'][idx];
      if (idx === 0) { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, c, 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, c, 1); }
      else if (idx === 1) { px.disc(g, cx, cy, 3, c); px.disc(g, cx, cy, 2, '#2a2638'); }
      else if (idx === 2) { px.rect(g, cx - 2, cy - 2, 5, 5, c); px.rect(g, cx - 1, cy - 1, 3, 3, '#2a2638'); }
      else { px.line(g, cx, cy - 3, cx - 3, cy + 2, c, 1); px.line(g, cx, cy - 3, cx + 3, cy + 2, c, 1); px.line(g, cx - 3, cy + 2, cx + 3, cy + 2, c, 1); }
    } else txt(g, idx >= 0 ? I.codeLabel('Pad' + idx).slice(0, 2) : '?', cx - 3, cy - 3, '#e8e4ff', { shadow: false });
    return 13;
  }
  const t = keyText(act), w = tw(t) + 6;
  px.rect(g, x, y - 5, w, 11, '#0c0a12'); px.rect(g, x + 1, y - 4, w - 2, 8, '#d8d2c0'); px.rect(g, x + 1, y + 4, w - 2, 1, '#8a8474');
  txt(g, t, x + 3, y - 3, '#1a1420', { shadow: false });
  return w + 1;
}
function promptLine(g, r, act, label, y) {   // a glyph and its action, centred, on a dark pill
  const w = glyphWidth(act) + 4 + tw(label) + 12, x = Math.round((r.W - w) / 2);
  E.ui.box(g, x, y - 8, w, 17, { bg: '#120e1a', border: '#6a5a40', alpha: .88, gradient: false });
  const gw = drawGlyph(g, act, x + 6, y); txt(g, label, x + 6 + gw + 3, y - 3, '#fff');
}

// -- the conversation runner: a node is some pages by some people, then maybe choices --------------------------------------
const talk = new E.Dialog(game, { speed: 44, lines: 3, voice: null, bg: '#1c1426', border: '#d8b878', nameColor: '#ffd890', color: '#fff4e0' });
let pending = null, talkAfter = null, talkCool = 0;
function whoOf(w) { return w && PEOPLE[w] ? PEOPLE[w] : null; }
function sayGroup(who, lines, extra) {
  const P = whoOf(who);
  talk.voice = P ? P.voice : 'vox_narr';
  talk.nameColor = P ? P.color : '#8a84a0';
  talk.say(lines, Object.assign({ name: P ? P.name : null, portrait: P ? rigs[who] : null, portraitSize: 46, portraitOpts: { zoom: 2.4 } }, extra));
}
function runNode(id, after) {
  const n = T[id]; if (!n) { if (after) after(); return; }
  S.mode = 'talk'; talkAfter = after || null;
  S.visits[id] = (S.visits[id] || 0) + 1;
  applyFx(n.fx);
  const seq = [];
  for (const l of n.say) { const [w, t] = Array.isArray(l) ? l : [n.who, l]; const last = seq[seq.length - 1]; if (last && last.who === w) last.lines.push(t); else seq.push({ who: w, lines: [t] }); }
  const asks = (n.ask || []).filter(a => !a.if || a.if(S));
  const finish = go => {
    const nxt = typeof go === 'function' ? go(S) : go;
    if (nxt) runNode(nxt, talkAfter); else { S.mode = 'walk'; talkCool = .35; const a = talkAfter; talkAfter = null; if (a) a(); }
  };
  const step = k => {
    const grp = seq[k], lastGrp = k === seq.length - 1;
    if (lastGrp && asks.length) {
      sayGroup(grp.who, grp.lines, { choices: asks.map(a => a.t), onChoice: i => { pending = () => { applyFx(asks[i].fx); if (asks[i].do) asks[i].do(S); finish(asks[i].go === undefined ? n.go : asks[i].go); }; } });
    } else sayGroup(grp.who, grp.lines, { onDone: () => { if (lastGrp) finish(n.go); else step(k + 1); } });
  };
  step(0);
}
function talkUpdate(dt) {   // true while a conversation holds the game
  if (pending) { const f = pending; pending = null; f(); }
  if (talk.update(dt)) return true;
  return !!pending || talk.open;
}

// -- HUD -------------------------------------------------------------------------------------------------------------------
function drawHud(r, hover) {
  const quiet = PT.phase !== 'off' || S.mode === 'type';
  r.overlay(g => {
    if (quiet) { S.pops.forEach((p, i) => { const a = Math.max(0, 1 - p.t / 3.2); if (a > 0) txt(g, p.text, Math.round((r.W - tw(p.text)) / 2), 40 + i * 10, p.color); }); return; }
    const hints = game.settings.hints !== false;
    // clock and the day
    const bx = 4, by = 4, bw = 138;
    panel(g, bx, by, bw, hints ? 72 : 24, { alpha: .82 });
    txt(g, fmtTime(S.min), bx + 6, by + 5, '#ffe9b0', { scale: 2 });
    txt(g, 'TUE OCT 15 1963', bx + 6, by + 22, '#b8a888');
    if (hints) {
      const obj = E.font.wrap(objective(), bw - 12, {});
      obj.slice(0, 4).forEach((ln, i) => txt(g, ln, bx + 6, by + 33 + i * 9, '#e8e4ff'));
    }
    // four numbers, small, under the panel
    const ks = ['nerve', 'heart', 'polish', 'haze'];
    ks.forEach((k, i) => {
      const x = bx + i * 35, y = by + (hints ? 76 : 28);
      txt(g, STAT_NAMES[k].slice(0, 3), x, y, STAT_COLORS[k]);
      E.ui.bar(g, x, y + 8, 31, 4, stat(k) / 10, STAT_COLORS[k]);
    });
    // floating results ("+1 NERVE")
    S.pops.forEach((p, i) => { const a = Math.max(0, 1 - p.t / 3.2); if (a > 0) txt(g, p.text, Math.round((r.W - tw(p.text)) / 2), 22 + i * 10 - Math.min(10, p.t * 8), p.color, { shadow: '#000' }); });
    // the prompt for what is in reach
    if (hints && hover && S.mode === 'walk') promptLine(g, r, 'interact', hover.label, r.H - 30);
    // bottom-left reminders
    if (hints) {
      let x = 6; const y = r.H - 9;
      x += drawGlyph(g, 'notebook', x, y) + 2; txt(g, 'NOTEBOOK', x, y - 3, '#d8d2c0'); x += tw('NOTEBOOK') + 10;
      x += drawGlyph(g, 'view', x, y) + 2; txt(g, 'VIEW', x, y - 3, '#d8d2c0');
    }
  });
}

// -- the notebook ----------------------------------------------------------------------------------------------------------
const NB = { open: false, tab: 0, rects: [] };
const NB_TABS = ['TODAY', 'CARDS', 'PEOPLE', 'POCKETS'];
function openNotebook() { NB.open = true; NB.tab = 0; S.mode = 'note'; game.audio.sfx('paper'); }
function closeNotebook() { NB.open = false; S.mode = 'walk'; talkCool = .25; game.audio.sfx('cancel'); }
function notebookUpdate() {
  if (I.pressed('cancel') || I.pressed('notebook')) return closeNotebook();
  if (I.repeat('right')) { NB.tab = (NB.tab + 1) % NB_TABS.length; game.audio.sfx('select'); }
  if (I.repeat('left')) { NB.tab = (NB.tab + NB_TABS.length - 1) % NB_TABS.length; game.audio.sfx('select'); }
  const c = I.clicked();
  if (c) { const hit = NB.rects.findIndex(q => c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]); if (hit >= 0 && hit !== NB.tab) { NB.tab = hit; game.audio.sfx('select'); } }
}
function tasteOf(theme) {
  if (S.flags.intel) return THEMES[theme].aff >= 18 ? 'LIKES' : THEMES[theme].aff < 0 ? 'DISLIKES' : 'SHRUGS';
  if (S.flags.flattery && theme === 'status') return 'DISLIKES';
  return '?';
}
function drawNotebook(r) {
  r.overlay(g => {
    const w = Math.min(r.W - 20, 392), h = Math.min(r.H - 20, 214), x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
    px.rect(g, 0, 0, r.W, r.H, 'rgba(8,6,12,.55)');
    panel(g, x, y, w, h);
    NB.rects = [];
    let tx = x + 10;
    NB_TABS.forEach((t, i) => {
      const on = i === NB.tab, ww = tw(t) + 12;
      px.rect(g, tx, y + 6, ww, 13, on ? '#d8b878' : '#3a2e48'); txt(g, t, tx + 6, y + 9, on ? '#1a1420' : '#c8c0b0', { shadow: on ? false : '#000' });
      NB.rects.push([tx, y + 6, ww, 13]); tx += ww + 3;
    });
    const R = x + w - 10, hx = R - (glyphWidth('cancel') + 3 + tw('CLOSE')); const gw0 = drawGlyph(g, 'cancel', hx, y + 12); txt(g, 'CLOSE', hx + gw0 + 3, y + 9, '#c8c0b0');
    const cx = x + 12, top = y + 28;
    if (NB.tab === 0) {
      txt(g, fmtTime(S.min) + ', Tuesday', cx, top, '#ffe9b0', { scale: 2 });
      const lines = E.font.wrap(objective(), w - 24, {});
      lines.forEach((ln, i) => txt(g, ln, cx, top + 20 + i * 9, '#fff'));
      const list = [['Hollis\'s briefing', !!S.flags.briefed], ['Three cards or more (' + cardCount() + ' of 5)', cardCount() >= 3], ['The line, written at your desk', !!S.tagline], ['4:00 PM, the conference room', S.mode === 'ending']];
      list.forEach(([t, done], i) => { const yy = top + 20 + lines.length * 9 + 8 + i * 12; px.rect(g, cx, yy, 8, 8, '#0c0a12'); px.rect(g, cx + 1, yy + 1, 6, 6, done ? '#7ed08a' : '#3a2e48'); txt(g, t, cx + 13, yy, done ? '#b8e8c0' : '#d8d2c0'); });
      const sy = top + 20 + lines.length * 9 + 8 + 4 * 12 + 6;
      ['nerve', 'heart', 'polish', 'haze'].forEach((k, i) => { const sx = cx + i * Math.floor((w - 24) / 4); txt(g, STAT_NAMES[k], sx, sy, STAT_COLORS[k]); E.ui.bar(g, sx, sy + 9, Math.floor((w - 24) / 4) - 8, 5, stat(k) / 10, STAT_COLORS[k]); });
    } else if (NB.tab === 1) {
      Object.keys(THEMES).forEach((k, i) => {
        const yy = top + i * 22, T_ = THEMES[k], own = S.cards[k];
        px.rect(g, cx, yy, 5, 18, own ? T_.color : '#3a2e48');
        txt(g, T_.name + (own && own.strong ? '  (STRONG)' : ''), cx + 10, yy, own ? T_.color : '#8a8298');
        txt(g, own ? T_.blurb : 'From: ' + CARD_FROM[k], cx + 10, yy + 9, own ? '#e8e4ff' : '#8a8298');
        const t = tasteOf(k); txt(g, 'GARLAND: ' + t, R - tw('GARLAND: ' + t), yy, t === 'LIKES' ? '#8fe0a0' : t === 'DISLIKES' ? '#f08a7a' : '#a8a0b8');
      });
      txt(g, S.tagline ? 'YOUR LINE: ' + S.tagline.text : 'Your line is not written. (Your desk, the typewriter.)', cx, top + 5 * 22 + 4, S.tagline ? '#ffe9b0' : '#8a8298');
    } else if (NB.tab === 2) {
      ['dot', 'walt', 'teddy', 'hollis', 'lorraine'].forEach((id, i) => {
        const yy = top + i * 30, P = PEOPLE[id], t = S.rel[id];
        rigs[id].drawPortrait(g, cx, yy, 24, { zoom: 2.4 });
        txt(g, P.name, cx + 30, yy + 1, P.color); txt(g, P.role, cx + 30, yy + 11, '#c8c0b0');
        const label = t >= 2 ? 'DEVOTED' : t === 1 ? 'WARM' : t === 0 ? 'NEUTRAL' : 'WARY';
        txt(g, label, R - tw(label), yy + 1, t > 0 ? '#aee8b0' : t < 0 ? '#f0a090' : '#a8a0b8');
        for (let k = 0; k < 3; k++) px.rect(g, R - 8 - k * 9, yy + 12, 7, 6, k < t ? '#f06a88' : '#3a2e48');
      });
    } else {
      const ids = Object.keys(ITEMS).filter(k => S.items[k]);
      if (!ids.length) txt(g, 'Your pockets are empty.', cx, top, '#8a8298');
      ids.forEach((k, i) => { const yy = top + i * 22; px.rect(g, cx, yy + 2, 8, 8, '#d8b878'); txt(g, ITEMS[k].name, cx + 14, yy, '#ffe9b0'); txt(g, ITEMS[k].text, cx + 14, yy + 9, '#c8c0b0'); });
    }
    txt(g, 'LEFT / RIGHT: PAGES', x + 12, y + h - 12, '#8a8298');
  });
}
