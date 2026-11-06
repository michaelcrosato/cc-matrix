import * as THREE from "three/webgpu";
import RAPIER from "https://esm.sh/@dimforge/rapier3d-compat@0.19.3";

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mod = (v, n = 1) => ((v % n) + n) % n;
const ease = (t) => t * t * (3 - 2 * t);
const padScore = (n) => Math.max(0, Math.floor(n)).toString().padStart(6, "0");
const colors = ["#f9c74a", "#67d7c3", "#ef7864", "#b394e3"];
const credits = JSON.parse($("credits-data").textContent);
const audio = new SynthGarage();
const FIXED = 1 / 120;
const DEFAULTS = {
	playerSpeed: 10.6,
	rivalSpeed: 1,
	boost: 1.62,
	gateWindow: 1,
	chargeGain: 1.4,
	timeScale: 1,
};
const tune = { ...DEFAULTS };
const dev = {
	invincible: false,
	autopilot: false,
	colliders: false,
	used: false,
};
const settings = {
	music: 10,
	effects: 65,
	shake: 65,
	assist: navigator.maxTouchPoints > 0,
	glyphs: "PlayStation",
	reduced: false,
};
let best = 0;
try {
	best = Number(localStorage.getItem("doa-best")) || 0;
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("doa-settings") || "{}"),
	);
} catch {}
audio.setVolumes(settings.music / 100, settings.effects / 100);
$("best").textContent = padScore(best);
const stages = [
	{
		name: "THE NIGHT SHIFT",
		subtitle: "Collect the gold. Dodge the red car.",
		enemies: 1,
		speed: 6.9,
		hunt: 0.45,
		lock: false,
		color: "#f9c74a",
	},
	{
		name: "HOT PURSUIT",
		subtitle: "The red car is learning your route.",
		enemies: 1,
		speed: 8.1,
		hunt: 0.85,
		lock: false,
		color: "#ef7864",
	},
	{
		name: "DOUBLE TROUBLE",
		subtitle: "Two rivals. One very small shortcut.",
		enemies: 2,
		speed: 8.5,
		hunt: 0.85,
		lock: false,
		color: "#67d7c3",
	},
	{
		name: "SIGNAL FAILURE",
		subtitle: "Red gaps are closed. Queue the next one.",
		enemies: 2,
		speed: 8.9,
		hunt: 0.9,
		lock: true,
		color: "#b394e3",
	},
	{
		name: "LAST CALL",
		subtitle: "One last sweep before the sun comes up.",
		enemies: 2,
		speed: 9.6,
		hunt: 1,
		lock: true,
		color: "#ffe6ad",
	},
];
let rngState = 73119;
function rng() {
	rngState = (rngState * 1664525 + 1013904223) >>> 0;
	return rngState / 4294967296;
}
let scene,
	renderer,
	camera,
	world,
	queue,
	arena,
	centerSign,
	titleBillboard,
	trackMaterial,
	accentMaterial;
let cars = [],
	coins = [],
	particles = [],
	debris = [],
	ghosts = new Map(),
	gates = [],
	mixers = [],
	debugLines;
let state = "title",
	mode = "solo",
	paused = false,
	modalKind = null,
	modalBack = null;
let stageIndex = 0,
	stateTimer = 0,
	elapsed = 0,
	score = 0,
	lives = 3,
	charge = 100,
	chain = 0,
	multiplier = 1,
	dotsLeft = 80;
let simTime = 0,
	runner = 0,
	duelScores = [0, 0],
	raceStartAt = 0,
	countdownAt = 0,
	hubStarted = false,
	hubEnded = false,
	resultSent = false;
let stats = {
	dots: 0,
	near: 0,
	slips: 0,
	crashes: 0,
	cleared: 0,
	shifts: 0,
	gatesBlocked: 0,
};
let lastInput = navigator.maxTouchPoints > 0 ? "touch" : "keyboard",
	lastActivity = performance.now(),
	lastFrame = performance.now(),
	accumulator = 0;
let shake = 0,
	impact = 0,
	toastUntil = 0,
	netTimer = 0,
	attractTime = 0,
	attractStage = 0,
	viewBlend = 1;
let input = [
	{ lane: 0, boost: false, held: 0 },
	{ lane: 0, boost: false, held: 0 },
];
let keySet = new Set(),
	padPrevious = [],
	padRepeat = [0, 0],
	touchPointers = new Map(),
	mouseBoost = false;
let coinMixer,
	coinAnimationGroup,
	floorBody,
	physicsTicks = 0,
	renderFrames = 0,
	sensorEvents = 0,
	ready = false;
const colliderKinds = new Map();
const hub = window.AIHub;
let hubInfo = null;
let uiFocus = 0,
	focusList = [],
	stickRepeatAt = 0,
	lastCalloutSecond = -1;
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
const pickPoint = new THREE.Vector3();

function loop(lane, u) {
	const w = 9.5 + lane * 2.1,
		h = 4.3 + lane * 2.1,
		r = 2 + lane * 0.55;
	const a = w - r,
		b = h - r,
		arc = (Math.PI * r) / 2;
	const length = 4 * (a + b) + 4 * arc;
	let d = mod(u) * length;
	const pieces = [a, arc, 2 * b, arc, 2 * a, arc, 2 * b, arc, a];
	let piece = 0;
	for (; piece < 8 && d > pieces[piece]; piece++) d -= pieces[piece];
	let x, z, dx, dz, angle;
	switch (piece) {
		case 0:
			x = -d;
			z = -h;
			dx = -1;
			dz = 0;
			break;
		case 1:
			angle = -Math.PI / 2 - d / r;
			x = -a + Math.cos(angle) * r;
			z = -b + Math.sin(angle) * r;
			dx = Math.sin(angle);
			dz = -Math.cos(angle);
			break;
		case 2:
			x = -w;
			z = -b + d;
			dx = 0;
			dz = 1;
			break;
		case 3:
			angle = Math.PI - d / r;
			x = -a + Math.cos(angle) * r;
			z = b + Math.sin(angle) * r;
			dx = Math.sin(angle);
			dz = -Math.cos(angle);
			break;
		case 4:
			x = -a + d;
			z = h;
			dx = 1;
			dz = 0;
			break;
		case 5:
			angle = Math.PI / 2 - d / r;
			x = a + Math.cos(angle) * r;
			z = b + Math.sin(angle) * r;
			dx = Math.sin(angle);
			dz = -Math.cos(angle);
			break;
		case 6:
			x = w;
			z = b - d;
			dx = 0;
			dz = -1;
			break;
		case 7:
			angle = -d / r;
			x = a + Math.cos(angle) * r;
			z = -b + Math.sin(angle) * r;
			dx = Math.sin(angle);
			dz = -Math.cos(angle);
			break;
		default:
			x = a - d;
			z = -h;
			dx = -1;
			dz = 0;
	}
	return { x, z, dx, dz, length };
}

