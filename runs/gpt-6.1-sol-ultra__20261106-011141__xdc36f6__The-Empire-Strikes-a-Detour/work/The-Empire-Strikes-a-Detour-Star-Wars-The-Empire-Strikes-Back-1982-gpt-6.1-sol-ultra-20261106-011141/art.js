import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

// All silhouettes, terrain, markings and animation are generated at runtime.
const palette = {
	ink: 0x142b3b,
	snow: 0xe5f3ed,
	ice: 0xa9cdd1,
	deep: 0x407084,
	steel: 0x7c9ca2,
	armor: 0xa9b8af,
	dark: 0x344e5c,
	orange: 0xf1743b,
	yellow: 0xffd071,
	cyan: 0x88f2ed,
	red: 0xff5149,
};
const cache = new Map();
function mat(hex, glow = false) {
	const key = `${hex}-${glow}`;
	if (cache.has(key)) return cache.get(key);
	let m;
	if (glow) m = new THREE.MeshBasicNodeMaterial({ color: hex });
	else {
		m = new THREE.MeshStandardNodeMaterial({
			color: hex,
			roughness: 0.9,
			metalness: 0.03,
			flatShading: true,
		});
		const band = normalWorld
			.dot(vec3(-0.45, 0.85, 0.3))
			.mul(0.5)
			.add(0.5)
			.mul(4)
			.floor()
			.div(4)
			.mul(0.42)
			.add(0.58);
		m.colorNode = color(hex).mul(band);
	}
	cache.set(key, m);
	return m;
}
const ink = new THREE.MeshBasicNodeMaterial({
	color: palette.ink,
	side: THREE.BackSide,
});
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.IcosahedronGeometry(1, 1);
function mesh(
	geo,
	material,
	parent,
	p = [0, 0, 0],
	s = [1, 1, 1],
	outline = true,
) {
	const o = new THREE.Mesh(
		geo,
		typeof material === "number" ? mat(material) : material,
	);
	o.position.set(...p);
	o.scale.set(...s);
	o.castShadow = true;
	o.receiveShadow = true;
	if (outline) {
		const hull = new THREE.Mesh(geo, ink);
		hull.scale.setScalar(1.055);
		hull.castShadow = false;
		o.add(hull);
	}
	if (parent) parent.add(o);
	return o;
}
function box(parent, p, s, c, outline = true) {
	return mesh(boxGeo, c, parent, p, s, outline);
}
function cyl(parent, p, r1, r2, h, c, n = 12, outline = true) {
	return mesh(
		new THREE.CylinderGeometry(r1, r2, h, n, 1),
		c,
		parent,
		p,
		[1, 1, 1],
		outline,
	);
}
function ball(parent, p, s, c, outline = true) {
	return mesh(sphereGeo, c, parent, p, s, outline);
}
function mark(parent, p, s, c) {
	return box(parent, p, s, mat(c, true), false);
}
function stripe(parent, x, y, z, w, d, c) {
	return mark(parent, [x, y, z], [w, 0.045, d], c);
}
function triangleWing(parent, x, z, side, c) {
	const shape = new THREE.Shape();
	shape.moveTo(0, -5.8);
	shape.lineTo(side * 7.1, 1.8);
	shape.lineTo(side * 6.3, 3.7);
	shape.lineTo(0, 2.1);
	shape.closePath();
	const geo = new THREE.ExtrudeGeometry(shape, {
		depth: 0.68,
		bevelEnabled: false,
	});
	geo.rotateX(-Math.PI / 2);
	return mesh(geo, c, parent, [x, 0, z]);
}
function exhaust(parent, x, y, z, size = 1) {
	const root = new THREE.Group();
	root.position.set(x, y, z);
	parent.add(root);
	const a = mesh(
		new THREE.ConeGeometry(0.68 * size, 4 * size, 10),
		mat(palette.cyan, true),
		root,
		[0, 0, 1.7 * size],
		[1, 1, 1],
		false,
	);
	a.rotation.x = Math.PI / 2;
	const b = mesh(
		new THREE.ConeGeometry(0.36 * size, 5 * size, 8),
		mat(0xf4fff7, true),
		root,
		[0, 0, 2 * size],
		[1, 1, 1],
		false,
	);
	b.rotation.x = Math.PI / 2;
	root.userData.flame = true;
	return root;
}
export function createSpeeder(accent = palette.orange) {
	const g = new THREE.Group();
	g.name = "Snow speeder";
	triangleWing(g, 0, 0, 1, palette.snow);
	triangleWing(g, 0, 0, -1, palette.snow);
	const body = box(g, [0, 0.5, -0.5], [3.4, 1.5, 7.6], palette.snow);
	body.rotation.x = -0.05;
	box(g, [0, 1.45, -0.3], [2.15, 1.35, 3.8], palette.dark);
	box(g, [0, 2.12, -1.5], [1.9, 0.09, 1.2], 0xa8dfdf);
	box(g, [0, 1.45, 1.45], [2.5, 0.9, 1], accent);
	box(g, [0, 2.2, 0.05], [0.12, 0.13, 3.6], palette.snow);
	for (const s of [-1, 1]) {
		box(g, [s * 5.7, 0.32, -0.15], [1.18, 1.45, 8.4], palette.armor);
		box(g, [s * 5.7, 0.5, -5.15], [0.43, 0.43, 4.6], palette.dark);
		cyl(g, [s * 5.7, 0.3, 3.4], 0.75, 0.75, 1.5, palette.dark, 10).rotation.x =
			Math.PI / 2;
		box(g, [s * 3.55, 0.49, -0.15], [1.2, 0.14, 3.8], accent);
		box(g, [s * 3.55, 0.56, 1.2], [1.25, 0.1, 0.2], palette.ink, false);
		box(g, [s * 3.55, 0.56, 1.65], [1.25, 0.1, 0.2], palette.ink, false);
		exhaust(g, s * 5.7, 0.3, 4, 0.7);
	}
	box(g, [0, 0.7, 3.8], [0.5, 0.4, 2], palette.dark);
	g.userData.flames = [];
	g.traverse((o) => {
		if (o.userData.flame) g.userData.flames.push(o);
	});
	return g;
}

