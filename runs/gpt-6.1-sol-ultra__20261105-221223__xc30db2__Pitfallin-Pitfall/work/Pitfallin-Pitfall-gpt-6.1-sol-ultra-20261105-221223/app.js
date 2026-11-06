import * as THREE from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
import { Game, LEVEL, DEFAULTS } from "./game.js";
import { createArt } from "./art.js";
import { JungleAudio, createOfflineSample } from "./audio.js";
import { ExpeditionNetwork } from "./online.js";
import report from "./report.json";
const $ = (s) => document.querySelector(s),
	$$ = (s) => [...document.querySelectorAll(s)];
const audio = new JungleAudio();
let game,
	renderer,
	scene,
	camera,
	art,
	light,
	loaded = false,
	elapsed = 0,
	lastInput = performance.now(),
	inputMethod = "keyboard",
	panelStack = [],
	panelOrigin = "title",
	toastUntil = 0,
	startDeadline = 0,
	hubPending = null,
	ended = false,
	cameraX = 20,
	cameraY = 2.6,
	shake = 0,
	menuFocus = 0,
	frameCount = 0,
	frameLoop = null,
	recovering = false,
	renderRecovery = null;
const keys = new Set(),
	taps = { jump: false, grab: false, drop: false };
const touch = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
let oldButtons = [],
	navCooldown = 0,
	gamepadX = 0,
	gamepadY = 0;
