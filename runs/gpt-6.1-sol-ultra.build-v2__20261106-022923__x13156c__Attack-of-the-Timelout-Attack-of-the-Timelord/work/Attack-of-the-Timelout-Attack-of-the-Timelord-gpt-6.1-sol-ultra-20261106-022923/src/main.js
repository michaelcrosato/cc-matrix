import { createAudio } from "./audio/audio.js";
import {
	BOSS_PHASES,
	DEFAULT_TUNING,
	TUNING_SPEC,
	WAVES,
} from "./content/campaign.js";
import {
	autoPilot,
	createWorld,
	getSnapshot,
	jumpEncounter,
	removePlayer,
	stepWorld,
} from "./game/simulation.js";
import { createNetworkClock } from "./network/clock.js";
import { NetworkSession } from "./network/session.js";
import { Renderer } from "./presentation/renderer.js";
import { installInput } from "./ui/input.js";
import { makeScreens } from "./ui/screens.js";

const E = globalThis.My3D2dge;
const ownSettings = [
	{ key: "music", value: 0.1 },
	{ key: "effects", value: 0.7 },
	{ key: "glyphs", value: "playstation" },
	{ key: "scale", value: "fill" },
	{
		key: "voice",
		label: "Voice volume",
		type: "slider",
		min: 0,
		max: 1,
		step: 0.05,
		value: 0.65,
		group: "Sound",
	},
	{
		key: "assistPreset",
		label: "Assistance preset",
		options: [
			["standard", "Standard"],
			["relaxed", "Relaxed timeline"],
		],
		value: "standard",
	},
	{ key: "autoFire", label: "Automatic fire", value: false },
	{ key: "reducedSpeed", label: "Gentler hostile speed (75%)", value: false },
	{ key: "emergencyBrake", label: "Automatic emergency brake", value: false },
	...[
		["devGod", "Invulnerability"],
		["devHitboxes", "Show hitboxes"],
		["devTrajectories", "Show targeting"],
		["devAI", "AI pilot"],
	].map(([key, label]) => ({
		key,
		label,
		value: false,
		group: "Developer",
		persist: false,
	})),
	{
		key: "devSpeed",
		label: "Simulation speed ×",
		min: 0.25,
		max: 4,
		step: 0.25,
		value: 1,
		group: "Developer",
		persist: false,
	},
	...TUNING_SPEC.map((s) => ({
		key: "tune_" + s.key,
		label: `${s.label} (${s.unit})`,
		type: "slider",
		min: s.min,
		max: s.max,
		step: s.step,
		value: DEFAULT_TUNING[s.key],
		group: "Developer balance",
		persist: false,
	})),
];
const game = new E.Game({
	canvas: "screen",
	id: "attack-of-the-timelout-v1",
	res: [1066, 600],
	expand: false,
	view: "overhead",
	views: ["overhead"],
	bg: "#050a16",
	autoPause: false,
	fullscreen: false,
	corner: true,
	input: {
		left: ["KeyA", "ArrowLeft", "Pad14"],
		right: ["KeyD", "ArrowRight", "Pad15"],
		up: ["KeyW", "ArrowUp", "Pad12"],
		down: ["KeyS", "ArrowDown", "Pad13"],
		fire: ["Space", "Mouse0", "Pad0", "Pad7"],
		brake: ["ShiftLeft", "ShiftRight", "Mouse2", "Pad2", "Pad6"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Pad1"],
		pause: ["Escape", "KeyP", "Pad9"],
		start: ["Enter", "Pad9"],
	},
	menu: {
		settings: ownSettings,
		quit: "title",
		controls: { fire: "Fire", brake: "Time brake" },
	},
});
game.cam.smooth = 0;
game.fadeTime = 0;
game.lights.enabled = false;
const app = {
	game,
	world: null,
	mode: "boot",
	lastActivity: 0,
	device: "keyboard",
	localId: "p1",
	tuning: { ...DEFAULT_TUNING },
	settings: game.settings,
	networkStatus: "",
	networked: false,
	terminated: false,
	resultsShown: false,
	ai: false,
	visualWorld: null,
	activity(kind) {
		this.device = kind;
		this.lastActivity = game.real;
		if (this.mode === "attract") {
			this.world = null;
			this.renderer.reset();
			this.screens.title();
		}
		if (kind === "touch" && !this.networked && !this.touchConfigured) {
			this.touchConfigured = true;
			game.settings.set("autoFire", true);
			game.settings.set("emergencyBrake", true);
		}
		if (!this.audio?.unlocked || this.audio?.ctx?.state === "suspended")
			this.audio?.unlock();
	},
	syncSettings(key) {
		const s = game.settings;
		if (key === "assistPreset") {
			const on = s.assistPreset === "relaxed";
			for (const k of ["autoFire", "reducedSpeed", "emergencyBrake"])
				s.set(k, on);
		}
		if (key?.startsWith("tune_")) {
			const k = key.slice(5);
			this.tuning[k] = s[key];
			if (this.world) {
				this.world.tuning[k] = s[key];
				this.world.modified = true;
			}
		}
		if (key?.startsWith("dev") && this.world) this.world.modified = true;
		if (this.world && !this.networked) {
			this.world.invulnerable = s.devGod;
			this.world.assists = {
				autoFire: s.autoFire,
				reducedSpeed: s.reducedSpeed,
				emergencyBrake: s.emergencyBrake,
			};
		}
		this.audio?.setVolumes({
			music: s.mute ? 0 : s.music,
			effects: s.mute ? 0 : s.effects,
			voice: s.mute ? 0 : s.voice,
		});
	},
	startSolo() {
		this.net.leave(false);
		this.networked = false;
		this.terminated = false;
		this.startWorld({
			seed: crypto.getRandomValues(new Uint32Array(1))[0],
			players: [{ id: "p1", name: "PILOT" }],
		});
		this.localId = "p1";
	},
	startWorld({ seed, players }) {
		this.world = createWorld({
			seed,
			players,
			tuning: this.networked ? {} : this.tuning,
			assists: this.networked
				? {}
				: {
						autoFire: game.settings.autoFire,
						reducedSpeed: game.settings.reducedSpeed,
						emergencyBrake: game.settings.emergencyBrake,
					},
		});
		this.audioEvent = 0;
		this.simBudget = 0;
		this.pendingNetworkBrake = false;
		this.latestAction = { move: 0, fire: false, brake: false };
		this.visualWorld = null;
		this.mode = "run";
		this.resultsShown = false;
		this.terminated = false;
		this.renderer.reset();
		this.input.clear();
		this.screens.shell.hide();
		game.resume();
		game.live = this.networked;
		game.go("play", null, { fade: 0 });
		this.audio.pause(false);
		this.audio.setScene("combat");
	},
	showError(message) {
		this.networkStatus = message;
		this.screens.shell.show("network-error", {
			kicker: "CONNECTION NEEDS ATTENTION",
			title: "The timeline did not connect.",
			text: message,
			actions: [
				["Retry online", () => this.screens.online()],
				[
					"Return to solo",
					() => {
						this.net.leave();
						this.networked = false;
						this.screens.title();
					},
				],
			],
		});
	},
	consumeEvents() {
		const events = this.world?.events || [];
		this.renderer.events(events);
		for (const e of events) {
			if (e.id <= this.audioEvent) continue;
			this.audioEvent = e.id;
			if (e.type === "voice") {
				this.audio.speak(e.text, e.emotion);
				this.renderer.speak(e.text);
			} else this.audio.event(e.type, e);
		}
		this.world.events = [];
	},
	audioEvent: 0,
	startAttract() {
		if (
			this.net.hosted ||
			this.net.peer ||
			this.mode !== "title" ||
			this.screens.shell.screen !== "title"
		)
			return;
		this.world = createWorld({
			seed: 0xd3a0,
			players: [{ id: "demo", name: "DEMONSTRATION" }],
			demo: true,
		});
		this.world.charge = 100;
		this.mode = "attract";
		this.demoTime = 0;
		this.demoStage = 0;
		this.audioEvent = 0;
		this.renderer.reset();
		this.screens.shell.hide();
	},
	endNetwork(event) {
		if (event.world) this.world = event.world;
		if (this.net.hosted) {
			this.terminated = true;
			this.mode = "terminated";
			this.input.clear();
			this.audio.pause(true);
			this.screens.shell.hide();
		} else if (event.reason === "finished") {
			this.mode = "results";
			this.screens.results();
		} else {
			this.networked = false;
			this.audio.pause(true);
			this.showError(
				event.message ||
					"The host left. This timeline has ended. You can create a new room or play solo.",
			);
		}
	},
};
app.audio = createAudio({ engineAudio: game.audio });
app.audio.setVolumes({
	music: game.settings.music,
	effects: game.settings.effects,
	voice: game.settings.voice,
});
app.renderer = new Renderer(game);
app.input = installInput(game, app);
app.net = new NetworkSession({
	onWorld(w) {
		if (app.net.isHost) return;
		app.world = w;
		app.receivedAt = game.real;
		app.consumeEvents();
	},
	onStart(data) {
		app.networked = true;
		app.localId = String(app.net.me);
		app.audioEvent = 0;
		app.startWorld(data);
	},
	onRoster(players, status) {
		app.networkStatus = status;
		if (
			app.mode === "online" &&
			["room", "online"].includes(app.screens?.shell.screen)
		)
			app.screens.lobby();
	},
	onEnd: (e) => app.endNetwork(e),
	onLeave: (id) => {
		if (app.world && app.net.isHost) removePlayer(app.world, id);
	},
	onError: (message) => app.showError(message),
});
app.screens = makeScreens(app);
const hoverFocus = (event) => {
	if (event.pointerType === "touch" || app.device !== "mouse") return;
	const button = event.target.closest("button");
	if (button && !button.disabled) button.focus({ preventScroll: true });
};
app.screens.shell.root.addEventListener("pointerover", hoverFocus);
app.screens.shell.root.addEventListener("pointermove", hoverFocus);
const hud = document.getElementById("hud");
const el = (id) => document.getElementById(id);
el("touch-brake").onpointerdown = (e) => {
	e.preventDefault();
	e.stopPropagation();
	app.activity("touch");
	app.input.pressBrake();
};
const hudCache = new Map();
const set = (id, value) => {
	if (hudCache.get(id) !== value) {
		el(id).textContent = value;
		hudCache.set(id, value);
	}
};
function hudUpdate() {
	const w = app.world,
		active =
			!app.net.server &&
			["run", "attract", "terminated"].includes(app.mode) &&
			w;
	hud.hidden = !active;
	if (!active) return;
	const c = w.wave < 8 ? WAVES[w.wave] : BOSS_PHASES[Math.min(2, w.bossPhase)];
	set("score", String(w.score).padStart(6, "0"));
	set(
		"wave",
		w.wave < 8
			? `WAVE ${String(w.wave + 1).padStart(2, "0")} / 08`
			: `FINALE · PHASE ${Math.min(3, w.bossPhase + 1)}`,
	);
	set("wave-name", c?.name || "TOMORROW IS YOURS");
	const ready = w.charge >= 100;
	set(
		"brake-label",
		w.brake > 0
			? "TIME IS YOURS"
			: ready
				? "TIME BRAKE READY"
				: `TIME BRAKE  ${Math.floor(w.charge)}%`,
	);
	el("meter-fill").style.width = `${w.charge}%`;
	set(
		"brake-hint",
		w.brake > 0
			? "HOSTILE TIME × 0.35"
			: ready
				? app.device === "gamepad"
					? "□ / L2 TO ACTIVATE"
					: "SHIFT / RIGHT MOUSE TO ACTIVATE"
				: "INTERCEPT WEAPONS TO CHARGE",
	);
	set("prompts", app.input.prompts());
	el("touch-brake").hidden =
		app.device !== "touch" || !ready || app.mode === "attract";
	const sub = w.subtitle;
	el("subtitle").hidden = !(sub && sub.until > w.time);
	if (sub) set("subtitle", sub.text || "");
	el("demo-label").hidden = app.mode !== "attract";
	set(
		"run-badge",
		app.mode === "attract"
			? "DEMONSTRATION · ANY INPUT RETURNS"
			: w.modified
				? "MODIFIED RUN · SCORES DISABLED"
				: w.assisted || Object.values(w.assists || {}).some(Boolean)
					? "ASSISTED TIMELINE"
					: app.networked
						? `${w.players.filter((p) => p.connected !== false).length} PILOTS · SHARED WORLD`
						: "STANDARD TIMELINE",
	);
	let title = "",
		text = "";
	if (app.terminated) {
		title = "TIMELINE COMPLETE";
		text = "Return through AI Hub to choose your next round.";
	} else if (app.net.hosted && !app.net.started) {
		title = "RIFT SYNCHRONIZING";
		text = "Waiting for the shared start…";
	} else if (w.phase === "countdown") {
		title = "DEFEND YOUR MOMENT";
		text = "HOLD FIRE · SLIDE TO INTERCEPT";
	} else if (w.phase === "intermission") {
		title = w.wave === 8 ? "THE MANAGEMENT HAS ARRIVED" : "FLEET CLEARED";
		text = "INTEGRITY RESTORED · ORDNANCE DISSOLVED";
	} else if (w.phase === "ending") {
		title = w.outcome === "victory" ? "TOMORROW IS YOURS" : "A MOMENT LOST";
		text =
			w.outcome === "victory"
				? "The clocks are free. The tyrant is late."
				: "The next second is still yours.";
	} else if (w.encounterTime < 4) {
		title = w.wave < 8 ? `WAVE ${w.wave + 1}` : `FINALE ${w.bossPhase + 1}`;
		text = c?.cue || "FIRE AT THE MINT CORE WHEN ITS SHUTTERS OPEN";
	}
	el("notice").hidden = !title;
	set("notice-title", title);
	set("notice-text", text);
	const boss = w.boss;
	el("boss-hud").hidden = !boss;
	if (boss) {
		set(
			"boss-label",
			boss.vulnerable ? "CORE EXPOSED · FIRE" : "SHUTTERS CLOSED",
		);
		el("boss-fill").style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
	}
}
function update(dt) {
	if (!app.net.server) {
		game.focus(0, 0, 0);
		app.input.update();
		app.renderer.update(dt);
	}
	if (app.mode === "title" && game.real - app.lastActivity >= 10)
		app.startAttract();
	if (app.mode === "attract") {
		app.demoTime += dt;
		const stage = Math.floor(app.demoTime / 18);
		if (stage !== app.demoStage) {
			app.demoStage = stage;
			if (stage >= 5) {
				app.world = createWorld({
					seed: 0xd3a0,
					players: [{ id: "demo", name: "DEMONSTRATION" }],
					demo: true,
				});
				app.demoTime = 0;
				app.demoStage = 0;
				app.renderer.reset();
				app.audioEvent = 0;
			} else
				jumpEncounter(
					app.world,
					stage === 4 ? 8 : stage + 1,
					stage === 4 ? 2 : 0,
				);
			app.world.demo = true;
			app.world.modified = true;
			app.world.charge = 100;
		}
		stepWorld(app.world, { demo: autoPilot(app.world, "demo") }, dt);
		app.consumeEvents();
	} else if (app.mode === "run" && !app.terminated) {
		const w = app.world;
		if (!w) return;
		const action =
			app.net.server || game.paused || app.screens.shell.screen
				? { move: 0, fire: false, brake: false }
				: app.input.action();
		if (app.networked) {
			app.latestAction = action;
			app.latestActionAt = performance.now() / 1000;
			app.pendingNetworkBrake ||= action.brake;
			if (!app.net.isHost) interpolateRemote(dt, action);
		} else {
			if (
				game.settings.devAI ||
				game.settings.devGod ||
				game.settings.devSpeed !== 1
			)
				w.modified = true;
			w.invulnerable = game.settings.devGod;
			app.simBudget = (app.simBudget || 0) + dt * game.settings.devSpeed;
			while (app.simBudget >= 1 / 120 - 1e-9) {
				app.simBudget -= 1 / 120;
				const a = game.settings.devAI ? autoPilot(w, app.localId) : action;
				stepWorld(w, { [app.localId]: a }, 1 / 120);
				app.consumeEvents();
			}
		}
		app.audio.setScene(
			w.wave === 8 ? "boss" : w.wave >= 4 ? "escalation" : "combat",
		);
		if (w.phase === "ending")
			app.audio.setScene(w.outcome === "victory" ? "victory" : "failure");
		if (w.phase === "results" && !app.resultsShown && !app.net.hosted) {
			app.resultsShown = true;
			app.screens.results();
		}
	}
	hudUpdate();
}
game.hook("input", () => {
	if (app.terminated) {
		app.audio.pause(true);
		app.input.clear();
		return;
	}
	if (game.paused && !app.networked) {
		app.audio.pause(true);
		hudUpdate();
	} else if (app.audio.paused) app.audio.pause(false);
});
function interpolateRemote(dt, action) {
	const w = app.world,
		old = app.visualWorld;
	if (!w) return;
	const same = old && old.wave === w.wave && old.bossPhase === w.bossPhase;
	const blend = 1 - Math.exp(-dt * 23),
		age = Math.min(
			0.12,
			Math.max(0, game.real - (app.receivedAt || game.real)),
		);
	const actors = (list, previous, local = false) =>
		list.map((actor) => {
			const p =
				same && previous?.find((p) => String(p.id) === String(actor.id));
			let x = actor.x,
				y = actor.y;
			if (p) {
				let tx = x,
					ty = y;
				if (local && String(actor.id) === String(app.localId) && actor.hp > 0) {
					const speed = DEFAULT_TUNING.playerSpeed;
					let move = action.move || 0;
					if (!move && Number.isFinite(action.targetX))
						move = Math.max(
							-1,
							Math.min(1, (action.targetX - p.x) / (speed * dt)),
						);
					const predicted = Math.max(
						-450,
						Math.min(450, p.x + move * speed * dt),
					);
					tx = x + (actor.vx || 0) * age;
					x =
						Math.abs(predicted - tx) > 75
							? tx
							: predicted + (tx - predicted) * (1 - Math.exp(-dt * 7));
				} else {
					x = p.x + (tx - p.x) * blend;
				}
				if (Number.isFinite(y) && Number.isFinite(p.y))
					y = p.y + (ty - p.y) * blend;
			}
			return { ...actor, x, y };
		});
	app.visualWorld = {
		...w,
		players: actors(w.players, old?.players, true),
		enemies: actors(w.enemies, old?.enemies),
		threats: actors(w.threats, old?.threats),
		shots: actors(w.shots, old?.shots),
		boss: w.boss
			? {
					...w.boss,
					x:
						same && old.boss
							? old.boss.x + (w.boss.x - old.boss.x) * blend
							: w.boss.x,
				}
			: null,
	};
}
function draw(r) {
	if (app.net.server) {
		r.sky(["#050a16", "#050a16"]);
		return;
	}
	app.renderer.draw(
		r,
		app.networked && !app.net.isHost && app.visualWorld
			? app.visualWorld
			: app.world,
		{
			title:
				app.mode === "title" || app.mode === "online" || app.mode === "boot",
			attract: app.mode === "attract",
			hitboxes: game.settings.devHitboxes,
			trajectories: game.settings.devTrajectories,
		},
	);
}
const scenes = {
	title: {
		pausable: false,
		camera: { zoom: false },
		enter() {
			if (!app.net.hosted) {
				app.world = null;
				app.screens.title();
				app.audio.setScene("title");
			}
		},
		update,
		draw,
	},
	play: { pausable: true, camera: { zoom: false }, update, draw },
};
function networkTick(dt) {
	let action = app.latestAction || { move: 0, fire: false, brake: false };
	if (
		document.hidden ||
		game.paused ||
		app.screens.shell.screen ||
		app.net.server ||
		performance.now() / 1000 - (app.latestActionAt || 0) > 0.35
	)
		action = { move: 0, fire: false, brake: false };
	else if (app.pendingNetworkBrake) action = { ...action, brake: true };
	app.pendingNetworkBrake = false;
	app.net.update(dt, action);
	if (
		app.mode === "run" &&
		app.world &&
		app.net.started &&
		app.net.isHost &&
		!app.net.finished &&
		!app.net.ended
	) {
		stepWorld(app.world, app.net.actions(), dt);
		app.net.publish(app.world);
		app.consumeEvents();
		if (app.world.phase === "results") app.net.finish(app.world);
	}
}
app.clock = createNetworkClock({
	tick: networkTick,
	active: () =>
		!app.manualNetwork &&
		!app.terminated &&
		!app.net.ended &&
		!!(app.net.hosted || app.net.peer),
});
app.clock.start();
addEventListener(
	"pagehide",
	() => {
		app.clock.dispose();
		app.net.leave(false);
		app.audio.destroy();
	},
	{ once: true },
);
// Native arcade services remain independent of the simultaneous shared simulation.
app.arcade = new E.Arcade(game, {
	id: "timelout",
	idle: 10,
	demo: 90,
	hud: false,
});
async function boot() {
	try {
		const info = await app.net.connectHub();
		if (info) {
			app.networked = true;
			app.localId = app.net.server ? null : String(app.net.me);
			app.world = createWorld({ seed: info.seed, players: info.players });
			app.mode = "run";
			game.live = true;
			game.start({ scene: "play", scenes });
			app.net.ready();
		} else {
			game.start({ scene: "title", scenes });
			const invite = new URL(location.href).searchParams.get("room");
			if (invite) {
				app.screens.online();
				app.screens.join(invite);
			}
		}
		document.body.dataset.ready = "true";
	} catch (error) {
		game.start({ scene: "title", scenes });
		app.screens.shell.toast("Solo is available", error.message);
		document.body.dataset.ready = "true";
	}
}
globalThis.__game = game;
globalThis.__timelout = {
	app,
	game,
	snapshot: () => ({
		mode: app.mode,
		screen: app.screens.shell.screen,
		paused: game.paused,
		device: app.device,
		world: app.world ? getSnapshot(app.world) : null,
		errors: game.errors,
		network: app.net.debug,
	}),
	startSolo: () => app.startSolo(),
	step: (seconds) => game.advance(seconds),
	actions: (a) => {
		if (app.world) stepWorld(app.world, { [app.localId]: a });
	},
	demo: () => app.startAttract(),
	networkStep: (seconds, action) => {
		if (!app.manualNetwork) app.clock.stop();
		app.manualNetwork = true;
		if (action) {
			app.latestAction = action;
			app.latestActionAt = performance.now() / 1000;
			app.pendingNetworkBrake ||= action.brake;
		}
		app.clock.advance(seconds);
	},
};
game.debug = { snapshot: () => globalThis.__timelout.snapshot() };
boot();
