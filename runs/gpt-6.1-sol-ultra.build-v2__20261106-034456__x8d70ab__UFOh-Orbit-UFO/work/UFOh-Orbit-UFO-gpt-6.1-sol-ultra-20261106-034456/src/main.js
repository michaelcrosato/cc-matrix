import { OrbitAudio } from "./audio.js";
import { Controls, INPUT, NEUTRAL } from "./controls.js";
import { BALANCE_SPECS } from "./data/balance.js";
import { HubAdapter } from "./net/hub-adapter.js";
import { Presentation } from "./presentation.js";
import { Screens } from "./screens.js";
import {
	autopilot,
	commandWorld,
	createWorld,
	exportContent,
	exportReplay,
	importContent,
	snapshotWorld,
	stepWorld,
} from "./simulation.js";
import { Records } from "./storage.js";

const E = globalThis.My3D2dge;
const app = {
	world: null,
	attract: false,
	idle: 0,
	attractTime: 0,
	demoSector: -1,
	speed: 1,
	recorded: false,
	ended: false,
	overrides: new Map(),
	resultDelay: 0,
};
const game = new E.Game({
	canvas: "screen",
	id: "ufoh-orbit-v1",
	res: [768, 432],
	expand: true,
	view: "overhead",
	views: ["overhead"],
	input: INPUT,
	bg: "#071018",
	fullscreen: "button",
	autoPause: true,
	menu: {
		quit: "title",
		items: () =>
			app.hub?.active
				? [
						["Link diagnostics", () => app.screens.dev()],
						["About / Credits", () => app.screens.about(0)],
					]
				: [
						[
							"Restart flight",
							() =>
								app.startRun(app.world.mode, app.world.players.length, true),
						],
						["Dev Mode", () => app.screens.dev()],
						["About / Credits", () => app.screens.about(0)],
					],
		settings: [
			{ key: "music", value: 0.1 },
			{ key: "glyphs", value: "playstation" },
			{
				key: "voiceVolume",
				label: "Dispatcher voice",
				group: "Sound",
				value: 0.55,
				min: 0,
				max: 1,
				step: 0.05,
			},
		],
		controls: { fire: "Cannon (spends shield)", bomb: false },
	},
});
app.game = game;
game.fadeTime = 0.16;
game.cam.smooth = 0;
game.lights.enabled = true;
game.lights.ambient = 0.78;
app.records = new Records();
app.present = new Presentation(game);
app.audio = new OrbitAudio(game);
app.applyAudio = () =>
	app.audio.setSettings({
		master: game.settings.volume,
		music: game.settings.music,
		sfx: game.settings.effects,
		voice: game.settings.voiceVolume,
		muted: !game.settings.sound,
	});
app.applyAudio();
app.controls = new Controls(game, {
	activity: () => {
		app.idle = 0;
	},
	isPlaying: () => game.sceneName === "play",
	isAttract: () => app.attract,
	cancelAttract: () => app.toTitle(),
	onUnlock: () => {
		if (app.hub?.state === "ended") return;
		if (!app.audio.unlocked) app.audio.unlock();
		app.applyAudio();
	},
});
app.startRun = (
	mode = "mission",
	players = 1,
	paired = false,
	attract = false,
) => {
	if (app.hub.active) return;
	if (!paired) app.controls.pairing("solo");
	app.screens.ui.hide();
	game.resume();
	app.attract = attract;
	app.attractTime = 0;
	app.demoSector = -1;
	app.ended = false;
	app.resultDelay = 0;
	app.recorded = false;
	app.speed = 1;
	app.overrides.clear();
	app.world = createWorld({ mode, players, seed: 7, attract });
	for (const s of BALANCE_SPECS) game.settings.set("dev_" + s.key, s.value);
	app.present.reset();
	app.audio.resetEvents();
	app.controls.clear();
	app.controls.blockUntil = game.real + 0.25;
	game.go("play", null, { fade: 0 });
	app.present.titlePose.lift = 0;
	game.tween(app.present.titlePose, { lift: 1 }, 0.8, {
		ease: "outCubic",
		keep: true,
	});
	app.audio.setScene("mission");
	if (!attract) app.audio.say("GOOD NEWS. YOUR SAUCER HAS A SHIELD.");
};
app.toTitle = () => {
	if (app.hub?.active) return;
	app.attract = false;
	app.idle = 0;
	app.attractTime = 0;
	app.world = null;
	app.ended = false;
	app.speed = 1;
	app.overrides.clear();
	app.controls.clear();
	app.audio.stop();
	app.present.reset();
	app.screens.ui.hide();
	game.resume();
	game.go("title", null, { fade: 0 });
};
app.command = (name, args = {}) => {
	if (app.hub?.active) return false;
	const out = commandWorld(app.world, name, args);
	if (["sector", "phase", "restart", "resetSeed", "clear"].includes(name)) {
		app.present.reset();
		app.audio.resetEvents();
	}
	return out;
};
app.applyTuning = () => {
	if (!app.world || app.hub?.active || !app.world.debug) return;
	const balance = {};
	for (const s of BALANCE_SPECS) balance[s.key] = game.settings["dev_" + s.key];
	commandWorld(app.world, "balance", balance);
};
app.snapshot = () => ({
	title: "UFOh Orbit",
	scene: game.sceneName,
	screen: app.screens.ui.screen,
	attract: app.attract,
	idle: app.idle,
	world: app.world ? snapshotWorld(app.world) : null,
	hub: app.hub.snapshot(),
	audio: app.audio.debug(),
	device: game.input.lastDevice,
	players: game.players.length,
	presentation: { layout: app.present.layout },
	errors: game.errors,
});
app.replay = () => (app.world ? exportReplay(app.world) : null);
app.stepOnce = () => {
	if (!app.world || app.hub.active) return;
	app.applyTuning();
	stepWorld(app.world, [], 1 / 120);
	app.present.update(1 / 120, app.world);
};
app.download = (name, value) => {
	if (app.hub.active) return;
	const b = new Blob(
			[typeof value === "string" ? value : JSON.stringify(value, null, 2)],
			{ type: "application/json" },
		),
		url = URL.createObjectURL(b),
		a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
};
app.preview = (seconds) => {
	if (app.hub.active) return;
	app.world.debug = true;
	for (let t = 0; t < seconds; t += 1 / 120)
		stepWorld(
			app.world,
			app.world.players.map((_, i) => autopilot(app.world, i)),
			1 / 120,
		);
	app.present.update(0, app.world);
};
app.exportContent = () =>
	app.download("orbit-content.json", exportContent(app.world));
