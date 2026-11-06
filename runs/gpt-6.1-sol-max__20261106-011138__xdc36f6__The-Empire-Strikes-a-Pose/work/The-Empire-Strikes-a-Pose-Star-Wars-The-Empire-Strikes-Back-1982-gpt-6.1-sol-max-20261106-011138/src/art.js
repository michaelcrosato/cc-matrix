import * as T from "three/webgpu";
export const INK = 0x172b3c;
const palette = {
	paper: 0xe5ece2,
	snow: 0xd5e5e3,
	blue: 0x789cae,
	deep: 0x25485b,
	orange: 0xf09b5a,
	red: 0xf25d60,
	cyan: 0x8de9df,
};
const materials = new Map();
const bands = new T.DataTexture(
	new Uint8Array([
		60, 60, 60, 255, 135, 135, 135, 255, 210, 210, 210, 255, 255, 255, 255, 255,
	]),
	4,
	1,
	T.RGBAFormat,
);
bands.minFilter = bands.magFilter = T.NearestFilter;
bands.needsUpdate = true;
export function toon(c) {
	if (!materials.has(c))
		materials.set(c, new T.MeshToonMaterial({ color: c, gradientMap: bands }));
	return materials.get(c);
}
const inkMat = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
const geo = {
	box: new T.BoxGeometry(1, 1, 1),
	sphere: new T.IcosahedronGeometry(1, 1),
	oct: new T.OctahedronGeometry(1),
	cyl: new T.CylinderGeometry(1, 1, 1, 10),
	cone: new T.ConeGeometry(1, 1, 7),
};
export function piece(parent, kind, size, pos, color, outline = true) {
	const g = geo[kind] || kind;
	const m = new T.Mesh(g, toon(color));
	m.scale.set(...size);
	m.position.set(...pos);
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline) {
		const ink = new T.Mesh(g, inkMat);
		ink.scale.setScalar(1.035);
		m.add(ink);
	}
	parent.add(m);
	return m;
}
function box(p, s, v, c, o = true) {
	return piece(p, "box", s, v, c, o);
}
function wedgeGeo() {
	const g = new T.BufferGeometry();
	g.setAttribute(
		"position",
		new T.Float32BufferAttribute(
			[
				-1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, -0.65, 1, -0.7, 0.65, 1,
				-0.7, 0.4, 0, 1, -0.4, 0, 1,
			],
			3,
		),
	);
	g.setIndex([
		0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2,
		3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
	]);
	for (let i = 0; i < g.index.array.length; i += 3) {
		const a = g.index.array[i];
		g.index.array[i] = g.index.array[i + 2];
		g.index.array[i + 2] = a;
	}
	g.computeVertexNormals();
	return g;
}
const wedge = wedgeGeo();
function stripe(p, s, v, c = INK) {
	return box(p, s, v, c, false);
}
function engine(p, x, y, z, name, mixers) {
	const e = new T.Group();
	e.position.set(x, y, z);
	p.add(e);
	piece(e, "cyl", [0.85, 3, 0.85], [0, 0, 0], palette.deep).rotation.x =
		Math.PI / 2;
	piece(
		e,
		"cyl",
		[0.64, 0.2, 0.64],
		[0, 0, -1.55],
		palette.orange,
		false,
	).rotation.x = Math.PI / 2;
	const flame = piece(
		e,
		"cone",
		[0.6, 4, 0.6],
		[0, 0, -3.4],
		palette.cyan,
		false,
	);
	flame.name = name;
	flame.rotation.x = -Math.PI / 2;
	const mix = new T.AnimationMixer(e);
	mix
		.clipAction(
			new T.AnimationClip("ion flicker", 0.22, [
				new T.NumberKeyframeTrack(
					name + ".scale[y]",
					[0, 0.07, 0.14, 0.22],
					[3.5, 4.6, 3.7, 3.5],
				),
			]),
		)
		.play();
	mixers.push(mix);
	return e;
}
export function skimmer(mixers, color = palette.orange, ghost = false) {
	const g = new T.Group();
	g.name = "skimmer";
	piece(g, wedge, [2.2, 1.1, 4], [0, 0, 0.2], color);
	piece(g, wedge, [1.2, 0.65, 1.8], [0, 1.25, -0.4], palette.deep);
	const wing = piece(g, wedge, [6, 0.35, 2.6], [0, -0.3, -0.9], palette.paper);
	stripe(g, [1.2, 0.12, 3.5], [-4.1, 0.12, -0.5], color);
	stripe(g, [1.2, 0.12, 3.5], [4.1, 0.12, -0.5], color);
	for (const x of [-4.2, 4.2]) {
		engine(g, x, -0.1, -1.8, x < 0 ? "jetLeft" : "jetRight", mixers);
		const gun = piece(g, "cyl", [0.2, 4, 0.2], [x, 0.4, 2.1], INK);
		gun.rotation.x = Math.PI / 2;
		piece(
			g,
			"cyl",
			[0.33, 0.35, 0.33],
			[x, 0.4, 4.1],
			palette.orange,
		).rotation.x = Math.PI / 2;
	}
	stripe(g, [0.4, 0.15, 4], [0, -0.9, 2], palette.deep);
	piece(g, "oct", [0.9, 0.7, 0.9], [0, 1.9, -0.6], palette.paper);
	box(g, [0.6, 2.8, 1.8], [0, 0.9, -3.2], color);
	box(g, [1.8, 0.18, 0.15], [0, 1.4, 1.5], palette.cyan, false);
	if (ghost)
		g.traverse((m) => {
			if (m.isMesh) {
				m.material = m.material.clone();
				m.material.transparent = true;
				m.material.opacity = 0.52;
				m.castShadow = false;
			}
		});
	return g;
}
export function raider(mixers, ace = false) {
	const g = new T.Group();
	const c = ace ? palette.orange : palette.deep;
	piece(g, "sphere", [2, 2, 2.3], [0, 0, 0], c);
	piece(g, "sphere", [1.2, 1.2, 0.3], [0, 0, 2.15], INK);
	piece(
		g,
		"cyl",
		[0.65, 0.3, 0.65],
		[0, 0, 2.5],
		palette.red,
		false,
	).rotation.x = Math.PI / 2;
	for (const s of [-1, 1]) {
		box(g, [3, 0.5, 0.5], [s * 2.6, 0, 0], palette.blue);
		const wing = new T.Group();
		wing.position.x = s * 4;
		wing.name = "wing" + s;
		g.add(wing);
		const panel = piece(
			wing,
			new T.CylinderGeometry(3.5, 3.5, 0.35, 6),
			[1, 1, 1],
			[0, 0, 0],
			INK,
		);
		panel.rotation.z = Math.PI / 2;
		const edge = piece(
			wing,
			new T.CylinderGeometry(3.7, 3.7, 0.2, 6, true),
			[1, 1, 1],
			[0, 0, 0],
			palette.blue,
		);
		edge.rotation.z = Math.PI / 2;
		for (let a = 0; a < 3; a++) {
			const brace = box(wing, [0.4, 0.22, 6.4], [0, 0, 0], c);
			brace.rotation.x = (a * Math.PI) / 3;
		}
	}
	if (ace) {
		box(g, [7, 0.25, 2], [0, 2.5, 0], palette.red);
		box(g, [0.3, 4, 3], [0, 3, 0], palette.deep);
	}
	const mix = new T.AnimationMixer(g);
	mix
		.clipAction(
			new T.AnimationClip("cold idle", 2.4, [
				new T.NumberKeyframeTrack(
					".rotation[z]",
					[0, 0.6, 1.2, 1.8, 2.4],
					[0, 0.06, 0, -0.06, 0],
				),
			]),
		)
		.play();
	mixers.push(mix);
	return g;
}
export function walker(mixers, index = 0) {
	const root = new T.Group();
	root.name = "walker" + index;
	const p = new T.Group();
	p.name = "body";
	p.position.y = 21;
	root.add(p);
	piece(p, wedge, [7, 5, 11], [0, 0, 0], palette.blue);
	box(p, [12, 6.3, 18], [0, -0.3, 0], palette.paper);
	box(p, [13.6, 0.6, 17], [0, 3, 0], palette.snow);
	for (const side of [-1, 1]) {
		for (let z = -6; z <= 6; z += 4)
			box(p, [0.2, 3.3, 2.7], [side * 6.15, -0.1, z], palette.blue);
		box(p, [0.25, 0.5, 16], [side * 6.3, 2.7, 0], INK);
		box(p, [0.3, 1.2, 2.7], [side * 6.4, -2.7, 0], palette.orange);
	}
	box(p, [7.5, 4, 5], [0, -0.5, 11], palette.deep);
	const head = piece(p, wedge, [4.8, 3, 4.2], [0, -0.7, 15.3], palette.paper);
	box(p, [8.3, 0.7, 0.4], [0, -0.1, 19.4], INK);
	box(p, [5, 0.18, 0.45], [0, -0.05, 19.65], palette.red, false);
	for (const s of [-1, 1]) {
		const gun = piece(
			p,
			"cyl",
			[0.4, 6, 0.4],
			[s * 2.7, -2.7, 20],
			palette.deep,
		);
		gun.rotation.x = Math.PI / 2;
		piece(
			p,
			"cyl",
			[1.1, 0.3, 1.1],
			[s * 4.9, -1, 15],
			palette.orange,
		).rotation.z = Math.PI / 2;
	}
	box(p, [0.3, 5, 0.3], [3, 6, -5], INK);
	piece(p, "sphere", [0.6, 0.6, 0.6], [3, 8.6, -5], palette.orange);
	const tracks = [];
	for (let i = 0; i < 4; i++) {
		const s = i < 2 ? -1 : 1,
			z = i % 2 ? -6.2 : 6.2;
		const leg = new T.Group();
		leg.position.set(s * 5, -2, z);
		leg.name = "leg" + i;
		p.add(leg);
		piece(
			leg,
			"cyl",
			[1.6, 1.8, 1.6],
			[s * 0.8, 0, 0],
			palette.deep,
		).rotation.z = Math.PI / 2;
		box(leg, [1.7, 7.5, 2], [s * 0.9, -4, 0], palette.blue);
		piece(
			leg,
			"cyl",
			[1.5, 2.1, 1.5],
			[s * 0.9, -8, 0],
			palette.paper,
		).rotation.z = Math.PI / 2;
		box(leg, [1.3, 8.2, 1.5], [s * 0.9, -12, 0], palette.paper);
		box(leg, [4, 0.9, 5], [s * 0.9, -17.4, 1], palette.deep);
		box(leg, [4.2, 0.4, 4], [s * 0.9, -17.9, 1.1], palette.paper);
		const phase = i % 2 ? 1 : -1;
		tracks.push(
			new T.NumberKeyframeTrack(
				"leg" + i + ".rotation[x]",
				[0, 1, 2, 3, 4],
				[0, 0.15 * phase, 0, -0.15 * phase, 0],
			),
		);
	}
	const mixer = new T.AnimationMixer(root);
	const walk = mixer.clipAction(
		new T.AnimationClip("armoured march", 4, tracks),
	);
	walk.play();
	mixers.push(mixer);
	return { mesh: root, pivot: p, mixer, walk, head };
}
export function toppleAnimation(w) {
	w.walk.stop();
	const p = w.pivot;
	const track = new T.NumberKeyframeTrack(
		"body.rotation[z]",
		[0, 0.4, 1.3, 1.9],
		[0, -0.12, 1.5, 1.48],
	);
	const drop = new T.NumberKeyframeTrack(
		"body.position[y]",
		[0, 0.5, 1.9],
		[21, 20, 6],
	);
	const action = w.mixer.clipAction(
		new T.AnimationClip("all knees no dignity", 1.9, [track, drop]),
	);
	action.setLoop(T.LoopOnce, 1);
	action.clampWhenFinished = true;
	action.play();
}
export function shuttle(mixers) {
	const g = new T.Group();
	piece(g, wedge, [7, 4.4, 14], [0, 0, 0], palette.paper);
	box(g, [9, 4, 9], [0, 0, -5], palette.blue);
	piece(g, wedge, [4.5, 1.9, 5], [0, 3, 5], palette.deep);
	for (const s of [-1, 1]) {
		box(g, [6, 0.6, 16], [s * 7, -1, -1], palette.paper);
		stripe(g, [2, 0.1, 13], [s * 7, -0.6, -1], palette.orange);
		engine(g, s * 7, -0.8, -8, "arkjet" + s, mixers);
		box(g, [0.5, 6, 5], [s * 8, 2, -5], palette.orange);
	}
	box(g, [0.3, 5, 3], [0, 5, -9], palette.deep);
	return g;
}
export function repairBuoy(mixers) {
	const g = new T.Group();
	const pivot = new T.Group();
	pivot.name = "buoy";
	g.add(pivot);
	piece(pivot, "oct", [2.2, 2.2, 2.2], [0, 0, 0], palette.cyan);
	box(pivot, [0.6, 0.15, 2.7], [0, 2.3, 0], palette.paper);
	box(pivot, [2.7, 0.15, 0.6], [0, 2.3, 0], palette.paper);
	const ring = new T.Mesh(
		new T.TorusGeometry(3, 0.15, 5, 18),
		toon(palette.orange),
	);
	ring.rotation.x = Math.PI / 2;
	pivot.add(ring);
	const mixer = new T.AnimationMixer(g);
	mixer
		.clipAction(
			new T.AnimationClip("repair beacon", 3, [
				new T.NumberKeyframeTrack("buoy.position[y]", [0, 1.5, 3], [0, 1.1, 0]),
				new T.NumberKeyframeTrack("buoy.rotation[y]", [0, 3], [0, Math.PI * 2]),
			]),
		)
		.play();
	mixers.push(mixer);
	return g;
}
function rng(seed) {
	return () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}
