import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three/webgpu";
import { AudioEngine, renderAudioTest } from "./audio.js";
import credits from "./credits-data.json";
import { NetworkSession } from "./network.js";
import { DEFAULTS, GameSimulation, PLANETS } from "./simulation.js";
import { Visuals } from "./visuals.js";

const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
let mode = "loading",
	inputMode = "keyboard",
	returnMode = "title",
	lastInput = performance.now(),
	sim,
	visuals,
	renderer,
	scene,
	camera,
	remoteState = null;
let playActive = false,
	wasAttract = false,
	frameTime = 0,
	accumulator = 0,
	clock = 0,
	bannerTimer = 0,
	noticeTimer = 0,
	drawTimer = 0,
	pointerFire = false,
	mouseTarget = null,
	inputOverride = null;
let previousPad = [],
	padNavClock = 0,
	physicsLines = null,
	showPhysics = false,
	endingShown = false,
	ended = false;
let settings = {
	music: 0.1,
	master: 0.72,
	glyphs: "ps",
	haptics: true,
	assist: false,
};
let best = 0;
try {
	best = Number(localStorage.getItem("cosmic-hitchhikers-best")) || 0;
	const saved = JSON.parse(
		localStorage.getItem("cosmic-hitchhikers-settings") || "null",
	);
	if (saved) settings = { ...settings, ...saved, music: 0.1 };
} catch {}
const audio = new AudioEngine();
audio.setMusicVolume(settings.music);
audio.setMasterVolume(settings.master);
const keys = new Set(),
	touches = new Map(),
	remoteInputs = new Map(),
	pointerWorld = { x: 0, y: 0 };
let touchStart = null,
	touchVector = { x: 0, y: 0 };
const net = new NetworkSession({
	onInput: (id, input) =>
		remoteInputs.set(id, { input, at: performance.now() }),
	onSnapshot: (s) => {
		const previous = remoteState;
		remoteState = s;
		if (previous && s.time >= previous.time) {
			if (s.shots > previous.shots) audio.sfx("shoot");
			if (s.damageTaken > previous.damageTaken) {
				audio.sfx("hit");
				haptic("hit");
			}
			if (s.cargo > previous.cargo) {
				audio.sfx("rescue");
				audio.voice(s.saved + 19);
				visuals?.spawnEffect("rescue", s.ship.x, s.ship.y);
			}
			if (s.saved > previous.saved) {
				audio.sfx("dock");
				notice("PASSENGERS SAFELY ABOARD");
			}
			if (s.phase !== previous.phase) {
				if (s.phase === "rescue") {
					banner(
						`PLANET ${s.planet + 1} · ${PLANETS[s.planet].name.toUpperCase()}`,
						"BRING THEM HOME",
						PLANETS[s.planet].call,
					);
					audio.voice(s.planet + 9);
				}
				if (s.phase === "escape")
					banner(
						"ALL SIX SAFELY ABOARD",
						"THE LAST LIGHT",
						"Hold the line. One final storm between us and home.",
					);
				if (s.phase === "win" || s.phase === "lose") audio.sfx(s.phase);
			}
		}
		const restarted = previous?.ending && !s.ending;
		if (!net.hub && s.active && (!playActive || restarted)) {
			endingShown = false;
			playActive = true;
			mode = "playing";
			$("overlay").hidden = true;
			$("titleScreen").hidden = true;
			$("hud").hidden = false;
			$("topBrand").hidden = true;
			audio.setMuted(false);
		} else if (!net.hub && !s.active && playActive) {
			title();
			notice("HOST IS PREPARING THE NEXT FLIGHT");
		}
	},
	onStatus: (s) => {
		if ($("crewStatus"))
			$("crewStatus").textContent =
				s.count > 1
					? `${s.hub ? "AI HUB" : "LOCAL LINK"} · ${s.count} CREW · SHARED HELM`
					: "";
		if ($("linkStatus"))
			$("linkStatus").textContent = s.message || `${s.count} crew connected`;
	},
	onStart: () => {
		start(false, true);
		notice("CREW SYNCHRONIZED · STAND BY", 3);
	},
	onEnd: () => {
		keys.clear();
		pointerFire = false;
		if (net.hub) {
			ended = true;
			playActive = false;
			audio.setMuted(true);
			$("overlay").hidden = true;
			notice("MISSION ENDED · RESULTS ON AI HUB", 60);
		} else {
			net.leave();
			remoteInputs.clear();
			title();
			$("titlePrompt").textContent =
				"LOCAL HOST DISCONNECTED · SOLO FLIGHT IS READY";
		}
	},
	onTimeUp: () => {
		if (sim && net.info.authority)
			net.finish(sim.state.score, sim.state.phase === "win");
	},
});

