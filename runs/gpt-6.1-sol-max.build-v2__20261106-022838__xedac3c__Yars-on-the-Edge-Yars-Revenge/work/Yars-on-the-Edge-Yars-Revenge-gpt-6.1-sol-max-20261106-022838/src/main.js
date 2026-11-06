/* ============================== GAME START ==============================
 * Yars on the Edge — original siege shooter built from the SHOOTER kit's
 * overhead scene/actor/bullet/pixel-lighting pattern. Engine shell remains native.
 * ======================================================================== */
(() => {
  "use strict";
  const E = My3D2dge,
    G = globalThis.Edge;
  class App {
    constructor() {
      this.world = null;
      this.state = null;
      this.attract = false;
      this.idle = 0;
      this.lastStatus = "";
      this.lastEvent = 0;
      this.acc = 0;
      this.testActions = null;
      this.records = E.store.get("edge:records", {});
      this.unlocked = E.store.get("edge:unlocked", 0);
      this.persisted = false;
      const active = !!globalThis.AIHub?.active;
      const settings = [
        { key: "scale", value: "fill" },
        { key: "music", value: 0.1 },
        { key: "glyphs", value: "playstation" },
        {
          key: "voice",
          label: "Voices",
          type: "slider",
          value: 1,
          group: "Sound",
          apply: (g, v) => {
            g.audio.voiceVolume = v;
            g.audio.applyVolume();
          },
        },
        { key: "aimAssist", label: "Gentle aim assist", type: "toggle", value: true, group: "Game" },
        {
          key: "keyboardAim",
          label: "Keyboard aim follows movement",
          type: "toggle",
          value: true,
          group: "Game",
        },
        { key: "stickFire", label: "Right stick auto-fire", type: "toggle", value: false, group: "Game" },
        {
          key: "difficulty",
          label: "Campaign preset",
          type: "select",
          value: "Normal",
          options: ["Normal", "Assist"],
          group: "Game",
          help: "Assist slows pursuit, lengthens warnings and adds replacement scouts.",
        },
      ];
      this.game = new E.Game({
        id: "yars-on-the-edge-v1",
        canvas: "screen",
        res: [640, 360],
        expand: { maxW: 900, maxH: 1400 },
        view: "overhead",
        views: ["overhead"],
        input: G.INPUT,
        bg: "#06111c",
        draw: true,
        autoPause: !active,
        live: active,
        fullscreen: "button",
        menu: {
          settings,
          controls: { fire: "Primary stream", cannon: "Siege cannon" },
          quit: () => this.toTitle(),
          items: () => [
            ...(!this.online?.info && this.world?.players.length === 1
              ? [["Call a second scout", () => this.joinPartner()]]
              : []),
            ["How to play", () => this.help()],
            ["Dev workbench", () => this.dev.show()],
            ["About / Credits", () => this.about()],
          ],
        },
      });
      const game = this.game;
      game.fadeTime = 0.18;
      game.cam.smooth = 0;
      game.input.touchEnabled = false;
      this.ui = new E.Shell(game, {
        tv: true,
        theme: {
          ink: "#edf6e9",
          paper: "#0b1b26",
          accent: "#a5f9d2",
          muted: "#90acb2",
          danger: "#ff8777",
          line: "#314954",
          font: "ui-sans-serif, system-ui, sans-serif",
          titleFont: "ui-sans-serif, system-ui, sans-serif",
        },
        screens: { pause: { kicker: "TRANSMISSION HELD", title: "Take a breath." } },
      });
      // Extend the native settings screen while keeping developer-only rows in its workbench.
      this.ui._settingsRows = function (add) {
        const S = this._game.settings;
        for (const group of ["Display", "Sound", "Comfort", "Game"]) {
          const keys = S.keys(group).filter((k) => S.spec(k).type !== "value" && k !== "zoom");
          if (keys.length) {
            add(this._el("div", "esh-k esh-sec", group));
            for (const key of keys) add(this._row(key));
          }
        }
      };
      this.art = new G.Presentation(game);
      this.sound = new G.Sound(game);
      this.controls = new G.Controls(game, this);
      this.online = new G.Online(this);
      this.dev = new G.Dev(this);
      this.pilot = new G.Pilot();
      this.setupDom();
      game.hook("input", () => this.inputTick());
      game.start({
        scene: active ? "waiting" : "title",
        boot: false,
        scenes: {
          title: {
            view: "overhead",
            views: ["overhead"],
            camera: { zoom: false },
            enter: () => this.titleEnter(),
            update: (dt) => this.titleUpdate(dt),
            draw: (r) => this.art.title(r),
            back: () => true,
          },
          waiting: {
            view: "overhead",
            views: ["overhead"],
            camera: { zoom: false },
            update: (dt) => {
              this.art.update(dt, null);
              game.focus(game.W / 2, game.H / 2, 0);
            },
            draw: (r) => this.art.title(r),
          },
          play: {
            view: "overhead",
            views: ["overhead"],
            camera: { zoom: false },
            pausable: true,
            enter: () => {
              game.timeScale = 1;
              game.focus(game.W / 2, game.H / 2, 0);
            },
            update: (dt) => this.update(dt),
            draw: (r) => this.art.draw(r, this.state, this.dev.overlays),
            back: () => false,
          },
        },
      });
      game.debug = {
        snapshot: () => ({
          title: "Yars on the Edge",
          scene: game.sceneName,
          menu: this.ui.screen,
          paused: game.paused,
          attract: this.attract,
          idle: this.idle,
          unlocked: this.unlocked,
          world: this.world?.snapshot() || null,
          online: {
            active: !!this.online.info,
            server: !!this.online.info?.server,
            ended: this.online.ended,
            stats: { ...this.online.stats },
          },
          audio: { music: game.settings.music, enabled: this.sound.enabled, nodes: this.sound.nodes.size },
          errors: [...game.errors],
        }),
        start: (opts) => this.startRun(opts),
        actions: (a) => {
          this.testActions = a;
        },
        clearActions: () => {
          this.testActions = null;
        },
        teleport: (x, y, player = 0) => {
          if (this.online.info) return false;
          const p = this.world?.players[player];
          if (p) {
            p.x = x;
            p.y = G.wrap(y);
            p.vx = p.vy = 0;
            this.world.practice = true;
          }
        },
        world: () => this.world,
        app: () => this,
        attract: () => this.startAttract(),
        exitAttract: () => this.exitAttract(),
        jump: (sector, phase) => this.dev.jump(sector, phase),
        step: () => this.world?.step(this.testActions || []),
      };
      globalThis.__game = game;
      globalThis.__edge = this;
      E.current = game;
      if (!game.headless)
        this.online
          .connect()
          .then((joined) => {
            if (!joined && game.sceneName === "waiting") game.go("title", null, { fade: 0 });
          })
          .catch((e) => game.fail("session startup", e));
      if (globalThis.AIHub)
        AIHub.probe(() => ({
          scene: game.sceneName,
          menu: this.ui.screen,
          world: this.world
            ? {
                tick: this.world.tick,
                sector: this.world.sector,
                score: this.world.score,
                phase: this.world.status,
              }
            : null,
          input: true,
        }));
    }
    setupDom() {
      if (this.game.headless) return;
      const hud = (this.hud = document.createElement("div"));
      hud.id = "flight-hud";
      hud.hidden = true;
      hud.innerHTML =
        '<div class="hud-top"><div class="sector-label"><span class="eyebrow"></span><b></b></div><div class="score"><small>SWARM SCORE</small><b></b></div><div class="reserve"><small>REPLACEMENTS</small><b></b></div></div><div class="hud-bottom"><div class="scout-bars"></div><div class="mission-hint"></div></div><div class="radio"><span></span><b></b><p></p></div><div class="demo-label">DEMO <span>Any input returns</span></div><div class="online-countdown"></div><button class="touch-cannon" aria-label="Fire siege cannon">SIEGE<br><small>FIRE & MOVE</small></button>';
      document.body.appendChild(hud);
      hud.querySelector(".touch-cannon").onclick = () => {
        this.controls.touchCannon = true;
        this.sound.unlock();
      };
      for (const ev of ["keydown", "pointerdown", "touchstart"])
        addEventListener(
          ev,
          (e) => {
            if (e.isTrusted !== false && !this.attract) this.sound.unlock();
          },
          { passive: true },
        );
      // Native shell focus already follows keyboard/pad; hover should focus naturally as well.
      this.ui.root.addEventListener("pointerover", (e) => {
        const b = e.target.closest("button");
        if (b && !b.disabled) b.focus({ preventScroll: true });
      });
    }
    titleEnter() {
      this.ui.hide();
      this.world = null;
      this.state = null;
      this.attract = false;
      this.idle = 0;
      this.controls.clear();
      this.controls.lastActivity = this.game.real;
      this.art.reset();
      this.sound.reset();
      this.sound.music(0);
      this.persisted = false;
      this.showTitle();
      if (this.hud) this.hud.hidden = true;
    }
    showTitle() {
      this.ui.show("title", {
        kicker: "A SIEGE SONG FOR THE LAST SWARM",
        name: "Yars on the Edge",
        subtitle: "Small wings. Colossal revenge.",
        text: "Bite a fortress. Steal its light. Get out of your own way.",
        meta: ["1–2 scouts", "Three sectors", "An original 1982-inspired arcade siege"],
        footer: "Remote co-op is available when launched through AI Hub.",
        back: () => {},
        actions: [
          { label: "Solo campaign", primary: true, fn: () => this.startRun() },
          ["Local co-op", () => this.coopMenu()],
          ["Sector practice", () => this.practiceMenu()],
          ["How to play", () => this.help()],
          ["Settings", () => this.game.menu("settings")],
          ["About / Credits", () => this.about()],
        ],
      });
    }
    titleUpdate(dt) {
      this.game.focus(this.game.W / 2, this.game.H / 2, 0);
      this.art.update(dt, null);
      this.idle = this.game.real - this.controls.lastActivity;
      if (this.idle >= 10 && !this.online.info) this.startAttract();
      if (this.game.headless && this.game.input.pressed("start")) this.startRun();
    }
    coopMenu() {
      this.ui.show("coop", {
        kicker: "TWO SCOUTS / ONE SWARM",
        title: "Share the breach.",
        text: "Use two controllers, or keyboard & mouse plus one controller. Without a second pad, share the keyboard: P1 WASD + F/G; P2 arrows + J/K. Biting is automatic. Each scout has a gun; siege shots can hurt either scout.",
        actions: [
          ["Launch local co-op", () => this.startRun({ coop: true })],
          ["Controls & rebinding", () => this.game.menu("controls")],
          ["Back", () => this.ui.back()],
        ],
      });
    }
    joinPartner() {
      if (this.online.info || !this.world || this.world.players.length !== 1) return;
      this.configurePlayers(true);
      const template = new G.World({ players: [{ id: 0 }, { id: 1, name: "Vesper", color: "#d6a7ff" }] })
        .players[1];
      template.inv = 3;
      this.world.players.push(template);
      this.world.reserves = Math.min(8, this.world.reserves + 1);
      this.controls.clear();
      this.art.reset();
      this.ui.hide();
    }
    configurePlayers(coop) {
      const game = this.game;
      while (game.players.length > 1) game.removePlayer(2);
      game.input.pad = "any";
      game.input.padIndex = null;
      game.input.padId = "";
      game.input.padPrev = [];
      game.input.padMove = [0, 0];
      game.input.padAim = null;
      game.input.padLost = false;
      game.input.use(G.INPUT);
      if (!coop) return;
      const pads =
        typeof navigator === "undefined"
          ? []
          : Array.from(navigator.getGamepads?.() || []).filter((p) => p && p.connected);
      if (pads.length >= 2) {
        game.input.pad = pads[0].index;
        game.input.lastDevice = "gamepad";
        game.addPlayer({ pad: pads[1].index });
      } else if (pads.length === 1) {
        game.input.pad = null;
        game.input.lastDevice = "keyboard";
        game.addPlayer({ pad: pads[0].index });
      } else {
        game.input.lastDevice = "keyboard";
        const p2 = game.addPlayer({ keys: "right" });
        game.input.use({
          ...G.INPUT,
          up: ["KeyW"],
          down: ["KeyS"],
          left: ["KeyA"],
          right: ["KeyD"],
          fire: ["KeyF", "Mouse0"],
          cannon: ["KeyG", "Mouse2", "Space"],
        });
        p2.use({
          ...G.INPUT,
          up: ["ArrowUp"],
          down: ["ArrowDown"],
          left: ["ArrowLeft"],
          right: ["ArrowRight"],
          fire: ["KeyJ", "Period"],
          cannon: ["KeyK", "Slash"],
        });
      }
      for (const I of game.players) if (I.pad !== null) I.use(G.INPUT);
    }
    startRun(opts = {}) {
      if (this.online.info && !opts.online) return;
      this.attract = !!opts.demo;
      this.ui.hide();
      this.game.resume();
      this.game.timeScale = 1;
      this.dev && ((this.dev.freeze = false), (this.dev.scale = 1));
      this.controls.clear();
      this.controls.edge = [0, 0];
      this.controls.aim = [
        [1, 0],
        [1, 0],
      ];
      if (!opts.online) this.configurePlayers(!!opts.coop);
      this.world = new G.World({
        seed: opts.seed ?? 41739,
        sector: opts.sector || 0,
        practice: opts.practice,
        demo: opts.demo,
        encounter: opts.encounter,
        difficulty: opts.online ? "Normal" : this.game.settings.difficulty,
        players:
          opts.players ||
          (opts.coop
            ? [
                { id: 0, name: "Nacre", color: "#84f9d1" },
                { id: 1, name: "Vesper", color: "#d6a7ff" },
              ]
            : undefined),
      });
      this.lastStatus = "";
      this.lastEvent = 0;
      this.acc = 0;
      this.art.reset();
      this.sound.reset();
      this.pilot = new (opts.demo ? G.ShowcasePilot : G.Pilot)();
      this.persisted = false;
      this.radio = {
        title: G.SECTORS[this.world.sector].name,
        text: G.SECTORS[this.world.sector].story,
        until: 6,
      };
      this.game.go("play", null, { fade: 0 });
      this.syncPresentation(0);
      if (this.hud) this.hud.hidden = false;
    }
    inputTick() {
      this.controls.meaningfulPad();
      if (this.game.paused && !this._wasPaused) this.sound.stopSources();
      this._wasPaused = this.game.paused;
      if (this.online.ended) return;
      if (this.game.sceneName === "title" && !this.attract && !this.online.info) {
        this.idle = this.game.real - this.controls.lastActivity;
        if (this.idle >= 10) this.startAttract();
      }
      if (this.game.paused || this.ui.screen) {
        if (this.controls.touch.size) this.controls.clear();
        if (this.world && !this.attract && !this.online.info && this.dev.freeze) this.world.applyTuning();
      }
      if (this.online.info) {
        const p = this.world?.players.find((p) => p.id === this.online.info.me);
        this.online.local(this.testActions?.[0] || this.controls.read(0, p, this.state));
      }
      if (this.attract && this.game.input.anyPressed()) this.exitAttract();
    }
    syncPresentation(dt) {
      if (!this.world) return;
      this.state = this.online.info ? this.online.view(dt) : this.world.snapshot();
      this.art.update(dt, this.state);
      this.sound.update(this.state);
      this.updateHud();
    }
    update(dt) {
      const game = this.game;
      game.focus(game.W / 2, game.H / 2, 0);
      if (!this.world || this.online.ended) return;
      if (!this.online.info && !this.dev.freeze) {
        this.acc += dt * this.dev.scale;
        while (this.acc + 1e-10 >= G.DT) {
          const w = this.world,
            actions = this.attract
              ? this.pilot.actions(w)
              : this.testActions || w.players.map((p, i) => this.controls.read(i, p, this.state));
          w.step(actions);
          this.acc -= G.DT;
          if (this.attract && w.outcome) {
            this.startRun({ demo: true, seed: 41739 });
            break;
          }
          if (w.outcome) break;
        }
      }
      this.syncPresentation(dt);
      if (!this.attract && !this.online.info) this.flow();
    }
    flow() {
      const w = this.world;
      if (w.status === this.lastStatus) return;
      this.lastStatus = w.status;
      if (w.status === "transition") {
        this.persistDiscovery(w.sector + 1);
        this.ui.show("transmission", {
          kicker: `SECTOR ${w.sector + 1} / SIGNAL BROKEN`,
          title: ["The shell has fallen.", "The mirrors go dark."][w.sector],
          text: G.SECTORS[w.sector + 1].story,
          stats: [
            [String(w.score).padStart(6, "0"), "SWARM SCORE"],
            [String(w.reserves), "REPLACEMENTS"],
          ],
          actions: [
            [
              "Fly deeper",
              () => {
                w.advanceSector();
                this.ui.hide();
                this.controls.clear();
              },
            ],
            ["Pause", () => this.game.pause()],
          ],
          back: () => {
            w.advanceSector();
            this.ui.hide();
          },
        });
      } else if (w.status === "playing" && this.ui.screen === "transmission") {
        this.ui.hide();
      } else if (w.outcome) this.results();
    }
    persistDiscovery(i) {
      if (this.attract || this.online.info || this.world.practice) return;
      this.unlocked = Math.max(this.unlocked, i);
      E.store.set("edge:unlocked", this.unlocked);
    }
    results() {
      const w = this.world,
        won = w.outcome === "victory";
      if (won) this.persistDiscovery(2);
      const category = (w.players.length > 1 ? "co-op" : "solo") + " / " + w.difficulty;
      if (!this.persisted && !w.practice && !w.demo) {
        this.records[category] = Math.max(this.records[category] || 0, w.score);
        E.store.set("edge:records", this.records);
        this.persisted = true;
      }
      const b = w.breakdown;
      this.ui.show("results", {
        kicker: won ? "THE ILEX BROADCAST IS FREE" : "THE SIGNAL HAS GONE QUIET",
        title: won ? "A thousand wings answer." : "The swarm remembers.",
        text: won
          ? "The heart is silent. From the static, the living return."
          : "Another scout can carry the song. Retry this sector as practice, or begin a fresh campaign.",
        emblem: won ? "✦" : "◇",
        stats: [
          [String(w.score).padStart(6, "0"), "SWARM SCORE"],
          [category, w.practice ? "PRACTICE / NO RECORD" : "RECORD CATEGORY"],
          [String(this.records[category] || 0), "BEST"],
        ],
        sections: [
          [
            "YOUR SIEGE",
            `Breach ${b.breach} · Bites ${b.bite} · Core strikes ${b.core} · Airborne ${b.intercept} · Ending ${b.ending}`,
          ],
        ],
        actions: [
          ["Replay campaign", () => this.startRun({ coop: w.players.length > 1 })],
          [
            "Retry sector / practice",
            () => this.startRun({ sector: w.sector, practice: true, coop: w.players.length > 1 }),
          ],
          ["Sector practice", () => this.practiceMenu()],
          ["About / Credits", () => this.about()],
          ["Title", () => this.toTitle()],
        ],
        back: () => this.toTitle(),
      });
    }
    practiceMenu() {
      this.ui.show("practice", {
        kicker: "DISCOVERED SECTORS / NO CAMPAIGN RECORD",
        title: "Return to the breach.",
        actions: [
          ...G.SECTORS.map((s, i) => ({
            label: `${i + 1} / ${s.name}${i > this.unlocked ? " / undiscovered" : ""}`,
            disabled: i > this.unlocked,
            fn: () => this.startRun({ sector: i, practice: true }),
          })),
          ["Back", () => this.ui.back()],
        ],
      });
    }
    toTitle() {
      if (this.online.info) return;
      this.controls.clear();
      this.ui.hide();
      this.game.resume();
      this.game.timeScale = 1;
      this.sound.reset();
      this.game.go("title", null, { fade: 0 });
    }
    help() {
      this.ui.show("help", {
        kicker: "FLIGHT MANUAL",
        title: "Bite. Align. Get clear.",
        keys: [
          [this.controls.prompt("up") + " / WASD", "Fly; top and bottom edges wrap"],
          [this.controls.prompt("fire"), "Aim and hold the primary stream"],
          ["CONTACT", "Bite cells automatically; five bites charge your gun"],
          [this.controls.prompt("cannon"), "Lock a lane, fire from the left rail, then move"],
          [this.controls.prompt("pause"), "Pause / back"],
        ],
        sections: [
          [
            "THE STATIC REMEMBERS",
            "The bright strip hides you from guided red pursuers. It suppresses both weapons. Swirls and siege shots pass through.",
          ],
          [
            "DO NOT TRUST THE GUN",
            "A siege shot can destroy either scout. Diamond cells reflect it once; the return lane gives a second warning. Ordinary shots hurt shields only.",
          ],
          [
            "THE HEART MUST FLY",
            "Touch a docked heart for a fresh charge. This is always renewable. The last heart can only die in flight. An airborne cannon hit earns a replacement scout.",
          ],
          [
            "TWO SCOUTS",
            "The reserve is shared. Each scout stores a separate charge and controls a separate gun. A cleared sector restores a lost partner.",
          ],
          [
            "TOUCH FLIGHT",
            "Drag the left half to move; drag the right half to aim and fire. A siege button appears when charged. It briefly nudges you away from your lane.",
          ],
          [
            "NORMAL & ASSIST",
            "Assist keeps every mechanic, slows pursuit and lengthens warnings. Its score records are separate.",
          ],
        ],
        actions: [["Back", () => this.ui.back()]],
      });
    }
    about() {
      const report = G.REPORT || {
        sourceInformation: {},
        testingFeedback: [],
        engineFeedback: [],
        promptFeedback: [],
      };
      const labels = {
        date: "Date",
        source: "Source",
        plan: "Plan",
        genre: "Genre",
        perspective: "Perspective",
        tech: "Tech",
        artDirection: "Art direction",
        animation: "Animation",
        audio: "Audio",
        online: "Online",
        testing: "Testing",
        research: "Research",
        environment: "Environment",
        model: "Model",
        usage: "Usage",
      };
      const pages = [
        {
          title: "A signal made of small things.",
          sections: [
            [
              "CREDITS",
              "Original game, code, art, animation, music, effects, gibberish voices and writing: OpenAI gpt-6.1-sol through Codex CLI. Engine: Michael Crosato. Inspired by Yars’ Revenge (Atari, 1982), designed by Howard Scott Warshaw. This is an original tribute, unaffiliated with Atari.",
            ],
            [
              "THE SWARM",
              "Nacre & Vesper / exiled scouts. Ilex / their lost home. Bellkeeper / the fortress intelligence.",
            ],
            [
              "THANKS",
              "The engine handoff, AI Hub session tools, original instruction manual, creator interview, and the people who keep early games accessible.",
            ],
          ],
        },
        {
          title: "Source Information",
          sections: Object.entries(report.sourceInformation).map(([k, v]) => [labels[k] || k, v]),
        },
        {
          title: "Testing Feedback",
          sections: report.testingFeedback.map((v, i) => [
            ["Issues caught", "Critical issues", "Most helpful test", "Least helpful test"][i],
            v,
          ]),
        },
        {
          title: "Engine Feedback",
          sections: report.engineFeedback.map((v, i) => [
            [
              "What worked",
              "Wrong turns",
              "Built for this game",
              "Hardest part",
              "Engine changes",
              "One improvement",
            ][i],
            v,
          ]),
        },
        {
          title: "Prompt Feedback",
          sections: report.promptFeedback.map((v, i) => [
            ["What worked", "What was confusing", "Hardest task", "Suggested change"][i],
            v,
          ]),
        },
      ];
      const show = (i) =>
        this.ui.show("credits", {
          kicker: `ABOUT / ${i + 1} OF ${pages.length}`,
          title: pages[i].title,
          sections: pages[i].sections,
          actions: [
            ...(i < pages.length - 1 ? [["Next page", () => show(i + 1)]] : []),
            ...(i > 0 ? [["Previous page", () => show(i - 1)]] : []),
            ["Back", () => this.ui.back()],
          ],
        });
      show(0);
    }
    startAttract() {
      if (this.online.info || this.attract) return;
      this.startRun({ demo: true, seed: 92817 });
      if (this.hud) this.hud.classList.add("is-demo");
    }
    exitAttract() {
      if (!this.attract) return;
      this.controls.suppressedUntil = this.game.real + 0.25;
      this.controls.lastActivity = this.game.real;
      this.controls.clear();
      this.attract = false;
      this.sound.reset();
      this.art.reset();
      if (this.hud) this.hud.classList.remove("is-demo");
      this.toTitle();
    }
    updateHud() {
      if (!this.hud || !this.state) return;
      const s = this.state,
        root = this.hud,
        visible = !this.ui.screen && !this.game.paused;
      root.hidden = !visible;
      root.classList.toggle("is-demo", this.attract);
      root.classList.toggle("touch-mode", this.game.input.lastDevice === "touch");
      root.querySelector(".eyebrow").textContent =
        `${this.attract ? "DEMO · " : s.practice ? "PRACTICE · " : ""}SECTOR ${s.sector + 1} / 03`;
      root.querySelector(".sector-label b").textContent = G.SECTORS[s.sector].name;
      root.querySelector(".score b").textContent = String(s.score).padStart(6, "0");
      root.querySelector(".reserve b").textContent = `${"◇".repeat(s.reserves)}${s.reserves ? "" : "0"} / 8`;
      const bars = root.querySelector(".scout-bars");
      if (bars.children.length !== s.players.filter((p) => !p.gone).length) {
        bars.replaceChildren();
        for (const p of s.players.filter((p) => !p.gone)) {
          const el = document.createElement("div");
          el.className = "scout";
          el.innerHTML = '<b></b><div class="charge-track"><i></i></div><span></span>';
          bars.appendChild(el);
        }
      }
      s.players
        .filter((p) => !p.gone)
        .forEach((p, i) => {
          const el = bars.children[i];
          const cannonLabel = this.online.info
            ? p.id === this.online.info.me
              ? this.controls.prompt("cannon")
              : ""
            : (this.game.players[p.shape] || this.game.input).label("cannon");
          el.style.setProperty("--scout", p.color);
          el.querySelector("b").textContent = `${p.shape ? "II" : "I"} / ${p.name}`;
          el.querySelector("i").style.width = `${(100 * p.charge) / s.tuning.charge}%`;
          el.querySelector("span").textContent = !p.alive
            ? p.respawn >= 0
              ? "NEW SCOUT INBOUND"
              : "WAITING FOR SECTOR CLEAR"
            : p.refuge
              ? "STATIC / WEAPONS QUIET"
              : p.charge >= s.tuning.charge
                ? `${cannonLabel ? cannonLabel + " " : ""}SIEGE READY`
                : `${p.charge}/${s.tuning.charge} · BITE TO CHARGE`;
        });
      let hint = "Bite the cells. Five bites charge the rail gun.";
      if (s.lessons.charged) hint = `${this.controls.prompt("cannon")} Siege · lock a lane, then move clear`;
      if (s.sector === 2 && s.phase === 2)
        hint =
          s.core.mode === "dock"
            ? "DOCKED / touch the heart for charge"
            : "INTERCEPT / only an airborne siege hit can finish it";
      if (s.refuge.warning) hint = "REFUGE FRACTURE IMMINENT / leave the static";
      if (!s.refuge.active) hint = "STATIC OFFLINE / guided threats can hit you";
      if (s.core.mode === "windup") hint = "SWIRL WINDING UP / static cannot protect you";
      if (s.players.some((p) => p.blocked > 0)) hint = "STATIC SUPPRESSES WEAPONS / leave the strip to fire";
      const touchMode = this.game.input.lastDevice === "touch";
      const danger =
        s.core.mode === "windup" ||
        s.refuge.warning ||
        !s.refuge.active ||
        s.players.some((p) => p.blocked > 0);
      root.querySelector(".mission-hint").textContent =
        touchMode && !danger && s.time < 8
          ? "Left thumb: fly · Right thumb: aim & fire · Touch cells to bite"
          : hint;
      root.querySelector(".mission-hint").classList.toggle("touch-hint", touchMode && (danger || s.time < 8));
      for (const e of s.events)
        if (e.id > this.lastEvent) {
          this.lastEvent = e.id;
          if (e.type === "notice")
            this.radio = { title: e.title || "SWARM", text: e.text || "", until: s.time + 6 };
          if (e.type === "airborne-bonus")
            this.radio = {
              title: "AIRBORNE INTERCEPT",
              text: "+1 replacement scout. The swarm grows.",
              until: s.time + 3.5,
            };
          if (e.type === "sector")
            this.radio = {
              title: G.SECTORS[s.sector].name,
              text: G.SECTORS[s.sector].story,
              until: s.time + 6,
            };
        }
      const radio = root.querySelector(".radio");
      radio.hidden = !this.radio || s.time > this.radio.until || this.attract;
      if (!radio.hidden) {
        radio.querySelector("span").textContent = "ILEX / SWARM CHANNEL";
        radio.querySelector("b").textContent = this.radio.title;
        radio.querySelector("p").textContent = this.radio.text;
      }
      const local = s.players.find((p) => p.id === (this.online.info ? this.online.info.me : 0));
      root.querySelector(".touch-cannon").hidden = !(
        local?.alive &&
        local.charge >= s.tuning.charge &&
        !local.refuge &&
        this.game.input.lastDevice === "touch"
      );
      const countdown = root.querySelector(".online-countdown"),
        time = this.online.info ? this.online.hub.time() : 0;
      countdown.hidden = !this.online.info || time >= 0;
      countdown.textContent = Number.isFinite(time)
        ? String(Math.ceil(-time / 1000))
        : "THE SWARM IS GATHERING";
    }
  }
  G.App = App;
  new App();
})();
/* ============================== GAME END ============================== */
