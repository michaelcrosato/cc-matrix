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

  // src/main.js
  var exports_main = {};
  __export(exports_main, {
    boot: () => boot
  });

  // content/stages.js
  var ARENA = Object.freeze({ x0: 0, y0: 0, x1: 384, y1: 240 });
  var PALETTES = [
    {
      name: "The Moonflower Beds",
      floor: "#101f25",
      edge: "#3c6760",
      leaf: "#355952",
      flower: "#efc28b",
      accent: "#edcf86",
      soil: "#233431"
    },
    {
      name: "The Glasshouse",
      floor: "#171c2b",
      edge: "#53607b",
      leaf: "#395e60",
      flower: "#bc9bd5",
      accent: "#b7d9dd",
      soil: "#2a2d42"
    },
    {
      name: "The Midnight Orchard",
      floor: "#181f29",
      edge: "#5c6465",
      leaf: "#466154",
      flower: "#e3a5a3",
      accent: "#f3c47c",
      soil: "#303534"
    }
  ];
  var rect = (x, y, w, h, kind = "bed") => ({ x, y, w, h, kind });
  var entry = (x, y, dx, dy) => ({ x, y, dx, dy });
  var entrances = [
    entry(14, 52, 1, 0),
    entry(370, 188, -1, 0),
    entry(192, 14, 0, 1),
    entry(14, 186, 1, 0),
    entry(370, 52, -1, 0),
    entry(192, 226, 0, -1)
  ];
  var schedule = (times, boss = false) => times.map((at, i) => ({
    at,
    type: boss && i === 0 ? "bell" : i % 2 ? "right" : "left",
    entrance: i % 6
  }));
  var STAGES = [
    {
      id: "moon-01",
      name: "A Little Night Buzz",
      garden: 0,
      lesson: "Fly over a gardener. Stay with it to finish the sting!",
      hint: "A gardener down = one ray recharged. Line up the rivals!",
      bounds: ARENA,
      obstacles: [rect(92, 90, 34, 18), rect(258, 142, 34, 18)],
      entrances,
      schedule: schedule([0, 11, 23, 35, 48, 61, 74]),
      coOpExtra: [
        { at: 32, type: "right", entrance: 4 },
        { at: 68, type: "left", entrance: 3 }
      ],
      rivals: {
        first: 8,
        interval: 13,
        cap: 2,
        guard: 15,
        hunter: 31,
        speed: 45
      },
      finish: "all-targets"
    },
    {
      id: "moon-02",
      name: "Left, Right, Goodnight",
      garden: 0,
      lesson: "Copper turns left. Jade turns right. Shells change their routes.",
      hint: "A shell is solid. Circle around it, or squeeze with Focus.",
      bounds: ARENA,
      obstacles: [
        rect(106, 46, 22, 64),
        rect(106, 144, 22, 50),
        rect(256, 46, 22, 64),
        rect(256, 144, 22, 50)
      ],
      entrances,
      schedule: schedule([0, 9, 20, 31, 42, 54, 66, 78, 86]),
      coOpExtra: [
        { at: 39, type: "left", entrance: 0 },
        { at: 73, type: "right", entrance: 1 }
      ],
      rivals: {
        first: 5,
        interval: 13,
        cap: 2,
        coOpInterval: 12,
        coOpCap: 4,
        guard: 12,
        hunter: 27,
        speed: 47
      },
      finish: "all-targets"
    },
    {
      id: "glass-01",
      name: "Guard Duty",
      garden: 1,
      lesson: "Scouts wander. Guards gather. Hunters chase. Zap their whole row!",
      hint: "A ray sweeps both ways, through every obstacle.",
      bounds: ARENA,
      obstacles: [
        rect(76, 96, 74, 20, "trellis"),
        rect(234, 124, 74, 20, "trellis"),
        rect(184, 50, 16, 27, "trellis"),
        rect(184, 163, 16, 27, "trellis")
      ],
      entrances,
      schedule: schedule([0, 8, 18, 29, 40, 51, 62, 73, 84, 94]),
      coOpExtra: [
        { at: 46, type: "left", entrance: 3 },
        { at: 80, type: "right", entrance: 4 }
      ],
      rivals: {
        first: 3,
        interval: 12,
        cap: 3,
        coOpInterval: 11,
        coOpCap: 4,
        guard: 8,
        hunter: 21,
        speed: 49
      },
      finish: "all-targets"
    },
    {
      id: "glass-02",
      name: "Mind the Gap",
      garden: 1,
      lesson: "Hold Focus: a tighter swarm, a fiercer sting. Release it to escape!",
      hint: "Small gaps fit a focused swarm. Hunters punish a long pause.",
      bounds: ARENA,
      obstacles: [
        rect(116, 28, 18, 78, "trellis"),
        rect(116, 132, 18, 80, "trellis"),
        rect(250, 28, 18, 78, "trellis"),
        rect(250, 132, 18, 80, "trellis")
      ],
      entrances,
      schedule: schedule([0, 7, 17, 27, 37, 47, 57, 67, 77, 87, 98]),
      coOpExtra: [
        { at: 42, type: "left", entrance: 0 },
        { at: 82, type: "right", entrance: 1 }
      ],
      rivals: {
        first: 3,
        interval: 12,
        cap: 3,
        coOpInterval: 10,
        coOpCap: 5,
        guard: 9,
        hunter: 23,
        speed: 50
      },
      finish: "all-targets"
    },
    {
      id: "orchard-01",
      name: "The Late Shift",
      garden: 2,
      lesson: "The whole garden is awake. Finish a sting, then spend that charge!",
      hint: "Keep a route home. A small swarm stings more slowly.",
      bounds: ARENA,
      obstacles: [
        rect(172, 100, 40, 40, "dial"),
        rect(64, 60, 26, 20),
        rect(294, 160, 26, 20)
      ],
      entrances,
      schedule: schedule([0, 6, 16, 25, 34, 43, 52, 61, 70, 80, 91, 103]),
      coOpExtra: [
        { at: 48, type: "left", entrance: 4 },
        { at: 88, type: "right", entrance: 3 }
      ],
      rivals: {
        first: 2,
        interval: 11,
        cap: 3,
        coOpInterval: 9,
        coOpCap: 5,
        guard: 8,
        hunter: 20,
        speed: 51
      },
      finish: "all-targets"
    },
    {
      id: "orchard-02",
      name: "For Whom the Bee Tolls",
      garden: 2,
      lesson: "The Bellwether moves, opens, then rings. Sting its golden core!",
      hint: "An open bell is vulnerable. The ringing circle pushes you away.",
      bounds: ARENA,
      obstacles: [
        rect(164, 96, 56, 48, "dial"),
        rect(56, 106, 26, 20),
        rect(302, 106, 26, 20)
      ],
      entrances,
      schedule: schedule([0, 2, 10, 20, 30, 40, 50, 60, 70, 80, 90, 102], true),
      coOpExtra: [
        { at: 45, type: "left", entrance: 0 },
        { at: 85, type: "right", entrance: 1 }
      ],
      rivals: {
        first: 3,
        interval: 10,
        cap: 4,
        coOpInterval: 8,
        coOpCap: 6,
        guard: 7,
        hunter: 19,
        speed: 52
      },
      boss: {
        circuit: [
          [100, 58],
          [284, 58],
          [284, 182],
          [100, 182]
        ],
        travel: 5,
        expose: 6,
        pulse: 1.5,
        health: 14
      },
      finish: "all-targets-and-bell"
    }
  ];
  var TUNING_SPECS = {
    speed: {
      label: "Flight speed",
      value: 86,
      min: 50,
      max: 135,
      step: 1,
      unit: " u/s"
    },
    focusMove: {
      label: "Focus flight",
      value: 0.75,
      min: 0.45,
      max: 1,
      step: 0.05,
      unit: " x"
    },
    sting: {
      label: "Sting strength",
      value: 1,
      min: 0.35,
      max: 3,
      step: 0.05,
      unit: " /s"
    },
    focusPower: {
      label: "Focus concentration",
      value: 1.65,
      min: 1,
      max: 3,
      step: 0.05,
      unit: " x"
    },
    health: {
      label: "Gardener shell",
      value: 1.65,
      min: 0.6,
      max: 4,
      step: 0.05,
      unit: " hp"
    },
    recoveryDelay: {
      label: "Recovery delay",
      value: 0.8,
      min: 0.25,
      max: 2,
      step: 0.05,
      unit: " s"
    },
    recovery: {
      label: "Recovery speed",
      value: 0.34,
      min: 0.05,
      max: 1,
      step: 0.05,
      unit: " hp/s"
    },
    lossInterval: {
      label: "Bee loss grace",
      value: 0.55,
      min: 0.25,
      max: 1.5,
      step: 0.05,
      unit: " s"
    },
    rayWidth: {
      label: "Ray half-width",
      value: 6,
      min: 3,
      max: 14,
      step: 1,
      unit: " u"
    },
    warning: {
      label: "Entrance warning",
      value: 1.2,
      min: 0.7,
      max: 3,
      step: 0.1,
      unit: " s"
    },
    hunterSpeed: {
      label: "Hunter flight",
      value: 1,
      min: 0.5,
      max: 1.5,
      step: 0.05,
      unit: " x"
    },
    maturation: {
      label: "Maturation time",
      value: 1,
      min: 0.5,
      max: 2,
      step: 0.05,
      unit: " x"
    },
    spawnInterval: {
      label: "Rival interval",
      value: 1,
      min: 0.7,
      max: 2,
      step: 0.05,
      unit: " x"
    }
  };
  var DEFAULT_TUNING = Object.fromEntries(Object.entries(TUNING_SPECS).map(([k, v]) => [k, v.value]));
  // identity.json
  var identity_default = {
    title: "Killer Bee-yond Midnight",
    slug: "Killer-Bee-yond-Midnight",
    folder: "Killer-Bee-yond-Midnight-Killer-Bees-1983-gpt-6.1-sol-max-20261106-025717",
    artifact: "Killer-Bee-yond-Midnight-Killer-Bees-1983-gpt-6.1-sol-max-20261106-025717.html",
    source: "Killer Bees! (1983, Odyssey²)",
    date: "2026-11-06 02:57:17",
    selection: {
      count: 50,
      index: 36,
      method: "node:crypto.randomInt(50)",
      chosenOnce: true
    }
  };
  // interview.json
  var interview_default = {
    sourceInformation: {
      date: "2026-11-06 02:57:17",
      source: "Killer Bees! (1983, Odyssey²)",
      plan: "PLAN.md",
      genre: "Action arcade; cooperative swarm combat",
      perspective: "Fixed overhead",
      tech: "my-3D2dge v0.89.1 with boot-path fix; AI Hub protocol 1 / client 1.4.0; JavaScript, Canvas 2D, Web Audio, WebRTC; Bun 1.3.14 build",
      artDirection: "Original code-drawn shaded pixel art: moonflowers, copper clockwork gardeners, striped insects and luminous wings",
      animation: "Custom insect and gardener rigs extend native E.Blob spring/wing state; native actor sorting, shapes, particles and pixel primitives",
      audio: "Original procedural garden score, synthesized effects and Animalese-style oscillator chatter; no audio files; music defaults to 10%",
      online: "AI Hub host-authoritative shared world; standalone manual WebRTC offer/answer; simultaneous couch co-op",
      testing: "Unrestricted headless testing, scripted normal-command campaign playthroughs, Chromium/WebKit/Firefox, emulated standard pads and touch, native headless drawing, offline audio and live bus analysis, real Hub harness and two-context WebRTC. Physical devices, public Internet connectivity and subjective listening were unavailable.",
      research: "Original U.S. manual; two Bob Harris creator interviews; engine handoff and Hub contract. Gameplay videos were located but not viewed/heard; exact source sound is unknown.",
      environment: "Codex CLI (headless); Linux",
      model: "OpenAI, gpt-6.1-sol, reasoning effort max",
      usage: "added on import"
    },
    testingFeedback: [
      "6 distinct defects caught and fixed; test-fixture and floating-point assertion corrections are recorded separately.",
      "1 critical issue: the upstream boot:false path prevented leaving the title. It is fixed.",
      "The ordinary-command whole-campaign replay, combined with shared-world harness checks: it verified real completion and caught contact ordering and lifecycle defects.",
      "An unbound synthetic pointer event for touch cancellation was less useful than actual browser touch events; it did not represent an active touch. Replaced it with valid cancellation and CDP multitouch tests."
    ],
    engineFeedback: [
      "Native shaded shapes, procedural rigs and a single deterministic update loop make a coherent code-drawn game possible.",
      "The boot:false path left _booting set, blocking scene transitions. Native expand sizing also needed explicit arena containment, including paused resize handling.",
      "The deterministic swarm simulation, contact rules, campaign content and transport-independent host authority.",
      "Fitting one unchanged arena around HUD and touch safe areas while keeping native pixel art readable.",
      "Patched one engine line: boot:false clears _booting before returning to start. Otherwise Play remains on the title. All other game systems extend native APIs; the Hub SDK is pristine.",
      "A built-in arena-fit helper with HUD and touch insets would simplify fixed-screen games."
    ],
    promptFeedback: [
      "The combat, network and completion contracts are specific enough to verify.",
      "PLAN.md names a different intended model; TASK.md supplies the actual run attribution and filenames.",
      "Combining normal-rule campaign completion, controller-first presentation and real host-authoritative multiplayer in one portable file.",
      "Separate mandatory acceptance checks from suggested implementation examples and give the network harness a minimal project adapter."
    ],
    aiHub: {
      name: "Killer Bee-yond Midnight",
      tagline: "Tiny wings. Big night.",
      description: "Lead twelve luminous bees through six moonlit garden encounters. Sting clockwork gardeners, turn their shells into routes, and earn horizontal rays to sweep away rival swarms — solo or together.",
      type: "Game",
      genre: "Action",
      source: "Killer Bees! (1983)",
      series: "",
      players: "1–2",
      controls: "WASD/arrows or left stick to steer; Shift/R2 to Focus; Space/Cross to fire ray; Esc/Options to pause. Touch: left drag, right hold, Ray tap.",
      tags: ["arcade", "co-op", "top-down", "pixel art", "retro", "boss fights"]
    }
  };

  // src/sim/world.js
  var STEP = 1 / 120;
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  var clone = (v) => JSON.parse(JSON.stringify(v));
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a += 1831565813;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function footprint(p) {
    if (p.bees === 1)
      return p.focus ? 3.5 : 4.5;
    return (p.focus ? 4.2 : 7) + Math.sqrt(p.bees) * (p.focus ? 1.05 : 2.25);
  }
  function circleRect(x, y, r, o) {
    return Math.hypot(x - clamp(x, o.x, o.x + o.w), y - clamp(y, o.y, o.y + o.h)) < r - 0.001;
  }
  function blocked(s, x, y, r, extra = null) {
    const a = ARENA;
    if (x < a.x0 + r || x > a.x1 - r || y < a.y0 + r || y > a.y1 - r)
      return true;
    for (const o of (s.definition || STAGES[s.stage]).obstacles)
      if (circleRect(x, y, r, o))
        return true;
    for (const h of s.husks)
      if (Math.hypot(x - h.x, y - h.y) < r + h.r - 0.001)
        return true;
    return !!(extra && Math.hypot(x - extra.x, y - extra.y) < r + extra.r - 0.001);
  }
  function freePoint(s, x, y, r, extra = null) {
    if (!blocked(s, x, y, r, extra))
      return { x, y };
    for (let d = 2;d < 400; d += 2)
      for (let i = 0;i < 24; i++) {
        const a = i * Math.PI / 12, xx = clamp(x + Math.cos(a) * d, r, 384 - r), yy = clamp(y + Math.sin(a) * d, r, 240 - r);
        if (!blocked(s, xx, yy, r, extra))
          return { x: xx, y: yy };
      }
    return null;
  }
  function topology(s, extra = null, r = 8) {
    const w = 48, h = 30, open = new Uint8Array(w * h);
    let total = 0, start = -1;
    for (let y = 0;y < h; y++)
      for (let x = 0;x < w; x++)
        if (!blocked(s, x * 8 + 4, y * 8 + 4, r, extra)) {
          open[y * w + x] = 1;
          total++;
          start = y * w + x;
        }
    if (start < 0)
      return false;
    const queue = [start];
    open[start] = 0;
    let seen = 0;
    for (let i = 0;i < queue.length; i++) {
      const p = queue[i];
      seen++;
      const x = p % w, y = p / w | 0;
      for (const q of [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1
      ])
        if (q >= 0 && open[q]) {
          open[q] = 0;
          queue.push(q);
        }
    }
    return seen === total;
  }
  function newWorld({
    seed = 4117,
    players = 1,
    stage = 0,
    assisted = false,
    tuning = {}
  } = {}) {
    const s = {
      v: 1,
      seed: seed >>> 0,
      random: seed >>> 0,
      tick: 0,
      time: 0,
      stage,
      phase: "play",
      phaseT: 0,
      stageTime: 0,
      score: 0,
      streak: 0,
      assisted,
      players: [],
      targets: [],
      rivals: [],
      husks: [],
      queue: [],
      nextRival: 0,
      nextId: 1,
      eid: 0,
      events: [],
      result: null,
      checkpoint: { score: 0, streak: 0 },
      tuning: { ...DEFAULT_TUNING, ...tuning },
      dev: { invulnerable: false },
      stats: {
        kills: 0,
        rays: 0,
        zaps: 0,
        losses: 0,
        focusTicks: 0,
        contactTicks: 0,
        recoveries: 0,
        maturations: 0,
        huskNudges: 0,
        bossExposures: 0,
        bossPulses: 0,
        clears: 0,
        refills: 0
      },
      cleared: []
    };
    for (let i = 0;i < players; i++)
      s.players.push({
        id: i,
        x: 176 + i * 32,
        y: 125,
        bees: 12,
        charge: 1,
        focus: false,
        vx: 0,
        vy: 0,
        facing: -Math.PI / 2,
        inv: 1.5,
        lastRay: 0,
        emptyAt: 0,
        contact: false,
        lostAt: -10,
        joined: true,
        contribution: 0
      });
    enterStage(s, stage);
    return s;
  }
  function random(s) {
    s.random = Math.imul(s.random, 1664525) + 1013904223 >>> 0;
    return s.random / 4294967296;
  }
  function emit(s, type, data = {}) {
    const e = { id: ++s.eid, t: s.time, type, ...data };
    s.events.push(e);
    if (s.events.length > 70)
      s.events.shift();
    return e;
  }
  function enterStage(s, index) {
    s.stage = clamp(index, 0, 5);
    s.phase = "play";
    s.phaseT = 0;
    s.stageTime = 0;
    s.targets = [];
    s.rivals = [];
    s.husks = [];
    s.result = null;
    const d = STAGES[s.stage];
    s.queue = clone([
      ...d.schedule,
      ...s.players.filter((p) => p.joined).length > 1 ? d.coOpExtra : []
    ]).sort((a, b) => a.at - b.at);
    s.nextRival = d.rivals.first;
    s.checkpoint = { score: s.score, streak: s.streak };
    for (const p of s.players) {
      const q = freePoint(s, 176 + p.id * 32, 126, footprint({ ...p, bees: 12, focus: false }));
      Object.assign(p, q || { x: 192, y: 216 }, {
        bees: p.joined ? 12 : 0,
        charge: 1,
        focus: false,
        vx: 0,
        vy: 0,
        inv: 1.5,
        contact: false,
        emptyAt: s.tick
      });
    }
    emit(s, "encounter", { stage: s.stage });
  }
  function retry(s) {
    s.assisted = true;
    s.score = s.checkpoint.score;
    s.streak = s.checkpoint.streak;
    enterStage(s, s.stage);
  }
  function restartCampaign(s) {
    const fresh = newWorld({ seed: s.seed, players: s.players.length });
    fresh.tick = s.tick;
    fresh.time = s.time;
    fresh.eid = s.eid;
    fresh.nextId = s.nextId;
    fresh.events = [];
    for (const p of fresh.players) {
      p.lastRay = s.players[p.id].lastRay;
      p.joined = s.players[p.id].joined;
    }
    enterStage(fresh, 0);
    Object.assign(s, fresh);
  }
  function tune(s, key, value) {
    const a = TUNING_SPECS[key];
    if (!a || !Number.isFinite(value))
      return false;
    s.tuning[key] = clamp(value, a.min, a.max);
    s.assisted = true;
    return true;
  }
  function moveCircle(s, a, vx, vy, dt, r) {
    const { x: ox, y: oy } = a, parts = Math.max(1, Math.ceil(Math.hypot(vx, vy) * dt / 3));
    for (let i = 0;i < parts; i++) {
      const dx = vx * dt / parts, dy = vy * dt / parts;
      if (!blocked(s, a.x + dx, a.y + dy, r)) {
        a.x += dx;
        a.y += dy;
      } else {
        if (!blocked(s, a.x + dx, a.y, r))
          a.x += dx;
        if (!blocked(s, a.x, a.y + dy, r))
          a.y += dy;
      }
    }
    a.x = clamp(a.x, r, 384 - r);
    a.y = clamp(a.y, r, 240 - r);
    return Math.hypot(a.x - ox, a.y - oy);
  }
  function spawnTarget(s, q) {
    const d = STAGES[s.stage], e = d.entrances[q.entrance], coop = s.players.filter((p2) => p2.joined).length > 1, kind = q.type;
    const r = kind === "bell" ? 17 : 7, origin = kind === "bell" ? { x: 100, y: 58 } : e, p = freePoint(s, origin.x, origin.y, r);
    if (!p)
      return false;
    const hp = kind === "bell" ? d.boss.health * (coop ? 1.6 : 1) : s.tuning.health * (coop ? 1.25 : 1);
    const t = {
      id: s.nextId++,
      type: kind,
      ...p,
      r,
      hp,
      maxHp: hp,
      dir: Math.atan2(e.dy, e.dx),
      turn: kind === "right" ? 1 : -1,
      lastContact: -100,
      contrib: s.players.map(() => 0),
      warning: s.tuning.warning,
      stuck: 0,
      think: 0,
      recovering: false,
      dead: false,
      bossPhase: "move",
      bossT: 0,
      circuit: 0
    };
    s.targets.push(t);
    emit(s, "arrival", { x: t.x, y: t.y, target: t.id, kind });
    return true;
  }
  function spawnRival(s) {
    const d = STAGES[s.stage], offset = Math.floor(random(s) * d.entrances.length);
    for (let j = 0;j < d.entrances.length; j++) {
      const e = d.entrances[(j + offset) % d.entrances.length], p = freePoint(s, e.x, e.y, 9);
      if (!p || s.players.some((a2) => a2.bees && distance(a2, p) < 40))
        continue;
      const a = {
        id: s.nextId++,
        ...p,
        dir: Math.atan2(e.dy, e.dx),
        r: 8,
        age: 0,
        state: 0,
        warning: s.tuning.warning,
        turn: 0,
        matureAt: -10,
        dead: false
      };
      s.rivals.push(a);
      emit(s, "warning", { x: a.x, y: a.y });
      return true;
    }
    return false;
  }
  function ray(s, p) {
    if (!p.charge) {
      emit(s, "dry", { player: p.id });
      return;
    }
    p.charge = 0;
    p.emptyAt = s.tick;
    s.stats.rays++;
    emit(s, "ray", { player: p.id, x: p.x, y: p.y });
    for (const a of s.rivals)
      if (!a.dead && Math.abs(a.y - p.y) <= s.tuning.rayWidth + a.r) {
        a.dead = true;
        s.stats.zaps++;
        s.score += 25;
        emit(s, "zap", { x: a.x, y: a.y });
      }
  }
  function advanceTarget(s, t, dt) {
    if (t.dead)
      return;
    if (t.warning > 0) {
      t.warning -= dt;
      return;
    }
    if (t.type === "bell") {
      const b = STAGES[s.stage].boss;
      t.bossT += dt;
      if (t.bossPhase === "move") {
        const point = b.circuit[t.circuit], dx = point[0] - t.x, dy = point[1] - t.y, dd = Math.hypot(dx, dy);
        t.dir = Math.atan2(dy, dx);
        if (dd > 1)
          moveCircle(s, t, dx / (dd || 1) * 46, dy / (dd || 1) * 46, Math.min(dt, dd / 46), t.r);
        if (dd < 2 || t.bossT > b.travel + 3) {
          t.bossPhase = "open";
          t.bossT = 0;
          s.stats.bossExposures++;
          emit(s, "expose", { x: t.x, y: t.y });
        }
      } else if (t.bossPhase === "open" && t.bossT > b.expose + (s.players.length > 1 ? 1 : 0)) {
        t.bossPhase = "pulse";
        t.bossT = 0;
        emit(s, "pulse-warning", { x: t.x, y: t.y });
      } else if (t.bossPhase === "pulse" && t.bossT > b.pulse) {
        s.stats.bossPulses++;
        for (const p of s.players)
          if (p.bees && distance(p, t) < 95) {
            const a = Math.atan2(p.y - t.y, p.x - t.x);
            moveCircle(s, p, Math.cos(a) * 130, Math.sin(a) * 130, 0.3, footprint(p));
          }
        emit(s, "pulse", { x: t.x, y: t.y });
        t.bossPhase = "move";
        t.bossT = 0;
        t.circuit = (t.circuit + 1) % b.circuit.length;
      }
      return;
    }
    t.think -= dt;
    const near = s.players.filter((p) => p.bees).sort((a, b) => distance(a, t) - distance(b, t))[0];
    if (t.think <= 0) {
      t.think = 2.6;
      if (near && distance(near, t) < 60 && s.stageTime - t.lastContact > 0.1)
        t.dir += t.turn * Math.PI / 2;
    }
    const weakening = clamp(t.hp / t.maxHp, 0.15, 1), speed = (29 + s.stage * 1.6) * weakening;
    const d = moveCircle(s, t, Math.cos(t.dir) * speed, Math.sin(t.dir) * speed, dt, t.r);
    if (d < speed * dt * 0.4) {
      t.stuck += dt;
      t.dir += t.turn * Math.PI / 2;
      if (t.stuck > 0.4) {
        t.dir -= t.turn * Math.PI;
      }
    } else
      t.stuck = Math.max(0, t.stuck - dt * 2);
    if (t.stuck > 1.5 && s.stageTime - t.lastContact > 1) {
      const p = freePoint(s, t.x, t.y, t.r + 1);
      if (p) {
        t.x = p.x;
        t.y = p.y;
        t.dir += Math.PI;
        s.stats.huskNudges++;
        emit(s, "unstuck", { x: t.x, y: t.y });
      }
      t.stuck = 0;
    }
  }
  function angDiff(a, b) {
    return (b - a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  }
  function advanceRival(s, a, dt) {
    if (a.dead)
      return;
    if (a.warning > 0) {
      a.warning -= dt;
      return;
    }
    a.age += dt;
    const d = STAGES[s.stage].rivals, stage = a.age > d.hunter * s.tuning.maturation ? 2 : a.age > d.guard * s.tuning.maturation ? 1 : 0;
    if (stage !== a.state) {
      a.state = stage;
      a.matureAt = s.time;
      s.stats.maturations++;
      emit(s, "mature", { x: a.x, y: a.y, state: stage });
    }
    let desired = a.dir;
    if (stage === 2) {
      const p = s.players.filter((p2) => p2.bees).sort((x, y) => distance(x, a) - distance(y, a))[0];
      if (p)
        desired = Math.atan2(p.y - a.y, p.x - a.x);
    } else if (stage === 1) {
      const t = s.targets.filter((t2) => !t2.dead && t2.warning <= 0).sort((x, y) => distance(x, a) - distance(y, a))[0];
      if (t) {
        const orbit = a.age * 0.8 + a.id;
        desired = Math.atan2(t.y + Math.sin(orbit) * 25 - a.y, t.x + Math.cos(orbit) * 25 - a.x);
      }
    } else {
      a.turn -= dt;
      if (a.turn <= 0) {
        a.turn = 1.3 + random(s) * 1.5;
        desired = a.dir + (random(s) - 0.5) * 2;
      }
      a.want = desired;
    }
    if (stage === 0)
      desired = a.want ?? desired;
    a.dir += clamp(angDiff(a.dir, desired), -dt * (stage === 2 ? 2.7 : 3.5), dt * (stage === 2 ? 2.7 : 3.5));
    const pressure = 1 + Math.min(0.24, s.stageTime / 600), speed = d.speed * s.tuning.hunterSpeed * (stage === 0 ? 0.42 : stage === 1 ? 0.62 : 1) * pressure;
    a.x += Math.cos(a.dir) * speed * dt;
    a.y += Math.sin(a.dir) * speed * dt;
    if (a.x < 10 || a.x > 374) {
      a.x = clamp(a.x, 10, 374);
      a.dir = Math.PI - a.dir;
      a.want = a.dir;
    }
    if (a.y < 10 || a.y > 230) {
      a.y = clamp(a.y, 10, 230);
      a.dir = -a.dir;
      a.want = a.dir;
    }
  }
  function placeHusk(s, t) {
    const h = {
      id: t.id,
      x: t.x,
      y: t.y,
      r: t.type === "bell" ? 17 : 10.5,
      type: t.type,
      born: s.time
    };
    for (const r of [h.r, 8, 6, 4, 2]) {
      h.r = r;
      if (topology(s, h))
        break;
    }
    s.husks.push(h);
    for (const p of s.players)
      if (p.bees && blocked(s, p.x, p.y, footprint(p))) {
        const q = freePoint(s, p.x, p.y, footprint(p));
        if (q) {
          Object.assign(p, q);
          p.inv = Math.max(p.inv, 0.35);
          emit(s, "shell-push", { player: p.id, x: p.x, y: p.y });
        }
      }
    for (const a of s.targets)
      if (a !== t && !a.dead && blocked(s, a.x, a.y, a.r)) {
        a.stuck = 1.2;
        const q = freePoint(s, a.x, a.y, a.r);
        if (q) {
          a.escape = q;
        }
      }
  }
  function killTarget(s, t) {
    if (t.dead)
      return;
    t.dead = true;
    s.stats.kills++;
    const points = t.type === "bell" ? 1500 : 200 + s.stage * 25;
    s.score += points;
    const candidates = s.players.filter((p) => p.bees > 0 && p.joined && !p.charge);
    const contributors = candidates.filter((p) => (t.contrib[p.id] || 0) > 0).sort((a, b) => (t.contrib[b.id] || 0) - (t.contrib[a.id] || 0) || a.id - b.id);
    const receiver = contributors[0] || candidates.sort((a, b) => a.emptyAt - b.emptyAt || a.id - b.id)[0];
    if (receiver) {
      receiver.charge = 1;
      s.stats.refills++;
      emit(s, "charge", { player: receiver.id });
    }
    for (const p of s.players)
      p.contribution += t.contrib[p.id] || 0;
    placeHusk(s, t);
    emit(s, "collapse", { target: t.id, x: t.x, y: t.y, points, kind: t.type });
  }
  function complete(s) {
    s.stats.clears++;
    const survivors = s.players.reduce((n, p) => n + p.bees, 0), perfect = s.players.filter((p) => p.joined).every((p) => p.bees === 12);
    s.streak = perfect ? s.streak + 1 : 0;
    const bonus = survivors * 10 * (1 + s.streak);
    s.score += bonus;
    s.result = { stage: s.stage, survivors, perfect, bonus, streak: s.streak };
    s.cleared.push(clone(s.result));
    s.rivals = [];
    s.phase = "result";
    s.phaseT = 0;
    emit(s, "clear", { ...s.result, score: s.score });
  }
  function step(s, commands = [], dt = STEP) {
    if (!Number.isFinite(dt) || dt <= 0)
      return;
    s.tick++;
    s.time += dt;
    s.phaseT += dt;
    if (s.phase === "result") {
      if (s.phaseT >= 4) {
        if (s.stage === 5) {
          s.phase = "ending";
          s.phaseT = 0;
          emit(s, "victory", { score: s.score });
        } else
          enterStage(s, s.stage + 1);
      }
      return;
    }
    if (s.phase !== "play")
      return;
    s.stageTime += dt;
    const d = STAGES[s.stage], u = s.tuning;
    for (const p of s.players) {
      p.contact = false;
      p.inv = Math.max(0, p.inv - dt);
      if (!p.bees || !p.joined)
        continue;
      const c = commands[p.id] || {}, x = Number.isFinite(c.x) ? clamp(c.x, -1, 1) : 0, y = Number.isFinite(c.y) ? clamp(c.y, -1, 1) : 0, n = Math.max(1, Math.hypot(x, y));
      const rayCount = Number.isSafeInteger(c.ray) ? c.ray : p.lastRay;
      if (rayCount > p.lastRay && rayCount <= p.lastRay + 16) {
        p.lastRay = rayCount;
        ray(s, p);
      }
      const oldR = footprint(p);
      p.focus = !!c.focus;
      if (!p.focus && oldR < footprint(p) && blocked(s, p.x, p.y, footprint(p))) {
        const q = freePoint(s, p.x, p.y, footprint(p));
        if (q)
          Object.assign(p, q);
      }
      if (p.focus)
        s.stats.focusTicks++;
      const sp = u.speed * (p.focus ? u.focusMove : 1);
      p.vx = x / n * sp;
      p.vy = y / n * sp;
      if (Math.hypot(x, y) > 0.05)
        p.facing = Math.atan2(y, x);
      moveCircle(s, p, p.vx, p.vy, dt, footprint(p));
    }
    for (const t of s.targets)
      advanceTarget(s, t, dt);
    for (const a of s.rivals)
      advanceRival(s, a, dt);
    const deaths = [];
    for (const t of s.targets) {
      if (t.dead || t.warning > 0)
        continue;
      let damage = 0;
      const vulnerable = t.type !== "bell" || t.bossPhase === "open";
      if (vulnerable) {
        for (const p of s.players)
          if (p.bees > 0 && p.joined && distance(p, t) < footprint(p) + t.r) {
            const rate = u.sting * (p.bees / 12) * (p.focus ? u.focusPower : 1), hit = rate * dt;
            t.contrib[p.id] = (t.contrib[p.id] || 0) + hit;
            damage += hit;
            p.contact = true;
            s.stats.contactTicks++;
          }
      }
      if (damage) {
        t.hp = Math.max(0, t.hp - damage);
        t.lastContact = s.stageTime;
        t.recovering = false;
      } else if (t.hp < t.maxHp && s.stageTime - t.lastContact > u.recoveryDelay) {
        if (!t.recovering) {
          s.stats.recoveries++;
          emit(s, "recover", { x: t.x, y: t.y });
          t.recovering = true;
        }
        t.hp = Math.min(t.maxHp, t.hp + u.recovery * dt * (t.type === "bell" ? 0.14 : 1));
        if (t.hp === t.maxHp)
          t.contrib = s.players.map(() => 0);
      }
      if (t.hp <= 0)
        deaths.push(t);
      if (t.escape && s.stageTime - t.lastContact > 1) {
        const dx = t.escape.x - t.x, dy = t.escape.y - t.y, dd = Math.hypot(dx, dy);
        t.x += dx / (dd || 1) * Math.min(dd, 12 * dt);
        t.y += dy / (dd || 1) * Math.min(dd, 12 * dt);
        if (dd < 1)
          t.escape = null;
      }
    }
    for (const t of deaths.sort((a, b) => a.id - b.id))
      killTarget(s, t);
    for (const p of s.players)
      if (p.bees > 0 && p.inv <= 0 && !s.dev.invulnerable) {
        const a = s.rivals.find((a2) => !a2.dead && a2.warning <= 0 && distance(p, a2) < footprint(p) + a2.r);
        if (a) {
          p.bees--;
          p.lostAt = s.time;
          p.inv = u.lossInterval;
          s.stats.losses++;
          const angle = Math.atan2(p.y - a.y, p.x - a.x);
          moveCircle(s, p, Math.cos(angle) * 85, Math.sin(angle) * 85, 0.065, footprint(p));
          emit(s, "loss", { player: p.id, x: p.x, y: p.y, bees: p.bees });
          if (!p.bees)
            emit(s, "fallen", { player: p.id, x: p.x, y: p.y });
        }
      }
    s.targets = s.targets.filter((t) => !t.dead);
    s.rivals = s.rivals.filter((a) => !a.dead);
    if (s.queue.length && s.queue[0].at <= s.stageTime && s.targets.length < 4) {
      const q = s.queue[0], e = d.entrances[q.entrance];
      if (q.type === "bell" || !s.players.some((p) => p.bees && distance(p, e) < 30)) {
        if (spawnTarget(s, q))
          s.queue.shift();
      }
    }
    if (s.stageTime >= s.nextRival) {
      const coop = s.players.filter((p) => p.joined).length > 1, cap = coop ? d.rivals.coOpCap ?? d.rivals.cap + 1 : d.rivals.cap, interval = coop ? d.rivals.coOpInterval ?? d.rivals.interval : d.rivals.interval;
      if (s.rivals.length < cap)
        spawnRival(s);
      s.nextRival = s.stageTime + interval * u.spawnInterval;
    }
    if (!s.players.some((p) => p.bees > 0 && p.joined)) {
      s.phase = "failed";
      s.phaseT = 0;
      emit(s, "defeat", { score: s.score });
    } else if (!s.targets.length && !s.queue.length)
      complete(s);
  }
  function leave(s, id) {
    const p = s.players.find((p2) => p2.id === id);
    if (p) {
      p.joined = false;
      p.bees = 0;
      p.vx = p.vy = 0;
      emit(s, "leave", { player: id });
    }
  }

  // src/dev/tools.js
  function installDev(app) {
    const { game, ui } = app, S = game.settings;
    for (const [k, sp] of Object.entries(TUNING_SPECS))
      S.define({
        key: "dev_" + k,
        label: sp.label,
        group: "Controls",
        type: "slider",
        value: sp.value,
        min: sp.min,
        max: sp.max,
        step: sp.step,
        unit: sp.unit,
        apply: (_g, v) => {
          if (app.devOpen && !app.readOnly())
            app.pending.push(() => tune(app.world, k, v));
        }
      });
    S.define({
      key: "devStage",
      label: "Encounter (restart applies)",
      group: "Controls",
      value: 0,
      options: STAGES.map((s, i) => [i, `${i + 1}. ${s.name}`])
    });
    S.define({
      key: "devSeed",
      label: "Seed (restart applies)",
      group: "Controls",
      value: 4117,
      min: 0,
      max: 99999,
      step: 1
    });
    S.define({
      key: "devTime",
      label: "Preview speed",
      group: "Controls",
      value: 1,
      min: 0.25,
      max: 2,
      step: 0.25,
      unit: " x",
      apply: (_g, v) => {
        if (app.devOpen && !app.readOnly()) {
          app.world.assisted = true;
          game.timeScale = v;
        }
      }
    });
    S.define({
      key: "devInvincible",
      label: "Keep every bee",
      group: "Controls",
      value: false,
      apply: (_g, v) => {
        if (app.devOpen && !app.readOnly()) {
          app.pending.push(() => {
            app.world.dev.invulnerable = v;
            app.world.assisted = true;
          });
        }
      }
    });
    S.define({
      key: "devCollision",
      label: "Collision / contact outlines",
      group: "Controls",
      value: false,
      apply: (_g, v) => {
        if (app.garden)
          app.garden.overlay = v;
      }
    });
    S.define({
      key: "devLabels",
      label: "Enemy state labels",
      group: "Controls",
      value: false,
      apply: (_g, v) => {
        if (app.garden)
          app.garden.labels = v;
      }
    });
    const exportSnapshot = () => {
      const text = JSON.stringify({ world: app.world, network: app.net?.metrics || null }, null, 2);
      ui.show("snapshot", {
        kicker: "Developer / read only",
        title: "State snapshot",
        text: "Select and copy this snapshot for a reproducible report.",
        actions: [
          [
            "Copy snapshot",
            () => {
              globalThis.navigator?.clipboard?.writeText(text).catch(() => {});
            }
          ],
          ["Back", () => ui.back()]
        ]
      });
      if (ui.root) {
        const box = ui.root.querySelector(".esh-mod"), ta = document.createElement("textarea");
        ta.value = text;
        ta.readOnly = true;
        ta.setAttribute("aria-label", "State snapshot");
        box.append(ta);
      }
    };
    const groups = [
      ["Flight & sting", ["speed", "focusMove", "sting", "focusPower", "health"]],
      [
        "Recovery & damage",
        ["recoveryDelay", "recovery", "lossInterval", "rayWidth"]
      ],
      [
        "Rival pressure",
        ["warning", "hunterSpeed", "maturation", "spawnInterval"]
      ]
    ];
    function restart() {
      const index = +S.devStage;
      app.world.seed = +S.devSeed;
      app.world.random = app.world.seed;
      app.world.assisted = true;
      app.bestSaved = false;
      enterStage(app.world, index);
      app.garden?.reset(app.world);
      app.audio.reset(app.world);
      app.clearInput();
    }
    app.openDev = () => {
      app.devOpen = true;
      const readOnly = app.readOnly();
      ui.show("dev", {
        kicker: readOnly ? "Developer / read only" : "Developer / marks run assisted",
        title: "Garden workbench",
        text: readOnly ? "Live online round. Gameplay changes are disabled. The shared world keeps moving." : `Encounter ${app.world.stage + 1} • seed ${app.world.seed}
Changes take effect at a simulation boundary. Sliders are in world units.`,
        rows: ["devCollision", "devLabels"],
        actions: readOnly ? [
          ["Network diagnostics", diagnostics],
          ["Export snapshot", exportSnapshot],
          ["Back", () => ui.back()]
        ] : [
          ...groups.map(([label, keys]) => [
            label,
            () => ui.show("tuning", {
              title: label,
              rows: keys.map((k) => "dev_" + k),
              actions: [
                [
                  "Reset tuning to defaults",
                  () => {
                    for (const [k, sp] of Object.entries(TUNING_SPECS))
                      S.set("dev_" + k, sp.value);
                    ui.show("tuning", {});
                  }
                ],
                ["Back", () => ui.back()]
              ]
            })
          ]),
          [
            "Encounter & seed",
            () => {
              ui.show("encounter-tools", {
                title: "Encounter & seed",
                rows: ["devStage", "devSeed"],
                text: "Choose a seed and encounter, then restart to apply.",
                actions: [
                  ["Restart selected encounter", restart],
                  [
                    "Random seed",
                    () => {
                      S.set("devSeed", crypto.getRandomValues(new Uint32Array(1))[0] % 1e5);
                      ui.show("encounter-tools", {});
                    }
                  ],
                  ["Back", () => ui.back()]
                ]
              });
            }
          ],
          [
            "Playback & cheats",
            () => ui.show("playback", {
              title: "Playback & cheats",
              rows: ["devTime", "devInvincible"],
              text: "Live preview keeps the world running behind these tools. Closing the workbench restores normal speed.",
              actions: [
                [
                  "Single simulation step",
                  () => {
                    app.applyPending();
                    app.world.assisted = true;
                    step(app.world, []);
                    app.garden?.update(1 / 120, app.world);
                  }
                ],
                [
                  "Toggle live preview",
                  () => {
                    game.live = !game.live;
                    ui.show("playback", {});
                  }
                ],
                [
                  "Refill both rays",
                  () => {
                    app.world.assisted = true;
                    for (const p of app.world.players)
                      if (p.bees)
                        p.charge = 1;
                  }
                ],
                [
                  "Spawn rival with warning",
                  () => {
                    app.world.assisted = true;
                    spawnRival(app.world);
                  }
                ],
                [
                  "Spawn Leftenant",
                  () => {
                    app.world.assisted = true;
                    spawnTarget(app.world, { type: "left", entrance: 0 });
                  }
                ],
                [
                  "Spawn Righto",
                  () => {
                    app.world.assisted = true;
                    spawnTarget(app.world, { type: "right", entrance: 1 });
                  }
                ],
                ["Back", () => ui.back()]
              ]
            })
          ],
          ["Export snapshot", exportSnapshot],
          ["Back", () => ui.back()]
        ]
      });
    };
    function diagnostics() {
      ui.show("diagnostics", {
        title: "Network diagnostics",
        text: JSON.stringify(app.net?.metrics || { mode: app.mode, tick: app.world.tick }, null, 2),
        actions: [
          ["Refresh", diagnostics],
          ["Back", () => ui.back()]
        ]
      });
    }
    app.closeDev = () => {
      if (!app.devOpen)
        return;
      app.devOpen = false;
      game.timeScale = 1;
      game.live = app.isNetwork();
      app.clearInput();
    };
  }

  // src/input/actions.js
  var ACTIONS = {
    up: ["KeyW", "ArrowUp", "Pad12"],
    down: ["KeyS", "ArrowDown", "Pad13"],
    left: ["KeyA", "ArrowLeft", "Pad14"],
    right: ["KeyD", "ArrowRight", "Pad15"],
    ray: ["Space", "Mouse0", "Pad0"],
    focus: ["ShiftLeft", "ShiftRight", "Pad7"],
    steer: ["Mouse2"],
    start: ["Enter", "Pad9"],
    pause: ["Escape", "KeyP", "Pad9"],
    confirm: ["Enter", "Space", "Pad0"],
    cancel: ["Escape", "Backspace", "Pad1"],
    halves: {
      left: {
        steer: ["Mouse2"],
        ray: ["KeyF", "Space", "Mouse0"],
        focus: ["KeyG", "ShiftLeft", "ShiftRight"]
      },
      right: {
        steer: [],
        ray: ["Period", "Numpad1"],
        focus: ["Slash", "Numpad2"]
      }
    }
  };
  function readAction(game, input, p, rayCounter) {
    let [x, y] = input.move();
    if (input.down("steer")) {
      const q = game.mouseGround();
      if (q) {
        const dx = q[0] - p.x, dy = q[1] - p.y, d = Math.hypot(dx, dy);
        x = d > 3 ? dx / Math.max(12, d) : 0;
        y = d > 3 ? dy / Math.max(12, d) : 0;
      }
    }
    return {
      x,
      y,
      focus: input.down("focus"),
      ray: Math.max(rayCounter, p.lastRay) + (input.pressed("ray") ? 1 : 0)
    };
  }
  function prompt(game) {
    const I = game.input;
    if (I.lastDevice === "touch")
      return "LEFT THUMB flies   •   RIGHT HOLD focuses   •   TAP RAY zaps";
    return `${I.label("ray")} RAY   •   Hold ${I.label("focus")} FOCUS   •   ${I.label("pause")} MENU`;
  }

  // src/net/peer.js
  class DirectPeer {
    constructor({ onOpen, onMessage, onClose, onStatus }) {
      Object.assign(this, { onOpen, onMessage, onClose, onStatus });
      this.pc = null;
      this.channel = null;
      this.role = null;
      this.generation = 0;
      this.closed = false;
      this.timers = new Set;
      this.resultAck = null;
    }
    status(text) {
      this.onStatus?.(text);
    }
    delay(fn, ms) {
      const t = setTimeout(() => {
        this.timers.delete(t);
        fn();
      }, ms);
      this.timers.add(t);
      return t;
    }
    make() {
      if (globalThis.AIHub?.active)
        throw Error("Direct peer is unavailable during a Hub round.");
      this.close(false);
      this.closed = false;
      this.pc = new RTCPeerConnection({ iceServers: [] });
      const generation = this.generation;
      this.pc.onconnectionstatechange = () => {
        if (generation !== this.generation || !this.pc)
          return;
        const state = this.pc.connectionState;
        this.status(state === "connected" ? "Connected — two swarms, one garden" : `Connection: ${state}`);
        if (state === "failed" || state === "closed")
          this.disconnected();
        if (state === "disconnected")
          this.delay(() => {
            if (this.pc?.connectionState === "disconnected")
              this.disconnected();
          }, 1800);
      };
      this.pc.ondatachannel = (e) => this.wire(e.channel);
      return this.pc;
    }
    wire(channel) {
      this.channel = channel;
      channel.onopen = () => {
        this.status("Connected");
        this.onOpen?.(this.role);
      };
      channel.onclose = () => this.disconnected();
      channel.onmessage = (e) => {
        if (this.closed || typeof e.data !== "string" || e.data.length > 16384)
          return;
        try {
          const data = JSON.parse(e.data);
          if (data.t === "ack") {
            this.resultAck?.();
            return;
          }
          if (data.t === "end") {
            this.send({ t: "ack" });
          }
          this.onMessage?.(data);
        } catch {
          this.status("Ignored an invalid packet.");
        }
      };
    }
    disconnected() {
      if (this.closed)
        return;
      this.closed = true;
      this.onClose?.();
    }
    async gather(pc) {
      if (pc.iceGatheringState === "complete")
        return;
      await new Promise((resolve) => {
        let complete2 = false;
        const done = () => {
          if (complete2)
            return;
          complete2 = true;
          pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        };
        const check = () => {
          if (pc.iceGatheringState === "complete")
            done();
        };
        pc.addEventListener("icegatheringstatechange", check);
        this.delay(done, 4500);
        check();
      });
    }
    encode(desc) {
      return "BEE1." + btoa(JSON.stringify({ v: 1, type: desc.type, sdp: desc.sdp }));
    }
    decode(code, type) {
      const text = String(code).trim();
      if (text.length > 65000 || text.length < 30 || !text.startsWith("BEE1."))
        throw Error("That is not a garden code. Paste the complete BEE1 code.");
      let data;
      try {
        data = JSON.parse(atob(text.slice(5)));
      } catch {
        throw Error("The code is damaged. Copy it again.");
      }
      if (data.v !== 1 || data.type !== type || typeof data.sdp !== "string" || data.sdp.length > 48000 || !data.sdp.startsWith("v=0") || !data.sdp.includes("m=application"))
        throw Error(`This step needs an ${type} code.`);
      return { type: data.type, sdp: data.sdp };
    }
    async offer() {
      const pc = this.make();
      this.role = "host";
      this.wire(pc.createDataChannel("midnight-garden", { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer());
      await this.gather(pc);
      if (this.pc !== pc)
        throw Error("Connection cancelled.");
      this.status("Offer ready. Send it to player 2.");
      return this.encode(pc.localDescription);
    }
    async answer(code) {
      const desc = this.decode(code, "offer"), pc = this.make();
      this.role = "guest";
      await pc.setRemoteDescription(desc);
      await pc.setLocalDescription(await pc.createAnswer());
      await this.gather(pc);
      if (this.pc !== pc)
        throw Error("Connection cancelled.");
      this.status("Answer ready. Return it to player 1.");
      return this.encode(pc.localDescription);
    }
    async accept(code) {
      if (!this.pc || this.role !== "host")
        throw Error("Make an offer first.");
      const desc = this.decode(code, "answer");
      await this.pc.setRemoteDescription(desc);
      this.status("Answer accepted. Opening the garden…");
    }
    send(data) {
      if (this.channel?.readyState === "open" && this.channel.bufferedAmount < 64000) {
        this.channel.send(JSON.stringify(data));
        return true;
      }
      return false;
    }
    finish(data) {
      if (!this.send(data))
        return Promise.resolve();
      return new Promise((resolve) => {
        let done = false;
        const end = () => {
          if (done)
            return;
          done = true;
          this.resultAck = null;
          this.delay(() => {
            this.close(false);
            resolve();
          }, 200);
        };
        this.resultAck = end;
        this.delay(end, 1500);
      });
    }
    close(notify = true) {
      this.closed = true;
      this.generation++;
      for (const t of this.timers)
        clearTimeout(t);
      this.timers.clear();
      if (this.channel) {
        this.channel.onclose = null;
        this.channel.close();
      }
      if (this.pc) {
        this.pc.onconnectionstatechange = null;
        this.pc.close();
      }
      this.channel = null;
      this.pc = null;
      if (notify)
        this.onClose?.();
    }
  }

  // src/net/protocol.js
  var TYPES = ["left", "right", "bell"];
  var PHASES = ["play", "result", "failed", "ending"];
  var BOSS = ["move", "open", "pulse"];
  var EVENTS = [
    "arrival",
    "warning",
    "ray",
    "dry",
    "zap",
    "mature",
    "recover",
    "charge",
    "collapse",
    "loss",
    "fallen",
    "encounter",
    "clear",
    "expose",
    "pulse-warning",
    "pulse",
    "victory",
    "defeat",
    "shell-push",
    "unstuck",
    "leave"
  ];
  var n = (v) => Math.round((v || 0) * 10) / 10;
  var statsKeys = [
    "kills",
    "rays",
    "zaps",
    "losses",
    "clears",
    "refills",
    "maturations",
    "bossExposures",
    "bossPulses",
    "focusTicks",
    "contactTicks",
    "recoveries"
  ];
  function pack(s) {
    return {
      t: "s",
      v: 1,
      k: s.tick,
      z: s.seed,
      i: s.stage,
      q: PHASES.indexOf(s.phase),
      tm: n(s.time),
      ts: n(s.stageTime),
      pt: n(s.phaseT),
      sc: s.score,
      ss: s.streak,
      a: s.assisted ? 1 : 0,
      p: s.players.map((p) => [
        p.id,
        n(p.x),
        n(p.y),
        p.bees,
        p.charge,
        p.focus ? 1 : 0,
        n(p.facing),
        n(p.inv),
        n(p.lostAt),
        p.lastRay,
        p.joined ? 1 : 0,
        n(p.vx),
        n(p.vy)
      ]),
      b: s.targets.map((a) => [
        a.id,
        TYPES.indexOf(a.type),
        n(a.x),
        n(a.y),
        n(a.hp),
        n(a.maxHp),
        n(a.dir),
        n(a.warning),
        BOSS.indexOf(a.bossPhase),
        n(a.bossT),
        a.circuit,
        a.recovering ? 1 : 0
      ]),
      r: s.rivals.map((a) => [
        a.id,
        n(a.x),
        n(a.y),
        n(a.dir),
        n(a.age),
        a.state,
        n(a.warning),
        n(a.matureAt)
      ]),
      h: s.husks.map((a) => [
        a.id,
        n(a.x),
        n(a.y),
        n(a.r),
        TYPES.indexOf(a.type),
        n(a.born)
      ]),
      e: s.events.slice(-8).map((e) => [
        e.id,
        EVENTS.indexOf(e.type),
        n(e.t),
        e.x === undefined ? null : n(e.x),
        e.y === undefined ? null : n(e.y),
        e.player ?? null,
        e.points || 0,
        e.kind === undefined ? null : TYPES.indexOf(e.kind)
      ]),
      eid: s.eid,
      c: s.queue.length,
      result: s.result,
      tu: Object.keys(DEFAULT_TUNING).map((k) => s.tuning[k]),
      st: statsKeys.map((k) => s.stats[k] || 0)
    };
  }
  function validSnapshot(m) {
    return m?.t === "s" && m.v === 1 && Number.isSafeInteger(m.k) && m.k >= 0 && Number.isInteger(m.i) && m.i >= 0 && m.i < 6 && Number.isInteger(m.q) && m.q >= 0 && m.q < 4 && Number.isFinite(m.sc) && m.sc >= 0 && Array.isArray(m.p) && m.p.length >= 1 && m.p.length <= 2 && Array.isArray(m.b) && m.b.length <= 5 && Array.isArray(m.r) && m.r.length <= 7 && Array.isArray(m.h) && m.h.length <= 24 && Array.isArray(m.e) && m.e.length <= 8 && [...m.p, ...m.b, ...m.r, ...m.h].every((a) => Array.isArray(a) && a.every((v) => typeof v === "number" && Number.isFinite(v)));
  }
  function unpack(m, previous = null) {
    if (!validSnapshot(m))
      return null;
    const s = previous || newWorld({ players: m.p.length, seed: m.z });
    Object.assign(s, {
      tick: m.k,
      seed: m.z,
      stage: m.i,
      phase: PHASES[m.q],
      time: m.tm,
      stageTime: m.ts,
      phaseT: m.pt,
      score: m.sc,
      streak: m.ss,
      assisted: !!m.a,
      eid: m.eid,
      result: m.result,
      queue: Array.from({ length: Math.max(0, Math.min(20, m.c || 0)) }, () => ({}))
    });
    s.players = m.p.map((a) => ({
      id: a[0],
      x: a[1],
      y: a[2],
      bees: a[3],
      charge: a[4],
      focus: !!a[5],
      facing: a[6],
      inv: a[7],
      lostAt: a[8],
      lastRay: a[9],
      joined: !!a[10],
      vx: a[11],
      vy: a[12],
      contact: false
    }));
    s.targets = m.b.map((a) => ({
      id: a[0],
      type: TYPES[a[1]],
      x: a[2],
      y: a[3],
      hp: a[4],
      maxHp: a[5],
      dir: a[6],
      warning: a[7],
      bossPhase: BOSS[a[8]],
      bossT: a[9],
      circuit: a[10],
      recovering: !!a[11],
      r: a[1] === 2 ? 17 : 7
    }));
    s.rivals = m.r.map((a) => ({
      id: a[0],
      x: a[1],
      y: a[2],
      dir: a[3],
      age: a[4],
      state: a[5],
      warning: a[6],
      matureAt: a[7],
      r: 8
    }));
    s.husks = m.h.map((a) => ({
      id: a[0],
      x: a[1],
      y: a[2],
      r: a[3],
      type: TYPES[a[4]],
      born: a[5]
    }));
    s.events = m.e.map((a) => ({
      id: a[0],
      type: EVENTS[a[1]],
      t: a[2],
      ...a[3] === null ? {} : { x: a[3] },
      ...a[4] === null ? {} : { y: a[4] },
      player: a[5],
      points: a[6],
      kind: TYPES[a[7]]
    }));
    Object.keys(DEFAULT_TUNING).forEach((k, i) => {
      s.tuning[k] = m.tu?.[i] ?? DEFAULT_TUNING[k];
    });
    statsKeys.forEach((k, i) => {
      s.stats[k] = m.st?.[i] || 0;
    });
    return s;
  }
  function validateInput(packet, record, stage) {
    if (!packet || packet.t !== "i" || packet.v !== 1 || packet.stage !== stage || !Number.isSafeInteger(packet.seq) || packet.seq < 0 || packet.seq <= record.seq || !Number.isFinite(packet.x) || !Number.isFinite(packet.y) || Math.abs(packet.x) > 1 || Math.abs(packet.y) > 1 || typeof packet.focus !== "boolean" || !Number.isSafeInteger(packet.ray) || packet.ray < record.ray || packet.ray > record.ray + 16)
      return null;
    return {
      x: clamp(packet.x, -1, 1),
      y: clamp(packet.y, -1, 1),
      focus: packet.focus,
      ray: packet.ray
    };
  }

  class Authority {
    constructor({ host, local = 0, send, onSnapshot, onEnd }) {
      Object.assign(this, { host, local, send, onSnapshot, onEnd });
      this.records = new Map;
      this.seq = 0;
      this.nextSend = 0;
      this.lastTick = -1;
      this.ended = false;
      this.metrics = {
        sent: 0,
        received: 0,
        rejected: 0,
        maxBytes: 0,
        maxRate: 0,
        unreliableMax: 0,
        reliableSnapshots: 0
      };
      this.times = [];
    }
    transmit(data, now, reliable = false) {
      if (this.ended)
        return;
      const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
      if (bytes > 16384)
        throw Error("Network packet exceeds 16 KiB");
      this.times = this.times.filter((t) => t > now - 1);
      if (this.times.length >= 18)
        return;
      this.times.push(now);
      this.metrics.sent++;
      this.metrics.maxBytes = Math.max(this.metrics.maxBytes, bytes);
      this.metrics.maxRate = Math.max(this.metrics.maxRate, this.times.length);
      if (!reliable)
        this.metrics.unreliableMax = Math.max(this.metrics.unreliableMax, bytes);
      this.send(data, { reliable });
    }
    receive(m, from, now, world) {
      if (this.ended || !m || typeof m !== "object")
        return;
      this.metrics.received++;
      if (this.host) {
        if (!world || !Number.isInteger(from) || !world.players[from]?.joined || from === this.local) {
          this.metrics.rejected++;
          return;
        }
        const rec = this.records.get(from) || {
          seq: -1,
          ray: world.players[from].lastRay,
          time: -100,
          input: {}
        };
        const command = validateInput(m, rec, world.stage);
        if (!command) {
          this.metrics.rejected++;
          return;
        }
        rec.seq = m.seq;
        rec.ray = m.ray;
        rec.time = now;
        rec.input = command;
        this.records.set(from, rec);
      } else if (m.t === "s") {
        if (!validSnapshot(m) || m.k <= this.lastTick) {
          this.metrics.rejected++;
          return;
        }
        this.lastTick = m.k;
        this.onSnapshot(m);
      } else if (m.t === "end") {
        this.onEnd?.(m);
      }
    }
    commands(world, local, now) {
      return world.players.map((p) => {
        if (p.id === this.local)
          return local;
        const a = this.records.get(p.id);
        return a && now - a.time < 0.45 ? a.input : { x: 0, y: 0, focus: false, ray: a?.ray ?? p.lastRay };
      });
    }
    update(world, command, now) {
      if (this.ended || now < this.nextSend)
        return;
      this.nextSend = now + 1 / (this.host ? 12 : 15);
      if (this.host) {
        const packet = pack(world), bytes = JSON.stringify(packet).length, reliable = bytes > 1180;
        if (reliable)
          this.metrics.reliableSnapshots++;
        this.transmit(packet, now, reliable);
      } else
        this.transmit({
          t: "i",
          v: 1,
          seq: ++this.seq,
          stage: world.stage,
          x: Math.round(command.x * 1000) / 1000,
          y: Math.round(command.y * 1000) / 1000,
          focus: !!command.focus,
          ray: command.ray
        }, now, false);
    }
    neutralize(id) {
      this.records.delete(id);
    }
    stop() {
      this.ended = true;
      this.records.clear();
    }
  }

  // src/presentation/audio.js
  var SONG = {
    bpm: 116,
    steps: 4,
    tracks: [
      {
        name: "dew",
        wave: "triangle",
        vol: 0.22,
        notes: "D5 . A5 . F5 . E5 . | D5 . . A4 . . C5 . | E5 . G5 . A5 . G5 . | F5 . E5 . D5 - . . | D5 . F5 . A5 . C6 . | Bb5 . A5 . G5 . E5 . | F5 . D5 . C5 . A4 . | D5 - . . . . . ."
      },
      {
        name: "roots",
        wave: "sine",
        vol: 0.3,
        notes: "D3 . . . . . A3 . | D3 . . . . . . . | C3 . . . . . G3 . | Bb2 . . . A2 . . . | D3 . . . . . A3 . | G2 . . . . . D3 . | Bb2 . . . C3 . . . | D3 . . . A2 . . ."
      },
      {
        name: "chase",
        wave: "pulse12",
        vol: 0.09,
        on: false,
        notes: "D4 . A4 . D4 . A4 . | D4 . F4 . A4 . F4 . | C4 . G4 . C4 . G4 . | Bb3 . F4 . A3 . E4 ."
      },
      {
        name: "wings",
        wave: "drums",
        vol: 0.13,
        notes: "k . . h . . h . | . . s . . . h . | k . . h . . h . | . . s . h . . ."
      }
    ]
  };
  var VOICES = {
    ray: { wave: "saw", freq: 920, to: 120, dur: 0.18, vol: 0.2 },
    dry: { wave: "triangle", freq: 100, to: 80, dur: 0.045, vol: 0.09 },
    collapse: {
      wave: "pulse12",
      freq: 520,
      to: 90,
      dur: 0.2,
      vol: 0.17,
      arp: [0, 7, -7],
      step: 0.04
    },
    charge: {
      wave: "triangle",
      freq: 660,
      to: 1320,
      dur: 0.16,
      vol: 0.18,
      arp: [0, 4, 7],
      step: 0.04
    },
    loss: { wave: "sine", freq: 740, to: 180, dur: 0.2, vol: 0.25 },
    warning: { wave: "sine", freq: 370, to: 440, dur: 0.11, vol: 0.11 },
    mature: {
      wave: "pulse12",
      freq: 240,
      to: 580,
      dur: 0.18,
      vol: 0.12,
      arp: [0, 3, 6],
      step: 0.05
    },
    zap: { wave: "noise", freq: 1600, to: 500, dur: 0.08, vol: 0.16 },
    recover: { wave: "sine", freq: 320, to: 440, dur: 0.09, vol: 0.08 },
    expose: { wave: "triangle", freq: 587, to: 1174, dur: 0.3, vol: 0.19 },
    pulse: { wave: "sine", freq: 90, to: 280, dur: 0.26, vol: 0.2 },
    clear: {
      wave: "triangle",
      freq: 587,
      dur: 0.22,
      vol: 0.22,
      arp: [0, 4, 7, 12],
      step: 0.07
    },
    defeat: { wave: "triangle", freq: 294, to: 110, dur: 0.4, vol: 0.18 },
    victory: {
      wave: "triangle",
      freq: 587,
      dur: 0.3,
      vol: 0.2,
      arp: [0, 4, 7, 12, 16],
      step: 0.1
    }
  };
  function syllable(ctx, bus, time, freq = 520, dur = 0.12, vol = 0.15) {
    const source = ctx.createOscillator(), amp = ctx.createGain(), filter = ctx.createBiquadFilter();
    source.type = "sawtooth";
    source.frequency.setValueAtTime(freq, time);
    source.frequency.exponentialRampToValueAtTime(freq * 1.25, time + dur * 0.25);
    source.frequency.exponentialRampToValueAtTime(freq * 0.9, time + dur);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq * 2.7, time);
    filter.Q.value = 3;
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(vol, time + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(bus);
    source.start(time);
    source.stop(time + dur + 0.01);
    return { source, amp };
  }

  class GardenAudio {
    constructor(game, server = false) {
      this.game = game;
      this.disabled = server;
      this.lastEvent = 0;
      this.lastWing = -10;
      this.lastSting = -10;
      this.lastChat = -10;
      this.song = false;
      this.stopped = false;
    }
    start() {
      if (this.disabled || this.song)
        return;
      this.game.audio.music(SONG, { sync: true });
      this.song = true;
      this.stopped = false;
    }
    reset(s) {
      this.lastEvent = s?.eid || 0;
      this.lastWing = -10;
      this.lastSting = -10;
      this.start();
    }
    update(s, demo = false) {
      if (this.disabled || this.stopped)
        return;
      const A = this.game.audio;
      for (const e of s.events)
        if (e.id > this.lastEvent) {
          this.lastEvent = e.id;
          if (VOICES[e.type])
            A.sfx(VOICES[e.type]);
          if (["encounter", "clear", "victory", "expose"].includes(e.type) && !demo)
            this.chatter(e.id);
        }
      if (this.game.paused && !this.game.live)
        return;
      const near = s.rivals.some((a) => a.state === 2), contact = s.players.some((p) => p.contact && p.bees);
      A.layer("chase", near ? 0.09 : 0, 0.35);
      if (s.phase === "play" && s.time - this.lastWing > (near ? 0.19 : 0.36)) {
        this.lastWing = s.time;
        A.sfx({
          wave: "triangle",
          freq: near ? 205 : 170,
          to: near ? 230 : 180,
          dur: 0.065,
          vol: near ? 0.025 : 0.016
        });
      }
      if (contact && s.time - this.lastSting > 0.16) {
        this.lastSting = s.time;
        A.sfx({
          wave: "pulse12",
          freq: 310 + s.tick % 5 * 50,
          to: 190,
          dur: 0.045,
          vol: 0.04
        });
      }
    }
    chatter(seed) {
      const A = this.game.audio;
      if (!A.ready)
        return;
      const bus = A.bus("voice"), c = A.ctx;
      if (!bus || !c)
        return;
      for (let i = 0;i < 4; i++)
        syllable(c, bus, c.currentTime + i * 0.09, 440 + (seed * 13 + i * 17) % 8 * 63, 0.065 + i % 2 * 0.035, 0.07);
    }
    stop() {
      this.stopped = true;
      this.song = false;
      if (this.disabled)
        return;
      this.game.audio.music(null);
    }
  }

  // src/presentation/assets.js
  function installAssets(E) {
    E.MATERIALS.midnightGlaze = { color: "#476e69", pattern: "glaze" };
    E.MATERIALS.midnightSoil = {
      color: "#34433c",
      pattern: "speck",
      amount: 0.07
    };
    E.MATERIALS.midnightGold = { color: "#ba9a60", pattern: "metal" };
    E.SHAPES["garden-bed"] = {
      about: "glazed moonflower bed with copper corner studs",
      tags: "garden planter",
      mats: { g: "midnightGlaze", s: "midnightSoil", c: "midnightGold" },
      params: { w: 32, d: 20 },
      make: (p) => [
        ["box", "g", [0, 0, 0], [p.w, p.d, 5]],
        ["box", "s", [0, 0, 5], [p.w - 5, p.d - 5, 1]],
        ["mirror", "xy", ["cyl", "c", [p.w / 2 - 2, p.d / 2 - 2, 5], 1, 1]]
      ]
    };
    E.SHAPES["garden-dial"] = {
      about: "a clockwork sundial for a garden that never sees the sun",
      tags: "garden clock",
      mats: { s: "slate", g: "midnightGold", c: "copper" },
      parts: [
        ["cyl", "s", [0, 0, 0], 19, 3, { seg: 12 }],
        ["cyl", "g", [0, 0, 3], 17, 1, { seg: 12 }],
        ["cyl", "s", [0, 0, 4], 15, 1, { seg: 12 }],
        ["ring", 12, 13, ["box", "g", [0, 0, 5], [1, 2, 1]]],
        ["wedge", "c", [0, 0, 5], [2, 16, 8]]
      ]
    };
    E.SHAPES["garden-jewel"] = {
      about: "a pale glowing dew jewel in a copper bezel",
      tags: "garden jewel",
      mats: {
        c: "midnightGold",
        j: { color: "#a0d6c7", pattern: "glaze", glow: 0.25 }
      },
      parts: [
        ["cyl", "c", [0, 0, 0], 7, 2, { seg: 6 }],
        ["ball", "j", [0, 0, 4], 5, { sz: 0.7 }]
      ]
    };
  }

  // src/presentation/rigs.js
  function createRigs(E) {
    const { px } = E;
    function ellipse(g, x, y, rx, ry, color) {
      px.ell(g, x, y, Math.max(0.6, rx), Math.max(0.6, ry), color);
    }
    function bee(g, x, y, a, k, time, colors = {}, agitated = false) {
      const C = {
        body: "#f5d47a",
        light: "#fff5cb",
        dark: "#73502b",
        stripe: "#292e35",
        wing: "#c8e8e2",
        ...colors
      }, cs = Math.cos(a), sn = Math.sin(a);
      const P = (u, v) => [x + (u * cs - v * sn) * k, y + (u * sn + v * cs) * k];
      const line = (u, v, uu, vv, c, w = 1) => px.line(g, ...P(u, v), ...P(uu, vv), c, Math.max(1, w * k));
      const wing = 0.7 + 0.5 * Math.sin(time * 54);
      for (const side of [-1, 1]) {
        const pts = [
          P(-0.7, side * 0.4),
          P(-2.4, side * (2.4 + wing)),
          P(0.1, side * (3 + wing)),
          P(1.3, side * 1.3)
        ];
        px.poly(g, pts, "#466a73");
        px.poly(g, [pts[0], pts[1], P(0.2, side * (2.5 + wing)), pts[3]], C.wing);
        line(-0.6, side * 0.8, -1.1, side * (2.8 + wing), "#f1fbdd");
        line(-1, side, -2, side * 1.9, C.dark);
        line(0.7, side, 0.3, side * 2, C.dark);
        line(2, side * 0.4, 3.4, side * 1.5, C.dark);
        line(3.4, side * 1.5, 3.6, side * 1.8, C.light);
      }
      const [ax, ay] = P(-1.3, 0);
      ellipse(g, ax, ay, 2.6 * k, 1.75 * k, C.dark);
      ellipse(g, ax - 0.25 * k, ay - 0.5 * k, 2.15 * k, 1.45 * k, C.body);
      for (const u of [-2.4, -0.8])
        line(u, -1.25, u, 1.25, C.stripe, 0.7);
      line(-3.4, 0, -4.5, 0, agitated ? "#fff5cb" : C.dark);
      const [tx, ty] = P(1.25, 0);
      ellipse(g, tx, ty, 1.65 * k, 1.65 * k, C.dark);
      ellipse(g, tx - 0.2 * k, ty - 0.35 * k, 1.25 * k, 1.2 * k, C.body);
      const [hx, hy] = P(2.25, 0);
      ellipse(g, hx, hy, 1.1 * k, 1.2 * k, C.light);
      for (const side of [-1, 1]) {
        const q = P(2.65, side * 0.58);
        px.disc(g, ...q, Math.max(0.55, 0.42 * k), "#172b35");
      }
      px.dot(g, ax - k, ay - k, C.light);
    }

    class BeeRig extends E.Blob {
      constructor(id) {
        super({
          R: 3,
          wings: true,
          colors: { base: id ? "#bce1d5" : "#f5d47a" }
        });
        this.id = id;
        this.positions = [];
        this.state = null;
        this.lastCount = 0;
      }
      update(dt, state) {
        if (state.bees > this.lastCount)
          this.kick(2.4);
        this.lastCount = state.bees;
        super.update(dt, {
          look: [Math.cos(state.facing), Math.sin(state.facing)],
          flap: state.contact ? 1 : 0.72,
          squash: state.focus ? -0.18 : Math.hypot(state.vx, state.vy) / 120 * 0.12,
          squint: state.contact
        });
        this.state = state;
      }
      draw(g, ox, oy, view) {
        const p = this.state;
        if (!p)
          return;
        const k = (view.scale || 1) * (view.zoom || 1), R = footprint(p), color = this.id ? "#d0f3e6" : "#ffdc86";
        if (!p.bees) {
          px.line(g, ox - 4 * k, oy - 4 * k, ox + 4 * k, oy + 4 * k, color);
          px.line(g, ox + 4 * k, oy - 4 * k, ox - 4 * k, oy + 4 * k, color);
          return;
        }
        for (let i = 0;i < p.bees; i++) {
          const a = i * 2.399963 + this.t * (p.contact ? 1.6 : 0.65), rr = p.bees === 1 ? 0 : Math.sqrt((i + 1) / p.bees) * Math.max(0, R - 4.3), flutter = Math.sin(this.t * 10 + i) * 0.35;
          const dx = Math.cos(a) * rr, dy = Math.sin(a) * rr;
          let last = this.positions[i];
          if (!last)
            last = this.positions[i] = { x: dx, y: dy };
          last.x += (dx - last.x) * 0.24;
          last.y += (dy - last.y) * 0.24;
          const length = Math.hypot(last.x, last.y), limit = Math.max(0, R - 4.3);
          if (length > limit) {
            last.x *= limit / length;
            last.y *= limit / length;
          }
          const f = p.contact ? Math.atan2(-last.y, -last.x) : p.facing + Math.sin(i * 2 + this.t * 4) * 0.16;
          bee(g, ox + last.x * k, oy + (last.y + flutter) * k, f, 0.66 * k * (1 + this.sq * 0.16), this.t + i * 1.3, this.id ? {
            body: "#b9decf",
            light: "#effff0",
            dark: "#3a6460",
            wing: "#d4edff"
          } : {}, p.contact);
        }
        const pts = this.id ? [
          [ox, oy - 2],
          [ox + 2, oy],
          [ox, oy + 2],
          [ox - 2, oy]
        ] : [
          [ox - 1, oy - 1],
          [ox + 1, oy - 1],
          [ox + 1, oy + 1],
          [ox - 1, oy + 1]
        ];
        px.poly(g, pts, color);
      }
    }

    class GardenerRig extends E.Blob {
      constructor(type) {
        super({ R: 7, wings: false, feet: true });
        this.type = type;
        this.state = null;
      }
      update(dt, state) {
        super.update(dt, {
          flap: 0,
          walk: state.warning > 0 ? 0 : state.hp / state.maxHp,
          squash: state.hp / state.maxHp < 0.5 ? -0.15 : 0,
          squint: state.hp < state.maxHp
        });
        this.state = state;
      }
      draw(g, ox, oy, view) {
        const t = this.state;
        if (!t)
          return;
        const k = (view.scale || 1) * (view.zoom || 1), C = this.type === "right" ? {
          dark: "#244644",
          base: "#548d80",
          light: "#a9d2b5",
          rim: "#debd7d"
        } : {
          dark: "#4f3837",
          base: "#bd8057",
          light: "#f4c086",
          rim: "#d0e1c0"
        }, health = t.hp / t.maxHp;
        const bank = Math.sin(this.t * 20) * (1 - health) * 1.3 * k, xx = ox + bank, yy = oy;
        if (this.type === "bell") {
          this.bell(g, ox, oy, k);
          return;
        }
        for (const side2 of [-1, 1])
          for (let i = 0;i < 2; i++) {
            const st = Math.sin(this.t * 13 + i * Math.PI + side2) * health, dx = side2 * (7 + st) * k, dy = (i ? 3 : -3) * k;
            px.line(g, xx + side2 * 4 * k, yy + dy, xx + dx, yy + dy + st * k, C.dark, Math.max(1, k));
            px.rect(g, xx + dx - k, yy + dy - k, 3 * k, 2 * k, C.light);
          }
        if (this.type === "right") {
          px.poly(g, [
            [xx - 7 * k, yy - 3 * k],
            [xx - 3 * k, yy - 7 * k],
            [xx + 5 * k, yy - 5 * k],
            [xx + 7 * k, yy + 4 * k],
            [xx, yy + 7 * k],
            [xx - 6 * k, yy + 4 * k]
          ], C.dark);
          px.poly(g, [
            [xx - 5 * k, yy - 3 * k],
            [xx - 2 * k, yy - 6 * k],
            [xx + 4 * k, yy - 4 * k],
            [xx + 5 * k, yy + 3 * k],
            [xx, yy + 5 * k],
            [xx - 4 * k, yy + 3 * k]
          ], C.base);
          px.line(g, xx - 2 * k, yy - 5 * k, xx + 3 * k, yy - 4 * k, C.light, Math.max(1, k));
          px.line(g, xx, yy - 5 * k, xx, yy - 11 * k, C.rim);
          px.poly(g, [
            [xx, yy - 11 * k],
            [xx + 4 * k, yy - 13 * k],
            [xx + 3 * k, yy - 9 * k]
          ], C.light);
        } else {
          ellipse(g, xx, yy, 7 * k, 6.5 * k, C.dark);
          ellipse(g, xx - 0.4 * k, yy - 1 * k, 5.7 * k, 5.3 * k, C.base);
          ellipse(g, xx - 2 * k, yy - 3 * k, 2.6 * k, 1.6 * k, C.light);
          for (const side2 of [-1, 1]) {
            px.line(g, xx + side2 * 3 * k, yy - 5 * k, xx + side2 * 4 * k, yy - 9 * k, C.rim);
            px.disc(g, xx + side2 * 4 * k, yy - 9 * k, 1.2 * k, C.light);
          }
        }
        px.rect(g, xx - 4 * k, yy - k, 8 * k, 3 * k, C.dark);
        for (const side2 of [-1, 1]) {
          px.rect(g, xx + side2 * 2.5 * k - k, yy, 2 * k, health < 0.4 ? k : 2 * k, health < 0.4 ? "#f4a879" : "#fff0c8");
        }
        px.line(g, xx - 2 * k, yy + 4 * k, xx + 2 * k, yy + 4 * k, C.rim);
        px.rect(g, xx - k, yy + 6 * k, 2 * k, 3 * k, C.dark);
        px.line(g, xx - 2 * k, yy - 3 * k, xx + 2 * k, yy - 3 * k, C.dark);
        const side = this.type === "right" ? 1 : -1;
        px.line(g, xx + side * 2 * k, yy - 3 * k, xx + side * k, yy - 4 * k, C.dark);
        if (health < 0.96) {
          const n2 = 16;
          for (let i = 0;i < n2; i++) {
            const a = i / n2 * Math.PI * 2, aa = a + 0.2;
            const c = i / n2 < 1 - health ? "#f8d786" : "#283b40";
            px.line(g, ox + Math.cos(a) * 10 * k, oy + Math.sin(a) * 10 * k, ox + Math.cos(aa) * 10 * k, oy + Math.sin(aa) * 10 * k, c);
          }
        }
        if (t.recovering) {
          px.line(g, xx - 2 * k, yy - 13 * k, xx, yy - 15 * k, "#a6d4d1");
          px.line(g, xx, yy - 15 * k, xx + 2 * k, yy - 13 * k, "#a6d4d1");
        }
      }
      bell(g, x, y, k) {
        const t = this.state, open = t.bossPhase === "open", pulse = t.bossPhase === "pulse", wob = pulse ? Math.sin(this.t * 28) * 1.3 * k : 0, C = { dark: "#624b36", base: "#c39858", light: "#f9d995" };
        x += wob;
        for (const side of [-1, 1])
          for (const v of [-1, 1]) {
            px.line(g, x + side * 9 * k, y + v * 7 * k, x + side * 19 * k, y + v * 11 * k, "#52675f", 2 * k);
            ellipse(g, x + side * 19 * k, y + v * 11 * k, 3 * k, 2 * k, "#b4c1a1");
          }
        ellipse(g, x, y, 17 * k, 16 * k, C.dark);
        ellipse(g, x - k, y - k, 15 * k, 14 * k, C.base);
        ellipse(g, x - 5 * k, y - 7 * k, 7 * k, 3 * k, C.light);
        px.rect(g, x - 6 * k, y - 21 * k, 12 * k, 4 * k, "#71827a");
        px.rect(g, x - 4 * k, y - 25 * k, 8 * k, 5 * k, C.dark);
        px.rect(g, x - 2 * k, y - 24 * k, 4 * k, 3 * k, C.light);
        ellipse(g, x, y + 2 * k, 11 * k, 10 * k, "#324443");
        if (open) {
          for (let i = 0;i < 6; i++) {
            const a = i * Math.PI / 3 + this.t * 0.6;
            px.poly(g, [
              [x + Math.cos(a) * 7 * k, y + Math.sin(a) * 7 * k],
              [x + Math.cos(a + 0.2) * 15 * k, y + Math.sin(a + 0.2) * 15 * k],
              [x + Math.cos(a + 0.5) * 14 * k, y + Math.sin(a + 0.5) * 14 * k]
            ], C.light);
          }
          ellipse(g, x, y + 1 * k, 6 * k, 6 * k, "#f9da8d");
          ellipse(g, x - 1 * k, y - k, 3.5 * k, 3.5 * k, "#fff9dc");
        } else {
          px.rect(g, x - 10 * k, y, 20 * k, 4 * k, "#88978b");
          px.line(g, x, y - 8 * k, x, y + 9 * k, "#c7b373", Math.max(1, k));
          for (const side of [-1, 1])
            px.rect(g, x + side * 5 * k - 1, y - 4 * k, 3 * k, 2 * k, pulse ? "#ffc68b" : "#dfefce");
        }
        px.rect(g, x - 14 * k, y + 13 * k, 28 * k, 4 * k, C.dark);
        px.rect(g, x - 12 * k, y + 13 * k, 24 * k, 2 * k, C.light);
        const n2 = 24;
        for (let i = 0;i < n2; i++) {
          const a = i / n2 * Math.PI * 2, aa = a + 0.15;
          px.line(g, x + Math.cos(a) * 21 * k, y + Math.sin(a) * 21 * k, x + Math.cos(aa) * 21 * k, y + Math.sin(aa) * 21 * k, i / n2 < 1 - t.hp / t.maxHp ? "#ffe1a3" : "#45565b");
        }
      }
    }
    return { BeeRig, GardenerRig, bee };
  }

  // src/presentation/garden.js
  class Garden {
    constructor(E, game) {
      this.E = E;
      this.game = game;
      installAssets(E);
      this.rigs = createRigs(E);
      this.bees = new Map;
      this.gardeners = new Map;
      this.particles = [];
      this.lastEvent = 0;
      this.overlay = false;
      this.labels = false;
      this.rect = null;
      game.screen.listeners.push(() => this.fit());
      this.cacheStage = -1;
      this.t = 0;
      this.weather = [];
      const R = rng(23);
      for (let i = 0;i < 100; i++)
        this.weather.push({
          x: R() * 650 - 130,
          y: R() * 430 - 95,
          a: R() * 6.28,
          s: 0.2 + R() * 0.7
        });
    }
    fit() {
      const g = this.game, W = g.W, H = g.H, portrait = H > W * 1.15;
      const top = portrait ? 86 : 46, bottom = portrait ? 100 : 32, margin = portrait ? 19 : 30;
      const fit = Math.min((W - margin * 2) / 400, (H - top - bottom) / 256), zoom = clamp(fit, 0.5, 1.6);
      if (Math.abs(g.zoom - zoom) > 0.001)
        g.setZoom(zoom);
      const centerY = (top + H - bottom) / 2;
      g.cam.offset = [0, centerY - H / 2];
      g.cam.smooth = 0;
      g.focus(192, 120, 0);
      g.cam.snap = true;
      const projected = g.view.p(192, 120, 0);
      g.cam.x = projected[0] - W / 2;
      g.cam.y = projected[1] - centerY;
      this.rect = {
        x: (W - 384 * zoom) / 2,
        y: centerY - 120 * zoom,
        w: 384 * zoom,
        h: 240 * zoom,
        zoom,
        portrait,
        top,
        bottom
      };
      return this.rect;
    }
    reset(s) {
      this.lastEvent = s?.eid || 0;
      this.particles = [];
      this.bees.clear();
      this.gardeners.clear();
    }
    update(dt, s) {
      this.t = s.time;
      this.fit();
      for (const p of s.players) {
        if (!this.bees.has(p.id))
          this.bees.set(p.id, new this.rigs.BeeRig(p.id));
        this.bees.get(p.id).update(dt, p);
      }
      for (const t of s.targets) {
        if (!this.gardeners.has(t.id))
          this.gardeners.set(t.id, new this.rigs.GardenerRig(t.type));
        this.gardeners.get(t.id).update(dt, t);
      }
      for (const e of s.events)
        if (e.id > this.lastEvent) {
          this.effect(e);
          this.lastEvent = e.id;
        }
      this.particles = this.particles.filter((p) => s.time - p.born < p.life);
    }
    effect(e) {
      const palette = {
        collapse: "#e9bd79",
        zap: "#d3e8b1",
        loss: "#e5a397",
        charge: "#ffe5a0",
        mature: "#df9890",
        pulse: "#ebd695",
        clear: "#e5e9b8"
      };
      if (palette[e.type] && Number.isFinite(e.x)) {
        const R = rng(e.id * 37);
        for (let i = 0;i < (e.type === "collapse" ? 16 : 8); i++) {
          const a = R() * 6.28, s = 8 + R() * 35;
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            born: e.t,
            life: 0.4 + R() * 0.7,
            c: palette[e.type],
            kind: e.type
          });
        }
      }
    }
    draw(r, s, { hud = true, demo = false, prompt: prompt2 = "", names = [] } = {}) {
      const E = this.E, { px } = E, g = this.game, d = STAGES[s.stage], C = PALETTES[d.garden], time = g.reduceMotion ? 0 : s.time;
      r.sky(["#08151d", "#101e29", "#18272c"]);
      r.decal((ctx) => {
        const q = (x, y) => r.w(x, y, 0), rect2 = (x, y, w, h, c) => {
          const a = q(x, y), b = q(x + w, y + h);
          px.rect(ctx, a[0], a[1], b[0] - a[0], b[1] - a[1], c);
        };
        rect2(-70, -65, 524, 370, "#101f27");
        rect2(-20, -20, 424, 284, "#0a141c");
        rect2(-16, -16, 416, 276, "#283b40");
        rect2(-12, -12, 408, 268, C.edge);
        rect2(-10, -10, 404, 264, "#15272d");
        rect2(-5, -5, 394, 250, "#42605b");
        rect2(-3, -3, 390, 246, "#253e3e");
        rect2(0, 0, 384, 240, C.floor);
        for (let x = 0;x < 384; x += 16) {
          rect2(x, -10, 15, 3, "#63726b");
          rect2(x, 247, 15, 3, "#263a3b");
          if (x % 48 === 0) {
            const a = q(x + 7, -8);
            px.dot(ctx, ...a, "#c1ac78");
          }
        }
        for (let y = 0;y < 240; y += 16) {
          rect2(-10, y, 3, 15, "#5c716a");
          rect2(391, y, 3, 15, "#283e3d");
        }
        for (let i = 0;i < 240; i++) {
          const x = (i * 173 + 19) % 382 + 1, y = (i * 83 + 7) % 238 + 1, a = q(x, y);
          px.dot(ctx, ...a, i % 3 ? "#182a2e" : "#233437");
        }
        for (let x = 32;x < 384; x += 64)
          for (let y = 26;y < 240; y += 64) {
            const a = q(x, y);
            px.line(ctx, a[0] - 2, a[1], a[0] + 2, a[1], "#263738");
          }
        for (let i = 0;i < 17; i++) {
          const x = -25 + i * 27;
          this.flower(ctx, r, x, -28, 8 + i % 4, C, i, time);
          this.flower(ctx, r, x, 269, 8 + i * 3 % 5, C, i + 23, time);
        }
        for (let i = 0;i < 10; i++) {
          this.flower(ctx, r, -31, i * 28 - 10, 11, C, i + 41, time);
          this.flower(ctx, r, 416, i * 28 - 10, 11, C, i + 67, time);
        }
        for (let i = 0;i < 24; i++) {
          const x = i % 2 ? -58 : 442, y = i * 47 % 320 - 36;
          this.leaf(ctx, r, x, y, 15 + i % 6, (i % 2 ? 1 : -1) * 0.7, C.leaf, time, i);
        }
        for (let i = 0;i < 7; i++) {
          const x = -65 + i * 85, qq = q(x, -48);
          px.line(ctx, qq[0], qq[1], qq[0] + 40 * r.ppu, qq[1], "#294449");
        }
        for (const o of d.obstacles) {
          rect2(o.x - 1, o.y - 1, o.w + 2, o.h + 2, "#5d7469");
          rect2(o.x, o.y, o.w, o.h, "#293e3d");
        }
        for (const h of s.husks) {
          const a = q(h.x, h.y);
          px.ell(ctx, a[0] + 2, a[1] + 3, h.r * r.ppu + 3, h.r * r.ppu + 2, "#071318");
        }
        if (this.overlay) {
          for (const o of d.obstacles) {
            const a = q(o.x, o.y), b = q(o.x + o.w, o.y + o.h);
            px.line(ctx, ...a, b[0], a[1], "#e5a4b7");
            px.line(ctx, b[0], a[1], ...b, "#e5a4b7");
            px.line(ctx, ...b, a[0], b[1], "#e5a4b7");
            px.line(ctx, a[0], b[1], ...a, "#e5a4b7");
          }
        }
      });
      for (const o of d.obstacles) {
        if (o.kind === "dial")
          r.shape("garden-dial", o.x + o.w / 2, o.y + o.h / 2, 0, {
            scale: o.w / 42,
            shadow: false
          });
        else {
          r.shape("garden-bed", o.x + o.w / 2, o.y + o.h / 2, 0, {
            params: { w: o.w, d: o.h },
            mats: { g: d.garden === 1 ? "slate" : "midnightGlaze" },
            shadow: false
          });
          r.queue(o.x + o.w / 2, o.y + o.h / 2, 3, (ctx) => {
            for (let i = 0;i < Math.max(1, Math.floor(o.w / 12)); i++)
              this.flower(ctx, r, o.x + 6 + i * 11, o.y + o.h / 2, Math.min(5, o.h / 3), C, i + o.x, time, true);
          });
          if (o.kind === "trellis")
            r.queue(o.x + o.w / 2, o.y + o.h / 2, 4, (ctx) => {
              const a = r.w(o.x + 3, o.y + 3, 0), b = r.w(o.x + o.w - 3, o.y + o.h - 3, 0);
              px.line(ctx, ...a, ...b, "#8c9878");
              px.line(ctx, a[0], b[1], b[0], a[1], "#6d867a");
            });
        }
      }
      for (const [i, e] of d.entrances.entries()) {
        r.shape("garden-jewel", e.x, e.y, 0, { scale: 0.9, shadow: false });
        r.decal((ctx) => {
          const a = r.w(e.x, e.y, 0);
          for (let j = 0;j < 4; j++) {
            const x = a[0] + e.dx * (j * 3 - 9) * r.ppu, y = a[1] + e.dy * (j * 3 - 9) * r.ppu;
            px.dot(ctx, x, y, "#678a80");
          }
        });
      }
      for (const h of s.husks) {
        const age = s.time - h.born, k = r.ppu, settle = g.reduceMotion ? 0 : Math.max(0, 1 - age / 0.45) * 3;
        r.actor(h.x, h.y, 0, (ctx, x, y) => {
          const R = h.r * k;
          px.ell(ctx, x, y, R, R, "#5f6658");
          px.ell(ctx, x - 0.5, y - settle, R - 1, R - 2, "#9c9d7b");
          px.ell(ctx, x - 1, y - 2 - settle, R - 3, R - 4, "#c7bf8a");
          px.line(ctx, x - R * 0.7, y, x + R * 0.6, y + R * 0.2, "#535b51");
          px.line(ctx, x, y - R * 0.6, x - 2, y + R * 0.5, "#626950");
          px.rect(ctx, x + R * 0.5, y - R * 0.5, 2, 1, "#ede0ad");
          if (h.type === "bell") {
            px.rect(ctx, x - 4 * k, y - 5 * k, 8 * k, 4 * k, "#c6a469");
            px.rect(ctx, x - 2 * k, y - 3 * k, 4 * k, 2 * k, "#394a49");
          }
        }, { outline: false, rim: false });
        if (this.overlay)
          r.decal(() => r.groundRing(h.x, h.y, h.r, "#ffd28c", 1));
      }
      for (const p of s.players)
        if (p.bees && p.charge) {
          const threat = s.rivals.some((a) => Math.abs(a.y - p.y) < s.tuning.rayWidth + a.r);
          r.decal((ctx) => {
            const a = r.w(0, p.y), b = r.w(384, p.y);
            const c = p.id ? "#5f8583" : "#69684b";
            for (let x = a[0];x < b[0]; x += threat ? 5 : 10)
              px.rect(ctx, x, a[1], threat ? 3 : 1, 1, c);
          });
        }
      for (const t of s.targets) {
        r.shadow(t.x, t.y, t.r + 2, 0.5, "#06151a");
        if (t.warning > 0) {
          r.decal(() => r.groundRing(t.x, t.y, 11 + (Math.sin(s.time * 8) + 1) * 2, "#e3b17b", 0.8));
          r.textAt(t.x, t.y, 0, "!", "#ffda90");
        }
        const rig = this.gardeners.get(t.id);
        if (rig)
          r.actor(t.x, t.y, 0, (ctx, x, y) => rig.draw(ctx, x, y, r.view), {
            outline: false,
            rim: false
          });
        if (t.type === "bell" && t.bossPhase === "pulse")
          r.decal((ctx) => {
            r.groundRing(t.x, t.y, 20 + 70 * t.bossT / 1.5, "#c3a176", 0.65);
            r.groundRing(t.x, t.y, 95, "#786d55", 0.4);
          });
        if (this.labels)
          r.textAt(t.x, t.y, 10, t.type === "bell" ? t.bossPhase : t.type === "left" ? "LEFTENANT" : "RIGHTO", "#f5de9b");
      }
      for (const a of s.rivals) {
        const k = r.ppu, state = a.state, color = ["#95b57f", "#9bb3d4", "#e89280"][state], shapeN = [5, 7, 9][state];
        r.shadow(a.x, a.y, 9, 0.35, "#071018");
        if (a.warning > 0 || s.time - a.matureAt < 0.8)
          r.decal(() => r.groundRing(a.x, a.y, 12 + Math.sin(s.time * 6) * 2, color, 0.7));
        r.actor(a.x, a.y, 0, (ctx, x, y) => {
          if (a.warning > 0) {
            const w = Math.sin(s.time * 9) * 0.2 + 0.5;
            px.ell(ctx, x, y, 8 * k, 8 * k, "#344643");
            px.ell(ctx, x, y, 6 * k, 6 * k, color);
            px.rect(ctx, x - k, y - 4 * k, 2 * k, 5 * k, "#202e30");
            px.dot(ctx, x, y + 3 * k, "#202e30");
            return;
          }
          for (let i = 0;i < shapeN; i++) {
            const angle = state === 2 ? a.dir + Math.PI + (i - shapeN / 2) * 0.32 : i * 2.399 + s.time * (state === 1 ? 1.6 : 0.8), radius = state === 2 ? 3 + Math.abs(i - shapeN / 2) * 1.1 : 2 + Math.sqrt(i) * 2;
            const xx = x + Math.cos(angle) * radius * k, yy = y + Math.sin(angle) * radius * k, wa = Math.sin(s.time * 49 + i) * 1.5;
            px.ell(ctx, xx, yy - 2 * k, 2 * k, (1.7 + wa * 0.2) * k, "#cbded4");
            px.ell(ctx, xx, yy, 1.8 * k, 2.4 * k, "#253334");
            px.rect(ctx, xx - k, yy - k, 2 * k, 3 * k, color);
            px.dot(ctx, xx, yy - 2 * k, "#fff4d7");
          }
          if (state === 2) {
            const cs = Math.cos(a.dir), sn = Math.sin(a.dir);
            px.line(ctx, x + cs * 9 * k, y + sn * 9 * k, x + cs * 12 * k, y + sn * 12 * k, color);
          }
        }, { outline: false, rim: false });
        if (this.labels)
          r.textAt(a.x, a.y, 10, ["SCOUT", "GUARD", "HUNTER"][state], color);
      }
      for (const p of s.players) {
        const color = p.id ? "#bce6d3" : "#ffe2a0", R = footprint(p);
        if (p.bees) {
          r.shadow(p.x, p.y, R, 0.25, "#071419");
          if (p.contact || p.focus || this.overlay)
            r.decal(() => r.groundRing(p.x, p.y, R, color, p.contact ? 0.8 : 0.35));
          if (s.time - p.lostAt < 0.45)
            r.decal(() => r.groundRing(p.x, p.y, R + 4 * (s.time - p.lostAt), "#efaa9a", 0.8));
        }
        const rig = this.bees.get(p.id);
        if (rig)
          r.actor(p.x, p.y, 1, (ctx, x, y) => rig.draw(ctx, x, y, r.view), {
            outline: false,
            rim: false
          });
        if (s.players.length > 1)
          r.textAt(p.x, p.y + R + 6, 0, p.bees ? p.id ? "2" : "1" : "OUT", color);
      }
      for (const e of s.events) {
        const age = s.time - e.t;
        if (age < 0)
          continue;
        if (e.type === "ray" && age < 0.4) {
          r.queue(192, e.y, 1, (ctx) => {
            const a = r.w(0, e.y, 0), b = r.w(384, e.y, 0), height = (age < 0.07 ? 3 : 1) * r.ppu, alpha = (g.settings.flashes === 0 ? 0.4 : 0.8) * (1 - age / 0.4);
            px.blend(ctx, alpha, "add", () => {
              px.rect(ctx, a[0], a[1] - s.tuning.rayWidth * r.ppu, b[0] - a[0], s.tuning.rayWidth * 2 * r.ppu, "#697f6a");
              px.rect(ctx, a[0], a[1] - height / 2, b[0] - a[0], height, "#fff4c7");
            });
          }, { emissive: true });
        }
        if (e.type === "collapse" && age < 1.3)
          r.textAt(e.x, e.y - 10 - age * 9, 0, "+" + e.points, "#f6de9f");
        if (e.type === "pulse" && age < 0.65)
          r.decal(() => r.groundRing(e.x, e.y, 15 + age * 150, "#f7d9a2", 1 - age / 0.65));
      }
      for (const p of this.particles) {
        const age = s.time - p.born, a = 1 - age / p.life;
        r.actor(p.x + p.vx * age, p.y + p.vy * age, 1, (ctx, x, y) => {
          px.rect(ctx, x, y, a > 0.5 ? 2 : 1, 1, p.c);
        }, { outline: false, rim: false });
      }
      r.overlay((ctx) => {
        for (const a of this.weather) {
          const xx = a.x + Math.sin(time * 0.3 + a.a) * 5, yy = a.y + Math.cos(time * 0.4 + a.a) * 5;
          if (xx > 0 && xx < 384 && yy > 0 && yy < 240)
            continue;
          const q = r.w(xx, yy, 0);
          if (q[0] < 0 || q[0] > r.W || q[1] < 0 || q[1] > r.H)
            continue;
          if (Math.sin(time * 0.7 + a.a) > 0.3)
            px.dot(ctx, ...q, "#b2c78b");
        }
      });
      if (hud)
        this.hud(r, s, { demo, prompt: prompt2, names });
    }
    leaf(ctx, r, x, y, size, angle, color, time, id) {
      const { px } = this.E, k = r.ppu, a = angle + Math.sin(time * 0.4 + id) * 0.06, p = r.w(x, y, 0), cs = Math.cos(a), sn = Math.sin(a), P = (u, v) => [
        p[0] + (u * cs - v * sn) * k,
        p[1] + (u * sn + v * cs) * k
      ];
      px.poly(ctx, [
        P(0, 0),
        P(-size * 0.5, -size * 0.6),
        P(-size * 0.2, -size * 1.2),
        P(0, -size * 1.55),
        P(size * 0.4, -size * 0.7)
      ], "#1d3639");
      px.poly(ctx, [
        P(0, 0),
        P(-size * 0.3, -size * 0.65),
        P(0, -size * 1.55),
        P(size * 0.32, -size * 0.7)
      ], color);
      px.line(ctx, ...P(0, 0), ...P(0, -size * 1.3), "#658372");
    }
    flower(ctx, r, x, y, size, C, id, time, small = false) {
      const { px } = this.E, k = r.ppu, p = r.w(x, y, 0), angle = id * 1.73, sw = Math.sin(time * 0.7 + id) * 1.3;
      if (!small) {
        this.leaf(ctx, r, x - 3, y + 5, size, angle, C.leaf, time, id);
        this.leaf(ctx, r, x + 3, y + 4, size * 0.8, angle + 2, C.leaf, time, id + 4);
      }
      const rad = size * 0.42 * k;
      for (let i = 0;i < 5; i++) {
        const a = i * Math.PI * 2 / 5 + angle, xx = p[0] + Math.cos(a) * rad, yy = p[1] + Math.sin(a) * rad + sw * k;
        px.ell(ctx, xx, yy, rad * 0.95, rad * 0.85, "#69596a");
        px.ell(ctx, xx - 0.5, yy - 1, rad * 0.8, rad * 0.65, C.flower);
        px.dot(ctx, xx - 1, yy - 1, "#f5e2c2");
      }
      px.disc(ctx, p[0], p[1] + sw * k, Math.max(1, rad * 0.55), "#574c3c");
      px.disc(ctx, p[0] - 0.5, p[1] - 1 + sw * k, Math.max(1, rad * 0.4), "#e5c580");
      if (id % 3 === 0 && !small) {
        px.disc(ctx, p[0] + rad * 1.3, p[1] + rad * 1.2, Math.max(1, k), "#9dc8b4");
        px.dot(ctx, p[0] + rad * 1.3 - 1, p[1] + rad * 1.2 - 1, "#e9f1d4");
      }
    }
    hud(r, s, { demo, prompt: prompt2, names }) {
      const { px, font } = this.E, W = r.W, H = r.H, p = this.rect?.portrait, score = String(s.score).padStart(6, "0"), d = STAGES[s.stage];
      r.overlay((ctx) => {
        px.rect(ctx, 0, 0, W, p ? 73 : 43, "#0c1922");
        px.rect(ctx, 12, p ? 72 : 42, W - 24, 1, "#3b5353");
        font.text(ctx, "TEAM", 16, 8, "#92a6a1", { outline: false });
        font.text(ctx, score, 16, 20, "#f8e4ac", { scale: 2, outline: false });
        const cx = p ? W * 0.58 : W / 2;
        font.text(ctx, `${String(s.stage + 1).padStart(2, "0")} / 06`, cx, 8, "#f1d49c", { align: "center", outline: false });
        if (!p)
          font.text(ctx, d.name, cx, 22, "#d0dfcc", {
            align: "center",
            outline: false
          });
        s.players.forEach((a, i) => {
          const xx = p ? 16 + i * W * 0.46 : W - 140 + i * 72, yy = p ? 53 : 8;
          const c = i ? "#bce6d3" : "#f1d49c";
          font.text(ctx, `P${i + 1}  ${a.bees}/12`, xx, yy, c, {
            outline: false
          });
          font.text(ctx, a.bees ? a.charge ? "RAY READY" : "RAY EMPTY" : "OBSERVER", xx, yy + 12, a.charge ? c : "#829595", { font: "tiny", outline: false });
        });
        const by = H - (p ? 77 : 25);
        px.rect(ctx, 12, by - 7, W - 24, 1, "#334b4c");
        const teaching = s.stageTime < 10 ? d.lesson : s.stageTime < 20 ? d.hint : prompt2;
        const lines = font.wrap(demo ? "DEMO  •  ANY INPUT TO PLAY" : teaching, W - 35, { scale: 1 });
        font.text(ctx, lines.slice(0, p ? 3 : 2).join(`
`), W / 2, by, "#c4d1b9", { align: "center", outline: false });
        if (s.assisted && !demo)
          font.text(ctx, "ASSISTED", W - 17, p ? 81 : 47, "#b6b8a5", {
            align: "right",
            font: "tiny",
            outline: false
          });
        if (demo)
          font.text(ctx, "KILLER BEE-YOND MIDNIGHT", W / 2, p ? 93 : 50, "#f8e3ac", { align: "center", outline: false });
      });
    }
  }

  // src/sim/bot.js
  var W = 48;
  var H = 30;
  function route(s, p, goal, r = 8, avoid = true) {
    if (blocked(s, p.x, p.y, r))
      return freePoint(s, p.x, p.y, r + 1) || goal;
    const sx = clamp(Math.floor(p.x / 8), 0, W - 1), sy = clamp(Math.floor(p.y / 8), 0, H - 1), gx = clamp(Math.floor(goal.x / 8), 0, W - 1), gy = clamp(Math.floor(goal.y / 8), 0, H - 1), start = sy * W + sx, end = gy * W + gx;
    const cost = new Float64Array(W * H).fill(Infinity), prev = new Int16Array(W * H).fill(-1), closed = new Uint8Array(W * H), front = [start];
    cost[start] = 0;
    let best = start, bd = Infinity;
    for (let n2 = 0;front.length && n2 < 1440; n2++) {
      let at = 0, value = Infinity;
      for (let i = 0;i < front.length; i++) {
        const k3 = front[i], x2 = k3 % W, y2 = k3 / W | 0, v = cost[k3] + Math.hypot(x2 - gx, y2 - gy);
        if (v < value) {
          value = v;
          at = i;
        }
      }
      const k2 = front.splice(at, 1)[0];
      if (closed[k2])
        continue;
      closed[k2] = 1;
      const x = k2 % W, y = k2 / W | 0, dd = Math.hypot(x - gx, y - gy);
      if (dd < bd) {
        bd = dd;
        best = k2;
      }
      if (k2 === end || dd < 1.5) {
        best = k2;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1]
      ]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || xx >= W || yy < 0 || yy >= H)
          continue;
        const q = yy * W + xx;
        if (closed[q] || blocked(s, xx * 8 + 4, yy * 8 + 4, r) || dx && dy && (blocked(s, x * 8 + 4, yy * 8 + 4, r) || blocked(s, xx * 8 + 4, y * 8 + 4, r)))
          continue;
        let danger = 0;
        if (avoid) {
          for (const a of s.rivals)
            if (a.warning <= 0) {
              const d = Math.hypot(xx * 8 + 4 - a.x, yy * 8 + 4 - a.y);
              if (d < 50)
                danger += ((50 - d) / 20) ** 2;
            }
        }
        const v = cost[k2] + Math.hypot(dx, dy) + danger;
        if (v < cost[q]) {
          cost[q] = v;
          prev[q] = k2;
          front.push(q);
        }
      }
    }
    if (best === start)
      return goal;
    const path = [];
    let k = best;
    for (let n2 = 0;n2 < 1440 && k !== start && k >= 0; n2++) {
      path.push(k);
      k = prev[k];
    }
    path.reverse();
    let point = { x: p.x, y: p.y };
    for (const q of path.slice(0, 4)) {
      const next = { x: q % W * 8 + 4, y: (q / W | 0) * 8 + 4 };
      let clear = true;
      for (let f = 0;f <= 1; f += 0.12)
        if (blocked(s, p.x + (next.x - p.x) * f, p.y + (next.y - p.y) * f, r))
          clear = false;
      if (!clear)
        break;
      point = next;
    }
    if (distance(point, p) < 0.1) {
      const anchor = { x: sx * 8 + 4, y: sy * 8 + 4 };
      let clear = !blocked(s, anchor.x, anchor.y, r);
      for (let f = 0.1;f <= 1; f += 0.1)
        if (blocked(s, p.x + (anchor.x - p.x) * f, p.y + (anchor.y - p.y) * f, r))
          clear = false;
      if (clear && distance(anchor, p) > 0.1)
        return anchor;
      for (const [dx, dy] of [
        [-8, 0],
        [8, 0],
        [0, -8],
        [0, 8]
      ])
        if (!blocked(s, p.x + dx, p.y + dy, r))
          return { x: p.x + dx, y: p.y + dy };
    }
    return point;
  }
  function pilot(s, p, memory = {}) {
    if (!p?.bees || s.phase !== "play")
      return { x: 0, y: 0, focus: false, ray: p?.lastRay || 0 };
    const danger = s.rivals.filter((a) => a.warning <= 0).sort((a, b) => distance(a, p) - distance(b, p)), near = danger[0], dangerD = near ? distance(p, near) : Infinity;
    const targets = s.targets.filter((t2) => t2.warning <= 0).sort((a, b) => distance(a, p) - distance(b, p));
    const wounded = targets.filter((t2) => t2.hp < t2.maxHp * 0.7).sort((a, b) => distance(a, p) - distance(b, p));
    const t = wounded[0] || targets[p.id % Math.max(1, targets.length)];
    let goal = t ? { x: t.x, y: t.y } : {
      x: 192 + Math.cos(s.time * 0.55 + p.id * 2) * 125,
      y: 120 + Math.sin(s.time * 0.55 + p.id * 2) * 78
    };
    let focus = !!t && distance(p, t) < 20 && (dangerD > 43 || p.charge);
    const fire = !!p.charge && danger.some((a) => Math.abs(a.y - p.y) < s.tuning.rayWidth + a.r - 1);
    if (t?.type === "bell" && t.bossPhase !== "open") {
      const escorts = targets.filter((a) => a.type !== "bell");
      if (escorts.length) {
        goal = escorts[0];
        focus = distance(p, goal) < 18 && dangerD > 40;
      } else {
        const a = Math.atan2(p.y - t.y, p.x - t.x);
        goal = { x: t.x + Math.cos(a) * 50, y: t.y + Math.sin(a) * 50 };
        focus = false;
      }
    }
    if (near && dangerD < 40 && !fire) {
      if (p.charge && dangerD > 23) {
        goal = { x: p.x + (p.x > near.x ? 1 : -1) * 20, y: near.y };
        focus = false;
      } else if (dangerD < 25 && !(t && distance(p, t) < 20 && t.hp < 0.65)) {
        const ax = p.x - near.x, ay = p.y - near.y;
        const dd = Math.hypot(ax, ay) || 1;
        goal = {
          x: clamp(p.x + ax / dd * 65, 20, 364),
          y: clamp(p.y + ay / dd * 65, 20, 220)
        };
        focus = false;
        if (distance(p, goal) < 15) {
          const sign = p.x < 192 ? 1 : -1;
          goal = {
            x: clamp(p.x - ay / dd * 90 * sign, 20, 364),
            y: clamp(p.y + ax / dd * 90 * sign, 20, 220)
          };
        }
      }
    }
    const direct = Math.hypot(goal.x - p.x, goal.y - p.y), nx = (goal.x - p.x) / (direct || 1), ny = (goal.y - p.y) / (direct || 1);
    let point = goal;
    if (blocked(s, p.x + nx * 14, p.y + ny * 14, focus ? 8 : footprint(p)) || direct > 24) {
      if (!memory.path || s.tick > memory.until || distance(goal, memory.goal || goal) > 20) {
        memory.path = route(s, p, goal, 8, !p.charge && dangerD < 80);
        memory.until = s.tick + 16;
        memory.goal = { x: goal.x, y: goal.y };
      }
      point = memory.path;
      if (blocked(s, p.x + nx * 6, p.y + ny * 6, footprint({ ...p, focus: false })))
        focus = true;
    }
    const dx = point.x - p.x, dy = point.y - p.y, d = Math.hypot(dx, dy), speed = clamp(d / 2, 0, 1);
    if (blocked(s, p.x + dx / (d || 1) * 8, p.y + dy / (d || 1) * 8, footprint({ ...p, focus: false })))
      focus = true;
    return {
      x: dx / (d || 1) * speed,
      y: dy / (d || 1) * speed,
      focus,
      ray: p.lastRay + (fire ? 1 : 0)
    };
  }

  // src/main.js
  async function boot(E = globalThis.My3D2dge) {
    const hub = globalThis.AIHub, info = hub ? await hub.connect({ mode: "shared-world", seats: [1, 2] }) : null;
    const app = {
      game: null,
      ui: null,
      garden: null,
      audio: null,
      world: null,
      display: null,
      mode: info ? "hub" : "solo",
      info,
      host: info ? info.isHost : true,
      local: info ? info.server ? -1 : info.players.findIndex((p) => p.id === info.me) : 0,
      net: null,
      peer: null,
      idle: 0,
      attract: false,
      demoPart: 0,
      demoClock: 0,
      finished: false,
      ended: false,
      hubStart: false,
      rayCounters: [0, 0],
      injected: new Map,
      pending: [],
      devOpen: false,
      inputGate: 0,
      serverTimer: null,
      names: info?.players?.map((p) => p.name) || [],
      lastPhase: null,
      lastStage: -1,
      bestSaved: false,
      peerStatus: "",
      peerInput: "",
      peerOutput: "",
      titleMenu: null,
      runMenu: null
    };
    app.isNetwork = () => app.mode === "hub" || app.mode === "peer";
    app.readOnly = () => app.mode === "hub" || app.mode === "peer" && !app.host;
    app.clearInput = () => {
      for (const I of app.game.players)
        I.clear();
      app.inputGate = 0.16;
      app.injected.clear();
    };
    const menu = {
      quit: info ? false : "title",
      settings: [
        { key: "music", value: 0.1 },
        { key: "glyphs", value: "playstation" },
        { key: "scale", value: "fill" },
        {
          key: "voice",
          label: "Garden chatter",
          group: "Sound",
          type: "slider",
          value: 0.7,
          apply: (g, v) => {
            g.audio.voiceVolume = v;
            g.audio.applyVolume();
          }
        }
      ],
      controls: {
        ray: "Horizontal ray",
        focus: "Hold Focus",
        steer: "Hold cursor steering"
      },
      items: () => app.mode === "hub" ? [
        ["Diagnostics", () => app.openDev()],
        ["About / Credits", () => openAbout()]
      ] : [
        [
          "Retry this encounter",
          () => {
            if (app.readOnly())
              return;
            retry(app.world);
            app.bestSaved = false;
            app.lastPhase = null;
            app.ui.hide();
            app.clearInput();
          }
        ],
        ["Developer tools", () => app.openDev()],
        ["About / Credits", () => openAbout()]
      ]
    };
    const game = new E.Game({
      canvas: "screen",
      headless: !!info?.server,
      loop: !info?.server,
      res: [480, 320],
      portrait: { res: [320, 540] },
      expand: true,
      view: "overhead",
      views: ["overhead"],
      input: ACTIONS,
      id: "killer-bee-yond-midnight-v1",
      bg: "#0c1922",
      fullscreen: "button",
      autoPause: !info,
      live: !!info,
      menu,
      camera: { zoom: false }
    });
    app.game = game;
    if (info?.server)
      game.input.pad = null;
    game.fadeTime = 0;
    game.cam.smooth = 0;
    game.lights.enabled = false;
    const ui = new E.Shell(game, {
      tv: true,
      theme: {
        ink: "#f5e9cb",
        paper: "#12232bf5",
        accent: "#eed195",
        muted: "#b9c7b8",
        line: "#68867c66",
        font: "system-ui, sans-serif",
        titleFont: "Georgia, serif"
      },
      screens: {
        pause: {
          kicker: identity_default.title,
          text: () => app.isNetwork() ? "The shared garden keeps moving while this menu is open." : `${STAGES[app.world?.stage || 0].name}
Goal: finish every gardener. A kill recharges one ray.`
        },
        help: {
          title: "Twelve bees. One big night.",
          sections: [
            [
              "Sting",
              "Fly over a clockwork gardener and stay with it. Break away too long and its shell recovers."
            ],
            [
              "Focus",
              "Hold Focus to squeeze through gaps and finish a sting faster. Release it to escape."
            ],
            [
              "Ray",
              "Fire left and right across your row. Only rival swarms are zapped. Every gardener kill recharges one empty ray."
            ],
            [
              "Survive",
              "Rivals grow from scouts to guards to hunters. Each contact costs individual bees. Clear a bed to return to twelve."
            ],
            [
              "Together",
              "Gold is player 1; mint is player 2. A fallen teammate watches until the next bed. Team score comes first."
            ]
          ]
        }
      }
    });
    app.ui = ui;
    app.garden = info?.server ? null : new Garden(E, game);
    app.audio = new GardenAudio(game, !!info?.server);
    installDev(app);
    app.applyPending = () => {
      const changes = app.pending.splice(0);
      for (const fn of changes)
        fn();
    };
    const preview = newWorld({ seed: 733 });
    preview.players = [];
    preview.targets = [];
    preview.queue = [];
    const botMemory = [{}, {}];
    function cleanShell() {
      ui.hide();
      app.closeDev();
      game.timeScale = 1;
      game.live = app.isNetwork();
      game.resume();
      app.clearInput();
    }
    function title() {
      if (app.mode === "hub")
        return;
      app.net?.stop();
      app.net = null;
      app.peer?.close(false);
      app.peer = null;
      app.mode = "solo";
      app.host = true;
      app.local = 0;
      app.finished = false;
      app.ended = false;
      app.attract = false;
      app.idle = 0;
      app.lastPhase = null;
      game.live = false;
      game.o.autoPause = true;
      game.o.menu.quit = "title";
      game.allowJoin(false);
      while (game.players.length > 1)
        game.removePlayer(game.players.at(-1));
      game.input.pad = "any";
      game.input.use(ACTIONS);
      cleanShell();
      app.audio.stop();
      app.audio.start();
      game.go("title");
    }
    function makeMenu(items, onPick, y = "center") {
      return new E.Menu(game, items, {
        scale: 2,
        rows: 5,
        x: "center",
        y,
        box: false,
        bg: "#152932",
        color: "#ced8c5",
        pick: "#f4d99b",
        onPick,
        onCancel: title
      });
    }
    function startRun(mode = "solo", players = 1, seed = 4117) {
      if (info)
        return;
      if (mode !== "peer") {
        app.net?.stop();
        app.net = null;
        app.peer?.close(false);
        app.peer = null;
      }
      app.mode = mode;
      app.host = true;
      app.local = 0;
      app.attract = false;
      app.finished = false;
      app.ended = false;
      app.bestSaved = false;
      app.lastPhase = null;
      app.lastStage = -1;
      app.rayCounters = [0, 0];
      app.world = newWorld({ players, seed });
      app.display = null;
      app.garden?.reset(app.world);
      app.audio.reset(app.world);
      game.live = app.isNetwork();
      game.o.autoPause = !app.isNetwork();
      cleanShell();
      game.go("run");
    }
    function couch() {
      game.allowJoin(false);
      let pads = [];
      try {
        pads = Array.from(navigator.getGamepads?.() || []).filter((p) => p?.connected);
      } catch {}
      while (game.players.length > 1)
        game.removePlayer(game.players.at(-1));
      game.input.use(ACTIONS);
      if (pads.length >= 2) {
        game.input.pad = pads[0].index;
        game.addPlayer({ pad: pads[1].index });
      } else if (pads.length === 1) {
        game.input.pad = null;
        game.addPlayer({ pad: pads[0].index });
      } else {
        game.input.pad = null;
        game.addPlayer({ keys: "right" });
      }
      game.allowJoin(false);
      startRun("couch", 2);
    }
    function coOp() {
      if (info)
        return;
      app.idle = 0;
      app.attract = false;
      app.titleMenu = makeMenu(["Couch co-op", "Direct peer co-op", "Back"], (i) => {
        if (i === 0)
          couch();
        else if (i === 1)
          peerMenu();
        else
          title();
      });
      game.allowJoin({
        max: 2,
        onJoin: () => {
          if (game.sceneName === "coop") {
            game.allowJoin(false);
            startRun("couch", 2);
          }
        }
      });
      cleanShell();
      game.go("coop");
    }
    function openAbout() {
      app.idle = 0;
      const chunks = Object.entries(interview_default.sourceInformation), pages = [chunks.slice(0, 5), chunks.slice(5, 10), chunks.slice(10)];
      ui.show("about", {
        kicker: "An original garden emergency",
        title: identity_default.title,
        text: `Inspired by Killer Bees! (1983), by Bob Harris.
Built on my-3D2dge v0.89.1 (MIT). Original game code, artwork, music and chatter generated for this build.`,
        actions: [
          ...pages.map((entries, i) => [
            `Source Information ${i + 1}/3`,
            () => ui.show("source", {
              title: `Source Information ${i + 1}/3`,
              sections: entries.map(([k, v]) => [k, v]),
              actions: [["Back", () => ui.back()]]
            })
          ]),
          ...["testingFeedback", "engineFeedback", "promptFeedback"].map((key, i) => [
            ["Testing Feedback", "Engine Feedback", "Prompt Feedback"][i],
            () => ui.show("feedback", {
              title: [
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback"
              ][i],
              sections: interview_default[key].map((answer, j) => [
                feedbackQuestions[key][j],
                answer
              ]),
              actions: [["Back", () => ui.back()]]
            })
          ]),
          ["Back", () => ui.back()]
        ]
      });
    }
    const feedbackQuestions = {
      testingFeedback: [
        "Issues found",
        "Critical / game breaking",
        "Most helpful test",
        "Least helpful test"
      ],
      engineFeedback: [
        "Liked most",
        "Got stuck or guessed wrong",
        "Built ourselves",
        "Hardest engine task",
        "Engine changes",
        "One requested change"
      ],
      promptFeedback: [
        "Liked most",
        "Confusing",
        "Hardest task",
        "Suggested change"
      ]
    };
    function peerMenu() {
      if (app.mode === "hub")
        return;
      game.allowJoin(false);
      app.peer?.close(false);
      app.peer = new DirectPeer({
        onOpen: (role) => openPeerWorld(role),
        onMessage: (m) => {
          if (m.t === "end") {
            app.finished = true;
            app.net?.stop();
            if (app.world) {
              app.world.phase = m.won ? "ending" : "failed";
              app.world.score = m.score;
              app.display = clone(app.world);
              app.lastPhase = null;
            }
            return;
          }
          app.net?.receive(m, app.host ? 1 : 0, game.real, app.world);
        },
        onClose: () => {
          if (app.mode === "peer" && !app.finished) {
            app.net?.stop();
            app.net = null;
            app.audio.stop();
            app.peerStatus = "Connection lost. The round stopped safely.";
            ui.show("disconnected", {
              title: "The garden lost a swarm",
              text: app.peerStatus,
              actions: [
                [
                  "Reconnect",
                  () => {
                    title();
                    peerMenu();
                  }
                ],
                ["Title", title]
              ]
            });
          }
        },
        onStatus: (text) => {
          app.peerStatus = text;
          const el = ui.root?.querySelector(".peer-status");
          if (el)
            el.textContent = text;
        }
      });
      app.peerInput = "";
      app.peerOutput = "";
      app.peerStatus = "Choose host or guest.";
      showPeer("choose");
    }
    function showPeer(screen) {
      const fail = (e) => {
        app.peerStatus = e.message || String(e);
        showPeer(screen);
      };
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(app.peerOutput);
          app.peerStatus = "Copied. Return the complete code to your partner.";
        } catch {
          const ta = ui.root?.querySelector("[data-peer=output]");
          ta?.focus();
          ta?.select();
          app.peerStatus = "Copy is restricted here. The code is selected; use your browser’s Copy command.";
        }
        const el = ui.root?.querySelector(".peer-status");
        if (el)
          el.textContent = app.peerStatus;
      };
      const paste = async () => {
        try {
          app.peerInput = await navigator.clipboard.readText();
          const ta = ui.root?.querySelector("[data-peer=input]");
          if (ta)
            ta.value = app.peerInput;
        } catch {
          const ta = ui.root?.querySelector("[data-peer=input]");
          ta?.focus();
          app.peerStatus = "Paste is restricted here. Paste directly into the code box.";
          const el = ui.root?.querySelector(".peer-status");
          if (el)
            el.textContent = app.peerStatus;
        }
      };
      const cancel = () => {
        app.peer?.close(false);
        app.peer = null;
        ui.hide();
        coOp();
      };
      const host = async () => {
        app.peerStatus = "Gathering local connection details…";
        showPeer("host");
        try {
          app.peerOutput = await app.peer.offer();
          showPeer("host");
        } catch (e) {
          fail(e);
        }
      };
      const answer = async () => {
        try {
          app.peerOutput = await app.peer.answer(app.peerInput);
          showPeer("guest-answer");
        } catch (e) {
          fail(e);
        }
      };
      const acts = screen === "choose" ? [
        ["Host a garden", host],
        ["Join a garden", () => showPeer("guest")],
        ["Cancel", cancel]
      ] : screen === "host" ? [
        ["Copy offer", copy],
        ["Paste answer", paste],
        [
          "Connect with answer",
          async () => {
            try {
              await app.peer.accept(app.peerInput);
            } catch (e) {
              fail(e);
            }
          }
        ],
        ["Make a new offer", host],
        ["Cancel", cancel]
      ] : screen === "guest" ? [
        ["Paste offer", paste],
        ["Make answer", answer],
        ["Cancel", cancel]
      ] : [
        ["Copy answer", copy],
        [
          "Start over",
          () => {
            app.peer?.close(false);
            peerMenu();
          }
        ],
        ["Cancel", cancel]
      ];
      ui.show("peer", {
        kicker: "Standalone / two players",
        title: screen === "choose" ? "A garden for two" : screen === "host" ? "1. Offer → 2. Answer" : screen === "guest" ? "Paste the host’s offer" : "Return this answer",
        text: screen === "choose" ? "Exchange connection codes with someone you already know. Both players share one garden." : screen === "host" ? "Send your offer to the guest. Paste their answer below, then Connect." : screen === "guest" ? "Paste the complete offer, then make an answer." : "Send this answer back to the host. Play begins automatically when the channel opens.",
        actions: acts,
        back: cancel
      });
      if (ui.root) {
        const box = ui.root.querySelector(".esh-mod"), buttons = box?.querySelector(".esh-btns");
        if (!box)
          return;
        const status = document.createElement("p");
        status.className = "peer-note peer-status";
        status.textContent = app.peerStatus;
        box.insertBefore(status, buttons);
        if (screen !== "choose") {
          if (app.peerOutput) {
            const ta = document.createElement("textarea");
            ta.dataset.peer = "output";
            ta.value = app.peerOutput;
            ta.readOnly = true;
            ta.setAttribute("aria-label", screen === "host" ? "Offer code" : "Answer code");
            ta.onfocus = () => ta.select();
            box.insertBefore(ta, buttons);
          }
          if (screen !== "guest-answer") {
            const ta = document.createElement("textarea");
            ta.dataset.peer = "input";
            ta.placeholder = screen === "host" ? "Paste the BEE1 answer code" : "Paste the BEE1 offer code";
            ta.value = app.peerInput;
            ta.maxLength = 65000;
            ta.setAttribute("aria-label", screen === "host" ? "Paste answer" : "Paste offer");
            ta.oninput = () => {
              app.peerInput = ta.value;
            };
            box.insertBefore(ta, buttons);
          }
        }
        const note = document.createElement("p");
        note.className = "peer-note";
        note.textContent = "Direct connection is verified between browsers on this machine. LAN connectivity depends on your network. No public matchmaking or TURN relay is provided; arbitrary Internet connections are not guaranteed.";
        box.append(note);
      }
    }
    function openPeerWorld(role) {
      app.mode = "peer";
      app.host = role === "host";
      app.local = app.host ? 0 : 1;
      app.finished = false;
      app.ended = false;
      app.rayCounters = [0, 0];
      app.world = newWorld({ players: 2, seed: 4117 });
      app.display = null;
      app.lastPhase = null;
      app.lastStage = -1;
      app.net = new Authority({
        host: app.host,
        local: app.local,
        send: (m) => app.peer?.send(m),
        onSnapshot: receiveSnapshot
      });
      game.live = true;
      game.o.autoPause = false;
      game.o.menu.quit = "title";
      app.garden?.reset(app.world);
      app.audio.reset(app.world);
      cleanShell();
      game.go("run");
    }
    function receiveSnapshot(packet) {
      const previous = app.world?.stage, phase = app.world?.phase;
      app.world = unpack(packet, app.world);
      if (!app.world)
        return;
      if (!app.display || previous !== app.world.stage || phase !== app.world.phase)
        app.display = clone(app.world);
      if (app.lastPhase === "failed" && app.world.phase === "play") {
        ui.hide();
        app.clearInput();
      }
    }
    function interpolate(dt, command) {
      const s = app.world;
      if (!app.display || app.display.stage !== s.stage) {
        app.display = clone(s);
        return app.display;
      }
      const display = app.display, oldPlayers = display.players, oldTargets = display.targets, oldRivals = display.rivals;
      Object.assign(display, clone(s));
      const smooth = (old, list, prediction = false) => list.map((p) => {
        const was = old.find((a) => a.id === p.id);
        if (!was || Math.hypot(was.x - p.x, was.y - p.y) > 70)
          return p;
        const out = { ...p }, rate = Math.min(1, dt * 16);
        if (prediction && p.id === app.local && p.bees && s.phase === "play") {
          const predicted = { ...was };
          moveCircle(s, predicted, command.x * s.tuning.speed * (command.focus ? s.tuning.focusMove : 1), command.y * s.tuning.speed * (command.focus ? s.tuning.focusMove : 1), dt, footprint(p));
          out.x = predicted.x + (p.x - predicted.x) * Math.min(1, dt * 6);
          out.y = predicted.y + (p.y - predicted.y) * Math.min(1, dt * 6);
        } else {
          out.x = was.x + (p.x - was.x) * rate;
          out.y = was.y + (p.y - was.y) * rate;
        }
        return out;
      });
      display.players = smooth(oldPlayers, display.players, true);
      display.targets = smooth(oldTargets, display.targets);
      display.rivals = smooth(oldRivals, display.rivals);
      return display;
    }
    function finishHub(won) {
      if (!info || !app.host || app.finished || app.ended)
        return;
      app.finished = true;
      const ids = info.players.filter((p, i) => app.world.players[i]?.joined).map((p) => p.id), scores = Object.fromEntries(ids.map((id) => [id, app.world.score]));
      hub.finish({ standings: ids.length ? [ids] : [], scores, won: !!won });
    }
    function saveBest() {
      if (app.attract || app.bestSaved || app.mode === "hub")
        return;
      app.bestSaved = true;
      const key = app.world.assisted ? "best:assisted" : "best:clean", old = E.store.get(key, 0);
      if (app.world.score > old)
        E.store.set(key, app.world.score);
    }
    function setPhaseUI() {
      const s = app.world;
      if (app.lastPhase === s.phase && app.lastStage === s.stage)
        return;
      const previous = app.lastPhase;
      app.lastPhase = s.phase;
      app.lastStage = s.stage;
      app.runMenu = null;
      app.clearInput();
      if (previous === "result" || previous === "failed")
        ui.hide();
      if (s.phase === "failed") {
        saveBest();
        if (app.mode === "hub") {
          finishHub(false);
          return;
        }
        if (app.mode === "peer" && !app.host)
          return;
        app.runMenu = makeMenu(["Retry encounter", "Restart campaign", "Title"], (i) => {
          if (i === 0) {
            retry(s);
            app.bestSaved = false;
            app.lastPhase = null;
            app.audio.reset(s);
            app.garden?.reset(s);
            app.clearInput();
          } else if (i === 1) {
            if (app.mode === "peer") {
              restartCampaign(s);
              app.bestSaved = false;
              app.lastPhase = null;
              app.garden?.reset(s);
              app.audio.reset(s);
              app.clearInput();
            } else
              startRun(app.mode, s.players.length);
          } else {
            if (app.mode === "peer")
              app.peer?.finish({ t: "end", won: false, score: s.score }).then(title);
            else
              title();
          }
        }, Math.round(game.H / 2 + 13));
      }
      if (s.phase === "ending") {
        saveBest();
        if (app.mode === "hub") {
          finishHub(true);
          return;
        }
        if (app.mode === "peer" && app.host) {
          app.finished = true;
          app.peer?.finish({ t: "end", won: true, score: s.score });
        }
        app.runMenu = makeMenu(["Play again", "Title"], (i) => {
          if (i !== 0) {
            title();
            return;
          }
          if (app.mode === "peer") {
            title();
            peerMenu();
          } else
            startRun(app.mode, s.players.length);
        }, Math.round(game.H / 2 + 34));
      }
    }
    function actionFor(id) {
      const p = app.world.players[id], I = app.mode === "couch" ? game.players[id] : game.input;
      if (!p)
        return { x: 0, y: 0, focus: false, ray: 0 };
      let c;
      if (app.injected.has(id))
        c = {
          ...app.injected.get(id),
          ray: app.injected.get(id).ray ?? p.lastRay
        };
      else if (!I || app.inputGate > 0 || game.paused)
        c = { x: 0, y: 0, focus: false, ray: app.rayCounters[id] || p.lastRay };
      else
        c = readAction(game, I, p, app.rayCounters[id] || 0);
      app.rayCounters[id] = c.ray;
      return c;
    }
    function runUpdate(dt) {
      if (app.ended || !app.world)
        return;
      const s = app.world;
      if (app.mode === "peer" && !app.net) {
        app.garden?.update(dt, app.display || s);
        return;
      }
      if (app.mode === "hub" && (!app.hubStart || hub.time() < 0)) {
        app.clearInput();
        app.garden?.update(dt, s);
        return;
      }
      app.inputGate = Math.max(0, app.inputGate - dt);
      app.applyPending();
      const local = app.isNetwork() ? app.local < 0 ? { x: 0, y: 0, focus: false, ray: 0 } : actionFor(app.local) : { x: 0, y: 0, focus: false, ray: 0 };
      if (app.isNetwork()) {
        if (app.host) {
          step(s, app.net.commands(s, local, game.real), dt);
          app.net.update(s, local, game.real);
        } else
          app.net.update(s, local, game.real);
      } else {
        step(s, s.players.map((p2) => actionFor(p2.id)), dt);
      }
      if (s.phase === "ending" && app.mode === "hub")
        finishHub(true);
      if (s.phase === "failed" && app.mode === "hub")
        finishHub(false);
      setPhaseUI();
      const shown = app.isNetwork() && !app.host ? interpolate(dt, local) : s;
      app.garden?.update(dt, shown);
      app.audio.update(s);
      const p = s.players[app.local] || s.players[0];
      game.input.touchSet("ray", "RAY", !!p?.bees && !!p?.charge && s.phase === "play");
      if (app.runMenu && app.inputGate <= 0 && !ui.screen)
        app.runMenu.update(dt);
    }
    function runDraw(r) {
      const s = app.display && !app.host ? app.display : app.world;
      if (!s)
        return;
      app.garden.draw(r, s, { prompt: prompt(game), names: app.names });
      if (app.mode === "hub" && (!app.hubStart || hub.time() < 0))
        message(r, "THE GARDEN IS READY", "Twelve tiny wings. One very big night.", `${hub.time() === -Infinity ? "WAITING FOR THE HUB" : Math.ceil(-hub.time() / 1000)}`);
      else if (s.phase === "result")
        message(r, s.result?.perfect ? "TWELVE OUT OF TWELVE!" : "BED PUT TO BED", `${s.result?.survivors || 0} bees home  •  +${s.result?.bonus || 0} survival bonus`, `Next bed in ${Math.max(1, Math.ceil(4 - s.phaseT))}`);
      else if (s.phase === "failed")
        message(r, "A BUZZ TOO FAR", `Team score ${s.score}  •  The last bee needs a breather.`, app.mode === "peer" && !app.host ? "HOST CHOOSES THE RETRY" : "");
      else if (s.phase === "ending") {
        message(r, "THE NIGHT IS YOURS", `The Bellwether sleeps. The moonflowers bloom.`, `TEAM ${s.score}  •  ${s.assisted ? "ASSISTED RUN" : "CLEAN RUN"}`);
        r.overlay((ctx) => {
          const portrait = app.garden.rect.portrait;
          for (const p of s.players)
            for (let i = 0;i < p.bees; i++) {
              const a = game.time * 0.6 + i * 2.399, rr = 8 + Math.sqrt(i) * 3, x = portrait ? r.W / 2 + (p.id ? 48 : -48) : p.id ? r.W - 29 : 29, y = portrait ? r.H / 2 - 116 : r.H / 2;
              app.garden.rigs.bee(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0.8 + a, 0.9, game.time + i, p.id ? { body: "#b9decf", light: "#effff0", dark: "#3a6460" } : {});
            }
        });
      }
      app.runMenu?.draw(r);
    }
    function message(r, titleText, body, footer) {
      const { px, font } = E;
      r.overlay((ctx) => {
        const w = Math.min(r.W - 28, 440), h = app.world?.phase === "ending" || app.world?.phase === "failed" ? 180 : 90, x = (r.W - w) / 2, y = r.H / 2 - h / 2;
        px.blend(ctx, 0.94, "normal", () => px.rect(ctx, x, y, w, h, "#10222b"));
        px.rect(ctx, x, y, w, 1, "#b4a475");
        px.rect(ctx, x, y + h, w, 1, "#52695e");
        font.title(ctx, titleText, r.W / 2, y + 14, {
          scale: r.W < 380 ? 2 : 3,
          align: "center",
          colors: ["#fff1c8", "#edc885", "#bf955e"],
          depth: 1
        });
        const lines = font.wrap(body, w - 24, { scale: 1 });
        font.text(ctx, lines.join(`
`), r.W / 2, y + 45, "#ced9bd", {
          align: "center",
          outline: false
        });
        font.text(ctx, footer, r.W / 2, y + 64, "#f0dca9", {
          align: "center",
          outline: false
        });
      });
    }
    const thisBee = (ctx, x, y, size, angle, time) => app.garden.rigs.bee(ctx, x, y, angle, size, time);
    function layoutTitleMenu() {
      const { W: W2, H: H2 } = game, portrait = H2 > W2 * 1.15, m = app.titleMenu;
      if (m) {
        m.x = portrait ? Math.round(W2 / 2 - 116) : Math.round(W2 * 0.29 - 116);
        m.y = portrait ? Math.round(H2 * 0.47) : Math.round(H2 * 0.55);
      }
    }
    function titleDraw(r, coop = false) {
      app.garden.draw(r, preview, { hud: false });
      const { px, font } = E, W2 = r.W, H2 = r.H, portrait = H2 > W2 * 1.15;
      r.overlay((ctx) => {
        px.blend(ctx, 0.92, "normal", () => px.rect(ctx, 0, 0, portrait ? W2 : W2 * 0.57, H2, "#0c1a24"));
        const x = portrait ? W2 / 2 : W2 * 0.29, top = portrait ? 44 : 26;
        font.text(ctx, coop ? "TWO SWARMS. SAME BIG NIGHT." : "A MOONLIT SWARM CAPER", x, top, "#b8c7ae", { align: "center", outline: false });
        font.title(ctx, "KILLER", x, top + 19, {
          scale: 3,
          align: "center",
          colors: ["#f9ebc4", "#d4b37e"],
          depth: 1
        });
        font.title(ctx, "BEE-YOND", x, top + 48, {
          scale: portrait ? 4 : 5,
          align: "center",
          colors: ["#fff3cc", "#e8c98b", "#c1975e"],
          depth: 2
        });
        font.title(ctx, "MIDNIGHT", x, top + 88, {
          scale: portrait ? 4 : 5,
          align: "center",
          colors: ["#d8ecdb", "#a8cabd", "#6f9b94"],
          depth: 2
        });
        const yy = portrait ? H2 - 64 : H2 - 31;
        font.text(ctx, coop ? "Couch: two pads, keyboard + pad, or shared keys." : "Tiny wings. Big night.", x, top + 135, "#c7d3b9", { align: "center", outline: false });
        font.text(ctx, `BEST ${String(E.store.get("best:clean", 0)).padStart(6, "0")}`, x, yy, "#c1b68d", { align: "center", outline: false });
        font.text(ctx, game.input.lastDevice === "gamepad" ? `${game.input.label("confirm")} SELECT   ${game.input.label("cancel")} BACK` : "ARROWS + ENTER   •   CLICK TO CHOOSE", x, yy + 13, "#879f9d", { align: "center", outline: false });
        if (!portrait) {
          const cx = W2 * 0.78, cy = H2 * 0.43;
          px.disc(ctx, cx, cy - 17, 62, "#223b41");
          px.disc(ctx, cx - 5, cy - 23, 56, "#b9c6a4");
          px.disc(ctx, cx + 12, cy - 31, 51, "#19333c");
          for (let i = 0;i < 7; i++) {
            const a = i * 2.399 + game.time * 0.14;
            const rr = 34 + i * 3;
            thisBee(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.63, 1.8, a + 0.8, game.time + i);
          }
          thisBee(ctx, cx, cy, -0.1 + 4.2, -0.45 + Math.sin(game.time * 0.6) * 0.12, game.time);
          font.text(ctx, "THE GARDEN CAN WAIT.", cx, H2 - 71, "#a5bbb1", {
            align: "center",
            outline: false
          });
          font.text(ctx, "THE GARDENERS CANNOT.", cx, H2 - 58, "#edcf96", {
            align: "center",
            outline: false
          });
        }
      });
      app.titleMenu?.draw(r);
    }
    function activity() {
      if (info)
        return;
      app.idle = 0;
      if (app.attract) {
        app.attract = false;
        app.world = null;
        app.inputGate = 0.2;
        game.input.clear();
        title();
      }
    }
    function startAttract() {
      if (info || ui.screen || app.peer)
        return;
      app.attract = true;
      app.demoPart = 0;
      app.demoClock = 0;
      app.rayCounters = [0, 0];
      app.world = newWorld({ players: 2, seed: 731, stage: 0 });
      app.world.dev.invulnerable = true;
      app.world.tuning.maturation = 0.5;
      app.garden.reset(app.world);
      app.audio.reset(app.world);
      app.lastPhase = null;
      game.go("attract");
    }
    function demoUpdate(dt) {
      if (!app.attract)
        return;
      if (game.input.anyPressed() || Math.hypot(...game.input.move()) > 0.23 || game.input.clicked()) {
        activity();
        return;
      }
      app.demoClock += dt;
      const s = app.world;
      step(s, s.players.map((p, i) => pilot(s, p, botMemory[i])), dt);
      if (app.demoClock > 22) {
        app.demoClock = 0;
        app.demoPart = (app.demoPart + 1) % 4;
        enterStage(s, [0, 2, 3, 5][app.demoPart]);
        s.dev.invulnerable = true;
      }
      app.garden.update(dt, s);
      app.audio.update(s, true);
    }
    const scenes = {
      title: {
        view: "overhead",
        pausable: false,
        camera: { zoom: false },
        touch: [],
        enter() {
          document.body.dataset.mode = "title";
          app.attract = false;
          app.idle = 0;
          app.titleMenu = makeMenu(["Play", "Co-op", "Settings", "About / Credits"], (i) => {
            if (i === 0)
              startRun();
            else if (i === 1)
              coOp();
            else if (i === 2)
              game.menu("settings");
            else
              openAbout();
          });
          app.clearInput();
        },
        update(dt) {
          preview.time += dt;
          app.garden?.fit();
          layoutTitleMenu();
          if (ui.screen) {
            app.idle = 0;
            return;
          }
          if (app.inputGate > 0) {
            app.inputGate -= dt;
            game.input.consumeAll();
            return;
          }
          if (game.input.anyPressed() || Math.hypot(...game.input.move()) > 0.23)
            app.idle = 0;
          else
            app.idle += dt;
          if (app.idle >= 10) {
            startAttract();
            return;
          }
          app.titleMenu?.update(dt);
        },
        draw: (r) => titleDraw(r)
      },
      coop: {
        view: "overhead",
        pausable: false,
        touch: [],
        enter() {
          document.body.dataset.mode = "title";
          app.clearInput();
        },
        update(dt) {
          preview.time += dt;
          app.garden.fit();
          layoutTitleMenu();
          if (ui.screen)
            return;
          if (app.inputGate > 0) {
            app.inputGate -= dt;
            game.input.consumeAll();
            return;
          }
          app.titleMenu?.update(dt);
        },
        draw: (r) => titleDraw(r, true),
        back() {
          title();
          return true;
        }
      },
      run: {
        view: "overhead",
        pausable: true,
        camera: { zoom: false },
        touch: ["ray"],
        enter() {
          document.body.dataset.mode = "play";
          game.input.steer = "drag";
          game.input.zones = [
            { x0: 0.56, y0: 0.12, x1: 1, y1: 0.84, act: "focus" }
          ];
          app.garden?.fit();
          app.clearInput();
        },
        exit() {
          game.input.zones = null;
          game.input.steer = "stick";
          game.timeScale = 1;
          app.audio.stop();
        },
        update: runUpdate,
        draw: runDraw,
        back() {
          game.pause("player");
          return true;
        }
      },
      attract: {
        view: "overhead",
        pausable: false,
        camera: { zoom: false },
        touch: [],
        enter() {
          document.body.dataset.mode = "play";
          app.clearInput();
        },
        update: demoUpdate,
        draw(r) {
          app.garden.draw(r, app.world, { demo: true });
        }
      }
    };
    if (info) {
      app.world = newWorld({ players: info.players.length, seed: info.seed });
      app.net = new Authority({
        host: app.host,
        local: app.local,
        send: (m, opts) => hub.send(m, app.host ? opts : { ...opts, to: info.host }),
        onSnapshot: receiveSnapshot
      });
      hub.on("message", (m, from) => {
        if (app.ended)
          return;
        const index = info.players.findIndex((p) => p.id === from);
        if (app.host) {
          app.net.receive(m, index, game.real, app.world);
        } else if (from === info.host)
          app.net.receive(m, 0, game.real, app.world);
      });
      hub.on("start", () => {
        app.hubStart = true;
        app.clearInput();
      });
      hub.on("leave", ({ id }) => {
        const index = info.players.findIndex((p) => p.id === id);
        if (app.host && index >= 0) {
          leave(app.world, index);
          app.net.neutralize(index);
        }
      });
      hub.on("time-up", () => finishHub(app.world.phase === "ending"));
      hub.on("end", () => {
        app.ended = true;
        app.net.stop();
        app.clearInput();
        app.audio.stop();
        game.audio._background(true);
        const context = game.audio.ctx;
        if (context)
          context.close().catch(() => {});
        game.audio.ctx = null;
        game.audio.failed = "The Hub round has ended";
        game.stop();
        if (app.serverTimer)
          clearInterval(app.serverTimer);
        app.serverTimer = null;
      });
      game.o.menu.quit = false;
      app.garden?.reset(app.world);
    }
    game.screen.listeners.push(() => layoutTitleMenu());
    game.hook("input", () => {
      app.garden?.fit();
      layoutTitleMenu();
      if (app.devOpen && ![
        "dev",
        "tuning",
        "encounter-tools",
        "playback",
        "snapshot",
        "diagnostics"
      ].includes(ui.screen))
        app.closeDev();
      if (app.ended)
        game.input.consumeAll();
      app.applyPending();
    });
    game.start({ scenes, scene: info ? "run" : "title", boot: false });
    if (info) {
      app.audio.start();
      hub.ready();
      if (info.server) {
        let last = performance.now();
        app.serverTimer = setInterval(() => {
          const now = performance.now(), elapsed = Math.min(0.25, (now - last) / 1000);
          last = now;
          if (!app.ended)
            game.advance(elapsed, { draw: false });
        }, 16);
      }
    } else
      app.audio.start();
    const listen = (target, name, fn, options = {}) => target.addEventListener(name, fn, {
      ...options,
      signal: game._abort?.signal
    });
    if (!info?.server) {
      for (const event of ["keydown", "pointerdown", "touchstart"])
        listen(window, event, () => activity(), { capture: true });
      listen(window, "pointermove", (e) => {
        if ((e.movementX || e.movementY) && e.pointerType !== "touch")
          activity();
      }, { capture: true });
      listen(window, "blur", () => {
        app.injected.clear();
      });
      listen(document, "visibilitychange", () => {
        if (document.hidden)
          app.injected.clear();
      });
    }
    game.debug = {
      snapshot: () => ({
        scene: game.sceneName,
        mode: app.mode,
        host: app.host,
        local: app.local,
        attract: app.attract,
        world: app.world ? clone(app.world) : null,
        network: app.net?.metrics || null,
        fit: app.garden?.rect,
        errors: game.errors
      })
    };
    const debug = {
      game,
      app,
      identity: identity_default,
      interview: interview_default,
      offlineVoice: async () => {
        const C = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
        const c = new C(1, 44100, 44100), gain = c.createGain();
        gain.connect(c.destination);
        syllable(c, gain, 0.02, 520, 0.12, 0.4);
        const buffer = await c.startRendering(), data = buffer.getChannelData(0);
        let peak = 0, energy = 0, tail = 0, finite = true;
        for (let i = 0;i < data.length; i++) {
          const v = data[i];
          if (!Number.isFinite(v))
            finite = false;
          peak = Math.max(peak, Math.abs(v));
          energy += v * v;
          if (i > 22050)
            tail += v * v;
        }
        return { peak, rms: Math.sqrt(energy / data.length), tail, finite };
      },
      snapshot: game.debug.snapshot,
      command: (id, c) => {
        if (app.mode === "hub" && id !== app.local)
          return false;
        app.injected.set(id, c);
        return true;
      },
      release: () => {
        app.injected.clear();
        app.clearInput();
      },
      start: (players = 1) => startRun(players === 2 ? "couch" : "solo", players),
      advance: (seconds, draw = true) => game.advance(seconds, { draw }),
      loadStage: (index) => {
        if (app.readOnly())
          return false;
        app.world.assisted = true;
        enterStage(app.world, index);
        app.lastPhase = null;
        app.garden?.reset(app.world);
        return true;
      },
      title,
      coOp,
      peerMenu,
      getPeer: () => app.peer,
      pack: () => pack(app.world),
      dispose: () => {
        app.ended = true;
        app.net?.stop();
        app.peer?.close(false);
        if (app.serverTimer)
          clearInterval(app.serverTimer);
        app.audio.stop();
        game.dispose();
      }
    };
    globalThis.__midnight = debug;
    globalThis.__game = { game, scenes };
    return debug;
  }
  if (typeof document !== "undefined")
    boot().catch((error) => {
      console.error(error);
      globalThis.My3D2dge?.showError?.("Starting the moonlit garden", error);
      globalThis.AIHub?.active && globalThis.AIHub.fail("Unable to start the garden.");
    });
})();
