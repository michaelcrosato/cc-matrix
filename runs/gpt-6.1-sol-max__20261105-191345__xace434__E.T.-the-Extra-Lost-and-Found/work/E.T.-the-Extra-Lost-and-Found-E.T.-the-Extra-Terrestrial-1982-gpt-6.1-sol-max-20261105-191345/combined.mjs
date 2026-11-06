import RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs";
import { color, mix, positionWorld, smoothstep } from "three/tsl";
import * as THREE from "three/webgpu";

const $ = (s) => document.querySelector(s),
	$$ = (s) => [...document.querySelectorAll(s)],
	clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
	lerp = THREE.MathUtils.lerp;
const query = new URLSearchParams(location.search),
	testMode = query.has("test");
const credits = JSON.parse($("#creditsData").textContent),
	audio = new window.NightAudio();
const defaults = {
	walkSpeed: 4.7,
	alertRate: 24,
	recharge: 7,
	flightSpeed: 12,
	invincible: false,
	freeze: false,
};
const tuning = { ...defaults },
	settings = {
		music: 0.1,
		sfx: 0.7,
		glyphs: "PlayStation",
		motion: true,
		sensitivity: 1,
	};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("etlaf-settings") || "{}"),
	);
} catch {}
settings.music = clamp(Number(settings.music) || 0, 0, 1);
settings.sfx = clamp(Number(settings.sfx) || 0, 0, 1);
audio.volumes(settings.music, settings.sfx);
const input = {
	x: 0,
	y: 0,
	lookX: 0,
	lookY: 0,
	sneak: false,
	boost: false,
	lift: false,
	keys: new Set(),
	type: "keyboard",
	click: null,
	touch: null,
	actions: [],
	padPrev: [],
	last: performance.now(),
};
let state = {
	screen: "loading",
	phase: "friend",
	parts: [false, false, false],
	bond: 100,
	alert: 0,
	candy: 8,
	healed: 0,
	rings: 0,
	catches: 0,
	time: 0,
	won: false,
	crateMoved: false,
	gateOpen: false,
	friend: false,
	signal: false,
	attract: false,
	auto: false,
	tuneRound: 0,
	tuneIndex: 0,
	tunePlaying: false,
	checkpoint: { x: 5, z: 14 },
	elapsed: 0,
};
const timers = {
		dialogue: 0,
		toast: 0,
		splash: 0,
		pulse: 0,
		candy: 0,
		footstep: 0,
		net: 0,
		ui: 0,
		tour: 0,
	},
	storyQueue = [];
let renderer,
	scene,
	camera,
	world,
	controller,
	body,
	collider,
	clock,
	lastFrame = 0,
	accumulator = 0,
	pausedFrom = "play",
	menu = "none",
	cameraYaw = 0,
	cameraPitch = 0.76,
	camDistance = 22,
	lookTarget = new THREE.Vector3(),
	pointerDown = null;
let player,
	friend,
	bike,
	titleBike,
	transmitter,
	ship,
	crate,
	gate,
	debugLines,
	skyMoon,
	playerHalo,
	shadowPlayer,
	friendHalo;
const worldObjects = [],
	colliders = [],
	mixers = [],
	guards = [],
	flowers = [],
	items = [],
	candies = [],
	rings = [],
	particles = [],
	ghosts = new Map(),
	mats = new Map(),
	dynamicBodies = [];
