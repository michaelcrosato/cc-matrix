import * as THREE from "three/webgpu";
import { color, normalWorld, vec3, float, step, mix } from "three/tsl";
import RAPIER from "@dimforge/rapier3d-compat";
import { AudioDirector } from "./audio.js";
import { NetworkDirector } from "./network.js";

const $ = (s) => document.querySelector(s),
	clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const C = {
	ink: 0x081c24,
	night: 0x12343d,
	teal: 0x287176,
	cyan: 0x7cddcb,
	cream: 0xffe6ac,
	acid: 0xeff96b,
	coral: 0xff715e,
	purple: 0x977abd,
};
const defaults = {
	enemySpeed: 1,
	bulletSpeed: 1,
	fireRate: 1,
	damage: 1,
	invincible: false,
	autoplay: false,
};
const tuning = { ...defaults },
	settings = { music: 0.1, sfx: 0.65, glyphs: "ps", reduced: false };
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("demon-rumble-settings") || "{}"),
	);
} catch {}
const save = () => {
	try {
		localStorage.setItem("demon-rumble-settings", JSON.stringify(settings));
	} catch {}
};
const audio = new AudioDirector();
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.night);
const camera = new THREE.OrthographicCamera(-18, 18, 10.125, -10.125, 0.1, 120);
camera.position.set(0, 0, 45);
const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("#game").appendChild(renderer.domElement);
let world,
	queue,
	net,
	rendererBackend = "unknown",
	ready = false,
	stopped = false,
	screen = "loading",
	backScreen = "pause",
	lastInput = matchMedia("(pointer:coarse)").matches ? "touch" : "keyboard",
	lastActivity = performance.now(),
	testMode = false;
let entities = [],
	ships = [],
	particles = [],
	actors = new Map(),
	nextId = 1,
	simTime = 0,
	accumulator = 0,
	waveTimer = 0,
	shake = 0,
	flash = 0,
	enemyShotTimer = 0,
	nextWaveTimer = -1;
let mode = "title",
	wave = 0,
	score = 0,
	combo = 1,
	comboTime = 0,
	kills = 0,
	shots = 0,
	hits = 0,
	elapsed = 0,
	isAttract = false,
	localCoop = false,
	bossPhase = 0,
	focusIndex = 0,
	padPrevious = [],
	padNavTimer = 0,
	uiTick = 0,
	networkTick = 0;
let toastTimer = 0,
	bannerTimer = 0,
	shotCounter = 0,
	runStats = { splits: 0, dashes: 0, pulses: 0, pickups: 0, bossPhases: 0 };
const keys = new Set();
let pointer = { active: false, x: 0, fire: false },
	touches = new Map(),
	touchStart = null,
	actionPulse = false,
	actionDash = false;
const controls = [
	{ move: 0, fire: false, pulse: false, dash: false },
	{ move: 0, fire: false, pulse: false, dash: false },
	{ move: 0, fire: false, pulse: false, dash: false },
	{ move: 0, fire: false, pulse: false, dash: false },
];
const floor = new THREE.Group();
scene.add(floor);
const geos = {
	sphere: new THREE.IcosahedronGeometry(1, 1),
	oct: new THREE.OctahedronGeometry(1),
	box: new THREE.BoxGeometry(1, 1, 1),
	cone: new THREE.ConeGeometry(1, 1, 5),
	ring: new THREE.TorusGeometry(1, 0.03, 4, 64),
};
const materialCache = new Map();
function mat(hex, lit = true) {
	const key = hex + ":" + lit;
	if (materialCache.has(key)) return materialCache.get(key);
	const m = new THREE.MeshBasicNodeMaterial({
		color: hex,
		side: THREE.FrontSide,
	});
	if (lit) {
		const d = normalWorld.dot(vec3(-0.35, 0.7, 0.7)).add(0.2);
		m.colorNode = color(hex).mul(
			mix(
				float(0.49),
				mix(float(0.78), float(1.12), step(0.7, d)),
				step(0.22, d),
			),
		);
	}
	materialCache.set(key, m);
	return m;
}
const inkMat = new THREE.MeshBasicMaterial({
	color: C.ink,
	side: THREE.BackSide,
});
function mesh(
	geo,
	hex,
	parent,
	position = [0, 0, 0],
	scale = [1, 1, 1],
	outline = true,
) {
	const g = new THREE.Group(),
		m = new THREE.Mesh(geo, mat(hex));
	g.add(m);
	if (outline) {
		const ink = new THREE.Mesh(geo, inkMat);
		ink.scale.setScalar(1.075);
		g.add(ink);
	}
	g.position.set(...position);
	g.scale.set(...scale);
	parent.add(g);
	return g;
}
function poly(points, depth = 0.2) {
	const s = new THREE.Shape();
	s.moveTo(...points[0]);
	points.slice(1).forEach((p) => s.lineTo(...p));
	s.closePath();
	return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}
