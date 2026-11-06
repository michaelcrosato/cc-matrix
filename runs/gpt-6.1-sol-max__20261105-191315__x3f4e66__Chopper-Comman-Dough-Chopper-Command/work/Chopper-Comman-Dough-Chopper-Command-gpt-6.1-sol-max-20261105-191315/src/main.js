import report from "../report.json";
import { AudioEngine } from "./audio.js";
import { DEFAULTS, Game } from "./game.js";
import { Input } from "./input.js";
import { Network } from "./network.js";
import { UI } from "./ui.js";
import { View } from "./view.js";

const $ = (id) => document.getElementById(id),
	testMode = new URLSearchParams(location.search).has("test");
let saved = {};
try {
	saved = JSON.parse(localStorage.getItem("comman-dough-settings") || "{}");
} catch {}
const settings = {
	music: 10,
	sfx: 70,
	glyphs: "ps",
	shake: true,
	autofire: false,
	...saved,
};
const app = {
	screen: "title",
	started: false,
	attract: false,
	ended: false,
	frozen: false,
	ready: false,
	local: false,
	parents: {},
	attractReturn: 0,
};
const audio = new AudioEngine();
audio.volumes(settings.music / 100, settings.sfx / 100);
let view,
	input,
	ui,
	game,
	net,
	lastTime = 0,
	accumulator = 0,
	hudTime = 0;
