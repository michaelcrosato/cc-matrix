/* ---- THE STREET: the Courts, west side. Surveillance, photographs, an informant, a tap on the payphone ---- */
const STREET = (() => {
  const W = 36, H = 23;
  const rows = mkMap([
    '####################################',
    '#AAAAAAAA......CCCCCCC.....HHHHHH...#',
    '#AAAAAAAA......CCCCCCC.....HHHHHH...#',
    '#AAAAAAAA......CCCCCCC.....HHHHHH...#',
    '#AAAAAAAA...x..................s....#',
    '#AAAAAAAA...........................#',
    '#.......................y...........#',
    '#....FFFF..........................F#',
    '#.........a.............b...........#',
    '#.p.......................BBBBBB....#',
    '#...................c..F...BBBBBB....#',
    '#...........FFFF..........BBBBBB.i..#',
    '#...................................#',
    '#.........U.....................U...#',
    '#...................................#',
    '#FFFFFFFFFFFFFF..FFFFFFFFFFFFFFFFFFF#',
    '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
    '#rrVrrrrrrrrrrrrrVrrrrrrrrrrrrVrrrrr#',
    '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
    '#rrrrrrrrvrrrrrrrrrrrrrrrrrrrrrrrrrr#',
    '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
    '#r@rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
    '####################################'], W);
  const PAVE = { stones: ['#5c5a5e', '#545256', '#625f62'].map(E.hex), mortar: E.hex('#2a282c'), hi: E.hex('#726f74'), lo: E.hex('#3a383c'), speck: E.hex('#4a484c') };
  const map = new E.TileMap({
    rows,
    legend: { '#': 1, A: 2, C: 3, H: 4, B: 5, F: 6, V: 7, U: 8, '.': { floor: 'walk' }, r: { floor: 'road' },
      '@': 'hero', p: 'phone', i: 'informant', v: 'van', s: 'stash', a: 'dealer1', b: 'dealer2', c: 'dealer3', x: 'look1', y: 'look2' },
    types: {
      1: { h: 54, top: '#2a2630', side: '#3c3640', face: 'brick', roof: 'plain', cut: true, cutH: 6 },
      2: { h: 70, top: '#4a3a34', side: '#7a4a3a', face: 'brick', roof: 'slab', windows: { lit: .35 }, balcony: { z: 36, color: '#2a2220' } },
      3: { h: 40, top: '#3a3a44', side: '#8a6a52', face: 'brick', roof: 'slab', windows: { lit: .25 }, door: { chance: .5 } },
      4: { h: 40, top: '#5a2a26', side: '#9a5a44', face: 'brick', roof: 'tiles', windows: { lit: .6 }, door: { chance: 1, color: '#2a1a14' } },
      5: { h: 30, top: '#2a3a3a', side: '#6a8a7a', face: 'plaster', roof: 'plain', windows: { lit: .8 }, door: { chance: 1 } },
      6: { h: 9, top: '#8a8a90', side: '#5a5a62', face: 'none', roof: 'plain' },
      7: { h: 13, top: '#6a2a2a', side: '#3a2a32', face: 'plain', roof: 'plain' },
      8: { h: 11, top: '#2a4a3a', side: '#2a3a32', face: 'plain', roof: 'plain' } },
    floorTex: (x, y, tag) => tag === 'road' ? E.tex.plain(x, y, { color: ((x >> 2) + (y >> 2)) & 1 ? '#232226' : '#262529' }) : E.tex.flagstone(x, y, PAVE)
  });
  const at = tag => map.find(tag);
  const SP = { hero: at('hero'), phone: at('phone'), informant: at('informant'), van: at('van'), stash: at('stash') };
  const LAMPS = [[7, 6], [17, 6.2], [26, 6], [8, 12.5], [20, 12.5], [32, 12.5], [12, 14.3], [28, 14.3]].map(([x, y]) => [x * T, y * T]);
  const PROPS = [['trashcan', 9.7, 13.2], ['hydrant', 3.5, 12], ['crate', 23.5, 10.2], ['barrel', 24.4, 10.4], ['sign', 25.2, 8.1], ['trashcan', 11.5, 5.4], ['sandbags', 26.6, 4.8], ['crate', 33.7, 12.2],
    ['firedrum', 17.6, 9.3], ['firedrum', 6.5, 17.5], ['trashcan', 31.6, 13.4], ['awning', 29, 8.7]];
  let hero, hrig, dealers, lookouts, deacon, tolly, flow, planting, plantHot, photoP, camUp, crouch, focus, hurtT, notebook, goalDemo, demoT, hubWait, shoutCd, ended, crewGone, overlayMsg;
  const mkNpc = (tag, rigOpts, o) => { const s = at(tag) || at('hero'); const m = mkMover(s.x, s.y, o); m.rig = new E.Humanoid(rigOpts); m.home = { x: s.x, y: s.y }; m.alpha = 1; return m; };

  function build() {
    hero = mkMover(SP.hero.x, SP.hero.y); hero.facing = -Math.PI / 2;
    hrig = hrig || new E.Humanoid({ size: 1.25, build: 'heroic', outfit: 'coat', hair: 'ponytail', sleeves: 'long', weapon: null,
      colors: { skin: '#a8714f', hair: '#2a1a14', coat: '#4a4a56', cloth: '#7a6a5a', pants: '#26262e', boot: '#1a1414', trim: '#c9b88a' } });
    const D = (tag, id, name, hair, cloth, pants, hat) => { const m = mkNpc(tag, { size: 1.25, outfit: 'shirt', sleeves: 'long', hair, hat: hat && { style: hat, color: '#26262c' }, weapon: null, colors: { skin: ['#7a4e36', '#5a3a2a', '#9a6a4a'][dealers ? dealers.length : 0], cloth, pants, hair: '#181212' } }); m.id = id; m.name = name; m.facing = Math.PI * .6; return m; };
    dealers = [];
    dealers.push(D('dealer1', 'tick', 'Little Tick', 'spiky', '#d8d040', '#2a2a3a', 'cap'));
    dealers.push(D('dealer2', 'mouse', 'Mouse', 'short', '#b03a3a', '#3a3a4a', 'band'));
    dealers.push(D('dealer3', 'lonnie', 'Big Lonnie', 'bald', '#2a2a2a', '#3a3a4a'));
    const K = (tag, i) => { const m = mkNpc(tag, { size: 1.0, outfit: 'shirt', sleeves: 'short', hair: 'short', hat: 'cap', weapon: null, colors: { skin: ['#8a5a3a', '#6a4a30'][i], cloth: ['#3a6aa0', '#5aa070'][i], pants: '#2a2a3a' } }, { r: 4 }); m.mind = new E.Suspicion({ rise: 1.5, decay: .35, forget: 5 }); m.base = i ? Math.PI : 0; m.ph = i * 2; return m; };
    lookouts = [K('look1', 0), K('look2', 1)];
    deacon = mkNpc('informant', { size: 1.25, outfit: 'coat', hair: 'bald', sleeves: 'long', weapon: null, colors: { skin: '#5a3a2a', coat: '#4a4a3a', cloth: '#8a7a5a', pants: '#3a3a3a' } }); deacon.facing = Math.PI;
    tolly = mkNpc('van', { size: 1.25, outfit: 'coat', hair: 'short', hat: 'cap', sleeves: 'long', weapon: null, colors: { skin: '#e0b090', hair: '#8a5a2a', coat: '#6a5a3a', cloth: '#5a6a7a', pants: '#2a2a3a' } });
    tolly.x += 22; tolly.y -= 4; tolly.facing = Math.PI * .5;
    flow = new E.FlowField(map, {});
    planting = 0; plantHot = false; photoP = 0; camUp = false; crouch = false; focus = null; hurtT = 0; notebook = false; goalDemo = null; demoT = 0; shoutCd = 0; ended = false; crewGone = 0; overlayMsg = null;
  }

  /* ---- what there is to do here ---- */
  const needs = () => {
    const m = [];
    if (S.photos.length < 3) m.push('photograph the crew (' + S.photos.length + '/3)');
    if (!S.tip) m.push('talk to Deacon'); else if (!S.tapped) m.push('tap the payphone');
    return m;
  };
  const ready = () => S.photos.length >= 3 && S.tip && S.tapped;
  const objective = () => {
    if (S.board && S.board.granted) return { title: 'Serve the warrant', text: 'The row house on Calloway: the Annex', at: SP.stash };
    if (S.board) return { title: 'Return to the van', text: 'The judge is waiting on you', at: SP.van };
    if (ready()) return { title: 'Back to the wire room', text: 'The van, south road', at: SP.van };
    if (S.photos.length < 3) { const d = dealers.find(d => !S.photos.includes(d.id)); return { title: 'Photograph the crew', text: S.photos.length + ' of 3 on film: hold ' + key('camera'), at: d }; }
    if (!S.tip) return { title: 'Get the number', text: 'Deacon, behind the bodega', at: SP.informant };
    return { title: 'Tap the payphone', text: 'Hold ' + key('interact') + ' at the west phone', at: SP.phone };
  };
  const things = () => [
    { id: 'deacon', x: deacon.x, y: deacon.y, range: 28, label: 'Talk to Deacon', show: () => !S.tip, act: talkDeacon },
    { id: 'phone', x: SP.phone.x, y: SP.phone.y, range: 24, label: 'Wire the payphone (hold)', show: () => !S.tapped, hold: true, act: () => {} },
    { id: 'van', x: SP.van.x, y: SP.van.y, range: 34, label: S.board ? 'Talk to Tolly' : 'Enter the wire room', show: () => !(S.board && S.board.granted), act: useVan },
    { id: 'stash', x: SP.stash.x, y: SP.stash.y + 8, range: 26, label: 'Serve the warrant', show: () => S.board && S.board.granted, act: () => startRaid() }
  ].filter(t => t.show());
  const nearThing = () => things().filter(t => Math.hypot(t.x - hero.x, t.y - hero.y) < t.range).sort((a, b) => Math.hypot(a.x - hero.x, a.y - hero.y) - Math.hypot(b.x - hero.x, b.y - hero.y))[0];

  function talkDeacon() {
    if (DEMO) { S.tip = 2; S.tipKind = 'paid'; S.money -= 40; toast('Deacon talks', 'The Annex, Calloway St.'); return; }
    convo([
      ['deacon', ["Detective. You're standing where a man can see you.", "That's fine. Most of 'em never look up."]],
      ['pike', ["Boyce's number, Deacon. The one he actually uses after dark."]],
      ['deacon', ["You know what a number costs.", "Forty dollars is a lot of conscience, but I've had less."]]
    ], () => say('deacon', ["So what's it gonna be?"], { choices: ['Slide him $40', 'Lean on him', 'Walk away'], onChoice: i => {
      if (i === 2) { toast('Deacon', 'Come back when you mean it'); return; }
      if (i === 0) {
        if (S.money < 40) { toast('Short on the slush fund', 'Lean on him, or find $40', COL.red); return; }
        S.money -= 40; S.tip = 2; S.tipKind = 'paid';
        convo([['deacon', ["Payphone by the west lot. Midnight, Boyce's people use it like a church.", "And the stash is the row house on Calloway. They call it the Annex."]]], () => toast('Tip: the Annex', 'Payphone + address. Strength 2', COL.green));
      } else {
        S.integrity--; S.tip = 1; S.tipKind = 'leaned';
        convo([['deacon', ["...The west payphone. That's all you get. Now we're even, and you're a bastard."]]], () => toast('Tip: the payphone', 'Integrity -1. Strength 1', COL.amber));
      }
    } }));
  }
  function useVan() {
    if (S.board) { if (S.board.granted) return; say('tolly', ['The judge signed? No? Then go get him a better story.']); return; }
    if (!ready()) { say('tolly', ["Not yet. We still need to " + needs().join(', ') + '.', "A wire with nothing on it is just a phone bill."]); return; }
    if (DEMO) return game.go('wire', { demo: true });
    say('tolly', ["Headphones are warm. Boyce's line has been busy since dusk.", 'Sit down. Listen. Log what matters, and not a word of what does not.'], { onDone: () => game.go('wire') });
  }
  function startRaid() { game.go('raid', { demo: DEMO }); }
  function scatter() {
    if (crewGone > 0) return;
    sfx('whistle'); crewGone = 24; S.burn++; photoP = 0; planting = 0; game.shake(2);
    toast('FIVE-OH!', 'The corner scatters. Burn ' + S.burn + '/3', COL.red);
    if (S.burn >= 3 && !ended) { ended = true; game.after(1.2, () => game.go('over', { why: 'burned' })); }
  }
  function capture(d) {
    S.photos.push(d.id); photoP = 0; sfx('shutter'); game.flash('#ffffff', .12, .8); game.hitFx && 0;
    toast('PHOTO ' + S.photos.length + '/3', d.name + ' on film', COL.green);
    if (S.photos.length === 3) toast('Crew documented', 'Now the number', COL.gold);
  }

  /* ---- hero ---- */
  function heroControl(dt) {
    const d = moveDir(); let mx = d[0] * Math.min(1, d[2]), my = d[1] * Math.min(1, d[2]);
    if (I.pressed('crouch')) crouch = !crouch;
    if (I.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    const wantCam = I.down('camera') && !planting;
    if (wantCam !== camUp) { camUp = wantCam; game.setZoom(camUp ? 1.45 : (scenes.street.camera.start || 1)); photoP = 0; }
    let speed = camUp ? .4 : crouch ? .45 : 1;
    if (camUp) {   // aim: the mouse, or the right stick, else the way you walk
      const mg = game.mouseGround();
      if (I.aimSource === 'pad' && I.padAim) { const g = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); hero.facing = Math.atan2(g[1], g[0]); }
      else if (I.aimSource === 'mouse' && mg) hero.facing = Math.atan2(mg.y - hero.y, mg.x - hero.x);
      else if (Math.hypot(mx, my) > .1) hero.facing = Math.atan2(my, mx);
    }
    if (planting > 0) speed = 0;
    const sprint = I.down('sprint') && !crouch && !camUp;
    hero.crouch = crouch;
    hero.update(dt, map, { move: [mx * speed, my * speed], sprint, crouch, jumpPressed: I.pressed('jump') && !camUp });
    if (camUp && Math.hypot(mx, my) < .1) { /* hold the aim */ }
    hero.exposure = camUp ? 1 : sprint ? 1 : 1;
  }
  function photoUpdate(dt) {
    if (!camUp) return;
    let best = null, bd = 1e9;
    for (const d of dealers) {
      if (S.photos.includes(d.id) || d.alpha < .9 || crewGone > 0) continue;
      const dx = d.x - hero.x, dy = d.y - hero.y, dist = Math.hypot(dx, dy);
      if (dist > 160 || Math.abs(E.angDiff(hero.facing, Math.atan2(dy, dx))) > .45) continue;
      if (!map.ray(hero, d, { eye: 30, target: 22 }).clear) continue;
      if (dist < bd) { bd = dist; best = d; }
    }
    focusPhoto = best;
    if (best) { photoP += dt / (.9 * diff()); if (I.pressed('attack')) photoP = 1; if (photoP >= 1) capture(best); }
    else { photoP = Math.max(0, photoP - dt * 1.5); if (I.pressed('attack')) { sfx('shutter', { vol: .4 }); toast('Nothing in frame', '', COL.dim); } }
  }
  let focusPhoto = null;
  function interactUpdate(dt) {
    const th = nearThing();
    focus = th || null;
    // the mouse hovers a thing in the world and a click uses it
    const mg = game.mouseGround(), hov = mg && I.aimSource === 'mouse' ? things().find(t => Math.hypot(t.x - mg.x, t.y - mg.y) < 22) : null;
    if (hov) focus = Math.hypot(hov.x - hero.x, hov.y - hero.y) < hov.range * 1.6 ? hov : focus;
    const clk = I.clicked();
    if (!camUp && clk && hov && Math.hypot(hov.x - hero.x, hov.y - hero.y) < hov.range * 1.6) { if (!hov.hold) { hov.act(); I.consumeAll(); return; } }
    if (th && th.id === 'phone') {
      if (!S.tip) { if (I.pressed('interact')) say('pike', ["A payphone with no number is just a phone. I need Boyce's number first.", 'Deacon, behind the bodega.']); planting = 0; return; }
      if (I.down('interact') && !camUp) {
        planting += dt / 2.4; crouch = true;
        if (lookouts.some(l => l.mind.state !== 'calm')) { if (planting > .15) { toast('Too hot', 'A lookout is watching', COL.red); } planting = 0; }
        if (planting >= 1) { planting = 0; S.tapped = true; sfx('powerup'); toast('TAP IN', 'Boyce\'s line is live', COL.green); }
      } else planting = Math.max(0, planting - dt);
      return;
    }
    planting = 0;
    if (th && !camUp && I.pressed('interact')) { I.consumeAll(); th.act(); }
  }
  function lookoutUpdate(dt) {
    let heat = 0;
    for (const l of lookouts) {
      l.facing = l.base + Math.sin(game.time * .55 + l.ph) * 1.15;
      if (DEMO || crewGone > 0) { l.mind.reset(); l.update(dt, map, { move: [0, 0] }); continue; }
      const seen = E.sees(l, hero, { map, range: 92 * diff(), fov: 1.55 });
      const st = l.mind.update(dt, seen, hero);
      if (l.mind.changed && st === 'notice') sfx('blip', { vol: .4 });
      if (l.mind.changed && st === 'alert') scatter();
      heat = Math.max(heat, l.mind.level);
      l.update(dt, map, { move: [0, 0] });
    }
    S.heat = heat;
  }
  function npcUpdate(dt) {
    if (crewGone > 0) { crewGone -= dt; if (crewGone <= 0) { toast('The corner fills back in', 'Stay low', COL.amber); lookouts.forEach(l => l.mind.reset()); } }
    for (const d of dealers) {
      d.alpha = approach(d.alpha, crewGone > 0 ? 0 : 1, dt * 2.5);
      d.facing += Math.sin(game.time * .4 + d.x) * dt * .6;
      d.update(dt, map, { move: [0, 0] });
      d.rig.update(dt, d.rigState({ pose: 'hips', expr: Math.sin(game.time * .3 + d.y) > .8 ? 'smile' : null }));
    }
    for (const l of lookouts) l.rig.update(dt, l.rigState({}));
    deacon.update(dt, map, { move: [0, 0] }); deacon.rig.update(dt, deacon.rigState({ pose: 'crouch' === 0 ? '' : null }));
    tolly.update(dt, map, { move: [0, 0] }); tolly.rig.update(dt, tolly.rigState({}));
  }
  const approach = E.approach;

  /* ---- demo driver: walk the whole case, cheating freely ---- */
  function demoUpdate(dt) {
    demoT += dt;
    let goal = null, act = null, close = 22;
    if (S.board && S.board.granted) { goal = SP.stash; act = startRaid; }
    else if (S.photos.length < 3) { const d = dealers.find(d => !S.photos.includes(d.id)); goal = { x: d.x - 10, y: d.y + 44 }; close = 8; act = () => { hero.facing = Math.atan2(d.y - hero.y, d.x - hero.x); camUp = true; photoP += dt * 1.2; focusPhoto = d; if (photoP >= 1) { capture(d); camUp = false; } }; }
    else if (!S.tip) { goal = { x: deacon.x - 20, y: deacon.y }; act = talkDeacon; }
    else if (!S.tapped) { goal = { x: SP.phone.x + 12, y: SP.phone.y }; act = () => { planting += dt / 1.2; hero.facing = Math.PI; if (planting >= 1) { planting = 0; S.tapped = true; sfx('powerup'); toast('TAP IN', 'Boyce\'s line is live', COL.green); } }; }
    else if (!S.board) { goal = { x: SP.van.x + 4, y: SP.van.y + 14 }; act = useVan; }
    else { goal = SP.van; act = null; }
    camUp = camUp && photoP > 0;
    if (!goal) return;
    const d = Math.hypot(goal.x - hero.x, goal.y - hero.y);
    if (d < close) { hero.update(dt, map, { move: [0, 0] }); if (act && demoT > .6) act(); return; }
    flow.update(goal.x, goal.y);
    const nx = flow.next(hero.x, hero.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - hero.x, ty - hero.y) || 1;
    hero.update(dt, map, { move: [(tx - hero.x) / l, (ty - hero.y) / l], sprint: true, jumpPressed: !!(nx && hero.onGround && (nx.kind === 'jump' || nx.kind === 'climb') && nx.edge < hero.r + 4) });
    demoT = 0;
  }

  function enter(data) {
    if (!(data && data.keep)) { if (!(data && data.fresh === false)) {} }
    build();
    map.drawn = 0;
    game.follow(hero, { z: 16 }); game.cam.bounds = v => map.bounds(v);
    L.enabled = true; L.ambient = .42; game.weather = { kind: 'rain', amount: .3, wind: .15, lightning: .04 };
    music('street'); toasts.length = 0; hubWait = HUB.active && !HUB.started;
    if (S.step === 0) {
      S.step = 1;
      if (DEMO || HUB.active) return;
      convo([
        ['dray', ["Pike. Sit. Not there, that's where the last guy sat.", "The Deputy wants numbers by Friday. I want a name that isn't a kid on a corner."]],
        ['pike', ["Then give me the Courts. Two weeks, one wire, and nobody pulls me off it the first time it gets hard."]],
        ['dray', ["Nobody pulls anybody. They just stop returning your calls.", "Boyce runs the Courts. Photograph the crew, find the number, get me a warrant."]],
        ['pike', ["And the money?"]],
        ['dray', ["There's $120 in the slush fund. Spend it like it's yours. It is, in the way that matters."]]
      ], () => toast('THE DETAIL', 'Photograph the crew. Find the number. Wire the line.', COL.gold));
    }
  }
  let nbOpen = false;
  function update(dt) {
    updateToasts(dt);
    if (hubWait) { if (AIHub.time() >= 0) hubWait = false; else return; }
    if (talk.update(dt)) { hero.update(dt, map, { move: [0, 0] }); hrig.update(dt, hero.rigState({})); npcUpdate(dt); return; }
    if (I.pressed('map')) { notebook = !notebook; sfx('select'); }
    if (notebook) { if (I.pressed('cancel') || I.pressed('confirm')) { notebook = false; I.consumeAll(); } return; }
    S.time += dt;
    if (ended) { hero.update(dt, map, { move: [0, 0] }); return; }
    if (DEMO) { demoUpdate(dt); } else { heroControl(dt); photoUpdate(dt); interactUpdate(dt); }
    lookoutUpdate(dt); npcUpdate(dt);
    hrig.update(dt, hero.rigState({ pose: camUp ? 'guard' : planting > 0 ? 'crouch' : null, hurt: hurtT > 0 }));
    if (hurtT > 0) hurtT -= dt;
    S.score = scoreNow(); hubProgress();
  }

  const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const [id, x, y] of PROPS) r.prop(id, x * T, y * T, 0, { size: 1.2, light: id === 'firedrum' });
    for (const [x, y] of LAMPS) r.prop('streetlamp', x, y, 0, { light: true, size: 1.3 });
    L.add(SP.phone.x, SP.phone.y, 30, 40, .5, { color: '#ffdd88' });
    r.prop('sign', SP.phone.x, SP.phone.y - 2, 0, { size: 1.0 });
    // the surveillance van
    r.queue(SP.van.x, SP.van.y, 0, g => { r.box(g, SP.van.x - 16, SP.van.y - 8, 0, SP.van.x + 16, SP.van.y + 8, 17, '#8a8a92', '#4a4a56'); r.box(g, SP.van.x - 16, SP.van.y - 8, 17, SP.van.x + 6, SP.van.y + 8, 20, '#aaaab2', '#6a6a76'); }, { footprint: [SP.van.x - 16, SP.van.y - 8, SP.van.x + 16, SP.van.y + 8] });
    for (const l of lookouts) if (!DEMO) r.sightCone(l, { map, range: 92 * diff(), fov: 1.55, color: MOOD[l.mind.state], alpha: l.mind.state === 'calm' ? .2 : .36 });
    const shadow = b => r.shadow(b.x, b.y, 6, .35, undefined, map.groundAt(b.x, b.y, b.r, b.z));
    const drawN = (m, extra) => { shadow(m); r.actor(m.x, m.y, m.z, (g, ox, oy) => m.rig.draw(g, ox, oy, r.view), Object.assign({ alpha: m.alpha === undefined ? 1 : m.alpha }, extra)); };
    for (const d of dealers) if (d.alpha > .02) drawN(d, { pick: d });
    for (const l of lookouts) drawN(l); drawN(deacon); drawN(tolly);
    shadow(hero); r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => hrig.draw(g, ox, oy, r.view), { xray: { actors: true }, alpha: crouch ? .9 : 1 });
    const o = objective(); if (o.at && !camUp) r.marker(o.at.x, o.at.y, 0, { label: o.title.toUpperCase(), color: COL.gold });
    if (focus) r.groundRing && r.groundRing(focus.x, focus.y, 10 + Math.sin(game.time * 6) * 1.5, '#ffffff');
    r.overlay(g => {
      for (const l of lookouts) if (l.mind.state !== 'calm' && !DEMO) {
        const [sx, sy] = r.w(l.x, l.y, 40), a = l.mind.state === 'alert';
        txt(g, a ? '!' : '?', sx, sy - 8, MOOD[l.mind.state], { align: 'center' }); E.ui.bar(g, Math.round(sx) - 6, Math.round(sy) + 2, 12, 2, Math.min(1, l.mind.level), MOOD[l.mind.state]);
      }
      hud(g, r.W, r.H);
    });
    talk.draw(r);
  }
  function hud(g, W, H) {
    if (hubWait) { panel(g, W / 2 - 90, H / 2 - 14, 180, 28); txt(g, 'THE ROUND STARTS SOON', W / 2, H / 2 - 4, COL.gold, { align: 'center' }); return; }
    const o = objective(), ca = game.cornerArea && game.cornerArea();
    panel(g, 6, 6, 150, 40); txt(g, o.title.toUpperCase(), 12, 11, COL.gold); txt(g, o.text, 12, 22, '#ddd'); txt(g, '$' + S.money + '   PHOTOS ' + S.photos.length + '/3   TAP ' + (S.tapped ? 'IN' : '--'), 12, 33, COL.blue);
    // heat / integrity
    const hx = 6, hy = 50; panel(g, hx, hy, 150, 22); txt(g, 'HEAT', hx + 6, hy + 4, '#ccc'); E.ui.bar(g, hx + 34, hy + 4, 110, 5, clamp(S.heat || 0, 0, 1), '#ff5a4a');
    txt(g, 'BURNED ' + S.burn + ' / 3', hx + 6, hy + 13, S.burn ? COL.red : '#aaa');
    drawToasts(g, ca && ca.y0 < 40 ? Math.floor(ca.x0) - 4 : W);
    // prompts
    let y = H - 20; const px0 = W / 2;
    if (!talk.open) {
      const th = focus;
      if (th && !camUp) { const lab = th.label; const w = E.font.width(key(th.hold ? 'interact' : 'interact')) + E.font.width(lab) + 22; chip(g, px0 - w / 2, y - 14, 'interact', lab); if (planting > 0) { panel(g, px0 - 40, y - 28, 80, 10); E.ui.bar(g, px0 - 38, y - 26, 76, 6, planting, COL.green); txt(g, 'PLANTING THE TAP', px0, y - 38, COL.green, { align: 'center' }); } }
      let x = 8; const yy = H - 14;
      txt(g, key('camera') + ' CAMERA  ' + key('crouch') + ' CROUCH  ' + key('map') + ' NOTEBOOK  ' + key('view') + ' VIEW', x, yy, '#bbb');
    }
    if (camUp) viewfinder(g, W, H);
    if (notebook) notebookUI(g, W, H);
  }
  function viewfinder(g, W, H) {
    const cx = W / 2, cy = H / 2, s = 34;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, Math.round(cx + sx * s - (sx > 0 ? 8 : 0)), Math.round(cy + sy * s), 9, 1, '#fff'); px.rect(g, Math.round(cx + sx * s), Math.round(cy + sy * s - (sy > 0 ? 8 : 0)), 1, 9, '#fff'); }
    txt(g, 'REC', cx - s + 2, cy - s - 12, Math.floor(game.time * 2) % 2 ? '#ff4a3a' : '#fff');
    if (focusPhoto) { E.ui.bar(g, cx - 28, cy + s + 6, 56, 5, clamp(photoP, 0, 1), COL.green); txt(g, focusPhoto.name.toUpperCase() + ' IN FRAME', cx, cy + s + 14, COL.green, { align: 'center' }); }
    else txt(g, 'AIM AT THE CREW: HOLD STEADY', cx, cy + s + 8, '#ccc', { align: 'center' });
    px.rect(g, cx, cy - 2, 1, 5, '#fff'); px.rect(g, cx - 2, cy, 5, 1, '#fff');
  }
  function notebookUI(g, W, H) {
    const w = Math.min(W - 24, 280), x = (W - w) / 2, y = 14, h = H - 28;
    panel(g, x, y, w, h, { bg: ['#2a2418', '#1a160e'], border: '#c9b88a' });
    txt(g, "PIKE'S NOTEBOOK", x + 10, y + 8, COL.gold); let yy = y + 22;
    const line = (s, c) => { txt(g, s, x + 10, yy, c || COL.paper); yy += 11; };
    line('TARGET: Cornelius "Neely" Boyce, the Courts, west side.', '#ddd');
    line((S.photos.length >= 1 ? '[x]' : '[ ]') + ' Photograph the crew ' + S.photos.length + '/3', S.photos.length >= 3 ? COL.green : COL.paper);
    line((S.tip ? '[x]' : '[ ]') + ' Informant: ' + (S.tip ? (S.tipKind === 'paid' ? 'paid, solid tip' : 'leaned on, thin tip') : 'Deacon, behind the bodega'), S.tip ? COL.green : COL.paper);
    line((S.tapped ? '[x]' : '[ ]') + ' Tap the west payphone', S.tapped ? COL.green : COL.paper);
    line((S.board ? '[x]' : '[ ]') + ' Case board: charges for the judge', S.board ? COL.green : COL.paper);
    line((S.board && S.board.granted ? '[ ]' : '[ ]') + ' Serve the warrant at the Annex', COL.paper); yy += 6;
    line('SLUSH FUND $' + S.money + '    INTEGRITY ' + '■'.repeat(Math.max(0, S.integrity)) + '□'.repeat(Math.max(0, 3 - S.integrity)) + '    BURNED ' + S.burn + '/3', COL.blue); yy += 6;
    line('LESSONS OF THE JOB', COL.gold);
    line('Lookouts watch the corner. Stay out of their cones;', '#bbb'); line('crouch (' + key('crouch') + ') and use the walls and cars.', '#bbb');
    line('A burned corner costs you a day and a strike.', '#bbb');
    txt(g, 'Press ' + key('cancel') + ' or ' + key('map') + ' to close', x + 10, y + h - 12, '#999');
  }
  const heroState = () => ({ hero, dealers, lookouts });
  return { view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: PRESET, res: 'ps1', pausable: true, camera: { zoom: [.75, 2], start: 1.0, rotate: true },
    enter, update, draw, state: heroState, exit() { game.setZoom(1); L.enabled = false; game.weather = null; game.cam.offset = null; },
    api: { capture, scatter, get dealers() { return dealers; }, get hero() { return hero; } } };
})();
scenes.street = STREET;