const colors = {
	ink: 0x10212e,
	teal: 0x68bca6,
	pine: 0x2d685e,
	pineLight: 0x42847b,
	bark: 0x4d4b4a,
	grass: 0x375d58,
	roof: 0x6b7279,
	cream: 0xf8dcb5,
	gold: 0xf8ce7a,
	red: 0xbd5e50,
	skin: 0xe8ba8e,
	alien: 0xb39467,
};
const locations = {
	friend: { x: 13, z: 2 },
	toy: { x: -23, z: 4 },
	battery: { x: -18, z: -19 },
	flower: { x: 20, z: -15 },
	umbrella: { x: 22, z: -24 },
	signal: { x: 0, z: -41 },
	bike: { x: 4, z: -45 },
	barrier: { x: 0, z: -83 },
	home: { x: 0, z: -161 },
};
const phaseOrder = [
	"friend",
	"parts",
	"signal",
	"ride",
	"flight",
	"farewell",
	"ending",
];
function material(color, basic = false, extra = {}) {
	const key = JSON.stringify([color, basic, extra]);
	if (mats.has(key)) return mats.get(key);
	const m = basic
		? new THREE.MeshBasicNodeMaterial({ color, ...extra })
		: new THREE.MeshToonNodeMaterial({
				color,
				gradientMap: gradient,
				...extra,
			});
	mats.set(key, m);
	return m;
}
let gradient;
function mesh(
	geo,
	color,
	parent,
	x = 0,
	y = 0,
	z = 0,
	scale = null,
	ink = true,
	basic = false,
) {
	const m = new THREE.Mesh(geo, material(color, basic));
	m.position.set(x, y, z);
	if (scale) m.scale.set(...scale);
	m.castShadow = !basic;
	m.receiveShadow = !basic;
	if (ink) {
		const outline = new THREE.Mesh(
			geo,
			material(colors.ink, true, { side: THREE.BackSide }),
		);
		outline.scale.setScalar(1.035);
		m.add(outline);
	}
	parent.add(m);
	return m;
}
const geos = {
	box: new THREE.BoxGeometry(1, 1, 1),
	ball: new THREE.SphereGeometry(1, 16, 12),
	lowBall: new THREE.IcosahedronGeometry(1, 1),
	cone: new THREE.ConeGeometry(1, 1, 7),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
	torus: new THREE.TorusGeometry(1, 0.045, 6, 24),
};
function box(p, c, x, y, z, sx, sy, sz, ink = true) {
	return mesh(geos.box, c, p, x, y, z, [sx, sy, sz], ink);
}
function ball(p, c, x, y, z, sx, sy = sx, sz = sx, ink = true, basic = false) {
	return mesh(geos.ball, c, p, x, y, z, [sx, sy, sz], ink, basic);
}
function cylinder(p, c, x, y, z, r, h, ink = true) {
	return mesh(geos.cylinder, c, p, x, y, z, [r, h, r], ink);
}
function line(p, points, c = 0x1a3039, opacity = 1) {
	const g = new THREE.BufferGeometry().setFromPoints(
			points.map((v) => new THREE.Vector3(...v)),
		),
		m = new THREE.LineBasicNodeMaterial({
			color: c,
			transparent: opacity < 1,
			opacity,
		});
	const l = new THREE.Line(g, m);
	p.add(l);
	return l;
}
function fixed(x, y, z, sx, sy, sz) {
	const c = world.createCollider(
		RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2).setTranslation(x, y, z),
	);
	colliders.push(c);
	return c;
}
function seeded(seed) {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 4294967296;
	};
}
const rng = seeded(19820611);
function glowTexture() {
	const c = document.createElement("canvas");
	c.width = c.height = 128;
	const x = c.getContext("2d"),
		g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
	g.addColorStop(0, "#fff9dc");
	g.addColorStop(0.15, "#ffe6a9b0");
	g.addColorStop(0.4, "#f5be7025");
	g.addColorStop(1, "#f5be7000");
	x.fillStyle = g;
	x.fillRect(0, 0, 128, 128);
	return new THREE.CanvasTexture(c);
}
let glowMap;
function glow(p, x, y, z, size = 2, color = 0xffd18a, opacity = 0.5) {
	const s = new THREE.Sprite(
		new THREE.SpriteNodeMaterial({
			map: glowMap,
			color,
			transparent: true,
			opacity,
			depthWrite: false,
		}),
	);
	s.position.set(x, y, z);
	s.scale.set(size, size, 1);
	p.add(s);
	return s;
}
function textSprite(text, color = "#f9dfae", size = 1) {
	const c = document.createElement("canvas");
	c.width = 512;
	c.height = 128;
	const x = c.getContext("2d");
	x.font = "600 43px sans-serif";
	x.textAlign = "center";
	x.fillStyle = "#0e2230cc";
	x.fillRect(0, 14, 512, 92);
	x.fillStyle = color;
	x.fillText(text, 256, 77);
	const s = new THREE.Sprite(
		new THREE.SpriteNodeMaterial({
			map: new THREE.CanvasTexture(c),
			transparent: true,
			depthWrite: false,
		}),
	);
	s.scale.set(size * 4, size, 1);
	return s;
}
function addTree(x, z, s = 1, variant = 0) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.rotation.y = rng() * 6.28;
	g.scale.setScalar(s);
	scene.add(g);
	cylinder(g, colors.bark, 0, 2.5, 0, 0.27, 5);
	for (let k = 0; k < 3; k++) {
		const c = variant ? colors.pineLight : colors.pine;
		mesh(geos.cone, c, g, 0, 3.2 + k * 1.4, 0, [
			2.2 - k * 0.35,
			3.7,
			2.2 - k * 0.35,
		]);
	}
	line(
		g,
		[
			[0, 1, 0.29],
			[0.08, 3, 0.29],
			[0, 4.6, 0.29],
		],
		0x253b3b,
	);
	if (s > 0.85 && x > -43 && x < 43 && z < 26 && z > -170)
		fixed(x, 2, z, 0.65 * s, 4, 0.65 * s);
	return g;
}
function fern(x, z, s = 1) {
	const g = new THREE.Group();
	g.position.set(x, 0.04, z);
	g.rotation.y = rng() * 6;
	scene.add(g);
	for (let j = 0; j < 5; j++) {
		const a = j * 1.256;
		const leaf = mesh(
			geos.cone,
			0x518b74,
			g,
			Math.cos(a) * 0.3,
			0.35,
			Math.sin(a) * 0.3,
			[0.14, 0.9, 0.24],
			false,
		);
		leaf.rotation.set(0.8 * Math.sin(a), a, 0.8 * Math.cos(a));
	}
	g.scale.setScalar(s);
}
function house(x, z, color, number) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	scene.add(g);
	box(g, color, 0, 2.1, 0, 8, 4.2, 6);
	const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
	const roof = mesh(roofGeo, colors.roof, g, 0, 5, 0, [5.3, 7, 2.5]);
	roof.rotation.set(Math.PI / 2, Math.PI / 2, 0);
	box(g, 0x394c56, 2, 5.6, -1, 1.1, 2.3, 1.3);
	box(g, 0x45565b, 0, 0.2, 4.1, 8.6, 0.4, 2.8);
	box(g, 0x6d4a43, 0, 1.35, 3.07, 1.35, 2.65, 0.12);
	ball(g, colors.gold, 0.42, 1.3, 3.2, 0.08);
	for (const px of [-2.7, 2.7]) {
		box(g, 0x203d49, px, 2, 3.07, 1.75, 1.9, 0.12);
		box(g, 0xf0c47e, px, 2, 3.15, 1.5, 1.65, 0.04, false);
		box(g, 0x34505a, px, 2, 3.2, 0.08, 1.7, 0.04, false);
		box(g, 0x34505a, px, 2, 3.21, 1.55, 0.08, 0.04, false);
		glow(g, px, 2, 3.3, 3, 0xfacb83, 0.17);
	}
	for (let k = -3; k <= 3; k++)
		line(
			g,
			[
				[k, 0, 3.27],
				[k, 4.1, 3.27],
			],
			0x8e9c9366,
			0.2,
		);
	for (let j = 0; j < 4; j++)
		box(g, 0x7f8274, 0, 0.1, 5.4 + j * 0.8, 1.8, 0.2, 0.65, false);
	const n = textSprite(String(number), "#c8e0d4", 0.5);
	n.position.set(1.3, 1.4, 3.2);
	g.add(n);
	fixed(x, 2, z, 8, 4, 6);
	return g;
}
function fence(x, z, length, alongX = true) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	if (!alongX) g.rotation.y = Math.PI / 2;
	scene.add(g);
	for (let k = -length / 2; k <= length / 2; k += 0.65) {
		box(g, 0xa3ad91, k, 0.8, 0, 0.16, 1.6, 0.16, false);
		const cap = mesh(
			geos.cone,
			0xa3ad91,
			g,
			k,
			1.7,
			0,
			[0.17, 0.25, 0.17],
			false,
		);
	}
	for (const h of [0.45, 1.1])
		box(g, 0x788f80, 0, h, 0, length, 0.13, 0.14, false);
	fixed(x, 0.7, z, alongX ? length : 0.25, 1.4, alongX ? 0.25 : length);
	return g;
}
function hedge(x, z, sx = 5, sz = 1.6) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	scene.add(g);
	for (let k = 0; k < Math.ceil(sx); k++)
		mesh(geos.lowBall, 0x3b725f, g, -sx / 2 + k + 0.5, 1, 0, [
			1,
			1.15,
			sz * 0.6,
		]);
	fixed(x, 0.6, z, sx, 1.2, sz);
	worldObjects.push({ type: "cover", x, z, r: sx / 2 + 1 });
}
function makeKid(color = colors.red) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "rig";
	root.add(rig);
	const torso = ball(rig, color, 0, 1.35, 0, 0.4, 0.48, 0.28);
	torso.name = "torso";
	const head = ball(rig, colors.skin, 0, 2.05, 0, 0.32, 0.36, 0.3);
	head.name = "head";
	ball(rig, color, 0, 2.14, 0.09, 0.38, 0.4, 0.31);
	ball(rig, colors.skin, 0, 2.04, -0.2, 0.275, 0.285, 0.18);
	ball(rig, 0x1a2e35, -0.12, 2.08, -0.355, 0.035);
	ball(rig, 0x1a2e35, 0.12, 2.08, -0.355, 0.035);
	const arms = [],
		legs = [];
	for (let i = 0; i < 2; i++) {
		const sign = i ? 1 : -1,
			a = new THREE.Group();
		a.name = i ? "armR" : "armL";
		a.position.set(sign * 0.44, 1.6, 0);
		rig.add(a);
		cylinder(a, color, 0, -0.3, 0, 0.12, 0.63);
		ball(a, colors.skin, 0, -0.65, 0, 0.13);
		arms.push(a);
		const l = new THREE.Group();
		l.name = i ? "legR" : "legL";
		l.position.set(sign * 0.19, 1, 0);
		rig.add(l);
		cylinder(l, 0x475a69, 0, -0.37, 0, 0.145, 0.72);
		box(l, 0xd2c8a6, 0, -0.78, -0.09, 0.3, 0.18, 0.46);
		legs.push(l);
	}
	box(rig, 0x667d6a, 0, 1.37, 0.32, 0.55, 0.55, 0.24);
	line(
		rig,
		[
			[-0.12, 1.7, -0.28],
			[-0.09, 1.4, -0.3],
		],
		0xe5cc96,
	);
	line(
		rig,
		[
			[0.12, 1.7, -0.28],
			[0.09, 1.4, -0.3],
		],
		0xe5cc96,
	);
	const mixer = new THREE.AnimationMixer(root),
		walk = new THREE.AnimationClip("walking", 0.64, [
			new THREE.NumberKeyframeTrack(
				"armL.rotation[x]",
				[0, 0.16, 0.32, 0.48, 0.64],
				[0.5, 0, -0.5, 0, 0.5],
			),
			new THREE.NumberKeyframeTrack(
				"armR.rotation[x]",
				[0, 0.16, 0.32, 0.48, 0.64],
				[-0.5, 0, 0.5, 0, -0.5],
			),
			new THREE.NumberKeyframeTrack(
				"legL.rotation[x]",
				[0, 0.16, 0.32, 0.48, 0.64],
				[-0.62, 0, 0.62, 0, -0.62],
			),
			new THREE.NumberKeyframeTrack(
				"legR.rotation[x]",
				[0, 0.16, 0.32, 0.48, 0.64],
				[0.62, 0, -0.62, 0, 0.62],
			),
			new THREE.NumberKeyframeTrack(
				"rig.position[y]",
				[0, 0.16, 0.32, 0.48, 0.64],
				[0, 0.065, 0, 0.065, 0],
			),
		]);
	const action = mixer.clipAction(walk);
	action.play();
	action.paused = true;
	const idle = mixer.clipAction(
		new THREE.AnimationClip("breathing", 2.8, [
			new THREE.NumberKeyframeTrack(
				"torso.scale[y]",
				[0, 1.4, 2.8],
				[0.48, 0.505, 0.48],
			),
		]),
	);
	idle.play();
	const pedal = mixer.clipAction(
		new THREE.AnimationClip("pedaling", 0.7, [
			new THREE.NumberKeyframeTrack(
				"legL.rotation[x]",
				[0, 0.175, 0.35, 0.525, 0.7],
				[0.65, 1.25, 0.65, 0.15, 0.65],
			),
			new THREE.NumberKeyframeTrack(
				"legR.rotation[x]",
				[0, 0.175, 0.35, 0.525, 0.7],
				[0.65, 0.15, 0.65, 1.25, 0.65],
			),
			new THREE.NumberKeyframeTrack("armL.rotation[x]", [0, 0.7], [1.05, 1.05]),
			new THREE.NumberKeyframeTrack("armR.rotation[x]", [0, 0.7], [1.05, 1.05]),
			new THREE.NumberKeyframeTrack(
				"rig.position[y]",
				[0, 0.175, 0.35, 0.525, 0.7],
				[0.52, 0.55, 0.52, 0.55, 0.52],
			),
			new THREE.NumberKeyframeTrack(
				"rig.rotation[x]",
				[0, 0.7],
				[-0.14, -0.14],
			),
		]),
	);
	pedal.play();
	pedal.setEffectiveWeight(0);
	pedal.paused = true;
	mixers.push(mixer);
	return { root, rig, mixer, walk: action, pedal, arms, legs };
}
function makeAlien() {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "alienRig";
	root.add(rig);
	ball(rig, colors.alien, 0, 0.7, 0, 0.46, 0.67, 0.34);
	const neck = cylinder(rig, 0xad8c63, 0, 1.32, 0, 0.17, 0.55);
	neck.name = "neck";
	const head = ball(rig, colors.alien, 0, 1.68, -0.04, 0.51, 0.32, 0.32);
	head.name = "alienHead";
	for (const s of [-1, 1]) {
		ball(rig, 0x927c59, s * 0.36, 1.72, -0.04, 0.25, 0.22, 0.23);
		ball(rig, 0xe3ddbb, s * 0.29, 1.72, -0.265, 0.16, 0.155, 0.07);
		ball(rig, 0x337a99, s * 0.29, 1.73, -0.323, 0.09, 0.105, 0.04);
		ball(rig, 0x102332, s * 0.29, 1.73, -0.352, 0.048, 0.066, 0.024);
		ball(
			rig,
			0xfff5da,
			s * 0.31,
			1.76,
			-0.372,
			0.025,
			0.025,
			0.015,
			false,
			true,
		);
		ball(rig, colors.alien, s * 0.25, 0.12, -0.12, 0.24, 0.13, 0.32);
		const arm = new THREE.Group();
		arm.name = s < 0 ? "alienArmL" : "alienArmR";
		arm.position.set(s * 0.4, 1, 0);
		rig.add(arm);
		const limb = cylinder(arm, 0xa68b62, s * 0.09, -0.25, -0.02, 0.085, 0.6);
		limb.rotation.z = s * 0.23;
		ball(arm, colors.alien, s * 0.16, -0.57, -0.03, 0.13, 0.1, 0.13);
		for (let j = 0; j < 3; j++) {
			const f = cylinder(
				arm,
				colors.alien,
				s * 0.11 + j * 0.05,
				-0.66,
				-0.09,
				0.026,
				0.2,
			);
			f.rotation.x = -0.2;
		}
		if (s > 0) {
			const f = cylinder(arm, 0xd7bd8c, s * 0.15, -0.65, -0.17, 0.025, 0.32);
			f.rotation.x = 0.65;
			glow(arm, s * 0.15, -0.82, -0.28, 0.8, 0xffd397, 0.45);
		}
	}
	for (let i = 0; i < 5; i++)
		line(
			rig,
			[
				[-0.31, 1 - i * 0.13, -0.31],
				[-0.12, 0.98 - i * 0.13, -0.35],
				[0.12, 0.98 - i * 0.13, -0.35],
				[0.31, 1 - i * 0.13, -0.31],
			],
			0x75664b,
			0.6,
		);
	line(
		rig,
		[
			[-0.13, 1.55, -0.33],
			[0, 1.53, -0.36],
			[0.13, 1.55, -0.33],
		],
		0x584f3e,
	);
	const heart = ball(
		rig,
		0xf7a277,
		0,
		1.02,
		-0.33,
		0.085,
		0.09,
		0.035,
		false,
		true,
	);
	glow(rig, 0, 1.02, -0.4, 1.3, 0xff8f69, 0.4);
	const mixer = new THREE.AnimationMixer(root);
	const breathe = mixer.clipAction(
		new THREE.AnimationClip("wonder", 3, [
			new THREE.NumberKeyframeTrack(
				"neck.scale[y]",
				[0, 1.5, 3],
				[0.55, 0.65, 0.55],
			),
			new THREE.NumberKeyframeTrack(
				"alienHead.position[y]",
				[0, 1.5, 3],
				[1.68, 1.77, 1.68],
			),
			new THREE.NumberKeyframeTrack(
				"alienRig.rotation[z]",
				[0, 1.5, 3],
				[-0.035, 0.035, -0.035],
			),
		]),
	);
	breathe.play();
	const wave = mixer.clipAction(
		new THREE.AnimationClip("fingerlight", 1.2, [
			new THREE.NumberKeyframeTrack(
				"alienArmR.rotation[x]",
				[0, 0.25, 0.8, 1.2],
				[0, -2, -2, 0],
			),
			new THREE.NumberKeyframeTrack(
				"alienArmR.rotation[z]",
				[0, 0.25, 0.5, 0.75, 1.2],
				[0, -0.3, -0.7, -0.3, 0],
			),
		]),
	);
	wave.setLoop(THREE.LoopOnce);
	wave.clampWhenFinished = true;
	mixers.push(mixer);
	return { root, rig, mixer, wave, heart };
}
function makeBike(color = 0xb94d44) {
	const g = new THREE.Group(),
		wheelGroups = [];
	for (const z of [-0.9, 0.9]) {
		const w = new THREE.Group();
		w.position.set(0, 0.58, z);
		g.add(w);
		const tire = new THREE.Mesh(
			new THREE.TorusGeometry(0.56, 0.065, 8, 28),
			material(0x132630),
		);
		tire.rotation.y = Math.PI / 2;
		w.add(tire);
		const rim = new THREE.Mesh(
			new THREE.TorusGeometry(0.46, 0.025, 6, 24),
			material(0xb5c5bc),
		);
		rim.rotation.y = Math.PI / 2;
		w.add(rim);
		for (let j = 0; j < 8; j++) {
			const a = (j * Math.PI) / 4;
			line(
				w,
				[
					[0, 0, 0],
					[0, Math.cos(a) * 0.47, Math.sin(a) * 0.47],
				],
				0xa6b6b1,
			);
		}
		wheelGroups.push(w);
	}
	const tube = (a, b, c = color, r = 0.055) => {
		const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
		const m = mesh(
			geos.cylinder,
			c,
			g,
			(a[0] + b[0]) / 2,
			(a[1] + b[1]) / 2,
			(a[2] + b[2]) / 2,
			[r, v.length(), r],
			false,
		);
		m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
	};
	tube([0, 0.58, 0.9], [0, 1.4, 0.4]);
	tube([0, 1.4, 0.4], [0, 0.6, 0]);
	tube([0, 0.6, 0], [0, 0.58, 0.9]);
	tube([0, 1.4, 0.4], [0, 1.4, -0.65]);
	tube([0, 1.4, -0.65], [0, 0.6, 0]);
	tube([0, 0.58, -0.9], [0, 1.6, -0.65]);
	tube([0, 1.6, -0.65], [0, 1.8, -0.7], 0xb9c7bd);
	tube([-0.42, 1.8, -0.7], [0.42, 1.8, -0.7], 0xb9c7bd);
	box(g, 0x253744, 0, 1.53, 0.35, 0.4, 0.12, 0.35);
	box(g, 0xbda987, 0, 1.47, -1, 0.7, 0.5, 0.55);
	for (let j = 0; j < 5; j++) {
		line(
			g,
			[
				[-0.355 + j * 0.177, 1.23, -1.29],
				[-0.355 + j * 0.177, 1.73, -1.29],
			],
			0x685b49,
		);
	}
	box(g, 0xe9e6ce, 0, 1.76, -1, 0.63, 0.12, 0.51, false);
	g.userData.wheels = wheelGroups;
	return g;
}
function makeFlower(x, z, required = false) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	scene.add(g);
	cylinder(g, 0xad795b, 0, 0.24, 0, 0.35, 0.48);
	const plant = new THREE.Group();
	plant.name = "plant";
	g.add(plant);
	for (let i = 0; i < 3; i++) {
		const a = i * 2.1,
			cx = Math.cos(a) * 0.15,
			cz = Math.sin(a) * 0.15;
		cylinder(plant, 0x608e6a, cx, 0.62, cz, 0.035, 0.6, false);
		ball(plant, 0x608f69, cx + 0.12, 0.62, cz, 0.18, 0.06, 0.1, false);
		for (let j = 0; j < 5; j++) {
			const b = j * 1.257;
			ball(
				plant,
				required ? 0xf2c67a : 0xb5a8db,
				cx + Math.cos(b) * 0.13,
				0.96,
				cz + Math.sin(b) * 0.13,
				0.1,
				0.06,
				0.1,
			);
		}
		ball(plant, 0xd8a05f, cx, 0.99, cz, 0.075);
	}
	plant.scale.y = 0.42;
	plant.rotation.z = 0.35;
	const gl = glow(g, 0, 1.1, 0, 2, 0xf6d18b, 0.18);
	const f = { root: g, plant, x, z, healed: false, required, glow: gl };
	flowers.push(f);
	return f;
}
function makeItem(name, index, x, z, kind) {
	const g = new THREE.Group();
	g.position.set(x, 0.8, z);
	scene.add(g);
	if (kind === "toy") {
		box(g, 0xa85f46, 0, 0.3, 0, 0.95, 0.95, 0.3);
		box(g, 0xe0c990, 0, 0.4, -0.18, 0.68, 0.34, 0.04, false);
		for (let i = 0; i < 6; i++)
			ball(
				g,
				0xe2bd73,
				((i % 3) - 0.9) * 0.21,
				0.12 - Math.floor(i / 3) * 0.19,
				-0.2,
				0.06,
				0.055,
				0.025,
				false,
			);
	} else if (kind === "battery") {
		cylinder(g, 0x569c99, 0, 0.2, 0, 0.28, 0.85);
		cylinder(g, 0xf6d18b, 0, 0.64, 0, 0.12, 0.08);
	} else {
		const canopy = mesh(geos.cone, 0xc6a8bd, g, 0, 0.7, 0, [0.8, 0.35, 0.8]);
		canopy.rotation.z = 0.15;
		cylinder(g, 0xc0b89b, 0, 0.1, 0, 0.035, 1.2, false);
	}
	glow(g, 0, 0.4, 0, 3, 0xf7d58d, 0.45);
	const marker = mesh(
		new THREE.OctahedronGeometry(0.16),
		0xffe7a9,
		g,
		0,
		1.5,
		0,
		null,
		false,
		true,
	);
	const it = { name, index, root: g, x, z, marker, collected: false, kind };
	items.push(it);
	return it;
}
function makeGuard(nodes, index) {
	const root = new THREE.Group();
	scene.add(root);
	const kid = makeKid(0x344f5f);
	root.add(kid.root);
	kid.root.scale.setScalar(1.25);
	ball(root, 0x2b4350, 0, 2.77, 0.05, 0.44, 0.17, 0.35);
	const coneGeo = new THREE.ConeGeometry(5, 13, 24, 1, true);
	const beam = new THREE.Mesh(
		coneGeo,
		new THREE.MeshBasicNodeMaterial({
			color: 0xf9d995,
			transparent: true,
			opacity: 0.07,
			depthWrite: false,
			side: THREE.DoubleSide,
		}),
	);
	beam.rotation.x = -Math.PI / 2;
	beam.position.set(0.45, 1.6, -6.3);
	root.add(beam);
	const shape = new THREE.Shape();
	shape.moveTo(0, 0);
	shape.absarc(0, 0, 12, -Math.PI / 2 - 0.37, -Math.PI / 2 + 0.37, false);
	shape.lineTo(0, 0);
	const wedge = new THREE.Mesh(
		new THREE.ShapeGeometry(shape),
		new THREE.MeshBasicNodeMaterial({
			color: 0xf8d28a,
			transparent: true,
			opacity: 0.1,
			side: THREE.DoubleSide,
			depthWrite: false,
		}),
	);
	wedge.rotation.x = -Math.PI / 2;
	wedge.position.y = 0.025;
	root.add(wedge);
	glow(root, 0.45, 1.55, -0.35, 1.4, 0xf6df9a, 0.6);
	const guard = {
		root,
		kid,
		nodes,
		index: 0,
		x: nodes[0][0],
		z: nodes[0][1],
		angle: 0,
		stun: 0,
		distraction: null,
		beam,
		wedge,
		speed: 1.35 + index * 0.12,
	};
	root.position.set(guard.x, 0, guard.z);
	guards.push(guard);
	return guard;
}
function buildWorld() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x192f49);
	scene.fog = new THREE.Fog(0x203c4c, 55, 170);
	scene.add(new THREE.HemisphereLight(0xa7cfdf, 0x445c4c, 2.3));
	const moonLight = new THREE.DirectionalLight(0xbdd8f4, 2.6);
	moonLight.position.set(-28, 45, 15);
	moonLight.castShadow = true;
	moonLight.shadow.mapSize.set(2048, 2048);
	Object.assign(moonLight.shadow.camera, {
		left: -50,
		right: 50,
		top: 50,
		bottom: -50,
		near: 1,
		far: 130,
	});
	moonLight.shadow.bias = -0.001;
	scene.add(moonLight);
	scene.add(moonLight.target);
	const warm = new THREE.DirectionalLight(0xf7c38d, 1);
	warm.position.set(18, 12, 25);
	scene.add(warm);
	const sky = document.createElement("canvas");
	sky.width = 2048;
	sky.height = 1024;
	const ctx = sky.getContext("2d"),
		gr = ctx.createLinearGradient(0, 0, 0, 1024);
	gr.addColorStop(0, "#0c1b36");
	gr.addColorStop(0.5, "#213b59");
	gr.addColorStop(0.75, "#527276");
	gr.addColorStop(1, "#d2a28b");
	ctx.fillStyle = gr;
	ctx.fillRect(0, 0, 2048, 1024);
	for (let i = 0; i < 1100; i++) {
		const x = rng() * 2048,
			y = rng() * 650,
			r = rng() < 0.04 ? 1.8 : 0.6;
		ctx.globalAlpha = 0.25 + rng() * 0.65;
		ctx.fillStyle = "#f8f4dd";
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 6.28);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
	const skyTex = new THREE.CanvasTexture(sky);
	skyTex.mapping = THREE.EquirectangularReflectionMapping;
	skyTex.colorSpace = THREE.SRGBColorSpace;
	scene.background = new THREE.Color(0x1b324e);
	const skyMaterial = new THREE.MeshBasicNodeMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		fog: false,
	});
	skyMaterial.colorNode = mix(
		color(0x658181),
		color(0x12233f),
		smoothstep(-5, 110, positionWorld.y),
	);
	const skyDome = new THREE.Mesh(
		new THREE.SphereGeometry(260, 32, 20),
		skyMaterial,
	);
	skyDome.position.z = -60;
	scene.add(skyDome);
	const starPositions = [];
	for (let i = 0; i < 380; i++)
		starPositions.push(
			(rng() - 0.5) * 380,
			35 + rng() * 140,
			-145 - rng() * 80,
		);
	const starGeo = new THREE.BufferGeometry();
	starGeo.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(starPositions, 3),
	);
	scene.add(
		new THREE.Points(
			starGeo,
			new THREE.PointsNodeMaterial({
				color: 0xf2e8cd,
				size: 0.33,
				sizeAttenuation: true,
				fog: false,
			}),
		),
	);
	const moonCanvas = document.createElement("canvas");
	moonCanvas.width = moonCanvas.height = 512;
	const mc = moonCanvas.getContext("2d"),
		mg = mc.createRadialGradient(256, 256, 140, 256, 256, 255);
	mg.addColorStop(0, "#f4edca90");
	mg.addColorStop(1, "#d7e7da00");
	mc.fillStyle = mg;
	mc.fillRect(0, 0, 512, 512);
	mc.fillStyle = "#f3edcc";
	mc.beginPath();
	mc.arc(256, 256, 159, 0, 6.28);
	mc.fill();
	mc.strokeStyle = "#7798a365";
	mc.lineWidth = 2;
	mc.stroke();
	for (let i = 0; i < 70; i++) {
		const x = 256 + (rng() - 0.5) * 270,
			y = 256 + (rng() - 0.5) * 270;
		if (Math.hypot(x - 256, y - 256) > 143) continue;
		mc.fillStyle = i % 2 ? "#a2b6ad38" : "#bdc5b43a";
		mc.beginPath();
		mc.ellipse(x, y, 5 + rng() * 26, 4 + rng() * 14, rng() * 3, 0, 6.28);
		mc.fill();
	}
	skyMoon = new THREE.Sprite(
		new THREE.SpriteNodeMaterial({
			map: new THREE.CanvasTexture(moonCanvas),
			transparent: true,
			depthWrite: false,
			fog: false,
		}),
	);
	skyMoon.position.set(-29, 27, -90);
	skyMoon.scale.set(29, 29, 1);
	scene.add(skyMoon);
	box(scene, 0x365b56, 0, -0.36, -66, 150, 0.7, 240, false);
	fixed(0, -0.5, -66, 150, 1, 240);
	// The road is a continuous ribbon, bordered by hand-drawn verge lines.
	const verts = [],
		uv = [],
		idx = [];
	for (let i = 0; i <= 160; i++) {
		const z = 25 - i * 1.05,
			c = roadX(z),
			w = z > -48 ? 5.8 : 4.5;
		verts.push(c - w, 0.012, z, c + w, 0.012, z);
		uv.push(0, i, 1, i);
		if (i < 160) {
			const k = i * 2;
			idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
		}
	}
	const roadGeo = new THREE.BufferGeometry();
	roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
	roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	roadGeo.setIndex(idx);
	roadGeo.computeVertexNormals();
	const road = new THREE.Mesh(roadGeo, material(0x3d5360));
	road.receiveShadow = true;
	scene.add(road);
	for (const s of [-1, 1])
		line(
			scene,
			Array.from({ length: 161 }, (_, i) => {
				const z = 25 - i * 1.05;
				return [roadX(z) + s * (z > -48 ? 5.9 : 4.6), 0.03, z];
			}),
			0x78928c,
			0.75,
		);
	for (let i = 0; i < 35; i++) {
		const z = 21 - i * 4.6;
		box(scene, 0xa6aa91, roadX(z), 0.029, z, 0.12, 0.015, 1.3, false);
	}
	const pathGeo = new THREE.CircleGeometry(8, 32);
	const circle = new THREE.Mesh(pathGeo, material(0x6d7766));
	circle.rotation.x = -Math.PI / 2;
	circle.position.set(0, 0.018, -41);
	circle.receiveShadow = true;
	scene.add(circle);
	house(-27, -3, 0x859b94, 14);
	house(27, 10, 0x78918f, 11);
	house(-27, -25, 0x657e85, 16);
	house(29, -39, 0x8c8e7f, 18);
	house(-28, 20, 0x698d87, 12);
	fence(-19, 11, 14, true);
	fence(22, 21, 12, true);
	fence(-35, -12, 12, false);
	fence(34, -20, 12, false);
	hedge(-14, 4, 6, 1.7);
	hedge(14, -7, 5, 2);
	hedge(-9, -24, 6, 1.6);
	hedge(10, -32, 5, 1.7);
	const shed = new THREE.Group();
	shed.position.set(17, 0, 3);
	scene.add(shed);
	box(shed, 0x6e7a65, 0, 1.6, 0, 4, 3.2, 3.7);
	const sr = mesh(geos.cone, 0x525c63, shed, 0, 3.6, 0, [3.3, 1.4, 2.8]);
	sr.rotation.y = Math.PI / 4;
	box(shed, 0x223d3c, -2.05, 1.3, 0.2, 0.08, 2.6, 1.7);
	fixed(17, 1.5, 3, 4, 3, 3.7);
	for (let k = 0; k < 6; k++)
		line(
			shed,
			[
				[-2.03, 0.2, -1.4 + k * 0.5],
				[-2.03, 2.8, -1.4 + k * 0.5],
			],
			0x344e45,
			0.7,
		);
	for (let i = 0; i < 155; i++) {
		const side = i % 2 ? 1 : -1,
			z = 25 - rng() * 205,
			x = side * (36 + rng() * 30);
		addTree(x, z, 0.8 + rng() * 1.4, i % 4 === 0);
	}
	for (const [x, z, s] of [
		[-12, 17, 1.4],
		[19, 17, 1.2],
		[10, -9, 1.1],
		[-13, -10, 1.4],
		[32, -12, 1.3],
		[13, -35, 1.3],
		[-14, -36, 1.2],
		[-11, -50, 1.3],
		[12, -55, 1.5],
		[-10, -65, 1.2],
		[14, -72, 1.6],
		[-11, -88, 1.5],
		[12, -96, 1.6],
		[-16, -110, 1.6],
		[13, -131, 1.5],
		[-15, -143, 1.5],
		[17, -164, 1.5],
		[-14, -165, 1.8],
	])
		addTree(x, z, s);
	for (let i = 0; i < 130; i++) {
		const x = (rng() - 0.5) * 90,
			z = 25 - rng() * 194;
		if (Math.abs(x - roadX(z)) < 7 || Math.abs(x) > 40) continue;
		fern(x, z, 0.5 + rng() * 0.7);
	}
	for (let i = 0; i < 60; i++) {
		const x = (rng() - 0.5) * 65,
			z = 20 - rng() * 170;
		if (Math.abs(x - roadX(z)) < 6) continue;
		mesh(
			geos.lowBall,
			0x688880,
			scene,
			x,
			0.15,
			z,
			[0.3 + rng() * 0.5, 0.2, 0.4],
			true,
		);
	}
	// Van, search equipment, mailboxes and a quiet little neighborhood.
	for (const [x, z, c] of [
		[-8, -13, 0x7d8d88],
		[10, -28, 0x4d6775],
		[8, -69, 0x617989],
	]) {
		const van = new THREE.Group();
		van.position.set(x, 0, z);
		scene.add(van);
		box(van, c, 0, 1.1, 0, 2.6, 1.5, 4.8);
		box(van, c, 0, 2.2, -0.5, 2.5, 1.2, 3.1);
		box(van, 0x1b3949, 0, 2.2, -2.08, 2.2, 0.75, 0.06);
		for (const sx of [-1.25, 1.25])
			for (const sz of [-1.4, 1.5]) {
				const w = cylinder(van, 0x182b36, sx, 0.58, sz, 0.47, 0.22);
				w.rotation.z = Math.PI / 2;
			}
		box(van, 0xe5d49d, 0, 1.03, -2.45, 2, 0.24, 0.1);
		fixed(x, 1.3, z, 2.6, 2.6, 4.8);
	}
	for (const x of [-20, 20]) {
		cylinder(scene, 0x62786b, x, 0.9, 13, 0.08, 1.8);
		box(scene, 0x819d8b, x, 1.8, 13, 0.7, 0.6, 0.9);
	}
	flowers.length = 0;
	makeFlower(20, -15, true);
	makeFlower(-20, 7);
	makeFlower(16, -32);
	makeFlower(-11, -47);
	gate = new THREE.Group();
	gate.position.set(20, 0, -19);
	scene.add(gate);
	box(gate, 0x85947a, 0, 1, 0, 7, 2, 0.22);
	for (let i = -3; i <= 3; i++)
		line(
			gate,
			[
				[i, 0, 0.13],
				[i, 2, 0.13],
			],
			0x324d45,
		);
	gate.userData.collider = fixed(20, 1, -19, 7, 2, 0.3);
	hedge(14.9, -20, 3, 2);
	hedge(26, -20, 3, 2);
	makeItem("The talking toy", 0, -23, 4, "toy");
	makeItem("A very good battery", 1, -18, -19, "battery");
	makeItem("The upside-down umbrella", 2, 22, -24, "umbrella");
	const crateMesh = box(scene, 0x9d8660, -18, 0.85, -19, 1.7, 1.7, 1.7);
	for (const s of [-1, 1])
		line(
			crateMesh,
			[
				[s * 0.45, -0.5, -0.51],
				[s * 0.45, 0.5, -0.51],
			],
			0x5b5743,
		);
	const cb = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic().setTranslation(-18, 0.87, -19),
	);
	world.createCollider(
		RAPIER.ColliderDesc.cuboid(0.85, 0.85, 0.85).setDensity(0.8),
		cb,
	);
	crate = { root: crateMesh, body: cb };
	dynamicBodies.push(crate);
	transmitter = new THREE.Group();
	transmitter.position.set(0, 0, -41);
	scene.add(transmitter);
	const stump = cylinder(transmitter, 0x7e7960, 0, 0.5, 0, 1.2, 1);
	cylinder(transmitter, 0xc0ad7f, 0, 1.02, 0, 1.18, 0.05);
	box(transmitter, 0x854e43, -0.4, 1.3, 0, 0.7, 0.5, 0.5);
	cylinder(transmitter, 0x91a997, 0.35, 1.3, 0, 0.2, 0.6);
	const dish = mesh(
		new THREE.SphereGeometry(1.5, 16, 8, 0, 6.28, 0, Math.PI / 2),
		0xcfb3ba,
		transmitter,
		0,
		1.5,
		0.4,
		[1, 0.55, 1],
	);
	dish.rotation.x = Math.PI;
	line(
		transmitter,
		[
			[0, 1.2, 0],
			[0, 3.4, 0],
		],
		0xc0bba0,
	);
	for (let i = 0; i < 3; i++)
		ball(
			transmitter,
			[0xeebf76, 0x83d3cb, 0xb5a8e0][i],
			-0.5 + i * 0.5,
			1.65,
			-0.5,
			0.13,
			0.13,
			0.13,
			false,
			true,
		);
	transmitter.userData.dish = dish;
	transmitter.visible = false;
	for (let i = 0; i < 25; i++) {
		const z = 11 - i * 2.4,
			x = roadX(z) + (i % 2 ? 1.7 : -1.4),
			g = mesh(
				geos.lowBall,
				[0xe1b35f, 0xb5785c, 0xd6c07a][i % 3],
				scene,
				x,
				0.16,
				z,
				[0.12, 0.1, 0.12],
				false,
			);
		candies.push({ x, z, root: g, taken: false });
	}
	makeGuard(
		[
			[-5, -7],
			[-5, -24],
			[6, -24],
			[6, -7],
		],
		0,
	);
	makeGuard(
		[
			[15, -12],
			[28, -12],
			[28, -29],
			[16, -29],
		],
		1,
	);
	makeGuard(
		[
			[-24, -11],
			[-12, -11],
			[-12, -23],
			[-24, -23],
		],
		2,
	);
	makeGuard(
		[
			[-4, -50],
			[5, -64],
			[-4, -77],
			[-5, -58],
		],
		3,
	);
	// Roadblock: the flight is earned, then the whole visual language opens up.
	const barricade = new THREE.Group();
	barricade.position.set(roadX(-84), 0, -84);
	scene.add(barricade);
	for (let j = -1; j <= 1; j++) {
		box(barricade, 0xd9b68b, j * 3, 1.1, 0, 2.7, 0.55, 0.22);
		for (let k = -1; k <= 1; k++) {
			const b = box(
				barricade,
				0x85594f,
				j * 3 + k * 0.8,
				1.1,
				-0.13,
				0.35,
				0.56,
				0.025,
				false,
			);
			b.rotation.z = -0.5;
		}
		for (const s of [-1, 1])
			box(barricade, 0x72857a, j * 3 + s * 0.9, 0.5, 0, 0.17, 1.1, 0.6);
		glow(barricade, j * 3, 1.6, 0, 1.8, 0xfbad78, 0.5);
	}
	fixed(roadX(-84), 1, -84, 10, 2, 0.6);
	for (const [x, y, z] of [
		[0, 9, -96],
		[5, 12, -110],
		[-4, 15, -124],
		[0, 11, -138],
	]) {
		const root = new THREE.Group();
		root.position.set(x, y, z);
		scene.add(root);
		const hoop = new THREE.Mesh(
			new THREE.TorusGeometry(2, 0.055, 8, 48),
			material(0xf9dca4, true),
		);
		root.add(hoop);
		glow(root, 0, 0, 0, 5, 0xf1d391, 0.18);
		for (let j = 0; j < 8; j++) {
			const a = (j * Math.PI) / 4;
			ball(
				root,
				0xffedb9,
				Math.cos(a) * 2,
				Math.sin(a) * 2,
				0,
				0.11,
				0.11,
				0.11,
				false,
				true,
			);
		}
		rings.push({ root, x, y, z, taken: false });
	}
	ship = new THREE.Group();
	ship.position.set(0, 0, -165);
	scene.add(ship);
	ball(ship, 0x7a99a1, 0, 5, 0, 6, 2.4, 6);
	ball(ship, 0x4c7482, 0, 6.1, 0, 4.3, 2.5, 4.3);
	cylinder(ship, 0xd5c5a4, 0, 3.65, 0, 5.2, 0.35);
	for (let j = 0; j < 14; j++) {
		const a = (j * Math.PI) / 7;
		ball(
			ship,
			0xf5d28d,
			Math.cos(a) * 5.7,
			4.75,
			Math.sin(a) * 5.7,
			0.17,
			0.2,
			0.17,
			false,
			true,
		);
	}
	const doorway = box(ship, 0xffe6b0, 0, 4.8, 5.46, 1.9, 2.9, 0.08, false);
	box(ship, 0xf8d9a1, 0, 1.6, 7, 2, 0.16, 5.4);
	ship.children.at(-1).rotation.x = 0.55;
	glow(ship, 0, 4.8, 5.8, 9, 0xf9dfa1, 0.7);
	const landing = new THREE.Mesh(
		new THREE.CircleGeometry(9, 48),
		new THREE.MeshBasicNodeMaterial({
			color: 0xeacb86,
			transparent: true,
			opacity: 0.16,
			depthWrite: false,
		}),
	);
	landing.rotation.x = -Math.PI / 2;
	landing.position.set(0, 0.04, 4);
	ship.add(landing);
	player = makeKid();
	scene.add(player.root);
	player.root.position.set(5, 0, 14);
	friend = makeAlien();
	scene.add(friend.root);
	friend.root.position.set(13, 0, 2);
	friend.root.rotation.y = -0.5;
	bike = makeBike();
	scene.add(bike);
	bike.position.set(4, 0, -45);
	titleBike = makeBike();
	scene.add(titleBike);
	titleBike.position.set(8, 0, 9);
	titleBike.rotation.y = -0.6;
	playerHalo = glow(scene, 5, 0.08, 14, 3, 0x87ddcf, 0.13);
	friendHalo = glow(scene, 13, 0.2, 2, 3, 0xffd296, 0.15);
	const shadowMat = new THREE.MeshBasicNodeMaterial({
		color: 0x0a252a,
		transparent: true,
		opacity: 0.35,
		depthWrite: false,
	});
	shadowPlayer = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), shadowMat);
	shadowPlayer.rotation.x = -Math.PI / 2;
	shadowPlayer.position.y = 0.035;
	scene.add(shadowPlayer);
	for (let i = 0; i < 70; i++) {
		const root = ball(
			scene,
			0xf8dfa1,
			0,
			0,
			0,
			0.035,
			0.035,
			0.035,
			false,
			true,
		);
		particles.push({
			root,
			x: (rng() - 0.5) * 70,
			z: 20 - rng() * 190,
			y: 0.7 + rng() * 4,
			t: rng() * 6.28,
		});
	}
	body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(5, 0.85, 14),
	);
	collider = world.createCollider(
		RAPIER.ColliderDesc.capsule(0.48, 0.32),
		body,
	);
	controller = world.createCharacterController(0.025);
	controller.enableAutostep(0.3, 0.25, true);
	controller.enableSnapToGround(0.5);
	debugLines = new THREE.LineSegments(
		new THREE.BufferGeometry(),
		new THREE.LineBasicNodeMaterial({ vertexColors: true }),
	);
	debugLines.visible = false;
	scene.add(debugLines);
	world.step();
}
function roadX(z) {
	return z > -45 ? Math.sin(z * 0.045) * 1.4 : Math.sin((z + 45) * 0.085) * 3;
}

