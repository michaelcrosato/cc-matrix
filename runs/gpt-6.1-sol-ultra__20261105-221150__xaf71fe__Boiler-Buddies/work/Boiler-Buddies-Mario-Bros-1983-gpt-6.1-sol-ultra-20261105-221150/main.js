import RAPIER from "@dimforge/rapier3d-compat";
import { AudioEngine } from "./audio.js";
import credits from "./credits.json";
import { InputManager } from "./input.js";
import { DEFAULT_TUNING, GameSimulation, PHASES } from "./mechanics.js";
import { Network } from "./online.js";
import { GameView } from "./view.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const HEART =
	'<svg viewBox="0 0 24 22"><path d="M12 21 2 11C-5 2 8-5 12 4 16-5 29 2 22 11Z"/></svg>';
const SETTINGS_DEFAULT = { music: 0.1, sfx: 0.65, glyphs: "ps", shake: true };
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let roomDraft = "",
	roomCharacters = Array(6).fill("A"),
	roomCharacterIndex = 0,
	roomJoining = false;
let settings = { ...SETTINGS_DEFAULT };
try {
	settings = {
		...settings,
		...JSON.parse(localStorage.getItem("boiler-buddies-settings") || "{}"),
	};
} catch {}
let screen = "loading",
	menuReturn = "title",
	activeRun = false,
	playerCount = 1,
	focusIndex = 0,
	focusItems = [],
	lastActivity = performance.now(),
	suppressUntil = 0,
	aboutPage = 0,
	devRunning = false,
	ended = false,
	wasFinished = false;
let snapshot = null,
	titleSnapshot = null,
	lastTime = 0,
	toastTimer = 0,
	bootComplete = false,
	highScore = 0;
try {
	highScore = Number(localStorage.getItem("boiler-buddies-best")) || 0;
} catch {}
const audio = new AudioEngine();
audio.setMusicVolume(settings.music);
audio.setSfxVolume(settings.sfx);
let sim, view, network;
let networkSeats = [];
let eventSerial = 0,
	remoteEventSerial = 0,
	recentEvents = [],
	remotePhase = 0;
function worldSnapshot() {
	return { ...sim.snapshot(), events: recentEvents };
}
const input = new InputManager({
	onActivity(type) {
		lastActivity = performance.now();
		document.body.classList.toggle("touch", type === "touch");
		audio.unlock().catch(() => {});
		if (screen === "attract") {
			suppressUntil = performance.now() + 300;
			showTitle();
			input.clear();
		}
		updatePrompts();
	},
	onPause() {
		if (performance.now() < suppressUntil) return;
		if (screen === "play") pause();
		else if (screen === "pause") resume();
	},
	onMenu(action) {
		if (performance.now() < suppressUntil) return;
		menuAction(action);
	},
});
input.glyphs = settings.glyphs;