export function landscape(scene) {
	const rand = rng(6172);
	const group = new T.Group();
	scene.add(group);
	const ground = new T.Mesh(new T.PlaneGeometry(1900, 1900), toon(0xdce7de));
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	group.add(ground);
	for (let i = 0; i < 145; i++) {
		const x = (rand() - 0.5) * 1300,
			z = (rand() - 0.5) * 1300;
		if (Math.abs(x) < 115 && Math.abs(z) < 330) continue;
		const patch = piece(
			group,
			new T.CircleGeometry(1, 5),
			[15 + rand() * 70, 9 + rand() * 28, 1],
			[x, 0.035, z],
			i % 3 ? 0xc4dcd9 : 0x98c0c7,
			false,
		);
		patch.rotation.x = -Math.PI / 2;
		patch.rotation.z = rand() * 6;
	}
	for (let i = 0; i < 95; i++) {
		const side = i % 2 ? -1 : 1;
		const z = (rand() - 0.5) * 1500;
		const x = side * (280 + rand() * 460);
		const h = 40 + rand() * 170,
			r = 30 + rand() * 90;
		const g = new T.ConeGeometry(r, h, 4 + Math.floor(rand() * 3));
		g.rotateY(rand() * 6);
		piece(
			group,
			g,
			[1, 1, 1],
			[x, h / 2 - 3, z],
			i % 4 === 0 ? 0x8bacb8 : 0xc4d9da,
			true,
		);
		const cap = new T.ConeGeometry(r * 0.49, h * 0.4, 4);
		cap.rotateY(rand() * 2);
		piece(group, cap, [1, 1, 1], [x + 2, h * 0.8, z], 0xecede2, false);
	}
	for (let i = 0; i < 35; i++) {
		const x = (rand() - 0.5) * 420,
			z = (rand() - 0.5) * 650;
		const drift = piece(
			group,
			new T.SphereGeometry(1, 5, 3),
			[5 + rand() * 14, 1.2 + rand() * 3, 4 + rand() * 9],
			[x, -0.5, z],
			0xe7ece2,
			false,
		);
		drift.rotation.y = rand() * 6;
	}
	// Graphic wind-scoured lines in the ice.
	for (let i = 0; i < 180; i++) {
		const x = (rand() - 0.5) * 650,
			z = (rand() - 0.5) * 850;
		const line = box(
			group,
			[3 + rand() * 19, 0.02, 0.1 + rand() * 0.16],
			[x, 0.065, z],
			0x9abbbf,
			false,
		);
		line.rotation.y = -0.3 + rand() * 0.4;
	}
	// The refuge: a cut-in hangar, trenches and a tired shield array.
	const base = new T.Group();
	base.position.set(0, 0, 175);
	group.add(base);
	piece(base, "sphere", [25, 18, 18], [0, -2, 15], 0xa3c2ca);
	box(base, [30, 13, 0.7], [0, 3.8, -0.1], palette.deep);
	box(base, [26, 10, 0.9], [0, 3.5, -0.8], INK);
	for (const x of [-16, 16]) box(base, [2, 15, 3], [x, 4.5, -1], palette.paper);
	box(base, [35, 2, 3], [0, 12, -1], palette.paper);
	for (let i = 0; i < 6; i++)
		box(base, [0.3, 7, 0.2], [-11 + i * 4.4, 4.1, -1.5], palette.blue, false);
	box(base, [6, 0.4, 2], [0, 11, -2.1], palette.orange, false);
	for (let i = 0; i < 4; i++) {
		piece(base, "sphere", [8, 7, 8], [-40 - i * 12, 0, 8], palette.blue);
		box(base, [1, 9, 1], [-40 - i * 12, 4, 8], palette.paper);
	}
	for (const side of [-1, 1]) {
		box(base, [50, 1.8, 3], [side * 56, 1, -28], palette.blue);
		box(base, [50, 0.4, 3.4], [side * 56, 2, -28], palette.paper);
		for (let n = 0; n < 4; n++) {
			const x = side * (35 + n * 14);
			piece(base, "cyl", [2, 4, 2], [x, 3, -28], palette.deep);
			const barrel = box(base, [0.5, 0.5, 7], [x, 5, -31], palette.paper);
			barrel.rotation.x = 0.2;
		}
	}
	for (let i = 0; i < 20; i++) {
		const x = (rand() - 0.5) * 100,
			z = -10 + rand() * 35;
		piece(base, "cyl", [0.3, 1.3, 0.3], [x, 1, z], palette.deep, false);
		piece(
			base,
			"sphere",
			[0.38, 0.38, 0.38],
			[x, 1.9, z],
			palette.orange,
			false,
		);
	}
	for (let i = 0; i < 7; i++) {
		box(group, [1, 5, 1], [-25 + i * 8, 2.5, 137], palette.deep);
		box(group, [0.6, 0.4, 0.7], [-25 + i * 8, 5.2, 137], palette.cyan, false);
	}
	// Departure corridor, visible as a broken ring above the far glacier.
	const gate = new T.Group();
	gate.position.set(0, 14, -285);
	group.add(gate);
	for (const s of [-1, 1]) {
		box(gate, [3, 25, 3], [s * 27, 0, 0], palette.deep);
		box(gate, [3.5, 1, 3.5], [s * 27, 12, 0], palette.orange);
		box(gate, [0.6, 20, 0.4], [s * 27, 0, 1.6], palette.cyan, false);
	}
	for (let i = 0; i < 13; i++) {
		const a = (i / 12) * Math.PI;
		const s = piece(
			gate,
			"box",
			[2.1, 3, 1],
			[-Math.cos(a) * 27, Math.sin(a) * 27, 0],
			palette.cyan,
			false,
		);
		s.rotation.z = a - Math.PI / 2;
	}
	// High graphic cloud ribbons and a pale moon.
	for (let i = 0; i < 13; i++) {
		const cloud = piece(
			group,
			"sphere",
			[80 + rand() * 90, 2.5, 14],
			[rand() * 1000 - 500, 150 + rand() * 70, -480 + rand() * 700],
			0xd3dcd0,
			false,
		);
		cloud.castShadow = false;
	}
	const moon = new T.Mesh(
		new T.SphereGeometry(36, 24, 12),
		new T.MeshBasicMaterial({ color: 0xf6e5ba, fog: false }),
	);
	moon.position.set(310, 290, -650);
	scene.add(moon);
	return { group, base, gate };
}
export function snow(scene) {
	const n = 850;
	const pos = new Float32Array(n * 3);
	const rand = rng(808);
	for (let i = 0; i < n; i++) {
		pos[i * 3] = (rand() - 0.5) * 850;
		pos[i * 3 + 1] = 5 + rand() * 130;
		pos[i * 3 + 2] = (rand() - 0.5) * 850;
	}
	const geometry = new T.BufferGeometry();
	geometry.setAttribute("position", new T.BufferAttribute(pos, 3));
	const points = new T.Points(
		geometry,
		new T.PointsMaterial({
			color: 0xf2f5df,
			size: 0.38,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.65,
		}),
	);
	scene.add(points);
	return points;
}
export function shadow(scene, scale = 1) {
	const mesh = new T.Mesh(
		new T.CircleGeometry(1, 24),
		new T.MeshBasicMaterial({
			color: 0x345c72,
			transparent: true,
			opacity: 0.18,
			depthWrite: false,
		}),
	);
	mesh.rotation.x = -Math.PI / 2;
	mesh.scale.set(6 * scale, 4 * scale, 1);
	mesh.position.y = 0.08;
	scene.add(mesh);
	return mesh;
}
export function comicBurst(scene, pos, color = 0xffa466) {
	const g = new T.Group();
	g.position.copy(pos);
	const verts = [];
	for (let i = 0; i < 24; i++) {
		const a = (i / 24) * Math.PI * 2;
		const r = i % 2 ? 2.2 : 5;
		verts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r));
	}
	const mesh = new T.Mesh(
		new T.ShapeGeometry(new T.Shape(verts)),
		new T.MeshBasicMaterial({ color, side: T.DoubleSide }),
	);
	g.add(mesh);
	scene.add(g);
	return g;
}
