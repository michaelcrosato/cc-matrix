/* SKILLER7 — the HUD (§7.19): minimal, inside a 5% safe margin. Prompts follow the device used last. World markers
 * (junction branches, interactables, warm spots) are projected; the mouse hovers and clicks them (the UI turns that into
 * intents). Also the dialog box, title cards, the letterbox, the Featherbed ring, splashes, tips and the flurry. */
const HUD = { hpTrail: {}, laughs: [], hurts: [], marks: [], flurry: 0, flakes: [] };
S7.HUD = HUD;
S7.bus.on('laugh', d => { HUD.laughs.push({ at: d.at, loud: d.loud, t: 0 }); if (HUD.laughs.length > 12) HUD.laughs.shift(); });
S7.bus.on('hurt', d => { HUD.hurts.push({ from: d.from && (d.from.p || [d.from.x, d.from.y, d.from.z]), t: 0 }); if (HUD.hurts.length > 6) HUD.hurts.shift(); HUD.redT = .3; });
S7.flurry = () => { HUD.flurry = .6; if (S7.game && S7.game.flash && !S7.reduceMotion()) S7.game.flash('#ffffff', .3, .5); emit('flurry', {}); };
S7.reduceMotion = () => !!(S7.game && S7.game.settings && S7.game.settings.reduceMotion);
/** a world point to game pixels (the 3D world's own projection in the page, the director's in Node) */
S7.proj = (p, r) => {
  if (S7.presenter && S7.presenter.project) { const q = S7.presenter.project(p); if (q !== undefined) return q; }
  const q = S7.director.project(p, S7.aspect || 16 / 9); if (!q) return null; return [(q[0] + 1) / 2 * (r ? r.W : 427), (q[1] + 1) / 2 * (r ? r.H : 240)];
};
const safe = r => [Math.round(r.W * .05), Math.round(r.H * .05)];
const firstName = id => S7.PEOPLE[id] ? (S7.PEOPLE[id].persona ? S7.PERSONAS[id].name.split(' ')[0].toUpperCase() : S7.PEOPLE[id].name) : String(id).toUpperCase();
/** a tip's text with its glyphs ({move} -> the chip) */
function richText(g, s, x, y, scale = 1, color = INK) {
  const parts = s.split(/(\{[a-z0-9]+\})/); let w = 0;
  for (const p of parts) { if (!p) continue; const m = p.match(/^\{([a-z0-9]+)\}$/); if (m) w += (g ? chip(g, S7.label(m[1]), x + w, y - 1, { scale }) : promptW(m[1], '', scale) - 4) + 4; else { if (g) txt(g, p, x + w, y + scale, color, { scale }); w += tw(p, scale); } }
  return w;
}

/** mouse picks in the world: hover a marker, click it (filled in from the last frame's marks) */
UI.worldIntent = I => {
  const p = In.ptr(), c = In.click(), dev = S7.game.input.lastDevice;
  if (dev !== 'mouse' && dev !== 'keyboard') return;
  for (const m of HUD.marks) {
    const hov = p && inRect(p, m.rect), hit = c && inRect(c, m.rect);
    if (m.kind === 'branch' && (hov && ptrMoved || hit)) { I.branch = m.i; if (hit) I.clickGo = true; }
    if (m.kind === 'spot' && hit) { I.interact = true; I.interactId = m.id; }
    if (m.kind === 'ring' && hov) I.ringSel = m.id;
    if (m.kind === 'choice' && (hov || hit)) { if (hov) TALK.sel = m.i; if (hit) I.pickChoice = m.i; }
    if (m.kind === 'talk' && hit && !TALK.choices) I.confirm = true;
  }
  if (G.aim.on && p && (S7.game.settings.mouseMode === 'Pointer' || !S7.mouse.locked && dev === 'mouse')) I.pointerAim = [clamp((p[0] - S7.W_ / 2) / (S7.W_ / 2), -1, 1), clamp((p[1] - S7.H_ / 2) / (S7.H_ / 2), -1, 1)];
};

