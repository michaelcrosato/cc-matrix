import { Art } from "./art.js";
import { Sound } from "./audio.js";
import { CASES, DEFAULTS, Shift } from "./core.js";
import { Input } from "./input.js";
import { Network } from "./net.js";
import { UI } from "./ui.js";

const app = {
	mode: "loading",
	paused: false,
	manual: false,
	autoplay: false,
	couch: false,
	idleAt: performance.now(),
	ignoreUntil: 0,
	lastState: "",
	seenEvent: 0,
	resultTime: 0,
	frame: 0,
	accum: 0,
	remoteInputs: new Map(),
	pending: [{}, {}],
	lastSnapshot: null,
	lastNetSeq: -1,
	ready: false,
};
const settings = {
	music: 0.1,
	effects: 0.65,
	mute: false,
	glyphs: "playstation",
	assist: true,
	motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
};
let best = 0;
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("lll-settings-v1") || "{}"),
	);
	best = Number(localStorage.getItem("lll-best-v1")) || 0;
} catch {}
const sound = new Sound();
sound.musicVolume = settings.music;
sound.effectsVolume = settings.effects;
sound.muted = settings.mute;
let art, input, net, ui;
const sim = new Shift(event);
const persist = () => {
	try {
		localStorage.setItem("lll-settings-v1", JSON.stringify(settings));
		localStorage.setItem("lll-best-v1", String(best));
	} catch {}
};
const state = () => ({
	settings,
	tune: sim.tune,
	sim,
	snapshot: currentSnapshot(),
	net,
	best,
	paused: app.paused,
});
const currentSnapshot = () =>
	net?.role === "client" && app.mode === "game"
		? app.lastSnapshot || sim.snapshot()
		: sim.snapshot();

function activity(kind) {
	app.idleAt = performance.now();
	if (app.mode === "ended") return;
	if (app.mode === "attract") {
		returnTitle();
		app.ignoreUntil = performance.now() + 300;
	}
	if (ui && (ui.kind !== kind || ui.glyphStyle !== settings.glyphs))
		ui.refreshPrompts(kind, settings.glyphs);
	sound
		.unlock()
		.then(() =>
			sound.setVolume(settings.music, settings.effects, settings.mute),
		)
		.catch(() => {});
}
function event(e) {
	art?.event(e);
	if (
		!ui ||
		app.mode === "loading" ||
		app.mode === "title" ||
		app.mode === "ended"
	)
		return;
	if (!net?.server)
		sound.effect(
			e.type === "hazard" ? (e.kind === "plane" ? "plane" : "") : e.type,
		);
	if (app.mode === "attract") return;
	if (e.type === "case") {
		ui.introCase = -1;
		app.resultTime = 0;
	}
	if (e.type === "hit") {
		ui.toast(
			e.kind === "plane"
				? "MIND YOUR HAT! DUCK THE PLANES."
				: `OUCH! −${sim.tune.hitPenalty} SECONDS`,
			1.8,
		);
		const pad = navigator.getGamepads?.()[0];
		pad?.vibrationActuator
			?.playEffect("dual-rumble", {
				duration: 140,
				strongMagnitude: 0.35,
				weakMagnitude: 0.25,
			})
			.catch(() => {});
	}
	if (e.type === "pickup") ui.toast("+150 · LOST PROPERTY, FOUND!", 1.0);
	if (e.type === "stunned")
		ui.speech("“All right, all right! Keep your hat on!”");
	if (e.type === "rummage") ui.speech("“Just one more little bargain…”");
	if (e.type === "retry" || e.type === "badge") ui.toast(e.message, 2.5);
	if (e.type === "caught") {
		app.resultTime = 0;
		ui.toast("BAGGED THE BANDIT!", 2);
	}
}

