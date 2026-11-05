/* ---- HUD (7.18): the score bug, the BOOM meters, the power play strip, player markers (rings, chevrons, P-tags, turbo,
 * off-screen arrows), the shot meter, the radar, context prompts, banners, the fight HUD, lower-thirds, the replay bug,
 * shootout marks, chirp bubbles and item timers. Clear of game.cornerArea() and inside a 92% title-safe area ---- */
const Hud = (() => {
  let banner = null, lower = null;
  const PER = p => p > 3 ? 'OT' : U.ord(p);
  function show(text, o = {}) { banner = Object.assign({ text, t: o.t || 1.8, max: o.t || 1.8, colors: o.colors || ['#ffffff', '#ffe08a', '#ffb347', '#e0662a'], scale: o.scale || 4, sub: o.sub || null }, o); }
  function lowerThird(lines, t = 3) { lower = { lines, t }; }
  function wire() {
    const M = () => Match.m;
    Bus.on('goal', e => { if (e.so) { show('GOAL!', { t: 1.6, scale: 3 }); return; } const m = M(); if (!m) return; const s = m.byId(e.by), as = (e.assists || []).map(id => m.byId(id)).filter(Boolean).map(a => a.def.name); show(e.kind === 'kaboom' ? 'KA-BOOM GOAL!' : 'GOAL!', { t: 2.8, sub: s ? s.def.name + (as.length ? '  (' + as.join(', ') + ')' : '') : '', colors: [m.teams[e.team].def.light, m.teams[e.team].def.trim, '#ffb347', m.teams[e.team].def.dark] }); });
    Bus.on('save', e => { if (e.kind === 'glove' && e.freeze && RNG.fx() < .5) show('SAVE!', { t: .9, scale: 2 }); });
    Bus.on('post', e => show(e.bar ? 'CROSSBAR!' : 'POST!', { t: .9, scale: 2, colors: ['#ffffff', '#d8e0e8', '#a8b0b8'] }));
    Bus.on('hit', e => { if (e.big) show('BIG HIT!', { t: .9, scale: 3, colors: ['#ffffff', '#ffd0a0', '#ff7a3a'] }); });
    Bus.on('glass', e => { if (e.state === 'shattered') show('THROUGH THE GLASS!', { t: 1.4, scale: 2, colors: ['#ffffff', '#cfe8ff', '#7ab8ff'] }); });
    Bus.on('kaboom_start', e => { const m = M(); show(e.gilded ? 'GILDED MODE!' : 'KA-BOOM!', { t: 2, scale: 5, colors: e.gilded ? ['#fff8c0', '#ffd84a', '#d9a520', '#8a5a10'] : ['#ffffff', '#ffe08a', '#ff8a3a', '#c82a1a'], sub: m ? m.teams[e.team].def.short + ' GO KABOOM' : '' }); });
    Bus.on('fight_start', () => show('FIGHT!', { t: 1.2, scale: 4, colors: ['#ffffff', '#ffb0a0', '#ff4a3a', '#8a1a1a'] }));
    Bus.on('sin_bin', e => show('POWER PLAY', { t: 1.6, scale: 3, colors: ['#ffffff', '#ffe08a', '#ffb347'] }));
    Bus.on('hat_trick', () => show('HAT TRICK!', { t: 2.2, scale: 4 }));
    Bus.on('period_start', e => show(PER(e.n) + ' PERIOD', { t: 1.6, scale: 3 }));
    Bus.on('ot_start', () => show('OVERTIME', { t: 1.8, scale: 4, sub: 'NEXT GOAL WINS' }));
    Bus.on('shootout_start', () => show('SHOOTOUT', { t: 2, scale: 4 }));
    Bus.on('final', e => { const m = M(); show('FINAL', { t: 3, scale: 4, sub: m ? m.teams[0].def.abbr + ' ' + e.score[0] + ' - ' + e.score[1] + ' ' + m.teams[1].def.abbr : '' }); });
    Bus.on('mascot_down', () => show('MASCOT DOWN!', { t: 1.4, scale: 3 }));
    Bus.on('vault_cracked', () => show('THE VAULT IS CRACKED!', { t: 2, scale: 2, colors: ['#fff8c0', '#ffd84a', '#d9a520'] }));
    Bus.on('vault_locked', () => show('VAULT LOCKED', { t: 1.2, scale: 2, colors: ['#e8e8e8', '#a8a8a8', '#686868'] }));
    Bus.on('turtle', () => show('TURTLE!', { t: 1, scale: 3, colors: ['#c8ffc8', '#7ad87a', '#3a8a3a'] }));
    Bus.on('thin_ice_break', () => show('SPLASH!', { t: 1, scale: 3, colors: ['#ffffff', '#cfe8ff', '#5a8ab8'] }));
    Bus.on('stoppage', e => { const m = M(); if (!m || e.why === 'fight') return; const a = m.teams[0], b = m.teams[1], fo = m.stats.faceoffs, tot = fo[0] + fo[1] || 1; lowerThird([a.def.abbr + '  SHOTS ' + a.shots + '  HITS ' + a.hits + '  FO ' + Math.round(fo[0] / tot * 100) + '%', b.def.abbr + '  SHOTS ' + b.shots + '  HITS ' + b.hits + '  FO ' + Math.round(fo[1] / tot * 100) + '%']); });
    Bus.on('item', e => { const m = M(); const s = m && m.byId(e.by); if (s && s.ctrl.kind !== 'cpu') UI.toast(ITEM_DEFS[e.kind].name + ': ' + ITEM_DEFS[e.kind].text, ITEM_DEFS[e.kind].color); });
    Bus.on('hoser_hat_trick', e => { const m = M(); const s = m && m.byId(e.by); UI.toast('HOSER HAT TRICK! ' + (s ? s.def.name : ''), '#ffd36a', 3.5); });
  }
  const meter = (g, x, y, w, v, col, kab) => { px.rect(g, x - 1, y - 1, w + 2, 6, '#05070d'); px.rect(g, x, y, w, 4, '#1a2030'); px.rect(g, x, y, Math.round(w * clamp(v, 0, 1)), 4, col); if (kab) for (let i = 0; i < w; i += 3) px.dot(g, x + i, y - 1 - (Math.floor(game.real * 20 + i) % 3), ['#ffd84a', '#ff8a3a', '#ff4a2a'][i % 3]); };
  /** the score bug, top center */
  function scoreBug(g, r, m) {
    const w = 206, x = Math.round(Math.min(r.W / 2 - w / 2, r.W - 104 - w)), y = 5, A2 = m.teams[0], B = m.teams[1];
    UI.panel(g, x, y, w, 30, { alpha: .9, border: '#4a5a7a' });
    Logo.draw(g, A2.id, x + 4, y + 3, 16); Logo.draw(g, B.id, x + w - 20, y + 3, 16);
    E.font.text(g, A2.def.abbr, x + 24, y + 4, A2.def.light, { outline: '#000' }); E.font.text(g, B.def.abbr, x + w - 24, y + 4, B.def.light, { align: 'right', outline: '#000' });
    E.font.text(g, String(A2.score), x + 58, y + 2, '#ffffff', { scale: 2, align: 'center', outline: '#000' }); E.font.text(g, String(B.score), x + w - 58, y + 2, '#ffffff', { scale: 2, align: 'center', outline: '#000' });
    const per = m.so ? 'SO' : PER(m.period), clock = m.so ? '' : U.mmss(m.clock), live = m.phase === 'play';
    E.font.text(g, per, x + w / 2, y + 3, '#ffd36a', { align: 'center', outline: '#000' });
    E.font.text(g, clock, x + w / 2, y + 13, live && m.clock < 10 ? '#ff6a6a' : '#eef4ff', { align: 'center', outline: '#000' });
    for (const t of [0, 1]) { const mx = t ? x + w - 92 : x + 22, kab = m.kaboom[t] > 0; meter(g, mx, y + 24, 70, kab ? m.kaboom[t] / T.kaboomTime : m.boom[t] / 100, kab ? '#ff6a2a' : m.boom[t] > 80 ? '#ffd36a' : '#e8a040', kab); E.font.text(g, kab ? 'KABOOM ' + Math.ceil(m.kaboom[t]) : 'BOOM', t ? mx - 3 : mx + 73, y + 23, kab ? '#ffd84a' : '#9fb2cc', { font: 'tiny', align: t ? 'right' : 'left', outline: false }); }
    // the power play strip
    const bin = m.skaters.find(s => s.state === 'bin');
    if (bin) { const pp = m.teams[1 - bin.team].def.abbr, txt = 'POWER PLAY ' + pp + '  ' + U.mmss(bin.binT) + '   (' + bin.def.name + ')'; const tw = E.font.width(txt) + 12; UI.panel(g, r.W / 2 - tw / 2, y + 33, tw, 12, { border: '#ffd36a', alpha: .92 }); E.font.text(g, txt, r.W / 2, y + 36, '#ffd36a', { align: 'center', outline: false }); }
    if (m.so) soMarks(g, r, m, y + 48);
  }
  function soMarks(g, r, m, y) {
    for (const t of [0, 1]) { const marks = m.so.marks[t], x0 = r.W / 2 + (t ? 20 : -20 - Math.max(3, marks.length) * 12);
      for (let i = 0; i < Math.max(3, marks.length); i++) { const x = x0 + i * 12, v = marks[i]; UI.panel(g, x, y, 10, 10, { alpha: .9, border: v === undefined ? '#4a5a7a' : v ? '#5ad85a' : '#ff5a5a' }); if (v === true) { px.line(g, x + 2, y + 5, x + 4, y + 7, '#5ad85a', 2); px.line(g, x + 4, y + 7, x + 8, y + 2, '#5ad85a', 2); } else if (v === false) { px.line(g, x + 2, y + 2, x + 8, y + 8, '#ff5a5a', 2); px.line(g, x + 8, y + 2, x + 2, y + 8, '#ff5a5a', 2); } } }
  }
  /** the radar, bottom right: the rink, team dots, humans ringed, the puck white */
  function radar(g, r, m) {
    const w = 92, h = 42, ca = game.cornerArea(), x = r.W - w - 6, y = ca && ca.y1 < 60 && ca.x0 < r.W - 100 ? Math.ceil(ca.y1) + 4 : 7;
    UI.panel(g, x - 2, y - 2, w + 4, h + 4, { alpha: .78, border: '#4a5a7a', bg: ['#0e1a2e', '#0a1424'] });
    const sx = (w - 4) / (Rink.HL * 2), sy = (h - 4) / (Rink.HW * 2), X = v => x + 2 + (v - Rink.X0) * sx, Y = v => y + 2 + (v - Rink.Y0) * sy;
    px.rect(g, X(Rink.C.x) , y + 2, 1, h - 4, '#c82a2a'); px.rect(g, X(Rink.C.x - 108), y + 2, 1, h - 4, '#2a5ab8'); px.rect(g, X(Rink.C.x + 108), y + 2, 1, h - 4, '#2a5ab8');
    for (const s of m.skaters) { if (s.offIce || s.state === 'bin') continue; const c = m.teams[s.team].home ? m.teams[s.team].def.trim : m.teams[s.team].def.light; if (s.ctrl.kind !== 'cpu') { const hc = s.ctrl.human ? s.ctrl.human.color : '#ffd36a'; px.disc(g, X(s.x), Y(s.y), 2.5, hc); } px.rect(g, Math.round(X(s.x)) - 1, Math.round(Y(s.y)) - 1, 3, 3, c); }
    for (const gl of m.goalies) px.rect(g, Math.round(X(gl.x)) - 1, Math.round(Y(gl.y)) - 1, 2, 3, '#d8d8d8');
    px.rect(g, Math.round(X(m.puck.x)), Math.round(Y(m.puck.y)), 1, 1, '#ffffff');
    void ca;
  }
  /** world markers: rings under humans, chevrons and tags, turbo bars, shot meters, chirp bubbles, items, dizzy stars */
  function world(r, m) {
    const t = game.real;
    for (const s of m.skaters) {
      if (s.offIce) continue;
      const pos = Replay.on ? Replay.posOf('s', s.id) || s : s;
      if (s.ctrl.kind !== 'cpu' && !Replay.on) {
        const hu = s.ctrl.human, col = hu ? hu.color : '#ffd36a';
        if (s.intent.aim && hu && hu.input === game.input && game.input.lastDevice === 'mouse') { const [ax, ay] = s.intent.aim; r.decal(() => { r.groundRing(ax, ay, 6, col, .9); r.groundRing(ax, ay, 2, '#ffffff', 1); }); }
        r.overlay(g => { const q = r.w(pos.x, pos.y, 20), sx = q[0], sy = q[1]; if (sx >= 4 && sx <= r.W - 4 && sy >= 4 && sy <= r.H - 4) return; const cx = clamp(sx, 10, r.W - 10), cy = clamp(sy, 40, r.H - 10), a = Math.atan2(sy - cy, sx - cx); px.poly(g, [[cx + Math.cos(a) * 7, cy + Math.sin(a) * 7], [cx + Math.cos(a + 2.4) * 6, cy + Math.sin(a + 2.4) * 6], [cx + Math.cos(a - 2.4) * 6, cy + Math.sin(a - 2.4) * 6]], col); E.font.text(g, hu ? (hu.tag || 'P' + (hu.id + 1)) : 'P1', cx - Math.cos(a) * 10, cy - Math.sin(a) * 10 - 3, col, { align: 'center', font: 'tiny', outline: '#000' }); });
        r.decal(() => { r.groundRing(pos.x, pos.y, 10, col, 1); r.groundRing(pos.x, pos.y, 11, col, .5); });
        r.queue(pos.x, pos.y, 46, g => { const [x, y] = r.w(pos.x, pos.y, 46), X = Math.round(x), Y = Math.round(y) + (Math.floor(t * 4) % 2); px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], col); px.poly(g, [[X - 2, Y - 4], [X + 2, Y - 4], [X, Y - 2]], '#ffffff');
          const tag = hu ? (hu.tag || 'P' + (hu.id + 1)) : 'P1'; E.font.text(g, tag, X, Y - 14, col, { align: 'center', outline: '#000' });
          px.rect(g, X - 8, Y + 2, 16, 2, '#05070d'); px.rect(g, X - 8, Y + 2, Math.round(16 * s.turbo), 2, s.turboOn ? '#4af0f0' : '#2a9ab8');
          if (s.calling > 0) E.font.text(g, '!', X + 8, Y - 14, '#ffd36a', { outline: '#000', scale: 2 });
        }, { emissive: true });
      }
      if (s.state === 'wind' || (s.charging && s.shootHeld > .18)) r.queue(pos.x, pos.y, 52, g => { const [x, y] = r.w(pos.x, pos.y, 52), full = s.charge >= .95; E.ui.bar(g, Math.round(x) - 12, Math.round(y) - 4, 24, 4, s.charge, full ? (m.kaboom[s.team] > 0 ? '#ff4a2a' : '#ffd36a') : '#ffb347'); if (full && m.kaboom[s.team] > 0) E.font.text(g, 'KABOOM!', Math.round(x), Math.round(y) - 12, '#ffd84a', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true });
      if (s.bubbleT > 0 && s.bubble) r.queue(pos.x, pos.y, 50, g => { const [x, y] = r.w(pos.x, pos.y, 50), lines = E.font.wrap(s.bubble, 96), w = Math.max(...lines.map(l => E.font.width(l))) + 8, h = lines.length * 9 + 5, X = Math.round(x - w / 2), Y = Math.round(y - h - 8); px.rect(g, X, Y, w, h, '#ffffff'); px.rect(g, X, Y + h, w, 1, '#8a8a90'); px.poly(g, [[x - 3, Y + h], [x + 3, Y + h], [x, Y + h + 5]], '#ffffff'); lines.forEach((l, i) => E.font.text(g, l, X + 4, Y + 3 + i * 9, '#141418', { outline: false })); });
      const its = Object.keys(s.items).filter(k => s.items[k] > 0); if (its.length) r.queue(pos.x, pos.y, 40, g => { const [x, y] = r.w(pos.x, pos.y, 38); its.forEach((k, i) => { const X = Math.round(x - its.length * 5 + i * 10 + 5), Y = Math.round(y) - 26; Items2.icon(g, k, X, Y); if (k !== 'lumber') E.font.text(g, String(Math.ceil(s.items[k])), X, Y + 5, '#ffffff', { font: 'tiny', align: 'center', outline: '#000' }); else E.font.text(g, 'x' + s.items[k], X, Y + 5, '#ffffff', { font: 'tiny', align: 'center', outline: '#000' }); }); });
      if (s.state === 'down' || (s.dizzy > 0 && s.state === 'getup')) r.queue(pos.x, pos.y, 10, g => { for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1, [x, y] = r.w(pos.x + Math.cos(a) * 7, pos.y + Math.sin(a) * 4, 12); px.dot(g, x, y, '#ffe84a'); px.dot(g, x + 1, y, '#ffffff'); } }, { emissive: true });
    }
  }
  /** context prompts at the bottom center (above the booth's box) */
  function prompts(g, r, m) {
    const y = r.H - 72, items = [];
    const hu = m.humans.find(h => h.kind === 'local'); if (!hu) return;
    const s = hu.skater, pk = m.puck;
    if (Replay.on) items.push('{pass} SKIP');
    else if (m.phase === 'faceoff' && m.faceoff && hu.skater === m.teams[hu.team].center && !m.faceoff.dropped) items.push('{pass} ON THE DROP!');
    else if (m.phase === 'play') {
      if (pk.passTo === s && !pk.owner) items.push('{shoot} ONE-TIMER!');
      if (m.invite && m.invite.to === s.id) items.push('HOLD {lob} TO ACCEPT  (' + Math.ceil(m.invite.t) + ')');
      else if (pk.owner !== s && Fight.rivalFor(m, s)) items.push('HOLD {lob} — DROP THE GLOVES');
      if (pk.owner === s && m.kaboom[s.team] > 0) items.push('HOLD {shoot} FOR A KABOOM SHOT');
    } else if (m.phase === 'fight') items.push('{pass} JAB   {shoot} HAYMAKER   {deke} DUCK   {lob} YANK');
    else if (m.phase === 'shootout' && m.so && m.so.att) { const g2 = m.byId(m.so.att.goalie); if (g2 && g2.manual) items.push('IN NET: {pass} BUTTERFLY  {shoot} POKE  {deke} DIVE'); else items.push('{deke} DEKE  {shoot} SHOOT'); }
    items.forEach((it, i) => Glyphs.text(g, it, r.W / 2, y - i * 13, { align: 'center', color: '#ffe8a0', input: hu.input }));
  }
  function fightHud(g, r, m) {
    const F = m.fight; if (!F) return;
    for (const [id, side] of [[F.a, 0], [F.b, 1]]) {
      const s = m.byId(id), f = s.fight || { bal: 0, sta: 0 }, x = side ? r.W - 120 : 12, y = 52;
      UI.panel(g, x, y, 108, 40, { alpha: .9, border: m.teams[s.team].def.trim });
      s.rig.drawPortrait(g, x + 3, y + 3, 34, { zoom: 2.4, turn: side ? -.4 : .4, bg: '#1a2a4a' });
      E.font.text(g, s.def.name, x + 40, y + 4, '#ffffff', { outline: '#000' });
      E.font.text(g, 'BAL', x + 40, y + 16, '#9fb2cc', { font: 'tiny', outline: false }); E.ui.bar(g, x + 54, y + 16, 50, 5, clamp(f.bal / T.fightBalance, 0, 1), '#ff5a4a');
      E.font.text(g, 'STA', x + 40, y + 26, '#9fb2cc', { font: 'tiny', outline: false }); E.ui.bar(g, x + 54, y + 26, 50, 5, clamp(f.sta / 100, 0, 1), '#4af0a0');
    }
  }
  function draw(r, m) {
    if (!m || Dev.hideHud) return;
    r.overlay(g => {
      const safeY = Math.round(r.H * .04);
      if (Replay.on) { const bh = Math.round(r.H * .1); px.rect(g, 0, 0, r.W, bh, '#000000'); px.rect(g, 0, r.H - bh, r.W, bh, '#000000'); E.font.title(g, Replay.label, 14, bh + 4, { scale: 2, colors: ['#ffffff', '#ff8a8a', '#c82a2a'] }); if (Math.floor(game.real * 2) % 2) px.disc(g, 8, bh + 10, 3, '#ff2a2a'); Glyphs.text(g, '{pass} SKIP', r.W - 14, r.H - bh + 4, { align: 'right', color: '#c8d0e8' }); return; }
      scoreBug(g, r, m); if (m.phase !== 'fight' && m.phase !== 'intro') radar(g, r, m);
      if (m.phase === 'fight') fightHud(g, r, m);
      prompts(g, r, m);
      Talk.drawTip(g, r, safeY + (m.skaters.some(s => s.state === 'bin') ? 46 : 34));
      UI.drawToasts(g, r, safeY + 66);
      if (banner) { banner.t -= 1 / 60; const k = banner.max - banner.t, sh = game.reduceMotion ? 0 : Math.max(0, .3 - k) * 10, sc = banner.scale, cy = r.H * .3 + Math.sin(game.real * 40) * sh;
        E.font.title(g, banner.text, Math.round(r.W / 2), Math.round(cy), { align: 'center', scale: sc, colors: game.reduceMotion ? banner.colors : banner.colors.map((c, i) => banner.colors[(i + Math.floor(game.real * 8)) % banner.colors.length]), depth: 3, depthColor: '#0a0a14' });
        if (banner.sub) E.font.text(g, banner.sub, r.W / 2, cy + sc * 8 + 6, '#ffffff', { align: 'center', outline: '#000' }); if (banner.t <= 0) banner = null; }
      if (lower && m.phase === 'stoppage') { lower.t -= 1 / 60; const w = 230, x = 14, y = r.H - 92; UI.panel(g, x, y, w, 28, { alpha: .9, border: '#ffd36a' }); lower.lines.forEach((l, i) => E.font.text(g, l, x + 6, y + 4 + i * 11, i ? '#cfe0f4' : '#ffffff', { outline: false })); if (lower.t <= 0) lower = null; }
      if (m.phase === 'intro' && m.intro) introCard(g, r, m);
      if (m.cfg.mode === 'session' && typeof AIHub !== 'undefined' && AIHub.time && AIHub.time() < 0 && AIHub.time() > -4000) { const n = Math.ceil(-AIHub.time() / 1000); E.font.title(g, String(n), r.W / 2, r.H * .35, { align: 'center', scale: 6 }); }
      Crowd.foreground(g, r, m);
    });
  }
  function introCard(g, r, m) {
    const I = m.intro, s = I.focus; if (!s || !s.def) return;
    const t = m.teams[s.team], w = 200, x = 20, y = r.H - 96;
    UI.panel(g, x, y, w, 34, { alpha: .92, border: t.def.trim });
    Logo.draw(g, t.id, x + 4, y + 5, 24);
    E.font.text(g, '#' + s.def.num + '  ' + (s.def.full || s.def.name), x + 32, y + 6, '#ffffff', { outline: '#000' });
    E.font.text(g, t.def.short + ' · ' + ({ C: 'CENTER', W: 'WING', D: 'DEFENSE', G: 'GOALIE' }[s.def.pos] || ''), x + 32, y + 18, t.def.trim, { outline: false });
    Glyphs.text(g, '{pass} SKIP', r.W - 14, r.H - 28, { align: 'right', color: '#9fb2cc' });
  }
  return { show, lowerThird, wire, draw, world, scoreBug, radar, get banner() { return banner; } };
})();

