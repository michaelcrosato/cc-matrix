/* ---- the match scene: every game of hockey (exhibition, story, practice, attract, sessions) plays here ---- */
const Draw = (() => {
  const view = r => E.charView ? E.charView(r.view) : r.view;
  const trail = [];
  function puck(r) {
    const p = M.puck; if (p.dead || (p.held && p.z > 13 && M.phase !== 'faceoff')) return;
    const sp = Math.hypot(p.vx, p.vy), mode = Rigs.glow || S().trail === 'Glow' ? 'glow' : S().trail === 'Off' ? 'off' : 'streak';
    trail.push([p.x, p.y, p.z]); if (trail.length > 6) trail.shift();
    r.shadow(p.x, p.y, 2.2, .5);
    r.queue(p.x, p.y, p.z, g => {
      const [x, y] = r.w(p.x, p.y, p.z + 1), X = Math.round(x), Y = Math.round(y);
      if ((sp > 300 || p.onFire) && mode !== 'off' && !p.owner) for (let i = 0; i < trail.length - 1; i++) { const a = r.w(...trail[i]), b = r.w(...trail[i + 1]); px.blend(g, .2 + i * .1, mode === 'glow' || p.onFire ? 'add' : 'normal', () => px.line(g, a[0], a[1] + 1, b[0], b[1] + 1, p.onFire ? '#ff8a2a' : mode === 'glow' ? '#5affff' : '#ffffff', p.onFire ? 3 : 1)); }
      if (p.onFire) { px.disc(g, X, Y, 4, '#ff5a1a'); px.disc(g, X, Y, 2.5, '#ffd040'); px.dot(g, X, Y, '#ffffff'); return; }
      if (mode === 'glow') px.blend(g, .5, 'add', () => px.disc(g, X, Y, 3, '#5affff'));
      px.rect(g, X - 1, Y - 1, 3, 2, '#0a0a0e'); px.dot(g, X - 1, Y - 1, '#5a5a66');
    }, { emissive: p.onFire || mode === 'glow' });
    if (p.onFire && RNG.fx() < .7) P.fire(p.x, p.y, p.z + 2, 1, { size: .8 });
  }
  function skater(r, s) {
    if (s.off) return;
    const z = s.state === 'buried' ? -14 : 0, opts = {};
    if (s.state === 'frozen') { opts.flash = '#9ad0ff'; opts.flashMix = .6; }
    if (s.items.hotsauce > 0 || M.kaboomT[s.team] > 0) { opts.ghost = { color: M.kaboomT[s.team] > 0 ? '#ff7a2a' : '#ff3a2a', life: .12, alpha: .4, owner: s }; }
    if (s.state !== 'bin') r.shadow(s.x, s.y, 7, .3);
    if (s.human || s.state === 'bin') opts.xray = { color: s.human ? s.human.color || '#ffd36a' : '#808080' };
    r.actor(s.x, s.y, z, (g, ox, oy) => s.rig.draw(g, ox, oy, view(r)), opts);
    if (s.state === 'frozen') r.queue(s.x, s.y + 4, 0, g => { const [x, y] = r.w(s.x, s.y, 0), [, y2] = r.w(s.x, s.y, 34); px.blend(g, .35, 'normal', () => px.rect(g, Math.round(x) - 9, Math.round(y2), 18, Math.round(y - y2) + 2, '#bfe8ff')); px.rect(g, Math.round(x) - 9, Math.round(y2), 18, 1, '#ffffff'); });
    if (s.state === 'buried') r.queue(s.x, s.y + 6, 0, g => { const [x, y] = r.w(s.x, s.y + 4, 0); px.disc(g, x, y - 4, 10, '#e8f0fa'); px.disc(g, x - 3, y - 7, 6, '#ffffff'); });
    if (s.state === 'down' && s.stateT > .3 && s.stateT < 1.3) r.queue(s.x, s.y, 18, g => { const [x, y] = r.w(s.x, s.y, 10); for (let i = 0; i < 3; i++) { const a = game.time * 6 + i * 2.1; px.dot(g, x + Math.cos(a) * 6, y - 6 + Math.sin(a) * 2, '#ffe070'); } }, { emissive: true });
  }
  function items(r) {
    for (const it of M.items.concat(M.hazards)) {
      if (!it.haz && it.life - it.t < 3 && Math.floor(it.t * 8) % 2) continue;
      r.shadow(it.x, it.y, 4, .3);
      r.queue(it.x, it.y, it.z, g => {
        const [x, y] = r.w(it.x, it.y, it.z), X = Math.round(x), Y = Math.round(y), k = it.kind;
        if (k === 'hotsauce') { px.rect(g, X - 2, Y - 8, 4, 7, '#e0302a'); px.rect(g, X - 1, Y - 10, 2, 2, '#f0f0f0'); px.dot(g, X - 1, Y - 6, '#ffa090'); }
        else if (k === 'tape') { px.disc(g, X, Y - 3, 3.5, '#f0f0f0'); px.disc(g, X, Y - 3, 1.5, '#8a8a8a'); }
        else if (k === 'poutine') { px.rect(g, X - 4, Y - 4, 8, 4, '#c8c8d0'); px.rect(g, X - 3, Y - 6, 6, 2, '#e8b43a'); px.dot(g, X - 1, Y - 7, '#8a5a2a'); px.dot(g, X + 2, Y - 7, '#f8f0d8'); }
        else if (k === 'lumber') { px.line(g, X - 4, Y - 1, X + 4, Y - 9, '#c08a4a', 2); px.line(g, X + 2, Y - 8, X, Y - 5, '#ffe040', 1); px.line(g, X, Y - 5, X + 2, Y - 3, '#ffe040', 1); }
        else if (k === 'bricks') { px.rect(g, X - 4, Y - 5, 8, 4, '#b0503a'); px.rect(g, X - 4, Y - 3, 8, 1, '#d8c8b0'); }
        else if (k === 'boombox') { px.rect(g, X - 5, Y - 6, 10, 6, '#5a5a6a'); px.disc(g, X - 2, Y - 3, 1.5, '#1a1a22'); px.disc(g, X + 3, Y - 3, 1.5, '#1a1a22'); px.rect(g, X - 3, Y - 8, 6, 1, '#8a8a9a'); }
        else if (k === 'cocoa') { px.rect(g, X - 2, Y - 8, 4, 8, '#8a5a3a'); px.rect(g, X - 2, Y - 9, 4, 1, '#c8c8c8'); if (Math.floor(game.time * 4) % 2) px.dot(g, X, Y - 11, '#ffffff'); }
        else if (k === 'octopus') { px.disc(g, X, Y - 3, 3.5, '#8a3aa0'); for (let i = 0; i < 4; i++) px.line(g, X - 3 + i * 2, Y - 1, X - 4 + i * 2.6 + Math.sin(game.time * 4 + i), Y + 2, '#6a2a80', 1); px.dot(g, X - 1, Y - 4, '#ffffff'); }
        else if (k === 'rat') { px.rect(g, X - 3, Y - 3, 6, 3, '#8a8a8a'); px.dot(g, X + 3, Y - 3, '#ff9a9a'); px.line(g, X - 3, Y - 1, X - 6, Y, '#ff9a9a', 1); }
      }, { emissive: !it.haz });
    }
    if (M.crate) { const c = M.crate; r.shadow(c.x, c.y, 8, .4); r.queue(c.x, c.y, c.z, g => { const [x, y] = r.w(c.x, c.y, c.z), [, ty] = r.w(c.x, c.y, 200); px.line(g, x, ty, x, y - 10, '#5a5a6a', 1); px.rect(g, Math.round(x) - 6, Math.round(y) - 10, 12, 10, '#a07038'); px.rect(g, Math.round(x) - 6, Math.round(y) - 6, 12, 1, '#6a4a20'); E.font.text(g, '?', Math.round(x), Math.round(y) - 9, '#ffe070', { align: 'center', outline: false }); }); }
  }
  function world(r) {
    M.map.drawFloor(r);
    Arena.background(r);
    Arena.lights(r);
    for (const s of M.skaters) skater(r, s);
    for (const g of M.goalies) { r.shadow(g.x, g.y, 9, .32); r.actor(g.x, g.y, 0, (gg, ox, oy) => g.rig.draw(gg, ox, oy, view(r)), g.bricks > 0 ? { flash: '#ffb070', flashMix: .25 } : {}); }
    for (const rf of M.refs) { r.shadow(rf.x, rf.y, 6, .3); r.actor(rf.x, rf.y, 0, (g, ox, oy) => rf.rig.draw(g, ox, oy, view(r))); }
    if (M.mascot) { const m = M.mascot; r.shadow(m.x, m.y, 9, .3); r.actor(m.x, m.y, 0, (g, ox, oy) => { m.rig.draw(g, ox, oy, view(r)); const [hx, hy] = [ox, oy - 52 * (m.down > 0 ? .25 : 1)]; if (m.down <= 0) { px.disc(g, ox - 5, oy - 50, 2.5, '#f4f8ff'); px.disc(g, ox + 5, oy - 50, 2.5, '#f4f8ff'); px.dot(g, ox - 5, oy - 50, '#e0a0b0'); px.dot(g, ox + 5, oy - 50, '#e0a0b0'); } void hx; void hy; }); }
    items(r); puck(r);
    Arena.foreground(r);
    Hud.world(r);
    Arena.silhouettes(r);
  }
  return { world, puck, skater, view };
})();

