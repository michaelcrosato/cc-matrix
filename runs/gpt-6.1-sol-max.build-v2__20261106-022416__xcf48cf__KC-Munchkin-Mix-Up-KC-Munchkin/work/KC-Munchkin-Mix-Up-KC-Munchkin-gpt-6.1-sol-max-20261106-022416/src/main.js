(function (M) {
  "use strict";
  const { E } = M;
  const INPUT = {
    up: ["KeyW", "ArrowUp", "Pad12", "PadAxisUp"],
    down: ["KeyS", "ArrowDown", "Pad13", "PadAxisDown"],
    left: ["KeyA", "ArrowLeft", "Pad14", "PadAxisLeft"],
    right: ["KeyD", "ArrowRight", "Pad15", "PadAxisRight"],
    start: ["Enter", "Pad9"],
    pause: ["Escape", "KeyP", "Pad9"],
    confirm: ["Enter", "Space", "Pad0"],
    cancel: ["Escape", "Backspace", "Pad1"],
    chirp: ["Space", "KeyF", "Pad0"],
    toolPrev: ["KeyQ", "Pad4"],
    toolNext: ["KeyE", "Pad5"],
    undo: ["KeyZ", "Pad2"],
    redo: ["KeyY", "Pad3"],
    halves: { left: { chirp: ["KeyF"] }, right: { chirp: ["Period"] } },
  };
  class App {
    constructor(net) {
      this.net = net;
      this.screen = net.active ? "play" : "title";
      this.devOpen = false;
      this.overlays = false;
      this.editor = null;
      this.currentOptions = { seats: [0] };
      this.intentCache = [
        { d: -1, a: false },
        { d: -1, a: false },
      ];
      this.axes = [-1, -1];
      this.touch = null;
      this.lastPointer = null;
      this.paint = null;
      this.returning = false;
      this.reported = false;
      this.lastHUD = "";
      this.attractAge = 0;
      this.attractPart = -1;
      this.ui = null;
      const server = net.active && AIHub.server;
      this.game = new E.Game({
        canvas: "screen",
        id: "kc-munchkin-mix-up-v1",
        view: "overhead",
        views: ["overhead"],
        res: [480, 360],
        expand: true,
        headless: server,
        loop: !server,
        fullscreen: "button",
        corner: false,
        autoPause: !net.active,
        live: net.active,
        input: INPUT,
        bg: "#120e1c",
        camera: false,
        menu: {
          quit: net.active ? false : "title",
          controls: {
            chirp: "Reveal chirp",
            toolPrev: "Previous tool",
            toolNext: "Next tool",
            undo: "Undo wall edit",
            redo: "Redo wall edit",
          },
          items: () => this.pauseItems(),
          settings: [
            { key: "music", value: 0.1 },
            { key: "glyphs", value: "playstation" },
            {
              key: "voiceLevel",
              group: "Sound",
              label: "Gibberish voices",
              value: 0.65,
              min: 0,
              max: 1,
              step: 0.05,
              apply: (g, v) => {
                g.audio.voiceVolume = v;
                g.audio.applyVolume();
              },
            },
            {
              key: "autoChirp",
              group: "Game",
              label: "Touch auto-chirp",
              value: true,
              help: "Reveal shy walls whenever the chirp is ready on touch.",
            },
            {
              key: "touchSensitivity",
              group: "Game",
              label: "Touch steering sensitivity",
              value: 1,
              min: 0.5,
              max: 2,
              step: 0.1,
            },
          ],
        },
      });
      this.game.fadeTime = 0.12;
      this.game.cam.smooth = 0;
      this.game.input.steer = "drag";
      this.game.input.touchButtons([]);
      this.profile = new M.Profile();
      this.world = new M.World({ god: true, assisted: true });
      this.theatre = new M.Theatre(this.game, this);
      this.sound = new M.Sound(this.game);
      this.front = new E.Arcade(this.game, {
        id: "mix-up-attract",
        idle: 10,
        demo: 1e9,
        scores: 0,
      });
      if (!server) {
        this.screens = new M.Screens(this);
        this.ui.root.classList.add("mix-ui");
        this.setupDOM();
      }
      this.game.debug = {
        snapshot: () => ({
          title: M.RELEASE.aiHub.name,
          screen: this.screen,
          menu: this.ui?.screen || null,
          world: this.world?.snapshot(),
          input: {
            device: this.game.input.lastDevice,
            axes: this.axes.slice(),
            touch: !!this.touch,
            seats: this.game.players.map((p) => ({
              pad: p.pad,
              half: p.half || null,
              device: p.lastDevice,
            })),
          },
          audio: {
            unlocked: this.sound.unlocked,
            music: this.game.settings.music,
            muted: this.game.audio.muted,
            voice: this.game.settings.voiceLevel,
          },
          network: {
            active: net.active,
            host: net.active ? AIHub.isHost : false,
            server: net.active ? AIHub.server : false,
            ended: net.ended,
            ...net.diagnostics,
          },
          editor: this.editor
            ? {
                x: this.editor.x,
                y: this.editor.y,
                tool: this.editor.tool,
                valid: this.editor.errors.length === 0,
                message: this.editor.message,
              }
            : null,
          errors: this.game.errors.map((e) => e.message),
        }),
        command: (name, args = {}) => this.command(name, args),
      };
      this.game.hook("input", (dt) => this.inputStep(dt));
      this.game.start({
        scene: net.active ? "hub" : "title",
        scenes: {
          title: {
            pausable: false,
            enter: () => this.enterTitle(),
            update: (dt) => this.update(dt),
            draw: (r) => this.draw(r),
          },
          play: {
            pausable: true,
            enter: (options) => this.enterPlay(options || {}),
            update: (dt) => this.update(dt),
            draw: (r) => this.draw(r),
          },
          editor: {
            pausable: true,
            enter: () => this.enterEditor(),
            update: (dt) => this.update(dt),
            draw: (r) => this.draw(r),
          },
          attract: {
            pausable: false,
            enter: () => this.enterAttract(),
            update: (dt) => this.update(dt),
            draw: (r) => this.draw(r),
          },
          hub: { pausable: true, update: (dt) => this.update(dt), draw: (r) => this.draw(r) },
          ended: { pausable: false, draw: (r) => this.draw(r) },
        },
      });
      if (net.active) net.attach(this);
      if (this.profile.notice && this.ui) this.ui.toast("A fresh start", this.profile.notice);
    }
    pauseItems() {
      if (this.screen === "editor")
        return [
          ["Workshop menu", () => this.screens.workshop()],
          ["Editing help", () => this.screens.editHelp()],
        ];
      return [
        ["How to play", () => this.screens.help(0)],
        [this.net.active ? "World inspector" : "Developer tools", () => this.screens.developer(0)],
        ["About & credits", () => this.screens.about(0)],
        ...(!this.net.active && this.currentOptions.mode === "custom"
          ? [["Return to workshop", () => this.returnEditor()]]
          : []),
      ];
    }
    markActivity() {
      this.front.wake();
      this.lastActivityClock = performance.now();
    }
    clearIntents() {
      this.intentCache = [
        { d: -1, a: false },
        { d: -1, a: false },
      ];
      this.axes = [-1, -1];
      if (this.world)
        for (const p of this.world.players) this.world.setIntent(p.id, { d: -1, a: false });
    }
    resetPresentation() {
      this.theatre.reset();
      this.sound.lastEvent = 0;
      this.game.particles.list.length = 0;
      this.clearIntents();
      this.reported = false;
    }
    enterTitle() {
      if (this.net.active) return;
      this.screen = "title";
      this.devOpen = false;
      this.overlays = false;
      this.ui?.hide();
      this.game.resume();
      while (this.game.players.length > 1) this.game.removePlayer(this.game.players.at(-1));
      this.game.input.pad = "any";
      this.game.input.use(INPUT);
      this.game.input.clear();
      this.world = new M.World({ seed: 83, god: true, assisted: true });
      this.world.phase = "playing";
      this.resetPresentation();
      this.markActivity();
      this.screens?.title();
      document.body.dataset.mode = "title";
    }
    showTitle() {
      if (this.net.active) return;
      this.ui?.hide();
      this.game.resume();
      this.clearIntents();
      this.touch = null;
      this.game.go("title", null, { fade: this.screen === "attract" ? 0 : this.game.fadeTime });
    }
    devices(options) {
      const g = this.game;
      while (g.players.length > 1) g.removePlayer(g.players.at(-1));
      g.input.use(INPUT);
      g.input.pad = "any";
      if (options.seats?.length === 2) {
        if (options.devices === "pads") {
          g.input.pad = options.pads[0];
          g.addPlayer({ pad: options.pads[1] });
        } else if (options.devices === "mixed") {
          g.input.pad = null;
          g.addPlayer({ pad: options.pads[0] });
        } else {
          g.input.pad = null;
          g.addPlayer({ keys: "right" });
        }
      }
      for (const I of g.players) {
        I.steer = "drag";
        I.touchButtons([]);
        I.clear();
      }
    }
    startRun(options = {}) {
      if (this.net.active) return;
      this.ui?.hide();
      this.game.resume();
      this.game.input.consumeAll();
      this.game.input.clear();
      this.clearIntents();
      this.currentOptions = M.copy(options);
      this.game.go("play", options);
    }
    enterPlay(options) {
      this.screen = "play";
      this.devOpen = false;
      this.overlays = false;
      this.devices(options);
      this.world = new M.World(options);
      this.resetPresentation();
      this.sound.babble();
      document.body.dataset.mode = "play";
      this.lastHUD = "";
    }
    replaceWorld(options) {
      if (this.net.active) return false;
      this.world = new M.World({ ...this.currentOptions, ...options });
      this.resetPresentation();
      return true;
    }
    openEditor() {
      if (this.net.active) return;
      this.ui?.hide();
      this.game.resume();
      if (!this.editor) this.editor = new M.Editor();
      this.game.go("editor");
    }
    returnEditor() {
      if (this.net.active) return;
      this.ui?.hide();
      this.game.resume();
      this.game.go("editor");
    }
    enterEditor() {
      this.screen = "editor";
      this.devOpen = false;
      this.clearIntents();
      this.world = new M.World({
        custom: M.template(0),
        mode: "custom",
        god: true,
        assisted: true,
      });
      this.refreshEditor();
      this.resetPresentation();
      document.body.dataset.mode = "editor";
      this.game.input.clear();
    }
    refreshEditor() {
      if (!this.editor) return;
      this.world.data = M.copy(this.editor.data);
      this.world.board = new M.Board(this.world.data);
      for (let i = 0; i < 12; i++)
        this.world.food[i].m.place(this.editor.data.food[i].x, this.editor.data.food[i].y);
      for (let i = 0; i < this.world.players.length; i++)
        this.world.players[i].m.place(...this.editor.data.spawns[i % 2]);
      this.world.reveal = 10;
      this.theatre.rev = 0;
      this.lastHUD = "";
    }
    enterAttract() {
      this.screen = "attract";
      this.ui?.hide();
      this.game.resume();
      this.attractAge = 0;
      this.attractPart = -1;
      this.makeAttractPart(0);
      document.body.dataset.mode = "attract";
      this.game.input.clear();
    }
    makeAttractPart(part) {
      this.attractPart = part;
      this.attractCelebrated = false;
      const stage = [0, 1, 2, 3, 5][part % 5];
      this.world = new M.World({
        seed: 803,
        stage,
        god: true,
        assisted: true,
        seats: part % 5 === 3 ? [0, 1] : [0],
      });
      this.world.phase = "playing";
      this.bots = this.world.players.map((p) => new M.Bot(p.id));
      this.resetPresentation();
    }
    inputStep(dt) {
      if (this.net.ended) {
        for (const I of this.game.players) I.clear();
        return;
      }
      const g = this.game,
        I = g.input;
      if (this.screen === "title") {
        if (
          this.front.attract(dt) === "demo" ||
          performance.now() - this.lastActivityClock >= 10000
        ) {
          this.ui?.hide();
          g.resume();
          g.go("attract", null, { fade: 0 });
          return;
        }
      }
      if (I.lastDevice === "gamepad" && (I.anyPressed() || Math.hypot(...I.move()) > 0.4)) {
        if (this.screen === "attract") {
          this.showTitle();
          I.consumeAll();
          I.clear();
          return;
        }
        this.sound.unlock();
        this.markActivity();
      }
      if (this.screen === "play" && !this.ui?.screen && !g.paused) {
        for (let i = 0; i < g.players.length; i++) {
          const input = g.players[i];
          let v = input.move();
          if (i === 0 && this.touch) v = this.touch.vector;
          const direction = M.cardinal(v, this.axes[i], input.lastDevice === "touch" ? 0.15 : 0.25);
          this.axes[i] = direction;
          this.intentCache[i] = {
            d: direction,
            a: !!this.intentCache[i]?.a || input.pressed("chirp"),
          };
          if (
            i === 0 &&
            input.lastDevice === "touch" &&
            g.settings.autoChirp &&
            this.world.data.reveal.kind !== "none" &&
            this.world.players.find((p) => p.id === (this.net.active ? AIHub.me : 0))?.chirp <= 0
          )
            this.intentCache[0].a = true;
        }
        if (this.world.phase === "intro" && I.pressed("confirm")) {
          if (!this.net.active) this.world.phaseT = 0;
          this.intentCache.forEach((i) => (i.a = false));
          I.consumeAll();
        }
      } else this.clearIntents();
      this.sound.update(this.world, g.paused && !this.net.active);
      if (g.paused || this.ui?.screen) this.hud();
    }
    localIntent(index = 0) {
      return this.intentCache[index] || { d: -1, a: false };
    }
    consumeEvents(events) {
      if (this.net.active || this.screen !== "play") return;
      for (const e of events) {
        if (e.type === "clear") this.profile.record(this.world);
        if (e.type === "hit")
          this.ui?.toast(
            "A little bump!",
            `${this.world.lives} team lives. Keep your grin up.`,
            1.8,
          );
        if (e.type === "power")
          this.ui?.toast(
            "Turn the tables!",
            `Rivals are edible. Next catch: ${[5, 10, 20][Math.min(this.world.chain, 2)]} points.`,
            2,
          );
      }
    }
    update(dt) {
      const w = this.world;
      if (!w || this.net.ended) return;
      if (this.net.active) {
        if (!AIHub.server) this.theatre.update(w, dt);
        this.hud();
        return;
      }
      if (this.screen === "title") {
        w.setIntent(0, { d: -1, a: false });
        w.step();
        if (w.phase === "lost" || w.phase === "won") w.phase = "playing";
      } else if (this.screen === "attract") {
        this.attractAge += dt;
        const part = Math.floor(this.attractAge / 18);
        if (part !== this.attractPart) this.makeAttractPart(part);
        for (let i = 0; i < this.world.players.length; i++)
          this.world.setIntent(
            this.world.players[i].id,
            this.bots[i].intent(this.world, this.world.players[i]),
          );
        this.world.step();
        if (this.attractPart % 5 === 4 && this.attractAge % 18 > 15 && !this.attractCelebrated) {
          this.world.phase = "clear";
          this.world.phaseT = 999;
          this.world.emit("victory");
          this.attractCelebrated = true;
        }
        this.sound.events(this.world.events);
      } else if (this.screen === "editor") {
        this.updateEditor(dt);
      } else if (this.screen === "play") {
        for (let i = 0; i < w.players.length; i++) {
          w.setIntent(w.players[i].id, this.localIntent(i));
          this.intentCache[i].a = false;
        }
        w.step();
        this.sound.events(w.events);
        this.consumeEvents(w.events);
        if ((w.phase === "won" || w.phase === "lost") && !this.reported) {
          this.reported = true;
          this.profile.record(w);
          this.screens.results();
        }
      }
      this.theatre.update(this.world, dt);
      this.hud();
    }
    updateEditor(dt) {
      const e = this.editor,
        I = this.game.input;
      let changed = false;
      const ways = [
        ["up", 0, -1],
        ["right", 1, 0],
        ["down", 0, 1],
        ["left", -1, 0],
      ];
      for (const [action, x, y] of ways)
        if (I.repeat(action, 0.3, 0.085)) {
          e.x = M.clamp(e.x + x, 1, 19);
          e.y = M.clamp(e.y + y, 1, 15);
        }
      if (I.pressed("toolNext")) e.tool = (e.tool + 1) % 8;
      if (I.pressed("toolPrev")) e.tool = (e.tool + 7) % 8;
      if (I.pressed("confirm")) changed = e.apply();
      if (I.pressed("undo")) changed = e.undo();
      if (I.pressed("redo")) changed = e.redo();
      if (changed) this.refreshEditor();
    }
    draw(r) {
      if (this.world) this.theatre.draw(r, this.world);
    }
    hud() {
      if (!this.hudElement) return;
      const w = this.world,
        screen = this.screen,
        game = this.game;
      this.hudElement.hidden = !["play", "editor", "attract"].includes(screen) || this.net.ended;
      const menu = this.ui?.screen;
      this.hudElement.classList.toggle("under-menu", !!menu);
      const state = [
        screen,
        w.stageIndex,
        w.score,
        w.lives,
        w.remaining,
        Math.ceil(w.power),
        Math.ceil(w.players.find((p) => p.id === (this.net.active ? AIHub.me : 0))?.chirp || 0),
        w.phase,
        this.editor?.tool,
        this.editor?.message,
        game.input.lastDevice,
        game.settings.glyphs,
        w.assisted,
        w.board.orientation,
        menu,
        this.editor?.x,
        this.editor?.y,
      ].join("|");
      if (state === this.lastHUD) return;
      this.lastHUD = state;
      this.hudStage.textContent =
        screen === "editor"
          ? "MAZE WORKSHOP"
          : screen === "attract"
            ? "A LITTLE MISCHIEF / DEMO"
            : this.net.active
              ? "TEAM LUNCH / " + w.data.name
              : w.data.name;
      this.hudScore.textContent = String(w.score).padStart(3, "0");
      this.hudLives.textContent = "♥".repeat(Math.max(0, w.lives));
      this.hudFood.textContent = String(w.remaining).padStart(2, "0");
      this.hudCounters.hidden = screen === "editor";
      this.hudDetail.textContent =
        screen === "editor"
          ? `${this.editor.tools[this.editor.tool]}  ·  ${this.editor.message}`
          : w.power > 0
            ? `BRIGHT BITE ${w.power.toFixed(0)}s · NEXT RIVAL ${[5, 10, 20][Math.min(w.chain, 2)]} PTS`
            : w.remaining <= 3
              ? `${w.remaining === 1 ? "LAST LITTLE RUNAWAY" : "THREE OR FEWER LEFT"} · MEET IT AT THE NEXT JUNCTION`
              : w.data.subtitle;
      this.hudPrompt.textContent =
        screen === "editor"
          ? `${game.input.label("toolPrev")} / ${game.input.label("toolNext")} tool  ·  ${game.input.label("confirm")} edit  ·  ${game.input.label("undo")} undo`
          : game.input.lastDevice === "touch"
            ? "DRAG ANYWHERE TO STEER"
            : `${game.input.label("up")} ${game.input.label("left")} ${game.input.label("down")} ${game.input.label("right")} move  ·  ${game.input.label("chirp")} chirp  ·  ${game.input.label("pause")} menu`;
      this.hudSeed.textContent =
        screen === "editor"
          ? `CELL ${this.editor.x}, ${this.editor.y}`
          : w.assisted && screen === "play"
            ? "ASSISTED RUN"
            : w.stageIndex === 4 || w.mode === "remix"
              ? `SEED ${w.data.seed}`
              : w.data.gate.turning
                ? `PEN ${["N", "E", "S", "W"][w.board.orientation]} ↻`
                : "12 LITTLE RUNAWAYS";
      this.chirpButton.hidden =
        screen !== "play" ||
        !!menu ||
        game.input.lastDevice !== "touch" ||
        w.data.reveal.kind === "none";
      this.chirpButton.disabled =
        (w.players.find((p) => p.id === (this.net.active ? AIHub.me : 0))?.chirp || 0) > 0;
      this.chirpButton.textContent = this.chirpButton.disabled ? "Chirp cooling" : "Chirp";
      this.workshopButton.hidden = screen !== "editor" || !!menu;
      this.menuButton.hidden = !["play", "editor"].includes(screen) || this.net.ended || !!menu;
      this.toolPalette.hidden = screen !== "editor" || !!menu;
      if (screen === "editor") this.toolName.textContent = this.editor.tools[this.editor.tool];
      const foot = this.ui?.root?.querySelector(".esh-ttl>div>div.esh-m:last-child");
      if (foot)
        foot.textContent = `${game.input.label("confirm")} choose · Best ${this.profile.data.best}`;
      document.body.dataset.device = game.input.lastDevice;
    }
    bindButton(button, action) {
      let skipClickUntil = 0;
      button.onclick = () => {
        if (performance.now() > skipClickUntil) action();
      };
      button.onpointerdown = (e) => {
        if (e.pointerType === "touch") {
          e.preventDefault();
          skipClickUntil = performance.now() + 600;
          this.ignoreNextClick = true;
          action();
        }
      };
    }
    setupDOM() {
      const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
      };
      this.menuButton = el("button", "mix-menu", "Menu");
      this.menuButton.setAttribute("aria-label", "Pause menu");
      this.menuButton.hidden = true;
      const menu = () => {
        if (!this.net.ended) this.game.menu();
      };
      this.bindButton(this.menuButton, menu);
      document.body.append(this.menuButton);
      this.hudElement = el("div", "mix-hud");
      this.hudElement.hidden = true;
      const top = el("div", "mix-hud-top");
      const label = el("div", "mix-stage-block");
      this.hudStage = el("div", "mix-stage");
      this.hudDetail = el("div", "mix-detail");
      label.append(this.hudStage, this.hudDetail);
      this.hudCounters = el("div", "mix-counters");
      for (const [name, prop] of [
        ["TEAM", "hudScore"],
        ["LIVES", "hudLives"],
        ["LEFT", "hudFood"],
      ]) {
        const block = el("div", "mix-counter");
        block.append(el("span", "", name));
        this[prop] = el("b", "");
        block.append(this[prop]);
        this.hudCounters.append(block);
      }
      top.append(label, this.hudCounters);
      const bottom = el("div", "mix-hud-bottom");
      this.hudPrompt = el("div", "mix-prompt");
      this.hudSeed = el("div", "mix-seed");
      bottom.append(this.hudPrompt, this.hudSeed);
      this.hudElement.append(top, bottom);
      document.body.append(this.hudElement);
      this.chirpButton = el("button", "mix-chirp", "Chirp");
      this.chirpButton.hidden = true;
      const chirp = () => {
        if (!this.net.ended && !this.chirpButton.disabled) this.intentCache[0].a = true;
      };
      this.bindButton(this.chirpButton, chirp);
      document.body.append(this.chirpButton);
      this.workshopButton = el("button", "mix-workshop-button", "Workshop menu");
      this.workshopButton.hidden = true;
      const workshop = () => this.screens.workshop();
      this.bindButton(this.workshopButton, workshop);
      document.body.append(this.workshopButton);
      this.toolPalette = el("div", "mix-tool-palette");
      this.toolPalette.hidden = true;
      const previous = el("button", "", "‹"),
        next = el("button", "", "›");
      previous.setAttribute("aria-label", "Previous workshop tool");
      next.setAttribute("aria-label", "Next workshop tool");
      this.toolName = el("button", "", "Wall toggle");
      this.toolName.setAttribute("aria-label", "Choose workshop tool");
      for (const [button, action] of [
        [
          previous,
          () => {
            this.editor.tool = (this.editor.tool + 7) % 8;
            this.lastHUD = "";
            this.hud();
          },
        ],
        [
          next,
          () => {
            this.editor.tool = (this.editor.tool + 1) % 8;
            this.lastHUD = "";
            this.hud();
          },
        ],
        [this.toolName, () => this.screens.toolPalette()],
      ]) {
        this.bindButton(button, action);
      }
      this.toolPalette.append(previous, this.toolName, next);
      document.body.append(this.toolPalette);
      this.ui.root.addEventListener("pointerover", (e) => {
        if (e.pointerType === "mouse") {
          const b = e.target.closest("button");
          if (b && !b.disabled) b.focus({ preventScroll: true });
        }
      });
      window.addEventListener(
        "click",
        (e) => {
          if (this.ignoreNextClick && e.isTrusted) {
            this.ignoreNextClick = false;
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        { capture: true, signal: this.game._abort.signal },
      );
      const activity = (e) => {
        if (e.type === "pointerdown" || e.type === "keydown") this.ignoreNextClick = false;
        if (this.net.ended) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (e.type === "pointermove") {
          if (e.pointerType !== "mouse") return;
          if (
            this.lastPointer &&
            Math.hypot(e.clientX - this.lastPointer[0], e.clientY - this.lastPointer[1]) < 3
          )
            return;
          this.lastPointer = [e.clientX, e.clientY];
        }
        if (e.type === "keydown") this.game.input.lastDevice = "keyboard";
        if (e.type === "pointerdown")
          this.game.input.lastDevice = e.pointerType === "touch" ? "touch" : "mouse";
        if (e.type === "pointermove") this.game.input.lastDevice = "mouse";
        if (e.type === "keydown" || e.type === "pointerdown") this.sound.unlock();
        this.lastHUD = "";
        if (this.screen === "attract") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.showTitle();
          this.game.input.clear();
          this.game.input.consumeAll();
          return;
        }
        this.markActivity();
      };
      for (const ev of ["keydown", "pointerdown", "pointermove", "wheel"])
        window.addEventListener(ev, activity, {
          capture: true,
          passive: false,
          signal: this.game._abort.signal,
        });
      const cv = this.game.screen.canvas;
      const cell = (e) => {
        const rc = cv.getBoundingClientRect();
        return this.theatre.cellAt(
          ((e.clientX - rc.left) * this.game.W) / rc.width,
          ((e.clientY - rc.top) * this.game.H) / rc.height,
        );
      };
      const paint = (e) => {
        const p = cell(e);
        if (!p) return;
        const key = p.join(",");
        if (key === this.paint?.last) return;
        if (this.paint) this.paint.last = key;
        if (this.editor.apply(...p)) this.refreshEditor();
      };
      cv.addEventListener("pointerdown", (e) => {
        if (this.net.ended || this.ui?.screen) return;
        if (this.screen === "editor") {
          this.paint = { id: e.pointerId, last: "" };
          cv.setPointerCapture?.(e.pointerId);
          paint(e);
          return;
        }
        if (e.pointerType === "touch" && !this.touch) {
          this.touch = { id: e.pointerId, x: e.clientX, y: e.clientY, vector: [0, 0] };
          cv.setPointerCapture?.(e.pointerId);
          this.game.input.lastDevice = "touch";
        }
      });
      cv.addEventListener("pointermove", (e) => {
        if (this.paint?.id === e.pointerId && !this.ui?.screen) paint(e);
        if (this.touch?.id === e.pointerId) {
          const k = this.game.settings.touchSensitivity / 42;
          this.touch.vector = [
            M.clamp((e.clientX - this.touch.x) * k, -1, 1),
            M.clamp((e.clientY - this.touch.y) * k, -1, 1),
          ];
        }
      });
      const release = (e) => {
        if (this.paint?.id === e.pointerId) this.paint = null;
        if (this.touch?.id === e.pointerId) {
          this.touch = null;
          this.intentCache[0] = { d: -1, a: false };
        }
      };
      for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
        cv.addEventListener(ev, release);
      window.addEventListener("blur", () => {
        this.touch = null;
        this.paint = null;
        this.clearIntents();
      });
      window.addEventListener(
        "keydown",
        (e) => {
          if (
            this.screen === "editor" &&
            !this.ui?.screen &&
            e.ctrlKey &&
            (e.code === "KeyZ" || e.code === "KeyY")
          ) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (e.code === "KeyY" || e.shiftKey) this.editor.redo();
            else this.editor.undo();
            this.refreshEditor();
          }
        },
        { capture: true },
      );
    }
    command(name, args) {
      const testing =
        typeof location !== "undefined" && new URLSearchParams(location.search).get("test") === "1";
      if (name === "snapshot") return this.game.debug.snapshot();
      if (this.net.active || (!testing && !this.devOpen))
        return { ok: false, reason: "Use visible Developer tools in a standalone run." };
      if (name === "start") {
        this.startRun(args);
        return { ok: true };
      }
      if (name === "advance") {
        const n = M.clamp(Number(args.seconds) || 0, 0, 1200);
        this.game.advance(n, { draw: false });
        return { ok: true };
      }
      if (name === "bot-play") {
        const bots = this.world.players.map((p) => new M.Bot(p.id)),
          limit = M.clamp(args.seconds || 900, 1, 1200),
          trace = [];
        let lastRev = this.world.revision;
        for (let i = 0; i < limit * 120 && !["won", "lost"].includes(this.world.phase); i++) {
          for (let j = 0; j < this.world.players.length; j++)
            this.world.setIntent(
              this.world.players[j].id,
              bots[j].intent(this.world, this.world.players[j]),
            );
          this.world.step();
          if (lastRev !== this.world.revision) {
            trace.push(this.world.snapshot());
            lastRev = this.world.revision;
          }
        }
        this.theatre.update(this.world, 1 / 120);
        return {
          ok: this.world.phase === "won",
          state: this.world.snapshot(),
          transitions: trace.map((s) => ({ stage: s.stage, tick: s.tick, lives: s.lives })),
        };
      }
      if (name === "tune") return { ok: this.world.setTuning(args.key, args.value) };
      if (name === "stage") {
        this.world.stageIndex = M.clamp(args.index | 0, 0, 5);
        this.world.assisted = true;
        this.world.loadStage();
        this.resetPresentation();
        return { ok: true };
      }
      if (name === "editor") {
        this.openEditor();
        return { ok: true };
      }
      return { ok: false, reason: "Unknown diagnostic command." };
    }
    dispose() {
      this.net.dispose();
      this.sound.end();
      this.game.dispose();
    }
  }
  M.App = App;
  (async () => {
    const net = new M.Session();
    try {
      await net.connect();
      const app = new App(net);
      globalThis.mix = app;
      globalThis.game = app.game;
      document.body.dataset.game = "kc-munchkin-mix-up";
    } catch (error) {
      if (net.active) AIHub.fail("Mix-Up could not load: " + error.message);
      else {
        const el = document.getElementById("load-error");
        if (el) {
          el.hidden = false;
          el.textContent = "This cabinet could not start: " + error.message;
        }
      }
      console.error(error);
    }
  })();
})(globalThis.Mix);
