import * as THREE from "three/webgpu";
import { color, normalWorld, vec3, float, dot, floor } from "three/tsl";
import RAPIER from "rapier";

const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const PALETTE = {
	ink: 0x122e2c,
	grass: 0x67994a,
	lime: 0xaac86a,
	leaf: 0x31765b,
	dark: 0x195846,
	teal: 0x42867b,
	gold: 0xffc552,
	earth: 0x80603a,
	soil: 0x5a4b35,
	cream: 0xffedbd,
	orange: 0xed8747,
};
let seed = 1982;
function rand() {
	seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
	return seed / 4294967296;
}
function rnd(a, b) {
	return a + rand() * (b - a);
}
const GEOS = {
	box: new THREE.BoxGeometry(1, 1, 1),
	ball: new THREE.IcosahedronGeometry(1, 1),
	rough: new THREE.IcosahedronGeometry(1, 0),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
	cone: new THREE.ConeGeometry(1, 1, 7),
	plane: new THREE.PlaneGeometry(1, 1),
	disc: new THREE.CircleGeometry(1, 40),
	torus: new THREE.TorusGeometry(1, 0.12, 5, 24),
};
const ink = new THREE.MeshBasicMaterial({
	color: PALETTE.ink,
	side: THREE.BackSide,
});
const materials = new Map();
function cel(hex) {
	if (materials.has(hex)) return materials.get(hex);
	const m = new THREE.MeshBasicNodeMaterial();
	const shade = floor(
		dot(normalWorld, vec3(-0.35, 0.8, 0.45))
			.mul(0.5)
			.add(0.5)
			.mul(4),
	)
		.div(4)
		.mul(0.48)
		.add(0.52);
	m.colorNode = color(hex).mul(shade);
	m.side = THREE.DoubleSide;
	materials.set(hex, m);
	return m;
}
function shape(
	parent,
	geo,
	hex,
	x,
	y,
	z,
	sx = 1,
	sy = 1,
	sz = 1,
	outline = true,
) {
	const m = new THREE.Mesh(
		typeof geo === "string" ? GEOS[geo] : geo,
		typeof hex === "number" ? cel(hex) : hex,
	);
	m.position.set(x, y, z);
	m.scale.set(sx, sy, sz);
	parent.add(m);
	if (outline) {
		const o = new THREE.Mesh(m.geometry, ink);
		o.scale.setScalar(1.045);
		m.add(o);
	}
	return m;
}
function rod(parent, from, to, r, hex, outline = true) {
	const a = new THREE.Vector3(...from),
		b = new THREE.Vector3(...to),
		v = b.clone().sub(a);
	const m = shape(
		parent,
		"cylinder",
		hex,
		...a.clone().add(b).multiplyScalar(0.5).toArray(),
		r,
		v.length(),
		r,
		outline,
	);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
	return m;
}
function curve(parent, points, r, hex, outline = false) {
	const c = new THREE.CatmullRomCurve3(
		points.map((v) => new THREE.Vector3(...v)),
	);
	return shape(
		parent,
		new THREE.TubeGeometry(c, Math.max(6, points.length * 3), r, 5, false),
		hex,
		0,
		0,
		0,
		1,
		1,
		1,
		outline,
	);
}
function textBoard(parent, text, x, y, z, w = 4, h = 1.2) {
	const c = document.createElement("canvas");
	c.width = 768;
	c.height = 192;
	const ctx = c.getContext("2d");
	ctx.fillStyle = "#dbc58f";
	ctx.fillRect(0, 0, 768, 192);
	ctx.strokeStyle = "#6f7545";
	ctx.lineWidth = 9;
	ctx.strokeRect(10, 10, 748, 172);
	ctx.fillStyle = "#203e30";
	ctx.font = "bold 48px Trebuchet MS, sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const lines = text.split("|");
	lines.forEach((line, i) =>
		ctx.fillText(line, 384, 96 + (i - (lines.length - 1) / 2) * 58, 710),
	);
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
	const g = new THREE.Group();
	g.position.set(x, y, Math.min(z, -0.4));
	parent.add(g);
	shape(g, "box", 0x5c5a39, 0, 0, -0.1, w + 0.15, h + 0.15, 0.22);
	shape(g, "plane", mat, 0, 0, 0.025, w, h, 1, false);
	return g;
}
function createExplorer(hex = 0xdf8f44) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "rig";
	root.add(rig);
	const body = shape(rig, "box", hex, 0, 1.03, 0, 0.56, 0.65, 0.38);
	body.rotation.z = -0.04;
	shape(rig, "box", 0x766647, -0.12, 1, -0.3, 0.53, 0.55, 0.28);
	shape(rig, "box", 0x453e2d, 0, 0.72, 0, 0.58, 0.12, 0.41);
	shape(rig, "box", 0xffd67f, 0.08, 0.72, 0.235, 0.13, 0.11, 0.04, false);
	shape(rig, "ball", 0xdca56e, 0.035, 1.61, 0, 0.28, 0.3, 0.25);
	shape(rig, "box", 0xc98456, 0.28, 1.57, 0.07, 0.17, 0.13, 0.14);
	shape(rig, "box", PALETTE.ink, 0.17, 1.66, 0.23, 0.055, 0.065, 0.025, false);
	shape(rig, "box", 0x6c4933, -0.11, 1.76, -0.03, 0.36, 0.17, 0.4);
	shape(rig, "cylinder", 0xd9b46a, 0, 1.87, 0, 0.52, 0.075, 0.43);
	shape(rig, "cone", 0xd9b46a, -0.03, 2.04, 0, 0.37, 0.38, 0.32);
	shape(rig, "cylinder", 0x6c6941, -0.03, 1.925, 0, 0.355, 0.09, 0.31, false);
	shape(rig, "box", 0xd75943, 0.02, 1.35, 0.04, 0.59, 0.14, 0.46);
	const scarf = shape(rig, "box", 0xec7151, -0.42, 1.31, -0.02, 0.5, 0.13, 0.1);
	scarf.rotation.z = 0.25;
	["legL", "legR", "armL", "armR"].forEach((name, i) => {
		const p = new THREE.Group();
		p.name = name;
		const leg = i < 2;
		p.position.set(
			leg ? (i === 0 ? -0.16 : 0.16) : i === 2 ? -0.25 : 0.25,
			leg ? 0.73 : 1.29,
			i % 2 === 0 ? 0.13 : -0.13,
		);
		rig.add(p);
		shape(
			p,
			"box",
			leg ? 0x4b6950 : hex,
			0,
			leg ? -0.24 : -0.2,
			0,
			leg ? 0.23 : 0.19,
			leg ? 0.5 : 0.4,
			0.23,
		);
		if (leg) {
			shape(p, "box", 0x393f32, 0.08, -0.63, 0.02, 0.37, 0.24, 0.3);
		} else {
			shape(p, "ball", 0xdca56e, 0, -0.48, 0, 0.12, 0.16, 0.13);
		}
	});
	const mixer = new THREE.AnimationMixer(root);
	const track = (n, t, v) => new THREE.NumberKeyframeTrack(n, t, v);
	const clips = {
		idle: new THREE.AnimationClip("idle", 2, [
			track("rig.position[y]", [0, 1, 2], [0, 0.045, 0]),
			track("armL.rotation[z]", [0, 1, 2], [0.03, -0.04, 0.03]),
			track("armR.rotation[z]", [0, 1, 2], [-0.04, 0.03, -0.04]),
		]),
		run: new THREE.AnimationClip("run", 0.6, [
			track(
				"legL.rotation[z]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[0.7, 0, -0.7, 0, 0.7],
			),
			track(
				"legR.rotation[z]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[-0.7, 0, 0.7, 0, -0.7],
			),
			track("armL.rotation[z]", [0, 0.3, 0.6], [-0.7, 0.7, -0.7]),
			track("armR.rotation[z]", [0, 0.3, 0.6], [0.7, -0.7, 0.7]),
			track(
				"rig.position[y]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[0, 0.08, 0, 0.08, 0],
			),
		]),
		jump: new THREE.AnimationClip("jump", 1, [
			track("legL.rotation[z]", [0, 1], [-0.6, -0.6]),
			track("legR.rotation[z]", [0, 1], [0.7, 0.7]),
			track("armL.rotation[z]", [0, 1], [-1.6, -1.6]),
			track("armR.rotation[z]", [0, 1], [1.7, 1.7]),
		]),
		swing: new THREE.AnimationClip("swing", 1, [
			track("armL.rotation[z]", [0, 1], [-2.8, -2.8]),
			track("armR.rotation[z]", [0, 1], [2.8, 2.8]),
			track("legL.rotation[z]", [0, 0.5, 1], [0.15, 0.45, 0.15]),
			track("legR.rotation[z]", [0, 0.5, 1], [-0.15, -0.4, -0.15]),
		]),
		climb: new THREE.AnimationClip("climb", 0.9, [
			track("armL.rotation[z]", [0, 0.45, 0.9], [-2.7, -1.7, -2.7]),
			track("armR.rotation[z]", [0, 0.45, 0.9], [1.7, 2.7, 1.7]),
			track("legL.rotation[z]", [0, 0.45, 0.9], [0.1, 0.9, 0.1]),
			track("legR.rotation[z]", [0, 0.45, 0.9], [0.9, 0.1, 0.9]),
		]),
		cheer: new THREE.AnimationClip("cheer", 0.8, [
			track("armL.rotation[z]", [0, 0.4, 0.8], [-2.7, -2.1, -2.7]),
			track("armR.rotation[z]", [0, 0.4, 0.8], [2.1, 2.7, 2.1]),
			track("rig.position[y]", [0, 0.4, 0.8], [0, 0.3, 0]),
		]),
	};
	const actions = {};
	Object.entries(clips).forEach(([n, c]) => (actions[n] = mixer.clipAction(c)));
	actions.idle.play();
	let current = "idle";
	const shadow = new THREE.Mesh(
		GEOS.disc,
		new THREE.MeshBasicMaterial({
			color: 0x0d362a,
			transparent: true,
			opacity: 0.3,
			depthWrite: false,
		}),
	);
	shadow.rotation.x = -Math.PI / 2;
	shadow.scale.set(0.55, 0.3, 1);
	root.add(shadow);
	shadow.position.y = 0.015;
	return {
		root,
		mixer,
		actions,
		shadow,
		animate(name, speed = 1) {
			if (name !== current) {
				actions[current].fadeOut(0.12);
				actions[name].reset().fadeIn(0.12).play();
				current = name;
			}
			actions[name].timeScale = speed;
		},
		get animation() {
			return current;
		},
	};
}