export function createWalker() {
	const root = new THREE.Group();
	root.name = "Imperial siege walker";
	const body = new THREE.Group();
	body.name = "WalkerBody";
	root.add(body);
	box(body, [0, 20.2, 0], [10.8, 8.1, 15.8], palette.armor);
	box(body, [0, 23.9, -1.2], [11.7, 1.7, 11], palette.armor);
	box(body, [0, 16.1, 0], [7.7, 1.1, 12.3], palette.dark);
	for (const s of [-1, 1]) {
		box(body, [s * 5.6, 20.7, 0.4], [0.5, 4.4, 13], 0x94a9a5);
		for (let j = 0; j < 5; j++)
			box(
				body,
				[s * 5.91, 21.7, -4 + j * 2.1],
				[0.12, 1.7, 1.13],
				palette.steel,
				false,
			);
		for (let j = 0; j < 4; j++)
			box(
				body,
				[s * 5.94, 18.8, -3.5 + j * 2.7],
				[0.15, 0.22, 1.9],
				palette.dark,
				false,
			);
		box(body, [s * 4.7, 24.95, 1], [0.18, 0.15, 10], palette.dark, false);
	}
	box(body, [0, 21.4, 8.2], [7, 4.4, 1.2], palette.dark);
	for (let i = -2; i <= 2; i++)
		box(body, [i * 1.2, 21.6, 8.87], [0.5, 2.7, 0.2], palette.ink, false);
	const neck = box(body, [0, 21.1, -9.5], [3.9, 3.1, 4.4], palette.dark);
	for (let i = 0; i < 5; i++)
		box(
			body,
			[0, 21.1, -8 - i * 0.65],
			[4.2, 3.35, 0.18],
			palette.steel,
			false,
		);
	const head = new THREE.Group();
	head.name = "WalkerHead";
	head.position.set(0, 20.5, -13);
	body.add(head);
	box(head, [0, 0.1, 0], [7.4, 4.9, 6.7], palette.armor);
	box(head, [0, 1.65, -3.5], [6.8, 0.56, 0.2], mat(palette.red, true), false);
	box(head, [0, -2.8, -1.9], [5.8, 0.9, 4.4], palette.dark);
	for (const s of [-1, 1]) {
		const cannon = cyl(
			head,
			[s * 1.7, -2.7, -4.9],
			0.4,
			0.5,
			5.4,
			palette.ink,
			8,
		);
		cannon.rotation.x = Math.PI / 2;
		const cheek = cyl(
			head,
			[s * 4.1, -0.5, -1.7],
			0.52,
			0.8,
			4,
			palette.dark,
			10,
		);
		cheek.rotation.x = Math.PI / 2;
	}
	const legs = [];
	for (let i = 0; i < 4; i++) {
		const side = i % 2 ? 1 : -1,
			z = i < 2 ? -5 : 5;
		const leg = new THREE.Group();
		leg.name = "WalkerLeg" + i;
		leg.position.set(side * 4.6, 17.6, z);
		root.add(leg);
		cyl(leg, [side * 0.4, 0, 0], 1.55, 1.55, 2.3, palette.dark, 12).rotation.z =
			Math.PI / 2;
		box(leg, [side * 0.5, -4, 0], [1.9, 7.3, 2.1], palette.armor);
		const joint = cyl(
			leg,
			[side * 0.5, -7.5, 0.2],
			1.75,
			1.75,
			2.15,
			palette.steel,
			12,
		);
		joint.rotation.z = Math.PI / 2;
		box(leg, [side * 0.5, -11.2, 0.5], [1.6, 6.6, 1.7], palette.armor);
		box(leg, [side * 0.5, -11.2, -0.41], [0.8, 5.7, 0.2], palette.dark, false);
		cyl(leg, [side * 0.5, -14.8, 0.5], 1.05, 1.45, 1.6, palette.dark, 10);
		box(leg, [side * 0.5, -16, 0.2], [4.25, 1.75, 5.5], palette.armor);
		box(leg, [side * 0.5, -15.14, -0.2], [3.9, 0.22, 3.6], palette.snow, false);
		legs.push(leg);
	}
	const tracks = [];
	const times = [0, 0.7, 1.4, 2.1, 2.8];
	for (let i = 0; i < 4; i++) {
		const a = i === 0 || i === 3 ? 1 : -1;
		tracks.push(
			new THREE.NumberKeyframeTrack("WalkerLeg" + i + ".rotation[x]", times, [
				0.13 * a,
				-0.13 * a,
				0.13 * a,
				-0.13 * a,
				0.13 * a,
			]),
		);
	}
	tracks.push(
		new THREE.NumberKeyframeTrack(
			"WalkerBody.position[y]",
			times,
			[0, 0.22, 0, 0.22, 0],
		),
	);
	tracks.push(
		new THREE.NumberKeyframeTrack(
			"WalkerHead.rotation[y]",
			[0, 2, 4, 6],
			[-0.07, 0.08, 0.04, -0.07],
		),
	);
	const mixer = new THREE.AnimationMixer(root);
	mixer
		.clipAction(
			new THREE.AnimationClip("Heavy marching", 2.8, tracks.slice(0, 5)),
		)
		.play();
	mixer
		.clipAction(new THREE.AnimationClip("Scanner sweep", 6, tracks.slice(5)))
		.play();
	root.userData.mixer = mixer;
	root.userData.legs = legs;
	root.userData.body = body;
	root.userData.head = head;
	return root;
}

