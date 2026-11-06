import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

const INK = 0x182d39,
	CREAM = 0xf5e3b9,
	GOLD = 0xf2b44a,
	TEAL = 0x407e7d,
	CORAL = 0xdb6552;
const mats = new Map();
const entityAnimations = [];
function animateEntity(group, update) {
	entityAnimations.push({ group, update });
	return group;
}
function mat(c, cel = true) {
	const key = `${c}-${cel}`;
	if (mats.has(key)) return mats.get(key);
	let m;
	if (cel) {
		m = new THREE.MeshBasicNodeMaterial();
		const n = normalWorld
			.dot(vec3(-0.38, 0.85, 0.42))
			.mul(0.5)
			.add(0.5)
			.mul(3)
			.floor()
			.div(3)
			.mul(0.43)
			.add(0.59);
		m.colorNode = color(c).mul(n);
	} else {
		m = new THREE.MeshStandardMaterial({
			color: c,
			roughness: 1,
			flatShading: true,
		});
	}
	mats.set(key, m);
	return m;
}
const inkmat = new THREE.LineBasicMaterial({ color: INK });
const boxGeo = new THREE.BoxGeometry(1, 1, 1),
	cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8),
	sphereGeo = new THREE.IcosahedronGeometry(1, 1);
function mesh(
	g,
	c,
	parent,
	x = 0,
	y = 0,
	z = 0,
	sx = 1,
	sy = 1,
	sz = 1,
	outline = true,
) {
	const o = new THREE.Mesh(g, mat(c));
	o.position.set(x, y, z);
	o.scale.set(sx, sy, sz);
	o.castShadow = true;
	o.receiveShadow = true;
	parent.add(o);
	if (outline) {
		const edges = new THREE.EdgesGeometry(g, 25);
		if (edges.attributes.position.count) {
			const lines = new THREE.LineSegments(edges, inkmat);
			o.add(lines);
		} else edges.dispose();
	}
	return o;
}
function box(p, c, x, y, z, w, h, d, ink = true) {
	return mesh(boxGeo, c, p, x, y, z, w, h, d, ink);
}
function cyl(p, c, x, y, z, r, h, ink = true) {
	return mesh(cylGeo, c, p, x, y, z, r, h, r, ink);
}
function orb(p, c, x, y, z, r, ink = true) {
	return mesh(sphereGeo, c, p, x, y, z, r, r, r, ink);
}
function beam(p, c, a, b, r = 0.08) {
	const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
		len = a.distanceTo(b);
	const m = cyl(p, c, mid.x, mid.y, mid.z, r, len);
	m.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		b.clone().sub(a).normalize(),
	);
	return m;
}
function seeded(n) {
	let t = n | 0;
	return () => {
		t += 0x6d2b79f5;
		let a = Math.imul(t ^ (t >>> 15), 1 | t);
		a ^= a + Math.imul(a ^ (a >>> 7), 61 | a);
		return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
	};
}
function canvasTexture(
	text,
	{
		color: fg = "#f5e3b9",
		background = "#203543",
		width = 768,
		height = 160,
		font = "900 76px sans-serif",
		border = true,
	} = {},
) {
	const c = document.createElement("canvas");
	c.width = width;
	c.height = height;
	const x = c.getContext("2d");
	x.fillStyle = background;
	x.fillRect(0, 0, width, height);
	if (border) {
		x.strokeStyle = fg;
		x.lineWidth = 5;
		x.strokeRect(9, 9, width - 18, height - 18);
	}
	x.fillStyle = fg;
	x.textAlign = "center";
	x.textBaseline = "middle";
	x.font = font;
	x.fillText(text, width / 2, height / 2, width - 38);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
export function makeLabel(
	text,
	{
		width = 9,
		height = 1.8,
		color: fg = "#f5e3b9",
		background = "#203543",
		sprite = false,
		font,
	} = {},
) {
	const map = canvasTexture(text, { color: fg, background, font });
	if (sprite) {
		const s = new THREE.Sprite(
			new THREE.SpriteMaterial({ map, depthTest: false }),
		);
		s.scale.set(width, height, 1);
		return s;
	}
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
		new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }),
	);
	return m;
}
export function createRing(c = GOLD, r = 3) {
	const g = new THREE.Group();
	const m = new THREE.Mesh(
		new THREE.RingGeometry(r - 0.12, r + 0.12, 48),
		new THREE.MeshBasicMaterial({
			color: c,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.85,
		}),
	);
	m.rotation.x = -Math.PI / 2;
	m.position.y = 0.12;
	g.add(m);
	for (let i = 0; i < 4; i++) {
		const a = (i * Math.PI) / 2;
		box(
			g,
			c,
			Math.cos(a) * (r + 0.5),
			0.13,
			Math.sin(a) * (r + 0.5),
			0.8,
			0.03,
			0.25,
			false,
		);
	}
	return g;
}
function addSign(parent, text, x, y, z, w = 10, h = 2) {
	const s = makeLabel(text, { width: w, height: h });
	s.position.set(x, y, z);
	parent.add(s);
	return s;
}
function tree(parent, x, z, scale = 1) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.scale.setScalar(scale);
	cyl(g, 0x694e3b, 0, 1.2, 0, 0.18, 2.4);
	orb(g, 0x447f66, 0, 3, 0, 1.5);
	orb(g, 0x638e64, -0.65, 2.75, 0.3, 0.95);
	orb(g, 0x75966c, 0.65, 3.1, -0.2, 0.85);
	parent.add(g);
	return g;
}
function car(parent, x, z, c, rotation = 0) {
	const g = new THREE.Group();
	g.position.set(x, 0.12, z);
	g.rotation.y = rotation;
	box(g, c, 0, 0.6, 0, 2.4, 0.85, 4.4);
	box(g, c, 0, 1.2, -0.2, 2, 1, 2.5);
	box(g, 0x355966, 0, 1.35, 1.07, 1.7, 0.5, 0.06);
	box(g, 0x355966, 0, 1.35, -1.47, 1.7, 0.5, 0.06);
	box(g, CREAM, 0, 0.55, 2.24, 2.4, 0.2, 0.14);
	for (const a of [-1, 1]) {
		box(g, 0xffe6a4, a * 0.8, 0.75, 2.25, 0.5, 0.3, 0.05);
		box(g, 0xe26151, a * 0.8, 0.75, -2.25, 0.5, 0.3, 0.05);
		for (const b of [-1, 1]) {
			const wheel = cyl(g, INK, a * 1.24, 0.45, b * 1.3, 0.46, 0.2);
			wheel.rotation.z = Math.PI / 2;
		}
	}
	parent.add(g);
	return g;
}
function lamp(parent, x, z) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	cyl(g, INK, 0, 2.4, 0, 0.09, 4.8);
	cyl(g, GOLD, 0, 0.2, 0, 0.27, 0.4);
	box(g, INK, 0.45, 4.9, 0, 1.1, 0.12, 0.14);
	orb(g, 0xffedb8, 0.9, 4.65, 0, 0.3, false);
	parent.add(g);
}
function bench(parent, x, z, rot = 0) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.rotation.y = rot;
	for (let i = 0; i < 3; i++)
		box(g, 0xa76b42, 0, 0.65, -0.4 + i * 0.35, 2.6, 0.12, 0.25);
	for (let i = 0; i < 3; i++)
		box(g, 0xa76b42, 0, 1 + i * 0.22, -0.6, 2.6, 0.14, 0.12);
	box(g, INK, -0.9, 0.3, 0, 0.12, 0.6, 1.1);
	box(g, INK, 0.9, 0.3, 0, 0.12, 0.6, 1.1);
	parent.add(g);
}
function building(parent, x, z, w, d, h, c, idx) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	box(g, 0xdbc89c, 0, 0.15, 0, w + 2, 0.3, d + 2);
	box(g, c, 0, h / 2, 0, w, h, d);
	box(g, CREAM, 0, 0.8, 0, w + 0.25, 0.4, d + 0.25);
	box(g, INK, 0, h - 0.15, 0, w + 0.45, 0.3, d + 0.45);
	box(g, CREAM, 0, h + 0.25, 0, w + 0.8, 0.5, d + 0.8);
	const wh = 0.9,
		wx = 1.4;
	for (let y = 3; y < h - 1.5; y += 2.7) {
		for (let xx = -w / 2 + 1.7; xx < w / 2 - 1; xx += 3) {
			box(
				g,
				Math.round(y + xx + idx) % 5 === 0 ? GOLD : 0x355666,
				xx,
				y,
				d / 2 + 0.025,
				wx,
				wh,
				0.08,
				false,
			);
			box(g, CREAM, xx, y - 0.55, d / 2 + 0.12, 1.7, 0.12, 0.24, false);
		}
		for (let zz = -d / 2 + 1.6; zz < d / 2 - 1; zz += 3) {
			box(g, 0x355666, w / 2 + 0.025, y, zz, 0.08, wh, wx, false);
			box(g, CREAM, w / 2 + 0.12, y - 0.55, zz, 0.24, 0.12, 1.7, false);
		}
	}
	for (const xx of [-1, 1])
		box(g, CREAM, xx * (w / 2 - 0.45), h / 2, d / 2 + 0.13, 0.35, h, 0.3);
	box(g, INK, 0, 1.2, d / 2 + 0.08, 1.8, 2.4, 0.12);
	box(g, GOLD, 0, 2.55, d / 2 + 0.6, 3, 0.18, 1.2);
	if (h > 13) {
		box(g, c, 0, h + 1.6, 0, w * 0.6, 2.5, d * 0.58);
		box(g, CREAM, 0, h + 3, 0, w * 0.64, 0.3, d * 0.64);
	}
	if (idx % 3 === 0) {
		cyl(g, 0x966c48, -w * 0.22, h + 2, -d * 0.2, 1.25, 2.6);
		const cone = mesh(
			new THREE.ConeGeometry(1.55, 0.8, 8),
			INK,
			g,
			-w * 0.22,
			h + 3.7,
			-d * 0.2,
		);
	} else {
		box(g, 0x6e8586, -w * 0.2, h + 1.2, -d * 0.22, 2.5, 1.5, 2);
		cyl(g, INK, -w * 0.2, h + 2.4, -d * 0.22, 0.16, 1.5);
	}
	if (idx % 4 === 1) {
		for (let j = 0; j < 3; j++)
			box(
				g,
				CREAM,
				-w * 0.37 + j * w * 0.37,
				h + 4 + j * 0.25,
				0,
				0.35,
				4,
				d * 0.55,
			);
	}
	parent.add(g);
	return g;
}

