import RAPIER from "@dimforge/rapier3d-compat";
import { Game, DEFAULTS, LEVELS, LANES, clamp, wrap } from "./core.js";
import { View } from "./view.js";
import { Sound } from "./audio.js";
import { RoomNet } from "./net.js";
const $ = (id) => document.getElementById(id),
	hub = window.AIHub;
const TEST = new URLSearchParams(location.search).has("test");
let testNoRender = TEST && new URLSearchParams(location.search).has("headless");
let game,
	view,
	ready = false,
	screen = "title",
	stack = [],
	lastInput = "keyboard",
	lastActivity = performance.now(),
	runActive = false,
	attract = false,
	net = null,
	netScores = new Map(),
	hubInfo = null,
	hubStarted = false,
	hubRunning = false,
	hubEnded = false,
	hubReported = false,
	remoteClock = 0,
	progressClock = 0,
	inputFrames = 0,
	toastTimer = 0,
	goTimer = 0,
	lastFrame = 0,
	accumulator = 0,
	mouseBoost = false,
	menuRepeat = 0,
	aboutPage = 0;
const sound = new Sound(),
	keys = new Set(),
	pointers = new Map(),
	padHistory = new Map();
const touchDevice = navigator.maxTouchPoints > 0;
document.body.classList.toggle("touch-device", touchDevice);
function readStore(key, fallback) {
	try {
		return JSON.parse(localStorage.getItem(key)) ?? fallback;
	} catch {
		return fallback;
	}
}
function writeStore(key, data) {
	try {
		localStorage.setItem(key, JSON.stringify(data));
	} catch {}
}
const settings = {
	music: 10,
	effects: 70,
	glyphs: "ps",
	camera: "arcade",
	reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
	...readStore("dodge-alley-settings", {}),
};
let highScore = readStore("dodge-alley-best", 0);
function keycap(text, pad = false) {
	return `<b class="key${pad ? " pad" : ""}">${text}</b>`;
}
function prompts() {
	const pad = lastInput === "gamepad",
		xbox = settings.glyphs === "xbox";
	const turn = pad
		? `${keycap("←")} ${keycap("→")}`
		: `${keycap("A")} ${keycap("D")}`;
	const boost = pad ? keycap(xbox ? "A" : "×", true) : keycap("SPACE");
	const brake = pad ? keycap(xbox ? "LT" : "L2") : keycap("S");
	$("playPrompts").innerHTML =
		`<span>${turn} IN / OUT</span><span>${boost} BOOST</span><span>${brake} BRAKE</span>`;
	$("navHint").innerHTML = pad
		? `${keycap(xbox ? "A" : "×", true)} SELECT &nbsp; ${keycap(xbox ? "B" : "○", true)} BACK`
		: `${keycap("ENTER")} SELECT &nbsp; ${keycap("ESC")} BACK`;
	$("howControls").innerHTML = pad
		? `Left stick / D-pad: inward & outward · ${xbox ? "A / RT" : "Cross / R2"}: boost · ${xbox ? "LT" : "L2"}: brake · Options: pause.`
		: "A/D or ←/→: inward & outward · Space: boost · S or ↓: brake · Esc: pause. Mouse: click a lane to queue a turn; hold right-click to boost.";
	$("titleDevice").textContent = pad
		? "STANDARD GAMEPAD READY"
		: lastInput === "touch"
			? "TOUCH CONTROLS READY"
			: "KEYBOARD + MOUSE READY";
	document.body.classList.toggle(
		"touch-playing",
		lastInput === "touch" && runActive && screen === "",
	);
}
function activity(type) {
	lastActivity = performance.now();
	if (type && type !== lastInput) {
		lastInput = type;
		prompts();
	}
	if (attract) {
		showTitle();
		return true;
	}
	return false;
}
function focusables() {
	const area = screen ? $(screen) : null;
	if (!area) return [];
	return [
		...area.querySelectorAll("button:not(:disabled), input:not(:disabled)"),
	].filter((e) => e.getClientRects().length > 0 && !e.closest(".hidden"));
}
function focus(el) {
	document
		.querySelectorAll(".focused")
		.forEach((e) => e.classList.remove("focused"));
	if (el) {
		el.classList.add("focused");
		el.focus({ preventScroll: true });
	}
}
function defaultFocus() {
	const els = focusables();
	focus(els.find((e) => e.classList.contains("primary")) || els[0]);
}
function navigate(dx, dy) {
	const all = focusables();
	if (!all.length) return;
	let current = document.activeElement;
	if (!all.includes(current)) {
		focus(all[0]);
		return;
	}
	if (dx && current.type === "range") {
		const step = Number(current.step) || 1;
		current.value = String(
			clamp(
				Number(current.value) + dx * step,
				Number(current.min),
				Number(current.max),
			),
		);
		current.dispatchEvent(new Event("input", { bubbles: true }));
		return;
	}
	const r = current.getBoundingClientRect(),
		cx = r.x + r.width / 2,
		cy = r.y + r.height / 2;
	let best = null,
		bestScore = Infinity;
	for (const el of all) {
		if (el === current) continue;
		const b = el.getBoundingClientRect(),
			x = b.x + b.width / 2 - cx,
			y = b.y + b.height / 2 - cy,
			along = x * dx + y * dy,
			cross = Math.abs(dx ? y : x);
		if (along < 8) continue;
		const score = along + cross * 2.8;
		if (score < bestScore) {
			best = el;
			bestScore = score;
		}
	}
	if (!best) {
		const idx = all.indexOf(current);
		best = all[(idx + (dx + dy > 0 ? 1 : -1) + all.length) % all.length];
	}
	focus(best);
	sound.event({ type: "menu" });
}
function display(name, remember = false) {
	if (remember && screen !== name) stack.push(screen);
	screen = name;
	document
		.querySelectorAll(".screen")
		.forEach((e) => e.classList.toggle("active", e.id === name));
	$("hud").classList.toggle("visible", runActive || attract);
	$("navHint").classList.toggle(
		"hidden",
		!name || name === "attract" || name === "title" || hubEnded,
	);
	$("raceboard").style.display =
		(hubInfo || net?.racing) && (!name || name === "pause") ? "block" : "none";
	view.mode =
		name === "title" ||
		(!runActive &&
			["settings", "how", "about", "together", "join", "lobby"].includes(name))
			? "title"
			: "game";
	prompts();
	if (!name) {
		document.activeElement?.blur();
		$("world").focus({ preventScroll: true });
	} else defaultFocus();
}
function open(name) {
	if (name === "about") {
		aboutPage = 0;
		renderAbout();
	}
	if (name === "dev") syncDev();
	display(name, true);
}
function back() {
	if (screen === "pause") {
		resume();
		return;
	}
	const name = stack.pop() || "title";
	if (name === "title" && !runActive) display("title");
	else display(name);
}
function showTitle() {
	if (hubInfo) return;
	view.playerColor = 0x92f1c7;
	view.playerNumber = 1;
	net?.close();
	net = null;
	view.clearGhosts();
	netScores.clear();
	runActive = false;
	attract = false;
	stack = [];
	keys.clear();
	pointers.clear();
	game.start({ seed: 1980, attract: true });
	display("title");
	lastActivity = performance.now();
	$("bestScore").textContent = "BEST " + formatScore(highScore);
}
function startRun({
	mode = "arcade",
	players = 1,
	seed = crypto.getRandomValues(new Uint32Array(1))[0],
	network = false,
} = {}) {
	if (hubEnded) return;
	const me = hubInfo
		? hubInfo.players.find((p) => p.id === hubInfo.me)
		: net?.players.find((p) => p.id === net.uid);
	view.playerColor = me ? parseInt(me.color.slice(1), 16) : 0x92f1c7;
	view.playerNumber = me ? (me.seat ?? me.id) + 1 : 1;
	runActive = true;
	attract = false;
	stack = [];
	keys.clear();
	pointers.clear();
	netScores.clear();
	view.clearGhosts();
	game.start({ mode, players, seed });
	if (network) game.wait = Math.max(0.1, (network.startAt - Date.now()) / 1000);
	display("");
	$("p2Boost").classList.toggle("hidden", players < 2);
	$("runClock").classList.toggle("hidden", mode !== "attack");
	$("devButton").classList.toggle("hidden", !!hubInfo || !!net?.racing);
	$("restartButton").classList.toggle("hidden", !!hubInfo || !!net?.racing);
	$("quitButton").classList.toggle("hidden", !!hubInfo);
	$("pauseDescription").textContent =
		hubInfo || net?.racing
			? "The race clock keeps running."
			: "The road can wait.";
}
function pause() {
	if (!runActive || hubEnded || attract || screen) return;
	keys.clear();
	mouseBoost = false;
	pointers.clear();
	game.players.forEach((a) =>
		game.setInput(a.id, { lane: 0, boost: false, brake: false }),
	);
	display("pause");
}
function resume() {
	if (!runActive) return;
	stack = [];
	keys.clear();
	pointers.clear();
	display("");
}
function toast(text, color = "var(--gold)") {
	if (attract || hubEnded) return;
	$("toast").textContent = text;
	$("toast").style.color = color;
	$("toast").classList.add("visible");
	toastTimer = 1.8;
}
function formatScore(n) {
	return Math.floor(n)
		.toString()
		.padStart(6, "0")
		.replace(/(.{3})$/, " $1");
}
function event(ev) {
	view?.event(ev);
	if (!attract && screen !== "title") sound.event(ev);
	if (ev.type === "go") goTimer = 0.65;
	if (ev.type === "near") toast("CLOSE SHAVE!  +" + 100 * game.multiplier);
	if (ev.type === "cell") toast("TURBO FULL · SHIELD UP", "var(--mint)");
	if (ev.type === "deflect") toast("SHIELD SAVE!  +200", "var(--mint)");
	if (ev.type === "crash") {
		toast(
			game.lives > 0
				? "BUMPED!  " + game.lives + " BUMPERS LEFT"
				: "THAT’S YOUR LAST BUMPER",
			"var(--coral)",
		);
		rumble(0.6, 220);
	}
	if (ev.type === "switch") rumble(0.12, 45);
	if (ev.type === "finish" && runActive) {
		if (hubInfo) reportHub();
		if (net?.racing) {
			net.send({ t: "result", score: game.score });
			netScores.set(net.uid, { score: game.score, done: true });
		}
		showResults(ev.won);
	}
}
function rumble(strength, duration) {
	for (const pad of navigator.getGamepads?.() || []) {
		const actuator = pad?.vibrationActuator;
		if (actuator?.playEffect)
			actuator
				.playEffect("dual-rumble", {
					duration,
					strongMagnitude: strength,
					weakMagnitude: strength * 0.5,
				})
				.catch(() => {});
	}
}
function showResults(won) {
	const isRace = game.mode === "attack";
	const personal = !net && !hubInfo;
	if (personal && game.score > highScore) {
		highScore = game.score;
		writeStore("dodge-alley-best", highScore);
	}
	$("resultKicker").textContent = isRace
		? "NIGHT RIVALS · YOUR RUN IS IN"
		: game.playerCount === 2
			? "COUCH CREW · TEAM RESULT"
			: "THAT’S A WRAP";
	$("resultTitle").textContent = isRace
		? "NIGHT’S TAKINGS."
		: won
			? "CLEAN GETAWAY!"
			: "BUMPED OUT!";
	$("resultCopy").textContent = isRace
		? "Same streets. Different stories. Let’s count the tokens."
		: won
			? "The night is yours. Diner’s on the house."
			: "The road always gets another night. So do you.";
	$("resultScore").textContent = formatScore(game.score);
	$("resultBest").textContent = personal
		? game.score >= highScore
			? "PERSONAL BEST"
			: "BEST " + formatScore(highScore)
		: "150 SECOND SCORE CHASE";
	$("resultTokens").textContent = game.totalCollected;
	$("resultNear").textContent = game.nearMisses;
	$("resultGaps").textContent = game.gatesTaken;
	$("resultActions").classList.toggle("hidden", !!hubInfo);
	$("resultBack").textContent = net
		? net.isHost
			? "BACK TO ROOM"
			: "LEAVE ROOM"
		: "TITLE SCREEN";
	$("againButton").disabled = !!net && !net.isHost;
	$("againButton").textContent = net
		? net.isHost
			? "RACE AGAIN ↗"
			: "WAITING FOR HOST"
		: "RUN IT BACK ↗";
	display("results");
	renderRanks();
}
function rosterPlayers() {
	return hubInfo ? hubInfo.players : net?.players || [];
}
function myID() {
	return hubInfo ? hubInfo.me : net?.uid;
}
function renderRanks() {
	const rows = rosterPlayers()
		.map((p) => ({ p, ...(netScores.get(p.id) || { score: 0, done: false }) }))
		.sort((a, b) => b.score - a.score);
	for (const id of ["raceboard", "resultRanks"]) {
		const root = $(id);
		root.replaceChildren();
		for (const { p, score, done } of rows) {
			const row = document.createElement("div"),
				name = document.createElement("span"),
				n = document.createElement("b");
			name.textContent = p.name + (p.id === myID() ? " · YOU" : "");
			name.style.color = p.color;
			n.textContent =
				String(Math.floor(p.id === myID() ? game.score : score)).padStart(
					5,
					"0",
				) + (id === "resultRanks" && !done ? " · racing" : "");
			row.append(name, n);
			row.style.borderLeftColor = p.color;
			root.append(row);
		}
	}
}
function applySettings() {
	sound.setMusic(settings.music / 100);
	sound.setEffects(settings.effects / 100);
	if (view) {
		view.cameraStyle = settings.camera;
		view.reduced = settings.reduced;
	}
	$("musicVolume").value = settings.music;
	$("musicOutput").textContent = settings.music + "%";
	$("effectsVolume").value = settings.effects;
	$("effectsOutput").textContent = settings.effects + "%";
	$("glyphSetting").textContent =
		settings.glyphs === "ps" ? "PLAYSTATION" : "XBOX";
	$("cameraSetting").textContent =
		settings.camera === "arcade" ? "ARCADE ANGLE" : "BIRD’S-EYE";
	$("motionSetting").textContent = settings.reduced ? "REDUCED" : "FULL";
	prompts();
	writeStore("dodge-alley-settings", settings);
}
const tuningSpecs = [
	["playerSpeed", "Cruise speed", 6, 22, 0.5, ""],
	["enemySpeed", "Rival speed", 3, 18, 0.5, ""],
	["boostMultiplier", "Turbo power", 1.1, 2.5, 0.05, "×"],
	["recharge", "Turbo recharge", 0, 24, 1, "/s"],
	["gateWidth", "Crossover window", 1.4, 5.5, 0.1, ""],
];
function makeDev() {
	const parent = $("tuningSliders");
	for (const [key, label, min, max, step, suffix] of tuningSpecs) {
		const row = document.createElement("div");
		row.className = "setting";
		const l = document.createElement("label");
		l.htmlFor = "tune-" + key;
		l.textContent = label;
		const input = document.createElement("input");
		input.id = "tune-" + key;
		input.type = "range";
		Object.assign(input, {
			min: String(min),
			max: String(max),
			step: String(step),
			value: String(game.tuning[key]),
		});
		input.dataset.tune = key;
		const out = document.createElement("output");
		out.id = "value-" + key;
		out.textContent = game.tuning[key] + suffix;
		row.append(l, input, out);
		parent.append(row);
	}
}
function syncDev() {
	for (const [key, , a, b, c, suffix] of tuningSpecs) {
		$("tune-" + key).value = game.tuning[key];
		$("value-" + key).textContent =
			Number(game.tuning[key].toFixed(2)) + suffix;
	}
	$("godButton").textContent =
		"INVINCIBLE: " + (game.tuning.invincible ? "ON" : "OFF");
	$("autoButton").textContent =
		"AUTOPILOT: " + (game.tuning.autopilot ? "ON" : "OFF");
	$("devStatus").textContent =
		`RAPIER 0.19.3 · ${view.backend}\n${game.phase.toUpperCase()} · SHIFT ${game.stage + 1}\n${game.remaining} TOKENS · ${game.lives} BUMPERS`;
}
function roomEvent(ev) {
	if (ev.type === "roster") {
		renderLobby();
		renderRanks();
	}
	if (ev.type === "status") $("roomStatus").textContent = ev.text;
	if (ev.type === "start") {
		startRun({ mode: "attack", seed: ev.seed, network: ev });
	}
	if (ev.type === "ghost") {
		const p = net?.players.find((p) => p.id === ev.id);
		if (p) {
			view.setGhost(ev.id, { ...ev, ...p });
			netScores.set(ev.id, {
				score: ev.score,
				done: netScores.get(ev.id)?.done || false,
			});
			renderRanks();
		}
	}
	if (ev.type === "result") {
		netScores.set(ev.id, { score: ev.score, done: true });
		renderRanks();
	}
	if (ev.type === "host-left") {
		showTitle();
		toast("HOST LEFT · ROOM CLOSED", "var(--coral)");
	}
	if (ev.type === "lobby") {
		runActive = false;
		view.clearGhosts();
		display("lobby");
		renderLobby();
	}
}
function renderLobby() {
	if (!net) return;
	const live = new Set(net.players.map((p) => p.id));
	for (const [id, v] of view.ghosts) {
		if (!live.has(id)) {
			view.scene.remove(v.root);
			view.ghosts.delete(id);
		}
	}
	$("roomCode").textContent = net.code || "----";
	$("roster").replaceChildren();
	for (let i = 0; i < 4; i++) {
		const p = net.players.find((p) => p.seat === i),
			box = document.createElement("div");
		box.className = "seat";
		const dot = document.createElement("i"),
			name = document.createElement("span"),
			status = document.createElement("small");
		if (p) dot.style.background = p.color;
		name.textContent = p ? p.name : "EMPTY SEAT";
		status.textContent = p
			? p.id === net.uid
				? "YOU"
				: i === 0
					? "HOST"
					: "READY"
			: "WAITING";
		box.append(dot, name, status);
		$("roster").append(box);
	}
	$("startRoomButton").disabled = !net.isHost || net.players.length < 2;
	$("startRoomButton").textContent = !net.isHost
		? "WAITING FOR HOST"
		: net.players.length < 2
			? "WAITING FOR DRIVERS"
			: "START THE RACE ↗";
}
async function createRoom(code = null) {
	net?.close();
	net = new RoomNet(roomEvent);
	runActive = false;
	display("lobby");
	$("roomStatus").textContent = code
		? "Finding your room…"
		: "Opening internet signalling…";
	await net.open(code);
	renderLobby();
}
const data = JSON.parse($("creditsData").textContent);
const sourceKeys = [
	["date", "Date"],
	["source", "Source"],
	["plan", "Plan"],
	["genre", "Genre"],
	["perspective", "Perspective"],
	["tech", "Tech"],
	["artDirection", "Art direction"],
	["animation", "Animation"],
	["audio", "Audio"],
	["online", "Online"],
	["testing", "Testing"],
	["research", "Research"],
	["environment", "Environment"],
	["model", "Model"],
	["usage", "Usage"],
];
const testingQuestions = [
	"How many issues did testing catch?",
	"How many were critical / game breaking?",
	"Most helpful test?",
	"Least helpful test?",
];
const engineQuestions = [
	"What did you like most?",
	"Did you get stuck or guess wrong?",
	"Most important thing built by hand?",
	"Hardest part of the engine?",
	"What changed in the engine?",
	"One thing you would change?",
];
const promptQuestions = [
	"What did you like most?",
	"What was confusing?",
	"What was hardest?",
	"What would you change?",
];
function aboutPages() {
	return [0, 1, 2]
		.map((i) => ({
			title: "SOURCE INFORMATION",
			items: sourceKeys
				.slice(i * 5, i * 5 + 5)
				.map(([k, l]) => [l, data.sourceInformation[k]]),
		}))
		.concat([
			{
				title: "TESTING FEEDBACK",
				items: testingQuestions.map((q, i) => [q, data.testingFeedback[i]]),
			},
			{
				title: "ENGINE FEEDBACK",
				items: engineQuestions
					.slice(0, 3)
					.map((q, i) => [q, data.engineFeedback[i]]),
			},
			{
				title: "ENGINE FEEDBACK",
				items: engineQuestions
					.slice(3)
					.map((q, i) => [q, data.engineFeedback[i + 3]]),
			},
			{
				title: "PROMPT FEEDBACK",
				items: promptQuestions.map((q, i) => [q, data.promptFeedback[i]]),
			},
		]);
}
function renderAbout() {
	const pages = aboutPages(),
		page = pages[(aboutPage + pages.length) % pages.length];
	$("aboutHeading").textContent = page.title;
	$("aboutContent").classList.toggle("about-feedback", aboutPage >= 3);
	$("aboutContent").replaceChildren();
	for (const [k, v] of page.items) {
		const row = document.createElement("div");
		row.className = "about-item";
		const title = document.createElement("b"),
			value = document.createElement("span");
		title.textContent = k;
		value.textContent = v;
		row.append(title, value);
		$("aboutContent").append(row);
	}
	$("aboutPage").textContent = aboutPage + 1 + " / " + pages.length;
}
const actions = {
	solo: () => startRun(),
	coop: () => startRun({ players: 2 }),
	together: () => open("together"),
	how: () => open("how"),
	settings: () => open("settings"),
	about: () => open("about"),
	pause,
	resume,
	back,
	howPlay: () => {
		if (runActive) resume();
		else startRun();
	},
	dev: () => {
		if (!hubInfo && !net?.racing) open("dev");
	},
	quit: () => {
		if (!hubInfo) showTitle();
	},
	restart: () => {
		if (!hubInfo && !net?.racing)
			startRun({ players: game.playerCount, mode: game.mode, seed: game.seed });
	},
	glyphs: () => {
		settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
		applySettings();
	},
	camera: () => {
		settings.camera = settings.camera === "arcade" ? "overhead" : "arcade";
		applySettings();
	},
	motion: () => {
		settings.reduced = !settings.reduced;
		applySettings();
	},
	fullscreen: () => {
		if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
		else
			document.documentElement
				.requestFullscreen?.()
				.catch(() => toast("FULLSCREEN UNAVAILABLE"));
	},
	god: () => {
		game.tuning.invincible = !game.tuning.invincible;
		syncDev();
	},
	auto: () => {
		game.tuning.autopilot = !game.tuning.autopilot;
		syncDev();
	},
	repair: () => {
		game.lives = game.playerCount > 1 ? 4 : 3;
		game.players.forEach((p) => {
			p.boost = 100;
			p.invuln = 3;
			p.shield = 4;
		});
		syncDev();
		toast("BUMPERS FIXED · TURBO FULL");
	},
	skip: () => {
		game.skipStage();
		syncDev();
	},
	nextStage: () => {
		game.stage = (game.stage + 1) % 3;
		game.buildStage();
		game.phase = "countdown";
		game.wait = 2;
		syncDev();
	},
	resetTuning: () => {
		Object.assign(game.tuning, DEFAULTS);
		syncDev();
	},
	createRoom: () => createRoom(),
	joinRoom: () => {
		open("join");
		$("joinCode").value = "";
		updateJoin();
	},
	connectRoom: () => {
		if (/^\d{4}$/.test($("joinCode").value)) createRoom($("joinCode").value);
	},
	erase: () => {
		$("joinCode").value = $("joinCode").value.slice(0, -1);
		updateJoin();
	},
	leaveRoom: () => showTitle(),
	copyCode: async () => {
		try {
			await navigator.clipboard.writeText(net.code);
			$("roomStatus").textContent = "Code copied. Send it to your friends.";
		} catch {
			$("roomStatus").textContent =
				"Room code: " + net.code + " · Share these four digits.";
		}
	},
	startRoom: () => net?.start(),
	resultBack: () => {
		if (hubInfo) return;
		if (net) {
			if (net.isHost) net.lobby();
			else showTitle();
		} else showTitle();
	},
	again: () => {
		if (hubInfo) return;
		if (net) net.start();
		else startRun({ players: game.playerCount, mode: game.mode });
	},
	aboutPrev: () => {
		aboutPage = (aboutPage + 6) % 7;
		renderAbout();
	},
	aboutNext: () => {
		aboutPage = (aboutPage + 1) % 7;
		renderAbout();
	},
};
function perform(name) {
	if (!ready || hubEnded) return;
	if (
		hubInfo &&
		[
			"quit",
			"restart",
			"solo",
			"coop",
			"together",
			"createRoom",
			"connectRoom",
			"again",
			"resultBack",
			"dev",
		].includes(name)
	)
		return;
	actions[name]?.();
	sound.event({ type: "menu" });
}
function updateJoin() {
	$("joinCode").value = $("joinCode").value.replace(/\D/g, "").slice(0, 4);
	$("connectRoomButton").disabled = $("joinCode").value.length !== 4;
}
document.addEventListener("click", (e) => {
	const el = e.target.closest("button");
	if (!el || !ready) return;
	if (el.id === "touchBoost") return;
	const used = activity(
		e.pointerType === "touch"
			? "touch"
			: lastInput === "gamepad"
				? "gamepad"
				: "mouse",
	);
	if (used) return;
	sound.unlock();
	if (el.dataset.action) perform(el.dataset.action);
	if (el.dataset.digit) {
		$("joinCode").value = ($("joinCode").value + el.dataset.digit).slice(0, 4);
		updateJoin();
	}
});
document.addEventListener("pointerover", (e) => {
	if (!ready || e.pointerType === "touch") return;
	const el = e.target.closest("button,input");
	if (el && screen) {
		focus(el);
	}
});
document.addEventListener("pointermove", (e) => {
	if (!ready) return;
	if (
		e.pointerType === "mouse" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) > 2
	)
		activity("mouse");
	const p = pointers.get(e.pointerId);
	if (p && runActive && !screen) {
		const delta = e.clientX - p.x;
		if (Math.abs(delta) > 32) {
			game.queueLane(0, delta < 0 ? 1 : -1);
			p.x = e.clientX;
		}
	}
});
document.addEventListener("pointerdown", (e) => {
	if (!ready || hubEnded) return;
	const was = activity(e.pointerType === "touch" ? "touch" : "mouse");
	sound.unlock();
	if (was) {
		e.preventDefault();
		return;
	}
	if (e.pointerType === "touch" && runActive && !screen) {
		if (e.target.closest("button") && e.target.id !== "touchBoost") return;
		e.preventDefault();
		pointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			boost: e.target.id === "touchBoost" || e.clientX > innerWidth * 0.6,
		});
		e.target.setPointerCapture?.(e.pointerId);
	} else if (e.target === $("world") && runActive && !screen) {
		if (e.button === 2) {
			mouseBoost = true;
			e.preventDefault();
		} else if (e.button === 0) {
			const lane = view.pickLane(e.clientX, e.clientY);
			game.queueLane(0, Math.sign(lane - game.players[0].lane));
		}
	}
});
for (const name of ["pointerup", "pointercancel"])
	document.addEventListener(name, (e) => {
		pointers.delete(e.pointerId);
		if (e.button === 2) mouseBoost = false;
	});
