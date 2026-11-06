import RAPIER from "@dimforge/rapier3d-compat";
import { GameAudio } from "./audio.js";
import credits from "./credits.json";
import { GameModel } from "./model.js";
import { Online } from "./online.js";
import { GameScene } from "./scene.js";

const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const prefs = { music: 0.1, sfx: 0.65, glyphs: "ps", shake: true, best: 0 };
try {
	Object.assign(
		prefs,
		JSON.parse(localStorage.getItem("kasplat.preferences") || "{}"),
	);
} catch {}
function save() {
	try {
		localStorage.setItem("kasplat.preferences", JSON.stringify(prefs));
	} catch {}
}
let screen = "loading",
	returnScreen = "title",
	attract = false,
	coop = false,
	endless = false,
	lastInput = "keyboard",
	lastActivity = performance.now(),
	target = [0, 0],
	splash = [false, false],
	keys = new Set(),
	remoteState = null,
	remoteInputs = new Map(),
	netEvents = [],
	eventSeq = 0,
	guestSeq = 0,
	toastUntil = 0,
	finished = false,
	debug = false,
	netEnded = false,
	frameCount = 0,
	nowTime = 0;
let scene, model;
const audio = new GameAudio();
audio.setMusic(prefs.music);
audio.setSfx(prefs.sfx);
function toast(t, d = 2) {
	$("toast").textContent = t;
	$("toast").hidden = false;
	toastUntil = nowTime + d;
}
function handleEvent(e) {
	scene?.event(e);
	if (
		["catch", "miss", "splash", "wave", "win", "lose", "repair"].includes(
			e.type,
		)
	)
		audio.play(e.type, e.combo || e.wave);
	if (e.type === "wave" && model?.time > 2) audio.voice("taunt");
	if (e.type === "miss") audio.voice("taunt");
	if (e.type === "win") audio.voice("win");
	if (e.type === "repair" && !attract) toast("A FRESH BUCKET. NICE WORK!");
	if (e.type === "catch" && e.combo > 0 && e.combo % 15 === 0 && !attract)
		toast(`${e.combo} IN A ROW! KEEP HIM FROWNING.`);
	if (online?.connected && online.isHost) {
		netEvents.push({ ...e, seq: ++eventSeq });
		if (netEvents.length > 22) netEvents.shift();
	}
}
const online = new Online({
	onInput(id, input) {
		const prev = remoteInputs.get(id);
		remoteInputs.set(id, {
			x: input.x,
			splash: !!input.splash || !!prev?.splash,
		});
	},
	onSnapshot(s) {
		remoteState = s;
		for (const e of s.events || [])
			if (e.seq > guestSeq) {
				handleEvent(e);
				guestSeq = e.seq;
			}
		if (s.phase === "won" || s.phase === "lost") finishUI(s);
	},
	onStart() {
		begin({ coop: online.players.length > 1, network: true });
	},
	onStatus(t) {
		$("network-status").textContent = t;
	},
	onLeave(_id) {
		if (online.hubActive) return;
		toast("YOUR FRIEND LEFT THE ROOFTOP.", 4);
		if (!online.isHost) {
			netEnded = true;
			model?.pause(true);
			show("together");
		} else if (model) {
			model.players = model.players.slice(0, 1);
			coop = false;
		}
	},
	onEnd() {
		netEnded = true;
		audio.setMuted(true);
		model?.pause(true);
		$("menu").innerHTML = "";
		$("hud").hidden = true;
		$("bottom").hidden = true;
		$("wave-banner").hidden = true;
	},
	onCountdown() {},
	onTimeUp() {
		online.broadcast(getSnapshot(), true);
		online.finish(model.score, model.phase === "won");
	},
});
function getSnapshot() {
	if (online.connected && !online.isHost && remoteState) return remoteState;
	const s = model.snapshot();
	s.bucketWidth = model.config.bucketWidth;
	s.events = netEvents;
	return s;
}
function glyph(kind) {
	if (lastInput === "mouse")
		return {
			move: "Mouse",
			splash: "Click",
			back: "Esc",
			pause: "Esc",
			confirm: "Click",
		}[kind];
	if (lastInput === "pad") {
		const xbox = prefs.glyphs === "xbox";
		return {
			move: "L",
			splash: xbox ? "A" : "✕",
			back: xbox ? "B" : "○",
			pause: xbox ? "Menu" : "Options",
			confirm: xbox ? "A" : "✕",
		}[kind];
	}
	return {
		move: "A D",
		splash: "Space",
		back: "Esc",
		pause: "Esc",
		confirm: "Enter",
	}[kind];
}
function prompts() {
	const pad = lastInput === "pad";
	$("move-prompt").innerHTML = pad
		? '<span class="key">L</span> Move buckets'
		: lastInput === "touch"
			? "Drag to move"
			: `<span class="key">A</span><span class="key">D</span> or mouse &nbsp; Move`;
	$("pause-btn").innerHTML = `${glyph("pause")} &nbsp; Pause`;
}
function activity(type) {
	if (type) {
		lastInput = type;
		document.body.classList.toggle("touch", type === "touch");
		prompts();
	}
	lastActivity = performance.now();
	if (attract) {
		attract = false;
		model.pause(true);
		audio.setMuted(false);
		show("title");
		return true;
	}
	audio.unlock();
	return false;
}
const button = (text, action, style = "secondary", hint = "") =>
	`<button class="${style}" data-action="${action}"><span>${text}</span>${hint ? `<small>${hint}</small>` : '<span aria-hidden="true">↗</span>'}</button>`;
