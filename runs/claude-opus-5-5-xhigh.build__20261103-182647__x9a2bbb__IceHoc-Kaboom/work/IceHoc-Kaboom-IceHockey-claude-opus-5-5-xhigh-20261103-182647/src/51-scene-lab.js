/* ---- THE ANIMATION LAB (section 9): a skater, a goalie and the referee on the Icebox ice; every hockey motion in a
 * list, its speed and phase on sliders, Broadcast / ice level / Overhead. Up / down choose, left / right speed, ✕
 * play / hold, V the view, ○ back. Tools film it (#lab) ---- */
const Lab = (() => {
  const MOTIONS = ['stride', 'turbo stride', 'glide', 'crossover', 'hockey stop', 'backward c-cuts', 'stick-handling', 'pass', 'saucer', 'wrist shot', 'slapshot', 'one-timer', 'deke spin-o-rama', 'toe drag', 'check', 'stagger', 'big hit fall', 'getup', 'poke', 'slip',
    'goalie ready', 'goalie shuffle', 'goalie butterfly', 'goalie glove', 'goalie blocker', 'goalie stack', 'goalie poke', 'goalie blasted', 'goalie celebrate', 'faceoff', 'celebrate: fist pump', 'celebrate: sniper', 'celebrate: stick guitar', 'celebrate: raise',
    'fight: guard', 'fight: jab', 'fight: haymaker', 'fight: hook', 'fight: duck', 'fight: jersey over head', 'fight: knockdown', 'fight: winner', 'bench: sit', 'coach: wave', 'coach: hips', 'flood wagon driver', 'polar pete dance', 'referee: puck up'];
  const st = { i: 0, speed: 1, u: 0, play: true, sk: null, gl: null, ref: null, pete: null, coach: null };
  function ensure() {
    if (st.sk) return;
    st.sk = Rigs.skater(TEAMS.muskrats.players[0], true); st.gl = Rigs.goalie(TEAMS.muskrats.goalie, true); st.ref = Rigs.referee(); st.pete = Rigs.cast('pete'); st.coach = Rigs.cast('marge');
  }
  function pose(dt) {
    ensure(); const name = MOTIONS[st.i], u = st.u, sk = st.sk, hk = sk.hk, g = st.gl, gh = g.hk;
    hk.mode = 'skate'; hk.push = 0; hk.stop = 0; hk.back = 0; hk.cross = 0; hk.faceoff = false; hk.lean = .32; hk.crouch = .45; hk.stick = { act: 'idle', u: 0 }; hk.ph = u * TAU * 2; hk.weave = u * 30;
    sk.hkGear.stick = true; sk.hkGear.helmet = sk.hkGear.helmet || TEAMS.muskrats.dark;
    let a = { x: 120, y: 120, z: 0, vx: 0, vy: 0, facing: 0 }, fA = null;
    const fm = (mv, k) => E.move(mv, clamp(k, 0, 1));
    switch (name) {
      case 'stride': hk.push = .9; break; case 'turbo stride': hk.push = 1; hk.lean = .5; break; case 'glide': hk.push = 0; break;
      case 'crossover': hk.push = 1; hk.cross = 1; break; case 'hockey stop': hk.stop = 1; hk.crouch = .7; break; case 'backward c-cuts': hk.back = 1; hk.push = .6; break;
      case 'stick-handling': hk.stick = { act: 'carry' }; break; case 'pass': hk.stick = { act: 'pass', u }; break; case 'saucer': hk.stick = { act: 'pass', u, saucer: true }; break;
      case 'wrist shot': hk.stick = u < .4 ? { act: 'wrist', u: u / .4 } : { act: 'follow', u: (u - .4) / .6 }; break;
      case 'slapshot': hk.stick = u < .5 ? { act: 'wind', u: u / .5 } : u < .65 ? { act: 'slap', u: (u - .5) / .15 } : { act: 'follow', u: (u - .65) / .35, big: true }; break;
      case 'one-timer': hk.stick = u < .3 ? { act: 'wind', u: .6 } : u < .45 ? { act: 'slap', u: (u - .3) / .15 } : { act: 'follow', u: (u - .45) / .55, big: true }; break;
      case 'deke spin-o-rama': hk.stick = { act: 'deke', u }; a.facing = u * TAU; break; case 'toe drag': hk.stick = { act: 'drag', u }; break;
      case 'check': hk.stick = { act: 'check' }; hk.lean = .6; break; case 'stagger': a.hurt = true; break; case 'big hit fall': a.down = Math.min(1, u * 2); break; case 'getup': a.pose = 'kneel'; a.down = Math.max(0, 1 - u * 2); break;
      case 'poke': hk.stick = { act: 'poke', u }; break; case 'slip': a.down = .8; a.flip = .3; break;
      case 'faceoff': hk.faceoff = true; hk.crouch = .8; hk.stick = { act: 'faceoff' }; break;
      case 'celebrate: fist pump': a.pose = 'cheer'; a.expr = 'shout'; hk.stick = { act: 'raise' }; break; case 'celebrate: sniper': hk.stick = { act: 'sniper' }; break; case 'celebrate: stick guitar': hk.stick = { act: 'guitar' }; break; case 'celebrate: raise': hk.stick = { act: 'raise' }; break;
      case 'fight: guard': hk.mode = 'fight'; a.stance = 'guard'; hk.grip = true; break; case 'fight: jab': hk.mode = 'fight'; a.stance = 'guard'; fA = fm('jab', u); break; case 'fight: haymaker': hk.mode = 'fight'; a.stance = 'guard'; fA = fm('haymaker', u); break;
      case 'fight: hook': hk.mode = 'fight'; a.stance = 'guard'; fA = fm('hook', u); break; case 'fight: duck': hk.mode = 'fight'; a.pose = 'crouch'; break; case 'fight: jersey over head': hk.mode = 'fight'; a.stance = 'guard'; sk.o.hood = true; sk.C.hair = sk.C.cloth; break;
      case 'fight: knockdown': hk.mode = 'fight'; a.down = Math.min(1, u * 2); break; case 'fight: winner': hk.mode = 'fight'; a.pose = 'cheer'; break; case 'bench: sit': hk.mode = 'sit'; a.pose = 'kneel'; break;
    }
    if (name !== 'fight: jersey over head') { sk.o.hood = false; sk.C.hair = TEAMS.muskrats.players[0].hair.color; }
    if (hk.mode === 'fight') sk.hkGear.stick = false;
    a.attack = fA; sk.update(dt, a);
    const gst = { 'goalie ready': 'ready', 'goalie shuffle': 'shuffle', 'goalie butterfly': 'butterfly', 'goalie glove': 'glove', 'goalie blocker': 'blocker', 'goalie stack': 'stack', 'goalie poke': 'poke', 'goalie blasted': 'blasted', 'goalie celebrate': 'celebrate' }[name] || 'ready';
    gh.gst = gst === 'glove' || gst === 'blocker' || gst === 'celebrate' ? 'ready' : gst === 'poke' ? 'butterfly' : gst; gh.gw = 1; gh.ph = u * TAU * 3; gh.side = 1; gh.stick = { act: gst === 'poke' ? 'gpoke' : 'gready', u };
    gh.glove = gst === 'glove' ? [3, -10, 1.4] : [4.4, -4.6, -1];
    g.update(dt, { x: 200, y: 120, z: 0, vx: 0, vy: 0, facing: PI, down: gst === 'blasted' ? Math.min(1, u * 2) : 0, flip: gst === 'blasted' ? u : 0, pose: gst === 'celebrate' ? 'cheer' : null });
    if (gst === 'blocker') { const J = g.J, o = g.o, hand = E.V3.add(J.shC, [3, 9, 1]); const [el, h2] = E.ik3(J.shR, hand, o.armUpper, o.armLower, [-1, .8, -.3]); J.elbowR = el; J.handR = h2; }
    const rh = st.ref.hk; rh.push = 0; st.ref.update(dt, { x: 160, y: 150, z: 0, vx: 0, vy: 0, facing: -PI / 2 });
    if (name === 'referee: puck up') { const J = st.ref.J, o = st.ref.o, hand = E.V3.add(J.shC, [1.5, 1.5, o.armUpper + o.armLower - 1.5]); const [el, h2] = E.ik3(J.shR, hand, o.armUpper, o.armLower, [-1, .7, -.2]); J.elbowR = el; J.handR = h2; }
    const ph = st.pete.hk; ph.push = name === 'polar pete dance' ? .5 : 0; ph.ph = u * TAU * 2;
    st.pete.update(dt, { x: 240, y: 150, z: 0, vx: 0, vy: 0, facing: -PI / 2 + (name === 'polar pete dance' ? Math.sin(u * TAU * 2) * .8 : 0), pose: name === 'polar pete dance' ? (Math.floor(u * 4) % 2 ? 'cheer' : 'wave') : null });
    st.coach.update(dt, { x: 80, y: 150, z: 0, vx: 0, vy: 0, facing: -PI / 2, pose: name === 'coach: wave' ? 'wave' : name === 'coach: hips' ? 'hips' : null });
  }
  return { MOTIONS, st, pose, ensure };
})();
scenes.lab = {
  view: 'brawler', views: ['brawler', 'threequarter', 'topdown'], camera: { zoom: false },
  enter() { Lab.ensure(); this.map = Rink.build('icebox', 'muskrats'); game.cam.bounds = null; game.setView('brawler'); game.setZoom(1.3); L.enabled = true; L.ambient = .65; Synth.music(null); },
  exit() { game.setZoom(1); },
  update(dt) {
    const st = Lab.st, I = game.input;
    if (I.repeat('up', .3, .08)) st.i = (st.i + Lab.MOTIONS.length - 1) % Lab.MOTIONS.length; if (I.repeat('down', .3, .08)) st.i = (st.i + 1) % Lab.MOTIONS.length;
    if (I.repeat('left', .3, .1)) st.speed = Math.max(0, +(st.speed - .1).toFixed(2)); if (I.repeat('right', .3, .1)) st.speed = Math.min(2, +(st.speed + .1).toFixed(2));
    if (I.pressed('confirm')) st.play = !st.play; if (I.pressed('camera')) { const v = ['brawler', 'threequarter', 'topdown'], k = (v.indexOf(game.view.id) + 1) % 3; game.setView(v[k]); }
    if (!st.play && I.repeat('shoot', .2, .05)) st.u = (st.u + .02) % 1;
    if (I.pressed('cancel')) { game.go('title', { menu: true }); return; }
    if (st.play) st.u = (st.u + dt * .6 * st.speed) % 1;
    Lab.pose(dt * st.speed);
    game.focus(160, 130, 14);
  },
  draw(r) {
    const st = Lab.st, view = E.charView(r.view);
    r.sky(['#0a1430', '#122248', '#1a3060']);
    this.map.drawFloor(r);
    for (const [rig, x, y] of [[st.sk, 120, 120], [st.gl, 200, 120], [st.ref, 160, 150], [st.pete, 240, 150], [st.coach, 80, 150]]) { r.shadow(x, y, 7, .4); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy, view)); }
    L.add(160, 130, 80, 300, .8, { color: '#ffffff' });
    r.overlay(g => {
      UI.panel(g, 6, 6, 150, r.H - 12, { alpha: .9 });
      E.font.text(g, 'ANIMATION LAB', 12, 10, UI.GOLD, { outline: '#000' });
      const vis = Math.floor((r.H - 60) / 9), s0 = clamp(st.i - Math.floor(vis / 2), 0, Math.max(0, Lab.MOTIONS.length - vis));
      for (let k = s0; k < Math.min(Lab.MOTIONS.length, s0 + vis); k++) E.font.text(g, (k === st.i ? '▸ ' : '  ') + Lab.MOTIONS[k], 12, 22 + (k - s0) * 9, k === st.i ? '#ffffff' : UI.MUTED, { outline: false });
      E.font.text(g, 'SPEED ' + st.speed.toFixed(1) + 'x   PHASE ' + st.u.toFixed(2) + (st.play ? '' : ' (HELD)'), 12, r.H - 30, '#cfe0f4', { font: 'tiny', outline: false });
      E.font.text(g, 'VIEW ' + game.view.id.toUpperCase(), 12, r.H - 22, '#cfe0f4', { font: 'tiny', outline: false });
      Glyphs.text(g, '{up} MOTION  {left} SPEED  {confirm} PLAY/HOLD  {shoot} STEP  {camera} VIEW  {cancel} BACK', r.W / 2 + 70, r.H - 12, { align: 'center', color: UI.MUTED });
    });
  }
};