export function createProbe() {
	const g = new THREE.Group();
	g.name = "Patrol probe";
	const rotor = new THREE.Group();
	rotor.name = "ProbeRotor";
	g.add(rotor);
	ball(rotor, [0, 0, 0], [2.4, 1.8, 2.4], palette.dark);
	cyl(rotor, [0, 1.35, 0], 1.75, 2.5, 0.9, palette.armor, 10);
	cyl(rotor, [0, 2, 0], 0.6, 0.6, 0.55, palette.dark, 10);
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2;
		const arm = new THREE.Group();
		arm.rotation.y = a;
		rotor.add(arm);
		box(arm, [1.5, -2, 0], [0.33, 3.7, 0.35], palette.dark);
		const foot = box(arm, [2, -3.4, 0], [1.7, 0.3, 0.4], palette.steel);
		foot.rotation.z = -0.5;
	}
	for (let i = 0; i < 3; i++)
		ball(
			rotor,
			[-0.9 + i * 0.9, 0.2, -1.9],
			[0.34, 0.34, 0.2],
			mat(i === 1 ? palette.red : 0xffbd65, true),
		);
	const mix = new THREE.AnimationMixer(g);
	mix
		.clipAction(
			new THREE.AnimationClip("Hover scanner", 3, [
				new THREE.NumberKeyframeTrack(
					"ProbeRotor.rotation[y]",
					[0, 3],
					[0, Math.PI * 2],
				),
				new THREE.NumberKeyframeTrack(
					"ProbeRotor.position[y]",
					[0, 1.5, 3],
					[0, 0.7, 0],
				),
			]),
		)
		.play();
	g.userData.mixer = mix;
	return g;
}

