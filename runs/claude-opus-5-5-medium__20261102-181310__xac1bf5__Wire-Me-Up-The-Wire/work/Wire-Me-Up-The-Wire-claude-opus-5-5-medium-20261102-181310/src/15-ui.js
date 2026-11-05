/* ============================================================================
 * 15-ui: the case notebook and the evidence photographs (polaroids of the people in them, in black and white)
 * ========================================================================== */
function polaroid(g, x, y, photo, w = 46, sel = false) {
  x = Math.round(x); y = Math.round(y);
  const h = Math.round(w * 1.18);
  px.rect(g, x + 2, y + 2, w, h, '#000000');
  px.rect(g, x, y, w, h, sel ? '#fff4c0' : '#e8e4d8');
  px.rect(g, x + 3, y + 3, w - 6, w - 6, '#2a2a2c');
  const rigs = photo && photo.rigs ? (typeof photo.rigs === 'function' ? photo.rigs() : photo.rigs) : [];
  if (rigs.length) {
    const n = w < 36 ? 1 : Math.min(2, rigs.length), s = Math.floor((w - 6) / n);
    rigs.slice(0, n).forEach((rg, i) => rg.drawPortrait(g, x + 3 + i * s, y + 3, s, { zoom: n > 1 ? 1.6 : 2.4, turn: .5, bg: '#3a3a3c', frame: false, tint: '#9a9a9a' }));
  } else if (photo && photo.id === 'burner') {   // the phone itself
    px.rect(g, x + w / 2 - 6, y + 10, 12, 20, '#1a1a1a'); px.rect(g, x + w / 2 - 4, y + 12, 8, 6, '#6a8a6a'); for (let i = 0; i < 6; i++) px.rect(g, x + w / 2 - 4 + (i % 3) * 3, y + 21 + Math.floor(i / 3) * 3, 2, 2, '#8a8a8a');
  } else { txt(g, '?', x + w / 2, y + w / 2 - 6, '#8a8a8a', { align: 'center', scale: 2 }); }
  if (photo && photo.time && w >= 36) txt(g, photo.time, x + w - 4, y + w - 12, '#ffb040', { align: 'right' });
  return h;
}
function drawNotebook(g, W, H, objs, chapter) {
  px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
  const w = Math.min(W - 20, 380), h = Math.min(H - 30, 220), x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
  px.rect(g, x, y, w, h, '#d8cfb4'); px.rect(g, x, y, w, 16, '#8a2a22');
  for (let ly = y + 30; ly < y + h - 4; ly += 11) px.rect(g, x + 4, ly, w - 8, 1, '#b8c0d0');
  px.rect(g, x + 22, y + 16, 1, h - 16, '#d08a8a');
  txt(g, 'CASE NOTEBOOK  •  PRYOR ORGANIZATION', x + 8, y + 4, '#f8f0e0');
  txt(g, 'CH.' + chapter, x + w - 8, y + 4, '#f8f0e0', { align: 'right' });
  let yy = y + 21;
  for (const o of objs) {
    const ok = o.n >= o.of;
    txt(g, (ok ? '[x] ' : '[ ] ') + o.t + (o.of > 1 ? '  ' + o.n + '/' + o.of : ''), x + 28, yy, ok ? '#4a6a4a' : '#1a1a2a', { shadow: false });
    yy += 11;
  }
  yy += 4;
  txt(g, 'EVIDENCE (' + CASE.photos.length + ')', x + 28, yy, '#6a1a1a', { shadow: false }); yy += 11;
  const pw = 36, colW = Math.floor((w - 36) / 2), rowsMax = Math.max(1, Math.floor((y + h - 16 - yy) / 46));
  CASE.photos.slice(-rowsMax * 2).forEach((p, i) => {
    const px0 = x + 28 + (i % 2) * colW, py0 = yy + Math.floor(i / 2) * 46;
    polaroid(g, px0, py0, p, pw);
    E.font.wrap(p.label, colW - pw - 12).slice(0, 3).forEach((ln, k) => txt(g, ln, px0 + pw + 6, py0 + 2 + k * 9, '#1a1a2a', { shadow: false }));
    if (p.time) txt(g, p.time, px0 + pw + 6, py0 + 32, '#8a3a1a', { shadow: false });
  });
  if (!CASE.photos.length) txt(g, 'Nothing yet. Raise the camera and wait for something to happen.', x + 28, yy, '#3a3a4a', { shadow: false });
  promptRow(g, [['notebook', 'Close']], W / 2, y + h + 4);
}
