import * as THREE from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
import { createArt, makeMat } from "./art.js";
import { Sound, renderAudioTest } from "./audio.js";
import { Network } from "./network.js";
import { LEVELS } from "./levels.js";
import META from "./metadata.json" with { type: "json" };

const $ = (id) => document.getElementById(id),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
	lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
	isTouch = matchMedia("(pointer:coarse)").matches;
const fmtTime = (t) =>
	`${Math.floor(t / 60)
		.toString()
		.padStart(2, "0")}:${Math.floor(t % 60)
		.toString()
		.padStart(2, "0")}`;
const DEFAULTS = {
	flightSpeed: 6.8,
	fuelDrain: 12,
	enemySpeed: 1,
	bombRadius: 4,
	damage: 1,
	gravity: 18,
};
const tuning = { ...DEFAULTS },
	settings = { music: 10, sfx: 65, shake: 60, glyphs: "ps", assist: true };
const sound = new Sound();
let scene,
	camera,
	renderer,
	art,
	world,
	player,
	playerBody,
	levelArt,
	objects = new THREE.Group(),
	titlePilot,
	debugLines;
let barriers = [],
	miners = [],
	enemies = [],
	crystals = [],
	bombs = [],
	lasers = [],
	ghosts = new Map(),
	sector = 0;
let lastSuccess = false,
	mode = "boot",
	menu = "boot",
	returnScreen = "title",
	lastInput = isTouch ? "touch" : "keyboard",
	idleAt = performance.now(),
	time = 0,
	elapsed = 0;
let score = 0,
	rescued = 0,
	health = 3,
	fuel = 100,
	charges = 3,
	lives = 3,
	checkpoint = { x: 4, y: 25.4 };
let training = false,
	god = false,
	infiniteFuel = false,
	physicsDebug = false,
	attractTime = 0,
	stageTimer = 0,
	stageChanging = false;
let hurtBlink = 0,
	invuln = 0,
	fireCooldown = 0,
	bombCooldown = 0,
	scanTimer = 0,
	scanCooldown = 0,
	toastTime = 0,
	shake = 0,
	dockCooldown = 0;
let fuelEmpty = false,
	flying = false,
	grounded = false,
	facing = 1,
	aim = { x: 1, y: 0 },
	accumulator = 0,
	lastFrame = 0,
	renderBusy = false,
	frameCount = 0;
let mouse = { x: 0, y: 0, down: false, active: false },
	keys = new Set(),
	pressed = new Set(),
	padPrevious = [],
	padNavAt = 0;
let touch = {
		id: null,
		ox: 0,
		oy: 0,
		x: 0,
		y: 0,
		fireId: null,
		aimX: 0,
		aimY: 0,
	},
	input = { move: 0, fly: 0, down: 0, fire: false, bomb: false, scan: false };
let ctxMap = $("map").getContext("2d"),
	transitionTimeout = null,
	tutorialFlags = new Set(),
	statistics = { shots: 0, blasts: 0, crystals: 0, hits: 0, replacements: 0 };
let gpuBootReject = null,
	rendererIssues = [],
	manualClock = false,
	testErrors = [],
	ready = false,
	rendererName = "unknown",
	lastPosition = { x: 4, y: 25.4 },
	titleFocussed = false;
const cameraTarget = new THREE.Vector3(20, 17, 55),
	rayPoint = new THREE.Vector3();
const network = new Network({
	onStart: () => {
		startRun(false);
		if (network.countdown > 0) {
			show("hub-wait");
			$("hub-countdown").textContent = "3";
		}
	},
	onGhost: receiveGhost,
	onLeave: removeGhost,
	onRivalFinish: () => {
		if (mode === "result") updateRaceResults();
		else if (mode === "playing")
			toast("RIVAL SHIFT COMPLETE", "Keep going. Every rescue counts.", 3);
	},
	onEnd: () => {
		mode = "hub-ended";
		show("hub-wait");
		$("hub-wait").querySelector("h2").textContent = "Shift complete.";
		$("hub-wait").querySelector(".lead").textContent =
			"The rescue office is tallying the results.";
		sound.suspend(true);
	},
	onTimeUp: () => {
		if (mode === "playing") endRun(false, true);
	},
	onStatus: (text) => {
		$("network-status").textContent = text;
	},
});

function noteInput(type, exitDemo = true) {
	if (type !== lastInput) {
		lastInput = type;
		updatePrompts();
	}
	idleAt = performance.now();
	if (exitDemo && mode === "attract") {
		showTitle();
		return true;
	}
	return false;
}
function visibleScreen() {
	return menu && $(menu) && !$(menu).classList.contains("hidden")
		? $(menu)
		: null;
}
function show(id, focus = true) {
	for (const node of document.querySelectorAll(".overlay"))
		node.classList.toggle("hidden", node.id !== id);
	menu = id;
	const playing = mode === "playing" || mode === "attract";
	$("hud").classList.toggle("hidden", !playing);
	$("attract").classList.toggle("hidden", mode !== "attract");
	document.body.classList.toggle("touch-playing", isTouch && playing && !id);
	$("touch-hint").classList.toggle(
		"hidden",
		!isTouch || !playing || !!id || elapsed > 12,
	);
	if (id) {
		$("map-wrap").classList.add("hidden");
		$("touch-action").classList.remove("available");
		keys.clear();
		mouse.down = false;
		touch.id = null;
		touch.fireId = null;
	}
	if (focus && id) {
		requestAnimationFrame(() => {
			const el = $(id).querySelector("button:not([disabled]),input,textarea");
			el?.focus({ preventScroll: true });
		});
	}
}
function showTitle() {
	clearTimeout(transitionTimeout);
	stageChanging = false;
	$("sector-transition").style.opacity = 0;
	mode = "title";
	idleAt = performance.now();
	sound.suspend(false);
	loadLevel(0);
	player.group.visible = false;
	titlePilot.group.visible = true;
	show("title");
	$("hud").classList.add("hidden");
	$("attract").classList.add("hidden");
	$("map-wrap").classList.add("hidden");
	network.active || network.disconnect();
}
function toast(text, sub = "", duration = 3) {
	$("toast").innerHTML = "";
	$("toast").append(document.createTextNode(text));
	if (sub) {
		const s = document.createElement("small");
		s.textContent = sub;
		$("toast").append(s);
	}
	toastTime = duration;
	$("toast").style.opacity = 1;
}
function changeMenu(id, back = menu) {
	returnScreen = back;
	show(id);
	sound.play("click");
}
function pause() {
	if (mode === "attract") {
		showTitle();
		return;
	}
	if (mode !== "playing") return;
	sound.play("click");
	show("pause");
	$("pause-caption").textContent = network.active
		? "Your race keeps running while this menu is open."
		: "Everyone still needs a lift.";
	for (const action of ["restart", "quit", "dev"])
		$("pause").querySelector(`[data-action=${action}]`).disabled =
			network.active;
}
function resume() {
	if (mode === "playing") {
		show(null);
		sound.suspend(false);
	}
}
function back() {
	if (menu === "pause") {
		resume();
		return;
	}
	const target = returnScreen || "title";
	if (target === "pause") {
		show("pause");
	} else if (target === "title") {
		showTitle();
	} else show(target);
	sound.play("click");
}

