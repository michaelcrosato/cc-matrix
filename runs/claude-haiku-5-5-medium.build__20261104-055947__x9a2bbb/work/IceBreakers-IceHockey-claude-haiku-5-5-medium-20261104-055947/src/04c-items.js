/* ---- ITEMS AND HAZARDS (plan 7.12, 7.13's greed, 11.2's arena hazards). Fans throw items onto the ice; a skater who
 * reaches one takes its effect. Octopi and rats make slips; the pond's thin ice breaks into holes; the Dome's mascot
 * skates figure eights and can be checked; a crate drops from the ceiling now and then. Everything here is simulation:
 * it draws only from srand(), and what the screen needs is read by the draw code. ---- */
const ITEM = {
  sauce: { name: 'HOT SAUCE', color: '#e8443a' }, tape: { name: "GRANDMA'S TAPE", color: '#f4f4f0' }, poutine: { name: 'POUTINE', color: '#e0b050' },
  lumber: { name: 'LUMBER', color: '#f2c14e' }, pads: { name: 'BRICK PADS', color: '#8a4a30' }, boom: { name: 'BOOM BOX', color: '#3b82f6' },
  cocoa: { name: 'HOT COCOA', color: '#c8502a' }
};
const ARENA_ITEMS = { icebox: ['sauce', 'tape', 'poutine', 'boom'], dome: ['sauce', 'pads', 'boom'], pond: ['cocoa', 'tape', 'lumber', 'boom'], yard: ['poutine', 'lumber', 'boom'], vault: ['poutine', 'pads', 'boom'] };
const THIN_ICE = [[400, 330], [720, 470], [560, 350]];   // (the pond's three patches, outside the creases)
const ITEM_FLIGHT = .9, ITEM_LIFE = 12;

