// ===== part 4: the play scene's step and picture, the HUD, the music ==========================================
let musicNow = null;
function setMusic(song, key) { if (musicNow === key) return; musicNow = key; game.audio.music(song, { fade: 1.2 }); }
function musicStep() {
  if (mode === 'cook') return setMusic(AU.songs.cook, 'cook');
  if (mapName === 'lab') return setMusic(AU.songs.boss, 'boss');
  const fight = anyChase() || lists.thugs.some(t => !t.dead && t.state !== 'idle' && dist(t, hero) < 150);
  setMusic(fight ? AU.songs.chase : AU.songs.explore, fight ? 'chase' : 'explore');
}

const SPR = {
  cash: E.sprite(['.gggg.', 'gGGGGg', 'gGyyGg', 'gGGGGg', '.gggg.'], { g: '#2a7a3a', G: '#6fd36a', y: '#f0e88a' }, 1),
  ammo: E.sprite(['.yyyy.', 'yYYYYy', 'yYddYy', 'yYYYYy', '.yyyy.'], { y: '#b08a30', Y: '#e8c050', d: '#7a5a20' }, 1),
  pill: E.sprite(['.rrww.', 'rRRWWw', '.rrww.'], { r: '#c02020', R: '#ff5a4a', w: '#d8d8d8', W: '#ffffff' }, 1)
};

// ---- the step ---------------------------------------------------------------------------------------------------------------------
function worldStep(dt) {
  const c = readCtrl(dt);
  babbleStep();
  if (mode === 'cook') { cookStep(dt); updateCustomers(dt); stepRigsIdle(dt); return; }
  if (mode === 'talk' || mode === 'cut') {
    // the world waits while people talk, except the rigs breathing
    updateStations(); stepRigsIdle(dt);
    if (mode === 'cut') { shotsStep(dt * .3); }
    return;
  }
  if (auto) auto.think(dt);
  // the map screen and the view switch
  if (!auto && game.input.pressed('map')) { openMap(); return; }
  if (!auto && game.input.pressed('view')) { game.nextView(); game.note('VIEW: ' + game.view.label.toUpperCase()); }
  // time
  if (!clockPaused && mapName === 'town' && R.tick(S, dt)) { finishDay('exhaust'); return; }   // the Superlab has no clock
  contractClock();
  // heat cools down faster out of sight
  const seen = copSees(hero, 120);
  R.decayHeat(S, dt, !seen && !anyChase() && fx.loud <= 0);
  updateStations();
  playerStep(dt, c);
  updateCustomers(dt); updateCops(dt, c); updateThugs(dt); updateDrops(dt); updateBoss(dt); shotsStep(dt);
  game.saves.canSave = mapName === 'town' && mode === 'walk' && !anyChase();
  // Hank, if he walks up to you on Day 3 or later
  const hank = lists.cops.find(k => k.kind === 'hank');
  if (hank && !flags().hankMet && hank.state === 'patrol' && dist(hank, hero) < 38 && mode === 'walk' && !auto) { flags().hankMet = 1; hank.vx = hank.vy = 0; converse(W.script.hank); }
  if (!auto && S.day === 1 && !fx.tutorialShown) { fx.tutorialShown = true; fx.tutIdx = 0; }
  tutorialStep(dt);
  game.focus(hero.x, hero.y, 10);
  if (HUB && HUB.active) netStep(dt);
}
function stepRigsIdle(dt) {
  heroRig.update(dt, { x: hero.x, y: hero.y, z: hero.z, vx: 0, vy: 0, facing: hero.facing, expr: mode === 'talk' ? undefined : undefined });
  for (const t of lists.thugs) if (!t.dead) t.rig.update(dt, { x: t.x, y: t.y, z: t.z, vx: 0, vy: 0, facing: t.facing });
  for (const k of lists.cops) k.rig.update(dt, { x: k.x, y: k.y, z: k.z, vx: 0, vy: 0, facing: k.facing });
  if (boss) boss.rig.update(dt, { x: boss.x, y: boss.y, z: boss.z, vx: 0, vy: 0, facing: boss.facing });
  for (const n of ['teacher', 'gus', 'jimmy', 'sol']) { const s = stations.find(q => q.id === (n === 'teacher' ? 'school' : n)); if (s) rigFor(n).update(dt, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, facing: ang(s, hero) }); }
}
// the first day's tips, one at a time, a few seconds apart
function tutorialStep(dt) {
  if (auto || inSession && false) return;
  if (fx.tutIdx === undefined || fx.tutIdx >= W.script.tutorial.length) return;
  fx.tutT = (fx.tutT || 0) + dt;
  if (fx.tutT > (fx.tutIdx === 0 ? 1.5 : 14)) { fx.tutT = 0; const [t, x] = W.script.tutorial[fx.tutIdx++]; ui.tutorial(t, x, 13); }
}

