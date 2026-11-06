import * as THREE from "three";

const INK = 0x09252b;
const mats = new Map();
function mat(color, emissive = 0) {
	const key = color + ":" + emissive;
	if (!mats.has(key))
		mats.set(
			key,
			new THREE.MeshStandardMaterial({
				color,
				roughness: 1,
				metalness: 0,
				flatShading: true,
				emissive,
				emissiveIntensity: emissive ? 0.42 : 0,
			}),
		);
	return mats.get(key);
}
const inkMat = new THREE.MeshBasicMaterial({
	color: INK,
	side: THREE.BackSide,
});
function mesh(
	g,
	color,
	parent,
	x = 0,
	y = 0,
	z = 0,
	outline = false,
	emissive = 0,
) {
	let m = new THREE.Mesh(g, mat(color, emissive));
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	parent.add(m);
	if (outline) {
		let o = new THREE.Mesh(g, inkMat);
		o.scale.setScalar(1.065);
		m.add(o);
	}
	return m;
}
function box(parent, w, h, d, c, x = 0, y = 0, z = 0, outline = false) {
	return mesh(new THREE.BoxGeometry(w, h, d), c, parent, x, y, z, outline);
}
function ball(
	parent,
	r,
	c,
	x = 0,
	y = 0,
	z = 0,
	scale = [1, 1, 1],
	outline = false,
) {
	let m = mesh(
		new THREE.IcosahedronGeometry(r, 1),
		c,
		parent,
		x,
		y,
		z,
		outline,
	);
	m.scale.set(...scale);
	return m;
}
function rod(parent, a, b, r, c, segments = 7) {
	let av = new THREE.Vector3(...a),
		bv = new THREE.Vector3(...b),
		d = bv.clone().sub(av);
	let m = mesh(
		new THREE.CylinderGeometry(r, r * 0.92, d.length(), segments),
		c,
		parent,
	);
	m.position.copy(av.add(bv).multiplyScalar(0.5));
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
	return m;
}
function rand(seed = 12345) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function fern(parent, x, y, z, size = 1, seed = 1) {
	let r = rand(seed),
		g = new THREE.Group();
	g.position.set(x, y, z);
	g.scale.setScalar(size);
	parent.add(g);
	for (let k = 0; k < 5; k++) {
		let angle = (k - 2) * 0.38,
			tip = [Math.sin(angle) * 1.5, Math.cos(angle) * 1.5, 0.02];
		rod(g, [0, 0, 0], tip, 0.026, 0x4c7954);
		for (let j = 1; j < 7; j++) {
			let t = j / 7;
			for (let side of [-1, 1]) {
				let leaf = ball(
					g,
					0.4,
					[0x487b51, 0x65a05e, 0x36735b][Math.floor(r() * 3)],
					tip[0] * t + side * 0.14,
					tip[1] * t,
					0,
					[0.85 * (1 - t * 0.6), 0.2, 0.18],
				);
				leaf.rotation.z = angle + side * 0.6;
			}
		}
	}
	return g;
}
function hangingVine(parent, x, y, z, length, seed) {
	let r = rand(seed);
	let g = new THREE.Group();
	parent.add(g);
	g.position.set(x, y, z);
	let prev = [0, 0, 0];
	for (let i = 1; i <= Math.ceil(length / 0.45); i++) {
		let t = i * 0.45,
			next = [Math.sin(t * 0.7) * 0.23, -t, Math.cos(t * 0.5) * 0.1];
		rod(g, prev, next, 0.025, 0x376349);
		if (i % 2 === 0) {
			for (let s of [-1, 1]) {
				let l = ball(
					g,
					0.22,
					0x4d8558,
					next[0] + s * 0.16,
					next[1] + 0.05,
					next[2],
					[1.3, 0.5, 0.18],
				);
				l.rotation.z = s * 0.55;
			}
		}
		prev = next;
	}
	return g;
}
function stalactite(parent, x, y, z, h, w, c) {
	let m = mesh(
		new THREE.ConeGeometry(w, h, 5),
		c,
		parent,
		x,
		y - h / 2,
		z,
		true,
	);
	m.rotation.z = Math.PI;
	m.rotation.y = x * 0.3;
	return m;
}
function arch(parent, x, y, z, w, h, color) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	parent.add(g);
	let depth = 0.9;
	for (let side of [-1, 1]) {
		for (let i = 0; i < Math.ceil(h); i++) {
			let b = box(
				g,
				w * 0.2,
				0.94,
				depth,
				color,
				side * w * 0.47,
				i + 0.45,
				0,
				true,
			);
			b.rotation.z = i % 2 ? 0.008 : -0.008;
		}
	}
	let crown = box(g, w * 1.16, 0.65, depth * 1.15, color, 0, h + 0.12, 0, true);
	for (let i = -1; i <= 1; i++)
		box(g, 0.65, 0.5, depth * 1.12, 0xc09c67, i * 0.9, h + 0.64, 0, true);
	let shape = new THREE.Shape();
	shape.moveTo(-w * 0.32, 0);
	shape.lineTo(w * 0.32, 0);
	shape.lineTo(w * 0.32, h - 0.4);
	shape.lineTo(0, h + 0.1);
	shape.lineTo(-w * 0.32, h - 0.4);
	shape.closePath();
	let opening = new THREE.Mesh(
		new THREE.ShapeGeometry(shape),
		new THREE.MeshBasicMaterial({ color: 0x102f33 }),
	);
	opening.position.z = -0.48;
	g.add(opening);
	return g;
}
function rune(parent, x, y, z, scale = 1, color = 0x7fe6c5) {
	let g = new THREE.Group();
	g.position.set(x, y, z);
	g.scale.setScalar(scale);
	parent.add(g);
	for (let [a, b] of [
		[
			[-0.3, 0, 0],
			[0, 0.5, 0],
		],
		[
			[0, 0.5, 0],
			[0.3, 0, 0],
		],
		[
			[0.3, 0, 0],
			[0, -0.5, 0],
		],
		[
			[0, -0.5, 0],
			[-0.3, 0, 0],
		],
		[
			[0, -0.2, 0],
			[0, 0.2, 0],
		],
	])
		rod(g, a, b, 0.035, color, 4);
	return g;
}
function torch(parent, x, y, z) {
	rod(parent, [x, y, z], [x, y + 0.6, z], 0.09, 0x4b4030);
	let fire = ball(parent, 0.23, 0xffd97b, x, y + 0.8, z, [0.8, 1.6, 0.7]);
	fire.material = mat(0xffdc79, 0xffaa22);
	let light = new THREE.PointLight(0xffa84a, 6, 8, 2);
	light.position.set(x, y + 0.8, z + 0.8);
	parent.add(light);
	return fire;
}

