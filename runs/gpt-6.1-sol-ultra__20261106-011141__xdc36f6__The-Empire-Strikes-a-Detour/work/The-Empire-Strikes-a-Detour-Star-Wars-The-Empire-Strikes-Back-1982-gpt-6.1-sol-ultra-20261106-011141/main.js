import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three/webgpu";
import {
	createAce,
	createProbe,
	createSpeeder,
	createTransport,
	createWalker,
	createWorld,
} from "./art.js";
import { AudioDirector, renderAudioTest } from "./audio.js";
import feedback from "./feedback.json";
import { CoopLink } from "./network.js";

const $ = (id) => document.getElementById(id),
	clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
	TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
	norm = (x, z) => {
		const n = Math.hypot(x, z);
		return n > 0.001 ? { x: x / n, z: z / n } : { x: 0, z: -1 };
	};
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const defaults = {
	speed: 48,
	damage: 18,
	enemyDamage: 10,
	walkerSpeed: 1.25,
	cableSpeed: 1,
	enemyRate: 1,
	shieldDrain: 1,
};
let tuning = { ...defaults };
const settings = {
	music: 0.1,
	sfx: 0.6,
	glyphs: "ps",
	assist: true,
	shake: 0.65,
	zoom: 1,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("detour-settings") || "{}"),
	);
} catch {}
const audio = new AudioDirector();
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
const link = new CoopLink();
let renderer,
	world,
	land,
	scene,
	camera,
	clock,
	raycaster = new THREE.Raycaster(),
	groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -7),
	pointerPoint = new THREE.Vector3();
let mode = "title",
	modalPage = "",
	previousMode = "title",
	phase = 0,
	elapsed = 0,
	phaseTime = 0,
	score = 0,
	baseHP = 100,
	rescued = 0,
	kills = 0,
	evacuated = 0,
	missionSeed = 0;
let players = [],
	enemies = [],
	transports = [],
	shots = [],
	effects = [],
	pods = [],
	debris = [],
	physicsTime = 0,
	attractTime = 0,
	idleTime = 0,
	visualTime = 0,
	radioTime = 0,
	bannerTime = 0,
	shake = 0;
let nextID = 1,
	invincible = false,
	freezeEnemies = false,
	testInput = null,
	inputKind = matchMedia("(pointer: coarse)").matches ? "touch" : "keyboard",
	cursorActive = false;
let simAccumulator = 0,
	testHold = false,
	started = false,
	guest = false,
	networkMode = false,
	lastHud = -1,
	lastShotAudio = -1,
	crashed = false,
	lastSnapshot = -1,
	lastRemoteRound = -1;
const keys = new Set(),
	pointer = { x: 0, y: 0, down: false, active: false },
	touches = new Map(),
	touchMove = { x: 0, z: 0 },
	touchAim = { x: 0, z: 0 },
	padState = { buttons: [], menuDir: 0, lastNav: 0 },
	seq = { action: 0, roll: 0 };
let onlineText =
		"Fly together. One pilot hosts; a wingmate joins with the flight code.",
	menuFocus = 0,
	lastController = false,
	remoteInputs = new Map();
const dynamicRoot = new THREE.Group(),
	remoteRoot = new THREE.Group(),
	remoteModels = new Map();
let cableLine,
	cablePositions = new Float32Array(150 * 3),
	reticle,
	aimMarker;
const materials = {};

