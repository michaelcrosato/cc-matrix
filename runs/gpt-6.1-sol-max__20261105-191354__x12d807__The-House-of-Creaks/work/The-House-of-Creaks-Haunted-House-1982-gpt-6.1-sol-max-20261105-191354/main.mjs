import {
	color,
	float,
	normalWorld,
	positionWorld,
	uniform,
	vec3,
} from "three/tsl";
import * as THREE from "three/webgpu";
import {
	clamp,
	DEFAULTS,
	dist,
	FLOOR_NAMES,
	HouseGame,
	ITEM_NAMES,
	NOTES,
	PROP_BOXES,
	ROOM_CENTERS,
	ROOM_NAMES,
	roomAt,
	SAFE,
	STAIRS,
} from "./core.mjs";

const $ = (s) => document.querySelector(s),
	$$ = (s) => [...document.querySelectorAll(s)];
const _TITLE = "The House of Creaks",
	SAVE_KEY = "creaks-night-v1",
	PREF_KEY = "creaks-settings-v1";
const safeRead = (k, d) => {
		try {
			return JSON.parse(localStorage.getItem(k)) || d;
		} catch {
			return d;
		}
	},
	safeWrite = (k, v) => {
		try {
			localStorage.setItem(k, JSON.stringify(v));
		} catch {}
	};
const settings = {
	music: 0.1,
	sfx: 0.7,
	glyphs: "ps",
	motion: true,
	contrast: false,
	difficulty: "restless",
	...safeRead(PREF_KEY, {}),
};
let game,
	renderer,
	scene,
	camera,
	interior,
	exterior,
	weather,
	moon,
	moonHalo,
	renderFloor = -1,
	screen = "loading",
	previousScreen = "title",
	paused = false,
	mapFloor = 0,
	lastInput = "keyboard",
	menuIndex = 0,
	lastActivity = performance.now(),
	toastUntil = 0,
	_lastRoom = "",
	lastRevision = -1,
	lastSave = 0,
	lastNetSend = 0,
	lastFrame = performance.now(),
	accumulator = 0,
	frameCount = 0,
	gpuFrames = 0;
let titleTime = 0,
	attract = false,
	attractTime = 0,
	attractPhase = 0,
	attractPath = [],
	attractTarget = null,
	debugCollisions = false,
	devUsed = false,
	hubInfo = null,
	hubStarted = false,
	hubEnded = false,
	hubFinished = false,
	netEnded = false,
	_audioReady = false;
const keys = new Set(),
	pulses = {},
	mixers = [],
	avatars = new Map(),
	enemyModels = new Map(),
	itemModels = new Map(),
	effects = [],
	touches = new Map();
const view = {
	yaw: 0.64,
	height: 29,
	target: new THREE.Vector3(),
	pos: new THREE.Vector3(),
	shake: 0,
};
const shaderLight = uniform(new THREE.Vector3(0, 1, 5)),
	shaderFlame = uniform(0),
	shaderAmbient = uniform(0.92);
const materials = new Map(),
	ink = new THREE.MeshBasicMaterial({ color: 0x07171f, side: THREE.BackSide });
