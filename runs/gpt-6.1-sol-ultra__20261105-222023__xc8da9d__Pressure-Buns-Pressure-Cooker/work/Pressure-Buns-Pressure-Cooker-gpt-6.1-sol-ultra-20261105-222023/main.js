import RAPIER from "@dimforge/rapier3d-compat";
import { createAudio } from "./audio.js";
import interview from "./exit-interview.json";
import { COLORS, createGame, DEFAULTS } from "./game.js";
import { createNetwork } from "./network.js";
import { createScene } from "./scene.js";

const $ = (id) => document.getElementById(id);
const screens = [
	"title",
	"pause",
	"how",
	"settings",
	"online",
	"dev",
	"about",
	"result",
];
let codeEditing = false,
	codePosition = 0;
let scene,
	game,
	network,
	audio,
	screen = "title",
	backScreen = "title",
	lastInput = "keyboard",
	glyph = "ps",
	lastActivity = performance.now(),
	hubEnded = false,
	menuIndex = 0,
	menuClock = 0,
	prevMode = "title",
	transitionTimer = 0,
	localCoop = false,
	mouseTarget = null;
const keys = new Set(),
	pressed = new Set(),
	padPrevious = new Map(),
	remoteInputs = {},
	touch = {
		id: null,
		x: 0,
		z: 0,
		action: false,
		dash: false,
		originX: 0,
		originY: 0,
		rightId: null,
		rightStart: 0,
		lastRightTap: 0,
	};