function updatePrompts() {
	const pad = lastInput === "pad",
		xbox = settings.glyphs === "xbox";
	const p = pad
		? {
				move: "LEFT STICK",
				fly: xbox ? "A / STICK ↑" : "✕ / STICK ↑",
				fire: xbox ? "RT / X" : "R2 / □",
				bomb: xbox ? "RB / B" : "R1 / ○",
				scan: xbox ? "Y" : "△",
				pause: xbox ? "MENU" : "OPTIONS",
			}
		: {
				move: "A / D",
				fly: "SPACE / W",
				fire: "MOUSE / J",
				bomb: "E / RIGHT CLICK",
				scan: "Q",
				pause: "ESC / P",
			};
	if (lastInput === "touch")
		Object.assign(p, {
			move: "LEFT THUMB",
			fly: "DRAG UP",
			fire: "RIGHT THUMB",
			bomb: "CHARGE BUTTON",
			scan: "AUTOMATIC",
			pause: "Ⅱ",
		});
	document
		.querySelectorAll("[data-prompt]")
		.forEach((e) => (e.textContent = p[e.dataset.prompt]));
	$("controls").innerHTML =
		`<span class="glyph">${p.move}</span> MOVE &nbsp; <span class="glyph">${p.fly}</span> FLY<br><span class="glyph">${p.fire}</span> LASER &nbsp; <span class="glyph">${p.bomb}</span> CHARGE<br><span class="glyph">${p.scan}</span> SCAN &nbsp; <span class="glyph">${p.pause}</span> MENU`;
	$("scroll-hint").textContent = pad
		? "RIGHT STICK · SCROLL    " + (xbox ? "B" : "○") + " · BACK"
		: "MOUSE WHEEL / PAGE UP + DOWN · SCROLL    ESC · BACK";
	$("title-input").textContent =
		lastInput === "pad"
			? `${xbox ? "XBOX" : "PLAYSTATION"} CONTROLLER READY`
			: lastInput === "touch"
				? "TOUCH CONTROLS READY"
				: "KEYBOARD + MOUSE READY";
}
function menuMove(delta) {
	const screen = visibleScreen();
	if (!screen) return;
	const list = [
		...screen.querySelectorAll("button:not([disabled]),input,textarea"),
	].filter((e) => e.getClientRects().length);
	if (!list.length) return;
	const index = list.indexOf(document.activeElement);
	const next = list[(index + delta + list.length) % list.length];
	next.focus({ preventScroll: true });
	next.scrollIntoView({ block: "nearest" });
	sound.play("click");
}
function menuAdjust(delta) {
	const el = document.activeElement;
	if (el?.type === "range") {
		el.value = clamp(+el.value + delta * (+el.step || 1), +el.min, +el.max);
		el.dispatchEvent(new Event("input"));
	}
}
function action(name) {
	sound.unlock();
	noteInput(lastInput, false);
	switch (name) {
		case "start":
			if (!network.active) {
				if (network.started && network.remoteCount) network.startRace();
				else startRun();
			}
			break;
		case "race":
			changeMenu("race", "title");
			break;
		case "help":
			changeMenu("help", "title");
			break;
		case "manual-pause":
			changeMenu("help", "pause");
			break;
		case "settings":
			changeMenu("settings", "title");
			break;
		case "settings-pause":
			changeMenu("settings", "pause");
			break;
		case "about":
			changeMenu("about", "title");
			break;
		case "resume":
			resume();
			break;
		case "dev":
			if (!network.active) changeMenu("dev", "pause");
			break;
		case "restart":
			if (!network.active) startRun();
			break;
		case "quit":
			if (!network.active) showTitle();
			break;
		case "back":
			back();
			break;
		case "refill":
			training = true;
			refill();
			toast("EQUIPMENT REFILLED");
			break;
		case "teleport":
			training = true;
			teleport(checkpoint.x, checkpoint.y);
			break;
		case "rescue-dev":
			training = true;
			miners.forEach(rescueMiner);
			break;
		case "next-dev":
			training = true;
			if (sector < 2) {
				loadLevel(sector + 1);
				show("dev");
			} else {
				miners.forEach(rescueMiner);
				endRun(true);
			}
			break;
		case "defaults":
			Object.assign(tuning, DEFAULTS);
			god = infiniteFuel = physicsDebug = false;
			syncDev();
			if (debugLines) debugLines.visible = false;
			world.gravity.y = -tuning.gravity;
			break;
		case "local-link":
			try {
				network.enableLocal();
			} catch (e) {
				$("network-status").textContent = e.message;
			}
			break;
		case "race-start":
			try {
				network.startRace();
			} catch (e) {
				$("network-status").textContent = e.message;
			}
			break;
		case "disconnect":
			network.disconnect();
			break;
		case "offer":
			pair(async () => network.createOffer());
			break;
		case "answer":
			pair(async () => network.acceptOffer($("remote-code").value));
			break;
		case "accept":
			pair(async () => {
				await network.acceptAnswer($("remote-code").value);
				return null;
			});
			break;
		case "copy":
			navigator.clipboard
				?.writeText($("link-code").value)
				.then(() => ($("network-status").textContent = "Code copied."))
				.catch(() => {
					$("link-code").select();
					$("network-status").textContent =
						"Code selected. Copy with your keyboard.";
				});
			break;
	}
}
async function pair(fn) {
	try {
		const code = await fn();
		if (code) {
			$("link-code").value = code;
			$("link-code").focus();
			$("link-code").select();
		}
	} catch (e) {
		$("network-status").textContent = e.message;
	}
}
document.addEventListener("pointerdown", (e) => {
	if (e.target !== canvas)
		noteInput(e.pointerType === "touch" ? "touch" : "keyboard");
});
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) action(b.dataset.action);
});
document.addEventListener("pointerover", (e) => {
	if (e.pointerType !== "touch" && e.target.matches("button"))
		e.target.focus({ preventScroll: true });
});
document.addEventListener("keydown", (e) => {
	if (e.target.matches("textarea")) {
		noteInput("keyboard");
		return;
	}
	if (e.repeat && ["KeyE", "KeyQ", "Escape", "KeyP"].includes(e.code)) return;
	if (noteInput("keyboard")) {
		e.preventDefault();
		return;
	}
	sound.unlock();
	if (
		["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
			e.code,
		)
	)
		e.preventDefault();
	if (e.code === "Escape" || e.code === "KeyP") {
		if (menu && !["title", "hub-wait", "boot"].includes(menu)) {
			back();
		} else if (!menu) pause();
		return;
	}
	if (menu) {
		if (e.code === "ArrowDown" || e.code === "KeyS") menuMove(1);
		if (e.code === "ArrowUp" || e.code === "KeyW") menuMove(-1);
		if (e.code === "ArrowLeft") menuAdjust(-1);
		if (e.code === "ArrowRight") menuAdjust(1);
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			document.activeElement?.click();
		}
		return;
	}
	if (!keys.has(e.code)) pressed.add(e.code);
	keys.add(e.code);
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	mouse.down = false;
	if (!network.active && mode === "playing" && !menu) pause();
});
$("touch-menu").onclick = () => pause();
$("touch-action").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	e.stopPropagation();
	pressed.add("KeyE");
	sound.unlock();
	noteInput("touch");
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
let canvas = $("game");
document.addEventListener("pointerdown", (e) => {
	if (e.target !== canvas) return;
	if (noteInput(e.pointerType === "touch" ? "touch" : "keyboard")) return;
	sound.unlock();
	if (menu) return;
	if (e.pointerType === "touch") {
		canvas.setPointerCapture(e.pointerId);
		if (e.clientX < innerWidth * 0.53 && touch.id === null) {
			Object.assign(touch, {
				id: e.pointerId,
				ox: e.clientX,
				oy: e.clientY,
				x: 0,
				y: 0,
			});
			const ring = $("touch-ring");
			ring.style.left = `${e.clientX - 50}px`;
			ring.style.top = `${e.clientY - 50}px`;
			ring.style.display = "block";
		} else {
			touch.fireId = e.pointerId;
			touch.aimX = e.clientX;
			touch.aimY = e.clientY;
		}
	} else {
		mouse.x = e.clientX;
		mouse.y = e.clientY;
		mouse.active = true;
		if (e.button === 0) mouse.down = true;
		if (e.button === 2) pressed.add("KeyE");
	}
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") {
		if (e.pointerId === touch.id) {
			touch.x = clamp((e.clientX - touch.ox) / 60, -1, 1);
			touch.y = clamp((e.clientY - touch.oy) / 60, -1, 1);
		}
		if (e.pointerId === touch.fireId) {
			touch.aimX = e.clientX;
			touch.aimY = e.clientY;
		}
	} else {
		if (Math.abs(mouse.x - e.clientX) + Math.abs(mouse.y - e.clientY) > 3)
			noteInput("keyboard");
		mouse.x = e.clientX;
		mouse.y = e.clientY;
		mouse.active = true;
	}
});
window.addEventListener("pointerup", (e) => {
	if (e.pointerId === touch.id) {
		touch.id = null;
		touch.x = touch.y = 0;
		$("touch-ring").style.display = "none";
	}
	if (e.pointerId === touch.fireId) touch.fireId = null;
	if (e.button === 0) mouse.down = false;
});
window.addEventListener("pointercancel", () => {
	touch.id = touch.fireId = null;
	touch.x = touch.y = 0;
	mouse.down = false;
	$("touch-ring").style.display = "none";
});
window.addEventListener("gamepadconnected", () => {
	noteInput("pad");
	toast("CONTROLLER CONNECTED", "Left stick to fly. Cross to lift.");
});
function pollInput() {
	input = { move: 0, fly: 0, down: 0, fire: false, bomb: false, scan: false };
	const pads = navigator.getGamepads?.() || [];
	const pad = [...pads].find((p) => p?.connected);
	if (pad) {
		const b = pad.buttons.map((x) => x.pressed),
			a = pad.axes || [];
		const dz = (v) => (Math.abs(v || 0) > 0.16 ? v : 0);
		const activity =
			b.some((v, i) => v && !padPrevious[i]) ||
			Math.abs(dz(a[0])) +
				Math.abs(dz(a[1])) +
				Math.abs(dz(a[2])) +
				Math.abs(dz(a[3])) >
				0.1;
		if (activity && noteInput("pad")) {
			padPrevious = b;
			return;
		}
		const edge = (i) => b[i] && !padPrevious[i];
		if (edge(9) && !b[8]) {
			if (menu && mode === "playing") resume();
			else pause();
		}
		if (menu) {
			const scrollPanel = visibleScreen()?.querySelector(".panel");
			if (scrollPanel && Math.abs(dz(a[3])) > 0.2)
				scrollPanel.scrollTop += dz(a[3]) * 20;
			const now = performance.now();
			if ((b[12] || dz(a[1]) < -0.55) && now > padNavAt) {
				menuMove(-1);
				padNavAt = now + 200;
			}
			if ((b[13] || dz(a[1]) > 0.55) && now > padNavAt) {
				menuMove(1);
				padNavAt = now + 200;
			}
			if ((b[14] || dz(a[0]) < -0.55) && now > padNavAt) {
				menuAdjust(-5);
				padNavAt = now + 140;
			}
			if ((b[15] || dz(a[0]) > 0.55) && now > padNavAt) {
				menuAdjust(5);
				padNavAt = now + 140;
			}
			if (edge(0)) document.activeElement?.click();
			if (edge(1) && menu !== "title" && menu !== "hub-wait") back();
		} else {
			input.move = dz(a[0]);
			input.fly = Math.max(b[0] ? 1 : 0, -dz(a[1]));
			input.down = Math.max(0, dz(a[1]));
			input.fire = b[7] || b[2];
			input.bomb = edge(5) || edge(1);
			input.scan = edge(3);
			if (Math.hypot(dz(a[2]), dz(a[3])) > 0.25) {
				const l = Math.hypot(a[2], a[3]);
				aim = { x: a[2] / l, y: -a[3] / l };
			} else aim = { x: facing, y: 0 };
		}
		padPrevious = b;
	}
	if (!menu && lastInput !== "pad") {
		input.move =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
		input.fly =
			keys.has("Space") || keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
		input.down = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
		input.fire = mouse.down || keys.has("KeyJ") || keys.has("KeyZ");
		input.bomb = pressed.has("KeyE") || pressed.has("KeyX");
		input.scan = pressed.has("KeyQ");
		if (touch.id !== null) {
			input.move = touch.x;
			input.fly = Math.max(0, -touch.y);
			input.down = Math.max(0, touch.y);
		}
		if (touch.fireId !== null) input.fire = true;
		if ((mouse.active && lastInput === "keyboard") || touch.fireId !== null) {
			const mx = touch.fireId !== null ? touch.aimX : mouse.x,
				my = touch.fireId !== null ? touch.aimY : mouse.y;
			rayPoint
				.set((mx / innerWidth) * 2 - 1, (-my / innerHeight) * 2 + 1, 0)
				.unproject(camera);
			const pos = playerBody?.translation();
			if (pos) {
				const dx = rayPoint.x - pos.x,
					dy = rayPoint.y - pos.y,
					l = Math.hypot(dx, dy);
				if (l > 0.2) aim = { x: dx / l, y: dy / l };
			}
		} else aim = { x: facing, y: 0 };
	}
	pressed.clear();
}

