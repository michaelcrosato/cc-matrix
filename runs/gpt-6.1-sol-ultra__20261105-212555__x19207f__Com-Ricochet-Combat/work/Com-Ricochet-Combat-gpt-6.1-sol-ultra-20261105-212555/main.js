import RAPIER from "rapier";
import * as THREE from "three";
import { GameAudio } from "./audio.js";
import { GameNetwork } from "./network.js";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const rng = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const COLORS = [0x63dcc4, 0xff805c, 0xf6c963, 0x9b9be2];
const INK = 0x173a3a,
	_PAPER = 0xfff0cf;
const stages = [
	{
		name: "FIRST CONTACT",
		short: "Straight shots",
		rule: "DIRECT HITS",
		desc: "Drive, aim, and fire. Four hits takes the field.",
		bounces: 0,
		guided: false,
		hidden: false,
		jet: false,
		bank: false,
		layout: 0,
	},
	{
		name: "BANK ON IT",
		short: "Bank shots",
		rule: "BOUNCE ONCE TO ARM",
		desc: "Shots only score after a bounce. Put those walls to work.",
		bounces: 2,
		guided: false,
		hidden: false,
		jet: false,
		bank: true,
		layout: 1,
	},
	{
		name: "CURVE BALL",
		short: "Guided shells",
		rule: "HOLD FIRE TO GUIDE",
		desc: "Hold fire and move your aim to bend the shell in flight.",
		bounces: 1,
		guided: true,
		hidden: false,
		jet: false,
		bank: false,
		layout: 2,
	},
	{
		name: "HIDE & PEEK",
		short: "Invisible tanks",
		rule: "FIRE TO REVEAL • PULSE TO FIND",
		desc: "Rivals vanish. Firing or bumping a wall reveals them. Pulse to find them.",
		bounces: 2,
		guided: false,
		hidden: true,
		jet: false,
		bank: false,
		layout: 1,
	},
	{
		name: "SKY’S THE LIMIT",
		short: "Jet fighters",
		rule: "WRAP THE EDGES • HIDE IN CLOUDS",
		desc: "Jets never stop. Steer, fire, and fly across the edge to wrap around.",
		bounces: 0,
		guided: true,
		hidden: false,
		jet: true,
		bank: false,
		layout: 3,
	},
];
const defaults = {
	speed: 5.8,
	shellSpeed: 18,
	reload: 0.68,
	aiAccuracy: 0.76,
	roundTime: 55,
	points: 4,
};
let tune = { ...defaults };
let settings = {
	music: 10,
	sfx: 65,
	glyph: "ps",
	assist: true,
	shake: true,
	difficulty: "normal",
};
try {
	settings = {
		...settings,
		...JSON.parse(localStorage.getItem("com-ricochet-settings") || "{}"),
	};
} catch {}
const audio = new GameAudio();
audio.setMusic(settings.music / 100);
audio.setSfx(settings.sfx / 100);
let gpuAdapter, gpuDevice;
let renderer,
	scene,
	camera,
	world,
	events,
	arena,
	terrain,
	decoration,
	entities = [],
	bullets = [],
	particles = [],
	tracks = [],
	clouds = [],
	mixers = [];
let walls = [],
	wallHandles = new Set(),
	tankHandles = new Map(),
	bulletHandles = new Map();
let mode = "title",
	screen = "",
	stack = [],
	stageIndex = 0,
	gameType = "circuit",
	couch = false,
	attract = false,
	paused = false,
	roundLeft = 55,
	roundElapsed = 0,
	roundOver = false;
let scores = [0, 0, 0, 0],
	totals = [0, 0, 0, 0],
	roundsWon = 0,
	serial = 0,
	elapsed = 0,
	accum = 0,
	frameCount = 0,
	lastInputAt = performance.now(),
	lastTime = 0,
	toastUntil = 0,
	shake = 0;
let god = false,
	autopilot = false,
	debugPhysics = false,
	debugLines = null,
	onlineRoundDelay = 0,
	physicsSteps = 0,
	hitCount = 0,
	bounceCount = 0,
	wrapCount = 0,
	shotsFired = 0;
let inputKind = "keyboard",
	keys = new Set(),
	mouse = { x: 0, z: 0, down: false, active: false },
	touches = new Map(),
	leftStick = { x: 0, y: 0 },
	rightStick = { x: 0, y: 0 },
	touchBoost = false;
const pointerNdc = new THREE.Vector2(),
	raycaster = new THREE.Raycaster(),
	groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
	aimPoint = new THREE.Vector3();
let localInput = {},
	remoteInputs = new Map(),
	remoteStamp = new Map(),
	snapshotEvents = [],
	lastRemoteEvent = 0;
let cameraTargetX = -8,
	cameraX = -8,
	networkStarted = false,
	networkEnded = false,
	ready = false,
	gamepadPrevious = [],
	focusIndex = 0,
	navCooldown = 0;
let _grassGeo,
	_starTexture,
	aimLine,
	aimDot,
	aimGeo,
	_arenaSeed = 1977;
const stats = {
	stagesVisited: new Set(),
	mechanics: { direct: 0, bank: 0, guided: 0, hidden: 0, jet: 0 },
	collisions: 0,
};

const network = new GameNetwork({
	onStart(_info) {
		networkStarted = true;
		couch = false;
		startGame("circuit", 0, false, true);
	},
	onInput(id, i) {
		remoteInputs.set(id, i);
		remoteStamp.set(id, performance.now());
	},
	onSnapshot(s) {
		applySnapshot(s);
	},
	onEnd(reason) {
		networkEnded = true;
		if (!network.active)
			for (const [id, value] of Object.entries(network.lastScores))
				totals[+id] = value;
		audio.stop();
		audio.mute(true);
		if (mode === "play" || mode === "waiting" || mode === "finished") {
			mode = "finished";
			paused = false;
			showResult(true, reason);
		}
	},
	onLeave(id) {
		const e = entities.find((e) => e.id === id);
		if (e) e.ai = true;
		toast("A CADET LEFT\nAUTOPILOT ENGAGED", 2);
	},
	onStatus(message) {
		$("networkStatus").textContent = message;
	},
});

