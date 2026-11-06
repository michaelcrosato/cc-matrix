const $ = (id) => document.getElementById(id),
	clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const COURTS = [
	{
		id: "rally",
		name: "Classic Rally",
		short: "The original good time.",
		desc: "Open court. Pure paddle play. Find the gap and keep it moving.",
		tip: "Meet the ball off-center to send it at an angle.",
		color: "#ed7055",
	},
	{
		id: "bank",
		name: "Bankshot",
		short: "A little bounce of genius.",
		desc: "Two brass bumpers change every angle. Bank a shot to build your style score.",
		tip: "Brass bumpers ricochet the ball. Keep an eye on the second bounce.",
		color: "#ecc35c",
	},
	{
		id: "goal",
		name: "Goal Rush",
		short: "Small goal. Big ambitions.",
		desc: "Beat the keeper through the little goal. The back walls keep wild shots alive.",
		tip: "Only the mint and coral goal mouths score. Aim for the middle.",
		color: "#6bb6a4",
	},
];
const DEFAULTS = {
	ballSpeed: 9.2,
	paddleSpeed: 7.8,
	paddleSize: 1.05,
	aiSkill: 0.7,
	chargeRate: 0.8,
	targetScore: 5,
};
const params = { ...DEFAULTS };
const defaultSettings = {
	music: 0.1,
	sfx: 0.7,
	glyphs: "ps",
	reduceMotion: false,
	muted: false,
};
let settings = { ...defaultSettings },
	best = { rally: 0, cups: 0, gold: 0 };
try {
	settings = {
		...settings,
		...JSON.parse(localStorage.getItem("paddle-royale-settings") || "{}"),
	};
	best = {
		...best,
		...JSON.parse(localStorage.getItem("paddle-royale-best") || "{}"),
	};
} catch {}
const save = () => {
	try {
		localStorage.setItem("paddle-royale-settings", JSON.stringify(settings));
		localStorage.setItem("paddle-royale-best", JSON.stringify(best));
	} catch {}
};
const audio = new AudioEngine();
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
audio.setMuted(settings.muted);
let arena,
	world,
	ballBody,
	ballCollider,
	paddleBodies = [],
	paddleColliders = [],
	bankBodies = [],
	endBodies = [];
let focusIndex = 0,
	screen = "title",
	modalReturn = "title",
	lastInput = "keyboard",
	lastActivity = performance.now(),
	toastUntil = 0,
	centerUntil = 0,
	frameTime = 0,
	accumulator = 0,
	netTimer = 0,
	renderTime = 0,
	uiTimer = 0,
	hubHoldUntil = 0,
	netStatus = "",
	suppressClick = false;
let keys = new Set(),
	mouse = { active: false, z: 0, aim: 0, charge: false, dash: false },
	touches = new Map(),
	touchAxis = 0,
	touchAim = 0,
	touchDash = false,
	touchActive = false;
let padPrev = [],
	padPrevByIndex = new Map(),
	padAxesPrev = 0,
	padNavAt = 0,
	lastChargeSound = 0,
	uiPrev = "",
	attractElapsed = 0,
	attractCourtAt = 0;
const remoteInputs = [
	{ move: 0, aim: 0, charge: false, dash: false },
	{ move: 0, aim: 0, charge: false, dash: false },
];
const G = {
	phase: "title",
	mode: "solo",
	court: 0,
	scores: [0, 0],
	paddles: [
		{ z: 0, v: 0, charge: 0, dash: 0, cooldown: 0, aim: 0 },
		{ z: 0, v: 0, charge: 0, dash: 0, cooldown: 0, aim: 0 },
	],
	ball: { x: 0, z: 0, vx: 0, vz: 0 },
	trail: [],
	particles: [],
	rally: 0,
	time: 0,
	serve: 1,
	serveTimer: 1.7,
	pointPause: 0,
	winner: null,
	attract: false,
	wins: [],
	stats: { bestRally: 0, power: 0, banks: 0, dashes: 0, points: 0 },
	flash: 0,
	perfect: false,
	debug: false,
};
let bankCooldown = 0,
	lastWallAt = -10,
	receivedPhase = null,
	hubEnded = false;
