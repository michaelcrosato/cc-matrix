import * as THREE from "three/src/Three.WebGPU.js";
import { CHECKPOINTS, LADDERS, PLATFORMS } from "./game.js";

export { THREE };

const C = {
	ink: 0x09232a,
	rock: 0x244950,
	moss: 0x628f67,
	mint: 0xa6dcb0,
	teal: 0x39747b,
	gold: 0xf7be5c,
	cream: 0xffe6af,
	coral: 0xe57a54,
	blue: 0x65c8cf,
};
const grad = new THREE.DataTexture(
	new Uint8Array([
		65, 65, 65, 255, 128, 128, 128, 255, 200, 200, 200, 255, 255, 255, 255, 255,
	]),
	4,
	1,
	THREE.RGBAFormat,
);
grad.minFilter = THREE.NearestFilter;
grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;
const materials = new Map();
export function mat(color, unlit = false) {
	const k = color + ":" + unlit;
	if (!materials.has(k))
		materials.set(
			k,
			unlit
				? new THREE.MeshBasicMaterial({ color })
				: new THREE.MeshToonMaterial({ color, gradientMap: grad }),
		);
	return materials.get(k);
}
const outline = new THREE.MeshBasicMaterial({
	color: C.ink,
	side: THREE.BackSide,
});
export function mesh(geo, color, parent, x = 0, y = 0, z = 0, ink = true) {
	const m = new THREE.Mesh(geo, typeof color === "object" ? color : mat(color));
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	if (ink) {
		const edge = new THREE.Mesh(geo, outline);
		edge.scale.setScalar(1.045);
		edge.castShadow = false;
		m.add(edge);
	}
	if (parent) parent.add(m);
	return m;
}
const sphere = new THREE.SphereGeometry(1, 12, 8),
	box = new THREE.BoxGeometry(1, 1, 1);
