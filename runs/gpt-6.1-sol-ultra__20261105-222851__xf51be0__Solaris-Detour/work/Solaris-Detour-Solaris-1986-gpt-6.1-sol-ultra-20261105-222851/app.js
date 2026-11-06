const $ = (id) => document.getElementById(id);
const sound = new SoundDeck();
let networkState = {
	mode: "solo",
	isHost: true,
	server: false,
	me: 0,
	players: [{ id: 0 }],
	connected: false,
	ended: false,
};
const networkAudio = [];
for (const method of ["sfx", "voice"]) {
	const play = sound[method].bind(sound);
	sound[method] = (value) => {
		if (
			networkState.connected &&
			networkState.isHost &&
			!networkState.ended &&
			value !== "select"
		) {
			networkAudio.push({ method, value });
			if (networkAudio.length > 32) networkAudio.shift();
		}
		return play(value);
	};
}
let ready = false,
	screen = "titleScreen",
	returnScreen = "titleScreen",
	pausedMode = "flight",
	selectedSector = 0,
	lastInput = "keyboard",
	glyphSet = "ps",
	touchMode = false;
let pulseUntil = 0;
let lastActivity = performance.now(),
	attractDelay = 0,
	lastStateMode = "",
	lastNetworkSend = 0,
	networkSeq = 0,
	lastRemoteSeq = -1,
	localMenu = false,
	hubStarted = false,
	ignoreClickUntil = 0;
const remoteInputs = new Map(),
	keys = new Set(),
	pointer = { x: 0, y: 0, down: false, active: false };
let padState = {
		x: 0,
		y: 0,
		aimX: 0,
		aimY: 0,
		fire: false,
		boost: false,
		pulse: false,
	},
	padButtons = [],
	padNavAt = 0;
const touch = { left: null, right: null, x: 0, y: 0, aimX: 0, aimY: 0 };
const view = new StarView($("space"));
const campaign = new Campaign(sound, (type, data) => {
	if (type === "victory" || type === "gameover")
		net?.finish(campaign.s.score, type === "victory", {
			Rescues: campaign.s.rescued + campaign.s.pioneers,
			Hostiles: campaign.s.kills,
		});
	if (
		type === "enter" ||
		type === "complete" ||
		type === "victory" ||
		type === "gameover"
	)
		lastStateMode = "";
});
const net = new NetworkLink({
	onStatus(status) {
		networkState = status;
		$("networkPill").textContent =
			status.mode === "solo"
				? ""
				: status.mode === "hub"
					? "AI HUB • " +
						(status.server
							? "FLIGHT COORDINATOR"
							: status.isHost
								? "CAPTAIN"
								: "WINGMATE")
					: status.connected
						? "CO-OP LINK • " + (status.isHost ? "CAPTAIN" : "WINGMATE")
						: "FLIGHT CODE " + (status.code || "");
		$("roomCode").textContent = status.code || "— — —";
		$("roomStatus").textContent = status.message;
		$("coopStart").style.display =
			status.isHost && status.connected && status.mode !== "hub"
				? "flex"
				: "none";
	},
	onRole(status) {
		networkState = status;
		lastRemoteSeq = -1;
		remoteInputs.clear();
		if (ready) {
			campaign.s.ally.active = status.players.length > 1;
			lastStateMode = "";
		}
	},
	onPacket(packet, from) {
		if (packet.kind === "input" && networkState.isHost) {
			remoteInputs.set(from, { ...packet.input, received: performance.now() });
		} else if (
			packet.kind === "world" &&
			!networkState.isHost &&
			packet.seq > lastRemoteSeq
		) {
			lastRemoteSeq = packet.seq;
			campaign.s = packet.state;
			if (packet.scene) sound.setScene(packet.scene);
			for (const event of packet.audio || []) {
				if (event.method === "sfx" || event.method === "voice")
					sound[event.method](event.value);
			}
			if (screen === "coopScreen" && packet.state.mode !== "title")
				localMenu = false;
			ready && syncScreen();
		}
	},
	onStart() {
		hubStarted = true;
		localMenu = false;
		if (ready && networkState.isHost) {
			startRun(false, true);
			campaign.travel(0);
		}
		if (ready) showScreen(null);
	},
	onTimeUp() {
		net.finish(campaign.s.score, false, {
			Hostiles: campaign.s.kills,
			Signals: campaign.s.cleared.length,
		});
	},
	onEnd() {
		sound.setMuted(true);
		localMenu = false;
		keys.clear();
		pointer.down = false;
		showScreen(null);
		$("hubWait").style.display = "block";
		$("hubWait").textContent = "PATROL COMPLETE";
	},
	onLeave() {
		remoteInputs.clear();
		if (ready) campaign.s.ally.active = networkState.players.length > 1;
		if (
			ready &&
			networkState.mode === "online" &&
			!networkState.isHost &&
			!networkState.connected
		) {
			returnScreen = "titleScreen";
			localMenu = true;
			showScreen("coopScreen");
		}
	},
	onError(message) {
		$("roomStatus").textContent = message;
	},
});

