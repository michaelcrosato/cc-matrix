/* One command. Prints FAIL lines and a count. Loads the shipped scripts. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dev = path.resolve(here, '..');
const work = path.resolve(dev, '..');
const fast = process.argv.includes('--fast');

process.on('warning', (w) => {
  const m = String((w && w.message) || w);
  if (m.includes('NO_COLOR') || m.includes('FORCE_COLOR')) return;
  console.error(w && w.stack ? w.stack : m);
});

if (process.env.OT_CHILD !== '1') {
  const env = Object.assign({}, process.env, { OT_CHILD: '1' });
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  delete env.FORCE_COLOR;
  const child = spawn(process.execPath, process.argv.slice(1), { env, cwd: dev, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => {
    const lines = out.split(/\r?\n/).filter((l) => l.startsWith('FAIL ') || /^\d+ checks, \d+ failed$/.test(l));
    process.stdout.write(lines.join('\n') + (lines.length ? '\n' : ''));
    process.exit(code == null ? 1 : code);
  });
} else {
  const fails = [];
  let n = 0;
  const check = (name, cond, detail) => {
    n += 1;
    if (!cond) fails.push('FAIL ' + name + (detail ? ': ' + detail : ''));
  };
  const group = (name, fn) => {
    try { fn(); }
    catch (e) { n += 1; fails.push('FAIL ' + name + ': ' + (e && e.stack ? e.stack : e)); }
  };

  const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
  const ctx = {
    console: quiet, performance, Math, Date,
    setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { getGamepads: () => [] },
    queueMicrotask,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const load = (rel) => {
    const code = fs.readFileSync(path.join(dev, rel), 'utf8');
    vm.runInContext(code, ctx, { filename: rel });
  };
  load('vendor/my-3d2dge/dist/handoff/my-3d2dge.js');
  for (const rel of [
    'src/config.js', 'src/core/sim.js', 'src/data/content.js', 'src/art/field.js',
    'src/audio/audio.js', 'src/about.js', 'src/bot/bot.js', 'src/scenes/shell.js',
  ]) load(rel);

  const GAME = ctx.GAME;
  const tune = () => GAME.CFG.cloneTune(GAME.CFG.TUNING);
  const raw = (opts) => GAME.Op.createRaw(Object.assign({ clock: 400, drain: 0, vitals: 90, hold: true }, opts || {}));
  const step = (S, inp, dt) => GAME.Op.step(S, inp, dt == null ? 1 / 60 : dt);
  const hold = (S, inp, seconds, dt) => {
    dt = dt || 1 / 60;
    let t = 0;
    while (t < seconds - 1e-9) { step(S, inp, dt); t += dt; }
  };

  group('source', () => {
    const banned = /TODO|FIXME|placeholder|stub/;
    const files = [];
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        if (name === 'vendor' || name === 'node_modules') continue;
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/\.(js|mjs|html|json|md)$/.test(name) && !p.includes(path.sep + 'tests' + path.sep)) files.push(p);
      }
    };
    walk(path.join(dev, 'src'));
    const engine = fs.readFileSync(path.join(dev, 'vendor/my-3d2dge/dist/handoff/my-3d2dge.js'), 'utf8');
    check('engine comment is clean', !banned.test(engine), 'engine still has a banned token');
    let bad = '';
    for (const p of files) {
      const text = fs.readFileSync(p, 'utf8');
      if (banned.test(text)) bad += path.relative(dev, p) + ' ';
      if (p.endsWith('.js') && /Math\.random\(/.test(text)) bad += 'random:' + path.relative(dev, p) + ' ';
    }
    check('shipped scripts stay clean', bad === '', bad.trim());
    check('title', GAME.CFG.GAME_TITLE === 'Open Table Second Opinion', GAME.CFG.GAME_TITLE);
    check('eleven cases', GAME.ORDER.length === 11, String(GAME.ORDER.length));
    const htmlName = GAME.CFG.FILE + '.html';
    const htmlPath = path.join(work, htmlName);
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      check('bundle clean', !banned.test(html));
      check('bundle has no external script', !/<script[^>]+src=/i.test(html));
      check('bundle titles the game', html.includes('<title>Open Table Second Opinion</title>'));
      check('session.js is inlined first', html.indexOf('AI Hub Session Protocol') < html.indexOf('My3D2dge') || html.indexOf('hub:session') > 0);
    } else if (!fast) check('bundle exists', false, htmlName);
  });

  group('cursor', () => {
    const travel = (doctor, fine) => {
      const S = raw({ doctor });
      S.activeDoc = doctor;
      const p = S.players[0];
      p.bx = 16; p.by = 120; p.x = 16; p.y = 16; p.speed = 0;
      const T = tune();
      for (let i = 0; i < 120; i++) GAME.Cursor.update(p, { aim: [1, 0], fine: !!fine }, S, 1 / 120, T);
      return p.bx - 16;
    };
    const full = travel('sokolova', false);
    const fineD = travel('sokolova', true);
    const vale = travel('vale', false);
    check('full stick covers 300', full >= 300, full.toFixed(1));
    check('fine stick stays within 120', fineD <= 120, fineD.toFixed(1));
    check('vale is quicker', vale > full * 1.1 && vale < full * 1.2, vale.toFixed(1) + ' vs ' + full.toFixed(1));
    const S = raw({ doctor: 'sokolova' });
    const p = S.players[0];
    p.tool = 'forceps';
    GAME.Wheel.update(p, { move: [1, -1] }, 0.05);
    check('wheel waits out a flick', p.tool === 'forceps', p.tool);
    GAME.Wheel.update(p, { move: [1, -1] }, 0.05);
    check('wheel settles by 100ms', p.tool === 'scalpel', p.tool);
    GAME.Wheel.update(p, { digit: 8 }, 0.016);
    check('digit picks at once', p.tool === 'sonar', p.tool);

    const sectors = [
      [[0, -1], 'forceps'],
      [[1, -1], 'scalpel'],
      [[1, 0], 'suture'],
      [[1, 1], 'salve'],
      [[0, 1], 'syringe'],
      [[-1, 1], 'cautery'],
      [[-1, 0], 'suction'],
      [[-1, -1], 'sonar'],
    ];
    for (const [move, tool] of sectors) {
      const w = raw();
      const hand = w.players[0];
      hand.tool = tool === 'forceps' ? 'sonar' : 'forceps';
      hand.wheelT = 0;
      hand.wheelDir = -1;
      GAME.Wheel.update(hand, { move }, 0.1);
      check('wheel ' + tool, hand.tool === tool, hand.tool);
    }

    const magnet = (assist) => {
      const S = raw();
      GAME.Sim.addObj(S, { type: 'polyp', x: 200, y: 120, need: 1, drain: 0 });
      const hand = S.players[0];
      hand.tool = 'cautery';
      hand.bx = 190; hand.by = 120; hand.x = 190; hand.y = 120; hand.speed = 0;
      const T = tune();
      T.hands.assist = assist;
      T.hands.magnet = 22;
      for (let i = 0; i < 30; i++) GAME.Cursor.update(hand, { aim: [0, 0] }, S, 1 / 60, T);
      return hand.bx - 190;
    };
    const pulled = magnet(0.6);
    const idle = magnet(0);
    check('magnet pulls a still hand', pulled > 6, pulled.toFixed(2));
    check('assist off leaves the hand', Math.abs(idle) < 0.2, idle.toFixed(2));

    const aimed = (assist) => {
      const S = raw();
      GAME.Sim.addObj(S, { type: 'polyp', x: 200, y: 120, need: 1, drain: 0 });
      const hand = S.players[0];
      hand.tool = 'cautery';
      hand.bx = 200; hand.by = 120; hand.x = 200; hand.y = 120; hand.speed = 0;
      const T = tune();
      T.hands.assist = assist;
      T.hands.magnet = 22;
      for (let i = 0; i < 30; i++) GAME.Cursor.update(hand, { aim: [0.5, 0] }, S, 1 / 60, T);
      return hand.bx - 200;
    };
    const openAim = aimed(0);
    const heldAim = aimed(0.6);
    check('assist slows the hand on a target', heldAim > 8 && heldAim < openAim * 0.85, heldAim.toFixed(1) + ' vs ' + openAim.toFixed(1));

    const alongGuide = (assist) => {
      const S = raw();
      const cut = GAME.Sim.addObj(S, { type: 'cut', x: 200, y: 120, guide: [[160, 120], [280, 120]], drain: 0 });
      const hand = S.players[0];
      hand.tool = 'scalpel';
      hand.bx = 200; hand.by = 120; hand.x = 200; hand.y = 120; hand.speed = 0;
      hand.stroke = { kind: 'scalpel', id: cut.id, t: 0 };
      const T = tune();
      T.hands.assist = assist;
      T.hands.magnet = 0;
      for (let i = 0; i < 20; i++) GAME.Cursor.update(hand, { aim: [0, 1] }, S, 1 / 60, T);
      return hand.by - 120;
    };
    const offLine = alongGuide(0);
    const onLine = alongGuide(1);
    check('the guide holds the blade', onLine > 0 && onLine < offLine * 0.35, onLine.toFixed(2) + ' vs ' + offLine.toFixed(2));
  });

  group('forceps', () => {
    const tear = raw();
    const shard = GAME.Sim.addObj(tear, { type: 'shard', x: 200, y: 140, depth: 40, tension: 120, axis: [1, 0], drain: 0 });
    const before = tear.objects.filter((o) => o.type === 'laceration').length;
    step(tear, [{ x: 200, y: 140, tool: 'forceps', trig: 1 }], 1 / 30);
    step(tear, [{ x: 200, y: 160, tool: 'forceps', trig: 1 }], 1 / 30);
    check('a sideways pull tears', (shard.tears || 0) >= 1, String(shard.tears));
    check('a tear leaves a laceration', tear.objects.filter((o) => o.type === 'laceration').length > before);

    const dish = raw();
    const bit = GAME.Sim.addObj(dish, { type: 'shard', x: 180, y: 140, depth: 16, tension: 120, axis: [1, 0], drain: 0 });
    step(dish, [{ x: 180, y: 140, tool: 'forceps', trig: 1 }], 0.05);
    for (let x = 182; x <= 200; x += 2) step(dish, [{ x, y: 140, tool: 'forceps', trig: 1 }], 0.05);
    check('the shard comes free', !!bit.free, 'prog ' + bit.prog);
    step(dish, [{ x: 220, y: 140, tool: 'forceps', trig: 1 }], 0.05);
    step(dish, [{ x: 220, y: 140, tool: 'forceps', trig: 0 }], 0.05);
    check('a free shard dishes', !!bit.done, 'held ' + dish.players[0].held);

    const snap = raw();
    const head = GAME.Sim.addObj(snap, { type: 'shard', x: 200, y: 140, depth: 40, tension: 120, axis: [1, 0], tag: 'legato-head', drain: 0 });
    step(snap, [{ x: 200, y: 140, tool: 'forceps', trig: 1 }], 1 / 30);
    const lac = snap.objects.filter((o) => o.type === 'laceration').length;
    step(snap, [{ x: 200, y: 160, tool: 'forceps', trig: 1 }], 1 / 30);
    check('a legato head snaps', !!head.snapped);
    check('a snap is not a cut', snap.objects.filter((o) => o.type === 'laceration').length === lac);
  });

  group('scalpel and suture', () => {
    const slipS = raw();
    const cut = GAME.Sim.addObj(slipS, { type: 'cut', x: 200, y: 120, guide: [[160, 120], [280, 120]], drain: 0 });
    step(slipS, [{ x: 160, y: 120, tool: 'scalpel', trig: 1, mouse: true }], 1 / 60);
    hold(slipS, [{ x: 160, y: 142, tool: 'scalpel', trig: 1, mouse: true }], 0.2, 1 / 60);
    check('off the line is a slip', slipS.slips > 0, 'slips ' + slipS.slips + ' id ' + cut.id);

    const ring = raw();
    const mass = GAME.Sim.addObj(ring, { type: 'mass', x: 213, y: 116, rad: 16, drain: 0 });
    const guide = mass.guide;
    step(ring, [{ x: guide[0][0], y: guide[0][1], tool: 'scalpel', trig: 1, mouse: true }], 1 / 60);
    for (const pt of guide) step(ring, [{ x: pt[0], y: pt[1], tool: 'scalpel', trig: 1, mouse: true }], 1 / 60);
    check('a closed ring finishes', !!mass.cut || mass.prog >= 0.98, 'prog ' + mass.prog);

    const sew = raw();
    const wound = GAME.Sim.addObj(sew, { type: 'wound', x: 200, y: 130, stitches: 2, drain: 0 });
    const a = wound.pairs[0][0], b = wound.pairs[0][1];
    step(sew, [{ x: a[0], y: a[1], tool: 'suture', trig: 1 }], 1 / 60);
    hold(sew, [{ x: a[0], y: a[1], tool: 'suture', trig: 1 }], 0.2, 1 / 60);
    step(sew, [{ x: b[0], y: b[1], tool: 'suture', trig: 0 }], 1 / 60);
    check('a stitch lands on the far point', wound.stitch === 1, 'stitch ' + wound.stitch);

    const loose = raw();
    const gap = GAME.Sim.addObj(loose, { type: 'wound', x: 200, y: 130, stitches: 2, drain: 0 });
    const near = gap.pairs[0][0];
    step(loose, [{ x: near[0], y: near[1], tool: 'suture', trig: 1 }], 1 / 60);
    step(loose, [{ x: 40, y: 40, tool: 'suture', trig: 0 }], 1 / 60);
    check('a loose stitch slips', loose.ev.some((e) => e[0] === 'loose') && (gap.stitch || 0) === 0, JSON.stringify(loose.ev));
  });

  group('salve syringe cautery suction sonar', () => {
    const gel = raw();
    const lac = GAME.Sim.addObj(gel, { type: 'laceration', x: 200, y: 120, r: 8, drain: 0 });
    for (const c of lac.cells) step(gel, [{ x: c[0], y: c[1], tool: 'salve', trig: 1 }], 1 / 30);
    check('salve covers the patch', !!lac.done, 'prog ' + (lac.prog || 0).toFixed(2));

    const air = raw({ vitals: 40 });
    hold(air, [{ x: 40, y: 40, tool: 'syringe', trig: 1 }], 0.95, 0.05);
    step(air, [{ x: 40, y: 40, tool: 'syringe', trig: 0 }], 0.05);
    check('air in the line is sloppy', air.ev.some((e) => e[0] === 'iv' && e[2] === 'sloppy'), JSON.stringify(air.ev));

    const reedS = raw();
    const reed = GAME.Sim.addObj(reedS, { type: 'reed', x: 200, y: 120, window: false, drain: 0 });
    hold(reedS, [{ x: 40, y: 40, tool: 'syringe', trig: 1 }], 0.6, 0.05);
    step(reedS, [{ x: reed.x, y: reed.y, tool: 'syringe', trig: 1 }], 0.05);
    step(reedS, [{ x: reed.x, y: reed.y, tool: 'syringe', trig: 0 }], 0.05);
    check('a closed reed splits', reedS.objects.some((o) => o.type === 'laceration'), 'ev ' + JSON.stringify(reedS.ev));

    const burn = raw();
    const burned = [];
    {
      const dt = 0.05;
      let t = 0;
      while (t < 2.2 - 1e-9) {
        step(burn, [{ x: 40, y: 40, tool: 'cautery', trig: 1 }], dt);
        for (const e of burn.ev) burned.push(e);
        t += dt;
      }
    }
    check('the cautery locks', burn.players[0].lock > 0 && burned.some((e) => e[0] === 'lock'), 'lock ' + burn.players[0].lock + ' ' + JSON.stringify(burned.filter((e) => e[0] === 'lock' || e[0] === 'slip')));
    check('lock was a slip', burned.some((e) => e[0] === 'slip' && e[1] === 'lock'), JSON.stringify(burned.filter((e) => e[0] === 'slip')));

    const suck = raw();
    const pool = GAME.Sim.addObj(suck, { type: 'pool', x: 200, y: 140, vol: 30, max: 30, drain: 0 });
    hold(suck, [{ x: 200, y: 140, tool: 'suction', trig: 1 }], 0.7, 0.05);
    check('suction empties a pool', pool.vol <= 0.2 || pool.done, 'vol ' + pool.vol);

    const ping = raw({ doctor: 'sokolova' });
    ping.activeDoc = 'sokolova';
    ping.gift = 'look';
    const hid = GAME.Sim.addObj(ping, { type: 'shard', x: 200, y: 140, hidden: true, drain: 0 });
    step(ping, [{ x: 200, y: 140, tool: 'sonar', trig: 1 }], 1 / 30);
    check('sonar marks a hidden shard', !!hid.marked);
  });

  group('grades clock gifts', () => {
    const rank = GAME.Op.rankLetter;
    check('S', rank(1000, 1000, 'resident', 0, null) === 'S');
    check('A', rank(800, 1000, 'resident', 0, null) === 'A');
    check('B', rank(600, 1000, 'resident', 0, null) === 'B');
    check('C', rank(400, 1000, 'resident', 0, null) === 'C');
    check('D', rank(100, 1000, 'resident', 0, null) === 'D');
    check('S+', rank(1000, 1000, 'attending', 0, null) === 'S+');
    check('slips block S+', rank(1000, 1000, 'attending', 1, null) === 'S');
    check('retry caps at B', rank(1000, 1000, 'resident', 0, 'B') === 'B');

    const again = GAME.Op.create(GAME.CASES.c1, { seed: 1, difficulty: 'resident' });
    again.lost = true;
    GAME.Op.retryPhase(again);
    check('retry clears the loss and caps the rank', again.rankCap === 'B' && again.lost === false);

    const timed = raw({ clock: 0.01, vitals: 0.01, drain: 50 });
    step(timed, [{ trig: 0 }], 0.05);
    check('the clock fails before a crash', timed.reason === 'time' && !timed.codeBlue, timed.reason);

    const hard = raw({ difficulty: 'attending', clock: 100, vitals: 0.2, drain: 20 });
    step(hard, [{ trig: 0 }], 0.1);
    check('attending has no Code Blue', hard.lost && hard.reason === 'vitals' && !hard.codeBlue, hard.reason);

    const blue = raw({ clock: 100, vitals: 0.2, drain: 20 });
    step(blue, [{ trig: 0 }], 0.05);
    check('vitals open Code Blue', !!blue.codeBlue || blue.codeBlueUsed, blue.reason);
    const peaks = [0.9, 1.8, 2.7, 3.6];
    let pi = 0;
    let arm = false;
    for (let i = 0; i < 400 && blue.codeBlue; i++) {
      const want = blue.codeBlue && pi < 4 && Math.abs(blue.codeBlue.t - peaks[pi]) < 0.04;
      const press = want && !arm;
      if (want && !arm) arm = true;
      step(blue, [{ trig: press || (arm && want) ? 1 : 0 }], 1 / 60);
      if (press) { pi += 1; arm = false; }
    }
    check('two shocks bring the patient back', blue.vitals >= 30 && !blue.lost, 'vit ' + blue.vitals + ' ' + blue.reason + ' hits ' + pi);

    const drop = (diff) => {
      const S = raw({ difficulty: diff, clock: 100, drain: 0, vitals: 80 });
      hold(S, [{ trig: 0 }], 1, 1 / 60);
      return 100 - S.clock;
    };
    const intern = drop('intern'), resident = drop('resident'), attending = drop('attending');
    check('intern clock is slower', intern < resident - 0.15 && intern > 0.6, intern.toFixed(3));
    check('attending clock is faster', attending > resident + 0.15, attending.toFixed(3));

    const breath = raw({ doctor: 'vale', gift: 'breath', clock: 100, steady: 40 });
    breath.steady = 40;
    breath.gift = 'breath';
    breath.activeDoc = 'vale';
    step(breath, [{ gift: true, trig: 0 }], 1 / 60);
    check('Long Breath slows the field', breath.breath && breath.worldScale === 0.25, String(breath.worldScale));
    const p = breath.players[0];
    p.bx = 30; p.by = 120; p.speed = 0;
    const still = raw({ doctor: 'vale' });
    const q = still.players[0];
    q.bx = 30; q.by = 120; q.speed = 0;
    const T = tune();
    for (let i = 0; i < 60; i++) {
      GAME.Cursor.update(p, { aim: [1, 0] }, breath, 1 / 60, T);
      GAME.Cursor.update(q, { aim: [1, 0] }, still, 1 / 60, T);
    }
    check('the hand still moves in real time', Math.abs((p.bx - 30) - (q.bx - 30)) < 1.5, (p.bx - 30).toFixed(1));
    const c0 = breath.clock;
    hold(breath, [{ gift: false, trig: 0 }], 1, 1 / 60);
    const fell = c0 - breath.clock;
    check('the clock crawls under Long Breath', fell > 0.15 && fell < 0.4, fell.toFixed(3));

    const look = raw({ doctor: 'sokolova', gift: 'look', clock: 200, steady: 0 });
    look.gift = 'look';
    look.activeDoc = 'sokolova';
    const shard = GAME.Sim.addObj(look, { type: 'shard', x: 180, y: 120, depth: 40, drain: 0 });
    hold(look, [{ trig: 0 }], 0.4, 0.05);
    look.players[0].x = 40;
    look.players[0].bx = 40;
    shard.x = 300;
    look.clock = 5;
    look.steady = 80;
    const rewound = GAME.Op.secondLook(look, tune());
    const back = look.objects.find((o) => o.type === 'shard');
    check('Second Look restores the field', rewound && back && Math.abs(back.x - 180) < 0.01 && look.clock > 100, 'x ' + (back && back.x) + ' clock ' + look.clock);
    check('the cursor stays put', Math.abs(look.players[0].x - 40) < 0.01, String(look.players[0].x));
    check('Second Look spends Steady', look.steady < 40, String(look.steady));
    check('Second Look leaves ghosts', !!(look.ghosts && look.ghosts.length > 0 && look.ghostT > 0 && look.ghosts[0].cursors && look.ghosts[0].cursors.length), String(look.ghosts && look.ghosts.length));
  });

  group('window and strains', () => {
    const beadLands = (beat) => {
      const S = raw({ hold: true });
      GAME.Sim.spawnStrain(S, 'staccato', { nests: 1, beads: 1, landIn: 1 });
      const T = tune();
      T.strains.beat = beat;
      let t = 0;
      while (t < 0.6 - 1e-9) { GAME.Op.step(S, [{ trig: 0 }], 0.05, T); t += 0.05; }
      return !!S.strain.beads[0].landed;
    };
    check('a faster Staccato beat lands sooner', beadLands(1) && !beadLands(0.5));

    const flare = (beat, seconds) => {
      const S = raw({ hold: true });
      GAME.Sim.spawnStrain(S, 'tremolo');
      const T = tune();
      T.strains.beat = beat;
      let t = 0;
      while (t < seconds - 1e-9) { GAME.Op.step(S, [{ trig: 0 }], 1 / 60, T); t += 1 / 60; }
      return !!S.strain.flare;
    };
    check('a faster beat opens the reed window sooner', flare(1, 0.4) && !flare(0.5, 0.4));

    GAME.Dev.set('strains.spawn', 1);
    const few = raw({ hold: true });
    GAME.Sim.spawnStrain(few, 'staccato');
    const nFew = few.strain.beads.length;
    GAME.Dev.set('strains.spawn', 2);
    const many = raw({ hold: true });
    GAME.Sim.spawnStrain(many, 'staccato');
    const nMany = many.strain.beads.length;
    GAME.Dev.reset();
    check('spawn rate adds beads', nFew === 4 && nMany === 8, nFew + ' ' + nMany);

    const reedWait = (spawn) => {
      const S = raw({ hold: true });
      GAME.Sim.spawnStrain(S, 'tremolo');
      for (const o of S.objects) if (o.type === 'reed') o.done = true;
      S.strain.stage = 2;
      S.strain.wake = 0.02;
      const T = tune();
      T.strains.spawn = spawn;
      GAME.Op.step(S, [{ trig: 0 }], 0.05, T);
      return S.strain.wake;
    };
    const wait1 = reedWait(1);
    const wait2 = reedWait(2);
    check('spawn rate shortens the reed wait', wait1 === 6 && wait2 === 3, wait1 + ' ' + wait2);

    const solo = raw({ players: 1 });
    GAME.Sim.addObj(solo, { type: 'retractor', x: 180, y: 140, drain: 0 });
    GAME.Sim.addObj(solo, { type: 'mass', x: 230, y: 140, needsWindow: true, drain: 0 });
    step(solo, [{ trig: 0 }], 1 / 30);
    check('one surgeon gets half the window', solo.windowOpen === 0.5, String(solo.windowOpen));

    const pair = raw({ players: 2 });
    const ret = GAME.Sim.addObj(pair, { type: 'retractor', x: 170, y: 140, drain: 0 });
    const mass = GAME.Sim.addObj(pair, { type: 'mass', x: 240, y: 140, needsWindow: true, drain: 0, rad: 14 });
    step(pair, [{ trig: 0 }, { trig: 0 }], 1 / 30);
    check('two surgeons must hold the window', pair.windowOpen === 0, String(pair.windowOpen));
    const start = mass.guide[0];
    step(pair, [{ trig: 0 }, { x: start[0], y: start[1], tool: 'scalpel', trig: 1, mouse: true }], 1 / 30);
    check('a shut window refuses the scalpel', !pair.players[1].stroke);
    step(pair, [{ x: ret.x, y: ret.y, tool: 'forceps', trig: 1 }, { trig: 0 }], 1 / 30);
    step(pair, [
      { x: ret.x, y: ret.y, tool: 'forceps', trig: 1 },
      { x: start[0], y: start[1], tool: 'scalpel', trig: 1, mouse: true },
    ], 1 / 30);
    check('a held window lets the other hand cut', pair.windowOpen === 1 && !!pair.players[1].stroke, 'open ' + pair.windowOpen);

    const capo = raw({ vitals: 80 });
    capo.cheat = { lockVitals: true };
    GAME.Sim.spawnStrain(capo, 'dacapo');
    const lobe = capo.objects.find((o) => o.type === 'lobe');
    lobe.done = true;
    step(capo, [{ trig: 0 }], 0.05);
    capo.strain.count = 0.02;
    const v0 = capo.vitals;
    step(capo, [{ trig: 0 }], 0.05);
    check('Da Capo regrows', capo.strain.repeated === 1 && !lobe.done && capo.vitals <= v0 - 7, 'rep ' + capo.strain.repeated + ' vit ' + capo.vitals);

    const eyeS = raw();
    GAME.Sim.spawnStrain(eyeS, 'fermata');
    eyeS.strain.domes = [];
    step(eyeS, [{ trig: 0 }], 0.05);
    const eye = eyeS.objects.find((o) => o.type === 'eye');
    check('the Fermata eye opens', !!(eye && eye.open));

    const cant = raw({ steady: 60, vitals: 90 });
    cant.steady = 60;
    GAME.Sim.spawnStrain(cant, 'cantor');
    hold(cant, [{ trig: 0 }], 0.6, 0.05);
    GAME.Sim.addObj(cant, { type: 'shard', x: 50, y: 50, tag: 'marker', drain: 0, depth: 80 });
    const steadyBefore = cant.steady;
    cant.strain.move = 3;
    cant.strain.cycleT = 20;
    hold(cant, [{ trig: 0 }], 3.3, 0.05);
    check('the Cantor rewinds the field', !cant.objects.some((o) => o.tag === 'marker'));
    check('the Cantor keeps Steady', cant.steady > steadyBefore + 0.4, cant.steady.toFixed(2) + ' vs ' + steadyBefore.toFixed(2));
  });

  group('determinism and bots', () => {
    GAME.Dev.reset();
    GAME.Art.force = false;
    const hashRun = (force) => {
      GAME.Art.force = force;
      const S = GAME.Op.create(GAME.CASES.c1, { seed: 9, difficulty: 'resident' });
      const t0 = S.t;
      let guard = 0;
      while (S.t - t0 < 4 && !S.won && !S.lost && guard < 20000) {
        const inputs = [];
        for (let i = 0; i < S.players.length; i++) {
          const dev = GAME.Bot.device(S, i, 1 / 45);
          const p = S.players[i];
          GAME.Wheel.update(p, dev, 1 / 45);
          if (dev.mouse) GAME.Cursor.update(p, { mouse: dev.mouse, fine: dev.fine }, S, 1 / 45);
          inputs.push({ tool: p.tool, trig: dev.trig, fine: !!dev.fine, gift: !!dev.gift, consult: !!dev.consult, mouse: true });
        }
        GAME.Op.step(S, inputs, 1 / 45);
        guard += 1;
      }
      return GAME.Op.hash(S);
    };
    const h0 = hashRun(false);
    const h1 = hashRun(false);
    const h2 = hashRun(true);
    GAME.Art.force = false;
    check('same seed and inputs hash the same', h0 === h1 && h0 === h2, h0 + ' ' + h1 + ' ' + h2);

    for (const id of GAME.ORDER) {
      const S = GAME.Op.create(GAME.CASES[id], { seed: 3, difficulty: 'resident' });
      const clock0 = S.clock0 || S.clock;
      GAME.Bot.play(S, 500, 1 / 45);
      const left = S.clock / clock0;
      check(id + ' clears', S.won && S.vitals >= 40 && left >= 0.3 && S.rank === 'S',
        (S.won ? 'W' : S.reason) + ' vit ' + Math.round(S.vitals) + ' clk ' + Math.round(S.clock) + '/' + clock0 + ' ' + S.rank + ' ph ' + S.phase);
    }
    for (const n of [1, 2, 4]) {
      const def = GAME.roundsCase(n);
      const S = GAME.Op.create(def, { seed: 3, difficulty: 'resident', players: n });
      GAME.Bot.play(S, 500, 1 / 45);
      check('rounds ' + n, !!S.won, S.reason || ('ph ' + S.phase));
    }
  });

  group('shell', () => {
    const game = GAME.Shell.game;
    const RT = GAME.Shell.RT;
    game.fadeTime = 0;
    GAME.Dev.reset();
    GAME.Art.force = false;
    RT.cheatUsed = false;
    game.advance(1 / 30);
    check('boots on the title', game.sceneName === 'title', game.sceneName);
    check('headless frame', game.H === 240 && game.W >= 420 && game.W <= 434, game.W + 'x' + game.H);
    check('music is quiet', game.audio.musicVolume === 0.1, String(game.audio.musicVolume));
    check('effects are full', game.audio.sfxVolume === 1, String(game.audio.sfxVolume));
    check('voices sit under effects', Math.abs(game.audio.voiceVolume - 0.9) < 0.001, String(game.audio.voiceVolume));
    check('master', Math.abs(game.audio.volume - 0.7) < 0.001, String(game.audio.volume));
    check('title draws', !game.errors.length, JSON.stringify(game.errors));
    check('PlayStation prompt', game.input.label('useTool', 'gamepad') === 'R2', game.input.label('useTool', 'gamepad'));
    const devItem = (game.o.menu.items || []).find((it) => it && it[0] === 'Dev Mode');
    check('dev mode is on the pause menu', !!(devItem && typeof devItem[1] === 'function'));

    const press = (action) => {
      game.input.tap(action);
      game.advance(game.o.step);
      game.advance(game.o.step);
    };
    const enter = () => { game.advance(game.o.step); game.advance(game.o.step); };

    game.advance(10.2);
    check('attract starts after ten seconds', game.sceneName === 'attract', game.sceneName);
    press('confirm');
    check('attract returns to the title', game.sceneName === 'title' && !GAME.Shell.snapshot().menu, game.sceneName);

    press('confirm');
    const labels = (GAME.Shell.snapshot().menu && GAME.Shell.snapshot().menu.labels) || [];
    check('menu rows', labels.join('|') === 'New Game|Case Files|Grand Rounds|Skills Lab|About', labels.join('|'));
    press('down');
    press('down');
    press('down');
    press('down');
    press('confirm');
    check('about opens', game.sceneName === 'about', game.sceneName);
    press('confirm');
    check('about advances', RT.creditPage === 1, String(RT.creditPage));
    press('cancel');
    check('about returns', game.sceneName === 'menu', game.sceneName);
    press('cancel');

    game.go('chart', { caseId: 'c2' });
    enter();
    const mark = GAME.Shell.snapshot().lightbox;
    check('lightbox mark is on the film', mark && Math.abs(mark[0] - 248) <= 1 && Math.abs(mark[1] - 96) <= 1, JSON.stringify(mark));
    game.input.feed('move', mark[0], mark[1]);
    game.input.feed('down', mark[0], mark[1]);
    game.input.feed('up', mark[0], mark[1]);
    enter();
    check('a right chart opens the case', game.sceneName === 'op' && RT.S && RT.S.id === 'c2' && RT.S.clock >= 250, game.sceneName + ' ' + (RT.S && RT.S.clock));

    GAME.Dev.reset();
    RT.cheatUsed = false;
    GAME.Shell.beginCase('c1', { seed: 1 });
    game.go('op');
    enter();
    GAME.openDev();
    check('dev panel opens', GAME.Shell.snapshot().dev.open);
    const drain0 = GAME.TUNE.patient.drain;
    game.input.tap('right');
    game.advance(game.o.step);
    check('a slider dirties tuning', GAME.TUNE.dirty && GAME.TUNE.patient.drain !== drain0, String(GAME.TUNE.patient.drain));
    check('tuning is not a cheat flag', RT.cheatUsed === false);
    const mid = GAME.TUNE.patient.drain;
    game.input.tap('confirm');
    game.advance(game.o.step);
    check('confirm does not move a slider', GAME.TUNE.patient.drain === mid, String(GAME.TUNE.patient.drain));
    GAME.Dev.reset();
    check('reset restores the documented defaults', !GAME.TUNE.dirty && GAME.TUNE.patient.drain === 1 && GAME.TUNE.hands.cursor === 330);
    const dirtyBefore = GAME.TUNE.dirty;
    game.settings.set('assist', 0.4);
    game.settings.set('cursorSpeed', 200);
    check('assist and cursor prefs stay clean', GAME.TUNE.dirty === dirtyBefore && GAME.PREFS.assist === 0.4 && GAME.PREFS.cursor === 200);
    game.settings.set('assist', 0.6);
    game.settings.set('cursorSpeed', 330);
    game.settings.set('glyphs', 'xbox');
    check('Xbox prompt', game.input.label('useTool', 'gamepad') === 'RT', game.input.label('useTool', 'gamepad'));
    game.settings.set('glyphs', 'playstation');
    check('keyboard prompt', game.input.label('useTool', 'keyboard') === 'Space', game.input.label('useTool', 'keyboard'));
    game.input.tap('cancel');
    game.advance(game.o.step);
    check('dev closes', !RT.devOpen);

    const A = GAME.ABOUT;
    check('usage line', A.sourceInformation.usage === 'added on import');
    check('feedback lengths', A.testingFeedback.length === 4 && A.engineFeedback.length === 6 && A.promptFeedback.length === 4);
    check('about name', A.aiHub.name === 'Open Table Second Opinion');
    check('no empty about lines', GAME.About.ORDER.every((k) => String(A.sourceInformation[k]).length > 0));

    game.settings.set('cursorSpeed', 200);
    game.settings.set('assist', 0.6);
    const speedOf = (cursor) => {
      const S = GAME.Shell.beginCase('c1', { seed: 1 });
      game.fadeTime = 0;
      game.debug.driver = null;
      game.go('op');
      enter();
      if (cursor == null) GAME.Dev.reset();
      else GAME.Dev.set('hands.cursor', cursor);
      const hand = S.players[0];
      hand.bx = 16; hand.by = 20; hand.x = 16; hand.y = 20; hand.speed = 0;
      game.debug.driver = () => ({ aim: [1, 0], trig: 0 });
      game.advance(game.o.step);
      game.debug.driver = null;
      return hand.bx - 16;
    };
    const tunedCursor = speedOf(480);
    const prefCursor = speedOf(null);
    check('a dev cursor overrides the preference', tunedCursor > prefCursor * 1.8, tunedCursor.toFixed(1) + ' vs ' + prefCursor.toFixed(1));

    game.settings.set('assist', 0);
    const pullOf = (assist) => {
      const S = raw({ hold: true, clock: 400, drain: 0, vitals: 90 });
      GAME.Sim.addObj(S, { type: 'polyp', x: 90, y: 40, need: 2, drain: 0 });
      const hand = S.players[0];
      hand.tool = 'cautery';
      hand.bx = 70; hand.by = 40; hand.x = 70; hand.y = 40; hand.speed = 0;
      RT.S = S;
      if (assist == null) GAME.Dev.reset();
      else GAME.Dev.set('hands.assist', assist);
      game.debug.driver = () => ({ aim: [0, 0], trig: 0 });
      game.fadeTime = 0;
      game.go('op');
      game.advance(game.o.step);
      game.debug.driver = null;
      return hand.bx - 70;
    };
    const tunedPull = pullOf(1.2);
    const prefPull = pullOf(null);
    check('a dev assist overrides the preference', tunedPull > 6 && Math.abs(prefPull) < 1, tunedPull.toFixed(2) + ' vs ' + prefPull.toFixed(2));

    GAME.Dev.reset();
    RT.cheatUsed = false;
    RT.devOpen = false;
    game.debug.driver = null;
    const strain = GAME.Shell.beginCase('c4', { seed: 1, phase: 1 });
    game.fadeTime = 0;
    game.go('op');
    enter();
    check('staccato is the live phase', strain.phase === 1 && strain.strain && strain.strain.kind === 'staccato' && !strain.strain.done, strain.phaseName);
    GAME.openDev();
    press('toolNext');
    for (let i = 0; i < 7; i++) press('down');
    press('confirm');
    check('clear phase finishes the strain', strain.phase === 2 && strain.phaseName === 'Repair', 'ph ' + strain.phase + ' ' + strain.phaseName);
    press('cancel');

    const ghostCase = GAME.Shell.beginCase('c2', { seed: 1, phase: 0 });
    ghostCase.gift = 'look';
    ghostCase.activeDoc = 'sokolova';
    game.fadeTime = 0;
    game.debug.driver = null;
    game.go('op');
    enter();
    for (let i = 0; i < 8; i++) GAME.Op.step(ghostCase, [{ trig: 0 }], 0.05);
    ghostCase.players[0].x = 40;
    ghostCase.players[0].bx = 40;
    ghostCase.clock = 5;
    ghostCase.steady = 80;
    const ghosted = GAME.Op.secondLook(ghostCase, tune());
    check('the operation rewinds into ghosts', ghosted && ghostCase.ghosts.length > 0 && ghostCase.ghostT > 0, String(ghostCase.ghosts && ghostCase.ghosts.length));
    const Epx = ctx.My3D2dge.px;
    const seenGhost = [];
    const origDisc = Epx.disc;
    const errBefore = game.errors.length;
    Epx.disc = function (g, x, y, rad, c) {
      if (c === '#67d6ff') seenGhost.push(c);
      return origDisc.apply(this, arguments);
    };
    try { game.advance(game.o.step); }
    finally { Epx.disc = origDisc; }
    check('Second Look ghosts are drawn', seenGhost.length > 0 && game.errors.length === errBefore, 'paints ' + seenGhost.length + ' ' + JSON.stringify(game.errors).slice(0, 240));

    game.debug.driver = null;
    GAME.Dev.reset();
    RT.cheatUsed = false;
    RT.devOpen = false;
    game.settings.set('assist', 0.6);
    game.settings.set('cursorSpeed', 330);
    game.settings.set('glyphs', 'playstation');

    game.go('title');
    enter();
    game.debug.skipStory = true;
    game.debug.driver = () => {
      const S = RT.S;
      if (!S) return { aim: [0, 0], trig: 0 };
      return GAME.Bot.device(S, 0, 1 / 45);
    };
    RT.ranks = {};
    RT.cheatUsed = false;
    GAME.Dev.reset();
    game.input.feed('move', 1, 1);
    press('confirm');
    press('confirm');
    check('new game reaches difficulty', game.sceneName === 'difficulty', game.sceneName);
    const diff = GAME.Shell.snapshot().menu;
    check('intern is first', diff && diff.labels[0] === 'Intern' && diff.i === 0, JSON.stringify(diff));
    press('down');
    check('one down is resident', GAME.Shell.snapshot().menu.i === 1 && GAME.Shell.snapshot().menu.labels[1] === 'Resident');
    press('confirm');
    let guard = 0;
    while (game.sceneName !== 'title' && guard < 160) {
      const sn = GAME.Shell.snapshot();
      const key = game.sceneName;
      if (key === 'story' && sn.choice) press('confirm');
      else if (key === 'story') game.advance(0.25);
      else if (key === 'chart') {
        const m = sn.lightbox || [248, 96];
        game.input.feed('move', m[0], m[1]);
        game.input.feed('down', m[0], m[1]);
        game.input.feed('up', m[0], m[1]);
        enter();
      } else if (key === 'op') game.advance(0.4);
      else if (key === 'results' || key === 'ward' || key === 'credits' || key === 'menu' || key === 'difficulty') press('confirm');
      else game.advance(0.2);
      guard += 1;
    }
    game.debug.driver = null;
    game.debug.skipStory = false;
    const ranks = GAME.Shell.snapshot().ranks;
    check('a new game returns to the title', game.sceneName === 'title', game.sceneName + ' guard ' + guard);
    check('every case ranks S', GAME.ORDER.every((id) => ranks[id] === 'S'), JSON.stringify(ranks));
    check('the run draws clean', !game.errors.length, JSON.stringify(game.errors).slice(0, 400));
  });

  const finish = () => {
    for (const line of fails) console.log(line);
    console.log(n + ' checks, ' + fails.length + ' failed');
    process.exit(fails.length ? 1 : 0);
  };

  if (fast) finish();
  else {
    runLive().then(() => finish()).catch((e) => {
      n += 1;
      fails.push('FAIL live: ' + (e && e.stack ? e.stack : e));
      finish();
    });
  }

  async function runLive() {
    const htmlName = GAME.CFG.FILE + '.html';
    const htmlPath = path.join(work, htmlName);
    check('page is handed in', fs.existsSync(htmlPath), htmlName);
    if (!fs.existsSync(htmlPath)) return;
    const { chromium, firefox, webkit } = await import('playwright');
    const fileUrl = 'file://' + htmlPath;
    const scratch = process.env.OT_SCRATCH || path.resolve(work, '..', 'tmp', 'grok-goal-08d1b960e391', 'implementer');
    fs.mkdirSync(scratch, { recursive: true });
    const browserLog = [];
    const note = (s) => browserLog.push(s);

    async function launchOnce(tag) {
      const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      await page.goto(fileUrl);
      await page.waitForTimeout(600);
      const info = await page.evaluate(() => {
        const g = window.My3D2dge && window.My3D2dge.current;
        const cvs = document.querySelector('canvas');
        return {
          title: document.title,
          scene: g && g.sceneName,
          w: g && g.W, h: g && g.H,
          cw: cvs && cvs.width, ch: cvs && cvs.height,
          text: document.body && document.body.innerText.slice(0, 200),
        };
      });
      await page.screenshot({ path: path.join(scratch, tag + '.png') });
      check(tag + ' title', info.title === 'Open Table Second Opinion' && info.scene === 'title', JSON.stringify(info));
      check(tag + ' buffer', (info.w === 480 && info.h === 270) || (info.cw === 480 && info.ch === 270), JSON.stringify(info));
      check(tag + ' errors', errors.length === 0, errors.slice(0, 4).join(' | '));
      if (tag === 'launch-1') {
        const rms = await page.evaluate(async () => window.GAME.Audio.renderProbe());
        check('an effect is not silent', !!(rms && rms.effect > 0.01), JSON.stringify(rms));
        check('a voice is not silent', !!(rms && rms.voice > 0.01), JSON.stringify(rms));
        check('the choir is not silent', !!(rms && rms.choir > 0.01), JSON.stringify(rms));
        check('music sits under effects', !!(rms && rms.music < rms.effects * 0.35), JSON.stringify(rms));
        fs.appendFileSync(path.join(scratch, 'handoff.log'), 'audio ' + JSON.stringify(rms) + '\n');
      }
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const scene = await page.evaluate(() => window.My3D2dge.current.sceneName);
      check(tag + ' confirm leaves the title', scene === 'menu', scene);
      await browser.close();
      note(tag + ' ' + JSON.stringify(info) + ' scene ' + scene + ' errors ' + errors.length);
    }

    await launchOnce('launch-1');
    await launchOnce('launch-2');
    fs.writeFileSync(path.join(scratch, 'launch.log'), browserLog.filter((l) => l.startsWith('launch-')).join('\n') + '\n');

    for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
      const browser = await engine.launch();
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(fileUrl);
      await page.waitForTimeout(30000);
      check(name + ' stays quiet for 30s', errors.length === 0, errors.slice(0, 3).join(' | '));
      note(name + ' 30s errors ' + errors.length);
      await browser.close();
    }

    {
      const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await page.goto(fileUrl);
      await page.waitForTimeout(400);
      const glyphs = await page.evaluate(() => {
        const g = window.My3D2dge.current;
        const pad = g.input.label('useTool', 'gamepad');
        g.settings.set('glyphs', 'xbox');
        const xbox = g.input.label('useTool', 'gamepad');
        g.settings.set('glyphs', 'playstation');
        return { pad, xbox, key: g.input.label('useTool', 'keyboard'), mouse: g.input.label('useTool', 'mouse') };
      });
      check('browser pad prompt is R2', glyphs.pad === 'R2', JSON.stringify(glyphs));
      check('browser xbox prompt is RT', glyphs.xbox === 'RT', JSON.stringify(glyphs));
      check('browser keyboard prompt', glyphs.key === 'Space', JSON.stringify(glyphs));
      note('glyphs ' + JSON.stringify(glyphs));
      await browser.close();
    }

    {
      const browser = await webkit.launch();
      const devices = (await import('playwright')).devices;
      const iphone = devices['iPhone 13'] || devices['iPhone 14'] || devices['iPhone 15'] || devices['iPhone SE'];
      const context = await browser.newContext({ ...iphone });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(fileUrl);
      await page.waitForTimeout(800);
      const touch = await page.evaluate(() => {
        const notice = document.body.innerText.includes('Controller or keyboard required');
        const buttons = document.querySelectorAll('[data-sys="touch"] button, .touch button');
        const settings = [...document.querySelectorAll('button')].find((b) => /settings/i.test(b.textContent || ''));
        return { notice, touchButtons: buttons.length, hasSettings: !!settings };
      });
      check('touch notice', touch.notice && touch.hasSettings && touch.touchButtons === 0, JSON.stringify(touch));
      const settingsBtn = page.getByRole('button', { name: /settings/i });
      if (await settingsBtn.count()) await settingsBtn.first().click();
      await page.waitForTimeout(400);
      const opened = await page.evaluate(() => {
        const g = window.My3D2dge && window.My3D2dge.current;
        const screen = g && g.shell && g.shell.screen;
        const text = document.body.innerText;
        return { screen, text: text.slice(0, 240) };
      });
      check('settings opens from the notice', opened.screen === 'settings' || /music|sound|display/i.test(opened.text), JSON.stringify(opened));
      check('touch page errors', errors.length === 0, errors.join(' | '));
      note('touch ' + JSON.stringify(touch) + ' ' + JSON.stringify(opened));
      await browser.close();
    }
    fs.writeFileSync(path.join(scratch, 'browsers.log'), browserLog.join('\n') + '\n');
    await shots(fileUrl, scratch);
    await runHub(htmlName, scratch);
  }

  async function shots(fileUrl, scratch) {
    const dir = path.join(scratch, 'shots');
    fs.mkdirSync(dir, { recursive: true });
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(fileUrl);
    await page.waitForTimeout(500);
    const frames = [
      ['site-forearm', "GAME.Shell.beginCase('c1',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['site-abdomen', "GAME.Shell.beginCase('c2',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['site-flank', "GAME.Shell.beginCase('c4',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['site-heart', "GAME.Shell.beginCase('c6',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['site-ship', "GAME.Shell.beginCase('c7',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['site-implant', "GAME.Shell.beginCase('c9',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['site-brain', "GAME.Shell.beginCase('c10',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['site-mediastinum', "GAME.Shell.beginCase('c11',{seed:3}); game.fadeTime=0; game.go('op');"],
      ['strain-staccato', "GAME.Shell.beginCase('c4',{seed:3,phase:1}); game.fadeTime=0; game.go('op');"],
      ['strain-legato', "GAME.Shell.beginCase('c5',{seed:3,phase:0}); game.fadeTime=0; game.go('op');"],
      ['strain-tremolo', "GAME.Shell.beginCase('c6',{seed:3,phase:1}); game.fadeTime=0; game.go('op');"],
      ['strain-dacapo', "GAME.Shell.beginCase('c8',{seed:3,phase:1}); game.fadeTime=0; game.go('op');"],
      ['strain-fermata', "GAME.Shell.beginCase('c10',{seed:3,phase:1}); game.fadeTime=0; game.go('op');"],
      ['strain-cantor', "GAME.Shell.beginCase('c11',{seed:3,phase:1}); game.fadeTime=0; game.go('op');"],
      ['wheel', "GAME.Shell.beginCase('c1',{seed:3}); GAME.Shell.RT.wheelShow=4; game.fadeTime=0; game.go('op');"],
      ['long-breath', "const S=GAME.Shell.beginCase('c1',{seed:3}); S.breath=true; S.worldScale=0.25; S.steady=70; game.fadeTime=0; game.go('op');"],
      ['portraits', "game.fadeTime=0; game.debug.skipStory=true; game.go('story');"],
      ['ward', "const RT=GAME.Shell.RT; RT.chapter=2; RT.saved={agnes:1,slide:1,tam:1,ned:1,ilse:1}; game.fadeTime=0; game.go('ward');"],
    ];
    for (const [name, code] of frames) {
      await page.evaluate((src) => {
        const game = window.My3D2dge.current;
        const GAME = window.GAME;
        eval(src);
      }, code);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(dir, name + '.png') });
    }
    await browser.close();
  }

  async function runHub(htmlName, scratch) {
    const { chromium } = await import('playwright');
    const hubLog = [];
    const srv = spawn('python3', ['-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: work, stdio: ['ignore', 'pipe', 'pipe'] });
    let port = 0;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('http server did not bind')), 8000);
      const on = (buf) => {
        const text = String(buf);
        const m = text.match(/port (\d+)/) || text.match(/:(\d+)/);
        if (m) { port = Number(m[1]); clearTimeout(timer); resolve(); }
      };
      srv.stderr.on('data', on);
      srv.stdout.on('data', on);
      srv.on('exit', () => reject(new Error('http server exited')));
    });
    const base = 'http://127.0.0.1:' + port + '/';
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const devName = path.basename(dev);
    const harness = devName + '/vendor/hub/harness.html';
    const gameQ = encodeURIComponent('/' + htmlName);
    const urls = [
      ['two', harness + '?game=' + gameQ + '&players=2&auto=1'],
      ['lag', harness + '?game=' + gameQ + '&players=4&latency=150&jitter=50&loss=5&auto=1'],
      ['leave', harness + '?game=' + gameQ + '&players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1'],
      ['server', harness + '?game=' + gameQ + '&players=2&scenario=server&auto=1'],
    ];
    try {
      for (const [name, rel] of urls) {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(base + rel);
        await page.waitForFunction(() => window.__hubCheck && window.__hubCheck.done, { timeout: 90000 });
        const report = await page.evaluate(() => window.__hubCheck);
        const framed = await page.evaluate(() => {
          const frame = document.querySelector('.cell iframe');
          return frame && frame.contentDocument ? frame.contentDocument.title : '';
        });
        check('hub ' + name, report.pass === true && errors.length === 0, (report.checks || []).filter((c) => !c.pass).map((c) => c.name + ' ' + c.detail).join('; ') + ' ' + errors.join('|'));
        check('hub ' + name + ' title', framed === 'Open Table Second Opinion', framed);
        hubLog.push(name + ' pass=' + report.pass + ' title=' + framed);
        await page.close();
      }
      const solo = await browser.newPage();
      const soloErrors = [];
      solo.on('pageerror', (e) => soloErrors.push(String(e)));
      await solo.goto(base + htmlName);
      await solo.waitForTimeout(800);
      const soloInfo = await solo.evaluate(() => {
        const g = window.My3D2dge.current;
        return { scene: g.sceneName, active: !!(window.AIHub && window.AIHub.active), title: document.title };
      });
      check('standalone is the title', soloInfo.scene === 'title' && soloInfo.active === false && soloInfo.title === 'Open Table Second Opinion' && soloErrors.length === 0, JSON.stringify(soloInfo) + soloErrors.join('|'));
      hubLog.push('solo ' + JSON.stringify(soloInfo));
      await solo.close();

      const pair = await browser.newPage();
      await pair.goto(base + harness + '?game=' + gameQ + '&players=2&auto=1&play=20000');
      await pair.waitForFunction(() => {
        const frames = [...document.querySelectorAll('.cell iframe')];
        if (frames.length < 2) return false;
        const host = frames[0].contentWindow;
        const probe = host && host.__hubProbe && host.__hubProbe();
        return probe && probe.phase === 'play';
      }, { timeout: 40000 });
      await pair.evaluate(() => {
        const frames = [...document.querySelectorAll('.cell iframe')];
        frames[1].contentWindow.__hubInject(111, 122, 1);
      });
      await pair.waitForTimeout(400);
      const stroke = await pair.evaluate(() => {
        const frames = [...document.querySelectorAll('.cell iframe')];
        const host = frames[0].contentWindow;
        return { probe: host.__hubProbe ? host.__hubProbe() : null, frames: frames.length };
      });
      const seen = stroke.probe && stroke.probe.players && stroke.probe.players.some((p) => Math.abs(p.x - 111) < 1 && Math.abs(p.y - 122) < 1);
      check('a client stroke reaches the host', !!seen, JSON.stringify(stroke).slice(0, 500));
      hubLog.push('stroke ' + JSON.stringify(stroke).slice(0, 500));
      await pair.close();
    } finally {
      await browser.close();
      srv.kill('SIGTERM');
    }
    fs.writeFileSync(path.join(scratch, 'hub.log'), hubLog.join('\n') + '\n');
  }
}
