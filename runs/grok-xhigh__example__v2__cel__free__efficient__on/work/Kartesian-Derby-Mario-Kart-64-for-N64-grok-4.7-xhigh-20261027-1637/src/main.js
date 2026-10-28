import { createAudio } from "./audio.js";
import { CHARACTERS, fieldEntrants } from "./characters.js";
import { BALLOON_YARD, CINDER_LOOP, COURSES, courseById } from "./courses.js";
import { ABOUT_TEXT } from "./credits.js";
import { CONTROL_LINES, TOUCH_MESSAGE, drivingActions, menuEdges, neutralAction, seedHeldMenu, touchGateVisible } from "./input.js";
import { ITEM_IDS, itemName } from "./items.js";
import { formatTime, ordinal } from "./math.js";
import { createCup, createSession, noteTrial, playerPlace, recordCupResult, stepSession } from "./modes.js";
import { bodyTranslation, createRaceWorld, pushBody, stepWorld } from "./physics.js";
import { createRace, finishOrder, stepRace } from "./race.js";
import {
  animateScene,
  buildScene,
  createRenderer,
  disposeScene,
  fitBuffer,
  frameCamera,
  orbitCamera,
  viewports,
} from "./scene.js";
import { GAME_TITLE } from "./titles.js";

const TITLE_ITEMS = [
  { id: "cup", label: "Grand Cup", detail: "Two courses. Place fourth or better, or you drive it again." },
  { id: "versus", label: "Versus", detail: "Two, three, or four drivers. One course. Bragging rights only." },
  { id: "trial", label: "Time Trial", detail: "No crates on the road. Three peppers already in your pocket." },
  { id: "battle", label: "Balloon Battle", detail: "Three balloons each. Last one still floating wins the yard." },
  { id: "help", label: "How to Drive", detail: "Triggers, stick, hop. Then the items." },
  { id: "settings", label: "Settings", detail: "Flip a stick if the derby feels backwards." },
  { id: "about", label: "About", detail: "Credits, the source, and how this slice was built." },
];

const CAM_CYCLE = ["chase", "far", "bumper"];
const session = createSession();
const draft = {
  mode: "cup",
  courseId: CINDER_LOOP.id,
  playerCount: 2,
  characters: ["pip", "quill", "bramble", "holt"],
  slot: 0,
};
const audio = createAudio();
const keys = Object.create(null);
const mouse = { dx: 0, dy: 0, buttons: [false, false, false, false], wheel: false };
const drivePrev = [neutralAction(), neutralAction(), neutralAction(), neutralAction()];
let menuPrev = neutralAction();
let cup = null;
let race = null;
let sim = null;
let renderer = null;
let outcome = null;
let recorded = false;
let attractCourse = 0;
let busy = false;
let swallow = false;
let lastFrame = 0;
let renderKey = "";
const camModes = ["chase", "chase", "chase", "chase"];

function $(id) {
  return document.getElementById(id);
}

function readPads() {
  if (!navigator.getGamepads) return [];
  return [...navigator.getGamepads()].filter(Boolean).map((pad) => ({
    axes: [pad.axes[0] || 0, pad.axes[1] || 0, pad.axes[2] || 0, pad.axes[3] || 0],
    buttons: pad.buttons.map((button) => button.value || (button.pressed ? 1 : 0)),
  }));
}

function inputAny(pads) {
  if (Object.keys(keys).some((code) => keys[code])) return true;
  if (mouse.buttons.some(Boolean) || mouse.wheel || Math.abs(mouse.dx) > 2) return true;
  return pads.some((pad) => pad.buttons.some((value) => value > 0.45) || Math.abs(pad.axes[0]) > 0.4 || Math.abs(pad.axes[1]) > 0.4);
}

