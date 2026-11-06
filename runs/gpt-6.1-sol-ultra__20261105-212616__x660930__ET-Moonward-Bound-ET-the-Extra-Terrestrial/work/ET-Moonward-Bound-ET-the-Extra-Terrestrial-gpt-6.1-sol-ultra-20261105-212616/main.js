import * as THREE from "three/webgpu";
import RAPIER from "rapier";
import { createAudio } from "./audio.js";
import { createNetwork } from "./network.js";
import { buildWorld } from "./world.js";
import { renderCredits } from "./credits.js";
const $ = (id) => document.getElementById(id),
  clamp = THREE.MathUtils.clamp,
  lerp = THREE.MathUtils.lerp;
const audio = createAudio();
const defaults = {
  rideSpeed: 6.3,
  sneakSpeed: 3.1,
  alertRate: 22,
  bondRegen: 2.8,
  pulseCost: 17,
  flightSpeed: 8.2,
};
const balance = { ...defaults };
let god = false,
  ready = false,
  renderer,
  scene,
  camera,
  physics,
  world,
  body,
  players = [],
  alien,
  clockTime = 0,
  accumulator = 0;
let mode = "title",
  phase = "scavenge",
  attract = false,
  pausedFrom = "play",
  returnScreen = "title",
  titleIdle = 0,
  elapsed = 0;
let bond = 100,
  inventory = [],
  flowersHealed = 0,
  stars = 0,
  pulses = 0,
  catchCount = 0,
  alert = 0,
  pulseCooldown = 0,
  dialogueTimer = 0,
  toastTimer = 0;
let lastInput = "keyboard",
  glyphs = "ps",
  captions = true,
  cameraSensitivity = 1,
  cameraAngle = 0.42,
  clickTarget = null;
let flightY = 2.6,
  flightDistance = 0,
  winTimer = 0,
  lastBroadcast = 0,
  attractStep = 0,
  attractTimer = 0,
  signalIndex = 0,
  signalTimer = 0,
  signalShow = -1,
  signalReady = false;
const pattern = [0, 2, 1, 0],
  input = { x: 0, z: 0, sneak: false, lift: false, interact: false, pulse: false },
  remoteInputs = new Map(),
  pressed = new Set(),
  effects = [],
  trail = [];
const keys = new Set(),
  mapCtx = $("map").getContext("2d");
let moving = false,
  padPrevious = [],
  pointerDown = null,
  rightTouch = null,
  leftTouch = null,
  touchVector = { x: 0, z: 0 };
const settings = (() => {
  try {
    return JSON.parse(localStorage.getItem("moonward-settings")) || {};
  } catch {
    return {};
  }
})();
let friendBody = null,
  menuAxisTimer = 0,
  sliderAxisTimer = 0,
  lastRemoteMode = null;
const remoteActions = [];
const neutralControls = () => ({ x: 0, z: 0, sneak: false, lift: false });
const network = createNetwork({
  onStatus: (s) => {
    $("network-status").textContent = s;
  },
  onInput: (seat, value) => {
    if (!value || typeof value !== "object") return;
    remoteInputs.set(seat, {
      x: clamp(Number(value.x) || 0, -1, 1),
      z: clamp(Number(value.z) || 0, -1, 1),
      sneak: !!value.sneak,
      lift: !!value.lift,
      at: performance.now(),
    });
    if (value.interact || value.pulse || Number.isInteger(value.note))
      remoteActions.push({
        seat,
        action: { interact: !!value.interact, pulse: !!value.pulse, note: value.note },
      });
  },
  onAction: (seat, action) => remoteActions.push({ seat, action }),
  onState: (state) => applySnapshot(state),
  onStart: () => startGame(),
  onTimeUp: () => finishHub(),
  onEnd: () => {
    mode = "ended";
    remoteInputs.clear();
    remoteActions.length = 0;
    showScreen(null);
    $("hud").classList.add("hidden");
    audio.setMusic(0);
    audio.setSfx(0);
  },
  onPeerJoin: () => {
    syncFriend();
    toast("A friend has found your little world.");
  },
  onPeerLeave: (seat) => {
    remoteInputs.delete(seat);
    for (let i = remoteActions.length - 1; i >= 0; i--)
      if (remoteActions[i].seat === seat) remoteActions.splice(i, 1);
    syncFriend();
    if (!authority()) {
      mode = "waiting";
      showScreen(null);
      $("hud").classList.add("hidden");
      toast("Your friend disconnected. Open the menu to return home.");
    }
  },
  onConnect: () => {
    syncFriend();
    if (ready && network.hubActive && mode === "title") $("title").classList.add("hidden");
  },
});
function currentSeat() {
  return network.me ?? 0;
}
function authority() {
  return network.isHost;
}
function seatSlot(seat) {
  const index = network.players.findIndex((p) => p.id === seat);
  return index < 0 ? -1 : index;
}
function currentSlot() {
  return Math.max(0, seatSlot(currentSeat()));
}
function localPosition() {
  const hero = players[currentSlot()];
  return currentSlot() === 0 && body
    ? body.translation()
    : hero
      ? { x: hero.position.x, y: hero.position.y + 0.9, z: hero.position.z }
      : { x: 0, y: 1.25, z: 18 };
}
function seatControls(slot, local) {
  const seat = network.players[slot]?.id;
  if (seat === currentSeat() && !network.isServer && local) return local;
  const value = remoteInputs.get(seat);
  return value && performance.now() - value.at < 700 ? value : neutralControls();
}
function syncFriend() {
  if (!ready || !players[1] || !physics) return;
  const enabled = network.players.length > 1;
  if (!friendBody) {
    friendBody = physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(-2, 1.25, 19)
        .lockRotations()
        .setLinearDamping(6)
        .setCcdEnabled(true),
    );
    physics.createCollider(
      RAPIER.ColliderDesc.capsule(0.4, 0.46).setFriction(0).setRestitution(0),
      friendBody,
    );
  }
  const fresh = enabled && !players[1].visible;
  players[1].visible = enabled;
  friendBody.setEnabled(enabled && authority());
  if (fresh && authority()) {
    const p = body.translation();
    friendBody.setTranslation({ x: p.x - 2, y: p.y, z: p.z + 1 }, true);
    friendBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    players[1].position.set(p.x - 2, p.y - 0.9, p.z + 1);
  }
}
function processRemoteActions() {
  if (!authority()) return;
  while (remoteActions.length) {
    const { seat, action } = remoteActions.shift(),
      slot = seatSlot(seat);
    if (slot < 0 || !action || typeof action !== "object") continue;
    const position =
      slot === 0
        ? body.translation()
        : {
            x: players[slot].position.x,
            y: players[slot].position.y + 0.9,
            z: players[slot].position.z,
          };
    if (action.pause && (mode === "play" || mode === "signal")) pause(true);
    if (action.resume && ["pause", "settings", "about", "coop", "dev"].includes(mode)) resume(true);
    if (action.cancelSignal && mode === "signal") {
      mode = "play";
      showScreen(null);
    }
    if (Number.isInteger(action.note) && action.note >= 0 && action.note < 3)
      submitNote(action.note, true);
    if (action.interact) interact(position);
    if (action.pulse) pulse(position);
  }
}
function closeSignal() {
  if (!authority()) {
    network.sendAction({ cancelSignal: true });
    return;
  }
  mode = "play";
  showScreen(null);
}
function prepareFriend(dt, controls) {
  if (!friendBody?.isEnabled()) return;
  const p = friendBody.translation();
  friendBody.setGravityScale(phase === "flight" ? 0 : 1, true);
  if (phase === "flight") {
    friendBody.setLinvel(
      {
        x: controls.x * 7.8,
        y: clamp(((controls.lift ? 8.5 : 2.2) - p.y) * 1.8, -3, 4),
        z: -balance.flightSpeed * (controls.sneak ? 1.35 : 1),
      },
      true,
    );
  } else {
    friendBody.setLinvel(
      {
        x: controls.x * (controls.sneak ? balance.sneakSpeed : balance.rideSpeed),
        y: friendBody.linvel().y,
        z: controls.z * (controls.sneak ? balance.sneakSpeed : balance.rideSpeed),
      },
      true,
    );
  }
}
function updateFriend(dt, controls) {
  if (!friendBody?.isEnabled()) return;
  const friend = players[1],
    p = friendBody.translation();
  if (phase === "flight") {
    checkFlightHazards(p);
    friendBody.setTranslation({ x: clamp(p.x, -16, 16), y: p.y, z: p.z }, true);
    friend.rotation.y = Math.PI + controls.x * 0.22;
    friend.rotation.z = -controls.x * 0.2;
    for (const h of world.hoops)
      if (!h.collected && Math.abs(p.z - h.z) < 2.5 && Math.hypot(p.x - h.x, p.y - h.y) < 3.2) {
        h.collected = true;
        h.mesh.visible = false;
        stars++;
        audio.sfx("pickup");
        particleBurst(h.x, h.y, h.z);
      }
  } else {
    friendBody.setTranslation({ x: clamp(p.x, -34, 34), y: p.y, z: clamp(p.z, -42, 34) }, true);
    if (Math.hypot(controls.x, controls.z) > 0.1)
      friend.rotation.y = Math.atan2(controls.x, controls.z);
    friend.rotation.z = 0;
    for (const a of world.agents) {
      const dx = p.x - a.x,
        dz = p.z - a.z,
        d = Math.hypot(dx, dz);
      if (
        a.stunned <= 0 &&
        d < (controls.sneak ? 3 : 7.8) &&
        (dx * Math.sin(a.mesh.rotation.y) + dz * Math.cos(a.mesh.rotation.y)) / Math.max(0.1, d) >
          0.65
      ) {
        bond -= dt * balance.alertRate * (controls.sneak ? 0.2 : 1);
        alert = clamp(alert + dt * 40, 0, 100);
      }
    }
    for (const candy of world.candies)
      if (!candy.collected && Math.hypot(candy.x - p.x, candy.z - p.z) < 1.5) {
        candy.collected = true;
        candy.mesh.visible = false;
        bond = clamp(bond + 10, 0, 100);
        audio.sfx("pickup");
      }
  }
  const np = friendBody.translation();
  friend.position.set(np.x, np.y - 0.9, np.z);
  friend.userData.mixer.timeScale =
    phase === "flight" ? 1.5 : Math.hypot(controls.x, controls.z) > 0.1 ? 1 : 0.15;
  friend.userData.mixer.update(dt);
}
function signalSound(n) {
  audio.sfx(["bond", "signal", "pickup"][n]);
}
function rememberInput(type) {
  if (lastInput !== type) {
    lastInput = type;
    document.body.classList.toggle("touch", type === "touch");
    updatePrompts();
  }
  titleIdle = 0;
  if (attract) {
    endAttract();
    return true;
  }
  return false;
}
function prompt(name) {
  const ps = { interact: "✕", pulse: "□", sneak: "L2", pause: "☰", move: "L" },
    xb = { interact: "A", pulse: "X", sneak: "LT", pause: "☰", move: "L" },
    kb = { interact: "E", pulse: "Space", sneak: "Shift", pause: "Esc", move: "WASD" };
  return lastInput === "pad" ? (glyphs === "ps" ? ps : xb)[name] : kb[name];
}
function updatePrompts() {
  if (!$("controls")) return;
  $("controls").innerHTML =
    `<span><b class="key">${prompt("move")}</b>Ride</span><span><b class="key">${prompt("interact")}</b>Interact</span><span><b class="key">${prompt("pulse")}</b>${phase === "flight" ? "Lift" : "Glow"}</span><span><b class="key">${prompt("sneak")}</b>${phase === "flight" ? "Boost" : "Sneak"}</span><span><b class="key">${prompt("pause")}</b>Pause</span>`;
  $("title-input").textContent =
    lastInput === "pad"
      ? `${glyphs === "ps" ? "✕" : "A"} TO BEGIN · LEFT STICK TO RIDE`
      : "WASD TO RIDE · E TO INTERACT";
  ["0", "1", "2"].forEach((s, i) => {
    $("note" + s).textContent =
      (lastInput === "pad"
        ? glyphs === "ps"
          ? ["□", "✕", "○"]
          : ["X", "A", "B"]
        : ["1", "2", "3"])[i] +
      " · " +
      ["LOW", "MIDDLE", "HIGH"][i];
  });
}
function say(text, who = "YOUR NEW FRIEND", time = 5) {
  if (captions) {
    $("dialogue").innerHTML = `<em>${who}</em>${text}`;
    $("dialogue").classList.remove("hidden");
    dialogueTimer = time;
  }
  audio.voice(who === "YOUR NEW FRIEND" ? "curious" : "happy");
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.remove("hidden");
  toastTimer = 3.2;
}
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  if (id) {
    $(id).classList.remove("hidden");
    setFocus($(id).querySelector("button:not(.hidden)"));
  }
}
function setFocus(button) {
  document.querySelectorAll(".focused").forEach((e) => e.classList.remove("focused"));
  if (button) {
    button.classList.add("focused");
    button.focus({ preventScroll: true });
  }
}
function goScreen(id) {
  if (id === "settings" || id === "about" || id === "coop") {
    returnScreen = ["title", "pause", "win"].includes(mode) ? mode : "pause";
  }
  if (id === "pause") {
    pausedFrom = mode;
    mode = "pause";
  } else mode = id;
  showScreen(id);
  $("hud").classList.toggle("hidden", !["play", "signal"].includes(mode));
  if (id === "dev")
    $("dev-stats").textContent =
      `${renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2 compatibility"} · Rapier 0.19.3 · ${world?.agents.length || 0} patrols · ${pulses} glow pulses`;
}
function back() {
  if (network.hubActive && mode === "ended") return;
  if (mode === "dev") {
    mode = "pause";
    showScreen("pause");
  } else {
    mode = returnScreen;
    showScreen(mode);
    $("hud").classList.toggle("hidden", mode !== "play");
  }
}
function action(name) {
  if (network.hubActive && mode === "ended") return;
  audio.unlock();
  audio.sfx("click");
  if (attract) {
    endAttract();
    return;
  }
  switch (name) {
    case "start":
      startGame();
      break;
    case "continue":
      startGame({ resume: true });
      break;
    case "resume":
      resume();
      break;
    case "settings":
    case "about":
    case "coop":
    case "dev":
      goScreen(name);
      break;
    case "back":
      back();
      break;
    case "title":
      toTitle();
      break;
    case "close-signal":
      closeSignal();
      break;
  }
}
document
  .querySelectorAll("[data-action]")
  .forEach((b) => b.addEventListener("click", () => action(b.dataset.action)));