function setScreen(name, back) {
	if (name !== "online") {
		codeEditing = false;
		$("codeWheel").hidden = true;
	}
	if (back !== undefined) backScreen = back;
	screen = name;
	for (const id of screens) $(id + "Screen").hidden = id !== name;
	$("transition").hidden = true;
	$("hud").hidden =
		!!name && !["pause", "dev", "settings", "how"].includes(name);
	if (name === "title") {
		try {
			const record = +localStorage.getItem("pressure-buns-best") || 0;
			$("houseBest").textContent = record
				? "HOUSE RECORD · " + String(record).padStart(5, "0")
				: "YOUR SPATULA. YOUR SHIFT. YOUR NAME IN LIGHTS.";
		} catch {}
		$("hud").hidden = true;
		$("attract").hidden = true;
		lastActivity = performance.now();
	}
	if (name) {
		menuIndex = 0;
		queueMicrotask(() => focusMenu(0));
	}
	updatePrompts();
}
function menuElements() {
	const parent = screen ? $(screen + "Screen") : null;
	return parent
		? [...parent.querySelectorAll("button,input")].filter(
				(el) => el.offsetParent !== null && !el.disabled,
			)
		: [];
}
function focusMenu(index) {
	const list = menuElements();
	if (!list.length) return;
	menuIndex = (index + list.length) % list.length;
	document.querySelectorAll(".focused").forEach((x) => {
		x.classList.remove("focused");
	});
	list[menuIndex].classList.add("focused");
	if (lastInput === "gamepad")
		list[menuIndex].scrollIntoView({ block: "nearest" });
}
function navigate(delta) {
	focusMenu(menuIndex + delta);
	audio?.play("menu");
}
function activity(type) {
	lastActivity = performance.now();
	if (lastInput !== type) {
		lastInput = type;
		document.body.classList.toggle("touch", type === "touch");
		updatePrompts();
	}
	if (game?.state.attract) {
		game.state.attract = false;
		game.state.mode = "title";
		setScreen("title");
		return true;
	}
	return false;
}
function prompt(type) {
	const ps = {
		action: "×",
		reject: "□",
		dash: "○",
		pause: "OPTIONS",
		start: "×",
	};
	const xbox = {
		action: "A",
		reject: "X",
		dash: "B",
		pause: "MENU",
		start: "A",
	};
	const keyboard = {
		action: "E",
		reject: "Q",
		dash: "SPACE",
		pause: "ESC",
		start: "↵",
	};
	return (lastInput === "gamepad" ? (glyph === "ps" ? ps : xbox) : keyboard)[
		type
	];
}
function updatePrompts() {
	document.querySelectorAll("[data-prompt]").forEach((el) => {
		el.textContent = prompt(el.dataset.prompt);
	});
	document.querySelectorAll(".startGlyph").forEach((el) => {
		el.textContent = prompt("start");
	});
	$("prompts").innerHTML =
		`<span><span class="key">${lastInput === "gamepad" ? "L" : "WASD"}</span>Move</span><span><span class="key">${prompt("action")}</span>Serve</span><span><span class="key">${prompt("reject")}</span>Reject</span><span><span class="key">${prompt("dash")}</span>Dash</span>`;
}
function back() {
	if (screen === "online" && !network.hubActive) {
		network.leave();
		$("net-room").textContent = "";
		$("net-start").hidden = true;
	}
	if (network?.hubActive && screen === "pause") {
		setScreen(null);
		return;
	}
	if (screen === "pause") {
		setScreen(null);
	} else if (screen === "dev") {
		setScreen("pause");
	} else if (screen) {
		setScreen(backScreen || "title");
	} else pause();
}
function pause() {
	if (game.state.attract) {
		activity(lastInput);
		return;
	}
	if (game.state.mode !== "play") return;
	setScreen(screen === "pause" ? null : "pause");
	audio.play("menu");
	keys.clear();
	mouseTarget = null;
}
function event(name, data = {}) {
	if (!audio) return;
	audio.play(name === "shift" ? "win" : name);
	if (["serve", "start", "wrong", "win", "lose"].includes(name))
		audio.voice(name === "wrong" ? "grumpy" : "happy");
	if (scene && data.x !== undefined)
		scene.burst(
			data.x,
			data.z,
			data.color ||
				{
					tomato: "#e96545",
					lettuce: "#7cae56",
					cheese: "#efc252",
					onion: "#b68cc6",
					bun: "#e6aa58",
				}[data.type] ||
				"#efc252",
			name === "serve" ? 24 : 8,
		);
	if (
		network?.isHost &&
		network.connected &&
		["serve", "win", "lose", "start"].includes(name)
	)
		network.sendEvent({ name, data });
}
function startRun(endless = false) {
	if (network.hubActive) return;
	if (network.connected && !network.isHost) {
		network.sendEvent({ name: "request-run", data: { endless } });
		setScreen(null);
		return;
	}
	const ids = network.connected ? [0, 1] : localCoop ? [0, 1] : [0];
	game.start({ endless, players: ids });
	setScreen(null);
	$("hud").hidden = false;
	$("attract").hidden = true;
	prevMode = "play";
	mouseTarget = null;
	keys.clear();
	audio.unlock();
}
function bind(id, fn) {
	$(id).addEventListener("click", (e) => {
		if (e.detail > 0)
			activity(e.pointerType === "touch" ? "touch" : "keyboard");
		audio?.unlock();
		audio?.play("menu");
		fn();
	});
}
function renderCredits(tab = "source") {
	const content = $("creditsContent");
	content.replaceChildren();
	if (tab === "source") {
		for (const [key, value] of Object.entries(interview.sourceInformation)) {
			const row = document.createElement("div");
			row.className = "credits-row";
			const b = document.createElement("b");
			b.textContent = key.replace(/([A-Z])/g, " $1");
			const span = document.createElement("span");
			span.textContent = value;
			row.append(b, span);
			content.append(row);
		}
		const row = document.createElement("p");
		row.className = "hint";
		row.innerHTML =
			'Research: <a href="https://www.atariage.com/manual_html_page.php?SoftwareLabelID=375" target="_blank" rel="noreferrer">1983 instruction manual</a> · <a href="https://www.atariprotos.com/2600/software/pressurecooker/pressurecooker.htm" target="_blank" rel="noreferrer">original screenshots</a> · <a href="https://garrykitchen.medium.com/how-i-fixed-ataris-awful-music-2d21abd7930d" target="_blank" rel="noreferrer">Garry Kitchen on music</a>. Original code, models, music and voices created for this demo. Inspired by Garry Kitchen’s Pressure Cooker (Activision, 1983).';
		if (network?.hubActive)
			row.querySelectorAll("a").forEach((a) => {
				a.replaceWith(document.createTextNode(a.textContent));
			});
		content.append(row);
	} else {
		const questions = {
			testing: [
				"How many issues did testing catch?",
				"How many were critical or game breaking?",
				"Most helpful test?",
				"Least helpful test?",
			],
			engine: [
				"What did you like most about the engine?",
				"Did you get stuck or guess wrong?",
				"Most important thing built yourself?",
				"Hardest part about using the engine?",
				"What changed in the engine, and why?",
				"One thing you would change?",
			],
			prompt: [
				"What did you like most about the prompt?",
				"What was confusing?",
				"What was hardest?",
				"What would you change?",
			],
		}[tab];
		interview[tab + "Feedback"].forEach((answer, i) => {
			const row = document.createElement("div");
			row.className = "feedback-item";
			const b = document.createElement("b");
			b.textContent = questions[i];
			row.append(b, document.createTextNode(answer));
			content.append(row);
		});
	}
	document.querySelectorAll("[data-tab]").forEach((b) => {
		b.style.background = b.dataset.tab === tab ? "#f1c461" : "";
	});
}
function buildDev() {
	const entries = [
		["playerSpeed", "Chef speed", 2, 9, 0.1],
		["beltSpeed", "Belt speed", 0.25, 3, 0.05],
		["ingredientSpeed", "Flying food speed", 0.5, 2, 0.05],
		["spawnInterval", "Dispenser interval", 1, 5, 0.1],
		["pressureLoss", "Mistake cost", 0, 3, 0.1],
	];
	$("devSliders").replaceChildren();
	for (const [key, label, min, max, step] of entries) {
		const row = document.createElement("div");
		row.className = "settings-row";
		const lab = document.createElement("label");
		lab.htmlFor = "dev-" + key;
		lab.textContent = label;
		const output = document.createElement("output");
		output.textContent = game.config[key].toFixed(2);
		lab.append(output);
		const input = document.createElement("input");
		Object.assign(input, {
			type: "range",
			id: "dev-" + key,
			min,
			max,
			step,
			value: game.config[key],
		});
		input.oninput = () => {
			game.config[key] = +input.value;
			output.textContent = (+input.value).toFixed(2);
		};
		row.append(lab, input);
		$("devSliders").append(row);
	}
	$("devAI").textContent = "AI cook: " + (game.config.autoplay ? "On" : "Off");
	$("devGod").textContent =
		"Infinite spirit: " + (game.config.invincible ? "On" : "Off");
}
function wireMenus() {
	bind("play", () => startRun());
	bind("online", () => setScreen("online", "title"));
	bind("how", () => setScreen("how", "title"));
	bind("settings", () => setScreen("settings", "title"));
	bind("about", () => {
		renderCredits();
		setScreen("about", "title");
	});
	bind("resume", () => setScreen(null));
	bind("pauseButton", pause);
	bind("pauseSettings", () => setScreen("settings", "pause"));
	bind("pauseHow", () => setScreen("how", "pause"));
	bind("dev", () => {
		buildDev();
		setScreen("dev", "pause");
	});
	bind("quit", quit);
	bind("resultQuit", quit);
	bind("retry", () => startRun());
	bind("endless", () => startRun(true));
	bind("glyphs", () => {
		glyph = glyph === "ps" ? "xbox" : "ps";
		$("glyphs").textContent =
			"Controller glyphs: " + (glyph === "ps" ? "PlayStation" : "Xbox");
		updatePrompts();
		saveSettings();
	});
	bind("assist", () => {
		game.config.assist = !game.config.assist;
		$("assist").textContent =
			"Catch & serve assist: " + (game.config.assist ? "On" : "Off");
		saveSettings();
	});
	bind("fullscreen", () => {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else document.documentElement.requestFullscreen?.().catch(() => {});
	});
	bind("net-host", async () => {
		const code = await network.host();
		$("net-room").textContent = code;
		$("net-start").hidden = false;
		$("net-start").textContent = "Start cooking · waiting for a friend";
	});
	bind("net-join", () => network.join($("net-code").value));
	$("net-code").addEventListener("keydown", (e) => {
		if (e.code === "Enter") {
			e.preventDefault();
			activity("keyboard");
			audio.unlock();
			network.join($("net-code").value);
		}
	});
	bind("net-start", () => startRun());
	bind("devAI", () => {
		game.config.autoplay = !game.config.autoplay;
		buildDev();
	});
	bind("devGod", () => {
		game.config.invincible = !game.config.invincible;
		buildDev();
	});
	bind("devFill", () => {
		game.state.performance = 99;
	});
	bind("devSkip", () => {
		if (game.state.shift >= 3) {
			game.state.mode = "victory";
			setScreen(null);
		} else {
			game.nextShift();
			setScreen(null);
		}
	});
	bind("devReset", () => {
		Object.assign(game.config, DEFAULTS);
		buildDev();
	});
	for (const el of document.querySelectorAll("[data-back]")) el.onclick = back;
	for (const el of document.querySelectorAll("[data-tab]"))
		el.onclick = () => renderCredits(el.dataset.tab);
	for (const id of ["music", "sfx"]) {
		$(id).oninput = () => {
			audio[id === "music" ? "setMusic" : "setSfx"](+$(id).value / 100);
			$(id + "Out").textContent = $(id).value + "%";
			saveSettings();
		};
	}
	document.addEventListener("pointerover", (e) => {
		const el = e.target.closest("button,input");
		if (el && screen) {
			const list = menuElements();
			const n = list.indexOf(el);
			if (n >= 0) focusMenu(n);
		}
	});
}
function saveSettings() {
	try {
		localStorage.setItem(
			"pressure-buns-settings",
			JSON.stringify({
				music: +$("music").value,
				sfx: +$("sfx").value,
				glyph,
				assist: game.config.assist,
			}),
		);
	} catch {}
}
function loadSettings() {
	try {
		const s = JSON.parse(localStorage.getItem("pressure-buns-settings"));
		if (s) {
			for (const id of ["music", "sfx"])
				if (s[id] !== undefined) {
					$(id).value = s[id];
					$(id + "Out").textContent = s[id] + "%";
					audio[id === "music" ? "setMusic" : "setSfx"](s[id] / 100);
				}
			glyph = s.glyph || "ps";
			game.config.assist = !!s.assist;
			$("assist").textContent =
				"Catch & serve assist: " + (game.config.assist ? "On" : "Off");
			$("glyphs").textContent =
				"Controller glyphs: " + (glyph === "ps" ? "PlayStation" : "Xbox");
		}
	} catch {}
}
function quit() {
	if (network.hubActive) {
		setScreen(null);
		return;
	}
	network.leave();
	game.state.mode = "title";
	game.state.attract = false;
	localCoop = false;
	game.start({ attract: true });
	game.state.mode = "title";
	game.state.attract = false;
	setScreen("title");
}
function handleKeys() {
	document.addEventListener("keydown", (e) => {
		if (
			[
				"Space",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Tab",
			].includes(e.code) &&
			e.target.tagName !== "INPUT"
		)
			e.preventDefault();
		if (e.target.tagName === "INPUT" && e.target.type === "text") return;
		if (activity("keyboard")) {
			e.preventDefault();
			return;
		}
		audio.unlock();
		if (e.repeat) return;
		pressed.add(e.code);
		keys.add(e.code);
		if (e.code === "Escape") {
			if (screen && screen !== "title") back();
			else pause();
			return;
		}
		if (screen) {
			if (e.code === "ArrowDown" || e.code === "KeyS") navigate(1);
			else if (e.code === "ArrowUp" || e.code === "KeyW") navigate(-1);
			else if (e.code === "Enter" || e.code === "Space") {
				const list = menuElements();
				list[menuIndex]?.click();
			} else if (e.code === "ArrowLeft" || e.code === "ArrowRight")
				adjustRange(e.code === "ArrowRight" ? 1 : -1);
		} else if (
			!network.hubActive &&
			!network.connected &&
			["KeyI", "KeyJ", "KeyK", "KeyL", "KeyU"].includes(e.code) &&
			!localCoop
		) {
			localCoop = true;
			game.addPlayer(1);
		}
	});
	document.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => {
		keys.clear();
		mouseTarget = null;
		if (
			!screen &&
			!network.connected &&
			!game.state.attract &&
			game.state.mode === "play"
		)
			setScreen("pause");
	});
}
function renderCode() {
	$("codeWheel").hidden = false;
	$("codeWheel").innerHTML =
		[...$("net-code").value]
			.map(
				(c, i) =>
					`<span style="display:inline-grid;place-content:center;width:2em;height:2.4em;border:2px solid var(--ink);border-radius:5px;background:${i === codePosition ? "var(--orange)" : "var(--paper)"};color:${i === codePosition ? "white" : "var(--ink)"}">${c}</span>`,
			)
			.join("") +
		'<p class="hint">↑ ↓ Letter · ← → Position · ' +
		prompt("action") +
		" Next · ○ / B Done</p>";
}
function adjustRange(d) {
	const el = menuElements()[menuIndex];
	if (el?.type === "range") {
		el.value = +el.value + d * (+el.step || 1);
		el.dispatchEvent(new Event("input"));
	}
}
function pads(dt) {
	const all = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	const inputs = {};
	menuClock = Math.max(0, menuClock - dt);
	for (let i = 0; i < all.length; i++) {
		const p = all[i],
			buttons = p.buttons.map((b) => b.pressed),
			old = padPrevious.get(p.index) || [];
		const edge = (n) => buttons[n] && !old[n];
		const ax = p.axes[0] || 0,
			az = p.axes[1] || 0,
			x = Math.abs(ax) > 0.18 ? ax : buttons[15] ? 1 : buttons[14] ? -1 : 0,
			z = Math.abs(az) > 0.18 ? az : buttons[13] ? 1 : buttons[12] ? -1 : 0;
		const active =
			Math.abs(x) + Math.abs(z) > 0.1 || buttons.some((b, n) => b && !old[n]);
		if (active) {
			if (activity("gamepad")) {
				padPrevious.set(p.index, buttons);
				continue;
			}
			audio.unlock();
		}
		if (edge(9) && !buttons[8]) {
			if (screen && screen !== "title") back();
			else pause();
		}
		if (screen) {
			if (codeEditing) {
				if (menuClock <= 0 && (Math.abs(x) > 0.5 || Math.abs(z) > 0.5)) {
					if (Math.abs(x) > 0.5)
						codePosition = (codePosition + Math.sign(x) + 6) % 6;
					else {
						const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
						const value = ($("net-code").value.toUpperCase() + "AAAAAA")
							.slice(0, 6)
							.split("");
						value[codePosition] =
							chars[
								(chars.indexOf(value[codePosition]) +
									Math.sign(z) +
									chars.length) %
									chars.length
							];
						$("net-code").value = value.join("");
					}
					menuClock = 0.15;
					renderCode();
				}
				if (edge(0)) {
					codePosition++;
					if (codePosition >= 6) {
						codeEditing = false;
						$("codeWheel").hidden = true;
						focusMenu(menuElements().indexOf($("net-join")));
					} else renderCode();
				}
				if (edge(1)) {
					codeEditing = false;
					$("codeWheel").hidden = true;
				}
				padPrevious.set(p.index, buttons);
				continue;
			}
			if (edge(0) && menuElements()[menuIndex]?.id === "net-code") {
				codeEditing = true;
				codePosition = 0;
				$("net-code").value = (
					$("net-code").value.toUpperCase() + "AAAAAA"
				).slice(0, 6);
				renderCode();
				padPrevious.set(p.index, buttons);
				continue;
			}
			if (menuClock <= 0 && Math.abs(z) > 0.5) {
				navigate(Math.sign(z));
				menuClock = 0.19;
			}
			if (menuClock <= 0 && Math.abs(x) > 0.5) {
				adjustRange(Math.sign(x));
				menuClock = 0.13;
			}
			if (edge(0)) menuElements()[menuIndex]?.click();
			if (edge(1) && screen !== "title") back();
		} else {
			if (i === 1 && edge(0) && !network.connected && !network.hubActive) {
				localCoop = true;
				game.addPlayer(1);
			}
			inputs[i] = {
				x,
				z,
				action: buttons[0],
				reject: buttons[2],
				dash: buttons[1] || buttons[5],
			};
		}
		padPrevious.set(p.index, buttons);
	}
	return inputs;
}
function localInput(padInputs) {
	let x =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
		z =
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
	let action = keys.has("KeyE") || touch.action,
		reject =
			keys.has("KeyQ") ||
			(touch.rightId !== null && performance.now() - touch.rightStart > 250),
		dash = pressed.has("Space") || touch.dash;
	if (touch.id !== null) {
		x = touch.x;
		z = touch.z;
	}
	const seat = network.localSeat < 0 ? 0 : network.localSeat;
	const p = game.state.players.find((p) => p.id === seat);
	if (mouseTarget && p && !x && !z) {
		const dx = mouseTarget.x - p.x,
			dz = mouseTarget.z - p.z,
			dist = Math.hypot(dx, dz);
		if (dist > 0.14) {
			x = dx / Math.max(0.4, dist);
			z = dz / Math.max(0.4, dist);
		} else {
			action = true;
			mouseTarget = null;
		}
	}
	if (x || z) if (lastInput !== "keyboard") mouseTarget = null;
	const controls =
		padInputs[0] && lastInput === "gamepad"
			? padInputs[0]
			: { x, z, action, reject, dash };
	return { ...controls, assist: game.config.assist || lastInput === "touch" };
}
function pointerControls() {
	const canvas = $("world");
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType === "mouse" && (e.movementX || e.movementY))
			activity("keyboard");
	});
	canvas.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "touch") {
			if (activity("touch")) return;
			audio.unlock();
			if (screen) return;
			game.config.assist = true;
			if (e.clientX < innerWidth * 0.65 && touch.id === null) {
				touch.id = e.pointerId;
				touch.originX = e.clientX;
				touch.originY = e.clientY;
				touch.x = touch.z = 0;
				$("stick").hidden = false;
				$("stick").style.left = e.clientX + "px";
				$("stick").style.top = e.clientY + "px";
				canvas.setPointerCapture(e.pointerId);
			} else {
				const now = performance.now();
				touch.rightId = e.pointerId;
				touch.rightStart = now;
				if (touch.lastRightTap > 0 && now - touch.lastRightTap < 360)
					touch.dash = true;
				touch.lastRightTap = now;
				touch.action = true;
				canvas.setPointerCapture(e.pointerId);
			}
			return;
		}
		if (activity("keyboard")) return;
		audio.unlock();
		if (screen) return;
		if (e.button === 2) {
			touch.dash = true;
			return;
		}
		const target = scene.screenToWorld(e.clientX, e.clientY);
		mouseTarget = {
			x: Math.max(-4.7, Math.min(5.6, target.x)),
			z: Math.max(-4, Math.min(4.15, target.z)),
		};
		touch.action = true;
	});
	canvas.addEventListener("pointermove", (e) => {
		if (e.pointerId !== touch.id) return;
		const dx = e.clientX - touch.originX,
			dz = e.clientY - touch.originY,
			d = Math.hypot(dx, dz),
			scale = Math.min(1, 55 / Math.max(1, d));
		touch.x = (dx * scale) / 55;
		touch.z = (dz * scale) / 55;
		$("stickDot").style.transform =
			`translate(${dx * scale * 0.6}px,${dz * scale * 0.6}px)`;
	});
	function release(e) {
		if (e.pointerId === touch.rightId) touch.rightId = null;
		if (e.pointerId === touch.id) {
			touch.id = null;
			touch.x = touch.z = 0;
			$("stick").hidden = true;
		}
	}
	canvas.addEventListener("pointerup", release);
	canvas.addEventListener("pointercancel", release);
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	$("touchAction").addEventListener("pointerdown", (e) => {
		e.stopPropagation();
		touch.action = true;
		audio.unlock();
	});
}
let lastOrders = "";
function renderHud() {
	const s = game.state;
	$("shiftLabel").textContent =
		`${s.endless ? "AFTER HOURS" : "SHIFT " + s.shift + " / 3"} · ${s.shiftServed} / ${s.goal === 999 ? "∞" : s.goal} ORDERS`;
	$("score").textContent = String(s.score).padStart(5, "0");
	$("performanceText").textContent = Math.ceil(s.performance);
	$("performanceFill").style.width = Math.max(0, s.performance) + "%";
	$("performanceFill").style.background =
		s.performance < 20 ? "#d95638" : "#31786e";
	$("combo").textContent =
		s.combo >= 2 ? `×${Math.min(s.combo, 5)} HOT STREAK` : "";
	const all = [
		...s.burgers,
		...s.players.flatMap((p) =>
			p.carrying ? [{ ...p.carrying, inHands: true }] : [],
		),
	];
	const hash = JSON.stringify(
		all.map((b) => [
			b.slot,
			b.ingredients,
			b.required,
			b.ready,
			b.needsBun,
			b.inHands,
		]),
	);
	if (hash !== lastOrders) {
		lastOrders = hash;
		$("orders").innerHTML = COLORS.map((color, slot) => {
			const b = all.find((b) => b.slot === slot);
			return `<div class="ticket ${b?.ready ? "ready" : ""} ${!b ? "empty" : ""}" style="--color:${color}"><div class="ticket-head"><span>${["CORAL", "MINT", "GOLD"][slot]}</span><span class="ticket-number">${slot + 1}</span></div><div class="ticket-food">${b ? [...b.required, "bun"].map((t) => `<i aria-label="${t}" class="food ${t} ${(t === "bun" ? b.ready : b.ingredients.includes(t)) ? "done" : ""}"></i>`).join("") : '<span style="font-size:.65em">ALL WRAPPED UP</span>'}</div><div class="ticket-status">${!b ? "Enjoy your meal" : b.inHands ? "→ TAKE TO WRAPPER" : b.ready ? "READY · PICK UP" : b.needsBun ? "CATCH A TOP BUN" : "CATCH → STACK → WRAP"}</div></div>`;
		}).join("");
	}
	const p =
		s.players.find(
			(p) => p.id === (network.localSeat < 0 ? 0 : network.localSeat),
		) || s.players[0];
	if (p) {
		$("holding").innerHTML = p.carrying
			? `<i class="food bun"></i> Chute ${p.carrying.slot + 1} · ${["Coral", "Mint", "Gold"][p.carrying.slot]}`
			: p.held
				? `<i class="food ${p.held}"></i> ${p.held === "bun" ? "Top bun" : p.held[0].toUpperCase() + p.held.slice(1)} · take to belt`
				: '<span style="font-size:1.2em">↗</span> Catch a flying topping';
		const near =
			p.carrying &&
			p.z > 3.25 &&
			Math.abs(p.x - [-3, 0, 3][p.carrying.slot]) < 1.35;
		const context = $("contextPrompt");
		context.hidden = !near || !!screen;
		if (near) {
			const pos = scene.project(p.x, p.z, 2.5);
			context.style.left = pos.x + "px";
			context.style.top = pos.y + "px";
			context.innerHTML = `<span class="key">${prompt("action")}</span>Wrap order ${p.carrying.slot + 1}`;
		}
		$("touchAction").hidden = !(
			lastInput === "touch" &&
			p.carrying &&
			p.z > 3.25
		);
	}
	$("message").hidden = s.messageTime <= 0;
	$("message").textContent = s.message;
	$("netBadge").hidden = !network.connected && !localCoop;
	if (network.connected)
		$("netBadge").textContent = network.hubActive
			? "AI HUB · SHARED KITCHEN"
			: "TWO COOKS · " + network.room;
	else if (localCoop) $("netBadge").textContent = "TWO COOKS · SAME KITCHEN";
}
function modeChanges(dt) {
	const s = game.state;
	if (s.mode !== prevMode) {
		if (s.mode === "intermission") {
			transitionTimer = 4;
			$("transitionTitle").textContent =
				s.shift === 1 ? "LUNCH RUSH" : "SUPPER CLUB";
			$("transitionDescription").textContent =
				s.shift === 1
					? "Two toppings. Twice the hustle."
					: "Three and four toppings. Keep your cool.";
		}
		if (["victory", "gameover"].includes(s.mode)) {
			if (s.attract) {
				game.start({ attract: true });
				prevMode = "play";
				return;
			}
			if (network.hubActive) {
				network.finish(s.mode === "victory", s.score);
			} else {
				setScreen("result");
				$("resultEyebrow").textContent =
					s.mode === "victory"
						? "ALL THREE SHIFTS · IN THE BAG"
						: "KITCHEN CLOSED";
				$("resultTitle").textContent =
					s.mode === "victory" ? "Nice buns, chef." : "Bun out of luck.";
				$("resultDescription").textContent =
					s.mode === "victory"
						? "Twelve happy customers. One very well-earned sit-down. The neighborhood salutes your spatula."
						: "The belt got the better of us. Take a breath, read the tickets, and give those buns another go.";
				$("resultScore").textContent = s.score;
				$("resultServed").textContent = s.served;
				$("resultGrade").textContent =
					s.mode === "gameover"
						? "D"
						: s.performance >= 60
							? "A+"
							: s.performance >= 35
								? "A"
								: "B";
				$("endless").hidden = s.mode !== "victory";
				try {
					const best = +localStorage.getItem("pressure-buns-best") || 0;
					if (s.score > best)
						localStorage.setItem("pressure-buns-best", s.score);
				} catch {}
			}
		}
		prevMode = s.mode;
	}
	if (s.mode === "intermission" && !screen) {
		transitionTimer -= dt;
		$("transition").hidden = false;
		$("transitionCount").textContent = Math.max(1, Math.ceil(transitionTimer));
	} else $("transition").hidden = true;
}
async function boot() {
	try {
		audio = createAudio();
		await RAPIER.init();
		game = createGame(RAPIER, event);
		game.start({ attract: true });
		game.state.mode = "title";
		game.state.attract = false;
		scene = await createScene($("world"));
		network = createNetwork({
			getState: () => game.snapshot(),
			onInput: (input, id) => {
				remoteInputs[id] = { ...input, received: performance.now() };
			},
			onState: (s) => {
				game.replace(s);
				if (s.mode !== "title" && screen === "online") setScreen(null);
				if (s.mode === "play" && ["title", "result"].includes(screen))
					setScreen(null);
			},
			onStatus: (message, api) => {
				$("net-status").textContent = message;
				if (api.connected) {
					$("net-start").hidden = !api.isHost;
					$("net-start").textContent = "Start cooking together";
				}
			},
			onJoin: () => {
				if (network.isHost) {
					game.addPlayer(1);
					if (game.state.mode === "play")
						game.state.message =
							"A sous-chef has arrived. Two aprons, one kitchen!";
				}
			},
			onEvent: (name, data) => {
				if (name === "remote-event") {
					if (
						data.name === "request-run" &&
						network.isHost &&
						!network.hubActive
					)
						startRun(!!data.data?.endless);
					else event(data.name, data.data);
				}
				if (name === "hub-start") {
					game.start({ players: network.playerIds });
					setScreen(null);
					$("hubWait").hidden = false;
					prevMode = "play";
				}
				if (name === "hub-time-up" && network.isHost)
					network.finish(game.state.served >= 12, game.state.score);
				if (name === "hub-end") {
					hubEnded = true;
					audio.setMuted(true);
					keys.clear();
					$("hubWait").hidden = true;
				}
				if (name === "hub-leave") {
					game.removePlayer(data.id);
					delete remoteInputs[data.id];
				}
				if (name === "disconnected") {
					delete remoteInputs[1];
					if (network.role === "guest") {
						game.state.mode = "title";
						setScreen("online", "title");
					} else game.removePlayer(1);
				}
			},
		});
		wireMenus();
		handleKeys();
		pointerControls();
		loadSettings();
		renderCredits();
		updatePrompts();
		window.addEventListener("resize", () => scene.resize());
		$("loading").hidden = true;
		window.__game = {
			game,
			audio,
			network,
			scene,
			get screen() {
				return screen;
			},
			get lastInput() {
				return lastInput;
			},
			start: startRun,
			setScreen,
			interview,
			version: "1.0.0",
			ready: true,
		};
		if (network.hubActive) {
			setScreen(null);
			$("hubWait").hidden = false;
			await network.connectHub();
			network.ready();
		} else setScreen("title");
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		$("loadText").textContent = "The kitchen could not open.";
		$("error").hidden = false;
		$("error").textContent =
			String(error) +
			"\nReload the page, or use a browser with WebGPU / WebGL 2.";
		globalThis.AIHub?.fail?.(String(error));
	}
}
let lastFrame = 0,
	uiClock = 0;
