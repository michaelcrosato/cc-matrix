import * as THREE from "three/webgpu";
import RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
let seed = 71382;
function rand(a = 0, b = 1) {
	seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
	return a + (seed / 4294967296) * (b - a);
}
const C = {
	ink: 0x153c32,
	leaf: 0x42775a,
	jade: 0x255d4c,
	mint: 0x7b9d68,
	lime: 0xa8b56a,
	gold: 0xf8c863,
	paper: 0xffedc7,
	soil: 0x8d6845,
	soilDark: 0x604f39,
	red: 0xd96640,
	water: 0x437f70,
};
let scene,
	camera,
	renderer,
	physics,
	controller,
	sunLight,
	sunDisc,
	backend = "unknown";
const groundParts = [],
	logs = [],
	vines = [],
	crocs = [],
	hazards = [],
	treasures = [],
	coins = [],
	sceneryMixers = [],
	effects = [],
	waterDetails = [],
	movingPlatforms = [],
	ladders = [];
const gaps = [
	{ a: 26, b: 34, type: "water" },
	{ a: 52, b: 65, type: "crocs" },
	{ a: 84, b: 89, type: "sand" },
	{ a: 119, b: 127, type: "tar" },
	{ a: 146, b: 154, type: "bridge" },
	{ a: 184, b: 192, type: "water" },
];
const caveRanges = [
	[72, 110],
	[164, 180],
];
const treasureDefs = [
	{ x: 16, y: 1.1, name: "The Brass Beetle", type: "idol", zone: 0 },
	{ x: 42, y: 1.1, name: "A Rather Heavy Purse", type: "bag", zone: 1 },
	{ x: 69, y: 1.1, name: "The Crocodile’s Ring", type: "ring", zone: 2 },
	{ x: 94, y: -3.9, name: "Moonlit Silver", type: "silver", zone: 3 },
	{ x: 135, y: 1.1, name: "An Unreasonably Big Emerald", type: "gem", zone: 4 },
	{ x: 160, y: 1.1, name: "The Golden Grin", type: "idol", zone: 5 },
	{ x: 174, y: -3.9, name: "The Buried Sun", type: "sun", zone: 6 },
	{ x: 206, y: 1.1, name: "The Last Little Fortune", type: "chest", zone: 7 },
];
const zones = [
	{
		x: 0,
		name: "Fernwood Camp",
		note: "Logs roll. Explorers leap.",
		treasure: 0,
	},
	{
		x: 24,
		name: "The Hanging Gardens",
		note: "Jump to a vine. Jump again to let go.",
		treasure: 1,
	},
	{
		x: 50,
		name: "Crocodile Crossing",
		note: "Closed mouths make better stepping stones.",
		treasure: 2,
	},
	{
		x: 72,
		name: "The Sunken Shortcut",
		note: "Down the ladder. Mind the scorpions.",
		treasure: 3,
	},
	{
		x: 112,
		name: "Blackwater Bend",
		note: "A little patience. A very long vine.",
		treasure: 4,
	},
	{
		x: 143,
		name: "Tumbledown Trail",
		note: "One good leap deserves another.",
		treasure: 5,
	},
	{
		x: 164,
		name: "The Amber Hollow",
		note: "There’s gold beneath those boots.",
		treasure: 6,
	},
	{
		x: 182,
		name: "The Sun Gate",
		note: "One last swing. Bring every treasure.",
		treasure: 7,
	},
];
const camps = [
	{ x: 4, y: 0.8 },
	{ x: 39, y: 0.8 },
	{ x: 70, y: 0.8 },
	{ x: 111, y: 0.8 },
	{ x: 139, y: 0.8 },
	{ x: 162, y: 0.8 },
	{ x: 199, y: 0.8 },
];
const materials = new Map();
function mat(color, outline = false) {
	const key = color + ":" + outline;
	if (!materials.has(key))
		materials.set(
			key,
			outline
				? new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
				: new THREE.MeshToonMaterial({ color, gradientMap: toonGradient }),
		);
	return materials.get(key);
}
const grad = new Uint8Array([
	80, 80, 80, 255, 150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255,
]);
const toonGradient = new THREE.DataTexture(grad, 4, 1, THREE.RGBAFormat);
toonGradient.minFilter = THREE.NearestFilter;
toonGradient.magFilter = THREE.NearestFilter;
toonGradient.needsUpdate = true;
const GEO = {
	box: new THREE.BoxGeometry(1, 1, 1),
	ball: new THREE.IcosahedronGeometry(1, 1),
	round: new THREE.SphereGeometry(1, 12, 8),
	cone: new THREE.ConeGeometry(1, 1, 7),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
};
function mesh(
	geo,
	color,
	parent,
	x = 0,
	y = 0,
	z = 0,
	sx = 1,
	sy = sx,
	sz = sx,
	ink = false,
) {
	const m = new THREE.Mesh(geo, mat(color));
	m.position.set(x, y, z);
	m.scale.set(sx, sy, sz);
	m.castShadow = true;
	m.receiveShadow = true;
	parent.add(m);
	if (ink) {
		const out = new THREE.Mesh(geo, mat(C.ink, true));
		out.scale.set(1.035, 1.035, 1.035);
		m.add(out);
	}
	return m;
}
function box(p, c, x, y, z, sx, sy, sz, ink = false) {
	return mesh(GEO.box, c, p, x, y, z, sx, sy, sz, ink);
}
function ball(p, c, x, y, z, sx, sy = sx, sz = sx, ink = false) {
	return mesh(GEO.ball, c, p, x, y, z, sx, sy, sz, ink);
}
function cyl(p, c, x, y, z, r, h, r2 = r, ink = false) {
	const g =
		r === r2 ? GEO.cylinder : new THREE.CylinderGeometry(r2 / r, 1, 1, 10);
	return mesh(g, c, p, x, y, z, r, h, r, ink);
}
function line(p, points, color = C.ink) {
	const g = new THREE.BufferGeometry().setFromPoints(
		points.map((v) => new THREE.Vector3(...v)),
	);
	const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
	p.add(m);
	return m;
}
function solid(x, y, w, h, z = 0, depth = 6) {
	const rb = physics.createRigidBody(
		RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z),
	);
	const collider = physics.createCollider(
		RAPIER.ColliderDesc.cuboid(w / 2, h / 2, depth / 2).setFriction(0.8),
		rb,
	);
	return { rb, collider };
}
function leaf(parent, x, y, z, length, width, angle, color) {
	const s = new THREE.Shape();
	s.moveTo(0, 0);
	s.bezierCurveTo(-width, 0.3 * length, -width * 0.65, 0.7 * length, 0, length);
	s.bezierCurveTo(width * 0.6, 0.75 * length, width, 0.2 * length, 0, 0);
	const m = new THREE.Mesh(
		new THREE.ShapeGeometry(s),
		new THREE.MeshToonMaterial({
			color,
			side: THREE.DoubleSide,
			gradientMap: toonGradient,
		}),
	);
	m.position.set(x, y, z);
	m.rotation.z = angle;
	parent.add(m);
	line(
		m,
		[
			[0, 0.07, 0.015],
			[0, length * 0.85, 0.015],
		],
		C.jade,
	);
	return m;
}
function fern(x, y, z, scale = 1, color = C.leaf) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	g.scale.setScalar(scale);
	scene.add(g);
	for (let i = 0; i < 7; i++) {
		const a = (i - 3) * 0.35;
		const l = rand(0.65, 1.15);
		const stem = new THREE.Group();
		stem.rotation.z = a;
		g.add(stem);
		for (let n = 1; n < 5; n++) {
			leaf(stem, 0, n * l * 0.18, 0, l * 0.35, 0.1, -1.05, color);
			leaf(stem, 0, n * l * 0.18, 0.008, l * 0.35, 0.1, 1.05, color);
		}
		leaf(stem, 0, l * 0.65, 0, l * 0.45, 0.1, 0, color);
	}
	return g;
}
function tree(x, z, scale = 1, back = false) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.scale.setScalar(scale);
	scene.add(g);
	const bark = back ? 0x457264 : 0x3c5942;
	const height = rand(7, 11);
	const trunk = cyl(g, bark, 0, height / 2, 0, 0.22, height, 0.14);
	trunk.rotation.z = rand(-0.13, 0.13);
	for (let k = 0; k < 3; k++) {
		const root = box(g, bark, (k - 1) * 0.32, 0.13, 0.2, 0.7, 0.18, 0.22);
		root.rotation.z = (k - 1) * 0.5;
	}
	for (let j = 0; j < 3; j++) {
		const branch = cyl(
			g,
			bark,
			(j - 1) * 0.65,
			height - j * 0.4,
			0,
			0.1,
			2.8,
			0.07,
		);
		branch.rotation.z = (j - 1) * 0.8;
	}
	for (let i = 0; i < 9; i++) {
		const a = (i - 4) * 0.47;
		const l = rand(2.6, 4.1);
		const m = leaf(
			g,
			0,
			height,
			rand(-0.3, 0.3),
			l,
			0.5,
			a,
			back ? 0x528371 : [C.jade, C.leaf, C.mint][i % 3],
		);
		m.rotation.x = rand(-0.3, 0.3);
	}
	if (!back) {
		for (let i = 0; i < 4; i++)
			line(
				g,
				[
					[0.24, i * 1.6 + 0.8, 0.15],
					[0.17, i * 1.6 + 1.4, 0.19],
				],
				0x243e30,
			);
		const hanging = line(
			g,
			[
				[1, height - 1, 0],
				[1.2, height - 3, 0],
				[0.85, height - 5, 0],
			],
			C.leaf,
		);
		hanging.userData.wind = true;
	}
	return g;
}
function rock(x, y, z, s = 0.5) {
	const m = ball(
		scene,
		rand() > 0.5 ? 0x6d8064 : 0x8c956f,
		x,
		y,
		z,
		s,
		rand(0.5, 0.8) * s,
		0.7 * s,
	);
	m.rotation.set(rand(0, 1), rand(0, 3), rand(0, 0.5));
	return m;
}
function inscription(parent, x, y, z, w = 1) {
	for (let i = 0; i < 3; i++) {
		const s = box(
			parent,
			0x37614e,
			x + (i - 1) * w * 0.22,
			y,
			z,
			0.08,
			w * 0.4,
			0.025,
		);
		s.rotation.z = i % 2 ? 0.45 : 0;
	}
	line(
		parent,
		[
			[x - w * 0.45, y - w * 0.3, z],
			[x - w * 0.45, y + w * 0.3, z],
			[x + w * 0.45, y + w * 0.3, z],
			[x + w * 0.45, y - w * 0.3, z],
		],
		0x3c6652,
	);
}
function temple(x, z, scale = 1) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.scale.setScalar(scale);
	scene.add(g);
	for (let i = 0; i < 7; i++) {
		const w = 12 - i * 1.3;
		box(g, i % 2 ? 0x678674 : 0x718e77, 0, i * 0.65, 0, w, 0.7, 6 - i * 0.55);
		for (let j = -2; j <= 2; j++)
			line(
				g,
				[
					[j * 1.7, i * 0.65 + 0.25, 3.01 - i * 0.275],
					[j * 1.7, i * 0.65 - 0.25, 3.01 - i * 0.275],
				],
				0x557765,
			);
	}
	box(g, 0x709276, 0, 5, 0, 3.3, 2.3, 2.6);
	box(g, 0x294f43, 0, 4.9, 1.32, 1.2, 1.9, 0.1);
	box(g, 0x91a37e, 0, 6.2, 0, 4, 0.5, 3);
	inscription(g, -1.1, 5.1, 1.34, 0.6);
	inscription(g, 1.1, 5.1, 1.34, 0.6);
	ball(g, C.gold, 0, 6.9, 0, 0.48);
	for (let i = 0; i < 7; i++)
		fern(x + rand(-5, 5) * scale, 0, z + rand(2, 4), scale * 0.8, C.jade);
	return g;
}
function buildTerrain() {
	let last = -8;
	for (const g of [...gaps, { a: 232, b: 232 }]) {
		const w = g.a - last;
		const x = (last + g.a) / 2;
		solid(x, -0.8, w, 1.6);
		const block = box(scene, C.soil, x, -0.95, 0, w, 1.9, 6);
		box(scene, C.mint, x, -0.05, 0, w, 0.16, 6.05);
		box(scene, C.leaf, x, -0.22, 3.04, w, 0.13, 0.1);
		for (let n = last + 1; n < g.a; n += 2.1) {
			line(
				scene,
				[
					[n, -0.6, 3.06],
					[n + 0.5, -0.63, 3.06],
					[n + 0.9, -0.53, 3.06],
				],
				0x6a543a,
			);
			ball(scene, C.soilDark, n, -1.25, 3.04, 0.1, 0.07, 0.035);
		}
		groundParts.push({ x, w, mesh: block });
		last = g.b;
	}
	// The exposed soil is a cross-section: real tunnels sit between these shelves.
	for (const [a, b] of [
		[-8, 71],
		[111, 163],
		[181, 232],
	]) {
		box(scene, 0x70583d, (a + b) / 2, -3.4, -0.1, b - a, 3.2, 6);
		for (let x = a + 1; x < b; x += 2.8)
			line(
				scene,
				[
					[x, -2.2, 3.02],
					[x + 0.8, -2.4, 3.02],
					[x + 1.5, -2.1, 3.02],
				],
				0x866346,
			);
	}
	box(scene, 0x405140, 112, -7.4, 0, 240, 4.8, 6);
	solid(112, -5.5, 240, 1);
	for (const [a, b] of caveRanges) {
		box(scene, 0x193e36, (a + b) / 2, -3.45, -2.8, b - a + 1, 3.1, 0.2);
		for (let x = a; x < b; x += 1.35) {
			const h = rand(0.25, 0.8);
			mesh(GEO.cone, 0x567160, scene, x, -1.7 - h / 2, -1.6, 0.25, h, 0.3);
			rock(x, -4.95, 1.8, rand(0.2, 0.4));
			if (Math.floor(x) % 3 === 0) {
				ball(scene, 0xd8d486, x, -4.55, -1.2, 0.1, 0.25, 0.1);
				fern(x, -5, -0.7, 0.4, 0x7a9b6a);
			}
		}
	}
	for (const pit of gaps) {
		if (pit.type === "bridge") continue;
		const water = box(
			scene,
			pit.type === "sand" ? 0xb8a267 : pit.type === "tar" ? 0x234842 : C.water,
			(pit.a + pit.b) / 2,
			-0.55,
			0,
			pit.b - pit.a,
			0.18,
			5.9,
		);
		for (let i = 0; i < 9; i++) {
			const x = rand(pit.a + 0.2, pit.b - 0.2),
				z = rand(-2.2, 2.2);
			const ripple = line(
				scene,
				[
					[x - 0.25, -0.44, z],
					[x + 0.25, -0.44, z],
				],
				pit.type === "sand" ? 0xd4bb7c : 0x93b29b,
			);
			waterDetails.push({ mesh: ripple, x, y: -0.44, z, phase: rand(0, TAU) });
		}
		if (pit.type === "sand") {
			const s = solid((pit.a + pit.b) / 2, -0.16, pit.b - pit.a, 0.3);
			pit.collider = s.collider;
			pit.mesh = water;
		}
		for (const x of [pit.a + 0.1, pit.b - 0.1]) {
			fern(x, 0, -1.9, 1.1);
			rock(x, -0.1, 2.4, 0.5);
		}
	}
	for (const x of [147, 150, 153]) {
		const g = new THREE.Group();
		scene.add(g);
		box(g, 0x9b8957, 0, -0.15, 0, 1.55, 0.3, 3.3, true);
		for (let i = 0; i < 3; i++)
			box(g, 0xbda66a, (i - 1) * 0.4, 0.015, 0, 0.3, 0.06, 3.2);
		g.position.set(x, 0.15, 0);
		const s = solid(x, 0, 1.55, 0.3, 0, 3.3);
		movingPlatforms.push({
			mesh: g,
			rb: s.rb,
			collider: s.collider,
			x,
			phase: x,
			y: 0,
		});
	}
}
function buildLadder(x, bottom = -5) {
	const g = new THREE.Group();
	g.position.x = x;
	scene.add(g);
	for (const side of [-0.44, 0.44])
		cyl(g, 0xd1b77b, side, bottom / 2, 2.2, 0.055, -bottom + 0.3);
	for (let y = bottom + 0.2; y < 0.3; y += 0.38)
		box(g, 0xd9bf86, 0, y, 2.2, 0.93, 0.08, 0.11);
	ladders.push({ x, bottom, mesh: g });
	const sign = box(g, C.ink, 0, 0.7, -0.9, 1.2, 0.65, 0.12);
	line(
		sign,
		[
			[-0.28, 0.1, 0.6],
			[0, -0.12, 0.6],
			[0.28, 0.1, 0.6],
		],
		C.gold,
	);
}
function buildCamp(c, i) {
	const g = new THREE.Group();
	scene.add(g);
	g.position.x = c.x;
	for (let n = 0; n < 3; n++) {
		const b = box(
			g,
			0x684f35,
			1.5,
			0.08 + (n % 2) * 0.06,
			0.1,
			0.65,
			0.12,
			0.16,
		);
		b.rotation.y = (n * TAU) / 3;
	}
	const flame = mesh(GEO.cone, C.gold, g, 1.5, 0.42, 0.1, 0.2, 0.7, 0.2);
	const f2 = mesh(GEO.cone, C.red, flame, 0, -0.1, 0, 0.7, 0.7, 0.7);
	sceneryMixers.push({
		custom: (t) => {
			flame.scale.y = 0.8 + Math.sin(t * 13 + i) * 0.17;
			flame.rotation.y = t;
		},
	});
	cyl(g, 0x897953, -1.2, 1.3, -1, 0.045, 2.6);
	const flag = box(
		g,
		i === 0 ? C.gold : 0xb5bd84,
		-0.72,
		2.2,
		-1,
		0.9,
		0.5,
		0.05,
	);
	flag.rotation.z = 0.07;
	for (let n = 0; n < 5; n++)
		rock(c.x + rand(-1, 2.2), 0.1, rand(1.7, 2.5), rand(0.12, 0.25));
	c.flag = flag;
}
function createExplorer(color = C.red, ghost = false) {
	const root = new THREE.Group();
	scene.add(root);
	const model = new THREE.Group();
	root.add(model);
	model.name = "Rig";
	const torso = new THREE.Group();
	torso.name = "Torso";
	model.add(torso);
	box(torso, 0x9aa276, 0, 0.05, 0, 0.55, 0.6, 0.36, true);
	box(torso, 0x765637, 0, -0.21, 0.03, 0.58, 0.09, 0.4);
	box(torso, 0xd6ba85, 0, -0.04, 0.215, 0.07, 0.33, 0.045);
	box(torso, 0x6c7250, -0.08, 0.15, -0.3, 0.47, 0.53, 0.24, true);
	ball(torso, 0x9e9165, -0.09, 0.4, -0.3, 0.24, 0.1, 0.16);
	cyl(torso, 0xe6b885, 0, 0.43, 0, 0.12, 0.18);
	const head = new THREE.Group();
	head.name = "Head";
	head.position.y = 0.65;
	torso.add(head);
	ball(head, 0xe6b885, 0, 0, 0, 0.25, 0.28, 0.24, true);
	ball(head, 0xca945e, 0, -0.01, 0.245, 0.08, 0.085, 0.07);
	for (const x of [-0.095, 0.095]) {
		ball(head, C.paper, x, 0.04, 0.205, 0.065, 0.073, 0.04);
		ball(head, C.ink, x + 0.012, 0.035, 0.24, 0.03, 0.04, 0.018);
	}
	box(head, 0x4f4a32, 0, 0.16, -0.14, 0.4, 0.15, 0.18);
	cyl(head, 0xddbc77, 0, 0.23, 0, 0.43, 0.07, 0.43, true);
	cyl(head, 0xe9ce8d, 0, 0.4, 0, 0.26, 0.3, 0.2, true);
	cyl(head, 0x755738, 0, 0.29, 0, 0.265, 0.07);
	box(torso, color, 0, 0.35, 0.02, 0.6, 0.12, 0.41, true);
	const scarf = mesh(
		GEO.cone,
		color,
		torso,
		0.24,
		0.11,
		-0.07,
		0.16,
		0.5,
		0.08,
	);
	scarf.rotation.z = 0.5;
	for (const side of [-1, 1]) {
		const arm = new THREE.Group();
		arm.name = side < 0 ? "LArm" : "RArm";
		arm.position.set(side * 0.32, 0.25, side * 0.02);
		torso.add(arm);
		ball(arm, 0x96a174, 0, -0.11, 0, 0.14, 0.21, 0.14);
		box(arm, 0xdba576, 0, -0.34, 0, 0.17, 0.32, 0.17, true);
		ball(arm, 0xe4b481, 0, -0.51, 0, 0.12, 0.13, 0.12);
		const leg = new THREE.Group();
		leg.name = side < 0 ? "LLeg" : "RLeg";
		leg.position.set(side * 0.16, -0.25, side * 0.03);
		torso.add(leg);
		box(leg, 0x6f7050, 0, -0.15, 0, 0.24, 0.28, 0.28, true);
		box(leg, 0xd3a475, 0, -0.34, 0, 0.17, 0.25, 0.18);
		box(leg, 0x4c4934, 0, -0.48, 0.07, 0.23, 0.24, 0.37, true);
	}
	const mixer = new THREE.AnimationMixer(model);
	const track = (part, vals) =>
		new THREE.NumberKeyframeTrack(
			part + ".rotation[z]",
			[0, 0.25, 0.5, 0.75, 1],
			vals,
		);
	const run = new THREE.AnimationClip("run", 1, [
		track("LLeg", [-0.8, 0, 0.8, 0, -0.8]),
		track("RLeg", [0.8, 0, -0.8, 0, 0.8]),
		track("LArm", [0.65, 0, -0.65, 0, 0.65]),
		track("RArm", [-0.65, 0, 0.65, 0, -0.65]),
		new THREE.NumberKeyframeTrack(
			"Torso.position[y]",
			[0, 0.25, 0.5, 0.75, 1],
			[0, 0.065, 0, 0.065, 0],
		),
	]);
	const idle = new THREE.AnimationClip("idle", 2, [
		new THREE.NumberKeyframeTrack(
			"Torso.position[y]",
			[0, 1, 2],
			[0, 0.045, 0],
		),
		track("LArm", [-0.08, -0.1, -0.08, -0.06, -0.08]),
		track("RArm", [0.08, 0.1, 0.08, 0.06, 0.08]),
	]);
	const jump = new THREE.AnimationClip("jump", 1, [
		track("LLeg", [-0.6, -0.6, -0.6, -0.6, -0.6]),
		track("RLeg", [0.65, 0.65, 0.65, 0.65, 0.65]),
		track("LArm", [-1.4, -1.4, -1.4, -1.4, -1.4]),
		track("RArm", [1.4, 1.4, 1.4, 1.4, 1.4]),
	]);
	const swing = new THREE.AnimationClip("swing", 1, [
		track("LArm", [-2.8, -2.8, -2.8, -2.8, -2.8]),
		track("RArm", [2.8, 2.8, 2.8, 2.8, 2.8]),
		track("LLeg", [-0.3, -0.4, -0.3, -0.2, -0.3]),
		track("RLeg", [0.45, 0.55, 0.45, 0.35, 0.45]),
	]);
	const climb = new THREE.AnimationClip("climb", 1, [
		track("LArm", [-2.7, -1.7, -0.7, -1.7, -2.7]),
		track("RArm", [0.7, 1.7, 2.7, 1.7, 0.7]),
		track("LLeg", [-0.7, 0, 0.7, 0, -0.7]),
		track("RLeg", [0.7, 0, -0.7, 0, 0.7]),
	]);
	const actions = {};
	for (const clip of [idle, run, jump, swing, climb]) {
		const a = mixer.clipAction(clip).play();
		a.setEffectiveWeight(clip.name === "idle" ? 1 : 0);
		actions[clip.name] = a;
	}
	if (ghost)
		root.traverse((o) => {
			if (o.isMesh) {
				o.material = o.material.clone();
				o.material.transparent = true;
				o.material.opacity = 0.47;
				o.castShadow = false;
			}
		});
	const shadow = new THREE.Mesh(
		new THREE.CircleGeometry(0.53, 20),
		new THREE.MeshBasicMaterial({
			color: 0x0e362a,
			transparent: true,
			opacity: 0.2,
			depthWrite: false,
		}),
	);
	shadow.rotation.x = -Math.PI / 2;
	scene.add(shadow);
	return { root, model, mixer, actions, shadow, anim: "idle" };
}
function animateExplorer(avatar, mode, speed, dt) {
	for (const [name, a] of Object.entries(avatar.actions)) {
		a.setEffectiveWeight(
			lerp(a.getEffectiveWeight(), name === mode ? 1 : 0, Math.min(1, dt * 16)),
		);
		if (name === "run") a.timeScale = Math.max(0.35, Math.abs(speed) * 0.23);
	}
	avatar.mixer.update(dt);
	avatar.anim = mode;
}
function makeVine(x, y = 8, length = 6.5, phase = 0) {
	const group = new THREE.Group();
	group.position.set(x, y, 0);
	scene.add(group);
	const rope = cyl(group, 0x769052, 0, -length / 2, 0, 0.048, length);
	const core = cyl(group, C.ink, 0, -length / 2, -0.02, 0.063, length);
	for (let n = 1; n < 5; n++)
		leaf(
			group,
			0,
			(-n * length) / 5,
			0,
			0.45,
			0.08,
			n % 2 ? 0.8 : -0.8,
			C.leaf,
		);
	cyl(group, C.gold, 0, -length + 0.2, 0, 0.065, 0.42);
	const marker = mesh(
		new THREE.TorusGeometry(0.15, 0.025, 4, 16),
		C.gold,
		group,
		0,
		-length,
		0,
	);
	const end = new THREE.Vector3();
	const v = { x, y, length, phase, group, end, angle: 0, vel: 0 };
	vines.push(v);
	box(scene, 0x40563c, x, y + 0.25, -0.5, 3.7, 0.3, 0.3);
	return v;
}
function makeCroc(x, phase) {
	const g = new THREE.Group();
	scene.add(g);
	g.position.set(x, -0.28, 0);
	ball(g, 0x557b4e, 0, 0, 0, 1.35, 0.35, 0.45, true);
	const tail = mesh(
		GEO.cone,
		0x3e684b,
		g,
		-1.6,
		-0.02,
		0,
		0.36,
		1.4,
		0.35,
		true,
	);
	tail.rotation.z = Math.PI / 2;
	for (let k = -2; k <= 2; k++)
		mesh(GEO.cone, 0x82935c, g, k * 0.35, 0.33, 0, 0.12, 0.2, 0.13);
	box(g, 0x66844c, 0.72, 0.1, 0, 0.95, 0.24, 0.65, true);
	const jaw = new THREE.Group();
	jaw.name = "Jaw";
	jaw.position.set(0.25, 0.12, 0);
	g.add(jaw);
	box(jaw, 0x7b9859, 0.6, 0.13, 0, 1.25, 0.2, 0.67, true);
	for (let k = 0; k < 5; k++) {
		for (const z of [-0.27, 0.27]) {
			const tooth = mesh(
				GEO.cone,
				C.paper,
				jaw,
				0.19 + k * 0.2,
				-0.03,
				z,
				0.06,
				0.16,
				0.06,
			);
			tooth.rotation.z = Math.PI;
			mesh(GEO.cone, C.paper, g, 0.45 + k * 0.2, 0.24, z, 0.06, 0.16, 0.06);
		}
	}
	for (const z of [-0.26, 0.26]) {
		ball(jaw, C.gold, 0.2, 0.29, z, 0.13, 0.14, 0.12);
		ball(jaw, C.ink, 0.24, 0.32, z + 0.04, 0.05, 0.065, 0.04);
	}
	const mix = new THREE.AnimationMixer(g);
	const clip = new THREE.AnimationClip("snap", 5, [
		new THREE.NumberKeyframeTrack(
			"Jaw.rotation[z]",
			[0, 2.5, 2.8, 3.4, 4.3, 4.55, 5],
			[0, 0, 0.56, 0.56, 0.56, 0, 0],
		),
	]);
	const act = mix.clipAction(clip).play();
	act.time = phase;
	const s = solid(x, -0.12, 2.2, 0.28, 0, 1.2);
	crocs.push({
		x,
		phase,
		mesh: g,
		mixer: mix,
		action: act,
		collider: s.collider,
		closed: true,
	});
}
function makeSnake(x, y = 0) {
	const g = new THREE.Group();
	g.position.set(x, y, 0);
	scene.add(g);
	for (let i = 0; i < 3; i++) {
		const coil = mesh(
			new THREE.TorusGeometry(0.3 - i * 0.04, 0.12, 5, 12),
			i % 2 ? 0xb6a54e : 0x7f8847,
			g,
			0,
			0.15 + i * 0.09,
			0,
			1,
			1,
			1,
			true,
		);
		coil.rotation.x = Math.PI / 2;
	}
	const h = new THREE.Group();
	h.name = "Cobra";
	g.add(h);
	const hood = ball(h, 0x899447, 0.1, 0.62, 0, 0.29, 0.4, 0.14, true);
	ball(h, C.gold, 0.15, 0.73, 0.12, 0.18, 0.13, 0.15, true);
	for (const dx of [-0.09, 0.09]) ball(h, C.ink, 0.15 + dx, 0.77, 0.24, 0.035);
	box(h, C.red, 0.15, 0.65, 0.31, 0.04, 0.02, 0.14);
	const mixer = new THREE.AnimationMixer(g);
	mixer
		.clipAction(
			new THREE.AnimationClip("sway", 2, [
				new THREE.NumberKeyframeTrack(
					"Cobra.rotation[z]",
					[0, 1, 2],
					[-0.13, 0.13, -0.13],
				),
			]),
		)
		.play();
	sceneryMixers.push({ mixer });
	hazards.push({ type: "cobra", x, y, mesh: g, radius: 0.65 });
}
function makeScorpion(x, y = -5, range = 3) {
	const g = new THREE.Group();
	g.position.set(x, y, 0);
	scene.add(g);
	ball(g, 0xa76f4d, 0, 0.25, 0, 0.43, 0.2, 0.27, true);
	for (let i = 0; i < 4; i++)
		for (const s of [-1, 1]) {
			const leg = box(
				g,
				0xc59564,
				(i - 1.5) * 0.18,
				0.13,
				s * 0.32,
				0.08,
				0.07,
				0.5,
			);
			leg.rotation.y = (i - 1.5) * 0.3;
		}
	for (const s of [-1, 1])
		ball(g, 0xcf9e6e, 0.53, 0.28, s * 0.23, 0.24, 0.1, 0.15, true);
	const tail = new THREE.Group();
	tail.name = "Tail";
	tail.position.set(-0.35, 0.2, 0);
	g.add(tail);
	for (let i = 0; i < 6; i++) {
		const a = (i / 5) * Math.PI * 0.9;
		ball(tail, 0xb68156, -Math.sin(a) * 0.45, 0.2 + i * 0.11, 0, 0.1);
	}
	mesh(GEO.cone, C.gold, tail, 0.08, 0.68, 0, 0.09, 0.27, 0.07);
	const mixer = new THREE.AnimationMixer(g);
	mixer
		.clipAction(
			new THREE.AnimationClip("sting", 1.6, [
				new THREE.NumberKeyframeTrack(
					"Tail.rotation[z]",
					[0, 0.8, 1.6],
					[-0.2, 0.25, -0.2],
				),
			]),
		)
		.play();
	sceneryMixers.push({ mixer });
	hazards.push({
		type: "scorpion",
		x,
		y,
		origin: x,
		range,
		mesh: g,
		radius: 0.65,
	});
}
function makeFire(x) {
	const g = new THREE.Group();
	g.position.x = x;
	scene.add(g);
	for (let k = 0; k < 3; k++) {
		const l = box(g, 0x745437, 0, 0.1, 0, 0.7, 0.18, 0.2);
		l.rotation.y = (k * Math.PI) / 3;
	}
	const flames = [];
	for (let n = 0; n < 5; n++) {
		const f = mesh(
			GEO.cone,
			n % 2 ? C.gold : C.red,
			g,
			rand(-0.25, 0.25),
			0.5,
			rand(-0.2, 0.2),
			rand(0.17, 0.3),
			rand(0.6, 1.1),
			0.2,
		);
		flames.push(f);
	}
	sceneryMixers.push({
		custom: (t) =>
			flames.forEach((f, i) => {
				f.scale.y = 0.7 + Math.sin(t * 10 + i) * 0.23;
				f.rotation.z = Math.sin(t * 9 + i) * 0.12;
			}),
	});
	hazards.push({ type: "fire", x, y: 0, mesh: g, radius: 0.65 });
}
function makeLog(x, a, b) {
	const g = new THREE.Group();
	scene.add(g);
	const body = cyl(g, 0x8b603c, 0, 0, 0, 0.46, 1.4, 0.46, true);
	body.rotation.x = Math.PI / 2;
	for (const z of [-0.71, 0.71]) {
		const face = cyl(g, 0xd5b87e, 0, 0, z, 0.41, 0.025);
		face.rotation.x = Math.PI / 2;
		for (const r of [0.14, 0.29]) {
			const ring = mesh(
				new THREE.TorusGeometry(r, 0.018, 4, 14),
				0x785b3b,
				g,
				0,
				0,
				z + Math.sign(z) * 0.02,
			);
		}
	}
	for (let i = 0; i < 7; i++) {
		const a1 = (i / 7) * TAU;
		box(
			g,
			0x644e33,
			Math.sin(a1) * 0.445,
			Math.cos(a1) * 0.445,
			0,
			0.035,
			0.04,
			1.3,
		);
	}
	const rb = physics.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(x, 0.53, 0)
			.enabledTranslations(true, true, false)
			.enabledRotations(false, false, true)
			.setLinearDamping(0.05),
	);
	physics.createCollider(
		RAPIER.ColliderDesc.ball(0.46)
			.setFriction(0.9)
			.setRestitution(0.1)
			.setMass(3),
		rb,
	);
	logs.push({ mesh: g, rb, a, b, dir: -1, x });
}
function makeTreasure(def, index) {
	const g = new THREE.Group();
	scene.add(g);
	g.position.set(def.x, def.y, 0);
	g.name = "Treasure" + index;
	const rot = new THREE.Group();
	rot.name = "Relic";
	g.add(rot);
	if (def.type === "ring") {
		const ring = mesh(
			new THREE.TorusGeometry(0.32, 0.09, 6, 14),
			C.gold,
			rot,
			0,
			0.03,
			0,
			1,
			1,
			1,
			true,
		);
		mesh(
			new THREE.OctahedronGeometry(0.17),
			0xc9e6c3,
			rot,
			0,
			0.42,
			0,
			1,
			1,
			1,
			true,
		);
	} else if (def.type === "gem") {
		mesh(
			new THREE.OctahedronGeometry(0.43),
			0x72b796,
			rot,
			0,
			0,
			0,
			1,
			1.2,
			1,
			true,
		);
		mesh(new THREE.OctahedronGeometry(0.15), C.paper, rot, -0.12, 0.2, 0.24);
	} else if (def.type === "bag") {
		ball(rot, 0xddb773, 0, 0, 0, 0.34, 0.4, 0.29, true);
		cyl(rot, 0x745832, 0, 0.29, 0, 0.16, 0.12);
		mesh(GEO.cone, C.gold, rot, 0, 0.43, 0, 0.2, 0.23, 0.18);
		box(rot, C.ink, 0, 0.02, 0.28, 0.04, 0.25, 0.025);
		box(rot, C.ink, 0, 0.02, 0.29, 0.16, 0.04, 0.025);
	} else if (def.type === "silver") {
		for (let k = 0; k < 3; k++)
			box(
				rot,
				[0xaec8bd, 0xe0e2cb, 0xabc3ae][k],
				(k - 1) * 0.22,
				(k % 2) * 0.14,
				0,
				0.32,
				0.22,
				0.55,
				true,
			);
	} else if (def.type === "chest") {
		box(rot, 0xb58340, 0, 0, 0, 0.75, 0.5, 0.5, true);
		for (const x of [-0.26, 0.26])
			box(rot, C.gold, x, 0.03, 0.02, 0.09, 0.55, 0.55);
		box(rot, C.gold, 0, 0.05, 0.29, 0.16, 0.2, 0.06);
		box(rot, 0x64482e, 0, 0.02, 0.325, 0.045, 0.08, 0.02);
	} else if (def.type === "sun") {
		ball(rot, C.gold, 0, 0, 0, 0.28, 0.28, 0.09, true);
		for (let n = 0; n < 10; n++) {
			const a = (n / 10) * TAU;
			const ray = mesh(
				GEO.cone,
				C.gold,
				rot,
				Math.sin(a) * 0.41,
				Math.cos(a) * 0.41,
				0,
				0.08,
				0.2,
				0.07,
			);
			ray.rotation.z = -a;
		}
		ball(rot, C.paper, 0, 0.04, 0.11, 0.09, 0.09, 0.02);
	} else {
		ball(rot, C.gold, 0, 0, 0, 0.3, 0.38, 0.23, true);
		ball(rot, 0xe9bd55, 0, 0.43, 0, 0.23, 0.22, 0.2, true);
		for (const x of [-0.11, 0.11])
			ball(rot, C.ink, x, 0.47, 0.17, 0.05, 0.06, 0.04);
		box(rot, C.ink, 0, 0.34, 0.19, 0.23, 0.045, 0.025);
		for (const x of [-0.32, 0.32])
			box(rot, C.gold, x, -0.12, 0, 0.12, 0.5, 0.13, true);
	}
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.7, 0.018, 4, 32),
		new THREE.MeshBasicMaterial({
			color: C.gold,
			transparent: true,
			opacity: 0.45,
		}),
	);
	ring.rotation.x = Math.PI / 2;
	ring.position.y = -0.75;
	g.add(ring);
	const mixer = new THREE.AnimationMixer(g);
	mixer
		.clipAction(
			new THREE.AnimationClip("treasure", 3, [
				new THREE.NumberKeyframeTrack("Relic.rotation[y]", [0, 3], [0, TAU]),
				new THREE.NumberKeyframeTrack(
					"Relic.position[y]",
					[0, 1.5, 3],
					[0, 0.18, 0],
				),
			]),
		)
		.play();
	treasures.push({ ...def, index, mesh: g, mixer, collected: false });
}
function buildScenery() {
	box(scene, 0x65836c, 112, -0.18, -30, 260, 0.3, 54);
	scene.add(new THREE.HemisphereLight(0xfff1cf, 0x405d4d, 1.7));
	sunLight = new THREE.DirectionalLight(0xffd491, 2.1);
	sunLight.position.set(0, 18, 12);
	sunLight.castShadow = true;
	sunLight.shadow.mapSize.set(2048, 2048);
	sunLight.shadow.camera.left = -23;
	sunLight.shadow.camera.right = 23;
	sunLight.shadow.camera.top = 18;
	sunLight.shadow.camera.bottom = -14;
	sunLight.shadow.normalBias = 0.1;
	sunLight.shadow.bias = -0.0002;
	scene.add(sunLight, sunLight.target);
	sunDisc = new THREE.Mesh(
		new THREE.CircleGeometry(5.4, 64),
		new THREE.MeshBasicMaterial({ color: 0xf6d68d }),
	);
	sunDisc.position.set(39, 6, -20);
	scene.add(sunDisc);
	const halo = new THREE.Mesh(
		new THREE.RingGeometry(5.65, 5.73, 64),
		new THREE.MeshBasicMaterial({ color: 0xe5d69c, side: THREE.DoubleSide }),
	);
	halo.position.z = -0.05;
	sunDisc.add(halo);
	for (let x = -20; x < 260; x += 13) {
		const s = new THREE.Shape();
		s.moveTo(-12, -3);
		for (let i = -12; i <= 12; i += 2)
			s.lineTo(i, rand(3, 9) + (1 - Math.abs(i) / 15) * 3);
		s.lineTo(12, -3);
		const m = new THREE.Mesh(
			new THREE.ShapeGeometry(s),
			new THREE.MeshBasicMaterial({ color: 0x83a991 }),
		);
		m.position.set(x, 0, -43);
		scene.add(m);
	}
	for (let x = -8; x < 240; x += 6.8) tree(x, -18, rand(0.8, 1.3), true);
	temple(43, -16, 1.2);
	temple(140, -20, 2.3);
	temple(215, -12, 1.6);
	// A curtain of stylized falls behind the hanging gardens.
	for (let n = 0; n < 7; n++) {
		const f = box(
			scene,
			n % 2 ? 0x9fc9b3 : 0x71ae9e,
			46 + n * 0.48,
			3.7,
			-13,
			0.35,
			8,
			1,
		);
		waterDetails.push({
			mesh: f,
			x: 46 + n * 0.48,
			y: 3.7,
			z: -13,
			phase: n,
			fall: true,
		});
	}
	for (let n = 0; n < 8; n++) rock(45 + rand(-1, 4), 0, -12, rand(0.6, 1.4));
	for (let x = -5; x < 230; x += 7.5) {
		tree(x, -4.6, rand(0.85, 1.18));
		if (rand() > 0.35) tree(x + 3, -8, rand(0.65, 0.9));
	}
	for (let x = -3; x < 230; x += 1.9) {
		if (gaps.some((g) => x > g.a && x < g.b)) continue;
		fern(
			x,
			0,
			rand(1.8, 2.6),
			rand(0.45, 0.85),
			[C.leaf, C.jade, C.mint][Math.floor(rand(0, 3))],
		);
		if (rand() > 0.35) rock(x, 0.04, rand(-2.6, -1.8), rand(0.18, 0.5));
		if (rand() > 0.64) {
			const flower = new THREE.Group();
			scene.add(flower);
			flower.position.set(x, 0.15, 2.2);
			for (let i = 0; i < 5; i++) {
				const a = (i / 5) * TAU;
				ball(
					flower,
					rand() > 0.5 ? C.red : 0xe1bf68,
					Math.sin(a) * 0.12,
					Math.cos(a) * 0.12,
					0,
					0.09,
					0.14,
					0.04,
				);
			}
			ball(flower, C.gold, 0, 0, 0.06, 0.055);
		}
	}
	// Mossy ruin fragments, engraved with original little sun marks.
	for (const x of [19, 38, 49, 78, 115, 130, 157, 179, 200]) {
		const g = new THREE.Group();
		g.position.set(x, 0, -2.5);
		g.rotation.z = rand(-0.13, 0.13);
		scene.add(g);
		box(g, 0x809071, 0, 0.8, 0, 0.7, 1.6, 0.65, true);
		box(g, 0x9ba37c, 0, 1.65, 0, 0.95, 0.25, 0.9, true);
		inscription(g, 0, 1, 0.34, 0.52);
		fern(x, 0, -1.9, 0.65);
	}
	for (let x = -2; x < 230; x += 11) {
		const g = new THREE.Group();
		scene.add(g);
		g.position.set(x, 0, -2.9);
		for (let n = 0; n < 5; n++) {
			const a = (n - 2) * 0.55;
			const stem = cyl(g, 0x416c4c, Math.sin(a) * 0.3, 0.45, 0, 0.032, 0.9);
			stem.rotation.z = -a;
			const l = leaf(
				g,
				Math.sin(a) * 0.55,
				0.65,
				0,
				rand(1.1, 2.0),
				0.36,
				a,
				[C.leaf, C.jade, C.mint][n % 3],
			);
			l.rotation.y = (n - 2) * 0.13;
		}
	}
	const gate = new THREE.Group();
	scene.add(gate);
	gate.position.x = 219;
	for (const s of [-1, 1]) {
		box(gate, 0x7e8f69, s * 2.2, 2.4, -0.7, 1.15, 4.8, 1.4, true);
		box(gate, 0xa9ae7a, s * 2.2, 4.9, -0.7, 1.65, 0.35, 1.9, true);
		inscription(gate, s * 2.2, 3.1, 0.03, 0.8);
	}
	box(gate, 0x8e9d70, 0, 5.4, -0.7, 6.2, 0.7, 1.8, true);
	ball(gate, C.gold, 0, 6.3, -0.5, 0.72, 0.72, 0.18, true);
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * TAU;
		const r = mesh(
			GEO.cone,
			C.gold,
			gate,
			Math.sin(a) * 1.0,
			6.3 + Math.cos(a) * 1.0,
			-0.5,
			0.12,
			0.4,
			0.1,
		);
		r.rotation.z = -a;
	}
}
async function makeScene() {
	await RAPIER.init();
	physics = new RAPIER.World({ x: 0, y: -25, z: 0 });
	controller = physics.createCharacterController(0.025);
	controller.enableAutostep(0.25, 0.1, true);
	controller.enableSnapToGround(0.14);
	controller.setMaxSlopeClimbAngle(0.8);
	controller.setMinSlopeSlideAngle(0.9);
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xa9c4a6);
	scene.fog = new THREE.Fog(0xa9c4a6, 38, 100);
	camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 150);
	renderer = new THREE.WebGPURenderer({
		canvas: $("world"),
		antialias: true,
		alpha: false,
		forceWebGL:
			new URLSearchParams(location.search).get("renderer") === "webgl",
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.02;
	await renderer.init();
	backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 fallback";
	buildTerrain();
	buildScenery();
	for (const x of [73, 109, 165, 179]) buildLadder(x);
	camps.forEach(buildCamp);
	makeVine(30, 8, 6.5, 0.1);
	makeVine(59, 9.5, 8.2, 1.3);
	makeVine(123, 8, 6.5, 1.0);
	makeVine(188, 8, 6.5, 2.1);
	for (const x of [55, 58.5, 62]) makeCroc(x, 0);
	for (const x of [22, 46, 132, 181]) makeSnake(x);
	for (const [x, r] of [
		[85, 2.5],
		[101, 2.5],
		[170, 1.5],
	])
		makeScorpion(x, -5, r);
	makeFire(113);
	makeFire(201);
	makeLog(12, 8, 19);
	makeLog(99, 94, 107);
	makeLog(158, 155, 162);
	treasureDefs.forEach(makeTreasure);
	for (let x = 8; x < 215; x += 5) {
		if (gaps.some((g) => x > g.a - 1 && x < g.b + 1)) continue;
		const cave = (x > 76 && x < 106) || (x > 166 && x < 177);
		const y = cave ? -3.9 : 1.05;
		const m = mesh(
			new THREE.OctahedronGeometry(0.12),
			C.gold,
			scene,
			x,
			y,
			0.1,
		);
		coins.push({ x, y, mesh: m, taken: false });
	}
	for (let i = 0; i < 100; i++) {
		const m = ball(
			scene,
			C.gold,
			rand(0, 224),
			rand(0.7, 7),
			rand(-5, 2),
			rand(0.017, 0.038),
		);
		waterDetails.push({
			mesh: m,
			x: m.position.x,
			y: m.position.y,
			z: m.position.z,
			phase: rand(0, TAU),
			size: m.scale.x,
			firefly: true,
		});
	}
	resizeScene();
	return true;
}
function resizeScene() {
	if (!renderer) return;
	const w = innerWidth,
		h = innerHeight;
	renderer.setSize(w, h, false);
	let halfH = 7.8;
	if (w / h < 1) halfH = 11.5;
	let halfW = (halfH * w) / h;
	if (halfW < 8.5) {
		halfW = 8.5;
		halfH = (halfW * h) / w;
	}
	camera.left = -halfW;
	camera.right = halfW;
	camera.top = halfH;
	camera.bottom = -halfH;
	camera.updateProjectionMatrix();
}
function burst(x, y, color = C.gold, n = 18) {
	for (let i = 0; i < n; i++) {
		const m = mesh(
			GEO.box,
			color,
			scene,
			x,
			y,
			rand(-0.2, 0.5),
			rand(0.035, 0.08),
			rand(0.04, 0.13),
			0.035,
		);
		effects.push({
			mesh: m,
			vx: rand(-3, 3),
			vy: rand(1, 5),
			vz: rand(-1, 1),
			life: rand(0.4, 1.1),
		});
	}
}
function updateScene(t, dt, hazardTempo = 1) {
	for (const v of vines) {
		v.angle = Math.sin(t * 1.2 + v.phase) * 0.94;
		v.vel = Math.cos(t * 1.2 + v.phase) * 1.128;
		v.group.rotation.z = v.angle;
		v.end.set(
			v.x + Math.sin(v.angle) * v.length,
			v.y - Math.cos(v.angle) * v.length,
			0,
		);
	}
	for (const c of crocs) {
		c.action.time = (t * hazardTempo) % 5;
		c.mixer.update(0);
		const p = (t * hazardTempo) % 5;
		c.closed = p < 2.55 || p > 4.5;
		c.collider.setEnabled(c.closed);
	}
	for (const m of sceneryMixers) {
		if (m.mixer) m.mixer.update(dt * hazardTempo);
		if (m.custom) m.custom(t);
	}
	for (const h of hazards)
		if (h.type === "scorpion") {
			h.x = h.origin + Math.sin(t * 0.9 * hazardTempo + h.origin) * h.range;
			h.mesh.position.x = h.x;
			h.mesh.rotation.y =
				Math.cos(t * 0.9 * hazardTempo + h.origin) > 0 ? 0 : Math.PI;
		}
	for (const g of gaps)
		if (g.type === "sand") {
			g.open = (t * hazardTempo) % 5.8 < 3.5;
			g.collider.setEnabled(!g.open);
			g.mesh.position.y = g.open ? -0.55 : -0.08;
			g.mesh.material = mat(g.open ? 0xa68d51 : 0xbba96c);
		}
	for (const p of movingPlatforms) {
		p.y = 0.13 + Math.sin(t * 1.7 + p.phase) * 0.12;
		p.mesh.position.y = p.y;
		p.rb.setTranslation({ x: p.x, y: p.y - 0.15, z: 0 }, false);
	}
	for (const l of logs) {
		const pos = l.rb.translation();
		if (pos.x < l.a) {
			l.dir = 1;
		}
		if (pos.x > l.b) {
			l.dir = -1;
		}
		l.rb.setLinvel(
			{
				x: l.dir * 2.1 * hazardTempo,
				y: pos.y < -0.5 ? 0 : l.rb.linvel().y,
				z: 0,
			},
			true,
		);
		l.rb.setAngvel({ x: 0, y: 0, z: -l.dir * 4.5 * hazardTempo }, true);
		if (pos.y < -2)
			l.rb.setTranslation({ x: (l.a + l.b) / 2, y: 0.6, z: 0 }, true);
		l.mesh.position.copy(l.rb.translation());
		l.mesh.quaternion.copy(l.rb.rotation());
	}
	for (const a of treasures) {
		a.mixer.update(dt);
		a.mesh.visible = !a.collected;
	}
	for (const c of coins) {
		c.mesh.visible = !c.taken;
		c.mesh.rotation.y = t * 2;
		c.mesh.position.y = c.y + Math.sin(t * 3 + c.x) * 0.12;
	}
	for (const d of waterDetails) {
		if (d.firefly) {
			d.mesh.position.y = d.y + Math.sin(t * 0.8 + d.phase) * 0.5;
			d.mesh.position.x = d.x + Math.cos(t * 0.4 + d.phase) * 0.45;
			d.mesh.scale.setScalar(d.size * (0.7 + Math.sin(t * 2 + d.phase) * 0.3));
		} else if (d.fall) d.mesh.scale.x = 0.8 + Math.sin(t * 4 + d.phase) * 0.18;
		else d.mesh.position.y = d.y + Math.sin(t * 2 + d.phase) * 0.035;
	}
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.life -= dt;
		e.vy -= dt * 7;
		e.mesh.position.x += e.vx * dt;
		e.mesh.position.y += e.vy * dt;
		e.mesh.position.z += e.vz * dt;
		e.mesh.rotation.z += dt * 5;
		e.mesh.scale.multiplyScalar(Math.exp(-dt * 0.8));
		if (e.life <= 0) {
			scene.remove(e.mesh);
			effects.splice(i, 1);
		}
	}
}
function moveCamera(x, y, dt, snap = false) {
	const targetY = y < -1 ? -1.8 : 3.0;
	const tx = clamp(x + 3, 12, 214);
	const f = snap ? 1 : 1 - Math.exp(-dt * 4);
	const old = camera.userData.cx ?? tx,
		oy = camera.userData.cy ?? targetY;
	const cx = lerp(old, tx, f),
		cy = lerp(oy, targetY, f);
	camera.userData.cx = cx;
	camera.userData.cy = cy;
	camera.position.set(cx + 1.3, cy + 6.5, 28);
	camera.lookAt(cx, cy, 0);
	sunLight.position.set(cx - 8, 18, 10);
	sunLight.target.position.set(cx, 0, 0);
	sunDisc.position.x = cx + 10;
}
