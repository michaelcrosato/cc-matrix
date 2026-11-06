import * as THREE from "three";
import RAPIER from "https://esm.sh/@dimforge/rapier3d-compat@0.19.3";
import { buildWorld } from "./scene.js";
import { createAudio, renderAudioTest } from "./audio.js";
import { createOnline } from "./online.js";

const $ = (id) => document.getElementById(id),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TITLE = "Raiders of the Lost Fortune";
const DEFAULTS = {
	speed: 5.2,
	whipRange: 3.5,
	enemySpeed: 1.6,
	trapTempo: 1,
	boulderSpeed: 4.8,
	damage: 1,
	cameraZoom: 1,
};
const tuning = { ...DEFAULTS };
const prefs = {
	music: 0.1,
	sound: 0.68,
	glyphs: "playstation",
	shake: 0.65,
	assist: false,
};
try {
	Object.assign(
		prefs,
		JSON.parse(localStorage.getItem("fortune-settings") || "{}"),
	);
} catch {}
const audio = createAudio();
audio.setMusic(prefs.music);
audio.setSfx(prefs.sound);
const input = {
	x: 0,
	z: 0,
	aimX: 0,
	aimZ: 1,
	attack: false,
	jump: false,
	roll: false,
	use: false,
	sprint: false,
	seq: 0,
};
const keys = new Set(),
	pointer = new THREE.Vector2(),
	ray = new THREE.Raycaster(),
	ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let lastDevice = "keyboard",
	touch = false,
	padPrevious = [],
	lastMenuAxis = 0,
	lastActivity = performance.now(),
	screen = "loading",
	previousScreen = "menu",
	focusIndex = 0,
	booted = false,
	world,
	renderer,
	camera,
	scene,
	physics,
	controller,
	frameTime = 0,
	simTime = 0,
	accum = 0,
	hudTime = 0,
	shake = 0,
	cameraZ = 3,
	mouseActive = false,
	mouseWorld = new THREE.Vector3(0, 0, 0),
	toastTimer = 0;
let barkTime = 0,
	chapterTime = 0,
	attract = false,
	attractTime = 0,
	attractStage = 0,
	god = false,
	remoteInputs = new Map(),
	remoteSeq = new Map(),
	pendingSnapshot = null,
	netSequence = 0,
	seatIds = [],
	screenBeforeSettings = "menu";
const state = {
	phase: "courtyard",
	running: false,
	won: false,
	dead: false,
	time: 0,
	score: 0,
	kills: 0,
	treasures: 0,
	puzzle: [2, 0, 1],
	solved: false,
	relic: false,
	checkpoint: "courtyard",
	gate: 0,
	boulderZ: -42,
	trapHits: 0,
	rolls: 0,
	whips: 0,
	jumps: 0,
	swings: 0,
	revives: 0,
	damageTaken: 0,
	chapter: 0,
};
let actors = [];
const effects = [],
	trapTiles = [],
	attackVisuals = [];
const metadata = {
	date: "2026-11-05 22:21:01",
	source: "Raiders of the Lost Ark (1982)",
	plan: "none",
	genre: "Action-adventure; combat, environmental puzzles and escape",
	perspective: "Cinematic overhead third-person, following orthographic camera",
	tech: "Three.js r180; WebGPURenderer (WebGPU with engine fallback); Rapier 0.19.3; Gamepad API; Web Audio; AI Hub Session Protocol v1/client 1.4.0; PeerJS 1.5.5",
	artDirection:
		"Procedural cel and ink look: faceted sandstone, jade shadows, silhouette outlines and gold accents",
	animation:
		"Three.js AnimationMixer and authored AnimationClips; procedural whip, dodge, grapple and boulder animation",
	audio:
		"Original synthesized adventure score (10% default), procedural effects and Animalese-style gibberish voices; no audio files",
	online:
		"1–2 player host-authoritative co-op: AI Hub shared-world sessions, standalone WebRTC rooms, same-origin BroadcastChannel",
	testing:
		"Headless scripted playthrough, keyboard/gamepad/touch, physics, audio, multiplayer and AI Hub harness; screenshots for visual inspection",
	research:
		"none; native model knowledge. Downloaded the specified AI Hub integration files and runtime dependencies.",
	environment: "Codex CLI (headless); Linux",
	model: "OpenAI, gpt-6.1-sol, reasoning effort ultra",
	usage: "added on import",
};
// Filled by the build from the verified exit interview.
const feedback = /*FEEDBACK*/ {};

const online = createOnline({
	onStart() {
		seatIds = online.players.map((p) => p.id);
		if (booted) {
			startGame(false);
			if (online.hub) toast("Expedition connected · recover the idol together");
		}
	},
	onInput(v, id) {
		if (!v || typeof v !== "object") return;
		const prev = remoteInputs.get(id) || {};
		const seq = Number(v.seq) || 0;
		remoteInputs.set(id, {
			x: clamp(Number(v.x) || 0, -1, 1),
			z: clamp(Number(v.z) || 0, -1, 1),
			aimX: clamp(Number(v.aimX) || 0, -1, 1),
			aimZ: clamp(Number(v.aimZ) || 1, -1, 1),
			sprint: !!v.sprint,
			attack: !!v.attack,
			jump: !!v.jump,
			roll: !!v.roll,
			use: !!v.use,
			seq,
			received: performance.now(),
		});
		if (prev.seq > seq) remoteInputs.set(id, prev);
	},
	onState(s) {
		if (booted && s && Array.isArray(s.actors)) pendingSnapshot = s;
	},
	onStatus(msg) {
		const el = $("online-status");
		if (el) el.textContent = msg;
		if (screen === "coop" && online.room) {
			const code = $("room-display");
			if (code) code.textContent = online.room;
		}
	},
	onEnd(reason) {
		state.running = false;
		audio.suspend();
		if (booted) {
			screen = "session-end";
			showPanel(
				"Expedition ended",
				`<p>${escapeHTML(reason || "The AI Hub round has ended.")}</p><p>Your expedition result has been sent to the hub.</p>`,
			);
		}
	},
	onLeave(id) {
		if (online.role === "guest") {
			state.running = false;
			showMenu();
			toast("Your expedition partner left.");
		} else if (actors[seatIds.indexOf(id) >= 0 ? seatIds.indexOf(id) : 1]) {
			const departed =
				actors[seatIds.indexOf(id) >= 0 ? seatIds.indexOf(id) : 1];
			departed.active = false;
			departed.art.group.visible = false;
			toast("Partner disconnected · continue the expedition");
		}
	},
	getResult() {
		return resultData();
	},
	onTimeUp() {
		state.running = false;
		screen = "session-end";
		showPanel(
			"Time at the dig is up",
			`<p>The expedition clock has run out.</p><p>${state.relic ? "The idol was recovered. The exit was another matter." : "Some things stay buried. For now."}</p>`,
		);
		return resultData();
	},
});
function escapeHTML(s) {
	return String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}
