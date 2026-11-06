import * as THREE from "three";
import RAPIER from "https://esm.sh/@dimforge/rapier3d-compat@0.19.3";
import { createArt } from "./art.js";
import { AudioSystem } from "./audio.js";
import { FestivalNetwork } from "./network.js";

const $ = (id) => document.getElementById(id),
	TAU = Math.PI * 2,
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const EVENTS = [
	{
		id: "skate",
		name: "HALF-PIPE HEAT",
		short: "Half-pipe",
		tag: "Concrete. Courage. Questionable shorts.",
		goal: "Pump the bowl. Pop at the lip. Bring it home.",
		guide: [
			["MOVE", "Build speed through the bowl. Hold down to pump."],
			["POP", "Jump near a high wall for the biggest air."],
			["STYLE", "Grab or flip in the air. Release to level out."],
		],
		gold: 3500,
		silver: 1800,
		bronze: 650,
	},
	{
		id: "surf",
		name: "SALTWATER SWING",
		short: "Surfing",
		tag: "The forecast calls for absolutely tubular.",
		goal: "Follow the golden pocket. Carve, pop, repeat.",
		guide: [
			["CARVE", "Steer left and right to follow the golden wave pocket."],
			["SCORE", "Stay in the pocket to earn flow points. Grab for a cutback."],
			["AIR", "Pop off the wave, then grab or flip. Watch the red buoy."],
		],
		gold: 4200,
		silver: 2200,
		bronze: 800,
	},
	{
		id: "bmx",
		name: "BOARDWALK BMX",
		short: "BMX",
		tag: "Two wheels. Zero sensible decisions.",
		goal: "Pedal the ramps. Clear the cones. Land your style.",
		guide: [
			["PEDAL", "Hold right to sprint. Left slows you down."],
			["POP", "Jump at the ramp lip; jump over orange cones."],
			["STYLE", "Tailwhip or barspin in the air. Release before landing."],
		],
		gold: 3500,
		silver: 1800,
		bronze: 650,
	},
];
const DEFAULTS = {
	speed: 1,
	gravity: 18,
	jump: 8,
	assist: 0.78,
	duration: 60,
	timeScale: 1,
};
let config = { ...DEFAULTS },
	audio = new AudioSystem(),
	world,
	body,
	art,
	renderer,
	ready = false;
let state = {
	screen: "loading",
	event: "skate",
	eventIndex: 0,
	time: 0,
	elapsed: 0,
	airborne: false,
	speed: 0,
	trick: "",
	crashed: false,
	total: 0,
	score: 0,
	pending: 0,
	mult: 1,
	rotation: 0,
	combo: [],
	bestCombo: 0,
	bails: 0,
	landings: 0,
	flow: 0,
	started: false,
};
let currentPlayer = 0,
	playerCount = 1,
	players = [],
	practice = false,
	attract = false,
	lastInput = performance.now(),
	inputKind = "keyboard",
	glyphs = "ps",
	soundOn = true,
	reduceMotion = false,
	bot = false,
	infinite = false,
	hubInfo = null,
	hubEnded = false,
	hubResult = false,
	hubStarting = false,
	network = null,
	networkScores = [],
	onlineWaiting = false;
let navTime = 0,
	eventElapsed = 0,
	crashTime = 0,
	lastGround = true,
	airTime = 0,
	lastTrick = -9,
	dir = 1,
	pipeSpeed = 9,
	targetX = 0,
	flowClock = 0,
	foamClock = 0,
	toastTime = 0,
	scoreFlash = 0,
	lastRender = 0,
	lastNetwork = 0,
	lookOffset = 0;
const keys = new Set(),
	pressed = new Set(),
	padPrev = [],
	touch = {
		active: false,
		x: 0,
		y: 0,
		startX: 0,
		startY: 0,
		moveX: 0,
		moveY: 0,
	},
	stats = { frames: 0, physicsSteps: 0, errors: [], bailReasons: [] };
