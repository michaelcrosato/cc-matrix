(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // src/app.js
  var exports_app = {};
  __export(exports_app, {
    App: () => App
  });

  // src/content.js
  var FIELD = Object.freeze({ width: 480, height: 270, left: 18, right: 462, top: 30, bottom: 258, breach: 230, shipY: 246 });
  var TUNING = Object.freeze([
    { key: "playerSpeed", label: "Cannon speed", min: 70, max: 280, step: 5, default: 155, description: "Horizontal cannon movement, logical pixels per second." },
    { key: "shotRecovery", label: "Shot recovery", min: 0.1, max: 0.8, step: 0.02, default: 0.28, description: "Seconds between launches; two missiles per cannon remain the limit." },
    { key: "marchInterval", label: "March interval", min: 0.12, max: 1.2, step: 0.02, default: 0.66, description: "Opening beat length; surviving troops accelerate from this value." },
    { key: "descent", label: "Reversal descent", min: 2, max: 16, step: 1, default: 7, description: "Pixels descended whenever the living formation reverses." },
    { key: "fireInterval", label: "Volley interval", min: 0.8, max: 5, step: 0.1, default: 2.8, description: "Seconds between enemy attack orders; authored recovery windows still apply." },
    { key: "playerShotSpeed", label: "Missile speed", min: 100, max: 400, step: 10, default: 195, description: "Upward missile speed; applies to all missiles immediately." },
    { key: "bombSpeed", label: "Enemy bomb speed", min: 35, max: 160, step: 5, default: 67, description: "Falling bomb speed; broad bombs are a little slower. Applies immediately." },
    { key: "salvageEvery", label: "Salvage cadence", min: 1, max: 8, step: 1, default: 4, description: "Every N ordinary formation kills releases guaranteed salvage." },
    { key: "repairYield", label: "Repair cells", min: 8, max: 64, step: 2, default: 26, description: "Maximum missing bunker cells restored by one charge." },
    { key: "bossHealth", label: "Flagship core health", min: 8, max: 60, step: 2, default: 26, description: "Core maximum health. Live change preserves its damaged proportion; emitters use one third." }
  ]);
  var DIFFICULTIES = Object.freeze([
    { name: "CADET", description: "Broad recovery windows. The full campaign.", march: 1.2, fire: 1.3, bomb: 0.83, descent: 0.8, boss: 0.77 },
    { name: "STANDARD", description: "The intended planetary defense.", march: 1, fire: 1, bomb: 1, descent: 1, boss: 1 },
    { name: "VETERAN", description: "A more impatient sky.", march: 0.85, fire: 0.84, bomb: 1.12, descent: 1.12, boss: 1.15 },
    { name: "PANIC", description: "Keep a lane. Keep your nerve.", march: 0.72, fire: 0.7, bomb: 1.24, descent: 1.28, boss: 1.3 }
  ]);
  var LOCATIONS = Object.freeze([
    { name: "TIDAL OUTPOST", short: "01 / TIDAL OUTPOST", palette: ["#08192d", "#193a50", "#54e5d1", "#f8b86d"], alert: "KEEP THE SKY OFF OUR BEACH." },
    { name: "EMBER FOUNDRY", short: "02 / EMBER FOUNDRY", palette: ["#201128", "#52263e", "#ffa76b", "#e464b6"], alert: "HOT METAL. COOL HEADS." },
    { name: "AURORA CITADEL", short: "03 / AURORA CITADEL", palette: ["#141831", "#343455", "#b7a3ff", "#7ef5d9"], alert: "LAST WALL. BIG ATTITUDE." }
  ]);
  var WAVES = Object.freeze([
    { name: "THE DOORBELL", location: 0, startY: 46, spacingX: 40, spacingY: 20, rows: ["00000000", "00000000", "00000000", "00000000"], march: 1, fire: 1.2, volley: 1, telegraph: 0.8, saucerAt: 999, recoveryEvery: 4, recoveryFor: 2.1, alert: "MOVE. FIRE. CUT YOUR OWN FIRING LANE." },
    { name: "CHEEKY VISITORS", location: 0, startY: 50, spacingX: 40, spacingY: 20, rows: ["00000000", "00.00.00", "00000000", "00000000"], march: 0.95, fire: 1.08, volley: 2, telegraph: 0.78, saucerAt: 8, recoveryEvery: 4, recoveryFor: 2, alert: "BONUS SAUCER INBOUND. RISK THE OPEN SKY?" },
    { name: "TIN HATS", location: 1, startY: 54, spacingX: 40, spacingY: 20, rows: ["00A00A00", "00000000", "0A0000A0", "00000000"], march: 0.92, fire: 1, volley: 2, telegraph: 0.78, saucerAt: 15, recoveryEvery: 4, recoveryFor: 2, alert: "ARMOURED CONTACTS. CRACK, THEN ZAP." },
    { name: "RAIN CHECK", location: 1, startY: 58, spacingX: 40, spacingY: 20, rows: ["0B0000B0", "00A00A00", "00000000", "0B0000B0"], march: 0.88, fire: 0.95, volley: 2, telegraph: 0.92, saucerAt: 13, recoveryEvery: 3, recoveryFor: 2.4, alert: "BROAD BOMBS. REPAIR BEFORE THE RAIN." },
    { name: "RUDE COMPANY", location: 2, startY: 64, spacingX: 40, spacingY: 20, rows: ["A0B00B0A", "0A.00.A0", "0B0AA0B0", "00000000"], march: 0.84, fire: 0.92, volley: 3, telegraph: 0.88, saucerAt: 11, recoveryEvery: 3, recoveryFor: 2.8, alert: "PICK YOUR TARGET. KEEP YOUR COVER." },
    { name: "THE LAST WORD", location: 2, startY: 70, spacingX: 40, spacingY: 20, rows: ["AB0AA0BA", "0B0AA0B0", "AA0000AA", "0B0000B0"], march: 0.8, fire: 0.88, volley: 3, telegraph: 0.9, saucerAt: 9, recoveryEvery: 3, recoveryFor: 2.8, alert: "HOLD THE BREACH. MAKE EVERY REPAIR COUNT." }
  ]);
  function tuningForDifficulty(index = 1) {
    const d = DIFFICULTIES[Math.max(0, Math.min(3, Math.trunc(index)))];
    const t = Object.fromEntries(TUNING.map((v) => [v.key, v.default]));
    t.marchInterval *= d.march;
    t.fireInterval *= d.fire;
    t.bombSpeed *= d.bomb;
    t.descent *= d.descent;
    t.bossHealth = Math.round(t.bossHealth * d.boss);
    return t;
  }
  function validateContent() {
    if (WAVES.length !== 6)
      throw new Error("Campaign requires six formations.");
    WAVES.forEach((w, i) => {
      if (w.rows.length !== 4 || w.rows.some((row) => row.length !== 8 || /[^0AB.]/.test(row)))
        throw new Error(`Formation ${i + 1}: expected four eight-character rows using 0/A/B/.`);
      if (!LOCATIONS[w.location] || !Number.isFinite(w.startY) || w.startY < 32 || w.startY > 100)
        throw new Error(`Formation ${i + 1}: invalid location or starting height.`);
    });
    TUNING.forEach((t) => {
      if (!(t.min < t.max && t.default >= t.min && t.default <= t.max && t.step > 0))
        throw new Error(`Invalid tuning bounds: ${t.key}`);
    });
    return true;
  }
  validateContent();

  // src/sim.js
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  var finite = (v, d = 0) => Number.isFinite(v) ? v : d;
  function random(world) {
    world.rng = world.rng + 1831565813 >>> 0;
    let t = world.rng;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function event(w, type, more = {}) {
    const e = { id: ++w.eventSeq, tick: w.tick, type, ...more };
    w.events.push(e);
    return e;
  }
  function makeBunker(center, index) {
    const cols = 16, rows = 8, cell = 3, original = [];
    for (let row = 0;row < rows; row++)
      for (let col = 0;col < cols; col++)
        original.push(row === 0 && (col < 3 || col > 12) || row === 1 && (col < 1 || col > 14) || row >= 5 && col >= 6 && col <= 9 ? 0 : 1);
    return { id: index, x: center - cols * cell / 2, y: 202, center, cols, rows, cell, original, mask: original.slice(), growth: [] };
  }
  function createWorld({ seed = 301681, players = 1, difficulty = 1, ids } = {}) {
    difficulty = clamp(Math.trunc(finite(difficulty, 1)), 0, 3);
    players = clamp(Math.trunc(finite(players, 1)), 1, 2);
    seed = finite(seed, 301681) >>> 0;
    const w = { version: 1, tick: 0, time: 0, seed, rng: seed, epoch: 0, entitySeq: 0, eventSeq: 0, encounter: 0, location: 0, status: "playing", reason: "", score: 0, reserve: players * 2, extraAwarded: false, assisted: false, difficulty, tuning: tuningForDifficulty(difficulty), players: [], enemies: [], bullets: [], pickups: [], bunkers: [80, 186, 294, 400].map(makeBunker), formation: null, boss: null, saucer: null, events: [], encounterTime: 0, transitionTime: 0, nextEncounter: null, killCount: 0, fireTimer: 3.6, volleyCount: 0, saucerTimer: 0, bossDropTimer: 0, invulnerable: false, intro: { moved: false, fired: false, eroded: false, collected: false, repaired: false }, stats: { shots: 0, hits: 0, losses: 0, armourHits: 0, bombsStopped: 0, cellsLost: 0, cellsRepaired: 0, salvageCaught: 0, saucers: 0, phases: [], encounters: [] } };
    for (let seat = 0;seat < players; seat++)
      w.players.push({ seat, id: ids?.[seat] ?? `p${seat + 1}`, x: players === 1 ? 240 : seat === 0 ? 186 : 294, y: FIELD.shipY, alive: true, active: true, gone: false, respawn: 0, protected: 2.4, charges: 0, score: 0, kills: 0, repairs: 0, recovery: 0, recoil: 0, feedback: "", feedbackTime: 0, deploymentPaid: false });
    startEncounter(w, 0);
    return w;
  }
  function positions(w) {
    for (const e of w.enemies) {
      e.x = w.formation.startX + e.col * w.formation.spacingX + w.formation.x;
      e.y = w.formation.y + e.row * w.formation.spacingY;
    }
  }
  function startEncounter(w, index) {
    index = clamp(Math.trunc(finite(index)), 0, 6);
    w.epoch++;
    w.encounter = index;
    w.location = Math.min(2, Math.floor(index / 2));
    w.encounterTime = 0;
    w.transitionTime = 0;
    w.nextEncounter = null;
    w.status = "playing";
    w.reason = "";
    w.enemies = [];
    w.bullets = [];
    w.boss = null;
    w.saucer = null;
    w.fireTimer = index === 0 ? 4.5 : 3.4;
    w.volleyCount = 0;
    w.saucerTimer = index < 6 ? WAVES[index].saucerAt : 12;
    w.bossDropTimer = 6;
    for (const p of w.players) {
      p.protected = Math.max(p.protected, p.alive ? 2.4 : 0);
      p.recovery = 0;
    }
    if (index < 6) {
      const d = WAVES[index];
      w.formation = { x: 0, y: d.startY, dir: 1, timer: 0, beat: 0, initial: 0, interval: w.tuning.marchInterval * d.march, startX: 100, spacingX: d.spacingX, spacingY: d.spacingY };
      d.rows.forEach((row, r) => [...row].forEach((type, col) => {
        if (type !== ".")
          w.enemies.push({ id: ++w.entitySeq, row: r, col, x: 0, y: 0, type: type === "A" ? "armour" : type === "B" ? "bombardier" : "ordinary", hp: type === "A" ? 2 : 1, maxHp: type === "A" ? 2 : 1, telegraph: 0, flash: 0, shotPending: false, attackKind: "bomb" });
      }));
      w.formation.initial = w.enemies.length;
      positions(w);
    } else {
      const hp = w.tuning.bossHealth, ehp = Math.max(3, Math.round(hp / 3));
      w.formation = null;
      w.boss = { x: 240, y: 68, phase: 1, emitters: [{ x: 192, y: 76, hp: ehp, maxHp: ehp, open: true, telegraph: 0 }, { x: 288, y: 76, hp: ehp, maxHp: ehp, open: false, telegraph: 0 }], hp, maxHp: hp, open: false, cycle: 0, safeLane: 240, safeWidth: 82, telegraph: 0, age: 0, phaseTime: 0, hit: 0, attackTimer: 4.5, attackPending: false };
    }
    if (!w.stats.encounters.includes(index))
      w.stats.encounters.push(index);
    event(w, "stage", { encounter: index, location: w.location });
    return w;
  }
  function setTuning(w, key, value) {
    const t = TUNING.find((t2) => t2.key === key);
    if (!t || !Number.isFinite(value))
      return false;
    value = clamp(value, t.min, t.max);
    if (t.step >= 1)
      value = Math.round(value);
    const old = w.tuning[key];
    w.tuning[key] = value;
    w.assisted = true;
    if (key === "bossHealth" && w.boss) {
      const b = w.boss;
      b.hp = Math.max(0, Math.ceil(b.hp / Math.max(1, b.maxHp) * value));
      b.maxHp = value;
      const ehp = Math.max(3, Math.round(value / 3));
      for (const e of b.emitters) {
        e.hp = Math.max(0, Math.ceil(e.hp / Math.max(1, e.maxHp) * ehp));
        e.maxHp = ehp;
      }
    }
    return old !== value;
  }
  function resetTuning(w) {
    w.tuning = tuningForDifficulty(w.difficulty);
    w.assisted = true;
    return w.tuning;
  }
  function playerFeedback(w, p, text) {
    p.feedback = text;
    p.feedbackTime = 1.2;
    event(w, "feedback", { seat: p.seat, x: p.x, y: p.y, text });
  }
  function apertureColumns(w, b) {
    const cols = [];
    for (const p of w.players)
      if (p.active && p.alive && p.x + 0.9 >= b.x && p.x - 0.9 <= b.x + b.cols * b.cell) {
        const lo = clamp(Math.floor((p.x - b.x - 0.9) / b.cell), 0, b.cols - 1), hi = clamp(Math.floor((p.x - b.x + 0.9) / b.cell), 0, b.cols - 1);
        for (let c = lo;c <= hi; c++)
          if (!cols.includes(c))
            cols.push(c);
      }
    return cols;
  }
  function repairPreview(w, seat) {
    const p = w.players[seat];
    if (!p || !p.active || !p.alive)
      return { bunker: -1, cells: [], usable: false, reason: "NO CANNON" };
    let bi = 0;
    for (let i = 1;i < w.bunkers.length; i++)
      if (Math.abs(w.bunkers[i].center - p.x) < Math.abs(w.bunkers[bi].center - p.x))
        bi = i;
    const b = w.bunkers[bi], apertures = apertureColumns(w, b), cells = [];
    for (let i = 0;i < b.mask.length; i++)
      if (b.original[i] && !b.mask[i] && !apertures.includes(i % b.cols))
        cells.push(i);
    cells.sort((a, z) => {
      const ac = a % b.cols, zc = z % b.cols, ar = Math.floor(a / b.cols), zr = Math.floor(z / b.cols);
      const da = Math.abs(b.x + (ac + 0.5) * b.cell - p.x) + Math.abs(ar - 3.5) * 1.8, dz = Math.abs(b.x + (zc + 0.5) * b.cell - p.x) + Math.abs(zr - 3.5) * 1.8;
      return da - dz || a - z;
    });
    const bounded = cells.slice(0, Math.round(w.tuning.repairYield));
    return { bunker: bi, cells: bounded, usable: p.charges > 0 && bounded.length > 0, reason: p.charges <= 0 ? "CATCH SALVAGE" : bounded.length ? "REPAIR READY" : b.mask.some((v, i) => b.original[i] && !v) ? "FIRING LANE KEPT OPEN" : "COVER INTACT" };
  }
  function repair(w, seat) {
    const p = w.players[seat], target = repairPreview(w, seat);
    if (!p)
      return false;
    if (!target.usable) {
      playerFeedback(w, p, target.reason);
      return false;
    }
    const b = w.bunkers[target.bunker];
    p.charges--;
    p.repairs++;
    w.intro.repaired = true;
    for (const i of target.cells) {
      b.mask[i] = 1;
      b.growth.push({ cell: i, time: 0.4 });
    }
    w.stats.cellsRepaired += target.cells.length;
    event(w, "repair", { x: b.center, y: b.y + 10, seat, cells: target.cells.length, bunker: target.bunker });
    return true;
  }
  function clearShot(w, x) {
    for (const b of w.bunkers)
      if (x + 0.8 >= b.x && x - 0.8 <= b.x + b.cols * b.cell) {
        const lo = clamp(Math.floor((x - b.x - 0.8) / b.cell), 0, b.cols - 1), hi = clamp(Math.floor((x - b.x + 0.8) / b.cell), 0, b.cols - 1);
        for (let c = lo;c <= hi; c++)
          for (let r = 0;r < b.rows; r++)
            if (b.mask[r * b.cols + c])
              return false;
      }
    return true;
  }
  function award(w, seat, value) {
    w.score += value;
    const p = w.players[seat];
    if (p)
      p.score += value;
    if (!w.extraAwarded && w.score >= 1000) {
      w.extraAwarded = true;
      w.reserve++;
      event(w, "extra", { x: 240, y: 36, value: 1 });
    }
  }
  function pickup(w, x, y, reason = "kill") {
    w.pickups.push({ id: ++w.entitySeq, x: clamp(x, FIELD.left + 5, FIELD.right - 5), y, life: 9, reason });
    event(w, "drop", { x, y, reason });
  }
  function enemyKilled(w, e, owner) {
    const i = w.enemies.indexOf(e);
    if (i < 0)
      return;
    w.enemies.splice(i, 1);
    const value = (4 - e.row) * 10;
    award(w, owner, value);
    w.killCount++;
    const p = w.players[owner];
    if (p) {
      p.kills++;
    }
    w.stats.hits++;
    event(w, "kill", { x: e.x, y: e.y, seat: owner, enemyType: e.type, row: e.row, value });
    if (w.killCount % Math.round(w.tuning.salvageEvery) === 0)
      pickup(w, e.x, e.y);
  }
  function killPlayer(w, seat) {
    const p = w.players[seat];
    if (!p || !p.active || !p.alive || p.protected > 0 || w.invulnerable)
      return false;
    p.alive = false;
    p.respawn = 0;
    p.recovery = 0;
    p.recoil = 0;
    p.deploymentPaid = false;
    w.stats.losses++;
    event(w, "loss", { x: p.x, y: p.y, seat });
    return true;
  }
  function scheduleRespawns(w) {
    for (const p of w.players)
      if (p.active && !p.alive && p.respawn <= 0 && w.reserve > 0) {
        w.reserve--;
        p.respawn = 1.05;
        p.deploymentPaid = true;
      }
  }
  function leaveSeat(w, seat) {
    const p = w.players[seat];
    if (!p)
      return false;
    p.active = false;
    p.gone = true;
    p.alive = false;
    p.respawn = 0;
    p.deploymentPaid = false;
    event(w, "leave", { seat, x: p.x, y: p.y });
    return true;
  }
  function updatePlayers(w, commands, dt) {
    for (const p of w.players) {
      p.protected = Math.max(0, p.protected - dt);
      p.recovery = Math.max(0, p.recovery - dt);
      p.recoil = Math.max(0, p.recoil - dt);
      p.feedbackTime = Math.max(0, p.feedbackTime - dt);
      if (!p.active)
        continue;
      if (!p.alive) {
        if (p.respawn > 0) {
          p.respawn = Math.max(0, p.respawn - dt);
          if (p.respawn === 0) {
            p.alive = true;
            p.protected = 2.2;
            p.recovery = 0;
            p.deploymentPaid = false;
            event(w, "respawn", { x: p.x, y: p.y, seat: p.seat });
          }
        }
        continue;
      }
      const c = commands[p.seat] || {}, start = p.x;
      let move = clamp(finite(c.move), -1, 1);
      if (Math.abs(move) < 0.03 && Number.isFinite(c.targetX)) {
        const delta = clamp(c.targetX, FIELD.left, FIELD.right) - p.x;
        move = clamp(delta / (w.tuning.playerSpeed * dt), -1, 1);
      }
      p.x = clamp(p.x + move * w.tuning.playerSpeed * dt, FIELD.left, FIELD.right);
      if (Math.abs(p.x - start) > 0.1)
        w.intro.moved = true;
      if (c.fire && w.status === "playing" && p.recovery <= 0 && w.bullets.filter((b) => b.owner === p.seat).length < 2) {
        w.bullets.push({ id: ++w.entitySeq, x: p.x, y: p.y - 9, vy: -w.tuning.playerShotSpeed, owner: p.seat, kind: "shot", r: 0.8 });
        p.recovery = w.tuning.shotRecovery;
        p.recoil = 0.12;
        w.intro.fired = true;
        w.stats.shots++;
        event(w, "shot", { x: p.x, y: p.y - 8, seat: p.seat });
      }
    }
  }
  function updateRepairs(w, commands) {
    for (const p of w.players)
      if (p.active && p.alive && commands[p.seat]?.repair)
        repair(w, p.seat);
  }
  function formationStep(w, dt) {
    const f = w.formation;
    if (!f || !w.enemies.length)
      return;
    const d = WAVES[w.encounter], ratio = w.enemies.length / f.initial;
    f.interval = Math.max(0.085, w.tuning.marchInterval * d.march * (0.19 + 0.81 * ratio));
    f.timer += dt;
    while (f.timer >= f.interval) {
      f.timer -= f.interval;
      f.beat++;
      const left = Math.min(...w.enemies.map((e) => e.x - 7)), right = Math.max(...w.enemies.map((e) => e.x + 7)), step = 4;
      if (f.dir > 0 && right + step > FIELD.right - 2 || f.dir < 0 && left - step < FIELD.left + 2) {
        f.dir *= -1;
        f.y += w.tuning.descent;
        event(w, "reverse", { x: f.x, y: f.y });
      } else
        f.x += f.dir * step;
      positions(w);
      event(w, "march", { beat: f.beat, remaining: w.enemies.length });
      if (w.enemies.some((e) => e.y + 6 >= FIELD.breach)) {
        w.status = "defeat";
        w.reason = "BREACH — THE SKY CROSSED THE LINE";
        event(w, "defeat", { reason: "breach" });
        return;
      }
    }
  }
  function exposedEnemies(w) {
    const exposed = [];
    for (let col = 0;col < 8; col++) {
      const es = w.enemies.filter((e) => e.col === col);
      if (es.length)
        exposed.push(es.reduce((a, b) => a.y > b.y ? a : b));
    }
    return exposed;
  }
  function addBomb(w, x, y, kind = "bomb") {
    if (w.bullets.filter((b) => b.owner < 0).length >= 12)
      return;
    w.bullets.push({ id: ++w.entitySeq, x, y, vy: w.tuning.bombSpeed * (kind === "heavy" ? 0.8 : 1), owner: -1, kind, r: kind === "heavy" ? 3.6 : 1.7 });
    event(w, "volley", { x, y, kind });
  }
  function enemyAttacks(w, dt) {
    const d = WAVES[w.encounter];
    for (const e of w.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      if (e.shotPending) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          e.telegraph = 0;
          e.shotPending = false;
          addBomb(w, e.x, e.y + 7, e.attackKind);
        }
      }
    }
    w.fireTimer -= dt;
    if (w.fireTimer > 0 || w.encounterTime < 3.2)
      return;
    const active = w.players.filter((p) => p.active).length;
    const extra = active > 1 ? 1 : 0;
    let exposed = exposedEnemies(w).filter((e) => !e.shotPending);
    const parity = w.volleyCount % 2;
    const preferred = exposed.filter((e) => e.col % 2 === parity);
    if (preferred.length)
      exposed = preferred;
    for (let i = exposed.length - 1;i > 0; i--) {
      const j = Math.floor(random(w) * (i + 1));
      [exposed[i], exposed[j]] = [exposed[j], exposed[i]];
    }
    const count = Math.min(exposed.length, d.volley + extra, w.bullets.filter((b) => b.owner < 0).length >= 7 ? 0 : 3);
    for (let i = 0;i < count; i++) {
      const e = exposed[i];
      e.shotPending = true;
      e.attackKind = e.type === "bombardier" ? "heavy" : "bomb";
      e.telegraph = d.telegraph + (e.type === "bombardier" ? 0.3 : 0);
      event(w, "telegraph", { x: e.x, y: e.y, kind: e.attackKind, duration: e.telegraph });
    }
    w.volleyCount++;
    w.fireTimer = w.tuning.fireInterval * d.fire;
    if (w.volleyCount % d.recoveryEvery === 0)
      w.fireTimer += d.recoveryFor;
  }
  function spawnSaucer(w) {
    if (w.saucer)
      return false;
    const dir = w.volleyCount % 2 === 0 ? 1 : -1;
    w.saucer = { id: ++w.entitySeq, x: dir > 0 ? -20 : 500, y: 36, dir, age: 0, value: [100, 200, 300][Math.floor(random(w) * 3)] };
    event(w, "saucer", { x: w.saucer.x, y: 36 });
    return true;
  }
  function spawnEnemy(w, type = "ordinary") {
    if (w.encounter >= 6)
      return false;
    type = ["ordinary", "armour", "bombardier"].includes(type) ? type : "ordinary";
    let row = 0, col = 0;
    for (let r = 0;r < 4; r++)
      for (let c = 0;c < 8; c++)
        if (!w.enemies.some((e) => e.row === r && e.col === c)) {
          row = r;
          col = c;
          break;
        }
    if (w.enemies.some((e) => e.row === row && e.col === col))
      return false;
    const hp = type === "armour" ? 2 : 1;
    w.enemies.push({ id: ++w.entitySeq, row, col, x: 0, y: 0, type, hp, maxHp: hp, telegraph: 0, flash: 0, shotPending: false, attackKind: "bomb" });
    w.formation.initial = Math.max(w.formation.initial, w.enemies.length);
    positions(w);
    return true;
  }
  function updateSaucer(w, dt) {
    if (!w.saucer) {
      w.saucerTimer -= dt;
      if (w.saucerTimer <= 0) {
        spawnSaucer(w);
        w.saucerTimer = 28;
      }
      return;
    }
    const s = w.saucer;
    s.age += dt;
    s.x += s.dir * 31 * dt;
    s.y = 36 + Math.sin(s.age * 5) * 1.5;
    if (s.x < -24 || s.x > 504) {
      pickup(w, clamp(s.x, 40, 440), 34, "saucer-trail");
      w.saucer = null;
    }
  }
  function bossStep(w, dt) {
    const b = w.boss;
    if (!b)
      return;
    b.age += dt;
    b.phaseTime += dt;
    b.hit = Math.max(0, b.hit - dt);
    if (b.phase === 1) {
      b.x = 240 + Math.sin(b.age * 0.38) * 94;
      for (let i = 0;i < 2; i++) {
        const e = b.emitters[i];
        e.x = b.x + (i === 0 ? -48 : 48);
        e.y = b.y + 8;
        e.open = e.hp > 0 && (b.phaseTime + i * 2.5) % 5 < 3.2;
        e.telegraph = e.hp > 0 && b.attackPending && b.cycle % 2 === i ? b.telegraph : 0;
      }
      b.open = false;
    } else {
      const target = clamp(b.safeLane, 86, 394);
      b.x += clamp(target - b.x, -45 * dt, 45 * dt);
      b.open = b.phaseTime % 6 > 1.1 && b.phaseTime % 6 < 4.9;
    }
    b.attackTimer -= dt;
    if (b.attackTimer <= 0 && !b.attackPending) {
      b.attackPending = true;
      b.telegraph = b.phase === 1 ? 1 : 1.35;
      b.cycle++;
      if (b.phase === 2)
        b.safeLane = 48 + 96 * ((b.cycle * 2 + 2) % 5);
      event(w, "telegraph", { x: b.phase === 1 ? b.emitters[b.cycle % 2].x : b.safeLane, y: b.y, kind: b.phase === 1 ? "heavy" : "lanes", duration: b.telegraph });
    }
    if (b.attackPending) {
      b.telegraph -= dt;
      if (b.telegraph <= 0) {
        b.attackPending = false;
        b.telegraph = 0;
        if (b.phase === 1) {
          const side = b.cycle % 2, x = b.emitters[side].x;
          for (const offset of [-22, 0, 22])
            addBomb(w, clamp(x + offset, 24, 456), b.y + 18, offset === 0 ? "heavy" : "bomb");
          b.attackTimer = 3.8;
        } else {
          for (let x = 24;x <= 456; x += 36)
            if (Math.abs(x - b.safeLane) > b.safeWidth / 2)
              addBomb(w, x, b.y + 18, x / 36 % 2 === 0 ? "heavy" : "bomb");
          b.attackTimer = 4.4;
        }
      }
    }
    w.bossDropTimer -= dt;
    if (w.bossDropTimer <= 0) {
      pickup(w, 48 + 384 * random(w), 112, "flagship");
      w.bossDropTimer = 7;
    }
  }
  function sweepY(x, y, ny, r, left, top, right, bottom) {
    if (x + r < left || x - r > right)
      return null;
    top -= r;
    bottom += r;
    if (y >= top && y <= bottom)
      return 0;
    const dy = ny - y;
    if (dy > 0 && y < top && ny >= top)
      return (top - y) / dy;
    if (dy < 0 && y > bottom && ny <= bottom)
      return (bottom - y) / dy;
    return null;
  }
  function crater(w, b, x, y, r, owner) {
    let removed = 0;
    const debris = [];
    for (let row = 0;row < b.rows; row++)
      for (let col = 0;col < b.cols; col++) {
        const i = row * b.cols + col;
        if (!b.mask[i])
          continue;
        const cx = b.x + (col + 0.5) * b.cell, cy = b.y + (row + 0.5) * b.cell;
        if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) {
          b.mask[i] = 0;
          removed++;
          debris.push([cx, cy]);
        }
      }
    if (!removed) {
      const col = clamp(Math.floor((x - b.x) / b.cell), 0, b.cols - 1), row = clamp(Math.floor((y - b.y) / b.cell), 0, b.rows - 1), i = row * b.cols + col;
      if (b.mask[i]) {
        b.mask[i] = 0;
        removed++;
        debris.push([b.x + (col + 0.5) * b.cell, b.y + (row + 0.5) * b.cell]);
      }
    }
    w.stats.cellsLost += removed;
    if (owner >= 0)
      w.intro.eroded = true;
    else
      w.stats.bombsStopped++;
    if (removed)
      event(w, "erode", { x, y, bunker: b.id, owner, cells: removed, debris });
  }
  function bulletStep(w, dt) {
    const keep = [];
    for (const shot of w.bullets) {
      const oldY = shot.y;
      shot.vy = shot.owner >= 0 ? -w.tuning.playerShotSpeed : w.tuning.bombSpeed * (shot.kind === "heavy" ? 0.8 : 1);
      const newY = oldY + shot.vy * dt;
      let hit = null;
      const consider = (kind, obj, t, extra) => {
        if (t !== null && t >= 0 && t <= 1 && (!hit || t < hit.t - 0.000000001)) {
          hit = { kind, obj, t, ...extra };
        }
      };
      for (const b of w.bunkers) {
        if (shot.x + shot.r < b.x || shot.x - shot.r > b.x + b.cols * b.cell || Math.max(oldY, newY) + shot.r < b.y || Math.min(oldY, newY) - shot.r > b.y + b.rows * b.cell)
          continue;
        const lo = clamp(Math.floor((shot.x - shot.r - b.x) / b.cell), 0, b.cols - 1), hi = clamp(Math.floor((shot.x + shot.r - b.x) / b.cell), 0, b.cols - 1);
        for (let row = 0;row < b.rows; row++)
          for (let col = lo;col <= hi; col++) {
            const i = row * b.cols + col;
            if (b.mask[i])
              consider("bunker", b, sweepY(shot.x, oldY, newY, shot.r, b.x + col * b.cell, b.y + row * b.cell, b.x + (col + 1) * b.cell, b.y + (row + 1) * b.cell), { cell: i });
          }
      }
      if (shot.owner >= 0) {
        for (const e of w.enemies)
          consider("enemy", e, sweepY(shot.x, oldY, newY, shot.r, e.x - 7, e.y - 5, e.x + 7, e.y + 6));
        if (w.saucer)
          consider("saucer", w.saucer, sweepY(shot.x, oldY, newY, shot.r, w.saucer.x - 12, w.saucer.y - 4, w.saucer.x + 12, w.saucer.y + 4));
        if (w.boss) {
          const b = w.boss;
          if (b.phase === 1) {
            for (const e of b.emitters)
              if (e.hp > 0)
                consider("emitter", e, sweepY(shot.x, oldY, newY, shot.r, e.x - 11, e.y - 7, e.x + 11, e.y + 8));
          } else
            consider("core", b, sweepY(shot.x, oldY, newY, shot.r, b.x - 13, b.y - 5, b.x + 13, b.y + 14));
          consider("hull", b, sweepY(shot.x, oldY, newY, shot.r, b.x - 74, b.y - 17, b.x + 74, b.y + 1));
        }
      } else
        for (const p of w.players)
          if (p.active && p.alive)
            consider("player", p, sweepY(shot.x, oldY, newY, shot.r, p.x - 5, p.y - 5, p.x + 5, p.y + 4));
      if (hit) {
        shot.y = oldY + (newY - oldY) * hit.t;
        if (hit.kind === "bunker") {
          const { obj: b, cell: i } = hit, c = i % b.cols, r = Math.floor(i / b.cols);
          crater(w, b, b.x + (c + 0.5) * b.cell, b.y + (r + 0.5) * b.cell, shot.owner >= 0 ? 3.9 : shot.kind === "heavy" ? 11.5 : 6.4, shot.owner);
        } else if (hit.kind === "enemy") {
          const e = hit.obj;
          e.hp--;
          if (e.hp <= 0)
            enemyKilled(w, e, shot.owner);
          else {
            e.flash = 0.18;
            w.stats.armourHits++;
            w.stats.hits++;
            event(w, "armour", { x: e.x, y: e.y, seat: shot.owner });
          }
        } else if (hit.kind === "saucer") {
          const s = hit.obj;
          award(w, shot.owner, s.value);
          w.stats.saucers++;
          event(w, "saucer-hit", { x: s.x, y: s.y, seat: shot.owner, value: s.value });
          pickup(w, s.x, s.y, "saucer");
          w.saucer = null;
          w.saucerTimer = 24;
        } else if (hit.kind === "player") {
          const p = hit.obj;
          if (p.protected <= 0 && !w.invulnerable)
            killPlayer(w, p.seat);
          else
            event(w, "shield", { x: p.x, y: p.y, seat: p.seat });
        } else if (hit.kind === "emitter") {
          const e = hit.obj;
          if (e.open) {
            e.hp--;
            w.stats.hits++;
            event(w, e.hp <= 0 ? "emitter-break" : "armour", { x: e.x, y: e.y, seat: shot.owner });
            if (e.hp <= 0) {
              award(w, shot.owner, 120);
              pickup(w, e.x, e.y, "emitter");
            }
          } else
            event(w, "blocked", { x: shot.x, y: shot.y });
        } else if (hit.kind === "core") {
          const b = hit.obj;
          if (b.open) {
            b.hp--;
            b.hit = 0.14;
            b.lastHitSeat = shot.owner;
            w.stats.hits++;
            award(w, shot.owner, 10);
            event(w, "boss-hit", { x: b.x, y: b.y, seat: shot.owner, hp: b.hp });
          } else
            event(w, "blocked", { x: shot.x, y: shot.y });
        } else
          event(w, "blocked", { x: shot.x, y: shot.y });
      } else {
        shot.y = newY;
        if (shot.y > -8 && shot.y < 278)
          keep.push(shot);
      }
    }
    w.bullets = keep;
  }
  function pickupStep(w, dt) {
    const keep = [];
    for (const item of w.pickups) {
      item.y += 34 * dt;
      item.life -= dt;
      let caught = false;
      for (const p of w.players)
        if (p.active && p.alive && Math.abs(p.x - item.x) < 10 && Math.abs(p.y - item.y) < 11) {
          caught = true;
          const gain = p.charges < 3 ? 1 : 0;
          p.charges = Math.min(3, p.charges + 1);
          w.intro.collected = true;
          w.stats.salvageCaught++;
          event(w, "pickup", { x: item.x, y: item.y, seat: p.seat, value: gain });
          break;
        }
      if (!caught && item.life > 0 && item.y < 266)
        keep.push(item);
      else if (!caught)
        event(w, "pickup-expire", { x: item.x, y: item.y });
    }
    w.pickups = keep;
  }
  function transition(w, next) {
    w.status = "transition";
    w.nextEncounter = next;
    w.transitionTime = 0;
    w.bullets = [];
    w.saucer = null;
    event(w, "cleared", { encounter: w.encounter, next });
  }
  function progression(w) {
    if (w.status !== "playing")
      return;
    if (w.boss) {
      const b = w.boss;
      if (b.phase === 1 && b.emitters.every((e) => e.hp <= 0)) {
        b.phase = 2;
        b.phaseTime = 0;
        b.open = false;
        b.attackTimer = 3.1;
        b.attackPending = false;
        b.telegraph = 0;
        b.safeLane = 240;
        w.bullets = w.bullets.filter((s) => s.owner >= 0);
        w.stats.phases.push(2);
        event(w, "boss-phase", { phase: 2, x: b.x, y: b.y });
      }
      if (b.phase === 2 && b.hp <= 0) {
        award(w, b.lastHitSeat ?? 0, 500);
        w.status = "victory";
        w.reason = "PLANET DEFENDED";
        w.bullets = [];
        event(w, "victory", { x: b.x, y: b.y });
        return;
      }
    } else if (!w.enemies.length) {
      transition(w, w.encounter + 1);
      return;
    }
    scheduleRespawns(w);
    if (w.players.some((p) => p.active) && !w.players.some((p) => p.active && (p.alive || p.respawn > 0))) {
      w.status = "defeat";
      w.reason = "DEPLOYMENTS DEPLETED";
      w.bullets = [];
      event(w, "defeat", { reason: "deployments" });
    }
  }
  function transitionStep(w, dt) {
    w.transitionTime += dt;
    const locationChange = w.nextEncounter < 6 && Math.floor(w.nextEncounter / 2) !== w.location;
    const duration = locationChange ? 3.8 : 2.35;
    if (locationChange) {
      const fraction = clamp((w.transitionTime - 0.5) / 2.1, 0, 1);
      for (const b of w.bunkers) {
        const apertures = apertureColumns(w, b);
        for (let i = 0;i < b.mask.length; i++) {
          const col = i % b.cols, row = Math.floor(i / b.cols), baseline = row >= 3 || col % 3 === 0;
          if (b.original[i] && !b.mask[i] && baseline && !apertures.includes(col) && (i * 37 + 11) % 127 / 127 < fraction) {
            b.mask[i] = 1;
            b.growth.push({ cell: i, time: 0.5 });
          }
        }
      }
    }
    scheduleRespawns(w);
    if (w.transitionTime >= duration)
      startEncounter(w, w.nextEncounter);
  }
  function stepWorld(w, commands = [], dt = 1 / 120) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1)
      throw new Error("stepWorld requires 0 < dt <= 0.1 seconds.");
    w.events = [];
    if (w.status === "victory" || w.status === "defeat")
      return w;
    w.tick++;
    w.time += dt;
    w.encounterTime += dt;
    for (const b of w.bunkers)
      b.growth = b.growth.map((g) => ({ cell: g.cell, time: g.time - dt })).filter((g) => g.time > 0);
    updatePlayers(w, commands, dt);
    if (w.status === "transition") {
      updateRepairs(w, commands);
      pickupStep(w, dt);
      transitionStep(w, dt);
      return w;
    }
    formationStep(w, dt);
    if (w.status === "defeat")
      return w;
    if (w.boss)
      bossStep(w, dt);
    else
      enemyAttacks(w, dt);
    if (w.encounter >= 1 && w.encounter < 6)
      updateSaucer(w, dt);
    bulletStep(w, dt);
    pickupStep(w, dt);
    updateRepairs(w, commands);
    progression(w);
    return w;
  }

  // src/assets.js
  function createAssets(E) {
    const ink = "#10162e";
    const hues = ["#74f2bd", "#ff8f98", "#c2a0ff", "#ffd17a"];
    const ramps = hues.map((c) => E.tones(c));
    function palette(color, eye = "#fff0c4") {
      const t = E.tones(color);
      return {
        o: ink,
        d: t.deep,
        s: t.sh,
        b: t.base,
        l: t.lt,
        h: t.hi,
        e: eye,
        x: "#231a42",
        f: "#ffbc68",
        w: "#f3f6ff",
        c: "#64d7ff"
      };
    }
    function sprite(rows, color, eye) {
      return E.sprite(rows, typeof color === "string" ? palette(color, eye) : color);
    }
    function animation(frames, color, fps = 2) {
      return E.anim(frames.map((rows) => sprite(rows, color)), fps);
    }
    const cannonA = [
      "........hh........",
      "........hl........",
      "........bl........",
      ".......oblo.......",
      ".......oblo.......",
      "......olhhlo......",
      ".....olbccblo.....",
      "...oolbbccbbloo...",
      "..olbbblbbbbsblo..",
      ".olbbbsbbbbsssblo.",
      "olbbsddbbbbsddsblo",
      "obssdddbbbbddddsbo",
      ".oddddddddddddddo.",
      "..oo..........oo.."
    ];
    const cannonB = [
      "........hh........",
      "........hl........",
      "........bl........",
      ".......oblo.......",
      "..h....oblo....h..",
      "..ll..olhhlo..ll..",
      "..bl.olbccblo.lb..",
      ".obloolbccbboolbo.",
      ".olbbbblbbbbsblo..",
      "olbbbsbbbbbbsssblo",
      "olbbsddbbbbsddsblo",
      "obssdddbbbbddddsbo",
      ".oddddddddddddddo.",
      "..oo..........oo.."
    ];
    const ships = [sprite(cannonA, "#69ead6"), sprite(cannonB, "#ffb68a")];
    const crowns = [
      [
        ".......hh.......",
        "......oblo......",
        "....oolbbloo....",
        "...ollllllblo...",
        "..olbbxxbbxxblo.",
        ".olbbbexbbexbblo",
        "olbbbbbbbbbbbblo",
        ".obssbbbbbbssbo.",
        "..oossssssssoo..",
        "...obbo..obbo...",
        "..olbo....oblo..",
        "..ooo......ooo.."
      ],
      [
        ".......hh.......",
        "......oblo......",
        "....oolbbloo....",
        "...ollllllblo...",
        "..olbbxxbbxxblo.",
        ".olbbbexbbexbblo",
        "olbbbbbbbbbbbblo",
        ".obssbbbbbbssbo.",
        "..oossssssssoo..",
        "...obbo..obbo...",
        "....obloolbo....",
        "....ooo..ooo...."
      ]
    ];
    const peepers = [
      [
        "..hh........hh..",
        "..oblo....olbo..",
        "...obllllllbo...",
        "..olllbbbbbllo..",
        ".olxxbbbbbxxblo.",
        ".obexbbbbbexbbo.",
        "..obbbbbbbbbbo..",
        "...obxxwwxxbo...",
        "..obssssssssbo..",
        ".olbo......oblo.",
        "olbo........oblo",
        "ooo..........ooo"
      ],
      [
        "..hh........hh..",
        "..oblo....olbo..",
        "...obllllllbo...",
        "..olllbbbbbllo..",
        ".olxxbbbbbxxblo.",
        ".obexbbbbbexbbo.",
        "..obbbbbbbbbbo..",
        "...obxxwwxxbo...",
        "..obssssssssbo..",
        "..oblo....olbo..",
        "...oblo..olbo...",
        "...oooo..oooo..."
      ]
    ];
    const jellies = [
      [
        ".....hhhhhh.....",
        "...ollllllblo...",
        "..olbbbbbbbblo..",
        ".olbbxxbbxxbblo.",
        ".obbbexbbexbbbo.",
        "olbbbbbbbbbbbblo",
        "obbbbssbbssbbbbo",
        ".obssssssssssbo.",
        ".obboobboobbbo..",
        ".obbo.obbo.obbo.",
        "..ooo..ooo..ooo.",
        "................"
      ],
      [
        ".....hhhhhh.....",
        "...ollllllblo...",
        "..olbbbbbbbblo..",
        ".olbbxxbbxxbblo.",
        ".obbbexbbexbbbo.",
        "olbbbbbbbbbbbblo",
        "obbbbssbbssbbbbo",
        ".obssssssssssbo.",
        "..obbboobboobbo.",
        ".obbo.obbo.obbo.",
        ".ooo..ooo..ooo..",
        "................"
      ]
    ];
    const crabs = [
      [
        ".hl..........lh.",
        "oblo........olbo",
        "obbo..h..h..obbo",
        ".obbolbllbloobbo",
        "..obbxxbbxxbbbo.",
        "..obbexbbexbbbo.",
        "...obbbbbbbbbo..",
        "..obssssssssbo..",
        ".olboobbbbooblo.",
        "olbo..oooo..oblo",
        "ooo..........ooo",
        "................"
      ],
      [
        "................",
        "................",
        ".hlo..h..h..olh.",
        "olbbollbbllobblo",
        "obbbbxxbbxxbbbbo",
        ".obbbexbbexbbbo.",
        "...obbbbbbbbbo..",
        "..obssssssssbo..",
        "..olbobbbbolbo..",
        "...oboooooobo...",
        "...ooo....ooo...",
        "................"
      ]
    ];
    const enemies = [crowns, peepers, jellies, crabs].map((f, i) => animation(f, hues[i]));
    const armourRows = [
      "....hhhhhhhh....",
      "..ollllllllllo..",
      ".olbsbbbbbbsslo.",
      "olbsbbwwwwbbsslo",
      "obssbbssssbbssbo",
      "obsbbbbbbbbsssbo",
      ".obsxxbbbbxxsbo.",
      "..obexbbbbexbo..",
      "...obssssssbo...",
      "..obbo....obbo..",
      ".olbo......oblo.",
      ".ooo........ooo."
    ];
    const armour = sprite(armourRows, "#95b7dd");
    const armourShell = sprite([
      "....hhhhhhhh....",
      "..ollllllllllo..",
      ".olbsbbbbbbsslo.",
      "olbsbbwwwwbbsslo",
      "obssbbssssbbssbo",
      "obsbbbbbbbbsssbo",
      ".obs........sbo.",
      "..oo........oo..",
      "................",
      "................",
      "................",
      "................"
    ], "#95b7dd");
    const bombardierFrames = [
      [
        "...hh......hh...",
        "..olbo....olbo..",
        ".ollllooolllblo.",
        "olbbxxbbbxxbbslo",
        "obbbeeebbeeebsbo",
        ".obbbssbbssbbbo.",
        "..obbbbbbbbbbo..",
        "...obssssssbo...",
        "..obbofhhfobbo..",
        ".obbo.fbbf.obbo.",
        ".ooo..oddo..ooo.",
        ".......oo......."
      ],
      [
        "...hh......hh...",
        "..olbo....olbo..",
        ".ollllooolllblo.",
        "olbbxxbbbxxbbslo",
        "obbbeeebbeeebsbo",
        ".obbbssbbssbbbo.",
        "..obbbbbbbbbbo..",
        "...obssssssbo...",
        "..obbofhhfobbo..",
        "...obofbbfobo...",
        "...oo.oddo.oo...",
        ".......oo......."
      ]
    ];
    const bombardier = animation(bombardierFrames, "#ffad79");
    const saucer = animation([
      [
        "..........hhhh..........",
        "........ollllllo........",
        "......olbbbccbbblo......",
        ".....olbbbbccbbbblo.....",
        "..oolllbbbbbbbbbbllloo..",
        ".olhhhhhhhhhhhhhhhhhhlo.",
        "olbbbbebbbebbbebbbebbblo",
        ".obssssssssssssssssssbo.",
        "...oobbbbbbbbbbbbbbsoo..",
        "......oossssssssoo......",
        "........ff..ff..........",
        "........................"
      ],
      [
        "..........hhhh..........",
        "........ollllllo........",
        "......olbbbccbbblo......",
        ".....olbbbbccbbbblo.....",
        "..oolllbbbbbbbbbbllloo..",
        ".olhhhhhhhhhhhhhhhhhhlo.",
        "olbbebbbebbbebbbebbbbllo",
        ".obssssssssssssssssssbo.",
        "...oobbbbbbbbbbbbbbsoo..",
        "......oossssssssoo......",
        "........f....f..........",
        ".......ff....ff........."
      ]
    ], "#ff749c", 5);
    const salvage = animation([
      [
        "....h....",
        "...hlh...",
        "..hlblh..",
        ".hlbbbsh.",
        "hlbbebssh",
        ".hsbbbsh.",
        "..hsssh..",
        "...hsh...",
        "....h...."
      ],
      [
        "....h....",
        "....lh...",
        "...lblh..",
        "..hlbbsh.",
        "..hbebsh.",
        "..hsbbsh.",
        "...sssh..",
        "....sh...",
        "....h...."
      ],
      [
        "....h....",
        "....h....",
        "...hlh...",
        "...hbh...",
        "...heh...",
        "...hsh...",
        "...hsh...",
        "....h....",
        "....h...."
      ],
      [
        "....h....",
        "...hl....",
        "..hlbl...",
        ".hlbbsh..",
        ".hbebsh..",
        ".hsbbsh..",
        "..hsss...",
        "...hs....",
        "....h...."
      ]
    ], "#80f7da", 8);
    function mothership(open = false) {
      const pixels = Array.from({ length: 30 }, () => Array(70).fill("."));
      const rect = (x, y, w, h, c) => {
        for (let j = y;j < y + h; j++)
          for (let i = x;i < x + w; i++)
            if (pixels[j] && i >= 0 && i < 70)
              pixels[j][i] = c;
      };
      const span = (y, x, right, c) => rect(x, y, right - x + 1, 1, c);
      for (let y = 3;y < 23; y++) {
        const inset = [
          31,
          28,
          26,
          23,
          19,
          16,
          12,
          8,
          4,
          1,
          0,
          1,
          3,
          6,
          9,
          13,
          16,
          19,
          22,
          25
        ][y - 3];
        span(y, inset, 69 - inset, y < 8 ? "l" : y < 13 ? "b" : y < 17 ? "s" : "d");
        pixels[y][inset] = "o";
        pixels[y][69 - inset] = "o";
        if (y === 7 || y === 12)
          span(y, inset + 1, 68 - inset, "h");
      }
      rect(28, 6, 14, 7, "o");
      rect(29, 6, 12, 5, "c");
      rect(31, 6, 2, 3, "w");
      rect(29, 11, 12, 1, "s");
      for (const x of [10, 49]) {
        rect(x, 14, 11, 10, "o");
        rect(x + 1, 14, 9, 8, "l");
        rect(x + 2, 16, 7, 7, "s");
        rect(x + 3, 18, 5, 5, "x");
        rect(x + 4, 19, 3, 3, "e");
        rect(x + 3, 24, 5, 2, "o");
        rect(x + 4, 23, 3, 2, "f");
      }
      rect(29, 15, 12, 12, "o");
      rect(30, 16, 10, 10, open ? "f" : "s");
      if (open) {
        rect(32, 17, 6, 8, "e");
        rect(33, 18, 4, 6, "w");
      } else {
        rect(31, 17, 8, 3, "l");
        rect(31, 21, 8, 3, "b");
        rect(30, 20, 10, 1, "x");
      }
      for (const x of [3, 23, 44, 64]) {
        rect(x, 14, 3, 2, "e");
      }
      return sprite(pixels.map((r) => r.join("")), "#a397eb");
    }
    const flagship = mothership(false), flagshipOpen = mothership(true);
    const repair2 = sprite([
      "...h...",
      "..hlh..",
      ".hlblh.",
      "hlbeblh",
      ".hsbsh.",
      "..hsh..",
      "...h..."
    ], "#9bf8d2");
    const bomb = sprite(["..h..", ".hlh.", ".bbl.", "obfbo", ".bso.", "..o.."], "#ffad7f");
    const heavyBomb = sprite([
      "...h...",
      "..hlh..",
      ".hbbbh.",
      "olbfblo",
      "obfffbo",
      ".obfbo.",
      "..obo..",
      "...o..."
    ], "#ff9b91");
    return {
      ships,
      enemies,
      armour,
      armourShell,
      armourAnim: E.anim([armour, armour], 2),
      bombardier,
      saucer,
      salvage,
      flagship,
      flagshipOpen,
      repair: repair2,
      bomb,
      heavyBomb,
      hues,
      ramps,
      bunkerRamps: ["#648e9b", "#af8798", "#848cb6"].map((c) => E.ramp(c, 6))
    };
  }

  // src/audio.js
  function createAudio(game) {
    const audio = game.audio;
    const active = new Set;
    const handles = new Set;
    let unlocked = false, current = "", wanted = null, voiceUntil = -Infinity, march = 0;
    const counts = {
      events: 0,
      effects: 0,
      barks: 0,
      throttled: 0,
      maximumActive: 0
    };
    const last = new Map;
    const now = () => Number(game.real || game.time || 0);
    function track(src, gain, end, context) {
      const node = { src, gain, context };
      active.add(node);
      counts.maximumActive = Math.max(counts.maximumActive, active.size);
      src.onended = () => {
        active.delete(node);
        try {
          src.disconnect();
          gain.disconnect();
        } catch (_) {}
      };
      src.stop(end + 0.015);
      return node;
    }
    function synth(kind, ctx, bus, time, freq, duration, volume) {
      const t = Math.max(ctx.currentTime, Number(time) || 0), dur = Math.min(2, Math.max(0.025, Number(duration) || 0.1));
      const f = Math.max(35, Math.min(6000, Number(freq) || 440)), vol = Math.min(0.4, Math.max(0, Number(volume) || 0));
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = kind === "bass" ? "triangle" : kind === "reed" ? "square" : "sine";
      osc.frequency.setValueAtTime(f, t);
      if (kind === "bass")
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.65), t + dur);
      if (kind === "pluck")
        osc.frequency.exponentialRampToValueAtTime(f * 0.985, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.00001, t + dur);
      osc.connect(g);
      g.connect(bus);
      osc.start(t);
      track(osc, g, t + dur, ctx);
      if (kind === "glass") {
        const overtone = ctx.createOscillator(), og = ctx.createGain();
        overtone.type = "sine";
        overtone.frequency.value = f * 2.01;
        og.gain.setValueAtTime(vol * 0.23, t);
        og.gain.exponentialRampToValueAtTime(0.00001, t + dur * 0.55);
        overtone.connect(og);
        og.connect(bus);
        overtone.start(t);
        track(overtone, og, t + dur * 0.55, ctx);
      }
    }
    for (const [name, kind] of [
      ["orbitPluck", "pluck"],
      ["orbitGlass", "glass"],
      ["orbitBass", "bass"],
      ["orbitReed", "reed"]
    ]) {
      audio.instrument(name, (ctx, bus, time, freq, dur, vol) => synth(kind, ctx, bus, time, freq, dur, vol));
    }
    const songs = [
      {
        bpm: 102,
        steps: 4,
        tracks: [
          {
            name: "spark",
            wave: "orbitPluck",
            vol: 0.15,
            notes: "A4 . . . E5 . . . | G5 . . E5 . . C5 . | D5 . . . C5 . . . | A4 . . . . . . ."
          },
          {
            name: "stars",
            wave: "orbitGlass",
            vol: 0.075,
            notes: ". . . . . . . . | . . . . C6 . . . | . . . . E5 . . . | . . . . . . . ."
          }
        ]
      },
      {
        bpm: 110,
        steps: 4,
        tracks: [
          {
            name: "spark",
            wave: "orbitPluck",
            vol: 0.14,
            notes: "D5 . . . A4 . . . | F5 . . . E5 . D5 . | A5 . . . F5 . . . | E5 . D5 . . . . ."
          },
          {
            name: "stars",
            wave: "orbitGlass",
            vol: 0.065,
            notes: ". . A5 . . . . . | . . . . . . . . | . . . . C6 . . . | . . . . . . . ."
          }
        ]
      },
      {
        bpm: 118,
        steps: 4,
        tracks: [
          {
            name: "spark",
            wave: "orbitPluck",
            vol: 0.14,
            notes: "E5 . . B5 . . G5 . | F#5 . . . E5 . . . | G5 . . . A5 . B5 . | F#5 . . . E5 . . ."
          },
          {
            name: "stars",
            wave: "orbitGlass",
            vol: 0.065,
            notes: ". . . . B5 . . . | . . . . . . . . | . . . . . . . . | . . D6 . . . B5 ."
          }
        ]
      },
      {
        bpm: 136,
        steps: 4,
        tracks: [
          {
            name: "pulse",
            wave: "orbitBass",
            vol: 0.18,
            notes: "E2 . . E2 . . G2 . | E2 . . B2 . . D3 . | E2 . . E2 . . C3 . | B2 . . B2 . . . ."
          },
          {
            name: "alarm",
            wave: "orbitReed",
            vol: 0.045,
            notes: ". . E5 . . . . . | . . . . . . F5 . | . . E5 . . . . . | B4 . . . . . . ."
          },
          {
            name: "stars",
            wave: "orbitGlass",
            vol: 0.065,
            notes: "E6 . . . . . . . | . . . . . . . . | D6 . . . . . . . | . . B5 . . . . ."
          }
        ]
      }
    ];
    const victory = {
      bpm: 132,
      steps: 4,
      tracks: [
        {
          wave: "orbitGlass",
          vol: 0.22,
          notes: "C5 . E5 . G5 . C6 - | B5 . G5 . C6 - - - | . . . . . . . ."
        },
        {
          wave: "orbitBass",
          vol: 0.14,
          notes: "C3 - . . G3 - . . | C4 - - - . . . . | . . . . . . . ."
        }
      ]
    };
    const defeat = {
      bpm: 80,
      steps: 4,
      tracks: [
        {
          wave: "orbitPluck",
          vol: 0.18,
          notes: "E5 - . . C5 - . . | A4 - - - E4 - - - | . . . . . . . ."
        }
      ]
    };
    const sounds = {
      shot: [
        { wave: "pulse12", freq: 1060, to: 400, dur: 0.065, vol: 0.075 },
        { wave: "sine", freq: 1900, to: 1100, dur: 0.035, vol: 0.04 }
      ],
      enemyShot: { wave: "triangle", freq: 290, to: 145, dur: 0.16, vol: 0.12 },
      heavy: [
        { wave: "noise", freq: 250, to: 70, dur: 0.25, vol: 0.13 },
        { wave: "triangle", freq: 155, to: 70, dur: 0.3, vol: 0.14 }
      ],
      kill: [
        { wave: "pulse", freq: 620, to: 180, dur: 0.12, vol: 0.11 },
        { wave: "noise", freq: 1700, to: 700, dur: 0.08, vol: 0.07 }
      ],
      armour: {
        wave: "square",
        freq: 1420,
        to: 350,
        dur: 0.08,
        vol: 0.09,
        arp: [0, 7, -5],
        step: 0.025
      },
      erosion: { wave: "noise", freq: 1500, to: 600, dur: 0.04, vol: 0.025 },
      repair: [
        { wave: "orbitGlass", freq: 440, dur: 0.3, vol: 0.18 },
        { wave: "orbitGlass", freq: 660, dur: 0.3, delay: 0.08, vol: 0.12 },
        { wave: "orbitGlass", freq: 880, dur: 0.3, delay: 0.16, vol: 0.1 }
      ],
      pickup: {
        wave: "sine",
        freq: 700,
        to: 1050,
        dur: 0.11,
        vol: 0.12,
        arp: [0, 4, 7],
        step: 0.035
      },
      loss: [
        { wave: "noise", freq: 800, to: 90, dur: 0.36, vol: 0.18 },
        { wave: "saw", freq: 190, to: 35, dur: 0.42, vol: 0.13 }
      ],
      respawn: {
        wave: "triangle",
        freq: 220,
        to: 880,
        dur: 0.28,
        vol: 0.1,
        arp: [0, 7, 12],
        step: 0.08
      },
      saucer: {
        wave: "sine",
        freq: 660,
        to: 720,
        dur: 0.26,
        vol: 0.07,
        vib: [13, 0.14]
      },
      extra: {
        wave: "orbitGlass",
        freq: 440,
        dur: 0.45,
        vol: 0.2,
        arp: [0, 4, 7, 12],
        step: 0.07
      },
      denied: { wave: "triangle", freq: 170, to: 125, dur: 0.07, vol: 0.075 },
      telegraph: { wave: "sine", freq: 340, to: 480, dur: 0.18, vol: 0.075 },
      select: { wave: "triangle", freq: 580, to: 760, dur: 0.05, vol: 0.06 },
      confirm: { wave: "orbitPluck", freq: 660, dur: 0.14, vol: 0.1 },
      core: [
        { wave: "orbitGlass", freq: 330, dur: 0.2, vol: 0.2 },
        { wave: "noise", freq: 1700, to: 100, dur: 0.16, vol: 0.07 }
      ]
    };
    for (const [name, voice] of Object.entries(sounds))
      audio.define("orbit:" + name, voice);
    function effect(name, x = 240, throttle = 0.035) {
      if (!unlocked || !audio.ready || !sounds[name])
        return;
      const t = now(), prev = last.has(name) ? last.get(name) : -Infinity;
      if (t - prev < throttle) {
        counts.throttled++;
        return;
      }
      last.set(name, t);
      counts.effects++;
      const h = audio.sfx("orbit:" + name, {
        pan: Math.max(-0.75, Math.min(0.75, (Number(x) - 240) / 320)),
        vary: name === "repair" ? 0 : 0.035
      });
      if (h && h.playing)
        handles.add({ h, end: t + 1 });
      for (const v of handles)
        if (v.end < t)
          handles.delete(v);
    }
    function bark(kind = "command") {
      if (!unlocked || !audio.ready || now() < voiceUntil)
        return;
      const ctx = audio.ctx, bus = audio.bus("voice");
      if (!bus)
        return;
      const base = kind === "alien" ? 390 : 220, notes = kind === "alien" ? [1.3, 0.9, 1.5, 1.1] : [1, 1.2, 0.86];
      const start = ctx.currentTime + 0.01;
      notes.forEach((q, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain(), formant = ctx.createBiquadFilter();
        const t = start + i * 0.082, end = t + 0.067;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(base * q, t);
        osc.frequency.exponentialRampToValueAtTime(base * q * 0.8, end);
        formant.type = "bandpass";
        formant.frequency.value = i % 2 ? 1200 : 1900;
        formant.Q.value = 2.8;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.095, t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.00001, end);
        osc.connect(formant);
        formant.connect(gain);
        gain.connect(bus);
        osc.start(t);
        track(osc, gain, end, ctx);
        osc.addEventListener("ended", () => {
          try {
            formant.disconnect();
          } catch (_) {}
        }, { once: true });
      });
      voiceUntil = now() + 3.5;
      counts.barks++;
    }
    function location(world) {
      wanted = world;
      if (!world || !unlocked)
        return;
      const state = world.status;
      let key;
      if (state === "victory" || state === "defeat")
        key = state;
      else
        key = world.encounter === 6 || world.boss ? "boss" : "location" + Math.min(2, Math.max(0, Number(world.location) || 0));
      if (key === current)
        return;
      current = key;
      if (key === "victory" || key === "defeat") {
        audio.music(key === "victory" ? victory : defeat, {
          sync: true,
          loop: false,
          restart: true
        });
        bark("command");
      } else {
        audio.music(key === "boss" ? songs[3] : songs[Number(key.slice(-1))], {
          sync: true,
          fade: 0.3
        });
      }
    }
    const aliases = {
      fire: "shot",
      playerShot: "shot",
      playerFire: "shot",
      enemyFire: "enemyShot",
      bomb: "enemyShot",
      volley: "enemyShot",
      heavyBomb: "heavy",
      death: "kill",
      enemyDeath: "kill",
      enemyKill: "kill",
      hit: "armour",
      armourHit: "armour",
      armor: "armour",
      armourBreak: "armour",
      erode: "erosion",
      crater: "erosion",
      cell: "erosion",
      cover: "erosion",
      bunkerHit: "erosion",
      debris: "erosion",
      cells: "erosion",
      repaired: "repair",
      collect: "pickup",
      salvage: "pickup",
      playerDeath: "loss",
      playerLoss: "loss",
      shipDeath: "loss",
      saucerSpawn: "saucer",
      saucerEnter: "saucer",
      extraLife: "extra",
      oneup: "extra",
      noRepair: "denied",
      repairDenied: "denied",
      boss: "heavy",
      bossHit: "core",
      "boss-hit": "core",
      "boss-phase": "heavy",
      "emitter-break": "heavy",
      "saucer-hit": "extra",
      shield: "denied",
      blocked: "armour",
      emitterHit: "armour",
      emitterBreak: "heavy",
      phase: "heavy",
      phaseChange: "heavy",
      bossPhase: "heavy"
    };
    function events(list, world) {
      if (world)
        location(world);
      if (!Array.isArray(list) || !unlocked)
        return;
      for (const event2 of list) {
        counts.events++;
        const type = event2.type || event2.kind || event2.name;
        const name = type === "volley" && event2.kind === "heavy" ? "heavy" : aliases[type] || type;
        if (type === "march") {
          if (!audio.ready)
            continue;
          const notes = [82.41, 73.42, 65.41, 73.42];
          audio.sfx({
            wave: "orbitBass",
            freq: notes[march++ % 4],
            dur: 0.115,
            vol: 0.12
          }, { vary: 0 });
        } else if (type === "stage" || type === "wave" || type === "encounter") {
          bark(world && world.encounter >= 4 ? "alien" : "command");
        } else {
          effect(name, event2.x ?? 240, name === "erosion" ? 0.09 : name === "enemyShot" ? 0.09 : name === "saucer" ? 1.5 : 0.035);
        }
      }
    }
    function stop() {
      audio.music(null, { fade: 0 });
      current = "";
      wanted = null;
      for (const v of handles)
        try {
          v.h.stop(0);
        } catch (_) {}
      handles.clear();
      for (const n of active) {
        try {
          n.src.stop();
          n.src.disconnect();
          n.gain.disconnect();
        } catch (_) {}
      }
      active.clear();
      last.clear();
      march = 0;
    }
    function unlock() {
      if (game.headless)
        return false;
      if (unlocked) {
        if (audio.ctx && audio.ctx.state === "suspended")
          audio.ctx.resume().catch(() => {});
        return true;
      }
      const bus = audio.bus("voice");
      unlocked = !!bus;
      if (audio.ctx && audio.ctx.state === "suspended")
        audio.ctx.resume().catch(() => {});
      if (wanted) {
        const w = wanted;
        current = "";
        location(w);
      }
      return unlocked;
    }
    async function renderProbe(Context, { muted = false, bus = "music" } = {}) {
      const ctx = new Context(1, 22050, 22050), gain = ctx.createGain();
      gain.gain.value = muted ? 0 : bus === "music" ? 0.1 : bus === "voice" ? 0.7 : 1;
      gain.connect(ctx.destination);
      synth("glass", ctx, gain, 0, 440, 0.3, 0.2);
      const buffer = await ctx.startRendering(), data = buffer.getChannelData(0);
      let sum = 0, peak = 0, finite2 = true;
      for (const value of data) {
        finite2 = finite2 && Number.isFinite(value);
        sum += value * value;
        peak = Math.max(peak, Math.abs(value));
      }
      return {
        finite: finite2,
        peak,
        rms: Math.sqrt(sum / data.length),
        samples: data.length,
        bus,
        muted
      };
    }
    return {
      events,
      location,
      stop,
      unlock,
      effect,
      bark,
      songs,
      sounds,
      renderProbe,
      diagnostics: () => ({
        ...counts,
        unlocked,
        ready: audio.ready,
        active: active.size,
        soundtrack: current,
        musicVolume: audio.musicVolume,
        sfxVolume: audio.sfxVolume,
        voiceVolume: audio.voiceVolume,
        muted: audio.muted
      })
    };
  }

  // src/view.js
  function createView(E, game, assets) {
    const { px } = E;
    const rand = E.rng(92411);
    const stars = Array.from({ length: 180 }, () => ({ x: rand(), y: rand(), size: rand() > 0.94 ? 2 : 1, t: rand() * 7 }));
    const palettes = [
      { sky: ["#06151f", "#102937", "#254344"], planet: "#8bbcb2", rim: "#c9dbc1", land: "#344f50", ground: "#192f38", bunker: "#81bda7", accent: "#f1ad83" },
      { sky: ["#141327", "#292b47", "#554658"], planet: "#b8a4cc", rim: "#e6d1ca", land: "#51425c", ground: "#2c293f", bunker: "#ad9ab7", accent: "#e3bc83" },
      { sky: ["#071b29", "#15394b", "#376168"], planet: "#d7b892", rim: "#ffdda5", land: "#786162", ground: "#23404b", bunker: "#73a8ad", accent: "#ff9c82" }
    ];
    let fx = [], celebration = 0, celebrationBeat = 0;
    function events(list) {
      for (const e of list) {
        if (e.type === "victory") {
          celebration = 3;
          celebrationBeat = 0;
        }
        if (["kill", "armour", "loss", "repair", "erode", "pickup", "victory", "extra", "boss-hit", "boss-phase", "emitter-break", "saucer-hit", "pickup-expire"].includes(e.type)) {
          const count = e.type === "victory" ? 80 : e.type === "emitter-break" ? 28 : e.type === "boss-phase" ? 24 : e.type === "boss-hit" ? 7 : e.type === "saucer-hit" ? 20 : e.type === "pickup-expire" ? 6 : e.type === "loss" ? 20 : e.type === "kill" ? 9 : e.type === "repair" ? 8 : e.type === "erode" ? 3 : 6;
          for (let i = 0;i < count; i++) {
            const a = rand() * Math.PI * 2, s = 10 + rand() * 40;
            fx.push({ x: e.x ?? 240, y: e.y ?? 140, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.25 + rand() * 0.45, max: 0.7, type: e.type, c: Math.floor(rand() * 3) });
          }
        }
      }
      if (fx.length > 400)
        fx = fx.slice(-400);
    }
    function update(dt) {
      if (celebration > 0) {
        celebration -= dt;
        celebrationBeat -= dt;
        if (celebrationBeat <= 0) {
          celebrationBeat = 0.24;
          const x = 70 + rand() * 340, y = 65 + rand() * 115;
          for (let i = 0;i < 18; i++) {
            const a = i * Math.PI / 9;
            fx.push({ x, y, vx: Math.cos(a) * 38, vy: Math.sin(a) * 38, life: 0.7, max: 0.7, type: "pickup", c: i % 3 });
          }
        }
      }
      for (const p of fx) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 65 * dt;
      }
      fx = fx.filter((p) => p.life > 0);
    }
    function text(g, s, x, y, c = "#e6f9de", opts = {}) {
      E.font.text(g, s, Math.round(x), Math.round(y), c, { outline: false, shadow: "#07141e", ...opts });
    }
    function border(g, x, y, w, h, c) {
      px.line(g, x, y, x + w, y, c);
      px.line(g, x, y + h, x + w, y + h, c);
      px.line(g, x, y, x, y + h, c);
      px.line(g, x + w, y, x + w, y + h, c);
    }
    function planet(g, cx, cy, r, p, t) {
      const ramp = E.ramp(p.planet, 7);
      px.disc(g, cx, cy, r + 3, p.rim);
      px.disc(g, cx + 1, cy + 1, r + 1, p.land);
      for (let yy = -r;yy <= r; yy += 2) {
        const half = Math.sqrt(Math.max(0, r * r - yy * yy));
        for (let xx = -half;xx < half; xx += 3) {
          const light = 1 - xx / r * 0.5 - yy / r * 0.32;
          const zone = Math.max(0, Math.min(6, Math.floor(light * 4)));
          const cloud = Math.sin((xx + yy * 0.55) * 0.079) + Math.cos(yy * 0.18 + xx * 0.021);
          const c = cloud > 0.8 ? ramp[Math.min(6, zone + 1)] : cloud < -0.7 ? ramp[Math.max(0, zone - 2)] : ramp[zone];
          px.rect(g, cx + xx, cy + yy, Math.min(3, half - xx), 2, c);
        }
      }
      px.poly(g, [[cx + r * 0.2, cy - r * 0.91], [cx + r * 0.78, cy - r * 0.62], [cx + r * 0.99, cy], [cx + r * 0.75, cy + r * 0.65], [cx + r * 0.07, cy + r * 0.99], [cx + r * 0.58, cy + r * 0.2]], p.land);
    }
    function background(r, world, front = false) {
      const p = palettes[world?.location ?? 0], t = game.real;
      r.sky(p.sky);
      r.decal((g) => {
        const [ox, oy] = r.w(0, 0, 0);
        for (let i = 0;i < stars.length; i++) {
          const s = stars[i], sx = s.x * r.W, sy = s.y * r.H;
          const twinkle = Math.sin(t * 0.8 + s.t) > -0.35;
          px.rect(g, sx, sy, s.size, s.size, twinkle ? "#638c8e" : "#2e505f");
          if (s.size === 2) {
            px.rect(g, sx - 2, sy + 1, 6, 1, "#315663");
            px.rect(g, sx + 1, sy - 2, 1, 6, "#315663");
          }
        }
        const pr = front ? 88 : 59;
        if (r.H > 400) {
          const extra = (r.H - 270) / 2;
          planet(g, r.W * 0.61, extra * 0.48, Math.min(76, extra * 0.38), p, t);
          text(g, "INHABITED WORLD / KEEP IT THAT WAY", r.W / 2, extra - 8, "#557e7a", { align: "center" });
        } else
          planet(g, ox + (front ? 349 : 370), oy + (front ? 96 : 107), pr, p, t);
        px.line(g, ox + 282, oy + 94, ox + 457, oy + 163, p.land, 2);
        px.line(g, ox + 274, oy + 98, ox + 451, oy + 168, p.rim);
        px.rect(g, ox + 44, oy + 57, 16, 2, "#456a72");
        px.rect(g, ox + 50, oy + 51, 4, 13, "#819a91");
        px.rect(g, ox + 38, oy + 53, 8, 9, "#233e50");
        px.rect(g, ox + 59, oy + 53, 8, 9, "#233e50");
        const floor = oy + 254;
        px.rect(g, 0, floor, r.W, r.H - floor + 2, p.ground);
        for (let i = 0;i < r.W; i += 22)
          px.line(g, i, floor, i + (i - r.W / 2) * 0.8, r.H, "#304c53");
        for (let y = floor + 8;y < r.H; y += 18)
          px.line(g, 0, y, r.W, y, "#29444d");
        const horizon = oy + 192;
        for (let x = 0;x < r.W; x += 13) {
          const h = 5 + Math.sin(x * 0.17) * 4 + Math.sin(x * 0.047) * 8;
          px.rect(g, x, horizon - h, 14, Math.max(1, floor - horizon + h), p.land);
          px.rect(g, x + 2, horizon - h, 3, 2, "#486b69");
        }
        px.rect(g, ox + 9, oy + 27, 462, 164, "#091d29");
        for (const s of stars.slice(0, 75)) {
          const x = ox + 16 + s.x * 448, y = oy + 31 + s.y * 155;
          px.dot(g, x, y, s.size === 2 ? "#456977" : "#263f50");
        }
        planet(g, ox + 365, oy + 112, 49, { ...p, planet: "#24404c", rim: "#375863", land: "#142d3e" }, t);
        px.line(g, ox + 15, oy + 31, ox + 465, oy + 31, "#40646a");
        px.line(g, ox + 15, oy + 31, ox + 15, oy + 248, "#31525e");
        px.line(g, ox + 465, oy + 31, ox + 465, oy + 248, "#31525e");
        px.rect(g, ox + 15, oy + 229, 450, 25, "#1b3641");
        for (let x = 20;x < 461; x += 12)
          px.rect(g, ox + x, oy + 251, 7, 2, p.accent);
        for (let x = 16;x < 465; x += 8)
          px.line(g, ox + x, oy + 230, ox + x + 3, oy + 230, "#d87877");
        text(g, "BREACH", ox + 16, oy + 219, "#b76a77", { font: "tiny" });
        for (const b of world?.bunkers || []) {
          px.rect(g, ox + b.x - 2, oy + b.y + b.rows * b.cell, b.cols * b.cell + 4, 4, "#0a1e29");
          px.line(g, ox + b.x - 2, oy + b.y + b.rows * b.cell, ox + b.x + b.cols * b.cell + 2, oy + b.y + b.rows * b.cell, "#53706d");
        }
        if (r.H > 400) {
          const y = oy + 308;
          text(g, "PLANETARY DEFENSE NETWORK", r.W / 2, y, "#78998d", { align: "center", scale: 2 });
          text(g, "CUT A LANE. CATCH THE SCRAP. KEEP YOUR PLANET.", r.W / 2, y + 25, "#54796e", { align: "center" });
          border(g, ox + 68, y + 55, 344, 70, "#345958");
          for (let j = 0;j < 8; j++) {
            px.rect(g, ox + 80 + j * 41, y + 68, 31, 6, j < 4 ? "#699b8d" : "#b07f70");
            px.rect(g, ox + 80 + j * 41, y + 80, 31, 29, "#102c38");
            px.line(g, ox + 84 + j * 41, y + 101, ox + 104 + j * 41, y + 87, "#3a6a69");
          }
        }
      });
      return p;
    }
    function drawBoss(r, w, p) {
      const b = w.boss;
      if (!b)
        return;
      const body = assets.flagship;
      if (body) {
        r.actor(b.x, b.y - 1, 0, (g, x, y) => {
          px.poly(g, [[x - 74, y - 3], [x - 54, y - 14], [x - 25, y - 17], [x + 25, y - 17], [x + 54, y - 14], [x + 74, y - 3], [x + 60, y + 11], [x - 60, y + 11]], "#4a3e5d");
          px.poly(g, [[x - 69, y - 4], [x - 52, y - 11], [x + 52, y - 11], [x + 69, y - 4], [x + 55, y + 4], [x - 55, y + 4]], "#91768e");
          px.line(g, x - 51, y - 12, x + 51, y - 12, "#eeb3a1", 2);
          px.line(g, x - 67, y + 2, x - 30, y + 2, "#c6979a");
          px.line(g, x + 30, y + 2, x + 67, y + 2, "#c6979a");
        });
        r.sprite(b.x, b.y, 0, b.phase === 2 && b.open ? assets.flagshipOpen : body, { anchor: "center", t: b.age, glow: 0.25 });
      } else
        r.actor(b.x, b.y, 0, (g, x, y) => {
          px.poly(g, [[x - 68, y - 2], [x - 48, y - 17], [x - 17, y - 22], [x, y - 28], [x + 17, y - 22], [x + 48, y - 17], [x + 68, y - 2], [x + 49, y + 13], [x - 49, y + 13]], "#574361");
          px.poly(g, [[x - 62, y - 3], [x - 45, y - 13], [x + 45, y - 13], [x + 62, y - 3], [x + 38, y + 6], [x - 38, y + 6]], "#9b7a98");
          px.line(g, x - 43, y - 14, x + 43, y - 14, "#f5bcaa", 2);
          for (let i = -2;i <= 2; i++)
            px.rect(g, x + i * 18 - 3, y - 10, 6, 3, "#c7dcd0");
        });
      for (const e of b.phase === 1 ? b.emitters || [] : []) {
        r.actor(e.x, e.y, 0, (g, x, y) => {
          const open = e.open && e.hp > 0;
          px.rect(g, x - 9, y - 9, 18, 18, e.hp > 0 ? "#233c50" : "#101c2b");
          border(g, x - 9, y - 9, 18, 18, e.hp > 0 ? "#e2a087" : "#52636b");
          if (e.hp > 0) {
            px.disc(g, x, y, open ? 5 : 3, open ? "#ffdd8b" : "#9f7184");
            if (!open) {
              px.line(g, x - 7, y - 4, x + 7, y - 4, "#d2c0b8", 2);
              px.line(g, x - 7, y + 4, x + 7, y + 4, "#776f86", 2);
            }
            for (let k = 0;k < e.maxHp; k++)
              px.rect(g, x - 8 + k * (16 / e.maxHp), y + 13, Math.max(1, 16 / e.maxHp - 1), 2, k < e.hp ? "#ffc797" : "#30404e");
          }
          if (e.telegraph > 0) {
            border(g, x - 13, y - 13, 26, 26, "#ff9f85");
            px.line(g, x, y + 15, x, y + 25, "#ffd28e");
          }
        }, { emissive: true });
      }
      r.actor(b.x, b.y + 3, 0, (g, x, y) => {
        if (b.phase === 2) {
          const open = b.open;
          px.disc(g, x, y, 11, "#112c40");
          px.disc(g, x, y, 8, open ? "#f5c47e" : "#57697a");
          if (open) {
            px.disc(g, x - 1, y - 2, 4, "#fff4cc");
          } else {
            px.rect(g, x - 10, y - 2, 20, 4, "#b9a6b6");
          }
        }
      }, { emissive: true });
      if (b.phase === 2 && b.telegraph > 0) {
        r.overlay((g) => {
          const safe = typeof b.safeLane === "number" ? b.safeLane : 240;
          const [sx, sy] = r.w(safe, 234, 0);
          const sw = b.safeWidth || 82;
          border(g, sx - sw / 2, sy - 14, sw, 22, "#b4f5cf");
          text(g, "SAFE", sx, sy - 10, "#d3ffd4", { align: "center" });
        });
      }
      r.text(b.phase === 1 ? "BREAK BOTH EMITTERS" : "EXPOSED CORE", r.W / 2, (r.H - 270) / 2 + 38, "#ffcf96", { align: "center" });
    }
    function drawWorld(r, w, { front = false, attract = false, overlays = false } = {}) {
      const p = background(r, w, front);
      if (!w)
        return;
      const preview = w.players.filter((s) => s.active && s.alive && s.charges > 0).map((s) => ({ seat: s.seat, ...repairPreview(w, s.seat) }));
      for (const b of w.bunkers) {
        const bi = w.bunkers.indexOf(b), ramp = E.ramp(p.bunker, 5);
        r.actor(b.center, b.y + b.rows * b.cell, 0, (g, x, y) => {
          const left = x - b.cols * b.cell / 2, top = y - b.rows * b.cell;
          for (let i = 0;i < b.mask.length; i++)
            if (b.mask[i]) {
              const col = i % b.cols, row = Math.floor(i / b.cols), xx = left + col * b.cell, yy = top + row * b.cell;
              const shade = (col + row * 3) % 7 === 0 ? 2 : row < 2 ? 3 : 2;
              px.rect(g, xx, yy, b.cell, b.cell, ramp[shade]);
              px.rect(g, xx, yy, b.cell, 1, ramp[Math.min(4, shade + 1)]);
              px.rect(g, xx + b.cell - 1, yy + 1, 1, b.cell - 1, ramp[1]);
              const grow = b.growth?.find((q) => q.cell === i);
              if (grow && grow.time > 0)
                px.line(g, xx, yy, xx + b.cell - 1, yy, "#e7ffd1");
            }
          for (const q of preview)
            if (q.bunker === bi && q.usable) {
              border(g, left - 2, top - 2, b.cols * b.cell + 4, b.rows * b.cell + 4, q.seat === 0 ? "#a1d4bb" : "#d6a2aa");
              for (const i of q.cells.slice(0, 24)) {
                const xx = left + i % b.cols * b.cell, yy = top + Math.floor(i / b.cols) * b.cell;
                px.dot(g, xx + 1, yy + 1, "#dbf4c9");
              }
            }
        });
      }
      const march = w.formation?.beat || 0;
      for (const e of w.enemies) {
        const spr = e.type === "bombardier" ? assets.bombardier : assets.enemies[e.row % 4];
        if (e.telegraph > 0)
          r.actor(e.x, e.y, 0, (g, x, y) => {
            px.line(g, x - 9, y + 10, x + 9, y + 10, "#ffd68e");
            px.line(g, x - 9, y + 8, x - 9, y + 12, "#ffd68e");
            px.line(g, x + 9, y + 8, x + 9, y + 12, "#ffd68e");
            for (let yy = y + 15;yy < y + 42; yy += 5)
              px.dot(g, x, yy, "#ce8e82");
          }, { emissive: true });
        if (spr)
          r.sprite(e.x, e.y, 0, spr, { anchor: "center", t: march * 0.5, flash: e.flash > 0 && game.settings.flashes > 0 ? "#fff4c9" : undefined, glow: 0.2 });
        if (e.type === "armour" && e.hp > 1) {
          if (assets.armourShell)
            r.sprite(e.x, e.y, 0, assets.armourShell, { anchor: "center", t: march * 0.5 });
          else
            r.actor(e.x, e.y, 0, (g, x, y) => {
              px.line(g, x - 9, y - 6, x + 9, y - 6, "#e6d8ac", 2);
              px.line(g, x - 10, y - 5, x - 10, y + 4, "#8c9bac", 2);
              px.line(g, x + 10, y - 5, x + 10, y + 4, "#8c9bac", 2);
            });
        }
        if (overlays)
          r.actor(e.x, e.y, 0, (g, x, y) => border(g, x - 7, y - 5, 14, 10, "#ff6d90"), { emissive: true });
      }
      if (w.saucer) {
        r.sprite(w.saucer.x, w.saucer.y ?? 43, 0, assets.saucer, { anchor: "center", t: w.time, glow: 0.4 });
      }
      if (w.boss && w.status !== "victory")
        drawBoss(r, w, p);
      for (const b of w.bullets)
        r.actor(b.x, b.y, 0, (g, x, y) => {
          if (b.owner >= 0) {
            px.rect(g, x - 1, y - 4, 3, 8, b.owner === 0 ? "#dffff1" : "#ffe3d4");
            px.rect(g, x, y - 5, 1, 5, b.owner === 0 ? "#a4f5cf" : "#ffb69a");
            px.rect(g, x, y + 4, 1, 3, "#3c787f");
          } else if (b.kind === "heavy") {
            px.poly(g, [[x, y - 6], [x + 5, y - 2], [x + 5, y + 3], [x, y + 7], [x - 5, y + 3], [x - 5, y - 2]], "#ff997e");
            px.rect(g, x - 2, y - 2, 4, 4, "#fff1c8");
            px.line(g, x - 3, y - 8, x + 3, y - 8, "#d37a83");
          } else {
            px.rect(g, x - 2, y - 4, 4, 8, "#ff937c");
            px.rect(g, x - 1, y, 2, 4, "#ffedb7");
            px.dot(g, x + 1, y - 6, "#d07883");
          }
        }, { emissive: true });
      for (const q of w.pickups) {
        if (q.life < 2 && game.settings.flashes > 0 && Math.floor(w.time * 6) % 2 === 0)
          continue;
        r.sprite(q.x, q.y, 0, assets.salvage, { anchor: "center", t: w.time, glow: 0.8 });
        r.actor(q.x, q.y, 0, (g, x, y) => {
          px.dot(g, x - 7, y - 5, "#e4ffd2");
          px.dot(g, x + 6, y + 4, "#7dc6b3");
          if (q.life < 2) {
            px.rect(g, x - 7, y + 8, 14, 2, "#30505a");
            px.rect(g, x - 7, y + 8, 14 * Math.max(0, q.life / 2), 2, "#c8edbe");
          }
        }, { emissive: true });
      }
      for (const s of w.players) {
        if (!s.active)
          continue;
        if (!s.alive) {
          if (s.respawn > 0)
            r.textAt(s.x, s.y - 15, 0, "REDEPLOY", "#b4d9c6", { font: "tiny" });
          continue;
        }
        const spr = assets.ships[s.seat % 2];
        r.shadow(s.x, s.y + 5, 11, 0.5);
        if (spr)
          r.sprite(s.x, s.y + (s.recovery > 0.2 ? 1 : 0), 0, spr, { anchor: "center", t: w.time, glow: 0.25, alpha: s.protected > 0 && game.settings.flashes > 0 && Math.floor(w.time * 7) % 2 ? 0.55 : 1 });
        r.actor(s.x, s.y, 0, (g, x, y) => {
          const count = w.bullets.filter((b) => b.owner === s.seat).length;
          px.rect(g, x - 1, y - 9, 3, 2, s.recovery <= 0 && count < 2 ? "#eaffd3" : "#4a6876");
          if (s.protected > 0)
            border(g, x - 12, y - 11, 24, 20, s.seat === 0 ? "#b4edcd" : "#ffbb9e");
        }, { emissive: true });
        game.lights.add(s.x, s.y, 0, 28, 0.22, { color: s.seat === 0 ? "#96dfc0" : "#ffb399" });
      }
      r.overlay((g) => {
        for (const q of fx) {
          const [x, y] = r.w(q.x, q.y, 0);
          const colors = q.type === "repair" || q.type === "pickup" ? ["#d7ffd2", "#a0dfba", "#65ac9f"] : q.type === "armour" ? ["#fff0bb", "#a5b7ba", "#718895"] : ["#ffdd9e", "#f29c82", "#b36f88"];
          px.rect(g, x, y, q.c === 0 ? 2 : 1, q.c === 0 ? 2 : 1, colors[q.c]);
        }
        const [ox, oy] = r.w(0, 0, 0);
        if (w.status === "victory") {
          planet(g, ox + 240, oy + 126, 66, p, game.real);
          text(g, "PLANET KEPT!", ox + 240, oy + 198, "#e6ffd0", { align: "center", scale: 3 });
          text(g, "ALL OUTPOSTS REPORT: STILL HERE.", ox + 240, oy + 225, "#b4f5cf", { align: "center" });
        }
        px.rect(g, ox + 13, oy + 5, 454, 23, "#0a202b");
        text(g, "TEAM", ox + 20, oy + 9, "#86ada2", { font: "tiny" });
        text(g, String(w.score).padStart(6, "0"), ox + 20, oy + 16, "#ecfbd8", { scale: 1 });
        const stage = w.encounter === 6 ? "FLAGSHIP" : "WAVE " + (w.encounter + 1) + " / 6";
        text(g, stage, ox + 240, oy + 9, "#f9c58e", { align: "center" });
        const loc = LOCATIONS[w.location];
        text(g, (typeof loc === "string" ? loc : loc?.name) || ["LAGOON RELAY", "DUSK QUARRY", "POLAR ARRAY"][w.location], ox + 240, oy + 20, "#8fafa4", { font: "tiny", align: "center" });
        text(g, "RESERVE " + w.reserve, ox + 458, oy + 11, "#cde5cd", { align: "right" });
        if (w.assisted && !attract)
          text(g, "ASSISTED", ox + 458, oy + 22, "#dca68f", { align: "right", font: "tiny" });
        for (const s of w.players) {
          if (!s.active)
            continue;
          const left = s.seat === 0 ? 21 : 310;
          text(g, "P" + (s.seat + 1), ox + left, oy + 260, s.seat === 0 ? "#b4f5cf" : "#ffb297");
          for (let i = 0;i < 3; i++) {
            px.rect(g, ox + left + 17 + i * 7, oy + 261, 5, 5, i < s.charges ? s.seat === 0 ? "#b4f5cf" : "#ffb297" : "#37535e");
            if (i < s.charges)
              px.dot(g, ox + left + 18 + i * 7, oy + 262, "#f5ffd7");
          }
          text(g, s.alive ? "REPAIR" : s.respawn > 0 ? "RETURNING" : "SPECTATING", ox + left + 42, oy + 261, "#8faea0", { font: "tiny" });
        }
        if (w.status === "transition") {
          px.rect(g, ox + 85, oy + 112, 310, 43, "#0c2634");
          text(g, w.nextEncounter === 6 ? "HOSTILE FLAGSHIP INBOUND" : w.nextEncounter % 2 === 0 ? "NEXT OUTPOST SECURED" : "FORMATION CLEARED", ox + 240, oy + 120, "#ffdaa0", { align: "center", scale: 2 });
          text(g, "CATCH YOUR BREATH. REPAIR YOUR COVER.", ox + 240, oy + 144, "#b6d6be", { align: "center" });
        }
        if (w.encounter === 0 && w.encounterTime < 40 && !front && !attract) {
          let hint;
          if (!w.intro?.moved)
            hint = "MOVE TO CHOOSE YOUR FIRING LANE";
          else if (!w.intro?.fired)
            hint = "HOLD FIRE TO CUT THROUGH YOUR OWN COVER";
          else if (!w.intro?.repaired)
            hint = w.players.some((s) => s.charges) ? "REPAIR NEAR A BUNKER  -  KEEP YOUR BARREL LANE" : "CATCH THE DIAMOND SALVAGE";
          if (hint) {
            px.rect(g, ox + 85, oy + 174, 310, 15, "#112c38");
            text(g, hint, ox + 240, oy + 178, "#ffe0a3", { align: "center" });
          }
        }
        if (overlays) {
          text(g, "TICK " + w.tick + "  EPOCH " + w.epoch, ox + 20, oy + 36, "#ebbe9e", { font: "tiny" });
          for (const s of w.players)
            if (s.alive) {
              const [x, y] = r.w(s.x, s.y, 0);
              border(g, x - 5, y - 4, 10, 8, "#ff6d90");
            }
        }
      });
    }
    return { drawWorld, background, events, update, reset() {
      fx = [];
      celebration = 0;
      celebrationBeat = 0;
    } };
  }

  // src/ui.js
  var escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var btn = (id, label, sub = "", secondary = false, disabled = false) => `<button class="action ${secondary ? "secondary" : ""}" data-action="${id}" ${disabled ? "disabled" : ""}>${escape(label)}${sub ? `<small>${escape(sub)}</small>` : ""}</button>`;
  var TEST_Q = ["How many issues did testing catch?", "How many were critical or game breaking?", "Most helpful test", "Least helpful test"];
  var ENGINE_Q = ["What did you like most about the engine?", "Did you get stuck or guess wrong?", "Most important system built", "Hardest part of using the engine", "Engine changes and reasons", "One suggested engine change"];
  var PROMPT_Q = ["What worked best in the prompt?", "What was confusing?", "What was hardest?", "One suggested prompt change"];

  class Interface {
    constructor(app, report) {
      this.app = app;
      this.game = app.game;
      this.report = report;
      this.root = typeof document === "undefined" ? null : document.getElementById("ui");
      this.screen = "title";
      this.page = 0;
      this.focus = 0;
      this.memory = {};
      this.parent = "title";
      this.rows = [];
      this.lock = 0.2;
      this.devPage = 0;
      this.pages = this.reportPages();
    }
    reportPages() {
      const pages = [{ title: "About Orbit Invadettes", body: [
        ["ORIGINAL GAME", "Cut a lane. Catch the scrap. Keep your planet. Six formations across three outposts, then an original hostile flagship. Solo or simultaneous local co-op; shared-world online co-op when launched by AI Hub."],
        ["CREDITS", "Game design, programming, original pixel art and procedural music: OpenAI gpt-6.1-sol. Built on Michael Crosato’s my-3D2dge. AI Hub session client by Michael Crosato. No commercial game assets, ROMs or recorded audio."],
        ["SOURCE INTERPRETATION", "Inspired by Bally’s Astrocade Space Invaders, subsequently called Astro Battle. The supplied combined source wording is interpreted this way; it is not a newly established release-history claim. Repair salvage, specialists, co-op and the flagship are original additions."]
      ] }, { title: "Research & licenses", body: [
        ["WHAT WAS EXAMINED", "Archived manual scan, manual transcription, Video Games October 1982 comparison, and sampled archive-linked Nice and Games Astro Battle footage at 90/120 seconds with a sequential filmstrip. Source sound was not listened to; exact audio is unknown."],
        ["PRIMARY SOURCES", "Bally Alley manual archive: ballyalley.com/cart_manuals/html_manuals/astro_battle.htm · gameplay archive: ballyalley.com/astrocade_videos/cartridge_videos/cartridge_videos.html. Detailed observations and retained references are in research/RESEARCH.md."],
        ["LICENSES", "my-3D2dge © 2026 Michael Crosato, MIT License. Permission is granted, free of charge, to use, copy, modify, merge, publish, distribute, sublicense and/or sell copies, subject to retaining the copyright and permission notice. Software is provided “AS IS”, without warranty. Full MIT notice is retained in this HTML."]
      ] }];
      const fields = Object.entries(this.report.sourceInformation);
      for (let i = 0;i < fields.length; i += 3)
        pages.push({ title: "Source information", body: fields.slice(i, i + 3).map(([k, v]) => [k.replace(/([A-Z])/g, " $1").toUpperCase(), v]) });
      for (const [title, questions, answers] of [["Testing feedback", TEST_Q, this.report.testingFeedback], ["Engine feedback", ENGINE_Q, this.report.engineFeedback], ["Prompt feedback", PROMPT_Q, this.report.promptFeedback]]) {
        for (let i = 0;i < answers.length; i += 2)
          pages.push({ title, body: answers.slice(i, i + 2).map((v, j) => [questions[i + j], v]) });
      }
      return pages;
    }
    show(screen, opts = {}) {
      this.memory[this.screen] = this.focus;
      if (opts.parent)
        this.parent = opts.parent;
      this.screen = screen;
      this.focus = this.memory[screen] ?? 0;
      this.lock = 0.18;
      this.app.clearInput();
      this.render();
    }
    focusAt(n, { dom = true } = {}) {
      if (!this.rows.length)
        return;
      this.focus = (n + this.rows.length) % this.rows.length;
      this.rows.forEach((el, i) => {
        const row = el.closest(".setting-row") || el;
        row.classList.toggle("focused", i === this.focus);
      });
      if (dom && this.rows[this.focus]) {
        this.rows[this.focus].focus({ preventScroll: true });
        this.rows[this.focus].scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
      }
    }
    frame(title, sub, body, extra = "") {
      return `<section class="screen menu-screen ${extra}" aria-label="${escape(title)}"><p class="eyebrow">ORBIT INVADETTES / DEFENSE NETWORK</p><h1 class="menu-title">${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}${body}</section>`;
    }
    render() {
      if (!this.root)
        return;
      const a = this.app, w = a.world, s = this.screen, hub = !!a.session;
      if (s === "play" || s === "hub-wait") {
        this.root.innerHTML = "";
        this.rows = [];
        return;
      }
      if (s === "attract") {
        this.root.innerHTML = '<div class="demo-banner"><strong>ATTRACT PLAY</strong><p>AI demonstration · any input returns to title</p></div>';
        this.rows = [];
        return;
      }
      let html = "";
      if (s === "title") {
        html = `<section class="screen title-screen" aria-label="Title"><div class="title-art"><p class="eyebrow">A small planet. A very large problem.</p><h1 class="logo">Orbit<span>Invadettes</span></h1><p class="tagline">Cut a lane. Catch the scrap.<br>Keep your planet.</p><p class="edition">PLANETARY DEFENSE / EST. 1979 · REBUILT 2026</p></div><div class="menu-card"><span class="pill">1–2 PLAYERS / SIX WAVES + FLAGSHIP</span><div class="actions">${btn("launch", "Deploy cannons", "Solo or simultaneous local co-op")}${btn("controls", "How to defend")}${btn("settings", "Settings", "", true)}${btn("records", "Local records", "", true)}${btn("about", "About & credits", "", true)}</div><p class="foot"><span id="menu-prompt">${escape(a.menuPrompt())}</span><br>Online co-op is available through AI Hub.<br>Idle 10 seconds for a demonstration.</p></div></section>`;
      } else if (s === "launch") {
        const d = DIFFICULTIES[a.difficulty], name = typeof d === "string" ? d : d.name;
        html = this.frame("Choose your defense", "The entire campaign is available at every difficulty.", `<div class="actions">${btn("players", "Players: " + (a.playerCount === 1 ? "Solo" : "Two-player co-op"), a.playerCount === 1 ? "3 deployments, including your first cannon." : "6 shared deployments. Two pads, keyboard + pad, or split keyboard.")}${btn("difficulty", "Difficulty: " + name, d.description || d.help || "Adjust with Left / Right.")}${btn("start", "Launch defense", "Hold fire. Collect salvage. Repair the nearest bunker.")}${btn("back", "Back", "", true)}</div><p class="foot">P1: A/D · Space · Q. P2 on a shared keyboard: arrows · . · /.<br>Local roster locks at launch. A returning pad reclaims its seat.</p>`);
      } else if (s === "controls") {
        const t = a.primary === "touch", xbox = this.game.settings.glyphs === "xbox";
        html = this.frame("Two actions. One planet.", hub ? "Your Options overlay is local. The team’s world keeps moving." : "Six formations. Three outposts. One hostile flagship.", `<div class="control-grid"><div><strong>MOVE</strong>${t ? "Drag horizontally in the lower play area. Movement is relative to your thumb." : "Left stick / D-pad · A/D or arrows. Move the mouse inside the field to set a horizontal target."}</div><div><strong>FIRE</strong>${t ? "Clear lanes fire automatically. A second finger fires through cover to cut a new lane." : (xbox ? "Hold RT or A" : "Hold R2 or Cross") + " · Space or left mouse. Two missiles at a time. Your shots cut your bunkers."}</div><div><strong>REPAIR</strong>${t ? "Tap the temporary REPAIR button while moving. It appears when salvage can restore cover." : (xbox ? "LB or X" : "L1 or Square") + " · Q or right mouse. One charge restores a cluster in the nearest bunker."}</div><div><strong>READ THE SKY</strong>Gold brackets announce enemy fire. Mint diamonds are salvage. Keep aliens above the striped breach line.</div></div><div class="actions">${btn("back", "Ready", "", false)}</div><p class="foot">${t ? "Use two simultaneous contacts to deliberately cut cover." : "P2 shared keyboard: arrows · . to fire · / to repair."}<br>Options / Escape: ${hub ? "local options" : "pause"}. Xbox button names are available in Settings.</p>`);
      } else if (s === "settings") {
        const page = this.page % 2;
        const S = this.game.settings;
        const slider = (key, label, help = "") => `<label class="setting-row"><span>${label} <span class="value" data-value="${key}">${Math.round(S[key] * 100)}%</span></span><input aria-label="${label}" data-setting="${key}" type="range" min="0" max="1" step=".05" value="${S[key]}">${help ? `<small>${help}</small>` : ""}</label>`;
        const toggle = (id, label, value, help = "") => btn(id, label + ": " + (value ? "On" : "Off"), help);
        let body = page === 0 ? [
          slider("volume", "Master"),
          slider("music", "Music", "Default 10%. All sound is generated in code."),
          slider("effects", "Effects"),
          slider("voice", "Alien voices"),
          toggle("mute", "Mute all", !S.sound)
        ].join("") : [
          btn("glyphs", "Controller labels: " + (S.glyphs === "xbox" ? "Xbox A / B / X / Y" : "PlayStation Cross / Circle")),
          toggle("motion", "Reduced motion", S.motion),
          toggle("flash", "Reduced flashes", S.flashes === 0),
          toggle("touchAssist", "Touch auto-fire", S.touchAssist, "Clear upward lanes fire automatically; two fingers intentionally cut cover."),
          btn("fullscreen", "Full screen", "Requires a browser gesture; availability depends on the browser.")
        ].join("");
        html = this.frame('Settings <span class="page-number">' + (page + 1) + " / 2</span>", hub ? "Local preferences only. The shared world continues." : "Your preferences persist when browser storage is available.", `<div class="actions">${body}${btn("settingsPage", page === 0 ? "Controls & accessibility →" : "← Sound settings", "", true)}${btn("resetSettings", "Reset preferences", "Music returns to 10%. Records are kept.", true)}${btn("back", "Back", "", true)}</div>`);
      } else if (s === "pause") {
        html = this.frame(hub ? "Local options" : "Defense paused", hub ? '<span class="local-live">TEAM WORLD IS LIVE</span>' : "Your cannons are holding position.", `<div class="actions">${btn("resume", "Return to defense")}${btn("settings", "Settings")}${btn("controls", "Controls", "", true)}${btn("dev", "Developer tools", "Diagnostics and live balance controls", true)}${hub ? "" : btn("restart", "Restart campaign", "A fresh run with the same roster and difficulty.", true) + btn("title", "Return to title", "", true)}</div><p class="foot">${hub ? "Your seat is neutral while this overlay is open." : "Pause from either player affects the whole local team."}</p>`);
      } else if (s === "dev") {
        const disabled = hub;
        const pg = this.devPage;
        let body = "";
        if (pg === 0) {
          body = `<div class="dev-grid"><div class="actions">${btn("invincible", "Invulnerability: " + (a.invulnerable ? "On" : "Off"), "Marks the run assisted.", false, disabled)}${btn("reserve", "Add a deployment", "Shared reserve +1", false, disabled)}${btn("charges", "Fill repair charges", "Each active player receives 3.", false, disabled)}${btn("encounter", "Encounter: " + (w.encounter === 6 ? "Flagship" : w.encounter + 1), "Left / Right selects, then restarts.", false, disabled)}${btn("phase", "Flagship phase: " + (w.boss?.phase ?? "—"), "Starts the selected boss phase.", false, disabled)}</div><div class="actions">${btn("restartEncounter", "Restart encounter", "Keeps score and cover; assisted.", false, disabled)}${btn("spawnType", "Spawn selection: " + a.spawnType, "Left / Right chooses enemy or saucer.", false, disabled)}${btn("spawn", "Spawn selected", "Adds the selected attacker / bonus.", false, disabled)}${btn("overlay", "Collision & telegraphs: " + (a.overlays ? "On" : "Off"))}${btn("time", "Time: " + a.speed + "×", "Live when the overlay is closed.", false, disabled)}${btn("step", "Single step", "One fixed 1/120 second step while this screen is open.", false, disabled)}</div></div><label class="setting-row"><span>Deterministic seed</span><input class="seed" id="seed-input" aria-label="Deterministic seed" type="text" inputmode="numeric" value="${w.seed}" ${disabled ? "disabled" : ""}><small>Use “Restart from seed” to begin an assisted campaign.</small></label>${btn("seed", "Restart from seed", "", true, disabled)}`;
        } else {
          const list = TUNING.slice((pg - 1) * 5, pg * 5);
          body = '<div class="actions">' + list.map((t) => `<label class="setting-row"><span>${escape(t.label)} <span class="value" data-tune-value="${t.key}">${Number(w.tuning[t.key]).toFixed(t.step < 1 ? 2 : 0)}</span></span><input type="range" data-tuning="${t.key}" aria-label="${escape(t.label)}" min="${t.min}" max="${t.max}" step="${t.step}" value="${w.tuning[t.key]}" ${disabled ? "disabled" : ""}><small>${escape(t.description)} Bounds ${t.min}–${t.max}.</small></label>`).join("") + btn("resetTuning", "Reset difficulty tuning", "Restores values from this difficulty’s preset.", true, disabled) + "</div>";
        }
        html = this.frame('Developer tools <span class="page-number">' + (pg + 1) + " / 3</span>", hub ? "World changes are disabled in AI Hub sessions. Local diagnostics remain available." : "Changing the world marks this run ASSISTED and separates its records.", body + `<div class="dev-summary" id="dev-summary">${escape(a.stateSummary())}</div><div class="page-actions">${btn("devPage", "Next page")}${btn("resume", "Play / observe")}${btn("back", "Back", "", true)}</div>`, "dev-screen");
      } else if (s === "results") {
        const won = w.status === "victory", interrupted = hub && !["victory", "defeat"].includes(w.status);
        const interruptedText = a.sessionEndReason === "host-left" ? "The host departed. This round is void." : a.sessionEndReason === "sat-out" ? "This seat is sitting out the round." : "AI Hub closed this round before a team outcome.";
        const minutes = Math.floor(w.time / 60), seconds = Math.floor(w.time % 60);
        html = this.frame(interrupted ? a.sessionEndReason === "host-left" ? "ROUND VOID." : "ROUND CLOSED." : won ? "PLANET KEPT." : "DEFENSE LOST.", interrupted ? interruptedText : won ? "The Invadettes have somewhere else to be." : /breach/i.test(w.reason) ? "An invader crossed the breach line." : w.reason === "time-expired" ? "Time expired before the flagship fell." : "All deployments were exhausted.", `<p class="pill">${escape((DIFFICULTIES[w.difficulty]?.name || "Standard") + " · " + (w.players.length > 1 ? "Co-op" : "Solo") + (w.assisted ? " · Assisted" : ""))}</p><p class="score">${String(w.score).padStart(6, "0")}</p><div class="contributions">${w.players.map((s2) => `<div><strong>P${s2.seat + 1} · ${s2.score} pts</strong><br>${s2.kills} targets · ${s2.repairs} repairs</div>`).join("")}</div><p class="sub">${minutes}:${String(seconds).padStart(2, "0")} · ${interrupted ? "No completed team outcome." : won ? "Six formations and the flagship cleared." : "Wave " + Math.min(6, w.encounter + 1) + " reached."}</p><div class="actions">${hub ? btn("resultsWait", "AI Hub handles the next round", "Waiting for the Hub result card.", false, true) : btn("restart", "Deploy again") + btn("settings", "Settings", "", true) + btn("title", "Title", "", true)}</div>`);
      } else if (s === "records") {
        const records = a.records.filter((r) => !!r.assisted === !!a.recordsAssisted).slice().sort((x, y) => y.score - x.score).slice(0, 7);
        html = this.frame("Local records", a.recordsAssisted ? "Assisted runs. These are kept separate from ordinary records." : "Ordinary rules. Scores stay on this browser.", `<div>${records.length ? records.map((r, i) => `<div class="record-row"><span>${i + 1}. ${escape(r.mode)}<br><small>${escape(r.difficulty)} · ${r.assisted ? "ASSISTED" : "STANDARD RULES"} · ${r.won ? "VICTORY" : "DEFEAT"}</small></span><strong>${r.score}</strong></div>`).join("") : '<p class="sub">A clean slate. Your planet awaits.</p>'}</div><div class="actions" style="margin-top:20px">${btn("recordFilter", a.recordsAssisted ? "View ordinary records" : "View assisted records", "", true)}${btn("back", "Back")}</div>`);
      } else if (s === "about") {
        const pg = this.pages[this.page % this.pages.length];
        html = this.frame(escape(pg.title) + ' <span class="page-number">' + (this.page + 1) + " / " + this.pages.length + "</span>", "Credits, provenance and honest build feedback.", `<div class="report-body">${pg.body.map(([k, v]) => `<p><strong>${escape(k)}</strong><br>${escape(v)}</p>`).join("")}</div><div class="page-actions">${btn("previous", "← Previous")}${btn("next", "Next →")}${btn("back", "Back", "", true)}</div>`, "report-screen");
      }
      this.root.innerHTML = html;
      this.rows = Array.from(this.root.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled)"));
      this.rows.forEach((el, i) => {
        el.addEventListener("pointerenter", () => this.focusAt(i, { dom: false }));
        el.addEventListener("focus", () => this.focusAt(i, { dom: false }));
        if (el.dataset.action)
          el.addEventListener("click", (e) => {
            if (performance.now() < a.wakeUntil) {
              e.preventDefault();
              return;
            }
            a.activity(e.pointerType === "touch" ? "touch" : e.pointerType === "mouse" ? "pointer" : a.primary);
            this.activate(el.dataset.action);
          });
        if (el.dataset.setting)
          el.addEventListener("input", () => {
            a.activity();
            this.game.settings.set(el.dataset.setting, Number(el.value));
            this.root.querySelector('[data-value="' + el.dataset.setting + '"]').textContent = Math.round(el.value * 100) + "%";
          });
        if (el.dataset.tuning)
          el.addEventListener("input", () => {
            a.tune(el.dataset.tuning, Number(el.value));
            this.root.querySelector('[data-tune-value="' + el.dataset.tuning + '"]').textContent = Number(el.value).toFixed(2);
          });
      });
      this.focusAt(Math.min(this.focus, this.rows.length - 1), { dom: false });
    }
    activate(id, dir = 1) {
      const a = this.app, s = this.screen;
      if (id === "back") {
        if (s === "title")
          return;
        if (s === "results") {
          if (!a.session)
            a.toTitle();
          return;
        }
        if (s === "pause" || s === "dev") {
          this.show(s === "dev" ? "pause" : "play");
          return;
        }
        this.show(this.parent || "title");
        return;
      }
      if (id === "settings" || id === "controls" || id === "dev" || id === "about" || id === "records" || id === "launch") {
        this.page = 0;
        if (id === "dev")
          this.devPage = 0;
        this.show(id, { parent: s });
        return;
      }
      if (id === "recordFilter") {
        a.recordsAssisted = !a.recordsAssisted;
        this.render();
        return;
      }
      if (id === "players") {
        a.playerCount = a.playerCount === 1 ? 2 : 1;
        this.render();
        return;
      }
      if (id === "difficulty") {
        a.difficulty = (a.difficulty + dir + 4) % 4;
        this.render();
        return;
      }
      if (id === "settingsPage") {
        this.page = (this.page + 1) % 2;
        this.render();
        return;
      }
      if (id === "previous" || id === "next") {
        this.page = (this.page + (id === "next" ? 1 : -1) + this.pages.length) % this.pages.length;
        this.render();
        return;
      }
      if (id === "devPage") {
        this.devPage = (this.devPage + 1) % 3;
        this.render();
        return;
      }
      if (id === "start" || id === "restart") {
        a.startRun();
        return;
      }
      if (id === "resume") {
        this.show("play");
        return;
      }
      if (id === "title") {
        a.toTitle();
        return;
      }
      if (id === "glyphs") {
        this.game.settings.set("glyphs", this.game.settings.glyphs === "xbox" ? "playstation" : "xbox");
        this.render();
        return;
      }
      if (id === "mute") {
        this.game.settings.set("sound", !this.game.settings.sound);
        this.render();
        return;
      }
      if (id === "motion") {
        this.game.settings.set("motion", !this.game.settings.motion);
        this.render();
        return;
      }
      if (id === "flash") {
        this.game.settings.set("flashes", this.game.settings.flashes === 0 ? 1 : 0);
        this.render();
        return;
      }
      if (id === "touchAssist") {
        this.game.settings.set("touchAssist", !this.game.settings.touchAssist);
        this.render();
        return;
      }
      if (id === "resetSettings") {
        a.resetSettings();
        this.render();
        return;
      }
      if (id === "fullscreen") {
        a.fullscreen();
        return;
      }
      a.devAction(id, dir);
      this.render();
    }
    update(dt) {
      this.lock = Math.max(0, this.lock - dt);
      if (["play", "attract", "hub-wait"].includes(this.screen))
        return;
      for (const I of this.game.players) {
        if (this.lock > 0)
          continue;
        if (I.repeat("down", 0.32, 0.12)) {
          this.focusAt(this.focus + 1);
          this.app.activity(I.lastDevice);
        }
        if (I.repeat("up", 0.32, 0.12)) {
          this.focusAt(this.focus - 1);
          this.app.activity(I.lastDevice);
        }
        const el = this.rows[this.focus];
        if (!el)
          continue;
        if (el.tagName === "INPUT" && el.type === "text") {
          if (I.pressed("cancel") || I.pressed("pause")) {
            this.activate("back");
            I.consumeAll();
          }
          continue;
        }
        let dir = 0;
        if (I.repeat("left", 0.32, 0.12))
          dir = -1;
        if (I.repeat("right", 0.32, 0.12))
          dir = 1;
        if (dir) {
          this.app.activity(I.lastDevice);
          if (el.type === "range") {
            el.value = Math.max(Number(el.min), Math.min(Number(el.max), Number(el.value) + Number(el.step || 1) * dir));
            el.dispatchEvent(new Event("input", { bubbles: true }));
          } else if (["players", "difficulty", "encounter", "phase", "spawnType", "time", "glyphs"].includes(el.dataset.action))
            this.activate(el.dataset.action, dir);
        }
        if (I.pressed("confirm") || I.pressed("start")) {
          this.app.activity(I.lastDevice);
          if (el.dataset.action)
            this.activate(el.dataset.action);
          I.consumeAll();
          break;
        }
        if (I.pressed("cancel") || I.pressed("pause")) {
          this.app.activity(I.lastDevice);
          this.activate("back");
          I.consumeAll();
          break;
        }
      }
      if (this.screen === "dev") {
        const el = this.root?.querySelector("#dev-summary");
        if (el)
          el.textContent = this.app.stateSummary();
      }
    }
  }

  // src/session.js
  var STEP = 1 / 120;
  var HEARTBEAT_MS = 100;
  var STALE_MS = 650;
  var MAX_BYTES = 16000;
  var MAX_PRESENTATION_EVENTS = 64;
  var KEYS = ("tick time seed rng epoch encounter status reason score reserve extraAwarded assisted players enemies bullets pickups bunkers formation boss saucer events tuning difficulty location encounterTime transitionTime nextEncounter killCount stats intro eventSeq " + "seat id x y alive respawn protected charges kills repairs recovery active gone mask original cols rows cell center row col type hp maxHp telegraph flash vy owner kind r life dir timer beat initial interval " + "phase emitters open cycle safeLane age hit playerSpeed shotRecovery marchInterval descent fireInterval playerShotSpeed bombSpeed salvageEvery repairYield bossHealth " + "shotTimer fireTimer saucerTimer bossTimer nextId shots hits lost deployed earned missed caught spent repaired totalKills lastDamage moved fired repairedCover info delay duration " + "fireColumn fireCycle volleyTimer nextSaucer repairCount shield introMoved introFire introRepair name value count bossPhase breach enemyKills spawnTimer safe transition").trim().split(/\s+/);
  var KEY_INDEX = new Map(KEYS.map((key, index) => [key, "~" + index.toString(36)]));
  var KEY_REVERSE = new Map([...KEY_INDEX].map(([key, value]) => [value, key]));
  var clamp2 = (value, low, high) => Math.max(low, Math.min(high, value));
  var finite2 = (value) => typeof value === "number" && Number.isFinite(value);
  var neutral = () => ({ move: 0, fire: false, repair: false });
  var byteLength = (value) => new TextEncoder().encode(JSON.stringify(value)).length;
  function packWorld(value) {
    if (Array.isArray(value)) {
      if (value.length >= 32 && value.every((item) => item === 0 || item === 1)) {
        let hex = "";
        for (let i = 0;i < value.length; i += 4) {
          let nibble = 0;
          for (let j = 0;j < 4; j++)
            if (value[i + j])
              nibble |= 1 << j;
          hex += nibble.toString(16);
        }
        return ["$bits", value.length, hex];
      }
      return value.map(packWorld);
    }
    if (!value || typeof value !== "object")
      return value;
    const packed = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype")
        continue;
      const compact = KEY_INDEX.get(key) ?? (key.startsWith("~") ? "~" + key : key);
      packed[compact] = packWorld(child);
    }
    return packed;
  }
  function unpackWorld(value) {
    if (Array.isArray(value)) {
      if (value[0] === "$bits" && Number.isInteger(value[1]) && value[1] >= 0 && value[1] <= 4096 && typeof value[2] === "string") {
        const result = [];
        for (let i = 0;i < value[1]; i++)
          result.push(parseInt(value[2][i >> 2], 16) >> (i & 3) & 1);
        return result;
      }
      return value.map(unpackWorld);
    }
    if (!value || typeof value !== "object")
      return value;
    const unpacked = {};
    for (const [key, child] of Object.entries(value)) {
      const original = KEY_REVERSE.get(key) ?? (key.startsWith("~~") ? key.slice(1) : key);
      if (original === "__proto__" || original === "constructor" || original === "prototype")
        continue;
      unpacked[original] = unpackWorld(child);
    }
    return unpacked;
  }
  function cleanCommand(command = {}) {
    const result = {
      move: finite2(command.move) ? clamp2(command.move, -1, 1) : 0,
      fire: command.fire === true,
      repair: command.repair === true
    };
    if (finite2(command.targetX))
      result.targetX = clamp2(command.targetX, 18, 462);
    return result;
  }
  async function connectSession(options) {
    const hub = options.hub ?? globalThis.AIHub;
    if (!hub?.connect)
      return null;
    const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
    if (!info)
      return null;
    return createSessionController(info, { ...options, hub });
  }
  function createSessionController(info, {
    hub = globalThis.AIHub,
    createWorld: createWorld2,
    stepWorld: stepWorld2,
    leaveSeat: leaveSeat2,
    onWorld = () => {},
    onEvents = () => {},
    onEnd = () => {},
    onStart = () => {},
    now = () => globalThis.performance.now(),
    schedule = (fn) => globalThis.setInterval(fn, 16),
    cancel = (id) => globalThis.clearInterval(id)
  }) {
    if (typeof createWorld2 !== "function" || typeof stepWorld2 !== "function") {
      throw new TypeError("Hub integration needs createWorld and stepWorld.");
    }
    const roster = info.players.slice(0, 2).map((player) => ({ ...player }));
    const idToSeat = new Map(roster.map((player, seat) => [player.id, seat]));
    const ownSeat = info.server ? -1 : idToSeat.get(info.me) ?? -1;
    const worldRng = hub.rng("world");
    const seed = Math.floor(worldRng() * 4294967296) >>> 0;
    let world = createWorld2({ seed, players: roster.length, difficulty: 1, ids: roster.map((player) => player.id) });
    let previousWorld = null;
    let previousAt = 0;
    let snapshotAt = 0;
    let snapshotSeq = 0;
    let lastSnapshotSeq = -1;
    let localPacketSeq = 0;
    let localRepairSeq = 0;
    let localRepairHeld = false;
    let localCommand = neutral();
    let overlayOpen = false;
    const movementHistory = [];
    let lastMovementSignature = "";
    let started = false;
    let playable = false;
    let ended = false;
    let finished = false;
    let finishCalled = false;
    let finishDeadline = Infinity;
    let phase = "waiting";
    let timer = null;
    let lastSend = -Infinity;
    let initialSent = false;
    let latestEvent = 0;
    let presentationQueue = [];
    const activeIds = new Set(roster.map((player) => player.id));
    const terminalAcks = new Set(info.isHost && ownSeat >= 0 ? [info.me] : []);
    const slots = roster.map(() => ({
      command: neutral(),
      packetSeq: -1,
      receivedAt: -Infinity,
      repairSeq: 0,
      repairAck: 0,
      timedOut: false,
      overlay: false
    }));
    const offs = [];
    const diagnostics = {
      protocol: 1,
      client: "1.4.0",
      strategy: "reliable complete snapshots at 10 Hz",
      snapshotBytes: 0,
      maxSnapshotBytes: 0,
      snapshotsSent: 0,
      snapshotsReceived: 0,
      inputPackets: 0,
      rejectedInputs: 0,
      staleInputs: 0,
      inputTimeouts: 0,
      eventsReceived: 0,
      targetTick: 0,
      finishCalls: 0,
      stopped: false,
      localInputSeq: 0,
      localRepairSeq: 0,
      repairAcks: slots.map(() => 0),
      inputAcks: slots.map(() => -1),
      rejectedSnapshots: 0,
      terminalAcks: 0,
      pumpErrors: []
    };
    function collectEvents(events) {
      if (!events?.length)
        return;
      const fresh = events.filter((event2) => !finite2(event2.id) || event2.id > latestEvent);
      if (!fresh.length)
        return;
      for (const event2 of fresh)
        if (finite2(event2.id))
          latestEvent = Math.max(latestEvent, event2.id);
      onEvents(fresh);
      presentationQueue.push(...fresh);
      if (presentationQueue.length > MAX_PRESENTATION_EVENTS) {
        presentationQueue = presentationQueue.slice(-MAX_PRESENTATION_EVENTS);
      }
    }
    function sendSnapshot(terminal = false) {
      if (ended || !info.isHost)
        return false;
      const savedEvents = world.events;
      world.events = [];
      let packed;
      try {
        packed = packWorld(world);
      } finally {
        world.events = savedEvents;
      }
      const packet = {
        t: "s",
        n: ++snapshotSeq,
        at: Math.round(hub.time()),
        w: packed,
        a: slots.map((slot) => slot.repairAck),
        i: slots.map((slot) => slot.packetSeq),
        e: presentationQueue,
        over: terminal ? 1 : 0
      };
      const size = byteLength(packet);
      diagnostics.snapshotBytes = size;
      diagnostics.maxSnapshotBytes = Math.max(diagnostics.maxSnapshotBytes, size);
      if (size >= MAX_BYTES) {
        hub.fail("Orbit Invadettes complete world exceeded its verified snapshot envelope.");
        stopInternal("snapshot-too-large");
        return false;
      }
      const sent = hub.send(packet, { reliable: true });
      if (sent !== false) {
        diagnostics.snapshotsSent++;
        presentationQueue = [];
      }
      return sent !== false;
    }
    function sendInput() {
      if (ended || finished || ownSeat < 0 || info.isHost)
        return;
      const c = overlayOpen ? neutral() : localCommand;
      const packet = {
        t: "i",
        n: ++localPacketSeq,
        at: Math.round(hub.time()),
        m: c.move,
        f: c.fire ? 1 : 0,
        r: localRepairSeq,
        o: overlayOpen ? 1 : 0
      };
      if (finite2(c.targetX))
        packet.x = c.targetX;
      hub.send(packet, { to: info.host, reliable: false });
      diagnostics.inputPackets++;
      diagnostics.localInputSeq = localPacketSeq;
    }
    function receiveInput(packet, from) {
      const seat = idToSeat.get(from);
      if (seat === undefined || !activeIds.has(from) || from === info.me || !Number.isSafeInteger(packet.n) || packet.n < 0 || !finite2(packet.at) || !finite2(packet.m) || Math.abs(packet.m) > 1 || packet.f !== 0 && packet.f !== 1 || packet.o !== undefined && packet.o !== 0 && packet.o !== 1 || !Number.isSafeInteger(packet.r) || packet.r < 0 || packet.x !== undefined && (!finite2(packet.x) || packet.x < 18 || packet.x > 462) || packet.seat !== undefined && packet.seat !== seat || packet.id !== undefined && packet.id !== from) {
        diagnostics.rejectedInputs++;
        return;
      }
      const slot = slots[seat];
      const timeline = hub.time();
      if (packet.n <= slot.packetSeq || packet.at < timeline - 2000 || packet.at > timeline + 1000) {
        diagnostics.staleInputs++;
        return;
      }
      if (packet.r < slot.repairSeq) {
        diagnostics.rejectedInputs++;
        return;
      }
      slot.packetSeq = packet.n;
      slot.receivedAt = timeline;
      if (packet.r - slot.repairAck > 3)
        slot.repairAck = packet.r - 1;
      slot.repairSeq = packet.r;
      slot.overlay = packet.o === 1;
      if (slot.overlay)
        slot.repairAck = slot.repairSeq;
      slot.timedOut = false;
      slot.command = { move: packet.m, fire: !!packet.f, repair: false };
      if (finite2(packet.x))
        slot.command.targetX = packet.x;
      diagnostics.inputPackets++;
    }
    function commandsForTick() {
      const timeline = hub.time();
      return slots.map((slot, seat) => {
        const id = roster[seat].id;
        if (!activeIds.has(id))
          return neutral();
        if (seat === ownSeat && !info.server) {
          slot.command = overlayOpen ? neutral() : localCommand;
          slot.overlay = overlayOpen;
          slot.receivedAt = timeline;
          slot.repairSeq = localRepairSeq;
        }
        if (slot.overlay) {
          slot.repairAck = slot.repairSeq;
          diagnostics.repairAcks[seat] = slot.repairAck;
          return neutral();
        }
        if (timeline - slot.receivedAt > STALE_MS) {
          if (!slot.timedOut) {
            diagnostics.inputTimeouts++;
            slot.timedOut = true;
          }
          slot.repairAck = slot.repairSeq;
          return neutral();
        }
        const command = { ...slot.command, repair: false };
        if (slot.repairAck < slot.repairSeq) {
          slot.repairAck++;
          command.repair = !overlayOpen || seat !== ownSeat;
        }
        diagnostics.repairAcks[seat] = slot.repairAck;
        return command;
      });
    }
    function sendFinish() {
      if (ended || finishCalled || !info.isHost)
        return;
      finishCalled = true;
      diagnostics.finishCalls++;
      const ids = [...activeIds];
      const scores = {};
      const stats = {};
      for (const id of ids) {
        const player = world.players.find((candidate) => candidate.id === id);
        scores[id] = finite2(player?.score) ? player.score : 0;
        stats[id] = {
          "Team score": world.score || 0,
          "Aliens cleared": player?.kills || 0,
          Repairs: player?.repairs || 0
        };
      }
      hub.finish({ standings: ids.length ? [ids] : [], scores, won: world.status === "victory", stats });
    }
    function allTerminalAcknowledged() {
      return [...activeIds].every((id) => id === info.me || terminalAcks.has(id));
    }
    function finish(reason, graceMs = 5000) {
      if (ended || finished || !info.isHost)
        return;
      finished = true;
      phase = "finished";
      if (reason === "time-expired" && world.status !== "victory") {
        world.status = "defeat";
        world.reason = "time-expired";
        world.events = [{
          id: ++world.eventSeq,
          tick: world.tick,
          type: "defeat",
          x: 240,
          y: 135,
          value: "time-expired"
        }];
        collectEvents(world.events);
      }
      onWorld(world);
      sendSnapshot(true);
      finishDeadline = now() + clamp2(graceMs - 150, 0, 1200);
      if (allTerminalAcknowledged())
        sendFinish();
    }
    function receiveSnapshot(packet) {
      if (!Number.isSafeInteger(packet.n) || packet.n <= lastSnapshotSeq || !packet.w) {
        diagnostics.rejectedSnapshots++;
        return;
      }
      const snapshot = unpackWorld(packet.w);
      if (!Number.isSafeInteger(snapshot.tick) || snapshot.tick < 0 || !Array.isArray(snapshot.players) || snapshot.players.length !== roster.length || snapshot.players.some((player, seat) => player.id !== roster[seat].id)) {
        diagnostics.rejectedSnapshots++;
        return;
      }
      if (snapshot.tick < world.tick || (snapshot.epoch ?? 0) < (world.epoch ?? 0)) {
        diagnostics.rejectedSnapshots++;
        return;
      }
      lastSnapshotSeq = packet.n;
      previousWorld = world;
      previousAt = snapshotAt;
      snapshotAt = now();
      world = snapshot;
      world.events = [];
      diagnostics.snapshotsReceived++;
      diagnostics.snapshotBytes = byteLength(packet);
      diagnostics.maxSnapshotBytes = Math.max(diagnostics.maxSnapshotBytes, diagnostics.snapshotBytes);
      if (Array.isArray(packet.i))
        diagnostics.inputAcks = packet.i.slice(0, roster.length);
      const historyBefore = movementHistory.findLastIndex((sample) => sample.at <= world.time * 1000);
      if (historyBefore > 0)
        movementHistory.splice(0, historyBefore);
      if (Array.isArray(packet.a)) {
        diagnostics.repairAcks = packet.a.slice(0, roster.length);
      }
      onWorld(world);
      if (Array.isArray(packet.e)) {
        const fresh = packet.e.filter((event2) => event2 && finite2(event2.id) && event2.id > latestEvent);
        if (fresh.length) {
          latestEvent = Math.max(...fresh.map((event2) => event2.id));
          diagnostics.eventsReceived += fresh.length;
          onEvents(fresh);
        }
      }
      if (packet.over === 1) {
        finished = true;
        phase = "finished";
        hub.send({ t: "z", n: packet.n }, { to: info.host, reliable: true });
      }
    }
    function stopInternal(reason) {
      if (ended)
        return;
      ended = true;
      phase = "ended";
      localCommand = neutral();
      presentationQueue = [];
      diagnostics.stopped = true;
      if (timer !== null) {
        cancel(timer);
        timer = null;
      }
      for (const off of offs.splice(0))
        off();
      onEnd({ reason, world });
    }
    function pump() {
      if (ended)
        return;
      try {
        if (!started)
          return;
        const timeline = hub.time();
        const monotonic = now();
        if (finished) {
          if (info.isHost && !finishCalled && (allTerminalAcknowledged() || monotonic >= finishDeadline)) {
            sendFinish();
          }
          return;
        }
        if (timeline < 0) {
          if (info.isHost && !initialSent) {
            initialSent = true;
            sendSnapshot();
          }
          return;
        }
        if (!playable) {
          playable = true;
          phase = "playing";
          onStart({ world, info });
        }
        if (info.isHost) {
          const target = Math.floor(timeline * 120 / 1000);
          diagnostics.targetTick = target;
          let steps = 0;
          while (world.tick < target && steps < 2400 && !ended && !finished) {
            stepWorld2(world, commandsForTick(), STEP);
            collectEvents(world.events);
            steps++;
            if (world.status === "victory" || world.status === "defeat")
              finish(world.reason);
          }
          onWorld(world);
        }
        if (ended || finished)
          return;
        if (monotonic - lastSend >= HEARTBEAT_MS) {
          lastSend = monotonic;
          if (info.isHost)
            sendSnapshot();
          else
            sendInput();
        }
      } catch (error) {
        diagnostics.pumpErrors.push(String(error?.stack || error));
        hub.fail("Orbit Invadettes could not continue the authoritative round.");
        stopInternal("simulation-error");
      }
    }
    const controller = {
      active: true,
      isHost: !!info.isHost,
      server: !!info.server,
      seat: ownSeat,
      info,
      diagnostics,
      get world() {
        return world;
      },
      get phase() {
        return phase;
      },
      get ended() {
        return ended;
      },
      update(command = {}, overlay = false) {
        if (ended || finished || ownSeat < 0)
          return;
        overlayOpen = !!overlay;
        const c = cleanCommand(command);
        if (!overlayOpen && c.repair && !localRepairHeld)
          localRepairSeq++;
        localRepairHeld = c.repair;
        localCommand = overlayOpen ? neutral() : c;
        diagnostics.localRepairSeq = localRepairSeq;
        if (!info.isHost) {
          const signature = JSON.stringify([localCommand.move, localCommand.targetX ?? null, overlayOpen]);
          const timeline = hub.time();
          if (signature !== lastMovementSignature && finite2(timeline) && timeline >= 0) {
            movementHistory.push({ at: timeline, move: localCommand.move, targetX: localCommand.targetX });
            if (movementHistory.length > 256)
              movementHistory.shift();
            lastMovementSignature = signature;
          }
        }
      },
      interpolatedWorld(at = now()) {
        if (info.isHost || !previousWorld || previousWorld.epoch !== world.epoch || world.status !== "playing" || snapshotAt <= previousAt)
          return world;
        const alpha = clamp2((at - snapshotAt) / Math.max(HEARTBEAT_MS, snapshotAt - previousAt), 0, 1);
        const view = { ...world };
        for (const key of ["players", "enemies", "bullets", "pickups"]) {
          const old = new Map((previousWorld[key] || []).map((entity) => [entity.id ?? entity.seat, entity]));
          view[key] = (world[key] || []).map((entity) => {
            const prior = old.get(entity.id ?? entity.seat);
            if (!prior || key === "players" && prior.alive !== entity.alive)
              return entity;
            return {
              ...entity,
              x: finite2(prior.x) && finite2(entity.x) ? prior.x + (entity.x - prior.x) * alpha : entity.x,
              y: finite2(prior.y) && finite2(entity.y) ? prior.y + (entity.y - prior.y) * alpha : entity.y
            };
          });
        }
        const own = view.players?.[ownSeat];
        if (own?.alive && own.active !== false && movementHistory.length) {
          const until = hub.time();
          const from = Math.max(world.time * 1000, until - 500);
          const speed = finite2(world.tuning?.playerSpeed) ? world.tuning.playerSpeed : 150;
          let position = world.players[ownSeat].x;
          let cursor = from;
          let command = movementHistory.findLast((sample) => sample.at <= from) ?? neutral();
          const integrate = (finish2) => {
            const seconds = Math.max(0, finish2 - cursor) / 1000;
            let distance = command.move * speed * seconds;
            if (Math.abs(command.move) < 0.03 && finite2(command.targetX)) {
              const delta = command.targetX - position;
              distance = clamp2(delta, -speed * seconds, speed * seconds);
            }
            position = clamp2(position + distance, 18, 462);
            cursor = finish2;
          };
          for (const sample of movementHistory)
            if (sample.at > from && sample.at < until) {
              integrate(sample.at);
              command = sample;
            }
          integrate(until);
          view.players = view.players.slice();
          view.players[ownSeat] = { ...own, x: position };
        }
        return view;
      },
      stop() {
        stopInternal("stopped");
      },
      pump
    };
    offs.push(hub.on("start", () => {
      started = true;
      phase = "countdown";
      pump();
    }));
    offs.push(hub.on("message", (packet, from) => {
      if (ended || !packet || typeof packet !== "object")
        return;
      if (info.isHost && packet.t === "i" && !finished)
        receiveInput(packet, from);
      else if (!info.isHost && from === info.host && packet.t === "s")
        receiveSnapshot(packet);
      else if (info.isHost && finished && packet.t === "z" && activeIds.has(from) && Number.isSafeInteger(packet.n) && packet.n === snapshotSeq) {
        terminalAcks.add(from);
        diagnostics.terminalAcks = terminalAcks.size;
        if (allTerminalAcknowledged())
          sendFinish();
      }
    }));
    offs.push(hub.on("leave", ({ id }) => {
      if (ended)
        return;
      activeIds.delete(id);
      const seat = idToSeat.get(id);
      if (seat !== undefined) {
        slots[seat].command = neutral();
        slots[seat].repairAck = slots[seat].repairSeq;
        if (info.isHost) {
          if (typeof leaveSeat2 === "function")
            leaveSeat2(world, seat);
          else {
            const player = world.players[seat];
            player.active = false;
            player.gone = true;
            player.alive = false;
            player.respawn = 0;
          }
          onWorld(world);
        }
      }
      if (id === info.host)
        stopInternal("host-left");
      else if (info.isHost && started && !finished)
        sendSnapshot();
    }));
    offs.push(hub.on("time-up", ({ graceMs = 5000 } = {}) => {
      if (info.isHost)
        finish("time-expired", graceMs);
    }));
    offs.push(hub.on("end", ({ reason }) => stopInternal(reason)));
    collectEvents(world.events);
    onWorld(world);
    timer = schedule(pump);
    hub.ready();
    return controller;
  }
  // report.json
  var report_default = {
    sourceInformation: {
      date: "2026-11-06 02:27:09",
      source: "Astro Battle / Space Invaders — Bally Astrocade; the supplied 1979 combined source wording is interpreted this way. The renamed manual bears a 1981 copyright.",
      plan: "PLAN.md",
      genre: "Shooter / arcade planetary defense",
      perspective: "Fixed-screen overhead; screen-aligned horizontal cannon and upward fire.",
      tech: "JavaScript ES modules, Canvas2D and Web Audio; my-3D2dge handoff 0.89.1 at 8ecc2f62353761187bdfe226f327b7ea5d2eb691; AI Hub Session Protocol v1 client 1.4.0 at 35a1047f2067b2af3de3943f0fe452f39105d869. Bun bundles development modules; the final HTML is self-contained.",
      artDirection: "Original shaded pixel silhouettes, hue-shifted ramps, three planetary outpost palettes, native procedural lighting and a crisp retro-modern cabinet presentation.",
      animation: "Native E.anim march poses, cannon recoil/readiness, armor break, bunker debris and repair highlights, saucer wobble, flagship emitters/core windows and planetary victory fireworks on the native fixed clock.",
      audio: "Original runtime oscillator instruments, generated noise, three sparse location themes, flagship music, result stingers, event effects and filtered gibberish voice bus. No audio files. Music defaults to 10%.",
      online: "AI Hub host-authoritative shared-world co-op for 1–2 roster seats, reliable complete snapshots and acknowledged action heartbeats. Standalone supports solo and simultaneous local co-op.",
      testing: "One quiet command runs deterministic simulation and native headless drawing, ordinary-input complete STANDARD solo/co-op campaigns, Chromium integration, Firefox/WebKit smoke, emulated pads/phone/tablet, generated audio signal/mute probes, blocked/malformed storage and the pinned Hub harness with loss, latency, host departure and server hosting. Physical controller feel, human listening, real TV distance and real iOS behavior remain unknown.",
      research: "Examined archived manual transcription and PDF scan, contemporary Video Games October 1982 comparison, and archive-linked Nice and Games footage at 90/120 seconds plus sequential filmstrip. Exact source sound unknown: no human listening. Sources: ballyalley.com/cart_manuals/html_manuals/astro_battle.htm; ballyalley.com/astrocade_videos/cartridge_videos/cartridge_videos.html. Detailed evidence in research/RESEARCH.md.",
      environment: "Codex CLI (headless); Linux / Ubuntu 26.04.1 LTS on WSL2; Node24.21.0; Python Playwright1.63.0; Chromium153.0.8010.12, Firefox155.0 and WebKit26.6.",
      model: "OpenAI, gpt-6.1-sol, reasoning effort ultra",
      usage: "added on import"
    },
    testingFeedback: [
      "25 unique issues were found and fixed through automated tests, native API/contract reviews and screenshot inspection. Repeated failures from the same cause are counted once; test-pilot timing and observation mistakes are excluded. The issue ledger is evidence/ISSUES.md.",
      "2 critical defects: classic-script export syntax prevented boot, and a null native pad selector disabled solo controller discovery. Both are fixed and covered by regressions.",
      "Ordinary-input STANDARD solo and co-op campaigns through all six formations and both flagship phases, using normal damage and resources. Native-controller and live Hub checks then verified that the same rules survive integration.",
      "Menu screenshots captured before the entrance animation settled were least helpful. State assertions and settled screenshots gave clearer evidence."
    ],
    engineFeedback: [
      "The readable native sprite, animation, hue-ramp, synthesized-audio and deterministic advance APIs give this small arcade game a coherent foundation.",
      "I initially used incorrect native setting names and treated a null pad selector as automatic discovery. Reading the actual engine contracts and native regressions resolved these. The arcade helper also alternates turns, so simultaneous co-op uses the explicit shared world.",
      "The serializable deterministic combat world: shared erodible bunker masks, lane-preserving repair, deployment accounting and host authority.",
      "Keeping fixed combat bounds, local overlays and device ownership coherent across native rendering, menus and Hub lifecycle.",
      "None. The full pinned engine remains intact; the application uses its supported custom-menu and autoPause:false options.",
      "A documented serializable simulation/event adapter for small host-authoritative shared worlds would reduce integration work."
    ],
    promptFeedback: [
      "The source-specific spatial decision, finite campaign and explicit acceptance paths made a clear game to build.",
      "The two similar source names require an explicit interpretation; generic engine defaults also need reconciliation with the fixed-screen and co-op contracts.",
      "Proving ordinary campaign completion while keeping standalone, local co-op, touch and Hub authority on the same rules.",
      "Keep required behavior and deliverables separate from suggested file organization so acceptance is faster to audit."
    ],
    aiHub: {
      name: "Orbit Invadettes",
      tagline: "Cut a lane. Catch the scrap. Keep your planet.",
      description: "Six marching alien formations threaten three planetary outposts. Cut firing lanes through your bunkers, catch salvage to repair them, and bring down an original hostile flagship alone or together.",
      type: "Game",
      genre: "Shooter",
      source: "Astro Battle / Space Invaders — Bally Astrocade",
      series: "",
      players: "1–2",
      controls: "Move: stick/D-pad, A/D/arrows or mouse; fire: R2/Cross, Space/left mouse; repair: L1/Square, Q/right mouse; pause/options: Options/Escape. Touch: relative drag, assisted fire, second-contact lane cutting and contextual repair.",
      tags: [
        "2d",
        "arcade",
        "co-op",
        "pixel art",
        "sci-fi",
        "boss fights"
      ]
    }
  };

  // src/app.js
  var E = globalThis.My3D2dge;
  var clamp3 = (v, a, b) => Math.max(a, Math.min(b, v));
  var keymap = {
    up: ["KeyW", "ArrowUp", "Pad12", "PadAxisUp"],
    down: ["KeyS", "ArrowDown", "Pad13", "PadAxisDown"],
    left: ["KeyA", "ArrowLeft", "Pad14", "PadAxisLeft"],
    right: ["KeyD", "ArrowRight", "Pad15", "PadAxisRight"],
    fire: ["Space", "Mouse0", "Pad0", "Pad7"],
    repair: ["KeyQ", "Mouse2", "Pad4", "Pad2"],
    confirm: ["Enter", "Space", "Pad0"],
    cancel: ["Escape", "Backspace", "Pad1"],
    start: ["Enter", "Pad9"],
    pause: ["Escape", "Pad9"],
    halves: { left: { fire: ["Space"], repair: ["KeyQ"], confirm: ["Enter"], start: ["Enter"], pause: ["Escape"], cancel: ["Escape"] }, right: { fire: ["Period", "Numpad1"], repair: ["Slash", "Numpad2"], pause: ["Backspace"], start: ["Digit2"], confirm: ["Enter", "NumpadEnter"], cancel: ["Backspace"] } }
  };

  class App {
    constructor() {
      this.report = report_default;
      this.playerCount = 1;
      this.difficulty = 1;
      this.primary = "keyboard";
      this.idle = 0;
      this.speed = 1;
      this.invulnerable = false;
      this.overlays = false;
      this.spawnType = "ordinary";
      this.drain = 0;
      this.wakeUntil = 0;
      this.noticeTime = 0;
      this.pointerTarget = null;
      this.touchContacts = new Map;
      this.padHistory = new Map;
      this.padWakeBlocked = false;
      this.activeRun = false;
      this.session = null;
      this.attractAge = 0;
      this.attractSegment = -1;
      this.recorded = false;
      this.resultDelay = null;
      this.lobby = false;
      this.silenced = false;
      this.game = new E.Game({ id: "orbit-invadettes-v1", canvas: "screen", res: [480, 270], expand: true, view: "overhead", views: ["overhead"], input: keymap, menu: false, corner: false, fullscreen: false, autoPause: false, backGesture: false, bg: "#07141e", draw: true });
      this.game.cam.smooth = 0;
      this.game.focus(240, 135, 0);
      this.game.input.touchEnabled = false;
      this.game.input.touchButtons([]);
      const S = this.game.settings;
      S.set("touch", "off");
      for (const [key, value] of [["music", 0.1], ["glyphs", "playstation"]])
        S.define({ ...S.spec(key), key, value });
      S.define({ key: "voice", label: "Alien voices", group: "Sound", type: "slider", value: 1, min: 0, max: 1, step: 0.05, apply: (g, v) => {
        g.audio.voiceVolume = v;
        g.audio.applyVolume();
      } });
      S.define({ key: "touchAssist", label: "Touch auto-fire", group: "Touch", value: true });
      this.world = createWorld({ seed: 101 });
      this.titleWorld = createWorld({ seed: 101 });
      this.world = this.titleWorld;
      for (const t of TUNING)
        S.define({ key: "dev_" + t.key, label: t.label, group: "Balance", type: "slider", value: t.default, min: t.min, max: t.max, step: t.step, help: t.description, apply: (_g, v) => {
          if (this.ui?.screen === "dev" && !this._syncTuning && !this.session)
            setTuning(this.world, t.key, v);
        } });
      this.assets = createAssets(E);
      this.audio = createAudio(this.game);
      this.view = createView(E, this.game, this.assets);
      this.records = this.loadRecords();
      this.ui = new Interface(this, report_default);
      this.ui.render();
      this.bindEvents();
      this.game.debug = { snapshot: () => ({ scene: this.ui.screen, world: JSON.parse(JSON.stringify(this.world)), primary: this.primary, session: this.session?.diagnostics, idle: this.idle, records: this.records.length }), state: () => this.world };
      this.game.start({ scene: "cabinet", scenes: { cabinet: { pausable: false, camera: { zoom: false }, update: (dt) => this.update(dt), draw: (r) => this.draw(r), back: () => {
        if (this.ui.screen !== "play")
          this.ui.activate("back");
        else
          this.openPause();
        return true;
      } } } });
      this.game.fadeTime = 0;
      globalThis.__OI = this;
      globalThis.__game = this.game;
    }
    async connect() {
      this.session = await connectSession({
        createWorld,
        stepWorld,
        leaveSeat,
        onWorld: (w) => {
          this.world = w;
          this.activeRun = true;
          this.game.allowJoin(false);
        },
        onEvents: (events) => this.present(events),
        onStart: () => {
          this.activeRun = true;
          this.ui.show("play");
          this.clearInput();
        },
        onEnd: ({ reason, world }) => {
          this.sessionEndReason = reason;
          if (world)
            this.world = world;
          this.silenced = true;
          this.audio.stop();
          this.touchContacts.clear();
          this.ui.show("results");
          this.notify(reason === "host-left" ? "HOST DEPARTED · ROUND VOID" : reason === "time-up" ? "TIME EXPIRED" : "ROUND COMPLETE");
        }
      });
      if (this.session) {
        this.activeRun = true;
        this.ui.show(this.session.phase === "playing" ? "play" : "hub-wait");
        this.idle = 0;
        this.clearInput();
      }
    }
    loadRecords() {
      try {
        const r = JSON.parse(localStorage.getItem("orbit-invadettes-records-v1") || "null");
        if (r?.version === 1 && Array.isArray(r.records))
          return r.records.filter((x) => x && Number.isFinite(x.score) && x.score >= 0 && typeof x.mode === "string" && typeof x.difficulty === "string").slice(0, 60);
      } catch (_) {}
      return [];
    }
    saveRecord() {
      if (this.recorded || this.session || this.ui.screen === "attract")
        return;
      this.recorded = true;
      const w = this.world;
      this.records.push({ score: w.score, mode: w.players.length > 1 ? "Co-op" : "Solo", difficulty: DIFFICULTIES[w.difficulty].name, assisted: !!w.assisted, won: w.status === "victory", time: Math.round(w.time) });
      this.records.sort((a, b) => b.score - a.score);
      this.records = this.records.slice(0, 60);
      try {
        localStorage.setItem("orbit-invadettes-records-v1", JSON.stringify({ version: 1, records: this.records }));
      } catch (_) {}
    }
    menuPrompt() {
      return this.primary === "gamepad" ? this.game.settings.glyphs === "xbox" ? "D-pad + A select · B back" : "D-pad + Cross select · Circle back" : this.primary === "touch" ? "Tap to choose · drag to defend" : "Arrows + Enter · mouse to choose";
    }
    clearInput() {
      for (const I of this.game.players)
        I.clear();
      this.pointerTarget = null;
      this.touchContacts.clear();
      this.drain = 0.16;
      this.repairQueued = false;
    }
    activity(device) {
      this.idle = 0;
      if (device && ["keyboard", "gamepad", "touch", "pointer", "mouse"].includes(device)) {
        const newDevice = device === "mouse" ? "pointer" : device;
        if (newDevice !== this.primary) {
          this.primary = newDevice;
          const prompt = typeof document !== "undefined" ? document.getElementById("menu-prompt") : null;
          if (prompt)
            prompt.textContent = this.menuPrompt();
          if (this.ui?.screen === "controls")
            this.ui.render();
        }
      }
      if (this.ui?.screen === "attract") {
        this.wakeUntil = performance.now() + 450;
        this.padWakeBlocked = device === "gamepad";
        this.toTitle();
        this.ui.lock = 0.45;
        return true;
      }
      return false;
    }
    notify(message) {
      this.notice = message;
      this.noticeTime = 2.6;
      if (typeof document !== "undefined") {
        const n = document.getElementById("notice");
        n.textContent = message;
        n.style.opacity = "1";
      }
    }
    point(e) {
      const rect = this.game.screen.canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / rect.width * this.game.W - (this.game.W - 480) / 2, y: (e.clientY - rect.top) / rect.height * this.game.H - (this.game.H - 270) / 2 };
    }
    bindEvents() {
      if (typeof window === "undefined")
        return;
      const c = this.game.screen.canvas;
      const actual = (e, device) => {
        if (!e.isTrusted && !e.__testReal)
          return false;
        const woke = this.activity(device);
        if (!this.silenced)
          this.audio.unlock();
        if (woke) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return true;
        }
        return false;
      };
      window.addEventListener("keydown", (e) => {
        if (actual(e, "keyboard"))
          return;
        if (e.code === "Tab") {
          this.idle = 0;
          return;
        }
        if (e.target.tagName === "INPUT")
          return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "Escape", "Backspace"].includes(e.code))
          e.preventDefault();
        if (e.code === "KeyA" || e.code === "KeyD" || e.code === "ArrowLeft" || e.code === "ArrowRight")
          this.pointerTarget = null;
      }, { capture: true });
      window.addEventListener("pointerdown", (e) => {
        if (actual(e, e.pointerType === "touch" ? "touch" : "pointer"))
          return;
      }, { capture: true });
      window.addEventListener("pointermove", (e) => {
        if (e.movementX || e.movementY)
          actual(e, e.pointerType === "touch" ? "touch" : "pointer");
      }, { capture: true });
      c.addEventListener("contextmenu", (e) => e.preventDefault());
      c.addEventListener("pointermove", (e) => {
        if (this.ui.screen !== "play" || performance.now() < this.wakeUntil)
          return;
        const pt = this.point(e);
        if (e.pointerType === "touch") {
          const q = this.touchContacts.get(e.pointerId);
          if (q) {
            q.x = pt.x;
            q.y = pt.y;
            if (q.role === "move")
              this.pointerTarget = clamp3(q.shipX + pt.x - q.startX, 18, 462);
          }
        } else if (pt.x >= 16 && pt.x <= 464 && pt.y >= 30 && pt.y <= 258 && (e.movementX || e.movementY))
          this.pointerTarget = pt.x;
      });
      c.addEventListener("pointerdown", (e) => {
        if (this.ui.screen !== "play" || performance.now() < this.wakeUntil)
          return;
        const pt = this.point(e);
        if (e.pointerType === "touch") {
          e.preventDefault();
          try {
            c.setPointerCapture(e.pointerId);
          } catch (_) {}
          const seat = this.session?.seat ?? 0, ship = this.world.players[seat];
          const role = this.touchContacts.size === 0 ? "move" : "fire";
          this.touchContacts.set(e.pointerId, { role, startX: pt.x, x: pt.x, y: pt.y, shipX: ship?.x ?? 240 });
        }
      });
      const release = (e) => {
        if (e.pointerType === "touch") {
          const role = this.touchContacts.get(e.pointerId)?.role;
          this.touchContacts.delete(e.pointerId);
          if (role === "move")
            this.pointerTarget = null;
          try {
            c.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
      };
      c.addEventListener("pointerup", release);
      c.addEventListener("pointercancel", release);
      c.addEventListener("lostpointercapture", release);
      const pb = document.getElementById("pause-button"), rb = document.getElementById("repair-button");
      pb.addEventListener("click", (e) => {
        e.stopPropagation();
        if (performance.now() >= this.wakeUntil)
          this.openPause();
      });
      rb.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.activity(e.pointerType === "touch" ? "touch" : "pointer");
        this.repairQueued = true;
      });
      window.addEventListener("blur", () => {
        this.clearInput();
        if (!this.session && this.ui.screen === "play")
          this.openPause();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.clearInput();
          if (!this.session && this.ui.screen === "play")
            this.openPause();
        }
      });
      window.addEventListener("resize", () => {
        this.touchContacts.clear();
        this.pointerTarget = null;
      });
    }
    pollPads() {
      let pads = [];
      try {
        pads = Array.from(navigator.getGamepads?.() || []);
      } catch (_) {}
      let neutral2 = true;
      for (const p of pads) {
        if (!p || p.connected === false)
          continue;
        const vals = [...p.axes, ...p.buttons.map((b) => b.value ?? (b.pressed ? 1 : 0))];
        const old = this.padHistory.get(p.index) || vals.map(() => 0);
        const significant = vals.some((v, i) => Math.abs(v) > 0.26 && Math.abs(v - (old[i] ?? 0)) > 0.16);
        if (vals.some((v) => Math.abs(v) > 0.24))
          neutral2 = false;
        if (significant) {
          this.activity("gamepad");
          if (!this.silenced)
            this.audio.unlock();
        }
        this.padHistory.set(p.index, vals);
      }
      if (neutral2)
        this.padWakeBlocked = false;
    }
    configureRoster() {
      this.game.allowJoin(false);
      if (this.playerCount === 1) {
        while (this.game.players.length > 1)
          this.game.removePlayer(2);
        this.game.input.pad = "any";
        return;
      }
      if (this.game.players.length > 1)
        return;
      let pads = [];
      try {
        pads = Array.from(navigator.getGamepads?.() || []).filter((p) => p && p.connected !== false);
      } catch (_) {}
      if (pads.length >= 2) {
        const p1 = pads.find((p) => p.index === this.game.input.padIndex) || pads[0];
        this.game.input.pad = p1.index;
        this.game.addPlayer({ pad: pads.find((p) => p.index !== p1.index).index });
      } else if (pads.length === 1) {
        this.game.input.pad = "any";
        this.game.addPlayer({ pad: pads[0].index });
      } else
        this.game.addPlayer({ keys: "right" });
    }
    startRun(seed) {
      if (this.session)
        return;
      this.audio.stop();
      this.silenced = false;
      this.speed = 1;
      this.invulnerable = false;
      this.overlays = false;
      this.game.timeScale = 1;
      this.game.hitstop = 0;
      this.game.resume();
      this.configureRoster();
      if (!Number.isFinite(seed)) {
        const a = new Uint32Array(1);
        crypto.getRandomValues(a);
        seed = a[0];
      }
      this.world = createWorld({ seed, players: this.playerCount, difficulty: this.difficulty });
      this.activeRun = true;
      this.recorded = false;
      this.resultDelay = null;
      this.titleWorld = null;
      this.view.reset();
      this.ui.show("play");
      this.idle = 0;
      this.audio.location(this.world);
      this.syncTuning();
    }
    toTitle() {
      if (this.session)
        return;
      this.game.allowJoin(false);
      this.lobby = false;
      this.activeRun = false;
      this.audio.stop();
      this.silenced = false;
      this.speed = 1;
      this.invulnerable = false;
      this.overlays = false;
      this.game.timeScale = 1;
      this.game.hitstop = 0;
      this.game.resume();
      while (this.game.players.length > 1)
        this.game.removePlayer(2);
      this.game.input.pad = "any";
      this.titleWorld = createWorld({ seed: 101 });
      this.world = this.titleWorld;
      this.view.reset();
      this.ui.parent = "title";
      this.ui.show("title");
      this.idle = 0;
    }
    openPause() {
      if (this.ui.screen !== "play" || this.session?.ended)
        return;
      this.ui.show("pause");
      this.audio.effect("select");
      this.audio.location(this.world);
    }
    resetSettings() {
      for (const group of ["Sound", "Comfort", "Controller", "Touch"])
        this.game.settings.reset(group);
      this.game.settings.set("music", 0.1);
      this.game.settings.set("touch", "off");
      this.game.settings.set("touchAssist", true);
      this.notify("PREFERENCES RESET · MUSIC 10%");
    }
    fullscreen() {
      const fs = this.game.fullscreen;
      if (!fs.supported) {
        this.notify("FULL SCREEN IS UNAVAILABLE IN THIS BROWSER");
        return;
      }
      fs.toggle().then((ok) => {
        if (!ok)
          this.notify("BROWSER DECLINED FULL SCREEN");
      });
    }
    syncTuning() {
      this._syncTuning = true;
      for (const t of TUNING)
        this.game.settings.set("dev_" + t.key, this.world.tuning[t.key]);
      this._syncTuning = false;
    }
    tune(key, value) {
      if (this.session) {
        this.notify("WORLD CONTROLS ARE DISABLED IN AI HUB");
        return;
      }
      this.game.settings.set("dev_" + key, value);
    }
    devAction(id, dir = 1) {
      const w = this.world;
      if (id === "overlay") {
        this.overlays = !this.overlays;
        return;
      }
      if (this.session) {
        this.notify("WORLD CONTROLS ARE DISABLED IN AI HUB");
        return;
      }
      w.assisted = true;
      if (id === "invincible") {
        this.invulnerable = !this.invulnerable;
        w.invulnerable = this.invulnerable;
      }
      if (id === "reserve")
        w.reserve++;
      if (id === "charges")
        w.players.forEach((p) => p.charges = 3);
      if (id === "encounter")
        startEncounter(w, (w.encounter + dir + 7) % 7);
      if (id === "phase") {
        if (w.encounter !== 6)
          startEncounter(w, 6);
        else if (w.boss.phase === 1) {
          w.boss.emitters.forEach((e) => e.hp = 0);
          w.boss.phase = 2;
          w.boss.phaseTime = 0;
          w.boss.open = true;
          w.boss.attackTimer = 4;
        } else
          startEncounter(w, 6);
      }
      if (id === "restartEncounter")
        startEncounter(w, w.encounter);
      if (id === "spawnType") {
        const list = ["ordinary", "armour", "bombardier", "saucer"];
        this.spawnType = list[(list.indexOf(this.spawnType) + dir + list.length) % list.length];
      }
      if (id === "spawn") {
        if (this.spawnType === "saucer")
          spawnSaucer(w);
        else if (w.encounter < 6)
          spawnEnemy(w, this.spawnType);
        else
          this.notify("FORMATION ENEMIES REQUIRE A FORMATION");
      }
      if (id === "time") {
        const list = [0, 0.25, 0.5, 1, 2];
        this.speed = list[(list.indexOf(this.speed) + dir + list.length) % list.length];
      }
      if (id === "step") {
        stepWorld(w, [], 1 / 120);
        this.present(w.events);
      }
      if (id === "seed") {
        const val = document.getElementById("seed-input")?.value.trim();
        if (!/^\d{1,10}$/.test(val || "")) {
          this.notify("ENTER A WHOLE NUMBER SEED");
          return;
        }
        const seed = Number(val) >>> 0;
        this.startRun(seed);
        this.world.assisted = true;
        this.ui.show("dev", { parent: "pause" });
      }
      if (id === "resetTuning") {
        resetTuning(w);
        this.syncTuning();
      }
    }
    stateSummary() {
      const w = this.world;
      return "SEED " + w.seed + "  TICK " + w.tick + "  EPOCH " + w.epoch + `
` + "ENCOUNTER " + (w.encounter + 1) + "  " + w.status.toUpperCase() + "  ENEMIES " + w.enemies.length + "  SHOTS " + w.bullets.length + `
` + "RESERVE " + w.reserve + "  SCORE " + w.score + "  " + (this.session ? JSON.stringify(this.session.diagnostics) : "LOCAL AUTHORITY · " + this.speed + "×");
    }
    sampleSeat(I, index) {
      const p = this.world.players[this.session?.seat ?? index];
      let move = I.move()[0];
      if (index === 0 && Math.abs(move) > 0.05)
        this.pointerTarget = null;
      let fire = I.down("fire"), repair2 = I.pressed("repair");
      if (index === 0) {
        if (this.pointerTarget !== null && Math.abs(move) < 0.05)
          move = 0;
        const touch = [...this.touchContacts.values()];
        const intentional = touch.some((t) => t.role === "fire");
        if (touch.length && p) {
          fire = intentional || this.game.settings.touchAssist && clearShot(this.world, p.x);
        }
        if (this.repairQueued) {
          repair2 = true;
          this.repairQueued = false;
        }
      }
      return { move, fire, repair: repair2, ...index === 0 && this.pointerTarget !== null ? { targetX: this.pointerTarget } : {} };
    }
    present(events) {
      if (!events?.length)
        return;
      this.view.events(events);
      if (!this.silenced)
        this.audio.events(events, this.world);
      for (const e of events) {
        if (e.type === "feedback")
          this.notify(e.text);
        if (e.type === "saucer" && this.activeRun)
          this.notify("BONUS SAUCER · EXTRA SALVAGE");
        if (e.type === "extra")
          this.notify("1,000 POINTS · EXTRA DEPLOYMENT");
        if (e.type === "stage" && this.activeRun && !this.session?.ended)
          this.notify(e.encounter === 6 ? "HOSTILE FLAGSHIP · BREAK BOTH EMITTERS" : ["TIDAL OUTPOST", "EMBER FOUNDRY", "AURORA CITADEL"][e.location] + " · WAVE " + (e.encounter + 1));
        if (e.type === "loss" && !this.game.settings.motion && this.game.settings.shake > 0)
          this.game.shake(1.4 * this.game.settings.shake);
      }
    }
    startAttract() {
      if (this.session)
        return;
      this.activeRun = false;
      this.attractAge = 0;
      this.attractSegment = -1;
      this.audio.stop();
      this.view.reset();
      this.ui.show("attract");
    }
    updateAttract(dt) {
      this.attractAge += dt;
      const seg = Math.floor(this.attractAge / 12) % 7;
      if (seg !== this.attractSegment) {
        this.attractSegment = seg;
        this.world = createWorld({ seed: 700 + seg, players: seg >= 4 ? 2 : 1, difficulty: 1 });
        this.world.invulnerable = true;
        this.world.assisted = true;
        this.world.players.forEach((p) => p.charges = 3);
        startEncounter(this.world, [0, 0, 1, 3, 5, 6, 6][seg]);
        if (seg === 1)
          this.world.bunkers[1].mask.fill(0);
        if (seg === 2)
          spawnSaucer(this.world);
        if (seg === 6) {
          this.world.boss.phase = 2;
          this.world.boss.emitters.forEach((e) => e.hp = 0);
          this.world.boss.open = true;
        }
      }
      const w = this.world, cmd = w.players.map((p, seat) => {
        let target = w.enemies.length ? w.enemies.slice().sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0].x + 8 : 240;
        if (w.saucer)
          target = w.saucer.x + 10;
        if (w.boss) {
          const emitter = w.boss.emitters.find((e) => e.hp > 0 && e.open) || w.boss.emitters.find((e) => e.hp > 0);
          target = w.boss.phase === 1 ? emitter?.x ?? 240 : w.boss.x;
        }
        const danger = w.bullets.find((b) => b.owner < 0 && b.y > 185 && Math.abs(b.x - p.x) < 16);
        if (danger)
          target = p.x + (p.x < danger.x ? -45 : 45);
        return { targetX: clamp3(target + (seat ? 18 : 0), 18, 462), fire: true, repair: w.tick % 180 === 0 };
      });
      stepWorld(w, cmd, dt);
      this.present(w.events);
    }
    update(dt) {
      if (!this.session?.server)
        this.pollPads();
      this.game.focus(240, 135, 0);
      this.game.timeScale = 1;
      this.view.update(dt);
      this.drain = Math.max(0, this.drain - dt);
      this.noticeTime = Math.max(0, this.noticeTime - dt);
      if (this.noticeTime === 0 && typeof document !== "undefined")
        document.getElementById("notice").style.opacity = "0";
      if (this.padWakeBlocked) {
        for (const I of this.game.players)
          I.consumeAll();
      }
      const screen = this.ui.screen;
      if (screen === "attract") {
        this.updateAttract(dt);
        return;
      }
      if (!this.session && !this.activeRun) {
        this.idle += dt;
        if (this.idle >= 10) {
          this.startAttract();
          return;
        }
        if (screen === "launch" && !this.lobby) {
          this.lobby = true;
          this.game.allowJoin({ max: 2, keys: true, onJoin: () => {
            this.playerCount = 2;
            this.ui.render();
          } });
        } else if (screen !== "launch" && this.lobby) {
          this.lobby = false;
          this.game.allowJoin(false);
        }
      }
      if (screen === "play" && this.drain <= 0 && !this.padWakeBlocked) {
        for (const I of this.game.players)
          if (I.pressed("pause") || I.pressed("start")) {
            this.activity(I.lastDevice);
            this.openPause();
            I.consumeAll();
            return;
          }
      }
      if (!this.padWakeBlocked)
        this.ui.update(dt);
      const playing = this.ui.screen === "play";
      const commands = this.session?.server || this.drain > 0 || !playing ? [] : this.game.players.map((I, i) => this.sampleSeat(I, i));
      if (this.session) {
        if (!this.session.ended)
          this.session.update(commands[0] || { move: 0, fire: false, repair: false }, !playing);
      } else if (playing && this.activeRun && this.speed > 0) {
        this.world.invulnerable = this.invulnerable;
        const total = dt * this.speed;
        let first = true;
        for (let left = total;left > 0.00000001; left -= 1 / 120) {
          const cmd = first ? commands : commands.map((c) => ({ ...c, repair: false }));
          stepWorld(this.world, cmd, Math.min(1 / 120, left));
          this.present(this.world.events);
          first = false;
        }
      }
      if (this.activeRun && !this.silenced)
        this.audio.location(this.world);
      if (this.activeRun && ["victory", "defeat"].includes(this.world.status) && this.ui.screen === "play") {
        if (this.world.status === "victory") {
          if (this.resultDelay === null)
            this.resultDelay = 2.4;
          else
            this.resultDelay -= dt;
        }
        if (this.world.status === "defeat" || this.resultDelay <= 0) {
          this.saveRecord();
          this.ui.show("results");
        }
      }
      if (typeof document !== "undefined") {
        const pb = document.getElementById("pause-button"), rb = document.getElementById("repair-button");
        pb.style.display = playing && !this.session?.ended ? "block" : "none";
        const seat = this.session?.seat ?? 0, p = this.world.players[seat], q = p ? repairPreview(this.world, seat) : null;
        rb.style.display = playing && this.primary === "touch" && q?.usable ? "block" : "none";
      }
    }
    draw(r) {
      const isFront = !this.activeRun && this.ui.screen !== "attract";
      const w = this.session ? this.session.interpolatedWorld() : this.world;
      this.game.lights.enabled = true;
      this.game.lights.ambient = 0.84;
      this.view.drawWorld(r, w, { front: isFront, attract: this.ui.screen === "attract", overlays: this.overlays });
      if (isFront)
        r.overlay((g) => E.px.blend(g, 0.38, "normal", () => E.px.rect(g, 0, 0, r.W, r.H, "#04121a")));
    }
  }
  var app = new App;
  app.connect().catch((e) => {
    app.game.fail("Hub connection", e);
    app.notify("SESSION CONNECTION FAILED");
  });
})();
