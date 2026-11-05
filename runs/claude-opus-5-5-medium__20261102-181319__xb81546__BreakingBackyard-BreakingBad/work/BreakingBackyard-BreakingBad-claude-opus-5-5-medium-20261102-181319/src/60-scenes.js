/* ---------------- colour helpers ---------------- */
const mixHex = (a, b, t) => { const pa = E.hex(a), pb = E.hex(b); const c = [0, 1, 2].map(i => Math.round(pa[i] + (pb[i] - pa[i]) * clamp(t, 0, 1))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

/* ---------------- saves ---------------- */
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(S)), place: 'Episode ' + S.ep + ': ' + (EPISODES[S.ep - 1] || EPISODES[4]).title, level: 'Day ' + S.day });
game.saves.read = save => { S = Object.assign(NEW_STATE(), save.data); };
function autosave() { if (W && W.demo) return; if (HUB) return; game.saves.save('auto'); }
function sceneForState() { return S.ep === 5 && S.step >= 1 ? 'lab' : 'town'; }
function newGame() { S = NEW_STATE(); seenTips.clear(); game.go('town', { fresh: true }, { fade: 'iris' }); }
function continueGame() { const s = game.saves.latest(); if (!s) return newGame(); game.saves.load(s.slot); game.go(sceneForState(), { load: true }); }

/* ---------------- the world's drawing: floor, walls, decor, signs, bodies, light ---------------- */
function lightLevel() {
  const c = S.clock;
  if (c >= 7 && c < 18) return 1; if (c >= 18 && c < 20) return lerp(1, .5, (c - 18) / 2); if (c >= 5 && c < 7) return lerp(.5, 1, (c - 5) / 2); return .45;
}
function drawTown(r) {
  const map = W.map, night = lightLevel() < .8;
  map.drawFloor(r); map.queueWalls(r);
  for (const [id, x, y, o] of SOLIDS) r.shape(id, x, y, 0, o);
  for (const [kind, id, x, y, o] of DECOR) {
    if (!r.visible(x, y, 0)) continue;
    if (kind === 'prop') r.prop(id, x, y, 0, id === 'streetlamp' ? { ...o, light: night, cone: night } : o); else r.shape(id, x, y, 0, o);
  }
  for (const [x, y, z, text, col] of SIGNS) if (r.visible(x, y, z)) r.textAt(x, y, z, text, col);
  // windows glow at night; the RV hums with a blue light when there's product cooking
  if (night) {
    for (const [x, y] of [[C(25), C(7)], [C(20), C(17)], [C(27), C(17)], [C(40), C(16)], [C(55), C(30)], [C(19), C(32)], [C(28), C(32)]]) L.add(x, y, 10, 50, .7, { color: '#ffc070' });
    L.add(SPOT.rv.x, SPOT.rv.y - 20, 12, 40, .6, { color: '#80d0ff' });
  }
}
function drawLab(r) {
  W.map.drawFloor(r); W.map.queueWalls(r);
  for (const [id, x, y, o] of LAB_SOLIDS) r.shape(id, x, y, 0, o);
  for (const [x, y] of [[C(6), C(6)], [C(25), C(6)], [C(6), C(13)], [C(25), C(13)], [C(15) + 8, C(10)]]) { L.add(x, y, 40, 90, .8, { color: '#d8f0ff' }); }
  L.add(LAB_SPOT.vela.x, LAB_SPOT.vela.y, 20, 50, .7, { color: '#ffd090' });
  r.textAt(C(15) + 8, C(4), 40, 'OFFICE', '#e8d8b8');
}
function drawActors(r) {
  if (game.settings.cones && W.agents.length) for (const a of W.agents) {
    if (a.stun > 0) continue;
    const col = a.state === 'alert' ? '#ff4030' : a.state === 'search' || a.state === 'notice' ? '#ffa030' : '#ffe080';
    r.sightCone(a, { map: W.map, range: (lightLevel() < .8 ? 85 : 115), fov: 1.35, color: col, alpha: a.state === 'calm' ? .22 : .35 });
  }
  for (const c of W.clouds) r.decal(() => r.groundDisc && r.groundDisc(c.x, c.y, c.r * Math.min(1, c.t), '#6a4a8a', .25));
  for (const b of W.buyers) { drawBody(r, b, { every: 2 }); r.textAt(b.x, b.y, 44, '$', '#9ae07a'); }
  for (const n of W.npcs) drawBody(r, n, {});
  for (const a of W.agents) {
    drawBody(r, a, {});
    if (a.state !== 'calm' && a.stun <= 0) r.textAt(a.x, a.y, 50, a.state === 'alert' ? '!!' : '?', a.state === 'alert' ? '#ff4030' : '#ffc040');
    if (a.stun > 0) r.textAt(a.x, a.y, 46, '@ @', '#d8c8f0');
  }
  for (const e of W.enemies) {
    if (e.dead && e.deadT > 6) continue;
    drawBody(r, e, { shadow: e.boss ? 10 : 7 });
    if (!e.dead && e.state === 'wind' && (e.kind === 'gunner' || e.kind === 'mack')) r.decal(() => r.groundArc(e.x, e.y, 4, 120, e.facing - .04, e.facing + .04, '#ff3020', .5));
    if (!e.dead && e.state === 'charge-wind') r.decal(() => r.groundArc(e.x, e.y, 4, 200, e.chargeDir - .08, e.chargeDir + .08, '#ff3020', .45));
    if (!e.dead && e.atk && e.atk.busy && e.kind === 'cousin' && e.atk.phase === 'wind') r.decal(() => r.groundRing(e.x + Math.cos(e.facing) * 16, e.y + Math.sin(e.facing) * 16, 18, '#ff3020', .6));
    if (!e.dead && !e.boss && e.hp < e.maxHp) r.queue(e.x, e.y, 48, g => { const p = r.w(e.x, e.y, 48); px.rect(g, p[0] - 8, p[1], 16, 2, '#3a0a0a'); px.rect(g, p[0] - 8, p[1], Math.round(16 * e.hp / e.maxHp), 2, '#e84a3a'); });
  }
  for (const h of W.heroes) if (h) drawBody(r, h, { xray: true });
  for (const [id, gh] of W.ghosts) if (gh.area === W.kind) {
    r.shadow(gh.x, gh.y, 6, .2);
    r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .55, outline: gh.color });
    r.textAt(gh.x, gh.y, 48, gh.name, gh.color);
  }
  for (const f of W.flasks) r.sprite(f.x, f.y, f.z, f.kind === 'fulm' ? SPR.flaskF : SPR.flaskS, { rot: f.spin, glow: .4 });
  W.shots.draw(r);
  if (W.lockArena && W.enemies.some(e => !e.dead)) r.decal(() => r.groundRing(W.lockArena.x, W.lockArena.y, W.lockArena.r, '#ff6040', .35));
  // what the mouse or the prompt points at
  if (W.near) r.decal(() => r.groundRing(W.near.x, W.near.y, 10 + Math.sin(game.time * 6), '#ffd36a', .8));
  if (W.hover && W.hover !== W.near) r.decal(() => r.groundRing(W.hover.x, W.hover.y, 10, '#ffffff', .6));
  // the objective marker
  const st = curStep();
  if (st && st.at && !W.demo && W.kind !== 'hub') { const p = st.at(); if (p && (!W.near || dist(W.near, p) > 2)) r.marker(p.x, p.y, 30, { label: '', color: '#ffd040' }); }
}