let best = {};
try {
	best = JSON.parse(localStorage.getItem("californium-best") || "{}");
} catch {}
function persist() {
	if (!AIHub.active)
		try {
			localStorage.setItem("californium-best", JSON.stringify(best));
		} catch {}
}
function isPlay() {
	return state.screen === "playing";
}
function noteInput(kind = "keyboard") {
	if (hubEnded) return true;
	inputKind = kind;
	lastInput = performance.now();
	if (attract) {
		attract = false;
		bot = false;
		showTitle();
		return true;
	}
	updatePrompts();
	audio.unlock();
	return false;
}
function label(action) {
	const maps = {
		keyboard: {
			pop: "SPACE",
			grab: "J",
			flip: "K",
			pause: "ESC",
			move: "A D / ← →",
			pump: "S / ↓",
			accept: "ENTER",
		},
		ps: {
			pop: "✕",
			grab: "□",
			flip: "○",
			pause: "OPTIONS",
			move: "L STICK",
			pump: "L STICK ↓",
			accept: "✕",
		},
		xbox: {
			pop: "A",
			grab: "X",
			flip: "B",
			pause: "MENU",
			move: "L STICK",
			pump: "L STICK ↓",
			accept: "A",
		},
		touch: {
			pop: "TAP",
			grab: "AUTO",
			flip: "AUTO",
			pause: "Ⅱ",
			move: "DRAG",
			pump: "ASSIST",
			accept: "TAP",
		},
	};
	return maps[inputKind === "gamepad" ? glyphs : inputKind]?.[action] || action;
}
function updatePrompts() {
	document
		.querySelectorAll("[data-key]")
		.forEach((e) => (e.textContent = label(e.dataset.key)));
	document.body.dataset.input = inputKind;
	$("touch-pop").textContent = "POP";
}
function toast(text, kind = "") {
	$("toast").textContent = text;
	$("toast").className = "toast visible " + kind;
	toastTime = 3;
}
function visiblePanel(id) {
	document.querySelectorAll(".panel").forEach((e) => (e.hidden = e.id !== id));
	$("overlay").hidden = !id;
	$("hud").hidden = !isPlay();
	$("combo").hidden = !isPlay() || !state.pending;
	$("touch-pop").hidden = !isPlay() || inputKind !== "touch";
	$("attract").hidden = !attract;
	focusFirst();
}
function focusFirst() {
	const a = [
		...document.querySelectorAll(
			".panel:not([hidden]) button,.panel:not([hidden]) input",
		),
	].find((e) => !e.disabled);
	a?.focus({ preventScroll: true });
}
function setScreen(s, p) {
	state.screen = s;
	visiblePanel(p);
	updatePrompts();
}
function showTitle() {
	state.started = false;
	state.screen = "title";
	attract = false;
	state.crashed = false;
	art?.setEvent("skate");
	state.event = "skate";
	if (body) {
		body.setTranslation({ x: -2, y: 1, z: 0 }, true);
		body.setLinvel({ x: 0, y: 0, z: 0 }, true);
	}
	$("title-best").textContent = best.festival
		? `PERSONAL BEST  ${best.festival.toLocaleString()}`
		: "THREE EVENTS. ONE GOLDEN COAST.";
	setScreen("title", "title-panel");
	lastInput = performance.now();
}
function makePlayers() {
	players = Array.from({ length: playerCount }, (_, i) => ({
		name: network?.connected ? `RIDER ${network.me + 1}` : `RIDER ${i + 1}`,
		scores: [0, 0, 0],
		total: 0,
	}));
	currentPlayer = 0;
}
function beginFestival(single = -1) {
	if (AIHub.active && !hubStarting) return;
	practice = single >= 0;
	makePlayers();
	state.eventIndex = single >= 0 ? single : 0;
	showBrief();
}
function showBrief() {
	const e = EVENTS[state.eventIndex];
	state.event = e.id;
	art.setEvent(e.id);
	$("brief-num").textContent =
		`${practice ? "FREE SESSION" : `EVENT ${state.eventIndex + 1} / 3`}  ·  ${players[currentPlayer].name}`;
	$("brief-title").textContent = e.name;
	$("brief-tag").textContent = e.tag;
	$("brief-goal").textContent = e.goal;
	$("brief-guide").innerHTML = e.guide
		.map(
			([a, b], i) =>
				`<div class="guide-row"><b>0${i + 1}</b><div><strong>${a}</strong><p>${b}</p></div></div>`,
		)
		.join("");
	$("brief-medals").textContent =
		`BRONZE ${e.bronze}   /   SILVER ${e.silver}   /   GOLD ${e.gold}`;
	setScreen("brief", "brief-panel");
}
function height(x, id = state.event) {
	if (id === "skate") {
		const a = Math.max(0, Math.min(12, Math.abs(x)) - 4);
		return 4 * (a / 8) ** 2;
	}
	if (id === "bmx") {
		for (const c of [-9, 3, 15])
			if (x >= c - 3 && x <= c) return ((x - (c - 3)) / 3) * 3;
		return 0;
	}
	return 0.4 + 0.5 * Math.sin(x * 0.22 + state.elapsed * 1.8);
}
function buildPhysics() {
	if (world) world.free();
	world = new RAPIER.World({ x: 0, y: -config.gravity, z: 0 });
	world.timestep = 1 / 60;
	body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(-5, 3, 0)
			.lockRotations()
			.enabledTranslations(true, true, false)
			.setLinearDamping(0.03)
			.setCcdEnabled(true),
	);
	world.createCollider(
		RAPIER.ColliderDesc.ball(0.38).setFriction(0.02).setRestitution(0),
		body,
	);
	if (state.event !== "surf") {
		for (let x = -20; x < 20; x += 0.4) {
			const h1 = height(x),
				h2 = height(x + 0.4),
				a = Math.atan2(h2 - h1, 0.4),
				length = Math.hypot(0.4, h2 - h1);
			if (Math.abs(h2 - h1) > 1) continue;
			const ground = world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed()
					.setTranslation(x + 0.2, (h1 + h2) / 2 - 0.12, 0)
					.setRotation({ x: 0, y: 0, z: Math.sin(a / 2), w: Math.cos(a / 2) }),
			);
			world.createCollider(
				RAPIER.ColliderDesc.cuboid(length / 2, 0.12, 4).setFriction(0),
				ground,
			);
		}
	}
}
function startEvent() {
	eventElapsed = 0;
	state.time = config.duration;
	state.elapsed = 0;
	state.score = 0;
	state.pending = 0;
	state.mult = 1;
	state.rotation = 0;
	state.combo = [];
	state.trick = "";
	state.crashed = false;
	state.airborne = false;
	state.flow = 0;
	crashTime = 0;
	pipeSpeed = 9;
	dir = 1;
	flowClock = 0;
	foamClock = 0;
	lastTrick = -9;
	airTime = 0;
	lastGround = true;
	state.started = true;
	state.bestCombo = 0;
	state.bails = 0;
	state.landings = 0;
	state.laps = 0;
	buildPhysics();
	const x = state.event === "skate" ? -6 : state.event === "bmx" ? -17 : 0;
	body.setTranslation({ x, y: height(x) + 0.42, z: 0 }, true);
	body.setLinvel({ x: 0, y: 0, z: 0 }, true);
	art.setEvent(state.event);
	setScreen("playing", null);
	audio.resume();
	audio.voice("start");
	toast(
		state.event === "surf" ? "CHASE THE GOLDEN POCKET" : "GET RAD. LAND CLEAN.",
	);
}
function medal(score, e = EVENTS[state.eventIndex]) {
	return score >= e.gold
		? "GOLD"
		: score >= e.silver
			? "SILVER"
			: score >= e.bronze
				? "BRONZE"
				: "SUN-SEEKER";
}
function bank() {
	if (!state.pending) return;
	let pts = Math.round(state.pending * state.mult);
	state.score += pts;
	state.bestCombo = Math.max(state.bestCombo, pts);
	state.landings++;
	toast(`${state.combo.join(" + ")}   +${pts.toLocaleString()}`, "good");
	audio.sfx("land");
	audio.sfx("score");
	if (pts > 700) audio.voice("rad");
	state.pending = 0;
	state.combo = [];
	state.mult = clamp(state.mult + 1, 1, 8);
	scoreFlash = 0.4;
	publish();
}
function bail(reason) {
	if (attract || bot || inputKind === "touch") {
		state.rotation = 0;
		bank();
		return;
	}
	state.bails++;
	state.pending = 0;
	state.combo = [];
	state.mult = 1;
	state.crashed = true;
	crashTime = 1.25;
	state.rotation = 0;
	stats.bailReasons.push(reason);
	toast(reason + " · BACK ON IN A BEAT", "bad");
	audio.sfx("bail");
	audio.voice("bail");
}
function trick(kind) {
	if (state.crashed || state.elapsed - lastTrick < 0.32) return;
	if (!state.airborne) {
		if (
			state.event === "surf" &&
			kind === "grab" &&
			state.elapsed - lastTrick > 1
		) {
			lastTrick = state.elapsed;
			state.score += 90;
			toast("CUTBACK  +90");
			audio.sfx("score");
			publish();
		}
		return;
	}
	lastTrick = state.elapsed;
	const name =
		state.event === "bmx"
			? kind === "grab"
				? "TAILWHIP"
				: "BARSPIN"
			: state.event === "surf"
				? kind === "grab"
					? "MELON AIR"
					: "REVERSE AIR"
				: kind === "grab"
					? "METHOD GRAB"
					: "KICKFLIP";
	const repeat = state.combo.includes(name);
	state.pending += repeat ? 65 : kind === "grab" ? 180 : 280;
	state.combo.push(name);
	state.trick = kind;
	state.rotation += kind === "flip" ? TAU : Math.PI * 0.18;
	audio.sfx("score");
	$("trick-call").textContent = name;
	scoreFlash = 0.3;
}
function jump() {
	if (!lastGround || state.crashed) return;
	let v = body.linvel(),
		bonus =
			state.event === "skate"
				? Math.max(0, (Math.abs(body.translation().x) - 6) * 0.5)
				: 0;
	body.setLinvel({ x: v.x, y: config.jump + bonus, z: 0 }, true);
	body.setTranslation(
		{ x: body.translation().x, y: body.translation().y + 0.12, z: 0 },
		true,
	);
	state.airborne = true;
	lastGround = false;
	airTime = 0;
	audio.sfx("jump");
}
function publish() {
	const p = players[currentPlayer];
	const total = (p?.total || 0) - (p?.scores[state.eventIndex] || 0);
	const score = total + state.score;
	if (AIHub.active && !hubEnded && !hubResult)
		AIHub.progress({
			score,
			label: `${EVENTS[state.eventIndex].short} · ${medal(state.score)}`,
		});
	if (network?.connected)
		network.sendScore({
			event: state.screen === "festival-result" ? "finish" : state.event,
			score: state.score,
			total: score,
			finished: state.screen === "festival-result",
		});
}
function finishEvent() {
	bank();
	const p = players[currentPlayer],
		e = EVENTS[state.eventIndex];
	p.scores[state.eventIndex] = state.score;
	p.total = p.scores.reduce((a, b) => a + b, 0);
	if (!attract) {
		best[e.id] = Math.max(best[e.id] || 0, state.score);
		persist();
	}
	audio.sfx("finish");
	$("result-eyebrow").textContent = `${p.name}  /  ${e.short.toUpperCase()}`;
	$("result-medal").textContent = medal(state.score);
	$("result-score").textContent = state.score.toLocaleString();
	$("result-copy").textContent =
		medal(state.score) === "GOLD"
			? "That coast is officially toast."
			: `Next medal: ${state.score < e.bronze ? e.bronze : state.score < e.silver ? e.silver : e.gold} points. Keep the good times rolling.`;
	$("result-detail").textContent =
		`BEST COMBO ${state.bestCombo}  ·  LANDED COMBOS ${state.landings}  ·  WIPEOUTS ${state.bails}`;
	$("result-next").textContent = practice
		? "RIDE AGAIN"
		: currentPlayer + 1 < playerCount
			? "NEXT RIDER"
			: state.eventIndex < 2
				? "NEXT EVENT"
				: "FESTIVAL RESULTS";
	setScreen("event-result", "result-panel");
	if (attract) {
		setTimeout(() => {
			if (attract) advance();
		}, 1500);
	} else if (AIHub.active || network?.connected) {
		setTimeout(() => {
			if (state.screen === "event-result" && !hubEnded) advance();
		}, 3500);
	}
}
function advance() {
	if (practice) {
		startEvent();
		return;
	}
	if (currentPlayer + 1 < playerCount) {
		currentPlayer++;
		showBrief();
	} else if (state.eventIndex < 2) {
		currentPlayer = 0;
		state.eventIndex++;
		state.event = EVENTS[state.eventIndex].id;
		showBrief();
	} else {
		finishFestival();
		return;
	}
	if (attract || AIHub.active || network?.connected) startEvent();
}
function finishFestival() {
	if (!attract) {
		best.festival = Math.max(
			best.festival || 0,
			...players.map((p) => p.total),
		);
		persist();
	}
	renderPodium();
	$("festival-copy").textContent =
		players[0].total >= 11000
			? "GOLDEN COAST LEGEND. Put that on a T-shirt."
			: "Three sports. One seriously excellent afternoon.";
	setScreen("festival-result", "festival-panel");
	if (AIHub.active) reportHub();
	if (network?.connected)
		network.sendScore({
			event: "finish",
			score: state.score,
			total: players[0].total,
			finished: true,
		});
	audio.voice("finish");
	if (attract)
		setTimeout(() => {
			if (attract) {
				state.eventIndex = 0;
				currentPlayer = 0;
				makePlayers();
				state.event = "skate";
				startEvent();
			}
		}, 2500);
}
function renderPodium() {
	const list =
		network?.connected && networkScores.length
			? networkScores.map((p) => ({
					name: `RIDER ${p.id + 1}${p.finished ? " ✓" : ""}`,
					total: p.total || 0,
				}))
			: players;
	$("podium-list").innerHTML = [...list]
		.sort((a, b) => b.total - a.total)
		.map(
			(p, i) =>
				`<div class="standing"><span>0${i + 1}</span><strong>${esc(p.name)}</strong><b>${p.total.toLocaleString()}</b></div>`,
		)
		.join("");
}
function reportHub() {
	if (hubResult || hubEnded) return;
	hubResult = true;
	AIHub.result({
		score:
			(players[0]?.total || 0) -
			(players[0]?.scores[state.eventIndex] || 0) +
			state.score,
		stats: {
			"Best combo": state.bestCombo,
			"Clean landings": state.landings,
			Wipeouts: state.bails,
		},
	});
}
function pause() {
	if (attract || hubEnded) return;
	if (state.screen === "playing") {
		setScreen("paused", "pause-panel");
		audio.suspend();
	} else if (
		["paused", "settings", "dev", "about"].includes(state.screen) &&
		state.started
	) {
		setScreen("playing", null);
		audio.resume();
	}
}
let returnScreen = "title";
function openPanel(name) {
	returnScreen = state.screen;
	setScreen(name, name + "-panel");
}
function back() {
	if (state.screen === "playing") {
		pause();
		return;
	}
	if (state.screen === "paused") {
		pause();
		return;
	}
	if (
		["settings", "about", "dev", "online", "practice"].includes(state.screen)
	) {
		if (returnScreen === "paused") setScreen("paused", "pause-panel");
		else showTitle();
	} else if (!AIHub.active && !network?.running) showTitle();
}