const matCache = new Map();
let gradient;
function toon(color, emissive = false) {
	const key = color + (emissive ? "E" : "");
	if (matCache.has(key)) return matCache.get(key);
	const material = emissive
		? new THREE.MeshBasicMaterial({ color })
		: new THREE.MeshToonNodeMaterial({ color, gradientMap: gradient });
	matCache.set(key, material);
	return material;
}
function mesh(geometry, color, parent, outline = false, emissive = false) {
	const object = new THREE.Mesh(geometry, toon(color, emissive));
	object.castShadow = !emissive;
	object.receiveShadow = !emissive;
	parent.add(object);
	if (outline) {
		const edges = new THREE.LineSegments(
			new THREE.EdgesGeometry(geometry, 25),
			new THREE.LineBasicMaterial({ color: "#071c23" }),
		);
		object.add(edges);
	}
	return object;
}
function box(parent, x, y, z, sx, sy, sz, color, outlined = true) {
	const m = mesh(new THREE.BoxGeometry(sx, sy, sz), color, parent, outlined);
	m.position.set(x, y, z);
	return m;
}
function block(hw, hh, r, depth, color, y, parent = arena) {
	const shape = new THREE.Shape();
	for (let i = 0; i <= 128; i++) {
		const angle = (i / 128) * TAU;
		const cx = Math.cos(angle),
			cy = Math.sin(angle);
		const x = Math.sign(cx) * (hw - r) + cx * r;
		const yy = Math.sign(cy) * (hh - r) + cy * r;
		if (i === 0) shape.moveTo(x, yy);
		else shape.lineTo(x, yy);
	}
	shape.closePath();
	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth,
		bevelEnabled: true,
		bevelSegments: 1,
		steps: 1,
		bevelSize: 0.08,
		bevelThickness: 0.08,
	});
	geometry.rotateX(-Math.PI / 2);
	const obj = mesh(geometry, color, parent, true);
	obj.position.y = y;
	return obj;
}
function ribbon(lane, width, color, height, breaks = false) {
	const vertices = [],
		indices = [];
	const count = 320;
	for (let i = 0; i <= count; i++) {
		const p = loop(lane, i / count),
			nx = p.dz,
			nz = -p.dx;
		vertices.push(
			p.x + (nx * width) / 2,
			height,
			p.z + (nz * width) / 2,
			p.x - (nx * width) / 2,
			height,
			p.z - (nz * width) / 2,
		);
		if (
			i < count &&
			(!breaks ||
				Math.abs(mod(i / count + 0.125, 0.25) - 0.125) >
					0.018 * tune.gateWindow)
		) {
			const k = i * 2;
			indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
		}
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(vertices, 3),
	);
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	const material = new THREE.MeshBasicMaterial({
		color,
		side: THREE.DoubleSide,
	});
	const obj = new THREE.Mesh(geometry, material);
	arena.add(obj);
	return obj;
}
function canvasTexture(
	text,
	sub = "",
	color = "#f9c74a",
	width = 1024,
	height = 320,
) {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const c = canvas.getContext("2d");
	c.fillStyle = "#10272d";
	c.fillRect(0, 0, width, height);
	c.strokeStyle = color;
	c.lineWidth = 12;
	c.strokeRect(12, 12, width - 24, height - 24);
	c.fillStyle = color;
	c.font =
		"italic 900 " +
		Math.floor(height * 0.42) +
		'px "Barlow Condensed",sans-serif';
	c.textAlign = "center";
	c.textBaseline = "middle";
	c.fillText(text, width / 2, height * (sub ? 0.43 : 0.5), width * 0.9);
	if (sub) {
		c.fillStyle = "#fff2ce";
		c.font = "700 " + Math.floor(height * 0.11) + 'px "Barlow",sans-serif';
		c.fillText(sub, width / 2, height * 0.78, width * 0.85);
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	return texture;
}
function sign(parent, text, sub, x, y, z, width, height, color = "#f9c74a") {
	const group = new THREE.Group();
	parent.add(group);
	group.position.set(x, y, z);
	box(group, 0, 0, -0.09, width + 0.15, height + 0.15, 0.25, "#071c23");
	const panel = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
		new THREE.MeshBasicMaterial({ map: canvasTexture(text, sub, color) }),
	);
	panel.position.z = 0.06;
	group.add(panel);
	return group;
}
function tree(x, z, scale = 1) {
	const group = new THREE.Group();
	arena.add(group);
	group.position.set(x, 0, z);
	group.scale.setScalar(scale);
	box(group, 0, 1.1, 0, 0.22, 2, 0.22, "#c1976d");
	const crown = mesh(
		new THREE.IcosahedronGeometry(1.1, 0),
		"#2d796b",
		group,
		true,
	);
	crown.position.y = 2.4;
	const crown2 = mesh(
		new THREE.IcosahedronGeometry(0.8, 0),
		"#67a77c",
		group,
		true,
	);
	crown2.position.set(0.4, 2.9, 0.1);
}
function cone(x, z, scale = 1) {
	const group = new THREE.Group();
	arena.add(group);
	group.position.set(x, 0.5, z);
	group.scale.setScalar(scale);
	box(group, 0, 0.04, 0, 0.6, 0.08, 0.6, "#071c23");
	const m = mesh(new THREE.ConeGeometry(0.23, 0.7, 4), "#fa7147", group, true);
	m.position.y = 0.4;
	const stripe = mesh(
		new THREE.CylinderGeometry(0.09, 0.15, 0.17, 4),
		"#fff2ce",
		group,
	);
	stripe.position.y = 0.45;
}
function lamp(x, z, flip = false) {
	const group = new THREE.Group();
	arena.add(group);
	group.position.set(x, 0, z);
	box(group, 0, 2.5, 0, 0.13, 5, 0.13, "#668f88");
	const arm = box(
		group,
		flip ? -0.6 : 0.6,
		4.95,
		0,
		1.4,
		0.13,
		0.13,
		"#668f88",
	);
	const light = box(
		group,
		flip ? -1.25 : 1.25,
		4.8,
		0,
		0.65,
		0.18,
		0.45,
		"#fff2ce",
	);
	light.material = toon("#fff2ce", true);
	const coneLight = new THREE.Mesh(
		new THREE.ConeGeometry(1.8, 4.1, 16, 1, true),
		new THREE.MeshBasicMaterial({
			color: "#f9d997",
			transparent: true,
			opacity: 0.035,
			side: THREE.DoubleSide,
			depthWrite: false,
		}),
	);
	coneLight.position.set(flip ? -1.25 : 1.25, 2.7, 0);
	group.add(coneLight);
}
function buildScene() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color("#11282d");
	scene.fog = new THREE.Fog("#11282d", 70, 120);
	gradient = new THREE.DataTexture(
		new Uint8Array([85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255]),
		3,
		1,
		THREE.RGBAFormat,
	);
	gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
	gradient.needsUpdate = true;
	camera = new THREE.OrthographicCamera(-30, 30, 17, -17, 0.1, 180);
	const hemi = new THREE.HemisphereLight("#f6ebc8", "#3e7f80", 2.1);
	scene.add(hemi);
	const key = new THREE.DirectionalLight("#fff0c7", 3.1);
	key.position.set(-12, 28, 8);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	key.shadow.camera.left = -28;
	key.shadow.camera.right = 28;
	key.shadow.camera.top = 24;
	key.shadow.camera.bottom = -24;
	key.shadow.camera.far = 85;
	key.shadow.bias = -0.001;
	key.shadow.normalBias = 0.07;
	scene.add(key);
	const rim = new THREE.DirectionalLight("#76cfc3", 1.2);
	rim.position.set(15, 10, -15);
	scene.add(rim);
	const ground = mesh(new THREE.PlaneGeometry(200, 200), "#16373b", scene);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1.15;
	ground.receiveShadow = true;
	// Printed floor markings tie the miniature arena to its poster-like surroundings.
	const floorLines = new THREE.Group();
	scene.add(floorLines);
	for (let i = -12; i <= 12; i++) {
		const line = mesh(
			new THREE.BoxGeometry(0.025, 0.015, 100),
			"#204246",
			floorLines,
			false,
			true,
		);
		line.position.set(i * 4, -1.12, 0);
		const cross = mesh(
			new THREE.BoxGeometry(100, 0.015, 0.025),
			"#204246",
			floorLines,
			false,
			true,
		);
		cross.position.set(0, -1.12, i * 4);
	}
	arena = new THREE.Group();
	scene.add(arena);
	block(18.1, 12.8, 5.0, 0.7, "#071c23", -0.9);
	block(17.9, 12.6, 4.8, 0.38, "#c3bf9b", -0.24);
	block(17.45, 12.2, 4.5, 0.12, "#233d42", 0.2);
	trackMaterial = toon("#233d42");
	ribbon(-0.48, 0.15, "#fff2ce", 0.43);
	ribbon(3.48, 0.18, "#fff2ce", 0.43);
	for (let l = 0.5; l < 3; l++) ribbon(l, 0.11, "#d9d8b3", 0.43, true);
	for (let i = 0; i < 112; i++) {
		const p = loop(3.69, i / 112);
		const curb = box(
			arena,
			p.x,
			0.42,
			p.z,
			0.65,
			0.17,
			0.33,
			i % 2 ? "#fff2ce" : "#ef7864",
			false,
		);
		curb.rotation.y = Math.atan2(p.dx, p.dz);
	}
	block(8.4, 3.15, 1.6, 0.28, "#071c23", 0.39);
	block(8.24, 3.0, 1.5, 0.18, "#65836b", 0.7);
	for (let i = 0; i < 26; i++) {
		const x = -7.5 + rng() * 15,
			z = -2.5 + rng() * 5;
		const grass = box(arena, x, 0.96, z, 0.025, 0.03, 0.32, "#91a179", false);
		grass.rotation.y = -0.4;
	}
	// A tiny all-night pit stop sits inside the otherwise unforgiving maze.
	box(arena, 2.2, 1.7, -0.9, 5.0, 1.5, 2.3, "#39655c");
	for (let i = 0; i < 4; i++)
		box(arena, 0.55 + i * 1.12, 1.8, 0.28, 0.8, 0.65, 0.04, "#9fd9c0");
	box(arena, 2.2, 2.57, -0.5, 5.8, 0.3, 3.1, "#071c23");
	for (let i = 0; i < 9; i++)
		box(
			arena,
			-0.38 + i * 0.65,
			2.78,
			-0.5,
			0.64,
			0.13,
			3.1,
			i % 2 ? "#ef7864" : "#f1d7a3",
		);
	sign(
		arena,
		"OPEN LATE",
		"CLOSE CALLS · GOOD TIMES",
		2.2,
		2.0,
		0.34,
		4.3,
		1.1,
		"#fff2ce",
	);
	box(arena, -4.8, 1.0, 0.9, 0.13, 1.2, 0.13, "#071c23");
	box(arena, -1.1, 1.0, 0.9, 0.13, 1.2, 0.13, "#071c23");
	centerSign = sign(
		arena,
		"NIGHT SHIFT",
		"KEEP YOUR BUMPERS TO YOURSELF",
		-3.0,
		2.3,
		1.0,
		5.4,
		2.0,
	);
	centerSign.rotation.x = -0.25;
	const marquee = new THREE.Group();
	centerSign.add(marquee);
	for (let i = 0; i < 12; i++) {
		const bulb = mesh(
			new THREE.SphereGeometry(0.055, 6, 4),
			"#fff2ce",
			marquee,
			false,
			true,
		);
		bulb.position.set(-2.45 + i * 0.445, 0.87, 0.15);
	}
	const marqueeMixer = new THREE.AnimationMixer(marquee);
	marqueeMixer
		.clipAction(
			new THREE.AnimationClip("Marquee hum", 1.4, [
				new THREE.NumberKeyframeTrack(".scale[y]", [0, 0.7, 1.4], [1, 0.97, 1]),
			]),
		)
		.play();
	mixers.push(marqueeMixer);
	for (let g = 0; g < 4; g++) {
		const group = new THREE.Group();
		arena.add(group);
		const p = loop(1.5, g / 4);
		group.position.set(p.x, 0.47, p.z);
		group.rotation.y = Math.atan2(p.dx, p.dz);
		const gateMat = new THREE.MeshBasicMaterial({
			color: "#67d7c3",
			transparent: true,
			opacity: 0.65,
		});
		for (let l = 0; l < 4; l++) {
			for (let a = -1; a <= 1; a += 2) {
				const dash = new THREE.Mesh(
					new THREE.BoxGeometry(0.32, 0.025, 0.09),
					gateMat,
				);
				dash.position.set((l - 1.5) * 2.1, 0, a * 0.27);
				dash.rotation.y = a * 0.6;
				group.add(dash);
			}
		}
		const post = box(group, -4.6, 0.23, 0, 0.35, 0.42, 0.7, "#071c23");
		const light = mesh(
			new THREE.BoxGeometry(0.2, 0.08, 0.5),
			"#67d7c3",
			post,
			false,
			true,
		);
		light.position.y = 0.25;
		gates.push({
			group,
			material: gateMat,
			light,
			locked: false,
			warning: false,
		});
	}
	for (let side of [-1, 1]) {
		for (let z of [-10, -5, 3, 9])
			tree(side * (20 + rng() * 2), z, 0.7 + rng() * 0.4);
		lamp(side * 18.4, -7, side > 0);
		lamp(side * 18.4, 7, side > 0);
		for (let i = 0; i < 4; i++) cone(side * 17.4, -3 + i * 1.15, 0.7);
		for (let row = 0; row < 3; row++) {
			box(
				arena,
				side * (11 + row * 0.12),
				0.4 + row * 0.32,
				-14.3 - row * 0.65,
				7.5,
				0.32,
				0.65,
				"#36585a",
			);
			for (let i = 0; i < 9; i++) {
				const head = mesh(
					new THREE.IcosahedronGeometry(0.18, 0),
					["#ef7864", "#f3ca7a", "#77b79d", "#b394e3"][i % 4],
					arena,
					false,
				);
				head.position.set(
					side * (7.7 + i * 0.8),
					0.9 + row * 0.32,
					-14.3 - row * 0.65,
				);
			}
		}
	}
	titleBillboard = new THREE.Group();
	arena.add(titleBillboard);
	const topSign = sign(
		titleBillboard,
		"DODGE ON ARRIVAL",
		"AFTER HOURS MOTOR CLUB · NO BRAKES, NO WORRIES",
		0,
		2.2,
		-14.2,
		10.5,
		2.5,
		"#fff2ce",
	);
	topSign.rotation.x = -0.15;
	box(titleBillboard, -4.4, 0.9, -14.3, 0.16, 2.6, 0.16, "#637b6b");
	box(titleBillboard, 4.4, 0.9, -14.3, 0.16, 2.6, 0.16, "#637b6b");
	for (let x of [-19, 19]) {
		box(arena, x, 2.3, 12.5, 0.1, 5, 0.1, "#91a179");
		const flag = mesh(
			new THREE.PlaneGeometry(1.6, 0.8),
			x < 0 ? "#f9c74a" : "#ef7864",
			arena,
			false,
			true,
		);
		flag.position.set(x + 0.8, 4.4, 12.5);
		flag.material.side = THREE.DoubleSide;
		const mixer = new THREE.AnimationMixer(flag);
		mixer
			.clipAction(
				new THREE.AnimationClip("Flag flutter", 1.5, [
					new THREE.NumberKeyframeTrack(
						".rotation[y]",
						[0, 0.4, 0.8, 1.5],
						[-0.25, 0.3, -0.1, -0.25],
					),
				]),
			)
			.play();
		mixers.push(mixer);
	}
	const paint = new THREE.Mesh(
		new THREE.PlaneGeometry(7.5, 1.8),
		new THREE.MeshBasicMaterial({
			map: canvasTexture("MIND THE GAP", "", "#52736c"),
			transparent: true,
		}),
	);
	paint.rotation.x = -Math.PI / 2;
	paint.position.set(0, -1.1, 17);
	scene.add(paint);
	cars = [makeCar(colors[0], 0), makeCar("#ef7864", 1), makeCar("#b394e3", 2)];
	coinAnimationGroup = new THREE.AnimationObjectGroup();
	for (let lane = 0; lane < 4; lane++) {
		for (let i = 0; i < 20; i++) {
			const p = loop(lane, i / 20 + 0.025);
			const coin = mesh(
				new THREE.OctahedronGeometry(0.26, 0),
				"#f9c74a",
				arena,
				true,
				true,
			);
			coin.position.set(p.x, 0.78, p.z);
			coin.scale.set(1, 1, 0.58);
			coinAnimationGroup.add(coin);
			coins.push({
				mesh: coin,
				lane,
				u: i / 20 + 0.025,
				collected: false,
				collider: null,
			});
		}
	}
	coinMixer = new THREE.AnimationMixer(coinAnimationGroup);
	coinMixer
		.clipAction(
			new THREE.AnimationClip("Gold tumble", 2.4, [
				new THREE.NumberKeyframeTrack(
					".rotation[y]",
					[0, 1.2, 2.4],
					[0, Math.PI, TAU],
				),
				new THREE.NumberKeyframeTrack(
					".position[y]",
					[0, 1.2, 2.4],
					[0.76, 0.9, 0.76],
				),
			]),
		)
		.play();
	mixers.push(coinMixer);
	debugLines = new THREE.LineSegments(
		new THREE.BufferGeometry(),
		new THREE.LineBasicMaterial({
			color: "#67ffb3",
			vertexColors: true,
			depthTest: false,
		}),
	);
	debugLines.frustumCulled = false;
	debugLines.visible = false;
	scene.add(debugLines);
}
function makeCar(color, id, ghost = false) {
	const root = new THREE.Group();
	arena.add(root);
	const visual = new THREE.Group();
	visual.name = "body";
	root.add(visual);
	const hullMaterial = toon(color);
	const hull = box(visual, 0, 0.32, 0, 1.05, 0.36, 1.65, color);
	hull.material = hullMaterial;
	// An inverted ink hull gives the tiny cars a readable silhouette on a TV.
	const inkHull = new THREE.Mesh(
		hull.geometry,
		new THREE.MeshBasicMaterial({ color: "#071c23", side: THREE.BackSide }),
	);
	inkHull.scale.set(1.11, 1.12, 1.08);
	hull.add(inkHull);
	const hood = box(visual, 0, 0.54, 0.42, 0.88, 0.12, 0.6, color);
	box(visual, 0, 0.62, -0.18, 0.8, 0.35, 0.7, "#e7e8cc");
	box(visual, 0, 0.71, 0.185, 0.68, 0.23, 0.025, "#173c4c");
	box(visual, -0.412, 0.68, -0.16, 0.025, 0.22, 0.51, "#173c4c");
	box(visual, 0.412, 0.68, -0.16, 0.025, 0.22, 0.51, "#173c4c");
	box(visual, 0, 0.85, -0.2, 0.75, 0.09, 0.61, color);
	box(visual, 0, 0.34, 0.88, 1.08, 0.14, 0.12, "#e4d6a8");
	box(visual, 0, 0.34, -0.88, 1.08, 0.14, 0.12, "#e4d6a8");
	for (let x of [-0.34, 0.34]) {
		const light = box(visual, x, 0.48, 0.86, 0.2, 0.12, 0.04, "#fff2ce", false);
		light.material = toon("#fff2ce", true);
		const tail = box(visual, x, 0.48, -0.87, 0.2, 0.1, 0.04, "#fa7147", false);
		tail.material = toon("#fa7147", true);
	}
	const wheels = [];
	for (let x of [-0.57, 0.57])
		for (let z of [-0.55, 0.55]) {
			const pivot = new THREE.Group();
			pivot.name = "wheel" + wheels.length;
			pivot.position.set(x, 0.22, z);
			visual.add(pivot);
			const wheel = mesh(
				new THREE.CylinderGeometry(0.23, 0.23, 0.19, 10),
				"#071c23",
				pivot,
				true,
			);
			wheel.rotation.z = Math.PI / 2;
			const hubcap = mesh(
				new THREE.CylinderGeometry(0.095, 0.095, 0.2, 8),
				"#c1c6ad",
				pivot,
			);
			hubcap.rotation.z = Math.PI / 2;
			wheels.push(pivot);
		}
	box(visual, 0, 0.75, -0.74, 1.16, 0.06, 0.25, color);
	for (let x of [-0.4, 0.4])
		box(visual, x, 0.62, -0.74, 0.07, 0.24, 0.08, "#071c23");
	const aura = new THREE.Mesh(
		new THREE.TorusGeometry(1.05, 0.045, 6, 40),
		new THREE.MeshBasicMaterial({
			color: "#67d7c3",
			transparent: true,
			opacity: 0.85,
		}),
	);
	aura.rotation.x = Math.PI / 2;
	aura.position.y = 0.1;
	root.add(aura);
	aura.visible = false;
	const marker = new THREE.Mesh(
		new THREE.ConeGeometry(0.18, 0.35, 3),
		new THREE.MeshBasicMaterial({ color: ghost ? color : "#fff2ce" }),
	);
	marker.position.y = 1.6;
	marker.rotation.z = Math.PI;
	root.add(marker);
	const mixer = new THREE.AnimationMixer(visual);
	const bounce = mixer.clipAction(
		new THREE.AnimationClip("Suspension", 0.7, [
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.175, 0.35, 0.525, 0.7],
				[0, 0.025, 0, 0.025, 0],
			),
		]),
	);
	bounce.play();
	const wheelClip = new THREE.AnimationClip(
		"Rolling wheels",
		0.45,
		wheels.map(
			(_, i) =>
				new THREE.NumberKeyframeTrack(
					"wheel" + i + ".rotation[x]",
					[0, 0.45],
					[0, TAU],
				),
		),
	);
	const wheelAction = mixer.clipAction(wheelClip);
	wheelAction.play();
	const hop = mixer.clipAction(
		new THREE.AnimationClip("Gate hop", 0.38, [
			new THREE.NumberKeyframeTrack(
				".rotation[z]",
				[0, 0.12, 0.24, 0.38],
				[0, -0.15, 0.1, 0],
			),
		]),
	);
	hop.setLoop(THREE.LoopOnce, 1);
	hop.clampWhenFinished = false;
	const crashAction = mixer.clipAction(
		new THREE.AnimationClip("Bumper spin", 1.2, [
			new THREE.NumberKeyframeTrack(
				".rotation[y]",
				[0, 0.6, 1.2],
				[0, Math.PI, TAU],
			),
			new THREE.NumberKeyframeTrack(".position[y]", [0, 0.5, 1.2], [0, 0.5, 0]),
		]),
	);
	crashAction.setLoop(THREE.LoopOnce, 1);
	mixers.push(mixer);
	if (ghost) {
		root.traverse((o) => {
			if (o.isMesh) {
				o.material = o.material.clone();
				o.material.transparent = true;
				o.material.opacity = 0.4;
				o.material.depthWrite = false;
				o.castShadow = false;
			}
		});
		marker.visible = false;
	}
	return {
		root,
		visual,
		hull,
		hood,
		aura,
		marker,
		mixer,
		bounce,
		wheelAction,
		hop,
		crashAction,
		id,
		color,
		lane: 0,
		renderLane: 0,
		fromLane: 0,
		t: 0.02,
		dir: 1,
		active: true,
		requested: null,
		shift: 1,
		slip: 0,
		immune: 0,
		boost: false,
		inputId: -1,
		nearCooldown: 0,
		collider: null,
		body: null,
	};
}

