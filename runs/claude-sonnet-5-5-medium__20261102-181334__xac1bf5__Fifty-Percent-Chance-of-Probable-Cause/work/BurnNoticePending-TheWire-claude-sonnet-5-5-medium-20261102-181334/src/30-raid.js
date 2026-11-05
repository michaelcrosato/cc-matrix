/* ---- THE ANNEX: serve the warrant. Nobody is a hero: shove, shout, cuff, and try to go home ---- */
const RAID = (() => {
  const W = 26;
  const rows = mkMap([
    '##########################',
    '#.......#........#.......#',
    '#..f....#...m....#...i...#',
    '#.......#........#.......#',
    '#.......#........#.T.....#',
    '####.####........####.####',
    '#........................#',
    '#........................#',
    '#..l.....................#',
    '#..KKKK.......TTT........#',
    '#........................#',
    '#.....................CC.#',
    '#.......UU............CC.#',
    '#x.......................#',
    '#...........@............#',
    '##########################'], W);
  const map = new E.TileMap({
    rows,
    legend: { '#': 1, K: 2, T: 3, C: 4, U: 5, '.': { floor: 'floor' }, '@': 'hero', f: 'fats', m: 'mouse', i: 'tick', l: 'lonnie', x: 'exit' },
    types: {
      1: { h: 52, top: '#26222a', side: '#5a4a44', face: 'plaster', roof: 'plain', cut: true, cutH: 6, windows: { lit: .1 } },
      2: { h: 13, top: '#5a2a2a', side: '#3a1a1a', face: 'plain', roof: 'plain' },
      3: { h: 12, top: '#8a7a5a', side: '#5a4a32', face: 'plank', roof: 'plain' },
      4: { h: 20, top: '#6a5a3a', side: '#4a3a24', face: 'plank', roof: 'plain' },
      5: { h: 16, top: '#4a4a4a', side: '#2a2a2a', face: 'plain', roof: 'plain' } },
    floorTex: (x, y) => E.tex.planks ? E.tex.planks(x, y, {}) : E.tex.plain(x, y, { color: '#3a2e24' })
  });
  const at = t => map.find(t);
  const ITEMS = [{ id: 'scale', x: 4 * T, y: 3 * T, name: 'a digital scale' }, { id: 'ledger', x: 12.5 * T, y: 3.4 * T, name: "Boyce's ledger" }, { id: 'product', x: 21.5 * T, y: 3.6 * T, name: 'bagged product' }];
  let hero, hrig, foes, shots, hp, maxHp, flow, items, exitP, hurtT, cuffing, cuffT, shoutCd, shoveCd, ended, aimLine, camPull, demoT, intro, hubWait2;
  const foeRig = (o, c) => new E.Humanoid(Object.assign({ size: 1.25, weapon: null, sleeves: 'long' }, o, { colors: c }));
  function mkFoe(tag, id, name, o) {
    const s = at(tag), m = mkMover(s.x, s.y, { run: o.run || 80, walk: 30 });
    Object.assign(m, { id, name, armed: !!o.armed, mind: new E.Suspicion({ rise: 1.8, decay: .3, forget: 8 }), rig: o.rig, stun: 0, state: 'idle', cuffed: false, gone: false, fire: 0, wind: 0, home: { x: s.x, y: s.y }, surr: false, facing: id === 'lonnie' ? -.3 : Math.PI / 2 });
    return m;
  }
  function enter(data) {
    if (data && data.demo) DEMO = true;
    const s = at('hero'); hero = mkMover(s.x, s.y, { run: 92 }); hero.facing = -Math.PI / 2; exitP = at('exit');
    hrig = hrig || new E.Humanoid({ size: 1.25, build: 'heroic', outfit: 'coat', hair: 'ponytail', sleeves: 'long', weapon: null, colors: { skin: '#a8714f', hair: '#2a1a14', coat: '#4a4a56', cloth: '#7a6a5a', pants: '#26262e', trim: '#c9b88a' } });
    foes = [
      mkFoe('lonnie', 'lonnie', 'Big Lonnie', { armed: true, rig: foeRig({ build: 'bulky', outfit: 'shirt', hair: 'bald', hat: { style: 'band', color: '#222' }, sleeves: 'none', weapon: 'gun' }, { skin: '#4a2e22', cloth: '#2a2a2a', pants: '#3a3a4a' }) }),
      mkFoe('fats', 'fats', 'Fats', { run: 88, rig: foeRig({ build: 'bulky', outfit: 'shirt', hair: 'short' }, { skin: '#c89070', cloth: '#a03030', pants: '#2a3a5a' }) }),
      mkFoe('mouse', 'mouse', 'Mouse', { run: 84, rig: foeRig({ outfit: 'shirt', hair: 'short', hat: 'band' }, { skin: '#9a6a4a', cloth: '#b03a3a', pants: '#3a3a4a' }) }),
      mkFoe('tick', 'tick', 'Little Tick', { run: 86, rig: foeRig({ size: 1.1, outfit: 'shirt', hair: 'spiky', hat: 'cap' }, { skin: '#8a5a3a', cloth: '#d8d040', pants: '#2a2a3a' }) })
    ];
    shots = new E.Bullets(game, { plane: 'ground' });
    maxHp = DEMO ? 99 : ({ Rookie: 7, Detective: 5, 'Burned out': 3 })[game.settings.difficulty] || 5; hp = maxHp;
    flow = new E.FlowField(map, {}); items = ITEMS.map(i => Object.assign({ taken: false, prog: 0 }, i));
    hurtT = 0; cuffing = null; cuffT = 0; shoutCd = 0; shoveCd = 0; ended = false; aimLine = null; demoT = 0; intro = 0; hubWait2 = false;
    game.follow(hero, { z: 16 }); game.cam.bounds = v => map.bounds(v);
    L.enabled = true; L.ambient = .3; game.weather = null; music('raid'); toasts.length = 0; game.setZoom(1.0);
    game.flash('#000000', .6, 1);
    if (!DEMO) convo([['tolly', ['Door team set. Vests on. The kid in the yellow shirt is Tick, he runs. The big one is Lonnie, he does not.']], ['pike', ['Police! Search warrant!']]], () => toast('SERVE THE WARRANT', 'Shove, shout, cuff. Four inside.', COL.gold));
  }
  const live = () => foes.filter(f => !f.cuffed && !f.gone);
  const alertAll = (src, r = 160) => { for (const f of foes) if (f !== src && !f.cuffed && !f.gone && Math.hypot(f.x - src.x, f.y - src.y) < r && f.mind.state === 'calm') f.mind.level = Math.max(f.mind.level, .7); };
  function hurt() {
    if (DEMO || hurtT > 0 || ended) return; hp--; hurtT = .9; game.hitFx(hero.x, hero.y, 16, { power: 1, sound: 'hurt' }); game.flash('#ff2a1a', .15, .4);
    if (hp <= 0) { ended = true; music(null); game.after(1, () => game.go('over', { why: 'down' })); }
  }
  function foeUpdate(f, dt) {
    if (f.cuffed || f.gone) { f.update(dt, map, { move: [0, 0] }); return; }
    if (f.stun > 0) { f.stun -= dt; f.update(dt, map, { move: [0, 0] }); return; }
    const seen = DEMO ? { seen: false, exposure: 0 } : E.sees(f, hero, { map, range: 150, fov: 2.4 });
    const st = f.mind.update(dt, seen, hero);
    if (f.mind.changed && st === 'alert') { sfx('select'); alertAll(f); }
    let move = [0, 0], sprint = false;
    if (st === 'alert' || st === 'search') {
      if (f.armed) {   // Lonnie holds ground and shoots from cover
        const d = Math.hypot(hero.x - f.x, hero.y - f.y), los = map.ray(f, hero, { eye: 22, target: 16 }).clear;
        f.facing = Math.atan2(hero.y - f.y, hero.x - f.x);
        if (f.wind > 0) { f.wind -= dt; aimLine = { f }; if (f.wind <= 0) { sfx('gunshot'); shots.fire({ x: f.x, y: f.y, z: 14, vx: Math.cos(f.facing) * 150, vy: Math.sin(f.facing) * 150, r: 2.5, team: 'enemy', color: '#ffb040', life: 1.6 }); f.fire = 1.5 / diff(); } }
        else { f.fire -= dt; if (los && d < 170 && f.fire <= 0 && st === 'alert') f.wind = .75 * diff() > 1 ? 1 : .75; }
        if (!los || d > 80) { flow.update(hero.x, hero.y); const nx = flow.next(f.x, f.y); if (nx && st === 'alert' && f.wind <= 0 && d > 60) { const l = Math.hypot(nx.x - f.x, nx.y - f.y) || 1; move = [(nx.x - f.x) / l * .5, (nx.y - f.y) / l * .5]; } }
      } else {          // the others run for the back door
        f.state = 'flee'; flow.update(exitP.x, exitP.y); const nx = flow.next(f.x, f.y), l = nx ? Math.hypot(nx.x - f.x, nx.y - f.y) || 1 : 1;
        if (nx) move = [(nx.x - f.x) / l, (nx.y - f.y) / l]; sprint = true;
        if (Math.hypot(f.x - exitP.x, f.y - exitP.y) < 14) { f.gone = true; S.escaped++; toast(f.name + ' got out the back', 'He will be on the corner by Monday', COL.red); sfx('cancel'); }
      }
    } else if (st === 'notice' && f.mind.last) f.facing = E.approachAng(f.facing, Math.atan2(f.mind.last.y - f.y, f.mind.last.x - f.x), dt * 3);
    f.update(dt, map, { move, sprint });
  }
  function heroUpdate(dt) {
    const d = moveDir(), m = Math.min(1, d[2]); if (I.pressed('crouch')) hero.crouchT = !hero.crouchT;
    if (I.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    const sprint = I.down('sprint') && !hero.crouchT, sp = cuffing ? 0 : hero.crouchT ? .5 : 1;
    hero.crouch = !!hero.crouchT;
    hero.update(dt, map, { move: [d[0] * m * sp, d[1] * m * sp], sprint, crouch: hero.crouchT, jumpPressed: false });
    shoveCd -= dt; shoutCd -= dt;
    // shove: knocks the nearest suspect in front of you flat
    if (I.pressed('attack') && shoveCd <= 0 && !cuffing) {
      shoveCd = .7; sfx('punch'); hero.facing = hero.facing;
      const t = live().filter(f => Math.hypot(f.x - hero.x, f.y - hero.y) < 24 && Math.abs(E.angDiff(hero.facing, Math.atan2(f.y - hero.y, f.x - hero.x))) < 1.1).sort((a, b) => Math.hypot(a.x - hero.x, a.y - hero.y) - Math.hypot(b.x - hero.x, b.y - hero.y))[0];
      if (t) shove(t); S.shoves++;
    }
    // shout: POLICE! unarmed suspects in earshot freeze; Lonnie only if you are close
    if (I.pressed('shout') && shoutCd <= 0 && !cuffing) shout();
    // cuff and seize
    const tgt = live().filter(f => (f.stun > 0 || f.surr) && Math.hypot(f.x - hero.x, f.y - hero.y) < 30).sort((a, b) => Math.hypot(a.x - hero.x, a.y - hero.y) - Math.hypot(b.x - hero.x, b.y - hero.y))[0];
    const it = items.find(i => !i.taken && Math.hypot(i.x - hero.x, i.y - hero.y) < 20);
    if (tgt && I.down('interact')) { cuffing = tgt; cuffT += dt / 1.1; if (cuffT >= 1) cuff(tgt); }
    else if (it && I.down('interact') && !tgt) { cuffing = null; it.prog += dt / .9; if (it.prog >= 1) seize(it); }
    else { cuffing = null; cuffT = Math.max(0, cuffT - dt * 2); items.forEach(i => { i.prog = Math.max(0, i.prog - dt); }); }
    focusT = tgt || it || null;
    // clicking a suspect or an item with the mouse works as the button does
    if (I.clicked() && I.aimSource === 'mouse') { const mg = game.mouseGround(); if (mg) { const f = live().find(f => Math.hypot(f.x - mg.x, f.y - mg.y) < 14 && (f.stun > 0 || f.surr) && Math.hypot(f.x - hero.x, f.y - hero.y) < 30); if (f) cuff(f); } }
  }
  let focusT = null;
  function shove(t) {
    t.stun = 3.8; t.surr = false; t.mind.level = 1; game.hitFx(t.x, t.y, 16, { power: 1, angle: hero.facing }); E.knockback(hero, t, 55); alertAll(t, 90);
    toast('Shoved', t.name + ' is down. Cuff him: hold ' + key('interact'), COL.blue);
  }
  function shout() {
    shoutCd = 6; sfx('whistle', { vol: .3 }); game.shake(1); P.ring && P.ring(hero.x, hero.y, 6, 70, '#8fd8ff', .5);
    say('pike', ['POLICE! Hands where I can see them!'], { auto: 1.1, modal: false, place: 'top' });
    let n = 0;
    for (const f of live()) {
      const d = Math.hypot(f.x - hero.x, f.y - hero.y); if (d > 85 || !map.ray(hero, f, { eye: 30, target: 20 }).clear) continue;
      if (f.armed && d > 55) { f.mind.level = 1.2; continue; }
      f.surr = true; f.stun = Math.max(f.stun, f.armed ? 2.6 : 4.2); f.mind.level = .2; n++;
    }
    toast(n ? n + ' stopped cold' : 'Nobody was close enough', n ? 'Cuff them, quick: ' + key('interact') : 'Armed men only listen up close', n ? COL.green : COL.amber);
  }
  function cuff(f) {
    f.cuffed = true; f.stun = 0; cuffT = 0; cuffing = null; S.arrests++; sfx('cuff'); game.flash('#ffffff', .06, .3);
    toast('ARRESTED', f.name, COL.green);
  }
  function seize(it) { it.taken = true; it.prog = 0; S.seized++; sfx('coin'); toast('SEIZED', it.name, COL.gold); }
  function demoUpdate(dt) {
    demoT += dt; hero.update(dt, map, { move: [0, 0] });
    const f = live()[0], it = items.find(i => !i.taken);
    const goal = f ? f : it; if (!goal) return;
    const d = Math.hypot(goal.x - hero.x, goal.y - hero.y);
    if (d < 16) { if (f) { hero.facing = Math.atan2(f.y - hero.y, f.x - hero.x); if (demoT > .5) { demoT = 0; if (f.stun <= 0) { f.stun = 2; sfx('punch'); game.hitFx(f.x, f.y, 16, { power: 1 }); } else cuff(f); } } else if (demoT > .5) { demoT = 0; seize(it); } return; }
    flow.update(goal.x, goal.y); const nx = flow.next(hero.x, hero.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - hero.x, ty - hero.y) || 1;
    hero.update(dt, map, { move: [(tx - hero.x) / l, (ty - hero.y) / l], sprint: true });
    for (const o of foes) if (!o.cuffed && !o.gone) { o.mind.reset(); }
  }
  function finish() {
    if (ended) return; ended = true; music('ending'); game.after(1.4, () => game.go('results'));
    toast('SCENE SECURE', S.arrests + ' in cuffs', COL.gold);
  }
  function update(dt) {
    updateToasts(dt); if (hubWait2) return;
    if (talk.update(dt)) { hrig.update(dt, hero.rigState({})); return; }
    if (hurtT > 0) hurtT -= dt;
    if (DEMO) demoUpdate(dt); else if (!ended) heroUpdate(dt); else hero.update(dt, map, { move: [0, 0] });
    for (const f of foes) { foeUpdate(f, dt); }
    aimLine = null; for (const f of foes) if (f.wind > 0) aimLine = { f };
    shots.update(dt, map);
    shots.hit([hero], (b, t) => { b.dead = true; hurt(); }, 'enemy');
    hrig.update(dt, hero.rigState({ pose: cuffing ? 'crouch' : null, hurt: hurtT > 0 }));
    for (const f of foes) {
      const pose = f.cuffed ? 'kneel' : (f.stun > 0 ? (f.surr ? 'cheer' : 'down') : f.armed && f.mind.state !== 'calm' ? null : 'hips');
      f.rig.update(dt, f.rigState({ pose, down: f.stun > 0 && !f.surr ? 1 : 0, point: f.armed && f.mind.state !== 'calm' && f.stun <= 0, expr: f.mind.state === 'alert' ? 'shout' : null }));
    }
    if (!ended && live().length === 0) finish();
    S.score = scoreNow(); hubProgress();
  }
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    r.prop('lamp', 4 * T, 7 * T, 0, { light: true }); r.prop('lamp', 20 * T, 7 * T, 0, { light: true }); r.prop('lamp', 12.5 * T, 2 * T, 0, { light: true });
    r.prop('chest', 22 * T, 3 * T, 0, { size: 1.0 }); r.prop('barrel', 1.8 * T, 4 * T, 0, { size: 1 }); r.prop('crate', 15 * T, 12 * T, 0, { size: 1 });
    for (const it of items) if (!it.taken) { r.sprite(it.x, it.y, 8 + Math.sin(game.time * 3) * 1.5, ITEM_SPR, { glow: .6 }); L.add(it.x, it.y, 8, 26, .6, { color: '#ffd060' }); }
    L.add(hero.x, hero.y, 26, 80, .8, { color: '#fff0d8' });
    const shadow = b => r.shadow(b.x, b.y, 6, .35, undefined, map.groundAt(b.x, b.y, b.r, b.z));
    for (const f of foes) { if (f.gone) continue; if (f.mind.state !== 'calm' && !f.cuffed && f.stun <= 0 && !f.armed === false) r.sightCone && 0; shadow(f); r.actor(f.x, f.y, f.z, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view), { flash: f.wind > 0 && Math.floor(game.time * 12) % 2 === 0 }); }
    shadow(hero); r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => hrig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: hurtT > 0 && Math.floor(game.time * 14) % 2 === 0 });
    shots.draw(r);
    if (!DEMO) r.marker(exitP.x, exitP.y, 0, { label: 'BACK DOOR', color: '#ff7a6a' });
    r.overlay(g => {
      const W = r.W, H = r.H;
      for (const f of foes) { if (f.cuffed || f.gone) continue; const [sx, sy] = r.w(f.x, f.y, 44), st = f.mind.state; if (f.stun > 0) txt(g, f.surr ? 'HANDS UP' : 'DOWN', sx, sy - 6, COL.green, { align: 'center' }); else if (st !== 'calm') { txt(g, st === 'alert' ? '!' : '?', sx, sy - 8, st === 'alert' ? '#ff4a3a' : '#ffc040', { align: 'center' }); E.ui.bar(g, Math.round(sx) - 6, Math.round(sy) + 2, 12, 2, Math.min(1, f.mind.level), '#ff4a3a'); } }
      if (aimLine) { const [ax, ay] = r.w(aimLine.f.x, aimLine.f.y, 14), [bx, by] = r.w(hero.x, hero.y, 14); px.line(g, Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), Math.floor(game.time * 16) % 2 ? '#ff4a3a' : '#ffa090', 1); }
      // HUD
      panel(g, 6, 6, 130, 40); txt(g, 'THE ANNEX', 12, 11, COL.gold); txt(g, 'VEST ' + (DEMO ? 'ok' : hp + ' / ' + maxHp), 12, 22, '#ff6a6a');
      txt(g, 'CUFFED ' + foes.filter(f => f.cuffed).length + '  OUT ' + foes.filter(f => f.gone).length + '  LEFT ' + live().length, 12, 33, COL.blue);
      const ca = game.cornerArea && game.cornerArea(); drawToasts(g, ca && ca.y0 < 40 ? Math.floor(ca.x0) - 4 : W);
      let x = 8; const yy = H - 14;
      txt(g, key('attack') + ' SHOVE   ' + key('shout') + ' POLICE!' + (shoutCd > 0 ? ' (' + Math.ceil(shoutCd) + ')' : '') + '   ' + key('interact') + ' CUFF/SEIZE (HOLD)   ' + key('crouch') + ' CROUCH', x, yy, '#bbb');
      if (cuffing) { E.ui.bar(g, W / 2 - 30, H / 2 + 24, 60, 6, cuffT, COL.green); txt(g, 'CUFFING ' + cuffing.name.toUpperCase(), W / 2, H / 2 + 34, COL.green, { align: 'center' }); }
      else if (focusT && !DEMO) { const lab = focusT.name ? 'Cuff ' + focusT.name : 'Seize ' + focusT.name; chip(g, W / 2 - 50, H - 30, 'interact', lab); const it = items.includes(focusT) ? focusT : null; if (it && it.prog > 0) E.ui.bar(g, W / 2 - 30, H / 2 + 24, 60, 6, it.prog, COL.gold); }
    });
    talk.draw(r);
  }
  const ITEM_SPR = E.sprite(['.bbbb.', 'bBBBBb', 'bBwwBb', 'bBBBBb', '.bbbb.'], { b: '#3a2010', B: '#8a3a20', w: '#f0e0b0' });
  return { view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: PRESET, res: 'ps1', pausable: true, camera: { zoom: [.75, 2], start: 1.0, rotate: true }, enter, update, draw,
    exit() { game.setZoom(1); L.enabled = false; }, state: () => ({ hero, foes, hp, flow, map, items }) };
})();
scenes.raid = RAID;
