const INTERVIEW = null;
let screenMode = "title",
	lastInput = "keyboard",
	lastInteraction = performance.now(),
	menuFocus = 0,
	returnMenu = "title",
	toastTimer = 0;
let localCount = 1,
	paused = false,
	attractStart = 0,
	uiThrottle = 0,
	touchDetected = matchMedia("(pointer:coarse)").matches;
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
function glyph(action) {
	const key = {
		jump: "Space",
		dash: "X",
		bell: "E",
		pause: "Esc",
		move: "A D",
		confirm: "Enter",
		back: "Esc",
	};
	const ps = {
		jump: "×",
		dash: "□",
		bell: "△",
		pause: "☰",
		move: "L",
		confirm: "×",
		back: "○",
	};
	const xbox = {
		jump: "A",
		dash: "X",
		bell: "Y",
		pause: "☰",
		move: "L",
		confirm: "A",
		back: "B",
	};
	const pad = lastInput === "gamepad";
	return `<span data-glyph="${action}" class="glyph ${pad ? "pad" : ""}">${pad ? (preferences.glyphs === "xbox" ? xbox : ps)[action] : key[action]}</span>`;
}
function btn(label, action, extra = "", cls = "") {
	return `<button data-nav data-action="${action}" class="btn ${cls}"><span>${label}</span><small>${extra}</small></button>`;
}
function setScreen(mode, html, wide = false) {
	screenMode = mode;
	const s = $("screen");
	s.className = mode === "title" ? "title" : "";
	s.innerHTML = `<section class="panel ${wide ? "wide" : ""}">${html}</section>`;
	menuFocus = 0;
	setFocus(0, false);
	updateVisibility();
}
function navItems() {
	return [...$("screen").querySelectorAll("[data-nav]")].filter(
		(el) => !el.disabled,
	);
}
function setFocus(i, scroll = true) {
	const list = navItems();
	if (!list.length) return;
	menuFocus = (i + list.length) % list.length;
	list.forEach((el, n) => el.classList.toggle("focused", n === menuFocus));
	const el = list[menuFocus];
	if (scroll && !["title"].includes(screenMode))
		el.scrollIntoView({ block: "nearest" });
}
function moveMenu(d) {
	setFocus(menuFocus + d);
	audio.sfx("menu");
}
function activateMenu() {
	const el = navItems()[menuFocus];
	if (!el) return;
	if (el.id === "room-code") {
		showCodeEntry();
		return;
	}
	if (el.matches("button")) el.click();
	else el.querySelector("button")?.click();
}
function adjustMenu(dir) {
	const el = navItems()[menuFocus],
		r = el?.querySelector("input[type=range]");
	if (r) {
		r.value = clamp(
			Number(r.value) + Number(r.step) * dir,
			Number(r.min),
			Number(r.max),
		);
		r.dispatchEvent(new Event("input", { bubbles: true }));
		audio.sfx("menu");
	} else el?.querySelector("button")?.click();
}
function hideScreen() {
	screenMode = "playing";
	$("screen").classList.add("hidden");
	$("screen").innerHTML = "";
	updateVisibility();
}
function showTitle() {
	if (AIHub.active) return;
	titlePreview();
	toastTimer = 0;
	$("toast").classList.add("hidden");
	$("combo").classList.add("hidden");
	while (floaters.length) floaters.pop().el.remove();
	paused = false;
	balance.autoplay = false;
	game.attract = false;
	screenMode = "title";
	lastInteraction = performance.now();
	let best = 0;
	try {
		best = Number(localStorage.getItem("flipbros-best") || 0);
	} catch {}
	setScreen(
		"title",
		`<div class="eyebrow">An underground arcade caper</div><h1 class="logo">FLIP<span>BROS</span></h1><p class="title-tag">Small crew. Big plumbing problem.<br><small>Clock in. Flip out. Clean up.</small></p><div class="menu">${btn("Clock in", "solo", "1 player →", "primary")}${btn("Couch crew", "couch", "2–4 players")}${btn("Online crew", "online", "Room codes")}${btn("How to play", "how", "The union handbook")}<div class="menu two">${btn("Settings", "settings")}${btn("About", "about")}</div></div><div class="brandline"><span class="dot"></span><span>BEST ${String(best).padStart(6, "0")} · ${glyph("confirm")} SELECT</span></div>`,
	);
	$("attract").classList.add("hidden");
}
function startGame(count = 1, attract = false) {
	paused = false;
	localCount = count;
	balance.autoplay = false;
	const names = ["Axle", "Rivet", "Socket", "Pip"];
	game.reset(
		Array.from({ length: count }, (_, id) => ({ id, name: names[id] })),
		attract,
	);
	if (attract) {
		attractStart = performance.now();
	}
	hideScreen();
	$("attract").classList.toggle("hidden", !attract);
	if (!attract) {
		notify("SHIFT 01 · PIPE DREAMS", 2.5);
		audio.voice("hello");
	}
	updateHUD();
}
function showPause() {
	if (game.attract) {
		stopAttract();
		return;
	}
	if (!["playing", "clear"].includes(game.status)) return;
	paused = !isNetworked();
	setScreen(
		"pause",
		`<div class="eyebrow">Take a breather</div><h2>${isNetworked() ? "CREW MENU" : "ON A BREAK"}</h2><p class="fine">${isNetworked() ? "The shared shift keeps running while this menu is open." : "Your tools are right where you left them."}</p><div class="menu">${btn("Back to work", "resume", "→", "primary")}${btn("Settings", "settings")}${btn("How to play", "how")}${isAuthority() ? btn("Developer tools", "dev") : ""}${AIHub.active ? "" : btn(isNetworked() ? "Leave crew" : "End shift", "quit", "", "danger")}</div>`,
	);
}
function showHow() {
	returnMenu = screenMode;
	setScreen(
		"how",
		`<div class="eyebrow">Union handbook · No experience required</div><h2>BUMP. FLIP. KICK.</h2><div class="steps"><div class="step"><div class="number">01 / THE BUMP</div><strong>Go underneath.</strong><p>Jump into the platform below a pest. A good head bump flips it on its back.</p></div><div class="step"><div class="number">02 / THE KICK</div><strong>Get upstairs.</strong><p>Jump through a gap to reach its platform. Touch a flipped pest to kick it out!</p></div><div class="step"><div class="number">03 / THE PAYDAY</div><strong>Keep it rolling.</strong><p>Kick again within 4 seconds for a combo. Grab coins. Clear all four shifts!</p></div></div><div class="control-grid"><div class="control-card"><b>${glyph("move")} Move & ${glyph("jump")} Jump</b>Left stick / D-pad · A D / arrows<br>Cross · Space / W / ↑<br>Hold for a higher jump.</div><div class="control-card"><b>${glyph("dash")} Dash & ${glyph("bell")} Bell</b>Square · X / Shift: quick, safe burst.<br>Triangle · E: flip pests everywhere.<br>Three bell rings per shift. Bump the block too!</div></div><p class="fine">Hard hats need two bumps. Hoppers bounce. Frost crabs leave ice. Sparks hurt. King Clog takes three flip-and-kicks. Pests that reach a drain return through the top pipes a little quicker. The sides wrap!</p><p class="fine">Couch crew: P1 uses A D, Space, X, E. P2 uses arrows, ↑, /, Enter. Up to four gamepads; press Options on another pad to join. Touch: drag the left half to move; tap the right half to jump; double-tap to dash. The Bell button appears when useful.</p>${btn("Got it", "back-how", "←", "back")}`,
		true,
	);
}
function rangeRow(
	label,
	key,
	min,
	max,
	step,
	value,
	group = "prefs",
	display = null,
) {
	const text = display || String(value);
	return `<div data-nav class="setting-row"><label for="${group}-${key}">${label}</label><input id="${group}-${key}" data-range="${key}" data-group="${group}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"><output>${text}</output></div>`;
}
function showSettings() {
	returnMenu = screenMode;
	settingsScreen();
}
function settingsScreen() {
	setScreen(
		"settings",
		`<div class="eyebrow">Make yourself comfortable</div><h2>SETTINGS</h2>${rangeRow("Music", "music", 0, 1, 0.05, preferences.music, "prefs", Math.round(preferences.music * 100) + "%")}${rangeRow("Sound & voices", "sound", 0, 1, 0.05, preferences.sound, "prefs", Math.round(preferences.sound * 100) + "%")}${rangeRow("Screen shake", "shake", 0, 1, 0.05, preferences.shake, "prefs", Math.round(preferences.shake * 100) + "%")}<div data-nav class="setting-row"><label>Controller glyphs</label><button class="btn" data-action="glyphs">${preferences.glyphs === "ps" ? "PlayStation" : "Xbox"}</button></div><div data-nav class="setting-row"><label>Touch bell assist</label><button class="btn" data-action="assist">${preferences.assist ? "On" : "Off"}</button></div><div class="menu back">${btn("Toggle fullscreen", "fullscreen")}${btn("Back", "back-settings", "←")}</div>`,
	);
}
function showDev() {
	game.usedDev = true;
	setScreen(
		"dev",
		`<div class="eyebrow">Service entrance · Changes apply live</div><h2>DEVELOPER TOOLS</h2><p class="fine">${graphicsBackend} · Three.js r180 · Rapier ${RAPIER.version()} · ${game.players.length} crew · ${game.enemies.length} pests</p>${rangeRow("Run speed", "speed", 4, 13, 0.2, balance.speed, "balance")}${rangeRow("Jump power", "jump", 12, 20, 0.2, balance.jump, "balance")}${rangeRow("Gravity", "gravity", 20, 45, 1, balance.gravity, "balance")}${rangeRow("Enemy pace", "enemyPace", 0.3, 2, 0.1, balance.enemyPace, "balance")}${rangeRow("Flip duration", "stunTime", 2, 15, 0.5, balance.stunTime, "balance")}${rangeRow("Spawn interval", "spawnInterval", 0.5, 6, 0.1, balance.spawnInterval, "balance")}${rangeRow("Time scale", "timeScale", 0.25, 1.5, 0.05, balance.timeScale, "balance")}<div class="dev-grid back">${btn("Invincible: " + (balance.invincible ? "ON" : "OFF"), "invincible")}${btn("Autoplay: " + (balance.autoplay ? "ON" : "OFF"), "autoplay")}${btn("Refill lives & bell", "refill")}${btn("Next shift", "next")}${btn("Clear current pests", "clear")}${btn("Spawn hard hat", "spawn")}${btn("Payday round", "bonus")}${btn("Reset all defaults", "defaults")}</div><p class="settings-note">Autoplay uses a service lift to demonstrate every mechanic. End a shift to start a fresh run.</p>${btn("Back to break", "back-dev", "←", "back")}`,
		true,
	);
}
function showResult(won) {
	paused = true;
	setScreen(
		"result",
		`<div class="eyebrow">${game.usedDev ? "SERVICE MODE · " : ""}${won ? "The city sleeps. You earned it." : "A little leak. A lot of trouble."}</div><h2>${won ? "SHIFT HAPPENS.<br>YOU HANDLED IT." : "OFF THE CLOCK!"}</h2><p>${won ? "King Clog is down the drain. Nice work, crew!" : "The pipes won this one. Grab your cap and give it another go."}</p><div class="result-score">${String(game.score).padStart(6, "0")}</div><div class="stats"><div><span>${game.metrics.kicks}</span><small>PESTS KICKED</small></div><div><span>${game.bestCombo}×</span><small>BEST COMBO</small></div><div><span>${game.metrics.coins}</span><small>COINS</small></div></div><div class="menu">${isNetworked() ? (net.kind === "room" && net.host ? btn("Another shift", "room-restart", "→", "primary") : btn("Crew results", "net-result", "")) : btn("Another shift", "retry", "→", "primary")}${btn("Back to title", "quit", "←")}</div>`,
	);
}
function showAbout() {
	setScreen(
		"about",
		`<div class="eyebrow">Built from a little arcade history</div><h2>THE CREW BOOK</h2><p>Flip Bros is an original tribute to the 1983 single-screen arcade game Mario Bros. Meet Axle, Rivet, Socket, and Pip: the city's least qualified night-shift plumbers.</p><p class="fine">All characters, scenery, animation, music, effects, and voices were created in code for this demo. Thanks to the creators of Three.js, Rapier, PeerJS, and AI Hub.</p><div class="menu">${btn("Source information", "source-info")}${btn("Testing feedback", "testing-info")}${btn("Engine feedback", "engine-info")}${btn("Prompt feedback", "prompt-info")}${btn("Back", "title", "←")}</div>`,
	);
}
function showInfo(section) {
	let body, title;
	if (section === "source") {
		title = "SOURCE INFORMATION";
		body =
			"<dl>" +
			Object.entries(INTERVIEW.sourceInformation)
				.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
				.join("") +
			"</dl>";
	} else {
		const key = section + "Feedback";
		title = section.toUpperCase() + " FEEDBACK";
		body =
			"<ol>" +
			INTERVIEW[key].map((v) => "<li>" + esc(v) + "</li>").join("") +
			"</ol>";
	}
	setScreen(
		"info",
		`<div class="eyebrow">Flip Bros · Credits & field notes</div><h2>${title}</h2><div class="credits">${body}</div>${btn("Back to crew book", "about", "←", "back")}`,
		true,
	);
}
function showOnline() {
	setScreen(
		"online",
		`<div class="eyebrow">Same pipes. Different couches.</div><h2>ONLINE CREW</h2><p class="fine">Host a room, then share its six-letter code. Up to four plumbers share one shift. Direct peer connection; the host runs the world.</p><div class="menu">${btn("Host a room", "host", "Make a code", "primary")}</div><input data-nav id="room-code" class="room-input" autocomplete="off" maxlength="6" aria-label="Six-letter room code" placeholder="ROOM CODE"><div class="menu">${btn("Join a room", "join", "Use a code")}${btn("Back", "title", "←")}</div><p class="fine" id="network-status">Room codes need an internet connection. Nearby tabs also connect directly. AI Hub sessions connect automatically.</p>`,
	);
}
function showLobby() {
	const crew = net.members
		.map((p) => `${p.id + 1}. ${esc(p.name)}`)
		.join("<br>");
	setScreen(
		"lobby",
		`<div class="eyebrow">${net.host ? "Your room is open" : "You’re on the crew"}</div><h2>CREW ASSEMBLE!</h2><div class="roomcode">${esc(net.code)}</div><p class="fine">Share this code. Keep this page open.</p><div class="roster">${crew}</div><p class="fine" id="network-status">${net.notice || "Waiting for the rest of the crew…"}</p><div class="menu">${net.host ? btn("Start the shift", "room-start", net.members.length + " / 4 players", "primary") : ""}${btn("Leave room", "leave-room", "←")}</div>`,
	);
}
function updateVisibility() {
	const play =
		["playing", "pause", "dev", "settings", "how", "result"].includes(
			screenMode,
		) && game.status !== "idle";
	$("hud").classList.toggle("hidden", !play);
	$("bottom").classList.toggle(
		"hidden",
		!play || screenMode !== "playing" || game.attract,
	);
	$("attract").classList.toggle("hidden", !game.attract);
	$("touch-action").classList.toggle(
		"active",
		touchDetected &&
			screenMode === "playing" &&
			game.charges > 0 &&
			game.enemies.length > 0 &&
			!game.attract,
	);
}
function updateHUD() {
	if (!game.world) return;
	$("score").textContent = String(game.score).padStart(6, "0");
	$("lives").textContent =
		"♥".repeat(Math.max(0, Math.min(game.lives, 12))) || "NO LIVES";
	$("shift-label").textContent = game.bonus
		? "BONUS ROUND"
		: `SHIFT ${String(game.phase).padStart(2, "0")} / 04`;
	$("shift-name").textContent = game.bonus
		? "PAYDAY! " + Math.ceil(game.bonusLeft) + "s"
		: SHIFTS[game.phase]?.name || "NIGHT SHIFT";
	const remaining = (game.queue?.length || 0) + game.enemies.length;
	const boss = game.enemies.find((e) => e.type === "boss");
	$("goal").textContent = game.bonus
		? game.coins.length + " coins left"
		: (boss ? "KING CLOG " + boss.hp + " / 3 · " : "") +
			remaining +
			" pests left";
	$("charges").textContent =
		"◆ ".repeat(game.charges) + "◇ ".repeat(Math.max(0, 3 - game.charges));
	$("net-badge").textContent = isNetworked()
		? "· " + game.players.length + "P"
		: "";
	$("combo").textContent = game.combo + "× COMBO!";
	$("combo").classList.toggle(
		"hidden",
		game.combo < 2 || screenMode !== "playing",
	);
	let hint = game.bonus
		? "PAYDAY! Grab the coins. A perfect round earns a life."
		: game.phase === 1
			? "Jump into a platform from below. Then touch a flipped pest to kick it!"
			: game.phase === 2
				? "Hard hats: two bumps. Hoppers: catch them between jumps."
				: game.phase === 3
					? "Ice changes your traction. Dash through danger. Keep an eye on sparks."
					: "King Clog: flip him, jump upstairs, kick. Three hits will blow his lid.";
	if (touchDetected)
		hint =
			"Drag left half to move · Tap right half to jump · Touch flipped pests to kick";
	$("hint").textContent = hint;
	$("controls").innerHTML =
		`<span>${glyph("jump")} Jump</span><span>${glyph("dash")} Dash</span><span>${glyph("bell")} Bell</span>`;
	updateVisibility();
}
function notify(text, time = 2) {
	$("toast").textContent = text;
	$("toast").classList.remove("hidden");
	toastTimer = time;
}
function inputActivity(type = "keyboard") {
	lastInteraction = performance.now();
	if (type !== lastInput) {
		lastInput = type;
		updateHUD();
		for (const el of document.querySelectorAll("[data-glyph]"))
			el.outerHTML = glyph(el.dataset.glyph);
	}
	if (game.attract) {
		stopAttract();
		return true;
	}
	return false;
}
function stopAttract() {
	game.attract = false;
	game.status = "idle";
	showTitle();
	$("attract").classList.add("hidden");
}
function back() {
	if (screenMode === "playing") {
		showPause();
		return;
	}
	if (screenMode === "pause") {
		paused = false;
		hideScreen();
	} else if (screenMode === "dev") showPause();
	else if (screenMode === "settings") {
		if (returnMenu === "pause") {
			paused = true;
			showPause();
		} else showTitle();
	} else if (screenMode === "how") {
		if (returnMenu === "pause") showPause();
		else showTitle();
	} else if (screenMode === "info") showAbout();
	else if (screenMode === "code-entry") showOnline();
	else if (screenMode === "lobby") {
		closeNetwork();
		showOnline();
	} else if (screenMode === "result") {
		closeNetwork();
		showTitle();
	} else showTitle();
}
$("screen").addEventListener("pointerover", (e) => {
	const el = e.target.closest("[data-nav]");
	if (el) {
		inputActivity("keyboard");
		setFocus(navItems().indexOf(el));
	}
});
$("screen").addEventListener("input", (e) => {
	const key = e.target.dataset.range;
	if (!key) return;
	inputActivity("keyboard");
	const value = Number(e.target.value),
		group = e.target.dataset.group;
	(group === "prefs" ? preferences : balance)[key] = value;
	e.target.parentElement.querySelector("output").textContent =
		group === "prefs"
			? Math.round(value * 100) + "%"
			: String(Math.round(value * 100) / 100);
	if (group === "prefs") {
		savePrefs();
		audio.volumes();
	}
});
$("screen").addEventListener("click", async (e) => {
	const a = e.target.closest("[data-action]")?.dataset.action;
	if (!a) return;
	inputActivity(lastInput);
	await audio.unlock();
	audio.sfx("menu");
	switch (a) {
		case "solo":
			closeNetwork();
			startGame(1);
			break;
		case "couch":
			closeNetwork();
			startGame(2);
			break;
		case "title":
			showTitle();
			break;
		case "how":
			showHow();
			break;
		case "back-how":
			if (returnMenu === "pause") showPause();
			else showTitle();
			break;
		case "settings":
			showSettings();
			break;
		case "back-settings":
			if (returnMenu === "pause") {
				paused = true;
				showPause();
			} else showTitle();
			break;
		case "resume":
			paused = false;
			hideScreen();
			break;
		case "quit":
			if (AIHub.active) break;
			closeNetwork();
			game.status = "idle";
			showTitle();
			break;
		case "retry":
			startGame(localCount);
			break;
		case "fullscreen":
			try {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			} catch {}
			break;
		case "glyphs":
			preferences.glyphs = preferences.glyphs === "ps" ? "xbox" : "ps";
			savePrefs();
			e.target.textContent =
				preferences.glyphs === "ps" ? "PlayStation" : "Xbox";
			updateHUD();
			break;
		case "assist":
			preferences.assist = !preferences.assist;
			savePrefs();
			e.target.textContent = preferences.assist ? "On" : "Off";
			break;
		case "dev":
			showDev();
			break;
		case "back-dev":
			showPause();
			break;
		case "invincible":
			balance.invincible = !balance.invincible;
			e.target.closest("button").querySelector("span").textContent =
				"Invincible: " + (balance.invincible ? "ON" : "OFF");
			break;
		case "autoplay":
			balance.autoplay = !balance.autoplay;
			e.target.closest("button").querySelector("span").textContent =
				"Autoplay: " + (balance.autoplay ? "ON" : "OFF");
			break;
		case "refill":
			game.lives = 12;
			game.charges = 3;
			notify("Tools topped up!");
			updateHUD();
			break;
		case "next":
			game.startShift((game.phase % 4) + 1);
			break;
		case "clear":
			for (const en of [...game.enemies]) {
				en.stun = 1;
				game.kick(en, game.players[0]);
			}
			game.queue = [];
			break;
		case "spawn":
			game.spawnEnemy("armored");
			break;
		case "bonus":
			game.bonusRound();
			break;
		case "defaults":
			Object.assign(balance, DEFAULTS);
			showDev();
			break;
		case "about":
			showAbout();
			break;
		case "source-info":
			showInfo("source");
			break;
		case "testing-info":
			showInfo("testing");
			break;
		case "engine-info":
			showInfo("engine");
			break;
		case "prompt-info":
			showInfo("prompt");
			break;
		case "online":
			showOnline();
			break;
		case "host":
			hostRoom();
			break;
		case "join":
			if (lastInput === "gamepad" && !$("room-code")?.value) showCodeEntry();
			else joinRoom($("room-code")?.value || "");
			break;
		case "code-join":
			joinRoom(roomLetters.join(""));
			break;
		case "code-back":
			showOnline();
			break;
		case "leave-room":
			closeNetwork();
			showOnline();
			break;
		case "room-start":
			startRoom();
			break;
		case "room-restart":
			startRoom();
			break;
		case "net-result":
			notify("Ask the host to start another shift.");
			break;
	}
});
$("pause-btn").addEventListener("click", () => {
	inputActivity(touchDetected ? "touch" : "keyboard");
	audio.unlock();
	if (screenMode === "playing") showPause();
	else if (screenMode === "pause") {
		paused = false;
		hideScreen();
	}
});