function interacted(type) {
	lastInput = performance.now();
	if (inputMode !== type) {
		inputMode = type;
		updatePrompts();
	}
	if (type === "touch") document.body.classList.add("touch");
	audio.unlock();
}
function saveSettings() {
	try {
		localStorage.setItem(
			"cosmic-hitchhikers-settings",
			JSON.stringify(settings),
		);
	} catch {}
}
function glyph(ps, xbox, key) {
	return inputMode === "gamepad"
		? settings.glyphs === "xbox"
			? xbox
			: ps
		: key;
}
function updatePrompts() {
	if (!$("controlHint")) return;
	const phase = currentState()?.phase;
	const pad = inputMode === "gamepad",
		touch = inputMode === "touch";
	$("titlePrompt").textContent = touch
		? "TOUCH TO FLY · TRACTOR BEAM ASSISTED"
		: pad
			? `${glyph("✕", "A", "ENTER")} LAUNCH · LEFT STICK TO FLY`
			: "WASD / ARROWS TO FLY · SPACE TO BEAM";
	$("controlHint").textContent = touch
		? "DRAG LEFT TO FLY · BEAM ASSISTED"
		: phase === "rescue"
			? pad
				? `LEFT STICK FLY · ${glyph("✕", "A", "SPACE")} BEAM · ${glyph("○", "B", "SHIFT")} PULSE`
				: "WASD FLY · SPACE BEAM · SHIFT PULSE · CLICK A BEASTIE TO APPROACH"
			: pad
				? `LEFT STICK AIM & FIRE · ${glyph("○", "B", "SHIFT")} PULSE`
				: "WASD / ARROWS AIM & FIRE · MOUSE AIM + HOLD · SHIFT PULSE";
}
function currentState() {
	return net.info.authority || !remoteState ? sim?.state : remoteState;
}
function notice(message, duration = 3) {
	$("notice").textContent = message;
	noticeTimer = duration;
}
function banner(kicker, title, text, duration = 3.4) {
	$("bannerKicker").textContent = kicker;
	$("bannerTitle").textContent = title;
	$("bannerText").textContent = text;
	$("phaseBanner").classList.add("show");
	bannerTimer = duration;
}
function haptic(type) {
	if (!settings.haptics || inputMode !== "gamepad") return;
	for (const p of navigator.getGamepads?.() || [])
		try {
			p?.vibrationActuator
				?.playEffect("dual-rumble", {
					duration: type === "hit" ? 180 : 70,
					strongMagnitude: type === "hit" ? 0.65 : 0.15,
					weakMagnitude: 0.3,
				})
				.catch(() => {});
		} catch {}
}
function event(e) {
	if (mode === "loading") return;
	if (e.type === "phase") {
		updatePrompts();
		const p = PLANETS[sim.state.planet];
		if (e.phase === "defense")
			banner(
				`SECTOR ${sim.state.planet + 1} / 3`,
				"METEOR WATCH",
				"Aim into the storm. Protect the Ark.",
			);
		if (e.phase === "rescue") {
			banner(
				`PLANET ${sim.state.planet + 1} · ${p.name.toUpperCase()}`,
				"BRING THEM HOME",
				p.call,
			);
			audio.voice(sim.state.planet + 9);
		}
		if (e.phase === "transit") {
			banner(
				"PAIR SAFELY ABOARD",
				"TWO BY TWO",
				"Another little world is counting on you.",
			);
			audio.sfx("warp");
		}
		if (e.phase === "escape") {
			banner(
				"ALL SIX SAFELY ABOARD",
				"THE LAST LIGHT",
				"Hold the line. One final storm between us and home.",
				4,
			);
			audio.voice(88);
		}
	}
	const sounds = {
		shoot: "shoot",
		explode: "explode",
		spark: "hit",
		hit: "hit",
		rescue: "rescue",
		dock: "dock",
		shield: "shield",
		warning: "warning",
		win: "win",
		lose: "lose",
		recall: "warning",
	};
	if (sounds[e.type]) audio.sfx(sounds[e.type], sim.state.planet);
	if (
		["explode", "spark", "hit", "rescue", "dock", "shield", "drop"].includes(
			e.type,
		)
	)
		visuals?.spawnEffect(
			e.type,
			e.x ?? 0,
			e.y ?? 5,
			e.type === "rescue" ? 0xb4eaa4 : undefined,
		);
	if (e.type === "rescue") {
		notice(
			`${PLANETS[sim.state.planet].species.toUpperCase()} ABOARD · +250`,
			2,
		);
		audio.voice(e.x + 12);
		haptic("rescue");
	}
	if (e.type === "dock") {
		notice(
			e.all
				? "PAIR SECURED · ENERGY RESTORED"
				: "PASSENGER HOME · ONE MORE TO GO",
			3,
		);
		haptic("rescue");
	}
	if (e.type === "hit") {
		notice(
			e.target === "ship"
				? "SENTRY HIT · CHECK YOUR CARGO"
				: "ARK HIT · ENERGY LOST",
			2,
		);
		haptic("hit");
	}
	if (e.type === "drop") notice("BEASTIE RELEASED · BRING IT BACK!", 3);
	if (e.type === "warning") notice("METEOR WARNING · RETURN TO THE ARK!", 12);
	if (e.type === "recall")
		notice("EMERGENCY RECALL · CARGO LEFT ON THE SURFACE", 3);
	if (e.type === "win" || e.type === "lose") {
		if (!sim.state.attract) {
			net.finish(sim.state.score, e.type === "win");
			if (sim.state.score > best) {
				best = sim.state.score;
				try {
					localStorage.setItem("cosmic-hitchhikers-best", best);
				} catch {}
			}
		}
	}
}
function start(attract = false, hubStart = false) {
	if (ended) return;
	if (net.hub && !hubStart) return;
	if (!net.hub && !net.info.authority) {
		crewMenu();
		$("linkStatus").textContent = "Your host will launch the rescue.";
		return;
	}
	sim.reset(attract);
	sim.god = attract;
	sim.auto = false;
	sim.params = { ...DEFAULTS };
	endingShown = false;
	wasAttract = attract;
	remoteState = null;
	playActive = true;
	mode = attract ? "attract" : "playing";
	keys.clear();
	mouseTarget = null;
	pointerFire = false;
	touchStart = null;
	touchVector = { x: 0, y: 0 };
	$("titleScreen").hidden = true;
	$("overlay").hidden = true;
	$("hud").hidden = false;
	$("topBrand").hidden = true;
	$("attractLabel").hidden = !attract;
	$("touchPulse").hidden = inputMode !== "touch";
	audio.setMuted(false);
	updatePrompts();
	banner(
		attract ? "AUTOPILOT DEMONSTRATION" : "MERIDIAN RESCUE AUTHORITY",
		"METEOR WATCH",
		"Aim into the storm. Protect the Ark.",
	);
}
function title() {
	if (net.hub) return;
	mode = "title";
	playActive = false;
	wasAttract = false;
	endingShown = false;
	lastInput = performance.now();
	keys.clear();
	mouseTarget = null;
	pointerFire = false;
	$("overlay").hidden = true;
	$("hud").hidden = true;
	$("attractLabel").hidden = true;
	$("titleScreen").hidden = false;
	$("topBrand").hidden = false;
	$("touchPulse").hidden = true;
	$("bestScore").textContent = `BEST FLIGHT ${String(best).padStart(6, "0")}`;
	$("start").focus({ preventScroll: true });
}
function closeMenu() {
	if (returnMode === "title") {
		title();
		return;
	}
	mode = "playing";
	$("overlay").hidden = true;
	keys.clear();
	pointerFire = false;
	lastInput = performance.now();
}
function menu(name, html, wide = false) {
	mode = name;
	$("overlay").hidden = false;
	$("menuPanel").classList.toggle("wide", wide);
	$("menuPanel").innerHTML = html;
	$("menuPanel").scrollTop = 0;
	requestAnimationFrame(() => {
		$("menuPanel")
			.querySelector("button,input,select")
			?.focus({ preventScroll: true });
	});
}
function button(id, text, primary = false, disabled = false) {
	return `<button id="${id}" class="${primary ? "primary" : ""}" ${disabled ? "disabled" : ""}>${text}</button>`;
}
function bind(id, fn) {
	$(id)?.addEventListener("click", () => {
		audio.sfx("menu");
		fn();
	});
}
function pause() {
	if (net.hub || ended) return;
	if (mode === "attract") {
		title();
		return;
	}
	if (mode !== "playing") {
		closeMenu();
		return;
	}
	returnMode = "playing";
	keys.clear();
	pointerFire = false;
	menu(
		"paused",
		`<p class="eyebrow">ALL HANDS · TAKE A BREATHER</p><h2>Holding orbit.</h2><div class="menu-buttons">${button("pauseResume", "Resume flight", true)}${button("pauseSettings", "Flight settings")}${button("devButton", "Developer tools")}${button("pauseManual", "Flight manual")}${button("pauseAbout", "About & credits")}${button("pauseQuit", "Return to title")}</div><p class="menu-footer">${glyph("✕", "A", "ENTER")} SELECT · ${glyph("○", "B", "ESC")} RESUME</p>`,
	);
	bind("pauseResume", closeMenu);
	bind("pauseSettings", settingsMenu);
	bind("devButton", devMenu);
	bind("pauseManual", manual);
	bind("pauseAbout", about);
	bind("pauseQuit", () => {
		net.leave();
		remoteInputs.clear();
		title();
	});
}
function back() {
	if (mode === "title") return;
	if (mode === "playing") {
		pause();
		return;
	}
	if (mode === "attract") {
		title();
		return;
	}
	if (
		["settings", "manual", "about", "crew", "dev"].includes(mode) &&
		returnMode === "playing"
	) {
		mode = "playing";
		pause();
	} else closeMenu();
}
function settingsMenu() {
	menu(
		"settings",
		`<p class="eyebrow">TUNE YOUR FLIGHT</p><h2>Shipshape.</h2><div class="settings-row"><label for="musicVolume">Music <small id="musicValue">${Math.round(settings.music * 100)}%</small></label><input id="musicVolume" type="range" min="0" max="1" step="0.01" value="${settings.music}"></div><div class="settings-row"><label for="masterVolume">Master volume <small id="masterValue">${Math.round(settings.master * 100)}%</small></label><input id="masterVolume" type="range" min="0" max="1" step="0.01" value="${settings.master}"></div><div class="settings-row"><label for="glyphStyle">Controller prompts</label><select id="glyphStyle"><option value="ps">PlayStation · ✕ ○ □ △</option><option value="xbox">Xbox · A B X Y</option></select></div><div class="settings-row"><label for="haptics">Controller rumble</label><input id="haptics" type="checkbox" ${settings.haptics ? "checked" : ""}></div><div class="settings-row"><label for="assist">Tractor assist<small>Automatically beam when lined up</small></label><input id="assist" type="checkbox" ${settings.assist ? "checked" : ""}></div><div class="button-row"><button id="fullScreen" class="secondary">Fullscreen ↗</button><button id="settingsBack" class="secondary">Done</button></div>`,
	);
	$("glyphStyle").value = settings.glyphs;
	$("musicVolume").oninput = (e) => {
		settings.music = Number(e.target.value);
		audio.setMusicVolume(settings.music);
		$("musicValue").textContent = `${Math.round(settings.music * 100)}%`;
		saveSettings();
	};
	$("masterVolume").oninput = (e) => {
		settings.master = Number(e.target.value);
		audio.setMasterVolume(settings.master);
		$("masterValue").textContent = `${Math.round(settings.master * 100)}%`;
		saveSettings();
	};
	$("glyphStyle").onchange = (e) => {
		settings.glyphs = e.target.value;
		updatePrompts();
		saveSettings();
	};
	$("haptics").onchange = (e) => {
		settings.haptics = e.target.checked;
		saveSettings();
	};
	$("assist").onchange = (e) => {
		settings.assist = e.target.checked;
		saveSettings();
	};
	bind("fullScreen", () => {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else
			document.documentElement
				.requestFullscreen?.()
				.catch(() => notice("Fullscreen unavailable in this browser"));
	});
	bind("settingsBack", back);
}
function manual() {
	const pad = inputMode === "gamepad";
	menu(
		"manual",
		`<p class="eyebrow">FLIGHT MANUAL · NO BEASTIE LEFT BEHIND</p><h2>A small mission of mercy.</h2><div class="manual-grid"><div class="manual-step"><span>01 / DEFEND</span><h3>Weather the storm.</h3><p>${pad ? "Lean the left stick" : "Press WASD / arrows, or hold the mouse button and aim"} to fire in any direction. Gold rocks take two hits. Pink rocks weave. Each shot uses a little energy.</p></div><div class="manual-step"><span>02 / DESCEND</span><h3>Meet the locals.</h3><p>Fly with ${pad ? "the left stick" : "WASD / arrows"}. Hover above a beastie, below the dashed flight line, and hold ${pad ? glyph("✕", "A", "SPACE") : "Space"} to beam it aboard. With a mouse, click a beastie to approach and beam automatically.</p></div><div class="manual-step"><span>03 / DELIVER</span><h3>Two by two.</h3><p>Carry the pair up to the glowing dock beneath the Ark. Rescue refills energy. You can deliver one at a time. A sentry hit releases one undelivered passenger.</p></div><div class="manual-step"><span>04 / SURVIVE</span><h3>Watch the warning.</h3><p>Pink dashed lines warn of sentry fire. ${pad ? glyph("○", "B", "SHIFT") : "Shift"} creates a shield pulse. Return before the rescue timer runs out, or lose undelivered cargo. Save three pairs, then survive the final escape.</p></div></div><p class="menu-footer">TOUCH: DRAG ANYWHERE ON THE LEFT TO FLY. BEAM AND AIM ARE ASSISTED. TAP THE RIGHT SIDE FOR A SHIELD PULSE.<br>CREW: 1–4 PLAYERS SHARE THE HELM. STEERING COMBINES; ANYONE CAN BEAM OR PULSE. SOLO USES THE SAME RULES.</p><div class="button-row"><button id="manualBack" class="secondary">Ready for anything</button></div>`,
		true,
	);
	bind("manualBack", back);
}
function about() {
	const labels = {
		date: "Date",
		source: "Source",
		plan: "Plan",
		genre: "Genre",
		perspective: "Perspective",
		tech: "Tech",
		artDirection: "Art Direction",
		animation: "Animation",
		audio: "Audio",
		online: "Online",
		testing: "Testing",
		research: "Research",
		environment: "Environment",
		model: "Model",
		usage: "Usage",
	};
	const questions = [
		[
			"Testing Feedback",
			[
				"Issues caught",
				"Critical / game breaking",
				"Most helpful test",
				"Least helpful test",
			],
			credits.testingFeedback,
		],
		[
			"Engine Feedback",
			[
				"Liked most",
				"Stuck or guessed wrong",
				"Built ourselves",
				"Hardest part",
				"Engine changes",
				"Would change",
			],
			credits.engineFeedback,
		],
		[
			"Prompt Feedback",
			["Liked most", "Confusing", "Hardest part", "Would change"],
			credits.promptFeedback,
		],
	];
	menu(
		"about",
		`<p class="eyebrow">THE PEOPLE, THE PIXELS, THE LITTLE BEASTIES</p><h2>Cosmic Hitchhikers</h2><div class="credits"><p>An original game inspired by Rob Fulop’s <i>Cosmic Ark</i>, published by Imagic in 1982. All models, animation and sound in this game are made in code.</p><h3>Source Information</h3>${Object.entries(
			labels,
		)
			.map(
				([k, l]) =>
					`<div class="credit-row"><b>${l}</b><span>${esc(credits.sourceInformation[k] || "unknown")}</span></div>`,
			)
			.join(
				"",
			)}<p>Research: <a href="https://www.atariage.com/2600/manuals_old/cosmic_ark.html" target="_blank" rel="noopener">Original game manual</a> · <a href="https://atariage.com/screenshot_page.php?SoftwareLabelID=104" target="_blank" rel="noopener">Original screenshots</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a></p>${questions.map(([title, qs, answers]) => `<h3>${title}</h3>${qs.map((q, i) => `<div class="credit-row"><b>${q}</b><span>${esc(answers[i] || "unknown")}</span></div>`).join("")}`).join("")}<h3>Open-source credits</h3><p>Three.js r180 · MIT. Rapier 0.19.3 · Apache 2.0. AI Hub session client 1.4.0. Original procedural art, synth music and gibberish performances. Game title chosen by a cryptographic random draw from 50 candidates.</p></div><div class="button-row"><button id="aboutBack" class="secondary">Back to the stars</button></div>`,
		true,
	);
	if (net.hub)
		$("menuPanel")
			.querySelectorAll("a")
			.forEach((a) => {
				a.removeAttribute("href");
				a.removeAttribute("target");
			});
	bind("aboutBack", back);
}
function devMenu() {
	if (net.hub) return;
	const fields = [
		["shipSpeed", "Shuttle speed", 3, 16, 0.2],
		["meteorSpeed", "Meteor speed", 0.3, 2.5, 0.1],
		["spawnRate", "Meteor density", 0.4, 2.5, 0.1],
		["beamRate", "Tractor speed", 0.4, 3, 0.1],
		["damage", "Damage multiplier", 0, 3, 0.1],
		["fuelDrain", "Energy drain", 0, 5, 0.1],
		["rescueTime", "Rescue window", 15, 100, 1],
		["pulseCooldown", "Pulse cooldown", 1, 15, 0.5],
	];
	menu(
		"dev",
		`<p class="eyebrow">DEVELOPER TOOLS · LIVE FLIGHT TUNING</p><h2>Mission control.</h2>${fields.map(([k, l, min, max, step]) => `<div class="settings-row"><label for="dev-${k}">${l}<small id="value-${k}">${sim.params[k]}</small></label><input id="dev-${k}" type="range" min="${min}" max="${max}" step="${step}" value="${sim.params[k]}"></div>`).join("")}<div class="settings-row"><label for="devGod">Invulnerability</label><input id="devGod" type="checkbox" ${sim.god ? "checked" : ""}></div><div class="settings-row"><label for="devAuto">Autopilot</label><input id="devAuto" type="checkbox" ${sim.auto ? "checked" : ""}></div><div class="settings-row"><label for="devPhysics">Physics outlines</label><input id="devPhysics" type="checkbox" ${showPhysics ? "checked" : ""}></div><div class="button-row"><button id="devRefill" class="secondary">Refill energy</button><button id="devNext" class="secondary">Next phase</button></div><div class="button-row"><button id="devPair" class="secondary">Rescue pair</button><button id="devReset" class="secondary">Reset defaults</button></div><div class="button-row"><button id="devBack" class="primary">Resume flight</button></div>`,
		true,
	);
	for (const [k] of fields)
		$(`dev-${k}`).oninput = (e) => {
			sim.params[k] = Number(e.target.value);
			$(`value-${k}`).textContent = e.target.value;
		};
	$("devGod").onchange = (e) => (sim.god = e.target.checked);
	$("devAuto").onchange = (e) => (sim.auto = e.target.checked);
	$("devPhysics").onchange = (e) => (showPhysics = e.target.checked);
	bind("devRefill", () => {
		sim.state.fuel = 100;
		notice("ENERGY REFILLED");
	});
	bind("devNext", () => {
		const p = sim.state.phase;
		if (p === "defense") sim.setPhase("rescue");
		else if (p === "rescue") sim.setPhase("transit");
		else if (p === "escape") sim.finish(true);
		else if (p === "transit") {
			sim.state.phaseTime = 4;
		}
		closeMenu();
	});
	bind("devPair", () => {
		if (sim.state.phase !== "rescue") sim.setPhase("rescue");
		for (const c of sim.state.creatures)
			if (!c.saved && !c.captured) sim.capture(c);
		closeMenu();
	});
	bind("devReset", () => {
		sim.params = { ...DEFAULTS };
		sim.god = false;
		sim.auto = false;
		showPhysics = false;
		devMenu();
	});
	bind("devBack", closeMenu);
}
function crewMenu() {
	returnMode = "title";
	menu(
		"crew",
		`<p class="eyebrow">MORE HANDS. SAME PRECIOUS CARGO.</p><h2>Assemble a crew.</h2><p>In AI Hub, up to four players join across devices automatically. Everyone shares the helm, tractor beam and pulse shield.</p><p>Standalone local link connects tabs in this browser on the same device. Choose the same code in each tab.</p><div class="settings-row"><label for="roomCode">Link code</label><input id="roomCode" type="text" maxlength="16" value="STAR082" spellcheck="false" autocomplete="off"></div><div class="button-row"><button id="hostCrew" class="primary">Host crew</button><button id="joinCrew" class="secondary">Join crew</button></div><p id="linkStatus" role="status">No crew linked. Solo flight is always available.</p><div class="button-row"><button id="crewLaunch" class="secondary">Launch flight</button><button id="crewBack" class="secondary">Back</button></div><p class="menu-footer">CROSS-DEVICE ONLINE PLAY IS PROVIDED BY AI HUB SESSIONS.<br>LOCAL CONTROLLERS CAN ALSO HELP STEER THE SAME SHUTTLE.</p>`,
	);
	bind("hostCrew", () => {
		net.hostRoom($("roomCode").value);
	});
	bind("joinCrew", () => {
		net.joinRoom($("roomCode").value);
	});
	bind("crewLaunch", () => {
		if (net.info.authority) start();
		else
			$("linkStatus").textContent = "Linked. Your host will launch the rescue.";
	});
	bind("crewBack", title);
}
function results(s) {
	if (endingShown || net.hub) return;
	endingShown = true;
	mode = "results";
	const won = s.phase === "win";
	returnMode = "title";
	menu(
		"results",
		`<p class="eyebrow">${won ? "MERIDIAN FLIGHT LOG · MISSION COMPLETE" : "MERIDIAN FLIGHT LOG · SIGNAL LOST"}</p><h2>${won ? "A universe of<br>second chances." : "The stars remember."}</h2><p>${won ? "Six little lives. Three rescued worlds. Somewhere beyond the dying sun, a new home is waiting." : "The Ark’s energy has run out. Your rescue signal carries on through the stars. Give the little ones another chance."}</p><div class="score-big">${String(s.score).padStart(6, "0")}</div><div class="result-stats"><div><b>${s.saved}/6</b><span>BEASTIES HOME</span></div><div><b>${s.bestCombo}</b><span>BEST STREAK</span></div><div><b>${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, "0")}</b><span>FLIGHT TIME</span></div></div><div class="menu-buttons">${button("again", "Fly again", true)}${button("resultsTitle", "Return to title")}</div>`,
	);
	if (!net.info.authority) {
		$("again").disabled = true;
		$("again").textContent = "Waiting for host to fly again";
	}
	bind("again", () => start());
	bind("resultsTitle", () => {
		if (!net.info.authority) net.leave();
		title();
	});
}