/** the start of a play's items: the next throw, the hazards' clocks, the state of the arena's own things */
function itemsReset() {
  M.items = []; M.slips = []; M.rat = null; M.octoT = 0; M.ratT = 50; M.crate = null; M.crateT = 40; M.hatT = 0;
  M.pads = [0, 0]; M.throwT = 25 + srand() * 20; M.organ = M.arena.id === 'vault';
  M.thin = M.arena.id === 'pond' ? THIN_ICE.map(([x, y]) => ({ x, y, integ: 100, hole: false, holeT: 0, frozen: [] })) : [];
  M.mascot = M.arena.id === 'dome' ? { x: CX, y: CY, down: 0, wave: 0 } : null;
}
/** a fan throws: the item arcs over the glass onto the neutral or attacking zone and slides to a stop */
function throwItem(kind) {
  M.thrown = (M.thrown || 0) + 1;
  const list = ARENA_ITEMS[M.arena.id] || ['boom'];
  const k = kind || list[Math.floor(srand() * list.length)];
  const north = srand() < .5, sx = 300 + srand() * 520, sy = north ? 150 : 650;
  const tx = 300 + srand() * 520, ty = north ? 270 + srand() * 60 : 470 + srand() * 60;
  M.items.push({ kind: k, x0: sx, y0: sy, x1: tx, y1: ty, u: 0, x: sx, y: sy, z: 0, vx: 0, vy: 0, landed: false, life: ITEM_LIFE, t: 0 });
  say(pick(['A FAN THREW A ' + ITEM[k].name + ' ONTO THE ICE!', 'HERE COMES A ' + ITEM[k].name + ' FROM THE STANDS!'], Math.floor(srand() * 2)));
}
/** a skater who reaches an item takes it: each item's effect goes to its holder (and BOOM BOX to the team) */
function takeItem(it, sk) {
  const k = it.kind;
  if (k === 'sauce') sk.sauce = 8;
  else if (k === 'tape') sk.tape = 10;
  else if (k === 'poutine') sk.poutine = 10;
  else if (k === 'lumber') sk.lumber = 3;
  else if (k === 'pads') M.pads[sk.t] = 12;
  else if (k === 'cocoa') { sk.cocoa = 8; sk.stam = 100; }
  else if (k === 'boom') M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 40 * T.boomGain);
  it.taken = true;
  say(sk.name + ' GRABS THE ' + ITEM[k].name + '!');
  fx('hit', sk.x, sk.y);
}
/** a skater's timers: how long each effect lasts (the HUD over the head shows them) */
function effectsStep(sk, dt) {
  sk.sauce = Math.max(0, (sk.sauce || 0) - dt); sk.tape = Math.max(0, (sk.tape || 0) - dt); sk.poutine = Math.max(0, (sk.poutine || 0) - dt);
  sk.cocoa = Math.max(0, (sk.cocoa || 0) - dt);
}
/** the thin ice: a knockdown on a patch costs 50 and a big hit there 100; at 0 the patch is a hole */
function thinIceHit(sk, cost) {
  if (!M.thin || !M.thin.length) return;
  const p = M.thin.find(q => !q.hole && Math.hypot((sk.x - q.x) / 20, (sk.y - q.y) / 12) < 1);
  if (!p) return;
  p.integ -= cost;
  if (p.integ <= 0) { p.hole = true; p.holeT = 0; fx('glass', p.x, p.y); say('THE ICE GIVES WAY! A HOLE IN THE POND!'); }
  else say('THE ICE CRACKS!');
}
const inEllipse = (x, y, p, rx, ry) => Math.hypot((x - p.x) / rx, (y - p.y) / ry) < 1;
/** the step of all of it: throws and pickups, the crate, the octopi and rats, the thin ice, the mascot */
function itemsStep(dt) {
  if (!M.items) itemsReset();
  M.throwT -= dt;
  if (M.throwT <= 0) { throwItem(); M.throwT = 25 + srand() * 20; }
  for (const it of M.items) {
    if (it.taken) continue;
    if (!it.landed) {
      it.t += dt; const u = Math.min(1, it.t / ITEM_FLIGHT);
      it.x = it.x0 + (it.x1 - it.x0) * u; it.y = it.y0 + (it.y1 - it.y0) * u; it.z = 40 * 4 * u * (1 - u);
      if (u >= 1) { it.landed = true; it.z = 0; const a = srand() * TAU; it.vx = Math.cos(a) * 40; it.vy = Math.sin(a) * 40; }
    } else {
      it.vx *= Math.exp(-dt * 3); it.vy *= Math.exp(-dt * 3); it.x += it.vx * dt; it.y += it.vy * dt; it.life -= dt;
      for (const sk of M.skaters) if (live(sk) && sk.state !== 'bin' && Math.hypot(sk.x - it.x, sk.y - it.y) < 12) { takeItem(it, sk); break; }
    }
  }
  M.items = M.items.filter(it => !it.taken && !(it.landed && it.life <= 0));
  // the crate (the Dome's Discount Drop): every 40 s it falls to center ice and breaks into any power-up
  if (M.mascot) {
    M.crateT -= dt;
    if (M.crateT <= 0) { M.crateT = 40; M.crate = { z: 90, t: 0 }; say('THE DISCOUNT DROP IS COMING DOWN!'); }
    if (M.crate) { M.crate.t += dt; M.crate.z = Math.max(0, 90 * (1 - M.crate.t / .9)); if (M.crate.t >= .9) { M.crate = null; M.items.push({ kind: pick(Object.keys(ITEM), Math.floor(srand() * 7)), x0: CX, y0: CY, x1: CX, y1: CY, u: 1, x: CX, y: CY, z: 0, vx: 0, vy: 0, landed: true, life: ITEM_LIFE, t: 1 }); } }
    // the mascot: figure eights in the neutral zone during play, a moving obstacle that can be checked
    // (his figure eights, plus the knock he has taken: a mass of 1.5 slides back to the path)
    const mo = M.mascot;
    mo.kx = mo.kx || 0; mo.kz = mo.kz || 0; mo.kx *= Math.exp(-dt * 2.5); mo.kz *= Math.exp(-dt * 2.5); mo.ox = clamp((mo.ox || 0) + mo.kx * dt, -70, 70); mo.oy = clamp((mo.oy || 0) + mo.kz * dt, -50, 50);
    if (M.phase === 'play') { const tp = M.playT || 0; mo.bx = CX + 150 * Math.sin(tp * .7); mo.by = CY + 70 * Math.sin(tp * 1.4); }
    mo.x = (mo.bx ?? CX) + (mo.ox || 0); mo.y = (mo.by ?? CY) + (mo.oy || 0);
    if (M.mascot.down > 0) M.mascot.down -= dt; else M.mascot.wave += dt;
    for (const sk of M.skaters) {
      if (!live(sk) || sk.state === 'bin') continue;
      const d = Math.hypot(sk.x - M.mascot.x, sk.y - M.mascot.y);
      if (d < 16 && M.mascot.down <= 0 && sk.state === 'check') { M.mascot.down = 3; M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 10 * T.boomGain); M.banner = 'MASCOT DOWN!'; M.bannerT = 2; say('MASCOT DOWN! POLAR PETE IS ON THE ICE!'); fx('hit', M.mascot.x, M.mascot.y); }
      if (d < 14 && M.mascot.down <= 0) { const dx = (sk.x - M.mascot.x) / (d || 1), dy = (sk.y - M.mascot.y) / (d || 1); sk.x = M.mascot.x + dx * 14; sk.y = M.mascot.y + dy * 14; M.mascot.kx = (M.mascot.kx || 0) + dx * sk.vx * .5; M.mascot.kz = (M.mascot.kz || 0) + dy * sk.vy * .5; }
    }
  }
  // the octopus (after a goal in the Lumber Yard) and the rat: slip patches that move or stay until the stoppage
  if (M.arena.id === 'yard') {
    M.ratT -= dt;
    if (M.ratT <= 0 && !M.rat) { M.rat = { x: CX - 200, y: CY, t: 10, a: srand() * TAU }; M.ratT = 50; say('A RUBBER RAT SCURRIES ONTO THE ICE!'); }
    if (M.rat) { M.rat.t -= dt; M.rat.a += (srand() - .5) * 4 * dt; M.rat.x = clamp(M.rat.x + Math.cos(M.rat.a) * 60 * dt, 160, 960); M.rat.y = clamp(M.rat.y + Math.sin(M.rat.a) * 60 * dt, 240, 560); if (M.rat.t <= 0) M.rat = null; }
  }
  // the pond's thin ice: a hole swallows a puck and freezes a skater for three seconds, then refreezes after 30 s
  for (const p of M.thin || []) {
    if (p.hole) {
      p.holeT += dt;
      if (p.holeT >= 30) { p.hole = false; p.integ = 100; p.holeT = 0; }
      if (M.puck.owner === null && M.phase === 'play' && inEllipse(M.puck.x, M.puck.y, p, 20, 12) && M.puck.z < 6) { say('THE PUCK GOES DOWN THE HOLE!'); M.stopTo = nearestFaceoff(M.puck.x, M.puck.y); M.phase = 'stop'; M.timer = 1.2; M.puck.vx = M.puck.vy = 0; }
      for (const sk of M.skaters) if (live(sk) && sk.state !== 'bin' && inEllipse(sk.x, sk.y, p, 20, 12) && sk.state !== 'frozen') { sk.state = 'frozen'; sk.st = 3; sk.vx = sk.vy = 0; }
    }
  }
  if (M.thin) for (const sk of M.skaters) if (sk.state === 'frozen' && sk.st <= 0) { sk.state = 'skate'; const q = M.thin.find(z => z.hole && inEllipse(sk.x, sk.y, z, 20, 12)); if (q) { sk.x = q.x + 24; sk.y = q.y; } }
  // the octopus: a slip patch that slides a skater's legs out from under them
  for (const sl of M.slips || []) if (sl.t !== undefined) { sl.t -= dt; }
  M.slips = (M.slips || []).filter(sl => sl.t === undefined || sl.t > 0);
  for (const sk of M.skaters) {
    if (!live(sk) || sk.state === 'bin' || sk.state === 'slip' || sk.state === 'frozen' || sk.state === 'buried') continue;
    const onSlip = (M.slips || []).some(sl => Math.hypot(sk.x - sl.x, sk.y - sl.y) < sl.r) || (M.rat && Math.hypot(sk.x - M.rat.x, sk.y - M.rat.y) < 9);
    if (onSlip) { sk.state = 'slip'; sk.st = 1.2; fx('thump'); say(pick(['SLIPPED ON THE OCTOPUS!', 'WHAT A SLIP!'], 0)); }
  }
  for (const sk of M.skaters) if (sk.state === 'slip' || sk.state === 'buried' || sk.state === 'frozen') { if (sk.state === 'buried' && sk.st <= 0) sk.state = 'skate'; }
  // the hat trick: the third goal by one player makes the stands throw hats
  M.hatT = Math.max(0, M.hatT - dt);
}
/** the mascot is drawn, the items on the ice, the patches, the holes, the octopus and the rat, and the timers over heads */
function drawItems(r, view) {
  if (!M.items) return;
  for (const it of M.items) {
    const c = ITEM[it.kind].color, blink = it.landed && it.life < 3 && Math.floor(it.life * 6) % 2 === 0;
    if (blink) continue;
    r.shadow(it.x, it.y, 4, .3);
    r.queue(it.x, it.y, it.z + 3, g => { const [x, y] = r.w(it.x, it.y, it.z + 3); px.rect(g, Math.round(x) - 3, Math.round(y) - 3, 6, 6, c); px.rect(g, Math.round(x) - 1, Math.round(y) - 1, 2, 2, '#ffffff'); }, { emissive: true });
  }
  for (const sl of M.slips || []) r.queue(sl.x, sl.y, 0, g => drawPatch(g, r, sl.x, sl.y, sl.r, sl.r * .6, '#8a4aa8', '#c8a0e8'));
  if (M.rat) r.queue(M.rat.x, M.rat.y, 0, g => drawPatch(g, r, M.rat.x, M.rat.y, 8, 5, '#6a4a2a', '#b89070'));
  for (const p of M.thin || []) r.queue(p.x, p.y, 0, g => drawPatch(g, r, p.x, p.y, 20, 12, p.hole ? '#0a1a2a' : (p.integ < 100 ? '#c0dcec' : '#e8f4fc'), p.hole ? '#2a6a9a' : '#9ab8cc'));
  if (M.mascot) {
    if (!M.mascotRig) M.mascotRig = new E.Humanoid({ size: 1.3, build: 'bulky', hat: { style: 'pointed', color: '#e8443a' }, colors: { cloth: '#e8443a', pants: '#2a2a2a', trim: '#f4f4f0', boot: '#1a1a1a', hair: '#e8443a', skin: '#c89070', belt: '#f2c14e' }, speedRef: 80 });
    const mo = M.mascot;
    r.shadow(mo.x, mo.y, 7, .35);
    r.actor(mo.x, mo.y, 0, (g, ox, oy) => M.mascotRig.draw(g, ox, oy, view));
    M.mascotRig.update(1 / 60, { x: mo.x, y: mo.y, z: 0, vx: 0, vy: 0, facing: 0, down: mo.down > 0, pose: mo.down > 0 ? null : (mo.wave % 2 < 1 ? 'wave' : null) });
  }
  if (M.crate) r.queue(CX, CY, M.crate.z + 6, g => { const [x, y] = r.w(CX, CY, M.crate.z + 6); px.rect(g, Math.round(x) - 5, Math.round(y) - 5, 10, 10, '#c8a060'); px.rect(g, Math.round(x) - 4, Math.round(y) - 4, 8, 2, '#6a4a2a'); });
  for (const sk of M.skaters) if (sk.sauce > 0 && M.tick % 8 === 0) P.sparks(sk.x, sk.y, 2, 3, null, { color: '#ff5a2a', speed: 18 });   // (HOT SAUCE's fire trail)
  for (const sk of M.skaters) {
    const tags = [];
    if (sk.sauce > 0) tags.push(['SAUCE ' + Math.ceil(sk.sauce), ITEM.sauce.color]);
    if (sk.tape > 0) tags.push(['TAPE ' + Math.ceil(sk.tape), '#f4f4f0']);
    if (sk.poutine > 0) tags.push(['POUTINE ' + Math.ceil(sk.poutine), ITEM.poutine.color]);
    if (sk.lumber > 0) tags.push(['LUMBER x' + sk.lumber, ITEM.lumber.color]);
    if (sk.cocoa > 0) tags.push(['COCOA ' + Math.ceil(sk.cocoa), ITEM.cocoa.color]);
    tags.forEach(([s, col], i) => r.textAt(sk.x, sk.y, 34 + i * 5, s, col, { align: 'center' }));
  }
  if (M.pads) for (let t = 0; t < 2; t++) if (M.pads[t] > 0) r.textAt(GX[t], CY, 26, 'BRICK PADS ' + Math.ceil(M.pads[t]), ITEM.pads.color, { align: 'center' });
}
/** a patch on the ice: a filled ellipse with a rim, drawn in screen pixels through the view */
function drawPatch(g, r, x, y, rx, ry, fill, rim) {
  const [cx, cy] = r.w(x, y, 0);
  for (let dy = -ry; dy <= ry; dy += 1) for (let dx = -rx; dx <= rx; dx += 1) {
    const e = Math.hypot(dx / rx, dy / ry);
    if (e > 1) continue;
    const [sx, sy] = r.w(x + dx, y + dy, 0);
    px.rect(g, Math.round(sx), Math.round(sy), 1, 1, e > .85 ? rim : fill);
  }
}

