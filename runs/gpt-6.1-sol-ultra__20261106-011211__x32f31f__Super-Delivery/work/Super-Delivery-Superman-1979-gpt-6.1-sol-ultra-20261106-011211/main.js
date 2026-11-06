import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three/webgpu";
import { AudioDirector } from "./audio.js";
import { NetworkLink } from "./network.js";
import { createEntity, createHero, createRing, createWorld } from "./world.js";

const $ = (s) => document.querySelector(s),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const title = "Super Delivery";
const defaults = {
	flightSpeed: 24,
	boostMultiplier: 2.2,
	enemySpeed: 4,
	satelliteSpeed: 6,
	powerDrain: 26,
	grabRadius: 9,
	timeScale: 1,
};
let config = { ...defaults },
	prefs = { music: 0.1, sfx: true, glyphs: "ps", assist: true };
try {
	Object.assign(prefs, JSON.parse(localStorage.getItem("sd-prefs") || "{}"));
} catch {}
const savePrefs = () => {
	try {
		localStorage.setItem("sd-prefs", JSON.stringify(prefs));
	} catch {}
};
const audio = new AudioDirector();
audio.setMusicVolume(prefs.music);
audio.setMuted(!prefs.sfx);
let graphicsRecovering = false,
	graphicsError = "",
	graphicsRecoveries = 0,
	graphicsRequested = "webgpu",
	renderedFrames = 0;
let scene,
	camera,
	renderer,
	world,
	physics,
	controller,
	ready = false,
	screen = "loading",
	returnScreen = "title",
	lastTime = 0,
	clockTime = 0,
	simAccumulator = 0;
let idle = 0,
	attract = false,
	demoClock = 0,
	toastTimer = 0,
	radioTimer = 0,
	scan = 0,
	networkTimer = 0,
	hudTimer = 0,
	focused = 0,
	padPrevious = [],
	lastInput = "keyboard",
	touchMode = false,
	mouseDrag = null,
	hovered = null,
	ray = new THREE.Raycaster(),
	pointer = new THREE.Vector2(),
	cameraYaw = 0.18,
	cameraZoom = 1;
let god = false,
	freeze = false,
	noclip = false,
	showMarkers = true,
	mission,
	players = [],
	entities = [],
	satellites = [],
	rescues = [],
	chopper,
	flightTrails = [],
	effects = [],
	networkUI = "",
	netCode = "",
	hubStarted = false,
	networkEnded = false;
const held = new Set(),
	actions = new Set(),
	touches = new Map(),
	remoteInputs = new Map();
const localInput = {
	x: 0,
	z: 0,
	up: false,
	down: false,
	boost: false,
	interact: false,
	scan: false,
};
const pendingNetworkActions = { interact: false, scan: false };
const rangeProgress = new WeakMap();
let networkInputSequence = 0,
	networkStateSequence = 0,
	lastNetworkSnapshot = -1;
const placement = {
	booth: [-22, 0, 0],
	jail: [-52, 0, -40],
	newsroom: [48, 0, -45],
	bridge: [0, 0, 24],
	reporter: [-35, 0, -8],
	subwayWest: [-65, 0, 10],
	subwayEast: [60, 0, -5],
};
const crookStarts = [
		[-60, 0, 0],
		[35, 0, 0],
		[78, 0, 42],
		[-60, 0, 42],
		[0, 0, -63],
		[70, 0, -10],
	],
	girderStarts = [
		[-78, 0, 6],
		[37, 0, 43],
		[0, 0, -38],
	];
