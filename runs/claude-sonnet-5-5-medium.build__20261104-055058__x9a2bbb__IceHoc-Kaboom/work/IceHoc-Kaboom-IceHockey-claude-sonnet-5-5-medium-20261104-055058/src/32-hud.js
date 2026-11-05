/* ---- LOGOS, HUD and match drawing ---- */
const Logo = (() => {
  // drawn with primitives so any size works: team emblems
  function draw(g, id, cx, cy, s) {
    const t = TEAM[id], a = t.accent, c = t.home.cloth, k = s / 12;
    const d = (x, y, r, col) => px.disc(g, Math.round(cx + x * k), Math.round(cy + y * k), Math.max(1, Math.round(r * k)), col), R = (x, y, w, h, col) => px.rect(g, Math.round(cx + x * k), Math.round(cy + y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), col);
    d(0, 0, 6, '#10131f'); d(0, 0, 5.2, a === c ? '#ffffff' : c);
    if (id === 'muskrats') { d(0, 1, 3.4, '#8a6038'); R(-1.2, 2, 1, 2.5, '#fff'); R(.2, 2, 1, 2.5, '#fff'); d(-1.6, -.4, .6, '#111'); d(1.6, -.4, .6, '#111'); d(-3, -3, 1.2, '#8a6038'); d(3, -3, 1.2, '#8a6038'); }
    else if (id === 'drillers') { px.poly(g, [[cx - 3 * k, cy + 4 * k], [cx, cy - 4.5 * k], [cx + 3 * k, cy + 4 * k]], '#222'); R(-.5, -3, 1, 8, a); d(0, 5, 1, a); }
    else if (id === 'lumberjacks') { d(0, 0, 3.6, '#a0602a'); d(0, 0, 2, '#c88040'); d(0, 0, .8, '#6a3a18'); R(-4, -1, 8, 2, '#111'); }
    else if (id === 'bruisers') { d(0, 0, 3.8, '#222'); d(0, 0, 2.4, a); R(-1.6, -1, 3.2, 2.6, '#222'); }
    else if (id === 'marauders') { R(-4, -1, 8, 4, a); R(-3.6, 3.2, 1, 1, '#fff'); R(2.6, 3.2, 1, 1, '#fff'); R(-4, -4, 1, 4, '#fff'); R(-3, -4, 3, 2, '#111'); }
    else { d(0, 1, 3.2, '#2a2a2a'); d(-2.6, -2, 1.2, '#2a2a2a'); d(2.6, -2, 1.2, '#2a2a2a'); R(-3, -5, 6, 1.4, a); R(-3, -6, 1, 1.4, a); R(2, -6, 1, 1.4, a); R(-3, -6, 6, 0.01, a); }
  }
  return { draw };
})();