// ---- idle NPCs get their animation in the step too (they stand at their stations) ---------------------------------------------
function npcStep(dt) {
  for (const n of ['teacher', 'gus', 'jimmy', 'sol']) {
    const s = stations.find(q => q.id === (n === 'teacher' ? 'school' : n)); if (!s) continue;
    const near = Math.hypot(s.x - hero.x, s.y - hero.y) < 90;
    rigFor(n).update(dt, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, facing: near ? ang(s, hero) : Math.PI / 2, expr: near && n === 'gus' ? undefined : undefined });
  }
}

// ---- the picture ------------------------------------------------------------------------------------------------------------------
const WORLD_LABELS = [['ALBUQUERKY HIGH', 8.5, 10.4, '#f0e8d0'], ['LOS POLLUELOS', 41.5, 10.4, '#ffd040'], ['WHITEWASH AUTO SPA', 8, 18.4, '#8ae0ff'], ['FERROUS & SONS', 33, 26.9, '#ffe8a0'], ['THE RV', 43, 21.5, '#d0f0f0'], ['HOME', 32, 9.4, '#ffd86a']];
function drawWorld(r) {
  const dark = R.darkness(S.minutes), lights = game.lights;
  lights.enabled = true; lights.ambient = mapName === 'lab' ? .5 : .95 - dark * .6;
  map.drawFloor(r);
  if (mapName === 'town') {
    // road shadows of buildings fall by themselves; the dressing and a few street lamps
    for (const [x, y] of [[21.5, 12], [24.5, 12], [21.5, 18], [24.5, 18], [10, 12], [38, 12], [30, 12], [21.5, 28], [24.5, 5], [44, 12]]) r.prop('streetlamp', x * 16, y * 16, 0, { light: dark > .15 });
    for (const [id, x, y, o] of dress) r.shape(id, x, y, 0, o);
    for (const [x, y] of [[40, 29], [4, 29], [46, 31], [33, 30], [10, 30], [15, 18]]) r.prop('cactus', x * 16, y * 16, 0, {});
    r.prop('trashcan', 36 * 16, 27.5 * 16, 0, {}); r.prop('hydrant', 20 * 16, 12.5 * 16, 0, {}); r.prop('barrel', 3.5 * 16, 29 * 16, 0, {});
    r.prop('firedrum', 45 * 16, 26.5 * 16, 0, { light: true }); r.prop('lantern', 16 * 41, 16 * 25.6, 22, { light: true });
    for (const [t, x, y, col] of WORLD_LABELS) r.textAt(x * 16, y * 16, 52, t, col, { outline: '#000' });
    // the Superlab hatch
    const h = map.find('hatch'); if (h) { r.queue(h.x, h.y, 1, g => { const p = r.w(h.x, h.y, 1), open = R.superlabOpen(S); E.px.rect(g, p[0] - 9, p[1] - 4, 18, 8, open ? '#5a1a14' : '#3a3a40'); E.px.rect(g, p[0] - 8, p[1] - 3, 16, 6, open ? '#ff5a4a' : '#6a6a72'); E.px.rect(g, p[0] - 1, p[1] - 3, 2, 6, '#2a2a2e'); }); if (R.superlabOpen(S)) lights.add(h.x, h.y, 10, 60, .8, { color: '#ff5030' }); }
    // the RV window glow at night
    if (dark > .3) lights.add(43 * 16, 22 * 16 + 20, 12, 70, .6, { color: '#a8e8ff' });
  } else {
    for (const [x, y] of [[3, 3], [20, 3], [3, 12], [20, 12]]) r.prop('lamp', x * 16 + 8, y * 16 + 8, 0, { light: true });
    for (const [x, y, c] of [[11, 7.5, '#4ab8ff'], [10, 7.5, '#6ad8ff']]) lights.add(x * 16, y * 16, 20, 70, .8, { color: c });
    r.textAt(12 * 16, 6 * 16, 52, 'THE SUPERLAB', '#8ae0ff', { outline: '#000' });
  }
  map.queueWalls(r);
  // gas
  for (const g of GAS) { const live = g.t > 1.2; r.decal(() => r.groundDisc(g.x, g.y, g.r, live ? '#9aff4a' : '#ffd84a', live ? .5 : .25 + Math.sin(g.t * 14) * .1)); }
  // station markers
  for (const s of stations) {
    if (s.show && !s.show()) continue; const near = s === focusSt;
    if (s.id === 'home' || s.id === 'ladder') continue;
    r.decal(() => r.groundRing(s.x, s.y, 12 + Math.sin(game.time * 4) * 1.5, s.color || '#ffffff', near ? .9 : .45));
    if (s.id.startsWith('drop-')) r.marker(s.x, s.y, 30, { label: 'DELIVER', color: '#ff7a5a', offscreen: 'arrow' });
    else r.marker(s.x, s.y, 34 + (near ? 4 : 0), { color: s.color || '#ffffff', offscreen: false, label: near ? s.label() : undefined });
  }
  { const hs = stations.find(s => s.id === 'home'); if (hs) r.marker(hs.x, hs.y, 26, { color: '#ffd86a', offscreen: false, label: focusSt === hs ? 'Sleep and save' : undefined }); }
  // npcs at their stations
  for (const [n, id] of [['teacher', 'school'], ['gus', 'gus'], ['jimmy', 'jimmy'], ['sol', 'sol']]) {
    const s = stations.find(q => q.id === id); if (!s) continue; const rig = rigFor(n);
    r.shadow(s.x, s.y, 7, .35); r.actor(s.x, s.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  }
  // drops
  for (const d of lists.drops) { const spr = SPR[d.kind === 'pill' ? 'pill' : d.kind]; r.sprite(d.x, d.y, 3 + Math.sin(d.t * 5) * 1.5, spr, { glow: .4 }); }
  // customers
  for (const c of lists.customers) {
    r.shadow(c.x, c.y, 5, .3); r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view));
    if (c.state === 'wait') r.textAt(c.x, c.y, 38 + Math.sin(game.time * 3 + c.t) * 1.5, '$', S.bricks.length ? '#6fd36a' : '#8a8a8a', { outline: '#000' });
    else if (c.say) r.textAt(c.x, c.y, 38, c.say, '#ffd86a', { outline: '#000' });
  }
  // cops (sight cones first, so they lie under everyone)
  for (const k of lists.cops) {
    r.decal(() => r.groundArc(k.x, k.y, 6, k.kind === 'hank' ? 150 : 115, k.facing - 1.1, k.facing + 1.1, k.state === 'chase' ? '#ff4030' : k.alert > 0 ? '#ffa030' : '#fff0a0', k.state === 'chase' ? .28 : .16));
  }
  for (const k of lists.cops) {
    r.shadow(k.x, k.y, 7, .35); r.actor(k.x, k.y, k.z, (g, ox, oy) => k.rig.draw(g, ox, oy, r.view));
    if (k.alert > 0 && k.state !== 'chase') r.textAt(k.x, k.y, 44, '?', '#ffd040', { outline: '#000' });
    if (k.state === 'chase') { r.textAt(k.x, k.y, 44, '!', '#ff4030', { outline: '#000' }); game.lights.add(k.x, k.y, 22, 40, .5, { color: Math.floor(game.time * 5) % 2 ? '#ff2020' : '#2040ff' }); }
  }
  // thugs and boss
  for (const t of lists.thugs) {
    r.shadow(t.x, t.y, 7, .35); r.actor(t.x, t.y, t.z, (g, ox, oy) => t.rig.draw(g, ox, oy, r.view), { flash: t.flash > 0 ? '#ffffff' : undefined, alpha: t.dead ? Math.max(.1, t.deadT / 1.4) : 1 });
    if (!t.dead && t.hp < t.maxHp) r.queue(t.x, t.y, 1, g => { const p = r.w(t.x, t.y, 40); E.px.rect(g, p[0] - 8, p[1], 16, 3, '#000'); E.px.rect(g, p[0] - 7, p[1] + 1, Math.max(0, 14 * t.hp / t.maxHp), 1, '#ff5a4a'); });
  }
  if (boss && !boss.done) { r.shadow(boss.x, boss.y, 9, .4); r.actor(boss.x, boss.y, boss.z, (g, ox, oy) => boss.rig.draw(g, ox, oy, r.view), { flash: boss.flash > 0 ? '#ffffff' : undefined }); if (boss.state === 'slam') r.decal(() => r.groundRing(boss.x, boss.y, 52 * Math.min(1, boss.t / .8), '#ffd86a', .6)); }
  // ghosts: the other players of an AI Hub session
  for (const [id, gh] of lists.ghosts) {
    const rig = gh.rig || (gh.rig = new E.Humanoid(Object.assign({}, W.looks.walt, { colors: Object.assign({}, W.looks.walt.colors, { cloth: gh.color || '#3b82f6' }) })));
    if (gh.map !== mapName) continue;
    rig.update(.016, { x: gh.x, y: gh.y, z: 0, vx: gh.vx || 0, vy: gh.vy || 0, facing: gh.f || 0 });
    r.shadow(gh.x, gh.y, 6, .3); r.actor(gh.x, gh.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { alpha: .8 });
    r.textAt(gh.x, gh.y, 46, gh.name || 'P' + (id + 1), gh.color || '#ffffff', { outline: '#000' });
  }
  // the hero
  if (mode !== 'cook') {
    r.shadow(hero.x, hero.y, 6, .4, undefined, hero.groundZ || 0);
    const blink = fx.iFrames > 0 && Math.floor(game.time * 20) % 2 === 0 && fx.hurt > 0;
    r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => heroRig.draw(g, ox, oy, r.view), { flash: fx.hurt > 0 ? '#ff4030' : undefined, alpha: blink ? .5 : 1, ghost: fx.dodge > 0 ? { color: '#bfe8ff', life: .2, alpha: .4, owner: hero } : undefined });
    if (!auto && hoverSt) r.decal(() => r.groundRing(hoverSt.x, hoverSt.y, 14, '#ffffff', .9));
    if (fx.mouseActive > 0 && S.weapon === 'pistol' && !auto) { const m = game.mouseGround(); if (m) r.decal(() => { r.groundRing(m[0], m[1], 4, '#ff8060', .9); }); }
    heroRig.drawSmear && combo.busy && S.weapon === 'fists' && heroRig.drawSmear(r);
  }
  shots.draw(r);
  if (mode === 'cook') drawCook(r);
  talk.draw(r);
  // attract-mode banner
  if (auto) { r.text('DEMO  -  PRESS ANY BUTTON', r.W / 2, 8, Math.floor(game.time * 2) % 2 ? '#ffd86a' : '#ffffff', { align: 'center', shadow: '#000', scale: 2 }); r.text((auto.label || '').toUpperCase(), r.W / 2, 28, '#9bb09a', { align: 'center', shadow: '#000' }); }
}

