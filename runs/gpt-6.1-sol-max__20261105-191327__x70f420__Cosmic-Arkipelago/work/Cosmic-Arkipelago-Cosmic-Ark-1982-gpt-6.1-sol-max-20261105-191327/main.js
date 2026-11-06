import RAPIER from "@dimforge/rapier3d-compat";
import { Expedition, WORLDS, DEFAULTS, blankInput, clamp } from "./core.js";
import { Observatory } from "./scene.js";
import { Synth } from "./audio.js";
import { CrewLink } from "./network.js";
import { FlightInput } from "./input.js";

const $ = (id) => document.getElementById(id),
	hub = window.AIHub;
const hubConnect = hub.connect({ mode: "shared-world", seats: [1, 4] });
const initialSettings = {
	music: 10,
	sfx: 65,
	glyphs: "playstation",
	assist: false,
	shake: !matchMedia("(prefers-reduced-motion: reduce)").matches,
};
let settings = { ...initialSettings },
	record = { best: 0, beasties: 0 };
try {
	settings = {
		...settings,
		...JSON.parse(localStorage.getItem("arkipelago-settings") || "{}"),
	};
	record = {
		...record,
		...JSON.parse(localStorage.getItem("arkipelago-record") || "{}"),
	};
} catch {}
const audio = new Synth(settings);
let engine,
	sim,
	input,
	info = null,
	mode = "loading",
	menu = null,
	menuStack = [],
	attract = false,
	localCoop = false,
	paused = false,
	hubStarted = false,
	hubEnded = false,
	hubReported = false,
	hubWaiting = false,
	remoteView = null,
	remotePaused = false,
	lastActivity = performance.now(),
	lastFrame = 0,
	acc = 0,
	netClock = 0,
	seq = 0,
	remoteSeq = -1,
	testAdvance = false,
	guidePage = 0,
	toastTime = 0,
	aboutTab = "source",
	demoStormBefore = null;
const remoteInputs = new Map(),
	livePlayers = new Set();
let latestRemote = 0,
	lastSentEvent = 0,
	lastRemoteEvent = 0;