function saveSession() {
  try {
    localStorage.setItem("kartesian-derby", JSON.stringify({
      settings: session.settings,
      trialBest: session.trialBest,
    }));
  } catch (err) {
    /* storage can be blocked; the session still remembers */
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem("kartesian-derby");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.settings) {
      session.settings.invertX = !!data.settings.invertX;
      session.settings.invertY = !!data.settings.invertY;
    }
    if (data.trialBest && typeof data.trialBest === "object") session.trialBest = data.trialBest;
  } catch (err) {
    /* ignore unreadable storage */
  }
}

function destroySim() {
  if (!sim) return;
  disposeScene(sim.view);
  try {
    sim.world.free();
  } catch (err) {
    /* world already released */
  }
  sim = null;
}

async function mountSim(course, nextRace, parked) {
  destroySim();
  const phys = await createRaceWorld(course);
  const view = buildScene(course, nextRace);
  sim = { course, race: nextRace, world: phys.world, cone: phys.cone, view, parked: !!parked };
}

async function showLot() {
  const parked = createRace({
    course: CINDER_LOOP,
    mode: "versus",
    entrants: fieldEntrants(["pip", "quill", "bramble", "holt"], "versus"),
    seed: 1,
  });
  race = null;
  await mountSim(CINDER_LOOP, parked, true);
}

async function launch(mode) {
  if (busy) return;
  busy = true;
  audio.unlock();
  try {
    if (mode === "cup") {
      if (!cup || cup.index >= cup.courseIds.length) cup = createCup();
      draft.courseId = cup.courseIds[cup.index];
    }
    const course = mode === "battle" ? BALLOON_YARD : courseById(draft.courseId);
    const count = mode === "cup" || mode === "trial" ? 1 : draft.playerCount;
    const ids = draft.characters.slice(0, count);
    race = createRace({
      course,
      mode,
      entrants: fieldEntrants(ids, mode),
      seed: Math.floor(Math.random() * 1e9),
    });
    recorded = false;
    outcome = null;
    camModes.fill("chase");
    await mountSim(course, race, false);
    session.screen = "race";
    session.focus = 0;
    session.idle = 0;
    renderKey = "";
    renderAll();
  } finally {
    busy = false;
  }
}

async function launchAttract() {
  const course = COURSES[attractCourse % COURSES.length];
  attractCourse += 1;
  race = createRace({
    course,
    mode: "cup",
    entrants: fieldEntrants([], "cup"),
    attract: true,
    seed: 20 + attractCourse,
  });
  recorded = false;
  await mountSim(course, race, false);
  session.screen = "attract";
  renderKey = "";
  renderAll();
}

function choiceButton(label, selected, onPress) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = selected ? "choice is-selected" : "choice";
  button.textContent = label;
  button.addEventListener("click", () => {
    audio.unlock();
    onPress();
  });
  return button;
}

function paintList(panel, rows) {
  rows.forEach((row, index) => {
    const button = choiceButton(row.label, index === session.focus, () => {
      session.focus = index;
      activate();
    });
    if (session.screen === "title" && row.id === "cup") button.id = "start-game";
    panel.appendChild(button);
    if (row.detail && index === session.focus) {
      const note = document.createElement("p");
      note.className = "detail";
      note.textContent = row.detail;
      panel.appendChild(note);
    }
  });
}

function currentRows() {
  if (session.screen === "title") return TITLE_ITEMS;
  if (session.screen === "help") return [{ id: "back", label: "Back" }];
  if (session.screen === "players") {
    return [
      { id: "2", label: "Two drivers" },
      { id: "3", label: "Three drivers" },
      { id: "4", label: "Four drivers" },
      { id: "back", label: "Back" },
    ];
  }
  if (session.screen === "course") {
    return [
      ...COURSES.map((course) => ({ id: course.id, label: course.name, detail: course.blurb })),
      { id: "back", label: "Back" },
    ];
  }
  if (session.screen === "settings") {
    return [
      { id: "invertX", label: `Invert horizontal: ${session.settings.invertX ? "On" : "Off"}` },
      { id: "invertY", label: `Invert vertical: ${session.settings.invertY ? "On" : "Off"}` },
      { id: "back", label: "Back" },
    ];
  }
  if (session.screen === "pause") {
    return [
      { id: "resume", label: "Resume" },
      { id: "quit", label: "Quit to title" },
    ];
  }
  if (session.screen === "results") {
    let label = "Back to title";
    if (outcome && outcome.action === "retry") label = "Drive it again";
    if (outcome && outcome.action === "continue") label = "Next course";
    return [{ id: "continue", label }];
  }
  if (session.screen === "about") return [{ id: "back", label: "Back" }];
  return [];
}

