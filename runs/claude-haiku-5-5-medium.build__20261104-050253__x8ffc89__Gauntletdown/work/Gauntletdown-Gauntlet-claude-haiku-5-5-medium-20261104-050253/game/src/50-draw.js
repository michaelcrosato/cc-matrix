// Drawing: the floor and its props and lights, the items, generators and monsters, the heroes' rigs, the shots and blasts,
// and the HUD. Everything here reads WORLD; nothing here changes the game.

const ITEM_SPR = { f: SPR.roast, b: SPR.loaf, j: SPR.cider, z: SPR.stew, m: SPR.flask, k: SPR.key, $: SPR.gold, '*': SPR.gem, h: SPR.chest };
const GEN_SPR = { urn: [SPR.urn0, SPR.urn1, SPR.urn2], den: [SPR.den0, SPR.den1, SPR.den2] };

function drawWorld(r) {
  const W = WORLD, map = W.map;
  if (!map) return;
  map.drawFloor(r);
  map.queueWalls(r);
  // torches, set on the floor beside walls (deterministic per floor)
  for (const [x, y] of W.torches) r.prop('torch', x, y, 0, { light: true });
  // the stairs, a flat stairwell on the floor
  if (W.F.stairs[0] >= 0) {
    const sx = (W.F.stairs[0] + .5) * T, sy = (W.F.stairs[1] + .5) * T;
    r.sprite(sx, sy, 0, SPR.stairs, { anchor: 'center' });
    game.lights.add(sx, sy, 10, 40, .6, { color: '#9a88e0' });
  }
  // items: each bobs on its own phase, and a light glows under the gold and the gems
  for (const it of W.items) {
    if (!it.alive) continue;
    const spr = ITEM_SPR[it.ch];
    if (!spr) continue;
    r.shadow(it.x, it.y, 4, .25);
    r.sprite(it.x, it.y, 2 + Math.sin(game.time * 3 + it.bob) * 1.2, spr, { anchor: 'bottom' });
    if (it.ch === '*' || it.ch === 'h') game.lights.add(it.x, it.y, 8, 20, .5, { color: it.ch === '*' ? '#80d8ff' : '#ffd060' });
  }
  // generators, with three damage states
  for (const g of W.gens) {
    if (!g.alive) continue;
    const frac = g.hp / g.max, k = frac > .66 ? 0 : frac > .33 ? 1 : 2;
    const pulse = g.children > 0 ? Math.sin(game.time * 8) * .08 : 0;
    r.shadow(g.x, g.y, 9, .4);
    r.sprite(g.x + (g.shake > 0 ? Math.sin(game.time * 80) * 1 : 0), g.y, 0, GEN_SPR[g.kind][k], { anchor: 'bottom', flash: g.flash > 0 ? '#ffffff' : undefined, glow: pulse + .2 });
    game.lights.add(g.x, g.y, 14, 34, .5 + pulse, { color: g.kind === 'urn' ? '#a0c8ff' : '#ff9060' });
  }
  // monsters: ghosts flutter on sprites; gnashers are rigs
  for (const m of W.monsters) {
    if (!m.alive && m.fade <= 0) continue;
    const alpha = m.alive ? 1 : Math.max(0, m.fade / .4);
    if (m.kind === 'ghost') {
      const frame = SPR.ghost[Math.floor(game.time * 4 + m.bob) % 2];
      const bob = Math.sin(m.bob) * 2;
      r.shadow(m.x, m.y, 6, .25 * alpha);
      r.sprite(m.x, m.y, 8 + bob, frame, { anchor: 'bottom', alpha, flash: m.flash > 0 ? '#ffffff' : undefined, glow: .5 });
    } else {
      if (!m.rig) m.rig = monsterRig(m.kind);
      r.shadow(m.x, m.y, 7, .35 * alpha);
      const rig = m.rig;
      r.actor(m.x, m.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: m.flash > 0 ? '#ffffff' : undefined, alpha: m.hidden ? .25 : alpha });
    }
    if (m.kind === 'gnasher' && m.wind > 0) r.groundArc(m.x, m.y, 6, 22, m.facing - .6, m.facing + .6, '#ff6040', .35);
  }
  // heroes: a ring in the player's colour under each, a rig, and a name
  for (const h of W.heroes) {
    const down = h.down, col = h.color;
    r.shadow(h.body.x, h.body.y, 7, .35);
    if (!down) r.groundArc(h.body.x, h.body.y, 5, 7.5, 0, Math.PI * 2, col, .85);
    const rig = h.rig;
    r.actor(h.body.x, h.body.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: true, flash: h.flash > 0 ? '#ff4040' : (h.invuln > 0 && Math.floor(game.time * 10) % 2 ? '#ffffff' : undefined), tint: down ? '#808080' : undefined });
    if (!down) drawGear(r, h);
    if (down) r.textAt(h.body.x, h.body.y, 22, 'RISE: ' + game.input.label('fire'), '#ffe08a');
    if (!down && prefs.names) r.textAt(h.body.x, h.body.y, 26, h.name, col);
  }
  drawFeatures(r);
  // the hitboxes and the monster targets, when the Dev Tools ask for them
  if (CHEATS.hitboxes) { for (const m of W.monsters) if (m.alive) r.decal(() => r.groundArc(m.x, m.y, m.r - 1, m.r + 1, 0, Math.PI * 2, '#ff4040', .9)); for (const h of W.heroes) r.decal(() => r.groundArc(h.body.x, h.body.y, 4, 6, 0, Math.PI * 2, '#40ff40', .9)); }
  if (CHEATS.flowfield) { for (const m of W.monsters) if (m.alive && W.heroes.length) { const t = nearestHero(m.x, m.y, 1e6); if (t) r.decal(() => r.groundArc(t.body.x, t.body.y, 9, 11, 0, Math.PI * 2, '#ffff40', .6)); } }
  // the shots, the blasts and the puffs
  W.shots && W.shots.draw(r);
  for (const b of W.blasts || []) {
    const k = b.t / .6, rr = 6 + k * 300;
    r.decal(() => r.groundArc(b.x, b.y, rr, rr + 5, 0, Math.PI * 2, b.color, 1 - k));
  }
}

