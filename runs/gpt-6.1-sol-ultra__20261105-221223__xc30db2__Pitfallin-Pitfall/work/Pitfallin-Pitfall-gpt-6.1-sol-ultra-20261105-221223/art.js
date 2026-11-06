// Procedural ink-and-colour jungle; all geometry and animation authored in code.
export function createArt(THREE, scene, config = {}) {
	const P = {
		ink: 0x162e29,
		leaf: 0x3d8050,
		lime: 0x9fbd59,
		fern: 0x75a852,
		dark: 0x254f3d,
		pale: 0xb5cba0,
		mist: 0xd4d9b2,
		soil: 0xb67f4b,
		clay: 0x8e5f3d,
		earth: 0x654b37,
		stone: 0x73816a,
		gold: 0xf0bc4c,
		cream: 0xffedbf,
		water: 0x4e9e83,
		blue: 0x5eada1,
		red: 0xd05e40,
	};
	let seed = 73421;
	const rand = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
	const range = (a, b) => a + (b - a) * rand();
	const materials = new Map();
	const mat = (c, options = {}) => {
		const key = `${c}:${JSON.stringify(options)}`;
		if (!materials.has(key))
			materials.set(
				key,
				new THREE.MeshStandardMaterial({
					color: c,
					roughness: 1,
					metalness: 0,
					flatShading: true,
					...options,
				}),
			);
		return materials.get(key);
	};
	const ink = new THREE.MeshBasicMaterial({
		color: P.ink,
		side: THREE.BackSide,
	});
	const world = new THREE.Group();
	world.name = "InkJungle";
	scene.add(world);
	const v = (x, y, z) => new THREE.Vector3(x, y, z);
	const solid = (geom, color, parent = world, outline = true, extra = {}) => {
		const m = new THREE.Mesh(geom, mat(color, extra));
		m.castShadow = true;
		m.receiveShadow = true;
		if (outline) {
			const hull = new THREE.Mesh(geom, ink);
			hull.scale.setScalar(1.035);
			hull.castShadow = false;
			hull.receiveShadow = false;
			m.add(hull);
		}
		parent.add(m);
		return m;
	};
	const box = (x, y, z, w, h, d, c, parent = world, outline = true) => {
		const o = solid(new THREE.BoxGeometry(w, h, d), c, parent, outline);
		o.position.set(x, y, z);
		return o;
	};
	const sphere = (
		x,
		y,
		z,
		r,
		c,
		parent = world,
		sx = 1,
		sy = 1,
		sz = 1,
		detail = 1,
		outline = true,
	) => {
		const o = solid(
			new THREE.IcosahedronGeometry(r, detail),
			c,
			parent,
			outline,
		);
		o.position.set(x, y, z);
		o.scale.set(sx, sy, sz);
		return o;
	};
	const cyl = (
		x,
		y,
		z,
		top,
		bottom,
		h,
		c,
		parent = world,
		sides = 7,
		outline = true,
	) => {
		const o = solid(
			new THREE.CylinderGeometry(top, bottom, h, sides),
			c,
			parent,
			outline,
		);
		o.position.set(x, y, z);
		return o;
	};
	const line = (a, b, r, color, parent = world) => {
		const d = b.clone().sub(a);
		const o = solid(
			new THREE.CylinderGeometry(r, r, d.length(), 5),
			color,
			parent,
			false,
		);
		o.position.copy(a).add(b).multiplyScalar(0.5);
		o.quaternion.setFromUnitVectors(v(0, 1, 0), d.normalize());
		return o;
	};
	const torus = (x, y, z, radius, tube, c, parent = world, outline = false) => {
		const o = solid(
			new THREE.TorusGeometry(radius, tube, 5, 16),
			c,
			parent,
			outline,
		);
		o.position.set(x, y, z);
		return o;
	};
	const leafGeometry = new THREE.ShapeGeometry(
		new THREE.Shape()
			.moveTo(0, 0)
			.quadraticCurveTo(0.55, 0.36, 0, 1.5)
			.quadraticCurveTo(-0.55, 0.36, 0, 0),
	);
	function leaf(x, y, z, size, angle, color, parent = world) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		g.rotation.z = angle;
		g.scale.setScalar(size);
		parent.add(g);
		const edge = solid(leafGeometry, P.ink, g, false, {
			side: THREE.DoubleSide,
		});
		edge.scale.set(1.09, 1.04, 1);
		edge.position.z = -0.012;
		solid(leafGeometry, color, g, false, { side: THREE.DoubleSide });
		line(v(0, 0, 0.015), v(0, 1.26, 0.015), 0.013, P.dark, g);
		return g;
	}
	function fern(x, y, z, size = 1, color = P.fern) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		g.scale.setScalar(size);
		world.add(g);
		for (let i = -2; i <= 2; i++) {
			const ang = i * 0.36;
			const stem = new THREE.Group();
			stem.rotation.z = ang;
			g.add(stem);
			line(v(0, 0, 0), v(0, 1.0 - Math.abs(i) * 0.11, 0), 0.025, P.dark, stem);
			for (let j = 0; j < 4; j++) {
				const yy = 0.18 + j * 0.17;
				const ll = (0.33 - j * 0.055) * (1 - Math.abs(i) * 0.09);
				leaf(0, yy, 0, ll, -1.07, color, stem);
				leaf(0, yy, 0.004, ll, 1.07, color, stem);
			}
		}
		return g;
	}
	const surface = config.surface ||
		config.ground || [
			[-10, 30],
			[41, 69],
			[80, 116],
			[130, 166],
			[179, 210],
			[224, 290],
		];
	const caves = config.caves || [
		[80, 112],
		[180, 208],
	];
	const ladderXs = config.ladders || [84, 108, 184, 204];
	const inLand = (x) => surface.some(([a, b]) => x > a + 0.5 && x < b - 0.5);
	const caveAt = (x) => caves.some(([a, b]) => x >= a && x <= b);
	const underSky = new THREE.Group();
	world.add(underSky);
	// Broad, opaque silhouettes make the forest feel like a stack of hand-cut prints.
	box(140, 12, -44, 400, 60, 0.2, P.mist, underSky, false);
	for (let layer = 0; layer < 3; layer++) {
		const shape = new THREE.Shape();
		shape.moveTo(-60, -12);
		for (let x = -60; x <= 350; x += 5)
			shape.lineTo(
				x,
				4.5 +
					layer * 0.8 +
					Math.sin(x * 0.055 + layer * 2) * 2.4 +
					range(-1, 1),
			);
		shape.lineTo(350, -12);
		shape.closePath();
		const hill = solid(
			new THREE.ShapeGeometry(shape),
			[0x9caf88, 0x839e78, 0x688d6b][layer],
			underSky,
			false,
			{ side: THREE.DoubleSide },
		);
		hill.position.z = -38 + layer * 6;
	}
	const sun = solid(
		new THREE.CircleGeometry(4.2, 64),
		0xf3d497,
		underSky,
		false,
		{ side: THREE.DoubleSide, emissive: 0xf3d497, emissiveIntensity: 0.25 },
	);
	sun.position.set(18, 10, -32);
	for (let x = -12; x < 310; x += range(5, 10)) {
		const h = range(9, 15),
			z = range(-22, -14),
			width = range(0.28, 0.7);
		cyl(x, h / 2 - 2, z, width * 0.65, width, h, 0x54765a, world, 5, false);
		for (let j = 0; j < 4; j++)
			sphere(
				x + range(-3, 3),
				h - 2 + range(-1, 2),
				z,
				range(2.4, 4),
				0x66876a,
				world,
				1.9,
				0.8,
				0.7,
				0,
				false,
			);
	}
	// Distant ruined observatories are a visual promise of the expedition's destination.
	function temple(x, z, scale = 1) {
		const g = new THREE.Group();
		g.position.set(x, 0.05, z);
		g.scale.setScalar(scale);
		world.add(g);
		for (let i = 0; i < 5; i++)
			box(
				0,
				0.34 + i * 0.66,
				0,
				7 - i * 1.05,
				0.65,
				3.3 - i * 0.3,
				i % 2 ? 0x60755c : 0x6d8065,
				g,
			);
		box(0, 4.1, 0.15, 2.3, 1.75, 2, 0x7b896b, g);
		box(0, 3.82, 1.19, 0.9, 1.22, 0.08, P.dark, g, false);
		cyl(0, 5.2, 0, 0, 1.4, 0.7, P.dark, g, 4);
		for (let i = 0; i < 3; i++)
			leaf(range(-2, 2), range(0.5, 3), 1.9, 0.8, range(-1, 1), P.dark, g);
	}
	temple(98, -10, 1.55);
	temple(269, -9, 2.1);
	temple(151, -18, 1.25);
	// A continuous geological foundation keeps underground rooms embedded in
	// the earth. The backplate prevents daylight showing beneath pools.
	const subsoilBack = new THREE.Mesh(
		new THREE.PlaneGeometry(320, 6.3),
		new THREE.MeshBasicMaterial({ color: 0x283c31 }),
	);
	subsoilBack.position.set(140, -3.65, -2.9);
	world.add(subsoilBack);
	const bedrock = box(140, -16.6, -0.5, 320, 20, 4.3, 0x655039, world, false);
	bedrock.castShadow = false;
	for (let x = -20; x < 300; x += 10) {
		const undulate = Math.sin(x * 0.12) * 0.12;
		box(
			x + 5,
			-8.1 + undulate,
			1.67,
			10.02,
			0.1,
			0.025,
			0x4f432e,
			world,
			false,
		).castShadow = false;
		box(
			x + 5,
			-10.8 - undulate,
			1.67,
			10.02,
			0.17,
			0.025,
			0x55442e,
			world,
			false,
		).castShadow = false;
		box(
			x + 5,
			-13.6 + undulate,
			1.67,
			10.02,
			0.08,
			0.025,
			0x79613e,
			world,
			false,
		).castShadow = false;
		for (let j = 0; j < 3; j++) {
			const fleck = sphere(
				x + 1.5 + j * 3.1,
				-7.4 - j * 1.6,
				1.69,
				0.1 + j * 0.025,
				0x4b442f,
				world,
				1.8,
				0.4,
				0.15,
				0,
				false,
			);
			fleck.castShadow = false;
		}
	}
	// Traversable ledges, warm exposed strata and cutaway underground rooms.
	for (const [a, b] of surface) {
		const n = Math.ceil((b - a) / 3.5);
		for (let i = 0; i < n; i++) {
			const left = a + ((b - a) * i) / n,
				right = a + ((b - a) * (i + 1)) / n,
				x = (left + right) / 2,
				w = right - left + 0.025;
			const cave = caveAt(x);
			box(
				x,
				cave ? -1.04 : -3.8,
				-0.55,
				w,
				cave ? 1.75 : 7.3,
				4.3,
				i % 3 ? P.soil : 0xae7747,
				world,
				true,
			);
			if (!cave) {
				box(
					x,
					-4.7 + range(-0.15, 0.15),
					1.65,
					w,
					0.24,
					0.035,
					P.clay,
					world,
					false,
				);
				box(
					x,
					-2.05 + range(-0.1, 0.1),
					1.65,
					w,
					0.09,
					0.04,
					0xd39c64,
					world,
					false,
				);
				for (let k = 0; k < 3; k++) {
					const rock = sphere(
						x + range(-w * 0.35, w * 0.35),
						range(-6.7, -1.2),
						1.65,
						range(0.08, 0.21),
						0x906139,
						world,
						1.8,
						0.6,
						0.1,
						0,
						false,
					);
					rock.rotation.z = range(-0.4, 0.4);
				}
			}
			box(x, -0.35, -0.5, w, 0.43, 4.5, 0x665238, world, false);
		}
		// Grass cap is interrupted at ladder mouths.
		let cuts = [
			a,
			...ladderXs
				.filter((x) => x > a && x < b)
				.flatMap((x) => [x - 0.55, x + 0.55]),
			b,
		];
		for (let i = 0; i < cuts.length - 1; i += 2) {
			const l = cuts[i],
				r = cuts[i + 1];
			box((l + r) / 2, -0.08, -0.5, r - l, 0.22, 4.7, P.lime);
			box((l + r) / 2, -0.17, 1.88, r - l, 0.13, 0.08, P.dark, world, false);
		}
		for (let x = a + 0.3; x < b; x += range(0.6, 1.3)) {
			if (ladderXs.some((l) => Math.abs(l - x) < 0.7)) continue;
			const g = new THREE.Group();
			g.position.set(x, 0.02, 1.42);
			world.add(g);
			for (let j = 0; j < 3; j++) {
				const blade = solid(
					new THREE.ConeGeometry(range(0.035, 0.085), range(0.13, 0.37), 3),
					j % 2 ? P.dark : P.lime,
					g,
					false,
				);
				blade.position.set(j * 0.1, 0.07, 0);
				blade.rotation.z = range(-0.7, 0.7);
			}
		}
	}
	for (const [a, b] of caves) {
		box((a + b) / 2, -3.7, -1.9, b - a, 4.1, 0.3, 0x263b35, world, false);
		box((a + b) / 2, -6.25, -0.4, b - a + 0.4, 0.8, 4.4, P.earth);
		box((a + b) / 2, -5.85, -0.4, b - a, 0.12, 4.5, 0x99825a);
		for (let x = a + 1; x < b; x += 2.8) {
			cyl(x, -1.95, -1.35, 0.28, 0, range(0.7, 1.6), 0x786444, world, 5);
			sphere(x + 0.7, -5.65, 1, 0.3, 0x797356, world, 1.8, 0.7, 0.75, 0);
			for (let j = 0; j < 2; j++) {
				const xx = x + j * 0.3,
					h = 0.24 + j * 0.1;
				cyl(xx, -5.8 + h / 2, -0.25, 0.04, 0.07, h, 0x87b78f, world, 5, false);
				const cap = sphere(
					xx,
					-5.8 + h,
					-0.25,
					0.18,
					j ? 0x9cceb0 : 0x76b8a3,
					world,
					1,
					0.5,
					1,
					0,
				);
				cap.material = mat(j ? 0x9cceb0 : 0x76b8a3, {
					emissive: 0x5a9c8a,
					emissiveIntensity: 0.45,
				});
			}
		}
		for (let i = 0; i < 4; i++)
			box(a + 2 + (i * (b - a - 4)) / 3, -4.15, -1.5, 0.45, 2.8, 0.5, 0x435d4c);
	}
	for (const raw of ladderXs) {
		const x = typeof raw === "object" ? raw.x : raw;
		for (const side of [-1, 1])
			cyl(x + side * 0.42, -2.83, 0.8, 0.055, 0.055, 6.3, 0xb9a375, world, 6);
		for (let y = -5.55; y <= 0.22; y += 0.35)
			line(v(x - 0.45, y, 0.81), v(x + 0.45, y, 0.81), 0.045, 0xd3bc80);
		box(x, -0.06, -0.1, 1.0, 0.04, 1.8, P.ink, world, false);
		box(x - 0.75, 0.08, 0.2, 0.18, 0.15, 1.8, P.soil);
		box(x + 0.75, 0.08, 0.2, 0.18, 0.15, 1.8, P.soil);
	}
	const waters = [];
	for (const [a, b, tar] of [
		[30, 41, false],
		[69, 80, false],
		[116, 130, true],
		[166, 179, false],
		[210, 224, false],
	]) {
		box((a + b) / 2, -0.62, -0.2, b - a, 0.35, 4.35, tar ? 0x393e2d : 0x3d7967);
		const pool = box(
			(a + b) / 2,
			-0.415,
			-0.2,
			b - a - 0.08,
			0.065,
			4.3,
			tar ? 0x667448 : P.water,
			world,
			false,
		);
		waters.push(pool);
		for (let x = a + 0.3; x < b; x += range(0.7, 1.2)) {
			box(
				x,
				-0.35,
				range(-1.9, 1.9),
				range(0.25, 0.8),
				0.013,
				0.027,
				tar ? 0xa4a067 : 0x9ec6a1,
				world,
				false,
			);
			if (rand() < 0.4) {
				const ripple = torus(
					x,
					-0.35,
					range(-1.8, 1.8),
					range(0.13, 0.28),
					0.018,
					tar ? 0xa4a067 : 0x98c9a5,
				);
				ripple.rotation.x = Math.PI / 2;
				waters.push(ripple);
			}
		}
		// Knotted roots grasp the edges of every watering hole.
		for (const edge of [a, b])
			for (let j = 0; j < 3; j++) {
				const z = -0.8 + j * 1.0;
				line(
					v(edge, -0.1, z),
					v(edge + (edge === a ? 0.35 : -0.35), -1.1 - rand(), z + 0.15),
					0.09,
					P.earth,
				);
			}
	}
	// Canopy trees have crooked trunks, roots, and large, graphic fronds.
	const fronds = [];
	function tree(x, z, h, back = false) {
		const g = new THREE.Group();
		g.position.set(x, 0, z);
		world.add(g);
		const c = back ? 0x426c49 : 0x65583a;
		const lean = range(-1.1, 1.1);
		line(v(0, 0, 0), v(lean * 0.35, h * 0.47, 0), back ? 0.34 : 0.42, c, g);
		line(v(lean * 0.35, h * 0.47, 0), v(lean, h, 0), back ? 0.24 : 0.3, c, g);
		for (let k = -1; k <= 1; k++)
			line(v(0, 0.32, 0), v(k * 0.8, -0.03, 0.4), 0.14, c, g);
		for (let i = 0; i < 6; i++) {
			const s = sphere(
				lean + range(-2.0, 2.0),
				h + range(-0.1, 1.0),
				range(-0.4, 0.4),
				range(1.3, 2),
				back ? P.dark : P.leaf,
				g,
				1.5,
				0.65,
				0.9,
				0,
				!back,
			);
			fronds.push({ node: s, phase: x + i, amp: 0.02, base: 0 });
		}
		for (let i = 0; i < 5; i++) {
			const base = -1.35 + i * 0.68;
			fronds.push({
				node: leaf(
					lean,
					h - 0.1,
					0.5,
					range(1.6, 2.4),
					base,
					i % 2 ? P.lime : P.leaf,
					g,
				),
				phase: x + i,
				amp: 0.04,
				base,
			});
		}
		for (let i = 0; i < h / 0.7; i++) {
			const yy = 0.4 + i * 0.7,
				xx = (yy / h) * lean;
			const slash = box(
				xx,
				yy,
				0.31,
				0.26,
				0.035,
				0.035,
				back ? 0x31573e : P.earth,
				g,
				false,
			);
			slash.rotation.z = -0.2;
		}
	}
	for (let x = -8; x < 300; x += range(8, 13))
		tree(x, -5 - rand() * 3, range(7.5, 11), true);
	for (let x = -7; x < 300; x += range(16, 23)) {
		if (inLand(x)) tree(x, -2.8, range(8.8, 12), false);
	}
	for (let x = -6; x < 290; x += range(2.4, 4.5)) {
		if (!inLand(x)) continue;
		const z = range(-2, -0.8);
		if (rand() < 0.45) fern(x, 0.02, z, range(0.65, 1.2));
		else {
			sphere(x, 0.18, z, range(0.3, 0.6), P.stone, world, 1.3, 0.65, 0.9, 0);
			if (rand() < 0.5) leaf(x, 0.4, z + 0.1, 0.5, 0.5, P.lime);
		}
	}
	// Low, broad-leaved undergrowth fills the middle of the jungle while the
	// bright walking ledge remains an uncluttered strip in front of it.
	for (let x = -9; x < 298; x += range(7, 11)) {
		if (!inLand(x)) continue;
		const plant = new THREE.Group();
		plant.position.set(x, 0.05, -4.2);
		world.add(plant);
		const height = range(1.4, 2.25);
		for (let j = -2; j <= 2; j++) {
			const yy = height * (0.55 + (2 - Math.abs(j)) * 0.14),
				xx = j * 0.27;
			line(v(0, 0, 0), v(xx, yy, 0), 0.035, 0x456c41, plant);
			leaf(
				xx,
				yy,
				j * 0.013,
				range(0.85, 1.25),
				j * 0.56,
				j % 2 ? 0x487d4a : 0x56894f,
				plant,
			);
			leaf(xx, yy * 0.55, 0.05, 0.55, j > 0 ? 1.0 : -1.0, 0x668f50, plant);
		}
	}
	// Exposed roots turn the warm cliff face into a readable geological cutaway.
	for (let x = -5; x < 287; x += range(7, 12)) {
		if (!inLand(x) || caveAt(x)) continue;
		const depth = range(0.9, 2.4),
			sway = range(-0.5, 0.5);
		line(v(x, -0.25, 1.73), v(x + sway, -depth, 1.73), 0.037, 0x80613b);
		line(
			v(x + sway, -depth, 1.73),
			v(x + sway - 0.25, -depth - 0.45, 1.73),
			0.018,
			0x80613b,
		);
		line(
			v(x + sway * 0.65, -depth * 0.65, 1.73),
			v(x + sway + 0.35, -depth * 0.65 - 0.35, 1.73),
			0.018,
			0x80613b,
		);
	}
	// Occasional enormous foreground leaves frame the cutaway without hiding the trail.
	for (let x = -8; x < 300; x += range(22, 31)) {
		if (!inLand(x)) continue;
		fern(x, -0.05, 2.3, 0.65, P.dark);
		leaf(x + 0.6, -0.05, 2.5, 0.62, -0.9, P.leaf);
	}
	function sign(x, label, sub = "", arrow = true) {
		const g = new THREE.Group();
		g.position.set(x, 0, -0.55);
		world.add(g);
		cyl(0, 0.76, 0, 0.07, 0.1, 1.55, P.earth, g, 5);
		const board = box(0, 1.48, 0, 2.7, 0.77, 0.16, P.cream, g);
		board.rotation.z = -0.035;
		const canvas = document.createElement("canvas");
		canvas.width = 768;
		canvas.height = 224;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#ffedbf";
		ctx.fillRect(0, 0, 768, 224);
		ctx.fillStyle = "#233c2b";
		ctx.textAlign = "center";
		ctx.font = "900 58px sans-serif";
		ctx.fillText(label, 358, 92);
		ctx.font = "700 30px sans-serif";
		ctx.fillText(sub, 358, 157);
		if (arrow) {
			ctx.lineWidth = 12;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(650, 115);
			ctx.lineTo(718, 115);
			ctx.lineTo(689, 89);
			ctx.moveTo(718, 115);
			ctx.lineTo(689, 141);
			ctx.strokeStyle = "#233c2b";
			ctx.stroke();
		}
		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		const labelMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(2.58, 0.7),
			new THREE.MeshBasicMaterial({ map: tex, transparent: false }),
		);
		labelMesh.position.z = 0.089;
		labelMesh.position.y = 1.48;
		labelMesh.rotation.z = -0.035;
		g.add(labelMesh);
	}
	sign(7, "SUN TRAIL", "KEEP YOUR HAT ON");
	sign(27, "MIND THE GAP", "CATCH A VINE");
	sign(66.5, "TOOTH CROSSING", "MOUTHS SHUT. FEET QUICK.");
	sign(86, "DOWN & UNDER", "SOME GOLD TAKES A DETOUR");
	sign(113, "BREATHING MIRE", "LOOK. LEAP. REPEAT.");
	sign(207.5, "MORE TEETH", "YES. REALLY.");
	sign(262, "LAST LIGHT", "THE CAMP IS JUST AHEAD");
	const campfires = [];
	function camp(x, final = false) {
		const g = new THREE.Group();
		g.position.set(x, 0, -1.2);
		world.add(g);
		const tentGeom = new THREE.CylinderGeometry(1, 1, 2.6, 3, 1);
		const tent = solid(tentGeom, final ? 0xd3a95a : 0xc28b4d, g);
		tent.rotation.z = Math.PI / 2;
		tent.position.set(-1.2, 0.85, -0.1);
		tent.scale.set(1, 1, 1.35);
		const opening = solid(
			new THREE.ConeGeometry(0.57, 1.15, 3),
			P.dark,
			g,
			false,
		);
		opening.position.set(-1.2, 0.55, 1.05);
		opening.rotation.z = Math.PI;
		for (const side of [-1, 1])
			line(
				v(-1.2 + side * 0.95, 0.05, 1.3),
				v(-1.2, 1.8, 0),
				0.035,
				P.cream,
				g,
			);
		for (let j = 0; j < 2; j++) {
			const log = cyl(1.0, 0.13, 1, 0.1, 0.1, 1.0, P.earth, g, 6);
			log.rotation.z = Math.PI / 2;
			log.rotation.y = (j * Math.PI) / 2;
		}
		const flames = new THREE.Group();
		flames.position.set(1, 0.25, 1);
		g.add(flames);
		for (let j = 0; j < 3; j++) {
			const f = solid(
				new THREE.ConeGeometry(0.2 - j * 0.04, 0.65 - j * 0.12, 5),
				j % 2 ? 0xffdf77 : 0xe58a3e,
				flames,
				false,
				{ emissive: 0xe89939, emissiveIntensity: 0.8 },
			);
			f.position.set((j - 1) * 0.14, 0.2, j * 0.025);
		}
		campfires.push(flames);
		box(0.3, 0.28, -0.6, 0.55, 0.55, 0.55, P.earth, g);
		box(0.3, 0.57, -0.6, 0.62, 0.08, 0.62, P.soil, g);
		if (final) {
			for (const side of [-1, 1]) {
				cyl(side * 2.5, 2.0, -1, 0.12, 0.18, 4, P.earth, g);
				leaf(side * 2.5, 3.6, -0.95, 0.8, -side * 0.7, P.lime, g);
			}
			line(v(-2.5, 3.7, -1), v(2.5, 3.7, -1), 0.035, P.cream, g);
			for (let i = 0; i < 7; i++) {
				const flag = solid(
					new THREE.ConeGeometry(0.19, 0.5, 3),
					i % 2 ? P.red : P.gold,
					g,
					false,
				);
				flag.position.set(-2.1 + i * 0.7, 3.4, -0.98);
			}
		}
	}
	camp(2);
	camp(47);
	camp(137);
	camp(230);
	camp(278, true);
	// Tiny life in the air: a few fireflies and swaying leaf motes.
	const fireflies = [];
	for (let i = 0; i < 88; i++) {
		const node = sphere(
			range(-5, 290),
			range(0.8, 6.8),
			range(-2, 2),
			0.035,
			P.cream,
			world,
			1,
			1,
			1,
			0,
			false,
		);
		node.material = mat(0xe8e49b, {
			emissive: 0xe8e49b,
			emissiveIntensity: 0.8,
		});
		fireflies.push({
			node,
			x: node.position.x,
			y: node.position.y,
			phase: range(0, 6.28),
		});
	}
	function explorer(color = 0xd7a35d, ghost = false) {
		const g = new THREE.Group();
		g.name = ghost ? "GhostExplorer" : "Explorer";
		world.add(g);
		const rig = new THREE.Group();
		rig.name = "Rig";
		g.add(rig);
		const torso = new THREE.Group();
		torso.name = "Torso";
		torso.position.y = 0.71;
		rig.add(torso);
		// The asymmetrical scarf and binoculars give a recognisable little adventurer silhouette.
		box(0, 0.34, 0, 0.62, 0.58, 0.37, color, torso);
		box(0, 0.04, 0, 0.58, 0.19, 0.37, 0x66523a, torso);
		box(0, 0.08, 0.204, 0.14, 0.12, 0.055, P.gold, torso);
		box(0, 0.36, -0.28, 0.5, 0.57, 0.25, 0x718258, torso);
		box(0, 0.63, -0.3, 0.54, 0.12, 0.28, P.earth, torso);
		for (const s of [-1, 1])
			box(s * 0.2, 0.37, 0.205, 0.05, 0.5, 0.05, P.earth, torso, false);
		cyl(0, 0.69, 0, 0.12, 0.14, 0.16, 0xe4b982, torso, 7);
		const scarf = solid(
			new THREE.TorusGeometry(0.16, 0.06, 4, 8),
			P.red,
			torso,
		);
		scarf.rotation.x = Math.PI / 2;
		scarf.position.y = 0.68;
		const tail = box(-0.25, 0.58, 0.19, 0.29, 0.13, 0.06, P.red, torso);
		tail.rotation.z = -0.3;
		const head = new THREE.Group();
		head.name = "Head";
		head.position.y = 0.9;
		torso.add(head);
		sphere(0, 0, 0.015, 0.255, 0xe9bd87, head, 0.91, 1, 0.91, 1);
		box(0.08, -0.06, 0.22, 0.13, 0.13, 0.13, 0xe6b480, head);
		for (const s of [-1, 1]) {
			sphere(
				s * 0.095 + 0.035,
				0.025,
				0.225,
				0.042,
				P.ink,
				head,
				0.75,
				1.2,
				0.35,
				1,
				false,
			);
			box(
				s * 0.095 + 0.035,
				0.1,
				0.213,
				0.095,
				0.032,
				0.03,
				P.earth,
				head,
				false,
			);
		}
		box(0.045, -0.135, 0.215, 0.1, 0.024, 0.032, P.earth, head, false);
		cyl(0, 0.235, 0, 0.385, 0.385, 0.055, 0xb58a4e, head, 12);
		cyl(0, 0.347, -0.015, 0.225, 0.28, 0.23, 0xd3a566, head, 8);
		cyl(0, 0.26, -0.015, 0.281, 0.29, 0.065, P.earth, head, 8);
		leaf(0.24, 0.32, 0.01, 0.18, -0.35, P.red, head);
		const limbs = {};
		for (const [side, s] of [
			["L", -1],
			["R", 1],
		]) {
			const arm = new THREE.Group();
			arm.name = `Arm${side}`;
			arm.position.set(s * 0.36, 0.57, 0);
			torso.add(arm);
			limbs[`arm${side}`] = arm;
			box(0, -0.12, 0, 0.21, 0.29, 0.25, color, arm);
			cyl(0, -0.345, 0.015, 0.075, 0.085, 0.25, 0xe9bd87, arm, 7);
			sphere(0, -0.49, 0.015, 0.09, 0xe9bd87, arm, 1, 1.2, 1, 0);
			const leg = new THREE.Group();
			leg.name = `Leg${side}`;
			leg.position.set(s * 0.17, 0.7, 0);
			rig.add(leg);
			limbs[`leg${side}`] = leg;
			box(0, -0.2, 0, 0.24, 0.4, 0.28, 0x5b6140, leg);
			box(0, -0.46, 0, 0.18, 0.21, 0.21, 0xe0b380, leg);
			box(0.055, -0.61, 0.035, 0.31, 0.18, 0.4, 0x514535, leg);
			box(0.055, -0.705, 0.04, 0.32, 0.035, 0.41, P.ink, leg, false);
		}
		g.scale.setScalar(0.89);
		const mixer = new THREE.AnimationMixer(rig);
		const track = (name, values, times = [0, 0.3, 0.6]) =>
			new THREE.NumberKeyframeTrack(name, times, values);
		const clips = {
			idle: new THREE.AnimationClip("idle", 2, [
				track("Torso.position[y]", [0.71, 0.736, 0.71], [0, 1, 2]),
				track("Head.rotation[z]", [-0.025, 0.025, -0.025], [0, 1, 2]),
			]),
			run: new THREE.AnimationClip("run", 0.6, [
				track("LegL.rotation[z]", [-0.63, 0.63, -0.63]),
				track("LegR.rotation[z]", [0.63, -0.63, 0.63]),
				track("ArmL.rotation[z]", [0.6, -0.6, 0.6]),
				track("ArmR.rotation[z]", [-0.6, 0.6, -0.6]),
				track(
					"Torso.position[y]",
					[0.71, 0.78, 0.71, 0.78, 0.71],
					[0, 0.15, 0.3, 0.45, 0.6],
				),
			]),
			jump: new THREE.AnimationClip("jump", 0.7, [
				track("LegL.rotation[z]", [-0.38, -0.35, -0.38], [0, 0.35, 0.7]),
				track("LegR.rotation[z]", [0.45, 0.55, 0.45], [0, 0.35, 0.7]),
				track("ArmL.rotation[z]", [-0.8, -0.75, -0.8], [0, 0.35, 0.7]),
				track("ArmR.rotation[z]", [0.8, 0.75, 0.8], [0, 0.35, 0.7]),
			]),
			climb: new THREE.AnimationClip("climb", 0.8, [
				track("ArmL.rotation[z]", [2.5, 1.5, 2.5], [0, 0.4, 0.8]),
				track("ArmR.rotation[z]", [-1.5, -2.5, -1.5], [0, 0.4, 0.8]),
				track("LegL.rotation[z]", [-0.6, 0.3, -0.6], [0, 0.4, 0.8]),
				track("LegR.rotation[z]", [0.3, -0.6, 0.3], [0, 0.4, 0.8]),
			]),
			swing: new THREE.AnimationClip("swing", 1, [
				track("ArmL.rotation[z]", [2.85, 2.95, 2.85], [0, 0.5, 1]),
				track("ArmR.rotation[z]", [-2.85, -2.95, -2.85], [0, 0.5, 1]),
				track("LegL.rotation[z]", [-0.25, -0.45, -0.25], [0, 0.5, 1]),
				track("LegR.rotation[z]", [0.15, 0.35, 0.15], [0, 0.5, 1]),
			]),
		};
		const actions = Object.fromEntries(
			Object.entries(clips).map(([name, clip]) => [
				name,
				mixer.clipAction(clip),
			]),
		);
		actions.idle.play();
		g.userData = {
			mixer,
			actions,
			currentAction: "idle",
			rig,
			torso,
			limbs,
			ghost,
		};
		g.userData.setPose = (pose, dt) => {
			if (!pose) return;
			if (Number.isFinite(pose.x)) g.position.x = pose.x;
			if (Number.isFinite(pose.y)) g.position.y = pose.y;
			const next = pose.swinging
				? "swing"
				: pose.climbing
					? "climb"
					: !pose.grounded
						? "jump"
						: Math.abs(pose.vx || 0) > 0.15
							? "run"
							: "idle";
			if (next !== g.userData.currentAction) {
				actions[g.userData.currentAction]?.fadeOut(0.13);
				actions[next].reset().fadeIn(0.13).play();
				g.userData.currentAction = next;
			}
			mixer.timeScale =
				next === "run"
					? Math.max(0.65, Math.min(1.6, Math.abs(pose.vx || 0) / 5))
					: 1;
			mixer.update(dt);
			g.scale.x = pose.facing < 0 ? -0.89 : 0.89;
			g.rotation.y = pose.facing < 0 ? -0.22 : 0.22;
			rig.rotation.z = pose.swinging
				? -0.13 * (pose.swingAngle || 0)
				: Math.max(-0.1, Math.min(0.1, -(pose.vx || 0) * 0.013));
		};
		if (ghost)
			g.traverse((o) => {
				if (!o.isMesh) return;
				o.material = o.material.clone();
				o.material.transparent = true;
				o.material.opacity = o.material.side === THREE.BackSide ? 0.22 : 0.55;
				o.material.depthWrite = false;
				o.castShadow = false;
			});
		return g;
	}
	const player = explorer();
	const ghosts = new Map();
	function makeGhost(id, color = 0x68b9ce) {
		if (ghosts.has(id)) return ghosts.get(id);
		const g = explorer(color, true);
		g.name = `Ghost_${id}`;
		ghosts.set(id, g);
		return g;
	}
	function removeGhost(id) {
		const g = ghosts.get(id);
		if (!g) return;
		world.remove(g);
		ghosts.delete(id);
	}
	const relicNodes = new Map();
	for (const relic of config.relics || []) {
		const g = new THREE.Group();
		g.position.set(relic.x, relic.y + 0.95, 0);
		world.add(g);
		const ring = torus(0, 0, -0.08, 0.65, 0.025, P.cream, g);
		ring.material = mat(P.cream, { emissive: P.gold, emissiveIntensity: 0.3 });
		const idol = new THREE.Group();
		g.add(idol);
		sphere(0, 0, 0, 0.42, P.gold, idol, 0.75, 1.2, 0.62, 0);
		box(0, -0.4, 0, 0.56, 0.15, 0.42, P.gold, idol);
		box(0, 0.38, 0, 0.6, 0.12, 0.39, P.gold, idol);
		for (const side of [-1, 1]) {
			sphere(side * 0.23, 0.1, 0.18, 0.1, P.cream, idol, 1.2, 1, 0.3, 0);
			sphere(side * 0.23, 0.1, 0.215, 0.042, P.ink, idol, 1, 1, 0.2, 0, false);
			const wing = box(side * 0.43, 0, 0, 0.25, 0.14, 0.18, P.gold, idol);
			wing.rotation.z = side * 0.4;
		}
		box(0, -0.15, 0.24, 0.24, 0.065, 0.04, P.ink, idol, false);
		relicNodes.set(relic.id, {
			group: g,
			idol,
			ring,
			base: relic.y + 0.95,
			phase: relicNodes.size * 0.9,
		});
	}
	const coinNodes = [
		10, 26, 46, 63, 87, 105, 136, 153, 161, 185, 202, 231, 249, 271,
	].map((x, i) => {
		const group = new THREE.Group();
		const y = i === 5 || i === 10 ? -5.3 : 0.6;
		group.position.set(x, y, 0.1);
		world.add(group);
		const nugget = solid(new THREE.OctahedronGeometry(0.21), P.gold, group);
		nugget.scale.set(1, 1.25, 0.58);
		const glint = box(
			-0.035,
			0.055,
			0.115,
			0.045,
			0.1,
			0.025,
			P.cream,
			group,
			false,
		);
		glint.rotation.z = -0.5;
		return { group, y };
	});
	const logNodes = (config.logs || []).map((item) => {
		const g = new THREE.Group();
		g.position.set(item.x, item.y || 0, 0);
		world.add(g);
		const roll = new THREE.Group();
		roll.position.y = 0.45;
		g.add(roll);
		const core = cyl(0, 0, 0, 0.45, 0.45, 1.35, 0x926238, roll, 11);
		core.rotation.x = Math.PI / 2;
		for (const z of [-0.7, 0.7]) {
			const end = cyl(0, 0, z, 0.4, 0.4, 0.04, 0xd1a16a, roll, 11);
			end.rotation.x = Math.PI / 2;
			for (const r of [0.12, 0.28])
				torus(0, 0, z + Math.sign(z) * 0.03, r, 0.015, 0x8e663d, roll);
		}
		for (let i = 0; i < 7; i++) {
			const a = (i * Math.PI * 2) / 7;
			line(
				v(Math.cos(a) * 0.45, Math.sin(a) * 0.45, -0.62),
				v(Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.62),
				0.027,
				P.earth,
				roll,
			);
		}
		return { group: g, roll };
	});
	function crocodile() {
		const g = new THREE.Group();
		world.add(g);
		sphere(-0.15, 0.02, 0, 0.65, 0x658a47, g, 1.6, 0.35, 0.62, 1);
		const tail = solid(new THREE.ConeGeometry(0.3, 1.15, 5), 0x658a47, g);
		tail.rotation.z = Math.PI / 2;
		tail.position.set(-1.3, -0.02, 0);
		tail.scale.z = 0.65;
		box(0.75, -0.02, 0, 1.2, 0.18, 0.55, 0x7d9a4b, g);
		const jaw = new THREE.Group();
		jaw.position.set(0.18, 0.12, 0);
		g.add(jaw);
		box(0.57, 0.08, 0, 1.16, 0.22, 0.55, 0x789748, jaw);
		for (const z of [-0.25, 0.25])
			for (let i = 0; i < 5; i++) {
				const tooth = solid(
					new THREE.ConeGeometry(0.07, 0.15, 4),
					P.cream,
					jaw,
				);
				tooth.rotation.z = Math.PI;
				tooth.position.set(0.15 + i * 0.21, -0.08, z);
			}
		for (const z of [-0.22, 0.22]) {
			sphere(0.17, 0.32, z, 0.15, 0x799650, jaw, 1.0, 1.1, 0.8, 1);
			sphere(0.23, 0.355, z + 0.04, 0.062, P.ink, jaw, 0.9, 1, 0.5, 1, false);
		}
		for (let i = 0; i < 6; i++) {
			const spike = solid(new THREE.ConeGeometry(0.13, 0.16, 4), 0xb2b761, g);
			spike.position.set(-1.2 + i * 0.26, 0.22, 0);
		}
		for (const s of [-1, 1])
			for (const xx of [-0.6, 0.1])
				sphere(xx, -0.12, s * 0.4, 0.17, 0x547541, g, 1.7, 0.4, 1, 0);
		return { group: g, jaw };
	}
	const crocNodes = (config.crocs || []).map(() => crocodile());
	function snake() {
		const g = new THREE.Group();
		world.add(g);
		for (let i = 0; i < 7; i++)
			sphere(
				-0.6 + i * 0.15,
				0.13 + Math.sin(i * 0.8) * 0.03,
				Math.sin(i * 1.5) * 0.13,
				0.14 - i * 0.008,
				i % 2 ? 0x8c9d4a : 0x607448,
				g,
				1.25,
				0.75,
				0.85,
				0,
			);
		const neck = new THREE.Group();
		neck.position.set(0.35, 0.12, 0);
		g.add(neck);
		line(v(0, 0, 0), v(0.08, 0.52, 0), 0.105, 0x83944b, neck);
		sphere(0.08, 0.5, 0, 0.21, 0x9fa84f, neck, 1.3, 0.75, 0.85, 1);
		for (const z of [-0.13, 0.13])
			sphere(0.19, 0.56, z, 0.04, P.ink, neck, 1, 1, 0.5, 0, false);
		line(v(0.28, 0.49, 0), v(0.44, 0.48, 0), 0.014, P.red, neck);
		return { group: g, neck };
	}
	const snakeNodes = (config.snakes || []).map(() => snake());
	function scorpion() {
		const g = new THREE.Group();
		world.add(g);
		sphere(0, 0.15, 0, 0.25, 0x8b6848, g, 1.6, 0.6, 1, 1);
		for (const s of [-1, 1]) {
			for (let j = 0; j < 3; j++) {
				const xx = -0.15 + j * 0.18;
				line(
					v(xx, 0.12, s * 0.1),
					v(xx - 0.13, 0.04, s * 0.43),
					0.035,
					0xb39467,
					g,
				);
			}
			line(v(0.24, 0.15, s * 0.12), v(0.46, 0.18, s * 0.34), 0.05, 0xa88b60, g);
			sphere(0.48, 0.17, s * 0.34, 0.12, 0xb99b66, g, 1.5, 0.65, 0.85, 0);
		}
		const tail = new THREE.Group();
		tail.position.set(-0.25, 0.16, 0);
		g.add(tail);
		for (let i = 0; i < 6; i++)
			sphere(
				-Math.sin(i * 0.42) * 0.36,
				i * 0.13,
				0,
				0.105 - i * 0.008,
				i % 2 ? 0xae8a57 : 0x8c6947,
				tail,
				1,
				1,
				1,
				0,
			);
		const stinger = solid(new THREE.ConeGeometry(0.08, 0.21, 4), P.ink, tail);
		stinger.position.set(-0.14, 0.75, 0);
		stinger.rotation.z = -1.4;
		return { group: g, tail };
	}
	const scorpionNodes = (config.scorpions || []).map(() => scorpion());
	const vineNodes = (config.vines || []).map((item) => {
		const g = new THREE.Group();
		g.position.set(item.x, item.y, -0.04);
		world.add(g);
		const length = item.length || 8;
		cyl(0, -length / 2, 0, 0.045, 0.055, length, 0x4d6336, g, 5);
		line(
			v(-0.035, -0.15, 0.015),
			v(-0.035, -length + 0.1, 0.015),
			0.013,
			P.lime,
			g,
		);
		for (let yy = -0.5; yy > -length + 1; yy -= 1.1)
			leaf(0, yy, 0.06, 0.35, yy % 2 > -1 ? 0.7 : -0.7, P.lime, g);
		const knot = torus(0, -length + 0.1, 0.01, 0.11, 0.035, P.cream, g);
		knot.rotation.x = Math.PI / 2;
		return g;
	});
	const particleNodes = [];
	for (let i = 0; i < 96; i++) {
		const m = solid(new THREE.IcosahedronGeometry(1, 0), P.gold, world, false);
		m.visible = false;
		m.castShadow = false;
		particleNodes.push(m);
	}
	function update(state, dt = 0.016) {
		const t = state.time || 0;
		const p = state.player || {};
		player.position.set(p.x || 0, p.y || 0, 0);
		player.visible = !p.invuln || Math.floor(t * 12) % 2 === 0;
		player.userData.setPose(p, dt);
		for (const g of ghosts.values())
			if (g.userData.pose) {
				const gp = g.userData.pose;
				g.position.set(gp.x || 0, gp.y || 0, -0.12);
				g.userData.setPose(gp, dt);
			}
		for (const [id, item] of relicNodes) {
			item.group.visible = !state.collected?.has?.(id);
			item.group.position.y = item.base + Math.sin(t * 2.3 + item.phase) * 0.13;
			item.idol.rotation.y = Math.sin(t * 0.85) * 0.35;
			item.ring.rotation.z = t * 0.16;
		}
		coinNodes.forEach((item, i) => {
			item.group.visible = !state.coins?.has?.(i);
			item.group.rotation.y = t * 1.5 + i;
			item.group.position.y = item.y + Math.sin(t * 3 + i) * 0.07;
		});
		const h = state.hazards || {};
		(h.logs || config.logs || []).forEach((item, i) => {
			if (!logNodes[i]) return;
			logNodes[i].group.position.set(item.x, item.y || 0, 0);
			logNodes[i].roll.rotation.z = -item.x / 0.45;
		});
		(h.crocs || config.crocs || []).forEach((item, i) => {
			if (!crocNodes[i]) return;
			crocNodes[i].group.position.set(item.x, item.y ?? -0.15, 0);
			const target = item.open ? 0.77 : 0;
			crocNodes[i].jaw.rotation.z +=
				(target - crocNodes[i].jaw.rotation.z) * Math.min(1, dt * 15);
		});
		(h.snakes || config.snakes || []).forEach((item, i) => {
			if (!snakeNodes[i]) return;
			snakeNodes[i].group.position.set(item.x, item.y || 0, 0);
			snakeNodes[i].neck.rotation.z = Math.sin(t * 2.4 + i) * 0.14;
		});
		(h.scorpions || config.scorpions || []).forEach((item, i) => {
			if (!scorpionNodes[i]) return;
			scorpionNodes[i].group.position.set(item.x, item.y ?? -5.8, 0);
			scorpionNodes[i].group.rotation.y = item.facing < 0 ? Math.PI : 0;
			scorpionNodes[i].tail.rotation.x = Math.sin(t * 4 + i) * 0.12;
		});
		(state.vines || config.vines || []).forEach((item, i) => {
			if (!vineNodes[i]) return;
			vineNodes[i].position.set(item.x, item.y, -0.04);
			vineNodes[i].rotation.z =
				item.angle ?? Math.sin(t * 1.25 + (item.phase || 0)) * 0.9;
		});
		for (const { node, phase, amp, base } of fronds)
			node.rotation.z = (base || 0) + Math.sin(t * 0.65 + phase) * amp;
		fireflies.forEach(({ node, x, y, phase }) => {
			node.position.x = x + Math.sin(t * 0.8 + phase) * 0.4;
			node.position.y = y + Math.sin(t * 1.1 + phase) * 0.3;
			node.scale.setScalar(0.6 + Math.sin(t * 2 + phase) * 0.35);
		});
		campfires.forEach((f, i) => {
			f.scale.set(
				1 + Math.sin(t * 12 + i) * 0.12,
				1 + Math.sin(t * 17 + i) * 0.18,
				1,
			);
			f.rotation.y = Math.sin(t * 3 + i) * 0.15;
		});
		waters.forEach((w, i) => {
			if (w.geometry.type === "TorusGeometry")
				w.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.12);
		});
		const particles = state.particles || [];
		particleNodes.forEach((node, i) => {
			const pp = particles[i];
			if (!pp || pp.life <= 0) {
				node.visible = false;
				return;
			}
			node.visible = true;
			node.position.set(pp.x, pp.y, pp.z ?? 0.4);
			node.scale.setScalar(pp.size || 0.06);
			node.rotation.z = t * 3 + i;
			node.material = mat(pp.color || P.gold);
		});
	}
	return {
		player,
		ghosts,
		world,
		update,
		makeGhost,
		removeGhost,
		relicNodes,
		logNodes,
		crocNodes,
		snakeNodes,
		scorpionNodes,
		vineNodes,
		coinNodes,
		palette: P,
	};
}