UI.hud = (g, r, dt) => {
  S7.W_ = r.W; S7.H_ = r.H; S7.aspect = r.W / r.H; HUD.marks = [];
  const [mx, my] = safe(r);
  for (const l of HUD.laughs) l.t += dt; HUD.laughs = HUD.laughs.filter(l => l.t < 1.4);
  for (const h of HUD.hurts) h.t += dt; HUD.hurts = HUD.hurts.filter(h => h.t < 1);
  HUD.redT = Math.max(0, (HUD.redT || 0) - dt);
  if (G.card) { drawCard(g, r); return; }
  // the letterbox
  if (G.letterbox > 0) { const h = Math.round(r.H * .12 * G.letterbox); px.rect(g, 0, 0, r.W, h, '#000'); px.rect(g, 0, r.H - h, r.W, h, '#000'); }
  if (HUD.redT > 0 && !S7.reduceMotion()) px.blend(g, HUD.redT, 'normal', () => { px.rect(g, 0, 0, r.W, 6, '#a00010'); px.rect(g, 0, r.H - 6, r.W, 6, '#a00010'); px.rect(g, 0, 0, 6, r.H, '#a00010'); px.rect(g, r.W - 6, 0, 6, r.H, '#a00010'); });
  const hide = CHEATS.hideHud || G.cut || G.attract && false;
  if (!hide && G.area !== 'room7') { if (G.aim.on && G.aim.k > .6) aimHud(g, r); else railMarks(g, r); }
  if (!hide) { personaBlock(g, r, mx, my); topRight(g, r, mx, my); bossBar(g, r); statueMarker(g, r); if (G.area !== 'room7') laughRipples(g, r); }
  if (G.area === 'room7' && !hide && !TALK.open) { const ns = G.near; if (ns) { const t = ns.label || ''; txt(g, t, r.W / 2 - tw(t, 2) / 2, r.H - my - 44, GOLD, { scale: 2 }); } }
  if (G.mode === 'ring') ringHud(g, r);
  // splashes
  SPLASH.forEach((s, i) => {
    const u = 1 - s.t / s.t0, a = Math.min(1, s.t / .2);
    if (s.big) { const sc = 4 + (u < .1 ? (1 - u / .1) * 1.5 : 0); px.blend(g, a, 'normal', () => { E.font.title(g, s.text, r.W / 2, r.H * .36 - sc * 4, { scale: Math.round(sc), colors: ['#ffffff', '#f4f1ea', '#e8e0d8'], outline: '#05040a', depth: 2, depthColor: '#5a0a12', align: 'center' }); px.rect(g, r.W / 2 - tw(s.text, Math.round(sc)) / 2, r.H * .36 + sc * 5, tw(s.text, Math.round(sc)), 2, RED); }); }
    else if (s.at) { const q = S7.proj(s.at, r); if (q) txt(g, s.text, q[0] - tw(s.text) / 2, q[1] - 14 - u * 10, INK); }
    else txt(g, s.text, r.W / 2 - tw(s.text, s.small ? 1 : 2) / 2, r.H * .58 + i * 18, s.small ? GOLD : INK, { scale: s.small ? 1 : 2 });
  });
  // barks (subtitles that don't stop play)
  if (!TALK.open) BARKS.forEach((b, i) => { const s = firstName(b.who) + ': ' + b.text, sc = S7.game.settings.textSize === 'Large' ? 2 : 1, lines = E.font.wrap(s, r.W * .8, { scale: sc }); lines.forEach((l, k) => txt(g, l, r.W / 2 - tw(l, sc) / 2, r.H - my - 70 - (BARKS.length - 1 - i) * 22 + k * 10 * sc, k === 0 ? '#f4e8d0' : '#f4e8d0', { scale: sc })); });
  // the tip
  if (TIPS.cur && !TALK.open && !G.cut) { const d = S7.TIPDEFS[TIPS.cur.id]; if (d) { const w = richText(null, d.text, 0, 0, 1); const x = r.W / 2 - w / 2, y = r.H * .7; px.blend(g, .6, 'normal', () => px.rect(g, x - 8, y - 4, w + 16, 16, '#05040a')); richText(g, d.text, x, y, 1, INK); if (TIPS.cur.t > 14) TIPS.cur = null; } }
  if (!hide) bottomPrompts(g, r, my);
  if (TALK.open) dialogBox(g, r);
  drawFlurry(g, r, dt);
  if (CHEATS.showFps) txt(g, 'HASH ' + S7.hash() + '  ' + (S7.game.fps ? Math.round(S7.game.fps) + ' FPS' : ''), mx, r.H - my - 8, '#80ff80');
};

