import { Synth } from "./audio.mjs";
import credits from "./credits.json";
import { View } from "./render.mjs";
import { DEFAULTS, Game, RAPIER, river, SECTORS } from "./simulation.mjs";

const $ = (s) => document.querySelector(s),
	ui = $("#ui");
const settings = {
	music: 0.1,
	sfx: 0.7,
	voices: true,
	shake: !matchMedia("(prefers-reduced-motion: reduce)").matches,
	glyphs: "ps",
	autofire: false,
	mute: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("renegade-settings") || "{}"),
	);
} catch {}
const sound = new Synth(settings),
	view = new View();
let game,
	preview,
	remote = null,
	mode = "loading",
	stack = [],
	pilotCount = 1,
	hub = null,
	hubStarted = false,
	hubEnded = false,
	hubFinished = false,
	ready = false;
let lastInput = "keyboard",
	idleAt = performance.now(),
	lastTick = 0,
	acc = 0,
	launchAt = 0,
	showRadioUntil = 0,
	radioText = "",
	sectorUntil = 0,
	sectorIndex = -1,
	lastNet = 0,
	lastInputNet = 0,
	netEvents = [],
	lastNetBytes = 0;
let attractTuning = null,
	attractAt = 0,
	attractSegment = 0,
	scoreBest = 0,
	focusIndex = 0,
	aboutPage = 0,
	manualPage = 0,
	_mutedBeforeEnd = false;
let testFreeze = new URLSearchParams(location.search).has("test"),
	inputsOverride = null,
	renderEnabled = true;
const keys = new Set(),
	mouse = { active: false, x: 0, fire: false, pulse: false },
	touch = { active: false, x: 0, y: 0, id: null, ox: 0, oy: 0, pulse: false };
let touchMode = matchMedia("(pointer:coarse)").matches;
const navStates = new Map();
const remoteInputs = {},
	remoteInputAt = {},
	liveIds = new Set(),
	previousPads = new Map();