const link = new CrewLink(onNetwork, (d) => {
	$("crew-status").textContent = d;
	if (mode === "playing" && /lost|interrupted/.test(d))
		toast("Crew link interrupted", "The captain can keep flying.");
});
function saveSettings() {
	try {
		localStorage.setItem("arkipelago-settings", JSON.stringify(settings));
	} catch {}
	audio.update();
	settingsUI();
}
function focusables() {
	const p = document.querySelector(`[data-screen="${menu}"]`);
	return p
		? [
				...p.querySelectorAll('button:not(:disabled),input,[tabindex="0"]'),
			].filter((e) => e.getClientRects().length)
		: [];
}
function menuControl(action) {
	if (!menu) return;
	if (action === "back") {
		back();
		return;
	}
	const items = focusables(),
		index = items.indexOf(document.activeElement);
	if (action === "select") {
		if (document.activeElement?.matches("input")) {
			if (document.activeElement.id === "join-code") act("join");
		} else document.activeElement?.click();
		return;
	}
	if (action === "left" || action === "right") {
		const e = document.activeElement;
		if (e?.type === "range") {
			e.value = clamp(
				Number(e.value) + (action === "right" ? 1 : -1) * Number(e.step || 1),
				Number(e.min),
				Number(e.max),
			);
			e.dispatchEvent(new Event("input", { bubbles: true }));
		} else if (menu === "guide")
			act(action === "right" ? "guide-next" : "guide-prev");
		return;
	}
	if (items.length) {
		items[
			(index + (action === "next" ? 1 : -1) + items.length) % items.length
		].focus();
		audio.event({ type: "ui" });
	}
}
function show(name, { push = true } = {}) {
	if (push && menu && menu !== name) menuStack.push(menu);
	menu = name;
	for (const e of document.querySelectorAll("[data-screen]"))
		e.hidden = e.dataset.screen !== name;
	const inGame = mode === "playing" || attract;
	$("hud").hidden = !inGame;
	$("pause-button").hidden = !inGame || attract || !!name;
	$("touch-action").hidden = !!name || !inGame || input?.last !== "touch";
	if (name === "guide") renderGuide();
	if (name === "settings") settingsUI();
	if (name === "dev") devUI();
	if (name === "about") renderAbout();
	if (name === "pause") {
		$("quit-button").hidden = !!info;
		$("pause-note").textContent = info
			? "The shared expedition pauses with the captain."
			: "Your beasties can wait a moment.";
	}
	setTimeout(() => focusables()[0]?.focus({ preventScroll: true }), 0);
}
function closeMenu() {
	menu = null;
	for (const e of document.querySelectorAll("[data-screen]")) e.hidden = true;
	$("hud").hidden = mode !== "playing" && !attract;
	$("pause-button").hidden = mode !== "playing" || attract;
	$("touch-action").hidden = input.last !== "touch" || mode !== "playing";
}
function back() {
	if (menuStack.length) {
		show(menuStack.pop(), { push: false });
		return;
	}
	if (mode === "playing") {
		resume();
	} else show("title", { push: false });
}
function pause() {
	if (hubEnded || mode !== "playing" || attract || menu) return;
	paused = true;
	input.clear();
	menuStack = [];
	show("pause", { push: false });
	audio.stage = "title";
}
function resume() {
	menuStack = [];
	paused = false;
	closeMenu();
	audio.stage = sim.phase;
	input.clear();
}
function title() {
	if (info) return;
	if (demoStormBefore !== null) {
		sim.cfg.stormSeconds = demoStormBefore;
		demoStormBefore = null;
	}
	link.close();
	remoteView = null;
	remotePaused = false;
	remoteInputs.clear();
	paused = false;
	attract = false;
	localCoop = false;
	mode = "title";
	menuStack = [];
	sim.started = false;
	lastActivity = performance.now();
	$("attract").hidden = true;
	$("hub-badge").hidden = true;
	$("markers").replaceChildren();
	$("net-notice").hidden = true;
	show("title", { push: false });
	audio.stage = "title";
	$("best-line").textContent = record.best
		? `BEST EXPEDITION / ${record.best.toLocaleString()} PTS  ·  ${record.beasties} BEASTIES SAVED`
		: "A star is going out. Nobody gets left behind.";
}
function activity(type) {
	lastActivity = performance.now();
	if (input) input.use(type);
	if (!hubEnded) audio.unlock().catch(() => {});
	if (attract) {
		attract = false;
		$("attract").hidden = true;
		sim.started = false;
		title();
		input?.clear();
		return true;
	}
	return false;
}
function key(k, e) {
	if (hubEnded) return true;
	if (k === "Escape" || k === "KeyP") {
		if (menu) {
			if (menu === "crew") act("crew-back");
			else if (menu === "title") return true;
			else back();
		} else pause();
		return true;
	}
	if (menu) {
		if (e?.target?.id === "join-code" && k === "Enter") {
			act("join");
			return true;
		}
		if (k === "ArrowDown" || k === "KeyS") {
			menuControl("next");
			return true;
		}
		if (k === "ArrowUp" || k === "KeyW") {
			menuControl("prev");
			return true;
		}
		if (k === "Enter" || k === "Space") {
			menuControl("select");
			return true;
		}
		if (
			(k === "ArrowLeft" || k === "ArrowRight") &&
			document.activeElement?.type !== "range"
		) {
			menuControl(k === "ArrowRight" ? "right" : "left");
			return true;
		}
		return false;
	}
	return false;
}
function startGame({ coop = false, demo = false } = {}) {
	if (hubEnded) return;
	localCoop = coop;
	attract = demo;
	paused = false;
	remoteView = null;
	remotePaused = false;
	remoteInputs.clear();
	if (demo) {
		if (demoStormBefore === null) demoStormBefore = sim.cfg.stormSeconds;
		sim.cfg.stormSeconds = 15;
	} else if (demoStormBefore !== null) {
		sim.cfg.stormSeconds = demoStormBefore;
		demoStormBefore = null;
	}
	sim.start({ attract: demo });
	mode = "playing";
	menuStack = [];
	closeMenu();
	$("attract").hidden = !demo;
	$("waiting").hidden = true;
	input.clear();
	if (coop)
		toast(
			"Two seats. One mission.",
			"P1 defends with WASD. P2 flies with arrows.",
		);
	if (info) {
		$("hub-badge").hidden = false;
		$("hub-badge").textContent =
			`AI HUB · ${info.players.length} CREW · SHARED ARK`;
	} else if (link.connected) {
		$("hub-badge").hidden = false;
		$("hub-badge").textContent = "ONLINE CREW · SHARED ARK";
	}
}
function toast(a, b = "", duration = 4) {
	if (testAdvance) return;
	const e = $("toast");
	e.querySelector("strong").textContent = a;
	e.querySelector("span").textContent = b;
	e.classList.add("visible");
	toastTime = duration;
}
function onEvent(e) {
	if (testAdvance) return;
	engine?.event(e);
	audio.event(e);
	if (e.type === "phase") {
		const w = WORLDS[e.world];
		if (e.phase === "orbit")
			toast(
				e.retry
					? "Storm returning!"
					: `${String(e.world + 1).padStart(2, "0")} / ${w.name.toUpperCase()}`,
				e.retry
					? "Hold off the meteors. We are going back for them."
					: "Defend the Ark. Aim in four directions.",
			);
		if (e.phase === "rescue") toast(`Bring home the ${w.species}!`, w.note, 5);
		if (e.phase === "finale")
			toast(
				"The star is waking up.",
				"One last storm. Break the Sunheart. Get everyone home.",
				5,
			);
	}
	if (e.type === "captured")
		toast(
			"One little life, aboard.",
			"Bring your cargo to the docking ring ↑",
			2.5,
		);
	if (e.type === "lost")
		toast(
			"Beastie overboard!",
			"It is safe on the surface. Go back for it.",
			3,
		);
	if (e.type === "partial-dock")
		toast("Safe and sound.", "One more beastie is waiting down there.", 3);
	if (e.type === "world-clear")
		toast(
			"Nobody left behind.",
			`${WORLDS[e.world].name} is in the rear-view mirror.`,
			4,
		);
	if (e.type === "recall")
		toast(
			"Emergency recall!",
			"The storm is back. Protect the Ark and try again.",
			4,
		);
	if (e.type === "boss")
		toast(
			"SUNHEART INBOUND",
			"Keep firing up. A pulse will crack its shell.",
			4,
		);
	if (e.type === "boss-impact")
		toast(
			"The shell held!",
			"The Sunheart is coming around. Keep firing up.",
			3,
		);
	if (e.type === "boss-down")
		toast(
			"A little light at the end.",
			"Hold on. The jump drive is almost ready.",
			3,
		);
	if (e.type === "hit") {
		input?.rumble(0.55);
		$("flash").style.opacity = "1";
		setTimeout(() => ($("flash").style.opacity = "0"), 170);
	}
	if (e.type === "victory" || e.type === "defeat") {
		if (attract) return;
		endGame(e.type === "victory");
	}
}
function endGame(won) {
	if (info) {
		reportHub(won);
		return;
	}
	if (link.role === "client") return;
	paused = true;
	showResults(won);
	try {
		record.best = Math.max(record.best, Math.round(sim.score));
		record.beasties = Math.max(record.beasties, sim.totalRescued);
		localStorage.setItem("arkipelago-record", JSON.stringify(record));
	} catch {}
}
function showResults(won, state = sim.snapshot()) {
	$("result-kicker").textContent = won
		? "ALPHA RO EXPEDITION / COMPLETE"
		: "MISSION LOG / SIGNAL LOST";
	$("result-title").textContent = won ? "All aboard!" : "A spark remains.";
	$("result-copy").textContent = won
		? "A new sky. Six little reasons to keep going. The Arkipelago lives on."
		: "The shuttle escaped. Your crew is ready for another try.";
	$("result-score").textContent = Math.round(state.score).toLocaleString();
	$("result-rescued").textContent = `${state.totalRescued} / 6`;
	$("result-meteors").textContent = state.destroyed;
	$("again-button").textContent = won
		? "Another expedition"
		: "Retry this world";
	$("result-note").textContent =
		`BEST CHAIN / ${state.maxCombo}  ·  FLIGHT TIME / ${Math.floor(state.time / 60)}m ${Math.floor(state.time % 60)}s`;
	$("again-button").hidden = link.role === "client";
	show("results", { push: false });
}
function reportHub(won = false) {
	if (!info || !info.isHost || hubReported || hubEnded) return;
	hubReported = true;
	const ids = info.players
		.filter((p) => livePlayers.has(p.id))
		.map((p) => p.id);
	hub.finish({
		standings: [ids],
		scores: Object.fromEntries(ids.map((id) => [id, Math.round(sim.score)])),
		won,
		stats: Object.fromEntries(
			ids.map((id) => [
				id,
				{
					"Beasties rescued": sim.totalRescued,
					"Meteors cleared": sim.destroyed,
					"Best chain": sim.maxCombo,
				},
			]),
		),
	});
}
function act(action) {
	if (hubEnded) return;
	if (attract) return;
	if (action !== "pause") audio.event({ type: "ui" });
	switch (action) {
		case "launch":
			startGame();
			break;
		case "local-coop":
			link.close();
			startGame({ coop: true });
			break;
		case "pause":
			pause();
			break;
		case "resume":
			resume();
			break;
		case "title":
		case "quit":
			title();
			break;
		case "back":
			back();
			break;
		case "guide":
		case "settings":
		case "about":
			show(action);
			break;
		case "crew":
			show("crew");
			break;
		case "crew-back":
			link.close();
			$("room-display").hidden = true;
			$("launch-room").hidden = true;
			$("disconnect-room").hidden = true;
			back();
			break;
		case "dev":
			if (info && !info.isHost) {
				toast(
					"Captain’s flight recorder",
					"Only the host can tune the shared world.",
				);
				break;
			}
			show("dev");
			break;
		case "guide-prev":
			guidePage = (guidePage + 2) % 3;
			renderGuide();
			break;
		case "guide-next":
			guidePage = (guidePage + 1) % 3;
			renderGuide();
			break;
		case "glyphs":
			settings.glyphs =
				settings.glyphs === "playstation" ? "xbox" : "playstation";
			saveSettings();
			break;
		case "assist":
			settings.assist = !settings.assist;
			saveSettings();
			break;
		case "shake":
			settings.shake = !settings.shake;
			saveSettings();
			break;
		case "reset-settings":
			Object.assign(settings, initialSettings);
			saveSettings();
			break;
		case "fullscreen":
			if (document.fullscreenElement)
				document.exitFullscreen?.().catch(() => {});
			else document.documentElement.requestFullscreen?.().catch(() => {});
			break;
		case "host":
			remoteSeq = -1;
			lastRemoteEvent = 0;
			$("room-code").textContent = link.host();
			$("room-display").hidden = false;
			$("launch-room").hidden = false;
			$("disconnect-room").hidden = false;
			break;
		case "join":
			remoteSeq = -1;
			lastRemoteEvent = 0;
			if (link.join($("join-code").value)) {
				$("disconnect-room").hidden = false;
				$("launch-room").hidden = true;
			}
			break;
		case "copy-room":
			navigator.clipboard
				?.writeText(link.code)
				.then(
					() =>
						($("crew-status").textContent =
							"Room code copied. Send it to your crewmate."),
				)
				.catch(
					() => ($("crew-status").textContent = "Room code: " + link.code),
				);
			break;
		case "disconnect":
			link.close();
			$("room-display").hidden = true;
			$("launch-room").hidden = true;
			$("disconnect-room").hidden = true;
			$("crew-status").textContent = "Disconnected. Ready for a new crew.";
			break;
		case "launch-room":
			if (link.role === "host") startGame();
			break;
		case "refill":
			sim.energy = 100;
			devUI();
			break;
		case "skip":
			if (sim.phase === "orbit") sim.beginRescue();
			else if (sim.phase === "rescue") {
				for (const c of sim.creatures)
					if (c.state !== "banked") {
						c.state = "cargo";
						if (!sim.shuttle.cargo.includes(c.id)) sim.shuttle.cargo.push(c.id);
					}
				sim.dock();
			} else if (sim.phase === "transit") {
				sim.transit = 5;
			} else if (sim.phase === "finale") sim.finish(true);
			devUI();
			break;
		case "next-world":
			sim.worldIndex = (sim.worldIndex + 1) % 3;
			sim.bank = [false, false];
			sim.beginOrbit();
			devUI();
			break;
		case "god":
			sim.cheats.invulnerable = !sim.cheats.invulnerable;
			devUI();
			break;
		case "autopilot":
			sim.cheats.autopilot = !sim.cheats.autopilot;
			devUI();
			break;
		case "colliders":
			sim.cheats.colliders = !sim.cheats.colliders;
			devUI();
			break;
		case "retry-stage":
			if (sim.phase === "rescue") sim.beginRescue();
			else if (sim.phase === "finale") sim.beginFinale();
			else sim.beginOrbit();
			devUI();
			break;
		case "dev-reset":
			Object.assign(sim.cfg, DEFAULTS);
			sim.cheats = { invulnerable: false, autopilot: false, colliders: false };
			devUI();
			break;
		case "again":
			if (sim.phase === "defeat") {
				sim.finished = false;
				sim.energy = 100;
				sim.beginOrbit();
				paused = false;
				closeMenu();
			} else startGame({ coop: localCoop });
			break;
		default:
			if (action.startsWith("about-")) {
				aboutTab = action.slice(6);
				renderAbout();
			}
			break;
	}
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) {
		activity(e.pointerType === "touch" ? "touch" : input?.last || "keyboard");
		act(b.dataset.action);
	}
});
function settingsUI() {
	for (const k of ["music", "sfx"]) {
		$(k).value = settings[k];
		$(k + "-value").textContent = settings[k] + "%";
	}
	$("glyphs-value").textContent = settings.glyphs.toUpperCase();
	$("assist-value").textContent = settings.assist ? "ON" : "OFF";
	$("shake-value").textContent = settings.shake ? "ON" : "OFF";
}
for (const k of ["music", "sfx"])
	$(k).addEventListener("input", (e) => {
		settings[k] = Number(e.target.value);
		saveSettings();
	});