function createPhysics() {
	world?.free();
	queue?.free();
	world = new RAPIER.World({ x: 0, y: -18, z: 0 });
	world.timestep = FIXED;
	queue = new RAPIER.EventQueue(true);
	colliderKinds.clear();
	floorBody = world.createRigidBody(
		RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.0, 0),
	);
	world.createCollider(
		RAPIER.ColliderDesc.cuboid(40, 0.35, 35).setRestitution(0.45),
		floorBody,
	);
	for (const c of coins) {
		c.collected = false;
		c.mesh.visible = true;
		const p = loop(c.lane, c.u);
		c.collider = world.createCollider(
			RAPIER.ColliderDesc.ball(0.4)
				.setTranslation(p.x, 0.8, p.z)
				.setSensor(true)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		);
		colliderKinds.set(c.collider.handle, { type: "coin", coin: c });
	}
	for (const c of cars) {
		c.body = null;
		c.collider = null;
		c.root.visible = c.active;
		if (!c.active) continue;
		const p = loop(c.lane, c.t);
		c.body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				p.x,
				0.8,
				p.z,
			),
		);
		c.collider = world.createCollider(
			RAPIER.ColliderDesc.ball(0.52)
				.setSensor(true)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
			c.body,
		);
		colliderKinds.set(c.collider.handle, { type: "car", car: c });
	}
	dotsLeft = 80;
	for (const d of debris) arena.remove(d.mesh);
	debris = [];
}
function setupStage(index, respawn = false) {
	stageIndex = clamp(index, 0, 4);
	const s = stages[stageIndex];
	for (const c of cars) {
		c.active = c.id === 0 || c.id <= (mode === "duel" ? 1 : s.enemies);
		c.inputId = c.id === 0 ? 0 : mode === "duel" && c.id === 1 ? 1 : -1;
		c.dir = c.id === 0 ? 1 : -1;
		c.t = c.id === 0 ? 0.004 : c.id === 1 ? 0.49 : 0.76;
		c.lane = c.id === 2 ? 2 : 0;
		c.renderLane = c.lane;
		c.fromLane = c.lane;
		c.shift = 1;
		c.requested = null;
		c.slip = 0;
		c.immune = 2;
		c.nearCooldown = 0;
		c.boost = false;
		c.visual.rotation.set(0, 0, 0);
		c.crashAction.stop();
		c.hop.stop();
		c.root.visible = c.active;
		c.marker.visible = c.id === 0 || mode === "duel";
	}
	if (mode === "duel") {
		cars[runner].dir = 1;
		cars[1 - runner].dir = -1;
		cars[runner].t = 0.004;
		cars[1 - runner].t = 0.49;
	}
	if (!respawn) createPhysics();
	else syncBodies(true);
	centerSign.children[1].material.map?.dispose();
	centerSign.children[1].material.map = canvasTexture(
		mode === "duel"
			? "BUMPER TAG"
			: [
					"NIGHT SHIFT",
					"HOT PURSUIT",
					"DOUBLE TROUBLE",
					"SIGNAL FAILURE",
					"LAST CALL",
				][stageIndex],
		mode === "duel"
			? "CATCH THE GOLD CAR · SWAP ROLES"
			: "KEEP YOUR BUMPERS TO YOURSELF",
		s.color,
	);
	setCarColor(
		cars[0],
		mode === "hub"
			? colors[hubInfo?.me % 4]
			: mode === "race"
				? colors[Math.max(0, net.seat)]
				: colors[0],
	);
	if (mode === "duel") setCarColor(cars[1], colors[2]);
	updateGates();
	syncBodies(true);
	updateHUD();
}
function setCarColor(c, color) {
	c.hull.material = toon(color);
	c.hood.material = toon(color);
	c.color = color;
}
function syncBodies(teleport = false) {
	for (const c of cars)
		if (c.active && c.body) {
			const p = loop(c.renderLane, c.t);
			const pos = { x: p.x, y: 0.8, z: p.z };
			if (teleport) c.body.setTranslation(pos, true);
			else c.body.setNextKinematicTranslation(pos);
			c.root.position.set(p.x, 0.47, p.z);
			c.root.rotation.y = Math.atan2(p.dx * c.dir, p.dz * c.dir);
		}
}
function startGame(nextMode = "solo", at = 0) {
	if (hub.active && nextMode !== "hub") return;
	closeModal();
	mode = nextMode;
	document.body.classList.toggle("attract-mode", nextMode === "attract");
	state = "countdown";
	stateTimer = 3;
	elapsed = 0;
	score = 0;
	lives = 3;
	charge = 100;
	chain = 0;
	multiplier = 1;
	runner = 0;
	duelScores = [0, 0];
	simTime = 0;
	rngState = 73119;
	resultSent = false;
	lastCalloutSecond = -1;
	raceStartAt = at;
	countdownAt = at;
	stats = {
		dots: 0,
		near: 0,
		slips: 0,
		crashes: 0,
		cleared: 0,
		shifts: 0,
		gatesBlocked: 0,
	};
	if (nextMode !== "attract") {
		dev.autopilot = false;
		dev.invincible = false;
		dev.used = Object.keys(DEFAULTS).some((k) => tune[k] !== DEFAULTS[k]);
	}
	input = [
		{ lane: 0, boost: false, held: 0 },
		{ lane: 0, boost: false, held: 0 },
	];
	keySet.clear();
	$("title-screen").classList.add("hidden");
	$("masthead").classList.add("hidden");
	$("hud").classList.remove("hidden");
	$("corner").style.display = nextMode === "attract" ? "none" : "block";
	$("attract-banner").classList.toggle("hidden", nextMode !== "attract");
	if (nextMode === "attract") {
		dev.autopilot = true;
		attractTime = 0;
		attractStage = 0;
		stateTimer = 1;
	}
	setupStage(0);
	updatePrompts();
	showCallout(
		"AFTER HOURS MOTOR CLUB",
		nextMode === "duel" ? "BUMPER TAG" : "NIGHT SHIFT",
		nextMode === "duel"
			? "GOLD COLLECTS · CORAL CHASES · CRASH TO SWAP"
			: "COLLECT THE GOLD · MIND THE GAPS",
	);
}
function returnTitle() {
	if (hub.active) return;
	document.body.classList.remove("attract-mode");
	net.close();
	closeModal();
	mode = "solo";
	state = "title";
	paused = false;
	dev.autopilot = false;
	dev.invincible = false;
	$("title-screen").classList.remove("hidden");
	$("masthead").classList.remove("hidden");
	$("hud").classList.add("hidden");
	$("corner").style.display = "none";
	$("attract-banner").classList.add("hidden");
	$("callout").classList.add("hidden");
	$("touch-slip").classList.add("hidden");
	lastActivity = performance.now();
	setupStage(0);
	setFocus(0);
}
function showCallout(kicker, title, detail) {
	$("callout-kicker").textContent = kicker;
	$("callout-title").textContent = title;
	$("callout-detail").textContent = detail;
	$("callout").classList.remove("hidden");
}
function toast(text, seconds = 2) {
	$("toast").textContent = text;
	$("toast").classList.add("visible");
	toastUntil = performance.now() + seconds * 1000;
}
function activateSlip(c = cars[mode === "duel" ? runner : 0]) {
	if (
		!c ||
		!["playing", "attract"].includes(state) ||
		paused ||
		charge < 99.9 ||
		c.inputId < 0 ||
		(mode === "duel" && c.id !== runner)
	)
		return false;
	c.slip = 1.25;
	charge = 0;
	stats.slips++;
	audio.slip();
	burst(c.root.position, "#67d7c3", 18, 3.3);
	toast("INK SLIP!  ·  ONE SECOND OF BAD DECISIONS");
	return true;
}
function queueLane(id, direction, target = null) {
	const c = cars.find((c) => c.inputId === id);
	if (!c || !c.active) return;
	c.requested =
		target === null
			? clamp((c.requested ?? c.lane) + direction, 0, 3)
			: clamp(target, 0, 3);
}
function updateGates() {
	const s = stages[stageIndex];
	const lock = mode !== "duel" && s.lock && state !== "title";
	const cycle = Math.floor(elapsed / 9);
	const closing = mod(cycle, 4);
	for (let g = 0; g < 4; g++) {
		gates[g].locked = lock && g === closing && elapsed % 9 >= 2;
		gates[g].warning = lock && g === closing && elapsed % 9 < 2;
		const color = gates[g].locked
			? "#ef7864"
			: gates[g].warning
				? "#f9c74a"
				: "#67d7c3";
		gates[g].material.color.set(color);
		gates[g].material.opacity = gates[g].warning
			? 0.4 + Math.sin(simTime * 14) * 0.3
			: gates[g].locked
				? 0.95
				: 0.65;
		gates[g].light.material = toon(color, true);
	}
}
function autoTarget(c) {
	const counts = [0, 0, 0, 0];
	for (const coin of coins) if (!coin.collected) counts[coin.lane]++;
	if (counts[c.lane] > 0) return c.lane;
	const max = Math.max(...counts);
	return counts.findIndex((n) => n === max);
}
function atGate(c, gate) {
	if (gates[gate].locked) {
		if (
			(c.requested !== null && c.requested !== c.lane) ||
			(c.inputId >= 0 && input[c.inputId]?.lane)
		) {
			if (c.inputId >= 0) {
				stats.gatesBlocked++;
				toast("RED GAP · YOUR CHANGE IS QUEUED", 1.3);
			}
		}
		return;
	}
	let target = c.lane;
	const automated = c.inputId === 0 && (dev.autopilot || mode === "attract");
	if (automated) target = autoTarget(c);
	else if (c.inputId >= 0) {
		const i = input[c.inputId];
		target =
			c.requested ?? c.lane + i.lane * (i.held > 0.3 && !c.boost ? 2 : 1);
		if (i.lane && i.held > 0.3 && !c.boost) target = c.lane + i.lane * 2;
	} else {
		const player = cars[mode === "duel" ? runner : 0];
		const s = stages[stageIndex];
		if (rng() < s.hunt)
			target =
				c.id === 2
					? clamp(player.lane + (Math.floor(elapsed / 8) % 2 ? 1 : -1), 0, 3)
					: player.lane;
		else target = clamp(c.lane + (rng() > 0.5 ? 1 : -1), 0, 3);
	}
	target = clamp(target, 0, 3);
	const limit = c.inputId < 0 || c.boost ? 1 : 2;
	const next = c.lane + clamp(target - c.lane, -limit, limit);
	if (next !== c.lane) {
		c.fromLane = c.renderLane;
		c.lane = next;
		c.shift = 0;
		c.hop.reset().play();
		if (c.inputId >= 0) {
			stats.shifts++;
			audio.gate();
		}
	}
	if (c.requested === c.lane) c.requested = null;
}
function collect(coin, car) {
	if (
		coin.collected ||
		state !== "playing" ||
		car.id !== (mode === "duel" ? runner : 0)
	)
		return;
	coin.collected = true;
	coin.mesh.visible = false;
	coin.collider.setEnabled(false);
	dotsLeft--;
	stats.dots++;
	chain++;
	multiplier = Math.min(4, 1 + Math.floor(chain / 16));
	const amount = 10 * multiplier;
	if (mode === "duel") {
		duelScores[runner] += amount;
		score = duelScores[0];
	} else score += amount;
	charge = Math.min(100, charge + tune.chargeGain);
	audio.dot(chain);
	burst(coin.mesh.position, "#f9c74a", 3, 1.3);
	if (chain === 16) toast("GOLD CHAIN ×2 · KEEP IT CLEAN");
	if (dotsLeft === 0) clearStage();
}
function clearStage() {
	if (state !== "playing") return;
	stats.cleared++;
	if (mode === "duel") {
		duelScores[runner] += 500;
		score = duelScores[0];
		state = "clearing";
		stateTimer = 2;
		showCallout(
			"GOLD BANKED",
			"CLEAN SWEEP!",
			"+500 · THE NIGHT IS STILL YOUNG",
		);
	} else {
		score +=
			500 + Math.max(0, 180 - Math.floor(elapsed / (stageIndex + 1))) * 2;
		lives = Math.min(3, lives + 1);
		charge = Math.min(100, charge + 40);
		state = "clearing";
		stateTimer = 2.7;
		showCallout(
			"CIRCUIT " + (stageIndex + 1) + " COMPLETE",
			"CLEAN SWEEP!",
			"+500 GOLD BONUS · BUMPER REPAIRED",
		);
	}
	audio.cheer();
	for (let i = 0; i < 3; i++)
		burst(
			new THREE.Vector3((rng() - 0.5) * 12, 2, (rng() - 0.5) * 8),
			colors[i],
			20,
			5,
		);
}
function crash(a, b) {
	if (state !== "playing") return;
	const player = cars[mode === "duel" ? runner : 0];
	if (
		player.immune > 0 ||
		player.slip > 0 ||
		dev.invincible ||
		mode === "attract" ||
		dev.autopilot
	)
		return;
	if (a !== player && b !== player) return;
	stats.crashes++;
	chain = 0;
	multiplier = 1;
	shake = 0.65;
	impact = 0.55;
	audio.crash();
	audio.voice(1);
	player.crashAction.reset().play();
	burst(player.root.position, "#fa7147", 24, 5);
	spawnDebris(player.root.position);
	rumble(0.6, 260);
	state = "crashed";
	stateTimer = 1.5;
	if (mode === "duel") {
		runner = 1 - runner;
		charge = 100;
		showCallout(
			"HEAD-ON!",
			"SWITCHEROO!",
			(runner === 0 ? "GOLD" : "CORAL") + " NOW COLLECTS · OTHER DRIVER CHASES",
		);
	} else {
		lives--;
		charge = Math.max(charge, 40);
		showCallout(
			"BUMPER " + (3 - lives) + " RETIRED",
			lives ? "LITTLE DENT." : "BIG DENT.",
			lives
				? "GOLD STAYS BANKED · " + lives + " BUMPERS LEFT"
				: "THE PIT CREW WOULD LIKE A WORD",
		);
	}
}
function finish(won = false) {
	if (["gameover", "victory", "ended"].includes(state)) return;
	state = won ? "victory" : "gameover";
	$("callout").classList.add("hidden");
	if (mode === "attract") {
		attractStage = 0;
		startGame("attract");
		return;
	}
	if (mode === "hub") {
		reportResult();
		showCallout(
			won ? "ALL FIVE CIRCUITS CLEARED" : "RUN BANKED",
			padScore(score),
			"WAITING FOR THE OTHER DRIVERS",
		);
		return;
	}
	if (mode === "race") net.push(ghostData(true));
	if (mode === "solo" && !dev.used && score > best) {
		best = score;
		$("best").textContent = padScore(best);
		try {
			localStorage.setItem("doa-best", best);
		} catch {}
	}
	audio.cheer();
	resultMenu(won);
}
function reportResult() {
	if (resultSent || hubEnded) return;
	resultSent = true;
	hub.result({
		score,
		stats: {
			Gold: stats.dots,
			"Close calls": stats.near,
			Circuits: stats.cleared,
		},
		awards:
			stats.crashes === 0 && stats.dots > 0
				? [{ title: "Untouchable", detail: "No bumpers harmed." }]
				: [],
	});
}
function ghostData(done = false) {
	const c = cars[0];
	return {
		type: "ghost",
		u: mod(c.t),
		lane: c.renderLane,
		stage: stageIndex,
		score: Math.floor(score),
		slip: c.slip > 0,
		done,
	};
}
function receiveGhost(
	data,
	id,
	name = "Driver " + (Number(id) + 1),
	color = colors[Number(id) % 4],
) {
	if (
		hubEnded ||
		!data ||
		data.type !== "ghost" ||
		!Number.isFinite(data.u) ||
		!Number.isFinite(data.lane)
	)
		return;
	let g = ghosts.get(id);
	if (!g) {
		const car = makeCar(color, 10 + Number(id), true);
		g = { car, name, data, last: performance.now() };
		ghosts.set(id, g);
	}
	g.data = { ...data, lane: clamp(data.lane, 0, 3), u: mod(data.u) };
	g.last = performance.now();
	updateNetworkBoard();
}
function updateNetworkBoard() {
	$("network-board").replaceChildren();
	if (mode === "duel") {
		for (let id = 0; id < 2; id++) {
			const row = document.createElement("div");
			row.className = "ghost-row";
			row.style.borderColor = id === 0 ? colors[0] : colors[2];
			row.textContent =
				(id === 0 ? "GOLD" : "CORAL") +
				(runner === id ? " · COLLECTOR " : " · CHASER ");
			const b = document.createElement("b");
			b.textContent = padScore(duelScores[id]);
			row.append(b);
			$("network-board").append(row);
		}
	} else
		for (const g of ghosts.values()) {
			const row = document.createElement("div");
			row.className = "ghost-row";
			row.style.borderColor = g.car.color;
			row.textContent = g.name + (g.data.done ? " · BANKED " : " ");
			const b = document.createElement("b");
			b.textContent = padScore(g.data.score || 0);
			row.append(b);
			$("network-board").append(row);
		}
}
const net = new LinkRace({
	change: () => {
		if (modalKind === "room") roomMenu();
	},
	start: (data) => {
		startGame("race", data.at);
		toast("LINKED RACE · THREE MINUTES · HIGHEST SCORE WINS", 4);
	},
	ghost: (data, seat) => receiveGhost(data, seat),
	leave: (id) => {
		for (const [key, g] of ghosts)
			if (!net.members.some((m) => m.seat === key)) {
				g.car.root.visible = false;
				ghosts.delete(key);
			}
		updateNetworkBoard();
	},
});
function burst(position, color, count = 8, speed = 2) {
	if (settings.reduced && count > 3) count = 3;
	for (let i = 0; i < count; i++) {
		if (particles.length >= 100) {
			const old = particles.shift();
			arena.remove(old.mesh);
			old.mesh.geometry.dispose();
		}
		const m = mesh(
			new THREE.BoxGeometry(0.07, 0.07, 0.2),
			color,
			arena,
			false,
			true,
		);
		m.position.copy(position);
		m.position.y = Math.max(0.7, m.position.y);
		const angle = rng() * TAU;
		particles.push({
			mesh: m,
			vx: Math.cos(angle) * speed * (0.5 + rng()),
			vy: 1.5 + rng() * speed,
			vz: Math.sin(angle) * speed * (0.5 + rng()),
			life: 0.4 + rng() * 0.5,
			max: 0.9,
		});
	}
}
function spawnDebris(position) {
	for (let i = 0; i < 12; i++) {
		const size = 0.12 + rng() * 0.12;
		const m = mesh(
			new THREE.BoxGeometry(size * 2, size * 2, size * 2),
			i % 3 ? "#fa7147" : "#f9c74a",
			arena,
			true,
		);
		const body = world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(position.x, 1.1 + rng(), position.z)
				.setLinvel((rng() - 0.5) * 8, 3 + rng() * 5, (rng() - 0.5) * 8)
				.setAngvel({ x: rng() * 5, y: rng() * 8, z: rng() * 6 })
				.setLinearDamping(0.5),
		);
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(size, size, size)
				.setRestitution(0.55)
				.setFriction(0.7),
			body,
		);
		debris.push({ mesh: m, body, life: 3 });
	}
}
function tickEffects(dt) {
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= dt;
		if (p.life <= 0) {
			arena.remove(p.mesh);
			p.mesh.geometry.dispose();
			particles.splice(i, 1);
			continue;
		}
		p.vy -= dt * 7;
		p.mesh.position.x += p.vx * dt;
		p.mesh.position.z += p.vz * dt;
		p.mesh.position.y = Math.max(0.48, p.mesh.position.y + p.vy * dt);
		p.mesh.rotation.x += dt * 6;
		p.mesh.rotation.z += dt * 3;
		p.mesh.scale.setScalar(Math.min(1, p.life * 3));
	}
	for (let i = debris.length - 1; i >= 0; i--) {
		const d = debris[i];
		d.life -= dt;
		if (d.life <= 0) {
			world.removeRigidBody(d.body);
			arena.remove(d.mesh);
			d.mesh.geometry.dispose();
			debris.splice(i, 1);
			continue;
		}
		const p = d.body.translation(),
			q = d.body.rotation();
		d.mesh.position.set(p.x, p.y, p.z);
		d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
	}
}
function fixedTick(dt) {
	if (paused || hubEnded) return;
	simTime += dt;
	if (state === "title" || state === "waiting") {
		for (const c of cars)
			if (c.active) {
				c.t += (c.dir * 7.5 * dt) / loop(c.lane, c.t).length;
			}
		syncBodies(true);
		return;
	}
	if (state === "countdown") {
		if (mode === "hub") {
			if (!hubStarted) return;
			stateTimer = Math.max(0, -hub.time() / 1000);
		} else if (mode === "race")
			stateTimer = Math.max(0, (countdownAt - Date.now()) / 1000);
		else stateTimer -= dt;
		const n = Math.ceil(stateTimer);
		if (n !== lastCalloutSecond && n > 0 && n <= 3) {
			lastCalloutSecond = n;
			showCallout(
				"CIRCUIT " + (stageIndex + 1) + " / 05",
				String(n),
				mode === "duel"
					? "COLLECT · CHASE · SWAP"
					: stages[stageIndex].subtitle.toUpperCase(),
			);
			audio.tone(300 + (3 - n) * 70, 0.12, "square", 0.13);
		}
		if (stateTimer <= 0) {
			state = "playing";
			$("callout").classList.add("hidden");
			audio.voice();
			toast(
				mode === "duel"
					? "GOLD COLLECTS · CORAL CHASES"
					: "CHANGE LANES AT THE TURQUOISE GAPS",
				3.5,
			);
		}
		return;
	}
	if (state === "clearing" || state === "crashed") {
		stateTimer -= dt;
		world.step(queue);
		tickEffects(dt);
		if (stateTimer <= 0) {
			if (state === "clearing") {
				if (mode !== "duel" && stageIndex === 4) {
					finish(true);
					return;
				}
				setupStage(mode === "duel" ? 0 : stageIndex + 1);
				state = "countdown";
				stateTimer = 2;
				lastCalloutSecond = -1;
				if (mode === "race") countdownAt = Date.now() + 2000;
			} else if (lives <= 0 && mode !== "duel") finish(false);
			else {
				setupStage(stageIndex, true);
				state = "playing";
				$("callout").classList.add("hidden");
			}
		}
		return;
	}
	if (state !== "playing") return;
	elapsed += dt;
	if (
		(mode === "duel" && elapsed >= 90) ||
		(["hub", "race"].includes(mode) && elapsed >= 180)
	) {
		finish(false);
		return;
	}
	if (mode === "attract") {
		attractTime += dt;
		if (attractTime > 24) {
			attractTime = 0;
			attractStage = (attractStage + 1) % 5;
			setupStage(attractStage);
			toast(stages[attractStage].subtitle.toUpperCase(), 3);
		}
		charge = 100;
	}
	updateGates();
	for (const c of cars)
		if (c.active) {
			c.slip = Math.max(0, c.slip - dt);
			c.immune = Math.max(0, c.immune - dt);
			c.nearCooldown = Math.max(0, c.nearCooldown - dt);
			const isRunner = c.id === (mode === "duel" ? runner : 0);
			const automated =
				c.inputId === 0 && (dev.autopilot || mode === "attract");
			c.boost =
				c.inputId >= 0 && (input[c.inputId].boost || automated) && isRunner;
			let speed =
				c.inputId >= 0
					? tune.playerSpeed * (c.boost ? tune.boost : 1)
					: stages[stageIndex].speed * tune.rivalSpeed;
			if (settings.assist && lastInput === "touch" && c.inputId === 0)
				speed *= 0.88;
			if (mode === "duel" && !isRunner) speed = tune.playerSpeed * 1.05;
			const before = c.t;
			c.t += (c.dir * speed * dt) / loop(c.renderLane, c.t).length;
			if (Math.floor(before * 4) !== Math.floor(c.t * 4))
				atGate(c, mod(c.dir > 0 ? Math.floor(c.t * 4) : Math.ceil(c.t * 4), 4));
			c.shift = Math.min(1, c.shift + dt / (c.boost ? 0.24 : 0.3));
			c.renderLane = c.fromLane + (c.lane - c.fromLane) * ease(c.shift);
			c.wheelAction.timeScale = c.boost ? 1.8 : 1;
			if (mode === "attract" && simTime % 8 < dt) activateSlip(cars[0]);
		}
	syncBodies();
	world.step(queue);
	physicsTicks++;
	queue.drainCollisionEvents((a, b, started) => {
		if (!started) return;
		sensorEvents++;
		const ka = colliderKinds.get(a),
			kb = colliderKinds.get(b);
		if (!ka || !kb) return;
		if (ka.type === "coin" && kb.type === "car") collect(ka.coin, kb.car);
		else if (kb.type === "coin" && ka.type === "car") collect(kb.coin, ka.car);
		else if (ka.type === "car" && kb.type === "car") crash(ka.car, kb.car);
	});
	const p = cars[mode === "duel" ? runner : 0];
	for (const c of cars)
		if (c.active && c !== p) {
			const dx = c.root.position.x - p.root.position.x,
				dz = c.root.position.z - p.root.position.z;
			const distance = Math.hypot(dx, dz);
			if (
				distance < 2.6 &&
				distance > 1.15 &&
				Math.abs(c.renderLane - p.renderLane) >= 0.75 &&
				c.nearCooldown <= 0 &&
				state === "playing"
			) {
				c.nearCooldown = 2.5;
				stats.near++;
				charge = Math.min(100, charge + 26);
				const n = 50 * multiplier;
				if (mode === "duel") duelScores[runner] += n;
				else score += n;
				audio.near();
				toast("CLOSE CALL!  +" + n + "  ·  +26 INK", 1.25);
				rumble(0.15, 90);
			}
			if (
				settings.assist &&
				lastInput === "touch" &&
				distance < 3.5 &&
				Math.abs(c.renderLane - p.renderLane) < 0.5 &&
				charge >= 100 &&
				p.immune <= 0
			)
				activateSlip(p);
		}
	tickEffects(dt);
}

