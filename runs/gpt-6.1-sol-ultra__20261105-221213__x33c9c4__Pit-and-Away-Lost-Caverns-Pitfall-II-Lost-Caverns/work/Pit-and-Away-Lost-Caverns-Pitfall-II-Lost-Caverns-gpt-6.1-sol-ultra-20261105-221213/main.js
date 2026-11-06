import * as THREE from "three";
import creditData from "./credits.js";
import { WebGPURenderer, MeshBasicNodeMaterial } from "three/webgpu";
import { normalWorld, vec3, materialColor } from "three/tsl";
import RAPIER from "rapier";
import { buildWorld, makeExplorer, makeCreature, makePickup } from "./world.js";
import { CavernAudio } from "./audio.js";
import { ExpeditionNetwork } from "./hub.js";

const $ = (id) => document.getElementById(id);
const TITLE = "Pit & Away: Lost Caverns";
const defaults = {
	speed: 6.4,
	jump: 10.8,
	gravity: 23,
	swimSpeed: 5.2,
	balloonSpeed: 3.5,
	enemySpeed: 1,
	penalty: 500,
};
let tuning = { ...defaults },
	settings = { music: 0.1, sfx: 0.65, glyphs: "playstation", assist: false };
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("pit-away-settings") || "{}"),
	);
} catch {}
const saveSettings = () => {
	try {
		localStorage.setItem("pit-away-settings", JSON.stringify(settings));
	} catch {}
};
const audio = new CavernAudio();
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
let scene,
	camera,
	renderer,
	world,
	environment,
	hero,
	friend,
	controller,
	body,
	collider,
	network;
let mode = "title",
	modalPage = "",
	returnPage = "",
	elapsed = 0,
	worldTime = 0,
	accumulator = 0,
	lastTime = 0,
	lastInput = performance.now(),
	inputDevice = "keyboard";
let keys = new Set(),
	pressed = new Set(),
	padPrevious = [],
	padIndex = -1,
	touch = { x: 0, y: 0, jump: false },
	touchOrigin = null;
let manual = false,
	testInput = null,
	dev = { invulnerable: false, noclip: false, showPhysics: false },
	physicsLines,
	physicsMat;
let playing = false,
	attract = false,
	attractTime = 0,
	toastTimer = 0,
	sadTimer = 0,
	netTimer = 0,
	lastHud = 0,
	pendingJump = false;
const physicsFor = new WeakMap(),
	actorPhysics = new Set(),
	actorColliders = new Set(),
	remoteInputs = new Map();
let renderFrames = 0;
let stats,
	player,
	items,
	enemies,
	checkpoints,
	balloon,
	balloonMesh,
	exitMesh,
	particles = [],
	remoteInput = { x: 0, y: 0, jump: false },
	remotePlayer = null;
let remoteHeroState = null,
	runStarted = 0,
	focusIndex = 0,
	menuAxis = 0,
	activeContext = "";
const cameraTarget = new THREE.Vector3(14, 4.5, 0),
	target = new THREE.Vector3();
const platforms = [
	[-5, 11.8, 0],
	[16.2, 23.05, 0],
	[24.95, 31, 0],
	[12, 32, -12],
	[36.3, 48.05, -12],
	[49.95, 55, -12],
	[42, 48.9, -24],
	[77, 79.05, -24],
	[80.95, 86, -24],
	[48, 78, -29],
	[77, 91, -34],
	[90, 117, -5],
];
const ladders = [
	{ x: 24, top: 0, bottom: -12 },
	{ x: 49, top: -12, bottom: -24 },
	{ x: 80, top: -24, bottom: -34 },
];
const itemDefinitions = [
	{ kind: "gold", x: 7, y: 1 },
	{ kind: "gold", x: 18.8, y: 1 },
	{ kind: "gold", x: 28, y: 1 },
	{ kind: "gold", x: 20, y: -11 },
	{ kind: "gold", x: 29, y: -11 },
	{ kind: "gold", x: 38.5, y: -11 },
	{ kind: "researcher", id: "mina", x: 45.5, y: -12 },
	{ kind: "gold", x: 46.4, y: -23 },
	{ kind: "gold", x: 54, y: -25 },
	{ kind: "gold", x: 60, y: -23 },
	{ kind: "gold", x: 65.5, y: -26 },
	{ kind: "gold", x: 71.5, y: -23 },
	{ kind: "cat", id: "marmalade", x: 77.8, y: -24 },
	{ kind: "gold", x: 82.5, y: -33 },
	{ kind: "gold", x: 85, y: -24 },
	{ kind: "gold", x: 87, y: -15 },
	{ kind: "gold", x: 95, y: -4 },
	{ kind: "diamond", id: "sunstone", x: 105, y: -3.6 },
];
const checkpointDefs = [
	{ x: 3, y: 0, name: "Fernlight Landing" },
	{ x: 22, y: -12, name: "Echo Galleries" },
	{ x: 47, y: -24, name: "The Flooded Archive" },
	{ x: 80.8, y: -34, name: "The Updraft" },
	{ x: 93, y: -5, name: "Sunstone Vault" },
];
const enemyDefs = [
	{ type: "frog", x: 10, y: 0.05, range: 2.1, speed: 1.3 },
	{ type: "condor", x: 20.5, y: 3.7, range: 3, speed: 1.1 },
	{ type: "bat", x: 26, y: -4.7, range: 3.2, speed: 1.2 },
	{ type: "scorpion", x: 28, y: -11.9, range: 2.4, speed: 0.9 },
	{ type: "bat", x: 40, y: -9, range: 3.3, speed: 1.3 },
	{ type: "frog", x: 45, y: -11.9, range: 1.2, speed: 1.7 },
	{ type: "eel", x: 57, y: -25, range: 3, speed: 1.1 },
	{ type: "eel", x: 68, y: -24.5, range: 3.1, speed: 1.4 },
	{ type: "scorpion", x: 87, y: -33.9, range: 2.4, speed: 1 },
	{ type: "bat", x: 85, y: -20, range: 3, speed: 1.4 },
	{ type: "bat", x: 87, y: -10.5, range: 2.5, speed: 1.6 },
	{ type: "scorpion", x: 99, y: -4.9, range: 2.2, speed: 0.8 },
];

