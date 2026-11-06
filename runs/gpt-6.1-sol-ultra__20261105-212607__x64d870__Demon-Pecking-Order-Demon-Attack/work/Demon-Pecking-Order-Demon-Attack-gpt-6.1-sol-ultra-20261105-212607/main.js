const $ = (s) => document.querySelector(s),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TITLE = "Demon Pecking Order";
const defaults = {
	speed: 14,
	fireRate: 5.5,
	enemySpeed: 1,
	enemyFire: 1,
	bulletSpeed: 7.8,
	pulseRecharge: 1,
	difficulty: 1,
};
const balance = { ...defaults };
const settings = {
	music: 0.1,
	sfx: 0.7,
	glyphs: "PlayStation",
	shake: true,
	tracer: true,
	assist: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("dpo-settings") || "{}"),
	);
} catch {}
settings.music = clamp(Number(settings.music) || 0, 0, 1);
settings.sfx = clamp(Number(settings.sfx) || 0, 0, 1);
const saveSettings = () => {
	try {
		localStorage.setItem("dpo-settings", JSON.stringify(settings));
	} catch {}
};
const audio = new SynthAudio();
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
let renderer,
	scene,
	camera,
	visuals,
	world,
	events,
	link,
	ready = false,
	accum = 0,
	last = 0,
	renderFrames = 0;
let screen = "loading",
	returnScreen = "title",
	lastDevice = "keyboard",
	idle = 0,
	menuIndex = 0,
	menuRepeat = 0,
	attract = false;
let time = 0,
	runTime = 0,
	score = 0,
	best = 0,
	wave = 0,
	reserves = 4,
	combo = 0,
	comboTime = 0,
	power = 1,
	waveHits = 0,
	kills = 0,
	totalShots = 0,
	shotsHit = 0;
let spawnLeft = 0,
	spawnTimer = 0,
	clearTimer = -1,
	introTimer = 0,
	bannerTimer = 0,
	toastTimer = 0,
	shake = 0,
	flash = 0,
	uid = 0,
	coop = false,
	endless = false,
	won = false;
let physicsPools = new Map();
let entities = [],
	players = [],
	handles = new Map(),
	remoteInputs = new Map(),
	snapshotTime = 0,
	networkState = null,
	pendingPulse = false,
	pendingDash = false;
let keys = new Set(),
	mouse = { active: false, x: 0, down: false },
	touch = { active: false, id: null, startX: 0, startPlayer: 0, x: 0 },
	gamepads = [],
	padPrevious = new Map(),
	padMenuPrevious = false;
let god = false,
	autoplay = false,
	slow = false,
	muted = false,
	devUsed = false,
	onlineStarting = false,
	terminalReported = false;
