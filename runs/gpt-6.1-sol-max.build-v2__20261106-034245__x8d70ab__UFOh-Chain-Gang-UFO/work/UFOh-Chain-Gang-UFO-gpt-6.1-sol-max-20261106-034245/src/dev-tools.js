import { BALANCE_PAGES, DEFAULT_BALANCE, SECTORS } from "./data/content.js";

export function createDevTools(app) {
	const { game } = app;
	let speed = 1,
		overlay = false,
		aim = false,
		page = 0,
		selected = 0,
		formation = "chain";
	const world = () => app.world,
		session = () => app.hub?.active;
	const act = (name, data = {}) => {
		if (session()) return false;
		const r = world()?.command(name, data);
		app.flushEvents();
		return r;
	};
	for (const p of BALANCE_PAGES)
		for (const [key, label, min, max, step] of p.rows)
			game.settings.define({
				key: `lab_${key}`,
				label,
				type: "slider",
				group: "Flight lab",
				value: DEFAULT_BALANCE[key],
				min,
				max,
				step,
				apply: (_g, v) => {
					if (world() && !session() && game.shell?.screen?.startsWith("dev"))
						act("balance", { key, value: v });
				},
			});
	game.settings.define({
		key: "lab_timeline",
		label: "Encounter time (seconds)",
		type: "slider",
		group: "Flight lab",
		value: 0,
		min: 0,
		max: 60,
		step: 1,
		apply: (_g, v) => {
			if (world() && !session() && game.shell?.screen === "devTimeline")
				seek(v);
		},
	});
	function show() {
		const w = world();
		if (!w) return;
		if (session()) {
			game.shell.show("devDiagnostics", {
				kicker: "AI HUB / INSPECTION",
				title: "Shared flight recorder",
				text: () => JSON.stringify(app.hub.diagnostics(), null, 2),
				actions: [["Back", () => game.shell.back()]],
			});
			return;
		}
		w.state.debug = true;
		game.shell.show("dev", {
			kicker: "FLIGHT LAB / UNRANKED",
			title: "A little more confidence",
			text: () =>
				`Encounter ${w.state.wave + 1}: ${w.currentWave().name}. Time ${w.state.waveTime.toFixed(1)}s. Seed ${w.state.seed}. World speed ${speed}x.`,
			actions: [
				["Pilot & cannon sliders", () => sliders(0)],
				["Threat sliders", () => sliders(1)],
				["Command craft sliders", () => sliders(2)],
				["Encounter & timeline", () => encounters()],
				["Spawn & clear", () => spawns()],
				[
					`Invulnerability: ${w.invulnerable ? "ON" : "OFF"}`,
					() => {
						act("invulnerable", { value: !w.invulnerable });
						show();
					},
				],
				[
					"Refill hull & shield",
					() => {
						act("refill");
						toast("Hull and rings restored.");
					},
				],
				[
					"Single step / 1 frame",
					() => {
						app.stepWorld(1 / 120, true);
						show();
					},
				],
				[
					`Simulation speed: ${speed}x`,
					() => {
						speed = speed === 1 ? 0.25 : speed === 0.25 ? 2 : 1;
						show();
					},
				],
				[
					`Collision overlay: ${overlay ? "ON" : "OFF"}`,
					() => {
						overlay = !overlay;
						show();
					},
				],
				[
					`Aim overlay: ${aim ? "ON" : "OFF"}`,
					() => {
						aim = !aim;
						show();
					},
				],
				[
					"Restart this encounter",
					() => {
						act("restart");
						toast("Encounter restarted.");
					},
				],
				[
					"Reset this seed",
					() => {
						app.resetSeed(w.state.seed);
						show();
					},
				],
				[
					"Export snapshot & input replay",
					() =>
						download(
							"ufoh-flight-recorder.json",
							JSON.stringify(
								{ snapshot: w.snapshot(), replay: w.replay, contentVersion: 1 },
								null,
								2,
							),
						),
				],
				["Content JSON editor", () => editor()],
				[
					"Reset all balance defaults",
					() => {
						act("resetBalance");
						sync();
						toast("Canonical balance restored.");
					},
				],
				["Back to pause", () => game.shell.back()],
			],
		});
	}
	function toast(t) {
		game.shell.toast("Flight lab", t);
	}
	function sync() {
		for (const p of BALANCE_PAGES)
			for (const [key] of p.rows) {
				game.settings[`lab_${key}`] =
					world()?.balance[key] ?? DEFAULT_BALANCE[key];
			}
	}
	function sliders(n) {
		page = n;
		sync();
		game.shell.show("devSliders", {
			kicker: "LIVE BALANCE / UNRANKED",
			title: BALANCE_PAGES[n].title,
			text: "Changes apply on resume. A lower emitter maximum clamps current health; destroyed emitters stay destroyed.",
			rows: BALANCE_PAGES[n].rows.map(([key]) => `lab_${key}`),
			actions: [
				[
					"Reset this page",
					() => {
						for (const [key] of BALANCE_PAGES[page].rows)
							act("balance", { key, value: DEFAULT_BALANCE[key] });
						sync();
						sliders(page);
					},
				],
				[
					"Next page",
					() => {
						game.shell.back();
						sliders((page + 1) % BALANCE_PAGES.length);
					},
				],
				["Back", () => game.shell.back()],
			],
		});
	}
	function encounters() {
		const w = world();
		selected = Math.min(selected, w.content.mission.length - 1);
		game.shell.show("devEncounters", {
			kicker: "ENCOUNTER PREVIEW",
			title: w.content.mission[selected].name,
			text: () =>
				`${selected + 1}/${w.content.mission.length} · ${SECTORS[w.content.mission[selected].sector].short}\n${w.content.mission[selected].learning}`,
			actions: [
				[
					"Previous encounter",
					() => {
						selected =
							(selected + w.content.mission.length - 1) %
							w.content.mission.length;
						encounters();
					},
				],
				[
					"Next encounter",
					() => {
						selected = (selected + 1) % w.content.mission.length;
						encounters();
					},
				],
				[
					"Jump to selected encounter",
					() => {
						act("jump", { wave: selected });
						toast("Selected encounter ready.");
					},
				],
				[
					"Scrub current timeline",
					() => {
						game.settings.lab_timeline = Math.floor(w.state.waveTime);
						game.shell.show("devTimeline", {
							title: "Encounter timeline",
							text: "Scrub rewinds this encounter and simulates its real timeline with neutral input and invulnerability. Single-step advances 1/120s.",
							rows: ["lab_timeline"],
							actions: [
								["Single step", () => app.stepWorld(1 / 120, true)],
								["Back", () => game.shell.back()],
							],
						});
					},
				],
				...[0, 1, 2].map((phase) => [
					`Command phase ${phase + 1}`,
					() => {
						act("phase", { phase });
						toast("Command phase loaded.");
					},
				]),
				["Back", () => game.shell.back()],
			],
		});
	}
	function seek(t) {
		const w = world(),
			at = w.state.wave;
		act("jump", { wave: at });
		w.state.transition = 0;
		w.invulnerable = true;
		for (let i = 0; i < Math.round(t * 120); i++) w.step(1 / 120, {});
		app.presentation.reset();
		app.flushEvents();
	}
	function spawns() {
		game.shell.show("devSpawns", {
			title: "Make a situation",
			text: "Spawns use the real combat rules. Clear removes threats without score.",
			actions: [
				[
					`Formation: ${formation}`,
					() => {
						const a = Object.keys(world().content.formations);
						formation = a[(a.indexOf(formation) + 1) % a.length];
						spawns();
					},
				],
				[
					"Spawn drifter formation",
					() => {
						act("spawn", { formation, kind: "drifter" });
						toast("Drifters deployed.");
					},
				],
				[
					"Spawn two hunters",
					() => {
						act("spawn", { formation: "hunters", kind: "hunter" });
						toast("Hunters deployed.");
					},
				],
				[
					"Spawn crossing gunship",
					() => {
						act("spawn", { formation: "solo", kind: "gunship" });
						toast("Crossing craft deployed.");
					},
				],
				[
					"Clear enemies & projectiles",
					() => {
						act("clear");
						toast("Arena cleared.");
					},
				],
				["Back", () => game.shell.back()],
			],
		});
	}
	function editor() {
		game.shell.show("devEditor", {
			kicker: "CONTENT / VERSION 1",
			title: "Encounter data",
			text: "Edit formations and spawn timelines, then validate and apply. Invalid data keeps the working configuration. Applying restarts the current encounter.",
			actions: [
				[
					"Validate & apply",
					() => {
						try {
							world().importContent(
								document.getElementById("content-json").value,
							);
							toast("Valid content applied. Encounter restarted.");
						} catch (e) {
							toast(`Retained working content: ${e.message}`);
						}
					},
				],
				[
					"Export content JSON",
					() => download("ufoh-encounters.json", world().exportContent()),
				],
				[
					"Import JSON file",
					() => {
						document.getElementById("content-file").click();
					},
				],
				["Back", () => game.shell.back()],
			],
		});
		if (game.headless) return;
		const host =
			game.shell.root.querySelector(".esh-box") ||
			game.shell.root.querySelector(".esh-sh");
		if (!host) return;
		const area = document.createElement("textarea");
		area.id = "content-json";
		area.value = world().exportContent();
		area.setAttribute("aria-label", "Encounter JSON");
		area.spellcheck = false;
		host.appendChild(area);
		const file = document.createElement("input");
		file.id = "content-file";
		file.type = "file";
		file.accept = ".json,application/json";
		file.hidden = true;
		file.addEventListener("change", async () => {
			if (file.files[0]) area.value = await file.files[0].text();
		});
		host.appendChild(file);
	}
	return {
		show,
		get speed() {
			return speed;
		},
		get overlay() {
			return overlay;
		},
		get aim() {
			return aim;
		},
		reset() {
			speed = 1;
			overlay = aim = false;
		},
		seek,
	};
}
export function download(name, text) {
	if (typeof document === "undefined") return false;
	const url = URL.createObjectURL(
			new Blob([text], { type: "application/json" }),
		),
		a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	return true;
}
