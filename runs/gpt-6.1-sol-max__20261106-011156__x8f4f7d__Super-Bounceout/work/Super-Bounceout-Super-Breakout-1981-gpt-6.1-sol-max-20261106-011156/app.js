const $ = (id) => document.getElementById(id);
const settings = {
	music: 0.1,
	sfx: 0.65,
	mute: false,
	glyphs: "PlayStation",
	reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
	relaxed: false,
	...safeStore.get("settings", {}),
};
const audio = new SoundRack(settings);
const app = {
	screen: "title",
	modal: null,
	modalParent: null,
	lastInput: "keyboard",
	lastActivity: performance.now(),
	lastPad: [],
	padRepeat: 0,
	keys: new Set(),
	pointer: null,
	touchX: null,
	focus: 0,
	annUntil: 0,
	attractSince: 0,
	attractStage: 0,
	hubStarted: false,
	hubEnded: false,
	reported: false,
	onlineStart: 0,
	netLast: 0,
	progressLast: 0,
	ghosts: new Map(),
	best: safeStore.get("best", 0),
	dev: false,
	wire: false,
	debugLines: null,
};
let game, view;
const link = new RaceLink(receiveRace, (status) => {
	app.roomStatus = status;
	if (app.modal === "online") renderOnline();
	if (link.started) toast(status);
});
const escapeHtml = (value) =>
	String(value).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