app.importContent = () => {
	if (app.hub.active) return;
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json,application/json";
	input.onchange = async () => {
		try {
			const result = importContent(app.world, await input.files[0].text());
			app.screens.ui.toast(
				result.ok ? "Content accepted" : "Content rejected",
				result.ok
					? "The working deck is ready. Restart an encounter to preview."
					: result.errors.join("\n"),
			);
		} catch {
			app.screens.ui.toast(
				"Content rejected",
				"Unable to read this JSON. Working deck retained.",
			);
		}
	};
	input.click();
};
app.hub = new HubAdapter({
	start({ players, seed, server, isHost, localIndex }) {
		game.o.live = true;
		game.live = true;
		game.o.autoPause = false;
		game.o.menu.quit = false;
		app.attract = false;
		app.world = createWorld({ mode: "mission", players: players.length, seed });
		players.forEach((p, i) => {
			app.world.players[i].hubId = p.id;
			app.world.players[i].name = p.name;
		});
		app.ended = false;
		app.screens.ui.hide();
		game.resume();
		game.go("play", null, { fade: 0 });
		app.present.reset();
		app.audio.resetEvents();
		app.audio.setScene("mission");
	},
	step(inputs, dt) {
		stepWorld(app.world, inputs, dt);
	},
	getWorld: () => app.world,
	getSnapshot: () => snapshotWorld(app.world),
	applyWorld: (w) => {
		app.world = w;
	},
	onEnd() {
		app.ended = true;
		app.controls.clear();
		app.audio.stop();
	},
	onLeave(index) {
		if (app.world && app.hub.isHost) {
			const p = app.world.players[index];
			if (p) {
				p.active = false;
				p.down = true;
				p.hull = 0;
				p.vx = p.vy = 0;
			}
		}
	},
});
app.screens = new Screens(app);
const rescueButton = document.getElementById("rescue-action");
if (rescueButton)
	rescueButton.onclick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		app.controls.rescueUntil = game.real + 1.1;
	};