function initSettings() {
	for (const id of ["music", "sfx", "shake"]) {
		$(id).value = settings[id];
		$(id).oninput = () => {
			settings[id] = +$(id).value;
			$(`${id}-val`).value = `${settings[id]}%`;
			sound.setMusic(settings.music / 100);
			sound.setSfx(settings.sfx / 100);
		};
	}
	$("glyph-toggle").onclick = () => {
		settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
		$("glyph-toggle").textContent =
			settings.glyphs === "ps" ? "PlayStation" : "Xbox";
		updatePrompts();
	};
	$("assist-toggle").onclick = () => {
		settings.assist = !settings.assist;
		$("assist-toggle").textContent = settings.assist ? "On" : "Off";
	};
	const sliders = [
		["flightSpeed", "Flight speed", 3, 12, 0.1],
		["fuelDrain", "Fuel drain / second", 0, 30, 0.5],
		["enemySpeed", "Creature speed", 0.2, 2.5, 0.1],
		["bombRadius", "Charge blast radius", 2, 7, 0.1],
		["damage", "Damage multiplier", 0, 2, 0.25],
		["gravity", "Cave gravity", 6, 28, 0.5],
	];
	for (const [id, label, min, max, step] of sliders) {
		const wrap = document.createElement("label");
		wrap.className = "setting";
		wrap.innerHTML = `${label}<output id="dev-${id}-val">${tuning[id]}</output><input id="dev-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${tuning[id]}">`;
		$("dev-sliders").append(wrap);
		wrap.querySelector("input").oninput = (e) => {
			training = true;
			tuning[id] = +e.target.value;
			$(`dev-${id}-val`).value = tuning[id];
			if (world) world.gravity.y = -tuning.gravity;
		};
	}
	$("god-toggle").onclick = () => {
		god = !god;
		training = true;
		syncDev();
	};
	$("fuel-toggle").onclick = () => {
		infiniteFuel = !infiniteFuel;
		training = true;
		syncDev();
	};
	$("physics-toggle").onclick = () => {
		physicsDebug = !physicsDebug;
		syncDev();
		if (debugLines) debugLines.visible = physicsDebug;
	};
}
function syncDev() {
	for (const k in tuning) {
		$(`dev-${k}`).value = tuning[k];
		$(`dev-${k}-val`).value = tuning[k];
	}
	$("god-toggle").textContent = god ? "On" : "Off";
	$("fuel-toggle").textContent = infiniteFuel ? "On" : "Off";
	$("physics-toggle").textContent = physicsDebug ? "On" : "Off";
}
function fillAbout() {
	const names = {
		date: "Date",
		source: "Source",
		plan: "Plan",
		genre: "Genre",
		perspective: "Perspective",
		tech: "Tech",
		artDirection: "Art direction",
		animation: "Animation",
		audio: "Audio",
		online: "Online",
		testing: "Testing",
		research: "Research",
		environment: "Environment",
		model: "Model",
		usage: "Usage",
	};
	const root = $("about-content");
	const p = document.createElement("p");
	p.textContent =
		"An original tribute to the cave rescue spirit of H.E.R.O. (1984). H.E.R.O. was created by John Van Ryzin and published by Activision. This fan-made work is unaffiliated.";
	root.append(p);
	const sourceHeading = document.createElement("h3");
	sourceHeading.textContent = "Source Information";
	root.append(sourceHeading);
	const d = document.createElement("div");
	for (const [key, val] of Object.entries(META.sourceInformation)) {
		const row = document.createElement("p"),
			b = document.createElement("b");
		b.textContent = (names[key] || key) + ": ";
		row.append(b, document.createTextNode(val));
		d.append(row);
	}
	root.append(d);
	const questionSets = {
		testingFeedback: [
			"Issues caught",
			"Critical / game breaking issues",
			"Most helpful test",
			"Least helpful test",
		],
		engineFeedback: [
			"Liked most",
			"Stuck or wrong guesses",
			"Most important custom system",
			"Hardest engine task",
			"Engine changes",
			"One desired engine change",
		],
		promptFeedback: [
			"Liked most",
			"Confusing",
			"Hardest task",
			"Suggested prompt change",
		],
	};
	for (const key of ["testingFeedback", "engineFeedback", "promptFeedback"]) {
		const h = document.createElement("h3");
		h.textContent = key
			.replace("Feedback", " Feedback")
			.replace(/^./, (c) => c.toUpperCase());
		root.append(h);
		META[key].forEach((answer, i) => {
			const row = document.createElement("p");
			const b = document.createElement("b");
			b.textContent = questionSets[key][i] + ": ";
			row.append(b, document.createTextNode(answer));
			root.append(row);
		});
	}
	const license = document.createElement("p");
	license.textContent =
		"Three.js r180 (MIT) · Rapier 0.19.3 (Apache-2.0) · AI Hub Session Protocol v1 client 1.4.0. Code-built geometry, animation, music, sound effects and gibberish voices. No image or audio assets.";
	root.append(license);
}