export function createWorld(scene) {
	const root = new THREE.Group();
	root.name = "Paper-City";
	scene.add(root);
	const colliders = [],
		landmarks = {
			booth: new THREE.Vector3(-22, 0, 0),
			jail: new THREE.Vector3(-52, 0, -40),
			newsroom: new THREE.Vector3(48, 0, -45),
			bridge: new THREE.Vector3(0, 0, 24),
			reporter: new THREE.Vector3(-35, 0, -8),
			subwayWest: new THREE.Vector3(-65, 0, 10),
			subwayEast: new THREE.Vector3(60, 0, -5),
		};
	const dynamic = [];
	box(root, 0x719da4, 0, -2, 0, 620, 1, 620, false);
	box(root, 0xcbbb94, 0, -0.65, -45, 220, 1.2, 118, false);
	box(root, 0xcbbb94, 0, -0.65, 72, 220, 1.2, 76, false);
	// Civic grid: wide roads, warm sidewalks, fine ink seams.
	for (const z of [-91, -66, -38, 0, 45, 73, 99]) {
		box(root, 0x51656a, 0, -0.03, z, 218, 0.08, 9, false);
		for (let x = -106; x < 107; x += 8)
			box(root, 0xdccda7, x, 0.022, z, 3, 0.012, 0.13, false);
		for (const side of [-1, 1])
			box(root, 0xf0dbb2, 0, 0.04, z + side * 5.4, 218, 0.16, 1.5, false);
	}
	for (const x of [-98, -68, -38, 0, 33, 65, 97]) {
		for (const row of [
			{ z: -43, d: 114 },
			{ z: 72, d: 76 },
		]) {
			box(root, 0x51656a, x, -0.02, row.z, 8, 0.08, row.d, false);
			for (let z = row.z - row.d / 2 + 2; z < row.z + row.d / 2; z += 8)
				box(root, 0xdccda7, x, 0.026, z, 0.13, 0.012, 3, false);
			for (const side of [-1, 1])
				box(
					root,
					0xf0dbb2,
					x + side * 4.8,
					0.04,
					row.z,
					1.3,
					0.16,
					row.d,
					false,
				);
		}
	}
	for (const x of [-98, -68, -38, 0, 33, 65, 97])
		for (const z of [-38, 0, 45, 73]) {
			for (let i = -2; i <= 2; i++)
				box(root, CREAM, x + i * 0.9, 0.04, z + 3.4, 0.5, 0.012, 1.4, false);
		}
	// Promenades and retaining walls frame the water.
	for (const z of [13.3, 34.7]) {
		box(root, 0x8f9c88, 0, -0.25, z, 220, 1.2, 1.4);
		box(root, CREAM, 0, 0.45, z, 220, 0.22, 1.6);
		for (let x = -104; x < 108; x += 5) {
			if (Math.abs(x) < 7) continue;
			cyl(root, TEAL, x, 1, z, 0.07, 1.2);
			beam(
				root,
				TEAL,
				new THREE.Vector3(x, 0.95, z),
				new THREE.Vector3(x + 4, 0.95, z),
				0.055,
			);
		}
	}
	const water = new THREE.Mesh(
		new THREE.PlaneGeometry(220, 20),
		new THREE.MeshBasicMaterial({
			color: 0x438f9d,
			transparent: true,
			opacity: 0.94,
		}),
	);
	water.rotation.x = -Math.PI / 2;
	water.position.set(0, -0.65, 24);
	root.add(water);
	for (let i = 0; i < 70; i++) {
		const rand = seeded(99 + i),
			x = rand() * 216 - 108,
			z = 15 + rand() * 18;
		box(
			root,
			i % 3 ? 0x7bb1ae : 0xb7c8af,
			x,
			-0.6,
			z,
			1 + rand() * 4,
			0.02,
			0.12,
			false,
		);
	}
	// Restorable bridge: three distinct steel truss sections.
	const bridgeSlots = [];
	for (let i = 0; i < 3; i++) {
		const slot = createBridgeSection();
		slot.position.set(0, 0, 17.333 + i * 6.667);
		slot.visible = false;
		root.add(slot);
		bridgeSlots.push(slot);
		const outline = new THREE.Mesh(
			new THREE.BoxGeometry(9, 0.07, 6.15),
			new THREE.MeshBasicMaterial({
				color: 0xf0c968,
				wireframe: true,
				transparent: true,
				opacity: 0.55,
			}),
		);
		outline.position.set(0, 0.35, 17.333 + i * 6.667);
		root.add(outline);
	}
	for (const z of [11, 37]) {
		box(root, 0x627d77, 0, 0.1, z, 11, 0.4, 5);
		for (const x of [-5, 5]) {
			box(root, CREAM, x, 2.3, z, 1.2, 4.6, 1.2);
			orb(root, GOLD, x, 4.9, z, 0.6);
		}
	}
	const bridgeLabel = makeLabel("MEMORIAL BRIDGE", { width: 14, height: 1.9 });
	bridgeLabel.position.set(0, 6, 13);
	root.add(bridgeLabel);
	// Buildings sit in deterministic lots and leave all key locations clear.
	let index = 0;
	const palettes = [0xcb985f, 0xd2b17b, 0x739a91, 0xb8775d, 0xa5ae91, 0xdfc69a];
	for (const z of [-79, -53, -22, 59, 87])
		for (const x of [-83, -52, -22, 18, 48, 81]) {
			if (
				Object.values(landmarks).some((l) => Math.hypot(l.x - x, l.z - z) < 18)
			)
				continue;
			const r = seeded(index * 1987 + 3),
				w = 12 + r() * 5,
				d = 10 + r() * 4,
				h = 7 + r() * 16;
			building(root, x, z, w, d, h, palettes[index % palettes.length], index);
			colliders.push({ x, y: h / 2, z, w, h, d });
			index++;
		}
	// A second skyline beyond the playable blocks, matte like printed scenery.
	for (let i = 0; i < 25; i++) {
		const r = seeded(1000 + i),
			x = -145 + i * 12,
			h = 20 + r() * 46;
		box(root, 0xaab8ab, x, h / 2, -135 - r() * 9, 9 + r() * 10, h, 10);
		if (i % 4 === 0) box(root, 0xc7ccb3, x, h + 3, -135, 4, 6, 4);
	}
	// Central plaza: concentric paving, trees, a civic sculpture.
	const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 48), mat(0xe6cea0));
	plaza.rotation.x = -Math.PI / 2;
	plaza.position.set(-22, 0.09, -1);
	root.add(plaza);
	const ring = createRing(0xbc9c68, 9.6);
	ring.position.set(-22, 0, -1);
	root.add(ring);
	// Phone booth; open approach toward camera.
	const booth = new THREE.Group();
	booth.position.copy(landmarks.booth);
	box(booth, INK, 0, 0.12, 0, 2.8, 0.24, 2.8);
	for (const x of [-1.15, 1.15])
		for (const z of [-1.15, 1.15]) box(booth, CORAL, x, 2, z, 0.16, 4, 0.16);
	for (const z of [-1.15, 1.15]) box(booth, CORAL, 0, 4.15, z, 2.7, 0.6, 0.2);
	for (const x of [-1.15, 1.15]) box(booth, CORAL, x, 4.15, 0, 0.2, 0.6, 2.7);
	box(booth, CORAL, 0, 4.5, 0, 2.9, 0.18, 2.9);
	box(booth, 0x99b5a7, 0, 1.95, -1.14, 2.2, 3.6, 0.05, false);
	for (const x of [-1.15, 1.15])
		box(booth, 0x94b6ae, x, 1.95, 0, 0.05, 3.6, 2.2, false);
	box(booth, INK, 0, 2, -0.9, 0.65, 1.25, 0.3);
	box(booth, CREAM, 0, 2.2, -0.7, 0.45, 0.25, 0.12);
	for (const y of [1.3, 2.5, 3.6]) {
		box(booth, CORAL, 0, y, -1.18, 2.3, 0.08, 0.08);
		for (const x of [-1.15, 1.15]) box(booth, CORAL, x, y, 0, 0.08, 0.08, 2.3);
	}
	addSign(booth, "CHANGE", 0, 4.18, 1.27, 2.3, 0.43);
	root.add(booth);
	// Art deco jail: a blue-green civic block with barred intake.
	const jail = new THREE.Group();
	jail.position.copy(landmarks.jail);
	box(jail, TEAL, 0, 4, -5, 16, 8, 9);
	box(jail, CREAM, 0, 8.3, -5, 17, 0.6, 10);
	box(jail, 0x2f6267, 0, 9.3, -6, 10, 1.4, 6);
	for (const x of [-7, 7]) box(jail, CREAM, x, 4.3, -0.1, 1, 8.6, 1);
	box(jail, INK, 0, 2, -0.38, 6.7, 4, 0.2);
	for (let x = -3; x <= 3; x += 0.75)
		cyl(jail, 0xe5d8b7, x, 2, -0.12, 0.065, 4);
	for (const y of [0.7, 3.2]) box(jail, CREAM, 0, y, -0.05, 6.5, 0.12, 0.12);
	addSign(jail, "CIVIC JAIL", 0, 6.1, -0.35, 11, 1.8);
	for (const x of [-5.4, 5.4])
		box(jail, 0x2a5159, x, 3.2, -0.35, 1.5, 2.1, 0.1);
	root.add(jail);
	colliders.push({ x: -52, y: 4, z: -45, w: 16, h: 8, d: 9 });
	// Daily Dispatch landmark tower, rooftop globe and animated rings.
	const news = new THREE.Group();
	news.position.copy(landmarks.newsroom);
	box(news, 0xd7ba86, 0, 7, -6, 19, 14, 12);
	box(news, CREAM, 0, 14.3, -6, 20, 0.6, 13);
	box(news, 0x80a19a, 0, 19, -7, 12, 9, 9);
	box(news, CREAM, 0, 23.8, -7, 13, 0.6, 10);
	for (let y = 3; y < 22; y += 3)
		for (let x = -7; x <= 7; x += 3.5) {
			if (y > 14 && Math.abs(x) > 4) continue;
			box(news, 0x355d69, x, y, y > 14 ? -2.45 : 0.05, 1.5, 1.4, 0.12, false);
		}
	box(news, INK, 0, 1.8, 0.1, 4.7, 3.6, 0.18);
	box(news, CORAL, 0, 4.3, 1, 9, 0.3, 2.6);
	addSign(news, "DAILY DISPATCH", 0, 12, 0.15, 17, 2.1);
	cyl(news, INK, 0, 25.5, -7, 0.2, 3);
	const globe = new THREE.Group();
	globe.position.set(0, 29, -7);
	const globeMesh = orb(globe, GOLD, 0, 0, 0, 3.5);
	for (const tilt of [0, Math.PI / 2]) {
		const t = new THREE.Mesh(
			new THREE.TorusGeometry(3.6, 0.065, 5, 48),
			mat(INK),
		);
		t.rotation.y = tilt;
		globe.add(t);
	}
	const band = new THREE.Mesh(
		new THREE.TorusGeometry(4.25, 0.16, 6, 48),
		mat(CORAL),
	);
	band.rotation.x = 1.05;
	globe.add(band);
	news.add(globe);
	dynamic.push((t) => {
		globe.rotation.y = t * 0.13;
	});
	root.add(news);
	colliders.push({ x: 48, y: 7, z: -51, w: 19, h: 14, d: 12 });
	// Subway portals make wayfinding legible from the air.
	for (const [key, label] of [
		["subwayWest", "WEST LINE"],
		["subwayEast", "EAST LINE"],
	]) {
		const g = new THREE.Group();
		g.position.copy(landmarks[key]);
		box(g, INK, 0, 0.16, 0, 5, 0.3, 4);
		box(g, 0x304a51, 0, 0.18, 0, 3.4, 0.07, 3.1);
		for (const x of [-2, 2]) {
			cyl(g, TEAL, x, 1.3, 0, 0.09, 2.6);
			cyl(g, TEAL, x, 1.3, -1.6, 0.09, 2.6);
			beam(
				g,
				TEAL,
				new THREE.Vector3(x, 2.5, 0),
				new THREE.Vector3(x, 2.5, -1.6),
				0.1,
			);
		}
		for (let i = 0; i < 4; i++)
			box(g, 0xb2ad8d, 0, 0.12 - i * 0.045, -1.1 + i * 0.6, 3.4, 0.1, 0.35);
		cyl(g, TEAL, 2, 2.5, -2, 0.13, 5);
		orb(g, GOLD, 2, 5, -2, 0.45);
		const s = makeLabel(label, { width: 6, height: 1.25 });
		s.position.set(0, 3.9, -0.3);
		g.add(s);
		root.add(g);
	}
	// Mina keeps the city desk open in the little park.
	const mina = createEntity("reporter");
	mina.position.copy(landmarks.reporter);
	root.add(mina);
	const minaRing = createRing(0x64c5bd, 3.1);
	minaRing.position.copy(landmarks.reporter);
	root.add(minaRing);
	const minaSign = makeLabel("MINA · CITY DESK", { width: 9, height: 1.35 });
	minaSign.position.copy(landmarks.reporter).add(new THREE.Vector3(0, 5, 0));
	root.add(minaSign);
	// Reporter park and newsstand.
	for (const [x, z] of [
		[-35, -14],
		[-46, -8],
		[-27, -12],
		[-78, 5],
		[-51, 8],
		[18, 10],
		[43, 9],
		[78, -5],
		[-18, 43],
		[19, 44],
		[47, 43],
		[78, 45],
		[-79, 73],
		[-50, 74],
		[18, 75],
		[48, 75],
	])
		tree(root, x, z, 0.85 + (Math.abs(x) % 3) * 0.1);
	bench(root, -35, -12);
	bench(root, 20, 8, Math.PI / 2);
	bench(root, 45, 40);
	for (let x = -98; x < 100; x += 19) {
		lamp(root, x, 7);
		lamp(root, x, 40);
		if (Math.abs(x) > 20) {
			tree(root, x, 10, 0.7);
			tree(root, x, 39, 0.7);
		}
	}
	const stand = new THREE.Group();
	stand.position.set(-43, 0, -3);
	box(stand, TEAL, 0, 1.3, 0, 3.3, 2.6, 2.2);
	box(stand, CORAL, 0, 2.7, 0.3, 4, 0.2, 3.1);
	addSign(stand, "NEWS • 5¢", 0, 2, 1.15, 2.8, 0.65);
	for (let i = 0; i < 4; i++)
		box(stand, CREAM, -1.15 + i * 0.75, 1.2, 1.18, 0.6, 0.75, 0.06);
	root.add(stand);
	const cars = [];
	for (const [x, z, c, r] of [
		[-84, -1, 0xdba44c, Math.PI / 2],
		[-18, -38, CORAL, Math.PI / 2],
		[31, -64, 0xe3ddbd, 0],
		[66, 65, 0x467b7b, 0],
		[-57, 46, 0xc96f50, Math.PI / 2],
		[48, 73, 0xdba44c, Math.PI / 2],
		[-68, -76, 0x537e84, 0],
	])
		cars.push(car(root, x, z, c, r));
	// Direction pennants and tiny rooftop print details.
	for (const [x, z, text] of [
		[-42, -27, "JAIL"],
		[34, -27, "PRESS"],
		[-12, 9, "BRIDGE"],
	]) {
		cyl(root, INK, x, 2, z, 0.08, 4);
		const s = makeLabel(text, { width: 4, height: 1 });
		s.position.set(x, 3.4, z);
		root.add(s);
	}
	const clouds = [];
	for (let i = 0; i < 12; i++) {
		const rand = seeded(700 + i),
			g = new THREE.Group();
		g.position.set(rand() * 340 - 170, 45 + rand() * 28, -85 - rand() * 70);
		for (let j = 0; j < 4; j++)
			orb(g, 0xe9dfbd, j * 5, Math.sin(j) * 1.4, 0, 3.5 + rand() * 2, false);
		root.add(g);
		clouds.push(g);
	}
	return {
		root,
		colliders,
		landmarks,
		bridgeSlots,
		cars,
		update(dt, time) {
			for (const fn of dynamic) fn(time);
			for (const item of entityAnimations)
				if (item.group.parent && item.group.visible) item.update(dt, time);
			for (let i = 0; i < clouds.length; i++)
				clouds[i].position.x += dt * (0.1 + i * 0.015);
		},
		resetBridge() {
			bridgeSlots.forEach((g) => (g.visible = false));
		},
	};
}

