import * as THREE from "three/webgpu";
import { RadioAudio } from "./audio.js";
import feedback from "./feedback.json";
import { DEFAULTS, initPhysics, Sortie } from "./game.js";
import { Controls } from "./input.js";
import { RadioLink } from "./network.js";
import { $, Interface } from "./ui.js";
import { RiverView, riverAt } from "./world.js";

const initialSettings = {
	music: 0.1,
	effects: 0.65,
	glyphs: "playstation",
	autoFire: false,
	assist: false,
	reducedFlash: false,
	best: 0,
};
let settings = { ...initialSettings };
try {
	settings = {
		...settings,
		...JSON.parse(localStorage.getItem("stream-scheme-settings") || "{}"),
	};
} catch {
	/* Private file contexts may deny persistence. */
}
const save = () => {
	try {
		localStorage.setItem("stream-scheme-settings", JSON.stringify(settings));
	} catch {
		/* Game remains playable without storage. */
	}
};
const audio = new RadioAudio();
audio.musicVolume = settings.music;
audio.effectsVolume = settings.effects;
let ui,
	view,
	controls,
	net,
	renderer,
	paused = false,
	remotePaused = false,
	localSeats = [0],
	titleTime = 0,
	attractReset = false;
let fastTesting = false,
	pendingEnd = null,
	accumulator = 0,
	didReceive = false,
	waitingForWing = false;

