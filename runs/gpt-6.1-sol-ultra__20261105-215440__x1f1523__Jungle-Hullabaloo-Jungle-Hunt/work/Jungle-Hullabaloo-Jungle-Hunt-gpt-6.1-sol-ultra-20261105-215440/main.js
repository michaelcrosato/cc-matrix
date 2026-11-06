import * as THREE from "three/webgpu";
import { JungleScene } from "./scene.js";
import { JungleGame, DEFAULTS, CHAPTERS } from "./game.js";
import { JungleAudio } from "./audio.js";
import { JungleOnline } from "./online.js";
const $ = (id) => document.getElementById(id),
	show = (id, yes = true) => $(id)?.classList.toggle("hidden", !yes);
const screens = [
	"title",
	"pause",
	"settings",
	"how",
	"coop",
	"dev",
	"outcome",
	"about",
];
let screen = "loading",
	returnScreen = "title",
	paused = false,
	lastInput = "keyboard",
	lastActivity = performance.now(),
	touch = false,
	count = 1,
	view = null,
	game = null,
	net = null,
	remoteState = null,
	endedShown = false,
	chapterTimer = 0,
	toastTimer = 0,
	noticeTimer = 0,
	rescueTime = 0,
	keys = new Set(),
	pointerJump = false,
	pointerAction = false,
	netInputs = {},
	lastPads = [],
	focusIndex = 0,
	testInput = null,
	navAt = 0,
	navDir = 0;
