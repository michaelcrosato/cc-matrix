import { STAGES, TUNING_SPECS } from "../../content/stages.js";
import {
	clone,
	enterStage,
	spawnRival,
	spawnTarget,
	step,
	tune,
} from "../sim/world.js";
export function installDev(app) {
	const { game, ui } = app,
		S = game.settings;
	for (const [k, sp] of Object.entries(TUNING_SPECS))
		S.define({
			key: "dev_" + k,
			label: sp.label,
			group: "Controls",
			type: "slider",
			value: sp.value,
			min: sp.min,
			max: sp.max,
			step: sp.step,
			unit: sp.unit,
			apply: (_g, v) => {
				if (app.devOpen && !app.readOnly())
					app.pending.push(() => tune(app.world, k, v));
			},
		});
	S.define({
		key: "devStage",
		label: "Encounter (restart applies)",
		group: "Controls",
		value: 0,
		options: STAGES.map((s, i) => [i, `${i + 1}. ${s.name}`]),
	});
	S.define({
		key: "devSeed",
		label: "Seed (restart applies)",
		group: "Controls",
		value: 4117,
		min: 0,
		max: 99999,
		step: 1,
	});
	S.define({
		key: "devTime",
		label: "Preview speed",
		group: "Controls",
		value: 1,
		min: 0.25,
		max: 2,
		step: 0.25,
		unit: " x",
		apply: (_g, v) => {
			if (app.devOpen && !app.readOnly()) {
				app.world.assisted = true;
				game.timeScale = v;
			}
		},
	});
	S.define({
		key: "devInvincible",
		label: "Keep every bee",
		group: "Controls",
		value: false,
		apply: (_g, v) => {
			if (app.devOpen && !app.readOnly()) {
				app.pending.push(() => {
					app.world.dev.invulnerable = v;
					app.world.assisted = true;
				});
			}
		},
	});
	S.define({
		key: "devCollision",
		label: "Collision / contact outlines",
		group: "Controls",
		value: false,
		apply: (_g, v) => {
			if (app.garden) app.garden.overlay = v;
		},
	});
	S.define({
		key: "devLabels",
		label: "Enemy state labels",
		group: "Controls",
		value: false,
		apply: (_g, v) => {
			if (app.garden) app.garden.labels = v;
		},
	});
	const exportSnapshot = () => {
		const text = JSON.stringify(
			{ world: app.world, network: app.net?.metrics || null },
			null,
			2,
		);
		ui.show("snapshot", {
			kicker: "Developer / read only",
			title: "State snapshot",
			text: "Select and copy this snapshot for a reproducible report.",
			actions: [
				[
					"Copy snapshot",
					() => {
						globalThis.navigator?.clipboard?.writeText(text).catch(() => {});
					},
				],
				["Back", () => ui.back()],
			],
		});
		if (ui.root) {
			const box = ui.root.querySelector(".esh-mod"),
				ta = document.createElement("textarea");
			ta.value = text;
			ta.readOnly = true;
			ta.setAttribute("aria-label", "State snapshot");
			box.append(ta);
		}
	};
	const groups = [
		["Flight & sting", ["speed", "focusMove", "sting", "focusPower", "health"]],
		[
			"Recovery & damage",
			["recoveryDelay", "recovery", "lossInterval", "rayWidth"],
		],
		[
			"Rival pressure",
			["warning", "hunterSpeed", "maturation", "spawnInterval"],
		],
	];
	function restart() {
		const index = +S.devStage;
		app.world.seed = +S.devSeed;
		app.world.random = app.world.seed;
		app.world.assisted = true;
		app.bestSaved = false;
		enterStage(app.world, index);
		app.garden?.reset(app.world);
		app.audio.reset(app.world);
		app.clearInput();
	}
	app.openDev = () => {
		app.devOpen = true;
		const readOnly = app.readOnly();
		ui.show("dev", {
			kicker: readOnly
				? "Developer / read only"
				: "Developer / marks run assisted",
			title: "Garden workbench",
			text: readOnly
				? "Live online round. Gameplay changes are disabled. The shared world keeps moving."
				: `Encounter ${app.world.stage + 1} • seed ${app.world.seed}\nChanges take effect at a simulation boundary. Sliders are in world units.`,
			rows: ["devCollision", "devLabels"],
			actions: readOnly
				? [
						["Network diagnostics", diagnostics],
						["Export snapshot", exportSnapshot],
						["Back", () => ui.back()],
					]
				: [
						...groups.map(([label, keys]) => [
							label,
							() =>
								ui.show("tuning", {
									title: label,
									rows: keys.map((k) => "dev_" + k),
									actions: [
										[
											"Reset tuning to defaults",
											() => {
												for (const [k, sp] of Object.entries(TUNING_SPECS))
													S.set("dev_" + k, sp.value);
												ui.show("tuning", {});
											},
										],
										["Back", () => ui.back()],
									],
								}),
						]),
						[
							"Encounter & seed",
							() => {
								ui.show("encounter-tools", {
									title: "Encounter & seed",
									rows: ["devStage", "devSeed"],
									text: "Choose a seed and encounter, then restart to apply.",
									actions: [
										["Restart selected encounter", restart],
										[
											"Random seed",
											() => {
												S.set(
													"devSeed",
													crypto.getRandomValues(new Uint32Array(1))[0] %
														100000,
												);
												ui.show("encounter-tools", {});
											},
										],
										["Back", () => ui.back()],
									],
								});
							},
						],
						[
							"Playback & cheats",
							() =>
								ui.show("playback", {
									title: "Playback & cheats",
									rows: ["devTime", "devInvincible"],
									text: "Live preview keeps the world running behind these tools. Closing the workbench restores normal speed.",
									actions: [
										[
											"Single simulation step",
											() => {
												app.applyPending();
												app.world.assisted = true;
												step(app.world, []);
												app.garden?.update(1 / 120, app.world);
											},
										],
										[
											"Toggle live preview",
											() => {
												game.live = !game.live;
												ui.show("playback", {});
											},
										],
										[
											"Refill both rays",
											() => {
												app.world.assisted = true;
												for (const p of app.world.players)
													if (p.bees) p.charge = 1;
											},
										],
										[
											"Spawn rival with warning",
											() => {
												app.world.assisted = true;
												spawnRival(app.world);
											},
										],
										[
											"Spawn Leftenant",
											() => {
												app.world.assisted = true;
												spawnTarget(app.world, { type: "left", entrance: 0 });
											},
										],
										[
											"Spawn Righto",
											() => {
												app.world.assisted = true;
												spawnTarget(app.world, { type: "right", entrance: 1 });
											},
										],
										["Back", () => ui.back()],
									],
								}),
						],
						["Export snapshot", exportSnapshot],
						["Back", () => ui.back()],
					],
		});
	};
	function diagnostics() {
		ui.show("diagnostics", {
			title: "Network diagnostics",
			text: JSON.stringify(
				app.net?.metrics || { mode: app.mode, tick: app.world.tick },
				null,
				2,
			),
			actions: [
				["Refresh", diagnostics],
				["Back", () => ui.back()],
			],
		});
	}
	app.closeDev = () => {
		if (!app.devOpen) return;
		app.devOpen = false;
		game.timeScale = 1;
		game.live = app.isNetwork();
		app.clearInput();
	};
}