function menuItems() {
	return [
		...(mode === "title" ? $("titleScreen") : $("menuPanel")).querySelectorAll(
			"button:not(:disabled),input,select",
		),
	].filter((e) => e.offsetParent !== null);
}
function navigate(dx, dy) {
	if (mode === "about" && dy) {
		$("menuPanel").scrollBy({ top: dy * 150, behavior: "smooth" });
		return;
	}
	const items = menuItems();
	if (!items.length) return;
	const active = document.activeElement;
	if (dx && active?.type === "range") {
		active.value = clamp(
			Number(active.value) + Number(active.step || 0.01) * dx,
			Number(active.min),
			Number(active.max),
		);
		active.dispatchEvent(new Event("input", { bubbles: true }));
		return;
	}
	if (dx && active?.tagName === "SELECT") {
		active.selectedIndex = clamp(
			active.selectedIndex + dx,
			0,
			active.options.length - 1,
		);
		active.dispatchEvent(new Event("change", { bubbles: true }));
		return;
	}
	let i = items.indexOf(active);
	i = (i + (dy || dx) + items.length) % items.length;
	items[i].focus({ preventScroll: true });
	items[i].scrollIntoView({ block: "nearest" });
	audio.sfx("menu");
}
function pointerToWorld(e) {
	if (!camera || !renderer) return;
	const r = renderer.domElement.getBoundingClientRect();
	const ndc = new THREE.Vector2(
		((e.clientX - r.left) / r.width) * 2 - 1,
		1 - ((e.clientY - r.top) / r.height) * 2,
	);
	const ray = new THREE.Raycaster();
	ray.setFromCamera(ndc, camera);
	const p = new THREE.Vector3();
	ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), p);
	pointerWorld.x = p.x;
	pointerWorld.y = p.y;
}
function input() {
	if (inputOverride) return inputOverride;
	let x =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
		y =
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
	let beam = keys.has("Space") || settings.assist,
		pulse = keys.has("ShiftLeft") || keys.has("ShiftRight"),
		aimX = x,
		aimY = y,
		fire = !!(x || y);
	const s = currentState();
	if (pointerFire) {
		aimX = pointerWorld.x - s.ark.x;
		aimY = pointerWorld.y - s.ark.y;
		fire = true;
	}
	if (mouseTarget && s.phase === "rescue" && inputMode === "mouse") {
		const c = s.creatures.find(
			(c) => c.id === mouseTarget.id && !c.captured && !c.saved,
		);
		const tx = c ? c.x : 0,
			ty = c ? -3.6 : 4.8;
		x = clamp((tx - s.ship.x) * 1.8, -1, 1);
		y = clamp((ty - s.ship.y) * 1.8, -1, 1);
		beam = !!c;
		if (!c && s.cargo === 0) mouseTarget = null;
	}
	for (const p of navigator.getGamepads?.() || []) {
		if (!p?.connected) continue;
		const dead = (n) => (Math.abs(n || 0) > 0.18 ? n : 0);
		const px = dead(p.axes[0]),
			py = -dead(p.axes[1]);
		const dx =
				(p.buttons[15]?.pressed ? 1 : 0) - (p.buttons[14]?.pressed ? 1 : 0),
			dy = (p.buttons[12]?.pressed ? 1 : 0) - (p.buttons[13]?.pressed ? 1 : 0);
		if (px || py || dx || dy) {
			x += px + dx;
			y += py + dy;
			aimX = px + dx;
			aimY = py + dy;
			fire = true;
		}
		if (dead(p.axes[2]) || dead(p.axes[3])) {
			aimX = dead(p.axes[2]);
			aimY = -dead(p.axes[3]);
			fire = true;
		}
		beam ||= p.buttons[0]?.pressed || p.buttons[7]?.pressed;
		pulse ||= p.buttons[1]?.pressed || p.buttons[4]?.pressed;
	}
	if (inputMode === "touch") {
		x = touchVector.x;
		y = touchVector.y;
		beam = true;
		if (s.phase === "defense" || s.phase === "escape") {
			const m = [...s.meteors].sort(
				(a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y),
			)[0];
			if (m) {
				aimX = m.x;
				aimY = m.y;
				fire = true;
			}
		}
	}
	return {
		x: clamp(x, -1, 1),
		y: clamp(y, -1, 1),
		aimX,
		aimY,
		fire,
		beam: !!beam,
		pulse: !!pulse,
	};
}
function combine(local) {
	let out = { ...local };
	for (const [id, remote] of remoteInputs) {
		if (performance.now() - remote.at > 600) {
			remoteInputs.delete(id);
			continue;
		}
		const r = remote.input;
		if (!r) continue;
		out.x = clamp((out.x || 0) + (Number(r.x) || 0), -1, 1);
		out.y = clamp((out.y || 0) + (Number(r.y) || 0), -1, 1);
		out.beam ||= !!r.beam;
		out.pulse ||= !!r.pulse;
		if (!out.fire && r.fire) {
			out.fire = true;
			out.aimX = Number(r.aimX) || 0;
			out.aimY = Number(r.aimY) || 0;
		}
	}
	return out;
}
function pollPads(dt) {
	padNavClock -= dt;
	const pads = navigator.getGamepads?.() || [];
	let any = false;
	for (const p of pads) {
		if (!p?.connected) continue;
		const old = previousPad[p.index] || [],
			buttons = p.buttons.map((b) => b.pressed),
			edge = (i) => buttons[i] && !old[i];
		const active =
			buttons.some(Boolean) || p.axes.some((a) => Math.abs(a) > 0.23);
		if (active) {
			any = true;
			interacted("gamepad");
		}
		if (mode === "attract" && active) {
			title();
			previousPad[p.index] = buttons;
			continue;
		}
		if (edge(9) && !buttons[8] && !net.hub) {
			pause();
			previousPad[p.index] = buttons;
			continue;
		}
		if (!["playing", "attract", "loading"].includes(mode)) {
			if (edge(0)) {
				document.activeElement?.click();
			} else if (edge(1)) {
				back();
			}
			const dx = edge(14) ? -1 : edge(15) ? 1 : 0,
				dy = edge(12) ? -1 : edge(13) ? 1 : 0;
			if (dx || dy) {
				navigate(dx, dy);
				padNavClock = 0.22;
			} else if (padNavClock <= 0) {
				const ax = p.axes[0] || 0,
					ay = p.axes[1] || 0;
				if (Math.abs(ay) > 0.55) {
					navigate(0, Math.sign(ay));
					padNavClock = 0.22;
				} else if (Math.abs(ax) > 0.55) {
					navigate(Math.sign(ax), 0);
					padNavClock = 0.22;
				}
			}
		}
		previousPad[p.index] = buttons;
	}
	return any;
}

