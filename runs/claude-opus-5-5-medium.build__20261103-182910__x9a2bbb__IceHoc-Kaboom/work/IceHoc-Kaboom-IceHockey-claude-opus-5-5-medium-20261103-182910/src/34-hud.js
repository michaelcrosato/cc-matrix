/* ---- Hud: the score bug, BOOM meters, power play, player markers, radar, prompts, banners, the fight HUD, lower-thirds (PLAN 7.18) ---- */
const Hud = (() => {
  const GOLD = '#ffd36a';
  let lower = null, gloveT = 0;
  Bus.on('whistle', () => { if (!M || M.attract) return; lower = { t: 0, life: 3 }; });
  const safe = r => ({ x0: Math.round(r.W * .04), y0: Math.round(r.H * .04), x1: Math.round(r.W * .96), y1: Math.round(r.H * .96) });
  function logoChip(g, team, x, y, size = 12) { const t = M.teams[team], spr = LOGOS.sprite(t.logo); if (spr) px.sprite(g, spr, x, y, { scale: size / 24 }); }
  /** world-space markers: the ring under each human, chevrons, P-tags, turbo, the shot meter, chirp bubbles, items */
  function world(r) {
    if (!M) return;
    for (const h of M.humans) {
      const s = h.s; if (!s || s.off || s.state === 'bin') continue;
      const col = h.color || E.PLAYER_COLORS[h.i] || GOLD;
      r.decal(g => { r.groundRing && r.groundRing(s.x, s.y, 9, col, .9); });
      r.queue(s.x, s.y, 46, g => {
        const [x, y] = r.w(s.x, s.y, 44 + (s.def.build === 'bulky' ? 4 : 0)), X = Math.round(x), Y = Math.round(y);
        px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], col); px.poly(g, [[X - 2, Y - 4], [X + 2, Y - 4], [X, Y - 1]], '#ffffff');
        E.font.text(g, h.tag || ('P' + (h.i + 1)), X, Y - 14, col, { align: 'center', outline: '#000' });
        px.rect(g, X - 8, Y + 2, 16, 2, '#101418'); px.rect(g, X - 8, Y + 2, Math.round(16 * s.turbo), 2, s.items.hotsauce > 0 || M.kaboomT[s.team] > 0 ? '#ff7a2a' : '#5ad0ff');
        if (s.winding) { const full = s.charge >= .95; E.ui.bar(g, X - 12, Y - 22, 24, 4, s.charge, full ? (M.kaboomT[s.team] > 0 ? '#ff4a1a' : GOLD) : '#e8e8f0'); }
      }, { emissive: true });
      if (h.reticle && !h.remote) r.decal(g => { const [x, y] = r.w(h.reticle[0], h.reticle[1], 0), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 4, Y, 3, 1, col); px.rect(g, X + 2, Y, 3, 1, col); px.rect(g, X, Y - 3, 1, 2, col); px.rect(g, X, Y + 2, 1, 2, col); });
    }
    for (const s of M.skaters) {
      if (s.chirpT > 0 && !s.off) r.queue(s.x, s.y, 60, g => {
        const [x, y] = r.w(s.x, s.y, 52), lines = E.font.wrap(s.chirpText, 96, {}), w = Math.max(...lines.map(l => E.font.width(l))) + 8, h = lines.length * 9 + 6, X = Math.round(x - w / 2), Y = Math.round(y - h - 6);
        px.rect(g, X, Y, w, h, '#ffffff'); px.rect(g, X, Y, w, 1, '#c8c8d0'); px.poly(g, [[x - 3, Y + h], [x + 3, Y + h], [x, Y + h + 5]], '#ffffff');
        lines.forEach((l, i) => E.font.text(g, l, X + 4, Y + 3 + i * 9, '#1a1a22', { outline: false }));
      });
      const icons = Object.keys(s.items).filter(k => s.items[k] > 0 && ITEMS[k]);
      if (icons.length && !s.off) r.queue(s.x, s.y, 50, g => { const [x, y] = r.w(s.x, s.y, 50); icons.forEach((k, i) => { const X = Math.round(x - icons.length * 4 + i * 8), Y = Math.round(y - 4); px.disc(g, X + 3, Y + 3, 3, '#101418'); px.disc(g, X + 3, Y + 3, 2, ITEMS[k].color); }); }, { emissive: true });
    }
  }
  function scoreBug(g, r) {
    const W = 216, x = Math.round(r.W / 2 - W / 2), sf = safe(r), y = sf.y0 - 4;
    UI.panel(g, x, y, W, 30, { alpha: .9 });
    for (const t of [0, 1]) {
      const tm = M.teams[t], bx = t ? x + W - 92 : x + 4;
      px.rect(g, bx, y + 3, 88, 16, t === 0 ? tm.dark : tm.light); px.rect(g, bx, y + 18, 88, 1, tm.trim);
      logoChip(g, t, bx + (t ? 70 : 2), y + 3, 16);
      E.font.text(g, tm.abbr, bx + (t ? 8 : 22), y + 7, t === 0 ? '#ffffff' : '#141418', { outline: false });
      E.font.text(g, String(M.score[t]), bx + (t ? 50 : 50), y + 4, t === 0 ? '#ffffff' : '#141418', { scale: 2, outline: false, align: 'center' });
      // the BOOM meter: flames and a countdown in KABOOM
      const mx = bx + 4, my = y + 22, kb = M.kaboomT[t] > 0;
      px.rect(g, mx, my, 80, 5, '#0a0c12'); px.rect(g, mx, my + 1, Math.round(80 * (kb ? M.kaboomT[t] / T.kaboomTime : M.boom[t] / 100)), 3, kb ? (Math.floor(M.t * 10) % 2 ? '#ff4a1a' : '#ffd040') : M.boom[t] > 80 ? '#ffb347' : '#e8682a');
      if (kb) E.font.text(g, 'KABOOM ' + Math.ceil(M.kaboomT[t]), mx + 40, my - 1, '#ffffff', { font: 'tiny', align: 'center', outline: '#000' });
    }
    const per = M.so ? 'SO' : M.ot ? 'OT' : ['1ST', '2ND', '3RD', '4TH', '5TH'][M.period - 1] || '';
    E.font.text(g, per, r.W / 2, y + 4, GOLD, { align: 'center', outline: false });
    E.font.text(g, M.so ? '' : U.mmss(M.clock), r.W / 2, y + 13, M.clock < 10 && M.phase === 'play' ? '#ff6a5a' : '#ffffff', { align: 'center', outline: false });
    let py = y + 32;
    if (M.sinBin.length) for (const b of M.sinBin) {
      const t = 1 - b.s.team, txt = 'POWER PLAY ' + M.teams[t].abbr + '  ' + U.mmss(b.t) + '  (' + b.s.name + ')';
      const w = E.font.width(txt) + 12; UI.panel(g, r.W / 2 - w / 2, py, w, 12, { border: '#5a8ae8', alpha: .9 }); E.font.text(g, txt, r.W / 2, py + 3, '#c8e0ff', { align: 'center', outline: false }); py += 14;
    }
    return py;
  }
  function radar(g, r) {
    const w = 84, h = 38, sf = safe(r), x0 = sf.x1 - w, y0 = sf.y1 - h - (Talk.box.open ? 46 : 0), k = w / (Rink.X1 - Rink.X0 + 20);
    UI.panel(g, x0 - 2, y0 - 2, w + 4, h + 4, { alpha: .55, bg: ['#0a1828', '#081018'] });
    const mx = x => Math.round(x0 + (x - Rink.X0 + 10) * k), my = y => Math.round(y0 + (y - Rink.Y0 + 10) * k * 1.05);
    px.rect(g, mx(Rink.C.x), my(Rink.Y0), 1, Math.round((Rink.Y1 - Rink.Y0) * k * 1.05), '#a03030');
    for (const d of [-108, 108]) px.rect(g, mx(Rink.C.x + d), my(Rink.Y0), 1, Math.round((Rink.Y1 - Rink.Y0) * k * 1.05), '#3050a0');
    for (const side of [0, 1]) px.rect(g, mx(Rink.goalX(side)) - 1, my(Rink.C.y) - 2, 2, 4, '#e0e0e0');
    for (const s of M.skaters) { if (s.off || s.state === 'bin') continue; const c = s.team === 0 ? M.teams[0].dark : M.teams[1].light; if (s.human) { px.disc(g, mx(s.x), my(s.y), 2.5, s.human.color || GOLD); } px.rect(g, mx(s.x) - 1, my(s.y) - 1, 3, 3, c); }
    px.rect(g, mx(M.puck.x), my(M.puck.y), 1, 1, '#ffffff');
  }
  function prompts(g, r, y) {
    const sf = safe(r);
    let text = null;
    const p = M.puck;
    for (const h of M.humans) {
      const s = h.s; if (!s || h.remote) continue;
      if (M.challenge && M.challenge.to === s) text = 'HOLD {lob} TO ACCEPT  (' + Math.ceil(M.challenge.t) + ')';
      else if (p.passTo === s && !p.owner && M.phase === 'play') text = '{shoot} ONE-TIMER!';
      else if (M.phase === 'play' && p.owner !== s && Skater.free(s)) {
        const riv = M.skaters.find(o => o.team !== s.team && Skater.free(o) && Math.hypot(o.x - s.x, o.y - s.y) < 40 && Math.max(o.grudge[s.id] || 0, s.grudge[o.id] || 0) >= T.fightGrudge);
        if (riv && M.fights < T.fightMax) { text = 'HOLD {lob}  DROP THE GLOVES'; if ((gloveT += 1) === 1) Bus.emit('gloves_prompt', {}); }
      }
    }
    if (M.phase === 'replay') text = '{pass} SKIP';
    if (M.phase === 'intro') text = '{pass} SKIP';
    if (M.phase === 'faceoff' && M.humans.some(h => !h.remote)) text = M.phaseT < M.foDrop ? 'FACEOFF: {pass} AS THE PUCK DROPS' : '{pass} NOW!';
    if (M.phase === 'intermission') text = '{pass} DRIVE THE FLOOD WAGON    {deke} SKIP';
    if (text) { const yy = Talk.box.open ? sf.y1 - 64 : sf.y1 - 22, w = Glyphs.text(null, text, 0, 0) + 16; UI.panel(g, r.W / 2 - w / 2, yy - 5, w, 17, { alpha: .88, border: GOLD }); Glyphs.text(g, text, r.W / 2, yy, '#ffffff', { align: 'center' }); }
    // off-screen arrows for humans
    for (const h of M.humans) {
      const s = h.s; if (!s || h.remote || s.off) continue;
      const [x, y2] = r.w(s.x, s.y, 20); if (x > 6 && x < r.W - 6 && y2 > 6 && y2 < r.H - 6) continue;
      const X = clamp(x, 10, r.W - 10), Y = clamp(y2, 10, r.H - 10), a = Math.atan2(y2 - Y, x - X), col = h.color || GOLD;
      px.poly(g, [[X + Math.cos(a) * 6, Y + Math.sin(a) * 6], [X + Math.cos(a + 2.4) * 5, Y + Math.sin(a + 2.4) * 5], [X + Math.cos(a - 2.4) * 5, Y + Math.sin(a - 2.4) * 5]], col);
    }
  }
  function bannerDraw(g, r) {
    const b = Fx.banner; if (!b) return;
    const rm = S().motion === false || S().reduceMotion, k = Math.min(1, b.t * 6), sh = rm ? 0 : Math.max(0, .3 - b.t) * 10, sc = b.text.length > 7 ? 3 : 4;
    const y = Math.round(r.H * .3 + (rm ? 0 : (1 - k) * -30)), dx = Math.round(Math.sin(b.t * 60) * sh);
    UI.title(g, b.text, r.W / 2 + dx, y, sc, b.colors);
    if (b.sub) UI.text(g, b.sub, r.W / 2, y + sc * 9 + 4, '#ffffff', { align: 'center', scale: 1 });
  }
  function fightHud(g, r) {
    const F = M.fight; if (!F) return;
    const sf = safe(r);
    [F.a, F.b].forEach((f, i) => {
      const x = i ? sf.x1 - 110 : sf.x0, y = sf.y0 + 34, s = f.s;
      UI.panel(g, x, y, 110, 44, { border: s.team === 0 ? M.teams[0].trim : M.teams[1].dark });
      s.rig.drawPortrait(g, i ? x + 72 : x + 4, y + 4, 34, { zoom: 2.6, turn: i ? -.5 : .5, bg: '#101420' });
      const bx = i ? x + 4 : x + 42;
      E.font.text(g, s.name.toUpperCase().slice(0, 11), bx, y + 5, '#ffffff', { outline: false });
      E.font.text(g, 'BAL', bx, y + 16, '#9fb0c8', { font: 'tiny', outline: false }); E.ui.bar(g, bx + 14, y + 16, 50, 5, Math.max(0, f.bal / T.fightBalance), '#ff5a4a');
      E.font.text(g, 'STA', bx, y + 25, '#9fb0c8', { font: 'tiny', outline: false }); E.ui.bar(g, bx + 14, y + 25, 50, 5, Math.max(0, f.sta / 100), '#5ad0ff');
      if (f.blind > 0) E.font.text(g, 'BLIND!', bx, y + 34, '#ffd040', { font: 'tiny', outline: false });
    });
    const human = [F.a, F.b].find(f => f.s.human && !f.s.human.remote);
    if (human) { const t = '{pass} JAB   {shoot} HAYMAKER   {deke} DUCK   {lob} YANK'; Glyphs.text(g, t, r.W / 2, safe(r).y1 - 22, '#ffffff', { align: 'center', input: human.s.human.input }); }
  }
  function shootoutHud(g, r) {
    const so = M.so; if (!so) return; const sf = safe(r), y = sf.y0 + 34;
    [0, 1].forEach(t => {
      const x = Math.round(r.W / 2 + (t ? 20 : -20 - 5 * 12)), res = so.results[t];
      for (let i = 0; i < Math.max(3, res.length); i++) { const v = res[i]; px.rect(g, x + i * 12, y, 10, 10, '#101418'); if (v === true) E.font.text(g, '✓'.replace('✓', 'O'), x + i * 12 + 5, y + 2, '#5ae05a', { align: 'center', outline: false }); else if (v === false) E.font.text(g, 'X', x + i * 12 + 5, y + 2, '#ff5a4a', { align: 'center', outline: false }); }
      E.font.text(g, M.teams[t].abbr, x + (t ? 64 : -22), y + 2, '#ffffff', { outline: false });
    });
    if (so.state === 'go') {
      const gl = M.goalies[1 - so.team];
      if (gl.manual && gl.human && !gl.human.remote) Glyphs.text(g, 'IN NET: {pass} BUTTERFLY  {shoot} POKE  {deke} DIVE', r.W / 2, sf.y1 - 22, '#ffffff', { align: 'center', input: gl.human.input });
      E.font.text(g, String(Math.max(0, Math.ceil(8 - so.t))), r.W / 2, y + 14, '#ffd36a', { align: 'center', scale: 2, outline: false });
    }
  }
  function lowerThird(g, r, dt) {
    if (!lower) return; lower.t += dt; if (lower.t > lower.life) { lower = null; return; }
    const sf = safe(r), w = 210, x = sf.x0, y = sf.y1 - 60 - (Talk.box.open ? 46 : 0), a = Math.min(1, lower.t * 5, (lower.life - lower.t) * 5);
    if (a <= 0) return;
    UI.panel(g, x - (1 - a) * 220, y, w, 40, { border: GOLD });
    const fo = M.fo[0] + M.fo[1], row = (lab, h, aw) => lab.padEnd(10) ;
    const X = x - (1 - a) * 220 + 6;
    E.font.text(g, M.teams[0].abbr, X + 70, y + 4, '#ffffff', { outline: false }); E.font.text(g, M.teams[1].abbr, X + 130, y + 4, '#ffffff', { outline: false });
    [['SHOTS', M.shots], ['HITS', M.hits], ['FACEOFFS', fo ? [Math.round(M.fo[0] / fo * 100) + '%', Math.round(M.fo[1] / fo * 100) + '%'] : ['-', '-']]].forEach(([lab, v], i) => {
      E.font.text(g, lab, X, y + 13 + i * 9, '#9fb0c8', { outline: false }); E.font.text(g, String(v[0]), X + 76, y + 13 + i * 9, '#ffffff', { outline: false, align: 'center' }); E.font.text(g, String(v[1]), X + 136, y + 13 + i * 9, '#ffffff', { outline: false, align: 'center' });
    });
    void row;
  }
  function tipBanner(g, r, y) {
    const tip = Talk.tip; if (!tip) return;
    const w = Math.min(r.W - 40, Glyphs.text(null, tip, 0, 0) + 54), x = Math.round(r.W / 2 - w / 2);
    UI.panel(g, x, y, w, 20, { border: '#c86ab0', alpha: .92 });
    Rigs.cast('marge').rig.drawPortrait(g, x + 3, y + 2, 16, { zoom: 1.8, turn: .4, bg: '#20142a' });
    Glyphs.text(g, tip, x + 24, y + 6, '#ffffff', {});
  }
  function draw(r, dt) {
    if (!M || M.hideHud) return;
    r.overlay(g => {
      if (M.phase === 'replay') {
        px.rect(g, 0, 0, r.W, 22, '#000000'); px.rect(g, 0, r.H - 22, r.W, 22, '#000000');
        const sf = safe(r); UI.panel(g, sf.x0, 26, 66, 16, { border: '#ff4a4a' }); E.font.text(g, 'REPLAY', sf.x0 + 33, 30, Math.floor(M.t * 3) % 2 ? '#ff6a5a' : '#ffffff', { align: 'center', outline: false });
        prompts(g, r); return;
      }
      if (M.attractHud) return;
      const y = scoreBug(g, r);
      tipBanner(g, r, y + 2);
      if (M.phase !== 'fight' && M.phase !== 'intro') radar(g, r);
      fightHud(g, r); shootoutHud(g, r); lowerThird(g, r, dt || 1 / 60);
      prompts(g, r, y);
      bannerDraw(g, r);
      if (M.phase === 'intro' && M.skaters[M.introI]) {
        const s = M.skaters[M.introI], sf = safe(r), w = 200;
        UI.panel(g, r.W / 2 - w / 2, sf.y1 - 70, w, 34, { border: M.teams[s.team].trim });
        UI.text(g, '#' + s.def.num + '  ' + s.def.name.toUpperCase(), r.W / 2, sf.y1 - 64, '#ffffff', { align: 'center' });
        UI.text(g, (s.def.role === 'C' ? 'CENTER' : s.def.role === 'D' ? 'DEFENSE' : 'WING') + '  ·  ' + M.teams[s.team].name.toUpperCase(), r.W / 2, sf.y1 - 52, '#9fb0c8', { align: 'center' });
      }
    });
  }
  return { world, draw, safe, logoChip };
})();
