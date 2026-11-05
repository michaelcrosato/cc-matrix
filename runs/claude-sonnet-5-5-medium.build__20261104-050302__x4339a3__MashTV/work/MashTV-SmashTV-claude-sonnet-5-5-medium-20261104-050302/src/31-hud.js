// MASH TV: the in-play HUD (drawn in r.overlay, anchored to r.W / r.H).
const HUD = MT.hud;
HUD.tutorials = []; HUD.tutSeen = {};
HUD.tutorial = function (id, act, text, secs) { if (HUD.tutSeen[id] || (MT.run && MT.run.mode !== 'arcade' && MT.run.mode !== 'rehearsal')) return; HUD.tutSeen[id] = true; HUD.tutorials.push({ act, text, t: 0, dur: secs || 4 }); };
HUD.reset = function () { HUD.tutSeen = {}; HUD.tutorials.length = 0; };
HUD.update = function (dt) { UI.t += dt; UI.updateBanners(dt); for (const t of HUD.tutorials) t.t += dt; HUD.tutorials = HUD.tutorials.filter(t => t.t < t.dur); MT.lines.update(dt); };
function slotPanelPos(slot, r) { const w = 100, h = 30; return [slot === 0 || slot === 2 ? 4 : r.W - w - 4, slot < 2 ? 14 + (slot === 0 ? 0 : 0) : r.H - h - 20]; }
HUD.drawPlayer = function (g, r, c, w) {
  const [x, y] = slotPanelPos(c.slot, r), W = 100, Hh = 31, col = c.color;
  E.ui.box(g, x, y, W, Hh, { bg: ['#2a1446', '#140a24'], border: col, alpha: .82 });
  if (c.rig && !MT.cfg.skipRigs) { try { c.rig.drawPortrait(g, x + 2, y + 2, 16, {}); } catch (e) { /* */ } } else px.disc(g, x + 10, y + 10, 6, col);
  UI.text(g, c.name, x + 21, y + 2, col, { font: 'tiny' });
  UI.text(g, c.state === 'out' ? 'OUT' : MT.fmt$(c.cash), x + 21, y + 8, c.state === 'out' ? '#ff5a5a' : '#fff7e8', { scale: 1 });
  // hp pips
  for (let i = 0; i < c.maxHp; i++) { const on = i < c.hp; px.rect(g, x + 21 + i * 6, y + 18, 5, 5, '#14081c'); px.rect(g, x + 22 + i * 6, y + 19, 3, 3, on ? '#ff3a5a' : '#4a2a3a'); }
  // lives
  for (let i = 0; i < Math.min(6, Math.max(0, c.lives)); i++) px.disc(g, x + 4 + i * 6, y + 25, 2.2, col);
  if (c.lives > 6) UI.text(g, '+' + (c.lives - 6), x + 40, y + 22, '#fff', { font: 'tiny' });
  // bombs
  for (let i = 0; i < c.bombs; i++) px.disc(g, x + W - 8 - i * 7, y + 26, 2.6, '#e8e8f8');
  // weapon
  const W2 = MT.WEAPONS[c.wpn]; if (c.wpn !== 'blaster') { px.rect(g, x + W - 22, y + 3, 19, 9, '#14081c'); UI.text(g, W2.letter, x + W - 17, y + 4, '#7affb0'); const u = c.wMax ? c.wT / c.wMax : 0; px.rect(g, x + W - 22, y + 13, Math.round(19 * u), 2, c.wT < 2 && Math.floor(w.time * 8) % 2 ? '#ff3344' : '#7affb0'); }
  let ax = x + 52; for (const k in c.addons) { const lt = c.addons[k]; if (lt < 2 && Math.floor(w.time * 8) % 2) continue; px.rect(g, ax, y + 3, 9, 9, '#14081c'); UI.text(g, MT.WEAPONS[k].letter, ax + 2, y + 4, '#ffcc33', { font: 'tiny' }); ax += 10; }
  if (c.state === 'out') { MT.glyph.draw(g, x + 4, y + Hh + 2, 'start', MT.lastInput()); UI.text(g, 'TO CONTINUE', x + 20, y + Hh + 4, '#ffcc33', { font: 'tiny' }); }
};
HUD.draw = function (r, w, scene) {
  r.overlay(g => {
    UI.t = UI.t;
    // top-left bugs
    px.rect(g, 4, 3, 36, 9, 'rgba(10,4,20,.7)'); px.disc(g, 8, 7, 2, Math.floor(UI.t * 2) % 2 ? '#ff3344' : '#7a1020'); UI.text(g, 'LIVE', 13, 4, '#fff', { font: 'tiny' }); UI.text(g, 'MASH 9', 4, 12, '#ffcc33', { font: 'tiny', shadow: '#000' });
  });
  // ratings gauge top centre
  r.overlay(g => {
    const cx = r.W / 2, y = 3, R = w.rat.R, X = w.rat.X, prime = w.rat.prime > 0;
    E.ui.box(g, cx - 54, y, 108, 20, { bg: ['#2a1446', '#140a24'], border: prime ? (Math.floor(UI.t * 8) % 2 ? '#ff2e88' : '#ffcc33') : '#ffcc33', alpha: .85 });
    UI.text(g, 'RATINGS', cx - 50, y + 2, '#c8c0e0', { font: 'tiny' });
    UI.bar(g, cx - 50, y + 9, 60, 6, R / 100, prime ? '#ff2e88' : R > 60 ? '#7affb0' : R > 30 ? '#ffcc33' : '#ff5a5a');
    UI.text(g, prime ? 'PRIME!' : '×' + X, cx + 16, y + 5, prime ? '#ff2e88' : '#ffcc33', { scale: prime ? 1 : 2 });
    if (!prime && w.rat.cool <= 0) { /* applause light */ px.disc(g, cx + 48, y + 5, 2, R > 85 && Math.floor(UI.t * 6) % 2 ? '#fff7a0' : '#4a3a20'); }
    const run = MT.run; const info = (w.rm ? w.rm.id + ' ' + w.rm.name : ''); UI.text(g, info, cx, y + 22, '#fff7e8', { align: 'center', font: 'tiny', shadow: '#000' });
    if (run && !w.session) UI.text(g, '★ ' + run.keys + '/' + MT.KEYS_TOTAL, cx + 56, y + 5, '#ffcc33', { font: 'tiny' });
    if (run && run.diff && !w.session) UI.text(g, run.diff[0] + run.diff.slice(1).toLowerCase(), cx - 56, y + 5, '#c8c0e0', { align: 'right', font: 'tiny' });
    // boss bar
    const b = w.boss;
    if (b && (w.phase === 'boss' || w.phase === 'bossDeath')) {
      const mains = b.parts.filter(p => p.main && p.alive); const hp = b.parts.filter(p => p.main).reduce((a, p) => a + Math.max(0, p.hp), 0), max = b.parts.filter(p => p.main).reduce((a, p) => a + p.max, 0);
      const bw = 140, bx = cx - bw / 2, by = y + 31; px.rect(g, bx - 1, by - 1, bw + 2, 10, '#14081c'); UI.bar(g, bx, by, bw, 8, max ? hp / max : 0, '#ff3a5a'); UI.text(g, b.name, cx, by + 1, '#fff', { align: 'center', font: 'tiny', shadow: '#000' });
      const parts = b.parts.filter(p => !p.tv && !p.seg); let i = 0; for (const p of b.parts) if (!p.main && p.alive && p.active !== false && !p.tv && p.seg === undefined) { px.rect(g, bx + i * 8, by + 10, 6, 3, '#ffcc33'); i++; }
    }
  });
  for (const c of w.cs) HUD.drawPlayer0(r, c, w);
  // wave dots / pick a door
  r.overlay(g => {
    if (w.rm && w.phase === 'waves' && !w.survive && !w.rm.boss) { const n = w.rm.waves.length; for (let i = 0; i < n; i++) px.disc(g, r.W / 2 - (n - 1) * 4 + i * 8, r.H - 8, 2.2, i <= w.waveI ? '#ffcc33' : '#4a3a60'); }
    if (w.phase === 'exit' && !w.exitPicked && !MT.lines.cur) UI.text(g, 'PICK A DOOR!', r.W / 2, r.H - 20, Math.floor(UI.t * 4) % 2 ? '#7affb0' : '#fff', { align: 'center', scale: 2 });
  });
  // tutorial prompts
  r.overlay(g => {
    let y = r.H - (MT.lines.cur ? 62 : 36); for (const t of HUD.tutorials) {
      const pairs = t.act ? [[t.act, t.text]] : null; const w2 = (pairs ? MT.glyph.width(t.act, MT.lastInput()) + 6 : 0) + F.width(t.text) + 16; const x = (r.W - w2) / 2;
      UI.panel(g, Math.round(x), y, Math.round(w2), 16, { bulbs: false }); if (pairs) MT.glyph.prompt(g, x + 8, y + 3, pairs, MT.lastInput()); else UI.text(g, t.text, x + 8, y + 4, '#7affb0'); y -= 18;
    }
  });
  UI.drawLowerThird(r); UI.drawBanners(r);
  if (MT.devBadge && MT.devBadge()) r.overlay(g => { px.rect(g, r.W / 2 - 14, r.H - 40, 28, 10, '#ff8a20'); UI.text(g, 'DEV', r.W / 2, r.H - 39, '#14081c', { align: 'center', shadow: false }); });
  // mouse reticle
  const c0 = w.cs[0]; if (c0 && c0.input && c0.intent && c0.intent.aimSrc === 'mouse' && c0.intent.mouseAt) {
    const m = r.w(c0.intent.mouseAt[0], c0.intent.mouseAt[1], 0); r.overlay(g => { px.line(g, m[0] - 5, m[1], m[0] - 2, m[1], '#ffcc33', 1); px.line(g, m[0] + 2, m[1], m[0] + 5, m[1], '#ffcc33', 1); px.line(g, m[0], m[1] - 5, m[0], m[1] - 2, '#ffcc33', 1); px.line(g, m[0], m[1] + 2, m[0], m[1] + 5, '#ffcc33', 1); px.dot(g, m[0], m[1], c0.color); });
  }
};
HUD.drawPlayer0 = function (r, c, w) { r.overlay(g => HUD.drawPlayer(g, r, c, w)); };
HUD.cursorOn = function (on) { try { const el = MT.game.screen.canvas; if (el) el.style.cursor = on ? 'none' : ''; } catch (e) { /* */ } };
