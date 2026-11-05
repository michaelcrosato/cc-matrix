/* ---- 30-play: the brawl. A chapter's street, the fighters on it, the sit-downs in it, and the HUD ---- */
const PLAY = (() => {
  const puffs = [], sparks = [], floaters = [];
  const talk = new E.Dialog(game, { bg: ['#4a1436', '#12040c'], border: '#f0b0c8', nameColor: '#f0c850', speed: 38 });
  Object.defineProperty(talk, 'voice', { configurable: true, get: () => blip(), set: () => {} });     // Animalese: each blip a new random syllable of the speaker's voice
  let lv, map, bg, shots, hero, foes, npcs, boxes, pickups, ducks, wave, lockX, go, intro, won, target, tgtT, lag, chain, chainT, demo, session, st, snap, ghosts = {}, hover = null, noteT = 0, clearedAt = 0, sent = 0, frameCount = 0, demoClock = 0;
  const isB = () => game.view.id === 'brawler';
  const pose = (a, k = .25) => isB() ? a + (Math.cos(a) > 0 ? k : -k) : a;
  const body = (x, y, r, extra) => Object.assign(new E.Body({ x, y, r }), { facing: 0, flash: 0, inv: 0, stun: 0, down: 0, floor: 0, rise: 0, t: 0, act: null }, extra);
  const dust = (x, y, n, size = 3) => { for (let i = 0; i < n; i++) puffs.push({ x: x + E.rand(-5, 5), y: y + E.rand(-2, 2), vx: E.rand(-40, 40), t: 0, s: size * E.rand(.7, 1.2) }); };
  const spark = (x, y, z, big) => sparks.push({ x, y, z, big, t: game.real + .035, rot: rnd() });
  const float = (x, y, z, text, color) => floaters.push({ x, y, z, text, color, t: 0 });
  const solid = (c, x, y, R) => { const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy); if (d < R && d > .01) { c.x = x + dx / d * R; c.y = y + dy / d * R; } };
  const lockEnd = () => Math.min(lv.len - 10, lockX);
  const live = () => foes.filter(f => !f.dead && f.hp > 0);

  /* ---- START ---- */
  function start(d) {
    d = d || {}; demo = !!d.demo; session = !!d.session; lv = LEVELS[d.level || 'street']; map = buildMap(lv); bg = lv.sky();
    snap = d.snap || JSON.stringify(S); st = { cash: 0, kills: 0, hits: 0, maxChain: 0, hurt: 0, time: 0, envelopes: 0, rage: 0, ducks: 0 };
    game.cam.bounds = v => { const b = map.bounds(v); if (v.id !== 'brawler') return b; const y1 = b.y1 - 9; return { x0: b.x0 + 8, x1: b.x1 - 8, y0: y1 - game.H * Math.max(1, game.zoom), y1 }; };
    shots = new E.Bullets(game, { plane: 'ground' });
    hero = body(54, 84, 7, { hp: heroMax(), max: heroMax(), lives: 3, grip: 0, stress: 0, rage: 0, bat: 0, rig: rig('vic'), batRig: rig('vicBat'), moves: heroMoves(), name: 'VIC', batT: 0 });
    game.follow(hero, { z: 34, lead: 24 });
    npcs = lv.npcs.map(n => body(n.x, n.y, 5, { n, facing: n.face, rig: rig(n.rig), done: false }));
    boxes = lv.boxes.map(([cx, y, kind]) => ({ x: cx * T, y, kind, hp: 2, flash: 0, box: true }));
    pickups = lv.pickups.map(([kind, x, y]) => ({ kind, x, y, got: false }));
    ducks = lv.pond ? Array.from({ length: lv.ducks }, (_, i) => ({ x: lv.pond.x + E.rand(-lv.pond.rx * .6, lv.pond.rx * .6), y: lv.pond.y + E.rand(-lv.pond.ry * .6, lv.pond.ry * .6), a: rnd() * TAU, t: rnd() * 5, fly: 0, i })) : [];
    foes = []; wave = 0; lockX = lv.waves[0].x + 40; go = 0; intro = 2.2; won = 0; target = null; tgtT = 0; lag = 1; chain = chainT = 0; hover = null; clearedAt = 0; frameCount = 0; demoClock = 0;
    lv.waves.forEach(w => { w.spawned = false; });
    puffs.length = sparks.length = floaters.length = 0; talk.open = false;
    L.enabled = true; L.ambient = lv.ambient; game.weather = lv.rain ? { kind: 'rain', amount: .75, wind: .25, lightning: .12 } : null;
    game.timeScale = 1; music(lv.song);
    nextStep.lock = false; exitDemo.lock = false;
  }

  /* ---- THE HERO ---- */
  const human = () => { const I = game.input; return { mv: I.move(), tap: k => I.buffered(k, .4), consume: k => I.consume(k), pressed: k => I.pressed(k) }; };
  const dirOf = h => isB() ? (Math.cos(h.facing) > 0 ? 1 : -1) : 1;
  const nearFoe = h => live().some(f => !f.knocked && Math.hypot(f.x - h.x, f.y - h.y) < 22 && (!isB() || Math.abs(f.y - h.y) < 9) && E.inArc(h, h.facing, f, 22, .9));
  function control(h, c, dt, truce) {
    const air = !h.onGround, busy = !!(h.act && h.act.busy), free = h.hp > 0 && !h.knocked && h.stun <= 0 && !won && !truce;
    const mv = free ? c.mv : [0, 0], md = game.view.screenDirToGround(mv[0], mv[1]), spd = h.rage > 0 ? 100 : 82;
    if (!h.knocked && h.stun <= 0) { const stop = busy && !air; h.vx = approach(h.vx, stop ? 0 : md[0] * spd, 900 * dt); h.vy = approach(h.vy, stop ? 0 : md[1] * spd * (isB() ? .63 : 1), 900 * dt); }
    if (!busy && Math.hypot(md[0], md[1]) > .2) h.facing = isB() ? (md[0] > .2 ? 0 : md[0] < -.2 ? Math.PI : h.facing) : Math.atan2(md[1], md[0]);
    const use = (m, key) => { if (m.press ? m.press() : m.start()) { h.act = m; c.consume(key); } };
    if (h.hp > 0 && !won && !truce && !h.knocked && h.rage <= 0 && h.stress >= 99.9 && c.pressed('special')) { if (h.act) h.act.cancel(); h.act = null; h.stun = 0; rage(h); }   // rage breaks a stagger: the panic button
    if (free && !busy) {
      const hug = nearFoe(h), key = c.tap('kick') ? 'kick' : 'attack', bat = h.bat > 0;
      if (!air && c.pressed('jump') && h.jump(250)) { h.act = null; sfx('jump'); dust(h.x, h.y, 3); }
      else if (c.pressed('special') && h.stress >= 100 && h.rage <= 0) rage(h);
      else if (air) { if (h.act !== h.moves.fly && c.tap(key)) use(h.moves.fly, key); }
      else if (c.tap('attack')) use(bat ? h.moves.bat : hug ? h.moves.clinch : h.moves.punch, 'attack');
      else if (c.tap('kick')) use(h.moves.kick, 'kick');
    }
    if (h.act && h.act.update(dt) === 'active') sfx('whoosh', { pitch: h.act.state.spec.kick ? .8 : 1 });
    const inReach = t => !t.knocked && Math.hypot(t.x - h.x, t.y - h.y) < 36 && (!isB() || Math.abs(t.y - h.y) < 12) && E.inArc(h, h.facing, t, 32, 1.1);
    const grab = t => { if (t.box) return; if (t.act) t.act.cancel(); const d = dirOf(h); Object.assign(t, { act: null, stun: .9, vx: 0, vy: 0, y: h.y, x: h.x + d * 20 }); };
    if (h.act) h.act.hits(foes.concat(boxes), inReach, t => h.act.state.spec.name === 'grab' ? grab(t) : strike(t, h.act.state, h));
    h.update(dt, map); fall(h, dt);
    h.x = clamp(h.x, 10, lockEnd()); h.y = clamp(h.y, Y0, Y1);
    if (lv.pond) { const p = lv.pond, dx = (h.x - p.x) / (p.rx * .9), dy = (h.y - p.y) / (p.ry * .9), d = Math.hypot(dx, dy); if (d < 1 && d > .01) { h.x = p.x + dx / d * p.rx * .9; h.y = p.y + dy / d * p.ry * .9; } }
    for (const b of boxes) if (!b.dead) solid(h, b.x, b.y, 13);
    for (const n of npcs) solid(h, n.x, n.y, 12);
    for (const m of pickups) if (!m.got && h.hp > 0 && Math.hypot(m.x - h.x, m.y - h.y) < 14) take(m);
  }
  function take(m) {
    m.got = true;
    if (m.kind === 'sandwich') { hero.hp = Math.min(hero.max, hero.hp + 24); hero.stress = Math.max(0, hero.stress - 12); sfx('heal'); float(m.x, m.y, 30, '+24 HP', '#8aff8a'); }
    else if (m.kind === 'bat') { hero.bat = 14 + S.up.bat * 6; sfx('powerup'); float(m.x, m.y, 30, 'BAT!', '#ffd23a'); game.note('A BAT. ' + game.input.label('attack') + ' TO SWING'); }
    else if (m.kind === 'cash') { S.cash += m.v; st.cash += m.v; sfx('coin'); float(m.x, m.y, 30, '+' + money(m.v), '#ffe070'); P.glints(m.x, m.y, 12, 6, '#ffe070'); }
  }
  function rage(h) {
    h.rage = 5; h.stress = 0; st.rage++; game.flash('#ff2a2a', .35, .5); game.shake(6); sfx('boom'); sfx('powerup');
    for (const f of live()) if (Math.hypot(f.x - h.x, f.y - h.y) < 80) { const b = BLOW.rage; f.hp -= b[0] * dmgMul(); f.stun = .5; f.act && f.act.cancel(); f.act = null; Object.assign(f, { knocked: true, bounce: .5, friction: 1.2 }); E.knockback(h, f, b[1], b[2]); chain++; chainT = 1.4; if (f.hp <= 0) ko(f); }
    for (const b of boxes) if (!b.dead && Math.hypot(b.x - h.x, b.y - h.y) < 80) { b.hp = 0; smash(b); }
    P.ring && P.ring(h.x, h.y, 4, 70, '#ff4a2a', .5); dust(h.x, h.y, 10, 5);
    game.note('FUHGEDDABOUDIT!', 1.6);
  }

  /* ---- BLOWS ---- */
  const contact = (c, { spec: s, u }) => s.kick ? c.z + lerp(s.z0, s.z1, 1 - (1 - u) ** 3) * c.rig.o.hipZ * c.rig.o.size : c.rig.hand(s.hand)[2];
  function strike(t, a, by) {
    const s = a.spec, b = BLOW[s.name] || [2, 10, 0], mul = dmgMul() * (by.rage > 0 ? 2 : 1) * (demo ? 3 : 1), heavy = b[0] * mul > 3 || b[2] > 0, dir = Math.sign(t.x - by.x) || 1, x = t.x - dir * 6, z = t.box ? 12 : contact(by, a);
    if (!t.box) { chain = chainT > 0 ? chain + 1 : 1; chainT = 1.4; st.maxChain = Math.max(st.maxChain, chain); }
    const dmg = Math.max(1, Math.round(b[0] * mul));
    game.hitFx(x, t.y + 1, z, { power: heavy ? 1.9 : 1.3, angle: dir > 0 ? 0 : Math.PI, color: '#ffd23a', sound: s.kick ? 'kick' : 'punch', damage: t.box ? undefined : dmg,
      textZ: t.box ? 0 : t.rig.head()[2] + 12 - z + (chain - 1) % 3 * 12, textScale: 2, textColor: heavy ? '#ffd23a' : '#ffffff' });
    spark(x, t.y + 1, z, heavy); t.flash = game.real + .05;
    if (t.box) return smash(t);
    P.bits(t.x, t.y, z + 6, heavy ? 7 : 3, ['#ffffff', '#c8e8ff', '#8ac8f0']);
    target = t; tgtT = 3; st.hits++; by.hits = (by.hits || 0) + 1;
    hero.stress = Math.min(100, hero.stress + 2 * stressMul() * (by.rage > 0 ? 0 : 1));
    if (hero.bat > 0 && ['slash', 'backslash', 'overhead'].includes(s.name)) { hero.batT = 0; if (--hero.bat <= 0) { sfx('bump'); game.note('THE BAT SNAPPED'); P.bits(hero.x, hero.y, 20, 10, ['#c8905a', '#6a4424']); } }
    knock(t, by, [dmg, b[1], b[2]]);
    if (t.hp <= 0) ko(t);
  }
  function knock(c, from, [dmg, force, lift]) {
    c.hp -= dmg; c.stun = .32; c.vx = c.vy = 0; c.rig.kick(-1); if (c.act) c.act.cancel(); c.act = null; c.aim = 0;
    if (c.k && c.k.boss && !lift && c.hp > 0) { c.stun = .12; force *= .3; }          // bosses shrug off the small stuff
    if (c.hp <= 0) { force = Math.max(force, 140); lift = Math.max(lift, 200); }
    if (lift) Object.assign(c, { knocked: true, bounce: .5, friction: 1.2 });
    E.knockback(from, c, force, lift);
  }
  function fall(c, dt) {
    if (!c.knocked) return;
    if (c.bounced || c.landed) { const first = !c.down; if (first) { c.down = 1; c.floor = .9; c.rig.kick(-4); } dust(c.x, c.y, first ? 8 : 3, first ? 4 : 3); game.shake(first ? 2.5 : 1); sfx('land'); }
    if (c.down && c.onGround) { c.friction = 4; if (Math.abs(c.vx) > 30 && rnd() < dt * 20) dust(c.x - Math.sign(c.vx) * 10, c.y, 1, 2); }
    if (c.down && (c.floor -= dt) <= 0 && c.hp > 0) { c.down = 0; c.rise = .7; c.inv = Math.max(c.inv, 1.6); }
    else if (c.rise > 0 && (c.rise -= dt) <= 0) Object.assign(c, { knocked: false, bounce: 0, friction: c.grip, t: .8 });
  }
  function ko(f) {
    if (f.dead) return; f.dead = 2.6; S.kills++; st.kills++; hero.stress = Math.min(100, hero.stress + 3 * stressMul());
    const [lo, hi] = f.k.cash, v = Math.round(E.rand(lo, hi) * (f.k.boss ? 1 : .8)); if (v >= 10 && (f.k.boss || rnd() < .55)) pickups.push({ kind: 'cash', x: f.x, y: f.y, v, got: false });
    if (f.k.boss) { pickups.push({ kind: 'sandwich', x: f.x + 20, y: f.y, got: false }); game.flash('#ffffff', .3, .5); game.timeScale = .3; game.after(.5, () => { game.timeScale = 1; }); sfx('boom'); talk.close(); }
  }
  function smash(b) {
    if (--b.hp > 0) return;
    b.dead = true; sfx('bump'); P.bits(b.x, b.y, 10, 26, ['#c8905a', '#9a6a3a', '#6a4424']); dust(b.x, b.y, 6, 4);
    const r = rnd(); if (r < .3) pickups.push({ kind: 'sandwich', x: b.x, y: b.y + 2, got: false }); else if (r < .75) pickups.push({ kind: 'cash', x: b.x, y: b.y + 2, v: Math.round(E.rand(8, 35)), got: false });
  }
  function hurtHero(f, a, h) {
    if (h.rage > 0 || demo) return;
    const more = f.act.step < f.act.moves.length - 1, b = BLOW[a.spec.name] || [2, 10, 0], z = contact(f, a), x = h.x + Math.sign(f.x - h.x) * 6, dm = Math.max(1, Math.round(b[0] * diff().foeDmg * (f.k.boss ? 1.15 : 1)));
    hit(h, f, [dm, b[1], b[2]], more, x, z);
  }
  function hit(h, from, b, more, x, z) {
    game.hitFx(x, h.y + 1, z, { power: b[2] ? 1.9 : 1.3, color: '#ff6a4a', sound: 'hurt', damage: b[0], textZ: h.rig.head()[2] + 12 - z, textScale: 2, textColor: '#ff8a7a' });
    spark(x, h.y + 1, z, b[2] > 0); knock(h, from, more ? [b[0], 8, 0] : b); h.flash = game.real + .05; h.inv = more ? 0 : .6; chainT = 0; st.hurt += b[0];
    h.stress = Math.min(100, h.stress + b[0] * 2.4 * stressMul());
    if (h.hp > 0) return;
    h.hp = 0; h.lives--;
    if (h.lives > 0) game.after(1.6, () => { Object.assign(h, { hp: h.max, inv: 2.5 }); dust(h.x, h.y, 6); sfx('powerup'); lag = 1; });
    else game.after(1.8, () => { if (session) { hubDone(false); } else game.go('over', { level: lv.id, snap }); });
  }

  /* ---- WAVES AND FOES ---- */
  function spawnWave(w) {
    const bossIn = w.foes.some(k => FOES[k].boss);
    w.foes.forEach((kind, i) => {
      const k = FOES[kind], side = wave && i % 2 ? -1 : 1, x = clamp(w.x + side * (Math.max(190, game.W / 2 / game.view.ax + 24) + i * 26), 12, lv.len - 12);
      const f = body(k.boss ? hero.x + 120 : x, Y0 + 12 + (i * 37) % 90, k.r, { k, name: k.name, hp: k.hp * diff().foeHp, maxhp: k.hp * diff().foeHp, facing: Math.PI, t: 1 + rnd(), friction: 5, grip: 5, aim: 0, base: k.speed,
        moves: k.moves.map(s => new E.Combo(s.map((m, j) => move(m, { wind: Math.max(E.MOVES[m].wind, j ? k.wind / 2 : k.wind) })))), rig: rig(k.rig) });
      if (k.boss) f.x = clamp(hero.x + 120, 12, lv.len - 12);
      foes.push(f);
      if (k.boss) { setVoice(kind); talk.say(k.say, { name: k.name, portrait: f.rig, portraitOpts: { zoom: 2.4, turn: -.6 }, auto: demo ? 2.4 : 0 }); music('boss'); }
    });
    return bossIn;
  }
  function foeAI(f, dt, truce) {
    f.stun -= dt; if (f.dead) f.dead -= dt;
    const h = hero, dx = h.x - f.x, dy = h.y - f.y, dist = Math.hypot(dx, dy), sz = f.rig.o.size, gap = 12 + 5.5 * sz, k = f.k;
    if (k.phase2 && !f.p2 && f.hp < f.maxhp * .5 && !f.dead) { f.p2 = true; f.base *= 1.35; game.flash('#ff2a2a', .25, .4); game.shake(5); sfx('boom'); float(f.x, f.y, 70, 'JOHNNY IS DONE TALKING', '#ff8a7a'); talk.say('You want it? Come and get it!', { name: k.name, portrait: f.rig, auto: 1.8, modal: false });
      for (const kind of ['associate', 'shooter']) { const x = clamp(h.x + (kind === 'associate' ? -190 : 190), 12, lv.len - 12), g = body(x, Y0 + 20 + rnd() * 70, FOES[kind].r, { k: FOES[kind], name: FOES[kind].name, hp: FOES[kind].hp * diff().foeHp, maxhp: FOES[kind].hp * diff().foeHp, facing: Math.PI, t: 1, friction: 5, grip: 5, aim: 0, base: FOES[kind].speed, moves: FOES[kind].moves.map(s => new E.Combo(s.map(m => move(m, { wind: FOES[kind].wind })))), rig: rig(FOES[kind].rig) }); foes.push(g); } }
    if (f.act) {
      if (f.act.update(dt) === 'active') sfx('whoosh', { pitch: .7 });
      f.act.hits([h], t => t.inv <= 0 && !t.knocked && Math.hypot(t.x - f.x, t.y - f.y) < 16 + 6 * sz && (!isB() || Math.abs(t.y - f.y) < 12) && E.inArc(f, f.facing, t, 16 + 6 * sz, 1), t => hurtHero(f, f.act.state, t));
      if (!f.act.busy) { if (f.act.step < f.act.moves.length - 1 && f.act.press()) f.vx = Math.sign(dx) * Math.max(0, Math.abs(dx) - gap) * 5; else f.act = null; }
    } else if (!f.knocked && f.stun <= 0 && h.hp > 0) {
      f.facing = isB() ? (dx > 0 ? 0 : Math.PI) : Math.atan2(dy, dx);
      if (k.ranged) {                                  // shooters keep their distance, aim (telegraph), then fire down the line
        const far = dist > 120, near = dist < 70;
        if (isB()) { f.vx = approach(f.vx, far ? Math.sign(dx) * f.base : near ? -Math.sign(dx) * f.base : 0, 300 * dt); f.vy = approach(f.vy, Math.abs(dy) > 4 ? Math.sign(dy) * 30 : 0, 300 * dt); }
        else { const m = far ? 1 : near ? -1 : 0; f.vx = approach(f.vx, dx / (dist || 1) * f.base * m, 300 * dt); f.vy = approach(f.vy, dy / (dist || 1) * f.base * m, 300 * dt); }
        if (f.aim > 0) { f.vx = f.vy = 0; if ((f.aim -= dt) <= 0) fireAt(f); }
        else if ((f.t -= dt) <= 0 && !truce && dist < 170 && (!isB() || Math.abs(dy) < 14)) { f.aim = .65; f.t = 1.8 + rnd(); sfx('charge', { pitch: 1.4 }); }
      } else if (isB()) {
        const tx = h.x + (dx > 0 ? -gap : gap) - f.x;
        f.vx = approach(f.vx, Math.abs(tx) > 4 ? Math.sign(tx) * f.base : 0, 300 * dt); f.vy = approach(f.vy, Math.abs(dy) > 2 ? Math.sign(dy) * 30 : 0, 300 * dt);
        if ((f.t -= dt) <= 0 && !truce && !h.knocked && Math.abs(tx) < 8 && Math.abs(dy) < 7) { f.act = pick(f.moves); f.act.press(); f.t = (k.boss ? .7 : 1 + rnd()) * (f.p2 ? .6 : 1); }
      } else {
        const go2 = dist > gap, ux = dx / (dist || 1), uy = dy / (dist || 1);
        f.vx = approach(f.vx, go2 ? ux * f.base : 0, 300 * dt); f.vy = approach(f.vy, go2 ? uy * f.base : 0, 300 * dt);
        if ((f.t -= dt) <= 0 && !truce && !h.knocked && dist < gap + 8) { f.act = pick(f.moves); f.act.press(); f.t = (k.boss ? .7 : 1 + rnd()) * (f.p2 ? .6 : 1); }
      }
    }
    f.update(dt, map); f.y = clamp(f.y, Y0, Y1); fall(f, dt);
    if (k.ranged && !f.dead) f.x = Math.min(f.x, lockEnd() + 4);                      // a shooter can't hide behind the screen's lock
    if (lv.pond) { const p = lv.pond, qx = (f.x - p.x) / (p.rx * .9), qy = (f.y - p.y) / (p.ry * .9), d = Math.hypot(qx, qy); if (d < 1 && d > .01) { f.x = p.x + qx / d * p.rx * .9; f.y = p.y + qy / d * p.ry * .9; } }
  }
  function fireAt(f) {
    const h = hero, a = Math.atan2(h.y - f.y, h.x - f.x), sp = 110; sfx('shoot', { pitch: .8 });
    shots.fire({ x: f.x + Math.cos(a) * 8, y: f.y + Math.sin(a) * 8, z: 22, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 2.5, team: 'foe', color: '#ffe070', life: 2.2, dmg: 4 });
    P.sparks(f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 10, 22, 3, a);
  }

  /* ---- THE SIT-DOWNS: shopkeepers, Sal, the ducks ---- */
  const nearest = () => {
    let best = null, d0 = 30; for (const n of npcs) { const d = Math.hypot(n.x - hero.x, n.y - hero.y); if (d < d0 && !(n.done && !n.n.talk)) { d0 = d; best = { kind: 'npc', n, x: n.x, y: n.y }; } }
    if (lv.pond && !best) { const p = lv.pond; const d = Math.hypot((hero.x - p.x) / (p.rx + 18), (hero.y - p.y) / (p.ry + 18)); if (d < 1.15) best = { kind: 'ducks', x: p.x, y: p.y + p.ry }; }
    return best;
  };
  function chain2(lines, o, done) { talk.say(lines, Object.assign({ onDone: () => { done && done(); game.input.consumeAll(); } }, o)); }
  function interact(spot, auto) {
    if (!spot || talk.open || won) return;
    if (spot.kind === 'ducks') return feedDucks(auto);
    const n = spot.n, T = TALK[n.n.id]; if (!T) return;
    setVoice(n.n.voice); n.facing = hero.x < n.x ? Math.PI : 0;
    if (n.n.talk && auto) { if (!S.flags.sal) { S.flags.sal = 1; pickups.push({ kind: 'sandwich', x: n.x + 14, y: n.y + 6, got: false }); } return; }
    if (n.n.talk) { chain2(T.lines, { name: n.n.name, portrait: n.rig }, () => { if (!S.flags.sal) { S.flags.sal = 1; pickups.push({ kind: 'sandwich', x: n.x + 14, y: n.y + 6, got: false }); } }); return; }
    const pay = (lean) => { const [lo, hi] = n.n.cash, v = Math.round(lean ? hi : lo); n.done = true; n.pose = null; S.envelopes++; st.envelopes++; S.cash += v; st.cash += v; S.respect += lean ? -1 : 1; hero.stress = Math.min(100, hero.stress + (lean ? 8 : 0)); if (!lean) S.calm = Math.min(5, S.calm + 0);
      sfx('coin'); sfx('powerup'); P.glints(n.x, n.y, 30, 10, '#ffe070'); float(n.x, n.y, 60, '+' + money(v), '#ffe070'); float(n.x, n.y, 76, lean ? 'RESPECT -1 (FEAR +1)' : 'RESPECT +1', lean ? '#ff8a7a' : '#8aff8a'); };
    if (auto) { pay(false); return; }
    talk.say(T.ask, { name: n.n.name, portrait: n.rig, choices: ['Lean on him.', "Take what's there."], onChoice: i => { game.after(.02, () => { setVoice(n.n.voice); chain2(i === 0 ? T.lean : T.nice, { name: n.n.name, portrait: n.rig }, () => pay(i === 0)); }); } });
  }
  function feedDucks(auto) {
    const left = 3 + S.up.duck - st.ducks;
    if (left <= 0) { if (!auto) chain2("The pond is empty. They always leave eventually. You knew that.", { name: 'VIC' }); return; }
    st.ducks++; S.ducks++; hero.stress = Math.max(0, hero.stress - (35 + S.up.duck * 10)); hero.hp = Math.min(hero.max, hero.hp + 10); sfx('heal'); sfx('pickup');
    for (let i = 0; i < 4; i++) P.glints(lv.pond.x + E.rand(-20, 20), lv.pond.y + E.rand(-8, 8), 8, 3, '#bfe8ff');
    float(hero.x, hero.y, 60, 'STRESS DOWN', '#8ac8ff'); for (const d of ducks) d.fly = d.fly || (left === 1 ? 1 : 0);
    if (!auto) { setVoice('duck'); chain2(pick(TALK.ducks), { name: 'THE DUCKS' }); }
  }

  /* ---- UPDATE ---- */
  function update(dt) {
    common(); frameCount++;
    const I = game.input; demoClock += dt;
    if (demo && (userActive() || demoInput() || game.input.clicked())) return exitDemo();
    if (session && !hubGo()) { talk.update(0); return; }
    const truce = talk.update(dt);
    if (!demo && I.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (demo && Math.floor(demoClock) % 40 === 20 && Math.floor(demoClock - dt) % 40 !== 20) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    st.time += dt; S.time += dt;
    const h = hero;
    const drive = (c, o) => {
      const sz = c.rig.o.size, st2 = c.act && c.act.state, ok = !c.knocked && c.stun <= 0, low = st2 && st2.spec.name === 'sweep' && !(st2.phase === 'recover' && st2.u > .6), fly = c.knocked && !c.down && !(c.rise > 0);
      const R = c === h && h.bat > 0 ? h.batRig : c.rig;
      if (c === h) { const other = R === h.rig ? h.batRig : h.rig; other.update(dt, { x: c.x, y: c.y, z: c.z, facing: pose(c.facing) }); }
      R.update(dt, Object.assign({ x: c.x, y: c.y, z: c.z, vx: c.vx / sz, vy: c.vy / sz, facing: pose(c.facing), air: !c.onGround && !c.knocked, stance: ok && !c.k?.ranged ? 'guard' : null,
        hurt: !ok && !c.down && !(c.rise > 0), down: fly ? clamp(.6 - c.vz / 480, 0, 1) : undefined, point: !!(c.k && c.k.ranged && ok), aim: 0,
        pose: c.down ? 'down' : c.rise > .22 ? 'kneel' : c.rise > 0 || low ? 'crouch' : c.aim > 0 ? 'guard' : null, attack: st2 }, o));
      if (R !== c.rig) c.rig.lastView = R.lastView;
    };
    h.inv -= dt; h.stun -= dt; go -= dt; intro -= dt; tgtT -= dt; chainT -= dt; if (h.rage > 0) { h.rage -= dt; if (rnd() < dt * 30) P.add({ kind: 'ember', x: h.x + E.rand(-8, 8), y: h.y, z: 10, vx: E.rand(-12, 12), vz: E.rand(25, 60), g: -10, drag: 1, max: .7, color: '#ff4a2a' }); }
    if (won) won += dt;
    for (const p of puffs) { p.t += dt; p.x += p.vx * dt; p.vx *= 1 - dt * 5; } E.prune(puffs, p => p.t > .5); E.prune(sparks, s => game.real - s.t > .24);
    for (const f of floaters) f.t += dt; E.prune(floaters, f => f.t > 1.6);
    for (const [, x, y] of lv.street) if (lv.id === 'street' && rnd() < dt * .5) puffs.push({ x: x + E.rand(-4, 4), y, vx: E.rand(-8, 8), t: 0, s: 2 });
    for (const n of npcs) n.rig.update(dt, { x: n.x, y: n.y, facing: pose(n.facing), pose: n.done ? 'hips' : (n.n.talk ? null : 'wave') });
    for (const d of ducks) { d.t += dt; if (d.fly) { d.fly += dt; d.y -= 40 * dt; d.x += 22 * dt; } else { d.a += dt * E.rand(-1, 1) * 2; const p = lv.pond; d.x = clamp(d.x + Math.cos(d.a) * 4 * dt, p.x - p.rx * .7, p.x + p.rx * .7); d.y = clamp(d.y + Math.sin(d.a) * 2 * dt, p.y - p.ry * .7, p.y + p.ry * .7); } }
    lag = Math.max(h.hp / h.max, lag - dt * .35);
    // waves
    const w = lv.waves[wave];
    if (w && !w.spawned && h.x > w.x - 60) { w.spawned = true; const boss = spawnWave(w); lockX = Math.max(h.x + 20, w.x + (boss ? 110 : 100)); if (!boss) sfx('confirm'); }
    if (w && w.spawned && !live().length && !foes.some(f => f.act)) {
      wave++; go = 2.5; lockX = lv.waves[wave] ? lv.waves[wave].x + 40 : lv.len - 10;
      if (!lv.waves[wave]) { won = 1e-3; go = 0; clearedAt = S.time; music(null); sfx('powerup'); try { A.sting(SONGS.sting); } catch (e) { game.fail('sting', e); } game.follow(null); }
      else sfx('confirm');
    }
    const c = demo ? botCtl(dt) : human();
    if (demo) { h.hp = h.max; h.lives = 3; h.inv = Math.max(h.inv, .1); }
    // interactions: a prompt near a shopkeeper or the pond; the click on one
    const spot = nearest(); hover = spot;
    if (spot && !truce && !won && !(h.act && h.act.busy)) {
      const click = I.clicked(), clickHit = click && hoverPick && Math.hypot(click[0] - hoverPick[0], click[1] - hoverPick[1]) < 34;
      if (c.pressed('interact') || clickHit || (demo && c.interactNow)) { if (clickHit) I.consumeAll(); interact(spot, demo); }
    }
    control(h, c, dt, truce);
    if (session) hubTick(dt);
    for (const f of foes) foeAI(f, dt, truce);
    shots.update(dt, map);
    shots.hit([h], (b, t) => { if (t.inv > 0 || t.knocked || t.rage > 0 || demo) return; b.life = 0; hit(t, { x: b.x - b.vx, y: b.y - b.vy, vx: 0, vy: 0 }, [Math.max(1, Math.round(b.dmg * diff().foeDmg)), 30, 0], false, t.x, 22); }, 'foe');
    for (const a of [h, ...foes]) for (const b of foes) if (a !== b && !a.dead && !b.dead && a !== h) solid(b, a.x, a.y, a.r + b.r + 10);
    E.prune(foes, f => { const gone = f.dead !== undefined && f.dead <= 0; if (gone) dust(f.x, f.y, 6); return gone; });
    E.prune(pickups, p => p.got);
    if (won) game.focus(h.x - 60 / game.zoom, h.y, 34);
    drive(h, won > 1 ? { facing: pose(h.facing, lerp(.25, .7, Math.min(1, (won - 1) * 2))), pose: won > 4 ? 'hips' : 'cheer', stance: null } : {});
    for (const f of foes) drive(f);
    if (won > 2.5 && !session && (I.pressed('confirm') || demo && won > 6)) nextStep();
    if (session && won > 1.5 && !hub.sent) hubDone(true);
    if (demo && demoClock > 150) nextStep();
  }
  function nextStep() { if (nextStep.lock) return; nextStep.lock = true; flowNext(); }

  /* ---- THE ATTRACT BOT: it cheats (no damage, triple punches), clears the street, takes the envelopes, grabs the bat, feeds the ducks ---- */
  let hoverPick = null;
  function botCtl(dt) {
    const h = hero, ctl = { mv: [0, 0], want: new Set(), interactNow: false, tap(k) { return this.want.has(k); }, consume(k) { this.want.delete(k); }, pressed(k) { return this.want.has(k); } };
    const fs = live().sort((a, b) => Math.abs(a.x - h.x) + Math.abs(a.y - h.y) - Math.abs(b.x - h.x) - Math.abs(b.y - h.y)), f = fs[0], n = frameCount;
    const steer = (tx, ty, pre = 4) => { const dx = tx - h.x, dy = ty - h.y; ctl.mv = [Math.abs(dx) > pre ? Math.sign(dx) : 0, Math.abs(dy) > 3 ? Math.sign(dy) : 0]; return Math.hypot(dx, dy); };
    if (talk.open) return ctl;
    if (!botCtl.p || Math.hypot(h.x - botCtl.p[0], h.y - botCtl.p[1]) > 3 || demoClock - botCtl.p[2] > 1.2) { if (!botCtl.p || demoClock - botCtl.p[2] > 1.2) { botCtl.stuck = botCtl.p && Math.hypot(h.x - botCtl.p[0], h.y - botCtl.p[1]) < 3; } botCtl.p = [h.x, h.y, demoClock]; }
    if (botCtl.stuck && !f) { ctl.want.add('attack'); }
    if (f) {
      const side = h.x < f.x ? -1 : 1, tx = f.x + side * 24;
      if (!isB()) { const d = steer(f.x - side * 18, f.y, 3); if (d < 30) { ctl.mv = [0, 0]; h.facing = Math.atan2(f.y - h.y, f.x - h.x); } }
      else steer(tx, f.y);
      const near = Math.hypot(f.x - h.x, f.y - h.y) < 34, faced = isB() ? (side < 0 ? Math.cos(h.facing) > 0 : Math.cos(h.facing) < 0) === true : true;
      if (isB() && near && !faced) ctl.mv = [-side, 0];
      if (near && faced) { if (n % 9 === 0) ctl.want.add(n % 36 === 0 ? 'kick' : 'attack'); if (n % 150 === 0) ctl.want.add('jump'); }
      if (h.stress >= 100 && fs.length > 2 && h.rage <= 0) ctl.want.add('special');
      else if (h.stress < 100 && fs.length >= 3 && n % 200 === 0) h.stress = Math.min(100, h.stress + 60);
      return ctl;
    }
    const bat = pickups.find(p => p.kind === 'bat' && !p.got && Math.abs(p.x - h.x) < 150); if (bat && h.bat <= 0) { steer(bat.x, bat.y); return ctl; }
    const loot = pickups.find(p => (p.kind === 'cash' || p.kind === 'sandwich' && h.hp < h.max - 4 + 5) && !p.got && Math.abs(p.x - h.x) < 160); if (loot) { steer(loot.x, loot.y); return ctl; }
    const nn = npcs.find(q => !q.done && !q.n.talk && q.x > h.x - 40 && q.x < lockEnd() + 200 && q.x < h.x + 260); if (nn) { const d = steer(nn.x - 18, nn.y + 4, 3); if (d < 28) ctl.interactNow = true; return ctl; }
    if (lv.pond && st.ducks < 2 && hero.x > lv.pond.x - 90 && hero.x < lv.pond.x + 140) { const d = steer(lv.pond.x - lv.pond.rx - 14, lv.pond.y + 10, 3); if (d < 20) { ctl.interactNow = true; } return ctl; }
    const sal = npcs.find(q => q.n.talk && !S.flags.sal); if (sal && Math.abs(sal.x - h.x) < 60) { const d = steer(sal.x + 16, sal.y, 3); if (d < 26) ctl.interactNow = true; return ctl; }
    steer(Math.min(lockEnd(), h.x + 60), 84 + Math.sin(demoClock * .5) * 20, 4);
    return ctl;
  }
  function exitDemo() { if (exitDemo.lock) return; exitDemo.lock = true; game.input.consumeAll(); loopDemo = 0; game.go('title'); }

  /* ---- DRAW ---- */
  const lightAt = (x, y) => { let Lt = null, k = 0; for (const q of lv.lights) { const v = 1 - Math.hypot((x - q.x) / (q.r * 1.5), (y - q.y) / q.r); if (v > k) { k = v; Lt = q; } } return Lt ? { c: Lt.c, side: Lt.x > x ? 1 : -1, k } : { c: '#9a8ae0', side: -1, k: .2 }; };
  const RIM = E.mkCanvas(8, 8), rimG = E.ctx2d(RIM);
  function fighter(r, c, o = {}, R) {
    const Lt = lightAt(c.x, c.y), rg = R || c.rig;
    r.actor(c.x, c.y, c.z, (g, ox, oy) => {
      const Sz = g.canvas.width; if (RIM.width !== Sz) RIM.width = RIM.height = Sz;
      rg.draw(g, ox, oy, r.view);
      px.blend(g, .22 * Lt.k, 'source-atop', () => px.rect(g, 0, 0, Sz, Sz, Lt.c));
      px.blend(rimG, 1, 'copy', () => rimG.drawImage(g.canvas, 0, 0)); px.blend(rimG, 1, 'destination-out', () => rimG.drawImage(g.canvas, -Lt.side, 0));
      px.blend(rimG, 1, 'source-in', () => px.rect(rimG, 0, 0, Sz, Sz, Lt.c)); px.blend(g, .25 + .5 * Lt.k, 'normal', () => g.drawImage(RIM, 0, 0)); px.reset(g);
    }, Object.assign({ rim: false }, o));
  }
  function star(g, x, y, s) {
    const u = (game.real - s.t) / .24, R = (s.big ? 21 : 15) * game.zoom, n = u < .3 ? 6 : 8, pt = (i, d) => [x + Math.cos(i * Math.PI / n + s.rot) * d, y + Math.sin(i * Math.PI / n + s.rot) * d * .8];
    if (u < 0) return;
    const spikes = (r0, r1, c) => px.poly(g, Array.from({ length: n * 2 }, (_, i) => pt(i, i % 2 ? r1 : r0)), c);
    if (u < .3) { spikes(R, R * .3, '#ff6a1a'); spikes(R * .72, R * .24, '#ffe070'); px.disc(g, x, y, R * .28, '#ffffff'); }
    else if (u < .6) { spikes(R * 1.15, R * .5, '#ffd23a'); spikes(R * .85, R * .4, '#fff8e0'); }
    else for (let i = 0; i < 16; i += 2) px.line(g, ...pt(i, R * .8), ...pt(i, R * 1.3), '#ffe8a0', 2);
  }
  function draw(r) {
    const blink = t => t > 0 && t < 1 && Math.floor(game.real * 20) % 2 ? .25 : 1, Z = game.zoom;
    const at = (x, y, z, f, o) => r.queue(x, y, z, g => { const [sx, sy] = r.w(x, y, z); f(g, Math.round(sx), Math.round(sy)); }, o);
    bg.draw(r);
    map.drawFloor(r);
    for (const c of [hero, ...foes, ...npcs]) r.shadow(c.x, c.y, lerp(4.8 * c.rig.o.size * Math.max(.4, 1 - c.z / 60), 24, c.rig.downW || 0), .45);
    map.queueWalls(r);
    for (const b of lv.blocks) paintFront(r, b, lv);
    if (lv.id === 'street') { r.prop('awning', lv.blocks[1].x0 + 24, T + 2, 27, { size: .75, color: '#d83a3a' }); r.prop('awning', lv.blocks[1].x0 + 60, T + 2, 27, { size: .75, color: '#d83a3a' }); r.prop('awning', lv.blocks[3].x0 + 24, T + 2, 27, { size: .75, color: '#3a6ac8' }); }
    for (const x of lv.lamps) { r.prop('streetlamp', x, 44, 0, { size: 1.1, light: true }); L.add(x, 46, 60, 70, .9, { color: lv.dusk ? '#ffb45a' : '#c8e0ff' }); }
    for (const [kind, x, y, size] of lv.street) { r.prop(kind, x, y, 0, { size }); if (kind === 'firedrum') L.add(x, y, 30, 50, .8, { color: '#ff7a2a' }); }
    if (lv.pond) { const p = lv.pond; at(p.x, p.y, 0, (g, sx, sy) => px.blend(g, .3, 'add', () => px.ell(g, sx, sy, p.rx * .6 * Z, p.ry * .5 * Z, '#bfe0ff')), { bias: -.5 }); for (const x of [-30, 34, 8]) r.prop('bush', p.x + x, p.y - p.ry - 4, 0, { size: 1.4 }); for (const q of [[p.x - p.rx - 8, p.y + 4], [p.x + p.rx + 10, p.y + 14]]) r.prop('rock', q[0], q[1], 0, { size: 1.5 });
      for (const d of ducks) at(d.x, d.y, 2 + (d.fly ? 20 + d.fly * 10 : 0), (g, sx, sy) => { if (d.fly > 2) return; px.blend(g, d.fly ? Math.max(0, 1 - d.fly / 2) : 1, 'normal', () => px.sprite(g, DUCK, sx - 12, sy - 16 + Math.round(Math.sin(d.t * 3 + d.i) * 1.2), d.a % TAU > Math.PI)); }); }
    for (const b of boxes) if (!b.dead) { const key = b.kind; if (!BOXSPR[key]) BOXSPR[key] = E.prop(key, { size: .8, color: key === 'barrel' ? '#9a6030' : undefined }).frames[0]; r.sprite(b.x, b.y, 0, BOXSPR[key], { flash: b.flash > game.real }); }
    for (const m of pickups) { const bob = Math.sin(game.real * 4 + m.x) * 1.5; r.sprite(m.x, m.y, 4 + bob, m.kind === 'sandwich' ? SANDWICH : m.kind === 'bat' ? BATSPR : ENVELOPE); }
    for (const n of npcs) fighter(r, n, { flash: false });
    for (const f of foes) fighter(r, f, { flash: f.flash > game.real, alpha: blink(f.dead) });
    fighter(r, hero, { alpha: hero.inv > 0 && hero.hp > 0 && hero.stun <= 0 && (!hero.knocked || hero.rise > 0) && Math.floor(game.real * 16) % 2 ? .45 : 1, flash: hero.rage > 0 ? (Math.floor(game.real * 8) % 2 ? '#ff4a2a' : false) : hero.flash > game.real && '#ffb0a0', flashMix: hero.rage > 0 ? .3 : .5 }, hero.bat > 0 ? hero.batRig : hero.rig);
    for (const id in ghosts) { const g = ghosts[id]; if (!g || game.real - g.seen > 4) continue; const gr = ghostRig(id); gr.update(game.step || 1 / 120, { x: g.x, y: g.y, z: g.z || 0, facing: pose(g.f), vx: 0, vy: 0 }); r.actor(g.x, g.y, g.z || 0, (gg, ox, oy) => gr.draw(gg, ox, oy, r.view), { alpha: .5 }); at(g.x, g.y, 62, (gg, sx, sy) => E.font.text(gg, g.name, sx, sy, g.color, { align: 'center', ...TXT })); }
    for (const c of [hero, ...foes]) { const a = c.rig.atk; if (c.act && c.act.state && (c.act.state.phase === 'active')) (c === hero && hero.bat > 0 ? hero.batRig : c.rig).drawSmear(r, ['#ffffff', '#fff2c8', '#ffd07a', '#e8904a']); }
    for (const f of foes) if (f.aim > 0) at(f.x, f.y, 62, (g, sx, sy) => { E.font.text(g, '!', sx, sy, '#ff3a3a', { align: 'center', scale: 2, ...TXT }); const a = Math.atan2(hero.y - f.y, hero.x - f.x), [ex, ey] = r.w(f.x + Math.cos(a) * 90, f.y + Math.sin(a) * 90, 22), [bx, by] = r.w(f.x, f.y, 22); px.blend(g, .4, 'normal', () => px.line(g, Math.round(bx), Math.round(by), Math.round(ex), Math.round(ey), '#ff3a3a')); });
    shots.draw(r);
    for (const p of puffs) at(p.x, p.y, p.t * 16, (g, x, y) => { const u = p.t / .5, R = p.s * 1.6 * (u < .25 ? .5 + u * 2 : 1.25 - u) * Z; px.blend(g, u < .5 ? .5 : .25, 'normal', () => { px.ell(g, x, y, R * 1.5, R * .7, '#8a7e9a'); px.ell(g, x - R * .3, y - R * .3, R, R * .4, '#d0c8dc'); }); });
    for (const s of sparks) at(s.x, s.y, s.z, (g, x, y) => star(g, x, y, s), { bias: .5 });
    for (const f of floaters) at(f.x, f.y, f.z + f.t * 18, (g, x, y) => E.font.text(g, f.text, x, y, f.color, { align: 'center', ...TXT, scale: 1 }), { bias: .6 });
    if (hover && !talk.open && !won) { hoverPick = null; at(hover.x, hover.y, hover.kind === 'npc' ? 74 : 40, (g, sx, sy) => { hoverPick = [sx, sy]; const label = game.input.label('interact') + (hover.kind === 'ducks' ? '  FEED THE DUCKS' : hover.n.n.talk ? '  TALK' : '  COLLECT'); const w = E.font.width(label) + 10; E.ui.box(g, sx - w / 2, sy - 12, w, 13, WIN); E.font.text(g, label, sx, sy - 9, '#ffe070', { align: 'center', ...TXT }); }, { bias: .7 }); } else hoverPick = null;
    r.overlay(g => hud(g, r)); talk.draw(r);
  }

  /* ---- HUD ---- */
  function panel(g, x, name, f, lagF, color, right, y = 4, sub) {
    E.ui.box(g, x, y, 154, 40, right ? WINR : WIN);
    const c = right ? target : hero;
    if (c && c.rig) c.rig.drawPortrait(g, right ? x + 118 : x + 6, y + 5, 30, { zoom: 2.1, turn: right ? -.6 : .6, bg: right ? ['#a83a5a', '#2a0c1c'] : ['#5a6ac0', '#161030'], border: right ? '#f0b0c8' : '#d0c8f8', shadow: false, tint: c.hp > 0 ? undefined : '#808080' });
    const tx = right ? x + 5 : x + 42, t = E.tones(color), n = Math.round(106 * clamp(f, 0, 1));
    E.font.text(g, name, tx, y + 7, '#ffe070', Object.assign({ gradient: right ? ['#ffd8d8', '#ff7070'] : ['#fff6c0', '#f0a830'] }, TXT));
    if (!right) E.font.text(g, '×' + hero.lives, tx + E.font.width(name) + 5, y + 7, '#ffffff', TXT);
    E.ui.bar(g, tx, y + 23, 108, 10, lagF, '#fff0e0');
    if (n > 0) { px.rect(g, tx + 1, y + 24, n, 8, color); px.rect(g, tx + 1, y + 24, n, 2, t.hi); px.rect(g, tx + 1, y + 30, n, 2, t.sh); }
    if (sub) E.font.text(g, sub, right ? x + 112 : x + 150, y + 7, '#e8e4ff', right ? TXR : TXR);
  }
  function hud(g, r) {
    const W = r.W, H = r.H;
    if (won > 1.5) { if (!session) results(g, r); else E.font.title(g, 'CHAPTER CLEARED', W / 2, H / 2 - 20, { scale: 2, align: 'center' }); return; }
    panel(g, 4, 'VIC', hero.hp / hero.max, lag, '#ffd23a', false);
    // stress meter: fills with hits taken and landed; full: rage is ready
    const sy = 47, full = hero.stress >= 99.9, sw = 154;
    E.ui.box(g, 4, sy, sw, 36, WIN); E.font.text(g, 'STRESS', 10, sy + 4, full ? '#ff8a6a' : '#c8b8f0', TXT);
    E.ui.bar(g, 52, sy + 5, 96, 9, hero.stress / 100, '#fff0e0'); const sn = Math.round(94 * clamp(hero.stress / 100, 0, 1)); if (sn > 0) { px.rect(g, 53, sy + 6, sn, 7, full && Math.floor(game.real * 6) % 2 ? '#ffffff' : '#e8483c'); px.rect(g, 53, sy + 6, sn, 2, '#ff9a8a'); }
    if (full) E.font.text(g, game.input.label('special') + ' FUHGEDDABOUDIT!', 10, sy + 14, Math.floor(game.real * 4) % 2 ? '#ffe070' : '#ffffff', TXT);
    else if (hero.rage > 0) E.font.text(g, 'RAGE ' + hero.rage.toFixed(1), 10, sy + 14, '#ff8a6a', TXT);
    E.font.text(g, money(S.cash), 10, sy + 25, '#8aff8a', TXT); E.font.text(g, 'SCORE ' + String(score()).padStart(6, '0'), 150, sy + 25, '#e8e4ff', TXR);
    if (hero.bat > 0) { E.ui.box(g, 4, 86, 70, 14, WIN); E.font.text(g, 'BAT ×' + hero.bat, 10, 90, '#e8c890', TXT); }
    const foe = tgtT > 0 && target && (!target.dead || tgtT > 2.4) ? target : live().find(f => Math.hypot(f.x - hero.x, f.y - hero.y) < 56) || live().find(f => f.k.boss);
    if (foe && !won) { target = foe; const fx = Math.min(W, cornerX()) - 158; panel(g, fx < 162 ? W - 158 : fx, foe.name, foe.hp / foe.maxhp, 0, '#e8463c', true, fx < 162 ? 48 : 4); }
    if (chain > 1 && chainT > 0) { const s = String(chain), w = E.font.width(s, 3), hy = 106; E.ui.box(g, 6, hy, w + 44, 28, { bg: ['#d8402a', '#4a0a1a'], border: '#ffd070' }); E.font.title(g, s, 12, hy + 3, { scale: 3, colors: ['#ffffff', '#ffe070', '#ff9a2a'] }); E.font.title(g, 'HITS', 18 + w, hy + 13, { scale: 1, colors: ['#fff6d0', '#ffc860'] }); }
    if (!talk.open && !won && !demo) {   // the objective and the buttons, bottom of the screen
      const ln = [['jump', 'JUMP'], ['attack', hero.bat > 0 ? 'SWING' : 'PUNCH'], ['kick', 'KICK'], ['special', 'RAGE'], ['interact', 'TALK'], ['view', 'VIEW']].map(([a, w]) => game.input.label(a) + ' ' + w).join('   ');
      E.font.text(g, ln, W / 2, H - 12, '#c8c0e8', TXC);
      E.font.text(g, lv.objective, W / 2, H - 24, '#ffe7a8', TXC);
    }
    if (intro > 0) { const k = Math.min(1, (2.2 - intro) * 5, intro * 5), cw = 220, x = Math.round(W / 2 - cw / 2 + (1 - k) * (intro < 1 ? W : -W)), m = x + cw / 2, y = 76;
      E.ui.box(g, x, y, cw, 62, WIN); E.font.title(g, 'CHAPTER ' + (lv.id === 'street' ? 1 : 2), m, y + 5, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }); E.font.text(g, lv.name, m, y + 27, '#ffe8c8', TXC); E.font.text(g, lv.sub, m, y + 41, '#b8b0e0', TXC); }
    if (go > 0 && Math.floor(game.real * 3) % 2 === 0 && !won) E.font.title(g, 'GO →', W - 14, 96, { scale: 3, align: 'right', colors: ['#fff6c0', '#ffc040', '#e06a20'] });
    if (demo) { E.ui.box(g, W / 2 - 100, H - 22, 200, 14, { bg: '#000', alpha: .6, border: '#ffe070' }); E.font.text(g, 'ATTRACT MODE  -  PRESS ANYTHING', W / 2, H - 18, '#ffe070', TXC); }
    if (session) { E.font.text(g, 'AI HUB ROUND  ' + Math.max(0, Math.round(hubTimeLeft())) + 's', W / 2, 8, '#8ac8ff', TXC); const t = hubCountdown(); if (t > 0) E.font.title(g, String(Math.ceil(t)), W / 2, H / 2 - 20, { scale: 5, align: 'center' }); else if (t === Infinity || t === -1) E.font.text(g, 'WAITING FOR THE HUB…', W / 2, H / 2, '#fff', TXC); }
  }
  function results(g, r) {
    const W = r.W, X = Math.round(W * .27), grade = ordinalGrade(clamp((st.kills * 2 + st.envelopes * 8 + st.maxChain * 2 - st.hurt * .15) / (lv.waves.reduce((n, w) => n + w.foes.length, 0) * 2 + 24 + 40), 0, 1));
    E.font.title(g, 'CHAPTER CLEARED', X, 40, { scale: 2, align: 'center' });
    E.ui.box(g, X - 108, 60, 216, 110, WIN);
    const rows = [['THE TAKE', money(st.cash)], ['ENVELOPES', st.envelopes + (lv.id === 'street' ? ' / 3' : '')], ['KNOCKED OUT', st.kills], ['BEST CHAIN', st.maxChain], ['DAMAGE TAKEN', st.hurt], ['RAGE', st.rage], ['TIME', Math.floor(st.time / 60) + ':' + String(Math.floor(st.time % 60)).padStart(2, '0')]];
    rows.forEach(([k, v], i) => { E.font.text(g, k, X - 98, 68 + i * 12, '#b8b0d8', TXT); E.font.text(g, String(v), X + 98, 68 + i * 12, '#ffe070', TXR); });
    E.font.title(g, grade, X + 70, 148, { scale: 3, align: 'center', colors: ['#ffffff', '#ffe070', '#ff9a2a'] });
    if (Math.floor(game.real * 2) % 2 === 0) E.font.text(g, game.input.label('confirm') + ' CONTINUE', X, 176, '#ffe7a8', TXC);
  }
  const ghostRigs = {}; const ghostRig = id => ghostRigs[id] || (ghostRigs[id] = rig('vic', { colors: Object.assign({}, CAST.vic.colors, { cloth: (ghosts[id] && ghosts[id].color) || '#3b82f6', coat: (ghosts[id] && ghosts[id].color) || '#3b82f6' }) }));
  const cornerX = () => game.W;
  function jumpToWave(i) { lv.waves.forEach((w, k) => { w.spawned = k < i; }); wave = i; lockX = lv.waves[i].x + 40; hero.x = lv.waves[i].x - 55; foes.length = 0; }
  const state = () => ({ hero, foes, wave, lockX, won, lv, st, pickups, npcs, ducks, boxes, talk, demo, shots });
  const ghost = (id, d) => { ghosts[id] = Object.assign(ghosts[id] || {}, d, { seen: game.real }); };
  const mySnap = () => ({ x: Math.round(hero.x), y: Math.round(hero.y), z: Math.round(hero.z), f: +hero.facing.toFixed(2), s: score() });
  return { view: 'brawler', views: ['brawler', 'threequarter', 'topdown', 'iso'], res: 'ps1', pausable: true, propSize: 2.4, camera: { zoom: [.75, 1.5], tall: 1.5 }, input: INPUT,
    enter: start, update, draw, state, jumpToWave, ghost, mySnap, talkBox: talk, interactNow: interact, rage, strike, ko, take, spawnWave,
    back() { return false } };
})();
