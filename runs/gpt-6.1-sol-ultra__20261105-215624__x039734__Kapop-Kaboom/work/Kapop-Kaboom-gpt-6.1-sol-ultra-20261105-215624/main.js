import { GameAudio } from "./audio.js";
import { testAudio } from "./audio-tests.js";
import credits from "./credits.json";
import { Network } from "./network.js";
import { GameScene } from "./scene.js";
import { DEFAULTS, GameSim, initPhysics, WAVES } from "./sim.js";

const $ = (id) => document.getElementById(id),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
let scene,
	audio,
	sim,
	net,
	remote = null,
	screen = "title",
	returnScreen = "title",
	mode = "solo",
	paused = false,
	ready = false,
	localIndex = 0,
	lastInput = performance.now(),
	lastDevice =
		navigator.maxTouchPoints > 0 && matchMedia("(pointer:coarse)").matches
			? "touch"
			: "keyboard",
	focusIndex = 0,
	prevButtons = [],
	lastNav = 0,
	acc = 0,
	gameClock = 0,
	toastTime = 0,
	resultTimer = 0,
	attractEnd = 0,
	lastPhase = "",
	testFrozen = false,
	serverOnly = false;
const keys = new Set(),
	eventLog = [],
	touches = new Map();
const prefs = { music: 0.1, sfx: 0.65, glyphs: "ps", shake: true };
let high = 0;
try {
	Object.assign(
		prefs,
		JSON.parse(localStorage.getItem("kapop-settings") || "{}"),
	);
	high = Number(localStorage.getItem("kapop-high") || 0);
} catch {}
const save = () => {
	try {
		localStorage.setItem("kapop-settings", JSON.stringify(prefs));
		localStorage.setItem("kapop-high", String(high));
	} catch {}
};
const btn = (label, action, primary = false) =>
	`<button ${primary ? 'class="primary"' : ""} data-action="${action}">${label}</button>`;
const glyph = (ps, xbox, key) =>
	lastDevice === "pad" ? (prefs.glyphs === "ps" ? ps : xbox) : key;