function saveSettings() {
	try {
		localStorage.setItem("boiler-buddies-settings", JSON.stringify(settings));
	} catch {}
}
function toast(text, seconds = 3) {
	$("toast").textContent = text;
	$("toast").hidden = false;
	toastTimer = seconds;
}
function glyph(action) {
	const gamepad = input.mode === "gamepad",
		xbox = settings.glyphs === "xbox";
	if (!gamepad)
		return (
			{
				confirm: "↵",
				back: "Esc",
				jump: "Space",
				kick: "X",
				pulse: "Shift",
				drop: "↓",
				move: "A D / ← →",
				pause: "Esc",
			}[action] || action
		);
	return (
		{
			confirm: xbox ? "A" : "×",
			back: xbox ? "B" : "○",
			jump: xbox ? "A" : "×",
			kick: xbox ? "X" : "□",
			pulse: xbox ? "Y" : "△",
			drop: xbox ? "B" : "○",
			move: "L / ✚",
			pause: "☰",
		}[action] || action
	);
}
function updatePrompts() {
	for (const el of document.querySelectorAll("[data-prompt]"))
		el.textContent = glyph(el.dataset.prompt);
	$("title-control").textContent =
		input.mode === "gamepad"
			? `✚ TO CHOOSE · ${glyph("confirm")} TO CLOCK IN`
			: "ARROWS TO CHOOSE · ENTER TO CLOCK IN";
	$("control-strip").innerHTML = ["move", "jump", "kick", "pulse", "drop"]
		.map(
			(k) =>
				`<span><b class="key">${glyph(k)}</b>${k === "move" ? "MOVE" : k === "pulse" ? "PULSE" : k.toUpperCase()}</span>`,
		)
		.join("");
	if (input.mode === "touch")
		$("title-control").textContent = "TAP TO CLOCK IN";
	const roomHelp = $("code-controls");
	if (roomHelp)
		roomHelp.textContent =
			input.mode === "touch"
				? "TAP ▲ / ▼ TO CHANGE A LETTER · TAP JOIN ROOM"
				: `← → CHOOSE LETTER · ↑ ↓ CHANGE · ${glyph("confirm")} JOIN`;
}
function setScreen(next) {
	screen = next;
	input.menu = !["play", "attract"].includes(next);
	$("title-screen").hidden = next !== "title";
	$("panel-screen").hidden = ["title", "play", "attract", "loading"].includes(
		next,
	);
	$("screens").hidden = ["play", "attract", "loading"].includes(next);
	$("hud").hidden = !["play", "pause", "dev", "attract"].includes(next);
	$("attract").hidden = next !== "attract";
	$("touch-pop").hidden = true;
	view?.setMode(next === "title" ? "title" : "play");
	if (next === "play" || next === "attract")
		audio.setScene(
			sim?.phase === 3 ? "bonus" : sim?.phase === 6 ? "boss" : "play",
		);
	else if (next === "title" || !activeRun) audio.setScene("title");
	else audio.setScene("pause");
	if (next === "title") lastActivity = performance.now();
	if (!["play", "attract"].includes(next)) refreshFocus();
	updatePrompts();
}
function refreshFocus() {
	const scope = screen === "title" ? $("title-screen") : $("panel");
	focusItems = [
		...scope.querySelectorAll(
			screen === "code"
				? ".code-letter"
				: "button:not(:disabled),input:not(:disabled)",
		),
	].filter((e) => e.offsetParent !== null);
	focusIndex =
		screen === "code"
			? roomCharacterIndex
			: Math.min(focusIndex, Math.max(0, focusItems.length - 1));
	paintFocus();
}
function paintFocus() {
	for (const el of document.querySelectorAll(".focus"))
		el.classList.remove("focus");
	const el = focusItems[focusIndex];
	el?.classList.add("focus");
	if (input.mode === "gamepad" || input.mode === "keyboard")
		el?.scrollIntoView({ block: "nearest", behavior: "instant" });
}
function menuAction(action) {
	if (["loading", "play", "attract"].includes(screen)) return;
	if (action === "back") {
		goBack();
		return;
	}
	if (screen === "code") {
		if (action === "left" || action === "right") {
			roomCharacterIndex =
				(roomCharacterIndex + (action === "right" ? 1 : -1) + 6) % 6;
			paintRoomCode();
			audio.play("ui");
		} else if (action === "up" || action === "down")
			changeRoomCharacter(action === "up" ? 1 : -1);
		else if (action === "confirm") $("code-join")?.click();
		return;
	}
	const el = focusItems[focusIndex];
	if (action === "up" || action === "down") {
		focusIndex =
			(focusIndex + (action === "up" ? -1 : 1) + focusItems.length) %
			focusItems.length;
		paintFocus();
		audio.play("ui");
		return;
	}
	if (action === "left" || action === "right") {
		if (el?.type === "range") {
			const step = Number(el.step) || 1,
				min = Number(el.min),
				max = Number(el.max);
			el.value = String(
				Math.min(
					max,
					Math.max(min, Number(el.value) + (action === "right" ? step : -step)),
				),
			);
			el.dispatchEvent(new Event("input", { bubbles: true }));
			audio.play("ui");
		} else if (screen === "about")
			renderAbout(aboutPage + (action === "right" ? 1 : -1));
		return;
	}
	if (action === "confirm") {
		if (el?.id === "room-input" && input.mode === "gamepad") openCodePicker();
		else if (el?.tagName === "INPUT" && el.type === "text") el.focus();
		else el?.click();
	}
}
function panel(html, wide = false, ghost = false) {
	$("panel").className = `panel${wide ? " wide" : ""}${ghost ? " ghost" : ""}`;
	$("panel").innerHTML = html;
	focusIndex = 0;
}
function heading(eyebrow, title, intro = "") {
	return `<div class="panel-eyebrow">${eyebrow}</div><h2>${title}</h2>${intro ? `<p class="panel-intro">${intro}</p>` : ""}`;
}
function bottom(back = "BACK TO THE TOOLS", extra = "") {
	return `<div class="panel-bottom"><button data-action="back"><span class="key" data-prompt="back">Esc</span> ${back}</button>${extra || '<p>↑ ↓ CHOOSE · ← → ADJUST · <span data-prompt="confirm">↵</span> SELECT</p>'}</div>`;
}
function showTitle() {
	if (network?.hubActive) return;
	network?.close();
	activeRun = false;
	ended = false;
	wasFinished = false;
	devRunning = false;
	hubWaiting = false;
	input.clear();
	makeTitleSnapshot();
	setScreen("title");
	focusIndex = 0;
	refreshFocus();
}
function makeTitleSnapshot() {
	if (!sim) return;
	sim.start({ players: 1 });
	titleSnapshot = sim.snapshot();
	titleSnapshot.pulseCharges = 3;
	titleSnapshot.players = [
		{
			id: 0,
			x: 6,
			y: 5.07,
			vx: 3,
			vy: 0,
			grounded: true,
			facing: 1,
			invulnerable: 0,
		},
		{
			id: 1,
			x: -4,
			y: 8.87,
			vx: -2,
			vy: 0,
			grounded: true,
			facing: -1,
			invulnerable: 0,
		},
	];
	titleSnapshot.enemies = [
		{
			id: 10001,
			type: "crab",
			x: 9,
			y: 12.55,
			state: "walking",
			dir: -1,
			grounded: true,
		},
		{
			id: 10002,
			type: "beetle",
			x: 7,
			y: 16.35,
			state: "walking",
			dir: 1,
			grounded: true,
		},
		{
			id: 10003,
			type: "hopper",
			x: 3.5,
			y: 8.75,
			state: "walking",
			dir: 1,
			grounded: true,
		},
		{
			id: 10004,
			type: "beetle",
			x: -7,
			y: 5,
			state: "flipped",
			dir: 1,
			grounded: true,
		},
	];
	titleSnapshot.coins = [
		{ id: 20001, x: 10, y: 5.4 },
		{ id: 20002, x: 11, y: 5.4 },
	];
	titleSnapshot.hazards = [];
	titleSnapshot.boss = null;
}
function startGame(count = 1, attract = false) {
	if (!bootComplete) return;
	activeRun = !attract;
	playerCount = count;
	wasFinished = false;
	ended = false;
	input.clear();
	sim.god = false;
	sim.start({ players: count, attract });
	snapshot = sim.snapshot();
	setScreen(attract ? "attract" : "play");
	if (!attract) {
		audio.voice(3);
		toast(
			count === 2
				? "PIP & PEP — DOUBLE OVERTIME!"
				: "PIP — YOU’RE ON THE CLOCK!",
			2.5,
		);
	}
}
function pause() {
	if (network?.hubActive) {
		toast("The shift keeps running with your buddy.", 2);
		return;
	}
	if (network?.active) {
		toast("Online shifts keep running. Keep those pipes clear!", 2);
		return;
	}
	input.clear();
	panel(
		heading(
			"THE BOILER CAN WAIT",
			"TAKE FIVE.",
			`Shift ${sim.phase}: ${PHASES[sim.phase - 1].name}`,
		) +
			`<nav class="menu-stack"><button class="primary" data-action="resume">BACK TO THE TOOLS <span class="key" data-prompt="confirm">↵</span></button><button data-action="guide">FIELD GUIDE</button><button data-action="settings">SETTINGS</button><button data-action="dev">WORKSHOP <span class="subtag">DEV MODE</span></button><button data-action="about">ABOUT & CREDITS</button><button class="danger" data-action="quit">CLOCK OUT <span class="subtag">TITLE SCREEN</span></button></nav>`,
	);
	setScreen("pause");
}
function resume() {
	input.clear();
	setScreen("play");
}
function goBack() {
	if (screen === "title") return;
	if (screen === "pause") {
		resume();
		return;
	}
	if (screen === "dev") {
		devRunning = false;
		pause();
		return;
	}
	if (screen === "result") {
		if (network?.hubActive) return;
		showTitle();
		return;
	}
	if (screen === "online") {
		network.close();
		showTitle();
		return;
	}
	if (screen === "code") {
		roomDraft = roomCharacters.join("");
		openOnline();
		return;
	}
	if (screen === "ended") {
		if (!network?.hubActive) showTitle();
		return;
	}
	if (menuReturn === "result") {
		renderResult(sim.snapshot().mode === "won", true);
	} else if (menuReturn === "pause") {
		pause();
	} else if (menuReturn === "play") {
		resume();
	} else showTitle();
}
function openSettings() {
	menuReturn = activeRun ? "pause" : "title";
	panel(
		heading(
			"MAKE YOURSELF AT HOME",
			"SETTINGS.",
			"A little less clatter? A different set of buttons?",
		) +
			`<div class="settings-row"><label for="music">MUSIC <output id="music-value">${Math.round(settings.music * 100)}%</output></label><input id="music" data-setting="music" type="range" min="0" max="1" step=".01" value="${settings.music}" aria-label="Music volume"></div><div class="settings-row"><label for="sfx">SOUND & VOICES <output id="sfx-value">${Math.round(settings.sfx * 100)}%</output></label><input id="sfx" data-setting="sfx" type="range" min="0" max="1" step=".01" value="${settings.sfx}" aria-label="Sound effects volume"></div><div class="settings-row"><label>CONTROLLER GLYPHS</label><button data-action="glyphs">${settings.glyphs === "ps" ? "PLAYSTATION × ○ □ △" : "XBOX A B X Y"}</button></div><div class="settings-row"><label>SCREEN SHAKE</label><button data-action="shake">${settings.shake ? "ON" : "OFF"}</button></div>${network?.hubActive ? "" : `<div class="settings-row"><label>THE BIG PICTURE</label><button data-action="fullscreen">${document.fullscreenElement ? "LEAVE FULLSCREEN" : "FULLSCREEN"}</button></div>`}<p class="small-copy">Music starts at 10%. Settings save on this device. Controls follow the input you use.</p>` +
			bottom(),
	);
	setScreen("settings");
}
function openGuide() {
	menuReturn = activeRun ? "pause" : "title";
	panel(
		heading(
			"MUNICIPAL PEST CONTROL HANDBOOK",
			"A BUMP. A BOOT. A BEAUTY.",
			"No stomping! These pests need a little persuasion from below.",
		) +
			`<div class="guide-cards"><div class="guide-card"><span class="number">01</span><h3>BUMP THE DECK</h3><p>Stand below a pest and <strong>jump</strong>. Your head rattles the deck and flips it over.</p></div><div class="guide-card"><span class="number">02</span><h3>TAKE THE GAP</h3><p>Jump up through the gaps to reach the deck. Run off either edge to <strong>wrap around</strong>.</p></div><div class="guide-card"><span class="number">03</span><h3>GIVE IT THE BOOT</h3><p>Walk into a flipped pest or press <strong>${glyph("kick")}</strong> to kick. Chain quick kicks for a bigger payday.</p></div></div><div class="guide-enemies"><p><b>BRASS BEETLE</b> · One bump.<br><b>COPPER CRAB</b> · Two bumps. First one makes it angry.</p><p><b>HOPPER</b> · Bump while its feet touch the deck.<br><b>FROST SLUG</b> · Bump quickly or the deck gets icy.</p></div><p class="small-copy"><b>PRESSURE PULSE · ${glyph("pulse")}</b> hits every grounded pest. Three charges; the coin shift refills them. <b>DROP · ${glyph("drop")}</b> lets you fall through a deck. Avoid the roaming embers!</p><p class="small-copy"><b>THE KETTLE KING</b> · Bump the three red seals under the top bridge. When they turn blue, climb up and kick the open core, or spend a pulse. Do this three times!</p><p class="small-copy"><b>TWO ON THE TOOLS</b> · P1: A/D, Space, X, Shift. P2: F/H, T jump, R kick, Y pulse, G drop. Any two standard gamepads work. Share the score and lives. No friendly damage.</p><p class="small-copy"><b>TOUCH</b> · Drag anywhere on the left to move. Tap the right to jump; swipe right to kick, down to drop. Two-finger tap spends a pulse. A POP! button appears near flippable pests; boots kick automatically.</p>` +
			bottom(),
		true,
	);
	setScreen("guide");
}
function openDev() {
	devRunning = false;
	menuReturn = "pause";
	renderDev();
}
function renderDev() {
	const ranges = [
		["speed", "RUN SPEED", 4, 14, 0.2],
		["jump", "JUMP STRENGTH", 12, 22, 0.2],
		["gravity", "GRAVITY", 14, 40, 0.5],
		["enemySpeed", "PEST SPEED", 0.25, 2.5, 0.05],
		["flipTime", "FLIP WINDOW", 3, 20, 0.5],
		["acceleration", "GRIP", 20, 100, 2],
		["timeScale", "TIME SCALE", 0.25, 2, 0.05],
	];
	panel(
		heading(
			"WORKSHOP · LIVE DEV TOOLS",
			"TUNE THE TROUBLE.",
			"Changes apply immediately. Defaults are one button away.",
		) +
			`<div class="dev-grid"><div>${ranges.map(([key, name, min, max, step]) => `<div class="settings-row"><label for="tune-${key}">${name}<output id="out-${key}">${Number(sim.tuning[key]).toFixed(key === "enemySpeed" || key === "timeScale" ? 2 : 1)}</output></label><input type="range" id="tune-${key}" data-tuning="${key}" min="${min}" max="${max}" step="${step}" value="${sim.tuning[key]}" aria-label="${name}"></div>`).join("")}</div><div><div class="dev-label">SHIFT ${sim.phase} / 6 · ${esc(sim.mode.toUpperCase())}</div><div class="tool-grid"><button class="span2 primary" data-action="dev-run">${devRunning ? "Ⅱ PAUSE SIMULATION" : "▶ RUN SIMULATION"}</button><button data-action="dev-step">STEP 1 FRAME</button><button data-action="dev-god">GOD MODE: ${sim.god ? "ON" : "OFF"}</button><button data-action="dev-next">NEXT SHIFT</button><button data-action="dev-restart">RESTART SHIFT</button><button data-action="dev-life">+1 LIFE</button><button data-action="dev-refill">REFILL PULSE</button><button data-action="dev-beetle">+ BEETLE</button><button data-action="dev-crab">+ CRAB</button><button data-action="dev-hopper">+ HOPPER</button><button data-action="dev-frost">+ FROST</button><button class="span2" data-action="dev-clear">CLEAR PESTS</button><button class="span2" data-action="dev-reset">RESET ALL DEFAULTS</button></div><p class="small-copy">The workshop is paused until you run or step it. Close it to take control again.</p></div></div>` +
			bottom("BACK TO PAUSE"),
		true,
		true,
	);
	setScreen("dev");
}