function setupPlayers(roster, seed) {
	sim.start(roster.length, false, seed);
	roster.forEach((r, i) => {
		sim.players[i].id = r.id;
	});
	sim.count = roster.length;
}
function startShift(couch = false) {
	if (net.hubActive) return;
	net.close();
	app.couch = couch;
	app.mode = "game";
	app.paused = false;
	app.manual = false;
	app.autoplay = false;
	app.lastState = "";
	app.seenEvent = 0;
	app.accum = 0;
	app.resultTime = 0;
	net.roster = Array.from({ length: couch ? 2 : 1 }, (_, id) => ({
		id,
		name: id ? "Officer Moxie" : "Officer Pip",
		color: id ? "#80b8aa" : "#4586a3",
	}));
	sim.start(couch ? 2 : 1, false, 1983);
	ui.show("none");
	input.clear();
	if (input.kind === "touch") {
		document.querySelector("#touch-hint").hidden = false;
		app.touchHintUntil = performance.now() + 6500;
	}
}
function returnTitle() {
	if (net?.hubActive) return;
	net?.close();
	app.mode = "title";
	app.paused = false;
	app.manual = false;
	app.couch = false;
	app.autoplay = false;
	app.idleAt = performance.now();
	app.firstDraw = false;
	app.lastState = "";
	app.lastSnapshot = null;
	app.lastNetSeq = -1;
	sim.start(1, true, 1983);
	ui.show("title");
	input?.clear();
	document.querySelector("#attract-label").hidden = true;
	document.querySelector("#touch-hint").hidden = true;
}
function attract() {
	app.mode = "attract";
	app.lastState = "";
	app.paused = false;
	sim.start(1, true, 1983);
	ui.show("none");
	input.clear();
}
function pause() {
	if (!app.ready || app.mode === "ended") return;
	if (app.mode === "attract") {
		returnTitle();
		return;
	}
	if (ui.screen === "title") return;
	if (ui.screen !== "none" && ui.screen !== "pause") {
		action("back");
		return;
	}
	if (app.mode === "game") {
		if (ui.screen === "pause") action("resume");
		else if (currentSnapshot().state === "playing") {
			app.paused = true;
			input.clear();
			ui.show("pause");
		}
	}
}
function open(screen) {
	const back = ui.screen === "none" ? "pause" : ui.screen;
	if (app.mode === "game") app.paused = true;
	ui.show(screen, { returnTo: back });
}
function action(name, payload) {
	if (name === "screen") {
		if (input) input.menu = payload !== "none";
		return;
	}
	if (!app.ready || app.mode === "ended" || performance.now() < app.ignoreUntil)
		return;
	if (
		![
			"setting",
			"tune",
			"context-lift",
			"context-exit",
			"context-whistle",
		].includes(name)
	)
		sound.effect("menu");
	if (name === "start") startShift(false);
	else if (name === "couch") startShift(true);
	else if (name === "title") returnTitle();
	else if (name === "pause") pause();
	else if (name === "resume") {
		app.paused = false;
		input.clear();
		ui.show("none");
	} else if (["settings", "guide", "about", "partners", "dev"].includes(name))
		open(name);
	else if (name === "back") {
		if (ui.screen === "pause") action("resume");
		else if (["room", "join"].includes(ui.screen)) {
			net.close();
			app.mode = "title";
			ui.show("partners", { returnTo: "title" });
		} else if (["caught", "gameover", "victory"].includes(ui.screen)) return;
		else {
			const target = ui.screen === "dev" ? "pause" : ui.returnTo || "title";
			ui.show(target);
		}
	} else if (name === "host") {
		app.mode = "lobby";
		ui.roomStatus = "";
		net.host().then(() => ui.show("room", { returnTo: "partners" }));
	} else if (name === "join-screen") {
		ui.roomStatus = "";
		ui.show("join", { returnTo: "partners" });
	} else if (name === "join") {
		net.join(payload);
	} else if (name === "begin-room") net.begin();
	else if (name === "leave-room") {
		net.close();
		app.mode = "title";
		ui.show("partners", { returnTo: "title" });
	} else if (name === "next-case") {
		if (net.isHost) {
			sim.nextCase();
			app.lastState = "";
			app.paused = false;
			ui.show("none");
		}
	} else if (name === "retry") {
		if (net.isHost) {
			sim.retry();
			app.lastState = "";
			app.paused = false;
			ui.show("none");
		}
	} else if (name === "play-again") {
		if (net.active) net.begin();
		else startShift(app.couch);
	} else if (name === "fullscreen") {
		if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
		else document.documentElement.requestFullscreen?.().catch(() => {});
	} else if (name === "setting") {
		settings[payload.key] = payload.value / 100;
		sound.setVolume(settings.music, settings.effects, settings.mute);
		persist();
	} else if (name.startsWith("setting-toggle-")) {
		const key = name.slice("setting-toggle-".length),
			focusAction = name;
		if (key === "glyphs")
			settings.glyphs = settings.glyphs === "xbox" ? "playstation" : "xbox";
		else settings[key] = !settings[key];
		sound.setVolume(settings.music, settings.effects, settings.mute);
		persist();
		ui.show("settings");
		ui.focus(ui.root.querySelector(`[data-action="${focusAction}"]`));
	} else if (name === "tune") {
		if (net.isHost) sim.tune[payload.key] = payload.value;
	} else if (name.startsWith("tune-toggle-")) {
		if (net.isHost) {
			const key = name.slice("tune-toggle-".length);
			sim.tune[key] = !sim.tune[key];
			ui.show("dev");
			ui.focus(ui.root.querySelector(`[data-action="${name}"]`));
		}
	} else if (name === "dev-reset") {
		Object.assign(sim.tune, DEFAULTS);
		ui.show("dev");
	} else if (name.startsWith("floor-")) {
		if (net.isHost) {
			sim.teleport(net.localId, Number(name.slice(6)));
			ui.toast("QUICK TRAVEL COMPLETE");
		}
	} else if (name === "dev-catch") {
		if (net.isHost) {
			sim.catchCrook(net.localId);
			app.paused = false;
			app.lastState = "";
			syncState();
		}
	} else if (name === "dev-restart") {
		if (net.isHost) {
			sim.retry();
			app.lastState = "";
			ui.show("dev");
		}
	} else if (name === "dev-refill") {
		if (net.isHost) {
			sim.badges = 3;
			sim.clock = CASES[sim.caseIndex].time;
			ui.toast("FRESH BADGES, FRESH CLOCK");
		}
	} else if (name.startsWith("dev-spawn-")) {
		if (net.isHost) {
			const p = sim.players.find((p) => p.id === net.localId) || sim.players[0];
			sim.spawnHazard(name.slice(10), p.floor, p.x + p.dir * 9, -p.dir);
			ui.toast("MERCHANDISE ON THE MOVE");
		}
	} else if (name === "context-lift") input.touchUp = true;
	else if (name === "context-exit") input.touchExit = true;
	else if (name === "context-whistle") input.touchWhistle = true;
}
function onRoster(roster) {
	ui?.updateRoom(null, roster);
	if (net?.isHost && app.mode === "game" && sim.world) {
		for (const r of roster)
			if (!sim.players.some((p) => p.id === r.id)) sim.addPlayer(r.id);
		for (const p of [...sim.players])
			if (!roster.some((r) => r.id === p.id)) {
				sim.world.removeRigidBody(p.body);
				sim.players.splice(sim.players.indexOf(p), 1);
			}
		sim.count = roster.length;
	}
}
function onNetworkStart(info) {
	app.mode = "game";
	app.paused = false;
	app.lastState = "";
	app.seenEvent = 0;
	app.lastSnapshot = null;
	app.lastNetSeq = -1;
	app.resultTime = 0;
	app.accum = 0;
	app.couch = false;
	app.remoteInputs.clear();
	if (net.isHost) setupPlayers(info.roster, info.seed);
	ui.show("none");
	input.clear();
}
function onNetworkEnd(reason) {
	if (net.hubActive) {
		app.mode = "ended";
		app.paused = true;
		ui.endReason = reason;
		ui.show("ended");
		input.clear();
		sound.silence();
	} else {
		net.close(false);
		returnTitle();
		ui.show("partners", { returnTo: "title" });
		ui.toast("THE HOST CLOSED THE ROOM");
	}
}
function touchAssist(p, i) {
	if (!i.touch || !settings.assist || p.ride) return i;
	for (const h of sim.hazards) {
		const dir = Math.abs(i.axis) > 0.15 ? Math.sign(i.axis) : p.dir;
		const distance = (h.x - p.x) * dir;
		if (h.floor !== p.floor || h.stunned || distance < -0.5 || distance > 3.5)
			continue;
		if (h.kind === "plane" || (h.kind === "ball" && h.y > p.floor * 6 + 1.25)) {
			i.duck = true;
			i.down = true;
		} else if (distance < 2.9 && p.grounded && Math.abs(i.axis) > 0.15)
			i.jump = true;
	}
	return i;
}
function stepSim(inputs, dt) {
	for (const p of sim.players) {
		let i;
		if (app.mode === "title" || app.mode === "attract" || app.autoplay)
			i = sim.getAI(p);
		else if (net.active && p.id !== net.localId) {
			const remote = app.remoteInputs.get(p.id);
			i =
				remote && performance.now() - remote.at < 850
					? { ...remote.input }
					: {};
			if (remote) {
				remote.input.jump = false;
				remote.input.whistle = false;
			}
		} else {
			const index = app.couch ? sim.players.indexOf(p) : 0;
			i = { ...inputs[index] };
			if (i) touchAssist(p, i);
		}
		sim.input(p.id, i);
	}
	sim.step(dt);
}
function syncState() {
	if (app.mode !== "game") return;
	const s = currentSnapshot();
	const key = `${s.state}:${s.caseIndex}`;
	if (key === app.lastState) return;
	app.lastState = key;
	app.resultTime = 0;
	if (s.state === "playing") {
		if (["caught", "victory", "gameover"].includes(ui.screen)) ui.show("none");
	} else if (["caught", "victory", "gameover"].includes(s.state)) {
		app.paused = false;
		if (!(net.hubActive && s.state === "caught")) ui.show(s.state);
		if (s.state === "victory") {
			best = Math.max(best, s.score);
			persist();
			if (net.hubActive && net.isHost) net.finish(true, s);
		}
		if (s.state === "gameover" && net.hubActive && net.isHost)
			net.finish(false, s);
	}
}