const _PALETTE = {
	wall: "#376363",
	wallDark: "#244850",
	wood: "#4b5555",
	trim: "#b6b790",
	brass: "#d6ae66",
	roof: "#285458",
	roofDark: "#1b3b47",
	purple: "#766079",
	mint: "#79b9ac",
	cream: "#e4d5b1",
	rug: "#5d415c",
};
const geometry = {
	box: new THREE.BoxGeometry(1, 1, 1),
	sphere: new THREE.SphereGeometry(1, 10, 7),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
	cone: new THREE.ConeGeometry(1, 1, 8),
};
function mat(hex, glow = false) {
	const key = `${hex}-${glow}`;
	if (materials.has(key)) return materials.get(key);
	const m = new THREE.MeshBasicNodeMaterial({ side: THREE.FrontSide });
	const band = normalWorld
		.dot(vec3(0.35, 0.82, 0.4))
		.max(0)
		.mul(3)
		.floor()
		.div(3)
		.mul(0.48)
		.add(0.52);
	const local = float(1)
		.sub(positionWorld.distance(shaderLight).div(8))
		.clamp(0, 1)
		.mul(shaderFlame);
	m.colorNode = glow
		? color(hex)
		: color(hex)
				.mul(band.mul(shaderAmbient.add(local.mul(0.6))))
				.add(color("#e5b165").mul(local.mul(0.1)));
	materials.set(key, m);
	return m;
}
function mesh(parent, type, pos, scale, hex, outline = true) {
	const o = new THREE.Mesh(geometry[type] || geometry.box, mat(hex));
	o.position.set(...pos);
	o.scale.set(...scale);
	parent.add(o);
	if (outline) {
		const edge = new THREE.Mesh(o.geometry, ink);
		edge.scale.set(1.025, 1.025, 1.025);
		o.add(edge);
	}
	return o;
}
function orb(parent, x, y, z, r, hex, outline = true) {
	return mesh(parent, "sphere", [x, y, z], [r, r, r], hex, outline);
}
function beam(parent, a, b, r, hex) {
	const d = new THREE.Vector3().subVectors(
			new THREE.Vector3(...b),
			new THREE.Vector3(...a),
		),
		m = mesh(
			parent,
			"cylinder",
			[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
			[r, d.length(), r],
			hex,
		);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
	return m;
}
function flat(parent, x, z, w, d, hex, y = 0.03) {
	return mesh(parent, "box", [x, y, z], [w, 0.06, d], hex, false);
}
function ring(parent, x, y, z, r, hex) {
	const g = new THREE.TorusGeometry(r, 0.035, 5, 40),
		m = new THREE.Mesh(g, mat(hex, true));
	m.rotation.x = -Math.PI / 2;
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}
function shadow(parent, x, z, r = 0.7, opacity = 0.26) {
	const m = new THREE.Mesh(
		new THREE.CircleGeometry(r, 24),
		new THREE.MeshBasicMaterial({
			color: 0x06151d,
			transparent: true,
			opacity,
			depthWrite: false,
		}),
	);
	m.rotation.x = -Math.PI / 2;
	m.position.set(x, 0.09, z);
	parent.add(m);
	return m;
}
function nativeAnimation(root, clip) {
	const mixer = new THREE.AnimationMixer(root);
	mixer.clipAction(clip).play();
	mixers.push(mixer);
	return mixer;
}
function makeEyes(parent, y = 1.3, z = 0.37, scale = 1, white = true) {
	const group = new THREE.Group();
	group.name = "eyes";
	group.position.set(0, y, z);
	for (const side of [-1, 1]) {
		const eye = orb(
			group,
			side * 0.16 * scale,
			0,
			0,
			0.13 * scale,
			white ? "#fff0c6" : "#15262d",
			false,
		);
		eye.scale.y *= 1.45;
		if (white) eye.material = mat("#fff0c6", true);
		if (white)
			orb(
				group,
				side * 0.16 * scale + 0.025 * scale,
				-0.015 * scale,
				0.115 * scale,
				0.045 * scale,
				"#17252a",
				false,
			);
	}
	parent.add(group);
	return group;
}
function createAvatar(p) {
	const root = new THREE.Group(),
		body = new THREE.Group();
	body.name = "body";
	root.add(body);
	const s = shadow(root, 0, 0, 0.48, 0.4);
	mesh(body, "cone", [0, 0.62, 0], [0.5, 1.15, 0.45], p.color);
	orb(body, 0, 1.2, 0, 0.38, "#142c35");
	mesh(body, "cone", [0, 1.48, -0.04], [0.44, 0.55, 0.4], "#263e46");
	const eyes = makeEyes(body, 1.26, 0.31, 1.05);
	const left = orb(root, -0.19, 0.16, 0, 0.14, "#162831");
	left.name = "leftFoot";
	const right = orb(root, 0.19, 0.16, 0, 0.14, "#162831");
	right.name = "rightFoot";
	const hand = orb(body, 0.48, 0.88, 0.1, 0.13, p.color);
	hand.name = "hand";
	const flame = new THREE.Group();
	flame.position.set(0.5, 1.17, 0.1);
	const _stick = mesh(
		flame,
		"cylinder",
		[0, -0.15, 0],
		[0.022, 0.35, 0.022],
		"#e3cf9d",
	);
	const fire = mesh(
		flame,
		"sphere",
		[0, 0.05, 0],
		[0.1, 0.19, 0.1],
		"#ffce72",
		false,
	);
	fire.material = mat("#ffda83", true);
	orb(flame, 0, 0.03, 0.02, 0.05, "#fff4cd", false).material = mat(
		"#fff5bd",
		true,
	);
	body.add(flame);
	flame.visible = false;
	const hold = new THREE.Group();
	hold.position.set(-0.48, 0.85, 0.05);
	body.add(hold);
	const idle = new THREE.AnimationClip("breath", 2.4, [
		new THREE.NumberKeyframeTrack(
			"body.position[y]",
			[0, 1.2, 2.4],
			[0, 0.075, 0],
		),
		new THREE.NumberKeyframeTrack(
			"eyes.scale[y]",
			[0, 2, 2.08, 2.18, 2.4],
			[1, 1, 0.06, 1, 1],
		),
	]);
	const mixer = new THREE.AnimationMixer(root);
	mixer.clipAction(idle).play();
	const walk = mixer.clipAction(
		new THREE.AnimationClip("walk", 0.6, [
			new THREE.NumberKeyframeTrack(
				"leftFoot.position[z]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[0, 0.18, 0, -0.18, 0],
			),
			new THREE.NumberKeyframeTrack(
				"rightFoot.position[z]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[0, -0.18, 0, 0.18, 0],
			),
			new THREE.NumberKeyframeTrack(
				"body.rotation[z]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[0, 0.055, 0, -0.055, 0],
			),
		]),
	);
	walk.play();
	mixers.push(mixer);
	root.userData = {
		body,
		eyes,
		flame,
		fire,
		hand,
		hold,
		walk,
		mixer,
		shadow: s,
		carry: null,
	};
	scene.add(root);
	avatars.set(p.id, root);
	return root;
}
function makeCreature(e, add = true) {
	const root = new THREE.Group(),
		body = new THREE.Group();
	body.name = "body";
	root.add(body);
	shadow(root, 0, 0, e.type === "ghost" ? 0.7 : 0.5, 0.22);
	if (e.type === "ghost") {
		orb(body, 0, 1.25, 0, 0.58, "#b5bac3");
		mesh(body, "cone", [0, 0.85, 0], [0.68, 1.45, 0.61], "#b5bac3");
		for (let i = 0; i < 7; i++)
			orb(
				body,
				Math.sin((i / 7) * Math.PI * 2) * 0.5,
				0.28,
				Math.cos((i / 7) * Math.PI * 2) * 0.42,
				0.2,
				"#b5bac3",
			);
		makeEyes(body, 1.35, 0.52, 0.95, false);
		orb(body, 0, 1.05, 0.59, 0.09, "#293c48", false);
		beam(body, [-0.4, 1.1, 0], [-0.8, 0.8, 0.15], 0.14, "#b5bac3");
		beam(body, [0.4, 1.1, 0], [0.8, 0.8, 0.15], 0.14, "#b5bac3");
		nativeAnimation(
			root,
			new THREE.AnimationClip("haunting", 3, [
				new THREE.NumberKeyframeTrack(
					"body.position[y]",
					[0, 1.5, 3],
					[0.1, 0.4, 0.1],
				),
				new THREE.NumberKeyframeTrack(
					"body.rotation[z]",
					[0, 1.5, 3],
					[-0.08, 0.08, -0.08],
				),
			]),
		);
	}
	if (e.type === "bat") {
		orb(body, 0, 1.6, 0, 0.24, "#574e68");
		mesh(body, "cone", [-0.14, 1.87, 0], [0.13, 0.28, 0.12], "#574e68");
		mesh(body, "cone", [0.14, 1.87, 0], [0.13, 0.28, 0.12], "#574e68");
		makeEyes(body, 1.67, 0.2, 0.55);
		for (const side of [-1, 1]) {
			const wing = new THREE.Group();
			wing.name = side < 0 ? "wingL" : "wingR";
			wing.position.set(side * 0.18, 1.6, 0);
			const sh = new THREE.Shape();
			sh.moveTo(0, 0);
			sh.lineTo(0.95 * side, 0.45);
			sh.lineTo(0.8 * side, -0.15);
			sh.quadraticCurveTo(0.53 * side, 0.1, 0.43 * side, -0.3);
			sh.quadraticCurveTo(0.2 * side, -0.1, 0, -0.25);
			sh.closePath();
			const w = new THREE.Mesh(
				new THREE.ShapeGeometry(sh),
				new THREE.MeshBasicMaterial({
					color: 0x71607e,
					side: THREE.DoubleSide,
				}),
			);
			wing.add(w);
			for (const n of [0, 0.43, 0.95])
				beam(
					wing,
					[0, 0, 0.01],
					[n * side, n === 0.95 ? 0.45 : -0.25, 0.01],
					0.017,
					"#15252e",
				);
			body.add(wing);
		}
		nativeAnimation(
			root,
			new THREE.AnimationClip("flutter", 0.34, [
				new THREE.NumberKeyframeTrack(
					"wingL.rotation[y]",
					[0, 0.17, 0.34],
					[-0.65, 0.7, -0.65],
				),
				new THREE.NumberKeyframeTrack(
					"wingR.rotation[y]",
					[0, 0.17, 0.34],
					[0.65, -0.7, 0.65],
				),
				new THREE.NumberKeyframeTrack(
					"body.position[y]",
					[0, 0.17, 0.34],
					[0, 0.1, 0],
				),
			]),
		);
	}
	if (e.type === "spider") {
		orb(body, 0, 0.5, 0, 0.41, "#746283");
		orb(body, 0, 0.43, 0.34, 0.26, "#9e87a1");
		makeEyes(body, 0.47, 0.54, 0.6);
		const tracks = [];
		for (let i = 0; i < 4; i++)
			for (const side of [-1, 1]) {
				const leg = new THREE.Group();
				leg.name = `leg${i}_${side}`;
				leg.position.set(side * 0.25, 0.45, (i - 1.5) * 0.18);
				beam(
					leg,
					[0, 0, 0],
					[side * 0.48, 0.13, (i - 1.5) * 0.19],
					0.037,
					"#574b68",
				);
				beam(
					leg,
					[side * 0.48, 0.13, (i - 1.5) * 0.19],
					[side * 0.68, -0.36, (i - 1.5) * 0.28],
					0.03,
					"#574b68",
				);
				body.add(leg);
				const a = i % 2 ? 0.1 : -0.1;
				tracks.push(
					new THREE.NumberKeyframeTrack(
						`${leg.name}.rotation[y]`,
						[0, 0.3, 0.6],
						[a, -a, a],
					),
				);
			}
		nativeAnimation(root, new THREE.AnimationClip("skitter", 0.6, tracks));
	}
	if (add) scene.add(root);
	return root;
}
function makeItem(id) {
	const root = new THREE.Group();
	if (id === "key") {
		ring(root, 0, 0.25, 0, 0.2, "#f2c56c").rotation.x = 0;
		beam(root, [0, 0.08, 0], [0, -0.47, 0], 0.055, "#efc477");
		mesh(root, "box", [0.1, -0.35, 0], [0.2, 0.08, 0.08], "#efc477");
		mesh(root, "box", [0.1, -0.48, 0], [0.2, 0.08, 0.08], "#efc477");
	} else if (id === "ward") {
		beam(root, [0, -0.5, 0], [0, 0.45, 0], 0.055, "#d3af74");
		const jewel = mesh(
			root,
			"sphere",
			[0, 0.55, 0],
			[0.19, 0.27, 0.19],
			"#9ee7c7",
		);
		jewel.material = mat("#a2ead0", true);
		ring(root, 0, 0.55, 0, 0.3, "#d6b679").rotation.x = 0.2;
	} else {
		const i = Number(id.at(-1));
		const g = new THREE.CylinderGeometry(
			i === 0 ? 0.32 : 0.26,
			i === 2 ? 0.15 : 0.36,
			0.5,
			7,
			1,
			true,
			0,
			Math.PI * 1.55,
		);
		const piece = new THREE.Mesh(g, mat("#e1b46f"));
		piece.rotation.z = 0.25;
		root.add(piece);
		ring(root, 0, 0.2, 0, 0.3, "#f2d494");
		mesh(root, "box", [-0.13, 0.05, 0.28], [0.08, 0.3, 0.06], "#4c8a82", false);
	}
	return root;
}
function candle(parent, x, z, safe = false) {
	const _base = mesh(
		parent,
		"cylinder",
		[x, 0.13, z],
		[safe ? 0.38 : 0.15, 0.2, safe ? 0.38 : 0.15],
		"#b39765",
	);
	mesh(
		parent,
		"cylinder",
		[x, safe ? 0.65 : 0.4, z],
		[0.09, safe ? 0.9 : 0.5, 0.09],
		"#edddb3",
	);
	const f = orb(parent, x, safe ? 1.17 : 0.73, z, 0.1, "#f1c16f", false);
	f.scale.y *= 1.8;
	f.material = mat("#ffda91", true);
	if (safe) {
		ring(parent, x, 0.08, z, 1.75, "#bba56e");
		for (let i = 0; i < 8; i++)
			flat(
				parent,
				x + Math.sin((i * Math.PI) / 4) * 1.55,
				z + Math.cos((i * Math.PI) / 4) * 1.55,
				0.12,
				0.12,
				"#d1b985",
				0.1,
			);
	}
}
function windowModel(parent, x, y, z, rot = 0, lit = true) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	g.rotation.y = rot;
	mesh(g, "box", [0, 0, 0], [1.35, 2, 0.16], "#102d37");
	const pane = mesh(
		g,
		"box",
		[0, 0, 0.11],
		[1.05, 1.65, 0.06],
		lit ? "#e3b36a" : "#688e88",
		false,
	);
	if (lit) pane.material = mat("#f0c379", true);
	mesh(g, "box", [0, 0, 0.18], [0.08, 1.7, 0.08], "#273f48");
	mesh(g, "box", [0, 0, 0.19], [1.1, 0.09, 0.08], "#273f48");
	mesh(g, "box", [0, -1, 0.12], [1.6, 0.15, 0.4], "#a6a88a");
	parent.add(g);
	return g;
}
function roof(parent, x, y, z, w, h, d, hex) {
	const v = [
		-w / 2,
		0,
		-d / 2,
		w / 2,
		0,
		-d / 2,
		0,
		h,
		-d / 2,
		-w / 2,
		0,
		d / 2,
		w / 2,
		0,
		d / 2,
		0,
		h,
		d / 2,
	];
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
	geo.setIndex([
		0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 2, 5, 4, 2, 4, 1, 0, 1, 4, 0, 4, 3,
	]);
	geo.computeVertexNormals();
	const m = new THREE.Mesh(geo, mat(hex));
	m.position.set(x, y, z);
	parent.add(m);
	const edge = new THREE.LineSegments(
		new THREE.EdgesGeometry(geo),
		new THREE.LineBasicMaterial({ color: 0x071820 }),
	);
	m.add(edge);
	return m;
}
function tree(parent, x, z, h = 8) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	beam(g, [0, 0, 0], [0.2, h * 0.65, 0], 0.24, "#244148");
	beam(g, [0.2, h * 0.65, 0], [-0.5, h, 0], 0.1, "#244148");
	for (const [s, k] of [
		[-1, 0.4],
		[1, 0.55],
		[-1, 0.73],
	]) {
		const by = h * k;
		beam(g, [0.1, by, 0], [s * 2.2, by + 1.4, 0.1], 0.1, "#244148");
		beam(g, [s * 1.4, by + 0.9, 0], [s * 1.6, by + 2.1, 0.4], 0.055, "#244148");
		beam(
			g,
			[s * 2.1, by + 1.3, 0.1],
			[s * 2.8, by + 1.7, -0.5],
			0.04,
			"#244148",
		);
	}
	parent.add(g);
	return g;
}
function furniture(g, p, f) {
	const { x, z, k } = p;
	if (k === "bookcase") {
		mesh(g, "box", [x, 1.1, z], [p.w, 2.2, p.d], "#31464c");
		for (let r = 0; r < 3; r++) {
			mesh(
				g,
				"box",
				[x, 0.4 + r * 0.7, z],
				[p.w + 0.1, 0.08, p.d + 0.08],
				"#88886c",
			);
			for (let i = 0; i < 5; i++) {
				const m = mesh(
					g,
					"box",
					[x + (i % 2) * 0.12, 0.67 + r * 0.7, z - p.d / 2 + 0.23 + i * 0.48],
					[p.w * 0.8, 0.47, 0.22],
					["#94736f", "#b39b74", "#486d69", "#6c6e86"][(r + i + f) % 4],
				);
				m.rotation.x = ((i % 3) - 1) * 0.07;
			}
		}
	}
	if (k === "desk") {
		mesh(g, "box", [x, 0.9, z], [p.w, 0.17, p.d], "#8a8071");
		for (const s of [-1, 1])
			mesh(
				g,
				"box",
				[x + s * p.w * 0.4, 0.45, z],
				[0.15, 0.9, p.d * 0.7],
				"#3b5256",
			);
		flat(g, x - 0.35, z, 0.75, 0.6, "#e0d4b0", 1.01);
		candle(g, x + 0.8, z);
	}
	if (k === "piano") {
		mesh(g, "box", [x, 1.05, z], [p.w, 1.7, p.d], "#293945");
		mesh(g, "box", [x, 1.02, z + 0.8], [p.w * 0.94, 0.09, 0.45], "#b7b89e");
		for (let i = 0; i < 12; i++)
			flat(g, x - p.w * 0.44 + i * 0.23, z + 0.8, 0.025, 0.45, "#27383f", 1.1);
		mesh(g, "box", [x, 0.45, z + 1.15], [1.3, 0.24, 0.55], "#574c63");
	}
	if (k === "table") {
		mesh(g, "box", [x, 1, z], [p.w, 0.2, p.d], "#827862");
		for (const sx of [-1, 1])
			for (const sz of [-1, 1])
				mesh(
					g,
					"box",
					[x + sx * p.w * 0.39, 0.5, z + sz * p.d * 0.35],
					[0.15, 1, 0.15],
					"#3d5053",
				);
		flat(g, x, z, 1.7, 1.4, f === 0 ? "#68576d" : "#75887c", 1.12);
		for (const sx of [-1, 1]) {
			const _plate = mesh(
				g,
				"cylinder",
				[x + sx * 0.95, 1.14, z],
				[0.27, 0.025, 0.27],
				"#c1c2a4",
				false,
			);
			mesh(g, "box", [x + sx * 2, 0.6, z], [0.65, 0.2, 0.7], "#516466");
			mesh(g, "box", [x + sx * 2, 1, z - 0.28], [0.65, 0.8, 0.12], "#516466");
		}
		candle(g, x, z);
	}
	if (k === "sofa") {
		mesh(g, "box", [x, 0.52, z], [p.w, 0.7, p.d], "#765971");
		mesh(g, "box", [x - p.w * 0.35, 1, z], [0.25, 0.9, p.d], "#56425c");
		for (const s of [-1, 1])
			mesh(g, "box", [x, 0.8, z + s * p.d * 0.43], [p.w, 1, 0.25], "#765971");
		for (let i = 0; i < 3; i++)
			mesh(
				g,
				"box",
				[x + 0.13, 0.92, z + (i - 1) * 0.73],
				[p.w * 0.65, 0.18, 0.65],
				"#99758c",
			);
	}
	if (k === "plant") {
		mesh(g, "cone", [x, 0.5, z], [0.55, 0.8, 0.55], "#927868").rotation.z =
			Math.PI;
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3;
			const leaf = mesh(
				g,
				"sphere",
				[x + Math.sin(a) * 0.36, 1.35 + i * 0.05, z + Math.cos(a) * 0.36],
				[0.2, 0.7, 0.12],
				i % 2 ? "#548a7a" : "#7aa087",
			);
			leaf.rotation.z = Math.sin(a) * 0.5;
			leaf.rotation.y = a;
		}
	}
	if (k === "altar") {
		mesh(g, "box", [x, 0.6, z], [p.w, 1.1, p.d], "#55666a");
		mesh(g, "box", [x, 1.2, z], [p.w + 0.25, 0.18, p.d + 0.2], "#a9a78c");
		mesh(g, "cylinder", [x, 1.4, z], [0.43, 0.25, 0.43], "#a58763");
		for (const s of [-1, 1]) candle(g, x + s * 0.8, z);
	}
	if (k === "clock") {
		mesh(g, "box", [x, 1.1, z], [0.7, 2.2, 0.6], "#525362");
		const face = mesh(
			g,
			"cylinder",
			[x, 1.7, z + 0.35],
			[0.36, 0.06, 0.36],
			"#d5c9a4",
		);
		face.rotation.x = Math.PI / 2;
		beam(g, [x, 1.7, z + 0.4], [x + 0.13, 1.83, z + 0.4], 0.023, "#293b42");
		beam(g, [x, 1.7, z + 0.4], [x, 1.45, z + 0.4], 0.018, "#293b42");
		const pend = orb(g, x, 0.7, z + 0.35, 0.12, "#baa168");
		pend.name = `pendulum${f}`;
		nativeAnimation(
			g,
			new THREE.AnimationClip(`tick${f}`, 2, [
				new THREE.NumberKeyframeTrack(
					`${pend.name}.position[x]`,
					[0, 1, 2],
					[x - 0.14, x + 0.14, x - 0.14],
				),
			]),
		);
	}
}
function buildInterior(f) {
	if (interior) {
		scene.remove(interior);
		for (const m of [...mixers])
			if (m.getRoot() === interior) {
				mixers.splice(mixers.indexOf(m), 1);
			}
	}
	interior = new THREE.Group();
	interior.name = `floor${f}`;
	scene.add(interior);
	const palette = [
		["#6e7b71", "#3a6263", "#5e475d"],
		["#6c6370", "#4e626f", "#7c5669"],
		["#657570", "#456369", "#41645e"],
		["#73746b", "#475b65", "#645567"],
	][f];
	mesh(interior, "box", [0, -0.4, 0], [30.8, 0.8, 20.8], "#344d53");
	for (let r = 0; r < 6; r++) {
		const [x, z] = ROOM_CENTERS[r];
		flat(interior, x, z, 9.8, 9.8, palette[0], 0.02);
		for (let i = 0; i < 10; i++)
			flat(interior, x - 4.5 + i, z, 0.025, 9.7, "#3d5655", 0.07);
		flat(interior, x, z, 5.2, 4.9, palette[2], 0.1);
		flat(interior, x, z, 4.85, 4.55, r === 4 ? "#8b7568" : palette[2], 0.13);
		for (const s of [-1, 1]) {
			flat(interior, x + s * 2.22, z, 0.055, 4.2, "#a69379", 0.17);
			flat(interior, x, z + s * 2.05, 4.45, 0.055, "#a69379", 0.17);
		}
	}
	for (const b of game.boxes.slice(0, 18)) {
		const exteriorWall = Math.abs(b.x) > 14 || Math.abs(b.z) > 9;
		const front = b.z > 9 || b.x > 14;
		const height = front ? 0.65 : exteriorWall ? 3.3 : 1.45;
		mesh(
			interior,
			"box",
			[b.x, height / 2 + 0.12, b.z],
			[b.w, height, b.d],
			palette[1],
		);
		mesh(
			interior,
			"box",
			[b.x, height + 0.15, b.z],
			[b.w + 0.09, 0.12, b.d + 0.09],
			"#87958a",
		);
	}
	for (const x of [-15, -5, 5, 15])
		for (const z of [-10, 0, 10]) {
			mesh(interior, "box", [x, 1.05, z], [0.5, 2.05, 0.5], "#45646a");
			mesh(interior, "box", [x, 2.1, z], [0.65, 0.16, 0.65], "#a6aa8b");
		}
	for (const x of [-10, 0, 10]) {
		windowModel(interior, x, 1.75, -9.78, 0, false);
		for (const sx of [-1, 1])
			mesh(
				interior,
				"box",
				[x + sx * 0.98, 1.7, -9.7],
				[0.47, 2.4, 0.15],
				palette[2],
			);
	}
	for (const p of PROP_BOXES) furniture(interior, p, f);
	candle(interior, 0, 5, true);
	for (const s of STAIRS.filter((s) => s.f === f)) {
		const g = new THREE.Group();
		for (let i = 0; i < 5; i++)
			mesh(
				g,
				"box",
				[s.x - 1 + i * 0.4, 0.08 + i * 0.13, s.z],
				[0.39, 0.16 + i * 0.26, 1.4],
				s.to > f ? "#8e9282" : "#435f66",
			);
		ring(g, s.x, 0.1, s.z, 1.4, "#c4ad73");
		if (s.locked && !game.unlocked) {
			mesh(g, "box", [s.x, 1, s.z - 0.85], [2.3, 1.9, 0.15], "#715e55");
			orb(g, s.x, 0.9, s.z - 0.7, 0.15, "#dfb777");
		}
		interior.add(g);
	}
	if (f === 0) {
		flat(interior, 0, 9, 2.4, 1.4, "#c2aa7c", 0.15);
		mesh(interior, "box", [-1.65, 1.5, 10], [0.4, 3, 0.4], "#3c5f62");
		mesh(interior, "box", [1.65, 1.5, 10], [0.4, 3, 0.4], "#3c5f62");
		mesh(interior, "box", [0, 3, 10], [3.7, 0.3, 0.4], "#859486");
		if (game.banked.length < 3) {
			const door = mesh(
				interior,
				"box",
				[0, 1.45, 10],
				[2.8, 2.8, 0.17],
				"#243f49",
			);
			mesh(door, "box", [0.3, 0, -0.9], [0.08, 0.09, 0.07], "#d3b06f");
		}
	}
	NOTES.forEach((n) => {
		if (n.f === f) {
			const note = flat(interior, n.x, n.z, 0.65, 0.5, "#e1d4ab", 0.16);
			note.rotation.y = -0.25;
			for (let i = 0; i < 3; i++)
				flat(interior, n.x, n.z - 0.13 + i * 0.12, 0.38, 0.017, "#817c64", 0.2);
		}
	});
	if (f === 0) {
		if (game.banked.includes("shard1")) {
			mesh(interior, "sphere", [0, 1.76, 7.5], [0.43, 0.5, 0.43], "#b9ac86");
			for (const side of [-1, 1]) {
				const handle = ring(interior, side * 0.43, 1.9, 7.5, 0.2, "#d6b679");
				handle.rotation.x = 0;
			}
		}
		if (game.banked.includes("shard0")) {
			mesh(interior, "cylinder", [0, 2.17, 7.5], [0.35, 0.12, 0.35], "#d4b575");
			ring(interior, 0, 2.24, 7.5, 0.37, "#f2d494");
		}
		if (game.banked.includes("shard2")) {
			mesh(interior, "cone", [0, 2.36, 7.5], [0.38, 0.25, 0.38], "#799e91");
			orb(interior, 0, 2.52, 7.5, 0.09, "#e5c381");
		}
	}
	if (f === 3) {
		beam(interior, [-14, 2.7, -9], [14, 2.7, -9], 0.12, "#38505b");
		for (const x of [-10, 0, 10]) {
			beam(interior, [x - 4, 2.8, -9], [x, 5, -9], 0.1, "#52636a");
			beam(interior, [x, 5, -9], [x + 4, 2.8, -9], 0.1, "#52636a");
		}
	}
	renderFloor = f;
	lastRevision = game.revision;
}
function buildExterior() {
	exterior = new THREE.Group();
	scene.add(exterior);
	mesh(exterior, "cylinder", [0, -1.3, 0], [23, 1.7, 17], "#1b3a44");
	mesh(exterior, "cylinder", [0, -0.43, 0], [22.8, 0.2, 16.8], "#365957");
	mesh(exterior, "box", [0, 5, 0], [26, 10, 16], "#416266");
	for (const y of [0.2, 3.2, 6.4, 9.7])
		mesh(exterior, "box", [0, y, 0], [26.5, 0.26, 16.5], "#8b9d8e");
	for (let i = 0; i < 11; i++) {
		mesh(
			exterior,
			"box",
			[-12.5 + i * 2.5, 4.9, 8.1],
			[0.12, 9.7, 0.12],
			"#2b4853",
			false,
		);
	}
	roof(exterior, 0, 10, 0, 28, 5.5, 18, "#244c57");
	for (const z of [-8.8, 8.8])
		beam(exterior, [-14, 10, z], [0, 15.5, z], 0.1, "#8da092");
	for (const z of [-8.8, 8.8])
		beam(exterior, [0, 15.5, z], [14, 10, z], 0.1, "#8da092");
	for (let i = 0; i < 7; i++) {
		const t = (i + 1) / 8;
		for (const side of [-1, 1])
			beam(
				exterior,
				[side * 14 * (1 - t), 10 + 5.5 * t, -8.8],
				[side * 14 * (1 - t), 10 + 5.5 * t, 8.8],
				0.034,
				"#466e70",
			);
	}
	for (const y of [1.7, 4.9, 8])
		for (const x of [-9, -4.5, 4.5, 9])
			windowModel(exterior, x, y, 8.16, 0, (x + y) % 3 > -0.5);
	for (const y of [1.7, 4.9, 8])
		for (const z of [-5, 0, 5])
			windowModel(exterior, 13.1, y, z, Math.PI / 2, true);
	for (const [x, z, h] of [
		[-11, -5, 14.6],
		[11, -5, 13.5],
	]) {
		mesh(exterior, "cylinder", [x, h / 2, z], [2.3, h, 2.3], "#45646b");
		for (let i = 0; i < 3; i++) {
			const yy = 2 + i * 4;
			windowModel(exterior, x, yy, z + 2.28, 0, true);
		}
		mesh(exterior, "cone", [x, h + 2.5, z], [3.25, 5.5, 3.25], "#28515c");
		orb(exterior, x, h + 5.3, z, 0.18, "#c6b67f");
		beam(exterior, [x, h + 5, z], [x, h + 6, z], 0.04, "#c6b67f");
	}
	mesh(exterior, "box", [0, 1.6, 8.22], [2.8, 3.2, 0.24], "#152f3b");
	roof(exterior, 0, 3.5, 9, 5, 1.5, 3, "#37545d");
	for (const x of [-2, 2])
		mesh(exterior, "cylinder", [x, 1.6, 9.8], [0.15, 3.2, 0.15], "#b4b597");
	mesh(exterior, "box", [0, 0.15, 9.4], [5, 0.3, 3], "#7a8b83");
	for (let i = 0; i < 4; i++)
		mesh(
			exterior,
			"box",
			[0, -0.05 - i * 0.06, 11 + i * 0.6],
			[5 + i * 0.2, 0.2, 0.65],
			"#6b7e76",
		);
	for (let i = 0; i < 8; i++)
		flat(
			exterior,
			Math.sin(i * 0.8) * 0.3,
			13 + i * 0.8,
			2.4,
			0.55,
			"#728777",
			-0.25,
		);
	for (const x of [-20, 19]) {
		tree(exterior, x, 3, x < 0 ? 9 : 8);
		tree(exterior, x * 1.04, -12, 7);
	}
	for (let i = 0; i < 10; i++) {
		const x = -17 + i * 3.7;
		beam(exterior, [x, -0.25, 13], [x, 1.4, 13], 0.06, "#17343d");
		mesh(exterior, "cone", [x, 1.55, 13], [0.16, 0.4, 0.16], "#688b83");
		if (i < 9)
			for (const y of [0.4, 1])
				beam(exterior, [x, y, 13], [x + 3.7, y, 13], 0.045, "#17343d");
	}
	for (const x of [-17, 17]) {
		const grave = mesh(
			exterior,
			"box",
			[x, 0.4, 7],
			[1.1, 1.1, 0.25],
			"#799184",
		);
		grave.rotation.z = x > 0 ? 0.1 : -0.15;
		beam(exterior, [x, 0.2, 7.15], [x, 0.8, 7.15], 0.035, "#39585c");
		beam(exterior, [x - 0.2, 0.6, 7.15], [x + 0.2, 0.6, 7.15], 0.03, "#39585c");
	}
	for (let i = 0; i < 3; i++) {
		const bat = makeCreature({ type: "bat" }, false);
		bat.position.set(12 + i * 2, 12 + i, 5);
		bat.userData.orbit = i;
		exterior.add(bat);
	}
	moon = orb(scene, 1, 13, -20, 4.8, "#d0c894", false);
	moon.material = mat("#d8cf9d", true);
	for (let i = 0; i < 7; i++)
		orb(
			moon,
			Math.sin(i * 8.2) * 0.5,
			Math.cos(i * 7.9) * 0.4,
			0.88,
			0.07 + i * 0.005,
			"#aaa984",
			false,
		);
	const halo = new THREE.Mesh(
		new THREE.RingGeometry(5.6, 5.63, 80),
		new THREE.MeshBasicMaterial({
			color: 0x789583,
			transparent: true,
			opacity: 0.3,
			side: THREE.DoubleSide,
		}),
	);
	halo.position.copy(moon.position);
	halo.lookAt(30, 30, 40);
	scene.add(halo);
	moonHalo = halo;
	weather = new THREE.Group();
	scene.add(weather);
	for (let i = 0; i < 38; i++) {
		const a = i * 2.399;
		const cloud = orb(
			weather,
			Math.sin(a) * 31,
			-2.7 + Math.sin(i) * 0.4,
			Math.cos(a) * 24,
			0.8 + (i % 4) * 0.7,
			i % 2 ? "#23474c" : "#1c3c47",
			false,
		);
		cloud.scale.set(5, 1, 2.5);
	}
}
function buildWorld() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color("#0c2933");
	scene.fog = new THREE.FogExp2("#0c2933", 0.006);
	camera = new THREE.OrthographicCamera(-25, 25, 15, -15, 0.1, 180);
	if (AIHub.active) {
		exterior = new THREE.Group();
		scene.add(exterior);
		moon = new THREE.Group();
		scene.add(moon);
		weather = new THREE.Group();
		scene.add(weather);
	} else buildExterior();
	buildInterior(0);
	interior.visible = false;
	for (const e of game.enemies) {
		const m = makeCreature(e);
		enemyModels.set(e.id, m);
		m.visible = false;
	}
	for (const i of game.items) {
		const m = makeItem(i.id);
		scene.add(m);
		itemModels.set(i.id, m);
		m.visible = false;
	}
	const g = new THREE.BufferGeometry(),
		positions = [];
	for (let i = 0; i < 100; i++)
		positions.push(
			Math.sin(i * 7.3) * 23,
			1 + ((i * 17) % 100) * 0.12,
			Math.cos(i * 3.8) * 19,
		);
	g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	const dust = new THREE.Points(
		g,
		new THREE.PointsMaterial({
			color: 0xced6ac,
			size: 0.05,
			transparent: true,
			opacity: 0.6,
		}),
	);
	scene.add(dust);
	view.pos.set(31, 25, 37);
	view.target.set(-6, 4, 0);
	camera.position.copy(view.pos);
	camera.lookAt(view.target);
	resize();
}
function resize() {
	if (!renderer || !camera) return;
	const w = innerWidth,
		h = innerHeight,
		a = w / h;
	renderer.setSize(w, h);
	const vh = screen === "title" ? (a < 1 ? 48 : 44) : 29;
	camera.left = (-vh * a) / 2;
	camera.right = (vh * a) / 2;
	camera.top = vh / 2;
	camera.bottom = -vh / 2;
	camera.updateProjectionMatrix();
}
function effect(type, p) {
	if (!p) return;
	if (type === "pulse") {
		const m = ring(scene, p.x, 0.17, p.z, 0.5, "#a9efd1");
		effects.push({ m, life: 1.2, max: 1.2, kind: "pulse", f: p.f });
	}
	if (type === "bank") {
		for (let i = 0; i < 18; i++) {
			const m = orb(scene, 0, 1.5, 7.2, 0.07, "#efd38a", false);
			m.material = mat("#f3d993", true);
			effects.push({
				m,
				life: 1.8,
				max: 1.8,
				kind: "spark",
				vx: Math.sin(i) * 2,
				vy: 1 + (i % 3),
				vz: Math.cos(i) * 2,
				f: 0,
			});
		}
	}
}
function updateVisuals(dt) {
	const title =
		!attract && (screen === "title" || (paused && previousScreen === "title"));
	exterior.visible = title;
	interior.visible = !title;
	moon.visible = title;
	if (moonHalo) moonHalo.visible = title;
	shaderAmbient.value = title ? 0.94 : settings.contrast ? 0.88 : 0.72;
	const p = localPlayer();
	if (!title && p && (p.f !== renderFloor || game.revision !== lastRevision))
		buildInterior(p.f);
	if (!title && !p && game.players[0]) {
		if (game.players[0].f !== renderFloor) buildInterior(game.players[0].f);
	}
	const following = !title && innerWidth < innerHeight ? p : null;
	const followX = following?.x || 0,
		followZ = following?.z || 0;
	const desiredTarget = title
			? new THREE.Vector3(-7, 5, 0)
			: new THREE.Vector3(followX, 0.3, followZ),
		desiredPos = title
			? new THREE.Vector3(29, 27, 39)
			: new THREE.Vector3(28 + followX, 39, 37 + followZ);
	const lerp = settings.motion ? 1 - Math.exp(-dt * 2.6) : 1;
	view.target.lerp(desiredTarget, lerp);
	view.pos.lerp(desiredPos, lerp);
	camera.position.copy(view.pos);
	camera.lookAt(view.target);
	if (view.shake > 0 && settings.motion) {
		camera.position.x += Math.sin(performance.now() * 0.06) * view.shake;
		camera.position.y += Math.cos(performance.now() * 0.08) * view.shake;
		view.shake = Math.max(0, view.shake - dt * 0.7);
	}
	if (p) {
		shaderLight.value.set(p.x, 1, p.z);
		shaderFlame.value = p.match > 0 ? 1 : 0.03;
	}
	for (const player of game.players) {
		const root = avatars.get(player.id) || createAvatar(player);
		root.visible = !title && player.f === renderFloor;
		root.position.set(player.x, 0, player.z);
		root.userData.body.rotation.y = Math.sin(player.angle) * 0.13;
		root.userData.eyes.rotation.y = 0.64;
		root.userData.flame.visible = player.match > 0;
		root.userData.fire.scale.y =
			0.18 + Math.sin(performance.now() * 0.029) * 0.035;
		root.userData.walk.setEffectiveWeight(player.moving ? 1 : 0);
		if (player.invuln > 0 && Math.floor(performance.now() / 110) % 2 === 0) {
			root.userData.body.visible = false;
		} else root.userData.body.visible = true;
		if (root.userData.carry !== player.carry) {
			root.userData.hold.clear();
			if (player.carry) {
				const m = makeItem(player.carry);
				m.scale.setScalar(0.65);
				root.userData.hold.add(m);
			}
			root.userData.carry = player.carry;
		}
	}
	for (const [id, root] of avatars)
		if (!game.players.some((p) => p.id === id)) {
			scene.remove(root);
			avatars.delete(id);
		}
	for (const e of game.enemies) {
		const m = enemyModels.get(e.id);
		if (!m) continue;
		m.visible = !title && e.f === renderFloor;
		m.position.set(e.x, 0, e.z);
		m.rotation.y =
			e.type === "ghost" ? 0.55 : Math.sin(game.time * 0.8 + e.id) * 0.3 + 0.6;
		m.rotation.z = e.stun > 0 ? Math.sin(game.time * 8) * 0.15 : 0;
		const near = p ? dist(p, e) : 99;
		const illumination =
			p?.match > 0 ||
			settings.contrast ||
			game.reveal ||
			e.mode === "chase" ||
			near < 2.5;
		m.children[0].visible = illumination;
		m.scale.setScalar(e.stun > 0 ? 0.86 : 1);
	}
	for (const i of game.items) {
		const m = itemModels.get(i.id);
		m.visible = !title && i.f === renderFloor && i.holder === null && !i.banked;
		m.position.set(
			i.x,
			1.1 + Math.sin(game.time * 2 + i.id.length) * 0.12,
			i.z,
		);
		m.rotation.y = game.time * 0.7;
		if (
			m.visible &&
			!game.reveal &&
			!settings.contrast &&
			p &&
			dist(p, i) > 2 &&
			!(p.match > 0 && dist(p, i) < 9)
		)
			m.visible = false;
		if (i.id === "key" && i.f === 0) m.position.y += 0.45;
	}
	for (const m of mixers) m.update(dt * (settings.motion ? 1 : 0.25));
	for (const child of exterior.children)
		if (child.userData.orbit !== undefined) {
			const i = child.userData.orbit;
			child.position.x = 5 + Math.sin(titleTime * 0.35 + i * 2) * 13;
			child.position.z = 3 + Math.cos(titleTime * 0.35 + i * 2) * 8;
			child.position.y = 12 + Math.sin(titleTime + i) * 1.3;
		}
	if (weather) weather.rotation.y = Math.sin(titleTime * 0.025) * 0.03;
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.life -= dt;
		e.m.visible = e.f === renderFloor;
		if (e.kind === "pulse") {
			e.m.scale.setScalar(1 + (1 - e.life / e.max) * 12);
			e.m.position.y = 0.1 + (1 - e.life / e.max) * 0.2;
		} else {
			e.m.position.x += e.vx * dt;
			e.m.position.y += e.vy * dt;
			e.m.position.z += e.vz * dt;
			e.vy -= dt * 2;
		}
		if (e.life <= 0) {
			scene.remove(e.m);
			e.m.geometry.dispose();
			effects.splice(i, 1);
		}
	}
}