function saveSettings() {
	try {
		localStorage.setItem("detour-settings", JSON.stringify(settings));
	} catch {}
}
function setInputKind(k) {
	inputKind = k;
	document.body.classList.toggle("touch", k === "touch");
	updatePrompts();
}
function updatePrompts() {
	const pad = inputKind === "gamepad",
		xbox = settings.glyphs === "xbox";
	const entries = pad
		? [
				["L", "FLY"],
				["R", "AIM"],
				[xbox ? "RT" : "R2", "FIRE"],
				[xbox ? "LT" : "L2", "BOOST"],
				[xbox ? "A" : "✕", "TOW / RESCUE"],
				[xbox ? "B" : "○", "ROLL"],
			]
		: [
				["WASD", "FLY"],
				["MOUSE", "AIM / FIRE"],
				["SHIFT", "BOOST"],
				["E", "TOW / RESCUE"],
				["SPACE", "ROLL"],
			];
	$("controlStrip").innerHTML = entries
		.map(([k, v]) => `<span><b class="key">${k}</b>${v}</span>`)
		.join("");
}
function say(text, name = "ECHO CONTROL", mood = "radio") {
	$("radioText").textContent = text;
	$("radioName").textContent = name;
	radioTime = 7;
	audio.voice(mood);
}
function banner(title, small) {
	$("bannerTitle").textContent = title;
	$("bannerSmall").textContent = small;
	bannerTime = 3.3;
}
function colorMat(c) {
	if (!materials[c])
		materials[c] = new THREE.MeshBasicNodeMaterial({ color: c });
	return materials[c];
}
function addMesh(geo, c, parent = dynamicRoot) {
	const m = new THREE.Mesh(geo, colorMat(c));
	parent.add(m);
	return m;
}
function makeCircle(radius, c) {
	const m = addMesh(new THREE.RingGeometry(radius - 0.3, radius, 64), c);
	m.rotation.x = -Math.PI / 2;
	m.position.y = 0.35;
	return m;
}
function freshPhysics() {
	world?.free();
	world = new RAPIER.World({ x: 0, y: -20, z: 0 });
	world.timestep = 1 / 60;
	world.createCollider(
		RAPIER.ColliderDesc.cuboid(350, 0.5, 300).setTranslation(0, -0.5, 0),
	);
	for (const [x, z, hx, hz] of [
		[-166, 0, 3, 132],
		[166, 0, 3, 132],
		[0, -126, 166, 3],
		[0, 126, 166, 3],
	])
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(hx, 20, hz).setTranslation(x, 20, z),
		);
}
function clearGame() {
	for (const p of players) p.mixer?.stopAllAction();
	for (const e of enemies) e.mesh.userData.mixer?.stopAllAction();
	dynamicRoot.clear();
	remoteRoot.clear();
	remoteModels.clear();
	players = [];
	enemies = [];
	transports = [];
	shots = [];
	effects = [];
	pods = [];
	debris = [];
	nextID = 1;
	freshPhysics();
	setupEffects();
}
function setupEffects() {
	cableLine = new THREE.Line(
		new THREE.BufferGeometry().setAttribute(
			"position",
			new THREE.BufferAttribute(cablePositions, 3),
		),
		new THREE.LineBasicNodeMaterial({ color: 0x172c39 }),
	);
	cableLine.visible = false;
	dynamicRoot.add(cableLine);
	reticle = makeCircle(5, 0xf66936);
	reticle.visible = false;
	aimMarker = new THREE.Group();
	dynamicRoot.add(aimMarker);
	for (let i = 0; i < 4; i++) {
		const m = addMesh(
			new THREE.BoxGeometry(2, 0.16, 0.45),
			0xf66936,
			aimMarker,
		);
		m.position.set(Math.cos((i * TAU) / 4) * 4, 0, Math.sin((i * TAU) / 4) * 4);
		m.rotation.y = (-i * TAU) / 4;
	}
	aimMarker.position.y = 0.5;
}
function makePlayer(id, x = -15, z = 55) {
	const mesh = new THREE.Group(),
		craft = createSpeeder(id === 0 ? 0xf66936 : 0x35bbc4);
	mesh.add(craft);
	dynamicRoot.add(mesh);
	mesh.position.set(x, 7, z);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(x, 7, z)
			.setGravityScale(0)
			.setLinearDamping(4)
			.lockRotations()
			.enabledTranslations(true, false, true),
	);
	body.userData = { type: "player", id };
	world.createCollider(
		RAPIER.ColliderDesc.ball(3).setRestitution(0.15).setFriction(0),
		body,
	);
	const mixer = new THREE.AnimationMixer(craft),
		roll = mixer.clipAction(
			new THREE.AnimationClip("Evasive roll", 0.65, [
				new THREE.NumberKeyframeTrack(
					".rotation[z]",
					[0, 0.13, 0.32, 0.5, 0.65],
					[0, 1.2, 3.14, 5.1, TAU],
				),
			]),
		);
	roll.setLoop(THREE.LoopOnce, 1);
	roll.clampWhenFinished = false;
	const p = {
		id,
		x,
		z,
		hp: 100,
		heat: 0,
		overheat: false,
		heading: 0,
		vx: 0,
		vz: 0,
		fireCD: 0,
		rollCD: 0,
		invuln: 2,
		towId: null,
		towProgress: 0,
		towAngle: 0,
		towTravel: 0,
		carrying: null,
		actionSeq: 0,
		rollSeq: 0,
		mesh,
		craft,
		body,
		mixer,
		roll,
		boost: false,
	};
	players.push(p);
	return p;
}
function spawnEnemy(type, x, z, extra = {}) {
	const mesh =
		type === "walker"
			? createWalker()
			: type === "ace"
				? createAce()
				: createProbe();
	dynamicRoot.add(mesh);
	const y = type === "walker" ? 0 : type === "ace" ? 11 : 8;
	mesh.position.set(x, y, z);
	if (type === "walker") mesh.rotation.y = Math.PI;
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			x,
			type === "walker" ? 12 : y,
			z,
		),
	);
	const id = nextID++,
		hp = type === "walker" ? 260 : type === "ace" ? 420 : 42;
	const collider = world.createCollider(
		type === "walker"
			? RAPIER.ColliderDesc.cuboid(6, 12, 9)
			: RAPIER.ColliderDesc.ball(type === "ace" ? 7 : 3.2),
		body,
	);
	body.userData = { type: "enemy", id };
	const e = {
		id,
		type,
		x,
		z,
		y,
		hp,
		maxHP: hp,
		mesh,
		body,
		collider,
		dead: false,
		fire: 2 + Math.random() * 3,
		age: Math.random() * TAU,
		originX: x,
		originZ: z,
		fall: 0,
		tow: 0,
		...extra,
	};
	enemies.push(e);
	return e;
}
function spawnPod(x, z) {
	const mesh = new THREE.Group();
	dynamicRoot.add(mesh);
	const shell = addMesh(
		new THREE.CapsuleGeometry(1.5, 2.5, 4, 8),
		0xe9eee1,
		mesh,
	);
	shell.rotation.z = Math.PI / 2;
	const stripe = addMesh(new THREE.BoxGeometry(0.8, 2.8, 3.1), 0xf66936, mesh);
	const beacon = addMesh(new THREE.ConeGeometry(1, 3, 8), 0xf5cf73, mesh);
	beacon.position.y = 5;
	mesh.position.set(x, 2.2, z);
	const ring = makeCircle(6, 0xf5cf73);
	ring.position.set(x, 0.25, z);
	pods.push({ id: nextID++, x, z, mesh, ring, carried: false, saved: false });
}
function startGame(demo = false) {
	if (guest && !demo) return;
	if (link.mode !== "hub") link.resetRound();
	clearGame();
	simAccumulator = 0;
	freezeEnemies = false;
	phase = 0;
	elapsed = 0;
	phaseTime = 0;
	score = 0;
	baseHP = 100;
	rescued = 0;
	kills = 0;
	evacuated = 0;
	missionSeed++;
	lastHud = -1;
	started = true;
	invincible = demo;
	attractTime = 0;
	const ids = networkMode
		? link.players.filter((x) => x.connected !== false).map((x) => x.id)
		: [0];
	if (!ids.length) ids.push(0);
	ids.forEach((id, i) => {
		makePlayer(id, -12 + i * 24, 55);
	});
	for (const [x, z] of [
		[-75, -45],
		[-30, -76],
		[45, -64],
		[90, -15],
	])
		spawnEnemy("probe", x, z);
	for (const [x, z] of [
		[-95, 15],
		[65, 37],
		[12, -38],
	])
		spawnPod(x, z);
	mode = demo ? "attract" : "playing";
	closeModal();
	setScreens();
	audio.setPaused(false);
	if (!demo) {
		audio.unlock();
		say(
			"The shield is holding. Those probes are calling in company. Cut the conversation short.",
		);
		banner("ON THIN ICE", "01 / THE APPROACH");
	}
}
function beginPhase(n) {
	phase = n;
	phaseTime = 0;
	if (n === 1) {
		for (const [x, z] of [
			[-58, -58],
			[55, -72],
		])
			spawnEnemy("walker", x, z);
		say(
			"Armor is too thick for blasters. Get close, deploy a cable, and keep circling.",
			"ROGUE TWO",
		);
		banner("MIND THE LEGS", "02 / THE LONG WALK");
	}
	if (n === 2) {
		spawnEnemy("ace", 0, -73);
		for (const x of [-28, 28]) {
			const mesh = createTransport();
			mesh.position.set(x, 4, 90);
			mesh.rotation.y = 0;
			dynamicRoot.add(mesh);
			transports.push({
				id: nextID++,
				x,
				z: 90,
				y: 4,
				hp: 160,
				maxHP: 160,
				mesh,
				escaped: false,
			});
		}
		for (const [x, z] of [
			[-98, -40],
			[95, -70],
			[-60, -90],
			[75, 10],
		])
			spawnEnemy("probe", x, z);
		say(
			"Transports are away. Keep that interceptor busy until both ships clear the valley.",
			"ECHO CONTROL",
			"urgent",
		);
		banner("LAST FLIGHT OUT", "03 / THE EVACUATION");
	}
}
function setScreens() {
	const onTitle = mode === "title";
	$("titleScreen").classList.toggle("show", onTitle);
	$("hud").classList.toggle(
		"show",
		["playing", "attract", "guest", "paused"].includes(mode),
	);
	$("attract").style.display = mode === "attract" ? "block" : "none";
	$("touchMenu").style.visibility = onTitle ? "hidden" : "visible";
	$("touchHint").style.visibility = ["playing", "guest"].includes(mode)
		? "visible"
		: "hidden";
	$("cursor").style.display =
		cursorActive && inputKind === "keyboard" && mode === "playing"
			? "block"
			: "none";
}
function exitAttract() {
	if (mode !== "attract") return false;
	mode = "title";
	idleTime = 0;
	invincible = false;
	setScreens();
	return true;
}
function inputActivity() {
	idleTime = 0;
	if (mode === "attract") {
		exitAttract();
		return true;
	}
	return false;
}
function getLocalPlayer() {
	return (
		players.find((p) => p.id === (networkMode ? link.me : 0)) || players[0]
	);
}
function action() {
	seq.action++;
}
function roll() {
	seq.roll++;
}
function menuButtons() {
	return [...$("panel").querySelectorAll("button,input,select")].filter(
		(x) => !x.disabled && x.offsetParent !== null,
	);
}
function focusMenu(delta = 0) {
	const els = modalPage
		? menuButtons()
		: [...$("titleScreen").querySelectorAll("button")];
	if (!els.length) return;
	menuFocus = (menuFocus + delta + els.length) % els.length;
	els.forEach((x, i) => {
		x.classList.toggle("focused", i === menuFocus);
	});
	els[menuFocus].focus({ preventScroll: true });
	els[menuFocus].scrollIntoView({ block: "nearest" });
}
function pause() {
	if (mode === "attract") {
		exitAttract();
		return;
	}
	if (modalPage) {
		if (modalPage === "pause") resume();
		else openModal("pause");
		return;
	}
	if (mode === "playing" || mode === "guest") {
		previousMode = mode;
		if (!networkMode) mode = "paused";
		audio.setPaused(!networkMode);
		openModal("pause");
	}
}
function resume() {
	if (mode === "paused") mode = previousMode === "guest" ? "guest" : "playing";
	closeModal();
	audio.setPaused(false);
	setScreens();
}
function closeModal() {
	modalPage = "";
	$("modal").classList.remove("show");
}
function backTitle() {
	link.close();
	networkMode = false;
	guest = false;
	mode = "title";
	idleTime = 0;
	closeModal();
	audio.setPaused(false);
	clearGame();
	makePlayer(0, -25, 18);
	spawnEnemy("walker", 38, -5);
	spawnEnemy("walker", 95, -65);
	spawnEnemy("probe", -55, -25);
	setScreens();
}
function row(label, key, min, max, step, object = tuning, format = null) {
	const val = object[key];
	return `<label class="setting-row">${label}<input class="focusable" type="range" data-object="${object === settings ? "settings" : "tuning"}" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${val}"><output>${format ? format(val) : val}</output></label>`;
}
function openModal(page) {
	if (!modalPage) previousMode = mode;
	modalPage = page;
	menuFocus = 0;
	let content = "";
	const close = `<button class="close" data-action="close" aria-label="Back">×</button>`;
	if (page === "pause")
		content = `<div class="eyebrow orange">FLIGHT HOLD</div><h2>Catch your breath.</h2><div class="menu-stack"><button class="primary" data-action="resume">Resume sortie</button><button data-action="settings">Settings</button><button data-action="online">Wingmate & flight code</button><button data-action="help">Flight school</button><button data-action="dev">Developer flight deck</button><button data-action="about">About & credits</button><button data-action="title">Return to title</button></div><div class="panel-foot">${networkMode ? "ONLINE SORTIES CONTINUE WHILE MENUS ARE OPEN" : "THE VALLEY CAN WAIT A MOMENT"}</div>`;
	if (page === "settings")
		content =
			close +
			`<div class="eyebrow orange">YOUR COCKPIT</div><h2>Flight settings</h2>${row("Music", "music", 0, 1, 0.01, settings, (v) => Math.round(v * 100) + "%")}${row("Effects & radio", "sfx", 0, 1, 0.01, settings, (v) => Math.round(v * 100) + "%")}${row("Camera shake", "shake", 0, 1, 0.05, settings, (v) => Math.round(v * 100) + "%")}${row("Tactical zoom", "zoom", 0.8, 1.3, 0.05, settings, (v) => v.toFixed(2) + "×")}<label class="setting-row">Controller glyphs<select class="focusable" id="glyphSelect"><option value="ps" ${settings.glyphs === "ps" ? "selected" : ""}>PlayStation · ✕ ○ □ △</option><option value="xbox" ${settings.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></label><label class="setting-row">Aim assistance<select id="assistSelect" class="focusable"><option value="true" ${settings.assist ? "selected" : ""}>On · gentle target lock</option><option value="false" ${!settings.assist ? "selected" : ""}>Off · manual aim</option></select></label><p class="settings-note">Music starts at 10%. Touch flight includes automatic targeting, firing and cable assistance.</p>`;
	if (page === "help")
		content =
			close +
			`<div class="eyebrow orange">ROGUE SQUADRON / FIELD MANUAL</div><h2>Small ship. Big ideas.</h2><div class="help-grid"><div class="help-card"><b>01 · FLY & FIGHT</b><p><em>WASD / left stick</em> steers. Aim with <em>mouse / right stick</em>. Hold <em>left click / R2</em> to fire.</p><p>Hold <em>Shift / L2</em> to boost. <em>Space / ○</em> rolls through danger. Watch blaster heat.</p></div><div class="help-card"><b>02 · TIE THE KNOT</b><p>Approach a walker within 46m. Press <em>E / ✕</em> to latch the cable. Your co-pilot flies the circle.</p><p><em>Keep firing</em> while winding. Two loops bring it down. Press again to release.</p></div><div class="help-card"><b>03 · BRING THEM HOME</b><p>At a survivor beacon, press <em>E / ✕</em> to collect. Fly within 23m of Echo Base to deliver.</p><p>Each rescue repairs your hull and the shield. Recovery is automatic if your ship is downed.</p></div><div class="help-card"><b>04 · COVER THE EXIT</b><p>Stop the walkers before they reach the shield. Then escort <em>both transports</em> north and defeat the interceptor.</p><p>On touch: drag left to fly, right to aim. Blasters assist. Tap the context button for tow / rescue.</p></div></div><div class="panel-foot">SOLO OR 2-PILOT ONLINE CO-OP · NO FRIENDLY FIRE · SHARED VICTORY</div>`;
	if (page === "dev")
		content =
			close +
			`<div class="eyebrow orange">DEVELOPER FLIGHT DECK</div><h2>Make your own odds.</h2>${row("Flight speed", "speed", 20, 100, 1)}${row("Blaster damage", "damage", 4, 60, 1)}${row("Incoming damage", "enemyDamage", 0, 30, 1)}${row("Walker march speed", "walkerSpeed", 0.2, 4, 0.1)}${row("Cable winding speed", "cableSpeed", 0.25, 3, 0.05)}${row("Enemy fire rate", "enemyRate", 0.1, 3, 0.1)}${row("Shield pressure", "shieldDrain", 0, 3, 0.1)}<div class="menu-stack" style="margin-top:18px"><button data-action="god">Invulnerability: ${invincible ? "ON" : "OFF"}</button><button data-action="freeze">Freeze enemies: ${freezeEnemies ? "ON" : "OFF"}</button><button data-action="heal">Repair ship & shield</button><button data-action="phase">Advance mission chapter</button><button data-action="resetTuning">Reset balance to defaults</button></div><p class="settings-note">Values apply live. In online co-op, the host controls simulation. Chapter advance keeps the mission playable.</p>`;
	if (page === "online")
		content =
			close +
			`<div class="eyebrow orange">TWO PILOTS / ONE REBELLION</div><h2>Bring a wingmate.</h2><p>Share a flight code. Your wingmate can join from this game on another device. The host flies as Rogue Leader.</p><div class="menu-stack"><button class="primary" data-action="host">Host co-op sortie</button></div><div class="room-row"><input id="roomInput" maxlength="32" placeholder="Flight code" aria-label="Flight code"><button data-action="join">Join</button></div><p class="online-status" id="onlineStatus">${onlineText}</p><p class="room-code" id="roomCode">${link.room || ""}</p><p class="settings-note">Same-browser flights connect locally. Remote flights use encrypted WebRTC with public signaling. In AI Hub, the lobby supplies your crew automatically.</p>`;
	if (page === "about")
		content =
			close +
			`<div class="eyebrow orange">THE EMPIRE STRIKES A DETOUR</div><h2>Behind the flight.</h2><p>An unofficial, original tribute to the snowbound rebellion and the arcade spirit of 1982. All models, animation, music, effects and radio voices are generated in code.</p><div class="about-copy"><h3>Source Information</h3><dl>${Object.entries(
				feedback.sourceInformation,
			)
				.map(
					([k, v]) =>
						`<dt>${k[0].toUpperCase() + k.slice(1)}</dt><dd>${v}</dd>`,
				)
				.join("")}</dl>${[
				["Testing Feedback", feedback.testingFeedback],
				["Engine Feedback", feedback.engineFeedback],
				["Prompt Feedback", feedback.promptFeedback],
			]
				.map(
					([title, arr]) =>
						`<h3>${title}</h3>${arr.map((x) => `<p>${x}</p>`).join("")}`,
				)
				.join(
					"",
				)}<h3>Credits</h3><p>Design, code and procedural assets: OpenAI gpt-6.1-sol. Three.js · Rapier · AI Hub Session Kit · PeerJS. Star Wars and The Empire Strikes Back belong to their respective owners. This fan tribute is unaffiliated.</p></div>`;
	if (page === "dev" && guest)
		content =
			close +
			'<div class="eyebrow orange">WINGMATE FLIGHT DECK</div><h2>One shared simulation.</h2><p>Your host owns the live balance controls. Open the host’s Developer flight deck to tune this sortie for both pilots.</p><p>Local settings, flight school and connection controls remain available from your pause menu.</p>';
	$("panel").innerHTML = content;
	if (link.mode === "hub")
		$("panel")
			.querySelectorAll(
				"[data-action=title],[data-action=retry],[data-action=online]",
			)
			.forEach((b) => {
				b.remove();
			});
	$("modal").classList.add("show");
	setScreens();
	if (inputKind === "gamepad") focusMenu();
}
function showResult(won) {
	if (["won", "lost"].includes(mode)) return;
	mode = won ? "won" : "lost";
	for (const p of players) p.body?.setLinvel({ x: 0, y: 0, z: 0 }, true);
	closeModal();
	audio.sfx(won ? "win" : "lose");
	link.finish(won, score, {
		rescued,
		kills,
		evacuated,
		seconds: Math.round(elapsed),
	});
	modalPage = "result";
	$("panel").innerHTML =
		`<div class="eyebrow orange">${won ? "ECHO VALLEY / ALL CLEAR" : "ECHO VALLEY / SIGNAL LOST"}</div><h2>${won ? "The rebellion flies on." : "A cold day for the Empire."}</h2><p>${won ? "The last transports vanish into the clouds. Behind you, two very expensive walkers lie tangled in the snow." : "Your sortie is over. The next pilot will know where to aim."}</p><div class="result-stats"><div><strong>${score.toLocaleString()}</strong><small>SORTIE SCORE</small></div><div><strong>${rescued} / 3</strong><small>SURVIVORS SAVED</small></div><div><strong>${evacuated} / 2</strong><small>TRANSPORTS AWAY</small></div></div><div class="menu-stack"><button class="primary" data-action="retry">Fly another sortie</button><button data-action="title">Return to title</button><button data-action="about">Credits & flight report</button></div><div class="panel-foot">${won ? (baseHP > 65 ? "GOLD FLIGHT · THE SHIELD STILL STANDS" : "SILVER FLIGHT · AGAINST THE ODDS") : "TIP: TOW CABLES DO THE HEAVY LIFTING. RESCUES REPAIR THE SHIELD."}</div>`;
	if (link.mode === "hub")
		$("panel")
			.querySelectorAll("[data-action=title],[data-action=retry]")
			.forEach((b) => {
				b.remove();
			});
	$("modal").classList.add("show");
	setScreens();
	if (inputKind === "gamepad") focusMenu();
}

