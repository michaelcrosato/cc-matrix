import * as Sim from "./sim.js";

const TITLE = "Smithereen Royal Rumble";
const COURT_NAMES = [
	"Village exhibition",
	"Quarry meet",
	"High keep",
	"Lakeside night court",
	"Royal final",
];
const MATERIALS = ["wood", "stone", "reinforced"];
const TUNING = [
	[
		["chargeTime", "Time to full tension", 0.4, 3, 0.05, "s"],
		["maxSpeed", "Maximum launch speed", 180, 420, 5, "u/s"],
		["gravity", "Gravity", 60, 220, 5, "u/s²"],
		["reload", "Roundstone reload", 0.2, 3, 0.05, "s"],
		["heavyReload", "Masonry reload", 0.3, 4, 0.05, "s"],
		["splitReload", "Split reload", 0.3, 5, 0.05, "s"],
	],
	[
		["damage", "Masonry damage scale", 0.25, 4, 0.05, "×"],
		["healthScale", "Block health scale", 0.25, 4, 0.05, "×"],
		["crewDisable", "Crew retreat", 0.2, 6, 0.1, "s"],
		["launcherDisable", "Launcher repair", 0.2, 8, 0.1, "s"],
		["protection", "Return protection", 0.2, 4, 0.05, "s"],
	],
	[
		["aiError", "AI range error", 0, 0.15, 0.005, "power"],
		["aiReaction", "AI reaction delay", 0.1, 4, 0.1, "s"],
		["assist", "Timing assistance", 0, 1, 0.05, ""],
	],
];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rounded = (v, step) => Math.round(v / step) * step;
const keyName = (code) =>
	({
		Space: "Space",
		ShiftRight: "Right Shift",
		ShiftLeft: "Left Shift",
		Enter: "Enter",
	})[code] ||
	code?.replace(/^Key/, "").replace(/^Digit/, "") ||
	"unknown";