/* ---------------- the HUD (screen pixels; big, sparse, readable at ten feet) ---------------- */
function drawHUD(r) {
  const h = W.hero; if (!h) return;
  r.overlay(g => {
    const pad = 6;
    // health, cash, product
    E.ui.box(g, pad, pad, 118, 50, { bg: ['#2a1e14', '#120a06'], border: '#8a6a4a', alpha: .82 });
    px.sprite(g, SPR.heart, pad + 6, pad + 6);
    E.ui.bar(g, pad + 18, pad + 7, 92, 6, h.hp / h.maxHp, h.hp > 35 ? '#e8503a' : '#ff2a1a');
    px.sprite(g, SPR.cash, pad + 5, pad + 20); E.font.text(g, fmt$(S.dirty), pad + 18, pad + 19, '#9ae07a', { shadow: '#000' });
    E.font.text(g, fmt$(S.clean), pad + 112, pad + 19, '#ffffff', { align: 'right', shadow: '#000' });
    px.sprite(g, SPR.baggie, pad + 6, pad + 33); E.font.text(g, (Math.round(S.product * 10) / 10) + ' lbs', pad + 18, pad + 33, '#c8f0ff', { shadow: '#000' });
    if (S.product > 0) E.font.text(g, S.purity.toFixed(1) + '%', pad + 112, pad + 33, purityColor(S.purity), { align: 'right', shadow: '#000' });
    // heat and the clock, top right (clear of the corner's buttons when they show)
    const ca = game.cornerArea(), top = ca ? ca.y1 + 4 : pad;
    if (W.kind === 'town') {
      E.ui.box(g, r.W - pad - 92, top, 92, 34, { bg: ['#2a1e14', '#120a06'], border: '#8a6a4a', alpha: .82 });
      E.font.text(g, 'HEAT', r.W - pad - 86, top + 5, S.heat >= 75 ? '#ff5040' : '#e8d8b8');
      for (let i = 0; i < 5; i++) px.sprite(g, S.heat >= (i + 1) * 20 - 10 ? SPR.badge : SPR.badgeOff, r.W - pad - 60 + i * 11, top + 4);
      const hh = Math.floor(S.clock), mm = Math.floor((S.clock % 1) * 6) * 10, ap = hh >= 12 ? 'PM' : 'AM';
      E.font.text(g, 'DAY ' + S.day + '  ' + (((hh + 11) % 12) + 1) + ':' + String(mm).padStart(2, '0') + ' ' + ap, r.W - pad - 86, top + 19, '#c8b090');
    }
    // the objective, top centre
    if (W.kind !== 'hub') {
      const t = objText();
      if (t) {
        const narrow = r.W < 420;
        const w = narrow ? Math.min(r.W - 12, E.font.width(t) + 24) : Math.min(r.W - 260, Math.max(140, E.font.width(t) + 24)), x = Math.round((r.W - w) / 2), oy = narrow ? 60 : pad;
        E.ui.box(g, x, oy, w, 26, { bg: ['#2a1e14', '#120a06'], border: '#c8a060', alpha: .85 });
        E.font.text(g, 'EPISODE ' + S.ep + ' • ' + (EPISODES[S.ep - 1] || EPISODES[4]).title, r.W / 2, oy + 4, '#c8a060', { align: 'center' });
        E.font.text(g, t, r.W / 2, oy + 14, '#fff4d0', { align: 'center', shadow: '#000' });
      }
    }
    // flasks and the gun, bottom left
    const by = r.H - pad - 30;
    E.ui.box(g, pad, by, 104, 30, { bg: ['#2a1e14', '#120a06'], border: '#8a6a4a', alpha: .82 });
    const kinds = S.flags.smoke ? ['fulm', 'smoke'] : ['fulm'];
    kinds.forEach((k, i) => {
      const x = pad + 6 + i * 30, on = S.sel === k;
      if (on) px.rect(g, x - 2, by + 3, 26, 14, '#6a4a22');
      px.sprite(g, k === 'fulm' ? SPR.flaskF : SPR.flaskS, x, by + 5);
      E.font.text(g, '×' + S.flasks[k], x + 8, by + 6, on ? '#fff4d0' : '#a89878');
    });
    E.font.text(g, lbl('throw') + ' throw' + (S.flags.smoke ? '  ' + lbl('cycle') : ''), pad + 6, by + 19, '#c8b090', { font: 'tiny' });
    if (h.gun) E.font.text(g, h.reload > 0 ? 'RELOAD' : h.ammo + '/8', pad + 98, by + 6, h.reload > 0 ? '#ff9a4a' : '#ffe080', { align: 'right' });
    // the prompt: what pressing interact (or clicking) does here
    const tgt = W.near || W.hover;
    if (tgt && !modal) {
      const near = tgt === W.near, s = (near ? lbl('interact') : (isPad() ? '' : 'Click')) + '  ' + tgt.label + (near ? '' : (dist(tgt, h) > 60 ? ' (walk there)' : ''));
      const w = E.font.width(s) + 20, x = Math.round((r.W - w) / 2), y = r.H - pad - 22;
      E.ui.box(g, x, y, w, 20, { bg: ['#4a3420', '#1a1008'], border: '#ffd36a', alpha: .9 });
      E.font.text(g, s, r.W / 2, y + 6, '#fff4d0', { align: 'center', shadow: '#000' });
    }
    // a boss's bar
    const boss = W.enemies.filter(e => e.boss && !e.dead);
    boss.forEach((e, i) => {
      const w = Math.min(220, r.W - 160), x = Math.round((r.W - w) / 2), y = r.H - 60 - i * 18;
      E.font.text(g, e.name || e.kind.toUpperCase(), x, y - 9, '#ffd0c0', { shadow: '#000' });
      E.ui.bar(g, x, y, w, 6, e.hp / e.maxHp, e.stun > 0 ? '#ffd040' : '#d83a2a');
    });
    // player 2
    if (W.partner && !W.partner.ai) { E.font.text(g, 'P2 DUSTY', r.W - pad - 92, r.H - pad - 40, '#ff8a7a', { shadow: '#000' }); E.ui.bar(g, r.W - pad - 92, r.H - pad - 30, 60, 5, W.partner.hp / 100, '#e8503a'); if (W.partner.down) E.font.text(g, 'DOWN ' + Math.ceil(W.partner.downT), r.W - pad - 26, r.H - pad - 31, '#ffffff'); }
    else if (W.kind !== 'hub' && W.partner && W.t < 30 && !W.demo) E.font.text(g, 'P2: Start on pad 2, or 2', r.W - pad, r.H - pad - 10, '#a89878', { align: 'right', font: 'tiny' });
    // the radar (DEA dots with the burner phones)
    if (W.kind === 'town' && (S.up.phone || W.agents.some(a => a.state === 'alert'))) {
      const R = 26, cx = r.W - pad - R - 2, cy = r.H - pad - R - 50;
      px.disc(g, cx, cy, R, '#1a140c'); ringPx(g, cx, cy, R, '#8a6a4a');
      for (const a of W.agents) { const dx = (a.x - h.x) / 6, dy = (a.y - h.y) / 6; if (Math.hypot(dx, dy) < R - 2) px.rect(g, Math.round(cx + dx) - 1, Math.round(cy + dy) - 1, 3, 3, a.state === 'alert' ? '#ff4030' : '#4a8aff'); }
      for (const b of W.buyers) { const dx = (b.x - h.x) / 6, dy = (b.y - h.y) / 6; if (Math.hypot(dx, dy) < R - 2) px.dot(g, Math.round(cx + dx), Math.round(cy + dy), '#9ae07a'); }
      px.rect(g, cx - 1, cy - 1, 3, 3, '#ffffff');
      E.font.text(g, 'RADAR', cx, cy + R + 2, '#a89878', { align: 'center', font: 'tiny' });
    }
    // toasts and the episode card
    { let ty = r.W < 420 ? 92 : 64; for (const t of toasts) { const lines = E.font.wrap(t.text, Math.min(r.W - 40, 380)), w = Math.min(r.W - 20, Math.max(...lines.map(l => E.font.width(l))) + 20), x = Math.round((r.W - w) / 2), hh = 8 + lines.length * 10; E.ui.box(g, x, ty, w, hh, { bg: ['#1a2a3a', '#0a1018'], border: '#8ab0d0', alpha: .9 }); lines.forEach((l, k) => E.font.text(g, l, r.W / 2, ty + 5 + k * 10, '#e8f4ff', { align: 'center' })); ty += hh + 3; } }
    if (card) {
      const a = Math.min(1, card.t, (card.max - card.t) * 3), y = Math.round(r.H * .36);
      px.blend(g, .7 * a, 'normal', () => px.rect(g, 0, y - 10, r.W, 54, '#000000'));
      E.font.text(g, card.a, r.W / 2, y - 4, '#c8a060', { align: 'center' });
      E.font.title(g, card.b, r.W / 2, y + 8, { scale: 3, align: 'center', colors: ['#fff4d0', '#ffd36a', '#a8602a'], outline: '#140804' });
    }
    if (W.demo) { const blink = Math.floor(game.time * 2) % 2; E.font.title(g, TITLE, r.W / 2, r.H - 52, { scale: 2, align: 'center', colors: ['#d8f0d8', '#5ab04a', '#2a6a2a'], outline: '#061006' }); if (blink) E.font.text(g, 'DEMO  •  PRESS ANY BUTTON', r.W / 2, r.H - 30, '#ffffff', { align: 'center', shadow: '#000' }); if (W.caption) E.font.title(g, W.caption, r.W / 2, 64, { scale: 2, align: 'center', colors: ['#ffffff', '#ffd36a', '#c8782a'], outline: '#000' }); }
  });
}

