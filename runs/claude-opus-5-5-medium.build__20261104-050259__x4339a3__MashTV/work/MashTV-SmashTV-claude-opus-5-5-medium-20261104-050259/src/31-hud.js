// ---------------------------------------------------------------- the in-play HUD (screen pixels, anchored to r.W and r.H)
MT.hud = (() => {
  const F = E.font, T = MT.ui.T;
  const icons = {
    sword: g => { px.line(g, 1, 7, 7, 1, '#c8d0e0', 1); px.line(g, 1, 5, 3, 7, '#ffcc33', 1); },
    cash: g => { T(g, '$', 1, 0, '#7ad88a'); },
    gun: g => { px.rect(g, 0, 2, 7, 3, '#c8d0e0'); px.rect(g, 1, 5, 2, 3, '#5a5a6a'); },
    flame: g => { px.disc(g, 4, 5, 3, '#ff6a20'); px.disc(g, 4, 4, 1.5, '#ffcc33'); },
    star: g => { T(g, '★', 0, 0, '#ffcc33'); },
    skull: g => { px.disc(g, 4, 3.5, 3.5, '#fff7e8'); px.rect(g, 2, 6, 5, 2, '#fff7e8'); px.dot(g, 3, 3, '#000'); px.dot(g, 5, 3, '#000'); },
    key: g => { px.disc(g, 2, 4, 2, '#ffcc33'); px.rect(g, 3, 3.5, 5, 1.5, '#ffcc33'); px.dot(g, 7, 5, '#ffcc33'); }
  };
  const api = {
    roomIcon(g, x, y, id) { const f = icons[id] || icons.star; g.save && g.save(); g.translate && g.translate(Math.round(x), Math.round(y)); f(g); g.restore && g.restore(); },
    panel(g, r, c, corner, W) {
      const w = 112, h = 30, x = corner % 2 ? r.W - w - 4 : 4, y = corner >= 2 ? r.H - h - 4 : (corner === 0 ? 14 : 4);
      const cr = MT.game.cornerArea && MT.game.cornerArea(); let yy = y; if (corner === 1 && cr && cr.y1 > y) yy = Math.round(cr.y1 + 2);
      MT.ui.panel(g, x, yy, w, h, { alpha: .8, border: c.color, bg: ['#1c0e2c', '#0e0618'] });
      px.rect(g, x + 2, yy + 2, 3, h - 4, c.color);
      if (c.rig && !MT.cfg.skipRigs) c.rig.drawPortrait(g, x + 7, yy + 3, 18, { zoom: 2.6, bg: '#2a1446', tint: c.state === 'out' || c.state === 'dead' ? '#808080' : undefined });
      T(g, 'P' + (c.slot + 1) + ' ' + c.name, x + 28, yy + 3, c.color, { font: 'tiny', shadow: false });
      if (c.state === 'out') { const I = c.input || MT.game.input; T(g, 'OUT', x + 28, yy + 11, '#ff3344'); MT.glyph.prompt(g, x + 50, yy + 10, [['start', 'CONTINUE']], I); return; }
      T(g, MT.money(c.cash), x + 28, yy + 10, '#ffffff');
      const mhp = MT.maxHp(); for (let i = 0; i < mhp; i++) { const on = i < c.hp; px.rect(g, x + 28 + i * 6, yy + 21, 5, 5, on ? '#ff3344' : '#3a1a24'); if (on) px.dot(g, x + 29 + i * 6, yy + 22, '#ffaaaa'); }
      const lx = x + 30 + mhp * 6; if (!(MT.run && MT.run.mode === 'session')) { T(g, 'x' + Math.max(0, c.lives), lx, yy + 19, '#fff7e8', { shadow: false }); }
      // weapon icon and its bar, add-ons, Showstoppers
      const Wd = MT.WEAPONS[c.wpn], wx = x + w - 30;
      MT.drawCapsule(g, wx + 6, yy + 9, c.wpn === 'blaster' ? 'spread' : c.wpn, 1, 0);
      if (c.wpn === 'blaster') { px.rect(g, wx + 1, yy + 6, 10, 6, '#c8d0e0'); T(g, 'B', wx + 4, yy + 6, '#14101c', { shadow: false }); }
      else { const f = c.wpnT / (Wd.dur * MT.T.puDuration); E.ui.bar(g, wx, yy + 16, 14, 2, f, f < .2 && Math.floor(MT.game.real * 6) % 2 ? '#ffffff' : Wd.color); }
      let ax = wx + 15; for (const k in c.addons) if (c.addons[k] > 0) { px.rect(g, ax, yy + 4, 6, 6, MT.ADDONS[k].color); T(g, MT.ADDONS[k].letter, ax + 1, yy + 4, '#14101c', { font: 'tiny', shadow: false }); ax += 7; if (ax > x + w - 4) break; }
      for (let i = 0; i < c.bombs; i++) { const bx = wx + i * 7, by = yy + 21; px.disc(g, bx + 2, by + 2, 2.5, '#ffffff'); px.rect(g, bx + 1, by + 4, 3, 2, '#6a6a7a'); }
    },
    ratings(g, r, W) {
      const R = W.ratings, cx = Math.round(r.W / 2), y = 4, rad = 17;
      MT.ui.panel(g, cx - 34, y, 68, 26, { alpha: .85, border: R.prime > 0 ? '#ff2e88' : '#ffcc33' });
      for (let a = 0; a <= 20; a++) { const an = Math.PI + a / 20 * Math.PI, c = a < 4 ? '#5a5a8a' : a < 8 ? '#2ee6ff' : a < 12 ? '#22c55e' : a < 16 ? '#ffcc33' : '#ff2e88'; px.dot(g, cx + Math.cos(an) * rad, y + 22 + Math.sin(an) * rad * .9, c); }
      const an = Math.PI + R.R / 100 * Math.PI; px.line(g, cx, y + 22, cx + Math.cos(an) * (rad - 3), y + 22 + Math.sin(an) * (rad - 3) * .9, '#ffffff', 1); px.disc(g, cx, y + 22, 2, '#ff3344');
      T(g, 'RATINGS', cx, y + 2, '#2ee6ff', { align: 'center', shadow: false });
      T(g, 'x' + R.X, cx + 22, y + 12, R.prime > 0 ? '#ff2e88' : '#ffcc33', { align: 'center', scale: 1 });
      const on = R.applause > 0 || R.prime > 0 && Math.floor(MT.game.real * 6) % 2;
      px.rect(g, cx - 32, y + 11, 13, 7, on ? '#ffcc33' : '#3a2a10'); T(g, 'AP', cx - 30, y + 12, on ? '#14101c' : '#7a5a20', { font: 'tiny', shadow: false });
      if (R.prime > 0) T(g, 'PRIME TIME ' + Math.ceil(R.prime), cx, y + 30, Math.floor(MT.game.real * 6) % 2 ? '#ff2e88' : '#ffffff', { align: 'center' });
    },
    draw(r, W) {
      const g0 = MT.game;
      r.overlay(g => {
        const tn = g0.real;
        // the LIVE bug and the channel bug
        px.disc(g, 8, 7, 3, Math.floor(tn * 2) % 2 ? '#ff3344' : '#5a0a14'); T(g, 'LIVE', 13, 4, '#ffffff', { font: 'tiny' }); T(g, 'MASH 9', 34, 4, '#ffcc33', { font: 'tiny' });
        if (MT.devActive() && W.mode !== 'attract') { px.rect(g, 60, 2, 22, 9, '#ff8a20'); T(g, 'DEV', 64, 3, '#14101c', { font: 'tiny', shadow: false }); }
        W.contestants.forEach((c, i) => { if (c.state !== 'gone' && i < 4) api.panel(g, r, c, i, W); });
        api.ratings(g, r, W);
        const cx = r.W / 2;
        // keys and the room's name
        if (W.mode !== 'session') T(g, '★ ' + (MT.run ? MT.run.keys : 0) + '/9', cx + 40, 6, '#ffe060');
        if (!W.room.boss) T(g, (W.room.id.length <= 3 ? W.room.id + ' ' : '') + W.room.name, cx, W.ratings.prime > 0 ? 44 : 34, '#c8d0e0', { align: 'center', font: 'tiny' });
        if (W.mode === 'session' && MT.net && MT.net.left !== null) T(g, MT.fmtTime(MT.net.left), cx + 40, 6, '#2ee6ff');
        // the boss bar
        const B = W.boss; if (B && B.introDone) {
          const bw = Math.min(220, r.W - 140), bx = Math.round(cx - bw / 2), by = MT.lines.current ? r.H - 70 : r.H - 18;
          MT.ui.panel(g, bx - 3, by - 3, bw + 6, 16, { alpha: .85, border: '#ff3344' });
          T(g, B.name, cx, by - 1, '#ff3344', { align: 'center', font: 'tiny' });
          E.ui.bar(g, bx, by + 6, bw, 4, B.hpPct, '#ff3344');
          const al = B.parts.filter(p => p.alive).length; for (let i = 0; i < B.parts.length; i++) px.rect(g, bx + i * (bw / B.parts.length), by + 11, Math.max(1, bw / B.parts.length - 1), 1, i < al ? '#ffcc33' : '#3a2a10');
        }
        // the bottom centre: the lower third, else wave dots and door prompts
        if (MT.lines.current) MT.ui.lowerThird(g, r);
        else if (W.phase === 'waves' && W.wavesTotal > 0) { const n = W.wavesTotal; for (let i = 0; i < n; i++) px.disc(g, cx - (n - 1) * 5 + i * 10, r.H - 10, 3, i <= W.waveIdx ? '#ffcc33' : '#3a2a40'); if (W.surviveT !== undefined && W.jumboClock !== null) T(g, 'SURVIVE ' + MT.fmtTime(W.surviveT), cx, r.H - 24, '#ff3344', { align: 'center', scale: 2 }); }
        else if (W.phase === 'exit') T(g, MT.TEXT.tutorial.door, cx, r.H - 14, Math.floor(tn * 3) % 2 ? '#22ff66' : '#ffffff', { align: 'center', scale: 2 });
        MT.ui.banners(g, r);
        // tutorial prompt
        const tu = MT.tut.cur; if (tu) { const I = MT.ui.lastI(), items = (tu.actions || []).map(a => [a, '']); const w = F.width(tu.text) + MT.glyph.measure(items, I) + 24, x = cx - w / 2, y = r.H - (MT.lines.current ? 96 : 40); MT.ui.panel(g, x, y, w, 18, { alpha: .9, border: '#2ee6ff' }); const ex = MT.glyph.prompt(g, x + 6, y + 4, items, I); T(g, tu.text, ex + 2, y + 6, '#2ee6ff'); }
        // the mouse reticle
        const I = g0.input, m = I.pointer && I.pointer();
        if (m && (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard' && I.mouse && I.clock - (I.mouse.t || -9) < 2) && W.contestants[0] && W.contestants[0].ctl === 'local' && W.mode !== 'attract') {
          const [x, y] = [Math.round(m[0]), Math.round(m[1])]; px.rect(g, x - 6, y, 4, 1, '#ffcc33'); px.rect(g, x + 3, y, 4, 1, '#ffcc33'); px.rect(g, x, y - 6, 1, 4, '#ffcc33'); px.rect(g, x, y + 3, 1, 4, '#ffcc33'); px.dot(g, x, y, W.contestants[0].color);
          api.cursor(true);
        } else api.cursor(false);
      });
    },
    cursor(hide) { const cv = MT.game && MT.game.screen && MT.game.screen.canvas; if (cv && cv.style) { const v = hide ? 'none' : ''; if (cv.style.cursor !== v) cv.style.cursor = v; } }
  };
  return api;
})();
