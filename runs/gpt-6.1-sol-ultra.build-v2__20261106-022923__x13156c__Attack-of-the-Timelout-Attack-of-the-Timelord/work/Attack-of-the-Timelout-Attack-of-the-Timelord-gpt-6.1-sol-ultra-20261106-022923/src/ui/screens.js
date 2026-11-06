import {
	BOSS_PHASES,
	DEFAULT_TUNING,
	TUNING_SPEC,
	WAVES,
} from "../content/campaign.js";
import INTERVIEW from "../content/interview.json";
import {
	jumpEncounter,
	refillWorld,
	resetTuning,
	spawnThreat,
	stepWorld,
} from "../game/simulation.js";

const E = globalThis.My3D2dge;
export function makeScreens(app) {
	const game = app.game;
	const shell = new E.Shell(game, {
		theme: {
			scale: 1,
			font: "Arial, Helvetica, sans-serif",
			ink: "#f4e7ce",
			paper: "#111b2d",
			accent: "#a7f0d4",
		},
		screens: {
			pause: {
				kicker: "A MOMENT TO BREATHE",
				title: "Time, please.",
				text: () =>
					app.networked
						? "Your menu is local. The shared timeline continues."
						: game.pauseReason === "focus"
							? "The window lost focus. Your machine is safe. Choose Resume when you are ready."
							: game.pauseReason === "controller"
								? "The controller disconnected. Reconnect it, or use the keyboard, then choose Resume."
								: "Take a breath. Your timeline will wait.",
				actions: () => [
					...(!app.networked
						? [
								[
									"Restart encounter",
									() => {
										app.world.modified = true;
										jumpEncounter(
											app.world,
											app.world.wave,
											app.world.bossPhase,
										);
										shell.hide();
									},
								],
								["Dev Mode", () => dev()],
							]
						: [["Session information", () => sessionInfo()]]),
					["How to play", () => help()],
					["About & credits", () => about()],
				],
			},
		},
		settings: {
			onChange: (s, key) => {
				app.syncSettings(key);
			},
		},
	});
	const show = (name, spec) => shell.show(name, spec);
	const back = () => shell.back();
	const title = () => {
		app.mode = "title";
		app.lastActivity = game.real;
		shell.hide();
		if (game.sceneName && game.sceneName !== "title")
			game.go("title", null, { fade: 0 });
		show("title", {
			kicker: "AN ORIGINAL TEMPORAL ARCADE DEFENSE",
			name: "Attack of the Timelout",
			subtitle:
				"The future has a very petty landlord.\nShoot his fleet. Steal his seconds.",
			actions: [
				{ label: "Play solo  →", primary: true, fn: () => app.startSolo() },
				["Online co-op", () => online()],
				["How to play", () => help()],
				["Records", () => records()],
				["Settings", () => settings()],
				["About & credits", () => about()],
			],
			meta: ["1–4 PILOTS", "8 WAVES + FINALE", "INSPIRED BY ODYSSEY²"],
			footer: "Slide. Intercept. Buy yourself a second.",
		});
	};
	const help = () =>
		show("help", {
			kicker: "DEFEND YOUR MOMENT",
			title: "Make every shot a decision.",
			sections: [
				[
					"01   SLIDE & FIRE",
					"Move along the bottom rail. Hold Fire to send one fast shot upward. Shoot the winding ships to clear a wave. Three integrity pips give you room to recover.",
				],
				[
					"02   INTERCEPT THE ARSENAL",
					"WHITE DART: falls straight. RED ORB: gently follows you. GREEN CROSS: shoot before it lands; then escape its marked ground segment. GOLD DIAMOND: marks your future position, then commits. Change direction after the tell.",
				],
				[
					"03   STEAL A SECOND",
					"Interceptions fill the shared time brake. Activate at 100% to slow hostile motion for 1.6 seconds. Your machine and shots stay fast. Disabled co-op machines return at the next wave clear.",
				],
			],
			keys: () =>
				app.device === "gamepad"
					? [
							["L / D-pad", "Move"],
							["× / R2", "Fire"],
							["□ / L2", "Time brake"],
							["Options", "Pause"],
						]
					: [
							["A / D or ← / →", "Move"],
							["Space / left mouse", "Fire"],
							["Shift / right mouse", "Time brake"],
							["Pointer x", "Move to lane at normal speed"],
							["Escape", "Pause / back"],
						],
			actions: [["Back", back]],
		});
	const settings = () =>
		show("preferences", {
			kicker: "MAKE YOURSELF COMFORTABLE",
			title: "Settings",
			rows: [
				"#Assistance",
				"assistPreset",
				"autoFire",
				"reducedSpeed",
				"emergencyBrake",
				"#Sound",
				"music",
				"effects",
				"voice",
				"#Comfort",
				"motion",
				"flashes",
				"glyphs",
			],
			actions: [
				["Controls & rebinding", () => show("controls")],
				[
					"Restore all preferences",
					() => {
						for (const group of ["Game", "Sound", "Comfort", "Controller"])
							game.settings.reset(group);
						app.syncSettings();
						settings();
					},
				],
				["Back", back],
			],
		});
	function dev() {
		if (app.networked) return sessionInfo();
		app.world.modified = true;
		show("dev", {
			kicker: "MODIFIED RUN · SCORES DISABLED",
			title: "Temporal workshop",
			text: () =>
				`Seed ${app.world.seed}  ·  Tick ${app.world.tick}  ·  ${app.world.phase}\nChange a value with ← / →. Tuning lasts only for this visit.`,
			rows: [
				"#Inspection",
				"devGod",
				"devHitboxes",
				"devTrajectories",
				"devAI",
				"devSpeed",
			],
			actions: [
				["Jump to encounter", () => jumpMenu()],
				[
					"Restart this encounter",
					() => {
						jumpEncounter(app.world, app.world.wave, app.world.bossPhase);
						dev();
					},
				],
				[
					"Refill integrity + brake",
					() => {
						refillWorld(app.world);
						dev();
					},
				],
				["Spawn arsenal", () => spawnMenu()],
				[
					"Step one tick",
					() => {
						stepWorld(app.world, { [app.localId]: app.input.action() });
						app.consumeEvents();
						dev();
					},
				],
				["Live balance sliders", () => tuning()],
				[
					"Reset tuning to defaults",
					() => {
						resetTuning(app.world);
						game.settings.reset("Developer balance");
						dev();
					},
				],
				["Return to play", () => shell.hide()],
			],
		});
	}
	function jumpMenu() {
		show("jump", {
			kicker: "MODIFIED RUN",
			title: "Choose your moment",
			actions: [
				...WAVES.map((w, i) => [
					`${i + 1} · ${w.name}`,
					() => {
						jumpEncounter(app.world, i);
						shell.hide();
					},
				]),
				...BOSS_PHASES.map((b, i) => [
					`Finale ${i + 1} · ${b.name}`,
					() => {
						jumpEncounter(app.world, 8, i);
						shell.hide();
					},
				]),
				["Back", back],
			],
		});
	}
	function spawnMenu() {
		show("spawn", {
			title: "Arsenal inspection",
			actions: [
				...["missile", "mine", "roller", "hunter"].map((type) => [
					type.toUpperCase(),
					() => {
						spawnThreat(app.world, type, {
							x: app.world.players[0].x,
							y: 0,
							warning: 1,
						});
						shell.hide();
					},
				]),
				["Back", back],
			],
		});
	}
	function tuning() {
		show("tuning", {
			kicker: "LIVE · SESSION ONLY · MODIFIED RUN",
			title: "Balance the timeline",
			text: "All sliders apply immediately. Enemy launch interval controls the next scheduled shot; every other movement value updates active actors.",
			rows: TUNING_SPEC.map((s) => "tune_" + s.key),
			actions: [
				[
					"Reset balance",
					() => {
						resetTuning(app.world);
						game.settings.reset("Developer balance");
						tuning();
					},
				],
				["Back", back],
			],
		});
	}
	function about() {
		show("about", {
			kicker: "BUILT WITH MY-3D2DGE",
			title: "A little history. A new future.",
			text: "An original adaptation of Attack of the Timelord! (1982), the Odyssey² slide-and-shoot game by Ed Averett. The campaign, temporal brake, damage allowance, co-op, art, music, dialogue and finale are new.",
			actions: [
				["Source information", () => info()],
				[
					"Testing feedback",
					() => feedback("Testing Feedback", INTERVIEW.testingFeedback),
				],
				[
					"Engine feedback",
					() => feedback("Engine Feedback", INTERVIEW.engineFeedback),
				],
				[
					"Prompt feedback",
					() => feedback("Prompt Feedback", INTERVIEW.promptFeedback),
				],
				["Credits, licenses & references", () => credits()],
				["Back", back],
			],
		});
	}
	function info() {
		show("source-information", {
			kicker: "SOURCE INFORMATION",
			title: "Build record",
			sections: Object.entries(INTERVIEW.sourceInformation).map(([k, v]) => [
				k.replace(/([A-Z])/g, " $1").toUpperCase(),
				v,
			]),
			actions: [["Back", back]],
		});
	}
	function feedback(title, answers) {
		const questions = {
			"Testing Feedback": [
				"Issues caught",
				"Critical / game breaking issues",
				"Most helpful test",
				"Least helpful test",
			],
			"Engine Feedback": [
				"What worked best",
				"Where we got stuck or guessed wrong",
				"Most important custom system",
				"Hardest engine integration",
				"Engine changes and why",
				"One suggested engine change",
			],
			"Prompt Feedback": [
				"What worked best",
				"What was confusing",
				"Hardest requirement",
				"Suggested change",
			],
		};
		show("feedback", {
			kicker: "BUILD FEEDBACK",
			title,
			sections: answers.map((answer, i) => [questions[title][i], answer]),
			actions: [["Back", back]],
		});
	}
	function credits() {
		show("credits", {
			title: "Credits & references",
			sections: [
				[
					"ORIGINAL GAME",
					"Attack of the Timelord! © 1982 North American Philips. Original game software: Ed Averett. Original property belongs to its owners. This adaptation uses original procedural assets and arrangements.",
				],
				[
					"ENGINE",
					"my-3D2dge 0.89.1 · Michael Crosato · MIT license\nRevision 8ecc2f62353761187bdfe226f327b7ea5d2eb691\ngithub.com/michaelcrosato/my-3d2dge",
				],
				[
					"NETWORK",
					"AI Hub session client 1.4.0, unmodified, protocol 1. PeerJS 1.5.5 (MIT), loaded only for standalone Online. Public PeerServer signaling needs internet; restrictive NATs may require TURN. Universal reachability is unverified.",
				],
				[
					"RESEARCH",
					"North American manual; William Cassidy’s hands-on review; original gameplay screenshot and box illustration at odyssey2.info. No gameplay video viewed. Precise original timing and steering equations remain unknown.",
				],
				[
					"NEW ADAPTATION",
					"OpenAI gpt-6.1-sol · ultra · Codex CLI, Linux. All visuals, music, SFX and gibberish voices are made in code. No recordings, browser speech, or external art. See Source Information and feedback for the complete build record.",
				],
			],
			actions: [["Back", back]],
		});
	}
	function online() {
		app.mode = "online";
		app.lastActivity = game.real;
		show("online", {
			kicker: "ONE WORLD · UP TO FOUR MACHINES",
			title: "Share the timeline",
			text: "One pilot hosts. Everyone defends the same rail. A public signaling service connects the room; your browser carries game data directly. Internet is required.",
			actions: [
				{
					label: "Create room",
					primary: true,
					fn: async () => {
						app.networkStatus = "Opening signaling connection…";
						lobby();
						try {
							await app.net.createRoom();
							app.localId = app.net.me;
							lobby();
						} catch (e) {
							app.showError(e.message);
						}
					},
				},
				["Join room", () => join()],
				[
					"Back to solo",
					() => {
						app.net.leave();
						title();
					},
				],
			],
		});
	}
	function join(value = "") {
		let code = value
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "")
			.slice(0, 8);
		show("join", {
			kicker: "ENTER AN EIGHT-CHARACTER ROOM CODE",
			title: "Find your fellow pilots",
			text: "Type or paste a code, or use the controller keypad below.",
			actions: [
				[
					"Join this room",
					async () => {
						const input = document.querySelector("#room-entry");
						const raw = input?.value || code;
						let v = raw.toUpperCase();
						try {
							v = new URL(raw).searchParams.get("room") || v;
						} catch {}
						app.networkStatus = "Connecting to room…";
						lobby();
						try {
							await app.net.joinRoom(v);
							app.localId = app.net.me;
							lobby();
						} catch (e) {
							app.showError(e.message);
						}
					},
				],
				["Controller keypad", () => keypad(code, join)],
				["Back", back],
			],
		});
		const box = shell.root.querySelector(".esh-mod"),
			input = document.createElement("input");
		input.id = "room-entry";
		input.className = "custom-entry";
		input.value = code;
		input.maxLength = 8;
		input.placeholder = "ROOM CODE";
		input.setAttribute("aria-label", "Room code");
		input.autocomplete = "off";
		input.oninput = () => {
			code = input.value.toUpperCase();
			app.lastActivity = game.real;
		};
		input.onpaste = (e) => {
			const raw = e.clipboardData.getData("text");
			try {
				const c = new URL(raw).searchParams.get("room");
				if (c) {
					e.preventDefault();
					input.value = c.toUpperCase();
					code = input.value;
				}
			} catch {}
		};
		box.insertBefore(input, box.querySelector(".esh-btns"));
	}
	function keypad(value, done) {
		let code = value,
			index = 0;
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		function draw() {
			show("keypad", {
				kicker: "← / → SELECT · CONFIRM ADDS A CHARACTER",
				title: "Room code keypad",
				text: () => `${code.padEnd(8, "·")}\n\n${alphabet[index]}`,
				actions: [
					[
						"Previous character",
						() => {
							index = (index + alphabet.length - 1) % alphabet.length;
							draw();
						},
					],
					[
						"Next character",
						() => {
							index = (index + 1) % alphabet.length;
							draw();
						},
					],
					[
						"Add selected character",
						() => {
							code = (code + alphabet[index]).slice(0, 8);
							draw();
						},
					],
					[
						"Delete last",
						() => {
							code = code.slice(0, -1);
							draw();
						},
					],
					[
						"Use this code",
						() => {
							shell.back();
							done(code);
						},
					],
					["Back", back],
				],
			});
		}
		draw();
	}
	function lobby() {
		app.mode = "online";
		const n = app.net;
		show("room", {
			kicker: "STANDALONE ONLINE CO-OP",
			title: n.code ? `ROOM  ${n.code}` : "Connecting…",
			text: () =>
				`${app.networkStatus || n.roomState}\n\n${n.roster.map((p, i) => `${i + 1} · ${p.name || "PILOT"}   ${p.ready ? "READY" : "NOT READY"}${p.id === n.me ? " · YOU" : ""}`).join("\n")}`,
			actions: [
				[
					"Copy invite / show fallback",
					async () => {
						const link = n.invite();
						try {
							await navigator.clipboard.writeText(link);
							app.networkStatus = "Invite copied to clipboard.";
						} catch {
							app.networkStatus = `Copy unavailable. Share this code: ${n.code}`;
						}
						lobby();
					},
				],
				[
					"Toggle ready",
					() => {
						const p = n.roster.find((p) => p.id === n.me);
						n.setReady(!p?.ready);
						lobby();
					},
				],
				{
					label: "Host: start campaign",
					disabled: !n.isHost || n.roster.some((p) => !p.ready),
					fn: () => {
						n.startRoom();
					},
				},
				[
					"Leave room",
					() => {
						n.leave();
						app.networkStatus = "";
						title();
					},
				],
			],
		});
	}
	function sessionInfo() {
		show("session", {
			title: "Shared timeline",
			text: () =>
				`${app.net.hosted ? "AI Hub round" : "Online room"}\n${app.net.roster.map((p) => p.name || p.id).join(" · ")}\nThe host owns the world. Local menus do not pause the team.`,
			actions: [
				["Local settings", settings],
				["Back", back],
			],
		});
	}
	function results() {
		app.mode = "results";
		const w = app.world;
		show("results", {
			kicker:
				w.outcome === "victory"
					? "TOMORROW IS YOURS"
					: "THERE IS ALWAYS A NEXT SECOND",
			title:
				w.outcome === "victory" ? "The Timelout clocks off." : "A moment lost.",
			text:
				w.outcome === "victory"
					? "With the rift closed, every stolen second returns home. Somewhere, a very small tyrant is late for his own meeting."
					: "A fresh timeline is waiting. Intercept the weapons, follow their tells, and leave a lane to escape.",
			stats: [
				[String(w.score).padStart(6, "0"), "TEAM SCORE"],
				[w.stats.intercepts, "INTERCEPTIONS"],
				[`${w.stats.waveClears} / 8`, "WAVES CLEARED"],
				[w.stats.brakes, "TIME BRAKES"],
			],
			medals: [
				[
					"Standard rules",
					!w.modified &&
						!w.assisted &&
						!Object.values(w.assists || {}).some(Boolean),
				],
				["All three finale phases", w.stats.bossPhases >= 3],
			],
			actions: app.net.hosted
				? []
				: app.net.peer
					? [
							...(app.net.isHost
								? [["Save team record", () => records(true)]]
								: []),
							[
								"Return to room / replay",
								() => {
									app.net.started = false;
									app.networkStatus = "Ready for another timeline.";
									lobby();
								},
							],
							[
								"Leave room",
								() => {
									app.net.leave();
									title();
								},
							],
						]
					: [
							{
								label: "Retry campaign",
								primary: true,
								fn: () => app.startSolo(),
							},
							["Save score / records", () => records(true)],
							[
								"Reset to defaults + play",
								() => {
									game.settings.reset("Developer balance");
									app.tuning = { ...DEFAULT_TUNING };
									app.startSolo();
								},
							],
							["Main menu", title],
						],
		});
	}
	function records(save = false) {
		const w = app.world,
			allowed = w && !w.demo && !w.modified;
		const category =
			w && (w.assisted || Object.values(w.assists || {}).some(Boolean))
				? "assisted"
				: w?.players.length > 1
					? "co-op"
					: "solo";
		if (save && allowed && !w.savedRecord) {
			initials("", category);
			return;
		}
		const table = E.store.get("timelout-records-v1", []);
		const safe = Array.isArray(table)
			? table.filter(
					(r) => r && typeof r.name === "string" && Number.isFinite(r.score),
				)
			: [];
		show("records", {
			title: "Six letters in time",
			text:
				w && !allowed
					? "Modified and demonstration runs cannot submit scores."
					: undefined,
			sections: safe
				.slice(0, 10)
				.map((r, i) => [
					`${i + 1} · ${r.name}   ${r.score}`,
					`${r.category} · ${r.victory ? "VICTORY" : `WAVE ${r.wave}`}`,
				]),
			actions: [["Back", back]],
		});
	}
	function initials(value, category) {
		let name = value,
			index = 0,
			chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		const draw = () =>
			show("initials", {
				kicker: `${category.toUpperCase()} RECORD · SIX CHARACTERS`,
				title: name.padEnd(6, "_"),
				text: `Selected character:  ${chars[index]}`,
				actions: [
					[
						"Previous character",
						() => {
							index = (index + chars.length - 1) % chars.length;
							draw();
						},
					],
					[
						"Next character",
						() => {
							index = (index + 1) % chars.length;
							draw();
						},
					],
					[
						"Add selected character",
						() => {
							name = (name + chars[index]).slice(0, 6);
							draw();
						},
					],
					[
						"Delete last",
						() => {
							name = name.slice(0, -1);
							draw();
						},
					],
					[
						"Save record",
						() => {
							const old = E.store.get("timelout-records-v1", []),
								table = Array.isArray(old)
									? old.filter(
											(r) =>
												r &&
												typeof r.name === "string" &&
												Number.isFinite(r.score),
										)
									: [];
							table.push({
								name: (name || "PILOT").padEnd(6, " "),
								score: app.world.score,
								category,
								victory: app.world.outcome === "victory",
								wave: app.world.wave + 1,
							});
							table.sort((a, b) => b.score - a.score);
							E.store.set("timelout-records-v1", table.slice(0, 20));
							app.world.savedRecord = true;
							shell.back();
							records();
						},
					],
					["Back", back],
				],
			});
		draw();
	}
	return {
		shell,
		title,
		help,
		settings,
		dev,
		about,
		results,
		lobby,
		online,
		join,
		records,
	};
}