function say(who, text, duration = 5) {
	$("#dialogue").replaceChildren();
	const small = document.createElement("small");
	small.textContent = who;
	$("#dialogue").append(small, document.createTextNode(text));
	$("#dialogue").classList.remove("hidden");
	timers.dialogue = duration;
	audio.voice(
		who === "A SMALL FRIEND",
		Math.min(7, Math.ceil(text.length / 9)),
	);
}
function toast(text, duration = 3) {
	$("#toast").textContent = text;
	$("#toast").classList.remove("hidden");
	timers.toast = duration;
}
function splash(kicker, title, subtitle) {
	$("#splashKicker").textContent = kicker;
	$("#splashTitle").textContent = title;
	$("#splashSubtitle").textContent = subtitle;
	$("#chapterSplash").classList.remove("hidden");
	$("#chapterSplash").style.opacity = 1;
	timers.splash = 4;
}
function putPlayer(x, z, y = 0.85) {
	body.setTranslation({ x, y, z }, true);
	body.setNextKinematicTranslation({ x, y, z });
	player.root.position.set(x, y - 0.85, z);
	input.click = null;
}
function resetWorld() {
	state = {
		screen: "play",
		phase: "friend",
		parts: [false, false, false],
		bond: 100,
		alert: 0,
		candy: 8,
		healed: 0,
		rings: 0,
		catches: 0,
		time: 0,
		won: false,
		crateMoved: false,
		gateOpen: false,
		friend: false,
		signal: false,
		attract: false,
		auto: false,
		tuneRound: 0,
		tuneIndex: 0,
		tunePlaying: false,
		mounted: false,
		checkpoint: { x: 5, z: 14 },
		elapsed: 0,
	};
	Object.keys(timers).forEach((k) => {
		timers[k] = 0;
	});
	input.keys.clear();
	input.x = input.y = 0;
	input.lift = false;
	input.touch = null;
	input.actions = [];
	input.click = null;
	autoStep = 0;
	autoWait = 0;
	cameraYaw = 0;
	cameraPitch = 0.76;
	putPlayer(5, 14);
	friend.root.position.set(13, 0, 2);
	friend.root.scale.setScalar(1);
	friend.root.visible = true;
	friend.rig.rotation.x = 0;
	friend.wave.stop();
	bike.position.set(4, 0, -45);
	bike.rotation.set(0, 0, 0);
	titleBike.visible = false;
	ship.position.y = 0;
	transmitter.visible = false;
	crate.body.setTranslation({ x: -18, y: 0.88, z: -19 }, true);
	crate.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
	crate.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
	crate.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
	gate.rotation.z = 0;
	gate.userData.collider.setEnabled(true);
	for (const f of flowers) {
		f.healed = false;
		f.plant.scale.y = 0.42;
		f.plant.rotation.z = 0.35;
	}
	for (const i of items) {
		i.collected = false;
		i.root.visible = true;
	}
	for (const c of candies) {
		c.taken = false;
		c.root.visible = true;
	}
	for (const r of rings) {
		r.taken = false;
		r.root.visible = true;
	}
	for (const g of guards) {
		g.index = 0;
		g.x = g.nodes[0][0];
		g.z = g.nodes[0][1];
		g.stun = 0;
		g.distraction = null;
		g.root.position.set(g.x, 0, g.z);
	}
	$("#tuneOverlay").classList.add("hidden");
	$("#dialogue").classList.add("hidden");
	$("#chapterSplash").classList.add("hidden");
	$("#menuLayer").classList.add("hidden");
	$("#mapOverlay").classList.add("hidden");
	menu = "none";
}
function startGame(attract = false) {
	resetWorld();
	state.attract = attract;
	state.auto = attract;
	$("#title").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	$("#attractBanner").classList.toggle("hidden", !attract);
	splash(
		"CHAPTER ONE",
		"Something in the shed.",
		"A strange little noise. And then another.",
	);
	say("ELLIOTT", "It’s okay. I brought something sweet.", 5);
	audio.mute(false);
	updateHUD();
}
function showTitle() {
	if (AIHub.active) return;
	state.screen = "title";
	state.attract = false;
	state.auto = false;
	input.last = performance.now();
	$("#title").classList.remove("hidden");
	$("#hud").classList.add("hidden");
	$("#menuLayer").classList.add("hidden");
	$("#tuneOverlay").classList.add("hidden");
	$("#attractBanner").classList.add("hidden");
	$("#chapterSplash").classList.add("hidden");
	$("#mapOverlay").classList.add("hidden");
	menu = "none";
	titleBike.visible = true;
	player.root.position.set(6.3, 0, 8.5);
	player.root.rotation.y = -2.6;
	friend.root.position.set(8.2, 0, 7);
	friend.root.rotation.y = -2.6;
	friend.root.visible = true;
	friend.root.scale.setScalar(1);
	player.walk.paused = true;
	friend.wave.stop();
	focusFirst();
}
function setPhase(phase) {
	state.phase = phase;
	autoStep = 0;
	autoWait = 0;
	input.click = null;
	updateHUD();
}
function nearestContext() {
	const p = body.translation(),
		d = (l) => Math.hypot(p.x - l.x, p.z - l.z);
	if (state.phase === "friend" && d(locations.friend) < 3.4)
		return {
			type: "friend",
			text: "Offer a little candy",
			point: locations.friend,
		};
	if (state.phase === "parts") {
		for (const it of items)
			if (!it.collected && d(it) < 2.7) {
				if (it.index === 1 && !state.crateMoved)
					return { type: "power", text: "Ask for a little lift", point: it };
				if (it.index === 2 && !state.gateOpen) return null;
				return {
					type: "item",
					item: it,
					text:
						"Take " +
						["the talking toy", "the battery", "the umbrella"][it.index],
					point: it,
				};
			}
		if (!state.gateOpen && d(locations.flower) < 3.6)
			return {
				type: "power",
				text: "Help the thirsty flowers",
				point: locations.flower,
			};
		if (state.parts.every(Boolean) && d(locations.signal) < 3.5)
			return {
				type: "signal",
				text: "Build a way home",
				point: locations.signal,
			};
	}
	if (state.phase === "signal" && d(locations.signal) < 3.5)
		return { type: "signal", text: "Listen for home", point: locations.signal };
	if (state.phase === "ride" && !state.mounted && d(locations.bike) < 3.5)
		return {
			type: "bike",
			text: "Let’s take the bicycle",
			point: locations.bike,
		};
	if (state.phase === "ride" && state.mounted && p.z < -69)
		return {
			type: "power",
			text: "What if we could fly?",
			point: locations.barrier,
		};
	if (state.phase === "farewell" && d(locations.home) < 5.5)
		return {
			type: "farewell",
			text: "Say see you later",
			point: locations.home,
		};
	for (const f of flowers)
		if (!f.healed && state.friend && d(f) < 3.2)
			return { type: "power", text: "Bring a flower back", point: f };
	return null;
}
function interact() {
	if (state.screen === "tune") return;
	if (state.screen !== "play") return;
	const c = nearestContext();
	if (!c) {
		if (
			state.phase === "parts" &&
			Math.hypot(body.translation().x, body.translation().z + 41) < 4
		)
			toast("Three little things first. A toy, a battery, an umbrella.");
		return;
	}
	audio.sfx("click");
	if (c.type === "friend") {
		state.friend = true;
		setPhase("parts");
		friend.wave.reset().play();
		state.checkpoint = { x: 7, z: 5 };
		splash(
			"CHAPTER TWO",
			"A telephone made of little things.",
			"Find a talking toy, a battery, and an umbrella.",
		);
		say("ELLIOTT", "Home? Okay. We’ll make you a telephone.", 6);
		audio.sfx("pickup");
	} else if (c.type === "power") pulse();
	else if (c.type === "item") {
		const it = c.item;
		it.collected = true;
		it.root.visible = false;
		state.parts[it.index] = true;
		state.bond = clamp(state.bond + 15, 0, 100);
		audio.sfx("pickup");
		burst(it.x, 1, it.z, 0xf9d292);
		toast(it.name + " — that’ll do nicely.");
		if (state.parts.every(Boolean)) {
			setPhase("signal");
			say("ELLIOTT", "That’s everything. The clearing. Come on.", 5);
			transmitter.visible = true;
		}
	} else if (c.type === "signal") {
		if (!state.parts.every(Boolean)) return;
		transmitter.visible = true;
		startTune();
	} else if (c.type === "bike") {
		state.mounted = true;
		state.checkpoint = { x: 4, z: -45 };
		putPlayer(4, -45);
		friend.root.scale.setScalar(0.62);
		audio.sfx("lift");
		say("ELLIOTT", "Hold on. I know a shortcut.", 4);
		splash(
			"CHAPTER THREE",
			"Past the bedtime. Past the lights.",
			"Pedal for the forest. Keep a little light for the roadblock.",
		);
	} else if (c.type === "farewell") {
		state.won = true;
		setPhase("ending");
		state.endingTime = 0;
		friend.wave.reset().play();
		say("A SMALL FRIEND", "Home is a long way. Friends are closer.", 6);
		audio.sfx("win");
		finishNetwork();
	}
}
function pulse() {
	if (state.screen !== "play" || !state.friend) return;
	if (timers.pulse > 0) return;
	if (state.bond < 22) {
		toast("A little rest. The heartlight will come back.");
		return;
	}
	if (state.phase === "ride" && state.mounted && body.translation().z < -69) {
		state.bond -= 22;
		cameraYaw = 0;
		setPhase("flight");
		putPlayer(body.translation().x, body.translation().z, 5);
		state.checkpoint = { x: 0, z: -78 };
		audio.sfx("lift");
		say("ELLIOTT", "Oh. That’s a better shortcut.", 5);
		splash(
			"SOMEWHERE ABOVE THE STREET",
			"There is more than one way home.",
			"Steer through the stars. Hold your glow to rise.",
		);
		return;
	}
	state.bond -= 22;
	timers.pulse = 1.5;
	friend.wave.reset().play();
	audio.sfx("pulse");
	const p = body.translation();
	burst(p.x, 1.2, p.z, 0xf8d18c, 28);
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.5, 0.035, 6, 48),
		new THREE.MeshBasicNodeMaterial({
			color: 0xc7f2c9,
			transparent: true,
			opacity: 0.8,
			depthWrite: false,
		}),
	);
	ring.rotation.x = -Math.PI / 2;
	ring.position.set(p.x, 0.2, p.z);
	scene.add(ring);
	effects.push({ root: ring, age: 0, life: 1, type: "pulse" });
	for (const f of flowers)
		if (!f.healed && Math.hypot(p.x - f.x, p.z - f.z) < 5.8) {
			f.healed = true;
			state.healed++;
			f.glow.material.opacity = 0.65;
			state.bond = clamp(state.bond + 13, 0, 100);
			audio.sfx("pickup");
			burst(f.x, 1, f.z, 0xc6eabe);
			if (f.required) {
				state.gateOpen = true;
				gate.userData.collider.setEnabled(false);
				say("ELLIOTT", "You fixed them. They’re making room for us.", 5);
			} else toast("A little thing, alive again.");
		}
	if (!state.crateMoved && Math.hypot(p.x + 18, p.z + 19) < 5.5) {
		state.crateMoved = true;
		crate.body.applyImpulse({ x: -13, y: 18, z: 2 }, true);
		toast("A little help goes a long way.");
	}
	for (const g of guards)
		if (Math.hypot(p.x - g.x, p.z - g.z) < 8) {
			g.stun = 5;
			burst(g.x, 2, g.z, 0xa9e2db);
		}
	state.alert = Math.max(0, state.alert - 30);
}
function throwCandy() {
	if (state.screen !== "play" || !state.friend || timers.candy > 0) return;
	if (state.candy < 1) {
		toast("Look for candy along the road.");
		return;
	}
	state.candy--;
	timers.candy = 1.8;
	const p = body.translation(),
		angle = player.root.rotation.y,
		x = p.x - Math.sin(angle) * 5,
		z = p.z - Math.cos(angle) * 5;
	const root = mesh(
		geos.lowBall,
		0xf2c271,
		scene,
		p.x,
		1.2,
		p.z,
		[0.16, 0.14, 0.16],
		false,
	);
	effects.push({
		root,
		age: 0,
		life: 7,
		type: "candy",
		from: new THREE.Vector3(p.x, 1.2, p.z),
		to: new THREE.Vector3(x, 0.2, z),
	});
	for (const g of guards)
		if (Math.hypot(g.x - x, g.z - z) < 22) g.distraction = { x, z, time: 7 };
	audio.sfx("candy");
	toast("A tiny noise. Somewhere else.", 2);
}
const effects = [];
function burst(x, y, z, c, count = 16) {
	for (let i = 0; i < count; i++) {
		const root = mesh(
				geos.lowBall,
				c,
				scene,
				x,
				y,
				z,
				[0.065, 0.065, 0.065],
				false,
				true,
			),
			a = rng() * 6.28;
		effects.push({
			root,
			age: 0,
			life: 0.7 + rng() * 0.6,
			type: "spark",
			v: new THREE.Vector3(
				Math.cos(a) * (1 + rng() * 2),
				1 + rng() * 3,
				Math.sin(a) * (1 + rng() * 2),
			),
		});
	}
}
function updateEffects(dt) {
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.age += dt;
		if (e.age >= e.life) {
			scene.remove(e.root);
			if (e.type === "pulse") {
				e.root.geometry.dispose();
				e.root.material.dispose();
			}
			effects.splice(i, 1);
			continue;
		}
		if (e.type === "spark") {
			e.v.y -= dt * 5;
			e.root.position.addScaledVector(e.v, dt);
			e.root.scale.setScalar(Math.max(0.005, 0.065 * (1 - e.age / e.life)));
		} else if (e.type === "pulse") {
			e.root.scale.setScalar(1 + e.age * 15);
			e.root.material.opacity = 1 - e.age;
		} else if (e.type === "candy") {
			const t = Math.min(1, e.age / 0.5);
			e.root.position.lerpVectors(e.from, e.to, t);
			e.root.position.y += Math.sin(t * Math.PI) * 2;
		}
	}
}
const tunePatterns = [
	[0, 2, 1],
	[0, 2, 1, 2, 0],
];
function startTune() {
	state.screen = "tune";
	state.tuneRound = 0;
	state.tuneIndex = 0;
	$("#tuneOverlay").classList.remove("hidden");
	playPattern();
	focusFirst();
}
function playPattern() {
	state.tunePlaying = true;
	state.tuneIndex = 0;
	state.tuneClock = 0;
	state.lastTuneNote = -1;
	$("#tuneInstruction").textContent =
		state.tuneRound === 0
			? "Three little lights. Listen, then play them back."
			: "Someone heard! One longer hello.";
	$("#tuneProgress").textContent = tunePatterns[state.tuneRound]
		.map(() => "○")
		.join(" ");
	$("#replayTune").disabled = true;
}
function submitNote(n) {
	if (state.screen !== "tune" || state.tunePlaying) return;
	audio.note(n);
	flashNote(n);
	const pattern = tunePatterns[state.tuneRound];
	if (n !== pattern[state.tuneIndex]) {
		audio.sfx("wrong");
		$("#tuneInstruction").textContent =
			"Almost. No hurry. Let’s listen once more.";
		state.tuneIndex = 0;
		state.tuneRetry = 0.8;
		state.tunePlaying = true;
		state.tuneClock = -1;
		return;
	}
	state.tuneIndex++;
	$("#tuneProgress").textContent = pattern
		.map((_, i) => (i < state.tuneIndex ? "●" : "○"))
		.join(" ");
	if (state.tuneIndex === pattern.length) {
		if (state.tuneRound === 0) {
			state.tuneRound = 1;
			state.tuneNext = 0.8;
			state.tunePlaying = true;
		} else {
			state.screen = "play";
			state.signal = true;
			$("#tuneOverlay").classList.add("hidden");
			setPhase("ride");
			state.checkpoint = { x: 0, z: -40 };
			say("A SMALL FRIEND", "They heard. They’re coming.", 5);
			audio.sfx("pickup");
		}
	}
}
function flashNote(n) {
	$$("#tuneNotes button").forEach((b, i) => {
		b.classList.toggle("flash", i === n);
	});
	state.noteFlash = 0.35;
}
function updateTune(dt) {
	if (state.noteFlash > 0) {
		state.noteFlash -= dt;
		if (state.noteFlash <= 0)
			$$("#tuneNotes button").forEach((b) => {
				b.classList.remove("flash");
			});
	}
	if (state.tuneNext > 0) {
		state.tuneNext -= dt;
		if (state.tuneNext <= 0) playPattern();
		return;
	}
	if (state.tuneRetry > 0) {
		state.tuneRetry -= dt;
		if (state.tuneRetry <= 0) playPattern();
		return;
	}
	if (!state.tunePlaying) return;
	state.tuneClock += dt;
	const k = Math.floor((state.tuneClock - 0.4) / 0.65),
		pattern = tunePatterns[state.tuneRound];
	if (k >= 0 && k < pattern.length && k !== state.lastTuneNote) {
		state.lastTuneNote = k;
		flashNote(pattern[k]);
		audio.note(pattern[k]);
	}
	if (state.tuneClock > 0.6 + pattern.length * 0.65) {
		state.tunePlaying = false;
		$("#replayTune").disabled = false;
		$("#tuneInstruction").textContent =
			"Your turn. A little hello, all the way to the stars.";
	}
}
function catchPlayer() {
	if (tuning.invincible || state.attract || state.auto) {
		state.alert = 0;
		return;
	}
	state.catches++;
	state.alert = 0;
	state.bond = Math.max(30, state.bond - 20);
	audio.sfx("caught");
	putPlayer(state.checkpoint.x, state.checkpoint.z);
	friend.root.position.set(state.checkpoint.x + 1, 0, state.checkpoint.z + 1);
	guards.forEach((g) => {
		g.stun = 3;
	});
	say("ELLIOTT", "Shh. This way. We can try again.", 5);
	toast("Back in the shadows. Nothing lost.", 3);
}
function occluded(g, p) {
	for (const c of colliders) {
		if (!c.isEnabled()) continue;
		const t = c.translation(),
			s = c.halfExtents?.();
		if (!s || s.y < 0.7 || s.x > 70) continue;
		const dx = p.x - g.x,
			dz = p.z - g.z;
		let near = 0,
			far = 1;
		for (const [a, v, min, max] of [
			[g.x, dx, t.x - s.x, t.x + s.x],
			[g.z, dz, t.z - s.z, t.z + s.z],
		]) {
			if (Math.abs(v) < 0.0001) {
				if (a < min || a > max) {
					near = 2;
					break;
				}
			} else {
				const t1 = (min - a) / v,
					t2 = (max - a) / v;
				near = Math.max(near, Math.min(t1, t2));
				far = Math.min(far, Math.max(t1, t2));
			}
		}
		if (near <= far && near < 0.95 && far > 0.05) return true;
	}
	return false;
}
function updateGuards(dt) {
	const p = body.translation();
	let seen = false;
	const hiding = worldObjects.some(
		(o) => o.type === "cover" && Math.hypot(p.x - o.x, p.z - o.z) < o.r + 1.2,
	);
	state.hiding = hiding;
	for (const g of guards) {
		g.stun = Math.max(0, g.stun - dt);
		if (g.distraction) {
			g.distraction.time -= dt;
			if (g.distraction.time <= 0) g.distraction = null;
		}
		const goal = g.distraction || {
				x: g.nodes[g.index][0],
				z: g.nodes[g.index][1],
			},
			dx = goal.x - g.x,
			dz = goal.z - g.z,
			d = Math.hypot(dx, dz);
		if (!g.stun && !tuning.freeze) {
			if (d < 0.5) {
				if (!g.distraction) g.index = (g.index + 1) % g.nodes.length;
			} else {
				const v = Math.min(d, g.speed * dt);
				g.x += (dx / d) * v;
				g.z += (dz / d) * v;
				g.angle = Math.atan2(-dx, -dz);
			}
		}
		g.root.position.set(g.x, 0, g.z);
		g.root.rotation.y = g.angle;
		g.kid.walk.paused = g.stun > 0 || tuning.freeze;
		g.beam.visible = g.stun <= 0;
		g.wedge.visible = g.stun <= 0;
		const pd = Math.hypot(p.x - g.x, p.z - g.z),
			facing =
				(-Math.sin(g.angle) * (p.x - g.x) - Math.cos(g.angle) * (p.z - g.z)) /
				(pd || 1),
			radius =
				(input.sneak || input.type === "touch" ? 8 : 12) * (hiding ? 0.55 : 1);
		if (
			!g.stun &&
			!g.distraction &&
			pd < radius &&
			facing > 0.9 &&
			p.y < 3 &&
			state.phase !== "friend" &&
			!occluded(g, p)
		)
			seen = true;
	}
	if (
		state.phase === "flight" ||
		state.phase === "farewell" ||
		state.phase === "ending"
	)
		seen = false;
	state.alert = clamp(
		state.alert + dt * (seen ? tuning.alertRate : -19),
		0,
		100,
	);
	state.seen = seen;
	if (state.alert >= 100) catchPlayer();
}
let autoStep = 0,
	autoWait = 0;