const prompts = {
	keyboard: {
		confirm: "Enter",
		back: "Esc",
		fire: "Click / Space",
		pulse: "E",
		map: "M",
		boost: "Shift",
		pause: "Esc",
		move: "WASD",
		aim: "Mouse",
	},
	ps: {
		confirm: "✕",
		back: "○",
		fire: "R2",
		pulse: "□",
		map: "△",
		boost: "L2",
		pause: "Options",
		move: "L",
		aim: "R",
	},
	xbox: {
		confirm: "A",
		back: "B",
		fire: "RT",
		pulse: "X",
		map: "Y",
		boost: "LT",
		pause: "Menu",
		move: "L",
		aim: "R",
	},
	touch: {
		confirm: "Tap",
		back: "Back",
		fire: "Auto",
		pulse: "Nova",
		map: "Menu",
		boost: "Auto",
		pause: "Ⅱ",
		move: "Left drag",
		aim: "Right drag",
	},
};
function updatePrompts() {
	const p =
		prompts[
			touchMode ? "touch" : lastInput === "gamepad" ? glyphSet : "keyboard"
		];
	document.querySelectorAll("[data-prompt]").forEach((el) => {
		el.innerHTML = '<span class="glyph">' + p[el.dataset.prompt] + "</span>";
	});
	$("controlsTable").innerHTML = [
		["move", "Fly the fighter"],
		["aim", "Aim photons"],
		["fire", "Hold to fire"],
		["boost", "Afterburners"],
		["pulse", "Nova pulse"],
		["map", "Galactic scanner"],
	]
		.map(
			([key, text]) =>
				'<div><span class="glyph">' + p[key] + "</span>" + text + "</div>",
		)
		.join("");
}
function activity(type = "keyboard") {
	if (networkState.ended) return true;
	const wasAttract = campaign.s.attract;
	lastActivity = performance.now();
	if (type === "gamepad") {
		lastInput = "gamepad";
		touchMode = false;
	} else if (type === "touch") {
		lastInput = "touch";
		touchMode = true;
	} else {
		lastInput = "keyboard";
		if (type === "keyboard" || type === "mouse") touchMode = false;
	}
	updatePrompts();
	if (wasAttract) {
		campaign.start(false);
		campaign.s.mode = "title";
		campaign.s.attract = false;
		campaign.clearField();
		sound.setScene("title");
		showScreen("titleScreen");
		ignoreClickUntil = type === "touch" ? performance.now() + 300 : 0;
		lastStateMode = "title";
		return true;
	}
	return false;
}
function showScreen(id, focus = true) {
	document.querySelectorAll(".screen.active").forEach((el) => {
		el.classList.remove("active");
	});
	screen = id || "";
	if (id) {
		$(id).classList.add("active");
		if (focus) {
			const el = $(id).querySelector("button:not(:disabled),input,select");
			el?.focus({ preventScroll: true });
		}
	}
	document.querySelectorAll(".focused").forEach((el) => {
		el.classList.remove("focused");
	});
	if (document.activeElement?.tagName === "BUTTON")
		document.activeElement.classList.add("focused");
	updateHudVisibility();
}
function updateHudVisibility() {
	const s = campaign.s;
	const inFlight = ["flight", "warp"].includes(s.mode) && !networkState.ended;
	$("hud").classList.toggle("active", inFlight && !screen);
	$("reticle").style.display =
		s.mode === "flight" && !screen ? "block" : "none";
	$("warpUI").style.display = s.mode === "warp" && !screen ? "block" : "none";
	$("touchMenu").style.display =
		touchMode && !screen && inFlight ? "block" : "none";
	$("touchPulse").style.display =
		touchMode &&
		!screen &&
		s.mode === "flight" &&
		s.pulse <= 0 &&
		s.enemies.length
			? "block"
			: "none";
	$("attractBanner").style.display = s.attract ? "block" : "none";
}
function startRun(attract = false, fromHub = false) {
	if (networkState.mode === "hub" && !fromHub) return;
	if (!networkState.isHost) return;
	campaign.start(attract);
	campaign.s.ally.active = networkState.players.length > 1;
	localMenu = false;
	attractDelay = 0;
	selectedSector = 0;
	lastStateMode = "";
	sound.setScene("space");
	if (attract) campaign.travel(0);
	else {
		showScreen("mapScreen");
		refreshMap();
	}
	lastActivity = performance.now();
}
function refreshMap() {
	const s = campaign.s;
	for (const el of document.querySelectorAll(".sectorNode")) {
		const i = +el.dataset.sector;
		el.classList.toggle("complete", s.cleared.includes(i));
		el.classList.toggle("locked", !campaign.unlocked(i));
		el.querySelector("small").textContent = s.cleared.includes(i)
			? "SECURED"
			: !campaign.unlocked(i)
				? "SIGNAL LOCKED"
				: i === 0 && !s.cleared.includes(0)
					? "UNDER ATTACK"
					: "SIGNAL ACTIVE";
	}
	selectSector(selectedSector, false);
	$("signals").innerHTML = [
		["UPLINK", 0],
		["CADETS", 1],
		["ION KEY", 3],
	]
		.map(
			([n, i]) =>
				'<span class="signal ' +
				(s.cleared.includes(i) ? "on" : "") +
				'"><i></i>' +
				n +
				"</span>",
		)
		.join("");
	$("threat").innerHTML = s.cleared.includes(0)
		? "<b>UPLINK SECURE</b>Find the remaining signals."
		: s.redZone
			? "<b>RED ZONE ACTIVE</b>Clear Breakwater to restore flight controls."
			: "<b>UPLINK UNDER ATTACK</b>" +
				Math.ceil(s.threat) +
				" seconds until the Red Zone.";
}
function selectSector(i, focus = true) {
	selectedSector = i;
	const sec = SECTORS[i],
		unlock = campaign.unlocked(i);
	$("briefNumber").textContent = sec.code;
	$("briefName").textContent = sec.name;
	$("briefLabel").textContent = sec.label;
	$("briefText").textContent = sec.description;
	$("briefReward").textContent = unlock
		? "REWARD / " + sec.reward
		: i === 4
			? "REQUIRES / UPLINK + CADETS + ION KEY"
			: "REQUIRES / WORMHOLE CROSSING";
	$("warpButtonLabel").textContent = !networkState.isHost
		? "CAPTAIN CHOOSES THE ROUTE"
		: unlock
			? "ENGAGE HYPERWARP"
			: "SIGNAL NOT YET DECODED";
	document.querySelector("[data-action=warp]").disabled =
		!unlock || !networkState.isHost;
	document.querySelectorAll(".sectorNode").forEach((el) => {
		el.classList.toggle("focused", +el.dataset.sector === i);
	});
	if (focus)
		document
			.querySelector('[data-sector="' + i + '"]')
			.focus({ preventScroll: true });
}
function syncScreen() {
	const s = campaign.s;
	if (networkState.ended) return;
	if (localMenu) return;
	if (s.mode === lastStateMode) {
		if (s.mode === "map") refreshMap();
		return;
	}
	lastStateMode = s.mode;
	if (s.attract) {
		showScreen(null, false);
		return;
	}
	if (s.mode === "title") showScreen("titleScreen");
	else if (s.mode === "map") {
		showScreen("mapScreen");
		refreshMap();
	} else if (["flight", "warp"].includes(s.mode)) showScreen(null, false);
	else if (["debrief", "victory", "gameover"].includes(s.mode)) {
		renderResult();
		showScreen("resultScreen");
	} else if (s.mode === "paused") showScreen("pauseScreen");
}
function renderResult() {
	const s = campaign.s,
		won = s.mode === "victory",
		lost = s.mode === "gameover";
	$("resultEyebrow").textContent = won
		? "Mission accomplished / Solaris found"
		: lost
			? "Patrol terminated / send another cadet"
			: "Mission debrief / " + SECTORS[s.sector].name;
	$("resultTitle").innerHTML = won
		? "EVERYBODY<br><span>HOME.</span>"
		: lost
			? "LOST IN<br><span>SPACE.</span>"
			: "SECTOR<br><span>SECURED.</span>";
	$("resultText").textContent = won
		? "The Sun Eater is out. The pioneers are aboard. The official report says you took a little detour. We say you saved the galaxy."
		: lost
			? "The spaceway sneaks won this round. A fresh fighter, a full tank, and another route await."
			: SECTORS[s.sector].reward +
				" acquired. The lost planet is one detour closer.";
	$("resultScore").textContent = s.score.toLocaleString();
	$("resultKills").textContent = s.kills;
	$("resultFuel").textContent = Math.ceil(s.fuel) + "%";
	$("continueText").textContent =
		won || lost ? "FLY ANOTHER PATROL" : "NEXT DETOUR";
	document.querySelector("[data-action=continue]").disabled =
		(networkState.mode === "hub" && (won || lost)) || !networkState.isHost;
}
function openOverlay(id) {
	returnScreen = screen || "";
	localMenu = true;
	showScreen(id);
	if (id === "devScreen") buildDev();
}
function pause() {
	if (!ready || campaign.s.attract || networkState.ended) return;
	if (screen === "pauseScreen") {
		resume();
		return;
	}
	if (
		[
			"settingsScreen",
			"devScreen",
			"aboutScreen",
			"howScreen",
			"coopScreen",
		].includes(screen)
	) {
		back();
		return;
	}
	if (screen === "titleScreen") return;
	returnScreen = screen;
	pausedMode = campaign.s.mode;
	if (!networkState.connected) campaign.s.mode = "paused";
	localMenu = true;
	showScreen("pauseScreen");
	$("pauseNetworkNote").textContent = networkState.connected
		? "Online flight continues while this menu is open."
		: "Flight is paused. Your fuel and uplink timer are safe.";
	document.querySelector("[data-action=quit]").disabled =
		networkState.mode === "hub";
}
function resume() {
	localMenu = false;
	if (campaign.s.mode === "paused") campaign.s.mode = pausedMode;
	lastStateMode = "";
	syncScreen();
}
function openScanner() {
	if (!networkState.isHost && networkState.connected) {
		if (screen === "mapScreen" && localMenu) {
			resume();
			return;
		}
		localMenu = true;
		showScreen("mapScreen");
		refreshMap();
		return;
	}
	localMenu = false;
	if (campaign.s.mode === "paused") campaign.s.mode = pausedMode;
	campaign.toMap();
	lastStateMode = "";
	syncScreen();
}
function back() {
	if (screen === "mapScreen" && localMenu && !networkState.isHost) {
		resume();
		return;
	}
	if (
		[
			"settingsScreen",
			"devScreen",
			"aboutScreen",
			"howScreen",
			"coopScreen",
		].includes(screen)
	) {
		let dest = returnScreen || "pauseScreen";
		if (!$(dest)) dest = "pauseScreen";
		if (dest === screen) dest = "pauseScreen";
		showScreen(dest);
		localMenu =
			dest !== "titleScreen" && dest !== "mapScreen" && dest !== "resultScreen";
		if (dest === "mapScreen") refreshMap();
	} else if (screen === "pauseScreen") resume();
	else if (!screen || screen === "mapScreen" || screen === "resultScreen")
		pause();
}
function buildDev() {
	const cfg = [
		["speed", "Flight speed", 4, 22, 0.5],
		["enemyRate", "Enemy aggression", 0.2, 3, 0.1],
		["damage", "Incoming damage", 0, 3, 0.1],
		["fireRate", "Shot interval", 0.06, 0.5, 0.01],
		["fuelDrain", "Fuel consumption", 0, 5, 0.1],
		["assist", "Aim assistance", 0, 9, 0.5],
	];
	$("devSliders").innerHTML = cfg
		.map(
			([key, label, min, max, step]) =>
				'<div class="row"><label for="dev-' +
				key +
				'">' +
				label +
				'</label><div class="rangeGroup"><input id="dev-' +
				key +
				'" data-setting="' +
				key +
				'" type="range" min="' +
				min +
				'" max="' +
				max +
				'" step="' +
				step +
				'" value="' +
				campaign.settings[key] +
				'"><output>' +
				campaign.settings[key] +
				"</output></div></div>",
		)
		.join("");
	$("devWarp").innerHTML = SECTORS.map(
		(s, i) =>
			'<button class="smallButton" data-dev-sector="' +
			i +
			'">' +
			s.code +
			" / " +
			s.name +
			"</button>",
	).join("");
	$("devDiagnostics").textContent =
		"Three.js r" +
		view.metadata.version +
		" / " +
		view.metadata.backend +
		" / " +
		campaign.diagnostics().physics +
		" / " +
		campaign.bodies.size +
		" physics bodies. Balance updates immediately. Progress resets on a new patrol.";
	document.querySelector("[data-action=god]").textContent =
		"Invulnerability: " + (campaign.god ? "ON" : "OFF");
}
function escapeText(t) {
	return String(t).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}
