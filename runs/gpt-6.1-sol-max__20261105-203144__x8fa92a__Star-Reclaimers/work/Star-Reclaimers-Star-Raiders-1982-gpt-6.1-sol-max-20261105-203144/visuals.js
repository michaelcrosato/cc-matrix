import * as THREE from "three/webgpu";

export { THREE };
export const C = {
	ink: 0x0c1424,
	paper: 0xe8e2c6,
	yellow: 0xffd879,
	cyan: 0x78d7c6,
	red: 0xd87560,
	purple: 0x776186,
	navy: 0x273449,
};
const materials = new Map();
export function toon(color, extra = {}) {
	const key = color + JSON.stringify(extra);
	if (!materials.has(key))
		materials.set(
			key,
			Object.assign(new THREE.MeshToonNodeMaterial({ color, ...extra }), {
				flatShading: true,
			}),
		);
	const mat = materials.get(key);
	mat.userData.shared = true;
	return mat;
}
const inkMat = new THREE.MeshBasicNodeMaterial({
	color: C.ink,
	side: THREE.BackSide,
});
inkMat.userData.shared = true;
export function solid(
	geo,
	color,
	pos = [0, 0, 0],
	scale = [1, 1, 1],
	outline = true,
) {
	const m = new THREE.Mesh(geo, toon(color));
	m.position.set(...pos);
	m.scale.set(...scale);
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline) {
		const line = new THREE.Mesh(geo, inkMat);
		line.scale.setScalar(1.045);
		m.add(line);
	}
	return m;
}
export function glow(geo, color, pos = [0, 0, 0], opacity = 1) {
	const m = new THREE.Mesh(
		geo,
		new THREE.MeshBasicNodeMaterial({
			color,
			transparent: opacity < 1,
			opacity,
			depthWrite: opacity === 1,
		}),
	);
	m.position.set(...pos);
	return m;
}
function box(group, color, pos, size) {
	const mesh = solid(new THREE.BoxGeometry(...size), color, pos);
	group.add(mesh);
	return mesh;
}
function beam(group, a, b, r, color) {
	const av = new THREE.Vector3(...a),
		bv = new THREE.Vector3(...b),
		dir = bv.clone().sub(av);
	const m = solid(
		new THREE.CylinderGeometry(r, r, dir.length(), 5),
		color,
		av.add(bv).multiplyScalar(0.5).toArray(),
	);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
	group.add(m);
	return m;
}
function wingGeometry(sign = 1) {
	const a = [
		0,
		0,
		-12,
		sign * 22,
		-1,
		8,
		sign * 18,
		0,
		13,
		sign * 3,
		2,
		8,
		0,
		1,
		-12,
		sign * 22,
		0,
		8,
		sign * 18,
		1,
		13,
		sign * 3,
		3,
		8,
	];
	const idx = [
		0, 1, 2, 0, 2, 3, 4, 7, 6, 4, 6, 5, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2,
		6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
	];
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
export function ship(kind = "fighter", friendly = false) {
	const root = new THREE.Group(),
		base = friendly ? C.paper : kind === "bomber" ? 0xa79eb9 : C.red;
	const hull = solid(
		new THREE.ConeGeometry(5, 28, 4),
		base,
		[0, 0, 0],
		[1, 1, 1],
	);
	hull.rotation.x = -Math.PI / 2;
	root.add(hull);
	for (const s of [-1, 1]) {
		const wing = solid(wingGeometry(s), base);
		root.add(wing);
		box(root, C.ink, [s * 11, 1, 5], [3, 2, 13]);
		box(root, friendly ? C.cyan : C.yellow, [s * 18, 1.4, 8], [4, 0.5, 3]);
		const barrel = solid(new THREE.CylinderGeometry(0.6, 0.9, 16, 6), C.paper, [
			s * 10,
			0,
			-4,
		]);
		barrel.rotation.x = Math.PI / 2;
		root.add(barrel);
		const engine = glow(new THREE.ConeGeometry(2.2, 9, 6), C.cyan, [
			s * 4,
			0,
			16,
		]);
		engine.rotation.x = Math.PI / 2;
		engine.name = "exhaust" + (s < 0 ? "L" : "R");
		root.add(engine);
	}
	const canopy = solid(
		new THREE.IcosahedronGeometry(4, 0),
		C.navy,
		[0, 3, -2],
		[0.9, 0.6, 1.7],
	);
	root.add(canopy);
	const core = glow(new THREE.OctahedronGeometry(2), C.yellow, [0, 4, 5]);
	core.name = "core";
	root.add(core);
	if (kind === "bomber") {
		root.scale.setScalar(1.4);
		box(root, 0x645a72, [0, -2, 8], [14, 9, 11]);
		for (const s of [-1, 1]) box(root, C.paper, [s * 19, -1, 7], [6, 5, 15]);
	}
	const mix = new THREE.AnimationMixer(root);
	const clip = new THREE.AnimationClip("reactor-breath", 1.4, [
		new THREE.VectorKeyframeTrack(
			"core.scale",
			[0, 0.7, 1.4],
			[1, 1, 1, 1.35, 1.35, 1.35, 1, 1, 1],
		),
		new THREE.VectorKeyframeTrack(
			"exhaustL.scale",
			[0, 0.35, 0.7, 1.05, 1.4],
			[1, 1, 1, 1, 1.25, 1, 1, 0.8, 1, 1, 1.2, 1, 1, 1, 1],
		),
		new THREE.VectorKeyframeTrack(
			"exhaustR.scale",
			[0, 0.7, 1.4],
			[1, 1, 1, 1, 1.35, 1, 1, 1, 1],
		),
	]);
	mix.clipAction(clip).play();
	root.userData.mixer = mix;
	return root;
}
export function station() {
	const root = new THREE.Group();
	const ring = new THREE.Group();
	ring.name = "orbital";
	root.add(ring);
	ring.add(solid(new THREE.TorusGeometry(73, 4.2, 6, 64), C.paper));
	ring.add(solid(new THREE.TorusGeometry(61, 2, 5, 48), C.navy));
	for (let i = 0; i < 8; i++) {
		const a = (i * Math.PI) / 4,
			x = Math.cos(a) * 73,
			y = Math.sin(a) * 73;
		const pod = box(ring, i % 2 ? C.navy : C.red, [x, y, 0], [18, 12, 17]);
		pod.rotation.z = a;
		ring.add(glow(new THREE.BoxGeometry(8, 2, 1), C.cyan, [x, y, 9]));
		if (i % 2 === 0) beam(ring, [0, 0, 0], [x, y, 0], 2.4, C.navy);
	}
	root.add(
		solid(new THREE.CylinderGeometry(16, 20, 61, 8), C.paper, [0, 0, 0]),
	);
	box(root, C.navy, [0, 0, 16], [30, 23, 19]);
	const dock = glow(
		new THREE.TorusGeometry(19, 1.1, 6, 32),
		C.cyan,
		[0, 0, 33],
	);
	root.add(dock);
	const disk = solid(
		new THREE.CylinderGeometry(24, 24, 3, 8),
		C.navy,
		[0, 31, 0],
	);
	root.add(disk);
	beam(root, [0, 30, 0], [0, 82, 0], 1.5, C.paper);
	root.add(glow(new THREE.OctahedronGeometry(4), C.red, [0, 84, 0]));
	for (let i = 0; i < 4; i++) {
		const solar = box(
			root,
			0x304b63,
			[i % 2 ? -110 : 110, 10 + (i > 1 ? 28 : -28), -10],
			[48, 18, 2],
		);
		for (let j = 0; j < 4; j++)
			box(solar, 0x89a5af, [-18 + j * 12, 0, 1.1], [0.35, 17, 0.4]);
	}
	const mixer = new THREE.AnimationMixer(root);
	mixer
		.clipAction(
			new THREE.AnimationClip("station-orbit", 30, [
				new THREE.NumberKeyframeTrack(
					"orbital.rotation[z]",
					[0, 30],
					[0, Math.PI * 2],
				),
			]),
		)
		.play();
	root.userData.mixer = mixer;
	return root;
}
export function flagship() {
	const root = new THREE.Group();
	const hull = solid(new THREE.ConeGeometry(42, 200, 6), 0x9a7b91);
	hull.rotation.x = -Math.PI / 2;
	root.add(hull);
	box(root, C.ink, [0, -7, 22], [79, 22, 100]);
	box(root, C.paper, [0, 18, 30], [22, 25, 80]);
	for (const s of [-1, 1]) {
		const w = solid(wingGeometry(s), C.purple, [s * 14, -8, 10], [3.6, 3, 3.6]);
		root.add(w);
		box(root, C.red, [s * 73, -5, 35], [20, 18, 85]);
		root.add(
			glow(new THREE.CylinderGeometry(8, 8, 1, 12), C.cyan, [s * 73, -5, 79]),
		);
		box(root, C.yellow, [s * 48, 8, -18], [8, 4, 45]);
		const ring = glow(
			new THREE.TorusGeometry(19, 1.5, 6, 32),
			C.cyan,
			[s * 67, 14, -23],
			0.7,
		);
		ring.name = s < 0 ? "relayL" : "relayR";
		root.add(ring);
	}
	const rotor = solid(
		new THREE.TorusGeometry(32, 3, 5, 32),
		C.paper,
		[0, 24, 38],
	);
	rotor.name = "crown";
	root.add(rotor);
	root.add(glow(new THREE.OctahedronGeometry(11), C.yellow, [0, 24, 38]));
	const m = new THREE.AnimationMixer(root);
	m.clipAction(
		new THREE.AnimationClip("command-array", 12, [
			new THREE.NumberKeyframeTrack(
				"crown.rotation[z]",
				[0, 12],
				[0, Math.PI * 2],
			),
		]),
	).play();
	root.userData.mixer = m;
	return root;
}
export function asteroid(radius, rng) {
	const geo = new THREE.DodecahedronGeometry(radius, 0);
	const p = geo.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const f = 0.85 + rng() * 0.3;
		p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
	}
	geo.computeVertexNormals();
	const root = solid(
		geo,
		[0x6d5a72, 0x5a6676, 0x9b7d7b][Math.floor(rng() * 3)],
	);
	const lines = new THREE.LineSegments(
		new THREE.EdgesGeometry(geo, 15),
		new THREE.LineBasicNodeMaterial({ color: 0x322b42 }),
	);
	root.add(lines);
	return root;
}
export function createSky(rng) {
	const sky = new THREE.Group();
	const positions = [],
		colors = [];
	for (let i = 0; i < 3200; i++) {
		const z = rng() * 2 - 1,
			a = rng() * Math.PI * 2,
			r = 1700 + rng() * 300,
			s = Math.sqrt(1 - z * z);
		positions.push(Math.cos(a) * s * r, z * r, Math.sin(a) * s * r);
		const col = new THREE.Color([0xe7e0cb, 0x85bac2, 0xb59ebc][i % 3]);
		colors.push(col.r, col.g, col.b);
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	sky.add(
		new THREE.Points(
			geo,
			new THREE.PointsNodeMaterial({
				size: 2.1,
				sizeAttenuation: false,
				vertexColors: true,
			}),
		),
	);
	const planetGeo = new THREE.IcosahedronGeometry(290, 4);
	const p = planetGeo.attributes.position,
		cs = [];
	for (let i = 0; i < p.count; i += 3) {
		const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
		const x = p.getX(i);
		const band = Math.sin(y * 0.022 + x * 0.002) + 0.4 * Math.sin(y * 0.065);
		const col = new THREE.Color(
			band > 0.8 ? 0xe4a17c : band > -0.1 ? 0xc46f60 : 0x9e5261,
		);
		if (y > 190) col.setHex(0xe9b994);
		for (let j = 0; j < 3; j++) cs.push(col.r, col.g, col.b);
	}
	planetGeo.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3));
	const planet = new THREE.Mesh(
		planetGeo,
		Object.assign(new THREE.MeshToonNodeMaterial({ vertexColors: true }), {
			flatShading: true,
		}),
	);
	planet.position.set(540, 160, -1080);
	planet.rotation.z = -0.24;
	const outline = new THREE.Mesh(
		new THREE.IcosahedronGeometry(294, 4),
		new THREE.MeshBasicNodeMaterial({ color: 0x342c47, side: THREE.BackSide }),
	);
	planet.add(outline);
	sky.add(planet);
	const rings = new THREE.Group();
	rings.position.copy(planet.position);
	rings.rotation.set(1.1, 0.1, 0.34);
	for (let i = 0; i < 4; i++) {
		const torus = new THREE.Mesh(
			new THREE.TorusGeometry(385 + i * 11, 3.3 - i * 0.4, 3, 160),
			new THREE.MeshBasicNodeMaterial({
				color: [0xc69483, 0x5e526f, 0xc0a59b, 0x6b5e7b][i],
				transparent: true,
				opacity: 0.5,
			}),
		);
		rings.add(torus);
	}
	sky.add(rings);
	const c = document.createElement("canvas");
	c.width = c.height = 512;
	const ctx = c.getContext("2d");
	const gradient = ctx.createRadialGradient(260, 260, 10, 260, 260, 250);
	gradient.addColorStop(0, "#71638266");
	gradient.addColorStop(0.45, "#49446b44");
	gradient.addColorStop(1, "#1b233000");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 512, 512);
	const neb = new THREE.Mesh(
		new THREE.PlaneGeometry(2800, 1500),
		new THREE.MeshBasicNodeMaterial({
			map: new THREE.CanvasTexture(c),
			transparent: true,
			depthWrite: false,
			opacity: 0.8,
		}),
	);
	neb.position.set(-500, 70, -1500);
	sky.add(neb);
	const sun = glow(
		new THREE.SphereGeometry(14, 12, 8),
		0xffedbb,
		[-690, 280, -1300],
	);
	sky.add(sun);
	for (const len of [100, 45]) {
		const line = glow(
			new THREE.PlaneGeometry(len, len === 100 ? 1 : 2),
			0xffdc9b,
			[-690, 280, -1290],
			0.6,
		);
		if (len === 45) line.rotation.z = Math.PI / 2;
		sky.add(line);
	}
	return sky;
}
export function createCockpit(camera) {
	const root = new THREE.Group();
	root.name = "cockpit";
	camera.add(root);
	beam(root, [-3, -1.65, -3.3], [-1.85, 1.9, -2.7], 0.055, C.ink);
	beam(root, [3, -1.65, -3.3], [1.85, 1.9, -2.7], 0.055, C.ink);
	beam(root, [-3, -1.65, -3.3], [-1.85, 1.9, -2.7], 0.022, 0x75828b);
	beam(root, [3, -1.65, -3.3], [1.85, 1.9, -2.7], 0.022, 0x75828b);
	beam(root, [-2.4, -1.4, -2.7], [-0.7, -1.75, -2.7], 0.09, C.ink);
	beam(root, [2.4, -1.4, -2.7], [0.7, -1.75, -2.7], 0.09, C.ink);
	for (const s of [-1, 1]) {
		const panel = box(root, C.ink, [s * 1.9, -1.2, -2.8], [0.65, 0.45, 0.35]);
		panel.rotation.z = s * 0.18;
		for (let i = 0; i < 4; i++)
			panel.add(
				glow(
					new THREE.BoxGeometry(0.08, 0.015, 0.01),
					i === 0 ? C.yellow : C.cyan,
					[-0.18 + i * 0.12, 0, 0.18],
				),
			);
		const gun = box(root, C.navy, [s * 0.82, -0.7, -2], [0.16, 0.15, 0.8]);
		gun.name = s < 0 ? "gunL" : "gunR";
		gun.add(glow(new THREE.BoxGeometry(0.03, 0.02, 0.4), C.cyan, [0, 0.08, 0]));
	}
	const m = new THREE.AnimationMixer(root);
	const clip = new THREE.AnimationClip("twin-cannon-recoil", 0.15, [
		new THREE.NumberKeyframeTrack(
			"gunL.position[z]",
			[0, 0.035, 0.15],
			[-2, -1.85, -2],
		),
		new THREE.NumberKeyframeTrack(
			"gunR.position[z]",
			[0, 0.035, 0.15],
			[-2, -1.85, -2],
		),
	]);
	const action = m.clipAction(clip);
	action.setLoop(THREE.LoopOnce, 1);
	action.clampWhenFinished = true;
	root.userData = {
		mixer: m,
		recoil: () => {
			action.reset().play();
		},
	};
	return root;
}
export function explosion(scene, pos, scale, rng) {
	const root = new THREE.Group();
	root.position.copy(pos);
	const core = glow(new THREE.IcosahedronGeometry(scale, 1), C.yellow);
	root.add(core);
	const ring = glow(
		new THREE.TorusGeometry(scale * 1.1, scale * 0.055, 4, 32),
		C.paper,
		[0, 0, 0],
		0.9,
	);
	ring.rotation.x = rng() * Math.PI;
	root.add(ring);
	for (let i = 0; i < 10; i++) {
		const shard = solid(
			new THREE.TetrahedronGeometry(scale * (0.08 + rng() * 0.2)),
			i % 2 ? C.red : C.paper,
			[
				(rng() - 0.5) * scale * 3,
				(rng() - 0.5) * scale * 3,
				(rng() - 0.5) * scale * 3,
			],
		);
		root.add(shard);
	}
	const mix = new THREE.AnimationMixer(root);
	const clip = new THREE.AnimationClip("inkburst", 0.6, [
		new THREE.VectorKeyframeTrack(
			".scale",
			[0, 0.15, 0.6],
			[0.05, 0.05, 0.05, 1.5, 1.5, 1.5, 2.4, 2.4, 2.4],
		),
		new THREE.NumberKeyframeTrack(".rotation[z]", [0, 0.6], [0, 1.8]),
		new THREE.NumberKeyframeTrack("material.opacity", [0, 0.6], [1, 0]),
	]);
	clip.tracks.pop();
	mix.clipAction(clip).setLoop(THREE.LoopOnce, 1).play();
	scene.add(root);
	return { root, mix, life: 0.6, max: 0.6 };
}
export function holoShip(color = C.cyan) {
	const s = ship("fighter", true);
	s.scale.setScalar(0.7);
	s.traverse((o) => {
		if (o.isMesh) {
			o.material = new THREE.MeshBasicNodeMaterial({
				color,
				wireframe: true,
				transparent: true,
				opacity: 0.46,
				depthWrite: false,
			});
		}
	});
	return s;
}

export function release(root) {
	const geos = new Set(),
		mats = new Set();
	root.traverse((o) => {
		if (o.geometry) geos.add(o.geometry);
		if (o.material)
			for (const m of Array.isArray(o.material) ? o.material : [o.material])
				if (!m.userData.shared) mats.add(m);
	});
	root.userData.mixer?.stopAllAction();
	for (const geo of geos) geo.dispose();
	for (const mat of mats) mat.dispose();
}

export function resetGpuResources(scene) {
	const geos = new Set(),
		mats = new Set([...materials.values(), inkMat]);
	scene.traverse((o) => {
		if (o.geometry) geos.add(o.geometry);
		if (o.material)
			for (const m of Array.isArray(o.material) ? o.material : [o.material])
				mats.add(m);
	});
	for (const m of mats) m.dispose();
	for (const geo of geos) geo.dispose();
}