const Hud = (() => {
  const mmss = U.mmss;
  function scoreBug(g, r, m) {
    const w = 236, x = r.W / 2 - w / 2, y = 4; UI.box(g, x, y, w, 28, { bg: ['#11172e', '#080b18'], border: '#6a7aaa', alpha: .93 });
    [0, 1].forEach(side => { const t = m.teams[side], bx = side ? x + w - 82 : x + 4; px.rect(g, side ? x + w - 4 : x + 3, y + 3, 1, 22, t.home.trim); Logo.draw(g, t.id, side ? x + w - 18 : x + 18, y + 12, 13); UI.txt(g, t.abbr, side ? x + w - 34 : x + 34, y + 6, '#e8f0ff', { align: side ? 'right' : 'left' }); UI.txt(g, String(m.score[side]), side ? x + w - 78 : x + 70, y + 4, '#fff', { scale: 2, align: side ? 'right' : 'left' });
      const bx0 = side ? x + w - 4 - 78 : x + 4, mx = bx0, bw = 78, f = m.boom[side] / 100, ka = m.kaboom[side] > 0;
      px.rect(g, mx, y + 22, bw, 4, '#05070f'); const col = ka ? (Math.floor(game.time * 10) % 2 ? '#ffe040' : '#ff5a1a') : m.tactic[side] === 'grit' ? '#ff8a3a' : '#ffb347'; px.rect(g, mx, y + 22, Math.round(bw * (ka ? m.kaboom[side] / T.kaboomTime : f)), 4, col); if (ka) UI.txt(g, 'KABOOM ' + Math.ceil(m.kaboom[side]), mx + bw / 2, y + 17, '#ffe040', { align: 'center', font: 'tiny' }); });
    const per = m.ot ? 'OT' : m.so ? 'SO' : ['1ST', '2ND', '3RD', '4TH'][m.period - 1], low = m.phase === 'play' && m.clock < 10;
    UI.txt(g, per, r.W / 2, y + 3, '#9ab', { align: 'center' }); UI.txt(g, m.so ? 'SHOOTOUT' : mmss(Math.max(0, m.clock)), r.W / 2, y + 12, low ? '#ff6a6a' : '#ffffff', { align: 'center', scale: m.so ? 1 : 2 });
    // power play strip
    const bins = m.sinBin; if (bins.length) { const s = bins[0], w2 = 150; UI.box(g, r.W / 2 - w2 / 2, y + 30, w2, 11, { border: '#7aa7ff', alpha: .9 }); UI.txt(g, 'POWER PLAY ' + m.teams[1 - s.side].abbr + ' ' + mmss(s.bin) + ' ' + s.nick, r.W / 2, y + 33, '#bcd4ff', { align: 'center', font: 'tiny' }); }
  }
  function radar(g, r, m) {
    const w = 84, h = 38, x = r.W - w - 8, y = 18;
    UI.box(g, x - 2, y - 2, w + 4, h + 4, { bg: ['#0e1a2e', '#080f1e'], border: '#4a5a8a', alpha: .92 }); const sx = w / (Rink.X1 - Rink.X0), sy = h / (Rink.Y1 - Rink.Y0);
    px.rect(g, x + w / 2, y, 1, h, '#a02a2a'); px.rect(g, x + Math.round(w * .375), y, 1, h, '#2a4aa0'); px.rect(g, x + Math.round(w * .625), y, 1, h, '#2a4aa0');
    for (const s of m.sk) { if (s.state === 'bin' || s.parked) continue; const hum = s.ctrl.kind === 'human' || s.ctrl.kind === 'remote', c = m.teams[s.side].home.trim === '#141414' ? '#888' : s.side ? '#ffffff' : m.teams[s.side].home.trim; const X = Math.round(x + (s.x - Rink.X0) * sx), Y = Math.round(y + (s.y - Rink.Y0) * sy); px.rect(g, X - 1, Y - 1, hum ? 4 : 3, hum ? 4 : 3, s.side ? '#f4f4f4' : m.teams[0].accent); if (hum) px.rect(g, X - 2, Y - 2, 6, 1, E.PLAYER_COLORS[(s.ctrl.input && s.ctrl.input.player || 1) - 1] || '#fff'); }
    px.rect(g, Math.round(x + (m.puck.x - Rink.X0) * sx), Math.round(y + (m.puck.y - Rink.Y0) * sy), 2, 2, '#ffff88');
  }
  function fightHud(g, r, m) {
    const f = m.fight; if (!f) return;
    const draw = (s, bal, sta, side) => { const x = side ? r.W - 8 - 120 : 8, y = 46; UI.box(g, x, y, 120, 34, { border: side ? '#ff8a6a' : '#7aa7ff', alpha: .92 }); const px0 = side ? x + 88 : x + 3; Rigs.face(g, Rigs.pr(s), px0, y + 3, 28, { turn: side ? -.6 : .6, bg: ['#223', '#112'] }); const bx = side ? x + 4 : x + 34; UI.txt(g, s.nick, bx, y + 3, '#fff'); px.rect(g, bx, y + 14, 82, 6, '#05070f'); px.rect(g, bx, y + 14, Math.round(82 * clamp(bal / T.fightBalance, 0, 1)), 6, bal / T.fightBalance > .3 ? '#6ae06a' : '#e05a3a'); px.rect(g, bx, y + 23, 82, 3, '#05070f'); px.rect(g, bx, y + 23, Math.round(82 * sta / 100), 3, '#6ab0ff'); };
    draw(f.a, f.ba, f.sa, 0); draw(f.b, f.bb, f.sb, 1); Glyphs.text(g, '{pass} JAB  {shoot} HAYMAKER  {deke} DUCK  {lob} YANK', r.W / 2, r.H - 20, { align: 'center', color: '#ffe8c8' });
    if (f.winner && f.winner !== 'draw') UI.txt(g, f.winner.nick + ' WINS', r.W / 2, r.H * .45, '#ffd36a', { align: 'center', scale: 3 });
  }
  function prompts(g, r, m) {
    let p = null;
    for (const h of m.humans) { const s = h.sk; if (!s || h.remote) continue; const I = h.input;
      if (m.phase === 'fight') continue;
      if (m.pendingChallenge && m.pendingChallenge.b === s) { p = 'HOLD {lob} TO ACCEPT'; }
      else if (s.fightPrompt) p = 'HOLD {lob} - DROP THE GLOVES';
      else if (s.oneTimerT > 0 || (m.puck.passTo === s && m.puck.passT > 0)) p = '{shoot} ONE-TIMER!';
      else if (m.puck.owner && m.puck.owner.side === s.side && m.puck.owner !== s && m.puck.owner.ctrl.kind === 'cpu') p = '{pass} CALL FOR PASS';
      else if (m.phase === 'faceoff' && s.slot === 0 && m.fo && m.fo.dropped === false) p = '{pass} WIN THE DRAW';
      if (p) { Glyphs.text(g, p, r.W / 2, r.H - 34, { align: 'center', color: '#fff', input: I }); break; } }
  }
  function markers(r, m, dt) {
    for (const h of m.humans) { const s = h.sk; if (!s || s.state === 'bin') continue; const col = E.PLAYER_COLORS[(h.input && h.input.player || h.seat + 1 || 1) - 1] || '#fff', hcol = HUB && window.AIHub && AIHub.players && AIHub.players[h.seat] ? AIHub.players[h.seat].color : col;
      r.decal(g => { const pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; pts.push(r.w(s.x + Math.cos(a) * 11, s.y + Math.sin(a) * 11, 0)); } for (let i = 0; i < 20; i++) { const a = pts[i], b = pts[(i + 1) % 20]; px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), hcol, 1); } });
      r.queue(s.x, s.y, 50, g => { const [x, y] = r.w(s.x, s.y, 52), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], hcol); E.font.text(g, h.input && h.input.name || ('P' + (h.seat + 1)), X, Y - 13, hcol, { align: 'center', font: 'tiny', outline: '#000' });
        px.rect(g, X - 8, Y + 3, 16, 2, '#05070f'); px.rect(g, X - 8, Y + 3, Math.round(16 * s.turbo), 2, s.turbo > .25 ? '#6ab0ff' : '#ff6a6a');
        if (s.winding || s.charge > 0) { px.rect(g, X - 10, Y + 7, 20, 4, '#05070f'); px.rect(g, X - 10, Y + 7, Math.round(20 * s.charge), 4, s.charge >= .95 ? '#ffd36a' : '#ff8a3a'); }
        if (s.items) { let ix = X - 8; for (const k in s.items) if (s.items[k] > 0 && ITEMS[k]) { px.rect(g, ix, Y - 21, 5, 5, ITEMS[k].color); ix += 6; } } }, { emissive: true }); }
  }
  function edgeArrows(g, r, m) { for (const h of m.humans) { const s = h.sk; if (!s || h.remote && false) continue; const [x, y] = r.w(s.x, s.y, 8); if (x < 8 || x > r.W - 8 || y < 40 || y > r.H - 20) { const col = E.PLAYER_COLORS[(h.input && h.input.player || 1) - 1] || '#fff', ax = clamp(x, 12, r.W - 12), ay = clamp(y, 44, r.H - 26); px.disc(g, Math.round(ax), Math.round(ay), 5, col); UI.txt(g, 'P' + (h.input && h.input.player || h.seat + 1), ax, ay - 3, '#000', { align: 'center', font: 'tiny' }); } } }
  function shootoutHud(g, r, m) { const so = m.so; if (!so) return; ['H', 'A'].forEach((n, side) => { const x = r.W / 2 - 60 + side * 70; for (let i = 0; i < Math.max(3, so.shots[side].length); i++) { const v = so.shots[side][i]; px.rect(g, x + i * 10, 46, 9, 9, '#0a0e1e'); UI.txt(g, v === 1 ? '+' : v === 0 ? 'x' : '-', x + i * 10 + 4, 48, v === 1 ? '#6ae06a' : v === 0 ? '#ff6a6a' : '#667', { align: 'center' }); } }); if (so.state === 'live') { UI.txt(g, '' + Math.ceil(so.clock), r.W / 2, 60, '#ffd36a', { align: 'center', scale: 2 }); const hd = m.humans.find(h => h.goalieMode); if (hd) Glyphs.text(g, 'STICK: MOVE   {pass} BUTTERFLY   {shoot} POKE   {deke} DIVE', r.W / 2, r.H - 34, { align: 'center', color: '#fff' }); } }
  function draw(g, r, m, dt) {
    if (m.hideHud) return; const ca = game.cornerArea && game.cornerArea();
    scoreBug(g, r, m); radar(g, r, m); fightHud(g, r, m); prompts(g, r, m); edgeArrows(g, r, m); if (m.so) shootoutHud(g, r, m);
    if (m.phase === 'intro') introCard(g, r, m);
    if (m.phase === 'periodEnd') periodCard(g, r, m);
    if (m.phase === 'replay') { px.rect(g, 0, 0, r.W, 26, '#000'); px.rect(g, 0, r.H - 26, r.W, 26, '#000'); UI.txt(g, 'REPLAY', 12, 8, '#ff6a6a', { scale: 2 }); Glyphs.text(g, '{pass} SKIP', r.W / 2, 12, { align: 'center', color: '#ccc' }); }
    if (m.phase === 'stoppage' && m.pt > .5 && m.pt < 1.7 && !m.over) lowerThird(g, r, m);
    if (m.phase === 'flood' && m.fl) floodHud(g, r, m);
    if (m.phase === 'final') finalCard(g, r, m);
    UI.drawBanners(g, r, dt); UI.drawToasts(g, r, dt); if (['play', 'faceoff'].includes(m.phase)) Talk.drawTip(g, r, dt);
    if (m.phase === 'play' && m.cfg.story) { const o = m.cfg.story.objectives; }
  }
  function lowerThird(g, r, m) { const w = 190, x = 8, y = r.H - 54; UI.box(g, x, y, w, 30, { border: '#6a7aaa', alpha: .9 }); UI.txt(g, 'SHOTS  ' + m.stats.shots[0] + ' - ' + m.stats.shots[1] + '   HITS  ' + m.stats.hits[0] + ' - ' + m.stats.hits[1], x + 6, y + 6, '#cfe0ff'); UI.txt(g, 'FACEOFFS  ' + m.stats.faceoffs[0] + ' - ' + m.stats.faceoffs[1], x + 6, y + 18, '#9ab'); }
  function introCard(g, r, m) { const u = clamp(m.pt / (m.cfg.introLen || 4.2), 0, .999), idx = Math.floor(u * 6), side = idx < 3 ? 0 : 1, s = Sim.teamOf(m, side)[idx % 3]; if (!s) return; const hw = 110; UI.box(g, r.W / 2 - hw, r.H - 80, hw * 2, 48, { border: m.teams[side].home.trim, alpha: .92 }); Rigs.face(g, Rigs.pr(s), r.W / 2 - hw + 6, r.H - 76, 38, { turn: .5, bg: [m.teams[side].home.cloth, '#10131f'] }); UI.txt(g, '#' + s.num + '  ' + s.nick, r.W / 2 - hw + 52, r.H - 72, '#fff', { scale: 2 }); UI.txt(g, s.name + ' - ' + m.teams[side].abbr, r.W / 2 - hw + 52, r.H - 54, '#9ab'); if (Math.floor(u * 60) % 10 === 0 && !s.said) { s.said = true; Synth.babble('Number ' + s.num + '! ' + s.name + '!', 'ref', { excl: true }); } if (u > .95) for (const q of m.sk) q.said = false; }
  function periodCard(g, r, m) { const w = 200, h = 70, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2 + 20; UI.box(g, x, y, w, h, { border: '#ffd36a' }); UI.txt(g, m.ot ? 'END OF OVERTIME' : 'END OF PERIOD ' + m.period, r.W / 2, y + 6, '#ffd36a', { align: 'center', scale: 2 }); UI.txt(g, m.teams[0].abbr + ' ' + m.score[0] + '    ' + m.teams[1].abbr + ' ' + m.score[1], r.W / 2, y + 26, '#fff', { align: 'center', scale: 2 }); UI.txt(g, 'SHOTS ' + m.stats.shots[0] + '-' + m.stats.shots[1] + '   HITS ' + m.stats.hits[0] + '-' + m.stats.hits[1], r.W / 2, y + 48, '#9ab', { align: 'center' }); }
  function floodHud(g, r, m) { const f = m.fl; if (f.state === 'ask') { UI.box(g, r.W / 2 - 130, r.H / 2 - 20, 260, 40, { border: '#ffd36a' }); Glyphs.text(g, '{pass} DRIVE THE FLOOD WAGON    {deke} SKIP', r.W / 2, r.H / 2 - 4, { align: 'center' }); UI.txt(g, 'INTERMISSION', r.W / 2, r.H / 2 - 16, '#9ab', { align: 'center' }); } else if (f.state === 'drive') { UI.txt(g, 'FLOOD WAGON  ' + Math.ceil(f.dur - f.t), r.W / 2, 40, '#ffd36a', { align: 'center', scale: 2 }); const left = Rink.scuffTotal(); UI.txt(g, 'CLEAN ' + Math.round((1 - left / Math.max(1, f.total)) * 100) + '%', r.W / 2, 58, '#cfe', { align: 'center' }); Glyphs.text(g, '{turbo} GAS   {pass} HONK', r.W / 2, r.H - 20, { align: 'center' }); } else if (f.state === 'done') { UI.txt(g, Math.round(f.cleaned * 100) + '% CLEAN', r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 3 }); } }
  function finalCard(g, r, m) { if (m.pt < 1.2) return; const w = 220, x = r.W / 2 - w / 2, y = r.H / 2 - 20; UI.box(g, x, y, w, 50, { border: '#ffd36a' }); UI.txt(g, m.teams[0].abbr + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].abbr + (m.so && m.so.final ? ' (SO)' : m.ot ? ' (OT)' : ''), r.W / 2, y + 8, '#fff', { align: 'center', scale: 2 }); UI.txt(g, m.score[0] === m.score[1] ? 'A TIE!' : (m.score[0] > m.score[1] ? m.teams[0].name : m.teams[1].name).toUpperCase() + ' WIN', r.W / 2, y + 30, '#ffd36a', { align: 'center' }); }
  return { draw, markers };
})();