function savePrefs() {
	try {
		localStorage.setItem("fortune-settings", JSON.stringify(prefs));
	} catch {}
}
function glyph(action) {
	const pc = {
		attack: "LMB",
		jump: "SPACE",
		roll: "CTRL",
		use: "E",
		pause: "ESC",
		move: "WASD",
	};
	const ps = {
		attack: "□",
		jump: "✕",
		roll: "○",
		use: "△",
		pause: "OPTIONS",
		move: "L",
	};
	const xb = {
		attack: "X",
		jump: "A",
		roll: "B",
		use: "Y",
		pause: "MENU",
		move: "L",
	};
	return lastDevice === "gamepad"
		? (prefs.glyphs === "xbox" ? xb : ps)[action]
		: pc[action];
}
function hint(action, label) {
	return `<span class="hint-item"><span class="key">${glyph(action)}</span>${label}</span>`;
}
function updatePrompts() {
	if (!$("controls-hint")) return;
	$("controls-hint").innerHTML =
		hint("attack", "Whip") +
		hint("jump", "Leap") +
		hint("roll", "Roll") +
		hint("use", "Use");
	$("interact-glyph").textContent = touch ? "TAP" : glyph("use");
}
function setDevice(d) {
	if (lastDevice !== d) {
		lastDevice = d;
		updatePrompts();
	}
	lastActivity = performance.now();
}
function toast(message, duration = 3) {
	$("toast").textContent = message;
	$("toast").hidden = false;
	toastTimer = duration;
}
function speak(text, duration = 4.3) {
	$("bark-text").textContent = text;
	$("bark").hidden = false;
	barkTime = duration;
	if (!attract) audio.say(text);
}
function chapter(title, desc) {
	$("chapter-title").textContent = title;
	$("chapter-desc").textContent = desc;
	$("chapter-card").classList.add("show");
	chapterTime = 4.2;
}
function buttons() {
	return [...$("screen").querySelectorAll("button,input,select")].filter(
		(e) => !e.disabled && e.offsetParent !== null,
	);
}
function focusMenu(i, actual = false) {
	const list = buttons();
	if (!list.length) return;
	focusIndex = (i + list.length) % list.length;
	list.forEach((e, k) => e.classList.toggle("selected", k === focusIndex));
	if (actual) list[focusIndex].focus({ preventScroll: true });
	list[focusIndex].scrollIntoView({ block: "nearest" });
}
function wireMenu() {
	focusIndex = 0;
	buttons().forEach((b, i) => {
		b.addEventListener("pointerenter", () => {
			setDevice("keyboard");
			focusMenu(i);
		});
		b.addEventListener("click", () => audio.sfx("click"));
	});
	focusMenu(0);
}
function action(label, id, primary = false) {
	return `<button id="${id}" class="action ${primary ? "primary" : ""}"><span>${label}</span><span class="arrow">↗</span></button>`;
}
function showMenu() {
	screen = "menu";
	state.running = false;
	attract = false;
	lastActivity = performance.now();
	$("hud").hidden = true;
	$("attract-banner").hidden = true;
	$("touch-action").hidden = true;
	audio.resume();
	$("screen").innerHTML =
		`<div class="menu"><div class="edition"><span>THE FINCH EXPEDITIONS</span><span class="rule"></span><span>VOL. 01</span></div><div class="title-block"><div class="kicker">FORTUNE FAVORS THE FOOLISH.</div><h1>RAIDERS<span class="small">OF THE</span><em>LOST FORTUNE</em></h1><p class="title-desc">One temple. One priceless idol.<br>Absolutely no reasonable exit strategy.</p><div class="menu-actions">${action("Begin expedition", "begin", true)}${action("Bring an accomplice", "coop")}</div><div class="menu-secondary"><button id="settings" class="text-button">Settings & controls</button><button id="about" class="text-button">About the expedition</button></div></div><div class="compass">✧</div><div class="expedition-stamp"><small>FIELD NOTES / 1936</small><p>THE TEMPLE OF THE SUN</p><span>Somewhere off the sensible route.</span></div><div class="menu-footer"><span>1–2 EXPLORERS <strong> · </strong> WHIPS, WITS & VERY BAD ODDS</span><span id="input-footer">${lastDevice === "gamepad" ? "✕ SELECT · L NAVIGATE" : "WASD / ARROWS TO NAVIGATE · ENTER TO SELECT"}</span></div></div>`;
	$("begin").onclick = () => {
		audio.unlock();
		online.leave();
		startGame();
	};
	$("coop").onclick = () => showCoop();
	$("settings").onclick = () => showSettings("menu");
	$("about").onclick = () => showAbout("menu");
	wireMenu();
}
function showPanel(title, body, back) {
	$("screen").innerHTML =
		`<div class="overlay"><div class="panel ${title.includes("About") || title.includes("Field laboratory") ? "wide" : ""}"><div class="panel-head"><div><div class="eyebrow">THE FINCH EXPEDITIONS</div><h2>${title}</h2></div>${back ? '<button id="back" class="back">Back</button>' : ""}</div>${body}</div></div>`;
	if (back) $("back").onclick = back;
	wireMenu();
}
function pause() {
	if (attract || !booted) return;
	if (screen === "playing") {
		screen = "pause";
		state.running = false;
		audio.suspend();
		showPause();
	} else if (["pause", "settings", "about", "dev"].includes(screen)) {
		resume();
	}
}
function showPause() {
	screen = "pause";
	$("touch-action").hidden = true;
	const hub = online.hub;
	showPanel(
		"A brief intermission",
		`<p>Catch your breath. The temple is in no hurry.<br><small>${online.connected ? "Co-op stays live while you consult the menu. Your partner can keep moving." : "The expedition is paused."}</small></p>${action("Return to expedition", "resume", true)}${action("Settings & controls", "pause-settings")}${action("Field laboratory · developer mode", "dev")}${action("About & credits", "pause-about")}${hub ? "" : action("Retire to title", "quit")}`,
	);
	$("resume").onclick = resume;
	$("pause-settings").onclick = () => showSettings("pause");
	$("dev").onclick = showDev;
	$("pause-about").onclick = () => showAbout("pause");
	if (!hub)
		$("quit").onclick = () => {
			online.leave();
			resetGame();
			showMenu();
		};
}
function resume() {
	screen = "playing";
	state.running = true;
	$("screen").innerHTML = "";
	audio.resume();
	updatePrompts();
}
function slider(label, key, min, max, step, value, type = "pref") {
	return `<label class="setting"><span>${label}</span><input aria-label="${label}" type="range" data-key="${key}" data-type="${type}" min="${min}" max="${max}" step="${step}" value="${value}"><output>${step < 1 ? Number(value).toFixed(2) : value}</output></label>`;
}
function showSettings(from) {
	screenBeforeSettings = from;
	screen = "settings";
	showPanel(
		"Pack your preferences",
		slider("Music volume", "music", 0, 1, 0.01, prefs.music) +
			slider("Effects & voices", "sound", 0, 1, 0.01, prefs.sound) +
			slider("Camera shake", "shake", 0, 1, 0.05, prefs.shake) +
			`<label class="setting"><span>Controller glyphs</span><select id="glyph-select" aria-label="Controller glyphs"><option value="playstation">PlayStation</option><option value="xbox">Xbox</option></select></label><button id="assist" class="action">Assisted expedition <span>${prefs.assist ? "ON" : "OFF"}</span></button><p style="font-size:15px">Assist softens enemy attacks and slows the boulder. Touch enables automatic whipping and nearby actions.</p><div class="control-grid"><div>Move <span class="key">WASD / L</span></div><div>Aim <span class="key">MOUSE / R</span></div><div>Whip <span class="key">LMB / □</span></div><div>Leap / grapple <span class="key">SPACE / ✕</span></div><div>Dodge roll <span class="key">CTRL / ○</span></div><div>Interact <span class="key">E / △</span></div><div>Sprint <span class="key">SHIFT / L3</span></div><div>Pause <span class="key">ESC / OPTIONS</span></div></div><p class="touch-note">Touch: drag anywhere on the left to move; swipe on the right to aim. Tap the contextual action. Two-finger tap to roll.</p>`,
		() => (from === "menu" ? showMenu() : showPause()),
	);
	$("glyph-select").value = prefs.glyphs;
	$("glyph-select").onchange = (e) => {
		prefs.glyphs = e.target.value;
		savePrefs();
		updatePrompts();
	};
	$("assist").onclick = () => {
		prefs.assist = !prefs.assist;
		savePrefs();
		showSettings(from);
	};
	wireSliders();
}
function wireSliders() {
	document.querySelectorAll("input[type=range]").forEach((el) => {
		el.oninput = () => {
			const key = el.dataset.key,
				value = Number(el.value);
			(el.dataset.type === "tune" ? tuning : prefs)[key] = value;
			el.nextElementSibling.textContent =
				Number(el.step) < 1 ? value.toFixed(2) : value;
			if (key === "music") audio.setMusic(value);
			if (key === "sound") audio.setSfx(value);
			savePrefs();
		};
	});
}
function showAbout(from) {
	screen = "about";
	const labels = {
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
	const credits = Object.entries(metadata)
		.map(
			([k, v]) =>
				`<div class="credit"><small>${labels[k] || k}</small><span>${escapeHTML(v)}</span></div>`,
		)
		.join("");
	let fb = "";
	for (const [k, title] of [
		["testingFeedback", "Testing Feedback"],
		["engineFeedback", "Engine Feedback"],
		["promptFeedback", "Prompt Feedback"],
	])
		fb += `<div class="feedback"><div class="eyebrow">${title}</div>${(feedback[k] || ["Validation results are included in the packaged build."]).map((v) => `<p>${escapeHTML(v)}</p>`).join("")}</div>`;
	showPanel(
		"About the expedition",
		`<div class="eyebrow">RIGHT STICK / MOUSE WHEEL TO SCROLL</div><p>An original comic adventure inspired by the discovery, cryptic signs and dangerous treasure hunt of <em>Raiders of the Lost Ark</em> (1982), with the dry wit and impossible escapes of an adventure serial. Dr. Finch, the Temple of the Sun and its very unhelpful inhabitants are original creations.</p><div class="credits-grid">${credits}</div>${fb}<p>Design, code, procedural art and synthesized score · OpenAI Codex.<br>Three.js · Rapier · PeerJS · AI Hub. Fonts: Barlow Condensed and DM Sans. No image, model or audio files.</p>`,
		() => (from === "menu" ? showMenu() : showPause()),
	);
}
function showCoop() {
	screen = "coop";
	showPanel(
		"Bring an accomplice",
		`<p>Two explorers. One shared expedition.<br>Create a room and send its six-character code to your partner.</p>${action("Create an expedition", "host", true)}<div id="room-display" class="room-code" hidden></div><input id="join-code" class="coop-code" maxlength="6" placeholder="ROOM CODE" aria-label="Room code">${action("Join expedition", "join")}<p id="online-status" class="status">Online rooms use WebRTC. Same-browser tabs connect directly.</p><p style="font-size:15px">Your partner wears teal. Either explorer can solve signs and recover the idol. Stay close: fallen partners revive when approached. AI Hub sessions connect automatically.</p>`,
		() => {
			online.leave();
			showMenu();
		},
	);
	$("host").onclick = async () => {
		audio.unlock();
		const code = await online.createRoom();
		$("room-display").hidden = false;
		$("room-display").textContent = code;
		$("host").disabled = true;
	};
	$("join").onclick = () => {
		audio.unlock();
		online.joinRoom($("join-code").value);
	};
}
function showDev() {
	screen = "dev";
	const ranges = [
		["Move speed", "speed", 2, 10, 0.1],
		["Whip reach", "whipRange", 1.5, 6, 0.1],
		["Enemy pursuit", "enemySpeed", 0, 4, 0.1],
		["Trap tempo", "trapTempo", 0.2, 2, 0.1],
		["Boulder speed", "boulderSpeed", 1, 9, 0.1],
		["Incoming damage", "damage", 0, 3, 0.1],
		["Camera zoom", "cameraZoom", 0.65, 1.5, 0.05],
	];
	showPanel(
		"Field laboratory",
		`<p style="font-size:16px">Live tuning. Values apply immediately to the shared expedition host.</p><div class="dev-grid">${ranges.map(([l, k, a, b, s]) => slider(l, k, a, b, s, tuning[k], "tune")).join("")}</div><div class="dev-tools">${action("Invulnerability: " + (god ? "ON" : "OFF"), "god")}${action("Heal both explorers", "heal")}${action("Clear courtyard", "clear-enemies")}${action("Solve the signs", "solve")}${action("Jump to inner hall", "checkpoint-hall")}${action("Jump to relic vault", "checkpoint-vault")}${action("Start boulder escape", "escape")}${action("Reset tuning defaults", "defaults")}</div><p style="font-size:14px">Renderer: ${renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL engine fallback"} · Physics: Rapier 0.19.3 · ${world.enemies.filter((e) => e.hp > 0).length} hostiles · Seeded procedural environment</p>`,
		showPause,
	);
	wireSliders();
	$("god").onclick = () => {
		god = !god;
		showDev();
	};
	$("heal").onclick = () => {
		actors.forEach((a) => (a.hp = 5));
		toast("Health restored");
	};
	$("clear-enemies").onclick = () => {
		world.enemies.forEach((e) => killEnemy(e, false));
		toast("Courtyard cleared");
	};
	$("solve").onclick = () => {
		state.puzzle = [0, 1, 2];
		solvePuzzle();
		toast("The signs are aligned");
	};
	$("checkpoint-hall").onclick = () => {
		setPosition(actors[0], 0, -11);
		state.checkpoint = "hall";
		toast("Checkpoint: Hall of Signs");
	};
	$("checkpoint-vault").onclick = () => {
		solvePuzzle();
		setPosition(actors[0], 0, -32);
		state.checkpoint = "vault";
		toast("Checkpoint: relic vault");
	};
	$("escape").onclick = () => {
		solvePuzzle();
		setPosition(actors[0], 0, -35);
		takeRelic();
	};
	$("defaults").onclick = () => {
		Object.assign(tuning, DEFAULTS);
		showDev();
	};
}

function makeActor(art, index) {
	const body = physics.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			index ? 1.5 : 0,
			0.9,
			8,
		),
	);
	const collider = physics.createCollider(
		RAPIER.ColliderDesc.capsule(0.45, 0.33).setFriction(0),
		body,
	);
	return {
		art,
		index,
		body,
		collider,
		x: index ? 1.5 : 0,
		z: 8,
		y: 0,
		hp: 5,
		invuln: 0,
		attack: 0,
		roll: 0,
		jump: 0,
		swing: 0,
		active: index === 0,
		down: 0,
		faceX: 0,
		faceZ: -1,
		move: 0,
		anim: "idle",
		lastAction: -1,
		lastStep: 0,
	};
}
function setPosition(a, x, z) {
	a.x = x;
	a.z = z;
	a.y = 0;
	a.body.setTranslation({ x, y: 0.9, z }, true);
	a.body.setNextKinematicTranslation({ x, y: 0.9, z });
	a.art.group.position.set(x, 0, z);
}
function animate(a, name) {
	if (!a.art.actions[name] || a.anim === name) return;
	const old = a.art.actions[a.anim];
	old?.fadeOut(0.12);
	a.art.actions[name].reset().fadeIn(0.12).play();
	a.anim = name;
}
function resetGame() {
	Object.assign(state, {
		phase: "courtyard",
		running: false,
		won: false,
		dead: false,
		time: 0,
		score: 0,
		kills: 0,
		treasures: 0,
		puzzle: [2, 0, 1],
		solved: false,
		relic: false,
		checkpoint: "courtyard",
		gate: 0,
		boulderZ: -42,
		trapHits: 0,
		rolls: 0,
		whips: 0,
		jumps: 0,
		swings: 0,
		revives: 0,
		damageTaken: 0,
		chapter: 0,
	});
	simTime = 0;
	remoteInputs.clear();
	remoteSeq.clear();
	actors.forEach((a, i) => {
		setPosition(a, i ? 1.5 : 0, 8);
		Object.assign(a, {
			hp: 5,
			invuln: 0,
			attack: 0,
			roll: 0,
			jump: 0,
			swing: 0,
			down: 0,
			active: i === 0 || (online.connected && online.players.length > 1),
		});
		a.art.group.visible = a.active;
		a.art.group.rotation.set(0, Math.PI, 0);
		a.art.rig.rotation.set(0, 0, 0);
		animate(a, "idle");
	});
	world.enemies.forEach((e) => {
		e.hp = 2;
		e.stun = 0;
		e.cooldown = 1;
		e.windup = 0;
		e.dying = 0;
		e.group.visible = true;
		e.group.scale.setScalar(1);
		e.group.position.set(e.homeX, 0, e.homeZ);
		e.group.rotation.z = 0;
	});
	world.pickups.forEach((p) => {
		p.collected = false;
		p.group.visible = true;
	});
	world.relic.visible = true;
	world.gate.position.y = 0;
	world.boulder.visible = false;
	world.boulder.position.set(0, 2.45, -42);
	world.puzzle.forEach((p, i) => {
		p.value = state.puzzle[i];
		p.group.rotation.y = (-p.value * Math.PI * 2) / 3;
	});
	$("escape-warning").hidden = true;
	$("bark").hidden = true;
	barkTime = 0;
	$("chapter-card").classList.remove("show");
	cameraZ = 5;
	shake = 0;
	effects.forEach((e) => {
		scene.remove(e.mesh);
		e.mesh.geometry.dispose();
		e.mesh.material.dispose();
	});
	effects.length = 0;
	updateHud();
}
function startGame(demo = false) {
	resetGame();
	state.running = true;
	screen = "playing";
	attract = demo;
	attractTime = 0;
	attractStage = 0;
	$("screen").innerHTML = "";
	$("hud").hidden = false;
	$("attract-banner").hidden = !demo;
	world.partner.group.visible = actors[1].active;
	input.attack = input.use = input.jump = input.roll = false;
	keys.clear();
	updatePrompts();
	audio.resume();
	if (!demo) {
		audio.unlock();
		chapter("I · The uninvited", "A temple off the sensible route.");
		speak("The map says “certain death.” Rather specific, for a map.");
	}
	updateHud();
}
function resultData() {
	return {
		won: state.won,
		score: Math.round(state.score),
		stats: {
			idol: state.relic,
			treasures: state.treasures,
			guards: state.kills,
			seconds: Math.round(state.time),
			damage: state.damageTaken,
		},
	};
}
function finish(won) {
	if (state.won || state.dead) return;
	state.won = won;
	state.dead = !won;
	state.running = false;
	screen = won ? "victory" : "dead";
	$("interaction").hidden = true;
	$("touch-action").hidden = true;
	$("escape-warning").hidden = true;
	audio.sfx(won ? "win" : "damage");
	if (attract) {
		screen = "playing";
		state.running = true;
		return;
	}
	if (online.role !== "guest") online.finish(resultData());
	const rank =
		state.damageTaken === 0
			? "IMPOSSIBLY WELL DRESSED"
			: state.treasures === 3
				? "A PROFESSIONAL BAD IDEA"
				: "BARELY RESPECTABLE";
	showPanel(
		won ? "Fortune, found." : "A slight setback.",
		`<div class="eyebrow">${won ? rank : "FIELD REPORT / EXPEDITION INTERRUPTED"}</div><p>${won ? "The idol is safe. The temple is rubble.<br>Dr. Finch will call that a successful survey." : "The temple has made its point.<br>A good archaeologist always keeps field notes."}</p><div class="result-stats"><div><strong>${Math.round(state.score)}</strong><small>FORTUNE</small></div><div><strong>${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, "0")}</strong><small>ELAPSED</small></div><div><strong>${state.treasures}/3</strong><small>RELIC CACHES</small></div></div>${online.hub ? "<p>Your result is recorded. Return through AI Hub when ready.</p>" : (online.role === "guest" ? "<p>Waiting for the expedition leader to set out again.</p>" : action(won ? "Another bad idea" : "Retry from checkpoint", "retry", true)) + action("Return to title", "result-title")}`,
	);
	if (!online.hub) {
		if ($("retry"))
			$("retry").onclick = () => {
				if (won) {
					startGame();
				} else retryCheckpoint();
			};
		$("result-title").onclick = () => {
			online.leave();
			resetGame();
			showMenu();
		};
	}
}
function retryCheckpoint() {
	const cp = state.checkpoint,
		treasures = state.treasures,
		kills = state.kills,
		collected = world.pickups.map((p) => p.collected);
	startGame();
	state.treasures = treasures;
	state.kills = cp === "courtyard" ? 0 : kills;
	world.pickups.forEach((p, i) => {
		p.collected = collected[i];
		p.group.visible = !p.collected;
	});
	if (cp === "hall" || cp === "vault") {
		world.enemies.forEach((e) => killEnemy(e, false));
		state.checkpoint = cp;
		setPosition(actors[0], 0, cp === "hall" ? -10 : -31);
		if (cp === "vault") solvePuzzle();
	}
	state.score = Math.max(
		0,
		state.kills * 150 + treasures * 300 + (cp === "vault" ? 500 : 0) - 100,
	);
	chapter("Back in the field", "Hat intact. Dignity negotiable.");
}
function addBurst(x, y, z, color = 0xf0c573, n = 12) {
	for (let i = 0; i < n; i++) {
		const mesh = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.045 + Math.random() * 0.055),
			new THREE.MeshBasicMaterial({ color, transparent: true }),
		);
		mesh.position.set(x, y, z);
		scene.add(mesh);
		effects.push({
			mesh,
			vx: (Math.random() - 0.5) * 4,
			vy: Math.random() * 4 + 0.5,
			vz: (Math.random() - 0.5) * 4,
			life: 0.45 + Math.random() * 0.5,
			max: 1,
		});
	}
}
function killEnemy(e, reward = true) {
	if (e.hp <= 0) return;
	e.hp = 0;
	e.dying = 0.65;
	e.group.rotation.z = 0.9;
	if (reward) {
		state.kills++;
		state.score += 150;
		audio.sfx("coin");
		addBurst(e.group.position.x, 0.8, e.group.position.z, 0xe8c477, 15);
		if (state.kills === 3)
			speak("Next time, perhaps a strongly worded letter.");
	}
}
function damageActor(a, amount, source) {
	if (a.invuln > 0 || a.roll > 0 || a.swing > 0 || god || attract || a.hp <= 0)
		return;
	const dmg = amount * tuning.damage * (prefs.assist ? 0.55 : 1);
	a.hp = Math.max(0, a.hp - dmg);
	a.invuln = 1.2;
	state.damageTaken += dmg;
	shake = 0.28;
	audio.sfx("damage");
	a.art.actions.hurt?.reset().play();
	$("damage-flash").style.opacity = ".6";
	setTimeout(() => ($("damage-flash").style.opacity = "0"), 130);
	if (source === "trap") state.trapHits++;
	if (a.hp <= 0) {
		a.down = 5;
		if (!actors.some((b) => b !== a && b.active && b.hp > 0)) finish(false);
		else speak("A hand, if you have a spare one.");
	}
}
function face(a, x, z) {
	const l = Math.hypot(x, z);
	if (l > 0.01) {
		a.faceX = x / l;
		a.faceZ = z / l;
		a.art.group.rotation.y = Math.atan2(a.faceX, a.faceZ);
	}
}
function nearestEnemy(a, range = 5) {
	let best = null,
		dist = range;
	for (const e of world.enemies) {
		if (e.hp <= 0) continue;
		const d = Math.hypot(e.group.position.x - a.x, e.group.position.z - a.z);
		if (d < dist) {
			best = e;
			dist = d;
		}
	}
	return best;
}
function whip(a) {
	if (a.attack > 0 || a.roll > 0 || a.hp <= 0 || a.swing > 0) return;
	const target = nearestEnemy(a, tuning.whipRange + 0.2);
	if (target && (!mouseActive || lastDevice !== "keyboard" || touch || attract))
		face(a, target.group.position.x - a.x, target.group.position.z - a.z);
	a.attack = 0.42;
	state.whips++;
	a.art.actions.whip?.reset().play();
	audio.sfx("whip");
	let hit = false;
	for (const e of world.enemies) {
		if (e.hp <= 0) continue;
		const dx = e.group.position.x - a.x,
			dz = e.group.position.z - a.z,
			d = Math.hypot(dx, dz);
		if (
			d <= tuning.whipRange + 0.5 &&
			(d < 1.3 || (dx * a.faceX + dz * a.faceZ) / d > -0.1)
		) {
			e.hp--;
			e.stun = 1.25;
			e.windup = 0;
			addBurst(e.group.position.x, 1, e.group.position.z, 0xffd482, 8);
			if (e.hp <= 0) {
				e.hp = 1;
				killEnemy(e);
			} else {
				e.group.position.x += a.faceX * 0.65;
				e.group.position.z += a.faceZ * 0.65;
				audio.sfx("hit");
			}
			hit = true;
		}
	}
	if (hit) shake = 0.1;
}
function leap(a) {
	if (a.jump > 0 || a.roll > 0 || a.swing > 0 || a.hp <= 0) return;
	if (!state.relic && Math.abs(a.x) < 2.7 && a.z < -15.3 && a.z > -19) {
		a.swing = 0.9;
		a.swingStart = { x: a.x, z: a.z };
		a.swingEnd = { x: 0, z: -21 };
		state.swings++;
		audio.sfx("whip");
		speak("Finally. A practical application for a very long belt.", 3.5);
	} else {
		a.jump = 0.72;
		state.jumps++;
		audio.sfx("jump");
	}
}
function roll(a, dx, dz) {
	if (a.roll > 0 || a.jump > 0 || a.swing > 0 || a.hp <= 0) return;
	a.roll = 0.48;
	a.rollX = dx || a.faceX;
	a.rollZ = dz || a.faceZ;
	const l = Math.hypot(a.rollX, a.rollZ) || 1;
	a.rollX /= l;
	a.rollZ /= l;
	a.invuln = Math.max(a.invuln, 0.5);
	state.rolls++;
	audio.sfx("roll");
}
function interactionFor(a) {
	if (a.hp <= 0) return null;
	for (const b of actors) {
		if (
			b !== a &&
			b.active &&
			b.hp <= 0 &&
			Math.hypot(a.x - b.x, a.z - b.z) < 2.5
		)
			return { type: "revive", actor: b, text: "Help your accomplice up" };
	}
	if (!state.solved) {
		let best = null,
			dist = 2.3;
		world.puzzle.forEach((p, i) => {
			const d = Math.hypot(a.x - p.x, a.z - p.z);
			if (d < dist) {
				dist = d;
				best = {
					type: "pillar",
					i,
					text: `Rotate ${["left", "middle", "right"][i]} sign · ${["SUN", "EYE", "SERPENT"][state.puzzle[i]]}`,
				};
			}
		});
		if (best) return best;
	}
	if (!state.relic && state.solved && Math.hypot(a.x, a.z + 37) < 3.1)
		return { type: "relic", text: "Borrow the sun idol" };
	if (!state.relic && Math.abs(a.x) < 3.1 && a.z < -14.9 && a.z > -18.7)
		return { type: "grapple", text: "Whip across the sinkhole" };
	if (!state.solved && a.z < -22.7 && a.z > -26.5)
		return { type: "clue", text: "Read the inscription" };
	if (state.relic && a.z > 8.6)
		return { type: "exit", text: "Get out of here" };
	return null;
}
function interact(a) {
	const q = interactionFor(a);
	if (!q) return;
	if (q.type === "pillar") {
		state.puzzle[q.i] = (state.puzzle[q.i] + 1) % 3;
		world.puzzle[q.i].value = state.puzzle[q.i];
		audio.sfx("puzzle");
		addBurst(world.puzzle[q.i].x, 2, -21, 0x84d6bb, 6);
		if (state.puzzle.every((v, i) => v === i)) solvePuzzle();
		else toast(["SUN", "EYE", "SERPENT"][state.puzzle[q.i]], 1);
	}
	if (q.type === "relic") takeRelic();
	if (q.type === "grapple") leap(a);
	if (q.type === "clue")
		speak("“Sun wakes. Eye watches. Serpent waits.” Pleasant company.", 5);
	if (q.type === "exit") finish(true);
	if (q.type === "revive") {
		q.actor.hp = 3;
		q.actor.invuln = 2;
		q.actor.down = 0;
		state.revives++;
		audio.sfx("puzzle");
		speak("Just testing the floor. Thoroughly.");
	}
}
function solvePuzzle() {
	if (state.solved) return;
	state.puzzle = [0, 1, 2];
	state.solved = true;
	state.phase = "vault";
	state.checkpoint = "vault";
	state.score += 500;
	audio.sfx("gate");
	shake = 0.25;
	chapter("III · Finders, keepers", "Every treasure comes with a catch.");
	speak("Sun. Eye. Serpent. Ancient security was wonderfully literal.");
	world.puzzle.forEach((p, i) => (p.value = i));
}
function takeRelic() {
	if (state.relic) return;
	state.relic = true;
	state.phase = "escape";
	state.score += 1200;
	world.relic.visible = false;
	world.boulder.visible = true;
	state.boulderZ = -43;
	state.gate = 1;
	actors.forEach((a) => {
		if (a.active && a.z < -37) setPosition(a, a.x, -35);
		a.hp = Math.max(a.hp, 3);
	});
	audio.sfx("relic");
	audio.sfx("rumble");
	shake = 0.7;
	chapter("IV · The return policy", "Back to the entrance. Quickly.");
	speak("That was too easy. I dislike that enormously.");
	$("escape-warning").hidden = false;
}