let suppressClickUntil = 0;
try {
	scoreBest = Number(localStorage.getItem("renegade-best") || 0);
} catch {}
if (touchMode) document.body.classList.add("touch");
function persist() {
	try {
		localStorage.setItem("renegade-settings", JSON.stringify(settings));
	} catch {}
}
function glyph(action) {
	if (lastInput === "touch")
		return (
			{
				accept: "TAP",
				fire: "AUTO",
				pulse: "TAP",
				pause: "Ⅱ",
				move: "DRAG",
				back: "BACK",
			}[action] || action
		);
	if (lastInput === "pad") {
		const map =
			settings.glyphs === "xbox"
				? {
						accept: "A",
						fire: "RT",
						pulse: "X",
						pause: "☰",
						move: "LS",
						back: "B",
					}
				: {
						accept: "×",
						fire: "R2",
						pulse: "□",
						pause: "☰",
						move: "L",
						back: "○",
					};
		return map[action] || action;
	}
	return (
		{
			accept: "ENTER",
			fire: lastInput === "mouse" ? "LMB" : "SPACE",
			pulse: lastInput === "mouse" ? "RMB" : "SHIFT",
			pause: "ESC",
			move: lastInput === "mouse" ? "MOUSE" : "WASD",
			back: "ESC",
		}[action] || action
	);
}
function g(action) {
	return `<span class="glyph ${lastInput === "pad" ? "pad" : ""}" data-glyph="${action}">${glyph(action)}</span>`;
}
function updateGlyphs() {
	for (const e of document.querySelectorAll("[data-glyph]")) {
		e.textContent = glyph(e.dataset.glyph);
		e.classList.toggle("pad", lastInput === "pad");
	}
}
function device(d) {
	if (lastInput !== d) {
		lastInput = d;
		updateGlyphs();
	}
}
function wake(d) {
	idleAt = performance.now();
	device(d);
	if (hubEnded) return false;
	if (mode === "attract") {
		toTitle();
		suppressClickUntil = performance.now() + 220;
		return false;
	}
	return true;
}
function focusables() {
	return [
		...(ui.querySelector(".overlay") || ui).querySelectorAll(
			"button:not([disabled]),input[type=range]:not([disabled]),select:not([disabled])",
		),
	].filter((e) => !e.closest(".hidden"));
}
function focusAt(i, quiet = false) {
	const list = focusables();
	if (!list.length) return;
	focusIndex = (i + list.length) % list.length;
	ui.querySelectorAll(".focused").forEach((e) => {
		e.classList.remove("focused");
	});
	const e = list[focusIndex];
	e.classList.add("focused");
	if (lastInput === "pad" || lastInput === "keyboard") {
		e.focus({ preventScroll: true });
		e.scrollIntoView({ block: "nearest" });
	}
	if (!quiet) sound.sfx("menu");
}
function chooseFocus() {
	const l = focusables(),
		first = l.findIndex(
			(e) => e.hasAttribute("data-first") || e.classList.contains("primary"),
		);
	focusAt(first >= 0 ? first : 0, true);
}
function modal(content, cls = "") {
	return `<section class="overlay ${cls}"><div class="modal">${content}</div></section>`;
}
function backButton() {
	return `<button class="back" data-action="back">${g("back")}Back</button>`;
}
function menuFoot(text = "Left stick / arrows to choose") {
	return `<footer><span class="small">${lastInput === "pad" ? `Left stick to choose · ${glyph("accept")} to select` : touchMode ? "Tap an option to choose" : text}</span><span class="small">${view.backend || "WebGPU"} · r180</span></footer>`;
}
function titleHTML() {
	return `<section class="screen title-screen"><div class="brand eyebrow"><span class="roundel">↗</span>Renegade Flight Co. <span style="opacity:.45">/ 01</span></div><div class="title-copy"><div class="edition eyebrow">A river. A jet. A little trouble.</div><h1 class="logo display"><span class="river">River</span><span class="renegade">Renegade</span></h1><p class="tagline">LOW FLIGHT. HIGH STAKES.</p><p class="intro">Three bridges stand between you and open water.<br>Keep flying. Keep firing. Keep some fuel.</p><div class="title-actions"><button class="primary" data-action="solo" data-first>${g("accept")}Fly solo<span class="arrow">↗</span></button><button class="secondary" data-action="coop">Fly with a wingmate<span class="arrow">＋</span></button></div><nav class="title-nav"><button data-action="manual">Flight manual</button><button data-action="settings">Settings</button><button data-action="about">About & credits</button></nav></div><div class="title-footer"><span>1–2 LOCAL · 1–4 VIA AI HUB</span><span>BEST ${Math.floor(scoreBest).toString().padStart(6, "0")} · EST. 1982</span></div><div class="title-stamp">THROTTLE.<br>REFUEL.<br>REPEAT. ↗</div><div class="flight-mark"><strong>JADE REACH</strong>35° N / KEEP IT LOW</div></section>`;
}
function hudHTML() {
	return `<section class="hud" id="hud"><div class="hud-top"><div class="scorebox"><span class="eyebrow">SORTIE SCORE</span><strong id="score">000000</strong><span class="eyebrow" id="combo">GOLDEN CURRENT</span></div><div class="route-box"><div class="sector" id="sector">JADE REACH</div><div class="route"><span class="node" id="node0">1</span><span class="line"></span><span class="node" id="node1">2</span><span class="line"></span><span class="node" id="node2">3</span><span class="line"></span><span style="font-size:12px">⚑</span></div></div><button class="pause-button" data-action="pause" aria-label="Pause">${g("pause")}</button></div><div class="pilot-strip" id="pilots"></div><div class="pulse-state" id="pulse">${g("pulse")}PULSE READY<small>EMERGENCY CLEARANCE · 12 FUEL</small></div><button class="touch-pulse" id="touchpulse" data-action="pulse">PULSE<br>↗</button><div class="radio hidden" id="radio"></div><div class="tutorial hidden" id="tutorial">${g("move")}Steer / throttle${g("fire")}Fire${g("pulse")}Pulse</div><div class="sector-flash hidden" id="sectorflash"></div><div class="bossbar hidden" id="bossbar"><small id="bossname">IRON HERON · BREAK THE TURRETS</small><div class="track"><div class="fill" id="bossfill"></div></div></div></section>`;
}
function briefHTML() {
	return modal(
		`<div class="eyebrow" style="color:var(--red)">SORTIE BRIEF / ${pilotCount === 2 ? "TWO PILOTS" : "SOLO FLIGHT"}</div><h1 class="display">Golden Current</h1><p class="lede">The river is your runway. Clear three bridges, then send the Iron Heron to the bottom.</p><div class="brief-route"><article><span class="number">01</span><h3>JADE REACH</h3><p>Tankers. Choppers.<br>Get your river legs.</p></article><article><span class="number">02</span><h3>COPPER NARROWS</h3><p>Tighter turns.<br>Faster company.</p></article><article><span class="number">03</span><h3>IRON DELTA</h3><p>Break the blockade.<br>Make it to open water.</p></article></div><div class="keyline">${g("move")}Steer & throttle &nbsp; ${g("fire")}Fire &nbsp; ${g("pulse")}Pulse<br><span class="small">Release fire over a green fuel dock. Slow down to fill up.</span>${pilotCount === 2 ? '<br><span class="small">Pilot 2: arrows · Enter to fire · Right Shift to pulse, or a second gamepad.</span>' : ""}${touchMode ? '<br><span class="small">Touch: drag anywhere to steer. Guns fire automatically; fuel docks stop them.</span>' : ""}</div><footer><button data-action="back">Back</button><button class="primary" data-action="launch" data-first>${g("accept")}Take off ↗</button></footer>`,
	);
}
function pauseHTML() {
	const s = current();
	return modal(
		`<div class="eyebrow">${hub ? "AI HUB / YOUR WING KEEPS FLYING" : "FLIGHT ON HOLD"}</div><h1 class="display">Catch your breath.</h1><p class="lede">${SECTORS[Math.min(2, Math.floor(s.progress / 870))].name} · ${s.bridges}/3 bridges cleared</p><div class="options"><button class="primary" data-action="resume" data-first>${g("accept")}Resume sortie ↗</button><button data-action="dev">Flight deck <span class="small">/ developer tools</span></button><button data-action="settings">Settings</button><button data-action="manual">Flight manual</button>${!hub ? '<button data-action="quit">End sortie</button>' : ""}</div>${menuFoot()}`,
	);
}
function slider(id, label, value, min, max, step = 1, unit = "") {
	return `<div class="settings-row"><label for="${id}">${label}<output id="out-${id}">${value}${unit}</output></label><input id="${id}" data-setting="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}" data-unit="${unit}"></div>`;
}
function settingsHTML() {
	return modal(
		`${backButton()}<div class="eyebrow">YOUR FLIGHT / YOUR RULES</div><h1 class="display">Tune in.</h1>${slider("music", "Music", Math.round(settings.music * 100), 0, 100, 1, "%")}${slider("sfx", "Effects", Math.round(settings.sfx * 100), 0, 100, 1, "%")}<div class="settings-row"><label>Radio voices</label><button data-action="toggle-voices">${settings.voices ? "Gibberish on" : "Off"}</button></div><div class="settings-row"><label>Screen shake</label><button data-action="toggle-shake">${settings.shake ? "On" : "Off"}</button></div><div class="settings-row"><label>Automatic fire</label><button data-action="toggle-autofire">${settings.autofire ? "On" : "Off"}</button></div><div class="settings-row"><label>Controller glyphs</label><button data-action="toggle-glyphs">${settings.glyphs === "ps" ? "PlayStation" : "Xbox · A B X Y"}</button></div>${menuFoot("Arrows to choose · left / right to adjust")}`,
	);
}
const devFields = [
	["speed", "Cruise speed", 8, 34, 0.5],
	["steering", "Steering", 8, 36, 1],
	["fuelBurn", "Fuel burn / sec", 0, 4, 0.05],
	["refuelRate", "Refuel / sec", 5, 60, 1],
	["damage", "Damage per hit", 0, 3, 0.25],
	["enemyRate", "Enemy fire rate", 0.2, 3, 0.1],
	["fireRate", "Cannon / sec", 3, 16, 0.5],
	["pulseCost", "Pulse fuel cost", 0, 30, 0.5],
	["pulseCooldown", "Pulse recharge / sec", 1, 20, 0.5],
];
function devHTML() {
	const locked = hub && !hub.isHost;
	return modal(
		`${backButton()}<div class="eyebrow">FLIGHT DECK / LIVE BALANCE</div><h1 class="display">Under the cowling.</h1>${locked ? '<p class="lede">The host owns this flight deck. Settings below show the local defaults.</p>' : ""}${devFields.map(([id, n, min, max, step]) => slider(`dev-${id}`, n, game.tuning[id], min, max, step)).join("")}<div class="tool-buttons"><button data-action="god">${game.god ? "✓ " : ""}Invulnerable</button><button data-action="noFuel">${game.noFuel ? "✓ " : ""}Infinite fuel</button><button data-action="bot">${game.autopilot ? "✓ " : ""}Autopilot</button><button data-action="replenish">Repair & refuel</button><button data-action="restock">Restock reserves</button></div><div class="tool-buttons"><button data-action="warp-0">Jade Reach</button><button data-action="warp-840">Copper Narrows</button><button data-action="warp-1740">Iron Delta</button><button data-action="warp-2680">Final blockade</button></div><footer><button data-action="reset-tuning">Reset defaults</button><button class="primary" data-action="resume">Resume sortie ↗</button></footer>`,
		"dev",
	);
}
function manualHTML() {
	return modal(
		`${backButton()}<div class="eyebrow">RENEGADE FIELD GUIDE / ${manualPage + 1} OF 2</div><h1 class="display">${manualPage ? "Know the river." : "Keep it low."}</h1>${manualPage ? `<div class="manual-grid"><article><h3>Bridge = checkpoint</h3><p>Break the span before you reach it. A cleared bridge repairs one hull pip and adds 25 fuel. If the sortie ends, retry from your last bridge.</p></article><article><h3>Mind your reserves</h3><p>Three hull pips per jet. Three jets per pilot. A collision costs a pip; an empty tank costs a jet. Every 10,000 points earns a reserve.</p></article><article><h3>Make a little trouble</h3><p>Chain kills within 3.5 seconds for up to ×4 points. Gold crates give twin guns for 24 seconds. Green crates repair your hull.</p></article><article><h3>Break the blockade</h3><p>The Iron Heron's two turrets protect its core. Destroy both, crack the core, then fly into open water. Wingmates share the route, each flying their own jet.</p></article></div>` : `<div class="manual-grid"><article><h3>Fly the river</h3><p>Stick or WASD: left / right to steer, up to accelerate, down to brake. Stay between the banks. Mouse movement steers; hold the left button to fire.</p></article><article><h3>Fire straight ahead</h3><p>${g("fire")}Hold to shoot. Tankers, choppers and bridges are fair game. Watch for crossing jets, drifting mines and aimed enemy fire.</p></article><article><h3>Fuel is your lifeline</h3><p>Fly over green FUEL docks to fill your tank. Release fire and slow down: docks can be destroyed for 80 points. Choose fuel or glory.</p></article><article><h3>Keep a pulse handy</h3><p>${g("pulse")}Clear nearby bullets and damage enemies ahead. Costs 12 fuel, recharges in 10 seconds. Touch: drag to fly, auto-fire stops at fuel; tap PULSE when ready.</p></article></div>`}<div class="keyline">Pilot 1: WASD · Space · Left Shift &nbsp; | &nbsp; Pilot 2: arrows · Enter · Right Shift<br><span class="small">Standard gamepads: left stick · Cross / RT to fire · Square to pulse · Options to pause. In AI Hub, each device flies one pilot.</span></div><footer><span class="small">${manualPage ? "Score targets: boat 30 · heli 60 · jet 100 · bridge 500" : "Mouse: steer · left click fire · right click pulse · Esc pause"}</span><button class="primary" data-action="manual-next">${manualPage ? "← Flight basics" : "The next page →"}</button></footer>`,
	);
}
const sourceKeys = [
	["date", "source", "plan", "genre", "perspective"],
	["tech", "artDirection", "animation", "audio"],
	["online", "testing", "research", "environment", "model", "usage"],
];
function aboutHTML() {
	let heading, content;
	if (aboutPage < 3) {
		heading = "Source information";
		content = `<div class="credits-list">${sourceKeys[aboutPage].map((k) => `<div class="credit"><b>${k.replace(/([A-Z])/g, " $1")}</b><span>${credits.sourceInformation[k]}</span></div>`).join("")}</div>`;
	} else {
		const data =
			aboutPage === 3
				? credits.testingFeedback
				: aboutPage === 4
					? credits.engineFeedback
					: credits.promptFeedback;
		const questions =
			aboutPage === 3
				? [
						"Issues caught",
						"Critical / game breaking",
						"Most helpful test",
						"Least helpful test",
					]
				: aboutPage === 4
					? [
							"What worked well",
							"Stuck or guessed wrong",
							"Built by hand",
							"Hardest engine work",
							"Engine changes",
							"One engine wish",
						]
					: ["Liked most", "Confusing", "Hardest part", "Suggested change"];
		heading =
			aboutPage === 3
				? "Testing feedback"
				: aboutPage === 4
					? "Engine feedback"
					: "Prompt feedback";
		content = data
			.map(
				(v, i) => `<div class="feedback-item"><b>${questions[i]}</b>${v}</div>`,
			)
			.join("");
	}
	return modal(
		`${backButton()}<div class="eyebrow">RIVER RENEGADE / FLIGHT RECORD</div><h1 class="display" style="font-size:clamp(30px,3vw,52px)">${heading}</h1><nav class="credits-tabs">${["Source 1", "Source 2", "Source 3", "Testing", "Engine", "Prompt"].map((x, i) => `<button class="${aboutPage === i ? "selected" : ""}" data-action="about-${i}">${x}</button>`).join("")}</nav>${content}<footer><span class="small">An original tribute to Carol Shaw's River Raid.<br>All models, animation and sound made in code.</span><button data-action="about-next">Next →</button></footer>`,
	);
}
function resultHTML() {
	const s = current(),
		accuracy = s.metrics.shots
			? Math.round((s.metrics.hits / s.metrics.shots) * 100)
			: 0;
	return modal(
		`<div class="eyebrow">${s.won ? "OPEN WATER / MISSION COMPLETE" : "SORTIE ENDED / THE RIVER KEEPS GOING"}</div><h1 class="display">${s.won ? "Clear skies, Renegade." : "Down, not out."}</h1><p class="lede">${s.won ? "Three bridges down. One blockade broken. That is how you make an entrance." : "The next jet is waiting. Take another run at the river."}</p><div class="result-stats"><div><strong>${s.score.toString().padStart(6, "0")}</strong><small>SORTIE SCORE</small></div><div><strong>${s.bridges} / 3</strong><small>BRIDGES</small></div><div><strong>${Math.min(100, accuracy)}%</strong><small>ACCURACY</small></div></div><div class="options"><button class="primary" data-action="${s.won ? "again" : "retry"}" data-first>${g("accept")}${s.won ? "Fly again" : "Retry from checkpoint"} ↗</button><button data-action="quit">Return to title</button><button data-action="about">Flight record & credits</button></div>`,
	);
}
function current() {
	return hub && !hub.isHost && remote
		? remote
		: game?.snapshot() || preview?.snapshot();
}
function rebuild() {
	let h = "";
	if (mode === "title") h = titleHTML();
	else if (mode === "brief") h = briefHTML();
	else if (
		[
			"play",
			"pause",
			"settings",
			"manual",
			"about",
			"dev",
			"result",
			"attract",
		].includes(mode)
	) {
		if (
			["play", "pause", "attract"].includes(mode) ||
			stack.some((x) => ["play", "pause", "dev"].includes(x))
		)
			h = hudHTML();
		if (mode === "pause") h += pauseHTML();
		if (mode === "settings") h += settingsHTML();
		if (mode === "manual") h += manualHTML();
		if (mode === "about") h += aboutHTML();
		if (mode === "dev") h += devHTML();
		if (mode === "result") h += resultHTML();
		if (mode === "attract")
			h +=
				'<div class="attract-banner">AUTOPILOT / THE RIVER IS CALLING<small>ANY INPUT TO RETURN TO THE TITLE</small></div>';
	} else if (mode === "hubwait")
		h = '<div class="countdown"><span>WING FORMING</span></div>';
	else if (mode === "hubend")
		h = '<div class="countdown"><span>SORTIE COMPLETE</span></div>';
	ui.innerHTML = h;
	document.body.dataset.screen = mode;
	if (mode !== "play" && mode !== "attract") chooseFocus();
	if (mode === "dev" && hub && !hub.isHost)
		ui.querySelectorAll("input,button:not(.back)").forEach((e) => {
			e.disabled = true;
		});
	updateHUD();
}
function screen(next, push = true) {
	if (push) stack.push(mode);
	mode = next;
	rebuild();
}
function back() {
	if (hubEnded) return;
	const next = stack.pop() || "title";
	mode = next;
	rebuild();
}
function toTitle() {
	if (hub) return;
	if (attractTuning) {
		Object.assign(game.tuning, attractTuning);
		attractTuning = null;
	}
	mode = "title";
	stack = [];
	game?.takeEvents();
	idleAt = performance.now();
	acc = 0;
	launchAt = 0;
	rebuild();
}
function openPause() {
	if (mode !== "play") return;
	screen("pause");
	sound.apply();
}
function radio(text, duration = 3) {
	radioText = text;
	showRadioUntil = performance.now() + duration * 1000;
	sound.gibberish(Math.round(game?.progress || 3) % 8);
}
function launch(count = pilotCount, progress = 0) {
	pilotCount = count;
	game.reset(count, {
		progress,
		ids: hub ? hub.players.map((p) => p.id) : undefined,
	});
	game.bridges =
		progress >= 2520 ? 3 : progress >= 1670 ? 2 : progress >= 770 ? 1 : 0;
	game.checkpoint = progress;
	liveIds.clear();
	game.players.forEach((p) => {
		liveIds.add(p.id);
	});
	game.god = false;
	game.noFuel = false;
	game.autopilot = false;
	mode = "play";
	stack = [];
	launchAt = hub ? 0 : performance.now() + 2400;
	sectorIndex = -1;
	acc = 0;
	rebuild();
	if (!hub) sound.init();
	radio("Three bridges. Keep your tank full.", 4);
}
function warp(p) {
	const ids = game.players.filter((p) => !p.removed).map((p) => p.id),
		flags = { god: game.god, noFuel: game.noFuel, autopilot: game.autopilot };
	game.reset(ids.length, { progress: p, ids });
	game.bridges = p >= 2520 ? 3 : p >= 1670 ? 2 : p >= 770 ? 1 : 0;
	game.checkpoint = p;
	Object.assign(game, flags);
	sectorIndex = -1;
	launchAt = 0;
	rebuild();
}
function startAttract() {
	attractTuning = { ...game.tuning };
	game.reset(2);
	game.god = true;
	game.noFuel = true;
	game.autopilot = true;
	game.tuning.speed = 25;
	mode = "attract";
	attractAt = performance.now();
	attractSegment = 0;
	sectorIndex = -1;
	acc = 0;
	rebuild();
}
function endRun() {
	if (hub) {
		finishHub();
		return;
	}
	if (mode === "attract") {
		game.reset(2);
		game.god = true;
		game.noFuel = true;
		game.autopilot = true;
		return;
	}
	scoreBest = Math.max(scoreBest, game.score);
	try {
		localStorage.setItem("renegade-best", scoreBest);
	} catch {}
	mode = "result";
	stack = [];
	rebuild();
	sound.sfx(game.won ? "win" : "explosion");
}
function handleEvents(ev) {
	view.handle(ev);
	for (const e of ev) {
		if (e.type === "shot") sound.sfx("shot");
		if (e.type === "enemyShot") sound.sfx("enemyShot");
		if (e.type === "kill") {
			sound.sfx("explosion");
			if (e.kind === "fuel") radio("Depot down. Hope you filled up.", 2);
		}
		if (e.type === "hurt") sound.sfx("hit");
		if (e.type === "pulse") sound.sfx("pulse");
		if (e.type === "fuel") sound.sfx("fuel");
		if (e.type === "pickup") {
			sound.sfx("pickup");
			radio(
				e.kind === "upgrade"
					? "Twin guns. Twice the trouble."
					: "Hull patched. Keep flying.",
				2.5,
			);
		}
		if (e.type === "bridge") {
			sound.sfx("bridge");
			radio(
				[
					"First bridge down. Two to go.",
					"Two down. The delta is ahead.",
					"All spans clear. Break that blockade.",
				][e.index],
				3.5,
			);
		}
		if (e.type === "bossDown") {
			sound.sfx("win");
			radio("Blockade broken! Open water ahead.", 5);
		}
		if (e.type === "reserve") {
			sound.sfx("pickup");
			radio("Fresh jet on standby.", 2);
		}
		if (e.type === "crash") sound.sfx("explosion");
	}
	if (hub?.isHost) netEvents.push(...ev);
}
function updateHUD() {
	const s = current();
	if (!s || !$("#hud")) return;
	$("#score").textContent = Math.floor(s.score).toString().padStart(6, "0");
	$("#combo").textContent =
		s.combo > 1 ? `CHAIN ×${s.combo}` : "GOLDEN CURRENT";
	const sector = Math.min(
		2,
		s.progress >= 1740 ? 2 : s.progress >= 840 ? 1 : 0,
	);
	$("#sector").textContent = SECTORS[sector].name;
	for (let i = 0; i < 3; i++)
		$(`#node${i}`).classList.toggle("done", i < s.bridges);
	const localId = hub ? hub.me : 0;
	const pilots = hub
		? s.players.filter((p) => p.id === localId || hub.server)
		: s.players;
	let cards = "";
	for (const p of pilots) {
		let name =
			hub?.players.find((v) => v.id === p.id)?.name || `PILOT ${p.id + 1}`;
		name = name.replace(
			/[&<>"']/g,
			(c) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[c],
		);
		cards += `<div class="pilot-card"><div class="pilot-head"><span>${name}</span><span class="hearts">${"●".repeat(Math.max(0, Math.ceil(p.hp)))}${"○".repeat(Math.max(0, 3 - Math.ceil(p.hp)))}</span></div><div class="fuel-line"><div class="fuel-bar"><div class="fuel-fill" style="width:${p.fuel}%;background-color:${p.fuel < 25 ? "var(--red)" : "var(--gold)"}"></div></div><b class="${p.fuel < 25 ? "low" : ""}">${Math.ceil(p.fuel)}%</b></div><div class="pilot-foot"><span>${p.lives <= 0 ? "OUT OF JETS" : p.respawn > 0 ? "REDEPLOYING…" : `JET ${Math.max(1, 4 - p.lives)} / ${Math.max(3, p.lives)}`}</span><span class="${p.refueling ? "refueling" : ""}">${p.refueling ? "↑ REFUELING" : p.twin > 0 ? `TWIN GUNS ${Math.ceil(p.twin)}s` : p.fuel < 25 ? "LOW FUEL" : "FUEL"}</span></div></div>`;
	}
	$("#pilots").innerHTML = cards;
	const p = s.players.find((p) => p.id === localId) || s.players[0];
	if (p) {
		$("#pulse").innerHTML =
			`${g("pulse")}${p.pulse > 0 ? `PULSE ${Math.ceil(p.pulse)}s` : p.fuel < game.tuning.pulseCost ? "NEED FUEL" : "PULSE READY"}<small>${p.pulse > 0 ? "RECHARGING" : `EMERGENCY CLEARANCE · ${game.tuning.pulseCost} FUEL`}</small>`;
		$("#touchpulse").classList.toggle(
			"ready",
			touchMode &&
				p.pulse <= 0 &&
				p.fuel >= game.tuning.pulseCost &&
				p.respawn <= 0,
		);
	}
	const now = performance.now(),
		radioNode = $("#radio");
	radioNode.classList.toggle(
		"hidden",
		now > showRadioUntil || mode === "attract",
	);
	radioNode.innerHTML = `<span class="call">TOWER /</span>${radioText}`;
	$("#tutorial").classList.toggle(
		"hidden",
		mode !== "play" ||
			s.time < 1.2 ||
			s.time > 9 ||
			now < showRadioUntil ||
			touchMode,
	);
	const f = $("#sectorflash");
	if (sectorIndex !== sector) {
		sectorIndex = sector;
		sectorUntil = now + 2500;
	}
	f.classList.toggle("hidden", now > sectorUntil || s.time < 0.1);
	f.innerHTML = `<strong>${SECTORS[sector].name}</strong><small>${SECTORS[sector].sub}</small>`;
	const boss = s.entities.find((e) => e.type === "boss");
	$("#bossbar").classList.toggle("hidden", !boss || s.progress < 2640);
	if (boss) {
		const shield = s.entities.some((e) => e.type === "bossTurret");
		$("#bossname").textContent = shield
			? "IRON HERON · BREAK THE TWO TURRETS"
			: "IRON HERON · CORE EXPOSED";
		$("#bossfill").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
	}
	let c = $("#count");
	const left =
		hub && !hubStarted
			? 0
			: hub
				? Math.max(0, -AIHub.time() / 1000)
				: Math.max(0, (launchAt - now) / 1000);
	if (left > 0 && mode === "play") {
		if (!c) {
			c = document.createElement("div");
			c.id = "count";
			c.className = "countdown";
			ui.append(c);
		}
		c.innerHTML = `<strong>${Math.ceil(left)}</strong><span>WINGS LEVEL</span>`;
	} else c?.remove();
}
function applySlider(el) {
	const id = el.dataset.setting,
		v = Number(el.value);
	if (id.startsWith("dev-")) {
		if (!hub || hub.isHost) game.tuning[id.slice(4)] = v;
	} else settings[id] = v / 100;
	const output = $(`#out-${id}`);
	if (output)
		output.textContent = Number(v.toFixed(2)) + (el.dataset.unit || "");
	sound.apply();
	persist();
}
function toggleSetting(key) {
	const old = focusIndex;
	settings[key] =
		key === "glyphs"
			? settings.glyphs === "ps"
				? "xbox"
				: "ps"
			: !settings[key];
	sound.apply();
	persist();
	rebuild();
	focusAt(old, true);
}
function action(a) {
	if (hubEnded || performance.now() < suppressClickUntil) return;
	sound.init();
	sound.sfx("menu");
	if (a === "solo" || a === "coop") {
		pilotCount = a === "solo" ? 1 : 2;
		screen("brief");
	} else if (a === "launch") launch();
	else if (a === "pause") openPause();
	else if (a === "resume") {
		mode = "play";
		stack = [];
		rebuild();
	} else if (a === "back") back();
	else if (a === "settings") screen("settings");
	else if (a === "manual") {
		manualPage = 0;
		screen("manual");
	} else if (a === "manual-next") {
		manualPage = 1 - manualPage;
		rebuild();
	} else if (a === "about") {
		aboutPage = 0;
		screen("about");
	} else if (a.startsWith("about-")) {
		aboutPage =
			a === "about-next" ? (aboutPage + 1) % 6 : Number(a.split("-")[1]);
		rebuild();
	} else if (a === "dev") screen("dev");
	else if (a === "quit" && !hub) toTitle();
	else if (a === "retry") launch(pilotCount, game.checkpoint);
	else if (a === "again") launch(pilotCount);
	else if (a.startsWith("toggle-")) toggleSetting(a.slice(7));
	else if (a === "pulse") {
		const id = hub ? hub.me : 0;
		if (!hub || hub.isHost)
			game.pulse(game.players.find((p) => p.id === id) || game.players[0]);
		else touch.pulse = true;
	} else if (a === "god" || a === "noFuel" || a === "bot") {
		if (!hub || hub.isHost) {
			const key = a === "bot" ? "autopilot" : a;
			game[key] = !game[key];
			rebuild();
		}
	} else if (a === "replenish") {
		game.players.forEach((p) => {
			p.hp = 3;
			p.fuel = 100;
			p.pulse = 0;
			p.respawn = 0;
		});
		rebuild();
	} else if (a === "restock") {
		game.players.forEach((p) => {
			p.lives = 3;
			p.hp = 3;
			p.respawn = 0;
		});
		rebuild();
	} else if (a.startsWith("warp-")) {
		if (!hub || hub.isHost) warp(Number(a.slice(5)));
	} else if (a === "reset-tuning") {
		Object.assign(game.tuning, DEFAULTS);
		game.god = game.noFuel = game.autopilot = false;
		rebuild();
	}
}
ui.addEventListener("click", (e) => {
	const b = e.target.closest("button[data-action]");
	if (b) action(b.dataset.action);
});
ui.addEventListener("input", (e) => {
	if (e.target.matches("[data-setting]")) applySlider(e.target);
});
ui.addEventListener("pointerover", (e) => {
	const el = e.target.closest("button,input,select");
	if (el) {
		const idx = focusables().indexOf(el);
		if (idx >= 0) focusAt(idx, true);
	}
});
function adjust(dir) {
	const e = focusables()[focusIndex];
	if (e?.type === "range") {
		const st = Number(e.step) || 1;
		e.value = Math.max(
			Number(e.min),
			Math.min(Number(e.max), Number(e.value) + dir * st),
		);
		applySlider(e);
	} else if (mode === "about") {
		aboutPage = (aboutPage + dir + 6) % 6;
		rebuild();
	}
}
function menuInput(key) {
	if (["ArrowDown", "KeyS"].includes(key)) focusAt(focusIndex + 1);
	else if (["ArrowUp", "KeyW"].includes(key)) focusAt(focusIndex - 1);
	else if (["ArrowLeft", "KeyA"].includes(key)) adjust(-1);
	else if (["ArrowRight", "KeyD"].includes(key)) adjust(1);
	else if (["Enter", "Space"].includes(key)) focusables()[focusIndex]?.click();
	else if (["Escape", "Backspace"].includes(key)) back();
}
window.addEventListener("keydown", (e) => {
	const accepted = wake("keyboard");
	sound.init();
	if (!accepted) return;
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
	if (e.code === "Enter" && mode !== "play") e.preventDefault();
	if (e.repeat) return;
	keys.add(e.code);
	mouse.active = false;
	if (mode === "play") {
		if (e.code === "Escape" || e.code === "KeyP") openPause();
	} else if (mode === "pause" && e.code === "Escape") action("resume");
	else if (!["loading", "hubwait", "hubend"].includes(mode)) {
		if (e.code === "Tab") focusAt(focusIndex + (e.shiftKey ? -1 : 1));
		else menuInput(e.code);
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	mouse.fire = false;
	touch.active = false;
	if (mode === "play" && !hub) openPause();
});
window.addEventListener("pointerdown", (e) => {
	const d = e.pointerType === "touch" ? "touch" : "mouse";
	if (d === "touch") {
		touchMode = true;
		document.body.classList.add("touch");
	}
	sound.init();
	if (!wake(d)) {
		e.preventDefault();
		e.stopImmediatePropagation();
		return;
	}
	if (e.target !== view.canvas || mode !== "play") return;
	e.preventDefault();
	if (d === "touch") {
		if (e.clientX > innerWidth * 0.7) {
			touch.pulse = true;
			return;
		}
		touch.active = true;
		touch.id = e.pointerId;
		touch.ox = e.clientX;
		touch.oy = e.clientY;
		touch.x = 0;
		touch.y = 0;
		view.canvas.setPointerCapture(e.pointerId);
	} else {
		mouse.active = true;
		mouse.x = view.point(e.clientX, e.clientY).x;
		if (e.button === 0) mouse.fire = true;
		if (e.button === 2) mouse.pulse = true;
	}
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") {
		if (e.pointerId === touch.id) {
			touch.x = Math.max(-1, Math.min(1, (e.clientX - touch.ox) / 65));
			touch.y = Math.max(-1, Math.min(1, (e.clientY - touch.oy) / 75));
		}
		return;
	}
	if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
	if (!wake("mouse")) return;
	if (e.target === view.canvas && mode === "play") {
		mouse.active = true;
		mouse.x = view.point(e.clientX, e.clientY).x;
	}
});
window.addEventListener("pointerup", (e) => {
	if (e.pointerType === "touch" && e.pointerId === touch.id) {
		touch.active = false;
		touch.id = null;
		touch.x = touch.y = 0;
	} else if (e.pointerType !== "touch") {
		if (e.button === 0) mouse.fire = false;
		if (e.button === 2) mouse.pulse = false;
	}
});
window.addEventListener("pointercancel", () => {
	touch.active = false;
	touch.x = touch.y = 0;
	mouse.fire = false;
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("resize", () => view.renderer && view.resize());
document.addEventListener("visibilitychange", () => {
	if (document.hidden && mode === "play" && !hub) openPause();
});
function pollPads(now) {
	const pads = [...(navigator.getGamepads?.() || [])].filter(
		(p) => p?.connected,
	);
	for (const pad of pads) {
		const old = previousPads.get(pad.index) || [],
			buttons = pad.buttons.map((b) => b.pressed || b.value > 0.5);
		const moving =
			Math.abs(pad.axes[0] || 0) > 0.25 || Math.abs(pad.axes[1] || 0) > 0.25;
		const pressed = buttons.some((b, i) => b && !old[i]);
		if (pressed || moving) {
			if (!wake("pad")) {
				previousPads.set(pad.index, buttons);
				return pads;
			}
			sound.init();
		}
		const options = buttons[9] && !old[9] && !(hub && buttons[8]);
		if (options) {
			if (mode === "play") openPause();
			else if (mode === "pause") action("resume");
		}
		if (!["play", "attract", "hubwait", "hubend", "loading"].includes(mode)) {
			if (buttons[0] && !old[0]) focusables()[focusIndex]?.click();
			if (buttons[1] && !old[1]) mode === "pause" ? action("resume") : back();
			const y = buttons[12] ? -1 : buttons[13] ? 1 : pad.axes[1] || 0,
				x = buttons[14] ? -1 : buttons[15] ? 1 : pad.axes[0] || 0;
			const dir =
				Math.abs(y) > 0.5
					? y > 0
						? "down"
						: "up"
					: Math.abs(x) > 0.5
						? x > 0
							? "right"
							: "left"
						: "";
			const nav = navStates.get(pad.index) || { dir: "", next: 0 };
			if (dir && (dir !== nav.dir || now > nav.next)) {
				const fresh = dir !== nav.dir;
				if (dir === "down" || dir === "up")
					focusAt(focusIndex + (dir === "down" ? 1 : -1));
				else adjust(dir === "right" ? 1 : -1);
				nav.next = now + (fresh ? 480 : 170);
			}
			nav.dir = dir;
			navStates.set(pad.index, nav);
		}
		previousPads.set(pad.index, buttons);
	}
	return pads;
}
function inputFor(index, pads) {
	let x = 0,
		y = 0,
		fire = false,
		pulse = false,
		targetX;
	const first = index === 0;
	if (first) {
		x = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
		y = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
		fire = keys.has("Space");
		pulse = keys.has("ShiftLeft");
		if (mouse.active && lastInput === "mouse") {
			targetX = mouse.x;
			fire = mouse.fire;
			pulse = mouse.pulse;
		}
		if (touchMode && lastInput === "touch") {
			x = touch.x;
			y = touch.y;
			fire = true;
			pulse = touch.pulse;
			const p = current()?.players.find((p) => p.id === (hub ? hub.me : 0)),
				fuel = current()?.entities.find(
					(e) =>
						e.type === "fuel" &&
						p &&
						e.d > p.d - 9 &&
						e.d < p.d + 55 &&
						Math.abs(e.x - p.x) < 2.3,
				);
			if (fuel) fire = false;
		}
	} else {
		x = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
		y = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
		fire = keys.has("Enter");
		pulse = keys.has("ShiftRight");
	}
	const pad = pads[index];
	if (pad) {
		const ax = pad.axes[0] || 0,
			ay = pad.axes[1] || 0;
		if (Math.abs(ax) > 0.15) {
			x = ax;
			targetX = undefined;
		}
		if (Math.abs(ay) > 0.15) y = ay;
		fire = fire || pad.buttons[0]?.pressed || pad.buttons[7]?.value > 0.15;
		pulse = pulse || pad.buttons[2]?.pressed;
	}
	return {
		x,
		y,
		fire: fire || settings.autofire,
		pulse,
		...(Number.isFinite(targetX) ? { targetX } : {}),
	};
}
function getInputs(pads) {
	if (inputsOverride) return inputsOverride;
	const out = {};
	if (hub) {
		if (!hub.server) out[hub.me] = inputFor(0, pads);
		if (hub.isHost)
			for (const id of liveIds)
				if (id !== hub.me)
					out[id] =
						performance.now() - (remoteInputAt[id] || 0) < 800
							? remoteInputs[id]
							: {};
	} else
		game.players.forEach((p, i) => {
			out[p.id] = inputFor(i, pads);
		});
	return out;
}
function finishHub() {
	if (!hub?.isHost || hubFinished || hubEnded) return;
	hubFinished = true;
	game.finished = true;
	const ids = [...liveIds],
		scores = {},
		stats = {};
	for (const id of ids) {
		const p = game.players.find((v) => v.id === id);
		scores[id] = p?.score || 0;
		stats[id] = {
			Bridges: game.bridges,
			"Fuel remaining": Math.round(p?.fuel || 0),
			"Jets remaining": p?.lives || 0,
		};
	}
	AIHub.finish({ standings: [ids], scores, won: game.won, stats });
}
function network(now, inputs) {
	if (!hub || hubEnded || !hubStarted || AIHub.time() < 0) return;
	if (hub.isHost) {
		if (now - lastNet >= 100 && !hubFinished) {
			lastNet = now;
			const s = game.snapshot();
			s.bullets = s.bullets.slice(-70);
			const data = { type: "world", state: s, events: netEvents.splice(0, 40) };
			if (JSON.stringify(data).length > 15000) s.bullets = s.bullets.slice(-25);
			lastNetBytes = JSON.stringify(data).length;
			AIHub.send(data);
		}
	} else if (!hub.server && now - lastInputNet >= 70) {
		lastInputNet = now;
		AIHub.send(
			{ type: "input", input: inputs[hub.me] || {} },
			{ to: hub.host, reliable: false },
		);
	}
}
async function setupHub(promise) {
	hub = await promise;
	if (!hub) return false;
	for (const p of hub.players) liveIds.add(p.id);
	game.reset(hub.players.length, { ids: hub.players.map((p) => p.id) });
	mode = "hubwait";
	rebuild();
	AIHub.on("start", () => {
		hubStarted = true;
		mode = "play";
		stack = [];
		game.time = 0;
		acc = 0;
		rebuild();
	});
	AIHub.on("message", (data, from) => {
		if (hubEnded || !data || typeof data !== "object") return;
		if (data.type === "input" && hub.isHost && liveIds.has(from)) {
			const i = data.input || {};
			remoteInputs[from] = {
				x: Math.max(-1, Math.min(1, Number(i.x) || 0)),
				y: Math.max(-1, Math.min(1, Number(i.y) || 0)),
				fire: !!i.fire,
				pulse: !!i.pulse,
				...(Number.isFinite(i.targetX)
					? { targetX: Math.max(-27, Math.min(27, i.targetX)) }
					: {}),
			};
			remoteInputAt[from] = performance.now();
		} else if (data.type === "world" && !hub.isHost && from === hub.host) {
			remote = data.state;
			if (data.events) handleEvents(data.events);
		}
	});
	AIHub.on("time-up", () => finishHub());
	AIHub.on("leave", ({ id }) => {
		liveIds.delete(id);
		const p = game.players.find((p) => p.id === id);
		if (p) {
			p.removed = true;
			p.lives = 0;
		}
	});
	AIHub.on("end", () => {
		hubEnded = true;
		hubStarted = false;
		game.finished = true;
		mode = "hubend";
		keys.clear();
		sound.stop();
		rebuild();
	});
	AIHub.ready();
	return true;
}
function frame(now) {
	if (!ready) {
		requestAnimationFrame(frame);
		return;
	}
	const dt = Math.min(0.06, Math.max(0.001, (now - lastTick) / 1000 || 1 / 60));
	lastTick = now;
	const pads = hubEnded ? [] : pollPads(now);
	let s;
	if (
		mode === "title" ||
		(!hub &&
			["brief", "settings", "manual", "about"].includes(mode) &&
			!stack.some((m) => ["play", "pause", "result"].includes(m)))
	) {
		if (preview.progress > 764) preview.reset(1, { progress: 740 });
		preview.update(dt, {
			0: {
				x: (river(preview.progress + 12).center - preview.players[0].x) * 0.4,
			},
		});
		preview.takeEvents();
		s = preview.snapshot();
		if (mode === "title" && now - idleAt > 10000) startAttract();
	}
	const playable =
		mode === "play" || mode === "attract" || (hub && hubStarted && !hubEnded);
	if (playable) {
		const inputs = getInputs(pads);
		if (mode === "attract") {
			const segment = Math.floor((now - attractAt) / 22000) % 4;
			if (segment !== attractSegment) {
				attractSegment = segment;
				const p = [0, 850, 1770, 2675][segment];
				warp(p);
				game.god = true;
				game.noFuel = true;
				game.autopilot = true;
				mode = "attract";
				rebuild();
			}
		}
		const maySim =
			(!hub || hub.isHost) &&
			!hubEnded &&
			(hub ? hubStarted && AIHub.time() >= 0 : now >= launchAt);
		if (maySim && !testFreeze) {
			acc += dt;
			let n = 0;
			while (acc >= 1 / 60 && n++ < 6) {
				game.update(1 / 60, inputs);
				acc -= 1 / 60;
			}
			const events = game.takeEvents();
			handleEvents(events);
			if (game.over) endRun();
		}
		if (!hubEnded) network(now, inputs);
		s = current();
		touch.pulse = false;
	}
	if (!s) s = mode === "hubwait" || mode === "hubend" ? current() : current();
	if (s && view.renderer && renderEnabled)
		view.render(
			s,
			dt,
			mode === "title" ||
				(stack.includes("title") && !stack.includes("play")) ||
				mode === "brief",
		);
	sound.update(playable && !hubEnded, game.lastSpeed || game.tuning.speed);
	updateHUD();
	requestAnimationFrame(frame);
}
async function boot() {
	const hubPromise = AIHub.connect({ mode: "shared-world", seats: [1, 4] });
	try {
		$("#loadstatus").textContent = "Charting the river…";
		await RAPIER.init();
		game = new Game();
		preview = new Game();
		preview.reset(1, { progress: 740 });
		preview.god = preview.noFuel = true;
		preview.tuning.speed = 1.1;
		$("#loadstatus").textContent = "Inking the landscape…";
		await view.init($("#world"), settings);
		const joined = await setupHub(hubPromise);
		if (!joined) {
			mode = "title";
			rebuild();
		}
		ready = true;
		$("#loading").remove();
		lastTick = performance.now();
		idleAt = lastTick;
		document.body.dataset.ready = "true";
		window.__game = {
			get state() {
				return current();
			},
			get screen() {
				return mode;
			},
			get settings() {
				return { ...settings };
			},
			get hub() {
				return hub
					? { ...hub, ended: hubEnded, finished: hubFinished, lastNetBytes }
					: null;
			},
			get graphics() {
				return view.stats();
			},
			get simulation() {
				return game;
			},
			start: (count = 1) => {
				launch(count);
				launchAt = 0;
			},
			step: (n = 1, inputs = {}) => {
				for (let i = 0; i < n; i++) game.update(1 / 60, inputs);
				handleEvents(game.takeEvents());
				updateHUD();
				if (game.over) endRun();
				return game.snapshot();
			},
			setInput: (i) => (inputsOverride = i),
			freeze: (v) => (testFreeze = v),
			render: (v) => (renderEnabled = v),
			warp,
			action,
			open: (s) => screen(s),
			sound,
			credits,
			finishHub,
			testDeviceLoss: () => view.renderer.backend.device?.destroy(),
			setIdle: (ms) => (idleAt = performance.now() - ms),
		};
		requestAnimationFrame(frame);
	} catch (e) {
		console.error(e);
		AIHub.fail(`Engine initialization failed: ${e.message}`);
		$("#loading").innerHTML =
			'<h1 class="display">The engine needs a hand.</h1><p>' +
			String(e.message).replaceAll("<", "&lt;") +
			"</p><p>Enable WebGPU or WebGL 2 in your browser, then reload this file.</p>";
		document.body.dataset.error = e.message;
	}
}
boot();