function handleAction(a) {
	if (guest && ["phase", "heal", "god", "freeze", "resetTuning"].includes(a))
		return;
	if (
		link.mode === "hub" &&
		["title", "retry", "launch", "host", "join"].includes(a)
	)
		return;
	if (link.ended) return;
	audio.unlock();
	audio.sfx("ui");
	inputActivity();
	switch (a) {
		case "launch":
			startGame();
			break;
		case "pause":
			pause();
			break;
		case "resume":
			resume();
			break;
		case "close":
			if (previousMode === "title" || mode === "title") closeModal();
			else openModal("pause");
			break;
		case "title":
			backTitle();
			break;
		case "retry":
			if (guest) {
				onlineText = "The host starts the next sortie.";
				openModal("online");
			} else startGame();
			break;
		case "god":
			invincible = !invincible;
			openModal("dev");
			break;
		case "freeze":
			freezeEnemies = !freezeEnemies;
			openModal("dev");
			break;
		case "heal":
			players.forEach((p) => {
				p.hp = 100;
			});
			baseHP = 100;
			say("Fresh power. Try to keep the paint on this time.", "ROGUE TWO");
			break;
		case "phase":
			for (const e of enemies) if (!e.dead) killEnemy(e, false);
			if (phase < 2) beginPhase(phase + 1);
			else {
				transports.forEach((t) => {
					t.z = -116;
					t.escaped = true;
				});
				evacuated = 2;
			}
			openModal("dev");
			break;
		case "resetTuning":
			tuning = { ...defaults };
			invincible = false;
			freezeEnemies = false;
			openModal("dev");
			break;
		case "host":
			onlineText = "Opening flight channel…";
			openModal("online");
			link.host().catch((e) => {
				onlineText = e.message;
				openModal("online");
			});
			break;
		case "join":
			{
				const code = $("roomInput")?.value.trim();
				if (code) {
					onlineText = "Calling " + code + "…";
					link.join(code).catch((e) => {
						onlineText = e.message;
						openModal("online");
					});
				}
			}
			break;
		default:
			openModal(a);
	}
}