function paintCharacters(panel) {
  const count = draft.mode === "cup" || draft.mode === "trial" ? 1 : draft.playerCount;
  const lead = document.createElement("p");
  lead.className = "detail";
  lead.textContent = count === 1
    ? "Left and right change your driver. Confirm when they look ready."
    : "Up and down pick a seat. Left and right change that driver.";
  panel.appendChild(lead);
  for (let i = 0; i < count; i++) {
    const character = CHARACTERS.find((entry) => entry.id === draft.characters[i]) || CHARACTERS[0];
    const button = choiceButton(
      `${count > 1 ? `Driver ${i + 1}: ` : ""}${character.name} · ${character.klass}`,
      i === draft.slot,
      () => {
        draft.slot = i;
        activate();
      },
    );
    panel.appendChild(button);
    if (i === draft.slot) {
      const note = document.createElement("p");
      note.className = "detail";
      note.textContent = character.blurb;
      panel.appendChild(note);
    }
  }
  panel.appendChild(choiceButton("Back", false, () => {
    session.screen = draft.mode === "battle" ? "players" : "course";
    if (draft.mode === "cup") session.screen = "title";
    session.focus = 0;
    renderKey = "";
    renderAll();
  }));
}

function paintHelp(panel) {
  const list = document.createElement("div");
  list.className = "help";
  for (const [name, action] of CONTROL_LINES) {
    const row = document.createElement("p");
    const key = document.createElement("strong");
    key.textContent = name;
    row.append(key, document.createTextNode(`  ${action}`));
    list.appendChild(row);
  }
  panel.appendChild(list);
}

function paintResults(panel) {
  if (!race) return;
  const order = finishOrder(race);
  const list = document.createElement("ol");
  list.className = "results";
  for (const row of order) {
    const item = document.createElement("li");
    const time = row.time != null ? `  ${formatTime(row.time)}` : "";
    const balloons = race.mode === "battle" ? `  ${row.eliminated ? "out" : `${row.balloons} balloons`}` : "";
    item.textContent = `${row.name}${time}${balloons}`;
    list.appendChild(item);
  }
  panel.appendChild(list);
  const note = document.createElement("p");
  note.className = "detail";
  if (race.mode === "cup" && outcome) {
    note.textContent = outcome.action === "retry"
      ? `P${outcome.place} is not enough. Fourth or better continues. Points stay ${outcome.total}.`
      : outcome.action === "continue"
        ? `P${outcome.place} banks ${outcome.gain}. Cup total ${outcome.total}. Next course is waiting.`
        : `Cup complete. ${outcome.total} points. That is the whole derby.`;
  } else if (race.mode === "trial" && outcome) {
    note.textContent = outcome.improved
      ? `New session best ${formatTime(outcome.best)}.`
      : `Session best stays ${formatTime(outcome.best)}.`;
  } else if (race.mode === "battle") {
    note.textContent = race.winner ? `${race.winner.name} keeps the last balloon.` : "The yard is empty.";
  } else {
    note.textContent = "That is the order they crossed, or were still running, when the humans were done.";
  }
  panel.appendChild(note);
}

function paintAbout(panel) {
  const pre = document.createElement("pre");
  pre.id = "about-copy";
  pre.textContent = ABOUT_TEXT;
  panel.appendChild(pre);
}