const audio = new JungleAudio();
let settings = {
	music: 10,
	effects: 72,
	glyph: "ps",
	assist: false,
	motion: false,
};
try {
	settings = {
		...settings,
		...JSON.parse(localStorage.getItem("hullabaloo-settings") || "{}"),
	};
} catch {}
function saveSettings() {
	try {
		localStorage.setItem("hullabaloo-settings", JSON.stringify(settings));
	} catch {}
}
function setInput(type) {
	touch = type === "touch";
	document.body.classList.toggle("touch-mode", touch);
	show("touch-action", touch && screen === "game");
	if (lastInput !== type) {
		lastInput = type;
		prompts();
	}
	if (type === "touch") {
		touch = true;
		show("touch-tip", screen === "game");
	}
}
function activity(type) {
	setInput(type);
	lastActivity = performance.now();
	if (game?.attract) {
		toTitle();
		return true;
	}
	return false;
}
function prompt(type) {
	let p = lastInput === "gamepad",
		x = settings.glyph === "xbox";
	const labels = p
		? {
				confirm: x ? "A" : "×",
				jump: x ? "A" : "×",
				action: x ? "X" : "□",
				duck: x ? "B" : "○",
				move: "L",
				pause: "☰",
			}
		: {
				confirm: "Enter ↵",
				jump: "Space",
				action: "E / X",
				duck: "S / ↓",
				move: "WASD / ↑←↓→",
				pause: "Esc",
			};
	return `<${p ? 'span class="glyph"' : "kbd"}>${labels[type] || type}</${p ? "span" : "kbd"}>`;
}
function prompts() {
	document
		.querySelectorAll("[data-prompt]")
		.forEach((el) => (el.innerHTML = prompt(el.dataset.prompt)));
}
function focusables() {
	let el = $(screen);
	return el
		? [...el.querySelectorAll("button,input,select")].filter(
				(x) => !x.disabled && !x.closest(".hidden"),
			)
		: [];
}
function focusAt(i) {
	const list = focusables();
	if (!list.length) return;
	focusIndex = (i + list.length) % list.length;
	document
		.querySelectorAll(".focused")
		.forEach((b) => b.classList.remove("focused"));
	list[focusIndex].classList.add("focused");
	list[focusIndex].focus({ preventScroll: true });
	list[focusIndex].scrollIntoView({ block: "nearest" });
}
function openScreen(name) {
	screens.forEach((s) => show(s, s === name));
	screen = name;
	paused = name !== "game";
	show("hud", name === "game");
	show("air-wrap", name === "game" && game?.stage === 1);
	show("menu-button", name === "game");
	show("touch-action", touch && name === "game");
	show("touch-tip", touch && name === "game");
	show("context", name === "game");
	if (name !== "game") {
		show("chapter-banner", false);
		show("toast", false);
	}
	audio.suspend(paused);
	if (name !== "game") focusAt(0);
}
function pause() {
	if (
		screen !== "game" ||
		game?.attract ||
		net?.server ||
		(net?.hubActive && net.ended)
	)
		return;
	openScreen("pause");
}
function back() {
	if (["settings", "how", "about", "dev"].includes(screen))
		openScreen(returnScreen);
	else if (screen === "pause") openScreen("game");
	else if (screen === "coop") openScreen("title");
	else if (screen === "game") pause();
}
function toTitle() {
	if (net?.hubActive) return;
	net?.leave();
	game.attract = false;
	game.mode = "title";
	remoteState = null;
	endedShown = false;
	game.build(0, 1);
	lastActivity = performance.now();
	show("attract-bar", false);
	show("chapter-banner", false);
	openScreen("title");
}
function chapter(stage) {
	view?.buildStage(stage);
	chapterTimer = 3.2;
	rescueTime = 0;
	$("banner-number").textContent =
		`CHAPTER ${["ONE", "TWO", "THREE", "FOUR"][stage]}`;
	$("banner-title").textContent = CHAPTERS[stage].name;
	$("banner-tag").textContent = CHAPTERS[stage].tag;
	show("chapter-banner", screen === "game");
	$("stage-select").value = stage;
}
function begin(n = 1, attract = false) {
	count = n;
	remoteState = null;
	endedShown = false;
	netInputs = {};
	game.start(n, attract);
	if (settings.assist && !attract) {
		game.lives = 7;
		game.config.air = 24;
		game.config.hazard = 0.72;
	}
	openScreen("game");
	chapter(0);
	show("attract-bar", attract);
	audio.suspend(false);
	if (!attract) audio.voice("pip-pip tally ho");
}
function notify(text) {
	$("notice").textContent = text;
	noticeTimer = 4;
	show("notice");
}
function toast(text) {
	if (screen !== "game") return;
	$("toast").textContent = text;
	toastTimer = 1.7;
	show("toast");
}
function event(name, data) {
	if (name === "stage") {
		chapter(data);
		return;
	}
	if (
		[
			"coin",
			"grab",
			"jump",
			"knife",
			"hit",
			"complete",
			"win",
			"splash",
		].includes(name)
	) {
		audio.sfx(name);
		const p = game?.players[0];
		if (p && ["coin", "grab", "hit", "splash"].includes(name))
			view?.addParticle(p.x, p.y + 1, name);
	}
	if (name === "bell") {
		audio.sfx("complete");
		audio.voice("belli bop");
		toast(data === 0 ? "FIRST BELL!" : "SECOND BELL!");
	}
	if (name === "hit" || name === "air") {
		audio.voice("oof bibble");
		toast(name === "air" ? "A BREATH OF FRESH AIR!" : "MIND YOUR HELMET!");
	}
	if (name === "complete") toast("ONWARD, EXPLORER!");
	if (name === "win") {
		audio.voice("pip pip hooray");
		rescueTime = 0;
	}
}
function outcome(s) {
	endedShown = true;
	paused = true;
	let won = s.mode === "won";
	let best = 0;
	try {
		best = Math.max(+localStorage.getItem("hullabaloo-best") || 0, s.score);
		localStorage.setItem("hullabaloo-best", best);
	} catch {
		best = s.score;
	}
	if (net.hubActive) {
		net.finish(s.score, won);
		audio.suspend(true);
		return;
	}
	if (s.attract) return;
	$("outcome-kicker").textContent = won
		? "BIRD RECOVERED. DIGNITY UNCERTAIN."
		: "EVERY EXPEDITION HAS ITS HICCUPS.";
	$("outcome-title").textContent = won ? "What a hullabaloo!" : "Oh, bother.";
	$("outcome-copy").textContent = won
		? "Pip is safe. The tea is cold. A perfectly splendid adventure."
		: "Dust off your helmet. The jungle will give you another chance.";
	$("final-score").textContent = String(s.score).padStart(6, "0");
	$("final-time").textContent = formatTime(s.elapsed);
	$("best-score").textContent = String(best).padStart(6, "0");
	openScreen("outcome");
}
function formatTime(t) {
	return `${Math.floor((t || 0) / 60)}:${String(Math.floor((t || 0) % 60)).padStart(2, "0")}`;
}
async function act(a) {
	if (
		net?.hubActive &&
		[
			"solo",
			"local",
			"again",
			"quit",
			"dev",
			"warp",
			"refill",
			"reset-tuning",
			"restart",
			"host",
			"join",
			"netstart",
			"netleave",
		].includes(a)
	)
		return;
	await audio.unlock();
	audio.sfx("menu");
	lastActivity = performance.now();
	if (a === "solo") {
		if (net.hubActive) return;
		net.leave();
		begin(1);
	} else if (a === "local") {
		net.leave();
		begin(2);
	} else if (a === "again") {
		if (net.connected) {
			if (net.isHost) net.startGame();
			else notify("Your partner starts the next expedition.");
		} else begin(count);
	} else if (a === "quit") toTitle();
	else if (a === "resume") openScreen("game");
	else if (a === "back") back();
	else if (["settings", "how", "about", "dev", "coop"].includes(a)) {
		returnScreen = screen;
		openScreen(a);
	} else if (a === "host") {
		await net.createRoom();
	} else if (a === "join") {
		await net.joinRoom($("room-code").value);
	} else if (a === "netstart") net.startGame();
	else if (a === "netleave") net.leave();
	else if (a === "warp") {
		game.build(+$("stage-select").value, count);
		openScreen("game");
		chapter(game.stage);
	} else if (a === "refill") {
		game.lives = 7;
		game.players.forEach((p) => (p.air = game.config.air));
		notify("Hearts and air restored.");
	} else if (a === "restart") {
		begin(count);
	} else if (a === "reset-tuning") {
		game.config = { ...DEFAULTS };
		game.god = false;
		game.auto = false;
		$("god").checked = false;
		$("autopilot").checked = false;
		renderSliders();
		notify("Expedition tuning restored.");
	}
}
document.querySelectorAll("[data-act]").forEach((b) => {
	b.addEventListener("click", () => {
		if (
			activity(
				lastInput === "gamepad" ? "gamepad" : touch ? "touch" : "keyboard",
			)
		)
			return;
		act(b.dataset.act);
	});
	b.addEventListener("pointerenter", (e) => {
		if (e.pointerType === "mouse") {
			let list = focusables();
			let i = list.indexOf(b);
			if (i >= 0) {
				focusIndex = i;
				document
					.querySelectorAll(".focused")
					.forEach((x) => x.classList.remove("focused"));
				b.classList.add("focused");
				b.focus({ preventScroll: true });
			}
		}
	});
});
$("menu-button").onclick = () => {
	activity(touch ? "touch" : "keyboard");
	audio.unlock();
	pause();
};
for (const name of ["music", "effects"]) {
	$(name).value = settings[name];
	$(name + "-val").textContent = settings[name] + "%";
	$(name).oninput = () => {
		settings[name] = +$(name).value;
		$(name + "-val").textContent = settings[name] + "%";
		audio[name === "music" ? "setMusic" : "setEffects"](settings[name] / 100);
		saveSettings();
	};
	audio[name === "music" ? "setMusic" : "setEffects"](settings[name] / 100);
}
$("glyph-style").value = settings.glyph;
$("glyph-style").onchange = () => {
	settings.glyph = $("glyph-style").value;
	saveSettings();
	prompts();
};
for (const id of ["assist", "motion"]) {
	$(id).checked = settings[id];
	$(id).onchange = () => {
		settings[id] = $(id).checked;
		saveSettings();
	};
}
const sliderSpec = [
	["speed", "Run speed", 3, 14, 0.1],
	["jump", "Jump impulse", 7, 20, 0.1],
	["gravity", "Gravity", 12, 45, 0.5],
	["swing", "Vine tempo", 0.4, 2, 0.05],
	["air", "Breath capacity", 6, 40, 1],
	["hazard", "Boulder frequency", 0.3, 2, 0.05],
	["timeScale", "Time scale", 0.25, 2, 0.05],
];
function renderSliders() {
	$("sliders").innerHTML = sliderSpec
		.map(
			([id, label, min, max, step]) =>
				`<div class="row"><label for="dev-${id}">${label}<small id="read-${id}">${game.config[id]}</small></label><input id="dev-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${game.config[id]}"></div>`,
		)
		.join("");
	sliderSpec.forEach(
		([id]) =>
			($("dev-" + id).oninput = () => {
				game.config[id] = +$("dev-" + id).value;
				$("read-" + id).textContent = game.config[id];
			}),
	);
}
$("god").onchange = () => (game.god = $("god").checked);
$("autopilot").onchange = () => (game.auto = $("autopilot").checked);
window.addEventListener("keydown", (e) => {
	if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) {
		if (e.code === "Escape") back();
		return;
	}
	if (activity("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	keys.add(e.code);
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Tab",
		].includes(e.code) &&
		screen === "game"
	)
		e.preventDefault();
	if (e.repeat) return;
	if (e.code === "Escape" || e.code === "KeyP") {
		e.preventDefault();
		back();
	} else if (screen !== "game" && e.code === "ArrowDown") {
		e.preventDefault();
		focusAt(focusIndex + 1);
	} else if (screen !== "game" && e.code === "ArrowUp") {
		e.preventDefault();
		focusAt(focusIndex - 1);
	} else if (screen === "title" && e.code === "Space") {
		e.preventDefault();
		act("solo");
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	pointerJump = false;
	pointerAction = false;
	if (screen === "game" && !game.attract && !net.connected) pause();
});
let drag = null,
	stick = { x: 0, y: 0 };
