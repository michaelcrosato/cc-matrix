import * as THREE from "three/webgpu";

// All silhouettes, terrain and animation are generated here. No image assets.
const INK = 0x173b3b;
const P = {
	ink: INK,
	water: 0x167f85,
	deep: 0x116773,
	foam: 0x8ed8cb,
	sand: 0xf6c46b,
	cream: 0xfff1c3,
	grass: 0x79a970,
	darkGrass: 0x46795f,
	red: 0xf66b47,
	navy: 0x254d58,
};
const materials = new Map();
const edgeMaterial = new THREE.LineBasicMaterial({ color: INK });
const shadowMaterial = new THREE.MeshBasicMaterial({
	color: 0x074e5d,
	transparent: true,
	opacity: 0.26,
	depthWrite: false,
});
const ramp = new THREE.DataTexture(
	new Uint8Array([
		105, 105, 105, 255, 170, 170, 170, 255, 224, 224, 224, 255, 255, 255, 255,
		255,
	]),
	4,
	1,
	THREE.RGBAFormat,
);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
function mat(color, unlit = false) {
	const key = color + ":" + unlit;
	if (!materials.has(key))
		materials.set(
			key,
			unlit
				? new THREE.MeshBasicMaterial({ color })
				: new THREE.MeshToonMaterial({ color, gradientMap: ramp }),
		);
	return materials.get(key);
}
function mesh(geometry, color, outline = true, unlit = false) {
	const m = new THREE.Mesh(geometry, mat(color, unlit));
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline)
		m.add(
			new THREE.LineSegments(
				new THREE.EdgesGeometry(geometry, 24),
				edgeMaterial,
			),
		);
	return m;
}
function box(g, x, y, z, color, px = 0, py = 0, pz = 0, outline = true) {
	const m = mesh(new THREE.BoxGeometry(x, y, z), color, outline);
	m.position.set(px, py, pz);
	g.add(m);
	return m;
}
function cylinder(g, r1, r2, height, color, x = 0, y = 0, z = 0, sides = 8) {
	const m = mesh(new THREE.CylinderGeometry(r1, r2, height, sides), color);
	m.position.set(x, y, z);
	g.add(m);
	return m;
}
function beam(g, a, b, radius, color) {
	const start = new THREE.Vector3(...a),
		end = new THREE.Vector3(...b),
		d = end.clone().sub(start);
	const m = mesh(
		new THREE.CylinderGeometry(radius, radius, d.length(), 5),
		color,
	);
	m.position.copy(start.add(end).multiplyScalar(0.5));
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
	g.add(m);
	return m;
}
function prism(points, height, color) {
	const vectors = points.map((p) => new THREE.Vector2(p[0], p[1]));
	const tri = THREE.ShapeUtils.triangulateShape(vectors, []);
	const verts = [],
		n = points.length;
	const put = (i, y) => verts.push(points[i][0], y, points[i][1]);
	for (const t of tri) {
		for (const i of [...t].reverse()) put(i, height / 2);
		for (const i of t) put(i, -height / 2);
	}
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		put(i, -height / 2);
		put(j, height / 2);
		put(j, -height / 2);
		put(i, -height / 2);
		put(i, height / 2);
		put(j, height / 2);
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
	geo.computeVertexNormals();
	return mesh(geo, color);
}
function shadow(g, x = 1.5, z = 2, y = -1.26) {
	const s = new THREE.Mesh(new THREE.CircleGeometry(1, 16), shadowMaterial);
	s.rotation.x = -Math.PI / 2;
	s.scale.set(x, z, 1);
	s.position.set(0.25, y, 0.6);
	g.add(s);
	return s;
}

function smooth(a, b, x) {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}
function canyonAmount(progress) {
	return smooth(760, 900, progress) * (1 - smooth(1560, 1700, progress));
}
export function river(progress) {
	const wide =
		8.8 +
		Math.sin(progress * 0.023) * 1.15 +
		Math.sin(progress * 0.007 + 1) * 0.75;
	const narrow =
		6.9 +
		Math.sin(progress * 0.023) * 0.6 +
		Math.sin(progress * 0.007 + 1) * 0.2;
	return {
		center:
			Math.sin(progress * 0.014) * 3.5 + Math.sin(progress * 0.031 + 0.6) * 1.9,
		width: wide + (narrow - wide) * canyonAmount(progress),
	};
}

