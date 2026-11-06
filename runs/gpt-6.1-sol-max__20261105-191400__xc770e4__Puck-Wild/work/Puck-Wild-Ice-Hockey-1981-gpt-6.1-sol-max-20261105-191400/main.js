import { Arena } from "./arena.js";
import {
	Hockey,
	initPhysics,
	DEFAULTS,
	TEAM_NAMES,
	DRILLS,
} from "./simulation.js";
import { RinkAudio } from "./audio.js";
import { Controls } from "./input.js";

const $ = (id) => document.getElementById(id),
	meta = JSON.parse($("game-metadata").textContent),
	audio = new RinkAudio();
let arena,
	game,
	controls,
	screen = "loading",
	modal = null,
	returnModal = null,
	focusIndex = 0,
	localPlayers = 1,
	lastInput = performance.now(),
	lastTime = performance.now(),
	accumulator = 0,
	toastUntil = 0,
	matchEndedAt = 0,
	attractStage = -1;
let hub = null,
	hubStarted = false,
	hubEnded = false,
	hubReported = false,
	netTimer = 0,
	netEvents = [],
	remoteInputs = {},
	remoteSeen = {},
	localCounters = [0, 0, 0, 0],
	localInputSeq = 0,
	lastSnapshot = -1,
	remoteDisconnect = new Set(),
	queuedInputs = {};