function colliderRect(r) {
	return world.createCollider(
		RAPIER.ColliderDesc.cuboid(r.w / 2, r.h / 2, 1.4)
			.setTranslation(r.x, r.y, 0)
			.setFriction(0.2)
			.setRestitution(0),
	);
}
function loadLevel(index) {
	sector = clamp(index, 0, 2);
	const level = { ...LEVELS[sector], index: sector };
	playerBody = null;
	world?.free();
	world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
	for (const s of level.solids) colliderRect(s);
	art.disposeObject(objects);
	objects = new THREE.Group();
	scene.add(objects);
	art.clearEffects();
	levelArt = art.buildLevel(level);
	barriers = level.barriers.map((r) => ({
		...r,
		collider: colliderRect(r),
		broken: false,
		group: levelArt.barriers.get(r.id),
	}));
	miners = level.miners.map((r, i) => {
		const obj = art.createMiner(i);
		obj.group.position.set(r.x, r.y, 0);
		objects.add(obj.group);
		return { ...r, ...obj, rescued: false, beam: 0 };
	});
	enemies = level.enemies.map((r, i) => {
		const obj = art.createEnemy(r.type);
		obj.group.position.set(r.x, r.y, 0);
		objects.add(obj.group);
		return {
			...r,
			...obj,
			originX: r.x,
			originY: r.y,
			phase: i * 1.7,
			alive: true,
			hp: r.type === "jelly" ? 2 : 1,
		};
	});
	crystals = level.crystals.map((r) => {
		const g = new THREE.Group(),
			m = new THREE.Mesh(
				new THREE.OctahedronGeometry(0.3),
				makeMat(0x8cebd2, 0x2b907d),
			);
		g.add(m);
		const halo = new THREE.Mesh(
			new THREE.TorusGeometry(0.46, 0.018, 4, 20),
			new THREE.MeshBasicMaterial({
				color: 0x79e2cf,
				transparent: true,
				opacity: 0.45,
			}),
		);
		g.add(halo);
		g.position.set(r.x, r.y, 0.5);
		objects.add(g);
		return { ...r, group: g, collected: false };
	});
	bombs = [];
	lasers = [];
	facing = 1;
	aim = { x: 1, y: 0 };
	fuel = 100;
	charges = 3;
	health = 3;
	checkpoint = { ...level.start };
	stageTimer = 0;
	dockCooldown = 2;
	invuln = 1.5;
	scanTimer = 5;
	scanCooldown = 0;
	if (player) {
		art.disposeObject(player.group);
	}
	player = art.createPilot(0xffba4f);
	scene.add(player.group);
	playerBody = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(level.start.x, level.start.y, 0)
			.lockRotations()
			.setLinearDamping(0.8)
			.setCcdEnabled(true),
	);
	playerBody.setEnabledTranslations(true, true, false, true);
	world.createCollider(
		RAPIER.ColliderDesc.capsule(0.38, 0.34)
			.setCollisionGroups(0x00020001)
			.setFriction(0.1)
			.setRestitution(0)
			.setDensity(1),
		playerBody,
	);
	player.group.position.set(level.start.x, level.start.y, 0);
	cameraTarget.set(
		clamp(level.start.x, 17, 37),
		clamp(level.start.y, 11.5, 18.5),
		55,
	);
	camera.position.copy(cameraTarget);
	camera.lookAt(cameraTarget.x, cameraTarget.y, 0);
	for (const g of ghosts.values()) g.group.visible = false;
	if (debugLines) {
		scene.remove(debugLines);
		debugLines.geometry.dispose();
		debugLines.material.dispose();
		debugLines = null;
	}
	updateHUD();
	updateMap();
}
function startRun(demo = false) {
	clearTimeout(transitionTimeout);
	stageChanging = false;
	$("sector-transition").style.opacity = 0;
	mode = demo ? "attract" : "playing";
	hurtBlink = 0;
	elapsed = 0;
	score = 0;
	rescued = 0;
	lives = 3;
	health = 3;
	training = false;
	god = infiniteFuel = physicsDebug = false;
	Object.assign(tuning, DEFAULTS);
	syncDev();
	statistics = { shots: 0, blasts: 0, crystals: 0, hits: 0, replacements: 0 };
	tutorialFlags.clear();
	attractTime = 0;
	loadLevel(0);
	titlePilot.group.visible = false;
	player.group.visible = true;
	accumulator = 0;
	show(null);
	sound.suspend(false);
	toast("SHIFT STARTED", "Find both miners. Bring everyone home.", 4);
}
function refill() {
	health = 3;
	fuel = 100;
	charges = 3;
	invuln = Math.max(invuln, 0.7);
}
function teleport(x, y) {
	playerBody.setTranslation({ x, y, z: 0 }, true);
	playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	lastPosition = { x, y };
	player.group.position.set(x, y, 0);
}
function netState() {
	const p = playerBody?.translation() || lastPosition;
	return {
		x: p.x,
		y: p.y,
		sector,
		facing,
		flying,
		score: Math.round(score),
		rescued,
		time: elapsed,
	};
}
function rescueMiner(m) {
	if (m.rescued) return;
	m.rescued = true;
	m.beam = 1.6;
	rescued++;
	score += 1000;
	fuel = Math.min(100, fuel + 30);
	health = Math.min(3, health + 1);
	sound.play("rescue");
	sound.voice("rescue");
	art.effect("rescue", m.x, m.y, 0xffd675);
	shake = Math.max(shake, 0.2);
	const remaining = miners.filter((n) => !n.rescued).length;
	toast(
		`${m.name.toUpperCase()} IS HEADING HOME`,
		remaining
			? "One more signal in this sector."
			: "Sector clear. Reach the striped lift.",
	);
	if (!remaining) {
		levelArt.exit.userData.unlocked = true;
		scanTimer = 6;
	}
}
function hurt(amount = 1, source = "hazard") {
	if (invuln > 0 || god || mode === "attract" || tuning.damage === 0)
		return false;
	health -= amount * tuning.damage;
	statistics.hits++;
	hurtBlink = 1.6;
	invuln = 1.6;
	shake = 0.65;
	sound.play("hit");
	$("damage").classList.add("danger-flash");
	setTimeout(() => $("damage").classList.remove("danger-flash"), 220);
	art.effect(
		"hit",
		playerBody.translation().x,
		playerBody.translation().y,
		0xff765d,
	);
	if (health <= 0) {
		lives--;
		statistics.replacements++;
		if (lives <= 0) {
			endRun(false);
			return true;
		}
		teleport(checkpoint.x, checkpoint.y);
		refill();
		toast(
			"FRESH SUIT. SAME BRAVE PILOT.",
			`${lives} replacement ${lives === 1 ? "suit" : "suits"} remaining.`,
			3,
		);
	} else if (source === "lava" || source === "water") {
		const p = playerBody.translation();
		playerBody.setLinvel({ x: -facing * 3, y: 7, z: 0 }, true);
		if (source === "lava" && p.y < 2) teleport(Math.max(16, p.x - 3), 5);
	}
	return true;
}
function destroyBarrier(b) {
	if (b.broken) return;
	b.broken = true;
	b.group.visible = false;
	world.removeCollider(b.collider, true);
	score += 150;
	art.effect("explosion", b.x, b.y, 0xffbd61);
}
function killEnemy(e) {
	if (!e.alive) return;
	e.alive = false;
	e.group.visible = false;
	score += 150;
	art.effect("hit", e.x, e.y, 0xffc65c);
	sound.play("collect");
}
function rayBox(ox, oy, dx, dy, box, max) {
	let near = 0,
		far = max;
	for (const [o, d, mn, mx] of [
		[ox, dx, box.x - box.w / 2, box.x + box.w / 2],
		[oy, dy, box.y - box.h / 2, box.y + box.h / 2],
	]) {
		if (Math.abs(d) < 1e-7) {
			if (o < mn || o > mx) return Infinity;
		} else {
			let a = (mn - o) / d,
				b = (mx - o) / d;
			if (a > b) [a, b] = [b, a];
			near = Math.max(near, a);
			far = Math.min(far, b);
			if (far < near) return Infinity;
		}
	}
	return near >= 0 && near <= max ? near : Infinity;
}
function fireLaser() {
	if (fireCooldown > 0) return;
	fireCooldown = 0.18;
	statistics.shots++;
	sound.play("laser");
	const pos = playerBody.translation();
	let dir = { ...aim };
	if ((settings.assist || lastInput === "touch") && lastInput !== "keyboard") {
		let chosen = null,
			best = Infinity;
		for (const e of enemies) {
			if (!e.alive) continue;
			const dx = e.x - pos.x,
				dy = e.y - pos.y,
				d = Math.hypot(dx, dy);
			if (d > 14) continue;
			const dot = (dx * dir.x + dy * dir.y) / d;
			if (dot > 0.82 && d < best) {
				chosen = e;
				best = d;
			}
		}
		if (chosen) {
			const l = dist(chosen, pos);
			dir = { x: (chosen.x - pos.x) / l, y: (chosen.y - pos.y) / l };
		}
	}
	const ox = pos.x + dir.x * 0.5,
		oy = pos.y + 0.25 + dir.y * 0.3;
	let length = 17,
		target = null;
	const boxes = [
		...LEVELS[sector].solids,
		...barriers.filter((b) => !b.broken),
	];
	for (const b of boxes)
		length = Math.min(length, rayBox(ox, oy, dir.x, dir.y, b, 17));
	for (const e of enemies) {
		if (!e.alive) continue;
		const d = rayBox(
			ox,
			oy,
			dir.x,
			dir.y,
			{ x: e.x, y: e.y, w: e.type === "spider" ? 1.35 : 1.6, h: 1.2 },
			length,
		);
		if (d < length) {
			length = d;
			target = e;
		}
	}
	if (target) {
		target.hp--;
		if (target.hp <= 0) killEnemy(target);
	}
	const group = new THREE.Group();
	const core = new THREE.Mesh(
		new THREE.BoxGeometry(Math.max(0.05, length), 0.065, 0.08),
		new THREE.MeshBasicMaterial({ color: 0xffef9a }),
	);
	core.position.x = length / 2;
	group.add(core);
	const glow = new THREE.Mesh(
		new THREE.BoxGeometry(Math.max(0.05, length), 0.2, 0.06),
		new THREE.MeshBasicMaterial({
			color: 0xffa957,
			transparent: true,
			opacity: 0.35,
		}),
	);
	glow.position.x = length / 2;
	group.add(glow);
	group.position.set(ox, oy, 1.3);
	group.rotation.z = Math.atan2(dir.y, dir.x);
	objects.add(group);
	lasers.push({ group, life: 0.12 });
	art.effect("spark", ox + dir.x * length, oy + dir.y * length, 0xffd272);
}
function placeBomb() {
	if (bombCooldown > 0) return;
	if (charges <= 0) {
		toast("NO CHARGES", "A green service pad will restock you.", 2);
		sound.play("fail");
		return;
	}
	const p = playerBody.translation();
	charges--;
	statistics.blasts++;
	bombCooldown = 0.5;
	sound.play("bomb");
	const g = new THREE.Group(),
		sticks = new THREE.Mesh(
			new THREE.BoxGeometry(0.48, 0.58, 0.32),
			makeMat(0xf27344),
		),
		cap = new THREE.Mesh(
			new THREE.BoxGeometry(0.52, 0.1, 0.36),
			makeMat(0xffd56b),
		);
	g.add(sticks);
	cap.position.y = 0.23;
	g.add(cap);
	const light = new THREE.Mesh(
		new THREE.SphereGeometry(0.09, 6, 4),
		new THREE.MeshBasicMaterial({ color: 0xfff1ab }),
	);
	light.position.set(0, 0.38, 0.2);
	g.add(light);
	g.position.set(p.x, p.y - 0.3, 0);
	objects.add(g);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(p.x, p.y - 0.25, 0)
			.lockRotations()
			.setCcdEnabled(true),
	);
	body.setEnabledTranslations(true, true, false, true);
	world.createCollider(
		RAPIER.ColliderDesc.ball(0.2)
			.setCollisionGroups(0x00040001)
			.setRestitution(0.1)
			.setFriction(0.8),
		body,
	);
	body.setLinvel({ x: 0, y: -1, z: 0 }, true);
	bombs.push({ group: g, body, fuse: 1.5, light });
	toast("CHARGE LIVE!", "Clear the blast radius.", 1.5);
}
function explodeBomb(b) {
	const p = b.body.translation();
	art.effect("explosion", p.x, p.y, 0xffa54e);
	sound.play("explode");
	shake = 1;
	world.removeRigidBody(b.body);
	for (const barrier of barriers) {
		if (barrier.broken) continue;
		const dx = Math.max(0, Math.abs(p.x - barrier.x) - barrier.w / 2),
			dy = Math.max(0, Math.abs(p.y - barrier.y) - barrier.h / 2);
		if (Math.hypot(dx, dy) < tuning.bombRadius) destroyBarrier(barrier);
	}
	for (const e of enemies)
		if (e.alive && dist(p, e) < tuning.bombRadius + 1) killEnemy(e);
	if (dist(p, playerBody.translation()) < tuning.bombRadius * 0.82)
		hurt(1, "blast");
	const ring = new THREE.Mesh(
		new THREE.RingGeometry(0.92, 1, 48),
		new THREE.MeshBasicMaterial({
			color: 0xffce6c,
			transparent: true,
			opacity: 0.8,
			side: THREE.DoubleSide,
		}),
	);
	ring.position.set(p.x, p.y, 1.7);
	objects.add(ring);
	lasers.push({ group: ring, life: 0.45, ring: true });
	disposeObject(b.group);
}
function disposeObject(obj) {
	objects.remove(obj);
	obj.traverse((o) => {
		if (o.isMesh) {
			o.geometry?.dispose();
			if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
			else o.material?.dispose();
		}
	});
}
function scan() {
	if (scanCooldown > 0) return;
	scanTimer = 5;
	scanCooldown = 7;
	sound.play("checkpoint");
	toast("SIGNALS FOUND", "Gold: miners  •  green: service pads", 2);
}
function nextSector() {
	if (stageChanging || mode === "attract") return;
	stageChanging = true;
	score += Math.max(100, Math.round(500 - stageTimer));
	sound.play("checkpoint");
	if (sector === 2) {
		endRun(true);
		return;
	}
	const next = sector + 1;
	$("transition-text").innerHTML =
		`<small>RESCUE SECTOR 0${next + 1}</small>${LEVELS[next].briefing.replace("\n", "<br>")}`;
	$("sector-transition").style.opacity = 1;
	transitionTimeout = setTimeout(() => {
		loadLevel(next);
		stageChanging = false;
		show(null);
		$("sector-transition").style.opacity = 0;
		toast(LEVELS[next].name.toUpperCase(), LEVELS[next].hint, 5);
	}, 1300);
}
function endRun(success, timed = false) {
	if (mode !== "playing") return;
	score = Math.round(
		score +
			(success ? lives * 500 + Math.max(0, Math.round(1500 - elapsed)) : 0),
	);
	lastSuccess = success;
	network.finish({ ...netState(), success });
	mode = "result";
	show("result");
	sound.play(success ? "win" : "fail");
	sound.voice(success ? "rescue" : "hurt");
	$("result-eyebrow").textContent = training
		? "TRAINING SHIFT COMPLETE"
		: success
			? "SHIFT COMPLETE"
			: timed
				? "SHIFT WHISTLE"
				: "END OF SHIFT";
	$("result-title").textContent = success
		? "Everybody’s coming home."
		: timed
			? "Tools down, pilot."
			: "Even heroes need a hand.";
	$("result-score").textContent = score.toString().padStart(6, "0");
	$("result-copy").textContent = success
		? "Six helmets. Six smiles. One well-earned break."
		: `${rescued} of 6 miners made it out. The rescue division has your back.`;
	const bestKey = "blast-shift-best";
	let best = 0;
	try {
		best = Number(localStorage.getItem(bestKey) || 0);
		if (!training && score > best) {
			best = score;
			localStorage.setItem(bestKey, String(score));
		}
	} catch {}
	$("result-stats").innerHTML = "";
	for (const [label, val] of [
		["Miners rescued", `${rescued} / 6`],
		["Shift time", fmtTime(elapsed)],
		["Crystal samples", `${statistics.crystals} / 30`],
		["Best shift", String(best).padStart(6, "0")],
	]) {
		const row = document.createElement("div");
		row.className = "statline";
		const span = document.createElement("span"),
			b = document.createElement("b");
		span.textContent = label;
		b.textContent = val;
		row.append(span, b);
		$("result-stats").append(row);
	}
	updateRaceResults();
	$("result")
		.querySelectorAll("button")
		.forEach((b) => (b.disabled = network.active));
	$("map-wrap").classList.add("hidden");
}
function updateRaceResults() {
	$("race-results")?.remove();
	if (network.active || !network.started) return;
	const block = document.createElement("div");
	block.id = "race-results";
	block.className = "smallprint";
	block.style.marginTop = "20px";
	if (!network.remoteCount) {
		block.textContent = "RACE COMPLETE · The other pilot disconnected.";
		$("result-stats").append(block);
		return;
	}
	const rivals = [...network.remote.values()],
		allDone = rivals.every((r) => r.finished);
	if (!allDone) {
		block.textContent = "RACE STILL RUNNING · Waiting for the other pilots.";
	} else {
		const entrants = [
			{ name: "You", success: lastSuccess, state: { time: elapsed, score } },
			...rivals,
		];
		entrants.sort((a, b) =>
			a.success !== b.success
				? a.success
					? -1
					: 1
				: a.success
					? a.state.time - b.state.time
					: b.state.score - a.state.score,
		);
		block.textContent = `RESCUE RACE · ${entrants[0].name === "You" ? "YOU LED THE RESCUE" : entrants[0].name + " LED THE RESCUE"}`;
	}
	$("result-stats").append(block);
}
function receiveGhost(state, id, meta) {
	let ghost = ghosts.get(id);
	if (!ghost) {
		const pilot = art.createPilot(new THREE.Color(meta.color).getHex());
		ghost = { ...pilot, state, name: meta.name };
		ghost.group.traverse((o) => {
			if (o.isMesh && o.material) {
				o.material = o.material.clone();
				o.material.transparent = true;
				o.material.opacity = 0.42;
				o.material.depthWrite = false;
			}
		});
		scene.add(ghost.group);
		ghost.group.position.set(state.x, state.y, -0.3);
		ghosts.set(id, ghost);
	}
	ghost.state = state;
	ghost.name = meta.name;
}
function removeGhost(id) {
	const g = ghosts.get(id);
	if (g) art.disposeObject(g.group);
	ghosts.delete(id);
	if (mode === "result") updateRaceResults();
}