export function buildWorld(scene) {
	const group = new THREE.Group();
	group.name = "Cavern illustration";
	scene.add(group);
	const r = rand(1984),
		animated = [],
		torches = [];
	// Broad strata and distant, broken walls establish the underground cutaway.
	box(group, 160, 85, 2, 0x0d3036, 53, -15, -22);
	for (let layer = 0; layer < 3; layer++) {
		const points = [];
		for (let x = -20; x <= 135; x += 3)
			points.push([x, 12.4 + layer * 2.1 + r() * 3]);
		const shape = new THREE.Shape();
		shape.moveTo(-20, 30);
		shape.lineTo(135, 30);
		for (let i = points.length - 1; i >= 0; i--) shape.lineTo(...points[i]);
		shape.closePath();
		let m = new THREE.Mesh(
			new THREE.ShapeGeometry(shape),
			mat([0x123d40, 0x174649, 0x1e5150][layer]),
		);
		m.position.z = -14 + layer * 3;
		group.add(m);
	}
	// Far geological facets with softly contrasting cool and amber faces.
	for (let i = 0; i < 150; i++) {
		let x = -18 + r() * 154,
			y = -42 + r() * 60;
		let rock = mesh(
			new THREE.IcosahedronGeometry(1 + r() * 3.4, 0),
			[0x164047, 0x1c494c, 0x205451, 0x123a40, 0x2a5754][i % 5],
			group,
			x,
			y,
			-13 + r() * 3,
		);
		rock.scale.set(1 + r() * 2, 1 + r() * 2, 0.45);
		rock.rotation.z = r() * 3;
	}
	for (let i = 0; i < 64; i++) {
		let x = -8 + r() * 133,
			h = 1 + r() * 4;
		stalactite(
			group,
			x,
			13.7,
			-6 - r() * 3,
			h,
			0.4 + r() * 0.75,
			[0x315c55, 0x294f4e, 0x224b4c][i % 3],
		);
	}
	// The entrance: broken sunlit temple, dense ferns, and jade vines.
	arch(group, 8, 0.1, -5.1, 5.1, 5.8, 0x9a8056);
	for (let i = 0; i < 5; i++) {
		box(group, 1.05, 0.52, 1.2, 0x89734f, 7.5 + i * 1.05, 0.2, -4.3, true);
	}
	for (let side of [-1, 1]) {
		box(group, 1.25, 5.5, 1.1, 0x49665b, 8 + side * 5, 2.75, -7, true);
		box(group, 1.8, 0.5, 1.4, 0x70836a, 8 + side * 5, 5.55, -7, true);
	}
	for (let i = 0; i < 13; i++) {
		let x = -4 + i * 2.8;
		hangingVine(group, x, 12.5, -3.3 - r() * 3, 1 + r() * 7, i + 44);
	}
	for (let x of [-2, 1.5, 5, 11, 15, 19, 22, 27, 30])
		fern(group, x, 0.1, -1.6, 0.65 + r() * 0.7, Math.floor(x * 123 + 2000));
	// Old steps and ceremonial stone faces stay entirely behind the walking plane.
	for (let i = 0; i < 4; i++)
		box(
			group,
			5 - i * 0.6,
			0.45,
			2,
			0x6e7360,
			16,
			-0.4 + i * 0.42,
			-5 - i * 0.4,
			true,
		);
	let face = new THREE.Group();
	face.position.set(19, 5, -7);
	group.add(face);
	box(face, 2.2, 2.8, 0.7, 0x6a8270, 0, 0, 0, true);
	box(face, 2.65, 0.65, 0.9, 0x84967b, 0, 1.5, 0.1, true);
	for (let s of [-1, 1])
		box(face, 0.47, 0.18, 0.16, 0x173e3c, s * 0.55, 0.45, 0.44);
	box(face, 0.33, 0.8, 0.5, 0x9a9c78, 0, -0.05, 0.5, true);
	box(face, 0.8, 0.2, 0.2, 0x183e3b, 0, -0.8, 0.45);
	rune(group, 8, 3, -4.55, 0.8);
	torches.push(torch(group, 4, 1.1, -3.7));
	torches.push(torch(group, 12, 1.1, -3.7));

	// The entrance's monumental sundial gives the title composition a strong, warm focal point.
	const entrySun = new THREE.Group();
	entrySun.position.set(25, 6.6, -6.4);
	group.add(entrySun);
	let outer = mesh(
		new THREE.CylinderGeometry(2.75, 2.75, 0.4, 12),
		0xa58a55,
		entrySun,
		0,
		0,
		0,
		true,
	);
	outer.rotation.x = Math.PI / 2;
	let inner = mesh(
		new THREE.CylinderGeometry(2.13, 2.13, 0.46, 12),
		0x3b6960,
		entrySun,
		0,
		0,
		0.1,
		true,
	);
	inner.rotation.x = Math.PI / 2;
	let pupil = mesh(
		new THREE.CylinderGeometry(1.1, 1.1, 0.5, 8),
		0xc6a861,
		entrySun,
		0,
		0,
		0.17,
		true,
	);
	pupil.rotation.x = Math.PI / 2;
	rune(entrySun, 0, 0, 0.5, 1.6, 0xf2da96);
	for (let i = 0; i < 16; i++) {
		let a = (i / 16) * Math.PI * 2;
		rod(
			entrySun,
			[Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0.1],
			[Math.cos(a) * 3.35, Math.sin(a) * 3.35, 0.1],
			0.09,
			0xba9e65,
			4,
		);
	}
	for (let side of [-1, 1]) {
		box(group, 0.85, 5.2, 1.1, 0x7d7d57, 25 + side * 2.1, 2.55, -6.4, true);
		box(group, 1.3, 0.35, 1.3, 0xa29263, 25 + side * 2.1, 5.2, -6.3, true);
		fern(group, 25 + side * 2.4, 0.1, -3.7, 1.3, side + 321);
	}
	hangingVine(group, 27.4, 11, -4, 4.2, 477);
	// A title-only expedition vignette hints at the shaft's balloon travel.
	const titleDecor = new THREE.Group();
	titleDecor.name = "title expedition balloon";
	titleDecor.position.set(25.8, 0, 0.25);
	group.add(titleDecor);
	const airship = new THREE.Group();
	airship.position.y = 6.35;
	titleDecor.add(airship);
	const fabric = mesh(
		new THREE.SphereGeometry(1.14, 12, 8),
		0xefb55f,
		airship,
		0,
		0,
		0,
		true,
	);
	fabric.scale.y = 1.22;
	for (let i = 0; i < 4; i++) {
		let a = (i * Math.PI) / 2;
		let stripe = mesh(
			new THREE.SphereGeometry(1.153, 12, 8, a, 0.12),
			0xf7d68d,
			airship,
		);
		stripe.scale.y = 1.22;
	}
	let neck = mesh(
		new THREE.CylinderGeometry(0.28, 0.12, 0.3, 8),
		0xa8673d,
		airship,
		0,
		-1.34,
		0,
		true,
	);
	for (let side of [-1, 1])
		rod(
			airship,
			[side * 0.3, -1.3, 0],
			[side * 0.22, -2.17, 0],
			0.018,
			0xf1d39a,
			4,
		);
	rod(airship, [-0.35, -2.17, 0], [0.35, -2.17, 0], 0.055, 0x645742, 5);
	const titleExplorer = makeExplorer();
	titleExplorer.group.position.y = 2.62;
	titleExplorer.group.rotation.y = 0.15;
	titleExplorer.setAction("float");
	titleDecor.add(titleExplorer.group);
	const titleShadow = new THREE.Mesh(
		new THREE.CircleGeometry(0.9, 20),
		new THREE.MeshBasicMaterial({
			color: 0x102e2c,
			transparent: true,
			opacity: 0.2,
			depthWrite: false,
		}),
	);
	titleShadow.rotation.x = -Math.PI / 2;
	titleShadow.position.set(0, 0.1, -0.1);
	titleShadow.scale.set(1.5, 0.55, 1);
	titleDecor.add(titleShadow);
	// Vertical grottoes divide each level without closing the playable passages.
	for (let [x, y, h] of [
		[23, -6, 8],
		[33, -7, 9],
		[50, -18, 8],
		[78, -28, 8],
		[88, -20, 21],
	]) {
		for (let i = 0; i < 7; i++) {
			let m = mesh(
				new THREE.IcosahedronGeometry(1.3 + r() * 1.5, 0),
				i % 2 ? 0x295956 : 0x214e4f,
				group,
				x + (r() - 0.5) * 2.5,
				y + (r() - 0.5) * h,
				-7 - r() * 2,
			);
			m.scale.set(0.7, 1.5, 0.5);
		}
	}
	// Echo gallery: warm ruins and amber fossil columns.
	arch(group, 43, -11.85, -4.6, 4.3, 5.3, 0x897a5a);
	for (let x of [14, 21, 28, 38, 52]) {
		box(group, 1, 5, 1.3, 0x6b7760, x, -9.4, -7, true);
		box(group, 1.6, 0.5, 1.7, 0x93916d, x, -6.8, -7, true);
		fern(group, x + 0.8, -11.8, -2, 0.75, x * 67);
	}
	for (let i = 0; i < 24; i++) {
		let x = 13 + r() * 42;
		stalactite(group, x, -5.4, -4.5, 1 + r() * 1.9, 0.23 + r() * 0.4, 0x3c655b);
	}
	for (let x of [17, 26, 40, 46]) {
		rune(group, x, -8.7, -4.8, 0.7, 0xe6bc72);
		torches.push(torch(group, x, -10.8, -2.8));
	}
	// Crystal constellations and fungi guide the submerged expedition.
	for (let i = 0; i < 33; i++) {
		let x = 44 + r() * 36,
			y = -28 + r() * 8,
			z = -2.5 - r() * 4;
		let crystal = mesh(
			new THREE.ConeGeometry(0.18 + r() * 0.16, 0.6 + r() * 0.8, 5),
			0x67d4c2,
			group,
			x,
			y,
			z,
			true,
			0x1a958a,
		);
		crystal.rotation.z = (r() - 0.5) * 0.75;
		animated.push({ mesh: crystal, base: y, phase: r() * 6, type: "crystal" });
	}
	arch(group, 64, -28, -6, 7, 6.8, 0x507771);
	for (let i = 0; i < 6; i++)
		box(group, 3.2, 0.8, 1.6, 0x416764, 53 + i * 4.2, -28.4, -4, true);
	const waterMat = new THREE.MeshStandardMaterial({
		color: 0x169d9e,
		transparent: true,
		opacity: 0.35,
		roughness: 0.22,
		metalness: 0.1,
		emissive: 0x0b6975,
		emissiveIntensity: 0.7,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
	let water = new THREE.Mesh(new THREE.PlaneGeometry(28, 8), waterMat);
	water.position.set(63, -25, -0.9);
	group.add(water);
	const waterTop = new THREE.Mesh(
		new THREE.PlaneGeometry(28, 0.1),
		new THREE.MeshBasicMaterial({
			color: 0x91e5cf,
			transparent: true,
			opacity: 0.7,
		}),
	);
	waterTop.position.set(63, -21, -0.74);
	group.add(waterTop);
	for (let i = 0; i < 32; i++) {
		let w = box(
			group,
			0.25 + r() * 1.4,
			0.025,
			0.03,
			0x74cfc5,
			49 + r() * 28,
			-21 + (r() - 0.5) * 0.13,
			-0.7,
		);
		animated.push({
			mesh: w,
			base: w.position.x,
			phase: r() * 7,
			type: "ripple",
		});
	}
	for (let i = 0; i < 18; i++) {
		let bubble = new THREE.Mesh(
			new THREE.RingGeometry(0.055, 0.072, 12),
			new THREE.MeshBasicMaterial({
				color: 0x93e8d6,
				transparent: true,
				opacity: 0.45,
				side: THREE.DoubleSide,
			}),
		);
		bubble.position.set(50 + r() * 26, -29 + r() * 8, -0.5);
		group.add(bubble);
		animated.push({
			mesh: bubble,
			base: bubble.position.y,
			phase: r() * 8,
			type: "bubble",
		});
	}
	for (let i = 0; i < 20; i++) {
		let x = 48 + r() * 30;
		let stalk = rod(
			group,
			[x, -29, -0.3],
			[x + (r() - 0.5), -27 - r() * 1.5, -0.3],
			0.04,
			0x237e71,
		);
		stalk.rotation.z = (r() - 0.5) * 0.15;
	}
	// Balloon shaft: streaked, ancient ventilation flue, visible all the way up.
	for (let side of [-1, 1]) {
		for (let y = -34; y < -3; y += 3.2) {
			let b = box(
				group,
				1.1,
				2.95,
				1.7,
				0x657a63,
				85 + side * 4.1,
				y + 1.5,
				-6,
				true,
			);
			b.rotation.z = side * 0.013;
			box(
				group,
				1.7,
				0.25,
				1.95,
				0x92936e,
				85 + side * 4.1,
				y + 2.7,
				-5.9,
				true,
			);
		}
	}
	for (let y = -31; y < -5; y += 6) rune(group, 85, y, -7, 0.8, 0xd5c27c);
	let geyser = new THREE.Mesh(
		new THREE.ConeGeometry(0.75, 7, 12, 1, true),
		new THREE.MeshBasicMaterial({
			color: 0x6ee6d2,
			transparent: true,
			opacity: 0.07,
			side: THREE.DoubleSide,
			depthWrite: false,
		}),
	);
	geyser.position.set(85, -30.5, -1.7);
	group.add(geyser);
	// Final vault: sunburst medallion and elevated ceremonial doorway.
	arch(group, 109, -4.9, -4.2, 5.4, 6.4, 0xaf935b);
	const sun = new THREE.Group();
	sun.position.set(102.5, 0.6, -5);
	group.add(sun);
	let disk = mesh(new THREE.CylinderGeometry(2, 2, 0.25, 12), 0xc8ab65, sun);
	disk.rotation.x = Math.PI / 2;
	let center = mesh(
		new THREE.CylinderGeometry(1.35, 1.35, 0.3, 8),
		0x3e6860,
		sun,
		0,
		0,
		0.2,
		true,
	);
	center.rotation.x = Math.PI / 2;
	rune(sun, 0, 0, 0.45, 1.6, 0xf1d68b);
	for (let i = 0; i < 12; i++) {
		let a = (i / 12) * Math.PI * 2;
		rod(
			sun,
			[Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0],
			[Math.cos(a) * 2.65, Math.sin(a) * 2.65, 0],
			0.12,
			0xd0af64,
			4,
		);
	}
	for (let x of [93, 98, 114]) {
		fern(group, x, -4.8, -1.8, 0.9, x * 91);
		torches.push(torch(group, x, -3.9, -2.6));
	}
	// Slanted pools of light, drawn behind the actors.
	for (let [x, y, w, h, color] of [
		[5, 9, 3, 13, 0xc1e8b5],
		[20, 8, 2.8, 14, 0x7cd5c2],
		[45, -5, 2.3, 14, 0xdac087],
		[62, -16, 4, 15, 0x6ae5d6],
		[85, -14, 3, 27, 0xe6c682],
		[109, 2, 3, 12, 0xffdc8c],
	]) {
		let s = new THREE.Shape();
		s.moveTo(-w * 0.22, h * 0.5);
		s.lineTo(w * 0.22, h * 0.5);
		s.lineTo(w, h * -0.5);
		s.lineTo(-w * 0.5, h * -0.5);
		s.closePath();
		let m = new THREE.Mesh(
			new THREE.ShapeGeometry(s),
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.045,
				side: THREE.DoubleSide,
				depthWrite: false,
			}),
		);
		m.position.set(x, y, -3.9);
		m.rotation.z = -0.18;
		group.add(m);
	}
	// Suspended motes imply warm air and dimensional depth without textures.
	const points = [];
	for (let i = 0; i < 650; i++)
		points.push(-8 + r() * 132, -37 + r() * 52, -1.8 - r() * 8);
	let geom = new THREE.BufferGeometry();
	geom.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
	let dust = new THREE.Points(
		geom,
		new THREE.PointsMaterial({
			color: 0xe4d899,
			size: 0.035,
			transparent: true,
			opacity: 0.45,
			depthWrite: false,
		}),
	);
	group.add(dust);
	return {
		group,
		titleDecor,
		update(dt, time) {
			titleDecor.position.y = Math.sin(time * 0.85) * 0.22;
			airship.rotation.z = Math.sin(time * 0.65) * 0.045;
			titleExplorer.mixer.update(dt);
			for (const a of animated) {
				if (a.type === "ripple")
					a.mesh.position.x = a.base + Math.sin(time * 0.6 + a.phase) * 0.3;
				else if (a.type === "bubble")
					a.mesh.position.y = -29 + ((a.base + 29 + time * 0.28) % 8);
				else
					a.mesh.material.emissiveIntensity =
						0.4 + Math.sin(time * 1.3 + a.phase) * 0.12;
			}
			for (let i = 0; i < torches.length; i++) {
				let fire = torches[i];
				fire.scale.y = 1.6 + Math.sin(time * 10 + i * 3) * 0.15;
				fire.scale.x = 0.8 + Math.sin(time * 13 + i) * 0.08;
			}
			dust.rotation.z = Math.sin(time * 0.015) * 0.003;
		},
	};
}