function localInput() {
	let x = 0,
		z = 0;
	if (keys.has("KeyW") || keys.has("ArrowUp")) z--;
	if (keys.has("KeyS") || keys.has("ArrowDown")) z++;
	if (keys.has("KeyA") || keys.has("ArrowLeft")) x--;
	if (keys.has("KeyD") || keys.has("ArrowRight")) x++;
	input.x = touchState.x || x;
	input.z = touchState.z || z;
	const l = Math.hypot(input.x, input.z);
	if (l > 1) {
		input.x /= l;
		input.z /= l;
	}
	input.sprint =
		keys.has("ShiftLeft") || keys.has("ShiftRight") || input.padSprint;
	return input;
}
function actorInput(a) {
	if (online.server) {
		const id = seatIds[a.index] ?? online.players[a.index]?.id;
		return consumeRemote(id);
	}
	if (online.role === "guest") return null;
	if (a.index === localIndex())
		return screen === "playing" ? input : { x: 0, z: 0 };
	const id = online.hub ? (seatIds[a.index] ?? online.players[a.index]?.id) : 1;
	return consumeRemote(id);
}
function consumeRemote(id) {
	const v = remoteInputs.get(id);
	if (!v || performance.now() - v.received > 650) return { x: 0, z: 0 };
	const first = remoteSeq.get(id) !== v.seq;
	return {
		...v,
		attack: first && v.attack,
		jump: first && v.jump,
		roll: first && v.roll,
		use: first && v.use,
		_id: id,
		_first: first,
	};
}
function updateActor(a, control, dt) {
	if (!a.active) return;
	const art = a.art;
	a.invuln = Math.max(0, a.invuln - dt);
	a.attack = Math.max(0, a.attack - dt);
	art.whip.visible = a.attack > 0.16;
	art.whip.scale.setScalar(tuning.whipRange / 3.5);
	if (a.hp <= 0) {
		art.rig.rotation.z = -1.3;
		art.group.position.y = 0.25;
		a.down += dt;
		return;
	}
	art.rig.rotation.z = 0;
	let dx = clamp(Number(control?.x) || 0, -1, 1),
		dz = clamp(Number(control?.z) || 0, -1, 1),
		len = Math.hypot(dx, dz);
	if (len > 1) {
		dx /= len;
		dz /= len;
	}
	if (control?.worldSpace !== true) {
		/* Camera faces directly north, so screen and temple axes agree. */
	}
	if (control?.aimX || control?.aimZ) {
		if (control === input && mouseActive && lastDevice === "keyboard" && !touch)
			face(a, mouseWorld.x - a.x, mouseWorld.z - a.z);
		else if (Math.hypot(control.aimX, control.aimZ) > 0.2)
			face(a, control.aimX, control.aimZ);
	}
	if (control?.attack) whip(a);
	if (control?.jump) leap(a);
	if (control?.roll) roll(a, dx, dz);
	if (control?.use) interact(a);
	if (control?._first) remoteSeq.set(control._id, control.seq);
	let speed = tuning.speed * (control?.sprint ? 1.35 : 1);
	a.move = len;
	if (a.attack > 0.15) speed *= 0.55;
	if (a.swing > 0) {
		a.swing = Math.max(0, a.swing - dt);
		const t = 1 - a.swing / 0.9,
			e = t * t * (3 - 2 * t);
		a.x = THREE.MathUtils.lerp(a.swingStart.x, a.swingEnd.x, e);
		a.z = THREE.MathUtils.lerp(a.swingStart.z, a.swingEnd.z, e);
		a.y = Math.sin(t * Math.PI) * 3.2;
		face(a, 0, -1);
		if (a.swing === 0) {
			a.y = 0;
			audio.sfx("land");
			shake = 0.13;
		}
		setBody(a);
	} else {
		if (a.roll > 0) {
			a.roll = Math.max(0, a.roll - dt);
			dx = a.rollX;
			dz = a.rollZ;
			speed = tuning.speed * 2;
			art.rig.rotation.x = -Math.PI * 2 * (1 - a.roll / 0.48);
			face(a, dx, dz);
		} else art.rig.rotation.x = 0;
		if (a.jump > 0) {
			a.jump = Math.max(0, a.jump - dt);
			a.y = Math.sin((1 - a.jump / 0.72) * Math.PI) * 1.75;
			if (a.jump === 0) {
				a.y = 0;
				audio.sfx("land");
			}
		} else a.y = 0;
		if (len > 0.08 && !mouseActive && lastDevice !== "gamepad") face(a, dx, dz);
		else if (len > 0.08 && !(control?.aimX || control?.aimZ)) face(a, dx, dz);
		const movement = { x: dx * speed * dt, y: -0.06, z: dz * speed * dt };
		controller.computeColliderMovement(a.collider, movement);
		const m = controller.computedMovement();
		a.x = clamp(a.x + m.x, -9.6, 9.6);
		a.z = clamp(a.z + m.z, -41.2, 11.1);
		if (!state.solved && a.z < -26.1) a.z = -26.1;
		setBody(a);
	}
	art.group.position.set(a.x, a.y, a.z);
	art.group.visible = a.active;
	if (a.invuln > 0) art.group.visible = Math.floor(a.invuln * 12) % 2 === 0;
	animate(a, len > 0.1 ? (speed > 6 ? "run" : "walk") : "idle");
	art.mixer.update(dt);
	if (len > 0.1 && a.jump === 0 && a.swing === 0) {
		a.lastStep -= dt;
		if (a.lastStep <= 0) {
			a.lastStep = 0.27;
			audio.sfx("step");
		}
	}
	for (const p of world.pickups) {
		if (!p.collected && Math.hypot(a.x - p.x, a.z - p.z) < 1) {
			p.collected = true;
			p.group.visible = false;
			state.treasures++;
			state.score += 300;
			audio.sfx("coin");
			addBurst(p.x, 0.7, p.z);
			toast(`Relic cache ${state.treasures}/3 · +300 fortune`, 2.2);
		}
	}
	if (a.z < -9 && state.phase === "courtyard") {
		state.phase = "hall";
		state.checkpoint = "hall";
		chapter("II · A matter of signs", "Sun wakes. Eye watches. Serpent waits.");
		speak("Three signs, one door. At least it isn’t paperwork.");
	}
	const trap = Math.abs(a.z + 12) < 0.7 || Math.abs(a.z + 15) < 0.7;
	if (trap && a.y < 0.45 && a.roll <= 0) {
		const pulse =
			(Math.sin(simTime * 2.25 * tuning.trapTempo + (a.z < -13 ? 1.5 : 0)) +
				1) /
			2;
		if (pulse > 0.72) damageActor(a, 1, "trap");
	}
	if (
		Math.abs(a.z + 18.5) < 0.6 &&
		Math.abs(a.x) < 3 &&
		a.y < 0.45 &&
		a.swing <= 0 &&
		a.roll <= 0
	) {
		damageActor(a, 1, "pit");
		if (a.invuln > 1) setPosition(a, a.x, a.z > -18.5 ? -17.5 : -19.5);
	}
	if (state.relic && a.z > 9.2) {
		state.score += Math.max(0, Math.floor(600 - state.time));
		finish(true);
	}
}
function setBody(a) {
	a.body.setNextKinematicTranslation({ x: a.x, y: 0.9, z: a.z });
}
function updateEnemies(dt) {
	for (const e of world.enemies) {
		if (e.hp <= 0) {
			if (e.dying > 0) {
				e.dying -= dt;
				e.group.position.y = -0.1;
				e.group.scale.setScalar(Math.max(0.01, e.dying / 0.65));
				if (e.dying <= 0) e.group.visible = false;
			}
			continue;
		}
		if (state.relic) {
			e.group.visible = false;
			continue;
		}
		e.stun = Math.max(0, (e.stun || 0) - dt);
		e.cooldown = Math.max(0, (e.cooldown || 0) - dt);
		let target = null,
			near = 10;
		for (const a of actors) {
			if (!a.active || a.hp <= 0) continue;
			const d = Math.hypot(a.x - e.group.position.x, a.z - e.group.position.z);
			if (d < near) {
				near = d;
				target = a;
			}
		}
		if (!target) {
			e.mixer?.update(dt);
			continue;
		}
		const dx = target.x - e.group.position.x,
			dz = target.z - e.group.position.z,
			d = Math.hypot(dx, dz) || 1;
		if (e.stun > 0) {
			e.group.rotation.z = Math.sin(simTime * 25) * 0.09;
			e.windup = 0;
		} else {
			e.group.rotation.z = 0;
			if (e.windup > 0) {
				e.windup -= dt;
				e.group.scale.setScalar(1 + Math.sin(e.windup * 18) * 0.035);
				if (e.windup <= 0) {
					if (d < 2.2) damageActor(target, 1, "enemy");
					e.cooldown = e.type === "snake" ? 1.7 : 2.1;
					addBurst(e.group.position.x, 0.5, e.group.position.z, 0xa76d40, 4);
				}
			} else if (d < 1.65 && e.cooldown <= 0) {
				e.windup = 0.55;
				audio.sfx("hit");
			} else if (d > 1.4) {
				const s =
					tuning.enemySpeed *
					(e.type === "snake" ? 1.25 : 1) *
					(prefs.assist ? 0.8 : 1);
				e.group.position.x = clamp(
					e.group.position.x + (dx / d) * s * dt,
					-9,
					9,
				);
				e.group.position.z += (dz / d) * s * dt;
			}
			e.group.rotation.y = Math.atan2(dx, dz);
			e.actions.walk?.play();
		}
		e.mixer?.update(dt);
	}
}
function updateTraps() {
	for (const t of trapTiles) {
		const pulse =
			(Math.sin(simTime * 2.25 * tuning.trapTempo + t.phase) + 1) / 2;
		t.spikes.position.y = pulse > 0.72 ? (pulse - 0.72) * 2.5 : -0.35;
		t.warning.material.color.setHex(pulse > 0.55 ? 0xeaa154 : 0x274e47);
		t.warning.material.emissive?.setHex(pulse > 0.55 ? 0x753d13 : 0x102a24);
	}
}
function updateEffects(dt) {
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.life -= dt;
		if (e.life <= 0) {
			scene.remove(e.mesh);
			e.mesh.geometry.dispose();
			e.mesh.material.dispose();
			effects.splice(i, 1);
			continue;
		}
		e.vy -= dt * 9;
		e.mesh.position.x += e.vx * dt;
		e.mesh.position.y += e.vy * dt;
		e.mesh.position.z += e.vz * dt;
		e.mesh.rotation.x += dt * 4;
		e.mesh.material.opacity = Math.min(1, e.life * 3);
	}
}
function updateWorld(dt) {
	simTime += dt;
	state.time += dt;
	for (const a of actors) updateActor(a, actorInput(a), dt);
	physics.timestep = dt;
	physics.step();
	updateEnemies(dt);
	updateTraps();
	world.update(simTime, dt);
	updateEffects(dt);
	world.puzzle.forEach((p, i) => {
		let target = (-state.puzzle[i] * Math.PI * 2) / 3;
		let d =
			THREE.MathUtils.euclideanModulo(
				target - p.group.rotation.y + Math.PI,
				Math.PI * 2,
			) - Math.PI;
		p.group.rotation.y += d * Math.min(1, dt * 8);
	});
	state.gate = THREE.MathUtils.damp(state.gate, state.solved ? 1 : 0, 3, dt);
	world.gate.position.y = state.gate * 5.7;
	if (state.relic) {
		const closest = Math.min(
			...actors.filter((a) => a.active && a.hp > 0).map((a) => a.z),
		);
		const catchup = clamp((closest - state.boulderZ - 10) * 0.07, 0, 2);
		state.boulderZ +=
			(tuning.boulderSpeed * (prefs.assist ? 0.78 : 1) + catchup) * dt;
		world.boulder.position.set(
			Math.sin(simTime * 4) * 0.15,
			2.45,
			state.boulderZ,
		);
		world.boulder.rotation.x += dt * 2.3;
		shake = Math.max(shake, 0.045);
		for (const a of actors) {
			if (
				a.active &&
				a.hp > 0 &&
				a.z < state.boulderZ + 2.7 &&
				Math.abs(a.x) < 4
			) {
				damageActor(a, 2, "boulder");
				a.z = state.boulderZ + 3.8;
				setBody(a);
			}
		}
		if (state.boulderZ > 12.7 && !state.won) finish(false);
	}
	if (touch) {
		const a = localActor();
		if (a && nearestEnemy(a, 3.2) && a.attack <= 0) whip(a);
	}
	input.attack = input.jump = input.roll = input.use = false;
	input.seq++;
}
function localIndex() {
	if (online.hub && !online.server)
		return Math.max(
			0,
			(seatIds.length ? seatIds : online.players.map((p) => p.id)).indexOf(
				online.me,
			),
		);
	return online.role === "guest" ? 1 : 0;
}
function localActor() {
	return actors[localIndex()] || actors[0];
}
function snapshot() {
	return {
		seq: ++netSequence,
		state: { ...state },
		actors: actors.map((a) => ({
			x: a.x,
			z: a.z,
			y: a.y,
			hp: a.hp,
			faceX: a.faceX,
			faceZ: a.faceZ,
			active: a.active,
			attack: a.attack,
			roll: a.roll,
			jump: a.jump,
			move: a.move,
		})),
		enemies: world.enemies.map((e) => ({
			x: e.group.position.x,
			z: e.group.position.z,
			hp: e.hp,
			stun: e.stun,
			rot: e.group.rotation.y,
		})),
		pickups: world.pickups.map((p) => p.collected),
	};
}
function receiveSnapshot(s, dt) {
	const wasTerminal = state.won || state.dead;
	const before = state.phase;
	Object.assign(state, s.state);
	if (wasTerminal && !state.won && !state.dead) {
		screen = "playing";
		state.running = true;
		$("screen").innerHTML = "";
		audio.resume();
	}
	if (before !== state.phase) {
		if (state.phase === "escape") {
			chapter("IV · The return policy", "Back to the entrance. Quickly.");
			audio.sfx("relic");
		} else if (state.phase === "vault")
			chapter("III · Finders, keepers", "Every treasure comes with a catch.");
		else if (state.phase === "hall")
			chapter(
				"II · A matter of signs",
				"Sun wakes. Eye watches. Serpent waits.",
			);
	}
	s.actors.forEach((p, i) => {
		const a = actors[i];
		if (!a) return;
		Object.assign(a, p);
		a.art.group.position.lerp(
			new THREE.Vector3(p.x, p.y, p.z),
			Math.min(1, dt * 22),
		);
		a.art.group.rotation.y = Math.atan2(p.faceX, p.faceZ);
		a.art.group.visible = p.active;
		a.art.whip.visible = p.attack > 0.15;
		animate(a, p.move > 0.1 ? "walk" : "idle");
		a.art.mixer.update(dt);
	});
	s.enemies?.forEach((p, i) => {
		const e = world.enemies[i];
		if (!e) return;
		e.hp = p.hp;
		e.group.visible = p.hp > 0;
		e.group.position.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 18));
		e.group.rotation.y = p.rot;
		e.mixer?.update(dt);
	});
	s.pickups?.forEach((v, i) => {
		world.pickups[i].collected = v;
		world.pickups[i].group.visible = !v;
	});
	world.relic.visible = !state.relic;
	world.gate.position.y = state.solved ? 5.7 : 0;
	world.boulder.visible = state.relic;
	world.boulder.position.z = state.boulderZ;
	world.boulder.rotation.x += dt * 2.3;
	world.puzzle.forEach(
		(p, i) => (p.group.rotation.y = (-state.puzzle[i] * Math.PI * 2) / 3),
	);
	world.update(state.time, dt);
	simTime = state.time;
	updateTraps();
	$("escape-warning").hidden = !state.relic;
	if (state.won && screen !== "victory") {
		state.won = false;
		finish(true);
	}
	if (state.dead && screen !== "dead") {
		state.dead = false;
		finish(false);
	}
}
function updateHud() {
	const a = localActor();
	if (!a) return;
	$("health").innerHTML = Array.from(
		{ length: 5 },
		(_, i) => `<span class="heart ${a.hp > i ? "" : "empty"}"></span>`,
	).join("");
	$("score").textContent = Math.round(state.score).toLocaleString();
	$("partner-health").textContent = actors[1].active
		? `◈ PARTNER ${Math.ceil(actors[online.role === "guest" ? 0 : 1].hp)}/5`
		: "";
	const objectives = {
		courtyard: [
			"I · THE UNINVITED",
			"Find the inner temple",
			"Explore the side niches for relic caches.",
		],
		hall: [
			"II · A MATTER OF SIGNS",
			"Align the three signs",
			"SUN → EYE → SERPENT · rotate signs with " + glyph("use"),
		],
		vault: [
			"III · FINDERS, KEEPERS",
			"Recover the sun idol",
			"The vault is open. What could possibly go wrong?",
		],
		escape: [
			"IV · THE RETURN POLICY",
			"Escape to the expedition camp",
			"Head back through the temple. Keep moving.",
		],
	};
	const q = objectives[state.phase] || objectives.courtyard;
	$("chapter").textContent = q[0];
	$("objective").textContent = q[1];
	$("objective-sub").textContent = q[2];
	const area = state.phase === "courtyard" ? 0 : state.phase === "hall" ? 1 : 2;
	[...$("route").querySelectorAll("span")].forEach((el, i) =>
		el.classList.toggle("active", i === area),
	);
	const ctx = interactionFor(a);
	$("interaction").hidden = !ctx || attract || screen !== "playing";
	if (ctx) {
		$("interact-text").textContent = ctx.text;
		$("interact-glyph").textContent = touch ? "TAP" : glyph("use");
	}
	if (touch && screen === "playing" && !attract) {
		$("touch-action").hidden = false;
		$("touch-action").textContent = ctx
			? ctx.type === "grapple"
				? "SWING"
				: ctx.type === "pillar"
					? "ROTATE"
					: ctx.type === "relic"
						? "TAKE"
						: "USE"
			: "LEAP";
	} else $("touch-action").hidden = true;
	if (state.relic)
		$("boulder-distance").textContent =
			Math.max(0, Math.round(a.z - state.boulderZ)) + " m";
}