/* ---------------- the ledger: the run at a glance (one page, big type) ---------------- */
class Ledger {
  constructor() { this.kind = 'ledger'; this.t = 0; I.consumeAll(); A.sfx('pause'); }
  update(dt) { this.t += dt; if (this.t > .1 && (I.pressed('ledger') || I.pressed('cancel') || I.pressed('confirm') || I.clicked())) { modal = null; I.consumeAll(); A.sfx('cancel'); } }
  draw(r) {
    r.overlay(g => {
      const w = Math.min(r.W - 20, 340), h = 190, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
      E.ui.box(g, x, y, w, h, { bg: ['#e8dcc0', '#c8b898'], border: '#5a3a1a' });
      for (let ly = y + 30; ly < y + h - 8; ly += 12) px.rect(g, x + 6, ly, w - 12, 1, '#b8a888');
      E.font.title(g, 'THE LEDGER', r.W / 2, y + 8, { scale: 2, align: 'center', colors: ['#3a2a1a', '#2a1a0a', '#1a0a00'], outline: false });
      const L1 = [['Episode', S.ep + ' • ' + (EPISODES[S.ep - 1] || EPISODES[4]).title], ['Next', objText()], ['Day', String(S.day)], ['Dirty cash', fmt$(S.dirty)], ['Clean cash', fmt$(S.clean)], ['Product', (Math.round(S.product * 10) / 10) + ' lbs at ' + S.purity.toFixed(1) + '%'], ['Best batch', S.best ? S.best.toFixed(1) + '%' : '-'], ['Deals / cooks', S.deals + ' / ' + S.cooks], ['Heat', Math.round(S.heat) + ' of 100'], ['Owned', UPGRADES.filter(u => S.up[u.id] && !u.repeat).map(u => u.id).join(', ') || 'nothing yet']];
      L1.forEach(([k, v], i) => { E.font.text(g, k, x + 14, y + 33 + i * 14, '#5a3a1a'); E.font.text(g, v, x + 100, y + 33 + i * 14, '#1a0a00', { wrap: w - 110 }); });
      E.font.text(g, lbl('ledger') + ' close', r.W / 2, y + h + 6, '#ffffff', { align: 'center', shadow: '#000' });
    });
  }
}

