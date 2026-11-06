import { AudioSystem } from "./audio.js";
import { createOnline } from "./hub.js";
import { DEFAULTS, MAPS, Simulation } from "./sim.js";
import { GameView } from "./view.js";

// CREDITS_DATA
const $ = (id) => document.getElementById(id);
const app = {
	ready: false,
	screen: "loading",
	mode: "solo",
	round: 0,
	lastInput: performance.now(),
	inputMode: "keyboard",
	previous: "title",
	settings: {
		music: 0.1,
		sfx: 0.7,
		glyph: "ps",
		assist: true,
		shake: true,
		arena: 0,
	},
	completed: [],
	toastUntil: 0,
	announceUntil: 0,
	attractElapsed: 0,
	attractRound: 0,
	remote: null,
	eventId: 0,
	events: [],
	lastRemoteEvent: 0,
	finishPending: false,
	hubEnded: false,
	keys: new Set(),
	pads: [],
	padPrev: [],
	padSuppress: new Set(),
	padRepeat: 0,
	mouse: {
		x: innerWidth * 0.6,
		y: innerHeight * 0.5,
		down: false,
		active: false,
	},
	touches: new Map(),
	touchDash: false,
	debugInputs: [null, null],
	queued: [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	],
};
const audio = new AudioSystem();
let sim, view;
let accumulator = 0;
let lastFrame = 0;
let menuFocus = null;
const online = createOnline({
	onStatus(text) {
		$("online-status").textContent = text;
	},
	onInput(input, seat) {
		if (sim && seat >= 0) {
			sim.input(seat, input);
			app.remoteInputAt = performance.now();
		}
	},
	onSnapshot(state) {
		if (!state?.tanks || state.tanks.length !== 2) return;
		if (
			app.remote &&
			state.round === app.remote.round &&
			state.elapsed < app.remote.elapsed
		)
			return;
		if (sim.round !== state.round) sim.reset(state.round, "online");
		state.obstacles?.forEach((o, i) => {
			if (sim.obstacles[i]) sim.obstacles[i].hp = o.hp;
		});
		app.remote = state;
		if (state.round !== app.round) {
			app.round = state.round;
			view?.build(state.round);
		}
		for (const ev of state.events || []) {
			if (ev.id > app.lastRemoteEvent) {
				app.lastRemoteEvent = ev.id;
				handleEffect(ev.type, ev.data, false);
			}
		}
		if (state.ended && app.screen === "play")
			roundover({ winner: state.winner, scores: state.scores }, false);
	},
	onPeer(info) {
		if (!info.joined && sim && online.isHost && info.seat >= 0)
			sim.input(info.seat, {});
		if (!info.joined && app.mode === "online" && !app.hubEnded)
			toast(info.name + " left the rumble.");
	},
	onStart(info) {
		if (!app.ready) return;
		app.hubEnded = false;
		app.lastRemoteEvent = 0;
		app.remote = null;
		startGame("online", app.settings.arena);
		$("online-status").textContent = "Connected. Let the rumble begin!";
	},
	onTimeUp() {
		if (online.isHost && sim) {
			sim.ended = true;
			sim.winner = sim.scores[0] >= sim.scores[1] ? 0 : 1;
			online.finish(sim.scores);
		}
	},
	onEnd(info) {
		if (!sim) return;
		app.hubEnded = online.inHub;
		app.finishPending = false;
		if (info.scores && Array.isArray(info.scores)) {
			sim.scores = [...info.scores];
			if (app.remote) app.remote.scores = [...info.scores];
		}
		if (online.inHub) {
			audio.stopMusic();
			audio.setMuted(true);
		}
		if (app.mode === "online" && app.screen !== "roundover") {
			const s = app.remote || sim;
			roundover(
				{ winner: s.scores[0] >= s.scores[1] ? 0 : 1, scores: s.scores },
				false,
			);
			if (info.reason !== "finished" && !online.inHub) {
				$("roundover-title").textContent = "The radio went quiet.";
				$("roundover-copy").textContent =
					"Your opponent disconnected. Return to title to create a fresh invitation.";
			}
		}
		applyHubUI();
	},
});
function applyHubUI() {
	if (!online.inHub) return;
	document
		.querySelectorAll(
			'[data-action="title"],[data-action="solo"],[data-action="local"],[data-action="online"],[data-action="next-round"]',
		)
		.forEach((b) => {
			b.classList.add("hidden");
		});
	$("dev-button").disabled = true;
	$("pause-copy").textContent = "Online play keeps moving during a pit stop.";
}
function gesture(mode = "keyboard") {
	app.lastInput = performance.now();
	if (app.inputMode !== mode) {
		app.inputMode = mode;
		document.body.classList.toggle("touch", mode === "touch");
		updatePrompts();
		$("dash-touch").style.display =
			app.screen === "play" && mode === "touch" ? "block" : "none";
	}
	if (!app.hubEnded) {
		audio.unlock().then((ok) => {
			if (ok && !audio.musicPlaying) audio.startMusic();
		});
	}
}
function activity(mode = "keyboard") {
	if (app.screen === "attract") {
		exitAttract();
		gesture(mode);
		return true;
	}
	gesture(mode);
	return false;
}
function toast(text, time = 2.5) {
	$("toast").textContent = text;
	$("toast").classList.add("show");
	app.toastUntil = performance.now() + time * 1000;
}
function announce(text, time = 1.5) {
	$("announce").textContent = text;
	$("announce").classList.add("show");
	app.announceUntil = performance.now() + time * 1000;
}
function focusables() {
	const panel = document.querySelector(".screen.active");
	return panel
		? [
				...panel.querySelectorAll(
					'button,input,select,textarea,[tabindex="0"]',
				),
			].filter(
				(b) => !b.disabled && !b.closest(".hidden") && b.offsetParent !== null,
			)
		: [];
}
function setFocus(b, real = true) {
	document.querySelectorAll(".focused").forEach((x) => {
		x.classList.remove("focused");
	});
	menuFocus = b;
	if (b) {
		b.classList.add("focused");
		if (real) b.focus({ preventScroll: true });
	}
}
function refreshFocus() {
	const f = focusables();
	setFocus(f[0], false);
}
function show(screen, remember = true) {
	if (remember && ["settings", "guide", "about", "dev"].includes(screen))
		app.previous = app.screen;
	app.screen = screen;
	for (const e of document.querySelectorAll(".screen"))
		e.classList.toggle(
			"active",
			e.id === (screen === "paused" ? "pause" : screen) + "-screen",
		);
	const playing =
		screen === "play" ||
		screen === "attract" ||
		(app.mode === "online" &&
			["paused", "settings", "guide", "dev"].includes(screen));
	$("hud").style.display = playing ? "block" : "none";
	$("pause-button").style.display = screen === "attract" ? "none" : "block";
	$("attract-bar").style.display = screen === "attract" ? "block" : "none";
	$("dash-touch").style.display =
		screen === "play" && app.inputMode === "touch" ? "block" : "none";
	$("announce").classList.remove("show");
	app.mouse.down = false;
	app.keys.clear();
	app.touches.clear();
	$("touch-ring").style.display = "none";
	app.touchDash = false;
	app.queued = [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	];
	refreshFocus();
	if (screen === "about") renderCredits("sourceInformation");
	if (screen === "dev") refreshDev();
	applyHubUI();
}
function goBack() {
	if (app.screen === "paused") {
		show("play", false);
		return;
	}
	if (["settings", "guide", "about", "dev"].includes(app.screen)) {
		show(app.previous === "settings" ? "paused" : app.previous, false);
		return;
	}
	if (app.screen === "online") {
		online.leave();
		show("title", false);
		app.lastInput = performance.now();
		return;
	}
	if (app.screen === "play") {
		show("paused", false);
		$("pause-copy").textContent =
			app.mode === "online"
				? "Online play keeps moving during a pit stop."
				: "Your tank can catch its breath.";
		return;
	}
}
function title() {
	if (online.inHub) return;
	app.mode = "solo";
	online.leave();
	app.remote = null;
	app.finishPending = false;
	app.debugInputs = [null, null];
	sim.reset(0, "solo");
	view.build(0);
	app.round = 0;
	app.lastInput = performance.now();
	audio.setMuted(false);
	show("title", false);
}
function startGame(mode = "solo", round = 0) {
	app.mode = mode;
	app.round = round;
	$("dev-button").disabled = mode === "online";
	app.remote = null;
	app.debugInputs = [null, null];
	app.finishPending = false;
	app.hubEnded = false;
	app.events = [];
	if (mode === "solo" && round === 0) app.completed = [];
	sim.reset(round, mode, mode === "solo" && round > 0);
	view.build(round);
	show("play", false);
	audio.setMuted(false);
	audio.sfx("start");
	audio.voice("start");
	announce(mode === "local" ? "A little friendly fire." : MAPS[round].name, 2);
	if (mode === "local")
		toast("TEAL: WASD + mouse  ·  CORAL: arrows + IJKL / Enter / Shift", 6);
	if (mode === "solo") toast(MAPS[round].rule, 4);
	if (mode === "online") applyHubUI();
}
function roundover(data, finish = true) {
	if (app.screen === "attract") return;
	const won = data.winner === 0;
	show("roundover", false);
	$("roundover-kicker").textContent =
		app.mode === "solo"
			? `CIRCUIT / BOUT ${app.round + 1} OF 3`
			: "DUEL COMPLETE";
	$("roundover-title").textContent =
		app.mode === "solo"
			? won
				? "Well bopped."
				: "A minor dent in the plan."
			: data.winner === 0
				? "Teal takes the cake."
				: "Coral makes a comeback.";
	$("roundover-copy").textContent =
		app.mode === "solo"
			? won
				? app.round < 2
					? "One down. Keep the good angles coming."
					: "All three bouts in the bag. That’s some fine tanking."
				: "The rival found your angle. Retry this bout and give them a little bop back."
			: "A good clean rumble. Mostly.";
	$("roundover-score").innerHTML =
		`${Number(data.scores[0])} : <span>${Number(data.scores[1])}</span>`;
	const next = $("next-round");
	next.classList.remove("hidden");
	next.textContent =
		app.mode === "solo"
			? won
				? app.round < 2
					? "Next arena ↗"
					: "Collect your trophy ↗"
				: "Try this bout again ↗"
			: "Rematch ↗";
	if (app.mode === "online") {
		next.classList.add("hidden");
		$("roundover-copy").textContent = online.inHub
			? "Round complete. AI Hub has the result."
			: "Duel complete. Return to title for a fresh connection.";
		if (finish && online.isHost) app.finishPending = true;
	}
	if (app.mode === "solo" && won && !app.completed.includes(app.round))
		app.completed.push(app.round);
	audio.sfx(won ? "win" : "lose");
	audio.voice(won ? "win" : "lose");
	refreshFocus();
}
function nextRound() {
	if (app.mode === "solo") {
		if (sim.winner === 0) {
			if (app.round === 2) {
				show("results", false);
				$("results-stats").textContent =
					`${sim.metrics.shots} shells sent · ${sim.metrics.bounces} good bounces · ${sim.metrics.bankshots} bankshot wrecks`;
				return;
			}
			startGame("solo", app.round + 1);
		} else startGame("solo", app.round);
	} else if (app.mode === "local") startGame("local", app.round);
}
function enterAttract() {
	if (online.inHub || app.screen !== "title") return;
	app.mode = "attract";
	app.attractElapsed = 0;
	app.attractRound = 0;
	app.round = 0;
	sim.reset(0, "attract");
	view.build(0);
	show("attract", false);
}
function exitAttract() {
	app.mode = "solo";
	sim.reset(0, "solo");
	app.round = 0;
	view.build(0);
	app.lastInput = performance.now();
	show("title", false);
}
function handleEffect(type, data, replicate = true) {
	if (!view) return;
	if (replicate && app.mode === "online" && online.isHost) {
		app.events.push({ id: ++app.eventId, type, data });
		if (app.events.length > 18) app.events.shift();
	}
	if (type === "roundover") {
		roundover(data);
		return;
	}
	view.effect(type, data);
	audio.sfx(
		type === "barrel"
			? "explode"
			: type === "cover" || type === "chip"
				? "hit"
				: type,
		0.7,
	);
	if (type === "hit" && data.bank) announce("A good angle!", 0.8);
	if (type === "explode")
		announce(
			data.bank
				? "Bank you very much!"
				: data.tank === 0
					? "A minor setback."
					: "BOP!",
			1.2,
		);
	if (
		type === "pickup" &&
		data.tank === (app.mode === "online" ? online.seat : 0)
	) {
		toast(
			data.type === "repair"
				? "Armour patched. Back to it."
				: "DOUBLE TIME · seven seconds of rapid fire",
			2,
		);
		audio.voice("pickup");
	}
	if (type === "sudden") {
		announce("Hot zone! Keep moving.", 2);
		audio.voice("start");
	}
}
const settingsDefaults = {
	music: 0.1,
	sfx: 0.7,
	glyph: "ps",
	assist: true,
	shake: true,
	arena: 0,
};
function loadSettings() {
	try {
		const v = JSON.parse(localStorage.getItem("combop-settings") || "null");
		if (v) {
			app.settings = { ...settingsDefaults, ...v };
			app.settings.music = Math.max(0, Math.min(1, +app.settings.music || 0));
			app.settings.sfx = Math.max(0, Math.min(1, +app.settings.sfx || 0));
		}
	} catch {}
	syncSettings();
}
function syncSettings() {
	$("music-volume").value = app.settings.music * 100;
	$("music-value").textContent = Math.round(app.settings.music * 100) + "%";
	$("sfx-volume").value = app.settings.sfx * 100;
	$("sfx-value").textContent = Math.round(app.settings.sfx * 100) + "%";
	$("glyph-style").value = app.settings.glyph;
	$("assist").value = app.settings.assist ? "on" : "off";
	$("shake").value = app.settings.shake ? "on" : "off";
	$("arena-select").value = app.settings.arena;
	audio.setMusic(app.settings.music);
	audio.setSfx(app.settings.sfx);
	updatePrompts();
}
function saveSettings() {
	try {
		localStorage.setItem("combop-settings", JSON.stringify(app.settings));
	} catch {}
	syncSettings();
}
function updatePrompts() {
	if ($("guide-pad-copy"))
		$("guide-pad-copy").innerHTML =
			app.settings.glyph === "xbox"
				? "<strong>Controller:</strong> Left stick move · Right stick aim · RT fire · B / LT burst"
				: "<strong>Controller:</strong> Left stick move · Right stick aim · R2 fire · ○ / L2 burst";
	const pad = app.inputMode === "gamepad",
		xbox = app.settings.glyph === "xbox";
	const values = pad
		? { move: "L", aim: "R", fire: xbox ? "RT" : "R2", dash: xbox ? "B" : "○" }
		: { move: "WASD", aim: "Mouse", fire: "LMB", dash: "Space" };
	for (const el of document.querySelectorAll(".prompt")) {
		el.textContent = values[el.dataset.prompt];
		el.className = "prompt glyph" + (pad ? " pad" : "");
	}
	$("title-prompt").textContent =
		app.inputMode === "touch"
			? "Drag to drive · Aim & fire assisted"
			: pad
				? `Left stick to move · ${xbox ? "A" : "×"} to select`
				: "WASD + mouse · Controller ready";
}
const devSpecs = [
	["speed", "Tank speed", 2, 10, 0.1],
	["shellSpeed", "Shell speed", 8, 28, 0.5],
	["reload", "Shell refill time", 0.2, 2, 0.05],
	["ai", "Rival skill", 0.3, 1.4, 0.05],
	["ricochets", "Wall bounces", 0, 5, 1],
	["damage", "Shell damage", 1, 3, 1],
];
function buildDev() {
	for (const [key, label, min, max, step] of devSpecs) {
		const row = document.createElement("div");
		row.className = "setting";
		row.innerHTML = `<label for="dev-${key}">${label}</label><div class="range-wrap"><input id="dev-${key}" data-dev="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${DEFAULTS[key]}"><output id="dev-value-${key}">${DEFAULTS[key]}</output></div>`;
		$("dev-sliders").append(row);
		row.querySelector("input").addEventListener("input", (e) => {
			sim.balance[key] = Number(e.target.value);
			$("dev-value-" + key).textContent = Number(e.target.value)
				.toFixed(key === "reload" || key === "ai" ? 2 : 1)
				.replace(/\.0$/, "");
		});
	}
}
function refreshDev() {
	for (const [key] of devSpecs) {
		$("dev-" + key).value = sim.balance[key];
		$("dev-value-" + key).textContent = sim.balance[key];
	}
	$("dev-god").textContent = "Invulnerable: " + (sim.god ? "on" : "off");
}
const feedbackQuestions = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"Most helpful test",
		"Least helpful test",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important thing built yourself",
		"Hardest part about using the engine",
		"Engine changes",
		"One thing you would change",
	],
	promptFeedback: [
		"What did you like most about this prompt?",
		"What was confusing?",
		"Hardest thing to do",
		"What would you change?",
	],
};
function renderCredits(tab) {
	const root = $("credits-body");
	root.replaceChildren();
	document.querySelectorAll("[data-credit]").forEach((b) => {
		b.classList.toggle("primary", b.dataset.credit === tab);
	});
	if (tab === "sourceInformation") {
		const dl = document.createElement("dl");
		dl.className = "credits-grid";
		for (const [key, value] of Object.entries(CREDITS.sourceInformation)) {
			const dt = document.createElement("dt");
			dt.textContent = key
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (s) => s.toUpperCase());
			const dd = document.createElement("dd");
			dd.textContent = value;
			dl.append(dt, dd);
		}
		root.append(dl);
	} else {
		CREDITS[tab].forEach((value, i) => {
			const section = document.createElement("div");
			section.className = "feedback-item";
			const h = document.createElement("strong");
			h.textContent = feedbackQuestions[tab][i] || "";
			const p = document.createElement("p");
			p.textContent = value;
			section.append(h, p);
			root.append(section);
		});
	}
	root.scrollTop = 0;
}
async function action(name) {
	audio.sfx("click");
	switch (name) {
		case "solo":
			startGame("solo", 0);
			break;
		case "local":
			startGame("local", app.settings.arena);
			break;
		case "online":
			show("online");
			break;
		case "pause":
			if (app.screen === "play") goBack();
			break;
		case "resume":
			show("play", false);
			break;
		case "back":
			goBack();
			break;
		case "title":
			title();
			break;
		case "settings":
		case "guide":
		case "about":
		case "dev":
			show(name);
			break;
		case "next-round":
			nextRound();
			break;
		case "reset-settings":
			app.settings = { ...settingsDefaults };
			saveSettings();
			toast("Factory-fresh settings.");
			break;
		case "dev-reset":
			sim.balance = { ...DEFAULTS };
			sim.god = false;
			refreshDev();
			break;
		case "dev-god":
			sim.god = !sim.god;
			refreshDev();
			break;
		case "dev-next":
			show("play", false);
			sim.scores[0] = 2;
			sim.award(0);
			break;
		case "dev-repair":
			for (const t of sim.tanks) {
				t.hp = 3;
				t.ammo = 3;
				if (t.dead > 0) sim.respawn(t);
			}
			toast("Both tanks repaired.");
			break;
		case "dev-time":
			sim.time = 0;
			toast("Hot zone begins when you resume.");
			break;
		case "host-online":
			try {
				$("host-online").disabled = true;
				$("online-code").value = await online.host();
				$("code-label").textContent =
					"Your invitation — copy and send to your friend";
				$("code-help").textContent =
					"After your friend joins, replace this invitation with their return code and choose Accept return code.";
			} catch (e) {
				toast(e.message, 5);
			} finally {
				$("host-online").disabled = false;
			}
			break;
		case "join-online":
			try {
				const invite = $("online-code").value;
				$("join-online").disabled = true;
				const answer = await online.join(invite);
				$("online-code").value = answer;
				$("code-label").textContent =
					"Your return code — send it back to the host";
				$("code-help").textContent =
					"Keep this screen open. The duel starts when the host accepts your return code.";
			} catch (e) {
				toast(e.message, 5);
			} finally {
				$("join-online").disabled = false;
			}
			break;
		case "accept-code":
			try {
				await online.accept($("online-code").value);
			} catch (e) {
				toast(e.message, 5);
			}
			break;
		case "copy-code":
			try {
				await navigator.clipboard.writeText($("online-code").value);
				toast("Code copied.");
			} catch {
				$("online-code").select();
				toast("Select and copy the code from the box.");
			}
			break;
	}
}
function wireUI() {
	document.querySelectorAll("[data-action]").forEach((b) => {
		b.addEventListener("click", () => action(b.dataset.action));
		b.addEventListener("pointerenter", () => {
			if (app.inputMode !== "touch") setFocus(b, false);
		});
	});
	document.querySelectorAll("[data-credit]").forEach((b) => {
		b.addEventListener("click", () => renderCredits(b.dataset.credit));
		b.addEventListener("pointerenter", () => setFocus(b, false));
	});
	document.querySelectorAll("input,select,textarea").forEach((b) => {
		b.addEventListener("pointerenter", () => setFocus(b, false));
	});
	for (const [id, key, convert] of [
		["music-volume", "music", (v) => Number(v) / 100],
		["sfx-volume", "sfx", (v) => Number(v) / 100],
		["glyph-style", "glyph", (v) => v],
		["assist", "assist", (v) => v === "on"],
		["shake", "shake", (v) => v === "on"],
		["arena-select", "arena", (v) => Number(v)],
	]) {
		$(id).addEventListener("input", (e) => {
			app.settings[key] = convert(e.target.value);
			saveSettings();
		});
	}
}
function scrollMenu(amount) {
	const e =
		app.screen === "about"
			? $("credits-body")
			: document.querySelector(".screen.active .panel");
	if (e) e.scrollTop += amount;
}
function moveMenu(dir) {
	const list = focusables();
	if (!list.length) return;
	let i = list.indexOf(menuFocus);
	i = (i + dir + list.length) % list.length;
	setFocus(list[i]);
	audio.sfx("click", 0.5);
	list[i].scrollIntoView({ block: "nearest" });
}
function adjustMenu(dir) {
	const e = menuFocus;
	if (e?.tagName === "INPUT" && e.type === "range") {
		e.value = Number(e.value) + Number(e.step || 1) * dir;
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (e?.tagName === "SELECT") {
		e.selectedIndex =
			(e.selectedIndex + dir + e.options.length) % e.options.length;
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else moveMenu(dir);
}
function activateMenu() {
	if (menuFocus?.tagName === "BUTTON") menuFocus.click();
	else if (menuFocus?.tagName === "SELECT") adjustMenu(1);
}
function isEditing(e) {
	return ["TEXTAREA", "INPUT", "SELECT"].includes(e?.tagName);
}
window.addEventListener("keydown", (e) => {
	if (isEditing(e.target)) {
		app.lastInput = performance.now();
		if (e.code === "Escape") {
			e.target.blur();
			goBack();
		}
		return;
	}
	if (activity("keyboard")) {
		e.preventDefault();
		return;
	}
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Tab",
			"Enter",
		].includes(e.code)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (e.code === "Escape") {
		goBack();
		return;
	}
	if (app.screen !== "play" && (e.code === "PageDown" || e.code === "PageUp")) {
		e.preventDefault();
		scrollMenu(e.code === "PageDown" ? 220 : -220);
		return;
	}
	if (app.screen === "play") {
		app.keys.add(e.code);
		if (e.code === "Space") app.queued[0].dash = true;
		if (
			app.mode === "local" &&
			(e.code === "ShiftLeft" || e.code === "ShiftRight")
		)
			app.queued[1].dash = true;
		if (
			app.mode === "local" &&
			(e.code === "Enter" || e.code === "NumpadEnter")
		)
			app.queued[1].fire = true;
		return;
	}
	if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
		moveMenu(e.shiftKey ? -1 : 1);
	if (e.code === "ArrowUp" || e.code === "KeyW") moveMenu(-1);
	if (e.code === "ArrowLeft" || e.code === "KeyA") adjustMenu(-1);
	if (e.code === "ArrowRight" || e.code === "KeyD") adjustMenu(1);
	if (e.code === "Enter" || e.code === "Space") activateMenu();
});
window.addEventListener("keyup", (e) => {
	app.keys.delete(e.code);
});
window.addEventListener("blur", () => {
	app.keys.clear();
	app.mouse.down = false;
	app.touches.clear();
	app.touchDash = false;
	app.queued = [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	];
	if (app.mode === "online") {
		if (online.isHost && online.seat >= 0) sim?.input(online.seat, {});
		else {
			online.sendInput({});
			setTimeout(() => online.sendInput({}), 65);
		}
	}
	if (app.ready && app.screen === "play" && app.mode !== "online")
		show("paused", false);
});
window.addEventListener(
	"pointerdown",
	(e) => {
		if (app.screen === "attract") {
			e.preventDefault();
			e.stopImmediatePropagation();
			exitAttract();
			gesture(e.pointerType === "touch" ? "touch" : "keyboard");
			return;
		}
		gesture(e.pointerType === "touch" ? "touch" : "keyboard");
	},
	true,
);
window.addEventListener(
	"pointermove",
	(e) => {
		if (e.pointerType === "mouse") {
			if (app.screen === "attract") {
				exitAttract();
				gesture("keyboard");
				return;
			}
			if (e.movementX || e.movementY) gesture("keyboard");
			app.mouse.x = e.clientX;
			app.mouse.y = e.clientY;
			app.mouse.active = true;
		} else if (app.touches.has(e.pointerId)) {
			const t = app.touches.get(e.pointerId);
			t.x = e.clientX;
			t.y = e.clientY;
			gesture("touch");
		}
	},
	{ passive: true },
);
$("world").style.touchAction = "none";
$("world").addEventListener("contextmenu", (e) => e.preventDefault());
$("world").addEventListener("pointerdown", (e) => {
	if (app.screen !== "play") return;
	if (e.pointerType === "touch") {
		app.touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			sx: e.clientX,
			sy: e.clientY,
			side: e.clientX < innerWidth * 0.5 ? "left" : "right",
		});
		$("world").setPointerCapture(e.pointerId);
		if (e.clientX < innerWidth * 0.5) {
			$("touch-ring").style.cssText =
				`display:block;left:${e.clientX - 55}px;top:${e.clientY - 55}px`;
		}
	} else if (e.button === 0) {
		app.mouse.down = true;
		app.queued[0].fire = true;
	}
});
window.addEventListener("pointerup", (e) => {
	app.mouse.down = false;
	if (app.touches.has(e.pointerId)) {
		const t = app.touches.get(e.pointerId);
		if (t.side === "left") $("touch-ring").style.display = "none";
		app.touches.delete(e.pointerId);
	}
	if (e.target === $("dash-touch")) app.touchDash = false;
});
window.addEventListener("pointercancel", (e) => {
	app.mouse.down = false;
	app.touches.delete(e.pointerId);
	app.touchDash = false;
	$("touch-ring").style.display = "none";
});
$("dash-touch").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	gesture("touch");
	app.touchDash = true;
	app.queued[0].dash = true;
});
function getPads(now) {
	const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
	app.pads = pads;
	let menuUsed = false;
	for (let i = 0; i < pads.length; i++) {
		const p = pads[i],
			prev = app.padPrev[p.index] || { buttons: [], axes: [] };
		const pressed = (n) =>
			!!p.buttons[n]?.pressed || p.buttons[n]?.value > 0.25;
		const edge = (n) => pressed(n) && !prev.buttons[n];
		if (!pressed(1)) app.padSuppress.delete(p.index);
		const meaningful =
			p.axes.some((a) => Math.abs(a) > 0.25) ||
			p.buttons.some((b) => b.pressed || b.value > 0.25);
		if (meaningful) {
			if (app.screen !== "play" && Math.abs(p.axes[3] || 0) > 0.2)
				scrollMenu(p.axes[3] * 22);
			if (activity("gamepad")) {
				app.padPrev[p.index] = {
					buttons: p.buttons.map((b) => b.pressed || b.value > 0.25),
					axes: [...p.axes],
				};
				return;
			}
			if (app.screen === "play") {
				const seat = app.mode === "online" ? 0 : i;
				if (seat < 2) {
					if (edge(7)) app.queued[seat].fire = true;
					if (edge(1) || edge(6)) app.queued[seat].dash = true;
				}
			}
			if (edge(9) && !pressed(8)) {
				if (app.screen === "play" || app.screen === "paused") goBack();
				menuUsed = true;
			}
			if (app.screen !== "play" && app.screen !== "attract") {
				if (edge(0)) {
					activateMenu();
					app.padRepeat = now + 200;
					menuUsed = true;
				} else if (edge(1)) {
					app.padSuppress.add(p.index);
					goBack();
					app.padRepeat = now + 200;
					menuUsed = true;
				} else if (now > app.padRepeat && (pressed(12) || p.axes[1] < -0.5)) {
					moveMenu(-1);
					app.padRepeat = now + 220;
				} else if (now > app.padRepeat && (pressed(13) || p.axes[1] > 0.5)) {
					moveMenu(1);
					app.padRepeat = now + 220;
				} else if (now > app.padRepeat && (pressed(14) || p.axes[0] < -0.5)) {
					adjustMenu(-1);
					app.padRepeat = now + 180;
				} else if (now > app.padRepeat && (pressed(15) || p.axes[0] > 0.5)) {
					adjustMenu(1);
					app.padRepeat = now + 180;
				}
			}
		}
		app.padPrev[p.index] = {
			buttons: p.buttons.map((b) => b.pressed || b.value > 0.25),
			axes: [...p.axes],
		};
	}
	return menuUsed;
}
function localInput(seat) {
	const k = app.keys;
	const v = { mx: 0, mz: 0, ax: 0, az: 0, fire: false, dash: false };
	if (seat === 0) {
		v.mx = +k.has("KeyD") - +k.has("KeyA");
		v.mz = +k.has("KeyS") - +k.has("KeyW");
		if (app.mode !== "local") {
			v.mx += +k.has("ArrowRight") - +k.has("ArrowLeft");
			v.mz += +k.has("ArrowDown") - +k.has("ArrowUp");
		}
		v.fire = app.mouse.down;
		v.dash = k.has("Space");
		if (app.mouse.active) {
			const t = (app.remote || sim).tanks[
					app.mode === "online" ? Math.max(0, online.seat) : 0
				],
				p = view.worldPoint(app.mouse.x, app.mouse.y);
			v.ax = p.x - t.x;
			v.az = p.z - t.z;
		}
	} else {
		v.mx = +k.has("ArrowRight") - +k.has("ArrowLeft");
		v.mz = +k.has("ArrowDown") - +k.has("ArrowUp");
		v.ax = +k.has("KeyL") - +k.has("KeyJ");
		v.az = +k.has("KeyK") - +k.has("KeyI");
		v.fire = k.has("Enter") || k.has("NumpadEnter");
		v.dash = k.has("ShiftRight") || k.has("ShiftLeft");
	}
	const pad = app.pads[seat];
	if (pad) {
		const dead = (a) => (Math.abs(a || 0) < 0.16 ? 0 : a);
		const x = dead(pad.axes[0]),
			z = dead(pad.axes[1]),
			ax = dead(pad.axes[2]),
			az = dead(pad.axes[3]);
		if (Math.hypot(x, z) > 0.1) {
			v.mx = x;
			v.mz = z;
		}
		if (Math.hypot(ax, az) > 0.1) {
			v.ax = ax;
			v.az = az;
		}
		v.fire ||= !!pad.buttons[7]?.pressed || pad.buttons[7]?.value > 0.25;
		v.dash ||=
			(!!pad.buttons[1]?.pressed && !app.padSuppress.has(pad.index)) ||
			!!pad.buttons[6]?.pressed;
	}
	if (seat === 0 && app.touches.size && app.screen === "play") {
		let right = null;
		for (const t of app.touches.values()) {
			const dx = (t.x - t.sx) / 55,
				dy = (t.y - t.sy) / 55;
			if (t.side === "left") {
				v.mx = dx;
				v.mz = dy;
			} else right = { dx, dy };
		}
		const tank = (app.remote || sim).tanks[
				app.mode === "online" ? Math.max(0, online.seat) : 0
			],
			enemy = (app.remote || sim).tanks[
				app.mode === "online" ? 1 - Math.max(0, online.seat) : 1
			];
		if (right && Math.hypot(right.dx, right.dy) > 0.15) {
			v.ax = right.dx;
			v.az = right.dy;
			v.fire = true;
		} else {
			v.ax = enemy.x - tank.x;
			v.az = enemy.z - tank.z;
			v.fire = enemy.dead <= 0;
		}
		v.dash = app.touchDash;
	}
	v.fire ||= app.queued[seat].fire;
	v.dash ||= app.queued[seat].dash;
	if (seat === 0) v.dash ||= app.touchDash;
	if (v.mx || v.mz || v.fire || v.dash || app.touches.size)
		app.lastInput = performance.now();
	return v;
}
function currentState() {
	return app.mode === "online" && !online.isHost && app.remote
		? app.remote
		: sim.snapshot();
}
let hudTick = 0;
function updateHud(state) {
	$("score-0").textContent = state.scores[0];
	$("score-1").textContent = state.scores[1];
	$("name-0").textContent =
		app.mode === "solo"
			? "YOU / TEAL"
			: online.active && online.players[0]
				? online.players[0].name + " / TEAL"
				: "TEAL / 01";
	$("name-1").textContent =
		app.mode === "solo"
			? "RIVAL / CORAL"
			: online.active && online.players[1]
				? online.players[1].name + " / CORAL"
				: "CORAL / 02";
	$("stage-name").textContent = MAPS[state.round].name;
	$("stage-sub").textContent =
		app.mode === "solo"
			? `${String(state.round + 1).padStart(2, "0")} / 03 · FIRST TO 3`
			: app.mode === "attract"
				? "AI DEMO · TWO GOOD LITTLE TANKS"
				: "DUEL · FIRST TO 3";
	const seconds = Math.max(0, Math.ceil(state.time));
	$("timer").textContent = state.sudden
		? "HOT ZONE"
		: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	$("timer").classList.toggle("danger", seconds < 15);
	for (let i = 0; i < 2; i++) {
		const t = state.tanks[i];
		$("armor-" + i).innerHTML =
			Array.from(
				{ length: 3 },
				(_, j) => `<i class="armor${t.hp > j ? "" : " empty"}"></i>`,
			).join("") +
			`<span class="ammo-row">${Array.from({ length: 3 }, (_, j) => `<i class="shell${t.ammo > j ? "" : " empty"}"></i>`).join("")}</span>`;
	}
	const dash =
		state.tanks[Math.max(0, app.mode === "online" ? online.seat : 0)].dash;
	$("dash-meter").style.width = (1 - dash / 3) * 100 + "%";
	$("dash-touch").textContent = dash > 0.05 ? dash.toFixed(1) + "s" : "BURST ↗";
	$("dash-touch").style.opacity = dash > 0.05 ? ".45" : "1";
}
function stepSimulation() {
	if (app.mode === "online" && !online.isHost) return;
	if (app.mode !== "attract") {
		if (app.mode === "online") {
			if (online.seat >= 0)
				sim.input(
					online.seat,
					app.screen === "play"
						? app.debugInputs[online.seat] || localInput(0)
						: {},
				);
		} else {
			sim.input(0, app.debugInputs[0] || localInput(0));
			sim.input(
				1,
				app.debugInputs[1] || (app.mode === "local" ? localInput(1) : null),
			);
		}
	}
	sim.step();
	app.queued = [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	];
}
function frame(now) {
	if (!app.ready) return;
	const dt = Math.min((now - lastFrame) / 1000 || 0.016, 0.08);
	lastFrame = now;
	getPads(now);
	if (app.screen === "title" && now - app.lastInput >= 10000) enterAttract();
	const active =
		app.screen === "play" ||
		app.screen === "attract" ||
		(app.mode === "online" &&
			!app.hubEnded &&
			["paused", "settings", "guide", "dev"].includes(app.screen));
	if (active) {
		if (app.mode === "attract") {
			app.attractElapsed += dt;
			if (app.attractElapsed > 19) {
				app.attractElapsed = 0;
				app.attractRound = (app.attractRound + 1) % 3;
				app.round = app.attractRound;
				sim.reset(app.round, "attract");
				sim.spawnPickup("overdrive", ...MAPS[app.round].pickup);
				view.build(app.round);
			}
		}
		if (app.mode === "online" && !online.isHost) {
			if (online.sendInput(app.screen === "play" ? localInput(0) : {}))
				app.queued[0] = { fire: false, dash: false };
		} else if (!(app.mode === "online" && online.inHub && online.time() < 0)) {
			accumulator += dt;
			let steps = 0;
			while (accumulator >= 1 / 60 && steps++ < 8) {
				stepSimulation();
				accumulator -= 1 / 60;
				if (sim.ended) break;
			}
		}
		if (app.mode === "online" && online.isHost && !online.ended) {
			const snap = sim.snapshot();
			snap.events = app.events;
			online.sendSnapshot(snap);
		}
	}
	if (app.finishPending && online.isHost) {
		const snap = sim.snapshot();
		snap.events = app.events;
		online.sendSnapshot(snap);
		online.finish(sim.scores);
		app.finishPending = false;
	}
	const state = currentState();
	let aim = null;
	const seat = app.mode === "online" ? online.seat : 0;
	if (
		app.settings.assist &&
		seat >= 0 &&
		!state.tanks[seat].dead &&
		app.screen === "play"
	) {
		const t = state.tanks[seat],
			dx = Math.sin(t.aim),
			dz = Math.cos(t.aim);
		aim = sim.trace(t.x, t.z, dx, dz, sim.balance.ricochets, 35);
	}
	view.update(state, dt, {
		aim,
		assist: app.settings.assist,
		seat,
		shake: app.settings.shake,
		title: app.screen === "title",
	});
	view.render();
	if (++hudTick % 4 === 0) updateHud(state);
	if (now > app.toastUntil) $("toast").classList.remove("show");
	if (now > app.announceUntil) $("announce").classList.remove("show");
	audio.update(dt, { paused: app.screen === "paused" });
}
function inspect() {
	if (!sim) return { ready: false, screen: app.screen };
	const s = currentState();
	return {
		ready: app.ready,
		screen: app.screen,
		mode: app.mode,
		round: s.round,
		scores: [...s.scores],
		tanks: s.tanks.map((t) => ({ ...t, body: undefined, col: undefined })),
		bullets: s.bullets.length,
		pickups: s.pickups.map((p) => ({ ...p })),
		obstacles: s.obstacles.map((o) => ({ hp: o.hp, type: o.type })),
		time: s.time,
		sudden: s.sudden,
		zone: s.zone,
		physics: "rapier 0.19.3",
		renderer: view.backend,
		musicVolume: audio.musicVolume,
		inputMode: app.inputMode,
		settings: { ...app.settings, ...sim.balance },
		balance: { ...sim.balance },
		metrics: { ...s.metrics },
		audio: audio.inspect(),
		animation: view.inspect(),
		online: online.inspect(),
		completed: [...app.completed],
	};
}
const debug = {
	start: (mode = "solo", round = 0) => startGame(mode, round),
	award: (seat) => sim.award(seat),
	damage: (seat, n = 1) => sim.damage(seat, n),
	setTank: (seat, v) => sim.setTank(seat, v),
	spawnShot: (owner, v) => sim.spawnShot(owner, v),
	setTime: (seconds) => {
		sim.time = seconds;
	},
	spawnPickup: (type, x, z) => sim.spawnPickup(type, x, z),
	setInput: (i, v) => {
		app.debugInputs[i] = v;
		sim.input(i, v);
	},
	step: (seconds) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) {
			stepSimulation();
			if (sim.ended) break;
		}
		updateHud(currentState());
	},
	setIdle: (seconds) => {
		app.lastInput = performance.now() - seconds * 1000;
	},
	reset: () => title(),
	online,
};
window.__COMBOP__ = {
	ready: false,
	inspect,
	debug,
	online,
	audio,
	AudioSystem,
};
async function boot() {
	try {
		loadSettings();
		wireUI();
		buildDev();
		$("loading-detail").textContent = "Pouring the concrete…";
		await Simulation.init();
		sim = new Simulation((type, data) => handleEffect(type, data));
		view = new GameView($("world"));
		$("loading-detail").textContent = "Inking the little tanks…";
		await view.init();
		view.build(0);
		view.update(sim.snapshot(), 0, { title: true });
		view.render();
		app.ready = true;
		window.__COMBOP__.ready = true;
		app.lastInput = performance.now();
		$("loading").style.display = "none";
		show("title", false);
		lastFrame = performance.now();
		view.renderer.setAnimationLoop(frame);
		const info = await online.connectHub();
		if (info) {
			app.mode = "online";
			show("online", false);
			$("online-steps")?.classList.add("hidden");
			document.querySelector(".online-steps").classList.add("hidden");
			$("online-screen").querySelector(".back-row").classList.add("hidden");
			$("online-screen").querySelector("h2").textContent =
				"Tanks on the starting line.";
			$("online-screen").querySelector("p").textContent =
				"Connected to AI Hub. The round starts automatically.";
			online.ready();
		}
	} catch (error) {
		console.error(error);
		$("loading-detail").textContent =
			`Could not prepare the range: ${error.message}. This game needs WebGPU or WebGL2 and internet access for Three.js and Rapier.`;
		document.querySelector(".loader-track").style.display = "none";
		window.__COMBOP__.error = String(error);
	}
}
boot();