const TEST_Q = [
	"How many issues did testing catch?",
	"How many were critical or game breaking?",
	"Most helpful test?",
	"Least helpful test?",
];
const ENGINE_Q = [
	"What did you like most about the engine?",
	"Did you get stuck or guess wrong?",
	"Most important system you built yourself?",
	"Hardest part of using the engine?",
	"What did you change in the engine, and why?",
	"One engine change you would make?",
];
const PROMPT_Q = [
	"What did you like most about this prompt?",
	"What was confusing?",
	"What was hardest?",
	"What would you change?",
];
function openAbout() {
	menuReturn = screen === "result" ? "result" : activeRun ? "pause" : "title";
	renderAbout(0);
}
function renderAbout(page) {
	aboutPage = (page + 5) % 5;
	const names = [
		"SOURCE INFORMATION · 1 / 2",
		"SOURCE INFORMATION · 2 / 2",
		"TESTING FEEDBACK",
		"ENGINE FEEDBACK",
		"PROMPT FEEDBACK",
	];
	let body = "";
	if (aboutPage < 2) {
		const keys =
			aboutPage === 0
				? [
						"date",
						"source",
						"plan",
						"genre",
						"perspective",
						"research",
						"environment",
						"model",
						"usage",
					]
				: ["tech", "artDirection", "animation", "audio", "online", "testing"];
		const labels = { artDirection: "ART DIRECTION" };
		body = `<div class="about-list">${keys.map((k) => `<div><small>${labels[k] || k.replace(/([A-Z])/g, " $1").toUpperCase()}</small><p>${esc(credits.sourceInformation[k])}</p></div>`).join("")}</div>`;
	} else {
		const q = aboutPage === 2 ? TEST_Q : aboutPage === 3 ? ENGINE_Q : PROMPT_Q;
		const a =
			aboutPage === 2
				? credits.testingFeedback
				: aboutPage === 3
					? credits.engineFeedback
					: credits.promptFeedback;
		body = `<div class="feedback-list">${q.map((v, i) => `<div><b>${esc(v)}</b><p>${esc(a[i] || "unknown")}</p></div>`).join("")}</div>`;
	}
	panel(
		heading(
			"BOILER BUDDIES · THE PEOPLE IN THE PIPES",
			names[aboutPage],
			aboutPage === 0
				? "An original arcade game inspired by Mario Bros. (Nintendo, 1983). Pip, Pep, the pests, and the music were made for this game."
				: "",
		) +
			body +
			`<div class="panel-bottom"><button data-action="back"><span class="key" data-prompt="back">Esc</span> BACK</button><div class="row"><button data-action="about-prev">←</button><span class="small-copy">${aboutPage + 1} / 5</span><button data-action="about-next">→</button></div></div>`,
		true,
	);
	setScreen("about");
}
function openOnline() {
	if (network?.hubActive) return;
	menuReturn = "title";
	const hosting =
		network?.mode === "standalone" && network.isHost && network.room;
	const status =
		network?.mode === "standalone" && network.status
			? network.status
			: "No room open yet.";
	panel(
		heading(
			"TWO KEEPERS. TWO COUCHES.",
			"CALL A BUDDY.",
			"Create a room, share its six-character code, and keep this tab open. Your buddy can join from another device.",
		) +
			`<div class="menu-stack"><button class="primary" data-action="host">CREATE A ROOM</button></div><p class="dev-label">OR JOIN A BUDDY'S ROOM</p><input id="room-input" type="text" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="ABC234" value="${esc(roomDraft)}" aria-label="Six-character room code"><div class="online-join-actions"><button data-action="join">JOIN ROOM</button><button data-action="code-picker">CODE PICKER <span class="subtag">USE A CONTROLLER</span></button></div><div id="room-code" class="room-code" ${hosting ? "" : "hidden"}>${hosting ? esc(network.room) : ""}</div><p id="network-status" class="status-line" role="status">${esc(status)}</p><p class="small-copy">Direct WebRTC co-op. Internet is needed for room discovery. Some networks may block direct connections; try a different network. Same-browser tabs connect locally. No account, chat, or voice recording.</p>` +
			bottom("BACK TO TITLE"),
	);
	setScreen("online");
}
function openCodePicker() {
	if (network?.hubActive) return;
	roomDraft = ($("room-input")?.value ?? roomDraft).toUpperCase();
	roomCharacters = Array.from({ length: 6 }, (_, index) =>
		ROOM_ALPHABET.includes(roomDraft[index]) ? roomDraft[index] : "A",
	);
	panel(
		heading(
			"JOIN YOUR BUDDY'S SHIFT",
			"DIAL THEM IN.",
			"Six characters. Turn each dial to match your buddy's room code.",
		) +
			`<div class="code-picker" role="group" aria-label="Six-character room code">${roomCharacters
				.map(
					(character, index) =>
						`<div class="code-cell" data-code-index="${index}"><button class="code-arrow" data-action="code-up" data-code-index="${index}" tabindex="-1" aria-label="Next character in position ${index + 1}">▲</button><button class="code-letter" data-action="code-select" data-code-index="${index}" aria-label="Character ${index + 1}: ${character}">${character}</button><button class="code-arrow" data-action="code-down" data-code-index="${index}" tabindex="-1" aria-label="Previous character in position ${index + 1}">▼</button></div>`,
				)
				.join(
					"",
				)}</div><p id="code-controls" class="code-controls"></p><div class="menu-stack"><button id="code-join" class="primary" data-action="code-join">JOIN ROOM <span class="key" data-prompt="confirm">↵</span></button></div><p id="network-status" class="status-line" role="status">${esc(network?.mode === "standalone" && network.status ? network.status : "Match the six characters, then join.")}</p>` +
			bottom("BACK TO ROOM MENU", "<p>NO KEYBOARD NEEDED</p>"),
	);
	setScreen("code");
	paintRoomCode();
}
function paintRoomCode() {
	roomDraft = roomCharacters.join("");
	for (const cell of document.querySelectorAll(".code-cell")) {
		const index = Number(cell.dataset.codeIndex);
		const letter = cell.querySelector(".code-letter");
		const selected = index === roomCharacterIndex;
		cell.classList.toggle("active", selected);
		letter.textContent = roomCharacters[index];
		letter.setAttribute(
			"aria-label",
			`Character ${index + 1}: ${roomCharacters[index]}`,
		);
		letter.setAttribute("aria-pressed", String(selected));
	}
	focusIndex = roomCharacterIndex;
	paintFocus();
}
function changeRoomCharacter(direction) {
	if (roomJoining) return;
	const index = ROOM_ALPHABET.indexOf(roomCharacters[roomCharacterIndex]);
	roomCharacters[roomCharacterIndex] =
		ROOM_ALPHABET[
			(index + direction + ROOM_ALPHABET.length) % ROOM_ALPHABET.length
		];
	paintRoomCode();
	audio.play("ui");
}
async function joinRoom(code, button) {
	if (roomJoining || network?.hubActive) return;
	roomDraft = String(code || "")
		.trim()
		.toUpperCase();
	roomJoining = true;
	if (button) button.disabled = true;
	try {
		await network.join(roomDraft);
	} catch (error) {
		toast(error.message);
		const status = $("network-status");
		if (status) status.textContent = error.message;
	} finally {
		roomJoining = false;
		if (button) button.disabled = false;
	}
}
function renderResult(won, force = false) {
	if (wasFinished && !force) return;
	const firstFinish = !wasFinished;
	wasFinished = true;
	activeRun = true;
	ended = true;
	const s = sim.snapshot();
	if (s.score > highScore) {
		highScore = s.score;
		try {
			localStorage.setItem("boiler-buddies-best", String(highScore));
		} catch {}
	}
	if (firstFinish && network.active && network.isHost) {
		network.publish({ ...s, events: recentEvents }, true);
		network.finish({ won, score: s.score, stats: s.stats });
	}
	const rating = won ? (s.lives >= 4 ? 3 : s.lives >= 2 ? 2 : 1) : 0;
	const standaloneCrew =
		!network.hubActive && network.mode === "standalone" && network.connected;
	const anotherShift =
		standaloneCrew && !network.isHost
			? '<p class="status-line">Waiting for the host to start another shift.</p>'
			: `<button class="primary" data-action="again">${standaloneCrew ? "ANOTHER SHIFT TOGETHER?" : "ANOTHER SHIFT?"}</button>`;
	panel(
		`<div class="result-banner">${heading(won ? "SHIFT COMPLETE · HOT WATER RESTORED" : "THE BOILER GOT THE BETTER OF YOU", won ? "THAT’S A WRAP!" : "CLOCKED OUT.", won ? "No leaks. No pests. Only a little overtime.<br>Pip & Pep have earned a nice, quiet bath." : "Five minutes for a cuppa, then back at it?")}<div class="result-stars">${won ? "★".repeat(rating) + "☆".repeat(3 - rating) : "♨"}</div></div><div class="result-stats"><div><strong>${String(s.score).padStart(6, "0")}</strong><small>CREW SCORE</small></div><div><strong>${s.stats.kicks}</strong><small>PESTS BOOTED</small></div><div><strong>${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, "0")}</strong><small>ON THE CLOCK</small></div></div><p class="small-copy" style="text-align:center">BEST PAYDAY ${String(highScore).padStart(6, "0")} · ${s.stats.coins} COINS · ${s.stats.bumps} BUMPS</p>${network.hubActive ? '<p class="status-line">Shift reported to AI Hub. Waiting for the next round.</p>' : `<div class="menu-stack">${anotherShift}<button data-action="quit">BACK TO TITLE</button><button data-action="about">ABOUT & CREDITS</button></div>`}`,
	);
	setScreen("result");
	audio.setScene(won ? "win" : "pause");
	audio.voice(won ? 7 : 2);
}
function onEvent(e) {
	if (
		network?.active &&
		network.isHost &&
		!["message", "start"].includes(e.type)
	) {
		recentEvents.push({ ...e, serial: ++eventSerial });
		if (recentEvents.length > 24) recentEvents.shift();
	}
	view?.event(e);
	if (!settings.shake && view) view.shake = 0;
	const map = {
		bossHit: "pow",
		bossOpen: "clear",
		seal: "bump",
		angry: "bump",
		ember: "spawn",
		swing: "kick",
	};
	if (!["message", "start", "phase"].includes(e.type))
		audio.play(map[e.type] || e.type);
	if (e.type === "phase") {
		if (screen === "play" || screen === "attract")
			audio.setScene(e.phase === 3 ? "bonus" : e.phase === 6 ? "boss" : "play");
		if (activeRun) toast(`SHIFT ${e.phase} — ${e.name.toUpperCase()}`, 3);
	}
	if (e.type === "hurt") {
		for (const pad of navigator.getGamepads?.() || [])
			pad?.vibrationActuator
				?.playEffect("dual-rumble", {
					duration: 180,
					strongMagnitude: 0.45,
					weakMagnitude: 0.5,
				})
				.catch(() => {});
	}
	if (e.type === "clear" || e.type === "bossOpen")
		audio.voice(Math.floor(sim?.time || 0));
}
function updateHUD(s) {
	$("score").textContent = String(s.score).padStart(6, "0");
	$("lives").innerHTML = HEART.repeat(Math.max(0, Math.min(9, s.lives)));
	$("phase-number").textContent =
		`SHIFT ${String(s.phase).padStart(2, "0")} / 06${playerCount === 2 ? " · CO-OP" : ""}`;
	$("phase-name").textContent = s.phaseName;
	$("charges").innerHTML = Array.from(
		{ length: 3 },
		(_, i) => `<b class="${i < s.pulseCharges ? "" : "used"}"></b>`,
	).join("");
	$("progress").innerHTML = Array.from(
		{ length: 6 },
		(_, i) => `<span class="${i < s.phase ? "done" : ""}"></span>`,
	).join("");
	$("hint").textContent = s.message || "";
	const localIndex = network.active
		? Math.max(0, networkSeats.indexOf(network.localSeat))
		: 0;
	$("hint").classList.toggle(
		"low",
		!!s.boss || (s.players[localIndex]?.y || 0) > 8,
	);
	$("combo").hidden = s.combo < 2;
	$("combo").innerHTML = `${s.combo}×<small>GOOD BOOTS!</small>`;
	$("bonus-clock").hidden = s.mode !== "bonus";
	if (s.mode === "bonus")
		$("bonus-clock").textContent = `${Math.ceil(s.bonusRemaining || 0)}″`;
	$("boss-hud").hidden = !s.boss;
	if (s.boss)
		$("boss-health").innerHTML = Array.from(
			{ length: 3 },
			(_, i) => `<b class="${i < s.boss.hp ? "" : "empty"}"></b>`,
		).join("");
	if (input.mode === "touch" && screen === "play") {
		const p = s.players[network.active ? Math.max(0, network.localSeat) : 0];
		const nearby = (s.enemies || []).some(
			(e) =>
				e.state !== "flipped" &&
				Math.abs(e.x - p?.x) < 2.5 &&
				e.y > p?.y &&
				e.y - p?.y < 5,
		);
		$("touch-pop").hidden = !nearby;
	}
}

