/* ---- DRAWING A MISSION: the world, the actors, the Ki Gauge, the bento, prompts ---- */
const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
const ONIGIRI = E.sprite(['..ww..', '.wwww.', 'wwwwww', 'wwkkww', '.wwww.'], { w: '#f4f0e0', k: '#20301c' });
const BAITSPR = { poison: E.sprite(['..ww..', '.wwww.', 'wwwwww', 'wggggw', '.wwww.'], { w: '#f4f0e0', g: '#8ad040' }), dango: E.sprite(['.p.p.p.', 'pppppp.', '.p.p.p.'], { p: '#f0a0c8' }) };
const SCROLL = E.sprite(['.bbbb.', 'bBBBBb', 'bBwwBb', 'bBBBBb', '.bbbb.'], { b: '#3a2010', B: '#8a3a20', w: '#f0e0b0' });
const FLASK = E.sprite(['..bb..', '..bb..', '.bppb.', 'bppppb', '.bbbb.'], { b: '#3a2010', p: '#b04ad0' });
const mm = v => Math.round(v);

function objTarget() {
  for (const o of S.m.objectives) {
    if (S.obj[o.id]) continue;
    if (o.kind === 'exit') { if (S.m.objectives.filter(x => x.req && x.kind !== 'exit').every(x => S.obj[x.id])) return { x: S.exitPt.x, y: S.exitPt.y, z: 0, label: S.m.exitName, o }; continue; }
    if (o.kind === 'reach') return { x: cc(o.at[0]), y: cc(o.at[1]), z: o.at[2], label: 'ROOF', o };
    if (o.kind === 'item') { const it = o.id === 'flask' ? S.flask : S.ledger; return { x: it.x, y: it.y, z: 0, label: o.id.toUpperCase(), o }; }
    if (o.kind === 'killtag') { const g = S.guards.find(x => x.tag === o.tag); if (g) return { x: g.x, y: g.y, z: g.z, label: 'TARGET', o }; }
    if (o.kind === 'boss') { if (S.boss && S.boss.active && !S.boss.dead) return null; return { x: cc(S.bossCfg.trigger[0]), y: cc(S.bossCfg.trigger[1]), z: S.m.id === 'moon' ? 160 : 0, label: 'DUEL', o }; }
    if (o.kind === 'escort') return { x: S.tobei.x, y: S.tobei.y, z: 0, label: 'TOBEI', o };
    if (o.kind === 'lever') return { x: S.leverPt.x, y: S.leverPt.y, z: 0, label: 'LEVER', o };
    if (o.kind === 'posts') { const p = S.postPts.find(q => !q.cut); return p ? { x: p.x, y: p.y, z: 0, label: 'BARGE', o } : null; }
    if (o.kind === 'cuts') return null;
    if (o.kind === 'killtag') return null;
  }
  return null;
}
function playDraw(r) {
  if (!S) return;
  const m = S.m, hero = S.hero;
  game.cam.offset = [0, -10];
  S.map.drawFloor(r); S.map.queueWalls(r);
  for (const [n, x, y, o] of m.props) if (n !== 'lamp') r.prop(n, cc(x), cc(y), 0, Object.assign({ size: 1.3 }, o));
  for (const l of S.lights) { r.prop('lamp', l.x, l.y, 0, { light: true }); }
  if (m.id === 'rice' || m.id === 'lake') for (const p of (S.postPts || [])) r.prop(p.cut ? 'bush' : 'fence', p.x, p.y, 0, { size: .8 });
  if (S.m.bell) r.shape('barrel', cc(S.m.bell[0]), cc(S.m.bell[1]), 0, { scale: .9 });
  if (S.leverPt) r.prop('sign', S.leverPt.x, S.leverPt.y, 0, { size: 1 });
  if (S.tobei && !S.tobei.free) r.prop('fence', S.tobei.x, S.tobei.y, 0, { size: 1.1 });
  if (S.fireLight > 0) L.add(hero.x, hero.y, 30, 120, S.fireLight, { color: '#ffb060' });
  L.add(hero.x, hero.y, hero.z + 24, 30, .22, { color: '#8090c0' });
  if (m.id === 'moon') L.add(26 * T, 33 * T, 40, 200, .25, { color: '#c8d8ff' });
  for (const g of S.guards) if (!g.dead && g.def === B.ENEMY.ashigaru) L.add(g.x, g.y, g.z + 20, 32, .45, { color: '#ffb060' });
  if (S.ledger && !S.ledger.got) r.sprite(S.ledger.x, S.ledger.y, 6 + Math.sin(game.time * 3) * 1.5, SCROLL, { glow: .6 });
  if (S.flask && !S.flask.got) r.sprite(S.flask.x, S.flask.y, 6 + Math.sin(game.time * 3) * 1.5, FLASK, { glow: .7 });
  for (const p of S.pickups) if (!p.got) { r.sprite(p.x, p.y, 5 + Math.sin(game.time * 3 + p.x) * 1.2, ONIGIRI, { glow: .4 }); }
  // the things on the ground
  for (const t of S.things) {
    if (t.type === 'bait') r.sprite(t.x, t.y, 3, BAITSPR[t.kind], {});
    else if (t.type === 'smoke' && !t.lob) r.groundDisc(t.x, t.y, t.r, '#a0a0b0', .45);
    else if (t.type === 'caltrops') { r.groundDisc(t.x, t.y, t.r, '#505060', .35); }
    else if (t.type === 'fire') r.groundDisc(t.x, t.y, 26, '#ff8030', .4);
    else if (t.type === 'shuriken') r.queue(t.x, t.y, t.z, g => { const [sx, sy] = r.w(t.x, t.y, t.z); px.rect(g, mm(sx) - 1, mm(sy) - 1, 3, 3, '#e8e8f8'); px.dot(g, mm(sx) + 2, mm(sy), '#fff'); }, { emissive: true });
    else if (t.type === 'arrow') r.queue(t.x, t.y, t.z, g => { const [sx, sy] = r.w(t.x, t.y, t.z), [ex, ey] = r.w(t.x - t.vx * .03, t.y - t.vy * .03, t.z); px.line(g, mm(ex), mm(ey), mm(sx), mm(sy), t.fire ? '#ff8030' : '#d8c8a0', 1); }, { emissive: true });
    else if (t.lob || t.type === 'cracker' || t.type === 'firepot') r.queue(t.x, t.y, t.z, g => { const [sx, sy] = r.w(t.x, t.y, t.z); px.disc(g, mm(sx), mm(sy), 2, t.type === 'smoke' ? '#9a9aaa' : '#e8503a'); });
    if (t.type === 'fire' || t.type === 'trail') L.add(t.x, t.y, 10, 44, .7, { color: '#ff8030' });
  }
  // the kaginawa rope
  if (S.grap) { const tg = S.grap.to; r.queue(hero.x, hero.y, hero.z + 30, g => { const a = r.w(hero.x, hero.y, hero.z + 24), b = r.w(tg.ax, tg.ay, tg.z); px.line(g, mm(a[0]), mm(a[1]), mm(b[0]), mm(b[1]), '#c8b080', 1); }, { emissive: true }); }
  // sight cones: only on guards the hero can sense
  const visible = g => S.kiFocus || dist2(g, hero) < 44 || (dist2(g, hero) < 230 && (S.map.los(hero.x, hero.y, g.x, g.y) || Math.abs(g.z - hero.z) > 14));
  for (const g of S.guards) {
    if (g.dead || g.civ && !g.revealed) continue;
    const vis = visible(g), shadow = b => r.shadow(b.x, b.y, g.def.hound ? 4 : 6, .35, undefined, S.map.groundAt(b.x, b.y, b.r, b.z));
    if (!vis) continue;
    if (game.settings.cones !== false && g.sleep <= 0 && g.stun <= 0 && g.blind <= 0 && !g.def.hound) r.sightCone(g, { map: S.map, range: g.def.sight * B.tune.sight * (S.alarm > 0 ? 1.25 : 1), fov: g.def.fov * B.tune.fov, color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .2 : .36 });
  }
  // bodies and actors
  const shadow = (b, rad = 6) => r.shadow(b.x, b.y, rad, .35, undefined, S.map.groundAt(b.x, b.y, b.r, b.z));
  for (const g of S.guards) {
    if (g.sunk) continue;
    const vis = g.dead || visible(g);
    if (!vis) { r.queue(g.x, g.y, g.z + 20, gg => { const [sx, sy] = r.w(g.x, g.y, g.z + 26); px.disc(gg, mm(sx), mm(sy), 2, MOOD[g.mind.state]); px.dot(gg, mm(sx), mm(sy), '#fff'); }, { emissive: true }); continue; }
    shadow(g, g.def.hound ? 4 : 6);
    const aura = S.kiFocus && g.def.disguise && !g.revealed;
    r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { flash: g.stun > 0 && Math.floor(game.time * 10) % 2 === 0 || (aura ? '#ff3020' : false), flashMix: aura ? .5 : .75, alpha: g.hidden ? .4 : 1, xray: g.dead ? false : { actors: false } });
    if (aura) r.groundRing(g.x, g.y, 10, '#ff3020', .9);
  }
  if (S.tobei) { shadow(S.tobei); r.actor(S.tobei.x, S.tobei.y, S.tobei.z, (g, ox, oy) => S.tobei.rig.draw(g, ox, oy, r.view), { xray: { actors: false } }); }
  const b = S.boss;
  if (b && !b.dead) {
    shadow(b, 9); r.actor(b.x, b.y, b.z, (g, ox, oy) => b.rig.draw(g, ox, oy, r.view), { alpha: b.alpha, flash: b.stun > 0 && Math.floor(game.time * 10) % 2 === 0, emissive: b.oni });
    if (b.oni) L.add(b.x, b.y, b.z + 20, 60, .6, { color: '#ff5020' });
    for (const c of b.clones) r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { alpha: .7 });
    if (b.st === 'wind' && b.mv) {   // the telegraph: a red mark where the blow will land
      const mv = b.mv, u = clamp(b.t / mv.wind, 0, 1);
      if (mv.kind === 'melee' || mv.kind === 'combo') r.groundArc(b.x, b.y, 4, mv.range, b.facing - mv.arc, b.facing + mv.arc, '#ff2a20', .25 + u * .4, b.z);
      else if (mv.kind === 'lunge' || mv.kind === 'charge') r.groundArc(b.x, b.y, 4, mv.range * 1.3, b.facing - .22, b.facing + .22, '#ff2a20', .25 + u * .4, b.z);
      else if (mv.kind === 'ring') r.groundRing(b.x, b.y, mv.r1 * u, '#ff6a20', .7, b.z);
      else if (mv.kind === 'roar') r.groundRing(b.x, b.y, 40, '#ff6040', .5, b.z);
    }
    if (b.guard > 0) r.groundRing(b.x, b.y, 14, '#80c0ff', .8, b.z);
  }
  shadow(hero, 6);
  const hz = S.swim ? -5 : 0, ha = S.swim ? (hero.crouch ? .25 : .7) : hero.hidden ? .55 : 1;
  r.actor(hero.x, hero.y, hero.z + hz, (g, ox, oy) => S.rig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: S.hurtT > 0, alpha: ha });
  if (S.swim) r.groundRing(hero.x, hero.y, 7 + Math.sin(game.time * 5) * 1.5, '#8ab8d8', .6);
  if (S.cloak > 0) r.groundRing(hero.x, hero.y, 9, '#c8a860', .5);
  if (B.drawGhosts) B.drawGhosts(r);
  const tg = objTarget(); if (tg && !S.auto) r.marker(tg.x, tg.y, tg.z, { label: tg.label, color: '#ffd040' });
  r.overlay(g => drawHud(g, r));
}
function drawHud(g, r) {
  const W = r.W, H = r.H, hero = S.hero, mg = Math.max(8, Math.round(W * .04)), my = Math.max(6, Math.round(H * .035));
  const tx = (s, x, y, c, o = {}) => E.font.text(g, s, mm(x), mm(y), c, Object.assign({ shadow: '#000', outline: false }, o));
  // ? and ! over the heads, with the awareness meter
  for (const gd of S.guards) if (!gd.dead && (gd.mind.state !== 'calm' || gd.bark > 0) && !gd.sunk && (S.kiFocus || dist2(gd, hero) < 240)) {
    const [sx, sy] = r.w(gd.x, gd.y, gd.z + 46), a = gd.mind.state === 'alert';
    if (gd.mind.state !== 'calm') { E.font.text(g, a ? '!' : '?', mm(sx), mm(sy) - 8, MOOD[gd.mind.state], { align: 'center', shadow: '#000', scale: 1 }); E.ui.bar(g, mm(sx) - 6, mm(sy) + 2, 12, 2, Math.min(1, gd.mind.level), MOOD[gd.mind.state]); }
    if (gd.bark > 0 && gd.barkText) E.font.text(g, gd.barkText, mm(sx), mm(sy) - 18, '#fff', { align: 'center', shadow: '#000', wrap: 150 });
  }
  if (S.boss && S.boss.active && !S.boss.dead) {   // the boss's bar
    const b = S.boss, bw = Math.min(220, W - mg * 2 - 100), bx = mm(W / 2 - bw / 2), by = my + 26;
    tx(b.name.toUpperCase(), W / 2, by - 11, '#ffe0a0', { align: 'center' }); E.ui.box(g, bx - 2, by - 2, bw + 4, 9, { bg: '#10080a', border: '#6a3a3a', gradient: false });
    E.ui.bar(g, bx, by, bw, 5, clamp(b.hp / b.hpMax, 0, 1), b.phase === 2 ? '#ff5a3a' : '#e8a040');
  }
  // objective (top left)
  const cn = game.cornerArea && game.cornerArea(), ox = mg, oy = my;
  const nextObj = S.m.objectives.find(o => !S.obj[o.id] && (o.kind !== 'exit' || S.m.objectives.filter(x => x.req && x.kind !== 'exit').every(x => S.obj[x.id])));
  const ow = Math.min(230, mm(W * .5)), olines = E.font.wrap(nextObj ? nextObj.text : 'Mission complete', ow - 8, {});
  E.ui.box(g, ox - 4, oy - 3, ow + 4, 14 + olines.length * 9, { bg: '#0a0810', border: '#3a3050', alpha: .62, gradient: false });
  tx(S.m.name.toUpperCase(), ox, oy, '#d9b77c');
  olines.forEach((l, i) => tx(l, ox, oy + 11 + i * 9, '#f0e8ff'));
  const tgt = objTarget(); if (tgt && nextObj) tx(mm(Math.hypot(tgt.x - hero.x, tgt.y - hero.y) / 8) + ' m', ox + ow - 24, oy, '#80e0ff');
  // time and score (top right)
  const rx = (cn && cn.y0 < 40 ? Math.floor(cn.x0) - 6 : W - mg), mins = Math.floor(S.t / 60), secs = Math.floor(S.t % 60);
  tx(mins + ':' + String(secs).padStart(2, '0') + ' / par ' + Math.floor(S.m.par / 60) + ':' + String(S.m.par % 60).padStart(2, '0'), rx, my, '#b8b0d8', { align: 'right' });
  tx('CUTS ' + S.cuts + '   SEEN ' + S.detected, rx, my + 11, '#b8b0d8', { align: 'right' });
  if (S.alarm > 0) tx('ALARM BELL  ' + Math.ceil(S.alarm) + 's', rx, my + 22, '#ff6a50', { align: 'right' });
  // stealth status
  const lit = S.lit, status = S.swim ? (hero.crouch ? 'DIVING' : 'SWIMMING') : hero.hidden ? 'HIDDEN' : S.cloak > 0 ? 'CLOAKED' : lit ? 'IN LIGHT' : 'IN SHADOW';
  const stc = hero.hidden ? '#9ae89a' : lit ? '#ffd070' : '#80b0e0';
  // the Ki Gauge (bottom left)
  const kx = mg + 22, ky = H - my - 30, kr = 21;
  px.disc(g, kx, ky, kr + 2, '#05040a'); px.disc(g, kx, ky, kr, S.ki.c);
  px.disc(g, kx, ky, kr - 4, '#0c0a14');
  if (S.ki.g) { const a = Math.atan2(S.ki.g.y - hero.y, S.ki.g.x - hero.x) - r.view.yaw * Math.PI / 180; /* heading arrow */ }
  const pulse = S.ki.v > 60 ? 1 + .08 * Math.sin(game.time * (6 + S.ki.v / 10)) : 1;
  E.font.text(g, String(mm(S.ki.v)), kx, ky - 7, S.ki.c, { align: 'center', scale: 2, shadow: '#000', outline: false });
  E.font.text(g, S.ki.s === 'alert' ? '!' : S.ki.s === 'calm' || !S.ki.g ? 'KI' : '?', kx, ky + 8, S.ki.c, { align: 'center', shadow: '#000', outline: false });
  tx(status, kx + kr + 6, ky - 6, stc); tx(S.kiFocus ? 'KI FOCUS' : lbl('ki') + ' Focus', kx + kr + 6, ky + 5, '#8890a8');
  // health (bottom centre)
  const hw = Math.min(150, W * .28), hx = mm(W / 2 - hw / 2), hy = H - my - 12;
  E.ui.box(g, hx - 3, hy - 3, hw + 6, 10, { bg: '#10080a', border: '#4a3040', gradient: false }); E.ui.bar(g, hx, hy, hw, 4, clamp(S.hp / S.hpMax, 0, 1), S.hp < S.hpMax * .3 ? '#ff4a3a' : '#e85a6a');
  // prompt
  if (S.prompt && !S.auto) { const t = lbl(S.prompt.act).toUpperCase() + '  ' + S.prompt.label; const w = E.font.width(t) + 14; E.ui.box(g, mm(W / 2 - w / 2), hy - 24, w, 14, { bg: '#10080a', border: '#d9b77c', alpha: .8, gradient: false }); tx(t, W / 2, hy - 21, '#ffe9b0', { align: 'center' }); }
  // the bento (bottom right): two tiers of four
  const cw = 20, bx = W - mg - cw * 4 - 4, by = H - my - 44;
  E.ui.box(g, bx - 4, by - 12, cw * 4 + 8, 56, { bg: '#1a1008', border: '#6a4a2a', alpha: .75, gradient: false });
  const cur = S.bento[S.sel]; if (cur) tx(B.TOOLS[cur.tool].name, bx, by - 9, '#f0e0c0');
  S.bento.forEach((s, i) => { const c = i % 4, rr = Math.floor(i / 4), x = bx + c * cw, y = by + rr * 24, tl = B.TOOLS[s.tool];
    px.rect(g, x, y, cw - 2, 22, i === S.sel ? '#5a3a1a' : '#2a1c10'); px.rect(g, x, y, cw - 2, 1, i === S.sel ? '#ffd070' : '#4a3020');
    px.disc(g, x + 9, y + 9, 5, s.n > 0 ? tl.icon : '#3a3030'); tx(String(s.n), x + 9, y + 14, s.n > 0 ? '#fff' : '#665', { align: 'center' }); });
  tx(lbl('use') + ' Use   ' + lbl('cycle') + ' Next', bx, by + 49, '#8890a8');
  // controls strip
  if (game.settings.hints !== false && S.t < 90 && !S.auto) tx(lbl('attack') + ' Cut  ' + lbl('interact') + ' Hook  ' + lbl('block') + ' Guard  ' + lbl('dodge') + ' Roll  ' + lbl('crouch') + ' Crouch', W / 2, H - 9, '#6a7088', { align: 'center' });
  // toasts
  S.toasts.slice(-2).forEach((t, i) => { const y = my + 36 + (S.boss && S.boss.active ? 14 : 0) + i * 24, w = Math.min(W - 40, Math.max(E.font.width(t.text, {}) + 16, E.font.width(t.title) + 16, 120)); const a = clamp(Math.min(t.t, t.max - t.t) * 4, 0, 1);
    if (a < .3) return; E.ui.box(g, mm(W / 2 - w / 2), y, w, t.text ? 22 : 13, { bg: '#0a0810', border: '#d9b77c', alpha: .85, gradient: false }); tx(t.title, W / 2, y + 3, '#ffe9b0', { align: 'center' }); if (t.text) tx(t.text, W / 2, y + 12, '#e0d8f0', { align: 'center' }); });
  // the Silent Cut splash: a red brush slash and the caption
  const f = S.cutFx; if (f && f.t < .8) {
    const u = clamp(f.t / .25, 0, 1), cx = W * .32, cy = H * .38, a = clamp(1 - (f.t - .5) / .3, 0, 1);
    px.blend(g, a, 'normal', () => { px.line(g, mm(cx - 50), mm(cy - 38), mm(cx - 50 + 100 * u), mm(cy - 38 + 76 * u), '#d02a20', 5); if (B.save.chara === 'kaede') px.line(g, mm(cx + 50), mm(cy - 38), mm(cx + 50 - 100 * u), mm(cy - 38 + 76 * u), '#901810', 3); });
    E.font.title(g, 'SILENT CUT', mm(cx), mm(cy + 50), { align: 'center', scale: 2, colors: ['#ffe0d8', '#e0402e', '#901810'], depthColor: '#2a0808' });
    tx(CUT_NAMES[f.kind].toUpperCase(), cx, cy + 70, '#ffd0c0', { align: 'center' });
  }
  if (S.auto) { const t = 'ATTRACT MODE  -  PRESS ANY BUTTON'; if (Math.floor(game.time * 1.6) % 2 === 0) tx(t, W / 2, H - my - 4, '#ffe9b0', { align: 'center' }); }
  if (S.over) { E.ui.box(g, 0, mm(H / 2 - 20), W, 40, { bg: '#200608', border: '#401018', alpha: .8, gradient: false }); E.font.title(g, S.over === 'tobei' ? 'TOBEI FELL' : 'YOU WERE CUT DOWN', mm(W / 2), mm(H / 2 - 10), { align: 'center', scale: 2, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'] }); }
  if (S.done && S.result && !S.m.trial) { E.font.title(g, 'MISSION COMPLETE', mm(W / 2), mm(H / 2 - 20), { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#e0662a'], depth: 2 }); }
  if (B.devHud) B.devHud(g, r);
}