function simulate(dt) {
	if (mode !== "playing" && mode !== "attract") return;
	if (stageChanging) return;
	if (mode === "playing" && menu && !network.active) return;
	if (network.started && !network.canPlay) return;
	elapsed += dt;
	stageTimer += dt;
	hurtBlink = Math.max(0, hurtBlink - dt);
	invuln = Math.max(0, invuln - dt);
	fireCooldown = Math.max(0, fireCooldown - dt);
	bombCooldown = Math.max(0, bombCooldown - dt);
	scanCooldown = Math.max(0, scanCooldown - dt);
	scanTimer = Math.max(0, scanTimer - dt);
	dockCooldown = Math.max(0, dockCooldown - dt);
	if (mode === "attract") updateAttract(dt);
	let p = playerBody.translation(),
		v = playerBody.linvel();
	grounded =
		!!world.castRay(
			new RAPIER.Ray({ x: p.x, y: p.y, z: 0 }, { x: 0, y: -1, z: 0 }),
			0.87,
			true,
			undefined,
			undefined,
			undefined,
			playerBody,
		) && v.y < 0.6;
	if (mode === "playing") {
		if (input.move > 0.1) facing = 1;
		else if (input.move < -0.1) facing = -1;
		let vx = lerp(v.x, input.move * 6.5, Math.min(1, dt * (grounded ? 15 : 8))),
			vy = v.y;
		flying = input.fly > 0.1 && (fuel > 0 || infiniteFuel);
		if (flying) {
			vy = Math.min(
				tuning.flightSpeed,
				vy + (tuning.gravity + 20) * input.fly * dt,
			);
			if (!infiniteFuel)
				fuel = Math.max(0, fuel - tuning.fuelDrain * dt * input.fly);
		}
		if (input.down > 0.1) vy = Math.max(-11, vy - 15 * dt);
		const flooded = LEVELS[sector].hazards.some(
			(h) =>
				h.type === "water" &&
				Math.abs(p.x - h.x) < h.w / 2 + 0.2 &&
				p.y < h.y + h.h / 2 + 0.45,
		);
		if (grounded && !flying && !flooded) fuel = Math.min(100, fuel + 21 * dt);
		if (infiniteFuel) fuel = 100;
		if (fuel < 0.1 && !fuelEmpty) {
			fuelEmpty = true;
			toast("ROTOR POWER EMPTY", "Land on a ledge to recharge.", 2);
		}
		if (fuel > 20) fuelEmpty = false;
		playerBody.setLinvel({ x: vx, y: Math.max(-11, vy), z: 0 }, true);
		if (input.fire) fireLaser();
		if (input.bomb) {
			placeBomb();
			input.bomb = false;
		}
		if (input.scan) {
			scan();
			input.scan = false;
		}
	}
	world.timestep = dt;
	world.step();
	p = playerBody.translation();
	lastPosition = { x: p.x, y: p.y };
	for (const e of enemies) {
		if (!e.alive) continue;
		e.phase += dt * tuning.enemySpeed;
		e.x =
			e.originX +
			Math.sin(e.phase * (e.type === "spider" ? 1.05 : 0.7)) * e.range;
		e.y = e.originY + (e.type === "spider" ? 0 : Math.sin(e.phase * 1.7) * 1.2);
		e.group.position.set(e.x, e.y, 0);
		e.group.scale.x = Math.cos(e.phase * 0.7) < 0 ? -1 : 1;
		if (dist(p, e) < (e.type === "spider" ? 1.0 : 1.05)) hurt(1, "enemy");
	}
	for (const h of LEVELS[sector].hazards) {
		const inside =
			Math.abs(p.x - h.x) < h.w / 2 + 0.2 &&
			p.y < (h.type === "vent" ? h.y + 2.5 : h.y + h.h / 2 + 0.45) &&
			p.y > h.y - h.h / 2 - 0.7;
		if (!inside) continue;
		if (h.type === "lava") hurt(1, "lava");
		if (
			h.type === "vent" &&
			Math.sin(stageTimer * 1.15) > -0.05 &&
			p.y < h.y + 2.5
		)
			hurt(1, "vent");
		if (h.type === "water") {
			fuel = Math.max(0, fuel - dt * 7);
			const vel = playerBody.linvel();
			playerBody.setLinvel({ x: vel.x * 0.96, y: vel.y - 3 * dt, z: 0 }, true);
			if (fuel <= 0 && p.y < 2.3) hurt(1, "water");
		}
	}
	for (const b of bombs) {
		b.fuse -= dt;
		const bp = b.body.translation();
		b.group.position.set(bp.x, bp.y, 0);
		b.light.visible = Math.sin(b.fuse * 35) > 0;
		if (b.fuse <= 0) explodeBomb(b);
	}
	bombs = bombs.filter((b) => b.fuse > 0);
	for (const m of miners) {
		if (!m.rescued && dist(p, m) < 1.65) rescueMiner(m);
		if (m.rescued && m.beam > 0) {
			m.beam -= dt;
			m.group.position.y += dt * (4 + (1.6 - m.beam) * 5);
			m.group.scale.multiplyScalar(1 - dt * 0.6);
			if (m.beam <= 0) m.group.visible = false;
		}
	}
	for (const c of crystals) {
		if (c.collected) continue;
		c.group.rotation.y += dt * 1.5;
		c.group.position.y = c.y + Math.sin(time * 2 + c.x) * 0.16;
		if (dist(p, c) < 1) {
			c.collected = true;
			c.group.visible = false;
			score += 75;
			statistics.crystals++;
			sound.play("collect");
			art.effect("spark", c.x, c.y, 0xa3efcf);
		}
	}
	for (const d of LEVELS[sector].docks) {
		if (
			Math.abs(p.x - d.x) < 1.25 &&
			Math.abs(p.y - (d.y + 0.75)) < 1.35 &&
			grounded &&
			dockCooldown <= 0
		) {
			const changed = dist(checkpoint, { x: d.x, y: d.y + 1 }) > 2;
			const needed = health < 3 || charges < 3 || fuel < 99;
			checkpoint = { x: d.x, y: d.y + 1 };
			refill();
			dockCooldown = 3;
			if (changed || needed) {
				sound.play("checkpoint");
				art.effect("rescue", d.x, d.y + 1, 0x89e6bf);
				toast(
					"SERVICE PAD • ALL SYSTEMS GREEN",
					"Checkpoint set. Suit repaired. Charges restocked.",
					2.5,
				);
			}
		}
	}
	const exit = LEVELS[sector].exit;
	if (
		mode === "playing" &&
		miners.every((m) => m.rescued) &&
		dist(p, exit) < 1.8
	)
		nextSector();
	if (p.y < -0.8 || !Number.isFinite(p.x)) teleport(checkpoint.x, checkpoint.y);
	if (mode === "playing") contextHint(p);
}
const demoPath = [
	[0, 4, 25.3],
	[2, 18, 25],
	[5, 16, 12],
	[7, 16, 2.6],
	[8, 19, 6],
	[10, 10, 2.2],
	[12, 7, 2.2],
	[14, 16, 3],
	[17, 16, 17],
	[19, 31, 15],
	[21, 40.5, 15],
	[23, 36, 18],
	[26, 49, 15],
	[28, 37, 17],
	[30, 37, 26],
	[33, 50, 25.5],
	[35, 50, 25.5],
];
let demoBombA = false,
	demoBombB = false;