window.addEventListener("pointerdown", (e) => {
	if (e.target !== $("world")) return;
	if (activity(e.pointerType === "touch" ? "touch" : "keyboard")) return;
	audio.unlock();
	if (screen !== "game") return;
	if (e.pointerType === "touch") {
		touch = true;
		if (e.clientX < innerWidth * 0.6) {
			drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
			$("world").setPointerCapture(e.pointerId);
		} else pointerJump = true;
	} else {
		if (contextAction()) pointerAction = true;
		else pointerJump = true;
	}
});
window.addEventListener("pointermove", (e) => {
	if (
		e.pointerType === "mouse" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) > 1
	)
		activity("keyboard");
	if (e.target !== $("world")) return;
	if (drag && e.pointerId === drag.id) {
		stick.x = Math.max(-1, Math.min(1, (e.clientX - drag.x) / 55));
		stick.y = Math.max(-1, Math.min(1, -(e.clientY - drag.y) / 55));
	}
});
function releasePointer(e) {
	if (drag?.id === e.pointerId) {
		drag = null;
		stick = { x: 0, y: 0 };
	}
	pointerJump = false;
	pointerAction = false;
}
window.addEventListener("pointerup", releasePointer);
window.addEventListener("pointercancel", releasePointer);
document.addEventListener("contextmenu", (e) => e.preventDefault());
function contextAction() {
	const state = remoteState || game.snapshot();
	const p = state.players[net?.playerIndex === 1 ? 1 : 0] || game.players[0];
	return (
		state.stage === 1 ||
		(state.stage === 3 &&
			(Math.abs(p.x - 37) < 6 || Math.abs(p.x - 66) < 6 || p.x > 89))
	);
}
$("touch-action").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	activity("touch");
	audio.unlock();
	if (contextAction()) pointerAction = true;
	else pointerJump = true;
});
document.body.style.touchAction = "none";
function input(i = 0) {
	if (testInput && i === 0) return testInput;
	let x = 0,
		y = 0,
		jump = false,
		action = false,
		duck = false;
	if (i === 0) {
		x =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
		y =
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
		jump = keys.has("Space") || pointerJump;
		action = keys.has("KeyE") || keys.has("KeyX") || pointerAction;
		duck = keys.has("KeyS") || keys.has("ArrowDown") || keys.has("ControlLeft");
		if (touch) {
			x = stick.x;
			y = stick.y;
			duck = y < -0.6;
			if ((remoteState?.stage ?? game.stage) === 1) action = true;
		}
	} else {
		x = (keys.has("KeyL") ? 1 : 0) - (keys.has("KeyJ") ? 1 : 0);
		y = (keys.has("KeyI") ? 1 : 0) - (keys.has("KeyK") ? 1 : 0);
		jump = keys.has("KeyU");
		action = keys.has("KeyO");
		duck = keys.has("KeyK");
	}
	const pad = navigator.getGamepads?.()[i];
	if (pad) {
		const dz = (n) => (Math.abs(n) > 0.19 ? n : 0);
		x = dz(pad.axes[0] || 0) || x;
		y = -dz(pad.axes[1] || 0) || y;
		jump = pad.buttons[0]?.pressed || jump;
		action = pad.buttons[2]?.pressed || pad.buttons[7]?.pressed || action;
		duck = pad.buttons[1]?.pressed || pad.buttons[5]?.pressed || duck;
	}
	return { x, y, jump, action, duck };
}
function pollPads() {
	let pads = navigator.getGamepads?.() || [];
	for (let i = 0; i < pads.length; i++) {
		let pad = pads[i];
		if (!pad) continue;
		let b = pad.buttons.map((x) => x.pressed),
			prev = lastPads[i] || [],
			edge = (n) => b[n] && !prev[n];
		let active = b.some(Boolean) || pad.axes.some((x) => Math.abs(x) > 0.2);
		if (active) {
			if (activity("gamepad")) {
				lastPads[i] = b;
				return;
			}
			audio.unlock();
		}
		if (i === 0) {
			if (edge(9) && !(net?.hubActive && b[8])) back();
			if (screen !== "game") {
				let axis = pad.axes[1] || 0,
					dir = axis < -0.55 ? -1 : axis > 0.55 ? 1 : 0,
					repeat = dir && (dir !== navDir || performance.now() - navAt > 210);
				if (edge(12) || (repeat && dir < 0)) focusAt(focusIndex - 1);
				if (edge(13) || (repeat && dir > 0)) focusAt(focusIndex + 1);
				if (repeat) navAt = performance.now();
				navDir = dir;
				if (edge(0)) focusables()[focusIndex]?.click();
				if (edge(1)) back();
				let el = focusables()[focusIndex];
				if (edge(14) || edge(15)) {
					let d = edge(15) ? 1 : -1;
					if (el?.type === "range") {
						el.value = +el.value + d * +(el.step || 1);
						el.dispatchEvent(new Event("input"));
					} else if (el?.tagName === "SELECT") {
						el.selectedIndex = Math.max(
							0,
							Math.min(el.options.length - 1, el.selectedIndex + d),
						);
						el.dispatchEvent(new Event("change"));
					}
				}
			}
		}
		lastPads[i] = b;
	}
}
function hud(s) {
	$("score").textContent = String(s.score).padStart(6, "0");
	$("remaining").textContent =
		formatTime(Math.max(0, 420 - s.elapsed)) +
		" · " +
		(s.players.length === 2 ? "TWO EXPLORERS" : "EXPEDITION");
	$("lives").textContent = "♥ ".repeat(Math.max(0, s.lives));
	$("chapter-label").textContent =
		`0${s.stage + 1} / ${CHAPTERS[s.stage].name.replace("THE ", "")}`;
	$("objective").textContent =
		s.stage === 3
			? `BELLS ${s.bells.filter(Boolean).length}/2 · RESCUE PIP`
			: CHAPTERS[s.stage].goal;
	$("chapter-dots").innerHTML = [0, 1, 2, 3]
		.map(
			(i) =>
				`<span class="chapter-dot ${i <= s.stage ? "active" : ""}"></span>`,
		)
		.join("");
	show("air-wrap", screen === "game" && s.stage === 1);
	$("air").style.width =
		`${(Math.max(0, s.players[net.playerIndex === 1 ? 1 : 0]?.air || 0) / game.config.air) * 100}%`;
	let txt;
	if (s.stage === 0)
		txt = `${prompt("move")} Steer · ${prompt("jump")} Jump / release · Catch vines automatically`;
	if (s.stage === 1)
		txt = `${prompt("move")} Swim · ${prompt("action")} Swat closed jaws · Surface for air`;
	if (s.stage === 2)
		txt = `${prompt("jump")} Jump small rocks · ${prompt("duck")} Duck high bouncers`;
	if (s.stage === 3) {
		const p = s.players[net.playerIndex === 1 ? 1 : 0] || s.players[0];
		const near = Math.abs(p.x - 37) < 6 || Math.abs(p.x - 66) < 6;
		txt = near
			? `${prompt("action")} Ring the brass bell`
			: p.x > 89
				? `${prompt("action")} ${s.bells.every(Boolean) ? "Free Pip!" : "Ring both bells to open the cage"}`
				: `${prompt("jump")} Leap the tin guards · Ring both brass bells`;
	}
	$("context").innerHTML = txt;
	if (touch) {
		$("touch-action").textContent =
			s.stage === 1
				? "SWAT"
				: s.stage === 3 && contextAction()
					? "RING"
					: "JUMP";
	}
	if (screen === "dev")
		$("dev-readout").textContent =
			`Rapier bodies: ${game.world.bodies.len()} · ${s.players.length} explorers · ${s.enemies.length} hazards · ${formatTime(s.elapsed)} elapsed`;
}
async function boot() {
	try {
		await JungleGame.init();
		game = new JungleGame(event);
		let renderer = new THREE.WebGPURenderer({
			canvas: $("world"),
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		await renderer.init();
		view = new JungleScene(THREE, renderer);
		view.resize(innerWidth, innerHeight);
		view.buildStage(0);
		renderSliders();
		net = new JungleOnline({
			onStart: () => {
				begin(net.hubActive ? net.playerCount : 2);
			},
			onInput: (inp, from) => {
				let idx = net.hubActive
					? net.info.players.findIndex((p) => p.id === from)
					: 1;
				if (idx < 0) idx = 1;
				netInputs[idx] = inp;
			},
			onSnapshot: (s) => {
				if (!remoteState || s.stage !== remoteState.stage) chapter(s.stage);
				remoteState = s;
				if (s.mode === "won" || s.mode === "gameover") {
					if (!endedShown) outcome(s);
				}
			},
			onStatus: (text, n) => {
				$("net-status").textContent = text;
				show("net-start", n.connected && n.isHost && !n.hubActive);
				show("net-leave", !!n.roomCode);
			},
			onTimeUp: () => {
				if (net.isHost) {
					game.mode = "gameover";
					net.finish(game.score, false);
				}
				audio.suspend(true);
			},
			onEnd: () => {
				paused = true;
				audio.suspend(true);
				show("context", false);
				show("menu-button", false);
			},
			onDisconnect: () => {
				if (!net.isHost && screen === "game") pause();
				notify(
					net.isHost
						? "Partner disconnected. Your expedition continues."
						: "The host disconnected. Return to camp to try again.",
				);
				netInputs = {};
			},
		});
		await net.init();
		show("loading", false);
		prompts();
		if (net.hubActive) {
			screens.forEach((s) => show(s, false));
			screen = "hub";
			paused = true;
		} else openScreen("title");
		window.addEventListener("resize", () => {
			renderer.setSize(innerWidth, innerHeight);
			view.resize(innerWidth, innerHeight);
		});
		window.__JUNGLE = {
			ready: true,
			game,
			view,
			renderer,
			online: net,
			audio,
			settings,
			state: () => remoteState || game.snapshot(),
			screen: () => screen,
			start: begin,
			toTitle,
			pause,
			action: act,
			goStage: (s) => {
				game.build(s, count);
				chapter(s);
			},
			setInput: (i) => (testInput = i),
			step: (n = 1, ins = []) => {
				for (let i = 0; i < n; i++) game.step(1 / 60, ins);
				return game.snapshot();
			},
			offlineAudio: () => audio.offlineCheck(),
			render: async () => {
				view.update(1 / 60, game.snapshot());
				await renderer.renderAsync(view.scene, view.camera);
			},
		};
		let recovering = false,
			hubReady = false;
		let graphicsInterruptResolve;
		let graphicsInterrupt = new Promise(
			(resolve) => (graphicsInterruptResolve = resolve),
		);
		const device = renderer.backend.device;
		if (device)
			device.lost.then(async () => {
				if (recovering) return;
				recovering = true;
				graphicsInterruptResolve();
				try {
					const old = $("world"),
						canvas = old.cloneNode(false);
					old.replaceWith(canvas);
					renderer = new THREE.WebGPURenderer({
						canvas,
						antialias: true,
						forceWebGL: true,
					});
					renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
					renderer.setSize(innerWidth, innerHeight);
					renderer.toneMapping = THREE.ACESFilmicToneMapping;
					renderer.toneMappingExposure = 1.15;
					await renderer.init();
					view.renderer = renderer;
					window.__JUNGLE.renderer = renderer;
					window.__JUNGLE.graphicsRecovered = true;
				} catch (e) {
					console.error(e);
					notify("Graphics recovery failed. Reload the expedition.");
				} finally {
					graphicsInterrupt = new Promise(
						(resolve) => (graphicsInterruptResolve = resolve),
					);
					recovering = false;
				}
			});
		let prev = performance.now(),
			acc = 0,
			attractWait = 0;
		async function frame(now) {
			try {
				if (recovering) {
					prev = now;
					requestAnimationFrame(frame);
					return;
				}
				const dt = Math.min(0.05, (now - prev) / 1000);
				prev = now;
				pollPads();
				if (screen === "title" && now - lastActivity > 10000) begin(1, true);
				let s;
				if (
					screen === "game" &&
					!paused &&
					(!net.hubActive || net.running) &&
					!net.ended
				) {
					if (net.connected && !net.isHost) {
						net.sendInput(input(0));
						s = remoteState || game.snapshot();
					} else {
						acc += dt;
						while (acc >= 1 / 60) {
							let ins = [input(0), input(1)];
							if (net.connected) {
								ins = Array.from({ length: game.players.length }, (_, i) =>
									net.server || i !== net.playerIndex
										? netInputs[i] || {}
										: input(0),
								);
							}
							game.step(1 / 60, ins);
							acc -= 1 / 60;
						}
						s = game.snapshot();
						if (net.connected) net.sendSnapshot(s);
					}
					if (s.mode === "won" || s.mode === "gameover") {
						if (!endedShown) outcome(s);
					}
					hud(s);
				} else {
					s = remoteState || game.snapshot();
					acc = 0;
				}
				if (screen === "title" || screen === "loading" || screen === "hub") {
					let t = now / 1000;
					s = {
						...s,
						time: t,
						stage: 0,
						cameraX: 24,
						players: [
							{
								id: 0,
								x: 24 + Math.sin(t * 0.6) * 3,
								y: 3.5,
								facing: 1,
								anim: "swing",
								invuln: 0,
							},
						],
						vines: [
							{
								id: 0,
								anchorX: 24,
								anchorY: 14,
								x: 24 + Math.sin(t * 0.6) * 3,
								y: 5.1,
								angle: Math.sin(t * 0.6) * 0.3,
							},
						],
						enemies: [],
						collectibles: [],
					};
				}
				if (s.rescued) {
					rescueTime += dt;
					s.rescueTime = rescueTime;
				}
				view.update(settings.motion ? dt * 0.5 : dt, s);
				chapterTimer -= dt;
				show("chapter-banner", chapterTimer > 0 && screen === "game");
				toastTimer -= dt;
				if (toastTimer <= 0) show("toast", false);
				noticeTimer -= dt;
				if (noticeTimer <= 0) show("notice", false);
				if (
					screen === "game" &&
					game.attract &&
					(game.mode === "won" || game.mode === "gameover")
				) {
					attractWait += dt;
					if (attractWait > 3) {
						attractWait = 0;
						begin(1, true);
					}
				}
				audio.update(dt, s.stage, screen === "game" && !paused && !net.ended);
				const drawingRenderer = renderer;
				try {
					await Promise.race([
						drawingRenderer.renderAsync(view.scene, view.camera),
						graphicsInterrupt,
					]);
				} catch (renderError) {
					if (!recovering && drawingRenderer === renderer) throw renderError;
				}
				if (
					net.hubActive &&
					!hubReady &&
					!recovering &&
					drawingRenderer === renderer
				) {
					net.ready();
					hubReady = true;
				}
				requestAnimationFrame(frame);
			} catch (err) {
				console.error(err);
				$("load-text").textContent = "Expedition interrupted: " + err.message;
				show("loading");
			}
		}
		requestAnimationFrame(frame);
	} catch (err) {
		console.error(err);
		$("load-text").innerHTML =
			`<span id="fatal">The expedition could not start: ${String(err.message)}</span><br>Open in a current browser with WebGPU or WebGL 2 and internet access for Three.js.`;
		$("loadbar").style.display = "none";
	}
}
boot();