const autoRoutes = {
	friend: [
		[8, 8],
		[10, 3],
		[13, 2],
	],
	toy: [
		[7, 8],
		[-7, 8],
		[-19, 7],
		[-23, 4],
	],
	battery: [
		[-19, -7],
		[-18, -13],
		[-18, -16.6],
	],
	umbrella: [
		[-18, -7],
		[-10, -7],
		[3, -7],
		[8, -13],
		[20, -15],
		[21, -17],
		[22, -23],
	],
	signal: [
		[20, -29],
		[17, -32],
		[17, -38],
		[6, -38],
		[0, -39],
	],
	bike: [[4, -45]],
	ride: [
		[roadX(-55), -55],
		[roadX(-66), -66],
		[roadX(-76), -76],
	],
	farewell: [[0, -159.5]],
};
let autoRouteName = "";
function autopilot(dt) {
	if (!state.auto) return null;
	autoWait = Math.max(0, autoWait - dt);
	if (state.screen === "tune") {
		if (!state.tunePlaying && autoWait <= 0) {
			submitNote(tunePatterns[state.tuneRound][state.tuneIndex]);
			autoWait = 0.45;
		}
		return { x: 0, y: 0 };
	}
	if (state.phase === "ending") return { x: 0, y: 0 };
	if (state.phase === "flight") {
		const p = body.translation(),
			r = rings.find((q) => !q.taken && q.z < p.z + 3) || {
				x: 0,
				y: 10,
				z: -145,
			};
		return {
			x: clamp((r.x - p.x) * 0.9, -1, 1),
			y: clamp((p.y - r.y) * 0.8, -1, 1),
			flight: true,
		};
	}
	let name = state.phase;
	if (name === "parts") {
		if (!state.parts[0]) name = "toy";
		else if (!state.parts[1]) name = "battery";
		else name = "umbrella";
	}
	if (name === "ride" && !state.mounted) name = "bike";
	if (autoRouteName !== name) {
		autoStep = 0;
		autoRouteName = name;
	}
	const route = autoRoutes[name];
	if (!route) return { x: 0, y: 0 };
	const p = body.translation(),
		goal = route[Math.min(autoStep, route.length - 1)],
		dx = goal[0] - p.x,
		dz = goal[1] - p.z,
		d = Math.hypot(dx, dz);
	if (d < 0.8 && autoStep < route.length - 1) {
		autoStep++;
		return { x: 0, y: 0 };
	}
	if (
		name === "battery" &&
		!state.crateMoved &&
		Math.hypot(p.x + 18, p.z + 19) < 4.7 &&
		autoWait <= 0
	) {
		pulse();
		autoWait = 1.6;
	}
	if (
		name === "umbrella" &&
		!state.gateOpen &&
		Math.hypot(p.x - 20, p.z + 15) < 4.8 &&
		autoWait <= 0
	) {
		pulse();
		autoWait = 1.6;
	}
	if (
		name === "signal" &&
		state.healed < 3 &&
		Math.hypot(p.x - 16, p.z + 32) < 4.5 &&
		autoWait <= 0
	) {
		pulse();
		autoWait = 1.6;
	}
	if (
		name === "toy" &&
		state.healed < 1 &&
		Math.hypot(p.x + 20, p.z - 7) < 3 &&
		autoWait <= 0
	) {
		pulse();
		autoWait = 1.6;
	}
	if (name === "ride" && p.z < -72 && autoWait <= 0) {
		pulse();
		autoWait = 1.6;
	}
	if (
		(d < 1.6 ||
			([
				"friend",
				"toy",
				"battery",
				"umbrella",
				"signal",
				"bike",
				"farewell",
			].includes(name) &&
				autoStep === route.length - 1 &&
				d < 2.3)) &&
		autoWait <= 0
	) {
		interact();
		autoWait = 0.7;
	}
	if (
		timers.candy <= 0 &&
		state.friend &&
		state.candy > 2 &&
		state.elapsed % 13 < dt
	)
		throwCandy();
	return { x: dx / Math.max(1, d), y: dz / Math.max(1, d) };
}
function movePlayer(dt, ai) {
	const p = body.translation();
	let ix = ai ? ai.x : input.x,
		iy = ai ? ai.y : input.y;
	if (input.click && !ai) {
		const dx = input.click.x - p.x,
			dz = input.click.z - p.z,
			d = Math.hypot(dx, dz);
		if (d < 0.5 || (input.clickAction && d < 2.3)) {
			input.click = null;
			if (input.clickAction) interact();
		} else {
			ix = dx / d;
			iy = dz / d;
		}
	}
	const mag = Math.hypot(ix, iy);
	if (mag > 1) {
		ix /= mag;
		iy /= mag;
	}
	let dx, dz;
	const direct = !!ai || !!input.click;
	if (direct) {
		dx = ix;
		dz = iy;
	} else {
		dx = ix * Math.cos(cameraYaw) + iy * Math.sin(cameraYaw);
		dz = iy * Math.cos(cameraYaw) - ix * Math.sin(cameraYaw);
	}
	let moving = Math.hypot(dx, dz) > 0.04;
	if (state.phase === "flight") {
		let ny = p.y + (-iy * 5 + (input.lift && !ai ? 3 : 0) - 0.1) * dt;
		if (input.type === "touch" && !ai) {
			const target = rings.find((r) => !r.taken && r.z < p.z + 3);
			if (target) ny = lerp(p.y, target.y, dt * 1.4);
		}
		const nx = clamp(p.x + ix * 8 * dt, -27, 27),
			nz = p.z - tuning.flightSpeed * dt;
		body.setNextKinematicTranslation({ x: nx, y: clamp(ny, 5, 24), z: nz });
		player.root.rotation.y = lerp(player.root.rotation.y, -ix * 0.35, dt * 6);
		bike.rotation.z = lerp(bike.rotation.z, -ix * 0.25, dt * 5);
		for (const r of rings)
			if (
				!r.taken &&
				Math.abs(nz - r.z) < 2 &&
				Math.hypot(nx - r.x, ny - r.y) < 2.9
			) {
				r.taken = true;
				r.root.visible = false;
				state.rings++;
				state.bond = clamp(state.bond + 18, 0, 100);
				audio.sfx("pickup");
				burst(r.x, r.y, r.z, 0xf6dea1, 24);
				toast("A little closer to home.", 1.5);
			}
		if (nz < -147) {
			setPhase("farewell");
			state.mounted = false;
			putPlayer(0, -153);
			bike.position.set(1, 0, -151);
			bike.rotation.set(0, -0.4, 0);
			friend.root.scale.setScalar(1);
			friend.root.position.set(1, 0, -153);
			say("ELLIOTT", "That’s your ride, isn’t it?", 5);
			splash(
				"THE LAST LITTLE THING",
				"Letting go.",
				"Walk your friend to the light.",
			);
		}
		moving = true;
	} else if (state.phase !== "ending") {
		let speed = state.mounted ? 11 : tuning.walkSpeed;
		if (input.sneak && !state.mounted) speed *= 0.5;
		if (state.mounted && input.boost) speed *= 1.4;
		if (state.attract) speed *= 1.15;
		let tx = dx * speed * dt,
			tz = dz * speed * dt;
		if (state.mounted && p.z + tz < -82.2) tz = -82.2 - p.z;
		if (!state.mounted && state.phase !== "farewell" && p.z + tz < -49)
			tz = -49 - p.z;
		const nearX = clamp(p.x + tx, -43, 43);
		tx = nearX - p.x;
		const nextZ = clamp(p.z + tz, -169, 25);
		tz = nextZ - p.z;
		controller.computeColliderMovement(collider, { x: tx, y: -0.15, z: tz });
		const mv = controller.computedMovement();
		body.setNextKinematicTranslation({
			x: p.x + mv.x,
			y: p.y + mv.y,
			z: p.z + mv.z,
		});
		if (moving) {
			const angle = Math.atan2(-dx, -dz),
				delta =
					THREE.MathUtils.euclideanModulo(
						angle - player.root.rotation.y + Math.PI,
						Math.PI * 2,
					) - Math.PI;
			player.root.rotation.y += delta * Math.min(1, dt * 12);
		}
		if (state.mounted) bike.rotation.y = player.root.rotation.y;
	}
	world.timestep = dt;
	world.step();
	const after = body.translation();
	player.root.position.set(after.x, after.y - 0.85, after.z);
	if (state.mounted) {
		bike.position.set(after.x, after.y - 0.85, after.z);
		player.rig.position.y = 0.52;
		player.legs[0].rotation.x = -0.85;
		player.legs[1].rotation.x = -0.85;
		player.arms.forEach((a) => {
			a.rotation.x = -0.8;
		});
		for (const w of bike.userData.wheels) w.rotation.x -= dt * (moving ? 9 : 0);
		friend.root.position.set(after.x, after.y + 1.01, after.z - 1);
		friend.root.rotation.y = player.root.rotation.y;
	} else {
		player.rig.position.y = 0;
		if (state.friend && state.phase !== "ending") {
			const f = friend.root.position,
				fx =
					after.x +
					Math.cos(player.root.rotation.y) * 1.2 +
					Math.sin(player.root.rotation.y) * 1.3,
				fz =
					after.z -
					Math.sin(player.root.rotation.y) * 1.2 +
					Math.cos(player.root.rotation.y) * 1.3;
			f.x = lerp(f.x, fx, Math.min(1, dt * 3));
			f.z = lerp(f.z, fz, Math.min(1, dt * 3));
			f.y = 0;
			const ddx = after.x - f.x,
				ddz = after.z - f.z;
			if (Math.hypot(ddx, ddz) > 1)
				friend.root.rotation.y = Math.atan2(-ddx, -ddz);
		}
	}
	player.pedal.paused = !state.mounted;
	player.pedal.setEffectiveWeight(state.mounted ? 1 : 0);
	player.walk.setEffectiveWeight(state.mounted ? 0 : 1);
	player.walk.paused = !moving || state.mounted;
	player.walk.timeScale = input.sneak ? 0.6 : 1;
	player.rig.rotation.x = input.sneak && !state.mounted ? 0.18 : 0;
	playerHalo.position.set(after.x, 0.1, after.z);
	friendHalo.position.set(
		friend.root.position.x,
		friend.root.position.y + 0.5,
		friend.root.position.z,
	);
	shadowPlayer.position.set(after.x, 0.04, after.z);
	shadowPlayer.visible = after.y < 3;
	if (moving && !state.mounted && timers.footstep <= 0) {
		audio.sfx("step");
		timers.footstep = 0.38;
	}
	for (const c of candies)
		if (
			!c.taken &&
			Math.hypot(after.x - c.x, after.z - c.z) < 0.8 &&
			after.y < 2
		) {
			c.taken = true;
			c.root.visible = false;
			state.candy++;
			state.bond = clamp(state.bond + 3, 0, 100);
			audio.sfx("candy");
		}
}
function tick(dt) {
	state.elapsed += dt;
	for (const key of [
		"dialogue",
		"toast",
		"splash",
		"pulse",
		"candy",
		"footstep",
	])
		timers[key] = Math.max(0, timers[key] - dt);
	if (timers.dialogue === 0) $("#dialogue").classList.add("hidden");
	if (timers.toast === 0) $("#toast").classList.add("hidden");
	if (timers.splash > 0)
		$("#chapterSplash").style.opacity = clamp(timers.splash, 0, 1);
	else $("#chapterSplash").classList.add("hidden");
	if (["play", "tune"].includes(state.screen)) {
		state.time += dt;
		state.bond = clamp(state.bond + dt * tuning.recharge, 0, 100);
		if (state.screen === "tune") {
			updateTune(dt);
			autopilot(dt);
		} else {
			const ai = autopilot(dt);
			movePlayer(dt, ai);
			if (state.phase !== "ending") updateGuards(dt);
			if (state.phase === "ending") {
				state.endingTime += dt;
				friend.root.position.z -= dt * 0.7;
				friend.root.position.y = Math.min(3.7, state.endingTime * 0.45);
				if (state.endingTime > 4) {
					friend.root.visible = false;
					ship.position.y += (state.endingTime - 4) * dt * 2;
				}
				if (state.endingTime > 7) {
					if (state.attract) {
						startGame(true);
					} else showResult();
				}
			}
		}
		if (input.type === "touch" && state.screen === "play" && !state.auto) {
			const c = nearestContext();
			if (c?.type === "power" && state.phase === "parts" && timers.pulse === 0)
				pulse();
		}
	}
	for (const mixer of mixers) mixer.update(dt);
	updateEffects(dt);
	for (const d of dynamicBodies) {
		const p = d.body.translation(),
			q = d.body.rotation();
		d.root.position.set(p.x, p.y, p.z);
		d.root.quaternion.set(q.x, q.y, q.z, q.w);
	}
	for (const f of flowers) {
		const target = f.healed ? 1 : 0.42;
		f.plant.scale.y = lerp(f.plant.scale.y, target, Math.min(1, dt * 4));
		f.plant.rotation.z = lerp(
			f.plant.rotation.z,
			f.healed ? 0 : 0.35,
			Math.min(1, dt * 4),
		);
	}
	gate.rotation.z = lerp(
		gate.rotation.z,
		state.gateOpen ? -Math.PI / 2 : 0,
		Math.min(1, dt * 3),
	);
	for (const it of items) {
		it.root.position.y = 0.8 + Math.sin(state.elapsed * 2 + it.index) * 0.1;
		it.marker.rotation.y += dt;
	}
	for (const p of particles) {
		p.root.position.set(
			p.x + Math.sin(state.elapsed * 0.3 + p.t) * 0.8,
			p.y + Math.sin(state.elapsed + p.t) * 0.3,
			p.z,
		);
		p.root.scale.setScalar(0.025 + Math.sin(state.elapsed * 2 + p.t) * 0.012);
	}
	for (const r of rings) r.root.rotation.z += dt * 0.13;
	timers.net += dt;
	timers.ui += dt;
	if (timers.net > 0.11) {
		timers.net = 0;
		networkUpdate();
	}
	if (timers.ui > 0.1) {
		timers.ui = 0;
		updateHUD();
	}
	if (debugLines.visible) {
		const d = world.debugRender();
		debugLines.geometry.dispose();
		debugLines.geometry = new THREE.BufferGeometry();
		debugLines.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(d.vertices, 3),
		);
		debugLines.geometry.setAttribute(
			"color",
			new THREE.BufferAttribute(d.colors, 4),
		);
	}
	audio.update(state.mounted ? state.phase : "walk");
}