function renderAll() {
  const key = JSON.stringify({
    screen: session.screen,
    focus: session.focus,
    slot: draft.slot,
    characters: draft.characters,
    playerCount: draft.playerCount,
    courseId: draft.courseId,
    settings: session.settings,
    outcome,
    cupIndex: cup ? cup.index : -1,
    points: cup ? cup.points : 0,
  });
  if (key === renderKey) return;
  renderKey = key;
  const title = $("product-title");
  const blurb = $("blurb");
  const panel = $("panel");
  const ui = $("ui");
  const hud = $("hud");
  if (title) title.textContent = GAME_TITLE;
  const racing = session.screen === "race" || session.screen === "attract";
  if (ui) ui.hidden = racing;
  if (hud) hud.hidden = session.screen !== "race" && session.screen !== "attract" && session.screen !== "pause";
  if (!panel) return;
  panel.replaceChildren();
  const kicker = document.createElement("p");
  kicker.className = "kicker";
  const kickers = {
    title: "A three-lap argument",
    help: "How to drive",
    settings: "Settings",
    about: "About",
    players: "How many drivers?",
    course: "Which course?",
    characters: "Who is driving?",
    pause: "Paused",
    results: "The order",
  };
  kicker.textContent = kickers[session.screen] || "";
  if (kicker.textContent) panel.appendChild(kicker);
  if (blurb) {
    blurb.textContent = session.screen === "title"
      ? "Eight seats when the cup is full. Three laps. Try not to wear the butter."
      : "";
  }
  if (session.screen === "characters") paintCharacters(panel);
  else if (session.screen === "help") {
    paintHelp(panel);
    paintList(panel, currentRows());
  } else if (session.screen === "about") {
    paintAbout(panel);
    paintList(panel, currentRows());
  } else if (session.screen === "results") {
    paintResults(panel);
    paintList(panel, currentRows());
  } else paintList(panel, currentRows());
}

function activate() {
  audio.unlock();
  const rows = currentRows();
  const row = rows[session.focus];
  if (session.screen === "title" && row) {
    if (row.id === "cup") {
      draft.mode = "cup";
      draft.slot = 0;
      session.screen = "characters";
      session.focus = 0;
    } else if (row.id === "versus") {
      draft.mode = "versus";
      session.screen = "players";
      session.focus = 0;
    } else if (row.id === "trial") {
      draft.mode = "trial";
      session.screen = "course";
      session.focus = 0;
    } else if (row.id === "battle") {
      draft.mode = "battle";
      session.screen = "players";
      session.focus = 0;
    } else if (row.id === "help" || row.id === "settings" || row.id === "about") {
      session.screen = row.id;
      session.focus = 0;
    }
  } else if (session.screen === "players" && row) {
    if (row.id === "back") {
      session.screen = "title";
      session.focus = 0;
    } else {
      draft.playerCount = Number(row.id);
      session.screen = draft.mode === "battle" ? "characters" : "course";
      session.focus = 0;
      draft.slot = 0;
    }
  } else if (session.screen === "course" && row) {
    if (row.id === "back") {
      session.screen = draft.mode === "versus" ? "players" : "title";
      session.focus = 0;
    } else {
      draft.courseId = row.id;
      session.screen = "characters";
      session.focus = 0;
      draft.slot = 0;
    }
  } else if (session.screen === "characters") {
    launch(draft.mode);
    return;
  } else if (session.screen === "settings" && row) {
    if (row.id === "invertX") session.settings.invertX = !session.settings.invertX;
    if (row.id === "invertY") session.settings.invertY = !session.settings.invertY;
    if (row.id === "back") {
      session.screen = "title";
      session.focus = 0;
    }
    saveSession();
  } else if ((session.screen === "help" || session.screen === "about") && row && row.id === "back") {
    session.screen = "title";
    session.focus = 0;
  } else if (session.screen === "pause" && row) {
    if (row.id === "resume") session.screen = "race";
    if (row.id === "quit") quitToTitle();
  } else if (session.screen === "results" && row) {
    if (race && race.mode === "cup" && outcome && outcome.action === "retry") launch("cup");
    else if (race && race.mode === "cup" && outcome && outcome.action === "continue") launch("cup");
    else quitToTitle();
    return;
  }
  renderKey = "";
  renderAll();
}