function persist() {
	try {
		localStorage.setItem("comman-dough-settings", JSON.stringify(settings));
	} catch {}
	window.__reduceMotion =
		!settings.shake || matchMedia("(prefers-reduced-motion: reduce)").matches;
}
persist();
function menuOpen() {
	return !!app.screen;
}
function actuallyPlaying() {
	return app.started && !menuOpen() && !app.attract && !app.ended;
}
function networked() {
	return net && net.role !== "solo";
}
function unlock() {
	audio
		.unlock()
		.then(() => audio.resume())
		.catch(() => {});
}
function showTitle() {
	if (net?.hub) return;
	app.runId = (app.runId || 0) + 1;
	net?.close();
	app.started = false;
	app.attract = false;
	app.local = false;
	app.ended = false;
	game.phase = "idle";
	game.autoplay = false;
	view?.clear();
	view.setMode("title");
	ui.hideBanner();
	$("hud").hidden = true;
	$("attract-banner").hidden = true;
	document.body.classList.remove("attract");
	input.clear();
	input.lastActivity = performance.now();
	audio.setPlaying(false);
	ui.show("title");
}
function start(seats = [0], attract = false) {
	app.runId = (app.runId || 0) + 1;
	app.started = true;
	app.attract = attract;
	app.ended = false;
	app.attractReturn = 0;
	game.reset(seats, attract);
	game.cameraSeat = net.me ?? seats[0] ?? 0;
	view?.clear();
	ui.show("");
	ui.hideBanner();
	clearTimeout(ui.toastTimer);
	$("toast").hidden = true;
	$("floaters").replaceChildren();
	$("hud").hidden = !!net.info?.server;
	$("attract-banner").hidden = !attract;
	document.body.classList.toggle("attract", attract);
	input.clear();
	audio.setPlaying(true);
	accumulator = 0;
	if (net.role === "host") net.send({ ...game.snapshot(), fx: [] });
	else if (net.role === "client")
		net.send({ type: "input", i: {} }, net.info?.host);
}
function open(name) {
	app.parents[name] = ui.current || "pause";
	ui.show(name);
	input.clear();
	audio.sound("ui");
}
function back() {
	if (app.ended) return;
	if (ui.current === "pause") action("resume");
	else if (ui.current && ui.current !== "title")
		ui.show(app.parents[ui.current] || "title");
}
function pause() {
	if (!app.started || app.attract || app.ended) return;
	if (ui.current === "pause") action("resume");
	else if (!ui.current) {
		ui.show("pause");
		input.clear();
		audio.setPlaying(networked());
	}
}
function setting(id, value) {
	settings[id] = value;
	audio.volumes(settings.music / 100, settings.sfx / 100);
	persist();
	ui.updatePrompts();
}
function balance(id, value) {
	if (!net.authority) return;
	game.config[id] = value;
	if (id === "truckArmor")
		for (const t of game.liveTrucks()) {
			t.maxHp = value;
			t.hp = Math.min(t.hp, value);
		}
}
async function action(name) {
	if (app.ended) return;
	if (
		net.hub &&
		[
			"quit",
			"restart",
			"start",
			"localstart",
			"networkstart",
			"disconnect",
		].includes(name)
	)
		return;
	audio.sound("ui");
	if (name === "start") {
		app.local = false;
		net.close();
		start([0]);
	} else if (name === "pause") pause();
	else if (name === "resume") {
		ui.show("");
		input.clear();
		audio.setPlaying(true);
	} else if (name === "back") back();
	else if (
		["manual", "settings", "credits", "coop", "local", "radio", "rtc"].includes(
			name,
		)
	) {
		if (name === "radio" || name === "rtc") ui.status = "";
		open(name);
	} else if (name === "quit") showTitle();
	else if (name === "localstart") {
		net.close();
		app.local = true;
		start([0, 1]);
	} else if (name === "glyphs") {
		setting("glyphs", settings.glyphs === "xbox" ? "ps" : "xbox");
		ui.show("settings");
	} else if (name === "autofire") {
		setting("autofire", !settings.autofire);
		ui.show("settings");
	} else if (name === "shake") {
		setting("shake", !settings.shake);
		ui.show("settings");
	} else if (name === "fullscreen") {
		try {
			document.fullscreenElement
				? await document.exitFullscreen()
				: await document.documentElement.requestFullscreen();
		} catch (e) {
			ui.toast("Fullscreen is unavailable in this browser.");
		}
		ui.show("settings");
	} else if (name === "dev") open("dev");
	else if (name === "god" && net.authority) {
		game.god = !game.god;
		ui.show("dev");
	} else if (name === "heal" && net.authority) {
		for (const p of game.pilots)
			if (!p.dead) {
				p.hp = 100;
				p.lives = Math.max(3, p.lives);
				p.flare = 0;
			}
		for (const t of game.liveTrucks()) t.hp = t.maxHp;
		ui.toast("Hull and cargo restored.");
	} else if (name === "skip" && net.authority) {
		for (const e of game.enemies()) game.hit(e, 10000);
		game.spawnQueue = [];
		ui.toast("Airspace cleared. Resume to advance.");
	} else if (name === "supply" && net.authority) {
		const p = game.getPilot(net.me ?? 0);
		if (p) {
			game.create("power", p.x + 4, p.y, { ttl: 25 });
			game.create("repair", p.x - 4, p.y, { ttl: 25 });
		}
		ui.toast("Supply crates deployed.");
	} else if (name === "resetbalance" && net.authority) {
		game.config = { ...DEFAULTS };
		for (const t of game.liveTrucks()) {
			t.maxHp = game.config.truckArmor;
			t.hp = Math.min(t.hp, t.maxHp);
		}
		ui.show("dev");
	} else if (name === "restart" && net.authority) {
		if (net.role === "host") net.launch();
		else start(app.local ? [0, 1] : [0]);
	} else if (name === "roomhost") {
		ui.roomCode = await net.hostRoom();
		ui.status = "Flight leader ready. Waiting for wingmen.";
		ui.show("room");
	} else if (name === "roomjoin") {
		const code = $("room-code").value.trim().toUpperCase();
		if (!/^[A-Z2-9]{4}$/.test(code)) {
			ui.toast("Enter a four-letter radio channel.");
			return;
		}
		ui.roomCode = code;
		await net.joinRoom(code);
		ui.status = "Calling the flight leader…";
		ui.show("room");
	} else if (name === "copyroom") {
		await copy(ui.roomCode);
	} else if (name === "disconnect") {
		net.close();
		ui.show("coop");
	} else if (name === "networkstart") {
		if (!net.authority) {
			ui.toast("The flight leader launches the convoy.");
			return;
		}
		if (net.role !== "host" || (net.pc && net.dc?.readyState !== "open")) {
			ui.toast("Connect a wingman first.");
			return;
		}
		net.launch();
	} else if (name === "rtcoffer") {
		ui.networkStatus("Tuning the radio. Gathering connection candidates…");
		try {
			ui.generatedCode = await net.offer();
			$("rtc-code").value = ui.generatedCode;
			ui.networkStatus(
				"Offer ready. Copy it to your wingman, then paste their reply.",
			);
		} catch (e) {
			ui.networkStatus(e.message);
		}
	} else if (name === "rtcanswer") {
		const code = $("rtc-code").value.trim();
		ui.networkStatus("Making the reply code…");
		try {
			ui.generatedCode = await net.answer(code);
			$("rtc-code").value = ui.generatedCode;
			ui.networkStatus("Reply ready. Copy it back to the flight leader.");
		} catch (e) {
			ui.networkStatus(e.message);
		}
	} else if (name === "rtcaccept") {
		try {
			await net.accept($("rtc-code").value.trim());
			ui.networkStatus("Reply accepted. Establishing the radio link…");
		} catch (e) {
			ui.networkStatus(e.message);
		}
	} else if (name === "copycode") {
		const code = ui.generatedCode || $("rtc-code").value;
		if (!code) {
			ui.toast("Create an offer or reply first.");
			return;
		}
		await copy(code);
	} else if (name === "pasteoffer" || name === "pasteanswer") {
		try {
			$("rtc-code").value = await navigator.clipboard.readText();
			ui.networkStatus(
				name === "pasteoffer"
					? "Offer pasted. Choose MAKE REPLY."
					: "Reply pasted. Choose ACCEPT REPLY.",
			);
		} catch {
			ui.toast("Paste the radio code in the text box.");
			$("rtc-code").focus();
		}
	} else if (name === "reload") location.reload();
}
async function copy(text) {
	try {
		await navigator.clipboard.writeText(text);
		ui.toast("Copied to clipboard.");
	} catch {
		const field = $("rtc-code") || $("room-code");
		if (field) {
			field.value = text;
			field.focus();
			field.select();
		}
		ui.toast("Select and copy the code in the box.");
	}
}
function event(name, data) {
	net?.event(name, data);
	if (net?.info?.server) {
		if (name === "finish") net.finish(game.inspect(), data.won);
		return;
	}
	if (name === "explosion") {
		view?.explosion(data.x, data.y, data.big);
		audio.sound("explosion");
	} else if (name === "shot") {
		if (!app.attract) {
			audio.sound("shot");
			input?.rumble(0.1, 0, 35);
		}
	} else if (name === "hit") {
		audio.sound("hit");
		if (Math.random() < 0.4)
			view.particle(data.x, data.y, 0xfff1cb, Math.random() * 5, 5, 0.18, 0.2);
	} else if (name === "hurt") {
		input?.rumble(0.5, 0.7, 160);
		view.shake = 0.9;
		audio.sound("hurt");
	} else if (name === "flare") {
		input?.rumble(0.3, 0.4, 150);
		view.flare(data.x, data.y);
		audio.sound("flare");
	} else if (name === "pickup") {
		view.flare(data.x, data.y);
		audio.sound("pickup");
		ui.toast(
			data.kind === "power"
				? "OVERDRIVE! Nine seconds of double cannon."
				: "FIELD REPAIR · Hull and cargo patched.",
		);
	} else if (name === "repair") {
		audio.sound("repair");
		view.particle(data.x, data.y, 0x8fe5ce, 0, 4, 0.7, 0.35);
	} else if (name === "points") {
		if (!app.frozen) ui.worldPoint(data.x, data.y, data.text, view);
	} else if (name === "dispatch") {
		ui.banner(data.wave, data.name, data.subtitle);
		ui.radio(data.brief);
		if (!app.attract) audio.voice(data.wave);
	} else if (name === "waveclear") {
		ui.banner(
			"AIRSPACE CLEAR",
			`+${data.bonus} CARGO BONUS`,
			`${data.saved} trucks still rolling. Next dispatch inbound.`,
		);
		ui.radio("Good shooting! Catch your breath and patch the convoy.");
		audio.voice(data.wave);
	} else if (name === "message") {
		ui.radio(data.text);
	} else if (name === "finish") {
		const finishedRun = app.runId;
		if (data.won) audio.sound("victory");
		audio.setPlaying(false);
		net?.finish(game.inspect(), data.won);
		if (app.attract) {
			app.attractReturn = performance.now() + 3500;
		} else
			setTimeout(() => {
				if (!app.ended && app.started && app.runId === finishedRun)
					ui.show("result");
			}, 850);
	}
}
async function boot() {
	try {
		const hubConnection = window.AIHub?.active
			? AIHub.connect({ mode: "shared-world", seats: [1, 4] })
			: null;
		const hubInfo = hubConnection ? await hubConnection : null;
		await document.fonts.ready;
		$("load-text").textContent = "Starting WebGPU and the physics flight deck…";
		game = new Game(event);
		view = hubInfo?.server ? null : new View($("game"));
		const results = await Promise.allSettled([
			view ? view.init() : Promise.resolve(),
			Game.init(),
		]);
		for (const result of results)
			if (result.status === "rejected") throw result.reason;
		ui = new UI({
			action,
			unlock,
			settings,
			screen: (name) => (app.screen = name),
			inputType: () => input?.last || "keyboard",
			flare: (v) => (input.flareTouch = v),
			inHub: () => net.hub,
			networked,
			isClient: () => !net.authority,
			config: () => game.config,
			god: () => game.god,
			state: () => game.inspect(),
			setting,
			balance,
		});
		input = new Input({
			playing: actuallyPlaying,
			type: () => ui.updatePrompts(),
			unlock,
			activity: () => {
				if (app.attract) showTitle();
			},
			pause,
			back,
			key: (code) => {
				if (app.ended) return;
				if (code === "Escape" || code === "KeyP") {
					if (menuOpen() && ui.current !== "title") back();
					else pause();
					return;
				}
				if (menuOpen()) {
					if (["Enter", "Space"].includes(code)) ui.confirm();
					else if (["ArrowDown", "KeyS", "Tab"].includes(code))
						ui.navigate(0, 1);
					else if (["ArrowUp", "KeyW"].includes(code)) ui.navigate(0, -1);
					else if (["ArrowLeft", "KeyA"].includes(code)) ui.navigate(-1, 0);
					else if (["ArrowRight", "KeyD"].includes(code)) ui.navigate(1, 0);
				}
			},
			confirm: () => ui.confirm(),
			navigate: (x, y) => ui.navigate(x, y),
			scroll: (n) => ui.scroll(n),
			blur: () => {
				if (actuallyPlaying() && !networked()) pause();
			},
			touchStick: (p) => ui.touchStick(p),
		});
		net = new Network({
			prepare: (seats) => {
				game.reset(seats, false);
				game.phase = "idle";
				return { ...game.snapshot(), fx: [] };
			},
			start: (seats) => start(seats),
			world: (s) => {
				const oldPhase = game.phase;
				game.applySnapshot(s);
				for (const [name, data] of s.fx || []) eventRemote(name, data);
				if (
					["won", "lost"].includes(s.phase) &&
					!["won", "lost"].includes(oldPhase) &&
					!s.fx?.some((e) => e[0] === "finish")
				)
					eventRemote("finish", { won: s.phase === "won" });
			},
			event: eventRemote,
			state: () => game.inspect(),
			leave: (seat) => {
				if (net.authority) game.removePilot(seat);
				ui.toast("A wingman left the radio. Keep the convoy moving.");
			},
			end: () => {
				app.ended = true;
				game.phase = "ended";
				input.clear();
				audio.stop();
				ui.hideBanner();
				ui.show("");
				$("hud").hidden = true;
			},
			status: (t) => ui.networkStatus(t),
			disconnect: () => {
				if (!net.hub) {
					showTitle();
					ui.toast("Flight leader left the radio. You are back at the hangar.");
				}
			},
			linked: () => {
				if (ui.current === "rtc") ui.show("rtc");
			},
		});
		$("load-text").textContent = "Flight deck ready. Checking the radio…";
		const hub = await net.connectHub(hubInfo || hubConnection);
		$("loading").hidden = true;
		app.ready = true;
		if (hub) {
			ui.show("hubwait");
			audio.setPlaying(false);
		} else showTitle();
		window.__CCD = {
			inspect: () => ({
				...game.inspect(),
				screen: app.screen,
				started: app.started,
				attract: app.attract,
				backend: view?.backend || "headless authority",
				net: {
					role: net.role,
					me: net.me,
					seats: net.seats,
					sent: net.sent,
					received: net.received,
					ended: net.ended,
				},
				settings: { ...settings },
				animationMixers: view?.entities.size || 0,
			}),
			report,
			audio,
			version: "1.0.0",
		};
		if (testMode)
			Object.assign(window.__CCD, {
				game,
				view,
				input,
				ui,
				net,
				app,
				action,
				start,
				setting,
				balance,
				freeze: (v) => (app.frozen = v),
				advance: (seconds, ai = false, commands = {}) => {
					const previous = game.autoplay;
					game.autoplay = ai;
					const n = Math.round(seconds * 60);
					for (let i = 0; i < n && !["won", "lost"].includes(game.phase); i++)
						game.step(1 / 60, commands);
					game.autoplay = previous;
					view.sync(game, 1 / 60);
					ui.hud(game, view, net.me ?? 0);
					return game.inspect();
				},
			});
		requestAnimationFrame(frame);
	} catch (error) {
		console.error("Flight deck initialization failed:", error);
		$("loading").innerHTML =
			`<div class="loading-mark">!</div><h2>ROTORS GROUNDED</h2><p id="error-detail"></p><button class="primary" onclick="location.reload()">TRY AGAIN</button>`;
		$("error-detail").textContent = error.message;
		window.__bootError = error.message;
		window.AIHub?.active && AIHub.fail(error.message);
	}
}
function eventRemote(name, data) {
	const role = net.role;
	net.role = "client";
	event(name, data);
	net.role = role;
}
function frame(now) {
	const dt = Math.min(0.05, (now - lastTime) / 1000 || 1 / 60);
	lastTime = now;
	if (!app.ended && !net.info?.server) input.poll(dt);
	if (!app.frozen) {
		if (!net.hub && app.screen === "title" && now - input.lastActivity >= 10000)
			start([0], true);
		if (app.attractReturn && now > app.attractReturn) start([0], true);
		let command = {};
		const localPilot = game.getPilot(net.me ?? 0);
		if (!menuOpen() && !app.attract && !app.ended && net.me !== null) {
			command = input.command(0, view, localPilot);
			if (settings.autofire) command.fire = true;
			if (!net.authority && command.fire) audio.sound("shot");
			if (input.last === "touch" && localPilot) {
				const target = game
					.enemies()
					.sort(
						(a, b) =>
							Math.hypot(a.x - localPilot.x, a.y - localPilot.y) -
							Math.hypot(b.x - localPilot.x, b.y - localPilot.y),
					)[0];
				if (target)
					command.angle = Math.atan2(
						target.y - localPilot.y,
						target.x - localPilot.x,
					);
			}
		}
		if (!app.ended) net.tick(dt, command, game);
		if (app.local)
			net.inputs[1] = menuOpen()
				? {}
				: input.command(1, view, game.getPilot(1));
		const simulate =
			app.started &&
			net.authority &&
			(!menuOpen() || networked()) &&
			!app.ended;
		if (simulate) {
			accumulator += dt;
			while (accumulator >= 1 / 60) {
				game.step(1 / 60, net.inputs);
				accumulator -= 1 / 60;
			}
		} else accumulator = 0;
		if (app.started && !net.info?.server) {
			view.sync(game, dt);
			hudTime += dt;
			if (hudTime > 0.075) {
				hudTime = 0;
				ui.hud(game, view, net.me ?? 0);
			}
		}
		if (!app.started) view?.setMode("title");
		view?.update(dt);
		if (!net.info?.server && (!net.hub || app.started)) view?.render();
	}
	if (!app.ended) audio.update();
	if (app.screen === "title" && $("attract-count"))
		$("attract-count").textContent =
			`AUTO FLIGHT IN ${Math.max(0, Math.ceil((10000 - (now - input.lastActivity)) / 1000))}s`;
	requestAnimationFrame(frame);
}
boot();
