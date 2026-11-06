import { Sound } from "./audio.js";
import { Game, ZERO } from "./game.js";
import { Input } from "./input.js";
import { Network } from "./network.js";
import { UI } from "./ui.js";
import { T, View } from "./view.js";

const headless = new URLSearchParams(location.search).get("headless") === "1";
const BASE_SETTINGS = {
	master: 0.75,
	music: 0.1,
	sfx: 0.65,
	glyphs: "playstation",
	guide: true,
	shake: true,
	best: 0,
};
let saved = {};
try {
	saved = JSON.parse(localStorage.getItem("combrisk-v1") || "{}");
} catch {}
const settings = { ...BASE_SETTINGS, ...saved };
const canvas = document.getElementById("scene");
const input = new Input(canvas),
	sound = new Sound(),
	game = new Game(),
	net = new Network(),
	ui = new UI(input, settings);
let view = null,
	loaded = false,
	attract = false,
	hubStarted = false,
	menuStack = [],
	resultKey = "",
	suppressUntil = 0,
	debugLines = null,
	_realClock = 0,
	frameCount = 0;
const persist = () => {
	try {
		localStorage.setItem("combrisk-v1", JSON.stringify(settings));
	} catch {}
	sound.volumes(settings);
};
function resume() {
	menuStack = [];
	game.paused = false;
	ui.clear();
}
function show(name, push = true) {
	if (push) menuStack.push(ui.name);
	game.paused = !net.active;
	switch (name) {
		case "title":
			title();
			break;
		case "pause":
			ui.pause(game.snapshot(), net.hub, net.active);
			break;
		case "versus":
			ui.versus();
			break;
		case "settings":
			ui.settingsMenu();
			break;
		case "how":
			ui.how();
			break;
		case "about":
			ui.about();
			break;
		case "dev":
			ui.dev(game);
			break;
		case "link":
			ui.link();
			break;
	}
}
function back() {
	if (ui.name === "title") return;
	if (ui.name === "pause") {
		resume();
		return;
	}
	const previous = menuStack.pop() || "title";
	if (previous === "game") resume();
	else show(previous, false);
}
function title() {
	if (net.hub) return;
	attract = false;
	net.close(true);
	game.cheats = {
		invincible: false,
		aiPaused: false,
		colliders: false,
		slowmo: 1,
	};
	game.start("title", 0);
	game.paused = false;
	ui.title();
	input.menu = true;
	menuStack = [];
	resultKey = "";
	input.lastInput = performance.now();
	document.getElementById("attract").hidden = true;
	document.getElementById("touch-boost").style.display = "none";
}
function start(mode = "solo") {
	attract = false;
	net.close(true);
	game.cheats = {
		invincible: false,
		aiPaused: false,
		colliders: false,
		slowmo: 1,
	};
	game.start(mode, mode === "solo" ? 0 : ui.selectedHeat);
	ui.clear();
	menuStack = [];
	resultKey = "";
	sound.voice("go");
}
function exitAttract() {
	if (!attract) return;
	title();
	suppressUntil = performance.now() + 300;
}
function pause() {
	if (!loaded || net.ended || performance.now() < suppressUntil) return;
	if (attract) {
		exitAttract();
		return;
	}
	if (ui.name === "game") {
		menuStack = [];
		show("pause");
	} else if (ui.name !== "title") back();
}
input.onActivity = () => {
	if (loaded) {
		if (attract) exitAttract();
		sound
			.wake()
			.then(() => sound.volumes(settings))
			.catch(() => {});
	}
};
input.onPause = pause;
input.onBack = back;
input.onConfirm = () => {
	if (performance.now() > suppressUntil && input.menu) ui.confirm();
};
input.onMenu = (x, y) => ui.navigate(x, y);
input.onTouch = (t) => ui.touchSticks(t);
ui.onSetting = (key, value) => {
	settings[key] = value;
	persist();
};
ui.onTune = (key, value) => {
	const previous = game.tuning[key];
	game.tuning[key] = value;
	if (key === "roundTime")
		game.timer = Math.max(0, game.timer + value - previous);
};
ui.onAction = async (action, button) => {
	if (!loaded || net.ended || performance.now() < suppressUntil) return;
	sound
		.wake()
		.then(() => sound.volumes(settings))
		.catch(() => {});
	sound.play("click");
	input.lastInput = performance.now();
	try {
		switch (action) {
			case "solo":
				start("solo");
				break;
			case "local":
				start("local");
				break;
			case "resume":
				resume();
				break;
			case "pause":
				pause();
				break;
			case "back":
				back();
				break;
			case "versus":
			case "settings":
			case "how":
			case "about":
			case "dev":
			case "link":
				show(action);
				break;
			case "arena":
				ui.selectedHeat = (ui.selectedHeat + 1) % 4;
				ui.versus();
				break;
			case "quit":
				title();
				break;
			case "continue":
				game.nextHeat();
				resume();
				break;
			case "rematch":
				if (net.active && net.kind === "host") {
					game.start("link", ui.selectedHeat);
					ui.clear();
					resultKey = "";
				} else start(game.mode === "solo" ? "solo" : "local");
				break;
			case "glyphs":
				settings.glyphs = settings.glyphs === "xbox" ? "playstation" : "xbox";
				persist();
				ui.settingsMenu();
				break;
			case "guide":
				settings.guide = !settings.guide;
				persist();
				ui.settingsMenu();
				break;
			case "shake":
				settings.shake = !settings.shake;
				persist();
				ui.settingsMenu();
				break;
			case "resetSettings":
				Object.assign(settings, BASE_SETTINGS);
				persist();
				ui.settingsMenu();
				ui.toast("Settings restored. Music: 10%.");
				break;
			case "fullscreen":
				if (!document.fullscreenElement)
					await document.documentElement.requestFullscreen?.();
				else await document.exitFullscreen?.();
				break;
			case "god":
				game.cheats.invincible = !game.cheats.invincible;
				ui.dev(game);
				break;
			case "freezeAI":
				game.cheats.aiPaused = !game.cheats.aiPaused;
				ui.dev(game);
				break;
			case "colliders":
				game.cheats.colliders = !game.cheats.colliders;
				ui.dev(game);
				break;
			case "slowmo":
				game.cheats.slowmo = game.cheats.slowmo === 1 ? 0.35 : 1;
				ui.dev(game);
				break;
			case "repair":
			case "pickups":
				game.dev(action);
				ui.toast(
					action === "repair"
						? "Armour restored. Shield on."
						: "All three pickups are on the field.",
				);
				break;
			case "next":
			case "restart":
				game.dev(action);
				game.paused = true;
				ui.dev(game);
				break;
			case "resetTune":
				game.resetTuning();
				ui.dev(game);
				ui.toast("Default balance restored.");
				break;
			case "linkHost":
				net.close(true);
				ui.linkRole = "host";
				ui.linkOut = "";
				ui.linkMenu();
				break;
			case "linkJoin":
				net.close(true);
				ui.linkRole = "guest";
				ui.linkOut = "";
				ui.linkMenu();
				break;
			case "createOffer": {
				button.disabled = true;
				ui.linkStatus("Gathering the invitation…");
				const code = await net.hostOffer();
				ui.linkOut = code;
				document.getElementById("link-out").value = code;
				ui.linkStatus("Invitation ready. Send it to your friend.");
				button.disabled = false;
				break;
			}
			case "createAnswer": {
				const code = document.getElementById("link-in").value;
				if (!code) throw Error("Paste a host invitation first.");
				button.disabled = true;
				ui.linkStatus("Preparing your reply…");
				const reply = await net.joinOffer(code);
				ui.linkOut = reply;
				const out = document.getElementById("link-out");
				if (out) out.value = reply;
				ui.linkStatus("Reply ready. Send it back to the host, then wait here.");
				button.disabled = false;
				break;
			}
			case "acceptAnswer":
				await net.acceptAnswer(document.getElementById("link-in").value);
				ui.linkStatus("Connecting the pilots…");
				break;
			case "pasteCode": {
				try {
					document.getElementById("link-in").value =
						await navigator.clipboard.readText();
					ui.linkStatus("Code pasted.");
				} catch {
					ui.linkStatus(
						"Paste the code into the box using your device keyboard.",
					);
				}
				break;
			}
			case "copyCode": {
				const code = document.getElementById("link-out").value;
				if (!code) throw Error("Generate a code first.");
				try {
					await navigator.clipboard.writeText(code);
					ui.linkStatus("Code copied.");
				} catch {
					document.getElementById("link-out").select();
					ui.linkStatus("Code selected. Use Ctrl+C to copy.");
				}
				break;
			}
		}
	} catch (e) {
		if (button) button.disabled = false;
		if (ui.name === "link") ui.linkStatus(e.message, true);
		else ui.toast(e.message || String(e));
	}
};
net.onInput = (seat, data) => {
	const t = game.tanks.find((t) => t.seat === seat && t.human);
	if (t) game.input(t.id, data);
};
net.onSnapshot = (s) => {
	game.applyRemote(s, net.hub ? net.info.me : 1);
	if (ui.name === "waiting") ui.clear();
};
net.onConnected = (role) => {
	if (role === "host") {
		game.start("link", ui.selectedHeat);
		game.tanks[0].name = "HOST";
		game.tanks[1].name = "RIVAL";
		ui.clear();
		resultKey = "";
	} else {
		ui.waiting("The host is setting the angles.");
	}
	menuStack = [];
	sound.play("pickup");
};
net.onDisconnect = (msg) => {
	if (!net.hub && loaded) {
		game.paused = true;
		ui.waiting(msg);
		ui.toast(msg);
	}
};
net.onStart = () => {
	hubStarted = true;
	game.paused = false;
	ui.clear();
	game.countdown = Math.max(0, -window.AIHub.time() / 1000);
};
net.onTimeUp = () => net.finish(game.snapshot());
net.onLeave = (id) => {
	net.leftPlayer(id);
	const t = game.tanks.find((t) => t.seat === id);
	if (t) {
		t.human = false;
		t.local = false;
	}
	if (net.kind === "host") ui.toast("A pilot left. The field carries on.");
};
net.onEnd = () => {
	game.paused = true;
	game.phase = "ended";
	input.blocked = true;
	input.clear();
	sound.mute(true);
	ui.screen.innerHTML = "";
	ui.name = "ended";
	input.menu = false;
	document.getElementById("round-intro").hidden = true;
};
game.onEvent = (e) => {
	if (!loaded && e.type !== "stage") return;
	if (e.type === "stage") return;
	if (e.type === "dust") {
		view?.fx("dust", e.x, e.z, e.color, e.extra);
		return;
	}
	if (
		["shot", "bounce", "hit", "boom", "crate", "pickup", "boost"].includes(
			e.type,
		)
	) {
		view?.fx(e.type, e.x, e.z, e.color, e.extra);
		sound.play(e.type === "crate" ? "hit" : e.type);
	}
	if (["tick", "go", "win", "lose"].includes(e.type)) sound.play(e.type);
	if (e.type === "boom" && !attract) {
		const state = game.snapshot(),
			shooter = state.tanks.find((t) => t.id === e.extra.owner);
		ui.announce(
			`${e.extra.bank ? "BANK SHOT!" : "KNOCKOUT!"} ${shooter?.name || ""} +${e.extra.points || 1}`,
		);
		if (shooter?.local) {
			const pad = input.pads[0];
			try {
				pad?.vibrationActuator
					?.playEffect("dual-rumble", {
						duration: 130,
						strongMagnitude: 0.35,
						weakMagnitude: 0.6,
					})
					?.catch(() => {});
			} catch {}
		}
	}
	if (e.type === "pickup" && e.extra.type) {
		const state = game.snapshot();
		if (state.tanks.find((t) => t.id === e.extra.id)?.local)
			ui.announce(
				e.extra.type === "repair"
					? "PATCHED UP."
					: e.extra.type === "shield"
						? "SHIELD ON."
						: "RAPID FIRE!",
			);
	}
};
function aimInput(data, t) {
	if (data.mouse && t && view) {
		const p = view.mouseWorld(input.mouse);
		data.ax = p.x - t.x;
		data.az = p.z - t.z;
		const len = Math.hypot(data.ax, data.az);
		if (len > 0.1) {
			data.ax /= len;
			data.az /= len;
			data.aim = true;
		}
	}
	return data;
}
function gatherInputs() {
	if (net.hub && net.info?.server) return ZERO();
	const state = game.snapshot();
	const me = net.hub ? net.info?.me : net.kind === "guest" ? 1 : 0;
	const local = state.tanks.find((t) => t.seat === me) || state.tanks[0];
	const data = aimInput(input.read(0, game.mode === "local"), local);
	if (!game.remote && local?.human) game.input(local.id, data);
	if (game.mode === "local") game.input(1, input.read(1, true));
	return data;
}
function fixedStep(dt) {
	if (net.hub && !hubStarted) return;
	if (net.kind === "guest" && net.active) return;
	game.step(dt);
}
function debugPhysics() {
	if (!view) return;
	if (!game.cheats.colliders || !game.world) {
		if (debugLines) debugLines.visible = false;
		return;
	}
	const d = game.world.debugRender();
	if (!debugLines) {
		debugLines = new T.LineSegments(
			new T.BufferGeometry(),
			new T.LineBasicMaterial({
				vertexColors: true,
				depthTest: false,
				transparent: true,
				opacity: 0.8,
			}),
		);
		debugLines.renderOrder = 999;
		view.scene.add(debugLines);
	}
	debugLines.visible = true;
	debugLines.geometry.dispose();
	debugLines.geometry = new T.BufferGeometry();
	debugLines.geometry.setAttribute(
		"position",
		new T.BufferAttribute(d.vertices, 3),
	);
	debugLines.geometry.setAttribute("color", new T.BufferAttribute(d.colors, 4));
}
let previous = 0,
	accumulator = 0;