function toon(color) {
	const ramp = new Uint8Array([95, 165, 235, 255]);
	const tex = new THREE.DataTexture(ramp, 4, 1, THREE.RedFormat);
	tex.minFilter = tex.magFilter = THREE.NearestFilter;
	tex.needsUpdate = true;
	const m = new THREE.MeshToonMaterial({ color, gradientMap: tex });
	return m;
}
const mats = {};
function mat(color) {
	if (!mats[color]) mats[color] = toon(color);
	return mats[color];
}
const outlineMat = new THREE.MeshBasicMaterial({
	color: INK,
	side: THREE.BackSide,
});
function mesh(geo, color, parent, x = 0, y = 0, z = 0, outline = true) {
	const m = new THREE.Mesh(geo, mat(color));
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline) {
		const o = new THREE.Mesh(geo, outlineMat);
		o.scale.setScalar(1.045);
		o.castShadow = false;
		m.add(o);
	}
	parent?.add(m);
	return m;
}
function box(w, h, d, color, parent, x = 0, y = 0, z = 0, outline = true) {
	return mesh(new THREE.BoxGeometry(w, h, d), color, parent, x, y, z, outline);
}
function cyl(
	r1,
	r2,
	h,
	color,
	parent,
	x = 0,
	y = 0,
	z = 0,
	n = 10,
	outline = true,
) {
	return mesh(
		new THREE.CylinderGeometry(r1, r2, h, n),
		color,
		parent,
		x,
		y,
		z,
		outline,
	);
}
function labelTexture(text, color = "#173a3a", bg = null, size = 128) {
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const cx = c.getContext("2d");
	if (bg) {
		cx.fillStyle = bg;
		cx.fillRect(0, 0, size, size);
	}
	cx.fillStyle = color;
	cx.textAlign = "center";
	cx.textBaseline = "middle";
	cx.font = `900 ${Math.floor(size * 0.68)}px Arial`;
	cx.fillText(text, size / 2, size / 2 + 3);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	return tx;
}
function decal(parent, text, x, y, z, size = 1, color = "#fff0cf") {
	const p = new THREE.Mesh(
		new THREE.PlaneGeometry(size, size),
		new THREE.MeshBasicMaterial({
			map: labelTexture(text, color),
			transparent: true,
			depthWrite: false,
		}),
	);
	p.rotation.x = -Math.PI / 2;
	p.position.set(x, y, z);
	parent.add(p);
	return p;
}
function fixedCollider(x, z, w, d, wall = true) {
	const c = world.createCollider(
		RAPIER.ColliderDesc.cuboid(w / 2, 1.8, d / 2)
			.setTranslation(x, 1, z)
			.setRestitution(1)
			.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
			.setFriction(0)
			.setCollisionGroups(0x00010003)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
	);
	if (wall) wallHandles.add(c.handle);
	return c;
}
function wall(x, z, w, d, color = 0xe4a47d) {
	walls.push({ x, z, w, d });
	fixedCollider(x, z, w, d);
	const b = box(w, 1.45, d, color, arena, x, 0.72, z);
	const _cap = box(w + 0.07, 0.12, d + 0.07, 0xffd2a0, arena, x, 1.49, z);
	for (let k = -w / 2 + 1; k < w / 2; k += 1.7)
		box(0.045, 0.03, d + 0.08, 0x996e59, arena, x + k, 1.565, z, false);
	for (let k = -d / 2 + 1; k < d / 2; k += 1.7)
		box(w + 0.08, 0.03, 0.045, 0x996e59, arena, x, 1.565, z + k, false);
	return b;
}
function tree(x, z, s = 1) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.scale.setScalar(s);
	decoration.add(g);
	cyl(0.13, 0.2, 1.4, 0x9b7050, g, 0, 0.7, 0, 6);
	for (const [y, r, c] of [
		[1.4, 0.9, 0x4e8c6c],
		[2, 0.72, 0x69a87a],
		[2.6, 0.5, 0x94bf89],
	])
		mesh(new THREE.ConeGeometry(r, 1.3, 5), c, g, 0, y, 0);
	const sh = new THREE.Mesh(
		new THREE.CircleGeometry(0.9, 12),
		new THREE.MeshBasicMaterial({
			color: 0x608d6a,
			transparent: true,
			opacity: 0.24,
			depthWrite: false,
		}),
	);
	sh.rotation.x = -Math.PI / 2;
	sh.position.y = 0.025;
	g.add(sh);
}
function flag(x, z, color) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	decoration.add(g);
	cyl(0.035, 0.035, 2.8, 0x234c45, g, 0, 1.4, 0, 6, false);
	const shape = new THREE.Shape();
	shape.moveTo(0, 0);
	shape.lineTo(1, 0);
	shape.lineTo(0.77, -0.35);
	shape.lineTo(1, -0.7);
	shape.lineTo(0, -0.7);
	const f = mesh(new THREE.ShapeGeometry(shape), color, g, 0, 2.7, 0, false);
	f.material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
	f.rotation.y = 0.2;
}
function makeTerrain() {
	terrain = new THREE.Group();
	scene.add(terrain);
	decoration = new THREE.Group();
	terrain.add(decoration);
	box(35.7, 1.25, 25.7, 0xb67f60, terrain, 0, -0.85, 0);
	box(36, 0.25, 26, 0x234f47, terrain, 0, -0.13, 0);
	box(34.7, 0.14, 24.7, 0xa5bd80, terrain, 0, 0.02, 0);
	box(32, 0.03, 22, 0xd9cc93, terrain, 0, 0.11, 0, false);
	// A cartographer’s pencil grid and perimeter trail.
	const grid = new THREE.GridHelper(32, 16, 0xb4ad7e, 0xc4bb88);
	grid.position.y = 0.14;
	grid.scale.z = 22 / 32;
	terrain.add(grid);
	for (let x = -15.4; x <= 15.4; x += 1.2) {
		box(0.48, 0.025, 0.11, 0xf6edbb, terrain, x, 0.17, -10.35, false);
		box(0.48, 0.025, 0.11, 0xf6edbb, terrain, x, 0.17, 10.35, false);
	}
	for (let z = -9.5; z <= 9.5; z += 1.2) {
		box(0.11, 0.025, 0.48, 0xf6edbb, terrain, -15.35, 0.17, z, false);
		box(0.11, 0.025, 0.48, 0xf6edbb, terrain, 15.35, 0.17, z, false);
	}
	// Painted deployment circles.
	for (const [x, z, c] of [
		[-11, 6, 0x4c9d85],
		[11, -6, 0xc77a59],
	]) {
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(1.5, 1.57, 40),
			new THREE.MeshBasicMaterial({ color: c }),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.set(x, 0.155, z);
		terrain.add(ring);
		decal(
			terrain,
			"+",
			x,
			0.16,
			z,
			1.2,
			c === 0x4c9d85 ? "#4c9d85" : "#c77a59",
		);
	}
	// Thin blue paper river beyond the upper edge.
	box(35, 0.08, 1.05, 0x549e96, terrain, 0, 0.08, -11.85, false);
	for (let i = 0; i < 30; i++)
		box(
			rng(0.2, 0.8),
			0.02,
			0.025,
			0x9dd9c0,
			terrain,
			rng(-17, 17),
			0.14,
			rng(-12.2, -11.4),
			false,
		);
	for (let i = 0; i < 34; i++) {
		let x = rng(-17.1, 17.1),
			z = i % 2 ? rng(11.25, 12) : rng(-12.7, -12.3);
		if (i % 3 === 0) {
			x = i % 2 ? rng(16.4, 17) : rng(-17, -16.4);
			z = rng(-10, 10);
		}
		tree(x, z, rng(0.55, 0.95));
	}
	for (let i = 0; i < 110; i++) {
		const x = rng(-16.9, 16.9),
			z = rng(-12.5, 12.5);
		if (Math.abs(x) < 15.8 && Math.abs(z) < 10.9) continue;
		const blades = new THREE.Group();
		blades.position.set(x, 0.17, z);
		decoration.add(blades);
		for (let j = 0; j < 3; j++) {
			const b = box(
				0.04,
				rng(0.13, 0.36),
				0.04,
				0x457c5c,
				blades,
				(j - 1) * 0.09,
				0.1,
				0,
				false,
			);
			b.rotation.z = (j - 1) * 0.3;
		}
	}
	flag(-16, 8, 0x62d9bc);
	flag(16, -8, 0xff8256);
	flag(-16, -8, 0xf8d16d);
	flag(16, 8, 0xf8d16d);
	for (const x of [-16.1, 16.1])
		for (let z = -7; z <= 7; z += 3.5) {
			cyl(0.32, 0.4, 0.7, 0x6e8c65, decoration, x, 0.48, z, 8);
			box(0.45, 0.04, 0.03, 0xffe6ad, decoration, x, 0.85, z, false);
		}
	decal(terrain, "N", 0, 0.18, -10.7, 0.6, "#617c60");
	decal(terrain, "01", -14, 0.18, 9, 0.8, "#79936c");
	decal(terrain, "77", 14, 0.18, -9, 0.8, "#79936c");
	const cross = new THREE.Group();
	cross.position.set(0, 0.16, 0);
	terrain.add(cross);
	box(1, 0.02, 0.025, 0xa5a076, cross, 0, 0, 0, false);
	box(0.025, 0.02, 1, 0xa5a076, cross, 0, 0, 0, false);
	// Table beneath the cartridge diorama.
	const bg = new THREE.Mesh(
		new THREE.PlaneGeometry(500, 500),
		new THREE.MeshBasicMaterial({ color: 0x214e4c }),
	);
	bg.rotation.x = -Math.PI / 2;
	bg.position.y = -2.1;
	scene.add(bg);
}
function clearWorld() {
	if (arena) scene.remove(arena);
	entities.forEach((e) => {
		scene.remove(e.group);
		e.mixer.stopAllAction();
	});
	bullets.forEach((b) => {
		scene.remove(b.mesh);
	});
	particles.forEach((p) => {
		scene.remove(p.mesh);
	});
	tracks.forEach((t) => {
		scene.remove(t.mesh);
	});
	clouds.forEach((c) => {
		scene.remove(c);
	});
	entities = [];
	bullets = [];
	particles = [];
	tracks = [];
	clouds = [];
	mixers = [];
	walls = [];
	wallHandles.clear();
	tankHandles.clear();
	bulletHandles.clear();
	if (world) world.free();
	world = new RAPIER.World({ x: 0, y: 0, z: 0 });
	events = new RAPIER.EventQueue(true);
	world.timestep = 1 / 60;
	arena = new THREE.Group();
	scene.add(arena);
}
function makeArena(index) {
	clearWorld();
	stageIndex = index;
	const s = stages[index];
	terrain.visible = !s.jet;
	if (!s.jet) {
		wall(0, -11, 32.8, 0.65, 0x789d78);
		wall(0, 11, 32.8, 0.65, 0x789d78);
		wall(-16, 0, 0.65, 22.8, 0x789d78);
		wall(16, 0, 0.65, 22.8, 0x789d78);
		if (s.layout === 0) {
			wall(-5, 0, 2, 5);
			wall(5, 0, 2, 5);
			wall(0, -6, 5, 1.3);
			wall(0, 6, 5, 1.3);
		}
		if (s.layout === 1) {
			wall(-6, -4, 6, 1.4);
			wall(6, 4, 6, 1.4);
			wall(-6, 4, 1.4, 4);
			wall(6, -4, 1.4, 4);
			wall(0, 0, 1.6, 5);
			wall(-11, 0, 2, 1.4);
			wall(11, 0, 2, 1.4);
		}
		if (s.layout === 2) {
			wall(-7, 0, 1.4, 9);
			wall(7, 0, 1.4, 9);
			wall(0, -5, 6, 1.4);
			wall(0, 5, 6, 1.4);
		}
	} else {
		box(35, 0.6, 25, 0x5da9aa, arena, 0, -0.65, 0);
		box(34.8, 0.05, 24.8, 0x8cc8c0, arena, 0, -0.3, 0, false);
		for (let i = 0; i < 36; i++) {
			box(
				rng(0.4, 2),
				0.025,
				0.04,
				0xd7e9cf,
				arena,
				rng(-17, 17),
				-0.25,
				rng(-12, 12),
				false,
			);
		}
		for (let i = 0; i < 7; i++) {
			const g = new THREE.Group();
			g.position.set(-12 + i * 4, rng(2.7, 4.2), Math.sin(i * 4) * 6);
			g.userData = { x: g.position.x, z: g.position.z, r: 2.1 };
			for (let j = 0; j < 4; j++)
				mesh(
					new THREE.IcosahedronGeometry(rng(0.8, 1.5), 1),
					0xf6eed7,
					g,
					(j - 1.5) * 0.8,
					rng(-0.1, 0.25),
					rng(-0.5, 0.5),
					false,
				);
			scene.add(g);
			clouds.push(g);
		}
		for (let i = 0; i < 8; i++) {
			const g = new THREE.Group();
			g.position.set(rng(-15, 15), -0.15, rng(-10, 10));
			arena.add(g);
			cyl(rng(0.5, 1), rng(0.8, 1.6), 0.2, 0xd6d49d, g);
			treeIsland(g);
		}
	}
	const players = network.online ? network.players.map((p) => p.id) : [0, 1];
	if (players.length === 1) players.push(players[0] === 0 ? 1 : 0);
	for (let i = 0; i < players.length; i++) {
		const id = players[i],
			p = network.players.find((p) => p.id === id);
		const e = createVehicle(id, i, s.jet);
		e.ai = network.online ? !p : !(id === 0 || (id === 1 && couch));
		if (network.server && id === network.me) e.ai = true;
		entities.push(e);
	}
	stats.stagesVisited.add(index);
	roundElapsed = 0;
	roundLeft = tune.roundTime;
	roundOver = false;
	onlineRoundDelay = 0;
	scores = [0, 0, 0, 0];
	updateHUD();
}
function treeIsland(g) {
	for (let i = 0; i < 3; i++) {
		const _t = mesh(
			new THREE.ConeGeometry(0.3, 0.8, 5),
			0x4f936f,
			g,
			rng(-0.5, 0.5),
			0.5,
			rng(-0.4, 0.4),
		);
	}
}
function createVehicle(id, seat, jet) {
	const group = new THREE.Group();
	scene.add(group);
	const heading = seat % 2 ? Math.PI / 2 : -Math.PI / 2;
	const x = seat % 2 ? 11 : -11,
		z = seat < 2 ? (seat % 2 ? -6 : 6) : seat % 2 ? 6 : -6;
	const rig = new THREE.Group();
	rig.name = "rig";
	group.add(rig);
	const hull = new THREE.Group();
	hull.name = "hull";
	rig.add(hull);
	const col = COLORS[id % 4];
	let turret, barrel, _wing;
	if (!jet) {
		box(1.45, 0.45, 1.9, col, hull, 0, 0.67, 0);
		box(1.2, 0.14, 1.6, 0xbae5bc, hull, 0, 0.98, 0);
		for (const side of [-1, 1]) {
			box(0.38, 0.52, 2.08, 0x284b47, hull, side * 0.84, 0.45, 0);
			for (let k = -0.8; k <= 0.8; k += 0.32) {
				box(0.42, 0.12, 0.11, 0x58786a, hull, side * 0.84, 0.74, k, false);
				const wheel = cyl(
					0.19,
					0.19,
					0.41,
					0x75927a,
					hull,
					side * 0.86,
					0.3,
					k,
					8,
					false,
				);
				wheel.rotation.z = Math.PI / 2;
			}
		}
		turret = new THREE.Group();
		turret.name = "turret";
		turret.position.y = 1.08;
		rig.add(turret);
		cyl(0.56, 0.64, 0.35, col, turret, 0, 0, 0, 8);
		cyl(0.24, 0.29, 0.14, 0xc5e4b7, turret, 0, 0.24, 0.1, 8);
		barrel = new THREE.Group();
		barrel.name = "barrel";
		turret.add(barrel);
		box(0.23, 0.23, 1.35, 0x345d50, barrel, 0, 0.03, -0.91);
		box(0.36, 0.31, 0.29, 0x294d46, barrel, 0, 0.03, -1.56);
		box(0.19, 0.14, 0.025, 0x102d30, barrel, 0, 0.03, -1.72, false);
		decal(hull, "★", 0, 1.06, 0.52, 0.48);
		const antenna = cyl(
			0.018,
			0.018,
			1,
			0x243f39,
			hull,
			-0.44,
			1.34,
			0.55,
			5,
			false,
		);
		antenna.rotation.z = -0.1;
		mesh(
			new THREE.SphereGeometry(0.055, 5, 4),
			0xffd176,
			hull,
			-0.49,
			1.86,
			0.55,
			false,
		);
	} else {
		const body = mesh(
			new THREE.ConeGeometry(0.42, 2.8, 5),
			col,
			hull,
			0,
			0.6,
			0,
		);
		body.rotation.x = -Math.PI / 2;
		box(3, 0.12, 0.85, col, hull, 0, 0.55, 0.25);
		box(1.5, 0.12, 0.5, col, hull, 0, 0.67, 1);
		const _fin = box(0.1, 0.7, 0.7, 0xe7dcb6, hull, 0, 1.02, 0.94);
		const cockpit = mesh(
			new THREE.SphereGeometry(0.33, 8, 6),
			0x235766,
			hull,
			0,
			0.85,
			-0.45,
		);
		cockpit.scale.set(0.75, 0.5, 1.6);
		for (const sx of [-0.62, 0.62]) {
			box(0.23, 0.23, 1.3, 0x385c55, hull, sx, 0.52, 0.47);
			cyl(0.14, 0.18, 0.1, 0xffc96c, hull, sx, 0.52, 1.14, 8);
		}
		decal(hull, "★", -0.95, 0.63, 0.2, 0.54);
		turret = rig;
		barrel = new THREE.Group();
		barrel.name = "barrel";
		rig.add(barrel);
	}
	const ring = new THREE.Mesh(
		new THREE.RingGeometry(0.92, 1.02, 40),
		new THREE.MeshBasicMaterial({
			color: col,
			transparent: true,
			opacity: 0.7,
			depthWrite: false,
		}),
	);
	ring.rotation.x = -Math.PI / 2;
	ring.position.y = 0.18;
	group.add(ring);
	decal(group, String(id + 1), 0, 0.18, 1.45, 0.6, "#173a3a");
	const mixer = new THREE.AnimationMixer(rig);
	const recoil = new THREE.AnimationClip("fire", 0.22, [
		new THREE.NumberKeyframeTrack(
			"barrel.position[z]",
			[0, 0.05, 0.22],
			[0, 0.28, 0],
		),
		new THREE.NumberKeyframeTrack(
			"hull.rotation[x]",
			[0, 0.05, 0.22],
			[0, -0.09, 0],
		),
	]);
	const hitClip = new THREE.AnimationClip("hit", 0.65, [
		new THREE.NumberKeyframeTrack(
			"hull.rotation[z]",
			[0, 0.1, 0.24, 0.4, 0.65],
			[0, 0.35, -0.32, 0.16, 0],
		),
		new THREE.NumberKeyframeTrack(
			"hull.position[y]",
			[0, 0.12, 0.35, 0.65],
			[0, 0.6, 0.2, 0],
		),
	]);
	const bankClip = new THREE.AnimationClip("flight", 2, [
		new THREE.NumberKeyframeTrack("hull.position[y]", [0, 1, 2], [0, 0.1, 0]),
	]);
	if (jet) mixer.clipAction(bankClip).play();
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(x, 0.65, z)
			.setLinearDamping(3)
			.setAngularDamping(10)
			.enabledTranslations(true, false, true)
			.enabledRotations(false, false, false)
			.setCcdEnabled(true),
	);
	const collider = world.createCollider(
		RAPIER.ColliderDesc.ball(0.72)
			.setFriction(0)
			.setRestitution(0.1)
			.setCollisionGroups(jet ? 0x00010002 : 0x00010003)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		body,
	);
	tankHandles.set(collider.handle, id);
	const e = {
		id,
		seat,
		group,
		rig,
		hull,
		turret,
		barrel,
		mixer,
		recoil,
		hitClip,
		body,
		collider,
		x,
		z,
		heading,
		aim: heading,
		cooldown: 0,
		ability: 0,
		boost: 0,
		stun: 0,
		invuln: 1.6,
		reveal: 2,
		jet,
		ai: false,
		trail: 0,
		aiPhase: rng(0, TAU),
		lastShot: 0,
		input: {},
		bankAngle: 0,
	};
	group.position.set(x, 0, z);
	rig.rotation.y = heading;
	mixers.push(mixer);
	return e;
}
function playClip(e, clip) {
	const a = e.mixer.clipAction(clip);
	a.reset();
	a.setLoop(THREE.LoopOnce, 1);
	a.clampWhenFinished = false;
	a.play();
}
function bullet(e) {
	if (e.cooldown > 0 || e.stun > 0) return;
	const owned = bullets.filter((b) => b.owner === e.id);
	if (owned.length >= 3) return;
	e.cooldown = tune.reload;
	e.reveal = 1.3;
	e.lastShot = elapsed;
	const dir = { x: -Math.sin(e.aim), z: -Math.cos(e.aim) };
	const clearance = trace(e.x, e.z, e.aim, 1.86, 0, 0).segments[0];
	if (Math.hypot(clearance.bx - e.x, clearance.bz - e.z) < 1.85) {
		effect(clearance.bx, 1, clearance.bz, 0xffd477, 7, 0.4);
		playClip(e, e.recoil);
		audio.shot(e.id);
		return;
	}
	const x = e.x + dir.x * 1.85,
		z = e.z + dir.z * 1.85;
	const m = new THREE.Group();
	const core = mesh(
		new THREE.SphereGeometry(0.19, 7, 5),
		stages[stageIndex].bank ? 0xb5a97a : 0xffe28a,
		m,
		0,
		0,
		0,
	);
	const _trail = box(0.12, 0.12, 0.7, COLORS[e.id % 4], m, 0, 0, 0.35, false);
	m.position.set(x, e.jet ? 0.7 : 1.13, z);
	m.rotation.y = e.aim;
	scene.add(m);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(x, 0.7, z)
			.setLinvel(dir.x * tune.shellSpeed, 0, dir.z * tune.shellSpeed)
			.enabledTranslations(true, false, true)
			.enabledRotations(false, false, false)
			.setGravityScale(0)
			.setCcdEnabled(true),
	);
	const collider = world.createCollider(
		RAPIER.ColliderDesc.ball(0.18)
			.setRestitution(1)
			.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
			.setFriction(0)
			.setCollisionGroups(0x00020001)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		body,
	);
	const b = {
		id: ++serial,
		owner: e.id,
		mesh: m,
		core,
		body,
		collider,
		x,
		z,
		angle: e.aim,
		life: 3.8,
		bounces: 0,
		lastBounce: -1,
		remove: false,
	};
	bullets.push(b);
	bulletHandles.set(collider.handle, b);
	shotsFired++;
	playClip(e, e.recoil);
	audio.shot(e.id);
	effect(x, 1, z, COLORS[e.id % 4], 5, 0.28);
	emit("shot", x, z, e.id);
}
function effect(x, y, z, color, count = 12, force = 1) {
	for (let i = 0; i < count; i++) {
		const m = mesh(
			new THREE.BoxGeometry(rng(0.07, 0.22), rng(0.07, 0.22), rng(0.07, 0.22)),
			color,
			null,
			0,
			0,
			0,
			false,
		);
		m.position.set(x, y, z);
		scene.add(m);
		particles.push({
			mesh: m,
			vx: rng(-4, 4) * force,
			vy: rng(1.5, 5) * force,
			vz: rng(-4, 4) * force,
			life: rng(0.2, 0.65),
			total: 0.65,
		});
	}
}
function ringEffect(x, z, color, radius = 4) {
	const m = new THREE.Mesh(
		new THREE.RingGeometry(0.95, 1, 48),
		new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: 0.8,
			depthWrite: false,
		}),
	);
	m.rotation.x = -Math.PI / 2;
	m.position.set(x, 0.2, z);
	scene.add(m);
	particles.push({
		mesh: m,
		vx: 0,
		vy: 0,
		vz: 0,
		life: 0.6,
		total: 0.6,
		ring: radius,
	});
}
function emit(t, x, z, id = 0) {
	snapshotEvents.push({
		n: ++serial,
		t,
		x: +x.toFixed(2),
		z: +z.toFixed(2),
		id,
	});
	if (snapshotEvents.length > 12) snapshotEvents.shift();
}
function ability(e) {
	if (e.ability > 0 || e.stun > 0) return;
	e.ability = 4.6;
	e.reveal = 1;
	if (stages[stageIndex].hidden) {
		for (const v of entities) if (v.id !== e.id) v.reveal = 2.7;
		ringEffect(e.x, e.z, COLORS[e.id % 4], 12);
		toast("PING! FOUND YOU.", 1.1);
		audio.voice(4);
	} else {
		e.boost = 0.35;
		ringEffect(e.x, e.z, COLORS[e.id % 4], 3);
		audio.boost();
	}
	emit("boost", e.x, e.z, e.id);
}
function scoreHit(target, b) {
	const owner = entities.find((e) => e.id === b.owner);
	if (!owner || target.id === b.owner || target.invuln > 0 || roundOver)
		return false;
	if (stages[stageIndex].bank && b.bounces < 1) {
		ringEffect(target.x, target.z, 0xb6b18b, 1.2);
		return false;
	}
	if (god && target.id === 0) return false;
	if (mode === "title") {
		target.invuln = 2;
		target.stun = 0.5;
		playClip(target, target.hitClip);
		effect(target.x, 1, target.z, COLORS[target.id % 4], 16, 1.2);
		return true;
	}
	scores[b.owner]++;
	totals[b.owner]++;
	hitCount++;
	target.stun = 0.9;
	target.invuln = 2.2;
	target.reveal = 2.5;
	const dx = target.x - owner.x,
		dz = target.z - owner.z;
	const l = Math.hypot(dx, dz) || 1;
	target.body.setLinvel({ x: (dx / l) * 8, y: 0, z: (dz / l) * 8 }, true);
	playClip(target, target.hitClip);
	effect(target.x, 1, target.z, COLORS[target.id % 4], 28, 1.8);
	ringEffect(target.x, target.z, 0xffeab2, 2.5);
	audio.hit();
	shake = 0.38;
	emit("hit", target.x, target.z, b.owner);
	const m = stages[stageIndex];
	stats.mechanics[
		m.jet
			? "jet"
			: m.hidden
				? "hidden"
				: m.guided
					? "guided"
					: m.bank
						? "bank"
						: "direct"
	]++;
	if (!attract)
		toast(
			b.owner === myId()
				? b.bounces
					? "BANK SHOT!"
					: "GOOD HIT!"
				: "RETURN FIRE!",
			1.2,
		);
	updateHUD();
	if (scores[b.owner] >= tune.points) endRound();
	return true;
}
function removeBullet(b) {
	if (b.remove) return;
	b.remove = true;
	bulletHandles.delete(b.collider.handle);
	world.removeRigidBody(b.body);
	scene.remove(b.mesh);
}
function botInput(e) {
	const others = entities.filter((v) => v.id !== e.id);
	const target = others.sort(
		(a, b) =>
			Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z),
	)[0];
	if (!target) return {};
	const dif =
		settings.difficulty === "easy"
			? 0.6
			: settings.difficulty === "hard"
				? 1.22
				: 1;
	const dx = target.x - e.x,
		dz = target.z - e.z,
		dist = Math.hypot(dx, dz);
	const _ax = target.x,
		_az = target.z;
	const s = stages[stageIndex];
	let aim = Math.atan2(-dx, -dz);
	if (s.bank) {
		let best = null;
		for (const side of [-1, 1]) {
			const virtualX = side * 31.25 - target.x;
			const a = Math.atan2(-(virtualX - e.x), -dz);
			const test = trace(e.x, e.z, a, 60, 2);
			if (test.segments.length > 1) {
				const last = test.segments[1];
				const vx = last.bx - last.ax,
					vz = last.bz - last.az,
					t = clamp(
						((target.x - last.ax) * vx + (target.z - last.az) * vz) /
							(vx * vx + vz * vz),
						0,
						1,
					),
					dd = Math.hypot(
						last.ax + t * vx - target.x,
						last.az + t * vz - target.z,
					);
				if (!best || dd < best.dd) best = { a, dd };
			}
		}
		if (best) aim = best.a;
	}
	const err =
		((1 - tune.aiAccuracy) * Math.sin(elapsed * 1.3 + e.aiPhase) * 0.6) / dif;
	aim += err;
	const _orbit = Math.sin(elapsed * 0.65 + e.aiPhase);
	let mx = dx / (dist || 1),
		mz = dz / (dist || 1);
	if (dist < 6) {
		mx = -dz / (dist || 1);
		mz = dx / (dist || 1);
	} else if (dist < 9) {
		mx = mx * 0.4 - (dz / (dist || 1)) * 0.65;
		mz = mz * 0.4 + (dx / (dist || 1)) * 0.65;
	}
	for (const w of walls) {
		if (w.w > 30 || w.d > 20) continue;
		const nearX = clamp(e.x, w.x - w.w / 2 - 0.9, w.x + w.w / 2 + 0.9),
			nearZ = clamp(e.z, w.z - w.d / 2 - 0.9, w.z + w.d / 2 + 0.9);
		const ox = e.x - nearX,
			oz = e.z - nearZ,
			od = Math.hypot(ox, oz);
		if (od < 2.2) {
			const wx = e.x - w.x,
				wz = e.z - w.z;
			mx += (wx / (Math.abs(wx) + Math.abs(wz) + 0.1)) * 2.8;
			mz += (wz / (Math.abs(wx) + Math.abs(wz) + 0.1)) * 2.8;
			mx += -wz * 0.13;
			mz += wx * 0.13;
		}
	}
	if (Math.abs(e.x) > 13) mx -= Math.sign(e.x) * 2;
	if (Math.abs(e.z) > 8) mz -= Math.sign(e.z) * 2;
	const len = Math.hypot(mx, mz) || 1;
	return {
		mx: mx / len,
		mz: mz / len,
		ax: -Math.sin(aim),
		az: -Math.cos(aim),
		aim: true,
		fire: attract || autopilot || Math.sin(elapsed * 2.1 + e.aiPhase) > -0.4,
		boost:
			e.ability <= 0 &&
			(dist < 4 || s.hidden || Math.sin(elapsed + e.aiPhase) > 0.96),
	};
}
function moveEntity(e, input, dt) {
	e.input = input || {};
	e.cooldown = Math.max(0, e.cooldown - dt);
	e.ability = Math.max(0, e.ability - dt);
	e.boost = Math.max(0, e.boost - dt);
	e.invuln = Math.max(0, e.invuln - dt);
	e.reveal = Math.max(0, e.reveal - dt);
	e.stun = Math.max(0, e.stun - dt);
	let mx = clamp(+input.mx || 0, -1, 1),
		mz = clamp(+input.mz || 0, -1, 1);
	const len = Math.hypot(mx, mz);
	if (len > 1) {
		mx /= len;
		mz /= len;
	}
	if (input.aim && Math.hypot(input.ax, input.az) > 0.15) {
		let a = Math.atan2(-input.ax, -input.az);
		if (settings.assist && !e.ai && !stages[stageIndex].bank) {
			const tar = entities.find(
				(t) => t.id !== e.id && (t.reveal > 0 || !stages[stageIndex].hidden),
			);
			if (tar) {
				const d = Math.atan2(-(tar.x - e.x), -(tar.z - e.z));
				if (Math.abs(angleDiff(a, d)) < 0.12) a += angleDiff(a, d) * 0.23;
			}
		}
		e.aim += angleDiff(e.aim, a) * Math.min(1, dt * 20);
	} else if (len > 0.15)
		e.aim += angleDiff(e.aim, Math.atan2(-mx, -mz)) * Math.min(1, dt * 12);
	if (e.stun <= 0) {
		if (e.jet) {
			if (len > 0.15)
				e.heading +=
					angleDiff(e.heading, Math.atan2(-mx, -mz)) * Math.min(1, dt * 3.5);
			const speed = tune.speed * (e.boost > 0 ? 2.5 : 1.3);
			e.body.setLinvel(
				{
					x: -Math.sin(e.heading) * speed,
					y: 0,
					z: -Math.cos(e.heading) * speed,
				},
				true,
			);
			if (!input.aim) e.aim = e.heading;
		} else {
			if (len > 0.15)
				e.heading +=
					angleDiff(e.heading, Math.atan2(-mx, -mz)) * Math.min(1, dt * 11);
			const speed = tune.speed * (e.boost > 0 ? 2.6 : 1);
			e.body.setLinvel({ x: mx * speed, y: 0, z: mz * speed }, true);
		}
		if (input.fire) bullet(e);
		if (input.boost) ability(e);
	}
	e.trail -= dt;
	if (e.trail <= 0 && len > 0.15 && !e.jet) {
		e.trail = 0.12;
		addTrack(e);
	}
}
function addTrack(e) {
	if (tracks.length > 180) {
		scene.remove(tracks[0].mesh);
		tracks.shift();
	}
	const g = new THREE.Group();
	for (const side of [-1, 1])
		box(0.3, 0.01, 0.12, 0xad9b70, g, side * 0.7, 0, 0, false);
	g.position.set(e.x, 0.16, e.z);
	g.rotation.y = e.heading;
	scene.add(g);
	tracks.push({ mesh: g, life: 12 });
}
function physics(dt) {
	const s = stages[stageIndex];
	for (const e of entities) {
		let input;
		if (attract || e.ai || (e.id === 0 && autopilot)) input = botInput(e);
		else if (network.online && e.id !== network.me)
			input =
				performance.now() - (remoteStamp.get(e.id) || 0) < 400
					? remoteInputs.get(e.id) || {}
					: {};
		else if (network.online && network.server) input = {};
		else input = e.id === myId() ? localInput : readSecondInput();
		moveEntity(e, input, dt);
	}
	for (const b of bullets) {
		b.life -= dt;
		if (b.life <= 0) {
			removeBullet(b);
			continue;
		}
		const owner = entities.find((e) => e.id === b.owner);
		if (s.guided && owner?.input.fire) {
			const v = b.body.linvel(),
				a = Math.atan2(-v.x, -v.z),
				next = a + clamp(angleDiff(a, owner.aim), -dt * 2.2, dt * 2.2);
			b.body.setLinvel(
				{
					x: -Math.sin(next) * tune.shellSpeed,
					y: 0,
					z: -Math.cos(next) * tune.shellSpeed,
				},
				true,
			);
		}
	}
	world.step(events);
	physicsSteps++;
	events.drainCollisionEvents((h1, h2, started) => {
		if (!started) return;
		stats.collisions++;
		const b = bulletHandles.get(h1) || bulletHandles.get(h2);
		const other = bulletHandles.has(h1) ? h2 : h1;
		if (b && !b.remove) {
			const tankId = tankHandles.get(other);
			if (tankId !== undefined) {
				const target = entities.find((e) => e.id === tankId);
				if (target && target.id !== b.owner) {
					scoreHit(target, b);
					removeBullet(b);
				}
			} else if (wallHandles.has(other)) {
				if (elapsed - b.lastBounce > 0.04) {
					b.lastBounce = elapsed;
					b.bounces++;
					bounceCount++;
					b.core.material = mat(0xffe58f);
					audio.bounce();
					const p = b.body.translation();
					effect(p.x, 1, p.z, 0xffd872, 7, 0.5);
					emit("bounce", p.x, p.z, b.owner);
					if (b.bounces > s.bounces) removeBullet(b);
				}
			}
		} else {
			const id = tankHandles.get(h1) ?? tankHandles.get(h2);
			if (id !== undefined && (wallHandles.has(h1) || wallHandles.has(h2))) {
				const e = entities.find((v) => v.id === id);
				if (e) e.reveal = Math.max(e.reveal, 0.8);
			}
		}
	});
	bullets = bullets.filter((b) => !b.remove);
	for (const e of entities) {
		const p = e.body.translation();
		e.x = p.x;
		e.z = p.z;
		if (s.jet && (Math.abs(e.x) > 16 || Math.abs(e.z) > 11)) {
			e.x = e.x > 16 ? -15.8 : e.x < -16 ? 15.8 : e.x;
			e.z = e.z > 11 ? -10.8 : e.z < -11 ? 10.8 : e.z;
			e.body.setTranslation({ x: e.x, y: 0.65, z: e.z }, true);
			wrapCount++;
		} else if (!s.jet && (Math.abs(e.x) > 16.4 || Math.abs(e.z) > 11.4)) {
			e.x = clamp(e.x, -14.8, 14.8);
			e.z = clamp(e.z, -9.8, 9.8);
			e.body.setTranslation({ x: e.x, y: 0.65, z: e.z }, true);
		}
	}
	for (const b of bullets) {
		const p = b.body.translation();
		b.x = p.x;
		b.z = p.z;
		const v = b.body.linvel();
		b.angle = Math.atan2(-v.x, -v.z);
		if (s.jet && (Math.abs(b.x) > 17 || Math.abs(b.z) > 12)) removeBullet(b);
	}
	bullets = bullets.filter((b) => !b.remove);
	if (!roundOver) {
		roundLeft -= dt;
		roundElapsed += dt;
		if (roundLeft <= 0) endRound();
	}
}
function trace(x, z, a, length = 45, maxBounce = 0, start = 1.8) {
	const segments = [];
	let dx = -Math.sin(a),
		dz = -Math.cos(a),
		px = x + dx * start,
		pz = z + dz * start;
	for (let i = 0; i <= maxBounce; i++) {
		let best = length,
			nx = 0,
			nz = 0;
		for (const w of walls) {
			const xmin = w.x - w.w / 2 - 0.18,
				xmax = w.x + w.w / 2 + 0.18,
				zmin = w.z - w.d / 2 - 0.18,
				zmax = w.z + w.d / 2 + 0.18;
			const tx1 = (xmin - px) / (dx || 1e-8),
				tx2 = (xmax - px) / (dx || 1e-8),
				tz1 = (zmin - pz) / (dz || 1e-8),
				tz2 = (zmax - pz) / (dz || 1e-8);
			const tmin = Math.max(Math.min(tx1, tx2), Math.min(tz1, tz2)),
				tmax = Math.min(Math.max(tx1, tx2), Math.max(tz1, tz2));
			if (tmax >= Math.max(0, tmin) && tmin > 0.015 && tmin < best) {
				best = tmin;
				if (Math.min(tx1, tx2) > Math.min(tz1, tz2)) {
					nx = dx > 0 ? -1 : 1;
					nz = 0;
				} else {
					nx = 0;
					nz = dz > 0 ? -1 : 1;
				}
			}
		}
		const bx = px + dx * best,
			bz = pz + dz * best;
		segments.push({ ax: px, az: pz, bx, bz });
		if (best === length) break;
		length -= best;
		const dot = dx * nx + dz * nz;
		dx -= 2 * dot * nx;
		dz -= 2 * dot * nz;
		px = bx + dx * 0.03;
		pz = bz + dz * 0.03;
	}
	return { segments };
}
function makeSight() {
	aimGeo = new THREE.BufferGeometry();
	aimGeo.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(new Float32Array(180), 3),
	);
	aimLine = new THREE.LineSegments(
		aimGeo,
		new THREE.LineDashedMaterial({
			color: 0xfff0cf,
			dashSize: 0.35,
			gapSize: 0.22,
			transparent: true,
			opacity: 0.7,
			depthTest: false,
		}),
	);
	aimLine.renderOrder = 9;
	scene.add(aimLine);
	aimDot = new THREE.Mesh(
		new THREE.RingGeometry(0.22, 0.29, 20),
		new THREE.MeshBasicMaterial({
			color: 0xffedc3,
			depthTest: false,
			transparent: true,
			opacity: 0.8,
		}),
	);
	aimDot.rotation.x = -Math.PI / 2;
	scene.add(aimDot);
}
function drawSight() {
	const e = entities.find((e) => e.id === myId());
	if (!e || mode !== "play" || attract || paused) {
		aimLine.visible = aimDot.visible = false;
		return;
	}
	aimLine.visible = aimDot.visible = true;
	const t = trace(
		e.x,
		e.z,
		e.aim,
		stages[stageIndex].jet ? 11 : 23,
		stages[stageIndex].bounces > 0 ? 1 : 0,
	);
	const arr = aimGeo.attributes.position.array;
	let n = 0;
	for (const seg of t.segments) {
		arr[n++] = seg.ax;
		arr[n++] = 0.28;
		arr[n++] = seg.az;
		arr[n++] = seg.bx;
		arr[n++] = 0.28;
		arr[n++] = seg.bz;
	}
	aimGeo.setDrawRange(0, n / 3);
	aimGeo.attributes.position.needsUpdate = true;
	aimLine.computeLineDistances();
	const seg = t.segments.at(-1);
	aimDot.position.set(clamp(seg.bx, -16, 16), 0.29, clamp(seg.bz, -11, 11));
}
function animateVisuals(dt) {
	for (const e of entities) {
		e.group.position.set(e.x, 0, e.z);
		e.rig.rotation.y = e.heading;
		if (!e.jet) e.turret.rotation.y = e.aim - e.heading;
		else
			e.hull.rotation.z = mix(
				e.hull.rotation.z,
				clamp(angleDiff(e.heading, e.aim), -0.5, 0.5) * 0.55,
				dt * 5,
			);
		e.mixer.update(dt);
		const s = stages[stageIndex];
		let visible = true;
		if (s.hidden && e.id !== myId() && e.reveal <= 0) visible = false;
		if (
			s.jet &&
			e.id !== myId() &&
			clouds.some(
				(c) => Math.hypot(e.x - c.position.x, e.z - c.position.z) < 2.3,
			)
		)
			visible = false;
		e.group.visible = visible;
		if (e.invuln > 0 && Math.sin(elapsed * 25) > 0)
			e.hull.scale.setScalar(0.94);
		else e.hull.scale.setScalar(1);
		if (s.hidden && e.id === myId() && e.reveal <= 0)
			e.hull.scale.setScalar(0.84);
	}
	for (const b of bullets) {
		b.mesh.position.set(b.x, stages[stageIndex].jet ? 0.7 : 1.13, b.z);
		b.mesh.rotation.y = b.angle;
	}
	for (const p of particles) {
		p.life -= dt;
		if (p.ring) {
			const v = 1 - p.life / p.total;
			p.mesh.scale.setScalar(1 + v * p.ring);
			p.mesh.material.opacity = Math.max(0, p.life / p.total) * 0.8;
		} else {
			p.vy -= 14 * dt;
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.y += p.vy * dt;
			p.mesh.position.z += p.vz * dt;
			p.mesh.rotation.x += dt * 6;
			p.mesh.rotation.z += dt * 4;
			p.mesh.scale.setScalar(Math.max(0.01, p.life / 0.4));
		}
		if (p.life <= 0) scene.remove(p.mesh);
	}
	particles = particles.filter((p) => p.life > 0);
	for (const t of tracks) {
		t.life -= dt;
		if (t.life <= 0) scene.remove(t.mesh);
	}
	tracks = tracks.filter((t) => t.life > 0);
	clouds.forEach((c, i) => {
		c.position.x += dt * 0.15;
		if (c.position.x > 18) c.position.x = -18;
		c.position.y += Math.sin(elapsed * 0.5 + i) * dt * 0.025;
	});
	cameraX = mix(cameraX, cameraTargetX, Math.min(1, dt * 3));
	const aspect = innerWidth / innerHeight;
	const span = aspect < 1 ? 38 / aspect : 30;
	camera.left = (-span * aspect) / 2;
	camera.right = (span * aspect) / 2;
	camera.top = span / 2;
	camera.bottom = -span / 2;
	camera.updateProjectionMatrix();
	const sx = settings.shake && shake > 0 ? rng(-shake, shake) : 0,
		sz = settings.shake && shake > 0 ? rng(-shake, shake) : 0;
	camera.position.set(cameraX + sx, 33, 24 + sz);
	camera.lookAt(cameraX, 0, 0);
	shake = Math.max(0, shake - dt * 1.5);
	drawSight();
	if (debugPhysics && world) {
		const { vertices, colors } = world.debugRender();
		if (debugLines) scene.remove(debugLines);
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
		geo.setAttribute("color", new THREE.BufferAttribute(colors, 4));
		debugLines = new THREE.LineSegments(
			geo,
			new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
		);
		debugLines.renderOrder = 10;
		scene.add(debugLines);
	} else if (debugLines) {
		scene.remove(debugLines);
		debugLines = null;
	}
}