function updateHUD() {
	$("score").textContent = padScore(mode === "duel" ? duelScores[0] : score);
	$("score-label").textContent =
		mode === "duel"
			? "GOLD SCORE"
			: dev.used
				? "GARAGE RUN · UNRANKED"
				: mode === "attract"
					? "EXHIBITION SCORE"
					: "YOUR SCORE";
	$("combo").textContent =
		chain >= 16
			? "GOLD CHAIN ×" + multiplier
			: stats.near
				? stats.near + " CLOSE CALL" + (stats.near === 1 ? "" : "S")
				: "NICE & EASY";
	$("stage-count").textContent =
		mode === "duel"
			? "COUCH DUEL · 90 SECONDS"
			: "CIRCUIT " + String(stageIndex + 1).padStart(2, "0") + " / 05";
	$("stage-name").textContent =
		mode === "duel" ? "BUMPER TAG" : stages[stageIndex].name;
	$("dots-left").textContent = dotsLeft + " GOLD TO GO";
	$("progress-fill").style.width = ((80 - dotsLeft) / 80) * 100 + "%";
	$("lives-label").textContent =
		mode === "duel" ? "CORAL SCORE" : "BUMPER RESERVE";
	$("lives").textContent =
		mode === "duel"
			? padScore(duelScores[1])
			: "◆ ".repeat(Math.max(0, lives)).trim() || "—";
	const clockElapsed =
		mode === "hub"
			? Math.max(0, hub.time() / 1000)
			: mode === "race"
				? Math.max(0, (Date.now() - raceStartAt) / 1000)
				: elapsed;
	const seconds = Math.max(
		0,
		Math.floor(
			mode === "duel"
				? 90 - elapsed
				: ["hub", "race"].includes(mode)
					? 180 - clockElapsed
					: elapsed,
		),
	);
	$("clock").textContent =
		String(Math.floor(seconds / 60)).padStart(2, "0") +
		":" +
		String(seconds % 60).padStart(2, "0");
	$("slip-text").textContent =
		cars[mode === "duel" ? runner : 0]?.slip > 0
			? "SLIPPING!"
			: charge >= 100
				? "READY"
				: Math.floor(charge) + "%";
	$("slip-fill").style.width = charge + "%";
	$("slip-status").style.opacity = charge >= 100 ? "1" : "0.65";
	$("touch-slip").classList.toggle(
		"hidden",
		lastInput !== "touch" || charge < 100 || state !== "playing" || paused,
	);
	const p = cars[0];
	const lock = gates.findIndex((g) => g.locked);
	$("gate-message").textContent =
		lock >= 0 && state === "playing"
			? ["NORTH", "WEST", "SOUTH", "EAST"][lock] + " GAP CLOSED · KEEP DRIVING"
			: p.requested !== null && p.requested !== p.lane && state === "playing"
				? "QUEUED → LANE " + (p.requested + 1)
				: "";
	if (mode === "duel") updateNetworkBoard();
}
function updatePrompts() {
	document.body.classList.toggle("touch-mode", lastInput === "touch");
	document.body.classList.toggle("pad-mode", lastInput === "pad");
	const controller = lastInput === "pad";
	const xbox = settings.glyphs === "Xbox";
	const glyph = (key, pad) =>
		'<b class="' +
		(controller ? "pad-glyph" : "key") +
		'">' +
		(controller ? pad : key) +
		"</b>";
	$("control-strip").innerHTML =
		"<span>" +
		glyph("A D", "↔") +
		" IN / OUT</span><span>" +
		glyph("SPACE", "RT").replace("RT", xbox ? "RT" : "R2") +
		" GAS</span><span>" +
		glyph("SHIFT", xbox ? "X" : "□") +
		" INK SLIP</span>";
	$("title-prompt").textContent =
		lastInput === "touch"
			? "TAP TO DRIVE"
			: controller
				? (xbox ? "A" : "✕") + " TO DRIVE"
				: "ENTER TO DRIVE";
	$("pad-status").textContent = controller
		? settings.glyphs.toUpperCase() + " READY"
		: "KEYBOARD / MOUSE READY";
}
function activity(type) {
	if (hubEnded) return false;
	if (lastInput !== type) {
		lastInput = type;
		updatePrompts();
	}
	lastActivity = performance.now();
	if (mode === "attract") {
		returnTitle();
		return true;
	}
	audio.unlock().catch(() => {});
	return false;
}

