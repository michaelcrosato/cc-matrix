// MASH TV: episodes, maps and rooms as data (section 7). A room is one entry; wave strings are parsed by W().
// wave string: "@2 N goon 6 .35, S goon 6 +spread@center" | cond: @sec and/or <=left joined by '|'; '+item@where'; '!script'
function W(s) {
  const sp = s.indexOf(' '), cond = s.slice(0, sp), rest = s.slice(sp + 1), w = { spawn: [], items: [] };
  for (const c of cond.split('|')) { if (c[0] === '@') w.at = +c.slice(1); else if (c.startsWith('<=')) w.left = +c.slice(2); }
  for (let part of rest.split(',')) {
    part = part.trim(); if (!part) continue;
    if (part[0] === '+') { const [k, where] = part.slice(1).split('@'); w.items.push([k, where === 'center' ? 'center' : where === 'drop' ? 'drop' : where.split('.').map(Number)]); }
    else if (part[0] === '!') { w.script = part.slice(1); w.final = true; }
    else { const t = part.split(' '); let door = t[0]; if (door.includes('.')) door = door.split('.').map(Number); w.spawn.push([door, t[1], +t[2], t[3] ? +t[3] : .25]); }
  }
  return w;
}
MT.W = W;
const room = (id, name, o) => Object.assign({ id, name, ep: +id[0], type: 'battle', waves: [], par: 70, exits: {}, set: ['studio', 'warehouse', 'rooftop'][+id[0] - 1] }, o, { waves: (o.waves || []).map(W) });
const RM = {};
const add = (r) => { RM[r.id] = r; return r; };
// ---- EPISODE 1 ----
add(room('1-1', 'OPENING NUMBER', { type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true, waves: [
  '@2 N goon 6 .35, S goon 6 .35', '<=2|@10 E goon 8, W goon 8', '<=4|@8 all goon 3, +spread@center', '<=4|@8 N clapbot 6, S clapbot 6', '<=5|@8 all goon 5, N popper 2'] }));
add(room('1-2', 'MIME FIELD', { type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: { rule: 'mimes' }, place: [3, 7, 13, 17, 5, 15, 3, 7, 13, 17].map((x, i) => ['mime', x, [3, 2, 2, 3, 6, 6, 9, 10, 10, 9][i]]), waves: [
  '@2 S goon 8', '<=3|@8 N popper 2, E goon 8', '<=3|@10 W goon 10, +rockets@drop', '<=4|@8 all clapbot 3', '<=3|@8 N popper 3, S popper 3, E goon 6'] }));
add(room('1-3', 'CLAP TRAP', { type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65, waves: [
  '@2 E clapbot 8, W clapbot 8', '<=3|@8 N goon 12', '<=4|@8 all clapbot 5, +records@drop', '<=4|@8 S popper 4, E goon 8', '<=3|@8 all clapbot 6, N goon 6'] }));
add(room('1-4', 'KEY GAUNTLET', { type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 60, key: { rule: 'survive' }, surviveLen: 35, items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']], waves: [] }));
add(room('1-5', 'WEAPONS LOCKER', { type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80, items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]], waves: [
  '@3 all goon 8', '<=4|@8 N popper 4, S popper 4', '<=5|@8 E clapbot 10, W clapbot 10', '<=5|@8 all goon 8, +speed@drop', '<=4|@10 N goon 12, S goon 12, sides popper 2'] }));
add(room('1-6', 'CASH COW CORRAL', { type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, cashRoom: true, key: { rule: 'crate' }, crates: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]], waves: [
  '@2 N goon 10', '<=3|@8 E goon 10, W goon 10', '<=4|@8 all clapbot 4', '<=4|@8 S popper 3, N popper 3, all goon 3'] }));
add(room('1-B', "MASHY'S BIG DEBUT", { type: 'boss', cell: [1, 0], boss: 'mashy', exits: {}, par: 0 }));
// ---- EPISODE 2 ----
add(room('2-1', 'AISLE 9 RUMBLE', { type: 'start', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70, waves: [
  '@2 N goon 10, S goon 10', '<=4|@8 E disco 1, W disco 1', '<=3|@10 all goon 6, +popcorn@center', '<=4|@8 N popper 3, S clapbot 10', '<=4|@8 E disco 2, W goon 12'] }));