document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) handleAction(b.dataset.action);
});
document.addEventListener("pointerover", (e) => {
	const b = e.target.closest("button");
	if (b) {
		document.querySelectorAll("button.focused").forEach((x) => {
			x.classList.remove("focused");
		});
		b.classList.add("focused");
	}
});
document.addEventListener("input", (e) => {
	if (e.target.dataset.key) {
		const obj = e.target.dataset.object === "settings" ? settings : tuning,
			k = e.target.dataset.key;
		obj[k] = Number(e.target.value);
		e.target.nextElementSibling.textContent =
			obj === settings && ["music", "sfx", "shake"].includes(k)
				? Math.round(obj[k] * 100) + "%"
				: obj[k];
		audio.setMusic(settings.music);
		audio.setSfx(settings.sfx);
		saveSettings();
	}
});
document.addEventListener("change", (e) => {
	if (e.target.id === "glyphSelect") settings.glyphs = e.target.value;
	if (e.target.id === "assistSelect")
		settings.assist = e.target.value === "true";
	saveSettings();
	updatePrompts();
});
window.addEventListener("keydown", (e) => {
	if (link.mode === "hub" && link.ended) return;
	if (e.target.matches("input:not([type=range]),select")) return;
	const wasDemo = inputActivity();
	setInputKind("keyboard");
	audio.unlock();
	if (wasDemo) return;
	if (
		["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
			e.code,
		)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (
		(mode === "title" || modalPage) &&
		["ArrowDown", "ArrowUp"].includes(e.code)
	) {
		focusMenu(e.code === "ArrowDown" ? 1 : -1);
		return;
	}
	keys.add(e.code);
	if (e.code === "Escape") {
		if (modalPage) {
			if (mode === "title") closeModal();
			else if (modalPage === "pause") resume();
			else openModal("pause");
		} else pause();
	} else if (e.code === "KeyE") action();
	else if (e.code === "Space" && !modalPage && mode !== "title") roll();
	else if (e.code === "Enter" && mode === "title" && !modalPage) startGame();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	pointer.down = false;
	if (mode === "playing" && !networkMode) pause();
});
$("view").addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	inputActivity();
	if (!modalPage) {
		setInputKind("keyboard");
		cursorActive = true;
		pointer.x = e.clientX;
		pointer.y = e.clientY;
		pointer.active = true;
		$("cursor").style.left = e.clientX + "px";
		$("cursor").style.top = e.clientY + "px";
	}
	setScreens();
});
$("view").addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") return;
	const demo = inputActivity();
	setInputKind("keyboard");
	audio.unlock();
	if (!demo) pointer.down = e.button === 0;
});
window.addEventListener("pointerup", (e) => {
	if (e.pointerType !== "touch") pointer.down = false;
});
$("view").addEventListener(
	"touchstart",
	(e) => {
		e.preventDefault();
		if (inputActivity()) return;
		setInputKind("touch");
		audio.unlock();
		for (const t of e.changedTouches)
			touches.set(t.identifier, {
				x: t.clientX,
				y: t.clientY,
				side: t.clientX < innerWidth / 2 ? "move" : "aim",
			});
	},
	{ passive: false },
);
$("view").addEventListener(
	"touchmove",
	(e) => {
		e.preventDefault();
		for (const t of e.changedTouches) {
			const start = touches.get(t.identifier);
			if (!start) continue;
			const x = clamp((t.clientX - start.x) / 65, -1, 1),
				z = clamp((t.clientY - start.y) / 65, -1, 1);
			if (start.side === "move") Object.assign(touchMove, { x, z });
			else Object.assign(touchAim, { x, z });
		}
	},
	{ passive: false },
);
function endTouch(e) {
	for (const t of e.changedTouches) {
		const s = touches.get(t.identifier);
		if (s?.side === "move") Object.assign(touchMove, { x: 0, z: 0 });
		if (s?.side === "aim") Object.assign(touchAim, { x: 0, z: 0 });
		touches.delete(t.identifier);
	}
}
window.addEventListener("touchend", endTouch);
window.addEventListener("touchcancel", endTouch);
$("touchAction").addEventListener("click", () => {
	setInputKind("touch");
	action();
});

