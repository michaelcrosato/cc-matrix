import { SECTORS, DEFAULTS } from "./game.js";
import credits from "./credits.json";
const $ = (id) => document.getElementById(id);
const safe = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export class UI {
  constructor(app) {
    this.app = app;
    this.index = 0;
    this.lastHud = 0;
    this.toastUntil = 0;
    this.previous = "title";
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-action]");
      if (b && !b.disabled) {
        app.audio.play("ui");
        app.action(b.dataset.action, b.dataset.value);
      }
    });
    document.addEventListener("pointerover", (e) => {
      if (app.input.last !== "keyboard") return;
      const b = e.target.closest("button,input");
      if (b && this.controls().includes(b)) this.setFocus(b, false);
    });
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const b = e.target.closest("button,input");
      if (b && this.controls().includes(b)) this.setFocus(b, false);
    });
    document.addEventListener("input", (e) => {
      if (e.target.matches("input[type=range]")) this.range(e.target);
    });
    this.buildSettings();
    this.buildDev();
    this.buildCredits();
    this.radar = $("radar");
    this.ctx = this.radar.getContext("2d");
    this.resizeRadar();
    this.prompts();
  }
  controls() {
    const section = document.querySelector(".screen:not([hidden])");
    return section
      ? Array.from(section.querySelectorAll("button:not([disabled]),input:not([disabled])")).filter(
          (el) => el.getClientRects().length > 0,
        )
      : [];
  }
  focused() {
    const c = this.controls();
    return c.find((e) => e.classList.contains("focused")) || c[0];
  }
  setFocus(el, scroll = true) {
    for (const b of this.controls()) b.classList.toggle("focused", b === el);
    if (scroll) el?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  moveFocus(n) {
    if (this.app.screen === "credits") {
      $("credits-body").scrollBy({ top: n * innerHeight * 0.25, behavior: "smooth" });
      return;
    }
    const c = this.controls();
    if (!c.length) return;
    const current = Math.max(0, c.indexOf(this.focused()));
    this.index = (current + n + c.length) % c.length;
    this.setFocus(c[this.index]);
    this.app.audio.play("ui");
  }
  activate() {
    const b = this.focused();
    if (!b) return;
    if (b.tagName === "INPUT") this.adjust(1);
    else b.click();
  }
  adjust(n) {
    const b = this.focused();
    if (b?.tagName === "INPUT") {
      const step = Number(b.step) || 1;
      b.value = Math.max(Number(b.min), Math.min(Number(b.max), Number(b.value) + n * step));
      this.range(b);
      this.app.audio.play("ui");
    } else this.moveFocus(n);
  }
  show(screen) {
    document.querySelectorAll(".screen").forEach((e) => (e.hidden = e.id !== screen));
    $("hud").hidden = !["play", "attract", "hubwait", "ended"].includes(screen);
    $("world-labels").hidden = !["play", "attract"].includes(screen);
    $("attract-label").hidden = screen !== "attract";
    $("hubwait-label").hidden = screen !== "hubwait";
    document.body.dataset.screen = screen;
    this.setFocus(this.controls()[0], false);
    $("touch-menu").hidden = !["play", "attract"].includes(screen);
    if (screen === "options") this.buildSettings();
    if (screen === "dev") this.buildDev();
    if (screen === "result") this.results();
    if (screen === "pause") {
      $("pause-sub").textContent = window.AIHub.active
        ? "PATROL CONTINUES ON THE HUB CLOCK"
        : "ROTOR BRAKE ENGAGED";
      document
        .querySelectorAll("[data-solo-only]")
        .forEach((e) => (e.hidden = window.AIHub.active));
    }
    this.prompts();
  }
  prompt(action) {
    if (this.app.input?.last === "touch")
      return {
        fire: "AUTO FIRE",
        rocket: "TAP · ROCKET",
        flare: "AUTO FLARES",
        boost: "DRAG · FLY",
        pause: "MENU",
        fly: "LEFT THUMB · FLY",
        aim: "AUTO AIM",
        accept: "TAP",
        back: "BACK",
      }[action];
    if (this.app.input?.last === "gamepad") {
      const xbox = this.app.settings.glyphs === "xbox";
      return {
        fire: (xbox ? "RT / A" : "R2 / ✕") + " FIRE",
        rocket: (xbox ? "X" : "□") + " ROCKET",
        flare: (xbox ? "B" : "○") + " FLARES",
        boost: xbox ? "LS CLICK · BOOST" : "L3 BOOST",
        pause: xbox ? "≡ MENU" : "OPTIONS MENU",
        fly: xbox ? "LS FLY" : "L FLY",
        aim: xbox ? "RS AIM" : "R AIM",
        accept: xbox ? "A SELECT" : "✕ SELECT",
        back: xbox ? "B BACK" : "○ BACK",
      }[action];
    }
    return {
      fire: "LMB / SPACE · FIRE",
      rocket: "E / RMB · ROCKET",
      flare: "Q · FLARES",
      boost: "SHIFT · BOOST",
      pause: "ESC · MENU",
      fly: "WASD / ARROWS · FLY",
      aim: "MOUSE · AIM",
      accept: "ENTER · SELECT",
      back: "ESC · BACK",
    }[action];
  }
  prompts() {
    document
      .querySelectorAll("[data-prompt]")
      .forEach((e) => (e.textContent = this.prompt(e.dataset.prompt) || ""));
    $("glyph-button") &&
      ($("glyph-button").textContent =
        "GLYPHS · " + (this.app.settings.glyphs === "ps" ? "PLAYSTATION" : "XBOX"));
  }
  toast(text) {
    $("toast").textContent = text;
    $("toast").hidden = false;
    this.toastUntil = performance.now() + 2200;
  }
  buildSettings() {
    const s = this.app.settings;
    $("settings-controls").innerHTML =
      `<label class="slider-row"><span>MUSIC <output>${Math.round(s.music * 100)}%</output></span><input aria-label="Music volume" data-setting="music" type="range" min="0" max="1" step="0.01" value="${s.music}"></label><label class="slider-row"><span>EFFECTS & RADIO <output>${Math.round(s.sfx * 100)}%</output></span><input aria-label="Effects volume" data-setting="sfx" type="range" min="0" max="1" step="0.05" value="${s.sfx}"></label><div class="options-grid"><button id="glyph-button" data-action="glyphs">GLYPHS · ${s.glyphs === "ps" ? "PLAYSTATION" : "XBOX"}</button><button data-action="shake">SCREEN SHAKE · ${s.shake ? "ON" : "OFF"}</button><button data-action="assist">AIM ASSIST · ${s.aimAssist ? "ON" : "OFF"}</button><button data-action="difficulty">PATROL · ${s.difficulty.toUpperCase()}</button><button data-action="fullscreen">FULLSCREEN ↗</button><button data-action="resetSettings">RESET OPTIONS</button></div>`;
    this.setFocus(this.controls()[0], false);
    this.prompts();
  }
  range(input) {
    const value = Number(input.value),
      key = input.dataset.setting || input.dataset.config;
    if (input.dataset.setting) {
      this.app.settings[key] = value;
      input.previousElementSibling.querySelector("output").textContent =
        Math.round(value * 100) + "%";
      this.app.audio.apply();
      this.app.saveSettings();
    } else {
      this.app.game.config[key] = value;
      input.previousElementSibling.querySelector("output").textContent = value.toFixed(
        key === "speed" || key === "fireRate" ? 0 : 2,
      );
    }
  }
  buildDev() {
    const vars = [
      ["speed", "FLIGHT SPEED", 7, 30, 1],
      ["fireRate", "GUN RATE", 3, 18, 1],
      ["weaponDamage", "GUN & ROCKET POWER", 0.5, 4, 0.25],
      ["incoming", "INCOMING DAMAGE", 0, 2, 0.1],
      ["spawnRate", "RAIDER DENSITY", 0.5, 2, 0.25],
      ["rocketCooldown", "ROCKET DELAY", 0.2, 3, 0.2],
    ];
    $("dev-controls").innerHTML = vars
      .map(
        ([key, label, min, max, step]) =>
          `<label class="slider-row"><span>${label}<output>${this.app.game.config[key].toFixed(key === "speed" || key === "fireRate" ? 0 : 2)}</output></span><input type="range" aria-label="${label}" data-config="${key}" min="${min}" max="${max}" step="${step}" value="${this.app.game.config[key]}"></label>`,
      )
      .join("");
    $("dev-god").textContent = "INVULNERABLE · " + (this.app.game.god ? "ON" : "OFF");
    $("dev-auto").textContent = "AUTOPILOT · " + (this.app.game.auto ? "ON" : "OFF");
    this.setFocus(this.controls()[0], false);
  }
  buildCredits() {
    const labels = {
      date: "Date",
      source: "Source",
      plan: "Plan",
      genre: "Genre",
      perspective: "Perspective",
      tech: "Tech",
      artDirection: "Art Direction",
      animation: "Animation",
      audio: "Audio",
      online: "Online",
      testing: "Testing",
      research: "Research",
      environment: "Environment",
      model: "Model",
      usage: "Usage",
    };
    const questions = [
      [
        "Testing Feedback",
        ["Issues caught", "Critical / game breaking", "Most helpful test", "Least helpful test"],
        "testingFeedback",
      ],
      [
        "Engine Feedback",
        [
          "Liked most",
          "Stuck or guessed wrong",
          "Built ourselves",
          "Hardest part",
          "Engine changes",
          "One engine wish",
        ],
        "engineFeedback",
      ],
      [
        "Prompt Feedback",
        ["Liked most", "Confusing", "Hardest task", "Suggested change"],
        "promptFeedback",
      ],
    ];
    $("credits-body").innerHTML =
      `<div class="credits-intro">A little chopper. A whole lot of trouble.<p>An original desert arcade patrol inspired by Chopper Command (1982). All models, effects, music and radio voices are made in code. Original game by Activision; this tribute is unaffiliated.</p><p>Code & design: OpenAI gpt-6.1-sol. Three.js contributors (MIT), Rapier / Dimforge (Apache-2.0), AI Hub session client 1.4.0. No external art or audio assets.</p></div><h3>Source Information</h3><dl>${Object.entries(
        credits.sourceInformation,
      )
        .map(([k, v]) => `<dt>${labels[k] || k}</dt><dd>${safe(v)}</dd>`)
        .join(
          "",
        )}</dl>${questions.map(([heading, q, key]) => `<h3>${heading}</h3><dl>${q.map((question, i) => `<dt>${question}</dt><dd>${safe(credits[key][i] || "unknown")}</dd>`).join("")}</dl>`).join("")}<p class="credit-end">THANKS FOR KEEPING THE WHEELS TURNING.</p>`;
  }
  results() {
    const g = this.app.game;
    $("result-kicker").textContent = g.training
      ? "FLIGHT SCHOOL COMPLETE"
      : g.won
        ? "ALL THREE SECTORS SECURE"
        : "PATROL REPORT";
    $("result-title").textContent = g.training
      ? "WINGS EARNED."
      : g.won
        ? "ROAD CLEAR."
        : g.reason + ".";
    $("result-score").textContent = g.score.toLocaleString("en-US");
    const rank = g.won
      ? g.rescued >= 4 && g.trucks.every((t) => t.hp > 0)
        ? "S"
        : g.trucks.every((t) => t.hp > 0)
          ? "A"
          : "B"
      : "C";
    $("result-rank").textContent = rank;
    $("result-stats").innerHTML =
      `<div><b>${g.kills}</b><span>RAIDERS DOWN</span></div><div><b>${g.rescued}</b><span>CREW RESCUED</span></div><div><b>${g.trucks.filter((t) => t.hp > 0).length} / 3</b><span>TRUCKS HOME</span></div>`;
    $("result-next").textContent = g.training ? "TAKE THE PATROL" : "FLY AGAIN";
    $("result-next").dataset.action = g.training ? "solo" : "retry";
    $("result-best").textContent =
      "PERSONAL BEST  " + Math.max(this.app.best, g.score).toLocaleString("en-US");
  }
  resizeRadar() {
    this.radar.width = 680;
    this.radar.height = 74;
  }
  drawRadar() {
    const g = this.app.game,
      ctx = this.ctx,
      w = this.radar.width,
      h = this.radar.height;
    ctx.clearRect(0, 0, w, h);
    const xx = (x) => ((x + 230) / 460) * (w - 24) + 12,
      yy = (y) => h - 9 - (y / 32) * (h - 16);
    ctx.strokeStyle = "#fff1ce30";
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const x = (i * w) / 6;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff1ce70";
    ctx.fillRect(10, h - 7, w - 20, 1);
    const cam = this.app.gfx.cameraX,
      half = this.app.gfx.camera.right;
    ctx.fillStyle = "#fff1ce0a";
    ctx.fillRect(xx(cam - half), 0, xx(cam + half) - xx(cam - half), h);
    ctx.strokeStyle = "#fff1ce45";
    ctx.strokeRect(xx(cam - half), 1, xx(cam + half) - xx(cam - half), h - 3);
    ctx.fillStyle = "#70c6a0";
    ctx.fillRect(xx(this.app.gfx.pad.position.x) - 3, h - 7, 6, 4);
    for (const c of g.crew)
      if (!c.saved) {
        ctx.fillStyle = "#8be1c1";
        ctx.beginPath();
        ctx.arc(xx(c.x), h - 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    for (const t of g.trucks) {
      ctx.fillStyle = t.hp > 0 ? "#fff1ce" : "#776d61";
      ctx.fillRect(xx(t.x) - 3, yy(1.5), 6, 4);
    }
    for (const e of g.enemies) {
      ctx.fillStyle = e.type === "boss" ? "#ff9f60" : "#ff7360";
      ctx.save();
      ctx.translate(xx(e.x), yy(e.y));
      ctx.rotate(Math.PI / 4);
      const s = e.type === "boss" ? 7 : 4;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    for (const p of g.players) {
      ctx.fillStyle = p.id ? "#73d6c0" : "#ffd05b";
      ctx.beginPath();
      ctx.arc(xx(p.x), yy(p.y), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ghost of g.ghosts.values())
      if (ghost.visible) {
        ctx.fillStyle = "#a6b8ff";
        ctx.beginPath();
        ctx.arc(xx(ghost.position.x), yy(ghost.position.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  update(now) {
    if (now > this.toastUntil) $("toast").hidden = true;
    if (now - this.lastHud < 75) return;
    this.lastHud = now;
    const g = this.app.game;
    if (!g.players.length) return;
    $("score").textContent = g.score.toString().padStart(6, "0");
    $("sector-name").textContent = g.training
      ? "FLIGHT SCHOOL"
      : `${String(g.sector + 1).padStart(2, "0")} / ${SECTORS[g.sector].name}`;
    const instructions = [
      "FLY  ·  Move away from the convoy",
      "FIRE  ·  Clear the red chopper",
      "ROCKET  ·  Crack the ground turret",
      "FLARES  ·  Shake the incoming missile",
      "RESCUE  ·  Hover low over the green beacon",
    ];
    $("objective").textContent = g.training
      ? instructions[g.trainingStep]
      : g.intermission > 0
        ? g.sector === 2
          ? "PATROL COMPLETE"
          : "SECTOR CLEAR  ·  NEXT PATROL IN " + Math.ceil(g.intermission)
        : g.boss && !g.boss.removed
          ? "DESTROY THE DUSTMAKER"
          : `CLEAR THE SKY  ·  ${g.spawnLeft + g.enemies.length} RAIDERS LEFT`;
    $("convoy-count").textContent = g.trucks.filter((t) => t.hp > 0).length + " / 3";
    $("convoy-bars").innerHTML = g.trucks
      .map((t) => `<i style="--health:${t.hp}%;--bar:${t.hp > 35 ? "#fff1ce" : "#ff7665"}"></i>`)
      .join("");
    $("reserve-count").textContent = "RESERVES  " + g.reserves;
    const p = g.players[0];
    $("armor-value").textContent = Math.ceil(p.hp);
    $("armor-fill").style.width = p.hp + "%";
    $("armor-fill").style.background = p.hp < 30 ? "#ff7360" : "#ffd05b";
    $("rocket-count").textContent = String(p.rockets).padStart(2, "0");
    $("flare-count").textContent = String(p.flares).padStart(2, "0");
    $("boost-fill").style.width = p.boost * 100 + "%";
    $("p2-status").hidden = !g.coop;
    if (g.coop)
      $("p2-status").textContent =
        "P2  " + Math.ceil(g.players[1].hp) + "%  ·  " + g.players[1].rockets + " ROCKETS";
    $("radio-message").textContent =
      g.time < g.radioUntil ? g.radioText : "CONVOY FREQUENCY  /  88.2";
    $("radio").classList.toggle("speaking", g.time < g.radioUntil);
    $("boss-meter").hidden = !g.boss || g.boss.removed;
    if (g.boss && !g.boss.removed) {
      $("boss-fill").style.width = (g.boss.hp / g.boss.maxHp) * 100 + "%";
      $("boss-phase").textContent = g.boss.phase2 ? "DUSTMAKER  /  ANGRY" : "DUSTMAKER  /  ARMORED";
    }
    const hover =
      p.rescue > 0
        ? `WINCHING  ${Math.floor(p.rescue * 100)}%`
        : p.atPad
          ? "FIELD PAD  /  REPAIRING & REARMING"
          : p.hp <= 0
            ? g.reserves
              ? "REPLACEMENT INBOUND"
              : "BIRD DOWN"
            : "";
    $("hover-status").hidden = !hover;
    $("hover-status").textContent = hover;
    const target = g.nearestEnemy(p.x, p.y);
    $("touch-rocket").hidden =
      this.app.input.last !== "touch" || !target || this.app.screen !== "play" || p.rockets < 1;
    this.drawRadar();
    // World labels use the same orthographic camera as the aircraft.
    const labels = [];
    for (const c of g.crew)
      if (!c.saved) {
        const v = this.app.gfx.project(c.x, 3);
        if (Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.9)
          labels.push(
            `<span class="world-tag rescue-tag" style="left:${(v.x * 0.5 + 0.5) * 100}%;top:${(-v.y * 0.5 + 0.5) * 100}%">↓ RESCUE</span>`,
          );
      }
    const v = this.app.gfx.project(this.app.gfx.pad.position.x, 1);
    if (Math.abs(v.x) < 0.95)
      labels.push(
        `<span class="world-tag pad-tag" style="left:${(v.x * 0.5 + 0.5) * 100}%;top:${(-v.y * 0.5 + 0.5) * 100}%">H · FIELD PAD</span>`,
      );
    for (const [id, ghost] of g.ghosts)
      if (ghost.visible) {
        const v = this.app.gfx.project(ghost.position.x, ghost.position.y + 2.7);
        const name = this.app.hubInfo?.players.find((p) => p.id === id)?.name || "WING";
        labels.push(
          `<span class="world-tag ghost-tag" style="left:${(v.x * 0.5 + 0.5) * 100}%;top:${(-v.y * 0.5 + 0.5) * 100}%">${safe(name)}</span>`,
        );
      }
    $("world-labels").innerHTML = labels.join("");
  }
}
