/* Freedom Warp Rescue — native TV Shell, persistent preferences, and reviewable tools. */
globalThis.FWR = globalThis.FWR || {};
((F) => {
  const DEFAULT_SETTINGS = Object.freeze({
    master: 0.75,
    music: 0.1,
    effects: 0.8,
    voice: 0.7,
    glyphs: "playstation",
    reducedMotion: false,
    touchAssist: true,
  });
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const validateSettings = (raw) => {
    const out = { ...DEFAULT_SETTINGS };
    if (!raw || typeof raw !== "object") return out;
    for (const k of ["master", "music", "effects", "voice"])
      if (Number.isFinite(raw[k])) out[k] = clamp(raw[k], 0, 1);
    if (["playstation", "xbox"].includes(raw.glyphs)) out.glyphs = raw.glyphs;
    for (const k of ["reducedMotion", "touchAssist"])
      if (typeof raw[k] === "boolean") out[k] = raw[k];
    return out;
  };
  class Store {
    constructor(storage) {
      this.available = true;
      this.warning = "";
      this.key = "freedom-warp-rescue.v2";
      this.data = {
        version: 2,
        settings: { ...DEFAULT_SETTINGS },
        bests: { operation: 0, evasion: 0 },
        checkpoint: null,
      };
      try {
        this.storage = storage === undefined ? globalThis.localStorage : storage;
        if (!this.storage) throw Error("Storage unavailable");
        const raw = this.storage.getItem(this.key);
        if (raw) {
          const x = JSON.parse(raw);
          if (x?.version !== 2) {
            this.warning = "An older save was ignored. New flights are available.";
            return;
          }
          this.data.settings = validateSettings(x.settings);
          for (const mode of ["operation", "evasion"])
            if (x.bests && Number.isFinite(x.bests[mode]) && x.bests[mode] >= 0)
              this.data.bests[mode] = Math.floor(x.bests[mode]);
          if (
            x.checkpoint &&
            typeof x.checkpoint === "object" &&
            x.checkpoint.version === 1 &&
            Number.isFinite(x.checkpoint.seed) &&
            Number.isInteger(x.checkpoint.sector) &&
            x.checkpoint.sector >= 0 &&
            x.checkpoint.sector <= 4 &&
            ["operation", "evasion"].includes(x.checkpoint.mode) &&
            JSON.stringify(x.checkpoint).length < 500000
          )
            this.data.checkpoint = x.checkpoint;
        }
      } catch (_) {
        this.available = false;
        this.warning = "Saving is unavailable. You can still play the complete operation.";
      }
    }
    get settings() {
      return this.getSettings();
    }
    getSettings() {
      return { ...this.data.settings };
    }
    setSettings(x) {
      this.data.settings = validateSettings({ ...this.data.settings, ...x });
      this._write();
      return this.getSettings();
    }
    best(mode) {
      return this.data.bests[mode] || 0;
    }
    record(mode, score, eligible = true) {
      if (!eligible || !["operation", "evasion"].includes(mode) || !Number.isFinite(score))
        return false;
      if (score <= this.best(mode)) return false;
      this.data.bests[mode] = Math.max(0, Math.floor(score));
      return this._write();
    }
    getCheckpoint() {
      return this.data.checkpoint ? copy(this.data.checkpoint) : null;
    }
    saveCheckpoint(data, eligible = true) {
      if (
        !eligible ||
        !data ||
        typeof data !== "object" ||
        data.version !== 1 ||
        !Number.isFinite(data.seed) ||
        !Number.isInteger(data.sector) ||
        data.sector < 0 ||
        data.sector > 4 ||
        !["operation", "evasion"].includes(data.mode)
      )
        return false;
      try {
        const value = copy(data);
        if (JSON.stringify(value).length > 500000) return false;
        this.data.checkpoint = value;
        return this._write();
      } catch (_) {
        return false;
      }
    }
    clearCheckpoint() {
      this.data.checkpoint = null;
      return this._write();
    }
    _write() {
      try {
        if (!this.storage) throw Error("Storage unavailable");
        this.storage.setItem(this.key, JSON.stringify(this.data));
        this.available = true;
        return true;
      } catch (_) {
        this.available = false;
        this.warning = "Saving is unavailable. Your current flight can continue.";
        return false;
      }
    }
  }
  const CONFIG = [
    ["Flight", "shipSpeed", "Cruise speed", 80, 500, 5],
    ["Flight", "acceleration", "Acceleration", 100, 5000, 50],
    ["Flight", "braking", "Release braking", 1, 30, 0.5],
    ["Flight", "warpSpeed", "Hyperspace speed", 300, 1800, 25],
    ["Flight", "warpDuration", "Burst duration", 0.1, 1, 0.05],
    ["Flight", "warpCost", "Burst energy cost", 10, 100, 5],
    ["Flight", "energyRegen", "Energy regeneration", 5, 80, 1],
    ["Combat", "maxHull", "Maximum hull", 1, 12, 1],
    ["Combat", "damageGrace", "Damage grace", 0.2, 4, 0.1],
    ["Combat", "fireRate", "Cannon shots / sec", 1, 20, 0.5],
    ["Combat", "bulletDamage", "Laser damage", 1, 5, 1],
    ["Combat", "rescueRadius", "Rescue collar", 16, 70, 1],
    ["Combat", "crystalHp", "Crystal integrity", 2, 10, 1],
    ["Combat", "aimAssist", "Aim assist cone", 0, 0.8, 0.01],
    ["Threat", "mineArm", "Mine arming delay", 0.2, 3, 0.1],
    ["Threat", "enemyWarning", "Enemy warning lead", 0.5, 4, 0.1],
    ["Threat", "enemyHealth", "Enemy health scale", 0.25, 3, 0.05],
    ["Threat", "pressure", "Attack pressure", 0.25, 3, 0.05],
    ["Threat", "bossHealth", "Carrier health scale", 0.25, 3, 0.05],
  ];
  for (const spec of CONFIG) {
    const schema = F.SCHEMA?.[spec[1]];
    if (schema) {
      spec[3] = schema[1];
      spec[4] = schema[2];
      spec[5] = schema[3];
    }
  }
  const SETTING_KEYS = {
    fwrMaster: "master",
    fwrMusic: "music",
    fwrEffects: "effects",
    fwrVoice: "voice",
    glyphs: "glyphs",
    fwrMotion: "reducedMotion",
    fwrTouchAssist: "touchAssist",
  };
  const FEEDBACK_QUESTIONS = {
    testingFeedback: [
      "Issues caught",
      "Critical / game breaking",
      "Most helpful test",
      "Least helpful test",
    ],
    engineFeedback: [
      "Best part of the engine",
      "Where we got stuck",
      "Most important addition",
      "Hardest engine task",
      "Engine changes",
      "One engine improvement",
    ],
    promptFeedback: [
      "Best part of the prompt",
      "Confusing part",
      "Hardest requirement",
      "One prompt improvement",
    ],
  };
  class UI {
    constructor(E, game, o = {}) {
      this.E = E;
      this.game = game;
      this.o = o;
      this.input = o.input;
      this.store = o.store || new Store();
      this.context = "title";
      this._devSeed = 1;
      this._lastDiagnostic = -1;
      this._initializing = true;
      const settings = this.store.getSettings();
      const items = [
        {
          key: "fwrMaster",
          label: "Master volume",
          type: "slider",
          min: 0,
          max: 1,
          step: 0.05,
          value: settings.master,
        },
        {
          key: "fwrMusic",
          label: "Music",
          type: "slider",
          min: 0,
          max: 1,
          step: 0.01,
          value: settings.music,
        },
        {
          key: "fwrEffects",
          label: "Effects",
          type: "slider",
          min: 0,
          max: 1,
          step: 0.05,
          value: settings.effects,
        },
        {
          key: "fwrVoice",
          label: "Radio voices",
          type: "slider",
          min: 0,
          max: 1,
          step: 0.05,
          value: settings.voice,
        },
        {
          key: "glyphs",
          label: "Controller symbols",
          type: "select",
          options: [
            ["playstation", "PlayStation"],
            ["xbox", "Xbox"],
          ],
          value: settings.glyphs,
        },
        {
          key: "fwrMotion",
          label: "Reduced motion",
          type: "toggle",
          value: settings.reducedMotion,
        },
        {
          key: "fwrTouchAssist",
          label: "Touch targeting / auto fire",
          type: "toggle",
          value: settings.touchAssist,
        },
      ];
      this.shell = new E.Shell(game, {
        tv: true,
        standard: false,
        theme: {
          ink: "#e9f5f3",
          paper: "#0b1422",
          accent: "#f4bc70",
          muted: "#9db5c6",
          danger: "#ff766c",
          line: "#466173",
          font: '"Trebuchet MS", Arial, sans-serif',
          titleFont: '"Trebuchet MS", Arial, sans-serif',
        },
        screens: { pause: false },
        settings: { items, onChange: (S, key) => this._settingChanged(S, key) },
      });
      for (const [native, key] of Object.entries(SETTING_KEYS))
        game.settings.set(native, settings[key]);
      this._defineDevSettings();
      this._initializing = false;
      this._installStyle();
      const nativeRender = this.shell._render.bind(this.shell);
      this.shell._render = () => {
        nativeRender();
        this._decorate();
      };
      const nativeClose = this.shell._close.bind(this.shell);
      this.shell._close = () => {
        if (this.context === "results" || this.context === "failure") {
          if (!this._isHub()) {
            this.hide();
            this._emit("title");
          }
          return;
        }
        nativeClose();
      };
      const nativeNav = this.shell._nav.bind(this.shell);
      this.shell._nav = (dir) => {
        const el = typeof document === "undefined" ? null : document.activeElement;
        if (el?.dataset.fwrSeed && (dir === "left" || dir === "right")) {
          this._devSeed = Math.max(
            1,
            Math.min(4294967295, this._devSeed + (dir === "left" ? -1 : 1)),
          );
          el.value = this._devSeed;
          return;
        }
        nativeNav(dir);
      };
      if (this.shell.root) {
        this.shell.root.classList.add("fwr-shell");
        this.shell.root.addEventListener("pointerover", (e) => {
          const b = e.target.closest("button, input");
          if (b && !b.disabled && document.activeElement !== b) b.focus({ preventScroll: true });
        });
        this.shell.root.addEventListener("click", () => this._emit("uiSound", "confirm"));
      }
      this._buildMenuButton();
    }
    _isHub() {
      return typeof this.o.isHub === "function" ? this.o.isHub() : !!this.o.isHub;
    }
    get screen() {
      return this.shell.screen;
    }
    _emit(action, value) {
      return this.o.onAction ? this.o.onAction(action, value) : undefined;
    }
    _world() {
      return this.o.getWorld ? this.o.getWorld() : null;
    }
    _show(name, spec) {
      this.shell.show(name, spec);
      this._decorate();
      return this;
    }
    _replace(name, spec) {
      this.shell.hide();
      return this._show(name, spec);
    }
    _settingChanged(S, key) {
      if (this._initializing) return;
      if (SETTING_KEYS[key]) {
        const settings = this.store.setSettings({
          [SETTING_KEYS[key]]: S[key],
        });
        this.game.reduceMotion = settings.reducedMotion;
        for (const I of this.game.players) I.glyphs = settings.glyphs;
        this._emit("settingsChanged", settings);
      } else if (key.startsWith("dev_") && this.o.setConfig && !this._isHub()) {
        const name = key.slice(4);
        if (CONFIG.some((x) => x[1] === name)) this.o.setConfig(name, S[key]);
      } else if (key === "fwrDevInvulnerable" && !this._isHub())
        this._emit("devInvulnerable", !!S[key]);
      else if (key === "fwrDevCollision")
        this._emit("devOverlay", {
          collision: !!S[key],
          ownership: !!S.fwrDevOwnership,
        });
      else if (key === "fwrDevOwnership")
        this._emit("devOverlay", {
          collision: !!S.fwrDevCollision,
          ownership: !!S[key],
        });
      else if (key === "fwrDevTimeScale" && !this._isHub()) this._emit("devTimeScale", S[key]);
    }
    _defineDevSettings() {
      const S = this.game.settings,
        cfg = this.o.getConfig ? this.o.getConfig() : {};
      for (const [group, key, label, min, max, step] of CONFIG) {
        if (!S.spec(`dev_${key}`))
          S.define({
            key: `dev_${key}`,
            group: `Developer ${group}`,
            label,
            type: "slider",
            min,
            max,
            step,
            value: cfg[key] === undefined ? min : cfg[key],
          });
      }
      const extras = [
        {
          key: "fwrDevSector",
          label: "Sector preview / checkpoint",
          type: "select",
          value: "opening",
          options: [
            ["opening", "Opening"],
            ["sector1", "01 · Open rescue space"],
            ["sector2", "02 · Prison orbit"],
            ["finale", "03 · Prison carrier"],
            ["extraction", "Extraction"],
          ],
        },
        {
          key: "fwrDevSpawn",
          label: "Spawn entity",
          type: "select",
          value: "crystal",
          options: [
            ["crystal", "Captive crystal"],
            ["layer", "Mine-layer"],
            ["guard", "Crystal guard"],
            ["interceptor", "Interceptor"],
            ["curtain", "Curtain minefield"],
            ["ring", "Ring minefield"],
            ["arc", "Trailing arc"],
          ],
        },
        {
          key: "fwrDevInvulnerable",
          label: "Invulnerability",
          type: "toggle",
          value: false,
        },
        {
          key: "fwrDevCollision",
          label: "Collision overlay",
          type: "toggle",
          value: false,
        },
        {
          key: "fwrDevOwnership",
          label: "Mine ownership links",
          type: "toggle",
          value: false,
        },
        {
          key: "fwrDevTimeScale",
          label: "Simulation time scale",
          type: "slider",
          min: 0.1,
          max: 4,
          step: 0.1,
          value: 1,
        },
      ];
      for (const sp of extras) {
        if (!S.spec(sp.key)) S.define({ group: "Developer", ...sp });
        S.set(sp.key, sp.value);
      }
    }
    _syncDev() {
      const cfg = this.o.getConfig ? this.o.getConfig() : {};
      this._initializing = true;
      for (const [, key] of CONFIG)
        if (cfg[key] !== undefined) this.game.settings.set(`dev_${key}`, cfg[key]);
      this._initializing = false;
    }
    showTitle() {
      this.context = "title";
      const checkpoint = this.store.getCheckpoint(),
        acts = [];
      acts.push({
        label: "Play operation",
        primary: true,
        fn: () => this._emit("play"),
      });
      if (checkpoint)
        acts.push(["Resume checkpoint", () => this._emit("resumeCheckpoint", checkpoint)]);
      acts.push(
        ["Evasion · 3 minutes", () => this.showEvasionBriefing()],
        ["Shared-ship co-op", () => this.showCoop()],
        ["Settings", () => this.showSettings()],
        ["About / Credits", () => this.showAbout(0)],
      );
      return this._replace("title", {
        kicker: "A DEEP-SPACE RESCUE OPERATION",
        name: "FREEDOM\nWARP RESCUE",
        subtitle: "A small ship. A dangerous route. Bring them home.",
        actions: acts,
        meta: ["1–2 PLAYERS", "ONE SHIP", "TWO DRIVES"],
        footer: "Contact violet crystals to rescue. Stop firing on approach.",
      });
    }
    showEvasionBriefing() {
      return this._show("evasionBriefing", {
        kicker: "EVASION CHALLENGE",
        title: "Three minutes. No cannon.",
        text: "Your lasers are offline. Rescue captives, weave through live mines, and use hyperspace to reach the extraction signal. The same hull and rescue rules apply.",
        actions: [
          ["Launch Evasion", () => this._emit("evasion")],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    showCoop() {
      const joined = this.input?.coOp;
      return this._show("coop", {
        kicker: "TWO PEOPLE. ONE RESCUE SHIP.",
        title: "Share the flight deck",
        sections: [
          ["PILOT", "Steer with the left stick. Fire with R2 / □. Keep the rescue collar clear."],
          [
            "NAVIGATOR",
            "Aim with the right stick. Preview hyperspace with the left stick; commit with L2. Either seat can fire.",
          ],
          [
            "JOIN / LEAVE",
            "Use two controllers, or keyboard + one controller. During flight, Options on a free second pad joins it. The remaining player receives every solo action after a disconnect.",
          ],
          [
            "REMOTE CO-OP",
            "Shared-ship online co-op runs inside AI Hub. This standalone file supports local co-op.",
          ],
        ],
        actions: [
          [
            joined ? "Leave navigator seat" : "Join connected controller",
            () => {
              this._emit(joined ? "leave" : "join");
              this.shell.back();
              this.showCoop();
            },
          ],
          ["Controls", () => this.showControls()],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    showPause() {
      this.context = "pause";
      const online = this._isHub(),
        acts = [
          [
            "Resume flight",
            () => {
              this.hide();
              this._emit("resume");
            },
          ],
          ["Controls", () => this.showControls()],
          ["Settings", () => this.showSettings()],
          ["Developer tools", () => this.showDev()],
        ];
      if (!online) {
        if (this.input?.coOp)
          acts.push([
            "Swap pilot / navigator",
            () => {
              this._emit("swap");
              this.toast("Roles exchanged", "Pilot steers. Navigator aims and commits hyperspace.");
            },
          ]);
        else acts.push(["Shared-ship co-op", () => this.showCoop()]);
        acts.push([
          "Retry checkpoint",
          () =>
            this.confirm(
              "Retry this checkpoint?",
              "The checkpoint restores its hull, energy, objectives and score. Current progress in this sector will be lost.",
              "Retry checkpoint",
              () => this._emit("retry"),
            ),
        ]);
        acts.push([
          "Restart operation",
          () =>
            this.confirm(
              "Begin a new flight?",
              "Your current flight will be abandoned. Saved settings and best scores remain.",
              "Restart",
              () => this._emit("restart"),
            ),
        ]);
        acts.push([
          "Return to title",
          () =>
            this.confirm(
              "Leave the operation?",
              "Your most recent checkpoint remains available from the title screen.",
              "Return to title",
              () => this._emit("title"),
            ),
        ]);
      }
      return this._replace("pauseMenu", {
        kicker: online ? "LOCAL OVERLAY · THE SHARED WORLD CONTINUES" : "FLIGHT SUSPENDED",
        title: online ? "Flight deck" : "Take a breath",
        text: online
          ? "This panel suppresses only your controls. AI Hub owns round restart and navigation."
          : "The prisoners are waiting. Your ship is ready when you are.",
        back: () => {
          this.hide();
          this._emit("resume");
        },
        actions: acts,
      });
    }
    showSettings() {
      return this._show("settings", {
        kicker: "FLIGHT DECK",
        title: "Settings",
        text: "Music starts at 10%. Touch assistance avoids firing through captive crystals.",
        actions: [
          ["Controls / rebinding", () => this.showControls()],
          [
            "Restore preferences",
            () => {
              this._initializing = true;
              for (const [key, name] of Object.entries(SETTING_KEYS))
                this.game.settings.set(key, DEFAULT_SETTINGS[name]);
              this._initializing = false;
              const settings = this.store.setSettings(DEFAULT_SETTINGS);
              this._emit("settingsChanged", settings);
              this.shell.show("settings");
            },
          ],
        ],
      });
    }
    showControls() {
      return this._show("controls", {
        kicker: "STEERING & REBINDING",
        title: "Your controls",
        text: "Touch: drag the left half to steer; touch the right half to aim. Double tap the right half or use the contact WARP button to burst. Assisted targeting fires only along clear enemy lanes.",
        sections: [
          [
            "SHARED-SHIP ROLES",
            "Pilot owns conventional flight. Navigator owns aim and hyperspace. Either seat fires the same cannon. A neutral hyperspace stick uses your last aim bearing.",
          ],
          [
            "RESCUE SCORE",
            "Rescue: 20. Warship: 5. Mine: 1 for the first four from each Pulsar; later mines give no points. Rescue chains add up to ×1.75. Damage and lost crystals break the chain. Replacement groups reduce rank.",
          ],
        ],
      });
    }
    confirm(title, text, label, fn) {
      return this._show("confirmation", {
        kicker: "CONFIRM FLIGHT ORDER",
        title,
        text,
        actions: [
          ["Keep flying", () => this.shell.back()],
          [
            label,
            () => {
              this.hide();
              fn();
            },
          ],
        ],
      });
    }
    showDev(group) {
      this._syncDev();
      const online = this._isHub();
      if (group)
        return this._show(`devBalance${group}`, {
          kicker: online ? "READ-ONLY SHARED-WORLD DIAGNOSTICS" : "LIVE BALANCE",
          title: `${group} variables`,
          text: online
            ? "Mutation is disabled during AI Hub sessions. All players share the authoritative rules."
            : "Changes affect the current world immediately and mark this flight as a developer run.",
          rows: CONFIG.filter((x) => x[0] === group).map((x) => `dev_${x[1]}`),
          actions: [
            [
              "Reset shipped defaults",
              () => {
                if (online) return;
                this._emit("devReset");
                this._syncDev();
                this.shell.show(`devBalance${group}`);
              },
            ],
            ["Back", () => this.shell.back()],
          ],
        });
      const world = this._world();
      this._devSeed = world && Number.isFinite(world.seed) ? world.seed >>> 0 : 1;
      return this._show("dev", {
        kicker: online ? "READ-ONLY · AI HUB OWNS THIS ROUND" : "DEVELOPER FLIGHT DECK",
        title: "Developer tools",
        text: online
          ? "Shared diagnostics are available. Mutation, spawns and time scale are disabled for session participants."
          : "These tools use the live mission systems. Modified flights do not replace ordinary records or checkpoints.",
        rows: [
          "fwrDevInvulnerable",
          "fwrDevCollision",
          "fwrDevOwnership",
          "fwrDevTimeScale",
          "fwrDevSector",
          "fwrDevSpawn",
        ],
        actions: [
          ["Flight variables", () => this.showDev("Flight")],
          ["Combat variables", () => this.showDev("Combat")],
          ["Threat variables", () => this.showDev("Threat")],
          [
            "Load selected sector",
            () => {
              if (!online) this._emit("devSector", this.game.settings.fwrDevSector);
            },
          ],
          [
            "Restart from seed",
            () => {
              if (!online) this._emit("devSeed", this._devSeed);
            },
          ],
          [
            "Refill hyperspace energy",
            () => {
              if (!online) this._emit("devRefill");
            },
          ],
          [
            "Spawn selected entity",
            () => {
              if (!online) this._emit("devSpawn", this.game.settings.fwrDevSpawn);
            },
          ],
          [
            "Advance one simulation step",
            () => {
              if (!online) this._emit("devStep");
              this._updateDiagnostics();
            },
          ],
          [
            "Reset shipped defaults",
            () => {
              if (!online) {
                this._emit("devReset");
                this._syncDev();
                this.shell.show("dev");
              }
            },
          ],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    _summary(world) {
      const rescued = Array.isArray(world.rescued)
        ? world.rescued.length
        : typeof world.rescued === "number"
          ? world.rescued
          : world.ledger?.rescued
            ? world.ledger.rescued.length
            : world.rescuedIds
              ? world.rescuedIds.length
              : 0;
      const lost = Array.isArray(world.lost)
        ? world.lost.length
        : typeof world.lost === "number"
          ? world.lost
          : world.ledger?.lost
            ? world.ledger.lost.length
            : world.lostIds
              ? world.lostIds.length
              : 0;
      return { rescued, lost };
    }
    showResults(world) {
      this.context = "results";
      const n = this._summary(world),
        mode = world.mode || "operation";
      const rank =
        world.outcome?.rank ||
        world.rank ||
        (n.lost === 0 && n.rescued >= 10
          ? "RESCUE ACE"
          : n.rescued >= 7
            ? "FLIGHT CAPTAIN"
            : "SAFE RETURN");
      const actions = this._isHub()
        ? []
        : [
            ["Fly again", () => this._emit("play")],
            ["Evasion challenge", () => this._emit("evasion")],
            ["Return to title", () => this._emit("title")],
          ];
      return this._replace("results", {
        kicker: mode === "evasion" ? "EVASION COMPLETE" : "OPERATION COMPLETE",
        title: "You brought them home.",
        emblem: "✦",
        back: () => {
          if (!this._isHub()) this._emit("title");
        },
        text: n.lost
          ? "The rescued are safe. We remember those who did not return."
          : "Every signal answered. Every life matters.",
        stats: [
          [n.rescued, "RESCUED"],
          [n.lost, "LOST"],
          [world.score || 0, "TEAM SCORE"],
          [this.store.best(mode), "BEST SCORE"],
        ],
        sections: [
          [
            rank,
            "Rank reflects rescues, losses, replacement deployments and score. Four quick rescues build the chain through ×1, ×1.25, ×1.5 and ×1.75. Damage or a lost crystal breaks it; replacement rescues award 20 points and reduce rank.",
          ],
        ],
        actions,
      });
    }
    showFailure(world) {
      this.context = "failure";
      return this._replace("failure", {
        kicker: "SIGNAL LOST",
        title: "Hull integrity failed.",
        back: () => {
          if (!this._isHub()) this._emit("title");
        },
        text: "The operation can continue from the last evacuation beacon.",
        stats: [
          [world.score || 0, "SCORE"],
          [this._summary(world).rescued, "RESCUED"],
        ],
        actions: this._isHub()
          ? []
          : [
              ["Retry checkpoint", () => this._emit("retry")],
              ["Restart operation", () => this._emit("restart")],
              ["Return to title", () => this._emit("title")],
            ],
      });
    }
    showAbout(page = 0) {
      const report = this.o.report || F.REPORT || {},
        source = report.sourceInformation || {};
      const pages = [
        {
          title: "Source Information",
          kicker: "ABOUT / CREDITS · 1",
          sections: [
            ["ORIGINAL INSPIRATION", `${source.source || "unknown"} · ${source.date || "unknown"}`],
            [
              "THE GAME",
              `${source.genre || "unknown"} · ${source.perspective || "unknown"}\nPlan: ${source.plan || "unknown"}`,
            ],
            [
              "TECH & ART",
              `${source.tech || "unknown"}\n${source.artDirection || "unknown"}\n${source.animation || "unknown"}`,
            ],
          ],
        },
        {
          title: "Source Information",
          kicker: "ABOUT / CREDITS · 2",
          sections: [
            ["SOUND & ONLINE", `${source.audio || "unknown"}\n${source.online || "unknown"}`],
            ["RESEARCH", source.research || "unknown"],
            ["TESTING", source.testing || "unknown"],
            [
              "BUILD",
              `${source.environment || "unknown"}\n${source.model || "unknown"}\nUsage: ${source.usage || "added on import"}`,
            ],
          ],
        },
        ...["testingFeedback", "engineFeedback", "promptFeedback"].flatMap((key, group) => {
          const vals = report[key] || [],
            questions = FEEDBACK_QUESTIONS[key],
            name = ["Testing Feedback", "Engine Feedback", "Prompt Feedback"][group];
          const chunks = [];
          for (let i = 0; i < questions.length; i += 2)
            chunks.push({
              title: name,
              kicker: `ABOUT / CREDITS · ${chunks.length + 1}`,
              sections: questions
                .slice(i, i + 2)
                .map((q, j) => [q.toUpperCase(), String(vals[i + j] || "unknown")]),
            });
          return chunks;
        }),
      ];
      page = (page + pages.length) % pages.length;
      const spec = pages[page];
      return this._show("about", {
        ...spec,
        kicker: `${spec.kicker} · PAGE ${page + 1}/${pages.length}`,
        actions: [
          ["Next page", () => this.showAbout(page + 1)],
          ["Previous page", () => this.showAbout(page - 1)],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    _buildMenuButton() {
      if (typeof document === "undefined" || this.game.headless) return;
      this.menuButton = document.createElement("button");
      const b = this.menuButton;
      b.className = "fwr-menu-button";
      b.textContent = "Ⅱ";
      b.setAttribute("aria-label", "Pause / flight deck");
      b.hidden = true;
      b.onclick = () => {
        if (this.o.onAction) this._emit("pause");
      };
      document.body.appendChild(b);
    }
    _decorate() {
      const root = this.shell.root;
      if (!root) return;
      root.dataset.screen = this.shell.screen || "game";
      const online = this._isHub(),
        screen = this.shell.screen;
      if (screen === "dev" && !root.querySelector("[data-fwr-seed]")) {
        const panel = root.querySelector(".esh-mod");
        if (panel) {
          const row = document.createElement("div");
          row.className = "esh-row fwr-seed-row";
          const label = document.createElement("label");
          label.textContent = "Deterministic seed";
          label.htmlFor = "fwr-seed";
          const input = document.createElement("input");
          input.type = "number";
          input.min = "1";
          input.max = "4294967295";
          input.step = "1";
          input.id = "fwr-seed";
          input.dataset.fwrSeed = "true";
          input.value = this._devSeed;
          input.setAttribute("aria-label", "Deterministic seed");
          input.oninput = () => {
            const n = Number(input.value);
            if (Number.isInteger(n)) this._devSeed = clamp(n, 1, 4294967295);
          };
          row.append(label, input);
          panel.insertBefore(row, panel.querySelector(".esh-row"));
          const diag = document.createElement("pre");
          diag.className = "fwr-dev-diagnostics";
          diag.setAttribute("aria-label", "Live mission diagnostics");
          panel.insertBefore(diag, row);
          this._updateDiagnostics();
        }
      }
      if (online && screen?.startsWith("dev")) {
        for (const e of root.querySelectorAll("input, button")) {
          const text = e.textContent || "",
            label = e.getAttribute("aria-label") || "";
          const safe =
            /Back|Close|Flight variables|Combat variables|Threat variables|Collision overlay|Mine ownership/i.test(
              text + label,
            );
          if (!safe) e.disabled = true;
        }
      }
      for (const p of root.querySelectorAll(".esh-m"))
        if (p.textContent.includes("\n")) p.style.whiteSpace = "pre-line";
    }
    _updateDiagnostics() {
      const root = this.shell.root,
        box = root?.querySelector(".fwr-dev-diagnostics");
      if (!box) return;
      const w = this._world() || {},
        d = this.o.getDevState ? this.o.getDevState() : {},
        s = w.ship || {};
      const objective =
        typeof w.objective === "string"
          ? w.objective
          : (w.objective && (w.objective.text || w.objective.title)) || "unknown";
      const events = (d.events || w.events || [])
        .slice(-4)
        .map((e) =>
          typeof e === "string"
            ? e
            : `${e.id === undefined ? "" : `#${e.id} `}${e.type || "event"}${e.text ? `: ${e.text}` : ""}`,
        )
        .join("\n");
      box.textContent = `SEED ${w.seed === undefined ? "unknown" : w.seed} · ${w.mode || "operation"} · TICK ${w.tick || 0}\n${w.sector || "opening"} / ${w.phase || "flight"} · HULL ${s.hull === undefined ? "?" : s.hull} · ENERGY ${Math.round(s.energy || 0)}\nOBJECTIVE ${objective}\nROLES ${d.roles || (this.input?.coOp ? (this.input.swapped ? "P2 pilot / P1 navigator" : "P1 pilot / P2 navigator") : "solo")}\n${events}`;
    }
    update(dt = 0) {
      void dt;
      if (!this.screen && this.context === "pause") {
        this.context = "play";
        if (this.input) this.input.clear();
        this._emit("resume");
      }
      if (this.menuButton)
        this.menuButton.hidden =
          !!this.screen ||
          this.context === "title" ||
          this.context === "results" ||
          this.context === "failure";
      const real = this.game.real || 0;
      if (real - this._lastDiagnostic > 0.25) {
        this._lastDiagnostic = real;
        this._updateDiagnostics();
      }
    }
    hide() {
      this.shell.hide();
      this.context = "play";
      if (this.input) this.input.clear();
      if (this.menuButton) this.menuButton.hidden = false;
      return this;
    }
    toast(title, text, seconds = 4) {
      this.shell.toast(title, text, seconds);
      return this;
    }
    dispose() {
      this.shell.dispose();
      if (this.menuButton) this.menuButton.remove();
    }
    _installStyle() {
      if (
        typeof document === "undefined" ||
        this.game.headless ||
        document.getElementById("fwr-shell-style")
      )
        return;
      const style = document.createElement("style");
      style.id = "fwr-shell-style";
      style.textContent = `
.fwr-shell{--paper:#0a1727;--accent:#f4bd77;--ink:#e7f2f1;letter-spacing:.025em}.fwr-shell .esh-sh{background:linear-gradient(90deg,rgba(3,9,19,.91),rgba(3,9,19,.66) 50%,rgba(3,9,19,.22));padding:24px 32px}.fwr-shell .esh-ttl{align-items:center;justify-content:flex-start;text-align:left;padding-left:6vw}.fwr-shell .esh-ttl>div{max-width:430px;position:relative}.fwr-shell .esh-ttl>div:before{content:'';position:absolute;left:-16px;top:4px;width:3px;height:62px;background:#f4bd77;box-shadow:0 0 12px #f4bd7755}.fwr-shell h1{white-space:pre-line;font-size:46px;line-height:.98;font-weight:900;letter-spacing:-.045em;color:#fff4d9;max-width:440px;text-shadow:0 3px 0 #0a1323;margin:12px 0 18px}.fwr-shell .esh-k{color:#f4bd77;font-size:9px;letter-spacing:.17em;font-weight:800}.fwr-shell .esh-sub{font-size:13px;color:#aabec9;line-height:1.5;max-width:300px;margin-bottom:18px}.fwr-shell .esh-btns{display:flex;flex-direction:column;gap:6px;max-width:300px;margin-top:15px}.fwr-shell button{font-size:13px;min-height:31px;padding:8px 12px;border-radius:2px;border:1px solid #41576c;background:rgba(10,27,43,.84);color:#dbe9ee;text-align:left;letter-spacing:.025em}.fwr-shell button.pri{background:#f1bd78;color:#122334;border-color:#ffe2b1;font-weight:900;box-shadow:0 3px 0 #aa753e}.fwr-shell button:focus-visible,.fwr-shell button:focus,.fwr-shell input:focus{outline:2px solid #a2fff0;outline-offset:3px;box-shadow:0 0 15px #7affdd33}.fwr-shell button:hover{border-color:#89c8ce}.fwr-shell button:disabled{opacity:.36}.fwr-shell .esh-mod{border:1px solid #456071;border-top:3px solid #f4bd77;border-radius:3px;background:linear-gradient(145deg,#101f31f7,#07121ff7);box-shadow:0 10px 50px #0008;max-height:100%;padding:20px 25px;max-width:500px;overflow:auto}.fwr-shell h2{font-size:26px;line-height:1.12;letter-spacing:-.025em;margin:8px 0 12px;color:#fff1d9}.fwr-shell .esh-m{font-size:12px;line-height:1.55;color:#b3c7d0;max-width:440px}.fwr-shell .esh-sec{margin-top:15px;margin-bottom:5px}.fwr-shell .esh-row{font-size:12px;min-height:40px;gap:16px;border-color:#263d50}.fwr-shell .esh-row button{font-size:11px;min-height:27px;padding:5px 9px;text-align:center}.fwr-shell .esh-row input[type=range]{accent-color:#f4bd77;width:125px}.fwr-shell .esh-ctl output{font-size:10px;color:#a4e6e6;min-width:35px}.fwr-shell .esh-tags{justify-content:flex-start;gap:6px;margin:16px 0}.fwr-shell .esh-tags span{font-size:8px;letter-spacing:.12em;border-color:#375165;color:#86b7c4;padding:5px 7px}.fwr-shell .esh-stats{display:flex;flex-wrap:wrap;gap:18px;margin:18px 0}.fwr-shell .esh-stats b{color:#fff0ce;font-size:30px}.fwr-shell .esh-stats small{font-size:8px;color:#97c8cf}.fwr-shell .esh-bind{font-size:11px;gap:6px}.fwr-shell .esh-bind button{font-size:10px;padding:6px}.fwr-shell .esh-nav{min-width:30px;min-height:30px;padding:6px;text-align:center}.fwr-shell .esh-toast{border-color:#6da49e;background:#0b2034ed;max-width:320px}.fwr-shell .esh-toast b{color:#f5d397}.fwr-shell .esh-toast p{font-size:11px}.fwr-dev-diagnostics{font:9px/1.6 monospace;white-space:pre-wrap;color:#91c7cb;border:1px solid #2a4458;background:#05101d;padding:10px;max-width:435px}.fwr-seed-row input{width:135px;font:12px monospace;color:#e6f6f5;background:#0c2032;border:1px solid #537288;padding:7px}.fwr-menu-button{position:fixed;z-index:18;right:max(20px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));width:46px;height:42px;color:#d9f6f0;background:#071b2bb8;border:1px solid #7babae66;border-radius:5px;font:800 20px system-ui;touch-action:none}.fwr-menu-button[hidden],.fwr-touch-warp[hidden]{display:none!important}.fwr-shell[data-screen=title] .esh-ttl .esh-m{font-size:10px;max-width:330px}.fwr-shell .esh-emb{font-size:38px;color:#9af5de}
@media(max-width:740px){.fwr-shell .esh-sh{padding:12px 16px}.fwr-shell .esh-ttl{padding-left:6vw;align-items:center}.fwr-shell h1{font-size:37px}.fwr-shell .esh-ttl>div{max-width:350px}.fwr-shell .esh-mod{padding:16px;max-height:100%}.fwr-shell .esh-row{gap:10px}.fwr-shell .esh-ctl input[type=range]{width:96px}.fwr-shell .esh-row{font-size:12px}.fwr-shell .esh-tags{margin:10px 0}.fwr-shell .esh-ttl .esh-sub{font-size:12px}.fwr-shell .esh-ttl .esh-btns{gap:5px;margin-top:10px}.fwr-shell .esh-ttl button{min-height:29px;padding:7px 10px;font-size:12px}.fwr-shell .esh-ttl .esh-k{font-size:8px}.fwr-shell .esh-bind{font-size:9px}.fwr-shell .esh-bind button{font-size:9px;padding:5px}}@media(max-height:500px){.fwr-shell h1{font-size:34px}.fwr-shell .esh-ttl{align-items:flex-start;padding-top:16px}.fwr-shell .esh-sub{display:none}.fwr-shell .esh-ttl .esh-btns{gap:3px;margin-top:8px}.fwr-shell .esh-ttl button{min-height:24px;padding:5px 10px}.fwr-shell .esh-ttl .esh-tags{margin:9px 0}.fwr-shell .esh-ttl footer{display:none}}`;
      document.head.appendChild(style);
    }
  }
  F.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  F.Store = Store;
  F.UI = UI;
  F.CONFIG_UI = CONFIG;
})(globalThis.FWR);