function quitToTitle() {
  race = null;
  cup = null;
  outcome = null;
  recorded = false;
  session.screen = "title";
  session.focus = 0;
  session.idle = 0;
  session.attract = false;
  renderKey = "";
  renderAll();
  if (!busy) {
    busy = true;
    showLot().finally(() => {
      busy = false;
    });
  }
}

function enterResults() {
  if (!race || recorded) return;
  recorded = true;
  if (race.mode === "cup") outcome = recordCupResult(cup, playerPlace(race, 0));
  else if (race.mode === "trial" && race.karts[0].finishTime != null) {
    outcome = noteTrial(session.trialBest, race.course.id, race.karts[0].finishTime);
    saveSession();
  } else outcome = { action: "done" };
  session.screen = "results";
  session.focus = 0;
  renderKey = "";
  renderAll();
}

function cycleCharacter(dir) {
  const count = draft.mode === "cup" || draft.mode === "trial" ? 1 : draft.playerCount;
  const index = CHARACTERS.findIndex((character) => character.id === draft.characters[draft.slot]);
  const next = (index + dir + CHARACTERS.length) % CHARACTERS.length;
  draft.characters[draft.slot] = CHARACTERS[next].id;
  renderKey = "";
  renderAll();
  void count;
}

function moveMenu(dy) {
  if (session.screen === "characters") {
    const count = draft.mode === "cup" || draft.mode === "trial" ? 1 : draft.playerCount;
    draft.slot = (draft.slot + dy + count) % count;
    renderKey = "";
    renderAll();
    return;
  }
  const panel = $("panel");
  if (panel && (session.screen === "about" || session.screen === "help" || session.screen === "results")) {
    panel.scrollTop += dy * 80;
    return;
  }
  const rows = currentRows();
  if (!rows.length) return;
  session.focus = (session.focus + dy + rows.length) % rows.length;
  renderKey = "";
  renderAll();
}

function onMenuEdges(edgeX, edgeY, confirm, back) {
  if (back && session.screen !== "title" && session.screen !== "race" && session.screen !== "attract") {
    if (session.screen === "pause") {
      session.screen = "race";
      renderKey = "";
      renderAll();
      return;
    }
    if (session.screen === "characters") {
      session.screen = draft.mode === "cup" ? "title" : draft.mode === "battle" ? "players" : "course";
    } else if (session.screen === "course") session.screen = draft.mode === "versus" ? "players" : "title";
    else session.screen = "title";
    session.focus = 0;
    renderKey = "";
    renderAll();
    return;
  }
  if (session.screen === "characters" && edgeX) cycleCharacter(edgeX);
  if (session.screen === "settings" && edgeX) {
    const rows = currentRows();
    const row = rows[session.focus];
    if (row && row.id === "invertX") session.settings.invertX = !session.settings.invertX;
    if (row && row.id === "invertY") session.settings.invertY = !session.settings.invertY;
    saveSession();
    renderKey = "";
    renderAll();
  }
  if (edgeY) moveMenu(edgeY);
  if (confirm) activate();
}