/* ---- THE FLOOD WAGON (the intermission minigame): a resurfacer drives the rink's lap and clears the ice it passes.
 * Steer left and right; it drives itself. Clean ice is a percent; 90 percent or more is a perfect resurfacing (BOOM +30).
 * The skip (Back) runs the AI driver's lap, which is never perfect. ---- */
const FLOOD = { cols: 36, rows: 16, time: 55, perfect: 90, speed: 130, clear: 46 };
function floodStart() {
  const C = FLOOD.cols, R = FLOOD.rows;
  const cells = [];
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
    const x = 128 + (i + .5) * (864 / C), y = 208 + (j + .5) * (384 / R);
    cells.push({ x, y, ice: sdRect(x, y) < -8, clean: false });
  }
  flood = { cells, total: cells.filter(c => c.ice).length, clean: 0, x: 200, y: CY, a: 0, t: 0, done: false, skipped: false, res: null, back: 0, auto: false };
}
let flood = null;
function floodTick(dt, input) {
  const f = flood; if (!f || f.done) return;
  f.t += dt;
  // (the AI driver runs the lanes; the player steers, or the AI drives for a skip)
  const steer = f.auto ? floodLaneSteer(f) : (input && input.move ? input.move()[0] : 0) * 2.6;
  f.a += steer * dt;
  f.x += Math.cos(f.a) * FLOOD.speed * dt; f.y += Math.sin(f.a) * FLOOD.speed * dt;
  if (f.y < 226 || f.y > 574) f.a = Math.atan2(CY - f.y, CX - f.x) + (f.y < 400 ? .3 : -.3) * 0;   // (the boards turn it back toward the middle)
  if (f.x < 146 || f.x > 974) f.a = Math.atan2(CY - f.y, CX - f.x) * .6 + f.a * .4;
  f.x = clamp(f.x, 140, 980); f.y = clamp(f.y, 220, 580);
  for (const c of f.cells) if (!c.clean && c.ice && Math.hypot(c.x - f.x, c.y - f.y) < FLOOD.clear) { c.clean = true; f.clean++; }
  if (f.t >= FLOOD.time) floodEnd(false);
}
/** the AI driver: the lanes, one after another, across the whole rink */
const FLOOD_LANES = [236, 300, 364, 428, 492, 556].flatMap((y, i) => (i % 2 ? [[150, y], [970, y]] : [[970, y], [150, y]]));
function floodLaneSteer(f) {
  const [wx, wy] = FLOOD_LANES[Math.min(f.lane || 0, FLOOD_LANES.length - 1)];
  if (Math.hypot(wx - f.x, wy - f.y) < 30 && (f.lane || 0) < FLOOD_LANES.length - 1) f.lane = (f.lane || 0) + 1;
  const [tx, ty] = FLOOD_LANES[Math.min(f.lane || 0, FLOOD_LANES.length - 1)];
  let da = Math.atan2(ty - f.y, tx - f.x) - f.a;
  while (da > PI) da -= TAU;
  while (da < -PI) da += TAU;
  return clamp(da * 1.5, -1, 1) * 2.6;
}
/** the lap's end: a skip hands the wagon to the AI for its last six seconds; a declined lap is no resurfacing */
function floodEnd(skip) {
  const f = flood; if (!f || f.done) return;
  if (skip && !f.auto) { f.auto = true; f.skipped = true; f.t = Math.max(f.t, FLOOD.time - 6); return; }
  f.done = true;
  const pct = Math.round(f.clean / f.total * 100);
  f.res = { pct, perfect: !f.skipped && pct >= FLOOD.perfect };
}
/** the scene: the match is paused; the resurfacing shows over the rink in the overhead, and the result goes to the match */
scenes.flood = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { floodStart(); flood.asking = game.settings.flood !== 'Always'; A.music('title'); },
  update(dt) {
    const I = game.input;
    if (flood && flood.asking) { if (I.pressed('confirm')) { I.consumeAll(); flood.asking = false; } else if (I.pressed('cancel')) { I.consumeAll(); flood.skipped = true; floodEnd(false); } return; }
    if (flood && flood.res) { flood.back += dt; if (flood.back > 2.2 || I.pressed('confirm')) { I.consumeAll(); floodFinish(); } return; }
    floodTick(dt, I);
    if (I.pressed('cancel') && flood) { I.consumeAll(); floodEnd(true); }
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    const f = flood; if (!f) return;
    r.overlay(g => {
      const W = Math.round(r.W * .7), H = Math.round(W * 384 / 864), X0 = Math.round((r.W - W) / 2), Y0 = Math.round(r.H * .3), cw = W / FLOOD.cols, ch = H / FLOOD.rows;
      E.ui.box(g, X0 - 8, Y0 - 30, W + 16, H + 60, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.title(g, 'THE FLOOD WAGON', r.W / 2, Math.round(r.H * .07), { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      for (const c of f.cells) { if (!c.ice) continue; px.rect(g, Math.round(X0 + (c.x - 128) / 864 * W), Math.round(Y0 + (c.y - 208) / 384 * H), Math.ceil(cw), Math.ceil(ch), c.clean ? '#e9f3fb' : '#5a7a98'); }
      const wx = X0 + (f.x - 128) / 864 * W, wy = Y0 + (f.y - 208) / 384 * H;
      px.rect(g, Math.round(wx) - 3, Math.round(wy) - 3, 6, 6, '#e8443a');
      px.line(g, Math.round(wx), Math.round(wy), Math.round(wx + Math.cos(f.a) * 8), Math.round(wy + Math.sin(f.a) * 8), '#ffffff', 1);
      const pct = f.res ? f.res.pct : Math.round(f.clean / f.total * 100);
      E.font.text(g, 'CLEAN ' + pct + '%   TIME ' + Math.max(0, Math.ceil(FLOOD.time - f.t)) + 's   PERFECT AT ' + FLOOD.perfect + '%', r.W / 2, Y0 + H + 14, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      if (f.asking) E.font.text(g, 'PLAY THE FLOOD WAGON?   ' + prompt('confirm', 'YES') + '   ' + prompt('cancel', 'SKIP'), r.W / 2, Y0 + H + 28, '#ffe7a8', { align: 'center', font: 'tiny', outline: '#000' });
      else if (f.res) E.font.text(g, f.res.perfect ? 'PERFECT RESURFACING! +30 BOOM' : (f.skipped ? 'THE AI DRIVER DID ITS LAP' : 'GOOD ENOUGH. THE ICE IS STILL A LITTLE WET.'), r.W / 2, Y0 + H + 28, '#ffe7a8', { align: 'center', font: 'tiny', outline: '#000' });
      else E.font.text(g, prompt('left', 'STEER') + ' / ' + prompt('right', 'STEER') + '   ' + prompt('cancel', 'SKIP (AI DRIVES)'), r.W / 2, Y0 + H + 28, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
/** the lap is done: the perfect resurfacing gives the home side its BOOM, then the match goes on with the next period */
function floodFinish() {
  const res = flood && flood.res;
  if (res && res.perfect && M) { M.boom[0] = Math.min(100, M.boom[0] + 30 * T.boomGain); M.banner = 'PERFECT RESURFACING!'; M.bannerT = 2.5; say('THE FLOOD WAGON LEAVES A MIRROR. THE HOME SIDE GETS A BOOST.'); }
  flood = null;
  game.go('match', { resume: true }, { fade: 'iris' });
}
/** a hat trick: the stands throw hats (cosmetic) and the booth calls it */
function hatTrick(sk) {
  say('HAT TRICK! ' + sk.name + ' HAS THREE! THE HATS COME DOWN!');
  for (let i = 0; i < 3; i++) P.bits(CX + (srand() - .5) * 700, CY + (srand() - .5) * 300, 60, 12, ['#e8443a', '#3b82f6', '#f2c14e', '#f4f4f0']);
  M.hatT = 4;
}
