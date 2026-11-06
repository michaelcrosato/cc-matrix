import { BALANCE_SPECS } from "./data/balance.js";
import interview from "./data/interview.json";

const E = globalThis.My3D2dge;
export class Screens {
	constructor(app) {
		this.app = app;
		this.game = app.game;
		this.ui = new E.Shell(this.game, {
			theme: {
				accent: "#99ead3",
				ink: "#f2eddf",
				muted: "#a4b5b9",
				paper: "#10212bf5",
				line: "#3b565d",
				font: '"Courier New", monospace',
				titleFont: '"Arial Black", Arial, sans-serif',
				scale: 1,
			},
			screens: {
				pause: {
					kicker: "ORBITAL DEFENCE DIVISION",
					text: () =>
						app.hub?.active
							? "SHARED WORLD CONTINUES / YOUR PILOT HOLDS POSITION"
							: "Take a breath. The ring can wait.",
				},
				help: {
					title: "Pilot field manual",
					kicker: "READ BEFORE CONFIDENTLY DEPARTING",
					sections: [
						[
							"THE RING",
							"A complete blue ring protects one impact. Ram to destroy a threat. Fire spends your shield. You move at half speed until the whole ring returns. Holding fire keeps you exposed.",
						],
						[
							"THE CANNON",
							"The white bead moves clockwise toward your requested bearing. The little gold arrow marks your request. Your shots leave the white bead.",
						],
						[
							"THE FIELD",
							"Two tethered drifters fuse into one hunter. A blast can set off a chain. Gunship missiles also destroy drifters: use them as cover.",
						],
						[
							"YOUR WINGMATE",
							"A downed pilot becomes a wreck. Touch it with a READY shield to rescue them with one hull. Both down: mission over.",
						],
						[
							"COMMAND",
							"Gold emitters are open. Shoot, ram or chain into them. Survive three command phases, then fly to extraction.",
						],
						[
							"CONTROLS",
							"Left stick / WASD or arrows: move. Right stick / mouse: aim. R2 / Cross / Space / click: fire. Options / Escape: menu. Touch: left thumb move; right thumb aim with safe-burst assistance.",
						],
						[
							"AI HUB",
							"Sessions launch automatically. Menus are local; the world keeps moving. World-changing Dev tools are disabled. Create + Options stays reserved for Hub.",
						],
					],
				},
			},
		});
		if (this.ui.root) {
			this.ui.root.id = "orbit-ui";
			this.ui.root.addEventListener("pointerover", (e) => {
				if (
					e.target.tagName === "BUTTON" &&
					e.target !== document.activeElement
				)
					e.target.focus({ preventScroll: true });
			});
		}
		for (const sp of BALANCE_SPECS)
			this.game.settings.define({
				...sp,
				key: "dev_" + sp.key,
				group: "Dev " + sp.group,
				apply: () => {},
			});
		this.game.settings.define({
			key: "dev_seek",
			label: "Preview time (seconds)",
			group: "Dev",
			value: 10,
			min: 0,
			max: 90,
			step: 1,
		});
		this.name = app.records.data.name;
		this.letter = 0;
	}
	title() {
		const a = this.app;
		this.ui.hide();
		this.ui.show("title", {
			name: "UFOh\nOrbit",
			kicker: "AN UNIDENTIFIED FLYING OVERACHIEVER",
			subtitle: "One shot. No shield. Your move.",
			actions: [
				["Start Mission", () => a.startRun("mission")],
				["Score Attack", () => a.startRun("score")],
				["Local Co-op", () => this.join()],
				["Settings", () => this.ui.show("settings")],
				["About / Credits", () => this.about(0)],
			],
			meta: ["1–2 PILOTS", "FOUR SECTORS", "INFINITE CONFIDENCE"],
			footer: `MISSION BEST ${a.records.best("mission")}  /  ATTACK BEST ${a.records.best("score")}`,
		});
	}
	join(error = "") {
		this.ui.show("join", {
			kicker: "BRING A WINGMATE",
			title: "Two saucers. One team.",
			text:
				error ||
				"Pilot 1 keeps their own controls. Pilot 2 gets a second device. Touch a wreck with a READY ring to rescue it.",
			actions: [
				["Keyboard + controller", () => this.pair("keyboard-pad")],
				["Two controllers", () => this.pair("two-pad")],
				["Shared keyboard", () => this.pair("keyboard")],
				["Back", () => this.ui.back()],
			],
			sections: [
				[
					"SHARED KEYBOARD",
					"P1: WASD + F fire. P2: arrows + period fire. Movement requests cannon aim. Controller pairing stays fixed after a disconnect.",
				],
			],
		});
	}
	pair(kind) {
		const error = this.app.controls.pairing(kind);
		if (error) {
			this.join(error);
			return;
		}
		this.ui.show("co-mode", {
			kicker: "WINGMATES READY",
			title: "Choose your orders",
			text: "Score is shared. Every pilot keeps their contribution.",
			actions: [
				["Launch Mission", () => this.app.startRun("mission", 2, true)],
				["Score Attack", () => this.app.startRun("score", 2, true)],
				["Back", () => this.ui.back()],
			],
		});
	}
	about(page = 0, part = 0) {
		const s = interview.sourceInformation;
		const all = [
			[
				"Source Information",
				Object.entries(s).map(([k, v]) => [
					k === "usage" ? "Usage" : k.charAt(0).toUpperCase() + k.slice(1),
					v,
				]),
			],
			[
				"Testing Feedback",
				interview.testingFeedback.map((v, i) => [
					[
						"Issues caught",
						"Critical issues",
						"Most helpful test",
						"Least helpful test",
					][i],
					v,
				]),
			],
			[
				"Engine Feedback",
				interview.engineFeedback.map((v, i) => [
					[
						"Liked most",
						"Wrong assumptions",
						"Built for this game",
						"Hardest part",
						"Engine modifications",
						"Suggested improvement",
					][i],
					v,
				]),
			],
			[
				"Prompt Feedback",
				interview.promptFeedback.map((v, i) => [
					["Liked most", "Confusing", "Hardest part", "Suggested improvement"][
						i
					],
					v,
				]),
			],
		];
		const [title, entries] = all[page];
		const per =
			typeof window !== "undefined" && window.innerWidth < 700 ? 1 : 2;
		const parts = Math.ceil(entries.length / per);
		part = ((part % parts) + parts) % parts;
		const sections = entries.slice(part * per, (part + 1) * per);
		this.ui.show("about", {
			kicker: `FIELD RECORD ${page + 1} OF 4 / DETAILS ${part + 1} OF ${parts}`,
			title,
			text: "Inspired by UFO! (1981). Original code and art: OpenAI gpt-6.1-sol. Engine: Michael Crosato.",
			sections,
			actions: [
				["Next page", () => this.about((page + 1) % 4)],
				["More details", () => this.about(page, part + 1)],
				["Previous page", () => this.about((page + 3) % 4)],
				["Back", () => this.ui.back()],
			],
			footer:
				"my-3D2dge: MIT. Copyright (c) 2026 Michael Crosato. Full permission and warranty notice embedded in this HTML. Usage: added on import.",
		});
	}
	results() {
		const a = this.app,
			w = a.world;
		this.ui.hide();
		this.ui.show("results", {
			kicker:
				w.status === "victory"
					? "MISSION ACCOMPLISHED"
					: "SAUCER RECOVERY DEPARTMENT",
			title:
				w.status === "victory"
					? "Unreasonably successful."
					: "Confidence exceeded hull.",
			text:
				w.status === "victory"
					? "The machinery has been persuaded. Return with your outrageous score."
					: "Next time: let the whole ring return.",
			stats: [
				[w.score, "TEAM SCORE"],
				[w.bestChain, "BEST CHAIN"],
				[
					`${Math.floor(w.time / 60)}:${String(Math.floor(w.time % 60)).padStart(2, "0")}`,
					"FLIGHT TIME",
				],
				...[...(w.players || [])].map((p, i) => [
					p.score || 0,
					"P" + (i + 1) + " CONTRIBUTION",
				]),
			],
			actions: [
				...(!w.debug && !a.attract
					? [["Record six-letter name", () => this.nameEntry()]]
					: []),
				["Fly again", () => a.startRun(w.mode, w.players.length, true)],
				["Mode selection", () => a.toTitle()],
				["About / Credits", () => this.about(0)],
			],
			footer: w.debug
				? "DEV FLIGHT / SCORES NOT RECORDED"
				: a.recorded
					? "SCORE RECORDED"
					: "NO UPGRADES. JUST A BETTER PLAN.",
		});
	}
	nameEntry() {
		const a = this.app,
			alphabet = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		this.name = this.name.slice(0, 6).padEnd(6, " ");
		const change = (n) => {
			const l = this.name.split("");
			l[this.letter] =
				alphabet[
					(alphabet.indexOf(l[this.letter]) + n + alphabet.length) %
						alphabet.length
				];
			this.name = l.join("");
			this.nameEntry();
		};
		this.ui.show("name", {
			kicker: "SIX LETTERS / MAXIMUM GLORY",
			title: this.name
				.split("")
				.map((c, i) =>
					i === this.letter
						? "[" + (c === " " ? "_" : c) + "]"
						: c === " "
							? "_"
							: c,
				)
				.join(" "),
			text: "Type six letters, or use the controls below. Controller: choose a letter, turn it, then move to the next.",
			actions: [
				["Letter +", () => change(1)],
				["Letter -", () => change(-1)],
				[
					"Next position",
					() => {
						this.letter = (this.letter + 1) % 6;
						this.nameEntry();
					},
				],
				[
					"Previous position",
					() => {
						this.letter = (this.letter + 5) % 6;
						this.nameEntry();
					},
				],
				[
					"Save score",
					() => {
						a.records.add(a.world.mode, this.name, a.world.score, a.world);
						a.recorded = true;
						this.results();
					},
				],
				["Back", () => this.ui.back()],
			],
		});
	}
	typeName(e) {
		if (this.ui.screen !== "name") return false;
		if (/^[a-zA-Z0-9 ]$/.test(e.key)) {
			const s = this.name.split("");
			s[this.letter] = e.key.toUpperCase();
			this.name = s.join("");
			this.letter = (this.letter + 1) % 6;
			this.nameEntry();
			return true;
		}
		if (e.key === "Backspace") {
			this.letter = (this.letter + 5) % 6;
			const s = this.name.split("");
			s[this.letter] = " ";
			this.name = s.join("");
			this.nameEntry();
			return true;
		}
		return false;
	}
	dev() {
		const a = this.app;
		if (a.hub?.active) {
			this.ui.show("diagnostics", {
				kicker: "AI HUB / READ ONLY",
				title: "Link diagnostics",
				sections: Object.entries(a.hub.snapshot()).map(([k, v]) => [
					k,
					typeof v === "object" ? JSON.stringify(v) : String(v),
				]),
				actions: [
					["Refresh", () => this.dev()],
					["Back", () => this.ui.back()],
				],
			});
			return;
		}
		a.world.debug = true;
		this.ui.show("dev", {
			kicker: "DEV FLIGHT / RECORDS DISABLED",
			title: "Flight laboratory",
			text: "Changes apply on resume. Hull and component health clamp to valid limits. Export a snapshot to inspect exact state.",
			actions: [
				["Combat tools", () => this.devCombat()],
				["Flight tuning", () => this.tuning("Flight")],
				["Shield tuning", () => this.tuning("Shield")],
				["Threat tuning", () => this.tuning("Threats")],
				["Command tuning", () => this.tuning("Command")],
				["Encounter desk", () => this.encounters()],
				["Simulation controls", () => this.devClock()],
				[
					"Reset all tuning",
					() => {
						for (const s of BALANCE_SPECS)
							this.game.settings.set("dev_" + s.key, s.value);
						a.command("resetBalance");
						this.dev();
					},
				],
				["Back", () => this.ui.back()],
			],
		});
	}
	timeline() {
		const a = this.app,
			w = a.world;
		this.ui.show("timeline", {
			kicker: "SECTOR " + (w.sector + 1) + " / WAVE " + (w.wave + 1),
			title: "Wave + timeline",
			text: "Preview any authored wave. The seek runs actual combat with the demonstration pilot and marks the flight as Dev.",
			rows: ["dev_seek"],
			actions: [
				...(w.content.sectors[w.sector]?.waves || []).map((wave, i) => [
					wave.title,
					() => a.command("wave", { value: i }),
				]),
				[
					"Advance preview",
					() => {
						a.preview(this.game.settings.dev_seek);
						this.timeline();
					},
				],
				["Single step", () => a.stepOnce()],
				["Back", () => this.ui.back()],
			],
		});
	}
	tuning(group) {
		const specs = BALANCE_SPECS.filter((s) => s.group === group);
		this.ui.show("tuning", {
			kicker: "LIVE VARIABLES / " + group.toUpperCase(),
			title: group + " tuning",
			text: specs.map((s) => `${s.label}: ${s.min}–${s.max}`).join(" / "),
			rows: specs.map((s) => "dev_" + s.key),
			actions: [
				[
					"Reset page",
					() => {
						for (const s of specs)
							this.game.settings.set("dev_" + s.key, s.value);
						this.tuning(group);
					},
				],
				[
					"Back",
					() => {
						this.app.applyTuning();
						this.ui.back();
					},
				],
			],
		});
	}
	devCombat() {
		const a = this.app;
		this.ui.show("combat-tools", {
			kicker: "DESTRUCTIVE CURIOSITY",
			title: "Combat tools",
			text: `Invulnerability ${a.world.invulnerable ? "ON" : "OFF"}. Every tool uses the live simulation.`,
			actions: [
				[
					"Toggle invulnerability",
					() => {
						a.command("invuln");
						this.devCombat();
					},
				],
				["Refill hull + shield", () => a.command("refill")],
				[
					"Spawn drifter cluster",
					() =>
						a.command("spawn", {
							type: "drifter",
							count: 6,
							formation: "cluster",
						}),
				],
				["Spawn hunter", () => a.command("spawn", { type: "hunter" })],
				["Spawn gunship", () => a.command("spawn", { type: "gunship" })],
				["Clear threats + shots", () => a.command("clear")],
				[
					"Collision + aim overlay",
					() => {
						a.present.debugOverlay = !a.present.debugOverlay;
					},
				],
				[
					"Export snapshot",
					() => a.download("orbit-snapshot.json", a.snapshot()),
				],
				[
					"Export input replay",
					() => a.download("orbit-replay.json", a.replay()),
				],
				["Back", () => this.ui.back()],
			],
		});
	}
	devClock() {
		const a = this.app;
		this.ui.show("clock-tools", {
			kicker: "TIME IS A DESIGN VARIABLE",
			title: "Simulation controls",
			text: "Single step advances one native 1/120-second update while paused.",
			actions: [
				["Single step", () => a.stepOnce()],
				[
					"Slow / 0.25x",
					() => {
						a.speed = 0.25;
					},
				],
				[
					"Normal / 1x",
					() => {
						a.speed = 1;
					},
				],
				[
					"Fast / 4x",
					() => {
						a.speed = 4;
					},
				],
				["Reset seed", () => a.command("resetSeed", { value: a.world.seed })],
				["Restart encounter", () => a.command("restart")],
				["Back", () => this.ui.back()],
			],
		});
	}
	encounters() {
		const a = this.app;
		this.ui.show("encounters", {
			kicker: "CONTENT / AUTHORING DESK",
			title: "Encounter desk",
			actions: [
				...[
					"First contact",
					"Drifting field",
					"Crossing signals",
					"Command craft",
				].map((s, i) => [s, () => a.command("sector", { sector: i })]),
				...["I", "II", "III"].map((s, i) => [
					"Boss phase " + s,
					() => a.command("phase", { phase: i + 1 }),
				]),
				["Wave + timeline preview", () => this.timeline()],
				["Export content JSON", () => a.exportContent()],
				["Import content JSON", () => a.importContent()],
				["Back", () => this.ui.back()],
			],
			text: "Select a sector to preview its formations. Import validates the entire file and keeps the working deck on error.",
		});
	}
}
export { interview };