// Every menu shares the same large focus targets for pointer, keyboard and pad.
function refreshFocus() {
	document
		.querySelectorAll(".focused")
		.forEach((e) => e.classList.remove("focused"));
	const scope = modalKind
		? $("modal")
		: state === "title"
			? $("title-screen")
			: null;
	focusList = scope
		? [
				...scope.querySelectorAll("button:not(:disabled),input:not(:disabled)"),
			].filter((e) => e.offsetParent !== null)
		: [];
	uiFocus = clamp(uiFocus, 0, Math.max(0, focusList.length - 1));
	if (lastInput !== "touch") focusList[uiFocus]?.classList.add("focused");
}
function setFocus(index) {
	uiFocus = index;
	refreshFocus();
	if (lastInput === "pad")
		focusList[uiFocus]?.scrollIntoView({ block: "nearest" });
}
function menuMove(direction) {
	refreshFocus();
	setFocus(mod(uiFocus + direction, Math.max(1, focusList.length)));
	audio.click();
}
function menuAdjust(direction) {
	refreshFocus();
	const el = focusList[uiFocus];
	if (!el) return;
	if (el.dataset.codeSlot !== undefined) {
		adjustRoomCode(Number(el.dataset.codeSlot), direction);
		return;
	}
	if (el.type === "range") {
		el.value = clamp(
			Number(el.value) + direction * Number(el.step || 1),
			Number(el.min),
			Number(el.max),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (el.type === "checkbox") {
		el.checked = !el.checked;
		el.dispatchEvent(new Event("change", { bubbles: true }));
	}
}
function openModal(kind, html, wide = false) {
	modalKind = kind;
	$("modal").innerHTML = html;
	$("modal").classList.toggle("wide", wide);
	$("modal-layer").classList.remove("hidden");
	$("touch-slip").classList.add("hidden");
	uiFocus = 0;
	refreshFocus();
}
function closeModal() {
	modalKind = null;
	$("modal-layer").classList.add("hidden");
	paused = false;
	refreshFocus();
}
const backButton = (label = "Back") =>
	'<button class="back-button" data-action="back">← ' + label + "</button>";
function modalHeader(kicker, title) {
	return (
		'<div class="modal-eyebrow">' +
		kicker +
		'</div><h2 class="modal-title">' +
		title +
		"</h2>"
	);
}
function pauseGame() {
	if (
		hubEnded ||
		mode === "attract" ||
		!["playing", "countdown", "crashed", "clearing"].includes(state)
	)
		return;
	if (modalKind) {
		if (modalKind === "pause") closeModal();
		else backMenu();
		return;
	}
	paused = true;
	input.forEach((i) => {
		i.boost = false;
		i.lane = 0;
	});
	keySet.clear();
	mouseBoost = false;
	openModal(
		"pause",
		modalHeader("PIT STOP", "TAKE A BREATHER.") +
			'<div class="menu-list"><button data-action="resume">Back to the circuit <span>↗</span></button><button data-action="settings">Settings <span>Sound & feel</span></button>' +
			(!hub.active && mode !== "race"
				? '<button data-action="dev">Dev garage <span>Tools & live tuning</span></button><button data-action="restart">Restart run <span>Fresh bumpers</span></button><button data-action="title">Return to title <span>Park it</span></button>'
				: "") +
			'<button data-action="about">About <span>Credits & feedback</span></button></div><div class="modal-bottom"><span class="modal-note">' +
			(hub.active || mode === "race"
				? "The shared race clock keeps running during your pit stop."
				: "The circuit is paused. Your bumpers are safe.") +
			"</span></div>",
	);
}
function backMenu() {
	if (modalKind === "room") {
		net.close();
		closeModal();
		return;
	}
	if (modalBack === "result") {
		modalBack = null;
		resultMenu(state === "victory");
		return;
	}
	if (["dev", "settings", "about", "howto"].includes(modalKind) && paused) {
		modalKind = null;
		pauseGame();
		return;
	}
	closeModal();
	lastActivity = performance.now();
}
function settingsMenu() {
	const row = (name, label, max = 100) =>
		'<div class="setting"><label for="setting-' +
		name +
		'">' +
		label +
		'</label><input id="setting-' +
		name +
		'" type="range" min="0" max="' +
		max +
		'" step="5" value="' +
		settings[name] +
		'" data-setting="' +
		name +
		'"><output>' +
		settings[name] +
		"%</output></div>";
	openModal(
		"settings",
		modalHeader("MAKE YOURSELF AT HOME", "SOUND & FEEL") +
			row("music", "Music") +
			row("effects", "Effects & gibberish") +
			row("shake", "Camera shake") +
			'<div class="setting"><label for="setting-assist">Touch safety assist</label><input id="setting-assist" type="checkbox" data-setting="assist" ' +
			(settings.assist ? "checked" : "") +
			'></div><div class="setting"><label>Controller glyphs</label><button data-action="glyphs">' +
			settings.glyphs +
			'</button></div><div class="setting"><label for="setting-reduced">Reduce motion & confetti</label><input id="setting-reduced" type="checkbox" data-setting="reduced" ' +
			(settings.reduced ? "checked" : "") +
			'></div><div class="modal-bottom">' +
			backButton() +
			'<button class="back-button" data-action="fullscreen">Full screen ↗</button></div><p class="modal-note">Music starts at 10%. Touch assist eases speed and uses a charged ink slip when a collision is imminent. Settings save on this device.</p>',
	);
}
function howtoMenu() {
	openModal(
		"howto",
		modalHeader("A QUICK WORD FROM THE PIT CREW", "FOUR LANES. NO BRAKES.") +
			'<div class="howto-grid"><div class="rule"><span class="rule-num">01</span><h3>Chase the gold.</h3><p>Your car drives itself counterclockwise. Clear all 80 gold dots to open the next circuit. Five circuits, three bumpers. A clean sweep repairs one.</p></div><div class="rule"><span class="rule-num">02</span><h3>Mind the gaps.</h3><p>Tap A/D or stick left/right to queue inward/outward. Hold before a turquoise gap to cross up to two lanes. Red gaps stay closed; your change waits.</p></div><div class="rule"><span class="rule-num">03</span><h3>Pick your moment.</h3><p>Hold Space, R2 or ✕ for gas. You can only shift one lane at speed. Rivals drive the other way. Close calls build ink and bonus points.</p></div><div class="rule"><span class="rule-num">04</span><h3>A little ink insurance.</h3><p>Shift or □ spends a full ink meter for 1.25 seconds of safety. Gold refills it. Mouse: point at a lane, hold left click for gas, right click to slip.</p></div></div><p class="modal-copy">Touch: swipe on the left to queue a lane; hold the right for gas. Tap the ✧ when it appears. Couch duel: driver two uses J/L, I for gas and K for slip; two standard controllers work too. Crash to swap collector and chaser. Highest score after 90 seconds wins.</p><div class="modal-bottom">' +
			backButton() +
			'<button class="back-button" data-action="solo">Let’s drive ↗</button></div>',
		true,
	);
}
function devMenu() {
	if (hub.active || mode === "race") return;
	paused = true;
	const sliders = [
		["playerSpeed", "Cruising speed", 5, 18, 0.2],
		["rivalSpeed", "Rival speed", 0.3, 1.8, 0.05],
		["boost", "Gas multiplier", 1, 2.4, 0.05],
		["chargeGain", "Ink per gold", 0.2, 5, 0.1],
		["timeScale", "Simulation speed", 0.25, 3, 0.25],
	];
	openModal(
		"dev",
		modalHeader("DEV MODE · LIVE TUNING", "THE GARAGE") +
			sliders
				.map(
					([name, label, min, max, step]) =>
						'<div class="setting"><label for="dev-' +
						name +
						'">' +
						label +
						'</label><input id="dev-' +
						name +
						'" type="range" data-tune="' +
						name +
						'" min="' +
						min +
						'" max="' +
						max +
						'" step="' +
						step +
						'" value="' +
						tune[name] +
						'"><output>' +
						tune[name].toFixed(2) +
						"</output></div>",
				)
				.join("") +
			[
				["invincible", "Infinite bumpers"],
				["autopilot", "Autopilot"],
				["colliders", "Physics overlay"],
			]
				.map(
					([key, label]) =>
						'<div class="setting"><label for="dev-' +
						key +
						'">' +
						label +
						'</label><input id="dev-' +
						key +
						'" type="checkbox" data-dev="' +
						key +
						'" ' +
						(dev[key] ? "checked" : "") +
						"></div>",
				)
				.join("") +
			'<div class="dev-buttons"><button data-action="dev-refill">Refill bumpers & ink</button><button data-action="dev-next">Next circuit</button><button data-action="dev-step">Step 1 second</button><button data-action="dev-reset">Reset defaults</button></div><div class="dev-state">Rapier ' +
			RAPIER.version() +
			" · " +
			physicsTicks +
			" physics steps · " +
			sensorEvents +
			' sensor contacts<br>Changes apply immediately. Garage runs do not replace your personal best.</div><div class="modal-bottom">' +
			backButton() +
			'<button class="back-button" data-action="resume">Test drive ↗</button></div>',
	);
}
const feedbackQuestions = {
	testingFeedback: [
		"Issues caught",
		"Critical / game breaking",
		"Most helpful test",
		"Least helpful test",
	],
	engineFeedback: [
		"Best part of the engine",
		"Wrong guesses / sticking points",
		"Most important custom system",
		"Hardest engine task",
		"Engine changes",
		"One thing to improve",
	],
	promptFeedback: [
		"Best part of the prompt",
		"Confusing parts",
		"Hardest task",
		"Suggested change",
	],
};
function aboutMenu(tab = "sourceInformation") {
	let content = "";
	if (tab === "sourceInformation") {
		content =
			'<dl class="credits-grid">' +
			Object.entries(credits.sourceInformation)
				.map(
					([key, value]) =>
						"<dt>" +
						key
							.replace(/([A-Z])/g, " $1")
							.replace(/^./, (s) => s.toUpperCase()) +
						"</dt><dd>" +
						escapeHTML(value) +
						"</dd>",
				)
				.join("") +
			'</dl><p class="modal-note">Original game by Carla Meninsky / Atari. An independent homage. Original geometry, typography, procedural sound and game code.<br>Research: <a href="https://atari.com/pages/dodgeem" target="_blank" rel="noreferrer">Atari instructions</a> · <a href="https://www.atariarchive.org/blog/dodge-em-dodger-cars-september-1980/" target="_blank" rel="noreferrer">Atari Archive</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noreferrer">AI Hub protocol</a></p>';
	} else
		content =
			'<div class="feedback">' +
			credits[tab]
				.map(
					(answer, i) =>
						"<p><b>" +
						feedbackQuestions[tab][i] +
						"</b>" +
						escapeHTML(answer) +
						"</p>",
				)
				.join("") +
			"</div>";
	openModal(
		"about",
		modalHeader("DODGE ON ARRIVAL · CREDITS", "UNDER THE BONNET") +
			'<div class="tabbar">' +
			[
				["sourceInformation", "Source information"],
				["testingFeedback", "Testing feedback"],
				["engineFeedback", "Engine feedback"],
				["promptFeedback", "Prompt feedback"],
			]
				.map(
					([key, label]) =>
						'<button class="' +
						(key === tab ? "active" : "") +
						'" data-tab="' +
						key +
						'">' +
						label +
						"</button>",
				)
				.join("") +
			"</div>" +
			content +
			'<div class="modal-bottom">' +
			backButton() +
			'<span class="modal-note">Usage: added on import</span></div>',
		true,
	);
}
function escapeHTML(value) {
	const div = document.createElement("div");
	div.textContent = String(value);
	return div.innerHTML;
}
function duelMenu() {
	openModal(
		"duel",
		modalHeader("TWO DRIVERS · ONE TRACK", "BUMPER TAG") +
			'<p class="modal-copy">Gold collects. Coral chases.<br>A head-on crash swaps your jobs. Score the most gold in 90 seconds.</p><div class="howto-grid"><div class="rule"><h3>GOLD · DRIVER ONE</h3><p>A / D · Space · Shift<br>Controller 1 · Stick / R2 / □</p></div><div class="rule"><h3>CORAL · DRIVER TWO</h3><p>J / L · I · K<br>Controller 2 · Stick / R2 / □</p></div></div><p class="modal-note">Each driver uses their usual lane controls. Only the collector scores and uses ink slip. Chasers have one speed. Two people can share one keyboard.</p><button class="primary" data-action="start-duel"><span>Let’s trade paint</span><b>↗</b></button><div class="modal-bottom">' +
			backButton() +
			"</div>",
	);
}
function onlineMenu() {
	openModal(
		"online",
		modalHeader("SEPARATE CARS · SHARED BRAGGING RIGHTS", "LINK RACE") +
			'<p class="modal-copy">Same circuit. Same rivals. Your friends appear as ink ghosts. Race for the highest score in three minutes. Up to four drivers.</p><div class="menu-list"><button data-action="host">Create a room <span>Get a code ↗</span></button><button data-action="join-menu">Join a room <span>Have a code?</span></button></div><p class="modal-note">Internet play uses a public PeerJS signaling service and direct WebRTC data. Some networks block direct connections. Tabs in the same browser also link locally. AI Hub sessions connect automatically.</p><div class="modal-bottom">' +
			backButton() +
			"</div>",
	);
}
function joinMenu() {
	openModal(
		"join",
		modalHeader("MEET YOU AT THE SHORTCUT", "ENTER ROOM CODE") +
			'<input id="room-input" type="text" class="room-input" aria-label="Five character room code" maxlength="5" placeholder="ABCDE" autocomplete="off" spellcheck="false"><div class="code-pad">' +
			Array.from(
				{ length: 5 },
				(_, i) =>
					'<button data-code-slot="' +
					i +
					'" aria-label="Room code character ' +
					(i + 1) +
					'">A</button>',
			).join("") +
			'</div><p class="modal-note">Use the five characters shown on the host’s screen.<br><span class="pad-only">D-pad up/down selects a slot. Left/right changes its letter. Then select Join race.</span></p><div class="modal-bottom">' +
			backButton() +
			'<button class="back-button" data-action="join">Join race ↗</button></div>',
	);
	if (lastInput === "pad") $("room-input").value = "AAAAA";
	refreshFocus();
	if (lastInput !== "pad") $("room-input").focus();
}
function adjustRoomCode(slot, direction) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const input = $("room-input");
	if (!input) return;
	const value = input.value.toUpperCase().padEnd(5, "A").split("");
	value[slot] =
		alphabet[
			mod(
				Math.max(0, alphabet.indexOf(value[slot])) + direction,
				alphabet.length,
			)
		];
	input.value = value.join("");
	$("modal")
		.querySelectorAll("[data-code-slot]")
		.forEach((button, i) => {
			button.textContent = value[i];
		});
	audio.click();
}
function roomMenu() {
	const oldFocus = uiFocus;
	openModal(
		"room",
		modalHeader(
			net.host ? "YOUR ROOM CODE · SHARE IT WITH FRIENDS" : "LINKING UP",
			"THE STARTING GRID",
		) +
			'<div class="room-code">' +
			net.code +
			'</div><div class="room-players">' +
			net.members
				.map(
					(m) =>
						'<span class="room-seat" style="border-color:' +
						colors[m.seat] +
						'">DRIVER ' +
						(m.seat + 1) +
						(m.id === net.id ? " · YOU" : "") +
						"</span>",
				)
				.join("") +
			'</div><p class="modal-copy">' +
			(net.host
				? "Waiting for the rest of the motor club."
				: net.seat < 0
					? "Looking for the host…"
					: "You’re on the grid. The host starts the race.") +
			'</p><p class="modal-note">' +
			net.transport +
			"</p>" +
			(net.host
				? '<button class="primary" data-action="start-room" ' +
					(net.members.length < 2 ? "disabled" : "") +
					"><span>Start linked race</span><b>↗</b></button>"
				: "") +
			'<div class="modal-bottom">' +
			backButton("Leave room") +
			(net.host
				? '<button class="back-button" data-action="copy-code">Copy code</button>'
				: "") +
			"</div>",
	);
	uiFocus = oldFocus;
	refreshFocus();
}
function resultMenu(won) {
	const duel = mode === "duel";
	const title = duel
		? duelScores[0] === duelScores[1]
			? "A PERFECT TIE."
			: (duelScores[0] > duelScores[1] ? "GOLD" : "CORAL") + " TAKES IT!"
		: won
			? "HOME BEFORE SUNRISE."
			: "ONE MORE SHORTCUT?";
	openModal(
		"result",
		modalHeader(
			duel
				? "BUMPER TAG · TIME’S UP"
				: won
					? "ALL FIVE CIRCUITS CLEARED"
					: "YOUR GOLD IS BANKED",
			title,
		) +
			'<div class="result-score">' +
			padScore(duel ? Math.max(...duelScores) : score) +
			'</div><div class="stat-grid"><div><strong>' +
			stats.dots +
			"</strong><small>GOLD COLLECTED</small></div><div><strong>" +
			stats.near +
			"</strong><small>CLOSE CALLS</small></div><div><strong>" +
			(duel ? stats.crashes : stats.cleared + "/5") +
			"</strong><small>" +
			(duel ? "SWITCHEROOS" : "CIRCUITS CLEARED") +
			"</small></div></div>" +
			(duel
				? '<p class="modal-copy">GOLD ' +
					padScore(duelScores[0]) +
					" · CORAL " +
					padScore(duelScores[1]) +
					"</p>"
				: "") +
			(mode === "race"
				? '<div id="result-rivals" class="modal-copy">Your result is shared. Other drivers may still be racing.</div>'
				: "") +
			(dev.used
				? '<p class="modal-note">Garage run · personal best protected.</p>'
				: "") +
			'<button class="primary" data-action="play-again"><span>Another round?</span><b>↗</b></button><div class="modal-bottom"><button class="back-button" data-action="title">Park it · title</button><button class="back-button" data-action="about">Credits & feedback</button></div>',
	);
}

function handleAction(action) {
	if (hubEnded || !ready) return;
	audio.click();
	lastActivity = performance.now();
	if (action === "solo") {
		if (hub.active) return;
		startGame();
	} else if (action === "duel") duelMenu();
	else if (action === "start-duel") startGame("duel");
	else if (action === "howto") {
		modalBack = modalKind;
		howtoMenu();
	} else if (action === "settings") {
		modalBack = modalKind;
		settingsMenu();
	} else if (action === "about") {
		modalBack = modalKind;
		aboutMenu();
	} else if (action === "dev") devMenu();
	else if (action === "resume") closeModal();
	else if (action === "back") backMenu();
	else if (action === "title") returnTitle();
	else if (action === "restart") startGame(mode);
	else if (action === "play-again") {
		if (mode === "race") {
			returnTitle();
			onlineMenu();
		} else startGame(mode);
	} else if (action === "glyphs") {
		settings.glyphs = settings.glyphs === "Xbox" ? "PlayStation" : "Xbox";
		saveSettings();
		settingsMenu();
		updatePrompts();
	} else if (action === "fullscreen") {
		if (document.fullscreenElement) document.exitFullscreen();
		else
			document.documentElement
				.requestFullscreen()
				.catch(() => toast("FULL SCREEN IS UNAVAILABLE HERE"));
	} else if (action === "online") onlineMenu();
	else if (action === "join-menu") joinMenu();
	else if (action === "host") {
		net.open(true).catch((e) => toast(e.message));
		roomMenu();
	} else if (action === "join") {
		const code = $("room-input")?.value || "";
		if (code.length !== 5) {
			toast("FIVE CHARACTERS GETS YOU IN");
			return;
		}
		net.open(false, code).catch((e) => toast(e.message));
		roomMenu();
	} else if (action === "copy-code") {
		navigator.clipboard
			?.writeText(net.code)
			.then(() => toast("ROOM CODE COPIED"))
			.catch(() => toast("YOUR ROOM CODE: " + net.code));
	} else if (action === "start-room") net.start();
	else if (action === "dev-reset") {
		Object.assign(tune, DEFAULTS);
		dev.invincible = false;
		dev.autopilot = false;
		dev.colliders = false;
		dev.used = true;
		devMenu();
	} else if (action === "dev-refill") {
		lives = 3;
		charge = 100;
		dev.used = true;
		toast("BUMPER CREW SAYS YOU’RE WELCOME");
		updateHUD();
	} else if (action === "dev-next") {
		dev.used = true;
		setupStage((stageIndex + 1) % 5);
		state = "playing";
		$("callout").classList.add("hidden");
		devMenu();
	} else if (action === "dev-step") {
		dev.used = true;
		const p = paused;
		paused = false;
		for (let i = 0; i < 120; i++) fixedTick(FIXED);
		paused = p;
		updateHUD();
		devMenu();
	}
}
function saveSettings() {
	audio.setVolumes(settings.music / 100, settings.effects / 100);
	try {
		localStorage.setItem("doa-settings", JSON.stringify(settings));
	} catch {}
}
document.addEventListener("click", (e) => {
	if (hub.active && e.target.closest("a")) {
		e.preventDefault();
		return;
	}
	if (
		activity(
			e.pointerType === "touch"
				? "touch"
				: e.pointerType === "mouse"
					? "keyboard"
					: lastInput,
		)
	)
		return;
	const button = e.target.closest("button");
	if (button?.dataset.action) handleAction(button.dataset.action);
	if (button?.dataset.tab) aboutMenu(button.dataset.tab);
	if (button?.dataset.codeSlot !== undefined)
		adjustRoomCode(Number(button.dataset.codeSlot), 1);
});
document.addEventListener("wheel", () => activity("keyboard"), {
	passive: true,
});
document.addEventListener("pointermove", (e) => {
	if (e.pointerType !== "mouse" || (!e.movementX && !e.movementY) || hubEnded)
		return;
	lastActivity = performance.now();
	if (mode === "attract") returnTitle();
	if (lastInput !== "keyboard") {
		lastInput = "keyboard";
		updatePrompts();
	}
	const target = e.target.closest("button,input");
	if (target) {
		refreshFocus();
		const index = focusList.indexOf(target);
		if (index >= 0) setFocus(index);
	}
});
document.addEventListener("input", (e) => {
	const el = e.target;
	if (el.dataset.setting) {
		settings[el.dataset.setting] =
			el.type === "checkbox" ? el.checked : Number(el.value);
		el.nextElementSibling &&
			(el.nextElementSibling.textContent = el.value + "%");
		saveSettings();
	}
	if (el.dataset.tune) {
		tune[el.dataset.tune] = Number(el.value);
		el.nextElementSibling.textContent = Number(el.value).toFixed(2);
		dev.used = true;
	}
});
document.addEventListener("change", (e) => {
	const el = e.target;
	if (el.dataset.dev) {
		dev[el.dataset.dev] = el.checked;
		dev.used = true;
	}
	if (el.type === "checkbox" && el.dataset.setting) {
		settings[el.dataset.setting] = el.checked;
		saveSettings();
	}
});
$("menu-button").addEventListener("click", pauseGame);
$("touch-slip").addEventListener("pointerdown", (e) => {
	e.stopPropagation();
	activity("touch");
	activateSlip();
});
document.addEventListener("keydown", (e) => {
	if (hubEnded || !ready) return;
	if (e.target instanceof HTMLInputElement && e.target.type === "text") {
		if (e.key === "Enter") handleAction("join");
		if (e.key === "Escape") backMenu();
		return;
	}
	if (
		["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Tab"].includes(
			e.key,
		)
	)
		e.preventDefault();
	if (activity("keyboard")) {
		e.preventDefault();
		return;
	}
	if (e.repeat && !["ArrowUp", "ArrowDown"].includes(e.key)) return;
	const key = e.key.toLowerCase();
	keySet.add(key);
	if (key === "escape" || key === "p") {
		if (state === "title" && modalKind) backMenu();
		else pauseGame();
		return;
	}
	if (modalKind || state === "title") {
		if (key === "arrowdown" || key === "s" || key === "tab")
			menuMove(key === "tab" && e.shiftKey ? -1 : 1);
		else if (key === "arrowup" || key === "w") menuMove(-1);
		else if (key === "arrowleft") menuAdjust(-1);
		else if (key === "arrowright") menuAdjust(1);
		else if (key === "enter" || key === " ") {
			refreshFocus();
			focusList[uiFocus]?.click();
		}
		return;
	}
	if (key === "a" || key === "arrowleft") queueLane(0, -1);
	if (key === "d" || key === "arrowright") queueLane(0, 1);
	if (key === "j") queueLane(1, -1);
	if (key === "l") queueLane(1, 1);
	if (key === "shift") activateSlip(cars.find((c) => c.inputId === 0));
	if (key === "k" && mode === "duel" && runner === 1) activateSlip(cars[1]);
});
document.addEventListener("keyup", (e) => keySet.delete(e.key.toLowerCase()));
addEventListener("blur", () => {
	keySet.clear();
	mouseBoost = false;
	input.forEach((i) => {
		i.boost = false;
		i.lane = 0;
	});
	if (!hub.active && mode !== "race" && state === "playing" && !modalKind)
		pauseGame();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		keySet.clear();
		input.forEach((i) => {
			i.boost = false;
			i.lane = 0;
		});
	}
});
$("world").addEventListener("contextmenu", (e) => e.preventDefault());
function pointerLane(e) {
	const rect = $("world").getBoundingClientRect();
	raycaster.setFromCamera(
		new THREE.Vector2(
			((e.clientX - rect.left) / rect.width) * 2 - 1,
			(-(e.clientY - rect.top) / rect.height) * 2 + 1,
		),
		camera,
	);
	if (!raycaster.ray.intersectPlane(groundPlane, pickPoint)) return;
	let bestDistance = Infinity,
		lane = 0;
	for (let l = 0; l < 4; l++)
		for (let k = 0; k < 80; k++) {
			const p = loop(l, k / 80);
			const d = (p.x - pickPoint.x) ** 2 + (p.z - pickPoint.z) ** 2;
			if (d < bestDistance) {
				bestDistance = d;
				lane = l;
			}
		}
	if (bestDistance < 7) queueLane(0, 0, lane);
}
$("world").addEventListener("pointerdown", (e) => {
	if (activity(e.pointerType === "touch" ? "touch" : "keyboard")) return;
	if (state !== "playing" || paused) return;
	$("world").setPointerCapture(e.pointerId);
	if (e.pointerType === "touch") {
		touchPointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			right: e.clientX > innerWidth * 0.5,
		});
	} else if (e.button === 0) {
		mouseBoost = true;
		pointerLane(e);
	} else if (e.button === 2) activateSlip();
});
$("world").addEventListener("pointermove", (e) => {
	const t = touchPointers.get(e.pointerId);
	if (t && !t.right && Math.abs(e.clientX - t.x) > 20) {
		queueLane(0, Math.sign(e.clientX - t.x));
		t.x = e.clientX;
	}
	if (
		e.pointerType === "mouse" &&
		e.buttons & 1 &&
		state === "playing" &&
		!paused
	)
		pointerLane(e);
});
function pointerUp(e) {
	touchPointers.delete(e.pointerId);
	if (e.pointerType !== "touch") mouseBoost = false;
}
$("world").addEventListener("pointerup", pointerUp);
$("world").addEventListener("pointercancel", pointerUp);