document.querySelectorAll("button").forEach((b) =>
  b.addEventListener("pointerenter", () => {
    if (!b.disabled) setFocus(b);
  }),
);
$("interaction").onclick = () => interact();
$("pause-fab").onclick = () => (mode === "play" ? pause() : resume());
function pause(fromNetwork = false) {
  if (attract) return endAttract();
  if (network.hubActive && mode === "ended") return;
  if (!authority() && !fromNetwork) {
    network.sendAction({ pause: true });
    return;
  }
  if (mode === "play" || mode === "signal") goScreen("pause");
}
function resume(fromNetwork = false) {
  if (network.hubActive && mode === "ended") return;
  if (!authority() && !fromNetwork) {
    network.sendAction({ resume: true });
    return;
  }
  mode = pausedFrom === "signal" ? "signal" : "play";
  showScreen(mode === "signal" ? "signal" : null);
  $("hud").classList.remove("hidden");
}
function saveSettings() {
  try {
    localStorage.setItem(
      "moonward-settings",
      JSON.stringify({
        music: +$("music").value,
        sfx: +$("sfx").value,
        glyphs,
        cameraSensitivity,
        captions,
      }),
    );
  } catch {}
}
for (const id of ["music", "sfx", "camera"]) {
  $(id).oninput = () => {
    const n = +$(id).value;
    $(id).nextElementSibling.textContent = n + "%";
    if (id === "music") audio.setMusic(n / 100);
    if (id === "sfx") audio.setSfx(n / 100);
    if (id === "camera") cameraSensitivity = n / 100;
    saveSettings();
  };
}
$("glyph-toggle").onclick = () => {
  glyphs = glyphs === "ps" ? "xbox" : "ps";
  $("glyph-toggle").textContent = glyphs === "ps" ? "PlayStation" : "Xbox";
  updatePrompts();
  saveSettings();
};
$("captions-toggle").onclick = () => {
  captions = !captions;
  $("captions-toggle").textContent = captions ? "On" : "Off";
  saveSettings();
};
const devNames = {
  rideSpeed: ["Ride speed", 3, 12, 0.1],
  sneakSpeed: ["Sneak speed", 1, 6, 0.1],
  alertRate: ["Searchlight danger", 0, 60, 1],
  bondRegen: ["Friendship recovery", 0, 10, 0.1],
  pulseCost: ["Glow cost", 0, 40, 1],
  flightSpeed: ["Flight speed", 5, 20, 0.1],
};
for (const [key, [label, min, max, step]] of Object.entries(devNames)) {
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `<label for="dev-${key}">${label}</label><input id="dev-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${balance[key]}"><output>${balance[key]}</output>`;
  row.querySelector("input").oninput = (e) => {
    balance[key] = +e.target.value;
    e.target.nextElementSibling.textContent = e.target.value;
  };
  $("dev-sliders").append(row);
}
$("god-toggle").onclick = () => {
  god = !god;
  $("god-toggle").textContent = god ? "On" : "Off";
};
document
  .querySelectorAll("[data-dev]")
  .forEach((b) => (b.onclick = () => devAction(b.dataset.dev)));
function devAction(a, value) {
  if (!authority()) {
    toast("Your friend is running this world.");
    return;
  }
  if (a in balance) {
    balance[a] = value;
    $("dev-" + a).value = value;
    $("dev-" + a).nextElementSibling.textContent = value;
    return;
  }
  if (a === "refill") bond = 100;
  if (a === "parts") {
    inventory = world.targets.map((t) => t.id);
    world.targets.forEach((t) => (t.mesh.visible = false));
    phase = "signal";
    saveCheckpoint();
  }
  if (a === "clearing") {
    teleport(0, -32);
    pausedFrom = "play";
    resume();
  }
  if (a === "flight") {
    beginFlight();
    pausedFrom = "play";
    resume();
  }
  if (a === "reset") {
    Object.assign(balance, defaults);
    for (const k of Object.keys(defaults)) {
      const e = $("dev-" + k);
      e.value = balance[k];
      e.nextElementSibling.textContent = balance[k];
    }
    god = false;
    $("god-toggle").textContent = "Off";
  }
  if (a === "restart") startGame();
  if (a === "god") god = !!value;
  updateHUD();
}
function networkAction(fn) {
  try {
    const r = fn();
    if (r?.then) r.catch((e) => toast(e.message));
  } catch (e) {
    toast(e.message);
  }
}
$("host-local").onclick = () =>
  networkAction(() => {
    $("network-code").value = network.host();
    toast("Share the neighborhood code with another tab.");
  });