function frame(ms) {
	requestAnimationFrame(frame);
	const dt = Math.min(0.05, (ms - (lastFrame || ms)) / 1000);
	lastFrame = ms;
	if (hubEnded) return;
	const padInputs = pads(dt);
	let input = localInput(padInputs);
	if (screen) input = { x: 0, z: 0 };
	if (network.hubActive) $("hubWait").hidden = network.hubTime >= 0;
	const canPlay = !screen || network.connected;
	const hubCanPlay = !network.hubActive || network.hubTime >= 0;
	if (network.isHost && canPlay && hubCanPlay) {
		const inputs = {};
		for (const p of game.state.players) {
			if (game.state.attract || game.config.autoplay)
				inputs[p.id] = game.aiInput(p);
			else if (p.id === network.localSeat) inputs[p.id] = input;
			else if (network.connected) {
				const remote = remoteInputs[p.id];
				inputs[p.id] = remote && ms - remote.received < 450 ? remote : {};
			} else if (p.id === 1)
				inputs[p.id] = padInputs[1] || {
					x: (keys.has("KeyL") ? 1 : 0) - (keys.has("KeyJ") ? 1 : 0),
					z: (keys.has("KeyK") ? 1 : 0) - (keys.has("KeyI") ? 1 : 0),
					action: keys.has("KeyU"),
					reject: keys.has("KeyO"),
					dash: keys.has("KeyP"),
				};
		}
		game.step(dt, inputs);
	} else if (!network.isHost) network.sendInput(input);
	network.update(dt);
	if (screen === "title" && ms - lastActivity >= 10000 && !network.connected) {
		game.start({ attract: true });
		screen = null;
		$("titleScreen").hidden = true;
		$("hud").hidden = false;
		$("attract").hidden = false;
		prevMode = "play";
	}
	modeChanges(dt);
	if (screen === "title") {
		const s = game.state;
		s.time += dt;
		if (!s.players.length) game.addPlayer(0);
	}
	audio.update(dt, {
		mode: screen ? "menu" : game.state.mode,
		shift: game.state.shift,
		combo: game.state.combo,
	});
	scene.render(game.state, dt);
	uiClock += dt;
	if (uiClock > 0.05) {
		renderHud();
		if (screen === "dev")
			$("devStats").textContent =
				`${scene.stats.backend} · Three.js r180 · Rapier ${game.physics.version} · ${scene.stats.meshes} meshes · ${scene.stats.animations} native clips · ${game.physics.bodies} physics bodies · Shift time ${game.state.time.toFixed(1)}s`;
		uiClock = 0;
	}
	pressed.clear();
	touch.action = false;
	touch.dash = false;
}
boot();
