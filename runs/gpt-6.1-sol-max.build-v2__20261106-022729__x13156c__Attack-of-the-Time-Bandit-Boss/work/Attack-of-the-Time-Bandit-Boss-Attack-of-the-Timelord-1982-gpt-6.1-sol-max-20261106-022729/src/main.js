import {
  TITLE,
  ARENA,
  DEFAULTS,
  TUNING,
  WAVES,
  BOSS_PHASES,
  WEAPONS,
} from "./content/campaign.js";
import {
  FIXED_DT,
  bound,
  createWorld,
  stepWorld,
  acceptAction,
  botAction,
  worldPacket,
  applyWorldPacket,
  spawnThreat,
  startEncounter,
  finishWorld,
  leaveWorld,
} from "./game/simulation.js";
import { Presentation } from "./presentation/renderer.js";
import {
  Soundtrack,
  codeTone,
  gibberish,
  renderAudioEvidence,
} from "./audio/sound.js";
import { HubTransport, RoomTransport } from "./network/transports.js";
const E = globalThis.My3D2dge;
const TEST_MODE = new URLSearchParams(location.search).has("test");
let world = null,
  transport = null,
  hosted = false,
  terminated = false,
  seq = 0,
  brakeEdge = 0,
  netInput = 0,
  netWorld = 0,
  latestPacket = null,
  previousPacket = null,
  packetAt = 0;
let lastHuman = 0,
  demo = false,
  demoClock = 0,
  demoStage = -1,
  scoreSaved = false,
  returnScreen = "title",
  onlineStatus = "",
  joinCode = "",
  devSpeed = 1,
  devAccumulator = 0,
  automation = null;
let pointerTarget = null,
  pointerAnchor = null,
  lastDevice = "keyboard",
  deviceStamp = 0,
  pausedBefore = false,
  pausedAt = 0,
  lastPrompt = "",
  displayState = null;
let creditsPage = 0;
const inputMap = {
  ...E.Input.SHMUP,
  fire: ["Space", "KeyZ", "KeyJ", "Mouse0", "Pad0", "Pad7"],
  bomb: ["ShiftLeft", "ShiftRight", "Mouse2", "Pad2", "Pad6"],
};
const ownSettings = [
  { key: "music", value: 0.1 },
  { key: "glyphs", value: "playstation" },
  {
    key: "voice",
    label: "Tyrant voice",
    group: "Sound",
    type: "slider",
    value: 0.8,
    apply: (g, v) => {
      g.audio.voiceVolume = v;
      g.audio.applyVolume();
    },
  },
  {
    key: "assistance",
    label: "Gentle timeline",
    group: "Game",
    value: false,
    help: "Auto fire, slower weapons and emergency brake.",
    apply: (g, v) => {
      if (!g.settings) return;
      for (const k of ["autoFire", "slowHostiles", "emergencyBrake"])
        if (g.settings.spec(k)) g.settings.set(k, v);
    },
  },
  { key: "autoFire", label: "Automatic fire", group: "Game", value: false },
  {
    key: "slowHostiles",
    label: "Slower hostile weapons",
    group: "Game",
    value: false,
  },
  {
    key: "emergencyBrake",
    label: "Emergency time brake",
    group: "Game",
    value: false,
  },
  ...TUNING.map(([key, label, min, max, step, unit]) => ({
    key: "dev_" + key,
    label,
    group: "Dev tuning",
    value: DEFAULTS[key],
    min,
    max,
    step,
    unit,
    persist: false,
    hidden: true,
    help: "Default " + DEFAULTS[key] + unit,
  })),
  ...[
    ["invulnerable", "Invulnerability"],
    ["hitboxes", "Hitboxes"],
    ["trajectories", "Target & trajectory overlays"],
    ["ai", "AI control"],
  ].map(([key, label]) => ({
    key: "dev_" + key,
    label,
    group: "Dev tools",
    value: false,
    persist: false,
    hidden: true,
  })),
];
const game = new E.Game({
  id: "time-bandit-boss-v1",
  canvas: "screen",
  res: [ARENA.w, ARENA.h],
  expand: false,
  view: "overhead",
  views: ["overhead"],
  input: inputMap,
  fullscreen: "button",
  autoPause: true,
  camera: false,
  menu: {
    quit: false,
    controls: { fire: "Fire cannon", bomb: "Time brake" },
    settings: ownSettings,
    items: () =>
      hosted
        ? []
        : [
            ["Dev Mode", openDev],
            ["How to play", showHelp],
            ["About / Credits", () => showCredits(0)],
            [
              "Leave run",
              () => {
                if (transport) leaveRoom();
                else title();
              },
            ],
          ],
  },
});
game.fadeTime = 0;
game.cam.smooth = 0;
game.lights.enabled = true;
game.lights.ambient = 0.77;
game.input.touchButtons([]);
game.input.steer = "drag";
const art = new Presentation(game),
  sound = new Soundtrack(game),
  arcade = new E.Arcade(game, {
    id: "time-bandit-boss",
    idle: 10,
    demo: 90,
    scores: 6,
  });
const ui = new E.Shell(game, {
  theme: {
    accent: "#f2cc87",
    ink: "#f5efdb",
    muted: "#a2b7c6",
    paper: "rgba(10,22,37,.96)",
    line: "#39516a",
    font: "system-ui, sans-serif",
    titleFont: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    scale: () =>
      Math.max(0.82, Math.min(2, innerHeight / 540, innerWidth / 820)),
  },
  screens: {
    pause: {
      title: () =>
        hosted
          ? "Local options"
          : game.pauseReason === "focus"
            ? "Focus lost"
            : game.pauseReason === "controller"
              ? "Controller disconnected"
              : "Timeline paused",
      text: () =>
        hosted
          ? "The shared timeline continues. Your machine is waiting for input."
          : game.pauseReason === "focus"
            ? "Your machine is safe. Resume when you are ready."
            : game.pauseReason === "controller"
              ? "Reconnect a controller, or continue with keyboard and mouse."
              : "Take a second. The universe can wait.",
    },
    help: false,
  },
});
const touchBrake = document.getElementById("touch-brake"),
  devicePrompt = document.getElementById("device-prompt"),
  touchNote = document.getElementById("touch-note");
