/* ---- THE HUD (canvas, anchored to r.W / r.H inside 4% overscan): health and the Silent Cut count (top left), toasts,
 * the boss bar and the alarm banner (top centre), the moon timer and place names (top right), the Ki Gauge with the
 * light eye (bottom left), the tool box and compass (bottom right), context prompts with glyphs (bottom centre), marks
 * over guards, chevrons at the edges, telegraph decals, the letterbox, the brush splash and the red edge pulse ---- */
const Hud = { toasts: [], tut: null, lb: 0, lbTo: 0, splashT: 0, splashK: null, pulseT: 0, tele: [], card: null, place: null, placeT: 0, lessonT: 0, lessonK: null, alarmT: 0, objT: 0 };
Hud.toast = (title, text = '', secs = 3.2) => { Hud.toasts = Hud.toasts.filter(t => t.title !== title); Hud.toasts.push({ title, text, t: secs, max: secs }); if (Hud.toasts.length > 3) Hud.toasts.shift(); };
Hud.tutorial = (title, text, secs = 14) => { Hud.tut = { title, text, t: secs }; };
Hud.objective = o => { Hud.toast(o.optional ? 'Optional' : 'Objective', o.text, 4); };
Hud.letterbox = secs => { Hud.lbTo = 1; Hud.lbT = secs; };
Hud.splash = (kind, mark) => { Hud.splashT = 1.1; Hud.splashK = { kind, mark, seed: (crand() * 999) | 0 }; };
Hud.pulse = () => { Hud.pulseT = .45; };
Hud.telegraph = (a, reach, arc, t) => Hud.tele.push({ kind: 'arc', a, x: a.x, y: a.y, z: a.z, f: a.facing, r: reach, arc, t, max: t });
Hud.telegraphRing = (a, r, t) => Hud.tele.push({ kind: 'ring', x: a.x, y: a.y, z: a.z || 0, r, t, max: t });
Hud.telegraphLine = (a, ang, len, t) => Hud.tele.push({ kind: 'line', x: a.x, y: a.y, z: a.z || 0, f: ang, r: len, t, max: t });
Hud.bossCard = (name, title) => { Hud.card = { name, title, t: 3 }; };
Hud.lesson = k => { Hud.lessonK = k; Hud.lessonT = 2.2; };
Hud.reset = () => { Hud.toasts = []; Hud.tut = null; Hud.lb = 0; Hud.lbTo = 0; Hud.splashT = 0; Hud.tele = []; Hud.card = null; Hud.place = null; Hud.lessonT = 0; Hud.pulseT = 0; };
Hud.update = (dt, M) => {
  const rd = dt / Math.max(.05, game.timeScale);   // (real time: slow motion does not stretch the HUD)
  for (const t of Hud.toasts) t.t -= rd; Hud.toasts = Hud.toasts.filter(t => t.t > 0);
  if (Hud.tut) { Hud.tut.t -= rd; if (Hud.tut.t <= 0) Hud.tut = null; }
  if (Hud.lbT > 0) { Hud.lbT -= rd; if (Hud.lbT <= 0) Hud.lbTo = 0; }
  const want = M && (M.cine > 0 || Cutscene.busy()) ? 1 : Hud.lbTo; Hud.lb = approach(Hud.lb, want, rd * 4);
  Hud.splashT = Math.max(0, Hud.splashT - rd); Hud.pulseT = Math.max(0, Hud.pulseT - rd); Hud.lessonT = Math.max(0, Hud.lessonT - rd);
  if (Hud.card) { Hud.card.t -= rd; if (Hud.card.t <= 0) Hud.card = null; }
  for (const t of Hud.tele) { t.t -= dt; if (t.a && t.kind === 'arc') { t.x = t.a.x; t.y = t.a.y; t.f = t.a.facing; } } Hud.tele = Hud.tele.filter(t => t.t > 0);
  if (M && M.hero) { const z = M.world.zoneAt(M.hero.x, M.hero.y); if (z && z !== Hud.place) { Hud.place = z; Hud.placeT = 3; } if (!z) Hud.place = null; Hud.placeT = Math.max(0, Hud.placeT - rd); }
};
/** the context prompts: what the buttons do here, at most two */
Hud.prompts = (M) => {
  const h = M.hero, out = []; if (!h || h.dead || h.action) return out;
  const cut = SilentCut.find(h, M);
  if (cut) out.push(['attack', 'Silent Cut \u2014 ' + SilentCut.LABEL[cut.kind] + (cut.victim.kind === 'civ' && !cut.victim.disguised ? ' (civilian!)' : cut.victim.mark ? ' (mark)' : '')]);
  else if (Combat.riposteTarget(h, M)) out.push(['attack', 'Riposte']);
  const ix = Mission.nearInteract(M, h), e = M.escort;
  if (h.drag) out.push(['interact', 'Drop body']);
  else if (ix) out.push(['interact', (ix.hold ? 'Hold: ' : '') + ix.text, ix.hold ? ix.progress / ix.hold : undefined]);
  else if (e && e.alive && !e.caged && Math.hypot(e.x - h.x, e.y - h.y) < 22) out.push(['interact', e.wait ? 'Follow me' : 'Wait here']);
  else if (Hero.bodyNear(h, M) && !h.swim) out.push(['interact', 'Drag body']);
  if (out.length < 2 && h.swim) out.push(['crouch', h.dive ? 'Surface' : 'Dive']);
  if (out.length < 2 && Grapple.best && !h.swim && !h.drag) out.push(['grapple', 'Grapple']);
  return out.slice(0, 2);
};
const MARK = { notice: ['?', '#f0d050'], search: ['?', '#f09040'], alert: ['!', '#ff4a3a'] };
/** world-space marks: awareness over guards, bark bubbles, breath, stamina, the objective marker, telegraphs */
Hud.world = (r, M) => {
  const h = M.hero;
  for (const t of Hud.tele) {
    const k = clamp(1 - t.t / t.max, 0, 1), a = .25 + .45 * k;
    if (t.kind === 'arc') r.decal(g => r.groundArc(t.x, t.y, 4, t.r, t.f - t.arc, t.f + t.arc, '#ff3a2a', a, t.z, g));
    else if (t.kind === 'ring') { r.decal(g => r.groundRing(t.x, t.y, t.r, '#ff3a2a', a, t.z)); r.decal(g => r.groundDisc(t.x, t.y, t.r * k, '#ff3a2a', a * .4, t.z)); }
    else r.decal(g => { const c = Math.cos(t.f), s = Math.sin(t.f), w = 7; const P = [r.w(t.x + s * w, t.y - c * w, t.z), r.w(t.x + c * t.r + s * w, t.y + s * t.r - c * w, t.z), r.w(t.x + c * t.r - s * w, t.y + s * t.r + c * w, t.z), r.w(t.x - s * w, t.y + c * w, t.z)]; px.blend(g, a, 'normal', () => px.poly(g, P, '#ff3a2a')); });
  }
  r.overlay(g => {
    const focus = M.focus;
    for (const a of M.guards.concat(M.civs, M.bosses)) {
      if (!a.alive || a.sunk || a.vis === 'hidden') { if (a.alive === false && !a.sunk && !a.hidden && B.Dev && B.Dev.flags.ai) { const p = r.w(a.x, a.y, a.z + 8); E.font.text(g, 'body', p[0], p[1], '#c8c0b0', { align: 'center', font: 'tiny' }); } continue; }
      const [sx, sy] = r.w(a.x, a.y, a.z + (a.kind === 'boss' ? 64 : a.A && a.A.hound ? 22 : 44)), ox = Math.round(sx), oy = Math.round(sy);
      if (a.asleep || a.status.sleep > 0) { const b = Math.sin(game.real * 2 + a.uid) * 2; E.font.text(g, 'Zz', ox + 4, oy - 4 + b, '#c8d8ff', { shadow: '#000', outline: false }); }
      else if (a.status.eat > 0) E.font.text(g, '...', ox, oy - 2, '#f4ead5', { align: 'center', shadow: '#000', outline: false });
      else if (a.status.stagger > 0) { for (let i = 0; i < 3; i++) { const an = game.real * 5 + i * 2.1; px.dot(g, ox + Math.cos(an) * 6, oy - 2 + Math.sin(an) * 2, '#ffe08a'); } }
      else if (a.mind && MARK[a.mind.state] && a.kind !== 'civ') { const [ch, c] = MARK[a.mind.state]; E.font.text(g, ch, ox, oy - 9, c, { align: 'center', shadow: '#000', outline: false, scale: a.mind.state === 'alert' ? 2 : 1 }); E.ui.bar(g, ox - 6, oy + 1, 12, 2, Math.min(1, a.mind.level), c); }
      else if (a.kind === 'civ' && a.status.flee > 0) E.font.text(g, '!', ox, oy - 9, '#ffd0d0', { align: 'center', shadow: '#000', outline: false });
      if (focus && a.disguised) { px.blend(g, .5 + .3 * Math.sin(game.real * 6), 'add', () => px.disc(g, ox, oy + 18, 10, '#ff2a1a')); }
      if (a.say && a.vis === 'visible') Hud.bubble(g, r, a);
      const mp = game.input.pointer && B.mouseMode() && game.input.pointer();
      if (mp && a.kind !== 'boss' && Math.hypot(mp[0] - sx, mp[1] - sy - 22) < 14) { E.font.text(g, (a.A && a.A.label) || 'Guard', ox, oy - 20, '#f4ead5', { align: 'center', shadow: '#000', outline: false, font: 'tiny' }); }
    }
    for (const a of [M.escort].concat(M.npcs || [])) if (a && a.say) Hud.bubble(g, r, a);
    if (h && !h.dead) {
      const [hx, hy] = r.w(h.x, h.y, (h.drawZ !== undefined ? h.drawZ : h.z) + 44);
      if (h.dive || h.breath < T('breath') - .5) { const n = Math.ceil(h.breath / T('breath') * 6); for (let i = 0; i < 6; i++) px.disc(g, hx - 10 + i * 4, hy - 4, 1.5, i < n ? '#bfe6ff' : '#3a4a5a'); }
      if (h.staminaMax && h.stamina < h.staminaMax - .5) { const k = h.stamina / h.staminaMax, n = 12; for (let i = 0; i < n; i++) { const an = -Math.PI / 2 + i / n * TAU, on = i / n < k; px.dot(g, hx + 9 + Math.cos(an) * 4, hy + 6 + Math.sin(an) * 4, on ? (h.exhausted ? '#ff6a4a' : '#9ae89a') : '#2a2a2a'); } }
    }
    // chevrons toward alerted enemies off screen
    for (const a of M.guards) {
      if (!a.alive || !a.mind || a.mind.state !== 'alert') continue;
      const [sx, sy] = r.w(a.x, a.y, a.z + 20); if (sx > 8 && sx < r.W - 8 && sy > 8 && sy < r.H - 8) continue;
      const cx = clamp(sx, 10, r.W - 10), cy = clamp(sy, 18, r.H - 18), an = Math.atan2(sy - r.H / 2, sx - r.W / 2);
      px.poly(g, [[cx + Math.cos(an) * 5, cy + Math.sin(an) * 5], [cx + Math.cos(an + 2.4) * 4, cy + Math.sin(an + 2.4) * 4], [cx + Math.cos(an - 2.4) * 4, cy + Math.sin(an - 2.4) * 4]], '#ff4a3a');
    }
  });
  // the objective marker
  if (game.settings.marker && M.mode !== 'attract') { const t = Hud.target(M); if (t) r.marker(t.x, t.y, t.z || 0, { label: t.label, color: '#e8b04a' }); }
};
Hud.bubble = (g, r, a) => {
  const [sx, sy] = r.w(a.x, a.y, (a.drawZ !== undefined ? a.drawZ : a.z) + (a.kind === 'boss' ? 70 : 50)), txt = a.say.text, lines = E.font.wrap(txt, 120), w = Math.max(...lines.map(l => E.font.width(l))) + 8, hh = lines.length * 9 + 4;
  const x = Math.round(clamp(sx - w / 2, 2, r.W - w - 2)), y = Math.round(clamp(sy - hh - 4, 16, r.H - hh - 2));
  px.blend(g, .85, 'normal', () => { px.rect(g, x, y, w, hh, '#f4ead5'); px.rect(g, x + 1, y + hh, w - 2, 1, '#8a8070'); });
  px.poly(g, [[clamp(sx, x + 4, x + w - 4) - 3, y + hh], [clamp(sx, x + 4, x + w - 4) + 3, y + hh], [clamp(sx, x + 4, x + w - 4), y + hh + 4]], '#f4ead5');
  lines.forEach((l, i) => E.font.text(g, l, x + 4, y + 2 + i * 9, '#1a1418', { outline: false }));
};
/** where the objective marker points: the first active required objective's place */
Hud.target = M => {
  for (const o of M.objectives) {
    if (o.state !== 'active' || o.optional) continue;
    if (o.type === 'assassinate') { const a = Mission.find(M, o.target); if (a && a.alive) return { x: a.x, y: a.y, z: a.z + 40, label: '' }; }
    if (o.type === 'defeat') { const b = M.bosses.find(b => b.id === o.boss); if (b && !b.defeated) return { x: b.x, y: b.y, z: b.z + 60, label: '' }; }
    if (o.type === 'rescue' && M.escort) return { x: M.escort.x, y: M.escort.y, z: M.escort.z + 34, label: '' };
    if ((o.type === 'interact' || o.type === 'stopTimer') && o.interact) { const ids = [].concat(o.interact), ix = M.interacts.find(i => ids.includes(i.id) && !i.done); if (ix) return { x: ix.x, y: ix.y, z: ix.z + 20, label: '' }; }
    if (o.type === 'stopTimer') { const ix = M.interacts.find(i => !i.done && i.do && i.do.some(a => a[0] === 'stopTimer')); if (ix) return { x: ix.x, y: ix.y, z: ix.z + 20 }; }
    if ((o.type === 'reach' || o.type === 'escort') && o.zone) return { x: (o.zone[0] + o.zone[2] + 1) * 8, y: (o.zone[1] + o.zone[3] + 1) * 8, z: (o.z || 0) + 8, label: '' };
    if ((o.type === 'reach' || o.type === 'escort') && M.exit) return { x: M.exit.x, y: M.exit.y, z: M.world.map.groundAt(M.exit.x, M.exit.y) + 8, label: 'EXIT' };
    if (o.type === 'retrieve') { const p = M.pickups.find(p => p.id === o.pickup && !p.taken); if (p) return { x: p.x, y: p.y, z: p.z + 10 }; }
  }
  return null;
};
/** the screen HUD */
Hud.draw = (r, M) => {
  const h = M.hero, W = r.W, H = r.H, mx = Math.round(W * .04), my = Math.round(H * .04), attract = M.mode === 'attract';
  r.overlay(g => {
    // letterbox and the red edge pulse
    if (Hud.lb > .01) { const b = Math.round(H * .11 * Hud.lb); px.rect(g, 0, 0, W, b, '#000'); px.rect(g, 0, H - b, W, b, '#000'); }
    if (Hud.pulseT > 0) px.blend(g, Hud.pulseT, 'normal', () => { px.rect(g, 0, 0, W, 4, '#c81a20'); px.rect(g, 0, H - 4, W, 4, '#c81a20'); px.rect(g, 0, 0, 4, H, '#c81a20'); px.rect(g, W - 4, 0, 4, H, '#c81a20'); });
    if (Perception.ki >= 50 && game.settings.heartbeat && !attract) { const k = (Perception.ki - 50) / 50, a = (Math.sin(game.real * (5 + k * 9)) * .5 + .5) * .25 * k; if (a > .02) px.blend(g, a, 'normal', () => { px.rect(g, 0, 0, W, 2, '#a01418'); px.rect(g, 0, H - 2, W, 2, '#a01418'); }); }
    if (M.focus) px.blend(g, .24, 'normal', () => px.rect(g, 0, 0, W, H, '#3a3a4e'));   // Ki Focus: the world loses its colour
    if (!h || Hud.lb > .9 && !attract) { Hud.splashDraw(g, r); return; }
    // ---- top left: health (a vermilion brush stroke), the crest, the Silent Cut count, Tobei ----
    const hw = Math.min(110, Math.round(W * .28)), hk = clamp(h.hp / h.maxHp, 0, 1);
    px.sprite(g, Art.crest, mx, my - 1);
    px.rect(g, mx + 17, my + 3, hw + 2, 8, '#1a1010'); px.rect(g, mx + 18, my + 4, hw, 6, '#3a1414');
    px.rect(g, mx + 18, my + 4, Math.round(hw * hk), 6, hk < .3 ? '#ff4a3a' : '#d8402a'); px.rect(g, mx + 18, my + 4, Math.round(hw * hk), 2, '#f08060');
    for (let x = mx + 18 + Math.round(hw * hk) - 3; x < mx + 18 + Math.round(hw * hk); x++) px.dot(g, x + 1, my + 4 + ((x * 7) % 5), '#d8402a');
    Art.kanji(g, 'sei', mx + 18, my + 13, .3, '#d02a20', '#2a0404', 3); Art.kanji(g, 'zan', mx + 29, my + 13, .3, '#d02a20', '#2a0404', 4);
    E.font.text(g, '\u00d7 ' + M.stats.silentCuts, mx + 41, my + 15, '#f4ead5', { shadow: '#000', outline: false });
    if (M.escort && !M.escort.caged) { const e = M.escort; Cutscene.rig('tobei').drawPortrait(g, mx, my + 26, 18, { zoom: 1.5, turn: .5, bg: '#1a2a1a' }); const n = 6; for (let i = 0; i < n; i++) px.rect(g, mx + 22 + i * 7, my + 32, 5, 5, i < Math.ceil(e.hp / e.hpMax * n) ? '#5ad05a' : '#2a3a2a'); E.font.text(g, e.wait ? 'Waiting' : 'Following', mx + 22, my + 39, '#b8d8b0', { font: 'tiny', outline: false }); }
    // ---- top centre: boss bar, the alarm banner, toasts, the boss card ----
    let ty = my;
    const boss = M.bossFight;
    if (boss && boss.alive && !boss.defeated) {
      const bw = Math.min(220, Math.round(W * .5)), bx = Math.round((W - bw) / 2), k = clamp(boss.hp / boss.maxHp, 0, 1);
      E.font.text(g, boss.D.name.toUpperCase(), W / 2, ty, '#f4ead5', { align: 'center', shadow: '#000', outline: false });
      px.rect(g, bx - 1, ty + 9, bw + 2, 7, '#100808'); px.rect(g, bx, ty + 10, bw, 5, '#3a1010'); px.rect(g, bx, ty + 10, Math.round(bw * k), 5, boss.phase ? '#ff6a2a' : '#c8202a'); px.rect(g, bx, ty + 10, Math.round(bw * k), 1, '#ffa080');
      for (const p of boss.D.phases) px.rect(g, bx + Math.round(bw * p), ty + 8, 1, 9, '#f4ead5');
      ty += 22;
    }
    if (M.alarm.rung && Math.floor(game.real * 2) % 2 === 0 && M.guards.some(g2 => g2.alive && g2.mind && g2.mind.state === 'alert')) { E.font.title(g, 'ALARM!', W / 2, ty, { align: 'center', scale: 2, colors: ['#ffd0a0', '#ff4a3a'], depth: 1 }); ty += 18; }
    for (const t of Hud.toasts) {
      const a = clamp(Math.min(t.t, t.max - t.t) * 4, 0, 1), tw = Math.max(E.font.width(t.title), t.text ? Glyph.text(null, t.text, 0, 0, '', { dry: true }) : 0) + 16, tx = Math.round((W - tw) / 2);
      px.blend(g, .8 * a, 'normal', () => px.rect(g, tx, ty, tw, t.text ? 22 : 13, '#140c0c'));
      px.blend(g, a, 'normal', () => { px.rect(g, tx, ty, tw, 1, '#e8b04a'); E.font.text(g, t.title, W / 2, ty + 3, '#e8b04a', { align: 'center', outline: false }); if (t.text) Glyph.text(g, t.text, W / 2, ty + 12, '#f4ead5', { align: 'center', shadow: false }); });
      ty += t.text ? 25 : 16;
    }
    if (Hud.card) { const c = Hud.card, a = clamp(Math.min(c.t, 3 - c.t) * 3, 0, 1), y = Math.round(H * .3); px.blend(g, a, 'normal', () => { px.rect(g, 0, y - 4, W, 34, '#100808'); px.rect(g, 0, y - 4, W, 1, '#c8202a'); px.rect(g, 0, y + 29, W, 1, '#c8202a'); E.font.title(g, c.name.toUpperCase(), W / 2, y, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd0a0', '#ff6a3a'], depth: 2 }); E.font.text(g, c.title, W / 2, y + 19, '#e8b04a', { align: 'center', outline: false }); }); }
    // ---- top right: the moon timer, the place ----
    let ry = my;
    if (M.timer && !M.timer.stopped) {
      const k = 1 - M.timer.t / M.timer.max, cx = W - mx - 22, cy = ry + 16, red = M.timer.t < 60;
      for (let i = 0; i <= 16; i++) { const an = Math.PI + i / 16 * Math.PI; px.dot(g, cx + Math.cos(an) * 18, cy + Math.sin(an) * 18, '#5a5a7a'); }
      const an = Math.PI + k * Math.PI; Art.moon(g, Math.round(cx + Math.cos(an) * 18), Math.round(cy + Math.sin(an) * 18), 4, red ? '#ff8a6a' : '#f4ecd0');
      E.font.text(g, fmtTime(M.timer.t), cx, cy + 2, red ? '#ff6a4a' : '#f4ead5', { align: 'center', shadow: '#000', outline: false }); ry += 30;
    }
    if (Hud.place && Hud.placeT > 0) { const a = clamp(Hud.placeT, 0, 1); px.blend(g, a, 'normal', () => E.font.text(g, Hud.place.name, W - mx, ry, '#e8dcc0', { align: 'right', shadow: '#000', outline: false })); }
    // ---- bottom left: the Ki Gauge (number, ring, ? or !), the eye (closed in shadow, open in light) ----
    if (!attract) {
      const kx = mx + 22, ky = H - my - 8, ks = Perception.kiState, col = Perception.COLOR[ks], K = Perception.ki;
      px.disc(g, kx, ky, 21, '#100a0a'); for (let i = 0; i <= 24; i++) { const an = Math.PI + i / 24 * Math.PI, on = i / 24 <= K / 99; px.rect(g, kx + Math.cos(an) * 18 - 1, ky + Math.sin(an) * 18 - 1, 2, 2, on ? col : '#2a2a30'); }
      E.font.text(g, String(K).padStart(2, '0'), kx, ky - 14, col, { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (ks !== 'calm') E.font.text(g, ks === 'alert' ? '!' : '?', kx + 16, ky - 22, col, { scale: 2, shadow: '#000', outline: false });
      const L = Perception.exp, ey = ky - 2, open = L > .55 ? 2 : L > .2 ? 1 : 0;
      px.rect(g, kx - 6, ey - 1, 13, 3, '#100a0a');
      if (open === 0) px.rect(g, kx - 5, ey, 11, 1, '#8a8aa8'); else { px.ell ? px.ell(g, kx, ey, 6, open === 2 ? 3 : 1.5, '#e8e0d0') : px.rect(g, kx - 5, ey - (open === 2 ? 2 : 1), 11, open === 2 ? 5 : 3, '#e8e0d0'); px.disc(g, kx, ey, open === 2 ? 2 : 1, '#1a1418'); }
      E.font.text(g, M.focus ? 'FOCUS' : open === 0 ? 'SHADOW' : open === 1 ? 'DIM' : 'LIT', kx, ky + 4, M.focus ? '#c8a8ff' : '#a8a090', { align: 'center', font: 'tiny', outline: false });
    }
    // ---- bottom right: the tool box, its neighbours, the compass ----
    if (!attract) {
      const bx = W - mx - 30, by = H - my - 30, sl = Hero.slot(h), n = h.bento.length;
      px.rect(g, bx - 2, by - 2, 32, 32, '#e8b04a'); px.rect(g, bx - 1, by - 1, 30, 30, '#1a1010'); px.rect(g, bx, by, 28, 28, '#2a1414');
      if (sl) { px.sprite(g, Art.icon[B.get('tool', sl.tool).icon], bx + 2, by + 2, { scale: 2 }); E.font.text(g, String(M.cheats.infinite ? '\u221e' : sl.n), bx + 27, by + 20, '#f4ead5', { align: 'right', shadow: '#000', outline: false }); E.font.text(g, B.get('tool', sl.tool).name, bx + 14, by - 11, '#e8dcc0', { align: 'center', shadow: '#000', outline: false }); }
      for (const [d, ox] of [[-1, -16], [1, 34]]) { for (let k = 1; k <= n; k++) { const i = ((h.sel + d * k) % n + n) % n, c = h.bento[i]; if (c && c.n > 0 && i !== h.sel) { px.blend(g, .6, 'normal', () => px.sprite(g, Art.icon[B.get('tool', c.tool).icon], bx + ox, by + 8)); break; } } }
      if (Glyph.device() === 'pad') { Glyph.draw(g, 'toolPrev', bx - 17, by + 19); Glyph.draw(g, 'toolNext', Math.min(r.W - 11, bx + 33), by + 19); }
      const cx = bx - 34, cy = by + 10, yaw = (game.yaw || 0) * Math.PI / 180, north = r.w(game.cam.tx || 0, (game.cam.ty || 0) - 30, 0), here = r.w(game.cam.tx || 0, game.cam.ty || 0, 0), an = Math.atan2(north[1] - here[1], north[0] - here[0]);
      void yaw; px.disc(g, cx, cy, 7, '#100a0a'); px.line(g, cx, cy, cx + Math.cos(an) * 6, cy + Math.sin(an) * 6, '#ff5a3a'); px.line(g, cx, cy, cx - Math.cos(an) * 4, cy - Math.sin(an) * 4, '#a8a090'); E.font.text(g, 'N', cx + Math.cos(an) * 10, cy + Math.sin(an) * 10 - 3, '#f4ead5', { align: 'center', font: 'tiny', outline: false });
    }
    // ---- bottom centre: prompts ----
    if (!attract) {
      const pr = Hud.prompts(M); let py = H - my - 12;
      for (const [act, label, prog] of pr.reverse()) {
        const w = Glyph.text(null, '{a:' + act + '} ' + label, 0, 0, '', { dry: true }) + 12, x = Math.round((W - w) / 2);
        px.blend(g, .7, 'normal', () => px.rect(g, x, py - 3, w, 14, '#140c0c'));
        Glyph.text(g, '{a:' + act + '} ' + label, W / 2, py, '#f4ead5', { align: 'center' });
        if (prog !== undefined) E.ui.bar(g, x + 2, py + 10, w - 4, 2, prog, '#e8b04a');
        py -= 17;
      }
    }
    // ---- tutorial card ----
    if (Hud.tut && !attract) {
      const t = Hud.tut, tw = Math.min(200, Math.round(W * .45)), lines = Hud.wrapGlyph(t.text, tw - 10), th = 16 + lines.length * 9, tx = mx, tyy = H - my - 56 - th;
      px.blend(g, .85, 'normal', () => px.rect(g, tx, tyy, tw, th, '#140c0c')); px.rect(g, tx, tyy, 2, th, '#e8b04a');
      E.font.text(g, t.title, tx + 6, tyy + 3, '#e8b04a', { outline: false });
      let i = 0; for (const seg of lines) { Glyph.text(g, seg, tx + 6, tyy + 13 + i * 9, '#f4ead5', { shadow: false }); i++; }
    }
    if (Hud.lessonT > 0 && Hud.lessonK) { const a = clamp(Hud.lessonT * 2, 0, 1), txt = { parry: 'An overhead! Tap {a:block} just before it lands: parry.', dodge: 'A lunge! {a:block} + {a:jump} with a direction: roll aside.', block: 'A combo! Hold {a:block} facing him.' }[Hud.lessonK]; px.blend(g, a, 'normal', () => Glyph.text(g, txt, W / 2, Math.round(H * .66), '#ffe08a', { align: 'center' })); }
    Hud.splashDraw(g, r);
  });
};
/** wrap text that holds {a:x} tokens (a token counts as a 4-letter word) */
Hud.wrapGlyph = (text, w) => {
  const words = text.split(' '), out = []; let line = '';
  for (const wd of words) { const tryL = line ? line + ' ' + wd : wd; if (Glyph.text(null, tryL, 0, 0, '', { dry: true }) > w && line) { out.push(line); line = wd; } else line = tryL; }
  if (line) out.push(line); return out;
};
/** the Silent Cut splash: 静斬 in red brush (chalk white for a training mark), an ink burst, a caption */
Hud.splashDraw = (g, r) => {
  if (Hud.splashT <= 0 || !Hud.splashK) return;
  const k = Hud.splashT, a = clamp(k * 3, 0, 1), s = 2, x = Math.round(r.W * .16), y = Math.round(r.H * .3), mark = Hud.splashK.mark, c = mark ? '#f4f0e6' : '#d02a20', edge = mark ? '#8a8a8a' : '#3a0806';
  px.blend(g, a, 'normal', () => {
    Art.splat(g, x + 33 * s, y + 30, 14 + (1.1 - k) * 18, mark ? '#d8d0c0' : '#7a0a0e', Hud.splashK.seed);
    Art.kanji(g, 'sei', x, y, s, c, edge, Hud.splashK.seed); Art.kanji(g, 'zan', x + 33 * s, y + 6, s, c, edge, Hud.splashK.seed + 1);
    E.font.text(g, mark ? 'SILENT MARK' : 'SILENT CUT', x + 33 * s, y + 70, '#f4ead5', { align: 'center', shadow: '#000', outline: false });
    E.font.text(g, SilentCut.LABEL[Hud.splashK.kind] || '', x + 33 * s, y + 80, '#e8b04a', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
  });
};
B.Hud = Hud;