export function makeExplorer(color = 0xe9b44c) {
	const group = new THREE.Group();
	group.name = "explorer";
	let torso = new THREE.Group();
	torso.name = "torso";
	torso.position.y = 0.91;
	group.add(torso);
	box(torso, 0.54, 0.61, 0.36, color, 0, 0, 0, true);
	box(torso, 0.57, 0.14, 0.39, 0x604333, 0, -0.28, 0, true);
	box(torso, 0.12, 0.11, 0.05, 0xf6ce7c, 0.12, -0.28, 0.22, true);
	const head = ball(torso, 0.3, 0xe9b88b, 0.02, 0.6, 0, [0.9, 1.02, 0.9], true);
	head.name = "head";
	let hair = ball(torso, 0.29, 0x493a2c, -0.03, 0.69, -0.03, [1, 0.7, 1]);
	let brim = mesh(
		new THREE.CylinderGeometry(0.48, 0.48, 0.075, 12),
		0xc0924f,
		torso,
		0.01,
		0.83,
		0,
		true,
	);
	let crown = mesh(
		new THREE.CylinderGeometry(0.27, 0.33, 0.3, 9),
		0xc79c5a,
		torso,
		-0.04,
		1.01,
		0,
		true,
	);
	box(torso, 0.59, 0.09, 0.55, 0x6a4934, -0.04, 0.91, 0, true);
	for (let s of [-1, 1]) {
		ball(torso, 0.043, 0x122a2c, 0.18, 0.64, s * 0.225, [0.75, 1, 1]);
		ball(torso, 0.022, 0xfff4d1, 0.2, 0.65, s * 0.242);
	}
	ball(torso, 0.1, 0xe9b88b, 0.28, 0.55, 0, [1.2, 0.8, 0.75]);
	box(torso, 0.48, 0.13, 0.4, 0xc65342, 0, 0.28, 0, true);
	let scarf = box(torso, 0.45, 0.12, 0.08, 0xe46549, -0.38, 0.24, 0.05, true);
	scarf.rotation.z = 0.3;
	scarf.name = "scarf";
	box(torso, 0.28, 0.4, 0.23, 0x79533a, -0.08, -0.02, -0.29, true);
	rod(torso, [-0.2, 0.2, 0.22], [0.2, -0.24, 0.23], 0.035, 0x69492f, 5);
	for (let [name, x, z] of [
		["armL", -0.02, 0.28],
		["armR", -0.02, -0.28],
	]) {
		let pivot = new THREE.Group();
		pivot.name = name;
		pivot.position.set(x, 0.17, z);
		torso.add(pivot);
		let sleeve = box(pivot, 0.2, 0.28, 0.22, color, 0, -0.12, 0, true);
		box(pivot, 0.14, 0.29, 0.16, 0xe9b88b, 0, -0.35, 0, true);
		ball(pivot, 0.105, 0xe9b88b, 0, -0.51, 0, [0.8, 1, 1], true);
	}
	for (let [name, z] of [
		["legL", 0.15],
		["legR", -0.15],
	]) {
		let pivot = new THREE.Group();
		pivot.name = name;
		pivot.position.set(0, 0.59, z);
		group.add(pivot);
		box(pivot, 0.22, 0.47, 0.22, 0x425d4e, 0, -0.22, 0, true);
		box(pivot, 0.3, 0.18, 0.25, 0x443a2c, 0.04, -0.48, 0, true);
	}
	const mixer = new THREE.AnimationMixer(group),
		actions = {};
	const swing = (name, values, times = [0, 0.25, 0.5, 0.75, 1]) =>
		new THREE.NumberKeyframeTrack(name + ".rotation[z]", times, values);
	const clips = {
		idle: new THREE.AnimationClip("idle", 2, [
			new THREE.NumberKeyframeTrack(
				"torso.position[y]",
				[0, 1, 2],
				[0.91, 0.94, 0.91],
			),
			swing("armL", [0.08, 0.04, 0.08], [0, 1, 2]),
			swing("armR", [-0.08, -0.04, -0.08], [0, 1, 2]),
		]),
		run: new THREE.AnimationClip("run", 0.65, [
			swing("legL", [-0.65, 0.65, -0.65], [0, 0.325, 0.65]),
			swing("legR", [0.65, -0.65, 0.65], [0, 0.325, 0.65]),
			swing("armL", [0.7, -0.7, 0.7], [0, 0.325, 0.65]),
			swing("armR", [-0.7, 0.7, -0.7], [0, 0.325, 0.65]),
			new THREE.NumberKeyframeTrack(
				"torso.position[y]",
				[0, 0.1625, 0.325, 0.4875, 0.65],
				[0.91, 0.98, 0.91, 0.98, 0.91],
			),
			swing("scarf", [0.25, 0.5, 0.25], [0, 0.325, 0.65]),
		]),
		jump: new THREE.AnimationClip("jump", 0.8, [
			swing("armL", [-1.2, -1.0, -0.8], [0, 0.4, 0.8]),
			swing("armR", [-0.7, -0.4, -0.6], [0, 0.4, 0.8]),
			swing("legL", [-0.9, -0.5, -0.3], [0, 0.4, 0.8]),
			swing("legR", [0.9, 0.6, 0.2], [0, 0.4, 0.8]),
		]),
		fall: new THREE.AnimationClip("fall", 1, [
			swing("armL", [-1.6, -1.4, -1.6], [0, 0.5, 1]),
			swing("armR", [-1.4, -1.6, -1.4], [0, 0.5, 1]),
			swing("legL", [-0.35, -0.2, -0.35], [0, 0.5, 1]),
			swing("legR", [0.3, 0.1, 0.3], [0, 0.5, 1]),
		]),
		climb: new THREE.AnimationClip("climb", 0.85, [
			swing("armL", [-2.65, -0.8, -2.65], [0, 0.425, 0.85]),
			swing("armR", [-0.8, -2.65, -0.8], [0, 0.425, 0.85]),
			swing("legL", [-0.55, 0.45, -0.55], [0, 0.425, 0.85]),
			swing("legR", [0.45, -0.55, 0.45], [0, 0.425, 0.85]),
		]),
		swim: new THREE.AnimationClip("swim", 1.1, [
			swing("torso", [-0.8, -0.88, -0.8], [0, 0.55, 1.1]),
			swing("armL", [-2.2, 0.6, -2.2], [0, 0.55, 1.1]),
			swing("armR", [0.6, -2.2, 0.6], [0, 0.55, 1.1]),
			swing("legL", [-0.2, 0.45, -0.2], [0, 0.55, 1.1]),
			swing("legR", [0.45, -0.2, 0.45], [0, 0.55, 1.1]),
		]),
		float: new THREE.AnimationClip("float", 1.8, [
			swing("armL", [-2.8, -2.65, -2.8], [0, 0.9, 1.8]),
			swing("armR", [-2.65, -2.8, -2.65], [0, 0.9, 1.8]),
			swing("legL", [-0.18, 0.15, -0.18], [0, 0.9, 1.8]),
			swing("legR", [0.15, -0.18, 0.15], [0, 0.9, 1.8]),
			new THREE.NumberKeyframeTrack(
				"torso.position[y]",
				[0, 0.9, 1.8],
				[0.91, 0.95, 0.91],
			),
		]),
	};
	for (let [name, clip] of Object.entries(clips))
		actions[name] = mixer.clipAction(clip);
	let current = "";
	const setAction = (name) => {
		if (name === current || !actions[name]) return;
		let next = actions[name];
		next.reset().fadeIn(0.18).play();
		if (actions[current]) actions[current].fadeOut(0.18);
		current = name;
	};
	setAction("idle");
	return { group, mixer, actions, setAction };
}