// the cooking minigame: a lab bench drawn over the world
function drawCook(r) {
  const k = cook; if (!k) return;
  r.overlay(g => {
    const W2 = r.W, H2 = r.H, X = 0 | (W2 / 2 - 140), Y = 0 | (H2 / 2 - 84);
    E.px.rect(g, 0, 0, W2, H2, 'rgba(6,14,10,0.78)');
    E.ui.box(g, X, Y, 280, 168, { bg: ['#0e2018', '#0a1410'], border: '#6fd36a' });
    const title = k.phase === 'measure' ? COOK_NAMES[Math.min(2, k.i)] : k.phase === 'heat' ? 'HOLD THE HEAT IN THE BAND' : k.phase === 'filter' ? 'FILTER: MATCH THE ARROWS' : 'BATCH COMPLETE';
    E.font.text(g, title, W2 / 2, Y + 8, '#ffd86a', { align: 'center', shadow: '#000' });
    // progress pips
    const stage = k.phase === 'measure' ? k.i : k.phase === 'heat' ? 3 : k.phase === 'filter' ? 4 : 5;
    for (let i = 0; i < 5; i++) E.px.rect(g, X + 90 + i * 20, Y + 22, 14, 3, i < stage ? '#6fd36a' : i === stage ? '#ffd86a' : '#2c4a38');
    const bx = X + 20, bw = 240;
    if (k.phase === 'measure') {
      E.px.rect(g, bx - 1, Y + 60, bw + 2, 22, '#000'); E.px.rect(g, bx, Y + 61, bw, 20, '#1c3326');
      const zx = bx + (k.zoneC - k.zoneW / 2) * bw; E.px.rect(g, zx | 0, Y + 61, (k.zoneW * bw) | 0, 20, '#3aa84a'); E.px.rect(g, zx | 0, Y + 61, (k.zoneW * bw) | 0, 2, '#9aff9a');
      const mx = bx + k.pos * bw; E.px.rect(g, (mx - 2) | 0, Y + 54, 4, 34, '#ffffff'); E.px.poly(g, [[mx - 5, Y + 54], [mx + 5, Y + 54], [mx, Y + 60]], '#ffd86a');
      E.font.text(g, 'STOP THE MARKER IN THE GREEN', W2 / 2, Y + 100, '#9bb09a', { align: 'center' });
      for (let i = 0; i < 3; i++) E.px.rect(g, X + 100 + i * 30, Y + 120, 22, 14, k.mScores[i] === undefined ? '#1c3326' : k.mScores[i] > .95 ? '#6fd36a' : k.mScores[i] > .6 ? '#ffd86a' : '#ff5a4a');
    } else if (k.phase === 'heat') {
      // a thermometer: tall bar, the band moves
      const tx = X + 130, th = 110, ty = Y + 36;
      E.px.rect(g, tx - 1, ty - 1, 22, th + 2, '#000'); E.px.rect(g, tx, ty, 20, th, '#1c3326');
      const by = ty + th - (k.bandC + .1) * th, bh = .2 * th; E.px.rect(g, tx, by | 0, 20, bh | 0, '#3aa84a');
      const fy = ty + th - k.temp * th; E.px.rect(g, tx + 3, fy | 0, 14, (ty + th - fy) | 0, Math.abs(k.temp - k.bandC) < .1 ? '#8ae0ff' : '#ff7a4a');
      E.px.rect(g, tx - 6, fy | 0, 32, 2, '#ffffff');
      E.ui.bar(g, X + 20, Y + 150, 240, 5, k.hT / k.hDur, '#ffd86a');
      E.font.text(g, 'IN BAND ' + Math.round(k.inBand / Math.max(.01, k.total) * 100) + '%', X + 26, Y + 70, '#9bb09a', {});
    } else if (k.phase === 'filter') {
      const win = 1.7 - Math.min(.7, k.seqI * .09);
      for (let i = 0; i < k.seq.length; i++) {
        const cx = X + 28 + i * 32, cy = Y + 70, cur = i === k.seqI, done = i < k.seqI;
        E.px.rect(g, cx - 12, cy - 12, 24, 24, cur ? '#2c5a3a' : '#142a1e'); E.px.rect(g, cx - 12, cy - 12, 24, 1, cur ? '#ffd86a' : '#2c4a38');
        const d = k.seq[i], col = done ? '#4a6a52' : cur ? '#ffffff' : '#9bb09a';
        const P = { up: [[cx, cy - 8], [cx - 7, cy + 5], [cx + 7, cy + 5]], down: [[cx, cy + 8], [cx - 7, cy - 5], [cx + 7, cy - 5]], left: [[cx - 8, cy], [cx + 5, cy - 7], [cx + 5, cy + 7]], right: [[cx + 8, cy], [cx - 5, cy - 7], [cx - 5, cy + 7]] }[d];
        E.px.poly(g, P, col);
      }
      E.ui.bar(g, X + 20, Y + 110, 240, 6, clamp(1 - k.seqT / win, 0, 1), '#ff7a4a');
      E.font.text(g, 'HITS ' + k.fHits + '   MISSES ' + k.fMiss, W2 / 2, Y + 128, '#9bb09a', { align: 'center' });
    } else {
      E.font.text(g, R.grade(k.purity), W2 / 2, Y + 42, k.purity >= 99 ? '#8ae0ff' : '#ffd86a', { align: 'center', scale: 3, shadow: '#000' });
      E.font.text(g, 'PURITY ' + k.purity + '%', W2 / 2, Y + 78, '#ffffff', { align: 'center', scale: 2 });
      E.font.text(g, k.n + ' BRICKS  ' + money(R.price(k.purity)) + ' EACH', W2 / 2, Y + 102, '#6fd36a', { align: 'center' });
      E.font.text(g, 'MEASURE ' + Math.round(k.m * 100) + '   HEAT ' + Math.round(k.h * 100) + '   FILTER ' + Math.round(k.f * 100), W2 / 2, Y + 122, '#9bb09a', { align: 'center' });
    }
    if (k.flashT > 0) E.font.text(g, k.flashMsg, W2 / 2, Y + 142, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
  });
}

// ---- the HUD -------------------------------------------------------------------------------------------------------------------------
function objective() {
  if (mapName === 'lab') return boss && !boss.done ? { title: 'Beat Gus Frying', text: 'Dodge the gas, the volleys and the slam. Hit him when he is open.' } : null;
  const at = id => { const s = stations.find(q => q.id === id); return s ? { x: s.x, y: s.y, z: 0 } : undefined; };
  if (R.superlabOpen(S)) return { title: 'Enter the Superlab', text: 'The hatch is open. End it.', at: at('hatch'), from: hero };
  if (S.contract) { const c = S.contract; return { title: 'Gus\'s order', text: c.n + ' bricks at ' + c.minPurity + '%+ to the ' + c.at + ' gate by ' + R.clockText(c.deadline), at: R.canFill(S, c) ? at('drop-' + c.at) : at(S.ingredients ? 'cook' : 'shop'), from: hero }; }
  if (S.ingredients === 0 && !S.bricks.length) return { title: 'Buy ingredients', text: R.INGREDIENT_COST + ' dollars a batch at the supply store.', at: at('shop'), from: hero };
  if (S.ingredients > 0) return { title: 'Cook at the RV', text: 'Measure, heat, filter. Purity sets the price.', at: at('cook'), from: hero };
  if (S.bricks.length) { const c = lists.customers.find(q => q.state === 'wait'); return { title: 'Sell the product', text: 'Customers with a $ over their heads.', at: c ? { x: c.x, y: c.y, z: 0 } : undefined, from: hero }; }
  if (S.dirty >= 500) return { title: 'Launder the money', text: 'The car wash keeps ' + Math.round(R.LAUNDER_FEE * 100) + '%.', at: at('counter'), from: hero };
  return { title: 'Talk to Gus', text: 'See what he wants.', at: at('gus'), from: hero };
}
function hudStep() {
  if (mode === 'cook' && cook) {
    ui.hud({ prompt: cook.phase === 'filter' ? { label: 'Press the arrow shown', hint: 'Up, Down, Left, Right' } : cook.phase === 'heat' ? { act: 'confirm', label: 'HOLD to heat, release to cool' } : cook.phase === 'result' ? { act: 'confirm', label: 'Done' } : { act: 'confirm', label: 'STOP the marker' }, bars: [] });
    return;
  }
  if (auto) { ui.hud({}); return; }
  const o = objective(), bars = [{ label: 'Health', value: S.hp, max: S.hpMax, color: S.hp < 30 ? '#ff4a3a' : '#6fd36a' }, { label: 'Heat: ' + R.heatName(S.heat), value: S.heat, max: 100, color: S.heat >= 80 ? '#ff2a2a' : S.heat >= 55 ? '#ff8a30' : S.heat >= R.SURPLUS ? '#ffd040' : '#6a9ad0' }];
  if (boss && !boss.done) bars.push({ label: 'Gus Frying', value: boss.hp, max: boss.maxHp, color: '#ffd86a' });
  const prompt = mode === 'walk' && focusSt ? { act: 'interact', label: focusSt.label() } : undefined;
  const markers = [];
  for (const c of lists.customers) if (c.state === 'wait') markers.push({ x: c.x, y: c.y, kind: 'dot', color: '#6fd36a' });
  for (const k of lists.cops) markers.push({ x: k.x, y: k.y, kind: 'dot', color: k.state === 'chase' ? '#ff3030' : '#4a8aff' });
  for (const t of lists.thugs) if (!t.dead) markers.push({ x: t.x, y: t.y, kind: 'dot', color: '#c040ff' });
  for (const s of stations) if ((!s.show || s.show()) && s.id !== 'ladder') markers.push({ x: s.x, y: s.y, kind: 'diamond', color: s.color || '#ffffff' });
  ui.hud({
    objective: o, bars, prompt,
    status: anyChase() ? { text: 'COPS CHASING', color: '#ff4030' } : fx.hazmat > 0 ? { text: 'SMELLS OF CHEMICALS', color: '#ffd040' } : undefined,
    counts: [['DAY ' + Math.min(S.day, R.LAST_DAY) + ' / ' + R.LAST_DAY, R.clockText(S.minutes)], ['DIRTY', money(S.dirty)], ['CLEAN', money(S.clean) + ' / ' + money(R.GOAL)], ['BRICKS', S.bricks.length ? S.bricks.length + ' (best ' + Math.max(...S.bricks) + '%)' : '0'], [S.weapon === 'pistol' ? 'PISTOL' : 'FISTS', S.weapon === 'pistol' ? S.ammo + ' rounds' : S.pills + ' pills']],
    minimap: { map, at: { x: hero.x, y: hero.y, facing: hero.facing }, markers }
  });
}
function openMap() {
  const labels = [['SCHOOL', 8.5 * 16, 6 * 16], ['HOME', 32 * 16, 5 * 16], ['LOS POLLUELOS', 41 * 16, 6 * 16], ['CAR WASH', 8 * 16, 23 * 16], ['SUPPLY', 33 * 16, 23 * 16], ['RV', 43 * 16, 22.5 * 16]];
  ui.show('map', { kicker: 'ALBUQUERKY', title: 'Map', map, at: { x: hero.x, y: hero.y, facing: hero.facing }, markers: () => stations.filter(s => !s.show || s.show()).map(s => ({ x: s.x, y: s.y, kind: 'diamond', color: s.color || '#fff' })), labels, back: () => ui.hide() });
}
