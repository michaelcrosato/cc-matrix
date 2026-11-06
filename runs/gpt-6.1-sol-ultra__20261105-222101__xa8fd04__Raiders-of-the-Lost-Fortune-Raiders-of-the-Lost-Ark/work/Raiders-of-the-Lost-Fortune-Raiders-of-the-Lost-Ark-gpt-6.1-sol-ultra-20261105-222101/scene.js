import { color as tslColor, normalWorld, vec3 } from "three/tsl";
// Procedural ink-and-sandstone art. No image or model assets.
const C = {
	ink: 0x172a27,
	sand: 0xb59b6c,
	pale: 0xe7d3a0,
	stone: 0x927e58,
	dark: 0x4d6556,
	jade: 0x397a67,
	leaf: 0x34654d,
	leafLight: 0x64825a,
	gold: 0xffc65b,
	red: 0xa54f36,
	blue: 0x51827b,
};
let T,
	cache = new Map();
function material(color, rough = 1) {
	const key = color + ":" + rough;
	if (!cache.has(key)) {
		const m = new T.MeshStandardNodeMaterial({
			roughness: rough,
			flatShading: true,
			metalness: rough < 0.5 ? 0.4 : 0,
		});
		const bands = normalWorld
			.dot(vec3(-0.4, 0.85, 0.34))
			.max(0)
			.mul(3)
			.floor()
			.div(3)
			.mul(0.45)
			.add(0.55);
		m.colorNode = tslColor(color).mul(bands);
		cache.set(key, m);
	}
	return cache.get(key);
}
function inkMesh(geo, color, parent, x = 0, y = 0, z = 0, outline = true) {
	const mesh = new T.Mesh(geo, material(color));
	mesh.position.set(x, y, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	if (outline) {
		const line = new T.Mesh(
			geo,
			new T.MeshBasicMaterial({ color: C.ink, side: T.BackSide }),
		);
		line.scale.setScalar(1.045);
		mesh.add(line);
	}
	return mesh;
}
function box(parent, w, h, d, x, y, z, color = C.sand, outline = true) {
	return inkMesh(new T.BoxGeometry(w, h, d), color, parent, x, y, z, outline);
}
function cyl(
	parent,
	r1,
	r2,
	h,
	x,
	y,
	z,
	color = C.sand,
	n = 8,
	outline = true,
) {
	return inkMesh(
		new T.CylinderGeometry(r1, r2, h, n),
		color,
		parent,
		x,
		y,
		z,
		outline,
	);
}
function ico(parent, r, x, y, z, color = C.sand, detail = 0, outline = true) {
	return inkMesh(
		new T.IcosahedronGeometry(r, detail),
		color,
		parent,
		x,
		y,
		z,
		outline,
	);
}
function line(parent, points, color = C.ink, width = 0.04) {
	const p = points.map((a) => new T.Vector3(...a));
	const curve = new T.CatmullRomCurve3(p);
	return inkMesh(
		new T.TubeGeometry(curve, Math.max(8, points.length * 4), width, 5, false),
		color,
		parent,
		0,
		0,
		0,
		false,
	);
}
function rng(seed = 71) {
	return () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}
function textPlaque(parent, text, w, h, x, y, z, flat = false) {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 144;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#17372f";
	ctx.fillRect(0, 0, 512, 144);
	ctx.strokeStyle = "#e4c98b";
	ctx.lineWidth = 8;
	ctx.strokeRect(5, 5, 502, 134);
	ctx.fillStyle = "#f7e5b5";
	ctx.font = "900 68px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, 256, 78, 470);
	const texture = new T.CanvasTexture(canvas);
	texture.colorSpace = T.SRGBColorSpace;
	texture.anisotropy = 4;
	const mesh = new T.Mesh(
		new T.PlaneGeometry(w, h),
		new T.MeshBasicMaterial({
			map: texture,
			side: T.DoubleSide,
			toneMapped: false,
		}),
	);
	mesh.position.set(x, y, z);
	if (flat) mesh.rotation.x = -Math.PI / 2;
	parent.add(mesh);
	return mesh;
}

export function createExplorer(THREE, color = 0x965c3b, guard = false) {
	T = THREE;
	const group = new T.Group();
	const rig = new T.Group();
	rig.name = "rig";
	group.add(rig);
	const jacket = guard ? 0x526b5d : color,
		pants = guard ? 0x334e48 : 0x4c5346,
		skin = guard ? 0xc9946f : 0xd9a77a;
	box(rig, 0.64, 0.65, 0.38, 0, 1.02, 0, jacket);
	box(rig, 0.5, 0.12, 0.42, 0, 0.73, 0, 0x463729);
	box(rig, 0.13, 0.16, 0.04, 0.08, 0.76, 0.235, C.gold);
	box(rig, 0.07, 0.53, 0.025, 0, 1.12, 0.207, 0xdbbe85, false);
	const head = new T.Group();
	head.name = "head";
	head.position.y = 1.47;
	rig.add(head);
	box(head, 0.47, 0.47, 0.43, 0, 0.04, 0, skin);
	box(head, 0.49, 0.12, 0.4, 0, 0.22, -0.04, 0x463729);
	box(head, 0.08, 0.08, 0.025, -0.12, 0.075, 0.226, C.ink, false);
	box(head, 0.08, 0.08, 0.025, 0.12, 0.075, 0.226, C.ink, false);
	box(head, 0.07, 0.09, 0.09, 0, -0.015, 0.248, skin);
	box(head, 0.15, 0.025, 0.025, 0.025, -0.12, 0.223, 0x674739, false);
	if (guard) {
		cyl(head, 0.35, 0.34, 0.13, 0, 0.3, -0.01, 0x3c574c, 10);
		box(head, 0.43, 0.04, 0.17, 0, 0.27, 0.24, 0x344a40);
	} else {
		cyl(head, 0.48, 0.5, 0.065, 0, 0.3, 0, 0x78543a, 12);
		cyl(head, 0.29, 0.35, 0.31, 0, 0.47, -0.035, 0x9b744c, 8);
		cyl(head, 0.342, 0.35, 0.085, 0, 0.35, -0.035, 0x493b2d, 8);
	}
	const joints = {};
	for (const [name, x, y] of [
		["armL", -0.43, 1.27],
		["armR", 0.43, 1.27],
		["legL", -0.19, 0.66],
		["legR", 0.19, 0.66],
	]) {
		const limb = new T.Group();
		limb.name = name;
		limb.position.set(x, y, 0);
		rig.add(limb);
		joints[name] = limb;
		const arm = name.startsWith("arm");
		box(
			limb,
			arm ? 0.22 : 0.25,
			arm ? 0.46 : 0.54,
			arm ? 0.23 : 0.27,
			0,
			arm ? -0.18 : -0.22,
			0,
			arm ? jacket : pants,
		);
		if (arm) box(limb, 0.21, 0.19, 0.22, 0, -0.47, 0, skin);
		else box(limb, 0.27, 0.17, 0.42, 0, -0.56, 0.075, 0x332e24);
	}
	const strap = box(rig, 0.075, 0.85, 0.035, -0.06, 1.13, 0.225, 0x3f3829);
	strap.rotation.z = -0.48;
	box(rig, 0.32, 0.34, 0.2, -0.42, 0.79, 0.12, 0x9b744b);
	box(rig, 0.34, 0.12, 0.24, -0.42, 0.94, 0.135, 0xc39b60);
	const whip = new T.Group();
	whip.visible = false;
	whip.name = "whip";
	rig.add(whip);
	const lash = line(
		whip,
		[
			[0.43, 0.82, 0.05],
			[0.8, 1.0, 0.6],
			[1.15, 1.05, 1.5],
			[0.85, 0.95, 2.6],
			[0.2, 0.8, 3.4],
		],
		0xf3d499,
		0.045,
	);
	lash.add(
		new T.Mesh(
			new T.TubeGeometry(
				new T.CatmullRomCurve3([
					new T.Vector3(0.43, 0.82, 0.05),
					new T.Vector3(0.8, 1, 0.6),
					new T.Vector3(1.15, 1.05, 1.5),
					new T.Vector3(0.85, 0.95, 2.6),
					new T.Vector3(0.2, 0.8, 3.4),
				]),
				24,
				0.075,
				5,
				false,
			),
			new T.MeshBasicMaterial({ color: C.ink, side: T.BackSide }),
		),
	);
	const times = [0, 0.16, 0.32, 0.48, 0.64];
	const tracks = (mult = 1) =>
		[
			["legL", 1],
			["legR", -1],
			["armL", -1],
			["armR", 1],
		].map(
			([name, s]) =>
				new T.NumberKeyframeTrack(name + ".rotation[x]", times, [
					0,
					0.65 * s * mult,
					0,
					-0.65 * s * mult,
					0,
				]),
		);
	const idle = new T.AnimationClip("idle", 2, [
		new T.NumberKeyframeTrack("rig.position[y]", [0, 1, 2], [0, 0.035, 0]),
		new T.NumberKeyframeTrack(
			"head.rotation[z]",
			[0, 1, 2],
			[-0.025, 0.025, -0.025],
		),
	]);
	const walk = new T.AnimationClip("walk", 0.64, tracks());
	const run = new T.AnimationClip("run", 0.64, tracks(1.45));
	const strike = new T.AnimationClip("whip", 0.38, [
		new T.NumberKeyframeTrack(
			"armR.rotation[x]",
			[0, 0.12, 0.23, 0.38],
			[0, -2, -0.6, 0],
		),
		new T.NumberKeyframeTrack(
			"rig.rotation[y]",
			[0, 0.12, 0.24, 0.38],
			[0, -0.45, 0.35, 0],
		),
	]);
	const hurt = new T.AnimationClip("hurt", 0.3, [
		new T.NumberKeyframeTrack(
			"rig.rotation[z]",
			[0, 0.08, 0.2, 0.3],
			[0, -0.18, 0.1, 0],
		),
	]);
	const mixer = new T.AnimationMixer(group),
		actions = {};
	for (const clip of [idle, walk, run, strike, hurt]) {
		actions[clip.name] = mixer.clipAction(clip);
		if (clip.name === "whip" || clip.name === "hurt") {
			actions[clip.name].setLoop(T.LoopOnce, 1);
			actions[clip.name].clampWhenFinished = false;
		}
	}
	actions.idle.play();
	const shadow = new T.Mesh(
		new T.CircleGeometry(0.52, 16),
		new T.MeshBasicMaterial({
			color: 0x13231c,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
		}),
	);
	shadow.rotation.x = -Math.PI / 2;
	shadow.position.y = 0.025;
	group.add(shadow);
	return { group, mixer, actions, whip, joints, rig };
}

export function buildWorld(THREE, scene) {
	T = THREE;
	cache = new Map();
	const random = rng();
	const root = new T.Group();
	scene.add(root);
	scene.background = new T.Color(0x172f2b);
	scene.fog = new T.Fog(0x172f2b, 44, 100);
	const solidBoxes = [],
		torches = [],
		foliage = [];
	const hemi = new T.HemisphereLight(0xf3e6bf, 0x1d4943, 2.1);
	scene.add(hemi);
	const sun = new T.DirectionalLight(0xffd5a0, 3.4);
	sun.position.set(-12, 28, 9);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -35;
	sun.shadow.camera.right = 35;
	sun.shadow.camera.top = 35;
	sun.shadow.camera.bottom = -35;
	sun.shadow.camera.far = 90;
	sun.shadow.bias = -0.001;
	scene.add(sun);
	const fill = new T.DirectionalLight(0x73bba9, 1.5);
	fill.position.set(15, 12, -35);
	scene.add(fill);
	box(root, 23, 0.8, 59, 0, -0.5, -16, C.ink, false);
	for (let row = 0; row < 28; row++)
		for (let col = 0; col < 10; col++) {
			const x = (col - 4.5) * 2.06,
				z = 11 - row * 2.02;
			const broken = random() < 0.09;
			const tile = box(
				root,
				2.0,
				0.16,
				1.96,
				x,
				-0.04 + (broken ? -0.04 : 0),
				z,
				[0xa58e60, 0xb49c6c, 0xc2aa76, 0xb9a071][Math.floor(random() * 4)],
				false,
			);
			if (broken) tile.rotation.y = (random() - 0.5) * 0.05;
		}
	// The ink-colored mortar makes the pavers read as an illustrated map.
	for (let z = 10; z > -44; z -= 4) {
		box(root, 0.07, 0.018, 1.1, -2.5, 0.06, z, 0x6d7854, false);
		box(root, 0.07, 0.018, 1.1, 2.5, 0.06, z, 0x6d7854, false);
	}
	for (let side of [-1, 1]) {
		for (let z = 10; z > -44; z -= 2.1) {
			const h = 0.45 + random() * 0.4;
			box(root, 0.7, h, 2, side * 10.5, h / 2 - 0.03, z, 0x78805a);
			if (random() < 0.4) {
				const rock = ico(
					root,
					0.6 + random() * 0.7,
					side * (11.5 + random() * 2),
					-0.6 - random(),
					z,
					C.dark,
				);
				rock.scale.set(1, 1.5, 1);
			}
		}
		box(root, 5, 1.8, 61, side * 14, -2, -16, 0x143c33, false);
	}
	function fern(x, z, s = 1) {
		const g = new T.Group();
		g.position.set(x, 0.12, z);
		g.scale.setScalar(s);
		root.add(g);
		for (let k = 0; k < 7; k++) {
			const leaf = inkMesh(
				new T.ConeGeometry(0.25, 1.7, 3),
				k % 2 ? C.leaf : C.leafLight,
				g,
				Math.sin(k * 2.4) * 0.45,
				0.5,
				Math.cos(k * 2.4) * 0.45,
				false,
			);
			leaf.rotation.set(
				Math.cos(k * 2.4) * 0.7,
				k * 2.4,
				Math.sin(k * 2.4) * 0.7,
			);
		}
		foliage.push(g);
		return g;
	}
	for (let i = 0; i < 65; i++)
		fern(
			(i % 2 ? 1 : -1) * (8.6 + random() * 3),
			10 - random() * 53,
			0.7 + random() * 0.8,
		);
	function glyph(parent, kind, x, y, z, s = 0.5, color = C.gold) {
		const g = new T.Group();
		g.position.set(x, y, z);
		g.scale.setScalar(s);
		parent.add(g);
		if (kind === 0) {
			const ring = inkMesh(
				new T.TorusGeometry(0.46, 0.065, 4, 12),
				color,
				g,
				0,
				0,
				0,
				false,
			);
			for (let i = 0; i < 8; i++) {
				const a = (i * Math.PI) / 4;
				const p = box(
					g,
					0.08,
					0.24,
					0.04,
					Math.sin(a) * 0.78,
					Math.cos(a) * 0.78,
					0,
					color,
					false,
				);
				p.rotation.z = -a;
			}
		} else if (kind === 1) {
			const eye = inkMesh(
				new T.TorusGeometry(0.55, 0.065, 4, 12),
				color,
				g,
				0,
				0,
				0,
				false,
			);
			eye.scale.y = 0.57;
			ico(g, 0.19, 0, 0, 0.03, color, 1, false);
			line(
				g,
				[
					[-0.75, 0, 0],
					[-0.5, 0.28, 0],
					[0, 0.4, 0],
					[0.5, 0.28, 0],
					[0.75, 0, 0],
				],
				color,
				0.05,
			);
		} else {
			line(
				g,
				[
					[-0.5, -0.6, 0],
					[0.42, -0.35, 0],
					[-0.4, 0.05, 0],
					[0.42, 0.4, 0],
					[0, 0.65, 0],
				],
				color,
				0.085,
			);
			ico(g, 0.16, 0.05, 0.66, 0, color, 0, false);
		}
		return g;
	}
	function column(x, z, h = 5) {
		const g = new T.Group();
		g.position.set(x, 0, z);
		root.add(g);
		box(g, 1.6, 0.3, 1.6, 0, 0.15, 0, 0x7e7754);
		box(g, 1.35, 0.3, 1.35, 0, 0.45, 0, C.pale);
		cyl(g, 0.49, 0.64, h - 0.95, 0, (h - 0.95) / 2 + 0.6, 0, C.sand, 8);
		for (let yy = 1.05; yy < h - 0.5; yy += 0.72) {
			cyl(g, 0.57, 0.57, 0.12, 0, yy, 0, 0x756e4a, 8);
		}
		box(g, 1.4, 0.25, 1.4, 0, h - 0.25, 0, C.pale);
		box(g, 1.75, 0.25, 1.7, 0, h, 0, C.sand);
		solidBoxes.push({ x, z, w: 1.35, d: 1.35, h });
		return g;
	}
	for (const z of [7, 0, -7, -15, -25, -33, -41])
		for (let side of [-1, 1]) {
			const h = z === -7 || z === -25 ? 5.8 : 3.4 + random() * 1.5;
			const g = column(side * 8.2, z, h);
			if (z % 2 !== 0)
				line(
					g,
					[
						[0.3, h, 0.3],
						[-0.2, h * 0.7, 0.55],
						[0.4, h * 0.4, 0.6],
						[-0.2, 0.2, 0.7],
					],
					C.leaf,
					0.12,
				);
		}
	// Monumental gateway into the inner temple.
	for (const z of [-7, -27]) {
		const h = z === -7 ? 6.2 : 5.7;
		box(root, 18.3, 0.8, 2, 0, h, z, C.sand);
		box(root, 18.7, 0.22, 2.3, 0, h + 0.49, z, C.pale);
		for (let i = -6; i <= 6; i += 2) {
			box(root, 1.6, 0.48, 0.14, i, h, z + 1.07, 0x786b4c);
			glyph(root, (i + 6) % 3, i, h, z + 1.16, 0.22, C.pale);
		}
		for (let side of [-1, 1]) {
			const head = ico(root, 1.05, side * 7.8, h - 1.15, z + 0.25, 0xc3a571, 1);
			head.scale.set(0.9, 1.2, 0.75);
			box(
				root,
				0.24,
				0.2,
				0.12,
				side * 7.8 - 0.3,
				h - 1,
				z + 1.01,
				C.ink,
				false,
			);
			box(
				root,
				0.24,
				0.2,
				0.12,
				side * 7.8 + 0.3,
				h - 1,
				z + 1.01,
				C.ink,
				false,
			);
			box(root, 0.25, 0.43, 0.25, side * 7.8, h - 1.4, z + 1.08, C.pale);
		}
	}
	function torch(x, z) {
		const g = new T.Group();
		g.position.set(x, 0, z);
		root.add(g);
		cyl(g, 0.45, 0.6, 0.25, 0, 0.15, 0, 0x59664c);
		cyl(g, 0.15, 0.23, 1.3, 0, 0.87, 0, 0x5a4834);
		cyl(g, 0.48, 0.2, 0.35, 0, 1.5, 0, 0x584938);
		const flame = inkMesh(
			new T.ConeGeometry(0.28, 0.9, 5),
			0xffba46,
			g,
			0,
			2,
			0,
			false,
		);
		const inner = inkMesh(
			new T.ConeGeometry(0.14, 0.6, 4),
			0xffe8a0,
			g,
			0,
			1.95,
			0.06,
			false,
		);
		const glow = new T.PointLight(0xffa54b, 5, 8, 2);
		glow.position.set(x, 2.4, z);
		scene.add(glow);
		torches.push({ group: g, flame, inner, light: glow, seed: random() * 10 });
	}
	for (let z of [6, -5, -13, -24, -32, -40])
		for (let x of [-6.9, 6.9]) torch(x, z);
	// Broken lintels, fallen slabs, pottery, and ancient ink carvings.
	for (let i = 0; i < 30; i++) {
		const side = i % 2 ? 1 : -1,
			x = side * (7.3 + random() * 1.5),
			z = 9 - random() * 50;
		const rock = box(
			root,
			0.4 + random(),
			0.2 + random() * 0.5,
			0.4 + random(),
			x,
			0.15,
			z,
			random() < 0.5 ? C.stone : C.sand,
		);
		rock.rotation.y = random() * 3;
		rock.rotation.z = (random() - 0.5) * 0.4;
	}
	for (let side of [-1, 1])
		for (let z of [4, -12, -31]) {
			const pot = cyl(
				root,
				0.32,
				0.45,
				0.75,
				side * 6.1,
				0.42,
				z,
				side === 1 ? 0xa15d3d : 0x697f68,
				8,
			);
			cyl(root, 0.24, 0.34, 0.1, side * 6.1, 0.83, z, 0xe3bf7c, 8);
			cyl(root, 0.19, 0.19, 0.015, side * 6.1, 0.89, z, C.ink, 8, false);
		}
	// Entry expedition camp and the return landmark.
	box(root, 4.4, 0.18, 1.1, 0, 0.12, 10.4, 0xc7b582);
	for (let x of [-1.7, 1.7]) {
		cyl(root, 0.06, 0.06, 3.4, x, 1.7, 11, 0x6f6142, 6);
	}
	const banner = box(root, 3.5, 0.8, 0.04, 0, 2.7, 11, 0xad6c42);
	box(root, 1.3, 0.11, 0.07, 0, 2.72, 11.04, C.pale, false);
	box(root, 1.3, 0.11, 0.07, 0, 2.47, 11.04, C.pale, false);
	for (let i = 0; i < 3; i++) {
		const crate = box(
			root,
			1,
			0.8,
			0.9,
			-4.7 + i * 0.95,
			0.4,
			9 + (i % 2) * 0.5,
			0x7c6343,
		);
		box(
			root,
			1.05,
			0.1,
			0.95,
			-4.7 + i * 0.95,
			0.5,
			9 + (i % 2) * 0.5,
			0xc2a16e,
		);
	}
	// Room boundaries are framed with low parapets rather than opaque walls.
	for (let z of [-9, -26])
		for (let side of [-1, 1]) {
			box(root, 4.4, 1.35, 0.7, side * 8, 0.67, z, C.stone);
			box(root, 4.8, 0.18, 0.9, side * 8, 1.43, z, C.pale);
		}
	// Three-face astronomical tumblers. Front-facing symbols at rotation 0, 2π/3, 4π/3.
	const puzzle = [];
	for (let i = 0; i < 3; i++) {
		const x = [-5, 0, 5][i],
			z = -21;
		const group = new T.Group();
		group.position.set(x, 0, z);
		root.add(group);
		cyl(root, 1.05, 1.15, 0.25, x, 0.15, z, 0x626e50, 8);
		cyl(group, 0.7, 0.85, 2.3, 0, 1.4, 0, 0x887c58, 3);
		cyl(group, 0.95, 0.75, 0.25, 0, 2.7, 0, C.pale, 6);
		cyl(group, 0.9, 0.9, 0.15, 0, 0.3, 0, C.gold, 6);
		for (let k = 0; k < 3; k++) {
			const face = new T.Group();
			face.rotation.y = (k * Math.PI * 2) / 3;
			group.add(face);
			box(face, 0.9, 1.1, 0.1, 0, 1.58, 0.51, 0x284e43);
			glyph(face, k, 0, 1.66, 0.58, 0.44, C.pale);
			textPlaque(face, ["SUN", "EYE", "SERPENT"][k], 1.08, 0.31, 0, 0.86, 0.61);
		}
		textPlaque(root, String(i + 1), 1.05, 0.5, x, 0.3, z + 1.35, true);
		const topMarkers = [];
		for (let k = 0; k < 3; k++) {
			const marker = new T.Group();
			marker.position.set(x, 2.92, z);
			marker.rotation.x = -Math.PI / 2;
			root.add(marker);
			box(marker, 1.95, 1.85, 0.08, 0, 0, 0, 0x294b3c);
			glyph(marker, k, 0, 0.24, 0.08, 0.51, C.pale);
			textPlaque(
				marker,
				["SUN", "EYE", "SERPENT"][k],
				1.78,
				0.4,
				0,
				-0.6,
				0.09,
			);
			marker.visible = k === [2, 0, 1][i];
			topMarkers.push(marker);
		}
		group.rotation.y = (-[2, 0, 1][i] * Math.PI * 2) / 3;
		puzzle.push({ group, x, z, value: [2, 0, 1][i], topMarkers });
	}
	// Puzzle clue: sun, eye, serpent arranged in carved plaques.
	const clue = new T.Group();
	clue.position.set(0, 0, -24);
	root.add(clue);
	box(clue, 5.9, 0.17, 2.0, 0, 0.17, 0, 0x5f7053);
	for (let i = 0; i < 3; i++) {
		const p = new T.Group();
		p.position.set((i - 1) * 1.8, 0.28, 0);
		p.rotation.x = -Math.PI / 2;
		clue.add(p);
		box(p, 1.5, 1.7, 0.07, 0, 0, 0, 0x263f35);
		glyph(p, [0, 1, 2][i], 0, 0.25, 0.05, 0.38, C.pale);
		textPlaque(p, ["SUN", "EYE", "SERPENT"][i], 1.35, 0.35, 0, -0.57, 0.06);
	}
	const gate = new T.Group();
	gate.position.set(0, 0, -27);
	root.add(gate);
	for (let i = -11; i <= 11; i++) {
		box(gate, 0.17, 4.8, 0.22, i * 0.86, 2.4, 0, 0x52604b);
		ico(gate, 0.15, i * 0.86, 0.08, 0, C.gold, 0);
	}
	box(gate, 20, 0.25, 0.4, 0, 4.5, 0, 0x8d8457);
	box(gate, 20, 0.2, 0.4, 0, 1.1, 0, 0x8d8457);
	// The reliquary: gold against jade, with a deliberately ominous floor mosaic.
	for (let j = 0; j < 3; j++)
		box(
			root,
			5.8 - j * 1.0,
			0.2,
			5.1 - j * 0.8,
			0,
			0.1 + j * 0.18,
			-37,
			C.stone,
		);
	cyl(root, 1.1, 1.35, 0.5, 0, 0.83, -37, C.sand, 8);
	cyl(root, 1.35, 1.1, 0.18, 0, 1.17, -37, C.pale, 8);
	const relic = new T.Group();
	relic.position.set(0, 1.5, -37);
	root.add(relic);
	box(relic, 1.25, 0.64, 0.8, 0, 0.17, 0, C.gold);
	box(relic, 1.5, 0.14, 1.0, 0, 0.55, 0, 0xffdf87);
	box(relic, 1.5, 0.14, 1.0, 0, -0.22, 0, 0xb18435);
	for (let side of [-1, 1]) {
		const wing = new T.Group();
		wing.position.set(side * 0.5, 0.64, 0);
		wing.rotation.z = -side * 0.5;
		relic.add(wing);
		for (let j = 0; j < 4; j++)
			box(
				wing,
				0.17,
				0.55 - j * 0.06,
				0.13,
				side * j * 0.12,
				j * 0.07,
				0,
				0xffdf87,
			);
		ico(relic, 0.17, side * 0.38, 0.66, 0, 0xffd27b, 1);
	}
	const halo = new T.PointLight(0xffc05a, 9, 9, 2);
	halo.position.set(0, 3, -37);
	scene.add(halo);
	for (let i = 0; i < 12; i++) {
		const a = (i * Math.PI) / 6;
		const piece = box(
			root,
			0.7,
			0.04,
			1.2,
			Math.sin(a) * 3.3,
			0.58,
			-37 + Math.cos(a) * 2.8,
			i % 2 ? 0x315e4e : 0xc7b57c,
			false,
		);
		piece.rotation.y = a;
	}
	// Guardian relief, visible above the relic from the gameplay camera.
	box(root, 10, 4, 1.2, 0, 2, -43, 0x536d55);
	box(root, 10.8, 0.3, 1.6, 0, 4.1, -43, C.sand);
	const mask = ico(root, 2.25, 0, 3.2, -42.1, C.sand, 1);
	mask.scale.set(1.1, 1.1, 0.35);
	for (let side of [-1, 1]) {
		box(root, 0.75, 0.3, 0.14, side * 0.85, 3.65, -41.3, C.ink, false);
		box(root, 0.4, 0.15, 0.17, side * 0.85, 3.69, -41.2, C.gold, false);
	}
	box(root, 0.5, 1, 0.6, 0, 3, -41.3, C.pale);
	box(root, 1.4, 0.25, 0.15, 0, 2.25, -41.2, C.ink, false);
	const boulder = new T.Group();
	boulder.position.set(0, 2.2, -40);
	boulder.visible = false;
	root.add(boulder);
	const sphere = ico(boulder, 2.45, 0, 0, 0, 0x8e8a63, 1);
	for (let i = 0; i < 7; i++) {
		const band = new T.Mesh(
			new T.TorusGeometry(2.43, 0.045, 4, 24),
			material(C.ink),
		);
		band.rotation.set(random() * 3, random() * 3, random() * 3);
		boulder.add(band);
	}
	const player = createExplorer(T);
	player.group.position.set(0, 0, 7);
	scene.add(player.group);
	const partner = createExplorer(T, 0x427b79);
	partner.group.position.set(1.4, 0, 7);
	partner.group.visible = false;
	scene.add(partner.group);
	const enemies = [];
	for (let i = 0; i < 5; i++) {
		const x = [-4, 4, 0, -6, 6][i],
			z = [1, -3, -7, -16, -16][i];
		if (i < 3) {
			const e = createExplorer(T, 0x526b5d, true);
			e.group.position.set(x, 0, z);
			e.group.rotation.y = Math.PI;
			scene.add(e.group);
			enemies.push({ ...e, hp: 2, type: "guard", x, z, homeX: x, homeZ: z });
		} else {
			const group = new T.Group();
			group.position.set(x, 0, z);
			scene.add(group);
			const snakeRig = new T.Group();
			snakeRig.rotation.y = -Math.PI / 2;
			group.add(snakeRig);
			for (let j = 0; j < 7; j++) {
				const bead = ico(
					snakeRig,
					0.19,
					j * 0.24 - 0.7,
					0.18,
					Math.sin(j * 0.7) * 0.15,
					j % 2 ? 0x485d3b : 0x899550,
					0,
				);
				bead.name = "segment" + j;
			}
			const head = ico(snakeRig, 0.28, 0.84, 0.25, 0.04, 0x899550, 1);
			head.scale.set(1.4, 0.7, 1);
			box(snakeRig, 0.04, 0.055, 0.055, 0.99, 0.31, 0.12, C.ink, false);
			box(snakeRig, 0.04, 0.055, 0.055, 0.99, 0.31, -0.12, C.ink, false);
			const mixer = new T.AnimationMixer(group),
				actions = {};
			const tr = [];
			for (let j = 0; j < 7; j++)
				tr.push(
					new T.NumberKeyframeTrack(
						"segment" + j + ".position[z]",
						[0, 0.3, 0.6],
						[
							Math.sin(j * 0.7) * 0.15,
							Math.sin(j * 0.7 + Math.PI) * 0.15,
							Math.sin(j * 0.7) * 0.15,
						],
					),
				);
			actions.walk = mixer.clipAction(new T.AnimationClip("slither", 0.6, tr));
			actions.idle = actions.walk;
			actions.run = actions.walk;
			actions.walk.play();
			enemies.push({
				group,
				mixer,
				actions,
				hp: 2,
				type: "snake",
				x,
				z,
				homeX: x,
				homeZ: z,
			});
		}
	}
	const pickups = [];
	for (let i = 0; i < 3; i++) {
		const x = [-7, 6, -6][i],
			z = [3, -5, -17][i];
		const group = new T.Group();
		group.position.set(x, 0.4, z);
		root.add(group);
		const gem = inkMesh(new T.OctahedronGeometry(0.25), C.gold, group, 0, 0, 0);
		pickups.push({ group, x, z, id: i, type: "treasure", collected: false });
	}
	const motesGeo = new T.BufferGeometry(),
		motesPos = new Float32Array(180 * 3);
	for (let i = 0; i < 180; i++) {
		motesPos[i * 3] = (random() - 0.5) * 21;
		motesPos[i * 3 + 1] = 0.5 + random() * 6;
		motesPos[i * 3 + 2] = 11 - random() * 54;
	}
	motesGeo.setAttribute("position", new T.BufferAttribute(motesPos, 3));
	const motes = new T.Points(
		motesGeo,
		new T.PointsMaterial({
			color: 0xffd89b,
			size: 0.065,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
		}),
	);
	root.add(motes);
	function update(time, dt) {
		for (const q of torches) {
			const f =
				1 +
				Math.sin(time * 11 + q.seed) * 0.12 +
				Math.sin(time * 19 + q.seed) * 0.06;
			q.flame.scale.set(1 / f, f, 1 / f);
			q.inner.scale.y = 1.1 - f * 0.25;
			q.light.intensity = 4.6 + f * 0.6;
		}
		for (let i = 0; i < foliage.length; i++) {
			foliage[i].rotation.z = Math.sin(time * 0.7 + i) * 0.025;
		}
		for (const p of puzzle) {
			const v =
				((Math.round((-p.group.rotation.y * 3) / (Math.PI * 2)) % 3) + 3) % 3;
			p.topMarkers.forEach((m, k) => (m.visible = k === v));
		}
		for (const p of pickups) {
			if (!p.collected) {
				p.group.rotation.y = time * 1.7;
				p.group.position.y = 0.55 + Math.sin(time * 2.5 + p.z) * 0.12;
			}
		}
		relic.rotation.y = Math.sin(time * 0.65) * 0.07;
		halo.intensity = relic.visible ? 8 + Math.sin(time * 2) * 1.5 : 0;
		for (let i = 0; i < 180; i++) {
			motesPos[i * 3 + 1] += 0.002 + dt * 0.025;
			if (motesPos[i * 3 + 1] > 6.7) motesPos[i * 3 + 1] = 0.5;
		}
		motesGeo.attributes.position.needsUpdate = true;
	}
	return {
		root,
		player,
		partner,
		enemies,
		relic,
		gate,
		boulder,
		puzzle,
		pickups,
		torches,
		solidBoxes,
		update,
		clue,
		lights: { sun, hemi, fill },
		bounds: { minX: -10, maxX: 10, minZ: -43, maxZ: 11 },
	};
}
