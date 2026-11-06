import "../vendor/engine/engine/my-3d2dge-3d.js";
import { BEARINGS, MISSION } from "../content/mission.js";
import { BomberAudio } from "./audio.js";
import { HubAdapter } from "./online.js";
import { angle, BomberSim, clamp } from "./sim.js";
import { BomberUI } from "./ui.js";
import { BomberView } from "./view.js";

const E = globalThis.My3D2dge;
const INPUT = {
	up: ["KeyW", "ArrowUp", "Pad12"],
	down: ["KeyS", "ArrowDown", "Pad13"],
	left: ["KeyA", "ArrowLeft", "Pad14"],
	right: ["KeyD", "ArrowRight", "Pad15"],
	start: ["Enter", "Pad9"],
	pause: ["Escape", "KeyP", "Pad9"],
	confirm: ["Enter", "Space", "Pad0"],
	cancel: ["Escape", "Backspace", "Pad1"],
	fire: ["Space", "Mouse0", "Pad7"],
	zoom: ["Mouse2", "Pad6"],
	throttleUp: ["KeyE", "Pad5"],
	throttleDown: ["KeyQ", "Pad4"],
	pilot: ["Digit1"],
	guns: ["Digit2"],
	bombs: ["Digit3"],
	wheel: ["Tab", "Pad3"],
	map: ["KeyM", "Pad2"],
	hold: ["KeyH", "Pad10"],
	extinguish: ["KeyF", "Pad1"],
	jettison: ["KeyJ", "Pad11"],
	doors: ["KeyB", "Pad4"],
	salvo: ["KeyV", "Pad5"],
	aimLeft: ["PadRAxisLeft"],
	aimRight: ["PadRAxisRight"],
	aimUp: ["PadRAxisUp"],
	aimDown: ["PadRAxisDown"],
	nose: ["ArrowUp", "Pad12"],
	tail: ["ArrowDown", "Pad13"],
	port: ["ArrowLeft", "Pad14"],
	starboard: ["ArrowRight", "Pad15"],
};
const SETTINGS = [
	{ key: "music", value: 0.1 },
	{ key: "glyphs", value: "playstation" },
	{
		key: "invertFlight",
		label: "Invert flight pitch",
		group: "Game",
		type: "toggle",
		value: false,
	},
	{
		key: "aimSensitivity",
		label: "Aim sensitivity",
		group: "Game",
		type: "slider",
		min: 0.3,
		max: 2,
		step: 0.05,
		value: 1,
	},
	{
		key: "captions",
		label: "Caption size",
		group: "Game",
		type: "slider",
		min: 0.8,
		max: 1.4,
		step: 0.05,
		value: 1,
	},
	{
		key: "voice",
		label: "Radio voices",
		group: "Sound",
		type: "slider",
		value: 0.7,
	},
];
const game = new E.Game({
	canvas: "screen",
	id: "b17-cross-channel-chaos-v1",
	res: [640, 360],
	expand: true,
	bg: null,
	input: INPUT,
	autoPause: false,
	fullscreen: "button",
	corner: false,
	menu: {
		settings: SETTINGS,
		quit: "title",
		controls: {
			fire: "Fire / release",
			wheel: "Station wheel",
			map: "Operational map",
			hold: "Course hold",
			pilot: "Pilot",
			guns: "Threatened gun",
			bombs: "Bombsight",
			throttleUp: "Increase power",
			throttleDown: "Decrease power",
			jettison: "Hold: jettison payload",
			extinguish: "Extinguish engine fire",
		},
	},
});
const sim = new BomberSim(),
	view = new BomberView(E, game),
	sound = new BomberAudio(E, game);
game.audio.musicVolume = game.settings.music;
game.audio.voiceVolume = game.settings.voice;
game.audio.applyVolume();
const touch = {
	active: false,
	fingers: new Map(),
	left: [0, 0],
	right: [0, 0],
};
let pointerClickGuard = null;
let ui,
	ready = false,
	attract = false,
	demoSim = null,
	idleAt = 0,
	idleWall = performance.now(),
	pauseOwner = 1,
	lastPointer = null,
	lastPaused = false,
	sessionClock = null,
	actionNo = 0,
	resultShown = false,
	blockUntil = 0,
	seed = 1942;
const jettisonHold = {},
	fireLocked = {};
