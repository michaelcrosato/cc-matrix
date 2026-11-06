import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three/webgpu";
import { JungleAudio } from "./audio.js";
import { CHAPTERS, DEFAULTS, JungleGame } from "./game.js";
import { ExpeditionNet } from "./network.js";
import { createWorld } from "./world.js";

const $ = (s) => document.querySelector(s),
	ui = $("#ui");
const esc = (s) =>
	String(s ?? "").replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let mode = "loading",
	returnMode = "title",
	lastInput = "keyboard",
	lastActivity = performance.now(),
	focusIndex = 0,
	game,
	world,
	renderer,
	scene,
	camera,
	net,
	frameCount = 0,
	transitionTimer = 0,
	bannerUntil = 0,
	toastUntil = 0,
	toastText = "",
	cameraX = 13,
	shake = 0,
	booted = false,
	lastNow = 0,
	uiTick = 0,
	localCoop = false,
	aboutTab = 0,
	debugOverlay = false,
	attractCycles = 0,
	pairOutput = "",
	networkPaused = false;
const settings = {
	music: 0.1,
	sfx: 0.65,
	glyphs: "PlayStation",
	shake: true,
	assist: true,
};
try {
	const saved = JSON.parse(localStorage.getItem("jungle-scurry-settings"));
	if (saved) Object.assign(settings, saved);
} catch {}
const audio = new JungleAudio();
audio.setMusicVolume(settings.music);
audio.setSfxVolume(settings.sfx);
const keys = new Set(),
	edges = new Set(),
	padPrevious = new Map(),
	padInputs = new Map(),
	remoteInputs = {},
	touches = new Map();
let touchAxis = { x: 0, y: 0 },
	touchJump = false,
	touchAction = false,
	menuRepeat = 0,
	lastPointerMove = 0;
const isTouch =
	matchMedia("(pointer:coarse)").matches || navigator.maxTouchPoints > 0;
