// Trophies (a legend, one named animal, rules of its own), bonus games (30-second galleries on the same land) and the
// Practice Range (seven stations). All are sites: the same camera, world, rifle and shots.
(() => {
const B = BB, def = B.def;

// ---- targets: kinematic actors with parts of their own ----
B.makeTarget = (site, o) => {
  const a = new B.Actor(Object.assign({ cat: 'target', legal: !o.protected, protected: !!o.protected, hp: .1, maxHp: .1 }, o));
  a.vx = o.vx || 0; a.vy = o.vy || 0; a.vz = o.vz || 0; a.life = o.life || 30; a.parts = o.parts(a); a.partsFn = t => t.parts;
  a.step = function (dt, s) {
    this.t += dt;
    if (this.dead) { this.dying += dt; if (this.dying > (this.keep || .05)) this.gone = true; return; }
    if (o.step) o.step(this, dt, s);
    else { this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt; this.vz -= (o.g === undefined ? 9.8 : o.g) * dt; this.vx *= 1 - (o.drag || 0) * dt; this.vy *= 1 - (o.drag || 0) * dt; }
    if (this.t > this.life || (this.ballistic !== false && this.z < s.world.groundAt(this.x, this.y) - .3)) { this.gone = true; if (o.onLand) o.onLand(this, s); }
    this.parts = o.parts(this);
  };
  return a;
};

// ======================= TROPHIES =======================
def('trophy', 'iron-rack', { hunt: 'hollow', name: 'OLD IRON RACK', title: 'Old Iron Rack', label: '14-POINT WHITETAIL', site: 'iron-rack', points: 14,
  story: ['Fourteen points, walks in the fog.', 'Been dodgin\' hunters for nine seasons.'], rules: 'Three windows between fog banks. A doe walks in front of him in the last. He ignores calls until the last.' });
def('trophy', 'duke', { hunt: 'bugle', name: 'THE DUKE', title: 'The Duke of Bugle Ridge', label: '7x7 BULL ELK', site: 'duke', points: 14,
  story: ["The Duke don't come out for just anybody.", 'Answer him back. Make him curious.'], rules: 'Each call draws him to the next opening for 4 seconds. A fifth call sends him off.' });
def('trophy', 'big-mo', { hunt: 'muskeg', name: 'BIG MO', title: 'Big Mo', label: '72-INCH BULL MOOSE', site: 'big-mo', points: 12, spread: 72,
  story: ["Big Mo don't run from you.", 'He runs AT you. Hold steady.'], rules: 'He charges the stand. A miss sends him back to charge again, three times. At 15 metres he wins.' });

const trophyAnimal = (S, id, o) => { const T = B.get('trophy', id); const a = B.makeAnimal(S.site, S.species.targets[0], Object.assign({ trophy: id, points: T.points, spread: T.spread, sizeMul: 1.12, colors: o.colors }, o)); a.trophyDef = T; return a; };

def('site', 'iron-rack', {
  hunt: 'hollow', name: 'Fog Glade', vantage: 'fogGlade', time: 45, bucks: 0, trophy: 'iron-rack',
  frame: { bearings: [-36, 36], fov: 26, pitch: 2.5 }, director: [[0, { bearing: -8 }], [2, { bearing: 0, dur: 6 }]],
  fogFn: (t, site) => { const w = site.trophyWindow ? 1 : 0; site.fogMix = B.approach(site.fogMix || 0, w, 1 / 60 * 1.6); return site.fogMix; },
  script: function* (S) {
    const site = S.site; site.fogMix = 0;
    const spots = [[[-20, 74], [-12, 72], [-4, 72]], [[16, 90], [8, 86], [0, 84]], [[-8, 62], [2, 64], [10, 66]]];
    const a = trophyAnimal(S, 'iron-rack', { colors: { coat: '#7a5a3c' } });
    a.path = new B.Path(spots[0].map(p => S.rel(p[0], p[1]))); a.orders = [['hide', 99]]; a.hidden = true; S.place(a);
    a.trophyCall = (an) => { if (site.windowN === 3 && site.trophyWindow) { an.frozen = 1; return true; } B.bus.emit('caption', { who: 'dub', line: "He ain't listenin'. Not yet." }); return false; };
    yield 2; S.say('dub', 'Watch the fog. He only shows when it thins.');
    for (let w = 1; w <= 3; w++) {
      yield 4 + (w === 1 ? 0 : 6);
      if (!a.live) break;
      a.path = new B.Path(spots[w - 1].map(p => S.rel(p[0], p[1]))); a.pathD = 0; const p0 = a.path.at(0); a.x = p0.x; a.y = p0.y; a.heading = a.path.at(0).angle;
      a.hidden = false; a.orders = [['walk', { to: 1 }], ['stand', 99]]; site.trophyWindow = true; site.windowN = w;
      if (w === 1) B.bus.emit('trophySpotted', { a });
      if (w === 3 && S.doe() > 0) S.pattern('cross', { kind: 'doe', path: [[-36, 52], [-12, 56], [8, 58], [36, 54]], gait: 'walk' });
      yield [() => !a.live, 3.5];
      site.trophyWindow = false;
      if (!a.live) break;
      if (!a.flee) { a.hidden = true; a.orders = [['hide', 99]]; }
    }
    if (a.live) { a.flee = true; a.hidden = false; a.orders = [['run', { to: 1 }], ['exit']]; yield [() => !a.live, 3]; if (a.live) a.leave(site); }
    yield 1.5;
  }
});
def('site', 'duke', {
  hunt: 'bugle', name: 'Dark Timber', vantage: 'timber', time: 50, bucks: 0, trophy: 'duke',
  frame: { bearings: [-38, 38], fov: 24, pitch: 1.5 }, director: [[0, { bearing: 10 }], [2, { bearing: 0, dur: 5 }]],
  script: function* (S) {
    const site = S.site, opens = [[-24, 84], [-6, 96], [12, 90], [26, 102]];
    const a = trophyAnimal(S, 'duke', { colors: { coat: '#c09060', mane: '#4a2a18' } });
    a.path = new B.Path([S.rel(-10, 125), S.rel(-10, 126)]); a.orders = [['hide', 999]]; a.hidden = true; S.place(a);
    let called = 0, showing = false, shownAt = -99;
    const showAt = (i) => {
      const [b, d] = opens[i], from = S.rel(b + 4, d + 22), at = S.rel(b, d), back = S.rel(b - 5, d + 24);
      a.path = new B.Path([from, at, back]); a.pathD = 0; a.x = from[0]; a.y = from[1]; a.hidden = false; showing = true; shownAt = site.t;
      a.orders = [['walk', { to: .5 }], ['call', 1.2], ['stand', 2.8], ['walk', { to: 1 }], ['fn', an => { an.hidden = true; showing = false; an.orders = [['hide', 999]]; }]];
      if (i === 1 && S.doe() > 0) S.pattern('cross', { kind: 'cow', path: [[b + 30, d + 8], [b + 6, d - 2], [b - 20, d + 4], [b - 50, d + 14]], gait: 'walk' });
    };
    a.trophyCall = () => {
      called++;
      if (called >= 5) { a.hidden = false; a.flee = true; a.orders = [['run', { to: 1 }], ['exit']]; S.say('dub', "Too much talk. He's gone."); return true; }
      if (!showing) { showAt((called - 1) % 4); if (called === 1) B.bus.emit('trophySpotted', { a }); }
      return true;
    };
    yield 2; S.say('dub', 'Hear him? Give him a call.');
    while (a.live) {
      if (!showing) B.bus.emit('sound', { id: 'bugle', bearing: opens[called % 4][0] + B.fx.range(-6, 6), far: true });
      yield 7;
      if (!called && site.t > 18 && !showing && a.live) { showAt(0); B.bus.emit('trophySpotted', { a }); S.say('dub', 'There! Next time, call him.'); called = 1; }
      if (site.t > 46 && a.live && !a.dead) { a.hidden = false; a.flee = true; a.orders = [['run', { to: 1 }], ['exit']]; yield [() => !a.live, 3]; if (a.live) a.leave(site); }
    }
    yield 1.5;
  }
});
def('site', 'big-mo', {
  hunt: 'muskeg', name: 'The Shore', vantage: 'shore', time: 45, bucks: 0, trophy: 'big-mo',
  frame: { bearings: [-34, 34], fov: 30, pitch: 6 }, director: [[0, { bearing: 0 }]],
  script: function* (S) {
    const site = S.site;
    const a = trophyAnimal(S, 'big-mo', { colors: { coat: '#3e2c20' } });
    a.noSpook = true; a.speeds = [1.5, 4.5, 6.4]; a.temper = 99;
    const start = S.rel(S.rng.range(-14, 14), 110);
    a.path = new B.Path([start, S.rel(0, 111)]); a.orders = [['hide', 999]]; a.hidden = true; S.place(a);
    let charges = 0;
    const charge = () => {
      charges++; const b = S.rng.range(-12, 12), from = S.rel(b, 108);
      a.path = new B.Path([from, S.rel(b * .6, 70), S.rel(b * .25, 35), S.rel(0, 6)]); a.pathD = 0; a.x = from[0]; a.y = from[1]; a.hidden = false; a.flee = false;
      a.orders = [['look', 1.2], ['run', { to: 1 }]]; a.charging = true;
      B.bus.emit('sound', { id: 'moose', far: true });
    };
    S.on('shot', e => {
      if (!a.charging || !a.live || a.dead) return;
      if (e.res.actor === a) { if (!B.ZONE[e.res.zone].lethal) a.speedMul = (a.speedMul || 1) * .75; return; }
      if (charges < 3) { a.charging = false; const back = S.rel(S.rng.range(-20, 20), 115); a.path = new B.Path([[a.x, a.y], back]); a.pathD = 0; a.orders = [['trot', { to: 1 }], ['fn', () => { a.hidden = true; a.orders = [['hide', 999]]; site.reCharge = site.t + 2.5; }]]; B.bus.emit('caption', { who: 'emcee', line: 'MISSED! HE\'S COMIN\' BACK AROUND!' }); }
    });
    yield 2.5; B.bus.emit('trophySpotted', { a }); charge();
    while (a.live && !a.dead) {
      yield 0;
      if (site.reCharge && site.t >= site.reCharge) { site.reCharge = 0; charge(); }
      if (a.charging && Math.hypot(a.x - S.v.x, a.y - S.v.y) < 15) { site.flattened = true; B.bus.emit('flattened', { a }); a.charging = false; a.orders = [['stand', 99]]; yield 2.5; a.leave(site); break; }
      if (site.t > 43) { a.leave(site); break; }
    }
    yield 1.5;
  }
});

// ======================= BONUS GAMES =======================
def('bonus', 'crow', { hunt: 'hollow', name: 'CROW PATROL', title: 'Crow Patrol', host: 'granny', site: 'bonus-crow', tube: 10, rack: .15,
  rules: 'Crows 100. The golden crow 500. Not Hank: -250.', intro: ['Crows ate my sweet corn. Every last ear!', 'Shoot the crows, sugar. Not Hank.'] });
def('bonus', 'saucer', { hunt: 'bugle', name: 'SAUCER SEASON', title: 'Saucer Season', host: 'loretta', site: 'bonus-saucer', tube: 12, rack: .15,
  rules: 'Clays 75. The golden clay 500.', intro: ["Pull!... That's what you say. Then you shoot it.", 'Singles, doubles, crossers. Keep up.'] });
def('bonus', 'snowball', { hunt: 'muskeg', name: 'SNOWBALL STANDOFF', title: 'Snowball Standoff', host: 'earl', site: 'bonus-snowball', tube: 12, rack: .15,
  rules: 'Snowballs in the air 75. Hats 150. The Snowmoose hat 1000.', intro: ['The snowmen are back. They want revenge.', 'Shoot the snowballs before they land. Hats are worth more.'] });

const bird = (S, kind, o) => S.place(B.makeTarget(S.site, Object.assign({ kind, points: o.points, crit: true, ballistic: false, life: 16,
  parts: a => B.critterParts(kind === 'goldcrow' ? 'goldcrow' : 'crow', { x: a.x, y: a.y, z: a.z, heading: a.heading, t: a.t, flap: a.landed ? 0 : 1 }),
  step: (a, dt) => {
    const P = a.path, u = Math.min(1, a.t / a.dur), q = P.at(u * P.length);
    if (a.landed) { a.landT += dt; if (a.landT > 2.2) { a.landed = false; a.t = 0; a.dur = 2.5; const from = [a.x, a.y]; a.path = new B.Path([from, S.rel(S.rng.range(-50, 50), 90)]); a.alt = u2 => 2.6 + u2 * 20; } return; }
    a.x = q.x; a.y = q.y; a.heading = q.angle; a.z = S.site.world.groundAt(a.x, a.y) + a.alt(u);
    if (u >= 1) { if (a.toHank) { a.landed = true; a.landT = 0; a.toHank = false; } else a.gone = true; }
  } }, o)));
def('site', 'bonus-crow', {
  hunt: 'hollow', name: 'Crow Patrol', vantage: 'porch', time: 30, bucks: 0, bonus: 'crow',
  frame: { bearings: [-50, 50], fov: 34, pitch: 6 }, director: [[0, { bearing: 0 }]],
  script: function* (S) {
    const site = S.site, hank = S.rel(0, 26), hz = site.world.groundAt(hank[0], hank[1]);
    const H = S.place(B.makeTarget(site, { kind: 'hank', x: hank[0], y: hank[1], z: hz, heading: S.v.yaw + Math.PI, points: -250, protected: true, ballistic: false, life: 999, keep: 999, parts: a => B.scarecrowParts({ x: a.x, y: a.y, z: a.z, heading: a.heading, t: a.t, bonk: a.bonk || 0 }), step: a => { a.bonk = Math.max(0, (a.bonk || 0) - .02); } }));
    H.reusable = true; site.hank = H;
    yield 1;
    for (let wave = 0; wave < 11; wave++) {
      const n = 2 + (wave % 3), side = S.rng.sign();
      for (let k = 0; k < n; k++) {
        const b0 = S.rng.range(-40, 40), d0 = S.rng.range(36, 70), toH = S.rng.chance(.35);
        const pts = toH ? [S.rel(b0, d0), S.rel(b0 * .5, 40), [hank[0] + .4, hank[1], 0]] : [S.rel(b0, d0), S.rel(b0 + side * 25, d0 - 10), S.rel(b0 + side * 60, d0 + 10)];
        const alt = toH ? (u => Math.sin(u * Math.PI * .5) * 10 * (1 - u) + 2.6 * u + .6) : (u => .5 + Math.sin(u * Math.PI) * S.rng.range(6, 14) + u * 4);
        bird(S, 'crow', { points: 100, path: new B.Path(pts), dur: S.rng.range(2.6, 3.8), alt, toHank: toH, x: pts[0][0], y: pts[0][1], z: 0 });
      }
      if (wave === 6) bird(S, 'goldcrow', { points: 500, path: new B.Path([S.rel(-55, 60), S.rel(0, 34), S.rel(55, 60)]), dur: 3.2, alt: u => 3 + Math.sin(u * Math.PI) * 9, x: 0, y: 0, z: 0 });
      yield 2.4;
    }
    yield () => S.actors.every(a => a.kind === 'hank' || !a.live);
  }
});
def('site', 'bonus-saucer', {
  hunt: 'bugle', name: 'Saucer Season', vantage: 'trap', time: 30, bucks: 0, bonus: 'saucer',
  frame: { bearings: [-55, 55], fov: 36, pitch: -4 }, director: [[0, { bearing: 0 }]],
  script: function* (S) {
    const site = S.site, w = site.world;
    const clay = (from, b, sp, up, gold) => { const a = S.v.yaw - b * B.DEG; const [x, y] = from; S.place(B.makeTarget(site, { kind: gold ? 'goldclay' : 'clay', points: gold ? 500 : 75, x, y, z: w.groundAt(x, y) + 1.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: up, drag: .12, g: 7.5, life: 7, parts: t => B.saucerParts({ x: t.x, y: t.y, z: t.z, gold }) })); B.bus.emit('sound', { id: 'trap' }); };
    const trap = S.rel(0, 16), L = S.rel(-38, 22), R = S.rel(38, 22);
    yield 1.2;
    const plan = [['single', 0], ['single', 1], ['double', 0], ['cross', 0], ['single', 2], ['tower', 0], ['double', 1], ['cross', 1], ['gold', 0], ['double', 2], ['cross', 2], ['tower', 1]];
    for (const [k, v] of plan) {
      S.say('loretta', 'PULL!');
      if (k === 'single') clay(trap, S.rng.range(-25, 25), 22, 10, false);
      if (k === 'double') { clay(trap, -18 - v * 4, 21, 10, false); clay(trap, 16 + v * 4, 23, 9, false); }
      if (k === 'cross') { clay(L, 70, 20, 8, false); clay(R, -70, 20, 8.5, false); }
      if (k === 'tower') { const top = S.rel(v ? 30 : -30, 8); S.place(B.makeTarget(site, { kind: 'clay', points: 75, x: top[0], y: top[1], z: w.groundAt(top[0], top[1]) + 18, vx: Math.cos(S.v.yaw) * 14, vy: Math.sin(S.v.yaw) * 14, vz: 1, g: 5, life: 7, parts: t => B.saucerParts({ x: t.x, y: t.y, z: t.z }) })); }
      if (k === 'gold') clay(trap, 0, 24, 11, true);
      yield 2.35;
    }
    yield () => S.actors.every(a => !a.live);
  }
});
def('site', 'bonus-snowball', {
  hunt: 'muskeg', name: 'Snowball Standoff', vantage: 'fire', time: 30, bucks: 0, bonus: 'snowball',
  frame: { bearings: [-50, 50], fov: 34, pitch: 1 }, director: [[0, { bearing: 0 }]],
  script: function* (S) {
    const site = S.site, w = site.world, spots = [[-20, 26], [10, 30], [30, 24], [-5, 40], [22, 44], [-36, 34]];
    const man = (sp, o = {}) => {
      const [x, y] = S.rel(sp[0], sp[1] + 1.2), z = w.groundAt(x, y);
      return S.place(B.makeTarget(site, Object.assign({ kind: o.big ? 'snowmoose' : 'snowman', points: 0, x, y, z, heading: S.v.yaw + Math.PI, ballistic: false, life: o.big ? 12 : 5.5, zoned: true, hatPts: o.big ? 1000 : 150,
        parts: a => B.snowmanParts({ x: a.x, y: a.y, z: a.z, heading: a.heading, t: a.t, sink: a.sink, big: o.big ? 2.6 : 1, antlers: o.big, hatOff: a.hatOff, goldHat: o.big, throwing: a.throwing, topple: a.topple || 0 }),
        step: (a, dt) => {
          a.sink = a.t < .6 ? (1 - a.t / .6) * 2.2 * (o.big ? 2.6 : 1) : a.t > a.life - .6 ? (a.t - (a.life - .6)) / .6 * 2.2 * (o.big ? 2.6 : 1) : 0;
          a.throwing = a.t > 1 && a.t < 1.4 || a.t > 3 && a.t < 3.4;
          if (!a.thrown1 && a.t > 1.3) { a.thrown1 = true; lob(a); } if (!a.thrown2 && a.t > 3.3 && !o.big) { a.thrown2 = true; lob(a); }
          if (o.big && !a.thrownB && a.t > 2.5) { a.thrownB = true; lob(a); }
          if (a.knock) { a.topple = Math.min(1, (a.topple || 0) + dt * 3); }
        } }, o)));
    };
    const lob = (a) => {
      const L = site.lens, tx = L.x + S.rng.range(-1.5, 1.5), ty = L.y + S.rng.range(-1.5, 1.5), hz = a.z + 1.4 * (a.kind === 'snowmoose' ? 2.6 : 1);
      const T = S.rng.range(1.7, 2.3), vx = (tx - a.x) / T, vy = (ty - a.y) / T, vz = (L.z - .2 - hz + .5 * 9.8 * T * T) / T;
      S.place(B.makeTarget(site, { kind: 'snowball', points: 75, x: a.x, y: a.y, z: hz, vx, vy, vz, life: T + .1, parts: t => B.snowballParts(t),
        onLand: (t) => { if (t.t >= T && Math.hypot(t.x - L.x, t.y - L.y) < 3) B.bus.emit('splat', {}); } }));
    };
    yield 1;
    for (let k = 0; k < 7; k++) { man(spots[k % spots.length]); if (k % 2) man(spots[(k + 3) % spots.length]); yield 2.6; }
    S.say('earl', 'Uh oh. That one ate his vegetables.'); man([0, 52], { big: true });
    yield 3; man(spots[1]); man(spots[4]); yield 3; man(spots[0]); man(spots[2]);
    yield () => S.actors.every(a => !a.live);
  }
});

// ======================= PRACTICE RANGE =======================
const PAPER = { coat: '#e8dcc0', belly: '#e8dcc0', dark: '#c8b898', hoof: '#6a5440', muzzle: '#c8b898', tail: '#e8dcc0', rump: '#e8dcc0', antler: '#8a6a40', eye: '#2a2018' };
const TIN = { coat: '#9aa0a8', belly: '#b8c0c8', dark: '#6a7078', hoof: '#4a5058', muzzle: '#6a7078', tail: '#9aa0a8', rump: '#9aa0a8', antler: '#c8a040', eye: '#1a1a1a' };
def('range', 'stations', { list: [
  { id: 'aim', name: 'AIM AND FIRE', line: 'Three paper bucks. Put a round in each.', goal: 'Hit all three paper bucks', prompt: ['fire'] },
  { id: 'pump', name: 'PUMP', line: 'Pump after every shot. Empty the tube, the pump reloads.', goal: 'Fire, pump, empty the tube and reload', prompt: ['fire', 'pump'] },
  { id: 'place', name: 'SHOT PLACEMENT', line: 'Low behind the front leg. That\'s the heart.', goal: 'Put one in the heart', prompt: ['fire'] },
  { id: 'only', name: 'BUCKS ONLY', line: 'Antlers, you shoot. No antlers, you don\'t.', goal: 'Hit three paper bucks, skip the does', prompt: ['fire'] },
  { id: 'scope', name: 'SCOPE AND BREATH', line: 'Way out yonder. Scope up, hold your breath, squeeze.', goal: 'Scope in, hold breath, hit the far buck', prompt: ['scope', 'breath', 'fire'] },
  { id: 'call', name: 'THE CALL', line: 'He won\'t stop on his own. Give him a call.', goal: 'Call the tin deer to a stop, then hit it', prompt: ['call', 'fire'] },
  { id: 'critters', name: 'CRITTERS', line: 'Tin squirrels are points. Tin skunk is trouble.', goal: 'Hit two tin squirrels, not the skunk', prompt: ['fire'] }
] });
def('site', 'range', {
  hunt: 'range', name: "Uncle Dub's Range", vantage: 'line', time: 600, bucks: 0, range: true,
  frame: { bearings: [-45, 45], fov: 30, pitch: 3 }, director: [[0, { bearing: 0 }]],
  script: function* (S) {
    const site = S.site, st = B.get('range', 'stations').list, R = site.rangeState = { i: 0, done: [], counters: {} };
    const paper = (b, d, sex, o = {}) => { const a = B.makeAnimal(site, sex === 'buck' ? 'buck' : 'doe', { colors: o.colors || PAPER, points: 8, sizeMul: o.size || 1 }); a.path = new B.Path([S.rel(b, d), S.rel(b + (o.dir || 0) * 40, d)]); a.heading = S.v.yaw + Math.PI / 2; a.orders = o.orders || [['stand', 9999]]; a.noSpook = true; a.paper = true; a.fighting = true; S.place(a); a.heading = S.v.yaw + Math.PI / 2 * (o.dir < 0 ? -1 : 1); return a; };
    const C = R.counters, on = (e, f) => S.on(e, f);
    on('shot', e => { C.shots = (C.shots || 0) + 1; const r = e.res; if (r.actor && r.actor.paper) { C.paperHits = (C.paperHits || 0) + 1; if (r.zone === 'heart') C.heart = (C.heart || 0) + 1; } if (e.p.scopeK > .9 && e.p.breathHeld) C.steady = (C.steady || 0) + 1; });
    on('pump', () => { C.pumps = (C.pumps || 0) + 1; }); on('reload', () => { C.reloads = (C.reloads || 0) + 1; }); on('call', () => { C.calls = (C.calls || 0) + 1; });
    const station = function* (i) { R.i = i; R.t0 = site.t; B.bus.emit('station', { i, st: st[i] }); B.bus.emit('caption', { who: 'dub', line: st[i].line }); yield 1; };
    const clear = () => { for (const a of site.herd.list) if (a.live) a.gone = true; };
    // 1. aim and fire
    yield* station(0); const s1 = [paper(-12, 20, 'buck'), paper(0, 21, 'buck'), paper(12, 20, 'buck')];
    yield () => s1.every(a => a.hits.length > 0); R.done.push(0); yield 1; clear();
    // 2. pump
    yield* station(1); C.pumps = 0; C.reloads = 0; paper(0, 25, 'buck', { orders: [['stand', 9999]] }).hp = 999;
    yield () => C.pumps >= 1 && C.reloads >= 1; R.done.push(1); yield .8; clear();
    // 3. shot placement
    yield* station(2); C.heart = 0; const p3 = paper(0, 18, 'buck'); p3.hp = 999;
    yield () => C.heart >= 1; R.done.push(2); yield 1; clear();
    // 4. bucks only: a moving track
    yield* station(3); let bucks = 0; R.doeHit = 0;
    const off = B.bus.on('kill', e => { if (e.a.paper && e.a.legal) bucks++; }), off2 = B.bus.on('doe', e => { if (e.a.paper) { R.doeHit++; B.bus.emit('caption', { who: 'dub', line: 'That one had no antlers. That\'s a doe. Out, in a real hunt.' }); } });
    while (bucks < 3) { for (let k = 0; k < 4 && bucks < 3; k++) { const sex = k % 2 ? 'doe' : 'buck'; paper(-30, 30, sex, { dir: 1, orders: [['walk', { to: 1 }], ['exit']] }); yield 2.2; } yield 1.5; }
    off(); off2(); R.done.push(3); yield 1; clear();
    // 5. scope and breath
    yield* station(4); C.steady = 0; const p5 = paper(0, 150, 'buck', { size: 1.2 }); p5.hp = 999;
    yield () => C.steady >= 1 && p5.hits.length > 0; R.done.push(4); yield 1; clear();
    // 6. the call: a tin deer on a rail
    yield* station(5); let calledStop = false;
    const tin = paper(-40, 42, 'buck', { colors: TIN, dir: 1, orders: [['trot', { to: 1 }], ['exit']] }); tin.paper = true; tin.speeds = [1.4, 4, 6];
    const offc = B.bus.on('call', () => { if (tin.live) { tin.frozen = 2.2; calledStop = true; } });
    while (true) { yield () => !tin.live || tin.dead; if (tin.dead && calledStop) break; if (tin.dead && !calledStop) B.bus.emit('caption', { who: 'dub', line: 'Lucky. Now do it proper: call first.' }); tin.dead = false; tin.gone = false; tin.hp = 1; tin.hits = []; tin.dying = 0; tin.pathD = 0; tin.flee = false; tin.orders = [['trot', { to: 1 }], ['exit']]; tin.entered = false; calledStop = false; yield .5; }
    offc(); R.done.push(5); yield 1; clear();
    // 7. critters: tin squirrels and a tin skunk
    yield* station(6); let sq = 0; const offk = B.bus.on('critter', e => { if (e.a.kind === 'squirrel') sq++; });
    while (sq < 2) {
      S.pattern('critter', { kind: 'squirrel', path: [[-20 + S.rng.range(-10, 10), 22], [-19, 22.2]], orders: [['stand', 3], ['exit']] });
      if (S.rng.chance(.5)) S.pattern('critter', { kind: 'skunk', path: [[14, 20], [14.2, 20.2]], orders: [['stand', 3], ['exit']] });
      yield 3.4;
    }
    offk(); R.done.push(6); yield 1; clear();
    R.finished = true; B.bus.emit('rangeDone', {});
    B.bus.emit('caption', { who: 'dub', line: "You'll do. Go win that Hunt-Off." });
    yield 3;
  }
});
})();