function buildCredits() {
	const data = CREDITS;
	let html =
		'<h3 class="creditsSection">Source Information</h3><dl class="creditsGrid">';
	for (const [k, v] of Object.entries(data.sourceInformation))
		html +=
			"<dt>" +
			escapeText(k[0].toUpperCase() + k.slice(1)) +
			"</dt><dd>" +
			escapeText(v) +
			"</dd>";
	html +=
		'</dl><p class="feedbackItem" style="margin-top:22px">Original Solaris: Doug Neubauer / Atari, 1986. This is an original, unofficial tribute. Design, code, procedural art and sound: OpenAI gpt-6.1-sol.</p><p class="feedbackItem">Research: <a href="https://www.atariage.com/2600/manuals_old/solaris.html" target="_blank" rel="noopener">Original Atari instruction manual</a> · <a href="https://www.mobygames.com/game/10506/solaris/" target="_blank" rel="noopener">MobyGames</a> · <a href="https://atariage.com/screenshot_page.php?SoftwareLabelID=450" target="_blank" rel="noopener">AtariAge screenshots</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a></p>';
	const qs = {
		testingFeedback: [
			"How many issues did testing catch?",
			"How many were critical or game breaking?",
			"Most helpful test?",
			"Least helpful test?",
		],
		engineFeedback: [
			"What did you like most about the engine?",
			"Did you get stuck or guess wrong?",
			"Most important thing built yourself?",
			"Hardest part of using the engine?",
			"What did you change in the engine, and why?",
			"If you could change one thing?",
		],
		promptFeedback: [
			"What did you like most about the prompt?",
			"What was confusing?",
			"What was hardest?",
			"What would you change?",
		],
	};
	for (const [key, title] of [
		["testingFeedback", "Testing Feedback"],
		["engineFeedback", "Engine Feedback"],
		["promptFeedback", "Prompt Feedback"],
	]) {
		html += '<h3 class="creditsSection">' + title + "</h3>";
		for (const [i, answer] of data[key].entries()) {
			html +=
				'<p class="feedbackItem"><b>' +
				qs[key][i] +
				"</b>" +
				escapeText(answer) +
				"</p>";
		}
	}
	html +=
		'<p class="tiny">Libraries: Three.js r180 (MIT) / Rapier 0.19.3 (Apache-2.0) / PeerJS 1.5.5 (MIT).<br>Usage: added on import.</p>';
	$("credits").innerHTML = html;
	if (networkState.mode === "hub")
		$("credits")
			.querySelectorAll("a")
			.forEach((a) => {
				a.removeAttribute("href");
				a.removeAttribute("target");
			});
}