const stats = {
	collisions: 0,
	enemyKills: 0,
	splits: 0,
	dives: 0,
	phantoms: 0,
	enemyShots: 0,
	dashes: 0,
	pulses: 0,
	damage: 0,
	wavesCleared: 0,
	spawnedTypes: new Set(),
	bossHits: 0,
};
const waves = [
	{
		name: "FIRST CONTACT",
		sub: "They have wings. You have unlimited ammunition.",
		count: 8,
		types: ["grunt"],
		fire: 0.9,
	},
	{
		name: "SPLIT DECISION",
		sub: "Break a pair. The survivor dives. Keep moving!",
		count: 8,
		types: ["splitter", "grunt", "splitter"],
		fire: 1,
	},
	{
		name: "GHOST SHIFT",
		sub: "Phantoms blink. Their shadows give them away.",
		count: 9,
		types: ["phantom", "splitter", "grunt"],
		fire: 1.1,
	},
	{
		name: "BAD MIGRATION",
		sub: "Guided fire is coming. Dash through the gaps.",
		count: 10,
		types: ["splitter", "phantom", "grunt"],
		fire: 1.3,
	},
	{
		name: "FOWL WEATHER",
		sub: "The whole flock. Save your pulse for the storm.",
		count: 12,
		types: ["splitter", "phantom", "splitter"],
		fire: 1.5,
	},
	{
		name: "THE BIG PECK",
		sub: "Shoot the open eye. Dash the fan. End the invasion.",
		count: 1,
		types: ["boss"],
		fire: 1.5,
	},
];
const activeRun = () => screen === "playing";
const authoritative = () => !link?.connected || link.isHost;
const online = () => !!link?.connected;
const safe = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
try {
	best = Number(localStorage.getItem("dpo-best") || 0);
} catch {}
function setDevice(d) {
	if (lastDevice !== d) {
		lastDevice = d;
		updatePrompts();
	}
}
function glyph(action) {
	if (lastDevice === "pad") {
		const ps = settings.glyphs === "PlayStation";
		return {
			fire: ps ? "×" : "A",
			dash: ps ? "○" : "B",
			pulse: ps ? "□" : "X",
			menu: ps ? "OPTIONS" : "MENU",
			accept: ps ? "×" : "A",
			back: ps ? "○" : "B",
			move: "L",
		}[action];
	}
	if (lastDevice === "touch")
		return {
			fire: "AUTO",
			dash: "DOUBLE TAP",
			pulse: "TAP",
			menu: "Ⅱ",
			accept: "TAP",
			back: "BACK",
			move: "DRAG",
		}[action];
	return {
		fire: "SPACE / CLICK",
		dash: "SHIFT",
		pulse: "Q",
		menu: "ESC",
		accept: "ENTER",
		back: "ESC",
		move: "A D / ← →",
	}[action];
}
function updatePrompts() {
	if (!$("#prompts")) return;
	$("#prompts").innerHTML =
		`<span><b class="glyph">${glyph("move")}</b> Move</span><span><b class="glyph">${glyph("fire")}</b> Fire</span><span><b class="glyph">${glyph("dash")}</b> Dash</span><span><b class="glyph">${glyph("menu")}</b> Pause</span>`;
	$("#power-key").textContent = glyph("pulse");
	const titleGlyph = $('[data-action="start"] .glyph');
	if (titleGlyph) titleGlyph.textContent = glyph("accept");
}
function announce(big, sub = "", duration = 3) {
	$("#banner .big").textContent = big;
	$("#banner .sub").textContent = sub;
	$("#banner").classList.add("show");
	bannerTimer = duration;
}
function toast(text, duration = 3) {
	$("#toast").textContent = text;
	$("#toast").classList.add("show");
	toastTimer = duration;
}
function setScreen(name) {
	screen = name;
	menuIndex = 0;
	$("#hud").style.display = ["playing", "pause", "dev"].includes(name)
		? "block"
		: "none";
	$("#touch-pulse").style.display =
		lastDevice === "touch" && name === "playing" && power >= 0.99
			? "block"
			: "none";
	if (name !== "playing") {
		$("#touch-ring").style.display = "none";
		mouse.down = false;
		keys.clear();
		touch.active = false;
	}
	audio.setPaused(name !== "playing" && name !== "result");
	if (name === "playing") {
		$("#screen").innerHTML = "";
		audio.setPaused(false);
	}
	menuFocus();
}
function button(label, id, cls = "secondary", extra = "") {
	return `<button class="${cls}" data-action="${id}" ${extra}>${label}</button>`;
}
function wire() {
	document.querySelectorAll("[data-action]").forEach((b) => {
		b.addEventListener("click", () => act(b.dataset.action));
		b.addEventListener("pointerenter", () => {
			let list = menuItems();
			menuIndex = list.indexOf(b);
			menuFocus();
		});
	});
	menuFocus();
}
function menuItems() {
	return [
		...($("#dpo-online-panel") || $("#screen")).querySelectorAll(
			"button:not([disabled]),input,textarea,a",
		),
	].filter((b) => b.offsetParent !== null);
}
function menuFocus() {
	const b = menuItems();
	b.forEach((e, i) => e.classList.toggle("focus", i === menuIndex));
}
function menuMove(dir) {
	const b = menuItems();
	if (!b.length) return;
	menuIndex = (menuIndex + dir + b.length) % b.length;
	menuFocus();
	b[menuIndex].focus({ preventScroll: true });
	b[menuIndex].scrollIntoView({ block: "nearest" });
	audio.sfx("menu");
}
function menuAccept() {
	const b = menuItems()[menuIndex];
	if (b?.tagName === "BUTTON") b.click();
}
function menuAdjust(dir) {
	let b = menuItems()[menuIndex];
	if (b?.type === "range") {
		b.value = clamp(
			Number(b.value) + Number(b.step || 1) * dir,
			Number(b.min),
			Number(b.max),
		);
		b.dispatchEvent(new Event("input"));
	} else menuMove(dir);
}
function renderTitle(reset = true) {
	if (reset) {
		setScreen("title");
		idle = 0;
		attract = false;
		$("#demo-label").style.display = "none";
		$("#banner").classList.remove("show");
		titleDecor();
	}
	$("#screen").innerHTML =
		`<div class="title-layout"><div class="mast"><div class="mark"><span>✦</span></div><span class="eyebrow">Moon patrol / Night shift</span><span class="edition">VOL. 01 &nbsp; / &nbsp; AN INK-SPACE ARCADE</span></div><div class="hero"><div class="eyebrow">They came. They saw. They pecked.</div><h1><span class="warm">DEMON</span><span>PECKING</span><span class="small">ORDER</span></h1><p>Little cannon. Very big birds.<br>Hold the moon. Send the flock packing.</p><div class="main-actions">${button(`<span class="glyph">${glyph("accept")}</span>&nbsp; Start patrol`, "start", "primary")}${button("Two pilots", "coop")}${button("Online co-op ↗", "online")}</div><div class="title-links">${button("How to play", "help", "textbtn")}${button("Settings", "settings", "textbtn")}${button("About / credits", "about", "textbtn")}</div></div><div class="stamp">Full moon.<br>Zero peace.</div><div class="title-bottom"><div class="statline"><div><strong>06</strong><small>Waves + one big bird</small></div><div><strong>1—2</strong><small>Pilots · local / online</small></div><div><strong>${String(best).padStart(6, "0")}</strong><small>Personal best</small></div></div><div class="signal"><b>●</b> MOON SIGNAL: STRONG<br><br><span id="idle-caption">Autopilot demonstration in 10s</span></div></div></div>`;
	wire();
}
function modal(kicker, title, body, buttons = "", cls = "") {
	return `<div class="modal-wrap"><section class="panel ${cls}" aria-label="${title}"><div class="eyebrow">${kicker}</div><h2>${title}</h2>${body}<div class="buttons">${buttons}</div></section></div>`;
}
function renderPause() {
	setScreen("pause");
	$("#screen").innerHTML = modal(
		"The moon can wait",
		"Patrol paused",
		`<div class="menu-stack">${button("Resume patrol <span>↵</span>", "resume", "primary")}${button("Settings", "settings")}${button("How to play", "help")}${button("Developer tools", "dev")}${link?.hubActive ? "" : button("Return to title", "quit")}</div>`,
	);
	wire();
}
function renderHelp() {
	const old = screen;
	if (!["help", "settings", "about"].includes(old)) returnScreen = old;
	setScreen("help");
	$("#screen").innerHTML = modal(
		"Field manual",
		"Make every feather count",
		`<div class="control-grid"><div class="control-card"><strong>Move & fire</strong><p>${safe(glyph("move"))} to move. Hold ${safe(glyph("fire"))} to fire. Mouse follows your cannon; click to fire. Tracer shots bend as you move.</p></div><div class="control-card"><strong>Dash & pulse</strong><p>${safe(glyph("dash"))} dashes with brief protection. ${safe(glyph("pulse"))} blasts the flock and clears bullets. Kills recharge it faster.</p></div><div class="control-card"><strong>Read the flock</strong><p>Orange birds hover. Violet birds split; the surviving half dives. Mint phantoms fade, but can still be shot.</p></div><div class="control-card"><strong>Keep your bunkers</strong><p>Four reserves, one shared patrol. Clear a wave without a hit to earn another. Your last bunker keeps you alive. Six waves to victory.</p></div></div><p>Local co-op: Pilot 1 uses A/D, Space, Shift, Q. Pilot 2 uses ←/→, Enter, Right Shift, /. Any two standard gamepads also work. Touch: drag anywhere to move; auto-fire is on. Double-tap to dash and tap the ready Pulse button.</p>`,
		button("Back", "back", "primary"),
	);
	wire();
}
function renderSettings() {
	const old = screen;
	if (!["settings", "help", "about"].includes(old)) returnScreen = old;
	setScreen("settings");
	$("#screen").innerHTML = modal(
		"Set your orbit",
		"Settings",
		`<label class="row"><span>Music <small>Procedural lunar radio</small></span><input aria-label="Music volume" data-setting="music" type="range" min="0" max="1" step=".01" value="${settings.music}"><output>${Math.round(settings.music * 100)}%</output></label><label class="row"><span>Sound effects & voices</span><input aria-label="Sound effects volume" data-setting="sfx" type="range" min="0" max="1" step=".01" value="${settings.sfx}"><output>${Math.round(settings.sfx * 100)}%</output></label><div class="row"><span>Controller glyphs</span>${button(settings.glyphs, "glyphs")}</div><div class="row"><span>Screen shake</span>${button(settings.shake ? "On" : "Off", "shake")}</div><div class="row"><span>Tracer shots <small>Bend your shots by moving</small></span>${button(settings.tracer ? "On" : "Off", "tracer")}</div><div class="row"><span>Auto-fire <small>Always enabled with touch controls</small></span>${button(settings.assist ? "On" : "Off", "assist")}</div><p style="font-size:14px">Progress and preferences save on this device. <span id="backend">${renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL compatibility"} · Three.js r180 · Rapier 0.19.3</span></p>`,
		button("Back", "back", "primary") + button("Fullscreen", "fullscreen"),
	);
	wire();
	document.querySelectorAll("[data-setting]").forEach(
		(e) =>
			(e.oninput = () => {
				settings[e.dataset.setting] = Number(e.value);
				e.nextElementSibling.textContent = Math.round(e.value * 100) + "%";
				audio.setMusic(settings.music);
				audio.setSfx(settings.sfx);
				saveSettings();
			}),
	);
}
const devLabels = {
	speed: ["Cannon speed", 5, 25, 0.5],
	fireRate: ["Shots per second", 2, 14, 0.5],
	enemySpeed: ["Enemy flight speed", 0.25, 2.5, 0.05],
	enemyFire: ["Enemy fire rate", 0.2, 2.5, 0.05],
	bulletSpeed: ["Enemy bullet speed", 3, 15, 0.25],
	pulseRecharge: ["Pulse recharge", 0.2, 4, 0.1],
	difficulty: ["Damage pressure", 0.5, 2, 0.1],
};
function renderDev() {
	devUsed = true;
	setScreen("dev");
	$("#screen").innerHTML = modal(
		"Flight laboratory",
		"Developer tools",
		`<p class="dev-note">Live values apply immediately. This patrol will not set a personal best.</p><div class="row"><span>Invulnerability</span>${button(god ? "On" : "Off", "god")}</div><div class="row"><span>Autopilot</span>${button(autoplay ? "On" : "Off", "autoplay")}</div><div class="row"><span>Half-speed simulation</span>${button(slow ? "On" : "Off", "slow")}</div>${Object.entries(
			devLabels,
		)
			.map(
				([k, [label, min, max, step]]) =>
					`<label class="row"><span>${label}</span><input type="range" aria-label="${label}" data-balance="${k}" min="${min}" max="${max}" step="${step}" value="${balance[k]}"><output>${balance[k].toFixed(2)}</output></label>`,
			)
			.join(
				"",
			)}<div class="buttons">${button("Next wave", "nextwave")}${button("Refill bunkers + pulse", "refill")}${button("Clear projectiles", "clearshots")}${link?.hubActive ? "" : button("Restart patrol", "restart")}${button("Reset defaults", "resetdev")}</div>`,
		button("Resume patrol", "resume", "primary") +
			button("Back to pause", "pause"),
	);
	wire();
	document.querySelectorAll("[data-balance]").forEach(
		(e) =>
			(e.oninput = () => {
				balance[e.dataset.balance] = Number(e.value);
				e.nextElementSibling.textContent = Number(e.value).toFixed(2);
			}),
	);
}
function renderAbout() {
	const old = screen;
	if (!["settings", "help", "about"].includes(old)) returnScreen = old;
	setScreen("about");
	const d = window.GAME_INFO;
	$("#screen").innerHTML = modal(
		"A small cannon with a long memory",
		"About / credits",
		`<p>An original lunar arcade game inspired by Imagic’s <em>Demon Attack</em> (1982), by Rob Fulop. Built for one screen, a good controller, and a sky full of trouble.</p><h3>Source Information</h3><dl>${Object.entries(
			d.sourceInformation,
		)
			.map(([k, v]) => `<dt>${safe(k)}</dt><dd>${safe(v)}</dd>`)
			.join(
				"",
			)}</dl><h3>Research</h3><p><a target="_blank" rel="noreferrer" href="https://atariage.com/manual_html_page.php?SoftwareLabelID=135">Original game manual</a> · <a target="_blank" rel="noreferrer" href="https://www.atariage.com/software_page.php?SoftwareLabelID=135">AtariAge game profile / sound notes</a> · <a target="_blank" rel="noreferrer" href="https://www.mobygames.com/game/9448/demon-attack/">Mechanics and ports</a> · <a target="_blank" rel="noreferrer" href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub">AI Hub protocol</a>. Three-at-a-time hovering foes, split-and-dive behavior, steerable shots, escalating fire and perfect-wave bunkers informed this game. The Big Peck is an original boss, inspired by the flagship encounters in later ports.</p><h3>Testing Feedback</h3><ul>${d.testingFeedback.map((v) => `<li>${safe(v)}</li>`).join("")}</ul><h3>Engine Feedback</h3><ul>${d.engineFeedback.map((v) => `<li>${safe(v)}</li>`).join("")}</ul><h3>Prompt Feedback</h3><ul>${d.promptFeedback.map((v) => `<li>${safe(v)}</li>`).join("")}</ul><h3>Built with</h3><p>Three.js r180 (MIT), Rapier 0.19.3 (Apache-2.0), AI Hub session client 1.4.0. Optional PeerJS signaling for standalone internet rooms. Fonts: Barlow Condensed and DM Sans (Google Fonts, SIL OFL; system fallbacks included). All geometry, animation, music, effects and gibberish voices are generated in code. No source artwork, recordings or ROM data are included.</p>`,
		button("Back", "back", "primary"),
		"about",
	);
	wire();
}
function renderResult() {
	setScreen("result");
	$("#hud").style.display = "none";
	$("#bossbar").style.display = "none";
	$("#banner").classList.remove("show");
	$("#demo-label").style.display = "none";
	$("#screen").innerHTML = modal(
		won ? "Moon secure. Flock dismissed." : "Cannon down. Courage intact.",
		won ? "Order restored" : "Pecked to pieces",
		`<div class="hud-label">${devUsed ? "Laboratory score" : online() ? "Shared patrol score" : "Patrol score"}</div><div class="result-score">${String(score).padStart(6, "0")}</div><div class="result-stats"><span><strong>${kills}</strong> birds</span><span><strong>${Math.floor(runTime / 60)}:${String(Math.floor(runTime % 60)).padStart(2, "0")}</strong> patrol</span><span><strong>${totalShots ? Math.round((shotsHit / totalShots) * 100) : 0}%</strong> accuracy</span></div><p>${won ? "The moon is quiet. Enjoy it while it lasts." : "Those wings will be back. So will you."}</p>`,
		link?.hubActive
			? "<p>Results sent to AI Hub.</p>"
			: (online() && !link.isHost
					? "<p>Your host can launch the next shared patrol.</p>"
					: button("Fly again", "restart", "primary") +
						(won ? button("Overtime ∞", "endless") : "")) +
					button("Title screen", "quit"),
	);
	wire();
}
function act(id) {
	if (
		online() &&
		!link.isHost &&
		[
			"restart",
			"endless",
			"nextwave",
			"refill",
			"clearshots",
			"resetdev",
		].includes(id)
	)
		return;
	const previousScreen = screen,
		previousIndex = menuIndex;
	audio.unlock();
	audio.sfx("menu");
	idle = 0;
	switch (id) {
		case "start":
			startRun(false);
			break;
		case "coop":
			startRun(true);
			toast("Pilot 2: arrows + Enter, or connect a second gamepad.", 5);
			break;
		case "online":
			link.openPanel();
			break;
		case "resume":
			setScreen("playing");
			break;
		case "pause":
			renderPause();
			break;
		case "settings":
			renderSettings();
			break;
		case "help":
			renderHelp();
			break;
		case "about":
			renderAbout();
			break;
		case "dev":
			if (online() && !link.isHost) {
				toast("Only the host can change the simulation.");
				return;
			}
			renderDev();
			break;
		case "back":
			returnScreen === "pause" || returnScreen === "dev"
				? renderPause()
				: renderTitle();
			break;
		case "quit":
			link?.close();
			resetWorld();
			renderTitle();
			break;
		case "restart":
			if (link?.hubActive) return;
			startRun(coop);
			break;
		case "endless":
			endless = true;
			startRun(coop, true);
			break;
		case "glyphs":
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			renderSettings();
			break;
		case "shake":
			settings.shake = !settings.shake;
			renderSettings();
			break;
		case "tracer":
			settings.tracer = !settings.tracer;
			renderSettings();
			break;
		case "assist":
			settings.assist = !settings.assist;
			renderSettings();
			break;
		case "fullscreen":
			document.fullscreenElement
				? document.exitFullscreen()
				: document.documentElement
						.requestFullscreen()
						.catch(() => toast("Fullscreen is unavailable in this browser."));
			break;
		case "god":
			god = !god;
			renderDev();
			break;
		case "autoplay":
			autoplay = !autoplay;
			renderDev();
			break;
		case "slow":
			slow = !slow;
			renderDev();
			break;
		case "nextwave":
			clearCombat();
			beginWave(wave + 1);
			setScreen("playing");
			break;
		case "refill":
			reserves = 6;
			power = 1;
			toast("Bunkers and pulse restored.");
			break;
		case "clearshots":
			entities.filter((e) => e.kind === "shot").forEach(removeEntity);
			toast("Sky clear.");
			break;
		case "resetdev":
			Object.assign(balance, defaults);
			god = autoplay = slow = false;
			renderDev();
			break;
	}
	saveSettings();
	updatePrompts();
	if (screen === previousScreen) {
		menuIndex = previousIndex;
		menuFocus();
	}
}

