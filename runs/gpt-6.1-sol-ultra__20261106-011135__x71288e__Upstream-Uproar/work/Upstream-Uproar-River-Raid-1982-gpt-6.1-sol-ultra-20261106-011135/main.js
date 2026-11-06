import * as THREE from "three/webgpu";
import RAPIER from "rapier";
import { WorldView, river, makePlane, makeGhost, makeEntity } from "./world.js";
import { AudioSystem } from "./audio.js";
import { NetworkSession } from "./network.js";
import { CREDITS } from "./credits.js";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const padNumber = (n) => Math.floor(n).toString().padStart(6, "0");
const escapeHTML = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const DEFAULTS = Object.freeze({
	speed: 16,
	steering: 13,
	fireRate: 7,
	fuelDrain: 0.92,
	enemyRate: 1,
	damage: 1,
	timeScale: 1,
});
const tuning = { ...DEFAULTS };
const settings = {
	music: 0.1,
	sfx: 0.7,
	glyphs: "playstation",
	shake: true,
	assist: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("upstream-settings") || "{}"),
	);
} catch {}
settings.music = clamp(Number(settings.music) || 0, 0, 1);
settings.sfx = clamp(Number(settings.sfx) || 0, 0, 1);
let best = 0;
try {
	best = +localStorage.getItem("upstream-best") || 0;
} catch {}
const audio = new AudioSystem();
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
const network = new NetworkSession();
const keys = new Set(),
	previousPads = new Map(),
	ghostMeshes = new Map();
let renderer, scene, camera, world, physics, eventQueue;
const titleFormation = [];
let state = "loading",
	previousMenu = "title",
	lastInput = performance.now(),
	lastFrame = 0,
	accumulator = 0,
	visualTime = 0,
	titleProgress = 250;
let players = [],
	entities = [],
	bullets = [],
	enemyBullets = [],
	colliders = new Map(),
	nextId = 1;
let progress = 0,
	score = 0,
	fuel = 100,
	hull = 4,
	lives = 3,
	pulses = 3,
	combo = 1,
	comboClock = 0,
	kills = 0,
	bridges = 0,
	refuels = 0,
	elapsed = 0,
	checkpoint = 0;
let bossDefeated = false,
	attract = false,
	coop = false,
	godMode = false,
	autoPilot = false,
	shake = 0,
	flash = 0,
	sector = 0,
	shownSector = -1,
	reportClock = 0;
let bannerClock = 0,
	radioClock = 0,
	lastRadio = "",
	rolls = 0,
	shots = 0,
	deaths = 0,
	clearTimer = 0,
	hubStarted = false,
	hubEnded = false;
let inputMode = "keyboard",
	mouseX = null,
	mouseHeld = false,
	touchControl = null,
	pulseQueued = false,
	rollQueued = false,
	menuFocus = 0,
	menuCooldown = 0;
let resultVoiceUntil = 0;
let stats = {
	collisions: 0,
	damage: 0,
	fuelCollected: 0,
	bridgeKills: 0,
	bossPhases: 0,
	simSteps: 0,
};
const diagnostics = {
	ready: false,
	renderer: "unknown",
	errors: [],
	bootMs: 0,
};
const bootAt = performance.now();
const SECTORS = ["Sandbar Shuffle", "Needle Bend", "Ironwake Lock"];
const BOSS_AT = 2420,
	FINISH_AT = 2650;
const FEEDBACK_QUESTIONS = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"Most helpful test?",
		"Least helpful test?",
	],
	engineFeedback: [
		"What worked best?",
		"Where did you get stuck or guess wrong?",
		"Most important custom system?",
		"Hardest engine integration?",
		"Engine changes?",
		"One desired engine change?",
	],
	promptFeedback: [
		"What worked best in the prompt?",
		"What was confusing?",
		"What was hardest?",
		"What would you change?",
	],
};
const activePlay = () => state === "playing";
const gameplayScreen = () => ["playing", "paused", "dev"].includes(state);
const hasPad = () => inputMode === "pad";
const glyph = (action) => {
	if (inputMode === "touch")
		return {
			fire: "AUTO",
			roll: "AUTO",
			pulse: "PULSE",
			pause: "MENU",
			accept: "TAP",
			back: "BACK",
			move: "DRAG",
		}[action];
	if (!hasPad())
		return {
			fire: "SPACE",
			roll: "SHIFT",
			pulse: "Q",
			pause: "ESC",
			accept: "ENTER",
			back: "ESC",
			move: "WASD",
		}[action];
	const ps = settings.glyphs !== "xbox";
	return {
		fire: ps ? "R2" : "RT",
		roll: ps ? "R1" : "RB",
		pulse: ps ? "○" : "B",
		pause: ps ? "OPTIONS" : "MENU",
		accept: ps ? "✕" : "A",
		back: ps ? "○" : "B",
		move: "L STICK",
	}[action];
};
const prompt = (action) =>
	`<span data-glyph="${action}">${glyph(action)}</span>`;
const connectedPads = () =>
	Array.from(navigator.getGamepads?.() || []).filter(
		(pad) => pad && pad.connected !== false,
	);