$("join-local").onclick = () => networkAction(() => network.join($("network-code").value.trim()));
$("create-offer").onclick = () =>
  networkAction(async () => {
    $("network-status").textContent = "Writing your invitation…";
    $("network-code").value = await network.createOffer();
    toast("Copy this letter. Your friend reads it, then sends their reply.");
  });
$("accept-code").onclick = () =>
  networkAction(async () => {
    const code = $("network-code").value.trim();
    if (code.toUpperCase().startsWith("MB-")) return network.join(code);
    if (network.invitationType(code) === "answer") {
      await network.acceptAnswer(code);
      toast("The two little worlds are connecting.");
    } else {
      $("network-code").value = await network.acceptOffer(code);
      toast("Send this reply back to the friend who invited you.");
    }
  });
$("copy-code").onclick = () =>
  networkAction(async () => {
    await navigator.clipboard.writeText($("network-code").value);
    toast("Connection letter copied.");
  });
$("disconnect").onclick = () => network.close();
document
  .querySelectorAll("[data-note]")
  .forEach((b) => (b.onclick = () => submitNote(+b.dataset.note)));
document.addEventListener(
  "pointerdown",
  (e) => {
    if (mode === "ended") return;
    audio.unlock();
    if (rememberInput(e.pointerType === "touch" ? "touch" : "keyboard")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);
document.addEventListener(
  "pointermove",
  (e) => {
    if ((mode === "title" || attract) && e.pointerType !== "touch") rememberInput("keyboard");
  },
  true,
);
window.addEventListener("keydown", (e) => {
  if (mode === "ended" || network.isServer) return;
  if (e.target.tagName === "TEXTAREA") return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code))
    e.preventDefault();
  audio.unlock();
  if (rememberInput("keyboard")) return;
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "Escape") {
    if (mode === "waiting") {
      if (!network.hubActive) toTitle();
      return;
    }
    if (mode === "play" || mode === "signal") pause();
    else if (mode === "pause") resume();
    else if (mode !== "title") back();
    return;
  }
  if (mode === "signal") {
    if (["Digit1", "Digit2", "Digit3"].includes(e.code)) submitNote(+e.code.slice(-1) - 1);
    return;
  }
  if (mode === "play") {
    if (e.code === "KeyE") interact();
    if (e.code === "Space") pulse();
  } else if (["ArrowDown", "ArrowUp"].includes(e.code)) menuMove(e.code === "ArrowDown" ? 1 : -1);
  else if (e.code === "Enter") {
    const active = document.activeElement;
    if (active?.tagName === "BUTTON") active.click();
    else if (mode === "title") startGame();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  if (mode === "play" && !attract && !network.hubActive) pause();
});
function menuMove(dir) {
  const screen = document.querySelector(".screen:not(.hidden)");
  if (!screen) return;
  const buttons = [...screen.querySelectorAll("button:not(:disabled), input[type=range]")].filter(
    (e) => !e.classList.contains("hidden"),
  );
  if (!buttons.length) return;
  let i = buttons.indexOf(document.activeElement);
  setFocus(buttons[(i + dir + buttons.length) % buttons.length]);
}
$("world").addEventListener("pointerdown", (e) => {
  audio.unlock();
  if (rememberInput(e.pointerType === "touch" ? "touch" : "keyboard")) return;
  if (mode !== "play") return;
  if (e.pointerType === "touch") {
    if (e.clientX < innerWidth * 0.5) {
      leftTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
    } else rightTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  } else pointerDown = { x: e.clientX, y: e.clientY, lastX: e.clientX, moved: false };
});
$("world").addEventListener("pointermove", (e) => {
  if (leftTouch?.id === e.pointerId) {
    touchVector = {
      x: clamp((e.clientX - leftTouch.x) / 65, -1, 1),
      z: clamp((e.clientY - leftTouch.y) / 65, -1, 1),
    };
  } else if (rightTouch?.id === e.pointerId) {
    cameraAngle -= (e.clientX - rightTouch.x) * 0.007 * cameraSensitivity;
    rightTouch.x = e.clientX;
  } else if (pointerDown) {
    const delta = e.clientX - pointerDown.lastX;
    if (Math.abs(e.clientX - pointerDown.x) > 5) pointerDown.moved = true;
    if (pointerDown.moved) cameraAngle -= delta * 0.007 * cameraSensitivity;
    pointerDown.lastX = e.clientX;
  }
});
function pointerEnd(e) {
  if (leftTouch?.id === e.pointerId) {
    leftTouch = null;
    touchVector = { x: 0, z: 0 };
  }
  if (rightTouch?.id === e.pointerId) rightTouch = null;
  if (pointerDown && !pointerDown.moved && mode === "play") {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2),
      camera,
    );
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) {
      clickTarget = { x: hit.x, z: hit.z };
      spawnRing(hit.x, 0.1, hit.z, 0xffd489, 2);
    }
  }
  pointerDown = null;
}
$("world").addEventListener("pointerup", pointerEnd);
$("world").addEventListener("pointercancel", pointerEnd);
$("touch-action").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  audio.unlock();
  rememberInput("touch");
  if (mode === "signal") return;
  if (nearestInteraction()) interact();
  else pulse();
  input.lift = true;
});
$("touch-action").addEventListener("pointerup", () => (input.lift = false));
function readInput(dt) {
  if (mode === "ended" || network.isServer) return neutralControls();
  let x = 0,
    z = 0,
    sneak = false,
    lift = false;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x--;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x++;
  if (keys.has("KeyW") || keys.has("ArrowUp")) z--;
  if (keys.has("KeyS") || keys.has("ArrowDown")) z++;
  sneak = keys.has("ShiftLeft") || keys.has("ShiftRight");
  lift = keys.has("Space");
  if (leftTouch) {
    x = touchVector.x;
    z = touchVector.z;
  }
  const p = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  menuAxisTimer = Math.max(0, menuAxisTimer - dt);
  sliderAxisTimer = Math.max(0, sliderAxisTimer - dt);
  if (p) {
    const axes = p.axes,
      active = axes.some((v) => Math.abs(v) > 0.16) || p.buttons.some((b) => b.pressed);
    if (active && rememberInput("pad")) {
      padPrevious = p.buttons.map((b) => b.pressed);
      return neutralControls();
    }
    const btn = (n) => p.buttons[n]?.pressed,
      edge = (n) => btn(n) && !padPrevious[n];
    if (mode === "play") {
      if (Math.hypot(axes[0] || 0, axes[1] || 0) > 0.15) {
        x = axes[0];
        z = axes[1];
        clickTarget = null;
      }
      cameraAngle -= (Math.abs(axes[2] || 0) > 0.15 ? axes[2] : 0) * dt * 1.6 * cameraSensitivity;
      sneak = btn(6);
      lift = btn(2);
      if (edge(0)) interact();
      if (edge(2)) pulse();
      if (edge(9) && !btn(8)) pause();
    } else if (mode === "signal") {
      if (edge(2)) submitNote(0);
      if (edge(0)) submitNote(1);
      if (edge(1)) submitNote(2);
      if (edge(9) && !btn(8)) pause();
    } else {
      const axisY = axes[1] || 0,
        axisX = axes[0] || 0;
      if (mode === "about" && Math.abs(axes[3] || 0) > 0.15) {
        const panel = $("credits-content");
        (panel.scrollHeight > panel.clientHeight ? panel : panel.parentElement).scrollTop +=
          (axes[3] || 0) * dt * 600;
      }
      if (Math.abs(axisY) < 0.3) menuAxisTimer = 0;
      if (Math.abs(axisX) < 0.3) sliderAxisTimer = 0;
      if (edge(13) || edge(12)) {
        menuMove(edge(13) ? 1 : -1);
        menuAxisTimer = 0.25;
      } else if (Math.abs(axisY) > 0.6 && menuAxisTimer === 0) {
        menuMove(axisY > 0 ? 1 : -1);
        menuAxisTimer = 0.25;
      }
      if (edge(0)) document.activeElement?.click();
      if (edge(1) || (edge(9) && !btn(8))) {
        if (mode === "pause") resume();
        else if (mode === "waiting" && !network.hubActive) toTitle();
        else if (mode !== "title" && mode !== "waiting") back();
      }
      const activeEl = document.activeElement;
      if (
        activeEl?.type === "range" &&
        (edge(14) || edge(15) || (Math.abs(axisX) > 0.6 && sliderAxisTimer === 0))
      ) {
        const direction = edge(15) ? 1 : edge(14) ? -1 : Math.sign(axisX);
        activeEl.value = clamp(
          +activeEl.value + direction * Number(activeEl.step || 1),
          +activeEl.min,
          +activeEl.max,
        );
        activeEl.dispatchEvent(new Event("input"));
        sliderAxisTimer = 0.25;
      }
    }
    padPrevious = p.buttons.map((b) => b.pressed);
  }
  if (x || z) {
    clickTarget = null;
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
  } else if (clickTarget && mode === "play") {
    const pos = localPosition(),
      dx = clickTarget.x - pos.x,
      dz = clickTarget.z - pos.z,
      length = Math.hypot(dx, dz);
    if (length < 0.6) {
      clickTarget = null;
      if (nearestInteraction()) interact();
    } else return { x: dx / length, z: dz / length, sneak, lift };
  }
  const c = Math.cos(cameraAngle),
    s = Math.sin(cameraAngle);
  return { x: x * c - z * s, z: x * s + z * c, sneak, lift: lift || input.lift };
}
function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient });
}
let gradient;
function mesh(geo, mat, parent, pos = [0, 0, 0], scale) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  const ink = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x10202c, side: THREE.BackSide }),
  );
  ink.scale.setScalar(1.035);
  m.add(ink);
  return m;
}
function makeCharacter(isAlien = false, color = 0xe96c50) {
  const root = new THREE.Group(),
    rig = new THREE.Group();
  root.add(rig);
  let mats = {
    skin: toon(isAlien ? 0xbda578 : 0xf4bf8f),
    cloth: toon(color),
    dark: toon(0x1c3445),
    eye: toon(0x101b23),
    light: toon(0xf9efd3),
  };
  const sphere = (r, m, p, sc) => mesh(new THREE.SphereGeometry(r, 14, 10), m, rig, p, sc);
  const head = sphere(
    isAlien ? 0.45 : 0.29,
    mats.skin,
    [0, isAlien ? 1.12 : 1.82, 0],
    isAlien ? [1.2, 0.84, 0.85] : [1, 1.1, 1],
  );
  head.name = "head";
  sphere(
    isAlien ? 0.41 : 0.36,
    isAlien ? mats.skin : mats.cloth,
    [0, isAlien ? 0.52 : 1.28, 0],
    isAlien ? [0.9, 1.3, 0.72] : [0.9, 1.2, 0.7],
  );
  if (isAlien) {
    sphere(0.12, mats.dark, [-0.26, 1.17, 0.3], [1, 1.1, 0.5]);
    sphere(0.12, mats.dark, [0.26, 1.17, 0.3], [1, 1.1, 0.5]);
    sphere(0.045, mats.light, [-0.28, 1.19, 0.36]);
    sphere(0.045, mats.light, [0.24, 1.19, 0.36]);
    sphere(0.06, mats.skin, [0, 0.94, 0.37], [1.2, 0.4, 0.4]);
    const heart = sphere(0.08, new THREE.MeshBasicMaterial({ color: 0xff9a6a }), [0, 0.6, 0.33]);
    root.userData.heart = heart;
  } else {
    sphere(0.36, mats.cloth, [0, 1.85, -0.08], [1.05, 1.05, 0.9]);
    sphere(0.27, mats.skin, [0, 1.81, 0.16], [0.9, 0.95, 0.48]);
    sphere(0.025, mats.eye, [-0.095, 1.86, 0.29]);
    sphere(0.025, mats.eye, [0.095, 1.86, 0.29]);
  }
  for (let i = 0; i < 2; i++) {
    const arm = new THREE.Group();
    arm.name = "arm" + i;
    arm.position.set(i ? 0.34 : -0.34, isAlien ? 0.77 : 1.46, 0);
    rig.add(arm);
    mesh(
      new THREE.CapsuleGeometry(0.08, isAlien ? 0.34 : 0.35, 4, 8),
      isAlien ? mats.skin : mats.cloth,
      arm,
      [0, -0.2, 0],
    );
    arm.rotation.x = isAlien ? -0.2 : -0.65;
    const leg = new THREE.Group();
    leg.name = "leg" + i;
    leg.position.set(i ? 0.16 : -0.16, isAlien ? 0.3 : 1.0, 0);
    rig.add(leg);
    mesh(
      new THREE.CapsuleGeometry(0.1, isAlien ? 0.17 : 0.33, 4, 8),
      isAlien ? mats.skin : mats.dark,
      leg,
      [0, -0.16, 0],
    );
  }
  const mixer = new THREE.AnimationMixer(rig),
    tracks = [];
  for (let i = 0; i < 2; i++) {
    tracks.push(
      new THREE.NumberKeyframeTrack(
        "leg" + i + ".rotation[x]",
        [0, 0.3, 0.6],
        [i ? 0.7 : -0.7, i ? -0.7 : 0.7, i ? 0.7 : -0.7],
      ),
    );
    if (isAlien)
      tracks.push(
        new THREE.NumberKeyframeTrack(
          "arm" + i + ".rotation[x]",
          [0, 0.3, 0.6],
          [i ? -0.3 : 0.3, i ? 0.3 : -0.3, i ? -0.3 : 0.3],
        ),
      );
  }
  tracks.push(
    new THREE.NumberKeyframeTrack(
      "head.position[y]",
      [0, 0.3, 0.6],
      [isAlien ? 1.12 : 1.82, isAlien ? 1.16 : 1.86, isAlien ? 1.12 : 1.82],
    ),
  );
  const walk = mixer.clipAction(new THREE.AnimationClip("Ride and wonder", 0.6, tracks));
  walk.play();
  root.userData = { ...root.userData, rig, mixer, walk };
  if (!isAlien) {
    const bike = new THREE.Group();
    root.add(bike);
    const frame = toon(color),
      metal = toon(0x80b8bf),
      rubber = toon(0x112936);
    for (const z of [-0.65, 0.65]) {
      const wheel = mesh(new THREE.TorusGeometry(0.43, 0.065, 7, 24), rubber, bike, [0, 0.48, z]);
      wheel.rotation.y = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.75, 7), metal, bike, [
        0,
        0.48,
        z,
      ]).rotation.z = Math.PI / 2;
      for (let k = 0; k < 6; k++) {
        const spoke = mesh(new THREE.BoxGeometry(0.018, 0.82, 0.018), metal, bike, [0, 0.48, z]);
        spoke.rotation.x = (k * Math.PI) / 6;
      }
    }
    const tube = (a, b) => {
      const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
      const m = mesh(new THREE.CylinderGeometry(0.045, 0.045, d.length(), 7), frame, bike);
      m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    };
    tube([0, 0.5, -0.65], [0, 1.2, -0.2]);
    tube([0, 1.2, -0.2], [0, 0.55, 0.2]);
    tube([0, 0.55, 0.2], [0, 0.5, -0.65]);
    tube([0, 0.55, 0.2], [0, 1.1, 0.58]);
    tube([0, 1.1, 0.58], [0, 1.2, -0.2]);
    tube([0, 0.48, 0.65], [0, 1.4, 0.5]);
    mesh(new THREE.BoxGeometry(0.65, 0.06, 0.07), metal, bike, [0, 1.45, 0.5]);
    mesh(new THREE.BoxGeometry(0.33, 0.08, 0.25), mats.dark, bike, [0, 1.25, -0.22]);
    const basket = mesh(
      new THREE.BoxGeometry(0.65, 0.4, 0.52),
      toon(0xb8a27b),
      bike,
      [0, 1.26, 0.94],
    );
    for (let k = 0; k < 4; k++)
      mesh(new THREE.BoxGeometry(0.68, 0.025, 0.55), metal, bike, [0, 1.14 + k * 0.09, 0.94]);
    root.userData.basket = basket;
  }
  return root;
}
function spawnRing(x, y, z, color = 0xffd28b, size = 6) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y, z);
  scene.add(ring);
  effects.push({ mesh: ring, t: 0, duration: 1, size });
}
function particleBurst(x, y, z, color = 0xffd599, n = 18) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07 + Math.random() * 0.06),
      new THREE.MeshBasicMaterial({ color, transparent: true }),
    );
    m.position.set(x, y, z);
    scene.add(m);
    effects.push({
      mesh: m,
      t: 0,
      duration: 1.2,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4,
      ),
    });
  }
}
function teleport(x, z, y = 1.25) {
  body.setTranslation({ x, y, z }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  players[0].position.set(x, y - 0.9, z);
  alien.position.set(x + 0.9, 0.1, z + 1.5);
  clickTarget = null;
}
function saveCheckpoint() {
  if (attract) return;
  try {
    localStorage.setItem(
      "moonward-save",
      JSON.stringify({ phase, inventory, bond, flowersHealed, stars }),
    );
    $("continue-button").classList.remove("hidden");
  } catch {}
}
function startGame({ resume = false, demo = false } = {}) {
  if (!authority()) {
    if (!network.hubActive) {
      mode = "waiting";
      showScreen(null);
      $("hud").classList.add("hidden");
      toast("Your friend is starting the adventure.");
    }
    return;
  }
  if (network.hubActive && (mode === "ended" || elapsed > 0)) return;
  remoteInputs.clear();
  remoteActions.length = 0;
  attract = demo;
  phase = "scavenge";
  mode = "play";
  bond = 100;
  inventory = [];
  flowersHealed = 0;
  stars = 0;
  pulses = 0;
  catchCount = 0;
  alert = 0;
  elapsed = 0;
  pulseCooldown = 0;
  flightDistance = 0;
  attractStep = 0;
  attractTimer = 0;
  signalIndex = 0;
  signalReady = false;
  showScreen(null);
  $("hud").classList.remove("hidden");
  $("attract-label").classList.toggle("hidden", !demo);
  $("dialogue").classList.add("hidden");
  body.setGravityScale(1, true);
  world.reset();
  alien.visible = true;
  world.targets.forEach((t) => (t.mesh.visible = true));
  world.flowers.forEach((f) => {
    f.healed = false;
  });
  world.candies.forEach((c) => {
    c.collected = false;
    c.mesh.visible = true;
  });
  world.hoops.forEach((h) => {
    h.collected = false;
    h.mesh.visible = true;
  });
  teleport(0, 18);
  syncFriend();
  if (friendBody?.isEnabled()) {
    friendBody.setTranslation({ x: -2, y: 1.25, z: 19 }, true);
    friendBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    players[1].position.set(-2, 0.35, 19);
  }
  if (resume) {
    try {
      const saved = JSON.parse(localStorage.getItem("moonward-save"));
      if (saved) {
        inventory = saved.inventory || [];
        bond = Math.max(60, saved.bond || 100);
        flowersHealed = saved.flowersHealed || 0;
        world.targets.forEach((t) => (t.mesh.visible = !inventory.includes(t.id)));
        phase = inventory.length === 3 ? "signal" : "scavenge";
        if (saved.phase === "flight") beginFlight();
        else if (phase === "signal") teleport(0, -30);
      }
    } catch {}
  }
  audio.setMood("explore");
  audio.unlock();
  say("He’s a long way from home. We have until dawn.", "THE KID", 6);
  updatePrompts();
  updateHUD();
}
function toTitle() {
  if (network.hubActive) return;
  if (!authority()) network.close();
  mode = "title";
  attract = false;
  titleIdle = 0;
  showScreen("title");
  $("hud").classList.add("hidden");
  $("dialogue").classList.add("hidden");
  $("attract-label").classList.add("hidden");
  teleport(0, 18);
  cameraAngle = 0.42;
  audio.setMood("explore");
}
function endAttract() {
  attract = false;
  toTitle();
}
function nearestInteraction(position = localPosition()) {
  if (!body || phase === "flight") return null;
  const p = position;
  const near = (t, d = 3) => Math.hypot(t.x - p.x, t.z - p.z) < d;
  if (phase === "scavenge") {
    const target = world.targets.find((t) => !inventory.includes(t.id) && near(t));
    if (target) return { kind: "part", target, text: "Borrow " + target.name };
  }
  const flower = world.flowers.find((f) => !f.healed && near(f, 2.8));
  if (flower) return { kind: "flower", target: flower, text: "Make a little life glow" };
  if (inventory.length === 3 && near({ x: 0, z: -35 }, 4.5))
    return { kind: "signal", text: "Call the stars" };
  return null;
}
function interact(position = localPosition()) {
  if (mode !== "play" || (attract && !authority())) return;
  audio.unlock();
  if (!authority()) {
    network.sendAction({ interact: true });
    return;
  }
  const nearby = nearestInteraction(position);
  if (!nearby) return;
  if (nearby.kind === "part") {
    const t = nearby.target;
    inventory.push(t.id);
    t.mesh.visible = false;
    bond = clamp(bond + 12, 0, 100);
    audio.sfx("pickup");
    particleBurst(t.x, 1.8, t.z);
    toast(t.name + " borrowed · " + inventory.length + " / 3");
    const lines = {
      radio: "“Borrowing,” you whisper. “We’ll bring it back. Mostly.”",
      battery: "A toy battery. A little power. A very big possibility.",
      dish: "A salad strainer. Don’t laugh. Space is full of surprises.",
    };
    say(lines[t.id] || "Every small thing can become something wonderful.", "THE KID");
    if (inventory.length === 3) {
      phase = "signal";
      say("All the pieces. Now we need somewhere the sky can hear us.", "THE KID", 7);
    }
    saveCheckpoint();
  } else if (nearby.kind === "flower") {
    nearby.target.healed = true;
    flowersHealed++;
    bond = clamp(bond + 22, 0, 100);
    spawnRing(nearby.target.x, 0.2, nearby.target.z, 0x9ee6bd, 4);
    particleBurst(nearby.target.x, 1, nearby.target.z, 0x9fe3a6);
    audio.sfx("bond");
    say("A little kindness goes a long, long way.", "THE KID", 4);
    toast("A flower remembers how to bloom · +22 friendship");
  } else beginSignal();
  updateHUD();
}
function pulse(position = localPosition()) {
  if (mode !== "play") return;
  if (!authority()) {
    network.sendAction({ pulse: true });
    return;
  }
  if (phase === "flight") {
    audio.sfx("jump");
    return;
  }
  if (pulseCooldown > 0) {
    toast("Let the little light catch its breath.");
    return;
  }
  if (bond < balance.pulseCost && !god) {
    toast("Stay close. Friendship will find its way back.");
    return;
  }
  if (!god && !attract) bond -= balance.pulseCost;
  pulses++;
  pulseCooldown = 3;
  const p = position;
  spawnRing(p.x, 0.18, p.z, 0x9eeacc, 8);
  particleBurst(p.x, 1.2, p.z, 0xaaf1cd, 25);
  audio.sfx("pulse");
  world.agents.forEach((a) => {
    if (Math.hypot(a.x - p.x, a.z - p.z) < 10) a.stunned = 6;
  });
  alert = Math.max(0, alert - 45);
  updateHUD();
}
function beginSignal() {
  if (inventory.length !== 3) return;
  mode = "signal";
  showScreen("signal");
  signalIndex = 0;
  signalTimer = 0;
  signalShow = -1;
  signalReady = false;
  $("signal-seq").innerHTML = pattern.map(() => '<span class="signal-dot">·</span>').join("");
  $("signal-instruction").textContent = "Listen to the little lights. Then send their song back.";
  audio.setMood("sneak");
}
function updateSignal(dt) {
  signalTimer += dt;
  if (!signalReady) {
    const i = Math.floor((signalTimer - 0.8) / 0.85);
    if (i >= 0 && i < pattern.length && i !== signalShow) {
      signalShow = i;
      signalSound(pattern[i]);
      [...$("signal-seq").children].forEach((e, j) => {
        e.classList.toggle("lit", j === i);
        e.textContent = j === i ? ["◒", "✦", "☾"][pattern[i]] : "·";
      });
    }
    if (i >= pattern.length) {
      signalReady = true;
      $("signal-instruction").textContent = "Your turn. Send the lights back, one by one.";
      [...$("signal-seq").children].forEach((e, i) => {
        e.classList.remove("lit");
        e.textContent = ["◒", "✦", "☾"][pattern[i]];
      });
    }
  }
  document.querySelectorAll("[data-note]").forEach((b) => (b.disabled = !signalReady));
}
function submitNote(n, fromNetwork = false) {
  if (mode !== "signal" || !signalReady || !Number.isInteger(n) || n < 0 || n > 2) return;
  if (!authority() && !fromNetwork) {
    network.sendAction({ note: n });
    return;
  }
  signalSound(n);
  if (n === pattern[signalIndex]) {
    $("signal-seq").children[signalIndex].classList.add("lit");
    signalIndex++;
    if (signalIndex === pattern.length) {
      toast("Someone out there was listening.");
      audio.sfx("launch");
      beginFlight();
    }
  } else {
    signalIndex = 0;
    [...$("signal-seq").children].forEach((e) => e.classList.remove("lit"));
    $("signal-instruction").textContent = "Almost. Try the four little symbols again. No hurry.";
    audio.voice("curious");
  }
}
function beginFlight() {
  phase = "flight";
  mode = "play";
  showScreen(null);
  $("hud").classList.remove("hidden");
  if (inventory.length < 3) {
    inventory = world.targets.map((t) => t.id);
    world.targets.forEach((t) => (t.mesh.visible = false));
  }
  flightDistance = 0;
  flightY = 3;
  body.setGravityScale(0, true);
  teleport(0, -44, 3);
  if (friendBody?.isEnabled()) {
    friendBody.setGravityScale(0, true);
    friendBody.setTranslation({ x: -2.5, y: 3, z: -42 }, true);
    friendBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    players[1].position.set(-2.5, 2.1, -42);
  }
  cameraAngle = 0;
  audio.setMood("flight");
  say("Hold on. I think he has one more trick.", "THE KID", 6);
  spawnRing(0, 0.2, -44, 0xffdb9e, 12);
  saveCheckpoint();
  updatePrompts();
}
function winGame() {
  if (mode === "win") return;
  phase = "complete";
  mode = "win";
  winTimer = 0;
  showScreen("win");
  $("hud").classList.add("hidden");
  $("dialogue").classList.add("hidden");
  audio.setMood("win");
  audio.sfx("win");
  $("win-stats").textContent =
    `${stars} / ${world.hoops.length} starlight rings · ${flowersHealed} flowers awakened · One friend, safely home.`;
  if (!attract) {
    try {
      localStorage.removeItem("moonward-save");
      $("continue-button").classList.add("hidden");
    } catch {}
  }
  if (network.hubActive) network.finish(true, 100 + stars * 10 + flowersHealed * 20);
}
function finishHub() {
  network.finish(phase === "complete", inventory.length * 100 + stars * 10 + flowersHealed * 20);
}
function updateHUD() {
  if (!world) return;
  const objective =
    phase === "scavenge"
      ? "A few things from around the block"
      : phase === "signal"
        ? "Find a place the sky can hear us"
        : phase === "flight"
          ? "The sky is ours tonight"
          : "A little less far away";
  $("chapter").textContent =
    phase === "scavenge"
      ? "01 / SPARE PARTS & SMALL MIRACLES"
      : phase === "signal"
        ? "02 / A QUESTION FOR THE STARS"
        : "03 / OVER THE MOON";
  $("objective").textContent = objective;
  const next = world.targets.find((t) => !inventory.includes(t.id));
  $("subobjective").textContent =
    phase === "scavenge"
      ? next
        ? next.name + " · follow the golden lights"
        : ""
      : phase === "signal"
        ? "Ride north to the old forest clearing"
        : `Follow the rings · ${Math.round(flightDistance)} / 184 m · Hold ${prompt("pulse")} to rise`;
  $("part-counter").textContent = phase === "flight" ? stars + " ✦" : inventory.length + " / 3";
  $("bond-fill").style.width = bond + "%";
  $("alert-banner").textContent =
    alert > 15
      ? "SEARCHLIGHTS NEARBY · " + (input.sneak ? "KEEP QUIET" : "SNEAK OR GLOW TO SLIP AWAY")
      : "";
  const near = mode === "play" ? nearestInteraction() : null;
  $("interaction").classList.toggle("hidden", !near || attract);
  if (near) $("interaction").innerHTML = `<b class="key">${prompt("interact")}</b>${near.text}`;
  $("touch-action").style.display = lastInput === "touch" && mode === "play" ? "block" : "none";
  $("touch-action").textContent = near ? "HELP" : phase === "flight" ? "LIFT" : "GLOW";
  drawMap();
}
function drawMap() {
  const c = mapCtx,
    w = 220,
    p = localPosition();
  c.clearRect(0, 0, w, w);
  c.fillStyle = "#132e3b";
  c.fillRect(0, 0, w, w);
  c.save();
  c.translate(110, 110);
  const scale = phase === "flight" ? 1.8 : 2.25;
  c.scale(scale, scale);
  c.translate(-p.x, -p.z);
  c.strokeStyle = "#3f5b60";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(0, 35);
  c.lineTo(0, -250);
  c.moveTo(-35, 3);
  c.lineTo(35, 3);
  c.stroke();
  c.lineWidth = 0.3;
  world.agents.forEach((a) => {
    c.fillStyle = a.stunned > 0 ? "#8cd8bb" : "#eea377";
    c.beginPath();
    c.arc(a.x, a.z, 1.3, 0, 7);
    c.fill();
  });
  world.targets.forEach((t) => {
    if (!inventory.includes(t.id)) {
      c.fillStyle = "#ffdb93";
      c.beginPath();
      c.arc(t.x, t.z, 1.7, 0, 7);
      c.fill();
    }
  });
  if (inventory.length === 3) {
    c.strokeStyle = "#a6e1cc";
    c.beginPath();
    c.arc(0, -35, 2, 0, 7);
    c.stroke();
  }
  if (phase === "flight") {
    world.hoops.forEach((h) => {
      if (!h.collected) {
        c.fillStyle = "#ffdb93";
        c.fillRect(h.x - 1, h.z - 1, 2, 2);
      }
    });
  }
  c.fillStyle = "#ffebc3";
  c.beginPath();
  c.arc(p.x, p.z, 1.6, 0, 7);
  c.fill();
  c.restore();
  c.fillStyle = "#9db8b9";
  c.font = "11px sans-serif";
  c.textAlign = "center";
  c.fillText("N", 110, 20);
}
function autoInput(dt) {
  attractTimer += dt;
  const p = body.translation();
  if (phase === "scavenge") {
    const target =
      flowersHealed === 0 ? world.flowers[0] : world.targets.find((t) => !inventory.includes(t.id));
    if (target) {
      const dx = target.x - p.x,
        dz = target.z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 2.4) {
        interact();
        return { x: 0, z: 0, sneak: false, lift: false };
      }
      if (attractTimer > 8) {
        teleport(target.x, target.z + 1);
        attractTimer = 0;
      }
      if (pulseCooldown === 0 && alert > 10) pulse();
      return { x: dx / Math.max(0.1, d), z: dz / Math.max(0.1, d), sneak: false, lift: false };
    }
  }
  if (phase === "signal") {
    const dx = -p.x,
      dz = -35 - p.z,
      d = Math.hypot(dx, dz);
    if (d < 3) {
      beginSignal();
      attractTimer = 0;
    } else if (attractTimer > 8) {
      teleport(0, -33);
      attractTimer = 0;
    }
    return { x: dx / Math.max(0.1, d), z: dz / Math.max(0.1, d), sneak: false, lift: false };
  }
  if (phase === "flight") {
    const h = world.hoops.find((h) => !h.collected && h.z < p.z);
    return {
      x: h ? clamp((h.x - p.x) * 0.5, -1, 1) : 0,
      z: 0,
      sneak: false,
      lift: h ? p.y < h.y : true,
    };
  }
  return { x: 0, z: 0, sneak: false, lift: false };
}
function checkFlightHazards(p) {
  for (const h of world.hazards || []) {
    if (!h.hit && Math.abs(p.z - h.z) < 3 && Math.hypot(p.x - h.x, p.y - h.y) < h.radius + 0.4) {
      h.hit = true;
      if (!god && !attract) bond = Math.max(15, bond - 28);
      audio.sfx("alert");
      spawnRing(h.x, 0.2, h.z, 0xffa47e, 5);
      particleBurst(p.x, p.y, p.z, 0xffb284, 12);
      toast("A close call! Hold " + prompt("pulse") + " to clear the vans.");
    }
  }
}
function updateEnding(dt) {
  winTimer += dt;
  world.update((clockTime += dt), dt);
  players.forEach((p) => {
    p.position.y = lerp(p.position.y, 0.08, Math.min(1, dt * 1.5));
    p.rotation.z = lerp(p.rotation.z, 0, dt * 3);
  });
  alien.position.lerp(new THREE.Vector3(0, 3.8, -235), Math.min(1, dt * 0.8));
  alien.scale.setScalar(lerp(alien.scale.x, 0.9, dt));
  if (winTimer > 3.6 && alien.visible) {
    particleBurst(0, 4, -235, 0x9ee9c8, 35);
    alien.visible = false;
  }
  updateEffects(dt);
  if (attract && winTimer > 6) startGame({ demo: true });
}
function simulate(dt, controls) {
  clockTime += dt;
  pulseCooldown = Math.max(0, pulseCooldown - dt);
  elapsed += dt;
  if (god || attract) bond = 100;
  const p = body.translation();
  moving = Math.hypot(controls.x, controls.z) > 0.1;
  if (phase === "flight") {
    checkFlightHazards(p);
    const targetY = controls.lift ? 8.5 : 2.2;
    const yVel = clamp((targetY - p.y) * 1.8, -3, 4);
    body.setLinvel(
      { x: controls.x * 7.8, y: yVel, z: -balance.flightSpeed * (controls.sneak ? 1.35 : 1) },
      true,
    );
    flightDistance = Math.max(0, -p.z - 44);
    if (lastInput === "touch") {
      const next = world.hoops.find((h) => !h.collected && h.z < p.z);
      if (next)
        body.setLinvel(
          {
            x: clamp((next.x - p.x) * 1.3, -6, 6),
            y: clamp((next.y - p.y) * 2, -3, 4),
            z: -balance.flightSpeed,
          },
          true,
        );
    }
    for (const h of world.hoops) {
      if (!h.collected && Math.abs(p.z - h.z) < 2.5 && Math.hypot(p.x - h.x, p.y - h.y) < 3.2) {
        h.collected = true;
        h.mesh.visible = false;
        stars++;
        bond = clamp(bond + 5, 0, 100);
        audio.sfx("pickup");
        particleBurst(h.x, h.y, h.z);
      }
    }
    if (p.z < -228) winGame();
    players[0].rotation.y = lerp(players[0].rotation.y, Math.PI + controls.x * 0.22, dt * 5);
    players[0].rotation.z = lerp(players[0].rotation.z, -controls.x * 0.2, dt * 3);
  } else {
    const speed = controls.sneak ? balance.sneakSpeed : balance.rideSpeed;
    const vel = body.linvel();
    body.setLinvel({ x: controls.x * speed, y: vel.y, z: controls.z * speed }, true);
    if (moving) {
      let target = Math.atan2(controls.x, controls.z);
      let d =
        THREE.MathUtils.euclideanModulo(target - players[0].rotation.y + Math.PI, Math.PI * 2) -
        Math.PI;
      players[0].rotation.y += d * Math.min(1, dt * 9);
    }
    players[0].rotation.z = 0;
    bond = clamp(bond + balance.bondRegen * dt, 0, 100);
    let detected = false;
    world.agents.forEach((a) => {
      a.stunned = Math.max(0, a.stunned - dt);
      a.mesh.position.set(a.x, 0, a.z);
      if (a.stunned > 0) return;
      const dx = p.x - a.x,
        dz = p.z - a.z,
        dist = Math.hypot(dx, dz);
      const dirX = Math.sin(a.mesh.rotation.y),
        dirZ = Math.cos(a.mesh.rotation.y);
      const cone = (dx * dirX + dz * dirZ) / Math.max(0.1, dist) > 0.65;
      if (dist < (controls.sneak ? 3 : 7.8) && cone) {
        detected = true;
        bond -= dt * balance.alertRate * (controls.sneak ? 0.2 : 1);
        if (alert < 8) audio.sfx("alert");
        alert = clamp(alert + dt * 40, 0, 100);
      }
    });
    if (!detected) alert = Math.max(0, alert - dt * 28);
    if ((god || attract) && bond < 100) bond = 100;
    if (bond <= 0) {
      catchCount++;
      bond = 75;
      alert = 0;
      teleport(0, 18);
      say("We lost them. Let’s take the quiet way this time.", "THE KID", 6);
      toast("Safe in the garden · borrowed parts kept");
    }
    for (const candy of world.candies) {
      if (!candy.collected && Math.hypot(candy.x - p.x, candy.z - p.z) < 1.5) {
        candy.collected = true;
        candy.mesh.visible = false;
        bond = clamp(bond + 10, 0, 100);
        audio.sfx("pickup");
        particleBurst(candy.x, 0.8, candy.z, 0xeebd90, 8);
      }
    }
  }
  const friendControls = seatControls(1);
  prepareFriend(dt, friendControls);
  physics.timestep = dt;
  physics.step();
  const np = body.translation();
  if (phase !== "flight") {
    if (Math.abs(np.x) > 34 || np.z > 34 || np.z < -42)
      body.setTranslation({ x: clamp(np.x, -34, 34), y: np.y, z: clamp(np.z, -42, 34) }, true);
  } else if (Math.abs(np.x) > 16)
    body.setTranslation({ x: clamp(np.x, -16, 16), y: np.y, z: np.z }, true);
  players[0].position.set(np.x, np.y - 0.9, np.z);
  players[0].userData.mixer.timeScale = phase === "flight" ? 1.5 : moving ? 1 : 0.15;
  players[0].userData.mixer.update(dt);
  const follow =
    phase === "flight"
      ? new THREE.Vector3(0, 1.6, 0.95)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), players[0].rotation.y)
          .add(players[0].position)
      : new THREE.Vector3(np.x + 1.3, 0.1, np.z + 1.5);
  alien.position.lerp(follow, Math.min(1, dt * (phase === "flight" ? 15 : 3)));
  alien.scale.setScalar(phase === "flight" ? 0.65 : 1);
  alien.rotation.y = phase === "flight" ? Math.PI : players[0].rotation.y;
  alien.userData.mixer.timeScale = phase === "flight" ? 0.2 : moving ? 1 : 0.2;
  alien.userData.mixer.update(dt);
  world.flowers.forEach((f) => {
    if (f.healed) {
      f.mesh.scale.lerp(new THREE.Vector3(1.4, 1.4, 1.4), dt * 2);
    }
  });
  updateFriend(dt, friendControls);
  world.update(clockTime, dt);
  updateEffects(dt);
  updateTrail();
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.t += dt;
    const f = e.t / e.duration;
    if (e.v) {
      e.mesh.position.addScaledVector(e.v, dt);
      e.v.y -= dt * 3;
      e.mesh.rotation.x += dt * 3;
    } else e.mesh.scale.setScalar(lerp(0.1, e.size, f));
    e.mesh.material.opacity = 1 - f;
    if (f >= 1) {
      scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
      effects.splice(i, 1);
    }
  }
}
function updateTrail() {
  const p = localPosition();
  const target =
    phase === "scavenge"
      ? world.targets.find((t) => !inventory.includes(t.id))
      : phase === "signal"
        ? { x: 0, z: -35 }
        : null;
  trail.forEach((m, i) => {
    m.visible = !!target;
    if (target) {
      const a = (i + 1) / (trail.length + 2);
      m.position.set(
        lerp(p.x, target.x, a),
        0.2 + Math.sin(clockTime * 2 + i) * 0.08,
        lerp(p.z, target.z, a),
      );
      m.scale.setScalar(0.7 + Math.sin(clockTime * 3 + i * 0.5) * 0.2);
    }
  });
}
function snapshot() {
  return {
    mode: ["pause", "settings", "about", "coop", "dev"].includes(mode) ? "pause" : mode,
    pausedFrom,
    phase,
    bond,
    inventory,
    flowersHealed,
    stars,
    pulses,
    elapsed,
    alert,
    flightDistance,
    clockTime,
    signalIndex,
    signalTimer,
    signalShow,
    signalReady,
    players: players.map((p) => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      r: p.rotation.y,
      roll: p.rotation.z,
      visible: p.visible,
    })),
    alien: {
      x: alien.position.x,
      y: alien.position.y,
      z: alien.position.z,
      r: alien.rotation.y,
      scale: alien.scale.x,
    },
    agents: world.agents.map((a) => ({ x: a.x, z: a.z, r: a.mesh.rotation.y, stunned: a.stunned })),
    flowers: world.flowers.map((f) => f.healed),
    candies: world.candies.map((c) => c.collected),
    hazards: (world.hazards || []).map((h) => h.hit),
    hoops: world.hoops.map((h) => h.collected),
  };
}
function applySnapshot(s) {
  if (!ready || authority() || !s || network.info.ended) return;
  const previousPhase = phase,
    previousInventory = inventory.length,
    previousPulses = pulses,
    previousShow = signalShow;
  phase = s.phase;
  bond = s.bond;
  inventory = s.inventory || [];
  flowersHealed = s.flowersHealed;
  stars = s.stars;
  pulses = s.pulses;
  elapsed = s.elapsed;
  alert = s.alert;
  flightDistance = s.flightDistance;
  clockTime = s.clockTime ?? clockTime;
  pausedFrom = s.pausedFrom || "play";
  if (s.mode === "win") {
    if (mode !== "win") winGame();
  } else if (s.mode === "signal") {
    if (mode !== "signal") {
      mode = "signal";
      showScreen("signal");
      $("signal-seq").innerHTML = pattern.map(() => '<span class="signal-dot">·</span>').join("");
    }
    signalIndex = s.signalIndex ?? 0;
    signalTimer = s.signalTimer ?? 0;
    signalShow = s.signalShow ?? -1;
    signalReady = !!s.signalReady;
    [...$("signal-seq").children].forEach((e, i) => {
      e.classList.toggle("lit", signalReady ? i < signalIndex : i === signalShow);
      e.textContent = signalReady || i === signalShow ? ["◒", "✦", "☾"][pattern[i]] : "·";
    });
    $("signal-instruction").textContent = signalReady
      ? "Your turn. Send the lights back, one by one."
      : "Listen to the little lights. Then send their song back.";
    document.querySelectorAll("[data-note]").forEach((b) => (b.disabled = !signalReady));
    if (!signalReady && signalShow >= 0 && signalShow !== previousShow)
      signalSound(pattern[signalShow]);
    $("hud").classList.remove("hidden");
  } else if (s.mode === "pause") {
    if (!["pause", "settings", "about", "coop", "dev"].includes(mode)) {
      mode = "pause";
      showScreen("pause");
    }
    $("hud").classList.add("hidden");
  } else if (s.mode === "play") {
    if (mode !== "play") {
      mode = "play";
      showScreen(null);
      $("hud").classList.remove("hidden");
    }
  } else if (s.mode === "title" || s.mode === "waiting") {
    if (mode !== "waiting") {
      mode = "waiting";
      showScreen(null);
      $("hud").classList.add("hidden");
      toast("Your friend is choosing the next adventure.");
    }
  }
  s.players?.forEach((p, i) => {
    if (players[i]) {
      players[i].position.set(p.x, p.y, p.z);
      players[i].rotation.set(0, p.r, p.roll || 0);
      players[i].visible = p.visible;
      if (i === 0) body.setTranslation({ x: p.x, y: p.y + 0.9, z: p.z }, true);
    }
  });
  if (s.alien) {
    alien.position.set(s.alien.x, s.alien.y, s.alien.z);
    alien.rotation.y = s.alien.r || 0;
    alien.scale.setScalar(s.alien.scale || 1);
  }
  s.agents?.forEach((a, i) => {
    const target = world.agents[i];
    if (target) {
      target.x = a.x;
      target.z = a.z;
      target.stunned = a.stunned;
      target.mesh.position.set(a.x, 0, a.z);
      target.mesh.rotation.y = a.r;
    }
  });
  world.targets.forEach((t) => (t.mesh.visible = !inventory.includes(t.id)));
  s.flowers?.forEach((v, i) => {
    if (world.flowers[i]) world.flowers[i].healed = v;
  });
  s.candies?.forEach((v, i) => {
    if (world.candies[i]) {
      world.candies[i].collected = v;
      world.candies[i].mesh.visible = !v;
    }
  });
  s.hazards?.forEach((v, i) => {
    if (world.hazards?.[i]) world.hazards[i].hit = v;
  });
  s.hoops?.forEach((v, i) => {
    if (world.hoops[i]) {
      world.hoops[i].collected = v;
      world.hoops[i].mesh.visible = !v;
    }
  });
  if (inventory.length > previousInventory) audio.sfx("pickup");
  if (pulses > previousPulses) {
    const p = localPosition();
    spawnRing(p.x, 0.2, p.z, 0x9eeacc, 8);
    audio.sfx("pulse");
  }
  if (phase !== previousPhase) {
    updatePrompts();
    audio.setMood(phase === "flight" ? "flight" : "explore");
    if (phase === "flight") cameraAngle = 0;
  }
  lastRemoteMode = s.mode;
  updateHUD();
}
function updateCamera(dt) {
  if (!body) return;
  const hero = players[currentSlot()]?.visible ? players[currentSlot()] : players[0],
    p = hero.position;
  let target, look;
  if (mode === "title") {
    target = new THREE.Vector3(21, 15, 32);
    look = new THREE.Vector3(-1, 1, -4);
  } else if (phase === "flight") {
    target = new THREE.Vector3(p.x * 0.6 + 1, p.y + 5, p.z + 19);
    look = new THREE.Vector3(p.x, p.y + 1, p.z - 13);
  } else if (mode === "win") {
    target = new THREE.Vector3(13, 11, -210);
    look = new THREE.Vector3(0, 4, -235);
  } else {
    target = new THREE.Vector3(
      p.x + Math.sin(cameraAngle) * 22,
      p.y + 19,
      p.z + Math.cos(cameraAngle) * 22,
    );
    look = new THREE.Vector3(p.x, 1.2, p.z - 4);
  }
  camera.position.lerp(target, Math.min(1, dt * 3));
  camera.lookAt(look);
  if (mode === "title" || phase === "scavenge" || phase === "signal") {
    world.lighting.moon.position.set(-5, 12.6, -105);
    world.lighting.moon.scale.setScalar(1);
  } else if (phase === "flight") {
    world.lighting.moon.position.set(p.x - 8, p.y + 30, p.z - 180);
    world.lighting.moon.scale.setScalar(2.8);
  }
}
function frame(now) {
  if (!ready) return;
  const dt = Math.min((now - lastFrame) / 1000 || 0.016, 0.06);
  lastFrame = now;
  const controls = readInput(dt) || neutralControls();
  input.sneak = controls.sneak;
  if (network.active && network.running && !network.isServer)
    network.sendInput(mode === "play" ? controls : neutralControls());
  if (authority() && network.running) processRemoteActions();
  if (mode === "title" && !network.hubActive && authority()) {
    titleIdle += dt;
    world.update((clockTime += dt), dt);
    alien.userData.mixer.update(dt * 0.2);
    if (titleIdle >= 10) startGame({ demo: true });
  }
  if (mode === "play" && network.running) {
    if (authority()) {
      const c = attract ? autoInput(dt) : seatControls(0, controls);
      accumulator += dt;
      let count = 0;
      while (accumulator >= 1 / 60 && count++ < 4) {
        simulate(1 / 60, c);
        accumulator -= 1 / 60;
      }
    } else {
      world.update(clockTime, dt);
      players.forEach((p) => p.userData.mixer.update(dt));
      alien.userData.mixer.update(dt);
      updateEffects(dt);
      updateTrail();
    }
  } else if (mode === "signal" && authority() && network.running) {
    updateSignal(dt);
    if (attract && signalReady) {
      attractTimer += dt;
      if (attractTimer > 0.5) {
        submitNote(pattern[signalIndex]);
        attractTimer = 0;
      }
    }
  } else if (mode === "win") {
    updateEnding(dt);
  }
  if (authority() && network.active && network.running) network.broadcast(snapshot());
  if (dialogueTimer > 0) {
    dialogueTimer -= dt;
    if (dialogueTimer <= 0) $("dialogue").classList.add("hidden");
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $("toast").classList.add("hidden");
  }
  if (mode !== "ended") audio.update(dt);
  if (!network.isServer) updateCamera(dt);
  if (mode === "play") updateHUD();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
let lastFrame = performance.now();
async function init() {
  try {
    await RAPIER.init();
    physics = new RAPIER.World({ x: 0, y: -18, z: 0 });
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x15283d);
    scene.fog = new THREE.Fog(0x15283d, 65, 155);
    camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 400);
    camera.position.set(21, 15, 32);
    renderer = new THREE.WebGPURenderer({
      canvas: $("world"),
      antialias: true,
      alpha: false,
      forceWebGL: new URLSearchParams(location.search).has("webgl"),
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    await renderer.init();
    const data = new Uint8Array([65, 135, 205, 255]);
    gradient = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
    gradient.needsUpdate = true;
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    world = buildWorld(THREE, scene, physics, { RAPIER, gradient });
    const ground = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    physics.createCollider(
      RAPIER.ColliderDesc.cuboid(75, 0.2, 180).setTranslation(0, -0.2, -100),
      ground,
    );
    body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 1.25, 18)
        .lockRotations()
        .setLinearDamping(6)
        .setCcdEnabled(true),
    );
    physics.createCollider(
      RAPIER.ColliderDesc.capsule(0.4, 0.46).setFriction(0).setRestitution(0),
      body,
    );
    players = [makeCharacter(), makeCharacter(false, 0x79a9a2)];
    players.forEach((p) => scene.add(p));
    players[1].visible = false;
    players[1].position.set(-2, 0.1, 19);
    alien = makeCharacter(true);
    scene.add(alien);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.075),
        new THREE.MeshBasicMaterial({ color: 0xffd789 }),
      );
      scene.add(m);
      trail.push(m);
    }
    teleport(0, 18);
    renderCredits($("credits-content"));
    for (const [id, value] of Object.entries({
      music: settings.music ?? 10,
      sfx: settings.sfx ?? 75,
      camera: Math.round((settings.cameraSensitivity ?? 1) * 100),
    })) {
      $(id).value = value;
      $(id).dispatchEvent(new Event("input"));
    }
    glyphs = settings.glyphs || "ps";
    captions = settings.captions ?? true;
    $("glyph-toggle").textContent = glyphs === "ps" ? "PlayStation" : "Xbox";
    $("captions-toggle").textContent = captions ? "On" : "Off";
    saveSettings();
    try {
      if (localStorage.getItem("moonward-save")) $("continue-button").classList.remove("hidden");
    } catch {}
    camera.lookAt(-1, 1, -4);
    await renderer.compileAsync(scene, camera);
    ready = true;
    await network.connect();
    network.ready();
    $("loading").classList.add("hidden");
    if (!network.hubActive) {
      showScreen("title");
    } else {
      mode = "waiting";
      showScreen(null);
    }
    updatePrompts();
    requestAnimationFrame(frame);
    window.addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  } catch (error) {
    console.error(error);
    $("loading-message").textContent = "This little world could not start: " + error.message;
    const b = document.createElement("button");
    b.className = "pill";
    b.textContent = "Try again";
    b.onclick = () => location.reload();
    $("loading").append(b);
  }
}
window.__game = {
  getState: () => ({
    ready,
    mode,
    phase,
    players: players.map((p) => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      visible: p.visible,
    })),
    localPlayer: localPosition(),
    attract,
    lastInput,
    inputMode: lastInput,
    player: body ? body.translation() : null,
    inventory: [...inventory],
    bond,
    alert,
    stars,
    flowersHealed,
    pulses,
    pulseCooldown,
    signalReady,
    signalIndex,
    pattern: [...pattern],
    flightDistance,
    elapsed,
    balance: { ...balance },
    god,
    targets: world?.targets.map(({ id, name, x, z }) => ({ id, name, x, z })),
    flowers: world?.flowers.map(({ x, z, healed }) => ({ x, z, healed })),
    hoops: world?.hoops.map(({ x, y, z, collected }) => ({ x, y, z, collected })),
    hazards: world?.hazards?.map(({ x, y, z, radius, hit }) => ({ x, y, z, radius, hit })),
    network: network.info,
  }),
  start: startGame,
  advance(seconds) {
    for (let t = 0; t < seconds; t += 1 / 60) {
      const dt = 1 / 60;
      if (mode === "play")
        simulate(
          dt,
          attract ? autoInput(dt) : { x: 0, z: 0, sneak: false, lift: phase === "flight" },
        );
      else if (mode === "signal") {
        updateSignal(dt);
        if (attract && signalReady) {
          attractTimer += dt;
          if (attractTimer > 0.5) {
            submitNote(pattern[signalIndex]);
            attractTimer = 0;
          }
        }
      } else if (mode === "win") updateEnding(dt);
      else if (mode === "title") {
        titleIdle += dt;
        if (titleIdle >= 10) startGame({ demo: true });
      }
    }
    updateHUD();
  },
  teleport,
  interact,
  pulse,
  dev: devAction,
  submitNote,
  beginSignal,
  beginFlight,
  pause,
  resume,
  toTitle,
  renderInfo: () => ({
    backend: renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2",
    three: THREE.REVISION,
    rapier: RAPIER.version(),
    animationMixers: players.length + 1,
    drawCalls: renderer?.info?.render?.calls,
  }),
  audioDebug: () => audio.debug(),
  audio,
  network,
  snapshot,
};
init();
