/* ---- CUTSCENES (12.5, Appendix C): a stage set (locker room, the lake at dusk, the Grindhouse, the mall, the Dome's
 * tunnel, the ending on the ice), the cast staged, E.Dialog boxes with live portraits and babble, choices as two big
 * options; ✕ advances, holding ○ for 1 s skips (with a fill ring). The runner is embeddable (the attract reel uses it) ---- */
const Cutscene = (() => {
  const SETS = {
    locker: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, b = Math.floor(y / 6) % 2; return [118 + n * 16 + b * 8, 84 + n * 12 + b * 6, 54 + n * 10]; }, wall: { face: 'plank', side: '#6a4a30', top: '#8a6a4a' }, sky: ['#1a1410', '#2a2018', '#3a2a1e'], amb: .6, light: '#ffd8a0' },
    pond: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05); return y > 40 ? [200 + n * 20 + m * 12, 214 + n * 18 + m * 12, 230 + n * 10] : [220 + n * 16, 228 + n * 16, 240 + n * 8]; }, wall: null, sky: ['#1a1e48', '#5a3a6a', '#e88a5a'], amb: .5, light: '#ff9a3a' },
    grind: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return [70 + n * 18, 74 + n * 18, 72 + n * 16]; }, wall: { face: 'brick', side: '#4a3a3a', top: '#5a4a4a' }, sky: ['#101410', '#1a201a', '#24302a'], amb: .45, light: '#c8ffd8' },
    mall: { floor: (x, y) => { const t = (Math.floor(x / 16) + Math.floor(y / 16)) % 2, n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return t ? [220 + n * 8, 212 + n * 8, 226 + n * 8] : [176 + n * 8, 166 + n * 8, 188 + n * 8]; }, wall: { face: 'plaster', side: '#a8a0b8', top: '#c8c0d8' }, sky: ['#2a1a3a', '#4a2a5a', '#e0389a'], amb: .7, light: '#ff8ad8' },
    tunnel: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return [40 + n * 10, 34 + n * 10, 46 + n * 10]; }, wall: { face: 'stone', side: '#2a2430', top: '#3a3240' }, sky: ['#05040a', '#100c18', '#1a1424'], amb: .4, light: '#ffffff' },
    ending: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .04, y * .04); return [228 + n * 8 + m * 8, 240 + n * 6 + m * 6, 250 + n * 4]; }, wall: { face: 'plank', side: '#f2efe6', top: '#5a3a22' }, sky: ['#0a0a18', '#1a1430', '#3a2a50'], amb: .6, light: '#ffd8a0' }
  };
  const maps = {};
  function mapFor(set) {
    if (maps[set]) return maps[set];
    const S2 = SETS[set], rows = [];
    for (let R = 0; R < 9; R++) rows.push(R === 0 && S2.wall ? '#'.repeat(24) : '.'.repeat(24));
    const map = new E.TileMap({ rows, legend: { '#': 1, '.': { floor: 'f' } }, types: { 1: Object.assign({ h: 64 }, S2.wall || {}) }, floorTex: S2.floor, outside: '#0a0a10', ao: 6 });
    return (maps[set] = map);
  }
  const rigCache = new Map();
  function rigOf(who) { const k = SPEAKERS[who] || who; if (!rigCache.has(k)) rigCache.set(k, Rigs.cast(k)); return rigCache.get(k); }
  /** a runner: run(id, { done, embedded, attract }) -> { update(dt), draw(r), done } */
  function run(id, o = {}) {
    const sc = STORY.cutscenes[id]; if (!sc) throw new Error('no cutscene ' + id);
    const talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', bg: '#0a1224', voice: null, vars: Story.st.flags });
    const cast = sc.cast.map(([who, x, y]) => ({ who, x, y, rig: rigOf(who), facing: PI / 2 + (x < 170 ? -.5 : .5), pose: null, hidden: false, tx: x, ty: y, t: RNG.fx() * 6 }));
    const R = { id, sc, i: -1, wait: 0, done: false, talk, cast, holdT: 0, set: sc.set, cup: null, confetti: 0, wagon: null, shake: 0, choiceN: o.chapter || Story.chapter, handshake: null };
    const castOf = who => cast.find(c => c.who === who);
    function next() {
      R.i++;
      if (R.i >= sc.steps.length) { R.done = true; if (o.done) o.done(); return; }
      const s = sc.steps[R.i];
      if (s.say) { const c = castOf(s.say), k = SPEAKERS[s.say] || s.say, cc = CAST[k] || CAST.chuck; if (c) { c.talking = true; for (const q of cast) if (q !== c) q.facing = E.lerpAng(PI / 2, Math.atan2(c.y - q.y, c.x - q.x), .65); c.facing = PI / 2 + (c.x < 170 ? -.35 : .35); }
        talk.say(s.text, { name: cc.name, portrait: c ? c.rig : rigOf(s.say === 'chuck' || s.say === 'moose' ? s.say : 'chuck'), portraitSize: 40, portraitOpts: { zoom: 2.8, turn: .4, bg: '#1a2a4a' }, voice: Synth.voiceFn(cc.voice), auto: o.attract ? 2.2 : 0, onDone: () => { if (c) c.talking = false; next(); } });
        if (c && s.expr) c.expr = s.expr; return; }
      if (s.choice) { const n = R.choiceN, opts = STORY.choices[n], c = castOf(s.choice.who), cc = CAST[SPEAKERS[s.choice.who] || s.choice.who];
        talk.say(s.choice.text, { name: cc ? cc.name : '', portrait: c ? c.rig : null, portraitSize: 40, portraitOpts: { zoom: 2.8, turn: .4, bg: '#1a2a4a' }, voice: cc ? Synth.voiceFn(cc.voice) : null, choices: opts.map(q => q[0]), onChoice: i => { if (!o.attract) Story.choose(n, i); else Story.st.flags.tacticLine = opts[i][1].line || ''; next(); } }); return; }
      if (s.pose) { const c = castOf(s.pose); if (c) c.pose = s.p; R.wait = .4; return; }
      if (s.enter) { const c = castOf(s.enter); if (c) { c.hidden = false; c.x = s.at[0]; c.y = s.at[1]; c.tx = s.to[0]; c.ty = s.to[1]; } R.wait = 1; return; }
      if (s.exit) { const c = castOf(s.exit); if (c) { c.tx = 320; } R.wait = .8; return; }
      if (s.sfx) { Synth.sfx(s.sfx); R.wait = .3; return; }
      if (s.wait) { R.wait = s.wait; return; }
      if (s.handshake) { R.handshake = { t: 0 }; R.wait = 3.2; return; }
      if (s.cup) { const c = castOf(s.cup); R.cup = { who: c, t: 0 }; R.wait = 2.2; Synth.horn(true, 1.6); Synth.swell('roar'); game.after(.9, () => { R.confetti = 3; P.explosion(c.x, c.y, 34, 1.2, { freeze: false, shake: 0, debris: false }); }); return; }
      if (s.wagon) { R.wagon = { x: -40, t: 0 }; R.wait = 4.5; Synth.sfx('aooga'); return; }
      next();
    }
    // the Glitterman enters later: hidden until his step
    for (const s of sc.steps) if (s.enter) { const c = castOf(s.enter); if (c) c.hidden = true; }
    R.update = dt => {
      if (R.done) return;
      if (R.i < 0) next();
      const I = game.input;
      // hold cancel for 1 s to skip (the first choice is the default)
      if (game.players.some(p => p.down('cancel'))) { R.holdT += dt; if (R.holdT >= 1) { R.holdT = 0; skip(); return; } } else R.holdT = Math.max(0, R.holdT - dt * 2);
      if (R.wait > 0) { R.wait -= dt; if (R.wait <= 0) next(); }
      else talk.update(dt);
      if (R.confetti > 0) { R.confetti -= dt; if (RNG.fx() < .6) P.bits(140 + RNG.fx() * 80, 60 + RNG.fx() * 30, 50, 3, ['#ffd84a', '#ff4ab8', '#4af0f0', '#ffffff', '#7ad87a']); }
      if (R.wagon) { R.wagon.x += dt * 90; R.wagon.t += dt; if (Math.floor(R.wagon.t * 10) % 3 === 0) Synth.sfx('putter'); }
      if (R.handshake) R.handshake.t += dt;
      for (const c of cast) {
        c.t += dt; c.x = approach(c.x, c.tx, 80 * dt); c.y = approach(c.y, c.ty, 80 * dt);
        if (R.handshake) { const k = R.handshake.t, home = !['glitterman', 'sterling', 'vault', 'timber', 'rocco', 'rollo', 'chad', 'pete', 'axel', 'rig'].includes(c.who); c.x = c.tx + (home ? 1 : -1) * Math.sin(k * 1.2) * 30; }
        const moving = Math.abs(c.x - c.tx) > 1 || R.handshake;
        if (c.rig.hk && c.rig.hk.mode === 'skate') { c.rig.hk.ph = (c.rig.hk.ph || 0) + dt * (moving ? 5 : 0); c.rig.hk.push = moving ? .6 : 0; c.rig.hk.stick = { act: R.cup && R.cup.who === c ? 'none' : 'idle' }; }
        const pose = R.cup && R.cup.who === c ? 'cheer' : c.pose || (R.confetti > 0 ? 'cheer' : null);
        c.rig.update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.facing, pose, expr: c.talking ? (c.expr || null) : R.confetti > 0 ? 'smile' : null });
        c.rig._talk = !!c.talking;
      }
    };
    function skip() {
      // apply the default choice if the scene had one and it hasn't been made
      const ch = sc.steps.findIndex(s => s.choice); if (ch >= 0 && R.i <= ch && !o.attract) Story.choose(R.choiceN, 0);
      talk.open = false; R.done = true; Synth.sfx('menuBack'); if (o.done) o.done();
    }
    R.draw = r => {
      const S2 = SETS[sc.set], map = mapFor(sc.set);
      r.sky(S2.sky);
      map.drawFloor(r); map.queueWalls(r);
      L.enabled = true; L.ambient = S2.amb; L.add(170, 70, 60, 260, .9, { color: S2.light });
      dressSet(r, sc.set, R);
      for (const c of cast) { if (c.hidden) continue; r.shadow(c.x, c.y, 7, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, E.charView(r.view))); }
      if (R.cup && R.cup.who) { const c = R.cup.who, h = c.rig.hand ? c.rig.hand('R') : [c.x, c.y, 30]; r.queue(c.x, c.y, 34, g => { const q = r.w(c.x, c.y, (h[2] || 30) + 6); Cup.draw(g, q[0], q[1], 1); }, { emissive: true }); }
      if (R.wagon) Flood.drawWagon(r, R.wagon.x, 60, 0, true);
      talk.draw(r);
      r.overlay(g => {
        if (R.holdT > 0) { const a = R.holdT; for (let k = 0; k < 24 * a; k++) { const an = -PI / 2 + k / 24 * TAU; px.dot(g, r.W - 20 + Math.cos(an) * 8, 20 + Math.sin(an) * 8, UI.GOLD); } E.font.text(g, 'SKIP', r.W - 20, 32, UI.GOLD, { align: 'center', font: 'tiny', outline: false }); }
        if (!o.attract) Glyphs.text(g, '{confirm} NEXT    HOLD {cancel} SKIP', 10, 8, { color: '#9fb2cc' });
      });
    };
    return R;
  }
  function dressSet(r, set, R) {
    if (set === 'locker' || set === 'ending') {
      for (let i = 0; i < 9; i++) { const x = 24 + i * 34; r.queue(x, 18, 0, g => { r.box(g, x - 14, 12, 0, x + 14, 20, 44, i % 2 ? '#3a5a8a' : '#4a6a9a', '#2a4060'); const q = r.w(x, 20, 30); px.rect(g, q[0] - 6, q[1], 12, 1, '#1a2a40'); px.rect(g, q[0] - 1, q[1] + 6, 2, 2, '#c8c8d0'); }); }
      r.shape('bench', 120, 100, 0, { facing: -PI / 2 }); r.shape('bench', 230, 100, 0, { facing: -PI / 2 });
      r.prop('banner', 170, 10, 48, { size: 1.4, color: '#5a3a22' });
      if (set === 'ending') { r.overlay(g => {}); }
    } else if (set === 'pond') {
      for (let i = 0; i < 9; i++) r.shape('pine', 10 + i * 40, 4 + (i % 2) * 6, 0, { params: { h: 50 + (i % 3) * 10, tiers: 4 } });
      r.prop('firedrum', 60, 60, 0, { size: 1.6, light: true });
      r.queue(300, 30, 0, g => { r.box(g, 270, 14, 0, 330, 40, 30, '#8a5a32', '#5a3a1e'); const q = r.w(290, 40, 16); px.rect(g, q[0], q[1], 8, 6, '#ffd080'); });
    } else if (set === 'grind') {
      for (let i = 0; i < 4; i++) { const x = 40 + i * 90; r.queue(x, 22, 40, g => { const a = r.w(x - 30, 22, 50), b = r.w(x + 30, 22, 50); px.line(g, a[0], a[1], b[0], b[1], '#8a5a3a', 3); }); if (RNG.fx() < .03) P.smoke(x + 20, 22, 52, 1, { size: .8, color: '#d8e0e8' }); }
      r.prop('firedrum', 300, 50, 0, { size: 1.3, light: true });
    } else if (set === 'mall') {
      [['PRETZEL PLANET', '#ffb04a'], ['GLITTERMAN GOLD', '#ffe04a'], ['ARCADIA', '#ff4ab8']].forEach(([n, c], i) => { const x = 60 + i * 110; r.queue(x, 20, 0, g => { const a = r.w(x - 46, 18, 46), b = r.w(x + 46, 18, 6); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#2a2438'); E.font.text(g, n, (a[0] + b[0]) / 2, a[1] + 4, c, { align: 'center', font: 'tiny', outline: false }); }, { emissive: true }); });
    } else if (set === 'tunnel') {
      r.overlay(g => { px.blend(g, .12, 'add', () => { for (let i = 0; i < 3; i++) px.poly(g, [[r.W * (.3 + i * .2), 0], [r.W * (.34 + i * .2), 0], [r.W * (.4 + i * .2), r.H], [r.W * (.24 + i * .2), r.H]], '#ffffff'); }); });
    }
  }
  return { run, SETS, rigOf };
})();
/* ---- the Kaboom Cup: a sprite drawn in code (gold, two handles, a puck on the lid) ---- */
const Cup = {
  draw(g, x, y, k = 1) { x = Math.round(x); y = Math.round(y); const t = E.tones('#e8c040');
    px.rect(g, x - 5 * k, y + 8 * k, 10 * k, 3 * k, t.sh); px.rect(g, x - 2 * k, y + 3 * k, 4 * k, 5 * k, t.base);
    px.disc(g, x, y, 6 * k, t.sh); px.disc(g, x - 1, y - 1, 5 * k, t.base); px.rect(g, x - 6 * k, y - 4 * k, 12 * k, 3 * k, t.lt);
    px.line(g, x - 6 * k, y - 2 * k, x - 9 * k, y + 1 * k, t.sh, 2); px.line(g, x + 6 * k, y - 2 * k, x + 9 * k, y + 1 * k, t.sh, 2);
    px.rect(g, x - 2 * k, y - 7 * k, 4 * k, 2 * k, '#141418'); px.dot(g, x - 2 * k, y - 2 * k, t.hi); }
};

scenes.cutscene = {
  view: 'brawler', views: ['brawler'], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; game.setView('brawler'); game.setZoom(1.05); game.cam.bounds = null; game.cam.smooth = 0;
    const sc = STORY.cutscenes[d.id]; Synth.music(sc ? sc.music : 'locker');
    this.R = Cutscene.run(d.id, { chapter: d.chapter, done: () => { if (d.onDone) d.onDone(); else game.go(d.then || 'title', d.thenData, { fade: 'wipe' }); } });
    game.focus(170, 60, 18);
  },
  exit() { game.resetCamera(); },
  update(dt) { game.focus(170, 60, 18); if (this.R) this.R.update(dt); },
  draw(r) { if (this.R) this.R.draw(r); }
};