class HouseAudio {
	constructor() {
		this.ctx = null;
		this.master = null;
		this.musicGain = null;
		this.sfxGain = null;
		this.analyser = null;
		this.notesPlayed = 0;
		this.effectsPlayed = 0;
		this.voicesPlayed = 0;
		this.step = 0;
		this.nextNote = 0;
		this.muted = false;
		this.active = [];
	}
	async unlock() {
		if (!this.ctx) {
			const Audio = window.AudioContext || window.webkitAudioContext;
			if (!Audio) return;
			this.ctx = new Audio();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.65;
			this.musicGain = this.ctx.createGain();
			this.sfxGain = this.ctx.createGain();
			this.musicGain.connect(this.master);
			this.sfxGain.connect(this.master);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.updateVolumes();
			this.nextNote = this.ctx.currentTime + 0.15;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		_audioReady = true;
	}
	updateVolumes() {
		if (this.ctx) {
			this.musicGain.gain.setTargetAtTime(
				settings.music,
				this.ctx.currentTime,
				0.06,
			);
			this.sfxGain.gain.setTargetAtTime(
				settings.sfx,
				this.ctx.currentTime,
				0.06,
			);
		}
	}
	tone(
		freq,
		duration = 0.2,
		type = "sine",
		volume = 0.2,
		when = 0,
		target = "sfx",
		endFreq = null,
	) {
		if (!this.ctx || this.muted) return;
		const t = when || this.ctx.currentTime,
			osc = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (endFreq)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(1, endFreq),
				t + duration,
			);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.015);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		osc.connect(g);
		g.connect(target === "music" ? this.musicGain : this.sfxGain);
		osc.start(t);
		osc.stop(t + duration + 0.03);
		osc.onended = () => {
			osc.disconnect();
			g.disconnect();
		};
	}
	noise(duration = 0.3, volume = 0.15, cutoff = 1500) {
		if (!this.ctx || this.muted) return;
		const count = Math.ceil(this.ctx.sampleRate * duration),
			buffer = this.ctx.createBuffer(1, count, this.ctx.sampleRate),
			d = buffer.getChannelData(0);
		let s = 0.31;
		for (let i = 0; i < count; i++) {
			s = (s * 16807) % 2147483647;
			d[i] = (s / 1073741823.5 - 1) * (1 - i / count);
		}
		const src = this.ctx.createBufferSource(),
			g = this.ctx.createGain(),
			filter = this.ctx.createBiquadFilter();
		src.buffer = buffer;
		filter.type = "lowpass";
		filter.frequency.value = cutoff;
		g.gain.value = volume;
		src.connect(filter);
		filter.connect(g);
		g.connect(this.sfxGain);
		src.start();
		src.onended = () => {
			src.disconnect();
			filter.disconnect();
			g.disconnect();
		};
	}
	voice(seed = 0) {
		if (!this.ctx || this.muted) return;
		this.voicesPlayed++;
		const t = this.ctx.currentTime;
		for (let i = 0; i < 5; i++) {
			const base = 155 + ((seed * 37 + i * 53) % 130);
			this.tone(
				base,
				0.075 + (i % 2) * 0.03,
				"sawtooth",
				0.025,
				t + i * 0.105,
				"sfx",
				base * 1.2,
			);
			this.tone(base * 3, 0.06, "sine", 0.055, t + i * 0.105 + 0.01);
		}
	}
	play(type) {
		if (!this.ctx || this.muted) return;
		this.effectsPlayed++;
		const t = this.ctx.currentTime;
		if (type === "match") {
			this.noise(0.18, 0.4, 4000);
			this.tone(760, 0.12, "triangle", 0.08, t + 0.03, "sfx", 170);
		} else if (type === "pickup" || type === "unlock") {
			for (let i = 0; i < 3; i++)
				this.tone([440, 660, 880][i], 0.22, "triangle", 0.16, t + i * 0.08);
		} else if (type === "bank" || type === "win") {
			for (let i = 0; i < 6; i++)
				this.tone(
					[261.63, 329.63, 392, 523.25, 659.25, 783.99][i],
					0.8,
					"sine",
					0.18,
					t + i * 0.1,
				);
			this.voice(7);
		} else if (type === "pulse") {
			this.tone(110, 0.8, "sine", 0.4, t, "sfx", 880);
			this.noise(0.6, 0.08, 2500);
		} else if (type === "hit" || type === "lose") {
			this.tone(100, 0.65, "sawtooth", 0.16, t, "sfx", 35);
			this.noise(0.35, 0.3, 500);
			this.voice(2);
		} else if (type === "wind" || type === "snuff") {
			this.noise(type === "wind" ? 2 : 0.4, 0.2, 800);
		} else if (type === "stair") {
			this.tone(140, 0.3, "triangle", 0.2, t, "sfx", 90);
			this.noise(0.15, 0.09, 400);
		} else if (type === "rest") {
			this.tone(330, 0.6, "sine", 0.13);
			this.tone(495, 0.7, "sine", 0.1, t + 0.1);
		} else if (type === "note") {
			this.noise(0.17, 0.09, 3500);
			this.voice(3);
		} else if (type === "click") {
			this.tone(360, 0.06, "triangle", 0.08);
		}
	}
	update() {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		const t = this.ctx.currentTime;
		if (this.nextNote < t - 0.5) this.nextNote = t + 0.05;
		const melody = [0, 7, 10, 14, 12, 7, 3, 7, 0, 7, 10, 15, 14, 10, 7, 3],
			base = 146.832;
		let safety = 0;
		while (this.nextNote < t + 0.2 && safety++ < 5) {
			const i = this.step % melody.length;
			this.tone(
				base * 2 ** (melody[i] / 12),
				1.5,
				"triangle",
				0.15,
				this.nextNote,
				"music",
			);
			if (i % 4 === 0) {
				this.tone(
					(base / 2) * 2 ** ([0, 0, -2, -5][Math.floor(i / 4)] / 12),
					2.4,
					"sine",
					0.2,
					this.nextNote,
					"music",
				);
			}
			this.step++;
			this.notesPlayed++;
			this.nextNote += 0.46;
		}
	}
	stop() {
		this.muted = true;
		if (this.ctx)
			this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
	}
	levels() {
		if (!this.analyser) return 0;
		const d = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(d);
		return (
			Math.sqrt(d.reduce((s, v) => s + (v - 128) ** 2, 0) / d.length) / 128
		);
	}
}
const audio = new HouseAudio();