function attractUpdate(dt) {
	attractTime += dt;
	const a = actors[0];
	if (state.won || state.dead) {
		if (attractTime > 74) startGame(true);
		return;
	}
	a.hp = 5;
	const t = attractTime;
	const ctrl = input;
	ctrl.worldSpace = true;
	ctrl.x = 0;
	ctrl.z = 0;
	ctrl.aimX = 0;
	ctrl.aimZ = 0;
	const go = (x, z) => {
		const dx = x - a.x,
			dz = z - a.z,
			d = Math.hypot(dx, dz);
		ctrl.x = d > 0.35 ? dx / d : 0;
		ctrl.z = d > 0.35 ? dz / d : 0;
		face(a, dx, dz);
		return d < 0.6;
	};
	if (t < 18) {
		const e = nearestEnemy(a, 30);
		if (e) {
			go(e.group.position.x, e.group.position.z);
			if (
				a.attack <= 0 &&
				Math.hypot(a.x - e.group.position.x, a.z - e.group.position.z) < 3.2
			)
				ctrl.attack = true;
		} else go(-6, 3);
	} else if (t < 28) {
		go(0, -16.7);
		if (Math.abs(a.z + 12) < 1 || Math.abs(a.z + 15) < 1) ctrl.roll = true;
	} else if (t < 30) {
		if (a.swing <= 0 && a.z > -19) leap(a);
	} else if (t < 42) {
		const i = t < 34 ? 0 : t < 38 ? 1 : 2;
		go([-5, 0, 5][i], -20);
		if (
			Math.abs(a.x - [-5, 0, 5][i]) < 0.7 &&
			a.attack <= 0 &&
			state.puzzle[i] !== i
		) {
			interact(a);
			a.attack = 0.7;
		}
	} else if (t < 49) {
		if (!state.solved) solvePuzzle();
		go(0, -35.2);
	} else if (t < 51) {
		takeRelic();
	} else {
		go(0, 10);
		if (Math.abs(a.z + 18.5) < 2 && a.jump <= 0) ctrl.jump = true;
		ctrl.sprint = true;
		if (a.z < -12 && a.z > -16 && a.roll <= 0) ctrl.roll = true;
	}
	if (t > 76) startGame(true);
}