async function boot() {
	ui = new UI(action, state);
	input = new Input(
		activity,
		(dir) => {
			if (performance.now() >= app.ignoreUntil && app.mode !== "ended") {
				sound.effect("menu");
				ui.navigate(dir);
			}
		},
		pause,
	);
	net = new Network({
		onStart: onNetworkStart,
		onInput: (id, i) => {
			const old = app.remoteInputs.get(id);
			if (old) {
				i.jump ||= old.input.jump;
				i.whistle ||= old.input.whistle;
			}
			app.remoteInputs.set(id, { input: i, at: performance.now() });
		},
		onSnapshot: (s) => {
			if (!s || s.seq <= app.lastNetSeq) return;
			app.lastNetSeq = s.seq;
			app.lastSnapshot = s;
			for (const e of s.events || [])
				if (e.id > app.seenEvent) {
					app.seenEvent = e.id;
					event(e);
				}
		},
		onRoster,
		onStatus: (message) => {
			ui.updateRoom(message, net.roster);
			if (net.role === "client" && net.welcomed && app.mode !== "game") {
				app.mode = "lobby";
				ui.show("room", { returnTo: "partners" });
			}
		},
		onEnd: onNetworkEnd,
	});
	document.querySelector("#load-status").textContent =
		"Winding the lift. Polishing the badges…";
	await Promise.all([Shift.init(), net.connectHub(), document.fonts.ready]);
	sim.start(1, true, 1983);
	if (!net.server) {
		art = new Art(document.querySelector("#world"));
		await art.init();
		art.update(sim.snapshot(), 10, "title");
		if (!net.hubActive) await art.prepare();
	}
	document.querySelector("#loading").hidden = true;
	app.ready = true;
	if (net.hubActive) {
		app.mode = "lobby";
		ui.show("none");
		document.querySelector("#hub-wait").hidden = false;
		net.ready();
		art?.prepare().catch((error) => net.hub.fail(error.message));
	} else returnTitle();
	ui.refreshPrompts(input.kind, settings.glyphs);
	addEventListener("resize", () => art?.resize());
	addEventListener("pagehide", () => {
		if (!net.hubActive) net.close();
	});
	exposeTests();
	let last = performance.now();
	function frame(now) {
		const dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
		last = now;
		app.frame++;
		if (app.mode !== "ended") input.poll();
		let inputs = [input.sample(0), input.sample(1)];
		if (input.touchExit) {
			inputs[0].duck = true;
			inputs[0].down = true;
			input.touchExit = false;
		}
		if (ui.screen !== "none") inputs = [{}, {}];
		for (let i = 0; i < 2; i++) {
			app.pending[i].jump ||= inputs[i].jump;
			app.pending[i].whistle ||= inputs[i].whistle;
		}
		const hubCanPlay =
			!net.hubActive || (net.hubStarted && net.hub.time() >= 0);
		const blocked = app.paused && !net.hubActive;
		if (
			!app.manual &&
			net.isHost &&
			app.mode !== "ended" &&
			["title", "attract", "game"].includes(app.mode) &&
			!blocked &&
			hubCanPlay
		) {
			app.accum = Math.min(0.16, app.accum + dt);
			while (app.accum >= 1 / 60) {
				const tickInputs = inputs.map((i, n) => ({
					...i,
					jump: app.pending[n].jump,
					whistle: app.pending[n].whistle,
				}));
				stepSim(tickInputs, 1 / 60);
				app.pending = [{}, {}];
				app.accum -= 1 / 60;
			}
		}
		const s = currentSnapshot();
		s.seq = app.frame;
		s.paused = blocked;
		if (app.mode === "game" && !net.finished) {
			net.latestScore = s.score;
			net.update(inputs[0], net.isHost ? s : null, dt);
		}
		syncState();
		if (
			net.hubActive &&
			net.isHost &&
			s.state === "caught" &&
			app.mode === "game"
		) {
			app.resultTime += dt;
			if (app.resultTime > 2.2) {
				sim.nextCase();
				app.lastState = "";
			}
		}
		if (app.mode === "title" && ui.screen === "title") {
			const idle = (now - app.idleAt) / 1000;
			const count = document.querySelector("#idle-count");
			if (count) count.textContent = Math.max(0, Math.ceil(10 - idle));
			if (idle >= 10 && !app.manual) attract();
		}
		const waiting =
			net.hubActive &&
			(!net.hubStarted || net.hub.time() < 0) &&
			app.mode !== "ended";
		const wait = document.querySelector("#hub-wait");
		wait.hidden = !waiting;
		if (waiting)
			wait.querySelector("b").textContent = Number.isFinite(net.hub.time())
				? `${Math.max(1, Math.ceil(-net.hub.time() / 1000))}…`
				: "REPORTING FOR DUTY";
		if (app.mode === "game" || app.mode === "attract")
			ui.update(s, net.localId, app.mode === "attract", app.paused);
		else ui.update(null);
		const overview =
			inputs[0].overview ||
			sim.tune.overview ||
			(app.couch && s.players.length > 1);
		art?.update(
			s,
			dt,
			app.mode === "title" || app.mode === "lobby" ? "title" : "play",
			net.localId,
			overview,
			settings.motion,
		);
		if (sim.tune.colliders && net.isHost) art?.debug(sim.world, true);
		else if (art?.debugLines) art.debug(null, false);
		if (!net.server && (!net.hubActive || hubCanPlay)) {
			art?.draw();
			if (art?.prepared && app.mode === "title" && !app.firstDraw) {
				app.firstDraw = true;
				app.idleAt = performance.now();
			}
		}
		if (now > (app.touchHintUntil || 0))
			document.querySelector("#touch-hint").hidden = true;
		sound.update(app.mode);
		input.finishFrame();
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}
function exposeTests() {
	window.__game = {
		get ready() {
			return app.ready;
		},
		get backend() {
			return art?.backend || "headless server";
		},
		get mode() {
			return app.mode;
		},
		get screen() {
			return ui.screen;
		},
		get sim() {
			return sim;
		},
		get net() {
			return net;
		},
		get sound() {
			return sound;
		},
		get input() {
			return input;
		},
		get settings() {
			return settings;
		},
		get app() {
			return app;
		},
		get art() {
			return art;
		},
		get ui() {
			return ui;
		},
		snapshot: () => currentSnapshot(),
		start: (count = 1, attractMode = false) => {
			startShift(count > 1);
			app.manual = true;
			if (count > 2) {
				sim.count = count;
				sim.start(count, attractMode);
			}
			sim.attract = attractMode;
		},
		manual: (value) => {
			app.manual = value;
			app.accum = 0;
		},
		control: (id, i) => sim.input(id, i),
		step: (n = 1, ai = false) => {
			for (let k = 0; k < n; k++) {
				if (ai) for (const p of sim.players) sim.input(p.id, sim.getAI(p));
				sim.step(1 / 60);
			}
			syncState();
			return sim.snapshot();
		},
		command: action,
		auditAudio: Sound.audit,
		draw: () => {
			const s = currentSnapshot();
			art?.update(
				s,
				1,
				app.mode === "title" ? "title" : "play",
				net.localId,
				sim.tune.overview,
				settings.motion,
			);
			art?.draw();
			ui.update(
				app.mode === "title" ? null : s,
				net.localId,
				app.mode === "attract",
				app.paused,
			);
		},
		versions: {
			three: "0.180.0",
			rapier: "0.19.3",
			peerjs: "1.5.5",
			hub: window.AIHub.version,
		},
		defaults: DEFAULTS,
	};
}
boot().catch((error) => {
	console.error(error);
	const loading = document.querySelector("#loading");
	loading.hidden = false;
	loading.querySelector("h1").textContent = "THE SHUTTERS ARE STUCK";
	loading.querySelector("p").textContent =
		"This browser could not open the 3D shop floor. Try a browser with WebGPU or WebGL 2 enabled.";
	document.querySelector("#load-status").textContent = String(
		error.message || error,
	);
	window.AIHub?.active && window.AIHub.fail(String(error.message || error));
});
