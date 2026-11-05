/* ---- THE MATCH SCENE: the world drawn (floor, scuffs, thin ice, boards, glass, nets, stands, crowd, benches, props,
 * skaters, goalies, officials, the mascot, items, the puck), the director, the booth, the HUD; player intros; the
 * intermission (period card, then the Flood Wagon offered); the final to the results ---- */
const World = (() => {
  let map = null, key = '';
  const WSPR = {}; for (const k in Items2.SPR) WSPR[k] = Items2.SPR[k];
  function prepare(m) {
    const k = m.arena.id + ':' + m.teams[0].id;
    if (k !== key) { map = Rink.build(m.arena.id, m.teams[0].id); key = k; Crowd.build(m.arena.id, m.teams[0].id); }
    game.cam.bounds = v => map.bounds(v);
    return map;
  }
  function drawPuck(r, m) {
    const pk = m.puck, rp = Replay.posOf('pk'), x = rp ? rp[0] : pk.x, y = rp ? rp[1] : pk.y, z = rp ? rp[2] : pk.z, fire = rp ? rp[3] : pk.onFire;
    if ((m.phase === 'faceoff' && m.faceoff && !m.faceoff.dropped && !rp) || m.noPuck) return;
    r.shadow(x, y, 2.4, .5);
    const trail = S('trail'), sp = Math.hypot(pk.vx, pk.vy);
    if (!rp && !pk.owner && (sp > 300 || trail === 'glow') && trail !== 'off' && pk.trail.length > 2) r.queue(x, y, z, g => { const T0 = pk.trail; for (let i = 1; i < T0.length; i++) { const a = r.w(...T0[i - 1]), b = r.w(...T0[i]); px.blend(g, (i / T0.length) * (trail === 'glow' || m.cheats.glowPuck ? .7 : .4), trail === 'glow' || m.cheats.glowPuck ? 'add' : 'normal', () => px.line(g, a[0], a[1], b[0], b[1], fire ? '#ff8a2a' : trail === 'glow' || m.cheats.glowPuck ? '#4af0ff' : '#e8eef4', 2)); } }, { emissive: true });
    r.queue(x, y, z, g => {
      const [sx, sy] = r.w(x, y, z + .8), X = Math.round(sx), Y = Math.round(sy);
      if (fire) { px.blend(g, .7, 'add', () => px.disc(g, X, Y, 5, '#ff7a1a')); px.disc(g, X, Y, 3, '#ffd84a'); px.dot(g, X, Y, '#ffffff'); return; }
      if (m.cheats.glowPuck || trail === 'glow') px.blend(g, .5, 'add', () => px.disc(g, X, Y, 4, '#4af0ff'));
      px.rect(g, X - 2, Y - 1, 4, 2, '#0a0a0e'); px.rect(g, X - 1, Y - 2, 2, 1, '#2a2a34'); px.dot(g, X - 1, Y - 1, '#5a5a6a');
    }, { emissive: !!fire || m.cheats.glowPuck });
  }
  function drawIce(r, m) {
    if (!m.ice || !m.ice.length) return;
    r.decal(g => {
      for (const p of m.ice) {
        const q = r.w(p.x, p.y, 0), rx = p.rx * (r.view.ax || 1), ry = p.ry * Math.abs(r.view.by || .8);
        if (p.hole > 0) { px.ell(g, q[0], q[1], rx * .78, ry * .78, '#0e1e30'); px.ell(g, q[0], q[1], rx * .62, ry * .62, '#06101c'); const k = game.real * 2; px.ell(g, q[0] + Math.sin(k) * 2, q[1], rx * .3 + Math.sin(k * 1.3) * 2, ry * .2, '#1a3a5a'); px.ell(g, q[0], q[1], rx, ry, '#c8dcf0'); px.ell(g, q[0], q[1], rx * .8, ry * .8, '#0e1e30'); }
        else { px.blend(g, .35 + (1 - p.hp / 100) * .3, 'normal', () => px.ell(g, q[0], q[1], rx, ry, p.hp < 100 ? '#7aa0c8' : '#a8c8e8')); if (p.hp < 100) for (let k2 = 0; k2 < 5; k2++) { const a = k2 * 1.25; px.line(g, q[0], q[1], q[0] + Math.cos(a) * rx * .9, q[1] + Math.sin(a) * ry * .9, '#ffffff'); } }
      }
    });
  }
  function drawEntity(r, e, view, o = {}) {
    const p = o.pos || e; if (e.offIce && !o.force) return;
    r.shadow(p.x, p.y, o.r || 7, .42);
    if (e.state === 'frozen') r.queue(p.x, p.y, 0, g => { const a = r.w(p.x, p.y, 0), b = r.w(p.x, p.y, 34); px.blend(g, .45, 'normal', () => px.rect(g, a[0] - 10, b[1], 20, a[1] - b[1], '#bfe8ff')); px.line(g, a[0] - 10, b[1], a[0] - 10, a[1], '#ffffff'); }, { bias: 2 });
    r.actor(p.x, p.y, (p.z || 0) - (e.state === 'buried' ? 14 : 0), (g, ox, oy) => e.rig.draw(g, ox, oy, view), { xray: !!o.xray, flash: e.flashT > 0 ? '#ffffff' : undefined, ghost: o.ghost });
  }
  function draw(r, m) {
    if (!m) return;
    const A = m.arena, view = E.charView(r.view);
    map.drawFloor(r); Rink.drawScuff(r); drawIce(r, m);
    Rink.drawBoards(r, A.id, m.teams[0].def.dark, game.real); Rink.drawNets(r, game.real);
    Crowd.draw(r, m); Crowd.benches(r, m); Dress.draw(r, m, A); Dress.lights(r, m, A);
    map.queueWalls(r);
    // the fight's dropped gear
    if (m.fight) for (const gr of m.fight.gear) r.queue(gr.x, gr.y, 0, g => { const q = r.w(gr.x, gr.y, 0); if (gr.kind === 'helmet') { px.ell(g, q[0], q[1] - 1, 4, 3, gr.color); px.dot(g, q[0] - 1, q[1] - 2, '#ffffff'); } else { px.rect(g, q[0] - 3, q[1] - 2, 6, 3, gr.color); px.rect(g, q[0] - 3, q[1] - 3, 2, 1, gr.color); } });
    // items and hazards on the ice
    for (const it of m.items) { const s = WSPR[it.kind]; if (!s) continue; if (!it.air) r.shadow(it.x, it.y, 4, .35); const blink = it.t < 3 && it.kind !== 'octopus' && it.kind !== 'hat' && Math.floor(game.real * 8) % 2; if (!blink) r.sprite(it.x, it.y, it.z, it.kind === 'hat' && it.color ? E.recolor(s, { '#c83a2a': it.color }) : s, { anchor: 'bottom', glow: it.kind !== 'octopus' && it.kind !== 'hat' && it.kind !== 'rat' }); }
    // bodies
    m.skaters.forEach((s, i) => drawEntity(r, s, view, { pos: Replay.posOf('s', i) || s, xray: s.ctrl.kind !== 'cpu' }));
    m.goalies.forEach((g, i) => drawEntity(r, g, view, { pos: Replay.posOf('g', i) || g, r: 9 }));
    for (const e of m.extras) if (e.rig) drawEntity(r, e, view, { r: e.kind === 'pete' ? 10 : 6 });
    drawPuck(r, m);
    Hud.world(r, m);
    if (Dev.open && Dev.overlays) Dev.drawOverlays(r, m);
  }
  return { prepare, draw, drawPuck, get map() { return map; } };
})();