function touchMode() {
  return (
    game.input.lastDevice === "touch" || matchMedia("(pointer:coarse)").matches
  );
}
function markModified() {
  if (world) world.modified = true;
}
function effectiveTuning() {
  return Object.fromEntries(
    Object.keys(DEFAULTS).map((k) => [
      k,
      game.settings.spec("dev_" + k) ? game.settings["dev_" + k] : DEFAULTS[k],
    ]),
  );
}
function currentAssists() {
  return {
    autoFire: !!game.settings.autoFire || touchMode(),
    slow: !!game.settings.slowHostiles,
    emergency: !!game.settings.emergencyBrake || touchMode(),
  };
}
const previousSettingsChange = game.settings.onChange;
game.settings.onChange = (key, value) => {
  if (previousSettingsChange) previousSettingsChange(key, value);
  if (key.startsWith("dev_") && world) {
    if (hosted || transport) {
      return;
    }
    markModified();
    if (key === "dev_invulnerable" && value)
      for (const p of world.players) p.inv = 10000;
    else if (key === "dev_invulnerable")
      for (const p of world.players) p.inv = 0;
    else world.tuning = effectiveTuning();
  }
  if (
    ["autoFire", "slowHostiles", "emergencyBrake", "assistance"].includes(
      key,
    ) &&
    world &&
    !transport
  ) {
    world.assists = currentAssists();
    if (Object.values(world.assists).some(Boolean)) world.assisted = true;
  }
};
function seedValue() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}
function consume() {
  game.input.clear();
  pointerTarget = null;
  pointerAnchor = game.input.pointer()?.slice() || null;
}
function activity(event) {
  if (terminated) return false;
  const type = event?.type || "gamepad";
  if (
    type === "pointermove" &&
    event.pointerType === "mouse" &&
    Math.hypot(event.movementX || 0, event.movementY || 0) < 2
  )
    return;
  lastHuman = game.real;
  arcade.wake();
  sound.unlock();
  if (demo) {
    demo = false;
    world = null;
    consume();
    title();
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    return true;
  }
  return false;
}
for (const type of ["keydown", "pointerdown", "pointermove", "touchstart"])
  addEventListener(type, (e) => activity(e), {
    capture: true,
    passive: false,
    signal: game._abort.signal,
  });
