import { Game, initPhysics, DEFAULTS, SHIFTS } from "./game.js";
import { createScene } from "./scene.js";
import { AudioEngine } from "./audio.js";
import { Input } from "./input.js";
import { GritNet } from "./net.js";
import metadata from "./metadata.json";

const $ = (s) => document.querySelector(s),
	$$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const storage = {
	get(k, d) {
		try {
			return JSON.parse(localStorage.getItem("grit-" + k)) ?? d;
		} catch {
			return d;
		}
	},
	set(k, v) {
		try {
			localStorage.setItem("grit-" + k, JSON.stringify(v));
		} catch {}
	},
};
const audio = new AudioEngine();
let scene, game, input, net;
let mode = "loading",
	returnMode = "title",
	settingsReturn = "title",
	menuFocus = 0,
	lastActivity = performance.now(),
	accumulator = 0,
	lastTime = 0,
	toastTime = 0,
	remoteState = null,
	localPlayers = 1,
	runReported = false,
	finishedShown = false,
	frameCount = 0,
	onlinePaused = false,
	ignoreUntil = 0,
	eventSerial = 0,
	remoteEventSerial = 0;
const networkEvents = [];
let pendingPlay = [
	{ jump: false, action: false },
	{ jump: false, action: false },
];
let remoteRender = null;
let prefs = { music: 0.1, sfx: 0.7, glyphs: "ps", ...storage.get("prefs", {}) };
let best = storage.get("best", 0);
const overlay = $("#overlay");
function toast(message) {
	$("#toast").textContent = message;
	$("#toast").classList.add("show");
	toastTime = 3;
}
function savePrefs() {
	audio.setMusicVolume(prefs.music);
	audio.setSfxVolume(prefs.sfx);
	input.setGlyphStyle(prefs.glyphs);
	storage.set("prefs", prefs);
}
function activity(type) {
	lastActivity = performance.now();
	if (type !== "mouse" || mode === "play") audio.unlock();
	if (type === "touch") document.body.classList.add("touch");
	else if (type !== "gamepad") document.body.classList.remove("touch");
	if (mode === "attract") {
		ignoreUntil = performance.now() + 250;
		showTitle();
		return;
	}
}
function setMode(next) {
	pendingPlay = [
		{ jump: false, action: false },
		{ jump: false, action: false },
	];
	mode = next;
	input?.setMode(
		next === "play" ? "play" : next === "attract" ? "attract" : "menu",
	);
	$("#hud").hidden = !["play", "pause", "dev", "result"].includes(next);
	$("#game-footer").hidden = next !== "play";
	$("#attract-label").hidden = next !== "attract";
	$("#banner").hidden = true;
	$("#combo").hidden = true;
	$("#touch-controls").hidden = next !== "play" || !input?.isTouch;
	overlay.innerHTML = "";
	menuFocus = 0;
	input?.clear();
}
function wire() {
	const nodes = $$("[data-nav]");
	nodes.forEach((el, i) => {
		el.addEventListener("pointerenter", () => focusMenu(i, false));
		el.addEventListener("focus", () => focusMenu(i, false));
	});
	if (nodes.length) focusMenu(0, false);
}
function focusMenu(index, focus = true) {
	const nodes = $$("[data-nav]");
	if (!nodes.length) return;
	menuFocus = (index + nodes.length) % nodes.length;
	nodes.forEach((el, i) => {
		el.classList.toggle("selected", i === menuFocus);
		el.closest(".setting-row")?.classList.toggle("selected", i === menuFocus);
	});
	if (focus) {
		nodes[menuFocus].focus({ preventScroll: true });
		nodes[menuFocus].scrollIntoView({ block: "nearest" });
	}
}
function menuAction(action) {
	if (
		mode === "loading" ||
		performance.now() < ignoreUntil ||
		(net?.hub && net.ended)
	)
		return;
	if (mode === "attract") {
		showTitle();
		return;
	}
	const nodes = $$("[data-nav]");
	if (action === "back") {
		back();
		return;
	}
	if (action === "up" || action === "down") {
		focusMenu(menuFocus + (action === "up" ? -1 : 1));
		audio.play("select");
		return;
	}
	const selected = nodes[menuFocus];
	if ((action === "left" || action === "right") && selected?.type === "range") {
		const step = Number(selected.step) || 1;
		selected.value = String(
			Math.min(
				Number(selected.max),
				Math.max(
					Number(selected.min),
					Number(selected.value) + (action === "left" ? -step : step),
				),
			),
		);
		selected.dispatchEvent(new Event("input", { bubbles: true }));
	}
	if (action === "confirm" && selected?.tagName === "BUTTON") selected.click();
}
function wrap(title, kicker, body, wide = false) {
	return `<section class="screen-shade"><div class="panel ${wide ? "wide" : ""}"><div class="eyebrow">${kicker}</div><h1>${title}</h1>${body}</div></section>`;
}
const button = (label, action, extra = "", primary = false) =>
	`<button data-nav data-action="${action}" class="menu-button ${primary ? "primary" : ""}">${label}${extra ? `<span>${extra}</span>` : ""}</button>`;