window.addEventListener(
	"keydown",
	(e) => {
		if (ended) return;
		interacted("keyboard");
		if (mode === "attract") {
			e.preventDefault();
			e.stopPropagation();
			title();
			return;
		}
		if (e.target?.tagName === "INPUT" && e.target.type === "text") return;
		if (e.code === "Escape" || e.code === "KeyP") {
			e.preventDefault();
			if (mode === "playing") pause();
			else back();
			return;
		}
		if (
			["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
				e.code,
			)
		)
			e.preventDefault();
		if (!["playing", "attract"].includes(mode)) {
			if (e.code.startsWith("Arrow"))
				navigate(
					e.code === "ArrowRight" ? 1 : e.code === "ArrowLeft" ? -1 : 0,
					e.code === "ArrowDown" ? 1 : e.code === "ArrowUp" ? -1 : 0,
				);
			if ((e.code === "Enter" || e.code === "Space") && !e.repeat) {
				e.preventDefault();
				document.activeElement?.click();
			}
			return;
		}
		keys.add(e.code);
		if (
			[
				"KeyW",
				"KeyA",
				"KeyS",
				"KeyD",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
			].includes(e.code)
		)
			mouseTarget = null;
	},
	true,
);
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	pointerFire = false;
	touchVector = { x: 0, y: 0 };
	if (mode === "playing" && !net.hub && net.info.role === "solo") pause();
});
window.addEventListener(
	"pointerdown",
	(e) => {
		if (ended) return;
		const type = e.pointerType === "touch" ? "touch" : "mouse";
		interacted(type);
		if (mode === "attract") {
			e.preventDefault();
			e.stopPropagation();
			title();
			return;
		}
		if (mode !== "playing" || e.target.closest("button,input,select,a")) return;
		pointerToWorld(e);
		if (type === "touch") {
			touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
			if (e.clientX < innerWidth * 0.65 && !touchStart) {
				touchStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
				touchVector = { x: 0, y: 0 };
			} else {
				if (net.info.authority) sim.pulse();
				else inputOverride = { ...input(), pulse: true };
			}
		} else {
			pointerFire = true;
			if (currentState().phase === "rescue") {
				const c = currentState()
					.creatures.filter((c) => !c.captured && !c.saved)
					.sort(
						(a, b) =>
							Math.hypot(a.x - pointerWorld.x, a.y - pointerWorld.y) -
							Math.hypot(b.x - pointerWorld.x, b.y - pointerWorld.y),
					)[0];
				if (c) mouseTarget = { id: c.id };
			}
		}
	},
	true,
);
window.addEventListener("pointermove", (e) => {
	if (ended) return;
	if (mode === "attract" && Math.abs(e.movementX) + Math.abs(e.movementY) > 1) {
		interacted(e.pointerType === "touch" ? "touch" : "mouse");
		title();
		return;
	}
	if (e.pointerType === "touch") {
		if (touchStart?.id === e.pointerId) {
			const r = Math.min(innerWidth, innerHeight) * 0.14;
			touchVector = {
				x: clamp((e.clientX - touchStart.x) / r, -1, 1),
				y: clamp(-(e.clientY - touchStart.y) / r, -1, 1),
			};
		}
	} else {
		pointerToWorld(e);
		if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) interacted("mouse");
	}
	const el = e.target.closest("button");
	if (el && document.activeElement !== el) el.focus({ preventScroll: true });
});
function pointerUp(e) {
	pointerFire = false;
	touches.delete(e.pointerId);
	if (touchStart?.id === e.pointerId) {
		touchStart = null;
		touchVector = { x: 0, y: 0 };
	}
	if (e.pointerType === "touch" && inputOverride?.pulse) inputOverride = null;
}
window.addEventListener("pointerup", pointerUp);
window.addEventListener("pointercancel", pointerUp);
window.addEventListener("contextmenu", (e) => e.preventDefault());