scenes.match = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], camera: { zoom: false },
  enter(d) {
    d = d || {};
    if (!d.resume) {
      const cfg = d.cfg || Setup.quickCfg(d);
      Replay.reset(); Bus.reset();
      const m = Match.create(cfg);
      m.intro = cfg.intros && cfg.mode !== 'attract' ? { order: m.skaters.concat(m.goalies), i: 0, t: 0, focus: null, skip: false } : null;
      m.setPhase('intro', m.intro ? 99 : .2);
      if (cfg.onStart) cfg.onStart(m);
    }
    const m = Match.m;
    World.prepare(m); L.enabled = true; L.ambient = m.arena.ambient; game.weather = m.arena.weather || null;
    game.timeScale = T.gameSpeed;
    Cam.snap(Rink.C.x, Rink.C.y); Synth.music(m.arena.music === 'play' ? 'play' : m.arena.music);
    if (m.arena.music !== 'play') Synth.music(m.arena.music);
    Talk.init();
    if (d.resume) { Match.nextPeriod(m); }
    game.input.consumeAll();
  },
  exit() { game.timeScale = 1; game.weather = null; Synth.crowdOff(); },
  update(dt) {
    const m = Match.m; if (!m) return;
    if (Dev.isOpen()) { Dev.update(dt); if (!Dev.live) return; }
    else if (game.paused) return;
    if (m.phase === 'intro' && m.intro) introStep(m, dt);
    Match.step(dt);
    if (m.phase === 'intermission') { m.setPhase('intermission_wait'); scenes.match.toIntermission(m); return; }
    if (m.phase === 'final' && m.phaseT <= 0 && !m.left) { m.left = true; if (m.cfg.onFinal) m.cfg.onFinal(m); else game.go('results', { m }, { fade: 'wipe' }); return; }
    if (m.phase === 'drill_done' && m.phaseT <= 0 && !m.left) { m.left = true; if (m.cfg.onFinal) m.cfg.onFinal(m); return; }
    Cam.update(m, dt); Talk.step(dt); Crowd.step(dt, m); Fx.frame(m, dt);
    if (m.cfg.tick) m.cfg.tick(m, dt);
    // the music's layers follow the game
    const late = m.period >= 3 || m.ot; Synth.layer('drive', late || m.phase === 'shootout' ? 1 : 0, 2); Synth.layer('beat', late || Crowd.level > .7 ? 1 : 0, 2);
  },
  toIntermission(m) {
    if (m.cfg.mode === 'session' || m.cfg.mode === 'attract' || m.cfg.flood === 'never' && !m.cfg.forceFlood) { Match.nextPeriod(m); return; }
    game.go('flood', { from: 'match', ask: m.cfg.flood === 'ask', auto: false, m }, { fade: 'wipe' });
  },
  draw(r) {
    const m = Match.m; if (!m) return;
    World.draw(r, m); Hud.draw(r, m); Talk.draw(r);
    if (m.cfg.drawExtra) m.cfg.drawExtra(r, m);
    if (Dev.isOpen()) Dev.draw(r);
  },
  back() { return false; }
};
/** player intros: each skater and goalie, the camera on them, their name babbled ("Number NINE… DUNNY… MACPHAIL!") */
function introStep(m, dt) {
  const I = m.intro; I.t += dt;
  if (m.humans.some(h => h.kind === 'local' && h.input && (h.input.pressed('pass') || h.input.pressed('confirm'))) || UI.anyP('confirm')) { I.skip = true; Talk.close(); return; }
  if (!I.focus || I.t > 1.15) {
    if (I.i >= I.order.length) { I.skip = true; return; }
    const e = I.order[I.i++]; I.focus = e; I.t = 0;
    if (e.def) { const parts = String(e.def.full || e.def.name).split(' '); Synth.say('Number ' + e.def.num + '... ' + parts[0] + '... ' + parts[parts.length - 1] + '!', CAST.chuck.voice, { vol: .8 }); }
    if (e.rig && e.rig.hk) { if (e.state !== undefined && e.def.pos !== 'G') { Skater.setState(e, 'celebrate', 1.1); e.celeb = 'raise'; } }
  }
  // line them up on their blue lines for the intros
  if (I.i === 1 && I.t < dt * 2) for (const s of m.skaters) { const dir = m.attackDir(s.team); s.x = Rink.C.x - dir * 108 + (s.slot - 1) * 4 * dir; s.y = Rink.C.y - 60 + s.slot * 60; s.facing = dir > 0 ? PI / 2 : PI / 2; s.vx = s.vy = 0; }
  if (I.focus && I.focus.x !== undefined) Crowd.excite(.01);
}