const backButton = () =>
	`<button data-nav data-action="back" class="menu-button back">Back <span>↶</span></button>`;
function showTitle() {
	if (net?.hub) return;
	net?.leaveRoom();
	onlinePaused = false;
	runReported = false;
	finishedShown = false;
	remoteState = null;
	localPlayers = 1;
	game.reset(1);
	game.players[0].face = 1;
	game.players[1].face = -1;
	game.players[1].active = true;
	game.players[1].x = 3;
	game.players[1].y = 0.7;
	setMode("title");
	lastActivity = performance.now();
	overlay.innerHTML = `<section class="title-panel"><div class="eyebrow">Underground overtime · 1–2 players</div><h1 class="title-logo"><em>GRIT</em><span>BROS</span></h1><div class="title-sub">THE NIGHT SHIFT BITES BACK.</div><p class="title-copy">The pipes are clogged. The pests are clocked in. Time to put the boot in.</p><nav class="menu-stack">${button("Clock in", "solo", "Solo shift", true)}${button("Bring a buddy", "coop", "Couch co-op")}${button("Learn the ropes", "how", "How to play")}</nav><nav class="title-bottom"><button data-nav data-action="settings" class="text-button">Settings</button><button data-nav data-action="rooms" class="text-button">Multiplayer</button><button data-nav data-action="credits" class="text-button">About</button></nav></section><div class="build-note">GRIT WORKS / EST. 1983<br>FIVE SHIFTS. ONE BIG CLOG.<br>BEST ${String(best).padStart(6, "0")}</div><div class="title-stamp"><b>↑</b><span>BUMP FROM BELOW.<br>BOOT TO COLLECT.</span></div>`;
	wire();
}
function start(count = 1) {
	if (net?.hub) return;
	localPlayers = count;
	remoteState = null;
	finishedShown = false;
	runReported = false;
	game.reset(count);
	input.setLocalCoop(count === 2);
	setMode("play");
	audio.unlock();
	audio.speak("ready");
}
function join() {
	if (mode !== "play" || net.active || localPlayers === 2) return;
	localPlayers = 2;
	game.setPlayers(2);
	input.setLocalCoop(true);
	toast("Buddy clocked in! P2: J / L · I · O");
	audio.speak("ready");
}
function pause() {
	if (mode === "attract") {
		showTitle();
		return;
	}
	if (mode === "play") {
		returnMode = "play";
		setMode("pause");
		overlay.innerHTML = wrap(
			"TAKE FIVE.",
			"Shift on hold",
			`<nav class="menu-stack">${button("Back to work", "resume", "Resume", true)}${button("Settings", "settings")}${button("Learn the ropes", "how")}${button("Dev workshop", "dev")}${net.hub ? "" : button("Clock out", "title", "Title screen")}</nav>`,
		);
		if (net.active) toast("Online shift continues while menus are open.");
		wire();
	} else if (mode === "pause") resume();
	else if (["settings", "how", "credits", "dev"].includes(mode)) back();
}
function resume() {
	onlinePaused = false;
	setMode("play");
}
function back() {
	if (mode === "play") {
		pause();
		return;
	}
	if (mode === "pause") {
		resume();
		return;
	}
	if (mode === "dev") {
		pauseFromMenu();
		return;
	}
	if (["how", "settings", "credits"].includes(mode)) {
		if (settingsReturn === "pause") pauseFromMenu();
		else showTitle();
		return;
	}
	if (mode === "rooms") showTitle();
	else if (mode === "result") showTitle();
}
function pauseFromMenu() {
	mode = "play";
	pause();
}
function showHow() {
	settingsReturn = ["play", "pause", "dev"].includes(mode) ? "pause" : "title";
	setMode("how");
	overlay.innerHTML = wrap(
		"A GOOD DAY FOR A BAD BUG.",
		"The three-step repair plan",
		`<div class="how-grid"><article class="how-card"><div class="diagram"><i></i><span class="bug">●</span><span class="arrow">↑</span></div><b>01 / BUMP</b><p>Jump into a platform from below. Pests above you flip onto their backs.</p></article><article class="how-card"><div class="diagram kick">➜ ◒</div><b>02 / BOOT</b><p>Run into a flipped pest to kick it away. Chain quick kicks for big points.</p></article><article class="how-card"><div class="diagram">✦</div><b>03 / BRASS</b><p>Grab the loose tokens. Clear five shifts and unclog the Grit Works!</p></article></div><p>Use the gaps to climb. Bump the BOP box or use a thump to flip pests across the room. Crabs take <b>two bumps</b>; the Big Clog takes <b>three</b>. Pests recover if you leave them. Touching an upright pest costs a heart.</p><div class="control-row"><span><kbd class="key">${input.getPrompt("move")}</kbd> Move</span><span><kbd class="key">${input.getPrompt("jump")}</kbd> Jump / bump</span><span><kbd class="key">${input.getPrompt("action")}</kbd> Emergency thump</span></div><p class="dev-note">Two emergency thumps to start; one refills each shift. P2 uses J / L to move, I to jump, O to thump, or a second controller. Touch: drag the left half to move, hold the right half to keep hopping.</p>${backButton()}`,
		true,
	);
	wire();
}
function rangeRow(
	label,
	key,
	value,
	min,
	max,
	step,
	section = "prefs",
	format = "percent",
) {
	const formatted =
		format === "percent"
			? Math.round(value * 100) + "%"
			: Number(value).toFixed(step < 1 ? 1 : 0);
	return `<label class="setting-row"><span>${label}</span><input data-nav data-setting="${key}" data-section="${section}" data-format="${format}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"><output>${formatted}</output></label>`;
}
function showSettings() {
	settingsReturn = ["pause", "play", "dev"].includes(mode) ? "pause" : "title";
	setMode("settings");
	overlay.innerHTML = wrap(
		"YOUR WORKBENCH.",
		"Settings",
		`${rangeRow("Music", "music", prefs.music, 0, 1, 0.05)}${rangeRow("Effects & voices", "sfx", prefs.sfx, 0, 1, 0.05)}<div class="setting-row"><span>Controller glyphs</span><button data-nav data-action="glyphs" class="toggle-button">${prefs.glyphs === "ps" ? "PlayStation  △ ○ × □" : "Xbox  A B X Y"}</button><output></output></div><div class="setting-row"><span>Fullscreen</span><button data-nav data-action="fullscreen" class="toggle-button">Toggle fullscreen</button><output></output></div><p class="dev-note">Music starts at 10%. Settings and your best score are saved on this device.</p>${backButton()}`,
	);
	wire();
}
function showDev() {
	if (net.active && !net.isHost) {
		toast("The host controls the workshop.");
		return;
	}
	setMode("dev");
	overlay.innerHTML = wrap(
		"TINKER WITH THE SHIFT.",
		"Dev workshop · changes apply live",
		`<div class="dev-grid">${rangeRow("Run speed", "speed", game.settings.speed, 2, 12, 0.2, "game", "number")}${rangeRow("Jump power", "jump", game.settings.jump, 10, 24, 0.2, "game", "number")}${rangeRow("Gravity", "gravity", game.settings.gravity, 14, 42, 0.5, "game", "number")}${rangeRow("Pest speed", "enemySpeed", game.settings.enemySpeed, 0.5, 4, 0.1, "game", "number")}${rangeRow("Stun time", "stunTime", game.settings.stunTime, 2, 20, 0.5, "game", "number")}${rangeRow("Spawn rate", "spawnRate", game.settings.spawnRate, 0.3, 3, 0.1, "game", "number")}</div><div class="dev-actions"><button data-nav data-action="god" class="toggle-button">Safety boots: ${game.settings.invincible ? "ON" : "OFF"}</button><button data-nav data-action="refill" class="toggle-button">Refill hearts & thumps</button><button data-nav data-action="next" class="toggle-button">Next shift</button><button data-nav data-action="spawn" class="toggle-button">Spawn a crab</button><button data-nav data-action="clear" class="toggle-button">Clear pests</button><button data-nav data-action="resetdev" class="toggle-button">Reset defaults</button></div><p class="dev-note">The world is paused here during solo play. Reset restores every balance slider and safety boots. Use Next shift to inspect all five encounters.</p>${backButton()}`,
		true,
	);
	wire();
}
const sourceNames = {
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
function showCredits() {
	settingsReturn = mode === "pause" ? "pause" : "title";
	setMode("credits");
	overlay.innerHTML = wrap(
		"MADE OF GRIT.",
		"About · credits · source information",
		`<p>An original tribute to the single-screen pipe arcade. Pip & Kit, the pests, music, geometry and animation were created for this game. Inspired by <b>Mario Bros. (1983)</b>.</p><div class="credits-grid">${Object.entries(
			metadata.sourceInformation,
		)
			.map(
				([k, v]) =>
					`<div class="credit-item"><b>${sourceNames[k]}</b>${esc(v)}</div>`,
			)
			.join("")}</div>${[
			["Testing feedback", metadata.testingFeedback],
			["Engine feedback", metadata.engineFeedback],
			["Prompt feedback", metadata.promptFeedback],
		]
			.map(
				([name, answers]) =>
					`<section class="credits-feedback"><h3>${name}</h3>${answers.map((a, i) => `<p><b>${i + 1}.</b> ${esc(a)}</p>`).join("")}</section>`,
			)
			.join("")}${backButton()}`,
		true,
	);
	wire();
}
function showRooms() {
	setMode("rooms");
	overlay.innerHTML = wrap(
		"TWO BOOTS ARE BETTER.",
		"Multiplayer",
		`<p>Play side by side with two controllers or one keyboard. For remote devices, launch Grit Bros in an <b>AI Hub session</b>.</p><nav class="menu-stack">${button("Couch co-op", "coop", "Same screen", true)}${button("Host a tab room", "hostroom", "Same browser")}</nav><p class="dev-note">Tab rooms connect two pages at this same web address in the same browser. Open the game in a second tab, then enter the room code below.</p><div class="room-input"><input id="room-code" maxlength="6" autocomplete="off" placeholder="ROOM CODE" aria-label="Room code"><button data-nav data-action="joinroom" class="toggle-button">Join</button></div><div id="room-status" role="status"></div>${backButton()}`,
	);
	wire();
}
function result(s) {
	if (finishedShown) return;
	finishedShown = true;
	best = Math.max(best, s.score);
	storage.set("best", best);
	if (net.active && !runReported) {
		runReported = true;
		net.finish({ score: s.score, won: s.won, stats: s.stats });
	}
	setMode("result");
	overlay.innerHTML = wrap(
		s.won ? "THAT’S A WRAP!" : "THE SHIFT BIT BACK.",
		s.won ? "Grit Works · all clear" : "Pip & Kit need a breather",
		`<p>${s.won ? "The pipes are singing. The pests are packing. Not bad for a night’s work." : "A few too many bugs on the payroll. Dust off those boots and give it another go."}</p><div class="result-score">${String(s.score).padStart(6, "0")}</div><small>TEAM SCORE · BEST ${String(best).padStart(6, "0")}</small><div class="result-stats"><span><b>${s.stats.kicks}</b>Pests booted</span><span><b>${s.stats.coins}</b>Tokens pocketed</span><span><b>${s.phase} / 5</b>Shifts visited</span></div><nav class="menu-stack">${button("Another shift", "retry", "Play again", true)}${net.hub ? "" : button("Clock out", "title", "Title screen")}</nav>`,
	);
	wire();
}
function onEvent(type, data, remote = false) {
	if (!remote && net?.active && net.isHost) {
		networkEvents.push({
			id: ++eventSerial,
			type,
			data: {
				x: data.x || 0,
				y: data.y || 0,
				points: data.points,
				combo: data.combo,
				phase: data.phase,
			},
		});
		if (networkEvents.length > 24) networkEvents.shift();
	}
	scene?.effect(
		type,
		data.x || 0,
		data.y || 0,
		type === "armor" ? 0xf5a345 : undefined,
		data,
	);
	const sounds = {
		jump: "jump",
		bump: "bump",
		flip: "bump",
		armor: "bump",
		kick: "kick",
		coin: "coin",
		hurt: "hurt",
		pow: "pow",
		clear: "clear",
		win: "win",
		lose: "lose",
		phase: "ready",
	};
	if (sounds[type]) audio.play(sounds[type]);
	if (type === "phase" && data.phase > 1)
		audio.speak(data.phase === 5 ? "boss" : "ready");
	if (type === "kick" && data.combo >= 3 && data.combo % 2 === 1)
		audio.speak("happy");
	if (type === "hurt") audio.speak("hurt");
}

document.addEventListener("click", async (e) => {
	const el = e.target.closest("[data-action]");
	if (!el || performance.now() < ignoreUntil) return;
	activity(
		e.pointerType === "touch" || input?.lastType === "touch"
			? "touch"
			: "mouse",
	);
	audio.unlock();
	audio.play("select");
	const action = el.dataset.action;
	if (action === "solo" || action === "coop") {
		net.leaveRoom();
		start(action === "coop" ? 2 : 1);
	} else if (action === "pause") pause();
	else if (action === "resume") resume();
	else if (action === "title") showTitle();
	else if (action === "retry") {
		if (net.hub) return;
		if (net.active) {
			toast("Start a new room to play another network shift.");
			showTitle();
		} else start(localPlayers);
	} else if (action === "how") showHow();
	else if (action === "settings") showSettings();
	else if (action === "credits") showCredits();
	else if (action === "rooms") showRooms();
	else if (action === "back") back();
	else if (action === "dev") showDev();
	else if (action === "glyphs") {
		prefs.glyphs = prefs.glyphs === "ps" ? "xbox" : "ps";
		savePrefs();
		el.textContent =
			prefs.glyphs === "ps" ? "PlayStation  △ ○ × □" : "Xbox  A B X Y";
	} else if (action === "fullscreen") {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {
			toast("Fullscreen is unavailable in this browser.");
		}
	} else if (action === "god") {
		game.settings.invincible = !game.settings.invincible;
		el.textContent =
			"Safety boots: " + (game.settings.invincible ? "ON" : "OFF");
	} else if (action === "refill") {
		game.lives = 5;
		game.powCharges = 3;
		toast("Five hearts. Three thumps. Fresh boots.");
	} else if (action === "next") {
		game.enterPhase((game.phase % 5) + 1);
		toast("Shift " + game.phase + " ready.");
	} else if (action === "spawn") {
		game.spawn("crab");
		toast("One crab, reporting for duty.");
	} else if (action === "clear") {
		for (const enemy of [...game.enemies]) {
			enemy.flipped = true;
			game.kick(enemy, game.players[0]);
		}
		toast("Pests cleared.");
	} else if (action === "resetdev") {
		game.settings = { ...DEFAULTS };
		showDev();
		toast("Workshop defaults restored.");
	} else if (action === "hostroom") {
		const code = net.hostRoom();
		$("#room-status").innerHTML =
			`<small>WAITING FOR YOUR BUDDY</small><div class="room-code">${code}</div><p class="dev-note">Open this game in a second browser tab and join this code.</p>`;
	} else if (action === "joinroom") {
		const code = $("#room-code").value.trim();
		if (code.length < 3) {
			toast("Enter the host’s six-character code.");
			return;
		}
		net.joinRoom(code);
		$("#room-status").textContent =
			"Looking for room " + code.toUpperCase() + "…";
	}
});
document.addEventListener("input", (e) => {
	const el = e.target;
	if (!el.dataset.setting) return;
	const value = Number(el.value),
		key = el.dataset.setting;
	if (el.dataset.section === "game") game.settings[key] = value;
	else {
		prefs[key] = value;
		savePrefs();
	}
	el.nextElementSibling.textContent =
		el.dataset.format === "percent"
			? Math.round(value * 100) + "%"
			: value.toFixed(Number(el.step) < 1 ? 1 : 0);
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden && mode === "play" && !net?.active) pause();
});
window.addEventListener("blur", () => {
	input?.clear();
});