// Native shell handles pause/settings/rebindings and every controller screen.
const oldSettingsChange = game.settings.onChange;
game.settings.onChange = (k, v) => {
	oldSettingsChange?.(k, v);
	if (k.startsWith("dev_")) app.applyTuning();
	else app.applyAudio();
};
addEventListener(
	"keydown",
	(e) => {
		if (app.screens.typeName(e)) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	},
	{ capture: true, signal: game._abort?.signal },
);
const scenes = {
	title: {
		view: "overhead",
		views: ["overhead"],
		camera: { zoom: false },
		enter() {
			app.attract = false;
			app.idle = 0;
			app.present.reset();
			app.screens.title();
			app.audio.setScene("title");
			document.body.dataset.scene = "title";
		},
		update(dt) {
			app.present.time += dt;
			app.idle += dt;
			if (
				app.screens.ui.screen === "title" &&
				app.idle >= 10 &&
				!app.hub.active
			)
				app.startRun("mission", 1, false, true);
		},
		draw: (r) => app.present.title(r),
		back() {
			return true;
		},
	},
	play: {
		view: "overhead",
		views: ["overhead"],
		pausable: true,
		camera: { zoom: false },
		touch: [],
		enter() {
			document.body.dataset.scene = "play";
			app.present.update(0, app.world);
		},
		update(dt) {
			if (!app.world || (app.hub.active && app.hub.state === "ended")) return;
			if (app.hub.active) {
				const idx = Math.max(0, app.hub.localIndex);
				const local =
					app.overrides.get(idx) || app.controls.intent(app.world, 0, idx);
				app.hub.tick(dt, local, {
					paused: !!app.screens.ui.screen || game.paused,
				});
			} else if (app.attract) {
				app.attractTime += dt;
				const sector = Math.min(3, Math.floor(app.attractTime / 18));
				if (sector !== app.demoSector) {
					app.demoSector = sector;
					commandWorld(app.world, "sector", { value: sector });
					app.world.debug = false;
					app.world.invulnerable = true;
					if (sector === 3) commandWorld(app.world, "phase", { value: 2 });
				}
				stepWorld(
					app.world,
					app.world.players.map((_, i) => autopilot(app.world, i)),
					dt * 1.4,
				);
				if (app.attractTime >= 76) app.startRun("mission", 1, false, true);
			} else if (app.world.status === "running") {
				app.applyTuning();
				const input = app.world.players.map(
					(_, i) => app.overrides.get(i) || app.controls.intent(app.world, i),
				);
				stepWorld(app.world, input, dt * app.speed);
			}
			app.present.update(dt, app.world);
			app.audio.handle(app.world.events);
			app.present.subtitle = app.audio.subtitle;
			app.audio.setScene(app.world.boss ? "boss" : "mission");
			if (!app.hub.active && !app.attract && app.world.status !== "running") {
				app.resultDelay += dt;
				if (app.resultDelay > 1.2 && !app.ended) {
					app.ended = true;
					app.audio.setScene(app.world.status);
					game.go("results", null, { fade: "iris", seconds: 0.45 });
				}
			}
		},
		draw(r) {
			if (app.world)
				app.present.world(r, app.world, {
					attract: app.attract,
					hub: app.hub.active ? app.hub : null,
				});
		},
		back() {
			game.pause();
			return true;
		},
	},
	results: {
		view: "overhead",
		camera: { zoom: false },
		enter() {
			document.body.dataset.scene = "results";
			app.screens.results();
		},
		update(dt) {
			app.present.time += dt;
		},
		draw(r) {
			if (app.world) app.present.world(r, app.world);
		},
		back() {
			app.toTitle();
			return true;
		},
	},
};
game.hook("input", () => {
	if (game.paused || app.screens.ui.screen) {
		app.controls.releaseTouch();
		if (rescueButton) rescueButton.hidden = true;
		const h = document.getElementById("controls-hint");
		if (h) h.hidden = true;
	}
	app.controls.padActivity();
});
game.hook("input", () => {
	if (!(app.hub.active && app.hub.state === "ended"))
		app.audio.pause(game.paused && !app.hub.active);
});
game.hook("step", (dt) => {
	if (!(app.hub.active && app.hub.state === "ended")) app.audio.tick(dt);
	const root = app.screens.ui.root;
	if (root) {
		root.dataset.screen = app.screens.ui.screen || "play";
		document.body.dataset.input = game.input.lastDevice;
	}
	if (rescueButton) {
		const p =
				app.world?.players[
					app.hub.active ? Math.max(0, app.hub.localIndex) : 0
				],
			wreck = app.world?.players.find((q) => q.down && q.active !== false);
		rescueButton.hidden = !(
			game.input.lastDevice === "touch" &&
			game.sceneName === "play" &&
			!app.screens.ui.screen &&
			p &&
			!p.down &&
			p.shield <= 0 &&
			wreck &&
			Math.hypot(p.x - wreck.x, p.y - wreck.y) < 110
		);
	}
	if (
		game.sceneName === "play" &&
		!app.screens.ui.screen &&
		!app.attract &&
		app.world
	) {
		const hint = document.getElementById("controls-hint");
		if (hint) {
			hint.textContent = app.controls.prompt();
			hint.hidden = game.input.lastDevice === "touch";
		}
	} else {
		const hint = document.getElementById("controls-hint");
		if (hint) hint.hidden = true;
	}
});
game.debug = {
	snapshot: app.snapshot,
	world: () => app.world,
	rawWorld: () => app.world,
	replay: app.replay,
	hub: app.hub,
	input(index, intent) {
		if (intent === null) app.overrides.delete(index);
		else app.overrides.set(index, { ...NEUTRAL, ...intent });
	},
	start: (mode, players = 1) => app.startRun(mode, players),
	command: app.command,
	autopilot: (index) => autopilot(app.world, index),
	advance: (seconds) => game.advance(seconds),
	showAbout: (p) => app.screens.about(p),
	idle: (seconds) => {
		app.idle = seconds;
	},
	settings: game.settings,
	exportContent: () => exportContent(app.world),
	importContent: (text) => importContent(app.world, text),
	records: app.records,
	app,
};
globalThis.__game = game;
globalThis.__orbit = app;
game.start({ scenes, scene: globalThis.AIHub?.active ? "play" : "title" });
await app.hub.connect();
document.body.dataset.ready = "true";