export function makeCreature(type) {
	const group = new THREE.Group();
	group.name = type;
	group.userData.wings = [];
	if (type === "bat" || type === "condor") {
		let color = type === "bat" ? 0x8c758a : 0x5a6673;
		ball(group, 0.22, color, 0, 0, 0, [0.65, 1, 0.8], true);
		ball(
			group,
			0.18,
			type === "bat" ? 0xb292aa : 0xb3a37a,
			0,
			0.21,
			0.03,
			[1, 0.85, 1],
			true,
		);
		for (let s of [-1, 1]) {
			let shape = new THREE.Shape();
			shape.moveTo(0, 0);
			shape.lineTo(s * 0.7, 0.22);
			shape.lineTo(s * 1.15, -0.18);
			shape.lineTo(s * 0.75, -0.06);
			shape.lineTo(s * 0.5, -0.27);
			shape.lineTo(s * 0.22, -0.2);
			shape.closePath();
			let wing = new THREE.Mesh(
				new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false }),
				mat(color),
			);
			wing.name = s === 1 ? "wingR" : "wingL";
			group.add(wing);
			group.userData.wings.push(wing);
			if (type === "bat") {
				let ear = mesh(
					new THREE.ConeGeometry(0.09, 0.23, 4),
					0xb292aa,
					group,
					s * 0.12,
					0.4,
					0.04,
					true,
				);
			}
			ball(group, 0.035, 0xffcf76, s * 0.075, 0.22, 0.18);
		}
		if (type === "condor") {
			ball(group, 0.12, 0xe2b76a, 0.19, 0.2, 0.06, [1.4, 0.6, 0.7]);
			group.scale.setScalar(1.25);
		}
	} else if (type === "frog") {
		ball(group, 0.3, 0x83a75a, 0, 0.25, 0, [1.2, 0.8, 0.8], true);
		for (let s of [-1, 1]) {
			ball(group, 0.15, 0xa2c26c, s * 0.2, 0.44, 0.15, [1, 1, 0.8], true);
			ball(group, 0.065, 0x122b29, s * 0.2, 0.46, 0.255);
			ball(group, 0.18, 0x6e934c, s * 0.31, 0.12, 0, [1.2, 0.5, 1], true);
			rod(group, [s * 0.1, 0.22, 0.16], [s * 0.28, 0.04, 0.27], 0.05, 0x94b963);
		}
	} else if (type === "scorpion") {
		ball(group, 0.28, 0xe8d9bd, 0, 0.22, 0, [1.35, 0.6, 0.8], true);
		for (let i = 0; i < 4; i++) {
			let x = -0.35 - i * 0.1,
				y = 0.28 + i * 0.14;
			ball(group, 0.09, 0xe3cfb0, x, y, 0, [1, 1.1, 0.9], true);
		}
		let sting = mesh(
			new THREE.ConeGeometry(0.1, 0.22, 5),
			0xaa795c,
			group,
			-0.71,
			0.83,
			0,
			true,
		);
		sting.rotation.z = -0.5;
		for (let i = 0; i < 3; i++)
			for (let s of [-1, 1])
				rod(
					group,
					[-0.17 + i * 0.15, 0.2, s * 0.14],
					[-0.26 + i * 0.15, 0.03, s * 0.41],
					0.025,
					0xecdcc1,
					4,
				);
		for (let s of [-1, 1]) {
			rod(
				group,
				[0.18, 0.23, s * 0.12],
				[0.45, 0.27, s * 0.28],
				0.045,
				0xe5d6b8,
			);
			ball(group, 0.12, 0xe8d9bd, 0.5, 0.3, s * 0.29, [1.4, 0.7, 0.7], true);
		}
	} else if (type === "eel") {
		for (let i = 0; i < 8; i++) {
			let p = ball(
				group,
				0.15,
				0x9dc5a0,
				-i * 0.17,
				Math.sin(i * 0.8) * 0.12,
				0,
				[1.15, 0.8, 0.8],
				i === 0,
			);
			p.name = "segment" + i;
		}
		ball(group, 0.04, 0xffe48e, 0.03, 0.06, 0.13);
		let fin = mesh(
			new THREE.ConeGeometry(0.12, 0.3, 3),
			0x7ae1ca,
			group,
			-1.36,
			0.03,
			0,
		);
		fin.rotation.z = Math.PI / 2;
	}
	group.userData.animate = (time) => {
		if (type === "eel") {
			for (let i = 0; i < 8; i++) {
				const segment = group.getObjectByName("segment" + i);
				if (segment) segment.position.y = Math.sin(time * 5 - i * 0.7) * 0.1;
			}
		}
	};
	return group;
}