function line(points, hex, parent = scene, opacity = 1) {
	const g = new THREE.BufferGeometry().setFromPoints(
		points.map((p) => new THREE.Vector3(...p)),
	);
	const l = new THREE.Line(
		g,
		new THREE.LineBasicMaterial({
			color: hex,
			transparent: opacity < 1,
			opacity,
		}),
	);
	parent.add(l);
	return l;
}
function textToast(text) {
	$("#toast").textContent = text;
	$("#toast").classList.remove("hidden");
	toastTimer = 2.6;
}
function banner(kicker, text) {
	$("#wave-banner .kicker").textContent = kicker;
	$("#wave-banner h2").textContent = text;
	$("#wave-banner").classList.remove("hidden");
	bannerTimer = 2.7;
}
function buildBackdrop() {
	const stars = new THREE.BufferGeometry(),
		points = [];
	let seed = 9831;
	const rnd = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	for (let i = 0; i < 260; i++)
		points.push((rnd() - 0.5) * 90, (rnd() - 0.5) * 48, -22 - rnd() * 10);
	stars.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
	scene.add(
		new THREE.Points(
			stars,
			new THREE.PointsMaterial({
				color: C.cream,
				size: 0.065,
				transparent: true,
				opacity: 0.5,
			}),
		),
	);
	const moon = new THREE.Group();
	moon.position.set(10, 5.8, -17);
	mesh(
		new THREE.CircleGeometry(4.8, 80),
		C.cream,
		moon,
		[0, 0, 0],
		[1, 1, 1],
		false,
	);
	mesh(
		new THREE.CircleGeometry(4.75, 80),
		C.night,
		moon,
		[-1.5, 1, 0.15],
		[1, 1, 1],
		false,
	);
	for (let i = 0; i < 12; i++) {
		const a = i * 0.55;
		line(
			[
				[Math.cos(a) * 5.5, Math.sin(a) * 5.5, -0.1],
				[Math.cos(a) * 5.75, Math.sin(a) * 5.75, -0.1],
			],
			C.teal,
			moon,
			0.6,
		);
	}
	scene.add(moon);
	for (let k = 0; k < 3; k++) {
		const group = new THREE.Group();
		group.position.z = -13 + k * 3;
		for (let i = 0; i < 13; i++) {
			const x = -25 + i * 4 + rnd() * 2,
				h = 1 + rnd() * 5;
			const p = mesh(
				geos.cone,
				[0x1a464e, 0x20535a, 0x27616a][k],
				group,
				[x, -10 + h / 2, 0],
				[2, h, 1],
				false,
			);
			p.rotation.z = (rnd() - 0.5) * 0.3;
		}
		scene.add(group);
	}
	for (let i = 0; i < 17; i++) {
		const x = -30 + i * 4;
		line(
			[
				[x, -8.3, -1],
				[x * 1.5, -14, 5],
			],
			0x42777a,
			floor,
			0.35,
		);
	}
	for (let i = 0; i < 6; i++)
		line(
			[
				[-35, -8.4 - i * 0.75, -1],
				[35, -8.4 - i * 0.75, -1],
			],
			0x42777a,
			floor,
			0.4,
		);
	mesh(geos.box, 0x15353b, scene, [0, -9.35, -0.8], [70, 1.6, 2], false);
	for (const side of [-1, 1]) {
		const g = new THREE.Group();
		g.position.set(side * 17, -5, -7);
		mesh(geos.box, 0x37666a, g, [0, 0, 0], [0.5, 8, 0.6]);
		mesh(geos.box, 0x37666a, g, [side * 2, 0, 0], [0.5, 8, 0.6]);
		mesh(geos.box, C.ink, g, [side, 3.6, 0.2], [4.7, 0.5, 1]);
		mesh(geos.box, C.coral, g, [side, 3.8, 0.3], [4.5, 0.12, 1]);
		scene.add(g);
	}
	line(
		[
			[-14.8, -7.9, 0],
			[14.8, -7.9, 0],
		],
		C.cyan,
		scene,
		0.5,
	);
}
function demonModel(type) {
	const g = new THREE.Group(),
		boss = type === "boss",
		shard = type === "shard",
		elite = type === "elite",
		hue = boss ? C.coral : shard ? C.acid : elite ? C.purple : C.coral;
	mesh(geos.oct, hue, g, [0, 0, 0], [0.59, 0.76, 0.45]);
	mesh(geos.oct, C.cream, g, [0, -0.12, 0.43], [0.32, 0.4, 0.13]);
	for (const s of [-1, 1]) {
		const horn = mesh(
			geos.cone,
			C.cream,
			g,
			[s * 0.36, 0.7, 0],
			[0.16, 0.68, 0.18],
		);
		horn.rotation.z = s * -0.35;
		mesh(geos.box, C.ink, g, [s * 0.22, 0.16, 0.46], [0.32, 0.22, 0.09], false);
		const eye = mesh(
			geos.box,
			C.acid,
			g,
			[s * 0.2, 0.18, 0.52],
			[0.16, 0.09, 0.04],
			false,
		);
		eye.rotation.z = s * 0.22;
		const wing = new THREE.Group();
		wing.name = s < 0 ? "leftWing" : "rightWing";
		wing.position.set(s * 0.4, 0.1, 0);
		g.add(wing);
		const points = [
			[0, 0.1],
			[s * 0.55, 0.85],
			[s * 1.6, 0.5],
			[s * 1.3, 0.06],
			[s * 1.15, -0.5],
			[s * 0.7, -0.2],
			[s * 0.4, -0.65],
		];
		mesh(poly(points), hue, wing, [0, 0, 0], [1, 1, 1]);
		line(
			[
				[0, 0.1, 0.25],
				[s * 1.5, 0.48, 0.25],
				[s * 0.72, -0.15, 0.25],
			],
			C.ink,
			wing,
		);
		const claw = mesh(
			geos.cone,
			C.cream,
			g,
			[s * 0.33, -0.75, 0.1],
			[0.14, 0.36, 0.15],
		);
		claw.rotation.z = Math.PI + s * 0.4;
	}
	mesh(
		poly([
			[-0.2, -0.23],
			[0, -0.39],
			[0.2, -0.23],
		]),
		C.ink,
		g,
		[0, 0, 0.57],
		[1, 1, 1],
		false,
	);
	if (elite || boss) {
		mesh(geos.ring, C.acid, g, [0, 0, -0.3], [1.4, 1.4, 1]);
		mesh(geos.oct, C.acid, g, [0, 1.03, 0.1], [0.17, 0.24, 0.15]);
	}
	const mixer = new THREE.AnimationMixer(g);
	const tracks = [
		new THREE.NumberKeyframeTrack(
			"leftWing.rotation[z]",
			[0, 0.25, 0.5],
			[0.22, -0.22, 0.22],
		),
		new THREE.NumberKeyframeTrack(
			"rightWing.rotation[z]",
			[0, 0.25, 0.5],
			[-0.22, 0.22, -0.22],
		),
	];
	mixer.clipAction(new THREE.AnimationClip("wingbeat", 0.5, tracks)).play();
	return { g, mixer };
}
function shipModel(seat) {
	const g = new THREE.Group(),
		hue = [C.cyan, C.acid, C.coral, C.purple][seat % 4];
	mesh(
		poly(
			[
				[0, 0.9],
				[-0.48, -0.23],
				[-1, -0.5],
				[-0.82, -0.78],
				[0, -0.52],
				[0.82, -0.78],
				[1, -0.5],
				[0.48, -0.23],
			],
			0.4,
		),
		hue,
		g,
	);
	mesh(geos.oct, C.cream, g, [0, 0.06, 0.5], [0.28, 0.4, 0.23]);
	mesh(geos.oct, C.ink, g, [0, 0.19, 0.69], [0.16, 0.24, 0.1]);
	for (const s of [-1, 1]) {
		mesh(geos.box, C.ink, g, [s * 0.47, -0.03, 0.25], [0.16, 0.8, 0.22]);
		mesh(geos.box, hue, g, [s * 0.47, 0.42, 0.25], [0.1, 0.22, 0.18]);
	}
	const flame = mesh(
		geos.cone,
		C.acid,
		g,
		[0, -0.9, 0.15],
		[0.23, 0.65, 0.18],
		false,
	);
	flame.name = "flame";
	flame.rotation.z = Math.PI;
	const mixer = new THREE.AnimationMixer(g);
	mixer
		.clipAction(
			new THREE.AnimationClip("engine", 0.16, [
				new THREE.NumberKeyframeTrack(
					"flame.scale[y]",
					[0, 0.08, 0.16],
					[0.4, 0.9, 0.4],
				),
			]),
		)
		.play();
	return { g, mixer };
}
function addActor(kind, type, x, y, hp = 1, seat = 0, id = null) {
	const model =
		kind === "ship"
			? shipModel(seat)
			: kind === "enemy"
				? demonModel(type)
				: { g: new THREE.Group(), mixer: null };
	const a = {
		id: id ?? nextId++,
		kind,
		type,
		x,
		y,
		hp,
		maxHp: hp,
		seat,
		mesh: model.g,
		mixer: model.mixer,
		t: 0,
		dead: false,
		vx: 0,
		vy: 0,
	};
	if (kind === "enemy") {
		a.baseX = x;
		a.baseY = y;
		a.phase = nextId * 0.79;
		a.scale =
			type === "boss"
				? 2.8
				: type === "shard"
					? 0.52
					: type === "elite"
						? 1.05
						: 0.85;
		a.mesh.scale.setScalar(a.scale);
		a.fire = 1 + Math.random() * 2;
		a.diving = false;
	}
	if (kind === "bullet") {
		mesh(
			type === "friendly" ? geos.box : geos.oct,
			type === "friendly" ? (seat === 1 ? C.acid : C.cyan) : C.coral,
			a.mesh,
			[0, 0, 0],
			type === "friendly" ? [0.12, 0.5, 0.13] : [0.22, 0.37, 0.2],
			false,
		);
	}
	if (kind === "pickup") {
		mesh(
			geos.oct,
			type === "power" ? C.acid : C.cyan,
			a.mesh,
			[0, 0, 0],
			[0.45, 0.45, 0.25],
		);
		mesh(geos.ring, C.cream, a.mesh, [0, 0, 0.2], [0.65, 0.65, 0.65], false);
	}
	a.mesh.position.set(x, y, 0);
	scene.add(a.mesh);
	entities.push(a);
	if (world) {
		const dynamic = kind === "bullet" || kind === "pickup";
		const desc = dynamic
			? RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(x, y, 0)
					.setGravityScale(0)
					.setCcdEnabled(true)
			: RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, 0);
		a.body = world.createRigidBody(desc);
		let col;
		if (kind === "ship") col = RAPIER.ColliderDesc.cuboid(0.42, 0.4, 0.3);
		else if (kind === "enemy")
			col = RAPIER.ColliderDesc.cuboid(a.scale * 0.55, a.scale * 0.55, 0.4);
		else col = RAPIER.ColliderDesc.ball(kind === "bullet" ? 0.18 : 0.55);
		a.collider = world.createCollider(
			col.setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
			a.body,
		);
		actors.set(a.collider.handle, a);
	}
	return a;
}
function remove(a) {
	if (a.dead) return;
	a.dead = true;
	scene.remove(a.mesh);
	if (a.body) {
		actors.delete(a.collider.handle);
		world.removeRigidBody(a.body);
		a.body = null;
	}
	a.mixer?.stopAllAction();
}
function burst(x, y, hue = C.coral, count = 15, size = 1) {
	if (settings.reduced) count = Math.min(count, 7);
	for (let i = 0; i < count; i++) {
		const m = new THREE.Mesh(i % 3 ? geos.oct : geos.box, mat(hue, false));
		m.position.set(x, y, 0.8);
		const s = (0.05 + Math.random() * 0.13) * size;
		m.scale.setScalar(s);
		scene.add(m);
		particles.push({
			mesh: m,
			vx: (Math.random() - 0.5) * 13 * size,
			vy: (Math.random() - 0.3) * 11 * size,
			life: 0.35 + Math.random() * 0.5,
			max: 0.9,
		});
	}
}
function clearWorld() {
	for (const a of entities) remove(a);
	entities = [];
	ships = [];
	actors.clear();
	for (const p of particles) scene.remove(p.mesh);
	particles = [];
}
function spawnShip(seat) {
	const x = (seat - (localCoop ? 0.5 : 0)) * 3;
	const s = addActor("ship", "player", x, -6.6, 5, seat);
	Object.assign(s, {
		cool: 0,
		dash: 0,
		pulse: 0,
		invuln: 2,
		power: 0,
		revive: 0,
		flash: 0,
	});
	ships.push(s);
	return s;
}
const waveNames = [
	"",
	"Unwelcome wings",
	"Two for trouble",
	"Velvet rain",
	"Crossfire carnival",
	"Last call for little devils",
	"The Big Bad Rumble",
];
function startRun(opts = {}) {
	clearWorld();
	mode = "playing";
	isAttract = !!opts.attract;
	localCoop = !!opts.coop;
	wave = 0;
	score = 0;
	combo = 1;
	comboTime = 0;
	kills = 0;
	shots = 0;
	hits = 0;
	elapsed = 0;
	bossPhase = 0;
	simTime = 0;
	nextWaveTimer = 1;
	enemyShotTimer = 1;
	runStats = { splits: 0, dashes: 0, pulses: 0, pickups: 0, bossPhases: 0 };
	const n = opts.players || (localCoop ? 2 : 1);
	for (let i = 0; i < n; i++) {
		const s = spawnShip(i);
		s.x = (i - (n - 1) / 2) * 3;
		s.mesh.position.x = s.x;
		s.body?.setTranslation({ x: s.x, y: s.y, z: 0 }, true);
	}
	showScreen(null);
	$("#hud").classList.remove("hidden");
	$("#attract-tag").classList.toggle("hidden", !isAttract);
	if (!isAttract) audio.event("wave");
}
function startWave() {
	wave++;
	if (wave > 6) {
		endRun(true);
		return;
	}
	banner(
		wave === 6
			? "FINAL ENCOUNTER"
			: `NIGHT ${String(wave).padStart(2, "0")} / 06`,
		waveNames[wave],
	);
	audio.event(wave === 6 ? "boss" : "wave");
	nextWaveTimer = -1;
	enemyShotTimer = 1.4;
	if (wave === 6) {
		addActor("enemy", "boss", 0, 5.1, 150 + ships.length * 40);
		bossPhase = 1;
		runStats.bossPhases = 1;
		return;
	}
	const rows = wave < 3 ? 1 : 2,
		cols = wave < 2 ? 5 : wave < 4 ? 6 : 7;
	for (let row = 0; row < rows; row++)
		for (let col = 0; col < cols; col++) {
			const type =
				wave === 1 ? "imp" : (col + row) % 3 === 0 ? "elite" : "demon";
			addActor(
				"enemy",
				type,
				(col - (cols - 1) / 2) * 3.4,
				5.5 - row * 2.8,
				type === "elite" ? 4 : wave === 1 ? 1 : 2,
			);
		}
	if (wave === 1) textToast("Hold FIRE. Keep moving. Own the night.");
	if (wave === 2) textToast("Demons split. Finish their diving offspring!");
	if (wave === 3) textToast("Catch the diamonds for FORKFIRE or a repair.");
	if (wave === 4) textToast("PULSE erases bullets. DASH slips through danger.");
}
function shoot(s) {
	if (s.hp <= 0 || s.cool > 0) return;
	s.cool = 0.17 / tuning.fireRate;
	const spread = s.power > 0 ? [-0.19, 0, 0.19] : [0];
	for (const angle of spread) {
		const b = addActor("bullet", "friendly", s.x, s.y + 0.85, 1, s.seat);
		b.vx = angle * 15;
		b.vy = 23;
		b.damage = tuning.damage;
		b.body?.setLinvel({ x: b.vx, y: b.vy, z: 0 }, true);
	}
	shots++;
	shotCounter++;
	if (shotCounter % 2 === 0) audio.event("shoot");
	burst(s.x, s.y + 0.9, C.acid, 2, 0.3);
}
function hostile(x, y, vx, vy) {
	const b = addActor("bullet", "hostile", x, y, 1);
	b.vx = vx;
	b.vy = vy;
	b.body?.setLinvel({ x: vx, y: vy, z: 0 }, true);
	return b;
}
function pulse(s) {
	if (s.pulse > 0 || s.hp <= 0) return;
	s.pulse = 13;
	s.invuln = Math.max(s.invuln, 0.5);
	runStats.pulses++;
	audio.event("pulse");
	shake = 0.25;
	for (const a of [...entities]) {
		if (a.kind === "bullet" && a.type === "hostile") {
			burst(a.x, a.y, C.cyan, 2, 0.5);
			remove(a);
		}
		if (a.kind === "enemy") damageEnemy(a, a.type === "boss" ? 8 : 2, s.seat);
	}
	const ring = new THREE.Mesh(geos.ring, mat(C.cyan, false));
	ring.position.set(s.x, s.y, 1);
	scene.add(ring);
	particles.push({ mesh: ring, vx: 0, vy: 0, life: 0.5, max: 0.5, ring: true });
	textToast("NIGHT WASHED CLEAN");
}
function dash(s, dir) {
	if (s.dash > 0 || s.hp <= 0) return;
	s.dash = 1.8;
	s.invuln = 0.45;
	s.x = clamp(s.x + (dir || 1) * 4.1, -14, 14);
	runStats.dashes++;
	audio.event("dash");
	burst(s.x, s.y, C.cyan, 12, 1);
}
function damageShip(s) {
	if (s.invuln > 0 || s.hp <= 0 || tuning.invincible || isAttract) return;
	s.hp--;
	s.invuln = 1.7;
	s.flash = 0.2;
	combo = 1;
	shake = 0.38;
	flash = 0.2;
	audio.event("hit");
	burst(s.x, s.y, C.coral, 22, 1.1);
	if (s.hp === 0) {
		s.mesh.visible = false;
		s.revive = 7;
		burst(s.x, s.y, C.cream, 32, 1.5);
		if (ships.every((x) => x.hp <= 0)) endRun(false);
		else textToast(`P${s.seat + 1} knocked out · returning in 7s`);
	}
}
function damageEnemy(a, damage, seat = 0) {
	if (a.dead) return;
	a.hp -= damage;
	hits++;
	a.flash = 0.09;
	if (a.hp > 0) {
		burst(a.x, a.y, C.cream, 3, 0.6);
		return;
	}
	const x = a.x,
		y = a.y;
	const type = a.type;
	remove(a);
	kills++;
	combo = Math.min(9, combo + 0.1);
	comboTime = 3;
	score += Math.round(
		(type === "boss"
			? 3000
			: type === "elite"
				? 180
				: type === "shard"
					? 50
					: 100) * Math.floor(combo),
	);
	audio.event("kill");
	burst(
		x,
		y,
		type === "elite" ? C.purple : C.coral,
		type === "boss" ? 80 : 18,
		type === "boss" ? 3 : 1,
	);
	shake = Math.max(shake, type === "boss" ? 0.7 : 0.08);
	for (const s of ships) s.pulse = Math.max(0, s.pulse - 0.17);
	if (type === "demon" || type === "elite") {
		runStats.splits++;
		audio.event("split");
		for (const d of [-1, 1]) {
			const b = addActor("enemy", "shard", x + d * 0.5, y, 1);
			b.vx = d * 2.4;
			b.vy = -1.25;
			b.diving = true;
		}
	}
	if (type !== "shard" && (kills % 4 === 0 || type === "elite")) {
		const p = addActor("pickup", kills % 3 === 0 ? "repair" : "power", x, y);
		p.vy = -2.7;
		p.body?.setLinvel({ x: 0, y: p.vy, z: 0 }, true);
	}
}
function collect(p, s) {
	if (p.dead) return;
	remove(p);
	runStats.pickups++;
	if (p.type === "repair") s.hp = Math.min(5, s.hp + 1);
	else {
		s.power = 17;
		s.pulse = Math.max(0, s.pulse - 3);
	}
	audio.event("pickup");
	burst(s.x, s.y, C.acid, 15);
	textToast(
		p.type === "repair" ? "HULL PATCHED +1" : "FORKFIRE · three is a crowd",
	);
	score += 150;
}
function endRun(won) {
	if (mode !== "playing") return;
	mode = won ? "victory" : "defeat";
	if (isAttract) {
		setTimeout(() => {
			if (isAttract) startRun({ attract: true });
		}, 4000);
		return;
	}
	audio.event(won ? "victory" : "defeat");
	if (net?.active && net.isHost) net.finish(score, won);
	$("#result-kicker").textContent = won
		? "THE NIGHT IS YOURS"
		: "THE NIGHT BITES BACK";
	$("#result-title").textContent = won
		? "HELL OF A SHIFT."
		: "ONE MORE RUMBLE?";
	$("#result-score").textContent = String(score).padStart(6, "0");
	$("#result-detail").textContent =
		`${kills} demons banished · ${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")} survived · ${runStats.splits} splits`;
	showScreen("results");
}
function title() {
	if (net?.active) return;
	clearWorld();
	mode = "title";
	isAttract = false;
	$("#hud").classList.add("hidden");
	$("#attract-tag").classList.add("hidden");
	$("#wave-banner").classList.add("hidden");
	showScreen("title");
	const types = ["elite", "demon", "shard"];
	types.forEach((t, i) => {
		const a = addActor(
			"enemy",
			t,
			9 + (i === 1 ? -3 : i === 2 ? 2 : 0),
			i === 0 ? 1.7 : i === 1 ? -2.2 : -3.5,
			2,
		);
		a.preview = true;
		if (i === 0) a.mesh.scale.setScalar(2.3);
		if (i === 1) a.mesh.scale.setScalar(1.25);
	});
	lastActivity = performance.now();
}
function getInput(seat) {
	const c = { move: 0, fire: false, pulse: false, dash: false };
	const pad =
		navigator.getGamepads?.()[net?.active && seat === net.localSeat ? 0 : seat];
	if (pad) {
		const axis = pad.axes[0] || 0;
		c.move = Math.abs(axis) > 0.16 ? axis : 0;
		if (pad.buttons[14]?.pressed) c.move = -1;
		if (pad.buttons[15]?.pressed) c.move = 1;
		c.fire = !!pad.buttons[0]?.pressed || !!pad.buttons[7]?.pressed;
		c.pulse = !!pad.buttons[2]?.pressed;
		c.dash = !!pad.buttons[1]?.pressed || !!pad.buttons[5]?.pressed;
	}
	if (seat === (net?.active ? net.localSeat : 0)) {
		if (keys.has("ArrowLeft") || keys.has("KeyA")) c.move = -1;
		if (keys.has("ArrowRight") || keys.has("KeyD")) c.move = 1;
		c.fire ||= keys.has("Space") || pointer.fire || touches.size > 0;
		c.pulse ||= actionPulse || keys.has("KeyE");
		c.dash ||= actionDash || keys.has("ShiftLeft") || keys.has("ShiftRight");
	}
	if (seat === 1 && localCoop) {
		if (keys.has("KeyJ")) c.move = -1;
		if (keys.has("KeyL")) c.move = 1;
		c.fire ||= keys.has("KeyI");
		c.pulse ||= keys.has("KeyU");
		c.dash ||= keys.has("KeyO");
	}
	if (seat === (net?.active ? net.localSeat : 0)) {
		const s = ships.find((a) => a.seat === seat);
		if (s && pointer.active && lastInput === "mouse")
			c.move = clamp((pointer.x - s.x) * 3, -1, 1);
		if (touchStart && lastInput === "touch")
			c.move = clamp((touchStart.current - touchStart.start) / 55, -1, 1);
	}
	return c;
}
function aiInput(s) {
	const enemies = entities.filter((a) => a.kind === "enemy" && !a.dead);
	const target = enemies.reduce(
		(a, b) => (Math.abs(b.x - s.x) < Math.abs((a?.x ?? 100) - s.x) ? b : a),
		null,
	);
	const flight = target ? Math.max(0, (target.y - s.y) / 23) : 0;
	let targetX = target?.x ?? Math.sin(simTime) * 9;
	if (target) {
		if (target.type === "boss")
			targetX = Math.sin((simTime + flight) * 0.55) * 8;
		else if (target.type === "shard") targetX = target.x + target.vx * flight;
		else
			targetX =
				target.baseX +
				Math.sin((simTime + flight) * (0.65 + wave * 0.05) + target.phase) *
					1.6;
	}
	const threats = entities.filter(
		(a) =>
			a.type === "hostile" &&
			a.y < s.y + 3 &&
			a.y > s.y - 0.7 &&
			Math.abs(a.x - s.x) < 1.2,
	);
	if (threats.length) targetX = s.x + (s.x > 0 ? -3 : 3);
	const d = targetX - s.x;
	return {
		move: Math.abs(d) > 0.25 ? clamp(d * 2, -1, 1) : 0,
		fire: true,
		pulse:
			s.pulse <= 0 &&
			(entities.filter((a) => a.type === "hostile").length > 12 ||
				wave === 6 ||
				(wave >= 2 && simTime > 14)),
		dash: threats.length > 1,
	};
}
function simulation(dt) {
	simTime += dt;
	if (mode === "title") {
		for (const a of entities) {
			a.mixer?.update(dt);
			a.mesh.position.y = a.y + Math.sin(simTime * 1.8 + a.id) * 0.2;
		}
		return;
	}
	if (mode !== "playing") return;
	elapsed += dt;
	if (net?.active && !net.isHost) {
		for (const a of entities) a.mixer?.update(dt);
		return;
	}
	comboTime -= dt;
	if (comboTime < 0) combo = Math.max(1, combo - dt * 0.4);
	for (const s of ships) {
		s.cool = Math.max(0, s.cool - dt);
		s.dash = Math.max(0, s.dash - dt);
		s.pulse = Math.max(0, s.pulse - dt);
		s.invuln = Math.max(0, s.invuln - dt);
		s.power = Math.max(0, s.power - dt);
		s.flash = Math.max(0, (s.flash || 0) - dt);
		if (s.hp <= 0) {
			s.revive -= dt;
			if (s.revive <= 0) {
				s.hp = 3;
				s.invuln = 3;
				s.mesh.visible = true;
			}
			continue;
		}
		const c =
			isAttract || tuning.autoplay
				? aiInput(s)
				: net?.active && s.seat !== net.localSeat
					? controls[s.seat]
					: getInput(s.seat);
		let move = c.move || 0;
		if (
			s.seat === (net?.active ? net.localSeat : 0) &&
			!tuning.autoplay &&
			!isAttract
		) {
			if (pointer.active && lastInput === "mouse") {
				move = clamp((pointer.x - s.x) * 3, -1, 1);
			}
			if (touchStart && lastInput === "touch")
				move = clamp((touchStart.current - touchStart.start) / 55, -1, 1);
		}
		s.x = clamp(s.x + move * 12 * dt, -14, 14);
		s.mesh.rotation.z = THREE.MathUtils.lerp(
			s.mesh.rotation.z,
			-move * 0.13,
			0.18,
		);
		if (c.fire) shoot(s);
		if (c.dash) dash(s, move || Math.sign(s.x) || 1);
		if (c.pulse) pulse(s);
		s.mesh.position.set(s.x, s.y, 0);
		s.mesh.visible =
			!(s.invuln > 0 && Math.floor(s.invuln * 14) % 2 === 0) && s.hp > 0;
		s.body?.setNextKinematicTranslation({ x: s.x, y: s.y, z: 0 });
		s.mixer?.update(dt);
	}
	for (const a of entities) {
		if (a.dead || a.kind === "ship") continue;
		a.t += dt;
		a.mixer?.update(dt);
		if (a.kind === "enemy") {
			if (a.type === "boss") {
				const hp = a.hp / a.maxHp,
					phase = hp < 0.3 ? 3 : hp < 0.66 ? 2 : 1;
				if (phase !== bossPhase) {
					bossPhase = phase;
					runStats.bossPhases++;
					audio.event("boss");
					banner(
						"THE BIG BAD RUMBLE",
						phase === 2 ? "Wings off. Gloves off." : "One last bad idea.",
					);
					for (let i = 0; i < 3; i++)
						addActor("enemy", "demon", -7 + i * 7, 5, 2);
				}
				a.x = Math.sin(simTime * 0.55) * 8;
				a.y = 4.6 + Math.sin(simTime * 0.9) * 0.8;
				a.fire -= dt * tuning.enemySpeed;
				if (a.fire <= 0) {
					a.fire = phase === 3 ? 0.72 : phase === 2 ? 1.05 : 1.45;
					const n = phase === 1 ? 5 : 9;
					for (let j = 0; j < n; j++) {
						const angle = (j - (n - 1) / 2) * 0.16 + Math.sin(simTime) * 0.12;
						hostile(
							a.x,
							a.y - 1.5,
							Math.sin(angle) * 7 * tuning.bulletSpeed,
							-Math.cos(angle) * 7 * tuning.bulletSpeed,
						);
					}
				}
			} else if (a.type === "shard") {
				a.x += a.vx * dt * tuning.enemySpeed;
				a.y += a.vy * dt * tuning.enemySpeed;
				if (Math.abs(a.x) > 14) a.vx *= -1;
				if (a.y < -5) {
					a.vy = -4;
					a.vx = clamp(
						((ships.find((s) => s.hp > 0)?.x || 0) - a.x) * 1.5,
						-5,
						5,
					);
				}
				if (a.y < -8.3) {
					a.y = 7.3;
					a.vy = -1.8;
					a.vx *= 0.6;
				}
			} else {
				a.x =
					a.baseX + Math.sin(simTime * (0.65 + wave * 0.05) + a.phase) * 1.6;
				a.y = a.baseY + Math.sin(simTime * 1.8 + a.phase) * 0.4;
			}
			a.mesh.position.set(a.x, a.y, 0);
			a.mesh.rotation.y = Math.sin(simTime * 1.5 + a.phase) * 0.14;
			a.body?.setNextKinematicTranslation({ x: a.x, y: a.y, z: 0 });
			a.flash = Math.max(0, (a.flash || 0) - dt);
		} else if (a.kind === "bullet" || a.kind === "pickup") {
			const p = a.body?.translation();
			if (p) {
				a.x = p.x;
				a.y = p.y;
			} else {
				a.x += a.vx * dt;
				a.y += a.vy * dt;
			}
			a.mesh.position.set(a.x, a.y, 0.2);
			if (a.kind === "pickup") {
				a.mesh.rotation.y += dt * 2;
				const closest = ships
					.filter((s) => s.hp > 0)
					.sort((s, t) => Math.abs(s.x - a.x) - Math.abs(t.x - a.x))[0];
				if (closest && a.y < -3) {
					a.vx = clamp((closest.x - a.x) * 4, -8, 8);
					a.body?.setLinvel({ x: a.vx, y: a.vy, z: 0 }, true);
				}
			}
			if (Math.abs(a.y) > 11 || Math.abs(a.x) > 20) remove(a);
		}
	}
	enemyShotTimer -= dt * tuning.enemySpeed;
	const demons = entities.filter(
		(a) =>
			a.kind === "enemy" && a.type !== "boss" && a.type !== "shard" && !a.dead,
	);
	if (enemyShotTimer <= 0 && demons.length) {
		enemyShotTimer = wave === 1 ? 1.3 : Math.max(0.36, 1.1 - wave * 0.11);
		const a = demons[Math.floor(Math.random() * demons.length)],
			target = ships.filter((s) => s.hp > 0)[
				Math.floor(Math.random() * ships.filter((s) => s.hp > 0).length)
			];
		if (target) {
			const dx = target.x - a.x,
				dy = target.y - a.y,
				d = Math.hypot(dx, dy);
			const speed = (4 + wave * 0.35) * tuning.bulletSpeed;
			hostile(a.x, a.y - 0.8, (dx / d) * speed, (dy / d) * speed);
			if (a.type === "elite") {
				hostile(a.x, a.y - 0.8, (dx / d) * speed - 1.4, (dy / d) * speed);
				hostile(a.x, a.y - 0.8, (dx / d) * speed + 1.4, (dy / d) * speed);
			}
		}
	}
	world.timestep = dt;
	world.step(queue);
	const contacts = [];
	queue.drainCollisionEvents((h1, h2, started) => {
		if (started) contacts.push([actors.get(h1), actors.get(h2)]);
	});
	for (let [a, b] of contacts) {
		if (!a || !b || a.dead || b.dead) continue;
		if (
			(a.kind === "bullet" && a.type === "friendly" && b.kind === "enemy") ||
			(b.kind === "bullet" && b.type === "friendly" && a.kind === "enemy")
		) {
			if (a.kind !== "bullet") [a, b] = [b, a];
			damageEnemy(b, a.damage || tuning.damage, a.seat);
			remove(a);
			continue;
		}
		if (a.kind === "ship" || b.kind === "ship") {
			if (b.kind === "ship") [a, b] = [b, a];
			if (b.kind === "pickup") collect(b, a);
			else if (
				b.kind === "enemy" ||
				(b.kind === "bullet" && b.type === "hostile")
			) {
				damageShip(a);
				if (b.kind === "bullet") remove(b);
				else if (b.type === "shard") damageEnemy(b, 1, a.seat);
			}
		}
	}
	entities = entities.filter((a) => !a.dead);
	if (nextWaveTimer >= 0) {
		nextWaveTimer -= dt;
		if (nextWaveTimer < 0) startWave();
	} else if (!entities.some((a) => a.kind === "enemy")) {
		nextWaveTimer = 2.7;
		for (const s of ships) {
			s.hp = Math.min(5, s.hp + 1);
			s.invuln = 2;
		}
		score += wave * 350;
	}
	actionPulse = false;
	actionDash = false;
}
function updateEffects(dt) {
	for (const p of particles) {
		p.life -= dt;
		if (p.ring) {
			const s = 1 + (1 - p.life / p.max) * 25;
			p.mesh.scale.set(s, s, 1);
		} else {
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.y += p.vy * dt;
			p.vy -= dt * 4;
			p.mesh.rotation.z += dt * 5;
			p.mesh.scale.multiplyScalar(Math.pow(0.2, dt));
		}
		if (p.life <= 0) scene.remove(p.mesh);
	}
	particles = particles.filter((p) => p.life > 0);
	shake = Math.max(0, shake - dt);
	const amp = settings.reduced ? 0 : shake * 0.3;
	camera.position.x = (Math.random() - 0.5) * amp;
	camera.position.y = (Math.random() - 0.5) * amp;
	flash = Math.max(0, flash - dt);
	$("#damage-flash").style.opacity = flash * 2;
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("#toast").classList.add("hidden");
	}
	if (bannerTimer > 0) {
		bannerTimer -= dt;
		if (bannerTimer <= 0) $("#wave-banner").classList.add("hidden");
	}
}
function snapshot() {
	return {
		m: mode,
		w: wave,
		s: score,
		c: combo,
		t: elapsed,
		b: bossPhase,
		e: entities
			.filter((a) => !a.dead)
			.map((a) => [
				a.id,
				a.kind,
				a.type,
				+a.x.toFixed(2),
				+a.y.toFixed(2),
				a.hp,
				a.maxHp,
				a.seat,
				a.power || 0,
				a.pulse || 0,
				a.dash || 0,
			]),
		r: runStats,
	};
}
function applySnapshot(s) {
	if (!s?.e) return;
	const oldWave = wave;
	wave = s.w;
	score = s.s;
	combo = s.c;
	elapsed = s.t;
	bossPhase = s.b;
	runStats = s.r || runStats;
	const old = new Map(entities.map((a) => [a.id, a]));
	const ids = new Set();
	for (const v of s.e) {
		ids.add(v[0]);
		let a = old.get(v[0]);
		if (!a) {
			if (v[1] === "bullet" && v[2] === "friendly") audio.event("shoot");
			a = addActor(v[1], v[2], v[3], v[4], v[5], v[7], v[0]);
			if (a.kind === "ship") {
				ships.push(a);
				a.invuln = 0;
				a.cool = 0;
			}
		} else if (a.kind === "enemy" && v[5] < a.hp) {
			burst(v[3], v[4], C.coral, 5);
			audio.event("kill");
		}
		Object.assign(a, {
			x: v[3],
			y: v[4],
			hp: v[5],
			maxHp: v[6],
			power: v[8],
			pulse: v[9],
			dash: v[10],
		});
		a.mesh.position.set(a.x, a.y, 0);
		a.mesh.visible = a.hp > 0;
	}
	for (const a of entities)
		if (!ids.has(a.id)) {
			if (a.kind === "enemy") burst(a.x, a.y, C.coral, 10);
			remove(a);
		}
	entities = entities.filter((a) => !a.dead);
	ships = entities.filter((a) => a.kind === "ship");
	if (oldWave !== wave) banner(`NIGHT ${wave} / 06`, waveNames[wave]);
	if (s.m === "victory" || s.m === "defeat") {
		mode = "playing";
		endRun(s.m === "victory");
	}
}
function prompts() {
	const pad = lastInput === "pad";
	return pad
		? settings.glyphs === "xbox"
			? { fire: "A", dash: "B", pulse: "X", menu: "☰", accept: "A", back: "B" }
			: {
					fire: "✕",
					dash: "○",
					pulse: "□",
					menu: "OPTIONS",
					accept: "✕",
					back: "○",
				}
		: lastInput === "touch"
			? {
					fire: "AUTO",
					dash: "2 FINGERS",
					pulse: "PULSE",
					menu: "MENU",
					accept: "TAP",
					back: "BACK",
				}
			: {
					fire: "SPACE / CLICK",
					dash: "SHIFT",
					pulse: "E",
					menu: "ESC",
					accept: "ENTER",
					back: "ESC",
				};
}
function updateHUD() {
	const p = prompts();
	$("#score-value").textContent = String(score).padStart(6, "0");
	$("#wave-value").textContent = `${Math.min(6, wave)} / 06`;
	$("#combo-value").textContent = `×${Math.floor(combo)}`;
	const s =
		ships.find((x) => x.seat === (net?.active ? net.localSeat : 0)) || ships[0];
	if (s) {
		$("#hull-value").textContent =
			"◆".repeat(Math.max(0, s.hp)) + "◇".repeat(Math.max(0, 5 - s.hp));
		$("#pulse-fill").style.width = (1 - s.pulse / 13) * 100 + "%";
		$("#pulse-label").textContent =
			s.pulse > 0 ? `PULSE ${Math.ceil(s.pulse)}s` : `${p.pulse}  PULSE READY`;
		$("#power-label").textContent =
			s.power > 0
				? `FORKFIRE ${Math.ceil(s.power)}s`
				: `${p.fire} FIRE · ${p.dash} DASH`;
		$("#touch-pulse").classList.toggle(
			"hidden",
			lastInput !== "touch" || mode !== "playing" || s.pulse > 0 || !!screen,
		);
	}
	const boss = entities.find((a) => a.type === "boss");
	$("#boss-health").classList.toggle("hidden", !boss);
	if (boss) $("#boss-fill").style.width = (boss.hp / boss.maxHp) * 100 + "%";
	const scrollHint =
		screen && $(`[data-screen="${screen}"] .modal`)
			? lastInput === "pad"
				? "RIGHT STICK SCROLL · "
				: lastInput === "touch"
					? "SWIPE TO SCROLL · "
					: "PGUP / PGDN SCROLL · "
			: "";
	$("#prompt-footer").textContent =
		`${scrollHint}${p.accept} SELECT   ·   ${p.back} BACK`;
	$("#p2-hud").textContent =
		ships.length > 1
			? ships
					.filter((x) => x.seat !== 0)
					.map((x) => `P${x.seat + 1} ${"◆".repeat(Math.max(0, x.hp))}`)
					.join("   ")
			: "";
}
function activity(type) {
	if (isAttract) {
		title();
	}
	if (type !== lastInput) {
		lastInput = type;
		document.body.dataset.input = type;
		updateHUD();
	}
	lastActivity = performance.now();
}
function showScreen(name) {
	screen = name;
	document
		.querySelectorAll("[data-screen]")
		.forEach((el) => el.classList.toggle("hidden", el.dataset.screen !== name));
	$("#touch-menu").classList.toggle("hidden", name !== null);
	$("#prompt-footer").classList.toggle("hidden", name === null);
	focusIndex = 0;
	if (name) {
		const modal = $(`[data-screen="${name}"] .modal`);
		if (modal) modal.scrollTop = 0;
	}
	updateHUD();
	setTimeout(focusMenu, 0);
}
function focusMenu() {
	const items = menuItems();
	items.forEach((b, i) => b.classList.toggle("selected", i === focusIndex));
}
function menuItems() {
	if (!screen) return [];
	return [
		...document.querySelectorAll(
			`[data-screen="${screen}"] button,[data-screen="${screen}"] input,[data-screen="${screen}"] textarea`,
		),
	].filter((el) => !el.disabled && !el.closest(".hidden"));
}
function menuMove(d) {
	const items = menuItems();
	if (!items.length) return;
	focusIndex = (focusIndex + d + items.length) % items.length;
	focusMenu();
	items[focusIndex].scrollIntoView({ block: "nearest" });
	audio.event("menu");
}
function menuAccept() {
	const items = menuItems(),
		el = items[focusIndex];
	if (!el) return;
	if (el.tagName === "INPUT" && el.type === "range") return;
	el.click();
}
function goBack() {
	if (net?.active && screen !== "pause" && screen !== null) {
		showScreen("pause");
		return;
	}
	if (screen === "pause") {
		resume();
	} else if (
		screen === "dev" ||
		screen === "settings" ||
		screen === "about" ||
		screen === "help"
	) {
		showScreen(backScreen);
	} else if (screen === "online" || screen === "signal") {
		showScreen("title");
	} else if (screen && screen !== "title") title();
}
function pause() {
	if (mode !== "playing" || isAttract) return;
	mode = "paused";
	backScreen = "pause";
	showScreen("pause");
	audio.suspend();
}
function resume() {
	mode = "playing";
	showScreen(null);
	audio.resume();
}
function bindUI() {
	document.body.dataset.input = lastInput;
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch" || (!e.movementX && !e.movementY)) return;
		activity("mouse");
		const b = e.target.closest("button");
		if (!b) return;
		const idx = menuItems().indexOf(b);
		if (idx >= 0) {
			focusIndex = idx;
			focusMenu();
		}
	});
	document.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		audio.unlock();
		audio.event("menu");
		const action = b.dataset.action;
		if (!action) return;
		if (action === "solo") startRun();
		if (action === "coop") startRun({ coop: true });
		if (action === "resume") resume();
		if (action === "retry" && !net?.hub) {
			if (net.active) net.disconnect();
			audio.setMuted(false);
			startRun({ coop: localCoop });
		}
		if (action === "title") {
			if (net?.active && !net.hub) net.disconnect();
			title();
		}
		if (["settings", "about", "help"].includes(action)) {
			backScreen = screen;
			showScreen(action);
		}
		if (action === "back") goBack();
		if (action === "pause") pause();
		if (action === "dev") {
			if (net?.active) {
				textToast("Developer tools are available outside online rounds.");
				return;
			}
			showScreen("dev");
		}
		if (action === "online") showScreen("online");
		if (action === "host") signaling("host");
		if (action === "join") signaling("join");
		if (action === "signal-submit") submitSignal();
		if (action === "copy")
			navigator.clipboard
				?.writeText($("#signal-output").value)
				.then(() => textToast("Signal copied"))
				.catch(() => {
					$("#signal-output").select();
				});
		if (action === "fullscreen") {
			if (!document.fullscreenElement)
				document.documentElement.requestFullscreen?.().catch(() => {});
			else document.exitFullscreen?.();
		}
		if (action === "glyphs") {
			settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
			b.textContent = `Controller glyphs: ${settings.glyphs === "ps" ? "PlayStation" : "Xbox"}`;
			save();
		}
		if (action === "reduced") {
			settings.reduced = !settings.reduced;
			b.textContent = `Reduced motion: ${settings.reduced ? "ON" : "OFF"}`;
			save();
		}
		if (action === "god") {
			tuning.invincible = !tuning.invincible;
			b.textContent = `Invincible: ${tuning.invincible ? "ON" : "OFF"}`;
		}
		if (action === "auto") {
			tuning.autoplay = !tuning.autoplay;
			b.textContent = `Autopilot: ${tuning.autoplay ? "ON" : "OFF"}`;
		}
		if (action === "clear") {
			for (const a of [...entities])
				if (a.kind === "enemy") damageEnemy(a, 999);
		}
		if (action === "boss") {
			for (const a of [...entities]) if (a.kind !== "ship") remove(a);
			wave = 5;
			nextWaveTimer = 0.1;
		}
		if (action === "refill")
			ships.forEach((s) => {
				s.hp = 5;
				s.pulse = 0;
				s.power = 30;
			});
		if (action === "reset") {
			Object.assign(tuning, defaults);
			document.querySelectorAll("[data-tune]").forEach((el) => {
				el.value = tuning[el.dataset.tune];
				el.nextElementSibling.textContent = Number(el.value).toFixed(2) + "×";
			});
			$('[data-action="god"]').textContent = "Invincible: OFF";
			$('[data-action="auto"]').textContent = "Autopilot: OFF";
		}
	});
	document.querySelectorAll("[data-tune]").forEach((el) =>
		el.addEventListener("input", () => {
			tuning[el.dataset.tune] = +el.value;
			el.nextElementSibling.textContent = Number(el.value).toFixed(2) + "×";
		}),
	);
	$('button[data-action="glyphs"]').textContent =
		`Controller glyphs: ${settings.glyphs === "ps" ? "PlayStation" : "Xbox"}`;
	$('button[data-action="reduced"]').textContent =
		`Reduced motion: ${settings.reduced ? "ON" : "OFF"}`;
	$("#music").value = settings.music;
	$("#sfx").value = settings.sfx;
	$("#music").addEventListener("input", (e) => {
		settings.music = +e.target.value;
		audio.setMusic(settings.music);
		$("#music-value").textContent = Math.round(settings.music * 100) + "%";
		save();
	});
	$("#sfx").addEventListener("input", (e) => {
		settings.sfx = +e.target.value;
		audio.setSfx(settings.sfx);
		$("#sfx-value").textContent = Math.round(settings.sfx * 100) + "%";
		save();
	});
	$("#music-value").textContent = Math.round(settings.music * 100) + "%";
	$("#sfx-value").textContent = Math.round(settings.sfx * 100) + "%";
	$("#touch-pulse").addEventListener("pointerdown", (e) => {
		e.stopPropagation();
		actionPulse = true;
	});
}
let signalRole = "host";
async function signaling(role) {
	signalRole = role;
	showScreen("signal");
	$("#signal-heading").textContent =
		role === "host" ? "OPEN A NIGHT SHIFT" : "JOIN A NIGHT SHIFT";
	$("#signal-output").value = "";
	$("#signal-input").value = "";
	$("#signal-status").textContent =
		role === "host"
			? "Generating invitation…"
			: "Paste the host’s invitation below.";
	$("#signal-output-wrap").classList.toggle("hidden", role === "join");
	$("#signal-submit").textContent =
		role === "host" ? "CONNECT ANSWER" : "CREATE ANSWER";
	try {
		if (role === "host") {
			$("#signal-output").value = await net.createOffer();
			$("#signal-status").textContent =
				"1. Send this invitation to a friend.  2. Paste their answer below.";
		}
	} catch (e) {
		$("#signal-status").textContent = e.message;
	}
}
async function submitSignal() {
	try {
		if (signalRole === "host") {
			await net.acceptAnswer($("#signal-input").value.trim());
			$("#signal-status").textContent = "Connecting…";
		} else {
			const answer = await net.acceptOffer($("#signal-input").value.trim());
			$("#signal-output-wrap").classList.remove("hidden");
			$("#signal-output").value = answer;
			$("#signal-status").textContent =
				"Send this answer back to the host. The shift starts on connection.";
		}
	} catch (e) {
		$("#signal-status").textContent = e.message;
	}
}
function bindInput() {
	window.addEventListener("keydown", (e) => {
		if (e.target.matches("textarea,input")) {
			if (e.key === "Escape") {
				e.target.blur();
				goBack();
			}
			return;
		}
		const hadAttract = isAttract;
		activity("keyboard");
		audio.unlock();
		if (
			["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
				e.code,
			)
		)
			e.preventDefault();
		if (hadAttract) return;
		keys.add(e.code);
		if (e.repeat) return;
		if (e.code === "Escape" || e.code === "KeyP") {
			if (!screen) pause();
			else goBack();
		} else if (screen) {
			if (e.code === "PageDown" || e.code === "PageUp") {
				const modal = $(`[data-screen="${screen}"] .modal`);
				if (modal) {
					e.preventDefault();
					modal.scrollTop +=
						(e.code === "PageDown" ? 1 : -1) * modal.clientHeight * 0.65;
				}
			}
			if (e.code === "ArrowDown" || e.code === "KeyS") menuMove(1);
			if (e.code === "ArrowUp" || e.code === "KeyW") menuMove(-1);
			if (e.code === "Enter" || e.code === "Space") menuAccept();
			const el = menuItems()[focusIndex];
			if (
				el?.type === "range" &&
				(e.code === "ArrowLeft" || e.code === "ArrowRight")
			) {
				el.value = clamp(
					+el.value + (e.code === "ArrowRight" ? 1 : -1) * +el.step,
					+el.min,
					+el.max,
				);
				el.dispatchEvent(new Event("input"));
			}
		}
	});
	window.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => {
		keys.clear();
		pointer.fire = false;
		touches.clear();
		touchStart = null;
		if (!net?.active) pause();
	});
	renderer.domElement.addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch") return;
		activity("mouse");
		pointer.active = true;
		pointer.x = ((e.clientX / innerWidth) * 2 - 1) * camera.right;
	});
	renderer.domElement.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "touch") return;
		const attract = isAttract;
		activity("mouse");
		audio.unlock();
		if (attract) return;
		if (e.button === 0) pointer.fire = true;
		if (e.button === 2) actionPulse = true;
	});
	window.addEventListener("pointerup", () => (pointer.fire = false));
	renderer.domElement.addEventListener("contextmenu", (e) =>
		e.preventDefault(),
	);
	renderer.domElement.addEventListener(
		"touchstart",
		(e) => {
			e.preventDefault();
			const attract = isAttract;
			activity("touch");
			audio.unlock();
			if (attract) return;
			for (const t of e.changedTouches)
				touches.set(t.identifier, { x: t.clientX, y: t.clientY });
			if (!touchStart) {
				const t = e.changedTouches[0];
				touchStart = { id: t.identifier, start: t.clientX, current: t.clientX };
			}
			if (touches.size >= 2) actionDash = true;
		},
		{ passive: false },
	);
	renderer.domElement.addEventListener(
		"touchmove",
		(e) => {
			e.preventDefault();
			for (const t of e.changedTouches)
				if (touchStart?.id === t.identifier) touchStart.current = t.clientX;
		},
		{ passive: false },
	);
	window.addEventListener(
		"touchend",
		(e) => {
			for (const t of e.changedTouches) {
				touches.delete(t.identifier);
				if (touchStart?.id === t.identifier) touchStart = null;
			}
		},
		{ passive: true },
	);
	document.addEventListener("pointerdown", (e) => {
		if (e.target.closest("button")) {
			activity(e.pointerType === "touch" ? "touch" : "mouse");
			audio.unlock();
		}
	});
}
function pollPads(dt) {
	const pads = navigator.getGamepads?.() || [];
	padNavTimer -= dt;
	for (let p = 0; p < pads.length; p++) {
		const pad = pads[p];
		if (!pad) continue;
		const old = padPrevious[p] || [];
		const pressed = (i) => pad.buttons[i]?.pressed && !old[i];
		const active =
			pad.buttons.some((b) => b.pressed) ||
			pad.axes.some((a) => Math.abs(a) > 0.2);
		const wasAttract = isAttract;
		if (active) {
			activity("pad");
			audio.unlock();
		}
		if (wasAttract) {
			padPrevious[p] = pad.buttons.map((b) => b.pressed);
			continue;
		}
		if (pressed(9) && !pad.buttons[8]?.pressed) {
			if (!screen) pause();
			else goBack();
		}
		if (screen) {
			const scrollAxis = pad.axes[3] || 0;
			if (Math.abs(scrollAxis) > 0.18) {
				const modal = $(`[data-screen="${screen}"] .modal`);
				if (modal) modal.scrollTop += scrollAxis * dt * 700;
			}
			const axis = pad.axes[1] || 0;
			if (
				padNavTimer <= 0 &&
				(Math.abs(axis) > 0.6 ||
					pad.buttons[12]?.pressed ||
					pad.buttons[13]?.pressed)
			) {
				menuMove(axis > 0.6 || pad.buttons[13]?.pressed ? 1 : -1);
				padNavTimer = 0.3;
			}
			if (pressed(0)) menuAccept();
			if (pressed(1)) goBack();
			const el = menuItems()[focusIndex],
				x = pad.axes[0] || 0;
			if (
				el?.type === "range" &&
				padNavTimer <= 0 &&
				(Math.abs(x) > 0.6 ||
					pad.buttons[14]?.pressed ||
					pad.buttons[15]?.pressed)
			) {
				el.value = clamp(
					+el.value + (x > 0.6 || pad.buttons[15]?.pressed ? 1 : -1) * +el.step,
					+el.min,
					+el.max,
				);
				el.dispatchEvent(new Event("input"));
				padNavTimer = 0.12;
			}
		}
		padPrevious[p] = pad.buttons.map((b) => b.pressed);
	}
}
function resize() {
	renderer.setSize(innerWidth, innerHeight);
	const aspect = innerWidth / innerHeight;
	if (aspect < 1.3) {
		camera.left = -16;
		camera.right = 16;
		camera.top = 16 / aspect;
		camera.bottom = -16 / aspect;
	} else {
		camera.top = 10.125;
		camera.bottom = -10.125;
		camera.right = 10.125 * aspect;
		camera.left = -camera.right;
	}
	camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
function renderCredits() {
	const meta = window.GAME_METADATA;
	const root = $("#credit-content");
	if (!meta) return;
	for (const [heading, data] of [
		["Source Information", meta.sourceInformation],
		["Testing Feedback", meta.testingFeedback],
		["Engine Feedback", meta.engineFeedback],
		["Prompt Feedback", meta.promptFeedback],
	]) {
		const h = document.createElement("h3");
		h.textContent = heading;
		root.appendChild(h);
		if (Array.isArray(data)) {
			data.forEach((v) => {
				const p = document.createElement("p");
				p.textContent = v;
				root.appendChild(p);
			});
		} else
			for (const [k, v] of Object.entries(data)) {
				const p = document.createElement("p");
				const b = document.createElement("b");
				b.textContent = k + ": ";
				p.appendChild(b);
				p.appendChild(document.createTextNode(v));
				root.appendChild(p);
			}
	}
}
async function init() {
	try {
		await RAPIER.init();
		world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		queue = new RAPIER.EventQueue(true);
		await renderer.init();
		rendererBackend = renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		buildBackdrop();
		bindUI();
		bindInput();
		renderCredits();
		resize();
		net = new NetworkDirector({
			onStart(info) {
				startRun({ players: net.playerCount || info?.players?.length || 2 });
			},
			onSnapshot: applySnapshot,
			onRemoteInput(data, seat) {
				if (seat >= 0 && seat < 4)
					controls[seat] = {
						move: clamp(Number(data.move) || 0, -1, 1),
						fire: !!data.fire,
						pulse: !!data.pulse,
						dash: !!data.dash,
					};
			},
			onEnd(reason, details) {
				audio.setMuted(true);
				if (net.hub) {
					stopped = true;
					mode = "ended";
					showScreen(null);
					textToast("ROUND COMPLETE");
				} else {
					if (
						reason === "finished" ||
						mode === "victory" ||
						mode === "defeat"
					) {
						const won =
							reason === "finished" ? !!details?.won : mode === "victory";
						score = details?.score ?? score;
						mode = "playing";
						endRun(won);
					} else {
						mode = "defeat";
						$("#result-kicker").textContent = "CONNECTION CLOSED";
						$("#result-title").textContent = "WINGMATE DISCONNECTED";
						$("#result-score").textContent = String(score).padStart(6, "0");
						$("#result-detail").textContent =
							"Open a new shift to play together again.";
						showScreen("results");
					}
					net.disconnect();
					audio.setMuted(false);
				}
			},
			onTimeUp() {
				if (net.isHost) net.finish(score, mode === "victory");
			},
			onLeave(id) {
				const s = ships.find((s) => s.seat === id);
				if (s) {
					remove(s);
					ships = ships.filter((s) => !s.dead);
				}
				textToast("A wingmate left the shift.");
			},
		});
		const info = await net.initHub();
		ready = true;
		$("#loading").classList.add("hidden");
		if (info) {
			mode = "waiting";
			showScreen(null);
			$("#hud").classList.remove("hidden");
			net.hubReady();
		} else title();
		window.__game = {
			state: () => ({
				ready,
				backend: rendererBackend,
				screen,
				mode,
				wave,
				score,
				kills,
				hits,
				shots,
				elapsed,
				combo,
				runStats: { ...runStats },
				ships: ships.map((s) => ({
					seat: s.seat,
					x: s.x,
					hp: s.hp,
					power: s.power,
					pulse: s.pulse,
					dash: s.dash,
				})),
				enemies: entities
					.filter((a) => a.kind === "enemy")
					.map((a) => ({ id: a.id, type: a.type, hp: a.hp, x: a.x, y: a.y })),
				bullets: entities.filter((a) => a.kind === "bullet").length,
				physicsBodies: world.bodies.len(),
				tuning: { ...tuning },
				audio: audio.diagnostics(),
				network: net.diagnostics(),
				lastInput,
				isAttract,
			}),
			start: (opts) => startRun(opts),
			step(n = 1) {
				testMode = true;
				for (let i = 0; i < n; i++) {
					simulation(1 / 60);
					updateEffects(1 / 60);
					audio.update(1 / 60, wave / 6);
				}
				updateHUD();
			},
			live() {
				testMode = false;
			},
			tune: (v) => Object.assign(tuning, v),
			pulse: () => pulse(ships[0]),
			dash: (d) => dash(ships[0], d),
			damage: () => {
				ships[0].invuln = 0;
				damageShip(ships[0]);
			},
			spawn: (type, x, y, hp) => addActor("enemy", type, x, y, hp).id,
			clear: () => {
				for (const a of [...entities]) if (a.kind === "enemy") remove(a);
			},
			pickup: (type) => {
				const s = ships[0];
				collect(addActor("pickup", type, s.x, s.y), s);
			},
			title,
			attract: () => startRun({ attract: true }),
			pause,
			resume,
			network: net,
			settings,
			renderer,
		};
		let previous = performance.now();
		renderer.setAnimationLoop((now) => {
			let dt = Math.min((now - previous) / 1000, 0.05);
			previous = now;
			if (!ready || stopped) return;
			pollPads(dt);
			if (!testMode) {
				if (mode === "title" && performance.now() - lastActivity > 10000)
					startRun({ attract: true });
				accumulator += dt;
				let steps = 0;
				while (accumulator >= 1 / 60 && steps < 4) {
					simulation(1 / 60);
					accumulator -= 1 / 60;
					steps++;
				}
				updateEffects(dt);
				audio.update(dt, wave / 6);
			}
			if (net.active) {
				const input =
					net.server || screen
						? { move: 0, fire: false, pulse: false, dash: false }
						: getInput(net.localSeat);
				net.update(dt, snapshot(), input);
			}
			uiTick += dt;
			if (uiTick > 0.09) {
				updateHUD();
				uiTick = 0;
			}
			renderer.render(scene, camera);
		});
	} catch (e) {
		console.error(e);
		$("#loading").innerHTML =
			'<div class="panel error"><h2>THE PORTAL STALLED</h2><p></p><button onclick="location.reload()">TRY AGAIN</button></div>';
		$("#loading p").textContent = e.message;
		window.AIHub?.fail?.(e.message);
	}
}
init();
