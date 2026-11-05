// The in-play HUD, dialog, title cards and the coat ring. Drawn over the 3D picture with the 2D engine's overlay.
UI.zones = [];
const proj = (x, y, z) => { const w = S7.pres.world; if (!w) return null; try { return w.project(x * 16, y * 16, z * 16); } catch (e) { return null; } };
UI.proj = proj;
const PCOL = id => S7.reg.personas[id].color;
const modeHint = st => st.mode;

UI.hud = function (r, game) {
  const st = S7.st, W = r.W, H = r.H, Pres = S7.pres, I = game.input;
  UI.zones = [];
  // projections need the world; compute before the overlay callback
  const marks = [];
  if (Pres.world && st.area === Pres.areaId) {
    if (st.mode === 'junction') st.options.forEach((o, i) => { const p = proj(o.x, o.y, st.z + 1.2); if (p) marks.push({ kind: 'branch', i, p, o }); });
    if (['rail', 'junction'].includes(st.mode)) { for (const sp of S7.graph().A.spots) { if (sp.kind === 'pickup') continue; const sp3 = S7.sim.spotPos(sp), p = proj(sp3.x, sp3.y, sp3.z + 2.3); if (p) marks.push({ kind: 'spot', sp, p, near: st.prompt && st.prompt.id === sp.id }); } }
    if (st.mode === 'aim' || st.mode === 'rail' || st.mode === 'ski' || st.mode === 'lift') for (const e of st.enemies) { if (e.dead || !(e.visible > 0)) continue; const p = proj(e.x, e.y, e.z + e.def.h + .5); if (p) marks.push({ kind: 'enemy', e, p }); }
    if (st.boss && !st.boss.dead) { const p = proj(st.boss.x, st.boss.y, st.boss.z + st.boss.cy * 2); if (p) marks.push({ kind: 'boss', p }); }
  }
  r.overlay(g => {
    const rig = Pres.rigs && Pres.rigs[st.persona], per = S7.reg.personas[st.persona], ro = st.roster[st.persona];
    const aim = st.mode === 'aim';
    // ---- hurt vignette & freeze
    if (st.hurtT > 0) { g.globalAlpha = Math.min(.5, st.hurtT); g.fillStyle = '#d81e2a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (st.mode === 'frozen') { g.globalAlpha = .5; g.fillStyle = '#bfe8ff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; UI.text(g, S7.reg.personas[st.persona].name.toUpperCase() + ' HAS FROZEN', W / 2, H / 2 - 8, '#0c2a4a', { align: 'center', scale: 2, shadow: '#fff' }); }
    // ---- junction & spot markers
    for (const m of marks) {
      if (m.kind === 'branch') {
        const sel = m.i === st.sel, x = Math.round(m.p[0]), y = Math.round(m.p[1]), a = m.o.ang;
        g.save(); g.translate(x, y); const cam = S7.st.cam, cy = Math.atan2(cam.ly - cam.y, cam.lx - cam.x), sd = S7.sim.steerDot(a), sa = Math.atan2(-sd[1], sd[0]);
        g.rotate(sa); g.fillStyle = sel ? col.red : '#e8e4f0'; g.globalAlpha = sel ? 1 : .75; g.beginPath(); g.moveTo(9, 0); g.lineTo(-5, -7); g.lineTo(-2, 0); g.lineTo(-5, 7); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); g.restore(); g.globalAlpha = 1;
        const lab = m.o.label || ''; if (sel && lab) UI.text(g, lab, x - UI.w(lab) / 2, y + 11, m.o.gate && !S7.sim.gateOpen(m.o.gate) ? col.gold : '#fff');
        UI.zones.push({ r: [x - 12, y - 12, 24, 24], kind: 'branch', i: m.i });
      } else if (m.kind === 'spot') {
        const x = Math.round(m.p[0]), y = Math.round(m.p[1]);
        if (m.near) { const t = m.sp.label; const w = UI.w(t) + UI.glyphW(UI.label('interact')) + 12; UI.panel(g, x - w / 2, y - 14, w, 14, { fill: '#000', alpha: .6, border: col.red }); UI.glyph(g, 'interact', x - w / 2 + 3, y - 12); UI.text(g, t, x - w / 2 + 9 + UI.glyphW(UI.label('interact')), y - 10, '#fff'); UI.zones.push({ r: [x - w / 2, y - 14, w, 14], kind: 'spot', id: m.sp.id }); }
        else { g.fillStyle = col.red; g.fillRect(x - 2, y - 2, 4, 4); }
      }
    }
    // ---- enemy tags in aim: show hp ticks near revealed
    // ---- the status block
    const quiet = st.mode === 'talk' || st.mode === 'cutscene';
    if (!quiet) {
      UI.panel(g, 4, H - 46, 126, 42, { alpha: .72 });
      if (rig) { try { rig.drawPortrait(g, 6, H - 44, 36); } catch (e) { /* rig busy */ } }
      UI.text(g, per.name.split(' ')[0].toUpperCase(), 46, H - 43, PCOL(st.persona), { scale: 1 });
      UI.text(g, per.skillName.toUpperCase(), 46, H - 33, st.skillCd > 0 ? col.dim : '#e8e4f0');
      const max = S7.sim.personaMax(st.persona); UI.bar(g, 46, H - 22, 80, 5, ro.hp / max, ro.hp / max < .3 ? '#ff4a3a' : '#e8e4f0');
      const w = S7.sim.weapon(); const rl = ro.reload > 0; const ammo = rl ? 'RELOAD' : (st.cheats.infAmmo ? '∞' : ro.ammo + '/' + w.mag);
      UI.text(g, rl ? 'RELOAD' : (st.cheats.infAmmo ? 'AMMO INF' : 'AMMO ' + ro.ammo + '/' + w.mag), 46, H - 14, rl ? col.gold : '#e8e4f0');
      // the Seven, as small pips
      S7.ROSTER.forEach((id, i) => { const rr = st.roster[id]; g.fillStyle = !rr.unlocked ? '#2a2630' : rr.frozen ? '#7ac8ff' : PCOL(id); g.globalAlpha = id === st.persona ? 1 : .6; g.fillRect(8 + i * 5, H - 7, 4, id === st.persona ? 4 : 2); g.globalAlpha = 1; });
    }
    if (!quiet) { UI.panel(g, 4, 4, 106, 28, { alpha: .6 });
    UI.text(g, 'RED', 8, 8, '#ff5a5a'); UI.bar(g, 28, 8, 78, 5, st.red / S7.sim.redMax(), '#e01828'); UI.text(g, String(Math.round(st.red)), 28 + 78 - UI.w(String(Math.round(st.red))), 8, '#fff', { shadow: false });
    UI.text(g, 'RIME ' + st.rime, 8, 19, '#8fe8ff'); UI.text(g, 'PINS ' + st.pins.length + '/7', 58, 19, col.gold); }
    // ---- objective
    if (st.objective && !aim && !quiet && !(st.boss && !st.boss.dead)) { const lines = UI.wrap(st.objective, Math.min(W - 250, 260), {}); let y = 4; for (const l of lines.slice(0, 3)) { UI.text(g, l, W / 2 - UI.w(l) / 2, y, '#e8e4f0', { shadow: '#000' }); y += 9; } }
    if (st.hint && !aim && ['rail', 'junction'].includes(st.mode)) { const lines = UI.wrap(st.hint, W - 90, {}); let y = H - 66 - (lines.length - 1) * 9; for (const l of lines) { UI.text(g, l, W / 2 - UI.w(l) / 2, y, col.gold); y += 9; } }
    // ---- context prompts
    const rows = [];
    if (st.mode === 'rail') { rows.push(['go', 'RUN']); rows.push(['turn', 'ABOUT-FACE']); rows.push(['aim', 'AIM']); if (st.prompt && st.prompt.kind !== 'gate') rows.push(['interact', st.prompt.label || 'USE']); else if (st.prompt) rows.push(['interact', st.prompt.label]); rows.push(['ring', 'COATS']); }
    else if (st.mode === 'junction') { rows.push(['go', 'GO']); rows.push(['turn', 'BACK']); rows.push(['aim', 'AIM']); rows.push(['ring', 'COATS']); }
    else if (st.mode === 'aim') { rows.push(['fire', 'FIRE']); rows.push(['scan', st.scanCd > 0 ? 'SCAN ' + st.scanCd.toFixed(1) : 'SCAN']); rows.push(['skill', per.skillName.toUpperCase()]); rows.push(['reload', 'RELOAD']); }
    else if (st.mode === 'ski') { rows.push(['go', 'TUCK']); rows.push(['turn', 'STOP']); rows.push(['aim', 'AIM']); }
    else if (st.mode === 'lift') { rows.push(['aim', 'AIM']); rows.push(['scan', 'SCAN']); }
    if (rows.length && !st.cut) UI.promptRow(g, rows, W - 6, H - 14, 'right');
    // ---- aim: reticle, scan ring, laugh bearings
    if (aim) {
      const cx = Math.round(W / 2), cy = Math.round(H / 2), rd = st.aim.zoom ? 5 : 8;
      g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.arc(cx + .5, cy + .5, rd, 0, 7); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(cx, cy, 1, 1); g.fillRect(cx - rd - 4, cy, 4, 1); g.fillRect(cx + rd + 1, cy, 4, 1); g.fillRect(cx, cy - rd - 4, 1, 4); g.fillRect(cx, cy + rd + 1, 1, 4);
      if (st.scanCd > 0) { g.strokeStyle = '#8fe8ff'; g.beginPath(); g.arc(cx + .5, cy + .5, rd + 4, -Math.PI / 2, -Math.PI / 2 + 6.28 * (1 - st.scanCd / S7.T('scanCooldown'))); g.stroke(); }
      if (st.aim.zoom) { g.strokeStyle = '#000'; g.lineWidth = 40; g.beginPath(); g.arc(cx, cy, H * .5 + 30, 0, 7); g.stroke(); }
      // bearing ticks for hidden laughs
      for (const e of st.enemies) {
        if (e.dead || e.visible > 0 || e.spawnT > 0) continue; const d = Math.hypot(e.x - st.x, e.y - st.y); if (d > 24) continue;
        const rel = S7.angDiff(st.aim.yaw, Math.atan2(e.y - st.y, e.x - st.x)), a = rel - Math.PI / 2, rr = Math.min(W, H) * .36, px = cx + Math.cos(a + Math.PI / 2) * 0, tx = cx + Math.sin(rel) * rr, ty = cy - Math.cos(rel) * rr * .8;
        if (Math.abs(rel) < .35) continue;
        g.fillStyle = '#9ad0ff'; g.globalAlpha = .4 + .5 * (1 - d / 24); g.beginPath(); g.arc(tx, ty, 2.5, 0, 7); g.fill(); g.globalAlpha = 1;
      }
    }
    // revealed enemies get a marker above them
    for (const m of marks) if (m.kind === 'enemy') { const x = Math.round(m.p[0]), y = Math.round(m.p[1]); g.fillStyle = '#ff5a3a'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 5); g.lineTo(x + 3, y - 5); g.fill(); }
    // ---- boss bar
    const b = st.boss; if (b && !b.dead) { const bw = 160, bx = W / 2 - bw / 2; UI.text(g, b.name, W / 2 - UI.w(b.name) / 2, 16, '#fff'); UI.bar(g, bx, 26, bw, 5, b.hp / b.hpMax, '#d81e2a'); if (b.warmOpen()) UI.text(g, 'WARM SPOT OPEN!', W / 2 - UI.w('WARM SPOT OPEN!') / 2, 33, '#ff6a40'); }
    // ---- toasts
    let ty = 38; for (const t of st.toasts) { g.globalAlpha = Math.min(1, t.t); const w = UI.w(t.text) + 10; UI.panel(g, W - w - 4, ty, w, 12, { fill: '#000', alpha: .6, border: col.red }); UI.text(g, t.text, W - w + 1, ty + 3, '#fff'); ty += 14; g.globalAlpha = 1; }
    // ---- Echo Run
    if (st.echo) { const ec = st.echo; const t = ec.countdown > 0 ? 0 : ec.t; UI.panel(g, W / 2 - 50, 4, 100, 28, { alpha: .65 }); UI.text(g, 'ECHO RUN', W / 2 - UI.w('ECHO RUN') / 2, 7, col.gold); UI.text(g, S7.fmtTime(Math.max(0, t - ec.hits * 2)), W / 2 - UI.w(S7.fmtTime(t)) / 2, 17, '#fff', { scale: 1 }); UI.text(g, 'TARGETS ' + ec.hits + '/' + ec.total, W / 2 - 30, 26, '#8fe8ff');
      if (ec.countdown > 0) UI.text(g, String(Math.ceil(ec.countdown)), W / 2, H / 2 - 12, '#fff', { scale: 4, align: 'center' }); }
    // ---- the coat ring
    if (st.mode === 'ring') UI.drawRing(g, W, H, game);
    // ---- cards, dialog
    UI.drawCard(g, W, H); UI.drawTalk(g, W, H, game);
    // ---- transition fade
    if (st.mode === 'transition') { g.globalAlpha = S7.clamp(1 - st.transT / .5, 0, 1); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (st.fadeIn > 0) { g.globalAlpha = S7.clamp(st.fadeIn / .5, 0, 1); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  });
};
UI.drawRing = function (g, W, H, game) {
  const st = S7.st, cx = W / 2, cy = H / 2 - 4, R = Math.min(W, H) * .3;
  UI.dim(g, W, H, .55);
  S7.ROSTER.forEach((id, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 7, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .9, p = S7.reg.personas[id], r = st.roster[id], sel = i === st.ringSel, ok = r.unlocked && !r.frozen;
    const s = sel ? 40 : 32;
    g.fillStyle = sel ? p.color : '#14101c'; g.globalAlpha = ok ? 1 : .45; g.fillRect(x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4); g.fillStyle = '#1c1628'; g.fillRect(x - s / 2, y - s / 2, s, s); g.globalAlpha = ok ? 1 : .4;
    try { S7.pres.rigs[id].drawPortrait(g, x - s / 2, y - s / 2, s); } catch (e) { /* busy */ }
    g.globalAlpha = 1;
    UI.text(g, String(i + 1), x - s / 2 + 1, y - s / 2 + 1, '#fff'); if (!r.unlocked) UI.text(g, '?', x - 2, y - 3, '#aaa'); if (r.frozen) UI.text(g, 'ICE', x - 5, y + s / 2 - 8, '#7ac8ff');
    UI.zones.push({ r: [x - s / 2, y - s / 2, s, s], kind: 'slot', i });
  });
  const id = S7.ROSTER[st.ringSel] || st.persona, p = S7.reg.personas[id], r = st.roster[id];
  UI.text(g, p.name.toUpperCase(), cx - UI.w(p.name) / 2, cy - 14, p.color, { scale: 1 });
  UI.text(g, p.title.toUpperCase(), cx - UI.w(p.title) / 2, cy - 4, '#e8e4f0');
  UI.text(g, S7.reg.weapons[p.weapon].name.toUpperCase() + ' / ' + p.skillName.toUpperCase(), cx - UI.w(S7.reg.weapons[p.weapon].name + ' / ' + p.skillName) / 2, cy + 6, col.gold);
  const ln = r.unlocked ? (r.frozen ? 'FROZEN: THE SWEEP WILL COME' : 'HP ' + Math.round(r.hp) + '/' + S7.sim.personaMax(id)) : 'NOT YET FOUND'; UI.text(g, ln, cx - UI.w(ln) / 2, cy + 16, r.frozen ? '#7ac8ff' : '#e8e4f0');
  UI.text(g, 'RELEASE TO WEAR', cx - UI.w('RELEASE TO WEAR') / 2, H - 14, col.dim);
};
UI.drawCard = function (g, W, H) {
  const c = S7.st.card; if (!c) return; const k = c.t0 - c.t, a = Math.min(1, k * 3, c.t * 2);
  g.globalAlpha = Math.max(0, a); g.fillStyle = '#000'; g.fillRect(0, H / 2 - 36, W, 72); g.fillStyle = col.red; g.fillRect(0, H / 2 - 36, W, 2); g.fillRect(0, H / 2 + 34, W, 2);
  S7.E.font.title(g, c.title, W / 2, H / 2 - 26, { scale: 3, align: 'center', colors: ['#ffffff', '#d81e2a'], outline: '#000' });
  UI.text(g, c.sub, W / 2, H / 2 + 14, '#e8e4f0', { align: 'center' }); g.globalAlpha = 1;
};
const NAMEOF = who => S7.reg.personas[who] ? S7.reg.personas[who].name.toUpperCase() : (S7.NAMES[who] !== undefined ? S7.NAMES[who] : who.toUpperCase());
UI.drawTalk = function (g, W, H, game) {
  const tk = S7.st.talk; if (!tk) return;
  const bw = W - 24, bx = 12, bh = 52, by = H - bh - 8, rig = S7.pres.rigs[tk.who];
  UI.panel(g, bx, by, bw, bh, { fill: '#0c0a14', alpha: .93, accent: S7.reg.personas[tk.who] ? S7.reg.personas[tk.who].color : col.red });
  let tx = bx + 8;
  if (rig) { g.fillStyle = '#1c1628'; g.fillRect(bx + 6, by + 6, 40, 40); try { rig.drawPortrait(g, bx + 6, by + 6, 40); } catch (e) { /* busy */ } tx = bx + 54; }
  const nm = tk.name || NAMEOF(tk.who); if (nm) UI.text(g, nm, tx, by + 5, S7.reg.personas[tk.who] ? S7.reg.personas[tk.who].color : col.gold);
  const txt = UI.fmt(tk.text), shown = txt.slice(0, Math.floor(tk.shown)), lines = UI.wrap(txt, bx + bw - tx - 10, {});
  let acc = 0, y = by + 16; for (const l of lines.slice(0, 4)) { const part = shown.slice(acc, acc + l.length + 1); UI.text(g, part, tx, y, '#fff'); acc += l.length + 1; y += 9; }
  if (tk.shown >= tk.text.length) { UI.glyph(g, 'confirm', bx + bw - 22, by + bh - 14); }
  UI.zones.push({ r: [bx, by, bw, bh], kind: 'talk' });
};