export function makePlane(color = P.red) {
	const group = new THREE.Group();
	const body = new THREE.Group();
	body.name = "airframe";
	group.add(body);
	const hull = prism(
		[
			[-0.34, -1.65],
			[0.34, -1.65],
			[0.53, -0.45],
			[0.28, 1.6],
			[-0.28, 1.6],
			[-0.53, -0.45],
		],
		0.55,
		color,
	);
	body.add(hull);
	const wing = prism(
		[
			[-0.35, -0.45],
			[-2.15, 0.27],
			[-2.15, 0.72],
			[-0.28, 0.31],
			[0.28, 0.31],
			[2.15, 0.72],
			[2.15, 0.27],
			[0.35, -0.45],
		],
		0.16,
		P.cream,
	);
	wing.position.y = 0.02;
	body.add(wing);
	box(body, 0.23, 0.2, 0.56, P.navy, -1.97, 0.04, 0.49);
	box(body, 0.23, 0.2, 0.56, P.navy, 1.97, 0.04, 0.49);
	const tail = prism(
		[
			[-0.2, 0.9],
			[-1, 1.43],
			[-1, 1.69],
			[0, 1.38],
			[1, 1.69],
			[1, 1.43],
			[0.2, 0.9],
		],
		0.12,
		color,
	);
	tail.position.y = 0.19;
	body.add(tail);
	box(body, 0.12, 0.64, 0.7, P.cream, 0, 0.42, 1.18);
	const canopy = mesh(new THREE.SphereGeometry(0.44, 8, 5), P.navy);
	canopy.scale.set(0.72, 0.67, 1.4);
	canopy.position.set(0, 0.34, -0.13);
	body.add(canopy);
	const glass = mesh(
		new THREE.SphereGeometry(0.25, 6, 4),
		0xa9e5da,
		false,
		true,
	);
	glass.scale.set(0.65, 0.35, 1.1);
	glass.position.set(-0.09, 0.59, -0.21);
	body.add(glass);
	box(body, 0.14, 0.04, 0.46, P.cream, 0, 0.3, -1.1);
	const nose = mesh(new THREE.ConeGeometry(0.33, 0.48, 8), P.cream);
	nose.rotation.x = -Math.PI / 2;
	nose.position.z = -1.82;
	body.add(nose);
	const prop = new THREE.Group();
	prop.name = "propeller";
	prop.position.set(0, 0, -2.03);
	body.add(prop);
	box(prop, 1.2, 0.09, 0.075, P.navy);
	box(prop, 0.09, 1.2, 0.075, P.navy);
	const flame = mesh(
		new THREE.ConeGeometry(0.21, 0.7, 7),
		0xffdb77,
		false,
		true,
	);
	flame.name = "thrust";
	flame.rotation.x = Math.PI / 2;
	flame.position.set(0, -0.04, 1.84);
	body.add(flame);
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.35, 0.025, 4, 20),
		mat(P.cream, true),
	);
	ring.position.z = -0.95;
	ring.rotation.x = Math.PI / 2;
	body.add(ring);
	shadow(group, 1.8, 1.3);
	const mixer = new THREE.AnimationMixer(group);
	const clip = new THREE.AnimationClip("Cruise", 0.8, [
		new THREE.NumberKeyframeTrack(
			"propeller.rotation[z]",
			[0, 0.8],
			[0, Math.PI * 12],
		),
		new THREE.NumberKeyframeTrack(
			"thrust.scale[y]",
			[0, 0.2, 0.4, 0.6, 0.8],
			[1, 1.3, 0.8, 1.2, 1],
		),
		new THREE.NumberKeyframeTrack(
			"airframe.position[y]",
			[0, 0.4, 0.8],
			[0, 0.07, 0],
		),
	]);
	mixer.clipAction(clip).play();
	group.userData.airframe = body;
	group.userData.flame = flame;
	return { group, mixer };
}

