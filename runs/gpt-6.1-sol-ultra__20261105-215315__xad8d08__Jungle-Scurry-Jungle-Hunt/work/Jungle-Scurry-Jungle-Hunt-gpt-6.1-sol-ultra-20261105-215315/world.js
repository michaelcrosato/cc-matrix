// Procedural stagecraft for Jungle Scurry. All surfaces and animation are generated in code.
export function createWorld(THREE, scene) {
	const root = new THREE.Group();
	root.name = "JungleScurryWorld";
	scene.add(root);
	const backdrop = new THREE.Group(),
		stageRoot = new THREE.Group(),
		actorRoot = new THREE.Group(),
		fxRoot = new THREE.Group();
	root.add(backdrop, stageRoot, actorRoot, fxRoot);
	const C = {
		ink: 0x102c28,
		bark: 0x3b5541,
		barkLit: 0x7b8b53,
		leaf: 0x268965,
		lime: 0x8cbd59,
		mint: 0x67a87b,
		darkLeaf: 0x155646,
		jade: 0x318f77,
		cream: 0xffe8ab,
		gold: 0xffcb5d,
		orange: 0xe47138,
		red: 0xc55036,
		river: 0x278f98,
		stone: 0x72917b,
		deep: 0x103e39,
	};
	const materials = new Map();
	function mat(color, opts = {}) {
		const key = `${color}|${opts.opacity ?? 1}|${opts.fog !== false}`;
		if (!materials.has(key))
			materials.set(
				key,
				new THREE.MeshBasicMaterial({
					color,
					vertexColors: true,
					fog: opts.fog !== false,
					transparent: (opts.opacity ?? 1) < 1,
					opacity: opts.opacity ?? 1,
					depthWrite: (opts.opacity ?? 1) === 1,
				}),
			);
		return materials.get(key);
	}
	const ink = new THREE.MeshBasicMaterial({
		color: C.ink,
		side: THREE.BackSide,
	});
	// Quantized vertex lighting produces a three-tone cel ramp, also on the WebGPU path.
	function celGeometry(g) {
		const n = g.attributes.normal;
		const cols = new Float32Array(n.count * 3);
		for (let i = 0; i < n.count; i++) {
			const d = n.getX(i) * -0.35 + n.getY(i) * 0.78 + n.getZ(i) * 0.55;
			const v = d > 0.4 ? 1 : d > -0.25 ? 0.78 : 0.53;
			cols[i * 3] = v;
			cols[i * 3 + 1] = v;
			cols[i * 3 + 2] = v;
		}
		g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
		return g;
	}
	const G = {
		box: celGeometry(new THREE.BoxGeometry(1, 1, 1)),
		sphere: celGeometry(new THREE.SphereGeometry(1, 12, 8)),
		ico: celGeometry(new THREE.IcosahedronGeometry(1, 0)),
		rock: celGeometry(new THREE.DodecahedronGeometry(1, 0)),
		cylinder: celGeometry(new THREE.CylinderGeometry(1, 1, 1, 10)),
		cone: celGeometry(new THREE.ConeGeometry(1, 1, 8)),
		ring: celGeometry(new THREE.TorusGeometry(1, 0.1, 4, 20)),
	};
	const v0 = new THREE.Vector3(),
		v1 = new THREE.Vector3(),
		up = new THREE.Vector3(0, 1, 0);
	function mesh(
		group,
		shape,
		color,
		x = 0,
		y = 0,
		z = 0,
		sx = 1,
		sy = sx,
		sz = sx,
		outline = true,
		opts = {},
	) {
		const m = new THREE.Mesh(G[shape] || shape, mat(color, opts));
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		group.add(m);
		if (outline) {
			const hull = new THREE.Mesh(m.geometry, ink);
			hull.scale.set(1.035, 1.035, 1.035);
			m.add(hull);
		}
		return m;
	}
	function bar(group, a, b, r, color, outline = true) {
		v0.set(...a);
		v1.set(...b);
		const len = v0.distanceTo(v1);
		const m = mesh(
			group,
			"cylinder",
			color,
			(a[0] + b[0]) / 2,
			(a[1] + b[1]) / 2,
			(a[2] + b[2]) / 2,
			r,
			len,
			r,
			outline,
		);
		m.quaternion.setFromUnitVectors(up, v1.sub(v0).normalize());
		return m;
	}
	function random(seed) {
		let x = seed | 0;
		return () => {
			x = (Math.imul(x, 1664525) + 1013904223) | 0;
			return (x >>> 0) / 4294967296;
		};
	}
	let rnd = random(9486);
	const leaves = [];
	const birds = [];
	const pollen = [];
	const waterfalls = [];
	const flowers = [];

	function leaf(group, x, y, z, s = 1, angle = 0, color = C.leaf) {
		const m = mesh(
			group,
			"sphere",
			color,
			x,
			y,
			z,
			0.27 * s,
			0.83 * s,
			0.09 * s,
			true,
		);
		m.rotation.z = angle;
		return m;
	}
	function frond(group, x, y, z, s = 1, angle = 0, color = C.leaf) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		g.rotation.z = angle;
		group.add(g);
		bar(g, [0, 0, 0], [0, 2.2 * s, 0], 0.035 * s, C.lime, false);
		for (let j = 0; j < 5; j++) {
			const t = (j + 1) * 0.37 * s;
			leaf(g, -(0.45 + 0.05 * j) * s, t, 0, 0.5 * s, -0.95, color);
			leaf(g, (0.45 + 0.05 * j) * s, t, 0, 0.5 * s, 0.95, color);
		}
		return g;
	}
	function bush(group, x, y, z, s = 1, color = C.leaf) {
		for (let j = 0; j < 5; j++) {
			const a = (j / 4) * Math.PI;
			leaf(
				group,
				x + Math.cos(a) * s * 0.5,
				y + Math.sin(a) * s * 0.5,
				z,
				0.65 * s,
				(j - 2) * -0.55,
				color,
			);
		}
	}
	function flower(group, x, y, z, s = 1) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		group.add(g);
		bar(g, [0, 0, 0], [0, 0.7 * s, 0], 0.025 * s, C.lime, false);
		for (let j = 0; j < 5; j++) {
			const a = (j / 5) * Math.PI * 2;
			mesh(
				g,
				"sphere",
				j % 2 ? C.orange : C.gold,
				Math.cos(a) * 0.2 * s,
				0.7 * s + Math.sin(a) * 0.2 * s,
				0.04,
				0.17 * s,
				0.17 * s,
				0.06 * s,
				false,
			);
		}
		mesh(
			g,
			"sphere",
			C.cream,
			0,
			0.7 * s,
			0.1,
			0.1 * s,
			0.1 * s,
			0.05 * s,
			false,
		);
		flowers.push(g);
	}
	function tree(group, x, y, z, s = 1, canopy = true) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		group.add(g);
		bar(g, [-0.3 * s, 0, 0], [0, 12 * s, 0], 0.52 * s, C.bark);
		bar(g, [0, 7 * s, 0], [-2.9 * s, 10 * s, 0], 0.26 * s, C.bark);
		bar(g, [0, 9 * s, 0], [3.2 * s, 11.7 * s, 0], 0.23 * s, C.bark);
		bar(g, [-0.3 * s, 2 * s, 0], [-1.8 * s, 0, 1 * s], 0.23 * s, C.bark);
		for (let j = 0; j < 7; j++)
			bar(
				g,
				[-0.43 * s, (j * 1.45 + 0.6) * s, 0.41 * s],
				[0.17 * s, (j * 1.45 + 0.85) * s, 0.48 * s],
				0.035 * s,
				C.barkLit,
				false,
			);
		if (canopy) {
			for (let j = 0; j < 7; j++) {
				const a = (j / 7) * Math.PI * 2;
				mesh(
					g,
					"ico",
					j % 2 ? C.leaf : C.darkLeaf,
					Math.cos(a) * 2.3 * s,
					(12 + Math.sin(a) * 1.1) * s,
					Math.sin(a) * 1.5 * s,
					3.1 * s,
					1.7 * s,
					2 * s,
					true,
				);
			}
			for (let j = 0; j < 4; j++)
				frond(
					g,
					(j - 1.5) * 1.8 * s,
					11.3 * s,
					1 * s,
					0.8 * s,
					(j - 1.5) * 0.6,
					C.lime,
				);
		}
		return g;
	}
	function palm(group, x, y, z, s = 1) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		group.add(g);
		bar(g, [0, 0, 0], [0.7 * s, 6.5 * s, 0], 0.2 * s, C.barkLit);
		for (let j = 0; j < 7; j++)
			bar(
				g,
				[j * 0.1 * s, 0.9 * j * s, 0.18 * s],
				[0.23 * s + j * 0.1 * s, 0.9 * j * s + 0.06 * s, 0.18 * s],
				0.025 * s,
				C.bark,
				false,
			);
		for (let j = 0; j < 7; j++) {
			const a = (j / 6 - 0.5) * 2.9;
			frond(g, 0.7 * s, 6.5 * s, 0.05 * j * s, 0.85 * s, a, C.leaf);
		}
		return g;
	}
	function ground(x, width, y = 1, z = 0, depth = 7, color = C.barkLit) {
		mesh(stageRoot, "box", C.bark, x, y - 2.3, z, width, 4.6, depth);
		mesh(stageRoot, "box", color, x, y - 0.12, z, width, 0.25, depth + 0.15);
		for (let k = 0; k < Math.ceil(width / 1.5); k++) {
			const px = x - width / 2 + k * 1.5 + 0.5;
			mesh(
				stageRoot,
				"rock",
				C.bark,
				px,
				y - 2.2,
				depth / 2,
				0.6,
				0.7,
				0.2,
				false,
			);
			if (k % 3 === 0) bush(stageRoot, px, y, depth / 2 - 0.5, 0.7, C.lime);
		}
	}
	function flag(x, y, z, labelColor = C.orange) {
		bar(stageRoot, [x, y, z], [x, y + 3.6, z], 0.055, C.cream);
		const s = new THREE.Shape();
		s.moveTo(0, 0);
		s.lineTo(1.4, -0.1);
		s.lineTo(0.85, -0.65);
		s.lineTo(0, -0.6);
		s.closePath();
		const geo = celGeometry(new THREE.ShapeGeometry(s));
		const f = mesh(stageRoot, geo, labelColor, x, y + 3.5, z, 1, 1, 1, false);
		f.material.side = THREE.DoubleSide;
		return f;
	}
	// The distant landscape is continuous so the journey reads like a travelling illustrated diorama.
	mesh(backdrop, "sphere", 0xffdc91, 5, 16, -32, 5.8, 5.8, 0.2, false, {
		fog: false,
	});
	for (let layer = 0; layer < 3; layer++) {
		for (let j = -3; j < 16; j++) {
			const h = 8 + Math.sin(j * 1.81 + layer) * 4;
			const m = mesh(
				backdrop,
				"cone",
				[0x87b69a, 0x589e84, 0x357d69][layer],
				j * 13 + layer * 3,
				h / 2 + 2,
				-35 + layer * 5,
				12,
				h,
				4,
				false,
			);
			m.rotation.y = 0.3;
		}
	}
	for (let j = -2; j < 24; j++) {
		const x = j * 7;
		tree(backdrop, x, 0, -15, 0.6 + (j % 3) * 0.12, true);
	}
	// A striped expedition balloon quietly marks the rescue destination in the title panorama.
	const balloon = new THREE.Group();
	balloon.position.set(19, 14, -21);
	backdrop.add(balloon);
	mesh(balloon, "sphere", C.orange, 0, 2.1, 0, 2.2, 2.7, 1.6, true);
	for (let j = -1; j <= 1; j++)
		mesh(
			balloon,
			"sphere",
			C.cream,
			j * 0.65,
			2.2,
			1.27,
			0.24,
			2.2,
			0.25,
			false,
		);
	mesh(balloon, "box", C.barkLit, 0, -1.35, 0, 1.3, 0.7, 1, true);
	for (const i of [-1, 1])
		bar(balloon, [i * 0.55, -1, 0], [i * 1.05, 0.1, 0], 0.045, C.cream, false);
	mesh(balloon, "cone", C.gold, 0, -0.1, 0, 0.3, 0.55, 0.3, false);
	for (let j = 0; j < 16; j++) {
		const g = new THREE.Group();
		g.position.set(rnd() * 150 - 20, 8 + rnd() * 14, -18 - rnd() * 8);
		backdrop.add(g);
		bar(g, [-0.5, 0, 0], [0, 0.2, 0], 0.035, 0x315d51, false);
		bar(g, [0, 0.2, 0], [0.5, 0, 0], 0.035, 0x315d51, false);
		birds.push({ g, seed: rnd() * 10 });
	}
	// Permanently reusable fireflies and drifting pollen.
	for (let i = 0; i < 60; i++) {
		const m = mesh(
			fxRoot,
			"sphere",
			i % 4 === 0 ? C.cream : C.gold,
			rnd() * 40 - 15,
			rnd() * 18,
			-7 + rnd() * 11,
			0.025 + rnd() * 0.03,
			undefined,
			undefined,
			false,
			{ opacity: 0.65 },
		);
		pollen.push({
			m,
			x: m.position.x,
			y: m.position.y,
			z: m.position.z,
			speed: 0.12 + rnd() * 0.23,
			phase: rnd() * 7,
		});
	}
	function hero(color = C.leaf, ghost = false) {
		const g = new THREE.Group();
		g.name = ghost ? "ghostHero" : "hero";
		actorRoot.add(g);
		const body = new THREE.Group();
		body.name = "body";
		g.add(body);
		const jacket = color,
			skin = ghost ? 0x9be4dd : 0xe8af75,
			boots = ghost ? 0x285976 : 0x35433a;
		mesh(body, "box", C.bark, 0.05, 1.3, -0.27, 0.65, 0.85, 0.4, true);
		mesh(body, "sphere", jacket, 0, 1.26, 0, 0.48, 0.59, 0.29, true);
		mesh(body, "box", C.bark, 0, 1.03, 0.08, 0.86, 0.12, 0.52, true);
		mesh(body, "box", C.gold, 0.05, 1.04, 0.36, 0.18, 0.16, 0.055, false);
		const strap = mesh(
			body,
			"box",
			C.cream,
			0.03,
			1.4,
			0.285,
			0.12,
			0.85,
			0.04,
			false,
		);
		strap.rotation.z = -0.45;
		mesh(body, "box", C.orange, -0.28, 1.45, 0.305, 0.18, 0.2, 0.05, true);
		mesh(body, "sphere", C.gold, 0.28, 1.46, 0.31, 0.08, 0.08, 0.03, false);
		mesh(body, "sphere", skin, 0, 1.99, 0.04, 0.38, 0.43, 0.32, true);
		mesh(body, "sphere", skin, 0.24, 1.94, 0.29, 0.13, 0.11, 0.11, false);
		mesh(body, "sphere", skin, -0.37, 1.98, 0.015, 0.09, 0.13, 0.11, false);
		mesh(body, "sphere", skin, 0.37, 1.98, 0.015, 0.09, 0.13, 0.11, false);
		for (const x of [-0.13, 0.16]) {
			mesh(body, "sphere", 0x173a32, x, 2.05, 0.337, 0.044, 0.063, 0.03, false);
			const b = mesh(
				body,
				"box",
				C.bark,
				x,
				2.15,
				0.334,
				0.1,
				0.035,
				0.03,
				false,
			);
			b.rotation.z = x < 0 ? 0.15 : -0.15;
		}
		const smile = mesh(
			body,
			"ring",
			C.bark,
			0.07,
			1.85,
			0.34,
			0.13,
			0.07,
			0.018,
			false,
		);
		smile.rotation.z = 0.05;
		mesh(body, "cylinder", C.cream, 0, 2.27, 0.01, 0.65, 0.09, 0.5, true);
		mesh(body, "sphere", C.cream, 0, 2.4, -0.015, 0.43, 0.29, 0.36, true);
		mesh(body, "cylinder", C.barkLit, 0, 2.32, -0.01, 0.436, 0.1, 0.36, false);
		mesh(body, "sphere", C.orange, 0.07, 1.7, 0.05, 0.38, 0.13, 0.33, true);
		const scarf = mesh(
			body,
			"cone",
			C.orange,
			-0.49,
			1.56,
			-0.04,
			0.18,
			0.65,
			0.07,
			true,
		);
		scarf.rotation.z = -1.03;
		scarf.name = "scarf";
		const armL = new THREE.Group(),
			armR = new THREE.Group();
		armL.name = "armL";
		armR.name = "armR";
		armL.position.set(-0.46, 1.59, 0);
		armR.position.set(0.46, 1.59, 0);
		body.add(armL, armR);
		for (const a of [armL, armR]) {
			mesh(a, "sphere", jacket, 0, -0.19, 0, 0.19, 0.29, 0.19, true);
			mesh(a, "sphere", skin, 0, -0.51, 0.02, 0.13, 0.24, 0.12, true);
			mesh(a, "sphere", skin, 0, -0.75, 0.04, 0.15, 0.17, 0.14, true);
		}
		const legL = new THREE.Group(),
			legR = new THREE.Group();
		legL.name = "legL";
		legR.name = "legR";
		legL.position.set(-0.24, 0.92, 0);
		legR.position.set(0.24, 0.92, 0);
		body.add(legL, legR);
		for (const l of [legL, legR]) {
			mesh(l, "sphere", 0xd5ba80, 0, -0.27, 0, 0.22, 0.39, 0.22, true);
			mesh(l, "sphere", boots, 0.06, -0.66, 0.06, 0.24, 0.22, 0.28, true);
			mesh(l, "box", C.cream, 0.05, -0.51, 0.04, 0.39, 0.07, 0.35, false);
		}
		const mixer = new THREE.AnimationMixer(g),
			actions = {};
		function clip(name, duration, tracks) {
			const c = new THREE.AnimationClip(
				name,
				duration,
				tracks.map(
					([path, ts, vals]) => new THREE.NumberKeyframeTrack(path, ts, vals),
				),
			);
			actions[name] = mixer.clipAction(c);
		}
		const t = [0, 0.2, 0.4, 0.6, 0.8];
		clip("walk", 0.8, [
			["legL.rotation[z]", t, [0.65, 0, -0.65, 0, 0.65]],
			["legR.rotation[z]", t, [-0.65, 0, 0.65, 0, -0.65]],
			["armL.rotation[z]", t, [-0.65, 0, 0.65, 0, -0.65]],
			["armR.rotation[z]", t, [0.65, 0, -0.65, 0, 0.65]],
			["body.position[y]", t, [0, 0.055, 0, 0.055, 0]],
		]);
		clip("idle", 2.4, [
			["body.position[y]", [0, 1.2, 2.4], [0, 0.055, 0]],
			["armL.rotation[z]", [0, 1.2, 2.4], [-0.13, -0.2, -0.13]],
			["armR.rotation[z]", [0, 1.2, 2.4], [0.13, 0.2, 0.13]],
		]);
		clip("swing", 1.5, [
			["armL.rotation[z]", [0, 0.75, 1.5], [-2.8, -2.95, -2.8]],
			["armR.rotation[z]", [0, 0.75, 1.5], [2.8, 2.95, 2.8]],
			["legL.rotation[z]", [0, 0.75, 1.5], [0.35, 0.6, 0.35]],
			["legR.rotation[z]", [0, 0.75, 1.5], [-0.2, -0.4, -0.2]],
		]);
		clip("swim", 0.8, [
			["armL.rotation[z]", t, [-2, -0.5, 1, -0.5, -2]],
			["armR.rotation[z]", t, [0.5, 2, 0.5, -1, 0.5]],
			["legL.rotation[z]", t, [0.2, -0.4, 0.2, 0.6, 0.2]],
			["legR.rotation[z]", t, [-0.2, 0.4, -0.2, -0.6, -0.2]],
		]);
		clip("jump", 1, [
			["armL.rotation[z]", [0, 0.5, 1], [-1.2, -1, -1.2]],
			["armR.rotation[z]", [0, 0.5, 1], [1.2, 1, 1.2]],
			["legL.rotation[z]", [0, 0.5, 1], [0.55, 0.35, 0.55]],
			["legR.rotation[z]", [0, 0.5, 1], [-0.5, -0.65, -0.5]],
		]);
		clip("cheer", 0.8, [
			["armL.rotation[z]", t, [-2.2, -2.7, -2.2, -2.7, -2.2]],
			["armR.rotation[z]", t, [2.2, 2.7, 2.2, 2.7, 2.2]],
			["body.position[y]", t, [0, 0.18, 0, 0.18, 0]],
		]);

		clip("attack", 0.45, [
			["armR.rotation[z]", [0, 0.1, 0.24, 0.45], [0.15, 1.65, 1.5, 0.15]],
			["armL.rotation[z]", [0, 0.15, 0.45], [-0.2, -0.8, -0.2]],
		]);
		const knife = new THREE.Group();
		knife.position.set(0, -0.72, 0.08);
		armR.add(knife);
		mesh(knife, "cylinder", C.bark, 0, -0.04, 0, 0.075, 0.25, 0.075, true);
		mesh(knife, "box", C.gold, 0, -0.16, 0, 0.32, 0.07, 0.13, true);
		const blade = mesh(
			knife,
			"cone",
			C.cream,
			0,
			-0.65,
			0,
			0.15,
			0.95,
			0.055,
			true,
		);
		blade.rotation.z = Math.PI;
		knife.visible = false;
		const swish = mesh(
			body,
			celGeometry(new THREE.TorusGeometry(1, 0.035, 3, 16, Math.PI * 0.7)),
			C.cream,
			0.8,
			1.4,
			0.5,
			1,
			1,
			1,
			false,
			{ opacity: 0.85 },
		);
		swish.visible = false;
		let current = "idle";
		actions.idle.play();
		return {
			group: g,
			mixer,
			actions,
			setAction(name, speed = 1) {
				if (name !== current) {
					actions[current].fadeOut(0.12);
					actions[name].reset().fadeIn(0.12).play();
					current = name;
				}
				actions[name].timeScale = speed;
			},
			body,
			scarf,
			knife,
			swish,
		};
	}
	const heroData = hero(),
		ghostData = hero(0x4eafbf, true);
	const player = heroData.group,
		ghost = ghostData.group;
	ghost.visible = false;
	const enemyMeshes = new Map(),
		pickupMeshes = new Map();
	const vines = [];
	let currentStage = -1;
	let rescue = null;

	let bubbles = [];

	function croc() {
		const g = new THREE.Group();
		mesh(g, "sphere", 0x70914a, 0, 0, 0, 1.5, 0.42, 0.42, true);
		mesh(g, "box", 0x9fba63, 1.3, -0.05, 0.03, 1.6, 0.3, 0.62, true);
		mesh(g, "box", 0xe6d49b, 1.4, -0.23, 0.04, 1.6, 0.1, 0.58, true);
		mesh(g, "cone", C.leaf, -1.85, 0, 0, 0.34, 1.5, 0.34, true).rotation.z =
			Math.PI / 2;
		for (let i = 0; i < 5; i++)
			mesh(
				g,
				"cone",
				C.barkLit,
				-0.85 + i * 0.45,
				0.45,
				0,
				0.17,
				0.3,
				0.17,
				true,
			);
		for (const z of [-0.24, 0.24]) {
			mesh(g, "sphere", C.lime, 0.7, 0.33, z, 0.2, 0.21, 0.14, true);
			mesh(g, "sphere", C.ink, 0.81, 0.38, z + 0.06, 0.07, 0.08, 0.05, false);
		}
		for (let i = 0; i < 5; i++) {
			const t = mesh(
				g,
				"cone",
				C.cream,
				0.8 + i * 0.28,
				-0.27,
				0.37,
				0.065,
				0.17,
				0.065,
				false,
			);
			t.rotation.z = Math.PI;
		}
		for (const x of [-0.7, 0.8])
			for (const z of [-0.5, 0.5])
				mesh(g, "sphere", C.leaf, x, -0.23, z, 0.35, 0.16, 0.19, true);
		return g;
	}
	function boulder() {
		const g = new THREE.Group();
		mesh(g, "rock", C.stone, 0, 0, 0, 1, 1, 1, true);
		for (let k = 0; k < 4; k++) {
			const b = mesh(
				g,
				"box",
				0x425f52,
				Math.cos(k * 1.3) * 0.6,
				Math.sin(k * 1.3) * 0.6,
				0.75,
				0.5,
				0.055,
				0.07,
				false,
			);
			b.rotation.z = k * 1.3;
		}
		return g;
	}
	function beetle() {
		const g = new THREE.Group();
		mesh(g, "sphere", C.orange, 0, 0.2, 0, 0.67, 0.45, 0.42, true);
		mesh(g, "sphere", C.ink, 0.55, 0.17, 0.07, 0.23, 0.26, 0.28, true);
		mesh(g, "box", C.gold, -0.02, 0.24, 0.42, 0.045, 0.5, 0.04, false);
		for (let j = 0; j < 3; j++)
			for (const s of [-1, 1])
				bar(
					g,
					[-0.4 + j * 0.35, 0, s * 0.3],
					[-0.6 + j * 0.45, -0.15, s * 0.65],
					0.045,
					C.ink,
					false,
				);
		for (const z of [-0.15, 0.2]) {
			bar(g, [0.65, 0.35, z], [1, 0.62, z], 0.035, C.ink, false);
			mesh(g, "sphere", C.cream, 0.72, 0.25, z + 0.17, 0.07, 0.07, 0.04, false);
		}
		return g;
	}
	function drum() {
		const g = new THREE.Group();
		mesh(g, "cylinder", C.bark, 0, 0.2, 0, 0.55, 0.8, 0.55, true);
		for (const y of [-0.2, 0.6])
			mesh(g, "cylinder", C.cream, 0, y, 0, 0.57, 0.08, 0.57, true);
		for (let j = 0; j < 6; j++) {
			const a = (j / 6) * Math.PI * 2;
			bar(
				g,
				[Math.cos(a) * 0.56, -0.2, Math.sin(a) * 0.56],
				[Math.cos(a + 0.4) * 0.56, 0.6, Math.sin(a + 0.4) * 0.56],
				0.025,
				C.orange,
				false,
			);
		}
		return g;
	}
	function pickup(type = "fruit") {
		const g = new THREE.Group();
		if (type === "bell") {
			for (const sign of [-1, 1])
				bar(
					g,
					[sign * 0.9, -1.25, -0.2],
					[sign * 0.9, 1.65, -0.2],
					0.09,
					C.bark,
				);
			bar(g, [-1.1, 1.6, -0.2], [1.1, 1.6, -0.2], 0.12, C.barkLit);
			bar(g, [0, 1.6, -0.2], [0, 1.18, 0], 0.04, C.cream, false);
			mesh(g, "sphere", C.gold, 0, 0.7, 0, 0.52, 0.62, 0.42, true);
			const skirt = mesh(g, "cone", C.gold, 0, 0.28, 0, 0.72, 0.8, 0.58, true);
			skirt.rotation.z = Math.PI;
			mesh(g, "cylinder", C.cream, 0, -0.1, 0, 0.72, 0.09, 0.58, true);
			mesh(g, "sphere", C.orange, 0, -0.23, 0.02, 0.13, 0.15, 0.13, true);
			mesh(g, "ring", C.gold, 0, 0.85, -0.3, 1.08, 1.08, 0.12, true);
			g.userData.bell = true;
			const glow = new THREE.Group();
			g.add(glow);
			for (let j = 0; j < 8; j++) {
				const a = (j / 8) * Math.PI * 2;
				const ray = mesh(
					glow,
					"box",
					C.cream,
					Math.cos(a) * 1.35,
					0.6 + Math.sin(a) * 1.35,
					0.3,
					0.26,
					0.055,
					0.06,
					false,
				);
				ray.rotation.z = a;
			}
			g.userData.glow = glow;
		} else if (type === "air" || type === "bubble") {
			mesh(g, "sphere", 0xacebe0, 0, 0, 0, 0.4, 0.4, 0.4, true, {
				opacity: 0.38,
			});
			mesh(g, "sphere", C.cream, -0.12, 0.13, 0.3, 0.09, 0.11, 0.025, false);
		} else if (type === "relic" || type === "key") {
			mesh(g, "rock", C.gold, 0, 0, 0, 0.35, 0.45, 0.15, true);
			mesh(g, "ring", C.cream, 0, 0.05, 0.17, 0.21, 0.21, 0.1, false);
		} else {
			mesh(g, "sphere", C.orange, 0, 0, 0, 0.31, 0.34, 0.26, true);
			leaf(g, 0.09, 0.32, 0, 0.28, -0.5, C.lime);
			mesh(g, "sphere", C.cream, -0.1, 0.11, 0.23, 0.05, 0.1, 0.025, false);
		}
		return g;
	}
	function clearStage() {
		stageRoot.clear();
		for (const x of enemyMeshes.values()) actorRoot.remove(x);
		enemyMeshes.clear();
		for (const x of pickupMeshes.values()) actorRoot.remove(x);
		pickupMeshes.clear();
		vines.length = 0;
		waterfalls.length = 0;
		leaves.length = 0;
		flowers.length = 0;
		bubbles = [];
		rescue = null;
	}
	function setStage(index) {
		if (index === currentStage) return;
		clearStage();
		currentStage = index;
		rnd = random(9891 + index * 923);
		const len = index === 0 ? 84 : index === 3 ? 64 : 94;
		// Midground palms, broad leaves and crosshatching furnish each stretch of the track.
		for (let j = -2; j < Math.ceil(len / 9) + 2; j++) {
			tree(stageRoot, j * 9 + 1, -0.1, -5, 1.05 + (j % 2) * 0.16, true);
			if (j % 2 === 0) palm(stageRoot, j * 9 + 5, 1, -3, 0.8);
		}
		for (let j = 0; j < Math.ceil(len / 3); j++) {
			const x = j * 3 - 3;
			const gy = index === 2 ? 1 + x * 0.045 : 1;
			frond(
				stageRoot,
				x,
				gy,
				-2,
				0.6 + rnd() * 0.4,
				(rnd() - 0.5) * 1.6,
				j % 3 === 0 ? C.lime : C.leaf,
			);
			if (j % 4 === 0) flower(stageRoot, x + 1, gy, -0.5, 0.9);
		}
		if (index === 0) {
			ground(-1, 20, 3);
			ground(79, 18, 3);
			// Twisted branches clearly communicate the two banks and a deep canopy gap.
			bar(stageRoot, [-10, 2.55, 0], [8.6, 2.55, 0], 0.65, C.bark);
			bar(stageRoot, [70, 2.55, 0], [89, 2.55, 0], 0.65, C.bark);
			for (let j = 0; j < 7; j++) {
				const x = 7 + 11 * j;
				const vg = new THREE.Group();
				vg.position.set(x, 13.5, 0);
				stageRoot.add(vg);
				const rope = mesh(
					vg,
					"cylinder",
					C.lime,
					0,
					-4.4,
					0,
					0.065,
					8.8,
					0.065,
					true,
				);
				for (let k = 0; k < 5; k++)
					leaf(
						vg,
						k % 2 ? 0.12 : -0.12,
						-1 - k * 1.5,
						0,
						0.31,
						k % 2 ? 0.7 : -0.7,
						C.leaf,
					);
				mesh(vg, "sphere", C.gold, 0, -8.8, 0, 0.16, 0.16, 0.12, true);
				vines.push({ group: vg, rope });
				bar(
					stageRoot,
					[x - 1.6, 13.5, -0.25],
					[x + 1.6, 13.5, -0.25],
					0.25,
					C.bark,
				);
			}
			// Ribbon waterfall, its white strokes and cloud bank stretch below the crossing.
			for (let j = 0; j < 3; j++) {
				const x = 23 + j * 3;
				const wf = mesh(
					stageRoot,
					"box",
					[0x5fbeb2, 0x9ce3cd, 0x368f89][j],
					x,
					-2,
					-8,
					1.4,
					12,
					0.15,
					false,
					{ opacity: 0.65 },
				);
				waterfalls.push(wf);
			}
			for (let j = 0; j < 13; j++)
				mesh(
					stageRoot,
					"sphere",
					0x8cb69e,
					10 + j * 5,
					-4.3 + Math.sin(j) * 0.5,
					-1,
					4,
					1.4,
					2,
					false,
					{ opacity: 0.6 },
				);
			flag(74, 3, 0.9);
			bush(stageRoot, 4, 3, 3, 1.1, C.lime);
			bush(stageRoot, -4, 3, 3, 1.6, C.leaf);
		} else if (index === 1) {
			ground(44, 112, 0.05, 0, 8, 0x83a480);
			mesh(stageRoot, "box", C.river, 45, 3.7, -0.6, 108, 6.6, 3.6, false, {
				opacity: 0.34,
			});
			mesh(stageRoot, "box", 0x83dfcb, 45, 7.02, 0.1, 109, 0.07, 7, false, {
				opacity: 0.65,
			});
			for (let j = 0; j < 45; j++) {
				const x = j * 2.4 - 8;
				const reed = mesh(
					stageRoot,
					"cylinder",
					j % 2 ? C.lime : C.leaf,
					x,
					1,
					-2.7,
					0.04,
					2,
					0.04,
					false,
				);
				reed.rotation.z = Math.sin(j) * 0.2;
				leaf(stageRoot, x + 0.1, 1.2, -2.6, 0.6, -0.4, C.lime);
				if (j % 4 === 0) {
					mesh(stageRoot, "rock", C.stone, x, 0.4, 1, 0.9, 0.4, 0.65, true);
					frond(stageRoot, x, 0.3, 2, 0.4, 0.7, C.leaf);
				}
			}
			for (let j = 0; j < 25; j++) {
				const g = mesh(
					stageRoot,
					"ring",
					0xc6f2da,
					j * 4 - 3,
					7.07,
					0.2 + Math.sin(j) * 2,
					0.8,
					0.18,
					0.8,
					false,
					{ opacity: 0.5 },
				);
				g.rotation.x = Math.PI / 2;
				bubbles.push({ m: g, x: g.position.x, y: g.position.y, phase: j });
			}
			for (let j = 0; j < 18; j++) {
				const m = mesh(
					stageRoot,
					"sphere",
					0xb4e9d0,
					rnd() * 90,
					1 + rnd() * 5,
					1,
					0.07,
					0.07,
					0.07,
					false,
					{ opacity: 0.6 },
				);
				bubbles.push({ m, x: m.position.x, y: m.position.y, phase: j + 20 });
			}
			ground(-7, 16, 7.1, -0.2, 7);
			ground(95, 13, 7.1, -0.2, 7);
			flag(90, 7.1, 0);
		} else if (index === 2) {
			const slope = mesh(stageRoot, "box", C.bark, 43, 0, 0, 115, 4.5, 8, true);
			slope.rotation.z = 0.045;
			const top = mesh(
				stageRoot,
				"box",
				C.barkLit,
				43,
				2.795,
				0,
				115,
				0.28,
				8.2,
				true,
			);
			top.rotation.z = 0.045;
			for (let j = 0; j < 18; j++) {
				const x = j * 5;
				const y = 1 + x * 0.045;
				mesh(stageRoot, "rock", C.stone, x, y - 0.6, 3.8, 1, 0.7, 0.6, true);
				if (j % 3 === 0) frond(stageRoot, x, y, 3, 0.85, -0.7, C.lime);
			}
			for (let j = 0; j < 6; j++) {
				const x = 13 + j * 13;
				mesh(stageRoot, "rock", C.stone, x, 11 + x * 0.03, -5, 3, 3.6, 2, true);
				bush(stageRoot, x + 1, 12 + x * 0.03, -3, 1.5, C.lime);
			}
			flag(89, 5, 0.5);
		} else {
			ground(29, 85, 1, 0, 9);
			for (let j = 0; j < 6; j++)
				mesh(
					stageRoot,
					"box",
					C.stone,
					42 + j * 3,
					1.05,
					0.1,
					2.8,
					0.18,
					5,
					true,
				);
			// Overgrown rope machinery, an expedition balloon and a very inconvenienced naturalist.
			for (const s of [-1, 1]) {
				bar(
					stageRoot,
					[52 + s * 3, 1, -0.7],
					[52 + s * 3, 11, -0.7],
					0.32,
					C.bark,
				);
				bar(stageRoot, [52 + s * 3, 1, -0.7], [52 + s * 5, 1, 1], 0.18, C.bark);
			}
			bar(stageRoot, [48.7, 10.8, -0.7], [55.3, 10.8, -0.7], 0.37, C.bark);
			mesh(stageRoot, "ring", C.gold, 52, 10.5, 0, 0.6, 0.6, 0.6, true);
			bar(stageRoot, [52, 10.6, 0], [52, 6.7, 0], 0.055, C.cream);
			const cage = new THREE.Group();
			cage.position.set(52, 5.8, 0);
			stageRoot.add(cage);
			mesh(cage, "cylinder", C.barkLit, 0, -0.6, 0, 1.5, 0.22, 1.3, true);
			mesh(cage, "cylinder", C.gold, 0, 2.3, 0, 1.5, 0.15, 1.3, true);
			for (let j = 0; j < 8; j++) {
				const a = (j / 8) * Math.PI * 2;
				bar(
					cage,
					[Math.cos(a) * 1.45, -0.6, Math.sin(a) * 1.2],
					[Math.cos(a) * 1.45, 2.3, Math.sin(a) * 1.2],
					0.045,
					C.lime,
					false,
				);
			}
			const friend = hero(0x9e6aa5);
			actorRoot.remove(friend.group);
			cage.add(friend.group);
			friend.group.position.set(0, -0.5, 0);
			friend.group.scale.setScalar(0.88);
			friend.setAction("cheer");
			rescue = { cage, friend };
			const winch = new THREE.Group();
			winch.position.set(45, 2, 0);
			stageRoot.add(winch);
			mesh(winch, "cylinder", C.bark, 0, 0, 0, 0.7, 1, 0.7, true).rotation.x =
				Math.PI / 2;
			mesh(winch, "ring", C.gold, 0, 0, 0.65, 0.8, 0.8, 0.8, true);
			bar(winch, [0, 0, 0.72], [0.9, 0.6, 0.72], 0.075, C.cream);
			mesh(winch, "sphere", C.orange, 0.9, 0.6, 0.72, 0.16, 0.16, 0.16, true);
			for (let j = 0; j < 5; j++) flower(stageRoot, 48 + j * 2, 1, 2, 1.2);
			flag(57, 1, 2);
		}
		// Foreground silhouettes frame the lower edge without hiding the action corridor.
		for (let j = -1; j < Math.ceil(len / 13) + 1; j++) {
			const x = j * 13 + 3;
			const y = index === 2 ? x * 0.045 - 0.5 : -0.7;
			bush(stageRoot, x, y, 5.2, 1.7, C.deep);
			frond(stageRoot, x - 1, y, 5.5, 1.1, 0.9, C.darkLeaf);
		}
	}
	function update(dt, state = {}) {
		const stage = state.stage ?? currentStage;
		if (stage !== currentStage && stage >= 0) setStage(stage);
		const t = state.time ?? performance.now() / 1000;
		const p = state.player || {};
		if (Number.isFinite(p.x)) player.position.set(p.x, p.y ?? 1, 0);
		player.scale.x = (p.face ?? 1) < 0 ? -1 : 1;
		player.visible =
			!p.hidden && ((p.hit ?? 0) <= 0 || Math.floor(t * 14) % 2 === 0);
		const victory = state.mode === "victory" || state.victory || state.won;
		heroData.setAction(
			victory
				? "cheer"
				: p.attack > 0
					? "attack"
					: (p.swinging ?? -1) >= 0
						? "swing"
						: stage === 1
							? "swim"
							: Math.abs(p.vx ?? 0) > 0.3 && p.onGround
								? "walk"
								: !p.onGround && Math.abs(p.vy ?? 0) > 0.4
									? "jump"
									: "idle",
			Math.max(0.7, Math.min(1.7, Math.abs(p.vx ?? 0) / 6)),
		);
		heroData.mixer.update(dt);
		heroData.scarf.rotation.z = -1 + Math.sin(t * 7) * 0.12;
		heroData.body.rotation.z = p.duck
			? -0.35
			: stage === 1
				? -0.45
				: Math.max(-0.18, Math.min(0.18, -(p.vx ?? 0) * 0.018));
		heroData.body.scale.y = p.duck ? 0.68 : 1;

		heroData.knife.visible = p.attack > 0;
		heroData.swish.visible = p.attack > 0.17;
		heroData.swish.rotation.z = -(p.attack ?? 0) * 6;
		if (p.attack > 0) {
			heroData.body.rotation.z -= 0.16;
		}
		const gp = state.ghost;
		ghost.visible =
			!!gp && gp.visible !== false && (gp.stage ?? stage) === stage;
		if (ghost.visible) {
			ghost.position.set(gp.x, gp.y, 0.3);
			ghost.scale.x = (gp.face ?? 1) < 0 ? -1 : 1;

			ghostData.setAction(
				victory
					? "cheer"
					: gp.attack > 0
						? "attack"
						: (gp.swinging ?? -1) >= 0
							? "swing"
							: stage === 1
								? "swim"
								: Math.abs(gp.vx ?? 0) > 0.3 && gp.onGround
									? "walk"
									: !gp.onGround && Math.abs(gp.vy ?? 0) > 0.4
										? "jump"
										: "idle",
				Math.max(0.7, Math.min(1.7, Math.abs(gp.vx ?? 0) / 6)),
			);
			ghostData.mixer.update(dt);
			ghostData.scarf.rotation.z = -1 + Math.sin(t * 7) * 0.12;
			ghostData.body.rotation.z = gp.duck
				? -0.35
				: stage === 1
					? -0.45
					: Math.max(-0.18, Math.min(0.18, -(gp.vx ?? 0) * 0.018));
			ghostData.body.scale.y = gp.duck ? 0.68 : 1;
			ghostData.knife.visible = gp.attack > 0;
			ghostData.swish.visible = gp.attack > 0.17;
			ghostData.swish.rotation.z = -(gp.attack ?? 0) * 6;
			if (gp.attack > 0) ghostData.body.rotation.z -= 0.16;
		}
		for (let i = 0; i < vines.length; i++) {
			const v = state.vines?.[i];
			if (v) {
				const a = v.angle ?? 0;
				vines[i].group.rotation.z = a;
				vines[i].group.position.set(v.x ?? 7 + i * 11, v.y ?? 13.5, 0);
				const l = v.length ?? 8.8;
				vines[i].group.scale.y = l / 8.8;
			} else vines[i].group.rotation.z = Math.sin(t * 0.7 + i * 1.4) * 0.48;
		}
		const seen = new Set();
		(state.enemies || []).forEach((e, i) => {
			const id = e.id ?? i;
			seen.add(id);
			let g = enemyMeshes.get(id);
			if (!g) {
				g =
					e.type === "croc"
						? croc()
						: e.type === "boulder"
							? boulder()
							: e.type === "drum"
								? drum()
								: beetle();
				actorRoot.add(g);
				enemyMeshes.set(id, g);
			}
			g.visible = e.active !== false && !e.dead;
			if (!g.visible) return;
			g.position.set(e.x, e.y ?? 1, 0.1);
			g.scale.setScalar(e.radius ?? (e.type === "boulder" ? 1.1 : 1));
			if (e.type === "boulder") g.rotation.z = -(e.x ?? 0) * 0.8;
			else g.scale.x *= e.face ?? ((e.vx ?? -1) < 0 ? -1 : 1);
			if (e.type === "croc") g.position.y += Math.sin(t * 3 + i) * 0.04;
			if (e.stun > 0) {
				if (!g.userData.stars) {
					const stars = new THREE.Group();
					for (let j = 0; j < 3; j++) {
						const a = (j / 3) * Math.PI * 2;
						mesh(
							stars,
							"ico",
							C.gold,
							Math.cos(a) * 0.8,
							0.9 + Math.sin(a) * 0.15,
							Math.sin(a) * 0.8,
							0.15,
							0.15,
							0.15,
							false,
						);
					}
					g.add(stars);
					g.userData.stars = stars;
				}
				g.userData.stars.visible = true;
				g.userData.stars.rotation.y = t * 4;
				g.rotation.z = Math.sin(t * 7) * 0.12;
			} else if (g.userData.stars) {
				g.userData.stars.visible = false;
				g.rotation.z = 0;
			}
		});
		for (const [id, g] of enemyMeshes)
			if (!seen.has(id)) {
				actorRoot.remove(g);
				enemyMeshes.delete(id);
			}
		const pseen = new Set();
		(state.pickups || []).forEach((p, i) => {
			const id = p.id ?? i;
			pseen.add(id);
			let g = pickupMeshes.get(id);
			if (!g) {
				g = pickup(p.type);
				pickupMeshes.set(id, g);
				actorRoot.add(g);
			}
			g.visible = p.type === "bell" || !p.taken;
			g.position.set(
				p.x,
				(p.y ?? 2) + (p.type === "bell" ? 0 : Math.sin(t * 3 + i) * 0.11),
				0,
			);
			g.rotation.y = p.type === "bell" ? 0 : t * 0.7 + i;
			if (p.type === "bell") {
				g.userData.glow.visible = !!p.taken;
				g.userData.glow.rotation.z = p.taken ? t * 0.6 : 0;
				g.scale.setScalar(p.taken ? 1 + 0.04 * Math.sin(t * 5) : 1);
			}
		});
		for (const [id, g] of pickupMeshes)
			if (!pseen.has(id)) {
				actorRoot.remove(g);
				pickupMeshes.delete(id);
			}
		for (const m of pollen) {
			m.m.position.x =
				m.x + Math.sin(t * m.speed + m.phase) * 2 + (p.x ?? 4) - 4;
			m.m.position.y = m.y + Math.sin(t * 0.3 + m.phase) * 0.8;
			m.m.position.z = m.z;
		}
		for (const { g, seed } of birds) {
			g.position.x += dt * 0.4;
			g.rotation.z = Math.sin(t * 2 + seed) * 0.08;
		}
		for (const wf of waterfalls) wf.position.y = -2 + Math.sin(t * 1.7) * 0.12;
		for (const b of bubbles) {
			b.m.position.y = b.y + Math.sin(t * 1.4 + b.phase) * 0.07;
			b.m.scale.x = 0.8 + Math.sin(t + b.phase) * 0.1;
		}
		for (const f of flowers)
			f.rotation.z = Math.sin(t * 1.3 + f.position.x) * 0.045;
		balloon.position.y = 14 + Math.sin(t * 0.3) * 0.45;
		balloon.rotation.z = Math.sin(t * 0.23) * 0.035;
		if (rescue) {
			const progress =
				state.rescueProgress ?? state.rescue ?? (state.bells ?? 0) / 3;
			rescue.cage.position.y = 5.8 - Math.min(1, Number(progress) || 0) * 3.9;
			rescue.friend.mixer.update(dt);
			rescue.cage.rotation.z = Math.sin(t * 1.7) * 0.015;
		}
	}
	setStage(0);
	return { root, player, ghost, setStage, update, vines, backdrop, stageRoot };
}