function event(e) {
	if (fastTesting || !ui || ui.screen === "title") return;
	if (e.type === "radio") {
		ui.radio(e);
		audio.gibberish();
	}
	if (e.type === "shoot" && (e.player === net.localId || !net.hub))
		audio.sfx("shoot");
	if (e.type === "destroy") {
		view.burst(
			e.x,
			e.s,
			e.kind === "fuel" ? "#f3df6c" : "#f7ac70",
			e.kind === "boss" ? 55 : e.kind === "bridge" ? 35 : 14,
			["boss", "bridge"].includes(e.kind),
		);
		audio.sfx("explode");
	}
	if (e.type === "impact") view.burst(e.x, e.s, "#fff0ac", 3);
	if (e.type === "damage") {
		audio.sfx("hit");
		view.burst(e.x, e.s, "#f47865", 8);
		flash();
	}
	if (e.type === "death") {
		audio.sfx("explode");
		view.burst(e.x, e.s, "#fff0b8", 20);
	}
	if (e.type === "roll") audio.sfx("roll");
	if (e.type === "burst") {
		audio.sfx("burst");
		view.burst(e.x, e.s + 20, "#f3df6c", 30, true);
		flash();
	}
	if (e.type === "cache" || e.type === "refuel") audio.sfx("fuel");
	if (e.type === "checkpoint") {
		audio.sfx("checkpoint");
		ui.banner(Math.min(2, e.index), "BRIDGE BREACHED");
	}
	if (e.type === "stage") ui.banner(e.index);
	if (e.type === "lowfuel") audio.sfx("alarm");
	if (e.type === "end") {
		pendingEnd = e;
		audio.sfx(e.won ? "win" : "explode");
		if (net.authority) net.send({ ...game.snapshot(), seq: net.seq++ });
		net.finish(e.won);
	}
	if (e.type === "attractend") attractReset = true;
}
const game = new Sortie(event);
function flash() {
	if (settings.reducedFlash) return;
	$("flash").classList.add("on");
	setTimeout(() => $("flash").classList.remove("on"), 60);
}
function startFlight(seats, hub = false) {
	paused = remotePaused = false;
	pendingEnd = null;
	accumulator = 0;
	didReceive = net.authority;
	waitingForWing = false;
	controls.clear();
	view.clear();
	game.reset(seats);
	game.devUsed = false;
	game.god = false;
	game.autopilot = false;
	ui.open(null);
	ui.banner(0);
	net.ended = false;
	net.started = true;
	net.finished = false;
	if (hub) localSeats = net.info.server ? [] : [net.localId];
	else if (!net.authority) localSeats = [net.localId];
	controls.localCount = localSeats.length;
	if (hub || !net.authority) {
		$("hub-wait").classList.remove("hidden");
		$("wait-heading").textContent = hub ? "WINGS LEVEL" : "RADIO CHECK";
		$("wait-detail").textContent = hub
			? "The wing launches together."
			: "Receiving the flight plan…";
	}
}
function title() {
	if (net.hub) return;
	paused = false;
	remotePaused = false;
	pendingEnd = null;
	net.started = false;
	localSeats = [0];
	controls.localCount = 1;
	view.clear();
	game.reset([{ id: 0, name: "PILOT 01" }]);
	game.phase = "title";
	game.god = false;
	game.autopilot = false;
	game.devUsed = false;
	game.progress = 140;
	game.players[0].x = riverAt(140).center + 9;
	game.players[0].y = -4;
	titleTime = 0;
	controls.clear();
	controls.lastAny = performance.now();
	ui.open("title");
	$("hub-wait").classList.add("hidden");
	$("touch-burst").classList.add("hidden");
	$("boss-hud").classList.add("hidden");
	$("stage-banner").classList.remove("show");
}
function togglePause() {
	if (net.ended || game.phase === "attract") return;
	if (ui.screen && ui.screen !== "title") {
		action("back");
		return;
	}
	if (game.phase !== "playing") return;
	paused = !paused;
	controls.clear();
	ui.open(paused ? "pause" : null);
	if (net.authority) net.send({ kind: "pause", paused });
}
function showDebrief(e) {
	paused = false;
	ui.endReason = e.reason;
	if (!game.devUsed && !game.god && !game.autopilot && !net.hub) {
		settings.best = Math.max(settings.best, game.score);
		save();
	}
	ui.open("debrief");
	$("boss-hud").classList.add("hidden");
	$("touch-burst").classList.add("hidden");
}
async function radioTask(kind) {
	const status = $("radio-status");
	if (!status) return;
	const incoming = $("radio-input").value;
	status.textContent = "Tuning the radio…";
	try {
		if (kind === "makeOffer") $("radio-output").value = await net.offer();
		if (kind === "makeAnswer") {
			$("radio-output").value = await net.answer(incoming);
			waitingForWing = true;
		}
		if (kind === "acceptAnswer") await net.accept(incoming);
		status.textContent =
			kind === "acceptAnswer"
				? "Reply received. Waiting for the radio link."
				: "Code ready. Copy it and send it to your wingmate.";
	} catch (error) {
		status.textContent = error.message;
	}
}
function action(name, value) {
	if (net?.ended && net.hub) return;
	if (name === "solo") {
		net.disconnect();
		localSeats = [0];
		net.launch();
		audio.unlock();
	} else if (name === "couch") {
		net.disconnect();
		const count = Math.min(4, Math.max(2, controls.pads.length));
		net.seats = Array.from({ length: count }, (_, i) => ({
			id: i,
			name: `PILOT 0${i + 1}`,
		}));
		localSeats = net.seats.map((p) => p.id);
		net.launch();
		audio.unlock();
	} else if (name === "wing") ui.open("wing");
	else if (name === "settings" || name === "manual" || name === "about") {
		ui.returnScreen = ui.screen || "pause";
		ui.open(name);
	} else if (name === "pause") togglePause();
	else if (name === "resume") {
		paused = false;
		controls.clear();
		ui.open(null);
		if (net.authority) net.send({ kind: "pause", paused: false });
	} else if (name === "back") {
		if (["settings", "manual", "about"].includes(ui.screen))
			ui.open(ui.returnScreen);
		else if (ui.screen === "dev") ui.open("pause");
		else if (ui.screen === "radio") ui.open("wing");
		else if (ui.screen === "wing") ui.open("title");
		else if (ui.screen === "pause") action("resume");
		else if (ui.screen === "debrief" && !net.hub) action("abort");
	} else if (name === "setting") {
		settings[value.key] = value.value / 100;
		audio.volume(settings.music, settings.effects);
		save();
	} else if (["autoFire", "assist", "reducedFlash"].includes(name)) {
		settings[name] = !settings[name];
		save();
		ui.refresh();
	} else if (name === "glyphs") {
		settings.glyphs = settings.glyphs === "xbox" ? "playstation" : "xbox";
		save();
		ui.refresh();
	} else if (name === "fullscreen") {
		const op = document.fullscreenElement
			? document.exitFullscreen()
			: document.documentElement.requestFullscreen();
		op?.catch(() =>
			ui.toast("Fullscreen is unavailable in this browser context."),
		);
	} else if (name === "dev") ui.open("dev");
	else if (name === "devValue" && net.authority) {
		game.params[value.key] = value.value;
		game.devUsed = true;
	} else if (name === "god" && net.authority) {
		game.god = !game.god;
		game.devUsed = true;
		ui.refresh();
	} else if (name === "autopilot" && net.authority) {
		game.autopilot = !game.autopilot;
		game.devUsed = true;
		ui.refresh();
	} else if (name === "jump" && net.authority) {
		game.jump(+value);
		game.devUsed = true;
		view.clear();
		ui.toast("Sector selected. Resume flight.");
	} else if (name === "refill" && net.authority) {
		game.fuel = 100;
		game.reserves = 9;
		for (const p of game.players) {
			p.hp = 3;
			p.bursts = 3;
			p.rollCooldown = 0;
		}
		game.devUsed = true;
		ui.toast("Fuel, hulls, bursts and rescue airframes restored.");
	} else if (name === "defaults" && net.authority) {
		Object.assign(game.params, DEFAULTS);
		game.god = false;
		game.autopilot = false;
		ui.refresh();
		ui.toast("Flight variables restored to defaults.");
	} else if (name === "retry" && net.authority && !net.hub) {
		controls.clear();
		view.clear();
		game.retry();
		paused = false;
		pendingEnd = null;
		ui.open(null);
		net.send({ kind: "start", seats: net.seats });
	} else if (name === "again" && net.authority && !net.hub) net.launch();
	else if (name === "abort" && !net.hub) {
		net.disconnect();
		title();
	} else if (name === "radio") ui.open("radio");
	else if (["makeOffer", "makeAnswer", "acceptAnswer"].includes(name))
		radioTask(name);
	else if (name === "copyCode") {
		const output = $("radio-output");
		if (!output.value) {
			ui.toast("Make a radio code first.");
			return;
		}
		output.select();
		navigator.clipboard
			?.writeText(output.value)
			.then(() => ui.toast("Radio code copied."))
			.catch(() => ui.toast("Code selected. Use your browser’s Copy command."));
	} else if (name === "radioLaunch") {
		if (!net.authority) {
			ui.toast("The flight leader starts the sortie.");
			return;
		}
		if (net.seats.length < 2) {
			ui.toast("Link a wingmate before taking flight.");
			return;
		}
		localSeats = [net.localId];
		net.launch();
	} else if (name === "disconnect") {
		net.disconnect();
		waitingForWing = false;
		ui.toast("Radio closed.");
		ui.open("wing");
	} else if (name === "hubInfo")
		ui.toast(
			"Open Stream Scheme in an AI Hub session. The Hub manages the invite, seats and start.",
		);
	else if (name === "touchBurst") controls.touchBurst = true;
}

