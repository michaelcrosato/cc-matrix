/* ============================================================================
 * 40-meet: CHAPTER 4, THE MEET. The container yard by the old clock-tower pier, after midnight, in the rain.
 * Get through a cut in the fence, slip the muscle's flashlights, and photograph Dante Pryor with his connect
 * under the clock. Then get out the way you came.
 * ========================================================================== */
const MEET = (() => {
  const CW = 40, CHh = 32;
  const G = Array.from({ length: CHh }, () => Array(CW).fill(','));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = ch; };
  fill(0, 0, CW - 1, 3, '~'); fill(0, 4, CW - 1, 9, '='); fill(15, 3, 24, 7, 'K');
  // container rows: aisles every few cells; some stacked two high
  const box = (x, y, w, h, ch) => fill(x, y, x + w - 1, y + h - 1, ch);
  box(2, 11, 5, 2, 'r'); box(9, 11, 4, 2, 'b'); box(26, 11, 5, 2, 'g'); box(33, 11, 5, 2, 'R');
  box(2, 15, 3, 2, 'B'); box(7, 15, 5, 2, 'w'); box(14, 14, 2, 4, 'r'); box(24, 14, 2, 4, 'b'); box(28, 15, 5, 2, 'G'); box(35, 15, 3, 2, 'w');
  box(2, 19, 6, 2, 'g'); box(10, 19, 4, 2, 'R'); box(17, 20, 6, 2, 'w'); box(26, 19, 4, 2, 'r'); box(32, 19, 6, 2, 'B');
  box(4, 23, 4, 1, 'b'); box(12, 23, 3, 1, 'g'); box(25, 23, 4, 1, 'r'); box(32, 23, 3, 1, 'w');
  fill(1, 26, 38, 26, 'f'); G[26][5] = ','; G[26][19] = ','; G[26][20] = ',';
  fill(0, 27, CW - 1, 30, '.'); fill(0, 31, CW - 1, 31, '#'); fill(0, 0, 0, 31, '#'); fill(CW - 1, 0, CW - 1, 31, '#');
  for (let x = 2; x < 38; x += 4) G[28][x] = 'y';
  const crate = (c, h) => ({ h, top: E.tones(c).lt, side: c, face: 'plank', roof: 'plain' });
  const map = new E.TileMap({ rows: G.map(r => r.join('')),
    legend: { '#': 1, K: 2, f: 3, r: 10, b: 11, g: 12, w: 13, R: 14, B: 15, G: 16, '~': { floor: 'water', block: true }, '=': { floor: 'plank' }, ',': { floor: 'conc' }, '.': { floor: 'road' }, y: { floor: 'line' } },
    types: {
      1: { h: 30, top: '#2a2a2e', side: '#3a3a40', face: 'stone', roof: 'plain', cut: true, cutH: 4 },
      2: { h: 76, top: '#3a2e2a', side: '#7a4a38', face: 'brick', roof: 'slab', windows: { lit: .15, w: 5, h: 10, step: 20, from: 14 } },
      3: { h: 26, top: '#7a7a80', side: '#5a5a62', face: 'none', roof: 'plain' },
      10: crate('#8a3a26', 34), 11: crate('#2a4a7a', 34), 12: crate('#2e5a3a', 34), 13: crate('#a8a8a0', 34), 14: crate('#7a2e22', 66), 15: crate('#22406a', 66), 16: crate('#2a4a30', 66)
    },
    floorTex: (x, y, tag) => streetFloor(x, y, tag), outside: '#0c1420', ao: 6
  });
  const C = (cx, cy) => ({ x: cx * T, y: cy * T });
  const SPOT = { car: C(9, 28.3), cut: C(5.5, 26.5), meet: C(19.8, 9.6), suvAt: C(23.5, 9.2), suvIn: C(41, 9.2) };
  const MYCAR = { x0: 8 * T, y0: 27.6 * T, x1: 10 * T, y1: 28.6 * T, color: UNMARKED, ex: 9 * T, ey: 27.2 * T, body: true };
  const LAMPS = [[3, 9.6], [12, 9.6], [28, 9.6], [36, 9.6], [19.5, 25.4], [9, 25.4], [31, 25.4], [14, 29.8], [26, 29.8]].map(([x, y]) => [x * T, y * T]);
  let dets, muscle, dante, conn, smoke, suv, talk, clock, phase, meetT, ended, over, notebook, made, fenceCrossed, aiT;
  const OBJ = () => [
    { t: 'Get inside the yard unseen', n: fenceCrossed ? 1 : 0, of: 1 },
    { t: 'Photograph Pryor with the connect', n: CASE.meet ? 1 : 0, of: 1 },
    { t: '(Bonus) Photograph the Escalade\'s tag', n: CASE.plate ? 1 : 0, of: 1 },
    { t: 'Get back out to the car', n: ended ? 1 : 0, of: 1 }
  ];
  function subjects() {
    const list = [];
    if (phase === 'talk') list.push({ id: 'meet', label: 'Dante Pryor meets the connect', note: 'Pryor in person, with the man who brings the package in. This is the case.', pts: () => [dante, conn], rigs: () => [CAST.DANTE.rig, connRig], active: () => phase === 'talk', onShot: () => { CASE.meet = true; } });
    if (suv && suv.parked) list.push({ id: 'plate', label: "Tag on Pryor's Escalade", note: 'Registered to a funeral home on Edmondson. Of course it is.', pts: () => [{ x: suv.x + 18, y: suv.y, z: 0 }], rigs: () => [], active: () => suv && suv.parked, onShot: () => { CASE.plate = true; } });
    return list;
  }
  const connRig = H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e8c8a8', hair: '#d8d8d0', cloth: '#d0c8b0', coat: '#4a4038', pants: '#3a342e', boot: '#2a1e18' } });

  function enter(data) {
    data = data || {};
    clock = 0; phase = 'wait'; meetT = 0; ended = false; over = false; notebook = false; made = 0; fenceCrossed = false; aiT = 0;
    CASE.meet = false; CASE.plate = false; CASE.photos = CASE.photos.filter(p => p.id !== 'meet' && p.id !== 'plate');
    TOASTS.length = 0; BUBBLES.length = 0; talk = talk || makeTalk();
    const p1 = new Detective(MYCAR.ex, MYCAR.ey, 'DEE', game.input, { facing: -Math.PI / 2, color: '#f0c060' });
    dets = [p1];
    if (data.attract) { p1.ai = { move: [0, 0], down: {}, pressed: {} }; p1.ghost = true; }
    muscle = [
      new Watcher(19.5 * T, 25 * T, soldierRig(0), { who: 'SMOKE', scan: [Math.PI / 2, -Math.PI / 2, Math.PI * .1, Math.PI * .9], range: 100, fov: 1.2 }),
      new Watcher(8 * T, 13.5 * T, soldierRig(1), { who: 'SMOKE', route: [[8 * T, 13.5 * T], [22 * T, 13.2 * T, 2], [22 * T, 18.5 * T], [8 * T, 18 * T, 2]], scan: true, range: 96, fov: 1.0, speed: 26 }),
      new Watcher(31 * T, 17.8 * T, soldierRig(0), { who: 'SMOKE', route: [[31 * T, 17.8 * T], [31 * T, 22 * T, 2], [16 * T, 22.4 * T], [24 * T, 22.4 * T, 2]], scan: true, range: 96, fov: 1.0, speed: 24 })
    ];
    muscle[1].flash = muscle[2].flash = true; muscle[0].facing = Math.PI / 2;
    dante = new Walker(SPOT.suvAt.x, SPOT.suvAt.y, CAST.DANTE.rig, { who: 'DANTE' }); dante.hidden = true;
    conn = new Walker(12 * T, 7 * T, connRig, { who: 'CALLER' }); conn.hidden = true;
    smoke = new Walker(17 * T, 9.8 * T, CAST.SMOKE.rig, { who: 'SMOKE' }); smoke.facing = 0;
    suv = { x: SPOT.suvIn.x, y: SPOT.suvIn.y, parked: false, vx: 0 };
    game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -6];
    L.enabled = true; L.ambient = .34;
    game.weather = { kind: 'rain', amount: .55, wind: .25, lightning: 0 };
    music('meet'); A.layer('heat', 0, .02); A.layer('alarm', 0, .02);
    if (!data.attract) game.allowJoin({ max: 2, onJoin: (inp) => { const d = new Detective(p1.x + 12, p1.y, 'BRANDT', inp, { color: '#7ac0ff' }); dets.push(d); toast('DET. BRANDT JOINS', 'Player 2 is in the yard', '#7ac0ff'); } });
    if (!data.attract && !data.skipBrief) scene(talk, [
      ['PELL', "Locust Point. Old Chesapeake Produce pier, the one with the clock that ain't told the right time since Schaefer was a beer people drank."],
      ['PELL', "\"The thing by the clock, the eight.\" That's tonight. Pryor don't come out for nothing. He'll come out for the man who brings it in."],
      ['HASKINS', "Three of his muscle walk that yard. Flashlights, not guns, far as we know. You get seen, the meet doesn't happen, and Pryor learns our faces."],
      ['DEE', "There's a cut in the fence on the west end. Kids go through it to fish."],
      ['HASKINS', "Then go fishing, Detective. One picture of Pryor and the connect, together. Then get out."]
    ], () => toast('CHAPTER 4: THE MEET', 'Locust Point, 12:40 AM', '#f0c060', 4));
  }
  function meetScript(dt) {
    if (phase === 'wait' && (fenceCrossed || clock > 50)) {
      phase = 'arrive'; suv.vx = -60; A.sfx('car');
      toast('HEADLIGHTS', 'A black Escalade rolls up the pier', '#f0c060', 3);
    }
    if (phase === 'arrive') {
      suv.x += suv.vx * dt; if (suv.x <= SPOT.suvAt.x + 14) { suv.x = SPOT.suvAt.x + 14; suv.vx = 0; suv.parked = true; phase = 'walk';
        dante.hidden = false; dante.body.x = suv.x - 20; dante.body.y = suv.y + 12; dante.go([SPOT.meet.x + 10, SPOT.meet.y]);
        conn.hidden = false; conn.body.x = 12 * T; conn.body.y = 8 * T; conn.go([SPOT.meet.x - 8, SPOT.meet.y]); }
    }
    if (phase === 'walk' && dante.idle && conn.idle) {
      phase = 'talk'; meetT = 0; dante.face(conn.x, conn.y); conn.face(dante.x, dante.y); smoke.face(dante.x, dante.y);
    }
    if (phase === 'talk') {
      meetT += dt;
      const lines = [[0, dante, 'DANTE', "You came yourself. I like that."], [4, conn, 'CALLER', "Business is business. The ships don't care who's king."],
        [9, dante, 'DANTE', "Same as last time. The boat on the twelfth."], [14, conn, 'CALLER', "Price went up. The canal union is asking questions."],
        [19, dante, 'DANTE', "Then it goes up. My name is my name."], [24, conn, 'CALLER', "Your name. Yes. Always the name with you people."], [30, smoke, 'SMOKE', 'We good?']];
      for (const [t, w, who, text] of lines) if (meetT - dt < t && meetT >= t) bark(who, w.body, text, 3.6);
      if (meetT > 34) {   // they part; the car leaves and comes back for another pass
        phase = 'leave'; dante.go([suv.x - 20, suv.y + 12]).then(w => { w.hidden = true; }); conn.go([12 * T, 7 * T]).then(w => { w.hidden = true; });
      }
    }
    if (phase === 'leave' && dante.hidden && conn.hidden) { phase = 'gone'; suv.parked = false; suv.vx = 70; meetT = 0; A.sfx('car'); if (!CASE.meet) toast('THEY ARE LEAVING', 'Smoke says they will circle back', '#ff9a6a', 3); }
    if (phase === 'gone') { suv.x += suv.vx * dt; meetT += dt; if (meetT > 14) { phase = 'arrive'; suv.vx = -60; A.sfx('car'); } }
  }
  function finish() {
    if (ended) return; ended = true; CASE.chapter = Math.max(CASE.chapter, 4);
    scene(talk, [
      ['DEE', "Got him. Pryor and the Dutchman, face to face under the clock. Got the tag too, if anybody cares."],
      ['HASKINS', "I care. A judge will care. Go home, Okafor. Sleep. It all falls apart in the morning, it always does."]
    ], () => game.go('ending'));
  }
  const AI_PATH = [[9, 27.2], [5.5, 27.2], [5.5, 25], [5.5, 22], [9, 21.6], [9, 14], [12.5, 13.6], [12.5, 10.5], [5.5, 25], [5.5, 27.2]];
  function aiDrive(d, dt) {
    aiT += dt; const ai = d.ai; ai.pressed = {}; ai.down = {};
    const live = subjects().filter(s => s.active() && !CASE.has(s.id));
    let tgt = null; for (const s of live) { const c = subjectCenter(s); if (Math.hypot(c[0] - d.x, c[1] - d.y) < 140) { tgt = c; break; } }
    if (tgt) { ai.down.aim = true; ai.lens = tgt; ai.move = [0, 0]; if (d.lens.on && Math.hypot(d.lens.x - tgt[0], d.lens.y - tgt[1]) < 6 && Math.floor(aiT * 4) % 6 === 0) ai.pressed.snap = true; return; }
    d.aiAt = d.aiAt || 0; const p = AI_PATH[d.aiAt % AI_PATH.length], dx = p[0] * T - d.x, dy = p[1] * T - d.y, n = Math.hypot(dx, dy);
    if (n < 6) { d.aiWait = (d.aiWait || 0) + dt; ai.move = [0, 0]; if (d.aiWait > (d.aiAt % AI_PATH.length === 7 ? 18 : 1.2)) { d.aiWait = 0; d.aiAt++; } } else ai.move = [dx / n, dy / n];
  }
  function update(dt) {
    tickToasts(dt); tickBubbles(dt);
    if (dets.length > 1) game.cam.frame(dets.map(d => d.hero), { margin: 50, zoom: [.6, 1] });
    else { const d = dets[0], k = d.lens.k * .55; game.focus(lerp(d.x, d.lens.x, k), lerp(d.y, d.lens.y, k), 10); }
    if (talk.update(dt)) return;
    if (game.input.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (notebook) { if (game.input.pressed('notebook') || game.input.pressed('cancel')) notebook = false; return; }
    if (game.input.pressed('notebook')) { notebook = true; A.sfx('select'); return; }
    clock += dt;
    const ctx = { subjects: subjects(), map, clock: 7200 + clock * 4, chapter: 4 };
    for (const d of dets) {
      if (d.ai) aiDrive(d, dt);
      const h = d.hero, pressedI = d.ai ? !!d.ai.pressed.interact : d.inp.pressed('interact');
      d.act = null;
      if (!ended && !over && CASE.meet && Math.hypot(h.x - (MYCAR.x0 + MYCAR.x1) / 2, h.y - MYCAR.y0 + 6) < 26) d.act = { label: 'Get in the car', act: finish };
      if (pressedI && d.act && !d.lens.on) { d.act.act(); continue; }
      d.update(dt, map, ctx);
      if (h.y < 25.6 * T) fenceCrossed = true;
    }
    if (d0().ai && CASE.meet && Math.hypot(d0().x - MYCAR.ex, d0().y - MYCAR.ey) < 20 && !ended) { ended = true; game.after(2, attractNext); }
    meetScript(dt);
    for (const w of [dante, conn, smoke]) w.update(dt, map);
    for (const w of muscle) {
      const st = over || ended ? 'calm' : w.look(dt, dets, map);
      if (w.mind.changed && st === 'notice') bark('SMOKE', w.body, E.pick(['Who out there?', 'Yo. Hold up.', "Thought I heard somethin'."]), 1.8);
      if (w.mind.changed && st === 'alert') { bark('SMOKE', w.body, E.pick(['HEY! Right there!', 'Police! Somebody out here!']), 2.2); A.sfx('whistle'); }
      w.think(dt, map);
      if (st === 'alert' && !over) for (const d of dets) if (!d.ghost && Math.hypot(d.x - w.x, d.y - w.y) < 16) { over = true; made = 1; A.sfx('hurt'); game.flash('#ffffff', .1); game.after(1.8, () => game.go('burned', { from: 'meet', why: "Pryor's muscle put a flashlight in your face. The Escalade never stopped. By morning every phone in the organization was in the harbor." })); }
    }
    const heat = muscle.some(w => w.mind.state === 'search' || w.mind.state === 'alert');
    if (heat !== update.heat) { update.heat = heat; A.layer('heat', heat ? 1 : 0, heat ? .3 : 2); A.layer('alarm', heat ? 1 : 0, heat ? .5 : 2); }
  }
  const d0 = () => dets[0];
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    drawCarTop(r, MYCAR);
    for (const [x, y] of LAMPS) r.prop('streetlamp', x, y, 0, { light: true, size: 1.1, cone: true });
    r.prop('sandbags', 30 * T, 8 * T, 0, { size: 1.2 }); r.prop('barrel', 6 * T, 8 * T, 0, { size: 1.2 }); r.prop('barrel', 7 * T, 8.3 * T, 0, { size: 1.2 }); r.prop('firedrum', 34 * T, 25 * T, 0, { light: true, size: 1.2 }); r.prop('crate', 21 * T, 24.6 * T, 0, { size: 1.2 });
    // the clock on the tower's face, stopped at a quarter to eight
    const cx = 19.5 * T, cy = 7.98 * T;
    r.queue(cx, cy, 56, g => { const p = r.w(cx, cy, 58); const x = Math.round(p[0]), y = Math.round(p[1]); px.disc(g, x, y, 9, '#1a1410'); px.disc(g, x, y, 8, '#e8dcb0'); px.line(g, x, y, x, y - 6, '#1a1410'); px.line(g, x, y, x - 4, y + 1, '#1a1410'); px.dot(g, x, y, '#8a1a1a'); }, { emissive: true, bias: 3 });
    L.add(cx, cy + 4, 58, 50, .5, { color: '#f0e0a0' });
    // the Escalade
    if (suv.x < 40 * T) { const s = { x0: suv.x - 18, y0: suv.y - 8, x1: suv.x + 18, y1: suv.y + 8, color: '#101014', lit: true };
      r.queue(suv.x, suv.y, 0, g => { r.box(g, s.x0, s.y0, 0, s.x1, s.y1, 15, '#1e1e24', '#0c0c10'); }, { bias: 0 }); drawCarTop(r, s);
      L.add(suv.x - 26, suv.y, 6, 70, .9, { color: '#fff4d0' }); }
    if (fenceCrossed && !CASE.meet) r.marker(SPOT.meet.x, SPOT.meet.y, 30, { label: 'THE CLOCK', color: '#ffd040' });
    if (!fenceCrossed) r.marker(SPOT.cut.x, SPOT.cut.y, 10, { label: 'CUT IN THE FENCE', color: '#9ae89a' });
    if (CASE.meet && !ended) r.marker((MYCAR.x0 + MYCAR.x1) / 2, MYCAR.y0, 24, { label: 'YOUR CAR', color: '#80e0ff' });
    for (const w of muscle) {
      if (S.cones) r.sightCone(w, { map, range: w.range, fov: w.fov, color: MOOD[w.mind.state], alpha: w.mind.state === 'calm' ? .2 : .36 });
      if (w.flash) L.add(w.x + Math.cos(w.facing) * 34, w.y + Math.sin(w.facing) * 34, 8, 44, .8, { color: '#fff4c8' });
      w.draw(r);
    }
    for (const w of [dante, conn, smoke]) w.draw(r);
    for (const d of dets) d.draw(r);
    r.overlay(g => {
      for (const w of muscle) if (w.mind.state !== 'calm') { const p = r.w(w.x, w.y, 50), a = w.mind.state === 'alert'; txt(g, a ? '!' : '?', p[0], p[1] - 8, MOOD[w.mind.state], { align: 'center', scale: a ? 2 : 1 }); E.ui.bar(g, Math.round(p[0]) - 7, Math.round(p[1]) + 4, 14, 2, Math.min(1, w.mind.level), MOOD[w.mind.state]); }
      drawBubbles(r, g);
      for (const d of dets) d.drawLens(r, g);
      drawViewfinder(g, r.W, r.H, dets[0], 7200 + clock * 4);
      hud(r, g);
      if (notebook) drawNotebook(g, r.W, r.H, OBJ(), 4);
    });
    talk.draw(r);
  }
  function hud(r, g) {
    const W = r.W, H = r.H, d = dets[0], k = d.lens.k;
    if (talk.open) return;
    if (k < .5) {
      const objs = OBJ(), w = 176;
      panel(g, 4, 4, w, 14 + objs.length * 11, .72); txt(g, 'CH.4  THE MEET', 9, 7, '#f0c060');
      objs.forEach((o, i) => { const ok = o.n >= o.of; px.rect(g, 9, 19 + i * 11, 6, 6, ok ? '#9ae89a' : '#5a5a62'); txt(g, o.t, 19, 18 + i * 11, ok ? '#8a9a8a' : '#e8e2d0'); });
    }
    drawToasts(g, W, 34);
    if (over || ended || d.ai) return;
    const watched = muscle.some(w => w.spotted === d && w.mind.level > .1);
    txt(g, watched ? 'BEING WATCHED' : d.crouch ? 'CROUCHED' : 'ON FOOT', 8, H - 14 - (k > .5 ? 18 : 0), watched ? '#ff9a40' : '#c8c0b0');
    const items = d.lens.on ? [['snap', 'Take photo'], ['aim', 'Lower']] : [['aim', 'Raise camera'], ...(d.act ? [['interact', d.act.label]] : []), ['crouch', d.crouch ? 'Stand' : 'Crouch'], ['sprint', 'Hurry'], ['notebook', 'Notebook']];
    promptRow(g, items, W / 2, H - 15 - (k > .5 ? 18 : 0));
  }
  return {
    view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], res: 'ps1', pausable: true, camera: { zoom: [.6, 1.4], start: .8 },
    dets: () => dets, subjects: () => subjects(),
    enter, update, draw, talk: () => talk, state: () => ({ clock, phase, meet: CASE.meet, plate: CASE.plate, fenceCrossed, det: [Math.round(dets[0].x), Math.round(dets[0].y)], muscle: muscle.map(m => m.mind.state) }),
    exit() { game.allowJoin(false); game.cam.offset = null; game.cam.frame(null); L.enabled = false; game.weather = null; for (const p of game.players.slice(1)) game.removePlayer(p); }
  };
})();