function rumble(strength, duration) {
	if (settings.reduced || lastInput !== "pad") return;
	const pad = [...navigator.getGamepads()].find(Boolean);
	pad?.vibrationActuator
		?.playEffect("dual-rumble", {
			duration,
			strongMagnitude: strength,
			weakMagnitude: strength * 0.7,
		})
		.catch(() => {});
}
function pollInput(dt) {
	const keyboardLanes = [
		(keySet.has("d") || keySet.has("arrowright") ? 1 : 0) -
			(keySet.has("a") || keySet.has("arrowleft") ? 1 : 0),
		(keySet.has("l") ? 1 : 0) - (keySet.has("j") ? 1 : 0),
	];
	const keyboardBoost = [
		keySet.has(" ") ||
			keySet.has("w") ||
			keySet.has("arrowup") ||
			mouseBoost ||
			[...touchPointers.values()].some((t) => t.right),
		keySet.has("i"),
	];
	for (let id = 0; id < 2; id++) {
		input[id].lane = keyboardLanes[id];
		input[id].boost = keyboardBoost[id];
	}
	const pads = [...navigator.getGamepads()].filter(Boolean).slice(0, 2);
	pads.forEach((pad, id) => {
		const buttons = pad.buttons.map((b) => !!b.pressed),
			prev = padPrevious[id] || [];
		const rising = (n) => buttons[n] && !prev[n];
		const x =
			Math.abs(pad.axes[0] || 0) > 0.35
				? Math.sign(pad.axes[0])
				: (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0);
		const y =
			Math.abs(pad.axes[1] || 0) > 0.5
				? Math.sign(pad.axes[1])
				: (buttons[13] ? 1 : 0) - (buttons[12] ? 1 : 0);
		const fresh =
			buttons.some((b, i) => b && !prev[i]) ||
			(pad.axes.some((v) => Math.abs(v) > 0.35) &&
				performance.now() > padRepeat[id] + 250) ||
			((x || y) && performance.now() > padRepeat[id] + 250);
		if (fresh) {
			if (activity("pad")) {
				padPrevious[id] = buttons;
				return;
			}
		}
		if (rising(9) && !buttons[8]) {
			if (state === "title" && modalKind) backMenu();
			else pauseGame();
		} else if (modalKind || state === "title") {
			if (id === 0) {
				const scroll = pad.axes[3] || 0;
				if (modalKind && Math.abs(scroll) > 0.2)
					$("modal").scrollTop += scroll * dt * 650;
				if (rising(0)) {
					refreshFocus();
					focusList[uiFocus]?.click();
				}
				if (rising(1) && modalKind) backMenu();
				if ((x || y) && performance.now() > stickRepeatAt) {
					if (y) menuMove(y);
					else menuAdjust(x);
					stickRepeatAt = performance.now() + 220;
				}
			}
		} else if (!hubEnded) {
			if (x && performance.now() > padRepeat[id]) {
				queueLane(id, x);
				padRepeat[id] = performance.now() + 300;
			}
			input[id].lane = x;
			input[id].boost = buttons[7] || buttons[0];
			if ((rising(2) || rising(4)) && (mode !== "duel" || runner === id))
				activateSlip(cars.find((c) => c.inputId === id));
		}
		padPrevious[id] = buttons;
	});
	for (const i of input) i.held = i.lane ? i.held + dt : 0;
	if (modalKind || state === "title")
		input.forEach((i) => {
			i.boost = false;
			i.lane = 0;
		});
}