let toastTimer;
function toast(message) {
	$("toast").textContent = message;
	$("toast").hidden = false;
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => ($("toast").hidden = true), 3500);
}
function remember() {
	safeStore.set("settings", settings);
	audio.updateVolumes();
}
function setInput(type) {
	if (app.lastInput === type) return;
	app.lastInput = type;
	document.body.classList.toggle("touch-mode", type === "touch");
	updatePrompts();
}
function activity(type) {
	setInput(type);
	app.lastActivity = performance.now();
	if (app.screen === "attract") {
		returnTitle();
		return true;
	}
	return false;
}
function prompts() {
	return app.lastInput === "gamepad"
		? settings.glyphs === "Xbox"
			? {
					confirm: "A",
					action: "A",
					pause: "☰",
					back: "B",
					move: "L",
					nav: "✚",
				}
			: {
					confirm: "✕",
					action: "✕",
					pause: "≡",
					back: "◯",
					move: "L",
					nav: "✚",
				}
		: app.lastInput === "touch"
			? {
					confirm: "TAP",
					action: "TAP",
					pause: "MENU",
					back: "BACK",
					move: "DRAG",
					nav: "TAP",
				}
			: {
					confirm: "Enter",
					action: "Space",
					pause: "Esc",
					back: "Esc",
					move: game?.coop ? "A D / MOUSE" : "A D / ← →",
					nav: "↑ ↓",
				};
}
function updatePrompts() {
	const p = prompts();
	document.querySelectorAll("[data-prompt]").forEach((el) => {
		el.textContent = p[el.dataset.prompt];
	});
}
function interactive() {
	const root = app.modal
		? $("modalBody")
		: app.screen === "title"
			? document.querySelector(".cabinet")
			: $("app");
	return [
		...root.querySelectorAll("button:not(:disabled),input:not(:disabled)"),
	].filter(
		(el) =>
			el.offsetWidth > 0 && el.offsetHeight > 0 && !el.closest("[hidden]"),
	);
}
function focusAt(n) {
	const els = interactive();
	if (!els.length) return;
	app.focus = (n + els.length) % els.length;
	document.querySelectorAll(".focused").forEach((e) => {
		e.classList.remove("focused");
	});
	const el = els[app.focus];
	el.classList.add("focused");
	el.focus({ preventScroll: true });
	el.scrollIntoView({ block: "nearest", behavior: "instant" });
}
function moveFocus(delta) {
	focusAt(app.focus + delta);
	audio.effect("menu");
}
function adjustControl(delta) {
	const el = interactive()[app.focus];
	if (el?.tagName === "INPUT" && el.type === "range") {
		el.value = String(
			clamp(
				Number(el.value) + Number(el.step || 1) * delta,
				Number(el.min),
				Number(el.max),
			),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (el?.tagName === "BUTTON") el.click();
}
function showModal(name, title, body, eyebrow = "FLIGHT SYSTEMS") {
	app.modal = name;
	$("modalTitle").textContent = title;
	$("modalEyebrow").textContent = eyebrow;
	$("modalBody").innerHTML = body;
	$("modal").hidden = false;
	$("modalExtra").textContent = "";
	updatePrompts();
	app.focus = 0;
	if (app.lastInput === "gamepad" || app.lastInput === "keyboard") focusAt(0);
}
function hideModal() {
	app.modal = null;
	$("modal").hidden = true;
	document.querySelectorAll(".focused").forEach((e) => {
		e.classList.remove("focused");
	});
	app.lastActivity = performance.now();
}
function back() {
	audio.effect("menu");
	if (
		app.modal === "dev" ||
		(app.modal === "settings" && app.screen === "play")
	)
		pauseMenu();
	else if (app.modal === "creditsTab") {
		showAbout();
	} else if (app.modal === "online") {
		link.close();
		app.ghosts.clear();
		hideModal();
	} else if (app.modal === "intro") {
		hideModal();
		game.serve();
	} else if (app.modal === "stageclear") {
		continueRun();
	} else if (app.modal === "result") {
		if (!AIHub.active && !link.started) returnTitle();
	} else hideModal();
}
function setScreen(screen) {
	app.screen = screen;
	$("app").dataset.screen = screen;
	$("attractBadge").hidden = screen !== "attract";
}
function newGame(options = {}) {
	if (game) game.dispose();
	game = new BreakoutGame(options);
	view.load(game);
	game.events = [];
	app.reported = false;
	app.annUntil = 0;
	app.pointer = null;
	app.touchX = null;
	updatePrompts();
	updateHUD();
}
function startGame(coop = false, hub = false) {
	if (AIHub.active && !hub) return;
	audio.unlock();
	hideModal();
	app.ghosts.clear();
	newGame({ coop, relaxed: hub || link.started ? false : settings.relaxed });
	setScreen("play");
	app.dev = false;
	app.wire = false;
	app.hubEnded = false;
	$("crewLabel").textContent = coop
		? "TWO PILOTS · ONE FLIGHT"
		: hub
			? "HUB SCORE RACE"
			: link.started
				? "LINK SCORE RACE"
				: "SOLO FLIGHT";
	if (coop) toast("Pilot 1: A/D or mouse. Pilot 2: ←/→ or second controller.");
	if (hub || link.started) {
		game.serve();
		announce("BLAST AHEAD!", 1.7);
	} else showIntro();
}
function showIntro() {
	const s = STAGES[game.stage];
	showModal(
		"intro",
		s.name,
		`<p>${s.subtitle}</p><p>${s.detail}</p><p class="small-note">Move with the left stick, A/D, arrow keys or mouse. Serve with <span class="key" data-prompt="action">Space</span>. Tap it just before contact for a POP: extra power and double points.</p><button class="primary" data-action="begin">BLAST AHEAD <span>↗</span></button>`,
		`SECTOR 0${game.stage + 1} / ${s.mode}`,
	);
}
function pauseMenu() {
	if (app.hubEnded || app.screen === "attract") return;
	if (app.screen === "title") {
		showSettings();
		return;
	}
	showModal(
		"pause",
		"Taking a breather.",
		`<div class="menu-list"><button data-action="resume">RESUME FLIGHT <span>↗</span></button><button data-action="settings">SETTINGS <span>♫</span></button><button data-action="guide">FLIGHT MANUAL <span>?</span></button>${!AIHub.active && !link.started ? '<button data-action="dev">DEVELOPER TOOLS <span>⚙</span></button><button data-action="restart">RESTART RUN <span>↺</span></button><button data-action="title">RETURN TO TITLE <span>↙</span></button>' : ""}<button data-action="about">ABOUT & CREDITS <span>©</span></button></div>`,
		AIHub.active || link.started
			? "SCORE RACE · THE CLOCK KEEPS RUNNING"
			: "PAUSED / ALL SYSTEMS HOLD",
	);
}
function returnTitle() {
	if (AIHub.active) return;
	link.close();
	hideModal();
	app.ghosts.clear();
	newGame();
	setScreen("title");
	app.focus = 0;
	app.dev = false;
	app.wire = false;
	app.onlineStart = 0;
	app.lastActivity = performance.now();
	audio.setSilent(false);
	updatePace();
}
function announce(message, seconds = 1.4) {
	$("announcement").textContent = message;
	$("announcement").classList.add("show");
	app.annUntil = performance.now() + seconds * 1000;
}
function action() {
	if (app.hubEnded) return;
	if (app.modal || app.screen === "title") {
		const el = interactive()[app.focus];
		if (el?.tagName === "INPUT" && el.type === "text") return;
		el?.click();
		return;
	}
	if (game.status === "serve") {
		game.serve();
		audio.effect("serve");
	} else if (game.status === "playing") game.armPop();
}
function showSettings() {
	showModal(
		"settings",
		"Set your frequency.",
		`
  <div class="setting-row"><label for="musicVolume">Music<small>Procedural orbital radio. Default 10%.</small></label><input id="musicVolume" type="range" min="0" max="100" step="1" value="${Math.round(settings.music * 100)}" data-setting="music"><output>${Math.round(settings.music * 100)}%</output></div>
  <div class="setting-row"><label for="sfxVolume">Effects & chatter<small>Hits, pops and our gibberish flight crew.</small></label><input id="sfxVolume" type="range" min="0" max="100" step="1" value="${Math.round(settings.sfx * 100)}" data-setting="sfx"><output>${Math.round(settings.sfx * 100)}%</output></div>
  <div class="setting-row"><label>Button glyphs</label><button data-action="glyphs">${settings.glyphs}</button></div>
  ${!AIHub.active && !link.started ? `<div class="setting-row"><label>Next flight pace<small>Applies when you start a new run.</small></label><button data-action="pace">${settings.relaxed ? "CRUISE" : "ARCADE"}</button></div>` : ""}
  <div class="setting-row"><label>Reduced motion<small>Less shake, no ball trails.</small></label><button data-action="motion">${settings.reduced ? "ON" : "OFF"}</button></div>
  <div class="setting-row"><label>Sound</label><button data-action="mute">${settings.mute ? "MUTED" : "ON"}</button></div>
  <p class="small-note">Cruise pace is selected on the title screen. Touch play adds a wider paddle, automatic POP timing and a gentle landing assist.</p><button class="underlined" data-action="back">BACK TO FLIGHT ↙</button>`,
	);
}
function showGuide() {
	showModal(
		"guide",
		"A field guide to space.",
		`<div class="manual-grid"><div class="manual-card"><span>↔</span><strong>Find your angle.</strong><p>Centre hits fly straight. Edge hits cut across the field. Punch a path up either side.</p></div><div class="manual-card"><span>✳</span><strong>Give it a POP.</strong><p>Tap just before impact. A gold ball smashes a neighbour and doubles points for 2.4 seconds. Recharges in 3 seconds.</p></div><div class="manual-card"><span>◎</span><strong>Keep company.</strong><p>Free captive balls by breaking both marked seals. Each live ball multiplies your points. Only losing every ball costs a serve.</p></div><div class="manual-card"><span>↧</span><strong>Watch your ceiling.</strong><p>Reaching the roof halves the paddle. Cruise keeps it wide. In Progressive, walls advance instead: clear 64 bricks before they cost your serves.</p></div></div><p class="manual-controls"><strong>PAD</strong> Left stick / D-pad · ✕ serve / POP · Options pause<br><strong>KEYS</strong> A/D or ←/→ · Space serve / POP · Esc pause<br><strong>MOUSE</strong> Move over field · Click serve / POP<br><strong>CO-OP</strong> P1 A/D + Space or mouse · P2 ←/→ + Enter; or two pads.<br><strong>TOUCH</strong> Drag anywhere to move · Tap to serve · POP timing is assisted.</p><button class="underlined" data-action="back">GOT IT. ↙</button>`,
		"PILOT TRAINING / NO EXPERIENCE NECESSARY",
	);
}
function showAbout(tab = "source") {
	const labels = {
		source: "Source Information",
		testing: "Testing Feedback",
		engine: "Engine Feedback",
		prompt: "Prompt Feedback",
	};
	const tabs = Object.entries(labels)
		.map(
			([key, label]) =>
				`<button class="${key === tab ? "selected" : ""}" data-credit="${key}">${label}</button>`,
		)
		.join("");
	let content = "";
	if (tab === "source")
		content =
			'<table class="credits-table">' +
			Object.entries(EXIT_INTERVIEW.sourceInformation)
				.map(
					([k, v]) =>
						`<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
				)
				.join("") +
			'</table><p class="small-note">Independent tribute. Super Breakout belongs to Atari. Code, procedural art and synthesized audio created for this demo. Three.js / PeerJS: MIT. Rapier: Apache-2.0. AI Hub session client: included unmodified.</p><p class="small-note"><a href="https://atariage.com/2600/manuals_old/super_breakout.html" target="_blank" rel="noreferrer">Atari source manual</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noreferrer">AI Hub protocol</a></p>';
	else
		content =
			'<ol class="feedback-list">' +
			EXIT_INTERVIEW[tab + "Feedback"]
				.map((s) => `<li>${escapeHtml(s)}</li>`)
				.join("") +
			"</ol>";
	showModal(
		"about",
		labels[tab],
		`<div class="credits-tabs">${tabs}</div>${content}`,
		"SUPER BOUNCEOUT / MADE OF CODE & COLOUR",
	);
	if (AIHub.active)
		$("modalBody")
			.querySelectorAll("a")
			.forEach((a) => {
				a.removeAttribute("href");
				a.removeAttribute("target");
			});
}
function showDev() {
	if (AIHub.active || link.started) return;
	app.dev = true;
	const rows = [
		["ballSpeed", "Ball speed", 5, 20, 0.2],
		["paddleWidth", "Paddle width", 2, 6, 0.1],
		["paddleSpeed", "Paddle speed", 10, 40, 1],
		["popWindow", "POP timing window", 0.1, 0.55, 0.01],
		["advanceSeconds", "Wall interval", 4, 20, 0.5],
		["timeScale", "Simulation speed", 0.25, 3, 0.25],
	]
		.map(
			([key, label, min, max, step]) =>
				`<div class="setting-row"><label for="dev-${key}">${label}</label><input id="dev-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${game.config[key]}" data-tune="${key}"><output>${game.config[key]}</output></div>`,
		)
		.join("");
	showModal(
		"dev",
		"Mission control.",
		`${rows}<div class="dev-grid"><button data-action="autopilot">AUTOPILOT ${game.autopilot ? "ON" : "OFF"}</button><button data-action="invincible">INFINITE SERVES ${game.invincible ? "ON" : "OFF"}</button><button data-action="wire">PHYSICS LINES ${app.wire ? "ON" : "OFF"}</button><button data-action="step">STEP 1/60 SEC</button><button data-action="addball">ADD BALL</button><button data-action="addlife">ADD SERVE</button><button data-action="free">FREE CAPTIVES</button><button data-action="clear">CLEAR SECTOR</button><button data-action="skip">NEXT SECTOR</button><button data-action="resetTune">RESET DEFAULTS</button></div><button class="underlined" data-action="resume">RESUME WITH CHANGES ↗</button><p class="small-note">Developer flights do not save personal bests. Values apply immediately. Ball speed also retunes existing balls.</p>`,
		"DEVELOPER MODE / LIVE CONTROLS",
	);
}
function showOnline() {
	if (AIHub.active) return;
	app.roomStatus = "Private score races. Every pilot gets their own field.";
	showModal(
		"online",
		"Company, at a distance.",
		`<p>Race the same four fields with up to four pilots. Your crew appears as ghost paddles. Highest score wins.</p><div class="menu-list"><button data-action="host">CREATE A ROOM <span>↗</span></button></div><input class="room-input" id="roomCodeInput" maxlength="6" autocomplete="off" placeholder="ROOM CODE" aria-label="Six-letter room code"><div class="menu-list"><button data-action="join">JOIN ROOM <span>◎</span></button></div><p class="small-note" id="roomStatus">${app.roomStatus}</p><p class="small-note">Share the six-letter code. Direct browser link via PeerJS; requires internet and a network that permits WebRTC. No account, chat or microphone.</p>`,
		"LINK PLAY / 1–4 PILOTS",
	);
}
function renderOnline() {
	if (app.modal !== "online") return;
	if (!link.active) {
		if ($("roomStatus")) $("roomStatus").textContent = app.roomStatus;
		return;
	}
	const pilots = link.roster
		.map(
			(p) =>
				`<div class="race-row"><span class="race-color" style="background:${escapeHtml(p.color)}"></span>${escapeHtml(p.name)}${p.id === link.me ? " · YOU" : ""}</div>`,
		)
		.join("");
	showModal(
		"online",
		"You have company.",
		`<div class="eyebrow">ROOM CODE</div><div class="room-code">${escapeHtml(link.code)}</div><p class="small-note">Send this code to your crew. Keep this screen open.</p><div id="roomRoster">${pilots || "<p>Connecting to the crew…</p>"}</div><p class="small-note" id="roomStatus">${escapeHtml(app.roomStatus || "Standing by.")}</p>${link.host ? `<button class="primary" data-action="launchRace" ${link.roster.length < 2 ? "disabled" : ""}>LAUNCH RACE <span>↗</span></button>` : "<p>Waiting for Pilot 1 to launch the race.</p>"}<button class="underlined" data-action="back">LEAVE ROOM ↙</button>`,
		"LINK PLAY / PRIVATE ROOM",
	);
}
async function connectRoom(host) {
	const code = $("roomCodeInput")?.value || "";
	if (!host && code.length !== 6) {
		toast("Enter a six-letter room code.");
		return;
	}
	app.roomStatus = "Tuning the link radio…";
	if ($("roomStatus")) $("roomStatus").textContent = app.roomStatus;
	try {
		await link.open(host, code);
		if (app.modal === "online") renderOnline();
		else link.close();
	} catch (e) {
		app.roomStatus = e.message;
		if ($("roomStatus")) $("roomStatus").textContent = e.message;
		toast(e.message);
	}
}
function receiveRace(data, from) {
	if (data.type === "start" && !AIHub.active) {
		link.started = true;
		hideModal();
		startGame(false);
		app.onlineStart = data.at;
		announce("LINKED. STAND BY…", 3);
		return;
	}
	if (
		data.type === "ghost" &&
		Number.isFinite(data.x) &&
		Number.isFinite(data.score) &&
		Number.isInteger(data.stage)
	) {
		const roster = AIHub.active ? AIHub.players : link.roster;
		const player = roster?.find((p) => p.id === from);
		if (!player) return;
		app.ghosts.set(from, {
			id: from,
			x: clamp(data.x, -10, 10),
			stage: clamp(data.stage, 0, 3),
			score: Math.max(0, data.score),
			done: !!data.done,
			color: player.color,
			name: player.name,
			seen: performance.now(),
		});
	}
	if (data.type === "leave") app.ghosts.delete(from);
}
function continueRun() {
	hideModal();
	if (game.status === "stage-clear") {
		game.nextStage();
		view.load(game);
		game.events = [];
		updateHUD();
		if (AIHub.active || link.started) {
			game.serve();
			announce(STAGES[game.stage].name.toUpperCase(), 2);
		} else showIntro();
	}
}
function finishRun(won) {
	if (!app.dev && !AIHub.active && !link.started && game.score > app.best) {
		app.best = game.score;
		safeStore.set("best", app.best);
	}
	reportResult();
	if (app.screen === "attract") return;
	const rank = won
		? game.lives >= 4
			? "COSMIC NATURAL"
			: "SPACE MAKER"
		: "A GOOD DAY TO TRY AGAIN";
	const rivals = [...app.ghosts.values()].sort((a, b) => b.score - a.score);
	const race = rivals.length
		? '<p class="small-note">Crew scores update live until every pilot finishes.</p><div id="resultRace"></div>'
		: "";
	showModal(
		"result",
		won ? "Space. Made." : "Signal lost.",
		`<div class="eyebrow">${rank}</div><div class="result-number">${String(game.score).padStart(5, "0")}</div><div class="result-grid"><div>FIELDS CLEARED<strong>${game.metrics.stages.length} / 4</strong></div><div>PERFECT POPS<strong>${game.metrics.pops}</strong></div><div>BRICKS BROKEN<strong>${game.metrics.hits}</strong></div></div>${race}${!AIHub.active && !link.started ? '<button class="primary" data-action="again">ANOTHER FLIGHT? <span>↗</span></button><button class="underlined" data-action="title">BACK TO TITLE ↙</button>' : !AIHub.active ? `${link.host ? '<button class="primary" id="rematchButton" data-action="rematch" disabled>ANOTHER RACE <span>↗</span></button>' : ""}<p class="small-note" id="resultRaceStatus">Standing by for the other pilots.</p><button class="underlined" data-action="title">LEAVE RACE ↙</button>` : '<p class="small-note">Flight recorded. Standing by for the other pilots.</p>'}`,
		won ? "MISSION COMPLETE / THE UNIVERSE THANKS YOU" : "END OF TRANSMISSION",
	);
}
function reportResult() {
	if (app.reported) return;
	if (AIHub.active && app.hubStarted && !app.hubEnded) {
		AIHub.result({
			score: game.score,
			stats: {
				"Bricks broken": game.metrics.hits,
				"Perfect POPs": game.metrics.pops,
				"Fields cleared": game.metrics.stages.length,
			},
			awards:
				game.metrics.freed >= 2
					? [{ title: "Good company", detail: "Freed both captive signals." }]
					: [],
		});
		app.reported = true;
	} else if (link.started) {
		link.send({
			type: "ghost",
			x: game.paddles[0].x,
			stage: game.stage,
			score: game.score,
			done: true,
		});
		app.reported = true;
	}
}
function updatePace() {
	document
		.querySelector('[data-action="arcade"]')
		.classList.toggle("selected", !settings.relaxed);
	document
		.querySelector('[data-action="cruise"]')
		.classList.toggle("selected", settings.relaxed);
	$("paceDetail").textContent = settings.relaxed
		? "Slower ball. Wider paddle. Same adventure."
		: "The full five-serve flight.";
}
function updateHUD() {
	const s = STAGES[game.stage],
		snap = game.snapshot();
	$("sectorLabel").textContent = `SECTOR 0${game.stage + 1}`;
	$("modeLabel").textContent = s.mode;
	const score = app.screen === "title" ? 0 : game.score;
	$("score").textContent = String(score).padStart(5, "0");
	$("bestScore").textContent = String(app.best).padStart(5, "0");
	$("mobileScore").textContent = String(score).padStart(5, "0");
	$("mobileLives").textContent = "●".repeat(Math.max(0, game.lives));
	$("lifePips").innerHTML = Array.from(
		{ length: Math.max(5, game.lives) },
		(_, i) => `<span class="${i < game.lives ? "" : "used"}">●</span>`,
	).join("");
	$("routeList").innerHTML = STAGES.map(
		(s, i) =>
			`<li class="${i === game.stage ? "current" : i < game.stage ? "complete" : ""}"><span>${i < game.stage ? "✓" : "0" + (i + 1)}</span><div><strong>${s.name}</strong><small>${s.mode}</small></div></li>`,
	).join("");
	$("missionNote").textContent = s.detail;
	$("popState").textContent =
		game.popCooldown > 0 ? game.popCooldown.toFixed(1) + "s" : "READY";
	$("popWord").textContent = game.popArmed > 0 ? "NOW!" : "POP!";
	$("popMeter").style.width = (1 - game.popCooldown / 3) * 100 + "%";
	const pct = Math.min(100, Math.round((game.destroyed / game.target) * 100));
	$("clearPercent").textContent = pct + "%";
	$("clearMeter").style.width = pct + "%";
	$("progressLabel").textContent =
		app.screen === "title"
			? "64 BRICKS / 1 SMALL SHIP"
			: `${game.destroyed} / ${game.target} BRICKS`;
	$("boardStatus").textContent =
		app.screen === "title"
			? "INTERSTELLAR TEST TRANSMISSION"
			: app.dev
				? "DEVELOPER FLIGHT"
				: game.stage === 3
					? `NEXT ADVANCE ${Math.max(0, game.config.advanceSeconds * Math.max(0.55, 1 - game.destroyed / 160) - game.advanceClock).toFixed(1)}s`
					: game.small
						? "TOPSIDE / NARROW PADDLE"
						: snap.balls.length > 1
							? `${snap.balls.length} SIGNALS / ×${snap.balls.length} POINTS`
							: "FIND YOUR ANGLE";
	const msg = $("boardMessage");
	msg.style.opacity =
		game.status === "serve" || app.screen === "title" ? "1" : "0";
	msg.querySelector(".smallcaps").textContent =
		app.screen === "title"
			? "SYSTEMS ONLINE"
			: `SECTOR 0${game.stage + 1} / ${s.mode}`;
	msg.querySelector("strong").textContent =
		app.screen === "title"
			? "STAND BY, PILOT."
			: app.lastInput === "touch"
				? "TAP TO SERVE"
				: `PRESS ${prompts().action.toUpperCase()} TO SERVE`;
	$("touchPop").classList.toggle(
		"available",
		app.lastInput === "touch" &&
			game.status === "playing" &&
			game.popCooldown <= 0 &&
			snap.balls.some((b) => b.y < -6 && b.vy < 0),
	);
	const rows = [...app.ghosts.values()].sort((a, b) => b.score - a.score);
	const rowHtml = rows
		.map(
			(g) =>
				`<div class="race-row"><span class="race-color" style="background:${escapeHtml(g.color)}"></span><span>${escapeHtml(g.name)}${g.done ? " ✓" : ""}</span><strong>${String(g.score).padStart(5, "0")}</strong></div>`,
		)
		.join("");
	$("raceList").innerHTML = rowHtml;
	if ($("resultRace")) $("resultRace").innerHTML = rowHtml;
	if (link.started && app.modal === "result") {
		const complete =
			rows.length >= link.roster.length - 1 && rows.every((g) => g.done);
		if ($("rematchButton")) $("rematchButton").disabled = !complete;
		if ($("resultRaceStatus"))
			$("resultRaceStatus").textContent = complete
				? rows.every((g) => g.score <= game.score)
					? "TOP SIGNAL! You finished in first place."
					: "All signals received. Scores are final."
				: "Standing by for the other pilots.";
	}
}
function handleEvents() {
	for (const e of game.events.splice(0)) {
		view.event(e);
		if (e.type === "brick") {
			audio.effect("brick", e.value / 10);
			if (e.value >= 50) {
				const p = view.screen(e.x, e.y),
					el = document.createElement("span");
				el.className = "float-text";
				el.textContent = "+" + e.value;
				el.style.left = p.x + "px";
				el.style.top = p.y + "px";
				$("floatLayer").append(el);
				setTimeout(() => el.remove(), 850);
			}
		} else if (e.type === "paddle") {
			audio.effect(e.pop ? "pop" : "paddle");
			if (e.pop) {
				announce("POP!", 0.55);
				rumble(0.45);
			}
		} else if (e.type === "wall") audio.effect("wall");
		else if (e.type === "free") {
			audio.effect("free");
			announce("YOU HAVE COMPANY!", 1.5);
		} else if (e.type === "shrink") {
			audio.tone(560, 0.23, 0.12, "triangle", 280);
			announce("TOPSIDE! PADDLE SHRUNK.", 1.4);
		} else if (e.type === "advance") audio.effect("advance");
		else if (e.type === "miss") {
			audio.effect("miss");
			announce("SIGNAL LOST. TRY AGAIN.", 1.2);
			rumble(0.25);
		} else if (e.type === "stage-clear") {
			audio.effect("win");
			if (app.screen === "attract") continueRun();
			else if (AIHub.active || link.started) {
				continueRun();
			} else
				showModal(
					"stageclear",
					"A little more space.",
					`<p>${STAGES[game.stage].name}: field cleared.</p><div class="result-grid"><div>FLIGHT SCORE<strong>${game.score}</strong></div><div>SERVE BONUS<strong>+${game.lives * 100}</strong></div></div><p>One extra serve. One stranger signal ahead.</p><button class="primary" data-action="continue">NEXT SECTOR <span>↗</span></button>`,
					"TRANSMISSION RECEIVED / SECTOR CLEAR",
				);
		} else if (e.type === "won") {
			audio.effect("win");
			finishRun(true);
		} else if (e.type === "lost") {
			audio.effect("miss");
			finishRun(false);
		}
	}
}
function rumble(strength) {
	const pads = navigator.getGamepads?.() || [];
	for (const p of pads)
		if (p?.vibrationActuator)
			p.vibrationActuator
				.playEffect("dual-rumble", {
					duration: 100,
					strongMagnitude: strength,
					weakMagnitude: 0.2,
				})
				.catch(() => {});
}
function handleClick(actionName) {
	const previousFocus = app.focus;
	audio.effect("menu");
	const actions = {
		start: () => startGame(),
		coop: () => startGame(true),
		begin: () => {
			hideModal();
			game.serve();
		},
		pause: () => (app.modal ? back() : pauseMenu()),
		resume: hideModal,
		settings: showSettings,
		guide: showGuide,
		about: () => showAbout(),
		back,
		dev: showDev,
		title: returnTitle,
		restart: () => startGame(game.coop),
		again: () => startGame(game.coop),
		continue: continueRun,
		online: showOnline,
		host: () => connectRoom(true),
		join: () => connectRoom(false),
		launchRace: () => link.start(),
		rematch: () => link.start(),
		arcade: () => {
			settings.relaxed = false;
			remember();
			updatePace();
		},
		cruise: () => {
			settings.relaxed = true;
			remember();
			updatePace();
		},
		glyphs: () => {
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			remember();
			showSettings();
		},
		pace: () => {
			settings.relaxed = !settings.relaxed;
			remember();
			updatePace();
			showSettings();
		},
		motion: () => {
			settings.reduced = !settings.reduced;
			remember();
			showSettings();
		},
		mute: () => {
			settings.mute = !settings.mute;
			remember();
			showSettings();
		},
		autopilot: () => {
			game.autopilot = !game.autopilot;
			showDev();
		},
		invincible: () => {
			game.invincible = !game.invincible;
			showDev();
		},
		wire: () => {
			app.wire = !app.wire;
			showDev();
		},
		step: () => {
			if (game.status === "serve") game.serve();
			game.tick(1 / 60, {});
			handleEvents();
			updateHUD();
		},
		addball: () => {
			if (game.status === "serve") game.serve();
			game.addBall(0, -5, -3, 8);
		},
		addlife: () => {
			game.lives = Math.min(9, game.lives + 1);
			updateHUD();
		},
		free: () => {
			for (const c of game.captives) game.freeCaptive(c);
		},
		clear: () => {
			game.completeStage();
			hideModal();
			handleEvents();
		},
		skip: () => {
			if (game.stage < 3) {
				game.nextStage();
				view.load(game);
				game.events = [];
				showDev();
			} else {
				game.completeStage();
				hideModal();
				handleEvents();
			}
		},
		resetTune: () => {
			game.config = { ...DEFAULTS };
			for (const b of game.balls) if (b.alive) b.speed = DEFAULTS.ballSpeed;
			showDev();
		},
	};
	actions[actionName]?.();
	updatePrompts();
	if (
		[
			"glyphs",
			"motion",
			"mute",
			"pace",
			"autopilot",
			"invincible",
			"wire",
		].includes(actionName) &&
		["gamepad", "keyboard"].includes(app.lastInput)
	)
		focusAt(previousFocus);
}
document.addEventListener("click", (e) => {
	if (app.hubEnded) return;
	if (e.target.closest("button")) audio.unlock();
	const btn = e.target.closest("[data-action]");
	if (btn) handleClick(btn.dataset.action);
	const credit = e.target.closest("[data-credit]");
	if (credit) showAbout(credit.dataset.credit);
});
document.addEventListener("pointerover", (e) => {
	const el = e.target.closest("button,input");
	if (el && e.pointerType !== "touch") {
		const i = interactive().indexOf(el);
		if (i >= 0) {
			app.focus = i;
			document.querySelectorAll(".focused").forEach((e) => {
				e.classList.remove("focused");
			});
			if (app.lastInput === "gamepad") el.classList.add("focused");
		}
	}
});
document.addEventListener("input", (e) => {
	if (e.target.dataset.setting) {
		settings[e.target.dataset.setting] = Number(e.target.value) / 100;
		e.target.nextElementSibling.textContent = e.target.value + "%";
		remember();
	}
	if (e.target.dataset.tune) {
		const key = e.target.dataset.tune,
			val = Number(e.target.value);
		game.config[key] = val;
		e.target.nextElementSibling.textContent = val;
		if (key === "ballSpeed")
			for (const b of game.balls) if (b.alive) b.speed = val;
	}
});
document.addEventListener(
	"pointerdown",
	(e) => {
		if (app.hubEnded) return;
		if (activity(e.pointerType === "touch" ? "touch" : "mouse")) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		audio.unlock();
	},
	true,
);
document.addEventListener("keydown", (e) => {
	if (app.hubEnded) return;
	const code =
		e.code ||
		{
			a: "KeyA",
			d: "KeyD",
			" ": "Space",
			Enter: "Enter",
			Escape: "Escape",
			ArrowLeft: "ArrowLeft",
			ArrowRight: "ArrowRight",
			ArrowUp: "ArrowUp",
			ArrowDown: "ArrowDown",
		}[e.key] ||
		e.key;
	if (activity("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	if (e.target.tagName === "INPUT" && e.target.type === "text") {
		if (e.key === "Enter") {
			connectRoom(false);
			e.preventDefault();
		}
		if (e.key === "Escape") back();
		return;
	}
	app.keys.add(code);
	if (
		[
			"Space",
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Enter",
			"Escape",
		].includes(code)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (code === "Escape" || code === "KeyP") {
		if (app.modal) back();
		else pauseMenu();
		return;
	}
	if (app.modal || app.screen === "title") {
		if (code === "ArrowUp" || code === "KeyW") moveFocus(-1);
		else if (code === "ArrowDown" || code === "KeyS") moveFocus(1);
		else if (code === "ArrowLeft" || code === "ArrowRight")
			adjustControl(code === "ArrowLeft" ? -1 : 1);
		else if (code === "Enter" || code === "Space") action();
	} else if (code === "Space" || code === "Enter") action();
});
document.addEventListener("keyup", (e) =>
	app.keys.delete(e.code || { a: "KeyA", d: "KeyD" }[e.key] || e.key),
);
window.addEventListener("blur", () => app.keys.clear());
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		app.keys.clear();
		if (app.screen === "play" && !app.modal && !AIHub.active && !link.started)
			pauseMenu();
	}
	if (!app.hubEnded) audio.setSilent(document.hidden);
});
document.addEventListener(
	"pointermove",
	(e) => {
		if (
			!app.hubEnded &&
			(app.screen === "title" || app.screen === "attract") &&
			e.pointerType !== "touch" &&
			(e.movementX || e.movementY)
		)
			activity("mouse");
	},
	true,
);
document.addEventListener(
	"wheel",
	() => {
		if (!app.hubEnded) activity("mouse");
	},
	{ passive: true },
);
$("closeModal").onclick = back;
$("soundButton").onclick = () => {
	settings.mute = !settings.mute;
	remember();
	$("soundButton").textContent = settings.mute ? "♪̸" : "♫";
};
$("fullscreenButton").onclick = () => {
	if (document.fullscreenElement) document.exitFullscreen()?.catch(() => {});
	else
		document.documentElement
			.requestFullscreen()
			?.catch(() => toast("Fullscreen is not available in this browser."));
};
$("viewport").addEventListener("pointermove", (e) => {
	if (app.hubEnded || app.modal) return;
	if (e.pointerType === "touch") {
		app.touchX = view.pointerX(e.clientX);
		return;
	}
	if (e.movementX || e.movementY) {
		activity("mouse");
		app.pointer = view.pointerX(e.clientX);
	}
});
$("viewport").addEventListener("pointerdown", (e) => {
	if (app.modal || app.screen !== "play" || app.hubEnded) return;
	if (e.pointerType === "touch") {
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		app.touchX = view.pointerX(e.clientX);
		game.relaxed = true;
	} else app.pointer = view.pointerX(e.clientX);
	action();
});
$("viewport").addEventListener("pointerup", (e) => {
	if (e.pointerType === "touch") app.touchX = null;
});
$("viewport").addEventListener("pointercancel", () => (app.touchX = null));
$("touchPop").addEventListener("pointerdown", (e) => {
	e.stopPropagation();
	game.armPop();
});
function pollPads(now) {
	const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
	const axes = [0, 0];
	let pop = false;
	for (let i = 0; i < Math.min(2, pads.length); i++) {
		const p = pads[i],
			prev = app.lastPad[i] || [],
			buttons = p.buttons.map((b) => b.pressed),
			edge = (n) => buttons[n] && !prev[n];
		const x = Math.abs(p.axes[0] || 0) > 0.16 ? p.axes[0] : 0;
		axes[i] = x + (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0);
		const isActive =
			Math.abs(x) > 0.16 || buttons.some((b, n) => b && !prev[n]);
		if (isActive) {
			if (activity("gamepad")) {
				app.lastPad[i] = buttons;
				continue;
			}
			audio.unlock();
		}
		if (!app.hubEnded) {
			if (edge(9) && !buttons[8]) {
				if (app.modal) back();
				else pauseMenu();
			} else if (edge(1) && app.modal) back();
			else if (app.modal || app.screen === "title") {
				if (edge(0)) action();
				const dir =
					buttons[12] || p.axes[1] < -0.55
						? -1
						: buttons[13] || p.axes[1] > 0.55
							? 1
							: 0;
				if (dir && (now > app.padRepeat || edge(12) || edge(13))) {
					moveFocus(dir);
					app.padRepeat = now + 190;
				}
				if (edge(14) || edge(15)) adjustControl(edge(14) ? -1 : 1);
			} else if (edge(0)) {
				if (game.status === "serve") action();
				else pop = true;
			}
		}
		app.lastPad[i] = buttons;
	}
	return { axes, pop };
}
function playerInput(pad) {
	const keys = app.keys;
	let one = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
		two = 0;
	if (game.coop)
		two = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
	else
		one += (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
	const axes = [
		clamp(one + pad.axes[0], -1, 1),
		clamp(two + pad.axes[1], -1, 1),
	];
	if (axes[0]) app.pointer = null;
	let targets = [app.touchX ?? app.pointer, undefined];
	if (app.lastInput === "gamepad") targets = [undefined, undefined];
	if (app.lastInput === "touch") {
		if (app.touchX == null) {
			const assist = game.autopilotInput();
			targets[0] = lerp(game.paddles[0].x, assist.targets[0], 0.11);
		}
		if (
			game.balls.some(
				(b) =>
					b.alive && b.body.translation().y < -8.9 && b.body.linvel().y < 0,
			)
		)
			pad.pop = true;
	}
	return { axes, targets, pop: pad.pop };
}
function drawDebug() {
	if (app.debugLines) {
		view.scene.remove(app.debugLines);
		app.debugLines.geometry.dispose();
		app.debugLines.material.dispose();
		app.debugLines = null;
	}
	if (!app.wire) return;
	const { vertices } = game.world.debugRender();
	const pts = [];
	for (let i = 0; i < vertices.length; i += 2)
		pts.push(vertices[i], vertices[i + 1], 1);
	const geom = new THREE.BufferGeometry();
	geom.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
	app.debugLines = new THREE.LineSegments(
		geom,
		new THREE.LineBasicMaterial({ color: "#ff57bc" }),
	);
	view.scene.add(app.debugLines);
}
function networkTick(now) {
	if (app.hubEnded) return;
	if ((AIHub.active && app.hubStarted) || link.started) {
		if (now - app.netLast > 100) {
			const d = {
				type: "ghost",
				x: game.paddles[0].x,
				stage: game.stage,
				score: game.score,
				done: app.reported,
			};
			if (AIHub.active) AIHub.send(d, { reliable: false });
			else link.send(d);
			app.netLast = now;
		}
		if (AIHub.active && now - app.progressLast > 700) {
			AIHub.progress({
				score: game.score,
				label: `${game.metrics.stages.length}/4 fields · ${game.metrics.hits} bricks`,
			});
			app.progressLast = now;
		}
	}
}
let previous = performance.now(),
	accumulator = 0,
	hudAt = 0;
function frame(now) {
	const dt = Math.min((now - previous) / 1000, 0.06);
	previous = now;
	const pad = pollPads(now);
	if (
		app.screen === "title" &&
		app.modal !== "online" &&
		now - app.lastActivity >= 10000 &&
		!AIHub.active
	) {
		hideModal();
		newGame();
		setScreen("attract");
		game.autopilot = true;
		game.invincible = true;
		app.attractSince = now;
		app.attractStage = now;
		audio.setSilent(true);
		game.serve();
	}
	if (app.screen === "attract" && now - app.attractStage > 18000) {
		if (game.stage === 3) {
			newGame();
			game.autopilot = true;
			game.invincible = true;
			game.serve();
		} else {
			game.nextStage();
			view.load(game);
			game.events = [];
			game.serve();
		}
		app.attractStage = now;
		announce(STAGES[game.stage].name.toUpperCase(), 1.8);
	}
	const hubWaiting = AIHub.active && (!app.hubStarted || AIHub.time() < 0);
	const linkWaiting = link.started && Date.now() < app.onlineStart;
	const canPlay =
		(app.screen === "play" || app.screen === "attract") &&
		!app.hubEnded &&
		!hubWaiting &&
		!linkWaiting &&
		(!app.modal || AIHub.active || link.started) &&
		!["stage-clear", "won", "lost"].includes(game.status);
	if (canPlay) {
		accumulator += dt * game.config.timeScale;
		const input = playerInput(pad);
		while (accumulator >= 1 / 120) {
			game.tick(1 / 120, input);
			accumulator -= 1 / 120;
		}
		handleEvents();
	} else accumulator = 0;
	if (AIHub.active && app.hubStarted && AIHub.time() < 0)
		announce(String(Math.max(1, Math.ceil(-AIHub.time() / 1000))), 0.1);
	if (linkWaiting)
		announce(
			String(Math.max(1, Math.ceil((app.onlineStart - Date.now()) / 1000))),
			0.1,
		);
	if (app.annUntil && now > app.annUntil) {
		$("announcement").classList.remove("show");
		app.annUntil = 0;
	}
	view.sync(game, dt, [...app.ghosts.values()], settings.reduced);
	drawDebug();
	view.render();
	if (now - hudAt > 90) {
		updateHUD();
		hudAt = now;
	}
	networkTick(now);
	audio.tick();
	requestAnimationFrame(frame);
}
async function init() {
	try {
		await RAPIER.init();
		view = new InkView($("viewport"));
		await view.init();
		newGame();
		updatePace();
		updatePrompts();
		if (matchMedia("(pointer:coarse)").matches) setInput("touch");
		if (AIHub.active) {
			setScreen("play");
			$("boardMessage").querySelector("strong").textContent =
				"LINKING FLIGHT SYSTEMS…";
			const info = await AIHub.connect({ mode: "ghost", seats: [1, 4] });
			if (info) {
				AIHub.on("start", () => {
					app.hubStarted = true;
					startGame(false, true);
				});
				AIHub.on("message", receiveRace);
				AIHub.on("leave", ({ id }) => app.ghosts.delete(id));
				AIHub.on("time-up", () => {
					reportResult();
				});
				AIHub.on("end", () => {
					app.hubEnded = true;
					audio.setSilent(true);
					app.keys.clear();
					hideModal();
				});
				AIHub.ready();
			} else setScreen("title");
		}
		$("loading").hidden = true;
		app.lastActivity = performance.now();
		requestAnimationFrame(frame);
		window.Bounceout = {
			get state() {
				return {
					...game.snapshot(),
					screen: app.screen,
					modal: app.modal,
					input: app.lastInput,
					backend: view.backend,
					hubStarted: app.hubStarted,
					hubEnded: app.hubEnded,
					ghosts: [...app.ghosts.values()],
					dev: app.dev,
					settings: { ...settings },
				};
			},
			get audio() {
				return audio;
			},
		};
		if (new URLSearchParams(location.search).has("test"))
			window.Bounceout.test = {
				get game() {
					return game;
				},
				get view() {
					return view;
				},
				get app() {
					return app;
				},
				get link() {
					return link;
				},
				start: startGame,
				returnTitle,
				handleClick,
				advanceIdle: () => (app.lastActivity = performance.now() - 10001),
				receiveRace,
				Core: BreakoutGame,
				synthTone,
				settings,
				processEvents: handleEvents,
			};
	} catch (e) {
		console.error(e);
		$("loading").classList.add("error");
		$("loadingText").textContent =
			"The universe could not warm up. Check your internet connection and use a current browser with WebGPU or WebGL 2. " +
			e.message;
		if (AIHub.active) AIHub.fail(e.message);
	}
}
init();