const settings = {
	music: 0.1,
	sfx: 0.7,
	glyph: "ps",
	vibration: true,
	effects: true,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("puckWild-settings") || "{}"),
	);
} catch {}
const save = () => {
	try {
		localStorage.setItem("puckWild-settings", JSON.stringify(settings));
	} catch {}
};
function prompt(action) {
	const pad = controls?.last === "pad",
		x = settings.glyph === "xbox";
	const maps = {
		shoot: pad ? [x ? "RT" : "R2", "Shoot"] : ["SPACE", "Shoot"],
		pass: pad ? [x ? "A" : "×", "Pass"] : ["E", "Pass"],
		check: pad ? [x ? "X" : "□", "Check"] : ["Q", "Check"],
		boost: pad ? [x ? "RB" : "R1", "Burst"] : ["SHIFT", "Burst"],
		switch: pad ? [x ? "LB" : "L1", "Switch"] : ["TAB", "Switch"],
		confirm: pad ? [x ? "A" : "×", "Select"] : ["ENTER", "Select"],
		back: pad ? [x ? "B" : "○", "Back"] : ["ESC", "Back"],
	};
	const [key, label] = maps[action];
	return `<${pad ? 'span class="glyph"' : "kbd"}>${key}</${pad ? "span" : "kbd"}>${label}`;
}
function updatePrompts() {
	if (!controls) return;
	document.body.classList.toggle("touch-mode", controls.last === "touch");
	$("menu-prompt").innerHTML =
		controls.last === "touch"
			? "TAP IN. MAKE SOME TROUBLE."
			: `${prompt("confirm")} &nbsp; <span class="muted">↑ ↓ Navigate</span>`;
	$("game-prompts").innerHTML = ["shoot", "pass", "check", "boost", "switch"]
		.map((p) => `<span>${prompt(p)}</span>`)
		.join("");
	$("back-button").innerHTML = prompt("back");
	if (["about", "controls", "dev"].includes(modal))
		$("panel-kicker").textContent =
			(modal === "dev" ? "LIVE DEVELOPER TOOLS · " : "PUCK WILD · ") +
			(controls.last === "pad"
				? "RIGHT STICK TO SCROLL"
				: controls.last === "touch"
					? "SWIPE TO SCROLL"
					: "MOUSE WHEEL TO SCROLL");
}
function toast(text, seconds = 2.5) {
	$("toast").textContent = text;
	$("toast").hidden = false;
	toastUntil = performance.now() + seconds * 1000;
}
function activity(kind, changed) {
	if (hubEnded) return;
	if (kind === "pad" && !audio.ctx) audio.unlock();
	lastInput = performance.now();
	if (changed) updatePrompts();
	if (screen === "attract") {
		showTitle();
		controls?.clear();
	}
	if (kind === "touch") updatePrompts();
}
function focusables() {
	const root = modal
		? $("modal-layer")
		: screen === "title"
			? $("title-screen")
			: $("hud");
	return Array.from(root.querySelectorAll("button,input")).filter(
		(el) => !el.disabled && !el.hidden && el.offsetParent !== null,
	);
}
function setFocus(i) {
	const els = focusables();
	if (!els.length) return;
	focusIndex = (i + els.length) % els.length;
	document
		.querySelectorAll(".focused")
		.forEach((e) => e.classList.remove("focused"));
	els[focusIndex].classList.add("focused");
	if (modal) els[focusIndex].scrollIntoView({ block: "nearest" });
}
function menuCommand(action) {
	if (hubEnded || screen === "loading") return;
	if (modal && (action === "scroll-down" || action === "scroll-up")) {
		$("panel-content").scrollTop += action === "scroll-down" ? 24 : -24;
		return;
	}
	if (action === "pause") {
		if (modal) back();
		else if (screen === "play" || screen === "training" || screen === "hub")
			openModal("pause");
		return;
	}
	if (action === "back") {
		if (modal) back();
		return;
	}
	if (!modal && screen !== "title") return;
	const els = focusables();
	if (action === "up" || action === "down") {
		setFocus(focusIndex + (action === "up" ? -1 : 1));
		audio.ui();
	} else if (action === "confirm") els[focusIndex]?.click();
	else if (action === "left" || action === "right") {
		const el = els[focusIndex],
			dir = action === "left" ? -1 : 1;
		if (el?.type === "range") {
			el.value = Number(el.value) + Number(el.step || 1) * dir;
			el.dispatchEvent(new Event("input", { bubbles: true }));
		} else if (el?.dataset.cycle) el.click();
	}
}
function hideModal() {
	modal = null;
	returnModal = null;
	$("modal-layer").hidden = true;
	$("panel-content").innerHTML = "";
	setFocus(0);
	lastInput = performance.now();
}
function back() {
	if (modal === "pause") {
		hideModal();
		controls.clear();
	} else if (["settings", "controls", "about"].includes(modal)) {
		const dest = returnModal;
		hideModal();
		if (dest) openModal(dest);
	} else if (modal === "dev") {
		openModal("pause");
	} else if (modal === "result") {
		showTitle();
	} else hideModal();
}
function button(text, action, primary = false) {
	return `<button class="menu-btn ${primary ? "primary" : ""}" data-action="${action}">${text}<span class="arrow">→</span></button>`;
}
function slider(label, id, value, min, max, step, help = "") {
	return `<div class="setting-row"><label for="${id}">${label}<small>${help}</small></label><div class="range-control"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-slider="${id}" aria-label="${label}"><output id="${id}-value" for="${id}">${value}${id === "music" || id === "sfx" ? "%" : ""}</output></div></div>`;
}
function openModal(type) {
	if (hubEnded) return;
	const previous = modal;
	if (["settings", "controls", "about"].includes(type) && !returnModal)
		returnModal = previous === "pause" ? "pause" : null;
	modal = type;
	$("modal-layer").hidden = false;
	$("panel").classList.toggle(
		"wide",
		["about", "dev", "controls"].includes(type),
	);
	$("back-button").hidden = type === "result" && !!hub;
	const titles = {
		pause: "TAKE A BREATHER",
		settings: "YOUR KIND OF COLD",
		controls: "ICE KNOW-HOW",
		about: "BEHIND THE BOARDS",
		local: "FRIENDLY FIRE",
		dev: "THE COACH’S BENCH",
		result: game?.training ? "NICE WORK, ROOKIE." : "THAT’S THE HORN!",
	};
	$("panel-title").textContent = titles[type];
	$("panel-kicker").textContent =
		type === "dev"
			? "LIVE DEVELOPER TOOLS"
			: type === "local"
				? "LOCAL MULTIPLAYER"
				: type === "result"
					? "THE WILD CUP"
					: "PUCK WILD";
	let html = "";
	if (type === "pause") {
		html = `<p>${hub ? "The match keeps moving while you’re here." : "Even hot sticks need a cool-down."}</p><div class="menu">${button("BACK ON THE ICE", "resume", true)}${button("HOW TO PLAY", "controls")}${button("SETTINGS", "settings")}${button("DEV MODE", "dev")}${button("ABOUT & CREDITS", "about")}${!hub ? button("LEAVE THE RINK", "quit") : ""}</div>`;
	}
	if (type === "settings") {
		html =
			slider(
				"Music",
				"music",
				Math.round(settings.music * 100),
				0,
				100,
				1,
				"Procedural rink organ · 10% by default",
			) +
			slider(
				"Sound & voices",
				"sfx",
				Math.round(settings.sfx * 100),
				0,
				100,
				1,
				"Hits, skates, crowd & gibberish calls",
			) +
			`<div class="setting-row"><span class="setting-label">Controller symbols</span><button class="choice" data-action="glyph" data-cycle="1">${settings.glyph === "ps" ? "PlayStation" : "Xbox"}</button></div><div class="setting-row"><span class="setting-label">Controller rumble</span><button class="choice" data-action="vibration" data-cycle="1">${settings.vibration ? "On" : "Off"}</button></div><div class="setting-row"><span class="setting-label">Ice spray & confetti</span><button class="choice" data-action="effects" data-cycle="1">${settings.effects ? "On" : "Off"}</button></div><div class="action-row">${button("RESET SETTINGS", "reset-settings")}</div>`;
	}
	if (type === "controls") {
		const pad = controls.last === "pad";
		html = `<p>Two skaters. One goalie who’s got your back. Get the puck into the other team’s net. More goals after three periods wins. A tie? Next goal takes it.</p><div class="controls-grid"><div class="control-line"><span>${pad ? "LEFT STICK / D-PAD" : "WASD / ARROW KEYS"}</span>Skate</div><div class="control-line"><span>${prompt("shoot")}</span>Hold to charge, release to fire</div><div class="control-line"><span>${prompt("pass")}</span>Pass & follow the receiver</div><div class="control-line"><span>${prompt("check")}</span>Check a nearby rival</div><div class="control-line"><span>${prompt("boost")}</span>Hold for an energy burst</div><div class="control-line"><span>${prompt("switch")}</span>Switch your skater</div></div><p class="tiny">Mouse: aim on the ice, hold left click to charge a shot, release to shoot. Right click passes. On a pad, skate toward your shot or use the right stick to aim. Gold rings mark the skaters you control.</p><div class="callout">A quick tap is a wrist shot. A long hold is a slapshot. Bank it off the boards, pass into space, and give the goalie something to worry about. No icing. No offside. No penalties.</div><p class="network-note">Touch: drag anywhere on the left to skate; drag farther to burst. Hold and release the right side to shoot, or tap it to check. A contextual PASS button appears with the puck. Shooting and goalie control are assisted.</p><p class="network-note">Second keyboard: I J K L skate · N shoot · O pass · U check · right Shift burst · M switch. AI Hub assigns alternating team seats; all online traffic uses the Hub.</p>`;
	}
	if (type === "local") {
		html = `<p>Settle it on the ice. Add controllers, or share a keyboard for a two-player rivalry.</p><div class="setting-row"><span class="setting-label">Players</span><button class="choice" data-action="players" data-cycle="1">${localPlayers === 1 ? 2 : localPlayers} PLAYERS</button></div><div class="seat-strip">${Array.from({ length: localPlayers === 1 ? 2 : localPlayers }, (_, i) => `<div class="seat-chip"><strong>P${i + 1}</strong>${i % 2 ? "HOT SHOTS" : "NORTH STARS"}</div>`).join("")}</div><p class="tiny">P1: keyboard or first pad. P2: IJKL keyboard or second pad. P3–4: one pad each. Empty skater slots get an AI teammate. Goalies always play automatically.</p><div class="action-row">${button("DROP THE PUCK", "start-local", true)}</div><p class="network-note">Online with friends: open this game in an AI Hub session. Up to four players share the same rink, with teams assigned by seat.</p>`;
	}
	if (type === "dev") {
		const locked = hub && !hub.isHost;
		html =
			`<p class="tiny">${locked ? "Only the host can tune the shared rink." : "Changes apply immediately. Reset restores the original match balance."}</p><div ${locked ? "inert" : ""}>` +
			slider(
				"Skating speed",
				"speed",
				game.tune.speed,
				4,
				16,
				0.2,
				"4–16 rink units / second",
			) +
			slider(
				"Shot power",
				"shotPower",
				game.tune.shotPower,
				14,
				48,
				0.5,
				"Base puck speed",
			) +
			slider(
				"Opponent skill",
				"aiSkill",
				game.tune.aiSkill,
				0,
				1,
				0.02,
				"Pursuit, pressure & shot timing",
			) +
			slider(
				"Goalie skill",
				"goalieSkill",
				game.tune.goalieSkill,
				0,
				1,
				0.02,
				"Lateral speed & puck prediction",
			) +
			slider(
				"Puck drag",
				"puckDrag",
				game.tune.puckDrag,
				0,
				2,
				0.02,
				"Lower values keep the puck moving",
			) +
			slider(
				"Check strength",
				"checkPower",
				game.tune.checkPower,
				2,
				24,
				0.5,
				"Impulse on a successful hit",
			) +
			slider(
				"Period length",
				"periodLength",
				game.tune.periodLength,
				10,
				120,
				5,
				"Seconds, from the next period",
			) +
			`<div class="dev-tools"><button data-action="give-puck">GIVE ME THE PUCK</button><button data-action="faceoff">RESET FACEOFF</button><button data-action="score-blue">NORTH STARS +1</button><button data-action="score-red">HOT SHOTS +1</button><button data-action="end-period">END THIS PERIOD</button><button data-action="freeze-clock">CLOCK: ${game.freezeClock ? "FROZEN" : "RUNNING"}</button><button data-action="ai-takeover">AI TAKEOVER: ${game.seats.length ? "OFF" : "ON"}</button><button data-action="reset-tuning">RESET DEFAULTS</button></div></div>`;
	}
	if (type === "about") {
		html = `<div class="credits-tabs">${[
			["source", "Source Information"],
			["testing", "Testing Feedback"],
			["engine", "Engine Feedback"],
			["prompt", "Prompt Feedback"],
			["licenses", "Licenses"],
		]
			.map(
				([id, t]) =>
					`<button class="credits-tab ${id === "source" ? "active" : ""}" data-credit="${id}">${t}</button>`,
			)
			.join("")}</div><div id="credit-text" class="credits-list"></div>`;
	}
	if (type === "result") {
		if (game.training) {
			html = `<p>You’ve got the feet. You’ve got the hands. Time to make some trouble.</p><div class="callout">All six drills completed: skating, burst, passing, charged shots, checking, and scoring.</div><div class="menu">${button("PLAY THE CUP", "play", true)}${button("BACK TO TITLE", "quit")}</div>`;
		} else {
			const winner =
				game.winner < 0
					? "A DEAD HEAT."
					: `${TEAM_NAMES[game.winner]} TAKE THE CUP!`;
			html = `<p class="yellow" style="text-align:center">${winner}</p><div class="result-score"><span style="color:var(--blue)">${game.score[0]}</span><small>—</small><span style="color:var(--red)">${game.score[1]}</span></div><div class="stats"><div></div><div class="val" style="color:var(--blue)">NORTH</div><div class="val" style="color:var(--red)">HOT</div>${[
				["Shots", "shots"],
				["Passes", "passes"],
				["Body checks", "checks"],
				["Saves", "saves"],
			]
				.map(
					([name, key]) =>
						`<div>${name}</div><div class="val">${game.stats[key][0]}</div><div class="val">${game.stats[key][1]}</div>`,
				)
				.join(
					"",
				)}</div><div class="action-row">${button("RUN IT BACK", "rematch", true)}${button("TITLE", "quit")}</div>`;
		}
	}
	$("panel-content").innerHTML = html;
	if (type === "about") showCredit("source");
	focusIndex = type === "pause" ? 1 : 0;
	setFocus(focusIndex);
	updatePrompts();
}
const questions = {
	testing: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"Most helpful test",
		"Least helpful test",
	],
	engine: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important system built from scratch",
		"Hardest part of the engine",
		"Engine changes",
		"One thing to change",
	],
	prompt: [
		"What did you like most about the prompt?",
		"What was confusing?",
		"What was the hardest thing to do?",
		"What would you change?",
	],
};
function showCredit(which) {
	document
		.querySelectorAll("[data-credit]")
		.forEach((e) => e.classList.toggle("active", e.dataset.credit === which));
	const target = $("credit-text");
	target.innerHTML = "";
	if (which === "licenses") {
		for (const [name, license] of Object.entries(
			JSON.parse($("third-party-licenses").textContent),
		)) {
			const b = document.createElement("b");
			b.textContent = name;
			const p = document.createElement("pre");
			p.style =
				"white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.5 var(--body);user-select:text";
			p.textContent = license;
			target.append(b, p);
		}
		return;
	}
	if (which === "source") {
		const d = document.createElement("div");
		d.className = "credit-source";
		for (const [k, v] of Object.entries(meta.sourceInformation)) {
			const b = document.createElement("b");
			b.textContent = k;
			const s = document.createElement("span");
			s.textContent = v;
			d.append(b, s);
		}
		target.append(d);
	} else {
		const arr = meta[which + "Feedback"];
		arr.forEach((a, i) => {
			const e = document.createElement("div");
			e.className = "entry";
			const b = document.createElement("b");
			b.textContent = questions[which][i];
			const p = document.createElement("span");
			p.textContent = a;
			e.append(b, p);
			target.append(e);
		});
	}
}
function showTitle() {
	if (hub) return;
	screen = "title";
	hideModal();
	$("title-screen").hidden = false;
	$("hud").hidden = true;
	$("attract-caption").hidden = true;
	game.reset({ attract: true });
	lastInput = performance.now();
	attractStage = -1;
	setFocus(0);
}
function startGame({ training = false, players = 1, attract = false } = {}) {
	if (hub) return;
	hideModal();
	controls.clear();
	audio.unlock();
	audio.ended = false;
	audio.setVolumes();
	localPlayers = players;
	game.reset({ players, training, attract });
	screen = attract ? "attract" : training ? "training" : "play";
	$("title-screen").hidden = true;
	$("hud").hidden = false;
	$("attract-caption").hidden = !attract;
	matchEndedAt = 0;
	attractStage = -1;
	updatePrompts();
	if (!attract && !training)
		toast(
			innerWidth / innerHeight < 0.8
				? "NORTH STARS ↓     ↑ HOT SHOTS"
				: players > 1
					? "NORTH STARS →     ← HOT SHOTS"
					: "YOU ARE THE NORTH STARS. ATTACK RIGHT.",
			3.5,
		);
}
let savedSeats = null;
function handleAction(action) {
	if (hubEnded) return;
	audio.ui();
	if (["play", "training", "start-local", "rematch"].includes(action) && hub)
		return;
	switch (action) {
		case "play":
			startGame();
			break;
		case "training":
			startGame({ training: true });
			break;
		case "local":
			if (localPlayers === 1) localPlayers = 2;
			openModal("local");
			break;
		case "players":
			localPlayers = localPlayers === 2 ? 3 : localPlayers === 3 ? 4 : 2;
			openModal("local");
			break;
		case "start-local":
			startGame({ players: localPlayers });
			break;
		case "pause":
			openModal("pause");
			break;
		case "resume":
			hideModal();
			controls.clear();
			break;
		case "back":
			back();
			break;
		case "quit":
			if (!hub) showTitle();
			break;
		case "rematch":
			startGame({ players: localPlayers });
			break;
		case "settings":
		case "controls":
		case "about":
		case "dev":
			openModal(action);
			break;
		case "glyph":
			settings.glyph = settings.glyph === "ps" ? "xbox" : "ps";
			save();
			openModal("settings");
			break;
		case "vibration":
			settings.vibration = !settings.vibration;
			save();
			openModal("settings");
			break;
		case "effects":
			settings.effects = !settings.effects;
			arena.effects = settings.effects;
			save();
			openModal("settings");
			break;
		case "reset-settings":
			Object.assign(settings, {
				music: 0.1,
				sfx: 0.7,
				glyph: "ps",
				vibration: true,
				effects: true,
			});
			Object.assign(audio, { musicVolume: 0.1, sfxVolume: 0.7 });
			audio.setVolumes();
			arena.effects = true;
			save();
			openModal("settings");
			break;
		case "give-puck":
			game.givePuck(
				game.seats.find((s) => s.id === (hub?.me || 0))?.index || 0,
			);
			toast("PUCK DELIVERED. MAKE IT COUNT.");
			break;
		case "faceoff":
			game.faceoff();
			game.phase = "faceoff";
			game.phaseTime = 1.5;
			break;
		case "score-blue":
		case "score-red": {
			const old = game.phase;
			game.phase = "play";
			game.goal(action === "score-blue" ? 0 : 1);
			if (old === "training-complete") game.phase = old;
			break;
		}
		case "end-period":
			game.endPeriod();
			break;
		case "freeze-clock":
			game.freezeClock = !game.freezeClock;
			openModal("dev");
			break;
		case "ai-takeover":
			if (game.seats.length) {
				savedSeats = game.seats;
				game.seats = [];
			} else game.seats = savedSeats || [{ id: 0, team: 0, index: 0 }];
			openModal("dev");
			break;
		case "reset-tuning":
			Object.assign(game.tune, DEFAULTS);
			openModal("dev");
			break;
	}
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) handleAction(b.dataset.action);
	const c = e.target.closest("[data-credit]");
	if (c) showCredit(c.dataset.credit);
});
document.addEventListener("pointerdown", (e) => {
	if (e.target.closest("#ui"))
		controls?.activity(e.pointerType === "touch" ? "touch" : "mouse");
});
document.addEventListener("pointerover", (e) => {
	const t = e.target.closest("button,input");
	if (!t) return;
	const list = focusables(),
		i = list.indexOf(t);
	if (i >= 0) setFocus(i);
});
document.addEventListener("input", (e) => {
	const id = e.target.dataset.slider;
	if (!id) return;
	const n = Number(e.target.value);
	$(id + "-value").textContent =
		n + (id === "music" || id === "sfx" ? "%" : "");
	lastInput = performance.now();
	if (id === "music" || id === "sfx") {
		settings[id] = n / 100;
		audio.musicVolume = settings.music;
		audio.sfxVolume = settings.sfx;
		audio.setVolumes();
		save();
	} else if (!hub || hub.isHost) game.tune[id] = n;
});
function setupTouch() {
	const a = $("touch-action"),
		p = $("touch-pass");
	a.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		e.stopPropagation();
		controls.activity("touch");
		controls.touch.held = true;
		a.setPointerCapture(e.pointerId);
	});
	a.addEventListener("pointerup", (e) => {
		e.preventDefault();
		e.stopPropagation();
		controls.touch.held = false;
		controls.touch.shot = true;
		controls.touch.check = true;
	});
	a.addEventListener("pointercancel", () => {
		controls.touch.held = false;
	});
	p.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		e.stopPropagation();
		controls.touch.pass = true;
		controls.activity("touch");
	});
}
function reportHub() {
	if (!hub || !hub.isHost || hubReported || hubEnded) return;
	hubReported = true;
	const teams = [0, 1].sort((a, b) => game.score[b] - game.score[a]);
	let standings = teams
		.map((t) =>
			hub.players
				.filter((p) => p.id % 2 === t && !remoteDisconnect.has(p.id))
				.map((p) => p.id),
		)
		.filter((t) => t.length);
	if (game.score[0] === game.score[1]) standings = [standings.flat()];
	const scores = {},
		stats = {};
	for (const p of hub.players) {
		const t = p.id % 2;
		scores[p.id] = game.score[t];
		stats[p.id] = {
			Goals: game.score[t],
			Shots: game.stats.shots[t],
			Passes: game.stats.passes[t],
			Checks: game.stats.checks[t],
			Saves: game.stats.saves[t],
		};
	}
	AIHub.finish({ standings, scores, stats });
}
function setHubHandlers() {
	AIHub.on("start", () => {
		hubStarted = true;
		hubReported = false;
		screen = "hub";
		game.reset({
			players: hub.players.length,
			seats: hub.players.map((p, i) => ({
				id: p.id,
				team: p.id % 2,
				index: i < 2 ? (p.id % 2) * 2 : i === 2 ? 1 : 3,
			})),
		});
		$("hud").hidden = false;
		$("title-screen").hidden = true;
		hideModal();
	});
	AIHub.on("message", (data, from) => {
		if (hubEnded || !hub) return;
		if (
			hub.isHost &&
			data?.t === "input" &&
			hub.players.some((p) => p.id === from) &&
			!remoteDisconnect.has(from)
		) {
			const d = data.v || {},
				clamp = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
			if (!Number.isFinite(d.seq) || d.seq <= (remoteInputs[from]?.seq ?? -1))
				return;
			remoteInputs[from] = {
				seq: d.seq,
				x: clamp(d.x),
				z: clamp(d.z),
				shootHeld: !!d.shootHeld,
				boost: !!d.boost,
				c: Array.isArray(d.c)
					? d.c
							.slice(0, 4)
							.map((n) => Math.max(0, Math.min(1e9, Number(n) || 0)))
					: [0, 0, 0, 0],
				at: performance.now(),
			};
			if (Number.isFinite(d.aimX) && Number.isFinite(d.aimZ)) {
				remoteInputs[from].aimX = Math.max(-35, Math.min(35, d.aimX));
				remoteInputs[from].aimZ = Math.max(-20, Math.min(20, d.aimZ));
			}
		} else if (
			!hub.isHost &&
			data?.t === "world" &&
			from === hub.host &&
			data.s?.tick > lastSnapshot
		) {
			lastSnapshot = data.s.tick;
			game.applySnapshot(data.s);
		}
	});
	AIHub.on("time-up", () => {
		if (hub?.isHost && !hubEnded) {
			game.finish();
			reportHub();
		}
	});
	AIHub.on("leave", ({ id }) => {
		remoteDisconnect.add(id);
		game.seats = game.seats.filter((s) => s.id !== id);
		delete remoteInputs[id];
	});
	AIHub.on("end", () => {
		hubEnded = true;
		audio.silence();
		hideModal();
		$("banner").hidden = false;
		$("banner-title").textContent = "THAT’S THE HORN!";
		$("banner-sub").textContent = "THE HUB HAS THE FINAL WORD.";
	});
}
function networkInput(control) {
	for (const [i, key] of ["shoot", "pass", "check", "switch"].entries())
		if (control[key]) localCounters[i]++;
	return {
		x: control.x || 0,
		z: control.z || 0,
		boost: !!control.boost,
		shootHeld: !!control.shootHeld,
		aimX: control.aimX,
		aimZ: control.aimZ,
		c: [...localCounters],
	};
}
function consumeRemote() {
	const result = {};
	for (const [id, v] of Object.entries(remoteInputs)) {
		if (performance.now() - v.at > 650) continue;
		const old = remoteSeen[id] || [0, 0, 0, 0];
		result[id] = { ...v };
		["shoot", "pass", "check", "switch"].forEach(
			(key, i) => (result[id][key] = v.c[i] > old[i]),
		);
		remoteSeen[id] = [...v.c];
	}
	return result;
}
function updateHud() {
	$("score-blue").textContent = game.score[0];
	$("score-red").textContent = game.score[1];
	const sec = Math.max(0, Math.ceil(game.remaining));
	$("clock").textContent = game.training
		? "∞"
		: game.overtime
			? "SD"
			: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
	$("period").textContent = game.training
		? "TRAINING"
		: game.overtime
			? "NEXT GOAL WINS"
			: `PERIOD ${game.period} / 3`;
	const seat = game.seats.find((s) => s.id === (hub?.me ?? 0)),
		p = game.players[seat?.index ?? 0];
	$("energy").style.width = p.energy * 100 + "%";
	$("player-label").textContent =
		`${hub ? "YOU" : localPlayers > 1 ? "P1" : "YOU"} / ${TEAM_NAMES[seat?.team || 0]}`;
	$("player-label").parentElement.style.borderColor =
		seat?.team === 1 ? "var(--red)" : "var(--blue)";
	$("charge").hidden = p.charge <= 0.01 || game.puck.owner !== p.i;
	$("charge-fill").style.width = p.charge * 100 + "%";
	const touch =
		controls.last === "touch" && screen !== "attract" && !modal && !hubEnded;
	const nearRival = game.players.some(
		(q) =>
			!q.goalie && q.team !== p.team && Math.hypot(q.x - p.x, q.z - p.z) < 2.8,
	);
	$("touch-action").hidden = !touch || (game.puck.owner !== p.i && !nearRival);
	$("touch-pass").hidden = !touch || game.puck.owner !== p.i;
	$("touch-action").textContent = game.puck.owner === p.i ? "SHOOT" : "CHECK";
	$("touch-hint").hidden = !touch || game.elapsed > 12;
	$("training-card").hidden = !game.training;
	if (game.training) {
		const d = DRILLS[Math.min(game.drill, 5)];
		$("training-card").innerHTML =
			`<span class="caps yellow">OPEN PRACTICE / ${Math.min(game.drill + 1, 6)} OF 6</span><h3>${d[0]}</h3><p>${d[1]}</p><div class="training-progress">${DRILLS.map((_, i) => `<i class="${i < game.drill ? "done" : ""}"></i>`).join("")}</div>`;
	}
	let title = "",
		sub = "";
	if (game.phase === "faceoff") {
		title = game.overtime
			? "SUDDEN DEATH"
			: game.phaseTime > 0.65
				? "GET SET…"
				: "LET’S GO!";
		sub = game.training
			? "A LITTLE PRACTICE. A LOT OF TROUBLE."
			: game.overtime
				? "NEXT GOAL TAKES THE CUP"
				: `PERIOD ${game.period} · ATTACK ${innerWidth / innerHeight < 0.8 ? (seat?.team === 1 ? "UP" : "DOWN") : seat?.team === 1 ? "LEFT" : "RIGHT"}`;
	}
	if (game.phase === "goal") {
		title = "GOOOAL!";
		sub =
			TEAM_NAMES[
				game.score[0] === game.score[1]
					? game.puck.x > 0
						? 0
						: 1
					: (game.events.findLast?.((e) => e.type === "goal")?.team ??
						(game.puck.x > 0 ? 0 : 1))
			] + " LIGHT THE LAMP";
	}
	if (game.phase === "intermission") {
		title = "THAT’S THE HORN!";
		sub = `PERIOD ${game.period} IN THE BOOKS. DON’T GO SOFT.`;
	}
	if (hub && !hubStarted) {
		title = "RINK READY";
		sub = "WAITING FOR THE HUB TO DROP THE PUCK";
	}
	if (hubStarted && AIHub.time() < 0 && !hubEnded) {
		title = String(Math.max(1, Math.ceil(-AIHub.time() / 1000)));
		sub = "ON THE HUB’S WHISTLE";
	}
	if (hubEnded) {
		title = "THAT’S THE HORN!";
		sub = "THE HUB HAS THE FINAL WORD.";
	}
	$("banner").hidden = !title;
	$("banner-title").textContent = title;
	$("banner-sub").textContent = sub;
	if (toastUntil && performance.now() > toastUntil) {
		$("toast").hidden = true;
		toastUntil = 0;
	}
}
function processEvents() {
	const es = game.events.splice(0);
	for (const e of es) {
		arena?.handleEvent(e);
		if (screen !== "title") audio.event(e);
		if (hub?.isHost) netEvents.push(e);
		if (e.type === "goal" || e.type === "check") {
			if (settings.vibration)
				for (const p of controls.pads || [])
					p.vibrationActuator
						?.playEffect("dual-rumble", {
							duration: e.type === "goal" ? 400 : 180,
							strongMagnitude: 0.55,
							weakMagnitude: 0.4,
						})
						.catch(() => {});
		}
		if (e.type === "drill" && game.drill < 6) toast("NICE. NOW TRY THIS.", 1.8);
		if (e.type === "end" || e.type === "training-complete") {
			matchEndedAt = performance.now();
			if (hub?.isHost) reportHub();
			else if (!hub && screen !== "attract") openModal("result");
		}
	}
	if (netEvents.length > 40) netEvents = netEvents.slice(-40);
}
function attractDirector() {
	const stage = Math.floor(game.elapsed / 8);
	if (stage === attractStage) return;
	attractStage = stage;
	if (game.phase !== "play") return;
	switch (stage % 5) {
		case 1:
			game.givePuck(0);
			game.pass(game.players[0]);
			break;
		case 2: {
			const p = game.players[0],
				q = game.players[2];
			q.x = p.x + 1.5;
			q.z = p.z;
			q.body.setTranslation({ x: q.x, y: 0.65, z: q.z }, true);
			game.check(p);
			break;
		}
		case 3: {
			const p = game.players[0];
			p.x = 15;
			p.z = -4;
			p.body.setTranslation({ x: 15, y: 0.65, z: -4 }, true);
			game.givePuck(0);
			p.charge = 1;
			game.players[5].body.setTranslation({ x: 22.7, y: 0.65, z: -2.5 }, true);
			game.shoot(p, { aimX: 25, aimZ: 2 });
			break;
		}
	}
}
function frame(now) {
	requestAnimationFrame(frame);
	const dt = Math.min(0.1, (now - lastTime) / 1000);
	lastTime = now;
	if (!game || screen === "loading") return;
	const sampled = controls.sample(hub ? 1 : localPlayers, (x, y) =>
		arena.aim(x, y),
	);
	if (hub && modal)
		for (const key of Object.keys(sampled)) sampled[key] = { x: 0, z: 0 };
	if (innerWidth / innerHeight < 0.8)
		for (const v of Object.values(sampled)) {
			const { x, z, aimStickX, aimStickZ } = v;
			v.x = z;
			v.z = -x;
			if (aimStickX !== undefined) {
				v.aimStickX = aimStickZ;
				v.aimStickZ = -aimStickX;
			}
		}
	let local = sampled[0];
	if (local?.aimStickX || local?.aimStickZ) {
		const seat = game.seats.find((s) => s.id === (hub?.me ?? 0)),
			p = game.players[seat?.index || 0];
		local.aimX = p.x + local.aimStickX * 20;
		local.aimZ = p.z + local.aimStickZ * 20;
	}
	if (screen === "title") {
		const idle = (now - lastInput) / 1000;
		$("idle-hint").textContent = `DEMO IN ${Math.max(0, Math.ceil(10 - idle))}`;
		if (idle >= 10) startGame({ attract: true });
	}
	if (hub && !hubEnded && !hub.server) {
		networkInput(local || {});
	}
	const active =
		screen === "attract" ||
		((screen === "play" || screen === "training") && !modal) ||
		(screen === "hub" && hubStarted && !hubEnded && AIHub.time() >= 0);
	if (active && (!hub || hub.isHost)) {
		for (const [id, v] of Object.entries(sampled)) {
			const old = queuedInputs[id] || {};
			queuedInputs[id] = { ...v };
			for (const key of ["shoot", "pass", "check", "switch"])
				queuedInputs[id][key] = !!v[key] || !!old[key];
		}
		accumulator += dt;
		let first = true;
		while (accumulator >= 1 / 60) {
			let ins = hub ? consumeRemote() : queuedInputs;
			if (hub && !hub.server)
				ins[hub.me] = first
					? queuedInputs[0]
					: {
							...local,
							shoot: false,
							pass: false,
							check: false,
							switch: false,
						};
			else if (!first)
				ins = Object.fromEntries(
					Object.entries(ins).map(([id, v]) => [
						id,
						{ ...v, shoot: false, pass: false, check: false, switch: false },
					]),
				);
			game.step(ins);
			accumulator -= 1 / 60;
			first = false;
		}
		if (!first)
			for (const v of Object.values(queuedInputs))
				for (const key of ["shoot", "pass", "check", "switch"]) v[key] = false;
		if (screen === "attract") {
			attractDirector();
			if (
				game.phase === "gameover" &&
				matchEndedAt &&
				now - matchEndedAt > 3500
			)
				startGame({ attract: true });
		}
	} else {
		accumulator = 0;
		queuedInputs = {};
	}
	processEvents();
	audio.update();
	if (hub && !hubEnded) {
		netTimer += dt;
		if (netTimer >= 0.067) {
			netTimer = 0;
			if (hub.isHost) {
				const snap = game.snapshot();
				snap.events = netEvents.splice(0);
				AIHub.send({ t: "world", s: snap }, { reliable: false });
			} else
				AIHub.send(
					{
						t: "input",
						v: {
							seq: ++localInputSeq,
							x: local?.x || 0,
							z: local?.z || 0,
							boost: !!local?.boost,
							shootHeld: !!local?.shootHeld,
							aimX: local?.aimX,
							aimZ: local?.aimZ,
							c: [...localCounters],
						},
					},
					{ to: hub.host, reliable: false },
				);
		}
	}
	if (screen !== "title") updateHud();
	if (arena?.renderer && !hub?.server)
		arena.draw(game, dt, {
			title: screen === "title",
			attract: screen === "attract",
			localSeat: hub?.me || 0,
		});
}
async function boot() {
	try {
		const connecting = AIHub.connect({ mode: "shared-world", seats: [1, 4] });
		await initPhysics();
		game = new Hockey();
		controls = new Controls(activity, menuCommand);
		setupTouch();
		if (navigator.maxTouchPoints > 0 && matchMedia("(pointer:coarse)").matches)
			controls.last = "touch";
		hub = await connecting;
		arena = new Arena($("game"));
		if (!hub?.server) await arena.init();
		Object.assign(audio, {
			musicVolume: settings.music,
			sfxVolume: settings.sfx,
		});
		arena.effects = settings.effects;
		addEventListener("resize", () => arena.resize());
		document.addEventListener("pointerdown", () => audio.unlock(), {
			once: true,
		});
		document.addEventListener("keydown", () => audio.unlock(), { once: true });
		$("boot").hidden = true;
		if (hub) {
			screen = "hub";
			$("hud").hidden = false;
			setHubHandlers();
			AIHub.ready();
		} else showTitle();
		updatePrompts();
		window.__PUCK__ = {
			ready: true,
			get screen() {
				return screen;
			},
			get modal() {
				return modal;
			},
			get backend() {
				return arena.backend;
			},
			game,
			arena,
			audio,
			controls,
			start: startGame,
			title: showTitle,
			open: openModal,
			action: handleAction,
			step(frames, inputs = {}) {
				for (let i = 0; i < frames; i++) game.step(inputs);
				processEvents();
				updateHud();
			},
			snapshot: () => game.snapshot(),
			get network() {
				return {
					hub,
					hubStarted,
					hubEnded,
					hubReported,
					lastSnapshot,
					remoteInputs,
				};
			},
		};
		lastTime = performance.now();
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		$("boot-message").textContent =
			`The rink couldn’t open: ${error.message}. This game needs a WebGPU browser such as a current Chrome or Edge on a secure page (file:// or localhost).`;
		$("boot").querySelector(".spinner").hidden = true;
		if (AIHub.active) AIHub.fail(error.message);
		window.__PUCK_ERROR__ = String(error);
	}
}
boot();