function updateHud(time) {
  const hud = $("hud");
  const countdown = $("countdown");
  if (!hud || !race || (session.screen !== "race" && session.screen !== "attract" && session.screen !== "pause")) {
    if (countdown) countdown.textContent = "";
    return;
  }
  const humans = race.karts.filter((kart) => kart.isPlayer);
  const shown = humans.length ? humans : [race.karts[0]];
  hud.dataset.players = String(Math.max(1, shown.length));
  while (hud.children.length < shown.length) {
    const cluster = document.createElement("section");
    cluster.className = "cluster";
    for (const cls of ["place", "meta", "speed", "item"]) {
      const node = document.createElement("div");
      node.className = cls;
      cluster.appendChild(node);
    }
    const map = document.createElement("canvas");
    map.className = "map";
    map.width = 180;
    map.height = 140;
    cluster.appendChild(map);
    const order = document.createElement("ol");
    order.className = "order";
    cluster.appendChild(order);
    hud.appendChild(cluster);
  }
  [...hud.children].forEach((cluster, index) => {
    cluster.hidden = index >= shown.length;
    cluster.className = `cluster p${index}`;
  });
  shown.forEach((kart, index) => {
    const cluster = hud.children[index];
    const place = cluster.querySelector(".place");
    const meta = cluster.querySelector(".meta");
    const speed = cluster.querySelector(".speed");
    const item = cluster.querySelector(".item");
    place.textContent = kart.finished ? "Finished" : kart.eliminated ? "Out" : ordinal(kart.rank);
    if (race.mode === "battle") meta.textContent = kart.eliminated ? "No balloons" : `${kart.balloons} balloons`;
    else meta.textContent = `Lap ${kart.displayLap} / 3`;
    speed.textContent = `${Math.round(Math.abs(kart.speed) * 3.6)} km/h`;
    if (kart.roulette) {
      const names = ITEM_IDS.map((id) => itemName(id));
      item.textContent = names[Math.floor(time * 14 + index) % names.length];
    } else if (kart.held) {
      const charges = kart.held.charges > 1 ? ` ×${kart.held.charges}` : "";
      item.textContent = `${itemName(kart.held.kind)}${kart.trailing ? " trailing" : charges}`;
    } else if (kart.aegisT > 0) item.textContent = "Full Guard";
    else if (kart.stormT > 0) item.textContent = "Pepper Rain";
    else item.textContent = "Empty";
    const map = cluster.querySelector(".map");
    if (index === 0 || shown.length > 1) drawMap(map, race.course, race.karts, kart.id);
    const order = cluster.querySelector(".order");
    order.replaceChildren();
    if (shown.length === 1 && race.mode !== "battle") {
      for (const row of finishOrder(race)) {
        const li = document.createElement("li");
        li.textContent = `${row.rank} ${row.name}`;
        if (row.id === kart.id) li.className = "me";
        order.appendChild(li);
      }
    }
  });
  if (session.screen === "attract") {
    let banner = hud.querySelector(".attract-banner");
    if (!banner) {
      banner = document.createElement("p");
      banner.className = "attract-banner";
      banner.textContent = "Demo reel. Press anything.";
      hud.appendChild(banner);
    }
  } else {
    const banner = hud.querySelector(".attract-banner");
    if (banner) banner.remove();
  }
  if (countdown) {
    countdown.textContent = race.phase === "countdown" || race.goShow > 0 ? race.countdownLabel : "";
  }
}

function drawMap(canvas, course, karts, selfId) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8, 10, 16, 0.55)";
  ctx.fillRect(0, 0, w, h);
  const bounds = course.bounds;
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.min((w - 16) / spanX, (h - 16) / spanZ);
  const ox = w / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const oy = h / 2 + ((bounds.minZ + bounds.maxZ) / 2) * scale;
  const X = (x) => ox + x * scale;
  const Y = (z) => oy - z * scale;
  ctx.strokeStyle = "#f3d7a4";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (course.kind === "circuit" && course.points.length) {
    course.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(X(point.x), Y(point.z));
      else ctx.lineTo(X(point.x), Y(point.z));
    });
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(X(-course.width / 2), Y(course.depth / 2), course.width * scale, course.depth * scale);
  }
  for (const kart of karts) {
    ctx.fillStyle = kart.id === selfId ? "#ffb703" : "#f7f3ea";
    ctx.beginPath();
    ctx.arc(X(kart.x), Y(kart.z), kart.id === selfId ? 5 : 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function bindInput() {
  window.addEventListener("keydown", (event) => {
    keys[event.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    audio.unlock();
  });
  window.addEventListener("keyup", (event) => {
    keys[event.code] = false;
  });
  window.addEventListener("blur", () => {
    for (const code of Object.keys(keys)) keys[code] = false;
  });
  const canvas = $("view");
  canvas.addEventListener("click", () => {
    if (session.screen === "race" || session.screen === "attract") canvas.requestPointerLock();
  });
  window.addEventListener("mousedown", (event) => {
    mouse.buttons[event.button] = true;
  });
  window.addEventListener("mouseup", (event) => {
    mouse.buttons[event.button] = false;
  });
  window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas) {
      mouse.dx += event.movementX;
      mouse.dy += event.movementY;
    }
  });
  window.addEventListener("wheel", (event) => {
    if (session.screen === "race") {
      mouse.wheel = true;
      event.preventDefault();
    }
  }, { passive: false });
  window.addEventListener("resize", () => {
    if (renderer) fitBuffer($("view"), renderer);
  });
  const touchSettings = $("touch-settings");
  if (touchSettings) {
    touchSettings.addEventListener("click", () => {
      session.screen = "settings";
      session.focus = 0;
      session.idle = 0;
      renderKey = "";
      renderAll();
    });
  }
}

