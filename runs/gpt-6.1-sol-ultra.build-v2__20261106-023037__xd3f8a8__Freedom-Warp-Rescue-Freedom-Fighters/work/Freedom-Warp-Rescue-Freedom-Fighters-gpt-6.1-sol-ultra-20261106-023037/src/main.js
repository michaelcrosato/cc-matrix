/* Integrated shell, lifecycle, observability, saves and delivery boot. */
(() => {
  "use strict";
  const F = globalThis.FWR,
    E = globalThis.My3D2dge;
  let game, world, input, ui, view, sound, net, store;
  let mode = "boot",
    paused = false,
    idle = 0,
    attractTime = 0,
    attractSegment = 0,
    attractCycle = 0,
    lastSector = -1,
    terminalShown = false;
  let externalClock = false,
    advancing = false,
    lastError = null,
    overlay = { collision: false, ownership: false },
    simulationScale = 1;
  const injected = new Map(),
    errors = [];
  const copy = (x) => JSON.parse(JSON.stringify(x));
  function eligible() {
    return world && !world.attract && !world.debugModified && !net.active;
  }
  function currentSeats() {
    return input?.swapped ? [...input.seats].reverse() : input?.seats || ["local-1"];
  }
  function clear() {
    input?.clear();
    injected.clear();
    world?.clearControls();
  }
  function activity(family, event) {
    idle = 0;
    if (mode === "attract") {
      showTitle();
      return true;
    }
    // Pointer movement may exit attract but is not an audio unlock gesture.
    if (!event || event.type === "keydown" || event.type === "pointerdown") sound?.init();
    return false;
  }
  function showcase() {
    const w = new F.World(1982, { attract: true });
    w.enter(3);
    w.ship.x = 4750;
    w.ship.y = 340;
    w.camera.x = 5100;
    w.spawnContent();
    w.spawn({ type: "crystal", x: 4920, y: 470 });
    w.spawn({ type: "crystal", x: 5210, y: 245 });
    const layer = w.spawn({ type: "layer", x: 5050, y: 140, pattern: "ring", state: "active" });
    w.formation(layer);
    w.message = "";
    return w;
  }
  function showTitle() {
    if (net?.active) return;
    clear();
    sound?.stop();
    world = showcase();
    mode = "title";
    paused = false;
    idle = 0;
    terminalShown = false;
    simulationScale = 1;
    ui?.showTitle();
  }
  function start(kind = "operation", checkpoint = null, seed) {
    if (net.active) return;
    clear();
    sound.stop();
    const s =
      seed ??
      checkpoint?.seed ??
      (globalThis.crypto?.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : Date.now() >>> 0);
    world = new F.World(s, { mode: kind, checkpoint });
    world.setSeats(currentSeats());
    mode = "play";
    paused = false;
    terminalShown = false;
    lastSector = world.sector;
    ui.hide();
    simulationScale = 1;
    sound.pause(false);
    sound.applySettings(store.getSettings());
    if (eligible()) store.saveCheckpoint(world.checkpoint);
  }
  function togglePause() {
    if (mode !== "play" || world?.outcome || net?.ended) return;
    if (ui.screen) {
      ui.hide();
      paused = false;
      sound.pause(false);
      clear();
    } else {
      paused = !net.active;
      clear();
      ui.showPause();
      sound.pause(true);
    }
  }
  function devAction(action, value) {
    if (net.active || !world || mode !== "play") return;
    world.debugModified = true;
    if (action === "devReset") world.resetConfig();
    else if (action === "devSector") {
      const i = { opening: 0, sector1: 1, sector2: 2, finale: 3, extraction: 4 }[value] ?? 0;
      world.outcome = null;
      world.enter(i);
      lastSector = i;
    } else if (action === "devSeed") {
      start(world.mode, null, Number(value) >>> 0);
      world.debugModified = true;
      paused = true;
      ui.showPause();
      ui.showDev();
    } else if (action === "devRefill") world.ship.energy = 100;
    else if (action === "devSpawn") {
      const x = Math.min(world.length - 250, world.ship.x + 420),
        y = Math.max(120, Math.min(550, world.ship.y - 100));
      if (F.FORMATIONS.includes(value)) {
        const layer = world.spawn({ type: "layer", x, y, pattern: value });
        world.formation(layer, value);
      } else world.spawn({ type: value, x, y });
    } else if (action === "devStep") {
      world.step(Object.fromEntries(world.seats.map((id) => [id, F.neutral()])));
    } else if (action === "devInvulnerable") world.dev.invulnerable = !!value;
    else if (action === "devTimeScale")
      simulationScale = Math.max(0.1, Math.min(4, Number(value) || 1));
    else if (action === "devOverlay") overlay = { ...overlay, ...value };
  }
  function action(name, value) {
    if (name === "uiSound") {
      sound?.ui("activate");
      return;
    }
    if (name === "settingsChanged") {
      sound.applySettings(value);
      return;
    }
    if (name === "pause") {
      togglePause();
      return;
    }
    if (name === "resume") {
      paused = false;
      clear();
      sound.pause(false);
      return;
    }
    if (name === "join") {
      input.join();
      return;
    }
    if (name === "leave") {
      input.leave();
      return;
    }
    if (name === "swap") {
      input.swap();
      return;
    }
    if (name === "devOverlay") {
      overlay = { ...overlay, ...value };
      return;
    }
    if (name.startsWith("dev")) {
      devAction(name, value);
      return;
    }
    if (net.active) return;
    if (name === "play") start("operation");
    else if (name === "evasion") start("evasion");
    else if (name === "resumeCheckpoint") start(value?.mode || "operation", value);
    else if (name === "restart") start(world?.mode || "operation");
    else if (name === "retry") {
      clear();
      sound.stop();
      world.restoreCheckpoint();
      world.setSeats(currentSeats());
      paused = false;
      terminalShown = false;
      ui.hide();
      sound.pause(false);
    } else if (name === "title") showTitle();
  }
  function startAttract() {
    if (net.active) return;
    clear();
    ui.hide();
    ui.context = "title";
    mode = "attract";
    paused = false;
    attractTime = 0;
    attractSegment = 0;
    attractCycle++;
    world = new F.World(1982, { attract: true, runId: "attract-" + attractCycle });
    world.setSeats(["pilot", "navigator"]);
    world.message = "";
    sound.stop();
  }
  function attract(dt) {
    attractTime += dt;
    if (attractTime > 12 && attractSegment === 0) {
      world.enter(1);
      world.ship.x = 1850;
      world.spawnContent();
      attractSegment = 1;
    }
    if (attractTime > 29 && attractSegment === 1) {
      world.enter(3);
      world.ship.x = 4700;
      world.spawnContent();
      attractSegment = 2;
    }
    if (attractTime > 52 || world.outcome) {
      startAttract();
      return;
    }
    const a = F.botIntent(world);
    world.step({ pilot: { ...a, ax: 0, ay: 0, burst: false }, navigator: a }, dt);
  }
  function update(dt, force = false) {
    if (externalClock && !advancing && !force) return;
    const local = input.poll(dt);
    for (const [id, a] of injected) local[id] = a;
    ui.update(dt);
    if (net.active) {
      net.update(dt, ui.screen ? F.neutral() : local["local-1"] || F.neutral());
      world = net.world;
      if (net.ended) {
        mode = "ended";
        sound.stop();
        return;
      }
      if (net.started) mode = "play";
    } else if (mode === "title") {
      // Title assets animate in their own disposable context; the real demo starts at exactly ten seconds idle.
      world.time += dt;
      world.enemies(dt);
      if (ui.screen === "title") {
        idle += dt;
        if (idle >= 10 - 1e-8) startAttract();
      }
    } else if (mode === "attract") attract(dt);
    else if (mode === "play" && !paused && !ui.screen) {
      let remain = dt * simulationScale;
      while (remain > 1e-9) {
        const step = Math.min(F.STEP, remain);
        world.step(local, step);
        remain -= step;
        if (world.outcome) break;
      }
      if (world.sector !== lastSector) {
        lastSector = world.sector;
        if (eligible()) store.saveCheckpoint(world.checkpoint);
        clear();
      }
      if (world.outcome && !terminalShown) {
        terminalShown = true;
        paused = true;
        store.record(world.mode, world.score, eligible());
        if (world.outcome.won) {
          if (eligible()) store.clearCheckpoint();
          ui.showResults(world);
        } else ui.showFailure(world);
      }
    }
    if (mode !== "title" && mode !== "attract" && !net.ended) sound.update(world, dt);
    if (!net.active && paused) sound.pause(true);
    updateHud();
  }
  let hud, radio, prompts, demo;
  function createHud() {
    if (typeof document === "undefined") return;
    hud = document.createElement("div");
    hud.id = "flight-hud";
    hud.innerHTML =
      '<div class="hull-block"><small>HULL</small><b id="hull-pips"></b></div><div class="drive-block"><small>HYPERSPACE <b id="drive-state"></b></small><div class="energy-track"><i id="energy-fill"></i></div></div><div class="objective-block"><small id="sector-label"></small><b id="objective-text"></b></div><div class="score-block"><small>RESCUE SCORE</small><b id="score-value">0000</b><span id="chain-value"></span></div>';
    radio = document.createElement("div");
    radio.id = "radio";
    prompts = document.createElement("div");
    prompts.id = "flight-prompts";
    demo = document.createElement("div");
    demo.id = "attract-label";
    demo.innerHTML =
      "<b>FLIGHT RECORDING</b><span>Two drives. One rescue ship.</span><small>Any input returns to the flight deck</small>";
    document.body.append(hud, radio, prompts, demo);
  }
  let hudCache = "";
  function updateHud() {
    if (!hud || !world) return;
    const play = mode === "play" && !net.ended,
      at = mode === "attract";
    hud.hidden = !play;
    radio.hidden = !play || !!ui.screen || world.time > world.messageUntil;
    prompts.hidden = !play || !!ui.screen || input.family === "touch";
    demo.hidden = !at;
    if (!play) return;
    const s = world.ship,
      co = world.seats.length > 1;
    const str = [
      s.hull,
      s.energy.toFixed(0),
      s.drive,
      world.objective?.text,
      world.score,
      world.chain,
      input.family,
      ui.screen,
      world.message,
    ].join("|");
    if (str === hudCache) return;
    hudCache = str;
    document.getElementById("hull-pips").textContent =
      "◆ ".repeat(Math.max(0, s.hull)) + "◇ ".repeat(Math.max(0, world.config.maxHull - s.hull));
    document.getElementById("energy-fill").style.width = s.energy + "%";
    document.getElementById("drive-state").textContent =
      s.drive === "ready"
        ? s.energy >= world.config.warpCost
          ? "READY"
          : "CHARGING"
        : s.drive.toUpperCase();
    document.getElementById("sector-label").textContent =
      world.mode === "evasion"
        ? "EVASION · LASERS OFFLINE"
        : String(world.sector).padStart(2, "0") + " / " + F.CONTENT[world.sector].name;
    document.getElementById("objective-text").textContent = world.objective?.text || "";
    document.getElementById("score-value").textContent = String(Math.round(world.score)).padStart(
      4,
      "0",
    );
    document.getElementById("chain-value").textContent =
      world.chain > 1 ? "CHAIN " + world.chain + " · ×" + (1 + (world.chain - 1) * 0.25) : "";
    radio.textContent = world.message || "";
    prompts.textContent =
      input.label("move") +
      "  STEER     " +
      input.label("fire") +
      "  CANNON     " +
      input.label("warp") +
      "  HYPERSPACE" +
      (co ? "     PILOT + NAVIGATOR" : "");
  }
  async function boot() {
    net = new F.Net({
      createWorld: (seed, o) => new F.World(seed, o),
      onWorld: (w) => {
        world = w;
      },
      onReady: () => {
        mode = "waiting";
      },
      onStart: () => {
        mode = "play";
        ui?.hide();
        clear();
      },
      onEnd: () => {
        mode = "ended";
        clear();
        ui?.hide();
        sound?.stop();
        input?.dispose();
        game?.dispose();
      },
      onClearInput: () => clear(),
      onError: (error) => {
        lastError = String(error);
        errors.push(lastError);
      },
    });
    await net.connect();
    game = new E.Game({
      canvas: "screen",
      res: [600, 338],
      portrait: { res: [320, 338] },
      expand: true,
      view: "overhead",
      views: ["overhead"],
      input: "SHMUP",
      bg: "#040b16",
      menu: false,
      corner: false,
      fullscreen: false,
      backGesture: false,
      autoPause: false,
      live: net.active,
      id: net.active ? "fwr-session" : "freedom-warp-rescue",
    });
    store = new F.Store();
    sound = new F.Audio(E, game);
    view = new F.Presentation(E, game);
    if (!world) world = showcase();
    input = new F.Input(game, {
      getWorld: () => world,
      settings: () => store.getSettings(),
      isBlocked: () => !!ui?.screen || (mode !== "play" && mode !== "attract") || net.ended,
      isHub: () => net.active,
      screenToWorld: (x, y) => {
        const q = game.screen.clientToScreen(x, y);
        return q ? view.screenToWorld(q[0] - game.screen.ix, q[1] - game.screen.iy) : null;
      },
      onActivity: activity,
      onPause: togglePause,
      onSeatsChange: (ids) => {
        if (world && !net.active && mode === "play")
          world.setSeats(input?.swapped ? [...ids].reverse() : ids);
      },
      onJoin: (joined, text) => ui?.toast(joined ? "CO-PILOT ABOARD" : "FLIGHT DECK", text),
    });
    ui = new F.UI(E, game, {
      input,
      store,
      isHub: () => net.active,
      report: F.REPORT,
      getWorld: () => world,
      getConfig: () => world?.config || F.DEFAULTS,
      setConfig: (key, value) => {
        if (!net.active && mode === "play") world.setConfig(key, value);
      },
      getDevState: () => ({
        roles: world.seats.join(" / "),
        events: world.events,
        net: net.diagnostics(),
      }),
      onAction: action,
    });
    sound.applySettings(store.getSettings());
    game.reduceMotion = store.settings.reducedMotion;
    createHud();
    if (net.active) {
      mode = "waiting";
      ui.hide();
      ui.context = "play";
    } else showTitle();
    game.start({
      pausable: false,
      camera: { zoom: false },
      update: (dt) => update(dt),
      draw: (r) => {
        const shown = net.active && !net.isHost ? net.renderWorld() : world;
        view.draw(r, shown, {
          dt: 0,
          title: mode === "title",
          reducedMotion: store.settings.reducedMotion,
          ...overlay,
          navigatorPreview: world.seats.length > 1,
        });
      },
    });
    game.debug = F.debug = {
      identity: F.BUILD,
      snapshot: () => ({
        identity: F.BUILD,
        mode,
        screen: ui.screen,
        paused,
        attract: mode === "attract",
        idle,
        seed: world.seed,
        runId: world.runId,
        tick: world.tick,
        sector: world.sector,
        phase: world.phase,
        score: world.score,
        rescued: [...world.rescued],
        lost: [...world.lost],
        ship: copy(world.ship),
        outcome: copy(world.outcome),
        objective: copy(world.objective),
        entities: world.entities.length,
        counts: world.entities.reduce((a, e) => ((a[e.type] = (a[e.type] || 0) + 1), a), {}),
        roles: [...world.seats],
        config: copy(world.config),
        lastError,
        errors: errors.concat(game.errors.map((e) => e.message)),
        net: net.diagnostics(),
        settings: store.getSettings(),
        storage: store.available,
      }),
      world: () => world.snapshot(),
      inject: (seat, intent) => injected.set(seat || "local-1", F.normalizeIntent(intent)),
      release: (seat) => (seat ? injected.delete(seat) : injected.clear()),
      advance: (seconds) => {
        advancing = true;
        try {
          game.advance(Math.max(0, Math.min(600, Number(seconds) || 0)));
        } finally {
          advancing = false;
        }
        return F.debug.snapshot();
      },
      fixture: (name, data) => {
        if (net.active && !new URLSearchParams(location.search).has("harnessTest"))
          throw Error("Fixtures disabled in Hub rounds");
        return world.fixture(name, data);
      },
      action: (name, value) => action(name, value),
      get externalClock() {
        return externalClock;
      },
      set externalClock(v) {
        externalClock = !!v;
      },
      get net() {
        return net;
      },
      get input() {
        return input;
      },
      get ui() {
        return ui;
      },
      get game() {
        return game;
      },
      get audio() {
        return sound;
      },
      start: (kind, seed) => start(kind, null, seed),
      botIntent: () => F.botIntent(world),
      contentValidation: () => F.validateContent(),
    };
    globalThis.__game = game;
    globalThis.__FWR = F;
    document.body.dataset.build = F.BUILD;
    document.body.dataset.ready = "true";
    updateHud();
    if (store.warning && !net.active) ui.toast("SAVE STATUS", store.warning);
    addEventListener("blur", () => {
      if (mode === "play" && !net.active && !ui.screen) togglePause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && mode === "play" && !net.active && !ui.screen) togglePause();
    });
  }
  if (typeof document !== "undefined") {
    addEventListener("error", (e) => {
      lastError = e.message;
      errors.push(e.message);
    });
    addEventListener("unhandledrejection", (e) => {
      lastError = String(e.reason);
      errors.push(lastError);
    });
    boot().catch((e) => {
      lastError = String(e);
      errors.push(lastError);
      document.body.dataset.error = lastError;
      const pre = document.createElement("pre");
      pre.textContent = "Flight initialization failed: " + lastError;
      document.body.appendChild(pre);
      console.error(e);
    });
  }
})();