document.addEventListener("contextmenu", (e) => {
	if (e.target === $("world")) e.preventDefault();
});
document.addEventListener("input", (e) => {
	const el = e.target;
	if (el.id === "joinCode") updateJoin();
	if (el.id === "musicVolume") {
		settings.music = Number(el.value);
		applySettings();
	}
	if (el.id === "effectsVolume") {
		settings.effects = Number(el.value);
		applySettings();
	}
	if (el.dataset.tune) {
		game.tuning[el.dataset.tune] = Number(el.value);
		syncDev();
	}
});
document.addEventListener("keydown", (e) => {
	if (!ready || hubEnded) return;
	const was = activity("keyboard");
	sound.unlock();
	if (was) {
		e.preventDefault();
		return;
	}
	const key = e.key.toLowerCase(),
		input = e.target.tagName === "INPUT";
	if (input && e.target.type === "text" && key !== "escape") {
		if (key === "enter" && screen === "join") {
			e.preventDefault();
			perform("connectRoom");
		}
		return;
	}
	if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key))
		e.preventDefault();
	if (key === "escape" || key === "p") {
		e.preventDefault();
		if (screen === "") pause();
		else if (screen === "pause") resume();
		else back();
		return;
	}
	if (screen) {
		if (e.repeat) return;
		if (key === "arrowup" || key === "w") navigate(0, -1);
		else if (key === "arrowdown" || key === "s") navigate(0, 1);
		else if (key === "arrowleft" || key === "a") navigate(-1, 0);
		else if (key === "arrowright" || key === "d") navigate(1, 0);
		else if (key === "enter" || key === " ") {
			e.preventDefault();
			document.activeElement?.click();
		}
		return;
	}
	keys.add(key);
});
document.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
	keys.clear();
	pointers.clear();
	mouseBoost = false;
	if (ready && runActive && !hubInfo && !net?.racing && !attract && !screen)
		pause();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		keys.clear();
		pointers.clear();
		mouseBoost = false;
		if (ready && runActive && !hubInfo && !net?.racing && !attract && !screen)
			pause();
	}
});
function pollPads(dt) {
	inputFrames++;
	const pads = [...(navigator.getGamepads?.() || [])].filter(
			(p) => p && p.connected !== false,
		),
		values = [];
	for (let pi = 0; pi < pads.length; pi++) {
		const pad = pads[pi],
			buttons = pad.buttons.map((b) =>
				typeof b === "number" ? b : Math.max(b.value || 0, b.pressed ? 1 : 0),
			),
			previous = padHistory.get(pad.index) || [],
			edge = (n) => buttons[n] > 0.5 && !(previous[n] > 0.5);
		const x = pad.axes[0] || 0,
			y = pad.axes[1] || 0;
		const active =
			buttons.some((b) => b > 0.5) || Math.abs(x) > 0.45 || Math.abs(y) > 0.45;
		let consumed = false;
		if (active) {
			consumed = activity("gamepad");
			sound.unlock();
		}
		if (!consumed && pi === 0) {
			if (edge(9) && !(buttons[8] > 0.5)) {
				if (!screen) pause();
				else if (screen === "pause") resume();
			} else if (screen && screen !== "attract") {
				menuRepeat -= dt;
				const dx =
						buttons[14] > 0.5
							? -1
							: buttons[15] > 0.5
								? 1
								: x < -0.5
									? -1
									: x > 0.5
										? 1
										: 0,
					dy =
						buttons[12] > 0.5
							? -1
							: buttons[13] > 0.5
								? 1
								: y < -0.5
									? -1
									: y > 0.5
										? 1
										: 0;
				if ((dx || dy) && menuRepeat <= 0) {
					navigate(
						Math.abs(x) > Math.abs(y) || (dx && !dy) ? dx : 0,
						Math.abs(x) > Math.abs(y) || (dx && !dy) ? 0 : dy,
					);
					menuRepeat = 0.2;
				}
				if (!dx && !dy) menuRepeat = 0;
				if (edge(0)) document.activeElement?.click();
				if (edge(1)) back();
			}
		}
		values.push({
			lane:
				buttons[14] > 0.5 || x < -0.4
					? 1
					: buttons[15] > 0.5 || x > 0.4
						? -1
						: 0,
			boost: buttons[0] > 0.5 || buttons[7] > 0.3,
			brake: buttons[6] > 0.3 || buttons[2] > 0.5,
		});
		padHistory.set(pad.index, buttons);
	}
	return values;
}
function readInputs(pads) {
	if (!runActive || screen || hubEnded) return;
	const coop = game.playerCount > 1;
	for (let i = 0; i < game.playerCount; i++) {
		let lane = 0,
			boost = false,
			brake = false;
		const left =
				i === 0
					? keys.has("a") || (!coop && keys.has("arrowleft"))
					: keys.has("arrowleft"),
			right =
				i === 0
					? keys.has("d") || (!coop && keys.has("arrowright"))
					: keys.has("arrowright");
		lane = left ? 1 : right ? -1 : 0;
		boost = i === 0 ? keys.has(" ") || mouseBoost : keys.has("enter");
		brake =
			i === 0
				? keys.has("s") || (!coop && keys.has("arrowdown"))
				: keys.has("arrowdown");
		if (pads[i]) {
			lane = pads[i].lane || lane;
			boost ||= pads[i].boost;
			brake ||= pads[i].brake;
		}
		if (i === 0 && lastInput === "touch") {
			boost ||= [...pointers.values()].some((p) => p.boost);
			const a = game.players[0],
				danger = game.rivals.some(
					(b) => b.lane === a.lane && wrap(b.u - a.u) < 0.085,
				);
			if (danger) {
				brake = true;
				if (!a.queueDir) {
					const options = [1, -1].filter(
						(dir) => a.lane + dir >= 0 && a.lane + dir < 4,
					);
					const dir = options.find(
						(dir) =>
							!game.rivals.some(
								(b) => b.lane === a.lane + dir && wrap(b.u - a.u) < 0.12,
							),
					);
					if (dir) game.queueLane(0, dir);
				}
			}
		}
		game.setInput(i, { lane, boost, brake });
	}
}
function shouldTick() {
	return (
		!hubEnded &&
		(screen === "title" ||
			attract ||
			(runActive &&
				(!screen || hubInfo || net?.racing) &&
				!["won", "lost", "waiting", "ended"].includes(game.phase)))
	);
}
function simulate(dt) {
	if (hubInfo) {
		if (!hubStarted || hubEnded) return;
		if (!hubRunning && hub.time() >= 0) {
			hubRunning = true;
			game.phase = "playing";
			event({ type: "go" });
		}
		if (!hubRunning) return;
	}
	if (shouldTick()) game.tick(dt);
}
function sendOnline(dt) {
	if (hubEnded) return;
	remoteClock += dt;
	progressClock += dt;
	if (!((hubInfo && hubRunning) || (net?.racing && runActive))) return;
	if (remoteClock >= 0.1) {
		remoteClock = 0;
		const a = game.players[0];
		if (a) {
			const data = {
				u: wrap(a.u),
				lane: a.lane,
				stage: game.stage,
				score: game.score,
			};
			if (hubInfo) hub.send({ type: "ghost", ...data }, { reliable: false });
			else net.send({ t: "ghost", data });
			netScores.set(myID(), {
				score: game.score,
				done: hubReported || ["won", "lost"].includes(game.phase),
			});
			renderRanks();
		}
	}
	if (hubInfo && progressClock >= 0.75) {
		progressClock = 0;
		hub.progress({
			score: game.score,
			label: `${game.totalCollected} tokens · shift ${game.stage + 1}`,
		});
	}
}
function reportHub() {
	if (!hubInfo || hubReported || hubEnded) return;
	hubReported = true;
	hub.progress({ score: game.score, label: game.totalCollected + " tokens" });
	hub.result({
		score: game.score,
		stats: {
			Tokens: game.totalCollected,
			"Close shaves": game.nearMisses,
			Gaps: game.gatesTaken,
			"Shifts cleared": game.stage,
		},
	});
}
async function initHub() {
	hubInfo = await hub.connect({ mode: "ghost", seats: [1, 4] });
	if (!hubInfo) {
		showTitle();
		return;
	}
	hub.on("start", () => {
		hubStarted = true;
	});
	hub.on("message", (data, from) => {
		if (
			hubEnded ||
			data?.type !== "ghost" ||
			!Number.isFinite(data.u) ||
			!Number.isInteger(data.lane) ||
			data.lane < 0 ||
			data.lane > 3
		)
			return;
		const p = hubInfo.players.find((p) => p.id === from);
		if (p) {
			view.setGhost(from, { ...data, ...p });
			netScores.set(from, { score: data.score, done: false });
			renderRanks();
		}
	});
	hub.on("leave", ({ id }) => {
		const v = view.ghosts.get(id);
		if (v) {
			view.scene.remove(v.root);
			view.ghosts.delete(id);
		}
		netScores.delete(id);
	});
	hub.on("time-up", () => {
		if (!hubReported) {
			game.phase = "won";
			reportHub();
			showResults(true);
		}
	});
	hub.on("end", () => {
		hubEnded = true;
		game.phase = "ended";
		sound.mute(true);
		keys.clear();
		pointers.clear();
		$("pauseButton").classList.add("hidden");
		$("resultActions").classList.add("hidden");
		$("navHint").classList.add("hidden");
		if (screen !== "results") {
			showResults(true);
		}
	});
	startRun({ mode: "attack", seed: hubInfo.seed });
	game.phase = "waiting";
	game.wait = 3;
	view.update(game, 0);
	await view.renderer.compileAsync(view.scene, view.camera);
	hub.ready();
}
function updateHud(dt) {
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").classList.remove("visible");
	}
	goTimer = Math.max(0, goTimer - dt);
	if (!runActive && !attract) return;
	$("score").textContent = formatScore(game.score);
	$("multiplier").textContent = "×" + game.multiplier;
	$("tokensLeft").textContent = "● " + game.remaining + " TOKENS LEFT";
	$("shiftNumber").textContent =
		(game.mode === "attack" ? "NIGHT RIVALS · " : "SHIFT ") +
		String(
			game.mode === "arcade" ? (game.stage % 3) + 1 : game.stage + 1,
		).padStart(2, "0") +
		(game.mode === "arcade" ? " / 03" : "");
	$("shiftName").textContent = LEVELS[game.stage % 3].name;
	$("shiftProgress").style.width =
		(1 - game.remaining / game.stageTotal) * 100 + "%";
	const lifeHTML = Array.from(
		{ length: Math.max(game.playerCount > 1 ? 4 : 3, game.lives) },
		(_, i) => `<i class="life ${i >= game.lives ? "empty" : ""}"></i>`,
	).join("");
	if ($("lives").innerHTML !== lifeHTML) $("lives").innerHTML = lifeHTML;
	$("lives").setAttribute("aria-label", game.lives + " lives");
	for (let i = 0; i < game.players.length; i++) {
		const a = game.players[i],
			prefix = i ? "p2Boost" : "boost";
		$(i ? "p2BoostBar" : "boostBar").style.width = a.boost + "%";
		$(i ? "p2BoostAmount" : "boostAmount").textContent =
			Math.floor(a.boost) + "%";
		$(i ? "p2Queue" : "queueLabel").textContent =
			a.shield > 0
				? "SHIELD · " + a.shield.toFixed(1) + "s"
				: a.queueDir > 0
					? "← INWARD QUEUED"
					: a.queueDir < 0
						? "OUTWARD QUEUED →"
						: i
							? "DRIVER 2 · FIND A GAP"
							: "AUTO-DRIVE · FIND A GAP";
	}
	const sec = Math.max(0, Math.ceil(game.timeLeft));
	$("runClock").textContent =
		Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
	let title = "",
		sub = "";
	if (hubInfo && !hubRunning && !hubEnded) {
		title =
			hubStarted && Number.isFinite(hub.time())
				? Math.max(1, Math.ceil(-hub.time() / 1000))
				: "NIGHT RIVALS";
		sub = hubStarted ? "READY TO ROLL" : "WAITING FOR THE HUB";
	} else if (game.phase === "countdown") {
		title = String(Math.max(1, Math.ceil(game.wait)));
		sub = LEVELS[game.stage % 3].name + " · " + LEVELS[game.stage % 3].subtitle;
	} else if (game.phase === "stageclear") {
		title = "SHIFT CLEARED!";
		sub =
			"BONUS +" +
			(1000 + game.lives * 250) +
			" · " +
			(game.stage % 3 === 2 && game.mode === "arcade"
				? "THE NIGHT IS YOURS"
				: "NEXT SHIFT COMING UP");
	} else if (goTimer > 0 && game.phase === "playing") {
		title = "LET’S ROLL!";
		sub = "TAKE THE GAPS. KEEP YOUR BUMPERS.";
	}
	const visible = !!title && (!screen || attract);
	$("callout").classList.toggle("visible", visible);
	if (visible) {
		$("calloutTitle").textContent = title;
		$("calloutSubtitle").textContent = sub;
	}
}
function frame(ms) {
	if (!ready) return;
	const dt = Math.min(0.05, (ms - (lastFrame || ms)) / 1000);
	lastFrame = ms;
	const pads = pollPads(dt);
	readInputs(pads);
	net?.tick(dt);
	if (
		!hubInfo &&
		["title", "together"].includes(screen) &&
		ms - lastActivity >= 10000
	) {
		attract = true;
		runActive = false;
		stack = [];
		game.start({ seed: 1980, attract: true });
		display("attract");
		$("p2Boost").classList.add("hidden");
		$("runClock").classList.add("hidden");
	}
	accumulator += dt;
	let safety = 0;
	while (accumulator >= 1 / 60 && safety++ < 6) {
		simulate(1 / 60);
		accumulator -= 1 / 60;
	}
	sendOnline(dt);
	updateHud(dt);
	view.update(game, dt, !shouldTick());
	if (!testNoRender) view.render();
	sound.update(game, !shouldTick());
	requestAnimationFrame(frame);
}
function installTestAPI() {
	window.__dodge = {
		get state() {
			return {
				...game.snapshot(),
				debug: TEST
					? {
							inputFrames,
							focus: {
								tag: document.activeElement?.tagName,
								id: document.activeElement?.id,
								action: document.activeElement?.dataset.action,
							},
							keys: [...keys],
							input: game.players.map((a) => ({ ...a.input })),
						}
					: undefined,
				screen,
				runActive,
				attract,
				lastInput,
				renderer: view.backend,
				renderCount: view.renderCount,
				hub: hubInfo
					? {
							started: hubStarted,
							running: hubRunning,
							ended: hubEnded,
							reported: hubReported,
							me: hubInfo.me,
						}
					: null,
				room: net
					? {
							code: net.code,
							isHost: net.isHost,
							connected: net.connected,
							online: net.online,
							links: net.links.size,
							players: net.players,
							racing: net.racing,
							ghosts: view.ghosts.size,
							ghostData: [...view.ghosts].map(([id, v]) => ({
								id,
								u: v.data.u,
								lane: v.data.lane,
								score: v.data.score,
							})),
						}
					: null,
				musicVolume: sound.musicVolume,
				audio: sound.levels(),
				settings: { ...settings },
			};
		},
		ready: true,
	};
	if (TEST)
		Object.assign(window.__dodge, {
			action: perform,
			start: startRun,
			advance(seconds) {
				const frames = Math.ceil(seconds * 60);
				for (let i = 0; i < frames; i++) simulate(1 / 60);
				view.update(game, 0, !shouldTick());
				updateHud(0);
				return game.snapshot();
			},
			tune(values) {
				Object.assign(game.tuning, values);
				syncDev();
			},
			input: (id, data) => game.setInput(id, data),
			queue: (id, dir) => game.queueLane(id, dir),
			idle(ms) {
				lastActivity = performance.now() - ms;
			},
			renderOnce() {
				view.update(game, 1, !shouldTick());
				updateHud(1);
				view.render();
			},
			useWebRTCOnly() {
				net?.bc?.close();
				if (net) net.bc = null;
			},
			setRendering(enabled) {
				testNoRender = !enabled;
				if (enabled) {
					view.update(game, 0, !shouldTick());
					view.render();
				}
			},
			audioProbe: () => sound.probe(),
			createRoom: (code) => createRoom(code),
			get ghosts() {
				return [...view.ghosts.keys()];
			},
			get credits() {
				return data;
			},
		});
}
async function boot() {
	try {
		await RAPIER.init();
		$("bootStatus").textContent = "Painting the city. Checking the bumpers…";
		view = new View($("world"));
		game = new Game(RAPIER, event);
		game.start({ seed: 1980, attract: true });
		view.update(game, 0);
		await view.init();
		makeDev();
		applySettings();
		ready = true;
		if (hub.active) await initHub();
		else showTitle();
		$("boot").style.display = "none";
		installTestAPI();
		requestAnimationFrame(frame);
	} catch (err) {
		console.error(err);
		$("bootStatus").textContent = "The alley couldn’t open.";
		$("bootError").style.display = "block";
		$("bootError").textContent =
			"This game needs WebGPU or WebGL 2 and WebAssembly. Try a recent Chrome, Edge, or Safari. " +
			String(err.message || err);
		if (hub.active) hub.fail(String(err.message || err));
	}
}
boot();