scenes.match = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, res: 'ps1', pausable: !HUB, camera: { zoom: false }, touch: [],
  enter(cfg) {
    if (cfg && cfg.resume) { Match.setupFaceoff([Rink.C.x, Rink.C.y]); if (cfg.flood && M) Boom.add(cfg.flood.team, cfg.flood.boom); }
    else Match.start(cfg || { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: T.periodLen, ot: true, shootout: true, humans: [{ input: game.input, team: 0 }] });
    Synth.music(M.arena.music || 'play'); Synth.applyVolumes();
    Cam.reset(); game.cam.smooth = .12; game.weather = M.arena.weather ? Object.assign({}, M.arena.weather) : null; L.enabled = true; L.ambient = M.arena.ambient;
    game.cam.bounds = null; Fx.clear();
  },
  exit() { game.weather = null; game.timeScale = 1; Talk.close(); for (const l of ['kaboom', 'kaboom2', 'fight', 'drive', 'drive2']) Synth.layer(l, false); },
  update(dt) {
    Glyphs.sync();
    if (!M) return;
    game.timeScale = M.attract ? 1 : T.gameSpeed * (Dev.slow || 1);
    if (Dev.isOpen && Dev.update(dt) && !Dev.live) return;
    if (Dev.stepping && !Dev.stepNow) return;
    if (game.input.pressed('camera')) { S().set('camera', S().camera === 'Overhead' ? 'Broadcast' : 'Overhead'); game.note(S().camera.toUpperCase() + ' CAMERA'); }
    if (M.phase === 'intermission') {
      if (UI.anyPressed('pass') || S().flood === 'Always' || M.cfg.floodAlways) { game.players.forEach(p => p.consumeAll()); game.go('flood', { back: true, team: (M.humans[0] || { team: 0 }).team }, { fade: 'wipe' }); return; }
      if (UI.anyPressed('deke') || S().flood === 'Never') { game.players.forEach(p => p.consumeAll()); Rink.clearScuff(.95); Items.refreeze(); Match.setupFaceoff([Rink.C.x, Rink.C.y]); }
      Talk.update(dt); Fx.step(dt); Cam.update(dt); return;
    }
    if (M.pendingWarp && M.t > .3) { const w = M.pendingWarp; M.pendingWarp = null; if (w === 'dev') Dev.openFromMenu(); else Dev.warp(w); }
    Match.step(dt); Talk.update(dt); Fx.step(dt);
    if (M.period >= M.cfg.periods && M.phase === 'play' && !M.driveOn) { M.driveOn = true; Synth.layer('drive', true); Synth.layer('drive2', true); }
    for (const s of M.skaters) if (M.kaboomT[s.team] > 0 && Math.hypot(s.vx, s.vy) > 80 && RNG.fx() < .3) P.sparks(s.x, s.y, 1, 1, Math.atan2(-s.vy, -s.vx), { color: '#ffb040' });
    if (M.finished && !M.cfg.attract && !M.cfg.noResults) { M.finished = 'done'; if (M.cfg.onOver) M.cfg.onOver(M); else game.go('results', { m: M }, { fade: 'iris' }); }
  },
  draw(r) {
    if (!M) return;
    Draw.world(r); Drills.world(r);
    Hud.draw(r, 1 / 60); Drills.hud(r);
    Talk.draw(r);
    r.overlay(g => UI.drawToasts(g, r, 1 / 60));
    Dev.draw(r);
  }
};