function glyph(action) {
	const kb = {
		move: "WASD",
		interact: "E",
		pulse: "Space",
		sneak: "Shift",
		boost: "Shift",
		candy: "Q",
		map: "Tab",
		pause: "Esc",
		lift: "Space",
	};
	if (input.type !== "gamepad") return "<kbd>" + kb[action] + "</kbd>";
	const ps = {
			move: "L",
			interact: "×",
			pulse: "□",
			sneak: "○",
			boost: "R2",
			candy: "R1",
			map: "L1",
			pause: "≡",
			lift: "×",
		},
		xb = {
			move: "L",
			interact: "A",
			pulse: "X",
			sneak: "B",
			boost: "RT",
			candy: "RB",
			map: "LB",
			pause: "≡",
			lift: "A",
		};
	return (
		'<span class="glyph ' +
		(settings.glyphs === "PlayStation" ? "ps" : "") +
		'">' +
		(settings.glyphs === "PlayStation" ? ps : xb)[action] +
		"</span>"
	);
}
function updateHUD() {
	if (!body) return;
	const phase = state.phase,
		mission = {
			friend: [
				"01 / A STRANGER IN THE SHED",
				"Someone’s hiding.",
				"Follow the little golden trail to the shed.",
			],
			parts: [
				"02 / A TELEPHONE MADE OF LITTLE THINGS",
				"Find three little things.",
				"A toy on a porch. A battery under a crate. An umbrella behind a gate.",
			],
			signal: [
				"02 / THE CLEARING",
				"Make a little noise.",
				"Bring the pieces to the old stump in the woods.",
			],
			ride: [
				"03 / THE LONG WAY HOME",
				state.mounted
					? "Pedal past the searchlights."
					: "Your bicycle is waiting.",
				state.mounted
					? "Keep to the road. Save a glow for the roadblock."
					: "A friend fits nicely in the basket.",
			],
			flight: [
				"03 / ABOVE EVERYTHING",
				"The sky is a shortcut.",
				"Steer through the stars. Hold your glow to rise.",
			],
			farewell: [
				"04 / THE LAST LITTLE THING",
				"Walk him to the light.",
				"Sometimes a goodbye is a promise.",
			],
			ending: [
				"04 / HOME",
				"Somewhere, someone is waiting.",
				"And somewhere, someone will remember.",
			],
		}[phase];
	$("#chapterLabel").textContent = mission[0];
	$("#goalTitle").textContent = mission[1];
	$("#goalHint").textContent = mission[2];
	$("#parts").innerHTML = ["◒", "ϟ", "☂"]
		.map(
			(t, i) =>
				'<div class="part ' +
				(state.parts[i] ? "got" : "") +
				'" aria-label="' +
				["Talking toy", "Battery", "Umbrella"][i] +
				(state.parts[i] ? " collected" : " missing") +
				'">' +
				t +
				"</div>",
		)
		.join("");
	$("#parts").classList.toggle(
		"hidden",
		phase === "friend" || phaseOrder.indexOf(phase) > 2,
	);
	$("#bondValue").textContent = Math.round(state.bond);
	$("#bondFill").style.width = state.bond + "%";
	$("#alertFill").style.width = state.alert + "%";
	$("#alertLabel").textContent = state.seen
		? "SEEN"
		: state.hiding
			? "IN COVER"
			: state.alert > 10
				? "SEARCHING"
				: "HIDDEN";
	const c = state.screen === "play" ? nearestContext() : null;
	$("#action").classList.toggle("hidden", !c);
	if (c)
		$("#action").innerHTML =
			glyph(c.type === "power" ? "pulse" : "interact") +
			"<span>" +
			c.text +
			"</span>";
	const flight = phase === "flight";
	$("#controls").innerHTML =
		"<span>" +
		glyph("move") +
		(flight ? "Steer" : "Move") +
		"</span><span>" +
		glyph(flight ? "lift" : "pulse") +
		(flight ? "Rise / glide" : state.mounted ? "Lift" : "Heartlight") +
		"</span><span>" +
		glyph(state.mounted ? "boost" : "sneak") +
		(state.mounted ? "Pedal harder" : "Quiet steps") +
		"</span><span>" +
		glyph("candy") +
		"Candy · " +
		state.candy +
		"</span><span>" +
		glyph("map") +
		"Map</span><span>" +
		glyph("pause") +
		"Pause</span>";
	if (flight) {
		$("#controls").innerHTML =
			"<span>" +
			glyph("move") +
			"Steer</span><span>" +
			glyph("lift") +
			"Rise / glide</span><span>" +
			glyph("map") +
			"Map</span><span>" +
			glyph("pause") +
			"Pause</span>";
	}
	$(".alert-meter").classList.toggle(
		"hidden",
		flight || phase === "farewell" || phase === "ending",
	);
	$("#titleInput").textContent =
		input.type === "gamepad"
			? settings.glyphs === "PlayStation"
				? "L to wander · × to lend a hand · □ to glow"
				: "L to wander · A to lend a hand · X to glow"
			: "WASD to wander · E to lend a hand · Space to glow";
	$("#tuneKeys").textContent =
		input.type === "gamepad"
			? settings.glyphs === "PlayStation"
				? "□ low · △ middle · ○ high"
				: "X low · Y middle · B high"
			: "Use 1 · 2 · 3 or click a light.";
	$("#touchPulse").style.visibility =
		state.friend && (c?.type === "power" || state.mounted || state.alert > 15)
			? "visible"
			: "hidden";
	drawMap($("#minimap"), false);
	if (!$("#mapOverlay").classList.contains("hidden"))
		drawMap($("#largeMap"), true);
	updateRaceUI();
}
function objectivePoints() {
	if (state.phase === "friend")
		return [{ ...locations.friend, name: "A small friend" }];
	if (state.phase === "parts")
		return items
			.filter((i) => !i.collected)
			.map((i) => ({ x: i.x, z: i.z, name: i.name }));
	if (state.phase === "signal")
		return [{ ...locations.signal, name: "The telephone" }];
	if (state.phase === "ride")
		return [
			{
				...(state.mounted ? locations.barrier : locations.bike),
				name: state.mounted ? "The roadblock" : "Your bicycle",
			},
		];
	if (state.phase === "flight")
		return rings.filter((r) => !r.taken).map((r) => ({ ...r, name: "A star" }));
	return [{ ...locations.home, name: "Home" }];
}
function drawMap(canvas, large) {
	const c = canvas.getContext("2d"),
		w = canvas.width,
		h = canvas.height,
		p = body.translation(),
		span = large ? 205 : 54,
		centerZ = large ? -70 : p.z,
		centerX = large ? 0 : p.x,
		scale = w / span;
	const xy = (x, z) => [
		w / 2 + (x - centerX) * scale,
		h / 2 + (z - centerZ) * scale,
	];
	c.clearRect(0, 0, w, h);
	c.save();
	c.fillStyle = "#12303d";
	c.fillRect(0, 0, w, h);
	c.strokeStyle = "#4d6871";
	c.lineWidth = large ? 22 : 28;
	c.beginPath();
	for (let z = 25; z > -170; z -= 2) {
		const [x, y] = xy(roadX(z), z);
		z === 25 ? c.moveTo(x, y) : c.lineTo(x, y);
	}
	c.stroke();
	c.strokeStyle = "#a5b5a05c";
	c.lineWidth = 2;
	c.setLineDash([8, 9]);
	c.stroke();
	c.setLineDash([]);
	for (const [x, z] of [
		[-27, -3],
		[27, 10],
		[-27, -25],
		[29, -39],
		[-28, 20],
	]) {
		const [px, py] = xy(x, z);
		c.fillStyle = "#79928a";
		c.fillRect(px - 4 * scale, py - 3 * scale, 8 * scale, 6 * scale);
	}
	for (const g of guards) {
		const [x, y] = xy(g.x, g.z);
		c.fillStyle = g.stun ? "#8fd4c1" : "#e59887";
		c.beginPath();
		c.arc(x, y, large ? 4 : 5, 0, 6.28);
		c.fill();
	}
	for (const o of objectivePoints()) {
		const [x, y] = xy(o.x, o.z);
		c.fillStyle = "#f8d18a";
		c.beginPath();
		c.arc(x, y, large ? 7 : 8, 0, 6.28);
		c.fill();
		if (large) {
			c.font = "19px sans-serif";
			c.fillStyle = "#f8e4b9";
			c.fillText(o.name, x + 13, y + 6);
		}
	}
	for (const g of ghosts.values()) {
		if (!g.data) continue;
		const [x, y] = xy(g.data.x, g.data.z);
		c.fillStyle = g.color;
		c.beginPath();
		c.arc(x, y, 5, 0, 6.28);
		c.fill();
	}
	const [x, y] = xy(p.x, p.z);
	c.save();
	c.translate(x, y);
	c.rotate(-player.root.rotation.y);
	c.fillStyle = "#a6f3e0";
	c.beginPath();
	c.moveTo(0, -10);
	c.lineTo(7, 8);
	c.lineTo(0, 4);
	c.lineTo(-7, 8);
	c.closePath();
	c.fill();
	c.restore();
	if (large) {
		c.font = "26px serif";
		c.fillStyle = "#f8dfb0";
		c.fillText("A little map of a very big night", 35, 45);
		c.font = "16px sans-serif";
		c.fillStyle = "#acc8c6";
		c.fillText("THE NEIGHBORHOOD", w * 0.6, h * 0.15);
		c.fillText("THE WOODS", w * 0.6, h * 0.52);
		c.fillText("THE WAY HOME", w * 0.6, h * 0.87);
	}
	c.restore();
}
let menuBase = "title",
	aboutTab = "Source Information";