// Shell keeps native stack/focus navigation. Hover gets the same visible focus as a pad.
ui.root.addEventListener("pointerover", (e) => {
  const b = e.target.closest("button,input");
  if (b && !b.disabled) {
    b.focus({ preventScroll: true });
  }
});
ui.root.addEventListener("click", () => {
  lastHuman = game.real;
  sound.unlock();
  if (sound.enabled) game.audio.sfx("confirm", { vol: 0.4 });
});
ui.root.addEventListener("focusin", (e) => {
  if (e.target.matches("button,input") && sound.enabled)
    game.audio.sfx("select", { vol: 0.25 });
});
addEventListener(
  "blur",
  () => {
    consume();
    sound.pause();
    if (transport && world && !terminated) {
      sendIdle();
      ui.toast("Local input paused", "The shared timeline continues.");
    }
  },
  { signal: game._abort.signal },
);
addEventListener(
  "gamepaddisconnected",
  () => {
    consume();
    if (transport) sendIdle();
  },
  { signal: game._abort.signal },
);
addEventListener(
  "contextmenu",
  (e) => {
    if (e.target.id === "screen") e.preventDefault();
  },
  { signal: game._abort.signal },
);
touchBrake.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  brakeEdge++;
  lastHuman = game.real;
  sound.unlock();
});
function setPrompt() {
  const I = game.input,
    device = I.lastDevice;
  // Native polling ignores drift; meaningful controls alone change the prompt.
  if (device !== lastDevice) {
    lastDevice = device;
    deviceStamp = game.real;
  }
  const s =
    I.lastDevice === "gamepad"
      ? I.label("fire") + " FIRE · STICK MOVE"
      : I.lastDevice === "touch"
        ? "DRAG TO SLIDE · AUTO FIRE · TAP BRAKE WHEN READY"
        : "A D / ← → MOVE · " + I.label("fire") + " FIRE";
  if (s !== lastPrompt) {
    devicePrompt.textContent = s;
    lastPrompt = s;
  }
  devicePrompt.hidden =
    !!ui.screen || demo || terminated || !world || touchMode();
  touchNote.hidden =
    !touchMode() || !!ui.screen || demo || terminated || !world;
  touchNote.textContent = "DRAG TO SLIDE · AUTO FIRE · EMERGENCY BRAKE ASSIST";
  touchBrake.hidden =
    !touchMode() ||
    !!ui.screen ||
    demo ||
    terminated ||
    !world ||
    world.brake < 100 ||
    !!world.outcome;
  document.body.dataset.screen = ui.screen || world?.phase || "boot";
}
function setSessionSettingVisibility(active) {
  for (const key of [
    "assistance",
    "autoFire",
    "slowHostiles",
    "emergencyBrake",
  ])
    game.settings.spec(key).hidden = active;
}
function title() {
  if (hosted) return;
  setSessionSettingVisibility(false);
  terminated = false;
  demo = false;
  world = null;
  displayState = null;
  automation = null;
  devSpeed = 1;
  game.live = false;
  game.o.autoPause = true;
  game.resume();
  consume();
  art.reset();
  sound.reset();
  sound.music("title");
  ui.hide();
  game.go("title");
  showTitle();
  lastHuman = game.real;
  arcade.wake();
}
function showTitle() {
  ui.show("title", {
    name: TITLE,
    kicker: "A TEMPORAL ARCADE DEFENSE",
    subtitle: "Steal back your seconds.",
    text: "A tyrant. Four wicked weapons. One century worth saving.",
    actions: [
      ["Play campaign", playSetup],
      ["Online co-op", onlineMenu],
      ["How to play", showHelp],
      ["Settings", () => ui.show("settings")],
      ["About / Credits", () => showCredits(0)],
    ],
    meta: ["1–4 PILOTS", "8 WAVES + FINALE", "CODE. PIXELS. CHAOS."],
    footer:
      "INSPIRED BY ATTACK OF THE TIMELORD! (1982) · DEMO AFTER 10 IDLE SECONDS",
    back: () => {},
  });
}
function playSetup() {
  returnScreen = "title";
  ui.show("setup", {
    kicker: "YOUR CENTURY NEEDS YOU",
    title: "Choose your timeline",
    text: "Slide along the defense rail. Shoot the fleet and its weapons. Eight waves lead to the Bandit Boss.",
    actions: [
      { label: "Standard campaign", primary: true, fn: () => startSolo(false) },
      ["Gentle timeline", () => startSolo(true)],
      ["Local flight records", showScores],
      ["Back", () => ui.back()],
    ],
    sections: [
      [
        "STANDARD",
        "Three integrity pips. One shot at a time. Earn the shared time brake by intercepting weapons.",
      ],
      [
        "GENTLE TIMELINE",
        "Automatic fire, slower hostile weapons and automatic emergency brake. Records are marked assisted.",
      ],
    ],
  });
}
function startSolo(gentle = false) {
  if (hosted) return;
  transport?.close();
  transport = null;
  game.live = false;
  game.o.autoPause = true;
  if (gentle) {
    game.settings.set("assistance", true);
  }
  startRun(seedValue(), [{ id: 0, name: "PILOT 1" }], false);
}
function startRun(seed, seats, isNetwork) {
  setSessionSettingVisibility(isNetwork);
  terminated = false;
  demo = false;
  scoreSaved = false;
  seq = 0;
  brakeEdge = 0;
  netInput = 0;
  netWorld = 0;
  latestPacket = null;
  previousPacket = null;
  devAccumulator = 0;
  automation = null;
  consume();
  game.resume();
  ui.hide();
  art.reset();
  sound.reset();
  world = createWorld({
    seed,
    seats,
    tuning: isNetwork ? DEFAULTS : effectiveTuning(),
    assists: isNetwork ? {} : currentAssists(),
  });
  if (
    !isNetwork &&
    (devSpeed !== 1 ||
      ["invulnerable", "ai", "hitboxes", "trajectories"].some(
        (key) => game.settings["dev_" + key],
      ))
  )
    world.modified = true;
  world.assisted = Object.values(world.assists).some(Boolean);
  game.live = isNetwork;
  game.o.autoPause = !isNetwork;
  game.go("play");
  sound.music("combat");
}
function inputAction() {
  const I = game.input,
    m = I.move()[0];
  const pointer = I.pointer();
  if (Math.abs(m) > 0.08) {
    pointerTarget = null;
    pointerAnchor = pointer?.slice() || null;
  } else if (I.lastDevice === "touch") {
    const drag = I.drag();
    const p = world?.players.find((p) => p.id === (transport?.me ?? 0));
    if (drag && p) {
      pointerTarget = bound(
        (pointerTarget ?? p.x) + drag[0] * 1.4,
        ARENA.left,
        ARENA.right,
      );
    }
  } else if (pointer && I.lastDevice !== "gamepad") {
    const moved = pointerAnchor
      ? Math.hypot(pointer[0] - pointerAnchor[0], pointer[1] - pointerAnchor[1])
      : Infinity;
    if (moved > 7 || (I.down("fire") && I.lastDevice === "mouse")) {
      pointerTarget = bound(pointer[0], ARENA.left, ARENA.right);
      pointerAnchor = pointer.slice();
    }
  }
  if (I.pressed("bomb")) brakeEdge++;
  const blocked = !!ui.screen || game.paused || terminated;
  return {
    k: "a",
    n: ++seq,
    m: blocked ? 0 : m,
    x: blocked ? null : pointerTarget,
    f: !blocked && (I.down("fire") || touchMode()),
    b: brakeEdge,
  };
}
function sendIdle() {
  if (!transport || transport.me === null) return;
  const action = { k: "a", n: ++seq, m: 0, x: null, f: false, b: brakeEdge };
  if (transport.isHost && world) acceptAction(world, transport.me, action);
  else transport.sendAction(action);
}
function updatePlay(dt) {
  game.focus(320, 180, 0);
  if (terminated || !world) {
    setPrompt();
    return;
  }
  if (hosted && AIHub.time() < 0) {
    setPrompt();
    return;
  }
  const authority = !transport || transport.isHost;
  if (authority) {
    const action = automation
      ? automation(
          world,
          world.players.find((p) => p.id === (transport?.me ?? 0)),
        )
      : inputAction();
    if (transport?.me !== null) {
      if (automation) {
        if (action.brake) brakeEdge++;
        acceptAction(world, transport?.me ?? 0, {
          k: "a",
          n: ++seq,
          m: action.move,
          x: action.target,
          f: action.fire,
          b: brakeEdge,
        });
      } else acceptAction(world, transport?.me ?? 0, action);
    }
    const ai = !transport && game.settings.dev_ai;
    if (ai) {
      for (const p of world.players) {
        const a = botAction(world, p);
        if (a.brake) brakeEdge++;
        acceptAction(world, p.id, {
          k: "a",
          n: ++seq,
          m: a.move,
          x: a.target,
          f: a.fire,
          b: brakeEdge,
        });
      }
    }
    if (!transport && game.settings.dev_invulnerable)
      for (const p of world.players) p.inv = 9999;
    devAccumulator += dt * (transport ? 1 : devSpeed);
    while (devAccumulator >= FIXED_DT) {
      stepWorld(world, FIXED_DT);
      devAccumulator -= FIXED_DT;
    }
    if (transport) {
      netWorld += dt;
      if (netWorld >= 0.1) {
        netWorld %= 0.1;
        transport.sendWorld(worldPacket(world));
      }
    }
  } else {
    const action = inputAction();
    netInput += dt;
    if (netInput >= 1 / 12) {
      netInput %= 1 / 12;
      transport.sendAction(action);
    }
  }
  const fresh = art.ingest(world);
  sound.events(fresh);
  if (world.phase === "finale") sound.music("boss");
  else if (world.phase === "ending") sound.music("victory");
  else if (world.phase === "results")
    sound.music(world.outcome?.won ? "victory" : "failure");
  else sound.music(world.wave >= 4 ? "escalation" : "combat");
  if (world.outcome && hosted && transport.isHost) transport.finish(world);
  if (world.phase === "results" && !ui.screen && !hosted) showResults();
  setPrompt();
}
function drawWorld(r) {
  let state = world;
  if (transport && !transport.isHost && world && previousPacket) {
    const alpha = bound((performance.now() - packetAt) / 100, 0, 1);
    state = { ...world };
    for (const key of ["players", "enemies", "threats", "shots"])
      state[key] = world[key].map((p) => {
        const prev = previousPacket[key].find((o) => o.id === p.id);
        return prev
          ? {
              ...p,
              x: prev.x + (p.x - prev.x) * alpha,
              y: prev.y + (p.y - prev.y) * alpha,
            }
          : p;
      });
    // Local prediction is presentation only; host integrity, hits, score and phases stay authoritative.
    const local = state.players.find((p) => p.id === transport.me);
    if (local && !ui.screen && !terminated) {
      const m = game.input.move()[0];
      local.x = bound(
        local.x +
          m *
            DEFAULTS.playerSpeed *
            Math.min(0.1, (performance.now() - packetAt) / 1000),
        ARENA.left,
        ARENA.right,
      );
    }
  }
  displayState = state;
  art.draw(r, state, {
    hitboxes: !hosted && game.settings.dev_hitboxes,
    trajectories: !hosted && game.settings.dev_trajectories,
    brakeLabel: game.input.label("bomb"),
    network: transport
      ? (hosted ? "HUB · " : "ROOM · ") +
        world?.players.filter((p) => p.connected).length +
        " PILOTS"
      : "",
  });
}
function updateTitle(dt) {
  game.focus(320, 180);
  if (hosted || transport || ui.screen !== "title") return;
  if (game.real - lastHuman >= 10) {
    startAttract();
  }
}
function startAttract() {
  if (hosted || transport || demo) return;
  demo = true;
  demoClock = 0;
  demoStage = -1;
  ui.hide();
  consume();
  art.reset();
  world = createWorld({
    seed: 0xa771ac7,
    seats: [
      { id: 0, name: "DEMO" },
      { id: 1, name: "DEMO" },
    ],
    demo: true,
  });
  game.go("attract");
}
function updateAttract(dt) {
  if (!demo) return;
  game.focus(320, 180);
  demoClock += dt;
  const stage = Math.floor(demoClock / 15) % 6;
  if (stage !== demoStage) {
    demoStage = stage;
    const wave = [0, 1, 2, 3, 7, 8][stage];
    if (wave === 8) startEncounter(world, 8, 2);
    else startEncounter(world, wave);
    world.brake = 100;
    world.phaseTime = 4;
  }
  for (const p of world.players) {
    p.hp = 3;
    p.inv = 999;
    const a = botAction(world, p);
    if (a.brake || demoClock % 10 < dt) brakeEdge++;
    acceptAction(world, p.id, {
      k: "a",
      n: ++seq,
      m: a.move,
      x: a.target,
      f: true,
      b: brakeEdge,
    });
  }
  stepWorld(world, dt);
  if (world.outcome) {
    world.outcome = null;
    startEncounter(world, 7);
  }
  art.ingest(world);
  setPrompt();
}
function showHelp(page = 0) {
  const lessons = [
    [
      "Steal back your seconds",
      "Clear every fleet. Survive the Boss. Aim straight up: choose what to intercept, then move.",
    ],
    [
      "Four ways to get in trouble",
      "White darts fall. Red orbs steer toward you. Green crosses land and sweep their marked segment: shoot them in the air or escape the sweep. Diamonds mark a predicted destination, then commit.",
    ],
    [
      "Make time. Keep your machine.",
      "Intercept weapons to charge a 1.6-second slowdown. Your machine and shots keep full speed. A hit costs one integrity pip, clears nearby danger and grants a visible recovery shield. Clear a wave to recover a pip.",
    ],
    [
      "Share a century",
      "One to four pilots share a score and brake. Teammates can overlap safely. Disabled machines reboot on a wave clear. Touch: drag horizontally; automatic fire and emergency brake are enabled.",
    ],
  ];
  ui.show("help", {
    kicker: "FLIGHT SCHOOL · " + (page + 1) + " / " + lessons.length,
    title: lessons[page][0],
    text: lessons[page][1],
    sections: [],
    keys:
      page === 0
        ? [
            [
              game.input.lastDevice === "gamepad"
                ? "STICK / D-PAD"
                : game.input.label("left") + " / " + game.input.label("right"),
              "Slide along the rail",
            ],
            [game.input.label("fire"), "Hold to fire one fast shot at a time"],
            [game.input.label("bomb"), "Spend a full shared time-brake meter"],
            ["OPTIONS / ESC", "Pause, settings and developer tools"],
          ]
        : undefined,
    actions: [
      ["Next page", () => showHelp((page + 1) % lessons.length)],
      [
        "Previous page",
        () => showHelp((page + lessons.length - 1) % lessons.length),
      ],
      ["Back", () => ui.back()],
    ],
  });
  ui.root.querySelector(".esh-mod")?.classList.add("paged-panel");
}
function onlineMenu() {
  if (hosted) return;
  ui.show("online", {
    kicker: "ONE TIMELINE. UP TO FOUR PILOTS.",
    title: "Online co-op",
    text: "Create a room, or join using its eight-character code. The host runs the campaign. Public signaling finds the room; browsers share the world over WebRTC.",
    actions: [
      ["Create room", () => connectRoom(true)],
      ["Join room", () => showJoin()],
      ["Back", () => ui.back()],
    ],
    sections: [
      [
        "CONNECTIONS",
        "Some firewalls and NATs block direct links. A failed connection always has a route back to solo. No account or server credentials needed.",
      ],
    ],
  });
}
function showJoin() {
  ui.show("join", {
    kicker: "EIGHT-CHARACTER ROOM CODE",
    title: "Join a timeline",
    text: "Type or paste a code, or use the character wheel below.",
    actions: [
      ["Connect", () => connectRoom(false, joinCode)],
      [
        "Edit with controller",
        () =>
          characterPicker(
            "Room code",
            joinCode,
            8,
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
            (value) => {
              joinCode = value;
              showJoin();
            },
          ),
      ],
      ["Back", () => ui.back()],
    ],
  });
  const box = ui.root.querySelector(".esh-mod"),
    input = document.createElement("input");
  input.type = "text";
  input.className = "room-code";
  input.maxLength = 8;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.value = joinCode;
  input.placeholder = "ABCD2345";
  input.setAttribute("aria-label", "Room code");
  input.addEventListener("input", () => {
    joinCode = input.value
      .toUpperCase()
      .replace(/[^A-Z2-9]/g, "")
      .slice(0, 8);
    input.value = joinCode;
    lastHuman = game.real;
  });
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") connectRoom(false, joinCode);
    if (e.key === "Escape") ui.back();
  });
  box.querySelector("p").after(input);
}
function characterPicker(label, initial, length, alphabet, done) {
  let selectedCharacter = 0;
  const letters = Array.from({ length }, (_, i) =>
    Math.max(0, alphabet.indexOf(initial[i] || alphabet[0])),
  );
  const redraw = () => {
    ui.show("picker", {
      kicker: "UP / DOWN SELECT · LEFT / RIGHT CHANGE",
      title: label,
      text: letters.map((n) => alphabet[n]).join(" "),
      actions: letters
        .map((n, i) => ({
          label: "Character " + (i + 1) + "  ‹ " + alphabet[n] + " ›",
          fn: () => {
            selectedCharacter = i;
            letters[i] = (letters[i] + 1) % alphabet.length;
            redraw();
          },
        }))
        .concat([
          [
            "Keep " + letters.map((n) => alphabet[n]).join(""),
            () => {
              const v = letters.map((n) => alphabet[n]).join("");
              ui.back();
              done(v);
            },
          ],
          ["Back", () => ui.back()],
        ]),
    });
    const buttons = [...ui.root.querySelectorAll(".esh-btns button")];
    buttons.slice(0, length).forEach((b, i) => {
      b._cycle = (d) => {
        selectedCharacter = i;
        letters[i] = (letters[i] + d + alphabet.length) % alphabet.length;
        redraw();
      };
    });
    buttons[selectedCharacter]?.focus({ preventScroll: true });
  };
  redraw();
}
function makeHooks() {
  return {
    action: (id, a) => {
      if (world && transport?.isHost && !terminated) acceptAction(world, id, a);
    },
    world: (p) => {
      if (terminated || transport?.isHost) return;
      const next = applyWorldPacket(world, p, transport.roster);
      if (next) {
        previousPacket = world;
        world = next;
        latestPacket = p;
        packetAt = performance.now();
      }
    },
    leave: (id) => {
      if (world && transport?.isHost) leaveWorld(world, id);
    },
    timeUp: () => {
      if (world && !world.outcome) finishWorld(world, false, "time-limit");
      transport?.finish(world);
    },
    end: (reason) => {
      terminated = true;
      consume();
      sound.end();
      if (hosted) {
        world && (world.phase = "terminated");
        game.stop();
      } else {
        ui.hide();
        ui.show("disconnected", {
          title: "Timeline disconnected",
          text: reason,
          actions: [
            [
              "Return to solo",
              () => {
                leaveRoom();
              },
            ],
            [
              "Online menu",
              () => {
                leaveRoom();
                onlineMenu();
              },
            ],
          ],
        });
      }
    },
    status: (text) => {
      onlineStatus = text;
      if (ui.screen === "room") roomScreen();
    },
    roster: () => {
      if (ui.screen === "room") roomScreen();
    },
    begin: (seed) => {
      startRun(seed, transport.roster, true);
    },
    lobby: () => {
      world = null;
      game.live = false;
      game.resume();
      ui.hide();
      roomScreen();
    },
  };
}
async function connectRoom(create, code) {
  if (hosted) return;
  transport?.close();
  transport = new RoomTransport(makeHooks());
  onlineStatus = create
    ? "Opening signaling connection…"
    : "Connecting to the room…";
  roomScreen();
  try {
    if (create) await transport.create();
    else await transport.join(code);
    roomScreen();
  } catch (error) {
    if (transport?.closed) return;
    onlineStatus = error.message;
    roomScreen();
  }
}
function roomScreen() {
  if (hosted || !transport) return;
  const room = transport;
  ui.show("room", {
    kicker: room.isHost ? "HOSTED TIMELINE" : "SHARED TIMELINE",
    title: room.code ? room.code.match(/.{1,4}/g).join(" ") : "Connecting",
    text: onlineStatus,
    sections: [
      [
        "PILOTS",
        room.roster.length
          ? room.roster
              .map(
                (p) =>
                  "P" +
                  (p.id + 1) +
                  " · " +
                  p.name +
                  " · " +
                  (p.ready ? "READY" : "WAITING"),
              )
              .join("\n")
          : "Waiting for the signaling service…",
      ],
    ],
    actions: [
      ...(room.isHost
        ? [
            {
              label: "Start campaign",
              primary: true,
              disabled: !room.peer?.open || !room.roster.every((p) => p.ready),
              fn: () => room.start(seedValue()),
            },
            ["Copy room code", () => copyCode(room.code)],
          ]
        : [
            {
              label: "Ready / Not ready",
              disabled: room.me === null,
              fn: () => room.ready(),
            },
          ]),
      ["Retry connection", () => connectRoom(room.isHost, room.code)],
      ["Leave room / Solo", leaveRoom],
    ],
    back: leaveRoom,
  });
}
async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    onlineStatus = "CODE COPIED · " + code;
  } catch {
    onlineStatus =
      "COPY UNAVAILABLE · Select the code below, or read it aloud: " + code;
  }
  roomScreen();
  const box = ui.root.querySelector(".esh-mod"),
    field = document.createElement("input");
  field.className = "room-code";
  field.readOnly = true;
  field.value = code;
  field.setAttribute("aria-label", "Shareable room code");
  box.querySelector("p").after(field);
  field.focus();
  field.select();
}
function leaveRoom() {
  if (hosted) return;
  transport?.close();
  transport = null;
  terminated = false;
  world = null;
  title();
}
function showResults() {
  const w = world;
  if (!w) return;
  consume();
  ui.show("results", {
    kicker: w.outcome?.won
      ? "THE RIFT IS SEALED"
      : "A CENTURY WORTH ANOTHER TRY",
    title: w.outcome?.won ? "Time well stolen." : "Out of seconds.",
    text: w.outcome?.won
      ? "The Boss sends a strongly worded letter to yesterday. Your century declines to reply."
      : "Your last machine has gone quiet. The Boss is insufferable. You can fix that.",
    stats: [
      [String(w.score).padStart(6, "0"), "TEAM SCORE"],
      [w.stats.intercepts, "INTERCEPTIONS"],
      [w.stats.ships, "HULLS BROKEN"],
      [w.stats.brakes, "TIME BRAKES"],
    ],
    sections: [
      [
        "FLIGHT RECORD",
        Math.floor(w.time / 60) +
          ":" +
          String(Math.floor(w.time % 60)).padStart(2, "0") +
          " · " +
          w.stats.hits +
          " hits · " +
          w.stats.bonus +
          " wave bonus · " +
          (w.modified
            ? "DEV / MODIFIED — no record"
            : w.assisted || Object.values(w.assists || {}).some(Boolean)
              ? "ASSISTED RECORD"
              : w.players.length > 1
                ? "CO-OP RECORD"
                : "STANDARD SOLO RECORD"),
      ],
    ],
    actions: transport
      ? [
          ...(transport.isHost
            ? [["Return to room / Replay", () => transport.lobby()]]
            : []),
          ["Save six-letter co-op record", saveRecord],
          ["High scores", showScores],
          ["Leave room", leaveRoom],
        ]
      : [
          [
            "Retry campaign",
            () => {
              startRun(seedValue(), [{ id: 0, name: "PILOT 1" }], false);
            },
          ],
          ["Save six-letter record", saveRecord],
          ["High scores", showScores],
          [
            "Reset tuning & retry",
            () => {
              resetTuning();
              startSolo(false);
            },
          ],
          ["Title", title],
        ],
  });
}
function recordMode() {
  return world.modified
    ? "modified"
    : world.assisted || Object.values(world.assists || {}).some(Boolean)
      ? "assisted"
      : world.players.length > 1
        ? "coop"
        : "solo";
}
function getRecords() {
  const value = E.store.get("tbb:records:v1", []);
  return Array.isArray(value)
    ? value
        .filter(
          (r) =>
            r &&
            typeof r.name === "string" &&
            r.name.length === 6 &&
            Number.isFinite(r.score),
        )
        .slice(0, 30)
    : [];
}
function saveRecord() {
  if (!world || world.modified || world.demo || scoreSaved || hosted) {
    ui.toast(
      "Record unavailable",
      scoreSaved
        ? "This record is already saved."
        : "Developer and demonstration runs do not enter the table.",
    );
    return;
  }
  characterPicker(
    "Your six-letter callsign",
    "PILOTX",
    6,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    (name) => {
      const rows = getRecords();
      rows.push({ name, score: world.score, mode: recordMode() });
      rows.sort((a, b) => b.score - a.score);
      E.store.set("tbb:records:v1", rows.slice(0, 30));
      scoreSaved = true;
      ui.toast("Record saved", name + " · " + world.score);
      showScores();
    },
  );
}
function showScores() {
  const rows = getRecords();
  ui.show("records", {
    kicker: "LOCAL FLIGHT RECORDS",
    title: "Seconds to remember",
    text: rows.length
      ? rows
          .slice(0, 12)
          .map(
            (r, i) =>
              String(i + 1).padStart(2, "0") +
              "  " +
              r.name +
              "  " +
              String(r.score).padStart(6, "0") +
              "  " +
              r.mode.toUpperCase(),
          )
          .join("\n")
      : "No records yet. Your century is waiting.",
    actions: [["Back", () => ui.back()]],
  });
}
function resetTuning() {
  game.settings.reset("Dev tuning");
  game.settings.reset("Dev tools");
  devSpeed = 1;
  if (world) world.tuning = effectiveTuning();
}
function openDev() {
  if (transport || hosted) {
    ui.show("inspect", {
      kicker: "SHARED WORLD",
      title: "Session inspection",
      text: () =>
        JSON.stringify({
          seed: world?.seed,
          tick: world?.tick,
          phase: world?.phase,
          score: world?.score,
        }),
      actions: [["Back", () => ui.back()]],
    });
    return;
  }
  if (world && !game.paused) game.pause("player");
  markModified();
  ui.show("dev", {
    kicker: "RUN MARKED MODIFIED · SESSION ONLY",
    title: "Dev Mode",
    text: () =>
      `Seed ${world?.seed} · tick ${world?.tick} · ${world?.phase} · ${world?.enemies.length || 0} hulls · ${world?.threats.length || 0} threats`,
    rows: ["dev_invulnerable", "dev_hitboxes", "dev_trajectories", "dev_ai"],
    actions: [
      ["Jump to encounter", devJumpMenu],
      [
        "Restart encounter",
        () => {
          if (world)
            startEncounter(
              world,
              world.wave,
              world.wave === 8 ? world.bossPhase : null,
            );
          ui.back();
        },
      ],
      [
        "Step one tick",
        () => {
          if (world) stepWorld(world, FIXED_DT);
          art.ingest(world);
          openDev();
        },
      ],
      [
        "Simulation speed: " + devSpeed + "×",
        () => {
          devSpeed = devSpeed === 1 ? 0.5 : devSpeed === 0.5 ? 2 : 1;
          openDev();
        },
      ],
      [
        "Refill integrity & brake",
        () => {
          for (const p of world.players) {
            p.hp = 3;
            p.inv = 2;
          }
          world.brake = 100;
          ui.toast("Restored", "Three pips. Full charge.");
        },
      ],
      ["Spawn a threat", devSpawnMenu],
      [
        "Live tuning sliders",
        () =>
          ui.show("tuning", {
            title: "Balance the timeline",
            kicker: "LIVE VALUES · DEFAULTS SHOWN BELOW EACH SLIDER",
            rows: TUNING.map(([k]) => "dev_" + k),
            actions: [
              [
                "Reset tuning to defaults",
                () => {
                  resetTuning();
                  ui.show("tuning");
                },
              ],
              ["Back", () => ui.back()],
            ],
          }),
      ],
      [
        "Reset all developer defaults",
        () => {
          resetTuning();
          openDev();
        },
      ],
      [
        "Return to play",
        () => {
          ui.hide();
          game.resume();
          consume();
        },
      ],
    ],
  });
}
function devJumpMenu() {
  ui.show("jump", {
    title: "Choose an encounter",
    actions: [
      ...WAVES.map((w, i) => [
        String(i + 1).padStart(2, "0") + " · " + w.name,
        () => {
          startEncounter(world, i);
          world.outcome = null;
          ui.hide();
          game.resume();
        },
      ]),
      ...BOSS_PHASES.map((b, i) => [
        "Boss " + (i + 1) + " · " + b.name,
        () => {
          world.outcome = null;
          startEncounter(world, 8, i);
          ui.hide();
          game.resume();
        },
      ]),
      ["Back", () => ui.back()],
    ],
  });
}
function devSpawnMenu() {
  ui.show("spawn", {
    title: "Spawn a weapon",
    actions: Object.entries(WEAPONS)
      .map(([k, v]) => [
        v.name,
        () => {
          spawnThreat(world, k, { x: world.players[0].x, y: 160 });
          ui.hide();
          game.resume();
        },
      ])
      .concat([["Back", () => ui.back()]]),
  });
}
function showCredits(page = 0) {
  creditsPage = page;
  const info = BUILD_INFO;
  const rawPages = [
    [
      "About / Credits",
      [
        [
          "AN ORIGINAL TEMPORAL ARCADE",
          "Design, procedural art, original music, sound and gibberish voice by OpenAI gpt-6.1-sol, built for Michael Crosato. Based on Attack of the Timelord! (Odyssey², 1982). New campaign, time brake and simultaneous co-op are adaptation choices.",
        ],
        [
          "CREDITS & LICENSES",
          "my-3D2dge v0.89.1 · Michael Crosato · MIT. AI Hub session client 1.4.0, unmodified; repository license unknown. PeerJS 1.5.5 · PeerJS contributors · MIT. No audio files, borrowed game art, browser TTS or television franchise lore.",
        ],
        [
          "RESEARCH",
          "North American manual, William Cassidy’s hands-on review, gameplay still and box illustration at odyssey2.info were inspected. No gameplay video was viewed. Original steering equations, timings and continuous musical score are unknown.",
        ],
      ],
    ],
    [
      "Source Information",
      Object.entries(info.sourceInformation).map(([k, v]) => [
        k.replace(/([A-Z])/g, " $1").toUpperCase(),
        v,
      ]),
    ],
    [
      "Testing Feedback",
      info.testingFeedback.map((v, i) => [
        [
          "ISSUES CAUGHT",
          "CRITICAL ISSUES",
          "MOST HELPFUL TEST",
          "LEAST HELPFUL TEST",
        ][i],
        v,
      ]),
    ],
    [
      "Engine Feedback",
      info.engineFeedback.map((v, i) => [
        [
          "LIKED MOST",
          "STUCK / WRONG GUESSES",
          "BUILT OURSELVES",
          "HARDEST PART",
          "ENGINE CHANGES",
          "ONE SUGGESTION",
        ][i],
        v,
      ]),
    ],
    [
      "Prompt Feedback",
      info.promptFeedback.map((v, i) => [
        ["LIKED MOST", "CONFUSING", "HARDEST TASK", "SUGGESTED CHANGE"][i],
        v,
      ]),
    ],
    [
      "Source & dependency links",
      [
        [
          "MANUAL",
          "https://odyssey2.info/library/manuals/us_timelord/Attack%20of%20the%20Timelord%20(USA).pdf",
        ],
        ["REVIEW", "https://odyssey2.info/reviews/attack-of-the-timelord-6"],
        ["ENGINE", "https://github.com/michaelcrosato/my-3d2dge"],
        [
          "AI HUB",
          "https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub",
        ],
        ["PEERJS", "https://peerjs.com/client/getting-started"],
        [
          "ONLINE LIMITS",
          "Public signaling and direct WebRTC links depend on network availability. Some NAT configurations require TURN. Automated signal checks cannot establish subjective audio quality. Physical pads and iOS hardware are unavailable here.",
        ],
      ],
    ],
  ];
  const pages = rawPages.flatMap(([heading, sections]) => {
    const count =
      heading === "Source Information"
        ? 2
        : heading === "About / Credits"
          ? 1
          : 2;
    const out = [];
    for (let i = 0; i < sections.length; i += count)
      out.push([heading, sections.slice(i, i + count)]);
    return out;
  });
  page = ((page % pages.length) + pages.length) % pages.length;
  const [heading, sections] = pages[page];
  ui.show("credits", {
    kicker: "ABOUT · " + (page + 1) + " / " + pages.length,
    title: heading,
    sections,
    actions: [
      ["Next page", () => showCredits((page + 1) % pages.length)],
      [
        "Previous page",
        () => showCredits((page + pages.length - 1) % pages.length),
      ],
      ["Back", () => ui.back()],
    ],
  });
  ui.root.querySelector(".esh-mod")?.classList.add("paged-panel");
}
// Called before shell input suppression, including while paused.
game.hook("input", (dt) => {
  const I = game.input;
  if (terminated) {
    I.consumeAll();
    return;
  }
  if (I.anyPressed() || Math.hypot(...I.padMove) > 0.2) {
    if (demo) {
      activity();
      I.consumeAll();
      return;
    }
    lastHuman = game.real;
    arcade.wake();
    if (I.lastDevice === "gamepad") sound.unlock();
  }
  if (hosted && I.held.has("Pad8")) I.suppress("pause");
  if (game.paused && !pausedBefore) {
    pausedAt = game.real;
    sound.pause();
    consume();
  }
  pausedBefore = game.paused;
  if (ui.screen === "dev" && world) {
    const t = ui.root.querySelector("p");
    if (t)
      t.textContent = `Seed ${world.seed} · tick ${world.tick} · ${world.phase} · ${world.enemies.length} hulls · ${world.threats.length} threats`;
  }
  setPrompt();
});
game.debug = {
  snapshot: () => ({
    title: TITLE,
    scene: game.sceneName,
    screen: ui.screen,
    paused: game.paused,
    demo,
    hosted,
    server: transport?.server || false,
    terminated,
    seed: world?.seed,
    tick: world?.tick,
    phase: world?.phase,
    wave: world?.wave,
    bossPhase: world?.bossPhase,
    score: world?.score,
    players: world?.players.map((p) => ({
      id: p.id,
      x: p.x,
      hp: p.hp,
      connected: p.connected,
    })),
    enemies: world?.enemies.length,
    threats: world?.threats.map((t) => ({
      kind: t.kind,
      state: t.state,
      x: t.x,
      y: t.y,
    })),
    brake: world?.brake,
    seen: world?.seen,
    modified: world?.modified,
    music: game.settings.music,
    input: game.input.lastDevice,
    packets: transport?.meter.snapshot(),
    errors: game.errors,
  }),
};
globalThis.game = game;
globalThis.TimeBandit = {
  game,
  ui,
  art,
  sound,
  get world() {
    return world;
  },
  get transport() {
    return transport;
  },
  snapshot: game.debug.snapshot,
};
if (TEST_MODE)
  Object.assign(globalThis.TimeBandit, {
    startSolo,
    startRun,
    title,
    startAttract,
    showResults,
    showHelp,
    showJoin,
    showCredits,
    openDev,
    resetTuning,
    roomScreen,
    connectRoom,
    leaveRoom,
    showScores,
    getRecords,
    saveRecord,
    audioEvidence: () => renderAudioEvidence(game),
    audioSignalCheck: async () => {
      const C = window.OfflineAudioContext || window.webkitOfflineAudioContext,
        ctx = new C(1, 44100 * 2, 44100),
        bus = ctx.createGain();
      bus.gain.value = 0.7;
      bus.connect(ctx.destination);
      codeTone(ctx, bus, 0, 660, 0.25, 0.2, "triangle");
      codeTone(ctx, bus, 0.3, 140, 0.4, 0.2, "sawtooth", 45);
      gibberish(ctx, bus, 0.8, "Your century is overdue.");
      const out = await ctx.startRendering(),
        data = out.getChannelData(0);
      let peak = 0,
        sum = 0,
        finite = true;
      for (const n of data) {
        peak = Math.max(peak, Math.abs(n));
        sum += n * n;
        if (!Number.isFinite(n)) finite = false;
      }
      return {
        peak,
        rms: Math.sqrt(sum / data.length),
        finite,
        samples: data.length,
        music: game.settings.music,
      };
    },
    get demo() {
      return demo;
    },
    botAction,
    setAutomation: (fn) => {
      automation = fn;
    },
    setWorld: (w) => {
      world = w;
    },
    step: (n) => {
      for (let i = 0; i < n; i++) stepWorld(world, FIXED_DT);
      art.ingest(world);
    },
    advance: (s) => game.advance(s),
    action: (a, id = 0) => acceptAction(world, id, a),
    packet: () => worldPacket(world),
  });
const scenes = {
  title: {
    enter() {
      showTitle();
    },
    update: updateTitle,
    draw: (r) => art.draw(r, null),
  },
  play: { pausable: true, camera: false, update: updatePlay, draw: drawWorld },
  attract: {
    pausable: false,
    camera: false,
    update: updateAttract,
    draw: drawWorld,
  },
};
game.start({ scene: "title", scenes });
async function boot() {
  const info = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
  if (!info) {
    hosted = false;
    title();
    const invite = new URLSearchParams(location.search).get("room");
    if (invite) {
      joinCode = invite;
      onlineMenu();
      showJoin();
    }
    document.body.dataset.booted = "true";
    return;
  }
  hosted = true;
  terminated = false;
  ui.hide();
  transport = new HubTransport(AIHub, info, makeHooks());
  game.o.autoPause = false;
  game.live = true;
  game.o.menu.items = () => [["Session inspection", openDev]];
  ui._o.screens.pause.title = "Local options";
  startRun(info.seed, info.players, true);
  document.body.dataset.booted = "true";
  AIHub.ready();
}
boot().catch((error) => {
  game.fail("boot", error);
  if (AIHub.active) AIHub.fail(error.message);
  else title();
});