export function ball(parent, color, x, y, z, sx, sy = sx, sz = sx) {
	const m = mesh(sphere, color, parent, x, y, z);
	m.scale.set(sx, sy, sz);
	return m;
}
export function block(parent, color, x, y, z, sx, sy, sz, ink = true) {
	const m = mesh(box, color, parent, x, y, z, ink);
	m.scale.set(sx, sy, sz);
	return m;
}
function cone(parent, color, x, y, z, r, h, s = 6) {
	return mesh(new THREE.ConeGeometry(r, h, s), color, parent, x, y, z);
}
function tube(parent, color, points, r = 0.04, segments = 16, ink = false) {
	const curve = new THREE.CatmullRomCurve3(
		points.map((p) => new THREE.Vector3(...p)),
	);
	return mesh(
		new THREE.TubeGeometry(curve, segments, r, 5, false),
		color,
		parent,
		0,
		0,
		0,
		ink,
	);
}
function rng(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function label(text, color = "#fff0bf", size = 1.2) {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 128;
	const ctx = c.getContext("2d");
	ctx.font = "700 48px Georgia";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = color;
	ctx.fillText(text, 512, 64);
	const tex = new THREE.CanvasTexture(c);
	const sp = new THREE.Sprite(
		new THREE.SpriteMaterial({ map: tex, depthWrite: false }),
	);
	sp.scale.set(size * 8, size, 1);
	return sp;
}
function oval(parent, x, y, z, rx, ry, color = C.ink) {
	const m = mesh(
		new THREE.CircleGeometry(1, 24),
		mat(color, true),
		parent,
		x,
		y,
		z,
		false,
	);
	m.scale.set(rx, ry, 1);
	m.rotation.x = -Math.PI / 2;
	return m;
}
export function makeExplorer(tint = 0x93a86b) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	root.add(rig);
	rig.name = "Torso";
	const hips = ball(rig, 0x886c46, 0, 0.7, 0, 0.31, 0.24, 0.22);
	hips.name = "hips";
	block(rig, tint, 0, 1.05, 0, 0.63, 0.64, 0.4);
	block(rig, 0xc8ad70, 0, 0.81, 0.25, 0.65, 0.09, 0.06);
	block(rig, 0xefe0a8, 0.04, 0.81, 0.3, 0.12, 0.12, 0.05);
	block(rig, 0x6a5741, 0, 1.07, -0.32, 0.56, 0.55, 0.3);
	block(rig, 0xbda16b, 0, 1.13, -0.51, 0.39, 0.23, 0.05);
	const scarf = mesh(
		new THREE.TorusGeometry(0.23, 0.08, 5, 12),
		C.coral,
		rig,
		0,
		1.37,
		0,
	);
	scarf.rotation.x = Math.PI / 2;
	const tail = block(rig, C.coral, -0.26, 1.2, 0.22, 0.16, 0.42, 0.07);
	tail.rotation.z = -0.35;
	ball(rig, 0xf1bc8a, 0, 1.58, 0.015, 0.31, 0.34, 0.28);
	ball(rig, 0xf5c998, 0.035, 1.53, 0.29, 0.115, 0.095, 0.12);
	for (const x of [-0.14, 0.14]) {
		ball(rig, 0xfff1d3, x, 1.65, 0.25, 0.078, 0.09, 0.035);
		ball(rig, C.ink, x + 0.013, 1.655, 0.286, 0.031, 0.045, 0.018);
		const brow = block(rig, 0x674a31, x, 1.77, 0.25, 0.14, 0.036, 0.026);
		brow.rotation.z = x > 0 ? -0.12 : 0.12;
	}
	const smile = tube(
		rig,
		C.ink,
		[
			[-0.07, 1.43, 0.26],
			[0, 1.41, 0.28],
			[0.085, 1.44, 0.26],
		],
		0.014,
		6,
	);
	const brim = mesh(
		new THREE.CylinderGeometry(0.51, 0.52, 0.075, 12),
		0xe9c583,
		rig,
		0,
		1.88,
		0,
	);
	brim.rotation.z = -0.05;
	mesh(
		new THREE.CylinderGeometry(0.27, 0.35, 0.29, 10),
		0xe9c583,
		rig,
		0,
		2.02,
		0,
	);
	mesh(
		new THREE.CylinderGeometry(0.33, 0.35, 0.07, 10),
		0x735f40,
		rig,
		0,
		1.91,
		0,
	);
	const feather = block(rig, C.coral, 0.28, 2.15, -0.01, 0.08, 0.38, 0.025);
	feather.rotation.z = -0.35;
	const limbs = {};
	for (const [name, x, cy, color] of [
		["leftLeg", -0.18, 0.69, 0xb29a5e],
		["rightLeg", 0.18, 0.69, 0xb29a5e],
		["leftArm", -0.39, 1.25, tint],
		["rightArm", 0.39, 1.25, tint],
	]) {
		const g = new THREE.Group();
		g.name = name;
		g.position.set(x, cy, 0);
		rig.add(g);
		const leg = name.includes("Leg");
		mesh(
			new THREE.CapsuleGeometry(leg ? 0.105 : 0.095, leg ? 0.3 : 0.28, 3, 7),
			color,
			g,
			0,
			leg ? -0.25 : -0.22,
			0,
		);
		if (leg) block(g, 0x3b4035, 0.025, -0.57, 0.09, 0.26, 0.19, 0.39);
		else ball(g, 0xf1bc8a, 0, -0.45, 0.02, 0.11, 0.12, 0.1);
		limbs[name] = g;
	}
	const mixer = new THREE.AnimationMixer(root),
		actions = {};
	const track = (name, v, t = [0, 0.25, 0.5, 0.75, 1]) =>
		new THREE.NumberKeyframeTrack(name, t, v);
	const make = (name, tracks, duration = 1) => {
		const clip = new THREE.AnimationClip(name, duration, tracks);
		actions[name] = mixer.clipAction(clip);
	};
	make("idle", [
		track("Torso.position[y]", [0, 0.016, 0.025, 0.016, 0]),
		track("leftArm.rotation[z]", [0.12, 0.14, 0.1, 0.08, 0.12]),
	]);
	make("run", [
		track("leftLeg.rotation[z]", [-0.65, 0, 0.65, 0, -0.65]),
		track("rightLeg.rotation[z]", [0.65, 0, -0.65, 0, 0.65]),
		track("leftArm.rotation[z]", [0.6, 0, -0.6, 0, 0.6]),
		track("rightArm.rotation[z]", [-0.6, 0, 0.6, 0, -0.6]),
		track("Torso.position[y]", [0.025, 0.12, 0.025, 0.12, 0.025]),
	]);
	make("jump", [
		track("leftLeg.rotation[z]", [-0.55, -0.4, -0.25, -0.4, -0.55]),
		track("rightLeg.rotation[z]", [0.6, 0.4, 0.2, 0.4, 0.6]),
		track("leftArm.rotation[z]", [2.1, 2.2, 2.1, 2, 2.1]),
		track("rightArm.rotation[z]", [-1.7, -1.9, -1.7, -1.5, -1.7]),
	]);
	make("climb", [
		track("leftArm.rotation[z]", [2.5, 1.5, 2.5, 1.5, 2.5]),
		track("rightArm.rotation[z]", [-1.5, -2.5, -1.5, -2.5, -1.5]),
		track("leftLeg.rotation[z]", [-0.4, 0.4, -0.4, 0.4, -0.4]),
		track("rightLeg.rotation[z]", [0.4, -0.4, 0.4, -0.4, 0.4]),
	]);
	make("swim", [
		track("Torso.rotation[z]", [-0.5, -0.45, -0.5, -0.55, -0.5]),
		track("leftArm.rotation[z]", [1, 2, 1, 0, 1]),
		track("rightArm.rotation[z]", [-1, 0, -1, -2, -1]),
		track("leftLeg.rotation[z]", [-0.3, 0.3, -0.3, 0.3, -0.3]),
		track("rightLeg.rotation[z]", [0.3, -0.3, 0.3, -0.3, 0.3]),
	]);
	make("float", [
		track("leftArm.rotation[z]", [2.9, 2.85, 2.9, 2.95, 2.9]),
		track("rightArm.rotation[z]", [-2.9, -2.95, -2.9, -2.85, -2.9]),
		track("leftLeg.rotation[z]", [-0.1, -0.3, -0.1, 0.1, -0.1]),
		track("rightLeg.rotation[z]", [0.1, -0.1, 0.1, 0.3, 0.1]),
	]);
	make("wave", [
		track("leftArm.rotation[z]", [2.3, 2.8, 2.3, 2.8, 2.3]),
		track("Torso.position[y]", [0, 0.04, 0, 0.04, 0]),
	]);
	let active = "idle";
	actions.idle.play();
	return {
		root,
		mixer,
		actions,
		animate(name, dt, speed = 1) {
			name = actions[name] ? name : "idle";
			if (name !== active) {
				actions[active].fadeOut(0.16);
				actions[name].reset().fadeIn(0.16).play();
				active = name;
			}
			actions[name].timeScale =
				name === "run"
					? Math.max(0.5, speed * 1.4)
					: name === "climb"
						? speed
						: 1;
			mixer.update(dt);
		},
		get active() {
			return active;
		},
	};
}
function fern(parent, x, y, z, scale = 1, color = 0x628f67) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	g.scale.setScalar(scale);
	parent.add(g);
	for (let i = 0; i < 6; i++) {
		const angle = -1.15 + i * 0.45,
			len = 0.8 + Math.sin(i * 2) * 0.17;
		const pts = [
			[0, 0, 0],
			[Math.sin(angle) * len * 0.45, len * 0.65, 0],
			[Math.sin(angle) * len, len, 0],
		];
		tube(g, 0x335a45, pts, 0.022, 7);
		for (let j = 1; j < 5; j++) {
			const f = j / 5;
			for (const side of [-1, 1]) {
				const leaf = ball(
					g,
					color,
					Math.sin(angle) * len * f + side * 0.12 * f,
					len * (f + 0.17),
					0,
					0.2 * (1 - f * 0.65),
					0.065,
					0.035,
				);
				leaf.rotation.z = angle + side * 0.5;
			}
		}
	}
	return g;
}
function crystal(parent, x, y, z, scale = 1, color = C.blue) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	g.scale.setScalar(scale);
	parent.add(g);
	for (let i = 0; i < 3; i++) {
		const m = mesh(
			new THREE.CylinderGeometry(0.04, 0.25, 0.95, 5),
			color,
			g,
			(i - 1) * 0.28,
			0.42 + (i % 2) * 0.25,
			0,
		);
		m.rotation.z = (i - 1) * -0.28;
	}
	return g;
}
function mushroom(parent, x, y, z, s = 1) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	g.scale.setScalar(s);
	parent.add(g);
	mesh(
		new THREE.CylinderGeometry(0.07, 0.11, 0.48, 6),
		0xedd2a2,
		g,
		0,
		0.24,
		0,
	);
	const cap = ball(g, 0xec8f6b, 0, 0.52, 0, 0.4, 0.19, 0.32);
	for (let i = 0; i < 4; i++)
		ball(
			g,
			0xffdfac,
			Math.cos(i * 2) * 0.22,
			0.6,
			Math.sin(i * 2) * 0.14,
			0.048,
			0.025,
			0.04,
		);
	return g;
}
export function makeFox() {
	const root = new THREE.Group();
	ball(root, 0xe69c55, 0, 0.4, 0, 0.43, 0.35, 0.25);
	ball(root, 0xffdb9a, 0.12, 0.72, 0.07, 0.32, 0.29, 0.27);
	for (const side of [-1, 1]) {
		const ear = cone(root, 0xd97543, side * 0.2, 0.99, 0.02, 0.14, 0.32, 3);
		ear.rotation.z = -side * 0.2;
		ball(root, C.ink, side * 0.13, 0.79, 0.3, 0.032, 0.043, 0.023);
	}
	ball(root, 0xffe8bb, 0.08, 0.63, 0.31, 0.23, 0.12, 0.12);
	ball(root, C.ink, 0.13, 0.68, 0.4, 0.05, 0.04, 0.04);
	for (const x of [-0.25, 0.25])
		ball(root, 0x5f4a32, x, 0.12, 0, 0.1, 0.15, 0.1);
	const tail = new THREE.Group();
	tail.name = "FoxTail";
	tail.position.set(-0.32, 0.35, -0.05);
	root.add(tail);
	const t = ball(tail, 0xe9904b, -0.35, 0.08, 0, 0.4, 0.17, 0.18);
	t.rotation.z = 0.3;
	ball(tail, 0xffdd9a, -0.65, -0.02, 0, 0.17, 0.14, 0.15);
	const mixer = new THREE.AnimationMixer(root);
	mixer
		.clipAction(
			new THREE.AnimationClip("tail", 1.4, [
				new THREE.NumberKeyframeTrack(
					"FoxTail.rotation[y]",
					[0, 0.35, 0.7, 1.05, 1.4],
					[-0.3, 0.1, 0.3, 0.1, -0.3],
				),
			]),
		)
		.play();
	return { root, mixer };
}
export function makeEnemy(type) {
	const g = new THREE.Group();
	const flaps = [];
	if (type === "frog") {
		ball(g, 0x8fb75c, 0, 0.04, 0, 0.48, 0.27, 0.3);
		for (const x of [-0.24, 0.24]) {
			ball(g, 0x96bf68, x, 0.29, 0.08, 0.16);
			ball(g, 0xffe8af, x, 0.33, 0.2, 0.1);
			ball(g, C.ink, x, 0.34, 0.29, 0.045);
			ball(g, 0x628947, x * 1.9, -0.1, 0.07, 0.2, 0.08, 0.22);
		}
		block(g, C.ink, 0, -0.025, 0.29, 0.36, 0.025, 0.02);
	} else if (type === "bat" || type === "condor") {
		const bird = type === "condor";
		ball(
			g,
			bird ? 0x4b6067 : 0x645d80,
			0,
			0,
			0,
			bird ? 0.35 : 0.22,
			bird ? 0.3 : 0.25,
			0.22,
		);
		ball(g, bird ? 0xf4dbc0 : 0x8d799e, 0, 0.26, 0.03, 0.19, 0.18, 0.18);
		for (const s of [-1, 1]) {
			const wing = new THREE.Group();
			wing.name = s < 0 ? "wingL" : "wingR";
			g.add(wing);
			const shape = new THREE.Shape();
			shape.moveTo(0, 0.1);
			shape.lineTo(s * 0.45, 0.45);
			shape.lineTo(s * (bird ? 1.25 : 0.95), 0.25);
			shape.lineTo(s * 0.72, -0.04);
			shape.lineTo(s * 0.48, -0.25);
			shape.lineTo(s * 0.2, -0.15);
			shape.lineTo(0, 0.1);
			const m = mesh(
				new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: false }),
				bird ? 0x526d70 : 0x847699,
				wing,
				0,
				0,
				-0.06,
			);
			if (bird) {
				for (let j = 0; j < 4; j++) {
					const f = block(
						wing,
						0x233b44,
						s * (0.55 + j * 0.15),
						0.08 - j * 0.045,
						0,
						0.13,
						0.4,
						0.07,
					);
					f.rotation.z = s * -0.6;
				}
			}
			flaps.push(wing);
		}
		if (bird) {
			cone(g, 0xf4ba5d, 0.14, 0.19, 0.23, 0.11, 0.27, 4).rotation.x =
				Math.PI / 2;
			mesh(
				new THREE.TorusGeometry(0.2, 0.06, 5, 10),
				0xf5e0b4,
				g,
				0,
				0.11,
				0,
			).rotation.x = Math.PI / 2;
		}
		for (const s of [-1, 1])
			ball(g, C.cream, s * 0.085, 0.3, 0.18, 0.03, 0.045, 0.02);
	} else if (type === "eel") {
		tube(
			g,
			0x557c8d,
			[
				[-0.9, 0, 0],
				[-0.5, 0.1, 0],
				[0, -0.06, 0],
				[0.5, 0.08, 0],
				[0.85, 0.03, 0],
			],
			0.17,
			18,
			true,
		);
		ball(g, 0x75a6ab, 0.85, 0.03, 0, 0.27, 0.18, 0.18);
		ball(g, C.cream, 0.94, 0.1, 0.15, 0.05);
		ball(g, C.ink, 0.96, 0.1, 0.19, 0.022);
		for (let i = 0; i < 4; i++)
			block(
				g,
				mat(0xc1e5b0, true),
				-0.55 + i * 0.37,
				0.02,
				0.16,
				0.045,
				0.2,
				0.02,
				false,
			);
	} else if (type === "scorpion") {
		ball(g, 0xd9ccb1, 0, 0, 0, 0.43, 0.22, 0.25);
		for (const s of [-1, 1]) {
			for (let i = 0; i < 3; i++) {
				const l = block(
					g,
					0xc1b497,
					(i - 1) * 0.22,
					-0.12,
					s * 0.32,
					0.06,
					0.08,
					0.42,
				);
				l.rotation.y = s * (i - 1) * 0.35;
			}
			ball(g, 0xe6d6b5, 0.4, 0.05, s * 0.26, 0.17, 0.12, 0.17);
		}
		tube(
			g,
			0xc4bca8,
			[
				[-0.3, 0.05, 0],
				[-0.6, 0.23, 0],
				[-0.7, 0.62, 0],
				[-0.45, 0.83, 0],
				[-0.24, 0.7, 0],
			],
			0.1,
			10,
			true,
		);
		cone(g, C.coral, -0.23, 0.66, 0, 0.09, 0.23, 4).rotation.z = 0.7;
		ball(g, C.ink, 0.3, 0.1, 0.2, 0.035);
	} else {
		ball(g, 0xb69b86, 0, 0, 0, 0.4, 0.24, 0.24);
		ball(g, 0xc4ae96, 0.36, 0.08, 0.01, 0.25, 0.2, 0.2);
		ball(g, C.coral, 0.53, 0.08, 0.1, 0.065);
		for (const s of [-1, 1]) {
			ball(g, 0xe0bba3, 0.22, 0.27, s * 0.13, 0.12, 0.14, 0.055);
			ball(g, C.ink, 0.45, 0.16, s * 0.15, 0.034);
		}
		tube(
			g,
			0xd7a28e,
			[
				[-0.3, 0, 0],
				[-0.7, -0.06, 0],
				[-0.95, 0.03, 0],
				[-1.1, 0.17, 0],
			],
			0.04,
			12,
		);
	}
	let mixer = null;
	if (flaps.length) {
		mixer = new THREE.AnimationMixer(g);
		const duration = type === "bat" ? 0.45 : 1.2;
		const clip = new THREE.AnimationClip(
			"wingbeat",
			duration,
			flaps.map(
				(w, i) =>
					new THREE.NumberKeyframeTrack(
						w.name + ".rotation[z]",
						[0, duration / 2, duration],
						i === 0 ? [-0.5, 0.55, -0.5] : [0.5, -0.55, 0.5],
					),
			),
		);
		mixer.clipAction(clip).play();
	}
	return { root: g, mixer };
}
function makeBalloon() {
	const g = new THREE.Group();
	const colors = [0xf6b65b, 0xe99a45, 0xffd082, 0xc77a43];
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		const p = ball(
			g,
			colors[i % 4],
			Math.cos(a) * 0.36,
			3.15,
			Math.sin(a) * 0.36,
			0.69,
			1.14,
			0.69,
		);
		p.rotation.z = Math.cos(a) * 0.1;
	}
	mesh(new THREE.CylinderGeometry(0.33, 0.2, 0.3, 8), 0x976844, g, 0, 2.12, 0);
	for (const s of [-1, 1])
		tube(
			g,
			0xf4e3b3,
			[
				[s * 0.25, 2.2, 0],
				[s * 0.12, 1.2, 0],
				[0, 0.55, 0],
			],
			0.025,
			8,
		);
	const badge = label("↑", "#754e29", 0.5);
	badge.position.set(0, 3.1, 1.04);
	badge.scale.x = 0.55;
	g.add(badge);
	return g;
}
function lantern(parent, x, y, z, active = false) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	parent.add(g);
	block(g, 0x90784b, 0, 0.47, 0, 0.16, 0.94, 0.16);
	const glow = block(
		g,
		mat(active ? 0xffe29a : 0xd8ac64, true),
		0,
		1.04,
		0,
		0.36,
		0.47,
		0.29,
	);
	for (const s of [-1, 1])
		block(g, 0x5c634e, s * 0.21, 1.04, 0, 0.06, 0.59, 0.34);
	cone(g, 0x5e6a55, 0, 1.43, 0, 0.37, 0.3, 4).rotation.y = Math.PI / 4;
	const ring = mesh(
		new THREE.TorusGeometry(0.72, 0.025, 4, 30),
		mat(C.gold, true),
		g,
		0,
		0.05,
		0,
		false,
	);
	ring.rotation.x = Math.PI / 2;
	return { root: g, glow, ring };
}
function rockPlatform(parent, a, b, y, h, kind, rand) {
	const g = new THREE.Group();
	parent.add(g);
	const color =
		kind === "gold" ? 0x4e6056 : kind === "river" ? 0x345b63 : 0x3d6060;
	block(g, color, (a + b) / 2, y - h / 2, -0.3, b - a, h, 4.7);
	block(
		g,
		kind === "gold" ? 0xa49562 : kind === "river" ? 0x6b9a8a : 0x87aa6e,
		(a + b) / 2,
		y - 0.13,
		0,
		b - a,
		0.27,
		4.9,
	);
	for (let x = a + 0.4; x < b; x += 1.5 + rand() * 0.6) {
		const rh = 0.25 + rand() * 0.75;
		const r = mesh(
			new THREE.DodecahedronGeometry(0.7, 0),
			color,
			g,
			x,
			y - h + 0.25,
			1.7,
		);
		r.scale.set(1.2, rh, 0.45);
		r.rotation.z = rand() * 2;
	}
	for (let x = a + 0.6; x < b - 0.2; x += 1.5 + rand() * 2) {
		const yy = y - 0.45 - rand() * (h - 0.6);
		const stroke = block(
			g,
			0x243e43,
			x,
			yy,
			2.065,
			0.4 + rand() * 0.7,
			0.027,
			0.035,
			false,
		);
		stroke.rotation.z = (rand() - 0.5) * 0.5;
	}
	for (let x = a + 0.4; x < b - 0.4; x += 2.4 + rand() * 2.8) {
		if (kind === "gold" || kind === "loft") {
			if (rand() > 0.5)
				crystal(
					g,
					x,
					y,
					1.2,
					0.55 + rand() * 0.5,
					kind === "loft" ? C.gold : C.blue,
				);
			else mushroom(g, x, y, 1.3, 0.5 + rand() * 0.35);
		} else
			fern(
				g,
				x,
				y,
				1.4,
				0.45 + rand() * 0.55,
				kind === "river" ? 0x75b7a5 : C.moss,
			);
	}
	if (kind === "moss") {
		for (let x = a + 1; x < b; x += 3.8) {
			tube(
				g,
				0x557c59,
				[
					[x, y, 2.15],
					[x + 0.3, y - 0.45, 2.3],
					[x + 0.1, y - 1.1, 2.3],
					[x + 0.5, y - 1.4, 2.3],
				],
				0.035,
				12,
			);
			for (let i = 0; i < 3; i++)
				ball(
					g,
					0x72955e,
					x + 0.1 + i * 0.07,
					y - 0.4 - i * 0.3,
					2.3,
					0.18,
					0.08,
					0.045,
				);
		}
	}
	return g;
}
function backdrop(scene) {
	const rand = rng(771);
	for (let layer = 0; layer < 3; layer++) {
		const color = [0x153b43, 0x1c4850, 0x24535a][layer];
		for (let i = 0; i < 17; i++) {
			const x = -20 + i * 8 + rand() * 5;
			const g = mesh(
				new THREE.DodecahedronGeometry(1, 0),
				color,
				scene,
				x,
				-15 + rand() * 44,
				-18 + layer * 3,
				false,
			);
			g.scale.set(4 + rand() * 5, 12 + rand() * 15, 2);
			g.rotation.z = (rand() - 0.5) * 0.8;
		}
	}
	for (const y of [11, -5, -19, -34]) {
		for (let x = -10; x < 98; x += 4.8) {
			const z = -3.5;
			const s = 1 + rand() * 3;
			const m = cone(scene, 0x193c43, x, y - s * 0.3, z, 0.65 + rand(), s, 5);
			m.rotation.z = Math.PI;
		}
	}
	// An ancient, oversized carved sun joins the whole vertical shaft.
	for (let i = 0; i < 4; i++) {
		const ring = mesh(
			new THREE.TorusGeometry(7 + i * 1.1, 0.05, 4, 90),
			mat(i % 2 ? 0x456b68 : 0x6b8062, true),
			scene,
			80,
			-14,
			-8,
			false,
		);
		ring.rotation.z = i * 0.15;
	}
	for (let i = 0; i < 20; i++) {
		const a = (i / 20) * Math.PI * 2;
		const m = block(
			scene,
			mat(0x647661, true),
			80 + Math.sin(a) * 10,
			-14 + Math.cos(a) * 10,
			-8,
			0.08,
			0.8,
			0.08,
			false,
		);
		m.rotation.z = -a;
	}
	for (const [x, y] of [
		[12, -10],
		[39, -24],
		[8, -38],
		[87, 2],
	]) {
		const slab = block(scene, 0x32545a, x, y + 3, -4, 3.5, 6, 0.6);
		slab.rotation.z = 0.07;
		for (let i = 0; i < 5; i++) {
			const r = mesh(
				new THREE.TorusGeometry(0.22, 0.035, 4, 4),
				mat(0x789587, true),
				scene,
				x - 0.6 + (i % 2) * 1.2,
				y + 2 + Math.floor(i / 2),
				-3.65,
				false,
			);
			r.rotation.z = Math.PI / 4;
		}
	}
}
export class Art {
	constructor(renderer) {
		this.renderer = renderer;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x102e37);
		this.scene.fog = new THREE.Fog(0x173d46, 42, 95);
		this.world = new THREE.Group();
		this.scene.add(this.world);
		this.camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 140);
		this.cam = { x: 12, y: 3 };
		this.zoom = 1;
		this.shake = 0;
		this.rand = rng(447);
		this.scene.add(new THREE.HemisphereLight(0xffe9b8, 0x477785, 2.2));
		this.key = new THREE.DirectionalLight(0xffdf9c, 3.8);
		this.key.position.set(-12, 30, 30);
		this.scene.add(this.key);
		const rim = new THREE.DirectionalLight(0x83c9c6, 2);
		rim.position.set(15, 1, -15);
		this.scene.add(rim);
		this.key.castShadow = true;
		this.key.shadow.mapSize.set(1024, 1024);
		Object.assign(this.key.shadow.camera, {
			left: -23,
			right: 23,
			top: 18,
			bottom: -18,
			near: 1,
			far: 80,
		});
		this.key.shadow.bias = -0.001;
		this.key.shadow.normalBias = 0.035;
		this.scene.add(this.key.target);
		backdrop(this.world);
		for (const p of PLATFORMS) rockPlatform(this.world, ...p, this.rand);
		for (const l of LADDERS) {
			for (const s of [-1, 1])
				block(
					this.world,
					0xbca578,
					l.x + s * 0.52,
					(l.hi + l.lo) / 2,
					-0.1,
					0.1,
					l.hi - l.lo + 0.8,
					0.13,
				);
			for (let y = l.lo + 0.25; y <= l.hi + 0.35; y += 0.62)
				block(this.world, 0xd4b983, l.x, y, 0.0, 1.13, 0.1, 0.15);
		}
		this.checkpoints = CHECKPOINTS.map((c, i) =>
			lantern(this.world, c.x, c.y - 0.82, 1.1, i === 0),
		);
		// Rope-and-plank details at the first chasm.
		for (const x of [15.4, 22.4]) {
			block(this.world, 0xa88b57, x, 0.55, -1.1, 0.16, 1.4, 0.16);
			tube(
				this.world,
				0xc4a56c,
				[
					[x - 1, 0.6, -1.1],
					[x, 0.92, -1.1],
					[x + 0.2, 0.15, -1.1],
				],
				0.04,
				9,
			);
		}
		const sign = block(this.world, 0xbaa674, 7, 2.5, -1.3, 3.8, 0.85, 0.18);
		sign.rotation.z = -0.06;
		const text = label("MIND THE GAP →", "#243d3b", 0.35);
		text.position.set(7, 2.52, -1.12);
		this.world.add(text);
		block(this.world, 0x7c7953, 7, 0.9, -1.35, 0.13, 2.7, 0.15);
		for (const [s, x, y] of [
			["↓ FROGSTEP", 36, -3],
			["INKFIN ↓", 57, -15],
			["↑ SPECIMEN LIFT", 74, -36],
		]) {
			const t = label(s, "#c5d6af", 0.4);
			t.position.set(x, y, -1.5);
			this.world.add(t);
		}
		// Water is a translucent volume with moving ink ripples.
		const waterMat = new THREE.MeshBasicMaterial({
			color: 0x4cbbbd,
			transparent: true,
			opacity: 0.27,
			depthWrite: false,
		});
		this.water = block(
			this.world,
			waterMat,
			23.5,
			-29.18,
			1.8,
			37,
			6,
			1.25,
			false,
		);
		this.ripples = [];
		for (let i = 0; i < 18; i++) {
			const r = block(
				this.world,
				mat(0xa7e6cb, true),
				6 + i * 2.03,
				-26.15,
				2.5,
				1.2,
				0.035,
				0.03,
				false,
			);
			this.ripples.push(r);
		}
		for (let i = 0; i < 9; i++) {
			const reed = fern(this.world, 7 + i * 4.1, -31.9, 2.2, 0.55, 0x61a699);
		}
		// A narrow underground waterfall, painted with ribbons of light.
		for (let i = 0; i < 7; i++) {
			const w = block(
				this.world,
				new THREE.MeshBasicMaterial({
					color: i % 2 ? 0x81c6b9 : 0x5eafa8,
					transparent: true,
					opacity: 0.24,
				}),
				40.8 + i * 0.17,
				-19.8,
				-2.6,
				0.12,
				12.3,
				0.03,
				false,
			);
		}
		this.player = makeExplorer();
		this.world.add(this.player.root);
		this.player.root.position.z = 2.8;
		this.shadow = oval(this.world, 3, 0.03, 2, 0.6, 0.28, 0x253c37);
		this.pip = makeExplorer(0x769bb0);
		this.pip.root.position.set(8, -12, 2.6);
		this.pip.root.scale.setScalar(0.85);
		this.world.add(this.pip.root);
		const pLabel = label("PIP", "#ffe0a0", 0.3);
		pLabel.position.set(8, -9.3, 2.6);
		this.world.add(pLabel);
		this.pipLabel = pLabel;
		this.fox = makeFox();
		this.fox.root.position.set(0.4, -26, 2.6);
		this.world.add(this.fox.root);
		this.prism = new THREE.Group();
		this.prism.position.set(88, 5.3, 2.2);
		this.world.add(this.prism);
		const gem = mesh(new THREE.OctahedronGeometry(0.65), 0xffcd66, this.prism);
		gem.scale.y = 1.45;
		for (let i = 0; i < 2; i++) {
			const ring = mesh(
				new THREE.TorusGeometry(1 + i * 0.25, 0.025, 4, 40),
				mat(C.gold, true),
				this.prism,
				0,
				0,
				0,
				false,
			);
			ring.rotation.x = 0.5 + i * 0.6;
		}
		block(this.world, 0x909473, 88, 4.25, 0, 2.2, 0.5, 2.4);
		block(this.world, 0x626e5c, 88, 4.65, 0, 1.5, 0.3, 1.6);
		this.balloon = makeBalloon();
		this.world.add(this.balloon);
		this.balloon.position.z = 2.6;
		this.enemies = [];
		this.gold = new Map();
		this.particles = [];
		this.ghosts = new Map();
		this.time = 0;
		this.motes = [];
		for (let i = 0; i < 130; i++) {
			const b = ball(
				this.world,
				mat(i % 3 ? 0xb7caa1 : 0xffd48b, true),
				-10 + this.rand() * 108,
				8 - this.rand() * 53,
				1 + this.rand() * 4,
				0.025 + this.rand() * 0.027,
			);
			this.motes.push({
				m: b,
				x: b.position.x,
				y: b.position.y,
				phase: i * 2.7,
				size: b.scale.x,
			});
			b.castShadow = false;
		}
		this.titleScene = this.makeTitleScene();
		this.titleCamera = new THREE.OrthographicCamera(
			-22,
			22,
			12.375,
			-12.375,
			0.1,
			100,
		);
		this.titleCamera.position.set(0, 6, 40);
		this.titleCamera.lookAt(0, 4, 0);
	}
	bindGame(game) {
		this.game = game;
		for (const e of this.enemies) this.world.remove(e.root);
		this.enemies = game.enemies.map((e) => {
			const model = makeEnemy(e.type);
			this.world.add(model.root);
			return model;
		});
		for (const m of this.gold.values()) this.world.remove(m);
		this.gold.clear();
		for (const g of game.gold) {
			const group = new THREE.Group();
			block(group, 0xffc45d, 0, 0, 0, 0.64, 0.32, 0.4);
			block(group, mat(0xffe29c, true), 0, 0.17, 0, 0.53, 0.035, 0.33, false);
			group.position.set(g.x, g.y, 2.7);
			this.world.add(group);
			this.gold.set(g.id, group);
		}
	}
	makeTitleScene() {
		const s = new THREE.Scene();
		s.background = new THREE.Color(0x12383f);
		s.fog = new THREE.Fog(0x16434b, 43, 80);
		s.add(new THREE.HemisphereLight(0xfff0be, 0x527d8a, 2.5));
		const key = new THREE.DirectionalLight(0xffdb92, 4.1);
		key.position.set(-10, 22, 25);
		s.add(key);
		const rim = new THREE.DirectionalLight(0x64c5c7, 2);
		rim.position.set(5, 12, -18);
		s.add(rim);
		const rand = rng(193);
		for (let i = 0; i < 19; i++) {
			const b = mesh(
				new THREE.DodecahedronGeometry(1, 0),
				i % 2 ? 0x24525a : 0x1b454c,
				s,
				-28 + i * 3.4,
				-1 + rand() * 15,
				-12 + rand() * 4,
				false,
			);
			b.scale.set(2 + rand() * 3, 8 + rand() * 14, 3);
			b.rotation.z = (rand() - 0.5) * 0.5;
		}
		for (let i = 0; i < 4; i++) {
			const r = mesh(
				new THREE.TorusGeometry(6 + i * 0.5, 0.045, 4, 90),
				mat(i % 2 ? 0x637b63 : 0x597765, true),
				s,
				11,
				6,
				-5,
				false,
			);
			r.rotation.z = i * 0.1;
		}
		for (let i = 0; i < 18; i++) {
			const a = (i / 18) * Math.PI * 2;
			const b = block(
				s,
				mat(0x698666, true),
				11 + Math.sin(a) * 8,
				6 + Math.cos(a) * 8,
				-5,
				0.08,
				0.65,
				0.04,
				false,
			);
			b.rotation.z = -a;
		}
		rockPlatform(s, 3, 25, -4, 5, "moss", rand);
		rockPlatform(s, -26, 2, -8, 4, "river", rand);
		for (let i = 0; i < 8; i++) {
			const x = 1 + i * 3;
			const c = cone(
				s,
				0x183e43,
				x,
				15 + rand() * 2,
				-1,
				1.1,
				4 + rand() * 4,
				5,
			);
			c.rotation.z = Math.PI;
		}
		const h = makeExplorer();
		h.root.position.set(10, -4, 3);
		h.root.scale.setScalar(2.65);
		h.root.rotation.y = -0.2;
		s.add(h.root);
		this.titleHero = h;
		const f = makeFox();
		f.root.position.set(15.4, -4, 3.2);
		f.root.scale.setScalar(2.1);
		s.add(f.root);
		this.titleFox = f;
		const b = makeBalloon();
		b.position.set(17.4, 2.2, 1);
		b.scale.setScalar(1.5);
		b.rotation.z = -0.08;
		s.add(b);
		this.titleBalloon = b;
		fern(s, 5, -4, 4, 2.1);
		fern(s, 19, -4, 4, 2.3);
		fern(s, 23, -4, 4, 2.8);
		mushroom(s, 7.3, -4, 4, 1.7);
		crystal(s, 21, -4, 3, 2);
		lantern(s, 13.7, -4, 3, true);
		tube(
			s,
			0x658b69,
			[
				[22, 17, 2],
				[21, 12, 2],
				[23, 8, 2],
				[21, 5, 2],
			],
			0.07,
			30,
		);
		for (let i = 0; i < 9; i++) {
			const l = ball(
				s,
				0x6c9568,
				21.6 + Math.sin(i) * 0.7,
				14 - i,
				2,
				0.5,
				0.14,
				0.07,
			);
			l.rotation.z = (i % 2 ? 1 : -1) * 0.4;
		}
		return s;
	}
	addGhost(id, color = 0x8dc9ce) {
		if (this.ghosts.has(id)) return this.ghosts.get(id);
		const model = makeExplorer(color);
		model.root.scale.setScalar(0.94);
		this.world.add(model.root);
		this.ghosts.set(id, model);
		return model;
	}
	removeGhost(id) {
		const m = this.ghosts.get(id);
		if (m) {
			this.world.remove(m.root);
			this.ghosts.delete(id);
		}
	}
	burst(x, y, color = C.gold, count = 18) {
		for (let i = 0; i < count; i++) {
			const m = ball(
				this.world,
				mat(color, true),
				x,
				y,
				3,
				0.05 + this.rand() * 0.07,
			);
			m.castShadow = false;
			this.particles.push({
				m,
				size: m.scale.x,
				vx: (this.rand() - 0.5) * 6,
				vy: this.rand() * 5,
				life: 0.5 + this.rand() * 0.5,
			});
		}
	}
	resize(w, h) {
		const aspect = w / h;
		let hh = 11;
		if (aspect < 1) hh = 15;
		hh /= this.zoom;
		this.camera.left = -hh * aspect;
		this.camera.right = hh * aspect;
		this.camera.top = hh;
		this.camera.bottom = -hh;
		this.camera.updateProjectionMatrix();
		this.titleCamera.left = -12.375 * aspect;
		this.titleCamera.right = 12.375 * aspect;
		this.titleCamera.updateProjectionMatrix();
		if (aspect < 1) {
			this.titleCamera.position.set(9, 8, 42);
			this.titleCamera.lookAt(9, 6, 0);
		} else {
			this.titleCamera.position.set(0, 6, 40);
			this.titleCamera.lookAt(0, 4, 0);
		}
	}
	update(dt, state, title = false, ghosts = []) {
		this.time += dt;
		const t = this.time;
		this.titleHero.animate("idle", dt);
		this.titleFox.mixer.update(dt);
		this.titleBalloon.position.y = 2.1 + Math.sin(t * 0.8) * 0.3;
		this.titleBalloon.rotation.z = -0.08 + Math.sin(t * 0.6) * 0.035;
		if (!state) return;
		const p = this.player.root;
		p.position.set(state.x, state.y - 0.75, 2.8);
		p.rotation.y = state.face * 0.32;
		p.visible = state.mode !== "rewind" || Math.sin(t * 35) > -0.1;
		this.player.animate(state.mode, dt, Math.max(0.4, Math.abs(state.vx) / 8));
		const targetX = state.x + state.vx * 0.22,
			targetY = state.y + 2.4;
		const f = 1 - Math.exp(-dt * 4);
		this.cam.x += (targetX - this.cam.x) * f;
		this.cam.y += (targetY - this.cam.y) * f;
		this.shake = Math.max(0, this.shake - dt * 2.8);
		this.camera.position.set(
			this.cam.x + Math.sin(t * 79) * this.shake * 0.22,
			this.cam.y + 2.4 + Math.cos(t * 67) * this.shake * 0.15,
			40,
		);
		this.camera.lookAt(this.cam.x, this.cam.y, 0);
		this.key.position.set(this.cam.x - 12, this.cam.y + 24, 28);
		this.key.target.position.set(this.cam.x, this.cam.y, 0);
		let floor = null;
		for (const [a, b, y] of PLATFORMS)
			if (
				state.x > a &&
				state.x < b &&
				y <= state.y - 0.6 &&
				(floor === null || y > floor)
			)
				floor = y;
		this.shadow.visible = floor !== null && state.y - floor < 5;
		this.shadow.position.set(state.x, (floor ?? 0) + 0.028, 1.3);
		const shadowSize = Math.max(0.4, 1 - (state.y - (floor ?? 0)) * 0.09);
		this.shadow.scale.set(0.6 * shadowSize, 0.28 * shadowSize, 1);
		for (let i = 0; i < this.enemies.length; i++) {
			const model = this.enemies[i],
				e = this.game.enemies[i];
			model.root.visible = e.active;
			model.root.position.set(e.x, e.y, 2.7);
			model.root.rotation.y = e.dir < 0 ? Math.PI : 0;
			if (model.mixer) model.mixer.update(dt);
		}
		for (const [id, m] of this.gold) {
			m.visible = !this.game.collected.has(id);
			m.rotation.y = t * 1.3 + Number(id.slice(4));
			m.position.y =
				this.game.gold.find((g) => g.id === id).y +
				Math.sin(t * 2 + Number(id.slice(4))) * 0.1;
		}
		this.pip.root.visible = !state.rescued.pip;
		this.pipLabel.visible = !state.rescued.pip;
		this.pip.animate("wave", dt);
		this.fox.root.visible = !state.rescued.fox;
		this.fox.mixer.update(dt);
		this.prism.visible = !state.rescued.prism;
		this.prism.rotation.y = t * 0.7;
		this.prism.position.y = 5.45 + Math.sin(t * 1.6) * 0.18;
		this.balloon.visible = state.carry || this.game.balloon.respawn <= 0;
		this.balloon.position.x = state.carry ? state.x : this.game.balloon.x;
		this.balloon.position.y =
			(state.carry ? state.y : this.game.balloon.y) - 0.75;
		this.balloon.rotation.z = Math.sin(t) * 0.035 - state.vx * 0.025;
		for (let i = 0; i < this.checkpoints.length; i++) {
			this.checkpoints[i].ring.rotation.z = t * 0.2;
			this.checkpoints[i].glow.material = mat(
				state.checkpoint === i ? 0xffeeaf : 0xa49264,
				true,
			);
		}
		for (let i = 0; i < this.ripples.length; i++) {
			const r = this.ripples[i];
			r.scale.x = 1.1 + Math.sin(t * 1.3 + i) * 0.35;
			r.position.y = -26.12 + Math.sin(t * 1.4 + i) * 0.035;
		}
		for (const f of this.motes) {
			f.m.position.x = f.x + Math.sin(t * 0.3 + f.phase) * 0.5;
			f.m.position.y = f.y + Math.cos(t * 0.4 + f.phase) * 0.4;
			f.m.scale.setScalar(f.size * (0.65 + Math.sin(t * 2 + f.phase) * 0.3));
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const a = this.particles[i];
			a.life -= dt;
			a.vy -= 10 * dt;
			a.m.position.x += a.vx * dt;
			a.m.position.y += a.vy * dt;
			a.m.scale.setScalar(a.size * Math.max(0, a.life * 1.4));
			if (a.life <= 0) {
				this.world.remove(a.m);
				this.particles.splice(i, 1);
			}
		}
		const seen = new Set();
		for (const ghost of ghosts) {
			seen.add(ghost.id);
			const g = this.addGhost(ghost.id, ghost.color);
			g.root.visible = Math.hypot(ghost.x - state.x, ghost.y - state.y) < 40;
			g.root.position.lerp(
				new THREE.Vector3(ghost.x, ghost.y - 0.75, 2.3),
				1 - Math.exp(-dt * 14),
			);
			g.root.rotation.y = (ghost.face || 1) * 0.32;
			g.animate(ghost.mode, dt);
		}
		for (const id of this.ghosts.keys())
			if (!seen.has(id)) this.removeGhost(id);
	}
	render(title = false) {
		this.renderer.render(
			title ? this.titleScene : this.scene,
			title ? this.titleCamera : this.camera,
		);
	}
	snapCamera() {
		const p = this.game.position;
		this.cam = { x: p.x, y: p.y + 2.4 };
	}
}