function updateAttract(dt) {
	attractTime += dt;
	const t = stageTimer;
	if (t < 1) {
		demoBombA = demoBombB = false;
	}
	if (t > 35) {
		if (sector === 2) {
			rescued = 0;
			score = 0;
		}
		loadLevel((sector + 1) % 3);
		return;
	}
	let i = 0;
	while (i < demoPath.length - 2 && demoPath[i + 1][0] < t) i++;
	const a = demoPath[i],
		b = demoPath[i + 1],
		f = clamp((t - a[0]) / (b[0] - a[0]), 0, 1),
		s = f * f * (3 - 2 * f);
	teleport(lerp(a[1], b[1], s), lerp(a[2], b[2], s));
	facing = b[1] >= a[1] ? 1 : -1;
	flying = true;
	fuel = 100;
	charges = 3;
	if (t > 6.7 && !demoBombA) {
		teleport(16, 2.6);
		placeBomb();
		demoBombA = true;
	}
	if (t > 20.6 && !demoBombB) {
		teleport(40.5, 15);
		placeBomb();
		demoBombB = true;
	}
	let target = enemies.find(
		(e) => e.alive && dist(e, playerBody.translation()) < 14,
	);
	if (target) {
		const p = playerBody.translation(),
			l = dist(target, p);
		aim = { x: (target.x - p.x) / l, y: (target.y - p.y) / l };
		fireLaser();
	}
	if (t > 9 && !barriers[0].broken) destroyBarrier(barriers[0]);
	if (t > 24 && !barriers[1].broken) destroyBarrier(barriers[1]);
}
function contextHint(p) {
	let text = "";
	const nearBarrier = barriers.find(
		(b) =>
			!b.broken && Math.abs(p.x - b.x) < 5 && Math.abs(p.y - b.y) < b.h / 2 + 1,
	);
	const nearDock = LEVELS[sector].docks.find(
		(d) => Math.abs(p.x - d.x) < 3 && Math.abs(p.y - d.y) < 3,
	);
	const nearMiner = miners.find((m) => !m.rescued && dist(p, m) < 6);
	if (nearBarrier) {
		const button =
			lastInput === "pad"
				? settings.glyphs === "ps"
					? "R1 / ○"
					: "RB / B"
				: lastInput === "touch"
					? "CHARGE"
					: "E / RIGHT CLICK";
		text = `${button} · Drop a charge near the orange bulkhead. Back away!`;
	} else if (nearDock)
		text = "GREEN SERVICE PAD · Land for power, repairs & charges.";
	else if (nearMiner)
		text = "MINER SIGNAL · Get close to attach the rescue tether.";
	else if (fuel < 25) text = "LOW ROTOR POWER · Land on a ledge to recharge.";
	else if (stageTimer < 10) text = LEVELS[sector].hint;
	else if (miners.every((m) => m.rescued))
		text = "SECTOR CLEAR · Head to the striped lift in the upper right.";
	$("context").textContent = text;
	$("context").style.opacity = text ? 1 : 0;
	$("touch-action").classList.toggle(
		"available",
		!!nearBarrier && isTouch && !menu && charges > 0,
	);
}
function updateHUD() {
	$("sector-number").textContent =
		`${training ? "TRAINING • " : ""}RESCUE SECTOR 0${sector + 1} / 03`;
	$("sector-name").textContent = LEVELS[sector].name;
	$("score").textContent = Math.round(score).toString().padStart(6, "0");
	$("timer").textContent = fmtTime(elapsed);
	$("hearts").textContent = Array.from({ length: 3 }, (_, i) =>
		health > i ? "♥" : "♡",
	).join(" ");
	$("fuel-bar").style.width = `${fuel}%`;
	$("fuel-bar").style.background = fuel < 25 ? "#ff754e" : "#ffc652";
	$("fuel-number").textContent = `${Math.round(fuel)}%`;
	$("bomb-count").textContent =
		`${"▰ ".repeat(charges)}${"▱ ".repeat(3 - charges)} CHARGES`;
	$("lives").textContent = `0${lives} SUITS`;
	$("rescue-dots").innerHTML =
		Array.from(
			{ length: 6 },
			(_, i) => `<i class="${i < rescued ? "on" : ""}"></i>`,
		).join("") + `<span style="margin-left:6px">${rescued}/6 HOME</span>`;
	const p = playerBody.translation(),
		target = miners.find((m) => !m.rescued) || LEVELS[sector].exit,
		dx = target.x - p.x,
		dy = target.y - p.y;
	const arrow =
		Math.abs(dx) > Math.abs(dy) * 1.8
			? dx > 0
				? "→"
				: "←"
			: Math.abs(dy) > Math.abs(dx) * 1.8
				? dy > 0
					? "↑"
					: "↓"
				: dx > 0
					? dy > 0
						? "↗"
						: "↘"
					: dy > 0
						? "↖"
						: "↙";
	$("objective").textContent =
		`${arrow} ${miners.some((m) => !m.rescued) ? "MINER SIGNAL" : "EXTRACTION LIFT"} · ${Math.round(dist(p, target))}m`;
	$("ghosts").textContent = network.remoteCount
		? [...network.remote.values()]
				.map(
					(r) =>
						`${r.name || "Rival"} · ${r.state?.rescued || 0}/6${r.finished ? " HOME" : ""}`,
				)
				.join("  /  ")
		: "";
	if (toastTime > 0) {
		toastTime = Math.max(0, toastTime - 0.05);
		if (toastTime < 0.4) $("toast").style.opacity = toastTime / 0.4;
	} else $("toast").style.opacity = 0;
	const mapVisible =
		(scanTimer > 0 || lastInput === "touch") &&
		!menu &&
		(mode === "playing" || mode === "attract");
	$("map-wrap").classList.toggle(
		"hidden",
		!mapVisible || lastInput === "touch",
	);
	if (mapVisible) updateMap();
	$("touch-hint").classList.toggle(
		"hidden",
		lastInput !== "touch" || elapsed > 10 || !!menu,
	);
}
function updateMap() {
	const c = ctxMap,
		W = 300,
		H = 175,
		sx = W / 56,
		sy = H / 32;
	const x = (v) => (v + 1) * sx,
		y = (v) => H - (v + 1) * sy;
	c.clearRect(0, 0, W, H);
	c.fillStyle = "#09232c";
	c.fillRect(0, 0, W, H);
	for (const r of LEVELS[sector].solids) {
		c.fillStyle = "#385960";
		c.fillRect(x(r.x - r.w / 2), y(r.y + r.h / 2), r.w * sx, r.h * sy);
	}
	for (const h of LEVELS[sector].hazards) {
		c.fillStyle = h.type === "water" ? "#4a9ba7" : "#f4774d";
		c.fillRect(x(h.x - h.w / 2), y(h.y + h.h / 2), h.w * sx, h.h * sy);
	}
	for (const b of barriers)
		if (!b.broken) {
			c.fillStyle = "#f0a245";
			c.fillRect(x(b.x - b.w / 2), y(b.y + b.h / 2), b.w * sx, b.h * sy);
		}
	for (const d of LEVELS[sector].docks) {
		c.fillStyle = "#80dabb";
		c.fillRect(x(d.x) - 4, y(d.y) - 2, 8, 4);
	}
	for (const m of miners)
		if (!m.rescued) {
			c.fillStyle = "#ffd35d";
			c.beginPath();
			c.arc(x(m.x), y(m.y), 4, 0, Math.PI * 2);
			c.fill();
		}
	const e = LEVELS[sector].exit;
	c.strokeStyle = "#9bdbb8";
	c.lineWidth = 2;
	c.strokeRect(x(e.x) - 5, y(e.y) - 6, 10, 12);
	const p = playerBody?.translation() || LEVELS[sector].start;
	c.fillStyle = "#fff9df";
	c.beginPath();
	c.arc(x(p.x), y(p.y), 3.5, 0, Math.PI * 2);
	c.fill();
	c.strokeStyle = "#fff9df";
	c.strokeRect(x(p.x) - 6, y(p.y) - 6, 12, 12);
}
function animateVisuals(dt) {
	if (!art) return;
	art.update(dt, time, stageTimer);
	titlePilot.mixer.update(dt);
	titlePilot.group.position.y = 18 + Math.sin(time * 0.9) * 0.28;
	titlePilot.body.rotation.z = Math.sin(time * 0.7) * 0.035;
	titlePilot.flame.visible = true;
	if (player) {
		player.mixer.timeScale = flying ? 1.5 : 0.3;
		player.mixer.update(dt);
		const p = playerBody.translation();
		player.group.position.set(p.x, p.y, 0);
		player.group.scale.x = facing;
		player.body.rotation.z = lerp(
			player.body.rotation.z,
			-playerBody.linvel().x * 0.025,
			Math.min(1, dt * 8),
		);
		player.flame.visible = flying;
		player.flame.scale.y = 0.75 + Math.sin(time * 45) * 0.25;
		player.group.visible =
			mode !== "title" &&
			(hurtBlink <= 0 || Math.floor(time * 12) % 2 === 0 || mode === "attract");
	}
	for (const m of miners) m.mixer.update(dt);
	for (const e of enemies) if (e.alive) e.mixer.update(dt);
	for (const l of lasers) {
		l.life -= dt;
		if (l.ring) {
			l.group.scale.setScalar((0.45 - l.life) * tuning.bombRadius * 2.4);
			l.group.material.opacity = Math.max(0, l.life * 1.5);
		} else
			l.group.children.forEach(
				(o) => (o.material.opacity = Math.max(0, l.life * 7)),
			);
		if (l.life <= 0) disposeObject(l.group);
	}
	lasers = lasers.filter((l) => l.life > 0);
	for (const ghost of ghosts.values()) {
		const s = ghost.state;
		ghost.group.visible =
			s.sector === sector && (mode === "playing" || mode === "attract");
		if (ghost.group.visible) {
			ghost.group.position.x = lerp(
				ghost.group.position.x,
				s.x,
				Math.min(1, dt * 12),
			);
			ghost.group.position.y = lerp(
				ghost.group.position.y,
				s.y,
				Math.min(1, dt * 12),
			);
			ghost.group.scale.x = s.facing;
			ghost.flame.visible = s.flying;
			ghost.mixer.update(dt);
		}
	}
	if (physicsDebug && world) {
		const buffers = world.debugRender();
		if (!debugLines) {
			debugLines = new THREE.LineSegments(
				new THREE.BufferGeometry(),
				new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
			);
			debugLines.renderOrder = 10;
			scene.add(debugLines);
		}
		debugLines.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(buffers.vertices, 3),
		);
		debugLines.geometry.setAttribute(
			"color",
			new THREE.BufferAttribute(buffers.colors, 4),
		);
		debugLines.visible = true;
	}
}
function resize() {
	const w = innerWidth,
		h = innerHeight;
	renderer?.setSize(w, h);
	const vH = w / h < 1 ? 23 : 22;
	camera.left = (-vH * w) / h / 2;
	camera.right = (vH * w) / h / 2;
	camera.top = vH / 2;
	camera.bottom = -vH / 2;
	camera.updateProjectionMatrix();
}
function updateCamera(dt) {
	if (mode === "title") cameraTarget.set(21, 17.2, 55);
	else if (playerBody) {
		const p = playerBody.translation(),
			halfW = (camera.right - camera.left) / 2;
		cameraTarget.set(
			clamp(p.x + facing * 2.2, Math.min(halfW, 27), Math.max(54 - halfW, 27)),
			clamp(p.y + 1.4, 11, 19),
			55,
		);
	}
	const smoothing = 1 - Math.exp(-dt * 4.2);
	camera.position.x = lerp(camera.position.x, cameraTarget.x, smoothing);
	camera.position.y = lerp(camera.position.y, cameraTarget.y, smoothing);
	shake = Math.max(0, shake - dt * 2);
	const amount = ((shake * settings.shake) / 100) * 0.28;
	const offsetX = Math.sin(time * 109) * amount,
		offsetY = Math.cos(time * 133) * amount;
	camera.position.z = 55;
	camera.position.x += offsetX;
	camera.position.y += offsetY;
	camera.lookAt(camera.position.x, camera.position.y, 0);
}
async function frame(stamp) {
	requestAnimationFrame(frame);
	if (!ready || renderBusy) return;
	let dt = Math.min(0.05, (stamp - lastFrame) / 1000 || 0.016);
	lastFrame = stamp;
	time += dt;
	frameCount++;
	pollInput();
	if (mode === "title" && menu === "title" && stamp - idleAt > 10000)
		startRun(true);
	if (
		!manualClock &&
		(mode === "playing" || mode === "attract") &&
		(!menu || network.active || mode === "attract")
	) {
		accumulator += dt;
		let steps = 0;
		while (accumulator >= 1 / 60 && steps < 5) {
			simulate(1 / 60);
			accumulator -= 1 / 60;
			steps++;
		}
	}
	if (network.started && mode === "playing") {
		network.update(dt, netState());
		if (network.countdown > 0) {
			if (menu !== "hub-wait") show("hub-wait");
			$("hub-countdown").textContent = String(
				Math.ceil(network.countdown / 1000),
			);
		} else if (menu === "hub-wait") {
			$("hub-countdown").textContent = "";
			show(null);
			sound.unlock();
		}
	}
	animateVisuals(dt);
	updateCamera(dt);
	if (frameCount % 3 === 0 && (mode === "playing" || mode === "attract"))
		updateHUD();
	if (mode !== "hub-ended")
		sound.update(dt, {
			flying: flying && (mode === "playing" || mode === "attract") && !menu,
			danger: health <= 1,
			sector,
		});
	renderBusy = true;
	try {
		await renderer.renderAsync(scene, camera);
	} catch (e) {
		testErrors.push(e.message);
		console.error(e);
		ready = false;
		$("load-status").textContent =
			"The renderer could not finish this frame. Reload to try again.";
		show("boot");
	} finally {
		renderBusy = false;
	}
}