/* ---------------- play in the world: the parts every play scene shares ---------------- */
function enterLevel(kind, data) {
  const map = kind === 'lab' ? lab : town;
  newLevel(kind === 'hub' ? 'hub' : kind, map);
  game.cam.bounds = v => map.bounds(v);
  L.enabled = true;
  let at = kind === 'lab' ? LAB_SPOT.start : SPOT.heroStart;
  if (data && data.at === 'home') at = { x: SPOT.home.x, y: SPOT.home.y + 18 };
  const hero = makeHero('hollis', at.x, at.y, I);
  W.hero = hero; W.heroes = [hero];
  W.partnerJoin = () => { if (W.partner) return; const p = makeHero('dusty', hero.x - 20, hero.y + 6, null); W.partner = p; W.heroes.push(p); };
  if (kind !== 'hub' && !(S.ep === 1 && S.step === 0)) W.partnerJoin();
  if (kind !== 'hub') game.allowJoin({ max: 2, onJoin: (inp) => { W.partnerJoin(); W.partner.input = inp; W.partner.ai = false; W.partner.hp = 100; inp.glyphs = game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation'; toast('Player 2 joined as Dusty.'); A.sfx('oneup'); } });
  game.follow(hero, { z: 14 });
  modal = null; toasts.length = 0; card = null;
}
function exitLevel() { game.allowJoin(false); L.enabled = false; modal = null; game.cam.frame(null); }
function playUpdate(dt) {
  W.t += dt;
  for (const t of toasts) t.t -= dt; E.prune(toasts, t => t.t <= 0);
  if (card) { card.t -= dt; if (card.t <= 0) card = null; }
  if (talk.update(dt)) { stopHeroes(dt); npcsUpdate(dt); return true; }
  if (modal) { modal.update(dt); stopHeroes(dt); return true; }
  if (W.dead || W.busted) return true;
  const h = W.hero;
  if (I.pressed('view')) { game.nextView(); game.note(game.view.label || game.view.id); }
  if (I.pressed('ledger') && !W.demo) { modal = new Ledger(); return true; }
  // the controls: the person (or the demo's script)
  if (!W.demo) readCtl(I, h);
  // what's in reach, and what the mouse points at
  const list = interactables();
  let near = null, nd = 26;
  for (const o of list) { const d = dist(o, h); if (d < nd) { nd = d; near = o; } }
  W.near = near; W.hover = null;
  const mp = I.pointer();
  if (mp && I.aimSource === 'mouse' && W.screenPts) for (const o of list) { const p = W.screenPts.get(o.id + o.x); if (p && Math.hypot(p[0] - mp[0], p[1] - mp[1]) < 16) { W.hover = o; break; } }
  if (W.hover && h.ctl.attack && !W.combat) { h.ctl.attack = false; if (dist(W.hover, h) < 60) { W.hover.act(); return true; } W.walkTo = W.hover; }
  if (near && h.ctl.interact && !W.demo) { W.walkTo = null; near.act(); return true; }
  if (W.walkTo) { const t = W.walkTo, d = dist(t, h); if (Math.hypot(h.ctl.mx, h.ctl.my) > .2 || d > 400) W.walkTo = null; else if (d < 20) { W.walkTo = null; t.act(); return true; } else { const a = angTo(h, t); h.ctl.mx = Math.cos(a); h.ctl.my = Math.sin(a); } }
  for (const p of W.heroes) {
    if (p === W.partner) { if (p.ai) partnerAI(p, dt); else readCtl(p.input, p); }
    heroUpdate(p, dt);
    if (W.lockArena && W.enemies.some(e => !e.dead)) { const L0 = W.lockArena, d = Math.hypot(p.x - L0.x, p.y - L0.y); if (d > L0.r) { p.x = L0.x + (p.x - L0.x) / d * L0.r; p.y = L0.y + (p.y - L0.y) / d * L0.r; } }
  }
  const wasCombat = W.combat;
  for (const e of W.enemies) enemyUpdate(e, dt);
  W.combat = W.enemies.some(e => !e.dead);
  if (wasCombat && !W.combat) { W.lockArena = null; E.prune(W.enemies, e => e.dead && e.deadT > 6); music(W.kind === 'lab' ? 'boss' : 'town'); story('clear'); }
  else if (!wasCombat && W.combat && songNow !== 'boss') music('fight');
  W.shots.update(dt, W.map);
  W.shots.hit(W.enemies.filter(e => !e.dead), (b, e) => { hurtEnemy(e, b.dmg, Math.atan2(b.vy, b.vx), 90); b.life = 0; }, 'player');
  W.shots.hit(W.heroes.filter(x => x && !x.down), (b, x) => { if (hurtHero(x, b.dmg, Math.atan2(b.vy, b.vx), 90)) b.life = 0; }, 'enemy');
  flasksUpdate(dt);
  if (W.kind === 'town') {
    syncAgents(); for (const a of W.agents) agentUpdate(a, dt);
    if (!W.agents.some(a => a.state === 'alert')) { S.heat = Math.max(0, S.heat - dt / 6); if (A.layer) A.layer('tension', 0, 1); }
  }
  buyersUpdate(dt); npcsUpdate(dt);
  S.time += dt; S.clock = (S.clock + dt / 30) % 24; S.hp = h.hp;
  // the camera: one hero, or both
  if (W.partner && !W.partner.ai) game.cam.frame([h, W.partner], { margin: 70, zoom: [.7, 1] }); else game.cam.frame(null);
  return false;
}
/* the story's people, standing where the story needs them */
function wantedNpcs() {
  const st = curStep(), id = st && st.id, out = [];
  if (W.kind === 'town') {
    if (!W.partner) out.push(['dusty', SPOT.dusty.x, SPOT.dusty.y - 4]);
    out.push(['skyler', SPOT.skyler.x, SPOT.skyler.y - 4]);
    if (S.ep === 1 && !W.rafaFled) out.push(['rafa', SPOT.rafa.x, SPOT.rafa.y - 4]);
    if (S.ep >= 2) out.push(['lenny', SPOT.lenny.x + 16, SPOT.lenny.y + 2]);
    if (S.ep === 3) out.push(['vela', SPOT.taco.x + 14, SPOT.taco.y + 2]);
  }
  if (W.kind === 'lab' && (id === 'labclear' || id === 'final')) out.push(['vela', LAB_SPOT.vela.x, LAB_SPOT.vela.y - 4]);
  return out;
}
function npcsUpdate(dt) {
  if (W.kind === 'hub') return;
  const want = wantedNpcs(), ids = new Set(want.map(w => w[0]));
  for (const n of W.npcs) if (!ids.has(n.id)) { n.gone = true; if (W.t > .5) P.smoke(n.x, n.y, 8, 6); }
  E.prune(W.npcs, n => n.gone);
  for (const [id, x, y] of want) {
    let n = W.npcs.find(q => q.id === id);
    if (!n) { n = { id, x, y, z: 0, hurtT: 0, facing: Math.PI / 2, rig: (RIGS[id] || RIGS.thug)(), t: 0 }; W.npcs.push(n); }
    n.x = x; n.y = y; n.t += dt;
    const h = W.hero, d = h ? dist(n, h) : 999;
    n.facing = d < 90 ? angTo(n, h) : Math.PI / 2;
    n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.facing, pose: id === 'lenny' && d > 60 ? 'wave' : id === 'vela' || id === 'rafa' ? 'hips' : undefined });
  }
}
function stopHeroes(dt) { for (const p of W.heroes) if (p) { p.vx = p.vy = 0; p.rig.update(dt, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.facing }); } }
function partnerAI(p, dt) {
  const c = p.ctl, h = W.hero; Object.assign(c, blankCtl());
  const d = dist(p, h);
  if (d > 260) { p.x = h.x - Math.cos(h.facing) * 18; p.y = h.y - Math.sin(h.facing) * 18; }
  const tgt = nearestEnemy(p, 170);
  if (d > 30) { const a = angTo(p, h); c.mx = Math.cos(a); c.my = Math.sin(a); c.sprint = d > 80; }
  if (tgt) { c.aim = angTo(p, tgt); p.aiming = .4; if (p.cool <= 0 && p.reload <= 0 && W.map.sight(p, tgt) && E.chance(dt * 2)) c.attack = true; if (d < 60 && dist(p, tgt) < 50) { c.mx = -Math.cos(c.aim); c.my = -Math.sin(c.aim); } }
}
function playDraw(r) {
  const lv = lightLevel();
  L.ambient = W.kind === 'lab' ? .55 : lv;
  if (W.kind === 'lab') drawLab(r); else drawTown(r);
  drawActors(r);
  // where each interactable sits on screen (for the mouse)
  W.screenPts = W.screenPts || new Map(); W.screenPts.clear();
  for (const o of interactables()) W.screenPts.set(o.id + o.x, r.w(o.x, o.y, 14));
  drawHUD(r);
  if (modal) modal.draw(r);
  talk.draw(r);
}