function renderUpdate(dt) {
	const titleView = state === "title" || state === "waiting";
	viewBlend += ((titleView ? 1 : 0) - viewBlend) * Math.min(1, dt * 3);
	const portrait = innerHeight > innerWidth;
	const aspect = innerWidth / innerHeight;
	let height = portrait
		? titleView
			? 56
			: Math.max(49, 28 / aspect)
		: 31 + viewBlend * 10;
	const target = new THREE.Vector3(
		portrait ? -1.0 * viewBlend : -12.5 * viewBlend,
		0,
		portrait ? -10 * viewBlend : 0.5,
	);
	camera.left = (-height * aspect) / 2;
	camera.right = (height * aspect) / 2;
	camera.top = height / 2;
	camera.bottom = -height / 2;
	camera.updateProjectionMatrix();
	const jiggle = shake * (settings.shake / 100) * (settings.reduced ? 0 : 1);
	if (portrait && !titleView)
		camera.position.set(
			target.x + 32,
			52,
			target.z + (rngVisual() - 0.5) * jiggle,
		);
	else
		camera.position.set(
			target.x + (rngVisual() - 0.5) * jiggle,
			52,
			target.z + 32,
		);
	camera.lookAt(target.x, 0, target.z);
	titleBillboard.visible = viewBlend > 0.7;
	// Portrait title composes the track below the copy; gameplay always frames the full circuit.
	if (portrait && titleView) {
		camera.setViewOffset(
			innerWidth,
			innerHeight,
			0,
			-innerHeight * 0.18,
			innerWidth,
			innerHeight,
		);
	} else camera.clearViewOffset();
	shake = Math.max(0, shake - dt * 1.8);
	impact = Math.max(0, impact - dt * 1.7);
	$("impact").style.opacity = impact;
	if (!paused && !hubEnded) for (const mixer of mixers) mixer.update(dt);
	for (const c of cars)
		if (c.active) {
			c.aura.visible = c.slip > 0 || (c.immune > 0 && state === "playing");
			c.aura.material.color.set(c.slip > 0 ? "#67d7c3" : "#fff2ce");
			c.aura.material.opacity = c.slip > 0 ? 0.85 : 0.35;
			c.aura.rotation.z += dt * 3;
			c.aura.scale.setScalar(1 + Math.sin(simTime * 14) * 0.08);
			c.root.visible = true;
			c.marker.position.y = 1.55 + Math.sin(simTime * 4) * 0.1;
		}
	for (const g of ghosts.values()) {
		const show =
			["hub", "race"].includes(mode) &&
			g.data.stage === stageIndex &&
			performance.now() - g.last < 5000 &&
			!g.data.done;
		g.car.root.visible = show;
		if (show) {
			const p = loop(g.data.lane, g.data.u);
			g.car.root.position.set(p.x, 0.55, p.z);
			g.car.root.rotation.y = Math.atan2(p.dx, p.dz);
			g.car.aura.visible = g.data.slip;
		}
	}
	debugLines.visible = dev.colliders;
	if (dev.colliders && world) {
		const debug = world.debugRender();
		debugLines.geometry.dispose();
		debugLines.geometry = new THREE.BufferGeometry();
		debugLines.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(debug.vertices, 3),
		);
		debugLines.geometry.setAttribute(
			"color",
			new THREE.BufferAttribute(debug.colors, 4),
		);
	}
	if (performance.now() > toastUntil) $("toast").classList.remove("visible");
	if (modalKind === "result" && mode === "race") {
		const el = $("result-rivals");
		if (el)
			el.textContent = net.members
				.map(
					(m) =>
						"DRIVER " +
						(m.seat + 1) +
						": " +
						padScore(m.score) +
						(m.done ? " BANKED" : " RACING"),
				)
				.join(" · ");
	}
	audio.update(state === "playing", cars[0]?.boost, paused || hubEnded, false);
	renderer.render(scene, camera);
	renderFrames++;
}
let visualSeed = 0;
function rngVisual() {
	visualSeed++;
	return Math.sin(visualSeed * 7.123) * 0.5 + 0.5;
}
function frame(now) {
	const realDt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
	lastFrame = now;
	pollInput(realDt);
	net.update(now);
	if (
		state === "title" &&
		!modalKind &&
		!hub.active &&
		now - lastActivity >= 10000
	)
		startGame("attract");
	// Session clocks are authoritative even while this copy is in the pause menu.
	if (
		hub.active &&
		hubStarted &&
		!hubEnded &&
		hub.time() >= 180000 &&
		!resultSent
	)
		finish(false);
	if (
		mode === "race" &&
		raceStartAt &&
		Date.now() - raceStartAt >= 180000 &&
		!["gameover", "victory"].includes(state)
	)
		finish(false);
	accumulator += realDt * tune.timeScale;
	let iterations = 0;
	while (accumulator >= FIXED && iterations++ < 48) {
		fixedTick(FIXED);
		accumulator -= FIXED;
	}
	netTimer += realDt;
	if (netTimer > 0.1) {
		netTimer = 0;
		updateHUD();
		if (mode === "hub" && hubStarted && !hubEnded) {
			hub.send(ghostData(resultSent), { reliable: false });
			hub.progress({
				score,
				label: "Circuit " + (stageIndex + 1) + " · " + stats.dots + " gold",
			});
		}
		if (mode === "race" && net.racing)
			net.push(ghostData(["gameover", "victory"].includes(state)));
	}
	renderUpdate(realDt);
	requestAnimationFrame(frame);
}
function resize() {
	renderer?.setSize(innerWidth, innerHeight);
}
addEventListener("resize", resize);