function material(color, opts = {}) {
	return new THREE.MeshStandardMaterial({
		color,
		roughness: 1,
		flatShading: true,
		...opts,
	});
}
const inkMat = new THREE.MeshBasicMaterial({
	color: 0x102930,
	side: THREE.BackSide,
});
function mesh(geometry, mat, x = 0, y = 0, z = 0, ink = false) {
	const m = new THREE.Mesh(geometry, mat);
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	scene.add(m);
	if (ink) {
		const line = new THREE.Mesh(geometry, inkMat);
		line.scale.setScalar(1.045);
		m.add(line);
	}
	return m;
}
function applyCelInk() {
	const cache = new Map();
	scene.traverse((o) => {
		if (
			!o.isMesh ||
			!o.material?.isMeshStandardMaterial ||
			o.material.transparent
		)
			return;
		const old = o.material;
		if (!cache.has(old)) {
			const m = new MeshBasicNodeMaterial({ color: old.color, side: old.side });
			const light = normalWorld
				.dot(vec3(-0.3, 0.65, 0.8).normalize())
				.clamp(0, 1)
				.mul(3)
				.floor()
				.div(3)
				.mul(0.52)
				.add(0.48);
			m.colorNode = materialColor
				.mul(light)
				.add(
					vec3(old.emissive.r, old.emissive.g, old.emissive.b).mul(
						old.emissiveIntensity || 0,
					),
				);
			cache.set(old, m);
		}
		o.material = cache.get(old);
	});
}
function makeTerrain() {
	const stone = material(0x9f865b),
		rim = material(0xd7b47a),
		moss = material(0x48705b),
		dark = material(0x536855);
	for (const [a, b, y] of platforms) {
		world.createCollider(
			RAPIER.ColliderDesc.cuboid((b - a) / 2, 0.6, 1).setTranslation(
				(a + b) / 2,
				y - 0.6,
				0,
			),
		);
		mesh(
			new THREE.BoxGeometry(b - a, 1.2, 2.8),
			stone,
			(a + b) / 2,
			y - 0.6,
			-0.2,
			true,
		);
		mesh(
			new THREE.BoxGeometry(b - a, 0.13, 2.94),
			rim,
			(a + b) / 2,
			y - 0.04,
			-0.16,
		);
		for (let x = a + 0.7; x < b; x += 1.7) {
			let rock = mesh(
				new THREE.DodecahedronGeometry(0.65, 0),
				x % 3 > 1 ? moss : dark,
				x,
				y - 0.95,
				-0.1,
			);
			rock.scale.set(1.5, 0.7, 1);
			rock.rotation.z = x;
		}
		for (let x = a + 0.35; x < b; x += 1.35)
			mesh(new THREE.BoxGeometry(0.035, 0.6, 0.02), dark, x, y - 0.4, 1.22);
	}
	const wood = material(0xd9ae69),
		rung = material(0xf2ce8a);
	for (const l of ladders) {
		for (const x of [l.x - 0.42, l.x + 0.42])
			mesh(
				new THREE.CylinderGeometry(0.065, 0.065, l.top - l.bottom, 6),
				wood,
				x,
				(l.top + l.bottom) / 2,
				-0.23,
			);
		for (let y = l.bottom + 0.35; y < l.top + 0.4; y += 0.56)
			mesh(new THREE.BoxGeometry(0.95, 0.09, 0.14), rung, l.x, y, -0.18);
	}
	// Stone walls keep the river and return shaft readable and traversable.
	world.createCollider(
		RAPIER.ColliderDesc.cuboid(0.5, 3.5, 1).setTranslation(48.2, -27.6, 0),
	);
	world.createCollider(
		RAPIER.ColliderDesc.cuboid(0.4, 3.7, 1).setTranslation(78.1, -28.8, 0),
	);
	world.createCollider(
		RAPIER.ColliderDesc.cuboid(0.4, 1.5, 1).setTranslation(-5.5, -0.7, 0),
	);
}
function addLabel(text, x, y, size = 0.5, color = "#e9cb8b") {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 128;
	const ctx = c.getContext("2d");
	ctx.fillStyle = color;
	ctx.font = "bold 42px Georgia";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, 512, 64);
	const tex = new THREE.CanvasTexture(c);
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(size * 8, size),
		new THREE.MeshBasicMaterial({
			map: tex,
			transparent: true,
			depthWrite: false,
		}),
	);
	m.position.set(x, y, 0.5);
	scene.add(m);
	return m;
}
function createObjects() {
	items = itemDefinitions.map((def, i) => {
		const visual = makePickup(def.kind);
		scene.add(visual);
		visual.position.set(def.x, def.y, 0);
		return { ...def, i, visual, collected: false };
	});
	enemies = enemyDefs.map((def, i) => {
		const visual = makeCreature(def.type);
		scene.add(visual);
		return { ...def, visual, phase: i * 1.71, px: def.x, py: def.y };
	});
	checkpoints = checkpointDefs.map((def, i) => {
		const g = new THREE.Group();
		scene.add(g);
		g.position.set(def.x, def.y + 0.03, 0.08);
		const base = new THREE.Mesh(
			new THREE.CylinderGeometry(0.6, 0.8, 0.15, 8),
			material(0x425b4d),
		);
		base.rotation.x = 0;
		g.add(base);
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.43, 0.06, 6, 16),
			material(0x9ce8c6, { emissive: 0x38665b, emissiveIntensity: 1 }),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.13;
		g.add(ring);
		const pole = new THREE.Mesh(
			new THREE.CylinderGeometry(0.045, 0.045, 1.7, 6),
			material(0xac956a),
		);
		pole.position.set(-0.6, 0.8, -0.6);
		g.add(pole);
		const flag = new THREE.Mesh(
			new THREE.BoxGeometry(0.65, 0.4, 0.045),
			material(0xe3b256),
		);
		flag.position.set(-0.26, 1.5, -0.6);
		g.add(flag);
		return { ...def, visual: g, ring, index: i };
	});
	balloonMesh = new THREE.Group();
	scene.add(balloonMesh);
	const bulb = new THREE.Mesh(
		new THREE.SphereGeometry(1.02, 12, 8),
		material(0xf0b85f),
	);
	bulb.scale.y = 1.2;
	balloonMesh.add(bulb);
	const stripe = new THREE.Mesh(
		new THREE.SphereGeometry(1.03, 12, 8, 0.0, Math.PI * 0.23),
		material(0xf8dca2),
	);
	stripe.scale.y = 1.2;
	balloonMesh.add(stripe);
	for (let i = 0; i < 3; i++) {
		const rope = new THREE.Mesh(
			new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4),
			material(0xbda57a),
		);
		rope.position.set((i - 1) * 0.33, -1.15, 0);
		balloonMesh.add(rope);
	}
	const grip = new THREE.Mesh(
		new THREE.BoxGeometry(0.8, 0.12, 0.2),
		material(0x6e6241),
	);
	grip.position.y = -1.65;
	balloonMesh.add(grip);
	exitMesh = new THREE.Group();
	exitMesh.position.set(113, -5, 0);
	scene.add(exitMesh);
	const portalMat = material(0xecd2a0);
	for (const x of [-1.35, 1.35]) {
		const p = new THREE.Mesh(new THREE.BoxGeometry(0.65, 4, 1.1), portalMat);
		p.position.set(x, 2, -0.5);
		exitMesh.add(p);
	}
	const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 1.3), portalMat);
	top.position.set(0, 4, -0.5);
	exitMesh.add(top);
	const glow = new THREE.Mesh(
		new THREE.PlaneGeometry(2, 3.5),
		new THREE.MeshBasicMaterial({
			color: 0x7ed8bd,
			transparent: true,
			opacity: 0.2,
			side: THREE.DoubleSide,
		}),
	);
	glow.position.set(0, 1.8, -0.9);
	exitMesh.add(glow);
	addLabel("FERNLIGHT LANDING", 10, 7, 0.6);
	addLabel("MIND THE GAP", 14, 1.8, 0.34);
	addLabel("ECHO GALLERIES", 34, -5.5, 0.55);
	addLabel("FLOODED ARCHIVE", 64, -16.8, 0.6);
	addLabel("THE UPDRAFT", 84, -29.8, 0.48);
	addLabel("SUNSTONE VAULT", 102, 1, 0.6);
	addLabel("WAY OUT", 113, -0.1, 0.32);
}
function newPlayer(x = 3, y = 0.04, id = 0) {
	return {
		id,
		x,
		y,
		vx: 0,
		vy: 0,
		grounded: false,
		coyote: 0,
		jumpBuffer: 0,
		jumpHeld: false,
		mode: "walk",
		ladder: -1,
		face: 1,
		invuln: 1,
		checkpoint: 0,
		balloonLock: 0,
		action: "idle",
	};
}
function createActorPhysics(p) {
	const b = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased()
			.setTranslation(p.x, p.y + 0.8, 0)
			.lockRotations(),
	);
	const c = world.createCollider(
		RAPIER.ColliderDesc.capsule(0.48, 0.28).setFriction(0),
		b,
	);
	const k = world.createCharacterController(0.025);
	k.enableSnapToGround(0.15);
	k.enableAutostep(0.25, 0.2, true);
	const data = { body: b, collider: c, controller: k };
	physicsFor.set(p, data);
	actorPhysics.add(data);
	actorColliders.add(c.handle);
	return data;
}
function configureSeats() {
	if (!network) return;
	player.id = network.players[0]?.id ?? 0;
	if (network.role === "host" && network.players.length > 1) {
		remotePlayer = newPlayer(4.2, 0.04, network.players[1].id);
		createActorPhysics(remotePlayer);
	}
}
function resetGame() {
	for (const old of actorPhysics) {
		world.removeCharacterController(old.controller);
		world.removeRigidBody(old.body);
	}
	actorPhysics.clear();
	actorColliders.clear();
	player = newPlayer();
	Object.assign({});
	const phys = createActorPhysics(player);
	body = phys.body;
	collider = phys.collider;
	controller = phys.controller;
	stats = {
		score: 4000,
		gold: 0,
		found: { mina: false, marmalade: false, sunstone: false },
		deaths: 0,
		time: 0,
		checkpoints: 1,
		visited: { walk: true, climb: false, swim: false, float: false },
		finished: false,
	};
	items.forEach((it) => {
		it.collected = false;
		it.visual.visible = true;
	});
	checkpoints.forEach((c, i) =>
		c.ring.material.color.setHex(i ? 0x6fa593 : 0xeac35f),
	);
	balloon = { x: 85, y: -30.8, attached: false, ownerId: null, cooldown: 0 };
	remotePlayer = null;
	remoteHeroState = null;
	remoteInputs.clear();
	configureSeats();
	body.setTranslation({ x: 3, y: 0.84, z: 0 }, true);
	body.setNextKinematicTranslation({ x: 3, y: 0.84, z: 0 });
	particles.forEach((p) => scene.remove(p.mesh));
	particles = [];
	elapsed = 0;
	runStarted = performance.now();
	sadTimer = 0;
	updateHUD();
}
function startGame() {
	if (network?.role === "guest" && network.running) {
		playing = true;
		mode = "play";
		attract = false;
		hideModal();
		$("title").classList.add("hidden");
		$("hud").classList.remove("hidden");
		$("topline").classList.add("hidden");
		audio.start();
		return;
	}
	resetGame();
	playing = true;
	mode = "play";
	attract = false;
	manual = false;
	hideModal();
	$("title").classList.add("hidden");
	$("attract").classList.add("hidden");
	$("hud").classList.remove("hidden");
	$("topline").classList.add("hidden");
	audio.start();
	audio.voice(4);
	toast("Well, down we go.", "FIND MINA, MARMALADE & THE SUNSTONE");
	cameraTarget.set(8, 4, 0);
	network?.ready?.();
}
function toTitle() {
	if (network?.hub) return;
	network?.solo();
	if (remotePlayer) {
		const old = physicsFor.get(remotePlayer);
		if (old) {
			world.removeCharacterController(old.controller);
			world.removeRigidBody(old.body);
			actorPhysics.delete(old);
			actorColliders.delete(old.collider.handle);
		}
	}
	remotePlayer = null;
	remoteHeroState = null;
	remoteInputs.clear();
	playing = false;
	attract = false;
	mode = "title";
	hideModal();
	$("hud").classList.add("hidden");
	$("title").classList.remove("hidden");
	$("topline").classList.remove("hidden");
	$("attract").classList.add("hidden");
	$("context").classList.add("hidden");
	$("touch-action").style.display = "none";
	lastInput = performance.now();
	cameraTarget.set(16, 4.5, 0);
	updatePrompts();
}
function startAttract() {
	if (network?.hub) return;
	resetGame();
	playing = true;
	mode = "attract";
	attract = true;
	attractTime = 0;
	$("title").classList.add("hidden");
	$("topline").classList.add("hidden");
	$("hud").classList.add("hidden");
	$("attract").classList.remove("hidden");
}
function activity(device = "keyboard") {
	lastInput = performance.now();
	if (inputDevice !== device) {
		inputDevice = device;
		updatePrompts();
	}
	if (attract) {
		toTitle();
		return true;
	}
	return false;
}
function toast(message, caption = "", seconds = 3.5) {
	$("toast").innerHTML =
		`${message}${caption ? `<small>${caption}</small>` : ""}`;
	$("toast").classList.remove("hidden");
	toastTimer = seconds;
}
function burst(x, y, color = 0xefbd62, n = 14) {
	for (let i = 0; i < n; i++) {
		let m = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.07 + Math.random() * 0.05),
			new THREE.MeshBasicMaterial({ color, transparent: true }),
		);
		m.position.set(x, y, 0.4);
		scene.add(m);
		particles.push({
			mesh: m,
			vx: (Math.random() - 0.5) * 5,
			vy: Math.random() * 4,
			life: 0.7 + Math.random() * 0.5,
			max: 1.2,
		});
	}
}
function damage(p = player) {
	const phys = physicsFor.get(p);
	const body = phys?.body;
	if (attract || dev.invulnerable || p.invuln > 0) return;
	const c = checkpointDefs[p.checkpoint];
	stats.score = Math.max(0, stats.score - tuning.penalty);
	stats.deaths++;
	p.x = c.x;
	p.y = c.y + 0.1;
	p.vx = 0;
	p.vy = 0;
	p.mode = "walk";
	p.ladder = -1;
	p.invuln = 2;
	if (balloon.ownerId === p.id) {
		balloon.attached = false;
		balloon.cooldown = 2;
		balloon.ownerId = null;
	}
	body?.setTranslation({ x: p.x, y: p.y + 0.8, z: 0 }, true);
	body?.setNextKinematicTranslation({ x: p.x, y: p.y + 0.8, z: 0 });
	sadTimer = 6;
	audio.effect("hit");
	$("flash").style.opacity = ".25";
	setTimeout(() => ($("flash").style.opacity = "0"), 140);
	toast(
		"A small setback. A splendid view.",
		"BACK TO YOUR LAST CAMP • −" + tuning.penalty + " POINTS",
		2.4,
	);
}
function collect(it) {
	if (it.collected) return;
	it.collected = true;
	it.visual.visible = false;
	if (it.kind === "gold") {
		stats.gold++;
		stats.score += 5000;
		audio.effect("gold");
		burst(it.x, it.y, 0xefbd62);
	} else {
		stats.found[it.id] = true;
		stats.score += it.kind === "diamond" ? 20000 : 10000;
		audio.effect("rescue");
		audio.voice(it.i);
		burst(it.x, it.y + 1, 0x8ee3c0, 30);
		const text = {
			mina: ["Mina found!", "“THE GOOD NEWS? I FOUND THE RIVER.”"],
			marmalade: ["Marmalade rescued!", "BRAVE CAT. QUESTIONABLE NAVIGATION."],
			sunstone: [
				"The Sunstone is ours!",
				"TWO FRIENDS. ONE SHINY STONE. FIND THE WAY OUT.",
			],
		}[it.id];
		toast(...text, 4.5);
	}
	sadTimer = 0;
	updateHUD();
}
function zoneFor(p) {
	if (p.x >= 90 && p.y > -10) return 4;
	if (p.y < -29 || (p.x > 80 && p.y < -8)) return 3;
	if (p.y < -18) return 2;
	if (p.y < -5) return 1;
	return 0;
}
function updateHUD() {
	if (!stats) return;
	const f = stats.found;
	$("score").textContent = Math.round(stats.score).toLocaleString("en-US");
	$("relic-hud").innerHTML =
		`<span class="${f.mina ? "found" : "waiting"}">${f.mina ? "◆" : "◇"} MINA</span><span class="${f.marmalade ? "found" : "waiting"}">${f.marmalade ? "◆" : "◇"} CAT</span><span class="${f.sunstone ? "found" : "waiting"}">${f.sunstone ? "◆" : "◇"} STONE</span>`;
	const z = zoneFor(player);
	$("zone").textContent = checkpointDefs[z].name;
	let descriptions = [
		["ENTRY 01 / A LEAP OF FAITH", "Follow the gold. Find the ladder down."],
		[
			"ENTRY 02 / FAMILIAR FACES",
			f.mina
				? "Mina is safe. The river lies below."
				: "Mina’s waiting beyond the broken ledge.",
		],
		[
			"ENTRY 03 / TAKE THE PLUNGE",
			f.marmalade
				? "Marmalade is safe. Find the balloon below."
				: "Swim through the archive. Find Marmalade.",
		],
		[
			"ENTRY 04 / A LIFT, PLEASE",
			"Catch a balloon. Ride the shaft to the light.",
		],
		[
			"ENTRY 05 / ALL THAT GLITTERS",
			Object.values(f).every(Boolean)
				? "Everyone’s here. Head for the way out."
				: f.sunstone
					? "Someone’s still below. Check your map."
					: "Claim the Sunstone. Then find the way out.",
		],
	];
	$("mission-label").textContent = descriptions[z][0];
	$("mission").textContent = descriptions[z][1];
}
function controlsGlyph(name) {
	let pad = inputDevice === "gamepad";
	const ps = settings.glyphs === "playstation";
	const map = pad
		? {
				jump: ps ? "×" : "A",
				interact: ps ? "□" : "X",
				map: ps ? "△" : "Y",
				pause: "☰",
				move: "L",
				climb: "L",
				release: ps ? "×" : "A",
			}
		: {
				jump: "SPACE",
				interact: "E",
				map: "M",
				pause: "ESC",
				move: "A D",
				climb: "W S",
				release: "SPACE",
			};
	return `<span class="key ${pad ? "round" : ""}">${map[name] || name}</span>`;
}
function updatePrompts() {
	const pad = inputDevice === "gamepad";
	$("controls").innerHTML =
		`<span>${controlsGlyph("move")}Move</span><span>${controlsGlyph("jump")}Jump</span><span>${controlsGlyph("climb")}Climb / swim</span>`;
	if (modalPage === "guide") renderModal("guide");
}
function readPad() {
	if (network?.hub && (network.ended || network.isServer))
		return { x: 0, y: 0, jump: false };
	let pads = [];
	try {
		pads = Array.from(navigator.getGamepads?.() || []);
	} catch {}
	const pad = pads.find((p) => p?.connected);
	let result = { x: 0, y: 0, jump: false };
	if (!pad) return result;
	padIndex = pad.index;
	const b = pad.buttons.map((b) => b.pressed);
	const edge = (i) => b[i] && !padPrevious[i];
	let x = pad.axes[0] || 0,
		y = -(pad.axes[1] || 0);
	if (b[14]) x = -1;
	if (b[15]) x = 1;
	if (b[12]) y = 1;
	if (b[13]) y = -1;
	x = Math.abs(x) > 0.18 ? x : 0;
	y = Math.abs(y) > 0.18 ? y : 0;
	if (x || y || b.some(Boolean)) {
		const exited = activity("gamepad");
		if (exited) {
			padPrevious = b;
			return result;
		}
	}
	if (mode === "title" || modalPage) {
		let axis = Math.abs(y) > 0.5 ? Math.sign(y) : 0;
		const now = performance.now();
		if (axis && (axis !== menuAxis || now - lastHud > 240)) {
			moveFocus(-axis);
			lastHud = now;
		}
		menuAxis = axis;
		if (edge(0)) activateFocused();
		if (edge(1)) goBack();
		if (edge(9) && !b[8] && modalPage === "pause") resumeGame();
		if (modalPage === "settings" || modalPage === "dev") {
			if (
				Math.abs(x) > 0.5 &&
				(!padPrevious._axis || performance.now() - lastHud > 140)
			) {
				adjustFocused(Math.sign(x));
				lastHud = performance.now();
			}
			b._axis = Math.abs(x) > 0.5;
		}
	} else if (mode === "play") {
		if (edge(9) && !b[8]) pauseGame();
		if (edge(3)) renderModal("map");
		result = { x, y, jump: !!b[0], interact: !!b[2] };
	}
	padPrevious = b;
	return result;
}
function getInput(pad) {
	if (testInput) return { ...testInput };
	let x =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
		y =
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
	return {
		x: Math.max(-1, Math.min(1, x + pad.x + touch.x)),
		y: Math.max(-1, Math.min(1, y + pad.y + touch.y)),
		jump: keys.has("Space") || pad.jump || touch.jump,
		interact: keys.has("KeyE") || pad.interact,
	};
}
function updatePlayer(dt, inp, p = player, isRemote = false) {
	const { body, collider, controller } =
		physicsFor.get(p) || createActorPhysics(p);
	const assist = settings.assist || inputDevice === "touch";
	if (assist && p.grounded && inp.x && p.mode === "walk") {
		const ledge = platforms.find(
			([a, b, h]) => Math.abs(p.y - h) < 0.3 && p.x > a && p.x < b,
		);
		if (
			ledge &&
			((inp.x > 0 && ledge[1] - p.x < 1.15) ||
				(inp.x < 0 && p.x - ledge[0] < 1.15)) &&
			!ladders.some((l) => Math.abs(l.x - p.x) < 1.7) &&
			Math.abs(inp.y) < 0.25
		)
			p.autoJump = 0.85;
	}
	if (p.autoJump > 0) {
		inp = { ...inp, jump: true };
		p.autoJump -= dt;
	}
	p.invuln = Math.max(0, p.invuln - dt);
	p.balloonLock = Math.max(0, p.balloonLock - dt);
	let jumpEdge = inp.jump && !p.jumpHeld;
	p.jumpHeld = inp.jump;
	if (inp.x) p.face = Math.sign(inp.x);
	if (dev.noclip) {
		p.x += inp.x * tuning.speed * 2 * dt;
		p.y += inp.y * tuning.speed * 2 * dt;
		p.mode = "walk";
		p.vy = 0;
		body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.8, z: 0 });
		return;
	}
	let inWater = p.x > 49 && p.x < 77.5 && p.y < -21.05 && p.y > -29;
	if (inWater && p.mode !== "float") {
		p.mode = "swim";
		p.ladder = -1;
	}
	if (p.mode === "swim" && !inWater && p.y > -21.15) {
		p.mode = "walk";
		p.vy = 2;
	}
	if (p.mode === "walk") {
		for (let i = 0; i < ladders.length; i++) {
			let l = ladders[i];
			if (
				Math.abs(p.x - l.x) < 1.25 &&
				p.y >= l.bottom - 0.5 &&
				p.y <= l.top + 0.5 &&
				Math.abs(inp.y) > 0.3 &&
				!(p.y >= l.top - 0.1 && inp.y > 0) &&
				!(p.y <= l.bottom + 0.1 && inp.y < 0)
			) {
				p.mode = "climb";
				p.ladder = i;
				p.x = l.x;
				p.y = Math.max(l.bottom, Math.min(l.top, p.y));
				p.vy = 0;
				stats.visited.climb = true;
				audio.effect("climb");
				break;
			}
		}
	}
	if (p.mode === "climb") {
		const l = ladders[p.ladder];
		p.x = l.x;
		p.y += inp.y * 4.3 * dt;
		p.vy = 0;
		if (jumpEdge) {
			p.mode = "walk";
			p.ladder = -1;
			p.vy = tuning.jump * 0.75;
			p.x += p.face * 0.6;
		} else if (p.y >= l.top + 0.05) {
			p.x = l.x + 1.35;
			p.y = l.top + 0.07;
			p.mode = "walk";
			p.ladder = -1;
		} else if (p.y <= l.bottom + 0.04) {
			p.x = l.x - 1.25;
			p.y = l.bottom + 0.07;
			p.mode = "walk";
			p.ladder = -1;
		}
		body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.8, z: 0 });
	} else if (p.mode === "float") {
		stats.visited.float = true;
		p.x += inp.x * tuning.speed * 0.58 * dt;
		p.y += (tuning.balloonSpeed + inp.y * 1.8) * dt;
		p.vy = 0;
		p.x = Math.max(81.8, Math.min(95, p.x));
		if (p.y > -4.8 && p.x < 90.5) p.x += 1.8 * dt;
		balloon.x = p.x;
		balloon.y = p.y + 3.2;
		if (jumpEdge || p.y > -0.5) {
			p.mode = "walk";
			p.vy = 1;
			p.balloonLock = 1.2;
			balloon.attached = false;
			balloon.cooldown = 3;
			audio.effect("pop");
			burst(p.x, p.y + 3.2, 0xf1bf63);
		}
		body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.8, z: 0 });
	} else {
		let vx = inp.x * (p.mode === "swim" ? tuning.swimSpeed : tuning.speed);
		p.vx = THREE.MathUtils.damp(p.vx, vx, p.grounded ? 18 : 9, dt);
		if (p.mode === "swim") {
			stats.visited.swim = true;
			p.vy = THREE.MathUtils.damp(
				p.vy,
				inp.y * tuning.swimSpeed + (inp.jump ? 3 : 0),
				8,
				dt,
			);
			if (p.y > -21.3 && inp.jump) {
				p.mode = "walk";
				p.vy = tuning.jump * 0.8;
				audio.effect("splash");
			}
			if (p.x > 75.8 && inp.x > 0.2) {
				p.x = 78;
				p.y = -23.8;
				p.mode = "walk";
				p.vy = 3;
			}
			if (p.x < 49.5 && inp.x < -0.2) {
				p.x = 47.6;
				p.y = -23.8;
				p.mode = "walk";
				p.vy = 3;
			}
		} else {
			p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
			p.jumpBuffer = jumpEdge ? 0.14 : Math.max(0, p.jumpBuffer - dt);
			if (p.jumpBuffer > 0 && p.coyote > 0) {
				p.vy = tuning.jump;
				p.grounded = false;
				p.coyote = 0;
				p.jumpBuffer = 0;
				audio.effect("jump");
			}
			p.vy -= tuning.gravity * dt;
			if (!inp.jump && p.vy > 4) p.vy -= tuning.gravity * 0.8 * dt;
			p.vy = Math.max(p.vy, -24);
		}
		{
			const bt = body.translation();
			if (Math.abs(bt.x - p.x) > 0.3 || Math.abs(bt.y - p.y - 0.8) > 0.3)
				body.setTranslation({ x: p.x, y: p.y + 0.8, z: 0 }, true);
			controller.computeColliderMovement(
				collider,
				{ x: p.vx * dt, y: p.vy * dt, z: 0 },
				undefined,
				undefined,
				(c) => !actorColliders.has(c.handle),
			);
			const mv = controller.computedMovement();
			p.x += mv.x;
			p.y += mv.y;
			p.grounded = controller.computedGrounded();
			if (p.grounded && p.vy < 0) p.vy = -0.1;
			body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.8, z: 0 });
		}
	}
	p.x = Math.max(-4, Math.min(117, p.x));
	if (p.y < -38) damage(p);
	if (
		!balloon.attached &&
		p.mode !== "float" &&
		p.balloonLock <= 0 &&
		balloon.cooldown <= 0 &&
		Math.abs(p.x - balloon.x) < 1.15 &&
		Math.abs(p.y + 2.7 - balloon.y) < 1.7 &&
		(inp.jump || inp.y > 0.2 || p.y < -31)
	) {
		p.mode = "float";
		balloon.attached = true;
		balloon.ownerId = p.id;
		p.vy = 0;
		stats.visited.float = true;
		audio.effect("balloon");
		toast(
			"A little lift goes a long way.",
			"STEER UP THE SHAFT • JUMP TO LET GO",
			3,
		);
	}
	for (const it of items) {
		const oy = it.kind === "gold" || it.kind === "diamond" ? it.y : it.y + 0.8;
		if (
			!it.collected &&
			Math.abs(p.x - it.x) < (assist ? 1.5 : 1.05) &&
			Math.abs(p.y + 0.8 - oy) < (assist ? 1.9 : 1.45)
		)
			collect(it);
	}
	for (const c of checkpoints) {
		if (
			Math.abs(p.x - c.x) < 1.3 &&
			Math.abs(p.y - c.y) < 1.4 &&
			p.checkpoint !== c.index
		) {
			p.checkpoint = c.index;
			{
				stats.checkpoints++;
				c.ring.material.color.setHex(0xefbd62);
				audio.effect("checkpoint");
				burst(c.x, c.y + 0.2, 0x7ee2c4, 18);
				toast(
					"Camp made. Boots optional.",
					"CHECKPOINT • " + c.name.toUpperCase(),
					2.5,
				);
			}
		}
	}
	if (!attract && !dev.invulnerable) {
		for (const e of enemies) {
			let ey =
				e.py + (e.type === "scorpion" ? 0.24 : e.type === "frog" ? 0.35 : 0);
			if (
				p.mode === "float" &&
				e.type === "bat" &&
				Math.hypot(p.x - e.px, p.y + 3.2 - ey) < 1.3
			) {
				p.mode = "walk";
				p.balloonLock = 2;
				balloon.attached = false;
				balloon.cooldown = 3;
				audio.effect("pop");
				burst(p.x, p.y + 3.2);
				continue;
			}
			if (
				Math.abs(p.x - e.px) < (e.type === "eel" ? 0.95 : 0.7) &&
				Math.abs(p.y + 0.8 - ey) < (e.type === "frog" ? 0.6 : 0.65)
			) {
				damage(p);
				break;
			}
		}
	}
	if (p.x > 111 && p.y > -6 && p.y < -2) {
		if (Object.values(stats.found).every(Boolean)) {
			if (!stats.finished) finish();
		} else if (!toastTimer)
			toast(
				"A splendid exit. A premature exit.",
				"FIND BOTH FRIENDS AND THE SUNSTONE FIRST.",
				3,
			);
	}
	p.action =
		p.mode === "float"
			? "float"
			: p.mode === "swim"
				? "swim"
				: p.mode === "climb"
					? "climb"
					: !p.grounded
						? p.vy > 0
							? "jump"
							: "fall"
						: Math.abs(p.vx) > 0.5
							? "run"
							: "idle";
}
function updateEnemies(dt) {
	for (const e of enemies) {
		let t = worldTime * e.speed * tuning.enemySpeed + e.phase;
		e.px = e.x + Math.sin(t) * e.range;
		e.py = e.y;
		if (e.type === "frog") e.py += Math.max(0, Math.sin(t * 2.8)) * 1.5;
		else if (e.type === "bat" || e.type === "condor")
			e.py += Math.sin(t * 1.8) * 0.75;
		else if (e.type === "eel") e.py += Math.sin(t * 2) * 0.5;
		e.visual.position.set(e.px, e.py, 0);
		e.visual.scale.x = Math.cos(t) > 0 ? 1 : -1;
		e.visual.userData.animate?.(worldTime);
		e.visual.rotation.z =
			e.type === "bat" || e.type === "condor" ? Math.sin(t) * 0.12 : 0;
		const wings = e.visual.userData.wings || [];
		wings.forEach(
			(wing, i) =>
				(wing.rotation.z = Math.sin(worldTime * 10) * 0.55 * (i ? 1 : -1)),
		);
	}
}
function animateHero(h, p, dt) {
	h.group.position.set(p.x, p.y, 0);
	h.group.rotation.y = p.face < 0 ? -0.25 : 0.25;
	h.group.scale.x = p.face;
	h.group.visible = !(p.invuln > 0 && Math.floor(p.invuln * 12) % 2);
	h.setAction(p.action);
	h.mixer.update(dt);
}
function remoteInputFor(id) {
	const value = remoteInputs.get(id);
	return value &&
		(!value.receivedAt || performance.now() - value.receivedAt < 650)
		? value
		: { x: 0, y: 0, jump: false };
}
function fixedUpdate(dt, inp) {
	if (network?.hub && !network.running) return;
	const frozen = playing && modalPage && !network?.connected && !attract;
	if (!frozen) {
		worldTime += dt;
		environment.update(dt, worldTime);
		updateEnemies(dt);
	}
	if (
		playing &&
		(!modalPage || attract || network?.connected) &&
		!stats.finished
	) {
		if (attract) updateAttract(dt);
		else if (network?.role === "guest") {
			network.sendInput(
				modalPage
					? { x: 0, y: 0, jump: false }
					: { ...inp, action: inp.interact },
			);
		} else {
			const localInput = modalPage ? { x: 0, y: 0, jump: false } : inp;
			updatePlayer(
				dt,
				network?.isServer ? remoteInputFor(player.id) : localInput,
			);
			if (remotePlayer)
				updatePlayer(dt, remoteInputFor(remotePlayer.id), remotePlayer, true);
			stats.time += dt;
			network?.setScore(stats.score, stats.finished);
		}
		if (network?.role !== "guest") {
			world.timestep = dt;
			world.step();
		}
		if (network?.role !== "guest" && !balloon.attached) {
			balloon.cooldown = Math.max(0, balloon.cooldown - dt);
			if (balloon.cooldown <= 0) {
				balloon.x = 85;
				balloon.y = -30.8 + Math.sin(worldTime * 1.2) * 0.3;
			}
		}
		balloonMesh.visible = balloon.cooldown <= 0 || balloon.attached;
		balloonMesh.position.set(balloon.x, balloon.y, 0);
		balloonMesh.rotation.z = Math.sin(worldTime * 2) * 0.06;
	}
	if (player) animateHero(hero, player, dt);
	if (remotePlayer) {
		friend.group.visible = true;
		animateHero(friend, remotePlayer, dt);
	} else if (remoteHeroState) {
		friend.group.visible = true;
		animateHero(friend, remoteHeroState, dt);
	} else friend.group.visible = false;
	for (const it of items) {
		if (it.collected) continue;
		if (it.kind === "gold" || it.kind === "diamond") {
			it.visual.rotation.y += dt * 0.7;
			it.visual.position.y = it.y + Math.sin(worldTime * 2 + it.i) * 0.12;
		}
	}
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= dt;
		p.vy -= 5 * dt;
		p.mesh.position.x += p.vx * dt;
		p.mesh.position.y += p.vy * dt;
		p.mesh.rotation.x += dt * 2;
		p.mesh.material.opacity = Math.max(0, p.life / p.max);
		if (p.life <= 0) {
			scene.remove(p.mesh);
			p.mesh.geometry.dispose();
			p.mesh.material.dispose();
			particles.splice(i, 1);
		}
	}
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").classList.add("hidden");
	}
	sadTimer = Math.max(0, sadTimer - dt);
	audio.update(dt, {
		mode: sadTimer
			? "sad"
			: player?.mode === "float"
				? "balloon"
				: player?.mode === "swim"
					? "swim"
					: "explore",
		active:
			playing &&
			!modalPage &&
			!attract &&
			!stats.finished &&
			(!network || !network.ended),
	});
	if (playing && !attract) {
		netTimer += dt;
		if (netTimer > 0.08) {
			netTimer = 0;
			if (network?.role !== "guest") network?.sendSnapshot(makeSnapshot());
			updateHUD();
			updateContext();
		}
	}
}
function makeSnapshot() {
	return {
		player: { ...player },
		remote: remotePlayer ? { ...remotePlayer } : null,
		stats: JSON.parse(JSON.stringify(stats)),
		collected: items.filter((i) => i.collected).map((i) => i.i),
		balloon: { ...balloon },
		worldTime,
		mode: stats.finished ? "won" : "play",
	};
}
function applySnapshot(s) {
	if (!s?.player || network.role !== "guest") return;
	if (!playing && mode === "title") startGame();
	const wasWon = mode === "won";
	player = { ...(s.remote?.id === network.playerId ? s.remote : s.player) };
	remoteHeroState = {
		...(s.remote?.id === network.playerId ? s.player : s.remote || s.player),
	};
	stats = s.stats;
	if (wasWon && !stats.finished) {
		mode = "play";
		playing = true;
		hideModal();
	}
	worldTime = s.worldTime;
	balloon = s.balloon;
	items.forEach((it) => {
		it.collected = s.collected.includes(it.i);
		it.visual.visible = !it.collected;
	});
	if (s.mode === "won" && mode !== "won") showResults();
}
function updateContext() {
	if (inputDevice === "touch") {
		$("touch-action").style.display =
			mode === "play" && !modalPage ? "block" : "none";
		$("touch-action").textContent =
			player.mode === "float"
				? "LET GO"
				: player.mode === "swim"
					? "SURFACE"
					: "JUMP";
	}
	let text = "";
	if (player.mode === "float")
		text = `${controlsGlyph("move")} Steer &nbsp; ${controlsGlyph("release")} Let go`;
	else if (player.mode === "swim")
		text = `${controlsGlyph("climb")} Swim &nbsp; ${controlsGlyph("jump")} Rise`;
	else {
		const near = ladders.find(
			(l) =>
				Math.abs(player.x - l.x) < 2.5 &&
				player.y < l.top + 1 &&
				player.y > l.bottom - 1,
		);
		if (near) text = `${controlsGlyph("climb")} Climb the ladder`;
		else if (player.x > 81 && player.y < -30)
			text = `${controlsGlyph("jump")} Catch the balloon`;
		else if (player.x > 9 && player.x < 17 && player.y > -3)
			text = `${controlsGlyph("jump")} Hold for a longer leap`;
	}
	if (inputDevice === "touch")
		text =
			player.mode === "climb"
				? "Drag up or down to climb"
				: player.mode === "swim"
					? "Drag to swim • tap right to rise"
					: player.x > 81 && player.y < -30
						? "Tap to catch a balloon"
						: ladders.some(
									(l) =>
										Math.abs(player.x - l.x) < 2.5 &&
										player.y < l.top + 1 &&
										player.y > l.bottom - 1,
								)
							? "Drag up or down by the ladder"
							: "";
	$("context").classList.toggle("hidden", !text || modalPage);
	if (text !== activeContext) {
		$("context").innerHTML = text;
		activeContext = text;
	}
}
function finish() {
	stats.finished = true;
	stats.score += Math.max(0, 5000 - stats.deaths * 250);
	audio.effect("win");
	network?.sendSnapshot(makeSnapshot(), true);
	network?.finish?.(stats.score, true);
	try {
		const old = Number(localStorage.getItem("pit-away-best") || 0);
		if (stats.score > old) localStorage.setItem("pit-away-best", stats.score);
	} catch {}
	showResults();
}
function showResults() {
	mode = "won";
	stats.finished = true;
	renderModal("results");
}
// The kiosk replay deliberately flies between authored routes, with ordinary pickups and animation.
const demoRoute = [
	[3, 0.05],
	[9, 0.05],
	[14, 2.6],
	[19, 0.05],
	[24, 0.1],
	[24, -11.8],
	[29, -11.9],
	[34, -9],
	[39, -11.9],
	[45.5, -11.9],
	[49, -12],
	[49, -23.8],
	[55, -25],
	[63, -24],
	[71, -25],
	[77.8, -23.9],
	[80, -24],
	[80, -33.8],
	[85, -33],
	[85, -25],
	[87, -15],
	[90, -4],
	[98, -4.9],
	[105, -3.6],
	[113, -4.9],
];
function updateAttract(dt) {
	attractTime += dt;
	const duration = 2.2;
	let phase = attractTime / duration,
		i = Math.floor(phase) % demoRoute.length,
		next = (i + 1) % demoRoute.length,
		t = phase % 1;
	if (i === demoRoute.length - 1 && t > 0.8) {
		resetGame();
		attractTime = 0;
		return;
	}
	let a = demoRoute[i],
		b = demoRoute[next];
	player.x = THREE.MathUtils.lerp(a[0], b[0], t);
	player.y = THREE.MathUtils.lerp(a[1], b[1], t);
	player.face = b[0] < a[0] ? -1 : 1;
	player.vx = 3;
	player.invuln = 0;
	player.mode =
		i >= 18 && i <= 20
			? "float"
			: i >= 11 && i <= 14
				? "swim"
				: Math.abs(a[0] - b[0]) < 0.2
					? "climb"
					: "walk";
	player.action =
		player.mode === "float"
			? "float"
			: player.mode === "swim"
				? "swim"
				: player.mode === "climb"
					? "climb"
					: "run";
	balloon.attached = player.mode === "float";
	if (balloon.attached) {
		balloon.x = player.x;
		balloon.y = player.y + 3.2;
	}
	for (const it of items)
		if (Math.hypot(player.x - it.x, player.y - it.y) < 2) collect(it);
}
function pauseGame() {
	if (mode === "play" && !modalPage) {
		renderModal("pause");
		audio.effect("pause");
	}
}
function resumeGame() {
	hideModal();
	keys.clear();
	touch.x = touch.y = 0;
	audio.start();
}
function hideModal() {
	modalPage = "";
	$("modal").classList.add("hidden");
	$("modal").innerHTML = "";
	if (playing && !attract) $("hud").classList.remove("hidden");
}
function backButton() {
	return '<button class="back" data-action="back">← Back</button>';
}
function button(text, action, extra = "") {
	return `<button class="menu-button" data-action="${action}" ${extra}>${text}<em>→</em></button>`;
}
function range(id, label, min, max, step, value, unit = "", hint = "") {
	return `<div class="setting"><label for="${id}">${label}${hint ? `<small>${hint}</small>` : ""}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${id}" aria-label="${label}"><output for="${id}">${unit === "%" ? Math.round(value * 100) : value}${unit}</output></div>`;
}
function toggle(id, label, value, hint = "") {
	return `<div class="setting"><label>${label}${hint ? `<small>${hint}</small>` : ""}</label><button data-action="toggle-${id}">${value ? "ON" : "OFF"}</button></div>`;
}
function mapSVG() {
	let x = (p) => 20 + (p + 5) * 6.5,
		y = (p) => 28 + (5 - p) * 5;
	return `<div class="map-visual"><svg viewBox="0 0 850 280" role="img" aria-label="Connected map of all five cavern regions"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#25474a" stroke-width=".5"/></pattern></defs><rect width="850" height="280" fill="url(#grid)"/><rect x="${x(49)}" y="${y(-21)}" width="182" height="40" fill="#176f73" opacity=".55"/>${platforms.map(([a, b, h]) => `<path d="M${x(a)} ${y(h)}H${x(b)}" stroke="#bdac77" stroke-width="4"/>`).join("")}${ladders.map((l) => `<path d="M${x(l.x)} ${y(l.top)}V${y(l.bottom)}" stroke="#e5c383" stroke-width="3" stroke-dasharray="4 3"/>`).join("")}<path d="M${x(85)} ${y(-33)}V${y(-4)}H${x(91)}" fill="none" stroke="#d8aa58" stroke-width="2" stroke-dasharray="5 4"/>${checkpointDefs.map((c, i) => `<circle cx="${x(c.x)}" cy="${y(c.y) - 5}" r="3" fill="#7ce6c6"/><text x="${x(c.x) - 8}" y="${y(c.y) - 15}" font-family="Arial" font-size="10" fill="#a0bbad">${i + 1}</text>`).join("")}${items
		.filter((it) => it.id)
		.map(
			(it) =>
				`<text x="${x(it.x) - 18}" y="${y(it.y) - 14}" fill="${it.collected ? "#81c9b0" : "#e9ba66"}" font-family="Arial" font-size="10">${it.id === "mina" ? "MINA" : it.id === "marmalade" ? "CAT" : "STONE"} ${it.collected ? "✓" : "◇"}</text>`,
		)
		.join(
			"",
		)}<circle cx="${x(player.x)}" cy="${y(player.y) - 4}" r="5" fill="#f7d287" stroke="#fff2cc" stroke-width="2"/><text x="30" y="24" font-size="10" fill="#c4bb93" font-family="Arial" letter-spacing="2">NOT TO SCALE. NEITHER IS THE DANGER.</text></svg></div>`;
}
let feedbackData = creditData;
function aboutHTML() {
	const info = feedbackData.sourceInformation;
	return `<div class="credit-grid">${Object.entries(info)
		.map(
			([k, v]) =>
				`<div><b>${k.replace(/[A-Z]/g, (m) => " " + m)}</b>${v}</div>`,
		)
		.join(
			"",
		)}</div><p style="font-size:12px">An original tribute. Source game: David Crane / Activision. No original game assets or recordings are used. Procedural art, animation, music and game code created for this expedition.</p><p style="font-size:12px"><a style="color:var(--teal)" href="https://atariage.com/manual_html_page.php?SoftwareLabelID=359" target="_blank" rel="noopener">Source manual</a> · <a style="color:var(--teal)" href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a></p><div class="feedback">${["testingFeedback", "engineFeedback", "promptFeedback"].map((k) => `<details><summary>${k.replace("Feedback", " Feedback").replace(/^./, (c) => c.toUpperCase())}</summary><ol>${feedbackData[k].map((v) => `<li>${v}</li>`).join("")}</ol></details>`).join("")}</div>`;
}
function renderModal(page) {
	const previousPage = modalPage,
		previousFocus = focusIndex;
	if (attract) toTitle();
	if (!modalPage) returnPage = mode === "title" ? "title" : "pause";
	modalPage = page;
	let wide = false,
		title = "",
		content = "",
		eye = "EXPEDITION JOURNAL";
	if (page === "pause") {
		title = "Take a breather.";
		content = `<div class="menu-stack">${button("Continue expedition", "resume")}${button("Expedition map", "map")}${button("Field guide", "guide")}${button("Settings", "settings")}${button("Developer kit", "dev")}${button("About & credits", "about")}${!network?.hub ? button("Return to title", "title") : ""}</div>`;
	}
	if (page === "settings") {
		title = "Pack to your liking.";
		content =
			range("music", "Music", 0, 1, 0.05, settings.music, "%") +
			range("sfx", "Effects & voices", 0, 1, 0.05, settings.sfx, "%") +
			`<div class="setting"><label>Controller glyphs</label><button data-action="glyphs">${settings.glyphs === "playstation" ? "PlayStation  × ○ □ △" : "Xbox  A B X Y"}</button></div>` +
			toggle(
				"assist",
				"Trail assist",
				settings.assist,
				"Wider pickups and automatic jumps at ledges.",
			) +
			`<p style="font-size:12px">${renderer?.backend?.isWebGPUBackend ? "WebGPU renderer active" : "WebGL2 compatibility renderer active"} · Keyboard, controller and touch switch automatically.</p>` +
			backButton();
	}
	if (page === "guide") {
		title = "A field guide to getting lost.";
		wide = true;
		content =
			`<div class="guide-grid"><div class="guide-item"><strong>01. Travel light.</strong><p>${controlsGlyph("move")} Move. ${controlsGlyph("jump")} Jump. Hold jump for a longer leap. Gold is optional; excellent stories are not.</p></div><div class="guide-item"><strong>02. Mind the wildlife.</strong><p>Hop over frogs and pale scorpions. Time your run under bats and condors. There’s no fighting in a respectable expedition.</p></div><div class="guide-item"><strong>03. The way is down.</strong><p>${controlsGlyph("climb")} Climb beside a ladder. Follow the turquoise camps; a tumble returns you to the last camp and costs points. Unlimited tries.</p></div><div class="guide-item"><strong>04. Take a dip.</strong><p>Move in any direction underwater. ${controlsGlyph("jump")} Rise. Eels prefer their personal space. Swim into a bank to climb out.</p></div><div class="guide-item"><strong>05. A balloon? Naturally.</strong><p>Jump at the balloon above the geyser. Steer up and right. ${controlsGlyph("jump")} Let go above the upper ledge. Bats may pop your ride!</p></div><div class="guide-item"><strong>06. Leave no friend behind.</strong><p>Find Mina, Marmalade the cat, and the Sunstone. Reach the upper vault’s way out together. ${controlsGlyph("map")} Check the map.</p></div></div><p style="font-size:12px">On touch: drag anywhere on the left to move, climb or swim. Tap on the right to jump. The action button changes with your situation.</p>` +
			backButton();
	}
	if (page === "map") {
		title = "There’s a way through.";
		wide = true;
		content =
			mapSVG() +
			`<div class="map-key"><span class="map-dot">● You</span><span>◇ Objective</span><span style="color:var(--teal)">● Camp</span><span>⋮ Ladder / updraft</span></div><p>01 Landing → 02 Galleries → 03 Archive → 04 Updraft → 05 Vault</p>` +
			backButton();
	}
	if (page === "dev") {
		title = "The developer’s satchel.";
		wide = true;
		eye = "LIVE BALANCE & TEST TOOLS";
		content =
			`<div class="guide-grid"><div>${range("speed", "Run speed", 3, 12, 0.2, tuning.speed)}${range("jump", "Jump strength", 7, 17, 0.2, tuning.jump)}${range("gravity", "Gravity", 12, 38, 0.5, tuning.gravity)}${range("swimSpeed", "Swim speed", 2, 10, 0.2, tuning.swimSpeed)}</div><div>${range("balloonSpeed", "Balloon lift", 1, 7, 0.1, tuning.balloonSpeed)}${range("enemySpeed", "Wildlife speed", 0.2, 2.5, 0.1, tuning.enemySpeed)}${range("penalty", "Checkpoint penalty", 0, 2000, 100, tuning.penalty)}${toggle("invulnerable", "Invulnerability", dev.invulnerable)}${toggle("noclip", "Free flight", dev.noclip, "Move in all directions. Collisions disabled.")}</div></div>${toggle("showPhysics", "Collision geometry", dev.showPhysics)}<div class="setting"><label>Warp to camp</label><button data-action="warp-next">Next camp →</button></div><div class="menu-stack">${button("Reset balance defaults", "reset-tuning")}${button("Restart expedition", "restart")}</div><p style="font-size:12px">Changes apply immediately. Test tools do not overwrite your saved settings.</p>` +
			backButton();
	}
	if (page === "about") {
		title = "About this expedition.";
		wide = true;
		content = aboutHTML() + backButton();
	}
	if (page === "coop") {
		title = "Better lost together.";
		eye = "ONE CAVERN • TWO EXPLORERS";
		content =
			`<p>Share the expedition, treasure and checkpoints. Each explorer has their own camera.</p><div class="menu-stack">${button("Host in this browser", "host-local")}${button("Join in this browser", "join-local")}${button("Connect another device", "peer")}</div><p style="font-size:12px">Same-browser rooms use two tabs on the same site. Other devices connect directly with invitation and reply codes. AI Hub supplies its own lobby.</p>` +
			backButton();
	}
	if (page === "host-local") {
		title = "Camp is open.";
		network.hostLocal("CAVE-" + Math.floor(1000 + Math.random() * 9000));
		content =
			`<p>Open this same game in a second tab, choose Join, and enter:</p><div class="room-code">${network.room}</div><div class="menu-stack">${button("Begin together", "start")}</div><p style="font-size:12px">Your companion can join at any time.</p>` +
			backButton();
	}
	if (page === "join-local") {
		title = "Find your companion.";
		content =
			`<p>Enter the host’s room code. Both tabs must use the same browser and site.</p><input class="join-input" id="room-input" maxlength="9" value="CAVE-0000" tabindex="-1" aria-label="Room code"><div class="code-digits" role="group" aria-label="Room code digits">${Array.from({ length: 4 }, (_, i) => `<button data-action="room-digit-${i}" data-room-digit="${i}" aria-label="Room digit ${i + 1}: 0">0</button>`).join("")}</div><p style="font-size:12px">Select a digit and press ${controlsGlyph("jump")} to cycle 0–9. Up/down selects a digit or Join. You can also click the digits or type the full code above.</p><div class="menu-stack" style="margin-top:20px">${button("Join expedition", "connect-local")}</div>` +
			backButton();
	}
	if (page === "peer") {
		title = "A longer rope.";
		content =
			`<p>Connect two devices directly. Send the invitation to your companion, then paste their reply. Direct connections depend on your networks.</p><div class="menu-stack">${button("Create invitation", "make-offer")}${button("I have an invitation", "answer-offer")}</div>` +
			backButton();
	}
	if (
		page === "make-offer" ||
		page === "answer-offer" ||
		page === "accept-answer"
	) {
		title =
			page === "make-offer"
				? "Preparing your invitation…"
				: page === "answer-offer"
					? "An invitation to adventure."
					: "One last knot.";
		content =
			`<p id="signal-help">${page === "make-offer" ? "Finding a direct connection. This can take a few seconds." : page === "answer-offer" ? "Paste your companion’s invitation below." : "Paste the reply your companion sent you."}</p><textarea class="join-input" id="signal" style="font-size:12px;letter-spacing:0;height:120px;resize:vertical" aria-label="Connection code" ${page === "make-offer" ? "readonly" : ""}></textarea><div class="menu-stack" style="margin-top:16px">${page === "make-offer" ? button("Copy invitation", "copy-signal") + button("Enter companion’s reply", "accept-answer") : button(page === "answer-offer" ? "Create reply" : "Connect expedition", page === "answer-offer" ? "create-reply" : "finish-peer")}</div><p style="font-size:12px" id="signal-status"></p>` +
			backButton();
		if (page === "make-offer")
			network
				.createOffer()
				.then((code) => {
					if (modalPage === "make-offer") {
						$("signal").value = code;
						$("signal-help").textContent =
							"Send this invitation to your companion. Ask them to choose “I have an invitation” and send you their reply.";
						$("modal").querySelector("h2").textContent = "Invitation ready.";
					}
				})
				.catch((e) => {
					$("signal-help").textContent = e.message;
				});
	}
	if (page === "results") {
		title = "Everyone accounted for.";
		eye = "EXPEDITION COMPLETE";
		content = `<p>Two friends, one Sunstone, and enough gold to buy a very comfortable pair of socks.</p><div class="result-score">${stats.score.toLocaleString("en-US")}</div><div style="font-size:11px;letter-spacing:3px;color:var(--gold)">EXPEDITION POINTS</div><div class="result-stat"><span><b>${stats.gold}/15</b>GOLD BARS</span><span><b>${Math.floor(stats.time / 60)}:${String(Math.floor(stats.time % 60)).padStart(2, "0")}</b>TRAIL TIME</span><span><b>${stats.deaths}</b>SMALL SETBACKS</span></div><div class="menu-stack">${!network?.hub ? (network?.role === "guest" ? "<p>The host can begin another expedition.</p>" : button("One more expedition", "restart")) + button("Return to title", "title") : button("Read the field notes", "about")}</div>`;
	}
	if (page === "dev" && network?.role === "guest")
		content =
			"<p>The expedition host controls balance, free flight, invulnerability and camp warps. Ask them to open the Developer kit in their pause menu.</p>" +
			backButton();
	$("modal").innerHTML =
		`<section class="panel ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${title}"><div class="eyebrow">${eye}</div><h2>${title}</h2>${content}<div class="panel-footer"><span>PIT & AWAY / LOST CAVERNS</span><span>${controlsGlyph("pause")} MENU</span></div></section>`;
	$("modal").classList.remove("hidden");
	focusIndex = previousPage === page ? previousFocus : 0;
	setFocus(focusIndex);
	$("context").classList.add("hidden");
	$("touch-action").style.display = "none";
}
function focusables() {
	return Array.from(
		(modalPage ? $("modal") : $("title")).querySelectorAll(
			"button:not(:disabled),input,textarea,summary,a",
		),
	).filter(
		(element) => !(inputDevice === "gamepad" && element.id === "room-input"),
	);
}
function setFocus(index) {
	const list = focusables();
	if (!list.length) return;
	focusIndex = (index + list.length) % list.length;
	list.forEach((e, i) => e.classList.toggle("focus", i === focusIndex));
	if (inputDevice === "gamepad")
		list[focusIndex].focus({ preventScroll: false });
}
function moveFocus(dir) {
	setFocus(focusIndex + dir);
	audio.effect("menu");
}
function activateFocused() {
	const e = focusables()[focusIndex];
	if (["BUTTON", "SUMMARY", "A"].includes(e?.tagName)) e.click();
	else e?.focus();
}
function adjustFocused(dir) {
	const e = focusables()[focusIndex];
	if (e?.type === "range") {
		e.value = Number(e.value) + Number(e.step) * dir;
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (["BUTTON", "SUMMARY", "A"].includes(e?.tagName)) e.click();
}
function goBack() {
	if (mode === "won" && modalPage === "results") return;
	if (!modalPage) {
		if (mode === "play") pauseGame();
		return;
	}
	if (mode === "won") {
		renderModal("results");
		return;
	}
	if (modalPage === "pause" || returnPage === "title") {
		hideModal();
		return;
	}
	renderModal("pause");
}
function warpCamp(index) {
	const c = checkpointDefs[index];
	Object.assign(player, newPlayer(c.x, c.y + 0.1, player.id));
	player.checkpoint = index;
	body.setTranslation({ x: player.x, y: player.y + 0.8, z: 0 }, true);
	body.setNextKinematicTranslation({ x: player.x, y: player.y + 0.8, z: 0 });
	cameraTarget.set(player.x, player.y + 3, 0);
	updateHUD();
}
async function action(name) {
	if (
		network?.hub &&
		((network.ended && !["about", "back", "pause"].includes(name)) ||
			[
				"start",
				"restart",
				"title",
				"host-local",
				"join-local",
				"peer",
				"make-offer",
				"answer-offer",
				"accept-answer",
				"connect-local",
				"finish-peer",
			].includes(name))
	)
		return;
	activity(inputDevice);
	audio.start();
	if (name === "start" || name === "restart") {
		startGame();
		return;
	}
	if (name === "pause") {
		if (mode === "title") renderModal("settings");
		else if (modalPage) goBack();
		else pauseGame();
		return;
	}
	if (name === "resume") {
		resumeGame();
		return;
	}
	if (name === "title") {
		toTitle();
		return;
	}
	if (name === "back") {
		goBack();
		return;
	}
	if (name === "glyphs") {
		settings.glyphs =
			settings.glyphs === "playstation" ? "xbox" : "playstation";
		saveSettings();
		renderModal("settings");
		return;
	}
	if (name.startsWith("toggle-")) {
		let k = name.slice(7);
		if (k in settings) {
			settings[k] = !settings[k];
			saveSettings();
		} else dev[k] = !dev[k];
		renderModal(modalPage);
		return;
	}
	if (name === "reset-tuning") {
		tuning = { ...defaults };
		dev = { invulnerable: false, noclip: false, showPhysics: false };
		renderModal("dev");
		return;
	}
	if (name === "warp-next") {
		warpCamp((player.checkpoint + 1) % checkpointDefs.length);
		renderModal("dev");
		return;
	}
	if (name.startsWith("room-digit-")) {
		const index = Number(name.slice("room-digit-".length));
		const input = $("room-input");
		if (!input || !Number.isInteger(index) || index < 0 || index > 3) return;
		const digits = (
			input.value.replace(/^CAVE-/i, "").replace(/\D/g, "") + "0000"
		)
			.slice(0, 4)
			.split("");
		digits[index] = String((Number(digits[index]) + 1) % 10);
		input.value = "CAVE-" + digits.join("");
		input.dispatchEvent(new Event("input", { bubbles: true }));
		if (inputDevice === "gamepad") setFocus(index);
		return;
	}
	if (name === "connect-local") {
		const room = $("room-input").value;
		network.joinLocal(room);
		startGame();
		toast("Following your companion’s trail.", "WAITING FOR THE HOST TO BEGIN");
		return;
	}
	if (name === "copy-signal") {
		try {
			await navigator.clipboard.writeText($("signal").value);
			$("signal-status").textContent = "Invitation copied.";
		} catch {
			$("signal").select();
			$("signal-status").textContent = "Select and copy this code.";
		}
		return;
	}
	if (name === "create-reply") {
		try {
			const code = await network.answerOffer($("signal").value);
			$("signal").value = code;
			$("signal").readOnly = true;
			$("signal-help").textContent =
				"Send this reply back to the host. Keep this page open.";
			$("signal-status").textContent = "Waiting for your companion…";
			const b = $("modal").querySelector('[data-action="create-reply"]');
			b.textContent = "Copy reply";
			b.dataset.action = "copy-signal";
		} catch (e) {
			$("signal-status").textContent = e.message;
		}
		return;
	}
	if (name === "finish-peer") {
		try {
			await network.acceptAnswer($("signal").value);
			startGame();
			toast("The rope is tied.", "TWO EXPLORERS • ONE EXPEDITION");
		} catch (e) {
			$("signal-status").textContent = e.message;
		}
		return;
	}
	renderModal(name);
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) action(b.dataset.action);
});
document.addEventListener("pointerover", (e) => {
	let b = e.target.closest("button");
	if (b && e.pointerType !== "touch") {
		const i = focusables().indexOf(b);
		if (i >= 0) {
			activity("keyboard");
			setFocus(i);
		}
	}
});
document.addEventListener("input", (e) => {
	if (e.target.id === "room-input") {
		const digits = (
			e.target.value.replace(/^CAVE-/i, "").replace(/\D/g, "") + "0000"
		).slice(0, 4);
		$("modal")
			.querySelectorAll("[data-room-digit]")
			.forEach((button) => {
				const index = Number(button.dataset.roomDigit);
				button.textContent = digits[index];
				button.setAttribute(
					"aria-label",
					`Room digit ${index + 1}: ${digits[index]}`,
				);
			});
		return;
	}
	const k = e.target.dataset.range;
	if (!k) return;
	const value = Number(e.target.value);
	if (k in settings) {
		settings[k] = value;
		saveSettings();
		if (k === "music") audio.setMusic(value);
		if (k === "sfx") audio.setSfx(value);
	} else tuning[k] = value;
	const out = e.target.parentElement.querySelector("output");
	out.textContent =
		k === "music" || k === "sfx" ? Math.round(value * 100) + "%" : value;
});
document.addEventListener("keydown", (e) => {
	if (network?.hub && (network.ended || network.isServer)) return;
	if (
		["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
		e.target.type !== "range"
	) {
		if (e.code === "Escape") goBack();
		return;
	}
	const exited = activity("keyboard");
	if (exited) {
		e.preventDefault();
		return;
	}
	if (
		["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
			e.code,
		)
	)
		e.preventDefault();
	if (e.repeat) return;
	keys.add(e.code);
	pressed.add(e.code);
	audio.start();
	if (e.code === "Escape" || e.code === "KeyP") {
		if (modalPage) goBack();
		else if (mode === "play") pauseGame();
		return;
	}
	if (e.code === "KeyM" && mode === "play") {
		if (modalPage === "map") hideModal();
		else renderModal("map");
		return;
	}
	if (modalPage || mode === "title") {
		if (e.code === "ArrowDown" || e.code === "KeyS") moveFocus(1);
		if (e.code === "ArrowUp" || e.code === "KeyW") moveFocus(-1);
		if (
			(e.code === "ArrowLeft" || e.code === "ArrowRight") &&
			(modalPage === "settings" || modalPage === "dev")
		)
			adjustFocused(e.code === "ArrowRight" ? 1 : -1);
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			activateFocused();
		}
	}
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	touch.x = touch.y = 0;
	touch.jump = false;
	pointers.clear();
	touchOrigin = null;
	$("touch-ring").classList.add("hidden");
	if (mode === "play" && !network?.connected) pauseGame();
});
document.addEventListener(
	"pointerdown",
	(e) => {
		const exited = activity(e.pointerType === "touch" ? "touch" : "keyboard");
		if (exited) {
			e.preventDefault();
			e.stopPropagation();
		}
	},
	true,
);
document.addEventListener("pointermove", (e) => {
	if (
		e.pointerType === "mouse" &&
		(Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3)
	)
		activity("keyboard");
});
const pointers = new Map();
$("game").addEventListener("pointerdown", (e) => {
	const exited = activity(e.pointerType === "touch" ? "touch" : "keyboard");
	if (exited) return;
	if (e.pointerType !== "touch") {
		if (mode === "play" && !modalPage) {
			touch.jump = true;
			audio.start();
		}
		return;
	}
	audio.start();
	$("game").setPointerCapture(e.pointerId);
	if (mode !== "play" || modalPage) return;
	if (e.clientX < innerWidth * 0.6 && !touchOrigin) {
		touchOrigin = { id: e.pointerId, x: e.clientX, y: e.clientY };
		$("touch-ring").style.left = e.clientX - 50 + "px";
		$("touch-ring").style.top = e.clientY - 50 + "px";
		$("touch-ring").classList.remove("hidden");
	} else {
		pointers.set(e.pointerId, "jump");
		touch.jump = true;
	}
});
$("game").addEventListener("pointermove", (e) => {
	if (touchOrigin?.id === e.pointerId) {
		touch.x = Math.max(-1, Math.min(1, (e.clientX - touchOrigin.x) / 45));
		touch.y = Math.max(-1, Math.min(1, (touchOrigin.y - e.clientY) / 45));
	} else if (
		e.pointerType === "mouse" &&
		(Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3)
	)
		activity("keyboard");
});
function releasePointer(e) {
	if (touchOrigin?.id === e.pointerId) {
		touchOrigin = null;
		touch.x = touch.y = 0;
		$("touch-ring").classList.add("hidden");
	}
	if (pointers.has(e.pointerId) || e.pointerType === "mouse") {
		pointers.delete(e.pointerId);
		touch.jump = false;
	}
}
window.addEventListener("pointerup", releasePointer);
window.addEventListener("pointercancel", releasePointer);
$("touch-action").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	activity("touch");
	audio.start();
	touch.jump = true;
	pointers.set(e.pointerId, "jump");
});

function resize() {
	if (!renderer) return;
	renderer.setSize(innerWidth, innerHeight);
	const aspect = innerWidth / innerHeight;
	const height = aspect < 1 ? 25 : 21;
	camera.left = (-height * aspect) / 2;
	camera.right = (height * aspect) / 2;
	camera.top = height / 2;
	camera.bottom = -height / 2;
	camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
function updateCamera(dt) {
	let tx, ty;
	if (mode === "title") {
		tx = 18 + Math.sin(worldTime * 0.15) * 0.7;
		ty = 4.7;
	} else {
		tx = player.x + player.face * 2.7;
		ty = player.y + 3.3;
		tx = Math.max(9, Math.min(107, tx));
		if (player.mode === "float") ty += 1.1;
	}
	target.set(tx, ty, 0);
	cameraTarget.lerp(target, 1 - Math.exp(-dt * 3));
	camera.position.set(cameraTarget.x, cameraTarget.y + 1.5, 37);
	camera.lookAt(cameraTarget.x, cameraTarget.y, 0);
}
function animate(time) {
	if (environment?.titleDecor)
		environment.titleDecor.visible = mode === "title";
	const dt = Math.min((time - lastTime) / 1000 || 1 / 60, 0.07);
	lastTime = time;
	let pad = readPad();
	if (
		mode === "title" &&
		!modalPage &&
		performance.now() - lastInput > 10000 &&
		!network?.hub
	)
		startAttract();
	let inp = getInput(pad);
	if (!manual) {
		accumulator += dt;
		let count = 0;
		while (accumulator >= 1 / 60 && count < 5) {
			if (!network?.hub || network.running) {
				if (network?.ended) {
					audio.stop();
					playing = false;
				} else fixedUpdate(1 / 60, inp);
			}
			accumulator -= 1 / 60;
			count++;
		}
	}
	if (network?.hub && network.ended) {
		playing = false;
		audio.stop();
	}
	if (!network?.isServer) updateCamera(dt);
	if (dev.showPhysics) {
		const data = world.debugRender();
		if (!physicsLines) {
			physicsMat = new THREE.LineBasicMaterial({
				vertexColors: true,
				depthTest: false,
			});
			physicsLines = new THREE.LineSegments(
				new THREE.BufferGeometry(),
				physicsMat,
			);
			physicsLines.renderOrder = 100;
			scene.add(physicsLines);
		}
		physicsLines.visible = true;
		physicsLines.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(data.vertices, 3),
		);
		physicsLines.geometry.setAttribute(
			"color",
			new THREE.BufferAttribute(data.colors, 4),
		);
	} else if (physicsLines) physicsLines.visible = false;
	if (!network?.isServer) {
		renderer.render(scene, camera);
		if (renderFrames === 0) lastInput = performance.now();
		renderFrames++;
	}
	pressed.clear();
}
async function init() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x102d34);
	scene.fog = new THREE.Fog(0x153b40, 45, 110);
	camera = new THREE.OrthographicCamera(-16, 16, 10.5, -10.5, 0.1, 150);
	renderer = new WebGPURenderer({
		canvas: $("game"),
		antialias: true,
		alpha: false,
		powerPreference: "high-performance",
		forceWebGL: new URLSearchParams(location.search).has("compat"),
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.45;
	await renderer.init();
	resize();
	$("load-note").textContent = "Unfolding the field map…";
	const hemi = new THREE.HemisphereLight(0xd2f0db, 0x243d3e, 2.5);
	scene.add(hemi);
	let sunlight = new THREE.DirectionalLight(0xffddaa, 3.2);
	sunlight.position.set(-5, 20, 20);
	scene.add(sunlight);
	let cool = new THREE.DirectionalLight(0x68d3cc, 1.6);
	cool.position.set(35, 5, 15);
	scene.add(cool);
	await RAPIER.init();
	world = new RAPIER.World({ x: 0, y: -23, z: 0 });
	controller = world.createCharacterController(0.025);
	controller.enableSnapToGround(0.15);
	controller.enableAutostep(0.25, 0.2, true);
	controller.setApplyImpulsesToDynamicBodies(true);

	environment = buildWorld(scene);
	makeTerrain();
	createObjects();
	hero = makeExplorer();
	friend = makeExplorer(0x69c8bc);
	scene.add(hero.group, friend.group);
	friend.group.visible = false;
	applyCelInk();
	resetGame();
	network = new ExpeditionNetwork(
		(inp, id) => {
			if (inp.left) {
				remoteInputs.delete(id);
				if (remotePlayer?.id === id) {
					const old = physicsFor.get(remotePlayer);
					if (old) {
						actorColliders.delete(old.collider.handle);
						world.removeCharacterController(old.controller);
						world.removeRigidBody(old.body);
						actorPhysics.delete(old);
					}
					remotePlayer = null;
				}
				return;
			}
			remoteInputs.set(id, { ...inp, receivedAt: performance.now() });
			if (network?.isServer) return;
			if (!remotePlayer) {
				remotePlayer = newPlayer(player.x + 1, player.y, id);
				createActorPhysics(remotePlayer);
			}
			remoteInput = inp;
		},
		applySnapshot,
		(status, n) => {
			$("net-status").textContent = n?.role === "solo" ? "" : status;
			if (n?.connected && n.role === "guest" && n._paired && !playing)
				startGame();
		},
	);
	await network.init();
	configureSeats();
	if (network.hub) {
		$("title").classList.add("hidden");
		$("topline").classList.add("hidden");
		$("hud").classList.remove("hidden");
		playing = true;
		mode = "play";
		network.ready();
	}
	$("loading").classList.add("hidden");
	updatePrompts();
	renderer.setAnimationLoop(animate);
	window.__game = {
		ready: true,
		get state() {
			return {
				title: TITLE,
				mode,
				modal: modalPage,
				playing,
				attract,
				player: { ...player },
				remote: remotePlayer ? { ...remotePlayer } : null,
				stats: JSON.parse(JSON.stringify(stats)),
				tuning: { ...tuning },
				settings: { ...settings },
				dev: { ...dev },
				network: {
					role: network.role,
					hub: network.hub,
					running: network.running,
					ended: network.ended,
					players: network.players,
					stats: network.stats,
				},
				worldTime,
				renderFrames,
				backend: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
				colliders: world.colliders.len(),
				objects: scene.children.length,
				balloon: { ...balloon },
				audio: audio.getStats(),
			};
		},
		start: startGame,
		title: toTitle,
		pause: pauseGame,
		warp: warpCamp,
		setManual(v) {
			manual = v;
		},
		advance(frames, inp = null) {
			manual = true;
			for (let i = 0; i < frames; i++)
				fixedUpdate(1 / 60, inp || getInput(readPad()));
			updateHUD();
			return this.state;
		},
		setInput(v) {
			testInput = v;
		},
		getActor(id) {
			return id === player.id ? player : remotePlayer;
		},
		setRemoteInput(id, inp) {
			remoteInputs.set(id, inp);
		},
		setDev(v) {
			Object.assign(dev, v);
		},
		damage,
		collect(index) {
			collect(items[index]);
		},
		snapshot: makeSnapshot,
		applySnapshot,
		network,
		audio,
		CavernAudio,
		get camera() {
			return { x: cameraTarget.x, y: cameraTarget.y };
		},
		setFeedback(v) {
			feedbackData = v;
		},
		attract: startAttract,
		get feedback() {
			return feedbackData;
		},
		get items() {
			return items.map((i) => ({
				kind: i.kind,
				id: i.id,
				x: i.x,
				y: i.y,
				collected: i.collected,
			}));
		},
	};
}
init().catch((error) => {
	console.error(error);
	$("loading").innerHTML =
		`<div class="error-text"><b>The lantern needs a spark.</b><p>The game could not finish loading. Check your internet connection for the Three.js and Rapier libraries, then reload. A current WebGPU or WebGL2 browser is required.</p><p>${String(error.message).replace(/[<>]/g, "")}</p><button class="primary" onclick="location.reload()">Try again →</button></div>`;
});