function noteInput(device = "keyboard") {
	if (net?.hubActive && net.ended) return true;
	lastInput = performance.now();
	if (lastDevice !== device) {
		lastDevice = device;
		updatePrompts();
	}
	if (sim?.attract) {
		toTitle();
		return true;
	}
	return false;
}
function updatePrompts() {
	if (!ready) return;
	document.body.classList.toggle("touch", lastDevice === "touch");
	$("moveHint").textContent =
		lastDevice === "pad"
			? "L / D-PAD   MOVE"
			: mode === "local"
				? "P1: A D / MOUSE   P2: ← →"
				: "A D / ← → / MOUSE   MOVE";
	$("pauseHint").textContent = glyph(
		"OPTIONS   PAUSE",
		"MENU   PAUSE",
		"ESC   PAUSE",
	);
	$("titleFoot").textContent =
		lastDevice === "pad"
			? glyph(
					"✕ SELECT    ○ BACK    L MOVE",
					"A SELECT    B BACK    L MOVE",
					"",
				)
			: "MOVE THE MOUSE · PRESS A KEY · GRAB A PAD";
}
function toast(text, seconds = 2) {
	$("toast").textContent = text;
	$("toast").hidden = false;
	toastTime = seconds;
}
function focusables() {
	return Array.from(
		(screen === "title" ? $("title") : $("panel")).querySelectorAll(
			"button:not([disabled]),input",
		),
	).filter((e) => e.offsetParent !== null);
}
function focusAt(i) {
	const list = focusables();
	document.querySelectorAll(".focus").forEach((e) => {
		e.classList.remove("focus");
	});
	if (!list.length) return;
	focusIndex = (i + list.length) % list.length;
	list[focusIndex].classList.add("focus");
	list[focusIndex].focus({ preventScroll: true });
}
function navigate(dx, dy) {
	if (screen === "about") {
		$("panel").scrollTop += (dy || dx) * 170;
		return;
	}
	const list = focusables();
	if (!list.length) return;
	const el = list[focusIndex];
	if (dx && el?.type === "range") {
		const next = Number(el.value) + dx * Number(el.step || 0.1);
		el.value = clamp(next, Number(el.min), Number(el.max));
		el.dispatchEvent(new Event("input", { bubbles: true }));
		return;
	}
	focusAt(focusIndex + (dy || dx));
	audio?.sfx("ui");
}
function panel(html, name) {
	screen = name;
	$("overlay").hidden = false;
	$("panel").innerHTML = html;
	focusIndex = 0;
	queueMicrotask(() => focusAt(0));
}
function closePanel() {
	screen = null;
	$("overlay").hidden = true;
	paused = false;
	audio.setPaused(false);
}
function back() {
	audio?.sfx("ui");
	if (screen === "pause") {
		closePanel();
		return;
	}
	if (
		screen === "settings" ||
		screen === "how" ||
		screen === "about" ||
		screen === "dev"
	) {
		if (returnScreen === "pause") showPause();
		else if (returnScreen === "result") showResults();
		else toTitle(false);
		return;
	}
	if (screen === "network" || screen === "together") {
		toTitle(false);
		return;
	}
	if (screen === "result") {
		toTitle();
		return;
	}
	if (!screen) showPause();
}
function toTitle(disconnect = true) {
	if (disconnect && net?.connected) net.disconnect();
	paused = false;
	serverOnly = false;
	mode = "solo";
	screen = "title";
	remote = null;
	sim?.start(1, false);
	if (sim) sim.phase = "title";
	$("overlay").hidden = true;
	$("title").hidden = false;
	$("hud").hidden = true;
	$("playBottom").hidden = true;
	$("pauseButton").hidden = true;
	$("banner").hidden = true;
	$("attract").hidden = true;
	$("toast").hidden = true;
	resultTimer = 0;
	lastInput = performance.now();
	audio?.setPaused(false);
	focusIndex = 0;
	queueMicrotask(() => focusAt(0));
}
function startGame(count = 1, attract = false, ids = null) {
	paused = false;
	remote = null;
	resultTimer = 0;
	lastPhase = "playing";
	sim.start(count, attract, ids);
	screen = null;
	$("overlay").hidden = true;
	$("title").hidden = true;
	$("hud").hidden = attract;
	$("playBottom").hidden = attract || serverOnly;
	$("pauseButton").hidden = attract || serverOnly;
	$("attract").hidden = !attract;
	$("banner").hidden = true;
	audio.setPaused(attract);
	if (!attract) {
		audio.sfx("start");
		audio.gibberish("happy");
	}
	updatePrompts();
}
function showPause() {
	if (sim.attract) {
		toTitle();
		return;
	}
	if (!["playing"].includes((remote || sim).phase)) return;
	paused = !net.connected;
	audio.setPaused(paused);
	returnScreen = "pause";
	panel(
		`<div class="eyebrow">TAKE A BREATHER</div><h1>BUCKET BREAK</h1><p>${net.connected ? "Your brigade is still catching. The online game keeps moving." : "The crook can wait. Your buckets are safe."}</p><div class="actions">${btn("Back to the action", "resume", true)}${btn("Settings", "settings")}${btn("How to play", "how")}${btn("Developer tools", "dev")}${net.hubActive ? "" : btn("Back to title", "title")}</div>`,
		"pause",
	);
}
function showTogether() {
	panel(
		`<div class="eyebrow">CALL IN THE BRIGADE</div><h1>BETTER TOGETHER</h1><p>Share three buckets and one splash meter. Any bucket can catch any bomb.</p><div class="actions">${btn("Couch co-op · 2 players", "local", true)}${btn("Host an online room", "host")}${btn("Join an online room", "joinform")}</div><p class="section-note">Couch: P1 uses A/D or mouse; P2 uses ←/→. Two controllers work too. Online uses a free WebRTC signaling service; both players need internet.</p><div class="backline">${btn("← Back", "back")}<span class="tag">SHARED-WORLD CO-OP</span></div>`,
		"together",
	);
}
function showNetwork(join = false) {
	panel(
		`<div class="eyebrow">THE LONG-DISTANCE BRIGADE</div><h1>${join ? "JOIN THE JOB" : "ROOM OPEN"}</h1><p id="networkStatus">${join ? "Get the room code from your friend." : "Opening a room…"}</p>${join ? '<input id="roomCode" type="text" aria-label="Room code" maxlength="8" placeholder="ROOM CODE" autocomplete="off">' : '<div class="result-score" id="roomDisplay" style="font-size:2.8rem;letter-spacing:.08em">······</div>'}<div class="actions">${join ? btn("Join room", "join", true) : '<button id="netStart" class="primary" data-action="netstart" disabled>Waiting for a friend…</button>'}${btn("← Back", "disconnect")}</div>`,
		"network",
	);
}
function showHow() {
	panel(
		`<div class="eyebrow">THE FINE ART OF NOT GOING BOOM</div><h1>CATCH. SPLASH. REPEAT.</h1><div class="controls-grid"><b>${glyph("L", "L", "A D")}</b><span>Slide the bucket stack. Catches are automatic. Mouse movement works too.</span><b>${glyph("✕", "A", "SPACE")}</b><span>Splash! Clear nearby bombs below the windows. Catch bombs to recharge.</span><b>★</b><span>Gold bombs score big and refill almost half your splash meter.</span><b>↗↖</b><span>Pink bombs split in two. Catch between them or use a splash.</span></div><p>A missed bomb costs a bucket and breaks your streak. Survive all five rounds to foil the crook. Every round restores one bucket. Ten catches raise your score multiplier.</p><p class="section-note">Touch: drag anywhere to move; tap with a second finger to splash. Rescue splashes assist when a bomb gets close. Pause with the corner button.</p><div class="backline">${btn("Got it", "back", true)}<span class="tag">3 BUCKETS · 5 ROUNDS</span></div>`,
		"how",
	);
}
function showSettings() {
	panel(
		`<div class="eyebrow">TUNE THE SHOW</div><h1>SETTINGS</h1><div class="row"><label for="music">Music <b id="musicValue">${Math.round(prefs.music * 100)}%</b></label><input id="music" type="range" min="0" max="1" step=".05" value="${prefs.music}" data-pref="music"></div><div class="row"><label for="sfx">Sound & voices <b id="sfxValue">${Math.round(prefs.sfx * 100)}%</b></label><input id="sfx" type="range" min="0" max="1" step=".05" value="${prefs.sfx}" data-pref="sfx"></div><div class="row"><span>Controller prompts</span><button class="small" data-action="glyphs">${prefs.glyphs === "ps" ? "PlayStation · ✕ ○" : "Xbox · A B"}</button></div><div class="row"><span>Screen shake</span><button class="small" data-action="shake">${prefs.shake ? "On" : "Off"}</button></div><p class="section-note">Standard-mapping controllers connect automatically. Music starts at 10%. Your settings and best score stay on this device.</p><div class="backline">${btn("← Back", "back", true)}${btn("Reset settings", "resetprefs")}</div>`,
		"settings",
	);
}
function showDev() {
	const rows = [
		["fallSpeed", "Bomb speed", 0.5, 2, 0.05],
		["dropRate", "Drop frequency", 0.5, 2, 0.05],
		["moveSpeed", "Bucket speed", 5, 35, 1],
		["catchWidth", "Catch half-width", 0.5, 2, 0.05],
		["chargeRate", "Splash recharge", 0.5, 3, 0.1],
	]
		.map(
			([k, label, min, max, step]) =>
				`<div class="row"><label for="dev-${k}">${label} <b id="val-${k}">${sim.settings[k].toFixed(2)}</b></label><input id="dev-${k}" type="range" min="${min}" max="${max}" step="${step}" value="${sim.settings[k]}" data-dev="${k}"></div>`,
		)
		.join("");
	panel(
		`<div class="eyebrow">LIVE BALANCE DESK</div><h1>DEVELOPER TOOLS</h1>${rows}<div class="row"><span>Invincible buckets</span><button class="small" data-action="invincible">${sim.settings.invincible ? "On" : "Off"}</button></div><div class="row"><span>AI catcher</span><button class="small" data-action="autocatch">${sim.settings.autoCatch ? "On" : "Off"}</button></div><div class="actions" style="grid-template-columns:1fr 1fr">${btn("Next round", "skip")}${btn("Refill buckets", "refill")}${btn("Reset balance", "resetdev")}${btn("← Back", "back", true)}</div><p class="section-note">Balance changes apply live. Resume to try them. These tools never alter the default balance.</p>`,
		"dev",
	);
}
function feedbackHtml(title, questions, answers) {
	return (
		`<h2>${title}</h2>` +
		questions
			.map(
				(q, i) => `<p><b>${esc(q)}</b><br>${esc(answers[i] || "unknown")}</p>`,
			)
			.join("")
	);
}
function showAbout() {
	const s = credits.sourceInformation;
	panel(
		`<div class="eyebrow">THE PEOPLE BEHIND THE BUCKETS</div><h1>ABOUT THE SHOW</h1><p class="section-note">Scroll with ↑ ↓, the left stick, or a swipe. Esc / Circle / B goes back.</p><p>An original rooftop caper inspired by <b>Kaboom! (1981)</b>. The little crook, falling bombs and dwindling bucket stack celebrate its brilliant one-more-try rhythm.</p><div class="credits-text"><h2>Source Information</h2>${Object.entries(
			s,
		)
			.map(
				([k, v]) =>
					`<p><b>${esc(k[0].toUpperCase() + k.slice(1))}:</b> ${esc(v)}</p>`,
			)
			.join(
				"",
			)}${feedbackHtml("Testing Feedback", ["Issues caught by testing", "Critical / game-breaking issues", "Most helpful test", "Least helpful test"], credits.testingFeedback)}${feedbackHtml("Engine Feedback", ["What worked best", "Where I got stuck or guessed wrong", "Most important custom system", "Hardest engine task", "Engine changes", "One desired engine improvement"], credits.engineFeedback)}${feedbackHtml("Prompt Feedback", ["What worked best", "What was confusing", "Hardest part", "Suggested prompt change"], credits.promptFeedback)}<h2>Credits</h2><p>Game, procedural art, animation, music and gibberish: OpenAI gpt-6.1-sol. Three.js: MIT. Rapier: Apache-2.0. PeerJS: MIT. AI Hub session integration: linked project. No external art or audio files.</p><p>Title chosen with Python secrets.choice from 50 original candidates.</p></div><div class="backline">${btn("← Back", "back", true)}<span class="tag">KAPOP · 2026</span></div>`,
		"about",
	);
}
function showResults() {
	if (sim.attract) return;
	const s = remote || sim.snapshot(),
		won = s.phase === "victory";
	paused = false;
	audio.setPaused(false);
	panel(
		`<div class="eyebrow">${won ? "THE CROOK HAS LEFT THE BUILDING" : "A LITTLE SPLASH. A BIG KAPOP."}</div><h1>${won ? "CLEAN SWEEP!" : "OUT OF BUCKETS"}</h1><p>${won ? "Five rounds. One very soggy crook. The neighbourhood owes you a dry towel." : "The buckets went out with a bang. The next run is yours."}</p><div class="result-score">${String(s.score || 0).padStart(6, "0")}</div><div class="eyebrow">${s.score >= high ? "BEST ON THIS DEVICE" : `BEST ${String(high).padStart(6, "0")}`}</div><div class="stats"><div><strong>${s.stats?.caught || 0}</strong>BOMBS CAUGHT</div><div><strong>${s.bestCombo || 0}</strong>BEST STREAK</div><div><strong>${s.stats?.pops || 0}</strong>SPLASHES</div></div><div class="actions">${btn(net.connected ? (net.role === "host" ? "Play again with brigade" : "Back to title") : "Give it another go", net.connected && net.role !== "host" ? "title" : "retry", true)}${btn("Back to title", "title")}${btn("About & credits", "resultabout")}</div>`,
		"result",
	);
}
function action(a) {
	if (
		net?.hubActive &&
		[
			"title",
			"retry",
			"disconnect",
			"solo",
			"local",
			"host",
			"joinform",
			"join",
			"together",
		].includes(a)
	)
		return;
	audio?.unlock();
	audio?.sfx("ui");
	switch (a) {
		case "solo":
			mode = "solo";
			localIndex = 0;
			startGame();
			break;
		case "local":
			mode = "local";
			localIndex = 0;
			startGame(2);
			break;
		case "together":
			showTogether();
			break;
		case "how":
			if (screen === "title") returnScreen = "title";
			showHow();
			break;
		case "settings":
			if (screen === "title") returnScreen = "title";
			showSettings();
			break;
		case "about":
			returnScreen = "title";
			showAbout();
			break;
		case "resultabout":
			returnScreen = "result";
			showAbout();
			break;
		case "pause":
			showPause();
			break;
		case "resume":
			closePanel();
			break;
		case "title":
			toTitle();
			break;
		case "back":
			back();
			break;
		case "glyphs":
			prefs.glyphs = prefs.glyphs === "ps" ? "xbox" : "ps";
			save();
			showSettings();
			updatePrompts();
			break;
		case "shake":
			prefs.shake = !prefs.shake;
			save();
			showSettings();
			break;
		case "resetprefs":
			Object.assign(prefs, {
				music: 0.1,
				sfx: 0.65,
				glyphs: "ps",
				shake: true,
			});
			save();
			audio.setVolumes(prefs.music, prefs.sfx);
			showSettings();
			break;
		case "dev":
			showDev();
			break;
		case "invincible":
			sim.settings.invincible = !sim.settings.invincible;
			showDev();
			break;
		case "autocatch":
			sim.settings.autoCatch = !sim.settings.autoCatch;
			showDev();
			break;
		case "resetdev":
			Object.assign(sim.settings, DEFAULTS);
			showDev();
			break;
		case "skip":
			sim.skip();
			showDev();
			break;
		case "refill":
			sim.lives = 3;
			sim.charge = 1;
			sim.players.forEach((p) => {
				p.lives = 3;
			});
			toast("BUCKETS REFILLED");
			break;
		case "retry":
			if (net.connected && net.role === "host") net.start();
			else startGame(mode === "local" ? 2 : 1);
			break;
		case "host":
			showNetwork();
			net.host().catch((e) => toast(e.message, 5));
			break;
		case "joinform":
			showNetwork(true);
			break;
		case "join": {
			const c = $("roomCode").value.trim();
			if (c) net.join(c).catch((e) => toast(e.message, 5));
			break;
		}
		case "netstart":
			net.start();
			break;
		case "disconnect":
			net.disconnect();
			showTogether();
			break;
	}
}
function event(e) {
	eventLog.push(e.type);
	if (eventLog.length > 1000) eventLog.shift();
	if (!scene) return;
	const silent = sim?.attract;
	switch (e.type) {
		case "catch":
		case "gold":
			scene.effects(e.type, e.x, e.y);
			if (!silent) {
				audio.sfx(e.type === "gold" ? "power" : "catch", (e.combo % 8) * 2);
				if (e.combo % 10 === 0) {
					toast(`${e.combo} IN A ROW! ×${1 + Math.floor(e.combo / 10)}`);
					audio.sfx("combo");
				}
			}
			break;
		case "pop":
			scene.effects("pop", e.x, e.y);
			if (!silent) audio.sfx("splash");
			break;
		case "miss":
			scene.effects("miss", e.x, e.y);
			if (!silent) {
				audio.sfx("bomb");
				audio.gibberish("sad");
				toast("WHOOPS! ONE BUCKET DOWN", 1.5);
			}
			break;
		case "split":
			scene.effects("catch", e.x, e.y, "#f28da3");
			break;
		case "wave":
			if (!silent) {
				audio.sfx("wave");
				if (e.wave > 1) audio.gibberish("happy");
			}
			break;
		case "clear":
			if (!silent)
				toast(e.perfect ? "PERFECT ROUND! +1,000" : "ROUND CLEAR! +400", 2);
			break;
		case "victory":
			scene.effects("victory", 0, 5);
			if (!silent) {
				audio.sfx("victory");
				audio.gibberish("happy");
			}
			finish();
			break;
		case "gameover":
			if (!silent) audio.sfx("gameover");
			finish();
			break;
	}
}
function finish() {
	if (sim.attract) {
		attractEnd = 3;
		return;
	}
	high = Math.max(high, sim.score);
	save();
	resultTimer = 1.25;
	if (net?.connected && net.role === "host")
		net.finish(sim.phase === "victory", sim.score, sim.stats, sim.snapshot());
}
function pop(i = localIndex) {
	if (serverOnly || i < 0) return;
	if (net?.role === "guest" && net.connected) {
		net.sendInput({ x: inputX, pop: true });
		audio.sfx("splash");
	} else sim.pop(i);
}
let inputX = 0;
function moveTarget(x, i = localIndex) {
	if (i < 0 || serverOnly) return;
	inputX = clamp(x, -7.15, 7.15);
	if (net?.role === "guest" && net.connected)
		net.sendInput({ x: inputX, pop: false });
	else sim.setTarget(i, inputX);
}
function onKeys(e, down) {
	if (
		[
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Space",
			"Escape",
			"Tab",
			"Enter",
		].includes(e.code)
	)
		e.preventDefault();
	if (down) {
		const exited = noteInput();
		audio?.unlock();
		if (exited) return;
		if (e.repeat) return;
		if (e.code === "Escape") {
			back();
			return;
		}
		if (screen) {
			if (e.target?.tagName === "INPUT" && e.target.type === "text") {
				if (e.code === "Enter") action("join");
				return;
			}
			if (e.code === "Tab") navigate(0, e.shiftKey ? -1 : 1);
			else if (e.code === "ArrowDown" || e.code === "KeyS") navigate(0, 1);
			else if (e.code === "ArrowUp" || e.code === "KeyW") navigate(0, -1);
			else if (e.code === "ArrowLeft" || e.code === "KeyA") navigate(-1, 0);
			else if (e.code === "ArrowRight" || e.code === "KeyD") navigate(1, 0);
			else if (e.code === "Enter" || e.code === "Space") {
				const list = focusables();
				list[focusIndex]?.click();
			}
			return;
		}
		keys.add(e.code);
		if (e.code === "Space") pop(0);
		if (e.code === "Enter" || e.code === "ShiftRight")
			pop(mode === "local" ? 1 : 0);
	} else keys.delete(e.code);
}
window.addEventListener("keydown", (e) => onKeys(e, true));
window.addEventListener("keyup", (e) => onKeys(e, false));
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) {
		if (
			noteInput(
				e.pointerType === "touch"
					? "touch"
					: lastDevice === "pad"
						? "pad"
						: "mouse",
			)
		)
			return;
		action(b.dataset.action);
	}
});
document.addEventListener("pointerover", (e) => {
	if (e.pointerType === "touch") return;
	const b = e.target.closest("button,input");
	if (b && screen) {
		noteInput("mouse");
		const i = focusables().indexOf(b);
		if (i >= 0) focusAt(i);
	}
});
document.addEventListener("input", (e) => {
	const p = e.target.dataset.pref,
		d = e.target.dataset.dev;
	if (p) {
		prefs[p] = Number(e.target.value);
		$(`${p}Value`).textContent = `${Math.round(prefs[p] * 100)}%`;
		audio.setVolumes(prefs.music, prefs.sfx);
		save();
	}
	if (d) {
		sim.settings[d] = Number(e.target.value);
		$(`val-${d}`).textContent = sim.settings[d].toFixed(2);
	}
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") {
		const t = touches.get(e.pointerId);
		if (t && !screen) {
			moveTarget(t.world + ((e.clientX - t.x) / innerWidth) * 19);
			t.moved = true;
		}
		return;
	}
	if (noteInput("mouse")) return;
	if (!screen && ready) {
		moveTarget(scene.worldFromPointer(e.clientX, e.clientY).x);
	}
});
window.addEventListener("pointerdown", (e) => {
	if (e.target.closest("button,input")) return;
	const device = e.pointerType === "touch" ? "touch" : "mouse";
	if (noteInput(device)) return;
	audio?.unlock();
	if (e.pointerType === "touch") {
		if (!screen) {
			if (touches.size) pop();
			else {
				const p = (remote || sim.snapshot()).players[localIndex];
				touches.set(e.pointerId, {
					x: e.clientX,
					world: p?.x || 0,
					moved: false,
					time: performance.now(),
				});
			}
		}
	} else if (!screen) pop();
});
window.addEventListener("pointerup", (e) => {
	touches.delete(e.pointerId);
});
window.addEventListener("pointercancel", (e) => touches.delete(e.pointerId));
$("splash").addEventListener("click", () => {
	if (!screen) {
		noteInput(lastDevice);
		audio.unlock();
		pop();
	}
});
window.addEventListener("blur", () => {
	keys.clear();
	if (ready && !screen && !sim.attract && !net.connected) showPause();
});
function pads(dt) {
	const pads = Array.from(navigator.getGamepads?.() || []);
	pads.forEach((pad, i) => {
		if (!pad) return;
		const b = pad.buttons.map((v) => v.pressed),
			prev = prevButtons[i] || [];
		const pressed = (n) => b[n] && !prev[n];
		let x = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0,
			y = Math.abs(pad.axes[1] || 0) > 0.45 ? pad.axes[1] : 0;
		x += b[15] ? 1 : b[14] ? -1 : 0;
		y += b[13] ? 1 : b[12] ? -1 : 0;
		const active =
			Math.abs(x) + Math.abs(y) > 0 || b.some((v, n) => v && !prev[n]);
		if (active && noteInput("pad")) {
			prevButtons[i] = b;
			return;
		}
		if (active) audio.unlock();
		if (screen) {
			const now = performance.now();
			if ((x || y) && now - lastNav > 185) {
				navigate(Math.sign(x), Math.sign(y));
				lastNav = now;
			}
			if (pressed(0)) {
				const list = focusables();
				list[focusIndex]?.click();
			}
			if (pressed(1) || (pressed(9) && !b[8])) back();
		} else {
			const index = mode === "local" ? i : localIndex;
			if (index >= 0) {
				const p = (remote || sim.snapshot()).players[index];
				if (p && x)
					moveTarget(
						p.x + clamp(x, -1, 1) * sim.settings.moveSpeed * dt,
						index,
					);
				if (pressed(0) || pressed(7)) pop(index);
			}
			if (pressed(9) && !b[8]) showPause();
		}
		prevButtons[i] = b;
	});
}
function updateHud(s) {
	$("score").textContent = String(s.score).padStart(6, "0");
	$("highScore").textContent = `· BEST ${String(high).padStart(6, "0")}`;
	$("roundLabel").textContent = `ROUND ${String(s.wave).padStart(2, "0")} / 05`;
	$("roundName").textContent = WAVES[s.wave - 1].name;
	$("roundProgress").style.width = `${(s.spawned / s.quota) * 100}%`;
	$("buckets").textContent =
		`${s.lives} BUCKET${s.lives === 1 ? "" : "S"} LEFT`;
	$("combo").innerHTML =
		s.combo >= 3
			? `${s.combo}<small>${s.combo >= 10 ? `×${1 + Math.floor(s.combo / 10)} MULTIPLIER` : "CATCH STREAK"}</small>`
			: "";
	$("charge").style.width = `${s.charge * 100}%`;
	$("splash").classList.toggle("ready", s.charge >= 0.999);
	$("splashLabel").textContent =
		s.charge >= 0.999
			? glyph(
					"✕ · SPLASH READY",
					"A · SPLASH READY",
					lastDevice === "touch"
						? "TAP · SPLASH READY"
						: "SPACE / CLICK · SPLASH READY",
				)
			: `SPLASH RECHARGING · ${Math.round(s.charge * 100)}%`;
	$("splash").style.background = s.charge >= 0.999 ? "#c4e6ce" : "var(--paper)";
	const waiting = net.connected && !net.canPlay && s.phase === "playing";
	if ((s.intro > 0 || waiting) && !screen && !s.attract) {
		const w = WAVES[s.wave - 1];
		$("banner").hidden = false;
		$("banner").innerHTML =
			`<div class="eyebrow">${waiting ? "BRIGADE ASSEMBLING" : `ROUND ${s.wave} / 5`}</div><h2>${w.name}</h2><p>${waiting ? "Get your buckets ready…" : w.subtitle}</p><div class="eyebrow" style="margin-top:.7rem">${waiting ? "STARTING TOGETHER" : s.intro > 1 ? "READY?" : "HERE WE GO!"}</div>`;
	} else $("banner").hidden = true;
	$("devBadge").hidden = !Object.keys(DEFAULTS).some(
		(k) => sim.settings[k] !== DEFAULTS[k],
	);
}
function frame(now) {
	requestAnimationFrame(frame);
	if (!ready) return;
	const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
	frame.last = now;
	if (testFrozen) return;
	pads(dt);
	gameClock += dt;
	if (!screen && !sim.attract && !serverOnly) {
		const s = remote || sim.snapshot();
		if (mode === "local") {
			if (keys.has("KeyA") || keys.has("KeyD"))
				moveTarget(
					s.players[0].x +
						((keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0)) *
							sim.settings.moveSpeed *
							dt,
					0,
				);
			if (keys.has("ArrowLeft") || keys.has("ArrowRight"))
				moveTarget(
					s.players[1].x +
						((keys.has("ArrowRight") ? 1 : 0) -
							(keys.has("ArrowLeft") ? 1 : 0)) *
							sim.settings.moveSpeed *
							dt,
					1,
				);
		} else {
			const axis =
				(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
				(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
			if (axis)
				moveTarget(
					(s.players[localIndex]?.x || 0) + axis * sim.settings.moveSpeed * dt,
				);
		}
	}
	if (screen === "title" && !net.hubActive && now - lastInput >= 10000) {
		mode = "solo";
		startGame(1, true);
	}
	const canStep =
		!paused && (!net.connected || (net.role === "host" && net.canPlay));
	if (canStep && sim.phase === "playing") {
		acc += dt;
		while (acc >= 1 / 60) {
			sim.step(1 / 60);
			acc -= 1 / 60;
		}
	}
	if (sim.attract && sim.phase !== "playing") {
		attractEnd -= dt;
		if (attractEnd <= 0) startGame(1, true);
	}
	const s =
		net.connected && net.role === "guest" && remote ? remote : sim.snapshot();
	if (s.phase === "title") {
		s.time = gameClock;
		s.bomberX = Math.sin(gameClock * 0.5) * 4;
		s.players[0].x = Math.sin(gameClock * 0.7) * 3;
		s.players[0].lives = 3;
		s.lives = 3;
	}
	if (
		lastDevice === "touch" &&
		!screen &&
		s.phase === "playing" &&
		s.charge >= 0.999
	) {
		const p = s.players[localIndex];
		if (
			p &&
			s.bombs.some(
				(b) =>
					b.y < 2.7 &&
					b.y > 1.2 &&
					Math.abs(b.x - p.x) > 1.15 &&
					Math.abs(b.x - p.x) < 3.5,
			)
		)
			pop();
	}
	if (!prefs.shake) {
		s.shake = 0;
		scene.shake = 0;
	}
	scene.update(dt, s);
	scene.render();
	updateHud(s);
	audio.update(dt, {
		active: s.phase === "playing" && !paused && !s.attract,
		wave: s.wave,
		combo: s.combo,
	});
	net.update(dt, s);
	if (toastTime > 0) {
		toastTime -= dt;
		if (toastTime <= 0) $("toast").hidden = true;
	}
	if (resultTimer > 0) {
		resultTimer -= dt;
		if (resultTimer <= 0) showResults();
	}
	if (
		net.connected &&
		net.role === "guest" &&
		remote &&
		(remote.phase === "victory" || remote.phase === "gameover") &&
		lastPhase !== remote.phase
	) {
		lastPhase = remote.phase;
		high = Math.max(high, remote.score);
		save();
		resultTimer = 1;
		audio.sfx(remote.phase === "victory" ? "victory" : "gameover");
	}
}
async function boot() {
	audio = new GameAudio();
	audio.setVolumes(prefs.music, prefs.sfx);
	sim = new GameSim(event);
	await initPhysics();
	scene = await new GameScene().init($("world"));
	net = new Network({
		onStatus: (msg) => {
			if ($("networkStatus")) $("networkStatus").textContent = msg;
			if ($("roomDisplay"))
				$("roomDisplay").textContent = net.roomCode || "······";
			if ($("netStart")) {
				$("netStart").disabled = net.players.length < 2;
				$("netStart").textContent =
					net.players.length >= 2 ? "Start the show" : "Waiting for a friend…";
			}
		},
		onRoster: (players) => {
			if ($("netStart")) {
				$("netStart").disabled = players.length < 2;
				$("netStart").textContent =
					players.length >= 2 ? "Start the show" : "Waiting for a friend…";
			}
		},
		onStart: (info) => {
			mode = "online";
			serverOnly = info.server;
			const ids = info.players.map((p) => p.id);
			localIndex = ids.indexOf(info.me);
			startGame(ids.length, false, ids);
			inputX = sim.players[Math.max(0, localIndex)]?.x || 0;
			net.sendInput({ x: inputX, pop: false });
		},
		onInput: (id, input) => {
			const i = sim.players.findIndex((p) => p.id === id);
			if (i >= 0) {
				sim.setTarget(i, input.x);
				if (input.pop) sim.pop(i);
			}
		},
		onState: (state) => {
			remote = state;
		},
		onEnd: (e) => {
			if (net.hubActive) {
				paused = true;
				screen = "hubend";
				resultTimer = 0;
				$("overlay").hidden = true;
				$("banner").hidden = true;
				audio.setPaused(true);
				audio.setVolumes(0, 0);
				return;
			}
			if (e?.reason === "peer-left") {
				toast("PARTNER DISCONNECTED", 5);
			}
			if (!resultTimer && screen !== "result" && !sim.attract) {
				const s = { ...(e?.state || remote || sim.snapshot()) };
				s.phase = e?.won === true ? "victory" : "gameover";
				if (Number.isFinite(e?.score)) s.score = e.score;
				if (net.role === "guest") remote = s;
				else sim.phase = s.phase;
				high = Math.max(high, s.score);
				save();
				resultTimer = 1;
			}
		},
		onTimeUp: () => {
			if (net.role === "host" && sim.phase === "playing") {
				sim.phase = "victory";
				finish();
			}
		},
	});
	ready = true;
	toTitle(false);
	$("loading").hidden = true;
	updatePrompts();
	window.addEventListener("resize", () => scene.resize());
	requestAnimationFrame(frame);
	window.__kapop = {
		ready: true,
		sim,
		scene,
		audio,
		network: net,
		credits,
		testAudio,
		snapshot: () => remote || sim.snapshot(),
		get screen() {
			return screen;
		},
		get device() {
			return lastDevice;
		},
		get paused() {
			return paused;
		},
		get high() {
			return high;
		},
		events: eventLog,
		start: (n = 1) => {
			mode = n > 1 ? "local" : "solo";
			localIndex = 0;
			startGame(n);
		},
		attract: () => startGame(1, true),
		title: () => toTitle(),
		step: (n) => {
			for (let i = 0; i < n; i++) sim.step(1 / 60);
			return sim.snapshot();
		},
		freeze: (v) => {
			testFrozen = v;
		},
		action,
		settings: prefs,
		input: (x, i = 0) => moveTarget(x, i),
		pop,
		forceIdle: () => {
			lastInput = performance.now() - 10001;
		},
		inspect: () => ({
			engine: scene.inspect(),
			audio: audio.inspect(),
			screen,
			device: lastDevice,
			paused,
			network: {
				role: net.role,
				players: net.players,
				connected: net.connected,
			},
		}),
	};
	await net.init();
	if (net.hubActive && !net.started) {
		screen = "hubwait";
		$("title").hidden = true;
		$("overlay").hidden = true;
		$("pauseButton").hidden = true;
	}
}
boot().catch((e) => {
	console.error(e);
	$("loadText").textContent = `The stage could not open: ${e.message}`;
	document.querySelector(".spin").hidden = true;
});