export function makeGhost(color = 0x89ddd9) {
	const { group, mixer } = makePlane(color);
	group.traverse((o) => {
		if (o.isMesh) {
			o.material = o.material.clone();
			o.material.transparent = true;
			o.material.opacity = 0.6;
			o.material.depthWrite = false;
		}
	});
	group.userData.mixer = mixer;
	return group;
}

function boat() {
	const g = new THREE.Group();
	g.add(
		prism(
			[
				[-0.75, 1.55],
				[-0.94, -0.6],
				[0, -1.7],
				[0.94, -0.6],
				[0.75, 1.55],
			],
			0.48,
			P.navy,
		),
	);
	const deck = prism(
		[
			[-0.59, 1.4],
			[-0.75, -0.55],
			[0, -1.4],
			[0.75, -0.55],
			[0.59, 1.4],
		],
		0.12,
		P.cream,
	);
	deck.position.y = 0.3;
	g.add(deck);
	box(g, 1.05, 0.5, 1.0, P.red, 0, 0.56, 0.45);
	box(g, 0.8, 0.25, 0.45, P.navy, 0, 0.9, 0.36);
	cylinder(g, 0.25, 0.3, 0.27, P.navy, 0, 0.53, -0.65);
	beam(g, [0, 0.64, -0.65], [0, 0.64, -1.5], 0.09, P.ink);
	beam(g, [-0.66, 0.45, 0.1], [-0.66, 0.45, 1.3], 0.035, P.ink);
	beam(g, [0.66, 0.45, 0.1], [0.66, 0.45, 1.3], 0.035, P.ink);
	return g;
}
function helicopter() {
	const g = new THREE.Group();
	const hull = mesh(new THREE.SphereGeometry(0.7, 8, 5), 0xe8bd5e);
	hull.scale.set(1, 0.75, 1.5);
	hull.position.y = 0.8;
	g.add(hull);
	const glass = mesh(new THREE.SphereGeometry(0.53, 8, 4), P.navy);
	glass.scale.set(1, 0.75, 0.9);
	glass.position.set(0, 0.96, -0.6);
	g.add(glass);
	const tail = mesh(new THREE.ConeGeometry(0.25, 2.0, 5), P.red);
	tail.rotation.x = Math.PI / 2;
	tail.position.set(0, 0.75, 1.6);
	g.add(tail);
	box(g, 0.1, 0.6, 0.6, P.navy, 0, 1, 2.4);
	beam(g, [0, 1, 0], [0, 1.65, 0], 0.08, P.ink);
	const rotor = new THREE.Group();
	rotor.position.y = 1.65;
	g.add(rotor);
	box(rotor, 3.8, 0.065, 0.18, P.ink);
	box(rotor, 0.18, 0.065, 3.8, P.ink);
	for (const x of [-0.58, 0.58]) {
		beam(g, [x, 0.26, -0.55], [x, 0.26, 0.8], 0.07, P.cream);
		beam(g, [x, 0.26, 0.1], [x, 0.61, 0.1], 0.05, P.ink);
	}
	g.userData.rotor = rotor;
	shadow(g, 1.5, 1.2, -0.65);
	return g;
}
function fuel() {
	const g = new THREE.Group();
	box(g, 2.25, 0.16, 3.2, P.cream, 0, 0.04, 0);
	box(g, 2.0, 0.06, 2.95, 0x4ea984, 0, 0.16, 0);
	for (const x of [-0.63, 0.63])
		cylinder(g, 0.29, 0.29, 0.9, P.sand, x, 0.63, 0.4, 8);
	box(g, 1.3, 0.65, 0.85, 0xeff5c9, 0, 0.55, -0.55);
	box(g, 0.35, 0.06, 0.95, P.red, 0, 0.91, -0.55);
	box(g, 0.95, 0.06, 0.35, P.red, 0, 0.92, -0.55);
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(1.45, 0.06, 5, 28),
		mat(P.cream, true),
	);
	ring.rotation.x = -Math.PI / 2;
	ring.position.y = 0.23;
	g.add(ring);
	g.userData.ring = ring;
	for (const x of [-1, 1]) {
		box(g, 0.08, 1.5, 0.08, P.ink, x, 0.85, -1.3);
		box(g, 0.32, 0.3, 0.03, P.sand, x, 1.5, -1.3);
	}
	return g;
}
function bridge() {
	const g = new THREE.Group();
	box(g, 20, 0.42, 2.6, P.cream, 0, 0.2, 0);
	box(g, 20, 0.07, 1.6, P.navy, 0, 0.44, 0);
	for (let x = -9; x < 10; x += 2)
		box(g, 0.85, 0.025, 0.06, P.cream, x, 0.49, 0, false);
	for (const z of [-1.25, 1.25]) {
		beam(g, [-10, 0.45, z], [10, 0.45, z], 0.075, P.ink);
		beam(g, [-10, 1.8, z], [10, 1.8, z], 0.09, P.red);
		for (let x = -10; x < 10; x += 2) {
			beam(g, [x, 0.45, z], [x + 1, 1.8, z], 0.07, P.red);
			beam(g, [x + 1, 1.8, z], [x + 2, 0.45, z], 0.07, P.red);
		}
	}
	for (const x of [-8, 8]) box(g, 0.75, 1.2, 3.2, P.sand, x, -0.3, 0);
	box(g, 2.2, 0.75, 1.8, P.red, 0, 0.91, 0);
	box(g, 0.3, 0.04, 1.4, P.cream, 0, 1.31, 0);
	box(g, 1.6, 0.04, 0.3, P.cream, 0, 1.32, 0);
	return g;
}
function turret() {
	const g = new THREE.Group();
	cylinder(g, 0.85, 1.05, 0.35, P.sand, 0, 0.2, 0, 8);
	cylinder(g, 0.63, 0.73, 0.5, P.navy, 0, 0.6, 0, 8);
	const gun = new THREE.Group();
	g.add(gun);
	cylinder(g, 0.42, 0.5, 0.4, P.red, 0, 0.97, 0);
	beam(g, [0, 1.05, 0], [0, 1.05, 1.3], 0.13, P.ink);
	g.userData.turret = gun;
	return g;
}
function boss() {
	const g = new THREE.Group();
	g.add(
		prism(
			[
				[-2.5, 3.6],
				[-2.9, -2.4],
				[-1.6, -4.1],
				[1.6, -4.1],
				[2.9, -2.4],
				[2.5, 3.6],
			],
			0.75,
			P.navy,
		),
	);
	const deck = prism(
		[
			[-2.15, 3.35],
			[-2.45, -2.3],
			[-1.35, -3.6],
			[1.35, -3.6],
			[2.45, -2.3],
			[2.15, 3.35],
		],
		0.18,
		0xe5bd67,
	);
	deck.position.y = 0.5;
	g.add(deck);
	box(g, 2.9, 0.85, 2.25, P.red, 0, 1, -0.8);
	box(g, 2.4, 0.6, 1.3, P.cream, 0, 1.7, -0.8);
	box(g, 2.15, 0.3, 0.45, P.navy, 0, 1.94, -1.26);
	for (const x of [-1.5, 1.5]) {
		const t = turret();
		t.scale.setScalar(0.9);
		t.position.set(x, 0.53, 1.75);
		g.add(t);
		box(g, 0.45, 0.2, 1.3, 0xffd87e, x, 0.65, 3);
	}
	const mast = new THREE.Group();
	mast.position.set(0, 2, -0.5);
	g.add(mast);
	beam(mast, [0, 0, 0], [0, 1.8, 0], 0.08, P.ink);
	const radar = box(mast, 1.8, 0.45, 0.12, P.cream, 0, 1.7, 0);
	g.userData.radar = radar;
	for (const x of [-2.6, 2.6]) {
		box(g, 0.5, 0.5, 5.5, P.red, x, 0.5, 0);
		for (let z = -2; z < 3; z++) box(g, 0.54, 0.1, 0.32, P.cream, x, 0.8, z);
	}
	return g;
}

