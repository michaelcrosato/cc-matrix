import {
	U,
	HOME,
	LOADOUTS,
	DIFFICULTIES,
	BALANCE_ROWS,
	DEFAULT_BALANCE,
	STATIONS,
} from "../../content/operation.js";
const E = globalThis.My3D2dge;
export class Screens {
	constructor(app) {
		this.app = app;
		const game = app.game;
		const ownSettings = [
			{ key: "music", value: 0.1 },
			{ key: "glyphs", value: "playstation" },
			{
				key: "invertFlight",
				label: "Invert flight pitch",
				value: false,
				group: "Game",
			},
			{
				key: "aimSensitivity",
				label: "Aim sensitivity",
				value: 1,
				min: 0.25,
				max: 2,
				step: 0.05,
				group: "Game",
			},
			{
				key: "subtitleSize",
				label: "Subtitle size",
				value: 1,
				options: [
					[1, "Standard"],
					[2, "Large"],
				],
				group: "Game",
			},
			{ key: "subtitles", label: "Crew captions", value: true, group: "Game" },
			{
				key: "voice",
				label: "Crew voice",
				value: 0.7,
				min: 0,
				max: 1,
				step: 0.05,
				group: "Sound",
				apply: (g, v) => {
					g.audio.voiceVolume = v;
					g.audio.applyVolume();
				},
			},
			...BALANCE_ROWS.map(([key, label, min, max, step]) => ({
				key: "dev_" + key,
				label,
				min,
				max,
				step,
				value: DEFAULT_BALANCE[key],
				group: "Balance",
				apply: (g, v) => {
					if (app.sim && !app.session?.active) {
						app.sim.balance[key] = v;
					}
				},
			})),
		];
		game.settings.define({
			key: "music",
			...game.settings.spec("music"),
			value: 0.1,
		});
		game.settings.define({
			key: "glyphs",
			...game.settings.spec("glyphs"),
			value: "playstation",
		});
		for (const st of ownSettings.slice(2)) game.settings.define(st);
		game.settings.define({
			key: "devSeed",
			label: "Deterministic sortie seed",
			value: 1701,
			min: 1,
			max: 9999,
			step: 1,
			group: "Balance",
		});
		this.ui = new E.Shell(game, {
			theme: {
				scale: () => Math.max(1, Math.min(2.1, innerWidth / 900)),
				titleFont: "Impact, 'Arial Narrow', Arial, sans-serif",
				font: "Arial, Helvetica, sans-serif",
			},
			screens: {
				pause: {
					kicker: "THE CREW IS WAITING",
					title: "Aircraft on hold",
					actions: () => this.pauseActions(),
				},
				help: { title: "Crew handbook", sections: this.helpSections() },
			},
		});
		if (this.ui.root) {
			this.ui.root.addEventListener("pointerover", (e) => {
				const b = e.target.closest("button,input");
				if (
					b &&
					!b.disabled &&
					performance.now() - (app.lastPointerMotion || 0) < 160
				)
					b.focus({ preventScroll: true });
			});
		}
		const nativeStep = this.ui._step.bind(this.ui);
		this.ui._step = () => {
			const first = game.input;
			if (game.paused && app.coop)
				game.input = game.players[(game.pausedBy || 1) - 1] || first;
			try {
				nativeStep();
			} finally {
				game.input = first;
			}
		};
	}
	helpSections() {
		return [
			[
				"Your sortie",
				"Choose a route and payload. Raise power above 65% to take off. NAV HOLD flies the route; moving the flight stick takes manual control. Map commits a new route.",
			],
			[
				"Defend the right side",
				"Crew bearings are relative to the aircraft. 4 / 5 / 6 / 7 selects nose / starboard / tail / port. Mouse or right stick aims. Lead the diamond and use short bursts. Unattended crew only suppress.",
			],
			[
				"Deliver the parcel",
				"3 selects the downward sight. B opens the doors; X changes salvo size. The amber diamond predicts bomb impact using the same flight and wind as the falling bombs. Release deliberately with Space, click or R2. Disable two shipyard components.",
			],
			[
				"Bring everyone home",
				"M opens the operational map. Choose Larkspur and confirm to commit the return. Reach the home ring below 1,400 m for assisted landing. An early return is a complete, partial outcome.",
			],
			[
				"When things go wrong",
				"Bank or change height to evade marked flak. F uses one extinguisher. Hold J for 1.6 seconds to jettison payload. A damaged engine has less power; a jammed gun needs another mount. Coarse sight remains usable.",
			],
			[
				"Controller",
				"Left stick flies, right stick aims. R2 fires/releases, L2 is fine aim. L1/R1 adjust power; hold both for 1.6 seconds to jettison. Hold Triangle for stations; d-pad chooses gun bearings. Square opens map, Cross confirms, Circle backs, Options pauses. Settings includes Xbox symbols.",
			],
			[
				"Touch",
				"Drag on the left to fly and on the right to aim. Throttle and routine defense are assisted. Tap the contextual station, doors and release actions. Station → Emergency actions offers the extinguisher and held jettison. The menu button pauses. Bomb release and route choices remain yours.",
			],
			[
				"Couch co-op",
				"Choose Co-op with two pads, or keyboard/mouse plus a pad. Each pane has independent stations. A busy station requests a handover: its owner presses T / Cross to accept. Flight-command permission follows the pilot. Options pauses both panes.",
			],
			[
				"Online",
				"AI Hub supplies remote 1–2 player co-op. The host runs one bomber; guests send station/input commands. Local overlays leave the sortie running. Standalone co-op is local; internet room hosting is supplied by AI Hub.",
			],
		];
	}
	pauseActions() {
		return [
			["Crew handbook", () => this.ui.show("help")],
			["Dev Mode", () => this.dev()],
			...(this.app.session.active
				? []
				: [
						["Flight school", () => this.practiceMenu()],
						[
							"Abort to debrief",
							() => {
								this.ui.hide();
								this.app.sim.finish("abort");
							},
						],
					]),
			["About / Credits", () => this.about()],
		];
	}
	title() {
		const app = this.app;
		this.ui.hide();
		this.ui.show("title", {
			kicker: "A FOUR-ENGINE ARCADE SORTIE",
			name: "B-17\nBOMBER BUDDY",
			subtitle: "Deliver the parcel. Bring the crew home.",
			text: "One aircraft. Six stations. Everyone counts.",
			actions: [
				["Play", () => this.brief(false)],
				["Co-op", () => this.coop()],
				["Flight school", () => this.practiceMenu()],
				["Settings", () => this.ui.show("settings")],
				["About / Credits", () => this.about()],
			],
			meta: ["1–2 CREW", "12 MINUTES", "ORIGINAL PROCEDURAL ART"],
			footer: "Inspired by B-17 Bomber · 1982",
			back: () => this.title(),
		});
		app.resetIdle();
	}
	brief(coop = this.app.coop) {
		this.app.coop = coop;
		this.app.mode = "brief";
		this.ui.hide();
		this.ui.show("briefing", {
			kicker: "CHANNEL COMMAND / 06:40",
			title: "Operation Tidemark",
			text: "Disable two military components at Kestrel Shipyard. Return to Larkspur. The coastal battery and Cinder Works are optional.",
			actions: [
				[
					"Route: " + this.app.setup.route.toUpperCase(),
					() => {
						this.app.setup.route =
							this.app.setup.route === "direct" ? "dogleg" : "direct";
						this.app.sim.selectRoute(this.app.setup.route, false);
						this.brief(coop);
					},
				],
				[
					"Payload: " + LOADOUTS[this.app.setup.loadout].name,
					() => {
						this.app.setup.loadout = (this.app.setup.loadout + 1) % 3;
						this.brief(coop);
					},
				],
				[
					"Difficulty: " + DIFFICULTIES[this.app.setup.difficulty].name,
					() => {
						this.app.setup.difficulty = (this.app.setup.difficulty + 1) % 3;
						this.brief(coop);
					},
				],
				{
					label: "Launch sortie",
					fn: () => this.app.startSortie(),
					primary: true,
				},
				["Back", () => this.app.toTitle()],
			],
			sections: [
				[
					"Load / reserve",
					LOADOUTS[this.app.setup.loadout].detail +
						"\nEstimated return reserve: " +
						this.app.forecast() +
						"%.",
				],
				[
					"Crew drill",
					"Take off → answer bearings → evade flak → open doors → release → plot HOME. F: one extinguisher. Hold J: jettison.",
				],
			],
			back: () => this.app.toTitle(),
		});
	}
	coop() {
		this.app.mode = "menu";
		this.ui.show("coop", {
			kicker: "ONE BOMBER / TWO CREW",
			title: "Bring a buddy",
			text: "Horizontal split screen. Two standard pads, or keyboard/mouse plus one pad. Crew One starts as pilot; Crew Two starts at the tail gun. All stations can be handed over.",
			actions: [
				["Ready crew → briefing", () => this.brief(true)],
				[
					"Back",
					() => {
						this.app.mode = "title";
						this.ui.back();
					},
				],
			],
		});
	}
	practiceMenu() {
		this.app.mode = this.app.mode === "play" ? "play" : "menu";
		this.ui.show("school", {
			kicker: "LARKSPUR FLIGHT SCHOOL",
			title: "Learn the crew’s jobs",
			text: "Short exercises use the same aircraft, weapons and damage rules as the full sortie. Practice does not record a score.",
			actions: [
				["Directional gunnery", () => this.app.startSortie("gunnery")],
				["Bomb calibration", () => this.app.startSortie("bombing")],
				["Damaged return", () => this.app.startSortie("return")],
				["Back", () => this.ui.back()],
			],
		});
	}
	results() {
		const s = this.app.sim,
			r = s.result;
		this.ui.hide();
		this.ui.show("results", {
			kicker: r.cheated
				? "UNRANKED / PRACTICE OR DEV"
				: "LARKSPUR OPERATIONS / DEBRIEF",
			title: r.title,
			emblem: r.won ? "✦" : "◇",
			text: r.returned
				? "Aircraft recovered. Engines serviced, ammunition replenished, crew accounted for. Another sortie starts with a repaired aircraft and a new seed."
				: r.reason === "deadline"
					? "The sortie window has closed. Current damage and target progress have been recorded."
					: "The operation is over. Review the flight school or launch a fresh aircraft.",
			stats: [
				[r.score.toLocaleString(), "SCORE"],
				[s.stats.kills, "FIGHTERS"],
				[s.stats.targets, "COMPONENTS"],
				[r.accuracy + "%", "BOMB ACCURACY"],
			],
			sections: [
				[
					"Score ledger",
					`Targets / defense ${r.base} · Safe return +${r.survival} · Accurate ordnance +${r.precision} · Damage −${r.damage} · Wasted / jettisoned −${r.wasted}`,
				],
			],
			medals: [
				["Primary disabled", r.primary],
				["Crew home", r.returned],
				["Defense answered", s.stats.defense > 0],
			],
			actions: [
				["Repair, rearm & fly again", () => this.app.startSortie()],
				["Flight school", () => this.practiceMenu()],
				["Title", () => this.app.toTitle()],
			],
			back: () => this.app.toTitle(),
		});
	}
	dev() {
		if (this.app.session.active) {
			this.ui.show("dev", {
				title: "Session authority",
				text: "World-changing dev tools are available in standalone play. AI Hub rounds use the shared authoritative rules. Display, comfort and audio settings remain available.",
				actions: [
					["Local settings", () => this.ui.show("settings")],
					["Back", () => this.ui.back()],
				],
			});
			return;
		}
		const a = this.app,
			s = a.sim;
		s.cheated = true;
		this.ui.show("dev", {
			kicker: "DEV MODE / RUN MARKED UNRANKED",
			title: "Aircraft workbench",
			text: "Balance values are live. Pause freezes simulation; Step advances exactly 1/120 s. World tools use the real sortie systems.",
			rows: [...BALANCE_ROWS.map(([k]) => "dev_" + k), "devSeed"],
			actions: [
				[
					"Invulnerability: " + (s.cheats.invulnerable ? "ON" : "OFF"),
					() => {
						s.cheats.invulnerable = !s.cheats.invulnerable;
						this.dev();
					},
				],
				[
					"Infinite resources: " + (s.cheats.infinite ? "ON" : "OFF"),
					() => {
						s.cheats.infinite = !s.cheats.infinite;
						this.dev();
					},
				],
				[
					"Free exterior camera: " + (s.cheats.freeCamera ? "ON" : "OFF"),
					() => {
						s.cheats.freeCamera = !s.cheats.freeCamera;
						this.dev();
					},
				],
				[
					"Attack / trigger volumes: " + (s.cheats.debug ? "ON" : "OFF"),
					() => {
						s.cheats.debug = !s.cheats.debug;
						this.dev();
					},
				],
				[
					"Step simulation 1/120 s",
					() => {
						s.step(1 / 120);
						a.view.step(1 / 120);
					},
				],
				["Jump: coast", () => a.devJump("coast")],
				["Jump: bomb approach", () => a.devJump("bombs")],
				["Jump: home approach", () => a.devJump("home")],
				[
					"Spawn fighter / next bearing",
					() => {
						a.devBearing = (a.devBearing + 1) % 4;
						s.spawnWave(
							a.devBearing,
							a.devBearing === 2 ? "pursuit" : "crossing",
							1,
						);
					},
				],
				["Spawn flak warning", () => s.spawnFlak()],
				["Engine fire", () => s.applyDamage("fire")],
				["Jam current gun", () => s.applyDamage("gun")],
				["Damage sight", () => s.applyDamage("sight")],
				["Repair aircraft", () => s.repair()],
				[
					"Reset live balance",
					() => {
						for (const [k, v] of Object.entries(DEFAULT_BALANCE))
							a.game.settings.set("dev_" + k, v);
						this.dev();
					},
				],
				[
					"Restart selected deterministic seed",
					() => {
						a.nextSeed = a.game.settings.devSeed;
						a.startSortie();
					},
				],
				["Mission data workbench", () => this.editor()],
				["Export state", () => a.download("bomber-state.json", s.snapshot())],
				["Back", () => this.ui.back()],
			],
		});
	}
	editor() {
		const a = this.app,
			s = a.sim,
			t = s.operation.targets[a.editTarget || 0];
		this.ui.show("editor", {
			kicker: "MISSION AUTHORING / EXPORTABLE JSON",
			title: t.name,
			text: `Target ${Math.round(t.x / U)}m east, ${Math.round(t.y / U)}m south. Moving a target also moves every component. Debug volumes show encounter regions. Exported data can be imported below.`,
			actions: [
				[
					"Select next target",
					() => {
						a.editTarget = ((a.editTarget || 0) + 1) % s.targets.length;
						this.editor();
					},
				],
				["Move target east 100 m", () => this.moveTarget(100 * U, 0)],
				["Move target west 100 m", () => this.moveTarget(-100 * U, 0)],
				["Move target north 100 m", () => this.moveTarget(0, -100 * U)],
				["Move target south 100 m", () => this.moveTarget(0, 100 * U)],
				[
					"Move current waypoint east 100 m",
					() => {
						s.routeTarget().x += 100 * U;
						this.editor();
					},
				],
				[
					"Preview trigger volumes",
					() => {
						s.cheats.debug = true;
						s.cheats.freeCamera = true;
						this.ui.hide();
						a.game.resume();
					},
				],
				[
					"Export operation JSON",
					() => a.download("operation-tidemark.json", s.operation),
				],
				["Import operation JSON", () => a.importOperation()],
				["Back", () => this.ui.back()],
			],
		});
	}
	moveTarget(dx, dy) {
		const a = this.app,
			i = a.editTarget || 0,
			t = a.sim.targets[i],
			op = a.sim.operation.targets[i];
		t.x += dx;
		t.y += dy;
		op.x += dx;
		op.y += dy;
		for (const p of t.parts) {
			p.x += dx;
			p.y += dy;
		}
		this.editor();
	}
	about() {
		const info = globalThis.RELEASE_INFO || {},
			src = info.sourceInformation || {};
		const sections = [
			[
				"Source Information",
				Object.entries(src)
					.map(([k, v]) => k + ": " + v)
					.join("\n"),
			],
			[
				"Research sources",
				"Original instructions and developer history: history.blueskyrangers.com. Preserved screenshots: intvfunhouse.com. Full links and research evidence are in the development docs. Original audio timbres: unknown.",
			],
			[
				"Testing Feedback",
				(info.testingFeedback || ["unknown"])
					.map((v, i) => i + 1 + ". " + v)
					.join("\n"),
			],
			[
				"Engine Feedback",
				(
					info.engineFeedback || [
						"Native my-3D2dge foundation; original simulation and procedural aircraft.",
					]
				)
					.map((v, i) => i + 1 + ". " + v)
					.join("\n"),
			],
			[
				"Prompt Feedback",
				(info.promptFeedback || ["Built from PLAN.md and TASK.md."])
					.map((v, i) => i + 1 + ". " + v)
					.join("\n"),
			],
			[
				"Credits and licenses",
				"Original game, design, art, animation, music, effects and gibberish voices created in code. Inspired by B-17 Bomber (Mattel Electronics, 1982), unaffiliated. my-3D2dge v0.89.1: MIT. Three.js 0.182.0: MIT. Rapier 0.19.3: Apache-2.0. AI Hub client 1.4.0: upstream notices retained in this HTML. Usage: added on import.",
			],
		];
		this.ui.show("about", {
			kicker: "MADE OF GEOMETRY, MATH & FOUR ENGINES",
			title: "About / Credits",
			text: "B-17 Bomber Buddy • A vulnerable aircraft and the people who keep it flying.",
			sections,
			actions: [
				[
					"License texts",
					() =>
						this.ui.show("licenses", {
							title: "Open-source licenses",
							sections: Object.entries(globalThis.RELEASE_LICENSES || {}),
							actions: [["Back", () => this.ui.back()]],
						}),
				],
				["Back", () => this.ui.back()],
			],
		});
		if (this.ui.root)
			for (const p of this.ui.root.querySelectorAll(".esh-mod p"))
				p.style.whiteSpace = "pre-line";
	}
}
