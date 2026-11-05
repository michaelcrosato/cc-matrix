/* HUD: over the full-screen 3D view. Party cards at the bottom (live portraits, HP, food, two hand slots with cooldown
 * wipes and damage pops, statuses), the log, context prompts, the Hand, the compass, hit chevrons, the boss bar, the
 * race HUD, barks and hints; mouse helpers and hover tooltips for the mouse only. */
B.UI = { screen: null, W: 427, H: 240, t: 0, hints: [], toast: null, wheel: 0, chev: [], hover: null, bark: null, pops: [] };
B.HUD = {
  cards(W, H) {
    const P = B.S.party, n = P.formation.length || P.members.length, gap = 3, rowGap = 5;
    const cw = Math.min(68, Math.floor((W - 8 - gap * (n - 1) - rowGap * 2) / n)), ch = 46, out = [];
    const total = cw * n + gap * (n - 1) + (n > 2 ? rowGap : 0) + (n > 4 ? rowGap : 0); let x = Math.round((W - total) / 2);
    P.formation.forEach((mi, k) => { if (k && k % 2 === 0) x += rowGap; out.push({ mi, k, x, y: H - ch - 3, w: cw, h: ch }); x += cw + gap; });
    return out;
  },
  handRects(c) { const s = Math.min(15, Math.floor((c.w - 34) / 2)); return { main: [c.x + c.w - 2 * s - 4, c.y + c.h - s - 3, s, s], off: [c.x + c.w - s - 2, c.y + c.h - s - 3, s, s] }; },
  helpers(W, H, game) { const ca = game.cornerArea && game.cornerArea(), y = (ca ? Math.ceil(ca.y1) : 0) + 4; return [['map', 'Map'], ['camp', 'Camp'], ['party', 'Party'], ['journal', 'Journal']].map(([a, l], i) => ({ a, l, x: W - 4 - (4 - i) * 20, y, w: 18, h: 14 })); },
  /** the context prompts: what ✕ would do in front, and the standing ones */
  prompts(game) {
    const S = B.S, P = S.party, out = [], [fx, fy] = B.front(), f = B.featAt(P.cx, P.cy, P.dir), hand = P.hand;
    const door = B.doorIn(S.floor, fx, fy), foes = B.monsAt(fx, fy).length > 0;
    let use = null;
    if (f) use = { lever: 'Pull lever', button: 'Press', catch: 'Press stone', inscription: 'Read', alcove: hand ? 'Place' : 'Take', candle: 'Light', greatLock: 'Turn lock', gearNiche: hand ? 'Place gear' : 'Take', clockFace: 'Take', shrine: 'Pray', undergate: hand ? 'Insert' : 'Look' }[f.kind] || null;
    if (!use && door && door[1].open < .85) use = door[1].kind === 'door' || (!door[1].locked && door[1].kind === 'locked') ? 'Open' : door[1].locked && door[1].kind === 'locked' ? 'Unlock' : null;
    if (!use && hand) use = 'Stow';
    if (!use && (B.itemsAt(fx, fy).length && B.open(S.floor, fx, fy) || B.itemsAt(P.cx, P.cy).length)) use = 'Take';
    if (use) out.push(['use', use]);
    if (hand) { out.push([B.device(game) === 'gamepad' ? 'use' : 'putDown', B.device(game) === 'gamepad' ? 'Hold: put down' : 'Put down']); out.push(['throw', 'Throw']); }
    if (foes || B.FS().mons.some(m => m.hp > 0 && m.aware && B.manh(m.cx, m.cy, P.cx, P.cy) <= 3)) out.push(['strike', 'Strike']);
    if (out.length < 4) out.push(['party', 'Party']);
    if (out.length < 4) out.push(['map', 'Map']);
    return out.slice(0, 4);
  },
  draw(g, r, game) {
    const S = B.S, P = S.party, W = r.W, H = r.H, t = B.UI.t, I = game.input, dev = B.device(game);
    // the dissolve flash (an illusory wall), lightning and level-up flashes
    if (B.view && B.view.dissolveT > 0) { g.save(); g.globalAlpha = B.view.dissolveT / .22 * .7; px.rect(g, 0, 0, W, H, '#c8c0b0'); g.restore(); }
    if (B.view && B.view.flashT > 0) { g.save(); g.globalAlpha = Math.min(.6, B.view.flashT * 3); px.rect(g, 0, 0, W, H, '#e8fbff'); g.restore(); }
    // hit chevrons and the front-row vignette
    const hs = B.view && B.view.hurtSide;
    if (hs && hs.t > 0) {
      hs.t -= 1 / 60; const a = Math.min(1, hs.t / .3);
      g.save(); g.globalAlpha = a;
      if (hs.side === 'left' || hs.side === 'right') { const x = hs.side === 'left' ? 4 : W - 14; for (let k = 0; k < 3; k++) { const y = H / 2 - 20 + k * 12, d = hs.side === 'left' ? 1 : -1; px.poly(g, [[x + (d < 0 ? 10 : 0), y], [x + (d < 0 ? 0 : 10), y + 5], [x + (d < 0 ? 10 : 0), y + 10]], '#ff3a2a'); } }
      else if (hs.side === 'back') for (let k = 0; k < 3; k++) { const x = W / 2 - 20 + k * 14, y = H - 62; px.poly(g, [[x, y], [x + 6, y + 6], [x + 12, y]], '#ff3a2a'); }
      else { px.rect(g, 0, 0, W, 3, '#c8201a'); px.rect(g, 0, 0, 3, H, '#c8201a'); px.rect(g, W - 3, 0, 3, H, '#c8201a'); }
      g.restore();
    }
    // compass: the facing letter big; it changes at once on a spinner
    const cx = Math.round(W / 2);
    B.panel(g, cx - 34, 3, 68, 17, { alpha: .8, rivets: false });
    B.text(g, WAYS[(P.dir + 3) % 4], cx - 26, 8, B.COL.dim); B.text(g, WAYS[(P.dir + 1) % 4], cx + 22, 8, B.COL.dim);
    E.font.text(g, WAYS[P.dir], cx - (B.tw(WAYS[P.dir], { scale: 2 }) >> 1), 5, B.COL.focus, { scale: 2, shadow: '#000', outline: false });
    // the floor's name on arrival
    if (B.UI.toast && t - B.UI.toast.t < 3 && S.mode !== 'attract') { B.text(g, B.UI.toast.text, 6, 6, B.COL.focus); }
    // the boss bar
    const bm = S.floor === 'f4' && B.bossMon();
    if (bm && bm.boss.phase && bm.hp > 0) {
      const bw = Math.min(200, W - 120), bx = cx - bw / 2;
      B.text(g, 'THE BOLT-HOLDER', cx, 24, '#ffd36a', { align: 'center' });
      E.ui.bar(g, bx, 33, bw, 6, bm.hp / bm.max, bm.boss.phase === 1 ? '#8a6a4a' : '#e0463c');
      bm.boss.locks.forEach((on, i) => { const x = bx + bw + 6 + i * 9; px.rect(g, x, 32, 7, 8, on ? '#6ae8ff' : '#4a4e58'); if (bm.boss.relock === i) px.rect(g, x, 30, 7, 1, '#ff4a3a'); });
      if (bm.boss.phase === 1) B.text(g, 'CAGED', bx - 32, 33, '#a89878');
    }
    // the race HUD
    if (S.race) B.HUD.raceDraw(g, W, H, game);
    // the cards
    const cards = this.cards(W, H);
    cards.forEach((c, k) => {
      const m = P.members[c.mi]; if (!m) return;
      const sel = c.mi === P.selected, hurtT = m.hurt !== undefined ? S.time - m.hurt : 9, shake = hurtT < .25 ? Math.round(Math.sin(hurtT * 80) * 2) : 0;
      const x = c.x + shake, y = c.y;
      if (k % 2 === 0 && (k === 0 || k === 2 || k === 4)) B.text(g, ['FRONT', 'MID', 'BACK'][k / 2], x + 1, y - 8, '#8a7a5a', { font: 'tiny' });
      B.panel(g, x, y, c.w, c.h, { alpha: .9, border: sel ? B.COL.focus : B.COL.border, bg: hurtT < .3 ? ['#5a1a14', '#2a0a08'] : undefined, rivets: false });
      if (sel) B.focusFrame(g, x, y, c.w, c.h, t);
      const rig = B.memberRig(m);
      const ps = Math.min(26, c.w - 36);
      rig.drawPortrait(g, x + 2, y + 2, ps, { zoom: 2.4, turn: .35, bg: '#2a2218', tint: m.state === 'ok' ? undefined : '#707070' });
      if (m.state === 'dead') { px.rect(g, x + 2, y + 2, ps, ps, '#2a2420'); B.drawIcon(g, { id: 'bone' }, x + 2 + (ps - 12) / 2, y + 2 + (ps - 12) / 2); }
      else if (m.state === 'down') B.text(g, 'DOWN', x + 2 + ps / 2, y + ps / 2 - 2, B.COL.bad, { align: 'center', font: 'tiny' });
      if (m.lvlFlash && S.time - m.lvlFlash < 1.5) { g.save(); g.globalAlpha = .5 * (1 - (S.time - m.lvlFlash) / 1.5); px.rect(g, x + 2, y + 2, ps, ps, '#ffd36a'); g.restore(); }
      px.rect(g, x + 2, y + 3 + ps, ps, 2, '#2a2218'); px.rect(g, x + 2, y + 3 + ps, Math.round(ps * m.food / 100), 2, m.food < 25 ? B.COL.bad : B.COL.food);
      const nx = x + ps + 5, nw = c.w - ps - 7;
      B.text(g, B.cut(m.name, nw), nx, y + 3, m.state === 'ok' ? B.COL.text : '#8a8070');
      E.ui.bar(g, nx, y + 12, nw, 4, m.hp / m.max, B.COL.hp);
      B.text(g, m.hp + '/' + m.max, nx, y + 18, '#c8b8a0', { font: 'tiny' });
      if (m.ward > 0) B.text(g, 'W', nx + nw - 4, y + 18, '#e8c050', { font: 'tiny' });
      // statuses
      const st = []; if (m.status.poison > 0) st.push('#4ae070'); if (m.status.held > 0) st.push('#ffd36a'); if (m.food <= 25) st.push('#c8a040'); if (m.status.brace > 0) st.push('#a8a8b8'); if (P.fx.steady > 0) st.push('#ffe8a0'); if (P.fx.freeHinge > 0) st.push('#ff8ad8');
      st.slice(0, 4).forEach((col, i) => { px.rect(g, x + 2 + i * 7, y + c.h - 9, 6, 6, '#14100c'); px.rect(g, x + 3 + i * 7, y + c.h - 8, 4, 4, col); });
      // the two hands
      const hr = this.handRects(c);
      for (const h of ['main', 'off']) {
        const [hx, hy, hw, hh] = hr[h]; const it = m.slots[h], locked = B.handLocked(m, h);
        px.rect(g, hx + shake, hy, hw, hh, '#0e0c0a'); px.rect(g, hx + 1 + shake, hy + 1, hw - 2, hh - 2, locked ? '#2a2420' : '#2e2a24');
        if (it && !locked) B.drawIcon(g, it, hx + shake + Math.floor((hw - 12) / 2), hy + Math.floor((hh - 12) / 2));
        else if (!it && !locked) px.rect(g, hx + 5 + shake, hy + 5, hw - 10, hh - 10, '#4a4238');
        const cd = m.coolMax[h] ? m.cool[h] / m.coolMax[h] : 0;
        if (cd > 0 || m.state !== 'ok') { g.save(); g.globalAlpha = .7; const ch2 = m.state === 'ok' ? Math.ceil(hh * cd) : hh; px.rect(g, hx + shake, hy + hh - ch2, hw, ch2, '#000'); g.restore(); }
        else if (m.cool[h] === 0 && m.pop[h] && S.time - (m.pop[h].t || 0) < .9) { /* the pop shows */ }
        if (sel && dev === 'gamepad') B.glyph(g, game, h === 'main' ? 'handMain' : 'handOff', hx + shake + (hw - 11) / 2, hy - 11);
        const pop = m.pop[h];
        if (pop && S.time - pop.t < .9) { const u = (S.time - pop.t) / .9; B.text(g, pop.text, hx + hw / 2 + shake, hy - 4 - u * 8, pop.color, { align: 'center', font: pop.text.length > 4 ? 'tiny' : undefined }); }
      }
    });
    // the log: the three newest lines, fading after 8 s
    const lines = S.log.slice(-3), ly = H - 52 - 12 * 3;
    lines.forEach((l, i) => { const age = S.time - l.t; if (age > 8 && !S.camp) return; g.save(); g.globalAlpha = age > 7 ? Math.max(0, 8 - age) : 1; B.text(g, B.cut(l.text, Math.min(260, W * .62)), 6, ly + i * 11, l.color || B.COL.text); g.restore(); });
    // the Hand
    if (P.hand && !(dev === 'mouse' && I.pointer())) { const hx = cx - 40, hy = H - 66; B.panel(g, hx, hy, 80, 15, { alpha: .85, rivets: false }); B.drawIcon(g, P.hand, hx + 2, hy + 2); B.text(g, B.cut(B.itemName(P.hand), 62), hx + 16, hy + 4, B.COL.focus); }
    else if (P.hand && dev === 'mouse') { const p = I.pointer(); if (p) { B.drawIcon(g, P.hand, p[0] + 4, p[1] + 4); } }
    // prompts (not for the mouse: it has hover tooltips)
    if (dev !== 'mouse' && !S.talk) B.prompts(g, game, this.prompts(game), W - 6, H - 67, 'right');
    // mouse helpers and the hover tooltip
    if (dev === 'mouse') {
      for (const hb of this.helpers(W, H, game)) { const on = B.UI.hoverHelper === hb.a; B.panel(g, hb.x, hb.y, hb.w, hb.h, { alpha: .8, rivets: false, border: on ? B.COL.focus : B.COL.border }); B.text(g, hb.l[0], hb.x + 6, hb.y + 4, on ? B.COL.focus : B.COL.text); if (on) B.text(g, hb.l, hb.x + hb.w / 2, hb.y + hb.h + 3, B.COL.focus, { align: 'center' }); }
      const hv = B.UI.hover;
      if (hv) { px.rect(g, hv.x - 10, hv.y - 10, 20, 1, B.COL.focus); px.rect(g, hv.x - 10, hv.y + 10, 20, 1, B.COL.focus); px.rect(g, hv.x - 10, hv.y - 10, 1, 20, B.COL.focus); px.rect(g, hv.x + 10, hv.y - 10, 1, 21, B.COL.focus); B.text(g, hv.label + ' — click to ' + (hv.kind === 'monster' ? 'strike' : hv.kind === 'item' ? 'take' : 'use'), hv.x, hv.y + 14, B.COL.focus, { align: 'center' }); }
    }
    // barks (non-modal lines) and hints
    const bk = S.barks[S.barks.length - 1];
    if (bk) { const st = B.STORIES[bk.id], sp = B.SPEAKERS[st.lines[0][0]]; const text = st.lines[0][1], bw = Math.min(W - 40, B.tw(text) + 16); B.panel(g, cx - bw / 2, 44, bw, 24, { alpha: .88 }); B.text(g, sp.name.toUpperCase(), cx, 47, B.COL.focus, { align: 'center', font: 'tiny' }); B.text(g, B.cut(text, bw - 10), cx, 55, B.COL.text, { align: 'center' }); }
    const hint = B.UI.hints[0];
    if (hint && !S.talk) {
      const age = B.UI.t - hint.t; if (age > 7) B.UI.hints.shift();
      else { const text = B.HINTS[hint.id] || hint.id, w = Math.min(W - 30, B.tw(B.fillGlyphs(game, text)) + 40); B.panel(g, cx - w / 2, 74, w, 18, { alpha: .9 }); B.glyphText(g, game, text, cx, 79, '#fff6d8', 'center'); }
    }
    // Great Lock turning
    if (P.lock > 0) { const w = 120; B.panel(g, cx - w / 2, H / 2 - 12, w, 22, { alpha: .9 }); B.text(g, 'TURNING THE GREAT LOCK', cx, H / 2 - 9, B.COL.focus, { align: 'center', font: 'tiny' }); E.ui.bar(g, cx - 50, H / 2 + 1, 100, 4, 1 - P.lock / 2, '#6ae8ff'); }
    if ((B.CHEATS.god || B.CHEATS.noclip || B.CHEATS.oneHit) && S.mode !== 'attract') B.text(g, 'CHEATS', 6, 18, '#ff8a3a', { font: 'tiny' });
  },
  raceDraw(g, W, H, game) {
    const R = B.S.race; B.panel(g, 4, 22, 96, 30, { alpha: .85, rivets: false });
    B.text(g, B.fmtTime(R.t), 9, 26, B.COL.focus, { scale: 1 }); B.text(g, 'Crowns ' + R.crowns + '/6', 9, 37, '#e8c050', { font: 'tiny' }); B.text(g, B.cut(R.label, 46), 52, 37, B.COL.dim, { font: 'tiny' });
    const st = B.Hub && B.Hub.standings && B.Hub.standings(); if (st) st.forEach((s, i) => { B.text(g, B.cut(s.name, 60) + '  ' + s.score, 8, 56 + i * 9, s.color, { font: 'tiny' }); });
    if (B.Race && B.Race.best) B.text(g, 'Best ' + B.fmtTime(B.Race.best.t), 9, 46 + (st ? 0 : 8), '#a89878', { font: 'tiny' });
  },
  /** mouse in play: a click on a hand slot uses it, a portrait selects (right click opens it), the view uses what is under the pointer */
  click(game, cl, button) {
    const S = B.S, P = S.party, W = B.UI.W, H = B.UI.H;
    for (const hb of this.helpers(W, H, game)) if (B.device(game) === 'mouse' && cl[0] >= hb.x && cl[0] < hb.x + hb.w && cl[1] >= hb.y && cl[1] < hb.y + hb.h) { B.Play.openFromKey(hb.a); return []; }
    for (const c of this.cards(W, H)) {
      if (cl[0] < c.x || cl[0] >= c.x + c.w || cl[1] < c.y || cl[1] >= c.y + c.h) continue;
      const hr = this.handRects(c);
      for (const h of ['main', 'off']) { const [x, y, w, hh] = hr[h]; if (cl[0] >= x && cl[0] < x + w && cl[1] >= y && cl[1] < y + hh) return [{ c: 'select', m: c.mi }, { c: 'hand', m: c.mi, h }]; }
      if (button === 2) { B.Play.openScreen('party', { m: c.mi }); return []; }
      return [{ c: 'select', m: c.mi }];
    }
    if (cl[1] > H - 52) return [];
    if (button === 2) return [{ c: 'strike' }];
    const hv = B.view && B.view.pick(cl[0], cl[1]);
    if (P.hand && !hv) return [{ c: cl[1] > H * .55 ? 'putDown' : 'throw' }];
    if (hv) return hv.kind === 'monster' ? [{ c: 'strike' }] : [{ c: 'use' }];
    return [];
  }
};