function myId() {
	return network.online ? network.me : 0;
}
function startGame(
	type = "circuit",
	index = 0,
	isAttract = false,
	online = false,
) {
	if (network.active && !online) return;
	gameType = type;
	attract = isAttract;
	mode = "play";
	paused = false;
	stack = [];
	totals = [0, 0, 0, 0];
	roundsWon = 0;
	roundOver = false;
	accum = 0;
	makeArena(index);
	closeScreens();
	cameraTargetX = 0;
	$("hud").classList.add("on");
	$("veil").classList.add("off");
	$("attractLabel").classList.toggle("on", attract);
	document.body.classList.add("playing");
	if (!attract) {
		toast(`${stages[index].name}\n${stages[index].desc}`, 3.3);
		audio.voice(index + 1);
	}
	updateHUD();
}
function title() {
	if (network.active) return;
	if (network.online) {
		network.close();
		network.online = false;
		network.started = false;
		network.ended = false;
		network.finished = false;
		network.me = 0;
		network.isHost = true;
		network.players = [{ id: 0, name: "Cadet 1" }];
	}
	networkEnded = false;
	audio.mute(false);
	audio.musicEnabled = true;
	mode = "title";
	attract = false;
	paused = false;
	couch = false;
	gameType = "circuit";
	cameraTargetX = innerWidth / innerHeight < 1 ? -5 : -8;
	makeArena(1);
	entities.forEach((e) => {
		e.ai = true;
	});
	totals = [0, 0, 0, 0];
	$("hud").classList.remove("on");
	$("veil").classList.remove("off");
	$("attractLabel").classList.remove("on");
	document.body.classList.remove("playing");
	lastInputAt = performance.now();
	stack = [];
	showScreen("title");
}
function endRound() {
	if (roundOver) return;
	roundOver = true;
	roundLeft = Math.max(0, roundLeft);
	if (scores[myId()] === Math.max(...scores) && scores[myId()] > 0) roundsWon++;
	if (attract) {
		onlineRoundDelay = 1.4;
		return;
	}
	audio.round(scores[myId()] >= Math.max(...scores));
	if (network.online) {
		onlineRoundDelay = 3;
		toast("FIELD COMPLETE\nNEXT UP IN 3", 2.8);
	} else {
		mode = "roundover";
		showResult(false);
	}
}
function continueRound() {
	if (network.active && !network.isHost) return;
	if (gameType === "duel") {
		startGame("duel", stageIndex, false, network.online);
		return;
	}
	if (stageIndex < 4) {
		mode = "play";
		makeArena(stageIndex + 1);
		closeScreens();
		toast(`${stages[stageIndex].name}\n${stages[stageIndex].desc}`, 3.5);
		audio.voice(stageIndex + 1);
	} else {
		mode = "finished";
		if (network.online) {
			network.finish(
				Object.fromEntries(
					network.players.map((p) => [p.id, totals[p.id] || 0]),
				),
			);
		} else showResult(true);
	}
}
function showResult(final, reason = "finished") {
	const mine = totals[myId()] || 0,
		other = Math.max(...totals.filter((_, i) => i !== myId()));
	$("resultKicker").textContent = final
		? "CARTRIDGE COMPLETE"
		: `FIELD ${stageIndex + 1} / 05 COMPLETE`;
	$("resultTitle").textContent = final
		? mine > other
			? "A fine little feud."
			: mine === other
				? "Evenly matched."
				: "A worthy rematch?"
		: scores[myId()] >= Math.max(...scores)
			? "Good shooting, cadet."
			: "Still in the fight.";
	$("resultScore").innerHTML =
		`<span>${final ? mine : scores[myId()] || 0}</span><span>${final ? other : Math.max(...scores.filter((_, i) => i !== myId()))}</span>`;
	$("resultStamp").textContent = final
		? mine > other
			? "GOLDEN RICOCHET"
			: mine === other
				? "HONOURS SHARED"
				: "IRON RESOLVE"
		: stages[stageIndex].name;
	$("resultText").textContent = final
		? `Five fields, ${mine} hits. ${networkEnded && reason !== "finished" ? `The session ended: ${reason}.` : "Every good rivalry deserves another cartridge."}`
		: gameType === "duel"
			? "The field is yours to play again."
			: `Next: ${stages[Math.min(4, stageIndex + 1)].name}. ${stages[Math.min(4, stageIndex + 1)].desc}`;
	$("continueButton").textContent = final
		? "Play again ↗"
		: gameType === "duel"
			? "Rematch ↗"
			: stageIndex === 4
				? "See circuit results ↗"
				: "Next field ↗";
	$("continueButton").dataset.action = final ? "again" : "continue";
	if (network.active) {
		$("continueButton").classList.add("hidden");
		$("result").querySelector("[data-action=quit]").classList.add("hidden");
	} else {
		$("continueButton").classList.remove("hidden");
		$("result").querySelector("[data-action=quit]").classList.remove("hidden");
	}
	showScreen("result");
}
function toast(text, seconds = 2) {
	$("toast").textContent = text;
	$("toast").classList.add("on");
	toastUntil = elapsed + seconds;
}
function closeScreens() {
	document.querySelectorAll(".screen").forEach((e) => {
		e.classList.remove("on");
	});
	screen = "";
	focusIndex = 0;
}
function showScreen(id, push = false) {
	if (push && screen) stack.push(screen);
	closeScreens();
	screen = id;
	$(id).classList.add("on");
	focusIndex = 0;
	markFocus();
}
function visibleControls() {
	if (!screen) return [];
	return [...$(screen).querySelectorAll("button,input,select,textarea")].filter(
		(e) => !e.disabled && e.offsetParent !== null,
	);
}
function markFocus() {
	const list = visibleControls();
	focusIndex = clamp(focusIndex, 0, list.length - 1);
	document.querySelectorAll(".focused").forEach((e) => {
		e.classList.remove("focused");
	});
	if (inputKind === "gamepad" && list[focusIndex]) {
		list[focusIndex].classList.add("focused");
		list[focusIndex].scrollIntoView({ block: "nearest" });
	}
}
function back() {
	if (screen === "result") {
		return;
	}
	if (screen === "pause") {
		resume();
		return;
	}
	if (stack.length) {
		const previous = stack.pop();
		showScreen(previous);
		return;
	}
	if (mode === "title") showScreen("title");
	else if (mode === "play" || mode === "roundover") {
		showScreen("pause");
	} else title();
}
function pause() {
	if (attract) {
		exitAttract();
		return;
	}
	if (mode !== "play" || roundOver || screen === "pause") return;
	if (network.active && networkEnded) return;
	paused = !network.online;
	showScreen("pause");
	$("pauseNote").textContent = network.online
		? "Online play continues while this menu is open."
		: "The battlefield can wait.";
	audio.ui();
}
function resume() {
	paused = false;
	stack = [];
	closeScreens();
}
function activity(kind) {
	if (kind) inputKind = kind;
	if (kind === "touch") document.body.classList.add("touch");
	lastInputAt = performance.now();
	if (attract) {
		exitAttract();
		return true;
	}
	return false;
}
function exitAttract() {
	attract = false;
	title();
	audio.ui();
}
function saveSettings() {
	try {
		localStorage.setItem("com-ricochet-settings", JSON.stringify(settings));
	} catch {}
}
function updatePrompts() {
	const gp = inputKind === "gamepad",
		xb = settings.glyph === "xbox";
	$("controlHint").innerHTML = gp
		? `<b>Ⓛ</b> Drive &nbsp; <b>Ⓡ</b> Aim &nbsp; <span class="badge">${xb ? "RT" : "R2"}</span> Fire<br><span class="badge">${xb ? "LT" : "L2"}</span> Burst / pulse &nbsp; <span class="badge">${xb ? "☰" : "OPTIONS"}</span> Pause`
		: "<b>WASD</b> Drive &nbsp; <b>MOUSE</b> Aim &nbsp; <b>CLICK</b> Fire<br><b>SHIFT</b> Burst / pulse &nbsp; <b>ESC</b> Pause";
	$("manualControls").innerHTML = gp
		? `Left stick drives. Right stick aims. ${xb ? "RT or A" : "R2 or ×"} fires; ${xb ? "LT or B" : "L2 or ○"} bursts or pulses. ${xb ? "Menu" : "Options"} pauses. D-pad moves through menus; ${xb ? "A" : "×"} selects, ${xb ? "B" : "○"} goes back.`
		: "WASD drives, mouse aims, left click or Space fires. Shift bursts or pulses. Esc pauses. In menus, click or use arrows and Enter.";
	$("titlePrompt").textContent = gp
		? `${xb ? "A" : "×"} SELECT  /  ${xb ? "B" : "○"} BACK  /  D-PAD NAVIGATE`
		: "WASD + MOUSE  /  GAMEPAD READY";
	markFocus();
}
function updateHUD() {
	const mine = entities.find((e) => e.id === myId()) || entities[0];
	const opponent = entities
		.filter((e) => e.id !== mine?.id)
		.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0];
	const id = mine?.id ?? 0,
		oid = opponent?.id ?? 1;
	const pname = network.online
			? network.players.find((p) => p.id === id)?.name
			: null,
		oname = network.online
			? network.players.find((p) => p.id === oid)?.name
			: null;
	$("p1name").textContent = pname || "YOU";
	$("p2name").textContent = oname || (couch ? "PLAYER 2" : "RIVAL");
	$("p1score").textContent = scores[id] || 0;
	$("p2score").textContent = scores[oid] || 0;
	$("p1total").textContent = `CIRCUIT ${totals[id] || 0}`;
	$("p2total").textContent =
		entities.length > 2
			? entities
					.filter((e) => e.id !== id)
					.map((e) => `${e.id + 1}: ${scores[e.id] || 0}`)
					.join(" · ")
			: `CIRCUIT ${totals[oid] || 0}`;
	$("roundCount").textContent =
		gameType === "duel" ? "QUICK DUEL" : `ROUND 0${stageIndex + 1} / 05`;
	$("roundName").textContent = stages[stageIndex].name;
	const left = Math.max(0, Math.ceil(roundLeft));
	$("timer").textContent =
		`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
	$("abilityName").textContent = stages[stageIndex].hidden
		? "RADAR PULSE"
		: stages[stageIndex].jet
			? "AFTERBURNER"
			: "BURST";
	$("touchAction").textContent = stages[stageIndex].hidden ? "PULSE" : "BURST";
	$("abilityMeter").style.width = `${(1 - (mine?.ability || 0) / 4.6) * 100}%`;
	$("ruleHint").textContent =
		`FIRST TO ${tune.points} • ${stages[stageIndex].rule}`;
}

function readInput() {
	const pad = [...(navigator.getGamepads?.() || [])].find((p) => p?.connected);
	let mx = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
		mz = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0),
		ax = 0,
		az = 0,
		aim = false,
		fire = keys.has("Space") || mouse.down,
		boost = keys.has("ShiftLeft");
	const e = entities.find((e) => e.id === myId());
	if (mouse.active && e) {
		ax = mouse.x - e.x;
		az = mouse.z - e.z;
		const l = Math.hypot(ax, az);
		if (l > 0) {
			ax /= l;
			az /= l;
			aim = true;
		}
	}
	if (pad && inputKind === "gamepad") {
		mx = Math.abs(pad.axes[0] || 0) > 0.16 ? pad.axes[0] : 0;
		mz = Math.abs(pad.axes[1] || 0) > 0.16 ? pad.axes[1] : 0;
		ax = pad.axes[2] || 0;
		az = pad.axes[3] || 0;
		aim = Math.hypot(ax, az) > 0.2;
		fire = !!(pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
		boost = !!(pad.buttons[6]?.pressed || pad.buttons[1]?.pressed);
	}
	if (inputKind === "touch") {
		mx = leftStick.x;
		mz = leftStick.y;
		ax = rightStick.x;
		az = rightStick.y;
		aim = Math.hypot(ax, az) > 0.15;
		boost = touchBoost;
		if (!aim && e) {
			const other = entities
				.filter(
					(t) => t.id !== e.id && (t.reveal > 0 || !stages[stageIndex].hidden),
				)
				.sort(
					(a, b) =>
						Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z),
				)[0];
			if (other) {
				const a = Math.atan2(-(other.x - e.x), -(other.z - e.z));
				ax = -Math.sin(a);
				az = -Math.cos(a);
				aim = true;
			}
		}
		fire = !!e && (touches.size > 0 || roundElapsed > 1);
	}
	if (screen || mode !== "play" || roundOver)
		return {
			mx: 0,
			mz: 0,
			ax: 0,
			az: 0,
			aim: false,
			fire: false,
			boost: false,
		};
	return { mx, mz, ax, az, aim, fire, boost };
}
function readSecondInput() {
	const pads = [...(navigator.getGamepads?.() || [])].filter(
		(p) => p?.connected,
	);
	const pad = pads[1];
	if (pad) {
		const ax = pad.axes[2] || 0,
			az = pad.axes[3] || 0;
		return {
			mx: Math.abs(pad.axes[0]) > 0.16 ? pad.axes[0] : 0,
			mz: Math.abs(pad.axes[1]) > 0.16 ? pad.axes[1] : 0,
			ax,
			az,
			aim: Math.hypot(ax, az) > 0.2,
			fire: pad.buttons[7]?.pressed || pad.buttons[0]?.pressed,
			boost: pad.buttons[6]?.pressed || pad.buttons[1]?.pressed,
		};
	}
	const mx = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0),
		mz = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
	return {
		mx,
		mz,
		ax: mx,
		az: mz,
		aim: Math.hypot(mx, mz) > 0.1,
		fire: keys.has("Enter"),
		boost: keys.has("ShiftRight"),
	};
}
function nav(direction) {
	const list = visibleControls();
	if (!list.length) return;
	focusIndex = (focusIndex + direction + list.length) % list.length;
	markFocus();
	if (inputKind === "keyboard") list[focusIndex].focus();
	audio.ui();
}
function adjustControl(dir) {
	const el = visibleControls()[focusIndex];
	if (!el) return;
	if (el.type === "range") {
		el.value = clamp(+el.value + dir * (+el.step || 1), +el.min, +el.max);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (el.tagName === "SELECT") {
		el.selectedIndex = clamp(el.selectedIndex + dir, 0, el.options.length - 1);
		el.dispatchEvent(new Event("change", { bubbles: true }));
	} else if (el.type === "checkbox") {
		el.checked = !el.checked;
		el.dispatchEvent(new Event("change", { bubbles: true }));
	} else nav(dir);
}
function activateFocus() {
	const el = visibleControls()[focusIndex];
	if (!el) return;
	if (el.type === "checkbox") {
		el.checked = !el.checked;
		el.dispatchEvent(new Event("change", { bubbles: true }));
	} else if (el.tagName === "SELECT") adjustControl(1);
	else if (el.tagName === "BUTTON") el.click();
	else el.focus();
}
function pollGamepads(dt) {
	navCooldown = Math.max(0, navCooldown - dt);
	const pads = [...(navigator.getGamepads?.() || [])];
	const pad = pads.find((p) => p?.connected);
	if (!pad) {
		gamepadPrevious = [];
		return;
	}
	const buttons = pad.buttons.map((b) => b.pressed),
		pressed = (i) => buttons[i] && !gamepadPrevious[i];
	const active =
		buttons.some(Boolean) || pad.axes.some((a) => Math.abs(a) > 0.24);
	if (active) {
		const exited = activity("gamepad");
		updatePrompts();
		if (exited) {
			gamepadPrevious = buttons;
			return;
		}
	}
	if (pressed(9) && !buttons[8]) {
		if (screen === "pause") resume();
		else if (screen && mode === "play") back();
		else pause();
	}
	if (screen) {
		if (pressed(1)) back();
		if (pressed(0)) activateFocus();
		const vertical = buttons[12]
			? -1
			: buttons[13]
				? 1
				: Math.abs(pad.axes[1] || 0) > 0.55
					? Math.sign(pad.axes[1])
					: 0;
		const horizontal = buttons[14]
			? -1
			: buttons[15]
				? 1
				: Math.abs(pad.axes[0] || 0) > 0.55
					? Math.sign(pad.axes[0])
					: 0;
		if (navCooldown <= 0 && (vertical || horizontal)) {
			if (vertical) nav(vertical);
			else adjustControl(horizontal);
			navCooldown = 0.2;
		}
	}
	gamepadPrevious = buttons;
}
function pointerWorld(ev) {
	pointerNdc.set(
		(ev.clientX / innerWidth) * 2 - 1,
		(-ev.clientY / innerHeight) * 2 + 1,
	);
	raycaster.setFromCamera(pointerNdc, camera);
	if (raycaster.ray.intersectPlane(groundPlane, aimPoint)) {
		mouse.x = aimPoint.x;
		mouse.z = aimPoint.z;
	}
}
function setupInput() {
	window.addEventListener("keydown", (ev) => {
		const target = ev.target;
		const editing = ["TEXTAREA", "INPUT", "SELECT"].includes(target.tagName);
		const exited = activity("keyboard");
		audio.unlock();
		if (exited) {
			ev.preventDefault();
			return;
		}
		if (
			editing &&
			target.type !== "range" &&
			target.type !== "checkbox" &&
			ev.code !== "Escape"
		)
			return;
		keys.add(ev.code);
		if (
			[
				"Space",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Enter",
				"Escape",
				"Tab",
			].includes(ev.code) &&
			!editing
		)
			ev.preventDefault();
		if (ev.repeat) return;
		if (ev.code === "Escape") {
			if (screen) back();
			else pause();
		} else if (screen && !editing) {
			if (ev.code === "ArrowDown" || ev.code === "KeyS") nav(1);
			else if (ev.code === "ArrowUp" || ev.code === "KeyW") nav(-1);
			else if (ev.code === "ArrowLeft") adjustControl(-1);
			else if (ev.code === "ArrowRight") adjustControl(1);
			else if (ev.code === "Enter" || ev.code === "Space") activateFocus();
		}
		updatePrompts();
	});
	window.addEventListener("keyup", (ev) => keys.delete(ev.code));
	window.addEventListener("blur", () => {
		keys.clear();
		mouse.down = false;
		touches.clear();
		leftStick = { x: 0, y: 0 };
		rightStick = { x: 0, y: 0 };
		if (mode === "play" && !attract && !network.online && !screen) pause();
	});
	document.addEventListener("pointermove", (ev) => {
		if (ev.pointerType === "touch") {
			const t = touches.get(ev.pointerId);
			if (!t) return;
			const dx = clamp((ev.clientX - t.x) / 55, -1, 1),
				dy = clamp((ev.clientY - t.y) / 55, -1, 1);
			if (t.side === "left") leftStick = { x: dx, y: dy };
			else rightStick = { x: dx, y: dy };
			const ring = $(t.side === "left" ? "leftTouch" : "rightTouch");
			ring.firstElementChild.style.transform = `translate(${dx * 25}px,${dy * 25}px)`;
			return;
		}
		if (Math.abs(ev.movementX) + Math.abs(ev.movementY) > 1) {
			activity("keyboard");
			mouse.active = true;
			pointerWorld(ev);
			updatePrompts();
		}
	});
	$("view").addEventListener("pointerdown", (ev) => {
		audio.unlock();
		if (ev.pointerType === "touch") {
			const exited = activity("touch");
			document.body.classList.add("touch");
			updatePrompts();
			if (exited || mode !== "play" || screen) return;
			const side = ev.clientX < innerWidth * 0.5 ? "left" : "right";
			touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, side });
			$("view").setPointerCapture(ev.pointerId);
			const ring = $(side === "left" ? "leftTouch" : "rightTouch");
			ring.style.left = `${ev.clientX - 47}px`;
			ring.style.top = `${ev.clientY - 47}px`;
			ring.style.display = "block";
			ring.firstElementChild.style.transform = "";
			ev.preventDefault();
		} else {
			const exited = activity("keyboard");
			if (exited) return;
			mouse.active = true;
			pointerWorld(ev);
			if (ev.button === 0) mouse.down = true;
			if (ev.button === 2) {
				const e = entities.find((e) => e.id === myId());
				if (e && !screen) ability(e);
			}
		}
	});
	window.addEventListener("pointerup", (ev) => {
		if (ev.pointerType === "touch") {
			const t = touches.get(ev.pointerId);
			if (t) {
				if (t.side === "left") leftStick = { x: 0, y: 0 };
				else rightStick = { x: 0, y: 0 };
				$(t.side === "left" ? "leftTouch" : "rightTouch").style.display =
					"none";
				touches.delete(ev.pointerId);
			}
		} else mouse.down = false;
	});
	window.addEventListener("pointercancel", (ev) => {
		const t = touches.get(ev.pointerId);
		if (t) {
			if (t.side === "left") leftStick = { x: 0, y: 0 };
			else rightStick = { x: 0, y: 0 };
			$(t.side === "left" ? "leftTouch" : "rightTouch").style.display = "none";
			touches.delete(ev.pointerId);
		}
		touchBoost = false;
		mouse.down = false;
	});
	$("view").addEventListener("contextmenu", (e) => e.preventDefault());
	$("touchAction").addEventListener("pointerdown", (ev) => {
		activity("touch");
		touchBoost = true;
		ev.preventDefault();
		ev.stopPropagation();
	});
	$("touchAction").addEventListener("pointerup", () => (touchBoost = false));
	$("touchAction").addEventListener(
		"pointercancel",
		() => (touchBoost = false),
	);
	document.querySelectorAll("button,input,select,textarea").forEach((el) => {
		el.addEventListener("pointerenter", () => {
			const list = visibleControls();
			const i = list.indexOf(el);
			if (i >= 0) focusIndex = i;
			markFocus();
		});
		el.addEventListener("pointerdown", (ev) => {
			if (attract) {
				exitAttract();
				ev.preventDefault();
				return;
			}
			activity(ev.pointerType === "touch" ? "touch" : "keyboard");
			audio.unlock();
			updatePrompts();
		});
	});
	document.addEventListener("click", (ev) => {
		const action = ev.target.closest("[data-action]")?.dataset.action;
		if (action) handleAction(action);
	});
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			keys.clear();
			mouse.down = false;
			if (!network.online && mode === "play" && !attract && !screen) pause();
		}
	});
	window.addEventListener("gamepadconnected", () => updatePrompts());
}
async function handleAction(action) {
	activity();
	audio.unlock();
	audio.ui();
	try {
		switch (action) {
			case "circuit":
				couch = false;
				startGame();
				break;
			case "duel":
				showScreen("duel", true);
				break;
			case "multiplayer":
				showScreen("multiplayer", true);
				break;
			case "manual":
			case "settings":
			case "about":
			case "dev":
				if (action === "dev" && network.active) return;
				showScreen(action, true);
				break;
			case "pause":
				pause();
				break;
			case "resume":
				resume();
				break;
			case "back":
				back();
				break;
			case "quit":
				if (!network.active) title();
				break;
			case "continue":
				continueRound();
				break;
			case "again":
				if (!network.active) {
					if (network.online) title();
					else startGame(gameType, gameType === "duel" ? stageIndex : 0);
				}
				break;
			case "fullscreen":
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
				break;
			case "couch":
				couch = true;
				showScreen("duel", true);
				$("duelPlayers").value = "couch";
				break;
			case "showRoom":
				$("roomPanel").classList.remove("hidden");
				$("directPanel").classList.add("hidden");
				break;
			case "showDirect":
				$("directPanel").classList.remove("hidden");
				$("roomPanel").classList.add("hidden");
				break;
			case "hostRoom":
				network.hostRoom($("roomCode").value);
				break;
			case "joinRoom":
				network.joinRoom($("roomCode").value);
				break;
			case "offer":
				$("networkStatus").textContent = "Gathering direct connection details…";
				$("linkOut").value = await network.createOffer();
				$("networkStatus").textContent =
					"Invite ready. Send it to your friend; paste their answer above.";
				break;
			case "answer":
				$("linkOut").value = await network.joinOffer($("linkIn").value);
				$("networkStatus").textContent =
					"Answer ready. Send it back to the host.";
				break;
			case "accept":
				await network.acceptAnswer($("linkIn").value);
				break;
			case "copyLink":
				try {
					await navigator.clipboard.writeText($("linkOut").value);
					$("networkStatus").textContent = "Connection code copied.";
				} catch {
					$("linkOut").focus();
					$("linkOut").select();
					$("networkStatus").textContent =
						"Select and copy the highlighted code.";
				}
				break;
			case "devReset":
				tune = { ...defaults };
				god = autopilot = debugPhysics = false;
				syncDev();
				break;
			case "devScore":
				if (entities[0]) {
					const target = entities[1],
						owner = entities[0];
					target.invuln = 0;
					scoreHit(target, { owner: owner.id, bounces: 1 });
				}
				break;
			case "devNext":
				makeArena((stageIndex + 1) % 5);
				resume();
				break;
		}
	} catch (e) {
		$("networkStatus").textContent = e.message;
	}
}
function setupCredits() {
	const content = $("creditsContent");
	const h = document.createElement("h3");
	h.textContent = "Source Information";
	content.append(h);
	const dl = document.createElement("dl");
	for (const [key, value] of Object.entries(CREDIT_DATA.sourceInformation)) {
		const dt = document.createElement("dt"),
			dd = document.createElement("dd");
		dt.textContent = key[0].toUpperCase() + key.slice(1);
		dd.textContent = value;
		dl.append(dt, dd);
	}
	content.append(dl);
	const questions = {
		testingFeedback: [
			"Issues caught",
			"Critical issues",
			"Most helpful test",
			"Least helpful test",
		],
		engineFeedback: [
			"What worked best",
			"Where I got stuck",
			"Built by hand",
			"Hardest engine task",
			"Engine changes",
			"One requested improvement",
		],
		promptFeedback: [
			"What worked best",
			"What was confusing",
			"Hardest task",
			"One suggested change",
		],
	};
	for (const [key, title] of [
		["testingFeedback", "Testing Feedback"],
		["engineFeedback", "Engine Feedback"],
		["promptFeedback", "Prompt Feedback"],
	]) {
		const heading = document.createElement("h3");
		heading.textContent = title;
		content.append(heading);
		CREDIT_DATA[key].forEach((answer, i) => {
			const p = document.createElement("p"),
				b = document.createElement("b");
			b.textContent = `${questions[key][i]}: `;
			p.append(b, document.createTextNode(answer));
			content.append(p);
		});
	}
	const p = document.createElement("p");
	p.innerHTML =
		'<b>Research sources:</b> <a href="https://atari.com/pages/combat" target="_blank" rel="noopener">Atari’s official rules</a> · <a href="https://www.ataricompendium.com/archives/manuals/vcs/combat.pdf" target="_blank" rel="noopener">1977 instruction manual</a> · <a href="https://www.atariage.com/2600/archives/combat_asm/index.html" target="_blank" rel="noopener">Program disassembly</a>. Three.js (MIT), Rapier (Apache-2.0). Original game design and procedural assets by OpenAI gpt-6.1-sol.';
	if (network.active)
		p.querySelectorAll("a").forEach((a) => {
			a.addEventListener("click", (e) => e.preventDefault());
		});
	content.append(p);
}
function setupMenus() {
	setupCredits();
	stages.forEach((s, i) => {
		const btn = document.createElement("button");
		btn.className = "stage-card";
		btn.innerHTML = `<b>0${i + 1}</b>${s.short}`;
		btn.addEventListener("click", () => {
			couch = $("duelPlayers").value === "couch";
			startGame("duel", i);
		});
		$("stageList").append(btn);
		const opt = document.createElement("option");
		opt.value = i;
		opt.textContent = `0${i + 1} · ${s.name}`;
		$("jumpStage").append(opt);
	});
	const sliders = [
		["speed", "Vehicle speed", 2, 12, 0.1],
		["shellSpeed", "Shell speed", 8, 32, 1],
		["reload", "Fire interval", 0.2, 1.5, 0.05],
		["aiAccuracy", "AI accuracy", 0.1, 1, 0.01],
		["roundTime", "Round seconds", 15, 120, 5],
		["points", "Hits to win", 1, 10, 1],
	];
	for (const [key, label, min, max, step] of sliders) {
		const row = document.createElement("div");
		row.className = "setting";
		row.innerHTML = `<label for="tune_${key}">${label}</label><input id="tune_${key}" type="range" min="${min}" max="${max}" step="${step}" value="${tune[key]}"><output id="out_${key}">${tune[key]}</output>`;
		row.querySelector("input").addEventListener("input", (ev) => {
			const old = tune[key];
			tune[key] = +ev.target.value;
			$(`out_${key}`).textContent = tune[key];
			if (key === "roundTime")
				roundLeft = Math.max(0, roundLeft + tune[key] - old);
		});
		$("devSliders").append(row);
	}
	for (const key of ["music", "sfx"]) {
		$(key).value = settings[key];
		$(`${key}Out`).textContent = `${settings[key]}%`;
		$(key).addEventListener("input", (ev) => {
			settings[key] = +ev.target.value;
			$(`${key}Out`).textContent = `${settings[key]}%`;
			if (key === "music") audio.setMusic(settings.music / 100);
			else audio.setSfx(settings.sfx / 100);
			saveSettings();
		});
	}
	for (const key of ["glyph", "difficulty"]) {
		$(key).value = settings[key];
		$(key).addEventListener("change", (ev) => {
			settings[key] = ev.target.value;
			saveSettings();
			updatePrompts();
		});
	}
	for (const key of ["assist", "shake"]) {
		$(key).checked = settings[key];
		$(key).addEventListener("change", (ev) => {
			settings[key] = ev.target.checked;
			saveSettings();
		});
	}
	$("god").addEventListener("change", (e) => (god = e.target.checked));
	$("auto").addEventListener("change", (e) => (autopilot = e.target.checked));
	$("debugPhysics").addEventListener(
		"change",
		(e) => (debugPhysics = e.target.checked),
	);
	$("jumpStage").addEventListener("change", (e) => {
		makeArena(+e.target.value);
		$("jumpStage").value = stageIndex;
	});
}
function syncDev() {
	for (const key of Object.keys(defaults)) {
		$(`tune_${key}`).value = tune[key];
		$(`out_${key}`).textContent = tune[key];
	}
	$("god").checked = god;
	$("auto").checked = autopilot;
	$("debugPhysics").checked = debugPhysics;
	$("jumpStage").value = stageIndex;
}
function snapshot() {
	return {
		v: 1,
		stage: stageIndex,
		left: +roundLeft.toFixed(2),
		over: roundOver,
		totals,
		scores: Object.fromEntries(entities.map((e) => [e.id, totals[e.id] || 0])),
		roundScores: scores,
		entities: entities.map((e) => ({
			id: e.id,
			x: +e.x.toFixed(3),
			z: +e.z.toFixed(3),
			h: +e.heading.toFixed(3),
			a: +e.aim.toFixed(3),
			c: +e.cooldown.toFixed(2),
			u: +e.ability.toFixed(2),
			i: +e.invuln.toFixed(2),
			r: +e.reveal.toFixed(2),
			s: +e.stun.toFixed(2),
		})),
		bullets: bullets.map((b) => ({
			id: b.id,
			o: b.owner,
			x: +b.x.toFixed(2),
			z: +b.z.toFixed(2),
			a: +b.angle.toFixed(3),
			b: b.bounces,
		})),
		fx: snapshotEvents,
	};
}
function applySnapshot(s) {
	if (s?.v !== 1 || network.isHost || networkEnded) return;
	if (!Number.isInteger(s.stage) || s.stage < 0 || s.stage > 4) return;
	if (
		stageIndex !== s.stage ||
		mode !== "play" ||
		entities.length !== s.entities?.length
	) {
		mode = "play";
		makeArena(s.stage);
		closeScreens();
		$("hud").classList.add("on");
		$("veil").classList.add("off");
		document.body.classList.add("playing");
		cameraTargetX = 0;
		toast(stages[s.stage].name, 2);
	}
	roundLeft = Number.isFinite(s.left) ? s.left : roundLeft;
	roundOver = !!s.over;
	if (Array.isArray(s.totals)) totals = s.totals;
	if (Array.isArray(s.roundScores)) scores = s.roundScores;
	for (const d of s.entities || []) {
		const e = entities.find((e) => e.id === d.id);
		if (!e) continue;
		e.x = d.x;
		e.z = d.z;
		e.heading = d.h;
		e.aim = d.a;
		e.cooldown = d.c;
		e.ability = d.u;
		e.invuln = d.i;
		e.reveal = d.r;
		e.stun = d.s;
	}
	const wanted = new Set((s.bullets || []).map((b) => b.id));
	for (const b of bullets)
		if (!wanted.has(b.id)) {
			scene.remove(b.mesh);
			b.remove = true;
		}
	bullets = bullets.filter((b) => !b.remove);
	for (const d of s.bullets || []) {
		let b = bullets.find((b) => b.id === d.id);
		if (!b) {
			const m = new THREE.Group();
			mesh(new THREE.SphereGeometry(0.19, 7, 5), 0xffe28a, m);
			box(0.12, 0.12, 0.7, COLORS[d.o % 4], m, 0, 0, 0.35, false);
			scene.add(m);
			b = { id: d.id, mesh: m };
			bullets.push(b);
		}
		b.x = d.x;
		b.z = d.z;
		b.angle = d.a;
	}
	for (const fx of s.fx || []) {
		if (fx.n <= lastRemoteEvent) continue;
		lastRemoteEvent = fx.n;
		if (fx.t === "shot") {
			audio.shot(fx.id);
			const e = entities.find((e) => e.id === fx.id);
			if (e) playClip(e, e.recoil);
		}
		if (fx.t === "hit") {
			audio.hit();
			effect(fx.x, 1, fx.z, 0xffce72, 25, 1.6);
			shake = 0.3;
		}
		if (fx.t === "bounce") {
			audio.bounce();
			effect(fx.x, 1, fx.z, 0xffdc7a, 5, 0.5);
		}
		if (fx.t === "boost") ringEffect(fx.x, fx.z, COLORS[fx.id % 4], 3);
	}
}
function getState() {
	return {
		ready,
		mode,
		screen,
		attract,
		paused,
		stage: stageIndex,
		stageName: stages[stageIndex].name,
		roundLeft,
		roundOver,
		gameType,
		couch,
		scores: [...scores],
		totals: [...totals],
		roundsWon,
		tune: { ...tune },
		settings: { ...settings },
		god,
		autopilot,
		inputKind,
		entities: entities.map((e) => ({
			id: e.id,
			x: e.x,
			z: e.z,
			heading: e.heading,
			aim: e.aim,
			reveal: e.reveal,
			invuln: e.invuln,
			ability: e.ability,
			ai: e.ai,
			visible: e.group.visible,
		})),
		bullets: bullets.map((b) => ({
			x: b.x,
			z: b.z,
			owner: b.owner,
			bounces: b.bounces,
		})),
		physicsSteps,
		frameCount,
		renderInfo: renderer?.info?.render,
		shotsFired,
		hitCount,
		bounceCount,
		wrapCount,
		visited: [...stats.stagesVisited],
		mechanics: { ...stats.mechanics },
		collisions: stats.collisions,
		animationMixers: mixers.length,
		renderer: renderer?.backend?.isWebGPUBackend
			? "WebGPU"
			: renderer
				? "WebGL fallback"
				: "unknown",
		network: network.inspect(),
		audio: audio.inspect(),
		focus: visibleControls()[focusIndex]?.textContent?.trim() || null,
	};
}
function exposeTests() {
	const enabled = new URL(location.href).searchParams.has("test");
	window.__game = { state: getState };
	if (!enabled) return;
	window.__game.test = {
		freeze: () => renderer.setAnimationLoop(null),
		view: () => {
			cameraX = cameraTargetX;
			animateVisuals(0);
		},
		renderCheck: () => ({
			lost: renderer._isDeviceLost,
			initialized: renderer._initialized,
			canvas: [$("view").width, $("view").height],
			target: !!renderer._frameBufferTarget,
			children: scene.children.length,
		}),
		capture: async () => {
			const w = innerWidth,
				h = innerHeight;
			const target = new THREE.RenderTarget(w, h, {
				type: THREE.UnsignedByteType,
			});
			target.texture.colorSpace = THREE.SRGBColorSpace;
			renderer.setRenderTarget(target);
			await renderer.renderAsync(scene, camera);
			await renderer.waitForGPU();
			const data = await renderer.readRenderTargetPixelsAsync(
				target,
				0,
				0,
				w,
				h,
			);
			renderer.setRenderTarget(null);
			const c = document.createElement("canvas");
			c.width = w;
			c.height = h;
			const ctx = c.getContext("2d");
			ctx.putImageData(
				new ImageData(new Uint8ClampedArray(data.buffer), w, h),
				0,
				0,
			);
			target.dispose();
			return c.toDataURL();
		},
		start: (type = "circuit", i = 0) => startGame(type, i),
		title,
		step: (seconds = 1, input = null) => {
			for (let t = 0; t < seconds; t += 1 / 60) {
				elapsed += 1 / 60;
				localInput = input || readInput();
				if (!roundOver) physics(1 / 60);
			}
			animateVisuals(0);
			updateHUD();
		},
		setInput: (i) => {
			localInput = i;
		},
		position: (id, x, z) => {
			const e = entities.find((e) => e.id === id);
			e.x = x;
			e.z = z;
			e.body.setTranslation({ x, y: 0.65, z }, true);
		},
		aim: (id, a) => {
			const e = entities.find((e) => e.id === id);
			e.aim = a;
			e.cooldown = 0;
			e.invuln = 0;
		},
		fire: (id) => bullet(entities.find((e) => e.id === id)),
		boost: (id) => ability(entities.find((e) => e.id === id)),
		bots: (value) =>
			entities.forEach((e) => {
				e.ai = value;
			}),
		score: (id = 0) => {
			const t = entities.find((e) => e.id !== id);
			t.invuln = 0;
			scoreHit(t, { owner: id, bounces: 1 });
		},
		continue: continueRound,
		endRound,
		pause,
		resume,
		config: (v) => {
			Object.assign(tune, v);
		},
		forceAttract: () => {
			lastInputAt = performance.now() - 11000;
		},
		setReveal: (id, v) => (entities.find((e) => e.id === id).reveal = v),
		makeArena,
		iSnapshot: snapshot,
		applySnapshot,
		audio,
		network,
		trace,
	};
}
function loop(time) {
	const dt = clamp((time - lastTime) / 1000 || 0.016, 0, 0.1);
	lastTime = time;
	elapsed += dt;
	frameCount++;
	pollGamepads(dt);
	localInput = readInput();
	if (
		mode === "title" &&
		!screen.includes("settings") &&
		screen === "title" &&
		performance.now() - lastInputAt >= 10000
	) {
		startGame("circuit", 0, true);
	}
	const sim =
		(mode === "play" || mode === "title") &&
		!paused &&
		!networkEnded &&
		(!network.online || network.isHost) &&
		(!network.active || networkStarted);
	if (sim) {
		if (roundOver) {
			if (attract || network.online) {
				onlineRoundDelay -= dt;
				if (onlineRoundDelay <= 0) {
					if (attract) {
						const next = (stageIndex + 1) % 5;
						makeArena(next);
						roundLeft = 18;
					} else continueRound();
				}
			}
		} else {
			accum += dt;
			while (accum >= 1 / 60) {
				physics(1 / 60);
				accum -= 1 / 60;
			}
		}
		if (mode === "title") {
			roundLeft = 999;
			if (roundOver) {
				roundOver = false;
				scores = [0, 0, 0, 0];
			}
		}
		if (attract && roundElapsed > 15 && !roundOver) endRound();
	}
	if (network.online && !networkEnded)
		network.tick(dt, localInput, network.isHost ? snapshot() : null);
	else if (network.active && !networkEnded) network.tick(dt, localInput, null);
	animateVisuals(paused ? 0 : dt);
	if (elapsed >= toastUntil) $("toast").classList.remove("on");
	if (mode === "play") updateHUD();
	const e = entities.find((e) => e.id === myId());
	audio.update(dt, {
		moving:
			sim && e
				? Math.min(
						1,
						Math.hypot(e.body?.linvel?.().x || 0, e.body?.linvel?.().z || 0) /
							tune.speed,
					)
				: 0,
		flying: stages[stageIndex].jet,
		playing:
			!networkEnded &&
			(mode === "play" || mode === "title" || mode === "roundover") &&
			!paused,
	});
	renderer.render(scene, camera);
}
async function boot() {
	try {
		await network.init();
		await RAPIER.init();
		if (!navigator.gpu)
			throw new Error(
				"WebGPU is unavailable. Open this cartridge in a WebGPU browser on file:// or localhost.",
			);
		let gpuError;
		for (let attempt = 0; attempt < 5 && !gpuDevice; attempt++) {
			try {
				gpuAdapter = await navigator.gpu.requestAdapter({
					powerPreference: "high-performance",
				});
				if (gpuAdapter)
					gpuDevice = await gpuAdapter.requestDevice({
						requiredFeatures: [...gpuAdapter.features],
					});
			} catch (error) {
				gpuError = error;
				gpuAdapter = null;
			}
			if (!gpuDevice)
				await new Promise((resolve) =>
					setTimeout(resolve, 200 * (attempt + 1)),
				);
		}
		if (!gpuDevice)
			throw new Error(
				"WebGPU could not create a device. " +
					(gpuError?.message || "No adapter is available.") +
					" Close other GPU-heavy tabs and reload.",
			);
		renderer = new THREE.WebGPURenderer({
			canvas: $("view"),
			antialias: true,
			alpha: false,
			device: gpuDevice,
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.05;
		await renderer.init();
		if (!renderer.backend.isWebGPUBackend) {
			if (network.active) AIHub.fail("WebGPU is required for this cartridge.");
			throw new Error(
				"This cartridge needs WebGPU. Use a current browser with WebGPU enabled, then reload.",
			);
		}
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x214e4c);
		camera = new THREE.OrthographicCamera(-25, 25, 15, -15, 0.1, 200);
		camera.position.set(-8, 33, 24);
		camera.lookAt(-8, 0, 0);
		const amb = new THREE.HemisphereLight(0xfff2c9, 0x356c62, 2);
		scene.add(amb);
		const sun = new THREE.DirectionalLight(0xffedcb, 3);
		sun.position.set(-12, 25, 8);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -26;
		sun.shadow.camera.right = 26;
		sun.shadow.camera.top = 23;
		sun.shadow.camera.bottom = -23;
		sun.shadow.normalBias = 0.05;
		sun.shadow.bias = -0.0004;
		scene.add(sun);
		makeTerrain();
		makeSight();
		setupMenus();
		setupInput();
		updatePrompts();
		window.addEventListener("resize", () =>
			renderer.setSize(innerWidth, innerHeight),
		);
		if (network.active) {
			mode = "waiting";
			cameraTargetX = 0;
			makeArena(0);
			closeScreens();
			$("veil").classList.add("off");
			$("hud").classList.add("on");
			toast("BATTLE STATIONS\nWAITING FOR THE HUB", 3600);
			network.ready();
		} else title();
		ready = true;
		exposeTests();
		$("loading").style.display = "none";
		renderer.setAnimationLoop(loop);
		window.addEventListener("pagehide", () => {
			network.close();
			audio.destroy();
		});
	} catch (e) {
		console.error(e);
		$("bootError").style.display = "block";
		$("bootError").textContent = e.message;
		$("loading").querySelector("span").textContent =
			"THE CARTRIDGE COULD NOT START";
		if (network.active) AIHub.fail(e.message);
	}
}
boot();