export function makeEntity(type) {
	if (type === "boat") return boat();
	if (type === "heli") return helicopter();
	if (type === "fuel") return fuel();
	if (type === "bridge") return bridge();
	if (type === "turret") return turret();
	if (type === "boss") return boss();
	const g = new THREE.Group();
	if (type === "bullet") {
		const m = box(g, 0.14, 0.16, 1.0, 0xfff4bc, 0, 0, 0, false);
		m.material = mat(0xfff4bc, true);
		box(g, 0.35, 0.1, 0.32, 0xffae54, 0, 0, 0.4, false);
	} else if (type === "enemyBullet") {
		const m = mesh(new THREE.OctahedronGeometry(0.22), 0xffd677, false, true);
		g.add(m);
	}
	return g;
}

function tree(seed = 0) {
	const g = new THREE.Group();
	cylinder(g, 0.13, 0.19, 1.4, 0x8a7054, 0, 0.5, 0, 5);
	const colors = [0x3d806b, 0x4e9674, 0x6aaa7c];
	for (let j = 0; j < 2; j++) {
		const crown = mesh(
			new THREE.IcosahedronGeometry(0.9 - j * 0.17, 0),
			colors[(seed + j) % 3],
		);
		crown.scale.set(1, 1.15, 1);
		crown.position.set(j * 0.12, 1.65 + j * 0.65, 0);
		g.add(crown);
	}
	return g;
}
function rock(seed) {
	const g = new THREE.Group();
	const m = mesh(
		new THREE.IcosahedronGeometry(1, 0),
		seed % 2 ? 0xe4a65d : 0xf1bd71,
	);
	m.scale.set(1.3 + (seed % 3) * 0.4, 0.6 + (seed % 4) * 0.3, 0.9);
	m.rotation.y = seed;
	g.add(m);
	const top = mesh(new THREE.IcosahedronGeometry(0.65, 0), 0x89a976);
	top.scale.set(1.3, 0.35, 0.9);
	top.position.y = 0.6 + (seed % 4) * 0.21;
	g.add(top);
	return g;
}
function canyonRock(seed) {
	const g = new THREE.Group();
	// Broad, stratified sandstone buttes grow beside Needle Bend. Their entire
	// footprint remains outside the inked collision bank.
	const layers = [
		[1.22, 1.52, 1.18, 0xd48762, 0.59],
		[1.08, 1.22, 0.34, 0xffd18c, 1.35],
		[0.93, 1.08, 0.92, 0xe49b6c, 1.98],
		[0.84, 0.93, 0.25, 0xffdf9c, 2.56],
		[0.68, 0.84, 0.62, 0xb8705a, 3.0],
	];
	for (const [r1, r2, h, color, y] of layers)
		cylinder(g, r1, r2, h, color, 0, y, 0, 5);
	const cap = mesh(
		new THREE.IcosahedronGeometry(0.8, 0),
		seed % 3 ? 0x91aa75 : 0xe9b67d,
	);
	cap.scale.set(1.05, 0.34, 0.9);
	cap.position.y = 3.33;
	g.add(cap);
	return g;
}
function pylon() {
	const g = new THREE.Group();
	for (const x of [-0.4, 0.4])
		for (const z of [-0.35, 0.35])
			beam(g, [x, 0, z], [x * 0.4, 3.2, z * 0.4], 0.045, P.ink);
	for (let y = 0.5; y < 3; y += 0.7) {
		beam(g, [-0.4, y, -0.35], [0.4, y + 0.6, -0.35], 0.03, P.ink);
		beam(g, [0.4, y, 0.35], [-0.4, y + 0.6, 0.35], 0.03, P.ink);
	}
	box(g, 2.3, 0.09, 0.09, P.ink, 0, 2.75, 0);
	for (const x of [-0.9, 0.9])
		cylinder(g, 0.13, 0.13, 0.27, P.cream, x, 2.9, 0, 6);
	return g;
}