export function createTransport() {
	const g = new THREE.Group();
	g.name = "Refuge transport";
	ball(g, [0, 3, 0], [7.2, 5.1, 12.2], palette.snow);
	box(g, [0, 2.3, -9.8], [6.8, 3.8, 6.3], palette.armor);
	box(g, [0, 4.6, -11.3], [5.2, 1.1, 1.8], palette.dark);
	for (let i = -2; i <= 2; i++)
		box(
			g,
			[i * 0.9, 4.7, -12.3],
			[0.42, 0.6, 0.16],
			mat(palette.cyan, true),
			false,
		);
	box(g, [0, 8.1, 2], [1.7, 2, 10], palette.orange);
	for (let i = 0; i < 4; i++) {
		const x = (i % 2 ? 1 : -1) * 4.5,
			y = i < 2 ? 1.5 : 4.4;
		cyl(g, [x, y, 10.4], 1.45, 1.45, 2.5, palette.dark, 12).rotation.x =
			Math.PI / 2;
		exhaust(g, x, y, 11.6, 1.3);
	}
	for (const s of [-1, 1]) {
		box(g, [s * 6, 1.4, 1], [2.3, 4, 9], palette.armor);
		for (let j = 0; j < 3; j++)
			box(g, [s * 7.2, 1.5, -2 + j * 2], [0.14, 0.3, 1.2], palette.dark, false);
	}
	const mixer = new THREE.AnimationMixer(g);
	// Engine illumination is animated by the same native clip system as mechanical parts.
	const f = [];
	g.traverse((o) => {
		if (o.userData.flame) {
			o.name = "TransportFlame" + f.length;
			f.push(o);
		}
	});
	const tracks = f.map(
		(o) =>
			new THREE.NumberKeyframeTrack(
				o.name + ".scale[z]",
				[0, 0.12, 0.24],
				[1, 1.25, 1],
			),
	);
	mixer.clipAction(new THREE.AnimationClip("Ion drive", 0.24, tracks)).play();
	g.userData.mixer = mixer;
	return g;
}
export function createAce() {
	const g = new THREE.Group();
	g.name = "Obsidian interceptor";
	ball(g, [0, 0, 0], [2.4, 2.4, 2.4], palette.dark);
	ball(g, [0, 0.2, -1.92], [1.52, 1.5, 0.3], 0x71a3ad);
	for (let i = -1; i <= 1; i++)
		box(g, [i * 0.72, 0.2, -2.25], [0.1, 2.5, 0.12], palette.ink, false);
	box(g, [0, 0.2, -2.28], [3.1, 0.1, 0.12], palette.ink, false);
	for (const s of [-1, 1]) {
		box(g, [s * 4.1, 0, 0], [4.3, 0.65, 0.8], palette.dark);
		const panel = box(g, [s * 6.7, 0, 0], [0.7, 9.2, 8.8], palette.ink);
		panel.rotation.z = s * 0.17;
		box(g, [s * 6.9, 0, 0], [0.85, 7.7, 0.18], palette.steel, false);
		box(g, [s * 6.9, 0, 0], [0.85, 0.18, 7.7], palette.steel, false);
		box(g, [s * 6.9, -4.4, 0], [0.85, 0.38, 8.9], palette.armor, false);
		box(g, [s * 6.9, 4.4, 0], [0.85, 0.38, 8.9], palette.armor, false);
		box(g, [s * 1.2, -1.65, -2.1], [0.25, 0.25, 2.2], mat(palette.red, true));
		exhaust(g, s * 1.1, -0.5, 2.3, 0.65);
	}
	return g;
}

