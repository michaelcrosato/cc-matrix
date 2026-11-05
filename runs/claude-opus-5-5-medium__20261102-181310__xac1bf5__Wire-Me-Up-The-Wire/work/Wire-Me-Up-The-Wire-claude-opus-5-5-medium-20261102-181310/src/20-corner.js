/* ============================================================================
 * 20-corner: CHAPTER 1, THE CORNER. Monroe and Fulton, Ellery Courts, late afternoon into dusk.
 * Sit on the corner from the car or on foot, photograph the hand-to-hands, find the stash, catch the lieutenant on a
 * pickup and fish the dumped burner out of the trash, without the lookouts making you. Three "five-oh" calls and the
 * surveillance is blown.
 * ========================================================================== */
const CORNER = (() => {
  const CW = 48, CHh = 34;
  const G = Array.from({ length: CHh }, () => Array(CW).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = ch; };
  const CARS = [];
  const car = (x, y, horiz, ch, color, o = {}) => { const w = horiz ? 2 : 1, h = horiz ? 1 : 2; fill(x, y, x + w - 1, y + h - 1, ch); CARS.push(Object.assign({ x0: x * T + 1, y0: y * T + 2, x1: (x + w) * T - 1, y1: (y + h) * T - 2, color, cx: x, cy: y }, o)); };
  // streets
  fill(1, 12, 46, 13, '-'); fill(1, 18, 46, 19, '-'); fill(19, 1, 20, 32, '-'); fill(25, 1, 26, 32, '-');
  fill(21, 1, 24, 32, '.'); fill(1, 14, 46, 17, '.');
  for (let x = 1; x <= 46; x += 3) if (x < 20 || x > 25) G[15][x] = 'y';
  // top-left block: back row, alley with dumpsters, front rowhouses
  fill(1, 1, 18, 3, 'B'); fill(1, 4, 18, 6, ':'); fill(1, 7, 18, 11, 'R');
  for (let x = 1; x <= 18; x++) if (Math.floor((x - 1) / 3) % 3 === 1) fill(x, 7, x, 11, 'B'); else if (Math.floor((x - 1) / 3) % 3 === 2) fill(x, 7, x, 11, 'W');
  fill(3, 4, 4, 4, 'D'); fill(12, 4, 13, 4, 'D');
  // top-right block: back row, alley, front row with the vacants and the stash, an empty lot behind a fence
  fill(27, 1, 46, 3, 'B'); fill(27, 4, 46, 6, ':'); fill(27, 7, 30, 11, 'R'); fill(31, 7, 33, 11, 'V'); fill(34, 7, 35, 11, 'S'); fill(36, 7, 37, 11, 'V'); fill(38, 7, 40, 11, 'W');
  fill(41, 4, 46, 11, ';'); fill(41, 11, 46, 11, 'f'); G[11][43] = ';'; G[11][44] = ';'; fill(30, 4, 31, 4, 'D');
  // bottom-left: rowhouses, the corner store, a lot
  fill(1, 20, 12, 24, 'W'); for (let x = 1; x <= 12; x++) if (Math.floor((x - 1) / 3) % 2) fill(x, 20, x, 24, 'R');
  fill(13, 20, 18, 24, 'M'); fill(1, 25, 18, 32, ';'); fill(1, 25, 18, 25, ':');
  // bottom-right: the low-rise courts around a dirt yard
  fill(27, 20, 46, 32, ','); fill(27, 23, 32, 27, 'P'); fill(40, 23, 46, 27, 'P'); fill(27, 30, 46, 32, 'P'); fill(35, 25, 37, 25, 'f');
  // parked cars (body cells: solid, low cover)
  car(3, 14, true, 'a', '#3a5a9a'); car(8, 14, true, 'b', '#d8d8d0'); car(29, 14, true, 'c', '#1e1e22'); car(38, 14, true, 'd', '#9a2a2a');
  car(5, 17, true, 'e', '#3a6a4a'); car(11, 17, true, 'u', UNMARKED, { unmarked: true }); car(33, 17, true, 'c', '#2a2a30'); car(43, 17, true, 'a', '#5a6a8a');
  car(21, 3, false, 'b', '#c8c0a8'); car(21, 25, false, 'd', '#7a3a2a'); car(24, 8, false, 'e', '#4a4a3a'); car(24, 28, false, 'a', '#2a3a5a');
  car(4, 28, true, 'c', '#3a3a3a'); car(13, 30, true, 'b', '#b8b0a0');
  fill(0, 0, CW - 1, 0, '#'); fill(0, CHh - 1, CW - 1, CHh - 1, '#'); fill(0, 0, 0, CHh - 1, '#'); fill(CW - 1, 0, CW - 1, CHh - 1, '#');
  const rows = G.map(r => r.join(''));
  const carType = (c) => ({ h: 14, top: E.tones(c).base, side: E.tones(c).sh, face: 'none', roof: 'plain' });
  const map = new E.TileMap({ rows,
    legend: { '#': 1, R: 2, B: 3, W: 4, V: 5, S: 6, M: 7, P: 8, D: 9, f: 10, a: 20, b: 21, c: 22, d: 23, e: 24, u: 25,
      '-': { floor: 'walk' }, ':': { floor: 'alley' }, ';': { floor: 'lot' }, ',': { floor: 'dirt' }, y: { floor: 'line' } },
    types: {
      1: { h: 44, top: '#3a2a26', side: '#6a3a2e', face: 'brick', roof: 'slab', cut: true, cutH: 6 },
      2: { h: 40, top: '#3e3434', side: '#8a3e30', face: 'brick', roof: 'slab', windows: { lit: .35, w: 4, h: 8, step: 16, from: 14 }, door: { chance: .5, color: '#2a1e1a' } },
      3: { h: 40, top: '#38322e', side: '#6a5a4c', face: 'stone', roof: 'slab', windows: { lit: .25, w: 4, h: 8, step: 16, from: 14 }, door: { chance: .5, color: '#3a2a20' } },
      4: { h: 40, top: '#3a3634', side: '#a89a88', face: 'brick', roof: 'slab', windows: { lit: .3, w: 4, h: 8, step: 16, from: 14 }, door: { chance: .5, color: '#1a2a3a' } },
      5: { h: 40, top: '#2a2624', side: '#5a4a3e', face: 'plank', roof: 'slab', windows: { lit: 0, w: 4, h: 8, step: 16, from: 14 } },
      6: { h: 40, top: '#2a2624', side: '#5a4a3e', face: 'plank', roof: 'slab', windows: { lit: 0, w: 4, h: 8, step: 16, from: 14 }, door: { chance: 1, color: '#8a1a1a' } },
      7: { h: 36, top: '#4a4440', side: '#c8b898', face: 'plaster', roof: 'slab', windows: { lit: .9, w: 6, h: 6, step: 18, from: 10 }, door: { chance: .4, color: '#2a3a2a' } },
      8: { h: 52, top: '#4a403a', side: '#b08a68', face: 'brick', roof: 'slab', windows: { lit: .3, w: 4, h: 6, step: 14, from: 10 }, door: { chance: .25, color: '#3a3a40' } },
      9: { h: 18, top: '#2a4a2e', side: '#3a5a3a', face: 'none', roof: 'plain' },
      10: { h: 22, top: '#8a8a8e', side: '#6a6a70', face: 'none', roof: 'plain' },
      20: carType('#3a5a9a'), 21: carType('#d8d8d0'), 22: carType('#26262a'), 23: carType('#9a2a2a'), 24: carType('#3a6a4a'), 25: carType(UNMARKED)
    },
    floorTex: (x, y, tag) => streetFloor(x, y, tag), outside: '#2a2a2e', ao: 5
  });
  const C = (cx, cy) => ({ x: cx * T, y: cy * T });
  const SPOT = {
    kev: C(26.3, 19.2), tater: C(30.5, 21.2), stash: C(35, 12.5), trash: C(19.4, 19.6), smokeIn: C(46, 18.7), smokeAt: C(27.6, 19.0),
    carExit: C(12, 18.7), projDoor: C(29.5, 22.4), courts: C(36, 29.2), sweetsA: C(8, 5), sweetsB: C(15, 26)
  };
  const UCAR = CARS.find(c => c.unmarked); UCAR.ex = SPOT.carExit.x; UCAR.ey = SPOT.carExit.y;
  const LAMPS = [[3, 12.3], [11, 12.3], [17, 12.3], [29, 12.3], [37, 12.3], [45, 12.3], [3, 19.7], [11, 19.7], [28, 19.7], [36, 19.7], [44, 19.7], [19.3, 6], [26.7, 27], [19.3, 27], [26.7, 6]].map(([x, y]) => [x * T, y * T]);
  const PROPS = [
    ['trashcan', 19.4, 19.6], ['trashcan', 2.5, 12.6], ['trashcan', 39, 12.6], ['hydrant', 20.4, 13.6], ['hydrant', 25.6, 18.4], ['hydrant', 9, 19.4],
    ['firedrum', 43.5, 7.5, true], ['crate', 42, 5.5], ['crate', 45, 9.5], ['sign', 13.5, 19.5], ['trashcan', 31.5, 22.4], ['barrel', 2, 26.5], ['trashcan', 16, 25.4]
  ];
  let dets, watchers, kev, tater, smoke, sweets, fiends, clock, shut, served, smokeT, smokeVisits, burnerState, talk, notebook, done, over, nextFiend, fiendN, alertT, ended, hubT, ghosts, stashKnown, aiT;
  const OBJ = () => [
    { t: 'Photograph 3 hand-to-hands', n: Math.min(3, h2hCount()), of: 3 },
    { t: stashKnown ? 'Photograph the re-up at the red-door vacant' : 'Find the stash house', n: CASE.has('stash') ? 1 : 0, of: 1 },
    { t: 'Catch the lieutenant on a pickup', n: CASE.has('smoke') ? 1 : 0, of: 1 },
    { t: 'Recover the dumped burner', n: CASE.burner ? 1 : 0, of: 1 }
  ];
  const h2hCount = () => CASE.photos.filter(p => p.id.startsWith('h2h')).length;
  const allDone = () => OBJ().every(o => o.n >= o.of);

  /* ---- the crew's day: fiends come to Kev with money, Kev sends them to Tater, Tater serves and re-ups ---- */
  function spawnFiend() {
    const i = fiendN++, starts = [C(1.5, 15.5), C(46, 18.6), C(36, 29.2), C(22.5, 32)], exits = [C(1.5, 16.5), C(46, 18.6), C(36, 29.2), C(22.5, 32.5)];
    const from = starts[i % 4], out = exits[(i + 1) % 4], via = [null, null, C(36, 21.4), C(23, 21)][i % 4], viaOut = [null, null, C(36, 21.4), C(23, 21)][(i + 1) % 4];
    const f = new Walker(from.x, from.y, fiendRig(i), { speed: 30 + (i % 3) * 4, who: 'CALLER' });
    f.id = i; f.stage = 'toKev';
    f.queue = [
      ...(via ? [{ x: via.x, y: via.y, wait: 0 }] : []),
      { x: SPOT.kev.x + 10, y: SPOT.kev.y + 4, wait: 0 },
      { fn: w => { w.stage = 'pay'; w.face(kev.x, kev.y); kev.face(w.x, w.y); w.wait = 2.6; bark('KEV', kev.body, E.pick(["Yo, what you need?", "Talk to my man in the yard.", "Two? Aight. Go 'head.", "Don't be counting it out here."])); A.sfx('coin', { vol: .3 }); } },
      { fn: w => { w.stage = 'toTater'; } },
      { x: SPOT.tater.x + 9, y: SPOT.tater.y + 3, wait: 0 },
      { fn: w => { w.stage = 'serve'; w.face(tater.x, tater.y); tater.face(w.x, w.y); w.wait = 2.4; bark('TATER', tater.body, E.pick(["Here. Keep it moving.", "Red tops. Go.", "You ain't get it from me."])); served++; } },
      { fn: w => { w.stage = 'leave'; } },
      ...(viaOut ? [{ x: viaOut.x, y: viaOut.y, wait: 0 }] : []),
      { x: out.x, y: out.y, wait: 0 },
      { fn: w => { w.stage = 'gone'; } }
    ];
    fiends.push(f);
  }
  /* a subject is a moment worth a photograph: who must be in frame, while it lasts */
  function subjects() {
    const list = [];
    if (h2hCount() < 3 && !shut) for (const f of fiends) {
      if (f.stage === 'pay' && f.wait > 0) list.push({ id: 'h2h-pay-' + f.id, label: 'Hand-to-hand: Kev takes the money', note: 'Lil\' Kev handles the cash on the corner, never the product.', pts: () => [f, kev], rigs: () => [kev.rig, f.rig], active: () => f.stage === 'pay' && f.wait > 0 && !shut });
      if (f.stage === 'serve' && f.wait > 0) list.push({ id: 'h2h-serve-' + f.id, label: 'Hand-to-hand: Tater serves', note: 'Tater (orange cap) serves out of the courtyard.', pts: () => [f, tater], rigs: () => [tater.rig, f.rig], active: () => f.stage === 'serve' && f.wait > 0 && !shut });
    }
    if (tater.reup) list.push({ id: 'stash', label: 'Stash house: Tater re-ups at the red-door vacant', note: 'The vacant with the red door on Monroe holds the package.', pts: () => [tater], rigs: () => [tater.rig], active: () => !!tater.reup });
    if (smoke.collecting) list.push({ id: 'smoke', label: 'Smoke collects the count from Kev', note: 'Smoke runs the corner for Pryor. Picks up the money twice a day.', pts: () => [smoke, kev], rigs: () => [smoke.rig, kev.rig], active: () => !!smoke.collecting, onShot: () => { if (!HUB) bark('SMOKE', smoke.body, 'Something wrong with your eyes, Kev?'); } });
    list.push({ id: 'lookout', label: 'The lookout on Monroe', note: 'A kid, twelve maybe. Paid to yell.', pts: () => [watchers[0]], rigs: () => [watchers[0].rig], active: () => true, optional: true });
    return list;
  }
  function crewUpdate(dt) {
    if (shut > 0) {
      shut -= dt;
      if (shut <= 0) { kev.hidden = tater.hidden = false; kev.go([SPOT.kev.x, SPOT.kev.y]); tater.go([SPOT.tater.x, SPOT.tater.y]); toast('THE CORNER IS BACK UP', 'They always come back', '#f0c060'); }
      return;
    }
    nextFiend -= dt;
    if (nextFiend <= 0 && fiends.length < 4) { spawnFiend(); nextFiend = 9 + Math.random() * 5; }
    // Tater re-ups at the stash every few serves
    if (served >= 2 && tater.idle && !tater.reup && !tater.going) {
      served = 0; tater.going = true;
      tater.go([30.5 * T, 18.6 * T], [31 * T, 13.2 * T], [SPOT.stash.x, SPOT.stash.y]);
      tater.queue.push({ fn: w => { w.reup = true; w.face(SPOT.stash.x, SPOT.stash.y - 10); w.wait = 4.5; A.sfx('door2', { vol: .4 }); } }, { fn: w => { w.reup = false; } },
        { x: 31 * T, y: 13.2 * T, wait: 0 }, { x: 30.5 * T, y: 18.6 * T, wait: 0 }, { x: SPOT.tater.x, y: SPOT.tater.y, wait: 0 }, { fn: w => { w.going = false; w.facing = Math.PI; } });
    }
    // Smoke's pickups
    smokeT -= dt;
    if (smokeT <= 0 && smoke.idle && smoke.hidden) {
      smokeVisits++; smoke.hidden = false; smoke.body.x = SPOT.smokeIn.x; smoke.body.y = SPOT.smokeIn.y; smoke.mind.reset();
      smoke.go([SPOT.smokeAt.x, SPOT.smokeAt.y]).then(w => { w.collecting = true; w.face(kev.x, kev.y); kev.face(w.x, w.y); w.wait = 8; bark('SMOKE', w.body, E.pick(["Count right?", "Where the rest of it?", "Short again and it's your ass."])); game.after(2.6, () => bark('KEV', kev.body, "It's all there. Every dollar.")); })
        .then(w => { w.collecting = false; if (!CASE.burner && burnerState === 0) { bark('SMOKE', w.body, 'And dump that phone. New ones tomorrow.'); burnerState = 1; } })
        .then(w => { w.go([SPOT.smokeIn.x, SPOT.smokeIn.y]).then(z => { z.hidden = true; smokeT = 62; }); });
    }
    // Kev dumps the burner in the store's trash can, then goes back to work
    if (burnerState === 1 && kev.idle) {
      burnerState = 2;
      kev.go([25.4 * T, 19.6 * T], [20.6 * T, 19.7 * T], [SPOT.trash.x + 6, SPOT.trash.y]).then(w => { w.face(SPOT.trash.x, SPOT.trash.y); w.wait = 1.4; A.sfx('bump', { vol: .5 }); burnerState = 3; toast('KEV DUMPED SOMETHING', 'In the trash can by the store', '#f0c060', 3); })
        .then(w => { w.go([20.6 * T, 19.7 * T], [25.4 * T, 19.6 * T], [SPOT.kev.x, SPOT.kev.y]).then(z => { z.facing = Math.PI * .75; }); });
    }
    if (kev.idle && burnerState !== 2 && !kev.walking) kev.facing = E.approachAng(kev.facing, Math.PI * .8 + Math.sin(clock * .3) * .7, dt);
  }
  /* "FIVE-OH!": the corner shuts down, the crew melt into the courts, heat rises */
  function fiveOh(w) {
    if (shut > 0 || ended) return;
    CASE.heat++; shut = 20; alertT = 3;
    bark('LOOKOUT', w.body, E.pick(['FIVE-OH! FIVE-OH!', 'Yo, KNOCKS! Knocks on the block!', 'HUMMERS! Hummers, yo!']), 3);
    A.sfx('whistle'); A.sfx('fiveoh'); game.shake(2);
    toast('YOU GOT MADE', CASE.heat >= 3 ? 'The detail is burned' : 'Heat ' + CASE.heat + ' of 3: the corner shuts down', '#ff5a4a', 3.5);
    for (const f of fiends) { f.queue = []; f.target = null; f.stage = 'leave'; f.go([1.5 * T, 16 * T]).then(z => { z.stage = 'gone'; }); f.speed = 50; }
    kev.queue = []; tater.queue = []; tater.reup = false; tater.going = false;
    kev.go([SPOT.projDoor.x, SPOT.projDoor.y]).then(z => { z.hidden = true; }); tater.go([SPOT.projDoor.x, SPOT.projDoor.y]).then(z => { z.hidden = true; });
    if (burnerState === 2) burnerState = 1;
    watchers.forEach(x => x.mind.reset());
    if (CASE.heat >= 3) { over = true; game.after(2.5, () => game.go('burned', { from: 'corner', why: 'Three times made on Monroe. The corner moved six blocks over and changed phones. The case is cold.' })); }
  }

  /* ---- interactions ---- */
  function interactables(d) {
    const list = [], h = d.hero;
    if (!d.inCar && Math.hypot(h.x - (UCAR.x0 + UCAR.x1) / 2, h.y - (UCAR.y1 + 4)) < 22) list.push({ label: 'Get in the car', act: () => { d.inCar = true; d.car = UCAR; d.crouch = false; A.sfx('door2'); if (allDone() && !HUB) finish(); else if (allDone() && HUB) hubFinish(); } });
    if (!d.inCar && burnerState === 3 && !CASE.burner && Math.hypot(h.x - SPOT.trash.x, h.y - SPOT.trash.y) < 18) list.push({ label: 'Search the trash', act: () => searchTrash(d) });
    if (!d.inCar && !sweets.hidden && Math.hypot(h.x - sweets.x, h.y - sweets.y) < 20 && !HUB) list.push({ label: 'Talk to Sweets', act: () => talkSweets() });
    return list;
  }
  function searchTrash(d) {
    d.searching = true; A.sfx('tape');
    game.after(1.6, () => { d.searching = false; if (ended || over) return; CASE.burner = true; A.sfx('key'); toast('BURNER RECOVERED', 'A prepaid flip phone. The wire room will want the number.', '#9ae89a', 4); CASE.add({ id: 'burner', label: 'Burner phone (dumped by Kev)', note: 'Prepaid. The number gets us a wire on the next one.', rigs: () => [], time: HOURS(clock), chapter: 1 }); });
  }
  function talkSweets() {
    sweets.queue = []; sweets.target = null; sweets.face(dets[0].x, dets[0].y);
    if (CASE.sweets) { scene(talk, [['SWEETS', "Already told you what I know, Detective. Don't be standing with me out here, people talk."]]); return; }
    scene(talk, [
      ['SWEETS', "Detective Dee. Look at you. You buying a t-shirt? Three for ten, they clean. Mostly."],
      ['DEE', "I'm buying what you saw, Sweets."],
      ['SWEETS', "What I saw cost more than a t-shirt. I got a habit and a cousin owe me money, and the cousin ain't paying."]
    ], () => talk.say('Twenty for what you know?', { name: 'DET. DEE OKAFOR', portrait: CAST.DEE.rig, choices: ['Here, twenty.', 'Not today.'], onChoice: (i) => {
      if (i === 0) {
        CASE.cash -= 20; CASE.sweets = true; stashKnown = true; A.sfx('coin');
        scene(talk, [
          ['SWEETS', "The boy in the orange cap, Tater. He ain't keep it on him. He go up to the vacant with the red door on Monroe, every couple sales."],
          ['SWEETS', "And they change phones like drawers. Kev throw his in the can by the store when the bald one tell him. Smoke. Don't say my name around Smoke."],
          ['DEE', "I don't even know your name, Sweets."], ['SWEETS', "That's right. That's exactly right."]
        ], () => toast('TIP', 'Stash: the red-door vacant. Burners go in the store trash.', '#9ae89a', 4));
      } else scene(talk, [['SWEETS', "Then I ain't seen nothing but the weather. It's gonna rain."]]);
    } }));
  }

  /* ---- start, end ---- */
  function enter(data) {
    data = data || {};
    if (!data.keepCase && !HUB) { CASE.photos = CASE.photos.filter(p => p.chapter !== 1); CASE.burner = false; CASE.heat = 0; CASE.sweets = false; }
    if (HUB) CASE.reset();
    clock = 0; shut = 0; served = 0; smokeT = HUB ? 40 : 55; smokeVisits = 0; burnerState = 0; done = false; over = false; ended = false; nextFiend = .5; fiendN = 1; alertT = 0; stashKnown = CASE.sweets; aiT = 0;
    TOASTS.length = 0; BUBBLES.length = 0; fiends = []; ghosts = new Map(); notebook = false;
    talk = talk || makeTalk();
    kev = new Watcher(SPOT.kev.x, SPOT.kev.y, CAST.KEV.rig, { who: 'KEV', range: 64, fov: 1.2, rise: .9 }); kev.facing = Math.PI * .8;
    tater = new Walker(SPOT.tater.x, SPOT.tater.y, CAST.TATER.rig, { who: 'TATER', speed: 36 }); tater.facing = Math.PI;
    smoke = new Watcher(SPOT.smokeIn.x, SPOT.smokeIn.y, CAST.SMOKE.rig, { who: 'SMOKE', range: 90, fov: 1.3, rise: 1.4, speed: 30 }); smoke.hidden = true;
    sweets = new Walker(SPOT.sweetsA.x, SPOT.sweetsA.y, CAST.SWEETS.rig, { who: 'SWEETS', speed: 18 });
    watchers = [
      new Watcher(20 * T, 12.6 * T, CAST.LOOKOUT.rig, { who: 'LOOKOUT', scan: [Math.PI * .5, Math.PI * .1, Math.PI * .85, -Math.PI * .1], range: 120 }),
      new Watcher(37.5 * T, 19.2 * T, CAST.LOOKOUT2.rig, { who: 'LOOKOUT', scan: [Math.PI, Math.PI * 1.35, Math.PI * .7, -Math.PI * .5], range: 120 }),
      kev, smoke
    ];
    const p1 = new Detective(SPOT.carExit.x, SPOT.carExit.y, 'DEE', game.input, { inCar: !HUB, car: UCAR, facing: 0, color: '#f0c060' });
    if (HUB) { p1.inCar = false; p1.hero.x = SPOT.carExit.x; p1.hero.y = SPOT.carExit.y; }
    dets = [p1];
    if (data.attract) { p1.ai = { move: [0, 0], down: {}, pressed: {} }; p1.ghost = true; }
    game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -6];
    L.enabled = true; L.ambient = .78;
    game.weather = null;
    music('corner'); A.layer('heat', 0, .02); A.layer('alarm', 0, .02);
    if (!HUB && !data.attract) game.allowJoin({ max: 2, onJoin: (inp) => { const d = new Detective(p1.x + 12, p1.y + 6, 'BRANDT', inp, { color: '#7ac0ff' }); d.inCar = false; dets.push(d); toast('DET. BRANDT JOINS', 'Player 2 is on the block', '#7ac0ff'); } });
    if (!HUB && !data.attract && !data.skipBrief) {
      scene(talk, [
        ['HASKINS', "Monroe and Fulton. Pryor's people have had that corner since the towers came down. Twenty-four hours, rain or shine, like the post office."],
        ['HASKINS', "I don't want bodies, I want pictures. Hand-to-hands, where they keep the package, who picks up the money. And a phone number, Okafor. Without a number there is no wire."],
        ['PELL', "Kids on the stoops are lookouts. They see a camera, they yell, the corner folds up like a lawn chair and comes back in an hour. Do that three times, they move, and we start from nothing."],
        ['DEE', "So don't get made."], ['PELL', "So don't get made. Sit in the car, use the long lens. Get out when you have to. Crouch behind something when you do."]
      ], () => toast('CHAPTER 1: THE CORNER', 'Monroe & Fulton, West Baltimore', '#f0c060', 4));
    }
    if (HUB) toast('THE CORNER', 'Most evidence before time wins', '#f0c060', 4);
  }
  function finish() {
    if (ended) return; ended = true;
    CASE.chapter = Math.max(CASE.chapter, 1);
    scene(talk, [
      ['DEE', "Three hand-to-hands, the stash, Smoke on the count, and a burner with a number still in it."],
      ['BRANDT', "Lieutenant's gonna kiss you on the mouth."],
      ['DEE', "Lieutenant's gonna ask the judge for a wire, and the judge is gonna ask for more. It's always more."]
    ], () => game.go('chapter', { n: 2 }));
  }
  function hubFinish() { if (ended) return; ended = true; hubScore(true); toast('ROUND DONE', 'All the evidence is in. Wait for the others.', '#9ae89a', 6); }
  const hubPoints = () => CASE.photos.length * 100 + (CASE.burner ? 150 : 0) - CASE.heat * 60 + (ended ? Math.max(0, Math.round(300 - clock)) : 0);
  function hubScore(final) {
    if (!HUB || !HUBSTATE.on) return;
    const s = Math.max(0, hubPoints());
    if (final && !CASE.hubDone) { CASE.hubDone = true; AIHub.result({ score: s, stats: { Photos: CASE.photos.length, Heat: CASE.heat, Burner: CASE.burner ? 'yes' : 'no' } }); }
    else AIHub.progress({ score: s, label: CASE.photos.length + ' photos, heat ' + CASE.heat });
  }

  /* ---- the attract mode's detective: no one sees it; it walks to vantage points and shoots what happens ---- */
  const AI_PATH = [[12, 18.8], [17, 18.8], [27.5, 17.6], [33.5, 18.6], [34, 13.3], [27.2, 13.3], [20.6, 19.5], [33, 19.8]];
  function aiDrive(d, dt) {
    aiT += dt; const ai = d.ai; ai.pressed = {}; ai.down = {};
    if (d.inCar) { if (aiT > 2) ai.pressed.interact = true; return; }
    const live = subjects().filter(s => s.active() && !s.optional && !CASE.has(s.id));
    let tgt = null; for (const s of live) { const c = subjectCenter(s); if (Math.hypot(c[0] - d.x, c[1] - d.y) < 140) { tgt = c; break; } }
    if (tgt) { ai.down.aim = true; ai.lens = tgt; ai.move = [0, 0]; if (d.lens.on && Math.hypot(d.lens.x - tgt[0], d.lens.y - tgt[1]) < 6 && Math.floor(aiT * 4) % 6 === 0) ai.pressed.snap = true; return; }
    if (burnerState === 3 && !CASE.burner) { const dx = SPOT.trash.x - d.x, dy = SPOT.trash.y - d.y; if (Math.hypot(dx, dy) < 14) { ai.pressed.interact = true; ai.move = [0, 0]; return; } const n = Math.hypot(dx, dy); ai.move = [dx / n, dy / n]; return; }
    d.aiAt = d.aiAt || 0; const p = AI_PATH[d.aiAt % AI_PATH.length], dx = p[0] * T - d.x, dy = p[1] * T - d.y, n = Math.hypot(dx, dy);
    if (n < 6) { d.aiWait = (d.aiWait || 0) + dt; ai.move = [0, 0]; if (d.aiWait > 4) { d.aiWait = 0; d.aiAt++; } }
    else ai.move = [dx / n, dy / n];
    if (!d.crouch && Math.floor(aiT) % 9 === 3) ai.pressed.crouch = true;
  }

  /* ---- the step ---- */
  function camera() {
    if (dets.length > 1) game.cam.frame(dets.map(d => d.hero), { margin: 50, zoom: [.6, 1] });
    else { const d = dets[0], k = d.lens.k * .55; game.focus(lerp(d.x, d.lens.x, k), lerp(d.y, d.lens.y, k), 10); }
  }
  function update(dt) {
    tickToasts(dt); tickBubbles(dt); camera();
    if (talk.update(dt)) return;
    if (game.input.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (notebook) { if (game.input.pressed('notebook') || game.input.pressed('cancel')) { notebook = false; A.sfx('cancel'); } return; }
    if (game.input.pressed('notebook') && !HUB) { notebook = true; A.sfx('select'); return; }
    if (HUB && !hubRunning()) { for (const d of dets) d.rig.update(dt, d.hero.rigState({})); return; }
    clock += dt; L.ambient = clamp(.78 - clock / 600, .5, .78);
    const ctx = { subjects: subjects(), map, clock, chapter: 1 };
    for (const d of dets) {
      if (d.ai) aiDrive(d, dt);
      const inp = d.inp, pressedI = d.ai ? !!d.ai.pressed.interact : inp.pressed('interact');
      const acts = !over && !ended ? interactables(d) : [];
      d.act = acts[0] || null;
      if (pressedI && d.act && !d.lens.on && !d.inCar) { d.act.act(); if (d.inp) d.inp.consume && d.inp.consume('interact'); continue; }
      d.update(dt, map, ctx);
    }
    // Sweets drifts between the alley and the lot
    if (sweets.idle) { const a = Math.random() < .5 ? SPOT.sweetsA : SPOT.sweetsB; sweets.go([19.6 * T, (a === SPOT.sweetsA ? 5 : 26) * T], [a.x, a.y, 6]); }
    sweets.update(dt, map); tater.update(dt, map);
    for (const f of fiends) f.update(dt, map);
    fiends = fiends.filter(f => f.stage !== 'gone');
    if (!over && !ended) crewUpdate(dt);
    for (const w of watchers) {
      if (w.hidden) { w.rig.update(dt, { x: w.x, y: w.y, z: 0, vx: 0, vy: 0, facing: w.facing }); continue; }
      const st = shut > 0 || over || ended ? 'calm' : w.look(dt, dets, map);
      if (w.mind.changed && st === 'notice') bark(w.who, w.body, E.pick(['Hold up...', 'Who that?', 'Yo. Yo.', 'Huh?']), 1.6);
      if (st === 'alert' && !over) fiveOh(w);
      w.think(dt, map);
    }
    const heat = watchers.some(w => !w.hidden && (w.mind.state === 'search' || w.mind.state === 'alert')) || alertT > 0;
    if (alertT > 0) alertT -= dt;
    if (heat !== crewUpdate.heat) { crewUpdate.heat = heat; A.layer('heat', heat ? 1 : 0, heat ? .3 : 2); A.layer('alarm', heat ? 1 : 0, heat ? .5 : 2); }
    if (HUB) { hubTick(dt); }
  }
  /* ---- AI Hub: a ghost round; each copy sends its detective, shows the others' ---- */
  function hubRunning() { return AIHub.time() >= 0 && !CASE.hubEnded; }
  function hubTick(dt) {
    hubT = (hubT || 0) + dt;
    if (hubT > .12) {
      hubT = 0; const h = dets[0].hero;
      AIHub.send({ t: 'g', area: 'corner', x: Math.round(h.x), y: Math.round(h.y), f: +h.facing.toFixed(2), c: dets[0].crouch ? 1 : 0, l: dets[0].lens.on ? 1 : 0 }, { reliable: false });
    }
    if (Math.floor(clock) !== Math.floor(clock - dt)) hubScore(false);
  }
  function onGhost(data, from) {
    if (!data || data.t !== 'g' || data.area !== 'corner') return;
    let gh = ghosts.get(from);
    if (!gh) { const pl = (AIHub.players || []).find(p => p.id === from) || { name: 'P' + (from + 1), color: '#ffffff' }; gh = { x: data.x, y: data.y, f: 0, name: pl.name, color: pl.color, rig: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: pl.color, coat: '#3a3a40', pants: '#2a2c34' } }), tx: data.x, ty: data.y }; ghosts.set(from, gh); }
    gh.tx = data.x; gh.ty = data.y; gh.f = data.f; gh.c = data.c; gh.l = data.l;
  }
  function tickGhosts(dt) {
    for (const gh of ghosts.values()) { const vx = (gh.tx - gh.x) * 8, vy = (gh.ty - gh.y) * 8; gh.x += vx * dt; gh.y += vy * dt; gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx, vy, facing: gh.f, crouch: !!gh.c, point: !!gh.l }); }
  }

  /* ---- drawing ---- */
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const c of CARS) drawCarTop(r, c);
    for (const [x, y] of LAMPS) r.prop('streetlamp', x, y, 0, { light: true, size: 1.1, halo: clock > 240 });
    for (const [id, x, y, lit] of PROPS) r.prop(id, x * T, y * T, 0, { light: !!lit, size: 1.2 });
    r.prop('awning', 15.5 * T, 19.8 * T, 0, { size: 1.4, color: '#2a6a3a' });
    // marble stoops in front of the rowhouses: Baltimore's white steps
    for (let x = 1.5; x < 18; x += 2) stoop(r, x * T, 12.25 * T);
    for (let x = 27.5; x < 41; x += 2) stoop(r, x * T, 12.25 * T);
    if (stashKnown && !CASE.has('stash')) r.marker(SPOT.stash.x, SPOT.stash.y - 4, 30, { label: 'RED DOOR', color: '#ff7a5a' });
    if (burnerState === 3 && !CASE.burner) r.marker(SPOT.trash.x, SPOT.trash.y, 18, { label: 'TRASH', color: '#9ae89a' });
    if (allDone() && !ended) r.marker((UCAR.x0 + UCAR.x1) / 2, UCAR.y1, 24, { label: HUB ? 'DONE: CAR' : 'BACK TO THE CAR', color: '#80e0ff' });
    if (S.cones) for (const w of watchers) if (!w.hidden && w.scan) r.sightCone(w, { map, range: w.range, fov: w.fov, color: MOOD[w.mind.state], alpha: w.mind.state === 'calm' ? .16 : .32 });
    for (const w of watchers) w.draw(r);
    tater.draw(r); sweets.draw(r); for (const f of fiends) f.draw(r);
    for (const d of dets) d.draw(r);
    if (HUB) { tickGhosts(1 / 60); for (const gh of ghosts.values()) { r.shadow(gh.x, gh.y, 5, .2); r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .5, ghost: false }); } }
    L.add(SPOT.trash.x, SPOT.trash.y, 30, 40, .3, { color: '#f0d0a0' });
    r.overlay(g => {
      for (const gh of ghosts.values()) { const p = r.w(gh.x, gh.y, 48); txt(g, gh.name, p[0], p[1], gh.color, { align: 'center' }); }
      for (const w of watchers) if (!w.hidden && w.mind.state !== 'calm') {
        const p = r.w(w.x, w.y, 46), a = w.mind.state === 'alert';
        txt(g, a ? '!' : '?', p[0], p[1] - 8, MOOD[w.mind.state], { align: 'center', scale: a ? 2 : 1 });
        E.ui.bar(g, Math.round(p[0]) - 7, Math.round(p[1]) + 4, 14, 2, Math.min(1, w.mind.level), MOOD[w.mind.state]);
      }
      drawBubbles(r, g);
      for (const d of dets) d.drawLens(r, g);
      drawViewfinder(g, r.W, r.H, dets[0], clock);
      hudCorner(r, g);
      if (notebook) drawNotebook(g, r.W, r.H, OBJ(), 1);
    });
    talk.draw(r);
  }
  function stoop(r, x, y) { r.queue(x, y + 3, 0, g => { r.box(g, x - 4, y, 0, x + 4, y + 5, 3, '#d8d4cc', '#a8a49c'); r.box(g, x - 4, y, 3, x + 4, y + 2.5, 6, '#e8e4dc', '#b8b4ac'); }, { bias: 1 }); }
  function hudCorner(r, g) {
    const W = r.W, H = r.H, d = dets[0], k = d.lens.k;
    if (talk.open) return;
    if (k < .5) {
      // objectives, top left
      const objs = OBJ(); const w = 168, hgt = 14 + objs.length * 11;
      panel(g, 4, 4, w, hgt, .72);
      txt(g, HUB ? 'THE CORNER  (AI HUB)' : 'CH.1  THE CORNER', 9, 7, '#f0c060');
      objs.forEach((o, i) => { const ok = o.n >= o.of; px.rect(g, 9, 19 + i * 11, 6, 6, ok ? '#9ae89a' : '#4a4a50'); if (ok) px.rect(g, 10, 20 + i * 11, 4, 4, '#1a3a1a');
        txt(g, o.t + (o.of > 1 ? ' ' + o.n + '/' + o.of : ''), 19, 18 + i * 11, ok ? '#8a9a8a' : '#e8e2d0'); });
      // heat and time, top right (left of the corner's buttons)
      const ca = game.cornerArea && game.cornerArea(), cx = (ca && ca.y0 < 40 ? Math.floor(ca.x0) - 4 : W) - 64;
      panel(g, cx - 4, 4, 64, 25, .72);
      txt(g, 'HEAT', cx, 7, '#e8a090');
      for (let i = 0; i < 3; i++) { px.rect(g, cx + 25 + i * 10, 7, 9, 8, '#c8b8a8'); px.rect(g, cx + 26 + i * 10, 8, 7, 6, i < CASE.heat ? '#ff4a3a' : '#2a2020'); }
      txt(g, HOURS(clock), cx, 18, '#c8c8d0');
    }
    drawToasts(g, W, 34);
    // status and prompts, bottom
    if (over || ended || d.ai) return;
    const st = d.inCar ? ['IN THE CAR  •  HIDDEN', '#9ae89a'] : watchers.some(w => !w.hidden && w.spotted === d && w.mind.level > .1) ? ['BEING WATCHED', '#ff9a40'] : d.crouch ? ['CROUCHED', '#c8d0e0'] : ['ON FOOT', '#c8c0b0'];
    txt(g, st[0], 8, H - 14 - (k > .5 ? 18 : 0), st[1]);
    const items = [];
    if (d.lens.on) items.push(['snap', 'Take photo'], ['aim', 'Lower']);
    else {
      items.push(['aim', 'Raise camera']);
      if (d.act) items.push(['interact', d.act.label]);
      else if (d.inCar) items.push(['interact', 'Get out']);
      if (!d.inCar) items.push(['crouch', d.crouch ? 'Stand' : 'Crouch']);
      if (!HUB) items.push(['notebook', 'Notebook']);
    }
    if (!d.ai) promptRow(g, items, W / 2, H - 15 - (k > .5 ? 18 : 0));
    if (dets.length === 1 && !HUB && !d.ai && clock < 30 && Math.floor(clock * 2) % 2 === 0 && !talk.open) txt(g, 'P2: press Start on a second pad to join as Brandt', W - 6, H - 28, '#7ac0ff', { align: 'right' });
  }
  return {
    view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], res: 'ps1', pausable: true, camera: { zoom: [.6, 1.4], start: .8 },
    fiendsDbg: () => fiends.map(f => [f.stage, Math.round(f.x / 16 * 10) / 10, Math.round(f.y / 16 * 10) / 10, f.queue.length]),
    enter, update, draw, onGhost, dropGhost: (id) => ghosts && ghosts.delete(id), talk: () => talk, state: () => ({ clock, shut, heat: CASE.heat, photos: CASE.photos.map(p => p.id), burnerState, fiends: fiends.length, smoke: !smoke.hidden, det: [Math.round(dets[0].x), Math.round(dets[0].y)], inCar: dets[0].inCar }), hubScore, hubPoints, subjects: () => subjects(), dets: () => dets, map,
    exit() { game.allowJoin(false); game.cam.offset = null; game.cam.frame(null); L.enabled = false; for (const p of game.players.slice(1)) game.removePlayer(p); }
  };
})();