function personaBlock(g, r, mx, my) {
  const id = G.persona, R0 = G.roster[id], rig = UI.rig(id);
  rig.drawPortrait(g, mx, my, 32, { zoom: 2.2, turn: .5, bg: ['#2a1418', '#0b0a0c'], tint: G.mode === 'frozen' ? '#80c0ff' : undefined });
  px.rect(g, mx, my + 32, 32, 1, RED);
  txt(g, firstName(id), mx + 38, my, INK, { scale: 2 });
  const tr = HUD.hpTrail[id] = approach(HUD.hpTrail[id] ?? R0.hp, R0.hp, 30 / 120), w = 80;
  px.rect(g, mx + 38, my + 18, w + 2, 7, '#05040a'); px.rect(g, mx + 39, my + 19, Math.round(w * tr / R0.max), 5, RED); px.rect(g, mx + 39, my + 19, Math.round(w * R0.hp / R0.max), 5, INK);
  // the Red vial
  const vx = mx + 38 + w + 8, vh = 30, k = clamp(G.red / 300, 0, 1);
  px.rect(g, vx - 1, my - 1, 8, vh + 2, '#05040a'); px.rect(g, vx, my + vh - Math.round(vh * k), 6, Math.round(vh * k), G.healing ? '#ff4050' : '#c01020'); px.rect(g, vx + 1, my, 1, vh, '#ffffff22'.slice(0, 7));
  txt(g, String(Math.round(G.red)), vx + 10, my + vh - 8, '#ff6070');
  if (G.persona === 'dagny' && G.tuck) txt(g, 'TUCK', mx + 38, my + 28, GOLD);
}
function topRight(g, r, mx, my) {
  const x = r.W - mx, s = 'RIME ' + G.rime;
  px.poly(g, [[x - tw(s) - 14, my + 3], [x - tw(s) - 10, my - 1], [x - tw(s) - 6, my + 3], [x - tw(s) - 10, my + 9]], '#80e0ff'); txt(g, s, x - tw(s), my, '#c0f0ff');
  if (G.target === 1) for (let i = 0; i < 3; i++) { const cx = x - 40 + i * 14, cy = my + 22, on = (G.items.edelweiss || 0) > i; for (let a = 0; a < TAU; a += TAU / 6) px.disc(g, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 2, on ? '#ffffff' : '#3a3640'); px.disc(g, cx, cy, 2, on ? GOLD : '#2a2630'); }
  if (G.pins.length) txt(g, 'PINS ' + G.pins.length + '/7', x - tw('PINS ' + G.pins.length + '/7'), my + 32, MUTED);
  if (S7.ECHO && S7.ECHO.on) S7.echoHud(g, r, x, my);
}
function bossBar(g, r) {
  const b = G.boss; if (!b || !b.name || b.phase === 3 && b.id === 'hansi') return;
  const w = Math.round(r.W * .4), x = r.W / 2 - w / 2, y = Math.round(r.H * .05) + 42;
  txt(g, b.name + (b.id !== 'band' ? '  ' + ['', 'I', 'II', 'III'][b.phase] : ''), r.W / 2 - tw(b.name + '  II') / 2, y, INK);
  px.rect(g, x - 1, y + 10, w + 2, 6, '#05040a'); px.rect(g, x, y + 11, Math.round(w * clamp(b.bar ?? 1, 0, 1)), 4, RED);
  if (b.thaw) { const s = 'THE THAW ' + Math.ceil(b.thaw.t); txt(g, s, r.W / 2 - tw(s, 2) / 2, y + 22, '#80e0ff', { scale: 2 }); }
  if (b.id === 'band') { const nm = ['tuba', 'accordion', 'trumpet', 'snare']; nm.forEach((n, i) => { const mu = b.m[i], on = mu.alive && S7.trackOn(n, b.step), xx = x + i * (w / 4); txt(g, n.toUpperCase(), xx + 2, y + 18, !mu.alive ? '#3a3640' : on ? GOLD : MUTED); }); }
}
function statueMarker(g, r) {
  const S = statuesHere(); if (!S.length || G.area === 'room7') return;
  const H = heroPos(), st = S[0].st, d = Math.hypot(st.at[0] - H.x, st.at[1] - H.y) / M, q = S7.proj([st.at[0], st.at[1], st.at[2] + 20], r);
  const name = firstName(S[0].id), s = name + ' ' + Math.round(d) + ' M';
  if (q && q[0] > 10 && q[0] < r.W - 10 && q[1] > 10 && q[1] < r.H - 10) { px.rect(g, q[0] - 3, q[1] - 3, 7, 7, '#80e0ff'); txt(g, s, q[0] - tw(s) / 2, q[1] - 14, '#c0f0ff'); }
  else { const a = q ? Math.atan2(q[1] - r.H / 2, q[0] - r.W / 2) : Math.PI / 2, cx = r.W / 2 + Math.cos(a) * r.W * .38, cy = r.H / 2 + Math.sin(a) * r.H * .36; px.poly(g, [[cx + Math.cos(a) * 8, cy + Math.sin(a) * 8], [cx + Math.cos(a + 2.4) * 6, cy + Math.sin(a + 2.4) * 6], [cx + Math.cos(a - 2.4) * 6, cy + Math.sin(a - 2.4) * 6]], '#80e0ff'); txt(g, s, cx - tw(s) / 2, cy + 8, '#c0f0ff'); }
  if (G.nearStatue) { const k = G.statueHold / 1.5; px.rect(g, r.W / 2 - 40, r.H * .62, 80, 5, '#05040a'); px.rect(g, r.W / 2 - 39, r.H * .62 + 1, Math.round(78 * k), 3, '#80e0ff'); }
}
function laughRipples(g, r) {
  if (!S7.game.settings.laughCues) return;
  const L = HUD.laughs.slice().sort((a, b) => b.loud - a.loud).slice(0, 4), pose = S7.director.pose;
  for (const l of L) {
    const dx = l.at[0] - pose.x, dy = l.at[1] - pose.y, a = angDiff(pose.yaw, Math.atan2(dy, dx)), q = S7.proj(l.at, r);
    if (q && q[0] > 20 && q[0] < r.W - 20 && Math.abs(a) < .6) continue;   // (on screen: the laugh speaks for itself)
    const sx = r.W / 2 + Math.sin(a) * r.W * .46, sy = r.H / 2 - Math.cos(a) * r.H * .44, k = (1 - l.t / 1.4), th = 1 + Math.round(l.loud * 3);
    px.blend(g, k, 'normal', () => { for (let i = -3; i <= 3; i++) { const b = a + i * .05; px.rect(g, r.W / 2 + Math.sin(b) * r.W * .46 - th / 2, r.H / 2 - Math.cos(b) * r.H * .44 - th / 2, th, th, RED); } });
    void sx; void sy;
  }
}
/** rail mode: the junction's branches as markers (hover, click), the interactables, the ski fork */
function railMarks(g, r) {
  const wk = G.walker;
  if (wk.node && G.mode === 'play') {
    const B = branchesAt(wk.node), n = W.rails.nodes[wk.node];
    if (B.length >= 2) B.forEach((e, i) => {
      const atA = e.a === wk.node, p = edgePos(W.rails, e, atA ? Math.min(e.len, 2.6 * M) : Math.max(0, e.len - 2.6 * M)), q = S7.proj([p.x, p.y, p.z + 1.2 * M], r);
      if (!q) return; const foc = i === wk.branch, other = atA ? e.B : e.A, lab = e.label || other.label || '', gated = e.gate && !gateOpen(e.gate), sz = foc ? 7 : 5;
      px.poly(g, [[q[0], q[1] - sz], [q[0] + sz, q[1]], [q[0], q[1] + sz], [q[0] - sz, q[1]]], foc ? RED : '#f4f1ea'); px.poly(g, [[q[0], q[1] - sz + 2], [q[0] + sz - 2, q[1]], [q[0], q[1] + sz - 2], [q[0] - sz + 2, q[1]]], foc ? '#ff6070' : '#0b0a0c');
      if (gated) { const gd = gateDef(e.gate); px.rect(g, q[0] - 3, q[1] - 14, 7, 6, GOLD); if (gd && gd.who) UI.rig(gd.who).drawPortrait(g, q[0] + 8, q[1] - 18, 14, { zoom: 1.6, turn: .5 }); }
      if (foc && lab) txt(g, lab, q[0] - tw(lab) / 2, q[1] + 9, INK);
      HUD.marks.push({ kind: 'branch', i, rect: [q[0] - 10, q[1] - 10, 20, 20] });
    });
    void n;
  }
  const e = curEdge();
  if (e && e.kind === 'ski' && wk.fork) wk.fork.options.forEach((id, i) => { const x = W.rails.byId[id], p = edgePos(W.rails, x, Math.min(x.len, 6 * M)), q = S7.proj([p.x, p.y, p.z + 1.5 * M], r); if (!q) return; const foc = i === wk.fork.pick, lab = x.label || x.B.label || ('WAY ' + (i + 1)); txt(g, lab, q[0] - tw(lab, foc ? 2 : 1) / 2, q[1] - 6, foc ? RED : INK, { scale: foc ? 2 : 1 }); HUD.marks.push({ kind: 'branch', i, rect: [q[0] - 20, q[1] - 10, 40, 20] }); });
  // interactables near: a diamond over each
  const H = heroPos();
  for (const s of W.spots) {
    if (s.kind === 'pickup' || s.kind === 'lookout' || s.kind === 'exposure' || s.hidden && !flag(s.hidden) || s.once && spotDone(s) || s.kind === 'gate' && gateOpen(s.gate)) continue;
    const d = Math.hypot(s.pos[0] - H.x, s.pos[1] - H.y); if (d > 7 * M) continue;
    const q = S7.proj([s.pos[0], s.pos[1], s.pos[2] + 2.2 * M], r); if (!q) continue;
    const near = G.near === s, k = near ? 5 : 3, c = s.kind === 'room7' ? RED : s.kind === 'phone' ? GOLD : '#80e0ff';
    px.poly(g, [[q[0], q[1] - k], [q[0] + k, q[1]], [q[0], q[1] + k], [q[0] - k, q[1]]], c);
    if (s.kind === 'room7') txt(g, '7', q[0] - 2, q[1] - 16, RED, { scale: 1 });
    if (s.kind === 'phone' && !spotDone(s) && Math.floor(G.time * 4) % 2) txt(g, 'RING', q[0] - 9, q[1] - 16, GOLD);
    HUD.marks.push({ kind: 'spot', id: s.id, rect: [q[0] - 8, q[1] - 8, 16, 16] });
  }
}
/** aim mode: the reticle (at the centre or the pointer), ammo, scan ring, reload, warm spot diamonds, damage chevrons, the scope */
function aimHud(g, r) {
  const P = S7.PERSONAS[G.persona], W0 = S7.WEAPONS[P.weapon], w = wstate(G.persona), cx = G.aim.pointer ? (G.aim.pointer[0] + 1) / 2 * r.W : r.W / 2, cy = G.aim.pointer ? (G.aim.pointer[1] + 1) / 2 * r.H : r.H / 2;
  if (G.aim.scope) { const rad = r.H * .42; px.rect(g, 0, 0, r.W / 2 - rad, r.H, '#000'); px.rect(g, r.W / 2 + rad, 0, r.W, r.H, '#000'); for (let y = 0; y < r.H; y++) { const dy = y - r.H / 2, hw = Math.sqrt(Math.max(0, rad * rad - dy * dy)); px.rect(g, r.W / 2 - rad, y, rad - hw, 1, '#000'); px.rect(g, r.W / 2 + hw, y, rad - hw, 1, '#000'); } px.line(g, r.W / 2 - rad, r.H / 2, r.W / 2 + rad, r.H / 2, '#000'); px.line(g, r.W / 2, r.H / 2 - rad, r.W / 2, r.H / 2 + rad, '#000'); }
  // warm spots: revealed and within 30 m
  const eye = S7.eye(), pulse = 4 + Math.sin(G.time * 8) * 1.5;
  const dia = (p, c = '#ff8a30') => { const q = S7.proj(p, r); if (!q) return; px.poly(g, [[q[0], q[1] - pulse - 2], [q[0] + pulse + 2, q[1]], [q[0], q[1] + pulse + 2], [q[0] - pulse - 2, q[1]]], c); px.poly(g, [[q[0], q[1] - pulse], [q[0] + pulse, q[1]], [q[0], q[1] + pulse], [q[0] - pulse, q[1]]], '#0b0a0c00'.slice(0, 7)); px.rect(g, q[0] - 1, q[1] - 1, 2, 2, '#fff0c0'); };
  for (const e of G.enemies) {
    if (!e.alive || e.vis < .5 || V.dist([e.x, e.y, e.z], eye) > 30 * M) continue;
    if (e.spots) { for (const s of bloomSpots(e)) if (e.spots[s.i]) dia(s.pos); }
    else if (!(e.ai === 'plow' && !(e.back > 0))) dia(warmPos(e));
    if (CHEATS.showVolumes) { const q = S7.proj([e.x, e.y, e.z + 16], r); if (q) txt(g, e.type + ' ' + Math.round(e.hp), q[0], q[1], '#80ff80'); }
  }
  for (const b of S7.bossTargets()) if (b.kind === 'warm' && b.window) dia(b.pos, GOLD);
  // the reticle
  const col = w.reloadT > 0 || w.overT > 0 ? MUTED : INK, k = 1 + w.flash * 2;
  if (W0.kind === 'pellets' || W0.kind === 'cone') { const rr = W0.kind === 'cone' ? 18 : 12; for (let a = 0; a < TAU; a += .35) px.dot(g, cx + Math.cos(a) * rr * k * .8, cy + Math.sin(a) * rr * k * .8, col); }
  else if (W0.kind === 'lob') { px.line(g, cx - 6, cy, cx + 6, cy, col); for (let i = 1; i <= 3; i++) px.line(g, cx - 3, cy + i * 5, cx + 3, cy + i * 5, col); }
  else { const gap = 3 + k * 1.5; px.rect(g, cx - gap - 5, cy, 5, 1, col); px.rect(g, cx + gap + 1, cy, 5, 1, col); px.rect(g, cx, cy - gap - 5, 1, 5, col); px.rect(g, cx, cy + gap + 1, 1, 5, col); px.dot(g, cx, cy, RED); }
  // ammo pips, heat, reload
  const n = W0.mag, ww = Math.min(4, Math.floor(120 / n)), ax = r.W / 2 - n * ww / 2, ay = r.H * .62;
  if (W0.heat) { px.rect(g, r.W / 2 - 30, ay, 60, 4, '#2a2630'); px.rect(g, r.W / 2 - 30, ay, Math.round(60 * (1 - w.mag / n)), 4, w.overT > 0 ? '#ff5020' : GOLD); if (w.overT > 0) txt(g, 'OVERHEATED', r.W / 2 - tw('OVERHEATED') / 2, ay + 8, '#ff7040'); }
  else { for (let i = 0; i < n; i++) px.rect(g, ax + i * ww, ay, Math.max(1, ww - 1), 4, i < w.mag ? INK : '#3a3640'); if (w.reloadT > 0) { const tot = W0.perShell ? W0.reload * W0.mag : W0.reload, u = 1 - w.reloadT / tot; txt(g, 'RELOADING', r.W / 2 - tw('RELOADING') / 2, ay + 8, MUTED); px.rect(g, r.W / 2 - 30, ay + 18, Math.round(60 * clamp(u, 0, 1)), 2, INK); } }
  // the scan cooldown ring
  if (G.scanCd > 0) { const u = 1 - G.scanCd / 1.2; for (let a = 0; a < TAU * u; a += .2) px.dot(g, cx + Math.sin(a) * 15, cy - Math.cos(a) * 15, '#80e0ff'); }
  // damage chevrons
  for (const h of HUD.hurts) if (h.from && h.from[0] !== undefined) { const pose = S7.director.pose, a = angDiff(pose.yaw, Math.atan2(h.from[1] - pose.y, h.from[0] - pose.x)), x = r.W / 2 + Math.sin(a) * 40, y = r.H / 2 - Math.cos(a) * 40; px.blend(g, 1 - h.t, 'normal', () => px.poly(g, [[x + Math.sin(a) * 8, y - Math.cos(a) * 8], [x + Math.cos(a) * 6, y + Math.sin(a) * 6], [x - Math.cos(a) * 6, y - Math.sin(a) * 6]], RED)); }
}
function bottomPrompts(g, r, my) {
  const y = r.H - my - 12, wk = G.walker, e = curEdge(), L = [];
  if (G.mode === 'ring') L.push(['ring', 'RELEASE TO CHANGE']);
  else if (TALK.open || G.mode !== 'play') return;
  else if (G.aim.on) { L.push(['fire', 'FIRE'], ['scan', 'SCAN']); const P = S7.PERSONAS[G.persona]; if (P.skill !== 'tuck') L.push(['skill', P.skill === 'longlook' ? (G.aim.scope ? 'SCOPE OFF' : 'SCOPE') : P.skillName.toUpperCase()]); if (!S7.WEAPONS[P.weapon].heat) L.push(['reload', 'RELOAD']); }
  else if (G.nearStatue) L.push(['interact', 'HOLD: CHIP ' + firstName(G.nearStatue) + ' FREE']);
  else if (G.near) L.push(['interact', G.near.kind === 'r7' ? G.near.label : (G.near.kind === 'room7' ? 'ENTER' : G.near.kind === 'phone' ? 'ANSWER' : G.near.kind === 'gate' ? 'USE' : 'CHECK') + ' ' + (G.near.label || '')]);
  else if (e && e.kind === 'ski') { L.push(['move', 'TUCK']); L.push(['turn', 'STOP']); if (G.persona === 'dagny') L.push(['skill', 'RACE TUCK']); if (wk.fork) L.push(['left', 'PICK A LINE']); }
  else if (e && e.kind === 'lift') L.push(['aim', 'AIM']);
  else if (wk.node) { const B = branchesAt(wk.node); if (B.length >= 2) { L.push(['move', 'GO']); L.push(['left', 'PICK']); } else if (B.length === 1 && wk.arrived === B[0].id) L.push(['turn', 'TURN BACK']); else L.push(['move', 'GO']); }
  if (G.area !== 'room7' && !G.aim.on && G.mode === 'play' && !(e && e.kind === 'ski') && aliveEnemies().length) L.push(['aim', 'AIM']);
  if (L.length) UI.prompts(g, r, L.slice(0, 4), y);
}
function dialogBox(g, r) {
  const Lq = TALK.q[TALK.i]; if (!Lq) return;
  const sc = S7.game.settings.textSize === 'Large' ? 3 : 2, bw = Math.round(r.W * .78), bx = Math.round((r.W - bw) / 2), lh = 9 * sc + 2, bh = lh * 3 + 18, by = r.H - Math.round(r.H * .05) - bh - (TALK.choices ? 14 : 0);
  box(g, bx, by, bw, bh, { bg: ['#0e0c10', '#05040a'], border: '#4a2a30' });
  const who = Lq.who, P = S7.PEOPLE[who], name = firstName(who), hasP = P && (P.rig || P.blob) && who !== 'exposure';
  let tx = bx + 8;
  if (hasP && P.rig) { UI.rig(who).drawPortrait(g, bx + 6, by + 6, bh - 12, { zoom: 2.6, turn: .5, bg: ['#2a1418', '#0b0a0c'] }); tx = bx + bh; UI.rig(who)._talk = TALK.shown < Lq.text.length; }
  else if (hasP && P.blob) { drawMurmel(g, bx + 6 + (bh - 12) / 2, by + bh / 2 + 6, (bh - 12) / 2); tx = bx + bh; }
  const nameT = TALK.t < .4 ? 1 + (1 - TALK.t / .4) * .4 : 1;
  txt(g, name, tx, by - 9 - (nameT > 1 ? 2 : 0), RED, { scale: nameT > 1.2 ? 2 : 1 });
  const shown = Lq.text.slice(0, Math.floor(TALK.shown)), lines = E.font.wrap(shown, bx + bw - tx - 8, { scale: sc }), vis = lines.slice(-3);
  vis.forEach((l, i) => txt(g, l, tx, by + 8 + i * lh, Lq.who === 'exposure' ? '#ffe8b0' : INK, { scale: sc }));
  HUD.marks.push({ kind: 'talk', rect: [bx, by, bw, bh] });
  if (TALK.choices && TALK.i === TALK.q.length - 1 && TALK.shown >= Lq.text.length) {
    let x = bx + 10; TALK.choices.forEach((c, i) => { const w = tw(c) + 14, foc = i === TALK.sel; box(g, x, by + bh + 2, w, 13, { bg: foc ? [RED, '#8a1018'] : ['#2a2630', '#16141a'], border: foc ? INK : '#4a4450' }); txt(g, c, x + 7, by + bh + 5, INK); HUD.marks.push({ kind: 'choice', i, rect: [x, by + bh + 2, w, 13] }); x += w + 6; });
  } else if (TALK.shown >= Lq.text.length && Math.floor(UI.t * 3) % 2) txt(g, '▸', bx + bw - 12, by + bh - 12, RED, { scale: 1 });
}
function drawMurmel(g, x, y, R0) { px.disc(g, x, y, R0, '#c8c4bc'); px.disc(g, x - 1, y - 1, R0 - 2, '#f4f4f0'); px.disc(g, x - R0 * .6, y - R0 * .8, R0 * .3, '#f4f4f0'); px.disc(g, x + R0 * .6, y - R0 * .8, R0 * .3, '#f4f4f0'); px.rect(g, x - R0 * .4, y - R0 * .2, 2, 2, '#1a1414'); px.rect(g, x + R0 * .3, y - R0 * .2, 2, 2, '#1a1414'); px.disc(g, x, y + R0 * .15, 2, '#2a1a1a'); px.line(g, x - R0, y + R0 * .3, x + R0, y - R0 * .1, '#d83a2a', 2); }
UI.drawMurmel = drawMurmel;
function drawCard(g, r) {
  const c = G.card; px.rect(g, 0, 0, r.W, r.H, '#000');
  const lines = E.font.wrap(c.title, r.W * .86, { scale: 4 }), sc = lines.length > 2 ? 3 : 4;
  const L2 = E.font.wrap(c.title, r.W * .86, { scale: sc }), y0 = r.H / 2 - L2.length * (sc * 9) / 2 - (c.sub ? 10 : 0);
  if (c.target && c.who && UI.rig(c.who)) UI.rig(c.who).drawPortrait(g, r.W - Math.round(r.W * .05) - 64, Math.round(r.H * .1), 64, { zoom: 3, turn: .3, bg: '#000', tint: '#101010' });
  L2.forEach((l, i) => E.font.title(g, l, r.W / 2, y0 + i * sc * 9, { scale: sc, colors: ['#ffffff', '#f4f1ea', '#d8d0c8'], outline: '#000', depth: 2, depthColor: '#3a0a10', align: 'center' }));
  if (c.sub) txt(g, c.sub, r.W / 2 - tw(c.sub, 2) / 2, y0 + L2.length * sc * 9 + 10, c.dead ? RED : RED, { scale: 2 });
}
function ringHud(g, r) {
  px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
  const R0 = Math.min(r.W, r.H) * .32, cx = r.W / 2, cy = r.H / 2;
  ORDER.forEach((id, k) => {
    const a = -Math.PI / 2 + k / 7 * TAU, x = cx + Math.cos(a) * R0 - 16, y = cy + Math.sin(a) * R0 - 16, ok = S7.canPick(id), sel = G.ringSel === id, cur = G.persona === id, ro = G.roster[id];
    UI.rig(id).drawPortrait(g, x, y, 32, { zoom: 2.2, turn: .5, bg: sel ? ['#8a1a20', '#2a0a0e'] : ['#2a2630', '#101014'], tint: !ro.unlocked ? '#141414' : ro.frozen ? '#80c0ff' : !ok ? '#606060' : undefined });
    if (sel) { px.rect(g, x - 2, y - 2, 36, 2, RED); px.rect(g, x - 2, y + 32, 36, 2, RED); }
    if (cur) px.rect(g, x, y + 34, 32, 1, INK);
    txt(g, String(k + 1), x + 1, y + 1, INK);
    if (id === 'ansel' && G.area !== 'room7') txt(g, 'ROOM 7 ONLY', x + 16 - tw('ROOM 7 ONLY') / 2, y + 36, MUTED);
    HUD.marks.push({ kind: 'ring', id, rect: [x, y, 32, 32] });
  });
  const id = G.ringSel || G.persona, P = S7.PERSONAS[id];
  txt(g, P.name.toUpperCase(), cx - tw(P.name.toUpperCase(), 2) / 2, cy - 12, INK, { scale: 2 }); txt(g, P.epithet + ' · ' + S7.WEAPONS[P.weapon].name, cx - tw(P.epithet + ' · ' + S7.WEAPONS[P.weapon].name) / 2, cy + 6, RED);
  txt(g, P.skillName, cx - tw(P.skillName) / 2, cy + 16, MUTED);
}
function drawFlurry(g, r, dt) {
  if (HUD.flurry > 0) { HUD.flurry -= dt; if (!S7.reduceMotion()) for (let i = 0; i < 60; i++) { const s = (i * 97 + Math.floor(HUD.flurry * 60) * 13) % 1000; px.rect(g, (s * 7.3) % r.W, (s * 3.1 + (.6 - HUD.flurry) * 300) % r.H, 2 + i % 3, 2 + i % 2, '#ffffff'); } }
}
UI.richText = richText;