function saveSettings() {
	try {
		localStorage.setItem("upstream-settings", JSON.stringify(settings));
	} catch {}
}
function setInputMode(mode) {
	if (inputMode === mode) return;
	inputMode = mode;
	document.body.dataset.touch = String(mode === "touch");
	updatePrompts();
}
function updatePrompts() {
	$("rollPrompt").textContent = `${glyph("roll")} · ROLL`;
	$("pulsePrompt").textContent = `${glyph("pulse")} · PULSE`;
	$("pauseButton").textContent = `${glyph("pause")} Ⅱ`;
	$("corner").textContent =
		inputMode === "touch"
			? "Drag anywhere · Auto fire · Tap PULSE to clear danger"
			: `${glyph("move")} · STEER     ${glyph("fire")} · FIRE     ${glyph("roll")} · ROLL     ${glyph("pulse")} · PULSE`;
	document
		.querySelectorAll("[data-glyph]")
		.forEach((e) => (e.textContent = glyph(e.dataset.glyph)));
	document
		.querySelectorAll("[data-scroll-hint]")
		.forEach(
			(e) =>
				(e.textContent =
					inputMode === "touch"
						? "Swipe to read more"
						: hasPad()
							? "Right stick to read more"
							: "Page Up / Page Down or mouse wheel to read more"),
		);
}
function activity(mode) {
	lastInput = performance.now();
	if (mode) setInputMode(mode);
	if (attract) {
		goTitle();
		return true;
	}
	return false;
}
function menuControls() {
	return [
		...$("menu").querySelectorAll(
			"button:not(:disabled),input,select,[data-menu-scroll]",
		),
	];
}
function focusMenu(index) {
	const a = menuControls();
	if (!a.length) return;
	menuFocus = (index + a.length) % a.length;
	a[menuFocus].focus({ preventScroll: true });
	a[menuFocus].scrollIntoView({ block: "nearest" });
}
function action(text, id, small = "", primary = false) {
	return `<button class="action${primary ? " primary" : ""}" data-action="${id}"><span>${text}</span>${small ? `<small>${small}</small>` : '<span class="arrow" aria-hidden="true">↗</span>'}</button>`;
}
function backRow(extra = "") {
	return `<div class="back-row">${action("Back", "back", prompt("back"))}${extra}</div>`;
}
function panel(eyebrow, title, body, cls = "") {
	return `<section class="panel ${cls}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${body}</section>`;
}
function showMenu(which) {
	if (network.active && ["title", "results", "room"].includes(which)) return;
	state = which;
	$("menu").classList.remove("hidden");
	$("hud").classList.toggle(
		"hidden",
		which === "title" ||
			which === "instructions" ||
			which === "about" ||
			which === "room" ||
			(which === "settings" && previousMenu === "title"),
	);
	$("bossHud").classList.add("hidden");
	$("banner").classList.add("hidden");
	$("attractTag").classList.add("hidden");
	document.body.classList.remove("in-flight");
	let content = "";
	if (which === "title")
		content = `<section class="panel title-panel"><div class="eyebrow">The river is calling. Collect.</div><h1>Upstream<br><span>Uproar</span></h1><div class="tagline">Low flight. High mischief.</div><div class="menu-list">${action("Fly the river", "solo", "1 pilot", true)}${action("Bring a wingmate", "coop", "2 pilots · local")}${action("Ghost challenge", "room", "AI Hub + browser rooms")}<div class="two-col">${action("Flight manual", "instructions")}${action("Settings", "settings")}${action("About / credits", "about")}${action("Fullscreen", "fullscreen")}</div></div><p class="footer-note">A river, a propeller, and absolutely no clearance.<br>Three sectors. Two bridges. One very stubborn boat.</p></section><div class="stamp">RIVER PATROL / NO. 82</div>`;
	if (which === "paused")
		content = panel(
			"Propeller on hold",
			"Take a breather",
			`<div class="menu-list">${action("Back to the river", "resume", prompt("accept"), true)}${action("Settings", "settings")}${action("Flight manual", "instructions")}${action("Developer tools", "dev")}${action("About / credits", "about")}${!network.active ? action("Restart mission", "restart") + action("Return to title", "title") : ""}</div><p class="footer-note">${network.active ? "Hub round clock continues while your flight is paused." : "Your fuel is safe. The river can wait."}</p>`,
		);
	if (which === "settings")
		content = panel(
			"Make yourself comfortable",
			"Settings",
			`<div class="row"><label for="music">Music</label><input id="music" data-setting="music" type="range" min="0" max="100" value="${settings.music * 100}"><output>${Math.round(settings.music * 100)}%</output></div><div class="row"><label for="sfx">Effects &amp; radio</label><input id="sfx" data-setting="sfx" type="range" min="0" max="100" value="${settings.sfx * 100}"><output>${Math.round(settings.sfx * 100)}%</output></div><div class="row"><label for="glyphs">Controller prompts</label><select id="glyphs" data-setting="glyphs"><option value="playstation" ${settings.glyphs === "playstation" ? "selected" : ""}>PlayStation</option><option value="xbox" ${settings.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div><div class="row"><label for="shakeSetting">Camera shake</label><input id="shakeSetting" data-setting="shake" type="checkbox" ${settings.shake ? "checked" : ""}></div><div class="row"><label for="assistSetting">Auto cannon / aim assist</label><input id="assistSetting" data-setting="assist" type="checkbox" ${settings.assist ? "checked" : ""}></div><p class="blurb">Music starts at 10%. Touch flight always uses auto fire, light aim assist, and safe-bank steering.</p>${backRow(action("Reset settings", "resetSettings"))}`,
		);
	if (which === "instructions")
		content = panel(
			"A small aircraft. A big attitude.",
			"Flight manual",
			`<div class="info-grid"><div class="info-card"><b>01 / Follow the current</b>${prompt("move")} steers. Up accelerates; down brakes. Stay between the inked banks.</div><div class="info-card"><b>02 / Make some room</b>Hold ${prompt("fire")} to fire. ${prompt("roll")} rolls through danger; ${prompt("pulse")} clears bullets and hits nearby enemies.</div><div class="info-card"><b>03 / Keep it topped up</b>Fly directly over green fuel barges. A full pass refills fuel and repairs one hull point. Brake to stay over them longer.</div><div class="info-card"><b>04 / Break the blockade</b>Destroy both bridges for checkpoints. Sink the Ironwake, then fly clear. Kills build a score chain.</div></div><p class="blurb">Mouse: move over the river to steer, hold left click to fire. Touch: drag anywhere to steer; cannon and emergency rolls are assisted. Tap the pulse button when danger closes in.</p><p class="blurb">Local co-op: pilot 1 uses WASD / Space / Shift / Q; pilot 2 uses arrows / Enter / Slash / Period. Two standard controllers also work. Hull, fuel, and score are shared.</p>${backRow()}`,
		);
	if (which === "room")
		content = panel(
			"Leave a purple wake",
			"Ghost challenge",
			`<div class="local-note"><b>Online with AI Hub</b><br>Launch this game in an AI Hub session for 1–4 networked pilots. Race your own mission with live, non-colliding ghosts and a shared score board.</div><div class="local-note"><b>Browser-local rooms</b><br>Open the game in another tab in this browser, enter the same room code, and fly. These rooms connect tabs on this device; they do not connect separate devices.</div><div class="row"><label for="roomCode">Room code</label><input id="roomCode" maxlength="16" type="text" value="${escapeHTML(network.room || "RIVER82")}" autocomplete="off"></div><p class="blurb" id="roomStatus">${network.room ? `Room ${escapeHTML(network.room)} · ${network.peers.size} other pilot(s)` : "Your ghost appears when the other pilot is in the same stretch of river."}</p><div class="menu-list">${action("Join room & fly", "joinRoom", "browser-local", true)}${network.room ? action("Leave room", "leaveRoom") : ""}</div>${backRow()}`,
		);
	if (which === "dev") {
		const sliders = [
			["speed", "Cruise speed", 6, 32, 0.5],
			["steering", "Steering speed", 5, 25, 0.5],
			["fireRate", "Cannon / second", 2, 16, 0.5],
			["fuelDrain", "Fuel / second", 0, 3, 0.05],
			["enemyRate", "Enemy fire rate", 0, 3, 0.1],
			["damage", "Collision damage", 0, 4, 0.25],
			["timeScale", "Time scale", 0.25, 3, 0.25],
		];
		content = panel(
			"Live mission tuning",
			"Developer tools",
			`<div class="scroll-body">${sliders.map(([k, label, min, max, step]) => `<div class="row"><label for="tune-${k}">${label}</label><input type="range" id="tune-${k}" data-tuning="${k}" min="${min}" max="${max}" step="${step}" value="${tuning[k]}"><output>${tuning[k]}</output></div>`).join("")}<div class="row"><label for="invul">Invulnerable / infinite fuel</label><input id="invul" type="checkbox" data-dev="god" ${godMode ? "checked" : ""}></div><div class="row"><label for="auto">Autopilot</label><input id="auto" type="checkbox" data-dev="auto" ${autoPilot ? "checked" : ""}></div><div class="back-row">${action("Repair & resupply", "resupply")}${action("Clear hostiles", "clearHostiles")}</div><div class="back-row">${action("Sector 1", "warp0")}${action("Sector 2", "warp1")}${action("Boss encounter", "warp2")}</div><div id="debugLine"></div></div>${backRow(action("Reset defaults", "resetTuning"))}`,
		);
	}
	if (which === "about") {
		const s = CREDITS.sourceInformation;
		content = panel(
			"Made for the long way upstream",
			"About / credits",
			`<p class="footer-note" data-scroll-hint></p><div class="scroll-body" tabindex="0" data-menu-scroll aria-label="Source information and credits"><p><b>Upstream Uproar</b> is an original arcade river-flight game inspired by the fuel pressure, river banks, and bridge busting of River Raid (1982). Original procedural art, writing, music, and sound.</p><h3>Source Information</h3>${Object.entries(
				s,
			)
				.map(
					([k, v]) =>
						`<div class="credit-row"><b>${escapeHTML(k)}:</b> ${escapeHTML(v)}</div>`,
				)
				.join(
					"",
				)}${["testingFeedback", "engineFeedback", "promptFeedback"].map((key, i) => `<h3>${["Testing Feedback", "Engine Feedback", "Prompt Feedback"][i]}</h3>${CREDITS[key].map((t, j) => `<p class="feedback-item"><b>${FEEDBACK_QUESTIONS[key][j]}</b><br>${escapeHTML(t)}</p>`).join("")}`).join("")}<h3>Built with</h3><p>Three.js by the Three.js contributors · Rapier by Dimforge · Barlow typeface by Jeremy Tribby, with local system fallbacks · AI Hub Session Protocol v1 / client 1.4.0. No recorded audio or raster art assets.</p></div>${backRow()}`,
		);
	}
	if (which === "results") {
		const won = bossDefeated && progress >= FINISH_AT;
		const rank = won ? (score > 18000 ? "S" : score > 12000 ? "A" : "B") : "—";
		content = panel(
			won ? "The current is free again" : "The river keeps its secrets",
			won ? "Clear water ahead!" : "Wings down.",
			`<p class="blurb">${won ? "Finch: “That boat had it coming. Same time tomorrow?”" : "Finch: “We saved you a seat. And another propeller.”"}</p><div class="metrics"><div class="metric"><b>${padNumber(score)}</b><small>Score</small></div><div class="metric"><b>${rank}</b><small>Flight rank</small></div><div class="metric"><b>${Math.floor(elapsed / 60)}:${Math.floor(
				elapsed % 60,
			)
				.toString()
				.padStart(
					2,
					"0",
				)}</b><small>Flight time</small></div></div><p class="blurb">${kills} targets · ${bridges} bridges · ${refuels} fuel passes · ${rolls} rolls<br>Best score ${padNumber(best)}</p><div class="menu-list">${action("One more run", "restart", prompt("accept"), true)}${action("Return to title", "title")}</div>`,
		);
	}
	$("menu").innerHTML = content;
	$("menu")
		.querySelectorAll("[data-action]")
		.forEach((el) =>
			el.addEventListener("click", () => handleAction(el.dataset.action)),
		);
	menuControls().forEach((el) =>
		el.addEventListener("pointerenter", (e) => {
			if (e.pointerType === "mouse" && inputMode === "mouse")
				el.focus({ preventScroll: true });
		}),
	);
	$("menu")
		.querySelectorAll("[data-setting]")
		.forEach((el) =>
			el.addEventListener("input", () => {
				const k = el.dataset.setting;
				settings[k] =
					el.type === "checkbox"
						? el.checked
						: el.type === "range"
							? +el.value / 100
							: el.value;
				if (el.nextElementSibling?.tagName === "OUTPUT")
					el.nextElementSibling.textContent =
						Math.round(settings[k] * 100) + "%";
				audio.setMusic(settings.music);
				audio.setSfx(settings.sfx);
				saveSettings();
				updatePrompts();
			}),
		);
	$("menu")
		.querySelectorAll("[data-tuning]")
		.forEach((el) =>
			el.addEventListener("input", () => {
				tuning[el.dataset.tuning] = +el.value;
				el.nextElementSibling.textContent = el.value;
			}),
		);
	$("menu")
		.querySelectorAll("[data-dev]")
		.forEach((el) =>
			el.addEventListener("input", () => {
				if (el.dataset.dev === "god") godMode = el.checked;
				else autoPilot = el.checked;
			}),
		);
	updatePrompts();
	focusMenu(0);
	audio.pause(true);
	updateHud();
}
function handleAction(id) {
	audio.unlock();
	lastInput = performance.now();
	if (id === "solo" || id === "coop") {
		resetRun({ coop: id === "coop" });
		return;
	}
	if (id === "resume") {
		resume();
		return;
	}
	if (id === "restart") {
		resetRun({ coop });
		return;
	}
	if (id === "title") {
		goTitle();
		return;
	}
	if (id === "fullscreen") {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else document.documentElement.requestFullscreen?.().catch(() => {});
		return;
	}
	if (id === "back") {
		if (
			network.active &&
			!["settings", "instructions", "about", "dev"].includes(state)
		)
			return;
		showMenu(network.active || previousMenu === "paused" ? "paused" : "title");
		return;
	}
	if (["settings", "instructions", "about", "dev", "room"].includes(id)) {
		if (state === "title" || state === "paused") previousMenu = state;
		showMenu(id);
		return;
	}
	if (id === "joinRoom") {
		const code = $("roomCode").value;
		if (network.joinRoom(code)) {
			resetRun({});
			radio(`Ghost room ${network.room}. Keep an eye out for purple wings.`);
		} else
			$("roomStatus").textContent =
				"This browser does not support local rooms.";
		return;
	}
	if (id === "leaveRoom") {
		network.leaveRoom();
		showMenu("room");
		return;
	}
	if (id === "resetSettings") {
		Object.assign(settings, {
			music: 0.1,
			sfx: 0.7,
			glyphs: "playstation",
			shake: true,
			assist: false,
		});
		saveSettings();
		audio.setMusic(0.1);
		audio.setSfx(0.7);
		showMenu("settings");
		return;
	}
	if (id === "resetTuning") {
		Object.assign(tuning, DEFAULTS);
		godMode = false;
		autoPilot = false;
		showMenu("dev");
		return;
	}
	if (id === "resupply") {
		hull = 4;
		fuel = 100;
		pulses = 3;
		lives = 3;
		banner("Fresh wings", "Fully repaired & refueled");
		updateHud();
		return;
	}
	if (id === "clearHostiles") {
		for (const e of [...entities])
			if (e.type !== "fuel") destroyEntity(e, true);
		for (const b of [...enemyBullets]) removeObject(b, enemyBullets);
		updateHud();
		return;
	}
	if (id.startsWith("warp")) {
		const target = [0, 850, 2350][+id.slice(-1)];
		const wasCoop = coop;
		resetRun({ coop: wasCoop, at: target });
		godMode = true;
		state = "paused";
		previousMenu = "paused";
		showMenu("dev");
		return;
	}
}
function pause() {
	if (state !== "playing" || attract || hubEnded) return;
	keys.clear();
	mouseHeld = false;
	hideTouchStick();
	previousMenu = "paused";
	showMenu("paused");
}
function resume() {
	if (hubEnded) return;
	state = "playing";
	$("menu").classList.add("hidden");
	$("hud").classList.remove("hidden");
	document.body.classList.add("in-flight");
	audio.pause(false);
	keys.clear();
	lastInput = performance.now();
}
function goTitle() {
	if (network.active) return;
	attract = false;
	autoPilot = false;
	clearObjects();
	players.forEach((p) => scene.remove(p.mesh));
	players = [];
	state = "title";
	titleProgress = progress || 250;
	lastInput = performance.now();
	showMenu("title");
	$("ghosts").classList.add("hidden");
	hideTouchStick();
}
function banner(title, subtitle, duration = 3) {
	$("banner").querySelector("strong").textContent = title;
	$("banner").querySelector("small").textContent = subtitle;
	bannerClock = duration;
	$("banner").classList.remove("hidden");
}
function radio(text, voice = "radio") {
	if (text === lastRadio && radioClock > 0) return;
	lastRadio = text;
	radioClock = 6;
	$("radioText").textContent = text;
	audio.voice(voice);
}
function createPhysicsObject(obj, half) {
	const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
		obj.x,
		0,
		obj.z,
	);
	obj.body = physics.createRigidBody(desc);
	const c = RAPIER.ColliderDesc.cuboid(...half)
		.setSensor(true)
		.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
		.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
	obj.collider = physics.createCollider(c, obj.body);
	colliders.set(obj.collider.handle, obj);
}
function disposeMesh(group) {
	group.traverse((o) => {
		if (o.geometry) o.geometry.dispose();
		if (o.userData?.ownedTexture) {
			o.userData.ownedTexture.dispose();
			o.material.dispose();
		}
		if (o.isMesh && o.material?.transparent && o.material.opacity === 0.6)
			o.material.dispose();
	});
}
function removeObject(obj, list) {
	if (obj.dead) return;
	obj.dead = true;
	if (obj.body) {
		colliders.delete(obj.collider.handle);
		physics.removeRigidBody(obj.body);
		obj.body = null;
	}
	if (obj.mesh) {
		scene.remove(obj.mesh);
		disposeMesh(obj.mesh);
	}
	if (list) {
		const i = list.indexOf(obj);
		if (i >= 0) list.splice(i, 1);
	}
}
function clearObjects() {
	for (const list of [entities, bullets, enemyBullets])
		for (const e of [...list]) removeObject(e, list);
	for (const p of players)
		if (p.body) {
			colliders.delete(p.collider.handle);
			physics.removeRigidBody(p.body);
			p.body = null;
		}
	colliders.clear();
}
function spawnPlayer(index) {
	const made = makePlane(index ? 0x63d9c0 : 0xff7048);
	const x = river(progress).center + (coop ? (index ? 2.7 : -2.7) : 0);
	const p = {
		id: nextId++,
		type: "player",
		index,
		mesh: made.group,
		mixer: made.mixer,
		x,
		z: coop ? 6 : 5,
		roll: 0,
		rollCooldown: 0,
		fireCooldown: 0,
		invul: 3,
		bank: 0,
		dead: false,
	};
	p.mesh.position.set(x, 1.7, p.z);
	scene.add(p.mesh);
	createPhysicsObject(p, [0.65, 1, 0.9]);
	players.push(p);
	return p;
}
function buildMission() {
	const specs = [];
	for (let at = 90, i = 0; at < 2330; at += 27 + (i % 4) * 6, i++) {
		const type = i % 7 === 3 ? "turret" : i % 4 === 1 ? "heli" : "boat";
		specs.push({ type, at, ratio: Math.sin(i * 2.4) * 0.68 });
		if (i > 10 && i % 4 === 0)
			specs.push({
				type: "boat",
				at: at + 10,
				ratio: -Math.sin(i * 2.4) * 0.65,
			});
	}
	for (let i = 0, at = 175; at < 2300; at += 240, i++)
		specs.push({ type: "fuel", at, ratio: Math.sin(i * 1.7) * 0.4 });
	for (const at of [780, 1580]) specs.push({ type: "bridge", at, ratio: 0 });
	specs.push(
		{ type: "fuel", at: 2310, ratio: 0 },
		{ type: "boss", at: BOSS_AT, ratio: 0 },
	);
	return specs
		.sort((a, b) => a.at - b.at)
		.map((s) => ({
			id: nextId++,
			...s,
			dead: false,
			active: false,
			x: river(s.at).center + river(s.at).width * s.ratio,
			z: 5 - (s.at - progress),
			hp: { boat: 3, heli: 2, turret: 5, fuel: 1, bridge: 26, boss: 190 }[
				s.type
			],
			maxHp: { boat: 3, heli: 2, turret: 5, fuel: 1, bridge: 26, boss: 190 }[
				s.type
			],
			cooldown: 1 + (s.at % 5) * 0.2,
			age: 0,
		}));
}
function resetRun(options = {}) {
	clearObjects();
	players.forEach((p) => {
		scene.remove(p.mesh);
		disposeMesh(p.mesh);
	});
	players = [];
	coop = !!options.coop;
	attract = !!options.attract;
	autoPilot = false;
	progress = options.at || 0;
	score = 0;
	fuel = 100;
	hull = 4;
	lives = 3;
	pulses = 3;
	combo = 1;
	comboClock = 0;
	kills = 0;
	bridges = progress >= 1600 ? 2 : progress >= 800 ? 1 : 0;
	refuels = 0;
	elapsed = 0;
	checkpoint = progress >= 1600 ? 1600 : progress >= 800 ? 800 : 0;
	bossDefeated = false;
	sector = 0;
	shownSector = -1;
	rolls = 0;
	shots = 0;
	deaths = 0;
	clearTimer = 0;
	stats = {
		collisions: 0,
		damage: 0,
		fuelCollected: 0,
		bridgeKills: 0,
		bossPhases: 0,
		simSteps: 0,
	};
	entities = buildMission();
	entities = entities.filter((e) => e.at > progress - 8);
	spawnPlayer(0);
	if (coop) spawnPlayer(1);
	mouseX = null;
	mouseHeld = false;
	hideTouchStick();
	state = "playing";
	$("menu").classList.add("hidden");
	$("hud").classList.remove("hidden");
	$("bossHud").classList.add("hidden");
	$("attractTag").classList.toggle("hidden", !attract);
	document.body.classList.add("in-flight");
	audio.pause(false);
	keys.clear();
	pulseQueued = false;
	rollQueued = false;
	accumulator = 0;
	network.reported = false;
	banner(
		progress > 2300 ? "The Ironwake" : "Sector 01 · Sandbar Shuffle",
		progress > 2300
			? "Bust the boat. Free the current."
			: "Keep it low. Keep it moving.",
	);
	radio("Keep your wings dry, hotshot. Green barges mean fuel.");
	updateHud();
}
function activateEntity(e) {
	e.active = true;
	e.mesh = makeEntity(e.type);
	scene.add(e.mesh);
	if (e.type === "fuel") {
		const labelCanvas = document.createElement("canvas");
		labelCanvas.width = 256;
		labelCanvas.height = 80;
		const ctx = labelCanvas.getContext("2d");
		ctx.fillStyle = "#102b35";
		ctx.fillRect(0, 0, 256, 80);
		ctx.strokeStyle = "#42d8bc";
		ctx.lineWidth = 7;
		ctx.strokeRect(3, 3, 250, 74);
		ctx.fillStyle = "#fff0cc";
		ctx.font = "bold 40px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("FUEL +", 128, 54);
		const texture = new THREE.CanvasTexture(labelCanvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		const tag = new THREE.Sprite(
			new THREE.SpriteMaterial({ map: texture, depthTest: false }),
		);
		tag.scale.set(3.5, 1.1, 1);
		tag.position.set(0, 2.8, 0);
		tag.userData.ownedTexture = texture;
		e.mesh.add(tag);
	}
	if (e.type === "bridge") e.mesh.scale.x = river(e.at).width / 10 + 0.2;
	const half = {
		boat: [0.9, 1, 1.5],
		heli: [0.9, 1, 1],
		fuel: [1.5, 1, 2.4],
		bridge: [river(e.at).width + 1, 1, 1.5],
		boss: [2.9, 1, 4],
		turret: [0.9, 1, 0.9],
	}[e.type];
	createPhysicsObject(e, half);
	if (e.type === "boss") {
		banner("Ironwake", "Make a little room upstream", 3);
		radio(
			"That is one very stubborn boat. Hit it between the volleys!",
			"danger",
		);
		stats.bossPhases = 1;
	}
	if (e.type === "bridge") {
		radio("Bridge blockade ahead. Cannon first. Questions later.");
	}
}
function fire(p) {
	if (p.fireCooldown > 0) return;
	p.fireCooldown = 1 / tuning.fireRate;
	shots++;
	audio.shoot();
	const assist = settings.assist || inputMode === "touch";
	let vx = 0;
	if (assist) {
		const target = entities
			.filter(
				(e) => e.active && e.type !== "fuel" && e.z < p.z - 3 && e.z > p.z - 55,
			)
			.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
		if (target) vx = clamp((target.x - p.x) * 2, -10, 10);
	}
	const b = {
		id: nextId++,
		type: "bullet",
		x: p.x,
		z: p.z - 2.2,
		vx,
		vz: -65,
		life: 1.3,
		owner: p.index,
		mesh: makeEntity("bullet"),
		dead: false,
	};
	scene.add(b.mesh);
	b.mesh.position.set(b.x, 1.4, b.z);
	createPhysicsObject(b, [0.23, 1, 0.65]);
	bullets.push(b);
}
function enemyFire(e) {
	if (tuning.enemyRate <= 0) return;
	const target = players[Math.floor(e.age) % players.length] || players[0];
	if (!target) return;
	const speed = e.type === "boss" ? 16 : 12;
	const dx = target.x - e.x,
		dz = target.z - e.z,
		len = Math.hypot(dx, dz) || 1;
	const spread =
		e.type === "boss"
			? e.hp < e.maxHp * 0.5
				? [-0.38, -0.19, 0, 0.19, 0.38]
				: [-0.24, 0, 0.24]
			: [0];
	for (const angle of spread) {
		const a = Math.atan2(dx, dz) + angle,
			b = {
				id: nextId++,
				type: "enemyBullet",
				x: e.x,
				z: e.z + 1.8,
				vx: Math.sin(a) * speed,
				vz: Math.cos(a) * speed,
				life: 7,
				mesh: makeEntity("enemyBullet"),
				dead: false,
			};
		scene.add(b.mesh);
		createPhysicsObject(b, [0.26, 1, 0.26]);
		enemyBullets.push(b);
	}
}
function roll(p) {
	if (p.rollCooldown > 0 || p.roll > 0) return;
	p.roll = 0.7;
	p.rollCooldown = 4.5;
	p.invul = Math.max(p.invul, 0.8);
	rolls++;
	audio.voice("roll");
}
function pulse() {
	if (pulses <= 0) return;
	pulses--;
	shake = 0.3;
	flash = 0.12;
	audio.explosion();
	for (const p of players) {
		world.makeBurst(p.x, p.z, 0x60f3ca);
		p.invul = Math.max(p.invul, 1.5);
	}
	for (const b of [...enemyBullets]) removeObject(b, enemyBullets);
	for (const e of [...entities])
		if (e.active && e.type !== "fuel" && e.z > -48 && e.z < 18) {
			e.hp -= e.type === "boss" ? 32 : 12;
			if (e.hp <= 0) destroyEntity(e);
			else world.makeBurst(e.x, e.z);
		}
	banner("River pulse", `${pulses} remaining · bullets cleared`, 1);
	updateHud();
}
function destroyEntity(e, silent = false) {
	if (e.dead) return;
	const type = e.type,
		ex = e.x,
		ez = e.z;
	removeObject(e, entities);
	if (!silent) {
		const points =
			{ boat: 150, heli: 200, turret: 250, bridge: 1000, boss: 5000 }[type] ||
			0;
		score += points * combo;
		kills++;
		comboClock = 4;
		combo = clamp(combo + 1, 1, 5);
		world.makeBurst(ex, ez, type === "boss" ? 0xff7048 : 0xffd467);
		audio.explosion();
		shake = Math.max(shake, type === "boss" ? 0.65 : 0.12);
	}
	if (type === "bridge") {
		bridges++;
		stats.bridgeKills++;
		checkpoint = e.at + 20;
		fuel = clamp(fuel + 25, 0, 100);
		pulses = Math.min(3, pulses + 1);
		banner("Bridge busted!", `Checkpoint ${bridges} / 2 · fuel +25 · pulse +1`);
		radio("One less toll to pay. Nice flying!", "win");
	}
	if (type === "boss") {
		bossDefeated = true;
		score += 2000;
		banner("Ironwake sunk!", "The river is yours. Fly clear!", 4);
		radio("Clear water ahead! Bring those wings home.", "victory");
		$("bossHud").classList.add("hidden");
		for (const b of [...enemyBullets]) removeObject(b, enemyBullets);
		fuel = Math.max(fuel, 45);
	}
}
function takeDamage(p, amount = tuning.damage, reason = "hit") {
	if (p.invul > 0 || godMode || attract || autoPilot || amount <= 0) return;
	stats.damage += amount;
	hull -= amount;
	p.invul = 1.8;
	combo = 1;
	comboClock = 0;
	shake = 0.4;
	flash = 0.35;
	audio.explosion();
	world.makeBurst(p.x, p.z, 0xff7048);
	radio(
		reason === "bank"
			? "Easy on the banks! Keep your wingtips inside."
			: "That scratched the paint. Roll through the next one!",
		"hit",
	);
	if (hull <= 0) {
		lives--;
		deaths++;
		if (lives <= 0) {
			finishRun(false);
			return;
		}
		respawn();
	}
}
function respawn() {
	const keptScore = score,
		keptKills = kills,
		keptStats = { ...stats },
		keptTime = elapsed,
		keptLives = lives,
		keptDeaths = deaths,
		keptRefuels = refuels;
	const checkpointAt = checkpoint;
	resetRun({ coop, at: checkpointAt });
	score = keptScore;
	kills = keptKills;
	stats = keptStats;
	elapsed = keptTime;
	lives = keptLives;
	deaths = keptDeaths;
	refuels = keptRefuels;
	fuel = 85;
	banner("Fresh propeller", `${lives} aircraft left · checkpoint restored`);
	radio("Back in the air. We are not done yet.");
}
function finishRun(won) {
	if (state !== "playing") return;
	if (attract) {
		clearTimer = 4;
		state = "attractEnd";
		banner(won ? "Clear water!" : "Another run?", "Autopilot loops shortly", 4);
		return;
	}
	best = Math.max(best, score);
	try {
		localStorage.setItem("upstream-best", String(best));
	} catch {}
	if (network.active) {
		network.result(score, {
			Targets: kills,
			Bridges: bridges,
			"Fuel passes": refuels,
		});
		state = "hubresult";
		banner(
			won ? "Mission complete" : "Wings down",
			`Score ${padNumber(score)} · waiting for the other pilots`,
			360,
		);
		audio.pause(true);
		return;
	}
	network.result(score, { Targets: kills });
	showMenu("results");
	audio.setMusic(0);
	audio.pause(false);
	audio.voice(won ? "victory" : "hit");
	resultVoiceUntil = performance.now() + 900;
}
function inputFor(p) {
	let x = 0,
		y = 0,
		fireHeld = false,
		rollPressed = false,
		pulsePressed = false;
	const pad = connectedPads()[p.index];
	if (pad?.connected !== false && pad) {
		x = Math.abs(pad.axes[0] || 0) > 0.13 ? pad.axes[0] : 0;
		y = Math.abs(pad.axes[1] || 0) > 0.13 ? pad.axes[1] : 0;
		fireHeld = !!(pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
		rollPressed = !!pad.buttons[5]?.pressed;
		pulsePressed = !!pad.buttons[1]?.pressed;
	}
	if (p.index === 0) {
		x += (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
		y += (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
		if (!coop) {
			x += (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
			y += (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
		}
		fireHeld ||=
			keys.has("Space") ||
			keys.has("KeyJ") ||
			mouseHeld ||
			settings.assist ||
			inputMode === "touch";
		rollPressed ||=
			keys.has("ShiftLeft") || keys.has("ShiftRight") || rollQueued;
		pulsePressed ||= pulseQueued;
		if (inputMode === "touch" && touchControl) {
			x = touchControl.x;
			y = touchControl.y;
		}
		if (inputMode === "mouse" && mouseX !== null && Math.abs(x) < 0.1)
			x = clamp((mouseX - p.x) * 3, -1, 1);
	} else {
		x += (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
		y += (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
		fireHeld ||= keys.has("Enter");
		rollPressed ||= keys.has("Slash");
		pulsePressed ||= keys.has("Period");
	}
	if (attract || autoPilot) {
		const upcomingFuel = entities.find(
			(e) => e.type === "fuel" && e.at - progress > -2 && e.at - progress < 45,
		);
		const target = entities
			.filter((e) => e.active && e.type !== "fuel" && e.z < 0 && e.z > -50)
			.sort((a, b) => b.z - a.z)[0];
		const safe = river(progress + 6).center;
		const aim =
			upcomingFuel && fuel < 92 ? upcomingFuel.x : target ? target.x : safe;
		x = clamp((aim - p.x) * 2, -1, 1);
		y = -0.1;
		fireHeld = true;
		rollPressed = Math.floor(elapsed * 2) % 14 === 0;
		pulsePressed = pulses > 0 && enemyBullets.length > 10;
	}
	return {
		x: clamp(x, -1, 1),
		y: clamp(y, -1, 1),
		fire: fireHeld,
		roll: rollPressed,
		pulse: pulsePressed,
	};
}
function simulate(dt) {
	if (state !== "playing") return;
	stats.simSteps++;
	elapsed += dt;
	comboClock -= dt;
	if (comboClock <= 0) combo = 1;
	const inputs = players.map(inputFor);
	const throttle = inputs[0]?.y || 0;
	let speed = tuning.speed * (1 - throttle * 0.42);
	const boss = entities.find((e) => e.type === "boss");
	if (boss && !bossDefeated && progress >= BOSS_AT - 22) speed = 0;
	const blockade = entities.find(
		(e) => e.type === "bridge" && !e.dead && progress >= e.at - 12,
	);
	if (blockade) speed = 0;
	progress = Math.min(FINISH_AT + 2, progress + speed * dt);
	fuel -=
		tuning.fuelDrain *
		dt *
		(speed > 0 ? 1 + Math.max(0, -throttle) * 0.25 : 0.65);
	if (godMode || attract || autoPilot) fuel = Math.max(fuel, 70);
	fuel = clamp(fuel, 0, 100);
	if (fuel < 25 && fuel > 24.9)
		radio("Fuel is getting shy. Overfly a green barge.", "danger");
	if (fuel <= 0) {
		fuel = 0;
		takeDamage(players[0], 1, "fuel");
	}
	for (let i = 0; i < players.length; i++) {
		const p = players[i],
			input = inputs[i];
		p.invul = Math.max(0, p.invul - dt);
		p.rollCooldown = Math.max(0, p.rollCooldown - dt);
		p.fireCooldown = Math.max(0, p.fireCooldown - dt);
		p.x += input.x * tuning.steering * dt;
		p.z = lerp(p.z, 5 + input.y * 2.2, dt * 4);
		const r = river(progress - p.z + 5),
			margin = 0.75;
		if (inputMode === "touch" || attract || autoPilot) {
			p.x = clamp(
				p.x,
				r.center - r.width + margin,
				r.center + r.width - margin,
			);
			if (
				inputMode === "touch" &&
				enemyBullets.some((b) => Math.hypot(b.x - p.x, b.z - p.z) < 2.6)
			)
				roll(p);
		}
		if (Math.abs(p.x - r.center) > r.width - 0.3)
			takeDamage(p, tuning.damage, "bank");
		p.x = clamp(p.x, r.center - r.width - 1, r.center + r.width + 1);
		p.bank = lerp(p.bank, -input.x * 0.4, dt * 7);
		if (input.roll) roll(p);
		if (input.pulse && pulses > 0 && !p.pulseLatch) pulse();
		p.pulseLatch = input.pulse;
		if (input.fire) fire(p);
		p.roll = Math.max(0, p.roll - dt);
		p.mesh.rotation.z =
			p.bank + (p.roll > 0 ? (1 - p.roll / 0.7) * Math.PI * 2 : 0);
		p.mesh.position.set(p.x, 1.7 + Math.sin(visualTime * 3 + i) * 0.04, p.z);
		p.mesh.visible =
			p.invul <= 0 || Math.floor(elapsed * 12) % 2 === 0 || p.roll > 0;
		p.body?.setNextKinematicTranslation({ x: p.x, y: 0, z: p.z });
		p.mixer.update(dt);
	}
	pulseQueued = false;
	rollQueued = false;
	let shouldRefuel = false;
	for (const e of [...entities]) {
		e.z = 5 - (e.at - progress);
		if (e.z > 20) {
			removeObject(e, entities);
			continue;
		}
		if (!e.active && e.z > -76) activateEntity(e);
		if (!e.active) continue;
		e.age += dt;
		if (e.type === "heli")
			e.x =
				river(e.at).center +
				Math.sin(e.age * 0.9 + e.at) * Math.min(6, river(e.at).width - 2);
		if (e.type === "boat")
			e.x =
				river(e.at).center +
				river(e.at).width * e.ratio +
				Math.sin(e.age * 0.65 + e.at) * 0.7;
		if (e.type === "boss") {
			e.x = river(e.at).center + Math.sin(e.age * 0.6) * 3.7;
			if (e.hp < e.maxHp * 0.5 && stats.bossPhases === 1) {
				stats.bossPhases = 2;
				radio("Its engines are hot. Watch the wide volleys!", "danger");
				banner("Ironwake enraged", "Keep rolling. Keep firing.", 2);
			}
		}
		e.mesh.position.set(e.x, e.type === "heli" ? 1.7 : 0.25, e.z);
		if (e.type === "heli")
			e.mesh.rotation.z = Math.cos(e.age * 0.9 + e.at) * -0.1;
		if (e.mesh.userData.rotor) e.mesh.userData.rotor.rotation.y += dt * 28;
		if (e.mesh.userData.ring) e.mesh.userData.ring.rotation.z += dt;
		if (e.mesh.userData.radar) e.mesh.userData.radar.rotation.y += dt;
		e.body.setNextKinematicTranslation({ x: e.x, y: 0, z: e.z });
		if (
			["boat", "heli", "turret", "boss"].includes(e.type) &&
			e.z > -58 &&
			e.z < 4
		) {
			e.cooldown -= dt * tuning.enemyRate;
			if (e.cooldown <= 0) {
				enemyFire(e);
				e.cooldown =
					e.type === "boss"
						? e.hp < e.maxHp * 0.5
							? 0.75
							: 1.15
						: e.type === "turret"
							? 1.9
							: 3.2;
			}
		}
		if (
			e.type === "fuel" &&
			players.some(
				(p) => Math.abs(p.x - e.x) < 1.9 && Math.abs(p.z - e.z) < 3.2,
			)
		) {
			shouldRefuel = true;
			const amount = Math.min(100 - fuel, 62 * dt);
			fuel += amount;
			stats.fuelCollected += amount;
			if (!e.collected) {
				e.collected = true;
				refuels++;
				hull = Math.min(4, hull + 1);
				score += 350;
				audio.pickup();
				radio("Topped up. Wings patched. Cause some trouble!", "pickup");
			}
		}
	}
	for (const b of [...bullets, ...enemyBullets]) {
		b.x += b.vx * dt;
		b.z += b.vz * dt + (b.type === "enemyBullet" ? speed * dt : 0);
		b.life -= dt;
		b.mesh.position.set(b.x, 1.4, b.z);
		b.mesh.rotation.y =
			b.type === "bullet" ? Math.atan2(-b.vx, 65) : visualTime * 3;
		b.body?.setNextKinematicTranslation({ x: b.x, y: 0, z: b.z });
		if (b.life <= 0 || b.z < -85 || b.z > 23 || Math.abs(b.x) > 40)
			removeObject(b, b.type === "bullet" ? bullets : enemyBullets);
	}
	physics.timestep = dt;
	physics.step(eventQueue);
	const contacts = [];
	eventQueue.drainCollisionEvents((a, b, started) => {
		if (started) contacts.push([colliders.get(a), colliders.get(b)]);
	});
	for (let [a, b] of contacts) {
		if (!a || !b || a.dead || b.dead) continue;
		stats.collisions++;
		if (b.type === "bullet" || b.type === "player") {
			[a, b] = [b, a];
		}
		if (
			a.type === "bullet" &&
			b.type !== "player" &&
			b.type !== "bullet" &&
			b.type !== "enemyBullet" &&
			b.type !== "fuel"
		) {
			removeObject(a, bullets);
			b.hp -= 2;
			if (b.hp <= 0) destroyEntity(b);
			else if (b.type === "bridge" || b.type === "boss")
				world.makeBurst(a.x, a.z, 0xffd467);
		} else if (
			a.type === "player" &&
			b.type !== "bullet" &&
			b.type !== "player" &&
			b.type !== "fuel"
		) {
			takeDamage(a);
			if (b.type === "enemyBullet") removeObject(b, enemyBullets);
			else if (!["bridge", "boss"].includes(b.type)) destroyEntity(b);
		}
	}
	if (shouldRefuel) $("fuelFill").style.background = "#fff0cc";
	else $("fuelFill").style.background = fuel < 25 ? "#ff7048" : "#42d8bc";
	sector = progress < 820 ? 0 : progress < 1640 ? 1 : 2;
	if (sector !== shownSector) {
		shownSector = sector;
		if (sector > 0) {
			banner(
				SECTORS[sector],
				`Sector 0${sector + 1} · ${sector === 1 ? "Keep your wingtips inside" : "Last stop: river lockdown"}`,
			);
			radio(
				sector === 1
					? "Needle Bend. Small river, big attitude."
					: "Ironwake territory. Give them a proper hello.",
			);
		}
	}
	if (progress >= FINISH_AT && bossDefeated && bridges >= 2) finishRun(true);
}
function updateHud() {
	$("score").textContent = padNumber(score);
	$("best").textContent = "BEST " + padNumber(best);
	$("sectorLabel").textContent = `Sector 0${sector + 1} / 03`;
	$("sectorName").textContent = SECTORS[sector];
	$("routeFill").style.width =
		clamp((progress / FINISH_AT) * 100, 0, 100) + "%";
	$("hull").textContent =
		"◆".repeat(Math.ceil(Math.max(0, hull))) +
		"◇".repeat(Math.max(0, 4 - Math.ceil(Math.max(0, hull))));
	$("lives").textContent = "×" + lives;
	$("fuelNumber").textContent = Math.ceil(fuel) + "%";
	$("fuelFill").style.width = fuel + "%";
	$("combo").textContent = combo > 1 ? "CHAIN ×" + combo : "";
	const p = players[0];
	$("rollStatus").textContent =
		p && p.rollCooldown > 0 ? p.rollCooldown.toFixed(1) + "s" : "READY";
	$("pulseStatus").textContent = pulses ? "● ".repeat(pulses).trim() : "EMPTY";
	$("touchPulse").classList.toggle("hidden", pulses <= 0);
	const boss = entities.find((e) => e.type === "boss" && e.active);
	$("bossHud").classList.toggle("hidden", !boss || state !== "playing");
	if (boss)
		$("bossFill").style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
	if (state === "dev")
		$("debugLine").textContent =
			`${diagnostics.renderer} · Rapier ${RAPIER.version()}\nDistance ${Math.floor(progress)} / ${FINISH_AT} · ${entities.filter((e) => e.active).length} hostiles · ${stats.collisions} contacts\nSeeded mission · ${stats.simSteps} simulation steps · no recorded assets`;
}
function updateGhosts(dt) {
	for (const [id, g] of network.peers) {
		let mesh = ghostMeshes.get(id);
		if (!mesh) {
			mesh = makeGhost(g.color);
			scene.add(mesh);
			ghostMeshes.set(id, mesh);
		}
		const delta = g.progress - progress;
		mesh.visible = activePlay() && Math.abs(delta) < 65 && g.sector === sector;
		mesh.position.set(g.x, 2.1, 5 - delta);
		mesh.rotation.z = g.bank;
		mesh.userData.mixer.update(dt);
	}
	for (const [id, mesh] of ghostMeshes)
		if (!network.peers.has(id)) {
			scene.remove(mesh);
			disposeMesh(mesh);
			ghostMeshes.delete(id);
		}
	const visible = network.peers.size > 0 && state === "playing";
	$("ghosts").classList.toggle("hidden", !visible);
	if (visible)
		$("ghosts").textContent = [
			network.active ? "LIVE RIVER GHOSTS" : "BROWSER-LOCAL GHOSTS",
			...[...network.peers.values()].map(
				(g) =>
					`${g.name}   ${padNumber(g.score)}   ${Math.abs(g.progress - progress) < 65 ? "IN SIGHT" : Math.round((g.progress - progress) / 16) + "s"}`,
			),
		].join("\n");
}
function pollGamepads(dt) {
	menuCooldown = Math.max(0, menuCooldown - dt);
	const pads = connectedPads();
	for (const pad of pads) {
		if (!pad) continue;
		const prior = previousPads.get(pad.index) || [];
		const pressed = pad.buttons.map((b) => b.pressed);
		const edge = (i) => pressed[i] && !prior[i];
		const active =
			pressed.some(Boolean) || pad.axes.some((a) => Math.abs(a) > 0.25);
		if (active) {
			if (activity("pad")) {
				previousPads.set(pad.index, pressed);
				return;
			}
		}
		if (edge(9) && !pressed[8]) {
			if (state === "playing") pause();
			else if (state === "paused") resume();
		} else if (
			!["playing", "hubwait", "hubresult", "hubended", "attractEnd"].includes(
				state,
			)
		) {
			const down = edge(13) || (pad.axes[1] > 0.55 && menuCooldown <= 0),
				up = edge(12) || (pad.axes[1] < -0.55 && menuCooldown <= 0);
			if (down || up) {
				focusMenu(menuFocus + (down ? 1 : -1));
				menuCooldown = 0.2;
			}
			if (edge(0)) document.activeElement?.click();
			if (edge(1) && state !== "title") handleAction("back");
			const dir = edge(15)
				? 1
				: edge(14)
					? -1
					: Math.abs(pad.axes[0]) > 0.6 && menuCooldown <= 0
						? Math.sign(pad.axes[0])
						: 0;
			if (dir) {
				adjustFocused(dir);
				menuCooldown = 0.15;
			}
			if (Math.abs(pad.axes[3] || 0) > 0.2) scrollMenu(pad.axes[3] * dt * 550);
		}
		previousPads.set(pad.index, pressed);
	}
}
function adjustFocused(dir) {
	const e = document.activeElement;
	if (e?.type === "range") {
		e.value = clamp(+e.value + dir * (+e.step || 1), +e.min, +e.max);
		e.dispatchEvent(new Event("input", { bubbles: true }));
		return true;
	}
	if (e?.tagName === "SELECT") {
		e.selectedIndex =
			(e.selectedIndex + dir + e.options.length) % e.options.length;
		e.dispatchEvent(new Event("input", { bubbles: true }));
		return true;
	}
	return false;
}
function scrollMenu(amount) {
	const scroller = $("menu").querySelector(".scroll-body") || $("menu");
	scroller.scrollTop += amount;
}
function hideTouchStick() {
	touchControl = null;
	$("touchRing").style.display = "none";
	$("touchDot").style.display = "none";
}
const raycaster = new THREE.Raycaster(),
	aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.7),
	aimPoint = new THREE.Vector3();
function bindInput() {
	$("menu").addEventListener("focusin", (e) => {
		const index = menuControls().indexOf(e.target);
		if (index >= 0) menuFocus = index;
	});
	document.addEventListener("keydown", (e) => {
		if (activity("keyboard")) {
			e.preventDefault();
			return;
		}
		audio.unlock();
		if (e.code === "Escape") {
			if (state === "playing") pause();
			else if (state === "paused") resume();
			else if (
				["settings", "instructions", "about", "dev"].includes(state) ||
				(!network.active && ["room", "results"].includes(state))
			)
				handleAction("back");
			e.preventDefault();
			return;
		}
		if (state === "playing") {
			if (
				[
					"Space",
					"Enter",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
				].includes(e.code)
			)
				e.preventDefault();
			keys.add(e.code);
			if (e.code === "KeyQ" && !e.repeat) pulseQueued = true;
			return;
		}
		if (e.target.tagName === "INPUT" && e.target.type === "text") return;
		if (
			["hubwait", "hubresult", "hubended", "loading", "attractEnd"].includes(
				state,
			)
		)
			return;
		if (
			(e.code === "PageUp" || e.code === "PageDown") &&
			$("menu").querySelector(".scroll-body")
		) {
			scrollMenu(
				(e.code === "PageDown" ? 1 : -1) *
					$("menu").querySelector(".scroll-body").clientHeight *
					0.8,
			);
			e.preventDefault();
			return;
		}
		if (e.code === "ArrowDown" || e.code === "ArrowUp") {
			focusMenu(menuFocus + (e.code === "ArrowDown" ? 1 : -1));
			e.preventDefault();
		}
		if (
			(e.code === "ArrowLeft" || e.code === "ArrowRight") &&
			adjustFocused(e.code === "ArrowRight" ? 1 : -1)
		)
			e.preventDefault();
		if (e.code === "Enter" && !e.repeat && e.target.tagName !== "BUTTON")
			document.activeElement?.click();
	});
	document.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => {
		keys.clear();
		mouseHeld = false;
		if (!network.active && state === "playing" && !attract) pause();
	});
	document.addEventListener(
		"pointerdown",
		(e) => {
			if (activity(e.pointerType === "touch" ? "touch" : "mouse")) {
				e.stopImmediatePropagation();
				e.preventDefault();
				return;
			}
			audio.unlock();
		},
		true,
	);
	$("game").addEventListener("pointerdown", (e) => {
		if (state !== "playing") return;
		audio.unlock();
		if (e.pointerType === "touch") {
			if (touchControl && touchControl.id !== e.pointerId) return;
			touchControl = {
				id: e.pointerId,
				startX: e.clientX,
				startY: e.clientY,
				x: 0,
				y: 0,
			};
			$("touchRing").style.cssText =
				`display:block;left:${e.clientX}px;top:${e.clientY}px`;
			$("touchDot").style.cssText =
				`display:block;left:${e.clientX}px;top:${e.clientY}px`;
		} else if (e.button === 0) mouseHeld = true;
		$("game").setPointerCapture(e.pointerId);
	});
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch") {
			if (touchControl?.id === e.pointerId) {
				touchControl.x = clamp((e.clientX - touchControl.startX) / 65, -1, 1);
				touchControl.y = clamp((e.clientY - touchControl.startY) / 65, -1, 1);
				$("touchDot").style.left =
					touchControl.startX + touchControl.x * 42 + "px";
				$("touchDot").style.top =
					touchControl.startY + touchControl.y * 42 + "px";
			}
			return;
		}
		if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) {
			activity("mouse");
			const control = e.target.closest?.(
				"button,input,select,[data-menu-scroll]",
			);
			if (control && $("menu").contains(control))
				control.focus({ preventScroll: true });
		}
		if (!camera) return;
		raycaster.setFromCamera(
			new THREE.Vector2(
				(e.clientX / innerWidth) * 2 - 1,
				(-e.clientY / innerHeight) * 2 + 1,
			),
			camera,
		);
		if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) mouseX = aimPoint.x;
	});
	document.addEventListener("pointerup", (e) => {
		if (e.pointerType !== "touch") mouseHeld = false;
		if (touchControl?.id === e.pointerId) hideTouchStick();
	});
	document.addEventListener("pointercancel", (e) => {
		if (e.pointerType !== "touch") mouseHeld = false;
		if (touchControl?.id === e.pointerId) hideTouchStick();
	});
	$("pauseButton").addEventListener("click", pause);
	$("touchMenu").addEventListener("click", () => {
		if (state === "playing") pause();
		else if (state === "paused") resume();
		else if (state !== "title") handleAction("back");
	});
	$("touchPulse").addEventListener("pointerdown", (e) => {
		e.stopPropagation();
		pulseQueued = true;
	});
	window.addEventListener("resize", resize);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden && !network.active && state === "playing" && !attract)
			pause();
	});
	window.addEventListener("gamepadconnected", () => setInputMode("pad"));
	if (matchMedia("(pointer:coarse)").matches) setInputMode("touch");
}
function resize() {
	if (!renderer || !camera) return;
	renderer.setSize(innerWidth, innerHeight, false);
	const aspect = innerWidth / innerHeight,
		halfWidth = aspect < 1 ? 18 : Math.max(24, aspect * 18),
		halfHeight = halfWidth / aspect;
	camera.left = -halfWidth;
	camera.right = halfWidth;
	camera.top = halfHeight;
	camera.bottom = -halfHeight;
	camera.updateProjectionMatrix();
}
function renderFrame(now) {
	const raw = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
	lastFrame = now;
	visualTime += raw;
	pollGamepads(raw);
	if (resultVoiceUntil && (now >= resultVoiceUntil || state !== "results")) {
		resultVoiceUntil = 0;
		audio.setMusic(settings.music);
		if (state !== "playing") audio.pause(true);
	}
	if (state === "hubwait" && hubStarted && globalThis.AIHub.time() >= 0) {
		resetRun({});
	}
	if (state === "title" && now - lastInput >= 10000 && !network.active)
		resetRun({ attract: true });
	if (state === "attractEnd") {
		clearTimer -= raw;
		if (clearTimer <= 0) resetRun({ attract: true });
	}
	if (state === "playing") {
		accumulator += raw * tuning.timeScale;
		let steps = 0;
		while (accumulator >= 1 / 60 && steps < 20 && state === "playing") {
			simulate(1 / 60);
			accumulator -= 1 / 60;
			steps++;
		}
	} else accumulator = 0;
	if (
		state === "title" ||
		(["settings", "about", "instructions", "room"].includes(state) &&
			previousMenu === "title")
	) {
		titleProgress += raw * 5;
		world.render(titleProgress, visualTime);
	} else world.render(progress, visualTime);
	world.updateEffects(raw);
	updateGhosts(raw);
	bannerClock -= raw;
	if (bannerClock <= 0) $("banner").classList.add("hidden");
	radioClock -= raw;
	shake = Math.max(0, shake - raw);
	flash = Math.max(0, flash - raw * 1.5);
	$("flash").style.opacity = flash * 0.35;
	const riverCenter = river(
		state === "title" ? titleProgress : progress + 18,
	).center;
	const menuScene =
		state === "title" ||
		(["settings", "instructions", "about", "room"].includes(state) &&
			previousMenu === "title");
	for (let i = 0; i < titleFormation.length; i++) {
		const p = titleFormation[i];
		p.group.visible = menuScene;
		p.group.position.set(
			river(titleProgress).center + 3 + (i === 1 ? -5 : i === 2 ? 5 : 0),
			i ? 3 : 4,
			-8 + (i ? 6 : 0),
		);
		p.group.rotation.z =
			Math.sin(visualTime * 0.8 + i) * 0.12 + (i === 0 ? -0.12 : 0);
		p.mixer.update(raw);
	}
	const targetX = menuScene ? -10 : riverCenter * 0.4;
	camera.position.set(
		targetX + (settings.shake ? Math.sin(visualTime * 89) * shake * 0.4 : 0),
		48,
		29,
	);
	camera.lookAt(targetX, 0, menuScene ? -16 : -10.5);
	audio.update(raw, {
		playing: state === "playing" && !attract,
		speed: 1 - (inputForSafe()?.y || 0) * 0.42,
		danger: fuel < 25 || !!entities.find((e) => e.type === "boss" && e.active),
		sector,
	});
	if (state === "playing" || state === "hubresult") {
		const p = players[0];
		if (p)
			network.update(
				raw,
				{
					x: p.x,
					y: p.z,
					progress,
					bank: p.bank,
					fire: p.fireCooldown > 0,
					sector,
				},
				score,
				`${SECTORS[sector]} · ${Math.floor((progress / FINISH_AT) * 100)}%`,
			);
	}
	reportClock += raw;
	if (reportClock > 0.08) {
		updateHud();
		reportClock = 0;
	}
	renderer.render(scene, camera);
}
function inputForSafe() {
	return players[0]
		? { y: keys.has("KeyW") ? -1 : keys.has("KeyS") ? 1 : 0 }
		: null;
}
async function boot() {
	try {
		await RAPIER.init();
		physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
		eventQueue = new RAPIER.EventQueue(true);
		renderer = new THREE.WebGPURenderer({
			canvas: $("game"),
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL: new URLSearchParams(location.search).get("webgl") === "1",
		});
		renderer.setPixelRatio(
			Math.min(devicePixelRatio, network.active ? 1 : 1.7),
		);
		await renderer.init();
		diagnostics.renderer = renderer.backend?.isWebGPUBackend
			? "WebGPU"
			: "WebGL fallback";
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x78a571);
		scene.fog = new THREE.Fog(0x9fb982, 90, 180);
		scene.add(new THREE.HemisphereLight(0xfff3cf, 0x3f6975, 2.4));
		const sun = new THREE.DirectionalLight(0xffe8b3, 3.2);
		sun.position.set(-25, 60, 20);
		scene.add(sun);
		camera = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.1, 250);
		camera.position.set(0, 48, 29);
		camera.lookAt(0, 0, -16);
		world = new WorldView(scene);
		for (let i = 0; i < 3; i++) {
			const p = makePlane(i ? 0x63d9c0 : 0xff7048);
			p.group.scale.setScalar(i ? 1 : 1.5);
			scene.add(p.group);
			titleFormation.push(p);
		}
		resize();
		world.render(titleProgress, 0);
		bindInput();
		await network.init({
			onStart: () => {
				hubStarted = true;
			},
			onTimeUp: () => {
				network.result(score, {
					Targets: kills,
					Bridges: bridges,
					"Fuel passes": refuels,
				});
				state = "hubresult";
				audio.pause(true);
			},
			onEnd: () => {
				hubEnded = true;
				state = "hubended";
				keys.clear();
				mouseHeld = false;
				audio.stop();
				$("menu").classList.add("hidden");
				$("hud").classList.add("hidden");
				$("bossHud").classList.add("hidden");
				$("banner").classList.add("hidden");
			},
		});
		$("loading").classList.add("hidden");
		diagnostics.ready = true;
		diagnostics.bootMs = performance.now() - bootAt;
		if (network.active) {
			state = "hubwait";
			$("menu").classList.add("hidden");
			$("hud").classList.add("hidden");
			network.ready();
		} else showMenu("title");
		renderer.setAnimationLoop(renderFrame);
	} catch (error) {
		diagnostics.errors.push(String(error.stack || error));
		$("loadingMessage").textContent =
			"Flight could not start: " +
			error.message +
			" · Use a browser with WebGPU, and allow the CDN dependencies.";
		document.querySelector(".spinner")?.remove();
		globalThis.AIHub?.active && globalThis.AIHub.fail(error.message);
		console.error(error);
	}
}
// Read-only diagnostics are always available; mutation helpers require ?test=1.
window.__UPROAR__ = {
	get state() {
		return state;
	},
	get diagnostics() {
		return {
			...diagnostics,
			physics: RAPIER.version?.(),
			network: network.diagnostics(),
			audio: audio.diagnostics(),
		};
	},
	snapshot() {
		return {
			state,
			attract,
			coop,
			progress,
			score,
			fuel,
			hull,
			lives,
			pulses,
			combo,
			kills,
			bridges,
			refuels,
			elapsed,
			checkpoint,
			bossDefeated,
			sector,
			rolls,
			shots,
			deaths,
			stats: { ...stats },
			players: players.map((p) => ({
				x: p.x,
				z: p.z,
				invul: p.invul,
				roll: p.roll,
				rollCooldown: p.rollCooldown,
			})),
			entities: entities
				.filter((e) => e.active)
				.map((e) => ({
					id: e.id,
					type: e.type,
					x: e.x,
					z: e.z,
					hp: e.hp,
					at: e.at,
				})),
			bullets: bullets.length,
			enemyBullets: enemyBullets.length,
			tuning: { ...tuning },
			settings: { ...settings },
		};
	},
};
if (new URLSearchParams(location.search).get("test") === "1")
	Object.assign(window.__UPROAR__, {
		start: (options) => resetRun(options),
		step: (seconds) => {
			for (let i = 0; i < Math.ceil(seconds * 60) && state === "playing"; i++) {
				simulate(1 / 60);
				world.updateEffects(1 / 60);
			}
			updateHud();
			return window.__UPROAR__.snapshot();
		},
		autopilot: (v) => {
			autoPilot = v;
		},
		god: (v) => {
			godMode = v;
		},
		setFuel: (v) => {
			fuel = clamp(v, 0, 100);
		},
		setHull: (v) => {
			hull = v;
		},
		setLives: (v) => {
			lives = v;
		},
		setPlayer: (x, z = 5) => {
			players[0].x = x;
			players[0].z = z;
			players[0].invul = 0;
		},
		hurt: () => takeDamage(players[0]),
		fire: () => fire(players[0]),
		roll: () => roll(players[0]),
		pulse,
		warp: (at) => resetRun({ at }),
		setTuning: (k, v) => {
			if (k in tuning) tuning[k] = v;
		},
		setAttractIdle: () => {
			lastInput = performance.now() - 10001;
		},
		radio,
		river,
		finish: () => {
			bossDefeated = true;
			progress = FINISH_AT;
			finishRun(true);
		},
		network,
		audio,
	});
window.addEventListener("error", (e) => diagnostics.errors.push(e.message));
window.addEventListener("unhandledrejection", (e) =>
	diagnostics.errors.push(String(e.reason)),
);
boot();