class Ribbon {
	constructor(scene, steps, color, unlit = false) {
		this.steps = steps;
		this.positions = new Float32Array(steps * 18);
		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(this.positions, 3),
		);
		const normals = new Float32Array(steps * 18);
		for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
		this.geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
		this.mesh = new THREE.Mesh(this.geometry, mat(color, unlit));
		this.mesh.receiveShadow = !unlit;
		this.mesh.frustumCulled = false;
		scene.add(this.mesh);
	}
	update(sample, z0, step) {
		const a = this.positions;
		for (let i = 0; i < this.steps; i++) {
			const z = z0 + i * step,
				p = sample(z),
				q = sample(z + step),
				j = i * 18;
			if (p[0] > p[1]) {
				[p[0], p[1]] = [p[1], p[0]];
				[p[2], p[3]] = [p[3], p[2]];
			}
			if (q[0] > q[1]) {
				[q[0], q[1]] = [q[1], q[0]];
				[q[2], q[3]] = [q[3], q[2]];
			}
			a.set(
				[
					p[0],
					p[2],
					z,
					q[0],
					q[2],
					z + step,
					q[1],
					q[3],
					z + step,
					p[0],
					p[2],
					z,
					q[1],
					q[3],
					z + step,
					p[1],
					p[3],
					z,
				],
				j,
			);
		}
		this.geometry.attributes.position.needsUpdate = true;
	}
}