add(room('2-2', 'CONVEYOR CHAOS', { type: 'hazard', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: { rule: 'belt' }, hazards: [{ kind: 'conveyor', rows: [2, 5, 9], dirs: [1, -1, 1] }], waves: [
  '@2 E goon 12', '<=4|@8 W clapbot 10', '<=4|@8 N popper 4, S popper 4', '<=4|@8 all goon 8, +laser@drop', '<=3|@8 E disco 2, W disco 1'] }));
add(room('2-3', 'DISCO DEPOT', { type: 'battle', cell: [2, 2], exits: { N: '2-6' }, par: 70, waves: [
  '@2 N discoBig 2', '<=2|@10 E goon 10, W goon 10', '<=4|@8 S disco 2, +laser@drop', '<=4|@8 all clapbot 5', '<=3|@9 N discoBig 2, S goon 8'] }));
add(room('2-4', 'TOMATO TERRITORY', { type: 'battle', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: { rule: 'carrier', kind: 'hecklerKing' }, waves: [
  '@2 audience heckler 4', '<=2|@8 N goon 12', '<=4|@8 audience heckler 6', '<=4|@8 S popper 4, E clapbot 8', '<=3|@8 audience hecklerKing 1, audience heckler 3, +life@drop'] }));
add(room('2-5', 'TANK YARD', { type: 'armory', cell: [1, 1], exits: { N: '2-B' }, par: 80, items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]], waves: [
  '@2 N tank 1', '<=1|@10 all goon 8', '<=4|@8 E tank 1, W tank 1', '<=2|@10 S popper 4, N clapbot 10, +shield@drop', '<=3|@9 N tank 2, all goon 6'] }));
add(room('2-6', 'BLOWOUT SALE', { type: 'cash', cell: [2, 1], exits: { W: '2-5' }, par: 65, cashRoom: true, key: { rule: 'crate' }, crates: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]], waves: [
  '@2 all goon 8', '<=4|@8 audience heckler 4', '<=3|@8 E disco 1, W disco 1', '<=3|@8 all clapbot 5', '<=3|@8 N tank 1, S goon 10'] }));
add(room('2-B', 'THE BIG SPIN', { type: 'boss', cell: [1, 0], boss: 'wheel', exits: {}, par: 0 }));
// ---- EPISODE 3 ----
add(room('3-1', 'RED CARPET RIOT', { type: 'start', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75, waves: [
  '@2 all goon 8', '<=4|@8 audience heckler 4, N disco 1', '<=3|@8 E tank 1, W popper 4', '<=3|@9 N brute 1', '<=2|@10 all clapbot 6, S goon 8'] }));
add(room('3-2', 'PYRO PIT', { type: 'hazard', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: { rule: 'final' }, hazards: [{ kind: 'pyro', vents: [4, 8, 12, 16].flatMap(x => [3, 6, 9].map(y => [x, y])) }], waves: [
  '@2 N goon 12', '<=4|@8 E clapbot 10, W clapbot 10', '<=4|@8 S popper 4, +records@drop', '<=3|@8 audience heckler 4', '<=3|@8 !finaleBurst, all goon 4'] }));
add(room('3-3', 'CABLE TANGLE', { type: 'battle', cell: [2, 2], exits: { N: '3-6' }, par: 75, waves: [
  '@2 N snake 1', '@8 all goon 6', '<=4|@10 E snake 1, W snake 1', '<=3|@10 S popper 4, +laser@drop', '<=2|@10 N snake 2, all clapbot 3'] }));
add(room('3-4', 'PENTHOUSE VAULT', { type: 'key', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: { rule: 'vault' }, locks: [[1, 0], [3, 0], [5, 0], [7, 0]], waves: [
  '@2 all goon 8', '<=4|@8 audience heckler 4', '<=3|@8 E tank 1', '<=3|@8 all clapbot 5', '<=3|@8 N brute 1'] }));
add(room('3-5', 'THE AFTER-PARTY', { type: 'armory', cell: [1, 1], exits: { N: '3-B' }, par: 85, items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]], waves: [
  '@2 N snake 1, S goon 10', '<=3|@8 E discoBig 1, W tank 1', '<=3|@8 audience heckler 6', '<=3|@9 N brute 1, all clapbot 4', '<=3|@9 all goon 10, N popper 4'] }));
add(room('3-6', 'MASCOT MAYHEM', { type: 'battle', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: { rule: 'carrier', kind: 'brute', nth: 2 }, waves: [
  '@2 N brute 1', '<=1|@10 all goon 8', '<=3|@8 E brute 1, W popper 4', '<=3|@8 S snake 1, +rockets@drop', '<=2|@10 N brute 2'] }));