/* ---------------- the attract mode's demo: a cheating AI shows the game off ---------------- */
let savedS = null;
function* demoWalk(to, max = 8) {
  const h = W.hero; let t = 0; h.noclip = true;
  while (dist(h, to) > 12 && t < max) { const a = angTo(h, to); h.ctl.mx = Math.cos(a); h.ctl.my = Math.sin(a); h.ctl.sprint = true; t += 1 / 120; yield; }
  h.ctl.mx = h.ctl.my = 0; h.ctl.sprint = false;
}
function* demoFight(sec) {
  const h = W.hero; let t = 0, k = 0;
  while (t < sec && W.enemies.some(e => !e.dead)) {
    const e = nearestEnemy(h, 300);
    Object.assign(h.ctl, { attack: false, throw: false, mx: 0, my: 0 });
    if (e) {
      h.ctl.aim = angTo(h, e); h.ctl.aimPt = { x: e.x, y: e.y };
      const d = dist(h, e); if (d > 90) { h.ctl.mx = Math.cos(h.ctl.aim); h.ctl.my = Math.sin(h.ctl.aim); } else if (d < 40) { h.ctl.mx = -Math.cos(h.ctl.aim) * .6; h.ctl.my = -Math.sin(h.ctl.aim) * .6; }
      if (k % 50 === 0) h.ctl.attack = true;
      if (k % 150 === 75) { h.ctl.throw = true; S.sel = (k / 150) % 2 < 1 ? 'fulm' : 'smoke'; }
      if (k % 200 === 120) h.ctl.dodge = true; else h.ctl.dodge = false;
    }
    k++; t += 1 / 120; yield;
  }
  Object.assign(h.ctl, blankCtl());
}
function* demoScript() {
  const h = W.hero;
  W.caption = 'COOK IN THE BACKYARD'; yield* demoWalk(SPOT.rv, 4); yield .3;
  modal = new Cook({ auto: true }); yield E.until(() => !modal); W.caption = null;
  W.caption = 'FIGHT WITH CHEMISTRY'; h.noclip = true; yield* demoWalk({ x: C(24), y: C(20) }, 6);
  for (let i = 0; i < 4; i++) makeEnemy(i % 2 ? 'gunner' : 'thug', h.x + Math.cos(i * 1.6) * 90, h.y + Math.sin(i * 1.6) * 70);
  yield* demoFight(14);
  W.caption = 'THE DEA IS WATCHING'; yield* demoWalk({ x: C(31), y: C(23) }, 4); yield* demoWalk({ x: C(47), y: C(23) }, 6);
  W.caption = 'SELL ON THE CORNERS'; const b = W.buyers[0];
  if (b) { yield* demoWalk(b, 8); P.text(b.x, b.y, 34, '+$1,840', '#9ae07a', { scale: 1 }); A.sfx('cash'); S.dirty += 1840; E.prune(W.buyers, x => x === b); yield 1; }
  W.caption = 'LAUNDER THE CASH'; yield* demoWalk(SPOT.carwash, 8); S.clean += Math.floor(S.dirty * .8); S.dirty = 0; A.sfx('cash'); P.glints(h.x, h.y, 24, 12, '#c8f0ff'); yield 1.2;
  W.caption = 'TAKE ON THE CARTEL'; yield* demoWalk({ x: C(40), y: C(20) }, 4);
  makeEnemy('cousin', h.x - 70, h.y - 30, { i: 0, name: 'EZEQUIEL CALACA' }); makeEnemy('cousin', h.x + 70, h.y - 30, { i: 1, name: 'TOMAS CALACA' }); music('boss');
  yield* demoFight(12);
  W.caption = null; yield 1;
  game.go('title', { fromDemo: true });
}

/* ---------------- scenes ---------------- */
const isTouchOnly = () => touchOnly();
const titleItems = () => {
  if (isTouchOnly()) return [{ label: 'SETTINGS', act: () => game.menu('settings') }];
  const save = game.saves.latest();
  return [
    save ? { label: 'CONTINUE', note: save.place + ' • ' + save.level, act: continueGame } : null,
    { label: 'NEW GAME', note: 'Five episodes. One backyard.', act: newGame },
    { label: 'SETTINGS', note: 'Sound, display, button prompts, stick inversion.', act: () => game.menu('settings') },
    { label: 'CONTROLS', note: 'Rebind keys and buttons.', act: () => game.menu('controls') },
    { label: 'ABOUT & CREDITS', note: 'How this was made.', act: () => game.go('about') }
  ].filter(Boolean);
};
const titleBg = new E.Backdrop({ sky: ['#1a1030', '#6a2a3a', '#e87a3a', '#f8c070'], sun: { x: .72, y: .62, r: 26, color: '#ffe0a0' }, layers: [
  { kind: 'mountains', color: '#5a2a32', y: .62, height: .2, parallax: .1 }, { kind: 'hills', color: '#3a1a22', y: .74, height: .12, parallax: .2 }, { kind: 'hills', color: '#22100e', y: .84, height: .1, parallax: .3 }] });