const CREDITS = /* CREDITS */ null;
const net = {
	kind: "solo",
	isHost: true,
	me: 0,
	roster: [{ id: 0, name: "You", color: "#efc477" }],
	inputs: {},
	inputAt: {},
	joinedAt: {},
	lastState: 0,
	bc: null,
	room: "",
	uid: crypto.randomUUID(),
	peers: new Map(),
	channels: new Map(),
	pending: null,
	pc: null,
	started: false,
	seq: 0,
	seenSeq: 0,
	eventQueue: [],
	stats: { sent: 0, received: 0 },
	status: "",
};
const SEAT_COLORS = ["#efc477", "#80d1be", "#bba4db", "#e99782"];
function localPlayer() {
	if (hubInfo?.server) return null;
	return (
		game.players.find((p) => p.id === net.me) ||
		(!hubInfo && net.kind === "solo" ? game.players[0] : null)
	);
}
function isAuthority() {
	return net.isHost;
}
function escapeHTML(text) {
	return String(text).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}
function glyph(action) {
	const ps = {
			interact: "×",
			drop: "○",
			pulse: "□",
			map: "△",
			match: "R2",
			hush: "L1",
			pause: "☰",
			move: "L",
			aim: "R",
		},
		xb = {
			interact: "A",
			drop: "B",
			pulse: "X",
			map: "Y",
			match: "RT",
			hush: "LB",
			pause: "☰",
			move: "L",
			aim: "R",
		},
		kb = {
			interact: "E",
			drop: "Q",
			pulse: "F",
			map: "Tab",
			match: "Space",
			hush: "Shift",
			pause: "Esc",
			move: "WASD",
			aim: "Mouse",
		};
	if (lastInput === "gamepad") {
		const t = (settings.glyphs === "xbox" ? xb : ps)[action];
		return `<span class="${t.length === 1 ? "glyph" : "key glyph"}">${t}</span>`;
	}
	return `<kbd>${kb[action]}</kbd>`;
}
function markInput(type) {
	const now = performance.now();
	lastActivity = now;
	if (lastInput !== type) {
		lastInput = type;
		document.body.classList.toggle("touch", type === "touch");
		updatePrompts();
		if (screen === "help") showHelp();
	}
	if (attract) {
		endAttract();
		return true;
	}
	return false;
}
function updatePrompts() {
	if (!game) return;
	$("#titleInputHint").textContent =
		lastInput === "gamepad"
			? "Left stick to wander · R2 to light the way"
			: "WASD to wander · Space to light the way";
	$("#controlHints").innerHTML =
		`${glyph("match")}Strike a match<br>${glyph("hush")}Hush &nbsp; ${glyph("map")}House map`;
}
function titleButtons() {
	const save = safeRead(SAVE_KEY, null);
	$("#titleButtons").innerHTML =
		`<button class="primary" data-action="start">Enter the house <span>→</span></button>${save?.status === "playing" ? `<button class="secondary" data-action="continue">Continue the night <span style="float:right;color:var(--gold)">${save.banked.length}/3</span></button>` : ""}<div class="button-row"><button class="secondary" data-action="coop">Play together</button><button class="secondary" data-action="help">How to play</button></div>`;
}
function setTitle() {
	screen = "title";
	paused = false;
	attract = false;
	game.attract = false;
	net.started = false;
	$("#titleScreen").classList.remove("hidden");
	$("#hud").classList.add("hidden");
	$("#attractBanner").classList.add("hidden");
	$("#overlay").classList.add("hidden");
	$("#touchAction").classList.add("hidden");
	titleButtons();
	lastActivity = performance.now();
	menuIndex = 0;
	resize();
}
function cancelReplay() {
	if (attract) game.tuning = { ...DEFAULTS };
	attract = false;
	game.attract = false;
	$("#attractBanner").classList.add("hidden");
}
function newNight(continuing = false) {
	cancelReplay();
	if (hubInfo) return;
	const save = continuing ? safeRead(SAVE_KEY, null) : null;
	const seats =
		net.kind === "solo"
			? [{ id: 0, name: "You", color: SEAT_COLORS[0] }]
			: net.roster;
	game.reset(seats);
	game.tuning.enemySpeed =
		settings.difficulty === "quiet"
			? 0.65
			: settings.difficulty === "dire"
				? 1.3
				: 1;
	if (save && net.kind === "solo") game.apply(save);
	screen = "game";
	paused = false;
	net.started = true;
	netEnded = false;
	$("#titleScreen").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	$("#overlay").classList.add("hidden");
	$("#attractBanner").classList.add("hidden");
	lastRevision = -1;
	_lastRoom = "";
	resize();
	updatePrompts();
	toast("Three pieces of an urn. One way out.", 5);
	audio.unlock();
}
function toast(text, duration = 3) {
	if (!text) return;
	$("#toast").textContent = text;
	$("#toast").classList.add("show");
	toastUntil = performance.now() + duration * 1000;
}
function openPanel(name, html, wide = false) {
	if (!["title", "loading"].includes(screen) && screen !== "attract")
		previousScreen = "game";
	else if (screen === "title") previousScreen = "title";
	screen = name;
	paused = true;
	$("#overlay").classList.remove("hidden");
	$("#panel").classList.toggle("wide", wide);
	$("#panel").innerHTML = html;
	menuIndex = Math.max(
		0,
		focusables().findIndex((el) => el.classList.contains("primary")),
	);
	updateFocus(lastInput === "gamepad");
	$("#touchAction").classList.add("hidden");
}
function header(eye, title) {
	return `<div class="panel-header"><div><p class="eyebrow">${eye}</p><h2>${title}</h2></div><button class="close-button" data-action="back" aria-label="Back">×</button></div>`;
}
function closePanel() {
	if (hubEnded) return;
	if (previousScreen === "title") {
		setTitle();
		return;
	}
	screen = "game";
	paused = false;
	$("#overlay").classList.add("hidden");
	resize();
}
function showPause() {
	if (hubEnded || screen === "title") return;
	previousScreen = "game";
	openPanel(
		"pause",
		header("CATCH YOUR BREATH", "The house can wait.") +
			`<p>${FLOOR_NAMES[localPlayer()?.f || 0]} · ${game.banked.length} of 3 pieces returned${net.kind !== "solo" ? "<br><small>The shared house keeps moving while your menu is open.</small>" : ""}</p><div class="menu-stack"><button class="primary" data-action="resume">Back to the house <span>→</span></button><button class="menu-button" data-action="map">The house map <em>${lastInput === "gamepad" ? "△" : "Tab"}</em></button><button class="menu-button" data-action="settings">Settings</button><button class="menu-button" data-action="help">How to play</button><button class="menu-button" data-action="dev">Developer tools</button>${hubInfo ? "" : '<button class="menu-button" data-action="quit">Save & return to title</button>'}</div>`,
	);
}
function showHelp() {
	const p = screen === "title" ? "title" : previousScreen;
	openPanel(
		"help",
		header("A QUICK WORD OF WARNING", "Mind your match.") +
			`<div class="instruction"><span class="num">01</span><div><strong>Put the past back together.</strong><p>Find three urn fragments upstairs. Carry each to the plinth in the foyer. Then escape through the front door.</p></div></div><div class="instruction"><span class="num">02</span><div><strong>One hand. Difficult choices.</strong><p>Carry a key, a fragment, or the scepter. Taking another swaps them. The brass key opens the upper library stair permanently.</p></div></div><div class="instruction"><span class="num">03</span><div><strong>The dark is listening.</strong><p>Matches reveal your way and frighten spiders. Ghosts follow flame; bats put it out. Hush shelters a match from wind. Central candles refill matches and restore a nerve once per floor.</p></div></div><div class="controls-grid"><div>${glyph("move")}Move</div><div>${glyph("match")}Strike match</div><div>${glyph("interact")}Take / use / stairs</div><div>${glyph("drop")}Drop object</div><div>${glyph("hush")}Hold to hush</div><div>${glyph("pulse")}Scepter pulse</div><div>${glyph("map")}Map</div><div>${glyph("pause")}Pause</div></div><p class="small-print">Mouse: aim with the pointer, click nearby objects to use them, right-click to hush. Touch: drag the left half to walk; tap the right half to use or light. Flame and scepter protection assist automatically.</p><div class="panel-footer"><button class="primary" data-action="back">Understood <span>→</span></button></div>`,
	);
	previousScreen = p;
}
function settingRange(key, label, min, max, step, value, caption = "") {
	return `<div class="setting-row"><label for="set-${key}">${label}${caption ? `<small>${caption}</small>` : ""}</label><div><output id="out-${key}">${Math.round(value * 100)}%</output><input id="set-${key}" data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"></div></div>`;
}
function showSettings() {
	const p = screen === "title" ? "title" : previousScreen;
	openPanel(
		"settings",
		header("MAKE YOURSELF AT HOME", "Settings") +
			settingRange(
				"music",
				"Music",
				0,
				1,
				0.01,
				settings.music,
				"An original midnight waltz.",
			) +
			settingRange("sfx", "Effects & voices", 0, 1, 0.01, settings.sfx) +
			`<div class="setting-row"><label for="set-glyphs">Controller symbols</label><select id="set-glyphs" data-setting="glyphs"><option value="ps" ${settings.glyphs === "ps" ? "selected" : ""}>PlayStation · × ○ □ △</option><option value="xbox" ${settings.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div><div class="setting-row"><label for="set-difficulty">The house’s temper<small>Applies immediately in your own house.</small></label><select id="set-difficulty" data-setting="difficulty"><option value="quiet" ${settings.difficulty === "quiet" ? "selected" : ""}>A quiet visit</option><option value="restless" ${settings.difficulty === "restless" ? "selected" : ""}>Restless house</option><option value="dire" ${settings.difficulty === "dire" ? "selected" : ""}>Very bad address</option></select></div><div class="setting-row"><label>Camera motion</label><button class="toggle" data-action="motion">${settings.motion ? "Gentle drift" : "Reduced motion"}</button></div><div class="setting-row"><label>Brighter darkness</label><button class="toggle" data-action="contrast">${settings.contrast ? "On" : "Off"}</button></div><div class="panel-footer"><button class="secondary" data-action="fullscreen">Fullscreen</button><button class="primary" data-action="back">Done <span>→</span></button></div>`,
	);
	previousScreen = p;
}
let aboutTab = 0;
function showAbout(tab = aboutTab) {
	aboutTab = tab;
	const p = screen === "title" ? "title" : previousScreen;
	const names = [
			"Source information",
			"Testing feedback",
			"Engine feedback",
			"Prompt feedback",
		],
		data =
			tab === 0
				? CREDITS.sourceInformation
				: tab === 1
					? CREDITS.testingFeedback
					: tab === 2
						? CREDITS.engineFeedback
						: CREDITS.promptFeedback;
	let content;
	if (tab === 0)
		content = Object.entries(data)
			.map(
				([k, v]) =>
					`<p><b>${escapeHTML(k.charAt(0).toUpperCase() + k.slice(1))}</b><br>${escapeHTML(v)}</p>`,
			)
			.join("");
	else
		content = data
			.map((v, i) => `<p><b>${i + 1}.</b> ${escapeHTML(v)}</p>`)
			.join("");
	openPanel(
		"about",
		header("THE PEOPLE IN THE WALLS", "About & credits") +
			`<div class="tabs">${names.map((n, i) => `<button data-action="about-${i}" class="${i === tab ? "active" : ""}">${n}</button>`).join("")}</div><div class="credits-text" tabindex="0" role="region" aria-label="Credits details">${tab === 0 ? "<p><b>The House of Creaks</b><br>An original game created in code. Inspired by Haunted House (Atari, 1982).<br>Designed, modeled, animated, composed and programmed by OpenAI gpt-6.1-sol.</p>" : ""}${content}${tab === 0 ? "<p><b>Libraries</b><br>Three.js (MIT), Rapier (Apache-2.0), AI Hub client 1.4.0. All visuals and sound are procedural. No source assets or audio files are used.</p>" : ""}</div><p class="small-print">Right stick / mouse wheel to read · Circle / Escape to return</p><div class="panel-footer"><button class="primary" data-action="back">Back <span>→</span></button></div>`,
		true,
	);
	previousScreen = p;
}
function showMap(f = localPlayer()?.f || 0) {
	mapFloor = clamp(f, 0, 3);
	if (screen === "title") return;
	previousScreen = "game";
	const p = localPlayer(),
		known = game.notes.includes(0) || game.reveal;
	openPanel(
		"map",
		header("A VERY UNRELIABLE FLOOR PLAN", FLOOR_NAMES[mapFloor]) +
			`<div class="tabs">${FLOOR_NAMES.map((n, i) => `<button data-action="map-${i}" class="${mapFloor === i ? "active" : ""}">${i + 1} · ${n.replace("The ", "")}</button>`).join("")}</div><div class="map-grid">${ROOM_NAMES[
				mapFloor
			]
				.map((n, r) => {
					const seen = game.visited[mapFloor].includes(r) || game.reveal;
					const current = p?.f === mapFloor && roomAt(p.x, p.z) === r;
					const item = game.items.find(
						(i) =>
							i.f === mapFloor &&
							roomAt(i.x, i.z) === r &&
							!i.banked &&
							i.holder === null,
					);
					const stairs = STAIRS.filter((s) => s.f === mapFloor && s.r === r)
						.map((s) => (s.to > s.f ? "↑ Stairs up" : "↓ Stairs down"))
						.join(" · ");
					return `<div class="map-room ${seen ? "seen" : ""} ${current ? "current" : ""}">${seen || known ? n : "Unexplored"}${current ? "<i>●</i>" : ""}<span>${item && (known || game.reveal || seen) ? escapeHTML(ITEM_NAMES[item.id]) : stairs || (r === 4 ? "✧ Safe candle" : "")}</span></div>`;
				})
				.join(
					"",
				)}</div><p class="map-caption">● You &nbsp; · &nbsp; A candle waits in each central landing. ${known ? "The study’s note marks the fragments." : "Rooms appear as you explore."}</p><div class="panel-footer"><button class="secondary" data-action="map-prev">← Floor</button><button class="secondary" data-action="map-next">Floor →</button><button class="primary" data-action="resume">Back <span>→</span></button></div>`,
		true,
	);
}
function devRange(k, label, min, max, step) {
	return `<div class="setting-row"><label for="dev-${k}">${label}</label><div><output id="devout-${k}">${game.tuning[k]}</output><input id="dev-${k}" data-tuning="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${game.tuning[k]}" aria-label="${label}"></div></div>`;
}
function showDev() {
	previousScreen = "game";
	devUsed = true;
	openPanel(
		"dev",
		header("THE KEYS TO THE HOUSE", "Developer tools") +
			`<p class="small-print">Live balance. Changes take effect immediately.${!isAuthority() ? " The host controls this shared house." : ""}</p><div class="dev-grid">${devRange("speed", "Walking speed", 1, 10, 0.1)}${devRange("enemySpeed", "Creature pace", 0, 3, 0.05)}${devRange("matchDuration", "Match life · seconds", 3, 60, 1)}${devRange("windInterval", "Wind interval · seconds", 10, 120, 1)}${devRange("damage", "Nerve loss per hit", 0, 5, 0.5)}${devRange("timeScale", "Time scale", 0.25, 3, 0.05)}</div><div class="dev-actions"><button data-action="god">Invulnerable: ${game.god ? "ON" : "OFF"}</button><button data-action="reveal">Reveal map: ${game.reveal ? "ON" : "OFF"}</button><button data-action="collisions">Collision overlay: ${debugCollisions ? "ON" : "OFF"}</button><button data-action="refill">Refill nerves & matches</button><button data-action="floor-down">Teleport floor ↓</button><button data-action="floor-up">Teleport floor ↑</button><button data-action="grant-key">Bring brass key</button><button data-action="grant-ward">Bring scepter</button><button data-action="grant-shard">Bring next fragment</button></div><p class="small-print">${renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2 compatibility"} · Three.js r180 · Rapier 0.19.3 · ${game.enemies.length} creatures · ${Math.floor(game.time)}s simulated · ${net.kind} · ${net.stats.sent} sent / ${net.stats.received} received</p><div class="panel-footer"><button class="secondary" data-action="reset-tuning">Reset defaults</button><button class="primary" data-action="pause">Done <span>→</span></button></div>`,
		true,
	);
	if (!isAuthority())
		$$("#panel button,#panel input").forEach((el) => {
			if (el.dataset.action !== "pause" && el.dataset.action !== "back")
				el.disabled = true;
		});
}
function grant(id) {
	const p = localPlayer();
	if (!p || !isAuthority()) return;
	const i = game.items.find((i) => i.id === id && !i.banked);
	if (!i) return;
	if (p.carry) game.drop(p);
	if (i.holder !== null) {
		const holder = game.players.find((p) => p.id === i.holder);
		if (holder) holder.carry = null;
	}
	i.holder = p.id;
	i.f = p.f;
	p.carry = i.id;
	game.revision++;
}
function showEnd(won) {
	if (hubInfo) return;
	const minutes = Math.floor(game.time / 60),
		seconds = Math.floor(game.time % 60)
			.toString()
			.padStart(2, "0");
	const score =
		game.banked.length * 1000 +
		Math.max(0, Math.floor(1200 - game.time * 1.2)) -
		game.hits * 80;
	const best = safeRead("creaks-best", 0);
	if (won && score > best) safeWrite("creaks-best", score);
	if (won) {
		try {
			localStorage.removeItem(SAVE_KEY);
		} catch {}
	}
	previousScreen = "game";
	openPanel(
		"ending",
		header(
			won ? "THE LAST CREAK" : "THE CANDLE GOES OUT",
			won ? "You made it out." : "The house keeps you.",
		) +
			`<p>${won ? "The urn is whole. Behind you, a window goes dark.<br>Somewhere upstairs, a floorboard creaks." : "You were so close to remembering the way.<br>There is always another match. Another night."}</p><div class="stats-grid"><div><strong>${minutes}:${seconds}</strong><span>Time in the house</span></div><div><strong>${game.banked.length} / 3</strong><span>Memories recovered</span></div><div><strong>${game.matchesUsed}</strong><span>Matches struck</span></div><div><strong>${game.hits}</strong><span>Nerves lost</span></div></div><p class="small-print">${devUsed ? "Developer tools were used." : won ? `Night score ${score} · Best ${Math.max(best, score)}` : "Tip: the scepter repels ghosts. A sheltered match keeps spiders away."}</p><div class="panel-footer"><button class="secondary" data-action="quit">Title screen</button><button class="primary" data-action="restart" ${net.isHost ? "" : "disabled"}>${net.isHost ? (won ? "Another night" : "Try again") : "Waiting for the host"} <span>→</span></button></div>`,
	);
}
function updateHUD() {
	const p = localPlayer() || game.players[0];
	if (!p) return;
	const r = roomAt(p.x, p.z);
	$("#floorLabel").textContent =
		`FLOOR ${p.f + 1} / 4 · ${FLOOR_NAMES[p.f].toUpperCase()}`;
	$("#roomLabel").textContent = ROOM_NAMES[p.f][r];
	$("#objective").textContent =
		game.banked.length === 3
			? "The front door is open. Leave the house."
			: !game.unlocked
				? "Find the urn’s lip. Seek the brass key."
				: `Return the three fragments to the foyer · ${game.banked.length}/3`;
	$("#urnPips").innerHTML = [0, 1, 2]
		.map(
			(i) =>
				`<i class="urn-pip ${game.banked.includes(`shard${i}`) ? "filled" : ""}"></i>`,
		)
		.join("");
	$("#nerves").innerHTML = [0, 1, 2, 3, 4]
		.map((i) => `<span class="${p.health > i ? "" : "empty"}">◆</span>`)
		.join("");
	$("#nerves").setAttribute("aria-label", `${p.health} nerves remaining`);
	$("#matches").textContent = p.matches;
	$("#flameBar").style.width =
		`${(p.match / game.tuning.matchDuration) * 100}%`;
	$("#carryName").textContent = p.carry ? ITEM_NAMES[p.carry] : "Nothing. Yet.";
	$("#carryIcon").textContent =
		p.carry === "key" ? "⚿" : p.carry === "ward" ? "✧" : p.carry ? "◈" : "◇";
	const near = game.nearest(p);
	$("#contextPrompt").innerHTML = near
		? glyph("interact") + escapeHTML(near.label)
		: p.match === 0
			? `${glyph("match")}Strike a match`
			: "";
	$("#windWarning").classList.toggle(
		"hidden",
		game.time % game.tuning.windInterval < game.tuning.windInterval - 7,
	);
	$("#teamList").innerHTML = game.players
		.filter((o) => o.id !== p.id)
		.map(
			(o) =>
				`<div class="teammate"><span style="color:${o.color}">●</span><span>${escapeHTML(o.name)} · ${o.f === p.f ? "here" : `floor ${o.f + 1}`}${o.carry ? ` · ${escapeHTML(ITEM_NAMES[o.carry].replace("The ", ""))}` : ""}</span></div>`,
		)
		.join("");
	if (lastInput === "touch" && screen === "game" && near) {
		$("#touchAction").textContent = near.label;
		$("#touchAction").classList.remove("hidden");
	} else $("#touchAction").classList.add("hidden");
	if (performance.now() > toastUntil) $("#toast").classList.remove("show");
}
function processEvents() {
	const events = game.events.splice(0);
	for (const e of events) {
		if (net.isHost && net.kind !== "solo")
			net.eventQueue.push({ ...e, seq: ++net.seq });
		handleEvent(e);
	}
	if (net.eventQueue.length > 30)
		net.eventQueue.splice(0, net.eventQueue.length - 30);
}
function handleEvent(e) {
	if (
		e.id !== undefined &&
		e.id !== net.me &&
		["note", "hint"].includes(e.type)
	)
		return;
	if (
		[
			"match",
			"pickup",
			"bank",
			"pulse",
			"hit",
			"snuff",
			"stair",
			"wind",
			"rest",
			"note",
			"unlock",
			"lose",
			"win",
		].includes(e.type)
	)
		audio.play(e.type);
	if (
		[
			"pickup",
			"bank",
			"unlock",
			"hint",
			"wind",
			"hit",
			"snuff",
			"rest",
			"finale",
		].includes(e.type) &&
		e.text &&
		!attract
	)
		toast(e.text, e.type === "finale" ? 6 : 3.5);
	if (e.type === "note" && !attract) {
		previousScreen = "game";
		openPanel(
			"note",
			header("SOMEONE WAS HERE BEFORE YOU", "A forgotten note") +
				`<p class="paper-note">${escapeHTML(e.text)}</p><div class="panel-footer"><button class="primary" data-action="resume">Fold it away <span>→</span></button></div>`,
		);
	}
	if (e.type === "hit") {
		view.shake = 0.4;
		const pad = navigator.getGamepads?.()[0];
		pad?.vibrationActuator
			?.playEffect?.("dual-rumble", {
				duration: 180,
				strongMagnitude: 0.5,
				weakMagnitude: 0.3,
			})
			.catch?.(() => {});
	}
	if (e.type === "pulse" || e.type === "bank")
		effect(
			e.type,
			game.players.find((p) => p.id === e.id),
		);
	if (e.type === "bank" && net.kind === "solo" && !attract)
		safeWrite(SAVE_KEY, game.snapshot());
}