function openMenu(kind) {
	if (state.screen === "hubEnded" || state.attract) return;
	if (menu === "none") menuBase = state.screen;
	state.screen = "menu";
	menu = kind;
	$("#menuLayer").classList.remove("hidden");
	renderMenu();
}
function closeMenu() {
	menu = "none";
	$("#menuLayer").classList.add("hidden");
	if (menuBase === "title") showTitle();
	else state.screen = menuBase;
	input.keys.clear();
	input.x = input.y = 0;
}
function menuBack() {
	if (menu === "pause" || menu === "online" || menuBase === "title")
		closeMenu();
	else {
		menu = "pause";
		renderMenu();
	}
}
function panel(content, wide = false, compact = false) {
	$("#menuLayer").innerHTML =
		'<section class="panel ' +
		(wide ? "wide " : "") +
		(compact ? "compact" : "") +
		'">' +
		content +
		"</section>";
	focusFirst();
}
function btn(id, label, cls = "") {
	return '<button id="' + id + '" class="' + cls + '">' + label + "</button>";
}
function bind(id, fn) {
	const e = $("#" + id);
	if (e)
		e.onclick = () => {
			state.lastMenuAction = id;
			audio.sfx("click");
			fn();
		};
}
function renderMenu() {
	if (menu === "pause") {
		panel(
			'<div class="kicker">TAKE A BREATH</div><h2>The night can wait.</h2><div class="menu-list">' +
				btn("resume", "Keep going", "primary") +
				btn("openSettings", "Settings") +
				btn("openHelp", "How to help a visitor") +
				btn("openDev", "Developer mode") +
				btn("openAbout", "About & credits") +
				(AIHub.active ? "" : btn("returnTitle", "Back to the title")) +
				"</div>",
		);
		bind("resume", closeMenu);
		bind("openSettings", () => openMenu("settings"));
		bind("openHelp", () => openMenu("help"));
		bind("openDev", () => openMenu("dev"));
		bind("openAbout", () => openMenu("about"));
		bind("returnTitle", () => {
			club?.leave();
			resetWorld();
			showTitle();
		});
	} else if (menu === "settings") {
		panel(
			'<div class="kicker">MAKE YOURSELF AT HOME</div><h2>A little adjustment.</h2>' +
				settingSlider("music", "Music", settings.music, 0, 1, 0.01, true) +
				settingSlider("sfx", "Sound & voices", settings.sfx, 0, 1, 0.01, true) +
				settingSlider(
					"sensitivity",
					"Camera speed",
					settings.sensitivity,
					0.3,
					2,
					0.1,
				) +
				'<div class="setting-row"><label>Controller symbols</label>' +
				btn("glyphToggle", settings.glyphs, "small") +
				'</div><div class="setting-row"><label>Camera drift & effects</label>' +
				btn(
					"motionToggle",
					settings.motion ? "Gentle motion" : "Reduced motion",
					"small",
				) +
				'</div><p class="note">Left stick moves. Right stick looks. In menus, use the D-pad or left stick; Cross selects and Circle goes back. Music starts at 10%.</p>' +
				btn(
					"fullScreen",
					document.fullscreenElement ? "Leave fullscreen" : "Play fullscreen",
					"small",
				) +
				btn("menuBack", "Back", "back"),
		);
		bindSlider("music", settings, true);
		bindSlider("sfx", settings, true);
		bindSlider("sensitivity", settings);
		bind("glyphToggle", () => {
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			saveSettings();
			renderMenu();
			$("#glyphToggle").focus();
		});
		bind("motionToggle", () => {
			settings.motion = !settings.motion;
			saveSettings();
			renderMenu();
			$("#motionToggle").focus();
		});
		bind("fullScreen", async () => {
			try {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			} catch {
				toast("Fullscreen is unavailable in this browser.");
			}
		});
		bind("menuBack", menuBack);
	} else if (menu === "help") {
		panel(
			'<div class="kicker">A FRIEND, NOT A FIGHTER</div><h2>Small things matter.</h2><p>Follow the golden marks on the map. Offer the visitor candy, then gather three pieces for a telephone.</p><p>' +
				glyph("pulse") +
				" <b>Heartlight</b> brings flowers back, lifts heavy things, and startles searching adults. It comes back when you rest.</p><p>" +
				glyph("sneak") +
				" <b>Quiet steps</b> and hedges help you hide. " +
				glyph("candy") +
				" drops candy to draw flashlights away. Getting caught returns you to safety with your finds.</p><p>On the bicycle, pedal toward the woods. At the roadblock, glow to lift off. In the sky, steer and hold " +
				glyph("lift") +
				' to rise. Golden rings refill your light.</p><p class="note">WASD / left stick: move · mouse drag / right stick: camera · click ground: walk there · E / Cross: interact · Space / Square: glow · Shift / Circle: quiet · Q / R1: candy · Tab / L1: map · Esc / Options: pause.<br>Touch: left thumb moves, right thumb looks. Nearby help happens automatically; tap the contextual prompt to interact.</p>' +
				btn("menuBack", "Back", "back"),
			true,
		);
		bind("menuBack", menuBack);
	} else if (menu === "dev") {
		panel(
			'<div class="kicker">DEVELOPER MODE · LIVE FIELD NOTES</div><h2>Try a different night.</h2>' +
				settingSlider(
					"walkSpeed",
					"Walking speed",
					tuning.walkSpeed,
					2,
					12,
					0.1,
				) +
				settingSlider(
					"alertRate",
					"Searchlight buildup",
					tuning.alertRate,
					0,
					70,
					1,
				) +
				settingSlider(
					"recharge",
					"Heartlight recharge",
					tuning.recharge,
					0,
					25,
					0.5,
				) +
				settingSlider(
					"flightSpeed",
					"Flight speed",
					tuning.flightSpeed,
					5,
					24,
					0.5,
				) +
				'<div class="dev-grid">' +
				btn(
					"invincible",
					"Safe from capture: " + (tuning.invincible ? "on" : "off"),
				) +
				btn("freeze", "Patrols: " + (tuning.freeze ? "frozen" : "moving")) +
				btn("refill", "Refill heartlight & candy") +
				btn(
					"debugPhysics",
					"Physics lines: " + (debugLines.visible ? "on" : "off"),
				) +
				btn("tour", "Autopilot: " + (state.auto ? "on" : "off")) +
				btn("resetBalance", "Reset balance defaults") +
				'</div><p class="note">Jump to a chapter. The right equipment comes with you.</p><div class="pills">' +
				btn("jumpParts", "The telephone", "small") +
				btn("jumpRide", "The bicycle", "small") +
				btn("jumpFlight", "The sky", "small") +
				"</div>" +
				btn("menuBack", "Back", "back"),
			true,
			true,
		);
		for (const k of ["walkSpeed", "alertRate", "recharge", "flightSpeed"])
			bindSlider(k, tuning);
		bind("invincible", () => {
			tuning.invincible = !tuning.invincible;
			renderMenu();
		});
		bind("freeze", () => {
			tuning.freeze = !tuning.freeze;
			renderMenu();
		});
		bind("refill", () => {
			state.bond = 100;
			state.candy = 12;
			toast("A pocketful of possibilities.");
		});
		bind("debugPhysics", () => {
			debugLines.visible = !debugLines.visible;
			renderMenu();
		});
		bind("tour", () => {
			state.auto = !state.auto;
			autoRouteName = "";
			autoStep = 0;
			closeMenu();
		});
		bind("resetBalance", () => {
			Object.assign(tuning, defaults);
			debugLines.visible = false;
			renderMenu();
		});
		bind("jumpParts", () => devJump("parts"));
		bind("jumpRide", () => devJump("ride"));
		bind("jumpFlight", () => devJump("flight"));
		bind("menuBack", menuBack);
	} else if (menu === "about") renderAbout();
	else if (menu === "online") renderOnline();
}
function settingSlider(key, label, value, min, max, step, percent = false) {
	return (
		'<div class="setting-row"><label for="set-' +
		key +
		'">' +
		label +
		'</label><div class="range-wrap"><input id="set-' +
		key +
		'" type="range" min="' +
		min +
		'" max="' +
		max +
		'" step="' +
		step +
		'" value="' +
		value +
		'"><output id="out-' +
		key +
		'">' +
		(percent
			? Math.round(value * 100) + "%"
			: Number(value).toFixed(step < 1 ? 1 : 0)) +
		"</output></div></div>"
	);
}
function bindSlider(k, target, pct = false) {
	const el = $("#set-" + k);
	el.oninput = () => {
		target[k] = Number(el.value);
		$("#out-" + k).textContent = pct
			? Math.round(target[k] * 100) + "%"
			: target[k].toFixed(Number(el.step) < 1 ? 1 : 0);
		if (target === settings) {
			audio.volumes(settings.music, settings.sfx);
			saveSettings();
		}
	};
}
function saveSettings() {
	try {
		localStorage.setItem("etlaf-settings", JSON.stringify(settings));
	} catch {}
	updateHUD();
}
function devJump(phase) {
	resetWorld();
	state.friend = true;
	state.screen = "play";
	if (phase === "parts") {
		state.phase = "parts";
		putPlayer(7, 5);
	} else {
		state.parts = [true, true, true];
		items.forEach((i) => {
			i.collected = true;
			i.root.visible = false;
		});
		state.signal = true;
		state.crateMoved = true;
		state.gateOpen = true;
		gate.userData.collider.setEnabled(false);
		transmitter.visible = true;
		state.phase = "ride";
		putPlayer(4, -45);
		if (phase === "flight") {
			state.mounted = true;
			state.phase = "flight";
			friend.root.scale.setScalar(0.62);
			putPlayer(0, -88, 8);
		}
	}
	state.checkpoint = { x: body.translation().x, z: body.translation().z };
	menu = "none";
	$("#title").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	$("#menuLayer").classList.add("hidden");
	toast("Chapter ready.");
	updateHUD();
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
		"Where I got stuck",
		"Most important custom system",
		"Hardest part",
		"Engine changes",
		"One thing to improve",
	],
	promptFeedback: [
		"What worked well",
		"What was confusing",
		"Hardest requirement",
		"What I would change",
	],
};
function escapeHTML(s) {
	return String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}