async function makeRenderer(compat = false) {
	renderer = new THREE.WebGPURenderer({
		canvas,
		antialias: true,
		alpha: false,
		forceWebGL: compat,
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.08;
	try {
		await renderer.init();
	} catch (error) {
		if (compat) throw error;
		rendererIssues.push(String(error));
		await fallbackRenderer();
		return;
	}
	rendererName = renderer.backend.isWebGPUBackend
		? "WebGPU"
		: "WebGL2 compatibility";
}
async function fallbackRenderer() {
	// A partially created native pipeline can leave disposal callbacks invalid.
	// Retire that device and its scene together, then create fresh backend resources.
	try {
		renderer?.backend?.device?.destroy();
	} catch {}
	const replacement = document.createElement("canvas");
	replacement.id = "game";
	replacement.setAttribute("aria-label", "H.E.R.O. Blast Shift game world");
	canvas.replaceWith(replacement);
	canvas = replacement;
	await makeRenderer(true);
	resize();
	if (art) {
		playerBody = null;
		world?.free();
		world = null;
		player = null;
		scene = new THREE.Scene();
		objects = new THREE.Group();
		scene.add(objects);
		art = createArt(scene);
		titlePilot = art.createPilot(0xffbd52);
		titlePilot.group.position.set(29.2, 18, 3);
		titlePilot.group.scale.setScalar(3.3);
		scene.add(titlePilot.group);
		loadLevel(0);
	}
}
async function warmRenderer() {
	let timeout;
	try {
		await Promise.race([
			renderer
				.compileAsync(scene, camera)
				.then(() => renderer.renderAsync(scene, camera)),
			new Promise((_, reject) => {
				gpuBootReject = reject;
				timeout = setTimeout(
					() =>
						reject(
							new Error(
								"Renderer pipeline initialization exceeded its startup window.",
							),
						),
					9500,
				);
			}),
		]);
	} catch (error) {
		if (!renderer.backend.isWebGPUBackend) throw error;
		rendererIssues.push(String(error));
		gpuBootReject = null;
		await fallbackRenderer();
		await renderer.compileAsync(scene, camera);
		await renderer.renderAsync(scene, camera);
	} finally {
		clearTimeout(timeout);
		gpuBootReject = null;
	}
}

async function boot() {
	try {
		initSettings();
		fillAbout();
		updatePrompts();
		await network.init();
		$("load-status").textContent = "Assembling rescue equipment…";
		await RAPIER.init();
		scene = new THREE.Scene();
		scene.add(objects);
		camera = new THREE.OrthographicCamera(-20, 20, 11, -11, 0.1, 120);
		camera.position.set(21, 17.2, 55);
		camera.lookAt(21, 17.2, 0);
		$("load-status").textContent = "Lighting the mine…";
		await makeRenderer(new URLSearchParams(location.search).has("compat"));
		art = createArt(scene);
		titlePilot = art.createPilot(0xffbd52);
		titlePilot.group.position.set(29.2, 18, 3);
		titlePilot.group.scale.setScalar(3.3);
		scene.add(titlePilot.group);
		loadLevel(0);
		resize();
		addEventListener("resize", resize);
		$("load-status").textContent = "Spinning up the rotors…";
		await warmRenderer();
		ready = true;
		lastFrame = performance.now();
		if (network.active) {
			mode = "hub-wait";
			titlePilot.group.visible = false;
			player.group.visible = true;
			show("hub-wait");
			network.ready();
		} else showTitle();
		window.__gameReady = true;
		requestAnimationFrame(frame);
	} catch (e) {
		testErrors.push(e.stack || e.message);
		console.error(e);
		$("load-status").textContent = `Unable to start: ${e.message}`;
		globalThis.AIHub?.active && globalThis.AIHub.fail(e.message);
	}
}
window.addEventListener("error", (e) => testErrors.push(e.message));
window.addEventListener("unhandledrejection", (e) => {
	const message = String(e.reason);
	if (
		message.includes("GPUPipelineError") ||
		message.includes("valid external Instance")
	) {
		e.preventDefault();
		e.stopImmediatePropagation();
		rendererIssues.push(message);
		gpuBootReject?.(new Error(message));
	} else testErrors.push(message);
});
window.__game = {
	get state() {
		return {
			ready,
			mode,
			menu,
			sector,
			elapsed,
			stageTimer,
			stageChanging,
			score,
			rescued,
			health,
			fuel,
			charges,
			lives,
			grounded,
			flying,
			training,
			god,
			infiniteFuel,
			settings: { ...settings },
			tuning: { ...tuning },
			position: playerBody ? { ...playerBody.translation() } : null,
			velocity: playerBody ? { ...playerBody.linvel() } : null,
			barriers: barriers.map((b) => ({
				id: b.id,
				broken: b.broken,
				x: b.x,
				y: b.y,
			})),
			miners: miners.map((m) => ({
				name: m.name,
				rescued: m.rescued,
				x: m.x,
				y: m.y,
			})),
			enemies: enemies.map((e) => ({
				alive: e.alive,
				x: e.x,
				y: e.y,
				type: e.type,
			})),
			bombs: bombs.length,
			statistics: { ...statistics },
			renderer: rendererName,
			rendererRecovery: [...rendererIssues],
			frames: frameCount,
			errors: [...testErrors],
			network: network.diagnostics(),
			audio: sound.diagnostics(),
		};
	},
	start: () => startRun(),
	title: showTitle,
	pause,
	resume,
	action,
	teleport,
	tick: (seconds) => {
		const steps = Math.ceil(seconds * 60);
		for (let i = 0; i < steps; i++) {
			simulate(1 / 60);
			time += 1 / 60;
			animateVisuals(1 / 60);
		}
		updateHUD();
		return window.__game.state;
	},
	setInput: (value) => Object.assign(input, value),
	setAim: (x, y) => {
		const l = Math.hypot(x, y) || 1;
		aim = { x: x / l, y: y / l };
	},
	set: (key, value) => {
		if (key === "manualClock") manualClock = value;
		if (key === "fuel") fuel = value;
		if (key === "health") health = value;
		if (key === "lives") lives = value;
		if (key === "god") god = value;
		if (key === "training") training = value;
		if (key === "idle") idleAt = performance.now() - value;
		if (key === "charges") charges = value;
	},
	shoot: fireLaser,
	charge: placeBomb,
	scan,
	hurt,
	loadLevel,
	renderAudioTest,
	network,
	sound,
	poll: pollInput,
	get levels() {
		return LEVELS;
	},
	get metadata() {
		return META;
	},
	get sceneStats() {
		let meshes = 0;
		scene.traverse((o) => {
			if (o.isMesh) meshes++;
		});
		return {
			meshes,
			drawCalls: renderer.info.render.calls,
			renderer: rendererName,
		};
	},
};
boot();