// The HUD: a panel per player along the top (the health as a big number), the floor's name, the captions.
function drawHud(r) {
  const W = WORLD, n = W.heroes.length || 1, slot = r.W / 4;
  W.heroes.forEach((h, i) => {
    const x = Math.round(i * slot + 6), col = h.color;
    r.text(h.def.name, x, 4, col, { scale: 1, shadow: '#000' });
    const hp = Math.max(0, Math.floor(h.hp)), hcol = h.down ? '#8a8a8a' : hp < 200 ? (Math.floor(game.time * 6) % 2 ? '#ff4040' : '#ff8080') : hp < 400 ? '#ffe060' : '#ffffff';
    r.text(h.down ? 'DOWN' : String(hp > 9999 ? '9999+' : hp), x, 13, hcol, { scale: 2, shadow: '#000' });
    r.text('SCORE ' + h.score, x, 30, '#e8e0ff', { scale: 1, shadow: '#000' });
    r.text('K' + h.keys + ' F' + h.flasks, x + Math.floor(slot / 2) + 10, 30, '#c8f0c8', { scale: 1, shadow: '#000' });
    if (h.queasy > 0) r.text('QUEASY', x, 40, '#8ad070', { scale: 1, shadow: '#000' });
  });
  if (W.heroes.length < 4 && !W.attract) r.text('[' + game.input.label('start') + '] TO JOIN', r.W - 6, r.H - 12, '#ffe08a', { align: 'right', shadow: '#000' });
  r.text(STAGE_LABEL(W.stage).toUpperCase() + ' - ' + W.stage.name.toUpperCase(), r.W / 2, 4, '#f0e8ff', { align: 'center', shadow: '#000' });
  if (W.F && W.floorClock > 0 && W.stage.par) {
    const left = Math.max(0, Math.ceil(W.stage.par - W.floorClock));
    r.text('PAR ' + left, r.W / 2, 16, '#a89ac8', { align: 'center', shadow: '#000' });
  }
  drawHudExtra(r);
  if (W.caption) r.text(W.caption, r.W / 2, r.H - 26, '#fff4c8', { align: 'center', shadow: '#000', outline: true });
  if (W.attract) {
    r.text('DEMO', 6, r.H - 12, '#ff8080', { shadow: '#000' });
    if (Math.floor(game.time * 2) % 2) r.text('PRESS ANY BUTTON', r.W - 6, r.H - 12, '#ffffff', { align: 'right', shadow: '#000' });
  }
  if (SESSION) r.text('ROUND', r.W - 6, 40, '#ffe08a', { align: 'right', shadow: '#000' });
  if (CHEATS.god || CHEATS.infinite || CHEATS.freeze || CHEATS.noGen || TUNE_CHANGED()) r.text('DEV', 6, r.H - 22, '#ff9050', { shadow: '#000' });
  if (W.downClock > 0 && W.continueLeft > 0) r.text('CONTINUE? ' + Math.ceil(W.continueLeft), r.W / 2, r.H / 2 - 16, '#ffe060', { align: 'center', scale: 2, shadow: '#000' });
}
const TUNE_CHANGED = () => Object.keys(TUNE).some(k => TUNE[k] !== DEFAULT_TUNE[k]);