document.addEventListener("click", async (e) => {
	if (
		activity(
			touchMode ? "touch" : lastInput === "gamepad" ? "gamepad" : "mouse",
		) ||
		performance.now() < ignoreClickUntil
	)
		return;
	sound.unlock();
	const btn = e.target.closest("[data-action],[data-sector],[data-dev-sector]");
	if (!btn || btn.disabled) return;
	if (btn.dataset.sector !== undefined) {
		selectSector(+btn.dataset.sector);
		if (networkState.isHost && campaign.travel(+btn.dataset.sector)) {
			lastStateMode = "";
			syncScreen();
		}
		return;
	}
	if (btn.dataset.devSector !== undefined) {
		if (!networkState.isHost) return;
		campaign.s.cleared = [
			...new Set([
				...campaign.s.cleared,
				...Array.from({ length: +btn.dataset.devSector }, (_, i) => i),
			]),
		];
		localMenu = false;
		campaign.travel(+btn.dataset.devSector);
		lastStateMode = "";
		syncScreen();
		return;
	}
	sound.sfx("select");
	const act = btn.dataset.action;
	if (act === "start" || act === "coopStart") startRun();
	else if (act === "warp") {
		if (campaign.travel(selectedSector)) {
			lastStateMode = "";
			syncScreen();
		}
	} else if (act === "pause") pause();
	else if (act === "resume") resume();
	else if (act === "back") back();
	else if (act === "settings") openOverlay("settingsScreen");
	else if (act === "how") openOverlay("howScreen");
	else if (act === "about" || act === "resultAbout") {
		buildCredits();
		openOverlay("aboutScreen");
	} else if (act === "dev") openOverlay("devScreen");
	else if (act === "coop") openOverlay("coopScreen");
	else if (act === "continue") {
		if (!networkState.isHost) return;
		localMenu = false;
		if (campaign.s.mode === "victory" || campaign.s.mode === "gameover")
			startRun();
		else {
			campaign.toMap();
			selectedSector = campaign.nextSector();
			lastStateMode = "";
			syncScreen();
		}
	} else if (act === "scanner") {
		openScanner();
	} else if (act === "quit") {
		if (networkState.mode === "hub") return;
		campaign.clearField();
		campaign.s.mode = "title";
		campaign.s.attract = false;
		localMenu = false;
		showScreen("titleScreen");
		sound.setScene("title");
		lastStateMode = "title";
	} else if (act === "host") {
		await net.host();
	} else if (act === "join") {
		await net.join($("joinCode").value.trim().toUpperCase());
	} else if (act === "disconnect") {
		net.disconnect();
		campaign.clearField();
		campaign.s.mode = "title";
		lastStateMode = "title";
		returnScreen = "titleScreen";
	} else if (act === "pulse") {
		if (!localMenu) pulseUntil = performance.now() + 200;
	} else if (act === "god") {
		campaign.god = !campaign.god;
		btn.textContent = "Invulnerability: " + (campaign.god ? "ON" : "OFF");
	} else if (act === "refill") {
		campaign.s.hull = 100;
		campaign.s.fuel = 100;
		campaign.s.lives = 3;
		campaign.s.pulse = 0;
		sound.sfx("dock");
	} else if (act === "complete") {
		if (!networkState.isHost) return;
		if (campaign.s.mode === "paused") campaign.s.mode = pausedMode;
		campaign.complete();
		localMenu = false;
		lastStateMode = "";
		syncScreen();
	} else if (act === "redZone") {
		campaign.s.redZone = !campaign.s.redZone;
		btn.textContent = "Red Zone: " + (campaign.s.redZone ? "ON" : "OFF");
	} else if (act === "restart") {
		if (networkState.mode === "hub") return;
		startRun();
	} else if (act === "resetDev") {
		campaign.settings = { ...DEFAULTS };
		buildDev();
	} else if (act === "resetOptions") {
		sound.setMusic(0.1);
		sound.setSfx(0.65);
		campaign.settings.assist = 5.5;
		glyphSet = "ps";
		$("music").value = 10;
		$("effects").value = 65;
		$("glyphs").value = "ps";
		$("aimAssist").value = 5.5;
		updateSettings();
	}
});
document.addEventListener("input", (e) => {
	activity(touchMode ? "touch" : e.isTrusted ? "mouse" : lastInput);
	const el = e.target;
	if (el.dataset.setting) {
		campaign.settings[el.dataset.setting] = +el.value;
		el.nextElementSibling.textContent = el.value;
	}
	if (["music", "effects", "aimAssist", "glyphs"].includes(el.id))
		updateSettings();
});
function updateSettings() {
	sound.setMusic(+$("music").value / 100);
	sound.setSfx(+$("effects").value / 100);
	glyphSet = $("glyphs").value;
	campaign.settings.assist = +$("aimAssist").value;
	$("musicOut").textContent = $("music").value + "%";
	$("effectsOut").textContent = $("effects").value + "%";
	$("assistOut").textContent = $("aimAssist").value;
	updatePrompts();
}
document.addEventListener("pointerover", (e) => {
	const el = e.target.closest("button");
	if (el && !el.disabled) {
		document.querySelectorAll("button.focused").forEach((b) => {
			b.classList.remove("focused");
		});
		el.classList.add("focused");
		el.focus({ preventScroll: true });
		if (el.dataset.sector !== undefined)
			selectSector(+el.dataset.sector, false);
	}
});
function focusNav(dir) {
	if (!screen) return;
	const focusables = [
		...$(screen).querySelectorAll(
			"button:not(:disabled),input:not(:disabled),select:not(:disabled)",
		),
	].filter((e) => e.getClientRects().length);
	if (!focusables.length) return;
	let index = focusables.indexOf(document.activeElement);
	index = (index + dir + focusables.length) % focusables.length;
	focusables[index].focus();
	document.querySelectorAll("button.focused").forEach((b) => {
		b.classList.remove("focused");
	});
	focusables[index].classList.add("focused");
	if (focusables[index].dataset.sector !== undefined)
		selectSector(+focusables[index].dataset.sector, false);
}
document.addEventListener("keydown", (e) => {
	if (activity("keyboard")) {
		e.preventDefault();
		return;
	}
	sound.unlock();
	if (
		(e.target instanceof HTMLInputElement && e.target.type === "text") ||
		e.target === $("joinCode")
	) {
		if (e.key === "Escape") back();
		return;
	}
	keys.add(e.code);
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Escape",
		].includes(e.code)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (e.code === "Escape") {
		if (screen) back();
		else pause();
		return;
	}
	if (
		e.code === "KeyM" &&
		(!localMenu || (screen === "mapScreen" && !networkState.isHost)) &&
		["flight", "map"].includes(campaign.s.mode)
	) {
		openScanner();
		return;
	}
	if (screen) {
		if (e.code === "ArrowDown" || e.code === "KeyS") focusNav(1);
		else if (e.code === "ArrowUp" || e.code === "KeyW") focusNav(-1);
		else if (
			(e.code === "ArrowRight" || e.code === "ArrowLeft") &&
			document.activeElement?.type !== "range" &&
			document.activeElement?.tagName !== "SELECT"
		)
			focusNav(e.code === "ArrowRight" ? 1 : -1);
		else if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			document.activeElement?.click();
		} else if (
			document.activeElement?.type === "range" &&
			["ArrowLeft", "ArrowRight"].includes(e.code)
		) {
			const el = document.activeElement;
			el.value =
				+el.value + (e.code === "ArrowRight" ? 1 : -1) * (+el.step || 1);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}
	}
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	pointer.down = false;
});
document.addEventListener("mousemove", (e) => {
	if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
	activity("mouse");
	const nx = e.clientX / innerWidth,
		ny = e.clientY / innerHeight;
	const ray = new THREE.Vector3(nx * 2 - 1, 1 - ny * 2, 0.5)
		.unproject(view.camera)
		.sub(view.camera.position)
		.normalize();
	const hit = view.camera.position
		.clone()
		.addScaledVector(ray, (-42 - view.camera.position.z) / ray.z);
	pointer.x = hit.x;
	pointer.y = hit.y;
	pointer.active = true;
});
document.addEventListener("mousedown", (e) => {
	if (e.target.closest("button,input,select,a") || screen) return;
	if (activity("mouse")) return;
	pointer.down = e.button === 0;
	sound.unlock();
});
document.addEventListener("mouseup", () => (pointer.down = false));
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("pointerdown", (e) => {
	if (e.pointerType !== "touch") return;
	if (activity("touch")) return;
	sound.unlock();
	if (e.target.closest("button,input,select") || screen) return;
	e.preventDefault();
	if (e.clientX < innerWidth * 0.5 && !touch.left) {
		touch.left = { id: e.pointerId, x: e.clientX, y: e.clientY };
		$("touchRipple").style.cssText =
			"display:block;left:" +
			(e.clientX - 35) +
			"px;top:" +
			(e.clientY - 35) +
			"px";
	} else if (!touch.right)
		touch.right = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
document.addEventListener("pointermove", (e) => {
	if (e.pointerType !== "touch") return;
	if (touch.left?.id === e.pointerId) {
		touch.x = clamp((e.clientX - touch.left.x) / 65, -1, 1);
		touch.y = clamp((touch.left.y - e.clientY) / 65, -1, 1);
	} else if (touch.right?.id === e.pointerId) {
		touch.aimX = clamp((e.clientX / innerWidth - 0.5) * 40, -18, 18);
		touch.aimY = clamp((0.5 - e.clientY / innerHeight) * 25, -9, 12);
	}
});
const endTouch = (e) => {
	if (touch.left?.id === e.pointerId) {
		touch.left = null;
		touch.x = touch.y = 0;
		$("touchRipple").style.display = "none";
	}
	if (touch.right?.id === e.pointerId) touch.right = null;
};
document.addEventListener("pointerup", endTouch);
document.addEventListener("pointercancel", endTouch);

function pollPad() {
	const p = [...(navigator.getGamepads?.() || [])].find((g) => g?.connected);
	if (!p) {
		padState.x = padState.y = 0;
		padState.fire = padState.pulse = padState.boost = false;
		padButtons = [];
		return;
	}
	const dead = (x) => (Math.abs(x || 0) < 0.15 ? 0 : x);
	const ax = dead(p.axes[0]),
		ay = dead(p.axes[1]),
		rx = dead(p.axes[2]),
		ry = dead(p.axes[3]),
		bs = p.buttons.map((b) => !!b.pressed);
	const meaningful =
		Math.abs(ax) + Math.abs(ay) + Math.abs(rx) + Math.abs(ry) > 0.1 ||
		bs.some(Boolean);
	if (meaningful) {
		if (activity("gamepad")) {
			padButtons = bs;
			return;
		}
		sound.unlock();
	}
	padState = {
		x: ax,
		y: -ay,
		aimX: padState.aimX + rx * 0.35,
		aimY: padState.aimY - ry * 0.25,
		fire: bs[7] || bs[0],
		boost: bs[6],
		pulse: bs[2],
	};
	padState.aimX = clamp(padState.aimX, -18, 18);
	padState.aimY = clamp(padState.aimY, -9, 12);
	const edge = (i) => bs[i] && !padButtons[i];
	if (edge(9) && !bs[8]) pause();
	if (edge(1) && screen) back();
	if (
		edge(3) &&
		(!screen || (screen === "mapScreen" && !networkState.isHost)) &&
		campaign.s.mode === "flight"
	) {
		openScanner();
	}
	if (screen) {
		const now = performance.now(),
			vertical = edge(12) || ay < -0.5 ? -1 : edge(13) || ay > 0.5 ? 1 : 0;
		const horizontal =
			edge(14) || ax < -0.5 ? -1 : edge(15) || ax > 0.5 ? 1 : 0;
		if ((vertical || horizontal) && now > padNavAt) {
			if (horizontal && document.activeElement?.type === "range") {
				const el = document.activeElement;
				el.value = +el.value + horizontal * (+el.step || 1);
				el.dispatchEvent(new Event("input", { bubbles: true }));
			} else if (horizontal && document.activeElement?.tagName === "SELECT") {
				const el = document.activeElement;
				el.selectedIndex = clamp(
					el.selectedIndex + horizontal,
					0,
					el.options.length - 1,
				);
				el.dispatchEvent(new Event("input", { bubbles: true }));
			} else focusNav(vertical || horizontal);
			padNavAt = now + 200;
		}
		if (edge(0)) document.activeElement?.click();
		if (screen === "aboutScreen" && Math.abs(ry) > 0.2)
			$("aboutScreen").querySelector(".panel").scrollTop += ry * 18;
	}
	padButtons = bs;
}
function getInput() {
	if (screen || networkState.ended) return {};
	let x = 0,
		y = 0;
	if (lastInput === "gamepad") return { ...padState };
	if (touchMode) {
		const target = campaign.s.enemies.sort((a, b) => b.z - a.z)[0];
		const p = networkState.me === 1 ? campaign.s.ally : campaign.s.player;
		let mx = touch.x,
			my = touch.y;
		const obj = campaign.s.objects
			.filter((o) => ["cadet", "key"].includes(o.type) && o.z > -20)
			.sort((a, b) => b.z - a.z)[0];
		if (obj && Math.hypot(obj.x - p.x, obj.y - p.y) < 5) {
			mx = clamp(mx + (obj.x - p.x) * 0.25, -1, 1);
			my = clamp(my + (obj.y - p.y) * 0.25, -1, 1);
		}
		return {
			x: mx,
			y: my,
			fire: true,
			aimX: touch.right ? touch.aimX : (target?.x ?? p.x),
			aimY: touch.right ? touch.aimY : (target?.y ?? p.y),
			boost: false,
			pulse: performance.now() < pulseUntil,
		};
	}
	x =
		(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
		(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
	y =
		(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
		(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
	const p = networkState.me === 1 ? campaign.s.ally : campaign.s.player;
	return {
		x,
		y,
		aimX: pointer.active ? pointer.x : p.x,
		aimY: pointer.active ? pointer.y : p.y,
		fire: pointer.down || keys.has("Space"),
		boost: keys.has("ShiftLeft") || keys.has("ShiftRight"),
		pulse: keys.has("KeyE") || performance.now() < pulseUntil,
	};
}
function routeInputs(local) {
	if (!networkState.connected) return [local, {}];
	const ids = networkState.players.map((p) => p.id).sort((a, b) => a - b);
	const inputs = ids.map((id) => {
		if (id === networkState.me && !networkState.server) return local;
		const r = remoteInputs.get(id);
		return r && performance.now() - r.received < 600 ? r : {};
	});
	return [inputs[0] || {}, inputs[1] || {}];
}
function drive(dt, input) {
	if (!networkState.isHost) return;
	if (campaign.s.attract) {
		attractDelay += dt;
		if (campaign.s.mode === "map" || campaign.s.mode === "debrief") {
			if (attractDelay > 0.8) {
				const next = campaign.nextSector();
				campaign.travel(next);
				attractDelay = 0;
			}
		} else if (["victory", "gameover"].includes(campaign.s.mode)) {
			if (attractDelay > 7) {
				startRun(true);
				attractDelay = 0;
			}
		} else {
			campaign.step(dt, campaign.pilot());
			if (campaign.s.mode === "debrief" || campaign.s.mode === "victory")
				attractDelay = 0;
		}
	} else {
		const [a, b] = routeInputs(input);
		campaign.step(dt, a, b);
	}
}
function updateHud() {
	const s = campaign.s;
	$("objective").textContent =
		s.objective || SECTORS[s.sector].label.toUpperCase();
	$("sectorBadge").textContent =
		SECTORS[s.sector].code + " / " + SECTORS[s.sector].name;
	$("missionSub").textContent = s.redZone
		? "RED ZONE / FLIGHT CONTROLS REVERSED"
		: !s.cleared.includes(0)
			? "UPLINK UNDER ATTACK / " + Math.ceil(s.threat) + "s"
			: "THREE SIGNALS / FIND SOLARIS";
	$("hullNum").textContent = Math.max(0, Math.ceil(s.hull));
	$("hullBar").style.width = clamp(s.hull, 0, 100) + "%";
	$("reserves").textContent = "△ ".repeat(s.lives) + " / RESERVES";
	$("fuelNum").textContent = Math.max(0, Math.ceil(s.fuel));
	$("fuelBar").style.width = clamp(s.fuel, 0, 100) + "%";
	$("score").textContent = String(s.score).padStart(6, "0");
	$("pulseLabel").textContent =
		s.pulse > 0
			? "NOVA RECHARGING / " + Math.ceil(s.pulse) + "s"
			: "NOVA PULSE READY";
	$("focusTarget").style.left = 50 + s.focusTarget * 43 + "%";
	$("focusShip").style.left = 50 + s.warpFocus * 43 + "%";
	$("warpDestination").textContent = "HYPERWARP / " + SECTORS[s.sector].name;
	$("toast").style.opacity =
		s.messageTime > 0 && !screen && s.mode === "flight" ? "1" : "0";
	$("toast").querySelector("b").textContent = s.message;
	$("toast").querySelector("p").textContent = s.messageDetail || "";
	$("radarDots").innerHTML = s.enemies
		.map(
			(e) =>
				'<i class="dot" style="left:' +
				clamp(50 + e.x * 3, 5, 95) +
				"%;top:" +
				clamp(84 + e.z * 0.9, 5, 85) +
				'%"></i>',
		)
		.join("");
	$("redFlash").style.opacity =
		s.invulnerable > 0.6 && s.invulnerable < 1 ? 0.25 : 0;
	const inp = getInput(),
		aimX = inp.aimX ?? s.player.x,
		aimY = inp.aimY ?? s.player.y;
	let enemy = null,
		nearest = campaign.settings.assist;
	for (const e of s.enemies) {
		const distance = Math.hypot(e.x - aimX, e.y - aimY);
		if (e.z < 1 && distance < nearest) {
			enemy = e;
			nearest = distance;
		}
	}
	const boss = s.enemies.find((e) => e.type === "boss");
	$("bossHud").style.display =
		boss && !screen && s.mode === "flight" ? "block" : "none";
	if (boss) {
		$("bossHealth").style.width =
			Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
		$("bossStatus").textContent =
			"SUN EATER / PHASE " +
			Math.max(1, boss.phase) +
			" / " +
			(boss.shield ? "SHIELD UP — NOVA PULSE" : "CORE EXPOSED");
	}
	const point = view.project(
		enemy?.x ?? aimX,
		enemy?.y ?? aimY,
		enemy?.z ?? -42,
	);
	$("reticle").style.left = clamp(point.x * 100, 3, 97) + "%";
	$("reticle").style.top = clamp(point.y * 100, 10, 85) + "%";
	$("reticle").classList.toggle("locked", !!enemy);
	updateHudVisibility();
}
function sendNetwork(now, input) {
	if (
		!networkState.connected ||
		networkState.ended ||
		now - lastNetworkSend < 85
	)
		return;
	lastNetworkSend = now;
	if (networkState.isHost) {
		const s = campaign.snapshot();
		s.particles = s.particles.slice(-6);
		s.shots = s.shots.slice(-30);
		net.send(
			{
				kind: "world",
				seq: ++networkSeq,
				state: s,
				scene: sound.scene,
				audio: networkAudio.splice(0),
			},
			{ reliable: false },
		);
	} else
		net.send(
			{ kind: "input", input },
			{
				reliable: false,
				to: globalThis.AIHub?.active ? AIHub.host : undefined,
			},
		);
}
let previous = performance.now(),
	accumulator = 0,
	hudClock = 0;
function frame(now) {
	requestAnimationFrame(frame);
	if (!ready) return;
	const dt = Math.min(0.05, (now - previous) / 1000);
	previous = now;
	pollPad();
	if (!networkState.ended) {
		if (networkState.mode === "hub") {
			$("hubWait").style.display = net.canPlay() ? "none" : "block";
			$("hubWait").textContent = networkState.started
				? Math.max(1, Math.ceil(-net.time() / 1000))
				: "FLIGHT CONTROL / STANDING BY";
			if (networkState.started && !hubStarted) {
				hubStarted = true;
				if (networkState.isHost) {
					startRun(false, true);
					campaign.travel(0);
				}
			}
		}
		const input = getInput();
		if (networkState.mode !== "hub" || net.canPlay()) {
			accumulator += dt;
			let count = 0;
			while (accumulator >= 1 / 60 && count++ < 5) {
				drive(1 / 60, input);
				accumulator -= 1 / 60;
			}
		}
		sendNetwork(now, input);
		syncScreen();
		if (
			screen === "titleScreen" &&
			!localMenu &&
			!networkState.connected &&
			now - lastActivity > 10000
		)
			startRun(true);
	}
	if (!networkState.server) view.update(campaign.s, dt);
	hudClock += dt;
	if (hudClock > 0.06) {
		updateHud();
		hudClock = 0;
	}
}
window.addEventListener("resize", () => view.resize());
window.__game = {
	ready: false,
	state: () => campaign.snapshot(),
	diagnostics: () => ({
		...campaign.diagnostics(),
		...view.metadata,
		audio: sound.diagnostics(),
	}),
	start: () => {
		sound.unlock();
		startRun();
	},
	travel: (i) => {
		localMenu = false;
		campaign.travel(i);
		lastStateMode = "";
		syncScreen();
	},
	advance: (seconds, bot = true) => {
		const steps = Math.ceil(seconds * 60);
		let guard = 0;
		for (let i = 0; i < steps; i++) {
			if (bot) {
				if (["map", "debrief"].includes(campaign.s.mode)) {
					campaign.travel(campaign.nextSector());
				} else if (campaign.s.mode === "paused") {
					campaign.s.mode = pausedMode;
					localMenu = false;
				}
				campaign.step(1 / 60, campaign.pilot());
			} else campaign.step(1 / 60, {});
			if (campaign.s.mode === "victory" || campaign.s.mode === "gameover")
				break;
			if (++guard > 180000) break;
		}
		lastStateMode = "";
		localMenu = false;
		syncScreen();
		return campaign.snapshot();
	},
	input: (data) => {
		campaign.step(1 / 60, data);
		return campaign.snapshot();
	},
	network: () => net.status(),
	host: () => net.host(),
	join: (code) => net.join(code),
	disconnect: () => net.disconnect(),
	dev: {
		god: (value) => (campaign.god = value),
		settings: (settings) => Object.assign(campaign.settings, settings),
		recoverGraphics: () =>
			view
				.recoverGraphics("Developer recovery test")
				.then(() => ({ ...view.metadata })),
	},
	audio: () => sound.diagnostics(),
};
async function boot() {
	try {
		await net.hubConnect;
		await Promise.all([
			networkState.server ? Promise.resolve() : view.init(),
			campaign.init(),
		]);
		for (const [i, s] of SECTORS.entries()) {
			const button = document.createElement("button");
			button.className = "sectorNode";
			button.dataset.sector = i;
			button.innerHTML =
				'<span class="planetIcon">' +
				["✧", "◒", "⌾", "⋈", "◎", "✺"][i] +
				'</span><span class="nodeName">' +
				s.name +
				"</span><small>SIGNAL ACTIVE</small>";
			$("chart").appendChild(button);
		}
		buildCredits();
		updatePrompts();
		ready = true;
		window.__game.ready = true;
		$("loading").style.display = "none";
		net.ready();
		if (networkState.mode === "hub") {
			campaign.start(false);
			campaign.s.mode = "map";
			showScreen(null);
			if (networkState.started) {
				hubStarted = true;
				if (networkState.isHost) {
					startRun(false, true);
					campaign.travel(0);
				}
			}
		} else showScreen("titleScreen");
		previous = performance.now();
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		$("loadMessage").textContent =
			"The StarCruiser could not start: " + error.message;
		if (AIHub?.active) AIHub.fail(error.message);
	}
}
boot();