function seeded(seed) {
	return () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}
export function createWorld(scene) {
	const rand = seeded(1982),
		root = new THREE.Group();
	root.name = "Frostline basin";
	scene.add(root);
	const hemi = new THREE.HemisphereLight(0xc9f5ff, 0x40556b, 1.55);
	scene.add(hemi);
	const sun = new THREE.DirectionalLight(0xffe8b1, 2.7);
	sun.position.set(-110, 185, -65);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, {
		left: -220,
		right: 220,
		top: 190,
		bottom: -190,
		near: 1,
		far: 500,
	});
	sun.shadow.normalBias = 0.25;
	sun.shadow.bias = -0.00015;
	scene.add(sun);
	const groundGeo = new THREE.PlaneGeometry(470, 365, 44, 34);
	groundGeo.rotateX(-Math.PI / 2);
	const gp = groundGeo.attributes.position;
	for (let i = 0; i < gp.count; i++) {
		const x = gp.getX(i),
			z = gp.getZ(i);
		const height = Math.sin(x * 0.028 + z * 0.024) * 0.34 + rand() * 0.55 - 0.8;
		gp.setY(i, height);
	}
	groundGeo.computeVertexNormals();
	mesh(groundGeo, palette.snow, root, [0, 0, 0], [1, 1, 1], false);
	// Graphic wind-scoured snow lanes, like long brush marks on paper.
	for (let i = 0; i < 160; i++) {
		const x = (rand() - 0.5) * 430,
			z = (rand() - 0.5) * 320;
		const drift = box(
			root,
			[x, -0.02, z],
			[4 + rand() * 17, 0.035, 0.1 + rand() * 0.32],
			i % 3 ? 0xc1d9d8 : 0xf8fff2,
			false,
		);
		drift.rotation.y = -0.28 + rand() * 0.09;
	}
	// The ice field is bounded by steep, layered faceted mountains.
	for (let i = 0; i < 48; i++) {
		const side = i < 28 ? "far" : i < 38 ? "left" : "right";
		const x =
			side === "far"
				? -290 + i * 22
				: side === "left"
					? -230 - rand() * 40
					: 230 + rand() * 40;
		const z = side === "far" ? -183 - rand() * 67 : -120 + (i % 10) * 29;
		const h = 36 + rand() * 87,
			r = 20 + rand() * 47;
		const mountain = mesh(
			new THREE.ConeGeometry(r, h, 5 + Math.floor(rand() * 3), 2),
			i % 3 ? 0x86b8c6 : 0x6d9dac,
			root,
			[x, h * 0.45 - 5, z],
			[1, 1, 1],
			false,
		);
		mountain.rotation.y = rand() * 6.28;
		const peak = mesh(
			new THREE.ConeGeometry(r * 0.45, h * 0.49, 5, 1),
			0xeaf6eb,
			root,
			[x, h * 0.77 - 5, z],
			[1, 1, 1],
			false,
		);
		peak.rotation.y = mountain.rotation.y;
	}
	// Cliffs with exposed turquoise layers frame the snow without blocking play.
	for (let i = 0; i < 42; i++) {
		const side = i % 2 ? 1 : -1,
			x = side * (174 + rand() * 26),
			z = -115 + Math.floor(i / 2) * 11;
		const rock = ball(
			root,
			[x, rand() * 1.3, z],
			[4 + rand() * 8, 2 + rand() * 7, 4 + rand() * 8],
			i % 3 === 0 ? palette.deep : palette.ice,
			true,
		);
		rock.rotation.y = rand() * Math.PI;
		ball(
			root,
			[x, rock.scale.y * 0.65, z],
			[rock.scale.x * 0.88, 0.7, rock.scale.z * 0.87],
			palette.snow,
			false,
		);
	}
	// Defensive trench: dark floor, raised snow berms, ribbed steel revetments.
	const trenches = [
		[-97, 45, 72],
		[97, 45, 72],
		[-101, 16, 35],
		[102, 16, 35],
	];
	for (const [x, z, w] of trenches) {
		box(root, [x, -0.18, z], [w, 0.16, 5.1], palette.deep, false);
		for (const s of [-1, 1]) {
			box(root, [x, 0.65, z + s * 3.2], [w + 2, 1.5, 1.6], palette.ice, false);
			box(
				root,
				[x, 1.44, z + s * 3.2],
				[w + 3, 0.22, 2.1],
				palette.snow,
				false,
			);
		}
		for (let j = -w / 2 + 2; j < w / 2; j += 5) {
			box(root, [x + j, 0.7, z - 2.26], [0.4, 1.5, 0.3], palette.steel, false);
			box(root, [x + j, 0.7, z + 2.26], [0.4, 1.5, 0.3], palette.steel, false);
		}
		for (const q of [-0.35, 0.35]) {
			const turret = new THREE.Group();
			turret.position.set(x + q * w, 1, z - 5);
			root.add(turret);
			cyl(turret, [0, 0, 0], 2.5, 3.5, 1, palette.dark, 10);
			ball(turret, [0, 1, 0], [2, 1.5, 2], palette.armor);
			box(turret, [0, 1.1, -3], [0.7, 0.7, 5], palette.dark);
			box(
				turret,
				[0, 1.7, -1.2],
				[1.7, 0.4, 0.2],
				mat(palette.cyan, true),
				false,
			);
		}
	}
	// Authored crash wreck and small orange camp details.
	for (const [x, z] of [
		[-120, -50],
		[115, -35],
		[-70, 70],
		[148, 70],
	]) {
		const wreck = createSpeeder(0xad6f4d);
		wreck.position.set(x, 0.5, z);
		wreck.scale.setScalar(0.9);
		wreck.rotation.set(0, rand() * 6.28, 0.12);
		root.add(wreck);
		for (let j = 0; j < 4; j++) {
			const piece = box(
				root,
				[x + (rand() - 0.5) * 15, 0.4, z + (rand() - 0.5) * 15],
				[2 + rand() * 2, 1, 1 + rand() * 3],
				palette.dark,
			);
			piece.rotation.y = rand() * 6.28;
		}
		box(root, [x + 7, 0.8, z + 5], [2, 1.8, 2], palette.orange);
	}
	const base = new THREE.Group();
	base.position.set(0, 0, 95);
	base.name = "Echo refuge";
	root.add(base);
	// Main hangar mouth is a dark blue cutaway in a mass of wind-packed ice.
	ball(base, [0, 5, 6], [34, 16, 21], palette.ice, false);
	ball(base, [0, 11.9, 8], [33, 6.6, 20], palette.snow, false);
	box(base, [0, 6, -8], [29, 12, 4], palette.dark);
	box(base, [0, 6, -10.2], [24, 9.8, 0.18], 0x142f43, false);
	for (const s of [-1, 1]) {
		box(base, [s * 13, 6, -10.5], [1.8, 12, 1.2], palette.steel);
		mark(base, [s * 11.7, 6, -11.2], [0.2, 9, 0.15], palette.cyan);
	}
	box(base, [0, 12, -10.5], [28, 1.1, 1.5], palette.armor);
	// A second cutaway face keeps the refuge legible from the battle camera.
	box(base, [0, 5.2, 26.4], [25, 9.5, 0.3], palette.ink, false);
	for (const s of [-1, 1]) {
		box(base, [s * 13.4, 5.2, 26.7], [1.6, 10.4, 1.1], palette.steel);
		mark(base, [s * 12, 5.2, 27.3], [0.2, 8.3, 0.14], palette.cyan);
	}
	box(base, [0, 10.5, 26.6], [28.2, 1.1, 1.3], palette.armor);
	for (let i = -3; i <= 3; i++)
		mark(base, [i * 3.2, 1.1, 27], [1.1, 0.25, 0.2], palette.orange);
	mark(base, [0, 11.4, -11.3], [19, 0.17, 0.1], palette.cyan);
	for (let i = -2; i <= 2; i++) {
		box(base, [i * 4, 1, -10.5], [0.13, 2.4, 3], palette.orange, false);
		stripe(base, i * 4, 0.06, -19, 0.2, 6, palette.yellow);
	}
	// Circular landing pad with readable segmented warning marks.
	cyl(base, [0, -0.05, -33], 20, 20, 0.14, palette.deep, 64, false);
	cyl(base, [0, 0.045, -33], 18.2, 18.2, 0.06, 0xa5c7ca, 64, false);
	const ring = new THREE.Mesh(
		new THREE.RingGeometry(18.1, 18.7, 64),
		mat(palette.yellow, true),
	);
	ring.rotation.x = -Math.PI / 2;
	ring.position.set(0, 0.09, -33);
	base.add(ring);
	for (let i = 0; i < 12; i++) {
		const a = (i * Math.PI) / 6;
		const dash = stripe(
			base,
			Math.sin(a) * 15.5,
			0.11,
			-33 + Math.cos(a) * 15.5,
			0.8,
			2,
			palette.snow,
		);
		dash.rotation.y = a;
	}
	stripe(base, -3, 0.12, -33, 0.8, 9, palette.snow);
	stripe(base, 3, 0.12, -33, 0.8, 9, palette.snow);
	stripe(base, 0, 0.13, -33, 6, 0.8, palette.snow);
	for (const x of [-31, 31]) {
		for (let j = 0; j < 6; j++) {
			box(base, [x, 0.65, -14 - j * 5], [0.7, 1.3, 0.7], palette.dark);
			ball(
				base,
				[x, 1.45, -14 - j * 5],
				[0.55, 0.3, 0.55],
				mat(palette.cyan, true),
				false,
			);
		}
	}
	// Shield generator: four finned silver hemispheres along the eastern ridge.
	const generator = new THREE.Group();
	generator.position.set(58, 0, -2);
	base.add(generator);
	box(generator, [0, 0.8, 0], [38, 1.6, 16], palette.deep);
	for (let i = 0; i < 4; i++) {
		const x = -13.5 + i * 9;
		ball(generator, [x, 2.3, 0], [4.3, 6.4, 6.6], palette.armor);
		for (let j = 0; j < 5; j++)
			box(
				generator,
				[x - 1.6 + j * 0.8, 5, 0],
				[0.16, 6.9, 10.2],
				palette.steel,
				false,
			);
		box(generator, [x, 2, -6.4], [2.6, 1.5, 0.4], palette.dark, false);
		mark(generator, [x, 3.7, -6.2], [1.4, 0.42, 0.15], palette.cyan);
	}
	for (const x of [-65, -48]) {
		cyl(base, [x, 5, 0], 4.6, 5.8, 10, palette.steel, 16);
		cyl(base, [x, 10.3, 0], 5, 5.2, 1, palette.snow, 16);
		for (let j = 0; j < 4; j++)
			box(base, [x, 2 + j * 2.1, -5.1], [2.4, 0.13, 0.15], palette.dark, false);
	}
	// Rotating communications dish and signal light.
	const tower = new THREE.Group();
	tower.position.set(-46, 0, 22);
	base.add(tower);
	cyl(tower, [0, 11, 0], 0.7, 1.9, 22, palette.dark, 8);
	for (let y = 4; y < 21; y += 4)
		box(tower, [0, y, 0], [5, 0.22, 0.22], palette.steel, false);
	const dish = new THREE.Group();
	dish.position.y = 23;
	tower.add(dish);
	const dishMesh = mesh(
		new THREE.ConeGeometry(5, 2.5, 18, 1, true),
		palette.armor,
		dish,
		[0, 0, 0],
		[1, 1, 1],
	);
	dishMesh.rotation.z = -0.9;
	const dishCore = cyl(dish, [-2, 1, 0], 0.18, 0.18, 6, palette.ink, 8);
	dishCore.rotation.z = -0.9;
	const beacon = ball(
		tower,
		[0, 27, 0],
		[0.55, 0.55, 0.55],
		mat(palette.red, true),
		false,
	);
	const shieldMaterial = new THREE.MeshBasicNodeMaterial({
		color: 0x88efe5,
		transparent: true,
		opacity: 0.038,
		wireframe: true,
		depthWrite: false,
	});
	const shield = new THREE.Mesh(
		new THREE.SphereGeometry(99, 36, 15, 0, Math.PI * 2, 0, Math.PI / 2),
		shieldMaterial,
	);
	shield.position.set(0, -5, 13);
	base.add(shield);
	// Background planet, paired with faint orbital fragments.
	const moon = mesh(
		new THREE.SphereGeometry(25, 24, 16),
		0xd9e9de,
		root,
		[128, 118, -224],
		[1, 1, 1],
		false,
	);
	// Snowflakes are geometry, not textures; no images are downloaded.
	const snowCount = 240,
		snowGeo = new THREE.TetrahedronGeometry(0.15),
		snowMat = mat(0xf2fff6, true);
	const snow = new THREE.InstancedMesh(snowGeo, snowMat, snowCount);
	snow.castShadow = false;
	root.add(snow);
	const flakes = [],
		dummy = new THREE.Object3D();
	for (let i = 0; i < snowCount; i++)
		flakes.push({
			x: (rand() - 0.5) * 370,
			y: rand() * 75 + 3,
			z: (rand() - 0.5) * 290,
			s: 0.7 + rand() * 1.5,
		});
	function update(dt, time) {
		dish.rotation.y = Math.sin(time * 0.14) * 0.9;
		beacon.scale.setScalar(0.7 + 0.3 * (Math.sin(time * 3) > 0 ? 1 : 0));
		shieldMaterial.opacity = 0.025 + Math.sin(time * 0.7) * 0.009;
		for (let i = 0; i < snowCount; i++) {
			const f = flakes[i];
			f.x += dt * (2.6 + f.s);
			f.y -= dt * (1.8 + f.s);
			if (f.y < 0.5) {
				f.y = 72;
				f.x = (rand() - 0.5) * 370;
			}
			if (f.x > 190) f.x = -190;
			dummy.position.set(f.x, f.y, f.z);
			dummy.scale.setScalar(f.s);
			dummy.rotation.y = time * 0.35 + i;
			dummy.updateMatrix();
			snow.setMatrixAt(i, dummy.matrix);
		}
		snow.instanceMatrix.needsUpdate = true;
	}
	update(0, 0);
	return { root, base, materials: cache, shield, shieldMaterial, sun, update };
}