export class WorldView {
	constructor(scene) {
		this.scene = scene;
		this.effects = [];
		this.time = 0;
		this.progress = 0;
		this.ribbons = [];
		const steps = 96;
		const add = (color, sample, unlit = false) =>
			this.ribbons.push({ r: new Ribbon(scene, steps, color, unlit), sample });
		add(P.water, (r) => [r.center - r.width, r.center + r.width, 0, 0], true);
		for (const side of [-1, 1]) {
			const edge = (r) => r.center + side * r.width;
			add(0x279d98, (r) => [edge(r) - side * 0.7, edge(r), 0.012, 0.012], true);
			add(P.ink, (r) => [edge(r), edge(r) + side * 0.12, 0.025, 0.025], true);
			add(P.sand, (r) => [
				edge(r) + side * 0.12,
				edge(r) + side * 0.8,
				0.1,
				0.13,
			]);
			add(0xcd9158, (r) => [
				edge(r) + side * 0.8,
				edge(r) + side * 1.15,
				0.13,
				0.75,
			]);
			add(
				P.ink,
				(r) => [edge(r) + side * 1.15, edge(r) + side * 1.25, 0.76, 0.76],
				true,
			);
			add(0x8bb57d, (r) => [
				edge(r) + side * 1.25,
				edge(r) + side * 3.2,
				0.78,
				0.78,
			]);
			add(0x78a571, (r) => [edge(r) + side * 3.2, side * 75, 0.8, 0.8]);
		}
		this.props = [];
		for (let i = 0; i < 68; i++) {
			const seed = i % 17;
			const obj =
				seed % 8 === 0 ? pylon() : seed % 3 === 0 ? rock(seed) : tree(seed);
			scene.add(obj);
			this.props.push({ obj, slot: i });
		}
		this.cliffs = [];
		for (let i = 0; i < 24; i++) {
			const obj = canyonRock(i);
			scene.add(obj);
			this.cliffs.push({ obj, slot: i });
		}
		this.foams = [];
		for (let i = 0; i < 100; i++) {
			const f = new THREE.Mesh(
				new THREE.PlaneGeometry(0.045, 0.55 + (i % 5) * 0.22),
				mat(i % 3 ? 0x4eb7af : 0x8bd6c9, true),
			);
			f.rotation.x = -Math.PI / 2;
			f.position.y = 0.024;
			scene.add(f);
			this.foams.push(f);
		}
		this.clouds = [];
		for (let i = 0; i < 7; i++) {
			const cloud = new THREE.Group();
			for (let j = 0; j < 3; j++) {
				const m = mesh(
					new THREE.IcosahedronGeometry(1.7, 1),
					0xfff1cd,
					false,
					true,
				);
				m.scale.set(1.5, 0.32, 1);
				m.position.x = j * 1.5;
				cloud.add(m);
			}
			cloud.position.y = 8 + i * 0.3;
			scene.add(cloud);
			this.clouds.push(cloud);
		}
	}
	render(progress, time) {
		this.progress = progress;
		this.time = time;
		for (const { r, sample } of this.ribbons)
			r.update((z) => sample(river(progress - z + 5)), -106, 1.5);
		const first = Math.floor(progress / 5) * 5;
		for (const { obj, slot } of this.props) {
			const side = slot % 2 === 0 ? -1 : 1,
				at = first + (Math.floor(slot / 2) - 4) * 5;
			const v = river(at),
				noise = Math.sin(at * 1.732 + side * 8),
				off = 2.7 + (noise + 1) * 3.2;
			obj.position.set(
				v.center + side * (v.width + off),
				0.9,
				5 - (at - progress),
			);
			obj.rotation.y = Math.sin(at) * 2;
			obj.scale.setScalar(0.8 + (Math.sin(at * 0.73) + 1) * 0.3);
		}
		const cliffFirst = Math.floor(progress / 11) * 11;
		for (const { obj, slot } of this.cliffs) {
			const side = slot % 2 === 0 ? -1 : 1,
				at = cliffFirst + (Math.floor(slot / 2) - 2) * 11;
			const v = river(at),
				canyon = canyonAmount(at),
				noise = (Math.sin(at * 0.43) + 1) * 0.5;
			obj.position.set(
				v.center + side * (v.width + 3.25 + noise * 2),
				0.8,
				5 - (at - progress),
			);
			obj.rotation.y = Math.sin(at * 0.14) * 1.2;
			obj.scale.set(
				1.05 + noise * 0.5,
				0.16 + canyon * (0.95 + noise * 0.55),
				1.1 + noise * 0.35,
			);
		}
		for (let i = 0; i < this.foams.length; i++) {
			const at = first + (i - 17) * 1.25 + ((time * 0.5) % 1.25),
				v = river(at);
			this.foams[i].position.set(
				v.center + Math.sin(i * 71.7) * (v.width - 0.8),
				0.025,
				5 - (at - progress),
			);
			this.foams[i].scale.y = 1 + Math.sin(time * 2 + i) * 0.2;
		}
		for (let i = 0; i < this.clouds.length; i++) {
			const at = first + (i - 1) * 21;
			this.clouds[i].position.x =
				river(at).center + (i % 2 ? 21 : -25) + Math.sin(time * 0.05 + i) * 4;
			this.clouds[i].position.z = 5 - (at - progress);
		}
	}
	makeBurst(x, z, color = 0xf9c66e) {
		const g = new THREE.Group();
		g.position.set(x, 0.9, z);
		this.scene.add(g);
		for (let i = 0; i < 16; i++) {
			const m = mesh(
				new THREE.OctahedronGeometry(0.18 + (i % 3) * 0.12),
				i % 3 ? color : P.cream,
				false,
				true,
			);
			g.add(m);
			m.userData.velocity = new THREE.Vector3(
				Math.cos(i * 2.399) * (0.8 + i * 0.15),
				1 + (i % 4),
				Math.sin(i * 2.399) * (0.8 + i * 0.15),
			);
		}
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.45, 0.06, 4, 20),
			mat(P.cream, true),
		);
		ring.rotation.x = -Math.PI / 2;
		g.add(ring);
		this.effects.push({ g, life: 0, ring });
		return g;
	}
	updateEffects(dt) {
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const e = this.effects[i];
			e.life += dt;
			for (const m of e.g.children) {
				if (m.userData.velocity) {
					m.position.addScaledVector(m.userData.velocity, dt);
					m.userData.velocity.y -= dt * 6;
					m.rotation.x += dt * 4;
					m.rotation.z += dt * 2;
					m.scale.setScalar(Math.max(0.01, 1 - e.life));
				}
			}
			e.ring.scale.setScalar(1 + e.life * 7);
			e.ring.visible = e.life < 0.55;
			if (e.life > 1) {
				this.scene.remove(e.g);
				e.g.traverse((o) => {
					if (o.isMesh) o.geometry.dispose();
				});
				this.effects.splice(i, 1);
			}
		}
		return this.effects.length;
	}
	river(progress) {
		return river(progress);
	}
}