const vec = (a) => new THREE.Vector3(...a),
	dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
	fmt = (t) =>
		`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const sessionSeat = (id) =>
	(link.info?.players || link.players).findIndex((p) => p.id === id);
const localIndex = () =>
	link.hubActive
		? Math.max(0, sessionSeat(link.me))
		: link.connected && !link.isHost
			? 1
			: 0;
const playerActive = (i) =>
	link.hubActive
		? link.players.some((p) => sessionSeat(p.id) === i)
		: i < (link.connected ? 2 : 1);
const me = () => players[localIndex()] || players[0];
const activeCount = () =>
	link.hubActive ? Math.max(1, link.players.length) : link.connected ? 2 : 1;
const authoritative = () => !link.connected || link.isHost;
const isRunning = () =>
	link.hubActive
		? hubStarted && !networkEnded && !!mission && !mission.won
		: screen === "play" ||
			attract ||
			(link.connected &&
				mission &&
				!mission.won &&
				hubStarted &&
				!networkEnded);
const link = new NetworkLink({
	onMessage(type, data, from) {
		if (networkEnded) return;
		if (type === "input" && link.isHost && data) {
			const i = link.hubActive ? sessionSeat(from) : 1,
				prior = remoteInputs.get(i);
			if (
				i >= 0 &&
				playerActive(i) &&
				Number.isFinite(data.seq) &&
				data.seq > (prior?.seq ?? -1)
			) {
				let x = clamp(Number(data.x) || 0, -1, 1),
					z = clamp(Number(data.z) || 0, -1, 1);
				const length = Math.hypot(x, z);
				if (length > 1) {
					x /= length;
					z /= length;
				}
				remoteInputs.set(i, {
					x,
					z,
					up: !!data.up,
					down: !!data.down,
					boost: !!data.boost,
					interact: !!data.interact || !!prior?.interact,
					scan: !!data.scan || !!prior?.scan,
					seq: data.seq,
					stamp: performance.now(),
				});
			}
		}
		if (
			type === "state" &&
			!link.isHost &&
			(!link.hubActive || from === link.info.host)
		)
			applySnapshot(data);
		if (type === "start" && !link.hubActive && !link.isHost) {
			startGame(false, true);
			hubStarted = true;
		}
	},
	onStatus(text) {
		networkUI = text;
		const e = $("#netStatus");
		if (e) e.textContent = text;
	},
	onConnected() {
		lastNetworkSnapshot = -1;
		remoteInputs.clear();
		if (!link.hubActive) {
			hubStarted = true;
			if (link.isHost) {
				startGame(false, true);
				link.send("start", {}, { reliable: true });
			} else startGame(false, true);
			toast("CO-OP EDITION · TWO HEROES, ONE CITY");
		}
	},
	onStart() {
		hubStarted = true;
		startGame(false, true);
	},
	onTimeUp() {
		if (link.isHost) {
			if (mission) link.send("state", snapshot(), { reliable: true });
			finishHub(!!mission?.won);
		}
	},
	onEnd(data) {
		networkEnded = true;
		held.clear();
		actions.clear();
		touches.clear();
		remoteInputs.clear();
		audio.setMuted(true);
		screen = "ended";
		audio.setMode("pause");
		showPanel(
			"EDITION CLOSED",
			`<p>${data?.reason === "time-up" ? "The city desk has called time." : "Your AI Hub session has ended."}</p><p>Bridge sections: ${mission?.built.filter(Boolean).length || 0}/3 · Gang captured: ${mission?.arrested.filter(Boolean).length || 0}/6</p>`,
		);
	},
	onLeave(data) {
		if (link.hubActive) {
			const i = sessionSeat(data.id);
			if (i >= 0 && players[i]) {
				if (link.isHost) drop(players[i]);
				players[i].model.group.visible = false;
				remoteInputs.delete(i);
			}
		} else {
			if (!link.isHost) {
				link.close();
				hubStarted = false;
				showTitle();
				toast("HOST DISCONNECTED · START A NEW SOLO EDITION", 5);
				return;
			}
			toast("PARTNER DISCONNECTED · SOLO EDITION");
			if (players[1]) {
				drop(players[1]);
				players[1].model.group.visible = false;
			}
		}
	},
});
function glyph(action) {
	const gp = lastInput === "gamepad",
		x = prefs.glyphs === "xbox";
	const map = {
		interact: gp ? (x ? "X" : "□") : "E",
		fly: gp ? (x ? "A" : "×") : "Space",
		down: gp ? (x ? "B" : "○") : "Ctrl",
		scan: gp ? (x ? "Y" : "△") : "Q",
		boost: gp ? (x ? "RT" : "R2") : "Shift",
		pause: gp ? "☰" : "Esc",
		back: gp ? (x ? "B" : "○") : "Esc",
	};
	return `<span class="key">${map[action] || action}</span>`;
}
function inputActivity(type) {
	idle = 0;
	if (type) lastInput = type;
	if (attract) {
		attract = false;
		showTitle();
		return true;
	}
	return false;
}
function toast(text, time = 3) {
	$("#toast").textContent = text;
	$("#toast").hidden = false;
	toastTimer = time;
}
function radio(text, time = 6) {
	$("#radio p").textContent = text;
	$("#radio").hidden = false;
	radioTimer = time;
	audio.speak(text.length);
}
function menuButtons() {
	return [
		...$("#screen").querySelectorAll(
			"button:not(:disabled),input,select,textarea",
		),
	];
}
function focusMenu(i) {
	const b = menuButtons();
	if (!b.length) return;
	focused = (i + b.length) % b.length;
	b.forEach((e, j) => e.classList.toggle("focused", j === focused));
	b[focused].focus({ preventScroll: true });
	b[focused].scrollIntoView({ block: "nearest" });
}
function setScreen(s) {
	screen = s;
	$("#screen").hidden = s === "play";
	$("#hud").hidden = s === "title" || s === "loading";
	audio.setMode(attract ? "attract" : s);
	if (s !== "play") setTimeout(() => focusMenu(0), 0);
	$("#touchAction").hidden = !(touchMode && s === "play");
	$("#touchHint").hidden = !(touchMode && s === "play");
}
function showPanel(heading, body, wide = false) {
	$("#screen").hidden = false;
	$("#screen").innerHTML =
		`<div class="overlay"><section class="panel ${wide ? "wide" : ""}"><div class="eyebrow">SUPER DELIVERY / CITY DESK</div><h2>${heading}</h2>${body}</section></div>`;
	setTimeout(() => focusMenu(0), 0);
}
const btn = (id, label, primary = false, small = "") =>
	`<button id="${id}" class="btn ${primary ? "primary" : ""}">${label}${small ? `<small>${small}</small>` : "<span>↗</span>"}</button>`;
function backButton(cb) {
	$("#back")?.addEventListener("click", cb);
}
function showTitle() {
	if (link.hubActive) return;
	if (link.connected) link.close();
	hubStarted = false;
	attract = false;
	idle = 0;
	resetMission();
	setScreen("title");
	$("#screen").innerHTML =
		`<main class="menu"><section class="cover"><div class="issue"><span class="round">01</span> A PORT MERIDIAN ADVENTURE</div><h1 class="logo">SUPER<span>DELIVERY</span></h1><p class="tagline">A CITY IN PIECES.<br>A HERO ON THE CLOCK.</p><p class="description">The bridge is gone. The gang is loose.<br>And your story is due by morning.</p><div class="menulist">${btn("start", "SAVE THE MORNING", true, "1 PLAYER")}${btn("online", "CO-OP EDITION", false, "1–2 PLAYERS")}${btn("how", "HOW TO BE SUPER")}${btn("settings", "SETTINGS")}${btn("about", "ABOUT THIS EDITION")}</div><div class="fine">FLY. LIFT. REBUILD. MAKE THE HEADLINES.<br>KEYBOARD + MOUSE · CONTROLLER · TOUCH</div></section><aside class="cover-note">BRIDGE VANISHES!<br>MINUS SUSPECTED.<br>HERO RUNNING LATE.</aside></main>`;
	$("#start").onclick = () => startGame();
	$("#online").onclick = showOnline;
	$("#how").onclick = () => {
		returnScreen = "title";
		showHow();
	};
	$("#settings").onclick = () => {
		returnScreen = "title";
		showSettings();
	};
	$("#about").onclick = () => {
		returnScreen = "title";
		showAbout();
	};
	focusMenu(0);
}
function startGame(demo = false, network = false) {
	if ((link.hubActive || (link.connected && !link.isHost)) && !network) return;
	if (!network || authoritative()) resetMission();
	if (link.connected && !link.hubActive && link.isHost && !network)
		link.send("start", {}, { reliable: true });
	attract = demo;
	demoClock = 0;
	hubStarted = network || hubStarted;
	setScreen("play");
	$("#attractTag").hidden = !demo;
	audio.unlock();
	if (!demo && !network)
		radio(
			"Good morning, Kit! Mr. Minus has taken the bridge apart. Find the red phone booth. You have a city to put back together.",
		);
}
function showPause() {
	if (attract || screen !== "play") return;
	setScreen("pause");
	const net = link.hubActive || link.connected;
	showPanel(
		net ? "CITY DESK" : "HOLD THE FRONT PAGE",
		`<div class="menulist">${btn("resume", net ? "BACK TO THE CITY" : "RESUME", true)}${btn("how", "MISSION & CONTROLS")}${btn("settings", "SETTINGS")}${!net ? btn("dev", "DEVELOPER TOOLS") : ""}${btn("about", "ABOUT & CREDITS")}${!link.hubActive ? btn("quit", link.connected ? "LEAVE CO-OP" : "RETURN TO COVER") : ""}</div>${net ? '<p class="note">The shared city keeps running while this screen is open.</p>' : ""}`,
	);
	$("#resume").onclick = () => setScreen("play");
	$("#how").onclick = () => {
		returnScreen = "pause";
		showHow();
	};
	$("#settings").onclick = () => {
		returnScreen = "pause";
		showSettings();
	};
	$("#about").onclick = () => {
		returnScreen = "pause";
		showAbout();
	};
	if (!net) $("#dev").onclick = showDev;
	if (!link.hubActive)
		$("#quit").onclick = () => {
			link.close();
			hubStarted = false;
			showTitle();
		};
}
function returnMenu() {
	if (returnScreen === "title") showTitle();
	else {
		setScreen("play");
		showPause();
	}
}
function showHow() {
	setScreen("how");
	showPanel(
		"A LITTLE LIFT GOES A LONG WAY",
		`<div class="briefing"><article><b>01 / CHANGE INTO SOMETHING SUPER</b><p>Visit the red phone booth. Fly above the avenues; hold boost to really make an entrance.</p></article><article><b>02 / PUT THE CITY BACK TOGETHER</b><p>Lift three gold bridge sections and carry them to the river. Bring all six members of the Minus Gang to the city jail.</p></article><article><b>03 / MIND THE GREEN STUFF</b><p>Satellites drain solar power. Scan to repel them and reveal targets. Mina, your reporter friend, restores your powers. Rescue stranded citizens for a better headline.</p></article><article><b>04 / MAKE THE DEADLINE</b><p>Finish both jobs, return to the booth, and become Kit the reporter. Take a subway shortcut, then file your story at the Daily Dispatch.</p></article></div><div class="controltable"><div>${glyph("fly")} Fly / hold to climb</div><div>${glyph("down")} Descend / land</div><div>${glyph("interact")} Lift / use / set down</div><div>${glyph("scan")} X-ray pulse</div><div><span class="key">${lastInput === "gamepad" ? "L" : "WASD"}</span> Move</div><div>${glyph("boost")} Boost flight</div><div><span class="key">${lastInput === "gamepad" ? "R" : "RMB"}</span> Orbit camera</div><div><span class="key">${lastInput === "gamepad" ? "D-pad" : "M"}</span> Next objective</div></div><p class="note">Mouse: click nearby objects to lift or use them. Right-drag to orbit; wheel to zoom. Touch: drag the left half to move, the right half to rise or descend. Nearby objects and deliveries are assisted. The clock measures your best edition; there is no game-over timer.</p>${btn("back", "BACK")}`,
		true,
	);
	backButton(returnMenu);
}
function showSettings() {
	setScreen("settings");
	showPanel(
		"MAKE YOURSELF COMFORTABLE",
		`<label class="setting">Music <span><input id="music" type="range" min="0" max="1" step=".01" value="${prefs.music}"><output>${Math.round(prefs.music * 100)}%</output></span></label><label class="setting">Sound & voices <input id="sound" type="checkbox" ${prefs.sfx ? "checked" : ""}></label><label class="setting">Controller prompts <select id="glyph"><option value="ps" ${prefs.glyphs === "ps" ? "selected" : ""}>PlayStation · × ○ □ △</option><option value="xbox" ${prefs.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></label><label class="setting">Touch pickup assistance <input id="assist" type="checkbox" ${prefs.assist ? "checked" : ""}></label><p class="note">Music starts at 10%. Controls follow the device you used most recently. Both players share one city and one headline.</p>${btn("back", "BACK")}`,
	);
	$("#music").oninput = (e) => {
		prefs.music = +e.target.value;
		e.target.nextElementSibling.textContent =
			Math.round(prefs.music * 100) + "%";
		audio.setMusicVolume(prefs.music);
		savePrefs();
	};
	$("#sound").onchange = (e) => {
		prefs.sfx = e.target.checked;
		audio.setMuted(!prefs.sfx);
		savePrefs();
	};
	$("#glyph").onchange = (e) => {
		prefs.glyphs = e.target.value;
		savePrefs();
	};
	$("#assist").onchange = (e) => {
		prefs.assist = e.target.checked;
		savePrefs();
	};
	backButton(returnMenu);
}
function showDev() {
	setScreen("dev");
	const labels = {
		flightSpeed: ["Flight speed", 8, 60, 0.5],
		boostMultiplier: ["Boost multiplier", 1, 4, 0.1],
		enemySpeed: ["Gang speed", 0, 12, 0.2],
		satelliteSpeed: ["Satellite speed", 0, 18, 0.2],
		powerDrain: ["Power drain / sec", 0, 60, 1],
		grabRadius: ["Lift radius", 3, 20, 0.5],
		timeScale: ["Simulation rate", 0, 2, 0.1],
	};
	showPanel(
		"DEVELOPER TOOLS",
		`<div class="devgrid">${Object.entries(labels)
			.map(
				([key, [label, min, max, step]]) =>
					`<label class="setting">${label}<span><input data-var="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${config[key]}"><output>${config[key]}</output></span></label>`,
			)
			.join(
				"",
			)}<label class="setting">Unlimited power<input id="god" type="checkbox" ${god ? "checked" : ""}></label><label class="setting">Freeze hazards<input id="freeze" type="checkbox" ${freeze ? "checked" : ""}></label><label class="setting">Pass through buildings<input id="noclip" type="checkbox" ${noclip ? "checked" : ""}></label><label class="setting">Objective markers<input id="markers" type="checkbox" ${showMarkers ? "checked" : ""}></label></div><div class="buttonrow">${btn("warp", "WARP TO NEXT TARGET")}${btn("recharge", "RECHARGE")}${btn("nextBridge", "RESTORE A SECTION")}${btn("nextGang", "ARREST A CROOK")}</div><div class="buttonrow">${btn("step", "STEP 1 SECOND")}${btn("resetDefaults", "RESET VARIABLES")}${btn("resetMission", "RESET MISSION")}</div><p id="devstats" class="note">${renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL fallback"} · Rapier ${RAPIER.version()} · bodies ${physics.bodies.len()} · ${link.connected ? "co-op connected" : "solo"} · seed 1979</p>${btn("back", "BACK TO PAUSE")}`,
		true,
	);
	document.querySelectorAll("[data-var]").forEach(
		(e) =>
			(e.oninput = () => {
				config[e.dataset.var] = +e.value;
				e.nextElementSibling.textContent = e.value;
			}),
	);
	for (const [id, set] of [
		["god", (v) => (god = v)],
		["freeze", (v) => (freeze = v)],
		["noclip", (v) => (noclip = v)],
		["markers", (v) => (showMarkers = v)],
	])
		$("#" + id).onchange = (e) => set(e.target.checked);
	$("#warp").onclick = () => teleport(me(), nextTarget().position, 14);
	$("#recharge").onclick = () => {
		me().power = 100;
		me().weak = false;
	};
	$("#nextBridge").onclick = () => {
		const i = mission.built.indexOf(false);
		if (i >= 0) installBridge(i);
	};
	$("#nextGang").onclick = () => {
		const i = mission.arrested.indexOf(false);
		if (i >= 0) arrest(i);
	};
	$("#step").onclick = () => {
		for (let i = 0; i < 60; i++) simulate(1 / 60, {});
	};
	$("#resetDefaults").onclick = () => {
		config = { ...defaults };
		god = freeze = noclip = false;
		showMarkers = true;
		showDev();
	};
	$("#resetMission").onclick = () => {
		resetMission();
		showDev();
	};
	backButton(() => {
		setScreen("play");
		showPause();
	});
}
function showAbout() {
	setScreen("about");
	const s = window.GAME_CREDITS?.sourceInformation || {};
	const f = window.GAME_CREDITS || {};
	showPanel(
		"THE PEOPLE BEHIND THE CAPE",
		`<div class="scrollcopy"><p><b>Super Delivery</b> — an original city rescue adventure, inspired by Atari’s <i>Superman (1979)</i>. Design, code, procedural art, animation and sound created with OpenAI Codex.</p><h3>Source Information</h3>${Object.entries(
			s,
		)
			.map(([k, v]) => `<p><b>${k.replace(/([A-Z])/g, " $1")}: </b>${v}</p>`)
			.join(
				"",
			)}<p><a href="https://www.atariage.com/2600/manuals_old/superman.html" target="_blank" rel="noopener">Original 1979 Atari manual</a> · <a href="https://www.atariage.com/screenshot_page.php?SoftwareLabelID=533" target="_blank" rel="noopener">Original screenshots</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a></p>${[
			["Testing Feedback", f.testingFeedback],
			["Engine Feedback", f.engineFeedback],
			["Prompt Feedback", f.promptFeedback],
		]
			.map(
				([h, a]) =>
					`<h3>${h}</h3><ol>${(a || ["unknown"]).map((x) => `<li>${x}</li>`).join("")}</ol>`,
			)
			.join(
				"",
			)}<h3>Libraries & acknowledgements</h3><p>Three.js r180 (MIT); Rapier 0.19.3 (Apache-2.0); AI Hub Session Protocol v1, client 1.4.0. No engine modifications. All scene geometry and sound are created in code. Optional Google Fonts: Barlow Condensed and DM Sans. Original Superman characters and game belong to their respective owners; this game uses an original cast and city.</p></div>${btn("back", "BACK")}`,
		true,
	);
	if (link.hubActive)
		$("#screen")
			.querySelectorAll("a")
			.forEach((a) => {
				const text = document.createElement("span");
				text.textContent = a.textContent;
				a.replaceWith(text);
			});
	backButton(returnMenu);
}
function showOnline() {
	setScreen("online");
	showPanel(
		"TWO CAPES. ONE DEADLINE.",
		`<div class="network"><p>Share the city with a friend. You can host inside AI Hub, or connect two browsers directly with invitation codes.</p><p id="netStatus">${networkUI || "Direct co-op · no account required"}</p><div class="buttonrow">${btn("host", "CREATE INVITATION", true)}${btn("join", "JOIN A FRIEND")}</div><div id="netFields"></div><p class="note">Direct mode uses WebRTC and public STUN. Both browsers must stay open. Some networks require a relay; connection availability there is unknown. AI Hub supplies its own connection.</p>${btn("back", "BACK")}</div>`,
	);
	$("#host").onclick = async () => {
		try {
			const code = await link.host();
			if (screen !== "online") return;
			netCode = code;
			$("#netFields").innerHTML =
				'<p>1. Send this invitation to your friend.</p><textarea id="codeOut" readonly></textarea><p>2. Paste their reply below.</p><textarea id="codeIn" aria-label="Friend reply"></textarea>' +
				btn("accept", "CONNECT");
			$("#codeOut").value = code;
			$("#codeOut").onclick = (e) => e.target.select();
			$("#accept").onclick = async () => {
				try {
					await link.accept($("#codeIn").value);
				} catch (e) {
					const status = $("#netStatus");
					if (status) status.textContent = e.message;
				}
			};
		} catch (e) {
			const status = $("#netStatus");
			if (status) status.textContent = e.message;
		}
	};
	$("#join").onclick = () => {
		$("#netFields").innerHTML =
			'<p>Paste your friend’s invitation.</p><textarea id="codeIn" aria-label="Invitation"></textarea>' +
			btn("reply", "MAKE REPLY");
		$("#reply").onclick = async () => {
			try {
				const code = await link.join($("#codeIn").value);
				if (screen !== "online") return;
				$("#netFields").innerHTML =
					'<p>Send this reply back. The city opens when your friend connects.</p><textarea id="codeOut" readonly></textarea>';
				$("#codeOut").value = code;
				$("#codeOut").onclick = (e) => e.target.select();
			} catch (e) {
				const status = $("#netStatus");
				if (status) status.textContent = e.message;
			}
		};
	};
	backButton(() => {
		link.close();
		showTitle();
	});
}
function finishHub(won) {
	if (!link.hubActive || !link.isHost) return;
	const scores = Object.fromEntries(
			link.players.map((p) => [p.id, mission ? score() : 0]),
		),
		stats = Object.fromEntries(
			link.players.map((p) => [
				p.id,
				{
					Time: Math.round(mission?.time || 0),
					Arrests: mission?.arrested.filter(Boolean).length || 0,
					Bridge: mission?.built.filter(Boolean).length || 0,
					Rescued: mission?.rescued.filter(Boolean).length || 0,
				},
			]),
		);
	link.finish(won, scores, stats);
}
function showWin() {
	if (link.connected && link.isHost)
		link.send("state", snapshot(), { reliable: true });
	setScreen("win");
	audio.sfx("win");
	const resc = mission.rescued.filter(Boolean).length,
		grade =
			mission.time < 360
				? "FRONT-PAGE LEGEND"
				: mission.time < 600
					? "CITY SAVER"
					: "LOCAL HERO";
	showPanel(
		"THE MORNING IS SAVED!",
		`<div class="badge">${grade}</div><p>BRIDGE BACK! MINUS BEHIND BARS!<br>“Just doing my job,” says mysteriously late reporter.</p><div class="win-number">${fmt(mission.time)}</div><div class="scoreline"><span>Bridge rebuilt</span><b>3 / 3</b></div><div class="scoreline"><span>Gang behind bars</span><b>6 / 6</b></div><div class="scoreline"><span>Citizens brought home</span><b>${resc} / 2</b></div><div class="scoreline"><span>Edition score</span><b>${score()}</b></div><div class="buttonrow">${btn("again", "ANOTHER EDITION", true)}${btn("back", "RETURN TO COVER")}</div>`,
	);
	if (link.hubActive) {
		$("#again").remove();
		$("#back").remove();
		if (link.isHost) finishHub(true);
	} else {
		$("#again").onclick = () => startGame();
		if (link.connected && !link.isHost) $("#again").disabled = true;
		backButton(showTitle);
	}
}
const score = () =>
	Math.max(0, 12000 - Math.floor(mission.time) * 10) +
	mission.rescued.filter(Boolean).length * 1500;