document.addEventListener("pointerover", (e) => {
	const dial = e.target.closest("[data-code-index]");
	if (screen === "code" && dial) {
		roomCharacterIndex = Number(dial.dataset.codeIndex);
		paintRoomCode();
		return;
	}
	const el = e.target.closest("button,input");
	if (el && focusItems.includes(el)) {
		focusIndex = focusItems.indexOf(el);
		paintFocus();
	}
});
document.addEventListener("input", (e) => {
	const el = e.target;
	if (el.id === "room-input") roomDraft = el.value.toUpperCase();
	if (el.dataset.setting) {
		settings[el.dataset.setting] = Number(el.value);
		$(`${el.dataset.setting}-value`).textContent =
			`${Math.round(Number(el.value) * 100)}%`;
		audio.setMusicVolume(settings.music);
		audio.setSfxVolume(settings.sfx);
		saveSettings();
	}
	if (el.dataset.tuning) {
		sim.setTuning(el.dataset.tuning, Number(el.value));
		$(`out-${el.dataset.tuning}`).textContent = Number(el.value).toFixed(
			el.dataset.tuning === "enemySpeed" || el.dataset.tuning === "timeScale"
				? 2
				: 1,
		);
	}
});
document.addEventListener("keydown", (e) => {
	if (
		screen === "online" &&
		e.target.id === "room-input" &&
		e.key === "Enter"
	) {
		e.preventDefault();
		joinRoom(e.target.value, document.querySelector('[data-action="join"]'));
	}
});
document.addEventListener(
	"wheel",
	(e) => {
		const dial = e.target.closest(".code-cell");
		if (screen !== "code" || !dial || !e.deltaY) return;
		e.preventDefault();
		roomCharacterIndex = Number(dial.dataset.codeIndex);
		changeRoomCharacter(e.deltaY < 0 ? 1 : -1);
	},
	{ passive: false },
);
document.addEventListener("click", async (e) => {
	const el = e.target.closest("[data-action]");
	if (!el) return;
	if (performance.now() < suppressUntil) return;
	audio.unlock();
	audio.play("ui");
	const a = el.dataset.action;
	if (a === "solo") startGame(1);
	else if (a === "local") startGame(2);
	else if (a === "resume") resume();
	else if (a === "quit") showTitle();
	else if (a === "again") {
		if (network.hubActive) return;
		if (network.mode === "standalone" && network.connected) {
			if (network.isHost) network.restart();
		} else {
			network.close();
			startGame(playerCount);
		}
	} else if (a === "back") goBack();
	else if (a === "guide") openGuide();
	else if (a === "settings") openSettings();
	else if (a === "about") openAbout();
	else if (a === "dev") openDev();
	else if (a === "online") openOnline();
	else if (a === "code-picker") openCodePicker();
	else if (["code-up", "code-down", "code-select"].includes(a)) {
		roomCharacterIndex = Number(el.dataset.codeIndex);
		if (a === "code-select") paintRoomCode();
		else changeRoomCharacter(a === "code-up" ? 1 : -1);
	} else if (a === "code-join") joinRoom(roomCharacters.join(""), el);
	else if (a === "glyphs") {
		settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
		input.glyphs = settings.glyphs;
		saveSettings();
		const idx = focusIndex;
		openSettings();
		focusIndex = idx;
		paintFocus();
	} else if (a === "shake") {
		settings.shake = !settings.shake;
		saveSettings();
		el.textContent = settings.shake ? "ON" : "OFF";
	} else if (a === "fullscreen") {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
			el.textContent = document.fullscreenElement
				? "LEAVE FULLSCREEN"
				: "FULLSCREEN";
		} catch {
			toast("Fullscreen is unavailable in this browser.");
		}
	} else if (a === "about-prev") renderAbout(aboutPage - 1);
	else if (a === "about-next") renderAbout(aboutPage + 1);
	else if (a === "host") {
		el.disabled = true;
		try {
			const code = await network.host();
			const roomCode = $("room-code");
			if (roomCode) {
				roomCode.textContent = code;
				roomCode.hidden = false;
			}
		} catch (error) {
			toast(error.message);
		}
		el.disabled = false;
	} else if (a === "join") joinRoom($("room-input").value, el);
	else if (a.startsWith("dev-")) {
		const cmd = a.slice(4);
		if (cmd === "run") {
			devRunning = !devRunning;
			el.textContent = devRunning ? "Ⅱ PAUSE SIMULATION" : "▶ RUN SIMULATION";
		} else if (cmd === "step") sim.step(1 / 60, []);
		else if (cmd === "god") {
			sim.toggleGod();
			el.textContent = `GOD MODE: ${sim.god ? "ON" : "OFF"}`;
		} else if (cmd === "next") {
			sim.nextPhase();
			renderDev();
		} else if (cmd === "restart") {
			sim.restartPhase();
			renderDev();
		} else if (cmd === "life") sim.addLife();
		else if (cmd === "refill") sim.refillPulse();
		else if (cmd === "clear") sim.clearEnemies();
		else if (cmd === "reset") {
			sim.resetTuning();
			renderDev();
		} else if (["beetle", "crab", "hopper", "frost"].includes(cmd))
			sim.spawnEnemy(cmd);
	}
});
$("pause-button").addEventListener("click", pause);
$("touch-pop").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	input.trigger("jump");
});
addEventListener("resize", () => view?.resize());
addEventListener("visibilitychange", () => {
	if (document.hidden && !network?.active && screen === "play") pause();
});
function installNetwork() {
	network = new Network({
		onStart(info) {
			eventSerial = 0;
			remoteEventSerial = 0;
			recentEvents = [];
			remotePhase = 0;
			activeRun = true;
			networkSeats = [...info.playerIds];
			playerCount = Math.min(2, info.playerIds.length);
			ended = false;
			wasFinished = false;
			sim.start({ players: playerCount });
			snapshot = sim.snapshot();
			input.clear();
			setScreen("play");
		},
		onState(s) {
			if (!network.isHost) {
				sim.loadSnapshot(s);
				snapshot = s;
				if (s.phase !== remotePhase && screen === "play") {
					remotePhase = s.phase;
					audio.setScene(
						s.phase === 3 ? "bonus" : s.phase === 6 ? "boss" : "play",
					);
				}
				for (const event of s.events || [])
					if (event.serial > remoteEventSerial) {
						remoteEventSerial = event.serial;
						onEvent(event);
					}
			}
		},
		onStatus(text) {
			const el = $("network-status");
			if (el) el.textContent = text;
		},
		onError(error) {
			if (["online", "code"].includes(screen))
				toast(network.status || error.message, 4);
		},
		onTimeUp() {
			if (network.isHost) {
				network.finish({
					won: sim.mode === "won",
					score: sim.score,
					stats: sim.stats,
				});
				ended = true;
				audio.setScene("pause");
			}
		},
		onEnd(reason) {
			ended = true;
			activeRun = false;
			input.clear();
			audio.setScene("pause");
			if (screen !== "result") {
				panel(
					heading(
						"THE WHISTLE HAS BLOWN",
						"SHIFT ENDED.",
						`AI Hub: ${esc(reason || "round complete")}. Waiting for the next round.`,
					),
				);
				setScreen("ended");
			}
		},
		onLeave(id) {
			if (network.isHost) {
				const player = sim.players.find((p) => networkSeats[p.id] === id);
				if (player) {
					player.disconnected = true;
					player.alive = false;
					player.deadTime = 0;
					player.rb.setEnabled(false);
				}
				playerCount = Math.max(1, network.playerIds.length);
				toast("Your buddy clocked out. You can finish the shift.", 4);
			} else {
				ended = true;
				panel(
					heading(
						"THE LINE WENT QUIET",
						"BUDDY DISCONNECTED.",
						"The host left the boiler room.",
					) + bottom("BACK TO TITLE"),
				);
				setScreen("ended");
			}
		},
		onFinish(result) {
			if (!network.isHost && screen !== "result") {
				sim.loadSnapshot({
					...sim.snapshot(),
					mode: result.won ? "won" : "lost",
					score: result.score,
				});
				snapshot = sim.snapshot();
				renderResult(!!result.won);
			}
		},
	});
}
function frame(now) {
	requestAnimationFrame(frame);
	if (!bootComplete) return;
	const dt = Math.min((now - lastTime) / 1000 || 0, 1 / 20);
	lastTime = now;
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").hidden = true;
	}
	let ins = input.poll(dt, !["play", "attract"].includes(screen));
	if (input.active) lastActivity = now;
	if (
		!activeRun &&
		["title", "guide", "settings", "about"].includes(screen) &&
		now - lastActivity >= 10000 &&
		!network.active
	)
		startGame(2, true);
	if (screen === "title") {
		titleSnapshot.players[0].x = 6 + Math.sin(now * 0.0007) * 2;
		titleSnapshot.players[1].x = -4 + Math.sin(now * 0.0008) * 2;
		view.update(titleSnapshot, dt);
		return;
	}
	const running =
		["play", "attract"].includes(screen) || (screen === "dev" && devRunning);
	if (
		network.active &&
		network.started &&
		!network.canStart &&
		!network.ended
	) {
		$("hub-countdown").hidden = false;
		$("hub-countdown").textContent = Math.max(
			1,
			Math.ceil(network.countdown / 1000),
		);
	} else $("hub-countdown").hidden = true;
	if (running && !ended && (!network.active || network.canStart)) {
		if (network.active) {
			if (network.isHost) {
				const localInput = ins[0];
				ins = sim.players.map((p) => {
					const seat = networkSeats[p.id];
					if (!network.playerIds.includes(seat)) return {};
					return seat === network.localSeat
						? localInput
						: network.getInput(seat);
				});
				sim.step(dt, ins);
				network.publish(worldSnapshot());
			} else network.sendInput(ins[0]);
		} else sim.step(dt, screen === "dev" ? [] : ins);
	}
	snapshot = sim.snapshot();
	if (
		screen === "play" &&
		(snapshot.mode === "won" || snapshot.mode === "lost")
	)
		renderResult(snapshot.mode === "won");
	if (!settings.shake) view.shake = 0;
	view.update(snapshot, dt);
	if (["play", "attract", "pause", "dev"].includes(screen)) updateHUD(snapshot);
}