function createHazards() {
	const colors = { metal: 0x384a3d, gold: 0xc69954 };
	for (const [z, phase] of [
		[-12, 0],
		[-15, 1.5],
	]) {
		const g = new THREE.Group();
		scene.add(g);
		g.position.z = z;
		const warning = new THREE.Mesh(
			new THREE.BoxGeometry(17, 0.05, 1.4),
			new THREE.MeshStandardMaterial({
				color: 0x274e47,
				emissive: 0x102a24,
				roughness: 1,
			}),
		);
		warning.position.y = 0.09;
		g.add(warning);
		const spikes = new THREE.Group();
		g.add(spikes);
		for (let x = -7.5; x <= 7.5; x += 0.65) {
			const spike = new THREE.Mesh(
				new THREE.ConeGeometry(0.13, 0.8, 4),
				new THREE.MeshStandardMaterial({
					color: colors.metal,
					flatShading: true,
				}),
			);
			spike.position.set(x, 0.4, 0);
			spike.castShadow = true;
			spikes.add(spike);
		}
		trapTiles.push({ g, spikes, warning, phase });
	}
	const pit = new THREE.Mesh(
		new THREE.BoxGeometry(6, 0.08, 1.25),
		new THREE.MeshBasicMaterial({ color: 0x102a27 }),
	);
	pit.position.set(0, 0.08, -18.5);
	scene.add(pit);
	for (let side of [-1, 1]) {
		const rim = new THREE.Mesh(
			new THREE.BoxGeometry(0.2, 0.16, 1.5),
			new THREE.MeshStandardMaterial({ color: 0x806c45 }),
		);
		rim.position.set(side * 3.1, 0.12, -18.5);
		scene.add(rim);
	}
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.42, 0.09, 6, 16),
		new THREE.MeshStandardMaterial({
			color: 0xffce77,
			metalness: 0.6,
			roughness: 0.4,
		}),
	);
	ring.position.set(0, 4.2, -18.3);
	scene.add(ring);
	const beam = new THREE.Mesh(
		new THREE.BoxGeometry(9, 0.25, 0.45),
		new THREE.MeshStandardMaterial({ color: 0x6e7554 }),
	);
	beam.position.set(0, 4.9, -18.3);
	scene.add(beam);
	const hanger = new THREE.Mesh(
		new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6),
		new THREE.MeshStandardMaterial({ color: 0x544c31 }),
	);
	hanger.position.set(0, 4.55, -18.3);
	scene.add(hanger);
	// Visible clue in both directions, cut into three vertical plaques.
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 160;
	const c = canvas.getContext("2d");
	c.fillStyle = "#173c37";
	c.fillRect(0, 0, 1024, 160);
	c.strokeStyle = "#c9ae74";
	c.lineWidth = 6;
	c.strokeRect(8, 8, 1008, 144);
	c.fillStyle = "#efd6a0";
	c.font = "600 48px Georgia";
	c.textAlign = "center";
	c.fillText("SUN   →   EYE   →   SERPENT", 512, 78);
	c.font = "22px Georgia";
	c.fillStyle = "#aac4a6";
	c.fillText("SUN WAKES. EYE WATCHES. SERPENT WAITS.", 512, 125);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	const clue = new THREE.Mesh(
		new THREE.PlaneGeometry(8.5, 1.33),
		new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
	);
	clue.position.set(0, 0.25, -24.4);
	clue.rotation.x = -Math.PI / 2;
	scene.add(clue);
}