function createPhysics() {
	physics = new RAPIER.World({ x: 0, y: -22, z: 0 });
	controller = physics.createCharacterController(0.04);
	controller.enableAutostep(1.2, 0.3, true);
	controller.enableSnapToGround(0.4);
	const fixed = (x, y, z, w, h, d) => {
		const b = physics.createRigidBody(
			RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z),
		);
		return physics.createCollider(
			RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(0.1),
			b,
		);
	};
	fixed(0, -1.1, -43, 220, 2, 114);
	fixed(0, -1.1, 75, 220, 2, 82);
	for (const c of world.colliders) fixed(c.x, c.y, c.z, c.w, c.h, c.d);
	world.bridgeSlots.forEach((g, i) => (g.userData.collider = null));
	world.fixed = fixed;
}
function createPlayer(i) {
	const model = createHero(i === 1 ? 0x149691 : undefined);
	scene.add(model.group);
	const body = physics.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			-22 + i * 4,
			2,
			5,
		),
	);
	const collider = physics.createCollider(
		RAPIER.ColliderDesc.capsule(1.05, 0.78).setCollisionGroups(0x00010001),
		body,
	);
	const ring = createRing(i === 1 ? 0x63eee2 : 0xffd457, 2.6);
	scene.add(ring);
	return {
		model,
		body,
		collider,
		ring,
		pos: new THREE.Vector3(-22 + i * 4, 0, 5),
		velocity: new THREE.Vector3(),
		flying: false,
		reporter: true,
		weak: false,
		power: 100,
		carry: null,
		flightPressed: false,
		scanCooldown: 0,
		invulnerable: 0,
		facing: 0,
		step: 0,
	};
}
function addEntity(type, index, pos) {
	const group = createEntity(type, index);
	group.position.copy(vec(pos));
	scene.add(group);
	const ring = createRing(
		type === "girder" ? 0xffcf4b : type === "citizen" ? 0x3caabb : 0xe15b46,
		type === "girder" ? 4 : 2.5,
	);
	ring.position.copy(vec(pos));
	ring.position.y = 0.18;
	scene.add(ring);
	const body = physics.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...pos),
	);
	const collider = physics.createCollider(
		RAPIER.ColliderDesc.ball(type === "girder" ? 2 : 1).setSensor(true),
		body,
	);
	const e = {
		type,
		index,
		group,
		ring,
		body,
		collider,
		pos: vec(pos),
		home: vec(pos),
		done: false,
		carrier: null,
		phase: index * 2.3,
	};
	entities.push(e);
	return e;
}
function resetMission() {
	if (!ready) return;
	remoteInputs.clear();
	pendingNetworkActions.interact = pendingNetworkActions.scan = false;
	mission = {
		phase: "reporter",
		time: 0,
		built: [false, false, false],
		arrested: Array(6).fill(false),
		rescued: [false, false],
		won: false,
		scans: 0,
		pickups: 0,
		subways: 0,
		chopperMoves: 0,
		healCount: 0,
		damageCount: 0,
	};
	scan = 0;
	world.bridgeSlots.forEach((g) => {
		g.visible = false;
		if (g.userData.collider) {
			physics.removeCollider(g.userData.collider, true);
			g.userData.collider = null;
		}
	});
	players.forEach((p, i) => {
		p.reporter = true;
		p.weak = false;
		p.power = 100;
		p.velocity.set(0, 0, 0);
		p.carry = null;
		p.flying = false;
		p.invulnerable = 0;
		p.scanCooldown = 0;
		p.flightPressed = false;
		teleport(p, vec([-22 + i * 5, 0, 6]), 0);
		p.model.group.visible = playerActive(i);
	});
	entities.forEach((e) => {
		e.done = false;
		e.carrier = null;
		e.pos.copy(e.home);
		e.group.visible = true;
		e.ring.visible = true;
	});
	satellites.forEach((e, i) => {
		e.pos.set(20 + i * 18, 12, -16 - i * 5);
		e.cooldown = 0;
	});
	if (chopper) {
		chopper.carry = null;
		chopper.timer = 0;
	}
	$("#attractTag").hidden = true;
	$("#toast").hidden = true;
	$("#radio").hidden = true;
	networkEnded = false;
}
function teleport(p, v, y = v.y) {
	p.pos.set(v.x, y, v.z);
	p.body.setTranslation({ x: v.x, y: y + 1.85, z: v.z }, true);
	p.body.setNextKinematicTranslation({ x: v.x, y: y + 1.85, z: v.z });
	p.flying = y > 3;
	p.model.group.position.copy(p.pos);
}
function activeEntities() {
	return entities.filter((e) => !e.done && !e.carrier);
}
function nearest(p) {
	let best = null,
		d = config.grabRadius;
	for (const e of activeEntities()) {
		const ed = dist(e.pos, p.pos);
		if (ed < d && Math.abs(p.pos.y - e.pos.y) < 13) {
			d = ed;
			best = e;
		}
	}
	return best;
}
function landmarkNear(p, name, r = 10) {
	return dist(p.pos, vec(placement[name])) < r;
}
function nextTarget(p = me()) {
	if (!mission) return { position: vec(placement.booth), label: "PHONE BOOTH" };
	if (p?.weak)
		return { position: vec(placement.reporter), label: "MINA · RESTORE POWER" };
	if (mission.phase === "reporter")
		return { position: vec(placement.booth), label: "PHONE BOOTH" };
	if (p?.carry)
		return {
			position: vec(
				placement[
					p.carry.type === "girder"
						? "bridge"
						: p.carry.type === "citizen"
							? "reporter"
							: "jail"
				],
			),
			label:
				p.carry.type === "girder"
					? "REBUILD BRIDGE"
					: p.carry.type === "citizen"
						? "MINA · RESCUE"
						: "CITY JAIL",
		};
	if (mission.phase === "return")
		return { position: vec(placement.booth), label: "CHANGE TO REPORTER" };
	if (mission.phase === "file")
		return { position: vec(placement.newsroom), label: "DAILY DISPATCH" };
	let e = activeEntities().filter(
		(e) => e.type === "girder" || e.type === "crook" || e.type === "mastermind",
	);
	if (e.length) {
		e.sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos));
		return {
			position: e[0].pos,
			label:
				e[0].type === "girder"
					? "BRIDGE SECTION"
					: e[0].type === "mastermind"
						? "MR. MINUS"
						: "MINUS GANG",
		};
	}
	return { position: vec(placement.booth), label: "PHONE BOOTH" };
}
function checkProgress() {
	if (
		mission.phase === "active" &&
		mission.built.every(Boolean) &&
		mission.arrested.every(Boolean)
	) {
		mission.phase = "return";
		radio(
			"Bridge standing. Gang sitting. Beautiful work! Change at the phone booth, then bring me that story at the Dispatch.",
			8,
		);
		toast("CITY SAVED! NOW FILE THE STORY.", 5);
	}
}
function installBridge(i) {
	if (mission.built[i]) return;
	mission.built[i] = true;
	world.bridgeSlots[i].visible = true;
	const g = world.bridgeSlots[i];
	g.userData.collider = world.fixed(0, 0.05, 17.33 + i * 6.66, 9, 1, 6.7);
	const e = entities.find((e) => e.type === "girder" && e.index === i);
	if (e) {
		e.done = true;
		e.carrier = null;
		players.forEach((p) => {
			if (p.carry === e) p.carry = null;
		});
	}
	burst(vec([0, 1, 17.33 + i * 6.66]), 0xffce4c, 24);
	audio.sfx("deliver");
	toast(
		mission.built.every(Boolean)
			? "THE BRIDGE IS BACK IN BUSINESS!"
			: `BRIDGE SECTION ${mission.built.filter(Boolean).length} / 3 · SPECIAL DELIVERY`,
	);
	checkProgress();
}
function arrest(i) {
	if (mission.arrested[i]) return;
	mission.arrested[i] = true;
	const e = entities.find(
		(e) => (e.type === "crook" || e.type === "mastermind") && e.index === i,
	);
	if (e) {
		e.done = true;
		e.carrier = null;
		players.forEach((p) => {
			if (p.carry === e) p.carry = null;
		});
	}
	burst(vec(placement.jail).add(new THREE.Vector3(0, 3, 0)), 0xffd457, 15);
	audio.sfx("deliver");
	toast(
		i === 5
			? "MR. MINUS, MEET THE MINUSCULE CELL."
			: `GANG CAPTURED ${mission.arrested.filter(Boolean).length} / 6`,
	);
	checkProgress();
}
function drop(p) {
	if (!p.carry) return;
	const e = p.carry;
	e.carrier = null;
	e.pos.copy(p.pos);
	e.pos.y = 0;
	p.carry = null;
	audio.sfx("pickup");
	toast("DELIVERY SET DOWN", 1.2);
}
function interact(p) {
	if (mission.won) return;
	if (landmarkNear(p, "booth", 9) && p.pos.y < 7) {
		if (mission.phase === "reporter") {
			mission.phase = "active";
			players.forEach((h) => {
				h.reporter = false;
				h.power = 100;
			});
			audio.sfx("transform");
			burst(p.pos, 0xffd457, 25);
			radio(
				"Up, up, and on the job! Gold marks the bridge sections. Red marks the gang. Lift with confidence. Deliver with care.",
				7,
			);
			toast("THIS CALL IS FOR SUPER DELIVERY!");
		} else if (mission.phase === "return") {
			players.forEach((h) => {
				drop(h);
				h.reporter = true;
				h.flying = false;
			});
			mission.phase = "file";
			audio.sfx("transform");
			radio(
				"A hero saves the city. A reporter gets the facts straight. Take the subway east, then head for the Daily Dispatch.",
			);
		} else if (mission.phase === "active")
			toast("THE CITY STILL NEEDS YOUR CAPE.");
		return;
	}
	if (landmarkNear(p, "reporter", 10)) {
		p.power = 100;
		p.weak = false;
		mission.healCount++;
		audio.sfx("heal");
		if (!p.carry) {
			toast("THANKS, MINA! POWER RESTORED.");
			return;
		}
	}
	if (
		mission.phase === "file" &&
		landmarkNear(p, "newsroom", 13) &&
		p.pos.y < 6
	) {
		mission.won = true;
		mission.phase = "won";
		if (!attract) showWin();
		return;
	}
	for (const [a, b] of [
		["subwayWest", "subwayEast"],
		["subwayEast", "subwayWest"],
	])
		if (landmarkNear(p, a, 8) && p.pos.y < 5 && !p.carry) {
			teleport(p, vec(placement[b]).add(new THREE.Vector3(0, 0, 5)), 0);
			mission.subways++;
			audio.sfx("subway");
			toast("CROSS-TOWN EXPRESS · NEXT STOP: THE STORY");
			p.invulnerable = 2;
			return;
		}
	if (p.carry) {
		if (deliver(p)) return;
		drop(p);
		return;
	}
	if (p.reporter) {
		toast("A PHONE BOOTH WOULD BE SUPER RIGHT NOW.");
		return;
	}
	if (p.weak) {
		toast("FIND MINA TO RESTORE YOUR POWERS.");
		return;
	}
	const e = nearest(p);
	if (e) {
		e.carrier = p;
		e.pos.copy(p.pos);
		p.carry = e;
		p.flying = true;
		mission.pickups++;
		audio.sfx("pickup");
		toast(
			e.type === "girder"
				? "HEAVY LIFT! HEAD FOR THE BRIDGE."
				: e.type === "citizen"
					? "SAFE HANDS. TAKE THEM TO MINA."
					: "NEXT STOP: CITY JAIL.",
			2,
		);
		burst(e.pos, 0xffe6a0, 8);
	}
}
function deliver(p) {
	const e = p.carry;
	if (!e) return false;
	const where =
		e.type === "girder" ? "bridge" : e.type === "citizen" ? "reporter" : "jail";
	if (!landmarkNear(p, where, where === "bridge" ? 15 : 12)) return false;
	p.carry = null;
	e.carrier = null;
	e.done = true;
	if (e.type === "girder") installBridge(e.index);
	else if (e.type === "citizen") {
		mission.rescued[e.index] = true;
		audio.sfx("heal");
		toast("CITIZEN SAFE · THE CITY SAYS THANK YOU!");
		p.power = 100;
		burst(vec(placement.reporter), 0x41c5be, 20);
	} else arrest(e.index);
	return true;
}
function pulse(p) {
	if (p.reporter || p.weak || p.scanCooldown > 0) return;
	p.scanCooldown = 5;
	scan = 5;
	mission.scans++;
	audio.sfx("scan");
	const ring = createRing(0x55e5db, 1);
	ring.position.copy(p.pos);
	ring.position.y += 1;
	scene.add(ring);
	effects.push({ mesh: ring, time: 0, life: 1.2, ring: true });
	satellites.forEach((s) => {
		if (dist(s.pos, p.pos) < 38) {
			s.cooldown = 6;
			const away = s.pos.clone().sub(p.pos).normalize();
			s.pos.addScaledVector(away, 20);
		}
	});
	toast("X-RAY PULSE · TARGETS REVEALED · SATELLITES REPELLED", 2);
}
function burst(pos, color, count = 12) {
	for (let i = 0; i < count; i++) {
		const m = new THREE.Mesh(
			new THREE.BoxGeometry(0.35, 0.35, 0.35),
			new THREE.MeshBasicMaterial({ color }),
		);
		m.position.copy(pos).y += 2;
		scene.add(m);
		effects.push({
			mesh: m,
			time: 0,
			life: 0.8 + Math.random() * 0.7,
			velocity: new THREE.Vector3(
				(Math.random() - 0.5) * 13,
				Math.random() * 13,
				(Math.random() - 0.5) * 13,
			),
		});
	}
}
function damage(p, dt) {
	if (god || attract || p.invulnerable > 0) return;
	p.power = Math.max(0, p.power - config.powerDrain * dt);
	if (p.power === 0 && !p.weak) {
		p.weak = true;
		p.flying = false;
		drop(p);
		mission.damageCount++;
		audio.sfx("hit");
		radio(
			"Those green satellites have drained your powers! Come see me by the phone booth. I have just the encouragement you need.",
			7,
		);
		toast("POWER DRAINED · FIND MINA", 4);
	}
}
function updatePlayer(p, input, dt, i) {
	if (!p || !p.model.group.visible) return;
	const up = !!input.up,
		down = !!input.down;
	p.scanCooldown = Math.max(0, p.scanCooldown - dt);
	p.invulnerable = Math.max(0, p.invulnerable - dt);
	if (input.interact) interact(p);
	if (input.scan) pulse(p);
	if (up && !p.reporter && !p.weak && !p.flying) {
		p.flying = true;
		audio.sfx("launch");
		burst(p.pos, 0xfff1bf, 8);
	}
	if (p.reporter || p.weak) p.flying = false;
	const mx = input.x || 0,
		mz = input.z || 0,
		len = Math.hypot(mx, mz),
		boost = !!input.boost && p.flying && !p.weak;
	const speed = p.flying
		? config.flightSpeed *
			(boost ? config.boostMultiplier : 1) *
			(p.carry?.type === "girder" ? 0.78 : 1)
		: p.weak
			? 7
			: 10;
	const targetVX = mx * speed,
		targetVZ = mz * speed,
		smooth = 1 - Math.exp(-dt * 9);
	p.velocity.x += (targetVX - p.velocity.x) * smooth;
	p.velocity.z += (targetVZ - p.velocity.z) * smooth;
	let vy = p.flying
		? up
			? 14
			: down
				? -18
				: p.pos.y < 10
					? (10 - p.pos.y) * 3
					: 0
		: -22;
	if (p.pos.y > 48) vy = Math.min(vy, 0);
	if (down && p.pos.y < 1.3) {
		p.flying = false;
		vy = -10;
	}
	const movement = { x: p.velocity.x * dt, y: vy * dt, z: p.velocity.z * dt };
	let corrected = movement;
	if (!noclip && !attract) {
		controller.computeColliderMovement(
			p.collider,
			movement,
			undefined,
			undefined,
			(c) => !c.isSensor(),
		);
		corrected = controller.computedMovement();
	}
	const t = p.body.translation();
	p.body.setNextKinematicTranslation({
		x: clamp(t.x + corrected.x, -101, 101),
		y: t.y + corrected.y,
		z: clamp(t.z + corrected.z, -99, 99),
	});
	if (len > 0.1) p.facing = Math.atan2(mx, mz);
	p.model.group.rotation.y = THREE.MathUtils.damp(
		p.model.group.rotation.y,
		p.facing,
		12,
		dt,
	);
	if (p.flying && boost) p.power = Math.max(p.weak ? 0 : 5, p.power - dt * 1.6);
	else if (!p.weak) p.power = Math.min(100, p.power + dt * 2);
	if (p.pos.y < -5) {
		drop(p);
		teleport(p, vec(placement.booth), 0);
		toast("A QUICK DIP. BACK TO WORK.", 2);
		p.power = Math.max(10, p.power - 12);
		p.invulnerable = 3;
	}
	if (
		landmarkNear(p, "reporter", 9) &&
		p.pos.y < 16 &&
		(p.power < 100 || p.weak)
	) {
		const weak = p.weak;
		p.power = 100;
		p.weak = false;
		if (weak) {
			mission.healCount++;
			audio.sfx("heal");
			toast("MINA RESTORED YOUR POWERS!");
		}
	}
	if (p.carry) deliver(p);
	if (
		touchMode &&
		prefs.assist &&
		!p.carry &&
		!p.reporter &&
		!p.weak &&
		nearest(p) &&
		p.step <= 0
	) {
		interact(p);
		p.step = 1;
	}
	p.step = Math.max(0, p.step - dt);
}
function simulate(dt, inputs = null) {
	if (!mission) return;
	if (mission.won) {
		if (attract) {
			resetMission();
			demoClock = 0;
		} else return;
	}
	const gameplay = mission.phase !== "reporter";
	if (gameplay) mission.time += dt;
	const count = activeCount();
	players.forEach((p, i) => {
		p.model.group.visible = playerActive(i);
		if (!p.model.group.visible) return;
		let input = {};
		if (attract && i === 0) input = attractInput(dt);
		else if (
			i === localIndex() &&
			(!link.hubActive || link.players.some((q) => q.id === link.me))
		)
			input = inputs || localInput;
		else {
			const ri = remoteInputs.get(i);
			if (ri && performance.now() - ri.stamp < 1000) {
				input = { ...ri };
				ri.interact = false;
				ri.scan = false;
			}
		}
		updatePlayer(p, input, dt, i);
	});
	if (!freeze) {
		entities.forEach((e) => {
			if (e.done || e.carrier || e.type === "girder" || e.type === "citizen")
				return;
			const p = players
				.filter((p) => p.model.group.visible)
				.sort((a, b) => dist(e.pos, a.pos) - dist(e.pos, b.pos))[0];
			const near = dist(e.pos, p.pos) < 22 && !p.reporter;
			let dx = Math.sin(clockTime * 0.45 + e.phase),
				dz = Math.cos(clockTime * 0.35 + e.phase) * 0.35;
			if (near) {
				dx = e.pos.x - p.pos.x;
				dz = e.pos.z - p.pos.z;
				const l = Math.hypot(dx, dz) || 1;
				dx /= l;
				dz /= l;
			}
			e.pos.x = clamp(e.pos.x + dx * config.enemySpeed * dt, -90, 90);
			e.pos.z = clamp(e.pos.z + dz * config.enemySpeed * dt, -90, 90);
			if (e.pos.z > 9 && e.pos.z < 37) e.pos.z = e.home.z < 14 ? 9 : 39;
			if (
				world.colliders.some(
					(c) =>
						Math.abs(e.pos.x - c.x) < c.w / 2 + 2 &&
						Math.abs(e.pos.z - c.z) < c.d / 2 + 2,
				)
			) {
				e.pos.x += (e.home.x - e.pos.x) * dt * 3;
				e.pos.z += (e.home.z - e.pos.z) * dt * 3;
			}
			e.group.rotation.y = Math.atan2(dx, dz);
		});
		satellites.forEach((s, i) => {
			s.cooldown = Math.max(0, s.cooldown - dt);
			const live = players.filter((p, j) => playerActive(j));
			const p = live[i % live.length] || players[0];
			const d = dist(s.pos, p.pos);
			if (gameplay && d < 43 && p.flying && !p.reporter && s.cooldown === 0) {
				const dv = p.pos
					.clone()
					.add(new THREE.Vector3(0, 2, 0))
					.sub(s.pos);
				s.pos.addScaledVector(
					dv.normalize(),
					Math.min(config.satelliteSpeed * dt, dv.length()),
				);
				if (d < 5.5 && Math.abs(s.pos.y - p.pos.y) < 8) damage(p, dt);
			} else {
				s.pos.x += Math.sin(clockTime * 0.3 + i * 3) * dt * 3;
				s.pos.z += Math.cos(clockTime * 0.24 + i * 3) * dt * 3;
				s.pos.y = 12 + Math.sin(clockTime + i) * 3;
			}
			s.group.position.copy(s.pos);
			s.group.rotation.y += dt * 1.6;
			s.group.rotation.z = Math.sin(clockTime * 3 + i) * 0.15;
		});
	}
	chopper.timer += dt;
	const cpos = new THREE.Vector3(
		Math.cos(clockTime * 0.11) * 67,
		24 + Math.sin(clockTime * 0.3) * 3,
		Math.sin(clockTime * 0.11) * 50 - 4,
	);
	chopper.group.position.copy(cpos);
	chopper.group.rotation.y = -clockTime * 0.11 - Math.PI / 2;
	if (chopper.carry) {
		chopper.carry.pos.copy(cpos).y -= 5;
		if (chopper.timer > 7) {
			chopper.carry.carrier = null;
			chopper.carry.pos.set(-10, 0, 43);
			chopper.carry = null;
			chopper.timer = 0;
			mission.chopperMoves++;
			if (!attract)
				radio(
					"The news chopper has moved a bridge section to the south-bank plaza. A helpful scoop. Probably.",
					5,
				);
		}
	} else if (chopper.timer > 40 && gameplay) {
		const e = entities.find(
			(e) => e.type === "girder" && !e.done && !e.carrier,
		);
		if (e) {
			e.carrier = chopper;
			chopper.carry = e;
			chopper.timer = 0;
		} else chopper.timer = 0;
	}
	physics.timestep = dt;
	physics.step();
	players.forEach((p) => {
		const t = p.body.translation();
		p.pos.set(t.x, t.y - 1.85, t.z);
		p.model.group.position.copy(p.pos);
		if (p.carry) {
			p.carry.pos
				.copy(p.pos)
				.add(new THREE.Vector3(0, p.carry.type === "girder" ? -1.3 : 1.2, 0));
		}
		p.ring.position.set(p.pos.x, 0.18, p.pos.z);
	});
	entities.forEach((e) => {
		e.group.visible = !e.done;
		e.ring.visible = !e.done && !e.carrier && showMarkers;
		e.group.position.copy(e.pos);
		e.body.setNextKinematicTranslation(e.pos);
	});
	checkProgress();
}
function attractInput(dt) {
	demoClock += dt;
	const p = players[0];
	p.power = 100;
	p.weak = false;
	if (demoClock > 100 || mission.won) {
		resetMission();
		demoClock = 0;
		return {};
	}
	let target = nextTarget(p);
	if (mission.phase === "active" && !p.carry && mission.pickups % 3 === 1) {
		const citizen = entities.find(
			(e) => e.type === "citizen" && !e.done && !e.carrier,
		);
		if (citizen) target = { position: citizen.pos, label: "CITIZEN" };
	}
	let input = { x: 0, z: 0, up: false, boost: true };
	if (mission.phase === "reporter") {
		teleport(p, vec(placement.booth), 0);
		interact(p);
		return input;
	}
	if (mission.phase === "return") {
		target = { position: vec(placement.booth) };
	}
	if (mission.phase === "file") {
		teleport(p, vec(placement.newsroom), 0);
		interact(p);
		return input;
	}
	const d = dist(p.pos, target.position);
	if (d < 10) {
		if (p.carry) deliver(p);
		else if (mission.phase === "return") {
			teleport(p, target.position, 0);
			interact(p);
		} else {
			teleport(p, target.position, 9);
			interact(p);
		}
	} else {
		const dx = target.position.x - p.pos.x,
			dz = target.position.z - p.pos.z;
		input.x = dx / d;
		input.z = dz / d;
		input.up = p.pos.y < 17;
	}
	if (Math.floor(demoClock) % 8 === 0 && p.scanCooldown === 0)
		input.scan = true;
	return input;
}
function snapshot() {
	return {
		sequence: ++networkStateSequence,
		scan,
		mission: { ...mission },
		players: players.map((p) => ({
			pos: p.pos.toArray(),
			velocity: p.velocity.toArray(),
			power: p.power,
			reporter: p.reporter,
			weak: p.weak,
			flying: p.flying,
			facing: p.facing,
			scanCooldown: p.scanCooldown,
			carry: p.carry ? entities.indexOf(p.carry) : -1,
		})),
		entities: entities.map((e) => ({
			pos: e.pos.toArray(),
			done: e.done,
			carrier:
				e.carrier === chopper
					? -2
					: e.carrier
						? players.indexOf(e.carrier)
						: -1,
		})),
		satellites: satellites.map((s) => s.pos.toArray()),
		chopper: chopper.group.position.toArray(),
	};
}
function applySnapshot(s) {
	if (
		!s?.mission ||
		!ready ||
		!Number.isFinite(s.sequence) ||
		s.sequence <= lastNetworkSnapshot
	)
		return;
	lastNetworkSnapshot = s.sequence;
	const before = mission,
		won = before?.won;
	mission = s.mission;
	scan = s.scan || 0;
	if (before) {
		if (before.phase === "reporter" && mission.phase === "active")
			audio.sfx("transform");
		if (mission.pickups > before.pickups) audio.sfx("pickup");
		if (
			mission.arrested.filter(Boolean).length +
				mission.built.filter(Boolean).length >
			before.arrested.filter(Boolean).length +
				before.built.filter(Boolean).length
		)
			audio.sfx("deliver");
		if (mission.scans > before.scans) audio.sfx("scan");
		if (mission.healCount > before.healCount) audio.sfx("heal");
	}
	s.players.forEach((v, i) => {
		const p = players[i];
		p.pos.fromArray(v.pos);
		if (v.velocity) p.velocity.fromArray(v.velocity);
		Object.assign(p, {
			power: v.power,
			reporter: v.reporter,
			weak: v.weak,
			flying: v.flying,
			facing: v.facing,
			scanCooldown: v.scanCooldown || 0,
		});
		p.ring.position.set(p.pos.x, 0.18, p.pos.z);
		p.carry = v.carry >= 0 ? entities[v.carry] : null;
		p.model.group.position.copy(p.pos);
		p.model.group.rotation.y = p.facing;
		p.model.group.visible = playerActive(i);
	});
	s.entities.forEach((v, i) => {
		const e = entities[i];
		e.pos.fromArray(v.pos);
		e.done = v.done;
		e.carrier =
			v.carrier === -2 ? chopper : v.carrier >= 0 ? players[v.carrier] : null;
		e.group.position.copy(e.pos);
		e.group.visible = !e.done;
		e.ring.position.copy(e.pos);
		e.ring.position.y = 0.18;
		e.ring.visible = !e.done && !e.carrier;
	});
	world.bridgeSlots.forEach((g, i) => (g.visible = mission.built[i]));
	s.satellites.forEach((v, i) => satellites[i].group.position.fromArray(v));
	chopper.group.position.fromArray(s.chopper);
	if (mission.won && !won && !link.hubActive) showWin();
}
function contextText(p) {
	if (!p) return "";
	if (
		mission.phase === "file" &&
		landmarkNear(p, "newsroom", 13) &&
		p.pos.y < 7
	)
		return "FILE THE STORY";
	if (landmarkNear(p, "booth", 9) && p.pos.y < 7)
		return mission.phase === "return"
			? "CHANGE TO REPORTER"
			: mission.phase === "reporter"
				? "BECOME THE HERO"
				: "PHONE BOOTH";
	if (p.carry)
		return (
			"SET DOWN " +
			(p.carry.type === "girder"
				? "BRIDGE SECTION"
				: p.carry.type === "citizen"
					? "CITIZEN"
					: "CROOK")
		);
	if (landmarkNear(p, "reporter", 10) && p.pos.y < 16)
		return "TALK TO MINA · RECHARGE";
	if (
		p.pos.y < 5 &&
		(landmarkNear(p, "subwayWest", 8) || landmarkNear(p, "subwayEast", 8))
	)
		return "RIDE THE SUBWAY";
	const e = nearest(p);
	if (e && !p.reporter && !p.weak)
		return e.type === "girder"
			? "LIFT BRIDGE SECTION"
			: e.type === "citizen"
				? "RESCUE CITIZEN"
				: e.type === "mastermind"
					? "CAPTURE MR. MINUS"
					: "CAPTURE CROOK";
	return "";
}
function updateHUD() {
	if (!mission) return;
	const p = me();
	$("#clock").textContent = fmt(mission.time);
	$("#bridges").textContent = mission.built
		.map((b) => (b ? "■" : "▱"))
		.join(" ");
	$("#crooks").textContent = mission.arrested
		.map((b) => (b ? "○" : "●"))
		.join(" ");
	$("#power").style.width = p.power + "%";
	$("#power").style.background = p.weak
		? "#db4f3b"
		: p.power < 30
			? "#c18a20"
			: "#087d83";
	$("#powerLabel").textContent = p.weak
		? "FIND MINA"
		: p.reporter
			? "CIVILIAN EDITION"
			: "SOLAR POWER";
	$("#objective").textContent = p.weak
		? "Mina can restore your powers"
		: mission.phase === "reporter"
			? "Find the red phone booth"
			: mission.phase === "active"
				? p.carry
					? nextTarget().label
					: "Rebuild the bridge. Bring in the gang."
				: mission.phase === "return"
					? "Back to the booth. The story awaits."
					: mission.phase === "file"
						? "File your story at the Daily Dispatch"
						: "A SUPER MORNING!";
	$("#flightLabel").textContent = p.reporter
		? "REPORTER"
		: p.weak
			? "POWER DRAINED"
			: p.flying
				? p.carry
					? "SPECIAL DELIVERY"
					: localInput.boost
						? "UP, UP & AWAY!"
						: "IN FLIGHT"
				: "ON FOOT";
	$("#altitude").textContent =
		`${Math.max(0, Math.round(p.pos.y))} M  /  ${p.carry ? (p.carry.type === "girder" ? "BRIDGE SECTION" : p.carry.type === "citizen" ? "CITIZEN" : "CROOK") : "HANDS FREE"}`;
	const text = contextText(p);
	$("#context").hidden = !text || screen !== "play" || attract;
	$("#context").innerHTML = glyph("interact") + text;
	$("#controls").innerHTML =
		`<span>${glyph("fly")} FLY</span><span>${glyph("down")} LAND</span><span>${glyph("scan")} X-RAY</span><span>${glyph("boost")} BOOST</span>`;
	$("#touchInteract").textContent = text
		? text.startsWith("LIFT")
			? "LIFT"
			: text.startsWith("CAPTURE")
				? "GRAB"
				: text.startsWith("RIDE")
					? "RIDE"
					: text.startsWith("FILE")
						? "FILE"
						: "USE"
		: "SCAN";
	drawMap();
}
function updateBeacon() {
	const element = $("#targetPointer");
	element.hidden = screen !== "play" || attract || !showMarkers || mission?.won;
	if (element.hidden) return;
	const t = nextTarget(),
		projected = t.position
			.clone()
			.add(new THREE.Vector3(0, 5, 0))
			.project(camera);
	const sx = (projected.x * 0.5 + 0.5) * innerWidth,
		sy = (-projected.y * 0.5 + 0.5) * innerHeight;
	const off =
		sx < 80 || sx > innerWidth - 100 || sy < 155 || sy > innerHeight - 165;
	const x = clamp(sx, 90, innerWidth - 115),
		y = clamp(sy, 170, innerHeight - 170);
	element.style.left = x + "px";
	element.style.top = y + "px";
	element.innerHTML =
		(off ? "➤" : "◆") +
		"<span>" +
		t.label +
		" · " +
		Math.round(dist(me().pos, t.position)) +
		" M</span>";
	if (off) {
		const angle = Math.atan2(sy - innerHeight / 2, sx - innerWidth / 2);
		element.style.setProperty("--angle", angle + "rad");
	}
	element.classList.toggle("offscreen", off);
}
function drawMap() {
	const c = $("#map").getContext("2d"),
		w = 240,
		h = 180;
	c.clearRect(0, 0, w, h);
	c.fillStyle = "#eddfbd";
	c.fillRect(0, 0, w, h);
	const xy = (v) => [((v.x + 105) / 210) * w, ((v.z + 100) / 200) * h];
	c.fillStyle = "#5ba6a3";
	c.fillRect(0, (114 / 200) * h, w, (20 / 200) * h);
	c.strokeStyle = "#fff8df";
	c.lineWidth = 5;
	for (const z of [0, 42]) {
		const y = ((z + 100) / 200) * h;
		c.beginPath();
		c.moveTo(0, y);
		c.lineTo(w, y);
		c.stroke();
	}
	c.beginPath();
	c.moveTo(w / 2, 0);
	c.lineTo(w / 2, h);
	c.stroke();
	c.fillStyle = "#a99b7a";
	for (const b of world.colliders) {
		const [x, y] = xy(b);
		c.fillRect(
			x - (b.w / 420) * w,
			y - (b.d / 400) * h,
			(b.w / 210) * w,
			(b.d / 200) * h,
		);
	}
	for (const [key, color] of [
		["booth", "#db4f3b"],
		["jail", "#243645"],
		["newsroom", "#087d83"],
		["reporter", "#0c9295"],
	]) {
		const [x, y] = xy(vec(placement[key]));
		c.fillStyle = color;
		c.fillRect(x - 3, y - 3, 6, 6);
	}
	entities.forEach((e) => {
		if (e.done || e.carrier) return;
		const [x, y] = xy(e.pos);
		c.fillStyle =
			e.type === "girder"
				? "#e6a722"
				: e.type === "citizen"
					? "#36aaa7"
					: "#df5140";
		c.beginPath();
		c.arc(x, y, scan > 0 ? 4.5 : 3, 0, Math.PI * 2);
		c.fill();
	});
	players.forEach((p, i) => {
		if (!p.model.group.visible) return;
		const [x, y] = xy(p.pos);
		c.save();
		c.translate(x, y);
		c.rotate(-p.facing);
		c.fillStyle = i ? "#169a91" : "#fff8de";
		c.strokeStyle = "#172b37";
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(0, -7);
		c.lineTo(5, 5);
		c.lineTo(0, 3);
		c.lineTo(-5, 5);
		c.closePath();
		c.fill();
		c.stroke();
		c.restore();
	});
}
function pollInputs(dt) {
	let pad = null;
	try {
		pad = [...navigator.getGamepads()].find((p) => p && p.connected);
	} catch {}
	if (pad) {
		const b = pad.buttons.map((x) => x.pressed),
			axis = pad.axes.map((x) => (Math.abs(x) > 0.16 ? x : 0));
		const active =
			b.some((v, i) => v && !padPrevious[i]) ||
			axis.some((v) => Math.abs(v) > 0.2);
		if (active) {
			if (inputActivity("gamepad")) {
				padPrevious = b;
				return;
			}
		}
		if (b[9] && !b[8] && !padPrevious[9]) {
			if (screen === "play") showPause();
			else if (screen === "pause") setScreen("play");
		}
		if (screen !== "play" && !attract) {
			if (
				(b[13] && !padPrevious[13]) ||
				(axis[1] > 0.5 && !(padPrevious.axisY > 0.5))
			)
				focusMenu(focused + 1);
			if (
				(b[12] && !padPrevious[12]) ||
				(axis[1] < -0.5 && !(padPrevious.axisY < -0.5))
			)
				focusMenu(focused - 1);
			const el = menuButtons()[focused];
			const horizontal =
				(b[15] && !padPrevious[15] ? 1 : 0) -
				(b[14] && !padPrevious[14] ? 1 : 0);
			if (el?.type === "range") {
				let progress = rangeProgress.get(el) || 0;
				if (Math.abs(axis[0]) > 0.5) progress += Math.sign(axis[0]) * dt * 7;
				else progress = 0;
				const steps =
					horizontal + (Math.abs(progress) >= 1 ? Math.trunc(progress) : 0);
				if (steps) {
					progress -= Math.trunc(progress);
					el.value = clamp(
						+el.value + steps * Number(el.step || 0.1),
						+el.min,
						+el.max,
					);
					el.dispatchEvent(new Event("input"));
				}
				rangeProgress.set(el, progress);
			}
			if (el?.tagName === "SELECT") {
				const step =
					horizontal +
					(axis[0] > 0.5 && !(padPrevious.axisX > 0.5) ? 1 : 0) -
					(axis[0] < -0.5 && !(padPrevious.axisX < -0.5) ? 1 : 0);
				if (step) {
					el.selectedIndex =
						(el.selectedIndex + step + el.options.length) % el.options.length;
					el.dispatchEvent(new Event("change"));
				}
			}
			if (b[0] && !padPrevious[0]) {
				if (el?.type === "checkbox") {
					el.checked = !el.checked;
					el.dispatchEvent(new Event("change"));
				} else el?.click();
			}
			if (b[1] && !padPrevious[1]) $("#back")?.click();
		} else {
			localInput.x = axis[0] || 0;
			localInput.z = axis[1] || 0;
			localInput.up = !!b[0];
			localInput.down = !!b[1];
			localInput.boost = !!b[7];
			localInput.interact = !!b[2] && !padPrevious[2];
			localInput.scan = !!b[3] && !padPrevious[3];
			if ([12, 13, 14, 15].some((i) => b[i] && !padPrevious[i])) {
				const t = nextTarget();
				toast(
					t.label + " · " + Math.round(dist(me().pos, t.position)) + " M",
					2,
				);
			}
			cameraYaw -= (axis[2] || 0) * dt * 1.3;
			cameraZoom = clamp(cameraZoom + (axis[3] || 0) * dt * 0.4, 0.65, 1.6);
		}
		padPrevious = b;
		padPrevious.axisY = axis[1];
		padPrevious.axisX = axis[0];
	}
	if (!pad || lastInput !== "gamepad") {
		localInput.x =
			(held.has("KeyD") || held.has("ArrowRight") ? 1 : 0) -
			(held.has("KeyA") || held.has("ArrowLeft") ? 1 : 0);
		localInput.z =
			(held.has("KeyS") || held.has("ArrowDown") ? 1 : 0) -
			(held.has("KeyW") || held.has("ArrowUp") ? 1 : 0);
		localInput.up = held.has("Space");
		localInput.down = held.has("ControlLeft") || held.has("ControlRight");
		localInput.boost = held.has("ShiftLeft") || held.has("ShiftRight");
		localInput.interact = actions.has("interact");
		localInput.scan = actions.has("scan");
	}
	for (const t of touches.values()) {
		if (t.side === "left") {
			localInput.x = clamp((t.x - t.sx) / 65, -1, 1);
			localInput.z = clamp((t.y - t.sy) / 65, -1, 1);
			localInput.boost = Math.hypot(t.x - t.sx, t.y - t.sy) > 80;
		} else {
			localInput.up = t.y - t.sy < -12;
			localInput.down = t.y - t.sy > 15;
		}
	}
	const length = Math.hypot(localInput.x, localInput.z);
	if (length > 1) {
		localInput.x /= length;
		localInput.z /= length;
	}
	const x = localInput.x,
		z = localInput.z;
	localInput.x = x * Math.cos(cameraYaw) + z * Math.sin(cameraYaw);
	localInput.z = z * Math.cos(cameraYaw) - x * Math.sin(cameraYaw);
	actions.clear();
}
function animate(time) {
	requestAnimationFrame(animate);
	if (!ready) return;
	const elapsed = Math.max(0, (time - lastTime) / 1000 || 1 / 60),
		dt = clamp(elapsed, 0, 0.05);
	lastTime = time;
	clockTime += dt;
	if (!networkEnded && !link.server) pollInputs(dt);
	const gameInput =
		screen === "play" && !networkEnded && !link.server ? localInput : {};
	if (screen === "title") {
		idle += elapsed;
		if (idle >= 10) {
			startGame(true);
		}
	}
	if (toastTimer > 0 && (toastTimer -= dt) <= 0) $("#toast").hidden = true;
	if (radioTimer > 0 && (radioTimer -= dt) <= 0) $("#radio").hidden = true;
	scan = Math.max(0, scan - dt);
	const running =
		isRunning() && (!link.hubActive || link.time() >= 0) && !networkEnded;
	if (running && authoritative()) {
		simAccumulator += dt * config.timeScale;
		let first = true;
		while (simAccumulator >= 1 / 60) {
			simulate(
				1 / 60,
				first ? gameInput : { ...gameInput, interact: false, scan: false },
			);
			first = false;
			simAccumulator -= 1 / 60;
		}
		if (first) {
			if (gameInput.interact) actions.add("interact");
			if (gameInput.scan) actions.add("scan");
		}
	}
	networkTimer += dt;
	if (link.connected && running) {
		if (!link.isHost) {
			pendingNetworkActions.interact ||= !!gameInput.interact;
			pendingNetworkActions.scan ||= !!gameInput.scan;
		}
		if (networkTimer >= 1 / 15) {
			networkTimer = 0;
			if (link.isHost) link.send("state", snapshot(), { reliable: false });
			else {
				const input = {
					...gameInput,
					...pendingNetworkActions,
					seq: ++networkInputSequence,
				};
				if (link.send("input", input, { reliable: true }))
					pendingNetworkActions.interact = pendingNetworkActions.scan = false;
			}
		}
	}
	world.update(dt, clockTime);
	players.forEach((p, i) => {
		p.model.update(dt, {
			flying: p.flying,
			moving: p.velocity.length() > 1,
			carrying: !!p.carry,
			reporter: p.reporter,
			weak: p.weak,
		});
		p.ring.visible = screen !== "title" && p.model.group.visible;
		p.ring.scale.setScalar(1 + Math.sin(clockTime * 3) * 0.05);
	});
	entities.forEach((e) => {
		e.ring.rotation.y = clockTime * 0.2;
		e.ring.scale.setScalar(1 + Math.sin(clockTime * 3 + e.phase) * 0.06);
		if (!e.carrier && !e.done)
			e.group.position.y =
				e.pos.y +
				(e.type === "girder"
					? 0.25 + Math.sin(clockTime * 2 + e.phase) * 0.25
					: 0);
	});
	effects = effects.filter((e) => {
		e.time += dt;
		const r = e.time / e.life;
		if (r >= 1) {
			scene.remove(e.mesh);
			e.mesh.geometry?.dispose();
			if (!e.ring) e.mesh.material.dispose();
			return false;
		}
		if (e.ring) {
			e.mesh.scale.setScalar(1 + r * 40);
			e.mesh.position.y += dt * 0.5;
		} else {
			e.velocity.y -= dt * 18;
			e.mesh.position.addScaledVector(e.velocity, dt);
			e.mesh.rotation.x += dt * 3;
			e.mesh.scale.setScalar(1 - r);
		}
		return true;
	});
	updateCamera(dt);
	audio.update(dt, {
		speed: me().velocity.length(),
		flying: me().flying && running,
		danger: me().power < 35,
	});
	hudTimer += dt;
	if (hudTimer > 0.08) {
		hudTimer = 0;
		updateHUD();
		updateBeacon();
	}
	if (!graphicsRecovering) {
		try {
			renderer.render(scene, camera);
			renderedFrames++;
		} catch (error) {
			if (renderer.backend?.isWebGPUBackend) recoverGraphics(error.message);
			else console.error(error);
		}
	}
}
function updateCamera(dt) {
	const p = me();
	if (screen === "title") {
		const desired = new THREE.Vector3(76, 76, 105);
		camera.position.lerp(desired, 1 - Math.exp(-dt * 2));
		camera.lookAt(3, 5, 5);
		camera.zoom = THREE.MathUtils.damp(camera.zoom, 0.91, 3, dt);
		camera.updateProjectionMatrix();
		return;
	}
	const target = p.pos.clone().add(new THREE.Vector3(0, 2, 0));
	const offset = new THREE.Vector3(
		Math.sin(cameraYaw) * 56,
		51,
		Math.cos(cameraYaw) * 56,
	).multiplyScalar(cameraZoom);
	const desired = target.clone().add(offset);
	camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
	camera.lookAt(target);
	camera.zoom = THREE.MathUtils.damp(camera.zoom, 1.25 / cameraZoom, 4, dt);
	camera.updateProjectionMatrix();
}
function bindCanvasEvents() {
	$("#game").addEventListener("contextmenu", (e) => e.preventDefault());
	$("#game").addEventListener(
		"wheel",
		(e) => {
			inputActivity("keyboard");
			cameraZoom = clamp(cameraZoom + e.deltaY * 0.001, 0.65, 1.6);
		},
		{ passive: true },
	);
	$("#game").addEventListener("pointerdown", (e) => {
		if (inputActivity(e.pointerType === "touch" ? "touch" : "keyboard")) return;
		audio.unlock();
		if (e.pointerType === "touch") {
			touchMode = true;
			touches.set(e.pointerId, {
				sx: e.clientX,
				sy: e.clientY,
				x: e.clientX,
				y: e.clientY,
				side: e.clientX < innerWidth / 2 ? "left" : "right",
			});
			$("#game").setPointerCapture(e.pointerId);
			if (screen === "play") {
				$("#touchAction").hidden = false;
				$("#touchHint").hidden = false;
			}
		} else if (e.button === 2) {
			mouseDrag = { x: e.clientX, y: e.clientY };
		} else if (e.button === 0 && screen === "play") {
			pointer.set(
				(e.clientX / innerWidth) * 2 - 1,
				(-e.clientY / innerHeight) * 2 + 1,
			);
			ray.setFromCamera(pointer, camera);
			const hits = ray.intersectObjects(
				entities.filter((e) => !e.done).map((e) => e.group),
				true,
			);
			if (hits.length) {
				let g = hits[0].object;
				while (g.parent && !entities.some((e) => e.group === g)) g = g.parent;
				const ent = entities.find((e) => e.group === g);
				if (ent && dist(ent.pos, me().pos) < config.grabRadius + 1)
					actions.add("interact");
				else if (ent)
					toast(
						(ent.type === "girder" ? "BRIDGE SECTION" : "CROOK") +
							" · " +
							Math.round(dist(ent.pos, me().pos)) +
							" M",
						2,
					);
			} else if (contextText(me())) actions.add("interact");
		}
	});
}
function setupEvents() {
	document.addEventListener(
		"pointerdown",
		(e) => {
			if (e.pointerType === "touch") {
				touchMode = true;
				lastInput = "touch";
			}
		},
		{ capture: true },
	);
	window.addEventListener("keydown", (e) => {
		if (
			["INPUT", "TEXTAREA", "SELECT"].includes(
				document.activeElement?.tagName,
			) &&
			!["Escape"].includes(e.code)
		)
			return;
		if (inputActivity("keyboard")) return;
		audio.unlock();
		if (
			["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
				e.code,
			)
		)
			e.preventDefault();
		held.add(e.code);
		if (e.repeat) return;
		if (e.code === "Escape") {
			if (screen === "play") showPause();
			else if (screen === "pause") setScreen("play");
			else $("#back")?.click();
		}
		if (screen === "play") {
			if (e.code === "KeyE") actions.add("interact");
			if (e.code === "KeyQ") actions.add("scan");
			if (e.code === "KeyM") {
				const t = nextTarget();
				toast(
					t.label + " · " + Math.round(dist(me().pos, t.position)) + " M",
					3,
				);
			}
		} else {
			if (e.code === "ArrowDown") focusMenu(focused + 1);
			if (e.code === "ArrowUp") focusMenu(focused - 1);
			if (e.code === "Enter") menuButtons()[focused]?.click();
		}
	});
	window.addEventListener("keyup", (e) => held.delete(e.code));
	window.addEventListener("blur", () => {
		held.clear();
		if (screen === "play" && !attract && !link.connected && !link.hubActive)
			showPause();
	});
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch") return;
		if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)
			inputActivity("keyboard");
		if (mouseDrag) {
			cameraYaw -= (e.clientX - mouseDrag.x) * 0.008;
			mouseDrag = { x: e.clientX, y: e.clientY };
		}
		if (e.target.tagName === "BUTTON") {
			const b = menuButtons(),
				i = b.indexOf(e.target);
			if (i >= 0 && focused !== i) focusMenu(i);
		}
	});
	bindCanvasEvents();
	window.addEventListener("pointermove", (e) => {
		const t = touches.get(e.pointerId);
		if (t) {
			t.x = e.clientX;
			t.y = e.clientY;
		}
	});
	window.addEventListener("pointerup", (e) => {
		touches.delete(e.pointerId);
		mouseDrag = null;
	});
	$("#pauseBtn").onclick = showPause;
	$("#touchInteract").onclick = () => {
		inputActivity("touch");
		if (contextText(me())) actions.add("interact");
		else actions.add("scan");
	};
	$("#touchFly").addEventListener("pointerdown", (e) => {
		e.preventDefault();
		held.add("Space");
	});
	$("#touchFly").addEventListener("pointerup", () => held.delete("Space"));
	window.addEventListener("resize", resize);
	document.addEventListener("click", (e) => {
		if (e.target.closest("button")) {
			inputActivity(lastInput);
			audio.unlock();
			audio.sfx("click");
		}
	});
}
function resize() {
	const aspect = innerWidth / innerHeight,
		span = 42;
	camera.left = -span * aspect;
	camera.right = span * aspect;
	camera.top = span;
	camera.bottom = -span;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
}
function configureRenderer(r) {
	r.setPixelRatio(Math.min(devicePixelRatio, 2));
	r.setSize(innerWidth, innerHeight);
	r.shadowMap.enabled = true;
	r.shadowMap.type = THREE.PCFSoftShadowMap;
	r.toneMapping = THREE.ACESFilmicToneMapping;
	r.toneMappingExposure = 1.3;
}
function monitorGraphics(r) {
	if (r.backend?.isWebGPUBackend && r.backend.device?.lost)
		r.backend.device.lost.then((info) => {
			if (renderer === r && !graphicsRecovering)
				recoverGraphics(info.message || info.reason || "device lost");
		});
}
async function recoverGraphics(reason) {
	if (graphicsRecovering || !ready) return;
	graphicsRecovering = true;
	graphicsError = String(reason);
	graphicsRecoveries++;
	touches.clear();
	const previous = renderer;
	try {
		const canvas = document.createElement("canvas");
		canvas.id = "game";
		canvas.setAttribute("aria-label", "Super Delivery city");
		$("#game").replaceWith(canvas);
		try {
			previous.dispose();
		} catch {}
		renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			forceWebGL: true,
		});
		configureRenderer(renderer);
		await renderer.init();
		bindCanvasEvents();
		resize();
		toast("THE CITY IS BACK ON THE AIR", 3);
	} catch (error) {
		console.error("Graphics recovery failed", error);
		$("#loading").hidden = false;
		$("#loadText").textContent =
			"Please reload to reopen the city. " + error.message;
	} finally {
		graphicsRecovering = false;
	}
}
async function init() {
	try {
		await RAPIER.init();
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xf3d3a0);
		scene.fog = new THREE.Fog(0xf3d3a0, 140, 340);
		camera = new THREE.OrthographicCamera(-70, 70, 42, -42, 0.1, 650);
		camera.position.set(76, 76, 105);
		camera.lookAt(3, 5, 5);
		renderer = new THREE.WebGPURenderer({
			canvas: $("#game"),
			antialias: true,
			alpha: false,
		});
		configureRenderer(renderer);
		await renderer.init();
		monitorGraphics(renderer);
		const hemi = new THREE.HemisphereLight(0xffedce, 0x4c7c80, 2.5);
		scene.add(hemi);
		const sun = new THREE.DirectionalLight(0xffedd0, 3.2);
		sun.position.set(-50, 100, 55);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -140;
		sun.shadow.camera.right = 140;
		sun.shadow.camera.top = 140;
		sun.shadow.camera.bottom = -140;
		sun.shadow.camera.far = 300;
		sun.shadow.bias = -0.001;
		sun.shadow.normalBias = 0.2;
		scene.add(sun);
		world = createWorld(scene);
		createPhysics();
		players = [createPlayer(0), createPlayer(1)];
		crookStarts.forEach((p, i) =>
			addEntity(i === 5 ? "mastermind" : "crook", i, p),
		);
		girderStarts.forEach((p, i) => addEntity("girder", i, p));
		[
			[-38, 0, 43],
			[18, 0, -76],
		].forEach((p, i) => addEntity("citizen", i, p));
		for (let i = 0; i < 3; i++) {
			const group = createEntity("satellite", i);
			scene.add(group);
			satellites.push({
				group,
				pos: new THREE.Vector3(20 + i * 18, 12, -16 - i * 5),
				cooldown: 0,
			});
		}
		const cg = createEntity("helicopter");
		scene.add(cg);
		chopper = { group: cg, timer: 0, carry: null };
		ready = true;
		resetMission();
		setupEvents();
		resize();
		$("#loading").hidden = true;
		const hubConnection = link.connectHub();
		if (globalThis.AIHub?.active) setScreen("play");
		else showTitle();
		const info = await hubConnection;
		if (info) {
			hubStarted = false;
			setScreen("play");
			toast("WAITING FOR THE CITY DESK…", 20);
			link.ready();
		} else if (screen !== "title") showTitle();
		requestAnimationFrame(animate);
		window.__gameReady = true;
	} catch (e) {
		console.error(e);
		if (globalThis.AIHub?.active) AIHub.fail(e.message);
		$("#loadText").textContent = "The city could not open: " + e.message;
		$("#loading").insertAdjacentHTML(
			"beforeend",
			"<p>Please use a WebGPU-capable browser on file:// or localhost.</p>",
		);
		window.__bootError = e.message;
	}
}
window.__game = {
	get ready() {
		return ready;
	},
	get screen() {
		return screen;
	},
	get state() {
		return mission;
	},
	get player() {
		const p = me();
		return p
			? {
					pos: p.pos.toArray(),
					power: p.power,
					reporter: p.reporter,
					weak: p.weak,
					flying: p.flying,
					carrying: p.carry?.type,
				}
			: null;
	},
	get engine() {
		return {
			three: THREE.REVISION,
			rapier: RAPIER.version(),
			webgpu: !!renderer?.backend?.isWebGPUBackend,
			requested: graphicsRequested,
			recovering: graphicsRecovering,
			recoveries: graphicsRecoveries,
			lastDeviceLoss: graphicsError,
			frames: renderedFrames,
			drawCalls: renderer?.info?.render?.drawCalls || 0,
			triangles: renderer?.info?.render?.triangles || 0,
			bodies: physics?.bodies.len(),
			colliders: physics?.colliders.len(),
		};
	},
	get camera() {
		return { zoom: camera?.zoom, orbit: cameraYaw, distance: cameraZoom };
	},
	loseDevice: () => renderer?.backend?.device?.destroy(),
	get network() {
		return {
			connected: link.connected,
			hubActive: link.hubActive,
			isHost: link.isHost,
			players: activeCount(),
		};
	},
	get audio() {
		return audio.stats();
	},
	get settings() {
		return { ...prefs };
	},
	get config() {
		return { ...config };
	},
	start: () => startGame(),
	pause: showPause,
	title: showTitle,
	teleport: (x, z, y = 0, i = localIndex()) =>
		teleport(players[i], new THREE.Vector3(x, y, z), y),
	interact: (i = localIndex()) => interact(players[i]),
	scan: () => pulse(me()),
	target: () => {
		const t = nextTarget();
		return { label: t.label, pos: t.position.toArray() };
	},
	entities: () =>
		entities.map((e) => ({
			type: e.type,
			index: e.index,
			pos: e.pos.toArray(),
			done: e.done,
			carried: !!e.carrier,
		})),
	tick: (n = 60) => {
		for (let i = 0; i < n; i++) simulate(1 / 60, {});
	},
	setPower: (v) => {
		me().power = v;
	},
	setConfig: (k, v) => (config[k] = v),
	damage: (seconds = 5) => damage(me(), seconds),
	attract: () => startGame(true),
	snapshot,
};
init();