window.addEventListener("keydown", (e) => {
	if (
		[
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Space",
			"Enter",
		].includes(e.code)
	)
		e.preventDefault();
	if (noteInput()) return;
	if (!keys.has(e.code)) pressed.add(e.code);
	keys.add(e.code);
	if (e.code === "Escape") {
		back();
		return;
	}
	if (!isPlay()) {
		if (e.code === "ArrowDown" || e.code === "ArrowUp")
			navigate(e.code === "ArrowDown" ? 1 : -1);
		if (e.code === "Enter" || e.code === "Space") {
			if (document.activeElement?.tagName === "BUTTON")
				document.activeElement.click();
		}
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	pressed.clear();
	if (state.screen === "playing" && !AIHub.active && !attract) pause();
});
window.addEventListener("pointerdown", (e) => {
	noteInput(e.pointerType === "touch" ? "touch" : "keyboard");
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "mouse" && (e.movementX || e.movementY)) {
		lastInput = performance.now();
		if (attract) noteInput("keyboard");
	}
});
document.addEventListener("pointerover", (e) => {
	if (e.target.matches("button")) e.target.focus({ preventScroll: true });
});
$("view").addEventListener("pointermove", (e) => {
	if (e.pointerType === "mouse" && isPlay())
		lookOffset = (e.clientX / innerWidth - 0.5) * 2;
});
$("view").addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") {
		if (noteInput("touch")) return;
		touch.active = true;
		touch.startX = e.clientX;
		touch.startY = e.clientY;
		touch.x = e.clientX;
		touch.y = e.clientY;
		touch.moveX = 0;
		touch.moveY = 0;
		touch.startTime = performance.now();
		e.target.setPointerCapture(e.pointerId);
	} else if (isPlay()) {
		pressed.add(e.button === 2 ? "KeyJ" : e.button === 1 ? "KeyK" : "Space");
	}
});
$("view").addEventListener("contextmenu", (e) => e.preventDefault());
$("view").addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch" && touch.active) {
		touch.moveX = clamp((e.clientX - touch.startX) / 65, -1, 1);
		touch.moveY = clamp((e.clientY - touch.startY) / 65, -1, 1);
	}
});
$("view").addEventListener("pointerup", (e) => {
	if (e.pointerType === "touch") {
		if (performance.now() - touch.startTime < 250) pressed.add("Space");
		touch.active = false;
		touch.moveX = touch.moveY = 0;
	}
});
function navigate(d) {
	if (state.screen === "about") {
		$("about-panel").scrollTop += d * 110;
		return;
	}
	const els = [
		...document.querySelectorAll(
			".panel:not([hidden]) button,.panel:not([hidden]) input",
		),
	].filter((e) => !e.disabled);
	let i = els.indexOf(document.activeElement);
	const target = els[(i + d + els.length) % els.length];
	target?.focus({ preventScroll: true });
	target?.scrollIntoView({ block: "nearest" });
	audio.sfx("click");
}
function readPad() {
	const pad = [...navigator.getGamepads()].find((p) => p?.connected);
	if (!pad) return { x: 0, y: 0 };
	const axis = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0,
		ay = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
	const edges = pad.buttons.map((b, i) => b.pressed && !padPrev[i]);
	const any = edges.some(Boolean) || Math.abs(axis) > 0.2 || Math.abs(ay) > 0.2;
	if (any) {
		if (inputKind !== "gamepad" || edges.some(Boolean)) {
			if (noteInput("gamepad")) {
				pad.buttons.forEach((b, i) => (padPrev[i] = b.pressed));
				return { x: 0, y: 0 };
			}
		}
	}
	if (any) lastInput = performance.now();
	if (state.screen === "about" && Math.abs(pad.axes[3] || 0) > 0.2) {
		$("about-panel").scrollTop += pad.axes[3] * 18;
		lastInput = performance.now();
	}
	if (
		!isPlay() &&
		Math.abs(axis) > 0.5 &&
		document.activeElement?.type === "range" &&
		performance.now() - navTime > 160
	) {
		const el = document.activeElement;
		el.value = +el.value + Math.sign(axis) * +el.step;
		el.dispatchEvent(new Event("input"));
		navTime = performance.now();
	}
	if (!isPlay() && Math.abs(ay) > 0.5 && performance.now() - navTime > 230) {
		navigate(Math.sign(ay));
		navTime = performance.now();
	}
	if (edges[9] && !pad.buttons[8]?.pressed) pause();
	if (isPlay()) {
		if (edges[0]) pressed.add("Space");
		if (edges[2]) pressed.add("KeyJ");
		if (edges[1]) pressed.add("KeyK");
	} else {
		if (edges[12]) navigate(-1);
		if (edges[13]) navigate(1);
		if (edges[0]) document.activeElement?.click();
		if (edges[1]) back();
		if ((edges[14] || edges[15]) && document.activeElement?.type === "range") {
			const el = document.activeElement;
			el.value = +el.value + (edges[15] ? 1 : -1) * +el.step;
			el.dispatchEvent(new Event("input"));
		}
	}
	pad.buttons.forEach((b, i) => (padPrev[i] = b.pressed));
	return { x: axis, y: ay };
}
function controls(pad) {
	let x = clamp(
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
				(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) +
				pad.x +
				touch.moveX,
			-1,
			1,
		),
		y = clamp(
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
				(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) +
				pad.y +
				touch.moveY,
			-1,
			1,
		);
	if (bot || attract) {
		const p = body.translation();
		x =
			state.event === "surf"
				? clamp((targetX - p.x) * 0.65, -1, 1)
				: state.event === "bmx"
					? 1
					: dir;
		y = 1;
		if (
			lastGround &&
			(state.event === "skate"
				? Math.abs(p.x) > 8
				: state.event === "bmx"
					? [-9, 3, 15].some((c) => p.x > c - 0.8 && p.x < c + 0.5)
					: state.elapsed % 3 < 0.08)
		)
			pressed.add("Space");
		if (state.airborne && airTime > 0.18 && airTime < 0.5) pressed.add("KeyJ");
		if (state.airborne && airTime > 0.55 && airTime < 0.8) pressed.add("KeyK");
	}
	if (inputKind === "touch" && state.airborne && airTime > 0.2 && airTime < 0.3)
		pressed.add("KeyJ");
	return { x, y };
}
function step(dt, pad) {
	if (hubEnded) return;
	if (state.crashed) {
		state.time = Math.max(0, state.time - dt);
		state.elapsed += dt;
		if (state.time <= 0) {
			finishEvent();
			return;
		}
		crashTime -= dt;
		if (crashTime <= 0) {
			state.crashed = false;
			const p = body.translation();
			const recoverX = clamp(p.x + (state.event === "bmx" ? 2 : 0), -11, 11);
			body.setTranslation(
				{ x: recoverX, y: height(recoverX) + 0.42, z: 0 },
				true,
			);
			body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			pipeSpeed = 8;
			lastGround = true;
		}
		return;
	}
	state.elapsed += dt;
	eventElapsed += dt;
	if (!infinite) state.time -= dt;
	if (state.time <= 0) {
		finishEvent();
		return;
	}
	const c = controls(pad);
	let p = body.translation(),
		v = body.linvel();
	if (pressed.has("Space")) jump();
	if (pressed.has("KeyJ")) trick("grab");
	if (pressed.has("KeyK")) trick("flip");
	v = body.linvel();
	let vx = v.x;
	if (state.event === "skate") {
		if (p.x > 12.3 && v.y < 0) dir = -1;
		if (p.x < -12.3 && v.y < 0) dir = 1;
		const slope = (Math.sign(p.x) * Math.max(0, Math.abs(p.x) - 4)) / 8;
		pipeSpeed = clamp(
			pipeSpeed + (c.y > 0.3 ? 2.7 : 0) * dt - Math.sign(vx) * slope * 10 * dt,
			6,
			16,
		);
		if (Math.abs(p.x) < 8 && Math.abs(c.x) > 0.3) dir = Math.sign(c.x);
		vx = dir * pipeSpeed * config.speed;
		if (Math.abs(p.x) > 15) {
			dir = -Math.sign(p.x);
			vx = dir * 10;
		}
	}
	if (state.event === "bmx") {
		vx = (7.5 + c.x * 4 + (c.y > 0.3 ? 1 : 0)) * config.speed;
		if (p.x > 18) {
			state.laps++;
			body.setTranslation({ x: -18, y: Math.max(0.42, p.y), z: 0 }, true);
			p = body.translation();
			toast("ONE MORE LAP. MAKE IT COUNT.");
		}
		const hazard = [-4.6, 7.4].find((x) => Math.abs(p.x - x) < 0.5);
		if (hazard && p.y < 1.15 && state.elapsed > 1.5) {
			if (bot || attract || inputKind === "touch") {
				body.setTranslation({ x: p.x + 0.9, y: 1.7, z: 0 }, true);
				v.y = 5;
				lastGround = false;
				state.airborne = true;
			} else {
				bail("CONE CRUNCH");
				return;
			}
		}
	}
	if (state.event === "surf") {
		targetX = Math.sin(state.elapsed * 0.63) * 10;
		vx = clamp(v.x + c.x * 18 * dt - v.x * 2.5 * dt, -10, 10) * config.speed;
		if (Math.abs(p.x) > 15) vx = -Math.sign(p.x) * 4;
		const surface = height(p.x);
		if (p.y < surface + 0.55 && v.y < 2) {
			v.y += (surface + 0.42 - p.y) * 55 * dt;
			v.y += config.gravity * dt * 0.95;
		}
		flowClock += dt;
		if (Math.abs(p.x - targetX) < 2.5 && !state.airborne) {
			state.flow = clamp(state.flow + dt * 0.6, 0, 1);
			if (flowClock > 0.55) {
				state.score += Math.round(35 + state.flow * 45);
				flowClock = 0;
				audio.sfx("score");
				publish();
			}
		} else state.flow = Math.max(0, state.flow - dt * 0.25);
		foamClock += dt;
		const buoyX = -Math.sin(state.elapsed * 0.37 + 1.2) * 11;
		if (Math.abs(p.x - buoyX) < 0.72 && p.y < surface + 1 && foamClock > 5) {
			foamClock = 0;
			bail("BUOY OH BUOY");
			return;
		}
	}
	body.setLinvel({ x: vx, y: v.y, z: 0 }, true);
	world.gravity.y = -config.gravity;
	world.timestep = dt;
	world.step();
	stats.physicsSteps++;
	p = body.translation();
	v = body.linvel();
	let ground = height(p.x),
		grounded = p.y <= ground + 0.46 && v.y < 2;
	if (
		state.event === "bmx" &&
		[-9, 3, 15].some((c) => p.x > c && p.x < c + 0.8) &&
		p.y > 1
	)
		grounded = false;
	if (p.y < ground + 0.36 && v.y < 0) {
		body.setTranslation({ x: p.x, y: ground + 0.4, z: 0 }, true);
		body.setLinvel({ x: vx, y: 0, z: 0 }, true);
		grounded = true;
		p = body.translation();
	}
	if (grounded && !lastGround) {
		let angle = Math.abs(
			Math.atan2(Math.sin(state.rotation), Math.cos(state.rotation)),
		);
		if (angle > 1.2 + config.assist * 2 || p.y < -5) bail("ROUGH LANDING");
		else bank();
		state.rotation = 0;
		airTime = 0;
		state.trick = "";
	}
	if (!grounded) {
		airTime += dt;
		state.rotation *= Math.exp(-dt * (2 + config.assist * 7));
	} else {
		airTime = 0;
		state.rotation *= 0.7;
	}
	state.airborne = !grounded;
	lastGround = grounded;
	state.speed = vx;
	state.time = Math.max(0, state.time);
	if (p.y < -8) {
		bail("OUT TO SEA");
		body.setTranslation({ x: 0, y: 3, z: 0 }, true);
	}
}
function updateHUD() {
	const e = EVENTS[state.eventIndex];
	$("hud-event").textContent = e.short.toUpperCase();
	$("hud-count").textContent = practice
		? "FREE SESSION"
		: `EVENT ${state.eventIndex + 1} / 3`;
	const score = state.score.toLocaleString();
	if ($("hud-score").textContent !== score) $("hud-score").textContent = score;
	$("hud-time").textContent = Math.ceil(state.time).toString().padStart(2, "0");
	$("hud-time").classList.toggle("urgent", state.time < 10);
	$("combo").hidden = !state.pending;
	$("combo-points").textContent = `${state.pending} × ${state.mult}`;
	$("combo-name").textContent = state.combo.slice(-2).join(" + ");
	$("flow-meter").style.width =
		`${state.event === "surf" ? state.flow * 100 : clamp(Math.abs(state.speed) / 16, 0, 1) * 100}%`;
	$("flow-label").textContent =
		state.event === "surf" ? "WAVE FLOW" : "MOMENTUM";
	$("medal-label").textContent = medal(state.score);
	$("medal-progress").style.width =
		`${Math.min(100, (state.score / e.gold) * 100)}%`;
	$("hud-rider").textContent = network?.connected
		? `ONLINE  ·  RIDER ${network.me + 1}`
		: players[currentPlayer]?.name || "RIDER 1";
	$("live-standings").hidden = !network?.connected;
	if (network?.connected)
		$("live-standings").textContent = networkScores
			.map((p) => `R${p.id + 1}  ${p.total || 0}`)
			.join("   /   ");
	$("touch-pop").hidden = inputKind !== "touch" || !isPlay() || !lastGround;
}
let marker, buoy;
function makeMarkers() {
	marker = new THREE.Mesh(
		new THREE.TorusGeometry(1.1, 0.07, 8, 40),
		new THREE.MeshBasicMaterial({ color: 0xffd34f }),
	);
	art.scene.add(marker);
	buoy = new THREE.Group();
	const m = new THREE.Mesh(
		new THREE.ConeGeometry(0.5, 1.3, 10),
		new THREE.MeshStandardMaterial({ color: 0xe7503d, flatShading: true }),
	);
	m.position.y = 0.4;
	buoy.add(m);
	art.scene.add(buoy);
}
function visual(dt) {
	let p = body?.translation() || { x: -2, y: 1, z: 0 };
	if (state.screen === "title" || state.screen === "loading") {
		p = { x: -3, y: 0.5, z: 0 };
		state.speed = 0;
		state.airborne = false;
	}
	art.athlete.position.set(p.x, p.y - 0.38, p.z);
	let slope =
		state.event === "skate"
			? Math.atan((Math.sign(p.x) * Math.max(0, Math.abs(p.x) - 4)) / 8)
			: state.event === "bmx" &&
					[-9, 3, 15].some((c) => p.x >= c - 3 && p.x <= c)
				? Math.atan(3 / 3)
				: 0;
	art.athlete.rotation.z = state.crashed
		? -1.4
		: state.airborne
			? state.rotation
			: slope;
	art.athlete.scale.x = state.event === "skate" ? dir : 1;
	art.update(dt, { ...state, time: state.elapsed, paused: !isPlay() });
	marker.visible = buoy.visible = state.event === "surf" && isPlay();
	if (marker.visible) {
		marker.position.set(targetX, height(targetX) + 1.6, 0);
		marker.rotation.y = Math.sin(state.elapsed) * 0.25;
		buoy.position.set(
			-Math.sin(state.elapsed * 0.37 + 1.2) * 11,
			height(-Math.sin(state.elapsed * 0.37 + 1.2) * 11),
			0,
		);
	}
	const titleView =
		[
			"title",
			"loading",
			"brief",
			"settings",
			"about",
			"practice",
			"online",
		].includes(state.screen) && !state.started;
	const camX = titleView ? 23 : state.event === "surf" ? 8 : 12;
	art.camera.position.set(
		camX + (reduceMotion ? 0 : lookOffset * 0.7),
		titleView ? 17 : state.event === "surf" ? 12 : 15,
		titleView ? 31 : state.event === "bmx" ? 38 : 34,
	);
	art.camera.lookAt(0, titleView ? 2 : 4, 0);
	if (innerWidth < 700) {
		art.camera.position.set(p.x * 0.45 + 8, 17, 43);
		art.camera.lookAt(p.x * 0.45, 3, 0);
	}
}
function loop(t) {
	if (!ready) return;
	const dt = Math.min(0.05, (t - lastRender) / 1000 || 0.016);
	lastRender = t;
	stats.frames++;
	const pad = readPad();
	if (hubStarting && AIHub.time() >= 0) {
		hubStarting = false;
		practice = false;
		playerCount = 1;
		makePlayers();
		state.eventIndex = 0;
		state.event = "skate";
		startEvent();
	}
	if (
		["title", "settings", "about", "practice", "online"].includes(
			state.screen,
		) &&
		!state.started &&
		!network?.connected &&
		!onlineWaiting &&
		!AIHub.active &&
		performance.now() - lastInput > 10000
	) {
		attract = true;
		bot = true;
		playerCount = 1;
		practice = false;
		makePlayers();
		state.eventIndex = 0;
		state.event = "skate";
		startEvent();
		$("attract").hidden = false;
		toast("THE COAST IS CLEAR. PRESS ANYTHING TO PLAY.");
	}
	if (isPlay() && !hubEnded) {
		let remain = dt * config.timeScale;
		while (remain > 0 && isPlay()) {
			const fixed = Math.min(1 / 60, remain);
			step(fixed, pad);
			remain -= fixed;
		}
		updateHUD();
		if (t - lastNetwork > 900) {
			publish();
			lastNetwork = t;
		}
	}
	visual(dt);
	audio.update(dt, { ...state, playing: isPlay(), attract });
	if (toastTime > 0) {
		toastTime -= dt;
		if (toastTime <= 0) $("toast").classList.remove("visible");
	}
	if (scoreFlash > 0) {
		scoreFlash -= dt;
		$("trick-call").style.opacity = scoreFlash > 0 ? "1" : "0";
	}
	if (state.screen === "dev")
		$("dev-stats").textContent =
			`RAPIER ${stats.physicsSteps} steps · ${stats.frames} frames · ${state.event} · x ${body.translation().x.toFixed(2)} / y ${body.translation().y.toFixed(2)} · ${state.airborne ? "AIR" : "GROUND"}`;
	pressed.clear();
	renderer.render(art.scene, art.camera);
}
function buttons() {
	const actions = {
		start: () => {
			playerCount = 1;
			beginFestival();
		},
		hotseat: () => {
			playerCount = (playerCount % 4) + 1;
			if (playerCount < 2) playerCount = 2;
			$("start-hotseat").textContent = `COUCH CREW · ${playerCount} RIDERS`;
			$("hotseat").textContent = "＋";
		},
		"start-hotseat": () => {
			if (playerCount < 2) playerCount = 2;
			beginFestival();
		},
		practice: () => openPanel("practice"),
		settings: () => openPanel("settings"),
		about: () => {
			fillAbout();
			openPanel("about");
		},
		online: () => openPanel("online"),
		"brief-go": startEvent,
		"brief-back": back,
		"result-next": advance,
		"festival-again": () => {
			if (AIHub.active || onlineWaiting) return;
			if (network?.connected) {
				if (network.isHost) network.startFestival();
				else toast("THE HOST STARTS THE NEXT SUMMER.");
				return;
			}
			beginFestival();
		},
		"festival-home": () => {
			if (!AIHub.active) {
				network?.disconnect();
				showTitle();
			}
		},
		resume: pause,
		"pause-settings": () => openPanel("settings"),
		"pause-dev": () => {
			if (AIHub.active || network?.running) {
				toast("THE RAD LAB OPENS AFTER THE COMPETITION.");
				return;
			}
			renderDev();
			openPanel("dev");
		},
		"pause-about": () => {
			fillAbout();
			openPanel("about");
		},
		"pause-quit": () => {
			if (!AIHub.active && !network?.running) {
				state.started = false;
				audio.resume();
				showTitle();
			}
		},
		"dev-restart": startEvent,
		"dev-next": () => {
			state.eventIndex = (state.eventIndex + 1) % 3;
			state.event = EVENTS[state.eventIndex].id;
			startEvent();
		},
		"dev-bank": () => {
			state.score += 1000;
			toast("DEV: +1000");
			publish();
		},
		"dev-reset": () => {
			config = { ...DEFAULTS };
			bot = false;
			infinite = false;
			$("dev-bot").textContent = "AUTO RIDER: OFF";
			$("dev-infinite").textContent = "INFINITE TIME: OFF";
			renderDev();
		},
		"dev-bot": () => {
			bot = !bot;
			$("dev-bot").textContent = `AUTO RIDER: ${bot ? "ON" : "OFF"}`;
		},
		"dev-infinite": () => {
			infinite = !infinite;
			$("dev-infinite").textContent =
				`INFINITE TIME: ${infinite ? "ON" : "OFF"}`;
		},
		"touch-menu": pause,
		"touch-pop": () => pressed.add("Space"),
		"online-create": () => onlineAction("create"),
		"online-join": () => onlineAction("join"),
		"online-start": () => network?.startFestival(),
		"online-leave": () => {
			network?.disconnect();
			networkScores = [];
			$("online-status").textContent = "ROOM CLOSED";
			$("online-start").hidden = true;
		},
		"settings-back": back,
		"about-back": back,
		"dev-back": back,
		"online-back": back,
		"practice-back": back,
	};
	Object.entries(actions).forEach(([id, fn]) =>
		$(id)?.addEventListener("click", () => {
			audio.unlock();
			audio.sfx("click");
			fn();
		}),
	);
	document.querySelectorAll("[data-event]").forEach(
		(b) =>
			(b.onclick = () => {
				playerCount = 1;
				beginFestival(+b.dataset.event);
			}),
	);
	$("music").oninput = (e) => {
		audio.setMusic(+e.target.value);
		$("music-value").textContent = Math.round(e.target.value * 100) + "%";
	};
	$("effects").oninput = (e) => {
		audio.setEffects(+e.target.value);
		$("effects-value").textContent = Math.round(e.target.value * 100) + "%";
	};
	$("glyphs").onclick = () => {
		glyphs = glyphs === "ps" ? "xbox" : "ps";
		$("glyphs").textContent =
			`CONTROLLER GLYPHS: ${glyphs === "ps" ? "PLAYSTATION" : "XBOX"}`;
		updatePrompts();
	};
	$("motion").onclick = () => {
		reduceMotion = !reduceMotion;
		$("motion").textContent =
			`CAMERA MOTION: ${reduceMotion ? "REDUCED" : "FULL"}`;
	};
	$("fullscreen").onclick = () => {
		if (!document.fullscreenElement)
			document.documentElement
				.requestFullscreen?.()
				.catch(() => toast("FULLSCREEN IS UNAVAILABLE HERE"));
		else document.exitFullscreen?.();
	};
}
function renderDev() {
	const defs = [
		["speed", "Ride speed", 0.4, 2, 0.05],
		["gravity", "Gravity", 6, 30, 0.5],
		["jump", "Pop strength", 4, 15, 0.25],
		["assist", "Landing assist", 0, 1, 0.05],
		["duration", "Heat length (next heat)", 15, 180, 5],
		["timeScale", "Simulation speed", 0.25, 2, 0.05],
	];
	$("dev-sliders").innerHTML = defs
		.map(
			([id, name, min, max, step]) =>
				`<label>${name}<output id="v-${id}">${config[id]}</output><input data-config="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${config[id]}"></label>`,
		)
		.join("");
	document.querySelectorAll("[data-config]").forEach(
		(el) =>
			(el.oninput = () => {
				config[el.dataset.config] = +el.value;
				$("v-" + el.dataset.config).textContent = el.value;
			}),
	);
}
async function onlineAction(which) {
	try {
		if (!network)
			network = new FestivalNetwork({
				onStatus: (s, snap) => {
					$("online-status").textContent = s;
					$("online-room").textContent = snap?.room ? `ROOM ${snap.room}` : "";
					$("online-start").hidden = !snap?.isHost || !snap?.connected;
				},
				onScores: (s) => {
					networkScores = s;
					if (state.screen === "festival-result") renderPodium();
					$("online-riders").textContent = s
						.map((p) => `RIDER ${p.id + 1}: ${p.total || 0}`)
						.join("  /  ");
				},
				onStart: (p) => {
					onlineWaiting = true;
					$("online-status").textContent = "WAX UP. STARTING IN 3…";
					setTimeout(
						() => {
							onlineWaiting = false;
							playerCount = 1;
							practice = false;
							makePlayers();
							state.eventIndex = 0;
							state.event = "skate";
							startEvent();
						},
						Math.max(0, p.startAt - Date.now()),
					);
				},
			});
		if (which === "create") await network.createRoom();
		else await network.joinRoom($("room-code").value.trim().toUpperCase());
	} catch (e) {
		$("online-status").textContent = e.message;
	}
}
async function boot() {
	buttons();
	updatePrompts();
	try {
		await RAPIER.init();
		art = createArt();
		renderer = new THREE.WebGPURenderer({
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.setClearColor(0xf9d9ac);
		renderer.shadowMap.enabled = true;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		$("view").appendChild(renderer.domElement);
		await renderer.init();
		$("engine-tag").textContent =
			`THREE r180 · ${renderer.backend.isWebGPUBackend ? "WEBGPU" : "WEBGL2"} · RAPIER 0.19.3`;
		makeMarkers();
		buildPhysics();
		ready = true;
		window.addEventListener("resize", () => {
			renderer.setSize(innerWidth, innerHeight);
			art.camera.aspect = innerWidth / innerHeight;
			art.camera.updateProjectionMatrix();
		});
		renderer.setAnimationLoop(loop);
		if (AIHub.active) {
			$("overlay").hidden = true;
			$("hud").hidden = true;
			state.screen = "hub-wait";
			AIHub.on("start", () => {
				hubStarting = true;
			});
			AIHub.on("time-up", () => reportHub());
			AIHub.on("end", () => {
				hubEnded = true;
				state.screen = "hub-end";
				audio.suspend();
				keys.clear();
				pressed.clear();
			});
			hubInfo = await AIHub.connect({ mode: "parallel", seats: [1, 4] });
			if (hubInfo) AIHub.ready();
			else showTitle();
		} else showTitle();
	} catch (e) {
		stats.errors.push(e.stack || e.message);
		$("loading-copy").textContent = "COULD NOT LOAD THE COAST. " + e.message;
		$("loading-retry").hidden = false;
		console.error(e);
	}
}
window.__game = {
	get state() {
		return {
			...state,
			attract,
			bot,
			playerCount,
			currentPlayer,
			players: structuredClone(players),
			config: { ...config },
			ready,
			renderer: renderer?.backend?.isWebGPUBackend ? "webgpu" : "webgl2",
			position: body ? { ...body.translation() } : null,
			stats: structuredClone(stats),
		};
	},
	get audio() {
		return audio;
	},
	start: (id = "skate") => {
		playerCount = 1;
		practice = false;
		makePlayers();
		state.eventIndex = EVENTS.findIndex((e) => e.id === id);
		state.event = id;
		startEvent();
	},
	action: (a) =>
		pressed.add(a === "jump" ? "Space" : a === "grab" ? "KeyJ" : "KeyK"),
	setConfig: (c) => Object.assign(config, c),
	setBot: (v) => (bot = v),
	finish: finishEvent,
	advance,
	pause,
	title: showTitle,
	setIdle: () => (lastInput = performance.now() - 10001),
	teleport: (x, y, vx = 0, vy = 0) => {
		body.setTranslation({ x, y, z: 0 }, true);
		body.setLinvel({ x: vx, y: vy, z: 0 }, true);
		lastGround = false;
	},
	network: () => network,
	version: "1.0.0",
};
window.addEventListener("error", (e) => stats.errors.push(e.message));
window.addEventListener("unhandledrejection", (e) =>
	stats.errors.push(String(e.reason)),
);
function fillAbout() {
	const feedback = window.GAME_CREDITS;
	$("about-content").innerHTML = feedback
		? Object.entries(feedback)
				.filter(([k]) => k !== "aiHub")
				.map(
					([k, v]) =>
						`<h3>${esc(k.replace(/([A-Z])/g, " $1").toUpperCase())}</h3>${
							Array.isArray(v)
								? v.map((a) => `<p>${esc(a)}</p>`).join("")
								: Object.entries(v)
										.map(
											([a, b]) =>
												`<p><strong>${esc(a)}:</strong> ${esc(b)}</p>`,
										)
										.join("")
						}`,
				)
				.join("")
		: "Credits are loading.";
}
boot();
