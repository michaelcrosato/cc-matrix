(() => {
  const G = globalThis.Edge,
    E = My3D2dge;
  class Dev {
    constructor(app) {
      this.app = app;
      this.freeze = false;
      this.scale = 1;
      this.overlays = false;
      this.cursor = { c: 0, r: 0 };
      this.encounter = G.encounterOf(0);
      this.material = 0;
      const S = app.game.settings;
      for (const [k, label, min, max, step, unit] of G.TUNING)
        S.define({
          key: "dev_" + k,
          label,
          type: "slider",
          min,
          max,
          step,
          unit,
          value: G.DEFAULTS[k],
          group: "Developer",
          apply: (_, v) => this.tune(k, v),
        });
      for (const [key, label, value, min, max, step] of [
        ["editCol", "Cell column", 0, 0, 15, 1],
        ["editRow", "Cell row", 0, 0, 19, 1],
        ["editRefuge", "Refuge x", 238, 90, 350, 2],
        ["editWidth", "Refuge width", 58, 24, 100, 2],
        ["editAmplitude", "Plate travel", 0, 0, 48, 1],
        ["editPeriod", "Plate period", 10, 3, 30, 1],
      ])
        S.define({ key, label, value, min, max, step, type: "slider", group: "Authoring", apply: () => {} });
    }
    tune(key, value) {
      const w = this.app.world;
      if (!w || this.app.online.info) return;
      w.queueTuning({ ...w.tuning, ...w.pendingTuning, [key]: value });
    }
    mark() {
      if (this.app.world) this.app.world.practice = true;
    }
    show() {
      if (this.app.online.info) {
        this.app.ui.show("diagnostics", {
          title: "Session diagnostics",
          text: () =>
            `Tick ${this.app.world.tick} · ${this.app.world.core.mode}\nMessages sent ${this.app.online.stats.sent} · maximum ${this.app.online.stats.maxBytes} bytes`,
          actions: [["Back", () => this.app.ui.back()]],
        });
        return;
      }
      this.app.ui.show("dev", {
        kicker: "PRACTICE TOOLS",
        title: "The signal workbench",
        text: () => `Seed ${this.app.world?.seed ?? 41739} · altered runs do not set campaign records.`,
        actions: [
          [
            () => `Invulnerability: ${this.app.world.cheats.invulnerable ? "ON" : "OFF"}`,
            () => {
              this.mark();
              this.app.world.cheats.invulnerable = !this.app.world.cheats.invulnerable;
              this.show();
            },
          ],
          [
            () => `Infinite charge: ${this.app.world.cheats.infinite ? "ON" : "OFF"}`,
            () => {
              this.mark();
              this.app.world.cheats.infinite = !this.app.world.cheats.infinite;
              this.show();
            },
          ],
          [
            () => `Collision & warning overlays: ${this.overlays ? "ON" : "OFF"}`,
            () => {
              this.overlays = !this.overlays;
              this.show();
            },
          ],
          ["Live balance", () => this.balance()],
          ["Encounters & phases", () => this.encounters()],
          ["Shield layout editor", () => this.editor()],
          ["Seed & presets", () => this.presets()],
          [
            () => `Freeze: ${this.freeze ? "ON" : "OFF"}`,
            () => {
              this.freeze = !this.freeze;
              this.mark();
              this.show();
            },
          ],
          [
            "Step one tick",
            () => {
              this.mark();
              this.app.world.step(this.app.world.players.map(() => G.blankAction()));
              this.app.syncPresentation(0);
              this.show();
            },
          ],
          [
            () => `Time scale: ${this.scale}×`,
            () => {
              this.scale = [0.25, 0.5, 1, 2, 4][([0.25, 0.5, 1, 2, 4].indexOf(this.scale) + 1) % 5];
              this.mark();
              this.show();
            },
          ],
          [
            "Restart encounter",
            () => {
              this.mark();
              this.app.world.loadSector(this.app.world.sector);
              this.app.art.reset();
              this.app.ui.hide();
            },
          ],
          [
            "Spawn guided threat",
            () => {
              this.mark();
              this.app.world.spawnPursuer();
              this.app.ui.toast("Threat added");
            },
          ],
          ["Back", () => this.app.ui.back()],
        ].map(([label, fn]) => ({ label: typeof label === "function" ? label() : label, fn })),
      });
    }
    balance() {
      this.app.ui.show("balance", {
        kicker: "LIVE BALANCE / FIXED-STEP APPLY",
        title: "Tune the siege",
        rows: G.TUNING.map(([k]) => "dev_" + k),
        actions: [
          [
            "Reset to defaults",
            () => {
              for (const [k] of G.TUNING) this.app.game.settings.set("dev_" + k, G.DEFAULTS[k]);
              this.app.world?.queueTuning(G.DEFAULTS);
              this.balance();
            },
          ],
          [
            "Apply & return to play",
            () => {
              this.app.world?.applyTuning();
              this.app.ui.hide();
            },
          ],
          ["Back", () => this.app.ui.back()],
        ],
      });
    }
    encounters() {
      this.app.ui.show("encounters", {
        title: "Encounter selector",
        actions: [
          ...G.SECTORS.map((s, i) => [`${i + 1} / ${s.name}`, () => this.jump(i, 0)]),
          ["Last Listener / exposed heart", () => this.jump(2, 1)],
          ["Last Listener / airborne heart", () => this.jump(2, 2)],
          [
            "Preview a Swirl",
            () => {
              this.mark();
              this.app.world.startWind();
              this.app.ui.hide();
            },
          ],
          ["Back", () => this.app.ui.back()],
        ],
      });
    }
    jump(sector, phase) {
      const w = this.app.world;
      this.mark();
      w.loadSector(sector);
      w.phase = phase;
      w.core.hits = G.SECTORS[sector].hits - phase;
      w.core.timer = 6;
      if (phase) for (const c of w.cells) if (phase === 2 || c.plate === 0) c.alive = false;
      for (const p of w.players) {
        p.charge = w.tuning.charge;
        p.inv = 3;
      }
      this.app.art.reset();
      this.app.controls.clear();
      this.app.ui.hide();
    }
    editor() {
      const a = this.app,
        S = a.game.settings;
      a.ui.show("editor", {
        kicker: "SCHEMA 1 / ENCOUNTER AUTHORING",
        title: "Shield loom",
        text: "Move the cell cursor with the two sliders; paint or erase. A pointer can paint the grid directly. Reflective cells have a diamond.",
        rows: ["editCol", "editRow", "editRefuge", "editWidth", "editAmplitude", "editPeriod"],
        actions: [
          [
            this.material ? "Material: DIAMOND" : "Material: CELL",
            () => {
              this.material = 1 - this.material;
              this.editor();
            },
          ],
          [
            "Paint cursor cell",
            () => {
              this.paint(S.editCol, S.editRow, false);
              this.editor();
            },
          ],
          [
            "Erase cursor cell",
            () => {
              this.paint(S.editCol, S.editRow, true);
              this.editor();
            },
          ],
          [
            "Copy current sector",
            () => {
              this.encounter = G.encounterOf(a.world?.sector || 0);
              S.set("editRefuge", this.encounter.refuge.x);
              S.set("editWidth", this.encounter.refuge.w);
              S.set("editAmplitude", this.encounter.plates[0].amplitude);
              S.set("editPeriod", this.encounter.plates[0].period);
              this.editor();
            },
          ],
          ["Play edited encounter", () => this.preview()],
          ["JSON import / export", () => this.jsonScreen()],
          [
            "Save preset",
            () => {
              E.store.set("edge:encounter", this.export());
              a.ui.toast("Encounter saved");
            },
          ],
          [
            "Load preset",
            () => {
              try {
                this.import(E.store.get("edge:encounter", null));
                this.editor();
              } catch (e) {
                a.ui.toast("Invalid preset", e.message);
              }
            },
          ],
          ["Back", () => a.ui.back()],
        ],
      });
      if (!a.ui.root) return;
      const box = a.ui._els.scr.querySelector(".esh-mod"),
        cv = document.createElement("canvas");
      cv.className = "loom";
      cv.width = 384;
      cv.height = 240;
      cv.setAttribute("aria-label", "Shield cell painting grid");
      box.insertBefore(cv, box.querySelector(".esh-btns"));
      const g = cv.getContext("2d");
      g.imageSmoothingEnabled = false;
      const draw = () => {
        g.clearRect(0, 0, 384, 240);
        E.px.rect(g, 0, 0, 384, 240, "#071925");
        for (let r = 0; r < 20; r++)
          for (let c = 0; c < 16; c++) {
            const cell = this.encounter.cells.find(
                (v) => Math.abs(v.x - (336 + c * 12)) < 1 && Math.abs(v.y - (20 + r * 12)) < 1,
              ),
              x = c * 24,
              y = r * 12;
            E.px.rect(g, x + 1, y + 1, 22, 10, cell ? (cell.material ? "#d1aeff" : "#bf8059") : "#17313d");
            if (cell?.material)
              E.px.poly(
                g,
                [
                  [x + 12, y + 2],
                  [x + 16, y + 6],
                  [x + 12, y + 10],
                  [x + 8, y + 6],
                ],
                "#fff4ff",
              );
          }
        E.px.rect(g, S.editCol * 24, S.editRow * 12, 24, 1, "#b8ffda");
        E.px.rect(g, S.editCol * 24, S.editRow * 12, 1, 12, "#b8ffda");
      };
      draw();
      let held = false;
      const paint = (e) => {
        const b = cv.getBoundingClientRect(),
          c = G.clamp(Math.floor(((e.clientX - b.left) / b.width) * 16), 0, 15),
          r = G.clamp(Math.floor(((e.clientY - b.top) / b.height) * 20), 0, 19);
        this.paint(c, r, e.button === 2 || e.shiftKey);
        draw();
      };
      cv.oncontextmenu = (e) => e.preventDefault();
      cv.onpointerdown = (e) => {
        held = true;
        cv.setPointerCapture(e.pointerId);
        paint(e);
      };
      cv.onpointermove = (e) => {
        if (held) paint(e);
      };
      cv.onpointerup = cv.onpointercancel = () => {
        held = false;
      };
    }
    paint(c, r, erase) {
      const x = 336 + c * 12,
        y = 20 + r * 12;
      this.encounter.cells = this.encounter.cells.filter(
        (v) => !(Math.abs(v.x - x) < 1 && Math.abs(v.y - y) < 1),
      );
      if (!erase)
        this.encounter.cells.push({ id: `edit:${c}:${r}`, x, y, material: this.material, plate: 0 });
      this.mark();
    }
    export() {
      const S = this.app.game.settings;
      return G.validateEncounter({
        ...this.encounter,
        refuge: { x: S.editRefuge, w: S.editWidth },
        plates: this.encounter.plates.map((p, i) =>
          i ? p : { amplitude: S.editAmplitude, period: S.editPeriod, phase: 0 },
        ),
      });
    }
    import(data) {
      const valid = G.validateEncounter(typeof data === "string" ? JSON.parse(data) : data);
      this.encounter = valid;
      const S = this.app.game.settings;
      S.set("editRefuge", valid.refuge.x);
      S.set("editWidth", valid.refuge.w);
      S.set("editAmplitude", valid.plates[0].amplitude);
      S.set("editPeriod", valid.plates[0].period);
      this.mark();
      return valid;
    }
    preview() {
      try {
        const encounter = this.export();
        this.app.startRun({ sector: encounter.sector, practice: true, encounter });
        this.app.ui.hide();
      } catch (e) {
        this.app.ui.toast("Cannot preview", e.message);
      }
    }
    jsonScreen() {
      const a = this.app;
      a.ui.show("json", {
        title: "Encounter JSON",
        text: "Copy the JSON to keep a portable encounter. Paste schema 1 JSON and import to validate it.",
        actions: [
          [
            "Import text",
            () => {
              try {
                this.import(a.ui.root.querySelector("textarea").value);
                a.ui.toast("Validated & imported");
                this.editor();
              } catch (e) {
                a.ui.toast("Import rejected", e.message);
              }
            },
          ],
          [
            "Download JSON",
            () => {
              const blob = new Blob([JSON.stringify(this.export(), null, 2)], { type: "application/json" }),
                url = URL.createObjectURL(blob),
                link = document.createElement("a");
              link.href = url;
              link.download = "yars-on-the-edge-encounter.json";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
          ],
          ["Back", () => a.ui.back()],
        ],
      });
      if (a.ui.root) {
        const textarea = document.createElement("textarea");
        textarea.className = "encounter-json";
        textarea.setAttribute("aria-label", "Encounter JSON");
        textarea.value = JSON.stringify(this.export(), null, 2);
        const box = a.ui._els.scr.querySelector(".esh-mod");
        box.insertBefore(textarea, box.querySelector(".esh-btns"));
      }
    }
    presets() {
      const a = this.app;
      a.ui.show("seed", {
        title: "Seed & replay",
        text: "A seed fixes combat choices. Changing it starts a practice run. Use +1 or −1 on a controller, or type the seed.",
        actions: [
          ["Seed −1", () => this.seed((a.world.seed - 1) >>> 0)],
          ["Seed +1", () => this.seed((a.world.seed + 1) >>> 0)],
          [
            "Load typed seed",
            () => {
              const n = Number(a.ui.root?.querySelector("input.seed")?.value);
              if (Number.isSafeInteger(n) && n >= 0) this.seed(n >>> 0);
              else a.ui.toast("Use a whole number from 0 to 4294967295.");
            },
          ],
          ["Back", () => a.ui.back()],
        ],
      });
      if (a.ui.root) {
        const input = document.createElement("input");
        input.className = "seed";
        input.type = "number";
        input.min = 0;
        input.max = 4294967295;
        input.value = a.world.seed;
        input.setAttribute("aria-label", "Combat seed");
        a.ui._els.scr.querySelector(".esh-mod").appendChild(input);
      }
    }
    seed(seed) {
      const sector = this.app.world.sector;
      this.app.startRun({ seed, sector, practice: true });
      this.app.ui.hide();
    }
  }
  G.Dev = Dev;
})();