const titleRig = RIGS.hollis(true);
const scenes = {};
scenes.title = {
  enter(data) {
    this.idle = 0; this.i = 0; this.t = 0; this.rows = []; this.lastMouse = I.mouse ? I.mouse.t : 0; music('title'); L.enabled = false;
    if (savedS) { S = savedS; savedS = null; }
    game.view && game.setView('threequarter');
    I.consumeAll();
  },
  update(dt) {
    this.t += dt; titleRig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'hips' });
    const items = titleItems();
    const mouseMoved = I.mouse && I.mouse.t !== this.lastMouse; if (I.mouse) this.lastMouse = I.mouse.t;
    if (I.anyPressed() || mouseMoved || I.clicked()) this.idle = 0; else this.idle += dt;
    if (this.idle > 10) { this.idle = 0; game.go('town', { demo: true }, { fade: 'dissolve' }); return; }
    this.i = clamp(this.i, 0, items.length - 1);
    if (I.repeat('down')) { this.i = (this.i + 1) % items.length; A.sfx('select'); }
    if (I.repeat('up')) { this.i = (this.i + items.length - 1) % items.length; A.sfx('select'); }
    const p = I.pointer();
    if (p && mouseMoved) this.rows.forEach((rw, k) => { if (p[0] >= rw[0] && p[0] <= rw[2] && p[1] >= rw[1] && p[1] <= rw[3] && this.i !== k) { this.i = k; A.sfx('tick'); } });
    const c = I.clicked(); let pick = this.t > .3 && (I.pressed('confirm') || I.pressed('start') || I.pressed('interact'));
    if (c) this.rows.forEach((rw, k) => { if (c[0] >= rw[0] && c[0] <= rw[2] && c[1] >= rw[1] && c[1] <= rw[3]) { this.i = k; pick = true; } });
    if (pick && items[this.i]) { A.sfx('confirm'); items[this.i].act(); }
  },
  draw(r) {
    titleBg.draw(r);
    const items = titleItems();
    r.overlay(g => {
      const cx = Math.round(r.W * .42), ty = Math.round(r.H * .16);
      // the title, in the periodic table's style: Br (bromine, 35) and Ba (barium, 56)
      const el = (x, y, sym, num) => { E.ui.box(g, x, y, 34, 34, { bg: ['#3a8a3a', '#1a5a1a'], border: '#c8f0c8' }); E.font.text(g, String(num), x + 3, y + 3, '#e8ffe8', { font: 'tiny' }); E.font.title(g, sym, x + 17, y + 11, { scale: 2, align: 'center', colors: ['#ffffff', '#e8ffe8', '#a8e0a8'], outline: '#0a2a0a' }); };
      el(cx - 112, ty - 4, 'Br', 35); E.font.title(g, 'EAKING', cx - 72, ty + 6, { scale: 2, colors: ['#ffffff', '#e8f0e0', '#a8c098'], outline: '#0a140a', depth: 2, depthColor: '#1a2a1a' });
      el(cx - 92, ty + 34, 'Ba', 56); E.font.title(g, 'CKYARD', cx - 52, ty + 44, { scale: 2, colors: ['#ffffff', '#e8f0e0', '#a8c098'], outline: '#0a140a', depth: 2, depthColor: '#1a2a1a' });
      E.font.text(g, 'a chemistry teacher, an RV, and a very bad idea', cx - 8, ty + 74, '#ffe8c8', { align: 'center', shadow: '#000' });
      if (r.W > r.H) titleRig.drawPortrait(g, Math.round(r.W * .76), Math.round(r.H * .2), Math.min(110, Math.round(r.H * .42)), { zoom: 1.6, turn: -.35, bg: null, frame: false });
      else titleRig.drawPortrait(g, Math.round(r.W / 2) - 50, Math.round(r.H * .66), 100, { zoom: 1.6, turn: -.35, bg: null, frame: false });
      // the menu
      this.rows = [];
      const my = Math.max(Math.round(r.H * .52), ty + 96);
      if (isTouchOnly()) {
        E.ui.box(g, cx - 120, my - 8, 240, 30, { bg: ['#3a1a1a', '#1a0808'], border: '#ff8a6a' });
        E.font.text(g, 'Controller or keyboard required', cx, my + 3, '#ffe0d0', { align: 'center' });
      }
      items.forEach((it, k) => {
        const y = my + (isTouchOnly() ? 34 : 0) + k * 18, on = k === this.i, w = 150;
        this.rows.push([cx - w / 2, y - 4, cx + w / 2, y + 12]);
        if (on) { E.ui.box(g, cx - w / 2, y - 4, w, 16, { bg: ['#6a4a22', '#3a2410'], border: '#ffd36a' }); }
        E.font.text(g, it.label, cx, y + 1, on ? '#fff4d0' : '#e8d8b8', { align: 'center', shadow: '#000', scale: 1 });
      });
      const it = items[this.i];
      if (it && it.note) E.font.text(g, it.note, cx, my + items.length * 18 + 8, '#c8b090', { align: 'center', shadow: '#000' });
      E.font.text(g, isTouchOnly() ? 'Connect a controller or keyboard to play  •  a demo starts by itself' : (isPad() ? lbl('confirm') + ' select' : 'Enter or click to select') + '   •   2 players: Start on a second pad, or 2', r.W / 2, r.H - 26, '#e8d8b8', { align: 'center', shadow: '#000' });
      E.font.text(g, 'An original game inspired by Breaking Bad • my-3D2dge ' + E.version, r.W / 2, r.H - 12, '#a08870', { align: 'center', font: 'tiny' });
    });
  }
};
scenes.town = {
  get pausable() { return !modal; }, view: 'threequarter', touch: [],
  camera: { zoom: [.75, 2], start: 1 },
  enter(data = {}) {
    if (data.demo) { savedS = S; S = Object.assign(NEW_STATE(), { ep: 3, step: 1, dirty: 2400, clean: 6000, product: 6, purity: 96.2, flags: { smoke: true, shop: true }, flasks: { fulm: 3, smoke: 3 }, up: { pistol: true }, clock: 17.5, heat: 30, alias: true }); }
    enterLevel('town', data);
    if (data.demo) {
      W.demo = true; W.hero.input = null;
      for (let i = 0; i < 3; i++) makeAgent(i, i * 200, i);
      for (let i = 0; i < 3; i++) spawnBuyer();
      this.viewT = 0; this.mouseT = I.mouse ? I.mouse.t : 0; this.demoT = 0;
      game.script(demoScript);
      music('town');
      return;
    }
    if (data.fresh) { stepEnter(); autosave(); }
    else { const st = curStep(); if (st && ON_ENTER[st.id] && (st.id === 'fight1' || st.id === 'cousins')) ON_ENTER[st.id](); else if (st && ON_ENTER[st.id]) ON_ENTER[st.id](); }
    if (S.ep === 1 && S.step >= 3) W.rafaFled = true;
    if (S.ep >= 2) for (let i = 0; i < 3; i++) spawnBuyer();
    if (data.cook) modal = new Cook({});
    music(W.combat || W.enemies.length ? (songNow === 'boss' ? 'boss' : 'fight') : 'town');
    if (!W.enemies.length) music('town');
  },
  exit() { exitLevel(); },
  update(dt) {
    if (W.demo) {
      this.demoT += dt;
      const mm2 = I.mouse && I.mouse.t !== this.mouseT;
      if ((I.anyPressed() || I.clicked() || mm2) && this.demoT > .5) { game.go('title', { fromDemo: true }); return; }
      this.viewT += dt; if (this.viewT > 9) { this.viewT = 0; game.nextView(); }
    }
    if (playUpdate(dt)) return;
    const st = curStep();
    if (st && st.ev === 'arena' && dist(W.hero, SPOT.arena) < 70) story('arena');
  },
  draw(r) { playDraw(r); }
};
scenes.lab = {
  get pausable() { return !modal; }, view: 'threequarter', touch: [],
  camera: { zoom: [.75, 2], start: 1 },
  enter(data = {}) {
    enterLevel('lab', data);
    const st = curStep();
    if (st && st.id === 'labclear') {
      for (const [x, y, k] of [[6, 7, 'gunner'], [25, 7, 'gunner'], [8, 12, 'thug'], [23, 12, 'thug'], [15, 9, 'gunner']]) makeEnemy(k, C(x), C(y));
      const m = makeEnemy('mack', LAB_SPOT.mack.x, LAB_SPOT.mack.y, { name: 'MACK, THE CLEANER' }); m.cd = 2.5;
      game.after(.6, () => convo([['mack', ['No half measures. Not today, Mr. Gray.']], ['dusty', ['Mr. G, that\'s the cleaner guy. The one who cleans PEOPLE.']]]));
      music('boss');
      W.say = id => { if (id === 'mack_adds') say('mack', ['Boys. Clean this up.'], { modal: false, auto: 2 }); };
    } else music('ending');
  },
  exit() { exitLevel(); },
  update(dt) { playUpdate(dt); },
  draw(r) { playDraw(r); }
};
scenes.night = {
  enter() { this.t = 0; this.done = false; music('ending'); this.rigs = [speaker('dale').rig, speaker('skyler').rig, RIGS.hollis(S.alias)]; sleepNow(); },
  update(dt) {
    this.t += dt;
    for (const rg of this.rigs) rg.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
    if (talk.update(dt)) return;
    if (this.t > 1.2 && !this.done) { this.done = true; if (S.ep > EPISODES.length) return; game.go(sceneForState(), { at: 'home' }, { fade: 'dissolve' }); }
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#140e10');
      px.rect(g, 0, 0, r.W, r.H * .66, '#2a2030'); px.rect(g, r.W * .1, r.H * .12, r.W * .22, r.H * .26, '#0a0a1a');
      px.disc(g, r.W * .2, r.H * .2, 8, '#f0e8c8');
      px.rect(g, r.W * .3, r.H * .55, r.W * .5, 10, '#6a4a2a'); px.rect(g, r.W * .3, r.H * .55 + 10, r.W * .5, 4, '#3a2a1a');
      this.rigs.forEach((rg, i) => rg.drawPortrait(g, Math.round(r.W * (.36 + i * .16)), Math.round(r.H * .3), 50, { zoom: 2.2, turn: (i - 1) * .3, bg: null, frame: false }));
      E.font.text(g, 'NIGHT • DAY ' + (S.day - 1), r.W / 2, 10, '#c8a060', { align: 'center' });
    });
    talk.draw(r);
  }
};
scenes.busted = {
  enter() {
    this.t = 0; music(null); A.sfx('siren'); S.busts++;
    this.lost = { product: S.product, cash: Math.floor(S.dirty * .3) };
    S.product = 0; S.dirty -= this.lost.cash; S.heat = 20; S.clock = (S.clock + 6) % 24; S.hp = 100;
    autosave();
  },
  update(dt) { this.t += dt; if (this.t > 1.5 && (I.pressed('confirm') || I.pressed('interact') || I.clicked())) game.go('town', { at: 'home' }); },
  draw(r) {
    const red = Math.floor(this.t * 3) % 2;
    r.sky([red ? '#3a0a0a' : '#0a0a3a', '#000000']);
    r.overlay(g => {
      E.font.title(g, 'BUSTED', r.W / 2, r.H * .28, { scale: 4, align: 'center', colors: ['#ffffff', '#ff6a5a', '#8a1a1a'], outline: '#000' });
      E.font.text(g, 'Lenny had you out by morning. It cost you.', r.W / 2, r.H * .5, '#e8d8d0', { align: 'center' });
      E.font.text(g, 'Seized: ' + (Math.round(this.lost.product * 10) / 10) + ' lbs of product and ' + fmt$(this.lost.cash) + ' in "legal fees".', r.W / 2, r.H * .5 + 14, '#c8b0a8', { align: 'center' });
      if (this.t > 1.5) E.font.text(g, lbl('confirm') + ' continue', r.W / 2, r.H * .72, '#ffffff', { align: 'center', shadow: '#000' });
    });
  }
};
scenes.dead = {
  enter(data = {}) {
    this.t = 0; this.from = data.from; music(null); A.sfx('die');
    this.menu = [{ label: 'TRY AGAIN', act: () => { const s = game.saves.load('auto'); if (s) game.go(sceneForState(), { load: true }); else newGame(); } }, { label: 'QUIT TO TITLE', act: () => game.go('title') }];
    this.i = 0; this.rows = [];
  },
  update(dt) {
    this.t += dt; if (this.t < 1) return;
    if (I.repeat('down') || I.repeat('up')) { this.i = 1 - this.i; A.sfx('select'); }
    const c = I.clicked(), p = I.pointer();
    if (p) this.rows.forEach((rw, k) => { if (p[0] >= rw[0] && p[0] <= rw[2] && p[1] >= rw[1] && p[1] <= rw[3]) this.i = k; });
    let pick = I.pressed('confirm') || I.pressed('interact');
    if (c) this.rows.forEach((rw, k) => { if (c[0] >= rw[0] && c[0] <= rw[2] && c[1] >= rw[1] && c[1] <= rw[3]) { this.i = k; pick = true; } });
    if (pick) { A.sfx('confirm'); this.menu[this.i].act(); }
  },
  draw(r) {
    r.sky(['#1a0a08', '#000000']);
    r.overlay(g => {
      E.font.title(g, 'YOU\'RE DONE', r.W / 2, r.H * .25, { scale: 3, align: 'center', colors: ['#ffffff', '#c8b090', '#5a3a1a'], outline: '#000' });
      E.font.text(g, ['"I did it for my family." That\'s what they all say.', 'The desert keeps its secrets. And yours.', 'Somewhere, Lenny is billing your estate.'][S.kos % 3], r.W / 2, r.H * .45, '#c8b0a8', { align: 'center' });
      this.rows = [];
      this.menu.forEach((m, k) => { const y = r.H * .6 + k * 18, on = k === this.i; this.rows.push([r.W / 2 - 70, y - 4, r.W / 2 + 70, y + 12]); if (on) E.ui.box(g, r.W / 2 - 70, y - 4, 140, 16, { bg: ['#6a4a22', '#3a2410'], border: '#ffd36a' }); E.font.text(g, m.label, r.W / 2, y + 1, on ? '#fff4d0' : '#c8b090', { align: 'center' }); });
    });
  }
};
const EPILOGUE = [
  'The superlab under Lavanderia Brillante burned for six hours.',
  'Dale Kowalski\'s task force sifted the ash for a week. They found fused glass, a melted desk, and no names.',
  'Taco Tranquilo closed "for renovations". It never reopened.',
  'Lenny Shapiro bought a second billboard.',
  'In a backyard on Piedra Lane, an old RV sat cooling in the evening light.',
  'Hollis Gray had done it for his family. He told himself that.\n\nMostly.'
];
scenes.ending = {
  enter() { this.t = 0; this.i = 0; this.boom = 0; music(null); A.sfx('boom'); game.shake(8); game.flash('#ffffff', .4); log('ending', S.time); try { E.store.set('bb-complete', true); } catch (e) { /* storage blocked */ } game.saves.erase && game.saves.erase('auto'); },
  update(dt) {
    this.t += dt;
    if (this.t > 2 && songNow !== 'ending') music('ending');
    if (this.t > 2.5 && (I.pressed('confirm') || I.pressed('interact') || I.clicked())) { this.i++; this.t = 2.5; A.sfx('text'); if (this.i >= EPILOGUE.length) game.go('credits'); }
  },
  draw(r) {
    r.sky(['#0a0604', '#2a1608', '#6a3a18']);
    r.overlay(g => {
      if (this.t < 2.5) { const a = 1 - this.t / 2.5; px.blend(g, a, 'add', () => px.rect(g, 0, 0, r.W, r.H, '#ff8a3a')); E.font.title(g, 'BOOM', r.W / 2, r.H * .4, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd040', '#ff5020'] }); return; }
      E.font.text(g, 'EPILOGUE', r.W / 2, r.H * .18, '#c8a060', { align: 'center' });
      E.font.text(g, EPILOGUE[Math.min(this.i, EPILOGUE.length - 1)], r.W / 2, r.H * .38, '#fff4d0', { align: 'center', wrap: Math.min(r.W - 40, 300) });
      E.font.text(g, lbl('confirm') + ' continue', r.W / 2, r.H * .82, '#c8b090', { align: 'center' });
    });
  }
};
scenes.credits = {
  enter() { this.t = 0; music('title'); },
  update(dt) { this.t += dt; if (this.t > 1 && (I.pressed('confirm') || I.pressed('cancel') || I.pressed('interact') || I.clicked()) || this.t > 40) game.go('title'); },
  draw(r) {
    r.sky(['#0a0a14', '#1a1428']);
    const lines = ['BREAKING BACKYARD', '', 'An original spiritual successor to', 'Breaking Bad (2008-2013)', '', 'Design, code, writing, music, sound', 'Claude (Anthropic, claude-opus-5-5)', '', 'Engine', 'my-3D2dge ' + E.version + ' by Michael Crosato', '', 'Online', 'AI Hub Session Protocol v1', '', 'Starring', 'Hollis Gray • Dusty Pickett • Lenny Shapiro', 'Augusto Vela • Dale Kowalski • Marian Gray', 'Rafa Ybarra • the Calaca cousins • Mack', '', 'No chemistry in this game is real.', 'Please do not try any of it.', '', 'Thank you for playing.'];
    r.overlay(g => { const y0 = r.H - this.t * 22; lines.forEach((ln, i) => { const y = Math.round(y0 + i * 14); if (y > -10 && y < r.H) E.font.text(g, ln, r.W / 2, y, i === 0 ? '#ffd36a' : ln === ln.toUpperCase() && ln ? '#c8a060' : '#e8e0d0', { align: 'center', scale: i === 0 ? 2 : 1 }); }); });
  }
};
scenes.about = {
  enter() { this.page = 0; this.t = 0; this.scroll = 0; },
  update(dt) {
    this.t += dt; const n = ABOUT.length;
    if (I.repeat('right')) { this.page = (this.page + 1) % n; this.scroll = 0; A.sfx('select'); }
    if (I.repeat('left')) { this.page = (this.page + n - 1) % n; this.scroll = 0; A.sfx('select'); }
    if (I.down('down')) this.scroll += dt * 80; if (I.down('up')) this.scroll = Math.max(0, this.scroll - dt * 80);
    const c = I.clicked(); if (c && this.btn) { if (c[0] < this.btn[0]) { this.page = (this.page + n - 1) % n; this.scroll = 0; } else if (c[0] > this.btn[1]) { this.page = (this.page + 1) % n; this.scroll = 0; } }
    const z = I.zoom && I.zoom(); if (z && z !== 1) this.scroll = Math.max(0, this.scroll + (z < 1 ? 20 : -20));
    if (this.t > .3 && (I.pressed('cancel') || I.pressed('confirm'))) game.go('title');
  },
  draw(r) {
    r.sky(['#1a120a', '#0a0604']);
    r.overlay(g => {
      const pg = ABOUT[this.page], w = Math.min(r.W - 24, 400), x = Math.round((r.W - w) / 2);
      E.font.title(g, pg.title, r.W / 2, 8, { scale: 2, align: 'center', colors: ['#fff4d0', '#ffd36a', '#a8602a'], outline: '#140804' });
      E.font.text(g, '← ' + (this.page + 1) + ' / ' + ABOUT.length + ' →', r.W / 2, 28, '#c8a060', { align: 'center' });
      this.btn = [r.W / 2 - 20, r.W / 2 + 20];
      let y = 44 - Math.round(this.scroll);
      for (const [k, v] of pg.rows) {
        const hk = k ? E.font.lineHeight() + 2 : 0;
        const lines = E.font.wrap(v, w - (k ? 0 : 0));
        if (y > 36 && y < r.H - 20 && k) E.font.text(g, k, x, y, '#c8a060');
        y += hk;
        for (const ln of lines) { if (y > 36 && y < r.H - 20) E.font.text(g, ln, x, y, '#f0e8d8'); y += E.font.lineHeight() + 1; }
        y += 5;
      }
      E.font.text(g, lbl('left') + ' ' + lbl('right') + ' page   ' + lbl('up') + ' ' + lbl('down') + ' scroll   ' + lbl('cancel') + ' back', r.W / 2, r.H - 12, '#a08870', { align: 'center' });
    });
  }
};