function noteInput(device) {
	setDevice(device);
	if (attract) {
		resetGame();
		showMenu();
		return true;
	}
	return false;
}
window.addEventListener("keydown", (e) => {
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
	if (noteInput("keyboard")) return;
	if (e.target.matches("input:not([type=range]),select")) {
		if (e.code === "Escape") $("back")?.click();
		return;
	}
	if (e.repeat) {
		keys.add(e.code);
		return;
	}
	keys.add(e.code);
	if (screen === "playing") {
		if (e.code === "Escape") pause();
		if (e.code === "KeyE") input.use = true;
		if (e.code === "Space") input.jump = true;
		if (e.code === "ControlLeft" || e.code === "KeyC") input.roll = true;
		if (e.code === "KeyF") input.attack = true;
	} else if (screen === "pause" && e.code === "Escape") resume();
	else if (
		["settings", "about", "dev", "coop"].includes(screen) &&
		e.code === "Escape"
	)
		$("back")?.click();
	else if (screen !== "loading") {
		if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab") {
			focusMenu(focusIndex + (e.shiftKey ? -1 : 1), true);
			audio.sfx("click");
		}
		if (e.code === "ArrowUp" || e.code === "KeyW") {
			focusMenu(focusIndex - 1, true);
			audio.sfx("click");
		}
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			const b = buttons()[focusIndex];
			if (b) b.click();
		}
		if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
			const el = buttons()[focusIndex];
			if (el?.type === "range") {
				el.value = String(
					Number(el.value) +
						(e.code === "ArrowRight" ? 1 : -1) * Number(el.step),
				);
				el.dispatchEvent(new Event("input"));
			}
		}
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	input.x = input.z = 0;
	if (screen === "playing" && !online.connected && !attract) pause();
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	if (noteInput("keyboard")) return;
	pointer.set(
		(e.clientX / innerWidth) * 2 - 1,
		-(e.clientY / innerHeight) * 2 + 1,
	);
	mouseActive = true;
	if (camera) {
		ray.setFromCamera(pointer, camera);
		ray.ray.intersectPlane(ground, mouseWorld);
		input.aimX = mouseWorld.x - (localActor()?.x || 0);
		input.aimZ = mouseWorld.z - (localActor()?.z || 0);
		const l = Math.hypot(input.aimX, input.aimZ) || 1;
		input.aimX /= l;
		input.aimZ /= l;
	}
	$("crosshair").style.left = e.clientX + "px";
	$("crosshair").style.top = e.clientY + "px";
	$("crosshair").hidden = screen !== "playing" || touch;
});
window.addEventListener("wheel", () => noteInput("keyboard"), {
	passive: true,
});
$("stage").addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") return;
	if (noteInput("keyboard")) return;
	audio.unlock();
	if (screen === "playing") {
		if (e.button === 0) {
			const a = localActor(),
				q = interactionFor(a);
			let target =
				q?.type === "pillar"
					? world.puzzle[q.i]
					: q?.type === "relic"
						? { x: 0, z: -37 }
						: null;
			if (
				target &&
				Math.hypot(mouseWorld.x - target.x, mouseWorld.z - target.z) < 2
			)
				input.use = true;
			else input.attack = true;
		}
		if (e.button === 2) input.roll = true;
	}
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
$("pause-button").onclick = () => {
	if (!noteInput(touch ? "touch" : "keyboard")) pause();
};
$("interaction").onclick = () => {
	if (screen === "playing") {
		input.use = true;
		audio.unlock();
	}
};
$("touch-action").onclick = () => {
	if (screen === "playing") {
		if (interactionFor(localActor())) input.use = true;
		else input.jump = true;
		audio.unlock();
	}
};
const touchState = { x: 0, z: 0, id: null, startX: 0, startY: 0 };
window.addEventListener(
	"touchstart",
	(e) => {
		if (noteInput("touch")) return;
		touch = true;
		document.body.classList.add("touch");
		mouseActive = false;
		audio.unlock();
		if (screen !== "playing" || e.target.closest("button,#interaction")) return;
		e.preventDefault();
		if (e.touches.length > 1) input.roll = true;
		for (const t of e.changedTouches) {
			if (t.clientX < innerWidth * 0.6 && touchState.id === null) {
				touchState.id = t.identifier;
				touchState.startX = t.clientX;
				touchState.startY = t.clientY;
			} else if (e.touches.length === 1) input.jump = true;
		}
	},
	{ passive: false },
);
window.addEventListener(
	"touchmove",
	(e) => {
		if (screen !== "playing") return;
		e.preventDefault();
		for (const t of e.changedTouches) {
			if (t.identifier === touchState.id) {
				touchState.x = clamp((t.clientX - touchState.startX) / 65, -1, 1);
				touchState.z = clamp((t.clientY - touchState.startY) / 65, -1, 1);
			} else {
				input.aimX = (t.clientX - innerWidth * 0.75) / 100;
				input.aimZ = (t.clientY - innerHeight * 0.5) / 100;
			}
		}
	},
	{ passive: false },
);
window.addEventListener(
	"touchend",
	(e) => {
		for (const t of e.changedTouches)
			if (t.identifier === touchState.id) {
				touchState.id = null;
				touchState.x = touchState.z = 0;
			}
	},
	{ passive: true },
);
function gamepad() {
	const pads = navigator.getGamepads?.() || [];
	const p = [...pads].find((p) => p && p.connected);
	if (!p) {
		padPrevious = [];
		return;
	}
	const b = p.buttons.map((b) => b.pressed),
		pressed = (i) => b[i] && !padPrevious[i],
		axis = (v) => (Math.abs(v || 0) > 0.19 ? v : 0);
	const ax = axis(p.axes[0]),
		az = axis(p.axes[1]),
		rx = axis(p.axes[2]),
		rz = axis(p.axes[3]);
	const active = ax || az || rx || rz || b.some((v, i) => v && !padPrevious[i]);
	if (active) {
		if (noteInput("gamepad")) {
			padPrevious = b;
			return;
		}
		mouseActive = false;
		audio.unlock();
	}
	if (screen === "playing") {
		input.x = ax;
		input.z = az;
		input.sprint = b[10];
		input.padSprint = b[10];
		if (rx || rz) {
			input.aimX = rx;
			input.aimZ = rz;
		} else {
			input.aimX = input.aimZ = 0;
		}
		if (pressed(2) || pressed(7)) input.attack = true;
		if (pressed(0)) input.jump = true;
		if (pressed(1)) input.roll = true;
		if (pressed(3)) input.use = true;
		if (pressed(9) && !(online.hub && b[8])) pause();
	} else {
		const panel = $("screen").querySelector(".panel");
		if (panel && Math.abs(rz) > 0.2) panel.scrollTop += rz * 14;
		const direction = pressed(13)
			? 1
			: pressed(12)
				? -1
				: az > 0.55 && lastMenuAxis <= 0.55
					? 1
					: az < -0.55 && lastMenuAxis >= -0.55
						? -1
						: 0;
		if (direction) {
			focusMenu(focusIndex + direction, true);
			audio.sfx("click");
		}
		if (pressed(0)) {
			buttons()[focusIndex]?.click();
		}
		if (pressed(1)) {
			if (screen === "pause") resume();
			else $("back")?.click();
		}
		if (pressed(9) && screen === "pause" && !(online.hub && b[8])) resume();
		if (pressed(14) || pressed(15) || Math.abs(ax) > 0.6) {
			const el = buttons()[focusIndex];
			if (el?.type === "range") {
				const dir = pressed(14) || ax < -0.6 ? -1 : 1;
				el.value = String(Number(el.value) + dir * Number(el.step));
				el.dispatchEvent(new Event("input"));
			}
		}
	}
	lastMenuAxis = az;
	padPrevious = b;
}

