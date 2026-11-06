/* Original content. All truth is chosen once by the seeded case generator. */
(() => {
  'use strict';
  const W = (globalThis.Wired = globalThis.Wired || {});
  W.VERSION = '1.0.0';
  W.CONTENT = 1;
  W.TITLE = 'Bomb Squad All Wired Up';
  W.TAGLINE = 'Keep your nerve. Save the city.';
  W.GLYPHS = [
    ['0110', '1001', '1001', '1001', '0110'],
    ['0010', '0110', '0010', '0010', '0111'],
    ['1110', '0001', '0110', '1000', '1111'],
    ['1110', '0001', '0110', '0001', '1110'],
    ['1001', '1001', '1111', '0001', '0001'],
    ['1111', '1000', '1110', '0001', '1110'],
    ['0111', '1000', '1110', '1001', '0110'],
    ['1111', '0001', '0010', '0100', '0100'],
    ['0110', '1001', '0110', '1001', '0110'],
    ['0110', '1001', '0111', '0001', '1110'],
  ].map((rows) => rows.join('').split('').map(Number));
  W.PALETTE = [
    { id: 'amber', label: 'AMBER / STRIPE', short: 'STRIPE', color: '#e6af49', pattern: '///' },
    { id: 'cyan', label: 'CYAN / DOT', short: 'DOT', color: '#55c3d0', pattern: '•••' },
    { id: 'coral', label: 'CORAL / CROSS', short: 'CROSS', color: '#ec7767', pattern: '+++' },
    { id: 'violet', label: 'VIOLET / DIAMOND', short: 'DIAMOND', color: '#b39acb', pattern: '<>' },
  ];
  W.SHAPES = ['bar', 'disc', 'coil', 'chip'];
  W.TOOLS = ['cut', 'grip', 'solder', 'foam'];
  W.TOOLNAMES = ['Cutters', 'Pliers', 'Soldering iron', 'Extinguisher'];
  W.DEFAULTS = Object.freeze({
    timeScale: 1,
    fuseScale: 1,
    travel: 8,
    precision: 0.55,
    safeMin: 0.48,
    safeMax: 1.05,
    heatGain: 30,
    cooling: 7,
    recovery: 8,
    penalty: 12,
    fireIntensity: 0.45,
    extinguish: 0.8,
    hintDelay: 12,
  });
  W.CASES = [
    {
      id: 'training',
      number: '00',
      name: 'A little wire practice',
      site: 'MUNICIPAL RESPONSE VAN',
      theme: 'van',
      digits: 1,
      boards: 1,
      minutes: [3, 3, 3, 3],
      jobs: 1,
      subtitle: 'A quiet bench. A live lesson.',
      brief:
        'I’m Nell, your technical partner. Our training fuse is generous, but it still runs. Repair the marked part: cut both leads, lift it, pick up a jumper, place it, then hold and release solder on each joint. Repairs uncover cells in a hidden digit. Read the stencil, dial the number, and confirm the disarm.',
      lesson: 'Follow the highlighted job. You can repeat my instructions at any time.',
      taunt: 'VEX: A practice bomb? How wonderfully unambitious.',
      success:
        'NELL: That’s a sound joint. And a sound start. Let’s take the van to the waterfront.',
      failure: 'NELL: That’s why we practise in an empty van. Same bench, fresh breath. Try again.',
      ending: 'TRAINING COMPLETE · A steady hand beats a fast hand.',
    },
    {
      id: 'waterfront',
      number: '01',
      name: 'The last ferry',
      site: 'BRASSWATER QUAY',
      theme: 'quay',
      digits: 1,
      boards: 4,
      minutes: [5, 4.5, 4, 4],
      jobs: 1,
      subtitle: 'Someone’s wired the harbour clock.',
      brief:
        'The last ferry is waiting in the fog. Vex has planted a device inside the quay clock. Four sectors hold evidence for one digit; you may need fewer. Choose a sector, follow its work order, and publish its cells. After two boards, you can transmit a code. Dark cells count as evidence too.',
      lesson:
        'If you snip the wrong lead, solder the marked joint within eight seconds. You can recover.',
      taunt: 'VEX: I do hope you enjoy my waterfront installation. The timing is exquisite.',
      success:
        'NELL: Ferry lights are back! The captain says thank you. And something about the parking fee.',
      failure: 'NELL: The quay is evacuated. The clock isn’t. We know more now; let’s use it.',
      ending: 'THE QUAY IS SAFE · One ferry, one clock, a thousand relieved commuters.',
    },
    {
      id: 'relay',
      number: '02',
      name: 'A current affair',
      site: 'NORTHLINE POWER RELAY',
      theme: 'relay',
      digits: 2,
      boards: 6,
      minutes: [7, 6, 5.5, 5],
      jobs: 2,
      subtitle: 'Two digits between the city and a blackout.',
      brief:
        'The relay powers half of Brasswater. These boards accept replacements by either SHAPE or COLOR PATTERN. Each board keeps one rule. Pick a spare and test it with Inspect: the two-second continuity check is safe and stock is reusable. Watch iron heat. Our first relay board has a hot spot; use the extinguisher before continuing.',
      lesson:
        'A failed continuity check is recoverable. Lift the wrong spare with pliers, then try another.',
      taunt: 'VEX: Shape or colour? I consider it a personality test for electricians.',
      success:
        'NELL: Northline is humming again. The crew’s kettle survived. Morale is immeasurable.',
      failure:
        'NELL: Backup power caught the hospital. The relay needs a rebuild. So does our plan.',
      ending: 'THE GRID IS SAFE · The skyline flickers back to life.',
    },
    {
      id: 'central',
      number: '03',
      name: 'The final countdown',
      site: 'BRASSWATER CIVIC SPIRE',
      theme: 'central',
      digits: 3,
      boards: 9,
      minutes: [8, 7, 6, 5.5],
      jobs: 2,
      subtitle: 'Three digits. One city. Your call.',
      brief:
        'Vex’s last device sits under the civic spire. Nine sectors, three digits, longer orders, mixed replacement rules. Choose which digit needs evidence. You can leave a board and return to its exact state; heat and recovery deadlines keep running. Don’t transmit until you mean it. The city is listening.',
      lesson:
        'We have enough spares. We have a route to certainty. Keep the work clean and the city keeps its lights.',
      taunt: 'VEX: A three-digit finale. Even my disappointments deserve production values.',
      success:
        'NELL: It’s quiet. That’s the best sound in the world. Brasswater is safe. All of it.',
      failure:
        'NELL: The evacuation held. We’ll rebuild the spire. Take the same case and make a different ending.',
      ending: 'ALL WIRED UP · ALL CLEAR · Vex’s grand finale has been cancelled.',
    },
  ];
  W.rng = (seed) => {
    let x = 2166136261;
    for (const c of String(seed)) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
    return () => {
      x += 0x6d2b79f5;
      let t = x;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  W.clone = (o) => JSON.parse(JSON.stringify(o));
  W.compatible = (cells, digit) => cells.every((v, i) => v === -1 || v === W.GLYPHS[digit][i]);
  W.candidates = (cells) => W.GLYPHS.map((_, i) => i).filter((d) => W.compatible(cells, d));
  W.matches = (part, spare, rule) =>
    part.mode === 'jumper' ? spare.shape === 'jumper' : spare[rule] === part[rule];
  W.makeCase = (id, seed, seats = ['solo'], opts = {}) => {
    const def = W.CASES.find((c) => c.id === id) || W.CASES[1],
      rng = W.rng(`${seed}:truth`),
      trayRng = W.rng(`${seed}:tray`);
    const code = Array.from({ length: def.digits }, () => Math.floor(rng() * 10));
    const sectors = ['Signal', 'Return', 'Bridge', 'Reserve'];
    const boardCount = opts.dispatch && def.id === 'relay' ? 4 : def.boards;
    const boards = Array.from({ length: boardCount }, (_, i) => {
      const digit = Math.floor(i / (boardCount / def.digits)),
        pack = i % (boardCount / def.digits),
        count = boardCount / def.digits;
      // Interlaced packs expose both positive and negative stencil evidence.
      const perm = [5, 10, 9, 13, 2, 16, 6, 14, 7, 18, 0, 12, 3, 17, 11, 19, 1, 4, 8, 15];
      const mask =
        def.id === 'training'
          ? Array.from({ length: 20 }, (_, j) => j)
          : perm.filter((_, j) => j % count === pack);
      const rule = i % 2 === 0 ? 'shape' : 'color',
        jumper = def.number === '00' || def.number === '01';
      const jobs =
        def.jobs +
        (def.id === 'central' && i % 3 === 2 ? 1 : 0) +
        (seats.length > 2 && i % 3 === 0 ? 1 : 0);
      const components = Array.from({ length: Math.max(4, jobs + 1) }, (_, j) => ({
        id: `C${j + 1}`,
        x: 65 + (j % 3) * 69,
        y: 60 + Math.floor(j / 3) * 70,
        anchors: [
          [-20, 0],
          [20, 0],
        ],
        shape: W.SHAPES[(i + j) % 3],
        color: W.PALETTE[(i + j) % 3].id,
        mode: jumper ? 'jumper' : 'replace',
        phase: 'attached',
        leads: [0, 0],
        spare: null,
        required: j < jobs,
      }));
      const stock = [];
      for (const p of components.slice(0, jobs)) {
        const shape = jumper
          ? 'jumper'
          : rule === 'shape'
            ? p.shape
            : W.SHAPES[(W.SHAPES.indexOf(p.shape) + 1) % 3];
        const color = jumper
          ? 'cyan'
          : rule === 'color'
            ? p.color
            : W.PALETTE[(W.PALETTE.findIndex((c) => c.id === p.color) + 1) % 3].id;
        const existing = stock.find((s) => s.shape === shape && s.color === color);
        if (existing) existing.qty++;
        else stock.push({ id: `S${stock.length + 1}`, shape, color, qty: 1 });
      }
      if (!jumper) {
        const required = components.slice(0, jobs),
          shape = W.SHAPES.find((shape) => !required.some((p) => p.shape === shape)),
          color = W.PALETTE.find((color) => !required.some((p) => p.color === color.id)).id;
        stock.push({ id: `S${stock.length + 1}`, shape, color });
      }
      for (let j = stock.length - 1; j > 0; j--) {
        const k = Math.floor(trayRng() * (j + 1));
        [stock[j], stock[k]] = [stock[k], stock[j]];
      }
      return {
        id: `B${i + 1}`,
        name: `${String.fromCharCode(65 + digit)}${pack + 1} · ${sectors[pack]}`,
        digit,
        mask,
        reward: mask.map((cell) => [cell, W.GLYPHS[code[digit]][cell]]),
        rule,
        ruleKnown: jumper,
        stock,
        components,
        order: components.slice(0, jobs).map((c) => c.id),
        job: 0,
        revision: 0,
        owner: null,
        held: null,
        hold: null,
        fault: null,
        heat: 0,
        fire: false,
        done: false,
        tests: [],
        lessonFire: def.id === 'relay' && i === 0,
        fireLessonDone: false,
      };
    });
    const party = Math.min(4, Math.max(1, seats.length)),
      duration = (opts.dispatch ? 165 : def.minutes[party - 1] * 60) * (opts.fuseScale || 1);
    return {
      version: W.CONTENT,
      id: `${def.id}:${seed}`,
      caseId: def.id,
      seed: String(seed),
      theme: def.theme,
      seats: [...seats],
      party,
      duration,
      remaining: duration,
      time: 0,
      code,
      evidence: code.map(() => Array(20).fill(-1)),
      boards,
      outcome: null,
      proposal: null,
      errors: 0,
      completed: 0,
      modified: false,
      assisted: false,
      revision: 0,
      events: [],
      eventSeq: 0,
      seen: {},
      tuning: { ...W.DEFAULTS },
      dispatch: !!opts.dispatch,
    };
  };
  W.validateBoard = (b) => {
    const errors = [],
      ids = new Set();
    if (!b || !Array.isArray(b.components) || !Array.isArray(b.order) || !Array.isArray(b.stock))
      return ['Missing components, order, or stock'];
    if (!['shape', 'color'].includes(b.rule)) errors.push('Rule must be shape or color');
    for (const p of b.components) {
      if (ids.has(p.id)) errors.push(`Duplicate component ${p.id}`);
      ids.add(p.id);
      if (
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 28 ||
        p.x > 256 ||
        p.y < 32 ||
        p.y > 164
      )
        errors.push(`Unreachable socket ${p.id}`);
      if (
        !p.anchors ||
        p.anchors.length !== 2 ||
        p.anchors.some(
          (a) => a.length !== 2 || a.some((n) => !Number.isFinite(n) || Math.abs(n) > 26),
        )
      )
        errors.push(`Invalid terminal anchors ${p.id}`);
      else if (
        p.anchors.some(
          ([dx, dy]) => p.x + dx < 5 || p.x + dx > 275 || p.y + dy < 5 || p.y + dy > 165,
        )
      )
        errors.push(`Unreachable terminal ${p.id}`);
    }
    for (let i = 0; i < b.components.length; i++)
      for (let j = i + 1; j < b.components.length; j++)
        if (
          Math.abs(b.components[i].x - b.components[j].x) < 48 &&
          Math.abs(b.components[i].y - b.components[j].y) < 26
        )
          errors.push(`Overlapping sockets ${b.components[i].id} and ${b.components[j].id}`);
    if (!b.order.length || new Set(b.order).size !== b.order.length)
      errors.push('Order must contain distinct jobs');
    for (const id of b.order) {
      const p = b.components.find((c) => c.id === id);
      if (!p) errors.push(`Unknown order reference ${id}`);
      else if (!b.stock.some((s) => W.matches(p, s, b.rule)))
        errors.push(`No replacement for ${id}`);
      else if (b.stock.filter((s) => W.matches(p, s, b.rule)).length !== 1)
        errors.push(`Ambiguous replacement for ${id}`);
    }
    for (const spare of b.stock) {
      const needed = b.order
        .map((id) => b.components.find((p) => p.id === id))
        .filter((p) => p && W.matches(p, spare, b.rule)).length;
      if (needed > (spare.qty || 1)) errors.push(`Insufficient stock of ${spare.id}`);
    }
    if (
      !Array.isArray(b.mask) ||
      !b.mask.length ||
      b.mask.some((i) => !Number.isInteger(i) || i < 0 || i > 19)
    )
      errors.push('Evidence mask must contain cells 0–19');
    return errors;
  };
  W.validateCase = (s) => {
    const errors = [];
    for (const b of s.boards) errors.push(...W.validateBoard(b).map((e) => `${b.id}: ${e}`));
    for (let d = 0; d < s.code.length; d++) {
      const cells = Array(20).fill(-1);
      for (const b of s.boards.filter((b) => b.digit === d))
        for (const [i, v] of b.reward) cells[i] = v;
      if (W.candidates(cells).length !== 1)
        errors.push(`Digit ${d + 1} has no guaranteed unique solution`);
    }
    return errors;
  };
})();