function resetWorld() {
	for (const e of entities) {
		scene?.remove(e.mesh);
		visuals?.remove?.(e.mesh);
	}
	entities = [];
	players = [];
	handles.clear();
	remoteInputs.clear();
	if (world) world.free();
	world = new RAPIER.World({ x: 0, y: 0, z: 0 });
	world.timestep = 1 / 60;
	events?.free();
	events = new RAPIER.EventQueue(true);
	physicsPools = new Map();
	initPhysicsPools();
	accum = 0;
	visuals?.resetEffects();
}
function clearCombat() {
	entities.filter((e) => e.kind !== "player").forEach(removeEntity);
	spawnLeft = 0;
	clearTimer = -1;
}
// Rapier 0.19.3 has an upstream broadphase failure with rapid collider churn
// (dimforge/rapier.js#363). Keep stable bodies for a whole patrol; retire by
// parking and filtering them, then reuse their handles without deletion.
function poolKey(hx, hy, dynamic) {
	return `${hx}:${hy}:${dynamic}`;
}
function newPhysicsSlot(hx, hy, dynamic) {
	const desc = (
		dynamic
			? RAPIER.RigidBodyDesc.dynamic()
			: RAPIER.RigidBodyDesc.kinematicPositionBased()
	)
		.setTranslation(0, -1000, 0)
		.lockRotations()
		.setCanSleep(false);
	const body = world.createRigidBody(desc);
	if (dynamic) {
		body.setEnabledTranslations(true, true, false, true);
	}
	const collider = world.createCollider(
		RAPIER.ColliderDesc.cuboid(hx, hy, 0.6)
			.setSensor(true)
			.setCollisionGroups(0)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
		body,
	);
	return {
		body,
		collider,
		available: true,
		dynamic,
		key: poolKey(hx, hy, dynamic),
	};
}
function initPhysicsPools() {
	for (const [hx, hy, dynamic, count] of [
		[0.48, 0.55, false, 2],
		[0.86, 0.56, false, 32],
		[0.43, 0.37, false, 32],
		[2.7, 1.5, false, 4],
		[0.12, 0.42, true, 96],
		[0.18, 0.27, true, 256],
	]) {
		const list = [];
		for (let i = 0; i < count; i++) list.push(newPhysicsSlot(hx, hy, dynamic));
		physicsPools.set(poolKey(hx, hy, dynamic), list);
	}
	world.step(events);
	events.clear();
}
function bodyEntity(
	kind,
	type,
	x,
	y,
	mesh,
	hx,
	hy,
	member,
	filter,
	dynamic = false,
) {
	const key = poolKey(hx, hy, dynamic);
	let pool = physicsPools.get(key);
	if (!pool) {
		pool = [];
		physicsPools.set(key, pool);
	}
	let slot = pool.find((s) => s.available);
	if (!slot) {
		slot = newPhysicsSlot(hx, hy, dynamic);
		pool.push(slot);
	}
	slot.available = false;
	const { body: b, collider: c } = slot;
	b.setTranslation({ x, y, z: 0 }, true);
	if (dynamic) b.setLinvel({ x: 0, y: 0, z: 0 }, true);
	else b.setNextKinematicTranslation({ x, y, z: 0 });
	c.setCollisionGroups((member << 16) | filter);
	const e = {
		id: ++uid,
		kind,
		type,
		x,
		y,
		mesh,
		body: b,
		collider: c,
		slot,
		dead: false,
		age: 0,
	};
	mesh.position.set(x, y, 0);
	scene.add(mesh);
	entities.push(e);
	handles.set(c.handle, e);
	return e;
}
function removeEntity(e) {
	if (!e || e.dead) return;
	e.dead = true;
	handles.delete(e.collider?.handle);
	if (e.slot) {
		e.collider.setCollisionGroups(0);
		e.body.setTranslation({ x: 0, y: -1000, z: 0 }, true);
		if (e.slot.dynamic) e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		else e.body.setNextKinematicTranslation({ x: 0, y: -1000, z: 0 });
		e.slot.available = true;
	}
	scene.remove(e.mesh);
	visuals.remove?.(e.mesh);
}
function createPlayer(id, index) {
	let x = index === 0 ? (coop ? -3 : 0) : 3;
	let e = bodyEntity(
		"player",
		"cannon",
		x,
		1.6,
		visuals.createShip(index),
		0.48,
		0.55,
		8,
		6,
	);
	Object.assign(e, {
		playerId: id,
		index,
		cooldown: 0,
		invul: 2,
		dash: 0,
		dashCooldown: 0,
		dir: 1,
		axis: 0,
		shotCount: 0,
		previousPulse: false,
		previousDash: false,
	});
	players.push(e);
	return e;
}
function startRun(two = false, overtime = false, netInfo = null) {
	if (!ready) return;
	const wasAttract = attract;
	resetWorld();
	coop = two;
	attract = false;
	endless = overtime;
	score = 0;
	wave = 0;
	reserves = 4;
	combo = 0;
	comboTime = 0;
	power = 1;
	kills = 0;
	runTime = 0;
	waveHits = 0;
	totalShots = shotsHit = 0;
	terminalReported = false;
	won = false;
	devUsed = false;
	uid = 0;
	for (let k of Object.keys(stats)) if (k !== "spawnedTypes") stats[k] = 0;
	stats.spawnedTypes.clear();
	if (!wasAttract) {
		god = false;
		autoplay = false;
		slow = false;
		Object.assign(balance, defaults);
	}
	if (online() && !link.hubActive) {
		link.finished = false;
		link.ended = false;
	}
	const roster =
		netInfo?.players ||
		(online() ? link.players : [{ id: 0 }, { id: 1 }].slice(0, two ? 2 : 1));
	roster.forEach((p, i) => createPlayer(p.id, i));
	setScreen("playing");
	$("#demo-label").style.display = "none";
	beginWave(1);
	audio.unlock();
	audio.setIntensity(1);
}
function beginWave(n) {
	if (n > 6 && !endless) {
		finishRun(true);
		return;
	}
	wave = n;
	clearTimer = -1;
	spawnTimer = 1.3;
	introTimer = 2.8;
	waveHits = 0;
	const w = waves[(n - 1) % 6];
	spawnLeft = w.count;
	audio.setIntensity(Math.min(n, 6));
	audio.sfx(w.types[0] === "boss" ? "boss" : "wave");
	announce(`${String(n).padStart(2, "0")} / ${w.name}`, w.sub, 3.3);
	players.forEach((p) => (p.invul = Math.max(p.invul, 2)));
	updateHUD();
}
function spawnEnemy(type, x = null, y = null, opts = {}) {
	const boss = type === "boss",
		shard = type === "shard";
	const lane = opts.lane ?? (uid + 1) % 3;
	const ex = x ?? Math.random() * 22 - 11,
		ey = y ?? (boss ? 15.2 : 10.5 + lane * 2.8);
	const mesh = boss
		? visuals.createBoss()
		: visuals.createEnemy(type, wave % 3);
	const e = bodyEntity(
		"enemy",
		type,
		ex,
		ey,
		mesh,
		boss ? 2.7 : shard ? 0.43 : 0.86,
		boss ? 1.5 : shard ? 0.37 : 0.56,
		2,
		9,
	);
	Object.assign(e, {
		baseX: ex,
		baseY: ey,
		phase: Math.random() * 6.28,
		fire: 1.5 + Math.random() * 2,
		lane,
		hp: boss ? 48 : 1,
		maxHp: boss ? 48 : 1,
		diving: false,
		pair: opts.pair || null,
		flash: 0,
		open: true,
		diveDelay: 0,
		appear: 0,
	});
	stats.spawnedTypes.add(type);
	if (type === "phantom") stats.phantoms++;
	if (boss) {
		e.baseX = 0;
		e.x = 0;
		e.y = 15.2;
		e.body.setTranslation({ x: 0, y: 15.2, z: 0 }, true);
		toast("The eye opens after each volley. Fire into the glow.", 5);
	}
	return e;
}
function shoot(p) {
	if (p.cooldown > 0) return;
	p.cooldown = 1 / balance.fireRate;
	const e = bodyEntity(
		"shot",
		"friendly",
		p.x,
		p.y + 1.1,
		visuals.createShot(false),
		0.12,
		0.42,
		1,
		2,
		true,
	);
	Object.assign(e, {
		owner: p.playerId,
		vx: settings.tracer ? p.axis * 3 : 0,
		vy: 31,
		life: 1.5,
	});
	e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
	totalShots++;
	p.shotCount++;
	p.mesh.scale.y = 1.09;
	audio.sfx("shoot", 1 + p.index * 0.15);
}
function enemyShot(e, angle = 0, guided = false) {
	const target = players[Math.floor(Math.random() * players.length)] || {
		x: 0,
		y: 1.6,
	};
	let dx = guided
		? clamp((target.x - e.x) * 0.28, -3, 3)
		: Math.sin(angle) * balance.bulletSpeed;
	let dy = -Math.cos(angle) * balance.bulletSpeed;
	const s = bodyEntity(
		"shot",
		"hostile",
		e.x,
		e.y - 1,
		visuals.createShot(true),
		0.18,
		0.27,
		4,
		8,
		true,
	);
	Object.assign(s, {
		vx: dx,
		vy: dy,
		life: 5,
		guided,
		owner: e.id,
		target: target.playerId,
	});
	s.body.setLinvel({ x: dx, y: dy, z: 0 }, true);
	stats.enemyShots++;
}
function damageEnemy(e, damage = 1) {
	if (e.dead) return;
	if (e.type === "boss" && !e.open) {
		visuals.burst(e.x, e.y - 1, 0x8ce6e0, 3);
		audio.sfx("hit", 0.6);
		return;
	}
	e.hp -= damage;
	e.flash = 0.1;
	shotsHit++;
	if (e.type === "boss") {
		stats.bossHits++;
		audio.sfx("hit", 0.7);
		visuals.burst(e.x + (Math.random() - 0.5) * 2, e.y - 1, 0xffcc86, 5);
		shake = Math.max(shake, 0.08);
	}
	if (e.hp > 0) return;
	killEnemy(e);
}
function killEnemy(e) {
	if (e.dead) return;
	const type = e.type,
		x = e.x,
		y = e.y;
	const paired = e.pair;
	removeEntity(e);
	const color =
		type === "splitter" ? 0xc795ef : type === "phantom" ? 0x8ce6e0 : 0xffae6d;
	visuals.burst(x, y, color, type === "boss" ? 80 : 18);
	audio.sfx(
		type === "splitter" ? "split" : "explode",
		type === "shard" ? 1.4 : 1,
	);
	shake = Math.max(shake, type === "boss" ? 0.5 : 0.09);
	if (type === "splitter") {
		const pair = uid + 100000;
		spawnEnemy("shard", x - 0.55, y, { pair });
		spawnEnemy("shard", x + 0.55, y, { pair });
		stats.splits++;
		return;
	}
	if (type === "shard" && paired) {
		const sibling = entities.find(
			(s) => !s.dead && s.pair === paired && s.id !== e.id,
		);
		if (sibling) {
			sibling.diving = true;
			sibling.diveDelay = 0.5;
			sibling.targetX = players.reduce(
				(p, c) =>
					Math.abs(c.x - sibling.x) < Math.abs(p.x - sibling.x) ? c : p,
				players[0],
			).x;
			audio.sfx("dive");
			stats.dives++;
		}
	}
	combo = Math.min(combo + 1, 20);
	comboTime = 3.3;
	const mult = 1 + Math.floor(combo / 5);
	score += Math.round(
		(type === "boss"
			? 3000
			: type === "shard"
				? 160
				: type === "phantom"
					? 180
					: 100) * mult,
	);
	kills++;
	stats.enemyKills++;
	power = clamp(power + 0.065, 0, 1);
	link?.updateScore(score);
}
function hurtPlayer(p) {
	if (p.dead || p.invul > 0 || p.dash > 0 || god || attract) return;
	p.invul = 2.2;
	reserves--;
	waveHits++;
	stats.damage++;
	combo = 0;
	shake = 0.45;
	flash = 0.3;
	audio.sfx("hurt");
	visuals.burst(p.x, p.y, 0xff9a62, 28);
	if (reserves <= 0) finishRun(false);
	else
		toast(
			`${reserves} bunker${reserves === 1 ? "" : "s"} left. Keep the cannon moving.`,
			2,
		);
}
function dashPlayer(p) {
	if (p.dashCooldown > 0) return;
	p.dash = 0.23;
	p.dashCooldown = 2.6;
	p.invul = Math.max(p.invul, 0.38);
	stats.dashes++;
	audio.sfx("shield");
	visuals.burst(p.x, p.y, 0x8ce6e0, 13);
}
function pulse() {
	if (power < 0.99) {
		toast(`Pulse charging · ${Math.floor(power * 100)}%`, 1);
		return;
	}
	power = 0;
	stats.pulses++;
	audio.sfx("shield");
	shake = 0.24;
	flash = 0.12;
	players.forEach((p) => visuals.burst(p.x, p.y + 1, 0x8ce6e0, 45));
	entities
		.filter((e) => e.kind === "shot" && e.type === "hostile")
		.forEach((e) => {
			visuals.burst(e.x, e.y, 0x8ce6e0, 3);
			removeEntity(e);
		});
	[...entities]
		.filter((e) => e.kind === "enemy")
		.forEach((e) => damageEnemy(e, e.type === "boss" ? 6 : 1));
	toast("SCATTER PULSE · Sky clear", 1.4);
}
function finishRun(victory) {
	if (screen === "result" || terminalReported) return;
	won = victory;
	terminalReported = true;
	if (!attract && !devUsed && score > best) {
		best = score;
		try {
			localStorage.setItem("dpo-best", best);
		} catch {}
	}
	if (attract) {
		clearCombat();
		wave = 0;
		score = 0;
		runTime = 0;
		terminalReported = false;
		beginWave(1);
		return;
	}
	audio.sfx(victory ? "win" : "hurt");
	renderResult();
	link?.finish(score, victory, captureState());
}