function resetNetwork() {
	net.bc?.close();
	for (const c of net.channels.values())
		try {
			c.close();
		} catch {}
	net.pc?.close();
	net.pending?.pc?.close();
	net.kind = "solo";
	net.isHost = true;
	net.me = 0;
	net.roster = [{ id: 0, name: "You", color: SEAT_COLORS[0] }];
	net.inputs = {};
	net.inputAt = {};
	net.joinedAt = {};
	net.lastState = 0;
	net.peers.clear();
	net.channels.clear();
	net.pending = null;
	net.bc = null;
	net.room = "";
	net.started = false;
	net.status = "";
	netEnded = false;
}
function sendPacket(data, to = null) {
	if (hubEnded || netEnded) return;
	net.stats.sent++;
	if (hubInfo) {
		AIHub.send(
			data,
			to === null
				? { reliable: data.type !== "input" }
				: { to, reliable: data.type !== "input" },
		);
		return;
	}
	if (net.kind === "solo") return;
	if (net.bc) net.bc.postMessage({ uid: net.uid, from: net.me, to, data });
	if (net.isHost) {
		for (const [id, c] of net.channels)
			if ((to === null || to === id) && c.readyState === "open")
				c.send(JSON.stringify(data));
	} else {
		const c = net.channels.get(0);
		if (c?.readyState === "open") c.send(JSON.stringify(data));
	}
}
function addGuest(uid, channel = null) {
	if (!net.isHost) return;
	let id = net.peers.get(uid);
	if (id === undefined) {
		id = [1, 2, 3].find((i) => !net.roster.some((p) => p.id === i));
		if (id === undefined) {
			net.status = "The house already has four guests.";
			sendPacket({ type: "rejected", uid, reason: net.status });
			return;
		}
		net.peers.set(uid, id);
		const seat = { id, name: `Guest ${id + 1}`, color: SEAT_COLORS[id] };
		net.roster.push(seat);
		game.addPlayer(seat);
		net.joinedAt[id] = performance.now();
	}
	if (channel) net.channels.set(id, channel);
	const welcome = {
		type: "welcome",
		uid,
		id,
		roster: net.roster,
		started: net.started,
	};
	sendPacket(welcome, id);
	sendPacket(
		{
			type: "state",
			snapshot: game.snapshot(),
			started: net.started,
			events: [],
		},
		id,
	);
	net.status = `${net.roster.length} guests in the house.`;
	if (["coop", "lobby"].includes(screen)) showCoop("lobby");
	return id;
}
function handlePacket(data, from) {
	if (!data || typeof data !== "object" || hubEnded || netEnded) return;
	net.stats.received++;
	if (data.type === "hello" && net.isHost && !hubInfo) {
		addGuest(data.uid);
		return;
	}
	if (data.type === "welcome" && !hubInfo && !net.isHost) {
		net.me = data.id;
		net.roster = data.roster;
		net.status = "Connected. Waiting for the host to enter the house.";
		if (screen === "coop" || screen === "lobby") showCoop("lobby");
		return;
	}
	if (data.type === "rejected" && !net.isHost && data.uid === net.uid) {
		net.status = data.reason;
		showCoop("join");
		return;
	}
	if (data.type === "input" && net.isHost) {
		if (!game.players.some((p) => p.id === from)) return;
		const v = data.input || {};
		net.inputs[from] = {
			x: clamp(Number(v.x) || 0, -1, 1),
			z: clamp(Number(v.z) || 0, -1, 1),
			angle: Number.isFinite(v.angle) ? v.angle : undefined,
			hush: !!v.hush,
			interact: !!v.interact,
			match: !!v.match,
			drop: !!v.drop,
			pulse: !!v.pulse,
		};
		net.inputAt[from] = performance.now();
		return;
	}
	if (data.type === "state" && !net.isHost) {
		if (hubInfo && from !== hubInfo.host) return;
		const previousStatus = game.status;
		net.lastState = performance.now();
		game.apply(data.snapshot);
		net.roster = game.players.map((p) => ({
			id: p.id,
			name: p.name,
			color: p.color,
		}));
		game.events = [];
		for (const e of data.events || [])
			if (e.seq > net.seenSeq) {
				net.seenSeq = e.seq;
				handleEvent(e);
			}
		if (
			data.started &&
			(!net.started ||
				(previousStatus !== "playing" && game.status === "playing"))
		) {
			cancelReplay();
			net.started = true;
			screen = "game";
			paused = false;
			$("#titleScreen").classList.add("hidden");
			$("#hud").classList.remove("hidden");
			$("#overlay").classList.add("hidden");
			resize();
		}
		return;
	}
	if (data.type === "bye") {
		if (net.isHost) {
			game.removePlayer(from);
			net.roster = net.roster.filter((p) => p.id !== from);
		} else {
			net.status = "The host has left the house.";
			toast(net.status, 8);
			netEnded = true;
			if (!hubInfo) showDisconnected();
		}
		return;
	}
}
function openBroadcast(room, host) {
	resetNetwork();
	net.kind = "standalone";
	net.isHost = host;
	net.me = host ? 0 : -1;
	net.room = room
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, 6);
	net.bc = new BroadcastChannel(`creaks-room-${net.room}`);
	net.bc.onmessage = (e) => {
		const packet = e.data;
		if (packet.uid === net.uid) return;
		if (packet.data?.type === "welcome" && !host) {
			if (packet.data.uid === net.uid) handlePacket(packet.data, 0);
			return;
		}
		if (packet.to !== null && packet.to !== undefined && packet.to !== net.me)
			return;
		if (packet.data?.type === "hello" && host) {
			addGuest(packet.uid);
			return;
		}
		handlePacket(packet.data, host ? net.peers.get(packet.uid) : 0);
	};
	if (host) {
		game.reset(net.roster);
		net.status = "Room open. Friends can join in another tab at this address.";
	} else {
		net.roster = [];
		net.status = `Knocking on room ${net.room}…`;
		net.bc.postMessage({
			uid: net.uid,
			from: -1,
			to: null,
			data: { type: "hello", uid: net.uid },
		});
		const awaitingRoom = net.room;
		setTimeout(() => {
			if (
				net.kind === "standalone" &&
				!net.isHost &&
				net.me === -1 &&
				net.room === awaitingRoom
			) {
				net.status =
					"No host answered. Check the code and use the exact same browser address.";
				showCoop("join");
			}
		}, 7000);
	}
	showCoop("lobby");
}
function encodeSignal(description) {
	return btoa(JSON.stringify(description));
}
function decodeSignal(code) {
	return JSON.parse(atob(code.trim()));
}
async function gatherICE(pc) {
	if (pc.iceGatheringState === "complete") return;
	await new Promise((resolve) => {
		const timer = setTimeout(resolve, 5500);
		pc.addEventListener(
			"icegatheringstatechange",
			() => {
				if (pc.iceGatheringState === "complete") {
					clearTimeout(timer);
					resolve();
				}
			},
			{ once: false },
		);
	});
}
function wireChannel(channel, pc, host) {
	let id = null;
	channel.addEventListener("open", () => {
		if (host) {
			id = addGuest(`rtc-${crypto.randomUUID()}`, channel);
			net.status =
				"Friend connected. You can invite another, or enter the house.";
		} else {
			net.channels.set(0, channel);
			net.status = "Connected. Waiting for the host.";
		}
		if (["coop", "lobby"].includes(screen)) showCoop("lobby");
	});
	channel.addEventListener("message", (e) => {
		try {
			handlePacket(JSON.parse(e.data), host ? id : 0);
		} catch {}
	});
	channel.addEventListener("close", () => {
		if (host && id !== null) {
			game.removePlayer(id);
			net.roster = net.roster.filter((p) => p.id !== id);
			net.channels.delete(id);
		} else if (!host && net.kind !== "solo") {
			netEnded = true;
			showDisconnected();
		}
	});
	pc.addEventListener("connectionstatechange", () => {
		if (pc.connectionState === "failed") {
			net.status =
				"Connection failed. Create a fresh invitation and try again.";
			if (screen === "coop" || screen === "lobby") showCoop("remote");
		}
	});
}
async function createOffer() {
	cancelReplay();
	if (net.kind === "solo" || !net.isHost) {
		resetNetwork();
		net.kind = "standalone";
		net.isHost = true;
		game.reset(net.roster);
	}
	if (net.roster.length >= 4) {
		net.status = "The house is full.";
		showCoop("lobby");
		return;
	}
	const pc = new RTCPeerConnection({
		iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
	});
	const channel = pc.createDataChannel("creaks", { ordered: true });
	net.pending = { pc, channel };
	wireChannel(channel, pc, true);
	net.status = "Preparing an invitation…";
	showCoop("remote");
	try {
		await pc.setLocalDescription(await pc.createOffer());
		await gatherICE(pc);
		net.pending.offer = encodeSignal(pc.localDescription);
		net.status = "Invitation ready. Send it to one friend.";
		showCoop("remote");
	} catch (e) {
		net.status = `Could not make an invitation: ${e.message}`;
		showCoop("remote");
	}
}
async function acceptOffer(code) {
	cancelReplay();
	try {
		const desc = decodeSignal(code);
		if (desc.type !== "offer") throw new Error("This is not an invitation.");
		resetNetwork();
		net.kind = "standalone";
		net.isHost = false;
		net.me = -1;
		net.roster = [];
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		net.pc = pc;
		pc.ondatachannel = (e) => wireChannel(e.channel, pc, false);
		await pc.setRemoteDescription(desc);
		await pc.setLocalDescription(await pc.createAnswer());
		await gatherICE(pc);
		net.answer = encodeSignal(pc.localDescription);
		net.status = "Reply ready. Send it back to the host.";
		showCoop("answer");
	} catch (e) {
		net.status = `Could not read the invitation: ${e.message}`;
		showCoop("remote");
	}
}
async function acceptAnswer(code) {
	try {
		const desc = decodeSignal(code);
		if (desc.type !== "answer") throw new Error("This is not a reply.");
		await net.pending.pc.setRemoteDescription(desc);
		net.status = "Connecting to your friend…";
		showCoop("remote");
	} catch (e) {
		net.status = `Could not read the reply: ${e.message}`;
		showCoop("remote");
	}
}
function showDisconnected() {
	previousScreen = "title";
	openPanel(
		"disconnected",
		header("A DOOR CLOSES", "The host has left.") +
			'<p>This shared night is over. Your own house is still waiting.</p><div class="panel-footer"><button class="primary" data-action="disconnect">Back to title <span>→</span></button></div>',
	);
}
let _coopPage = "choose";
function showCoop(page = "choose") {
	cancelReplay();
	_coopPage = page;
	previousScreen = "title";
	let body = "";
	if (page === "choose") {
		body = `<p>Explore one house together. Share the urn, watch each other’s backs, and try to leave with everyone accounted for.</p><div class="menu-stack"><button class="primary" data-action="local-host">Open a same-browser room <span>→</span></button><button class="menu-button" data-action="local-join">Join a same-browser room</button><button class="menu-button" data-action="remote">Across devices · direct connection</button></div><p class="small-print">1–4 guests. Same-browser rooms work between tabs at this exact address. Across devices uses WebRTC with invitation and reply codes. AI Hub sessions connect automatically.</p>`;
	}
	if (page === "join")
		body = `<p class="network-status">${escapeHTML(net.status)}</p><p>Ask the host for their six-letter room code. Open this game at the same address in another tab.</p><input id="roomCode" type="text" maxlength="6" placeholder="ROOM CODE" aria-label="Room code"><div class="panel-footer"><button class="secondary" data-action="coop">Back</button><button class="primary" data-action="join-room">Knock <span>→</span></button></div>`;
	if (page === "lobby")
		body = `${net.room ? `<p>Same-browser room</p><div class="code-display">${escapeHTML(net.room)}</div>` : "<p>Your shared house is ready.</p>"}<div class="network-step">${net.roster.map((p) => `<p style="color:${p.color}">● ${escapeHTML(p.name)} ${p.id === net.me ? "· you" : ""}</p>`).join("") || "<p>Waiting for a welcome…</p>"}</div><p class="network-status">${escapeHTML(net.status)}</p><div class="panel-footer"><button class="secondary" data-action="disconnect">Disconnect</button>${net.isHost ? '<button class="primary" data-action="start">Enter together <span>→</span></button>' : ""}</div>${!net.room && net.isHost && net.roster.length < 4 ? '<div class="panel-footer"><button class="secondary" data-action="create-offer">Invite another friend</button></div>' : ""}`;
	if (page === "remote")
		body = `<p>Send a private invitation, then paste your friend’s reply. Keep this page open. Each invitation connects one friend.</p><p class="network-status">${escapeHTML(net.status)}</p><div class="network-step"><b>HOST · Invite a friend</b><p>Create a code and send it to your friend by your usual messaging app.</p><button class="secondary" data-action="create-offer">${net.pending?.offer ? "New invitation" : "Create invitation"}</button>${net.pending?.offer ? `<p>Your invitation</p><textarea id="offerCode" readonly aria-label="Your invitation code">${net.pending.offer}</textarea><button class="secondary" data-action="copy-offer">Copy invitation</button><p>Paste their reply here</p><textarea id="replyCode" aria-label="Friend reply code" placeholder="Reply code"></textarea><button class="primary" data-action="accept-answer">Connect friend <span>→</span></button>` : ""}</div><div class="network-step"><b>GUEST · Accept an invitation</b><p>Paste the host’s invitation below. You’ll get a reply to send back.</p><textarea id="incomingOffer" aria-label="Host invitation code" placeholder="Invitation code"></textarea><button class="secondary" data-action="accept-offer">Make my reply</button></div><p class="small-print">Direct connections depend on your networks allowing WebRTC. Some restrictive routers require a relay, which this self-contained game does not provide.</p><div class="panel-footer"><button class="secondary" data-action="coop">Back</button>${net.isHost && net.kind !== "solo" ? '<button class="primary" data-action="lobby">Your guests →</button>' : ""}</div>`;
	if (page === "answer")
		body = `<p>Send this reply to the host. Leave the game open while they connect you.</p><textarea id="answerCode" readonly aria-label="Your reply code">${net.answer || ""}</textarea><div class="panel-footer"><button class="secondary" data-action="copy-answer">Copy reply</button></div><p class="network-status">${escapeHTML(net.status)}</p><div class="panel-footer"><button class="secondary" data-action="disconnect">Cancel connection</button></div>`;
	openPanel(
		"coop",
		header("MISERY LOVES COMPANY", "Bring a friend.") + body,
		true,
	);
	previousScreen = "title";
}
function disconnect() {
	if (net.kind !== "solo") sendPacket({ type: "bye" });
	const departingChannel = net.bc;
	if (departingChannel) {
		departingChannel.onmessage = null;
		net.bc = null;
		setTimeout(() => departingChannel.close(), 250);
	}
	resetNetwork();
	setTitle();
}
const hubConnection = AIHub.connect({ mode: "shared-world", seats: [1, 4] });
async function setupHub() {
	hubInfo = await hubConnection;
	if (!hubInfo) return false;
	net.kind = "hub";
	net.isHost = hubInfo.isHost;
	net.me = hubInfo.me;
	net.roster = hubInfo.players;
	game.reset(hubInfo.players);
	screen = "hub";
	paused = false;
	$("#titleScreen").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	AIHub.on("start", () => {
		hubStarted = true;
		net.started = true;
		screen = "game";
		paused = false;
		$("#overlay").classList.add("hidden");
		resize();
	});
	AIHub.on("message", handlePacket);
	AIHub.on("leave", ({ id }) => {
		net.roster = net.roster.filter((p) => p.id !== id);
		if (net.isHost) game.removePlayer(id);
	});
	AIHub.on("time-up", () => finishHub(false));
	AIHub.on("end", () => {
		hubEnded = true;
		netEnded = true;
		paused = true;
		keys.clear();
		audio.stop();
		$("#overlay").classList.add("hidden");
		$("#touchAction").classList.add("hidden");
	});
	AIHub.probe(() => ({
		scene: screen,
		menu: paused,
		world: {
			floor: localPlayer()?.f,
			players: game.players.length,
			pieces: game.banked.length,
			status: game.status,
			time: game.time,
		},
		input: lastInput,
	}));
	AIHub.ready();
	return true;
}
function finishHub(won) {
	if (!hubInfo || !net.isHost || hubFinished || hubEnded) return;
	hubFinished = true;
	const ids = AIHub.players.map((p) => p.id),
		scores = Object.fromEntries(
			ids.map((id) => [
				id,
				game.banked.length * 1000 +
					(game.players.find((p) => p.id === id)?.score || 0),
			]),
		);
	AIHub.finish({
		standings: [ids],
		scores,
		won,
		stats: Object.fromEntries(
			ids.map((id) => [
				id,
				{
					"Urn fragments": game.banked.length,
					"Matches struck": game.matchesUsed,
					"Nerves lost": game.hits,
				},
			]),
		),
	});
}