function setupTouch() {
  const gate = $("touch-gate");
  if (!gate) return;
  const visible = touchGateVisible({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    hover: window.matchMedia("(hover: hover)").matches,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  });
  gate.hidden = !visible;
}

function drainAudio() {
  if (!race) return;
  for (const event of race.events) {
    if (event.type === "countdown") audio.countdown(event.value);
    else if (event.type === "impact") audio.impact();
    else if (event.type === "item" && (event.phase === "use" || event.phase === "roll" || event.phase === "pulse")) audio.item();
  }
  race.events.length = 0;
  if (session.screen === "race" || session.screen === "attract") {
    const humans = race.karts.filter((kart) => kart.isPlayer);
    const heard = humans.length ? humans : race.karts.slice(0, 1);
    heard.forEach((kart, index) => audio.engine(index, kart.speed));
  } else audio.silence();
}

function renderViews(dt, time) {
  if (!renderer || !sim) return;
  const canvas = $("view");
  const size = fitBuffer(canvas, renderer);
  const shownRace = sim.race;
  animateScene(sim.view, shownRace, dt, time);
  const live = race && (session.screen === "race" || session.screen === "attract" || session.screen === "pause" || session.screen === "results");
  const humans = live ? race.karts.filter((kart) => kart.isPlayer) : [];
  const views = live && humans.length ? humans : [shownRace.karts[0]];
  const ports = live && humans.length > 1 ? viewports(humans.length, size.width, size.height) : viewports(1, size.width, size.height);
  renderer.setScissorTest(ports.length > 1);
  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];
    const kart = views[i] || views[0];
    const camera = sim.view.cameras[i] || sim.view.camera;
    if (!(live && humans.length)) orbitCamera(camera, sim.course, time, port.w, port.h);
    else frameCamera(camera, kart, camModes[i] || "chase", dt, port.w, port.h);
    renderer.setViewport(port.x, port.y, port.w, port.h);
    renderer.setScissor(port.x, port.y, port.w, port.h);
    renderer.render(sim.view.scene, camera);
  }
}