function localInput(index = 0) {
	const primary = index === 0;
	let axis = 0,
		fire = false,
		dash = false,
		pulseInput = false;
	const pad = gamepads[index];
	if (pad) {
		axis = Math.abs(pad.axes?.[0] || 0) > 0.15 ? pad.axes[0] : 0;
		axis +=
			(pad.buttons?.[15]?.pressed ? 1 : 0) -
			(pad.buttons?.[14]?.pressed ? 1 : 0);
		fire = !!(pad.buttons?.[0]?.pressed || pad.buttons?.[7]?.pressed);
		dash = !!(pad.buttons?.[1]?.pressed || pad.buttons?.[5]?.pressed);
		pulseInput = !!(pad.buttons?.[2]?.pressed || pad.buttons?.[4]?.pressed);
	}
	if (primary) {
		axis += (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
		if (!coop)
			axis +=
				(keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
		fire ||=
			keys.has("Space") ||
			mouse.down ||
			settings.assist ||
			lastDevice === "touch";
		dash ||=
			keys.has("ShiftLeft") || (!coop && keys.has("ShiftRight")) || pendingDash;
		pulseInput ||= keys.has("KeyQ") || pendingPulse;
	} else {
		axis += (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
		fire ||= keys.has("Enter");
		dash ||= keys.has("ShiftRight");
		pulseInput ||= keys.has("Slash");
	}
	let target = null;
	if (primary && mouse.active && lastDevice === "mouse") target = mouse.x;
	if (primary && touch.active) target = touch.x;
	return { axis: clamp(axis, -1, 1), fire, dash, pulse: pulseInput, target };
}
function aiInput(p) {
	const targets = entities.filter((e) => e.kind === "enemy" && !e.dead);
	targets.sort((a, b) => a.y - b.y);
	const target =
		targets.find((e) => e.type !== "phantom" || e.open) || targets[0];
	let tx = target ? target.x : Math.sin(time) * 8;
	if (target?.type === "boss") tx = target.x;
	const threat = entities
		.filter(
			(e) =>
				e.type === "hostile" && !e.dead && e.y < 6 && Math.abs(e.x - p.x) < 1.6,
		)
		.sort((a, b) => a.y - b.y)[0];
	if (threat) tx = p.x + (p.x > threat.x ? 4 : -4);
	return {
		axis: clamp((tx - p.x) * 2, -1, 1),
		fire: true,
		dash: !!threat,
		pulse:
			power >= 1 && entities.filter((e) => e.type === "hostile").length > 10,
		target: null,
	};
}
function updatePlayer(p, dt) {
	p.cooldown = Math.max(0, p.cooldown - dt);
	p.invul = Math.max(0, p.invul - dt);
	p.dashCooldown = Math.max(0, p.dashCooldown - dt);
	p.dash = Math.max(0, p.dash - dt);
	let input;
	if (attract || autoplay) input = aiInput(p);
	else if (online()) {
		input =
			p.playerId === link.localId
				? localInput(0)
				: remoteInputs.get(p.playerId) || { axis: 0 };
	} else input = localInput(p.index);
	let axis = Number(input.axis) || 0;
	if (input.target != null) axis = clamp((input.target - p.x) * 6, -1, 1);
	p.axis = axis;
	if (Math.abs(axis) > 0.1) p.dir = Math.sign(axis);
	if (input.dash && !p.previousDash) dashPlayer(p);
	if (input.pulse && !p.previousPulse) pulse();
	p.previousDash = !!input.dash;
	p.previousPulse = !!input.pulse;
	p.x = clamp(
		p.x + (p.dash > 0 ? p.dir * 32 : axis * balance.speed) * dt,
		-13.2,
		13.2,
	);
	p.y = 1.6 + Math.sin(time * 6 + p.index) * 0.04;
	p.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: 0 });
	p.mesh.position.set(p.x, p.y, 0);
	p.mesh.rotation.z = THREE.MathUtils.lerp(
		p.mesh.rotation.z,
		-axis * 0.12,
		0.18,
	);
	p.mesh.scale.y = THREE.MathUtils.lerp(p.mesh.scale.y, 1, 0.2);
	p.mesh.visible = p.invul <= 0 || Math.floor(p.invul * 15) % 2 === 0;
	p.mesh.userData.dash = p.dash > 0;
	if (input.fire && introTimer < 1.5) shoot(p);
}
function updateEnemy(e, dt) {
	e.age += dt;
	e.appear = Math.min(1, e.appear + dt * 3);
	let level =
		balance.enemySpeed * (1 + (wave > 6 ? 0.15 * Math.floor(wave / 6) : 0));
	if (e.type === "boss") {
		e.x = Math.sin(e.age * 0.57) * 7;
		e.y = 15 + Math.sin(e.age * 0.93) * 1.2;
		e.open = e.age % 7 > 2.7;
		e.mesh.userData.open = e.open;
		e.mesh.rotation.z = Math.sin(e.age) * 0.05;
		e.fire -= dt * balance.enemyFire;
		if (e.fire <= 0) {
			e.fire = e.open ? 1.3 : 0.7;
			for (let i = -3; i <= 3; i++) enemyShot(e, i * 0.19, wave > 6);
			if (
				e.age > 10 &&
				Math.random() < 0.23 &&
				entities.filter((a) => a.kind === "enemy").length < 4
			)
				spawnEnemy("splitter", e.x, 12);
		}
	} else if (e.diving) {
		e.diveDelay = Math.max(0, e.diveDelay - dt);
		if (e.diveDelay <= 0) {
			e.x += clamp((e.targetX - e.x) * 0.7, -5, 5) * dt * level;
			e.y -= 8.4 * dt * level;
			e.mesh.rotation.z = Math.atan2(e.targetX - e.x, 6) * -0.4;
		}
		if (e.y < 0.2) {
			visuals.burst(e.x, 0.2, 0xff9a62, 12);
			removeEntity(e);
			return;
		}
	} else {
		e.x = clamp(
			Math.sin(e.age * (0.72 + e.lane * 0.13) * level + e.phase) *
				(e.type === "shard" ? 10 : 11.4),
			-12,
			12,
		);
		e.y = e.baseY + Math.sin(e.age * 1.7 + e.phase) * 0.55;
		if (e.type === "phantom") {
			e.open = e.age % 4.2 < 2.7;
			e.mesh.scale.setScalar(e.appear * (e.open ? 1 : 0.25));
		} else e.mesh.scale.setScalar(e.appear * (e.type === "shard" ? 0.57 : 1));
		e.fire -= dt * balance.enemyFire;
		if (e.fire <= 0 && introTimer <= 0) {
			const lower = entities
				.filter((a) => a.kind === "enemy" && !a.dead)
				.reduce((a, b) => (a.y < b.y ? a : b), e);
			if (lower === e || wave >= 4) {
				enemyShot(e, 0, wave >= 4);
				if (wave >= 5) {
					enemyShot(e, -0.25);
					enemyShot(e, 0.25);
				}
			}
			e.fire =
				(2.5 + Math.random() * 1.4) /
				(waves[(wave - 1) % 6].fire * balance.difficulty);
		}
	}
	e.body.setNextKinematicTranslation({ x: e.x, y: e.y, z: 0 });
	e.mesh.position.set(e.x, e.y, 0);
	if (e.flash > 0) {
		e.flash -= dt;
		e.mesh.scale.multiplyScalar(1.06);
	}
}
function simulation(dt) {
	if (!activeRun() || !authoritative()) return;
	time += dt;
	runTime += dt;
	introTimer = Math.max(0, introTimer - dt);
	if (comboTime > 0) {
		comboTime -= dt;
		if (comboTime <= 0) combo = 0;
	}
	power = clamp(power + dt * 0.022 * balance.pulseRecharge, 0, 1);
	if (spawnLeft > 0 && introTimer <= 0.8) {
		spawnTimer -= dt;
		if (
			spawnTimer <= 0 &&
			entities.filter(
				(e) => e.kind === "enemy" && !e.dead && e.type !== "shard",
			).length < 3
		) {
			const w = waves[(wave - 1) % 6];
			spawnEnemy(w.types[(w.count - spawnLeft) % w.types.length]);
			spawnLeft--;
			spawnTimer = 0.75;
		}
	}
	for (const p of players) updatePlayer(p, dt);
	pendingDash = pendingPulse = false;
	for (const e of [...entities]) {
		if (e.dead) continue;
		if (e.kind === "enemy") updateEnemy(e, dt);
		if (e.kind === "shot") {
			e.age += dt;
			e.life -= dt;
			if (
				e.life <= 0 ||
				Math.abs(e.body.translation().x) > 17 ||
				e.body.translation().y > 23 ||
				e.body.translation().y < -0.5
			) {
				removeEntity(e);
				continue;
			}
			if (e.guided) {
				const p = players.find((p) => p.playerId === e.target) || players[0];
				if (p && e.body.translation().y > 4) {
					e.vx = THREE.MathUtils.lerp(
						e.vx,
						clamp((p.x - e.body.translation().x) * 0.85, -4, 4),
						dt * 1.3,
					);
					e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
				}
			}
			if (e.type === "friendly" && settings.tracer) {
				const p = players.find((p) => p.playerId === e.owner);
				if (p) {
					e.vx = THREE.MathUtils.lerp(e.vx, p.axis * 6, dt * 6);
					e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
				}
			}
		}
	}
	world.step(events);
	const contacts = [];
	events.drainCollisionEvents((h1, h2, started) =>
		contacts.push([h1, h2, started]),
	);
	for (const [h1, h2, started] of contacts) {
		if (!started) continue;
		const a = handles.get(h1),
			b = handles.get(h2);
		if (!a || !b || a.dead || b.dead) continue;
		stats.collisions++;
		const shot = a.kind === "shot" ? a : b.kind === "shot" ? b : null;
		const enemy = a.kind === "enemy" ? a : b.kind === "enemy" ? b : null;
		const p = a.kind === "player" ? a : b.kind === "player" ? b : null;
		if (shot && enemy && shot.type === "friendly") {
			removeEntity(shot);
			damageEnemy(enemy);
		}
		if (p && (enemy || shot?.type === "hostile")) {
			hurtPlayer(p);
			if (shot) removeEntity(shot);
			if (enemy?.type === "shard") killEnemy(enemy);
		}
	}
	for (const e of entities)
		if (!e.dead && e.kind === "shot") {
			const t = e.body.translation();
			e.x = t.x;
			e.y = t.y;
			e.mesh.position.set(t.x, t.y, 0.1);
			e.mesh.rotation.z = -Math.atan2(e.vx, Math.abs(e.vy));
		}
	entities = entities.filter((e) => !e.dead);
	if (
		!spawnLeft &&
		!entities.some((e) => e.kind === "enemy") &&
		introTimer <= 0
	) {
		if (clearTimer < 0) {
			clearTimer = 2.5;
			entities.filter((e) => e.kind === "shot").forEach(removeEntity);
			stats.wavesCleared++;
			if (waveHits === 0) {
				reserves = Math.min(6, reserves + 1);
				score += 500;
				announce("CLEAN SWEEP", "+1 reserve bunker · +500 points", 2);
			} else
				announce("WAVE CLEAR", "Recalibrating cannon. Reloading courage.", 2);
			audio.sfx("pickup");
		} else {
			clearTimer -= dt;
			if (clearTimer <= 0) beginWave(wave + 1);
		}
	}
	updateHUD();
}
function updateHUD() {
	const w = waves[(Math.max(1, wave) - 1) % 6];
	$("#score").textContent = String(score).padStart(6, "0");
	$("#wave-label").textContent =
		`${endless ? "Overtime" : "Wave"} ${String(wave).padStart(2, "0")} / ${endless ? "∞" : "06"}`;
	$("#wave-name").textContent = w.name;
	$("#wave-dots").innerHTML = waves
		.map((_, i) => `<i class="${i < ((wave - 1) % 6) + 1 ? "on" : ""}"></i>`)
		.join("");
	$("#reserves").textContent =
		"◆ ".repeat(Math.max(0, reserves)) + "◇ ".repeat(Math.max(0, 6 - reserves));
	$("#combo").textContent =
		combo >= 5 ? `×${1 + Math.floor(combo / 5)} FLOCK STREAK` : "";
	$("#power-meter").style.width = power * 100 + "%";
	$("#power-key").textContent =
		power >= 0.99 ? glyph("pulse") : Math.floor(power * 100) + "%";
	const b = entities.find((e) => e.type === "boss" && !e.dead);
	$("#bossbar").style.display = b ? "block" : "none";
	if (b) {
		$("#bosshp").style.width = (100 * b.hp) / b.maxHp + "%";
		$("#bossbar").firstChild.textContent = b.open
			? "THE BIG PECK · EYE OPEN"
			: "THE BIG PECK · ARMORED";
	}
	$("#touch-pulse").style.display =
		lastDevice === "touch" && screen === "playing" && power >= 0.99
			? "block"
			: "none";
	$("#network-label").textContent = attract
		? "AUTOPILOT"
		: online()
			? (link.hubActive ? "AI HUB · " : "ONLINE · ") +
				(link.isHost ? "HOST" : "WINGMATE")
			: coop
				? "TWO PILOTS · SHARED BUNKERS"
				: "SOLO PATROL";
}

function titleDecor() {
	if (!ready) return;
	resetWorld();
	const s = visuals.createShip(0);
	s.position.set(5, 1.6, 0);
	scene.add(s);
	entities.push({ id: ++uid, kind: "decor", mesh: s, dead: false });
	for (let i = 0; i < 3; i++) {
		const e = visuals.createEnemy(["grunt", "splitter", "phantom"][i], i);
		e.position.set(4 + i * 3, 10 + i * 2, 0);
		e.scale.setScalar(i === 1 ? 1.2 : 1);
		scene.add(e);
		entities.push({ id: ++uid, kind: "decor", mesh: e, dead: false, phase: i });
	}
}
function startAttract() {
	startRun(false);
	attract = true;
	god = true;
	$("#demo-label").style.display = "block";
	introTimer = 0.5;
	announce(
		"NIGHT SHIFT · LIVE DEMO",
		"Any input returns to the title screen",
		3,
	);
}
function interruptAttract() {
	if (!attract) return false;
	attract = false;
	god = false;
	resetWorld();
	renderTitle();
	return true;
}
function captureState() {
	return {
		v: 1,
		time,
		runTime,
		score,
		wave,
		reserves,
		combo,
		power,
		kills,
		totalShots,
		shotsHit,
		screen,
		won,
		spawnLeft,
		introTimer,
		entities: entities
			.filter((e) => !e.dead && e.kind !== "decor")
			.map((e) => ({
				id: e.id,
				k: e.kind,
				t: e.type,
				x: Math.round(e.x * 100) / 100,
				y: Math.round(e.y * 100) / 100,
				h: e.hp,
				m: e.maxHp,
				p: e.playerId,
				i: e.index,
				o: e.open,
				d: e.diving,
				iv: e.invul,
			})),
	};
}
function receiveState(s) {
	if (!s || s.v !== 1 || link.isHost) return;
	networkState = s;
	time = s.time;
	runTime = s.runTime;
	score = s.score;
	wave = s.wave;
	reserves = s.reserves;
	combo = s.combo;
	power = s.power;
	kills = s.kills;
	won = s.won;
	totalShots = s.totalShots;
	shotsHit = s.shotsHit;
	const ids = new Set(s.entities.map((e) => e.id));
	entities
		.filter((e) => !ids.has(e.id))
		.forEach((e) => {
			scene.remove(e.mesh);
			visuals.remove?.(e.mesh);
			e.dead = true;
		});
	entities = entities.filter((e) => !e.dead);
	for (const d of s.entities) {
		let e = entities.find((e) => e.id === d.id);
		if (!e) {
			let mesh =
				d.k === "player"
					? visuals.createShip(d.i)
					: d.k === "enemy"
						? d.t === "boss"
							? visuals.createBoss()
							: visuals.createEnemy(d.t, wave % 3)
						: visuals.createShot(d.t === "hostile");
			e = { id: d.id, kind: d.k, type: d.t, mesh, x: d.x, y: d.y, dead: false };
			scene.add(mesh);
			entities.push(e);
		}
		Object.assign(e, {
			targetX: d.x,
			targetY: d.y,
			hp: d.h,
			maxHp: d.m,
			playerId: d.p,
			index: d.i,
			open: d.o,
			diving: d.d,
			invul: d.iv,
		});
		e.mesh.userData.open = d.o;
	}
	players = entities.filter((e) => e.kind === "player");
	if (s.screen === "result" && screen !== "result") {
		won = s.won;
		renderResult();
	} else if (
		["pause", "dev", "settings", "help", "about"].includes(s.screen) &&
		screen === "playing"
	) {
		setScreen("network-pause");
		$("#hud").style.display = "block";
		$("#screen").innerHTML = modal(
			"Shared patrol",
			"Host is paused",
			"<p>Your wingmate is checking the flight deck. The patrol resumes together.</p>",
		);
	} else if (s.screen === "playing" && screen !== "playing") {
		setScreen("playing");
	}
	updateHUD();
}
function pollGamepads(dt) {
	gamepads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	let any = false;
	for (const pad of gamepads) {
		const prev = padPrevious.get(pad.index) || [];
		const buttons = pad.buttons.map((b) => b.pressed);
		const axis = pad.axes?.[0] || 0;
		const ay = pad.axes?.[1] || 0;
		const pressed = buttons.some((v, i) => v && !prev[i]);
		if (pressed || Math.abs(axis) > 0.2 || Math.abs(ay) > 0.2) {
			setDevice("pad");
			idle = 0;
			any = true;
			if (interruptAttract()) {
				padPrevious.set(pad.index, buttons);
				return;
			}
		}
		if (buttons[9] && !prev[9] && !buttons[8]) {
			audio.unlock();
			if (screen === "playing" && (!online() || link.isHost)) renderPause();
			else if (screen === "pause") setScreen("playing");
		}
		if (
			screen !== "playing" &&
			(!link?.hubActive ||
				["pause", "settings", "help", "about", "dev"].includes(screen))
		) {
			menuRepeat -= dt;
			let direction =
				(buttons[13] ? 1 : 0) -
				(buttons[12] ? 1 : 0) +
				(Math.abs(ay) > 0.55 ? Math.sign(ay) : 0);
			if (direction && menuRepeat <= 0) {
				menuMove(Math.sign(direction));
				menuRepeat = 0.2;
			}
			if (buttons[0] && !prev[0]) menuAccept();
			if (buttons[1] && !prev[1]) {
				if (link?.panel) {
					link.close();
					link.hidePanel();
				} else if (screen === "pause") setScreen("playing");
				else if (["settings", "help", "about"].includes(screen)) act("back");
				else if (screen === "dev") renderPause();
			}
			if (menuRepeat <= 0 && Math.abs(axis) > 0.6) {
				menuAdjust(Math.sign(axis));
				menuRepeat = 0.15;
			}
		}
		padPrevious.set(pad.index, buttons);
	}
	return any;
}
function inputOccurred(device) {
	setDevice(device);
	idle = 0;
	return interruptAttract();
}
window.addEventListener("keydown", (e) => {
	if (
		["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
		(e.target.type !== "range" ||
			!["Escape", "Enter", "ArrowUp", "ArrowDown"].includes(e.code))
	)
		return;
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Enter",
			"Slash",
		].includes(e.code)
	)
		e.preventDefault();
	if (inputOccurred("keyboard")) return;
	audio.unlock();
	keys.add(e.code);
	if (e.repeat) return;
	if (e.code === "Escape" || e.code === "KeyP") {
		if (screen === "playing") {
			if (!online() || link.isHost) renderPause();
		} else if (screen === "pause") setScreen("playing");
		else if (["help", "settings", "about"].includes(screen)) act("back");
		else if (screen === "dev") renderPause();
		return;
	}
	if (e.code === "KeyM") {
		muted = !muted;
		audio.setMuted(muted);
		toast(muted ? "Lunar radio muted" : "Lunar radio on", 1);
		return;
	}
	if (screen !== "playing") {
		if (e.code === "ArrowDown" || e.code === "KeyS") menuMove(1);
		else if (e.code === "ArrowUp" || e.code === "KeyW") menuMove(-1);
		else if (e.code === "ArrowLeft") menuAdjust(-1);
		else if (e.code === "ArrowRight") menuAdjust(1);
		else if (e.code === "Enter" || e.code === "Space") menuAccept();
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
$("#world").addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
	if (inputOccurred("mouse")) return;
	mouse.active = true;
	mouse.x = pointerWorldX(e.clientX);
});
window.addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") return;
	const interrupted = inputOccurred("mouse");
	audio.unlock();
	if (interrupted) {
		e.preventDefault();
		return;
	}
	if (e.target === $("#world") && screen === "playing") {
		mouse.down = true;
		mouse.active = true;
		mouse.x = pointerWorldX(e.clientX);
	}
});
window.addEventListener("pointerup", () => (mouse.down = false));
window.addEventListener("pointermove", (e) => {
	if (
		e.pointerType !== "touch" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) > 1 &&
		screen !== "playing"
	)
		inputOccurred("mouse");
});
function pointerWorldX(x) {
	const v = new THREE.Vector3((x / innerWidth) * 2 - 1, 0, 0);
	v.unproject(camera);
	return clamp(v.x, -13.2, 13.2);
}
let lastTap = 0;
$("#world").addEventListener(
	"touchstart",
	(e) => {
		e.preventDefault();
		if (inputOccurred("touch")) return;
		audio.unlock();
		if (screen !== "playing") return;
		const t = e.changedTouches[0];
		if (!touch.active) {
			touch.active = true;
			touch.id = t.identifier;
			touch.startX = t.clientX;
			touch.startPlayer =
				(online()
					? players.find((p) => p.playerId === link.localId)
					: players[0]
				)?.x || 0;
			touch.x = touch.startPlayer;
			$("#touch-ring").style.display = "block";
			$("#touch-ring").style.left = t.clientX + "px";
			$("#touch-ring").style.top = t.clientY + "px";
		}
		if (performance.now() - lastTap < 280) pendingDash = true;
		lastTap = performance.now();
	},
	{ passive: false },
);
$("#world").addEventListener(
	"touchmove",
	(e) => {
		e.preventDefault();
		const t = [...e.touches].find((t) => t.identifier === touch.id);
		if (!t) return;
		touch.x = clamp(
			touch.startPlayer + ((t.clientX - touch.startX) / innerWidth) * 40,
			-13.2,
			13.2,
		);
		$("#touch-ring").style.left = t.clientX + "px";
		$("#touch-ring").style.top = t.clientY + "px";
	},
	{ passive: false },
);
const endTouch = (e) => {
	if (![...e.touches].some((t) => t.identifier === touch.id)) {
		touch.active = false;
		$("#touch-ring").style.display = "none";
	}
};
$("#world").addEventListener("touchend", endTouch);
$("#world").addEventListener("touchcancel", endTouch);
$("#touch-pulse").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	e.stopPropagation();
	pendingPulse = true;
	audio.unlock();
});
$("#pause-button").onclick = () => {
	audio.unlock();
	if (!online() || link.isHost) renderPause();
	else toast("The host controls the shared pause.");
};
window.addEventListener("blur", () => {
	keys.clear();
	mouse.down = false;
	touch.active = false;
	if (screen === "playing" && !attract && !online()) renderPause();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		audio.setPaused(true);
		keys.clear();
		mouse.down = false;
		if (screen === "playing" && !attract && !online()) renderPause();
	} else if (screen === "playing") audio.setPaused(false);
});
window.addEventListener("resize", () => resize());
function resize() {
	if (!renderer) return;
	renderer.setSize(innerWidth, innerHeight);
	const aspect = innerWidth / innerHeight,
		half = Math.max(12, 16 / aspect);
	camera.left = -half * aspect;
	camera.right = half * aspect;
	camera.top = half;
	camera.bottom = -half;
	camera.updateProjectionMatrix();
}