function panel(kicker, title, content, wide = false) {
	return `<div class="veil"><section class="panel ${wide ? "wide" : ""}"><div class="eyebrow">${kicker}</div><h2>${title}</h2>${content}</section></div>`;
}
function backBtn() {
	return '<button class="text-btn" data-action="back">← Back</button>';
}
function show(next) {
	screen = next;
	const menu = $("menu");
	let html = "";
	const _s = model?.snapshot();
	if (next === "title") {
		lastActivity = performance.now();
		frame.loopAt = 0;
		model?.pause(true);
		finished = false;
		netEnded = false;
		html = `<div class="title-scrim"></div><section class="title-card"><div class="eyebrow">A rooftop reflex riot</div><h1>Ka-<span>Splat!</span></h1><p class="tagline">Catch a little chaos.</p><p class="deck">One rascal. Three buckets.<br>Keep him frowning. Keep catching.</p>${button("Let’s make a splash", "play", "primary", "8-wave show")}${button("Bucket brigade", "together", "secondary", "1–2 players")}<div class="title-links"><button class="text-btn" data-action="how">How to play</button><button class="text-btn" data-action="settings">Settings</button><button class="text-btn" data-action="about">About</button></div></section><div class="corner-stamp">3 BUCKETS.<br>8 WAVES. ZERO CHILL.</div><div class="edition">An original riff on Kaboom! · 1981 &nbsp; / &nbsp; Best ${String(prefs.best).padStart(6, "0")}</div>`;
	}
	if (next === "pause") {
		model.pause(true);
		html = panel(
			"Take a breather",
			"Buckets on break.",
			`${button("Back to the splash", "resume", "primary")}${online.connected && !online.isHost ? "<p>Your host keeps the show running. Return when your buckets are ready.</p>" : button("Restart the show", "restart")}${button("Settings", "settings")}<div class="title-links">${online.connected && !online.isHost ? "" : '<button class="text-btn" data-action="dev">Developer tools</button>'}<button class="text-btn" data-action="about">About & credits</button><button class="text-btn" data-action="quit">Title screen</button></div>`,
		);
	}
	if (next === "settings") {
		html = panel(
			"Make yourself at home",
			"Sound & controls",
			`<label class="setting">Music <output id="music-value">${Math.round(prefs.music * 100)}%</output><input aria-label="Music volume" data-setting="music" type="range" min="0" max="1" step=".01" value="${prefs.music}"></label><label class="setting">Sound & gibberish <output id="sfx-value">${Math.round(prefs.sfx * 100)}%</output><input aria-label="Sound volume" data-setting="sfx" type="range" min="0" max="1" step=".01" value="${prefs.sfx}"></label><div class="setting"><span>Controller prompts</span><button data-action="glyphs">${prefs.glyphs === "ps" ? "PlayStation ✕ ○" : "Xbox A B"}</button></div><div class="setting"><span>Screen shake</span><button data-action="shake">${prefs.shake ? "On" : "Off"}</button></div><div class="title-links">${backBtn()}<button class="text-btn" data-action="endless">${endless ? "✓ Endless remix enabled" : "Enable endless remix"}</button></div>`,
		);
	}
	if (next === "how") {
		html = panel(
			"Simple rules. Serious reflexes.",
			"Give chaos a bath.",
			`<div class="how-grid"><div class="how-item"><span class="how-symbol">↔</span><b>01. Chase</b><p>Slide three water buckets under falling bombs. Use the left stick, arrows, A / D, or mouse.</p></div><div class="how-item"><span class="how-symbol">≈</span><b>02. Splash</b><p>Press Cross, Space, or click for a wide water shield. Catch bombs to refill it. Gold gives extra charge.</p></div><div class="how-item"><span class="how-symbol">!</span><b>03. Survive</b><p>A miss clears the bombs and costs a bucket. Every 1,000 points repairs one. Clear all eight waves!</p></div></div><p><b>Touch:</b> drag anywhere to move; tap or use a second finger to splash. Near misses get a little help.</p><p><b>Two on the couch:</b> one pad each, or P1 A / D + Space and P2 J / L + I. Buckets and splash charge are shared. Teal is P1; orange is P2.</p><div class="button-row">${button("Got it. Buckets ready.", "play", "primary")}${button("Back", "back")}</div>`,
			true,
		);
	}
	if (next === "together") {
		html = panel(
			"Two catchers. Twice the cheek.",
			"Bucket brigade",
			`<p>Share the rooftop and keep every bucket in play.</p>${button("Couch co-op", "local", "primary", "Two pads or shared keys")}<details id="online-details"><summary class="text-btn" tabindex="0">Play online — invite a friend ↗</summary><div id="online-host"></div></details><p style="font-size:14px">Online uses a direct connection. Exchange invitation and reply codes with your friend, then start together. AI Hub connects the brigade automatically.</p>${backBtn()}`,
		);
	}
	if (next === "about") {
		const d = credits.sourceInformation;
		html = panel(
			"From the roof, with love",
			"About Ka-Splat!",
			`<div class="credits"><p>An original tribute to the devilish simplicity of Larry Kaplan’s <b>Kaboom! (Activision, 1981)</b>. No original art or audio is reproduced.</p><h3>Source Information</h3><dl>${Object.entries(
				d,
			)
				.map(
					([k, v]) =>
						`<dt>${esc(k.replace(/([A-Z])/g, " $1"))}</dt><dd>${esc(v)}</dd>`,
				)
				.join(
					"",
				)}</dl><p>Research: <a href="https://www.atariage.com/manual_html_page.php?SoftwareLabelID=257" target="_blank" rel="noopener">Original Kaboom! instruction manual</a> · <a href="https://www.atariage.com/software_page.php?SoftwareLabelID=257" target="_blank" rel="noopener">AtariAge game reference</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a></p>${["testingFeedback", "engineFeedback", "promptFeedback"].map((k) => `<h3>${k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</h3><ol>${credits[k].map((v) => `<li>${esc(v)}</li>`).join("")}</ol>`).join("")}<h3>Made in code</h3><p>Scene, characters, lettering, sound effects, mallet music and gibberish voices are generated at runtime. Three.js and Rapier are bundled; their MIT and Apache-2.0 license notices are retained in the build. AI Hub session client by Michael Crosato.</p><p>Renderer: ${scene.backend}. Gamepad API standard mapping. Best score and preferences stay on this device.</p></div><div class="title-links">${backBtn()}</div>`,
			true,
		);
	}
	if (next === "dev") {
		const c = model.config;
		html = panel(
			"Developer mode · live balance",
			"Make some trouble.",
			`<p class="dev-hint">Changes apply immediately. Leave this menu to resume. Sliders also work with left / right on a controller.</p><div class="dev-grid">${[
				["fallSpeed", "Bomb fall speed", 0.25, 3, 0.05],
				["spawnRate", "Bomb frequency", 0.25, 3, 0.05],
				["bucketWidth", "Bucket width", 0.65, 3.5, 0.05],
				["moveSpeed", "Bucket move speed", 5, 60, 1],
				["chargeRate", "Splash recharge", 0.1, 4, 0.1],
				["timeScale", "Simulation speed", 0.1, 4, 0.1],
			]
				.map(
					([k, label, min, max, step]) =>
						`<label class="setting">${label}<output id="dev-${k}">${c[k].toFixed(2)}</output><input aria-label="${label}" data-dev="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${c[k]}"></label>`,
				)
				.join(
					"",
				)}</div><div class="dev-actions"><button data-action="god">Invincible: ${c.invincible ? "ON" : "off"}</button><button data-action="autoplay">Auto-catch: ${c.autoplay ? "ON" : "off"}</button><button data-action="debug">Physics: ${debug ? "ON" : "off"}</button><button data-action="step">Step 1 frame</button><button data-action="refill">Refill buckets</button><button data-action="miss">Force miss</button><button data-action="spawn-normal">Drop bomb</button><button data-action="spawn-gust">Drop gust</button><button data-action="spawn-gold">Drop gold</button></div><label class="setting">Jump to wave<output id="dev-wave">${model.wave}</output><input aria-label="Jump to wave" data-dev="wave" type="range" min="1" max="8" step="1" value="${model.wave}"></label><div class="title-links"><button class="text-btn" data-action="reset-dev">Reset defaults</button>${backBtn()}<button class="text-btn" data-action="resume">Resume play</button></div>`,
			true,
		);
	}
	if (next === "results") {
		const r = getSnapshot();
		const won = r.phase === "won";
		const _pct =
			r.stats.caught + r.stats.missed
				? Math.round((r.stats.caught / (r.stats.caught + r.stats.missed)) * 100)
				: 0;
		html = panel(
			won ? "Rooftop rescued" : "One more bucket? ",
			won ? "What a splash!" : "That rascal got you.",
			`<p>${won ? "Eight waves. One very soggy troublemaker. The bucket brigade salutes you." : "He is grinning. You know what to do. Fill your buckets and go again."}</p><div class="stat-grid"><div>Score<b>${r.score.toLocaleString()}</b></div><div>Best streak<b>${r.maxCombo}</b></div><div>Bombs caught<b>${r.stats.caught}</b></div><div>Waves cleared<b>${r.stats.waves} / 8</b></div><div>Gold catches<b>${r.stats.golden}</b></div><div>Splash saves<b>${r.stats.splashes}</b></div></div>${online.connected && !online.isHost ? "<p>Waiting for the host to start another show.</p>" : button("Encore!", "restart", "primary")}<div class="title-links"><button class="text-btn" data-action="quit">Title screen</button><button class="text-btn" data-action="about">About & credits</button></div>`,
		);
	}
	menu.innerHTML = html;
	const gameplay =
		["playing", "pause", "dev", "settings", "about"].includes(next) &&
		model &&
		model.phase !== "title" &&
		returnScreen !== "title";
	$("hud").hidden = !(next === "playing" || gameplay);
	$("bottom").hidden = next !== "playing" || online.hubActive;
	$("network-status").hidden = !(online.connected && next === "playing");
	if (next === "together") online.mount($("online-host"));
	if (next !== "playing") $("wave-banner").hidden = true;
	requestAnimationFrame(() => {
		const f = focusables()[0];
		if (lastInput !== "touch") f?.focus({ preventScroll: true });
	});
}
function openSub(next) {
	returnScreen = screen === "playing" ? "pause" : screen;
	show(next);
}
function goBack() {
	if (screen === "pause") resume();
	else if (["settings", "how", "about", "dev"].includes(screen))
		show(returnScreen === "playing" ? "pause" : returnScreen);
	else if (screen === "together") show("title");
}
function begin({ coop: multi = false, network = false } = {}) {
	attract = false;
	frame.loopAt = 0;
	coop = multi;
	finished = false;
	netEnded = false;
	remoteState = null;
	remoteInputs.clear();
	netEvents = [];
	eventSeq = 0;
	guestSeq = 0;
	target = multi ? [-2.5, 2.5] : [0, 0];
	if (network && !online.isHost && online.localId === 1) target[0] = 2.5;
	splash = [false, false];
	keys.clear();
	audio.setMuted(false);
	if (!network || online.isHost) model.start({ coop: multi, endless });
	returnScreen = "pause";
	show("playing");
}
function resume() {
	model.pause(false);
	returnScreen = "pause";
	show("playing");
}
function finishUI(s) {
	if (finished || attract || online.hubActive) return;
	finished = true;
	model.pause(true);
	if (s.score > prefs.best) {
		prefs.best = s.score;
		save();
	}
	show("results");
}
function action(a) {
	audio.play("select");
	if (a === "play") {
		if (online.connected) online.disconnect();
		begin({ coop: false });
	} else if (a === "local") {
		online.disconnect();
		begin({ coop: true });
	} else if (a === "resume") resume();
	else if (a === "restart") {
		if (online.connected) online.start();
		else begin({ coop });
	} else if (a === "quit") {
		online.disconnect();
		model.pause(true);
		show("title");
	} else if (a === "back") goBack();
	else if (["settings", "how", "about", "dev"].includes(a)) openSub(a);
	else if (a === "together") show("together");
	else if (a === "glyphs") {
		prefs.glyphs = prefs.glyphs === "ps" ? "xbox" : "ps";
		save();
		show("settings");
	} else if (a === "shake") {
		prefs.shake = !prefs.shake;
		save();
		show("settings");
	} else if (a === "endless") {
		endless = !endless;
		show("settings");
	} else if (a === "god" || a === "autoplay") {
		const k = a === "god" ? "invincible" : "autoplay";
		model.setConfig({ [k]: !model.config[k] });
		show("dev");
	} else if (a === "debug") {
		debug = !debug;
		show("dev");
	} else if (a === "reset-dev") {
		model.resetConfig();
		show("dev");
	} else if (a === "refill") model.restore();
	else if (a === "step") {
		model.pause(false);
		model.update(
			1 / 120,
			target.map((x) => ({ x })),
		);
		model.pause(true);
	} else if (a === "miss") {
		model.pause(false);
		model.miss();
		model.pause(true);
	} else if (a.startsWith("spawn-"))
		model.spawnBomb(a.slice(6), model.players[0].x);
}
$("menu").addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) action(b.dataset.action);
});
$("menu").addEventListener("pointerover", (e) => {
	const b = e.target.closest("button,input,summary");
	if (b && lastInput === "mouse") b.focus({ preventScroll: true });
});
$("menu").addEventListener("input", (e) => {
	const el = e.target;
	if (el.dataset.setting) {
		const k = el.dataset.setting,
			v = +el.value;
		prefs[k] = v;
		audio[k === "music" ? "setMusic" : "setSfx"](v);
		$(`${k}-value`).textContent = `${Math.round(v * 100)}%`;
		save();
	}
	if (el.dataset.dev) {
		const k = el.dataset.dev,
			v = +el.value;
		if (k === "wave") {
			model.start({ coop, endless });
			for (let i = 1; i < v; i++) model.nextWave();
			model.pause(true);
			$("dev-wave").textContent = v;
		} else {
			model.setConfig({ [k]: v });
			$(`dev-${k}`).textContent = v.toFixed(2);
		}
	}
});
function focusables() {
	return [
		...$("menu").querySelectorAll("button,input,summary,textarea,a"),
	].filter((el) => !el.disabled && el.getClientRects().length);
}
function navigate(dir) {
	const fs = focusables();
	if (!fs.length) return;
	const i = fs.indexOf(document.activeElement);
	const el = document.activeElement;
	if ((dir === "left" || dir === "right") && el?.type === "range") {
		el.value = clamp(
			+el.value + (dir === "left" ? -1 : 1) * Number(el.step || 1),
			Number(el.min),
			Number(el.max),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
		return;
	}
	const next =
		fs[(i + (dir === "up" || dir === "left" ? -1 : 1) + fs.length) % fs.length];
	next.focus({ preventScroll: true });
	next.scrollIntoView({ block: "nearest" });
}
function pause() {
	if (online.hubActive) return;
	if (screen === "playing") {
		returnScreen = "pause";
		show("pause");
	} else if (screen === "pause") resume();
	else goBack();
}
$("pause-btn").onclick = pause;
addEventListener("keydown", (e) => {
	if (activity("keyboard")) {
		e.preventDefault();
		return;
	}
	if (e.target.matches("textarea")) return;
	const key = e.key.toLowerCase();
	keys.add(key);
	if (
		[" ", "arrowleft", "arrowright", "arrowup", "arrowdown", "escape"].includes(
			key,
		)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (key === "escape" || key === "p") {
		pause();
		return;
	}
	if (screen === "playing") {
		if (key === " " || key === "w") splash[0] = true;
		if (key === "i") splash[1] = true;
	} else if (
		["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
	) {
		navigate(key.slice(5));
	} else if (key === "enter" || key === " ") {
		e.preventDefault();
		document.activeElement?.click();
	}
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => {
	keys.clear();
	if (screen === "playing" && !online.connected) pause();
});
const pointers = new Map();
addEventListener("pointerdown", (e) => {
	const touch = e.pointerType === "touch";
	if (activity(touch ? "touch" : "mouse")) return;
	if (
		screen !== "playing" ||
		e.target.closest("button,#menu section,input,textarea")
	)
		return;
	if (touch) {
		pointers.set(e.pointerId, {
			x: e.clientX,
			startX: e.clientX,
			t: performance.now(),
		});
		if (pointers.size > 1) splash[0] = true;
	} else splash[0] = true;
	target[0] = scene.screenToWorld(e.clientX);
});
addEventListener("pointermove", (e) => {
	const touch = e.pointerType === "touch";
	if (!touch && Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
	if (activity(touch ? "touch" : "mouse")) return;
	if (screen === "playing" && (!touch || pointers.has(e.pointerId))) {
		target[0] = scene.screenToWorld(e.clientX);
		if (touch) pointers.get(e.pointerId).x = e.clientX;
	}
});
addEventListener("pointerup", (e) => {
	const p = pointers.get(e.pointerId);
	if (
		p &&
		screen === "playing" &&
		performance.now() - p.t < 200 &&
		Math.abs(e.clientX - p.startX) < 20
	)
		splash[0] = true;
	pointers.delete(e.pointerId);
});
addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));
addEventListener("resize", () => scene?.resize());
addEventListener("contextmenu", (e) => e.preventDefault());
let prevButtons = [],
	padNavAt = 0;
function gamepads(dt) {
	const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	pads.slice(0, 2).forEach((p, pi) => {
		const old = prevButtons[pi] || [],
			pressed = (n) => p.buttons[n]?.pressed && !old[n];
		const axis = Math.abs(p.axes[0] || 0) > 0.16 ? p.axes[0] : 0;
		const any = axis || p.buttons.some((b, i) => b.pressed && !old[i]);
		if (any && activity("pad")) {
			prevButtons[pi] = p.buttons.map((b) => b.pressed);
			return;
		}
		if (screen === "playing") {
			const direction =
				axis ||
				(p.buttons[15]?.pressed ? 1 : 0) - (p.buttons[14]?.pressed ? 1 : 0);
			target[pi] = clamp(
				target[pi] + direction * model.config.moveSpeed * dt,
				-7.6,
				7.6,
			);
			if (pressed(0) || pressed(7)) splash[pi] = true;
			if (pressed(9)) pause();
		} else {
			if (pressed(1) || pressed(9)) goBack();
			else if (pressed(0)) {
				document.activeElement?.click();
			} else if (performance.now() > padNavAt) {
				const dir = p.buttons[12]?.pressed
					? "up"
					: p.buttons[13]?.pressed
						? "down"
						: p.buttons[14]?.pressed
							? "left"
							: p.buttons[15]?.pressed
								? "right"
								: p.axes[1] < -0.55
									? "up"
									: p.axes[1] > 0.55
										? "down"
										: axis < -0.55
											? "left"
											: axis > 0.55
												? "right"
												: null;
				if (dir) {
					navigate(dir);
					padNavAt = performance.now() + 210;
				}
			}
		}
		prevButtons[pi] = p.buttons.map((b) => b.pressed);
	});
}
function updateHUD(s) {
	$("score").textContent = String(s.score).padStart(6, "0");
	$("best").textContent =
		`BEST ${String(Math.max(prefs.best, s.score)).padStart(6, "0")}`;
	$("wave-count").textContent = `WAVE ${String(s.wave).padStart(2, "0")} / 08`;
	$("wave-name").textContent = s.waveName;
	$("progress").style.width =
		`${clamp((s.waveProgress / s.waveTotal) * 100, 0, 100)}%`;
	$("charge").style.width = `${s.charge * 100}%`;
	$("splash-label").innerHTML =
		`<span class="key">${glyph("splash")}</span> ${s.charge >= 0.999 ? "Splash ready!" : `Filling… ${Math.floor(s.charge * 100)}%`}`;
	document.querySelectorAll(".bucket-icon").forEach((el, i) => {
		el.classList.toggle("empty", i >= s.lives);
	});
	$("combo").hidden = s.combo < 5 || screen !== "playing" || attract;
	$("combo").querySelector("b").textContent = `${s.combo}×`;
	const hostPaused =
		online.connected &&
		!online.isHost &&
		s.phase === "paused" &&
		screen === "playing";
	const banner =
		(s.phase === "intermission" && screen === "playing") || hostPaused;
	$("wave-banner").hidden = !banner;
	if (hostPaused) {
		$("banner-kicker").textContent = "BUCKET BRIGADE";
		$("banner-title").textContent = "HOST ON BREAK";
		$("banner-subtitle").textContent =
			"Keep your buckets handy. The show will resume.";
	} else if (banner) {
		$("banner-kicker").textContent =
			`WAVE ${String(s.wave).padStart(2, "0")} / 08`;
		$("banner-title").textContent = s.waveName;
		$("banner-subtitle").textContent = s.waveSubtitle;
	}
}
function frame(t) {
	const dt = Math.min(0.05, (t - (frame.last || t)) / 1000);
	frame.last = t;
	nowTime = t / 1000;
	frameCount++;
	if (scene.recovering) {
		lastActivity = performance.now();
		requestAnimationFrame(frame);
		return;
	}
	gamepads(dt);
	if (
		!online.hubActive &&
		screen === "title" &&
		!attract &&
		performance.now() - lastActivity >= 10000
	) {
		attract = true;
		model.start({ attract: true });
		$("menu").innerHTML = "";
		$("hud").hidden = false;
		audio.setMuted(true);
	}
	if (attract) {
		model.update(dt);
		if (model.phase === "playing" && model.charge >= 1 && model.time % 10 < 0.1)
			model.splash(0);
		if (["won", "lost"].includes(model.phase) && !frame.loopAt)
			frame.loopAt = t + 3000;
		if (frame.loopAt && t > frame.loopAt) {
			model.start({ attract: true });
			frame.loopAt = 0;
		}
	} else if (screen === "playing" && !netEnded) {
		const dir =
			(keys.has("d") || keys.has("arrowright") ? 1 : 0) -
			(keys.has("a") || keys.has("arrowleft") ? 1 : 0);
		const dir2 = (keys.has("l") ? 1 : 0) - (keys.has("j") ? 1 : 0);
		target[0] = clamp(target[0] + dir * model.config.moveSpeed * dt, -7.6, 7.6);
		target[1] = clamp(
			target[1] + dir2 * model.config.moveSpeed * dt,
			-7.6,
			7.6,
		);
		const s = getSnapshot();
		if (
			lastInput === "touch" &&
			s.charge >= 1 &&
			s.bombs.some(
				(b) =>
					b.y < 3.8 &&
					b.y > 1 &&
					Math.abs(b.x - target[0]) > 1 &&
					Math.abs(b.x - target[0]) < 3,
			)
		)
			splash[0] = true;
		if (online.connected) {
			if (!online.server) online.sendInput({ x: target[0], splash: splash[0] });
			if (online.isHost) {
				const inputs = online.players.map(
					(p) => remoteInputs.get(p.id) || { x: 0, splash: false },
				);
				model.update(dt, inputs);
				for (const p of remoteInputs.values()) p.splash = false;
				online.broadcast(getSnapshot());
			}
		} else
			model.update(
				dt,
				target.slice(0, coop ? 2 : 1).map((x, i) => ({ x, splash: splash[i] })),
			);
		splash = [false, false];
	}
	const s = getSnapshot();
	if (!attract && ["won", "lost"].includes(s.phase) && screen === "playing") {
		if (online.connected && online.isHost) {
			online.broadcast(s, true);
			online.finish(s.score, s.phase === "won");
		}
		finishUI(s);
	}
	if (online.connected && online.isHost && screen === "pause")
		online.broadcast(s);
	if (!prefs.shake) scene.shake = 0;
	let renderState = s;
	if (screen === "title" && !attract) {
		renderState = {
			...s,
			bomberX: Math.sin(t * 0.0007) * 4,
			players: [{ id: 0, x: Math.sin(t * 0.0007 - 1) * 4 }],
			bombs: [0, 1, 2].map((i) => ({
				id: -i - 1,
				x: Math.sin(t * 0.0007 - i * 0.6) * 4,
				y: 10 - ((t * 0.002 + i * 3) % 8),
				kind: i === 1 ? "gold" : "normal",
				angle: t * 0.001,
			})),
		};
	}
	scene.debugPhysics(model, debug);
	scene.render(renderState, dt, { title: screen === "title" && !attract });
	audio.tick(dt, (screen === "playing" || attract) && !netEnded, s.wave);
	updateHUD(s);
	$("attract").hidden = !attract;
	if (toastUntil && nowTime > toastUntil) {
		$("toast").hidden = true;
		toastUntil = 0;
	}
	requestAnimationFrame(frame);
}
async function init() {
	try {
		const netInit = online.init();
		await RAPIER.init();
		model = new GameModel(RAPIER, { onEvent: handleEvent });
		scene = new GameScene($("game"));
		await scene.init();
		await netInit;
		$("loading").hidden = true;
		prompts();
		if (online.hubActive) {
			screen = "playing";
			returnScreen = "pause";
			$("menu").innerHTML = "";
			$("hud").hidden = false;
			$("bottom").hidden = true;
			online.ready();
		} else show("title");
		window.__game = {
			model,
			scene,
			audio,
			online,
			credits,
			start: (opts) => begin(opts),
			show,
			get state() {
				return {
					screen,
					attract,
					lastInput,
					coop,
					endless,
					frameCount,
					backend: scene.backend,
					snapshot: getSnapshot(),
					best: prefs.best,
					debug,
				};
			},
			snapshot: getSnapshot,
			advance: (seconds, autoplay = true) => {
				const prev = model.config.autoplay;
				model.setConfig({ autoplay });
				for (let t = 0; t < seconds; t += 1 / 60)
					model.update(
						1 / 60,
						target.map((x) => ({ x })),
					);
				model.setConfig({ autoplay: prev });
				return getSnapshot();
			},
			offlineAudio: () => GameAudio.offlineProbe(),
			action,
			activity,
		};
		requestAnimationFrame(frame);
	} catch (e) {
		console.error(e);
		$("loading").innerHTML =
			"<b>One little hiccup.</b><p>" +
			esc(e.message) +
			"</p><p>Try a current Chrome, Edge, or Safari browser.</p>";
	}
}
init();