function resize() {
	if (!renderer) return;
	const aspect = innerWidth / innerHeight,
		h = 10.8 / (tuning.cameraZoom || 1);
	camera.left = -h * aspect;
	camera.right = h * aspect;
	camera.top = h;
	camera.bottom = -h;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener("resize", resize);
function renderFrame(now) {
	const dt = Math.min((now - frameTime) / 1000 || 1 / 60, 0.05);
	frameTime = now;
	localInput();
	gamepad();
	if (!booted) return;
	if (screen === "menu" && !online.hub && now - lastActivity >= 10000)
		startGame(true);
	const running =
		(screen === "playing" ||
			(online.connected &&
				["pause", "dev", "settings", "about"].includes(screen))) &&
		online.canPlay &&
		!online.ended;
	if (attract && running) attractUpdate(dt);
	if (running && !state.won && !state.dead) {
		if (online.role === "guest") {
			if (online.sendInput({ ...input, seq: input.seq })) {
				input.seq++;
				input.attack = input.jump = input.roll = input.use = false;
			}
			if (pendingSnapshot) receiveSnapshot(pendingSnapshot, dt);
		} else {
			updateWorld(dt);
			if (online.connected) online.sendState(snapshot());
		}
	} else if (screen === "menu" || screen === "coop") {
		simTime += dt;
		world.update(simTime, dt);
		world.player.mixer.update(dt);
		world.enemies.forEach((e) => e.mixer?.update(dt));
	}
	if (online.role === "guest" && pendingSnapshot && (state.won || state.dead))
		receiveSnapshot(pendingSnapshot, dt);
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").hidden = true;
	}
	if (barkTime > 0) {
		barkTime -= dt;
		if (barkTime <= 0) $("bark").hidden = true;
	}
	if (chapterTime > 0) {
		chapterTime -= dt;
		if (chapterTime <= 0) $("chapter-card").classList.remove("show");
	}
	audio.update(
		dt,
		state.won
			? "victory"
			: state.relic
				? "escape"
				: nearestEnemy(localActor(), 6)
					? "combat"
					: "explore",
	);
	const menuView = ["menu", "coop"].includes(screen);
	const targetZ = menuView
		? -1.2
		: (localActor()?.z || 0) + (state.relic ? 2 : -3.5);
	cameraZ = THREE.MathUtils.damp(cameraZ, targetZ, menuView ? 1.2 : 4, dt);
	const z = clamp(cameraZ, -34, 4.5);
	shake = Math.max(0, shake - dt * 1.7);
	const sx = (Math.random() - 0.5) * shake * prefs.shake,
		sy = (Math.random() - 0.5) * shake * prefs.shake;
	const menuOffset = menuView ? -4.5 : 0;
	camera.position.set(menuOffset + sx, 25 + sy, z + 22);
	camera.lookAt(menuOffset, 0, z);
	const expected = 10.8 / tuning.cameraZoom;
	if (Math.abs(camera.top - expected) > 0.01) resize();
	renderer.render(scene, camera);
	hudTime += dt;
	if (hudTime > 0.1) {
		hudTime = 0;
		updateHud();
	}
	if (screen !== "playing") $("crosshair").hidden = true;
}
async function boot() {
	try {
		$("load-note").textContent = "Assembling the expedition…";
		await RAPIER.init();
		physics = new RAPIER.World({ x: 0, y: -20, z: 0 });
		physics.createCollider(
			RAPIER.ColliderDesc.cuboid(12, 0.5, 29.5).setTranslation(0, -0.5, -16),
		);
		controller = physics.createCharacterController(0.025);
		controller.enableAutostep(0.3, 0.3, true);
		controller.setApplyImpulsesToDynamicBodies(true);
		scene = new THREE.Scene();
		camera = new THREE.OrthographicCamera(-20, 20, 10.8, -10.8, 0.1, 160);
		renderer = new THREE.WebGPURenderer({
			antialias: true,
			powerPreference: "high-performance",
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		await renderer.init();
		$("stage").appendChild(renderer.domElement);
		world = buildWorld(THREE, scene);
		actors = [makeActor(world.player, 0), makeActor(world.partner, 1)];
		for (const b of world.solidBoxes)
			physics.createCollider(
				RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(
					b.x,
					b.h / 2,
					b.z,
				),
			);
		createHazards();
		resize();
		resetGame();
		await online.init();
		booted = true;
		window.__game.ready = true;
		$("loading").hidden = true;
		if (online.hub) {
			screen = "waiting";
			showPanel(
				"Expedition assembling",
				"<p>Connected to AI Hub. Waiting for the expedition clock.</p>",
			);
			online.ready();
			if (online.canPlay) startGame();
		} else showMenu();
		renderer.setAnimationLoop(renderFrame);
		window.__game.engine = {
			three: THREE.REVISION,
			physics: "0.19.3",
			backend: renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL",
		};
	} catch (error) {
		console.error(error);
		$("load-note").innerHTML =
			`The expedition could not load.<br>${escapeHTML(error.message)}<br>Check your connection and open this file in a current browser.`;
		window.__game.error = error.message;
	}
}
window.__game = {
	ready: false,
	getState: () => ({
		...state,
		screen,
		attract,
		actors: actors.map((a) => ({
			x: a.x,
			z: a.z,
			hp: a.hp,
			y: a.y,
			active: a.active,
			invuln: a.invuln,
		})),
		enemies: world?.enemies.map((e) => ({
			hp: e.hp,
			x: e.group.position.x,
			z: e.group.position.z,
		})),
		tuning: { ...tuning },
		prefs: { ...prefs },
		online: {
			hub: online.hub,
			role: online.role,
			room: online.room,
			connected: online.connected,
			server: online.server,
			players: online.players,
			canPlay: online.canPlay,
		},
		audio: audio.debug(),
	}),
	audioTest: renderAudioTest,
	command(name, value) {
		if (!booted) return;
		switch (name) {
			case "start":
				online.leave();
				startGame();
				break;
			case "pause":
				pause();
				break;
			case "advance": {
				const seconds = Number(value) || 1;
				for (let n = 0; n < Math.ceil(seconds * 60); n++) {
					if (state.running || attract) updateWorld(1 / 60);
				}
				updateHud();
				break;
			}
			case "teleport":
				setPosition(actors[value.index || 0], value.x, value.z);
				break;
			case "input":
				Object.assign(input, value);
				break;
			case "whip":
				whip(actors[value || 0]);
				break;
			case "use":
				interact(actors[value || 0]);
				break;
			case "jump":
				leap(actors[value || 0]);
				break;
			case "roll":
				roll(actors[value || 0], 0, -1);
				break;
			case "aim":
				face(actors[0], value.x, value.z);
				mouseActive = true;
				break;
			case "god":
				god = !!value;
				break;
			case "damage":
				damageActor(actors[value?.index || 0], value?.amount || 1, "test");
				break;
			case "set-tuning":
				Object.assign(tuning, value);
				break;
			case "attract":
				startGame(true);
				break;
			case "idle":
				lastActivity = performance.now() - 10001;
				break;
			case "menu":
				resetGame();
				showMenu();
				break;
			case "dev":
				showDev();
				break;
			case "create-room":
				return online.createRoom();
			case "join-room":
				return online.joinRoom(value);
			case "leave-room":
				return online.leave();
			case "checkpoint":
				state.checkpoint = value;
				break;
		}
		return this.getState();
	},
	playDemo(seconds) {
		if (!attract) startGame(true);
		for (let n = 0; n < Math.ceil(seconds * 60); n++) {
			attractUpdate(1 / 60);
			if (state.running) updateWorld(1 / 60);
		}
		updateHud();
		return this.getState();
	},
	projection(x, z) {
		const p = new THREE.Vector3(x, 0, z).project(camera);
		return {
			x: ((p.x + 1) * innerWidth) / 2,
			y: ((1 - p.y) * innerHeight) / 2,
		};
	},
};
boot();