function renderAbout() {
	const tabs = [
		"Source Information",
		"Testing Feedback",
		"Engine Feedback",
		"Prompt Feedback",
	];
	let bodyHTML = "";
	if (aboutTab === "Source Information") {
		bodyHTML =
			Object.entries(credits.sourceInformation)
				.map(
					([k, v]) =>
						'<div class="credit-row"><b>' +
						escapeHTML(k[0].toUpperCase() + k.slice(1)) +
						"</b><span>" +
						escapeHTML(v) +
						"</span></div>",
				)
				.join("") +
			'<div class="credits-section"><h3>Research & inspiration</h3><p class="note">Film research: <a href="https://catalog.afi.com/Catalog/moviedetails/67140">AFI synopsis</a>, <a href="https://amblin.com/movie/e-t/">Amblin</a>, and <a href="https://www.loc.gov/static/programs/national-film-preservation-board/documents/ET.pdf">Library of Congress essay</a>. Friendship, homemade communication, botanical healing, looming flashlights, and moonlit flight became the game’s mechanics.</p><p class="note">An original, unofficial tribute. E.T. the Extra-Terrestrial © Universal Pictures / Amblin Entertainment. All game geometry, animation, writing, and synthesized music were created for this demo. No film audio or images are used.</p><p class="note">Three.js r180 (MIT) · Rapier 0.19.3 (Apache-2.0) · PeerJS 1.5.5 (MIT) · AI Hub Session client 1.4.0 · Libre Caslon Display and DM Sans (SIL Open Font License).</p></div>';
	} else {
		const key = {
			"Testing Feedback": "testingFeedback",
			"Engine Feedback": "engineFeedback",
			"Prompt Feedback": "promptFeedback",
		}[aboutTab];
		bodyHTML = credits[key]
			.map(
				(v, i) =>
					'<div class="feedback"><p><b>' +
					feedbackQuestions[key][i] +
					"</b><br>" +
					escapeHTML(v) +
					"</p></div>",
			)
			.join("");
	}
	panel(
		'<div class="kicker">E.T. THE EXTRA-LOST-AND-FOUND</div><h2>A small game. A big thank you.</h2><div class="pills">' +
			tabs
				.map((t, i) =>
					btn("creditTab" + i, t, "small " + (t === aboutTab ? "primary" : "")),
				)
				.join("") +
			'</div><div class="credits-scroll" style="margin-top:20px"><h3>' +
			aboutTab +
			"</h3>" +
			bodyHTML +
			"</div>" +
			btn("menuBack", "Back", "back"),
		true,
	);
	tabs.forEach((t, i) => {
		bind("creditTab" + i, () => {
			aboutTab = t;
			renderAbout();
			$("#creditTab" + i).focus();
		});
	});
	bind("menuBack", menuBack);
	if (AIHub.active)
		$$(".credits-scroll a").forEach((a) => {
			a.removeAttribute("href");
		});
}
function formatTime(s) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
function showResult() {
	state.screen = "result";
	$("#chapterSplash").classList.add("hidden");
	$("#menuLayer").classList.remove("hidden");
	const clubRound = club?.started;
	panel(
		'<div class="kicker">YOU GOT HIM HOME</div><h2>Some friendships<br>are bigger than the sky.</h2><p>A little bicycle is waiting at the edge of the woods.<br>Tomorrow, there will be stories nobody believes.</p><div class="result-stats"><div>' +
			formatTime(state.time) +
			"<small>ONE BIG NIGHT</small></div><div>" +
			state.healed +
			"/4<small>FLOWERS HEALED</small></div><div>" +
			state.rings +
			'/4<small>STARS TOUCHED</small></div></div><p class="note">' +
			(state.catches === 0
				? "Quiet as a secret. Nobody caught you."
				: state.catches + " close calls. You kept your promise anyway.") +
			'</p><div id="clubResults"></div>' +
			(AIHub.active
				? '<p class="good">Homecoming reported. Waiting for the other riders.</p>'
				: '<div class="menu-list">' +
					btn(
						"again",
						clubRound ? "Ride together again" : "One more night",
						"primary",
					) +
					btn("resultTitle", "Back to the title") +
					btn("resultAbout", "About & credits") +
					"</div>"),
	);
	bind("again", () => {
		if (clubRound && club.host) club.start();
		else if (clubRound) toast("The room’s host can start the next ride.");
		else startGame();
	});
	bind("resultTitle", () => {
		club?.leave();
		showTitle();
	});
	bind("resultAbout", () => {
		menuBase = "result";
		menu = "about";
		state.screen = "menu";
		renderAbout();
	});
}
function focusFirst() {
	const scope = !$("#menuLayer").classList.contains("hidden")
		? $("#menuLayer")
		: !$("#tuneOverlay").classList.contains("hidden")
			? $("#tuneOverlay")
			: $("#title");
	const b = scope.querySelector("button:not(:disabled),input");
	if (b) b.focus({ preventScroll: true });
}
function menuElements() {
	const scope = !$("#menuLayer").classList.contains("hidden")
		? $("#menuLayer")
		: !$("#tuneOverlay").classList.contains("hidden")
			? $("#tuneOverlay")
			: $("#title");
	return [...scope.querySelectorAll("button:not(:disabled),input")].filter(
		(e) => e.getClientRects().length,
	);
}
function navigateMenu(delta) {
	const els = menuElements();
	if (!els.length) return;
	let i = els.indexOf(document.activeElement);
	i = (i + delta + els.length) % els.length;
	els[i].focus({ preventScroll: true });
	els[i].scrollIntoView({ block: "nearest" });
	audio.sfx("click");
}
function adjustFocused(direction) {
	const e = document.activeElement;
	if (e?.type === "range") {
		e.value = clamp(
			Number(e.value) + direction * Number(e.step),
			Number(e.min),
			Number(e.max),
		);
		e.dispatchEvent(new Event("input"));
		return true;
	}
	if (e?.dataset.digit !== undefined) {
		const n = Number(e.dataset.digit);
		roomDigits[n] = (roomDigits[n] + direction + 10) % 10;
		renderOnline();
		$("#digit" + n).focus();
		return true;
	}
	return false;
}
function noteInput(type) {
	input.last = performance.now();
	if (state.screen === "hubEnded") return false;
	if (state.attract) {
		showTitle();
		return false;
	}
	if (input.type !== type) {
		input.type = type;
		document.body.classList.toggle("touch", type === "touch");
		updateHUD();
	}
	audio.unlock();
	return true;
}
function pause() {
	if (AIHub.active && state.screen === "hubWaiting") return;
	if (state.screen === "menu") {
		menuBack();
		return;
	}
	if (["play", "tune"].includes(state.screen)) openMenu("pause");
}
function toggleMap() {
	if (!["play", "map"].includes(state.screen)) return;
	const isOpen = state.screen === "map";
	state.screen = isOpen ? "play" : "map";
	$("#mapOverlay").classList.toggle("hidden", isOpen);
	if (!isOpen) {
		drawMap($("#largeMap"), true);
		$("#closeMap").focus();
	}
}
function handleKey(e) {
	if (!noteInput("keyboard")) {
		e.preventDefault();
		return;
	}
	const key = e.key.toLowerCase();
	if (
		[" ", "tab", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
			key,
		)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (e.target.tagName === "INPUT" && e.target.type === "number") return;
	if (key === "escape") {
		if (state.screen === "map") toggleMap();
		else if (state.screen === "tune") {
			state.screen = "play";
			$("#tuneOverlay").classList.add("hidden");
		} else pause();
		return;
	}
	if (["menu", "title", "result"].includes(state.screen)) {
		if (["arrowdown", "s"].includes(key)) navigateMenu(1);
		else if (["arrowup", "w"].includes(key)) navigateMenu(-1);
		else if (key === "arrowleft") adjustFocused(-1);
		else if (key === "arrowright") adjustFocused(1);
		else if (key === "enter" || key === " ") {
			e.preventDefault();
			if (document.activeElement?.tagName === "BUTTON")
				document.activeElement.click();
			else if (state.screen === "title") $("#begin").click();
		}
		return;
	}
	if (state.screen === "hubWaiting" || state.screen === "hubEnded") return;
	if (state.screen === "tune") {
		if (["1", "2", "3"].includes(key)) submitNote(Number(key) - 1);
		return;
	}
	input.keys.add(key);
	if (
		[
			"w",
			"a",
			"s",
			"d",
			"arrowup",
			"arrowdown",
			"arrowleft",
			"arrowright",
		].includes(key)
	)
		input.click = null;
	if (key === "e") interact();
	if (key === " ") {
		pulse();
		input.lift = true;
	}
	if (key === "q") throwCandy();
	if (key === "tab") toggleMap();
}
document.addEventListener(
	"pointerdown",
	(e) => {
		if (!noteInput(e.pointerType === "touch" ? "touch" : "keyboard")) {
			e.preventDefault();
			e.stopPropagation();
		}
	},
	true,
);
document.addEventListener("keydown", handleKey);
document.addEventListener("keyup", (e) => {
	input.keys.delete(e.key.toLowerCase());
	if (e.key === " ") input.lift = false;
});
window.addEventListener("blur", () => {
	input.keys.clear();
	input.x = input.y = 0;
	input.lift = false;
	if (!AIHub.active && !state.attract && state.screen === "play")
		openMenu("pause");
});
document.addEventListener("pointermove", (e) => {
	if (
		e.pointerType === "mouse" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) > 1
	) {
		if (!noteInput("keyboard")) return;
		if (e.buttons === 1 && pointerDown && state.screen === "play") {
			pointerDown.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
			if (pointerDown.moved > 5) {
				cameraYaw -= e.movementX * 0.004 * settings.sensitivity;
				cameraPitch = clamp(cameraPitch - e.movementY * 0.003, 0.35, 1.1);
			}
		}
	}
	const b = e.target.closest?.("button");
	if (b && e.pointerType === "mouse") b.focus({ preventScroll: true });
});
$("#world").addEventListener("pointerdown", (e) => {
	if (!noteInput(e.pointerType === "touch" ? "touch" : "keyboard")) return;
	if (e.pointerType === "touch") {
		touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			startX: e.clientX,
			startY: e.clientY,
			left: e.clientX < innerWidth * 0.5,
		});
		$("#world").setPointerCapture(e.pointerId);
		if (e.clientX < innerWidth * 0.5) {
			$("#touchStick").style.cssText =
				"display:block;left:" +
				(e.clientX - 50) +
				"px;top:" +
				(e.clientY - 50) +
				"px";
		}
	} else pointerDown = { x: e.clientX, y: e.clientY, moved: 0 };
});
const touches = new Map();
$("#world").addEventListener("pointermove", (e) => {
	const t = touches.get(e.pointerId);
	if (!t) return;
	if (t.left) {
		input.touch = {
			x: clamp((e.clientX - t.startX) / 55, -1, 1),
			y: clamp((e.clientY - t.startY) / 55, -1, 1),
		};
	} else {
		cameraYaw -= (e.clientX - t.x) * 0.004 * settings.sensitivity;
		cameraPitch = clamp(cameraPitch - (e.clientY - t.y) * 0.003, 0.35, 1.1);
	}
	t.x = e.clientX;
	t.y = e.clientY;
});
$("#world").addEventListener("pointerup", (e) => {
	const t = touches.get(e.pointerId);
	if (t) {
		if (t.left) {
			input.touch = null;
			$("#touchStick").style.display = "none";
		} else if (Math.hypot(e.clientX - t.startX, e.clientY - t.startY) < 12)
			clickWorld(e.clientX, e.clientY);
		touches.delete(e.pointerId);
	} else if (pointerDown && pointerDown.moved < 6)
		clickWorld(e.clientX, e.clientY);
	pointerDown = null;
});
$("#world").addEventListener("pointercancel", (e) => {
	touches.delete(e.pointerId);
	input.touch = null;
	$("#touchStick").style.display = "none";
});
const raycaster = new THREE.Raycaster(),
	groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function clickWorld(x, y) {
	if (state.screen !== "play" || state.phase === "flight") return;
	raycaster.setFromCamera(
		new THREE.Vector2((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1),
		camera,
	);
	const pt = new THREE.Vector3();
	if (raycaster.ray.intersectPlane(groundPlane, pt)) {
		input.click = { x: clamp(pt.x, -42, 42), z: clamp(pt.z, -168, 24) };
		input.clickAction = objectivePoints().some(
			(o) => Math.hypot(pt.x - o.x, pt.z - o.z) < 3,
		);
	}
}
let padNavTime = 0;
function pollInput(dt) {
	input.x =
		(input.keys.has("d") || input.keys.has("arrowright") ? 1 : 0) -
		(input.keys.has("a") || input.keys.has("arrowleft") ? 1 : 0);
	input.y =
		(input.keys.has("s") || input.keys.has("arrowdown") ? 1 : 0) -
		(input.keys.has("w") || input.keys.has("arrowup") ? 1 : 0);
	input.sneak = input.keys.has("shift");
	input.boost = input.keys.has("shift");
	if (input.touch) {
		input.x = input.touch.x;
		input.y = input.touch.y;
		input.sneak = true;
	}
	const pads = navigator.getGamepads?.() || [],
		pad = [...pads].find((p) => p && p.connected !== false);
	if (!pad) return;
	const down = (i) => !!pad.buttons[i]?.pressed || pad.buttons[i]?.value > 0.55,
		edge = (i) => down(i) && !input.padPrev[i],
		axis = (i) => (Math.abs(pad.axes[i] || 0) > 0.17 ? pad.axes[i] || 0 : 0),
		hasInput =
			[0, 1, 2, 3, 4, 5, 9, 12, 13, 14, 15].some(edge) ||
			Math.abs(axis(0)) +
				Math.abs(axis(1)) +
				Math.abs(axis(2)) +
				Math.abs(axis(3)) >
				0.2;
	if (hasInput && !noteInput("gamepad")) {
		input.padPrev = pad.buttons.map((_, i) => down(i));
		return;
	}
	padNavTime -= dt;
	if (["title", "menu", "result"].includes(state.screen)) {
		const dir =
			down(13) || axis(1) > 0.55 ? 1 : down(12) || axis(1) < -0.55 ? -1 : 0;
		if (dir && padNavTime <= 0) {
			navigateMenu(dir);
			padNavTime = 0.22;
		}
		if ((edge(14) || edge(15)) && !adjustFocused(edge(15) ? 1 : -1))
			navigateMenu(edge(15) ? 1 : -1);
		if (edge(0)) document.activeElement?.click();
		if (edge(1) && state.screen === "menu") menuBack();
		const scroll = $("#menuLayer .credits-scroll");
		if (scroll && Math.abs(axis(3)) > 0.1)
			scroll.scrollTop += axis(3) * dt * 400;
	} else if (state.screen === "tune") {
		if (edge(2)) submitNote(0);
		if (edge(3)) submitNote(1);
		if (edge(1)) submitNote(2);
		if (edge(9) && !down(8)) pause();
	} else if (state.screen === "map") {
		if (edge(1) || edge(4) || edge(9)) toggleMap();
	} else if (state.screen === "play") {
		if (hasInput) {
			input.x = axis(0);
			input.y = axis(1);
		}
		input.sneak = down(1) || input.sneak;
		input.boost = pad.buttons[7]?.value > 0.2 || input.boost;
		input.lift = down(0) || input.keys.has(" ");
		cameraYaw -= axis(2) * dt * 1.8 * settings.sensitivity;
		cameraPitch = clamp(cameraPitch - axis(3) * dt * 1.1, 0.35, 1.1);
		if (edge(0)) interact();
		if (edge(2)) pulse();
		if (edge(5)) throwCandy();
		if (edge(4)) toggleMap();
		if (edge(9) && !down(8)) pause();
	}
	input.padPrev = pad.buttons.map((_, i) => down(i));
}
bind("begin", () => {
	noteInput(input.type);
	startGame();
});
bind("onlineBtn", () => openMenu("online"));
bind("settingsBtn", () => openMenu("settings"));
bind("aboutBtn", () => openMenu("about"));
bind("pauseButton", pause);
bind("action", () => {
	noteInput(input.type);
	interact();
});
bind("touchPulse", () => {
	noteInput("touch");
	pulse();
});
$("#touchPulse").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	noteInput("touch");
	input.lift = true;
});
$("#touchPulse").addEventListener("pointerup", () => (input.lift = false));
bind("closeMap", toggleMap);
$$("#tuneNotes button").forEach((b) => {
	b.onclick = () => submitNote(Number(b.dataset.note));
});
bind("replayTune", () => {
	if (!state.tunePlaying) playPattern();
});
bind("leaveTune", () => {
	state.screen = "play";
	$("#tuneOverlay").classList.add("hidden");
});
function updateCamera(dt) {
	const titleView =
		state.screen === "title" ||
		(state.screen === "menu" && menuBase === "title");
	if (titleView) {
		const t = settings.motion ? Math.sin(state.elapsed * 0.09) * 1.2 : 0;
		camera.position.lerp(
			new THREE.Vector3(23 + t, 13.5, 30),
			Math.min(1, dt * 2),
		);
		lookTarget.lerp(new THREE.Vector3(1, 3, -7), Math.min(1, dt * 2));
	} else {
		const p = player.root.position,
			flight = state.phase === "flight",
			dist = flight ? 19 : camDistance + (innerWidth < 600 ? 8 : 0),
			pitch = flight ? 0.25 : cameraPitch;
		const desired = new THREE.Vector3(
			p.x + Math.sin(cameraYaw) * dist * Math.cos(pitch),
			p.y + Math.sin(pitch) * dist + (flight ? 4 : 0),
			p.z + Math.cos(cameraYaw) * dist * Math.cos(pitch),
		);
		camera.position.lerp(desired, Math.min(1, dt * (settings.motion ? 4 : 12)));
		lookTarget.lerp(
			new THREE.Vector3(p.x, p.y + (flight ? 2 : 1), p.z - (flight ? 7 : 2)),
			Math.min(1, dt * 6),
		);
		if (flight) {
			skyMoon.position.set(-22, 38, p.z - 75);
			skyMoon.scale.setScalar(35);
		} else {
			skyMoon.position.set(-29, 27, -90);
			skyMoon.scale.set(29, 29, 1);
		}
	}
	camera.lookAt(lookTarget);
}


let hubInfo = null,
	hubStarted = false,
	hubPending = false,
	hubEnded = false,
	club = null,
	roomDigits = [0, 0, 0, 0];
const seatColors = ["#f4bc80", "#82c7ef", "#97ddb5", "#d6b1ec"];
function raceScore() {
	return (
		state.parts.filter(Boolean).length * 1000 +
		(state.friend ? 1000 : 0) +
		(state.signal ? 2500 : 0) +
		(state.mounted ? 1000 : 0) +
		(phaseOrder.indexOf(state.phase) >= 4 ? 2000 : 0) +
		(state.won ? 10000 : 0) +
		state.healed * 100 +
		state.rings * 180 +
		Math.max(0, -body.translation().z)
	);
}
function ownPacket() {
	const p = body.translation();
	return {
		x: +p.x.toFixed(2),
		y: +p.y.toFixed(2),
		z: +p.z.toFixed(2),
		a: +player.root.rotation.y.toFixed(2),
		phase: state.phase,
		mounted: !!state.mounted,
		score: Math.round(raceScore()),
		time: +state.time.toFixed(1),
		won: state.won,
	};
}
function receiveGhost(id, data, name, color) {
	if (
		!data ||
		!["x", "y", "z", "a"].every((k) => Number.isFinite(data[k])) ||
		Math.abs(data.x) > 100 ||
		Math.abs(data.z) > 500 ||
		Math.abs(data.y) > 100 ||
		!phaseOrder.includes(data.phase)
	)
		return;
	let g = ghosts.get(id);
	if (!g) {
		const kid = makeKid(new THREE.Color(color).getHex()),
			b = makeBike(new THREE.Color(color).getHex()),
			root = new THREE.Group();
		root.add(kid.root, b);
		scene.add(root);
		root.traverse((o) => {
			if (o.isMesh) {
				o.material = o.material.clone();
				o.material.transparent = true;
				o.material.opacity = 0.45;
				o.material.depthWrite = false;
			}
		});
		const label = textSprite(String(name).slice(0, 24), color, 0.55);
		label.position.y = 3.7;
		root.add(label);
		g = { root, kid, bike: b, label, data: null, color, name, age: 0 };
		ghosts.set(id, g);
	}
	g.data = data;
	g.age = 0;
	g.root.visible = true;
}
function removeGhost(id) {
	const g = ghosts.get(id);
	if (!g) return;
	scene.remove(g.root);
	g.root.traverse((o) => {
		if (o.isMesh) o.material.dispose();
	});
	const i = mixers.indexOf(g.kid.mixer);
	if (i >= 0) mixers.splice(i, 1);
	ghosts.delete(id);
}
function updateGhosts(dt) {
	const p = body.translation();
	for (const g of ghosts.values()) {
		g.age += dt;
		const d = g.data;
		if (!d) continue;
		g.root.visible =
			g.age < 12 && Math.abs(d.z - p.z) < 95 && d.phase !== "ending";
		g.root.position.lerp(
			new THREE.Vector3(d.x, d.y - 0.85, d.z),
			Math.min(1, dt * 12),
		);
		g.root.rotation.y = d.a;
		g.bike.visible = d.mounted;
		g.kid.rig.position.y = d.mounted ? 0.5 : 0;
		g.kid.walk.paused = d.mounted;
		g.kid.walk.setEffectiveWeight(d.mounted ? 0 : 1);
		g.kid.pedal.paused = !d.mounted;
		g.kid.pedal.setEffectiveWeight(d.mounted ? 1 : 0);
		g.label.quaternion.copy(camera.quaternion);
	}
}
function networkUpdate() {
	if (hubEnded) return;
	if (AIHub.active && hubInfo && hubStarted) {
		AIHub.send(ownPacket(), { reliable: false });
		AIHub.progress({
			score: Math.round(raceScore()),
			label: state.won
				? "Home · " + formatTime(state.time)
				: state.parts.filter(Boolean).length + "/3 pieces · " + state.phase,
		});
	} else if (club?.started) club.send({ kind: "ghost", state: ownPacket() });
}
function finishNetwork(timedOut = false) {
	if (state.reported) return;
	state.reported = true;
	if (AIHub.active && hubStarted) {
		const stats = {
			"Flowers healed": state.healed,
			"Stars touched": state.rings,
			"Close calls": state.catches,
		};
		if (state.won && !timedOut)
			AIHub.result({ time: Math.max(0, Math.round(AIHub.time())), stats });
		else AIHub.result({ score: Math.round(raceScore()), stats });
	} else if (club?.started) club.send({ kind: "ghost", state: ownPacket() });
}
function updateRaceUI() {
	const el = $("#raceStrip");
	if (!((AIHub.active && hubStarted) || club?.started)) {
		el.replaceChildren();
		return;
	}
	el.replaceChildren();
	const own = document.createElement("div");
	own.textContent =
		"YOU · " +
		(state.won
			? "HOME " + formatTime(state.time)
			: state.parts.filter(Boolean).length + "/3 · " + formatTime(state.time));
	el.append(own);
	for (const g of ghosts.values()) {
		const e = document.createElement("div");
		e.style.borderColor = g.color;
		e.textContent =
			g.name +
			" · " +
			(g.data.won
				? "HOME " + formatTime(g.data.time)
				: Math.floor((g.data.score || 0) / 1000) + " ✦");
		el.append(e);
	}
	const results = $("#clubResults");
	if (results && club?.started) {
		results.replaceChildren();
		const riders = [
			{ name: "You", data: ownPacket(), color: seatColors[club.slot] },
			...[...ghosts.values()].map((g) => ({
				name: g.name,
				data: g.data,
				color: g.color,
			})),
		]
			.filter((g) => g.data)
			.sort((a, b) =>
				a.data.won && b.data.won
					? a.data.time - b.data.time
					: a.data.won
						? -1
						: b.data.won
							? 1
							: b.data.score - a.data.score,
			);
		for (const [i, r] of riders.entries()) {
			const row = document.createElement("p");
			row.className = "note";
			row.style.color = r.color;
			row.textContent =
				i +
				1 +
				". " +
				r.name +
				" · " +
				(r.data.won ? "Home in " + formatTime(r.data.time) : "Still riding");
			results.append(row);
		}
	}
}
async function initializeHub() {
	if (!AIHub.active) return false;
	state.screen = "hubWaiting";
	$("#title").classList.add("hidden");
	hubInfo = await AIHub.connect({ mode: "ghost", seats: [1, 4] });
	if (!hubInfo) {
		state.screen = "title";
		showTitle();
		return false;
	}
	AIHub.on("start", () => {
		hubPending = true;
		state.screen = "hubCountdown";
		splash(
			"THE MOONLIGHT CLUB",
			"A little company for the ride.",
			"Your adventure begins together.",
		);
	});
	AIHub.on("message", (data, from) => {
		if (hubEnded) return;
		const p = hubInfo.players.find((p) => p.id === from);
		if (p) receiveGhost(from, data, p.name, p.color);
	});
	AIHub.on("leave", ({ id }) => removeGhost(id));
	AIHub.on("time-up", () => finishNetwork(true));
	AIHub.on("end", () => {
		hubEnded = true;
		hubPending = false;
		state.screen = "hubEnded";
		state.auto = false;
		input.keys.clear();
		audio.mute(true);
		$("#menuLayer").classList.add("hidden");
		$("#tuneOverlay").classList.add("hidden");
		$("#chapterSplash").classList.add("hidden");
	});
	return true;
}