function screenPosition(x, y) {
	const v = new THREE.Vector3(x, y, 0.5).project(camera);
	return {
		x: (v.x * 0.5 + 0.5) * innerWidth,
		y: (-0.5 * v.y + 0.5) * innerHeight,
	};
}
function labels(s) {
	if (s.phase !== "rescue") {
		$("worldLabels").innerHTML = "";
		return;
	}
	const dock = screenPosition(0, 3.1);
	let h = `<div class="world-label dock" style="left:${dock.x}px;top:${dock.y}px">${s.cargo ? "↑ RETURN CARGO TO DOCK" : "THE ARK · DOCK HERE"}</div>`;
	for (const c of s.creatures) {
		if (c.saved || c.captured || inputMode === "touch") continue;
		const p = screenPosition(c.x, -8.15);
		h += `<div class="world-label" style="left:${p.x}px;top:${p.y}px">${c.progress > 0 ? `BEAM ${Math.ceil(c.progress * 100)}%` : PLANETS[s.planet].species.toUpperCase()}</div>`;
	}
	$("worldLabels").innerHTML = h;
}
function hud(s) {
	const p = PLANETS[Math.min(2, s.planet)];
	$("sectorLabel").textContent =
		s.phase === "escape"
			? "ALL PASSENGERS ABOARD"
			: `SECTOR ${String(s.planet + 1).padStart(2, "0")} / 03 · ${p.name.toUpperCase()}`;
	$("phaseLabel").textContent =
		{
			defense: "METEOR WATCH",
			rescue: "SURFACE RESCUE",
			transit: "PAIR SECURED",
			escape: "FINAL ESCAPE",
			win: "MISSION COMPLETE",
			lose: "SIGNAL LOST",
		}[s.phase] || "FLIGHT LOG";
	$("fuelNumber").textContent = Math.ceil(s.fuel);
	$("fuelFill").style.width = `${s.fuel}%`;
	$("fuelFill").style.background =
		s.fuel < 25 ? "var(--orange)" : "var(--teal)";
	$("scoreNumber").textContent = String(s.score).padStart(6, "0");
	$("passengers").innerHTML = Array.from(
		{ length: 6 },
		(_, i) =>
			`<span style="color:${i < s.saved ? "var(--gold)" : i < s.saved + s.cargo ? "var(--teal)" : "#536f79"}">${i < s.saved ? "●" : i < s.saved + s.cargo ? "◉" : "○"}</span>`,
	).join(" ");
	const objective =
		s.phase === "rescue"
			? s.cargo === 2
				? "↑ Return to the Ark."
				: s.cargo === 1
					? "One aboard. Find its friend."
					: inputMode === "touch"
						? "Hover above a beastie. Beam is assisted."
						: "Hover above a beastie. Hold the beam."
			: s.phase === "transit"
				? "A pair saved. A promise kept."
				: s.phase === "escape"
					? "Keep them safe. Almost home."
					: "Aim into the storm. Protect the Ark.";
	$("objective").textContent =
		s.phase === "rescue" && s.warning
			? `RETURN TO ARK · ${Math.ceil(sim.params.rescueTime - s.phaseTime)}s`
			: objective;
	$("pulseLabel").textContent =
		s.pulse > 0 ? `PULSE IN ${Math.ceil(s.pulse)}s` : "PULSE READY";
	$("pulsePips").style.opacity = s.pulse > 0 ? 0.25 : 1;
	if (s.combo >= 3 && noticeTimer <= 0 && s.phase !== "rescue")
		$("notice").textContent =
			`${s.combo} ROCK STREAK${s.combo >= 6 ? " · ×" + Math.min(4, 1 + Math.floor(s.combo / 6)) : ""}`;
	labels(s);
	$("touchPulse").hidden =
		inputMode !== "touch" || s.pulse > 0 || mode !== "playing";
}
function debugPhysics() {
	if (!showPhysics || !net.info.authority) {
		if (physicsLines) physicsLines.visible = false;
		return;
	}
	const { vertices, colors } = sim.world.debugRender();
	if (!physicsLines) {
		physicsLines = new THREE.LineSegments(
			new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
		);
		physicsLines.renderOrder = 100;
		scene.add(physicsLines);
	}
	physicsLines.visible = true;
	physicsLines.geometry.dispose();
	physicsLines.geometry = new THREE.BufferGeometry();
	physicsLines.geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(vertices, 3),
	);
	physicsLines.geometry.setAttribute(
		"color",
		new THREE.BufferAttribute(colors, 4),
	);
}
function titleState() {
	return {
		phase: "title",
		time: clock,
		planet: 0,
		ark: { x: 6, y: 3.3 },
		ship: { x: 8 + Math.sin(clock * 0.25) * 0.2, y: -2 },
		beam: true,
		cargo: 0,
		shield: 0,
		aim: { x: 0, y: 1 },
		meteors: [],
		bolts: [],
		hazards: [],
		creatures: [
			{ id: 100, x: 5, y: -7.3, progress: 0, captured: false },
			{ id: 101, x: 11, y: -7.3, progress: 0, captured: false },
		],
	};
}
function resize() {
	if (!renderer) return;
	renderer.setSize(innerWidth, innerHeight);
	const aspect = innerWidth / innerHeight;
	let h = 22,
		w = h * aspect;
	if (aspect < 1.25) {
		w = 35;
		h = w / aspect;
	}
	camera.left = -w / 2;
	camera.right = w / 2;
	camera.top = h / 2;
	camera.bottom = -h / 2;
	camera.updateProjectionMatrix();
}
function frame(now) {
	if (!frameTime) frameTime = now;
	const dt = Math.min(0.1, (now - frameTime) / 1000);
	frameTime = now;
	clock += dt;
	if (!ended) pollPads(dt);
	if (mode === "title" && !net.hub && performance.now() - lastInput >= 10000)
		start(true);
	let local = net.info.server || ended ? {} : input();
	if (!ended) {
		const progressing =
			(mode === "playing" || mode === "attract") && net.canPlay;
		if (net.info.authority && progressing) {
			accumulator += dt;
			const combined = combine(local);
			while (accumulator >= 1 / 60) {
				sim.step(1 / 60, combined);
				accumulator -= 1 / 60;
			}
		} else accumulator = 0;
		if (net.hub || net.info.role !== "solo")
			net.update(
				local,
				{
					...sim.snapshot(),
					active: playActive,
					won: sim.state.phase === "win",
				},
				dt,
			);
	}
	const s = currentState();
	if (playActive && s) {
		visuals.update(dt, s);
		hud(s);
		if (s.phase === "win" || s.phase === "lose") {
			if (mode === "attract") {
				if (s.phaseTime > 3) {
					start(true);
				}
			} else if (!net.hub) results(s);
		}
	} else visuals.update(dt, titleState());
	if (bannerTimer > 0) {
		bannerTimer -= dt;
		if (bannerTimer <= 0) $("phaseBanner").classList.remove("show");
	}
	if (noticeTimer > 0) {
		noticeTimer -= dt;
		if (noticeTimer <= 0) $("notice").textContent = "";
	}
	if (!ended) {
		audio.update(
			dt,
			playActive ? s.phase : "title",
			s?.warning ? 1 : Math.max(0, 1 - (s?.fuel ?? 100) / 45),
		);
		if (s?.beam && mode === "playing") audio.sfx("beam");
	}
	debugPhysics();
	renderer.render(scene, camera);
}