const network = createNetwork({
	onRole: () => {
		if (screen === "room") renderRoom();
	},
	onStatus: (text) => {
		netStatus = text;
		const el = $("roomstatus");
		if (el) el.textContent = text;
	},
	onInput: (input, seat) => {
		if (seat >= 0 && seat < 2)
			remoteInputs[seat] = {
				move: clamp(Number(input?.move) || 0, -1, 1),
				aim: clamp(Number(input?.aim) || 0, -1, 1),
				charge: !!input?.charge,
				dash: !!input?.dash,
			};
	},
	onSnapshot: (snapshot) => {
		if (network.info.isHost || !snapshot) return;
		applySnapshot(snapshot);
	},
	onStart: (config, context) => {
		hubHoldUntil = context.hub ? performance.now() + context.countdownMs : 0;
		startGame({ mode: "online", court: config.court || 0 });
	},
	onLeave: () => {
		if (G.mode === "online" && ["play", "serve", "pause"].includes(G.phase)) {
			G.phase = "pause";
			showToast("Your rival has left the court.", 6000);
			openModal("disconnected");
		}
	},
	onTimeUp: () => {
		if (network.info.isHost) {
			G.winner =
				G.scores[0] === G.scores[1] ? null : G.scores[0] > G.scores[1] ? 0 : 1;
			network.finish(G.scores);
			G.phase = "result";
			showResult();
		}
	},
	onEnd: (reason) => {
		hubEnded = true;
		audio.setMuted(true);
		keys.clear();
		mouse.charge = false;
		mouse.dash = false;
		if (G.mode === "online") {
			G.phase = "result";
			showResult(reason);
		}
	},
});
function snapshot() {
	return {
		phase: G.phase,
		court: G.court,
		mode: G.mode,
		scores: G.scores,
		ball: G.ball,
		paddles: G.paddles,
		trail: G.trail.slice(-16),
		particles: G.particles.slice(0, 12),
		rally: G.rally,
		time: G.time,
		serve: G.serve,
		serveTimer: G.serveTimer,
		winner: G.winner,
		stats: G.stats,
		wins: G.wins,
		flash: G.flash,
	};
}
function applySnapshot(s) {
	const old = G.phase,
		oldScores = G.scores.join();
	for (const k of [
		"phase",
		"court",
		"scores",
		"ball",
		"paddles",
		"trail",
		"particles",
		"rally",
		"time",
		"serve",
		"serveTimer",
		"winner",
		"stats",
		"wins",
		"flash",
	])
		if (s[k] !== undefined) G[k] = s[k];
	G.mode = "online";
	if (oldScores !== G.scores.join()) {
		audio.play("goal");
		showToast(
			G.scores[0] > Number(oldScores.split(",")[0])
				? "CORAL SCORES!"
				: "MINT SCORES!",
			1800,
		);
	}
	if (G.phase === "result" && old !== "result") showResult();
	else if (["play", "serve"].includes(G.phase) && old === "result") {
		screen = "game";
		$("modal").classList.add("hidden");
		$("hud").classList.remove("hidden");
	}
	if (G.phase === "pause" && old !== "pause") {
		openModal("onlinepaused");
	} else if (["play", "serve"].includes(G.phase) && screen === "onlinepaused") {
		screen = "game";
		$("modal").classList.add("hidden");
	}
}
function setInput(type) {
	if (hubEnded) return true;
	if (lastInput !== type) {
		lastInput = type;
		document.body.classList.toggle("touch-mode", type === "touch");
		updatePrompts();
	}
	lastActivity = performance.now();
	audio.resume().catch(() => {});
	if (G.attract) {
		exitAttract();
		return true;
	}
	return false;
}
function glyph(action) {
	const ps = {
			accept: "×",
			charge: "×",
			dash: "R1",
			pause: "OPTIONS",
			back: "○",
			move: "L",
			aim: "L ← →",
		},
		xb = {
			accept: "A",
			charge: "A",
			dash: "RB",
			pause: "MENU",
			back: "B",
			move: "L",
			aim: "L ← →",
		};
	if (lastInput === "gamepad")
		return (settings.glyphs === "xbox" ? xb : ps)[action];
	return {
		accept: "ENTER",
		charge: lastInput === "mouse" ? "LMB" : "SPACE",
		dash: lastInput === "mouse" ? "RMB" : "SHIFT",
		pause: "ESC",
		back: "ESC",
		move: lastInput === "mouse" ? "MOUSE" : "W S / ↑ ↓",
		aim: lastInput === "mouse" ? "MOUSE" : "A D",
	}[action];
}
function showToast(text, ms = 2300) {
	$("toast").textContent = text;
	$("toast").classList.remove("hidden");
	toastUntil = performance.now() + ms;
}
function center(text, ms = 1500) {
	$("centerMsg").textContent = text;
	$("centerMsg").classList.remove("hidden");
	centerUntil = performance.now() + ms;
}
function vibrate(strength = 0.2) {
	const pad = navigator.getGamepads?.()[0];
	try {
		pad?.vibrationActuator
			?.playEffect("dual-rumble", {
				duration: 80,
				strongMagnitude: strength,
				weakMagnitude: strength * 0.5,
			})
			.catch(() => {});
	} catch {}
}
function updatePrompts() {
	const menu = $("hud").querySelector(".menu-btn");
	if (menu) menu.textContent = glyph("pause") + "  MENU";
	if ($("controlshint"))
		$("controlshint").innerHTML =
			`<span class="controlkey">${glyph("move")}</span> MOVE &nbsp; <span class="controlkey">${glyph("charge")}</span> HOLD TO POWER &nbsp; <span class="controlkey">${glyph("dash")}</span> DASH`;
	if ($("inputlabel"))
		$("inputlabel").textContent =
			lastInput === "gamepad"
				? `${glyph("accept")} SELECT · ${glyph("back")} BACK`
				: lastInput === "touch"
					? "TAP TO PLAY"
					: "ARROWS + ENTER, OR CLICK TO PLAY";
}
function focusable() {
	const root = !$("modal").classList.contains("hidden")
		? $("modal")
		: $("titleScreen");
	return [...root.querySelectorAll("button:not(:disabled),input")].filter(
		(el) => el.offsetParent !== null,
	);
}
function focusAt(index) {
	const list = focusable();
	if (!list.length) return;
	focusIndex = (index + list.length) % list.length;
	for (const e of document.querySelectorAll(".focused"))
		e.classList.remove("focused");
	list[focusIndex].classList.add("focused");
	if (lastInput === "gamepad")
		list[focusIndex].scrollIntoView({ block: "nearest" });
}
function focusMove(delta) {
	audio.play("menu", 0.45);
	focusAt(focusIndex + delta);
}
function confirmFocus() {
	const el = focusable()[focusIndex];
	if (el?.tagName === "BUTTON") el.click();
	else if (el) el.focus();
}
function adjustFocus(delta) {
	const el = focusable()[focusIndex];
	if (el?.type === "range") {
		el.value = clamp(
			Number(el.value) + Number(el.step || 1) * delta,
			Number(el.min),
			Number(el.max),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	} else focusMove(delta);
}
function titleMarkup() {
	return `<header class="topbar"><div class="brand"><i></i>THE ROYALE SPORTS CLUB</div><div class="top-right"><span class="pill">1–2 PLAYERS</span><span>VOL. 01 / PADDLE SPORTS</span></div></header><section class="hero"><div class="eyebrow">SMALL COURT. GRAND OCCASION.</div><h1>PADDLE<br><span>ROYALE</span></h1><p class="tagline">A little court.<br>A lot of glory.</p><button class="primary" data-action="cup">Play the Royale Cup <span class="arrow">↗</span></button><div class="split"><button data-action="courts">Pick a court <span class="arrow">→</span></button><button class="secondary" data-action="together">Play together <span class="arrow">↗</span></button></div><div class="links"><button class="quiet" data-action="how">How to play</button><button class="quiet" data-action="settings">Settings</button><button class="quiet" data-action="about">About</button></div></section><div class="stamp">THE CLASS OF<b>1977</b>REMIXED</div><div class="titlecourt"><b>Good rallies. Great company.</b>THREE EVENTS · ONE TINY CROWN</div><footer class="titlefoot">PADDLE SPORT, WITH A TWIST.<br><span class="input-label" id="inputlabel">ARROWS + ENTER, OR CLICK TO PLAY</span></footer>`;
}
function showTitle() {
	if (network.info.mode === "hub") return;
	network.disconnect();
	G.phase = "title";
	G.attract = false;
	G.mode = "solo";
	screen = "title";
	G.winner = null;
	G.scores = [0, 0];
	G.trail = [];
	G.particles = [];
	keys.clear();
	mouse.active = false;
	mouse.charge = false;
	$("titleScreen").innerHTML = titleMarkup();
	$("titleScreen").classList.remove("hidden");
	$("hud").classList.add("hidden");
	$("attractUI").classList.add("hidden");
	$("modal").classList.add("hidden");
	$("centerMsg").classList.add("hidden");
	$("touchpop").classList.add("hidden");
	$("debugbadge").classList.add("hidden");
	lastActivity = performance.now();
	focusAt(0);
	updatePrompts();
}
function modalShell(
	title,
	body,
	{
		wide = false,
		kicker = "THE ROYALE SPORTS CLUB",
		back = "Back",
		backAction = "back",
	} = {},
) {
	return `<div class="scrim"><section class="panel ${wide ? "wide" : ""}"><div class="eyebrow">${kicker}</div><h2>${title}</h2>${body}${back ? `<button class="quiet back" data-action="${backAction}">← ${back}</button>` : ""}</section></div>`;
}
function openModal(name, returnTo) {
	if (returnTo) modalReturn = returnTo;
	screen = name;
	let html = "";
	if (name === "courts") {
		html = modalShell(
			"Choose your court.",
			`<p>One match. First to ${params.targetScore}. Make it a good one.</p><div class="court-cards">${COURTS.map((c, i) => `<button class="courtcard" data-action="quick-${i}"><span class="number">0${i + 1}</span><span><strong>${c.name}</strong><small>${c.desc}</small></span></button>`).join("")}</div>`,
		);
	}
	if (name === "together")
		html = modalShell(
			"Rivalry looks good on you.",
			`<p>Bring a friend. Leave with bragging rights.</p><div class="menu-stack"><button class="primary" data-action="local">Same couch · 2 players <span class="arrow">↗</span></button><button data-action="host">Create an online room</button><button data-action="join">Join with a room code</button></div><p class="hint">Local: two pads, or W/S + Space/Shift against ↑/↓ + Enter/Right Shift. One pad plays Coral; the keyboard plays Mint.</p>`,
		);
	if (name === "join")
		html = modalShell(
			"Got an invitation?",
			`<p>Enter the six-character room code from your rival.</p><input class="roominput" id="roominput" maxlength="6" autocomplete="off" spellcheck="false" placeholder="ABC123" aria-label="Room code"><div class="menu-stack"><button class="primary" data-action="connect">Join the court →</button></div><p class="status" id="roomstatus">Internet rooms use a public connection broker. The host keeps this page open.</p>`,
		);
	if (name === "how")
		html = modalShell(
			"Keep the good times rallying.",
			`<div class="helpgrid"><article><b>01 / Meet the ball</b><p>${lastInput === "gamepad" ? "Left stick" : lastInput === "touch" ? "Drag an invisible stick on either side of the screen" : "W/S, ↑/↓, or move the mouse"} to move. A return near the edge of your paddle flies at a sharper angle.</p></article><article><b>02 / Make a power play</b><p>Hold ${glyph("charge")} to charge. Meet the ball with a full meter for a power shot. ${lastInput === "touch" ? "Power is assisted on touch." : "A/D or the stick’s horizontal axis adds aim."}</p></article><article><b>03 / Close the gap</b><p>${glyph("dash")} to dash in your movement direction. It recharges in 1.6 seconds. ${lastInput === "touch" ? "Tap with a second finger to dash." : ""}</p></article><article><b>04 / Claim the crown</b><p>First to ${params.targetScore} wins the match. Play all three courts in the Royale Cup. Three victories earn gold.</p></article></div><p class="hint">Mouse: position to move and aim, hold left click to power, right click to dash. Touch: drag to move, automatic power, tap with a second finger to dash. ${glyph("pause")} pauses.</p>`,
			{ wide: true },
		);
	if (name === "settings")
		html = modalShell(
			"Set your own tempo.",
			`<div class="row"><label for="music">Music</label><input id="music" type="range" min="0" max="100" step="1" value="${Math.round(settings.music * 100)}" data-setting="music"><output>${Math.round(settings.music * 100)}%</output></div><div class="row"><label for="sfx">Effects & voices</label><input id="sfx" type="range" min="0" max="100" step="1" value="${Math.round(settings.sfx * 100)}" data-setting="sfx"><output>${Math.round(settings.sfx * 100)}%</output></div><div class="row"><label>Controller symbols</label><button data-action="glyphs">${settings.glyphs === "ps" ? "PlayStation · × ○" : "Xbox · A B"}</button></div><div class="row"><label>Reduced motion</label><button data-action="motion">${settings.reduceMotion ? "On" : "Off"}</button></div><div class="row"><label>Sound</label><button data-action="mute">${settings.muted ? "Muted" : "On"}</button></div><p class="hint">Music starts at 10%. Settings save on this device. WebGPU is preferred; WebGL2 is used when unavailable.</p>`,
		);
	if (name === "pause")
		html = modalShell(
			"Take a breather.",
			`<p>${COURTS[G.court].name} · First to ${params.targetScore}. The court will wait.</p><div class="menu-stack"><button class="primary" data-action="resume">Back to the rally →</button><button data-action="settings-pause">Settings</button><button data-action="dev">Dev mode & balance</button><button data-action="restart">Restart match</button><button data-action="quit">Return to clubhouse</button></div>`,
			{ back: false, kicker: "TIME OUT" },
		);
	if (name === "onlinepaused")
		html = modalShell(
			"Time out on the court.",
			`<p>The host paused the match. We’ll be right back.</p><p class="hint">The host controls match flow so both courts stay in sync.</p>`,
			{ back: false },
		);
	if (name === "disconnected")
		html = modalShell(
			"Your rival stepped away.",
			`<p>The connection closed. Head back to the clubhouse and start a fresh room.</p><div class="menu-stack"><button class="primary" data-action="quit">Return to clubhouse →</button></div>`,
			{ back: false },
		);
	if (name === "dev") html = devMarkup();
	if (name === "about") html = aboutMarkup("source");
	$("modal").innerHTML = html;
	$("modal").classList.remove("hidden");
	focusAt(0);
}
function renderRoom() {
	screen = "room";
	$("modal").innerHTML = modalShell(
		"A court for two.",
		`<p>${network.info.isHost ? "Share this code. Your rival can join from another browser or device." : "You’re on the mint team. The host chooses when to begin."}</p><div class="roomcode" id="roomcode"></div><p class="status" id="roomstatus"></p><div class="menu-stack">${network.info.isHost ? `<button class="primary" data-action="online-start" ${network.info.connected ? "" : "disabled"}>Start match →</button><button data-action="room-court">Court: ${COURTS[G.court].name}</button>` : "<button disabled>Waiting for the host…</button>"}<button data-action="copy-code">Copy room code</button></div><p class="hint">Room stays open while the host is here. A public broker connects internet players; some networks may block direct connections.</p>`,
		{ back: "Leave room", backAction: "quit" },
	);
	$("roomcode").textContent = network.info.code;
	$("roomstatus").textContent = netStatus;
	$("modal").classList.remove("hidden");
	focusAt(0);
}
function devMarkup() {
	return modalShell(
		"Tune the good times.",
		`<p class="hint">Changes apply live to this match. These tools are available in solo and local play.</p>${[
			["ballSpeed", "Ball speed", 5, 18, 0.1],
			["paddleSpeed", "Paddle speed", 4, 15, 0.1],
			["paddleSize", "Paddle reach", 0.6, 1.8, 0.05],
			["aiSkill", "Opponent skill", 0.1, 1, 0.05],
			["chargeRate", "Charge rate", 0.3, 2, 0.1],
			["targetScore", "Winning score", 1, 11, 1],
		]
			.map(
				([key, label, min, max, step]) =>
					`<div class="row"><label for="dev-${key}">${label}</label><input id="dev-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}" data-param="${key}"><output>${key === "aiSkill" ? Math.round(params[key] * 100) + "%" : Number(params[key]).toFixed(step === 1 ? 0 : 1)}</output></div>`,
			)
			.join(
				"",
			)}<div class="devgrid"><button data-action="dev-point-0">Point to Coral</button><button data-action="dev-point-1">Point to Mint</button><button data-action="dev-serve">Reset rally</button><button data-action="dev-court">Next court</button><button data-action="dev-auto">AI pilot: ${G.perfect ? "ON" : "OFF"}</button><button data-action="dev-debug">Physics guides: ${G.debug ? "ON" : "OFF"}</button><button data-action="dev-reset">Reset defaults</button><button class="primary" data-action="resume">Return to game →</button></div>`,
		{ back: "Pause menu" },
	);
}
function aboutMarkup(tab) {
	const data = CREDITS;
	let body = "";
	if (tab === "source")
		body = `<dl>${Object.entries(data.sourceInformation)
			.map(
				([key, value]) =>
					`<dt>${{ artDirection: "Art direction", source: "Source", genre: "Genre", perspective: "Perspective", tech: "Tech", online: "Online", usage: "Usage" }[key] || key[0].toUpperCase() + key.slice(1)}</dt><dd>${value}</dd>`,
			)
			.join(
				"",
			)}</dl><p>Created with procedural geometry, code-written music, and a fondness for the friendly paddle-sports variety of Video Olympics (1977). This is an original tribute, unaffiliated with the original publishers.</p><p>Best rally: ${best.rally} · Cups completed: ${best.cups} · Gold crowns: ${best.gold}</p>`;
	else {
		const questions = {
			testing: [
				"How many issues did testing catch?",
				"How many were critical / game breaking?",
				"Most helpful test?",
				"Least helpful test?",
			],
			engine: [
				"What did you like most?",
				"Did you get stuck or guess wrong?",
				"What did you build yourself?",
				"Hardest part of the engine?",
				"Engine changes?",
				"One thing to change?",
			],
			prompt: [
				"What did you like most?",
				"What was confusing?",
				"What was hardest?",
				"What would you change?",
			],
		}[tab];
		const answers = data[tab + "Feedback"];
		body = questions
			.map((q, i) => `<h3>${q}</h3><p>${answers[i]}</p>`)
			.join("");
	}
	return modalShell(
		"Behind the little court.",
		`<div class="about-tabs"><button data-action="about-source">Source Information</button><button data-action="about-testing">Testing Feedback</button><button data-action="about-engine">Engine Feedback</button><button data-action="about-prompt">Prompt Feedback</button></div><div class="abouttext">${body}</div>`,
		{ wide: true, kicker: "ABOUT & CREDITS" },
	);
}
function back() {
	audio.play("menu", 0.5);
	if (screen === "pause") {
		resume();
		return;
	}
	if (screen === "dev") {
		openModal("pause");
		return;
	}
	if (screen === "settings" && modalReturn === "pause") {
		openModal("pause");
		modalReturn = "title";
		return;
	}
	if (screen === "room" || screen === "join") {
		network.disconnect();
		openModal("together");
		return;
	}
	if (screen === "game") {
		pause();
		return;
	}
	if (screen === "onlinepaused") return;
	$("modal").classList.add("hidden");
	screen = "title";
	focusAt(0);
	lastActivity = performance.now();
}
function pause() {
	if (G.attract) return;
	if (G.mode === "online" && !network.info.isHost) {
		showToast("The host controls time outs.");
		return;
	}
	if (!["play", "serve", "point"].includes(G.phase)) return;
	G.resumePhase = G.phase;
	G.phase = "pause";
	keys.clear();
	mouse.charge = false;
	openModal("pause");
	if (G.mode === "online") {
		const buttons = $("modal").querySelectorAll(
			'[data-action="dev"],[data-action="restart"]',
		);
		buttons.forEach((b) => b.remove());
	}
}
function resume() {
	G.phase = G.resumePhase || "play";
	if (G.phase === "pause") G.phase = "serve";
	screen = "game";
	$("modal").classList.add("hidden");
	keys.clear();
	accumulator = 0;
	updatePrompts();
}
function hudMarkup() {
	const online = G.mode === "online";
	return `<div class="hud-title"><small>${G.mode === "cup" ? "THE ROYALE CUP" : G.mode === "local" ? "SAME COUCH · VERSUS" : online ? "ONLINE · VERSUS" : "CLUB FRIENDLY"}</small><b>${COURTS[G.court].name}</b><small id="winTarget">FIRST TO ${params.targetScore}</small><div class="eventdots">${G.mode === "cup" ? [0, 1, 2].map((i) => `<span class="eventdot ${i === G.court ? "current" : G.wins[i] ? "win" : ""}"></span>`).join("") : ""}</div></div><div class="scorebar"><div class="team"><div><small>CORAL CLUB</small><b>${G.mode === "solo" || G.mode === "cup" ? "YOU" : online && network.info.localSeat === 0 ? "YOU" : "PLAYER 1"}</b></div><span class="pts coral" id="score0">0</span></div><div class="divider"></div><div class="team"><div><small>MINT CLUB</small><b>${G.mode === "solo" || G.mode === "cup" ? "CHALLENGER" : online && network.info.localSeat === 1 ? "YOU" : "PLAYER 2"}</b></div><span class="pts mint" id="score1">0</span></div></div><button class="menu-btn" data-action="pause">${glyph("pause")} &nbsp; MENU</button><div class="hud-foot"><div class="controls" id="controlshint"></div><div class="meters"><div class="meter"><small>POWER <span id="powertext">0%</span></small><div class="track"><div class="fill" id="powerfill"></div></div></div><div class="meter"><small>DASH <span id="dashtext">READY</span></small><div class="track"><div class="fill mintfill" id="dashfill" style="width:100%"></div></div></div></div></div>`;
}
function startGame({ mode = "solo", court = 0 } = {}) {
	hubEnded = false;
	G.mode = mode;
	G.court = clamp(court, 0, 2);
	G.attract = false;
	G.scores = [0, 0];
	G.wins = [];
	G.stats = { bestRally: 0, power: 0, banks: 0, dashes: 0, points: 0 };
	G.winner = null;
	G.rally = 0;
	G.time = 0;
	G.trail = [];
	G.particles = [];
	G.perfect = false;
	G.debug = false;
	G.paddles.forEach((p) =>
		Object.assign(p, { z: 0, v: 0, charge: 0, dash: 0, cooldown: 0, aim: 0 }),
	);
	createWorld();
	newServe(Math.random() < 0.5 ? 0 : 1);
	screen = "game";
	$("modal").classList.add("hidden");
	$("titleScreen").classList.add("hidden");
	$("attractUI").classList.add("hidden");
	$("hud").innerHTML = hudMarkup();
	$("hud").classList.remove("hidden");
	keys.clear();
	mouse.charge = false;
	mouse.active = false;
	accumulator = 0;
	center(COURTS[G.court].name, 1800);
	showToast(COURTS[G.court].tip, 4300);
	updatePrompts();
	audio.play("start");
	audio.speak("welcome");
}
function createWorld() {
	if (world) world.free();
	world = new RAPIER.World({ x: 0, y: 0, z: 0 });
	world.timestep = 1 / 120;
	paddleBodies = [];
	paddleColliders = [];
	bankBodies = [];
	endBodies = [];
	const fixedBox = (x, z, hx, hz) => {
		const rb = world.createRigidBody(
			RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.5, z),
		);
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(hx, 0.8, hz).setRestitution(1).setFriction(0),
			rb,
		);
		return rb;
	};
	fixedBox(0, -6.25, 12, 0.25);
	fixedBox(0, 6.25, 12, 0.25);
	for (let i = 0; i < 2; i++) {
		const rb = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				i === 0 ? -9 : 9,
				0.5,
				G.paddles[i].z,
			),
		);
		paddleBodies.push(rb);
		paddleColliders.push(
			world.createCollider(
				RAPIER.ColliderDesc.cuboid(0.22, 0.6, params.paddleSize).setSensor(
					true,
				),
				rb,
			),
		);
	}
	if (G.court === 1)
		for (const [x, z] of [
			[-3, -2.5],
			[3, 2.5],
		]) {
			const rb = world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.5, z),
			);
			world.createCollider(
				RAPIER.ColliderDesc.cylinder(0.6, 0.58)
					.setRestitution(1)
					.setFriction(0),
				rb,
			);
			bankBodies.push(rb);
		}
	if (G.court === 2)
		for (const x of [-10.3, 10.3])
			for (const z of [-4.2, 4.2]) endBodies.push(fixedBox(x, z, 0.25, 1.8));
	ballBody = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(0, 0.5, 0)
			.enabledTranslations(true, false, true)
			.enabledRotations(false, false, false)
			.setCcdEnabled(true)
			.setLinearDamping(0),
	);
	ballCollider = world.createCollider(
		RAPIER.ColliderDesc.ball(0.28)
			.setRestitution(1)
			.setFriction(0)
			.setDensity(0.1),
		ballBody,
	);
	syncBall();
}
function syncBall() {
	const p = ballBody.translation(),
		v = ballBody.linvel();
	G.ball = { x: p.x, z: p.z, vx: v.x, vz: v.z };
}
function newServe(direction = 0) {
	G.phase = "serve";
	G.serve = direction;
	G.serveTimer = 1.5;
	G.rally = 0;
	G.trail = [];
	G.ball = { x: 0, z: 0, vx: 0, vz: 0 };
	ballBody.setTranslation({ x: 0, y: 0.5, z: 0 }, true);
	ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	G.paddles.forEach((p) => {
		p.charge = 0;
	});
	bankCooldown = 0;
}
function launch() {
	if (G.phase !== "serve") return;
	const angle = (Math.random() - 0.5) * 0.8;
	const sign = G.serve === 0 ? -1 : 1;
	ballBody.setLinvel(
		{
			x: sign * params.ballSpeed * Math.cos(angle),
			y: 0,
			z: params.ballSpeed * Math.sin(angle),
		},
		true,
	);
	G.phase = "play";
	audio.play("serve");
	center("LET’S RALLY", 650);
}
function burst(x, z, color, count = 15) {
	for (let i = 0; i < count; i++) {
		const a = Math.random() * Math.PI * 2,
			s = 1.8 + Math.random() * 4;
		G.particles.push({
			x,
			z,
			y: 0.4,
			vx: Math.cos(a) * s,
			vz: Math.sin(a) * s,
			vy: 1 + Math.random() * 3,
			life: 0.45 + Math.random() * 0.5,
			color,
		});
	}
	if (G.particles.length > 100) G.particles.splice(0, G.particles.length - 100);
}
function scorePoint(seat) {
	if (!["play", "serve", "pause"].includes(G.phase)) return;
	G.scores[seat]++;
	G.stats.points++;
	G.stats.bestRally = Math.max(G.stats.bestRally, G.rally);
	best.rally = Math.max(best.rally, G.rally);
	save();
	burst(
		seat === 0 ? 10 : -10,
		G.ball.z,
		seat === 0 ? "#ed7055" : "#6bb6a4",
		35,
	);
	audio.play("goal");
	audio.speak(seat === 0 ? "point" : "surprise");
	vibrate(0.7);
	G.flash = 1;
	showToast(
		(seat === 0 ? "CORAL" : "MINT") +
			" SCORES!" +
			(G.rally >= 8 ? ` ${G.rally}-HIT RALLY!` : ""),
		2200,
	);
	if (G.scores[seat] >= params.targetScore) {
		finishMatch(seat);
		return;
	}
	G.nextServe = seat === 0 ? 1 : 0;
	G.phase = "point";
	G.pointPause = 1.5;
	ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
}
function finishMatch(winner) {
	G.winner = winner;
	G.phase = "result";
	if (G.mode === "cup") G.wins[G.court] = winner === 0;
	audio.play(winner === 0 ? "win" : "lose");
	audio.speak("victory");
	if (G.mode === "cup" && G.court === 2) {
		best.cups++;
		if (G.wins.filter(Boolean).length === 3) best.gold++;
		save();
	}
	if (G.mode === "online") network.finish(G.scores);
	if (!G.attract) showResult();
}
function showResult(reason) {
	screen = "result";
	$("centerMsg").classList.add("hidden");
	const finalCup = G.mode === "cup" && G.court === 2,
		wins = G.wins.filter(Boolean).length;
	let title =
		G.winner === null
			? "Honors shared."
			: G.winner === 0
				? "Coral takes the court."
				: "Mint takes the court.";
	if (finalCup)
		title = [
			"A splendid first outing.",
			"A bronze beginning.",
			"Silver looks good on you.",
			"The crown is yours.",
		][wins];
	const subtitle = reason
		? `Round complete · ${reason}`
		: finalCup
			? `${wins} of 3 events won. ${wins === 3 ? "A perfect little occasion." : wins === 2 ? "One more rally from glory." : "Every good club starts somewhere."}`
			: COURTS[G.court].short;
	const next =
		G.mode === "cup" && G.court < 2
			? `<button class="primary" data-action="next">Next: ${COURTS[G.court + 1].name} →</button>`
			: network.info.mode === "hub"
				? "<button disabled>Waiting for AI Hub…</button>"
				: G.mode === "online"
					? network.info.isHost
						? '<button class="primary" data-action="rematch">Rematch →</button>'
						: "<button disabled>Waiting for a rematch…</button>"
					: '<button class="primary" data-action="replay">Play it again →</button>';
	$("modal").innerHTML = modalShell(
		title,
		`<div class="medal">${finalCup ? (wins === 3 ? "♛" : wins === 2 ? "✦" : "★") : "✦"}</div><p>${subtitle}</p><div class="scorebar-inline" style="font-size:30px;font-weight:900"><span class="coral">${G.scores[0]}</span> <span style="font-size:18px;padding:0 16px">—</span> <span class="mint">${G.scores[1]}</span></div><div class="stats"><div><b>${G.stats.bestRally}</b><small>BEST RALLY</small></div><div><b>${G.stats.power}</b><small>POWER SHOTS</small></div><div><b>${G.stats.banks}</b><small>BANK SHOTS</small></div></div><div class="menu-stack">${next}${network.info.mode === "hub" ? "" : '<button data-action="quit">Back to the clubhouse</button>'}</div>`,
		{
			back: false,
			kicker: finalCup ? "ROYALE CUP · FINAL RESULTS" : "FULL TIME · GOOD GAME",
		},
	);
	$("modal").classList.remove("hidden");
	focusAt(0);
}
function nextEvent() {
	if (G.court >= 2) return;
	G.court++;
	G.scores = [0, 0];
	G.winner = null;
	G.paddles.forEach((p) =>
		Object.assign(p, { z: 0, charge: 0, cooldown: 0, dash: 0 }),
	);
	createWorld();
	newServe(0);
	screen = "game";
	$("modal").classList.add("hidden");
	$("hud").innerHTML = hudMarkup();
	center(COURTS[G.court].name, 1900);
	showToast(COURTS[G.court].tip, 4200);
	updatePrompts();
	audio.play("start");
}
function reflectZ(z) {
	const range = 11.2;
	let q = (((z + 5.6) % (range * 2)) + range * 2) % (range * 2);
	return (q > range ? range * 2 - q : q) - 5.6;
}
function aiInput(seat) {
	const p = G.paddles[seat],
		sign = seat === 0 ? -1 : 1,
		b = G.ball,
		toward = b.vx * sign > 0;
	const intercept =
		toward && Math.abs(b.vx) > 1
			? reflectZ(b.z + b.vz * ((sign * 8.5 - b.x) / b.vx))
			: Math.sin(G.time * 0.7 + seat) * 0.9;
	const skill =
		G.attract || G.perfect
			? 1
			: clamp(params.aiSkill + G.court * 0.065, 0.1, 1);
	const wobble =
		(Math.sin(G.time * 1.71 + seat * 5) + Math.sin(G.time * 0.8)) *
		((1 - skill) * 1.5);
	const target =
		G.court === 2 ? clamp(intercept + wobble, -3.1, 3.1) : intercept + wobble;
	const gap = target - p.z;
	const opponent = G.paddles[1 - seat];
	return {
		move:
			clamp(gap * (skill * 3 + 1), -1, 1) *
			(G.attract || G.perfect ? 1 : 0.48 + skill * 0.43),
		aim:
			G.court === 2
				? clamp(-p.z / 4, -1, 1)
				: clamp(-opponent.z / 4 + Math.sin(G.time) * 0.3, -1, 1),
		charge: toward || G.attract,
		dash: Math.abs(gap) > 2.5 && Math.abs(b.x) > 4 && toward,
	};
}
function padInput(pad) {
	return {
		move:
			Math.abs(pad?.axes?.[1] || 0) > 0.13
				? clamp(pad.axes[1], -1, 1)
				: (pad?.buttons?.[13]?.pressed ? 1 : 0) -
					(pad?.buttons?.[12]?.pressed ? 1 : 0),
		aim: Math.abs(pad?.axes?.[0] || 0) > 0.13 ? pad.axes[0] : 0,
		charge: !!(pad?.buttons?.[0]?.pressed || pad?.buttons?.[7]?.pressed),
		dash: !!(pad?.buttons?.[5]?.pressed || pad?.buttons?.[4]?.pressed),
	};
}
function localInput(seat) {
	const pads = [...(navigator.getGamepads?.() || [])].filter(
		(p) => p?.connected,
	);
	const local = G.mode === "local";
	let pad = local ? pads[seat] : pads[0];
	if (local && pads.length === 1) {
		if (seat === 0) return padInput(pads[0]);
		pad = null;
	}
	if (pad && lastInput === "gamepad") return padInput(pad);
	let up, down, charge, dash, aim;
	if (local && seat === 1) {
		up = keys.has("ArrowUp");
		down = keys.has("ArrowDown");
		charge = keys.has("Enter");
		dash = keys.has("ShiftRight");
		aim = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
	} else {
		up = keys.has("KeyW") || (!local && keys.has("ArrowUp"));
		down = keys.has("KeyS") || (!local && keys.has("ArrowDown"));
		charge = keys.has("Space");
		dash = keys.has("ShiftLeft") || (!local && keys.has("ShiftRight"));
		aim =
			(keys.has("KeyD") || (!local && keys.has("ArrowRight")) ? 1 : 0) -
			(keys.has("KeyA") || (!local && keys.has("ArrowLeft")) ? 1 : 0);
	}
	if (lastInput === "touch" && (!local || seat === 0))
		return {
			move: touchAxis,
			aim: touchAim,
			charge: true,
			dash: touchDash,
			assist: true,
		};
	if (mouse.active && (!local || seat === 0) && lastInput === "mouse")
		return {
			move: clamp((mouse.z - G.paddles[seat].z) * 5, -1, 1),
			aim: mouse.aim,
			charge: mouse.charge,
			dash: mouse.dash,
		};
	return { move: (down ? 1 : 0) - (up ? 1 : 0), aim, charge, dash };
}
function getInputs() {
	if (hubEnded) return [{ move: 0 }, { move: 0 }];
	if (G.attract) return [aiInput(0), aiInput(1)];
	if (G.mode === "online") {
		const info = network.info;
		if (info.isHost) {
			const a = [{ ...remoteInputs[0] }, { ...remoteInputs[1] }];
			if (info.localSeat !== null)
				a[info.localSeat] = localInput(info.localSeat);
			return a;
		}
		return [{}, {}];
	}
	return [
		G.perfect ? aiInput(0) : localInput(0),
		G.mode === "local" ? localInput(1) : aiInput(1),
	];
}
function step(dt) {
	G.time += dt;
	bankCooldown = Math.max(0, bankCooldown - dt);
	G.flash = Math.max(0, G.flash - dt * 3);
	for (const p of G.particles) {
		p.life -= dt;
		p.x += p.vx * dt;
		p.z += p.vz * dt;
		p.y = Math.max(0.1, p.y + p.vy * dt);
		p.vy -= 10 * dt;
	}
	G.particles = G.particles.filter((p) => p.life > 0);
	if (G.phase === "point") {
		G.pointPause -= dt;
		if (G.pointPause <= 0) newServe(G.nextServe);
		return;
	}
	if (!["play", "serve"].includes(G.phase)) return;
	if (hubHoldUntil > performance.now()) return;
	const inputs = getInputs();
	for (let i = 0; i < 2; i++) {
		const p = G.paddles[i],
			input = inputs[i];
		p.cooldown = Math.max(0, p.cooldown - dt);
		p.dash = Math.max(0, p.dash - dt);
		p.aim = clamp(Number(input.aim) || 0, -1, 1);
		if (input.dash && p.cooldown === 0) {
			p.dash = 0.17;
			p.cooldown = 1.6;
			G.stats.dashes++;
			audio.play("boost", 0.6);
			burst(i === 0 ? -9 : 9, p.z, i === 0 ? "#ed7055" : "#6bb6a4", 7);
		}
		const move = clamp(Number(input.move) || 0, -1, 1);
		p.v = move * params.paddleSpeed * (p.dash > 0 ? 2.65 : 1);
		p.z = clamp(
			p.z + p.v * dt,
			-5.72 + params.paddleSize,
			5.72 - params.paddleSize,
		);
		paddleBodies[i].setNextKinematicTranslation({
			x: i === 0 ? -9 : 9,
			y: 0.5,
			z: p.z,
		});
		const prev = p.charge;
		p.charge = clamp(
			p.charge + (input.charge ? params.chargeRate : -1.8) * dt,
			0,
			1,
		);
		if (
			p.charge === 1 &&
			prev < 1 &&
			i === (network.info.localSeat ?? 0) &&
			performance.now() - lastChargeSound > 1200
		) {
			audio.play("charge");
			lastChargeSound = performance.now();
		}
	}
	if (G.phase === "serve") {
		G.serveTimer -= dt;
		if (
			G.serveTimer <= 0 ||
			(G.serveTimer < 1.1 && inputs.some((i) => i.charge))
		)
			launch();
		world.step();
		syncBall();
		return;
	}
	const old = { ...G.ball };
	world.step();
	syncBall();
	for (let i = 0; i < 2; i++) {
		const plane = i === 0 ? -8.5 : 8.5,
			sign = i === 0 ? 1 : -1,
			p = G.paddles[i];
		const crossing =
			i === 0
				? old.x > plane && G.ball.x <= plane && old.vx < 0
				: old.x < plane && G.ball.x >= plane && old.vx > 0;
		if (crossing) {
			const atZ =
				old.z + ((G.ball.z - old.z) * (plane - old.x)) / (G.ball.x - old.x);
			if (Math.abs(atZ - p.z) <= params.paddleSize + 0.26) {
				const off = clamp((atZ - p.z) / (params.paddleSize + 0.2), -1, 1);
				let angle = clamp(off * 0.8 + p.aim * 0.33 + p.v * 0.012, -1.02, 1.02);
				if (G.court === 2 && inputs[i].assist)
					angle = clamp(-p.z / 9, -0.6, 0.6);
				const power = p.charge > 0.5;
				const speed =
					Math.min(params.ballSpeed * 2.1, params.ballSpeed + G.rally * 0.22) *
					(power ? 1.32 : 1);
				ballBody.setTranslation(
					{ x: plane + sign * 0.03, y: 0.5, z: atZ },
					true,
				);
				ballBody.setLinvel(
					{
						x: sign * Math.cos(angle) * speed,
						y: 0,
						z: Math.sin(angle) * speed,
					},
					true,
				);
				G.rally++;
				G.stats.bestRally = Math.max(G.stats.bestRally, G.rally);
				if (power) {
					G.stats.power++;
					audio.play("power");
					showToast("POWER RETURN!", 1100);
					burst(plane, atZ, "#ecc35c", 19);
					vibrate(0.5);
				} else {
					audio.play("hit", Math.min(1, 0.6 + G.rally * 0.035));
					burst(plane, atZ, i === 0 ? "#ed7055" : "#6bb6a4", 7);
					vibrate(0.15);
				}
				p.charge = 0;
				syncBall();
			}
		}
	}
	if (
		Math.abs(G.ball.z) > 5.55 &&
		Math.sign(old.vz) !== Math.sign(G.ball.vz) &&
		G.time - lastWallAt > 0.06
	) {
		audio.play("wall", 0.5);
		burst(G.ball.x, G.ball.z, "#f2dab0", 5);
		lastWallAt = G.time;
	}
	if (
		(G.court === 1 &&
			bankCooldown <= 0 &&
			Math.sign(old.vx) !== Math.sign(G.ball.vx)) ||
		(G.court === 1 &&
			bankCooldown <= 0 &&
			Math.sign(old.vz) !== Math.sign(G.ball.vz))
	) {
		for (const [x, z] of [
			[-3, -2.5],
			[3, 2.5],
		])
			if (Math.hypot(G.ball.x - x, G.ball.z - z) < 1.05) {
				G.stats.banks++;
				audio.play("bank");
				burst(x, z, "#ecc35c", 14);
				showToast("NICE BANK!", 1000);
				bankCooldown = 0.15;
				break;
			}
	}
	// Keep elastic contacts from ever producing a near-vertical stalemate.
	if (Math.abs(G.ball.vx) < 2.6) {
		const v = ballBody.linvel(),
			sign = Math.sign(v.x) || Math.sign(old.vx) || 1;
		ballBody.setLinvel({ x: sign * 2.6, y: 0, z: v.z }, true);
		syncBall();
	}
	if (Math.abs(G.ball.x) > 10.85) {
		scorePoint(G.ball.x > 0 ? 0 : 1);
	}
	G.trail.push({ x: G.ball.x, z: G.ball.z });
	if (G.trail.length > 23) G.trail.shift();
}
function attract() {
	G.attract = true;
	G.mode = "solo";
	G.phase = "serve";
	G.court = 0;
	G.time = 0;
	G.scores = [0, 0];
	G.stats = { bestRally: 0, power: 0, banks: 0, dashes: 0, points: 0 };
	G.paddles.forEach((p) =>
		Object.assign(p, { z: 0, charge: 0, cooldown: 0, dash: 0 }),
	);
	createWorld();
	newServe(1);
	attractElapsed = 0;
	attractCourtAt = 0;
	screen = "attract";
	$("titleScreen").classList.add("hidden");
	$("modal").classList.add("hidden");
	$("hud").classList.add("hidden");
	$("attractUI").classList.remove("hidden");
	$("attractUI").innerHTML =
		'<div class="attract-label">● ON AIR · CLUB EXHIBITION</div><div class="attract-foot"><b id="attractcourt">Classic Rally</b><small>AI exhibition · Any button brings you back.</small></div>';
	$("toast").classList.add("hidden");
	$("centerMsg").classList.add("hidden");
}
function exitAttract() {
	G.attract = false;
	showTitle();
	audio.play("menu");
}
function renderHud() {
	if (debugCanvas)
		debugCanvas.classList.toggle("hidden", !G.debug || G.phase === "title");
	if ($("score0")) {
		$("score0").textContent = G.scores[0];
		$("score1").textContent = G.scores[1];
		const seat = G.mode === "online" ? (network.info.localSeat ?? 0) : 0,
			p = G.paddles[seat];
		$("powertext").textContent =
			p.charge >= 0.99 ? "READY" : Math.floor(p.charge * 100) + "%";
		$("powerfill").style.width = p.charge * 100 + "%";
		$("dashfill").style.width = (1 - p.cooldown / 1.6) * 100 + "%";
		$("dashtext").textContent =
			p.cooldown <= 0 ? "READY" : p.cooldown.toFixed(1) + "s";
	}
	const touchPop =
		lastInput === "touch" &&
		["play", "serve"].includes(G.phase) &&
		Math.abs(G.ball.x) > 4 &&
		G.ball.vx < 0;
	$("touchpop").classList.toggle("hidden", !touchPop);
	$("debugbadge").classList.toggle(
		"hidden",
		!(G.perfect || G.debug) || G.attract || G.phase === "title",
	);
}
function onAction(action) {
	audio.play("menu", 0.6);
	switch (action) {
		case "cup":
			startGame({ mode: "cup" });
			break;
		case "courts":
		case "together":
		case "how":
		case "about":
			openModal(action, "title");
			break;
		case "settings":
			openModal("settings", "title");
			break;
		case "settings-pause":
			openModal("settings", "pause");
			break;
		case "local":
			startGame({ mode: "local", court: 0 });
			break;
		case "host":
			G.court = 0;
			network.host();
			renderRoom();
			break;
		case "join":
			openModal("join");
			break;
		case "connect":
			if (network.join($("roominput").value)) renderRoom();
			break;
		case "online-start":
		case "rematch":
			network.start({ court: G.court });
			break;
		case "room-court":
			G.court = (G.court + 1) % 3;
			renderRoom();
			break;
		case "copy-code":
			navigator.clipboard
				?.writeText(network.info.code)
				.then(() => showToast("Room code copied."))
				.catch(() => showToast("Room code: " + network.info.code));
			break;
		case "pause":
			pause();
			break;
		case "resume":
			resume();
			break;
		case "back":
			back();
			break;
		case "quit":
			showTitle();
			break;
		case "dev":
			if (G.mode !== "online") openModal("dev");
			break;
		case "restart":
			startGame({ mode: G.mode, court: G.court });
			break;
		case "next":
			nextEvent();
			break;
		case "replay":
			startGame({ mode: G.mode, court: G.mode === "cup" ? 0 : G.court });
			break;
		case "glyphs":
			settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
			save();
			openModal("settings");
			break;
		case "motion":
			settings.reduceMotion = !settings.reduceMotion;
			save();
			openModal("settings");
			break;
		case "mute":
			settings.muted = !settings.muted;
			audio.setMuted(settings.muted);
			save();
			openModal("settings");
			break;
		case "dev-point-0":
		case "dev-point-1":
			G.phase = "play";
			scorePoint(Number(action.slice(-1)));
			if (G.phase !== "result") {
				G.resumePhase = G.phase;
				G.phase = "pause";
				openModal("dev");
			}
			break;
		case "dev-serve":
			newServe(0);
			G.resumePhase = "serve";
			G.phase = "pause";
			openModal("dev");
			break;
		case "dev-court":
			G.court = (G.court + 1) % 3;
			G.scores = [0, 0];
			createWorld();
			newServe(0);
			G.resumePhase = "serve";
			G.phase = "pause";
			$("hud").innerHTML = hudMarkup();
			openModal("dev");
			break;
		case "dev-auto":
			G.perfect = !G.perfect;
			openModal("dev");
			break;
		case "dev-debug":
			G.debug = !G.debug;
			openModal("dev");
			break;
		case "dev-reset":
			Object.assign(params, DEFAULTS);
			updatePaddleSize();
			openModal("dev");
			break;
		default:
			if (action.startsWith("quick-"))
				startGame({ mode: "solo", court: Number(action.slice(-1)) });
			if (action.startsWith("about-")) {
				$("modal").innerHTML = aboutMarkup(action.slice(6));
				focusAt(0);
			}
	}
}
function updatePaddleSize() {
	for (const collider of paddleColliders)
		collider.setShape(new RAPIER.Cuboid(0.22, 0.6, params.paddleSize));
}
function pollGamepad() {
	const pads = [...(navigator.getGamepads?.() || [])].filter(
			(p) => p?.connected,
		),
		pad =
			pads.find(
				(p) =>
					p.axes.some((a) => Math.abs(a) > 0.2) ||
					p.buttons.some((b) => b.pressed),
			) || pads[0];
	if (!pad) {
		padPrev = [];
		return;
	}
	padPrev = padPrevByIndex.get(pad.index ?? 0) || [];
	const buttons = pad.buttons.map((b) => b.pressed);
	const edge = (i) => buttons[i] && !padPrev[i];
	const axis = pad.axes[1] || 0,
		hor = pad.axes[0] || 0;
	const active =
		Math.abs(axis) > 0.2 || Math.abs(hor) > 0.2 || buttons.some(Boolean);
	if (active) {
		if (setInput("gamepad")) {
			padPrev = buttons;
			padPrevByIndex.set(pad.index ?? 0, buttons);
			return;
		}
	}
	const inMenu = !["game", "attract"].includes(screen);
	if (edge(9)) {
		if (screen === "game") pause();
		else if (screen === "pause") resume();
	}
	if (inMenu) {
		const now = performance.now();
		let nav = 0;
		if (edge(13) || (axis > 0.5 && now > padNavAt)) nav = 1;
		else if (edge(12) || (axis < -0.5 && now > padNavAt)) nav = -1;
		if (nav) {
			focusMove(nav);
			padNavAt = now + 230;
		}
		if (edge(15) || (hor > 0.5 && now > padNavAt)) {
			adjustFocus(1);
			padNavAt = now + 200;
		}
		if (edge(14) || (hor < -0.5 && now > padNavAt)) {
			adjustFocus(-1);
			padNavAt = now + 200;
		}
		if (edge(0)) confirmFocus();
		if (edge(1)) back();
	}
	padPrev = buttons;
	for (const p of pads)
		padPrevByIndex.set(
			p.index ?? 0,
			p.buttons.map((b) => b.pressed),
		);
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (!b || b.disabled) return;
	if (suppressClick) {
		suppressClick = false;
		return;
	}
	onAction(b.dataset.action);
});
document.addEventListener("pointerover", (e) => {
	const b = e.target.closest("button,input");
	if (!b) return;
	const list = focusable();
	const i = list.indexOf(b);
	if (i >= 0) focusAt(i);
});
document.addEventListener("input", (e) => {
	const t = e.target;
	if (t.dataset.setting) {
		settings[t.dataset.setting] = Number(t.value) / 100;
		audio.setMusic(settings.music);
		audio.setSfx(settings.sfx);
		t.nextElementSibling.textContent = t.value + "%";
		save();
	}
	if (t.dataset.param) {
		params[t.dataset.param] = Number(t.value);
		t.nextElementSibling.textContent =
			t.dataset.param === "aiSkill"
				? Math.round(Number(t.value) * 100) + "%"
				: Number(t.value).toFixed(Number(t.step) === 1 ? 0 : 1);
		if (t.dataset.param === "paddleSize") updatePaddleSize();
		if (t.dataset.param === "targetScore" && $("winTarget"))
			$("winTarget").textContent = "FIRST TO " + params.targetScore;
	}
});
document.addEventListener("keydown", (e) => {
	if (e.target.tagName === "INPUT" && e.target.type !== "range") {
		if (e.code === "Escape") back();
		if (e.code === "Enter" && screen === "join") onAction("connect");
		return;
	}
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
	if (setInput("keyboard")) return;
	keys.add(e.code);
	mouse.active = false;
	if (e.repeat) return;
	if (e.code === "Escape" || e.code === "KeyP") {
		if (screen === "game") pause();
		else back();
		return;
	}
	if (screen === "game") return;
	if (e.code === "ArrowDown" || e.code === "Tab") focusMove(1);
	if (e.code === "ArrowUp") focusMove(-1);
	if (e.code === "ArrowRight") adjustFocus(1);
	if (e.code === "ArrowLeft") adjustFocus(-1);
	if (e.code === "Enter" || e.code === "Space") confirmFocus();
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
const ray = new THREE.Raycaster(),
	plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5),
	hit = new THREE.Vector3();
function mousePosition(e) {
	if (!arena) return;
	ray.setFromCamera(
		new THREE.Vector2(
			(e.clientX / innerWidth) * 2 - 1,
			1 - (e.clientY / innerHeight) * 2,
		),
		arena.camera,
	);
	if (ray.ray.intersectPlane(plane, hit)) {
		mouse.z = clamp(hit.z, -5.5, 5.5);
		mouse.aim = clamp(hit.x / 10, -1, 1);
	}
}
document.addEventListener("pointerdown", (e) => {
	const touch = e.pointerType === "touch";
	if (setInput(touch ? "touch" : "mouse")) {
		suppressClick = !!e.target.closest("button");
		return;
	}
	if (e.target !== $("scene")) return;
	if (touch) {
		touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
		touchActive = true;
		if (touches.size > 1) touchDash = true;
		else {
			touchAxis = 0;
			touchAim = 0;
		}
	} else if (screen === "game") {
		mousePosition(e);
		mouse.active = true;
		if (e.button === 0) mouse.charge = true;
		if (e.button === 2) mouse.dash = true;
	}
});
document.addEventListener("pointermove", (e) => {
	if (G.attract) {
		setInput(e.pointerType === "touch" ? "touch" : "mouse");
		return;
	}
	if (G.phase === "title") lastActivity = performance.now();
	if (e.pointerType === "touch") {
		const t = touches.get(e.pointerId);
		if (t) {
			touchAxis = clamp((e.clientY - t.y) / 65, -1, 1);
			touchAim = clamp((e.clientX - t.x) / 90, -1, 1);
			lastActivity = performance.now();
		}
	} else if (screen === "game" && e.target === $("scene")) {
		setInput("mouse");
		mousePosition(e);
		mouse.active = true;
	}
});
document.addEventListener("pointerup", (e) => {
	if (e.pointerType === "touch") {
		touches.delete(e.pointerId);
		if (!touches.size) {
			touchAxis = 0;
			touchAim = 0;
			touchActive = false;
		}
		touchDash = false;
	} else {
		if (e.button === 0) mouse.charge = false;
		if (e.button === 2) mouse.dash = false;
	}
});
document.addEventListener("pointercancel", () => {
	touches.clear();
	touchAxis = 0;
	touchDash = false;
	mouse.charge = false;
	mouse.dash = false;
});
document.addEventListener("contextmenu", (e) => {
	if (e.target === $("scene")) e.preventDefault();
});
window.addEventListener("blur", () => {
	keys.clear();
	mouse.charge = false;
	mouse.dash = false;
	touchAxis = 0;
	if (
		["play", "serve", "point"].includes(G.phase) &&
		!G.attract &&
		G.mode !== "online"
	)
		pause();
});
window.addEventListener("resize", () => arena?.resize());
function tick(now) {
	requestAnimationFrame(tick);
	const dt = Math.min(0.05, (now - frameTime) / 1000 || 1 / 60);
	frameTime = now;
	pollGamepad();
	if (
		G.phase === "title" &&
		!G.attract &&
		now - lastActivity > 10000 &&
		!network.info.active
	)
		attract();
	const playing = ["play", "serve", "point"].includes(G.phase);
	if (playing && (G.mode !== "online" || network.info.isHost)) {
		accumulator += dt;
		while (accumulator >= 1 / 120) {
			step(1 / 120);
			accumulator -= 1 / 120;
		}
	} else accumulator = 0;
	if (G.mode === "online" && network.info.active && !hubEnded) {
		netTimer += dt;
		if (netTimer > 0.066) {
			netTimer = 0;
			if (network.info.isHost) network.sendSnapshot(snapshot());
			else network.sendInput(localInput(network.info.localSeat ?? 1));
		}
	}
	if (G.attract) {
		attractElapsed += dt;
		if (attractElapsed - attractCourtAt > 18 || G.phase === "result") {
			attractCourtAt = attractElapsed;
			G.court = (G.court + 1) % 3;
			G.scores = [0, 0];
			G.paddles.forEach((p) => (p.z = 0));
			createWorld();
			newServe(G.court % 2);
			$("attractcourt").textContent = COURTS[G.court].name;
		}
	}
	if (G.phase === "title") {
		G.time += dt;
		G.ball = {
			x: Math.sin(G.time * 1.3) * 7.7,
			z: Math.sin(G.time * 1.9) * 3.8,
		};
		G.paddles[0].z = Math.sin(G.time * 1.9 - 0.6) * 3.4;
		G.paddles[1].z = Math.sin(G.time * 1.9 + 0.6) * 3.4;
		G.trail.push({ x: G.ball.x, z: G.ball.z });
		if (G.trail.length > 20) G.trail.shift();
	}
	if (now > toastUntil) $("toast").classList.add("hidden");
	if (now > centerUntil) $("centerMsg").classList.add("hidden");
	if (G.phase === "serve" && !G.attract) {
		if (hubHoldUntil > now) {
			$("centerMsg").textContent =
				"STARTING IN " + Math.max(1, Math.ceil((hubHoldUntil - now) / 1000));
		} else
			$("centerMsg").textContent =
				G.serveTimer > 0.65 ? "READY?" : "LET’S RALLY";
		$("centerMsg").classList.remove("hidden");
		centerUntil = now + 100;
	}
	uiTimer += dt;
	if (uiTimer > 0.05) {
		renderHud();
		uiTimer = 0;
	}
	if (!hubEnded)
		audio.tick(dt, { intensity: playing ? clamp(G.rally / 15, 0.25, 1) : 0.2 });
	const visualState = {
		...G,
		mode: COURTS[G.court].id,
		phase:
			G.phase === "title" ? "title" : G.phase === "pause" ? "pause" : "play",
		paddleSize: params.paddleSize,
		reduceMotion: settings.reduceMotion,
	};
	arena.update(settings.reduceMotion ? dt * 0.25 : dt, visualState);
	if (G.debug) drawDebug();
}
let debugCanvas, debugCtx;
function drawDebug() {
	if (!debugCanvas) {
		debugCanvas = document.createElement("canvas");
		debugCanvas.style.cssText =
			"position:fixed;inset:0;pointer-events:none;z-index:5";
		document.body.appendChild(debugCanvas);
		debugCtx = debugCanvas.getContext("2d");
	}
	debugCanvas.width = innerWidth;
	debugCanvas.height = innerHeight;
	debugCtx.strokeStyle = "#ec4156";
	debugCtx.lineWidth = 2;
	for (const [x, z, r] of [
		[-9, G.paddles[0].z, params.paddleSize],
		[9, G.paddles[1].z, params.paddleSize],
		[G.ball.x, G.ball.z, 0.28],
	]) {
		const p = arena.project(x, z),
			q = arena.project(x, z + r);
		debugCtx.beginPath();
		debugCtx.arc(p.x, p.y, Math.max(4, Math.abs(p.y - q.y)), 0, Math.PI * 2);
		debugCtx.stroke();
	}
	debugCanvas.classList.toggle("hidden", !G.debug);
}
async function boot() {
	try {
		$("loadstatus").textContent = "Setting out the three courts…";
		await RAPIER.init();
		arena = await createArena(THREE, $("scene"));
		createWorld();
		$("loading").classList.add("hidden");
		showTitle();
		const hub = await network.connectHub();
		if (hub) {
			$("titleScreen").classList.add("hidden");
			$("modal").innerHTML = modalShell(
				"A royal welcome.",
				`<p>Connected to AI Hub. The round will begin when everyone is ready.</p>`,
				{ back: false },
			);
			$("modal").classList.remove("hidden");
			screen = "hub";
			network.ready();
		}
		frameTime = performance.now();
		requestAnimationFrame(tick);
		window.__PADDLE__ = {
			ready: true,
			getState: () =>
				structuredClone({
					...snapshot(),
					attract: G.attract,
					screen,
					params,
					settings,
					perfect: G.perfect,
					debug: G.debug,
					network: network.info,
					backend: arena.diagnostics(),
					audio: audio.getDiagnostics(),
					best,
				}),
			start: startGame,
			point: (seat) => scorePoint(seat),
			next: nextEvent,
			act: onAction,
			advance: (seconds) => {
				for (let i = 0; i < Math.ceil(seconds * 120); i++) step(1 / 120);
				renderHud();
			},
			setBall: (x, z, vx, vz) => {
				G.phase = "play";
				ballBody.setTranslation({ x, y: 0.5, z }, true);
				ballBody.setLinvel({ x: vx, y: 0, z: vz }, true);
				syncBall();
			},
			setPaddle: (seat, z) => {
				G.paddles[seat].z = z;
				paddleBodies[seat].setTranslation(
					{ x: seat === 0 ? -9 : 9, y: 0.5, z },
					true,
				);
			},
			setParam: (key, value) => {
				if (key in params) {
					params[key] = Number(value);
					if (key === "paddleSize") updatePaddleSize();
				}
			},
			setIdle: () => {
				lastActivity = performance.now() - 10001;
			},
			network: () => network,
			audioProbe: () => AudioEngine.renderProbe(),
			resumeAudio: () => audio.resume(),
			renderer: arena,
			physics: () => ({
				bodies: world.bodies.len(),
				colliders: world.colliders.len(),
				version: RAPIER.version(),
			}),
		};
	} catch (error) {
		console.error(error);
		$("loadstatus").textContent = "The court could not open. " + error.message;
		const retry = document.createElement("button");
		retry.textContent = "Try again";
		retry.onclick = () => location.reload();
		$("loading").appendChild(retry);
	}
}
boot();