let roomLetters = ["A", "A", "A", "A", "A", "A"],
	roomCursor = 0;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function updateDials() {
	document.querySelectorAll("[data-dial]").forEach((el) => {
		const i = Number(el.dataset.dial);
		el.querySelector("strong").textContent = roomLetters[i];
		el.classList.toggle("selected", i === roomCursor);
	});
}
function editDial(dir) {
	const n = ROOM_ALPHABET.indexOf(roomLetters[roomCursor]);
	roomLetters[roomCursor] = ROOM_ALPHABET[(n + dir + 24) % 24];
	updateDials();
	audio.sfx("menu");
}
function moveDial(dir) {
	roomCursor = (roomCursor + dir + 6) % 6;
	updateDials();
}
function showCodeEntry() {
	const previous = $("room-code")?.value.toUpperCase();
	roomLetters =
		previous?.length === 6 ? [...previous] : ["A", "A", "A", "A", "A", "A"];
	roomCursor = 0;
	setScreen(
		"code-entry",
		`<div class="eyebrow">Your host has the secret code</div><h2>FIND YOUR CREW</h2><div class="code-dials">${roomLetters.map((c, i) => `<div data-dial="${i}" class="dial-box"><button data-dial-step="1" data-index="${i}" aria-label="Next letter ${i + 1}">▲</button><strong>${c}</strong><button data-dial-step="-1" data-index="${i}" aria-label="Previous letter ${i + 1}">▼</button></div>`).join("")}</div><p class="fine">← → Choose letter · ↑ ↓ Change letter<br>${glyph("confirm")} Join crew · ${glyph("back")} Back<br>You can also type the code.</p><div class="menu">${btn("Join crew", "code-join", "→", "primary")}${btn("Back", "code-back", "←")}</div><p class="fine" id="network-status">Enter the six letters from your host’s screen.</p>`,
	);
	updateDials();
}
$("screen").addEventListener("click", (e) => {
	const arrow = e.target.closest("[data-dial-step]");
	if (arrow) {
		inputActivity(lastInput);
		roomCursor = Number(arrow.dataset.index);
		editDial(Number(arrow.dataset.dialStep));
	}
});
function scrollBook(dir) {
	const panel = $("screen").querySelector(".panel");
	panel.scrollTop += dir * Math.max(70, innerHeight * 0.17);
}
