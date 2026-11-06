(function (B) {
	"use strict";
	const E = My3D2dge;
	B.preferenceSpecs = [
		{ key: "music", value: 0.1 },
		{
			key: "scale",
			value: () =>
				typeof window !== "undefined" && matchMedia("(pointer:coarse)").matches
					? "fill"
					: "auto",
		},
		{ key: "glyphs", value: "playstation" },
		{
			key: "voice",
			label: "Gibberish voices",
			type: "slider",
			value: 0.6,
			min: 0,
			max: 1,
			step: 0.05,
			group: "Sound",
			apply: (g, v) => {
				g.audio.voiceVolume = v;
				g.audio.applyVolume();
			},
		},
		{
			key: "tvScale",
			label: "Text size",
			type: "select",
			value: 1,
			options: [
				[0.85, "Compact"],
				[1, "Sofa"],
				[1.18, "Large"],
			],
			group: "Comfort",
			apply: (g) => {
				if (g.shell?.root)
					g.shell.root.classList.toggle("large-text", g.settings.tvScale > 1);
				if (typeof window !== "undefined")
					window.dispatchEvent(new Event("resize"));
			},
		},
		{
			key: "touchAssist",
			label: "Safe touch spray",
			value: true,
			type: "toggle",
			group: "Game",
			help: "Spray only when a bee or open shield is clear of Pip and parcels.",
		},
	];
	B.Screens = function (game, app) {
		const shell = new E.Shell(game, {
			tv: true,
			theme: {
				ink: "#fff0c5",
				paper: "#163137f5",
				accent: "#f4c279",
				muted: "#bed0b8",
				danger: "#f18b7f",
				line: "#668c77",
				font: "Trebuchet MS, system-ui, sans-serif",
				titleFont: "Georgia, serif",
				scale: () =>
					Math.max(0.9, Math.min(2.25, innerWidth / 875)) *
					(game.settings.tvScale || 1),
			},
			screens: {
				pause: {
					kicker: "Buzz Comb Party",
					text: () =>
						game.pauseReason === "controller"
							? "Controller disconnected. Reconnect or use the keyboard."
							: game.pauseReason === "focus"
								? "The garden waited while you were away."
								: "Take a breath. Pip is judging your technique.",
				},
				help: {
					title: "The garden rules",
					keys: () => [
						[
							game.input.label("left") + " / " + game.input.label("right"),
							"Choose your spray column",
						],
						[game.input.label("fire"), "Spray upward; hold to repeat"],
						[game.input.label("call"), "Call Pip to a nearby comb"],
						[game.input.label("pause"), "Pause / local options"],
					],
					sections: [
						[
							"The wax bargain",
							"Spray a bee: +100. Express bee: +1,000. A comb redirects workers; pale bees pass through. Spray an existing comb to clear it.",
						],
						[
							"Feed the expert",
							"Pip eats amber for 500 / 800 / 1,000 by height; red adds 1,000. Calls share an eight-second cooldown. Repeated friendly spray sends Pip away briefly.",
						],
						[
							"Garden etiquette",
							"A cramped worker builds a hive. Keep it for the clear bonus! Escaped bees pollinate. Flowers take room, never health. A spring-hop finds safe space; full enclosure spends one reserve and retries the encounter.",
						],
						[
							"Can accounting",
							"56 pulses per can. Empty cans swap using reserves. Clear a garden for a refill. Extra cans at 20k, 40k, 80k, then each 80k. Repeated entries on a retry cannot pay twice.",
						],
						[
							"The pageant",
							"Feed a red comb to open a shield bud. Spray the open bud before it closes. More express bees always arrive if you need another red parcel.",
						],
						[
							"Touch",
							"Drag the lower garden to steer. Safe spray is automatic. Tap a parcel for Harvest or Clear; Clear steers and spends ordinary spray. Move again to cancel.",
						],
					],
				},
			},
		});
		game.o.menu.items = () => [
			["Developer Tools", () => dev()],
			["About / Credits", () => about()],
		];
		let lab = false,
			position = 320,
			tier = 3,
			aboutPage = 0,
			diagnostic = "";
		for (const [k, d] of Object.entries(B.TUNE))
			game.settings.define({
				key: "lab_" + k,
				label: d[4] + " (" + d[5] + ")",
				type: "slider",
				value: d[0],
				min: d[1],
				max: d[2],
				step: d[3],
				group: "Lab",
				help: "Live in the current assisted run. Entry timing applies on encounter restart.",
				apply: () => {
					if (!lab || !app.world || app.online) return;
					const t = { ...app.world.tuning };
					t[k] = game.settings["lab_" + k];
					B.setTuning(app.world, t);
				},
			});
		for (const [key, label] of [
			["god", "Stock & enclosure protection"],
			["unlimited", "Unlimited spray"],
			["freeze", "Freeze simulation"],
			["overlay", "Collision & ledger overlay"],
		])
			game.settings.define({
				key: "dev_" + key,
				label,
				value: false,
				type: "toggle",
				group: "Developer",
				apply: () => {
					if (!lab || !app.world || app.online) return;
					app.world.dev[key] = game.settings["dev_" + key];
					app.world.assisted = true;
				},
			});
		game.settings.define({
			key: "dev_slow",
			label: "Simulation speed",
			type: "slider",
			value: 1,
			min: 0.1,
			max: 1,
			step: 0.1,
			group: "Developer",
			apply: () => {
				if (lab && app.world && !app.online) {
					app.world.dev.slow = game.settings.dev_slow;
					app.world.assisted = true;
				}
			},
		});
		function open(name, spec) {
			shell.show(name, spec);
		}
		function dev() {
			if (app.online) return;
			if (!game.paused) game.pause("menu");
			lab = false;
			for (const k of Object.keys(B.TUNE))
				game.settings.set("lab_" + k, app.world?.tuning[k] ?? B.TUNE[k][0]);
			if (app.world) {
				for (const k of ["god", "unlimited", "freeze", "overlay", "slow"])
					game.settings.set("dev_" + k, app.world.dev[k]);
			}
			lab = true;
			open("dev", {
				kicker: "Workshop • mutations mark this run assisted",
				title: "Developer Tools",
				text: () =>
					app.world
						? "Seed " +
							app.world.seed +
							" • tick " +
							app.world.tick +
							" • garden " +
							(app.world.stage + 1) +
							" • " +
							app.world.status
						: "Start a garden first.",
				actions: [
					["Encounter & phase", encounters],
					["Spawn & inspect", spawns],
					["Timing & protection", timing],
					["Live tuning: combat", () => tuning(0)],
					["Live tuning: garden", () => tuning(1)],
					["Export / import", diagnostics],
					[
						"Return to pause",
						() => {
							lab = false;
							shell.back();
						},
					],
				],
			});
		}
		function encounters() {
			open("encounters", {
				kicker: "Workshop",
				title: "Choose a garden",
				actions: [
					...B.CONTENT.map((e, i) => [
						String(i + 1) + ". " + e.name,
						() => {
							app.world.assisted = true;
							B.enterEncounter(app.world, i);
							shell.toast("Garden " + (i + 1), e.name);
						},
					]),
					[
						"Finale phase 1 / 2 / 3",
						() => {
							const w = app.world;
							if (!w.boss) {
								B.enterEncounter(w, 5);
								w.assisted = true;
							} else {
								w.boss.phase = (w.boss.phase + 1) % w.boss.phases;
								w.boss.hp = w.boss.maxHp;
								w.boss.done = false;
								w.boss.supply = 1;
								w.boss.open = 0;
								w.assisted = true;
							}
							shell.toast(
								"Phase " + (w.boss.phase + 1),
								"Red harvest opens the bud.",
							);
						},
					],
					[
						"Restart current",
						() => {
							app.world.assisted = true;
							B.enterEncounter(app.world, app.world.stage);
							shell.toast("Restarted", "Reward claims retained.");
						},
					],
					[
						"Next garden",
						() => {
							app.world.assisted = true;
							B.enterEncounter(
								app.world,
								Math.min(app.world.stage + 1, app.world.content.length - 1),
							);
						},
					],
					[
						"Trigger win",
						() => {
							app.world.assisted = true;
							B.finish(app.world, true, "Workshop celebration.");
							app.results();
						},
					],
					[
						"Trigger loss",
						() => {
							app.world.assisted = true;
							B.finish(app.world, false, "Workshop test loss.");
							app.results();
						},
					],
					["Back", () => shell.back()],
				],
			});
		}
		function timing() {
			open("timing", {
				kicker: "Workshop",
				title: "Timing & protection",
				rows: [
					"dev_god",
					"dev_unlimited",
					"dev_slow",
					"dev_freeze",
					"dev_overlay",
				],
				text: "A paused overlay still accepts controls. Single-step advances exactly one 1/120-second tick.",
				actions: [
					[
						"Advance one tick",
						() => {
							const w = app.world,
								was = w.dev.freeze;
							w.dev.freeze = false;
							w.assisted = true;
							B.step(w);
							w.dev.freeze = was;
							app.visual.update(w, 1 / 120);
							shell.toast("Tick " + w.tick, w.status);
						},
					],
					["Back", () => shell.back()],
				],
			});
		}
		function tuning(page) {
			const keys = Object.keys(B.TUNE),
				split =
					page === 0
						? [
								"beeSpeed",
								"fastMultiplier",
								"fireCadence",
								"capacity",
								"penetration",
								"pulseSpeed",
								"moveSpeed",
								"bonusScale",
							]
						: [
								"spawnInterval",
								"flowerGrowth",
								"trapDelay",
								"birdSpeed",
								"birdFeed",
								"irritationRecovery",
								"callCooldown",
							];
			open("tuning" + page, {
				kicker: "Workshop • live variables",
				title: page === 0 ? "Combat tuning" : "Garden tuning",
				rows: split.map((k) => "lab_" + k),
				text: "Existing motion changes immediately. Entry timing is baked when an encounter starts. Capacity clamps current fill.",
				actions: [
					[
						"Reset all tuning to defaults",
						() => {
							game.settings.reset("Lab");
							if (app.world) B.setTuning(app.world, B.defaults());
							shell.toast("Defaults restored", "Widgets and simulation agree.");
						},
					],
					["Back", () => shell.back()],
				],
			});
		}
		function spawns() {
			open("spawns", {
				kicker: "Workshop",
				title: "Spawn & inspect",
				text: () =>
					`Column ${position}, tier ${tier}. Overlay shows IDs, trap geometry, pending entries, seed and ledger.`,
				actions: [
					[
						"Cycle column: left / center / right",
						() => {
							position = position === 80 ? 320 : position === 320 ? 560 : 80;
							spawns();
						},
					],
					[
						"Cycle tier",
						() => {
							tier = (tier + 1) % 7;
							spawns();
						},
					],
					...["worker", "fast", "amber", "red", "hive", "flower", "bird"].map(
						(kind) => [
							"Spawn " + kind,
							() => {
								B.debugMutate(app.world, kind, { x: position, tier });
								shell.toast(
									"Spawned " + kind,
									"Column " + position + " • tier " + tier,
								);
							},
						],
					),
					[
						"Clear arena",
						() => {
							B.debugMutate(app.world, "clear");
							shell.toast("Arena cleared", "All scheduled entries removed.");
						},
					],
					[
						"Toggle inspection overlay",
						() => {
							game.settings.set("dev_overlay", !game.settings.dev_overlay);
						},
					],
					["Back", () => shell.back()],
				],
			});
		}
		function exportObject() {
			return {
				version: 1,
				title: "Buzz Comb Party",
				tuning: app.world?.tuning || B.defaults(),
				content: app.world?.content || B.CONTENT,
				state: app.world ? B.snapshot(app.world) : null,
			};
		}
		function download() {
			const data = JSON.stringify(exportObject(), null, 2);
			if (game.headless) return data;
			const url = URL.createObjectURL(
					new Blob([data], { type: "application/json" }),
				),
				a = document.createElement("a");
			a.href = url;
			a.download = "buzz-comb-party-diagnostic.json";
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 0);
			return data;
		}
		function importData(str) {
			try {
				const obj = JSON.parse(str),
					t = B.validateTuning(obj.tuning || {}),
					content = obj.content ? B.validateContent(obj.content) : null;
				if (app.world) {
					B.setTuning(app.world, t);
					if (content) {
						app.world.content = content;
						B.enterEncounter(
							app.world,
							Math.min(app.world.stage, content.length - 1),
						);
					}
				}
				lab = false;
				for (const k of Object.keys(B.TUNE))
					game.settings.set("lab_" + k, t[k]);
				lab = true;
				diagnostic =
					"Valid profile imported. Current garden restarted if content changed.";
				shell.toast("Imported", diagnostic);
				return { ok: true };
			} catch (err) {
				diagnostic = "Import rejected: " + err.message;
				shell.toast("Profile kept", diagnostic);
				return { ok: false, error: err.message };
			}
		}
		function pickImport() {
			if (app.online || game.headless) return;
			const file = document.createElement("input");
			file.type = "file";
			file.accept = ".json,application/json";
			file.onchange = async () => {
				if (file.files?.[0]) {
					importData(await file.files[0].text());
					diagnostics();
				}
			};
			file.click();
		}
		function diagnostics() {
			open("diagnostics", {
				kicker: "Workshop",
				title: "Export / import",
				text: () =>
					diagnostic ||
					"Export includes the seed, tick, ledger, current world, tuning and authored content. Invalid profiles leave the last good values intact.",
				actions: [
					[
						"Download diagnostic JSON",
						() => {
							download();
							shell.toast(
								"Diagnostic exported",
								"JSON includes tuning, content and state.",
							);
						},
					],
					[
						"Copy diagnostic JSON",
						async () => {
							try {
								await navigator.clipboard.writeText(
									JSON.stringify(exportObject()),
								);
								shell.toast("Copied", "Diagnostic JSON is on the clipboard.");
							} catch {
								diagnostic =
									"Clipboard unavailable here. Download the same JSON instead.";
								diagnostics();
							}
						},
					],
					["Import tuning / content JSON", pickImport],
					["Back", () => shell.back()],
				],
			});
		}
		function coop() {
			open("coop", {
				kicker: "Two cans, one garden",
				title: "Choose your devices",
				text: "Both cans share score, reserves and Pip. They can pass each other. Keyboard and pointer always belong to player 1.",
				actions: [
					["Keyboard + one pad", () => app.start(2, "mixed")],
					["Two pads", () => app.start(2, "pads")],
					["One shared keyboard", () => app.start(2, "keys")],
					["Back", () => shell.back()],
				],
			});
		}
		function records() {
			const r = app.records();
			open("records", {
				kicker: "Local scorebook",
				title: "Garden records",
				text: r.runs
					? `${r.runs} unassisted runs • ${r.wins} parties saved\nBest score ${r.best.toLocaleString()}\nFastest win ${r.fastest ? B.formatTime(r.fastest) : "unknown"}`
					: "Your scorebook is waiting for its first garden shift.",
				actions: [["Back", () => shell.back()]],
			});
		}
		function about(group = 0, part = 0) {
			aboutPage = (group + 4) % 4;
			const d = B.REPORT || {},
				labels = [
					"Source Information",
					"Testing Feedback",
					"Engine Feedback",
					"Prompt Feedback",
				];
			const source = d.sourceInformation || {};
			const sourceFields = [
				["date", "source", "plan", "genre", "perspective"],
				["tech"],
				["artDirection", "animation"],
				["audio", "online"],
				["testing"],
				["research"],
				["environment", "model", "usage"],
			];
			const sourcePages = sourceFields.map((fields) =>
				fields.map((k) => k + ": " + (source[k] || "unknown")).join("\n\n"),
			);
			sourcePages.push(
				"Original game art, writing, procedural score and gibberish: this build.\n\nNative engine: Michael Crosato, my-3D2dge 0.89.1 (MIT). AI Hub session client 1.4.0.\n\nInspired by Buzz Bombers (1983): Mike Breen (design/program), Monique Lujan-Bekerink and Peggi Decarli (graphics), Bill Goodrich (sound). Reference artwork is not included.",
			);
			const feedback = (key) => {
				const values = d[key] || ["unknown"];
				return Array.from({ length: Math.ceil(values.length / 2) }, (_, i) =>
					values
						.slice(i * 2, i * 2 + 2)
						.map((v, j) => i * 2 + j + 1 + ". " + v)
						.join("\n\n"),
				);
			};
			const pages = [
				sourcePages,
				feedback("testingFeedback"),
				feedback("engineFeedback"),
				feedback("promptFeedback"),
			];
			part = Math.max(0, Math.min(part, pages[aboutPage].length - 1));
			const next = () =>
				part + 1 < pages[aboutPage].length
					? about(aboutPage, part + 1)
					: about(aboutPage + 1, 0);
			const prev = () =>
				part > 0
					? about(aboutPage, part - 1)
					: about((aboutPage + 3) % 4, pages[(aboutPage + 3) % 4].length - 1);
			open("about", {
				kicker:
					"About / Credits • " +
					(part + 1) +
					" / " +
					pages[aboutPage].length +
					" • Circle / Escape returns",
				title: labels[aboutPage],
				text: pages[aboutPage][part],
				sections: [],
				actions: [
					["Next page", next],
					["Previous page", prev],
				],
			});
		}
		return {
			shell,
			dev,
			coop,
			about,
			records,
			importData,
			exportObject,
			download,
			closeLab() {
				lab = false;
			},
			get inLab() {
				return lab;
			},
		};
	};
	B.formatTime = (s) =>
		Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
})((globalThis.BCP = globalThis.BCP || {}));