/* ---- the Flood Wagon: drive Old Gus's ice resurfacer over the scuffed ice between periods (PLAN 7.14, 11.3) ---- */
scenes.flood = (() => {
  let car = null, t = 0, back = null, start = 0, auto = false, gus = null, done = false, last = 0;
  const C = Rink.C;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', pausable: !HUB, camera: { zoom: false }, touch: [],
    enter(d) {
      back = d || {}; auto = !!back.auto; t = 0; done = false;
      if (!M) { Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 90, humans: [] }); for (let i = 0; i < 400; i++) Rink.scuffAt(Rink.X0 + RNG.fx() * 860, Rink.Y0 + RNG.fx() * 380, .4); }
      if (Rink.scuffTotal() < 30) for (let i = 0; i < 300; i++) Rink.scuffAt(Rink.X0 + 20 + RNG.fx() * 820, Rink.Y0 + 20 + RNG.fx() * 340, .35);
      start = Rink.scuffTotal(); last = start;
      car = new E.Car({ x: Rink.X0 + 60, y: Rink.Y1 - 40, angle: 0, top: 90, accel: 60, brake: 120, turn: 1.6, grip: 6 });
      gus = Rigs.cast('gus').rig; Synth.music('flood'); L.enabled = true; L.ambient = .7; Cam.apply('threequarter', 1); game.cam.smooth = .15;
    },
    update(dt) {
      t += dt;
      const I = game.input; let steer = 0, gas = 0;
      if (auto || back.bot) {   // Old Gus drives himself: a lawnmower pattern
        const lane = Math.floor(t / 4.2) % 7, ty = Rink.Y0 + 40 + lane * 50, tx = lane % 2 ? Rink.X0 + 70 : Rink.X1 - 70, a = Math.atan2(ty - car.y, tx - car.x);
        steer = clamp(U.angDiff(a, car.angle) * 2, -1, 1); gas = 1;
      } else {
        const m = I.move(); if (Math.hypot(m[0], m[1]) > .2) { const a = Math.atan2(m[1], m[0]); steer = clamp(U.angDiff(a, car.angle) * 2, -1, 1); gas = .6; }
        if (I.down('turbo') || I.down('shoot')) gas = 1; if (I.down('deke')) gas = -.5;
        if (I.pressed('pass')) A.sfx('aooga');
      }
      car.update(dt, M.map, { steer, gas: Math.max(0, gas), brake: gas < 0 ? 1 : 0 });
      const b = { x: car.x, y: car.y, vx: car.vx || 0, vy: car.vy || 0 }; const hit = Rink.clamp(b, 14, .2, .6); if (hit) { car.x = b.x; car.y = b.y; if (car.speed !== undefined) car.speed *= .6; }
      // the wagon's path: scuffs and melt cleared under its blade
      for (let ox = -14; ox <= 14; ox += 7) for (let oy = -14; oy <= 14; oy += 7) { const i = Rink.cellOf(car.x + ox, car.y + oy); if (i >= 0) { Rink.scuff[i] *= .2; Rink.melt[i] *= .2; } }
      if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) A.sfx('engine', { pitch: 1 + Math.abs(car.speed || 0) / 120 });
      if (RNG.fx() < .4) P.add && P.add({ kind: 'smoke', x: car.x - Math.cos(car.angle) * 18, y: car.y - Math.sin(car.angle) * 18, z: 18, vx: 0, vy: 0, vz: 10, life: .8, size: 1, color: '#e8f0f8' });
      gus.update(dt, { x: car.x, y: car.y, z: 14, vx: 0, vy: 0, facing: car.angle, pose: 'crouch' });
      game.focus(car.x, car.y, 0);
      const left = (auto ? 6 : 30) - t, clean = 1 - Rink.scuffTotal() / Math.max(1, start);
      if ((left <= 0 || (UI.anyPressed('cancel') && !auto)) && !done) {
        done = true; const perfect = clean > .9;
        if (perfect) { A.sfx('star'); UI.toast('PERFECT FLOOD!', 'BOOM +30 for your team'); Bus.emit('flood_perfect', { team: back.team || 0 }); }
        Rink.clearScuff(1); Items.refreeze();
        if (back.done) back.done(clean); else if (back.back && M) game.go('match', { resume: true, flood: perfect ? { team: back.team || 0, boom: 30 } : null }, { fade: 'wipe' });
      }
      this.clean = clean; this.left = left;
    },
    draw(r) {
      if (M) { M.map.drawFloor(r); Arena.background(r); L.enabled = true; L.ambient = .75; }
      const c = car, view = Draw.view(r);
      r.shadow(c.x, c.y, 16, .4);
      r.queue(c.x, c.y, 0, g => {
        const ca = Math.cos(c.angle), sa = Math.sin(c.angle), P0 = (f, s, z) => r.w(c.x + ca * f - sa * s, c.y + sa * f + ca * s, z);
        const body = [P0(-16, -10, 4), P0(16, -10, 4), P0(16, 10, 4), P0(-16, 10, 4)], top = [P0(-16, -10, 16), P0(16, -10, 16), P0(16, 10, 16), P0(-16, 10, 16)];
        px.poly(g, [body[0], body[1], top[1], top[0]], '#2a5a9a'); px.poly(g, [body[1], body[2], top[2], top[1]], '#1a4a8a'); px.poly(g, [body[2], body[3], top[3], top[2]], '#3a6aaa'); px.poly(g, [body[3], body[0], top[0], top[3]], '#2a5090');
        px.poly(g, top, '#e8eef6'); const lg = P0(10, 0, 16); E.font.text(g, 'FLOOD', lg[0], lg[1] - 3, '#c83a2a', { font: 'tiny', align: 'center', outline: false });
        for (const [f, s] of [[-10, -11], [10, -11], [-10, 11], [10, 11]]) { const w = P0(f, s, 3); px.disc(g, w[0], w[1], 3, '#141418'); }
        const bl = P0(-18, 0, 1); px.rect(g, bl[0] - 8, bl[1] - 1, 16, 2, '#9ab8d8');
      });
      r.actor(c.x, c.y, 16, (g, ox, oy) => gus.draw(g, ox, oy, view));
      r.overlay(g => {
        const sf = Hud.safe(r); UI.panel(g, r.W / 2 - 100, sf.y0, 200, 36);
        UI.text(g, 'THE FLOOD WAGON', r.W / 2, sf.y0 + 4, UI.GOLD, { align: 'center' });
        UI.text(g, 'ICE CLEAN ' + Math.round((this.clean || 0) * 100) + '%    TIME ' + Math.max(0, Math.ceil(this.left || 0)), r.W / 2, sf.y0 + 16, '#ffffff', { align: 'center' });
        E.ui.bar(g, r.W / 2 - 80, sf.y0 + 27, 160, 4, this.clean || 0, (this.clean || 0) > .9 ? '#5ae05a' : '#5ad0ff');
        if (!auto) UI.legend(g, r, [['shoot', 'GAS'], ['deke', 'BRAKE'], ['pass', 'HONK'], ['cancel', 'FINISH']]);
        else UI.text(g, "OLD GUS RESURFACES THE ICE...", r.W / 2, sf.y1 - 16, '#ffffff', { align: 'center' });
      });
    }
  };
})();