function pollPad(now) {
	const pads = navigator.getGamepads?.() || [],
		pad = [...pads].find((p) => p?.connected);
	if (!pad) return null;
	const b = (i) => !!pad.buttons[i]?.pressed,
		edge = (i) => b(i) && !padState.buttons[i],
		axis = (i) => (Math.abs(pad.axes[i] || 0) > 0.16 ? pad.axes[i] : 0);
	const activity =
		pad.buttons.some((v) => v.pressed) ||
		pad.axes.some((v) => Math.abs(v) > 0.2);
	if (activity) {
		const demo = inputActivity();
		setInputKind("gamepad");
		audio.unlock();
		if (demo) {
			padState.buttons = pad.buttons.map((v) => v.pressed);
			return null;
		}
	}
	if (edge(9) && !(globalThis.AIHub?.active && b(8))) pause();
	if (mode === "title" || modalPage) {
		const dy =
				(b(13) || axis(1) > 0.6 ? 1 : 0) - (b(12) || axis(1) < -0.6 ? 1 : 0),
			dx = (b(15) || axis(0) > 0.6 ? 1 : 0) - (b(14) || axis(0) < -0.6 ? 1 : 0);
		if (activity && dy && now - padState.lastNav > 0.22) {
			focusMenu(dy);
			padState.lastNav = now;
		}
		if (dx && now - padState.lastNav > 0.15) {
			const el = document.activeElement;
			if (el?.type === "range") {
				el.value = clamp(
					Number(el.value) + dx * Number(el.step),
					Number(el.min),
					Number(el.max),
				);
				el.dispatchEvent(new Event("input", { bubbles: true }));
			} else if (el?.tagName === "SELECT") {
				el.selectedIndex = clamp(
					el.selectedIndex + dx,
					0,
					el.options.length - 1,
				);
				el.dispatchEvent(new Event("change", { bubbles: true }));
			}
			padState.lastNav = now;
		}
		if (edge(0)) {
			if (!document.activeElement?.matches("button")) focusMenu(0);
			document.activeElement?.click();
		}
		if (edge(1) && modalPage) {
			if (mode === "title") closeModal();
			else if (modalPage === "pause") resume();
			else openModal("pause");
		}
	} else {
		if (edge(0)) action();
		if (edge(1)) roll();
	}
	padState.buttons = pad.buttons.map((v) => v.pressed);
	return {
		mx: axis(0),
		mz: axis(1),
		rx: axis(2),
		rz: axis(3),
		fire: b(7) || b(2),
		boost: b(6),
	};
}
function readControls(p, pad) {
	if (testInput)
		return {
			mx: 0,
			mz: 0,
			ax: 0,
			az: -1,
			fire: false,
			boost: false,
			actionSeq: seq.action,
			rollSeq: seq.roll,
			...testInput,
		};
	const c = {
		mx: 0,
		mz: 0,
		ax: Math.sin(p?.heading || 0),
		az: -Math.cos(p?.heading || 0),
		fire: false,
		boost: false,
		actionSeq: seq.action,
		rollSeq: seq.roll,
	};
	if (modalPage) return c;
	if (inputKind === "gamepad" && pad) {
		c.mx = pad.mx;
		c.mz = pad.mz;
		c.fire = pad.fire;
		c.boost = pad.boost;
		if (Math.hypot(pad.rx, pad.rz) > 0.2) {
			const n = norm(pad.rx, pad.rz);
			c.ax = n.x;
			c.az = n.z;
		} else if (Math.hypot(c.mx, c.mz) > 0.2) {
			const n = norm(c.mx, c.mz);
			c.ax = n.x;
			c.az = n.z;
		}
	} else if (inputKind === "touch") {
		c.mx = touchMove.x;
		c.mz = touchMove.z;
		c.boost = Math.hypot(c.mx, c.mz) > 0.95;
		c.fire = true;
		if (Math.hypot(touchAim.x, touchAim.z) > 0.1) {
			const n = norm(touchAim.x, touchAim.z);
			c.ax = n.x;
			c.az = n.z;
		} else {
			const e = nearestEnemy(p);
			if (e) {
				const n = norm(e.x - p.x, e.z - p.z);
				c.ax = n.x;
				c.az = n.z;
			}
		}
	} else {
		c.mx =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
		c.mz =
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
		c.fire = pointer.down || keys.has("KeyJ");
		c.boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
		if (pointer.active && p) {
			raycaster.setFromCamera(
				new THREE.Vector2(
					(pointer.x / innerWidth) * 2 - 1,
					(-pointer.y / innerHeight) * 2 + 1,
				),
				camera,
			);
			raycaster.ray.intersectPlane(groundPlane, pointerPoint);
			const n = norm(pointerPoint.x - p.x, pointerPoint.z - p.z);
			c.ax = n.x;
			c.az = n.z;
		} else if (Math.hypot(c.mx, c.mz) > 0.1) {
			const n = norm(c.mx, c.mz);
			c.ax = n.x;
			c.az = n.z;
		}
	}
	return c;
}
function nearestEnemy(p, filter = () => true) {
	return enemies
		.filter((e) => !e.dead && filter(e))
		.sort((a, b) => dist(a, p) - dist(b, p))[0];
}
function demoControls(p) {
	const c = {
		mx: 0,
		mz: 0,
		ax: 0,
		az: -1,
		fire: true,
		boost: false,
		actionSeq: p.actionSeq,
		rollSeq: p.rollSeq,
	};
	if (p.rollCD <= 0 && Math.floor(elapsed) % 9 === 0) c.rollSeq = p.rollSeq + 1;
	if (p.towId !== null) return c;
	if (rescued < 1 && phase === 0) {
		let goal;
		if (p.carrying) goal = { x: 0, z: 92 };
		else goal = pods.find((p) => !p.saved && !p.carried);
		if (goal) {
			const d = dist(p, goal),
				n = norm(goal.x - p.x, goal.z - p.z);
			c.mx = n.x;
			c.mz = n.z;
			c.ax = n.x;
			c.az = n.z;
			c.boost = d > 50;
			if (d < 13 && !p.carrying) c.actionSeq = p.actionSeq + 1;
			return c;
		}
	}
	let target = nearestEnemy(p, (e) => e.type !== "walker");
	if (phase === 1) {
		target = nearestEnemy(p, (e) => e.type === "walker");
		if (target && dist(p, target) < 43) {
			c.actionSeq = p.actionSeq + 1;
			return c;
		}
	}
	if (target) {
		const d = dist(p, target),
			n = norm(target.x - p.x, target.z - p.z);
		c.ax = n.x;
		c.az = n.z;
		if (d > 42) {
			c.mx = n.x;
			c.mz = n.z;
			c.boost = d > 85;
		} else {
			c.mx = -n.z * 0.4;
			c.mz = n.x * 0.4;
		}
	}
	return c;
}
function playerAction(p) {
	if (p.towId !== null) {
		releaseTow(p);
		say("Cable released. Pick your next angle.", "ROGUE TWO");
		return;
	}
	const pod = pods.find((x) => !x.saved && !x.carried && dist(p, x) < 15);
	if (pod && !p.carrying) {
		pod.carried = true;
		pod.mesh.visible = false;
		pod.ring.visible = false;
		p.carrying = pod.id;
		audio.sfx("pickup");
		say("Got them. Bring that survivor back to Echo Base.", "ROGUE TWO");
		return;
	}
	const e = nearestEnemy(
		p,
		(e) => e.type === "walker" && !players.some((q) => q.towId === e.id),
	);
	if (e && dist(p, e) < 46) {
		p.towId = e.id;
		p.towAngle = Math.atan2(p.z - e.z, p.x - e.x);
		p.towProgress = 0;
		p.towTravel = 0;
		audio.sfx("tow");
		say(
			"Cable locked. I have the circle. You keep their heads down.",
			"ROGUE TWO",
		);
	}
}
function releaseTow(p) {
	p.towId = null;
	p.towProgress = 0;
}
function updatePlayer(p, c, dt) {
	const finite = (k, fallback = 0) => (Number.isFinite(c[k]) ? c[k] : fallback);
	c = {
		mx: clamp(finite("mx"), -1, 1),
		mz: clamp(finite("mz"), -1, 1),
		ax: clamp(finite("ax"), -1, 1),
		az: clamp(finite("az", -1), -1, 1),
		fire: c.fire === true,
		boost: c.boost === true,
		actionSeq: finite("actionSeq", p.actionSeq),
		rollSeq: finite("rollSeq", p.rollSeq),
	};
	p.fireCD -= dt;
	p.rollCD = Math.max(0, p.rollCD - dt);
	p.invuln = Math.max(0, p.invuln - dt);
	p.heat = Math.max(0, p.heat - dt * 25);
	if (p.heat < 25) p.overheat = false;
	if (c.actionSeq !== p.actionSeq) {
		p.actionSeq = c.actionSeq;
		playerAction(p);
	}
	if (c.rollSeq !== p.rollSeq) {
		p.rollSeq = c.rollSeq;
		if (p.rollCD <= 0) {
			p.rollCD = 4.5;
			p.invuln = 1;
			p.roll.reset().play();
			audio.sfx("boost");
		}
	}
	let nx = c.mx,
		nz = c.mz,
		n = Math.hypot(nx, nz);
	if (n > 1) {
		nx /= n;
		nz /= n;
	}
	const speed = tuning.speed * (c.boost ? 1.8 : 1) * (p.carrying ? 0.85 : 1);
	p.boost = !!c.boost;
	if (p.towId !== null) {
		const e = enemies.find((e) => e.id === p.towId && !e.dead);
		if (!e) releaseTow(p);
		else {
			const radius = 30;
			p.towAngle += dt * 1.4 * tuning.cableSpeed;
			p.towTravel += dt * 1.4 * tuning.cableSpeed;
			p.towProgress = p.towTravel / (TAU * 1.65);
			const tx = e.x + Math.cos(p.towAngle) * radius,
				tz = e.z + Math.sin(p.towAngle) * radius;
			p.body.setTranslation({ x: tx, y: 7, z: tz }, true);
			p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			p.x = tx;
			p.z = tz;
			c.ax = -Math.sin(p.towAngle);
			c.az = Math.cos(p.towAngle);
			e.tow = p.towProgress;
			if (p.towProgress >= 1) {
				killEnemy(e, true);
				releaseTow(p);
				score += 1200;
				say("That is one way to shorten a walker.", "ROGUE TWO", "happy");
			}
		}
	}
	if (p.towId === null) {
		const v = p.body.linvel();
		p.body.setLinvel(
			{
				x: THREE.MathUtils.lerp(v.x, nx * speed, 1 - Math.exp(-dt * 7)),
				y: 0,
				z: THREE.MathUtils.lerp(v.z, nz * speed, 1 - Math.exp(-dt * 7)),
			},
			true,
		);
	}
	let aim = norm(c.ax, c.az);
	if ((settings.assist || mode === "attract") && c.fire) {
		const target = enemies
			.filter((e) => !e.dead && e.type !== "walker" && dist(e, p) < 160)
			.sort((a, b) => dist(a, p) - dist(b, p))
			.find((e) => {
				const v = norm(e.x - p.x, e.z - p.z);
				return v.x * aim.x + v.z * aim.z > 0.88;
			});
		if (target) aim = norm(target.x - p.x, target.z - p.z);
	}
	p.heading = Math.atan2(aim.x, -aim.z);
	p.mesh.rotation.y = p.heading;
	if (c.fire && p.fireCD <= 0 && !p.overheat) {
		p.fireCD = 0.14;
		p.heat += 9;
		if (p.heat >= 100) p.overheat = true;
		spawnShot(
			p.x + aim.x * 8,
			7,
			p.z + aim.z * 8,
			aim.x,
			aim.z,
			"player",
			p.id,
		);
		if (visualTime - lastShotAudio > 0.1) {
			audio.sfx("laser");
			lastShotAudio = visualTime;
		}
	}
	if (p.carrying && Math.hypot(p.x, p.z - 92) < 23) {
		const pod = pods.find((x) => x.id === p.carrying);
		if (pod) pod.saved = true;
		p.carrying = null;
		rescued++;
		score += 650;
		baseHP = Math.min(100, baseHP + 18);
		p.hp = Math.min(100, p.hp + 35);
		audio.sfx("pickup");
		say(
			"One more seat filled. The shield crew sends its thanks.",
			"ECHO CONTROL",
			"happy",
		);
	}
	p.mixer.update(dt);
	if (!p.roll.isRunning())
		p.craft.rotation.z = THREE.MathUtils.lerp(
			p.craft.rotation.z,
			-(
				p.body.linvel().x * Math.cos(p.heading) +
				p.body.linvel().z * Math.sin(p.heading)
			) * 0.007,
			0.1,
		);
	p.craft.visible = p.invuln < 0.01 || Math.floor(visualTime * 15) % 2 === 0;
	p.craft.userData.flames?.forEach((f) => {
		f.scale.set(1, 1, c.boost ? 2 : 0.8 + Math.sin(visualTime * 30) * 0.12);
	});
}
function spawnShot(x, y, z, dx, dz, owner, ownerId) {
	const n = norm(dx, dz),
		mesh = addMesh(
			new THREE.BoxGeometry(
				owner === "player" ? 0.65 : 1,
				0.6,
				owner === "player" ? 7 : 5,
			),
			owner === "player" ? 0xffce79 : 0xe94e46,
		);
	mesh.position.set(x, y, z);
	mesh.rotation.y = Math.atan2(-n.x, -n.z);
	shots.push({
		id: nextID++,
		x,
		y,
		z,
		dx: n.x,
		dz: n.z,
		life: 1.8,
		owner,
		ownerId,
		mesh,
	});
}
function hurtPlayer(p, damage) {
	if (p.invuln > 0 || invincible || mode === "attract") return;
	p.hp -= damage;
	p.invuln = 0.5;
	shake = 0.5;
	audio.sfx("hit");
	$("damageFlash").style.opacity = 1;
	setTimeout(() => ($("damageFlash").style.opacity = 0), 180);
	if (p.hp <= 0) {
		if (p.carrying) {
			const pod = pods.find((x) => x.id === p.carrying);
			if (pod) {
				pod.carried = false;
				pod.x = p.x;
				pod.z = p.z;
				pod.mesh.position.set(p.x, 2, p.z);
				pod.ring.position.set(p.x, 0.2, p.z);
				pod.mesh.visible = pod.ring.visible = true;
			}
			p.carrying = null;
		}
		releaseTow(p);
		explode(p.x, 7, p.z, 0xf66936, 24);
		if (networkMode && baseHP > 20) {
			baseHP -= 20;
			p.hp = 70;
			p.invuln = 4;
			p.body.setTranslation({ x: 0, y: 7, z: 65 }, true);
			say("A spare speeder. Do not make this a habit.", "ECHO CONTROL");
		} else showResult(false);
	}
}
function killEnemy(e, cable = false) {
	if (e.dead) return;
	e.dead = true;
	kills++;
	score += e.type === "probe" ? 150 : e.type === "ace" ? 2200 : 600;
	world.removeRigidBody(e.body);
	if (e.type === "walker") {
		e.fall = 0.001;
		e.mesh.userData.mixer?.stopAllAction();
		shake = 1;
		explode(e.x, 13, e.z, 0xf7a452, 40);
		const mixer = new THREE.AnimationMixer(e.mesh);
		const a = mixer.clipAction(
			new THREE.AnimationClip("Cable takedown", 2.1, [
				new THREE.NumberKeyframeTrack(
					".rotation[z]",
					[0, 0.4, 1.1, 1.65, 2.1],
					[0, 0.07, -0.25, -1.45, -1.52],
				),
				new THREE.NumberKeyframeTrack(
					".position[y]",
					[0, 1.1, 2.1],
					[0, -1, -4],
				),
			]),
		);
		a.setLoop(THREE.LoopOnce, 1);
		a.clampWhenFinished = true;
		a.play();
		e.fallMixer = mixer;
	} else {
		explode(
			e.x,
			e.y,
			e.z,
			e.type === "ace" ? 0xf66936 : 0xffcf80,
			e.type === "ace" ? 32 : 16,
		);
		e.mesh.visible = false;
	}
	audio.sfx("explosion");
	if (e.type === "ace")
		say(
			"Their ace just folded. Stay with the transports.",
			"ROGUE TWO",
			"happy",
		);
}
function explode(x, y, z, c, count = 16) {
	for (let i = 0; i < count; i++) {
		const mesh = addMesh(
				new THREE.IcosahedronGeometry(0.5 + Math.random() * 1.4, 0),
				i % 3 ? c : 0x314b58,
			),
			body = world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(
						x + (Math.random() - 0.5) * 4,
						y,
						z + (Math.random() - 0.5) * 4,
					)
					.setLinvel(
						(Math.random() - 0.5) * 30,
						Math.random() * 20 + 5,
						(Math.random() - 0.5) * 30,
					)
					.setAngvel({ x: Math.random() * 5, y: 4, z: 2 }),
			);
		world.createCollider(
			RAPIER.ColliderDesc.ball(0.55).setRestitution(0.25),
			body,
		);
		debris.push({ mesh, body, life: 3 + Math.random() * 2 });
	}
	const ring = makeCircle(2, c);
	ring.position.set(x, 0.5, z);
	effects.push({ mesh: ring, life: 0.6, max: 0.6 });
}
function enemyUpdate(e, dt) {
	if (e.dead) {
		e.fallMixer?.update(dt);
		return;
	}
	e.age += dt;
	e.fire -= dt * tuning.enemyRate;
	if (freezeEnemies) return;
	if (e.type === "walker") {
		e.z += dt * tuning.walkerSpeed * (e.tow > 0 ? 0.4 : 1);
		e.mesh.position.z = e.z;
		e.mesh.rotation.y = Math.PI;
		if (e.z > 60) {
			baseHP -= dt * 3.5 * tuning.shieldDrain;
			if (phaseTime % 6 < dt)
				say(
					"That walker is inside the perimeter. Cable it now.",
					"ECHO CONTROL",
					"urgent",
				);
		}
		if (e.fire <= 0) {
			e.fire = 4 + Math.random() * 3;
			const p = players[Math.floor(Math.random() * players.length)];
			if (p) {
				const n = norm(p.x - e.x, p.z - e.z);
				spawnShot(e.x, 7, e.z + 15, n.x, n.z, "enemy", e.id);
			}
		}
	} else if (e.type === "ace") {
		e.x = Math.sin(e.age * 0.36) * 105;
		e.z = -42 + Math.cos(e.age * 0.5) * 42;
		e.y = 11 + Math.sin(e.age) * 2;
		e.mesh.position.set(e.x, e.y, e.z);
		e.mesh.rotation.y = Math.atan2(
			-Math.cos(e.age * 0.36) * 38,
			Math.sin(e.age * 0.5) * 21,
		);
		if (e.fire <= 0) {
			e.fire = 1.25;
			const p = players[0];
			if (p) {
				const n = norm(p.x - e.x, p.z - e.z);
				for (let i = -1; i <= 1; i++) {
					const a = Math.atan2(n.z, n.x) + i * 0.13;
					spawnShot(e.x, 7, e.z, Math.cos(a), Math.sin(a), "enemy", e.id);
				}
			}
		}
		if (phase === 2)
			for (const t of transports)
				if (!t.escaped && dist(e, t) < 45)
					t.hp -= (dt * 1.5 * tuning.enemyDamage) / 10;
	} else {
		e.x = e.originX + Math.sin(e.age * 0.55) * 14;
		e.z = e.originZ + Math.cos(e.age * 0.4) * 11;
		e.mesh.position.set(e.x, e.y, e.z);
		if (e.fire <= 0) {
			e.fire = 3.5 + Math.random() * 2;
			const p = players[Math.floor(Math.random() * players.length)];
			if (p) {
				const n = norm(p.x - e.x, p.z - e.z);
				spawnShot(e.x, 7, e.z, n.x, n.z, "enemy", e.id);
			}
		}
	}
	e.body.setNextKinematicTranslation({
		x: e.x,
		y: e.type === "walker" ? 12 : e.y,
		z: e.z,
	});
	e.mesh.userData.mixer?.update(dt);
}
function updateShots(dt) {
	for (let i = shots.length - 1; i >= 0; i--) {
		const s = shots[i];
		s.life -= dt;
		const speed = s.owner === "player" ? 215 : 64,
			length = speed * dt;
		let hit = false;
		if (s.owner === "player") {
			const ray = new RAPIER.Ray(
				{ x: s.x, y: s.y, z: s.z },
				{ x: s.dx, y: 0, z: s.dz },
			);
			const result = world.castRay(
				ray,
				length + 3,
				true,
				undefined,
				undefined,
				undefined,
				undefined,
				(c) => c.parent()?.userData?.type === "enemy",
			);
			if (result) {
				const id = result.collider.parent().userData.id,
					e = enemies.find((e) => e.id === id && !e.dead);
				if (e) {
					hit = true;
					if (e.type === "walker") {
						if (visualTime - lastShotAudio > 0.2) audio.sfx("hit");
						score += 1;
					} else {
						e.hp -= tuning.damage;
						if (e.hp <= 0) killEnemy(e);
						else if (Math.random() < 0.3) audio.sfx("hit");
					}
				}
			}
		} else {
			for (const p of players) {
				const px = p.x - s.x,
					pz = p.z - s.z,
					t = clamp(px * s.dx + pz * s.dz, 0, length);
				if (Math.hypot(px - s.dx * t, pz - s.dz * t) < 4.2) {
					hurtPlayer(p, tuning.enemyDamage);
					hit = true;
					break;
				}
			}
			if (!hit && phase === 2)
				for (const t of transports) {
					if (!t.escaped && Math.hypot(t.x - s.x, t.z - s.z) < 10) {
						t.hp -= tuning.enemyDamage * 0.6;
						hit = true;
						break;
					}
				}
		}
		s.x += s.dx * length;
		s.z += s.dz * length;
		s.mesh.position.set(s.x, s.y, s.z);
		if (hit || s.life <= 0 || Math.abs(s.x) > 170 || Math.abs(s.z) > 130) {
			dynamicRoot.remove(s.mesh);
			shots.splice(i, 1);
		}
	}
}
function fixedUpdate(dt, controls = null) {
	if (!["playing", "attract"].includes(mode) || guest) return;
	elapsed += dt;
	phaseTime += dt;
	if (mode === "attract") attractTime += dt;
	for (const p of players) {
		let c =
			mode === "attract"
				? demoControls(p)
				: controls && p.id === (networkMode ? link.me : 0)
					? controls
					: remoteInputs.get(p.id);
		if (!c)
			c = {
				mx: 0,
				mz: 0,
				ax: 0,
				az: -1,
				fire: false,
				boost: false,
				actionSeq: p.actionSeq,
				rollSeq: p.rollSeq,
			};
		updatePlayer(p, c, dt);
	}
	for (const e of enemies) enemyUpdate(e, dt);
	world.step();
	physicsTime += dt;
	for (const p of players) {
		const t = p.body.translation();
		const v = p.body.linvel();
		p.x = t.x;
		p.z = t.z;
		p.vx = v.x;
		p.vz = v.z;
		p.mesh.position.set(p.x, 7, p.z);
		if (Math.abs(p.x) > 157 || Math.abs(p.z) > 117) {
			p.body.setTranslation(
				{ x: clamp(p.x, -156, 156), y: 7, z: clamp(p.z, -116, 116) },
				true,
			);
		}
		for (const e of enemies)
			if (
				!e.dead &&
				e.type === "walker" &&
				Math.abs(p.x - e.x) < 10 &&
				Math.abs(p.z - e.z) < 15
			)
				hurtPlayer(p, tuning.enemyDamage * 0.5);
	}
	updateShots(dt);
	for (let i = debris.length - 1; i >= 0; i--) {
		const d = debris[i];
		d.life -= dt;
		const t = d.body.translation(),
			q = d.body.rotation();
		d.mesh.position.set(t.x, t.y, t.z);
		d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
		if (d.life < 1) d.mesh.scale.setScalar(Math.max(0.01, d.life));
		if (d.life <= 0) {
			dynamicRoot.remove(d.mesh);
			world.removeRigidBody(d.body);
			debris.splice(i, 1);
		}
	}
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.life -= dt;
		e.mesh.scale.setScalar(1 + (1 - e.life / e.max) * 25);
		if (e.life <= 0) {
			dynamicRoot.remove(e.mesh);
			effects.splice(i, 1);
		}
	}
	for (const pod of pods)
		if (!pod.saved && !pod.carried) {
			pod.mesh.position.y = 2.4 + Math.sin(elapsed * 2 + pod.id) * 0.5;
			pod.ring.rotation.z += dt;
		}
	if (
		phase === 0 &&
		enemies.filter((e) => e.type === "probe").every((e) => e.dead)
	)
		beginPhase(1);
	if (
		phase === 1 &&
		enemies.filter((e) => e.type === "walker").every((e) => e.dead) &&
		phaseTime > 2
	)
		beginPhase(2);
	if (phase === 2) {
		for (const t of transports) {
			if (t.escaped) continue;
			t.z -= dt * 3.1;
			t.y = 4 + Math.min(17, (90 - t.z) * 0.08);
			t.mesh.position.set(t.x, t.y, t.z);
			t.mesh.userData.mixer?.update(dt);
			if (t.z < -112) {
				t.escaped = true;
				evacuated++;
				score += 1800;
				say(
					evacuated === 1
						? "First transport is clear. One more to go."
						: "Both transports clear. Finish the interceptor.",
					"ECHO CONTROL",
					"happy",
				);
			}
			if (t.hp <= 0 && mode !== "attract") {
				showResult(false);
				return;
			}
		}
		if (evacuated === 2 && enemies.some((e) => e.type === "ace" && e.dead)) {
			if (mode === "attract") {
				if (attractTime > 25) startGame(true);
			} else showResult(true);
		}
	}
	if (baseHP <= 0 && mode !== "attract") showResult(false);
	if (mode === "attract") {
		baseHP = 100;
		players.forEach((p) => {
			p.hp = 100;
		});
		transports.forEach((t) => {
			t.hp = 160;
		});
		if (attractTime > 150) startGame(true);
	}
}
function updateCable() {
	cableLine.visible = false;
	const p = getLocalPlayer() || players.find((p) => p.towId !== null);
	if (!p || p.towId === null) return;
	const e = enemies.find((x) => x.id === p.towId);
	if (!e) return;
	cableLine.visible = true;
	let count = 0;
	const coils = Math.min(p.towProgress * 1.65, 1.65);
	for (let i = 0; i < 140; i++) {
		const t = i / 139,
			a = p.towAngle - coils * TAU * (1 - t),
			r = i < 132 ? 9 : THREE.MathUtils.lerp(9, 30, (i - 132) / 7);
		cablePositions[count++] = e.x + Math.cos(a) * r;
		cablePositions[count++] = 5 + t * 2;
		cablePositions[count++] = e.z + Math.sin(a) * r;
	}
	cableLine.geometry.setDrawRange(0, 140);
	cableLine.geometry.attributes.position.needsUpdate = true;
}
function updateHUD(dt) {
	const p = getLocalPlayer();
	$("pilotLabel").textContent =
		networkMode && p?.id !== link.hostId ? "TWO" : "LEADER";
	$("healthBar").style.width = (p?.hp || 0) + "%";
	$("hp").textContent = Math.max(0, Math.ceil(p?.hp || 0));
	$("heatBar").style.width = (p?.heat || 0) + "%";
	$("heatBar").style.background = p?.overheat ? "#f66936" : "#173341";
	$("score").textContent = String(score).padStart(6, "0");
	$("missionTime").textContent =
		String(Math.floor(elapsed / 60)).padStart(2, "0") +
		":" +
		String(Math.floor(elapsed % 60)).padStart(2, "0");
	$("baseHealth").textContent = Math.max(0, Math.ceil(baseHP)) + "%";
	$("shieldDots").innerHTML = Array.from(
		{ length: 10 },
		(_, i) => `<i class="${i * 10 >= baseHP ? "off" : ""}"></i>`,
	).join("");
	$("rescueStatus").textContent =
		`SURVIVORS ${rescued} / 3${p?.carrying ? " · ABOARD" : ""}`;
	const titles = [
			"Silence the scout probes",
			"Trip the siege walkers",
			"Cover the evacuation",
		],
		labels = ["01 / THE APPROACH", "02 / THE LONG WALK", "03 / THE EVACUATION"];
	$("phaseLabel").textContent = labels[phase];
	$("objectiveTitle").textContent = titles[phase];
	$("objectiveDetail").textContent =
		phase === 0
			? `${enemies.filter((e) => e.type === "probe" && e.dead).length} / 4 probes neutralized`
			: phase === 1
				? `${enemies.filter((e) => e.type === "walker" && e.dead).length} / 2 walkers grounded · use tow cables`
				: `${evacuated} / 2 transports clear · interceptor ${enemies.find((e) => e.type === "ace")?.dead ? "destroyed" : Math.ceil((enemies.find((e) => e.type === "ace")?.hp || 0) / 4.2) + "%"}`;
	radioTime -= dt;
	$("radio").style.opacity = radioTime > 0 ? 1 : 0;
	bannerTime -= dt;
	$("phaseBanner").style.display = bannerTime > 0 ? "block" : "none";
	let context = "";
	if (p && ["playing", "guest"].includes(mode) && !modalPage) {
		const k =
			inputKind === "gamepad" ? (settings.glyphs === "xbox" ? "A" : "✕") : "E";
		if (p.towId !== null) context = `${k} · RELEASE CABLE`;
		else if (p.carrying) context = "RETURN SURVIVOR TO ECHO BASE ↓";
		else if (pods.some((x) => !x.saved && !x.carried && dist(p, x) < 15))
			context = `${k} · RESCUE SURVIVOR`;
		else if (
			nearestEnemy(p, (e) => e.type === "walker") &&
			dist(
				p,
				nearestEnemy(p, (e) => e.type === "walker"),
			) < 46
		)
			context = `${k} · DEPLOY TOW CABLE`;
	}
	$("contextPrompt").style.display = context ? "block" : "none";
	$("contextPrompt").textContent = context;
	$("touchAction").style.display =
		inputKind === "touch" && context && !p?.carrying ? "block" : "none";
	$("touchAction").textContent =
		p?.towId !== null
			? "RELEASE"
			: context.includes("RESCUE")
				? "RESCUE"
				: "TOW";
	$("towMeter").style.display = p?.towId !== null && p ? "block" : "none";
	$("towPercent").textContent = Math.floor((p?.towProgress || 0) * 100) + "%";
	$("towBar").style.width = (p?.towProgress || 0) * 100 + "%";
	if (p && pointer.active && !modalPage) {
		aimMarker.visible = inputKind === "keyboard";
		aimMarker.position.set(pointerPoint.x, 0.5, pointerPoint.z);
	} else aimMarker.visible = false;
	const target = p && nearestEnemy(p);
	reticle.visible = !!target;
	if (target) reticle.position.set(target.x, 0.4, target.z);
	updateMarkers();
	drawRadar();
}
function updateMarkers() {
	const layer = $("worldMarkers");
	if (!layer) return;
	if (!["playing", "guest", "attract"].includes(mode) || modalPage) {
		layer.innerHTML = "";
		return;
	}
	let html = "";
	for (const e of enemies) {
		if (e.dead) continue;
		const pt = new THREE.Vector3(
			e.x,
			e.type === "walker" ? 30 : e.y + 7,
			e.z,
		).project(camera);
		if (pt.z > 1 || Math.abs(pt.x) > 1.05 || Math.abs(pt.y) > 1.05) continue;
		const label =
			e.type === "walker"
				? "SIEGE WALKER"
				: e.type === "ace"
					? "BLACK SQUADRON"
					: "PROBE";
		html += `<div class="target-tag" style="left:${(pt.x + 1) * 50}%;top:${(1 - pt.y) * 50}%"><span>${label}</span><div><i style="width:${Math.max(0, (e.hp / e.maxHP) * 100)}%"></i></div></div>`;
	}
	for (const t of transports) {
		if (t.escaped) continue;
		const pt = new THREE.Vector3(t.x, t.y + 10, t.z).project(camera);
		html += `<div class="target-tag friendly" style="left:${(pt.x + 1) * 50}%;top:${(1 - pt.y) * 50}%"><span>TRANSPORT</span><div><i style="width:${(t.hp / 160) * 100}%"></i></div></div>`;
	}
	layer.innerHTML = html;
}
function drawRadar() {
	const ctx = $("radar").getContext("2d"),
		W = 312,
		H = 260;
	ctx.clearRect(0, 0, W, H);
	ctx.strokeStyle = "#17334118";
	ctx.lineWidth = 1;
	for (let i = 0; i < 6; i++) {
		ctx.beginPath();
		ctx.moveTo((i * W) / 5, 0);
		ctx.lineTo((i * W) / 5, H);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, (i * H) / 5);
		ctx.lineTo(W, (i * H) / 5);
		ctx.stroke();
	}
	const point = (x, z, c, r = 4) => {
		ctx.fillStyle = c;
		ctx.beginPath();
		ctx.arc(
			W / 2 + ((x / 170) * W) / 2,
			H / 2 + ((z / 130) * H) / 2,
			r,
			0,
			TAU,
		);
		ctx.fill();
	};
	point(0, 95, "#173341", 8);
	for (const e of enemies)
		if (!e.dead)
			point(
				e.x,
				e.z,
				e.type === "walker" ? "#de542e" : "#c54b3d",
				e.type === "walker" ? 7 : 4,
			);
	for (const p of pods)
		if (!p.saved && !p.carried) point(p.x, p.z, "#d5992d", 4);
	for (const t of transports) if (!t.escaped) point(t.x, t.z, "#2a9d99", 6);
	players.forEach((p, i) => {
		point(p.x, p.z, i ? "#32aeb9" : "#f66936", 6);
	});
}
function updateCamera(dt) {
	const aspect = innerWidth / innerHeight;
	let size = (mode === "title" ? 100 : 88) / settings.zoom;
	if (inputKind === "touch" && aspect < 1) size = 180;
	camera.left = -size * aspect;
	camera.right = size * aspect;
	camera.top = size;
	camera.bottom = -size;
	camera.updateProjectionMatrix();
	let tx = 0,
		tz = 0;
	if (mode === "playing" || mode === "guest" || mode === "attract") {
		const p = getLocalPlayer();
		if (p) {
			tx = p.x * 0.23;
			tz = p.z * 0.18;
		}
	} else if (mode === "title") {
		tx = 22;
		tz = -3;
	}
	const jitter = shake * settings.shake;
	camera.position.set(
		tx + (Math.random() - 0.5) * jitter,
		155 + (Math.random() - 0.5) * jitter,
		tz + 225,
	);
	camera.lookAt(tx, 0, tz - 5);
	shake = Math.max(0, shake - dt * 1.5);
}
function snapshot() {
	return {
		v: 1,
		round: missionSeed,
		tick: Math.floor(physicsTime * 60),
		mode,
		phase,
		elapsed,
		phaseTime,
		score,
		baseHP,
		rescued,
		kills,
		evacuated,
		radio: {
			text: $("radioText").textContent,
			name: $("radioName").textContent,
			time: radioTime,
		},
		banner: {
			title: $("bannerTitle").textContent,
			small: $("bannerSmall").textContent,
			time: bannerTime,
		},
		players: players.map(
			({
				id,
				x,
				z,
				hp,
				heat,
				overheat,
				heading,
				towId,
				towProgress,
				towAngle,
				carrying,
				boost,
				vx,
				vz,
				rollCD,
				invuln,
			}) => ({
				id,
				x,
				z,
				hp,
				heat,
				overheat,
				heading,
				towId,
				towProgress,
				towAngle,
				carrying,
				boost,
				vx,
				vz,
				rollCD,
				invuln,
			}),
		),
		enemies: enemies.map(({ id, type, x, z, y, hp, maxHP, dead, tow }) => ({
			id,
			type,
			x,
			z,
			y,
			hp,
			maxHP,
			dead,
			tow,
		})),
		transports: transports.map(({ id, x, z, y, hp, escaped }) => ({
			id,
			x,
			z,
			y,
			hp,
			escaped,
		})),
		pods: pods.map(({ id, x, z, saved, carried }) => ({
			id,
			x,
			z,
			saved,
			carried,
		})),
		shots: shots.slice(-40).map(({ id, x, y, z, dx, dz, owner }) => ({
			id,
			x,
			y,
			z,
			dx,
			dz,
			owner,
		})),
	};
}
function applySnapshot(s) {
	if (!s || s.v !== 1) return;
	lastSnapshot = s.tick;
	if (s.round !== lastRemoteRound) {
		lastRemoteRound = s.round;
		mode = "guest";
		closeModal();
		setScreens();
	}
	if (s.radio) {
		$("radioText").textContent = s.radio.text;
		$("radioName").textContent = s.radio.name;
		radioTime = s.radio.time;
	}
	if (s.banner) {
		$("bannerTitle").textContent = s.banner.title;
		$("bannerSmall").textContent = s.banner.small;
		bannerTime = s.banner.time;
	}
	phase = s.phase;
	elapsed = s.elapsed;
	phaseTime = s.phaseTime;
	score = s.score;
	baseHP = s.baseHP;
	rescued = s.rescued;
	kills = s.kills;
	evacuated = s.evacuated;
	const seen = new Set();
	function model(key, type) {
		seen.add(key);
		let m = remoteModels.get(key);
		if (!m) {
			m =
				type === "player"
					? createSpeeder(key.includes(String(link.me)) ? 0xf66936 : 0x35bbc4)
					: type === "walker"
						? createWalker()
						: type === "ace"
							? createAce()
							: type === "probe"
								? createProbe()
								: type === "transport"
									? createTransport()
									: type === "shot"
										? new THREE.Mesh(
												new THREE.BoxGeometry(0.7, 0.7, 6),
												colorMat(0xffb95d),
											)
										: new THREE.Mesh(
												new THREE.CapsuleGeometry(1.6, 2.5, 4, 8),
												colorMat(0xf5cf73),
											);
			remoteModels.set(key, m);
			remoteRoot.add(m);
		}
		m.visible = true;
		return m;
	}
	players = s.players.map((p) => {
		const mesh = model("p" + p.id, "player");
		mesh.position.set(p.x, 7, p.z);
		mesh.rotation.y = p.heading;
		return { ...p, mesh };
	});
	enemies = s.enemies.map((e) => {
		const mesh = model("e" + e.id, e.type);
		mesh.position.set(e.x, e.y, e.z);
		mesh.rotation.y = e.type === "walker" ? Math.PI : 0;
		mesh.visible = !e.dead;
		return { ...e, mesh };
	});
	transports = s.transports.map((t) => {
		const mesh = model("t" + t.id, "transport");
		mesh.position.set(t.x, t.y, t.z);
		mesh.visible = !t.escaped;
		return { ...t, mesh };
	});
	pods = s.pods.map((p) => {
		const mesh = model("r" + p.id, "pod");
		mesh.position.set(p.x, 2, p.z);
		mesh.visible = !p.saved && !p.carried;
		return { ...p, mesh };
	});
	for (const shot of s.shots || []) {
		const mesh = model("s" + shot.id, "shot");
		mesh.position.set(shot.x, shot.y, shot.z);
		mesh.rotation.y = Math.atan2(-shot.dx, -shot.dz);
	}
	for (const [k, m] of remoteModels)
		if (!seen.has(k)) {
			remoteRoot.remove(m);
			remoteModels.delete(k);
		}
	if (mode !== "guest" && !["won", "lost"].includes(mode)) {
		mode = "guest";
		closeModal();
		setScreens();
	}
	if (["won", "lost"].includes(s.mode) && !["won", "lost"].includes(mode))
		showResult(s.mode === "won");
}
link.on("status", (s) => {
	onlineText = s.text;
	if ($("onlineStatus")) $("onlineStatus").textContent = s.text;
	if ($("roomCode")) $("roomCode").textContent = link.room || "";
	$("networkBadge").textContent = link.active
		? `${link.isHost ? "HOST" : "WINGMATE"} · ${s.text}`
		: "";
});
link.on("input", ({ id, input }) => remoteInputs.set(id, input));
link.on("snapshot", (s) => {
	if (guest) applySnapshot(s);
});
link.on("start", (info) => {
	networkMode = true;
	guest = !link.isHost;
	audio.unlock();
	if (guest) {
		clearGame();
		mode = "guest";
		closeModal();
		setScreens();
	} else startGame();
});
link.on("players", (list) => {
	if (!networkMode || guest || !started) return;
	for (const item of list)
		if (item.connected !== false && !players.some((p) => p.id === item.id))
			makePlayer(item.id, 20, 60);
	for (const p of [...players])
		if (!list.some((i) => i.id === p.id)) {
			dynamicRoot.remove(p.mesh);
			world.removeRigidBody(p.body);
			players = players.filter((q) => q !== p);
		}
});
link.on("end", (info) => {
	if (mode === "playing" || mode === "guest") showResult(info?.won || false);
	keys.clear();
	pointer.down = false;
	testInput = null;
	audio.stop(true);
});
link.on("timeup", () => {
	if (link.isHost) showResult(evacuated === 2);
	audio.stop(true);
});
link.on("result", (r) => {
	if (guest) {
		score = r.scores?.[link.me] ?? score;
		showResult(r.won);
	}
});
link.on("disconnect", () => {
	if (guest) {
		const reason = link.status;
		backTitle();
		onlineText = reason;
		openModal("online");
		setScreens();
	}
});