if (isTouch) {
	document.body.classList.add("body-touch");
	lastInput = "touch";
}
const prompts = {
	keyboard: {
		move: "A D",
		jump: "Space",
		action: "E",
		duck: "S",
		pause: "Esc",
	},
	pad: { move: "L", jump: "×", action: "□", duck: "○", pause: "Options" },
	touch: {
		move: "drag",
		jump: "tap",
		action: "tap",
		duck: "drag ↓",
		pause: "Ⅱ",
	},
};
function glyph(name) {
	if (lastInput === "pad" && settings.glyphs === "Xbox")
		return { move: "L", jump: "A", action: "X", duck: "B", pause: "Menu" }[
			name
		];
	return (prompts[lastInput] || prompts.keyboard)[name];
}
function key(name) {
	return `<span class="key">${glyph(name)}</span>`;
}
function saveSettings() {
	try {
		localStorage.setItem("jungle-scurry-settings", JSON.stringify(settings));
	} catch {}
}
function activity(type = "keyboard") {
	lastActivity = performance.now();
	if (type) lastInput = type;
	if (mode === "attract") {
		attractCycles++;
		goTitle();
		return true;
	}
	return false;
}
function unlock() {
	if (net?.hubActive && net.ended) return;
	audio.unlock().catch(() => {});
}
function button(label, action, cls = "", extra = "") {
	return `<button class="btn ${cls}" data-action="${action}" ${extra}>${label}<span class="arrow">↗</span></button>`;
}
function panel(
	title,
	content,
	{ wide = false, back = true, kicker = "FIELD NOTES", id = "" } = {},
) {
	return `<section class="screen screen-center" ${id ? `id="${id}"` : ""}><div class="panel ${wide ? "wide" : ""}">${back ? '<button class="back" data-action="back" aria-label="Back">×</button>' : ""}<div class="eyebrow">${kicker}</div><h1>${title}</h1>${content}</div></section>`;
}
function setMode(next) {
	mode = next;
	document.body.classList.toggle(
		"playing",
		["playing", "attract", "transition", "victory"].includes(mode),
	);
	audio.setPaused(
		["pause", "settings", "dev", "about", "guide", "defeat"].includes(mode),
	);
	focusIndex = 0;
	renderUI();
}
function goTitle() {
	if (net?.mode === "hub") return;
	game.auto = false;
	game.setCoop(false);
	localCoop = false;
	game.restart();
	net?.leave();
	lastActivity = performance.now();
	setMode("title");
	cameraX = 13;
	audio.setStage(0);
}
function startGame(coop = false, { network = false } = {}) {
	if (net?.hubActive && net.ended) return;
	localCoop = coop && !network;
	game.setCoop(coop);
	game.auto = false;
	game.god = false;
	game.restart();
	game.tuning.assist = settings.assist ? 1 : 0.45;
	remoteInputs[2] = {};
	networkPaused = false;
	cameraX = 11;
	setMode("playing");
	showBanner();
	audio.voice("hello");
}
function showBanner() {
	bannerUntil = performance.now() + 4200;
}
function toast(text) {
	toastText = text;
	toastUntil = performance.now() + 2300;
}
function startAttract() {
	game.setCoop(false);
	game.restart();
	game.auto = true;
	game.god = true;
	cameraX = 11;
	setMode("attract");
	bannerUntil = 0;
}
function pause() {
	if (net?.active && !net.isHost) {
		net.sendInput({ pauseRequest: true }, true);
		return;
	}
	if (mode === "playing") {
		returnMode = "playing";
		if (net.active) {
			networkPaused = true;
			toast("Camp break · expedition paused");
		}
		setMode("pause");
	} else if (mode === "pause") {
		networkPaused = false;
		setMode("playing");
	}
}
function localPlayer() {
	const seat = net?.active ? networkSeat() : 1;
	return game.players.find((p) => p.id === seat) || game.players[0];
}
function getHint() {
	const p = localPlayer();
	if (game.stage === 0)
		return p.swinging >= 0
			? `${key("move")} Pump the swing ${key("jump")} Let go on the upswing`
			: `${key("move")} Move ${key("jump")} Jump · Vines catch automatically`;
	if (game.stage === 1)
		return `${key("move")} Swim · Up for air ${key("action")} Knife · Stun crocodiles`;
	if (game.stage === 2)
		return `${key("jump")} Jump low rocks ${key("duck")} Duck under high rocks`;
	const near = game.pickups.some(
		(c) => c.type === "bell" && !c.taken && Math.abs(c.x - p.x) < 3,
	);
	return near
		? `${key("action")} Ring the Sunbell!`
		: `${key("move")} Move ${key("jump")} Jump ${key("action")} Tool · Ring three bells`;
}
function renderHUD() {
	const p = localPlayer(),
		c = CHAPTERS[game.stage];
	return `<div class="hud"><div class="hud-top"><div class="chapter-box"><div class="chapter-tag">CHAPTER 0${game.stage + 1} / 04</div><div class="chapter-name">${c.name}</div><div class="life-row">${[0, 1, 2].map((i) => `<i class="life ${i >= p.health ? "empty" : ""}"></i>`).join("")}${game.players.length > 1 ? '<span style="margin-left:10px;font-size:13px;color:#86d6da">SCOUT TWO ON TRAIL</span>' : ""}</div></div><div class="route-progress">${CHAPTERS.map((_, i) => `${i ? "<em></em>" : ""}<i class="${i < game.stage ? "done" : i === game.stage ? "current" : ""}"></i>`).join("")}</div><div class="hud-right"><div class="score"><span id="score-text">${String(game.score).padStart(6, "0")}</span><small>EXPEDITION SCORE</small></div><button class="pause-button" data-action="pause" aria-label="Pause">Ⅱ</button></div></div><div class="hud-bottom"><div class="hint" id="hint">${getHint()}</div>${game.stage === 1 ? `<div class="oxygen"><span>AIR SUPPLY</span><div class="oxygen-track"><div class="oxygen-fill" id="oxygen" style="width:${(100 * p.oxygen) / game.tuning.oxygen}%"></div></div></div>` : game.stage === 3 ? `<div class="bell-count" id="bell-count">♧ ${game.bells} / 3</div>` : ""}</div></div>${mode === "attract" ? '<div class="attract-label">POSTCARDS FROM THE TRAIL<small>DEMONSTRATION · ANY INPUT TO RETURN</small></div>' : ""}${isTouch && mode === "playing" ? '<button id="touch-action" class="touch-action" data-action="touch">JUMP</button>' : ""}${debugOverlay ? '<div class="fps" id="debug-state"></div>' : ""}`;
}
function renderUI() {
	if (!game) return;
	if (mode === "title")
		ui.innerHTML = `<section class="screen"><div class="brand"><div class="eyebrow">An expedition in four acts</div><h1 class="title">Jungle<span>Scurry</span></h1><p class="subtitle">A little trouble.<br>A grand adventure.</p><nav class="menu" aria-label="Main menu">${button("Begin expedition", "start", "primary")}${button("Bring a friend", "coop")}${button("Field guide", "guide")}${button("Settings", "settings")}${button("About the expedition", "about")}</nav><div class="title-note">INSPIRED BY THE ARCADE ADVENTURES OF 1983<br>MOVE WITH ${lastInput === "pad" ? "THE LEFT STICK" : lastInput === "touch" ? "A DRAG" : "WASD OR ARROW KEYS"} · ${glyph("jump")} TO LEAP INTO TROUBLE</div></div><div class="edition"><div class="seal">✦</div><div>THE SUNBELL<br>EXPEDITION · 83</div></div><div class="route-ribbon"><span>SWING</span><span>SWIM</span><span>SCRAMBLE</span><span>RESCUE</span></div></section>`;
	else if (["playing", "attract"].includes(mode)) ui.innerHTML = renderHUD();
	else if (mode === "pause")
		ui.innerHTML = panel(
			"A moment to catch your breath.",
			`<p>Professor Pip can wait a tick. Probably.</p><nav class="menu grid">${button("Back to the trail", "resume", "primary")}${button("Field guide", "guide")}${button("Settings", "settings")}${net.active && !net.isHost ? "" : button("Dev camp", "dev")}${net.hubActive || (net.active && !net.isHost) ? "" : button("Retry this chapter", "retry")}${net.mode !== "hub" ? button("Return to title", "title") : button("Round status", "hub-status")}</nav>`,
			{ back: false, kicker: "CAMP BREAK" },
		);
	else if (mode === "settings")
		ui.innerHTML = panel(
			"Make yourself at home.",
			`<div class="row"><label for="music">Music</label><input id="music" data-setting="music" type="range" min="0" max="1" step=".01" value="${settings.music}" aria-label="Music volume"><output>${Math.round(settings.music * 100)}%</output></div><div class="row"><label for="sfx">Effects & voices</label><input id="sfx" data-setting="sfx" type="range" min="0" max="1" step=".01" value="${settings.sfx}" aria-label="Effects volume"><output>${Math.round(settings.sfx * 100)}%</output></div><div class="row"><label>Controller symbols</label><button class="toggle" data-action="glyphs">${settings.glyphs}</button></div><div class="row"><label>Camera shake</label><button class="toggle" data-action="shake">${settings.shake ? "On" : "Off"}</button></div><div class="row"><label>Vine catch assistance</label><button class="toggle" data-action="assist">${settings.assist ? "Generous" : "Precise"}</button></div><p class="mini">Music starts at 10%. Settings are saved on this device.</p><div class="menu">${button("Back", "back", "primary")}</div>`,
			{ kicker: "TRAIL PREFERENCES" },
		);
	else if (mode === "guide")
		ui.innerHTML = panel(
			"A pocket guide to peril.",
			`<div class="scroll">${[
				[
					"The Emerald Canopy",
					"Walk to the branch tip and jump. Vines catch you automatically. Pump right, then release as the vine swings upward to reach the next one.",
					`${key("move")} Move & pump ${key("jump")} Jump / release`,
				],
				[
					"Crocodile Creek",
					"Swim in any direction. Your air lasts 15 seconds underwater. Surface, or find a pearly air bubble. The field knife stuns crocodiles for four seconds.",
					`${lastInput === "pad" ? "Left stick" : lastInput === "touch" ? "Drag" : "WASD / arrows"} Swim ${key("action")} Knife`,
				],
				[
					"The Rumbling Rise",
					"Small rocks roll along the ground. Jump them! Large rocks bounce at head height. Duck below those. Watch their shadows and plan the gap.",
					`${key("jump")} Jump ${key("duck")} Duck`,
				],
				[
					"The Sunbell Rescue",
					"Professor Pip is tangled in an old vine lift. Find and ring three golden bells to lower the basket. Stun the beetles, then meet Pip at the far flag.",
					`${key("action")} Ring / stun ${key("jump")} Jump`,
				],
			]
				.map(
					(c, i) =>
						`<div class="guide-card"><div class="guide-num">0${i + 1}</div><div><h2>${c[0]}</h2><p>${c[1]}</p><div class="guide-controls">${c[2]}</div></div></div>`,
				)
				.join(
					"",
				)}<p class="mini">Three leaf hearts per chapter. Falling returns you to the last vine. Fruit earns 100 points. Checkpoints never cost a life. In co-op, either scout can lead; a fallen friend rejoins the expedition. Couch Scout Two: IJKL, Right Shift to jump, O for tool. Touch: drag anywhere to move, tap to jump, use the contextual button for knife and bells.</p></div><div class="button-row">${button("Back to it", "back", "primary")}</div>`,
			{ wide: true, kicker: "FOUR WAYS TO GET INTO TROUBLE" },
		);
	else if (mode === "coop")
		ui.innerHTML = panel(
			"Better with company.",
			`<p>Two scouts. One very eventful expedition.</p><nav class="menu grid">${button("Couch expedition", "couch", "primary")}${button("Nearby camp", "nearby")}${button("Direct connection", "direct")}${button("Back", "back")}</nav><p class="mini">Couch: two controllers, or share a keyboard. Nearby camp: two tabs on the same device. Direct connection: exchange two codes for an internet expedition. AI Hub connects scouts automatically.</p>`,
			{ kicker: "BRING A FRIEND" },
		);
	else if (mode === "nearby")
		ui.innerHTML = panel(
			"Meet at camp.",
			`<p>Open this game in another tab on this device. Share a camp code and set off together.</p><input class="input code" id="room-code" maxlength="24" placeholder="CAMP CODE" aria-label="Camp code" value="${esc(net.room)}"><div class="button-row">${button("Host camp", "host-room", "primary")}${button("Join camp", "join-room")}</div><div class="connection-status" id="net-status">${esc(net.status)}</div><div class="menu">${button("Set off together", "network-start", "primary", net.connected && net.isHost ? "" : "disabled")}</div><p class="mini">The host starts the expedition when both scouts have arrived.</p>`,
			{ kicker: "NEARBY EXPEDITION" },
		);
	else if (mode === "direct")
		ui.innerHTML = panel(
			"A message across the jungle.",
			`<p class="mini">Host: create an invitation and send it to your friend. Friend: paste it below and answer. Host: paste the reply and connect.</p><div class="button-row">${button("1 · Create invite", "offer", "primary")}${button("2 · Answer invite", "answer")}${button("3 · Connect reply", "accept")}</div><textarea class="input pair-code" id="pair-input" placeholder="Paste your friend’s connection code here" aria-label="Received connection code"></textarea><textarea class="input pair-code" id="pair-output" readonly placeholder="Your code will appear here" aria-label="Your connection code">${esc(pairOutput)}</textarea><div class="button-row">${button("Copy my code", "copy")}${button("Set off together", "network-start", "primary", net.connected && net.isHost ? "" : "disabled")}</div><div class="connection-status" id="net-status">${esc(net.status)}</div><p class="mini">Direct peer connection; no account required. Some restrictive networks block direct connections.</p>`,
			{ wide: true, kicker: "DIRECT EXPEDITION" },
		);
	else if (mode === "about") renderAbout();
	else if (mode === "dev") renderDev();
	else if (mode === "defeat")
		ui.innerHTML = panel(
			"A narrow escape!",
			`<p>The jungle won that round. Your next cup of tea is still waiting at the Sunbells.</p><div class="rank">CHAPTER 0${game.stage + 1} · ${CHAPTERS[game.stage].short.toUpperCase()}</div><nav class="menu" style="margin-top:24px">${button("Try this chapter again", "retry", "primary")}${button("Dev camp", "dev")}${button("Return to title", "title")}</nav>`,
			{ back: false, kicker: "DUST OFF YOUR HAT" },
		);
	else if (mode === "victory")
		ui.innerHTML = panel(
			"Home in time for tea.",
			`<p>Three bells ring out over the jungle. Pip is safe, the kettle is on, and your hat has almost survived.</p><div class="rank">${game.auto ? "FIELD DEMONSTRATION" : game.god ? "DEV EXPEDITION" : game.score > 10500 ? "GOLDEN COMPASS CLUB" : "SUNBELL EXPEDITION COMPLETE"}</div><div class="stats"><div class="stat"><strong>${game.score.toLocaleString()}</strong><span>POINTS</span></div><div class="stat"><strong>${formatTime(game.elapsed)}</strong><span>TRAIL TIME</span></div><div class="stat"><strong>${game.fruit}</strong><span>FRUIT FOUND</span></div></div><nav class="menu grid">${net.mode === "hub" ? button("Expedition complete", "hub-status", "primary") : button("One more adventure", "replay", "primary")}${button("About the expedition", "about")}${net.mode !== "hub" ? button("Return to title", "title") : ""}</nav>`,
			{ back: false, kicker: "PROFESSOR PIP SENDS HIS THANKS" },
		);
	else if (mode === "transition")
		ui.innerHTML = `<div class="chapter-transition"><div><div class="eyebrow" style="justify-content:center">TRAIL COMPLETE</div><div class="large-number">0${game.stage + 1}</div><h1>${CHAPTERS[game.stage].short} crossed!</h1><p>${game.stage === 3 ? "Three bells. One very grateful botanist." : `Up next: ${CHAPTERS[game.stage + 1].name}`}</p></div></div>`;
	else if (mode === "hub-wait")
		ui.innerHTML = panel(
			"Your expedition is ready.",
			`<p>${esc(net.status)}<br>Waiting for AI Hub to sound the starting bell.</p><div class="loading-line"></div><p class="mini">${net.server ? "Dedicated expedition server" : "Both scouts share the same trail. Your controller steers your own scout."}</p>`,
			{ back: false, kicker: "AI HUB" },
		);
	if (["playing", "attract"].includes(mode) && toastUntil > performance.now())
		ui.insertAdjacentHTML(
			"beforeend",
			`<div class="toast">${esc(toastText)}</div>`,
		);
	bindUI();
	setFocus(0);
}
const feedbackQuestions = {
	testing: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"Most helpful test",
		"Least helpful test",
	],
	engine: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important thing built by hand",
		"Hardest part of using the engine",
		"Engine changes",
		"One thing to change",
	],
	prompt: [
		"What did you like most?",
		"What was confusing?",
		"Hardest thing to do",
		"What would you change?",
	],
};
function renderAbout() {
	const meta = globalThis.JUNGLE_CREDITS || {};
	const tabs = ["Source", "Testing", "Engine", "Prompt"];
	let content = "";
	if (aboutTab === 0) {
		const s = meta.sourceInformation || {};
		content = Object.entries(s)
			.map(
				([k, v]) =>
					`<div class="credit-row"><b>${esc(k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()))}</b><span>${esc(v)}</span></div>`,
			)
			.join("");
		content +=
			'<div class="credit-row"><b>Created for</b><span>Michael Crosato · Original code, procedural art and synthesized sound. Jungle Hunt is the 1983 source inspiration; this is an original homage.</span></div>';
	} else {
		const group = ["", "testing", "engine", "prompt"][aboutTab],
			answers = meta[group + "Feedback"] || [];
		content = feedbackQuestions[group]
			.map(
				(q, i) =>
					`<div class="feedback-q">${q}</div><div class="feedback-a">${esc(answers[i] || "unknown")}</div>`,
			)
			.join("");
	}
	ui.innerHTML = panel(
		"The expedition log.",
		`<div class="tabs">${tabs.map((t, i) => `<button class="${i === aboutTab ? "active" : ""}" data-action="about-tab" data-tab="${i}">${t}</button>`).join("")}</div><div class="scroll" tabindex="0">${content}</div><div class="mini" style="margin-top:10px">Right stick / wheel / Page Down to scroll</div><div class="button-row">${button("Back", "back", "primary")}</div>`,
		{ wide: true, kicker: "ABOUT & CREDITS" },
	);
}
const sliders = [
	["moveSpeed", "Move speed", 3, 14, 0.2],
	["jumpPower", "Jump strength", 6, 17, 0.2],
	["gravity", "Gravity", 10, 36, 0.5],
	["swingPower", "Swing power", 0.5, 5, 0.1],
	["oxygen", "Air seconds", 5, 40, 1],
	["hazardSpeed", "Hazard speed", 0.2, 2.5, 0.1],
	["damage", "Hit damage", 0, 3, 0.5],
	["assist", "Catch assistance", 0, 1.5, 0.05],
	["timeScale", "Time scale", 0.25, 2, 0.05],
];
function renderDev() {
	ui.innerHTML = panel(
		"Welcome to dev camp.",
		`<div class="scroll"><div class="dev-grid">${sliders.map(([k, l, min, max, step]) => `<div class="row"><label for="tune-${k}">${l}</label><input type="range" id="tune-${k}" data-tuning="${k}" min="${min}" max="${max}" step="${step}" value="${game.tuning[k]}"><output>${Number(game.tuning[k]).toFixed(step < 1 ? 2 : 0)}</output></div>`).join("")}</div><div class="row"><label>Invincible scout</label><button class="toggle" data-action="god">${game.god ? "On" : "Off"}</button></div><div class="row"><label>Autopilot</label><button class="toggle" data-action="auto">${game.auto ? "On" : "Off"}</button></div><div class="row"><label>Telemetry</label><button class="toggle" data-action="telemetry">${debugOverlay ? "On" : "Off"}</button></div><div class="dev-stats">${renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2 fallback"} · Three r180 · Rapier 0.19.3<br>Chapter ${game.stage + 1} · x ${game.players[0].x.toFixed(2)} · y ${game.players[0].y.toFixed(2)} · ${frameCount} rendered frames</div></div><div class="button-row">${button("Next chapter", "next-stage")}${button("Restore defaults", "reset-tuning")}${button("Back to trail", "resume", "primary")}</div>`,
		{ wide: true, kicker: "LIVE TUNING · CHANGES APPLY IMMEDIATELY" },
	);
}
function bindUI() {
	for (const el of ui.querySelectorAll("button")) {
		el.addEventListener("click", (e) => {
			e.stopPropagation();
			activity(lastInput);
			unlock();
			doAction(el.dataset.action, el);
		});
		el.addEventListener("pointerenter", () => {
			const list = focusable();
			const idx = list.indexOf(el);
			if (idx >= 0) setFocus(idx);
		});
	}
	for (const el of ui.querySelectorAll("input[type=range]"))
		el.addEventListener("input", () => {
			activity(lastInput);
			const v = +el.value;
			if (el.dataset.setting) {
				settings[el.dataset.setting] = v;
				audio.setMusicVolume(settings.music);
				audio.setSfxVolume(settings.sfx);
				saveSettings();
				el.nextElementSibling.textContent = Math.round(v * 100) + "%";
			} else {
				game.tuning[el.dataset.tuning] = v;
				el.nextElementSibling.textContent = v.toFixed(+el.step < 1 ? 2 : 0);
			}
		});
	for (const el of ui.querySelectorAll("input,textarea"))
		el.addEventListener("pointerdown", (e) => e.stopPropagation());
	const touchBtn = $("#touch-action");
	if (touchBtn) {
		touchBtn.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			activity("touch");
			unlock();
			if (game.stage === 1 || (game.stage === 3 && nearBell()))
				touchAction = true;
			else touchJump = true;
		});
	}
}
function focusable() {
	return [
		...ui.querySelectorAll(
			"button:not(:disabled),input[type=range],input:not([type=range]),textarea",
		),
	]
		.filter((e) => e.offsetParent !== null)
		.sort(
			(a, b) =>
				Number(a.classList.contains("back")) -
				Number(b.classList.contains("back")),
		);
}
function setFocus(i) {
	const list = focusable();
	if (!list.length) return;
	focusIndex = (i + list.length) % list.length;
	for (const e of ui.querySelectorAll(".focused"))
		e.classList.remove("focused");
	list[focusIndex].classList.add("focused");
}
function menuMove(dir) {
	const list = focusable();
	if (!list.length) return;
	setFocus(focusIndex + dir);
	list[focusIndex].scrollIntoView({ block: "nearest" });
	audio.sfx("menu");
}
function menuAdjust(dir) {
	const el = focusable()[focusIndex];
	if (el?.type === "range") {
		el.value = clamp(+el.value + dir * (+el.step || 1), +el.min, +el.max);
		el.dispatchEvent(new Event("input"));
	} else if (mode === "about") {
		aboutTab = (aboutTab + dir + 4) % 4;
		renderUI();
	} else menuMove(dir);
}
function activateFocus() {
	focusable()[focusIndex]?.click();
}
function back() {
	if (mode === "pause") return pause();
	if (mode === "dev") {
		setMode("pause");
		return;
	}
	if (["settings", "guide", "about"].includes(mode)) {
		setMode(returnMode);
		return;
	}
	if (mode === "nearby" || mode === "direct") {
		net.leave();
		setMode("coop");
		return;
	}
	if (mode === "coop") {
		setMode("title");
		return;
	}
	if (mode === "playing") pause();
}
async function doAction(action, el) {
	if (
		net?.hubActive &&
		(net.ended ||
			[
				"start",
				"couch",
				"retry",
				"replay",
				"title",
				"next-stage",
				"auto",
			].includes(action))
	)
		return;
	audio.sfx("menu");
	try {
		switch (action) {
			case "start":
				startGame();
				break;
			case "couch":
				startGame(true);
				break;
			case "coop":
				returnMode = "title";
				setMode("coop");
				break;
			case "guide":
			case "settings":
			case "about":
				returnMode =
					mode === "victory"
						? "victory"
						: mode === "pause"
							? "pause"
							: mode === "playing"
								? "pause"
								: "title";
				setMode(action);
				break;
			case "back":
				back();
				break;
			case "pause":
				pause();
				break;
			case "resume":
				if (net.active && !net.isHost) {
					net.sendInput({ pauseRequest: true }, true);
					break;
				}
				networkPaused = false;
				game.pending = false;
				setMode("playing");
				break;
			case "title":
				goTitle();
				break;
			case "retry":
				game.retry();
				setMode("playing");
				showBanner();
				break;
			case "replay":
				if (net.active && net.isHost) net.begin();
				else startGame(localCoop);
				break;
			case "glyphs":
				settings.glyphs =
					settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
				saveSettings();
				renderUI();
				break;
			case "shake":
				settings.shake = !settings.shake;
				saveSettings();
				renderUI();
				break;
			case "assist":
				settings.assist = !settings.assist;
				game.tuning.assist = settings.assist ? 1 : 0.45;
				saveSettings();
				renderUI();
				break;
			case "dev":
				setMode("dev");
				break;
			case "god":
				game.god = !game.god;
				renderUI();
				break;
			case "auto":
				game.auto = !game.auto;
				renderUI();
				break;
			case "telemetry":
				debugOverlay = !debugOverlay;
				renderUI();
				break;
			case "reset-tuning":
				Object.assign(game.tuning, DEFAULTS);
				game.god = false;
				game.auto = false;
				renderUI();
				break;
			case "next-stage":
				game.setup((game.stage + 1) % 4);
				setMode("dev");
				break;
			case "about-tab":
				aboutTab = +el.dataset.tab;
				renderUI();
				break;
			case "nearby":
			case "direct":
				setMode(action);
				break;
			case "host-room": {
				const code = net.hostRoom($("#room-code").value);
				$("#room-code").value = code;
				renderUI();
				break;
			}
			case "join-room":
				net.joinRoom($("#room-code").value);
				break;
			case "network-start":
				if (net.connected && net.isHost) net.begin();
				break;
			case "offer":
				el.disabled = true;
				pairOutput = await net.createOffer();
				renderUI();
				break;
			case "answer":
				pairOutput = await net.acceptOffer($("#pair-input").value);
				renderUI();
				break;
			case "accept":
				await net.acceptAnswer($("#pair-input").value);
				renderUI();
				break;
			case "copy": {
				try {
					await navigator.clipboard.writeText($("#pair-output").value);
					toast("Connection code copied.");
				} catch {
					$("#pair-output").select();
					document.execCommand("copy");
					toast("Connection code selected.");
				}
				break;
			}
			case "hub-status":
				toast(net.status);
				break;
			case "touch":
				break;
		}
	} catch (err) {
		toast(err.message);
		const status = $("#net-status");
		if (status) status.textContent = err.message;
		else console.error(err);
	}
}
function formatTime(t) {
	return Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
}
function nearBell() {
	return (
		game?.stage === 3 &&
		game.pickups.some(
			(c) =>
				c.type === "bell" && !c.taken && Math.abs(c.x - localPlayer().x) < 3.1,
		)
	);
}
function pollPads(now) {
	padInputs.clear();
	if (net?.hubActive && net.ended) return;
	let menuSignal = false;
	for (const pad of navigator.getGamepads?.() || []) {
		if (!pad) continue;
		const prev = padPrevious.get(pad.index) || [];
		const pressed = (n) => !!pad.buttons[n]?.pressed;
		const edge = (n) => pressed(n) && !prev[n];
		const ax = (v) => (Math.abs(v || 0) > 0.18 ? v : 0);
		const x = ax(pad.axes[0]) + (pressed(15) ? 1 : 0) - (pressed(14) ? 1 : 0),
			y = -ax(pad.axes[1]) + (pressed(12) ? 1 : 0) - (pressed(13) ? 1 : 0);
		const any = x || y || pad.buttons.some((b, i) => b.pressed && !prev[i]);
		if (any) {
			if (lastInput !== "pad" && mode === "title") {
				lastInput = "pad";
				renderUI();
			}
			const exited = activity("pad");
			unlock();
			if (exited) {
				padPrevious.set(
					pad.index,
					pad.buttons.map((b) => b.pressed),
				);
				continue;
			}
		}
		const scroll = ui.querySelector(".scroll");
		if (scroll && Math.abs(pad.axes[3] || 0) > 0.2)
			scroll.scrollTop += (pad.axes[3] || 0) * 14;
		const input = {
			x: clamp(x, -1, 1),
			y: clamp(y, -1, 1),
			jump: edge(0),
			action: edge(2),
			duck: pressed(1),
		};
		padInputs.set(pad.index, input);
		if (edge(9) && !(net?.hubActive && pressed(8))) {
			pause();
			menuSignal = true;
		} else if (
			!["playing", "attract", "transition", "victory"].includes(mode)
		) {
			if (edge(0)) activateFocus();
			if (edge(1)) back();
			if (now > menuRepeat && (Math.abs(x) > 0.5 || Math.abs(y) > 0.5)) {
				if (Math.abs(y) > Math.abs(x)) menuMove(y > 0 ? -1 : 1);
				else menuAdjust(x > 0 ? 1 : -1);
				menuRepeat = now + 220;
			}
		} else if (mode === "victory") {
			if (edge(0)) activateFocus();
			if (edge(1)) back();
		}
		padPrevious.set(
			pad.index,
			pad.buttons.map((b) => b.pressed),
		);
	}
	return menuSignal;
}
function readInput(id) {
	const pad = padInputs.get(id - 1);
	if (id === 1) {
		const input = {
			x:
				(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
				(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
			y:
				(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
				(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
			jump: edges.has("Space"),
			action: edges.has("KeyE") || edges.has("KeyF") || edges.has("Mouse0"),
			duck: keys.has("KeyS") || keys.has("ArrowDown"),
		};
		if (pad && lastInput === "pad") Object.assign(input, pad);
		if (isTouch && lastInput === "touch") {
			input.x = touchAxis.x;
			input.y = touchAxis.y;
			input.jump = touchJump;
			input.action = touchAction;
			input.duck = touchAxis.y < -0.65;
			if (game.stage === 1) {
				input.action =
					input.action ||
					game.enemies.some(
						(e) =>
							e.active && e.stun <= 0 && Math.abs(e.x - localPlayer().x) < 3.2,
					);
				if (localPlayer().oxygen < 2.5) input.y = Math.max(input.y, 0.65);
			}
		}
		return input;
	}
	const input = {
		x: (keys.has("KeyL") ? 1 : 0) - (keys.has("KeyJ") ? 1 : 0),
		y: (keys.has("KeyI") ? 1 : 0) - (keys.has("KeyK") ? 1 : 0),
		jump: edges.has("ShiftRight"),
		action: edges.has("KeyO"),
		duck: keys.has("KeyK"),
	};
	if (pad) Object.assign(input, pad);
	return input;
}
function clearEdges() {
	edges.clear();
	touchJump = false;
	touchAction = false;
	for (const p of padInputs.values()) {
		p.jump = false;
		p.action = false;
	}
}
function onGameEvent(type, data) {
	const sounds = {
		jump: "jump",
		grab: "grab",
		release: "release",
		land: "land",
		attack: "attack",
		swish: "attack",
		hit: "hit",
		pickup: "pickup",
		bubble: "bubble",
		stun: "attack",
		checkpoint: "checkpoint",
		bell: "win",
	};
	if (sounds[type]) audio.sfx(sounds[type]);
	if (type === "stage") {
		audio.setStage(game?.stage ?? data.stage);
		world?.setStage(data.stage);
	}
	if (type === "hit") {
		shake = settings.shake ? 0.3 : 0;
		audio.voice("hurt");
	}
	if (type === "checkpoint" && mode !== "attract")
		toast("Trail marker reached");
	if (type === "bell") {
		toast(
			[
				"First bell! The vines begin to loosen.",
				"Second bell! Pip can almost smell the tea.",
				"Three bells! Meet Pip at the far flag.",
			][data.index] || "A Sunbell rings!",
		);
		audio.voice("happy");
	}
	if (type === "revive") toast("Your friend is back on the trail.");
	if (type === "defeat") {
		if (net?.hubActive) {
			game.pending = false;
			game.players[0].health = 3;
			game.checkpointPlayer(game.players[0]);
		} else setMode("defeat");
	}
	if (type === "stageClear") {
		transitionTimer = 1.9;
		if (mode !== "attract") setMode("transition");
	}
	if (type === "win") {
		audio.sfx("win");
		audio.voice("win");
		if (mode === "attract") {
			transitionTimer = 5;
			return;
		}
		setMode("victory");
		if (net?.active && net.isHost)
			net.finish({
				scores: Object.fromEntries(net.players.map((p) => [p.id, game.score])),
				won: true,
				stats: game.statistics,
			});
		try {
			localStorage.setItem(
				"jungle-scurry-best",
				String(
					Math.max(
						game.score,
						+(localStorage.getItem("jungle-scurry-best") || 0),
					),
				),
			);
		} catch {}
	}
}
function networkSeat() {
	if (!net.active || net.mode !== "hub") return net.isHost ? 1 : 2;
	const i = net.players.findIndex((p) => p.id === net.me);
	return i < 0 ? 0 : i + 1;
}
function updateNetworkStatus() {
	const status = $("#net-status");
	if (status) status.textContent = net.status;
	const btn = $('[data-action="network-start"]');
	if (btn) btn.disabled = !(net.connected && net.isHost);
}
function networkSnapshot() {
	return { ...game.snapshot(), screen: mode, transitionTimer, networkPaused };
}
function networkState(s) {
	if (net.isHost) return;
	const old = game.stage;
	game.applySnapshot(s);
	if (old !== game.stage) {
		world.setStage(game.stage);
		audio.setStage(game.stage);
		showBanner();
	}
	const screen = [
		"playing",
		"transition",
		"victory",
		"defeat",
		"pause",
	].includes(s.screen)
		? s.screen
		: "playing";
	if (mode !== screen || old !== game.stage) setMode(screen);
	transitionTimer = s.transitionTimer || 0;
	networkPaused = !!s.networkPaused;
}
function setupNet() {
	net = new ExpeditionNet({
		onStatus: updateNetworkStatus,
		onInput: (input, id) => {
			if (input.pauseRequest) {
				if (networkPaused) {
					networkPaused = false;
					setMode("playing");
				} else if (mode === "playing") {
					networkPaused = true;
					setMode("pause");
				}
				return;
			}
			const seat =
				net.mode === "hub"
					? net.players.findIndex((p) => p.id === id) + 1
					: id + 1;
			if (seat > 0) {
				const prev = remoteInputs[seat] || {};
				remoteInputs[seat] = {
					...input,
					jump: !!input.jump || !!prev.jump,
					action: !!input.action || !!prev.action,
				};
			}
		},
		onState: networkState,
		onStart: () => {
			startGame(net.players.length > 1, { network: true });
			if (net.hubActive && !net.canPlay) setMode("hub-wait");
		},
		onTimeUp: () => {
			if (net.isHost)
				net.finish({
					scores: Object.fromEntries(
						net.players.map((p) => [p.id, game.score]),
					),
					won: game.won,
					stats: game.statistics,
				});
		},
		onEnd: () => {
			audio.setPaused(true);
			setMode("victory");
			audio.setPaused(true);
			audio.context?.suspend().catch(() => {});
		},
		onLeave: () => {
			toast("Your friend left the trail. Carry on, scout!");
			if (net.isHost) {
				game.setCoop(false);
			}
		},
		onFinish: () => {
			setMode("victory");
		},
	});
}
function showDynamicHUD(now) {
	if (!["playing", "attract"].includes(mode)) return;
	$("#score-text")?.replaceChildren(String(game.score).padStart(6, "0"));
	const hint = $("#hint");
	if (hint) hint.innerHTML = getHint();
	const oxy = $("#oxygen");
	if (oxy) {
		oxy.style.width =
			clamp((100 * localPlayer().oxygen) / game.tuning.oxygen, 0, 100) + "%";
		oxy.style.background = localPlayer().oxygen < 4 ? "#ee9b63" : "#8edac6";
	}
	const bell = $("#bell-count");
	if (bell) bell.textContent = "♧ " + game.bells + " / 3";
	const lives = ui.querySelectorAll(".life");
	lives.forEach((el, i) => {
		el.classList.toggle("empty", i >= localPlayer().health);
	});
	const tb = $("#touch-action");
	if (tb)
		tb.textContent =
			game.stage === 1
				? "KNIFE"
				: nearBell()
					? "RING"
					: game.players[0].swinging >= 0
						? "RELEASE"
						: "JUMP";
	let banner = $("#stage-banner");
	if (now < bannerUntil && mode === "playing") {
		if (!banner) {
			banner = document.createElement("div");
			banner.id = "stage-banner";
			banner.className = "banner";
			ui.append(banner);
		}
		const c = CHAPTERS[game.stage];
		banner.innerHTML = `<div class="banner-top">THE SUNBELL EXPEDITION · 0${game.stage + 1}</div><h2>${c.name}</h2><p>${c.goal}</p>`;
	} else banner?.remove();
	let toastEl = ui.querySelector(".toast");
	if (now < toastUntil) {
		if (!toastEl) {
			toastEl = document.createElement("div");
			toastEl.className = "toast";
			ui.append(toastEl);
		}
		toastEl.textContent = toastText;
	} else toastEl?.remove();
	const d = $("#debug-state");
	if (d)
		d.textContent = `${renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2"} · ${frameCount} frames · bodies ${game.world.bodies.len()} · x ${game.players[0].x.toFixed(1)} y ${game.players[0].y.toFixed(1)}`;
}
function resize() {
	const w = innerWidth,
		h = innerHeight;
	renderer.setSize(w, h);
	const span = w / h < 1.1 ? 25 : 20;
	camera.left = (-span * w) / h / 2;
	camera.right = (span * w) / h / 2;
	camera.top = span / 2;
	camera.bottom = -span / 2;
	camera.updateProjectionMatrix();
}
function updateCamera(dt) {
	let target = mode === "title" ? 15.5 : game.players[0].x + 7;
	if (game.players.length > 1)
		target =
			(Math.min(...game.players.map((p) => p.x)) +
				Math.max(...game.players.map((p) => p.x))) /
				2 +
			5;
	target = clamp(target, 10, CHAPTERS[game.stage].length - 8);
	cameraX += (target - cameraX) * Math.min(1, dt * 3.5);
	const cy =
		game.stage === 0
			? 8.1
			: game.stage === 1
				? 6
				: game.stage === 2
					? 6.5 + Math.max(0, cameraX - 12) * 0.035
					: 7;
	shake = Math.max(0, shake - dt);
	const jitter = settings.shake ? shake * 0.35 : 0;
	camera.position.set(cameraX + (Math.random() - 0.5) * jitter, cy + 7, 36);
	camera.lookAt(cameraX, cy, 0);
}
function update(dt, now) {
	pollPads(now);
	if (mode === "title" && now - lastActivity >= 10000 && !net.active)
		startAttract();
	if (mode === "hub-wait" && net.canPlay) {
		setMode("playing");
		showBanner();
	}
	const active =
		["playing", "attract", "transition"].includes(mode) &&
		!(net.hubActive && net.ended);
	if (active) {
		const local = readInput(1);
		if (net.active && mode !== "attract") {
			const seat = networkSeat();
			if (seat) {
				const input = seat === 1 ? local : local;
				net.sendInput(input);
			}
			if (net.isHost) {
				if (
					mode === "playing" &&
					!networkPaused &&
					(!net.hubActive || net.canPlay)
				) {
					const inputs = { 1: {}, 2: {} };
					for (const p of game.players) {
						const inp = remoteInputs[p.id] || {};
						inputs[p.id] = { ...inp };
						remoteInputs[p.id] = { ...inp, jump: false, action: false };
					}
					game.step(dt, inputs);
				}
				if (mode === "transition") {
					transitionTimer -= dt;
					if (transitionTimer <= 0) {
						game.next();
						if (!game.won) {
							setMode("playing");
							showBanner();
						}
					}
				}
				net.sendState(networkSnapshot());
			}
		} else {
			if (mode === "playing" || mode === "attract")
				game.step(dt, { 1: local, 2: readInput(2) });
			if (game.pending && transitionTimer > 0) {
				transitionTimer -= dt;
				if (transitionTimer <= 0) {
					game.next();
					if (!game.won && mode !== "attract") {
						setMode("playing");
						showBanner();
					}
				}
			}
			if (mode === "attract" && game.won) {
				transitionTimer -= dt;
				if (transitionTimer <= 0) {
					game.restart();
					game.auto = true;
					game.god = true;
					attractCycles++;
				}
			}
		}
	} else if (net.active && net.isHost && mode === "pause")
		net.sendState(networkSnapshot());
	clearEdges();
	const visual = game.visual();
	visual.time = active ? game.time : game.time + now * 0.00015;
	visual.won = mode === "victory";
	if (mode === "title") {
		visual.time = now * 0.001;
		visual.vines = game.vines.map((v, i) => ({
			...v,
			angle: Math.sin(now * 0.0008 + i * 0.65) * 0.6,
		}));
		const rope = visual.vines[1];
		const angle = rope.angle;
		visual.player = {
			...game.players[0],
			x: rope.x + Math.sin(angle) * rope.length,
			y: rope.y - Math.cos(angle) * rope.length - 1.5,
			vx: 2,
			onGround: false,
			swinging: 1,
		};
	}
	if (visual.ghost) visual.ghost = { ...visual.ghost, stage: game.stage };
	world.update(dt, visual);
	updateCamera(dt);
	audio.update(dt, {
		stage: game.stage,
		mode,
		playing: active && !networkPaused,
	});
	if (now - uiTick > 100) {
		showDynamicHUD(now);
		uiTick = now;
	}
}
let recoveringGraphics = false;
function renderFrame(now) {
	if (!booted || recoveringGraphics) return;
	const dt = Math.min(0.05, (now - (lastNow || now - 16.667)) / 1000);
	lastNow = now;
	try {
		update(dt, now);
		renderer.render(scene, camera);
		frameCount++;
	} catch (err) {
		if (
			renderer.backend.isWebGPUBackend &&
			/device|Instance|GPU/i.test(err.message)
		) {
			recoverGraphics();
			return;
		}
		console.error("Game loop:", err);
		globalThis.__JUNGLE.lastError = err.message;
	}
}
async function createGameRenderer(forceWebGL = false) {
	const options = { canvas: $("#view"), antialias: true, forceWebGL };
	let adapter = null;
	if (!forceWebGL && navigator.gpu) {
		try {
			adapter = await navigator.gpu.requestAdapter({
				powerPreference: "high-performance",
			});
			if (adapter)
				options.device = await adapter.requestDevice({
					requiredFeatures: [...adapter.features],
				});
		} catch {}
	}
	const result = new THREE.WebGPURenderer(options);
	result.retainedAdapter = adapter;
	result.lossSignal = new Promise((resolve) => {
		result.onDeviceLost = (info) => {
			result.lossInfo = info;
			resolve(info);
			if (booted && renderer === result) recoverGraphics();
		};
	});
	return result;
}
function configureRenderer() {
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
}
async function compileScene() {
	const current = renderer;
	if (current.lossSignal)
		await Promise.race([
			current.compileAsync(scene, camera),
			current.lossSignal.then(() => {
				throw new Error("Graphics device lost during initialization");
			}),
		]);
	else await current.compileAsync(scene, camera);
}
async function recoverGraphics() {
	if (
		recoveringGraphics ||
		renderer.isHeadlessServer ||
		!renderer.backend.isWebGPUBackend
	)
		return;
	recoveringGraphics = true;
	const old = renderer;
	try {
		old.setAnimationLoop(null);
	} catch {}
	let replacement = null;
	let lastError = null;
	for (let attempt = 0; attempt < 6 && !replacement; attempt++) {
		if (attempt)
			await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
		try {
			const canvas = document.createElement("canvas");
			canvas.id = "view";
			canvas.setAttribute("aria-label", "Jungle Scurry game world");
			const context = canvas.getContext("webgl2", {
				antialias: true,
				alpha: true,
				depth: true,
			});
			if (!context)
				throw new Error("The browser is restoring its graphics context.");
			const candidate = new THREE.WebGPURenderer({
				canvas,
				context,
				antialias: true,
				forceWebGL: true,
			});
			candidate.setPixelRatio(Math.min(devicePixelRatio, 2));
			candidate.outputColorSpace = THREE.SRGBColorSpace;
			candidate.toneMapping = THREE.ACESFilmicToneMapping;
			candidate.toneMappingExposure = 1.15;
			await candidate.init();
			candidate.setSize(innerWidth, innerHeight);
			await candidate.compileAsync(scene, camera);
			candidate.render(scene, camera);
			replacement = candidate;
		} catch (error) {
			lastError = error;
		}
	}
	if (replacement) {
		$("#view").replaceWith(replacement.domElement);
		renderer = replacement;
		resize();
		if (globalThis.__JUNGLE) {
			globalThis.__JUNGLE.renderer = renderer;
			delete globalThis.__JUNGLE.lastError;
		}
		try {
			old.dispose();
		} catch {}
		recoveringGraphics = false;
		if (booted) renderer.setAnimationLoop(renderFrame);
	} else {
		recoveringGraphics = false;
		console.error("Graphics recovery:", lastError);
		if (globalThis.__JUNGLE) globalThis.__JUNGLE.lastError = lastError?.message;
	}
}
async function boot() {
	try {
		$("#load-text").textContent = "Unrolling the jungle…";
		setupNet();
		const hubInfo = await net.init();
		const dedicated = net.server;
		await RAPIER.init();
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xa4c9a5);
		scene.fog = new THREE.Fog(0xa4c9a5, 42, 125);
		camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 180);
		const params = new URLSearchParams(location.search);
		renderer = dedicated
			? {
					backend: { isWebGPUBackend: false },
					isHeadlessServer: true,
					setSize() {},
					setPixelRatio() {},
					init: async () => {},
					compileAsync: async () => {},
					render() {},
					setAnimationLoop(fn) {
						function tick(t) {
							fn(t);
							requestAnimationFrame(tick);
						}
						requestAnimationFrame(tick);
					},
				}
			: await createGameRenderer(params.get("renderer") === "webgl");
		configureRenderer();
		try {
			await renderer.init();
		} catch (error) {
			if (renderer.backend.isWebGPUBackend) await recoverGraphics();
			else throw error;
		}
		$("#load-text").textContent = "Finding the Professor…";
		game = new JungleGame(RAPIER, onGameEvent);
		world = dedicated
			? { setStage() {}, update() {} }
			: createWorld(THREE, scene);
		resize();
		window.addEventListener("resize", resize);
		setMode(hubInfo ? "hub-wait" : "title");
		updateCamera(1);
		try {
			await compileScene();
		} catch (error) {
			if (renderer.backend.isWebGPUBackend) await recoverGraphics();
			else throw error;
		}
		renderer.render(scene, camera);
		frameCount++;
		$("#loading").hidden = true;
		booted = true;
		globalThis.__JUNGLE = {
			ready: true,
			game,
			audio,
			net,
			world,
			renderer,
			settings,
			chapters: CHAPTERS,
			state: () => ({
				mode,
				stage: game.stage,
				won: game.won,
				pending: game.pending,
				elapsed: game.elapsed,
				score: game.score,
				fruit: game.fruit,
				bells: game.bells,
				statistics: { ...game.statistics },
				players: game.snapshot().players,
				backend: renderer.isHeadlessServer
					? "Dedicated server"
					: renderer.backend.isWebGPUBackend
						? "WebGPU"
						: "WebGL2",
				frameCount,
				lastInput,
				attractCycles,
				network: net.mode,
				networkStats: net.stats,
				music: settings.music,
			}),
			start: (coop = false) => startGame(coop),
			pause,
			goTitle,
			attract: startAttract,
			setMode,
			action: doAction,
			step: (frames = 1, input = {}) => {
				for (let i = 0; i < frames; i++) {
					game.step(1 / 60, { 1: input });
					if (game.pending) {
						game.next();
						if (game.won) break;
					}
				}
			},
			render: () => {
				world.update(0, game.visual());
				renderer.render(scene, camera);
			},
			offlineAudio: () => JungleAudio.renderOfflineTest(),
		};
		if (hubInfo) {
			game.setCoop(net.players.length > 1);
			setMode("hub-wait");
			net.ready();
		}
		renderer.setAnimationLoop(renderFrame);
	} catch (err) {
		console.error(err);
		$("#load-text").textContent =
			"The expedition could not open: " + err.message;
		$("#loading .loading-line")?.remove();
		const btn = document.createElement("button");
		btn.className = "btn primary";
		btn.textContent = "Try again";
		btn.onclick = () => location.reload();
		if (!net?.hubActive) $("#loading>div").append(btn);
		globalThis.__JUNGLE = { ready: false, error: err.message };
		globalThis.AIHub?.active && globalThis.AIHub.fail(err.message);
	}
}
window.addEventListener("keydown", (e) => {
	if (net?.hubActive && net.ended) return;
	if (e.target.matches("input,textarea")) {
		activity("keyboard");
		if (e.code === "Escape") {
			e.target.blur();
			back();
		}
		return;
	}
	const exited = activity("keyboard");
	unlock();
	if (exited) {
		e.preventDefault();
		return;
	}
	if (!keys.has(e.code)) edges.add(e.code);
	keys.add(e.code);
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Tab",
		].includes(e.code)
	)
		e.preventDefault();
	if (!booted) return;
	if (e.code === "Escape" || e.code === "KeyP") {
		pause();
		if (mode !== "pause" && mode !== "playing") back();
		return;
	}
	if (!["playing", "attract", "transition"].includes(mode)) {
		if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
			menuMove(e.shiftKey ? -1 : 1);
		else if (e.code === "ArrowUp" || e.code === "KeyW") menuMove(-1);
		else if (e.code === "ArrowLeft" || e.code === "KeyA") menuAdjust(-1);
		else if (e.code === "ArrowRight" || e.code === "KeyD") menuAdjust(1);
		else if ((e.code === "Enter" || e.code === "Space") && !e.repeat)
			activateFocus();
		else if (e.code === "Backspace") back();
		else if (e.code === "PageDown" || e.code === "PageUp") {
			const scroll = ui.querySelector(".scroll");
			if (scroll)
				scroll.scrollTop +=
					(e.code === "PageDown" ? 1 : -1) * scroll.clientHeight * 0.75;
		}
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	edges.clear();
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) {
		const now = performance.now();
		if (now - lastPointerMove > 200) {
			activity("keyboard");
			lastPointerMove = now;
		}
	}
});
window.addEventListener("pointerdown", (e) => {
	if (net?.hubActive && net.ended) return;
	const type = e.pointerType === "touch" ? "touch" : "keyboard";
	if (activity(type)) return;
	unlock();
	if (e.target.closest("button,input,textarea,.scroll")) return;
	if (mode !== "playing") return;
	if (type === "touch") {
		touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			t: performance.now(),
			lastX: e.clientX,
			lastY: e.clientY,
		});
	} else if (e.button === 0) edges.add("Mouse0");
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType !== "touch") return;
	const touch = touches.get(e.pointerId);
	if (!touch) return;
	touch.lastX = e.clientX;
	touch.lastY = e.clientY;
	touchAxis = {
		x: clamp((e.clientX - touch.x) / 65, -1, 1),
		y: clamp((touch.y - e.clientY) / 65, -1, 1),
	};
});
function endTouch(e) {
	const touch = touches.get(e.pointerId);
	if (!touch) return;
	if (
		performance.now() - touch.t < 250 &&
		Math.hypot(touch.lastX - touch.x, touch.lastY - touch.y) < 18
	)
		touchJump = true;
	touches.delete(e.pointerId);
	if (!touches.size) touchAxis = { x: 0, y: 0 };
}
window.addEventListener("pointerup", endTouch);
window.addEventListener("pointercancel", endTouch);
window.addEventListener("contextmenu", (e) => e.preventDefault());
boot();
