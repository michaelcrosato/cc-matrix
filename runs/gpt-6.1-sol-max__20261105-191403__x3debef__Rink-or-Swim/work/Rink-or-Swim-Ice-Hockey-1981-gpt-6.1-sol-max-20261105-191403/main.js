import { RinkAudio } from "./audio.js";
import { Controls } from "./controls.js";
import feedback from "./exit-data.json";
import { Online } from "./online.js";
import { Arena } from "./scene.js";
import { clamp, DEFAULTS, Hockey, initPhysics } from "./simulation.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const hub = window.AIHub;
const app = {
  screen: "loading",
  paused: false,
  attract: false,
  lastInput: performance.now(),
  localTeam: 0,
  cupRound: 0,
  training: -1,
  trainingMetric: 0,
  drillDelay: 0,
  matchMode: "exhibition",
  dev: false,
  hubEnded: false,
  hubStarted: false,
  networkFinished: false,
  networkEvents: [],
  eventSeq: 0,
  lastEvent: 0,
  remoteInputs: new Map(),
  players: [],
  returnScreen: "title",
  settings: {
    music: 0.1,
    sfx: 0.7,
    glyphs: "ps",
    assist: 0.55,
    camera: "broadcast",
    difficulty: 0.64,
    speed: 1,
    length: 180,
  },
  focus: 0,
  actions: {},
  toastUntil: 0,
  bannerUntil: 0,
};
try {
  const saved = JSON.parse(localStorage.getItem("rink-settings") || "null");
  if (saved) Object.assign(app.settings, saved);
} catch {}
const audio = new RinkAudio();
let arena, game, controls, online;
let hubInfo = null;
let lastFrame = 0,
  acc = 0,
  lastNetwork = 0,
  frames = 0,
  lastInputPacket = 0;
const CUP = [
  { name: "HARBOR GULLS", tag: "A little wind-up.", skill: 0.4, speed: 0.94 },
  { name: "RED BUOYS", tag: "They don’t drift quietly.", skill: 0.65, speed: 1.05 },
  { name: "KRAKENS", tag: "Deep water. Fast ice.", skill: 0.86, speed: 1.18 },
];
const DRILLS = [
  {
    name: "FIND YOUR EDGES",
    goal: "Skate around. Cover eight metres of ice.",
    tip: "Move with the left stick or WASD. The ring marks your skater.",
  },
  {
    name: "LET IT RIP",
    goal: "Take a shot.",
    tip: "Hold, then release Shoot to wind up. Aim with the right stick or mouse.",
  },
  {
    name: "SHARE THE ICE",
    goal: "Pass to your other skater.",
    tip: "Pass goes straight to your teammate. Control follows the puck.",
  },
  {
    name: "SHOULDER SEASON",
    goal: "Land a body check.",
    tip: "Close the gap and press Check. Your rival is waiting right ahead.",
  },
  {
    name: "PLAY THE BOARDS",
    goal: "Bounce a shot off a side board.",
    tip: "Aim up or down the rink and shoot. A sharp angle makes a fine surprise.",
  },
  {
    name: "LIGHT THE LAMP",
    goal: "Put the puck in the right-hand net.",
    tip: "The net is open. Skate in, pick your angle, and let it fly.",
  },
];
const hubConnection = hub.active
  ? hub.connect({ mode: "shared-world", seats: [1, 4] })
  : Promise.resolve(null);