export function createUI(E, game, app) {
	const shell = new E.Shell(game, {
		tv: true,
		standard: false,
		screens: { pause: false },
		theme: {
			accent: "#f4cf78",
			paper: "rgba(11,27,38,.96)",
			ink: "#fff4d8",
			muted: "#b7c9c7",
			line: "rgba(244,207,120,.32)",
			titleFont: "Georgia, serif",
			font: "system-ui, sans-serif",
			scale: () =>
				(clamp((globalThis.innerWidth || 1280) * 0.016, 17, 29) / 14) *
				(app.settings.uiScale || 1),
		},
	});
	// The game has independent simultaneous seats. Its adapter supplies focus and confirm once.
	shell._step = () => {};
	app.dev ||= {
		speed: 1,
		paused: false,
		step: false,
		collision: false,
		support: false,
		prediction: false,
		invulnerable: false,
	};
	let lastScreen = "",
		lastVersion = "",
		history = [],
		details = "",
		aboutPage = 0,
		settingPage = 0,
		devPage = 0,
		authorPage = 0;
	let editor = null,
		selected = 0,
		status = "",
		controlPage = 0,
		lastDrawMenu = null;
	const root = shell.root;
	const style =
		typeof document !== "undefined" ? document.createElement("style") : null;
	if (style) {
		style.textContent = `.rumble-ui .esh-sh{animation:none!important;background:linear-gradient(120deg,#031722e8,#061a29ce);backdrop-filter:blur(2px)}
.rumble-ui .esh-ttl{background:linear-gradient(90deg,#041924f5,#061a28c9 47%,#061a2800 88%);backdrop-filter:none}
.rumble-ui .esh-ttl h1{font-size:clamp(36px,4.8vw,48px);letter-spacing:-.045em;max-width:510px;text-shadow:0 4px #07121a}
.rumble-ui .esh-ttl>div{max-width:min(550px,94vw);padding-left:4vw}.rumble-ui .esh-ttl .rumble-item-sub{display:none}.rumble-ui .esh-ttl button{min-height:36px;padding:7px 14px}.rumble-ui .esh-ttl .esh-sub{font-size:16px}
.rumble-ui .esh-mod{width:min(600px,100%);border-radius:2px;border-top:3px solid #f4cf78;box-shadow:0 20px 80px #0009;padding:22px 25px}
.rumble-ui .esh-sh h2{font-size:31px}.rumble-ui .esh-k{letter-spacing:.18em;font-size:10px}
.rumble-ui .esh-sh button{border-radius:2px;letter-spacing:.045em;font-size:14px;line-height:1.2;min-height:43px;transition:background .1s,border-color .1s}
.rumble-ui .esh-btns{gap:6px;margin-top:17px}.rumble-ui button.rumble-focus{border-color:#f4cf78;box-shadow:inset 4px 0 #f4cf78;background:#f4cf7820;outline:2px solid #f4cf78;outline-offset:1px}
.rumble-ui button.pri.rumble-focus{background:#f4cf78;color:#10222d}.rumble-ui .esh-sub{font-size:18px}
.rumble-ui .rumble-description{font-size:12px;white-space:pre-line;margin:13px 0;color:#c6d7d1;line-height:1.55}
.rumble-ui .rumble-item-value{float:right;margin-left:16px;color:#f4cf78}.rumble-ui .rumble-item-sub{display:block;font-size:10px;line-height:1.4;font-weight:400;text-transform:none;letter-spacing:0;color:#b7c9c7;margin-top:4px}
.rumble-ui button.pri .rumble-item-sub{color:#263a39}.rumble-ui .rumble-range{display:block;width:100%!important;height:25px;margin-top:5px;accent-color:#f4cf78;cursor:ew-resize}
.rumble-ui .rumble-meta{font-size:11px;line-height:1.65;color:#c7d6d1;white-space:pre-wrap;overflow-wrap:anywhere}.rumble-ui .rumble-about-panel{display:flex;flex-direction:column}.rumble-ui .rumble-about-panel .rumble-meta{min-height:0;overflow:auto;flex:1 1 auto;margin-top:12px}.rumble-ui .rumble-about-panel>.esh-btns{flex:0 0 auto}
.rumble-ui .rumble-status{color:#f4cf78;font-size:11px;min-height:16px;margin-top:9px;white-space:pre-wrap}
.rumble-ui textarea{display:block;width:100%;height:115px;background:#06151e;color:#e8f0d4;border:1px solid #f4cf7855;padding:9px;font:10px/1.45 monospace;resize:vertical;user-select:text}
.rumble-menu-button{position:fixed;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:15;width:48px;height:44px;border:1px solid #e5c98788;border-radius:5px;background:#061c29de;color:#fff1c4;font:23px Georgia;touch-action:manipulation}
.rumble-ui .esh-nav{display:none}.rumble-ui .esh-sh{padding-top:max(20px,env(safe-area-inset-top));padding-bottom:max(16px,env(safe-area-inset-bottom))}
@media(max-width:680px){.rumble-ui .esh-ttl>div{padding-left:0}.rumble-ui .esh-ttl{background:#061b27da;place-items:center}.rumble-ui .esh-ttl h1{font-size:36px;line-height:1.04}.rumble-ui .esh-mod{padding:17px 15px}.rumble-ui .esh-sh h2{font-size:25px}.rumble-ui .esh-btns{gap:5px;margin-top:12px}.rumble-ui .esh-sh button{font-size:12px;min-height:38px;padding:9px 11px}.rumble-ui .rumble-description{font-size:11px}.rumble-ui .esh-sh{padding-left:10px;padding-right:10px}}
@media(prefers-reduced-motion:reduce){.rumble-ui *{transition:none!important}}`;
		document.head.appendChild(style);
		root?.classList.add("rumble-ui");
	}
	const menuButton =
		typeof document !== "undefined" ? document.createElement("button") : null;
	if (menuButton) {
		menuButton.className = "rumble-menu-button";
		menuButton.textContent = "Ⅱ";
		menuButton.ariaLabel = "Pause / menu";
		menuButton.onclick = (e) => {
			e.stopPropagation();
			e.preventDefault();
			app.idle = 0;
			app.pause();
		};
		document.body.appendChild(menuButton);
	}

	const action = (label, fn, sub = "") => ({ label, action: fn, sub });
	const current = () => app.world;
	const home = () => {
		history = [];
		app.title();
	};
	const open = (screen, keep = false) => {
		if (!keep && app.screen !== screen) history.push(app.screen);
		app.input?.clear();
		app.setScreen(screen);
		app.focus = 0;
		refresh();
	};
	const changed = (render = true) => {
		app.saveSettings?.();
		app.audio?.setVolumes?.(app.settings);
		game.reduceMotion = !!app.settings.reducedMotion;
		if (render) refresh();
	};
	const choice = (
		label,
		object,
		key,
		choices,
		format = (x) => String(x),
		onChange,
	) => ({
		label,
		kind: "choice",
		value: object[key],
		choices,
		format,
		change(value) {
			object[key] = value;
			onChange?.(value);
			changed();
		},
		action() {
			const i = choices.indexOf(object[key]);
			this.change(choices[(i + 1) % choices.length]);
		},
	});
	const toggle = (label, object, key, onChange) =>
		choice(
			label,
			object,
			key,
			[false, true],
			(v) => (v ? "On" : "Off"),
			onChange,
		);
	const slider = (label, object, key, min, max, step, unit = "", onChange) => ({
		label,
		kind: "slider",
		value: object[key],
		min,
		max,
		step,
		unit,
		format: (value) =>
			`${Number(value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0))}${unit ? " " + unit : ""}`,
		change(value, silent = false) {
			if (!Number.isFinite(value)) return;
			const v = clamp(rounded(value, step), min, max);
			const old = object[key];
			object[key] = v;
			this.value = v;
			onChange?.(v, old);
			changed(!silent);
		},
		action() {
			this.change(object[key] + step);
		},
	});
	const cheat = () => {
		app.cheated = true;
		if (current()) current().cheated = true;
		if (app.tour) app.tour.cheated = true;
	};
	const restart = (opts = {}) => {
		if (app.mode === "hub") return;
		cheat();
		if (!Object.keys(opts).length && app.restart) {
			app.restart();
			return;
		}
		app.start(app.mode === "attract" ? "quick" : app.mode || "quick", {
			court: current()?.court || 0,
			bout: current()?.bout || 1,
			seed: current()?.seed || 17,
			war: app._options?.war || app.war || false,
			difficulty: app.difficulty || "normal",
			...opts,
		});
	};
	const force = (winner) => {
		if (app.mode === "hub") return;
		cheat();
		if (app.forceResult) app.forceResult(winner);
		else if (current()) {
			const w = current();
			const scores = w.players.map((p) => p.score);
			w.phase = "over";
			w.outcome = {
				winner,
				reason: "developer",
				scores,
				banked: scores.map((v, s) => (s === winner ? v * w.bout : 0)),
			};
		}
		app.resume();
	};

	function titleItems() {
		const items = [];
		if (app.savedTour && app.savedTour.next <= 10)
			items.push(
				action(
					`Resume tour · bout ${app.savedTour.next}`,
					() => app.start("solo", { resume: true }),
					"Continue your saved ten-bout war",
				),
			);
		items.push(
			action(
				"Solo Tour",
				() => {
					if (app.savedTour && app.savedTour.next <= 10) {
						details =
							"Restarting replaces the saved tour. Your settings stay with you.";
						open("restart-tour");
					} else app.start("solo", { teaching: true });
				},
				"Ten bouts. Five courts. One questionable crown.",
			),
		);
		items.push(
			action(
				"Quick Duel",
				() => {
					app.setupMode = "quick";
					open("setup");
				},
				"Choose a court and a worthy opponent",
			),
		);
		items.push(
			action(
				"Local Versus",
				() => {
					app.setupMode = "local";
					open("setup");
				},
				"Two people, one screen, simultaneous fire",
			),
		);
		items.push(
			action("Settings", () => {
				settingPage = 0;
				open("settings");
			}),
		);
		items.push(
			action("Controls", () => {
				controlPage = 0;
				open("controls");
			}),
		);
		items.push(
			action("About / Credits", () => {
				aboutPage = 0;
				open("about");
			}),
		);
		return items;
	}
	function setupItems() {
		app.setup ||= { court: 0, difficulty: "normal", war: false };
		const s = app.setup,
			local = app.setupMode === "local";
		const list = [
			action(local ? "Begin the duel" : "Let the stones fly", () => {
				if (
					local &&
					app.settings.seat1 === app.settings.seat2 &&
					app.settings.seat1 !== "keyboard"
				) {
					status =
						"Each castle needs a different controller. Choose distinct seats.";
					refresh();
					return;
				}
				if (local) {
					const pads =
						typeof navigator !== "undefined" && navigator.getGamepads
							? navigator.getGamepads()
							: [];
					for (const assignment of [app.settings.seat1, app.settings.seat2])
						if (
							assignment.startsWith("pad") &&
							!pads[Number(assignment.slice(3))]?.connected
						) {
							status = `${assignment === "pad0" ? "Controller 1" : "Controller 2"} is disconnected. Connect it or select keyboard.`;
							refresh();
							return;
						}
				}
				app.start(local ? "local" : "quick", {
					court: s.court,
					difficulty: s.difficulty,
					war: local && s.war,
				});
			}),
		];
		list.push(
			choice("Court", s, "court", [0, 1, 2, 3, 4], (v) => COURT_NAMES[v]),
		);
		if (local) {
			list.push(
				choice("Format", s, "war", [false, true], (v) =>
					v ? "Ten-bout war" : "Single bout",
				),
			);
			list.push(
				choice(
					"Rose / left seat",
					app.settings,
					"seat1",
					["keyboard", "pad0", "pad1"],
					(v) =>
						({
							keyboard: "Keyboard + mouse",
							pad0: "Controller 1",
							pad1: "Controller 2",
						})[v],
				),
			);
			list.push(
				choice(
					"Azure / right seat",
					app.settings,
					"seat2",
					["keyboard", "pad1", "pad0"],
					(v) =>
						({
							keyboard: "Keyboard · Right Shift",
							pad0: "Controller 1",
							pad1: "Controller 2",
						})[v],
				),
			);
		} else
			list.push(
				choice(
					"Rival strength",
					s,
					"difficulty",
					["easy", "normal", "hard"],
					(v) =>
						({
							easy: "Exhibition",
							normal: "Tournament",
							hard: "Royal champion",
						})[v],
				),
			);
		list.push(
			choice(
				"Tension",
				app.settings,
				"tension",
				[1.4, 1, 0.7],
				(v) =>
					({
						1.4: "Forgiving · 1.4 s",
						1: "Lively · 1.0 s",
						".7": "Royal · 0.7 s",
						0.7: "Royal · 0.7 s",
					})[v] || v + " s",
			),
		);
		list.push(action("Back", back));
		return list;
	}
	function settingsItems() {
		const s = app.settings;
		const tabs = ["Sound", "Play & display", "Bindings"];
		const list = [
			action(`Page: ${tabs[settingPage]}  →`, () => {
				settingPage = (settingPage + 1) % 3;
				app.focus = 0;
				refresh();
			}),
		];
		if (settingPage === 0) {
			list.push(
				slider("Music", s, "music", 0, 1, 0.05, "", () =>
					app.audio?.setVolumes?.(s),
				),
			);
			list.push(
				slider("Effects", s, "effects", 0, 1, 0.05, "", () =>
					app.audio?.setVolumes?.(s),
				),
			);
			list.push(
				slider("Gibberish voices", s, "voice", 0, 1, 0.05, "", () =>
					app.audio?.setVolumes?.(s),
				),
			);
			s.mute ||= false;
			list.push(toggle("Mute all", s, "mute"));
		} else if (settingPage === 1) {
			list.push(choice("Button symbols", s, "glyphs", ["PlayStation", "Xbox"]));
			list.push(
				choice(
					"Tension",
					s,
					"tension",
					[1.4, 1, 0.7],
					(v) => `${v.toFixed(1)} s to full`,
					(value) => {
						if (current() && app.mode !== "hub")
							current().config.chargeTime = value;
					},
				),
			);
			list.push(toggle("Full predicted arc", s, "prediction"));
			list.push(toggle("Reduced motion", s, "reducedMotion"));
			list.push(
				slider("TV text size", s, "uiScale", 0.85, 1.3, 0.05, "×", () => {
					if (typeof window !== "undefined")
						window.dispatchEvent(new Event("resize"));
				}),
			);
			s.touchAssist ||= 0;
			list.push(
				slider("Timing assist", s, "touchAssist", 0, 1, 0.1, "", (value) => {
					if (current() && app.mode !== "hub") current().config.assist = value;
				}),
			);
		} else {
			list.push(
				action(`Left fire: ${keyName(s.fire1)}`, () => {
					app.rebinding = "fire1";
					status = "Press a keyboard key for the left castle. Escape cancels.";
					refresh();
				}),
			);
			list.push(
				action(`Right fire: ${keyName(s.fire2)}`, () => {
					app.rebinding = "fire2";
					status = "Press a keyboard key for the right castle. Escape cancels.";
					refresh();
				}),
			);
			for (const [key, label, def] of [
				["prev1", "Left previous stone", "KeyQ"],
				["next1", "Left next stone", "KeyE"],
				["prev2", "Right previous stone", "KeyU"],
				["next2", "Right next stone", "KeyO"],
			]) {
				s[key] ||= def;
				list.push(
					action(`${label}: ${keyName(s[key])}`, () => {
						app.rebinding = key;
						status =
							"Press a new key. Escape cancels. Existing bindings are protected.";
						refresh();
					}),
				);
			}
			list.push(
				action("Restore default bindings", () => {
					Object.assign(s, {
						fire1: "Space",
						fire2: "ShiftRight",
						prev1: "KeyQ",
						next1: "KeyE",
						prev2: "KeyU",
						next2: "KeyO",
					});
					status = "Default bindings restored.";
					changed();
				}),
			);
		}
		list.push(action("Back", back));
		return list;
	}
	function controlsItems() {
		return [
			action("Previous page", () => {
				controlPage = (controlPage + 2) % 3;
				refresh();
			}),
			action("Next page", () => {
				controlPage = (controlPage + 1) % 3;
				refresh();
			}),
			action("Replay the lesson", () => {
				app.playLesson();
			}),
			action("Rebind controls", () => {
				settingPage = 2;
				open("settings");
			}),
			action("Back", back),
		];
	}
	function aboutPages() {
		const m = app.metadata || {};
		const questions = {
			testingFeedback: [
				"Issues caught",
				"Critical / game-breaking",
				"Most helpful test",
				"Least helpful test",
			],
			engineFeedback: [
				"Best part of the engine",
				"Wrong guesses",
				"Most important custom system",
				"Hardest engine integration",
				"Engine changes",
				"Desired engine improvement",
			],
			promptFeedback: [
				"Best part of the prompt",
				"Confusing part",
				"Hardest task",
				"Suggested change",
			],
		};
		const sections = [
			[
				"Source Information",
				Object.entries(m.sourceInformation || {}).map(
					([k, v]) =>
						`${k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}\n${v}`,
				),
				3,
			],
			...Object.entries(questions).map(([key, labels]) => [
				key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
				labels.map((label, i) => `${label}\n${m[key]?.[i] || "unknown"}`),
				2,
			]),
		];
		const pages = [];
		for (const [title, entries, maxEntries] of sections) {
			let group = [];
			const emit = () => {
				if (group.length) {
					pages.push({ title, text: group.join("\n\n") });
					group = [];
				}
			};
			for (const entry of entries) {
				const pieces = [];
				let remaining = entry;
				while (remaining.length > 430) {
					const cut = remaining.lastIndexOf(" ", 430);
					const end = cut > 200 ? cut : 430;
					pieces.push(remaining.slice(0, end));
					remaining = "(continued) " + remaining.slice(end).trim();
				}
				pieces.push(remaining);
				for (const piece of pieces) {
					if (
						group.length &&
						(group.length >= maxEntries ||
							group.join("\n\n").length + piece.length > 430)
					)
						emit();
					group.push(piece);
				}
			}
			emit();
		}
		return pages.length
			? pages
			: [{ title: "Source Information", text: "unknown" }];
	}
	function pauseItems() {
		const list = [
			action("Return to the tournament", () => app.resume()),
			action("Settings", () => {
				settingPage = 0;
				open("settings");
			}),
			action("Controls", () => {
				controlPage = 0;
				open("controls");
			}),
			action("Developer tools", () => {
				devPage = 0;
				open("developer");
			}),
		];
		if (app.mode !== "hub")
			list.push(
				action("Restart this bout", () => open("restart-bout")),
				action("Return to title", () => open("leave-match")),
			);
		return list;
	}
	function developerItems() {
		const w = current();
		if (app.mode === "hub")
			return [
				action("Back to match", () => app.resume()),
				action("Back", back),
			];
		const names = [
			"Scenario",
			"Simulation",
			"Launch tuning",
			"Damage & recovery",
			"AI & assist",
		];
		const list = [
			action(`Page: ${names[devPage]}  →`, () => {
				devPage = (devPage + 1) % names.length;
				app.focus = 0;
				refresh();
			}),
		];
		if (!w) return list.concat(action("Back", back));
		if (devPage === 0) {
			list.push(action("Restart current bout", () => restart()));
			app.devCourt ??= w.court;
			app.devBout ??= w.bout;
			list.push(
				choice(
					"Court for restart",
					app,
					"devCourt",
					[0, 1, 2, 3, 4],
					(v) => COURT_NAMES[v],
				),
			);
			list.push(slider("Bout for restart", app, "devBout", 1, 10, 1));
			list.push(
				action("Apply court & bout", () =>
					restart({ court: app.devCourt, bout: app.devBout }),
				),
			);
			list.push(
				action("Restore both castles", () => {
					cheat();
					Sim.resetCastles(w);
					status = "Castles restored.";
					refresh();
				}),
			);
			list.push(
				action("Clear airborne stones", () => {
					cheat();
					w.projectiles.length = 0;
					status = "Projectiles cleared.";
					refresh();
				}),
			);
			list.push(
				action("Skip teaching", () => {
					app.skipTeaching?.();
					app.lesson = null;
					app.teaching = false;
					app.lessonStage = 99;
					status = "Teaching skipped.";
					refresh();
				}),
			);
			list.push(action("Inspect left victory", () => force(0)));
			list.push(action("Inspect right victory", () => force(1)));
			list.push(action("Inspect draw ceremony", () => force(-1)));
			list.push(
				action("Court authoring", () => {
					editor = structuredClone(w.blocks);
					selected = 0;
					authorPage = 0;
					open("author");
				}),
			);
		} else if (devPage === 1) {
			list.push(toggle("Simulation paused", app.dev, "paused", cheat));
			list.push(
				action("Advance one fixed tick", () => {
					cheat();
					app.dev.paused = true;
					app.dev.step = true;
					status = `Step requested at tick ${w.tick}.`;
					refresh();
				}),
			);
			list.push(
				slider("Simulation speed", app.dev, "speed", 0.1, 4, 0.1, "×", cheat),
			);
			list.push(
				toggle("Invulnerable castles", app.dev, "invulnerable", (value) => {
					cheat();
					w.config.invulnerable = value;
				}),
			);
			list.push(toggle("Show collision shapes", app.dev, "collision"));
			list.push(toggle("Show support links", app.dev, "support"));
			list.push(toggle("Show predicted arc", app.dev, "prediction"));
			list.push(
				action(`Left seat: ${w.players[0].ai ? "AI" : "Human"}`, () => {
					cheat();
					w.players[0].ai = w.players[0].ai
						? null
						: { reaction: 0.8, error: 0.015, style: "adaptive" };
					refresh();
				}),
			);
			list.push(
				action(`Right seat: ${w.players[1].ai ? "AI" : "Human"}`, () => {
					cheat();
					w.players[1].ai = w.players[1].ai
						? null
						: { reaction: 0.8, error: 0.015, style: "adaptive" };
					refresh();
				}),
			);
		} else
			for (const [key, label, min, max, step, unit] of TUNING[devPage - 2]) {
				list.push(
					slider(label, w.config, key, min, max, step, unit, (value, old) => {
						cheat();
						if (key === "healthScale" && old > 0) {
							for (const block of w.blocks.filter((b) => !b.foundation)) {
								const frac = block.maxHp > 0 ? block.hp / block.maxHp : 0;
								block.maxHp *= value / old;
								block.hp = block.maxHp * frac;
							}
							w.maxHealth = [0, 1].map((seat) =>
								w.blocks
									.filter((b) => b.seat === seat && !b.foundation)
									.reduce((sum, b) => sum + b.maxHp, 0),
							);
						}
					}),
				);
			}
		list.push(
			action("Reset tuning to defaults", () => {
				cheat();
				app.resetTuning();
				status =
					"Defaults restored. Timing applies to the next action; health preserves its fraction.";
				refresh();
			}),
		);
		list.push(action("Back", back));
		return list;
	}
	function authorBlock() {
		return editor?.[clamp(selected, 0, (editor?.length || 1) - 1)] || null;
	}
	function authorResult() {
		if (!editor?.length) return { valid: false, errors: ["No blocks."] };
		try {
			const result = Sim.validateCourt({
				version: 1,
				name: "Authored court",
				blocks: editor,
			});
			if (result && typeof result === "object" && !Array.isArray(result))
				return {
					valid: result.valid ?? result.ok ?? !result.errors?.length,
					errors: result.errors || [],
				};
			return {
				valid: result === true || result?.length === 0,
				errors: Array.isArray(result)
					? result
					: result
						? []
						: ["Court validation failed."],
			};
		} catch (error) {
			return { valid: false, errors: [error.message] };
		}
	}
	function commitEditor() {
		const check = authorResult();
		if (!check.valid) {
			status = check.errors.join("\n");
			refresh();
			return;
		}
		cheat();
		const w = current();
		w.blocks = structuredClone(editor);
		w.revision++;
		w.projectiles.length = 0;
		w.maxHealth = [0, 1].map((seat) =>
			w.blocks
				.filter((b) => b.seat === seat && !b.foundation)
				.reduce((sum, b) => sum + b.maxHp, 0),
		);
		status = "Validated court applied. Preview it by returning to play.";
		refresh();
	}
	function authorItems() {
		editor ||= structuredClone(current()?.blocks || []);
		if (!editor.length)
			editor.push({
				id: 0,
				seat: 0,
				x: 50,
				z: 40,
				w: 20,
				h: 18,
				hp: 1,
				maxHp: 1,
				material: "stone",
				foundation: true,
				supports: [],
				alive: true,
			});
		selected = clamp(selected, 0, editor.length - 1);
		const b = authorBlock();
		const list = [
			action(
				`Page: ${["Blocks", "Position & size", "Support graph", "Import / export"][authorPage]}  →`,
				() => {
					authorPage = (authorPage + 1) % 4;
					app.focus = 0;
					refresh();
				},
			),
		];
		if (authorPage === 0) {
			list.push(
				action(
					`Selected: #${b.id} · ${b.seat === 0 ? "Rose" : "Azure"}`,
					() => {
						selected = (selected + 1) % editor.length;
						refresh();
					},
				),
			);
			list.push(
				action("Previous block", () => {
					selected = (selected + editor.length - 1) % editor.length;
					refresh();
				}),
			);
			list.push(
				choice(
					"Material",
					b,
					"material",
					MATERIALS,
					(v) => v,
					(value) => {
						const hp = { wood: 1, stone: 2, reinforced: 4 }[value];
						b.hp = b.maxHp = hp;
					},
				),
			);
			list.push(toggle("Foundation / excluded objective", b, "foundation"));
			list.push(
				choice("Owner", b, "seat", [0, 1], (v) =>
					v === 0 ? "Rose / left" : "Azure / right",
				),
			);
			list.push(
				action("Add adjacent block", () => {
					const copy = structuredClone(b);
					copy.id = Math.max(...editor.map((x) => x.id)) + 1;
					copy.x = clamp(copy.x + copy.w, 0, 620);
					copy.foundation = b.foundation && copy.z <= 40;
					copy.supports = copy.foundation ? [] : [b.id];
					copy.alive = true;
					copy.hp = copy.maxHp;
					editor.push(copy);
					selected = editor.length - 1;
					status = `Added block #${copy.id}.`;
					refresh();
				}),
			);
			list.push(
				action("Remove selected block", () => {
					const id = b.id;
					editor.splice(selected, 1);
					for (const block of editor)
						block.supports = block.supports.filter((s) => s !== id);
					selected = Math.max(0, selected - 1);
					status = `Removed block #${id}.`;
					refresh();
				}),
			);
		} else if (authorPage === 1) {
			for (const [key, label, min, max, step] of [
				["x", "East position", 0, 620, 1],
				["z", "Height / up", 40, 240, 1],
				["w", "Width", 4, 80, 1],
				["h", "Height", 4, 80, 1],
			])
				list.push(slider(label, b, key, min, max, step, "u"));
			list.push(
				action("Mirror selected block", () => {
					const copy = structuredClone(b);
					copy.id = Math.max(...editor.map((x) => x.id)) + 1;
					copy.x = 640 - b.x - b.w;
					copy.seat = 1 - b.seat;
					copy.supports = [];
					copy.foundation = copy.z <= 40;
					editor.push(copy);
					selected = editor.length - 1;
					refresh();
				}),
			);
		} else if (authorPage === 2) {
			app.authorSupport ??= 0;
			const candidates = editor
				.filter((x) => x.id !== b.id && x.seat === b.seat)
				.map((x) => x.id);
			if (!candidates.includes(app.authorSupport))
				app.authorSupport = candidates[0] ?? b.id;
			list.push(
				choice(
					"Support block",
					app,
					"authorSupport",
					candidates.length ? candidates : [b.id],
					(v) => `#${v}`,
				),
			);
			list.push(
				action("Add support link", () => {
					if (
						app.authorSupport !== b.id &&
						!b.supports.includes(app.authorSupport)
					)
						b.supports.push(app.authorSupport);
					status = `#${b.id} supports: ${b.supports.join(", ") || "none"}`;
					refresh();
				}),
			);
			list.push(
				action("Remove selected support link", () => {
					b.supports = b.supports.filter((id) => id !== app.authorSupport);
					status = `#${b.id} supports: ${b.supports.join(", ") || "none"}`;
					refresh();
				}),
			);
			list.push(
				action("Validate connectivity & reachability", () => {
					const check = authorResult();
					status = check.valid
						? "Valid: connected foundations, legal shapes, reachable objective footprint."
						: check.errors.join("\n");
					refresh();
				}),
			);
			list.push(
				action("Preview selected support collapse", () => {
					cheat();
					current().blocks = structuredClone(editor);
					const target = current().blocks.find((x) => x.id === b.id);
					target.hp = 0;
					target.alive = false;
					const connected = new Set(
						current()
							.blocks.filter((x) => x.foundation && x.alive)
							.map((x) => x.id),
					);
					let changed = true;
					while (changed) {
						changed = false;
						for (const block of current().blocks)
							if (
								block.alive &&
								!connected.has(block.id) &&
								block.supports.some((id) => connected.has(id))
							) {
								connected.add(block.id);
								changed = true;
							}
					}
					let removed = 0;
					for (const block of current().blocks)
						if (block.alive && !block.foundation && !connected.has(block.id)) {
							block.alive = false;
							block.hp = 0;
							removed++;
						}
					current().revision++;
					status = `Removing #${b.id} disconnects ${removed} objective block${removed === 1 ? "" : "s"}.`;
					refresh();
				}),
			);
		} else {
			list.push(
				action("Export court as JSON", () => {
					const text = JSON.stringify(
						{ version: 1, name: "Authored court", blocks: editor },
						null,
						2,
					);
					app.authorJSON = text;
					status = "JSON shown below. Select it to copy, or use Download.";
					refresh();
				}),
			);
			list.push(
				action("Download JSON", () => {
					if (typeof document === "undefined") return;
					const url = URL.createObjectURL(
						new Blob(
							[
								JSON.stringify(
									{ version: 1, name: "Authored court", blocks: editor },
									null,
									2,
								),
							],
							{ type: "application/json" },
						),
					);
					const a = document.createElement("a");
					a.href = url;
					a.download = "royal-rumble-court.json";
					a.click();
					setTimeout(() => URL.revokeObjectURL(url), 0);
				}),
			);
			list.push(
				action("Import pasted JSON", () => {
					try {
						const parsed = JSON.parse(app.authorJSON || "");
						if (parsed.version !== 1 || !Array.isArray(parsed.blocks))
							throw new Error("Expected version 1 and a blocks array.");
						const old = editor;
						editor = parsed.blocks;
						const check = authorResult();
						if (!check.valid) {
							editor = old;
							throw new Error(check.errors.join("\n"));
						}
						selected = 0;
						status = `Imported ${editor.length} validated blocks.`;
						refresh();
					} catch (error) {
						status = error.message;
						refresh();
					}
				}),
			);
		}
		list.push(action("Apply validated court", commitEditor));
		list.push(action("Back", back));
		return list;
	}
	function resultItems() {
		const multi =
			app.mode === "solo" ||
			(app.mode === "local" && (app._options?.war || app.war));
		const list = [
			action(
				multi
					? current()?.bout >= 10
						? "Crown the champion"
						: "Next bout"
					: "Rematch",
				() => app.advance(),
			),
		];
		if (!multi)
			list.push(
				action("Change court", () => {
					app.setupMode = app.mode === "local" ? "local" : "quick";
					open("setup");
				}),
			);
		list.push(
			action("About / Credits", () => {
				aboutPage = 0;
				open("about");
			}),
			action("Return to title", home),
		);
		return list;
	}

	function build() {
		const s = app.screen,
			w = current();
		let title = "",
			kicker = "",
			text = "",
			menu = [],
			footer = "";
		if (s === "title") {
			title = TITLE;
			kicker = "The Royal Demolition League";
			text =
				"Hold to wind. Release to ruin.\nA little precision. A great deal of rubble.";
			menu = titleItems();
			footer =
				"Online versus is available when hosted in AI Hub. · 1–2 players";
		} else if (s === "setup") {
			title =
				app.setupMode === "local"
					? "Bring a worthy rival"
					: "Choose your court";
			kicker = "Exhibition match";
			text =
				app.setupMode === "local"
					? `Both castles fire together. Keyboard seats use ${keyName(app.settings.fire1)} and ${keyName(app.settings.fire2)}. Mouse belongs to the left keyboard seat.`
					: "Practice any court with all three stones. There are no turns to wait for.";
			menu = setupItems();
		} else if (s === "settings") {
			title = "Make yourself comfortable";
			kicker = ["Sound", "Play & display", "Bindings"][settingPage];
			text =
				settingPage === 0
					? "Separate music, stonework, and sporting nonsense."
					: settingPage === 1
						? "Tension changes timing, never the maximum distance. Timing assist slows the charge."
						: "Select an action, then press a key. Conflicting bindings are rejected.";
			menu = settingsItems();
		} else if (s === "controls") {
			title = [
				"Hold. Watch. Release.",
				"Choose your indignity",
				"Know the tournament",
			][controlPage];
			kicker = "How to play";
			if (controlPage === 0)
				text =
					app.device === "pad"
						? `${app.settings.glyphs === "Xbox" ? "A" : "Cross"}: hold to wind, release to throw.\n${app.settings.glyphs === "Xbox" ? "LB / RB" : "L1 / R1"}: change stone. ${app.settings.glyphs === "Xbox" ? "B" : "Circle"}: cancel. Options: menu.\nLook for the landing diamond; full tension overshoots. A new press is needed after any interruption.`
						: app.device === "touch"
							? "Hold anywhere in your friendly half to wind. Release to throw.\nThe small stone chips change your stone. The menu button pauses.\nThe landing diamond shows what your current tension will strike."
							: `${keyName(app.settings.fire1)} or left mouse: hold to wind, release to throw.\n${keyName(app.settings.prev1 || "KeyQ")} / ${keyName(app.settings.next1 || "KeyE")} or wheel: change stone. C or right mouse: cancel. Escape: pause.\nLeft / right arrows move your target reference. Right seat: ${keyName(app.settings.fire2)}, ${keyName(app.settings.prev2 || "KeyU")} / ${keyName(app.settings.next2 || "KeyO")}.\nFull tension overshoots. Watch the landing diamond.`;
			else if (controlPage === 1)
				text =
					"Roundstone · precise, quick to reload.\nMasonry · crush a support or reinforced wall.\nSplit · three fragments spread near the apex.\n\nCastle hits remove real blocks. Unsupported sections fall. Crew hits buy an opening; launcher hits buy a longer one. Gold shields mean returning targets are protected.";
			else
				text =
					"Castle: 3 points. Crew: 7. Launcher: 13.\nA structural cascade wins ground, without extra hit points.\nThe winner banks direct-hit score × bout number. The loser banks zero.\nA tour has ten bouts and advances after a defeat.\nAt 90 seconds, remaining castle health %, then direct hits decide. A tie is a draw. Hub rounds last at most three minutes.";
			menu = controlsItems();
		} else if (s === "about") {
			const pages = aboutPages();
			aboutPage = clamp(aboutPage, 0, pages.length - 1);
			kicker = `Credits · page ${aboutPage + 1} of ${pages.length} · Left / right to browse`;
			title = pages[aboutPage].title;
			text = pages[aboutPage].text;
			menu = [
				{
					label: "Next credits page",
					kind: "choice",
					value: aboutPage,
					choices: pages.map((_, i) => i),
					format: (v) => `${v + 1} / ${pages.length}`,
					change(value) {
						aboutPage = value;
						refresh();
					},
					action() {
						aboutPage = (aboutPage + 1) % pages.length;
						refresh();
					},
				},
				action("Back", back),
			];
		} else if (s === "pause") {
			kicker =
				app.mode === "hub"
					? "The match continues online"
					: "The trumpets can wait";
			title = "A brief royal recess";
			text =
				app.disconnectMessage ||
				(app.mode === "hub"
					? "Your castle remains in play. Close this menu to return."
					: "The battlefield is paused. Any held charge was safely cancelled.");
			menu = pauseItems();
		} else if (s === "developer") {
			kicker =
				app.mode === "hub"
					? "Read-only match diagnostics"
					: "Royal workshop · marks the run as assisted";
			title = "Developer tools";
			const p = w?.players || [];
			text = `Seed ${w?.seed ?? "—"} · tick ${w?.tick ?? 0} · ${w?.time?.toFixed(2) || "0"} s\nCourt ${1 + (w?.court || 0)} · bout ${w?.bout || 1} · ${w?.blocks?.filter((b) => b.alive && !b.foundation).length || 0} objective blocks · ${w?.projectiles?.length || 0} airborne\nScores ${p[0]?.score || 0} : ${p[1]?.score || 0}`;
			if (app.mode === "hub")
				text += `\n${JSON.stringify(app.online?.diagnostics?.() || {})}`;
			else
				text +=
					"\nTiming affects the next action. Health scaling preserves damage fractions.";
			menu = developerItems();
		} else if (s === "author") {
			kicker = "Court authoring · version 1";
			title = "Carve the next court";
			const b = authorBlock();
			text = b
				? `Block #${b.id} · ${b.material} · owner ${b.seat + 1}\n(${b.x}, ${b.z}) · ${b.w} × ${b.h} · ${b.foundation ? "foundation" : "objective"}\nSupports: ${b.supports?.join(", ") || "none"}\nUse the focused controls with pad or keys; click a visible block to select it.`
				: "Add a foundation to begin.";
			menu = authorItems();
		} else if (s === "result") {
			const o = w?.outcome;
			const winner = o?.winner ?? -1;
			title =
				winner < 0
					? "Honours even!"
					: `${winner === 0 ? "Rose" : "Azure"} takes the bout!`;
			kicker = `Bout ${w?.bout || 1} · ${COURT_NAMES[w?.court || 0]}`;
			const scores = o?.scores || pScores(w),
				banked = o?.banked || [0, 0];
			text = `${o?.reason === "time" ? "Time! Remaining castle health, then direct-hit score decide." : winner < 0 ? "The court declares a draw. No points are banked." : "Lower the losing flag. Sound the thoroughly excessive trumpets."}\n\nDirect-hit score: Rose ${scores[0]} · Azure ${scores[1]}\n${winner < 0 ? "Draw: 0 banked for each side." : `${winner === 0 ? "Rose" : "Azure"} banks ${scores[winner]} × ${w?.bout || 1} = ${banked[winner]} · loser banks 0.`}${app.tour ? `\nTournament total: ${app.tour.totals[0]} : ${app.tour.totals[1]}` : ""}`;
			menu = resultItems();
		} else if (s === "championship") {
			const totals = app.tour?.totals || [0, 0];
			title =
				totals[0] === totals[1]
					? "A shared, rather awkward crown!"
					: `${totals[0] > totals[1] ? "Rose" : "Azure"} wears the crumbly crown!`;
			kicker = "The ten-bout war is complete";
			text = `Final weighted total\nRose ${totals[0]}  ·  Azure ${totals[1]}\n\nFive courts. Ten bouts. An appalling bill for masonry.${app.tour?.cheated || app.cheated ? "\nThis run used developer assistance." : ""}`;
			menu = [
				action("Another royal tour", () =>
					app.start("solo", { teaching: false }),
				),
				action("Quick Duel", () => {
					app.setupMode = "quick";
					open("setup");
				}),
				action("Credits", () => {
					aboutPage = 0;
					open("about");
				}),
				action("Title", home),
			];
		} else if (s === "restart-tour") {
			title = "A fresh campaign?";
			kicker = "Your previous tour will be replaced";
			text = details;
			menu = [
				action("Keep the saved tour", back),
				action("Restart the ten-bout tour", () =>
					app.start("solo", { teaching: true, restart: true }),
				),
			];
		} else if (s === "restart-bout") {
			title = "Replay this bout?";
			text =
				"The current battle will start again. This marks the run as assisted.";
			menu = [
				action("Keep playing", () => app.resume()),
				action("Restart the bout", () => restart()),
			];
		} else if (s === "leave-match") {
			title = "Leave the court?";
			text =
				app.mode === "solo"
					? "Your completed bouts are saved. This unfinished bout will begin again on Resume."
					: "The current battle will be left behind.";
			menu = [
				action("Return to the battle", () => app.resume()),
				action("Return to title", home),
			];
		}
		return { title, kicker, text, menu, footer };
	}
	function pScores(w) {
		return w?.players?.map((p) => p.score) || [0, 0];
	}
	function textValue(item) {
		const v = item.value;
		return item.format
			? item.format(v)
			: typeof v === "boolean"
				? v
					? "On"
					: "Off"
				: String(v ?? "");
	}
	function refresh() {
		if (
			app.screen === "play" ||
			app.mode === "attract" ||
			app.online?.ended ||
			app.hubEnded
		) {
			if (shell.screen) shell.hide();
			app.menu = [];
			if (root) root.hidden = !!(app.online?.ended || app.hubEnded);
			return;
		}
		if (root) root.hidden = false;
		const spec = build();
		app.menu = spec.menu;
		app.focus = clamp(
			Number.isInteger(app.focus) ? app.focus : 0,
			0,
			Math.max(0, spec.menu.length - 1),
		);
		if (!root) return;
		shell._stack.length = 0;
		const acts = spec.menu.map((item, i) => ({
			label: item.label,
			primary:
				i === 0 && !["settings", "developer", "author"].includes(app.screen),
			fn: () => activate(i),
		}));
		const isTitle = app.screen === "title";
		shell.show(isTitle ? "title" : `rumble-${app.screen}`, {
			name: isTitle ? spec.title : undefined,
			title: spec.title,
			subtitle: undefined,
			kicker: spec.kicker,
			text: "",
			actions: acts,
			footer: spec.footer,
			back,
		});
		const panel = shell._els.scr.querySelector(
			isTitle ? ".esh-ttl>div" : ".esh-mod",
		);
		const btns = shell._els.scr.querySelector(".esh-btns");
		if (app.screen === "about") panel?.classList.add("rumble-about-panel");
		if (panel && spec.text) {
			const p = document.createElement(app.screen === "about" ? "div" : "p");
			p.className =
				app.screen === "about" ? "rumble-meta" : "rumble-description";
			p.textContent = spec.text;
			panel.insertBefore(p, btns);
		}
		const buttons = [...(btns?.querySelectorAll("button") || [])];
		buttons.forEach((button, i) => {
			const item = spec.menu[i];
			button.dataset.menuIndex = i;
			button.ariaLabel = item.label;
			button.onpointerenter = () => {
				app.focus = i;
				app.idle = 0;
				button.focus({ preventScroll: true });
				syncFocus(false);
			};
			if (item.kind === "choice" || item.kind === "slider") {
				const value = document.createElement("span");
				value.className = "rumble-item-value";
				value.textContent = textValue(item);
				button.appendChild(value);
			}
			if (item.sub) {
				const small = document.createElement("small");
				small.className = "rumble-item-sub";
				small.textContent = item.sub;
				button.appendChild(small);
			}
			if (item.kind === "slider") {
				const range = document.createElement("input");
				range.type = "range";
				range.className = "rumble-range";
				range.min = item.min;
				range.max = item.max;
				range.step = item.step;
				range.value = item.value;
				range.ariaLabel = item.label;
				range.tabIndex = -1;
				range.addEventListener("click", (e) => e.stopPropagation());
				range.addEventListener("pointerdown", (e) => {
					e.stopPropagation();
					app.focus = i;
					app.input?.clear();
				});
				range.addEventListener("input", (e) => {
					e.stopPropagation();
					app.idle = 0;
					const focus = i;
					item.change(Number(range.value), true);
					const output = button.querySelector(".rumble-item-value");
					if (output) output.textContent = textValue(item);
					app.focus = focus;
					syncFocus(false);
				});
				range.addEventListener("change", () => {
					refresh();
				});
				button.appendChild(range);
			}
		});
		if (app.screen === "author" && authorPage === 3 && panel) {
			const textarea = document.createElement("textarea");
			textarea.value = app.authorJSON || "";
			textarea.ariaLabel = "Court JSON";
			textarea.placeholder = "Paste a version 1 court definition here";
			textarea.oninput = () => {
				app.authorJSON = textarea.value;
				app.idle = 0;
			};
			textarea.addEventListener("keydown", (e) => e.stopPropagation());
			panel.insertBefore(textarea, btns);
		}
		if (status && panel) {
			const el = document.createElement("div");
			el.className = "rumble-status";
			el.textContent = status;
			panel.appendChild(el);
		}
		for (const nav of shell._els.scr.querySelectorAll(".esh-nav")) nav.remove();
		syncFocus(true);
	}
	function syncFocus(move = true) {
		if (!root) return;
		const buttons = [...shell._els.scr.querySelectorAll(".esh-btns>button")];
		buttons.forEach((b, i) =>
			b.classList.toggle("rumble-focus", i === app.focus),
		);
		const button = buttons[app.focus];
		if (move && button) {
			button.focus({ preventScroll: true });
			button.scrollIntoView({ block: "nearest", behavior: "instant" });
		}
	}
	function activate(index = app.focus) {
		if (app.online?.ended || app.hubEnded) return;
		const item = app.menu?.[index];
		if (!item || item.disabled) return;
		app.input?.clear();
		app.idle = 0;
		app.focus = index;
		app.audio?.unlock?.();
		game.audio?.sfx?.("confirm", { vol: 0.2 });
		item.action?.call(item);
		if (app.screen !== "play" && app.mode !== "attract") refresh();
	}
	function navigate(dir) {
		if (!app.menu?.length) return;
		app.focus = (app.focus + dir + app.menu.length) % app.menu.length;
		syncFocus();
		game.audio?.sfx?.("select", { vol: 0.15 });
	}
	function adjust(dir) {
		const item = app.menu?.[app.focus];
		if (!item) return;
		if (item.kind === "slider") item.change(item.value + dir * item.step);
		else if (item.kind === "choice") {
			const values = item.choices,
				i = values.indexOf(item.value);
			item.change(values[(i + dir + values.length) % values.length]);
		}
		syncFocus();
	}
	function back() {
		if (app.online?.ended || app.hubEnded) return;
		if (app.rebinding) {
			app.rebinding = null;
			status = "Binding unchanged.";
			refresh();
			return;
		}
		status = "";
		if (app.screen === "title") return;
		if (app.screen === "pause") {
			app.resume();
			return;
		}
		if (app.screen === "play") {
			app.pause();
			return;
		}
		const previous = history.pop();
		if (previous && previous !== "play") app.setScreen(previous);
		else if (
			app.world &&
			[
				"settings",
				"controls",
				"developer",
				"author",
				"about",
				"restart-bout",
				"leave-match",
			].includes(app.screen) &&
			app.mode !== "attract"
		)
			app.setScreen("pause");
		else app.setScreen("title");
		app.focus = 0;
		refresh();
	}
	function update() {
		const sc = app.screen;
		app.editorSelection = sc === "author" && editor ? authorBlock()?.id : null;
		app.editorBlocks = sc === "author" && editor ? editor : null;
		if (lastScreen !== sc) {
			status = "";
			lastScreen = sc;
			lastVersion = "";
			refresh();
		}
		if (menuButton)
			menuButton.hidden =
				sc !== "play" ||
				app.mode === "attract" ||
				!!(app.online?.ended || app.hubEnded);
		if (root) root.classList.toggle("esh-still", !!app.settings.reducedMotion);
		if (sc === "developer" || sc === "author") {
			const version = `${sc}|${current()?.revision}|${app.dev.paused}|${app.dev.step}`;
			if (version !== lastVersion) {
				lastVersion = version;
				refresh();
			}
		}
		if (sc === "play" && shell.screen) shell.hide();
	}
	function pointer(x, y, click) {
		if (!root || typeof document === "undefined") return false;
		const el = document.elementFromPoint(x, y)?.closest?.("[data-menu-index]");
		if (!el || !root.contains(el)) return false;
		app.focus = Number(el.dataset.menuIndex);
		syncFocus(false);
		if (click) activate(app.focus);
		return true;
	}
	function rebind(code) {
		const key = app.rebinding;
		if (!key) return false;
		if (code === "Escape") {
			app.rebinding = null;
			status = "Binding unchanged.";
			refresh();
			return true;
		}
		const reserved = [
			"Escape",
			"Enter",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"KeyC",
		];
		if (
			!/^(Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|Key[A-Z]|Digit[0-9]|Numpad[0-9])$/.test(
				code,
			)
		) {
			status = "Choose a letter, number, Space, Shift, or Control key.";
			refresh();
			return true;
		}
		const keys = ["fire1", "fire2", "prev1", "next1", "prev2", "next2"];
		if (
			reserved.includes(code) ||
			keys.some((k) => k !== key && app.settings[k] === code)
		) {
			status =
				"That key is already in use. Choose a different one, or Escape to cancel.";
			refresh();
			return true;
		}
		app.settings[key] = code;
		app.rebinding = null;
		status = `Bound to ${keyName(code)}.`;
		changed();
		return true;
	}
	function selectWorldBlock(point) {
		if (app.screen !== "author" || !editor) return false;
		const index = editor.findIndex(
			(b) =>
				point.x >= b.x &&
				point.x <= b.x + b.w &&
				point.z >= b.z &&
				point.z <= b.z + b.h,
		);
		if (index >= 0) {
			selected = index;
			status = `Selected block #${editor[index].id}.`;
			refresh();
			return true;
		}
		return false;
	}
	function draw(r) {
		if (app.mode === "attract")
			r.overlay((g) => {
				E.ui.box(g, r.W / 2 - 126, 18, 252, 29, {
					bg: "#081c2b",
					border: "#f4cf78",
				});
				E.font.text(g, "THE ROYAL EXHIBITION", r.W / 2, 24, "#f4cf78", {
					align: "center",
					outline: false,
				});
				E.font.text(g, "ANY INPUT TO TAKE THE FIELD", r.W / 2, 35, "#fff4d8", {
					align: "center",
					outline: false,
				});
			});
		lastDrawMenu = app.menu;
	}
	function dispose() {
		shell.dispose();
		style?.remove();
		menuButton?.remove();
	}
	const api = {
		shell,
		update,
		draw,
		refresh,
		back,
		open,
		navigate,
		confirm: () => activate(),
		adjust,
		pointer,
		rebind,
		selectWorldBlock,
		dispose,
		keyName,
	};
	app.openScreen = open;
	refresh();
	return api;
}