function renderGuide() {
	const pad = input.last === "gamepad",
		beam = pad
			? settings.glyphs === "xbox"
				? "A"
				: "Cross"
			: "Space or left mouse",
		move = pad ? "left stick" : "WASD or arrow keys",
		boost = pad ? (settings.glyphs === "xbox" ? "B" : "Circle") : "Shift",
		pulse = pad ? "R1 / RB" : "E";
	const pages = [
		[
			"DEFEND THE ARK",
			"↑ &nbsp; ✧ &nbsp; →",
			`Lean the <strong>${move}</strong> in a direction to fire the Ark’s four cannons. With a mouse, aim and hold the left button.<br><br>Clear meteors to recover energy. Wavering mint meteors dodge; armored ones need two hits. Use <strong>${pulse}</strong> for a wide shield pulse, then wait ten seconds for it to recharge.`,
		],
		[
			"BRING THEM HOME",
			"↧ &nbsp; ♡ &nbsp; ↑",
			`Fly with the <strong>${move}</strong>. Hover above a beastie, below the middle of the screen, and hold <strong>${beam}</strong> to beam it aboard. Carry both at once or make two trips.<br><br>Fly into the ring under the Ark to dock. Red dashes warn of a defense beam; <strong>${boost}</strong> boosts through danger. A hit drops one creature. The rescue clock recalls you into another storm.`,
		],
		[
			"EVERY LITTLE LIFE COUNTS",
			"✧ &nbsp; ✧ &nbsp; ✧",
			`Visit Mossbell, Glasswake and Embermere. Crosswinds push your shuttle on Glasswake; Embermere has two defense beams. Rescue all six creatures, then survive the Sunheart’s final storm.<br><br>Local co-op splits jobs: <strong>P1 defends with WASD / pad 1; P2 flies with arrows / pad 2.</strong> Online and AI Hub crew share the Ark’s controls. On touch screens, drag anywhere to fly; aiming and beams are assisted.`,
		],
	];
	const p = pages[guidePage];
	$("guide-number").textContent = "0" + (guidePage + 1);
	$("guide-heading").textContent = p[0];
	$("guide-art").innerHTML = p[1];
	$("guide-copy").innerHTML = p[2];
}
const tuning = [
	["shipSpeed", "Shuttle speed", 3, 15, 0.5],
	["meteorSpeed", "Meteor speed", 1, 7, 0.1],
	["spawnSeconds", "Meteor interval", 0.35, 2, 0.05],
	["beamSeconds", "Beam pickup time", 0.3, 3, 0.05],
	["damage", "Hit damage", 0, 30, 1],
	["drain", "Energy drain / sec", 0, 2, 0.05],
	["timeScale", "Simulation speed", 0.25, 3, 0.25],
	["stormSeconds", "Base storm length", 8, 45, 1],
];
function devUI() {
	const focused = document.activeElement?.id;
	$("dev-sliders").replaceChildren();
	for (const [k, label, min, max, step] of tuning) {
		const row = document.createElement("div");
		row.className = "settings-row";
		const l = document.createElement("label");
		l.htmlFor = "dev-" + k;
		l.textContent = label;
		const b = document.createElement("b");
		b.textContent = Number(sim.cfg[k].toFixed(2));
		l.append(b);
		const r = document.createElement("input");
		Object.assign(r, {
			id: "dev-" + k,
			type: "range",
			min,
			max,
			step,
			value: sim.cfg[k],
		});
		r.addEventListener("input", () => {
			sim.cfg[k] = Number(r.value);
			b.textContent = Number(r.value);
			if (k === "stormSeconds" && sim.phase === "orbit")
				sim.timer = Math.max(
					0,
					sim.cfg.stormSeconds + sim.worldIndex * 5 - sim.phaseTime,
				);
		});
		row.append(l, r);
		$("dev-sliders").append(row);
	}
	for (const [k, id] of [
		["invulnerable", "god"],
		["autopilot", "autopilot"],
		["colliders", "colliders"],
	])
		$(id + "-button").textContent =
			`${k === "invulnerable" ? "Invulnerable" : k === "colliders" ? "Collision view" : "Autopilot"}: ${sim.cheats[k] ? "ON" : "OFF"}`;
	$("dev-state").textContent =
		`${sim.phase.toUpperCase()} · ${WORLDS[sim.worldIndex].name} · ENERGY ${Math.ceil(sim.energy)} · ${sim.entities.length} physics bodies. Changes apply immediately.`;
	if (focused?.startsWith("dev-")) $(focused)?.focus();
}
function renderAbout() {
	const data = window.GAME_INFO;
	const el = $("about-copy");
	el.replaceChildren();
	document
		.querySelectorAll(".about-tabs button")
		.forEach((b) =>
			b.classList.toggle("selected", b.dataset.action === "about-" + aboutTab),
		);
	if (aboutTab === "source") {
		const dl = document.createElement("dl");
		for (const [k, v] of Object.entries(data.sourceInformation)) {
			const dt = document.createElement("dt"),
				dd = document.createElement("dd");
			dt.textContent = k.replace(/[A-Z]/g, (s) => " " + s).toUpperCase();
			dd.textContent = v;
			dl.append(dt, dd);
		}
		const dt = document.createElement("dt"),
			dd = document.createElement("dd");
		dt.textContent = "CREDITS & RESEARCH";
		dd.textContent =
			"Original inspiration: Cosmic Ark (Imagic, 1982), designed by Rob Fulop. Original game, art, music and creature voices created in code. Research: Imagic instruction manual (AtariAge); original gameplay recording (Silver Blue’s Retrocade); AI Hub Session Protocol v1. Libraries: Three.js (MIT), Rapier (Apache-2.0), PeerJS (MIT).";
		dl.append(dt, dd);
		el.append(dl);
	} else {
		const questions = {
			testing: [
				"Issues caught",
				"Critical / game breaking",
				"Most helpful test",
				"Least helpful test",
			],
			engine: [
				"Liked most",
				"Got stuck or guessed wrong",
				"Built ourselves",
				"Hardest part",
				"Engine changes",
				"One thing to change",
			],
			prompt: ["Liked most", "Confusing", "Hardest thing", "Suggested change"],
		}[aboutTab];
		const answers = data[aboutTab + "Feedback"];
		answers.forEach((answer, i) => {
			const p = document.createElement("p"),
				b = document.createElement("strong");
			b.textContent = questions[i] + ". ";
			p.append(b, document.createTextNode(answer));
			el.append(p);
		});
	}
	el.scrollTop = 0;
}
function onNetwork(d) {
	if (info || hubEnded) return;
	if (d.type === "world" && link.role === "client") {
		if (d.seq <= remoteSeq) return;
		remoteSeq = d.seq;
		remoteView = d.state;
		remotePaused = d.paused;
		receiveEvents(d.events);
		if (mode !== "playing") {
			mode = "playing";
			menuStack = [];
			closeMenu();
			$("hub-badge").hidden = false;
			$("hub-badge").textContent = "ONLINE CREW · SHARED ARK";
		}
		if (remoteView.finished && menu !== "results") {
			paused = true;
			showResults(remoteView.phase === "victory", remoteView);
			$("result-note").textContent =
				"The captain can launch again. Return to title to leave the crew.";
		} else if (!remoteView.finished && menu === "results") {
			paused = false;
			closeMenu();
		}
	}
	if (d.type === "input" && link.role === "host") {
		remoteInputs.set("peer", {
			input: sanitize(d.input),
			at: performance.now(),
		});
		latestRemote = performance.now();
	}
}
function sanitize(i) {
	const b = blankInput();
	if (!i || typeof i !== "object") return b;
	for (const k of ["x", "y", "aimX", "aimY"])
		b[k] = Number.isFinite(i[k]) ? clamp(i[k], -40, 40) : 0;
	for (const k of ["beam", "fire", "pulse", "dash"]) b[k] = i[k] === true;
	return b;
}
function combined(local) {
	const inputs = [local];
	for (const v of remoteInputs.values())
		if (performance.now() - v.at < 450) inputs.push(v.input);
	if (inputs.length === 1) return local;
	const result = { ...local };
	let count = 0;
	result.x = 0;
	result.y = 0;
	for (const i of inputs) {
		if (Math.abs(i.x) + Math.abs(i.y) > 0.1) {
			result.x += i.x;
			result.y += i.y;
			count++;
		}
		if (Math.abs(i.aimX) + Math.abs(i.aimY) > 0.1) {
			result.aimX = i.aimX;
			result.aimY = i.aimY;
		}
		for (const k of ["beam", "dash", "pulse"]) result[k] ||= i[k];
	}
	if (count) {
		result.x /= count;
		result.y /= count;
	}
	return result;
}
function getInput() {
	const phase = remoteView?.phase || sim.phase;
	let i = input.sample(phase, localCoop);
	if ((settings.assist || input.last === "touch") && phase === "rescue")
		i.beam = true;
	if (input.last === "touch" && (phase === "orbit" || phase === "finale")) {
		const rock = (remoteView?.entities || sim.entities)
			.filter((e) => e.kind === "rock")
			.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0];
		if (rock) {
			i.aimX = rock.x;
			i.aimY = rock.y;
		}
	}
	return i;
}
function worldPacket() {
	const events = sim.events.filter((e) => e.eventId > lastSentEvent);
	if (events.length) lastSentEvent = events.at(-1).eventId;
	return { type: "world", seq: ++seq, state: sim.snapshot(), paused, events };
}
function receiveEvents(events = []) {
	for (const e of events) {
		if (e.eventId <= lastRemoteEvent) continue;
		lastRemoteEvent = e.eventId;
		onEvent(e);
	}
}
function hud(s) {
	const w = WORLDS[s.worldIndex],
		rescue = s.phase === "rescue";
	$("location-kicker").textContent =
		s.phase === "finale" ? "THE WAY HOME" : w.subtitle;
	$("location-name").textContent =
		s.phase === "finale"
			? "ALPHA RO / ESCAPE"
			: `${String(s.worldIndex + 1).padStart(2, "0")} / ${w.name.toUpperCase()}`;
	$("phase-label").textContent = rescue
		? "SURFACE RESCUE"
		: s.phase === "transit"
			? "JUMP DRIVE CHARGING"
			: s.phase === "finale"
				? "FINAL METEOR STORM"
				: "ORBITAL APPROACH";
	const seconds = Math.max(0, Math.ceil(s.timer));
	$("timer").textContent =
		s.phase === "transit"
			? "↗"
			: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	$("timer").style.color = seconds < 12 ? "var(--coral)" : "var(--paper)";
	$("timer-label").textContent = rescue
		? "RECALL IN"
		: s.phase === "transit"
			? "NEXT DESTINATION"
			: "STORM ENDS";
	$("energy").textContent = Math.ceil(s.energy);
	$("energy-bar").style.width = s.energy + "%";
	$("energy-bar").style.background =
		s.energy < 25 ? "var(--coral)" : "var(--mint)";
	$("score").textContent =
		Math.round(s.score).toString().padStart(6, "0") + " PTS";
	$("cargo-label").textContent = `BEASTIES SAFE / ${s.totalRescued} OF 6`;
	for (let j = 0; j < 2; j++)
		$("cargo-" + j).classList.toggle(
			"collected",
			!!s.bank[j] || s.shuttle?.cargo.includes(j),
		);
	$("cargo-detail").textContent = rescue
		? `${s.shuttle.cargo.length} ABOARD`
		: "";
	$("pulse-status").textContent =
		s.pulseCd <= 0 ? "READY" : `${Math.ceil(s.pulseCd)}s`;
	$("pulse-hint").textContent =
		(input.last === "gamepad"
			? settings.glyphs === "xbox"
				? "RB"
				: "R1"
			: "E") + " / SHIELD PULSE";
	$("combo").hidden = s.combo < 3;
	$("combo").textContent =
		`${s.combo} CHAIN ×${Math.min(5, 1 + Math.floor(s.combo / 5))}`;
	const g = (a) => `<span class="glyph">${a}</span>`;
	if (input.last === "gamepad")
		$("control-hints").innerHTML = rescue
			? `${g("L")} fly · Hold ${g(settings.glyphs === "xbox" ? "A" : "×")} beam · ${g(settings.glyphs === "xbox" ? "B" : "○")} boost`
			: `${g("L")} aim & fire · ${g(settings.glyphs === "xbox" ? "RB" : "R1")} pulse · ${g("☰")} pause`;
	else
		$("control-hints").innerHTML = rescue
			? `${g(localCoop ? "↑↓←→" : "WASD")} fly · ${g("Space")} beam · ${g("Shift")} boost`
			: `${g("WASD / ↑↓←→")} fire · ${g("E")} pulse · ${g("Esc")} pause`;
	$("pause-button").hidden = !!menu || attract || hubEnded;
	$("touch-action").hidden = input.last !== "touch" || !!menu || attract;
	$("touch-action").textContent = rescue
		? s.shuttle.dashCd > 0
			? `${s.shuttle.dashCd.toFixed(1)}s`
			: "BOOST"
		: s.pulseCd > 0
			? `${Math.ceil(s.pulseCd)}s`
			: "PULSE";
	const container = $("markers");
	container.replaceChildren();
	if (rescue && !menu) {
		for (const c of s.creatures) {
			if (c.state !== "ground") continue;
			const p = engine.project(c.x, -4.1);
			const d = document.createElement("div");
			d.className = "marker";
			d.style.left = clamp(p.x, 55, innerWidth - 55) + "px";
			d.style.top = p.y + "px";
			d.textContent =
				c.progress > 0
					? "BEAMING…"
					: (p.x < 30 ? "← " : "") +
						w.species.slice(0, -1).toUpperCase() +
						(p.x > innerWidth - 30 ? " →" : "");
			if (c.progress > 0) {
				const b = document.createElement("div"),
					v = document.createElement("i");
				b.className = "capture";
				v.style.width = clamp(c.progress * 100, 0, 100) + "%";
				b.append(v);
				d.append(b);
			}
			container.append(d);
		}
		const p = engine.project(0, 5.4);
		const d = document.createElement("div");
		d.className = "marker";
		d.style.left = p.x + "px";
		d.style.top = p.y - 35 + "px";
		d.textContent = s.shuttle.cargo.length ? "↑ DOCK HERE" : "↓ LAUNCH";
		container.append(d);
	}
	if (sim.cheats.colliders && !menu) {
		for (const e of [
			...s.entities,
			{ x: 0, y: rescue ? 7.1 : 0, r: 1.25 },
			...(rescue ? [{ x: s.shuttle.x, y: s.shuttle.y, r: 0.45 }] : []),
		]) {
			const p = engine.project(e.x, e.y),
				q = engine.project(e.x + e.r, e.y);
			const d = document.createElement("div");
			d.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:${Math.abs(q.x - p.x) * 2}px;height:${Math.abs(q.x - p.x) * 2}px;border:2px dashed #f7ce80;transform:translate(-50%,-50%);border-radius:50%`;
			container.append(d);
		}
	}
	const boss = s.entities.find((e) => e.type === "sunheart");
	if (boss && !menu) {
		const p = engine.project(boss.x, boss.y - 2);
		const d = document.createElement("div");
		d.className = "marker";
		d.style.left = p.x + "px";
		d.style.top = p.y + "px";
		d.style.color = "var(--gold)";
		d.textContent = "SUNHEART";
		const b = document.createElement("div"),
			v = document.createElement("i");
		b.className = "capture";
		v.style.width = (boss.hp / 14) * 100 + "%";
		v.style.background = "var(--coral)";
		b.append(v);
		d.append(b);
		container.append(d);
	}
	const t = input.touches.values().next().value;
	$("touch-bloom").hidden = !t;
	if (t) {
		$("touch-bloom").style.left = t.sx + "px";
		$("touch-bloom").style.top = t.sy + "px";
	}
}
$("touch-action").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	input.touchSpecial = true;
	activity("touch");
});
const preview = {
	worldIndex: 0,
	time: 0,
	phase: "rescue",
	phaseTime: 0,
	shuttle: { x: 6, y: -1, beam: true, cargo: [] },
	entities: [],
	creatures: [],
	lasers: [],
};
function frame(now) {
	if (!engine || !sim) return;
	const dt = Math.min(0.05, (now - lastFrame) / 1000 || 1 / 60);
	lastFrame = now;
	input.poll(dt);
	if (menu === "title") {
		$("title-input").textContent =
			input.last === "gamepad"
				? settings.glyphs === "xbox"
					? "↑ ↓ navigate · A select"
					: "↑ ↓ navigate · × select"
				: input.last === "touch"
					? "Tap to begin"
					: "↑ ↓ navigate · Enter select";
		if (performance.now() - lastActivity >= 10000 && !info) {
			startGame({ demo: true });
			toast(
				"A whole universe of little lives.",
				"Watch the crew at work. Any button takes the helm.",
				5,
			);
		}
	}
	if (hubWaiting && !hubEnded && hubStarted && hub.time() >= 0) {
		hubWaiting = false;
		startGame();
	}
	if (!hubEnded) {
		const running =
			mode === "playing" &&
			!paused &&
			!remotePaused &&
			!menu &&
			(!info || hub.time() >= 0);
		if (running && (!info || info.isHost) && link.role !== "client") {
			acc += dt;
			let steps = 0;
			const i = combined(getInput());
			while (acc >= 1 / 60 && steps++ < 8) {
				sim.tick(1 / 60, i);
				acc -= 1 / 60;
			}
			if (attract && sim.finished && sim.phaseTime > 3) {
				startGame({ demo: true });
			}
			if (attract && sim.finished) sim.phaseTime += dt;
		} else acc = 0;
		netClock += dt;
		if (netClock >= 0.1) {
			netClock = 0;
			if (info && hubStarted && hub.time() >= 0) {
				if (info.isHost) hub.send(worldPacket(), { reliable: true });
				else
					hub.send(
						{
							type: "input",
							input: menu || paused ? blankInput() : getInput(),
						},
						{ to: info.host, reliable: false },
					);
			} else if (link.connected && mode === "playing") {
				if (link.role === "host") link.send(worldPacket());
				else
					link.send({
						type: "input",
						input: menu || paused ? blankInput() : getInput(),
					});
			}
		}
		audio.tick();
	}
	let view;
	if (mode === "title" || mode === "loading") {
		preview.time += dt;
		view = preview;
	} else view = remoteView || sim.snapshot();
	if (toastTime > 0) {
		toastTime -= dt;
		if (toastTime <= 0) $("toast").classList.remove("visible");
	}
	engine.draw(
		view,
		paused ? dt * 0.25 : dt,
		mode === "title" ? "title" : "game",
	);
	if (mode === "playing") hud(view);
	if (info && !hubStarted) {
		$("waiting").hidden = false;
	}
	if (remotePaused && !remoteView?.finished && mode === "playing" && !menu) {
		$("net-notice").hidden = false;
		$("net-notice").textContent = "The captain has paused the expedition.";
	} else if (!remoteView?.finished) $("net-notice").hidden = true;
}
async function boot() {
	try {
		await RAPIER.init();
		sim = new Expedition(RAPIER, onEvent);
		engine = await new Observatory($("world"), settings).init();
		input = new FlightInput({
			activity,
			key,
			menu: menuControl,
			isMenu: () => !!menu,
			worldPoint: (x, y) => ({
				x:
					engine.camera.position.x +
					engine.camera.left +
					(x / innerWidth) * (engine.camera.right - engine.camera.left),
				y:
					engine.camera.position.y +
					engine.camera.top -
					(y / innerHeight) * (engine.camera.top - engine.camera.bottom),
			}),
		});
		info = await hubConnect;
		if (info) {
			for (const p of info.players) livePlayers.add(p.id);
			mode = "playing";
			hubWaiting = true;
			$("waiting").hidden = false;
			hub.on("start", () => {
				hubStarted = true;
			});
			hub.on("message", (d, from) => {
				if (hubEnded) return;
				if (d?.type === "input" && info.isHost && livePlayers.has(from)) {
					remoteInputs.set(from, {
						input: sanitize(d.input),
						at: performance.now(),
					});
				} else if (
					d?.type === "world" &&
					!info.isHost &&
					from === info.host &&
					d.seq > remoteSeq
				) {
					remoteSeq = d.seq;
					remoteView = d.state;
					remotePaused = d.paused;
					receiveEvents(d.events);
				}
			});
			hub.on("leave", ({ id }) => {
				livePlayers.delete(id);
				remoteInputs.delete(id);
				toast("A crewmate has left.", "The rescue goes on.");
			});
			hub.on("time-up", () => {
				if (info.isHost)
					reportHub(sim.totalRescued === 6 && sim.phase === "victory");
			});
			hub.on("end", ({ reason }) => {
				hubEnded = true;
				paused = true;
				input.clear();
				audio.muted = true;
				audio.update();
				closeMenu();
				$("waiting").hidden = false;
				$("waiting-title").textContent =
					reason === "finished" ? "Expedition logged" : "Crew standing by";
				$("waiting-copy").textContent = "Returning to AI Hub.";
				$("pause-button").hidden = true;
				$("touch-action").hidden = true;
			});
			hub.ready();
		} else title();
		$("loading").hidden = true;
		lastFrame = performance.now();
		engine.renderer.setAnimationLoop(frame);
		window.__ark = {
			ready: true,
			title: "Cosmic Arkipelago",
			version: 1,
			sim,
			engine,
			audio,
			link,
			input,
			settings,
			get state() {
				return remoteView || sim.snapshot();
			},
			get mode() {
				return mode;
			},
			get menu() {
				return menu;
			},
			get attract() {
				return attract;
			},
			get hubEnded() {
				return hubEnded;
			},
			act,
			start: startGame,
			toTitle: title,
			forceIdle: () => {
				lastActivity = performance.now() - 10001;
			},
			advance: (seconds, controls = null) => {
				testAdvance = true;
				try {
					for (let t = 0; t < seconds; t += 1 / 60) {
						sim.tick(1 / 60, controls || sim.botInput());
						if (sim.finished) break;
					}
				} finally {
					testAdvance = false;
				}
				return sim.snapshot();
			},
			audioLevels: () => audio.levels(),
			networkStats: () => ({
				sent: link.sent,
				received: link.received,
				remoteSeq,
				remoteInputs: remoteInputs.size,
				remoteControls: [...remoteInputs.values()].map((v) => v.input),
			}),
		};
	} catch (e) {
		$("loading-text").textContent =
			"The engines could not start: " +
			e.message +
			". Try a current browser with WebGPU or WebGL 2.";
		$("loading").querySelector("h2").textContent = "A little engine trouble";
		if (hub.active) hub.fail(e.message);
		console.error(e);
		window.__arkError = e.stack;
	}
}
boot();