function saveSettings() {
  try {
    localStorage.setItem("rink-settings", JSON.stringify(app.settings));
  } catch {}
}
function isMenu() {
  return app.screen !== "play" && !app.attract;
}
function updatePrompts() {
  if (!controls) return;
  const pad = controls.type === "gamepad",
    xbox = app.settings.glyphs === "xbox";
  const g = {
    shoot: pad ? (xbox ? "A" : "×") : "Space",
    pass: pad ? (xbox ? "X" : "□") : "E",
    check: pad ? (xbox ? "B" : "○") : "Q",
    switch: pad ? (xbox ? "Y" : "△") : "R",
    pause: pad ? "Options" : "Esc",
  };
  app.glyphs = g;
  $("playHelp").innerHTML =
    `<span><i class="key">${pad ? "L" : "WASD"}</i> SKATE</span><span><i class="key">${g.shoot}</i> HOLD / SHOOT</span><span><i class="key">${g.pass}</i> PASS</span><span><i class="key">${g.check}</i> CHECK</span><span><i class="key">${g.switch}</i> SWITCH</span>`;
  if (app.screen === "controls") showControls(false);
}
function toast(text, time = 2600) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  app.toastUntil = performance.now() + time;
}
function banner(kicker, text, sub = "", time = 1400) {
  $("bannerKicker").textContent = kicker;
  $("bannerText").textContent = text;
  $("bannerSub").textContent = sub;
  $("banner").classList.add("show");
  app.bannerUntil = performance.now() + time;
}
function closeBanner() {
  $("banner").classList.remove("show");
  app.bannerUntil = 0;
}
function focusables() {
  return [...$("screen").querySelectorAll("[data-nav]")].filter(
    (x) => !x.disabled && x.offsetParent !== null,
  );
}
function focusAt(i, keyboard = false) {
  const list = focusables();
  if (!list.length) return;
  app.focus = ((i % list.length) + list.length) % list.length;
  for (const [n, e] of list.entries()) e.classList.toggle("focused", n === app.focus);
  if (keyboard) list[app.focus].scrollIntoView({ block: "nearest" });
}
function bindUI(actions = {}, initial = 0) {
  app.actions = actions;
  for (const el of $("screen").querySelectorAll("[data-action]")) {
    el.addEventListener("click", () => {
      audio.init();
      audio.event("menu");
      const a = actions[el.dataset.action];
      if (a) a(el);
    });
  }
  for (const [n, el] of focusables().entries()) {
    el.addEventListener("pointerenter", () => focusAt(n));
    el.addEventListener("focus", () => focusAt(n));
  }
  focusAt(initial);
}
function render(html, screen, actions = {}, initial = 0) {
  app.screen = screen;
  $("screen").innerHTML = html;
  document.body.classList.toggle("title", screen === "title");
  bindUI(actions, initial);
  $("playHelp").hidden = screen !== "play";
  $("touchAction").hidden = true;
  $("touchHint").hidden = true;
  arena?.setTitle(screen === "title");
}
function panel(title, body, options = {}) {
  const { narrow = false, kicker = "BREAKWATER ATHLETIC CLUB", back = true } = options;
  return `<div class="overlay"><section class="panel ${narrow ? "narrow" : ""}">${back ? '<button class="back" data-nav data-action="back">← BACK</button>' : ""}<div class="eyebrow">${kicker}</div><h1>${title}</h1>${body}</section></div>`;
}
function button(action, title, hint = "", primary = false) {
  return `<button data-nav data-action="${action}" class="${primary ? "primary" : ""}"><span>${title}</span>${hint ? `<span class="hint">${hint}</span>` : ""}</button>`;
}
function menuAction(action) {
  const list = focusables();
  if (action === "back") {
    if (app.actions.back) app.actions.back();
    else pause();
    return;
  }
  if (!list.length) return;
  const current = list[app.focus];
  if (current.classList.contains("credits") && (action === "up" || action === "down")) {
    const direction = action === "down" ? 1 : -1;
    if (
      (direction > 0 && current.scrollTop < current.scrollHeight - current.clientHeight - 2) ||
      (direction < 0 && current.scrollTop > 0)
    ) {
      current.scrollTop += direction * Math.max(100, current.clientHeight * 0.45);
      return;
    }
  }
  if (action === "up" || action === "down") {
    audio.event("menu");
    focusAt(app.focus + (action === "up" ? -1 : 1), true);
    return;
  }
  const el = list[app.focus];
  if (action === "left" || action === "right") {
    const sign = action === "right" ? 1 : -1;
    if (el.tagName === "INPUT" && el.type === "range") {
      el.value = clamp(+el.value + sign * (+el.step || 1), +el.min, +el.max);
      el.dispatchEvent(new Event("input"));
    } else if (el.tagName === "SELECT") {
      el.selectedIndex = clamp(el.selectedIndex + sign, 0, el.options.length - 1);
      el.dispatchEvent(new Event("change"));
    } else {
      focusAt(app.focus + sign, true);
    }
    return;
  }
  if (action === "confirm") {
    if (el.tagName === "INPUT" && el.type !== "range") {
      el.focus();
    } else if (el.tagName === "SELECT") {
      el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
      el.dispatchEvent(new Event("change"));
    } else el.click();
  }
}
function title() {
  if (hub.active) return;
  app.paused = false;
  app.attract = false;
  app.training = -1;
  app.matchMode = "exhibition";
  app.lastInput = performance.now();
  app.dev = false;
  app.networkFinished = false;
  online?.close();
  app.localTeam = 0;
  if (game) {
    game.params = { ...DEFAULTS, assist: app.settings.assist };
    game.reset({ attract: true, difficulty: 0.7 });
  }
  $("hud").hidden = true;
  $("challengeHud").hidden = true;
  $("attractTag").hidden = true;
  $("devBadge").hidden = true;
  $("brand").hidden = false;
  $("connectionBadge").textContent = "LIVE FROM TIDAL ARENA";
  closeBanner();
  render(
    `<section class="title-panel"><div class="eyebrow">THE BREAKWATER CUP</div><h1 class="game-title"><span>RINK</span><span><i class="outline" style="font-style:normal">OR</i> SWIM<span style="font-size:.17em;display:inline;vertical-align:top;letter-spacing:0">™</span></span></h1><p class="title-tagline">Sink shots. Stay cool.</p><nav class="menu">${button("cup", "PLAY THE CUP", "SOLO TOURNAMENT", true)}${button("quick", "QUICK MATCH", "THREE MINUTES")}${button("school", "SKATE SCHOOL", "LEARN THE ROPES")}${button("versus", "VERSUS", "LOCAL + ONLINE")}${button("club", "CLUBHOUSE", "OPTIONS + CREDITS")}</nav><div class="title-footer">TWO SKATERS. ONE RINK. ALL HEART.</div></section><div class="stamp">ICE COLD<strong>’81</strong>ARCADE SPIRIT</div><div class="arena-caption"><b>SMALL TEAMS.<br>BIG SPLASH.</b><span>01 / TIDAL ARENA · BREAKWATER BAY</span></div>`,
    "title",
    {
      cup: cupIntro,
      quick: () => quickSetup("exhibition"),
      school: startSchool,
      versus: versusMenu,
      club: () => clubhouse("title"),
    },
  );
}
function clubhouse(from = "title") {
  app.returnScreen = from;
  render(
    panel(
      "THE CLUBHOUSE",
      `<p>A little tune-up before you lace up.</p><nav class="menu">${button("settings", "SETTINGS", "SOUND + CONTROLS")}${button("controls", "HOW TO PLAY", "THE SHORT VERSION")}${button("about", "ABOUT & CREDITS", "SOURCE + FIELD NOTES")}</nav>`,
      { narrow: true },
    ),
    "club",
    {
      settings: () => settingsMenu("club"),
      controls: () => showControls(),
      about: () => aboutMenu(),
      back: () => (from === "pause" ? pauseMenu() : title()),
    },
  );
}
function quickSetup(mode = "exhibition") {
  app.setupMode = mode;
  render(
    panel(
      mode === "local" ? "FRIENDLY RIVALRY" : "DROP THE PUCK",
      `<p>${mode === "local" ? "Two teams. One couch. Second pad joins the coral team." : "One three-minute period. Beat the Buoys, keep your cool."}</p><div class="cards">${[
        ["FRESH ICE", "A gentler first skate.", 0.35],
        ["CLUB NIGHT", "A fair fight on fast ice.", 0.64],
        ["ALL-STAR", "They know every angle.", 0.88],
      ]
        .map(
          ([a, b, _v], i) =>
            `<button class="card" data-nav data-action="skill${i}"><span class="num">0${i + 1}</span><b>${a}</b><span>${b}</span></button>`,
        )
        .join(
          "",
        )}</div><div class="setting"><label for="quickSpeed">Ice speed</label><select id="quickSpeed" data-nav><option value="1">Regular action</option><option value="1.25">High-speed action</option></select></div><div class="setting"><label for="quickLength">Period length</label><select id="quickLength" data-nav><option value="180">3 minutes</option><option value="60">1 minute</option><option value="300">5 minutes</option></select></div><button class="action" data-nav data-action="start">LET’S SKATE ↗</button>`,
    ),
    "setup",
    {
      skill0: () => chooseSkill(0.35),
      skill1: () => chooseSkill(0.64),
      skill2: () => chooseSkill(0.88),
      start: () => {
        app.settings.speed = +$("quickSpeed").value;
        app.settings.length = +$("quickLength").value;
        beginMatch(mode);
      },
      back: mode === "local" ? versusMenu : title,
    },
    2,
  );
  $("quickSpeed").value = String(app.settings.speed);
  $("quickLength").value = String(app.settings.length);
  chooseSkill(app.settings.difficulty, false);
}
function chooseSkill(v, sound = true) {
  app.settings.difficulty = v;
  const cards = $("screen").querySelectorAll(".card");
  cards.forEach((c, i) => {
    const picked = [0.35, 0.64, 0.88][i] === v;
    c.style.borderColor = picked ? "#00ad9c" : "";
    c.querySelector(".num").textContent = picked ? "✓" : `0${i + 1}`;
  });
  if (sound) audio.event("menu");
}
function cupIntro() {
  app.cupRound = 0;
  render(
    panel(
      "THE BREAKWATER CUP",
      `<p>Three clubs stand between you and the silverware.<br>Win each 90-second match. A tie goes to sudden-death overtime.</p><div class="cards">${CUP.map((r, i) => `<div class="card"><span class="num">0${i + 1}</span><b>${r.name}</b><span>${r.tag}<br>${i === 2 ? "High-speed final" : "Regular action"}</span></div>`).join("")}</div><button class="action" data-nav data-action="start">TAKE THE ICE ↗</button>`,
      { kicker: "THREE MATCHES · ONE TROPHY" },
    ),
    "cupIntro",
    { start: () => beginMatch("cup"), back: title },
    1,
  );
}
function versusMenu() {
  render(
    panel(
      "MAKE SOME WAVES",
      `<p>A friendly rivalry, on the couch or across the water.</p><nav class="menu">${button("local", "COUCH VERSUS", "TWO PADS / ONE KEYBOARD")}${button("online", "ONLINE VERSUS", "PRIVATE ROOM")}${button("how", "LOCAL CONTROLS", "GET EVERYONE READY")}</nav>`,
      { narrow: true },
    ),
    "versus",
    {
      local: () => quickSetup("local"),
      online: onlineMenu,
      how: () => showControls(true),
      back: title,
    },
    1,
  );
}
function showControls(local = false) {
  const returnTo = app.screen === "controls" ? app.controlReturn : app.screen;
  app.controlReturn = returnTo;
  const pad = controls.type === "gamepad",
    g = app.glyphs || {};
  render(
    panel(
      "THE SHORT VERSION",
      `<div class="controls-grid">${[
        ["SKATE", pad ? "LEFT STICK" : "WASD / ARROWS"],
        ["AIM", pad ? "RIGHT STICK" : "MOUSE"],
        ["HOLD → RELEASE SHOT", g.shoot || "SPACE / LMB"],
        ["PASS TO TEAMMATE", g.pass || "E / RMB"],
        ["BODY CHECK", g.check || "Q"],
        ["SWITCH SKATER", g.switch || "R / TAB"],
      ]
        .map(([a, b]) => `<div class="control"><b>${a}</b><span class="key">${b}</span></div>`)
        .join(
          "",
        )}</div><div class="callout"><p><b>Teal shoots right. Coral shoots left.</b> The nearest skater takes control. Goalkeepers stay in their own half. Aim a shot off the boards to surprise your rival.</p><p>The puck sweeps across your stick: time a shot for 32 classic angles, or use direct aim. Hold Shoot for more power. Checks need a moment to recharge.</p></div><p>${local ? "Shared keyboard: teal uses WASD, Space, E, Q. Coral uses arrows, Enter/0, / to pass, . to check. Two pads use the same controls." : "Touch: left thumb drags to skate. Right thumb drags to aim; release to shoot. Nearby action buttons handle passing and checking. Touch adds aim assistance."}</p>`,
    ),
    "controls",
    {
      back: () =>
        returnTo === "versus"
          ? versusMenu()
          : returnTo === "pause"
            ? pauseMenu()
            : clubhouse(app.returnScreen),
    },
  );
}
function settingsMenu(from = "club") {
  app.settingsReturn = from;
  render(
    panel(
      "SET YOUR TEMPO",
      `<div class="setting"><label for="music">Music</label><input id="music" data-nav type="range" min="0" max="100" step="5" value="${Math.round(app.settings.music * 100)}"><output id="musicOut">${Math.round(app.settings.music * 100)}%</output></div><div class="setting"><label for="sfx">Effects & voices</label><input id="sfx" data-nav type="range" min="0" max="100" step="5" value="${Math.round(app.settings.sfx * 100)}"><output id="sfxOut">${Math.round(app.settings.sfx * 100)}%</output></div><div class="setting"><label for="assist">Shot assistance</label><input id="assist" data-nav type="range" min="0" max="100" step="5" value="${Math.round(app.settings.assist * 100)}"><output id="assistOut">${Math.round(app.settings.assist * 100)}%</output></div><div class="setting"><label for="glyphs">Controller glyphs</label><select id="glyphs" data-nav><option value="ps">PlayStation · × ○ □ △</option><option value="xbox">Xbox · A B X Y</option></select></div><div class="setting"><label for="camera">Camera</label><select id="camera" data-nav><option value="broadcast">Broadcast</option><option value="overhead">Overhead</option></select></div><div class="small-actions"><button class="action" data-nav data-action="full">FULLSCREEN</button><button class="action" data-nav data-action="reset">RESET SETTINGS</button></div>`,
    ),
    "settings",
    {
      back: () => (from === "pause" ? pauseMenu() : clubhouse(app.returnScreen)),
      full: () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else
          document.documentElement
            .requestFullscreen?.()
            .catch(() => toast("Fullscreen is unavailable in this browser."));
      },
      reset: () => {
        app.settings = {
          music: 0.1,
          sfx: 0.7,
          glyphs: "ps",
          assist: 0.55,
          camera: "broadcast",
          difficulty: 0.64,
          speed: 1,
          length: 180,
        };
        audio.levels(0.1, 0.7);
        game.params.assist = 0.55;
        saveSettings();
        settingsMenu(from);
      },
    },
  );
  for (const key of ["music", "sfx", "assist"]) {
    $(key).oninput = () => {
      app.settings[key] = +$(key).value / 100;
      $(`${key}Out`).value = `${$(key).value}%`;
      audio.levels(app.settings.music, app.settings.sfx);
      game.params.assist = app.settings.assist;
      saveSettings();
    };
  }
  for (const key of ["glyphs", "camera"]) {
    $(key).value = app.settings[key];
    $(key).onchange = () => {
      app.settings[key] = $(key).value;
      saveSettings();
      updatePrompts();
    };
  }
}
function aboutMenu(tab = "source") {
  const tabs = [
    ["source", "SOURCE INFORMATION"],
    ["testing", "TESTING"],
    ["engine", "ENGINE"],
    ["prompt", "PROMPT"],
  ];
  const data = feedback.sourceInformation;
  let body = "";
  if (tab === "source") {
    body = `<dl>${Object.entries(data)
      .map(
        ([k, v]) =>
          `<dt>${esc(k === "usage" ? "Usage" : k[0].toUpperCase() + k.slice(1))}</dt><dd>${esc(v)}</dd>`,
      )
      .join(
        "",
      )}</dl><p>Original inspiration: <a href="https://atariage.com/manual_html_page.php?SoftwareLabelID=241" target="_blank" rel="noopener">Activision Ice Hockey manual</a>. Networking: <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a>. Original game design, code, geometry, textures and synthesis for this demo. Dependencies retain their respective licenses.</p><p>Title selected from 50 brainstormed candidates with Node crypto.randomInt. No source game assets are included.</p>`;
  } else {
    const qs = {
      testing: [
        "How many issues did testing catch?",
        "How many were critical / game breaking?",
        "Most helpful test?",
        "Least helpful test?",
      ],
      engine: [
        "What did you like most about the engine?",
        "Did you get stuck or guess wrong?",
        "Most important thing built yourself?",
        "Hardest part of using the engine?",
        "What changed in the engine, and why?",
        "One thing to change?",
      ],
      prompt: [
        "What did you like most about this prompt?",
        "What was confusing?",
        "Hardest thing to do?",
        "What would you change?",
      ],
    }[tab];
    body = feedback[`${tab}Feedback`]
      .map((v, i) => `<h2>${esc(qs[i])}</h2><p>${esc(v)}</p>`)
      .join("");
  }
  render(
    panel(
      "RINK NOTES",
      `<div class="tabbar">${tabs.map(([id, t]) => `<button class="${tab === id ? "active" : ""}" data-nav data-action="${id}">${t}</button>`).join("")}</div><div class="credits" tabindex="0" data-nav>${body}</div>`,
    ),
    "about",
    {
      source: () => aboutMenu("source"),
      testing: () => aboutMenu("testing"),
      engine: () => aboutMenu("engine"),
      prompt: () => aboutMenu("prompt"),
      back: () => clubhouse(app.returnScreen),
    },
  );
  if (hub.active) for (const a of $("screen").querySelectorAll("a")) a.removeAttribute("href");
}
function beginMatch(mode, options = {}) {
  if (hub.active && !options.hub) return;
  app.matchMode = mode;
  app.training = mode === "training" ? app.training : -1;
  app.paused = false;
  app.attract = false;
  app.networkFinished = false;
  app.localTeam = mode === "online" && !online.host ? 1 : 0;
  let skill = app.settings.difficulty,
    speed = app.settings.speed,
    duration = app.settings.length;
  if (mode === "cup") {
    const r = CUP[app.cupRound];
    skill = r.skill;
    speed = r.speed;
    duration = 90;
  }
  if (mode === "training") {
    skill = 0.1;
    speed = 1;
    duration = 99999;
  }
  game.params = {
    ...DEFAULTS,
    skateSpeed: DEFAULTS.skateSpeed * speed,
    shotPower: DEFAULTS.shotPower * speed,
    assist: app.settings.assist,
  };
  game.reset({ mode, difficulty: skill, duration, ...options });
  $("hud").hidden = false;
  $("brand").hidden = innerWidth < 1600;
  $("challengeHud").hidden = mode !== "training";
  $("attractTag").hidden = true;
  $("awayTeam").textContent = mode === "cup" ? CUP[app.cupRound].name : "BUOYS";
  $("matchLabel").textContent =
    mode === "cup"
      ? `CUP · ROUND ${app.cupRound + 1}/3`
      : mode === "local"
        ? "COUCH VERSUS"
        : mode === "online"
          ? "ONLINE VERSUS"
          : mode === "hub"
            ? "AI HUB SESSION"
            : mode === "training"
              ? "SKATE SCHOOL"
              : "EXHIBITION";
  $("periodLabel").textContent = "ONE PERIOD · ALL HEART";
  render("", "play");
  updatePrompts();
  controls?.clear();
  if (mode === "training") setupDrill();
  else
    banner(
      "TAKE YOUR POSITIONS",
      "FACE-OFF",
      app.localTeam === 0 ? "YOU ARE TEAL · SHOOT RIGHT" : "YOU ARE CORAL · SHOOT LEFT",
      2300,
    );
  updateHud();
}
function pause() {
  if (app.attract) {
    title();
    return;
  }
  if (hub.active && app.hubEnded) return;
  if (app.screen === "play") {
    pauseMenu();
  } else if (
    ["pause", "dev", "settings", "controls", "club", "about"].includes(app.screen) &&
    app.paused
  ) {
    resume();
  } else if (app.actions.back) app.actions.back();
}
function pauseMenu() {
  app.paused = true;
  const network = hub.active || app.matchMode === "online";
  render(
    panel(
      "CATCH YOUR BREATH",
      `<p>${network ? "The rink stays live while you adjust your gear." : "The ice can wait. Your rival can’t go anywhere."}</p><nav class="menu">${button("resume", "BACK TO THE ICE", "RESUME", true)}${button("settings", "SETTINGS", "SOUND + CONTROLS")}${button("how", "HOW TO PLAY", "CONTROLS")}${button("dev", "DEV MODE", "TOOLS + LIVE BALANCE")}${button("about", "ABOUT & CREDITS", "RINK NOTES")}${!hub.active ? button("quit", "LEAVE THE RINK", "TITLE SCREEN") : ""}</nav>`,
      { narrow: true, back: false },
    ),
    "pause",
    {
      resume,
      settings: () => settingsMenu("pause"),
      how: () => showControls(),
      dev: devMenu,
      about: () => {
        app.returnScreen = "pause";
        aboutMenu();
      },
      quit: title,
      back: resume,
    },
  );
}
function resume() {
  app.paused = false;
  render("", "play");
  controls.clear();
  updatePrompts();
}
function devMenu() {
  app.dev = true;
  $("devBadge").hidden = false;
  const sliders = [
    ["skateSpeed", "Skate speed", 3, 18, 0.2],
    ["shotPower", "Shot power", 12, 55, 1],
    ["iceGrip", "Skate grip", 1, 15, 0.5],
    ["aiSkill", "Opponent skill", 0, 1, 0.05],
    ["checkStrength", "Check force", 0.25, 2, 0.05],
    ["assist", "Shot assistance", 0, 1, 0.05],
    ["remaining", "Clock · seconds", 1, 300, 1],
  ];
  render(
    panel(
      "THE ICE LAB",
      `<p>Live changes apply immediately. The clock pauses here in solo play.</p><div class="two-col">${sliders.map(([key, label, min, max, step]) => `<div class="setting"><label for="dev-${key}">${label}</label><input id="dev-${key}" data-nav type="range" min="${min}" max="${max}" step="${step}" value="${key === "remaining" ? Math.min(300, game.remaining) : game.params[key]}"><output id="out-${key}">${(key === "remaining" ? Math.min(300, game.remaining) : game.params[key]).toFixed(key === "remaining" ? 0 : 2)}</output></div>`).join("")}</div><div class="small-actions"><button class="action" data-nav data-action="puck">GIVE ME THE PUCK</button><button class="action" data-nav data-action="faceoff">RESET FACE-OFF</button><button class="action" data-nav data-action="end">END PERIOD</button></div><div class="small-actions"><button class="action" data-nav data-action="goal">ADD TEAL GOAL</button><button class="action" data-nav data-action="reset">RESET DEFAULTS</button><button class="action" data-nav data-action="resume">RESUME ↗</button></div>`,
    ),
    "dev",
    {
      back: pauseMenu,
      resume,
      puck: () => {
        game.givePuck(game.active[app.localTeam]);
        toast("Puck on your stick.");
      },
      faceoff: () => {
        game.faceoff();
        game.phase = "faceoff";
        game.phaseTime = 2;
        toast("Skaters reset.");
      },
      end: () => {
        game.end();
        if (app.screen === "dev") resume();
      },
      goal: () => {
        game.phase = "play";
        game.goal(0);
        toast("Teal goal added.");
      },
      reset: () => {
        game.params = { ...DEFAULTS };
        game.remaining = DEFAULTS.matchLength;
        devMenu();
        toast("Balance restored.");
      },
    },
  );
  for (const [key] of sliders)
    $(`dev-${key}`).oninput = () => {
      const value = +$(`dev-${key}`).value;
      if (key === "remaining") game.remaining = value;
      else game.params[key] = value;
      $(`out-${key}`).value = value.toFixed(key === "remaining" ? 0 : 2);
    };
}
function startSchool() {
  app.training = 0;
  beginMatch("training");
}
function setupDrill() {
  if (app.training >= DRILLS.length) {
    schoolComplete();
    return;
  }
  app.trainingMetric = 0;
  app.drillDelay = 0;
  game.phase = "play";
  game.remaining = 99999;
  game.possession = -1;
  game.pickupDelay = 0.1;
  for (const p of game.players)
    game.place(
      p,
      ...[
        [-8, 0],
        [-14, 4],
        [13, -6],
        [15, 6],
      ][p.id],
    );
  if (app.training === 3) {
    game.place(game.players[0], -2, 0);
    game.place(game.players[2], -0.4, 0);
    game.givePuck(2);
  } else {
    if (app.training === 4) game.place(game.players[0], 5, 5);
    if (app.training === 5) game.place(game.players[0], 10, 0);
    game.givePuck(0);
  }
  const d = DRILLS[app.training];
  $("challengeName").textContent = `0${app.training + 1} / ${d.name}`;
  $("challengeProgress").textContent = d.goal;
  banner(`SKATE SCHOOL · ${app.training + 1} OF 6`, d.name, d.tip, 4200);
}
function passDrill() {
  if (app.drillDelay > 0) return;
  app.drillDelay = 1.4;
  audio.voice(1.1);
  toast("NICE ICE!  Drill complete.", 1300);
}
function schoolComplete() {
  app.paused = true;
  $("challengeHud").hidden = true;
  closeBanner();
  render(
    panel(
      "ICE CERTIFIED",
      `<div class="trophy">✦</div><p>You can skate, shoot, pass, check, bank and score.<br>That’s a fine set of sea legs. Ready for the Cup?</p><nav class="menu">${button("cup", "CHASE THE CUP", "THREE MATCHES", true)}${button("again", "ONE MORE PRACTICE", "RESTART SCHOOL")}${button("home", "BACK TO THE CLUB", "TITLE SCREEN")}</nav>`,
      { narrow: true, kicker: "SIX DRILLS · ALL CLEAR", back: false },
    ),
    "schoolComplete",
    { cup: cupIntro, again: startSchool, home: title, back: title },
  );
}
function endMenu() {
  if (hub.active) {
    finishHub();
    return;
  }
  app.paused = true;
  closeBanner();
  const a = game.score[0],
    b = game.score[1],
    localScore = game.score[app.localTeam],
    other = game.score[1 - app.localTeam],
    win = localScore > other,
    tie = a === b,
    cup = app.matchMode === "cup",
    cupWon = cup && a > b && app.cupRound === 2;
  let titleText = tie ? "LEVEL AT THE HORN" : win ? "NICE WORK, SKIPPER" : "A LITTLE SEA SICK?";
  if (app.matchMode === "local")
    titleText = tie ? "A FAIR SPLASH" : a > b ? "BREAKERS TAKE IT" : "BUOYS TAKE IT";
  if (cupWon) titleText = "CUP OVERFLOWING!";
  const tag = cupWon
    ? "BREAKWATER CHAMPIONS"
    : cup
      ? `BREAKWATER CUP · ROUND ${app.cupRound + 1}`
      : "THE FINAL WHISTLE";
  const body = `${cupWon ? '<div class="trophy">♜</div>' : ""}<div class="result-score"><span style="color:#009f90">${a}</span> : <span style="color:#d75b49">${b}</span></div><p>${cupWon ? "You weathered every storm. The Breakwater Cup is yours." : tie ? "No one goes overboard. Call it a draw." : win ? "Clean edges. Sharp angles. One very happy bench." : "They found the gaps. Lace up and give it another go."}</p><div class="result-stats"><div><b>${game.stats.shots[app.localTeam]}</b><span>SHOTS</span></div><div><b>${game.stats.passes[app.localTeam]}</b><span>PASSES</span></div><div><b>${game.stats.checks[app.localTeam]}</b><span>CHECKS</span></div><div><b>${game.stats.banks[app.localTeam]}</b><span>BANKS</span></div></div>${cup ? `<div class="cup-track">${CUP.map((_, i) => `<span class="${i < app.cupRound || (a > b && i === app.cupRound) ? "done" : i === app.cupRound ? "current" : ""}"></span>`).join("")}</div>` : ""}<nav class="menu">${cup && !cupWon ? button("next", a > b ? "NEXT CHALLENGER" : "REMATCH", a > b ? CUP[app.cupRound + 1]?.name : "TRY AGAIN", true) : app.matchMode !== "online" ? button("again", cupWon ? "DEFEND THE CUP" : "ONE MORE GAME", "REMATCH", true) : ""}${button("home", "BACK TO THE CLUB", "TITLE SCREEN")}</nav>`;
  render(panel(titleText, body, { narrow: true, kicker: tag, back: false }), "result", {
    next: () => {
      if (a > b) app.cupRound++;
      beginMatch("cup");
    },
    again: () => {
      if (cupWon) app.cupRound = 0;
      beginMatch(app.matchMode);
    },
    home: title,
    back: title,
  });
}
function onlineMenu() {
  online.close();
  render(
    panel(
      "ACROSS THE WATER",
      `<p>Private, two-player hockey. Share a room code with a friend. Each browser controls one team.</p><nav class="menu">${button("host", "OPEN A RINK", "HOST A PRIVATE ROOM", true)}${button("join", "JOIN A RINK", "ENTER A ROOM CODE")}</nav><p style="font-size:12px">Uses a public signaling relay to connect browsers. The host runs the match. AI Hub sessions connect automatically.</p>`,
      { narrow: true },
    ),
    "online",
    { host: hostRoom, join: joinRoom, back: versusMenu },
    1,
  );
}
async function hostRoom() {
  render(
    panel(
      "YOUR RINK IS OPEN",
      `<p>Send this code to your rival. Play begins when they join.</p><div class="room-code" id="roomCode">••••••</div><p class="status" id="roomStatus">Connecting…</p><button class="action" data-nav data-action="copy">COPY INVITE</button>`,
      { narrow: true },
    ),
    "hostRoom",
    {
      back: onlineMenu,
      copy: async () => {
        const link =
          location.protocol === "file:"
            ? online.code
            : `${location.href.split("#")[0]}#join=${online.code}`;
        try {
          await navigator.clipboard.writeText(link);
          toast("Invite link copied.");
        } catch {
          toast(`Room code: ${online.code}`);
        }
      },
    },
  );
  try {
    const code = await online.open(true);
    if ($("roomCode")) $("roomCode").textContent = code;
  } catch (e) {
    toast(e.message);
  }
}
function joinRoom(code = "") {
  render(
    panel(
      "JOIN A RINK",
      `<p>Enter your friend’s six-character room code.</p><input id="joinCode" class="room-input" data-nav placeholder="ABC234" maxlength="6" aria-label="Room code" value="${esc(code)}"><p class="status" id="roomStatus"></p><button class="action" data-nav data-action="join">MEET ON THE ICE ↗</button>`,
      { narrow: true },
    ),
    "joinRoom",
    {
      back: onlineMenu,
      join: async () => {
        try {
          await online.open(false, $("joinCode").value);
        } catch (e) {
          $("roomStatus").textContent = e.message;
        }
      },
    },
    1,
  );
  $("joinCode").addEventListener("keydown", (e) => {
    if (e.key === "Enter") app.actions.join();
  });
}
function incoming(data, from = null) {
  if (!data || typeof data !== "object" || app.hubEnded) return;
  const authority = hub.active ? hub.isHost : online.host;
  if (data.t === "connected") {
    if (!data.host) {
      online.send({ t: "hello" });
      toast("Connected. Waiting for the host…");
    }
    return;
  }
  if (data.t === "hello" && authority && !hub.active) {
    app.remoteInputs.clear();
    beginMatch("online");
    online.send({ t: "start", params: game.params, duration: game.duration });
    return;
  }
  if (data.t === "start" && !authority && !hub.active) {
    beginMatch("online", { duration: clamp(+data.duration || 180, 30, 300) });
    Object.assign(game.params, data.params);
    return;
  }
  if (data.t === "input" && authority) {
    const id = hub.active ? from : 1;
    if (hub.active && !app.players.some((p) => p.id === id)) return;
    const input = data.input || {};
    const clean = {};
    for (const k of ["x", "z", "ax", "az"]) clean[k] = clamp(Number(input[k]) || 0, -40, 40);
    for (const k of ["manual", "charging", "shoot", "pass", "check", "switch"])
      clean[k] = !!input[k];
    app.remoteInputs.set(id, { input: clean, at: performance.now() });
    return;
  }
  if (data.t === "world" && !authority) {
    if (hub.active && from !== hub.host) return;
    if (!Array.isArray(data.players) || data.players.length !== 4) return;
    game.apply(data);
    if (data.events)
      for (const e of data.events)
        if (e.seq > app.lastEvent) {
          app.lastEvent = e.seq;
          presentEvent(e);
        }
    if (game.phase === "over" && app.screen === "play" && !hub.active) endMenu();
    return;
  }
  if (data.t === "disconnect" && !hub.active) {
    if (app.screen === "play") {
      app.matchMode = "exhibition";
      online.close();
      toast("Opponent left. The computer is taking the next shift.", 5000);
      app.localTeam = 0;
    } else toast("Opponent disconnected.");
  }
}
function onEvent(e) {
  if (app.matchMode === "training" && app.training >= 0 && app.drillDelay <= 0) {
    if (
      (app.training === 1 && e.type === "shot" && e.id === 0) ||
      (app.training === 2 && e.type === "pass" && e.id === 0) ||
      (app.training === 3 && e.type === "hit" && e.id === 2) ||
      (app.training === 4 && e.type === "bank" && game.lastShotTeam === 0) ||
      (app.training === 5 && e.type === "goal" && e.team === 0)
    )
      passDrill();
  }
  if ((hub.active && hub.isHost) || (online?.connected && online.host)) {
    app.networkEvents.push({ ...e, seq: ++app.eventSeq });
    if (app.networkEvents.length > 5) app.networkEvents.shift();
  }
  presentEvent(e);
}
function presentEvent(e) {
  audio.event(e.type);
  arena?.event(e);
  if (e.type === "goal") {
    if (!app.attract)
      banner(
        e.bank ? "OFF THE BOARDS!" : "LIGHT THE LAMP",
        e.team === 0 ? "BREAKERS GOAL" : "AWAY GOAL",
        e.bank ? "A bank shot. A thing of beauty." : "That one’s going on the fridge.",
        2200,
      );
  }
  if (e.type === "overtime") banner("ALL TIED UP", "SUDDEN DEATH", "Next goal takes it.", 2400);
  if (e.type === "end" && !app.attract) endMenu();
}
function finishHub() {
  if (!hub.active || !hub.isHost || app.networkFinished || app.hubEnded) return;
  app.networkFinished = true;
  const groups = [[], []],
    scores = {},
    stats = {};
  for (const p of app.players) {
    const team = p.id % 2;
    groups[team].push(p.id);
    scores[p.id] = game.score[team];
    stats[p.id] = {
      Goals: game.score[team],
      Shots: game.stats.shots[team],
      Checks: game.stats.checks[team],
    };
  }
  let standings;
  if (game.score[0] === game.score[1]) standings = [app.players.map((p) => p.id)];
  else standings = game.score[0] > game.score[1] ? groups : [groups[1], groups[0]];
  hub.finish({ standings: standings.filter((a) => a.length), scores, stats });
}
function controllerFor(id) {
  const team = id % 2;
  const count = app.players.filter((p) => p.id % 2 === team).length;
  return count > 1 ? team * 2 + (id >= 2 ? 1 : 0) : game.active[team];
}
function getControllers() {
  const out = {};
  if (app.attract || app.screen === "title") return out;
  const network = hub.active || app.matchMode === "online";
  if (hub.active) {
    for (const player of app.players) {
      const id = player.id,
        slot = controllerFor(id);
      if (!hub.server && id === hub.me) {
        if (!isMenu()) out[slot] = controls.sample(0, arena, game.players[slot]);
        else out[slot] = { x: 0, z: 0 };
      } else {
        const entry = app.remoteInputs.get(id);
        if (entry && performance.now() - entry.at < 600) out[slot] = { ...entry.input };
      }
    }
  } else if (app.matchMode === "online") {
    if (online.host) {
      if (!isMenu()) out[game.active[0]] = controls.sample(0, arena, game.players[game.active[0]]);
      else out[game.active[0]] = { x: 0, z: 0 };
      const entry = app.remoteInputs.get(1);
      if (entry && performance.now() - entry.at < 600) out[game.active[1]] = { ...entry.input };
    }
  } else if (!isMenu()) {
    out[game.active[0]] = controls.sample(0, arena, game.players[game.active[0]]);
    if (app.matchMode === "local")
      out[game.active[1]] = controls.sample(1, arena, game.players[game.active[1]]);
  }
  if (app.matchMode === "training") {
    for (const p of game.players) if (p.id !== 0) out[p.id] = { x: 0, z: 0 };
    out[0] = controls.sample(0, arena, game.players[0]);
    if (controls.type === "touch") game.params.assist = Math.max(0.8, app.settings.assist);
  }
  for (const [id, input] of Object.entries(out)) {
    const p = game.players[+id];
    if (input.switch) {
      const teammate = game.players.find((x) => x.team === p.team && x.id !== p.id);
      game.active[p.team] = teammate.id;
      if (game.possession === p.id) game.pass(p);
      else {
        delete out[id];
        out[teammate.id] = input;
      }
      input.switch = false;
    }
  }
  if (controls.type === "touch" && !network) {
    const id = game.active[0];
    if (game.possession !== id) {
      const p = game.players[id];
      if (
        p.check === 0 &&
        game.players.some((e) => e.team === 1 && Math.hypot(e.x - p.x, e.z - p.z) < 1.9)
      ) {
        out[id] ||= { x: 0, z: 0 };
        out[id].check = true;
      }
    }
  }
  return out;
}
function updateHud() {
  $("score0").textContent = game.score[0];
  $("score1").textContent = game.score[1];
  const s = Math.max(0, Math.ceil(game.remaining));
  $("time").textContent =
    app.matchMode === "training"
      ? "DRILLS"
      : game.overtime
        ? "OT"
        : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  if (controls.type === "touch" && app.screen === "play" && !app.attract) {
    $("touchAction").hidden = false;
    $("touchHint").hidden = false;
    $("playHelp").hidden = true;
    const has = game.possession >= 0 && game.players[game.possession].team === app.localTeam;
    $("touchShoot").hidden = !has;
    $("touchPass").hidden = !has;
    $("touchCheck").hidden = has;
  }
}
function attract() {
  if (hub.active || app.screen !== "title") return;
  app.attract = true;
  app.paused = false;
  app.screen = "play";
  $("screen").innerHTML = "";
  document.body.classList.remove("title");
  arena.setTitle(false);
  $("hud").hidden = false;
  $("brand").hidden = true;
  $("matchLabel").textContent = "ARCADE REPLAY";
  $("attractTag").hidden = false;
  game.reset({ attract: true, difficulty: 0.85, duration: 180 });
  app.attractStart = performance.now();
  banner("THE RINK NEVER SLEEPS", "RINK OR SWIM", "Bank shots. Big checks. Good company.", 2200);
}
function simulate(dt) {
  if (app.hubEnded) return;
  const authority = hub.active ? hub.isHost : app.matchMode === "online" ? online.host : true;
  const network = hub.active || app.matchMode === "online";
  if (!authority) return;
  if (app.paused && !network) return;
  if (hub.active && (!app.hubStarted || hub.time() < 0)) return;
  if (app.screen !== "play" && app.screen !== "title" && !network) return;
  const assignments = getControllers();
  const before = game.players[0],
    x = before.x,
    z = before.z;
  game.step(dt, assignments);
  if (app.matchMode === "training" && app.training === 0) {
    app.trainingMetric += Math.hypot(before.x - x, before.z - z);
    if (app.trainingMetric >= 8) passDrill();
  }
  if (app.drillDelay > 0) {
    app.drillDelay -= dt;
    if (app.drillDelay <= 0) {
      app.training++;
      setupDrill();
    }
  }
  for (const entry of app.remoteInputs.values()) {
    entry.input.shoot = false;
    entry.input.pass = false;
    entry.input.check = false;
    entry.input.switch = false;
  }
  controls.consume();
}
function sendNetwork(now) {
  if (app.hubEnded) return;
  const active = hub.active || (app.matchMode === "online" && online.connected);
  if (!active) return;
  const authority = hub.active ? hub.isHost : online.host;
  if (authority) {
    if (now - lastNetwork < 80) return;
    lastNetwork = now;
    const data = game.snapshot();
    data.events = app.networkEvents;
    const rounded = JSON.parse(
      JSON.stringify(data, (_k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v)),
    );
    if (hub.active) hub.send(rounded, { reliable: false });
    else online.send(rounded);
  } else if (!hub.server) {
    const slot = hub.active ? controllerFor(hub.me) : game.active[1],
      input = isMenu() ? { x: 0, z: 0 } : controls.sample(0, arena, game.players[slot]);
    if (now - lastInputPacket > 75 || input.shoot || input.check || input.pass) {
      lastInputPacket = now;
      const packet = { t: "input", input };
      if (hub.active) hub.send(packet, { to: hub.host });
      else online.send(packet);
      controls.consume();
    }
  }
}
function frame(now) {
  try {
    const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    controls.poll(dt);
    acc += dt;
    let loops = 0;
    while (acc >= 1 / 60 && loops < 4) {
      simulate(1 / 60);
      acc -= 1 / 60;
      loops++;
    }
    sendNetwork(now);
    audio.update(game.phase === "play");
    arena.overhead = app.settings.camera === "overhead";
    if (!hubInfo?.server) {
      const p = game.players[game.active[app.localTeam]];
      arena.update(game, dt, {
        localTeam: app.localTeam,
        input: controls.sample(0, arena, p),
        attract: app.attract,
      });
      arena.render();
    }
    frames++;
    if (frames % 4 === 0) updateHud();
    if (app.screen === "title" && now - app.lastInput >= 10000) attract();
    if (app.attract && now - app.attractStart > 45000) {
      game.params.skateSpeed = DEFAULTS.skateSpeed * (1 + Math.random() * 0.3);
      game.reset({ attract: true, difficulty: 0.9 });
      app.attractStart = now;
    }
    if (app.toastUntil && now > app.toastUntil) {
      $("toast").classList.remove("show");
      app.toastUntil = 0;
    }
    if (app.bannerUntil && now > app.bannerUntil) closeBanner();
    requestAnimationFrame(frame);
  } catch (error) {
    fatal(error);
  }
}
function fatal(error) {
  console.error(error);
  $("boot").hidden = false;
  $("boot").innerHTML =
    `<div class="boot-mark">R/S</div><div class="boot-error"><b>THE RINK HIT A ROUGH PATCH</b><p>${esc(error.message || error)}</p><p>Try a current Chromium or Safari browser. Internet access is needed to load the pinned engine libraries.</p><button id="reload">RELOAD THE RINK</button></div>`;
  $("reload").onclick = () => location.reload();
  if (hub.active) hub.fail(String(error.message || error));
}
async function boot() {
  try {
    await initPhysics();
    $("bootMessage").textContent = "PAINTING THE LINES…";
    arena = new Arena($("world"));
    game = new Hockey(onEvent);
    online = new Online(incoming, (text) => {
      if ($("roomStatus")) $("roomStatus").textContent = text;
    });
    controls = new Controls({
      onMenu: menuAction,
      isMenu,
      isLocal: () => app.matchMode === "local",
      onPause: pause,
      onAudio: () => {
        if (app.hubEnded) return;
        audio.init();
        audio.levels(app.settings.music, app.settings.sfx);
      },
      onActivity: (_type) => {
        if (app.hubEnded) return true;
        app.lastInput = performance.now();
        updatePrompts();
        if (app.attract) {
          title();
          return true;
        }
        return false;
      },
    });
    $("menuButton").onclick = () => {
      audio.init();
      pause();
    };
    await arena.init();
    hubInfo = await hubConnection;
    if (hub.active && hubInfo) {
      document.body.classList.add("hub");
      app.players = [...hubInfo.players];
      app.localTeam = hubInfo.server ? 0 : hubInfo.me % 2;
      app.hubStarted = false;
      beginMatch("hub", { hub: true, duration: 180 });
      app.localTeam = hubInfo.server ? 0 : hubInfo.me % 2;
      $("connectionBadge").textContent =
        `AI HUB · ${app.localTeam === 0 ? "TEAL TEAM" : "CORAL TEAM"}`;
      hub.on("message", incoming);
      hub.on("start", () => {
        app.hubStarted = true;
        game.phase = "faceoff";
        game.phaseTime = 0.15;
        closeBanner();
      });
      hub.on("time-up", () => finishHub());
      hub.on("leave", ({ id }) => {
        app.players = app.players.filter((p) => p.id !== id);
        app.remoteInputs.delete(id);
        toast("A skater left. The bench is covering the shift.");
      });
      hub.on("end", () => {
        app.hubEnded = true;
        app.paused = true;
        audio.stop();
        controls.clear();
        closeBanner();
      });
      hub.ready();
    } else {
      title();
      const join = /join=([A-Z2-9]{6})/i.exec(location.hash);
      if (join) {
        onlineMenu();
        joinRoom(join[1].toUpperCase());
      }
    }
    $("boot").hidden = true;
    updatePrompts();
    window.__RINK__ = {
      app,
      game,
      arena,
      audio,
      controls,
      online,
      feedback,
      get ready() {
        return true;
      },
      get frames() {
        return frames;
      },
      get state() {
        return {
          screen: app.screen,
          phase: game.phase,
          score: [...game.score],
          remaining: game.remaining,
          mode: app.matchMode,
          training: app.training,
          attract: app.attract,
          renderer: arena.backend,
          physics: "Rapier 0.19.3",
          music: audio.music,
          players: game.players.map((p) => ({ id: p.id, x: p.x, z: p.z, stun: p.stun })),
          puck: { ...game.puck.translation() },
        };
      },
      start: beginMatch,
      step: (seconds = 1) => {
        for (let i = 0; i < seconds * 60; i++) simulate(1 / 60);
      },
      startSchool,
      pause,
      resume,
      title,
      menuAction,
      attract,
      setupDrill,
      finishHub,
      sendNetwork,
    };
    requestAnimationFrame(frame);
  } catch (error) {
    fatal(error);
  }
}
boot();