async function boot() {
	try {
		await net.initialize();
		$("loadStatus").textContent = "Waking the little beasties…";
		await RAPIER.init();
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x081b2c);
		scene.fog = new THREE.FogExp2(0x081b2c, 0.009);
		camera = new THREE.OrthographicCamera(-20, 20, 11, -11, 0.1, 150);
		camera.position.set(0, 1.7, 45);
		camera.lookAt(0, 0, 0);
		renderer = new THREE.WebGPURenderer({
			antialias: true,
			alpha: false,
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.08;
		$("stage").append(renderer.domElement);
		await renderer.init();
		visuals = new Visuals(THREE, scene);
		sim = new GameSimulation(RAPIER, { onEvent: event });
		resize();
		bind("start", () => start());
		bind("crewButton", crewMenu);
		bind("howButton", () => {
			returnMode = "title";
			manual();
		});
		bind("settingsButton", () => {
			returnMode = "title";
			settingsMenu();
		});
		bind("aboutButton", () => {
			returnMode = "title";
			about();
		});
		bind("pauseButton", pause);
		bind("touchPause", () => {
			if (mode === "title") {
				returnMode = "title";
				settingsMenu();
			} else pause();
		});
		$("touchPulse").querySelector("button").onclick = () => {
			if (net.info.authority) sim.pulse();
			else inputOverride = { ...input(), pulse: true };
		};
		window.__COSMIC = {
			sim,
			renderer,
			audio,
			net,
			renderAudioTest,
			start: () => start(),
			setInputOverride: (v) => (inputOverride = v),
			advance: (seconds) => {
				for (let i = 0; i < Math.ceil(seconds * 60); i++)
					sim.step(1 / 60, inputOverride || {});
			},
			get state() {
				return currentState();
			},
			get mode() {
				return mode;
			},
			get inputMode() {
				return inputMode;
			},
			get settings() {
				return settings;
			},
		};
		window.addEventListener("resize", resize);
		$("loading").hidden = true;
		document.body.dataset.ready = "true";
		if (navigator.maxTouchPoints && matchMedia("(pointer:coarse)").matches) {
			inputMode = "touch";
			document.body.classList.add("touch");
		}
		if (net.hub) {
			playActive = true;
			mode = "playing";
			$("hud").hidden = false;
			$("topBrand").hidden = true;
			$("pauseButton").hidden = true;
			$("touchMenu").hidden = true;
			sim.reset(false);
			net.ready();
		} else title();
		updatePrompts();
		renderer.setAnimationLoop(frame);
	} catch (error) {
		console.error(error);
		$("loadStatus").textContent =
			`The Ark could not launch: ${error.message}. Try a current Chrome, Edge or Safari with WebGPU / WebGL 2 enabled.`;
		if (net.hub) globalThis.AIHub.fail(error.message);
	}
}
boot();