class MoonClub {
	constructor(code, host) {
		this.code = code;
		this.host = host;
		this.uid = crypto.randomUUID();
		this.members = new Map();
		this.connections = new Map();
		this.started = false;
		this.peer = null;
		this.sequence = 0;
		this.seen = new Map();
		this.status = host
			? "Room " + code + " is open on this device. Connecting the wider sky…"
			: "Looking for room " + code + "…";
		this.localOnly = query.has("localNetwork");
		this.channel = new BroadcastChannel("etlaf-room-" + code);
		this.channel.onmessage = (e) => this.receive(e.data, "local");
		this.slot = host ? 0 : 1;
		this.members.set(this.uid, {
			id: this.uid,
			name: host ? "Rider 1" : "A new rider",
			color: seatColors[this.slot],
			slot: this.slot,
		});
		this.helloTimer = setInterval(() => {
			if (!this.started) this.raw({ kind: "hello", host: this.host });
		}, 1200);
		this.heartbeat = setInterval(() => {
			if (this.host) this.announce();
		}, 2500);
		this.raw({ kind: "hello", host });
		this.connectPeer();
	}
	async connectPeer() {
		if (this.localOnly) {
			this.status = this.host
				? "Room " + this.code + " is ready. Local test transport."
				: "Looking for a nearby room…";
			this.refresh();
			return;
		}
		try {
			const { default: Peer } = await import(
				"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm"
			);
			if (this.closed) return;
			this.peer = new Peer(this.host ? "etlaf-night-" + this.code : undefined, {
				debug: 0,
			});
			this.peer.on("open", () => {
				this.status = this.host
					? "Room " +
						this.code +
						" is open. Share the four digits with your friends."
					: "Calling room " + this.code + "…";
				if (!this.host)
					this.addConnection(
						this.peer.connect("etlaf-night-" + this.code, {
							reliable: true,
							metadata: { uid: this.uid },
						}),
					);
				this.refresh();
			});
			this.peer.on("connection", (conn) => {
				if (this.host) this.addConnection(conn);
			});
			this.peer.on("error", (err) => {
				this.status =
					err.type === "unavailable-id"
						? "Those digits are already in use online. Create a new room."
						: this.members.size > 1
							? "Nearby riders are connected. Internet signaling is unavailable."
							: "Internet signaling is unavailable. Nearby tabs can still join this room.";
				this.refresh();
			});
		} catch {
			this.status =
				"Internet signaling is unavailable. Nearby tabs can still join this room.";
			this.refresh();
		}
	}
	addConnection(conn) {
		conn.on("open", () => {
			this.connections.set(conn.peer, conn);
			this.raw({ kind: "hello", host: this.host });
		});
		conn.on("data", (data) => {
			this.receive(data, "peer", conn);
		});
		conn.on("close", () => {
			this.connections.delete(conn.peer);
			if (this.host && conn.metadata?.uid) {
				this.remove(conn.metadata.uid);
				this.announce();
			} else if (!this.host) this.hostGone();
		});
		conn.on("error", () => {
			this.connections.delete(conn.peer);
		});
	}
	raw(msg) {
		if (this.closed) return;
		const packet = { ...msg, uid: this.uid, seq: ++this.sequence };
		this.channel.postMessage(packet);
		for (const c of this.connections.values()) if (c.open) c.send(packet);
	}
	send(msg) {
		this.raw(msg);
	}
	receive(packet, transport, conn) {
		if (
			this.closed ||
			!packet ||
			typeof packet !== "object" ||
			packet.uid === this.uid ||
			typeof packet.uid !== "string" ||
			!Number.isFinite(packet.seq)
		)
			return;
		const previous = this.seen.get(packet.uid) || 0;
		if (packet.seq <= previous) return;
		this.seen.set(packet.uid, packet.seq);
		if (this.host) {
			if (transport === "peer") this.channel.postMessage(packet);
			for (const c of this.connections.values())
				if (c !== conn && c.open) c.send(packet);
		}
		if (packet.kind === "hello") {
			if (this.host && !packet.host) {
				if (!this.members.has(packet.uid) && this.members.size < 4) {
					const taken = new Set([...this.members.values()].map((m) => m.slot)),
						slot = [1, 2, 3].find((i) => !taken.has(i));
					this.members.set(packet.uid, {
						id: packet.uid,
						name: "Rider " + (slot + 1),
						color: seatColors[slot],
						slot,
					});
				}
				this.announce();
			} else if (!this.host && packet.host) this.hostUid = packet.uid;
		} else if (packet.kind === "roster" && !this.host) {
			if (!Array.isArray(packet.members) || packet.members.length > 4) return;
			this.hostUid = packet.uid;
			this.members = new Map(packet.members.map((m) => [m.id, m]));
			const me = this.members.get(this.uid);
			if (!me) {
				this.status =
					"This little club is full. Four riders can share the night.";
			} else {
				this.slot = me.slot;
				this.status =
					"Connected to room " + this.code + ". The host starts the ride.";
			}
			this.refresh();
		} else if (
			packet.kind === "start" &&
			!this.host &&
			packet.uid === this.hostUid
		)
			this.beginRound(packet.at);
		else if (packet.kind === "ghost" && this.started) {
			const m = this.members.get(packet.uid);
			if (m) receiveGhost(packet.uid, packet.state, m.name, m.color);
		} else if (packet.kind === "leave") {
			if (packet.uid === this.hostUid && !this.host) this.hostGone();
			else {
				this.remove(packet.uid);
				if (this.host) this.announce();
			}
		}
	}
	announce() {
		if (!this.host || this.closed) return;
		this.raw({ kind: "roster", members: [...this.members.values()] });
		this.refresh();
	}
	remove(id) {
		this.members.delete(id);
		removeGhost(id);
		this.refresh();
	}
	start() {
		if (!this.host) return;
		const at = Date.now() + 1700;
		this.announce();
		this.raw({ kind: "start", at });
		this.beginRound(at);
	}
	beginRound(at) {
		this.started = true;
		this.startAt = at;
		clearTimeout(this.startTimer);
		this.startTimer = setTimeout(
			() => {
				if (
					!this.closed &&
					this.started &&
					club === this &&
					this.startAt !== null
				) {
					this.startAt = null;
					startGame();
				}
			},
			Math.max(0, at - Date.now()),
		);
		this.status = "The night starts together…";
		menu = "none";
		$("#menuLayer").classList.add("hidden");
		$("#title").classList.add("hidden");
		state.screen = "clubCountdown";
		splash(
			"THE MOONLIGHT CLUB",
			"Same moon. Different bicycles.",
			"Three little things. One big ride home.",
		);
	}
	hostGone() {
		this.started = false;
		this.status = "The host left the club. Your solo adventure can continue.";
		this.hostUid = null;
		toast(this.status, 6);
		if (state.screen === "clubCountdown") showTitle();
	}
	refresh() {
		if (menu === "online") renderOnline();
	}
	leave() {
		if (this.closed) return;
		this.raw({ kind: "leave" });
		this.closed = true;
		clearInterval(this.helloTimer);
		clearInterval(this.heartbeat);
		clearTimeout(this.startTimer);
		this.channel.close();
		this.peer?.destroy();
		for (const id of [...ghosts.keys()]) removeGhost(id);
		if (club === this) club = null;
	}
}
function renderOnline() {
	const room = club;
	if (room) {
		const members = [...room.members.values()].sort((a, b) => a.slot - b.slot);
		panel(
			'<div class="kicker">THE MOONLIGHT CLUB · 1–4 RIDERS</div><h2>Room ' +
				escapeHTML(room.code) +
				"</h2><p>" +
				escapeHTML(room.status) +
				'</p><div class="menu-list">' +
				members
					.map(
						(m) =>
							'<div style="font-size:23px;padding:12px;border-left:3px solid ' +
							m.color +
							'">' +
							escapeHTML(m.name) +
							(m.id === room.uid ? " · you" : "") +
							"</div>",
					)
					.join("") +
				'</div><p class="note">Everyone gets their own adventure. Your friends appear as colored ghost riders. The fastest homecoming wins. No collisions, no chat, just a little company.</p><div class="menu-list">' +
				(room.host ? btn("clubStart", "Ride together", "primary") : "") +
				btn("clubLeave", "Leave the club") +
				"</div>",
		);
		bind("clubStart", () => room.start());
		bind("clubLeave", () => {
			room.leave();
			renderOnline();
		});
		return;
	}
	panel(
		'<div class="kicker">THE MOONLIGHT CLUB</div><h2>The same moon,<br>a little company.</h2><p>Invite up to three friends for a ghost ride. Share four digits, gather the telephone parts, and see who gets their friend home first.</p><div class="menu-list">' +
			btn("createRoom", "Make a room", "primary") +
			'</div><p class="note" style="text-align:center;margin-bottom:8px">Or enter your friend’s four digits. Select a digit to change it. Left / right adjusts it.</p><div class="room-row">' +
			roomDigits
				.map(
					(d, i) =>
						'<button class="room-digit" id="digit' +
						i +
						'" data-digit="' +
						i +
						'">' +
						d +
						"</button>",
				)
				.join("") +
			'</div><div class="menu-list">' +
			btn("joinRoom", "Join this room") +
			'</div><p class="note">Internet play uses WebRTC with PeerJS signaling. Nearby browser tabs can connect directly. Each rider needs the game open; no account is required.</p>' +
			btn("menuBack", "Back", "back"),
	);
	bind("createRoom", () => {
		club?.leave();
		const bytes = new Uint16Array(1);
		crypto.getRandomValues(bytes);
		club = new MoonClub(String(1000 + (bytes[0] % 9000)), true);
		renderOnline();
	});
	bind("joinRoom", () => {
		club?.leave();
		club = new MoonClub(roomDigits.join(""), false);
		renderOnline();
	});
	roomDigits.forEach((_, i) => {
		bind("digit" + i, () => {
			roomDigits[i] = (roomDigits[i] + 1) % 10;
			renderOnline();
			$("#digit" + i).focus();
		});
	});
	bind("menuBack", menuBack);
}
window.addEventListener("beforeunload", () => club?.leave());


async function boot() {
	try {
		await RAPIER.init();
		world = new RAPIER.World({ x: 0, y: -14, z: 0 });
		gradient = new THREE.DataTexture(
			new Uint8Array([90, 154, 215, 255]),
			4,
			1,
			THREE.RedFormat,
		);
		gradient.minFilter = THREE.NearestFilter;
		gradient.magFilter = THREE.NearestFilter;
		gradient.needsUpdate = true;
		glowMap = glowTexture();
		$("#loadStatus").textContent = "Turning on the porch lights…";
		renderer = new THREE.WebGPURenderer({
			canvas: $("#world"),
			antialias: true,
			forceWebGL: query.get("renderer") === "webgl",
			powerPreference: "high-performance",
		});
		renderer.setPixelRatio(window.devicePixelRatio || 1);
		renderer.setSize(innerWidth, innerHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		await renderer.init();
		camera = new THREE.PerspectiveCamera(
			48,
			innerWidth / innerHeight,
			0.1,
			400,
		);
		camera.position.set(23, 13.5, 30);
		lookTarget.set(1, 3, -7);
		camera.lookAt(lookTarget);
		buildWorld();
		window.addEventListener("resize", () => {
			camera.aspect = innerWidth / innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(innerWidth, innerHeight);
		});
		await renderer.compileAsync(scene, camera);
		$("#loading").classList.add("hidden");
		if (await initializeHub()) AIHub.ready();
		else showTitle();
		if (!AIHub.active && query.has("room")) {
			roomDigits = String(query.get("room"))
				.padStart(4, "0")
				.slice(0, 4)
				.split("")
				.map(Number);
			openMenu("online");
			club = new MoonClub(roomDigits.join(""), false);
			renderOnline();
		}
		lastFrame = performance.now();
		renderer.setAnimationLoop(frame);
		installDebug();
		document.body.dataset.ready = "true";
	} catch (error) {
		console.error(error);
		$("#loadStatus").textContent =
			"The porch light didn’t come on. " + error.message;
		const b = document.createElement("button");
		b.textContent = "Try the WebGL compatibility path";
		b.onclick = () => {
			if (AIHub.active) {
				AIHub.fail(error.message);
				return;
			}
			const u = new URL(location.href);
			u.searchParams.set("renderer", "webgl");
			location.href = u.href;
		};
		$("#loading").append(b);
		if (AIHub.active) AIHub.fail(error.message);
		window.__bootError = error.message;
	}
}
function frame(now) {
	const dt = Math.min(0.08, (now - lastFrame) / 1000 || 0.016);
	lastFrame = now;
	pollInput(dt);
	if (hubPending && !hubEnded && AIHub.time() >= 0) {
		hubPending = false;
		hubStarted = true;
		startGame();
	}
	if (state.screen === "title" && now - input.last >= 10000 && !AIHub.active)
		startGame(true);
	if (!window.__manualStep) {
		accumulator += dt;
		let count = 0;
		while (accumulator >= 1 / 60 && count < 5) {
			tick(1 / 60);
			accumulator -= 1 / 60;
			count++;
		}
	}
	updateGhosts(dt);
	updateCamera(dt);
	renderer.render(scene, camera);
}
function snapshot() {
	const p = body.translation();
	return {
		screen: state.screen,
		phase: state.phase,
		position: { x: p.x, y: p.y, z: p.z },
		parts: [...state.parts],
		bond: state.bond,
		alert: state.alert,
		candy: state.candy,
		healed: state.healed,
		rings: state.rings,
		catches: state.catches,
		friend: state.friend,
		crateMoved: state.crateMoved,
		gateOpen: state.gateOpen,
		signal: state.signal,
		mounted: state.mounted,
		won: state.won,
		time: state.time,
		auto: state.auto,
		attract: state.attract,
		renderer: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
		rapier: RAPIER.version(),
		three: THREE.REVISION,
		ghosts: [...ghosts.keys()],
		hub: { active: AIHub.active, started: hubStarted, ended: hubEnded },
		audio: {
			events: audio.events,
			voices: audio.voiceCount,
			music: audio.musicCount,
			musicVolume: audio.musicVolume,
			...audio.levels(),
		},
		settings: { ...settings },
		tuning: { ...tuning },
		context: nearestContext()?.type || null,
		lastMenuAction: state.lastMenuAction || null,
		guards: guards.map((g) => ({
			x: g.x,
			z: g.z,
			angle: g.angle,
			stun: g.stun,
			distracted: !!g.distraction,
		})),
		frames: renderer.info.render.frame,
		drawCalls: renderer.info.render.calls,
		room: club
			? {
					code: club.code,
					host: club.host,
					started: club.started,
					members: club.members.size,
					status: club.status,
				}
			: null,
		autoRoute: autoRouteName,
		autoStep,
	};
}
function installDebug() {
	window.__game = { snapshot, ready: true };
	if (testMode)
		Object.assign(window.__game, {
			start: () => startGame(),
			title: showTitle,
			step: (seconds) => {
				window.__manualStep = true;
				for (let i = 0; i < Math.round(seconds * 60); i++) tick(1 / 60);
				updateCamera(1);
				return snapshot();
			},
			manual: (on) => (window.__manualStep = on),
			auto: (on) => {
				state.auto = on;
				autoRouteName = "";
				autoStep = 0;
			},
			teleport: (x, z, y = 0.85) => putPlayer(x, z, y),
			action: interact,
			pulse,
			candy: throwCandy,
			tune: submitNote,
			playPattern,
			devJump,
			pause,
			openMenu,
			context: nearestContext,
			input: (x, y) => {
				input.x = x;
				input.y = y;
			},
			set: (values) => Object.assign(tuning, values),
			setState: (values) => Object.assign(state, values),
			idle: (seconds) => (input.last = performance.now() - seconds * 1000),
			unlock: () => audio.unlock(),
			offlineAudio: async () => {
				const context = new OfflineAudioContext(1, 72000, 48000),
					synth = new window.NightAudio();
				await synth.unlock(context);
				synth.sfx("pulse");
				synth.voice();
				synth.update("flight");
				const rendered = await context.startRendering(),
					samples = rendered.getChannelData(0);
				let peak = 0,
					sum = 0;
				for (const v of samples) {
					peak = Math.max(peak, Math.abs(v));
					sum += v * v;
				}
				return {
					peak,
					rms: Math.sqrt(sum / samples.length),
					events: synth.events,
					voices: synth.voiceCount,
					music: synth.musicCount,
					musicVolume: synth.musicVolume,
				};
			},
			sound: (kind) => audio.sfx(kind),
			voice: () => audio.voice(),
			createRoom: (code) => {
				club?.leave();
				club = new MoonClub(code, true);
			},
			joinRoom: (code) => {
				club?.leave();
				club = new MoonClub(code, false);
			},
			startRoom: () => club.start(),
			leaveRoom: () => club?.leave(),
			ghosts: () =>
				[...ghosts.values()].map((g) => ({
					name: g.name,
					visible: g.root.visible,
					data: g.data,
				})),
			getTune: () => ({
				playing: state.tunePlaying,
				round: state.tuneRound,
				index: state.tuneIndex,
				clock: state.tuneClock,
			}),
			render: () => {
				updateCamera(1);
				renderer.render(scene, camera);
			},
			capture: () => renderer.domElement.toDataURL("image/png"),
		});
}
boot();