let settings = {
	music: 0.1,
	sfx: 0.65,
	glyphs: "ps",
	shake: true,
	autoGrab: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("pitfallin-settings") || "{}"),
	);
} catch {}
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
const ghosts = new Map();
const network = new ExpeditionNetwork({
	onStart(info) {
		if (!loaded) {
			hubPending = info;
			return;
		}
		startRace(info);
	},
	onEnd(data) {
		ended = true;
		game.mode = "ended";
		panelStack = [];
		$("#panel-container").innerHTML = "";
		audio.stop();
		$("#context").classList.add("hidden");
		toast("Expedition complete", "The hub is preparing the results", 100000);
	},
	onTimeUp() {
		if (game && !game.finished) {
			game.complete(false, "The expedition clock has run out.");
			handleEvents();
		}
		network.result(game?.score || 0, game?.stats || {});
	},
	onGhost(data, from) {
		if (ended) return;
		ghosts.set(from, { ...ghosts.get(from), ...data, seen: performance.now() });
		art?.makeGhost(from, data.color || "#7be0c9");
	},
	onLeave(id) {
		ghosts.delete(id);
		art?.removeGhost(id);
		updateNetworkStatus();
	},
	onStatus(text) {
		const s = $("#network-status");
		if (s) s.textContent = text;
		updateNetworkStatus();
	},
});
const networkReady = network.init();
const prompts = {
	touch: {
		jump: "<b>Tap right</b> ",
		grab: "<b>Auto</b> ",
		climb: "<b>Drag ↕</b> ",
		map: "<b>Menu</b> ",
		pause: "<b>Ⅱ</b> ",
		move: "<b>Drag left</b> ",
	},
	keyboard: {
		jump: "<kbd>Space</kbd>",
		grab: "<kbd>E</kbd>",
		climb: "<kbd>W S</kbd>",
		map: "<kbd>M</kbd>",
		pause: "<kbd>Esc</kbd>",
		move: "<kbd>A D</kbd>",
	},
	ps: {
		jump: '<span class="glyph">×</span>',
		grab: '<span class="glyph">□</span>',
		climb: '<span class="glyph">↕</span>',
		map: '<span class="glyph">△</span>',
		pause: '<span class="glyph">☰</span>',
		move: '<span class="glyph">L</span>',
	},
	xbox: {
		jump: '<span class="glyph">A</span>',
		grab: '<span class="glyph">X</span>',
		climb: '<span class="glyph">↕</span>',
		map: '<span class="glyph">Y</span>',
		pause: '<span class="glyph">☰</span>',
		move: '<span class="glyph">L</span>',
	},
};
function promptHTML(action) {
	const set =
		inputMethod === "gamepad"
			? prompts[settings.glyphs]
			: inputMethod === "touch"
				? prompts.touch
				: prompts.keyboard;
	return set[action] || "";
}
function promptFor(action) {
	return `<span data-prompt="${action}">${promptHTML(action)}</span>`;
}
function menuHelp() {
	return inputMethod === "touch"
		? "Tap to select · ← Back"
		: inputMethod === "gamepad"
			? settings.glyphs === "ps"
				? "Right stick scroll · ○ Back · × Select"
				: "Right stick scroll · B Back · A Select"
			: "Esc Back · Enter Select";
}
function saveSettings() {
	try {
		localStorage.setItem("pitfallin-settings", JSON.stringify(settings));
	} catch {}
}
function setInput(type) {
	if (inputMethod === type) return;
	inputMethod = type;
	document.body.classList.toggle("touch", type === "touch");
	updatePrompts();
}
function anyInput(type) {
	lastInput = performance.now();
	setInput(type);
	if (game?.mode === "attract") {
		showTitle();
		return true;
	}
	return false;
}
function updatePrompts() {
	if (!loaded) return;
	$("#title-prompt").textContent =
		inputMethod === "gamepad"
			? settings.glyphs === "ps"
				? "× Enter · Left stick Choose · ○ Back"
				: "A Enter · Left stick Choose · B Back"
			: inputMethod === "touch"
				? "Tap a trail. Follow your curiosity."
				: "A / D to wander · Space to leap · E to catch a vine";
	$("#controls").innerHTML =
		`<span>${promptFor("move")}Move</span><span>${promptFor("jump")}Jump / release</span><span>${promptFor("grab")}Catch vine</span><span>${promptFor("climb")}Climb</span><span class="controls-spacer"></span><span>${promptFor("map")}Field map</span><div class="route-mini"><i id="route-marker"></i></div>`;
	$$("[data-prompt]").forEach((el) => {
		el.innerHTML = promptHTML(el.dataset.prompt);
	});
	$$("[data-menu-help]").forEach((el) => {
		el.textContent = menuHelp();
	});
}
function focusables() {
	const root = panelStack.length
		? $("#panel-container")
		: game?.mode === "title"
			? $("#title")
			: null;
	return root
		? [...root.querySelectorAll("button,input,select,textarea")].filter(
				(e) => e.offsetParent !== null && !e.disabled,
			)
		: [];
}
function focusElement(el) {
	if (!el) return;
	$$(".focused").forEach((e) => e.classList.remove("focused"));
	el.classList.add("focused");
	el.focus({ preventScroll: true });
	el.scrollIntoView({ block: "nearest" });
	menuFocus = Math.max(0, focusables().indexOf(el));
}
function focusFirst() {
	menuFocus = 0;
	const els = focusables();
	focusElement(els.find((e) => !e.classList.contains("back-button")) || els[0]);
}
function navigateMenu(dir) {
	const els = focusables();
	if (!els.length) return;
	let idx = els.indexOf(document.activeElement);
	idx = (idx + dir + els.length) % els.length;
	focusElement(els[idx]);
	audio.effect("menu");
}
function adjustControl(dir) {
	const el = document.activeElement;
	if (el?.type === "range") {
		const step = Number(el.step) || 1;
		el.value = String(
			Math.max(
				Number(el.min),
				Math.min(Number(el.max), Number(el.value) + step * dir),
			),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
		return true;
	}
	if (el?.tagName === "SELECT") {
		el.selectedIndex =
			(el.selectedIndex + dir + el.options.length) % el.options.length;
		el.dispatchEvent(new Event("change", { bubbles: true }));
		return true;
	}
	return false;
}
function toast(title, subtitle = "", seconds = 3.6) {
	$("#toast .toast-title").textContent = title;
	$("#toast .toast-sub").textContent = subtitle;
	$("#toast").classList.remove("hidden");
	toastUntil = performance.now() + seconds * 1000;
}
function startSolo() {
	if (network.hubActive) return;
	network.leave();
	ghosts.clear();
	for (const id of art.ghosts.keys()) art.removeGhost(id);
	begin();
}
function begin() {
	game.start();
	ended = false;
	panelStack = [];
	$("#panel-container").innerHTML = "";
	$("#title").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	$("#attract-banner").classList.add("hidden");
	$("#toast").classList.add("hidden");
	cameraX = 7;
	cameraY = 2.5;
	keys.clear();
	Object.keys(taps).forEach((k) => (taps[k] = false));
	audio.unlock();
	audio.speak("hello");
	toast(
		"A good day to get lost.",
		"Six sun relics · Eight minutes · One hat",
		4,
	);
	updatePrompts();
}
function startRace(info) {
	begin();
	startDeadline = info.hub
		? 0
		: info.startAt || Date.now() + Number(info.in || 3000);
	game.mode = "waiting";
	$("#countdown").classList.remove("hidden");
}
function showTitle() {
	if (network.hubActive) return;
	ghosts.clear();
	for (const id of art.ghosts.keys()) art.removeGhost(id);
	game.reset();
	game.mode = "title";
	panelStack = [];
	$("#panel-container").innerHTML = "";
	$("#title").classList.remove("hidden");
	$("#hud").classList.add("hidden");
	$("#attract-banner").classList.add("hidden");
	$("#countdown").classList.add("hidden");
	$("#toast").classList.add("hidden");
	lastInput = performance.now();
	cameraX = 20;
	cameraY = 2.6;
	keys.clear();
	focusFirst();
}
function panelTemplate(
	eyebrow,
	title,
	content,
	wide = false,
	footer = "Your hat can wait. Take your time.",
) {
	return `<section class="panel-shade"><div class="panel ${wide ? "wide" : ""}"><header class="panel-head"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2></div><button class="back-button" data-action="back">← Back</button></header><div class="scroll">${content}</div><footer class="panel-footer"><span>${footer}</span><span data-menu-help>${menuHelp()}</span></footer></div></section>`;
}
function openPanel(name) {
	if (!loaded || ended) return;
	if (!panelStack.length) {
		panelOrigin = game.mode;
		if (game.mode === "playing") game.mode = "paused";
	}
	panelStack.push(name);
	renderPanel(name);
	audio.effect("menu");
}
function closePanel() {
	if (!panelStack.length) return;
	if (panelStack[0] === "results" && panelStack.length === 1) {
		if (!network.hubActive) {
			network.leave();
			showTitle();
		}
		return;
	}
	panelStack.pop();
	if (panelStack.length) renderPanel(panelStack.at(-1));
	else {
		$("#panel-container").innerHTML = "";
		if (game.mode === "paused")
			game.mode = panelOrigin === "playing" ? "playing" : panelOrigin;
	}
	keys.clear();
	taps.jump = taps.grab = false;
	audio.effect("menu");
}
function pause() {
	if (ended || game.mode === "waiting") return;
	if (panelStack.length) {
		closePanel();
		return;
	}
	if (game.mode === "playing") openPanel("pause");
}
function settingSlider(
	id,
	label,
	value,
	min,
	max,
	step,
	description = "",
	suffix = "",
) {
	return `<div class="setting"><label for="${id}">${label}${description ? `<small>${description}</small>` : ""}</label><div class="setting-control"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}">${value}${suffix}</output></div></div>`;
}
function toggle(id, label, on, description = "") {
	return `<div class="setting"><label>${label}${description ? `<small>${description}</small>` : ""}</label><button id="${id}" class="toggle" aria-pressed="${!!on}">${on ? "On" : "Off"}</button></div>`;
}
function renderPanel(name) {
	let html = "";
	if (name === "pause") {
		html = panelTemplate(
			"Catch your breath",
			"Between leaps.",
			`<div class="pause-grid"><nav class="menu-stack"><button class="menu-button primary" data-action="resume">Back to the jungle →</button><button class="menu-button" data-action="map">Field map</button><button class="menu-button" data-action="guide">Field guide</button><button class="menu-button" data-action="settings">Settings</button>${!network.hubActive ? '<button class="menu-button" data-action="dev">Developer camp</button><button class="menu-button" data-action="restart">Restart expedition</button><button class="menu-button" data-action="title">Return to title</button>' : ""}</nav><aside class="pause-summary"><div class="eyebrow">Relics in the satchel</div><div class="large-number">${game.collected.size}<span style="font-size:28px;color:var(--muted)"> / 6</span></div><p>${LEVEL.checkpoints[game.checkpoint].name}<br>${formatTime(game.remaining)} until sunset.</p><div class="eyebrow" style="margin-top:28px">Fortune</div><div style="font:36px Georgia,serif;margin-top:10px">${game.score.toLocaleString()}</div></aside></div>`,
			false,
			network.hubActive
				? "The session clock continues while paused."
				: "The jungle will be here when you return.",
		);
	}
	if (name === "settings") {
		html = panelTemplate(
			"Make yourself at home",
			"Expedition settings.",
			settingSlider(
				"music",
				"Music",
				Math.round(settings.music * 100),
				0,
				100,
				1,
				"Original jungle soundtrack",
				"%",
			) +
				settingSlider(
					"sfx",
					"Sound & voices",
					Math.round(settings.sfx * 100),
					0,
					100,
					1,
					"Wildlife, footsteps and explorer chatter",
					"%",
				) +
				`<div class="setting"><label for="glyphs">Controller symbols<small>Prompts follow the last input you use.</small></label><select id="glyphs"><option value="ps" ${settings.glyphs === "ps" ? "selected" : ""}>PlayStation · × ○ □ △</option><option value="xbox" ${settings.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div>` +
				toggle("shake", "Camera shake", settings.shake) +
				toggle(
					"autoGrab",
					"Vine catch assist",
					settings.autoGrab,
					"Catch nearby vines automatically in the air. Always enabled for touch.",
				) +
				`<div class="button-row"><button class="btn outline" data-action="fullscreen">Toggle fullscreen</button><button class="btn outline" data-action="reset-settings">Restore settings</button></div>`,
		);
	}
	if (name === "guide") {
		html = panelTemplate(
			"A well-thumbed field guide",
			"Look before you leap.",
			`<div class="guide-grid"><article class="guide-card"><div class="guide-icon">↗</div><h3>Keep moving.</h3><p><strong>${promptFor("move")}Move · ${promptFor("jump")}Jump.</strong><br>Leap rolling logs and snakes. Walk over a camp flag to save your place and recover a heart. A tumble costs five seconds and some fortune.</p></article><article class="guide-card"><div class="guide-icon">〰</div><h3>Trust the vine.</h3><p><strong>${promptFor("grab")}Catch · ${promptFor("jump")}Release.</strong><br>Jump near the hanging end, catch it, then release as it swings towards the far bank. Crocodile backs are safe while their jaws are closed.</p></article><article class="guide-card"><div class="guide-icon">◇</div><h3>Follow the roots.</h3><p><strong>${promptFor("climb")}Climb · ${promptFor("map")}Map.</strong><br>Stand at a ladder and press down to explore below. Two relics hide in the caves. Collect all six, then reach the camp at the far right before sunset.</p></article></div><p class="guide-note">“If the ground looks suspicious, it probably is.”</p><div class="setting"><label>On a touchscreen<small>Drag the left half to move or climb. Tap the right half to jump. Vines catch automatically; a contextual button helps near vines and ladders.</small></label></div><div class="button-row"><button class="btn gold" data-action="back">Hat on. Let's go.</button></div>`,
			true,
		);
	}
	if (name === "map") {
		const symbols = ["♧", "≈", "♜", "〰", "◇", "☀"];
		html = panelTemplate(
			"A pocket-sized world",
			"The sun relic trail.",
			`<div class="map-route">${LEVEL.zones.map((z, i) => `<div class="map-stop ${Math.min(5, Math.floor(game.player.x / 48)) === i ? "active" : ""}"><div class="map-symbol">${symbols[i]}</div><h3>${z}</h3><p>${i === 2 || i === 4 ? "A secret below" : "Follow the sunlight"}</p></div>`).join("")}</div><div class="map-relics">${LEVEL.relics.map((r, i) => `<div class="relic-row"><div class="mark">${game.collected.has(r.id) ? "◆" : "◇"}</div><div><strong>${r.name}</strong><small>${game.collected.has(r.id) ? "Safely in your satchel" : r.y < 0 ? "Below ground · Follow a ladder" : `Above ground · ${LEVEL.zones[i]}`}</small></div></div>`).join("")}</div><p style="color:var(--muted);font-size:15px;margin-top:20px">Flags are checkpoints. The far camp opens after all six relics are found. You can travel back to earlier regions.</p>`,
			true,
		);
	}
	if (name === "dev") {
		html = panelTemplate(
			"Developer camp · live tuning",
			"A little jungle science.",
			settingSlider(
				"tune-speed",
				"Running speed",
				game.tuning.speed,
				3,
				14,
				0.1,
				"World units per second",
			) +
				settingSlider(
					"tune-jump",
					"Jump strength",
					game.tuning.jump,
					6,
					17,
					0.1,
				) +
				settingSlider(
					"tune-gravity",
					"Gravity",
					game.tuning.gravity,
					10,
					40,
					0.5,
				) +
				settingSlider(
					"tune-vineSpeed",
					"Vine pace",
					game.tuning.vineSpeed,
					0.25,
					1.7,
					0.01,
				) +
				settingSlider(
					"tune-hazardSpeed",
					"Wildlife & log pace",
					game.tuning.hazardSpeed,
					0.2,
					2,
					0.05,
				) +
				toggle("dev-invincible", "Invincible", game.dev.invincible) +
				toggle(
					"dev-noclip",
					"Fly through the jungle",
					game.dev.noclip,
					"Move with both axes. Collisions and gravity are bypassed.",
				) +
				toggle("dev-freezeTime", "Hold the sunset", game.dev.freezeTime) +
				`<div class="setting"><label for="warp">Jump to a region</label><select id="warp"><option value="">Choose a camp…</option>${LEVEL.checkpoints.map((c, i) => `<option value="${i}">${i + 1}. ${c.name}</option>`).join("")}</select></div><div class="button-row"><button class="btn gold" data-action="dev-resume">Apply & return</button><button class="btn outline" data-action="dev-reset">Reset defaults</button><button class="btn outline" data-action="dev-refill">Refill hearts & clock</button></div>`,
		);
	}
	if (name === "about") {
		html = panelTemplate(
			"Made of triangles & tall tales",
			"About this expedition.",
			`<nav class="credits-tabs"><button data-credit="sourceInformation" class="selected">Source Information</button><button data-credit="testingFeedback">Testing Feedback</button><button data-credit="engineFeedback">Engine Feedback</button><button data-credit="promptFeedback">Prompt Feedback</button></nav><div id="credits-content"></div>`,
			true,
			"Original game, code, geometry, animation and synthesized audio. Inspired by Pitfall! (1982).",
		);
	}
	if (name === "online") {
		html = panelTemplate(
			"Better with muddy company",
			"Ghost expedition.",
			`<p>Race the same jungle. See your friends as golden trail ghosts. Your relics and hazards belong to your expedition.</p><div id="network-status" class="network-status">Choose a way to meet.</div><div id="players" class="player-list"></div><div class="network-grid"><section><h3>Nearby tabs</h3><p>Open another copy in a tab in this browser. Enter the same room word in each tab.</p><input id="room-name" class="room-input" aria-label="Room word" maxlength="32" value="jungle" placeholder="Room word"><div class="button-row"><button class="btn" data-action="local-join">Join room</button></div></section><section><h3>A friend, anywhere</h3><p>One explorer makes an invitation. Their friend pastes it and sends back the reply. Pair up to three friends; keep both pages open.</p><div class="button-row"><button class="btn" data-action="rtc-offer">Make invitation</button><button class="btn outline" data-action="rtc-accept">Accept invitation</button><button class="btn outline" data-action="rtc-answer">Use reply</button></div><textarea class="code-input" id="network-code" aria-label="Invitation or reply code" placeholder="Paste an invitation or reply here. New codes appear here too."></textarea><button class="back-button" style="font-size:13px" data-action="copy-code">Copy code</button> <button class="back-button" style="font-size:13px" data-action="paste-code">Paste code</button></section></div><div class="button-row"><button class="btn gold" data-action="race-start" id="race-start">Start ghost race →</button><button class="btn outline" data-action="network-leave">Leave group</button></div><p style="font-size:12px;color:var(--muted);margin-top:15px">Direct invitations use WebRTC and need a reachable peer connection. Some networks block direct peers. Nearby tabs work offline. AI Hub handles invitations and transport when played in a Hub session.</p>`,
			true,
		);
	}
	if (name === "results") {
		html = panelTemplate(
			game.won ? "An expedition well spent" : "The jungle keeps its secrets",
			game.won ? "What a tall tale." : "Until next sunrise.",
			`<p class="result-quote">${game.reason}</p><div class="result-stats"><div class="result-stat"><strong>${game.score.toLocaleString()}</strong><small>Fortune earned</small></div><div class="result-stat"><strong>${game.collected.size} / 6</strong><small>Sun relics</small></div><div class="result-stat"><strong>${formatTime(Math.max(0, game.remaining))}</strong><small>Sunlight spared</small></div></div><p>${game.won ? "The hat survived. The boots may never recover." : "Your next great expedition is only a leap away."}</p><div class="button-row">${network.hubActive ? "<p>Waiting for the other expeditions. The hub will show the standings.</p>" : '<button class="btn gold" data-action="restart">One more expedition →</button><button class="btn outline" data-action="title">Back to base camp</button>'}</div>`,
			false,
			`${game.stats.jumps} leaps · ${game.stats.swings} vine catches · ${game.deaths} tumbles`,
		);
	}
	$("#panel-container").innerHTML = html;
	if (name === "about") renderCredits("sourceInformation");
	if (name === "online") updateNetworkStatus();
	if (name === "results") $(".back-button")?.classList.add("hidden");
	focusFirst();
}
const questionSets = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"What was the most helpful test?",
		"What was the least helpful test?",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"What did you have to build yourself?",
		"What was hardest about the engine?",
		"What did you change in the engine, and why?",
		"What one engine feature would you change?",
	],
	promptFeedback: [
		"What did you like most about the prompt?",
		"What was confusing?",
		"What was hardest?",
		"What would you change in the prompt?",
	],
};
function renderCredits(tab) {
	const el = $("#credits-content");
	if (!el) return;
	$$("[data-credit]").forEach((b) =>
		b.classList.toggle("selected", b.dataset.credit === tab),
	);
	el.innerHTML = "";
	if (tab === "sourceInformation") {
		const dl = document.createElement("dl");
		dl.style.margin = "0";
		for (const [key, value] of Object.entries(report.sourceInformation)) {
			const row = document.createElement("div");
			row.className = "credit-line";
			const dt = document.createElement("dt");
			dt.textContent = key
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (s) => s.toUpperCase());
			const dd = document.createElement("dd");
			dd.textContent = value;
			row.append(dt, dd);
			dl.append(row);
		}
		el.append(dl);
	} else
		report[tab].forEach((answer, i) => {
			const article = document.createElement("article");
			article.className = "feedback-item";
			const h = document.createElement("h3");
			h.textContent = questionSets[tab][i];
			const p = document.createElement("p");
			p.textContent = answer;
			article.append(h, p);
			el.append(article);
		});
}
function updateNetworkStatus() {
	const el = $("#players");
	if (el) {
		el.innerHTML = "";
		for (const p of network.players) {
			const chip = document.createElement("div");
			chip.className = "player-chip";
			chip.style.borderColor = p.color || "#f2c451";
			chip.textContent =
				(p.name || "Explorer") + (p.id === network.me ? " · You" : "");
			el.append(chip);
		}
	}
	const b = $("#race-start");
	if (b) b.disabled = network.players.length < 2 || network.me !== network.host;
}
function formatTime(sec) {
	sec = Math.max(0, Math.ceil(sec));
	return (
		String(Math.floor(sec / 60)).padStart(2, "0") +
		":" +
		String(sec % 60).padStart(2, "0")
	);
}
async function action(name) {
	if (!loaded || ended) return;
	audio.unlock();
	switch (name) {
		case "start":
			startSolo();
			break;
		case "pause":
			pause();
			break;
		case "back":
			closePanel();
			break;
		case "resume":
		case "dev-resume":
			while (panelStack.length) closePanel();
			break;
		case "title":
			network.leave();
			showTitle();
			break;
		case "restart":
			if (network.active) {
				if (network.me === network.host) network.startRace();
				else
					toast(
						"Waiting for the trail leader.",
						"The leader can start the next race.",
					);
			} else begin();
			break;
		case "guide":
		case "map":
		case "settings":
		case "about":
		case "dev":
		case "online":
			openPanel(name);
			break;
		case "fullscreen":
			try {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			} catch {
				toast("Fullscreen is unavailable.", "You can still follow the trail.");
			}
			break;
		case "reset-settings":
			settings = {
				music: 0.1,
				sfx: 0.65,
				glyphs: "ps",
				shake: true,
				autoGrab: false,
			};
			audio.setMusic(0.1);
			audio.setSfx(0.65);
			saveSettings();
			renderPanel("settings");
			updatePrompts();
			break;
		case "dev-reset":
			Object.assign(game.tuning, DEFAULTS);
			Object.assign(game.dev, {
				invincible: false,
				noclip: false,
				freezeTime: false,
			});
			renderPanel("dev");
			break;
		case "dev-refill":
			game.health = 3;
			game.remaining = game.tuning.timeLimit;
			toast("Ready for more science.");
			break;
		case "local-join":
			network.joinLocal($("#room-name").value.trim() || "jungle");
			updateNetworkStatus();
			break;
		case "network-leave":
			network.leave();
			ghosts.clear();
			for (const id of art.ghosts.keys()) art.removeGhost(id);
			updateNetworkStatus();
			break;
		case "race-start":
			network.startRace();
			break;
		case "rtc-offer":
		case "rtc-accept":
		case "rtc-answer": {
			const button = $(`[data-action="${name}"]`);
			button.disabled = true;
			try {
				const el = $("#network-code");
				if (name === "rtc-offer") el.value = await network.createOffer();
				if (name === "rtc-accept")
					el.value = await network.acceptOffer(el.value.trim());
				if (name === "rtc-answer") await network.acceptAnswer(el.value.trim());
				el.select();
			} catch (e) {
				$("#network-status").textContent = e.message || String(e);
			} finally {
				button.disabled = false;
			}
			break;
		}
		case "paste-code": {
			try {
				$("#network-code").value = await navigator.clipboard.readText();
			} catch {
				toast(
					"Select the code field and paste.",
					"Clipboard reading is unavailable in this browser.",
				);
			}
			break;
		}
		case "copy-code": {
			const el = $("#network-code");
			try {
				await navigator.clipboard.writeText(el.value);
				toast("Code copied.", "Send it through your usual messenger.");
			} catch {
				el.select();
				document.execCommand("copy");
			}
			break;
		}
	}
}
document.addEventListener("click", (event) => {
	const b = event.target.closest("[data-action]");
	if (b) action(b.dataset.action);
	const tab = event.target.closest("[data-credit]");
	if (tab) renderCredits(tab.dataset.credit);
	if (event.target.closest(".toggle")) {
		const el = event.target.closest(".toggle");
		if (el.id.startsWith("dev-")) {
			const key = el.id.slice(4);
			game.dev[key] = !game.dev[key];
			el.setAttribute("aria-pressed", game.dev[key]);
			el.textContent = game.dev[key] ? "On" : "Off";
		} else if (el.id === "shake" || el.id === "autoGrab") {
			settings[el.id] = !settings[el.id];
			el.setAttribute("aria-pressed", settings[el.id]);
			el.textContent = settings[el.id] ? "On" : "Off";
			saveSettings();
		}
	}
});
document.addEventListener("input", (e) => {
	const el = e.target;
	if (el.type !== "range") return;
	const val = Number(el.value),
		out = el.parentElement.querySelector("output");
	if (out)
		out.textContent = val + (el.id === "music" || el.id === "sfx" ? "%" : "");
	if (el.id === "music") {
		settings.music = val / 100;
		audio.setMusic(settings.music);
		saveSettings();
	} else if (el.id === "sfx") {
		settings.sfx = val / 100;
		audio.setSfx(settings.sfx);
		saveSettings();
	} else if (el.id.startsWith("tune-")) game.tuning[el.id.slice(5)] = val;
});
document.addEventListener("change", (e) => {
	if (e.target.id === "glyphs") {
		settings.glyphs = e.target.value;
		saveSettings();
		updatePrompts();
	}
	if (e.target.id === "warp" && e.target.value !== "") {
		game.checkpoint = Number(e.target.value);
		game.respawn();
		toast("Camp reached.", LEVEL.checkpoints[game.checkpoint].name);
	}
});
document.addEventListener("pointerover", (e) => {
	if (e.pointerType === "touch") return;
	const el = e.target.closest("button");
	if (el && focusables().includes(el)) {
		anyInput("keyboard");
		focusElement(el);
	}
});
document.addEventListener("keydown", (e) => {
	if (ended) return;
	if (anyInput("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	if (ended) return;
	if (
		["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) &&
		e.key !== "Escape"
	) {
		if (e.target.type === "range" && e.key === "Enter") return;
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
	}
	if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
		e.preventDefault();
	const menu = panelStack.length || game?.mode === "title";
	if (e.key === "Escape") {
		e.preventDefault();
		if (panelStack.length) closePanel();
		else pause();
		return;
	}
	if (menu) {
		if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
			navigateMenu(1);
			return;
		}
		if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
			navigateMenu(-1);
			return;
		}
		if (e.key === "ArrowLeft") adjustControl(-1);
		if (e.key === "ArrowRight") adjustControl(1);
		if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
			const f = focusables();
			const el = f.includes(document.activeElement)
				? document.activeElement
				: f[0];
			el?.click();
			e.preventDefault();
		}
		return;
	}
	if (e.repeat) return;
	keys.add(e.code);
	if (e.code === "Space") taps.jump = true;
	if (e.code === "KeyE") taps.grab = true;
	if (e.code === "KeyQ") taps.drop = true;
	if (e.code === "KeyM" || e.code === "Tab") {
		e.preventDefault();
		openPanel("map");
	}
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	touch.dx = touch.dy = 0;
	if (game?.mode === "playing" && !network.hubActive && !network.started)
		pause();
});
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("pointerdown", (e) => {
	if (ended) return;
	const type = e.pointerType === "touch" ? "touch" : "keyboard";
	if (anyInput(type)) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	if (e.target.closest("button,input,select,textarea,.panel")) return;
	if (game?.mode !== "playing") return;
	if (type === "touch") {
		if (e.clientX < innerWidth * 0.5 && touch.id === null) {
			touch.autoClimb = false;
			touch.id = e.pointerId;
			touch.x = e.clientX;
			touch.y = e.clientY;
			touch.dx = touch.dy = 0;
			$("#touch-stick").style.left = e.clientX + "px";
			$("#touch-stick").style.top = e.clientY + "px";
			$("#touch-stick").classList.remove("hidden");
		} else taps.jump = true;
	} else if (e.button === 0) taps.jump = true;
	else if (e.button === 2) taps.grab = true;
});
document.addEventListener("pointermove", (e) => {
	if (e.pointerId === touch.id) {
		touch.dx = Math.max(-1, Math.min(1, (e.clientX - touch.x) / 48));
		touch.dy = Math.max(-1, Math.min(1, (e.clientY - touch.y) / 48));
	} else if (
		e.pointerType !== "touch" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) > 0
	) {
		if (game?.mode === "attract") anyInput("keyboard");
		else anyInput("keyboard");
	}
});
function endTouch(e) {
	if (e.pointerId === touch.id) {
		touch.id = null;
		touch.dx = touch.dy = 0;
		$("#touch-stick").classList.add("hidden");
	}
}
document.addEventListener("pointerup", endTouch);
document.addEventListener("pointercancel", endTouch);
$("#touch-action").addEventListener("pointerdown", (e) => {
	if (ended) return;
	e.stopPropagation();
	anyInput("touch");
	const ctx = game.context();
	if (ctx?.action === "jump") taps.jump = true;
	else if (ctx?.action === "grab") taps.grab = true;
	else if (ctx?.action === "climb") {
		touch.dy = game.player.y < -3 ? -1 : 1;
		touch.autoClimb = true;
		touch.climbSeen = false;
	}
});
function pollGamepad(dt) {
	navCooldown = Math.max(0, navCooldown - dt);
	const pad = [...(navigator.getGamepads?.() || [])].find((p) => p?.connected);
	gamepadX = gamepadY = 0;
	if (!pad) {
		oldButtons = [];
		return;
	}
	const b = pad.buttons.map((v) => v.pressed || v.value > 0.5);
	const pressed = (i) => b[i] && !oldButtons[i];
	const ax = pad.axes[0] || 0,
		ay = pad.axes[1] || 0;
	if (ended) {
		oldButtons = b;
		return;
	}
	const active =
		Math.abs(ax) > 0.2 ||
		Math.abs(ay) > 0.2 ||
		Math.abs(pad.axes[3] || 0) > 0.2 ||
		b.some((v, i) => v && !oldButtons[i]);
	if (active) {
		if (anyInput("gamepad")) {
			oldButtons = b;
			return;
		}
		audio.unlock();
	}
	if (ended) {
		oldButtons = b;
		return;
	}
	gamepadX = Math.abs(ax) > 0.18 ? ax : 0;
	gamepadY = Math.abs(ay) > 0.18 ? ay : 0;
	const menu = panelStack.length || game?.mode === "title";
	if (menu) {
		const scrollAxis = pad.axes[3] || 0;
		const scrollPanel = $("#panel-container .scroll");
		if (scrollPanel && Math.abs(scrollAxis) > 0.2)
			scrollPanel.scrollTop += scrollAxis * dt * 650;
		if (navCooldown === 0) {
			if (ay > 0.55 || b[13]) {
				navigateMenu(1);
				navCooldown = 0.23;
			} else if (ay < -0.55 || b[12]) {
				navigateMenu(-1);
				navCooldown = 0.23;
			} else if (ax > 0.55 || b[15]) {
				adjustControl(1);
				navCooldown = 0.13;
			} else if (ax < -0.55 || b[14]) {
				adjustControl(-1);
				navCooldown = 0.13;
			}
		}
		if (pressed(0)) {
			const f = focusables();
			(f.includes(document.activeElement)
				? document.activeElement
				: f[0]
			)?.click();
		}
		if (pressed(1)) closePanel();
	} else {
		if (pressed(0)) taps.jump = true;
		if (pressed(2)) taps.grab = true;
		if (pressed(1)) taps.drop = true;
		if (pressed(3)) openPanel("map");
	}
	if (pressed(9) && !b[8]) pause();
	oldButtons = b;
}
function readInput() {
	return {
		x:
			gamepadX ||
			touch.dx ||
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
				(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
		y:
			gamepadY ||
			touch.dy ||
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
				(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0),
		...taps,
		autoGrab: settings.autoGrab || inputMethod === "touch",
	};
}
function handleEvents() {
	for (const e of game.drainEvents()) {
		if (
			[
				"jump",
				"land",
				"grab",
				"release",
				"coin",
				"relic",
				"hurt",
				"checkpoint",
			].includes(e.type)
		)
			audio.effect(e.type);
		if (e.type === "start") continue;
		if (e.type === "relic") {
			toast(
				e.name,
				`${game.collected.size} of 6 sun relics in the satchel`,
				3.5,
			);
			audio.speak("happy");
		}
		if (e.type === "checkpoint")
			toast(e.name, "Camp reached · Heart restored", 2.2);
		if (e.type === "hurt") {
			toast(e.text, "Back to the last flag · −5 seconds", 2.5);
			shake = 0.35;
			$("#flash").style.opacity = "1";
			audio.speak("hurt");
		}
		if (e.type === "rescue")
			toast("A friendly rescue.", "Hearts restored · Keep that hat on.", 3);
		if (e.type === "notice") toast(e.text, "The field map knows the way", 3.6);
		if (e.type === "finish") {
			audio.effect(e.won ? "win" : "death");
			network.result(game.score, {
				relics: game.collected.size,
				jumps: game.stats.jumps,
				swings: game.stats.swings,
				tumbles: game.deaths,
			});
			panelStack = ["results"];
			renderPanel("results");
		}
	}
}
function updateHUD() {
	const p = game.player;
	const zone = Math.min(5, Math.max(0, Math.floor(p.x / 48)));
	$("#zone-number").textContent =
		`Chapter ${String(zone + 1).padStart(2, "0")} / 06${p.y < -2 ? " · Below the roots" : ""}`;
	$("#zone-name").textContent = LEVEL.zones[zone];
	$("#timer").textContent = formatTime(game.remaining);
	$("#timer").classList.toggle("low", game.remaining < 60);
	$("#hearts").textContent =
		"♥".repeat(game.health) + "♡".repeat(3 - game.health);
	$("#score-value").textContent = game.score.toLocaleString();
	$$(".relic-dot").forEach((el, i) =>
		el.classList.toggle("found", game.collected.has(i)),
	);
	$("#objective-text").textContent =
		game.collected.size === 6
			? "All six found. Reach the far camp →"
			: `${6 - game.collected.size} sun relic${game.collected.size === 5 ? "" : "s"} to find. ${p.y < -2 ? "Watch for scorpions." : "Keep your hat on."}`;
	const ctx = game.context();
	const context = $("#context");
	if (
		ctx &&
		!panelStack.length &&
		game.mode === "playing" &&
		inputMethod !== "touch"
	) {
		context.innerHTML =
			promptFor(ctx.action === "climb" ? "climb" : ctx.action) + ctx.text;
		context.classList.remove("hidden");
	} else context.classList.add("hidden");
	const touchAction = $("#touch-action");
	touchAction.classList.toggle(
		"hidden",
		inputMethod !== "touch" ||
			!ctx ||
			!!panelStack.length ||
			game.mode !== "playing",
	);
	if (ctx) touchAction.textContent = ctx.text;
	const marker = $("#route-marker");
	if (marker) marker.style.left = Math.min(100, (p.x / 280) * 100) + "%";
}
function updateGhosts(dt) {
	let labelHTML = "";
	for (const [id, data] of ghosts) {
		const model = art.ghosts.get(id);
		if (!model) continue;
		const visible =
			performance.now() - data.seen < 5000 &&
			Math.abs(data.x - game.player.x) < 35;
		model.visible = visible;
		if (visible) {
			if (model.userData.setPose)
				model.userData.setPose(
					{
						...data,
						grounded: !data.swinging && !data.climbing,
						vx: data.vx || 3,
					},
					dt,
				);
			else {
				model.position.set(data.x, data.y, 0);
				model.userData.pose = data;
			}
		}
		if (performance.now() - data.seen < 5000) {
			const tag = document.createElement("div");
			tag.className = "ghost-tag";
			tag.style.borderColor = data.color || "#f2c451";
			tag.textContent = `${data.name || "Explorer"} · ${data.relics ?? 0}/6 · ${Math.floor(data.score || 0)}`;
			labelHTML += tag.outerHTML;
		}
	}
	$("#ghost-list").innerHTML = labelHTML;
}
function resize() {
	if (!renderer || !camera) return;
	renderer.setSize(innerWidth, innerHeight, false);
	const aspect = innerWidth / innerHeight;
	const width = aspect < 1 ? 24 : 34;
	camera.left = -width / 2;
	camera.right = width / 2;
	camera.top = width / aspect / 2;
	camera.bottom = -width / aspect / 2;
	camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
async function makeRenderer(forceWebGL = false) {
	const r = new THREE.WebGPURenderer({
		antialias: true,
		alpha: false,
		forceWebGL,
	});
	r.setPixelRatio(Math.min(devicePixelRatio, 2));
	r.toneMapping = THREE.ACESFilmicToneMapping;
	r.toneMappingExposure = 1.18;
	r.shadowMap.enabled = true;
	r.shadowMap.type = THREE.PCFSoftShadowMap;
	r.onDeviceLost = (info) => recoverGraphics(info);
	await r.init();
	r.domElement.id = "game-canvas";
	r.domElement.setAttribute("aria-label", "Pitfallin’ jungle expedition");
	return r;
}
async function recoverGraphics(info) {
	if (recovering) {
		while (recovering) await new Promise((r) => setTimeout(r, 50));
		return;
	}
	if (!renderer?.backend.isWebGPUBackend) return;
	recovering = true;
	const old = renderer;
	old.setAnimationLoop(null);
	old.onDeviceLost = () => {};
	try {
		const next = await makeRenderer(true);
		old.domElement.replaceWith(next.domElement);
		renderer = next;
		resize();
		renderRecovery = "WebGPU device loss: continued on WebGL2";
		renderer.setAnimationLoop(frameLoop);
	} catch (error) {
		console.error(error);
		toast("Graphics could not recover.", error.message, 30);
	} finally {
		old.dispose();
		recovering = false;
	}
}
async function preloadGraphics() {
	let timer;
	try {
		await Promise.race([
			(async () => {
				await renderer.compileAsync(scene, camera);
				await renderer.renderAsync(scene, camera);
			})(),
			new Promise((_, reject) => {
				timer = setTimeout(
					() => reject(new Error("Graphics initialization timed out")),
					network.hubActive && renderer.backend.isWebGPUBackend ? 6500 : 14000,
				);
			}),
		]);
	} catch (error) {
		if (renderer.backend.isWebGPUBackend || renderRecovery) {
			await recoverGraphics(error);
			await renderer.compileAsync(scene, camera);
			await renderer.renderAsync(scene, camera);
		} else throw error;
	} finally {
		clearTimeout(timer);
	}
}
let watchdogFrames = -1,
	watchdogTime = performance.now();
setInterval(() => {
	if (
		!loaded ||
		!renderer?.backend.isWebGPUBackend ||
		document.visibilityState !== "visible"
	)
		return;
	if (frameCount !== watchdogFrames) {
		watchdogFrames = frameCount;
		watchdogTime = performance.now();
	} else if (performance.now() - watchdogTime > 4500) {
		watchdogTime = performance.now();
		recoverGraphics({ message: "Graphics frame stalled" });
	}
}, 1500);
async function boot() {
	try {
		await RAPIER.init();
		game = new Game(RAPIER);
		$("#loading-text").textContent = "Inking the canopy…";
		scene = new THREE.Scene();
		scene.background = new THREE.Color("#88b5a2");
		scene.fog = new THREE.Fog("#88b5a2", 42, 100);
		camera = new THREE.OrthographicCamera(-17, 17, 10, -10, 0.1, 150);
		renderer = await makeRenderer(
			new URLSearchParams(location.search).get("renderer") === "webgl",
		);
		renderer.domElement.id = "game-canvas";
		renderer.domElement.setAttribute(
			"aria-label",
			"Pitfallin’ jungle expedition",
		);
		document.body.prepend(renderer.domElement);
		const hemi = new THREE.HemisphereLight(0xf7e8bc, 0x294c43, 2.6);
		scene.add(hemi);
		light = new THREE.DirectionalLight(0xffedb3, 3);
		light.position.set(10, 16, 14);
		light.castShadow = true;
		light.shadow.mapSize.set(2048, 2048);
		light.shadow.camera.left = -22;
		light.shadow.camera.right = 22;
		light.shadow.camera.top = 16;
		light.shadow.camera.bottom = -14;
		light.shadow.bias = -0.0006;
		light.shadow.normalBias = 0.04;
		scene.add(light, light.target);
		const fill = new THREE.DirectionalLight(0x9ae3d8, 1.4);
		fill.position.set(-10, 8, -8);
		scene.add(fill);
		art = createArt(THREE, scene, LEVEL);
		camera.position.set(20, 7.8, 25);
		camera.lookAt(20, 2.8, 0);
		resize();
		$("#loading-text").textContent = "Letting the sunlight in…";
		await preloadGraphics();
		$("#relic-dots").innerHTML = LEVEL.relics
			.map(() => '<i class="relic-dot"></i>')
			.join("");
		resize();
		loaded = true;
		await networkReady;
		updatePrompts();
		$("#loading").classList.add("hidden");
		if (network.hubActive) {
			$("#title").classList.add("hidden");
			$("#hud").classList.remove("hidden");
			game.mode = "waiting";
			$("#countdown").classList.remove("hidden");
			$("#countdown span").textContent = "";
			network.ready();
			if (hubPending) startRace(hubPending);
		} else {
			showTitle();
		}
		window.__gameReady = true;
		let previous = performance.now(),
			accumulator = 0;
		frameLoop = (now) => {
			const dt = Math.min(0.06, (now - previous) / 1000) || 0.016;
			previous = now;
			elapsed += dt;
			frameCount++;
			pollGamepad(dt);
			if (game.mode === "title" && now - lastInput >= 10000) {
				panelStack = [];
				$("#panel-container").innerHTML = "";
				game.start(true);
				$("#title").classList.add("hidden");
				$("#hud").classList.remove("hidden");
				$("#attract-banner").classList.remove("hidden");
				$("#toast").classList.add("hidden");
			}
			if (game.mode === "waiting") {
				const left = network.hubActive
					? -globalThis.AIHub.time() / 1000
					: (startDeadline - Date.now()) / 1000;
				$("#countdown span").textContent =
					Number.isFinite(left) && left > 0 ? Math.ceil(left) : "";
				if (left <= 0) {
					game.mode = "playing";
					$("#countdown").classList.add("hidden");
				}
			}
			const input = readInput();
			if (game.mode === "paused" && network.hubActive)
				game.remaining = Math.max(0, game.remaining - dt);
			accumulator += dt;
			let first = true;
			while (accumulator >= 1 / 60) {
				game.update(
					1 / 60,
					first ? input : { ...input, jump: false, grab: false, drop: false },
				);
				accumulator -= 1 / 60;
				first = false;
			}
			if (!first) Object.keys(taps).forEach((k) => (taps[k] = false));
			handleEvents();
			if (touch.autoClimb) {
				if (game.player.climbing) touch.climbSeen = true;
				if ((touch.climbSeen && !game.player.climbing) || input.jump) {
					touch.autoClimb = false;
					touch.dy = 0;
				}
			}
			const title = game.mode === "title";
			let renderState = game;
			if (title) {
				renderState = {
					...game,
					time: elapsed,
					player: { ...game.player, x: 25, y: 0.025, vx: 0, grounded: true },
					vines: LEVEL.vines.map((v) => ({
						...v,
						angle: Math.sin(elapsed * 0.72 + v.phase) * 0.99,
					})),
				};
			}
			art.update(renderState, dt);
			updateGhosts(dt);
			const targetX = title ? 20 : game.player.x + 4.5;
			const targetY = title
				? 2.8
				: game.player.y < -1
					? game.player.y + 2.4
					: 2.7;
			cameraX += (targetX - cameraX) * (1 - Math.exp(-dt * 4));
			cameraY += (targetY - cameraY) * (1 - Math.exp(-dt * 4));
			shake = Math.max(0, shake - dt);
			const s = settings.shake ? shake * 0.17 : 0;
			camera.position.set(
				cameraX + Math.sin(elapsed * 93) * s,
				cameraY + 5 + Math.cos(elapsed * 80) * s,
				25,
			);
			camera.lookAt(cameraX, cameraY, 0);
			light.position.set(cameraX + 8, 17, 12);
			light.target.position.set(cameraX, 0, 0);
			if (game.mode !== "title") updateHUD();
			if (now > toastUntil) $("#toast").classList.add("hidden");
			$("#flash").style.opacity = String(
				Math.max(0, Number($("#flash").style.opacity || 0) - dt * 3),
			);
			audio.update(
				{
					mode: panelStack.at(-1) || game.mode,
					time: game.time,
					player: game.player,
				},
				dt,
			);
			if (
				game.mode === "playing" ||
				game.mode === "paused" ||
				game.mode === "results"
			)
				network.tick(game, dt);
			renderer.render(scene, camera);
		};
		renderer.setAnimationLoop(frameLoop);
		window.__pitfallin = {
			version: "1.0.0",
			get state() {
				return {
					...game.snapshot(),
					inputMethod,
					panel: panelStack.at(-1) || null,
					renderer: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
					frames: frameCount,
					renderRecovery,
					network: network.inspect(),
					audio: audio.inspect(),
					animations: art.player.userData.actions
						? Object.keys(art.player.userData.actions)
						: "native mixer",
				};
			},
			start: () => startSolo(),
			pause,
			action,
			openPanel,
			closePanel,
			teleport: (x, y) => game.teleport(x, y),
			step: (n, input = {}) => {
				for (let i = 0; i < n; i++) game.update(1 / 60, input);
				handleEvents();
				return game.snapshot();
			},
			setTuning: (v) => Object.assign(game.tuning, v),
			setDev: (v) => Object.assign(game.dev, v),
			getGame: () => game,
			getNetwork: () => network,
			offlineAudio: createOfflineSample,
			loseDevice: () => renderer.backend.device?.destroy(),
			report,
			forceAttract: () => {
				showTitle();
				lastInput = performance.now() - 10001;
			},
			capture: () => renderer.domElement.toDataURL(),
			renderInfo: () => ({
				calls: renderer.info.render.calls,
				triangles: renderer.info.render.triangles,
				geometries: renderer.info.memory.geometries,
			}),
		};
	} catch (error) {
		console.error(error);
		$("#loading-text").textContent =
			"The expedition could not start: " + error.message;
		$(".loading-mark").style.animation = "none";
		globalThis.AIHub?.fail?.(error.message);
		window.__bootError = String(error);
	}
}
boot();