function frame(ms) {
	if (!loaded) return;
	const dt = Math.min(0.1, previous ? (ms - previous) / 1000 : 1 / 60);
	previous = ms;
	_realClock += dt;
	frameCount++;
	input.poll();
	if (net.hub && !hubStarted) {
		requestAnimationFrame(frame);
		return;
	}
	if (ui.name === "title" && performance.now() - input.lastInput >= 10000) {
		attract = true;
		game.start("attract", 0);
		ui.clear();
		ui.name = "attract";
		input.menu = true;
		document.getElementById("attract").hidden = false;
	}
	const data = gatherInputs();
	accumulator += dt;
	let steps = 0;
	while (accumulator >= 1 / 60 && steps++ < 8) {
		fixedStep(1 / 60);
		accumulator -= 1 / 60;
	}
	const state = game.snapshot();
	if (net.active) net.update(dt, data, () => game.snapshot());
	if (net.hub && hubStarted && net.kind === "host" && game.finished)
		net.finish(state);
	if (!net.hub && state.phase === "results" && !attract) {
		const key = `${state.serial}:${state.heat}`;
		if (resultKey !== key) {
			resultKey = key;
			if (state.mode === "solo" && state.finished) {
				settings.best = Math.max(settings.best, state.heatWins);
				persist();
			}
			ui.results(state, net.active && net.kind === "guest");
			menuStack = [];
		}
	}
	if (view) {
		view.sync(state, dt);
		const local = state.tanks.find((t) => t.local);
		const paths =
			ui.name === "game" && settings.guide && !game.remote && local
				? game.aimPath(game.tanks.find((t) => t.id === local.id))
				: [];
		const target =
			ui.name === "game" && input.device === "keyboard" && input.mouse.active
				? view.mouseWorld(input.mouse)
				: null;
		view.aimPath(paths, target, state.vehicle === "plane");
		if (!settings.shake) view.shake = 0;
		view.update(dt, ui.name === "title");
		debugPhysics();
		view.render();
	}
	ui.update(state, dt, attract, game);
	sound.update(ui.name === "game" || attract);
	requestAnimationFrame(frame);
}
async function init() {
	const [info] = await Promise.all([net.initHub(), game.init()]);
	if (!info?.server && !headless) {
		view = new View(canvas);
		game.onStage = (level, obstacles) => {
			view.arena(level, obstacles);
		};
	}
	if (net.hub && info) {
		game.start("hub", 0, info.players);
		for (const t of game.tanks) t.local = t.seat === info.me;
		game.paused = true;
		ui.clear();
	} else {
		game.start("title", 0);
		ui.title();
	}
	view?.sync(game.snapshot(), 0);
	document.getElementById("boot-status").textContent =
		"Laying the ink. Loading the battlefield.";
	if (view) await view.init(!net.hub);
	loaded = true;
	input.lastInput = performance.now();
	window.COMBRISK.ready = true;
	document.getElementById("boot").remove();
	persist();
	net.ready();
	requestAnimationFrame(frame);
}
window.COMBRISK = {
	ready: false,
	headless,
	game,
	input,
	ui,
	net,
	sound,
	settings,
	get view() {
		return view;
	},
	get backend() {
		return view?.backend || "unknown";
	},
	get frameCount() {
		return frameCount;
	},
	get attract() {
		return attract;
	},
	snapshot: () => game.snapshot(),
	start: (m = "solo", h = 0) => {
		ui.selectedHeat = h;
		start(m);
	},
	advance: (seconds) => {
		const steps = Math.ceil(seconds * 60);
		for (let i = 0; i < steps; i++) fixedStep(1 / 60);
		return game.snapshot();
	},
	command: (a) => game.dev(a),
	pause,
	resume,
	title,
	exitAttract,
	version: "1.0.0",
};
init().catch((e) => {
	console.error(e);
	document.getElementById("boot-status").textContent =
		"The engines could not start. " +
		(e.message || String(e)) +
		" Try a browser with WebGPU or WebGL 2 support.";
	const b = document.createElement("button");
	b.textContent = "Try again";
	b.onclick = () => location.reload();
	if (!net.hub) document.getElementById("boot").append(b);
	if (net.hub) window.AIHub.fail(`Combrisk could not initialise: ${e.message}`);
	window.COMBRISK.error = e.message;
});