function frame(now) {
	requestAnimationFrame(frame);
	const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
	last = now;
	renderFrames++;
	pollGamepads(dt);
	if (!ready) return;
	if (screen === "title") {
		idle += dt;
		if ($("#idle-caption"))
			$("#idle-caption").textContent =
				`Autopilot demonstration in ${Math.max(0, Math.ceil(10 - idle))}s`;
		if (idle >= 10 && !link.hubActive && !link.panel) startAttract();
		for (const e of entities)
			if (e.kind === "decor" && e.phase != null) {
				e.mesh.position.y =
					10 + e.phase * 2 + Math.sin(now * 0.001 + e.phase) * 0.5;
				e.mesh.position.x =
					4 + e.phase * 3 + Math.sin(now * 0.0006 + e.phase) * 1.6;
			}
	}
	if (screen === "playing") {
		if (online() && !link.isHost) {
			link.sendInput(localInput(0));
			pendingDash = pendingPulse = false;
			for (const e of entities) {
				e.x = THREE.MathUtils.lerp(e.x, e.targetX ?? e.x, 0.35);
				e.y = THREE.MathUtils.lerp(e.y, e.targetY ?? e.y, 0.35);
				e.mesh.position.set(e.x, e.y, 0);
			}
		} else {
			accum += dt * (slow ? 0.5 : 1);
			let n = 0;
			while (accum >= 1 / 60 && n++ < 5) {
				simulation(1 / 60);
				accum -= 1 / 60;
			}
		}
	}
	if (online() && link.isHost) {
		snapshotTime += dt;
		if (snapshotTime >= 0.1) {
			snapshotTime = 0;
			link.sendState(captureState());
		}
	}
	if (bannerTimer > 0) {
		bannerTimer -= dt;
		if (bannerTimer <= 0) $("#banner").classList.remove("show");
	}
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("#toast").classList.remove("show");
	}
	shake = Math.max(0, shake - dt);
	flash = Math.max(0, flash - dt);
	camera.position.x = settings.shake ? (Math.random() - 0.5) * shake * 0.7 : 0;
	camera.position.y =
		10 + (settings.shake ? (Math.random() - 0.5) * shake * 0.4 : 0);
	$("#flash").style.opacity = flash * 0.25;
	visuals.update(dt, now * 0.001);
	audio.tick(dt, screen === "playing");
	renderer.render(scene, camera);
}