function focusables() {
	return (
		screen === "title"
			? $$("#titleScreen button")
			: $$(
					'#panel button,#panel input,#panel select,#panel textarea,#panel [tabindex="0"]',
				)
	).filter((el) => !el.disabled && el.getClientRects().length);
}
function updateFocus(apply = true) {
	const els = focusables();
	menuIndex = clamp(menuIndex, 0, Math.max(0, els.length - 1));
	$$(".focused").forEach((e) => {
		e.classList.remove("focused");
	});
	if (apply && lastInput !== "touch") {
		const el = els[menuIndex];
		el?.classList.add("focused");
		el?.focus({ preventScroll: true });
		el?.scrollIntoView({ block: "nearest" });
	}
}
function navigateMenu(direction) {
	const els = focusables();
	if (!els.length) return;
	menuIndex = (menuIndex + direction + els.length) % els.length;
	updateFocus(true);
	audio.play("click");
}
function adjustFocused(direction) {
	const el = focusables()[menuIndex];
	if (el?.type === "range") {
		el.value = clamp(
			Number(el.value) + Number(el.step || 1) * direction,
			Number(el.min),
			Number(el.max),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (el?.tagName === "SELECT") {
		el.selectedIndex = clamp(
			el.selectedIndex + direction,
			0,
			el.options.length - 1,
		);
		el.dispatchEvent(new Event("change", { bubbles: true }));
	} else if (screen === "map") {
		showMap(mapFloor + direction);
	}
}
function activateFocused() {
	focusables()[menuIndex]?.click();
}
function action(name) {
	audio.unlock();
	audio.play("click");
	if (name === "start") {
		newNight();
		return;
	}
	if (name === "continue") {
		resetNetwork();
		newNight(true);
		return;
	}
	if (name === "resume") {
		closePanel();
		return;
	}
	if (name === "back") {
		if (screen === "dev") showPause();
		else closePanel();
		return;
	}
	if (name === "pause") {
		showPause();
		return;
	}
	if (name === "help") {
		showHelp();
		return;
	}
	if (name === "settings") {
		showSettings();
		return;
	}
	if (name === "about" || name.startsWith("about-")) {
		showAbout(name === "about" ? 0 : Number(name.split("-")[1]));
		return;
	}
	if (name === "dev") {
		showDev();
		return;
	}
	if (name === "map" || name.startsWith("map-")) {
		showMap(
			name === "map"
				? localPlayer()?.f || 0
				: name === "map-prev"
					? mapFloor - 1
					: name === "map-next"
						? mapFloor + 1
						: Number(name.split("-")[1]),
		);
		return;
	}
	if (name === "quit") {
		if (hubInfo) return;
		if (net.kind === "solo" && game.status === "playing")
			safeWrite(SAVE_KEY, game.snapshot());
		disconnect();
		return;
	}
	if (name === "restart") {
		if (net.isHost) newNight();
		return;
	}
	if (name === "motion" || name === "contrast") {
		settings[name] = !settings[name];
		safeWrite(PREF_KEY, settings);
		showSettings();
		return;
	}
	if (name === "fullscreen") {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else document.documentElement.requestFullscreen?.().catch(() => {});
		return;
	}
	if (name === "coop") {
		showCoop();
		return;
	}
	if (name === "local-host") {
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
		const bytes = crypto.getRandomValues(new Uint8Array(6));
		openBroadcast(
			[...bytes].map((n) => alphabet[n % alphabet.length]).join(""),
			true,
		);
		return;
	}
	if (name === "local-join") {
		showCoop("join");
		return;
	}
	if (name === "join-room") {
		const code = $("#roomCode")?.value.trim();
		if (code) openBroadcast(code, false);
		return;
	}
	if (name === "remote") {
		showCoop("remote");
		return;
	}
	if (name === "lobby") {
		showCoop("lobby");
		return;
	}
	if (name === "create-offer") {
		createOffer();
		return;
	}
	if (name === "accept-offer") {
		acceptOffer($("#incomingOffer")?.value || "");
		return;
	}
	if (name === "accept-answer") {
		acceptAnswer($("#replyCode")?.value || "");
		return;
	}
	if (name === "copy-offer" || name === "copy-answer") {
		const el = $(name === "copy-offer" ? "#offerCode" : "#answerCode");
		el?.select();
		navigator.clipboard?.writeText(el?.value || "").catch(() => {});
		return;
	}
	if (name === "disconnect") {
		disconnect();
		return;
	}
	if (!isAuthority()) return;
	const p = localPlayer();
	if (name === "god") game.god = !game.god;
	if (name === "reveal") game.reveal = !game.reveal;
	if (name === "collisions") {
		debugCollisions = !debugCollisions;
		drawCollisions();
	}
	if (name === "refill" && p) {
		p.health = 5;
		p.matches = 18;
		p.invuln = 5;
	}
	if (name === "floor-up" && p) game.teleport(p, 0, 5, Math.min(3, p.f + 1));
	if (name === "floor-down" && p) game.teleport(p, 0, 5, Math.max(0, p.f - 1));
	if (name === "grant-key") grant("key");
	if (name === "grant-ward") grant("ward");
	if (name === "grant-shard") {
		const i = game.items.find((i) => i.id.startsWith("shard") && !i.banked);
		if (i) grant(i.id);
	}
	if (name === "reset-tuning") {
		game.tuning = { ...DEFAULTS };
		game.god = false;
		game.reveal = false;
		debugCollisions = false;
		drawCollisions();
	}
	if (screen === "dev") showDev();
}
let collisionGroup = null;
function drawCollisions() {
	if (collisionGroup) {
		scene.remove(collisionGroup);
		collisionGroup = null;
	}
	if (!debugCollisions) return;
	collisionGroup = new THREE.Group();
	const { vertices, colors } = game.world.debugRender();
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
	g.setAttribute("color", new THREE.BufferAttribute(colors, 4));
	const l = new THREE.LineSegments(
		g,
		new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
	);
	collisionGroup.add(l);
	scene.add(collisionGroup);
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) {
		if (attract) {
			endAttract();
			return;
		}
		action(b.dataset.action);
	}
});
document.addEventListener("focusin", (e) => {
	const index = focusables().indexOf(e.target);
	if (index >= 0) menuIndex = index;
});
document.addEventListener("pointerover", (e) => {
	const b = e.target.closest("button,input,select,textarea");
	if (b) {
		markInput(e.pointerType === "touch" ? "touch" : "keyboard");
		const n = focusables().indexOf(b);
		if (n >= 0) {
			menuIndex = n;
			updateFocus(false);
		}
	}
});
document.addEventListener("input", (e) => {
	const key = e.target.dataset.setting;
	if (key) {
		settings[key] =
			e.target.type === "range" ? Number(e.target.value) : e.target.value;
		safeWrite(PREF_KEY, settings);
		audio.updateVolumes();
		const o = $(`#out-${key}`);
		if (o) o.textContent = `${Math.round(settings[key] * 100)}%`;
		updatePrompts();
	}
	const tuning = e.target.dataset.tuning;
	if (tuning && isAuthority()) {
		game.tuning[tuning] = Number(e.target.value);
		$(`#devout-${tuning}`).textContent = e.target.value;
	}
});
document.addEventListener("change", (e) => {
	const key = e.target.dataset.setting;
	if (key) {
		settings[key] = e.target.value;
		safeWrite(PREF_KEY, settings);
		if (key === "difficulty" && net.kind === "solo")
			game.tuning.enemySpeed =
				settings.difficulty === "quiet"
					? 0.65
					: settings.difficulty === "dire"
						? 1.3
						: 1;
		updatePrompts();
	}
});
const KEY_ACTIONS = {
	KeyE: "interact",
	Space: "match",
	KeyQ: "drop",
	KeyF: "pulse",
};
function backInput() {
	if (hubEnded) return;
	if (screen === "title") return;
	if (screen === "game") showPause();
	else if (screen === "pause" || screen === "map" || screen === "note")
		closePanel();
	else if (screen === "dev") showPause();
	else if (screen === "ending") {
		if (!hubInfo) disconnect();
	} else closePanel();
}
addEventListener("keydown", (e) => {
	if (markInput("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	if (e.target.matches("textarea,input[type=text]")) {
		if (e.code === "Escape") backInput();
		return;
	}
	if (
		e.target.classList?.contains("credits-text") &&
		[
			"Space",
			"Enter",
			"ArrowUp",
			"ArrowDown",
			"PageUp",
			"PageDown",
			"Home",
			"End",
		].includes(e.code)
	)
		return;
	if (
		["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
			e.code,
		)
	)
		e.preventDefault();
	if (e.code === "Tab" && screen !== "game") {
		e.preventDefault();
		const elements = focusables(),
			index = elements.indexOf(document.activeElement),
			direction = e.shiftKey ? -1 : 1;
		if (elements.length) {
			menuIndex =
				index < 0
					? e.shiftKey
						? elements.length - 1
						: 0
					: (index + direction + elements.length) % elements.length;
			updateFocus(true);
		}
		return;
	}
	if (e.repeat) return;
	if (e.code === "Tab" && screen === "game") e.preventDefault();
	keys.add(e.code);
	if (e.code === "Escape") {
		backInput();
		return;
	}
	if (screen === "game") {
		if (e.code === "Tab") {
			showMap();
			return;
		}
		if (KEY_ACTIONS[e.code]) pulses[KEY_ACTIONS[e.code]] = true;
	} else {
		if (e.code === "ArrowDown" || e.code === "KeyS") navigateMenu(1);
		if (e.code === "ArrowUp" || e.code === "KeyW") navigateMenu(-1);
		if (e.code === "ArrowLeft") adjustFocused(-1);
		if (e.code === "ArrowRight") adjustFocused(1);
		if (e.code === "Enter" || e.code === "Space") activateFocused();
	}
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => {
	keys.clear();
	touches.clear();
	if (screen === "game" && net.kind === "solo" && !attract) showPause();
});
addEventListener("resize", resize);
let mouseAngle = null,
	mouseHush = false,
	padState = [],
	padRepeat = 0,
	stick = { x: 0, z: 0 },
	touchAuto = 0;
const raycaster = new THREE.Raycaster(),
	ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
	pointerHit = new THREE.Vector3();
function aimPointer(x, y) {
	if (!camera) return;
	raycaster.setFromCamera(
		new THREE.Vector2((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1),
		camera,
	);
	if (raycaster.ray.intersectPlane(ground, pointerHit)) {
		const p = localPlayer();
		if (p) mouseAngle = Math.atan2(pointerHit.x - p.x, pointerHit.z - p.z);
	}
}
$("#world").addEventListener("contextmenu", (e) => e.preventDefault());
$("#world").addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") {
		e.preventDefault();
		if (markInput("touch")) return;
		audio.unlock();
		const left = e.clientX < innerWidth * 0.5;
		touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			startX: e.clientX,
			startY: e.clientY,
			left,
			start: performance.now(),
		});
		$("#world").setPointerCapture(e.pointerId);
		if (left) {
			$("#touchRing").style.left = `${e.clientX - 45}px`;
			$("#touchRing").style.top = `${e.clientY - 45}px`;
			$("#touchRing").classList.remove("hidden");
		}
		return;
	}
	if (markInput("keyboard")) return;
	audio.unlock();
	aimPointer(e.clientX, e.clientY);
	if (screen !== "game") return;
	if (e.button === 2) {
		mouseHush = true;
		return;
	}
	const p = localPlayer(),
		n = p && game.nearest(p);
	if (n && Math.hypot(pointerHit.x - n.x, pointerHit.z - n.z) < 2.5)
		pulses.interact = true;
	else if (p?.carry === "ward") pulses.pulse = true;
	else pulses.match = true;
});
$("#world").addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") {
		const t = touches.get(e.pointerId);
		if (t) {
			t.x = e.clientX;
			t.y = e.clientY;
			if (t.left) {
				stick.x = clamp((t.x - t.startX) / 60, -1, 1);
				stick.z = clamp((t.y - t.startY) / 60, -1, 1);
			} else aimPointer(t.x, t.y);
		}
		return;
	}
	if (e.movementX || e.movementY) {
		if (markInput("keyboard")) return;
		aimPointer(e.clientX, e.clientY);
	}
});
function releasePointer(e) {
	if (e.pointerType === "touch") {
		const t = touches.get(e.pointerId);
		if (
			t &&
			!t.left &&
			Math.hypot(t.x - t.startX, t.y - t.startY) < 20 &&
			screen === "game"
		) {
			const p = localPlayer();
			if (p && game.nearest(p)) pulses.interact = true;
			else pulses.match = true;
		}
		if (t?.left) {
			stick = { x: 0, z: 0 };
			$("#touchRing").classList.add("hidden");
		}
		touches.delete(e.pointerId);
	} else if (e.button === 2) mouseHush = false;
}
$("#world").addEventListener("pointerup", releasePointer);
$("#world").addEventListener("pointercancel", releasePointer);
$("#touchAction").addEventListener("click", () => {
	markInput("touch");
	pulses.interact = true;
});
document.addEventListener(
	"pointerdown",
	(e) => {
		if (e.target !== $("#world")) {
			if (markInput(e.pointerType === "touch" ? "touch" : "keyboard"))
				e.stopImmediatePropagation();
			audio.unlock();
		}
	},
	{ capture: true },
);
function pollPad(now) {
	const pad = Array.from(navigator.getGamepads?.() || []).find(
		(p) => p?.connected,
	);
	const input = {};
	if (!pad) return input;
	const b = pad.buttons.map((b) => b.pressed),
		edge = (i) => b[i] && !padState[i],
		dead = (v) => (Math.abs(v) > 0.18 ? v : 0),
		ax = dead(pad.axes[0] || 0),
		ay = dead(pad.axes[1] || 0),
		rx = dead(pad.axes[2] || 0),
		ry = dead(pad.axes[3] || 0);
	const activity =
		Math.abs(ax) + Math.abs(ay) + Math.abs(rx) + Math.abs(ry) > 0.1 ||
		b.some((v, i) => v && !padState[i]);
	if (activity) {
		if (markInput("gamepad")) {
			padState = b;
			return {};
		}
		audio.unlock();
	}
	if (screen === "game") {
		input.sx = ax;
		input.sz = ay;
		input.hush = b[4];
		input.interact = b[0];
		input.drop = b[1];
		input.pulse = b[2];
		input.match = b[7];
		if (Math.hypot(rx, ry) > 0.2)
			input.angle = Math.atan2(
				rx * Math.cos(view.yaw) + ry * Math.sin(view.yaw),
				-rx * Math.sin(view.yaw) + ry * Math.cos(view.yaw),
			);
		if (edge(3)) showMap();
		if (edge(9) && !(hubInfo && b[8])) showPause();
	} else if (!hubEnded) {
		if (Math.abs(ry) > 0.2 && screen !== "title") {
			const scrollArea = screen === "about" ? $(".credits-text") : $("#panel");
			if (scrollArea) scrollArea.scrollTop += ry * 22;
		}
		if ((edge(12) || edge(13) || Math.abs(ay) > 0.5) && now > padRepeat) {
			navigateMenu(b[12] || ay < -0.5 ? -1 : 1);
			padRepeat = now + 190;
		}
		if ((edge(14) || edge(15) || Math.abs(ax) > 0.5) && now > padRepeat) {
			adjustFocused(b[14] || ax < -0.5 ? -1 : 1);
			padRepeat = now + 170;
		}
		if (edge(0)) activateFocused();
		if (edge(1) || (edge(9) && !(hubInfo && b[8]))) backInput();
		if (screen === "map" && edge(4)) showMap(mapFloor - 1);
		if (screen === "map" && edge(5)) showMap(mapFloor + 1);
	}
	padState = b;
	return input;
}
function readInput(now) {
	const pad = pollPad(now),
		p = localPlayer();
	let sx =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
		sz =
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
	if (lastInput === "gamepad") {
		sx = pad.sx || 0;
		sz = pad.sz || 0;
	}
	if (lastInput === "touch") {
		sx = stick.x;
		sz = stick.z;
	}
	const input = {
		x: sx * Math.cos(view.yaw) + sz * Math.sin(view.yaw),
		z: -sx * Math.sin(view.yaw) + sz * Math.cos(view.yaw),
		hush:
			keys.has("ShiftLeft") || keys.has("ShiftRight") || mouseHush || pad.hush,
		...pulses,
	};
	for (const k of ["interact", "drop", "pulse", "match"])
		input[k] = !!(input[k] || pad[k]);
	if (pad.angle !== undefined) input.angle = pad.angle;
	else if (lastInput !== "gamepad" && mouseAngle !== null)
		input.angle = mouseAngle;
	if (lastInput === "touch" && p && screen === "game") {
		if (
			p.match < 0.2 &&
			p.matches > 0 &&
			dist(p, SAFE[p.f]) > 2.2 &&
			game.time - touchAuto > 1
		) {
			input.match = true;
			touchAuto = game.time;
		}
		if (
			p.carry === "ward" &&
			p.cooldown === 0 &&
			game.enemies.some((e) => e.f === p.f && dist(e, p) < 4)
		)
			input.pulse = true;
		if (game.time % game.tuning.windInterval > game.tuning.windInterval - 4.4)
			input.hush = true;
	}
	return input;
}
function clearPulses() {
	for (const k of Object.keys(pulses)) delete pulses[k];
}