async function init() {
	await RAPIER.init();
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xb7d6dc);
	scene.fog = new THREE.Fog(0xb7d6dc, 300, 650);
	camera = new THREE.OrthographicCamera(-180, 180, 112, -112, 0.1, 1200);
	const webgl = new URLSearchParams(location.search).has("webgl");
	renderer = new THREE.WebGPURenderer({
		canvas: $("view"),
		antialias: true,
		forceWebGL: webgl,
	});
	await renderer.init();
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
	renderer.setSize(innerWidth, innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.18;
	land = createWorld(scene);
	scene.add(dynamicRoot, remoteRoot);
	clearGame();
	makePlayer(0, -25, 18);
	spawnEnemy("walker", 38, -5);
	spawnEnemy("walker", 95, -65);
	spawnEnemy("probe", -55, -25);
	setInputKind(inputKind);
	window.addEventListener("resize", () => {
		renderer.setSize(innerWidth, innerHeight);
		updateCamera(0);
	});
	await link.initHub();
	link.ready();
	if (link.mode === "hub") {
		networkMode = true;
		guest = !link.isHost;
		mode = "waiting";
		$("titleScreen").classList.remove("show");
	}
	updateCamera(0);
	await renderer.renderAsync(scene, camera);
	$("boot").style.display = "none";
	clock = new THREE.Clock();
	window.__game = {
		hold: (value) => (testHold = value),
		getState: () => ({
			...snapshot(),
			mode,
			modalPage,
			renderer: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
			physics: "Rapier 0.19.3",
			inputKind,
			settings: { ...settings },
			tuning: { ...tuning },
			audio: audio.getSnapshot(),
			network: {
				mode: link.mode,
				isHost: link.isHost,
				me: link.me,
				players: link.players,
				active: link.active,
			},
			bodyCount: world.bodies.len(),
			lastSnapshot,
		}),
		step: (seconds, c = null) => {
			for (let i = 0; i < Math.ceil(seconds * 60); i++)
				fixedUpdate(1 / 60, c || readControls(getLocalPlayer(), null));
			updateHUD(0);
			return snapshot();
		},
		input: (c) => (testInput = c),
		action: () => action(),
		roll: () => roll(),
		teleport: (x, z, id = 0) => {
			const p = players.find((p) => p.id === id) || players[0];
			if (p?.body) {
				p.x = x;
				p.z = z;
				p.body.setTranslation({ x, y: 7, z }, true);
				p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			}
		},
		idle: (seconds) => {
			idleTime += seconds;
		},
		dev: (op) => handleAction(op),
		project: (x, y, z) => {
			const p = new THREE.Vector3(x, y, z).project(camera);
			return {
				x: ((p.x + 1) / 2) * innerWidth,
				y: ((1 - p.y) / 2) * innerHeight,
			};
		},
		audioTest: async () => {
			const ctx = new OfflineAudioContext(2, 48000 * 10, 48000);
			return await renderAudioTest(ctx);
		},
		unlock: () => audio.unlock(),
		getLink: () => link,
	};
	renderer.setAnimationLoop(frame);
}
function frame() {
	if (crashed) return;
	try {
		const dt = Math.min(clock.getDelta(), 0.05);
		visualTime += dt;
		const pad = pollPad(visualTime);
		if (mode === "title" && !modalPage && !networkMode) {
			idleTime += dt;
			if (idleTime >= 10) startGame(true);
		}
		const controls = readControls(getLocalPlayer(), pad);
		if (networkMode) {
			if (guest) link.sendInput(controls);
			else if (!link.server) remoteInputs.set(link.me, controls);
		}
		if (!guest && !testHold) {
			simAccumulator += dt;
			while (simAccumulator >= 1 / 60) {
				fixedUpdate(1 / 60, controls);
				simAccumulator -= 1 / 60;
			}
			if (networkMode && link.isHost) link.sendSnapshot(snapshot());
		} else
			for (const model of remoteModels.values())
				model.userData.mixer?.update(dt);
		if (mode === "title") {
			for (const e of enemies) e.mesh.userData.mixer?.update(dt);
		}
		land.update(dt, visualTime);
		if (land.shieldMaterial)
			land.shieldMaterial.opacity = 0.06 + (baseHP / 100) * 0.09;
		updateCable();
		updateCamera(dt);
		updateHUD(dt);
		const p = getLocalPlayer();
		audio.update(dt, {
			speed: p ? Math.hypot(p.vx || 0, p.vz || 0) : 0,
			boost: p?.boost || false,
			phase,
			active: ["playing", "guest", "attract"].includes(mode),
		});
		renderer.render(scene, camera);
	} catch (e) {
		crashed = true;
		console.error(e);
		$("boot").style.display = "flex";
		$("bootError").textContent = "Flight system error: " + e.message;
	}
}
init().catch((e) => {
	console.error(e);
	$("bootError").textContent = "Flight systems could not start: " + e.message;
});