function updateHud(s) {
	$("#score").textContent = String(s.score).padStart(6, "0");
	$("#shift-label").textContent =
		`SHIFT ${String(s.phase).padStart(2, "0")} / 05`;
	$("#shift-name").textContent = SHIFTS[s.phase - 1].name;
	$("#shift-progress").innerHTML = Array.from(
		{ length: 5 },
		(_, i) => `<i class="${i < s.phase ? "done" : ""}"></i>`,
	).join("");
	$("#lives").innerHTML = Array.from(
		{ length: 5 },
		(_, i) => `<i class="${i >= s.lives ? "empty" : ""}"></i>`,
	).join("");
	$("#lives").setAttribute("aria-label", s.lives + " lives remaining");
	const jump = input.getPrompt("jump"),
		action = input.getPrompt("action"),
		move = input.getPrompt("move");
	$("#control-prompts").innerHTML =
		`<span><kbd class="key">${esc(move)}</kbd>Move</span><span><kbd class="key">${esc(jump)}</kbd>Jump / bump</span><span>Touch flipped pests to boot</span>`;
	$("#pow-status").innerHTML =
		`<kbd class="key">${esc(action)}</kbd> THUMP ${"●".repeat(s.powCharges)}${"○".repeat(3 - s.powCharges)}`;
	$("#banner").hidden =
		mode !== "play" || !(s.bannerTime > 0) || !!net?.countdown;
	if (!$("#banner").hidden) {
		$("#banner-text").textContent = s.banner;
		$("#banner-kicker").textContent = s.banner.includes("COMPLETE")
			? "GOOD WORK, CREW"
			: "CLOCKING IN · SHIFT " + s.phase;
		$("#banner-sub").textContent = SHIFTS[s.phase - 1].subtitle;
	}
	if (mode === "play" && net?.countdown) {
		$("#banner").hidden = false;
		$("#banner-kicker").textContent = "CREW READY";
		$("#banner-text").textContent = net.countdown;
		$("#banner-sub").textContent = "The shift is about to start.";
	}
	if (mode === "play" && s.phase === 3 && s.bannerTime <= 0) {
		$("#shift-name").textContent =
			`${s.bonusCollected} / 18 TOKENS · ${Math.max(0, Math.ceil(26.6 - s.phaseTime))}s`;
	}
	$("#combo").hidden = mode !== "play" || s.combo < 2 || s.comboTime <= 0;
	if (!$("#combo").hidden) {
		$("#combo strong").textContent = "×" + s.combo;
		$("#combo i").style.transform = `scaleX(${s.comboTime / 4.5})`;
	}
	if (input.isTouch) {
		$("#touch-thump span").textContent = "●".repeat(s.powCharges);
		$("#touch-thump").hidden = s.powCharges <= 0;
	}
}
function frame(now) {
	requestAnimationFrame(frame);
	const dt = Math.min(0.1, (now - (lastTime || now)) / 1000);
	lastTime = now;
	frameCount++;
	input.update();
	if (toastTime > 0) {
		toastTime -= dt;
		if (toastTime <= 0) $("#toast").classList.remove("show");
	}
	let inputs = input.getPlayers();
	if (mode === "play")
		inputs = inputs.map((p, i) => {
			pendingPlay[i].jump ||= p.jump;
			pendingPlay[i].action ||= p.action;
			return { ...p, ...pendingPlay[i] };
		});
	if (input.lastType === "touch" && inputs[0].jump) {
		const p = (remoteState && !net.isHost ? remoteState : game.snapshot())
			.players[net.active ? net.me : 0];
		if (p?.grounded && p.lastJump) inputs[0] = { ...inputs[0], jump: false };
	}
	let canSim = net.tick(dt, mode === "play" ? inputs[0] : {}, () => ({
		...game.snapshot(),
		events: networkEvents,
	}));
	if (mode === "title" && now - lastActivity >= 10000 && !net.active) {
		game.reset(2);
		game.attract = true;
		setMode("attract");
	}
	if (
		mode === "play" ||
		mode === "attract" ||
		(net.active &&
			!net.ended &&
			["pause", "settings", "how", "dev"].includes(mode))
	) {
		accumulator += dt;
		let guard = 0;
		while (accumulator >= 1 / 60 && guard++ < 7) {
			if (mode === "attract") game.demoStep();
			else if (canSim) {
				game.step(1 / 60, net.inputs(inputs[0], inputs[1]));
				pendingPlay = [
					{ jump: false, action: false },
					{ jump: false, action: false },
				];
			}
			accumulator -= 1 / 60;
		}
	} else accumulator = 0;
	let state = remoteState && !net.isHost ? remoteState : game.snapshot();
	if (mode === "title") {
		state.time = now / 1000;
		state.menu = true;
		state.players[0].x = 5.2;
		state.players[0].y = 0.65;
		state.players[1].x = 7.4;
		state.players[1].y = 0.65;
		state.players[1].active = true;
	}
	let renderState = state;
	if (remoteState && !net.isHost) {
		if (!remoteRender) remoteRender = structuredClone(state);
		for (const key of ["players", "enemies", "coins"]) {
			const old = new Map(remoteRender[key].map((e) => [e.id, e]));
			remoteRender[key] = state[key].map((e) => {
				const prev = old.get(e.id);
				if (!prev || Math.hypot(prev.x - e.x, prev.y - e.y) > 4)
					return { ...e };
				const a = 1 - Math.exp(-dt * 22);
				return {
					...e,
					x: prev.x + (e.x - prev.x) * a,
					y: prev.y + (e.y - prev.y) * a,
				};
			});
		}
		renderState = {
			...state,
			players: remoteRender.players,
			enemies: remoteRender.enemies,
			coins: remoteRender.coins,
		};
	}
	scene.render(renderState, dt);
	audio.update(
		dt,
		(mode === "play" && net.canPlay && !net.ended) || mode === "attract"
			? "play"
			: "pause",
	);
	if (frameCount % 5 === 0) updateHud(state);
	if (state.ended) {
		if (mode === "attract") {
			game.reset(2);
			game.attract = true;
		} else if (mode === "play") result(state);
	}
}
async function boot() {
	try {
		input = new Input({
			onActivity: activity,
			onPause: pause,
			onMenu: menuAction,
			onJoin: join,
		});
		savePrefs();
		$("#load-status").textContent = "Bolting the platforms together…";
		await initPhysics();
		game = new Game(onEvent);
		scene = await createScene($("#world"), {
			forceWebGL: new URLSearchParams(location.search).has("visual-qa"),
		});
		net = new GritNet({
			onStart(info) {
				localPlayers = info.count;
				game.reset(info.count);
				input.setLocalCoop(false);
				finishedShown = false;
				runReported = false;
				remoteState = null;
				remoteRender = null;
				remoteEventSerial = 0;
				networkEvents.length = 0;
				setMode("play");
				toast(
					info.hub
						? "Crew connected · shift begins on the signal"
						: "Buddy connected · two boots are better!",
				);
			},
			onSnapshot(s) {
				remoteState = s;
				for (const e of s.events || [])
					if (e.id > remoteEventSerial) {
						remoteEventSerial = e.id;
						onEvent(e.type, e.data, true);
					}
			},
			onEnd(reason) {
				if (mode === "play") result(remoteState || game.snapshot());
				audio.update(0, "pause");
			},
			onLeave(id) {
				toast("Buddy clocked out. You’ve got this.");
				if (net.isHost) {
					if (net.hub)
						game.players.forEach((p) => {
							p.active = net.players.some((q) => q.id === p.id);
							p.body.setEnabled(p.active);
						});
					else game.setPlayers(1);
				}
			},
			getResult() {
				return { score: game.score, won: game.won, stats: game.stats };
			},
		});
		window.addEventListener("resize", () => scene.resize());
		const hubInfo = await net.connect();
		$("#loading").hidden = true;
		if (hubInfo) {
			game.reset(hubInfo.players.length);
			setMode("play");
			net.ready();
		} else showTitle();
		window.Grit = {
			get mode() {
				return mode;
			},
			get state() {
				return remoteState && !net.isHost ? remoteState : game.snapshot();
			},
			get settings() {
				return game.settings;
			},
			get audio() {
				return audio;
			},
			get input() {
				return input;
			},
			get net() {
				return net;
			},
			get renderer() {
				return scene.stats();
			},
			start,
			pause,
			resume,
			showTitle,
			showDev,
			showCredits,
			metadata,
			debug: {
				step(frames = 1, controls = []) {
					for (let i = 0; i < frames; i++) game.step(1 / 60, controls);
					return game.snapshot();
				},
				demo(frames = 1) {
					for (let i = 0; i < frames; i++) game.demoStep();
					return game.snapshot();
				},
				spawn(type, x, y) {
					return game.spawn(type, x, y).id;
				},
				bump(x, y) {
					return game.bump(x, y);
				},
				pow() {
					return game.pow();
				},
				teleport(id, x, y) {
					game.teleport(game.players[id], x, y);
				},
				phase(n) {
					game.enterPhase(n);
				},
				getGame() {
					return game;
				},
			},
		};
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		$("#load-status").textContent =
			"The workshop could not open: " + error.message;
		$(".load-line").hidden = true;
		globalThis.AIHub?.fail(error.message);
	}
}
boot();