function beginAttract() {
	if (net.kind !== "solo" || screen !== "title") return;
	game.reset([{ id: 0, name: "The visitor", color: "#efc477" }]);
	game.attract = true;
	attract = true;
	attractTime = 0;
	attractPhase = -1;
	game.tuning.windInterval = 22;
	screen = "attract";
	$("#titleScreen").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	$("#attractBanner").classList.remove("hidden");
	resize();
}
function endAttract() {
	attract = false;
	game.attract = false;
	game.tuning = { ...DEFAULTS };
	game.reset([{ id: 0, name: "You", color: SEAT_COLORS[0] }]);
	setTitle();
}
function attractInput(dt) {
	attractTime += dt;
	const phase = Math.floor(attractTime / 10) % 8;
	let p = localPlayer();
	if (!p) return {};
	if (phase !== attractPhase) {
		attractPhase = phase;
		const stages = [
			{ f: 0, x: -2, z: 5, tx: 10, tz: -6.6, id: "key" },
			{ f: 1, x: 12, z: 7, tx: 0, tz: -5.8, id: "shard0" },
			{ f: 0, x: 11, z: 5, tx: 0, tz: 6.3, carry: "shard0", use: true },
			{ f: 1, x: 0, z: 5, tx: -10, tz: 5.5, id: "ward" },
			{ f: 1, x: -10, z: -4, tx: -12, tz: -7, carry: "key", use: true },
			{ f: 2, x: -12, z: -7, tx: -10, tz: 5.8, id: "shard1" },
			{ f: 3, x: -10, z: -5, tx: 10, tz: -6.2, id: "shard2" },
			{ f: 0, x: 10, z: 5, tx: 0, tz: 6.3, carry: "shard2", use: true },
		];
		const s = stages[phase];
		if (phase === 0 && attractTime > 20) {
			game.reset([{ id: 0, name: "The visitor", color: SEAT_COLORS[0] }]);
			game.attract = true;
			p = localPlayer();
		}
		if (p.carry) game.drop(p);
		game.teleport(p, s.x, s.z, s.f);
		if (s.carry) {
			const i = game.items.find((i) => i.id === s.carry);
			i.banked = false;
			i.holder = p.id;
			p.carry = i.id;
			game.banked = game.banked.filter((id) => id !== i.id);
		}
		attractTarget = s;
		attractPath = game.pathTo(p, s.tx, s.tz);
	}
	p.match = 10;
	p.matches = 18;
	p.invuln = 10;
	const next = attractPath[0];
	if (next) {
		const dx = next.x - p.x,
			dz = next.z - p.z,
			d = Math.hypot(dx, dz);
		if (d < 0.2) attractPath.shift();
		return {
			x: dx / Math.max(d, 0.01),
			z: dz / Math.max(d, 0.01),
			hush: game.wind > 0,
		};
	}
	if (attractTarget) {
		game.interact(p);
		attractTarget = null;
		if (p.carry === "ward") {
			game.enemies
				.filter((e) => e.f === p.f)
				.forEach((e, i) => {
					e.x = p.x + 2 + i;
					e.z = p.z + 1;
				});
			game.pulse(p);
		}
	}
	if (p.carry === "ward" && p.cooldown === 0) game.pulse(p);
	return { x: Math.sin(attractTime) * 0.15, z: 0, hush: game.wind > 0 };
}