async function boot() {
	try {
		await Promise.all([
			document.fonts.load("16px Bungee"),
			document.fonts.load("16px Barlow"),
		]);
		$("load-status").textContent = "Heating the ink & copper";
		view = new GameView($("game"));
		view.onReady = () => {
			if (screen === "title") lastActivity = performance.now();
		};
		await view.init();
		$("load-status").textContent = "Checking the pressure · Rapier 0.19.3";
		await RAPIER.init();
		sim = new GameSimulation(RAPIER, { onEvent });
		sim.start({ players: 1 });
		snapshot = sim.snapshot();
		installNetwork();
		const info = await network.initHub();
		bootComplete = true;
		lastTime = performance.now();
		$("loading").hidden = true;
		updatePrompts();
		if (info) {
			activeRun = true;
			playerCount = info.players.length;
			sim.start({ players: Math.min(2, playerCount) });
			snapshot = sim.snapshot();
			setScreen("play");
			network.ready();
		} else showTitle();
		window.__game = {
			sim,
			view,
			audio,
			input,
			network,
			credits,
			settings,
			get screen() {
				return screen;
			},
			get state() {
				return sim.snapshot();
			},
			get ready() {
				return bootComplete;
			},
			startGame,
			showTitle,
			pause,
			resume,
			openDev,
			openGuide,
			openSettings,
			openAbout,
			setScreen,
			step: (dt, ins) => sim.step(dt, ins),
			setAuto(value) {
				sim.attract = !!value;
			},
			forceIdle() {
				lastActivity = performance.now() - 10001;
			},
			finish(won = true) {
				if (won) sim.win();
				else sim.mode = "lost";
			},
			snapshot: () => sim.snapshot(),
		};
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		$("load-status").textContent = error.message;
		$("loading").innerHTML =
			`<div class="loading-mark">BB</div><h2>The boiler needs a hand.</h2><p style="max-width:35em;text-align:center">${esc(error.message)}<br>Try a current Chrome or Edge browser with WebGPU enabled.</p><button onclick="location.reload()">TRY AGAIN</button>`;
	}
}
boot();
