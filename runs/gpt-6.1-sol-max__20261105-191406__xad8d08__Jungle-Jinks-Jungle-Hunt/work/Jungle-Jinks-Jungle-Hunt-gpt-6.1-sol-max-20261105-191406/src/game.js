import { ball, createStage, makeAvatar, STAGES, seeded, THREE, updateStage } from "./art.js";
import { JungleAudio } from "./audio.js";
import { emptyInput, Input } from "./input.js";
import {
  engineFeedback,
  feedbackQuestions,
  promptFeedback,
  sourceInformation,
  testingFeedback,
} from "./metadata.js";
import { HubRace, PeerRace } from "./network.js";
import { DEFAULTS, RAPIER, Runner } from "./runner.js";

const $ = (s) => document.querySelector(s),
  show = (s, yes = true) => {
    const e = typeof s === "string" ? $(s) : s;
    e?.classList.toggle("hidden", !yes);
  },
  clamp = THREE.MathUtils.clamp;
const timeText = (t) =>
  `${Math.floor(t / 60)}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
const safe = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const qs = new URLSearchParams(location.search);
class Game {
  constructor() {
    this.mode = "loading";
    this.ready = false;
    this.cfg = { ...DEFAULTS };
    this.runners = [];
    this.ghosts = new Map();
    this.time = 0;
    this.lastActivity = performance.now();
    this.attract = false;
    this.modal = null;
    this.modalBack = "title";
    this.focusIndex = 0;
    this.ignoreUntil = 0;
    this.accumulator = 0;
    this.lastFrame = 0;
    this.netTimer = 0;
    this.toastTime = 0;
    this.bannerTime = 0;
    this.rng = seeded(7337);
    this.particles = [];
    this.testManual = false;
    this.renderEnabled = true;
    this.events = [];
    this.attractRestart = 0;
    this.settings = {
      music: 0.1,
      effects: 0.7,
      glyphs: "ps",
      assist: true,
      reduced: false,
    };
    try {
      Object.assign(this.settings, JSON.parse(localStorage.getItem("jungle-jinks-options") || "{}"));
      this.best = JSON.parse(localStorage.getItem("jungle-jinks-best") || "null");
    } catch {}
    this.audio = new JungleAudio();
    this.audio.setVolumes(this.settings.music, this.settings.effects);
    document.body.classList.toggle("reduced", this.settings.reduced);
    this.input = new Input(
      (k, l) => this.activity(k, l),
      () => this.togglePause(),
      (k) => this.menuKey(k),
      () => this.audio.unlock(),
    );
    this.hub = new HubRace(this);
    this.peer = new PeerRace(
      (d) => this.peerPacket(d),
      (s) => this.peerStatus(s),
    );
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-action]");
      if (b && performance.now() > this.ignoreUntil) this.action(b.dataset.action, b);
    });
    document.addEventListener("pointerover", (e) => {
      const b = e.target.closest("button,input");
      if (b && b !== this.focused) {
        this.focused?.classList.remove("focused");
        this.focused = b;
        b.classList.add("focused");
        const list = this.focusables();
        this.focusIndex = list.indexOf(b);
      }
    });
    document.addEventListener("input", (e) => this.handleSlider(e));
    document.addEventListener("visibilitychange", () => {
      if (
        document.hidden &&
        this.mode === "playing" &&
        !window.AIHub.active &&
        !this.peer.connected &&
        !this.testManual
      )
        this.pause();
    });
    window.addEventListener("resize", () => this.resize());
  }
  async init() {
    $("#loadingText").textContent = "Growing an improbable jungle…";
    await RAPIER.init();
    let device;
    if (navigator.gpu && qs.get("backend") !== "webgl") {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (adapter) device = await adapter.requestDevice({ requiredFeatures: [] });
    }
    this.renderer = new THREE.WebGPURenderer({
      canvas: $("#world"),
      antialias: true,
      forceWebGL: qs.get("backend") === "webgl",
      powerPreference: "high-performance",
      device,
    });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    await this.renderer.init();
    this.renderer.onDeviceLost = (info) => this.recoverRenderer(info);
    this.backend = this.renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL 2";
    $("#loadingText").textContent = "Teaching the crocodiles some manners…";
    this.stages = STAGES.map((_, i) => createStage(i));
    this.cameras = [new THREE.OrthographicCamera(), new THREE.OrthographicCamera()];
    this.titleAvatar = makeAvatar();
    this.titleAvatar.root.scale.setScalar(1.25);
    this.stages[0].scene.add(this.titleAvatar.root);
    this.titleAvatar.setAnim("hang");
    this.resize();
    this.ready = true;
    window.JungleJinks = {
      version: "1.0.0",
      engine: "Three.js r180",
      physics: "Rapier 0.19.3",
      getState: () => this.getState(),
    };
    if (qs.has("test")) this.installTestAPI();
    if (window.AIHub.active) {
      show("#loading", false);
      this.mode = "hubwaiting";
      if (!(await this.hub.connect())) this.goTitle();
    } else this.goTitle();
    show("#loading", false);
    this.lastFrame = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }
  async recoverRenderer(info) {
    if (this.recovering) return;
    this.recovering = true;
    this.deviceLoss = String(info?.message || "unknown");
    const old = this.renderer,
      canvas = $("#world"),
      replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    try {
      const renderer = new THREE.WebGPURenderer({ canvas: replacement, antialias: true, forceWebGL: true });
      await renderer.init();
      renderer.setPixelRatio(devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer = renderer;
      this.backend = "WebGL 2";
      this.recoveryCount = (this.recoveryCount || 0) + 1;
      this.resize();
      try {
        old.dispose();
      } catch {}
      this.events.push({ type: "renderer-recovered", backend: this.backend });
    } catch (error) {
      if (window.AIHub.active) window.AIHub.fail(error.message);
      this.toast("The graphics device could not restart. Reload to reopen the trail.", 20);
    } finally {
      this.recovering = false;
    }
  }
  resize() {
    if (!this.renderer) return;
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.split = this.runners.length === 2;
    const aspect = (this.split ? innerWidth / 2 : innerWidth) / innerHeight,
      portrait = aspect < 0.8,
      half = portrait ? 11 : 9.6;
    for (const c of this.cameras || []) {
      c.left = -half * aspect;
      c.right = half * aspect;
      c.top = half;
      c.bottom = -half;
      c.near = 0.1;
      c.far = 130;
      c.updateProjectionMatrix();
    }
    $("#ui").classList.toggle("split", this.split);
    show("#splitLine", this.split);
    show("#p2hud", this.split);
  }
  activity(_kind, _loud = true) {
    this.lastActivity = performance.now();
    if (this.attract) {
      this.goTitle();
      return true;
    }
    if (this.ready) this.updatePrompts();
    return false;
  }
  focusables() {
    const root = this.modal ? $("#modalRoot") : this.mode === "title" ? $("#titleScreen") : null;
    if (!root) return [];
    return Array.from(root.querySelectorAll("button,input,textarea")).filter(
      (e) => !e.disabled && e.getClientRects().length,
    );
  }
  focus(index = 0) {
    const list = this.focusables();
    if (!list.length) return;
    this.focused?.classList.remove("focused");
    this.focusIndex = (index + list.length) % list.length;
    this.focused = list[this.focusIndex];
    this.focused.classList.add("focused");
    if (this.modal) this.focused.scrollIntoView({ block: "nearest" });
  }
  menuKey(code) {
    if (performance.now() < this.ignoreUntil || this.hub.ended) return;
    if (code === "Escape") {
      this.togglePause();
      return;
    }
    if (!this.modal && this.mode !== "title") return;
    const list = this.focusables();
    if (!list.length) return;
    if (["ArrowDown", "KeyS", "Tab"].includes(code)) this.focus(this.focusIndex + 1);
    else if (["ArrowUp", "KeyW"].includes(code)) this.focus(this.focusIndex - 1);
    else if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(code)) {
      const e = this.focused;
      if (e?.type === "range") {
        const n = ["ArrowRight", "KeyD"].includes(code) ? 1 : -1;
        e.value = clamp(+e.value + n * (+e.step || 1), +e.min, +e.max);
        e.dispatchEvent(new Event("input", { bubbles: true }));
      } else this.focus(this.focusIndex + (["ArrowRight", "KeyD"].includes(code) ? 1 : -1));
    } else if (code === "Enter" || code === "Space") this.focused?.click();
  }
  glyph(key) {
    if (this.input.kind !== "gamepad")
      return {
        jump: "Space",
        cut: "J / click",
        interact: "E",
        duck: "Shift",
        move: "A D / ← →",
        swim: "WASD / arrows",
        pause: "Esc",
      }[key];
    const xbox = this.settings.glyphs === "xbox";
    return (
      xbox
        ? {
            jump: "A",
            cut: "X",
            interact: "Y",
            duck: "B",
            move: "L stick",
            swim: "L stick",
            pause: "Menu",
          }
        : {
            jump: "✕",
            cut: "□",
            interact: "△",
            duck: "○",
            move: "L stick",
            swim: "L stick",
            pause: "Options",
          }
    )[key];
  }
  updatePrompts() {
    const pad = this.input.kind === "gamepad";
    $("#titleInputHint").textContent =
      this.input.kind === "touch"
        ? "A LITTLE TAP. A BIG ADVENTURE."
        : pad
          ? "LEFT STICK TO CHOOSE · " + this.glyph("jump") + " TO BEGIN"
          : "WASD + SPACE TO EXPLORE";
    const r = this.runners[0];
    if (!r) return;
    const key = (k) => `<span class="key">${this.glyph(k)}</span>`;
    let text = "";
    if (r.stageIndex === 0)
      text = r.swing
        ? `${key("move")} build your swing · ${key("jump")} let go`
        : `${key("move")} move · ${key("jump")} leap & catch a vine`;
    if (r.stageIndex === 1) text = `${key("swim")} swim · ${key("jump")} surge · ${key("cut")} swish`;
    if (r.stageIndex === 2) text = `${key("jump")} jump rolling rocks · ${key("duck")} duck high ones`;
    if (r.stageIndex === 3) {
      const w = r.nearWinch();
      text =
        w >= 0 && !r.winchDone[w]
          ? `Hold ${key("interact")} to wind · ${Math.floor((r.winchCharge[w] / this.cfg.winchTime) * 100)}%`
          : r.winchDone.every(Boolean)
            ? `${key("interact")} free Pip at the basket`
            : `Hold ${key("interact")} at each winch · ${r.winchDone.filter(Boolean).length} / 3 wound`;
    }
    $("#actionPrompt").innerHTML = text;
    show("#touchUI", this.input.kind === "touch" && ["playing", "attract"].includes(this.mode));
    const action = r.swing
      ? "RELEASE"
      : r.stageIndex === 1
        ? "SWISH"
        : r.nearWinch() >= 0
          ? "WIND"
          : r.stageIndex === 3 && r.position.x > 79
            ? "RESCUE"
            : "LEAP";
    $("#touchAction").textContent = action;
    show(
      "#touchAction",
      this.input.kind === "touch" &&
        (r.swing || r.stageIndex === 1 || r.nearWinch() >= 0 || (r.stageIndex === 3 && r.position.x > 79)),
    );
  }
  goTitle() {
    if (window.AIHub.active) return;
    this.attractRestart = 0;
    this.clearRunners();
    this.clearGhosts();
    this.peer.close();
    this.attract = false;
    this.mode = "title";
    this.modal = null;
    this.lastActivity = performance.now();
    this.titleAvatar.root.visible = true;
    show("#titleScreen");
    show("#modalRoot", false);
    show("#hud", false);
    show("#attractLabel", false);
    show("#stageBanner", false);
    show("#touchUI", false);
    show("#rivalHud", false);
    show("#countdown", false);
    this.toastTime = 0;
    show("#toast", false);
    this.resize();
    this.focus(0);
    if (this.best)
      $(".title-bottom .build").textContent =
        `BEST EXPEDITION ${this.best.score.toLocaleString()} · ${timeText(this.best.time)}`;
    this.audio.ended = false;
    this.events.push({ type: "title" });
    this.updatePrompts();
  }
  clearRunners() {
    for (const r of this.runners) r.dispose();
    this.runners = [];
    for (const p of this.particles) p.mesh.removeFromParent();
    this.particles = [];
  }
  beginRun(opts = {}) {
    this.clearRunners();
    this.attractRestart = 0;
    this.clearGhosts();
    for (const stage of this.stages) for (const actor of [...stage.crocs, ...stage.guardians]) actor.stun = 0;
    this.time = 0;
    this.modal = null;
    show("#modalRoot", false);
    this.attract = !!opts.attract;
    this.mode = this.attract ? "attract" : "playing";
    this.titleAvatar.root.visible = false;
    show("#titleScreen", false);
    show("#hud");
    show("#attractLabel", this.attract);
    show("#hubWait", false);
    show("#rivalHud", false);
    this.runners.push(new Runner(this, 0));
    if (opts.local) this.runners.push(new Runner(this, 1));
    for (const r of this.runners) {
      r.god = this.attract || !!opts.god;
      r.bot = this.attract || !!opts.bot;
    }
    if (this.attract) for (const r of this.runners) r.health = 5;
    this.input.clear();
    this.resize();
    this.updateHUD();
    this.updatePrompts();
    if (this.input.kind === "touch") {
      show("#touchHint");
      this.touchHintTime = 7;
    }
    this.events.push({
      type: "start",
      attract: this.attract,
      local: !!opts.local,
    });
  }
  onStage(i) {
    this.events.push({
      type: "stage",
      stage: i,
      time: this.runners[0]?.elapsed || 0,
    });
    const d = STAGES[i];
    $("#objectiveTitle").textContent = d.verb;
    $("#objectiveText").textContent = d.instruction;
    $("#stageBanner").innerHTML =
      `<span class="eyebrow">ACT 0${i + 1} / 04</span><h2>${d.name}</h2><p>${d.verb}</p>`;
    this.bannerTime = 2.9;
    show("#stageBanner");
    this.audio.voice(i === 3 ? "hello" : "hello");
  }
  sfx(name, runner) {
    if (!this.attract && (runner?.index ?? 0) === 0) this.audio.effect(name);
  }
  toast(text, duration = 2, runner) {
    if (runner?.index > 0) return;
    $("#toast").textContent = text;
    show("#toast");
    this.toastTime = duration;
  }
  damage(r) {
    if (r.index > 0) return;
    this.flashTime = 0.35;
    $("#damageFlash").style.opacity = "1";
    if (!this.settings.reduced) this.shakeTime = 0.2;
    this.audio.voice("hurt");
  }
  burst(stage, x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const mesh = ball(
        this.stages[stage].dynamic,
        x,
        y,
        0.6,
        0.035 + this.rng() * 0.035,
        0.035 + this.rng() * 0.045,
        0.035,
        color,
      );
      mesh.castShadow = false;
      this.particles.push({
        mesh,
        vx: (this.rng() - 0.5) * 6,
        vy: 2 + this.rng() * 4,
        life: 0.6 + this.rng() * 0.5,
        stage,
      });
    }
  }
  pause() {
    if (!["playing", "paused"].includes(this.mode) || this.attract) return;
    this.mode = "paused";
    this.openModal("pause");
    this.input.clear();
  }
  togglePause() {
    if (this.hub.ended || performance.now() < this.ignoreUntil) return;
    if (this.attract) {
      this.goTitle();
      return;
    }
    if (this.modal) {
      if (this.modal === "down") return;
      if (this.modal === "results") {
        this.goTitle();
        return;
      }
      if (this.modal === "pause") this.resume();
      else this.back();
      return;
    }
    if (this.mode === "playing") this.pause();
  }
  resume() {
    this.modal = null;
    show("#modalRoot", false);
    this.mode = "playing";
    this.input.clear();
  }
  back() {
    if (this.modalBack === "pause") {
      this.openModal("pause");
      return;
    }
    if (this.modalBack === "multiplayer") {
      this.openModal("multiplayer");
      return;
    }
    this.modal = null;
    show("#modalRoot", false);
    this.focus(0);
  }
  action(action, b) {
    this.lastActivity = performance.now();
    this.audio.unlock();
    this.audio.effect("click");
    if (action === "play") {
      if (window.AIHub.active) return;
      if (this.peer.connected) {
        if (this.peer.host) {
          const at = Date.now() + 3300;
          this.peer.send({ type: "start", at });
          this.startPeer(at);
        } else {
          this.peer.send({ type: "rematch" });
          this.toast("Another shortcut requested. Waiting for the host.", 5);
          if (b) {
            b.disabled = true;
            b.textContent = "Waiting for the host…";
          }
        }
        return;
      }
      this.beginRun({ local: this.runners.length === 2 });
      this.audio.voice();
    } else if (action === "pause") this.pause();
    else if (action === "resume") this.resume();
    else if (action === "back") this.back();
    else if (["settings", "howto", "about", "multiplayer", "dev"].includes(action)) {
      this.modalBack = this.mode === "paused" ? "pause" : "title";
      this.openModal(action);
    } else if (action === "title") {
      if (!window.AIHub.active) this.goTitle();
    } else if (action === "retry") {
      this.runners[0]?.retry();
      this.resume();
    } else if (action === "local") {
      this.peer.close();
      this.beginRun({ local: true });
    } else if (action === "online") {
      this.modalBack = "multiplayer";
      this.openModal("online");
    } else if (action === "glyphs") {
      this.settings.glyphs = this.settings.glyphs === "ps" ? "xbox" : "ps";
      this.saveSettings();
      this.openModal("settings");
    } else if (action === "assist" || action === "reduced") {
      this.settings[action] = !this.settings[action];
      this.saveSettings();
      this.openModal("settings");
    } else if (action === "fullscreen") {
      const p = document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen();
      p?.catch(() => this.toast("Fullscreen is unavailable in this browser."));
    } else if (action === "credits-tab") this.renderCredits(b.dataset.tab);
    else if (action === "dev-god") {
      this.runners.forEach((r) => {
        r.god = !r.god;
      });
      this.openModal("dev");
    } else if (action === "dev-bot") {
      this.runners.forEach((r) => {
        r.bot = !r.bot;
      });
      this.openModal("dev");
    } else if (action === "dev-noclip") {
      this.runners.forEach((r) => {
        r.noclip = !r.noclip;
      });
      this.openModal("dev");
    } else if (action === "dev-refill") {
      this.runners.forEach((r) => {
        r.health = 5;
        r.oxygen = this.cfg.air;
        r.down = false;
      });
      this.toast("Supplies restored.");
    } else if (action === "dev-checkpoint") {
      for (const r of this.runners) {
        r.checkpoint = (r.checkpoint + 1) % 4;
        r.respawn();
      }
      this.openModal("dev");
    } else if (action === "dev-stage") {
      for (const r of this.runners) r.enterStage(+b.dataset.stage);
      this.openModal("dev");
    } else if (action === "dev-rock") {
      this.runners
        .filter((r) => r.stageIndex === 2)
        .forEach((r) => {
          r.spawnRock();
        });
      this.toast(
        this.runners.some((r) => r.stageIndex === 2)
          ? "One rolling problem, freshly delivered."
          : "Choose Act 03 to spawn a boulder.",
      );
    } else if (action === "dev-reset") {
      Object.assign(this.cfg, DEFAULTS);
      this.openModal("dev");
      this.toast("Balance restored to expedition defaults.");
    } else if (action === "host-offer") this.hostOffer();
    else if (action === "join-offer") this.joinOffer();
    else if (action === "accept-answer") this.acceptAnswer();
    else if (action === "copy-code") this.copyCode();
    else if (action === "peer-start" && this.peer.connected && this.peer.host) {
      const at = Date.now() + 3300;
      this.peer.send({ type: "start", at });
      this.startPeer(at);
    }
    if (["glyphs", "assist", "reduced", "dev-god", "dev-bot", "dev-noclip"].includes(action))
      this.focus(this.focusables().findIndex((e) => e.dataset.action === action));
  }
  saveSettings() {
    document.body.classList.toggle("reduced", this.settings.reduced);
    this.audio.setVolumes(this.settings.music, this.settings.effects);
    try {
      localStorage.setItem("jungle-jinks-options", JSON.stringify(this.settings));
    } catch {}
    this.updatePrompts();
  }
  handleSlider(e) {
    this.lastActivity = performance.now();
    const x = e.target;
    if (x.dataset.setting) {
      const key = x.dataset.setting;
      this.settings[key] = +x.value / 100;
      this.saveSettings();
      $(`#out-${key}`).textContent = x.value + "%";
    }
    if (x.dataset.dev) {
      const key = x.dataset.dev;
      this.cfg[key] = +x.value;
      $(`#dev-out-${key}`).textContent = Number(x.value).toFixed(key === "gravity" || key === "air" ? 0 : 1);
    }
  }
  panel(body, wide = false) {
    show("#modalRoot");
    $("#modalRoot").innerHTML =
      `<div class="modal-shade"><section class="panel ${wide ? "wide" : ""}" aria-modal="true" role="dialog">${body}</section></div>`;
    this.focus(0);
  }
  openModal(name) {
    this.modal = name;
    const back = `<div class="panel-foot"><button class="back-btn" data-action="back">← Back</button><span class="dim eyebrow">JUNGLE JINKS</span></div>`;
    if (name === "pause") {
      this.modalBack = "title";
      const hub = window.AIHub.active;
      this.panel(
        `<span class="eyebrow accent">A BRIEF BREATHER</span><h2>Hold that vine.</h2><div class="menu"><button class="big-btn" data-action="resume">Back to the adventure <span>↗</span></button><button class="big-btn secondary" data-action="howto">Field guide <span>?</span></button><button class="big-btn secondary" data-action="settings">Options <span>☷</span></button><button class="big-btn secondary" data-action="dev">Expedition workshop <span>DEV</span></button>${hub ? "" : `<button class="big-btn secondary" data-action="retry">Return to checkpoint <span>↶</span></button><button class="big-btn secondary" data-action="title">Pack it in <span>←</span></button>`}</div>${hub ? "<p>The race clock keeps ticking while you take a breather.</p>" : ""}`,
      );
    }
    if (name === "settings") {
      this.panel(
        `<span class="eyebrow accent">EXPEDITION PREFERENCES</span><h2>A little fine tuning.</h2><div class="setting"><label>Music <output id="out-music">${Math.round(this.settings.music * 100)}%</output></label><input aria-label="Music volume" data-setting="music" type="range" min="0" max="100" step="1" value="${Math.round(this.settings.music * 100)}"></div><div class="setting"><label>Effects & gibberish <output id="out-effects">${Math.round(this.settings.effects * 100)}%</output></label><input aria-label="Effects volume" data-setting="effects" type="range" min="0" max="100" value="${Math.round(this.settings.effects * 100)}"></div><div class="setting"><span class="setting-label">Controller glyphs <button data-action="glyphs">${this.settings.glyphs === "ps" ? "PlayStation" : "Xbox"}</button></span></div><div class="setting"><span class="setting-label">Vine catch & bank assist <button data-action="assist">${this.settings.assist ? "On" : "Off"}</button></span></div><div class="setting"><span class="setting-label">Reduced camera motion <button data-action="reduced">${this.settings.reduced ? "On" : "Off"}</button></span></div><div class="panel-foot"><button class="back-btn" data-action="back">← Back</button><button class="back-btn" data-action="fullscreen">Fullscreen ↗</button></div>`,
      );
    }
    if (name === "howto") {
      this.panel(
        `<span class="eyebrow accent">THE POCKET FIELD GUIDE</span><h2>Four acts. One friend.</h2><p>Pip’s shortcut has ended in a basket. Bring your hat, your nerve, and a very small machete.</p><div class="controls-grid"><div class="control-card"><strong><span class="num">01</span> Swing</strong><p>${this.glyph("move")} to run and pump. ${this.glyph("jump")} leaps and catches; press again to release. Let go as the vine rises right.</p></div><div class="control-card"><strong><span class="num">02</span> Swim</strong><p>${this.glyph("swim")} in the river. Surface or visit bubble columns for air. ${this.glyph("cut")} stuns crocodiles. ${this.glyph("jump")} surges.</p></div><div class="control-card"><strong><span class="num">03</span> Scramble</strong><p>${this.glyph("jump")} over rolling boulders. ${this.glyph("duck")} ducks under high rocks. Flags restore a heart and mark checkpoints.</p></div><div class="control-card"><strong><span class="num">04</span> Rescue</strong><p>Hold ${this.glyph("interact")} beside each of three winches. Cross the broken bridge. Hold it again at Pip’s lowered basket.</p></div></div><p class="dim">Touch: drag the left half to move and swim. Tap the right half to jump. The action circle appears when there’s something to do. Crocodile defense is assisted.<br>Collect 12 gold relics for a better expedition rank. Rescue Pip faster to win races.</p>${back}`,
        true,
      );
    }
    if (name === "multiplayer") {
      this.panel(
        `<span class="eyebrow accent">GOOD COMPANY. QUESTIONABLE PLANS.</span><h2>Race a friend.</h2><p>Same jungle. Separate trouble. Ghost explorers share a route without bumping into each other. First rescue wins.</p><div class="menu"><button class="big-btn" data-action="local">Couch race <span>1–2</span></button><button class="big-btn secondary" data-action="online">Direct online race <span>1–2 ↗</span></button></div><p class="dim">Couch: pad 1 or WASD / Space / J / E.<br>Rival: pad 2 or G L / Y H / B / N / M.<br>For 1–4 players, launch an AI Hub session.</p>${back}`,
      );
    }
    if (name === "online") {
      this.panel(
        `<span class="eyebrow accent">THE LONG-DISTANCE EXPEDITION</span><h2>Send a trail marker.</h2><p>Host: make an invitation and send it to your friend. Friend: paste it below and make a reply. Host: paste that reply, then connect.</p><div class="network-row"><button data-action="host-offer">Make invitation</button><button data-action="join-offer">Make reply</button><button data-action="accept-answer">Connect reply</button></div><label class="field-label" for="networkIn">PASTE INVITATION OR REPLY</label><textarea id="networkIn" class="codebox" spellcheck="false" aria-label="Paste invitation or reply"></textarea><label class="field-label" for="networkOut" style="margin-top:14px">YOUR CODE — SEND THIS TO YOUR FRIEND</label><textarea id="networkOut" class="codebox" readonly aria-label="Your invitation or reply"></textarea><div class="network-row"><button data-action="copy-code">Copy code</button><button id="peerStart" data-action="peer-start" disabled>Start race ↗</button></div><div class="connection-status" id="connectionStatus">No connection yet. Direct WebRTC needs a compatible network; AI Hub is the alternative for session play.</div>${back}`,
        true,
      );
    }
    if (name === "about") {
      this.panel(
        `<span class="eyebrow accent">THE EXPEDITION LOGBOOK</span><h2>Made of code & curiosity.</h2><div class="tabs"><button class="tab active" data-action="credits-tab" data-tab="source">Source Information</button><button class="tab" data-action="credits-tab" data-tab="testing">Testing Feedback</button><button class="tab" data-action="credits-tab" data-tab="engine">Engine Feedback</button><button class="tab" data-action="credits-tab" data-tab="prompt">Prompt Feedback</button></div><div id="creditsContent" class="credits-scroll"></div>${back}`,
        true,
      );
      this.renderCredits("source");
    }
    if (name === "dev") this.devPanel(back);
  }
  renderCredits(tab) {
    for (const b of document.querySelectorAll("[data-tab]"))
      b.classList.toggle("active", b.dataset.tab === tab);
    if (tab === "source") {
      $("#creditsContent").innerHTML =
        '<dl class="credits-grid">' +
        Object.entries(sourceInformation)
          .map(([k, v]) => `<dt>${k[0].toUpperCase() + k.slice(1)}</dt><dd>${safe(v)}</dd>`)
          .join("") +
        "</dl>";
    } else {
      const values = {
        testing: testingFeedback,
        engine: engineFeedback,
        prompt: promptFeedback,
      }[tab];
      $("#creditsContent").innerHTML = values
        .map(
          (v, i) => `<div class="feedback-item"><b>${feedbackQuestions[tab][i]}</b><p>${safe(v)}</p></div>`,
        )
        .join("");
    }
  }
  devPanel(back) {
    const r = this.runners[0];
    const sliders = [
      ["speed", "Run speed", 3, 12, 0.2],
      ["jump", "Jump impulse", 7, 17, 0.2],
      ["gravity", "Gravity", 12, 34, 1],
      ["swingPump", "Swing strength", 0.4, 3, 0.1],
      ["swimSpeed", "Swim speed", 3, 10, 0.2],
      ["air", "Air capacity", 8, 45, 1],
      ["rockInterval", "Boulder interval", 1.2, 7, 0.2],
      ["winchTime", "Winch hold time", 0.3, 3, 0.1],
      ["timeScale", "Simulation speed", 0.25, 2, 0.05],
    ];
    this.panel(
      `<span class="eyebrow accent">DEVELOPER MODE · LIVE BALANCE</span><h2>The expedition workshop.</h2><div class="dev-grid">${sliders.map(([k, label, min, max, step]) => `<div class="setting"><label>${label}<output id="dev-out-${k}">${this.cfg[k].toFixed(k === "gravity" || k === "air" ? 0 : 1)}</output></label><input aria-label="${label}" data-dev="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${this.cfg[k]}"></div>`).join("")}</div><div class="dev-actions"><button data-action="dev-god">Invincible: ${r?.god ? "ON" : "OFF"}</button><button data-action="dev-bot">AI pilot: ${r?.bot ? "ON" : "OFF"}</button><button data-action="dev-noclip">Free flight: ${r?.noclip ? "ON" : "OFF"}</button><button data-action="dev-refill">Refill health & air</button><button data-action="dev-checkpoint">Next checkpoint</button><button data-action="dev-rock">Spawn a boulder</button>${STAGES.map((s, i) => `<button data-action="dev-stage" data-stage="${i}">0${i + 1} ${s.short}</button>`).join("")}<button data-action="dev-reset">Reset all sliders</button></div><p class="dim">${this.backend} · Rapier 0.19.3 · Fixed 60 Hz · ${r?.world.bodies.len() || 0} rigid bodies<br>Free flight uses movement and swim directions. Workshop changes affect this expedition only.</p>${back}`,
      true,
    );
  }
  onDown(_r) {
    if (this.runners.length > 1) return;
    this.mode = "paused";
    this.modal = "down";
    this.panel(
      `<span class="eyebrow accent">A TEMPORARY SETBACK</span><h2>Well. That happened.</h2><p>Your hat survived. Your pride will recover. The latest camp is just around the corner.</p><div class="menu"><button class="big-btn" data-action="retry">Try from camp <span>↶</span></button>${window.AIHub.active ? "" : '<button class="big-btn secondary" data-action="title">Return to the trailhead <span>←</span></button>'}</div>`,
    );
  }
  onWin(r) {
    this.events.push({ type: "rescue", player: r.index, time: r.elapsed });
    this.burst(3, 84, 4, 80, 0xf2d48b);
    if (this.attract) {
      this.attractRestart = 4;
      return;
    }
    if (window.AIHub.active) {
      this.hub.result();
      this.toast("Pip is safe! Waiting for the other expeditions.", 20);
      return;
    }
    this.peer.send({ type: "finished", elapsed: r.elapsed, score: r.score });
    if (this.runners.length === 1 || this.runners.every((r) => r.finished)) this.results();
    else this.toast(`Explorer ${r.index + 1} rescued Pip! The other expedition continues.`, 8);
  }
  results() {
    const r = this.runners[0],
      rank =
        r.relicCount >= 10 && r.totalDamage < 4
          ? "S"
          : r.relicCount >= 6
            ? "A"
            : r.relicCount >= 3
              ? "B"
              : "C";
    this.mode = "results";
    this.modal = "results";
    this.modalBack = "title";
    try {
      if (!this.best || r.score > this.best.score) {
        this.best = { score: r.score, time: r.elapsed, relics: r.relicCount };
        localStorage.setItem("jungle-jinks-best", JSON.stringify(this.best));
      }
    } catch {}
    let race = "";
    if (this.runners.length > 1) {
      const winner = [...this.runners].sort((a, b) => a.elapsed - b.elapsed)[0];
      race = `<p class="accent">Explorer ${winner.index + 1} wins the couch race!</p>`;
    } else if (this.peer.connected) {
      const other = this.ghosts.get("peer");
      race = `<p class="accent">${other?.data.finished ? (r.elapsed <= other.data.elapsed ? "You win the race!" : "Your rival wins the race!") : "Your rival is still on the trail."}</p>`;
    }
    this.panel(
      `<div class="result-seal">${rank}</div><span class="eyebrow accent">EXPEDITION COMPLETE</span><h2>Friend found.<br>Shortcut declined.</h2><p>“Next time,” says Pip, “we take the path.”<br>You both know you won’t.</p>${race}<div class="result-grid"><div class="result-stat"><small>TRAIL TIME</small><b>${timeText(r.elapsed)}</b></div><div class="result-stat"><small>TREASURE</small><b>${r.score.toLocaleString()}</b></div><div class="result-stat"><small>GOLD RELICS</small><b>${r.relicCount} / 12</b></div><div class="result-stat"><small>VINES SWUNG</small><b>${r.swings}</b></div></div><div class="menu"><button class="big-btn" data-action="play">${this.peer.connected ? (this.peer.host ? "Race that shortcut again" : "Request another race") : this.runners.length === 2 ? "Another couch race" : "One more questionable shortcut"} <span>↗</span></button><button class="big-btn secondary" data-action="title">Back to the trailhead <span>←</span></button></div>`,
    );
  }
  showHubWait() {
    show("#titleScreen", false);
    show("#hubWait");
    this.mode = "hubwaiting";
    this.titleAvatar.root.visible = true;
  }
  hubEnd() {
    this.mode = "hubended";
    this.modal = null;
    show("#modalRoot", false);
    show("#stageBanner", false);
    show("#hubWait", false);
    show("#countdown", false);
    show("#touchUI", false);
    this.audio.stop();
    this.input.enabled = false;
  }
  receiveGhost(d, id, info) {
    if (
      !Number.isInteger(d.stage) ||
      d.stage < 0 ||
      d.stage > 3 ||
      !Number.isFinite(d.x) ||
      !Number.isFinite(d.y)
    )
      return;
    let g = this.ghosts.get(id);
    if (!g) {
      const color = info?.color || "#78bbcf";
      g = {
        avatar: makeAvatar(new THREE.Color(color).getHex(), true),
        data: d,
        id,
        name: info?.name || "Rival",
        last: this.time,
      };
      this.ghosts.set(id, g);
    }
    if (g.data.stage !== d.stage || !g.avatar.root.parent) this.stages[d.stage].scene.add(g.avatar.root);
    g.data = d;
    g.last = this.time;
    g.avatar.root.scale.x = d.face || 1;
    g.avatar.setAnim(
      ["idle", "run", "jump", "hang", "swim", "duck", "cheer"].includes(d.anim) ? d.anim : "run",
    );
  }
  removeGhost(id) {
    const g = this.ghosts.get(id);
    g?.avatar.root.removeFromParent();
    this.ghosts.delete(id);
  }
  clearGhosts() {
    for (const id of this.ghosts.keys()) this.removeGhost(id);
  }
  peerStatus(text) {
    this.connectionText = text;
    const e = $("#connectionStatus");
    if (e) e.textContent = text;
    const b = $("#peerStart");
    if (b) b.disabled = !(this.peer.connected && this.peer.host);
    if (this.mode === "playing") this.toast(text, 3);
  }
  async hostOffer() {
    const b = $('[data-action="host-offer"]');
    if (b) b.disabled = true;
    this.peerStatus("Making the invitation. Gathering a direct route…");
    try {
      const code = await this.peer.hostOffer();
      if ($("#networkOut")) $("#networkOut").value = code;
      this.peerStatus("Invitation ready. Send the code, then paste your friend’s reply.");
    } catch (e) {
      this.peerStatus(e.message);
    }
    if (b) b.disabled = false;
  }
  async joinOffer() {
    const code = $("#networkIn")?.value;
    if (!code) {
      this.peerStatus("Paste the host’s invitation first.");
      return;
    }
    this.peerStatus("Following the trail marker…");
    try {
      const reply = await this.peer.joinOffer(code);
      if ($("#networkOut")) $("#networkOut").value = reply;
      this.peerStatus("Reply ready. Send this code back to the host.");
    } catch (e) {
      this.peerStatus(e.message);
    }
  }
  async acceptAnswer() {
    try {
      await this.peer.acceptAnswer($("#networkIn")?.value || "");
      this.peerStatus("Reply accepted. Waiting for the direct route to open…");
    } catch (e) {
      this.peerStatus(e.message);
    }
  }
  async copyCode() {
    const e = $("#networkOut");
    if (!e?.value) return;
    try {
      await navigator.clipboard.writeText(e.value);
      this.peerStatus("Copied. Send the code to your friend.");
    } catch {
      e.select();
      this.peerStatus("Code selected. Use your device’s Copy command.");
    }
  }
  startPeer(at) {
    this.peerAt = at;
    this.beginRun({ peer: true });
    this.peerAt = at;
    this.mode = "peerwaiting";
  }
  peerPacket(d) {
    if (d?.type === "start" && Number.isFinite(d.at)) this.startPeer(d.at);
    else if (d?.type === "rematch" && this.peer.host)
      this.toast("Your rival votes for another shortcut. Start it after this run.", 6);
    else if (d?.type === "ghost") this.receiveGhost(d, "peer");
    else if (d?.type === "finished") {
      const g = this.ghosts.get("peer");
      if (g) {
        g.data.finished = true;
        g.data.elapsed = d.elapsed;
      }
      this.toast("Your rival has rescued Pip!", 5);
      if (this.runners[0]?.finished) this.results();
    }
  }
  tick(dt, provided = null) {
    this.time += dt;
    const active = new Set(this.runners.map((r) => r.stageIndex));
    for (const i of active)
      updateStage(
        this.stages[i],
        this.time,
        dt,
        this.runners.find((r) => r.stageIndex === i && r.swing),
      );
    for (const r of this.runners) {
      const inp =
        provided?.[r.index] || (r.bot ? r.botInput(dt) : this.stepInputs?.[r.index] || emptyInput());
      if (this.input.kind === "touch" && this.settings.assist && r.index === 0) {
        if (r.stageIndex === 1 && r.cutCooldown === 0) {
          inp.cutPressed = true;
          inp.cut = true;
        }
        if (r.nearWinch() >= 0 && this.input.touch.interact) inp.interact = true;
      }
      r.step(dt, inp);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy -= 8 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.scale.multiplyScalar(0.99);
      if (p.life <= 0) {
        p.mesh.removeFromParent();
        this.particles.splice(i, 1);
      }
    }
    if (this.attractRestart > 0) {
      this.attractRestart -= dt;
      if (this.attractRestart <= 0) this.beginRun({ attract: true });
    }
  }
  updateHUD() {
    const r = this.runners[0];
    if (!r) return;
    $("#hud").classList.toggle("river", r.stageIndex === 1);
    $("#hearts").textContent = "♥ ".repeat(Math.max(0, r.health)) + "♡ ".repeat(Math.max(0, 5 - r.health));
    $("#score").textContent = r.score.toString().padStart(5, "0");
    $("#timer").textContent = timeText(r.elapsed);
    $("#relics").textContent = r.relicCount + " / 12";
    $("#checkpointLabel").textContent = `Camp 0${r.checkpoint + 1} · ${STAGES[r.stageIndex].short}`;
    $("#runnerName").textContent =
      this.hubInfo?.players.find((p) => p.id === this.hubInfo.me)?.name ||
      (this.split ? "EXPLORER 01" : "THE EXPEDITION");
    show("#oxygenWrap", r.stageIndex === 1);
    $("#oxygenBar").style.width = clamp((r.oxygen / this.cfg.air) * 100, 0, 100) + "%";
    $("#oxygenBar").style.background = r.oxygen < 5 ? "#ef9c68" : "#8debe2";
    const labels = $("#journey").querySelectorAll("span");
    labels.forEach((e, i) => {
      e.classList.toggle("current", i === r.stageIndex);
    });
    if (this.split) {
      const p = this.runners[1];
      $("#p2hud").innerHTML =
        `<div class="hud-block"><span class="eyebrow">EXPLORER 02 · ACT 0${p.stageIndex + 1}</span><div class="health">${"♥ ".repeat(Math.max(0, p.health))}</div><div class="hud-statline"><span>✦ <b>${p.score}</b></span><span>${timeText(p.elapsed)}</span><span>◈ ${p.relicCount}/12</span></div>${p.finished ? '<p class="accent">Pip is safe! Well played.</p>' : p.stageIndex === 3 ? `<p>${p.winchDone.filter(Boolean).length}/3 winches · ${this.input.kind === "gamepad" ? this.glyph("interact") : "M"} to wind</p>` : ""}</div>`;
    }
    if (this.ghosts.size) {
      show("#rivalHud");
      $("#rivalHud").textContent = [...this.ghosts.values()]
        .map(
          (g) =>
            `${g.name}: ${g.data.finished ? "Pip rescued!" : `Act ${g.data.stage + 1} · ${Math.round(g.data.x)}m`} · ${g.data.score || 0}`,
        )
        .join("   |   ");
    } else show("#rivalHud", false);
    this.updatePrompts();
  }
  frame(now) {
    const realDt = Math.min(0.1, (now - this.lastFrame) / 1000 || 0.016);
    this.lastFrame = now;
    this.input.pollPads(realDt, !!this.modal || this.mode === "title");
    if (
      this.mode === "title" &&
      this.modal !== "online" &&
      !this.peer.pc &&
      !this.testManual &&
      now - this.lastActivity >= 10000
    ) {
      this.modal = null;
      show("#modalRoot", false);
      this.beginRun({ attract: true });
    }
    let play = ["playing", "attract"].includes(this.mode);
    if (this.mode === "peerwaiting") {
      const left = (this.peerAt - Date.now()) / 1000;
      show("#countdown", left > 0);
      $("#countdown").textContent = Math.ceil(left);
      if (left <= 0) {
        this.mode = "playing";
        play = true;
        show("#countdown", false);
      }
    }
    if (window.AIHub.active && this.hub.started && !this.hub.ended) {
      const t = window.AIHub.time();
      if (t < 0) {
        play = false;
        show("#countdown");
        $("#countdown").textContent = Math.ceil(-t / 1000);
      } else show("#countdown", false);
    }
    if (play && !this.testManual) {
      this.stepInputs = this.runners.map((_r, i) => this.input.read(i));
      this.accumulator += Math.min(0.1, realDt * this.cfg.timeScale);
      let first = true;
      while (this.accumulator >= 1 / 60) {
        if (!first)
          for (const input of this.stepInputs) {
            input.jumpPressed = false;
            input.cutPressed = false;
            input.interactPressed = false;
          }
        this.tick(1 / 60);
        this.accumulator -= 1 / 60;
        first = false;
        if (!["playing", "attract"].includes(this.mode)) break;
      }
    } else if (["title", "hubwaiting"].includes(this.mode)) {
      this.time += realDt;
      updateStage(this.stages[0], this.time, realDt);
      const v = this.stages[0].vines[0];
      const angle = 0.65 + Math.sin(this.time * 0.75) * 0.13;
      v.pivot.rotation.z = angle;
      this.titleAvatar.root.position.set(
        v.x + Math.sin(angle) * v.length,
        v.y - Math.cos(angle) * v.length - 0.62,
        0,
      );
      this.titleAvatar.update(realDt);
    } else if (this.mode === "results") for (const r of this.runners) r.avatar.update(realDt);
    for (const g of this.ghosts.values()) {
      g.avatar.root.position.lerp(new THREE.Vector3(g.data.x, g.data.y, 0), Math.min(1, realDt * 12));
      g.avatar.update(realDt);
    }
    this.netTimer += realDt;
    if (this.netTimer >= 0.1) {
      this.netTimer = 0;
      const r = this.runners[0];
      if (this.hub.started && !this.hub.ended) this.hub.tick(r);
      if (this.peer.connected && r) {
        const p = r.position;
        this.peer.send({
          type: "ghost",
          stage: r.stageIndex,
          x: p.x,
          y: p.y,
          face: r.face,
          anim: r.avatar.anim,
          elapsed: r.elapsed,
          score: r.score,
          finished: r.finished,
        });
      }
      this.updateHUD();
    }
    this.audio.update(this.runners[0]?.stageIndex || 0, !play);
    if (this.toastTime > 0) {
      this.toastTime -= realDt;
      if (this.toastTime <= 0) show("#toast", false);
    }
    if (this.bannerTime > 0) {
      this.bannerTime -= realDt;
      if (this.bannerTime <= 0) show("#stageBanner", false);
    }
    if (this.flashTime > 0) {
      this.flashTime -= realDt;
      $("#damageFlash").style.opacity = Math.max(0, this.flashTime / 0.35).toString();
    }
    if (this.touchHintTime > 0) {
      this.touchHintTime -= realDt;
      if (this.touchHintTime <= 0) show("#touchHint", false);
    }
    if (this.renderEnabled) this.render(realDt);
    requestAnimationFrame((t) => this.frame(t));
  }
  render(dt) {
    if (this.recovering) return;
    const title = ["title", "hubwaiting", "loading"].includes(this.mode),
      panes = title ? 1 : this.runners.length || 1;
    this.renderer.setScissorTest(panes > 1);
    for (let i = 0; i < panes; i++) {
      const r = this.runners[i],
        stage = title ? this.stages[0] : r?.stage || this.stages[0],
        camera = this.cameras[i] || this.cameras[0],
        width = innerWidth / panes;
      this.renderer.setViewport(i * width, 0, width, innerHeight);
      this.renderer.setScissor(i * width, 0, width, innerHeight);
      if (title) {
        camera.position.set(18, 8.6, 28);
        camera.lookAt(18, 5.6, 0);
        for (const item of stage.pickups) item.group.visible = true;
      } else if (r) {
        r.applyScene();
        const p = r.position,
          halfWidth = (camera.right - camera.left) / 2,
          targetX = clamp(p.x + r.viewLead(r.swing ? 3.8 : 5.4), -6 + halfWidth, 100 - halfWidth),
          targetY = r.stageIndex === 1 ? -2.3 : r.stageIndex === 2 ? p.x * 0.125 + 5.1 : 5.2;
        const f = this.settings.reduced ? 1 : Math.min(1, dt * 3.5);
        r.camera.x = THREE.MathUtils.lerp(r.camera.x, targetX, f);
        r.camera.y = THREE.MathUtils.lerp(r.camera.y, targetY, f);
        let shake = 0;
        if (this.shakeTime > 0 && !this.settings.reduced) {
          this.shakeTime -= dt;
          shake = Math.sin(this.time * 80) * 0.12;
        }
        camera.position.set(r.camera.x + shake, r.camera.y + 3, 28);
        camera.lookAt(r.camera.x, r.camera.y, 0);
      }
      this.renderer.render(stage.scene, camera);
    }
    this.renderer.setScissorTest(false);
  }
  getState() {
    return {
      ready: this.ready,
      mode: this.mode,
      backend: this.backend,
      modal: this.modal,
      attract: this.attract,
      input: this.input.kind,
      music: this.settings.music,
      settings: { ...this.settings },
      cfg: { ...this.cfg },
      runners: this.runners.map((r) => r.state()),
      ghosts: [...this.ghosts.values()].map((g) => ({
        id: g.id,
        name: g.name,
        ...g.data,
      })),
      peer: {
        connected: this.peer.connected,
        sent: this.peer.sent,
        received: this.peer.received,
      },
      hub: {
        active: window.AIHub.active,
        started: this.hub.started,
        ended: this.hub.ended,
      },
      events: [...this.events],
    };
  }
  async renderProof() {
    this.render(0.1);
    const target = new THREE.RenderTarget(128, 72, {
      type: THREE.UnsignedByteType,
    });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    this.renderer.setRenderTarget(target);
    const stage = this.runners[0]?.stage || this.stages[0];
    this.renderer.render(stage.scene, this.cameras[0]);
    const pixels = await this.renderer.readRenderTargetPixelsAsync(target, 0, 0, 128, 72);
    this.renderer.setRenderTarget(null);
    target.dispose();
    let min = 255,
      max = 0;
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 4) {
      min = Math.min(min, pixels[i], pixels[i + 1], pixels[i + 2]);
      max = Math.max(max, pixels[i], pixels[i + 1], pixels[i + 2]);
      colors.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
    }
    return { min, max, colors: colors.size };
  }
  installTestAPI() {
    window.__game = {
      game: this,
      state: () => this.getState(),
      manual: (v) => {
        this.testManual = v;
        this.accumulator = 0;
      },
      render: (v) => (this.renderEnabled = v),
      start: (opts) => this.beginRun(opts),
      advance: (seconds, input = null) => {
        const n = Math.ceil(seconds * 60);
        let prev = emptyInput();
        for (let i = 0; i < n; i++) {
          let inp = null;
          if (input) {
            const s = { ...emptyInput(), ...input };
            s.jumpPressed = s.jump && !prev.jump;
            s.cutPressed = s.cut && !prev.cut;
            s.interactPressed = s.interact && !prev.interact;
            prev = { ...s };
            inp = [s];
          }
          if (["playing", "attract"].includes(this.mode)) this.tick(1 / 60, inp);
        }
        this.updateHUD();
        return this.getState();
      },
      teleport: (x, y, index = 0) => {
        const r = this.runners[index];
        if (r.swing) {
          r.swing = null;
          r.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
        }
        r.body.setTranslation({ x, y, z: 0 }, true);
        r.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        r.syncVisual(0);
      },
      stage: (i, index = 0) => {
        this.runners[index].enterStage(i);
        this.updateHUD();
      },
      audioProof: () => this.audio.offlineProof(),
      renderProof: () => this.renderProof(),
      snapshot: () => {
        this.render(0.1);
        return this.getState();
      },
    };
  }
}
const game = new Game();
game.init().catch((error) => {
  console.error(error);
  if (window.AIHub.active) window.AIHub.fail(error.message);
  $("#loading").innerHTML =
    `<article style="max-width:650px;padding:40px"><h2>The jungle couldn’t open.</h2><p>${safe(error.message)}</p><p>This expedition needs WebGPU or WebGL 2 and WebAssembly. Try a current Chrome, Edge or Safari browser.</p><button class="back-btn" onclick="location.reload()">Try again</button></article>`;
});
