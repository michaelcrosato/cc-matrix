(function (M) {
  "use strict";
  const { E } = M;
  class Screens {
    constructor(app) {
      this.app = app;
      const g = app.game;
      this.shell = new E.Shell(g, {
        tv: true,
        theme: {
          ink: "#f8efd9",
          paper: "rgba(31,23,43,.97)",
          accent: "#f5d695",
          muted: "#c2afcf",
          line: "rgba(196,165,226,.25)",
          font: "Trebuchet MS, system-ui, sans-serif",
          titleFont: "Trebuchet MS, system-ui, sans-serif",
        },
        screens: {
          pause: {
            kicker: () =>
              app.net.active
                ? "LOCAL MENU / TEAM PLAY CONTINUES"
                : app.screen === "editor"
                  ? "MAZE WORKSHOP"
                  : "TAKE A BREATHER",
            text: () => (app.net.active ? "Your team keeps munching while this menu is open." : ""),
          },
          help: {
            title: "How to munch",
            text: "Meet your moving lunch at a junction. Star snacks turn hungry predators into a five / ten / twenty point feast.",
          },
        },
      });
      app.ui = this.shell;
      for (const [key, label, min, max, step, unit] of M.TUNING)
        g.settings.define({
          key: "dev_" + key,
          group: "Tuning",
          label,
          value: M.DEFAULTS[key],
          min,
          max,
          step,
          unit,
          apply: (_, value) => {
            if (app.devOpen && app.world && !app.net.active) app.world.setTuning(key, value);
          },
        });
      g.settings.define({
        key: "dev_stage",
        group: "Tuning",
        label: "Restart at stage",
        value: 0,
        options: M.STAGES.map((_, i) => [i, M.stage(i).name]),
      });
      g.settings.define({
        key: "dev_seed",
        group: "Tuning",
        label: "Restart seed",
        value: 4242,
        min: 1,
        max: 999999,
        step: 1,
      });
      this.devPage = 0;
      this.aboutPage = 0;
    }
    show(name, spec) {
      this.shell.show(name, spec);
      this.app.markActivity();
    }
    close() {
      this.shell.hide();
      this.app.game.resume();
      this.app.game.input.consumeAll();
      this.app.clearIntents();
    }
    title() {
      const a = this.app,
        g = a.game;
      this.show("title", {
        kicker: "A LITTLE ELECTRONIC MISCHIEF",
        name: "K.C. MUNCHKIN\nMIX-UP",
        subtitle: "Your lunch has other plans.",
        actions: [
          ["Play solo", () => a.startRun({ seats: [0] })],
          ["Play together", () => this.coop()],
          ["Remix a maze", () => this.remix()],
          ["Maze workshop", () => a.openEditor()],
          ["How to play", () => this.help(0)],
          ["Settings & credits", () => this.more()],
        ],
        meta: ["12 RUNAWAYS", "3 HUNGRY RIVALS", "1–2 PLAYERS"],
        footer: () =>
          `${g.input.label("confirm")} choose  ·  ${g.input.label("up")} / ${g.input.label("down")} browse  ·  Best ${a.profile.data.best}`,
        back: () => {},
      });
    }
    more() {
      this.show("more", {
        kicker: "THE CABINET",
        title: "Make yourself at home",
        actions: [
          ["Settings", () => this.app.game.menu("settings")],
          ["Controls & rebinding", () => this.app.game.menu("controls")],
          ["About & credits", () => this.about(0)],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    coop() {
      const a = this.app;
      let pads = [];
      try {
        pads = Array.from(navigator.getGamepads()).filter(
          (p) => p?.connected !== false && p?.mapping === "standard",
        );
      } catch {}
      this.show("coop", {
        kicker: "SHARED LUNCH / SHARED LIVES",
        title: "Two grins are better",
        text: "Choose your seats. Heroes pass through each other. Every star snack helps both of you.",
        sections: [
          ["Keyboard duo", "P1: WASD + F. P2: arrows + period. Five lives and one team score."],
          [
            "Across devices",
            "Launch this game from AI Hub for shared-world co-op. Hub supplies the connection and round clock.",
          ],
        ],
        actions: [
          ["Two on one keyboard", () => a.startRun({ seats: [0, 1], devices: "keys" })],
          {
            label: "Keyboard + controller",
            disabled: pads.length < 1,
            fn: () => a.startRun({ seats: [0, 1], devices: "mixed", pads: [pads[0].index] }),
          },
          {
            label: "Two controllers",
            disabled: pads.length < 2,
            fn: () =>
              a.startRun({
                seats: [0, 1],
                devices: "pads",
                pads: pads.slice(0, 2).map((p) => p.index),
              }),
          },
          [
            "Refresh controllers",
            () => {
              this.shell.back();
              this.coop();
            },
          ],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    inputField(label, value, options = {}) {
      if (!this.shell.root) return null;
      const box = this.shell.root.querySelector(".esh-sh>div"),
        wrap = document.createElement("label");
      wrap.className = "mix-form";
      wrap.textContent = label;
      const field = document.createElement(options.area ? "textarea" : "input");
      if (!options.area) field.type = "text";
      field.value = value;
      field.maxLength = options.max || 40000;
      field.spellcheck = false;
      field.setAttribute("aria-label", label);
      if (options.readonly) field.readOnly = true;
      for (const ev of ["keydown", "keyup", "pointerdown"])
        field.addEventListener(ev, (e) => e.stopPropagation());
      wrap.appendChild(field);
      box.insertBefore(wrap, box.querySelector(".esh-btns"));
      return field;
    }
    remix() {
      const a = this.app;
      let seed = "4242",
        vanish = false,
        tunnels = true;
      const open = () => {
        this.show("remix", {
          kicker: "A LITTLE LUCK IN EVERY LOOP",
          title: "Remix your lunch",
          text: "The same seed serves the same maze and opening routes. All twelve snacks and all three predators are here.",
          actions: [
            [
              "Play this mix",
              () => {
                seed = field.value.trim() || "4242";
                a.startRun({ mode: "remix", seed, seats: [0], remixOptions: { vanish, tunnels } });
              },
            ],
            [
              "New seed",
              () => {
                const arr = new Uint32Array(1);
                crypto.getRandomValues(arr);
                field.value = String(arr[0] % 1000000);
              },
            ],
            [
              "Walls: " + (vanish ? "disappearing" : "visible"),
              () => {
                seed = field.value;
                vanish = !vanish;
                this.shell.back();
                open();
              },
            ],
            [
              "Tunnels: " + (tunnels ? "on" : "off"),
              () => {
                seed = field.value;
                tunnels = !tunnels;
                this.shell.back();
                open();
              },
            ],
            ["Back", () => this.shell.back()],
          ],
        });
        const field = this.inputField("Maze seed", seed, { max: 24 });
      };
      open();
    }
    help(page = 0) {
      const a = this.app,
        g = a.game,
        pages = [
          {
            title: "Lunch on the loose",
            sections: [
              [
                "Meet it. Munch it.",
                "Twelve little snacks run around each maze. Cut across a loop and meet them at a junction. The fewer left, the faster they scoot.",
              ],
              [
                "Bright bites back",
                "Four star snacks make all three predators edible for six seconds. Catch them for 5, 10, then 20 points. Stripes warn you before power ends.",
              ],
              [
                "One shared appetite",
                "Start with five team lives. A clear restores one. Catch the last snack to clear the board, even during a last-moment tangle.",
              ],
            ],
          },
          {
            title: "Tricks of the chew",
            sections: [
              [
                "Take the side door",
                "Striped tunnel mouths on the same row join together. Everyone can use them, so watch both ends.",
              ],
              [
                "Ride the rotating pen",
                "One door turns to the next side after a light sweep. Step inside, wait for your side, then leave. It is safe to wait inside.",
              ],
              [
                "Peek-a-chew",
                "Shy walls stay solid. They show at the start, every few seconds, and near bumps. Chirp reveals the whole maze without hurting anything.",
              ],
            ],
          },
          {
            title: "Every kind of grin",
            sections: [
              [
                "Steer",
                `${g.input.label("up")} / ${g.input.label("down")} / ${g.input.label("left")} / ${g.input.label("right")} or WASD / arrows. Turns buffer briefly; reversing responds at once.`,
              ],
              [
                "Chirp & pause",
                `${g.input.label("chirp")} reveals walls. ${g.input.label("pause")} opens the menu. Controller: left stick / D-pad, Cross to chirp, Options for the menu. Switch to Xbox glyphs in Settings.`,
              ],
              [
                "Touch",
                "Drag a thumb anywhere on the board to steer. A second finger can use the menu or the small Chirp button. Auto-chirp is on by default. Lift or cancel your thumb to stop.",
              ],
              [
                "Together",
                "Keyboard duo: WASD + F and arrows + period. Two pads or keyboard + pad have explicit seats. Controller loss safely pauses a local game.",
              ],
            ],
          },
        ];
      this.show("guide", {
        kicker: `HOW TO PLAY / ${page + 1} OF ${pages.length}`,
        ...pages[page],
        actions: [
          ...(page < pages.length - 1
            ? [
                [
                  "Next",
                  () => {
                    this.shell.back();
                    this.help(page + 1);
                  },
                ],
              ]
            : []),
          ...(page > 0
            ? [
                [
                  "Previous",
                  () => {
                    this.shell.back();
                    this.help(page - 1);
                  },
                ],
              ]
            : []),
          ["Back", () => this.shell.back()],
        ],
      });
    }
    developer(page = 0) {
      const a = this.app,
        w = a.world;
      if (!w) return;
      if (a.net.active) {
        this.show("dev-readonly", {
          kicker: "SESSION / READ ONLY",
          title: "World inspector",
          text: JSON.stringify(
            {
              tick: w.tick,
              revision: w.revision,
              stage: w.stageIndex + 1,
              food: w.remaining,
              score: w.score,
              lives: w.lives,
              gate: w.board.orientation,
              network: a.net.diagnostics,
            },
            null,
            2,
          ),
          actions: [
            ["Refresh", () => this.developer()],
            ["Back", () => this.shell.back()],
          ],
        });
        return;
      }
      if (!a.devOpen) {
        a.devOpen = true;
        w.assisted = true;
        for (const [key] of M.TUNING) {
          a.devOpen = false;
          a.game.settings.set("dev_" + key, w.tuning[key]);
          a.devOpen = true;
        }
      }
      this.devPage = page;
      const groups = [
        ["Movement & snacks", ["playerSpeed", "foodBase", "foodFinal"]],
        ["Hungry rivals & power", ["predatorSpeed", "reaction", "powerDuration"]],
        [
          "Machinery & safety",
          ["gateCadence", "chirpCooldown", "damageGrace", "lives", "lifeRestore"],
        ],
      ];
      const pages = groups.length + 1;
      const controls =
        page < 3 ? groups[page][1].map((k) => "dev_" + k) : ["dev_stage", "dev_seed"];
      const actions =
        page === 3
          ? [
              [
                "Restart at selected stage",
                () => {
                  a.replaceWorld({
                    stage: a.game.settings.dev_stage,
                    seed: a.game.settings.dev_seed,
                    tuning: { ...w.tuning },
                    assisted: true,
                    god: w.god,
                  });
                  this.inspector();
                },
              ],
              [
                "Advance one stage",
                () => {
                  if (w.stageIndex < 5) {
                    w.stageIndex++;
                    w.loadStage();
                    a.theatre.reset();
                    a.sound.lastEvent = 0;
                  }
                  this.inspector();
                },
              ],
              [
                "Single simulation step",
                () => {
                  w.step();
                  a.consumeEvents(w.events);
                  a.sound.events(w.events);
                  a.theatre.update(w, 1 / 120);
                  this.inspector();
                },
              ],
              ["State / events", () => this.inspector()],
            ]
          : [
              [
                "Next page",
                () => {
                  this.shell.back();
                  this.developer((page + 1) % pages);
                },
              ],
            ];
      this.show("developer", {
        kicker: `ASSISTED RUN / ${page + 1} OF ${pages}`,
        title: page < 3 ? groups[page][0] : "Run controls",
        text: "Live tuning applies on the next fixed step. Assisted runs never enter normal records.",
        rows: controls,
        actions: [
          ...actions,
          [
            "Invulnerability: " + (w.god ? "on" : "off"),
            () => {
              w.god = !w.god;
              this.shell.back();
              this.developer(page);
            },
          ],
          [
            "Reveal walls: " + (w.showWalls ? "on" : "off"),
            () => {
              w.showWalls = !w.showWalls;
              this.shell.back();
              this.developer(page);
            },
          ],
          [
            "Paths & hitboxes: " + (a.overlays ? "on" : "off"),
            () => {
              a.overlays = !a.overlays;
              this.shell.back();
              this.developer(page);
            },
          ],
          [
            "Reset all tuning",
            () => {
              for (const [key] of M.TUNING) a.game.settings.set("dev_" + key, M.DEFAULTS[key]);
              this.shell.back();
              this.developer(page);
            },
          ],
          ...(page === 3
            ? [
                [
                  "First page",
                  () => {
                    this.shell.back();
                    this.developer(0);
                  },
                ],
              ]
            : []),
          ["Back to pause", () => this.shell.back()],
        ],
      });
    }
    inspector() {
      const a = this.app,
        w = a.world,
        s = w.snapshot();
      this.show("inspector", {
        kicker: "ASSISTED / STATE IS READ ONLY HERE",
        title: "The world at a glance",
        text: `Tick ${s.tick} · stage ${s.stage + 1} · revision ${s.revision}\n${s.phase} · ${s.remaining} snacks · ${s.score} points · ${s.lives} lives\nGate ${s.gate} · power ${s.power.toFixed(2)}s · seed ${s.seed}\n${w.data.generation?.fallback ? "Generator used the validated fallback." : "Validated gameplay layout."}`,
        sections: [
          [
            "Latest events",
            s.events
              .slice(-6)
              .map(
                (e) => `#${e.id} ${e.type}${e.player !== undefined ? " / P" + (e.player + 1) : ""}`,
              )
              .join("\n") || "The board is ready.",
          ],
        ],
        actions: [
          ["Refresh", () => this.inspector()],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    workshop() {
      const a = this.app,
        e = a.editor;
      a.game.pause("menu");
      this.show("workshop-menu", {
        kicker: "YOUR OWN LITTLE MIX-UP",
        title: e.data.name,
        text: e.message,
        actions: [
          [
            "Playtest maze",
            () => {
              if (e.validate().ok) a.startRun({ mode: "custom", custom: e.data, seats: [0] });
              else {
                this.shell.toast("One little snag", e.message);
                this.close();
              }
            },
          ],
          [
            "Validate routes",
            () => {
              e.validate();
              this.shell.toast(e.errors.length ? "One little snag" : "Ready to munch", e.message);
              this.close();
            },
          ],
          ["Save / load slots", () => this.slots()],
          ["Rename maze", () => this.rename()],
          ["Export / import maze code", () => this.code()],
          ["Templates & clear", () => this.templates()],
          ["Editing help", () => this.editHelp()],
          ["Back to editing", () => this.close()],
          ["Return to title", () => a.showTitle()],
        ],
      });
    }
    toolPalette() {
      const a = this.app,
        e = a.editor;
      a.game.pause("menu");
      this.show("tool-palette", {
        kicker: "MAZE WORKSHOP",
        title: "Choose a little mischief",
        actions: e.tools
          .map((label, index) => [
            label,
            () => {
              e.tool = index;
              this.close();
              a.lastHUD = "";
              a.hud();
            },
          ])
          .concat([["Back to editing", () => this.close()]]),
      });
    }
    slots() {
      const a = this.app,
        e = a.editor,
        p = a.profile;
      this.show("slots", {
        kicker: "THREE POCKET-SIZED MAZES",
        title: "Save your mischief",
        text: e.message,
        actions: [0, 1, 2]
          .flatMap((i) => [
            [
              `Save slot ${i + 1}`,
              () => {
                e.save(p, i);
                this.shell.back();
                this.slots();
              },
            ],
            [
              `Load ${i + 1}: ${p.data.boards[i]?.name || "empty"}`,
              () => {
                e.load(p, i);
                a.refreshEditor();
                this.shell.back();
                this.slots();
              },
            ],
          ])
          .concat([["Back", () => this.shell.back()]]),
      });
    }
    rename() {
      const e = this.app.editor;
      this.show("rename", {
        title: "Name this maze",
        actions: [
          [
            "Keep name",
            () => {
              e.rename(field.value);
              this.shell.back();
              this.shell.toast("A maze by any name", e.data.name);
            },
          ],
          ["Back", () => this.shell.back()],
        ],
      });
      const field = this.inputField("Maze name", e.data.name, { max: 32 });
    }
    code() {
      const a = this.app,
        e = a.editor;
      this.show("maze-code", {
        kicker: "A MAZE IN A MOUTHFUL OF TEXT",
        title: "Share your maze",
        text: "Copy this code to keep or share it. Paste another Mix-Up code here to import a validated maze.",
        actions: [
          [
            "Select all code",
            () => {
              field.focus();
              field.select();
            },
          ],
          [
            "Import this code",
            () => {
              e.import(field.value);
              a.refreshEditor();
              this.shell.toast("Maze code", e.message);
            },
          ],
          ["Back", () => this.shell.back()],
        ],
      });
      const field = this.inputField("Maze code", e.export(), { area: true });
    }
    templates() {
      const a = this.app,
        e = a.editor;
      const reset = (i) => {
        e.reset(i);
        a.refreshEditor();
        this.close();
      };
      this.show("templates", {
        title: "A fresh plate",
        actions: [
          ["Open loops template", () => reset(0)],
          ["Side doors template", () => reset(1)],
          ["Shy walls template", () => reset(2)],
          [
            "Clear walls…",
            () =>
              this.show("clear-maze", {
                title: "Clear the lanes?",
                text: "The permanent pen and all starts stay. Undo can bring the walls back.",
                actions: [
                  ["Keep editing", () => this.shell.back()],
                  [
                    "Clear walls",
                    () => {
                      e.checkpoint();
                      const cells = Array.from({ length: 17 }, (_, y) =>
                        Array.from({ length: 21 }, (_, x) =>
                          x === 0 || x === 20 || y === 0 || y === 16 ? "#" : ".",
                        ),
                      );
                      M.penTemplate(cells);
                      e.data.rows = cells.map((r) => r.join(""));
                      e.data.tunnels = [];
                      a.refreshEditor();
                      this.close();
                    },
                  ],
                ],
              }),
          ],
          ["Back", () => this.shell.back()],
        ],
      });
    }
    editHelp() {
      this.show("edit-help", {
        title: "Build a better bite",
        sections: [
          [
            "Move & paint",
            "D-pad / stick or arrows move the bright cell. Cross / Enter applies the current tool. Click or drag to paint.",
          ],
          [
            "Tools",
            "L1 / R1 or Q / E choose a tool. Square / Z undoes. Triangle / Y redoes. Snacks cycle through all eight identities; stars cycle through four.",
          ],
          [
            "Tunnels & pen",
            "Tunnel tool pairs the two edges on the chosen row. The pen tool switches turning on or off. Its walls stay protected.",
          ],
          [
            "Keep it playable",
            "Validate finds the first blocked route or unsafe start and highlights the cell. Save, load and maze codes all use the same validator as the campaign.",
          ],
        ],
        actions: [["Back", () => this.shell.back()]],
      });
    }
    about(page = 0) {
      const R = M.RELEASE,
        S = R.sourceInformation;
      const sourceGroups = [
        ["date", "source", "plan", "genre", "perspective"],
        ["tech", "artDirection", "animation", "audio"],
        ["online", "testing", "research"],
        ["environment", "model", "usage"],
      ];
      const pretty = {
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
      const tq = [
        "How many issues did testing catch?",
        "How many were critical / game breaking?",
        "Most helpful test?",
        "Least helpful test?",
      ];
      const eq = [
        "What did you like most about the engine?",
        "Did you get stuck or guess wrong?",
        "Most important system you built yourself?",
        "Hardest part of using the engine?",
        "What did you change in the engine, and why?",
        "One engine change you would make?",
      ];
      const pq = [
        "What did you like most about the prompt?",
        "What was confusing?",
        "What was hardest?",
        "What would you change?",
      ];
      const pages = sourceGroups.map((keys) => ({
        title: "Source Information",
        sections: keys.map((k) => [pretty[k], S[k]]),
      }));
      for (const [title, qs, answers] of [
        ["Testing Feedback", tq, R.testingFeedback],
        ["Engine Feedback", eq, R.engineFeedback],
        ["Prompt Feedback", pq, R.promptFeedback],
      ])
        for (let i = 0; i < qs.length; i += 2)
          pages.push({ title, sections: qs.slice(i, i + 2).map((q, j) => [q, answers[i + j]]) });
      pages.push({
        title: "The people & the pixels",
        sections: [
          [
            "Original inspiration",
            "K.C. Munchkin! (1981), Ed Averett / North American Philips. This is an independent original adaptation.",
          ],
          [
            "Engine",
            "my-3D2dge v0.89.1, Michael Crosato, MIT. Native engine supplied with the game.",
          ],
          ["Online", "AI Hub protocol 1, client 1.4.0, Michael Crosato."],
          [
            "Made for this game",
            "Original maze layouts, toy creatures, native Blob animation extensions, procedural music, effects and gibberish voices. No sampled audio or imported art.",
          ],
          [
            "Research",
            "Original rules booklet at odyssey2.info, contemporary audiovisual observations, and inspected archival commercial. Human listening quality and physical-device verification: unknown.",
          ],
        ],
      });
      page = M.clamp(page, 0, pages.length - 1);
      this.aboutPage = page;
      this.show("about", {
        kicker: `ABOUT & CREDITS / ${page + 1} OF ${pages.length}`,
        ...pages[page],
        actions: [
          ...(page < pages.length - 1
            ? [
                [
                  "Next",
                  () => {
                    this.shell.back();
                    this.about(page + 1);
                  },
                ],
              ]
            : []),
          ...(page > 0
            ? [
                [
                  "Previous",
                  () => {
                    this.shell.back();
                    this.about(page - 1);
                  },
                ],
              ]
            : []),
          ["Back", () => this.shell.back()],
        ],
      });
    }
    results() {
      const a = this.app,
        w = a.world,
        won = w.phase === "won",
        min = Math.floor(w.elapsed / 60),
        sec = Math.floor(w.elapsed % 60)
          .toString()
          .padStart(2, "0");
      this.show("results", {
        kicker:
          w.mode === "campaign"
            ? won
              ? "SIX COURSES. TWELVE BIG GRINS."
              : "THE LUNCH GOT AWAY"
            : "A MAZE WELL MUNCHED",
        title: won ? "The last laugh is yours!" : "Still hungry?",
        emblem: won ? "✦" : "♡",
        text: won
          ? "The snacks have stopped scooting. The rivals have lost their roar. You turn to the room… and let out one enormous, ridiculous chuckle."
          : "Every little loop teaches a trick. Try another route, grab a star, and give that lunch a run for its money.",
        stats: [
          [String(w.score), "TEAM SCORE"],
          [`${min}:${sec}`, "TIME"],
          [String(w.stats.caught), "SNACKS"],
          [`${w.stats.stages}/${w.mode === "campaign" ? 6 : 1}`, "MAZES"],
        ],
        sections: [
          [
            "Your team",
            w.players
              .map((p) => {
                const s = w.stats.perPlayer[p.id];
                return `P${p.seat + 1}: ${s.snacks} snacks, ${s.predators} rivals, ${s.hits} bumps.`;
              })
              .join("\n"),
          ],
          [
            w.assisted ? "Assisted run" : "A fair feast",
            w.assisted
              ? "Developer tools were used. This score stays out of normal records."
              : `Best team score: ${a.profile.data.best}. Keep your grin sharp!`,
          ],
        ],
        actions: [
          ["Play again", () => a.startRun({ ...a.currentOptions })],
          ["Remix a maze", () => this.remix()],
          ...(a.editor && w.mode === "custom"
            ? [["Return to workshop", () => a.returnEditor()]]
            : []),
          ["Title", () => a.showTitle()],
        ],
      });
    }
  }
  M.Screens = Screens;
})(globalThis.Mix);