const portraits = Object.fromEntries(
	["pilot", "gunner", "bombardier", "engineer"].map((r, i) => [
		r,
		new E.Humanoid({
			size: 1.5,
			weapon: null,
			outfit: "coat",
			hair: ["short", "bald", "short", "short"][i],
			hat: "helmet",
			sleeves: "long",
			colors: {
				skin: ["#d5ac85", "#c0906b", "#e4bc8d", "#b78464"][i],
				cloth: ["#576d58", "#6b765c", "#5b6b6c", "#776e55"][i],
				coat: "#4b5c48",
				pants: "#344c46",
				hair: "#4b3529",
				metal: "#d8be82",
				boot: "#253b39",
				trim: "#d2b67c",
			},
		}),
	]),
);
const online = new HubAdapter({
	sim,
	stopSound: () => sound.stop(),
	onStatus: (text) => {
		if (ui && online.active && !online.playing)
			ui.shell.toast("CREW RADIO", text, 3);
	},
	onStart: () => {
		resultShown = false;
		if (!online.server) {
			ui.clear();
			game.go("play", null, { fade: 0 });
		}
	},
	onEnd: () => {
		sound.stop();
		clearInterval(sessionClock);
		sim.controls = {};
		if (ui) {
			ui.clear();
			ui.hud.hidden = true;
		}
		document.getElementById("attract-label").hidden = true;
		game.stop();
		game.audio.mute(true);
	},
});
const app = {
	E,
	game,
	sim,
	view,
	sound,
	audio: sound,
	online,
	touch,
	portraits,
	start,
	send,
	toTitle,
	activity,
	localPlayers,
	clearActions,
	consumePointer,
};
ui = new BomberUI(app);
// Keep native focus/navigation, scoped to the crew member who opened the menu.
const nativeShellStep = ui.shell._step.bind(ui.shell);
ui.shell._step = () => {
	const original = game.input;
	const owner = game.paused ? game.pausedBy || 1 : ui.menuOwner || 1;
	const own = game.players.find((I) => I.player === owner) || original;
	if (game.real < blockUntil) {
		for (const I of game.players)
			for (const key of Object.keys(I.map)) I.suppress(key);
	}
	game.input = own;
	try {
		const result = nativeShellStep();
		if (
			!online.active &&
			!attract &&
			!ui.shell.screen &&
			!game._next &&
			!game._fade
		) {
			if (game.sceneName === "title") ui.title();
			else if (game.sceneName === "play" && sim.state.result) ui.results();
		}
		return result;
	} finally {
		game.input = original;
	}
};
function localPlayers() {
	if (online.active)
		return sim.state.players.filter(
			(p) => p.id === online.localId && p.connected,
		);
	return sim.state.players.filter((p) => p.connected);
}
function send(cmd, id = online.active ? online.localId : 1) {
	if (id == null || online.ended) return false;
	if (cmd.type !== "controls" && cmd.type !== "aim")
		cmd = { ...cmd, actionId: "local-" + ++actionNo };
	if (online.active) return online.command(cmd);
	return sim.command(id, cmd);
}
function consumePointer(e) {
	pointerClickGuard = { id: e.pointerId, until: performance.now() + 3000 };
}
function activity() {
	idleAt = game.real;
	idleWall = performance.now();
}
function clearActions() {
	blockUntil = game.real + 0.22;
	for (const p of sim.state.players) {
		sim.command(p.id, { type: "controls" });
		fireLocked[p.id] = true;
		jettisonHold[p.id] = 0;
	}
	for (const I of game.players) I.clear();
	touch.left = [0, 0];
	touch.right = [0, 0];
	touch.fire = false;
	touch.firePointer = null;
}
function start(options = {}) {
	sound.stop();
	attract = false;
	demoSim = null;
	document.getElementById("attract-label").hidden = true;
	ui.setup = { ...ui.setup, ...options };
	while (game.players.length > 1) game.removePlayer(2);
	const pads = Array.from(navigator.getGamepads?.() || []).filter(
		(p) => p && p.connected !== false,
	);
	game.input.pad = "any";
	if (options.coop) {
		const pad =
			options.coopMode === "pads"
				? (pads[1]?.index ?? 1)
				: (pads[0]?.index ?? 0);
		game.addPlayer({ pad });
		if (options.coopMode === "pads") game.input.pad = pads[0]?.index ?? 0;
	}
	sim.reset({
		...options,
		seed: options.seed ?? seed,
		players: options.coop ? [1, 2] : [1],
	});
	seed = (seed + 7919) >>> 0;
	if (options.dev || JSON.stringify(sim.definition) !== JSON.stringify(MISSION))
		sim.state.cheated = true;
	resultShown = false;
	ui.dev.paused = false;
	ui.dev.freeCamera = false;
	ui.dev.debug = false;
	for (const key of Object.keys(sim.balance)) {
		if (game.settings["dev_" + key] !== undefined)
			sim.balance[key] = game.settings["dev_" + key];
	}
	if (
		Object.keys(sim.balance).some(
			(k) => sim.balance[k] !== game.settings.default("dev_" + k),
		)
	)
		sim.state.cheated = true;
	ui.clear();
	clearActions();
	game.go("play", null, { fade: 0 });
	game.splitScreen(options.coop ? 2 : 1, { layout: "rows" });
	activity();
	sound.unlock();
	if (touch.active) {
		sim.state.aircraft.throttle = 0.85;
		ui.shell.tutorial(
			"TWO THUMBS. ONE BOMBER.",
			"Left drag flies. Right drag aims. Tap a context action for the next job. The menu opens your map.",
			9,
		);
	}
	return sim.state;
}
function toTitle(next = {}) {
	if (online.active) {
		ui.clear();
		return;
	}
	sound.stop();
	ui.clear();
	clearActions();
	game.splitScreen(1);
	while (game.players.length > 1) game.removePlayer(2);
	attract = false;
	demoSim = null;
	document.getElementById("attract-label").hidden = true;
	sim.reset({ seed: 1942 });
	game.go("title", next, { fade: 0 });
	resultShown = false;
	activity();
}
function titleState() {
	const s = sim.state;
	s.aircraft.x = 294000;
	s.aircraft.y = -8000;
	s.aircraft.z = 13000;
	s.aircraft.yaw = 0.24;
	s.aircraft.pitch = 0.025;
	s.aircraft.bank = -0.12;
	s.aircraft.speed = 1120;
	s.aircraft.throttle = 0.84;
	s.aircraft.airborne = true;
	s.aircraft.gear = 0;
	s.route = { ...MISSION.waypoints.harbor, target: "harbor" };
	s.t = 125;
	view.update(0, s);
}
function enterAttract() {
	if (online.active) return;
	attract = true;
	ui.clear();
	game.splitScreen(1);
	demoSim = new BomberSim({ seed: 1942, attract: true });
	demoSim.state.invulnerable = true;
	demoSim.state.infinite = true;
	demoSim.state.aircraft.throttle = 0.9;
	document.getElementById("attract-label").hidden = false;
}
function exitAttract() {
	if (!attract) return false;
	attract = false;
	demoSim = null;
	document.getElementById("attract-label").hidden = true;
	sound.stop();
	titleState();
	ui.title();
	clearActions();
	activity();
	return true;
}
function demoBot(dt) {
	const s = demoSim.state,
		a = s.aircraft,
		id = 1;
	if (s.result) {
		s.resultWait = (s.resultWait || 0) + dt;
		if (s.resultWait > 3) {
			demoSim.reset({ seed: s.seed + 1, attract: true });
			demoSim.state.invulnerable = true;
			demoSim.state.infinite = true;
		}
		return;
	}
	if (s.primary && !s.demoHome && s.t > (s.strikeAt || 0) + 9) {
		s.demoHome = true;
		a.engines[2] = 0.5;
		demoSim.command(id, { type: "route", target: "home" });
		demoSim.command(id, { type: "station", station: "pilot" });
	}
	if (a.x > 303000 && !s.primary && s.phase !== "return") {
		demoSim.command(id, { type: "station", station: "bombs" });
		s.doorsOpen = true;
		const target = s.targets[0];
		if (
			Math.hypot(s.prediction.x - target.x, s.prediction.y - target.y) < 1100 &&
			s.bombsLeft &&
			!s.demoReleased
		) {
			demoSim.command(id, { type: "release", salvo: 2 });
			s.demoReleased = true;
			s.strikeAt = s.t;
		}
	} else if (!s.demoHome) {
		const e = s.enemies.find((e) => e.alive);
		if (e) {
			if (s.players[0].station !== e.bearing)
				demoSim.command(id, { type: "station", station: e.bearing });
			const yaw = angle(
					Math.atan2(e.y - a.y, e.x - a.x) - a.yaw - BEARINGS[e.bearing],
				),
				pitch = Math.atan2(e.z - a.z, Math.hypot(e.x - a.x, e.y - a.y));
			demoSim.command(id, { type: "aim", yaw, pitch });
			demoSim.command(id, { type: "controls", fire: true });
			if (e.t > 18 && Math.floor(s.t * 5) % 3 === 0) demoSim.hitFighter(e, 0.1);
		} else if (s.players[0].station !== "pilot")
			demoSim.command(id, { type: "station", station: "pilot" });
	}
	if (s.flak.some((f) => !f.burst) && Math.floor(s.t) % 8 < 3) a.z += dt * 100;
	demoSim.step(dt);
}
function inputStep(dt) {
	if (!ready) return;
	const rawPads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
	for (const pad of rawPads) {
		if (pad.connected === false) continue;
		const deliberate =
			pad.buttons.some((b) => b.pressed || b.value > 0.5) ||
			pad.axes.some((v) => Math.abs(v) > 0.28);
		if (deliberate) {
			if (attract) {
				exitAttract();
				return;
			}
			activity();
		}
	}
	if (game.paused && lastPaused) game.pausedBy = pauseOwner;
	else if (game.paused) pauseOwner = game.pausedBy || 1;
	if (game.paused && game.pausedBy === 2)
		for (const k of [
			"pause",
			"confirm",
			"cancel",
			"up",
			"down",
			"left",
			"right",
		])
			game.input.suppress(k);
	if (game.paused !== lastPaused) {
		lastPaused = game.paused;
		clearActions();
		sound.pause(game.paused && !online.active);
	}
	if (attract) return;
	if (game.sceneName === "title") {
		if (
			ui.shell.screen === "title" &&
			(game.real - idleAt >= 10 || performance.now() - idleWall >= 10000)
		)
			enterAttract();
		return;
	}
	if (game.sceneName !== "play" || sim.state.result || online.ended) return;
	if (game.paused || ui.shell.screen) {
		for (const p of localPlayers()) send({ type: "controls" }, p.id);
		if (ui.shell.screen === "emergency") {
			const I =
				game.players.find((i) => i.player === (ui.menuOwner || 1)) ||
				game.input;
			if (
				I.down("jettison") ||
				(I.down("confirm") && document.activeElement?.dataset.holdJettison)
			) {
				ui.holdJettisonStart ??= game.real;
				if (game.real - ui.holdJettisonStart >= 1.5) {
					send({ type: "jettison", held: 1.5 }, ui.menuOwner || 1);
					ui.holdJettisonStart = null;
					ui.shell.toast(
						"PAYLOAD JETTISONED",
						"Remaining ordnance released safely.",
					);
				}
			} else ui.holdJettisonStart = null;
		}
		return;
	}
	if (ui.dev.freeCamera && !online.active) {
		const I = game.input,
			m = I.move();
		view.freeControl(
			{
				forward: -m[1],
				right: m[0],
				up: Number(I.down("throttleUp")) - Number(I.down("throttleDown")),
				yaw: I.value("aimRight") - I.value("aimLeft"),
				pitch: I.value("aimUp") - I.value("aimDown"),
				fast: I.down("zoom"),
			},
			dt,
		);
		send({ type: "controls" });
		return;
	}
	const pp = localPlayers();
	for (let index = 0; index < pp.length; index++) {
		const p = pp[index],
			I = online.active ? game.input : game.players[index] || game.input,
			m = I.move(),
			isGun = BEARINGS[p.station] !== undefined;
		if (I.anyPressed()) {
			activity();
			if (sim.state.phase === "launch") sim.state.revealSkipped = true;
		}
		p.input = I.lastDevice;
		if (I.pressed("wheel")) {
			clearActions();
			ui.wheel(p.id);
			return;
		}
		if (I.pressed("map")) {
			clearActions();
			ui.preview = sim.state.primary ? "home" : "harbor";
			ui.map(p.id);
			return;
		}
		if (I.pressed("pilot")) {
			send({ type: "station", station: "pilot" }, p.id);
			fireLocked[p.id] = true;
		}
		if (I.pressed("guns")) {
			send(
				{
					type: "station",
					station: sim.state.enemies.find((e) => e.alive)?.bearing || "nose",
				},
				p.id,
			);
			fireLocked[p.id] = true;
		}
		if (I.pressed("bombs")) {
			send({ type: "station", station: "bombs" }, p.id);
			fireLocked[p.id] = true;
		}
		if (isGun)
			for (const station of Object.keys(BEARINGS))
				if (I.pressed(station)) {
					send({ type: "station", station }, p.id);
					fireLocked[p.id] = true;
				}
		if (I.pressed("hold")) send({ type: "hold" }, p.id);
		if (I.pressed("extinguish")) send({ type: "extinguish" }, p.id);
		jettisonHold[p.id] = I.down("jettison")
			? (jettisonHold[p.id] || 0) + dt
			: 0;
		if (jettisonHold[p.id] > 1.5) {
			send({ type: "jettison", held: jettisonHold[p.id] }, p.id);
			jettisonHold[p.id] = -100;
			ui.shell.toast(
				"PAYLOAD JETTISONED",
				"Return performance improved. Ordnance is gone.",
				3,
			);
		}
		const sight = p.station === "bombs";
		if (sight && I.pressed("doors")) send({ type: "doors" }, p.id);
		if (sight && I.pressed("salvo"))
			send(
				{
					type: "salvo",
					salvo: [1, 2, 4][([1, 2, 4].indexOf(sim.state.salvo) + 1) % 3],
				},
				p.id,
			);
		if (!I.down("fire")) fireLocked[p.id] = false;
		const canFire = !fireLocked[p.id] && game.real > blockUntil;
		if (sight && I.pressed("fire") && canFire)
			send({ type: "release", salvo: sim.state.salvo }, p.id);
		const sens = game.settings.aimSensitivity;
		let ax = (I.value("aimRight") - I.value("aimLeft")) * sens,
			ay = (I.value("aimDown") - I.value("aimUp")) * sens;
		if (isGun && I.lastDevice !== "gamepad") {
			ax += m[0] * sens;
			ay += m[1] * sens;
		}
		if (touch.active && index === 0) {
			ax += touch.right[0] * sens;
			ay += touch.right[1] * sens;
		}
		if (
			I.lastDevice === "mouse" &&
			I.pointer() &&
			(isGun || p.station === "pilot")
		) {
			const pos = I.pointer(),
				vp = game.viewports[index],
				W = vp?.w || game.W,
				H = vp?.h || game.H,
				x = pos[0] - (vp?.x || 0),
				y = pos[1] - (vp?.y || 0);
			send(
				{
					type: "aim",
					yaw: clamp((x / W - 0.5) * 1.25, -0.83, 0.83),
					pitch: clamp((0.5 - y / H) * 0.85, -0.48, 0.65),
				},
				p.id,
			);
		}
		p.zoom = I.down("zoom");
		let bank = m[0],
			pitch = -m[1];
		if (touch.active && index === 0) {
			bank = touch.left[0];
			pitch = -touch.left[1];
			if (
				Math.abs(bank) + Math.abs(pitch) < 0.12 &&
				sim.state.aircraft.holdMode === "route"
			)
				sim.state.aircraft.hold = true;
		}
		send(
			{
				type: "controls",
				bank: p.station === "pilot" ? bank : 0,
				pitch:
					p.station === "pilot"
						? pitch * (game.settings.invertFlight ? -1 : 1)
						: 0,
				throttleDelta:
					p.station === "pilot"
						? Number(I.down("throttleUp")) - Number(I.down("throttleDown"))
						: 0,
				aimX: ax,
				aimY: ay * (game.settings.invertY ? -1 : 1),
				fire:
					isGun && (I.down("fire") || (touch.active && touch.fire)) && canFire,
				zoom: I.down("zoom"),
			},
			p.id,
		);
	}
}
function fixed(dt) {
	if (attract) {
		for (let i = 0; i < 10; i++) demoBot(dt);
		const ds = demoSim.state;
		ds.aircraft.shake = 0;
		view.update(dt, ds);
		sound.update(dt, ds, { active: true });
		return;
	}
	if (game.sceneName === "title") {
		sim.state.t += dt;
		sim.state.aircraft.x +=
			Math.cos(sim.state.aircraft.yaw) * sim.state.aircraft.speed * dt;
		sim.state.aircraft.y +=
			Math.sin(sim.state.aircraft.yaw) * sim.state.aircraft.speed * dt;
		view.update(dt, sim.state);
		return;
	}
	if (game.sceneName === "play") {
		if (!online.active && !ui.dev.paused) sim.step(dt);
		if (sim.state.result && !online.active && !resultShown) {
			resultShown = true;
			sound.stop();
			ui.results();
		}
		view.update(dt, sim.state);
		sound.update(dt, sim.state, {
			active:
				!online.server && !online.ended && (!online.active || online.playing),
			paused: game.paused && !online.active,
		});
	}
}
function draw(r) {
	if (!ready || online.server) return;
	const state = attract ? demoSim.state : sim.state,
		players = online.active ? localPlayers() : state.players;
	view.draw(r, state, players, {
		exterior:
			(game.sceneName === "title" &&
				(!attract || state.t < 30 || state.phase === "landing")) ||
			state.phase === "landing" ||
			(state.phase === "launch" &&
				state.t > 14 &&
				state.t < 18 &&
				!state.revealSkipped),
		title: game.sceneName === "title" && !attract,
		freeCamera: ui.dev.freeCamera,
		debug: ui.dev.debug,
		definition: sim.definition,
	});
	if (!r.viewport || r.viewport.i === 0) ui.paint(1 / 60);
}
function setupTouch() {
	const cv = game.screen.canvas;
	cv.addEventListener(
		"pointerdown",
		(e) => {
			pointerClickGuard = null;
			if (
				e.pointerType !== "touch" ||
				ui.shell.screen ||
				game.sceneName !== "play"
			)
				return;
			touch.active = true;
			const side = e.clientX < innerWidth * 0.5 ? "left" : "right";
			touch.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, side });
			cv.setPointerCapture?.(e.pointerId);
			e.preventDefault();
		},
		{ passive: false },
	);
	cv.addEventListener(
		"pointermove",
		(e) => {
			const f = touch.fingers.get(e.pointerId);
			if (!f) return;
			touch[f.side] = [
				clamp((e.clientX - f.x) / 85, -1, 1),
				clamp((e.clientY - f.y) / 85, -1, 1),
			];
			e.preventDefault();
		},
		{ passive: false },
	);
	const lift = (e) => {
		const f = touch.fingers.get(e.pointerId);
		if (f) {
			touch[f.side] = [0, 0];
			touch.fingers.delete(e.pointerId);
		}
	};
	cv.addEventListener("pointerup", lift);
	cv.addEventListener("pointercancel", lift);
	game.input._cornerMenu = true;
	game.input.touchButtons([]);
	game.input.touchFilter = () => false;
}
function detectDevices() {
	addEventListener("gamepaddisconnected", (e) => {
		clearActions();
		if (!online.active && sim.state.players.length > 1) {
			const index = game.players.findIndex(
				(I) => I.padIndex === e.gamepad.index || I.pad === e.gamepad.index,
			);
			if (index === 1) {
				sim.depart(2);
				game.removePlayer(2);
				game.splitScreen(1);
				ui.shell.toast(
					"CREW MEMBER DISCONNECTED",
					"AI takes the station. The commander can finish.",
					6,
				);
			} else game.pause("controller");
		} else if (!online.active && game.sceneName === "play")
			game.pause("controller");
	});
}
addEventListener(
	"keydown",
	(e) => {
		if (e.repeat) return;
		if (exitAttract()) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		activity();
		sound.unlock();
	},
	{ capture: true },
);
addEventListener(
	"pointerdown",
	(e) => {
		pointerClickGuard = null;
		if (e.pointerType === "touch") touch.active = true;
		if (exitAttract()) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		activity();
		sound.unlock();
	},
	{ capture: true },
);
addEventListener(
	"pointermove",
	(e) => {
		if (e.pointerType !== "mouse") return;
		if (
			!lastPointer ||
			Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) > 6
		) {
			activity();
			lastPointer = { x: e.clientX, y: e.clientY };
		}
	},
	{ passive: true },
);
addEventListener("pointerup", (e) => {
	if (touch.firePointer === e.pointerId) {
		touch.fire = false;
		touch.firePointer = null;
	}
});
addEventListener("pointercancel", (e) => {
	if (touch.firePointer === e.pointerId) {
		touch.fire = false;
		touch.firePointer = null;
	}
});
addEventListener(
	"click",
	(e) => {
		if (
			pointerClickGuard &&
			e.detail !== 0 &&
			performance.now() < pointerClickGuard.until &&
			(e.pointerId === undefined || e.pointerId === pointerClickGuard.id)
		) {
			pointerClickGuard = null;
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	},
	{ capture: true },
);
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("blur", () => {
	clearActions();
	touch.left = [0, 0];
	touch.right = [0, 0];
});
addEventListener("pagehide", () => {
	clearInterval(sessionClock);
	online.dispose();
	sound.dispose();
	view.dispose();
});
async function boot() {
	try {
		const info = await online.connect();
		game.o.autoPause = !info;
		if (online.ended) {
			game.stop();
			return;
		}
		if (info) {
			game.live = true;
			game.o.live = true;
			ui.shell._o.screens.pause.text =
				"The shared aircraft keeps flying. This menu is local to you.";
		}
		if (
			!online.server &&
			new URL(location.href).searchParams.get("backend") !== "webgpu"
		) {
			const probe = document.createElement("canvas"),
				gl = probe.getContext("webgl2");
			if (!gl) throw Error("WebGL 2 is unavailable in this browser.");
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		}
		await view.init({ render: !online.server });
		ready = true;
		document.getElementById("loading").hidden = true;
		game.debug = {
			snapshot: () => ({
				scene: game.sceneName,
				attract,
				state: sim.snapshot(),
				owners: sim.state.owners,
				online: {
					active: online.active,
					server: online.server,
					playing: online.playing,
					stats: online.stats,
				},
				audio: sound.inspect(),
				errors: game.errors,
			}),
			teleport: (x, y, z) => {
				if (!online.active) {
					sim.state.cheated = true;
					Object.assign(sim.state.aircraft, { x, y, z });
				}
			},
		};
		const debug = {
			...app,
			ui,
			ready: true,
			get attract() {
				return attract;
			},
			get demo() {
				return demoSim;
			},
			exitAttract,
			enterAttract,
		};
		globalThis.__bomber = debug;
		globalThis.game = game;
		game.hook("input", inputStep);
		setupTouch();
		detectDevices();
		if (online.ended) return;
		game.start({
			scene: info ? "play" : "title",
			scenes: {
				title: {
					pausable: false,
					enter(data) {
						titleState();
						ui.title();
						if (data?.briefing) ui.brief(!!data.coop);
					},
					update: fixed,
					draw,
				},
				play: {
					pausable: true,
					enter() {
						if (!online.active) {
							ui.clear();
							game.splitScreen(
								sim.state.players.filter((p) => p.connected).length > 1 ? 2 : 1,
								{ layout: "rows" },
							);
						}
					},
					update: fixed,
					draw,
					back() {
						return false;
					},
				},
			},
		});
		if (info) {
			ui.clear();
			game.splitScreen(1);
			let last = performance.now(),
				acc = 0;
			sessionClock = setInterval(() => {
				const now = performance.now(),
					dt = Math.min(0.2, (now - last) / 1000);
				last = now;
				online.update(dt);
				if (online.isHost && online.playing && !online.ended) {
					acc += dt;
					while (acc >= 1 / 120) {
						sim.step(1 / 120);
						acc -= 1 / 120;
					}
					if (sim.state.result) online.finish(sim.state.result.reason);
				} else acc = 0;
			}, 16);
			online.ready();
			if (online.server) {
				game.stop();
				document.body.dataset.server = "true";
			}
		}
	} catch (error) {
		console.error("Bomber boot:", error);
		document.getElementById("loading").hidden = true;
		const box = document.getElementById("support");
		box.hidden = false;
		box.innerHTML =
			"<strong>THIS AIRCRAFT NEEDS WEBGL 2</strong><p>Open this file in a current Chromium, Safari or WebKit browser with 3D graphics enabled. This browser could not create the native renderer.</p><p></p>";
		box.lastElementChild.textContent = String(error?.message || error);
		globalThis.__bomber = { ...app, ready: false, error: String(error) };
	}
}
boot();