async function boot() {
	renderer = new THREE.WebGPURenderer({
		canvas: $("game"),
		antialias: true,
		alpha: false,
		forceWebGL: new URLSearchParams(location.search).has("webgl"),
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.NoToneMapping;
	await Promise.all([renderer.init(), initPhysics()]);
	$("loading-status").textContent = "Charting one very long river.";
	view = new RiverView(renderer, $("game"));
	net = new RadioLink({
		onStart: startFlight,
		getGame: () => game,
		onSnapshot: (snap) => {
			if (!game.world) return;
			const oldPhase = game.phase;
			game.receive(snap);
			didReceive = true;
			if (["won", "lost"].includes(snap.phase) && oldPhase !== snap.phase)
				showDebrief({
					reason: snap.phase === "won" ? "RIVER LIBERATED" : "WING GROUNDED",
				});
		},
		onStatus: (text) => {
			if ($("radio-status")) $("radio-status").textContent = text;
			else ui?.toast(text);
		},
		onLeave: (id) => {
			const p = game.players.find((p) => p.id === id);
			if (p) {
				p.left = true;
				game.removePhysics(p);
			}
			if (!net.hub) net.seats = net.seats.filter((p) => p.id !== id);
			if (!net.hub && !net.authority && id === 0) {
				net.started = false;
				game.phase = "lost";
				ui.endReason = "RADIO LINK LOST";
				ui.open("debrief");
				$("hub-wait").classList.add("hidden");
				$("boss-hud").classList.add("hidden");
				$("touch-burst").classList.add("hidden");
			}
		},
		onRoster: (seats) => {
			if (!net.authority || !net.started) return;
			for (const seat of seats)
				if (!game.players.some((p) => p.id === seat.id && !p.left)) {
					game.players = game.players.filter((p) => p.id !== seat.id);
					game.addPlayer(seat);
				}
		},
		onEnd: (reason) => {
			audio.silence(true);
			controls.enabled = false;
			$("hub-wait").classList.remove("hidden");
			$("wait-heading").textContent =
				reason === "finished" ? "SORTIE RECORDED" : "RADIO CLOSED";
			$("wait-detail").textContent = "AI Hub will take it from here.";
		},
		onPause: (value) => {
			remotePaused = value;
			$("hub-wait").classList.toggle("hidden", !value);
			$("wait-heading").textContent = "HOLDING PATTERN";
			$("wait-detail").textContent = "The flight leader has the map out.";
		},
	});
	ui = new Interface({ action, settings, game, audio, net });
	controls = new Controls({
		audio,
		view,
		onType: (type) => ui.type(type),
		getMenu: () => !!ui.screen,
		onMenu: (direction) => ui.navigate(direction),
		onPause: togglePause,
		onAny: () => {
			if (game.phase === "attract") {
				title();
				return true;
			}
			return false;
		},
	});
	addEventListener("resize", () => view.resize());
	document.addEventListener("visibilitychange", () => {
		if (
			document.hidden &&
			!net.hub &&
			net.authority &&
			!net.peers.size &&
			game.phase === "playing" &&
			!ui.screen
		)
			togglePause();
	});
	const inHub = await net.connectHub();
	if (inHub) {
		game.reset(net.seats);
		game.phase = "waiting";
		ui.open(null);
		$("hub-wait").classList.remove("hidden");
		net.ready();
	} else title();
	$("loading").classList.add("hidden");
	let last = performance.now();
	function frame(now) {
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		controls.poll(dt);
		if (ui.screen === "title") {
			titleTime += dt;
			game.time += dt;
			game.progress = 140 + Math.sin(titleTime * 0.08) * 25;
			const p = game.players[0];
			if (p) {
				p.x = riverAt(game.progress).center + 8 + Math.sin(titleTime * 0.4) * 2;
				p.y = -4;
				p.vx = Math.cos(titleTime * 0.4) * 3;
				p.invuln = 0;
			}
			if (
				performance.now() - controls.lastAny >= 10000 &&
				!waitingForWing &&
				!net.peers.size
			) {
				view.clear();
				game.reset([{ id: 0, name: "DEMO PILOT" }], true);
				game.fuel = 55;
				ui.open(null);
				ui.banner(0);
			}
		} else if (
			game.phase === "title" &&
			["wing", "manual", "settings", "about"].includes(ui.screen) &&
			performance.now() - controls.lastAny >= 10000 &&
			!waitingForWing &&
			!net.peers.size
		) {
			view.clear();
			game.reset([{ id: 0, name: "DEMO PILOT" }], true);
			game.fuel = 55;
			ui.open(null);
			ui.banner(0);
		} else if (game.phase === "playing" || game.phase === "attract") {
			let canPlay = !paused && !remotePaused && !net.ended;
			if (net.hub && (!net.started || window.AIHub.time() < 0)) {
				canPlay = false;
				$("hub-wait").classList.remove("hidden");
				$("wait-heading").textContent = net.started
					? String(Math.max(1, Math.ceil(-window.AIHub.time() / 1000)))
					: "RADIO CHECK";
			} else if (didReceive && !remotePaused)
				$("hub-wait").classList.add("hidden");
			for (const id of localSeats) {
				const input = ui.screen
					? { x: 0, y: 0, fire: false, roll: false, burst: false, aim: 0 }
					: controls.get(id, game, settings.assist);
				if (settings.autoFire && !ui.screen) input.fire = true;
				game.inputs.set(id, input);
			}
			if (canPlay && net.authority) {
				accumulator += dt;
				while (accumulator >= 1 / 60) {
					game.step(1 / 60);
					accumulator -= 1 / 60;
				}
			}
			const localInput = game.inputs.get(net.localId) || {
				x: 0,
				y: 0,
				fire: false,
			};
			net.update(now / 1000, game, localInput);
		}
		if (pendingEnd) {
			const e = pendingEnd;
			pendingEnd = null;
			showDebrief(e);
		}
		if (attractReset) {
			attractReset = false;
			view.clear();
			game.reset([{ id: 0, name: "DEMO PILOT" }], true);
			game.fuel = 55;
		}
		audio.update(
			["playing", "attract", "title"].includes(game.phase) &&
				!paused &&
				!net.ended,
			game.bossStarted ? 1 : 0,
		);
		ui.update(now, net.localId);
		if (game.players.length) view.update(game, dt, ui.screen === "title");
		view.render();
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
	window.__stream = {
		ready: true,
		game,
		net,
		ui,
		audio,
		controls,
		view,
		renderer,
		feedback,
		state: () => ({
			...game.inspect(),
			screen: ui.screen,
			paused,
			backend: renderer.backend.isWebGPUBackend ? "webgpu" : "webgl2",
			inputType: controls.last,
			musicVolume: audio.musicVolume,
			net: {
				hub: net.hub,
				authority: net.authority,
				sent: net.sent,
				received: net.received,
				seats: net.seats,
			},
		}),
		action,
		start: (count) => {
			net.disconnect();
			net.seats = Array.from({ length: count || 1 }, (_, id) => ({
				id,
				name: `PILOT 0${id + 1}`,
			}));
			localSeats = net.seats.map((p) => p.id);
			net.launch();
		},
		step: (n = 1) => {
			fastTesting = true;
			for (let i = 0; i < n; i++) game.step(1 / 60);
			fastTesting = false;
		},
		playthrough: () => {
			const oldMusic = audio.muted;
			fastTesting = true;
			audio.silence(true);
			view.clear();
			game.reset([{ id: 0, name: "TEST PILOT" }]);
			game.autopilot = true;
			game.god = true;
			game.fuel = 55;
			let frames = 0;
			while (game.phase === "playing" && frames < 30000) {
				game.step(1 / 60);
				frames++;
			}
			fastTesting = false;
			audio.silence(oldMusic);
			return { ...game.inspect(), frames };
		},
		title,
		pause: () => togglePause(),
		version: "1.0.0",
	};
}
boot().catch((error) => {
	console.error(error);
	$("loading-status").textContent =
		"Flight preparation failed: " +
		error.message +
		". Check your connection and reload.";
	document.querySelector(".load-track").classList.add("hidden");
	window.__streamError = String(error.stack || error);
	if (window.AIHub?.active)
		window.AIHub.fail(`Stream Scheme could not initialize: ${error.message}`);
});
