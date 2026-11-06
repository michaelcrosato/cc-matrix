const $ = (s) => document.querySelector(s);
const escapeHTML = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const settings = {
	music: 0.1,
	effects: 0.7,
	glyphs: "ps",
	touchAssist: true,
	reducedMotion: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("dodge-riot-settings") || "{}"),
	);
} catch {}
const audio = new AudioDirector();
audio.setMusic(settings.music);
audio.setEffects(settings.effects);
let scene,
	sim,
	network,
	screen = "title",
	previousScreen = "title",
	inputType = navigator.maxTouchPoints > 0 ? "touch" : "keyboard",
	idle = 0,
	attract = false,
	devOpen = false,
	autopilot = false,
	ready = false,
	gameEnded = false,
	netCountdown = false,
	netStatus = "",
	notice = "",
	noticeUntil = 0,
	lastTime = 0,
	accumulator = 0,
	lastHud = "",
	lastToast = "",
	count = 1,
	highScore = 0,
	gamepadTime = 0;
let keys = new Set(),
	pending = [0, 0],
	padStates = new Map(),
	remoteInputs = new Map(),
	touchBoost = false,
	touchBrake = false,
	touchLane = 0,
	menuFocus = 0,
	heldMenu = "",
	heldMenuTime = 0,
	networkLaneSeq = 0,
	networkLaneValue = 0,
	networkSeats = [],
	lastRemoteSeq = new Map();
try {
	highScore = Number(localStorage.getItem("dodge-riot-best") || 0);
} catch {}
const dom = {
	screens: $("#screens"),
	hud: $("#hud"),
	toast: $("#toast"),
	loading: $("#loading"),
	touchMenu: $("#touch-menu"),
	touchBoost: $("#touch-boost"),
};
const glyph = (kind) =>
	inputType === "touch"
		? {
				confirm: "TAP",
				back: "BACK",
				boost: "ZIP",
				brake: "HOLD",
				pause: "Ⅱ",
				lane: "↕",
			}[kind]
		: inputType === "gamepad"
			? {
					confirm: settings.glyphs === "ps" ? "✕" : "A",
					back: settings.glyphs === "ps" ? "○" : "B",
					boost: settings.glyphs === "ps" ? "R2" : "RT",
					brake: settings.glyphs === "ps" ? "L2" : "LT",
					pause: "☰",
					lane: "◀ ▶",
				}[kind]
			: {
					confirm: "ENTER",
					back: "ESC",
					boost: "SPACE",
					brake: "↓",
					pause: "ESC",
					lane: "← →",
				}[kind];