const DrawMatch = (() => {
  const TRAIL = [];
  function benches(r, m) {
    const a = m.arena; for (const side of [0, 1]) { const bx = side ? Rink.CX + 72 : Rink.CX - 216, w = 144, y0 = Rink.Y0 - 24, col = m.teams[side].home.trim;
      r.queue(bx + w / 2, y0 + 10, 0, g => { r.box(g, bx, y0, 0, bx + w, y0 + 14, 8, a.id === 'icebox' ? '#8a6a44' : '#3a4256', '#2a3040'); r.box(g, bx, y0 + 10, 8, bx + w, y0 + 14, 22, '#1a2030', '#12182a'); const [x, y] = r.w(bx + w / 2, y0 + 12, 24); E.font.text(g, m.teams[side].abbr, Math.round(x), Math.round(y) - 6, col, { align: 'center', outline: false }); });
      const bin = side ? Rink.CX + 12 : Rink.CX - 60; r.queue(bin + 24, y0 + 10, 0, g => { r.box(g, bin, y0, 0, bin + 48, y0 + 14, 8, '#3a3a48', '#26262e'); });
    }
    // bench spares sit: two per team, plus coach standing
    for (const side of [0, 1]) { const rg = (m._bench = m._bench || [])[side] || ((m._bench[side] = [Rigs.skater(m.teams[side].skaters[0], side, m.teams[side], side === 1), Rigs.skater(m.teams[side].skaters[1], side, m.teams[side], side === 1)])); rg.forEach((rig, i) => { const x = (side ? Rink.CX + 100 : Rink.CX - 190) + i * 30, y = Rink.Y0 - 14; rig.update(1 / 60, { x, y, z: 8, vx: 0, vy: 0, facing: PI / 2, crouch: .7 }); r.actor(x, y, 8, (g, ox, oy) => rig.draw(g, ox, oy, E.charView(r.view))); }); }
  }
  function lights(r, m) {
    const a = m.arena; game.lights.enabled = true; game.lights.ambient = Math.min(.85, a.ambient + .14); const kb = m.kaboom[0] > 0 ? m.teams[0].accent : m.kaboom[1] > 0 ? m.teams[1].accent : null;
    for (let i = 0; i < a.lamps; i++) { const x = Rink.X0 + 120 + i * (Rink.X1 - Rink.X0 - 240) / Math.max(1, a.lamps - 1); game.lights.add(x, Rink.CY + (i % 2 ? 60 : -60), 90, 260, a.id === 'icebox' ? .85 : .75, { color: kb || (a.id === 'mall' ? '#ffd0f0' : a.id === 'pond' ? '#9ac0ff' : a.id === 'grind' ? '#c0ffd0' : '#fff0d0') }); }
    if (m.phase === 'goal') for (const e of [0, 1]) game.lights.add(Rink.goalLineX(e), Rink.CY, 20, 90, .8 + Math.sin(game.time * 12) * .3, { color: '#ff3030' });
    if (m.kaboom[0] > 0 || m.kaboom[1] > 0) game.lights.add(Rink.CX, Rink.CY, 60, 500, .5 + Math.sin(game.time * 6) * .15, { color: kb });
    if (a.id === 'mall') { game.lights.add(Rink.CX - 300, Rink.Y0 - 60, 30, 160, .8, { color: '#e0389a' }); game.lights.add(Rink.CX + 300, Rink.Y0 - 60, 30, 160, .8, { color: '#18b5b0' }); }
    if (a.id === 'pond') game.lights.add(Rink.X1 + 30, Rink.CY - 100, 20, 200, .9 + Math.sin(game.time * 9) * .1, { color: '#ff9a3a' });
  }
  function draw(r, m, t) {
    const view = E.charView(r.view), map = Rink.buildMap(m.arena); game.cam.bounds = v => map.bounds(v);
    lights(r, m); Rink.drawGround(r, map); map.queueWalls(r);
    // thin ice, holes, items on the ice
    r.decal(g => { for (const t of m.thin) { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; pts.push(r.w(t.x + Math.cos(a) * t.rx, t.y + Math.sin(a) * t.ry, 0)); } px.poly(g, pts, t.hole ? '#0a1626' : `rgba(150,200,240,${t.hp < 100 ? .7 : .45})`); if (!t.hole && t.hp < 100) { const [cx, cy] = r.w(t.x, t.y, 0); px.line(g, cx - 8, cy - 2, cx + 6, cy + 3, '#fff', 1); } } for (const o of m.octos) { const [x, y] = r.w(o.x, o.y, 0); px.ell(g, Math.round(x), Math.round(y), 8, 4, 'rgba(255,255,255,.25)'); } });
    Crowd.build(m.arena); Crowd.draw(r, m, t); benches(r, m); Rink.drawBoards(r, m.arena, m.teams[0].home.trim, t);
    Rink.drawNet(r, 0, m.puck.bulge[0], m.phase === 'goal', true); Rink.drawNet(r, 1, m.puck.bulge[1], m.phase === 'goal', true);
    for (const o of m.octos) { r.queue(o.x, o.y, 2, g => { const [x, y] = r.w(o.x, o.y, 3), X = Math.round(x), Y = Math.round(y); if (o.rat) { px.ell(g, X, Y, 3, 2, '#5a4a40'); px.dot(g, X + 3, Y - 1, '#f88'); } else { px.disc(g, X, Y - 2, 4, '#c04a8a'); for (let i = 0; i < 4; i++) px.line(g, X - 4 + i * 3, Y, X - 5 + i * 3, Y + 3, '#c04a8a', 1); px.dot(g, X - 1, Y - 3, '#fff'); px.dot(g, X + 2, Y - 3, '#fff'); } }); }
    for (const o of m.items) { if (o.fly > 0) { const u = 1 - o.fly / .7, fx = lerp(o.fx, o.x, u), fy = lerp(o.ly, o.y, u); r.queue(fx, fy, o.z + 6, g => { const [x, y] = r.w(fx, fy, o.z + 8); px.disc(g, Math.round(x), Math.round(y), 3, ITEMS[o.kind].color); }, { emissive: true }); continue; }
      const blink = o.t < 3 && Math.floor(t * 8) % 2; if (blink) continue; r.shadow(o.x, o.y, 5, .3); r.queue(o.x, o.y, 6, g => { const [x, y] = r.w(o.x, o.y, 8 + Math.sin(t * 4) * 1.5), X = Math.round(x), Y = Math.round(y), c = ITEMS[o.kind].color; px.rect(g, X - 4, Y - 5, 8, 9, '#10131f'); px.rect(g, X - 3, Y - 4, 6, 7, c); px.rect(g, X - 2, Y - 3, 2, 2, '#fff'); E.font.text(g, ITEMS[o.kind].name.split(' ')[0].slice(0, 6), X, Y - 13, c, { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true }); r.shadow(o.x, o.y, 8, .15, '#ffffff'); }
    if (m.mascot) { const pe = m.mascot; r.shadow(pe.x, pe.y, 9, .35); r.actor(pe.x, pe.y, 0, (g, ox, oy) => { pe.rig.draw(g, ox, oy, view); px.disc(g, ox, oy - 40, 9, '#ffffff'); px.disc(g, ox - 5, oy - 48, 3, '#ffffff'); px.disc(g, ox + 5, oy - 48, 3, '#ffffff'); px.dot(g, ox - 2, oy - 41, '#111'); px.dot(g, ox + 2, oy - 41, '#111'); px.dot(g, ox, oy - 38, '#111'); }); }
    const ref = m.ref; r.shadow(ref.x, ref.y, 6, .3); r.actor(ref.x, ref.y, 0, (g, ox, oy) => ref.rig.draw(g, ox, oy, view));
    for (const g_ of m.gl) { if (m.phase === 'replay' || true) Rigs.drawGoalie(r, g_, view); }
    for (const s of m.sk) { if (s.state === 'bin' && false) continue; s.glow = m.kaboom[s.side] > 0 ? m.teams[s.side].accent : s.items.hotsauce > 0 ? '#ff4a2a' : null; Rigs.drawSkater(r, s, view, { hide: s.parked && m.phase === 'shootout' }); }
    // puck
    const p = m.puck, trail = S('puckTrail');
    r.shadow(p.x, p.y, 3 - Math.min(1.5, p.z * .04), .4);
    if (trail !== 'Off') { TRAIL.push([p.x, p.y, p.z, Math.hypot(p.vx, p.vy)]); if (TRAIL.length > 10) TRAIL.shift(); }
    r.queue(p.x, p.y, p.z + 1, g => { if (trail !== 'Off' && Math.hypot(p.vx, p.vy) > 300) for (let i = 0; i < TRAIL.length - 1; i++) { const a = r.w(TRAIL[i][0], TRAIL[i][1], TRAIL[i][2] + 1), b = r.w(TRAIL[i + 1][0], TRAIL[i + 1][1], TRAIL[i + 1][2] + 1); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), trail === 'Glow' ? (p.fire ? '#ff8a2a' : '#4ae0ff') : 'rgba(255,255,255,.5)', 1); }
      const [x, y] = r.w(p.x, p.y, p.z + 1), X = Math.round(x), Y = Math.round(y); if (p.fire) { px.disc(g, X, Y, 4, '#ff8a2a'); px.disc(g, X, Y, 2, '#ffe040'); } else { px.ell(g, X, Y, 2, 1.5, '#0a0a0e'); px.dot(g, X - 1, Y - 1, '#6a6a7a'); } }, { emissive: !!p.fire });
    Hud.markers(r, m, 0); Talk.draw(r); Drills.world(r, m); Dev.world(r, m);
    if (m.phase === 'flood' && m.fl) { const f = m.fl; r.shadow(f.x, f.y, 14, .4); r.queue(f.x, f.y, 0, g => { const [x, y] = r.w(f.x, f.y, 0); const X = Math.round(x), Y = Math.round(y); px.rect(g, X - 11, Y - 12, 22, 12, '#e8e0c0'); px.rect(g, X - 11, Y - 12, 22, 3, '#c8402a'); px.rect(g, X - 6, Y - 20, 10, 8, '#6a8aa8'); px.rect(g, X - 10, Y - 3, 20, 3, '#555'); px.disc(g, X - 8, Y, 3, '#222'); px.disc(g, X + 8, Y, 3, '#222'); px.dot(g, X - 12 + (Math.cos(f.a) > 0 ? 22 : 0), Y - 6, '#ffee88'); if (f.honk > 0) E.font.text(g, 'A-OOGA', X, Y - 30, '#ffd36a', { align: 'center', outline: '#000' }); }); const gus = Rigs.PEOPLE.gus(); }
    r.overlay(g => Hud.draw(g, r, m, game.dt || 1 / 60));
  }
  return { draw };
})();
