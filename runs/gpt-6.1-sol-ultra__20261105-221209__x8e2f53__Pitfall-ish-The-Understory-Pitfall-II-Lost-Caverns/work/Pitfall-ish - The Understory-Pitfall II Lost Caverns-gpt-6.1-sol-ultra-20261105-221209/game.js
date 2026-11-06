import * as THREE from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
import { AudioDirector, renderAudioProbe } from "./audio.js";
import { GameUI } from "./ui.js";
import "./hub.js";
import metadata from "./metadata.json";

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const palette = {
	ink: 0x092d33,
	rock: 0xb56d4b,
	ochre: 0xe5a969,
	top: 0xefd49b,
	fern: 0x41877d,
	mint: 0x79ddbc,
	gold: 0xffd174,
	water: 0x267f93,
};
const defaults = {
	speed: 6.2,
	gravity: 22,
	jump: 10.5,
	swim: 4.5,
	hazard: 1,
	camera: 22,
};
const cfg = { ...defaults };
const settings = {
	music: 0.1,
	sfx: 0.6,
	glyphs: "playstation",
	assist: false,
	reducedMotion: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("understory-settings") || "{}"),
	);
} catch {}
const stats = {
	steps: 0,
	jumps: 0,
	swims: 0,
	balloons: 0,
	ladders: 0,
	hits: 0,
	checkpoints: 0,
	rescues: 0,
	coins: 0,
	frames: 0,
};
let mode = "loading",
	lastInput = "keyboard",
	time = 0,
	elapsed = 0,
	titleIdle = 0,
	attractTime = 0,
	invincible = false,
	ready = false,
	won = false,
	networkTick = 0,
	roundVersion = 0;
let accumulator = 0,
	lastFrame = 0,
	mapVisited = new Set(["camp"]),
	checkpointIndex = 0,
	score = 0,
	bridgeOpen = false;
let cachedRemoteInput = {},
	lastState = null;
const input = {
	left: false,
	right: false,
	up: false,
	down: false,
	jump: false,
	action: false,
};
const keys = new Set();
let jumpQueue = false,
	actionQueue = false,
	lastPadButtons = [];
const audio = new AudioDirector();
const ui = new GameUI({ onAction: handleAction }, metadata);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b3036);
scene.fog = new THREE.Fog(0x0b3036, 35, 78);
const camera = new THREE.OrthographicCamera(-20, 20, 11, -11, 0.1, 110);
let recoveringRenderer = false;
let renderer,
	world,
	controller,
	localId = "solo",
	players = [];
const worldRoot = new THREE.Group();
scene.add(worldRoot);
const coins = [],
	rescues = [],
	checkpoints = [],
	hazards = [],
	balloons = [],
	motes = [],
	animated = [],
	lamps = [];