function saveSettings() {
	try {
		localStorage.setItem("dodge-riot-settings", JSON.stringify(settings));
	} catch {}
}
function button(label, action, primary = false, tail = "↗") {
	return `<button class="menu-button${primary ? " primary" : ""}" data-action="${action}"><span>${label}</span><span class="glyph">${tail}</span></button>`;
}
function panel(title, body, wide = false, kicker = "RIOT MOTOR CLUB") {
	return `<div class="overlay"><section class="panel${wide ? " wide" : ""}" aria-label="${title}"><button class="panel-close" data-action="back" aria-label="Back">×</button><span class="eyebrow">${kicker}</span><h2>${title}</h2>${body}</section></div>`;
}
function showNotice(text, seconds = 3) {
	notice = text;
	noticeUntil = performance.now() + seconds * 1000;
	document.querySelector(".toast-small")?.remove();
	const m = document.createElement("div");
	m.className = "toast-small";
	m.textContent = text;
	document.body.append(m);
	setTimeout(() => m.remove(), seconds * 1000);
}
function focusMenu(index = 0) {
	const els = [
		...dom.screens.querySelectorAll("button:not(:disabled),input,textarea"),
	].filter((e) => e.offsetParent !== null);
	if (!els.length) return;
	menuFocus = mod(index, els.length);
	els.forEach((e, i) => e.classList.toggle("focused", i === menuFocus));
	els[menuFocus].focus({ preventScroll: true });
	els[menuFocus].scrollIntoView({ block: "nearest", behavior: "instant" });
}
function setScreen(next) {
	screen = next;
	lastHud = "";
	lastToast = "";
	renderScreen();
}
function renderScreen() {
	dom.hud.hidden = !(screen === "play" || (attract && screen === "title"));
	dom.touchMenu.hidden = !(inputType === "touch" && screen === "play");
	dom.touchBoost.hidden = !(inputType === "touch" && screen === "play");
	if (screen === "title") {
		dom.screens.innerHTML = `<section class="title-screen"><div class="club-kicker eyebrow">RIOT MOTOR CLUB · EST. 1980-ISH</div><h1>DODGE<span>RIOT</span></h1><p class="tagline">Four lanes.<br>A full tank of trouble.</p><nav class="title-menu">${button("SOLO RUN", "solo", true, glyph("confirm"))}${button("COUCH CO-OP", "coop", false, "1 + 2")}${button("ONLINE CO-OP", "online", false, "↔")}</nav><div class="small-buttons"><button data-action="guide">DRIVE 101</button><button data-action="settings">SETTINGS</button><button data-action="about">CREDITS</button></div><p class="attract-note">${highScore ? "CLUB RECORD " + highScore.toLocaleString() : "NO REVERSE. NO REGRETS."} &nbsp; / &nbsp; INSERT YOUR NERVE.</p><div class="title-edition">THREE ROUNDS · ONE CLEAN GETAWAY</div><div class="title-stamp"><strong>↗ ↗</strong><span>COLLECT THE LOT.<br>DODGE THE REST.</span></div></section>${attract ? '<div class="demo-banner">AUTO PILOT · PRESS ANYTHING TO TAKE THE WHEEL</div>' : ""}`;
	} else if (screen === "play") {
		dom.screens.innerHTML = network.active
			? `<div class="network-indicator">${network.hubActive ? "AI HUB" : "DIRECT CO-OP"} · ${network.server ? "SIMULATION HOST" : `DRIVER ${network.me + 1}`}</div>`
			: "";
	} else if (screen === "paused") {
		dom.screens.innerHTML = panel(
			"PIT STOP",
			`<p>${network.active ? "Your co-driver keeps rolling while you’re in the pit." : "The road can wait a minute."}</p>${button("BACK TO THE RIOT", "resume", true, glyph("confirm"))}${button("SETTINGS", "settings")}${button("DEV GARAGE", "dev")}${button("ABOUT & CREDITS", "about")}${network.hubActive ? "" : button("PARK IT / TITLE", "title", false, glyph("back"))}`,
		);
	} else if (screen === "guide") {
		dom.screens.innerHTML = panel(
			"DRIVE 101",
			`<div class="rule-card"><div class="rule-icon">•</div><div><strong>MAKE A CLEAN SWEEP</strong><span>Collect all 96 golden fares to clear a round. Complete three rounds to join the club. Your car drives clockwise; rivals come the other way.</span></div></div><div class="rule-card"><div class="rule-icon">⇄</div><div><strong>CHANGE AT THE CROSSINGS</strong><span>${inputType === "gamepad" ? "Tap D-pad or left stick." : inputType === "touch" ? "Drag your left thumb up or down." : "Tap ← / A inward. → / D outward."} Pick a lane near any yellow crossing. An early turn waits for the next crossing.</span></div></div><div class="rule-card"><div class="rule-icon">ϟ</div><div><strong>ZIP. SLIP. RECHARGE.</strong><span>Hold ${glyph("boost")} for a burst of speed and a brief half-second collision shield when it starts. Release to recharge. ${inputType === "gamepad" ? "L2 / LT" : inputType === "touch" ? "Hold the left side" : "↓ / S"} brakes. Mint diamonds protect you for five seconds.</span></div></div><div class="rule-card"><div class="rule-icon">♥</div><div><strong>BRING A PAL</strong><span>Co-op shares four bumpers and one score. P1: arrows + Space. P2: A / D + W to zip, S to brake. Two pads work too. Touch adds steering assistance.</span></div></div>${button("GOT IT. LET’S ROLL.", "back", true)}`,
			false,
			"READ THE ROAD",
		);
	} else if (screen === "settings") {
		dom.screens.innerHTML = panel(
			"TUNE UP",
			`<div class="settings-row"><label for="music">MUSIC <output>${Math.round(settings.music * 100)}%</output></label><input id="music" data-setting="music" type="range" min="0" max="1" step="0.01" value="${settings.music}"></div><div class="settings-row"><label for="effects">SOUND & VOICES <output>${Math.round(settings.effects * 100)}%</output></label><input id="effects" data-setting="effects" type="range" min="0" max="1" step="0.01" value="${settings.effects}"></div><div class="settings-row"><button class="toggle-button" data-action="glyphs">CONTROLLER GLYPHS <span style="float:right">${settings.glyphs === "ps" ? "PLAYSTATION  ✕ ○" : "XBOX  A B"}</span></button></div><div class="settings-row"><button class="toggle-button" data-action="assist">TOUCH STEERING ASSIST <span style="float:right">${settings.touchAssist ? "ON" : "OFF"}</span></button></div><div class="settings-row"><button class="toggle-button" data-action="motion">REDUCED SCREEN SHAKE <span style="float:right">${settings.reducedMotion ? "ON" : "OFF"}</span></button></div><p class="help">Music starts at 10%. Audio wakes up on your first button press. Controls follow the input you use.</p>${button("BACK ON THE ROAD", "back", true, glyph("back"))}`,
		);
	} else if (screen === "dev") {
		const slider = (key, label, min, max, step = 1) =>
			`<div class="settings-row"><label for="dev-${key}">${label}<output>${sim.config[key]}</output></label><input id="dev-${key}" data-config="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${sim.config[key]}"></div>`;
		dom.screens.innerHTML = panel(
			"DEV GARAGE",
			`<p class="help">Live tuning. Changes apply immediately. Practice tools keep this run out of the club record.</p><div class="dev-grid">${slider("speed", "DRIVER SPEED", 6, 25, 0.2)}${slider("trafficSpeed", "TRAFFIC SPEED", 4, 24, 0.2)}${slider("boostPower", "ZIP MULTIPLIER", 1.2, 3, 0.05)}${slider("recharge", "BATTERY RECHARGE", 0, 35, 0.5)}${slider("gateWindow", "CROSSING FORGIVENESS", 0.5, 5, 0.1)}${slider("lives", "STARTING BUMPERS", 1, 9, 1)}</div><div class="button-row"><button class="toggle-button" data-action="invincible">INVINCIBLE: ${sim.config.invincible ? "ON" : "OFF"}</button><button class="toggle-button" data-action="autopilot">AUTO DRIVE: ${autopilot ? "ON" : "OFF"}</button></div><div class="button-row">${button("REFILL", "refill")}${button("CLEAR ROUND", "collectAll")}${button("NEXT ROUND", "nextRound")}</div><div class="button-row">${button("RESET DEFAULTS", "resetConfig")}${button("BACK TO PIT", "back", true)}</div>`,
			true,
			"PRACTICE / LIVE BALANCE",
		);
	} else if (screen === "about") {
		const info = METADATA.sourceInformation;
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
		let body = `<p class="help">RIGHT STICK / MOUSE WHEEL TO SCROLL</p><p>A little car with a very big evening. Original game design, procedural models, music and voices made for this demo. Inspired by the lane-chasing spirit of Dodge Em (1980).</p><div class="feedback-title">Source Information</div><dl class="credits-grid">${Object.entries(
			info,
		)
			.map(([k, v]) => `<dt>${labels[k] || k}</dt><dd>${escapeHTML(v)}</dd>`)
			.join("")}</dl>`;
		for (const [key, label] of [
			["testingFeedback", "Testing Feedback"],
			["engineFeedback", "Engine Feedback"],
			["promptFeedback", "Prompt Feedback"],
		])
			body += `<div class="feedback-title">${label}</div><ol class="feedback-list">${METADATA[key].map((v) => `<li>${escapeHTML(v)}</li>`).join("")}</ol>`;
		body += `<p class="help">Three.js © its contributors, MIT. Rapier © Dimforge, Apache-2.0. AI Hub session client by michaelcrosato. All visuals and sound are generated in code. No external art or sound assets.</p>${button("BACK", "back", true)}`;
		dom.screens.innerHTML = panel(
			"CLUB CREDITS",
			body,
			true,
			"SOURCE / MAKING OF",
		);
	} else if (screen === "lobby") {
		dom.screens.innerHTML = panel(
			"LONG-DISTANCE<br>DOUBLE TROUBLE",
			`<p>Two drivers. One circuit. Share a connection code with a friend. For automatic rooms, launch from AI Hub.</p><div class="status-bar" id="network-status">${escapeHTML(netStatus || "Choose a seat. No account needed.")}</div><div class="button-row">${button("HOST A RUN", "host", true)}${button("JOIN A RUN", "join")}</div><div id="lobby-codes"></div><p class="help">Direct co-op uses an encrypted WebRTC connection. Swap invite and reply codes using your preferred messenger. Network firewalls may require an AI Hub room.</p>${button("BACK", "back", false, glyph("back"))}`,
			false,
			"ONLINE CO-OP / TWO DRIVERS",
		);
	} else if (screen === "results") {
		const won = sim.phase === "won";
		dom.screens.innerHTML = panel(
			won ? "NICE DRIVING,<br>TROUBLEMAKER." : "END OF<br>THE ROAD.",
			`<p>${gameEnded && network.active ? "The shared run has ended." : won ? "Three clean circuits. The club is impressed. Don’t let it go to your head." : "The bumpers have left the chat. Get back out there."}</p><span class="eyebrow">${won ? "CLUB-APPROVED SCORE" : "FINAL FARE"}</span><div class="results-score">${sim.score.toLocaleString()}</div><div class="results-stats"><div><strong>${sim.stats.dots}</strong><small>FARES</small></div><div><strong>${sim.stats.closeCalls}</strong><small>CLOSE CALLS</small></div><div><strong>${sim.stats.boosts}</strong><small>ZIPS</small></div></div>${network.hubActive ? '<p class="help">Your score has been returned to AI Hub. The host can start the next session.</p>' : button("ONE MORE RUN", "restart", true, glyph("confirm"))}${network.hubActive ? "" : button("BACK TO THE CLUB", "title", false, glyph("back"))}`,
		);
	} else if (screen === "hubwait")
		dom.screens.innerHTML = `<div class="hub-wait"><div><span class="eyebrow">AI HUB · DODGE RIOT</span><h2>ENGINES READY.</h2><p>Waiting for the rest of the motor club.</p></div></div>`;
	if (screen !== "play") focusMenu(0);
	updateHud();
	updateToast();
}
function startGame(players = 1, isAttract = false) {
	attract = isAttract;
	count = players;
	devOpen =
		autopilot ||
		Object.keys(DEFAULTS).some((k) => sim.config[k] !== DEFAULTS[k]);
	gameEnded = false;
	remoteInputs.clear();
	lastRemoteSeq.clear();
	sim.start(players, isAttract);
	sim.players.forEach((p) => (p.ai = isAttract || autopilot));
	setScreen(isAttract ? "title" : "play");
	audio.setMode("play");
	if (!isAttract) audio.sfx("start");
	idle = 0;
	clearInputs();
}
function toTitle() {
	if (network?.hubActive) return;
	if (network.active && !network.hubActive) network.disconnect();
	attract = false;
	gameEnded = false;
	autopilot = false;
	sim.start(1, true);
	sim.phase = "idle";
	sim.attract = true;
	sim.players[0].ai = true;
	setScreen("title");
	audio.setMode("title");
	idle = 0;
	clearInputs();
}
function pause() {
	if (screen !== "play" || attract) return;
	clearInputs();
	setScreen("paused");
	audio.setMode("pause");
}
function resume() {
	setScreen("play");
	clearInputs();
	audio.setMode("play");
}
function back() {
	if (screen === "settings" || screen === "about" || screen === "guide") {
		setScreen(previousScreen);
		return;
	}
	if (screen === "dev") {
		setScreen("paused");
		return;
	}
	if (screen === "lobby") {
		network.disconnect();
		toTitle();
		return;
	}
	if (screen === "paused") resume();
	else if (screen === "results" && !network.hubActive) toTitle();
}
function clearInputs() {
	keys.clear();
	pending = [0, 0];
	touchBoost = false;
	touchBrake = false;
}
async function perform(name, arg) {
	if (!ready || (network.hubActive && gameEnded)) return;
	if (
		network.hubActive &&
		["solo", "coop", "start", "title", "restart", "online", "attract"].includes(
			name,
		)
	)
		return;
	audio.unlock();
	audio.sfx("ui");
	idle = 0;
	switch (name) {
		case "solo":
			startGame(1);
			break;
		case "coop":
			startGame(2);
			break;
		case "start":
			startGame(arg?.players || 1);
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
		case "settings":
		case "about":
		case "guide":
			previousScreen = screen;
			setScreen(name);
			break;
		case "online":
			netStatus = "";
			setScreen("lobby");
			break;
		case "dev":
			devOpen = true;
			setScreen("dev");
			break;
		case "title":
			toTitle();
			break;
		case "restart":
			if (network.active) network.disconnect();
			startGame(count);
			break;
		case "glyphs":
			settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
			saveSettings();
			renderScreen();
			break;
		case "assist":
			settings.touchAssist = !settings.touchAssist;
			saveSettings();
			renderScreen();
			break;
		case "motion":
			settings.reducedMotion = !settings.reducedMotion;
			saveSettings();
			renderScreen();
			break;
		case "setConfig":
			if (arg && arg.key in sim.config) {
				sim.config[arg.key] = arg.value;
				devOpen = true;
			}
			break;
		case "resetConfig":
			Object.assign(sim.config, DEFAULTS);
			autopilot = false;
			sim.players.forEach((p) => (p.ai = attract));
			if (screen === "dev") renderScreen();
			break;
		case "invincible":
			sim.config.invincible = !sim.config.invincible;
			renderScreen();
			break;
		case "autopilot":
			autopilot = typeof arg === "boolean" ? arg : !autopilot;
			sim.players.forEach((p) => (p.ai = autopilot || attract));
			if (screen === "dev") renderScreen();
			break;
		case "refill":
			sim.lives = Math.round(sim.config.lives);
			sim.players.forEach((p) => {
				p.charge = 100;
				p.invuln = 5;
			});
			showNotice("BUMPER TO BUMPER. GOOD AS NEW.");
			break;
		case "collectAll":
			sim.collectAll();
			if (screen === "dev") resume();
			break;
		case "nextRound":
			sim.loadRound((sim.round % 3) + 1);
			sim.players.forEach((p) => (p.ai = autopilot));
			resume();
			break;
		case "warpRound":
			sim.loadRound(Number(arg) || 1);
			sim.players.forEach((p) => (p.ai = autopilot));
			setScreen("play");
			break;
		case "hit":
			sim.hit();
			break;
		case "charge":
			sim.players.forEach((p) => (p.charge = Number(arg) || 100));
			break;
		case "attract":
			startGame(1, true);
			break;
		case "finish":
			sim.phase = "won";
			onEvent("win");
			break;
		case "host":
			await hostRoom();
			break;
		case "join":
			joinRoomUI();
			break;
		case "sendInvite":
			await answerInvite();
			break;
		case "sendReply":
			await acceptReply();
			break;
		case "copy":
			copyCode();
			break;
	}
	updateHud();
	updateToast();
}
function onEvent(name, data = {}) {
	if (!ready && name !== "round") return;
	if (name === "dot") {
		if (!attract)
			audio.sfx(data.mult > 1 && sim.combo % 12 === 0 ? "combo" : "dot");
		const p = trackPoint(data.lane, data.progress);
		scene?.burst(p.x, p.z, data.shield ? "#91dfba" : "#f3cf6a", 3);
	} else if (name === "lane") {
		if (!attract) audio.sfx("lane");
	} else if (name === "boost") {
		if (!attract) audio.sfx("boost");
	} else if (name === "shield") {
		audio.sfx("shield");
		flash("BUMPER BUBBLE!");
	} else if (name === "close") {
		if (!attract) {
			audio.sfx("combo");
			flash("CLOSE CALL +25");
		}
	} else if (name === "hit") {
		audio.sfx("hit");
		if (!settings.reducedMotion) scene.shake = 1;
		const p = carPoint(sim.players[data.player || 0]);
		scene.burst(p.x, p.z, "#f37c43", 24);
		flash("THAT’LL BUFF OUT.");
		rumble(0.8, 350);
	} else if (name === "go") {
		if (!attract) audio.sfx("start");
	} else if (name === "clear") {
		audio.sfx("clear");
		audio.sfx("voice");
		for (let i = 0; i < 14; i++)
			scene.burst(
				(Math.random() - 0.5) * 25,
				(Math.random() - 0.5) * 18,
				i % 2 ? "#f5cc61" : "#91dfba",
				6,
			);
		rumble(0.3, 200);
	} else if (name === "win" || name === "lose") {
		if (attract) {
			sim.countdown = 5;
			return;
		}
		audio.sfx(name === "win" ? "clear" : "over");
		audio.setMode(name === "win" ? "win" : "pause");
		if (!devOpen && sim.score > highScore) {
			highScore = sim.score;
			try {
				localStorage.setItem("dodge-riot-best", highScore);
			} catch {}
		}
		setScreen("results");
		clearInputs();
		if (network.active && network.isHost)
			network.finish({
				score: sim.score,
				won: name === "win",
				stats: sim.stats,
				snapshot: sim.snapshot(),
			});
	}
}
let flashText = "",
	flashUntil = 0;