function snapshot() {
	return {
		ready,
		state,
		mode,
		paused,
		modal: modalKind,
		stage: stageIndex + 1,
		score,
		lives,
		charge,
		dotsLeft,
		elapsed,
		runner,
		duelScores: [...duelScores],
		stats: { ...stats },
		tune: { ...tune },
		dev: { ...dev },
		renderer: renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2",
		three: THREE.REVISION,
		rapier: RAPIER.version(),
		physicsTicks,
		renderFrames,
		sensorEvents,
		input: lastInput,
		focus: uiFocus,
		inputPads: padPrevious.map((p) => p.map(Boolean)),
		car: cars[0]
			? {
					u: mod(cars[0].t),
					lane: cars[0].lane,
					renderLane: cars[0].renderLane,
					requested: cars[0].requested,
					boost: cars[0].boost,
					slip: cars[0].slip,
				}
			: null,
		gates: gates.map((g) => ({ locked: g.locked, warning: g.warning })),
		ghosts: [...ghosts].map(([id, g]) => ({
			id,
			stage: g.data.stage,
			visible: g.car.root.visible,
			score: g.data.score,
		})),
		net: {
			active: net.active,
			code: net.code,
			members: net.members.length,
			seat: net.seat,
			transport: net.transport,
		},
		audio: {
			state: audio.ctx?.state || "locked",
			musicVolume: audio.musicVolume,
			level: audio.level(),
			events: { ...audio.events },
		},
		hubEnded,
		resultSent,
	};
}
window.__game = { snapshot };
if (new URLSearchParams(location.search).has("test")) {
	Object.assign(window.__game, {
		start: (m = "solo") => startGame(m),
		advance: (seconds, options = {}) => {
			const oldPaused = paused,
				oldEnabled = audio.enabled;
			paused = false;
			audio.enabled = false;
			if (options.autopilot !== undefined) dev.autopilot = options.autopilot;
			if (options.invincible !== undefined) dev.invincible = options.invincible;
			for (let i = 0; i < Math.ceil(seconds / FIXED); i++) fixedTick(FIXED);
			paused = oldPaused;
			audio.enabled = oldEnabled;
			updateHUD();
			return snapshot();
		},
		set: (data) => {
			if (data.charge !== undefined) charge = data.charge;
			if (data.lives !== undefined) lives = data.lives;
			if (data.elapsed !== undefined) elapsed = data.elapsed;
			if (data.state) state = data.state;
			if (data.stage !== undefined) setupStage(data.stage - 1);
			if (data.dev) Object.assign(dev, data.dev);
			if (data.tune) Object.assign(tune, data.tune);
		},
		place: (id, data) => {
			const c = cars[id];
			if (data.lane !== undefined)
				c.lane = c.renderLane = c.fromLane = data.lane;
			if (data.u !== undefined) c.t = data.u;
			if (data.immune !== undefined) c.immune = data.immune;
			if (data.slip !== undefined) c.slip = data.slip;
			c.shift = 1;
			syncBodies(true);
		},
		queue: queueLane,
		slip: activateSlip,
		audio: async () => {
			await audio.unlock();
			audio.dot(4);
			audio.crash();
			audio.voice(2);
		},
		pause: pauseGame,
		titleIdle: (seconds) => {
			lastActivity = performance.now() - seconds * 1000;
		},
		ghost: receiveGhost,
		network: {
			open: (host, code) => net.open(host, code),
			start: () => net.start(),
			close: () => net.close(),
		},
	});
}

async function boot() {
	try {
		if (hub.active) {
			$("title-screen").classList.add("hidden");
			$("masthead").classList.add("hidden");
			hub.on("start", () => {
				hubStarted = true;
			});
			hub.on("message", (data, from) => {
				const player = hub.players.find((p) => p.id === from);
				if (ready && player)
					receiveGhost(data, from, player.name, player.color);
			});
			hub.on("leave", ({ id }) => {
				const g = ghosts.get(id);
				if (g) g.car.root.visible = false;
				ghosts.delete(id);
				updateNetworkBoard();
			});
			hub.on("time-up", () => {
				if (ready) {
					reportResult();
					if (!["victory", "gameover"].includes(state)) {
						state = "gameover";
						showCallout("TIME’S UP", padScore(score), "YOUR GOLD IS BANKED");
					}
				}
			});
			hub.on("end", () => {
				hubEnded = true;
				paused = false;
				closeModal();
				state = "ended";
				keySet.clear();
				audio.stop();
				$("callout").classList.add("hidden");
				$("corner").style.display = "none";
			});
			hubInfo = await hub.connect({ mode: "ghost", seats: [1, 4] });
		}
		$("load-message").textContent = "Inking the circuit…";
		await Promise.all([RAPIER.init(), document.fonts.ready]);
		buildScene();
		renderer = new THREE.WebGPURenderer({
			canvas: $("world"),
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		await renderer.init();
		resize();
		setupStage(0);
		ready = true;
		if (hub.active && hubInfo) {
			startGame("hub");
			state = "countdown";
			stateTimer = 3;
			hub.ready();
		} else {
			returnTitle();
			renderUpdate(0);
			lastActivity = performance.now();
		}
		$("loading").classList.add("hidden");
		updatePrompts();
		lastFrame = performance.now();
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		window.__bootError = String(error.stack || error);
		$("load-message").textContent =
			"The pit crew hit a snag: " +
			error.message +
			". Check your connection and reload.";
		if (hub.active) hub.fail("Could not start the renderer: " + error.message);
	}
}
boot();