add(room('3-B', 'LANCE LUSTRE LIVE!', { type: 'boss', cell: [1, 0], boss: 'lance', exits: {}, par: 0 }));
add(Object.assign(room('GR', 'THE GREEN ROOM', { type: 'bonus', waves: [], par: 0, set: 'greenroom' }), { ep: 4, green: true }));
MT.ROOMS = RM;
// the Lightning Round (AI Hub): reuse episode rooms with one NEXT exit each
MT.LIGHTNING = ['L1', 'L2', 'L3', 'LB'];
for (const [lid, src, next] of [['L1', '1-1', 'L2'], ['L2', '1-2', 'L3'], ['L3', '2-3', 'LB'], ['LB', '1-B', null]]) {
  const s = RM[src]; RM[lid] = Object.assign({}, s, { id: lid, lightning: true, tutorial: false, exits: next ? { N: next } : {}, key: s.key && s.key.rule === 'mimes' ? s.key : null });
}
// ---- episodes ----
const PR = (ep, rows) => rows.map(([name, value, joke]) => ({ name, value, joke }));
MT.EPISODES = {
  1: { n: 1, name: 'THE PILOT', set: 'studio', song: 'studioBattle', stunt: 'clapbot', start: '1-1', boss: '1-B', place: 'STUDIO 9', intro: 'ep1', prizes: PR(1, [
    ['A SELF-AWARE TOASTER', 2500, 'IT ALREADY RESENTS YOU!'], ['A HOVER BLENDER', 3000, 'SMOOTHIES AT ANY ALTITUDE!'], ['A LIFETIME SUPPLY OF CANNED LAUGHTER', 4000, 'NEVER LAUGH ALONE AGAIN!'],
    ['A MOOD-RING THERMOSTAT', 1500, 'YOUR HOUSE KNOWS HOW YOU FEEL!'], ['A DRY-LAND JET SKI', 8000, "IT DOESN'T FLOAT, BUT IT LOOKS GREAT!"], ['A SLIGHTLY HAUNTED ROBO-BUTLER', 6000, 'THE GHOST DOES THE DISHES!']]) },
  2: { n: 2, name: 'SWEEPS WEEK', set: 'warehouse', song: 'warehouseFunk', stunt: 'tank', start: '2-1', boss: '2-B', place: 'THE MEGAMART PRIZE WAREHOUSE', intro: 'ep2', prizes: PR(2, [
    ['A FRIDGE THAT JUDGES YOU', 5000, 'IT KNOWS ABOUT THE MIDNIGHT CAKE!'], ['MATCHING JETPACKS', 12000, 'SEATBELTS NOT INCLUDED!'], ['A 199-INCH MEGA-RAY TV', 9000, 'WATCH MASH TV LIFE-SIZED!'],
    ['A SELF-FOLDING LAUNDRY CUBE', 3500, 'IT FOLDS YOU, TOO!'], ['A GOLD-PLATED REMOTE', 4500, 'CHANGE ANY CHANNEL BUT THIS ONE!'], ['AN INFLATABLE SPORTS CAR', 7000, 'ZERO TO SIXTY IN ONE PUMP!']]) },
  3: { n: 3, name: 'THE SEASON FINALE', set: 'rooftop', song: 'finaleOverture', stunt: 'brute', start: '3-1', boss: '3-B', place: 'THE ROOFTOP GALA', intro: 'ep3', prizes: PR(3, [
    ['A TIMESHARE ON THE MOON', 25000, 'GETTING HOME IS EXTRA!'], ['A PERSONAL WEATHER MACHINE', 15000, "RAIN ON EVERYONE'S PARADE!"], ['A DIAMOND TOOTHBRUSH', 8000, "FOR A SMILE LIKE LANCE'S!"],
    ['A PET CLONING KIT', 10000, 'NOW YOU HAVE TWO PROBLEMS!'], ['A BOTTOMLESS CHAMPAGNE FLUTE', 6000, 'CHEERS, FOREVER!'], ['A SPEEDBOAT NAMED LANCE', 20000, 'IT ALSO TALKS ABOUT ITSELF!']]) }
};
MT.KEYS_NEEDED = 5; MT.KEYS_TOTAL = 9;
// keys per episode: left path gets 2 (rooms 1-2 'mimes' and 1-4 'survive'); right path 1 (1-6 crate); ep3 etc. -> 3 each, 9 in all
MT.roomsWithKeys = ep => Object.values(RM).filter(r => r.ep === ep && r.key).map(r => r.id);
// ---- scripted wave events & hazards ----
MT.SCRIPTS = {
  finaleBurst(w) { const h = w.hazards.find(q => q.kind === 'pyro'); if (!h) return; w.scriptBusy = true; h.burst(w, 2, () => { w.scriptBusy = false; w.queueSpawn('all', 'goon', 4, .25); }); }
};
MT.makeHazard = function (w, spec) {
  if (spec.kind === 'conveyor') {
    const h = { kind: 'conveyor', rows: spec.rows, dirs: spec.dirs.slice(), t: 0, warn: 0, speedK: 1 };
    h.push = (x, y) => { for (let i = 0; i < h.rows.length; i++) { const y0 = 24 - 8 + h.rows[i] * 16, y1 = y0 + 32; if (y > y0 && y < y1) return [h.dirs[i] * 40 * h.speedK, 0]; } return [0, 0]; };
    h.update = (dt, w) => {
      h.t += dt; const p = h.t % 12; if (p > 10.5) { h.warn = 1; h.speedK = Math.max(.15, 1 - (p - 10.5) / 1.5 * .85); if (!h.alarm) { h.alarm = true; w.event('beltAlarm', {}); } }
      else { h.warn = 0; h.alarm = false; h.speedK = 1; }
      if (p < dt && h.t > 1) { h.dirs = h.dirs.map(d => -d); }
    };
    h.state = () => h.dirs.join(',');
    return h;
  }
  if (spec.kind === 'pyro') {
    const vents = spec.vents.map(([cx, cy]) => { const [x, y] = MT.cellXY(cx, cy); return { cx, cy, x, y, state: 'off', t: 0 }; });
    const h = { kind: 'pyro', vents, t: 0, patN: 0, pending: 0, cb: null };
    const pats = [v => v.cy === [3, 6, 9][h.patN % 3 === 0 ? (h.patN / 4 | 0) % 3 : 0], null];
    h.fire = (v, tele) => { if (v.state === 'off') { v.state = 'tele'; v.t = tele || 1; } };
    h.pattern = (w) => {
      const n = h.patN++, kinds = ['rows', 'cols', 'checker', 'allButLane']; const k = kinds[n % 4]; const xs = [4, 8, 12, 16], ys = [3, 6, 9];
      const lane = xs[Math.floor(MT.R.ai() * 4)], row = ys[Math.floor(MT.R.ai() * 3)], col = xs[Math.floor(MT.R.ai() * 4)];
      for (const v of vents) { let on = false; if (k === 'rows') on = v.cy === row; else if (k === 'cols') on = v.cx === col; else if (k === 'checker') on = ((v.cx / 4 | 0) + (v.cy / 3 | 0)) % 2 === 0; else on = v.cx !== lane; if (on) h.fire(v, 1); }
    };
    h.burst = (w, times, cb) => { h.bursting = { left: times, cb, gap: 0 }; };
    h.update = (dt, w) => {
      h.t += dt;
      if (!h.bursting && w.phase === 'waves' && h.t > 3.5) { h.t = 0; h.pattern(w); }
      if (h.bursting) { const b = h.bursting; if (vents.every(v => v.state === 'off')) { if (b.left > 0) { b.left--; for (const v of vents) h.fire(v, 1); } else { h.bursting = null; if (b.cb) b.cb(); } } }
      for (const v of vents) {
        if (v.state === 'off') continue; v.t -= dt;
        if (v.state === 'tele' && v.t <= 0) { v.state = 'fire'; v.t = 1.2; w.event('pyro', { x: v.x, y: v.y }); }
        else if (v.state === 'fire') {
          for (const c of w.cs) if (c.state === 'alive' && MT.hyp(c.x - v.x, c.y - v.y) < 12) w.hurtContestant(c, 1, 'flame', 0, MT.angTo(v, c));
          for (const e of w.enemies) if (e.alive && !e.invuln && MT.hyp(e.x - v.x, e.y - v.y) < 12 + e.r * .5) w.hurtEnemy(e, 3 * dt, null, { quiet: true });
          if (v.t <= 0) { v.state = 'off'; }
        }
      }
    };
    return h;
  }
  throw new Error('hazard ' + spec.kind);
};