function flash(text) {
	flashText = text;
	flashUntil = performance.now() + 1100;
}
function rumble(power, duration) {
	for (const pad of navigator.getGamepads?.() || [])
		if (pad?.vibrationActuator)
			pad.vibrationActuator
				.playEffect("dual-rumble", {
					duration,
					strongMagnitude: power,
					weakMagnitude: power * 0.6,
				})
				.catch(() => {});
}
function updateHud() {
	if (!sim.players.length) return;
	const s = sim;
	const dots = s.dots.filter((d) => !d.collected).length;
	let html = `<div class="hud"><div class="hud-top"><div class="hud-block"><span class="eyebrow">CIRCUIT ${String(s.round).padStart(2, "0")} / 03</span><div class="hud-value">${dots} <span style="font-size:.48em;letter-spacing:1px">TO GO</span></div><div class="dots-progress"><i style="width:${((96 - dots) / 96) * 100}%"></i></div><div class="round-name">${ROUND_INFO[s.round - 1].name}</div></div><div class="hud-block hud-score"><span class="eyebrow">${s.combo >= 12 ? `FARE STREAK ×${1 + Math.min(4, Math.floor(s.combo / 12))}` : "CLUB SCORE"}</span><div class="hud-value">${String(s.score).padStart(6, "0")}</div></div><div class="hud-right"><div class="hud-block"><span class="eyebrow">${s.players.length > 1 ? "SHARED BUMPERS" : "BUMPER BUDGET"}</span><div class="hud-value hearts">${"♥".repeat(Math.max(0, Math.min(9, s.lives)))}${"♡".repeat(Math.max(0, Math.min(4, Math.round(s.config.lives)) - s.lives))}</div></div><button class="hud-pause" data-action="pause" aria-label="Pause">Ⅱ</button></div></div><div class="hud-bottom">`;
	const card = (p, i) =>
		`<div class="driver-card ${i ? "p2" : ""}"><div class="driver-head"><span>${i ? "MINT / DRIVER 2" : "TANGERINE / DRIVER 1"}</span><span>${p.invuln > 0.1 ? "◈" : p.boosting ? "ZIP!" : Math.round(p.charge) + "%"}</span></div><div class="charge-track"><div class="charge-fill" style="width:${Math.round(p.charge)}%"></div></div><div class="driver-foot"><span>${p.queued ? (p.queued < 0 ? "← IN" : "OUT →") + " AT CROSSING" : p.invuln > 0 ? "BUMPER BUBBLE" : p.braking ? "TAKING IT EASY" : p.charge < 12 ? "RECHARGING" : "READY TO ZIP"}</span><span>${i ? (inputType === "gamepad" ? glyph("boost") : "W") : glyph("boost")}</span></div></div>`;
	html += card(s.players[0], 0);
	html += `<div class="controls-strip">${inputType === "touch" ? "LEFT THUMB ↕ STEER · ZIP ON THE RIGHT" : inputType === "gamepad" ? '<span class="key">◀</span> IN &nbsp; <span class="key">▶</span> OUT &nbsp; <span class="key">' + glyph("boost") + '</span> ZIP &nbsp; <span class="key">' + glyph("brake") + "</span> BRAKE" : '<span class="key">←</span> IN &nbsp; <span class="key">→</span> OUT &nbsp; <span class="key">SPACE</span> ZIP &nbsp; <span class="key">↓</span> BRAKE'}<br><span style="font-size:.83em;opacity:.8">SWITCH LANES AT THE FOUR YELLOW CROSSINGS</span></div>`;
	if (s.players[1]) html += card(s.players[1], 1);
	else html += '<div style="width:245px" class="hud-spacer"></div>';
	html += "</div></div>";
	if (html !== lastHud) {
		dom.hud.innerHTML = html;
		lastHud = html;
	}
	dom.hud.hidden = !(screen === "play" || (attract && screen === "title"));
}
function updateToast() {
	let html = "";
	if (screen === "play" || attract) {
		if (netCountdown && network.time() < 0) {
			html = `<div class="big-call">${Math.max(1, Math.ceil(-network.time() / 1000))}</div><div class="call-sub">DRIVERS READY</div>`;
		} else if (sim.phase === "countdown") {
			html = `<div class="big-call">${Math.max(1, Math.ceil(sim.countdown))}</div><div class="call-sub">${ROUND_INFO[sim.round - 1].name}</div>`;
		} else if (sim.phase === "clear")
			html = `<div class="big-call">CIRCUIT<br>CLEAN!</div><div class="call-sub">${sim.round < 3 ? "NEXT STOP: " + ROUND_INFO[sim.round].name : "WELCOME TO THE CLUB"}</div>`;
		else if (sim.phase === "running" && sim.roundTime < 1)
			html = '<div class="big-call" style="color:#f49a47">LET’S ZIP!</div>';
		else if (performance.now() < flashUntil)
			html = `<div class="floating-message">${flashText}</div>`;
	}
	if (html !== lastToast) {
		dom.toast.innerHTML = html;
		lastToast = html;
	}
}
function inputActivity(type) {
	if (network?.hubActive && gameEnded) return true;
	if (type) inputType = type;
	document.documentElement.dataset.input = inputType;
	if (ready) {
		dom.touchMenu.hidden = !(inputType === "touch" && screen === "play");
		dom.touchBoost.hidden = !(inputType === "touch" && screen === "play");
	}
	idle = 0;
	if (attract) {
		attract = false;
		toTitle();
		return true;
	}
	return false;
}
function keyboardLane(key) {
	if (count === 2 && !network.active) {
		if (key === "ArrowLeft") pending[0] = -1;
		if (key === "ArrowRight") pending[0] = 1;
		if (key === "a") pending[1] = -1;
		if (key === "d") pending[1] = 1;
	} else {
		if (key === "ArrowLeft" || key === "a") pending[0] = -1;
		if (key === "ArrowRight" || key === "d") pending[0] = 1;
	}
}
window.addEventListener("keydown", (e) => {
	if (e.target.matches("textarea")) return;
	if (
		[
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			" ",
			"Tab",
			"Enter",
		].includes(e.key)
	)
		e.preventDefault();
	if (inputActivity("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
	keys.add(key);
	if (e.repeat) return;
	if (screen === "play") {
		if (key === "Escape" || key === "p") pause();
		else keyboardLane(key);
	} else if (key === "Escape" || key === "p") back();
	else if (["ArrowDown", "s", "Tab"].includes(key)) focusMenu(menuFocus + 1);
	else if (["ArrowUp", "w"].includes(key)) focusMenu(menuFocus - 1);
	else if (key === "Enter" || key === " ") {
		const target = document.activeElement;
		if (target?.matches("button")) target.click();
	} else if (["ArrowLeft", "ArrowRight", "a", "d"].includes(key))
		adjustFocused(key === "ArrowLeft" || key === "a" ? -1 : 1);
});
window.addEventListener("keyup", (e) =>
	keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
);
window.addEventListener("blur", () => {
	clearInputs();
	if (screen === "play" && !network.active) pause();
});
function adjustFocused(direction) {
	const el = document.activeElement;
	if (el?.matches("input[type=range]")) {
		el.value = clamp(
			Number(el.value) + direction * Number(el.step || 1),
			Number(el.min),
			Number(el.max),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (el?.matches(".toggle-button")) el.click();
}
document.addEventListener("click", (e) => {
	const target = e.target.closest("[data-action]");
	if (target) {
		if (
			inputActivity(
				inputType === "touch"
					? "touch"
					: inputType === "gamepad"
						? "gamepad"
						: "keyboard",
			)
		)
			return;
		perform(target.dataset.action);
	}
});
document.addEventListener("pointerover", (e) => {
	if (e.pointerType === "touch") return;
	const target = e.target.closest("button,input,textarea");
	if (target && dom.screens.contains(target)) {
		const els = [
			...dom.screens.querySelectorAll("button:not(:disabled),input,textarea"),
		];
		els.forEach((x) => x.classList.remove("focused"));
		target.classList.add("focused");
		menuFocus = els.indexOf(target);
		target.focus({ preventScroll: true });
	}
});
document.addEventListener("pointermove", (e) => {
	if (e.pointerType === "mouse" && (e.movementX || e.movementY)) {
		inputActivity("keyboard");
	}
});
document.addEventListener("input", (e) => {
	const el = e.target;
	if (el.dataset.setting) {
		const k = el.dataset.setting;
		settings[k] = Number(el.value);
		if (k === "music") audio.setMusic(settings.music);
		else audio.setEffects(settings.effects);
		el.previousElementSibling
			?.querySelector("output")
			?.replaceChildren(
				document.createTextNode(Math.round(settings[k] * 100) + "%"),
			);
		saveSettings();
	}
	if (el.dataset.config) {
		sim.config[el.dataset.config] = Number(el.value);
		devOpen = true;
		el.previousElementSibling
			?.querySelector("output")
			?.replaceChildren(document.createTextNode(el.value));
	}
});
const pointers = new Map();
$("#game-canvas").addEventListener("pointerdown", (e) => {
	const wasAttract = inputActivity(
		e.pointerType === "touch" ? "touch" : "keyboard",
	);
	audio.unlock();
	if (wasAttract || screen !== "play") return;
	e.preventDefault();
	if (e.pointerType === "touch") {
		pointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			lastY: e.clientY,
			left: e.clientX < innerWidth * 0.55,
		});
		e.target.setPointerCapture(e.pointerId);
		if (e.clientX > innerWidth * 0.55) touchBoost = true;
		else touchBrake = true;
	} else {
		const ndc = new THREE.Vector2(
			(e.clientX / innerWidth) * 2 - 1,
			1 - (e.clientY / innerHeight) * 2,
		);
		const ray = new THREE.Raycaster();
		ray.setFromCamera(ndc, scene.camera);
		const at = new THREE.Vector3();
		if (
			ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), at)
		) {
			const p =
				sim.players[
					network.active ? Math.min(network.me, sim.players.length - 1) : 0
				];
			let best = p.lane,
				dist = Infinity;
			for (let l = 0; l < 4; l++) {
				for (let i = 0; i < 100; i++) {
					const q = trackPoint(l, i / 100);
					const d = Math.hypot(q.x - at.x, q.z - at.z);
					if (d < dist) {
						dist = d;
						best = l;
					}
				}
			}
			pending[0] = Math.sign(best - p.lane);
		}
	}
});
$("#game-canvas").addEventListener("pointermove", (e) => {
	const p = pointers.get(e.pointerId);
	if (!p || !p.left) return;
	if (Math.abs(e.clientY - p.lastY) > 24) {
		pending[0] = e.clientY < p.lastY ? -1 : 1;
		p.lastY = e.clientY;
		touchBrake = false;
	}
});
function endPointer(e) {
	pointers.delete(e.pointerId);
	touchBoost = [...pointers.values()].some((p) => !p.left);
	touchBrake = false;
}
window.addEventListener("pointerup", endPointer);
window.addEventListener("pointercancel", endPointer);
dom.touchBoost.addEventListener("pointerdown", (e) => {
	e.preventDefault();
	e.stopPropagation();
	inputActivity("touch");
	touchBoost = true;
	e.target.setPointerCapture(e.pointerId);
});
dom.touchBoost.addEventListener("pointerup", () => (touchBoost = false));
dom.touchBoost.addEventListener("pointercancel", () => (touchBoost = false));
window.addEventListener(
	"touchstart",
	() => {
		inputType = "touch";
		document.documentElement.dataset.input = "touch";
		if (screen === "play") {
			dom.touchMenu.hidden = false;
			dom.touchBoost.hidden = false;
		}
	},
	{ passive: true },
);
function pollPads(dt) {
	const pads = Array.from(navigator.getGamepads?.() || []).filter(
		(p) => p?.connected,
	);
	const out = [{}, {}];
	pads.slice(0, 2).forEach((p, index) => {
		const old = padStates.get(p.index) || {};
		const down = (i) => p.buttons[i]?.pressed;
		const axis = Math.abs(p.axes[0] || 0) > 0.45 ? (p.axes[0] > 0 ? 1 : -1) : 0;
		const vertical =
			Math.abs(p.axes[1] || 0) > 0.55 ? (p.axes[1] > 0 ? 1 : -1) : 0;
		const lane = down(14) ? -1 : down(15) ? 1 : axis;
		const nav = down(12) ? -1 : down(13) ? 1 : vertical;
		const scrollAxis = p.axes[3] || 0;
		const any =
			p.buttons.some((b) => b.pressed) ||
			axis ||
			vertical ||
			Math.abs(scrollAxis) > 0.3;
		if (any) {
			const switched = inputType !== "gamepad";
			if (inputActivity("gamepad")) {
				padStates.set(p.index, {
					lane,
					nav,
					confirm: down(0),
					back: down(1),
					pause: down(9),
				});
				return;
			}
			if (switched && screen !== "play") renderScreen();
			audio.unlock();
		}
		if (screen === "play") {
			if (down(9) && !old.pause && !down(8)) pause();
			out[index] = {
				boost: !!(down(7) || down(0)),
				brake: !!(down(6) || down(2)),
				lane: lane && lane !== old.lane ? lane : 0,
			};
		} else if (index === 0) {
			if (Math.abs(scrollAxis) > 0.2) {
				const panel = dom.screens.querySelector(".panel");
				if (panel) panel.scrollTop += scrollAxis * dt * 650;
			}
			if (down(0) && !old.confirm) document.activeElement?.click();
			if ((down(1) && !old.back) || (down(9) && !old.pause && !down(8))) back();
			if (nav && (nav !== old.nav || gamepadTime - old.repeat > 0.2)) {
				focusMenu(menuFocus + nav);
				old.repeat = gamepadTime;
			}
			if (lane && lane !== old.lane) adjustFocused(lane);
		}
		padStates.set(p.index, {
			...old,
			lane,
			nav,
			confirm: down(0),
			back: down(1),
			pause: down(9),
		});
	});
	gamepadTime += dt;
	return out;
}
function readInputs(pads) {
	const p1 = {
		lane: pending[0] || pads[0].lane || 0,
		boost: !!(
			keys.has(" ") ||
			keys.has("ArrowUp") ||
			(keys.has("w") && (count === 1 || network.active)) ||
			touchBoost ||
			pads[0].boost
		),
		brake: !!(
			keys.has("ArrowDown") ||
			(keys.has("s") && (count === 1 || network.active)) ||
			touchBrake ||
			pads[0].brake
		),
		assist: inputType === "touch" && settings.touchAssist,
	};
	const p2 = {
		lane: pending[1] || pads[1].lane || 0,
		boost: !!(keys.has("w") || pads[1].boost),
		brake: !!(keys.has("s") || pads[1].brake),
	};
	return [p1, p2];
}
function tick(dt, inputs) {
	if (screen === "title") {
		idle += dt;
		if (!attract && idle >= 10) {
			startGame(1, true);
		}
		if (attract && (sim.phase === "won" || sim.phase === "lost")) {
			sim.countdown -= dt;
			if (sim.countdown <= 0) startGame(1, true);
		}
	}
	const playing =
		screen === "play" || attract || (network.active && network.started);
	if (playing && !gameEnded) {
		if (network.active) {
			if (netCountdown) {
				if (network.time() < 0) return;
				netCountdown = false;
				sim.phase = "running";
				sim.countdown = 0;
			}
			const local = screen === "play" ? inputs[0] : {};
			if (network.isHost) {
				const inputsByPlayer = networkSeats.map((id, i) => {
					if (!network.players.some((p) => p.id === id) && sim.players[i])
						sim.players[i].ai = true;
					if (!network.server && id === network.me) return local;
					const remote = remoteInputs.get(id);
					if (!remote) return {};
					if (performance.now() - remote.received > 600) return {};
					const clean = { ...remote.value };
					const last = lastRemoteSeq.get(id);
					if (clean.laneSeq === last) clean.lane = 0;
					else lastRemoteSeq.set(id, clean.laneSeq);
					return clean;
				});
				if (screen !== "play" && !network.server) {
					const idx = networkSeats.indexOf(network.me);
					if (idx >= 0) inputsByPlayer[idx] = {};
				}
				sim.tick(dt, inputsByPlayer);
				network.sendSnapshot(sim.snapshot());
			} else {
				network.sendInput({
					...local,
					lane: networkLaneValue,
					laneSeq: networkLaneSeq,
				});
			}
		} else {
			sim.tick(dt, inputs);
		}
	}
}
function advance(seconds) {
	const max = Math.min(650, Math.max(0, seconds));
	const input = readInputs([{}, {}]);
	for (let t = 0; t < max; t += 1 / 60)
		tick(
			Math.min(1 / 60, max - t),
			t === 0 ? input : input.map((p) => ({ ...p, lane: 0 })),
		);
	pending = [0, 0];
	scene.update(0, sim, screen);
	updateHud();
	updateToast();
	return snapshot();
}
function frame(now) {
	const dt = Math.min(0.06, (now - lastTime) / 1000 || 0.016);
	lastTime = now;
	const pads = pollPads(dt);
	const inputs = readInputs(pads);
	if (inputs[0].lane) {
		networkLaneSeq++;
		networkLaneValue = inputs[0].lane;
	}
	accumulator += dt;
	let first = true;
	while (accumulator >= 1 / 60) {
		tick(1 / 60, first ? inputs : inputs.map((p) => ({ ...p, lane: 0 })));
		first = false;
		accumulator -= 1 / 60;
	}
	if (!first) pending = [0, 0];
	if (ready) {
		audio.tick(dt, sim.players.some((p) => p.boosting) ? 1.5 : 1);
		scene.update(dt, sim, screen);
		scene.render();
		if (Math.floor(now / 75) !== Math.floor((now - dt * 1000) / 75))
			updateHud();
		updateToast();
	}
	requestAnimationFrame(frame);
}
async function hostRoom() {
	try {
		netStatus = "Making an invite…";
		$("#network-status").textContent = netStatus;
		const code = await network.createOffer();
		if (screen !== "lobby") return;
		$("#lobby-codes").innerHTML =
			`<p class="help">1. Send this invite to your friend.</p><textarea id="connection-code" class="code-box" readonly aria-label="Invite code">${code}</textarea>${button("COPY INVITE", "copy")}<p class="help">2. Paste their reply here.</p><textarea id="connection-reply" class="code-box" aria-label="Reply code" placeholder="Paste reply code"></textarea>${button("CONNECT & DRIVE", "sendReply", true)}`;
		$("#network-status").textContent =
			"Invite ready. Waiting for your friend’s reply.";
		focusMenu(2);
	} catch (e) {
		const status = $("#network-status");
		if (status) status.textContent = e.message;
	}
}
function joinRoomUI() {
	$("#lobby-codes").innerHTML =
		`<p class="help">1. Paste the host’s invite.</p><textarea id="connection-reply" class="code-box" aria-label="Invite code" placeholder="Paste invite code"></textarea>${button("MAKE MY REPLY", "sendInvite", true)}`;
	$("#network-status").textContent = "Ask the host for an invite code.";
	$("#connection-reply").focus();
}
async function answerInvite() {
	try {
		const code = await network.joinOffer($("#connection-reply").value);
		if (screen !== "lobby") return;
		$("#lobby-codes").innerHTML =
			`<p class="help">2. Send this reply to the host. The run starts when they connect.</p><textarea id="connection-code" class="code-box" readonly aria-label="Reply code">${code}</textarea>${button("COPY REPLY", "copy", true)}`;
		$("#network-status").textContent = "Reply ready. Keep this page open.";
	} catch (e) {
		const status = $("#network-status");
		if (status) status.textContent = e.message;
	}
}
async function acceptReply() {
	try {
		await network.acceptAnswer($("#connection-reply").value);
		if ($("#network-status"))
			$("#network-status").textContent = "Connecting engines…";
	} catch (e) {
		const status = $("#network-status");
		if (status) status.textContent = e.message;
	}
}
async function copyCode() {
	const field = $("#connection-code");
	try {
		await navigator.clipboard.writeText(field.value);
		showNotice("CODE COPIED. PASS IT ON.");
	} catch {
		field.select();
		document.execCommand("copy");
		showNotice("CODE SELECTED. COPY AND PASS IT ON.");
	}
}
function networkStart(info) {
	networkSeats = info.players.map((p) => p.id);
	count = info.players.length || 2;
	startGame(count);
	netCountdown = true;
	sim.phase = "countdown";
	sim.countdown = 3;
	audio.unlock();
	setScreen("play");
}
function networkEnd(reason, outcome) {
	if (outcome?.snapshot) sim.apply(outcome.snapshot);
	else if (outcome) {
		if (typeof outcome.won === "boolean")
			sim.phase = outcome.won ? "won" : "lost";
		if (Number.isFinite(outcome.score)) sim.score = outcome.score;
		else if (outcome.scores) {
			const value = Object.values(outcome.scores)[0];
			if (Number.isFinite(value)) sim.score = value;
		}
	}
	gameEnded = true;
	clearInputs();
	audio.setMode("pause");
	audio.ctx?.suspend().catch(() => {});
	if (reason === "host-left" || reason === "peer-disconnected")
		showNotice("YOUR CO-DRIVER LEFT THE CIRCUIT.");
	if (screen !== "results") setScreen("results");
}
function snapshot() {
	return {
		...sim.snapshot(),
		screen,
		paused: ["paused", "dev", "settings", "about", "guide"].includes(screen),
		attract,
		renderer: scene.backend,
		graphicsRecovery: scene.gpuLoss || null,
		drawCalls: scene.lastDrawCalls || 0,
		framesRendered: scene.framesRendered || 0,
		rapier: !!sim.world,
		config: { ...sim.config },
		inputType,
		audio: audio.stats,
		network: {
			mode: network.mode,
			connected: network.connected,
			started: network.started,
			isHost: network.isHost,
			server: network.server,
			stats: { ...network.stats },
		},
		music: settings.music,
		settings: { ...settings },
	};
}
async function boot() {
	try {
		$("#loading-status").textContent = "Starting Rapier 0.19.3…";
		await RAPIER.init();
		sim = new RiotSimulation(RAPIER, onEvent);
		scene = new RiotScene($("#game-canvas"));
		$("#loading-status").textContent = "Inking the WebGPU circuit…";
		await scene.init();
		network = new HubLink({
			onStatus: (s) => {
				netStatus = s;
				const el = $("#network-status");
				if (el) el.textContent = s;
			},
			onStart: networkStart,
			onInput: (input, id) =>
				remoteInputs.set(id, { value: input, received: performance.now() }),
			onSnapshot: (s) => {
				const oldPhase = sim.phase,
					oldScore = sim.score,
					oldLives = sim.lives;
				sim.apply(s);
				if (s.score > oldScore) audio.sfx("dot");
				if (s.lives < oldLives) {
					audio.sfx("hit");
					if (!settings.reducedMotion) scene.shake = 0.8;
				}
				if (s.phase === "clear" && oldPhase !== "clear") audio.sfx("clear");
				if (
					(s.phase === "won" || s.phase === "lost") &&
					oldPhase !== s.phase &&
					!gameEnded
				) {
					audio.sfx(s.phase === "won" ? "clear" : "over");
				}
			},
			onEnd: networkEnd,
			onLeave: (id) => {
				remoteInputs.delete(id);
				const idx = networkSeats.indexOf(id);
				if (idx >= 0 && sim.players[idx]) sim.players[idx].ai = true;
			},
			onTimeUp: () => {
				if (network.isHost)
					network.finish({
						score: sim.score,
						won: sim.phase === "won",
						stats: sim.stats,
						snapshot: sim.snapshot(),
					});
			},
		});
		const hubInfo = await network.connect();
		sim.start(1, true);
		sim.phase = "idle";
		sim.attract = true;
		sim.players[0].ai = true;
		ready = true;
		document.documentElement.dataset.input = inputType;
		dom.loading.hidden = true;
		audio.setMode("title");
		if (hubInfo) {
			setScreen("hubwait");
			network.ready();
		} else setScreen("title");
		window.__game = {
			snapshot,
			action: perform,
			step: advance,
			config: sim.config,
			input: keys,
			audio,
			network,
			sim,
			scene,
			metadata: METADATA,
		};
		window.addEventListener("resize", () => {
			scene.resize();
			lastHud = "";
			updateHud();
		});
		requestAnimationFrame(frame);
	} catch (e) {
		console.error(e);
		$("#loading").innerHTML =
			`<div class="error-screen"><span class="eyebrow">ENGINE TROUBLE</span><h2>We couldn’t start this engine.</h2><p>${escapeHTML(e.message)}</p><p>Use a current browser with WebGPU or WebGL 2. The pinned Three.js and Rapier libraries need an internet connection on first load.</p><button class="menu-button" onclick="location.reload()">TRY AGAIN ↗</button></div>`;
	}
}
boot();