function createBridgeSection() {
	const g = new THREE.Group();
	box(g, 0xc9b982, 0, 0.4, 0, 9, 0.45, 6.6);
	box(g, 0x627c7b, 0, 0.67, 0, 7.8, 0.06, 6.6, false);
	for (let z = -2.7; z < 3; z += 2)
		box(g, CREAM, 0, 0.72, z, 0.13, 0.02, 0.9, false);
	for (const x of [-4.5, 4.5]) {
		for (const y of [0.8, 3.3]) box(g, GOLD, x, y, 0, 0.16, 0.16, 6.7);
		for (let j = 0; j < 3; j++) {
			const z = -3.3 + j * 3.3;
			beam(
				g,
				GOLD,
				new THREE.Vector3(x, 0.8, z),
				new THREE.Vector3(x, 3.3, z + 1.65),
				0.11,
			);
			beam(
				g,
				GOLD,
				new THREE.Vector3(x, 3.3, z + 1.65),
				new THREE.Vector3(x, 0.8, z + 3.3),
				0.11,
			);
		}
	}
	return g;
}
function createPerson({
	suit = 0x347cb5,
	cape = true,
	skin = 0xdca576,
	hair = INK,
	mask = false,
} = {}) {
	const group = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "rig";
	group.add(rig);
	const torso = new THREE.Group();
	torso.name = "torso";
	torso.position.y = 2.15;
	rig.add(torso);
	box(torso, suit, 0, 0.15, 0, 1.3, 1.35, 0.7);
	box(torso, GOLD, 0, -0.45, 0.02, 1.34, 0.15, 0.73);
	const head = new THREE.Group();
	head.name = "head";
	head.position.y = 3.25;
	rig.add(head);
	box(head, skin, 0, 0, 0, 0.8, 0.95, 0.75);
	box(head, hair, 0, 0.45, -0.05, 0.88, 0.26, 0.81);
	box(head, hair, -0.34, 0.19, -0.1, 0.2, 0.4, 0.75);
	box(head, hair, 0.3, 0.28, -0.05, 0.25, 0.3, 0.7);
	box(head, 0xf7d0a1, 0, -0.1, 0.42, 0.16, 0.2, 0.16);
	box(head, INK, -0.2, 0.12, 0.39, 0.14, 0.08, 0.04, false);
	box(head, INK, 0.2, 0.12, 0.39, 0.14, 0.08, 0.04, false);
	box(head, INK, 0, -0.28, 0.4, 0.28, 0.045, 0.04, false);
	if (mask) box(head, INK, 0, 0.1, 0.39, 0.7, 0.2, 0.06);
	const chest = new THREE.Mesh(new THREE.CircleGeometry(0.38, 4), mat(GOLD));
	chest.position.set(0, 2.4, 0.365);
	chest.rotation.z = Math.PI / 4;
	rig.add(chest);
	const boltShape = new THREE.Shape();
	boltShape.moveTo(0.06, 0.25);
	boltShape.lineTo(-0.2, -0.05);
	boltShape.lineTo(-0.02, -0.05);
	boltShape.lineTo(-0.08, -0.27);
	boltShape.lineTo(0.19, 0.09);
	boltShape.lineTo(0.02, 0.09);
	boltShape.closePath();
	const bolt = new THREE.Mesh(new THREE.ShapeGeometry(boltShape), mat(CORAL));
	bolt.position.set(0, 2.4, 0.38);
	rig.add(bolt);
	const limbs = {};
	for (const [key, x, y] of [
		["armL", -0.86, 2.65],
		["armR", 0.86, 2.65],
		["legL", -0.36, 1.58],
		["legR", 0.36, 1.58],
	]) {
		const p = new THREE.Group();
		p.name = key;
		p.position.set(x, y, 0);
		const arm = key.startsWith("arm");
		box(p, suit, 0, -0.5, 0, arm ? 0.42 : 0.48, 1.1, arm ? 0.45 : 0.5);
		box(
			p,
			arm ? skin : CORAL,
			0,
			-1.13,
			arm ? 0.02 : 0.14,
			arm ? 0.4 : 0.5,
			arm ? 0.36 : 0.65,
			arm ? 0.42 : 0.8,
		);
		rig.add(p);
		limbs[key] = p;
	}
	const capePivot = new THREE.Group();
	capePivot.name = "cape";
	capePivot.position.set(0, 2.85, -0.4);
	const capeShape = new THREE.Shape();
	capeShape.moveTo(-0.6, 0);
	capeShape.lineTo(0.6, 0);
	capeShape.lineTo(1.05, -2.3);
	capeShape.quadraticCurveTo(0.1, -2.1, -0.95, -2.3);
	capeShape.closePath();
	const cg = new THREE.ShapeGeometry(capeShape);
	const cm = new THREE.Mesh(
		cg,
		new THREE.MeshBasicMaterial({ color: CORAL, side: THREE.DoubleSide }),
	);
	cm.add(new THREE.LineSegments(new THREE.EdgesGeometry(cg), inkmat));
	capePivot.add(cm);
	rig.add(capePivot);
	capePivot.visible = cape;
	return { group, rig, torso, head, cape: capePivot, limbs, chest, bolt };
}
export function createHero(c = 0x2c79b0) {
	const p = createPerson({ suit: c }),
		{ group, rig, cape, limbs } = p;
	const mixer = new THREE.AnimationMixer(group);
	const times = [0, 0.25, 0.5, 0.75, 1];
	const idle = new THREE.AnimationClip("Idle", 2, [
		new THREE.NumberKeyframeTrack(
			"torso.position[y]",
			[0, 1, 2],
			[2.15, 2.19, 2.15],
		),
		new THREE.NumberKeyframeTrack(
			"cape.rotation[x]",
			[0, 0.5, 1, 1.5, 2],
			[0.08, 0.16, 0.1, 0.18, 0.08],
		),
	]);
	const walk = new THREE.AnimationClip("Stride", 0.8, [
		new THREE.NumberKeyframeTrack(
			"legL.rotation[x]",
			[0, 0.2, 0.4, 0.6, 0.8],
			[0.55, 0, -0.55, 0, 0.55],
		),
		new THREE.NumberKeyframeTrack(
			"legR.rotation[x]",
			[0, 0.2, 0.4, 0.6, 0.8],
			[-0.55, 0, 0.55, 0, -0.55],
		),
		new THREE.NumberKeyframeTrack(
			"armL.rotation[x]",
			[0, 0.2, 0.4, 0.6, 0.8],
			[-0.5, 0, 0.5, 0, -0.5],
		),
		new THREE.NumberKeyframeTrack(
			"armR.rotation[x]",
			[0, 0.2, 0.4, 0.6, 0.8],
			[0.5, 0, -0.5, 0, 0.5],
		),
	]);
	const flight = new THREE.AnimationClip("Flight", 1, [
		new THREE.NumberKeyframeTrack(
			"armL.rotation[x]",
			[0, 0.5, 1],
			[-2.8, -2.72, -2.8],
		),
		new THREE.NumberKeyframeTrack(
			"armR.rotation[x]",
			[0, 0.5, 1],
			[-2.8, -2.75, -2.8],
		),
		new THREE.NumberKeyframeTrack(
			"legL.rotation[x]",
			[0, 0.5, 1],
			[0.18, 0.28, 0.18],
		),
		new THREE.NumberKeyframeTrack(
			"legR.rotation[x]",
			[0, 0.5, 1],
			[0.3, 0.2, 0.3],
		),
		new THREE.NumberKeyframeTrack(
			"cape.rotation[x]",
			[0, 0.25, 0.5, 0.75, 1],
			[0.55, 0.75, 0.6, 0.8, 0.55],
		),
	]);
	const actions = {
		idle: mixer.clipAction(idle),
		walk: mixer.clipAction(walk),
		flight: mixer.clipAction(flight),
	};
	Object.values(actions).forEach((a) => a.play());
	actions.walk.setEffectiveWeight(0);
	actions.flight.setEffectiveWeight(0);
	const reporter = createPerson({ suit: 0x77624d, cape: false });
	reporter.group.visible = false;
	reporter.chest.visible = false;
	reporter.bolt.visible = false;
	reporter.group.name = "reporterOutfit";
	group.add(reporter.group);
	box(reporter.head, INK, 0, 0.12, 0.435, 0.7, 0.1, 0.045);
	box(reporter.torso, CREAM, 0, 0.35, 0.37, 0.25, 0.9, 0.02);
	box(reporter.torso, CORAL, 0, 0.25, 0.4, 0.07, 0.55, 0.03);
	let blend = 0,
		moveBlend = 0;
	return {
		group,
		mixer,
		actions,
		rig,
		update(
			dt,
			{
				flying = false,
				moving = false,
				carrying = false,
				reporter: reporterMode = false,
				weak = false,
			} = {},
		) {
			blend = THREE.MathUtils.damp(blend, flying ? 1 : 0, 8, dt);
			moveBlend = THREE.MathUtils.damp(
				moveBlend,
				moving && !flying ? 1 : 0,
				10,
				dt,
			);
			actions.idle.setEffectiveWeight(1 - blend);
			actions.walk.setEffectiveWeight(moveBlend * (1 - blend));
			actions.flight.setEffectiveWeight(blend);
			mixer.update(dt);
			rig.rotation.x = blend * 0.82;
			rig.position.y = blend * 0.3;
			rig.visible = !reporterMode;
			reporter.group.visible = reporterMode;
			reporter.limbs.legL.rotation.x =
				Math.sin(mixer.time * 9) * 0.4 * moveBlend;
			reporter.limbs.legR.rotation.x =
				-Math.sin(mixer.time * 9) * 0.4 * moveBlend;
			reporter.limbs.armL.rotation.x =
				-Math.sin(mixer.time * 9) * 0.3 * moveBlend;
			reporter.limbs.armR.rotation.x =
				Math.sin(mixer.time * 9) * 0.3 * moveBlend;
			if (carrying && !flying) {
				limbs.armL.rotation.x = -1.2;
				limbs.armR.rotation.x = -1.2;
			}
			if (weak) rig.rotation.z = Math.sin(mixer.time * 8) * 0.04;
			else rig.rotation.z = 0;
		},
	};
}
export function createEntity(type, index = 0) {
	let g = new THREE.Group();
	g.userData.type = type;
	if (type === "girder") {
		g = createBridgeSection();
		g.scale.set(0.55, 0.55, 0.55);
		g.position.y = 0.2;
		box(g, GOLD, 0, 1.7, 0, 1.8, 0.5, 1.7);
		g.userData.type = type;
		return g;
	}
	if (type === "crook" || type === "mastermind") {
		const p = createPerson({
			suit:
				type === "mastermind"
					? 0x807653
					: [0x84678d, 0xb3684f, 0x537b73, 0x9f8057, 0x757c8c][index % 5],
			cape: false,
			skin: type === "mastermind" ? 0xd8aa77 : 0xdca77d,
			hair: type === "mastermind" ? 0xc7a177 : INK,
			mask: type === "crook",
		});
		g = p.group;
		p.chest.visible = false;
		p.bolt.visible = false;
		if (type === "mastermind") {
			p.head.children[1].visible = false;
			p.head.children[2].visible = false;
			p.head.children[3].visible = false;
			box(p.torso, GOLD, 0, 0.2, 0.4, 0.4, 0.8, 0.15);
			const pack = box(p.torso, INK, 0, 0.2, -0.65, 1.1, 1, 0.5);
			for (const x of [-0.4, 0.4])
				cyl(p.torso, 0xb5ba9b, x, -0.3, -0.68, 0.2, 1.4);
		} else {
			box(p.head, INK, 0, 0.61, 0, 1.1, 0.16, 1.1);
			box(p.head, INK, 0, 0.8, -0.05, 0.75, 0.35, 0.7);
			box(p.torso, INK, 0, 0.05, 0.4, 0.12, 1, 0.06);
			box(p.group, 0x87624b, 0.8, 0.85, 0.3, 0.7, 0.85, 0.65);
		}
		g.userData.parts = p;
		g.userData.type = type;
		let last = new THREE.Vector3();
		animateEntity(g, (dt, time) => {
			const speed = Math.min(
				1,
				g.position.distanceTo(last) / Math.max(dt, 0.001),
			);
			last.copy(g.position);
			p.limbs.legL.rotation.x = Math.sin(time * 8 + index) * 0.45 * speed;
			p.limbs.legR.rotation.x = -Math.sin(time * 8 + index) * 0.45 * speed;
			p.limbs.armL.rotation.x = -Math.sin(time * 8 + index) * 0.35 * speed;
			p.limbs.armR.rotation.x = Math.sin(time * 8 + index) * 0.35 * speed;
		});
		return g;
	}
	if (type === "citizen") {
		const p = createPerson({
			suit: index % 2 ? 0x9aa68a : 0xd7a352,
			cape: false,
			hair: index % 2 ? 0xd8d0b7 : 0x513f31,
			skin: index % 2 ? 0xb77e58 : 0xe0ad82,
		});
		g = p.group;
		p.chest.visible = false;
		p.bolt.visible = false;
		for (const leg of [p.limbs.legL, p.limbs.legR]) {
			leg.children[1].material = mat(index % 2 ? 0x596a68 : 0x735a44);
		}
		box(p.torso, CREAM, 0, 0.38, 0.38, 0.4, 0.9, 0.04);
		box(p.torso, index % 2 ? TEAL : CORAL, 0, 0.3, 0.42, 0.09, 0.56, 0.04);
		if (index % 2) {
			const paper = box(g, CREAM, 0.85, 1.3, 0.35, 0.72, 0.9, 0.07);
			for (let i = 0; i < 4; i++)
				box(g, INK, 0.85, 1.5 - i * 0.13, 0.395, 0.5, 0.035, 0.012, false);
		} else {
			cyl(p.head, TEAL, 0, 0.6, 0, 0.57, 0.14);
			cyl(p.head, TEAL, 0, 0.73, 0, 0.4, 0.22);
			box(g, 0x85623f, 0.85, 0.9, 0.15, 0.65, 0.85, 0.5);
		}
		p.limbs.armL.rotation.z = 0.2;
		g.userData.parts = p;
		g.userData.type = type;
		animateEntity(g, (dt, time) => {
			p.limbs.armR.rotation.x = -2.55 + Math.sin(time * 3 + index) * 0.14;
			p.limbs.armR.rotation.z = -0.3 + Math.sin(time * 5 + index) * 0.15;
			p.head.rotation.y = Math.sin(time * 0.8 + index) * 0.2;
		});
		return g;
	}
	if (type === "reporter") {
		const p = createPerson({ suit: 0xe5b957, cape: false, hair: 0x50362e });
		g = p.group;
		p.chest.visible = false;
		p.bolt.visible = false;
		box(p.head, 0x50362e, 0, -0.1, -0.4, 0.9, 1.15, 0.3);
		box(p.torso, CREAM, 0, 0.4, 0.4, 0.4, 0.35, 0.06);
		box(g, INK, 0.85, 1.6, 0.5, 0.65, 0.45, 0.4);
		orb(g, 0x7894a0, 0.85, 1.6, 0.75, 0.17);
		g.userData.type = type;
		animateEntity(g, (dt, time) => {
			p.head.rotation.y = Math.sin(time * 0.7) * 0.18;
			p.limbs.armR.rotation.x = -0.55 + Math.sin(time * 1.7) * 0.12;
		});
		return g;
	}
	if (type === "satellite") {
		orb(g, 0x90d15c, 0, 1.5, 0, 0.82);
		const core = orb(g, 0xd9ed87, 0, 1.5, 0.2, 0.35, false);
		for (let i = 0; i < 3; i++) {
			const ring = new THREE.Mesh(
				new THREE.TorusGeometry(1.3, 0.09, 5, 24),
				mat(INK),
			);
			ring.rotation.set((i * Math.PI) / 3, (i * Math.PI) / 4, 0);
			ring.position.y = 1.5;
			g.add(ring);
		}
		for (const x of [-1, 1]) {
			box(g, 0x416b59, x * 2.2, 1.5, 0, 1.3, 0.12, 1.7);
			box(g, 0x99be6c, x * 2.2, 1.58, 0, 1.15, 0.03, 1.5, false);
			beam(
				g,
				INK,
				new THREE.Vector3(x * 0.5, 1.5, 0),
				new THREE.Vector3(x * 1.6, 1.5, 0),
				0.09,
			);
		}
		g.userData.type = type;
		return g;
	}
	if (type === "helicopter") {
		const body = orb(g, CORAL, 0, 0, 0, 1.5);
		body.scale.set(1, 0.9, 1.6);
		const glass = orb(g, 0x74a2a3, 0, 0.2, 1.3, 1.13);
		glass.scale.set(0.95, 0.8, 0.8);
		box(g, CREAM, 0, -0.45, 0, 2.9, 0.22, 3);
		const tail = box(g, CORAL, 0, 0.3, -3, 0.45, 0.5, 4);
		box(g, CORAL, 0, 1.2, -4.8, 0.15, 2.2, 1);
		const rotor = new THREE.Group();
		rotor.name = "rotor";
		rotor.position.y = 1.8;
		cyl(rotor, INK, 0, 0, 0, 0.1, 1);
		box(rotor, INK, 0, 0.5, 0, 8, 0.1, 0.35);
		box(rotor, INK, 0, 0.5, 0, 0.35, 0.1, 8);
		g.add(rotor);
		for (const x of [-1.25, 1.25]) {
			beam(
				g,
				INK,
				new THREE.Vector3(x * 0.7, -0.8, 1),
				new THREE.Vector3(x, -1.7, 1),
				0.08,
			);
			beam(
				g,
				INK,
				new THREE.Vector3(x * 0.7, -0.8, -1),
				new THREE.Vector3(x, -1.7, -1),
				0.08,
			);
			box(g, INK, x, -1.7, 0, 0.12, 0.15, 4);
		}
		addSign(g, "PRESS", 0, 0, 2.04, 1.8, 0.55);
		g.userData.rotor = rotor;
		g.userData.type = type;
		animateEntity(g, (dt, time) => {
			rotor.rotation.y += dt * 32;
			g.rotation.z = Math.sin(time * 2) * 0.035;
		});
		return g;
	}
	return g;
}