const platforms = [];
const ladders = [
	{ x: 17, top: 3, bottom: -12 },
	{ x: 47, top: -12, bottom: -27 },
];
const waters = [{ x0: 48, x1: 78, top: -27, bottom: -38 }];
const route = [
	{ x: 8, y: 4.1 },
	{ x: 17, y: 4.1 },
	{ x: 17, y: -10.9 },
	{ x: 24, y: -10.9 },
	{ x: 29, y: -9.2 },
	{ x: 35, y: -10.9 },
	{ x: 44, y: -10.9 },
	{ x: 47, y: -10.9 },
	{ x: 47, y: -25.8 },
	{ x: 57, y: -28.5 },
	{ x: 73, y: -35.2 },
	{ x: 79, y: -28 },
	{ x: 84, y: -25.9 },
	{ x: 86, y: -22 },
	{ x: 86, y: 5.5 },
	{ x: 76, y: -3.9 },
	{ x: 65, y: -3.9 },
	{ x: 61, y: 0.2 },
	{ x: 56, y: 4.2 },
	{ x: 35, y: 4.2 },
	{ x: 22, y: 4.2 },
	{ x: 8, y: 4.2 },
];
const matCache = new Map();
function mat(c) {
	if (!matCache.has(c))
		matCache.set(c, new THREE.MeshToonNodeMaterial({ color: c }));
	return matCache.get(c);
}
const inkMat = new THREE.MeshBasicNodeMaterial({
	color: palette.ink,
	side: THREE.BackSide,
});
function mesh(
	geo,
	c,
	x = 0,
	y = 0,
	z = 0,
	outline = false,
	parent = worldRoot,
) {
	const m = new THREE.Mesh(geo, mat(c));
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	parent.add(m);
	if (outline) {
		const o = new THREE.Mesh(geo, inkMat);
		o.scale.setScalar(1.04);
		m.add(o);
	}
	return m;
}
function box(w, h, d, c, x, y, z = 0, o = false, p = worldRoot) {
	return mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z, o, p);
}
function sphere(r, c, x, y, z = 0, p = worldRoot, sx = 1, sy = 1, sz = 1) {
	const m = mesh(new THREE.SphereGeometry(r, 12, 8), c, x, y, z, true, p);
	m.scale.set(sx, sy, sz);
	return m;
}
function line(points, c = palette.ink, parent = worldRoot) {
	const g = new THREE.BufferGeometry().setFromPoints(
		points.map((p) => new THREE.Vector3(...p)),
	);
	const l = new THREE.Line(g, new THREE.LineBasicNodeMaterial({ color: c }));
	parent.add(l);
	return l;
}
function textSprite(
	text,
	x,
	y,
	z,
	size = 1.1,
	color = "#f5e6c1",
	parent = worldRoot,
) {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 96;
	const cx = canvas.getContext("2d");
	cx.font = "bold 38px Georgia";
	cx.fillStyle = color;
	cx.textAlign = "center";
	cx.fillText(text, 256, 57);
	const tex = new THREE.CanvasTexture(canvas);
	const s = new THREE.Sprite(
		new THREE.SpriteNodeMaterial({ map: tex, transparent: true }),
	);
	s.scale.set(size * 5.34, size, 1);
	s.position.set(x, y, z);
	parent.add(s);
	return s;
}
function seeded(n) {
	let s = n;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 4294967296;
	};
}
const rnd = seeded(1984);
function ground(x0, x1, top, bottom, color = palette.rock, collider = true) {
	const w = x1 - x0;
	box(
		w,
		top - bottom,
		3.6,
		color,
		(x0 + x1) / 2,
		(top + bottom) / 2,
		-0.7,
		true,
	);
	box(w, 0.22, 3.85, palette.top, (x0 + x1) / 2, top - 0.02, -0.7, true);
	platforms.push({ x0, x1, top, bottom });
	if (collider)
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(w / 2, (top - bottom) / 2, 2).setTranslation(
				(x0 + x1) / 2,
				(top + bottom) / 2,
				0,
			),
		);
	// Hand-cut front facets and strata keep the terrain looking like illustrated rock.
	for (let x = x0 + 0.25; x < x1 - 0.4; x += 2.8) {
		const w = Math.min(2.6, x1 - x),
			h = Math.min(top - bottom - 0.4, 1 + rnd() * 2.6);
		const shape = new THREE.Shape();
		shape.moveTo(-w / 2, 0);
		shape.lineTo(w / 2, -0.2);
		shape.lineTo(w * 0.3, -h);
		shape.lineTo(-w * 0.25, -h * 0.7);
		shape.closePath();
		mesh(
			new THREE.ShapeGeometry(shape),
			rnd() > 0.5 ? 0xc28155 : 0xad6c4d,
			x + w / 2,
			top - 0.35,
			1.13,
		);
		if (top - bottom > 3)
			line(
				[
					[x, top - 2.8, 1.16],
					[Math.min(x + 2.5, x1), top - 2.6 - rnd() * 0.3, 1.16],
				],
				0xd29b6a,
			);
	}
	for (let x = x0 + 0.7; x < x1; x += 1.7 + rnd() * 1.7) {
		line(
			[
				[x, top - 0.5, 1.14],
				[x - 0.4, top - 1.3, 1.15],
				[x + 0.1, top - 2.2, 1.15],
			],
			0x713f39,
		);
		if (rnd() > 0.35) fern(x, top + 0.08, 1.05, 0.4 + rnd() * 0.4);
		if (rnd() > 0.55) {
			const vineLength = 0.8 + rnd() * 2.1;
			line(
				[
					[x, top + 0.1, 1.25],
					[x + 0.16, top - vineLength * 0.5, 1.3],
					[x - 0.15, top - vineLength, 1.3],
				],
				0x427a62,
			);
			for (let j = 0; j < 3; j++) {
				const leaf = mesh(
					new THREE.SphereGeometry(0.13, 5, 3),
					0x4f9372,
					x + (j % 2 ? 0.16 : -0.05),
					top - 0.3 - (j * vineLength) / 3,
					1.32,
				);
				leaf.scale.set(1.8, 0.7, 0.3);
			}
		}
	}
}
function fern(x, y, z, s = 1) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	g.scale.setScalar(s);
	worldRoot.add(g);
	for (let i = 0; i < 5; i++) {
		const a = (i - 2) * 0.42;
		const stem = mesh(
			new THREE.ConeGeometry(0.18, 0.95, 3),
			i % 2 ? 0x509c87 : 0x2c766e,
			Math.sin(a) * 0.32,
			0.3 + Math.cos(a) * 0.15,
			0,
			false,
			g,
		);
		stem.rotation.z = -a;
		for (let j = 0; j < 3; j++) {
			const leaf = mesh(
				new THREE.ConeGeometry(0.16, 0.48, 3),
				0x5db19a,
				Math.sin(a) * (0.3 + j * 0.11),
				0.25 + j * 0.15,
				0.05,
				false,
				g,
			);
			leaf.rotation.z = -a + (i % 2 ? 1 : -1) * 0.8;
		}
	}
	return g;
}
function crystal(x, y, z, s = 0.6, c = palette.mint) {
	const m = mesh(new THREE.OctahedronGeometry(s), c, x, y, z, true);
	m.scale.y = 1.8;
	return m;
}
function makeExplorer(color = 0xe88652) {
	const g = new THREE.Group();
	const torso = box(0.66, 0.78, 0.44, color, 0, 0.06, 0, true, g);
	torso.name = "torso";
	const head = sphere(0.29, 0xf2c68b, 0, 0.73, 0, g, 1, 0.95, 0.9);
	sphere(0.15, 0xf2c68b, 0.27, 0.68, 0.1, g);
	box(0.9, 0.11, 0.7, 0xe7c575, 0, 1.01, 0, true, g);
	box(0.58, 0.3, 0.5, 0xe7c575, 0, 1.17, 0, true, g);
	box(0.63, 0.07, 0.53, 0x7d493b, 0, 1.08, 0, false, g);
	box(0.08, 0.11, 0.03, palette.ink, 0.15, 0.8, 0.265, false, g);
	box(0.08, 0.11, 0.03, palette.ink, -0.12, 0.8, 0.265, false, g);
	box(0.1, 0.52, 0.08, 0xf0d899, 0.06, 0.06, 0.245, false, g);
	box(0.45, 0.65, 0.28, 0x6f7963, -0.15, 0.07, -0.36, true, g);
	const limbs = {};
	for (const [name, x, y, w, h, col] of [
		["armL", -0.47, 0.23, 0.2, 0.65, 0xe88652],
		["armR", 0.47, 0.23, 0.2, 0.65, 0xe88652],
		["legL", -0.19, -0.53, 0.23, 0.65, 0x334e50],
		["legR", 0.19, -0.53, 0.23, 0.65, 0x334e50],
	]) {
		const pivot = new THREE.Group();
		pivot.name = name;
		pivot.position.set(x, y, 0);
		g.add(pivot);
		box(w, h, 0.27, col, 0, -h * 0.37, 0, true, pivot);
		if (name.startsWith("leg"))
			box(0.3, 0.18, 0.45, 0x4d3830, 0.035, -h * 0.8, 0.05, true, pivot);
		else sphere(0.12, 0xf2c68b, 0, -h * 0.8, 0, pivot);
		limbs[name] = pivot;
	}
	const mixer = new THREE.AnimationMixer(g);
	const T = THREE.NumberKeyframeTrack;
	const tracks = [];
	for (const [name, sign] of [
		["armL", 1],
		["armR", -1],
		["legL", -1],
		["legR", 1],
	])
		tracks.push(
			new T(
				name + ".rotation[z]",
				[0, 0.2, 0.4, 0.6, 0.8],
				[0, 0.65 * sign, 0, -0.65 * sign, 0],
			),
		);
	const walk = mixer.clipAction(
		new THREE.AnimationClip("expedition-stride", 0.8, tracks),
	);
	walk.play();
	const float = mixer.clipAction(
		new THREE.AnimationClip("river-kick", 1, [
			new T("armL.rotation[z]", [0, 0.5, 1], [1.4, -0.3, 1.4]),
			new T("armR.rotation[z]", [0, 0.5, 1], [-1.4, 0.3, -1.4]),
		]),
	);
	float.play();
	float.setEffectiveWeight(0);
	return { g, mixer, walk, float, limbs };
}
function createPlayer(id, color) {
	const visual = makeExplorer(color);
	scene.add(visual.g);
	visual.g.position.set(8, 4.02, 0);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(8, 4.02, 0),
	);
	const col = world.createCollider(
		RAPIER.ColliderDesc.capsule(0.42, 0.32),
		body,
	);
	const cc = world.createCharacterController(0.025);
	cc.enableAutostep(0.25, 0.25, true);
	cc.enableSnapToGround(0.25);
	const p = {
		id,
		...visual,
		body,
		col,
		cc,
		x: 8,
		y: 4.02,
		vx: 0,
		vy: 0,
		grounded: false,
		facing: 1,
		health: 3,
		invuln: 0,
		ladder: false,
		swimming: false,
		balloon: false,
		balloonId: -1,
		grabCooldown: 0,
		checkpoint: { x: 8, y: 4.02 },
		coyote: 0,
		jumpHeld: false,
		actionHeld: false,
		remote: false,
	};
	players.push(p);
	return p;
}
function createWorld() {
	scene.add(new THREE.HemisphereLight(0xf7e6bf, 0x26575b, 2.7));
	const sun = new THREE.DirectionalLight(0xffdaa0, 3.3);
	sun.position.set(-8, 28, 23);
	scene.add(sun);
	const fill = new THREE.DirectionalLight(0x7bc4c0, 1);
	fill.position.set(30, -20, 10);
	scene.add(fill);
	ground(-10, 16.2, 3, -2);
	ground(17.8, 21, 3, -2);
	ground(10, 25, -12, -17);
	ground(30, 46.2, -12, -17);
	ground(47.8, 49, -12, -17);
	ground(27, 28.8, -10.5, -11.2);
	ground(34, 48, -27, -40);
	ground(48, 78, -38, -43, 0x356b6c);
	ground(78, 97, -27, -40);
	ground(64, 83.5, -5, -9);
	ground(88.5, 97, -5, -9);
	ground(61.5, 64, -2.8, -4);
	ground(59, 61.4, -0.6, -1.8);
	ground(56.5, 58.9, 1.5, 0.3);
	ground(34, 56.4, 3, -1);
	// Layered distant cliff silhouettes, lit mineral strata and old arches.
	for (let layer = 0; layer < 3; layer++) {
		for (let x = -25; x < 120; x += 6) {
			const h = 10 + rnd() * 30;
			sphere(
				1,
				layer === 0 ? 0x174850 : layer === 1 ? 0x20555a : 0x315d59,
				x,
				-18 + rnd() * 15,
				-12 - layer * 9,
				worldRoot,
				4,
				h * 0.65,
				3,
			);
			for (let j = 0; j < 3; j++)
				mesh(
					new THREE.ConeGeometry(2 + rnd() * 3, 5 + rnd() * 8, 5),
					0x1a444c,
					x + rnd() * 4,
					-35 + j * 16,
					-10 - layer * 8,
				);
		}
	}
	for (let i = 0; i < 80; i++) {
		const x = -8 + rnd() * 110,
			y = 8 - rnd() * 52;
		const p = sphere(
			0.025 + rnd() * 0.04,
			i % 3 ? 0x97dbac : 0xf3c780,
			x,
			y,
			2 + rnd() * 6,
			worldRoot,
		);
		motes.push({ m: p, x, y, seed: rnd() * 10 });
	}
	for (const l of ladders) {
		for (const dx of [-0.48, 0.48])
			box(
				0.12,
				l.top - l.bottom + 0.8,
				0.18,
				0x8f6542,
				l.x + dx,
				(l.top + l.bottom) / 2,
				0.2,
				true,
			);
		for (let y = l.bottom; y < l.top + 0.4; y += 0.6)
			box(1.1, 0.13, 0.22, 0xe1b87d, l.x, y, 0.35, true);
	}
	for (let x = -5; x < 19; x += 2.5) {
		const h = 6 + rnd() * 4;
		box(0.55, h, 0.8, 0x214a44, x, 3 + h / 2, -5);
		for (let j = 0; j < 4; j++) {
			const a = j * 1.6 + rnd();
			const leaf = mesh(
				new THREE.SphereGeometry(1.7, 7, 5),
				j % 2 ? 0x347c60 : 0x28674f,
				x + Math.cos(a) * 2,
				3 + h + Math.sin(a),
				-5,
			);
			leaf.scale.set(2, 0.5, 1);
		}
	}
	for (let i = 0; i < 33; i++) {
		const x = 11 + rnd() * 85,
			y = -7 - rnd() * 26;
		const m = mesh(
			new THREE.ConeGeometry(0.18 + rnd() * 0.5, 1 + rnd() * 2, 5),
			i % 2 ? 0x30676a : 0x2b585b,
			x,
			y,
			-3 - rnd() * 4,
		);
		if (i % 2) m.rotation.z = Math.PI;
	}
	// Cascading underground spring, deliberately behind the traversable river.
	const waterMat = new THREE.MeshBasicNodeMaterial({
		color: 0x64cabc,
		transparent: true,
		opacity: 0.26,
		depthWrite: false,
	});
	const river = new THREE.Mesh(new THREE.BoxGeometry(30, 11, 2.5), waterMat);
	river.position.set(63, -32.5, -0.25);
	worldRoot.add(river);
	line(
		[
			[48, -27, 1.2],
			[78, -27, 1.2],
		],
		0x95e8d2,
	);
	for (let i = 0; i < 11; i++) {
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(0.08 + rnd() * 0.12, 12),
			waterMat,
		);
		m.position.set(52 + rnd() * 4, -20, -2.8);
		worldRoot.add(m);
		animated.push({ type: "waterfall", m, seed: rnd() * 8 });
	}
	for (let i = 0; i < 18; i++) {
		const x = 49 + rnd() * 28;
		fern(x, -37.8, 0.6, 0.6);
		crystal(x, -37.5, -1, 0.25, 0x72d0cb);
	}
	// Mineral clusters, ancient masonry and soft shafts of daylight.
	for (const [x, y] of [
		[13, -12],
		[35, -12],
		[46, -27],
		[81, -27],
		[92, -5],
		[38, 3],
	]) {
		for (let j = 0; j < 4; j++)
			crystal(
				x + j * 0.33,
				y + 0.4,
				-1,
				0.2 + rnd() * 0.25,
				j % 2 ? 0x82bdb2 : 0xebcb8b,
			);
	}
	for (const [x, y] of [
		[36, -12],
		[80, -27],
		[69, -5],
	]) {
		for (let j = 0; j < 3; j++) {
			box(
				0.55,
				1 + j * 0.18,
				0.65,
				0x73928a,
				x + j * 0.62,
				y + 0.5 + j * 0.09,
				-1.5,
				true,
			);
			box(0.7, 0.15, 0.8, 0xb1b99b, x + j * 0.62, y + 1 + j * 0.18, -1.5, true);
		}
		line(
			[
				[x - 0.5, y + 2.5, -1.6],
				[x + 0.8, y + 3.2, -1.6],
				[x + 2, y + 2.5, -1.6],
			],
			0x709a8c,
		);
	}
	const beamMat = new THREE.MeshBasicNodeMaterial({
		color: 0xffe2a0,
		transparent: true,
		opacity: 0.055,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
	for (const [x, y] of [
		[12, 11],
		[40, -3],
		[85, 7],
	]) {
		const beam = new THREE.Mesh(
			new THREE.ConeGeometry(2.5, 17, 4, 1, true),
			beamMat,
		);
		beam.position.set(x, y - 6, -2);
		beam.rotation.z = -0.17;
		worldRoot.add(beam);
	}
	// Camp: striped canvas tent, rope lines, kettle, crates and a real lantern.
	const tent = new THREE.Group();
	tent.position.set(4, 3, -1.2);
	worldRoot.add(tent);
	const tgeo = new THREE.ConeGeometry(2.1, 2.8, 4, 1, true);
	const t = mesh(tgeo, 0xe5b968, 0, 1.4, 0, true, tent);
	t.rotation.y = Math.PI / 4;
	box(1.1, 1.3, 0.08, palette.ink, 0, 0.65, 1.45, false, tent);
	line(
		[
			[-2.7, 0, 1],
			[0, 2.8, 0],
			[2.7, 0, 1],
		],
		0xead29b,
		tent,
	);
	box(1, 0.9, 0.8, 0x9c6844, 7, 3.45, -1.1, true);
	box(0.9, 0.8, 0.85, 0xbd8753, 8, 3.4, -1.4, true);
	textSprite("CAMP DAYLIGHT", 5, 6.9, -0.5, 1.1);
	textSprite("THE UNDERSTORY", 30, -4, -5, 1.5, "#78a998");
	for (const [x, y, name] of [
		[8, 3, "DAYLIGHT CAMP"],
		[34, -12, "FERN GALLERY"],
		[46.5, -27, "RIVER LANTERN"],
		[81, -27, "BALLOON DOCK"],
		[88, -5, "SUNLIT LEDGE"],
	]) {
		const g = new THREE.Group();
		g.position.set(x, y, 0);
		worldRoot.add(g);
		box(0.15, 2, 0.15, 0x674c3c, 0, 1, -0.6, true, g);
		box(0.55, 0.65, 0.4, 0xf4cc6a, 0, 1.8, -0.6, true, g);
		box(0.7, 0.12, 0.55, 0x244d4b, 0, 2.18, -0.6, true, g);
		const halo = sphere(0.5, 0xffd480, 0, 1.8, -0.6, g);
		halo.material = new THREE.MeshBasicNodeMaterial({
			color: 0xffd88e,
			transparent: true,
			opacity: 0.12,
			depthWrite: false,
		});
		checkpoints.push({ x, y: y + 1.02, name, g, active: false });
	}
	const companions = [
		[
			"PIP",
			44,
			-10.99,
			0x78bd9d,
			"That frog has my lunch. You may keep the frog.",
		],
		[
			"NIBS",
			73,
			-35,
			0xc5a27b,
			"Blub-biddle! My whiskers are absolutely waterlogged.",
		],
		[
			"PROFESSOR FERN",
			65,
			-3.99,
			0xc8a2c8,
			"A magnificent discovery! Now let us discover the way home.",
		],
	];
	for (const [name, x, y, col, speech] of companions) {
		const g = new THREE.Group();
		g.position.set(x, y, 0);
		worldRoot.add(g);
		if (name === "NIBS") {
			sphere(0.38, col, 0, -0.22, 0, g, 1.5, 0.8, 1);
			sphere(0.27, col, 0.36, 0.04, 0, g);
			sphere(0.06, palette.ink, 0.49, 0.09, 0.21, g);
			const tail = box(0.6, 0.12, 0.18, col, -0.65, -0.22, 0, true, g);
			tail.rotation.z = 0.35;
		} else {
			const v = makeExplorer(col);
			g.add(v.g);
			v.g.scale.setScalar(name === "PIP" ? 0.72 : 0.85);
			animated.push({ type: "companion", v });
		}
		const badge = crystal(x, y + 2, 0, 0.28, palette.gold);
		const label = textSprite(name, x, y + 2.7, 0, 0.65);
		rescues.push({ name, x, y, speech, g, badge, label, collected: false });
	}
	const goldPositions = [
		[12, 4.2],
		[17, -3],
		[17, -8],
		[22, -10.8],
		[27.9, -8.6],
		[32, -10.7],
		[39, -10.8],
		[46, -17],
		[47, -22],
		[52, -28.5],
		[58, -32],
		[65, -35],
		[70, -36],
		[76, -33],
		[80, -25.8],
		[86, -21],
		[86, -15],
		[86, -9],
		[90, -3.8],
		[76, -3.8],
		[65, -2],
		[61, 0.5],
		[55, 4.3],
		[44, 4.3],
		[36, 4.3],
	];
	goldPositions.forEach(([x, y], i) => {
		const m = mesh(
			new THREE.CylinderGeometry(0.27, 0.27, 0.1, 10),
			palette.gold,
			x,
			y,
			0.1,
			true,
		);
		m.rotation.x = Math.PI / 2;
		const rim = mesh(
			new THREE.TorusGeometry(0.18, 0.035, 4, 12),
			0xe49a43,
			0,
			0,
			0.07,
			false,
			m,
		);
		coins.push({ x, y, m, collected: false, id: i });
	});
	for (const [type, x, y, r] of [
		["frog", 23, -11.5, 2],
		["frog", 39, -11.5, 2.7],
		["bat", 33, -8, 4],
		["bat", 43, -19, 4],
		["eel", 59, -31, 4],
		["eel", 70, -34, 4],
		["bat", 76, -2, 3],
		["frog", 51, 3.5, 3],
	]) {
		const g = new THREE.Group();
		worldRoot.add(g);
		if (type === "frog") {
			sphere(0.32, 0x9eb855, 0, 0, 0, g, 1.4, 0.8, 1);
			for (const dx of [-0.22, 0.22]) {
				sphere(0.15, 0xc9d977, dx, 0.23, 0.05, g);
				sphere(0.055, palette.ink, dx, 0.26, 0.18, g);
			}
			box(0.6, 0.08, 0.1, 0x536447, 0, -0.03, 0.3, false, g);
		} else if (type === "bat") {
			sphere(0.25, 0x9b7291, 0, 0, 0, g);
			for (const sign of [-1, 1]) {
				const wing = mesh(
					new THREE.ConeGeometry(0.4, 0.9, 3),
					0xa582a2,
					sign * 0.45,
					0.05,
					0,
					true,
					g,
				);
				wing.rotation.z = (sign * Math.PI) / 2;
				wing.name = "wing" + sign;
			}
			sphere(0.06, palette.gold, 0.1, 0.08, 0.2, g);
		} else {
			sphere(0.3, 0xdd9a68, 0, 0, 0, g, 2.5, 0.7, 0.7);
			sphere(0.06, palette.ink, 0.57, 0.1, 0.18, g);
			mesh(
				new THREE.ConeGeometry(0.3, 0.5, 3),
				0xdbbb82,
				-0.75,
				0,
				0,
				true,
				g,
			).rotation.z = Math.PI / 2;
		}
		hazards.push({ type, x, y, r, g, px: x, py: y, phase: rnd() * 6 });
	}
	for (let i = 0; i < 3; i++) {
		const g = new THREE.Group();
		worldRoot.add(g);
		sphere(1.05, i % 2 ? 0xdd855e : 0xeeb65e, 0, 2.3, 0, g, 1, 1.25, 0.75);
		for (let j = 0; j < 5; j++) {
			const a = (j * Math.PI * 2) / 5;
			line(
				[
					[Math.cos(a) * 0.7, 1.5, 0.3],
					[Math.cos(a) * 0.35, 0, 0.3],
				],
				0xecd39e,
				g,
			);
		}
		box(0.85, 0.6, 0.7, 0x9b6b42, 0, -0.1, 0, true, g);
		box(1, 0.1, 0.8, 0xd9ad6a, 0, 0.2, 0, true, g);
		balloons.push({ g, x: 86, y: -26 + i * 11, phase: i * 11 });
	}
	textSprite("↓  FERN GALLERY", 17, 0.4, 1, 0.65);
	textSprite("THE LONG WAY DOWN", 37, -7, -3, 0.9, "#88a8a0");
	textSprite("UNDERGROUND RIVER", 63, -23, -3, 1, "#9ed7c5");
	textSprite("↑  BALLOON CHIMNEY", 88, -12, -3, 0.85, "#e7bd82");
	textSprite("HOMEWARD BOUND", 47, 8, -4, 1, "#b2bd91");
	// Repeating rope supports for the bridge that becomes available after all rescues.
	createBridge(false);
}
let bridgeMeshes = [];
let bridgeCollider = null;
function createBridge(open) {
	for (const m of bridgeMeshes) worldRoot.remove(m);
	bridgeMeshes = [];
	if (bridgeCollider) {
		world.removeCollider(bridgeCollider, true);
		bridgeCollider = null;
	}
	if (!open) {
		const sign = textSprite("BRIDGE RAISED", 21, 5.8, 0, 0.65);
		bridgeMeshes.push(sign);
		return;
	}
	for (let x = 21; x < 34; x += 0.65) {
		const b = box(0.56, 0.18, 2, palette.ochre, x, 3, -0.2, true);
		bridgeMeshes.push(b);
	}
	for (const z of [-1, 1]) {
		bridgeMeshes.push(
			line(
				[
					[20, 4.5, z],
					[27, 3.8, z],
					[34, 4.5, z],
				],
				0xe3cb91,
			),
		);
		for (let x = 21; x < 34; x += 1.4)
			bridgeMeshes.push(
				line(
					[
						[x, 3, z],
						[x, 4.1, z],
					],
					0xc19862,
				),
			);
	}
	bridgeCollider = world.createCollider(
		RAPIER.ColliderDesc.cuboid(7, 0.15, 1.8).setTranslation(27, 2.93, 0),
	);
}
function rescueVisual(r) {
	const i = rescues.indexOf(r);
	r.g.visible = true;
	r.badge.visible = r.label.visible = !r.collected;
	r.g.position.set(
		r.collected ? 10 + i * 1.7 : r.x,
		r.collected ? 4.02 : r.y,
		0,
	);
}
function getArea(p) {
	if (p.y > -2 && p.x < 23) return "Daylight camp";
	if (p.y < -26) return p.x > 78 ? "Balloon dock" : "Underground river";
	if (p.x > 78) return "Balloon chimney";
	if (p.y > -9 && p.x > 54) return "Sunlit ledge";
	if (p.y > -2) return "Homeward ridge";
	return "Fern gallery";
}
function localPlayer() {
	return players.find((p) => p.id === localId) || players[0];
}
function setInputMode(v) {
	if (lastInput !== v || ui.input !== v) {
		lastInput = v;
		ui.setInput(v, settings.glyphs);
	}
}
function userActivity() {
	titleIdle = 0;
	if (mode === "attract") {
		mode = "title";
		ui.show("title");
		resetGame(false);
		audio.setMode("title");
	}
}
function jumpPressed() {
	jumpQueue = true;
	userActivity();
}
function interactPressed() {
	actionQueue = true;
	userActivity();
}
function saveSettings() {
	try {
		localStorage.setItem("understory-settings", JSON.stringify(settings));
	} catch {}
}
function begin() {
	const net = window.CavernNet;
	if (!net || net.status().isHost) {
		roundVersion++;
		net?.beginRound?.();
	}
	resetGame(true);
	mode = "playing";
	ui.show("playing");
	audio.unlock();
	audio.setMode("playing");
	ui.toast(
		"A good hat. A long way down.",
		"Find Pip, Nibs and Professor Fern. Then return to camp.",
	);
}
function resetGame(full = true) {
	won = false;
	score = 0;
	elapsed = 0;
	checkpointIndex = 0;
	bridgeOpen = false;
	createBridge(false);
	mapVisited = new Set(["Daylight camp"]);
	for (const c of coins) {
		c.collected = false;
		c.m.visible = true;
	}
	for (const r of rescues) {
		r.collected = false;
		rescueVisual(r);
	}
	checkpoints.forEach((c) => (c.active = false));
	for (const p of players) {
		p.g.scale.setScalar(1);
		p.x = 8;
		p.y = 4.02;
		p.vy = p.vx = 0;
		p.health = 3;
		p.invuln = 0;
		p.balloon = false;
		p.checkpoint = { x: 8, y: 4.02 };
		p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
	}
	if (full) for (const k in stats) stats[k] = 0;
}
function teleport(p, x, y) {
	p.x = x;
	p.y = y;
	p.vx = p.vy = 0;
	p.balloon = false;
	p.body.setTranslation({ x, y, z: 0 }, true);
	p.body.setNextKinematicTranslation({ x, y, z: 0 });
	p.g.position.set(x, y, 0);
}
function hurt(p) {
	if (p.invuln > 0 || invincible || settings.assist || mode === "attract")
		return;
	p.health--;
	p.invuln = 2;
	stats.hits++;
	score = Math.max(0, score - 100);
	audio.sfx("hurt");
	burst(p.x, p.y, 0xeb8058, 14);
	if (p.health <= 0) {
		p.health = 3;
		teleport(p, p.checkpoint.x, p.checkpoint.y);
		ui.toast(
			"A small setback. A splendid hat.",
			"Back to the last lantern. Your friends and finds are safe.",
		);
	} else {
		p.vy = 6;
		p.vx = -p.facing * 3;
	}
}
const particles = [];
function burst(x, y, c, count = 12) {
	if (settings.reducedMotion) count = Math.min(count, 4);
	for (let i = 0; i < count; i++) {
		const m = sphere(0.05 + rnd() * 0.05, c, x, y, 1);
		particles.push({
			m,
			vx: (rnd() - 0.5) * 5,
			vy: rnd() * 6,
			life: 0.6 + rnd() * 0.7,
		});
	}
}
function updatePlayer(p, inp, dt) {
	const wasWater = p.swimming;
	const water = waters.find(
		(w) =>
			p.x > w.x0 + 0.1 &&
			p.x < w.x1 - 0.1 &&
			p.y < w.top - 0.15 &&
			p.y > w.bottom - 0.5,
	);
	p.swimming = !!water;
	p.invuln = Math.max(0, p.invuln - dt);
	p.grabCooldown = Math.max(0, p.grabCooldown - dt);
	const jumped = inp.jump && !p.jumpHeld,
		acted = inp.action && !p.actionHeld;
	p.jumpHeld = inp.jump;
	p.actionHeld = inp.action;
	const ladder = ladders.find(
		(l) =>
			Math.abs(p.x - l.x) < 0.82 && p.y < l.top + 1.6 && p.y > l.bottom - 0.4,
	);
	p.ladder =
		!!ladder &&
		(inp.up ||
			inp.down ||
			(p.ladder && Math.abs(p.x - ladder.x) < 0.65 && !inp.left && !inp.right));
	if (p.ladder && jumped) p.ladder = false;
	if (!wasWater && water) {
		audio.sfx("splash");
		burst(p.x, -27, 0x9fe4d3, 12);
		stats.swims++;
	}
	if (p.swimming) stats.swims += dt;
	if (p.balloon) {
		const b = balloons[p.balloonId];
		if (!b) {
			p.balloon = false;
		} else {
			teleportInBalloon(p, b.x, b.y + 0.65);
			if (
				jumped ||
				inp.down ||
				acted ||
				(Math.abs(inp.left ? 1 : inp.right ? 1 : 0) > 0 && p.y > 1)
			) {
				p.balloon = false;
				p.grabCooldown = 0.8;
				p.vy = jumped ? 7 : 2;
				p.x += (inp.left ? -1 : inp.right ? 1 : 0) * 0.75;
				audio.sfx("jump");
			} else {
				p.g.position.set(p.x, p.y, 0);
				return;
			}
		}
	}
	if (
		(acted || inp.up || (settings.assist && p.x > 82)) &&
		!p.balloon &&
		p.grabCooldown <= 0
	) {
		let nearest = balloons.findIndex(
			(b) => Math.hypot(p.x - b.x, p.y - (b.y + 0.65)) < 2.1,
		);
		if (nearest >= 0) {
			p.balloon = true;
			p.balloonId = nearest;
			p.ladder = false;
			stats.balloons++;
			audio.sfx("balloon");
			ui.toast(
				"Up, up, and mind the stalactites.",
				"Move sideways or jump near the top to dismount.",
			);
		}
	}
	let vx =
		((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) *
		(p.swimming ? cfg.swim : cfg.speed);
	if (vx) {
		p.facing = Math.sign(vx);
		stats.steps += dt;
	}
	p.vx = lerp(p.vx, vx, Math.min(1, dt * (p.swimming ? 6 : 16)));
	if (p.swimming) {
		p.vy = lerp(
			p.vy,
			((inp.up || inp.jump ? 1 : 0) - (inp.down ? 1 : 0)) * cfg.swim +
				(settings.assist ? 0.6 : 0),
			dt * 6,
		);
		p.ladder = false;
	} else if (p.ladder) {
		p.x = lerp(p.x, ladder.x, dt * 13);
		p.vx = 0;
		p.vy = ((inp.up ? 1 : 0) - (inp.down ? 1 : 0)) * 3.8;
		stats.ladders += dt;
	} else {
		p.vy -= cfg.gravity * dt;
		p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
		if (jumped && p.coyote > 0) {
			p.vy = cfg.jump;
			p.coyote = 0;
			stats.jumps++;
			audio.sfx("jump");
		}
		if (!inp.jump && p.vy > 4) p.vy -= cfg.gravity * 0.8 * dt;
	}
	// Water surface boost lets the explorer climb both riverbanks without a separate action.
	if (p.swimming && p.y > -28 && (inp.up || inp.jump)) {
		p.vy = 7.5;
		if (p.x > 76.8 && inp.right) p.vy = 10;
		if (p.x < 49.1 && inp.left) p.vy = 10;
	}
	const movement = { x: p.vx * dt, y: p.vy * dt, z: 0 };
	p.cc.computeColliderMovement(
		p.col,
		movement,
		RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
		undefined,
		(c) =>
			c.parent() !== p.body &&
			!players.some((q) => q !== p && q.col.handle === c.handle),
	);
	const corrected = p.cc.computedMovement();
	const pos = p.body.translation();
	p.x = clamp(pos.x + corrected.x, -8, 96);
	p.y = pos.y + corrected.y;
	p.grounded = p.cc.computedGrounded();
	if (p.grounded && p.vy < 0) p.vy = 0;
	p.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: 0 });
	if (p.y < -44) {
		p.health = 3;
		teleport(p, p.checkpoint.x, p.checkpoint.y);
		audio.sfx("hurt");
		stats.hits++;
	}
	p.g.position.set(p.x, p.y, 0);
	p.g.rotation.y = lerp(p.g.rotation.y, p.facing === 1 ? 0.3 : -0.3, dt * 10);
	p.g.rotation.z = lerp(
		p.g.rotation.z,
		p.swimming ? -p.facing * 0.6 : 0,
		dt * 8,
	);
	p.g.visible = p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0;
	p.mixer.update(dt * Math.max(0.2, Math.abs(p.vx) / 4));
	p.walk.setEffectiveWeight(p.swimming ? 0 : Math.min(1, Math.abs(p.vx) / 2));
	p.float.setEffectiveWeight(p.swimming ? 1 : p.ladder ? 0.7 : 0);
	for (let i = 0; i < checkpoints.length; i++) {
		const c = checkpoints[i];
		if (Math.abs(p.x - c.x) < 1.2 && Math.abs(p.y - c.y) < 1.8 && !c.active) {
			c.active = true;
			checkpointIndex = i;
			for (const q of players) {
				q.checkpoint = { x: c.x, y: c.y };
				q.health = 3;
			}
			stats.checkpoints++;
			audio.sfx("checkpoint");
			burst(c.x, c.y + 1, palette.gold);
			ui.toast(c.name, "Lantern lit · progress kept · hearts restored");
		}
	}
	for (const c of coins) {
		if (!c.collected && Math.hypot(p.x - c.x, p.y - c.y) < 1.05) {
			c.collected = true;
			c.m.visible = false;
			score += 100;
			stats.coins++;
			audio.sfx("coin");
			burst(c.x, c.y, palette.gold, 7);
		}
	}
	for (const r of rescues) {
		if (!r.collected && Math.hypot(p.x - r.x, p.y - r.y) < 1.4) {
			r.collected = true;
			rescueVisual(r);
			score += 1000;
			stats.rescues++;
			audio.sfx("rescue");
			audio.voice(r.name.length * 23);
			burst(r.x, r.y, palette.mint, 22);
			ui.toast(r.name + " FOUND!", r.speech);
			if (rescues.every((q) => q.collected)) {
				bridgeOpen = true;
				createBridge(true);
				ui.toast(
					"All together now.",
					"The homeward bridge is down. Meet everyone at Daylight Camp.",
				);
			}
		}
	}
	for (const h of hazards)
		if (
			Math.hypot(p.x - h.px, p.y - h.py) <
			(h.type === "eel" ? 0.8 : 0.65) + 0.25
		)
			hurt(p);
	const area = getArea(p);
	mapVisited.add(area);
	if (rescues.every((r) => r.collected) && p.x < 11 && p.y > 3 && !won)
		victory();
}
function teleportInBalloon(p, x, y) {
	p.x = x;
	p.y = y;
	p.vx = p.vy = 0;
	p.body.setTranslation({ x, y, z: 0 }, true);
	p.body.setNextKinematicTranslation({ x, y, z: 0 });
	p.g.position.set(x, y, 0);
	p.mixer.update(1 / 60);
}
function victory() {
	won = true;
	mode = "victory";
	audio.sfx("win");
	audio.setMode("victory");
	const net = window.CavernNet;
	if (net?.status().connected) net.sendState(snapshot());
	net?.finish({ won: true, score });
	ui.show("victory", {
		score,
		gold: coins.filter((c) => c.collected).length,
		totalGold: coins.length,
		time: Math.floor(elapsed),
		rescued: 3,
	});
}
function updateWorld(dt) {
	time += dt;
	for (const c of coins)
		if (!c.collected) {
			c.m.rotation.y += dt * 1.8;
			c.m.position.y = c.y + Math.sin(time * 2 + c.x) * 0.08;
		}
	for (const r of rescues)
		if (!r.collected) {
			r.badge.rotation.y += dt;
			r.badge.position.y = r.y + 2 + Math.sin(time * 2) * 0.16;
		}
	for (const b of balloons) {
		b.y = -27 + ((time * 2.5 + b.phase) % 35);
		b.g.position.set(86 + Math.sin(time * 0.5 + b.phase) * 0.16, b.y, 0);
		b.x = b.g.position.x;
	}
	for (const h of hazards) {
		h.px =
			h.x +
			Math.sin(time * cfg.hazard * (h.type === "bat" ? 1.2 : 0.7) + h.phase) *
				h.r;
		h.py =
			h.y +
			(h.type === "bat"
				? Math.sin(time * 1.5 + h.phase) * 1.2
				: h.type === "frog"
					? Math.max(0, Math.sin(time * 2 + h.phase)) * 0.6
					: Math.sin(time + h.phase) * 0.3);
		h.g.position.set(h.px, h.py, 0);
		h.g.rotation.y = Math.cos(time + h.phase) > 0 ? 0.2 : Math.PI - 0.2;
		if (h.type === "bat")
			for (const s of [-1, 1])
				h.g.getObjectByName("wing" + s).rotation.y = Math.sin(time * 12) * 0.55;
	}
	for (const m of motes) {
		m.m.position.x = m.x + Math.sin(time * 0.25 + m.seed) * 0.8;
		m.m.position.y = m.y + Math.sin(time * 0.5 + m.seed) * 0.5;
	}
	for (const a of animated)
		if (a.type === "companion") {
			a.v.mixer.update(dt * 0.25);
		} else if (a.type === "waterfall")
			a.m.material.opacity = 0.16 + Math.sin(time + a.seed) * 0.07;
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= dt;
		p.vy -= 7 * dt;
		p.m.position.x += p.vx * dt;
		p.m.position.y += p.vy * dt;
		p.m.scale.setScalar(Math.max(0.01, p.life));
		if (p.life <= 0) {
			worldRoot.remove(p.m);
			p.m.geometry.dispose();
			particles.splice(i, 1);
		}
	}
}
function pollPad(dt) {
	const pads = navigator.getGamepads?.() || [];
	const pad = Array.from(pads).find((p) => p && p.connected);
	if (!pad) return null;
	const active =
		pad.axes.some((a) => Math.abs(a) > 0.2) ||
		pad.buttons.some((b) => b.pressed);
	if (active) {
		setInputMode("gamepad");
		userActivity();
	}
	const bs = pad.buttons.map((b) => b.pressed);
	if (bs[9] && !lastPadButtons[9] && !bs[8])
		handleAction(mode === "playing" ? "pause" : "back");
	if (
		((bs[8] && !lastPadButtons[8]) || (bs[3] && !lastPadButtons[3])) &&
		mode === "playing"
	)
		handleAction("map");
	if (ui.screen !== "game" && mode !== "attract" && mode !== "loading")
		ui.handlePad(pad, dt);
	lastPadButtons = bs;
	return {
		left: pad.axes[0] < -0.2 || bs[14],
		right: pad.axes[0] > 0.2 || bs[15],
		up: pad.axes[1] < -0.3 || bs[12],
		down: pad.axes[1] > 0.3 || bs[13],
		jump: bs[0] || bs[1],
		action: bs[2],
	};
}
const touch = {
	active: new Map(),
	left: false,
	right: false,
	up: false,
	down: false,
	jump: false,
};
function getInput(pad) {
	return {
		left:
			keys.has("ArrowLeft") ||
			keys.has("KeyA") ||
			touch.left ||
			pad?.left ||
			false,
		right:
			keys.has("ArrowRight") ||
			keys.has("KeyD") ||
			touch.right ||
			pad?.right ||
			false,
		up: keys.has("ArrowUp") || keys.has("KeyW") || touch.up || pad?.up || false,
		down:
			keys.has("ArrowDown") ||
			keys.has("KeyS") ||
			touch.down ||
			pad?.down ||
			false,
		jump: keys.has("Space") || jumpQueue || touch.jump || pad?.jump || false,
		action: keys.has("KeyE") || actionQueue || pad?.action || false,
	};
}
function frame(t) {
	requestAnimationFrame(frame);
	if (!ready) return;
	const realDt = Math.max(0, (t - lastFrame) / 1000 || 0.016),
		dt = Math.min(0.05, realDt);
	lastFrame = t;
	stats.frames++;
	const pad = pollPad(dt);
	const inp = getInput(pad);
	audio.tick(dt);
	const net = window.CavernNet;
	const status = net?.status() || { isHost: true, active: false };
	if (mode === "title") {
		titleIdle += realDt;
		if (titleIdle >= 10) {
			resetGame(false);
			mode = "attract";
			attractTime = 0;
			ui.show("attract");
			audio.setMode("attract");
		}
	}
	if (mode === "title") {
		const p = localPlayer();
		if (p) {
			p.g.position.set(19.2, 4.05, 0);
			p.g.scale.setScalar(1.2);
			p.mixer.update(dt * 0.3);
			p.walk.setEffectiveWeight(0);
		}
	}
	if (mode === "attract") {
		attractTime += realDt;
		const duration = 70;
		const total = ((attractTime % duration) / duration) * (route.length - 1);
		const i = Math.floor(total),
			f = total - i;
		const a = route[i],
			b = route[Math.min(i + 1, route.length - 1)];
		const p = localPlayer();
		if (p) {
			teleport(
				p,
				lerp(a.x, b.x, f),
				lerp(a.y, b.y, f) +
					Math.sin(f * Math.PI) * (i === 3 || i === 16 ? 1.2 : 0),
			);
			p.mixer.update(dt);
			p.facing = b.x >= a.x ? 1 : -1;
			p.g.rotation.y = p.facing * 0.3;
			p.walk.setEffectiveWeight(0.8);
		}
		for (let j = 0; j < 3; j++) {
			const found = i > [6, 10, 16][j];
			rescues[j].collected = found;
			rescueVisual(rescues[j]);
		}
		if (i > 16 && !bridgeOpen) {
			bridgeOpen = true;
			createBridge(true);
		}
		if (i < 2 && bridgeOpen) {
			bridgeOpen = false;
			createBridge(false);
		}
	}
	const running =
		mode === "playing" &&
		(!status.active || status.started) &&
		(!status.active || net.time?.() >= 0 || !net.time);
	if (running) {
		elapsed += dt;
		if (status.isHost) {
			accumulator += dt;
			let n = 0;
			while (accumulator >= 1 / 60 && n++ < 4) {
				updateWorld(1 / 60);
				for (const p of players) {
					const pi = p.id === localId ? inp : cachedRemoteInput[p.id] || {};
					updatePlayer(p, pi, 1 / 60);
				}
				world.timestep = 1 / 60;
				world.step();
				accumulator -= 1 / 60;
			}
			networkTick += dt;
			if (networkTick > 0.05) {
				networkTick = 0;
				if (status.connected) net.sendState(snapshot());
			}
		} else net.sendInput(inp);
		jumpQueue = actionQueue = false;
	}
	if (!running) {
		updateWorld(dt * (mode === "paused" ? 0 : 1));
		if (status.connected && !status.ended) {
			if (!status.isHost && mode !== "ended") net.sendInput({});
			else if (!status.active && status.isHost) {
				networkTick += dt;
				if (networkTick > 0.1) {
					networkTick = 0;
					net.sendState(snapshot());
				}
			}
		}
	}
	updateCamera(dt);
	updateHUD();
	if (!status.server && !recoveringRenderer) renderer.render(scene, camera);
}
const camTarget = new THREE.Vector3(10, 1, 0);
function updateCamera(dt) {
	const p = localPlayer();
	let x = p?.x || 8,
		y = p?.y || 4;
	if (mode === "title" || mode === "loading") {
		x = 11;
		y = -1.3;
	}
	if (mode === "victory") {
		x = 7;
		y = 4;
	}
	const k = settings.reducedMotion ? 1 : 1 - Math.exp(-dt * 4);
	camTarget.x = lerp(
		camTarget.x,
		x +
			(mode === "title" ? 3 : settings.reducedMotion ? 0 : p?.facing * 2 || 0),
		k,
	);
	camTarget.y = lerp(camTarget.y, y + 1.5, k);
	const h = cfg.camera,
		aspect = innerWidth / innerHeight;
	camera.left = (-h * aspect) / 2;
	camera.right = (h * aspect) / 2;
	camera.top = h / 2;
	camera.bottom = -h / 2;
	camera.position.set(camTarget.x, camTarget.y + 2.7, 36);
	camera.lookAt(camTarget.x, camTarget.y, 0);
	camera.updateProjectionMatrix();
}
function contextual(p) {
	if (!p) return "";
	const pad = lastInput === "gamepad",
		touching = lastInput === "touch";
	const j = pad
		? settings.glyphs === "xbox"
			? "A"
			: "✕"
		: touching
			? "Tap right"
			: "SPACE";
	const a = pad
		? settings.glyphs === "xbox"
			? "X"
			: "□"
		: touching
			? "Tap Catch"
			: "E";
	if (p.balloon) return j + " · Let go · Move sideways to dismount";
	if (p.swimming)
		return (
			(pad ? "LEFT STICK" : touching ? "Drag" : "↑ / ↓") +
			" · Swim · " +
			j +
			" to surface"
		);
	if (
		ladders.some(
			(l) => Math.abs(p.x - l.x) < 1.2 && p.y < l.top + 2 && p.y > l.bottom - 1,
		)
	)
		return (
			(pad ? "LEFT STICK" : touching ? "Drag up / down" : "↑ / ↓") +
			" · Climb the ladder"
		);
	if (balloons.some((b) => Math.hypot(p.x - b.x, p.y - b.y) < 3))
		return a + " · Catch a balloon";
	if (p.x < 21 && p.y > 1 && rescues.some((r) => !r.collected))
		return "Head right. The first ladder leads down.";
	return "";
}
function updateHUD() {
	const p = localPlayer();
	if (!p) return;
	const count = rescues.filter((r) => r.collected).length;
	const area = getArea(p);
	audio.setZone(
		p.swimming
			? "water"
			: p.balloon
				? "balloon"
				: p.y < -15
					? "deep"
					: "gallery",
	);
	ui.updateHUD({
		score,
		gold: coins.filter((c) => c.collected).length,
		totalGold: coins.length,
		rescued: count,
		hearts: p.health,
		area,
		objective:
			count < 3
				? "Find your three lost companions"
				: "Bring everyone back to camp",
		prompt: contextual(p),
		mode,
		attract: mode === "attract",
		coop: players.length > 1 ? "CO-OP EXPEDITION" : "",
		checkpoint: checkpoints[checkpointIndex]?.name,
		oxygen: 1,
		touchAction: balloons.some((b) => Math.hypot(p.x - b.x, p.y - b.y) < 3)
			? "Catch balloon"
			: "",
	});
}
function snapshot() {
	return {
		players: players.map((p) => ({
			id: p.id,
			x: p.x,
			y: p.y,
			vx: p.vx,
			vy: p.vy,
			health: p.health,
			swimming: p.swimming,
			balloon: p.balloon,
			facing: p.facing,
			checkpoint: p.checkpoint,
		})),
		coins: coins.map((c) => c.collected),
		rescues: rescues.map((r) => r.collected),
		score,
		bridgeOpen,
		elapsed,
		won,
		mode,
		roundVersion,
		checkpointIndex,
		checkpoints: checkpoints.map((c) => c.active),
		time,
	};
}
function applySnapshot(s) {
	lastState = s;
	if (!s || !s.players) return;
	if (s.roundVersion !== roundVersion && s.mode === "playing") {
		resetGame(false);
		roundVersion = s.roundVersion;
		mode = "playing";
		ui.show("playing");
		window.CavernNet?.beginRound?.();
	}
	if (
		s.mode === "title" &&
		mode !== "title" &&
		!window.CavernNet?.status().active
	) {
		mode = "title";
		ui.show("title");
		keys.clear();
	}
	if (s.checkpoints)
		s.checkpoints.forEach((v, i) => (checkpoints[i].active = v));
	checkpointIndex = s.checkpointIndex ?? checkpointIndex;
	for (const d of s.players) {
		let p =
			players.find((p) => p.id === d.id) ||
			createPlayer(d.id, d.id === localId ? 0xe88652 : 0x71bbb1);
		Object.assign(p, d);
		p.g.position.set(p.x, p.y, 0);
		p.g.rotation.y = p.facing * 0.3;
		p.mixer.update(0.06);
		p.walk.setEffectiveWeight(Math.abs(p.vx) / 6);
		p.float.setEffectiveWeight(p.swimming ? 1 : 0);
	}
	s.coins.forEach((v, i) => {
		coins[i].collected = v;
		coins[i].m.visible = !v;
	});
	s.rescues.forEach((v, i) => {
		rescues[i].collected = v;
		rescueVisual(rescues[i]);
	});
	score = s.score;
	elapsed = s.elapsed;
	time = s.time ?? time;
	if (s.bridgeOpen && !bridgeOpen) {
		bridgeOpen = true;
		createBridge(true);
	}
	if (s.won && !won) {
		won = true;
		mode = "victory";
		ui.show("victory", {
			score,
			gold: s.coins.filter(Boolean).length,
			totalGold: coins.length,
			time: Math.floor(elapsed),
			rescued: 3,
		});
	}
}
function configureNet() {
	const net = window.CavernNet;
	if (!net) return;
	const sync = () => {
		const s = net.status();
		{
			localId = s.me;
			const ids = s.players.map((p) => p.id);
			for (const id of ids)
				if (!players.some((p) => p.id === id))
					createPlayer(id, id === localId ? 0xe88652 : 0x71bbb1);
			for (const p of [...players])
				if (!ids.includes(p.id)) {
					scene.remove(p.g);
					world.removeRigidBody(p.body);
					players.splice(players.indexOf(p), 1);
				}
			if (!players.length && !s.server) createPlayer(localId, 0xe88652);
			if (s.transport === "solo") cachedRemoteInput = {};
		}
		ui.setStatus(
			s.players.length > 1
				? "CO-OP EXPEDITION · TWO EXPLORERS"
				: "SOLO EXPEDITION",
		);
	};
	net.onChange(sync);
	net.onEnd(() => {
		mode = "ended";
		audio.setMuted(true);
		keys.clear();
	});
	net.onFinish?.((r) => {
		if (!won) {
			won = !!r.won;
			mode = "victory";
			ui.show("victory", {
				score: r.score || score,
				gold: coins.filter((c) => c.collected).length,
				totalGold: coins.length,
				time: Math.floor(elapsed),
				rescued: rescues.filter((r) => r.collected).length,
			});
		}
	});
	net.onStart(() => {
		sync();
		begin();
	});
	net.onState(applySnapshot);
	net.onInput((inp, id) => {
		if (
			inp.command === "restart" &&
			!net.status().active &&
			(mode === "victory" || mode === "title")
		)
			begin();
		else if (inp.command === "title" && !net.status().active)
			handleAction("title");
		else cachedRemoteInput[id] = inp;
	});
	net.onTimeUp(() => {
		if (!won) {
			mode = "victory";
			ui.show("victory", {
				score,
				gold: coins.filter((c) => c.collected).length,
				totalGold: coins.length,
				time: Math.floor(elapsed),
				rescued: rescues.filter((r) => r.collected).length,
			});
			net.finish({ won: false, score });
		}
	});
	net.onLeave(() => {
		if (!net.status().active) {
			const p = localPlayer(),
				at = p
					? {
							x: p.x,
							y: p.y,
							health: p.health,
							checkpoint: { ...p.checkpoint },
						}
					: null;
			net.solo();
			if (at) {
				teleport(localPlayer(), at.x, at.y);
				localPlayer().health = at.health;
				localPlayer().checkpoint = at.checkpoint;
			}
			ui.toast("A companion heads home.", "Your expedition continues solo.");
		}
	});
	sync();
}
function mapSVG() {
	const paths = platforms
		.map(
			(p) =>
				`<rect x="${(p.x0 + 12) * 5}" y="${(6 - p.top) * 4}" width="${(p.x1 - p.x0) * 5}" height="5" fill="#c9a879"/>`,
		)
		.join("");
	const ls = ladders
		.map(
			(l) =>
				`<path d="M${(l.x + 12) * 5},${(6 - l.top) * 4}V${(6 - l.bottom) * 4}" stroke="#ffd174" stroke-width="4" stroke-dasharray="2 3"/>`,
		)
		.join("");
	const rs = rescues
		.map(
			(r) =>
				`<circle cx="${(r.x + 12) * 5}" cy="${(6 - r.y) * 4}" r="6" fill="${r.collected ? "#79ddbc" : "#ee7444"}"/><text x="${(r.x + 12) * 5}" y="${(6 - r.y) * 4 - 12}" text-anchor="middle" fill="#f4e6bf" font-size="11">${r.name}</text>`,
		)
		.join("");
	const lanterns = checkpoints
		.map(
			(c) =>
				`<rect x="${(c.x + 12) * 5 - 3}" y="${(6 - c.y) * 4 - 3}" width="6" height="6" fill="${c.active ? "#79ddbc" : "#507873"}"/>`,
		)
		.join("");
	const bridge = bridgeOpen
		? '<path d="M165 12H230" stroke="#79ddbc" stroke-width="4"/>'
		: "";
	const p = localPlayer();
	return `<svg viewBox="0 0 570 225" role="img" aria-label="Cavern field map"><rect width="570" height="225" rx="12" fill="#103a40"/><rect x="300" y="132" width="150" height="44" fill="#267f93"/>${paths}${ls}${rs}${lanterns}${bridge}<path d="M490 128 V6" stroke="#eeb65e" stroke-width="3" stroke-dasharray="7 5"/><circle cx="${(p.x + 12) * 5}" cy="${(6 - p.y) * 4}" r="6" fill="#fff3c9" stroke="#ee7444" stroke-width="3"/><text x="80" y="10" fill="#f4e6bf" font-size="11">DAYLIGHT CAMP</text><text x="310" y="205" fill="#79ddbc" font-size="11">RIVER · no breath limit</text></svg>`;
}
async function handleAction(action, value) {
	if (
		window.CavernNet?.status().active &&
		(["start", "restart", "playAgain", "title", "quit"].includes(action) ||
			mode === "ended")
	)
		return;
	userActivity();
	audio.sfx("ui");
	if (action === "start" || action === "restart" || action === "playAgain") {
		if (
			window.CavernNet?.status().connected &&
			!window.CavernNet.status().isHost
		) {
			window.CavernNet.request?.("restart");
			ui.setStatus("The expedition leader is preparing a fresh start.");
		} else begin();
		return;
	}
	if (action === "interact") {
		interactPressed();
		return;
	}
	if (action === "reload") {
		location.reload();
		return;
	}
	if (action === "pause") {
		if (mode === "playing") {
			mode = "paused";
			ui.show("pause");
		}
		return;
	}
	if (action === "resume") {
		mode = "playing";
		ui.show("playing");
		return;
	}
	if (action === "back") {
		if (mode === "playing") {
			mode = "paused";
			ui.show("pause");
		} else if (ui.screen === "pause") {
			mode = "playing";
			ui.show("playing");
		} else {
			ui.show(mode === "title" ? "title" : "pause");
		}
		return;
	}
	if (action === "title" || action === "quit") {
		if (
			window.CavernNet?.status().connected &&
			!window.CavernNet.status().isHost
		)
			window.CavernNet.solo();
		mode = "title";
		ui.show("title");
		titleIdle = 0;
		return;
	}
	if (action === "map") {
		if (mode === "playing") mode = "paused";
		ui.show("map", { svg: mapSVG() });
		return;
	}
	if (
		action === "settings" ||
		action === "about" ||
		action === "dev" ||
		action === "developer" ||
		action === "coop"
	) {
		if (mode === "playing") mode = "paused";
		ui.show(action === "developer" ? "dev" : action, {
			settings,
			config: cfg,
			dev: { ...cfg, god: invincible },
			defaults,
			invincible,
			teleports: [
				{ id: "camp", label: "Daylight camp" },
				{ id: "gallery", label: "Fern gallery" },
				{ id: "river", label: "Underground river" },
				{ id: "balloon", label: "Balloon dock" },
				{ id: "ledge", label: "Sunlit ledge" },
			],
		});
		return;
	}
	if (action in settings) {
		settings[action] = value;
		if (action === "music") audio.setMusicVolume(+value);
		if (action === "sfx") audio.setSfxVolume(+value);
		if (action === "glyphs") ui.setInput(lastInput, value);
		saveSettings();
		return;
	}
	if (action.startsWith("dev:")) {
		const key = action.slice(4);
		if (key in cfg) cfg[key] = +value;
		else if (key === "reset") {
			Object.assign(cfg, defaults);
			invincible = false;
			handleAction("dev");
		} else if (key === "god" || key === "invincible") invincible = !!value;
		else if (key === "heal") {
			localPlayer().health = 3;
		} else if (key === "checkpoint")
			teleport(
				localPlayer(),
				localPlayer().checkpoint.x,
				localPlayer().checkpoint.y,
			);
		else if (key === "teleport") {
			const pts = {
				camp: [8, 4.02],
				gallery: [34, -10.98],
				river: [60, -29],
				balloon: [85, -25.98],
				ledge: [88, -3.98],
			};
			const q = pts[value] || [8, 4.02];
			teleport(localPlayer(), ...q);
		} else if (key === "rescue") {
			rescues.forEach((r) => {
				r.collected = true;
				rescueVisual(r);
			});
			bridgeOpen = true;
			createBridge(true);
		}
		return;
	}
	const net = window.CavernNet;
	if (action.startsWith("coop:"))
		try {
			if (action === "coop:host") {
				const room = value || $("#roomCode")?.value || "UNDERSTORY";
				net.hostLocal(room);
				ui.setStatus(
					"Camp " +
						net.status().room +
						" open. In another tab, select Join camp.",
				);
			}
			if (action === "coop:join") {
				net.joinLocal(value || "UNDERSTORY");
				ui.setStatus("Joining camp…");
			}
			if (action === "coop:solo") {
				net.solo();
			}
			if (action === "coop:offer") {
				const code = await net.makeOffer();
				const el = $("#networkCode");
				if (el) el.value = code;
				ui.setStatus("Send this offer to your companion.");
			}
			if (action === "coop:answer") {
				const code = await net.answerOffer(value || $("#networkCode")?.value);
				$("#networkCode").value = code;
				ui.setStatus("Send this answer back to the host.");
			}
			if (action === "coop:connect") {
				const code = value || $("#networkCode")?.value;
				let offer = false;
				try {
					offer = JSON.parse(atob(code)).type === "offer";
				} catch {}
				if (offer) {
					const answer = await net.answerOffer(code);
					$("#networkCode").value = answer;
					ui.setStatus("Answer created. Copy it and send it back to the host.");
				} else {
					await net.acceptAnswer(code);
					ui.setStatus("Companion connected. Begin the expedition.");
				}
			}
			if (action === "coop:copy") {
				await navigator.clipboard.writeText($("#networkCode")?.value || "");
				ui.setStatus("Connection code copied.");
			}
		} catch (e) {
			ui.setStatus(e.message);
		}
}
addEventListener("keydown", (e) => {
	setInputMode("keyboard");
	userActivity();
	if (e.defaultPrevented) return;
	if (
		["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
			e.code,
		) &&
		!["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
	)
		e.preventDefault();
	keys.add(e.code);
	if (e.repeat) return;
	if (
		(e.code === "Escape" || e.code === "KeyP") &&
		(mode === "playing" || mode === "attract")
	)
		handleAction("back");
	if (e.code === "KeyM" && mode === "playing") handleAction("map");
	if (e.code === "Space" && mode === "playing") jumpPressed();
	if (e.code === "KeyE") interactPressed();
	if (e.code === "KeyF2") handleAction("dev");
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => {
	keys.clear();
	if (mode === "playing" && !window.CavernNet?.status().connected)
		handleAction("pause");
});
addEventListener("pointermove", (e) => {
	if (e.pointerType === "mouse") {
		setInputMode("keyboard");
		userActivity();
	}
});
addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") {
		setInputMode("touch");
		userActivity();
	}
	if (e.pointerType === "mouse") {
		setInputMode("keyboard");
		userActivity();
		if (mode === "playing" && e.target === renderer?.domElement) {
			const p = localPlayer();
			if (balloons.some((b) => Math.hypot(p.x - b.x, p.y - b.y) < 3))
				interactPressed();
		}
	}
});
function installTouch() {
	const surface = renderer.domElement;
	surface.style.touchAction = "none";
	surface.addEventListener("pointerdown", (e) => {
		if (e.pointerType !== "touch") return;
		setInputMode("touch");
		userActivity();
		if (mode !== "playing") return;
		e.preventDefault();
		surface.setPointerCapture(e.pointerId);
		touch.active.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			side: e.clientX < innerWidth * 0.58 ? "move" : "jump",
		});
		if (e.clientX >= innerWidth * 0.58) touch.jump = true;
	});
	surface.addEventListener("pointermove", (e) => {
		const t = touch.active.get(e.pointerId);
		if (!t || t.side !== "move") return;
		const dx = e.clientX - t.x,
			dy = e.clientY - t.y;
		touch.left = dx < -12;
		touch.right = dx > 12;
		touch.up = dy < -15;
		touch.down = dy > 15;
	});
	const end = (e) => {
		const t = touch.active.get(e.pointerId);
		if (!t) return;
		if (t.side === "move")
			touch.left = touch.right = touch.up = touch.down = false;
		else touch.jump = false;
		touch.active.delete(e.pointerId);
	};
	surface.addEventListener("pointerup", end);
	surface.addEventListener("pointercancel", end);
}
async function recoverGraphics(info) {
	if (recoveringRenderer || renderer.backend.isWebGLBackend) return;
	recoveringRenderer = true;
	const old = renderer;
	try {
		const next = new THREE.WebGPURenderer({
			antialias: true,
			alpha: false,
			forceWebGL: true,
		});
		next.setPixelRatio(Math.min(devicePixelRatio, 2));
		next.setSize(innerWidth, innerHeight);
		next.outputColorSpace = THREE.SRGBColorSpace;
		next.toneMapping = THREE.ACESFilmicToneMapping;
		next.toneMappingExposure = 1.2;
		await next.init();
		old.domElement.remove();
		old.dispose();
		renderer = next;
		renderer.domElement.id = "game";
		document.body.prepend(renderer.domElement);
		installTouch();
		recoveringRenderer = false;
	} catch (e) {
		window.__bootError = String(e);
		ui.show("error", {
			message: "The graphics device could not recover. Reload the expedition.",
		});
	}
}
async function init() {
	try {
		ui.setLoading(0.1, "Lighting the lanterns");
		await RAPIER.init({});
		world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
		renderer.onDeviceLost = (info) => {
			renderer._isDeviceLost = true;
			recoverGraphics(info);
		};
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.2;
		document.body.prepend(renderer.domElement);
		renderer.domElement.id = "game";
		await renderer.init();
		ui.setLoading(0.45, "Finding the way down");
		createWorld();
		createPlayer("solo", 0xe88652);
		await window.CavernNet?.init();
		configureNet();
		audio.setMusicVolume(settings.music);
		audio.setSfxVolume(settings.sfx);
		ui.setInput(lastInput, settings.glyphs);
		installTouch();
		const hub = window.CavernNet?.status();
		mode = hub?.active ? "playing" : "title";
		ui.show(mode === "playing" ? "playing" : "title");
		ready = true;
		ui.setLoading(1, "Ready");
		window.CavernNet?.ready();
		lastFrame = performance.now();
		requestAnimationFrame(frame);
	} catch (e) {
		console.error(e);
		window.AIHub?.fail?.(e.message);
		document.body.innerHTML = `<div style="padding:8vw;color:#f4e6bf;background:#103a40;font:24px Georgia"><h1>A lantern needs relighting.</h1><p>${String(e.message).replace(/</g, "&lt;")}</p><p>Open this file in a current browser with WebGPU or WebGL2 graphics enabled.</p><button onclick="location.reload()" style="font-size:24px;padding:16px">Try again</button></div>`;
		window.__bootError = String(e.stack || e);
	}
}
addEventListener("resize", () => {
	renderer?.setSize(innerWidth, innerHeight);
});
window.__game = {
	getState: () => ({
		ready,
		mode,
		score,
		elapsed,
		bridgeOpen,
		players: players.map((p) => ({
			id: p.id,
			x: p.x,
			y: p.y,
			vx: p.vx,
			vy: p.vy,
			health: p.health,
			grounded: p.grounded,
			swimming: p.swimming,
			balloon: p.balloon,
			checkpoint: p.checkpoint,
			grabCooldown: p.grabCooldown,
		})),
		rescued: rescues.map((r) => r.collected),
		gold: coins.filter((c) => c.collected).length,
		checkpoints: checkpoints.map((c) => c.active),
		stats: { ...stats },
		config: { ...cfg },
		settings: { ...settings },
		roundVersion,
		input: { ...getInput(null) },
		lastInput,
		net: window.CavernNet?.status(),
		renderer: renderer?.backend?.isWebGPUBackend
			? "WebGPU"
			: renderer?.backend?.isWebGLBackend
				? "WebGL2"
				: "unknown",
		rapier: RAPIER.version(),
		three: THREE.REVISION,
	}),
	action: handleAction,
	step: (n = 1, inp = {}) => {
		for (let i = 0; i < n; i++) {
			updateWorld(1 / 60);
			for (const p of players) updatePlayer(p, inp, 1 / 60);
			world.timestep = 1 / 60;
			world.step();
		}
	},
	teleport: (x, y) => teleport(localPlayer(), x, y),
	setHealth: (n) => {
		localPlayer().health = n;
		localPlayer().invuln = 0;
	},
	setInput: (k, v) => {
		v ? keys.add(k) : keys.delete(k);
	},
	hurt: () => hurt(localPlayer()),
	audio: () => audio.inspect(),
	audioUnlock: () => audio.unlock(),
	setIdle: (n) => (titleIdle = n),
	snapshot,
	applySnapshot,
	mapSVG,
	getTime: () => time,
	renderAudioProbe,
	renderInfo: () => ({
		calls: renderer.info.calls,
		drawCalls: renderer.info.render.drawCalls,
		triangles: renderer.info.render.triangles,
	}),
};
init();