export function animateCreature(group, time) {
	group.userData.animate?.(time);
}

export function makePickup(kind) {
	const group = new THREE.Group();
	group.name = kind;
	if (kind === "gold") {
		let ingot = box(group, 0.8, 0.3, 0.4, 0xf4c765, 0, 0.26, 0, true);
		ingot.rotation.z = 0.06;
		box(group, 0.6, 0.035, 0.32, 0xffe5a2, 0, 0.43, 0.01);
		box(group, 0.19, 0.045, 0.12, 0xbb8738, 0.04, 0.46, 0.1);
		const star = new THREE.Shape();
		for (let i = 0; i < 8; i++) {
			const a = (i * Math.PI) / 4,
				r = i % 2 ? 0.035 : 0.14;
			const x = Math.cos(a) * r,
				y = Math.sin(a) * r;
			if (!i) star.moveTo(x, y);
			else star.lineTo(x, y);
		}
		star.closePath();
		const glint = new THREE.Mesh(
			new THREE.ShapeGeometry(star),
			new THREE.MeshBasicMaterial({
				color: 0xffefb7,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.85,
			}),
		);
		glint.position.set(0.42, 0.69, 0.12);
		group.add(glint);
	} else if (kind === "diamond") {
		let gem = mesh(
			new THREE.OctahedronGeometry(0.65),
			0x85ead8,
			group,
			0,
			0.75,
			0,
			true,
			0x2f968c,
		);
		gem.scale.set(1, 1.35, 1);
		let band = mesh(
			new THREE.TorusGeometry(0.72, 0.045, 5, 24),
			0xe2bf70,
			group,
			0,
			0.75,
			-0.1,
			true,
		);
		band.rotation.x = 0.28;
		box(group, 1.15, 0.32, 0.75, 0x9f8d60, 0, 0.05, -0.08, true);
	} else if (kind === "researcher") {
		let who = makeExplorer(0x75a3a1);
		group.add(who.group);
		who.group.scale.setScalar(0.94);
		let book = box(group, 0.4, 0.5, 0.09, 0xd6a66a, 0.36, 0.85, 0.35, true);
		book.rotation.z = -0.15;
		group.userData.mixer = who.mixer;
		group.userData.setAction = who.setAction;
	} else if (kind === "cat") {
		ball(group, 0.3, 0xd5aa65, 0, 0.38, 0, [1.3, 0.8, 0.8], true);
		ball(group, 0.25, 0xe2bc79, 0.24, 0.72, 0, [0.9, 1, 0.9], true);
		for (let s of [-1, 1]) {
			let ear = mesh(
				new THREE.ConeGeometry(0.11, 0.24, 4),
				0xc29151,
				group,
				0.24,
				0.96,
				s * 0.16,
				true,
			);
			ball(group, 0.035, 0x204137, 0.39, 0.78, s * 0.13);
			rod(
				group,
				[s * 0.12, 0.22, 0.14],
				[s * 0.12, 0.05, 0.14],
				0.065,
				0xd5aa65,
			);
		}
		ball(group, 0.055, 0x5f4531, 0.46, 0.66, 0);
		let tail = rod(group, [-0.3, 0.4, 0], [-0.65, 0.76, 0], 0.065, 0xc89956);
		ball(group, 0.075, 0xc89956, -0.65, 0.8, 0);
		box(group, 0.24, 0.07, 0.38, 0xb44f43, 0.24, 0.51, 0, true);
	}
	return group;
}