function frame(now) {
	const dt = Math.min(0.08, Math.max(0.001, (now - lastFrame) / 1000));
	lastFrame = now;
	titleTime += dt;
	frameCount++;
	let input = readInput(now);
	const gameActive =
		(screen === "game" ||
			screen === "attract" ||
			(net.kind !== "solo" && net.started)) &&
		!hubEnded &&
		!netEnded &&
		(!hubInfo || (hubStarted && AIHub.time() >= 0));
	if (attract) input = attractInput(dt);
	if (
		gameActive &&
		(!paused || net.kind !== "solo") &&
		game.status === "playing"
	) {
		if (isAuthority()) {
			const inputs = {};
			for (const p of game.players) {
				if (p.id === net.me && !hubInfo?.server)
					inputs[p.id] = screen === "game" || attract ? input : {};
				else
					inputs[p.id] =
						now - (net.inputAt[p.id] || 0) < 500 ? net.inputs[p.id] || {} : {};
			}
			accumulator += dt;
			let loops = 0;
			while (accumulator >= 1 / 60 && loops++ < 8) {
				game.update(1 / 60, inputs);
				accumulator -= 1 / 60;
			}
			processEvents();
		} else if (now - lastNetSend > 85) {
			sendPacket(
				{ type: "input", input: screen === "game" ? input : {} },
				hubInfo?.host ?? 0,
			);
			lastNetSend = now;
		}
	}
	if (net.kind === "standalone" && net.started && !netEnded) {
		if (net.isHost) {
			for (const q of [...game.players])
				if (
					q.id !== net.me &&
					now - (net.inputAt[q.id] || net.joinedAt[q.id] || now) > 9000
				) {
					game.removePlayer(q.id);
					net.roster = net.roster.filter((p) => p.id !== q.id);
					net.channels.get(q.id)?.close();
					net.channels.delete(q.id);
					toast(`${q.name} has left the house.`);
				}
		} else if (net.lastState && now - net.lastState > 12000) {
			netEnded = true;
			showDisconnected();
		}
	}
	if (
		isAuthority() &&
		net.kind !== "solo" &&
		!hubEnded &&
		!netEnded &&
		now - lastNetSend > 105
	) {
		sendPacket({
			type: "state",
			snapshot: game.snapshot(),
			started: net.started,
			events: net.eventQueue,
		});
		net.eventQueue = [];
		lastNetSend = now;
	}
	if (!attract && game.finished && net.started && !hubEnded) {
		if (hubInfo) finishHub(game.status === "won");
		else if (screen === "game") showEnd(game.status === "won");
	}
	if (screen === "title" && now - lastActivity >= 10000 && !attract)
		beginAttract();
	if ((screen === "game" || screen === "attract") && !hubEnded) updateHUD();
	if (
		net.kind === "solo" &&
		screen === "game" &&
		!attract &&
		now - lastSave > 20000
	) {
		safeWrite(SAVE_KEY, game.snapshot());
		lastSave = now;
	}
	updateVisuals(dt);
	audio.update();
	try {
		renderer.render(scene, camera);
		gpuFrames++;
	} catch (e) {
		window.__creaksErrors.push(String(e));
		if (window.__creaksErrors.length === 1) console.error(e);
	}
	clearPulses();
	requestAnimationFrame(frame);
}
window.__creaksErrors = [];
function installDebug() {
	window.__creaks = {
		ready: true,
		version: "1.0.0",
		player: () => ({ ...localPlayer() }),
		projectPlayer: () => {
			const p = localPlayer();
			if (!p) return null;
			const v = new THREE.Vector3(p.x, 1, p.z).project(camera);
			return { x: v.x, y: v.y };
		},
		state: () => ({
			...game.snapshot(),
			screen,
			paused,
			lastInput,
			attract,
			renderFloor,
			frameCount,
			gpuFrames,
			backend: renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2",
			music: settings.music,
			sfx: settings.sfx,
			glyphs: settings.glyphs,
			devUsed,
			net: {
				kind: net.kind,
				me: net.me,
				isHost: net.isHost,
				roster: net.roster,
				stats: net.stats,
				started: net.started,
				status: net.status,
				receivedInputs: net.inputs,
				heldKeys: [...keys],
				rtc:
					net.pending?.pc?.connectionState || net.pc?.connectionState || "none",
				ice:
					net.pending?.pc?.iceConnectionState ||
					net.pc?.iceConnectionState ||
					"none",
			},
			audio: {
				state: audio.ctx?.state || "uninitialized",
				notes: audio.notesPlayed,
				effects: audio.effectsPlayed,
				voices: audio.voicesPlayed,
				level: audio.levels(),
			},
		}),
		start: () => newNight(),
		pause: () => showPause(),
		resume: () => {
			previousScreen = "game";
			closePanel();
		},
		action,
		teleport: (x, z, f) => {
			const p = localPlayer();
			if (p && isAuthority()) game.teleport(p, x, z, f);
		},
		tune: (v) => {
			if (isAuthority()) Object.assign(game.tuning, v);
		},
		god: (v) => {
			game.god = v;
		},
		ignite: () => game.ignite(localPlayer()),
		interact: () => game.interact(localPlayer()),
		drop: () => game.drop(localPlayer()),
		pulse: () => game.pulse(localPlayer()),
		path: (x, z) => game.pathTo(localPlayer(), x, z),
		step: (seconds, input = {}) => {
			if (!isAuthority()) return;
			for (let i = 0; i < Math.ceil(seconds * 60); i++)
				game.update(1 / 60, { [net.me]: input });
			processEvents();
		},
		snapshot: () => game.snapshot(),
		restore: (s) => game.apply(s),
		audioTest: async () => {
			await audio.unlock();
			audio.play("match");
			audio.play("bank");
			audio.voice(4);
		},
		setIdle: () => {
			lastActivity = performance.now() - 10001;
		},
		offer: () => net.pending?.offer,
		answer: () => net.answer,
		acceptOffer,
		acceptAnswer,
		createOffer,
		stopAudio: () => audio.stop(),
	};
}
async function boot() {
	try {
		await hubConnection;
		$("#loadMessage").textContent = "Striking a little WebGPU…";
		await HouseGame.init();
		game = new HouseGame();
		game.reset([{ id: 0, name: "You", color: SEAT_COLORS[0] }]);
		renderer = new THREE.WebGPURenderer({
			canvas: $("#world"),
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		await renderer.init();
		buildWorld();
		installDebug();
		const inHub = await setupHub();
		$("#loading").classList.add("hidden");
		if (!inHub) setTitle();
		else resize();
		updatePrompts();
		requestAnimationFrame(frame);
	} catch (e) {
		console.error(e);
		$("#loadMessage").textContent =
			"The house could not wake: " +
			e.message +
			". Open this file in a current Chrome or Edge browser with an internet connection for the pinned libraries.";
		AIHub.fail(e.message);
		window.__creaksErrors.push(String(e));
	}
}
addEventListener("pagehide", (e) => {
	if (e.persisted) return;
	if (net.kind === "standalone" && !netEnded) sendPacket({ type: "bye" });
	net.bc?.close();
	for (const c of net.channels.values()) c.close();
	audio.stop();
	renderer?.dispose();
});
boot();