async function frame(now) {
  const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 1 / 60);
  lastFrame = now;
  const time = now / 1000;
  const pads = readPads();
  const any = inputAny(pads);
  if (swallow) swallow = false;
  else {
    const wasAttract = session.attract;
    stepSession(session, dt, session.screen === "race" || session.screen === "pause" || session.screen === "results" ? false : any);
    if (wasAttract && !session.attract) {
      swallow = true;
      race = null;
      renderKey = "";
      renderAll();
      if (!busy) {
        busy = true;
        showLot().finally(() => {
          busy = false;
        });
      }
    } else if (!wasAttract && session.attract && !busy) {
      busy = true;
      launchAttract().finally(() => {
        busy = false;
      });
    }
  }
  if (session.screen === "race" && race && !race.attract) {
    const humans = race.karts.filter((kart) => kart.isPlayer);
    const actions = humans.map((kart, index) => drivingActions({
      pad: pads[kart.playerIndex] || pads[index] || null,
      keys,
      mouse,
      settings: session.settings,
      playerIndex: kart.playerIndex || 0,
      useMouse: index === 0 && document.pointerLockElement === $("view"),
    }));
    let paused = false;
    actions.forEach((action, index) => {
      const prev = drivePrev[index];
      if (action.camera && !prev.camera) {
        const at = CAM_CYCLE.indexOf(camModes[index] || "chase");
        camModes[index] = CAM_CYCLE[(at + 1) % CAM_CYCLE.length];
      }
      if (action.pause && !prev.pause) paused = true;
      drivePrev[index] = action;
    });
    if (paused) {
      session.screen = "pause";
      session.focus = 0;
      menuPrev = seedHeldMenu(drivingActions({
        pad: pads[0] || null,
        keys,
        mouse: null,
        settings: session.settings,
        playerIndex: 0,
        useMouse: false,
      }));
      renderKey = "";
      renderAll();
    } else if (race.phase !== "finished") {
      stepRace(race, actions, dt);
      drainAudio();
      if (race.phase === "finished") enterResults();
    }
  } else if (session.screen === "attract" && race && !busy) {
    if (race.phase !== "finished") {
      stepRace(race, null, dt);
      drainAudio();
    } else {
      busy = true;
      launchAttract().finally(() => {
        busy = false;
      });
    }
  } else if (session.screen !== "race") {
    const menuAction = drivingActions({
      pad: pads[0] || null,
      keys,
      mouse: null,
      settings: session.settings,
      playerIndex: 0,
      useMouse: false,
    });
    const edges = menuEdges(menuAction, menuPrev);
    const pauseEdge = session.screen === "pause" && edges.pause;
    if (!swallow && session.screen !== "attract") {
      if (edges.menuX || edges.menuY || edges.confirm || edges.back) {
        onMenuEdges(edges.menuX, edges.menuY, edges.confirm, edges.back);
      }
    }
    menuPrev = menuAction;
    if (pauseEdge && race) {
      session.screen = "race";
      renderKey = "";
      renderAll();
    }
  }
  if (sim && sim.world) {
    stepWorld(sim.world, 1);
    const pos = bodyTranslation(sim.cone);
    sim.view.cone.position.set(pos.x, pos.y, pos.z);
    const liveRace = race && sim.race === race ? race : null;
    if (liveRace) {
      liveRace.conePos = pos;
      if (liveRace.coneImpulse) {
        pushBody(sim.cone, liveRace.coneImpulse.x, liveRace.coneImpulse.y, liveRace.coneImpulse.z);
        liveRace.coneImpulse = null;
      }
    }
  }
  try {
    renderViews(dt, time);
  } catch (err) {
    console.error(err);
  }
  updateHud(time);
  mouse.dx = 0;
  mouse.dy = 0;
  mouse.wheel = false;
  requestAnimationFrame(frame);
}

function showGate(message) {
  const gate = $("gate");
  if (gate) {
    gate.hidden = false;
    gate.textContent = message;
  }
  document.body.dataset.boot = "gate";
}

function mount() {
  document.title = GAME_TITLE;
  const title = $("product-title");
  if (title) title.textContent = GAME_TITLE;
  loadSession();
  setupTouch();
  bindInput();
  renderAll();
}

async function bootGpu() {
  const canvas = $("view");
  const secure = window.isSecureContext && location.protocol !== "file:";
  if (!secure || !navigator.gpu) {
    showGate("WebGPU and a local server are required.");
    return;
  }
  let adapter = null;
  try {
    adapter = await navigator.gpu.requestAdapter();
  } catch (err) {
    adapter = null;
  }
  if (!adapter) {
    showGate("WebGPU and a local server are required.");
    return;
  }
  try {
    renderer = await createRenderer(canvas);
    renderer.onDeviceLost = () => {
      showGate("WebGPU and a local server are required.");
    };
    fitBuffer(canvas, renderer);
    await showLot();
    document.body.dataset.boot = "ready";
    requestAnimationFrame(frame);
  } catch {
    showGate("WebGPU and a local server are required.");
  }
}

mount();
bootGpu();