/* ---- item icons (string sprites, 8 px) ---- */
const Items2 = (() => {
  const SPR = {
    hotsauce: E.sprite(['..k..', '..r..', '.rrr.', '.rwr.', '.rrr.', '.rrr.', '.rrr.'], { k: '#2a2a2a', r: '#e83a2a', w: '#ffffff' }),
    tape: E.sprite(['.www.', 'wwwww', 'ww.ww', 'wwwww', '.www.'], { w: '#f4f4f4' }),
    poutine: E.sprite(['y.y.y', 'yyyyy', 'bbbbb', '.bbb.'], { y: '#f0c860', b: '#c8a080' }),
    lumber: E.sprite(['....y', '...y.', '..yy.', '.b...', 'b....'], { y: '#ffe84a', b: '#c8945a' }),
    bricks: E.sprite(['rrrrr', 'r.r.r', 'rrrrr', '.r.r.'], { r: '#b8503a' }),
    boombox: E.sprite(['..h..', 'ggggg', 'gcgcg', 'ggggg'], { g: '#4a4a5a', c: '#4af0f0', h: '#8a8a9a' }),
    cocoa: E.sprite(['.s.s.', '.....', 'bbbbb', 'bbbbb', '.bbb.'], { s: '#e8eef4', b: '#8a5a3a' }),
    octopus: E.sprite(['.ppp.', 'pwpwp', 'ppppp', 'p.p.p', '.p.p.'], { p: '#b84a8a', w: '#ffffff' }),
    rat: E.sprite(['.gg..', 'gggg.', '.gggt'], { g: '#8a8a90', t: '#e8a0a0' }),
    hat: E.sprite(['.hhh.', 'hhhhh'], { h: '#c83a2a' })
  };
  const icon = (g, k, x, y) => { const s = SPR[k]; if (s) px.sprite(g, s, Math.round(x - s.width / 2), Math.round(y - s.height / 2)); };
  return { SPR, icon };
})();