async function init() {
	try {
		await RAPIER.init();
		$("#loading-text").textContent = "Calibrating the cannon…";
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x10172b);
		camera = new THREE.OrthographicCamera(-20, 20, 22, -2, 0.1, 300);
		camera.position.set(0, 10, 45);
		camera.lookAt(0, 10, 0);
		renderer = new THREE.WebGPURenderer({
			canvas: $("#world"),
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		await renderer.init();
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.2;
		visuals = new GameVisuals(scene);
		visuals.buildStage();
		resetWorld();
		resize();
		ready = true;
		window.gameTest = {
			ready: true,
			get state() {
				return {
					screen,
					attract,
					wave,
					score,
					reserves,
					power,
					kills,
					runTime,
					spawnLeft,
					entityCount: entities.length,
					players: players.map((p) => ({
						id: p.playerId,
						x: p.x,
						y: p.y,
						shots: p.shotCount,
						dash: p.dash,
						invul: p.invul,
					})),
					types: [...stats.spawnedTypes],
					stats: { ...stats, spawnedTypes: [...stats.spawnedTypes] },
					balance: { ...balance },
					settings: { ...settings },
					backend: renderer.backend.isWebGPUBackend ? "webgpu" : "webgl",
					version: THREE.REVISION,
					rapier: RAPIER.version(),
					audio: audio.metrics,
					frames: renderFrames,
					hub: link
						? {
								active: link.hubActive,
								host: link.isHost,
								connected: link.connected,
								server: link.server,
								role: link.role,
							}
						: null,
					entities: entities
						.filter((e) => !e.dead)
						.map((e) => ({
							id: e.id,
							kind: e.kind,
							type: e.type,
							x: e.x,
							y: e.y,
							hp: e.hp,
							diving: e.diving,
						})),
				};
			},
			start: (c = false) => startRun(c),
			step: (n) => {
				for (let i = 0; i < n; i++) simulation(1 / 60);
			},
			autoplay: (v) => {
				autoplay = v;
				god = v;
			},
			wave: (n) => {
				clearCombat();
				beginWave(n);
				introTimer = 0;
				spawnTimer = 0;
			},
			input: (v) => {
				keys = new Set(v);
			},
			damage: () => {
				players[0].invul = 0;
				hurtPlayer(players[0]);
			},
			pulse: () => {
				power = 1;
				pulse();
			},
			dash: () => dashPlayer(players[0]),
			spawn: (type, x, y) => spawnEnemy(type, x, y),
			hit: (id) => damageEnemy(entities.find((e) => e.id === id)),
			set: (k, v) => {
				if (k in balance) balance[k] = v;
			},
			pause: renderPause,
			act,
			attract: startAttract,
			snapshot: captureState,
			finish: (v) => finishRun(v),
			audioTest: () => SynthAudio.renderTest(),
			get link() {
				return link;
			},
			get audio() {
				return audio;
			},
		};
		link = new HubLink({
			onInput: (input, id) => {
				if (input && typeof input === "object")
					remoteInputs.set(id, {
						axis: clamp(Number(input.axis) || 0, -1, 1),
						fire: !!input.fire,
						dash: !!input.dash,
						pulse: !!input.pulse,
						target:
							input.target == null
								? null
								: clamp(Number(input.target) || 0, -13.2, 13.2),
					});
			},
			onState: receiveState,
			onStatus: (s) => {
				if (ready) toast(s, 3);
			},
			onStart: (info) => {
				onlineStarting = true;
				startRun((info.players || link.players).length > 1, false, {
					players: info.players || link.players,
				});
				if (!link.isHost) {
					clearCombat();
					players.forEach((p) => removeEntity(p));
					entities = [];
					players = [];
				}
				setScreen("playing");
			},
			onJoin: () => {},
			onEnd: () => {
				if (screen !== "result") {
					renderResult();
				}
				audio.setPaused(true);
			},
			onLeave: (detail) => {
				remoteInputs.delete(detail.id);
				if (link.isHost) {
					players.filter((p) => p.playerId === detail.id).forEach(removeEntity);
					players = players.filter((p) => p.playerId !== detail.id);
					if (screen === "playing")
						toast("Wingmate disconnected. You can finish the patrol.", 4);
				}
			},
			onTimeUp: () => {
				if (authoritative()) finishRun(false);
			},
		});
		$("#loading").remove();
		if (window.AIHub?.active) {
			setScreen("hub-wait");
			$("#screen").innerHTML = modal(
				"AI Hub",
				"Cannon ready",
				"<p>Waiting for the shared launch clock…</p>",
			);
			await link.init();
		} else {
			await link.init();
			renderTitle();
		}
		updatePrompts();
		last = performance.now();
		requestAnimationFrame(frame);
	} catch (err) {
		console.error(err);
		$("#loading strong").textContent = "SIGNAL INTERRUPTED";
		$("#loading-text").textContent =
			`The renderer could not start: ${err.message}. Try a current Chromium browser with GPU acceleration.`;
		window.gameBootError = String(err.stack || err);
	}
}
init();
