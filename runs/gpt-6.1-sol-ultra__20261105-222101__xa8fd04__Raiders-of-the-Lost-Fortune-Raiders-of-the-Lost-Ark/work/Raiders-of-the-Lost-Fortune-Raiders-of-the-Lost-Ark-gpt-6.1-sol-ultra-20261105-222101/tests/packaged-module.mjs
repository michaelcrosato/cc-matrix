
import { color as tslColor, normalWorld, vec3 } from "three/tsl";
const {buildWorld}=(()=>{
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

function createExplorer(THREE, color = 0x965c3b, guard = false) {
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

function buildWorld(THREE, scene) {
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

return {buildWorld};
})();
const {createAudio,renderAudioTest}=(()=>{
// All sounds are synthesized here. No audio assets, samples, or speech services.
const clamp = (x, a, b) => Math.min(b, Math.max(a, Number(x) || 0));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const MUSIC_DEFAULT = 0.1;

function makeGraph(
	context,
	destination,
	initialMusic = MUSIC_DEFAULT,
	initialSfx = 0.68,
) {
	const master = context.createGain();
	master.gain.value = 0.8;
	const music = context.createGain();
	music.gain.value = initialMusic;
	const fx = context.createGain();
	fx.gain.value = initialSfx;
	const ambient = context.createGain();
	ambient.gain.value = 0.13;
	const compressor = context.createDynamicsCompressor();
	compressor.threshold.value = -13;
	compressor.knee.value = 12;
	compressor.ratio.value = 6;
	compressor.attack.value = 0.003;
	compressor.release.value = 0.16;
	const analyser = context.createAnalyser();
	analyser.fftSize = 1024;
	music.connect(master);
	fx.connect(master);
	ambient.connect(master);
	master.connect(compressor);
	compressor.connect(analyser);
	analyser.connect(destination);
	let seed = 271828183,
		active = 0,
		notes = 0;
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
	const noiseBuffer = context.createBuffer(
		1,
		context.sampleRate * 2,
		context.sampleRate,
	);
	const noiseData = noiseBuffer.getChannelData(0);
	let brown = 0;
	for (let i = 0; i < noiseData.length; i++) {
		brown = (brown + (random() * 2 - 1) * 0.045) / 1.045;
		noiseData[i] = (random() * 2 - 1) * 0.64 + brown * 1.9;
	}
	function disposeAtEnd(source, nodes) {
		active++;
		source.onended = () => {
			active--;
			for (const node of nodes) {
				try {
					node.disconnect();
				} catch {}
			}
		};
	}
	function tone({
		frequency = 440,
		end = frequency,
		duration = 0.2,
		gain = 0.2,
		type = "sine",
		bus = fx,
		at = context.currentTime,
		attack = 0.005,
		detune = 0,
		filter = 0,
	}) {
		at = Math.max(context.currentTime, at);
		const oscillator = context.createOscillator();
		oscillator.type = type;
		const envelope = context.createGain();
		oscillator.frequency.setValueAtTime(Math.max(12, frequency), at);
		oscillator.frequency.exponentialRampToValueAtTime(
			Math.max(12, end),
			at + duration,
		);
		oscillator.detune.value = detune;
		envelope.gain.setValueAtTime(0.0001, at);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, gain),
			at + Math.min(attack, duration * 0.35),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		const chain = [oscillator, envelope];
		if (filter) {
			const lowpass = context.createBiquadFilter();
			lowpass.type = "lowpass";
			lowpass.frequency.setValueAtTime(filter, at);
			lowpass.Q.value = 0.6;
			oscillator.connect(lowpass);
			lowpass.connect(envelope);
			chain.push(lowpass);
		} else oscillator.connect(envelope);
		envelope.connect(bus);
		disposeAtEnd(oscillator, chain);
		oscillator.start(at);
		oscillator.stop(at + duration + 0.015);
		notes++;
	}
	function noise({
		duration = 0.2,
		gain = 0.15,
		frequency = 1800,
		end = frequency,
		type = "bandpass",
		bus = fx,
		at = context.currentTime,
		attack = 0.003,
		q = 0.7,
	}) {
		at = Math.max(context.currentTime, at);
		const source = context.createBufferSource();
		source.buffer = noiseBuffer;
		const filter = context.createBiquadFilter();
		filter.type = type;
		filter.Q.value = q;
		filter.frequency.setValueAtTime(frequency, at);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(20, end),
			at + duration,
		);
		const envelope = context.createGain();
		envelope.gain.setValueAtTime(0.0001, at);
		envelope.gain.exponentialRampToValueAtTime(
			gain,
			at + Math.min(attack, duration * 0.3),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(bus);
		disposeAtEnd(source, [source, filter, envelope]);
		source.start(at, random());
		source.stop(at + duration + 0.015);
	}
	function brass(note, at, duration = 0.32, accent = 1) {
		const frequency = midi(note);
		tone({
			frequency,
			duration,
			gain: 0.19 * accent,
			type: "sawtooth",
			filter: 1350,
			attack: 0.035,
			bus: music,
			at,
		});
		tone({
			frequency: frequency * 1.004,
			duration: duration * 0.95,
			gain: 0.07 * accent,
			type: "triangle",
			attack: 0.04,
			bus: music,
			at,
		});
	}
	function pluck(note, at, accent = 1) {
		tone({
			frequency: midi(note),
			duration: 0.27,
			gain: 0.13 * accent,
			type: "triangle",
			bus: music,
			at,
		});
		tone({
			frequency: midi(note) * 3,
			duration: 0.065,
			gain: 0.025 * accent,
			type: "sine",
			bus: music,
			at,
		});
	}
	const melody = [
		62, 0, 65, 67, 69, 0, 67, 65, 62, 0, 57, 0, 60, 62, 65, 0, 67, 0, 69, 72,
		74, 0, 72, 69, 67, 65, 62, 0, 60, 0, 57, 0,
	];
	const triumphant = [62, 0, 65, 69, 74, 0, 72, 69, 70, 0, 67, 0, 69, 0, 74, 0];
	const roots = [38, 34, 41, 36];
	function musicStep(step, at, phase = "explore") {
		const urgent = phase === "escape" || phase === "combat";
		const index = step % 32,
			root = roots[Math.floor(index / 8)];
		if (step % 4 === 0) {
			tone({
				frequency: midi(root),
				duration: 0.42,
				gain: 0.23,
				type: "triangle",
				bus: music,
				at,
			});
			noise({
				duration: 0.07,
				gain: 0.12,
				frequency: 130,
				end: 60,
				type: "lowpass",
				bus: music,
				at,
			});
		}
		if (step % 4 === 2)
			noise({
				duration: 0.1,
				gain: 0.08,
				frequency: 1400,
				end: 600,
				bus: music,
				at,
			});
		noise({
			duration: 0.025,
			gain: urgent ? 0.045 : 0.026,
			frequency: 5300,
			type: "highpass",
			bus: music,
			at,
		});
		const chord = [0, 7, 12, 15];
		pluck(root + 24 + chord[step % 4], at, urgent ? 1.1 : 0.7);
		const tune = phase === "victory" ? triumphant[index % 16] : melody[index];
		if (tune && (urgent || phase === "victory" || step % 2 === 0))
			brass(tune, at, urgent ? 0.22 : 0.37, urgent ? 0.8 : 0.72);
		if (phase === "escape" && step % 2 === 0)
			tone({
				frequency: midi(root + 12),
				duration: 0.12,
				gain: 0.1,
				type: "sawtooth",
				filter: 700,
				bus: music,
				at,
			});
	}
	function sound(name, at = context.currentTime) {
		switch (name) {
			case "whip":
				noise({ duration: 0.18, gain: 0.4, frequency: 500, end: 5200, at });
				noise({
					duration: 0.055,
					gain: 0.5,
					frequency: 4200,
					end: 1600,
					at: at + 0.115,
				});
				tone({
					frequency: 730,
					end: 90,
					duration: 0.09,
					gain: 0.17,
					type: "sawtooth",
					at: at + 0.11,
				});
				break;
			case "hit":
				noise({ duration: 0.14, gain: 0.36, frequency: 1200, end: 160, at });
				tone({
					frequency: 125,
					end: 45,
					duration: 0.19,
					gain: 0.25,
					type: "triangle",
					at,
				});
				break;
			case "jump":
				tone({
					frequency: 210,
					end: 530,
					duration: 0.17,
					gain: 0.14,
					type: "triangle",
					at,
				});
				noise({ duration: 0.1, gain: 0.05, frequency: 1000, end: 2700, at });
				break;
			case "land":
				tone({
					frequency: 100,
					end: 35,
					duration: 0.14,
					gain: 0.18,
					type: "sine",
					at,
				});
				noise({ duration: 0.15, gain: 0.15, frequency: 600, end: 100, at });
				break;
			case "coin":
				tone({ frequency: 1175, duration: 0.09, gain: 0.18, type: "sine", at });
				tone({
					frequency: 1568,
					duration: 0.28,
					gain: 0.16,
					type: "triangle",
					at: at + 0.07,
				});
				break;
			case "puzzle":
				[62, 65, 69].forEach((n, i) =>
					tone({
						frequency: midi(n + 12),
						duration: 0.38,
						gain: 0.15,
						type: "triangle",
						at: at + i * 0.085,
					}),
				);
				noise({ duration: 0.38, gain: 0.11, frequency: 230, end: 70, at });
				break;
			case "gate":
				noise({
					duration: 1.35,
					gain: 0.24,
					frequency: 250,
					end: 90,
					type: "lowpass",
					at,
					attack: 0.08,
				});
				[0, 0.22, 0.45, 0.69].forEach((d) =>
					tone({
						frequency: 75,
						end: 45,
						duration: 0.2,
						gain: 0.16,
						type: "sawtooth",
						filter: 200,
						at: at + d,
					}),
				);
				break;
			case "relic":
				[62, 69, 74, 77, 81].forEach((n, i) =>
					tone({
						frequency: midi(n),
						duration: 1.25,
						gain: 0.11,
						type: "sine",
						attack: 0.04,
						at: at + i * 0.12,
					}),
				);
				noise({
					duration: 1.6,
					gain: 0.06,
					frequency: 3800,
					end: 7000,
					type: "highpass",
					at,
					attack: 0.15,
				});
				break;
			case "damage":
				tone({
					frequency: 225,
					end: 65,
					duration: 0.35,
					gain: 0.22,
					type: "sawtooth",
					filter: 1100,
					at,
				});
				noise({ duration: 0.22, gain: 0.2, frequency: 1200, end: 250, at });
				break;
			case "roll":
				noise({ duration: 0.32, gain: 0.2, frequency: 800, end: 250, at });
				tone({
					frequency: 160,
					end: 75,
					duration: 0.25,
					gain: 0.06,
					type: "triangle",
					at,
				});
				break;
			case "win":
				[62, 65, 69, 74, 77, 81, 86].forEach((n, i) => {
					tone({
						frequency: midi(n),
						duration: 0.7,
						gain: 0.14,
						type: "triangle",
						at: at + i * 0.13,
					});
					tone({
						frequency: midi(n) * 1.003,
						duration: 0.7,
						gain: 0.055,
						type: "sawtooth",
						filter: 1600,
						attack: 0.025,
						at: at + i * 0.13,
					});
				});
				break;
			case "click":
				tone({
					frequency: 740,
					end: 980,
					duration: 0.06,
					gain: 0.08,
					type: "sine",
					at,
				});
				break;
			case "step":
				noise({ duration: 0.055, gain: 0.055, frequency: 550, end: 260, at });
				break;
			case "rumble":
				noise({
					duration: 1.5,
					gain: 0.2,
					frequency: 85,
					end: 48,
					type: "lowpass",
					at,
					attack: 0.12,
				});
				break;
			default:
				tone({
					frequency: 440,
					duration: 0.08,
					gain: 0.06,
					type: "triangle",
					at,
				});
		}
	}
	function voice(text = "Tala numa", at = context.currentTime) {
		// Vowel-colored tonal syllables. Text controls cadence, never intelligible speech.
		const count = clamp(String(text).replace(/\s/g, "").length / 3, 3, 13);
		const vowels = [620, 1050, 800, 450, 1250];
		for (let i = 0; i < count; i++) {
			const pitch = 130 + (i % 3) * 29 + random() * 25;
			tone({
				frequency: pitch,
				end: pitch * (i % 2 ? 0.88 : 1.2),
				duration: 0.105 + random() * 0.05,
				gain: 0.1,
				type: "sawtooth",
				filter: vowels[i % 5],
				at: at + i * 0.12,
			});
			tone({
				frequency: pitch * 2,
				duration: 0.09,
				gain: 0.035,
				type: "sine",
				at: at + i * 0.12,
			});
		}
	}
	let ambience = [];
	function startAmbience() {
		if (ambience.length) return;
		const source = context.createBufferSource();
		source.buffer = noiseBuffer;
		source.loop = true;
		const wind = context.createBiquadFilter();
		wind.type = "lowpass";
		wind.frequency.value = 150;
		const windGain = context.createGain();
		windGain.gain.value = 0.13;
		source.connect(wind);
		wind.connect(windGain);
		windGain.connect(ambient);
		const flame = context.createBiquadFilter();
		flame.type = "bandpass";
		flame.frequency.value = 1900;
		flame.Q.value = 0.3;
		const flameGain = context.createGain();
		flameGain.gain.value = 0.025;
		source.connect(flame);
		flame.connect(flameGain);
		flameGain.connect(ambient);
		source.start();
		ambience = [source, wind, windGain, flame, flameGain];
	}
	function stopAmbience() {
		if (ambience.length) {
			try {
				ambience[0].stop();
			} catch {}
			for (const node of ambience) node.disconnect();
			ambience = [];
		}
	}
	return {
		master,
		music,
		fx,
		analyser,
		musicStep,
		sound,
		voice,
		startAmbience,
		stopAmbience,
		get active() {
			return active;
		},
		get notes() {
			return notes;
		},
	};
}

function createAudio() {
	let context = null,
		graph = null,
		volume = MUSIC_DEFAULT,
		sfxVolume = 0.68,
		muted = false;
	let nextStep = 0,
		step = 0,
		phase = "explore",
		suspended = false;
	async function unlock() {
		const AudioContext =
			globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!AudioContext) return false;
		if (!context) {
			context = new AudioContext();
			graph = makeGraph(context, context.destination, volume, sfxVolume);
			graph.master.gain.value = muted ? 0 : 0.8;
			graph.startAmbience();
			nextStep = context.currentTime + 0.035;
		}
		if (context.state === "suspended") await context.resume();
		suspended = false;
		return context.state === "running";
	}
	const ramp = (param, value) => {
		if (!context) return;
		param.cancelScheduledValues(context.currentTime);
		param.setTargetAtTime(value, context.currentTime, 0.035);
	};
	return {
		unlock,
		update(_dt, nextPhase = "explore") {
			phase = nextPhase;
			if (!context || context.state !== "running" || suspended) return;
			if (nextStep < context.currentTime - 0.25)
				nextStep = context.currentTime + 0.02;
			const eighth =
				60 / (phase === "escape" ? 142 : phase === "combat" ? 128 : 108) / 2;
			while (nextStep < context.currentTime + 0.13) {
				graph.musicStep(step++, nextStep, phase);
				nextStep += eighth;
			}
		},
		sfx(name) {
			if (context?.state === "running" && !suspended) graph.sound(name);
		},
		say(text) {
			if (context?.state === "running" && !suspended) graph.voice(text);
		},
		setMusic(value) {
			volume = clamp(value, 0, 1);
			if (graph) ramp(graph.music.gain, volume);
		},
		setSfx(value) {
			sfxVolume = clamp(value, 0, 1);
			if (graph) ramp(graph.fx.gain, sfxVolume);
		},
		setMuted(value) {
			muted = !!value;
			if (graph) ramp(graph.master.gain, muted ? 0 : 0.8);
		},
		async suspend() {
			suspended = true;
			if (context?.state === "running") await context.suspend();
		},
		async resume() {
			return unlock();
		},
		async dispose() {
			if (graph) graph.stopAmbience();
			if (context && context.state !== "closed") await context.close();
		},
		debug() {
			return {
				state: context?.state || "locked",
				music: volume,
				sfx: sfxVolume,
				muted,
				phase,
				scheduledNotes: graph?.notes || 0,
				activeSources: graph?.active || 0,
			};
		},
		get music() {
			return volume;
		},
		get sfxVolume() {
			return sfxVolume;
		},
		get context() {
			return context;
		},
		get analyser() {
			return graph?.analyser || null;
		},
	};
}

async function renderAudioTest() {
	const Offline =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!Offline)
		return { supported: false, reason: "OfflineAudioContext unavailable" };
	const context = new Offline(2, 44100 * 4, 44100);
	const graph = makeGraph(context, context.destination);
	for (let i = 0; i < 12; i++) graph.musicStep(i, 0.05 + i * 0.25, "escape");
	graph.sound("whip", 0.3);
	graph.sound("coin", 0.8);
	graph.sound("puzzle", 1.2);
	graph.sound("relic", 1.8);
	graph.voice("Numa tala!", 2.2);
	const buffer = await context.startRendering();
	let sum = 0,
		peak = 0,
		finite = true;
	for (let c = 0; c < buffer.numberOfChannels; c++)
		for (const value of buffer.getChannelData(c)) {
			sum += value * value;
			peak = Math.max(peak, Math.abs(value));
			if (!Number.isFinite(value)) finite = false;
		}
	return {
		supported: true,
		finite,
		rms: Math.sqrt(sum / (buffer.length * buffer.numberOfChannels)),
		peak,
		seconds: buffer.duration,
		musicDefault: MUSIC_DEFAULT,
	};
}

return {createAudio,renderAudioTest};
})();
const {createOnline}=(()=>{
/* Lost Fortune networking. AI Hub owns every connection while embedded. */
function createOnline(callbacks = {}) {
	const cb = Object.assign(
		{
			onState() {},
			onInput() {},
			onStatus() {},
			onStart() {},
			onEnd() {},
			onLeave() {},
		},
		callbacks,
	);
	const client = window.AIHub;
	let hub = !!client?.active,
		role = "solo",
		room = "",
		me = 0,
		players = [{ id: 0, name: "Dr. Vale", color: "#e8b95f" }];
	let connected = false,
		server = false,
		ended = false,
		started = !hub,
		loaded = false,
		reported = false;
	let initPromise,
		startTimer,
		heartbeat,
		joinTimer,
		channel,
		peer,
		connection,
		transport = "",
		instance = makeCode(12),
		partner = "",
		lastState;
	let terminalSent = false,
		stateAt = -Infinity,
		inputAt = -Infinity,
		lastSeen = 0,
		lastSequence = -1,
		sequence = 0,
		peerLoader;
	const cleanup = [],
		timers = new Set();
	const status = (message, extra = {}) =>
		cb.onStatus(message, {
			role,
			room,
			connected,
			me,
			players,
			hub,
			server,
			...extra,
		});
	function makeCode(n = 6) {
		const bytes = new Uint8Array(n);
		crypto.getRandomValues(bytes);
		return Array.from(
			bytes,
			(x) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32],
		).join("");
	}
	function callStart() {
		if (ended || (started && hub)) return;
		started = true;
		cb.onStart({ role, room, me, players, server, hub });
	}
	function finitePayload(value) {
		try {
			const text = JSON.stringify(value);
			return text && text.length < 15000 ? JSON.parse(text) : null;
		} catch {
			return null;
		}
	}
	function receive(message, from) {
		if (ended || !message || message.protocol !== "lost-fortune-1") return;
		if (
			message.type === "input" &&
			role === "host" &&
			players.some((p) => p.id === from) &&
			from !== me
		) {
			cb.onInput(message.value, from);
		} else if (
			message.type === "state" &&
			role === "guest" &&
			from === (hub ? client.host : 0)
		) {
			if (typeof message.seq === "number" && message.seq <= lastSequence)
				return;
			lastSequence = message.seq;
			cb.onState(message.value, from);
		} else if (message.type === "finished" && !hub && role === "guest") {
			cb.onState(message.value, from);
		}
	}
	function send(type, value) {
		if (ended || !connected) return false;
		const clean = finitePayload(value);
		if (clean === null) return false;
		const message = {
			protocol: "lost-fortune-1",
			type,
			value: clean,
			seq: sequence++,
		};
		if (hub)
			return client.send(
				message,
				type === "input"
					? { to: client.host, reliable: true }
					: { reliable: true },
			);
		if (transport === "local") {
			channel?.postMessage({ kind: "data", instance, from: me, message });
			return true;
		}
		if (transport === "rtc" && connection?.open) {
			connection.send(message);
			return true;
		}
		return false;
	}
	async function init() {
		if (initPromise) return initPromise;
		initPromise = (async () => {
			if (!hub) return null;
			cleanup.push(client.on("message", receive));
			cleanup.push(
				client.on("start", (detail) => {
					started = false;
					const begin = () => {
						if (ended) return;
						if (client.time() >= 0) callStart();
						else
							startTimer = setTimeout(
								begin,
								Math.min(100, Math.max(1, -client.time())),
							);
					};
					status("The expedition starts in a moment.");
					begin();
				}),
			);
			cleanup.push(
				client.on("leave", ({ id }) => {
					players = players.filter((p) => p.id !== id);
					cb.onLeave(id);
					status("An explorer left the expedition.");
				}),
			);
			cleanup.push(
				client.on("time-up", () => {
					if (role !== "host" || ended || reported) return;
					let outcome;
					try {
						outcome = cb.onTimeUp?.() || cb.getResult?.();
					} catch {
						outcome = null;
					}
					finish(
						outcome || { won: false, score: Number(lastState?.score) || 0 },
					);
				}),
			);
			cleanup.push(
				client.on("end", ({ reason }) => {
					ended = true;
					started = false;
					clearTimeout(startTimer);
					cb.onEnd(reason);
					status("The expedition has ended.");
				}),
			);
			const info = await client.connect({
				mode: "shared-world",
				seats: [1, 2],
			});
			if (!info) {
				hub = false;
				started = true;
				return null;
			}
			role = info.isHost ? "host" : "guest";
			me = info.me;
			players = info.players;
			server = !!info.server;
			connected = true;
			status(server ? "The expedition host is ready." : "Connected to AI Hub.");
			if (loaded) client.ready();
			return info;
		})();
		return initPromise;
	}
	function ready() {
		loaded = true;
		if (hub && connected && !ended) client.ready();
	}
	function finish(outcome = {}) {
		if (ended || reported) return;
		reported = true;
		if (hub && role === "host") {
			const ids = players.map((p) => p.id),
				score = Number(outcome.score) || 0;
			const scores = Object.fromEntries(ids.map((id) => [id, score]));
			const stats = Object.fromEntries(
				ids.map((id) => [id, outcome.stats || { Fortune: score }]),
			);
			client.finish({ standings: [ids], scores, won: !!outcome.won, stats });
		}
	}
	function clearStandalone() {
		clearInterval(heartbeat);
		clearTimeout(joinTimer);
		heartbeat = null;
		joinTimer = null;
		for (const timer of timers) clearTimeout(timer);
		timers.clear();
		channel?.close();
		channel = null;
		connection?.close();
		connection = null;
		peer?.destroy();
		peer = null;
		connected = false;
		transport = "";
		partner = "";
		lastSequence = -1;
		terminalSent = false;
		stateAt = inputAt = -Infinity;
	}
	function loadPeer() {
		if (window.Peer) return Promise.resolve(window.Peer);
		if (peerLoader) return peerLoader;
		peerLoader = new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src =
				"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
			script.onload = () =>
				window.Peer
					? resolve(window.Peer)
					: reject(new Error("The room service could not start."));
			script.onerror = () =>
				reject(
					new Error(
						"The room service is unavailable. Same-browser rooms still work.",
					),
				);
			document.head.appendChild(script);
		});
		return peerLoader;
	}
	function acceptRemote(kind) {
		if (ended || connected) return;
		connected = true;
		transport = kind;
		started = true;
		lastSeen = performance.now();
		players = [
			{ id: 0, name: "Dr. Vale", color: "#e8b95f" },
			{ id: 1, name: "Kit Mercer", color: "#5fd7ca" },
		];
		clearTimeout(joinTimer);
		if (kind === "local") {
			connection?.close();
			connection = null;
			peer?.destroy();
			peer = null;
		}
		status("Partner connected. Two hats. One terrible idea.");
		cb.onStart({ role, room, me, players, server: false, hub: false });
	}
	function localMessage(event) {
		const data = event.data;
		if (!data || data.instance === instance || ended) return;
		if (partner && data.instance !== partner) return;
		if (data.kind === "hello" && role === "host") {
			if (connected && transport !== "local") return;
			partner = data.instance;
			channel.postMessage({ kind: "welcome", instance, to: data.instance });
			acceptRemote("local");
		} else if (
			data.kind === "welcome" &&
			role === "guest" &&
			data.to === instance
		) {
			partner = data.instance;
			acceptRemote("local");
		} else if (data.kind === "ping" && connected && transport === "local") {
			lastSeen = performance.now();
		} else if (data.kind === "data" && connected && transport === "local") {
			lastSeen = performance.now();
			receive(data.message, data.from);
		} else if (data.kind === "leave" && connected && transport === "local") {
			disconnectPartner();
		}
	}
	function disconnectPartner() {
		if (!connected || hub) return;
		connected = false;
		transport = "";
		partner = "";
		cb.onLeave(role === "host" ? 1 : 0);
		players = [
			{
				id: me,
				name: role === "host" ? "Dr. Vale" : "Kit Mercer",
				color: role === "host" ? "#e8b95f" : "#5fd7ca",
			},
		];
		status(
			role === "host"
				? "Your partner left. The expedition can continue solo."
				: "The host left. Return to the title to join another room.",
		);
	}
	function beginLocal() {
		try {
			channel = new BroadcastChannel("lost-fortune-room-" + room);
			channel.onmessage = localMessage;
		} catch {
			channel = null;
		}
		heartbeat = setInterval(() => {
			if (ended) return;
			if (connected && transport === "local") {
				channel?.postMessage({ kind: "ping", instance });
				if (performance.now() - lastSeen > 12000) disconnectPartner();
			} else if (!connected && role === "guest")
				channel?.postMessage({ kind: "hello", instance });
		}, 500);
		if (role === "guest") channel?.postMessage({ kind: "hello", instance });
	}
	function wireConnection(conn) {
		conn.on("open", () => {
			if (connected && transport !== "rtc") {
				conn.close();
				return;
			}
			connection = conn;
			acceptRemote("rtc");
		});
		conn.on("data", (message) => {
			if (transport === "rtc") receive(message, role === "host" ? 1 : 0);
		});
		conn.on("close", () => {
			if (transport === "rtc") disconnectPartner();
		});
		conn.on("error", () => {
			if (transport === "rtc") disconnectPartner();
		});
	}
	async function beginRTC(expectedRoom, expectedRole) {
		try {
			const Peer = await loadPeer();
			if (
				hub ||
				room !== expectedRoom ||
				role !== expectedRole ||
				connected ||
				ended
			)
				return;
			peer = role === "host" ? new Peer("lost-fortune-" + room) : new Peer();
			peer.on("open", () => {
				if (role === "guest" && !connected)
					wireConnection(
						peer.connect("lost-fortune-" + room, {
							reliable: true,
							serialization: "json",
						}),
					);
			});
			peer.on("connection", (conn) => {
				if (role !== "host" || connected) {
					conn.close();
					return;
				}
				wireConnection(conn);
			});
			peer.on("error", (error) => {
				if (!connected)
					status(
						error?.type === "unavailable-id"
							? "That room is already in use. Create a fresh room."
							: "Room service unavailable or room not found. Check the code and try again.",
					);
			});
		} catch (error) {
			if (!connected && room === expectedRoom) status(error.message);
		}
	}
	async function createRoom() {
		if (hub) return null;
		clearStandalone();
		role = "host";
		me = 0;
		room = makeCode();
		ended = false;
		reported = false;
		started = false;
		players = [{ id: 0, name: "Dr. Vale", color: "#e8b95f" }];
		beginLocal();
		status("Room " + room + " — share this code with your partner.");
		beginRTC(room, role);
		return room;
	}
	async function joinRoom(value) {
		if (hub) return false;
		const code = String(value || "")
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "");
		if (code.length !== 6) {
			status("Enter the six-character room code.");
			return false;
		}
		clearStandalone();
		role = "guest";
		me = 1;
		room = code;
		ended = false;
		reported = false;
		started = false;
		players = [{ id: 1, name: "Kit Mercer", color: "#5fd7ca" }];
		beginLocal();
		status("Looking for room " + room + "…");
		const timer = setTimeout(() => {
			timers.delete(timer);
			beginRTC(room, role);
		}, 700);
		timers.add(timer);
		joinTimer = setTimeout(() => {
			if (!connected)
				status("No expedition found. Check the room code and try again.");
		}, 20000);
		return true;
	}
	function leave() {
		if (hub) return false;
		if (connected && transport === "local")
			channel?.postMessage({ kind: "leave", instance });
		clearStandalone();
		role = "solo";
		room = "";
		me = 0;
		server = false;
		ended = false;
		started = true;
		reported = false;
		players = [{ id: 0, name: "Dr. Vale", color: "#e8b95f" }];
		status("Solo expedition.");
		return true;
	}
	return {
		init,
		ready,
		createRoom,
		joinRoom,
		leave,
		finish,
		sendState(state) {
			lastState = state;
			const terminal = !!(
				state?.won ||
				state?.dead ||
				state?.state?.won ||
				state?.state?.dead
			);
			if (!terminal) terminalSent = false;
			if (
				role !== "host" ||
				(performance.now() - stateAt < 80 && !(terminal && !terminalSent))
			)
				return false;
			stateAt = performance.now();
			const sent = send("state", state);
			if (sent && terminal) terminalSent = true;
			return sent;
		},
		sendInput(input) {
			if (role !== "guest" || performance.now() - inputAt < 80) return false;
			inputAt = performance.now();
			return send("input", input);
		},
		get hub() {
			return hub;
		},
		get role() {
			return role;
		},
		get room() {
			return room;
		},
		get connected() {
			return connected;
		},
		get me() {
			return me;
		},
		get players() {
			return players;
		},
		get server() {
			return server;
		},
		get ended() {
			return ended;
		},
		get canPlay() {
			return !ended && (hub ? connected && client.time() >= 0 : started);
		},
		destroy() {
			if (!hub) clearStandalone();
			clearTimeout(startTimer);
			for (const remove of cleanup) remove();
		},
	};
}

return {createOnline};
})();
import * as THREE from "three";
import RAPIER from "https://esm.sh/@dimforge/rapier3d-compat@0.19.3";
const $ = (id) => document.getElementById(id),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TITLE = "Raiders of the Lost Fortune";
const DEFAULTS = {
	speed: 5.2,
	whipRange: 3.5,
	enemySpeed: 1.6,
	trapTempo: 1,
	boulderSpeed: 4.8,
	damage: 1,
	cameraZoom: 1,
};
const tuning = { ...DEFAULTS };
const prefs = {
	music: 0.1,
	sound: 0.68,
	glyphs: "playstation",
	shake: 0.65,
	assist: false,
};
try {
	Object.assign(
		prefs,
		JSON.parse(localStorage.getItem("fortune-settings") || "{}"),
	);
} catch {}
const audio = createAudio();
audio.setMusic(prefs.music);
audio.setSfx(prefs.sound);
const input = {
	x: 0,
	z: 0,
	aimX: 0,
	aimZ: 1,
	attack: false,
	jump: false,
	roll: false,
	use: false,
	sprint: false,
	seq: 0,
};
const keys = new Set(),
	pointer = new THREE.Vector2(),
	ray = new THREE.Raycaster(),
	ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let lastDevice = "keyboard",
	touch = false,
	padPrevious = [],
	lastMenuAxis = 0,
	lastActivity = performance.now(),
	screen = "loading",
	previousScreen = "menu",
	focusIndex = 0,
	booted = false,
	world,
	renderer,
	camera,
	scene,
	physics,
	controller,
	frameTime = 0,
	simTime = 0,
	accum = 0,
	hudTime = 0,
	shake = 0,
	cameraZ = 3,
	mouseActive = false,
	mouseWorld = new THREE.Vector3(0, 0, 0),
	toastTimer = 0;
let barkTime = 0,
	chapterTime = 0,
	attract = false,
	attractTime = 0,
	attractStage = 0,
	god = false,
	remoteInputs = new Map(),
	remoteSeq = new Map(),
	pendingSnapshot = null,
	netSequence = 0,
	seatIds = [],
	screenBeforeSettings = "menu";
const state = {
	phase: "courtyard",
	running: false,
	won: false,
	dead: false,
	time: 0,
	score: 0,
	kills: 0,
	treasures: 0,
	puzzle: [2, 0, 1],
	solved: false,
	relic: false,
	checkpoint: "courtyard",
	gate: 0,
	boulderZ: -42,
	trapHits: 0,
	rolls: 0,
	whips: 0,
	jumps: 0,
	swings: 0,
	revives: 0,
	damageTaken: 0,
	chapter: 0,
};
let actors = [];
const effects = [],
	trapTiles = [],
	attackVisuals = [];
const metadata={"date":"2026-11-05 22:21:01","source":"Raiders of the Lost Ark (1982)","plan":"none","genre":"Action-adventure with combat, environmental puzzles and escape","perspective":"Cinematic overhead third-person with a following orthographic camera","tech":"Three.js r180 WebGPURenderer; TSL cel materials; Rapier 0.19.3; Gamepad API; Web Audio; AI Hub Session Protocol v1/client 1.4.0; PeerJS 1.5.5","artDirection":"Procedural cel-shaded and ink look: faceted sandstone, jade shadows, silhouette outlines and gold accents","animation":"Three.js AnimationMixer and authored AnimationClips, with procedural whip, roll, grapple and boulder animation","audio":"Original synthesized adventure score at 10% default volume, procedural effects and Animalese-style gibberish voices; no audio files","online":"1–2 player host-authoritative co-op through AI Hub shared-world sessions, standalone WebRTC rooms and same-origin BroadcastChannel","testing":"Headless scripted full expedition; actual WebGPU runtime; keyboard, emulated standard gamepad and touch; physics and offline audio; two-page co-op; AI Hub normal, latency/loss, host-departure and dedicated-server harness; WebGL fallback screenshots for visual inspection","research":"none; native model knowledge only. The specified AI Hub integration files and runtime dependencies were downloaded for implementation.","environment":"Codex CLI (headless); Linux","model":"OpenAI, gpt-6.1-sol, reasoning effort ultra","usage":"added on import"};
// Filled by the build from the verified exit interview.
const feedback = {"testingFeedback":["Testing caught 2 issues: a missing transitive Three.js import-map entry and a cosmetic snake-facing mismatch. Integration review also corrected multiplayer result delivery, stable player seats, shared restart and attract-loop edge cases.","1 critical runtime issue: the missing three/webgpu import-map entry prevented the assembled cel-material build from loading. It was fixed and the actual browser harness passed afterward.","The actual AI Hub browser conformance harness was most helpful: it caught the transitive module import failure and verified normal co-op, impaired networking, host departure and a dedicated host without a local player.","The default WebGPU headless screenshot was least helpful: the compositor produced a blank canvas despite a running, error-free game. WebGPU state checks and WebGL engine-fallback screenshots provided useful verification. Physical-controller feel, real-device listening and cross-network WebRTC NAT traversal: unknown; those were tested with the supplied emulation and local-page stand-ins where possible."],"engineFeedback":["Three.js native animation clips, procedural geometry and TSL node materials made it straightforward to give the whole expedition a consistent illustrated style.","Yes. The TSL build transitively imports three/webgpu, which needed its own import-map entry. WebGPU headless screenshots also required a separate visual inspection path.","The complete adventure framework: character controls, whip combat, trap timing, sign puzzle, checkpoints, host-authoritative shared world, controller menus, attract replay and live developer tuning.","Coordinating input, native animation, Rapier collision and network authority while keeping the single-file build reliable across renderer backends was the hardest part.","none; the engine and physics libraries were not modified. Game-specific materials, animation clips and systems use their public APIs.","Reliable headless WebGPU image capture would make the rendered frame directly inspectable in automated game validation."],"promptFeedback":["The complete vertical-slice requirements and concrete stand-ins for controller, touch, audio and multiplayer testing made the intended finish line clear.","The no-research instruction sits beside a required online integration URL. I treated downloading that exact protocol implementation and runtime dependencies as implementation work, while doing no source or design research.","Making the expedition, co-op authority, controller focus, touch assists, attract replay and developer tools all work together in a polished single-file package was the hardest part.","Explicitly permit implementation documentation downloads under the no-research rule, and clarify when a dated source refers to a game adaptation rather than its film."]};

const online = createOnline({
	onStart() {
		seatIds = online.players.map((p) => p.id);
		if (booted) {
			startGame(false);
			if (online.hub) toast("Expedition connected · recover the idol together");
		}
	},
	onInput(v, id) {
		if (!v || typeof v !== "object") return;
		const prev = remoteInputs.get(id) || {};
		const seq = Number(v.seq) || 0;
		remoteInputs.set(id, {
			x: clamp(Number(v.x) || 0, -1, 1),
			z: clamp(Number(v.z) || 0, -1, 1),
			aimX: clamp(Number(v.aimX) || 0, -1, 1),
			aimZ: clamp(Number(v.aimZ) || 1, -1, 1),
			sprint: !!v.sprint,
			attack: !!v.attack,
			jump: !!v.jump,
			roll: !!v.roll,
			use: !!v.use,
			seq,
			received: performance.now(),
		});
		if (prev.seq > seq) remoteInputs.set(id, prev);
	},
	onState(s) {
		if (booted && s && Array.isArray(s.actors)) pendingSnapshot = s;
	},
	onStatus(msg) {
		const el = $("online-status");
		if (el) el.textContent = msg;
		if (screen === "coop" && online.room) {
			const code = $("room-display");
			if (code) code.textContent = online.room;
		}
	},
	onEnd(reason) {
		state.running = false;
		audio.suspend();
		if (booted) {
			screen = "session-end";
			showPanel(
				"Expedition ended",
				`<p>${escapeHTML(reason || "The AI Hub round has ended.")}</p><p>Your expedition result has been sent to the hub.</p>`,
			);
		}
	},
	onLeave(id) {
		if (online.role === "guest") {
			state.running = false;
			showMenu();
			toast("Your expedition partner left.");
		} else if (actors[seatIds.indexOf(id) >= 0 ? seatIds.indexOf(id) : 1]) {
			const departed =
				actors[seatIds.indexOf(id) >= 0 ? seatIds.indexOf(id) : 1];
			departed.active = false;
			departed.art.group.visible = false;
			toast("Partner disconnected · continue the expedition");
		}
	},
	getResult() {
		return resultData();
	},
	onTimeUp() {
		state.running = false;
		screen = "session-end";
		showPanel(
			"Time at the dig is up",
			`<p>The expedition clock has run out.</p><p>${state.relic ? "The idol was recovered. The exit was another matter." : "Some things stay buried. For now."}</p>`,
		);
		return resultData();
	},
});
function escapeHTML(s) {
	return String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}
function savePrefs() {
	try {
		localStorage.setItem("fortune-settings", JSON.stringify(prefs));
	} catch {}
}
function glyph(action) {
	const pc = {
		attack: "LMB",
		jump: "SPACE",
		roll: "CTRL",
		use: "E",
		pause: "ESC",
		move: "WASD",
	};
	const ps = {
		attack: "□",
		jump: "✕",
		roll: "○",
		use: "△",
		pause: "OPTIONS",
		move: "L",
	};
	const xb = {
		attack: "X",
		jump: "A",
		roll: "B",
		use: "Y",
		pause: "MENU",
		move: "L",
	};
	return lastDevice === "gamepad"
		? (prefs.glyphs === "xbox" ? xb : ps)[action]
		: pc[action];
}
function hint(action, label) {
	return `<span class="hint-item"><span class="key">${glyph(action)}</span>${label}</span>`;
}
function updatePrompts() {
	if (!$("controls-hint")) return;
	$("controls-hint").innerHTML =
		hint("attack", "Whip") +
		hint("jump", "Leap") +
		hint("roll", "Roll") +
		hint("use", "Use");
	$("interact-glyph").textContent = touch ? "TAP" : glyph("use");
}
function setDevice(d) {
	if (lastDevice !== d) {
		lastDevice = d;
		updatePrompts();
	}
	lastActivity = performance.now();
}
function toast(message, duration = 3) {
	$("toast").textContent = message;
	$("toast").hidden = false;
	toastTimer = duration;
}
function speak(text, duration = 4.3) {
	$("bark-text").textContent = text;
	$("bark").hidden = false;
	barkTime = duration;
	if (!attract) audio.say(text);
}
function chapter(title, desc) {
	$("chapter-title").textContent = title;
	$("chapter-desc").textContent = desc;
	$("chapter-card").classList.add("show");
	chapterTime = 4.2;
}
function buttons() {
	return [...$("screen").querySelectorAll("button,input,select")].filter(
		(e) => !e.disabled && e.offsetParent !== null,
	);
}
function focusMenu(i, actual = false) {
	const list = buttons();
	if (!list.length) return;
	focusIndex = (i + list.length) % list.length;
	list.forEach((e, k) => e.classList.toggle("selected", k === focusIndex));
	if (actual) list[focusIndex].focus({ preventScroll: true });
	list[focusIndex].scrollIntoView({ block: "nearest" });
}
function wireMenu() {
	focusIndex = 0;
	buttons().forEach((b, i) => {
		b.addEventListener("pointerenter", () => {
			setDevice("keyboard");
			focusMenu(i);
		});
		b.addEventListener("click", () => audio.sfx("click"));
	});
	focusMenu(0);
}
function action(label, id, primary = false) {
	return `<button id="${id}" class="action ${primary ? "primary" : ""}"><span>${label}</span><span class="arrow">↗</span></button>`;
}
function showMenu() {
	screen = "menu";
	state.running = false;
	attract = false;
	lastActivity = performance.now();
	$("hud").hidden = true;
	$("attract-banner").hidden = true;
	$("touch-action").hidden = true;
	audio.resume();
	$("screen").innerHTML =
		`<div class="menu"><div class="edition"><span>THE FINCH EXPEDITIONS</span><span class="rule"></span><span>VOL. 01</span></div><div class="title-block"><div class="kicker">FORTUNE FAVORS THE FOOLISH.</div><h1>RAIDERS<span class="small">OF THE</span><em>LOST FORTUNE</em></h1><p class="title-desc">One temple. One priceless idol.<br>Absolutely no reasonable exit strategy.</p><div class="menu-actions">${action("Begin expedition", "begin", true)}${action("Bring an accomplice", "coop")}</div><div class="menu-secondary"><button id="settings" class="text-button">Settings & controls</button><button id="about" class="text-button">About the expedition</button></div></div><div class="compass">✧</div><div class="expedition-stamp"><small>FIELD NOTES / 1936</small><p>THE TEMPLE OF THE SUN</p><span>Somewhere off the sensible route.</span></div><div class="menu-footer"><span>1–2 EXPLORERS <strong> · </strong> WHIPS, WITS & VERY BAD ODDS</span><span id="input-footer">${lastDevice === "gamepad" ? "✕ SELECT · L NAVIGATE" : "WASD / ARROWS TO NAVIGATE · ENTER TO SELECT"}</span></div></div>`;
	$("begin").onclick = () => {
		audio.unlock();
		online.leave();
		startGame();
	};
	$("coop").onclick = () => showCoop();
	$("settings").onclick = () => showSettings("menu");
	$("about").onclick = () => showAbout("menu");
	wireMenu();
}
function showPanel(title, body, back) {
	$("screen").innerHTML =
		`<div class="overlay"><div class="panel ${title.includes("About") || title.includes("Field laboratory") ? "wide" : ""}"><div class="panel-head"><div><div class="eyebrow">THE FINCH EXPEDITIONS</div><h2>${title}</h2></div>${back ? '<button id="back" class="back">Back</button>' : ""}</div>${body}</div></div>`;
	if (back) $("back").onclick = back;
	wireMenu();
}
function pause() {
	if (attract || !booted) return;
	if (screen === "playing") {
		screen = "pause";
		state.running = false;
		audio.suspend();
		showPause();
	} else if (["pause", "settings", "about", "dev"].includes(screen)) {
		resume();
	}
}
function showPause() {
	screen = "pause";
	$("touch-action").hidden = true;
	const hub = online.hub;
	showPanel(
		"A brief intermission",
		`<p>Catch your breath. The temple is in no hurry.<br><small>${online.connected ? "Co-op stays live while you consult the menu. Your partner can keep moving." : "The expedition is paused."}</small></p>${action("Return to expedition", "resume", true)}${action("Settings & controls", "pause-settings")}${action("Field laboratory · developer mode", "dev")}${action("About & credits", "pause-about")}${hub ? "" : action("Retire to title", "quit")}`,
	);
	$("resume").onclick = resume;
	$("pause-settings").onclick = () => showSettings("pause");
	$("dev").onclick = showDev;
	$("pause-about").onclick = () => showAbout("pause");
	if (!hub)
		$("quit").onclick = () => {
			online.leave();
			resetGame();
			showMenu();
		};
}
function resume() {
	screen = "playing";
	state.running = true;
	$("screen").innerHTML = "";
	audio.resume();
	updatePrompts();
}
function slider(label, key, min, max, step, value, type = "pref") {
	return `<label class="setting"><span>${label}</span><input aria-label="${label}" type="range" data-key="${key}" data-type="${type}" min="${min}" max="${max}" step="${step}" value="${value}"><output>${step < 1 ? Number(value).toFixed(2) : value}</output></label>`;
}
function showSettings(from) {
	screenBeforeSettings = from;
	screen = "settings";
	showPanel(
		"Pack your preferences",
		slider("Music volume", "music", 0, 1, 0.01, prefs.music) +
			slider("Effects & voices", "sound", 0, 1, 0.01, prefs.sound) +
			slider("Camera shake", "shake", 0, 1, 0.05, prefs.shake) +
			`<label class="setting"><span>Controller glyphs</span><select id="glyph-select" aria-label="Controller glyphs"><option value="playstation">PlayStation</option><option value="xbox">Xbox</option></select></label><button id="assist" class="action">Assisted expedition <span>${prefs.assist ? "ON" : "OFF"}</span></button><p style="font-size:15px">Assist softens enemy attacks and slows the boulder. Touch enables automatic whipping and nearby actions.</p><div class="control-grid"><div>Move <span class="key">WASD / L</span></div><div>Aim <span class="key">MOUSE / R</span></div><div>Whip <span class="key">LMB / □</span></div><div>Leap / grapple <span class="key">SPACE / ✕</span></div><div>Dodge roll <span class="key">CTRL / ○</span></div><div>Interact <span class="key">E / △</span></div><div>Sprint <span class="key">SHIFT / L3</span></div><div>Pause <span class="key">ESC / OPTIONS</span></div></div><p class="touch-note">Touch: drag anywhere on the left to move; swipe on the right to aim. Tap the contextual action. Two-finger tap to roll.</p>`,
		() => (from === "menu" ? showMenu() : showPause()),
	);
	$("glyph-select").value = prefs.glyphs;
	$("glyph-select").onchange = (e) => {
		prefs.glyphs = e.target.value;
		savePrefs();
		updatePrompts();
	};
	$("assist").onclick = () => {
		prefs.assist = !prefs.assist;
		savePrefs();
		showSettings(from);
	};
	wireSliders();
}
function wireSliders() {
	document.querySelectorAll("input[type=range]").forEach((el) => {
		el.oninput = () => {
			const key = el.dataset.key,
				value = Number(el.value);
			(el.dataset.type === "tune" ? tuning : prefs)[key] = value;
			el.nextElementSibling.textContent =
				Number(el.step) < 1 ? value.toFixed(2) : value;
			if (key === "music") audio.setMusic(value);
			if (key === "sound") audio.setSfx(value);
			savePrefs();
		};
	});
}
function showAbout(from) {
	screen = "about";
	const labels = {
		date: "Date",
		source: "Source",
		plan: "Plan",
		genre: "Genre",
		perspective: "Perspective",
		tech: "Tech",
		artDirection: "Art direction",
		animation: "Animation",
		audio: "Audio",
		online: "Online",
		testing: "Testing",
		research: "Research",
		environment: "Environment",
		model: "Model",
		usage: "Usage",
	};
	const credits = Object.entries(metadata)
		.map(
			([k, v]) =>
				`<div class="credit"><small>${labels[k] || k}</small><span>${escapeHTML(v)}</span></div>`,
		)
		.join("");
	let fb = "";
	for (const [k, title] of [
		["testingFeedback", "Testing Feedback"],
		["engineFeedback", "Engine Feedback"],
		["promptFeedback", "Prompt Feedback"],
	])
		fb += `<div class="feedback"><div class="eyebrow">${title}</div>${(feedback[k] || ["Validation results are included in the packaged build."]).map((v) => `<p>${escapeHTML(v)}</p>`).join("")}</div>`;
	showPanel(
		"About the expedition",
		`<div class="eyebrow">RIGHT STICK / MOUSE WHEEL TO SCROLL</div><p>An original comic adventure inspired by the discovery, cryptic signs and dangerous treasure hunt of <em>Raiders of the Lost Ark</em> (1982), with the dry wit and impossible escapes of an adventure serial. Dr. Finch, the Temple of the Sun and its very unhelpful inhabitants are original creations.</p><div class="credits-grid">${credits}</div>${fb}<p>Design, code, procedural art and synthesized score · OpenAI Codex.<br>Three.js · Rapier · PeerJS · AI Hub. Fonts: Barlow Condensed and DM Sans. No image, model or audio files.</p>`,
		() => (from === "menu" ? showMenu() : showPause()),
	);
}
function showCoop() {
	screen = "coop";
	showPanel(
		"Bring an accomplice",
		`<p>Two explorers. One shared expedition.<br>Create a room and send its six-character code to your partner.</p>${action("Create an expedition", "host", true)}<div id="room-display" class="room-code" hidden></div><input id="join-code" class="coop-code" maxlength="6" placeholder="ROOM CODE" aria-label="Room code">${action("Join expedition", "join")}<p id="online-status" class="status">Online rooms use WebRTC. Same-browser tabs connect directly.</p><p style="font-size:15px">Your partner wears teal. Either explorer can solve signs and recover the idol. Stay close: fallen partners revive when approached. AI Hub sessions connect automatically.</p>`,
		() => {
			online.leave();
			showMenu();
		},
	);
	$("host").onclick = async () => {
		audio.unlock();
		const code = await online.createRoom();
		$("room-display").hidden = false;
		$("room-display").textContent = code;
		$("host").disabled = true;
	};
	$("join").onclick = () => {
		audio.unlock();
		online.joinRoom($("join-code").value);
	};
}
function showDev() {
	screen = "dev";
	const ranges = [
		["Move speed", "speed", 2, 10, 0.1],
		["Whip reach", "whipRange", 1.5, 6, 0.1],
		["Enemy pursuit", "enemySpeed", 0, 4, 0.1],
		["Trap tempo", "trapTempo", 0.2, 2, 0.1],
		["Boulder speed", "boulderSpeed", 1, 9, 0.1],
		["Incoming damage", "damage", 0, 3, 0.1],
		["Camera zoom", "cameraZoom", 0.65, 1.5, 0.05],
	];
	showPanel(
		"Field laboratory",
		`<p style="font-size:16px">Live tuning. Values apply immediately to the shared expedition host.</p><div class="dev-grid">${ranges.map(([l, k, a, b, s]) => slider(l, k, a, b, s, tuning[k], "tune")).join("")}</div><div class="dev-tools">${action("Invulnerability: " + (god ? "ON" : "OFF"), "god")}${action("Heal both explorers", "heal")}${action("Clear courtyard", "clear-enemies")}${action("Solve the signs", "solve")}${action("Jump to inner hall", "checkpoint-hall")}${action("Jump to relic vault", "checkpoint-vault")}${action("Start boulder escape", "escape")}${action("Reset tuning defaults", "defaults")}</div><p style="font-size:14px">Renderer: ${renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL engine fallback"} · Physics: Rapier 0.19.3 · ${world.enemies.filter((e) => e.hp > 0).length} hostiles · Seeded procedural environment</p>`,
		showPause,
	);
	wireSliders();
	$("god").onclick = () => {
		god = !god;
		showDev();
	};
	$("heal").onclick = () => {
		actors.forEach((a) => (a.hp = 5));
		toast("Health restored");
	};
	$("clear-enemies").onclick = () => {
		world.enemies.forEach((e) => killEnemy(e, false));
		toast("Courtyard cleared");
	};
	$("solve").onclick = () => {
		state.puzzle = [0, 1, 2];
		solvePuzzle();
		toast("The signs are aligned");
	};
	$("checkpoint-hall").onclick = () => {
		setPosition(actors[0], 0, -11);
		state.checkpoint = "hall";
		toast("Checkpoint: Hall of Signs");
	};
	$("checkpoint-vault").onclick = () => {
		solvePuzzle();
		setPosition(actors[0], 0, -32);
		state.checkpoint = "vault";
		toast("Checkpoint: relic vault");
	};
	$("escape").onclick = () => {
		solvePuzzle();
		setPosition(actors[0], 0, -35);
		takeRelic();
	};
	$("defaults").onclick = () => {
		Object.assign(tuning, DEFAULTS);
		showDev();
	};
}

function makeActor(art, index) {
	const body = physics.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			index ? 1.5 : 0,
			0.9,
			8,
		),
	);
	const collider = physics.createCollider(
		RAPIER.ColliderDesc.capsule(0.45, 0.33).setFriction(0),
		body,
	);
	return {
		art,
		index,
		body,
		collider,
		x: index ? 1.5 : 0,
		z: 8,
		y: 0,
		hp: 5,
		invuln: 0,
		attack: 0,
		roll: 0,
		jump: 0,
		swing: 0,
		active: index === 0,
		down: 0,
		faceX: 0,
		faceZ: -1,
		move: 0,
		anim: "idle",
		lastAction: -1,
		lastStep: 0,
	};
}
function setPosition(a, x, z) {
	a.x = x;
	a.z = z;
	a.y = 0;
	a.body.setTranslation({ x, y: 0.9, z }, true);
	a.body.setNextKinematicTranslation({ x, y: 0.9, z });
	a.art.group.position.set(x, 0, z);
}
function animate(a, name) {
	if (!a.art.actions[name] || a.anim === name) return;
	const old = a.art.actions[a.anim];
	old?.fadeOut(0.12);
	a.art.actions[name].reset().fadeIn(0.12).play();
	a.anim = name;
}
function resetGame() {
	Object.assign(state, {
		phase: "courtyard",
		running: false,
		won: false,
		dead: false,
		time: 0,
		score: 0,
		kills: 0,
		treasures: 0,
		puzzle: [2, 0, 1],
		solved: false,
		relic: false,
		checkpoint: "courtyard",
		gate: 0,
		boulderZ: -42,
		trapHits: 0,
		rolls: 0,
		whips: 0,
		jumps: 0,
		swings: 0,
		revives: 0,
		damageTaken: 0,
		chapter: 0,
	});
	simTime = 0;
	remoteInputs.clear();
	remoteSeq.clear();
	actors.forEach((a, i) => {
		setPosition(a, i ? 1.5 : 0, 8);
		Object.assign(a, {
			hp: 5,
			invuln: 0,
			attack: 0,
			roll: 0,
			jump: 0,
			swing: 0,
			down: 0,
			active: i === 0 || (online.connected && online.players.length > 1),
		});
		a.art.group.visible = a.active;
		a.art.group.rotation.set(0, Math.PI, 0);
		a.art.rig.rotation.set(0, 0, 0);
		animate(a, "idle");
	});
	world.enemies.forEach((e) => {
		e.hp = 2;
		e.stun = 0;
		e.cooldown = 1;
		e.windup = 0;
		e.dying = 0;
		e.group.visible = true;
		e.group.scale.setScalar(1);
		e.group.position.set(e.homeX, 0, e.homeZ);
		e.group.rotation.z = 0;
	});
	world.pickups.forEach((p) => {
		p.collected = false;
		p.group.visible = true;
	});
	world.relic.visible = true;
	world.gate.position.y = 0;
	world.boulder.visible = false;
	world.boulder.position.set(0, 2.45, -42);
	world.puzzle.forEach((p, i) => {
		p.value = state.puzzle[i];
		p.group.rotation.y = (-p.value * Math.PI * 2) / 3;
	});
	$("escape-warning").hidden = true;
	$("bark").hidden = true;
	barkTime = 0;
	$("chapter-card").classList.remove("show");
	cameraZ = 5;
	shake = 0;
	effects.forEach((e) => {
		scene.remove(e.mesh);
		e.mesh.geometry.dispose();
		e.mesh.material.dispose();
	});
	effects.length = 0;
	updateHud();
}
function startGame(demo = false) {
	resetGame();
	state.running = true;
	screen = "playing";
	attract = demo;
	attractTime = 0;
	attractStage = 0;
	$("screen").innerHTML = "";
	$("hud").hidden = false;
	$("attract-banner").hidden = !demo;
	world.partner.group.visible = actors[1].active;
	input.attack = input.use = input.jump = input.roll = false;
	keys.clear();
	updatePrompts();
	audio.resume();
	if (!demo) {
		audio.unlock();
		chapter("I · The uninvited", "A temple off the sensible route.");
		speak("The map says “certain death.” Rather specific, for a map.");
	}
	updateHud();
}
function resultData() {
	return {
		won: state.won,
		score: Math.round(state.score),
		stats: {
			idol: state.relic,
			treasures: state.treasures,
			guards: state.kills,
			seconds: Math.round(state.time),
			damage: state.damageTaken,
		},
	};
}
function finish(won) {
	if (state.won || state.dead) return;
	state.won = won;
	state.dead = !won;
	state.running = false;
	screen = won ? "victory" : "dead";
	$("interaction").hidden = true;
	$("touch-action").hidden = true;
	$("escape-warning").hidden = true;
	audio.sfx(won ? "win" : "damage");
	if (attract) {
		screen = "playing";
		state.running = true;
		return;
	}
	if (online.role !== "guest") online.finish(resultData());
	const rank =
		state.damageTaken === 0
			? "IMPOSSIBLY WELL DRESSED"
			: state.treasures === 3
				? "A PROFESSIONAL BAD IDEA"
				: "BARELY RESPECTABLE";
	showPanel(
		won ? "Fortune, found." : "A slight setback.",
		`<div class="eyebrow">${won ? rank : "FIELD REPORT / EXPEDITION INTERRUPTED"}</div><p>${won ? "The idol is safe. The temple is rubble.<br>Dr. Finch will call that a successful survey." : "The temple has made its point.<br>A good archaeologist always keeps field notes."}</p><div class="result-stats"><div><strong>${Math.round(state.score)}</strong><small>FORTUNE</small></div><div><strong>${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, "0")}</strong><small>ELAPSED</small></div><div><strong>${state.treasures}/3</strong><small>RELIC CACHES</small></div></div>${online.hub ? "<p>Your result is recorded. Return through AI Hub when ready.</p>" : (online.role === "guest" ? "<p>Waiting for the expedition leader to set out again.</p>" : action(won ? "Another bad idea" : "Retry from checkpoint", "retry", true)) + action("Return to title", "result-title")}`,
	);
	if (!online.hub) {
		if ($("retry"))
			$("retry").onclick = () => {
				if (won) {
					startGame();
				} else retryCheckpoint();
			};
		$("result-title").onclick = () => {
			online.leave();
			resetGame();
			showMenu();
		};
	}
}
function retryCheckpoint() {
	const cp = state.checkpoint,
		treasures = state.treasures,
		kills = state.kills,
		collected = world.pickups.map((p) => p.collected);
	startGame();
	state.treasures = treasures;
	state.kills = cp === "courtyard" ? 0 : kills;
	world.pickups.forEach((p, i) => {
		p.collected = collected[i];
		p.group.visible = !p.collected;
	});
	if (cp === "hall" || cp === "vault") {
		world.enemies.forEach((e) => killEnemy(e, false));
		state.checkpoint = cp;
		setPosition(actors[0], 0, cp === "hall" ? -10 : -31);
		if (cp === "vault") solvePuzzle();
	}
	state.score = Math.max(
		0,
		state.kills * 150 + treasures * 300 + (cp === "vault" ? 500 : 0) - 100,
	);
	chapter("Back in the field", "Hat intact. Dignity negotiable.");
}
function addBurst(x, y, z, color = 0xf0c573, n = 12) {
	for (let i = 0; i < n; i++) {
		const mesh = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.045 + Math.random() * 0.055),
			new THREE.MeshBasicMaterial({ color, transparent: true }),
		);
		mesh.position.set(x, y, z);
		scene.add(mesh);
		effects.push({
			mesh,
			vx: (Math.random() - 0.5) * 4,
			vy: Math.random() * 4 + 0.5,
			vz: (Math.random() - 0.5) * 4,
			life: 0.45 + Math.random() * 0.5,
			max: 1,
		});
	}
}
function killEnemy(e, reward = true) {
	if (e.hp <= 0) return;
	e.hp = 0;
	e.dying = 0.65;
	e.group.rotation.z = 0.9;
	if (reward) {
		state.kills++;
		state.score += 150;
		audio.sfx("coin");
		addBurst(e.group.position.x, 0.8, e.group.position.z, 0xe8c477, 15);
		if (state.kills === 3)
			speak("Next time, perhaps a strongly worded letter.");
	}
}
function damageActor(a, amount, source) {
	if (a.invuln > 0 || a.roll > 0 || a.swing > 0 || god || attract || a.hp <= 0)
		return;
	const dmg = amount * tuning.damage * (prefs.assist ? 0.55 : 1);
	a.hp = Math.max(0, a.hp - dmg);
	a.invuln = 1.2;
	state.damageTaken += dmg;
	shake = 0.28;
	audio.sfx("damage");
	a.art.actions.hurt?.reset().play();
	$("damage-flash").style.opacity = ".6";
	setTimeout(() => ($("damage-flash").style.opacity = "0"), 130);
	if (source === "trap") state.trapHits++;
	if (a.hp <= 0) {
		a.down = 5;
		if (!actors.some((b) => b !== a && b.active && b.hp > 0)) finish(false);
		else speak("A hand, if you have a spare one.");
	}
}
function face(a, x, z) {
	const l = Math.hypot(x, z);
	if (l > 0.01) {
		a.faceX = x / l;
		a.faceZ = z / l;
		a.art.group.rotation.y = Math.atan2(a.faceX, a.faceZ);
	}
}
function nearestEnemy(a, range = 5) {
	let best = null,
		dist = range;
	for (const e of world.enemies) {
		if (e.hp <= 0) continue;
		const d = Math.hypot(e.group.position.x - a.x, e.group.position.z - a.z);
		if (d < dist) {
			best = e;
			dist = d;
		}
	}
	return best;
}
function whip(a) {
	if (a.attack > 0 || a.roll > 0 || a.hp <= 0 || a.swing > 0) return;
	const target = nearestEnemy(a, tuning.whipRange + 0.2);
	if (target && (!mouseActive || lastDevice !== "keyboard" || touch || attract))
		face(a, target.group.position.x - a.x, target.group.position.z - a.z);
	a.attack = 0.42;
	state.whips++;
	a.art.actions.whip?.reset().play();
	audio.sfx("whip");
	let hit = false;
	for (const e of world.enemies) {
		if (e.hp <= 0) continue;
		const dx = e.group.position.x - a.x,
			dz = e.group.position.z - a.z,
			d = Math.hypot(dx, dz);
		if (
			d <= tuning.whipRange + 0.5 &&
			(d < 1.3 || (dx * a.faceX + dz * a.faceZ) / d > -0.1)
		) {
			e.hp--;
			e.stun = 1.25;
			e.windup = 0;
			addBurst(e.group.position.x, 1, e.group.position.z, 0xffd482, 8);
			if (e.hp <= 0) {
				e.hp = 1;
				killEnemy(e);
			} else {
				e.group.position.x += a.faceX * 0.65;
				e.group.position.z += a.faceZ * 0.65;
				audio.sfx("hit");
			}
			hit = true;
		}
	}
	if (hit) shake = 0.1;
}
function leap(a) {
	if (a.jump > 0 || a.roll > 0 || a.swing > 0 || a.hp <= 0) return;
	if (!state.relic && Math.abs(a.x) < 2.7 && a.z < -15.3 && a.z > -19) {
		a.swing = 0.9;
		a.swingStart = { x: a.x, z: a.z };
		a.swingEnd = { x: 0, z: -21 };
		state.swings++;
		audio.sfx("whip");
		speak("Finally. A practical application for a very long belt.", 3.5);
	} else {
		a.jump = 0.72;
		state.jumps++;
		audio.sfx("jump");
	}
}
function roll(a, dx, dz) {
	if (a.roll > 0 || a.jump > 0 || a.swing > 0 || a.hp <= 0) return;
	a.roll = 0.48;
	a.rollX = dx || a.faceX;
	a.rollZ = dz || a.faceZ;
	const l = Math.hypot(a.rollX, a.rollZ) || 1;
	a.rollX /= l;
	a.rollZ /= l;
	a.invuln = Math.max(a.invuln, 0.5);
	state.rolls++;
	audio.sfx("roll");
}
function interactionFor(a) {
	if (a.hp <= 0) return null;
	for (const b of actors) {
		if (
			b !== a &&
			b.active &&
			b.hp <= 0 &&
			Math.hypot(a.x - b.x, a.z - b.z) < 2.5
		)
			return { type: "revive", actor: b, text: "Help your accomplice up" };
	}
	if (!state.solved) {
		let best = null,
			dist = 2.3;
		world.puzzle.forEach((p, i) => {
			const d = Math.hypot(a.x - p.x, a.z - p.z);
			if (d < dist) {
				dist = d;
				best = {
					type: "pillar",
					i,
					text: `Rotate ${["left", "middle", "right"][i]} sign · ${["SUN", "EYE", "SERPENT"][state.puzzle[i]]}`,
				};
			}
		});
		if (best) return best;
	}
	if (!state.relic && state.solved && Math.hypot(a.x, a.z + 37) < 3.1)
		return { type: "relic", text: "Borrow the sun idol" };
	if (!state.relic && Math.abs(a.x) < 3.1 && a.z < -14.9 && a.z > -18.7)
		return { type: "grapple", text: "Whip across the sinkhole" };
	if (!state.solved && a.z < -22.7 && a.z > -26.5)
		return { type: "clue", text: "Read the inscription" };
	if (state.relic && a.z > 8.6)
		return { type: "exit", text: "Get out of here" };
	return null;
}
function interact(a) {
	const q = interactionFor(a);
	if (!q) return;
	if (q.type === "pillar") {
		state.puzzle[q.i] = (state.puzzle[q.i] + 1) % 3;
		world.puzzle[q.i].value = state.puzzle[q.i];
		audio.sfx("puzzle");
		addBurst(world.puzzle[q.i].x, 2, -21, 0x84d6bb, 6);
		if (state.puzzle.every((v, i) => v === i)) solvePuzzle();
		else toast(["SUN", "EYE", "SERPENT"][state.puzzle[q.i]], 1);
	}
	if (q.type === "relic") takeRelic();
	if (q.type === "grapple") leap(a);
	if (q.type === "clue")
		speak("“Sun wakes. Eye watches. Serpent waits.” Pleasant company.", 5);
	if (q.type === "exit") finish(true);
	if (q.type === "revive") {
		q.actor.hp = 3;
		q.actor.invuln = 2;
		q.actor.down = 0;
		state.revives++;
		audio.sfx("puzzle");
		speak("Just testing the floor. Thoroughly.");
	}
}
function solvePuzzle() {
	if (state.solved) return;
	state.puzzle = [0, 1, 2];
	state.solved = true;
	state.phase = "vault";
	state.checkpoint = "vault";
	state.score += 500;
	audio.sfx("gate");
	shake = 0.25;
	chapter("III · Finders, keepers", "Every treasure comes with a catch.");
	speak("Sun. Eye. Serpent. Ancient security was wonderfully literal.");
	world.puzzle.forEach((p, i) => (p.value = i));
}
function takeRelic() {
	if (state.relic) return;
	state.relic = true;
	state.phase = "escape";
	state.score += 1200;
	world.relic.visible = false;
	world.boulder.visible = true;
	state.boulderZ = -43;
	state.gate = 1;
	actors.forEach((a) => {
		if (a.active && a.z < -37) setPosition(a, a.x, -35);
		a.hp = Math.max(a.hp, 3);
	});
	audio.sfx("relic");
	audio.sfx("rumble");
	shake = 0.7;
	chapter("IV · The return policy", "Back to the entrance. Quickly.");
	speak("That was too easy. I dislike that enormously.");
	$("escape-warning").hidden = false;
}

function localInput() {
	let x = 0,
		z = 0;
	if (keys.has("KeyW") || keys.has("ArrowUp")) z--;
	if (keys.has("KeyS") || keys.has("ArrowDown")) z++;
	if (keys.has("KeyA") || keys.has("ArrowLeft")) x--;
	if (keys.has("KeyD") || keys.has("ArrowRight")) x++;
	input.x = touchState.x || x;
	input.z = touchState.z || z;
	const l = Math.hypot(input.x, input.z);
	if (l > 1) {
		input.x /= l;
		input.z /= l;
	}
	input.sprint =
		keys.has("ShiftLeft") || keys.has("ShiftRight") || input.padSprint;
	return input;
}
function actorInput(a) {
	if (online.server) {
		const id = seatIds[a.index] ?? online.players[a.index]?.id;
		return consumeRemote(id);
	}
	if (online.role === "guest") return null;
	if (a.index === localIndex())
		return screen === "playing" ? input : { x: 0, z: 0 };
	const id = online.hub ? (seatIds[a.index] ?? online.players[a.index]?.id) : 1;
	return consumeRemote(id);
}
function consumeRemote(id) {
	const v = remoteInputs.get(id);
	if (!v || performance.now() - v.received > 650) return { x: 0, z: 0 };
	const first = remoteSeq.get(id) !== v.seq;
	return {
		...v,
		attack: first && v.attack,
		jump: first && v.jump,
		roll: first && v.roll,
		use: first && v.use,
		_id: id,
		_first: first,
	};
}
function updateActor(a, control, dt) {
	if (!a.active) return;
	const art = a.art;
	a.invuln = Math.max(0, a.invuln - dt);
	a.attack = Math.max(0, a.attack - dt);
	art.whip.visible = a.attack > 0.16;
	art.whip.scale.setScalar(tuning.whipRange / 3.5);
	if (a.hp <= 0) {
		art.rig.rotation.z = -1.3;
		art.group.position.y = 0.25;
		a.down += dt;
		return;
	}
	art.rig.rotation.z = 0;
	let dx = clamp(Number(control?.x) || 0, -1, 1),
		dz = clamp(Number(control?.z) || 0, -1, 1),
		len = Math.hypot(dx, dz);
	if (len > 1) {
		dx /= len;
		dz /= len;
	}
	if (control?.worldSpace !== true) {
		/* Camera faces directly north, so screen and temple axes agree. */
	}
	if (control?.aimX || control?.aimZ) {
		if (control === input && mouseActive && lastDevice === "keyboard" && !touch)
			face(a, mouseWorld.x - a.x, mouseWorld.z - a.z);
		else if (Math.hypot(control.aimX, control.aimZ) > 0.2)
			face(a, control.aimX, control.aimZ);
	}
	if (control?.attack) whip(a);
	if (control?.jump) leap(a);
	if (control?.roll) roll(a, dx, dz);
	if (control?.use) interact(a);
	if (control?._first) remoteSeq.set(control._id, control.seq);
	let speed = tuning.speed * (control?.sprint ? 1.35 : 1);
	a.move = len;
	if (a.attack > 0.15) speed *= 0.55;
	if (a.swing > 0) {
		a.swing = Math.max(0, a.swing - dt);
		const t = 1 - a.swing / 0.9,
			e = t * t * (3 - 2 * t);
		a.x = THREE.MathUtils.lerp(a.swingStart.x, a.swingEnd.x, e);
		a.z = THREE.MathUtils.lerp(a.swingStart.z, a.swingEnd.z, e);
		a.y = Math.sin(t * Math.PI) * 3.2;
		face(a, 0, -1);
		if (a.swing === 0) {
			a.y = 0;
			audio.sfx("land");
			shake = 0.13;
		}
		setBody(a);
	} else {
		if (a.roll > 0) {
			a.roll = Math.max(0, a.roll - dt);
			dx = a.rollX;
			dz = a.rollZ;
			speed = tuning.speed * 2;
			art.rig.rotation.x = -Math.PI * 2 * (1 - a.roll / 0.48);
			face(a, dx, dz);
		} else art.rig.rotation.x = 0;
		if (a.jump > 0) {
			a.jump = Math.max(0, a.jump - dt);
			a.y = Math.sin((1 - a.jump / 0.72) * Math.PI) * 1.75;
			if (a.jump === 0) {
				a.y = 0;
				audio.sfx("land");
			}
		} else a.y = 0;
		if (len > 0.08 && !mouseActive && lastDevice !== "gamepad") face(a, dx, dz);
		else if (len > 0.08 && !(control?.aimX || control?.aimZ)) face(a, dx, dz);
		const movement = { x: dx * speed * dt, y: -0.06, z: dz * speed * dt };
		controller.computeColliderMovement(a.collider, movement);
		const m = controller.computedMovement();
		a.x = clamp(a.x + m.x, -9.6, 9.6);
		a.z = clamp(a.z + m.z, -41.2, 11.1);
		if (!state.solved && a.z < -26.1) a.z = -26.1;
		setBody(a);
	}
	art.group.position.set(a.x, a.y, a.z);
	art.group.visible = a.active;
	if (a.invuln > 0) art.group.visible = Math.floor(a.invuln * 12) % 2 === 0;
	animate(a, len > 0.1 ? (speed > 6 ? "run" : "walk") : "idle");
	art.mixer.update(dt);
	if (len > 0.1 && a.jump === 0 && a.swing === 0) {
		a.lastStep -= dt;
		if (a.lastStep <= 0) {
			a.lastStep = 0.27;
			audio.sfx("step");
		}
	}
	for (const p of world.pickups) {
		if (!p.collected && Math.hypot(a.x - p.x, a.z - p.z) < 1) {
			p.collected = true;
			p.group.visible = false;
			state.treasures++;
			state.score += 300;
			audio.sfx("coin");
			addBurst(p.x, 0.7, p.z);
			toast(`Relic cache ${state.treasures}/3 · +300 fortune`, 2.2);
		}
	}
	if (a.z < -9 && state.phase === "courtyard") {
		state.phase = "hall";
		state.checkpoint = "hall";
		chapter("II · A matter of signs", "Sun wakes. Eye watches. Serpent waits.");
		speak("Three signs, one door. At least it isn’t paperwork.");
	}
	const trap = Math.abs(a.z + 12) < 0.7 || Math.abs(a.z + 15) < 0.7;
	if (trap && a.y < 0.45 && a.roll <= 0) {
		const pulse =
			(Math.sin(simTime * 2.25 * tuning.trapTempo + (a.z < -13 ? 1.5 : 0)) +
				1) /
			2;
		if (pulse > 0.72) damageActor(a, 1, "trap");
	}
	if (
		Math.abs(a.z + 18.5) < 0.6 &&
		Math.abs(a.x) < 3 &&
		a.y < 0.45 &&
		a.swing <= 0 &&
		a.roll <= 0
	) {
		damageActor(a, 1, "pit");
		if (a.invuln > 1) setPosition(a, a.x, a.z > -18.5 ? -17.5 : -19.5);
	}
	if (state.relic && a.z > 9.2) {
		state.score += Math.max(0, Math.floor(600 - state.time));
		finish(true);
	}
}
function setBody(a) {
	a.body.setNextKinematicTranslation({ x: a.x, y: 0.9, z: a.z });
}
function updateEnemies(dt) {
	for (const e of world.enemies) {
		if (e.hp <= 0) {
			if (e.dying > 0) {
				e.dying -= dt;
				e.group.position.y = -0.1;
				e.group.scale.setScalar(Math.max(0.01, e.dying / 0.65));
				if (e.dying <= 0) e.group.visible = false;
			}
			continue;
		}
		if (state.relic) {
			e.group.visible = false;
			continue;
		}
		e.stun = Math.max(0, (e.stun || 0) - dt);
		e.cooldown = Math.max(0, (e.cooldown || 0) - dt);
		let target = null,
			near = 10;
		for (const a of actors) {
			if (!a.active || a.hp <= 0) continue;
			const d = Math.hypot(a.x - e.group.position.x, a.z - e.group.position.z);
			if (d < near) {
				near = d;
				target = a;
			}
		}
		if (!target) {
			e.mixer?.update(dt);
			continue;
		}
		const dx = target.x - e.group.position.x,
			dz = target.z - e.group.position.z,
			d = Math.hypot(dx, dz) || 1;
		if (e.stun > 0) {
			e.group.rotation.z = Math.sin(simTime * 25) * 0.09;
			e.windup = 0;
		} else {
			e.group.rotation.z = 0;
			if (e.windup > 0) {
				e.windup -= dt;
				e.group.scale.setScalar(1 + Math.sin(e.windup * 18) * 0.035);
				if (e.windup <= 0) {
					if (d < 2.2) damageActor(target, 1, "enemy");
					e.cooldown = e.type === "snake" ? 1.7 : 2.1;
					addBurst(e.group.position.x, 0.5, e.group.position.z, 0xa76d40, 4);
				}
			} else if (d < 1.65 && e.cooldown <= 0) {
				e.windup = 0.55;
				audio.sfx("hit");
			} else if (d > 1.4) {
				const s =
					tuning.enemySpeed *
					(e.type === "snake" ? 1.25 : 1) *
					(prefs.assist ? 0.8 : 1);
				e.group.position.x = clamp(
					e.group.position.x + (dx / d) * s * dt,
					-9,
					9,
				);
				e.group.position.z += (dz / d) * s * dt;
			}
			e.group.rotation.y = Math.atan2(dx, dz);
			e.actions.walk?.play();
		}
		e.mixer?.update(dt);
	}
}
function updateTraps() {
	for (const t of trapTiles) {
		const pulse =
			(Math.sin(simTime * 2.25 * tuning.trapTempo + t.phase) + 1) / 2;
		t.spikes.position.y = pulse > 0.72 ? (pulse - 0.72) * 2.5 : -0.35;
		t.warning.material.color.setHex(pulse > 0.55 ? 0xeaa154 : 0x274e47);
		t.warning.material.emissive?.setHex(pulse > 0.55 ? 0x753d13 : 0x102a24);
	}
}
function updateEffects(dt) {
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.life -= dt;
		if (e.life <= 0) {
			scene.remove(e.mesh);
			e.mesh.geometry.dispose();
			e.mesh.material.dispose();
			effects.splice(i, 1);
			continue;
		}
		e.vy -= dt * 9;
		e.mesh.position.x += e.vx * dt;
		e.mesh.position.y += e.vy * dt;
		e.mesh.position.z += e.vz * dt;
		e.mesh.rotation.x += dt * 4;
		e.mesh.material.opacity = Math.min(1, e.life * 3);
	}
}
function updateWorld(dt) {
	simTime += dt;
	state.time += dt;
	for (const a of actors) updateActor(a, actorInput(a), dt);
	physics.timestep = dt;
	physics.step();
	updateEnemies(dt);
	updateTraps();
	world.update(simTime, dt);
	updateEffects(dt);
	world.puzzle.forEach((p, i) => {
		let target = (-state.puzzle[i] * Math.PI * 2) / 3;
		let d =
			THREE.MathUtils.euclideanModulo(
				target - p.group.rotation.y + Math.PI,
				Math.PI * 2,
			) - Math.PI;
		p.group.rotation.y += d * Math.min(1, dt * 8);
	});
	state.gate = THREE.MathUtils.damp(state.gate, state.solved ? 1 : 0, 3, dt);
	world.gate.position.y = state.gate * 5.7;
	if (state.relic) {
		const closest = Math.min(
			...actors.filter((a) => a.active && a.hp > 0).map((a) => a.z),
		);
		const catchup = clamp((closest - state.boulderZ - 10) * 0.07, 0, 2);
		state.boulderZ +=
			(tuning.boulderSpeed * (prefs.assist ? 0.78 : 1) + catchup) * dt;
		world.boulder.position.set(
			Math.sin(simTime * 4) * 0.15,
			2.45,
			state.boulderZ,
		);
		world.boulder.rotation.x += dt * 2.3;
		shake = Math.max(shake, 0.045);
		for (const a of actors) {
			if (
				a.active &&
				a.hp > 0 &&
				a.z < state.boulderZ + 2.7 &&
				Math.abs(a.x) < 4
			) {
				damageActor(a, 2, "boulder");
				a.z = state.boulderZ + 3.8;
				setBody(a);
			}
		}
		if (state.boulderZ > 12.7 && !state.won) finish(false);
	}
	if (touch) {
		const a = localActor();
		if (a && nearestEnemy(a, 3.2) && a.attack <= 0) whip(a);
	}
	input.attack = input.jump = input.roll = input.use = false;
	input.seq++;
}
function localIndex() {
	if (online.hub && !online.server)
		return Math.max(
			0,
			(seatIds.length ? seatIds : online.players.map((p) => p.id)).indexOf(
				online.me,
			),
		);
	return online.role === "guest" ? 1 : 0;
}
function localActor() {
	return actors[localIndex()] || actors[0];
}
function snapshot() {
	return {
		seq: ++netSequence,
		state: { ...state },
		actors: actors.map((a) => ({
			x: a.x,
			z: a.z,
			y: a.y,
			hp: a.hp,
			faceX: a.faceX,
			faceZ: a.faceZ,
			active: a.active,
			attack: a.attack,
			roll: a.roll,
			jump: a.jump,
			move: a.move,
		})),
		enemies: world.enemies.map((e) => ({
			x: e.group.position.x,
			z: e.group.position.z,
			hp: e.hp,
			stun: e.stun,
			rot: e.group.rotation.y,
		})),
		pickups: world.pickups.map((p) => p.collected),
	};
}
function receiveSnapshot(s, dt) {
	const wasTerminal = state.won || state.dead;
	const before = state.phase;
	Object.assign(state, s.state);
	if (wasTerminal && !state.won && !state.dead) {
		screen = "playing";
		state.running = true;
		$("screen").innerHTML = "";
		audio.resume();
	}
	if (before !== state.phase) {
		if (state.phase === "escape") {
			chapter("IV · The return policy", "Back to the entrance. Quickly.");
			audio.sfx("relic");
		} else if (state.phase === "vault")
			chapter("III · Finders, keepers", "Every treasure comes with a catch.");
		else if (state.phase === "hall")
			chapter(
				"II · A matter of signs",
				"Sun wakes. Eye watches. Serpent waits.",
			);
	}
	s.actors.forEach((p, i) => {
		const a = actors[i];
		if (!a) return;
		Object.assign(a, p);
		a.art.group.position.lerp(
			new THREE.Vector3(p.x, p.y, p.z),
			Math.min(1, dt * 22),
		);
		a.art.group.rotation.y = Math.atan2(p.faceX, p.faceZ);
		a.art.group.visible = p.active;
		a.art.whip.visible = p.attack > 0.15;
		animate(a, p.move > 0.1 ? "walk" : "idle");
		a.art.mixer.update(dt);
	});
	s.enemies?.forEach((p, i) => {
		const e = world.enemies[i];
		if (!e) return;
		e.hp = p.hp;
		e.group.visible = p.hp > 0;
		e.group.position.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 18));
		e.group.rotation.y = p.rot;
		e.mixer?.update(dt);
	});
	s.pickups?.forEach((v, i) => {
		world.pickups[i].collected = v;
		world.pickups[i].group.visible = !v;
	});
	world.relic.visible = !state.relic;
	world.gate.position.y = state.solved ? 5.7 : 0;
	world.boulder.visible = state.relic;
	world.boulder.position.z = state.boulderZ;
	world.boulder.rotation.x += dt * 2.3;
	world.puzzle.forEach(
		(p, i) => (p.group.rotation.y = (-state.puzzle[i] * Math.PI * 2) / 3),
	);
	world.update(state.time, dt);
	simTime = state.time;
	updateTraps();
	$("escape-warning").hidden = !state.relic;
	if (state.won && screen !== "victory") {
		state.won = false;
		finish(true);
	}
	if (state.dead && screen !== "dead") {
		state.dead = false;
		finish(false);
	}
}
function updateHud() {
	const a = localActor();
	if (!a) return;
	$("health").innerHTML = Array.from(
		{ length: 5 },
		(_, i) => `<span class="heart ${a.hp > i ? "" : "empty"}"></span>`,
	).join("");
	$("score").textContent = Math.round(state.score).toLocaleString();
	$("partner-health").textContent = actors[1].active
		? `◈ PARTNER ${Math.ceil(actors[online.role === "guest" ? 0 : 1].hp)}/5`
		: "";
	const objectives = {
		courtyard: [
			"I · THE UNINVITED",
			"Find the inner temple",
			"Explore the side niches for relic caches.",
		],
		hall: [
			"II · A MATTER OF SIGNS",
			"Align the three signs",
			"SUN → EYE → SERPENT · rotate signs with " + glyph("use"),
		],
		vault: [
			"III · FINDERS, KEEPERS",
			"Recover the sun idol",
			"The vault is open. What could possibly go wrong?",
		],
		escape: [
			"IV · THE RETURN POLICY",
			"Escape to the expedition camp",
			"Head back through the temple. Keep moving.",
		],
	};
	const q = objectives[state.phase] || objectives.courtyard;
	$("chapter").textContent = q[0];
	$("objective").textContent = q[1];
	$("objective-sub").textContent = q[2];
	const area = state.phase === "courtyard" ? 0 : state.phase === "hall" ? 1 : 2;
	[...$("route").querySelectorAll("span")].forEach((el, i) =>
		el.classList.toggle("active", i === area),
	);
	const ctx = interactionFor(a);
	$("interaction").hidden = !ctx || attract || screen !== "playing";
	if (ctx) {
		$("interact-text").textContent = ctx.text;
		$("interact-glyph").textContent = touch ? "TAP" : glyph("use");
	}
	if (touch && screen === "playing" && !attract) {
		$("touch-action").hidden = false;
		$("touch-action").textContent = ctx
			? ctx.type === "grapple"
				? "SWING"
				: ctx.type === "pillar"
					? "ROTATE"
					: ctx.type === "relic"
						? "TAKE"
						: "USE"
			: "LEAP";
	} else $("touch-action").hidden = true;
	if (state.relic)
		$("boulder-distance").textContent =
			Math.max(0, Math.round(a.z - state.boulderZ)) + " m";
}

function attractUpdate(dt) {
	attractTime += dt;
	const a = actors[0];
	if (state.won || state.dead) {
		if (attractTime > 74) startGame(true);
		return;
	}
	a.hp = 5;
	const t = attractTime;
	const ctrl = input;
	ctrl.worldSpace = true;
	ctrl.x = 0;
	ctrl.z = 0;
	ctrl.aimX = 0;
	ctrl.aimZ = 0;
	const go = (x, z) => {
		const dx = x - a.x,
			dz = z - a.z,
			d = Math.hypot(dx, dz);
		ctrl.x = d > 0.35 ? dx / d : 0;
		ctrl.z = d > 0.35 ? dz / d : 0;
		face(a, dx, dz);
		return d < 0.6;
	};
	if (t < 18) {
		const e = nearestEnemy(a, 30);
		if (e) {
			go(e.group.position.x, e.group.position.z);
			if (
				a.attack <= 0 &&
				Math.hypot(a.x - e.group.position.x, a.z - e.group.position.z) < 3.2
			)
				ctrl.attack = true;
		} else go(-6, 3);
	} else if (t < 28) {
		go(0, -16.7);
		if (Math.abs(a.z + 12) < 1 || Math.abs(a.z + 15) < 1) ctrl.roll = true;
	} else if (t < 30) {
		if (a.swing <= 0 && a.z > -19) leap(a);
	} else if (t < 42) {
		const i = t < 34 ? 0 : t < 38 ? 1 : 2;
		go([-5, 0, 5][i], -20);
		if (
			Math.abs(a.x - [-5, 0, 5][i]) < 0.7 &&
			a.attack <= 0 &&
			state.puzzle[i] !== i
		) {
			interact(a);
			a.attack = 0.7;
		}
	} else if (t < 49) {
		if (!state.solved) solvePuzzle();
		go(0, -35.2);
	} else if (t < 51) {
		takeRelic();
	} else {
		go(0, 10);
		if (Math.abs(a.z + 18.5) < 2 && a.jump <= 0) ctrl.jump = true;
		ctrl.sprint = true;
		if (a.z < -12 && a.z > -16 && a.roll <= 0) ctrl.roll = true;
	}
	if (t > 76) startGame(true);
}

function createHazards() {
	const colors = { metal: 0x384a3d, gold: 0xc69954 };
	for (const [z, phase] of [
		[-12, 0],
		[-15, 1.5],
	]) {
		const g = new THREE.Group();
		scene.add(g);
		g.position.z = z;
		const warning = new THREE.Mesh(
			new THREE.BoxGeometry(17, 0.05, 1.4),
			new THREE.MeshStandardMaterial({
				color: 0x274e47,
				emissive: 0x102a24,
				roughness: 1,
			}),
		);
		warning.position.y = 0.09;
		g.add(warning);
		const spikes = new THREE.Group();
		g.add(spikes);
		for (let x = -7.5; x <= 7.5; x += 0.65) {
			const spike = new THREE.Mesh(
				new THREE.ConeGeometry(0.13, 0.8, 4),
				new THREE.MeshStandardMaterial({
					color: colors.metal,
					flatShading: true,
				}),
			);
			spike.position.set(x, 0.4, 0);
			spike.castShadow = true;
			spikes.add(spike);
		}
		trapTiles.push({ g, spikes, warning, phase });
	}
	const pit = new THREE.Mesh(
		new THREE.BoxGeometry(6, 0.08, 1.25),
		new THREE.MeshBasicMaterial({ color: 0x102a27 }),
	);
	pit.position.set(0, 0.08, -18.5);
	scene.add(pit);
	for (let side of [-1, 1]) {
		const rim = new THREE.Mesh(
			new THREE.BoxGeometry(0.2, 0.16, 1.5),
			new THREE.MeshStandardMaterial({ color: 0x806c45 }),
		);
		rim.position.set(side * 3.1, 0.12, -18.5);
		scene.add(rim);
	}
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.42, 0.09, 6, 16),
		new THREE.MeshStandardMaterial({
			color: 0xffce77,
			metalness: 0.6,
			roughness: 0.4,
		}),
	);
	ring.position.set(0, 4.2, -18.3);
	scene.add(ring);
	const beam = new THREE.Mesh(
		new THREE.BoxGeometry(9, 0.25, 0.45),
		new THREE.MeshStandardMaterial({ color: 0x6e7554 }),
	);
	beam.position.set(0, 4.9, -18.3);
	scene.add(beam);
	const hanger = new THREE.Mesh(
		new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6),
		new THREE.MeshStandardMaterial({ color: 0x544c31 }),
	);
	hanger.position.set(0, 4.55, -18.3);
	scene.add(hanger);
	// Visible clue in both directions, cut into three vertical plaques.
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 160;
	const c = canvas.getContext("2d");
	c.fillStyle = "#173c37";
	c.fillRect(0, 0, 1024, 160);
	c.strokeStyle = "#c9ae74";
	c.lineWidth = 6;
	c.strokeRect(8, 8, 1008, 144);
	c.fillStyle = "#efd6a0";
	c.font = "600 48px Georgia";
	c.textAlign = "center";
	c.fillText("SUN   →   EYE   →   SERPENT", 512, 78);
	c.font = "22px Georgia";
	c.fillStyle = "#aac4a6";
	c.fillText("SUN WAKES. EYE WATCHES. SERPENT WAITS.", 512, 125);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	const clue = new THREE.Mesh(
		new THREE.PlaneGeometry(8.5, 1.33),
		new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
	);
	clue.position.set(0, 0.25, -24.4);
	clue.rotation.x = -Math.PI / 2;
	scene.add(clue);
}

function noteInput(device) {
	setDevice(device);
	if (attract) {
		resetGame();
		showMenu();
		return true;
	}
	return false;
}
window.addEventListener("keydown", (e) => {
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Tab",
		].includes(e.code)
	)
		e.preventDefault();
	if (noteInput("keyboard")) return;
	if (e.target.matches("input:not([type=range]),select")) {
		if (e.code === "Escape") $("back")?.click();
		return;
	}
	if (e.repeat) {
		keys.add(e.code);
		return;
	}
	keys.add(e.code);
	if (screen === "playing") {
		if (e.code === "Escape") pause();
		if (e.code === "KeyE") input.use = true;
		if (e.code === "Space") input.jump = true;
		if (e.code === "ControlLeft" || e.code === "KeyC") input.roll = true;
		if (e.code === "KeyF") input.attack = true;
	} else if (screen === "pause" && e.code === "Escape") resume();
	else if (
		["settings", "about", "dev", "coop"].includes(screen) &&
		e.code === "Escape"
	)
		$("back")?.click();
	else if (screen !== "loading") {
		if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab") {
			focusMenu(focusIndex + (e.shiftKey ? -1 : 1), true);
			audio.sfx("click");
		}
		if (e.code === "ArrowUp" || e.code === "KeyW") {
			focusMenu(focusIndex - 1, true);
			audio.sfx("click");
		}
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			const b = buttons()[focusIndex];
			if (b) b.click();
		}
		if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
			const el = buttons()[focusIndex];
			if (el?.type === "range") {
				el.value = String(
					Number(el.value) +
						(e.code === "ArrowRight" ? 1 : -1) * Number(el.step),
				);
				el.dispatchEvent(new Event("input"));
			}
		}
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	input.x = input.z = 0;
	if (screen === "playing" && !online.connected && !attract) pause();
});
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	if (noteInput("keyboard")) return;
	pointer.set(
		(e.clientX / innerWidth) * 2 - 1,
		-(e.clientY / innerHeight) * 2 + 1,
	);
	mouseActive = true;
	if (camera) {
		ray.setFromCamera(pointer, camera);
		ray.ray.intersectPlane(ground, mouseWorld);
		input.aimX = mouseWorld.x - (localActor()?.x || 0);
		input.aimZ = mouseWorld.z - (localActor()?.z || 0);
		const l = Math.hypot(input.aimX, input.aimZ) || 1;
		input.aimX /= l;
		input.aimZ /= l;
	}
	$("crosshair").style.left = e.clientX + "px";
	$("crosshair").style.top = e.clientY + "px";
	$("crosshair").hidden = screen !== "playing" || touch;
});
window.addEventListener("wheel", () => noteInput("keyboard"), {
	passive: true,
});
$("stage").addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") return;
	if (noteInput("keyboard")) return;
	audio.unlock();
	if (screen === "playing") {
		if (e.button === 0) {
			const a = localActor(),
				q = interactionFor(a);
			let target =
				q?.type === "pillar"
					? world.puzzle[q.i]
					: q?.type === "relic"
						? { x: 0, z: -37 }
						: null;
			if (
				target &&
				Math.hypot(mouseWorld.x - target.x, mouseWorld.z - target.z) < 2
			)
				input.use = true;
			else input.attack = true;
		}
		if (e.button === 2) input.roll = true;
	}
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
$("pause-button").onclick = () => {
	if (!noteInput(touch ? "touch" : "keyboard")) pause();
};
$("interaction").onclick = () => {
	if (screen === "playing") {
		input.use = true;
		audio.unlock();
	}
};
$("touch-action").onclick = () => {
	if (screen === "playing") {
		if (interactionFor(localActor())) input.use = true;
		else input.jump = true;
		audio.unlock();
	}
};
const touchState = { x: 0, z: 0, id: null, startX: 0, startY: 0 };
window.addEventListener(
	"touchstart",
	(e) => {
		if (noteInput("touch")) return;
		touch = true;
		document.body.classList.add("touch");
		mouseActive = false;
		audio.unlock();
		if (screen !== "playing" || e.target.closest("button,#interaction")) return;
		e.preventDefault();
		if (e.touches.length > 1) input.roll = true;
		for (const t of e.changedTouches) {
			if (t.clientX < innerWidth * 0.6 && touchState.id === null) {
				touchState.id = t.identifier;
				touchState.startX = t.clientX;
				touchState.startY = t.clientY;
			} else if (e.touches.length === 1) input.jump = true;
		}
	},
	{ passive: false },
);
window.addEventListener(
	"touchmove",
	(e) => {
		if (screen !== "playing") return;
		e.preventDefault();
		for (const t of e.changedTouches) {
			if (t.identifier === touchState.id) {
				touchState.x = clamp((t.clientX - touchState.startX) / 65, -1, 1);
				touchState.z = clamp((t.clientY - touchState.startY) / 65, -1, 1);
			} else {
				input.aimX = (t.clientX - innerWidth * 0.75) / 100;
				input.aimZ = (t.clientY - innerHeight * 0.5) / 100;
			}
		}
	},
	{ passive: false },
);
window.addEventListener(
	"touchend",
	(e) => {
		for (const t of e.changedTouches)
			if (t.identifier === touchState.id) {
				touchState.id = null;
				touchState.x = touchState.z = 0;
			}
	},
	{ passive: true },
);
function gamepad() {
	const pads = navigator.getGamepads?.() || [];
	const p = [...pads].find((p) => p && p.connected);
	if (!p) {
		padPrevious = [];
		return;
	}
	const b = p.buttons.map((b) => b.pressed),
		pressed = (i) => b[i] && !padPrevious[i],
		axis = (v) => (Math.abs(v || 0) > 0.19 ? v : 0);
	const ax = axis(p.axes[0]),
		az = axis(p.axes[1]),
		rx = axis(p.axes[2]),
		rz = axis(p.axes[3]);
	const active = ax || az || rx || rz || b.some((v, i) => v && !padPrevious[i]);
	if (active) {
		if (noteInput("gamepad")) {
			padPrevious = b;
			return;
		}
		mouseActive = false;
		audio.unlock();
	}
	if (screen === "playing") {
		input.x = ax;
		input.z = az;
		input.sprint = b[10];
		input.padSprint = b[10];
		if (rx || rz) {
			input.aimX = rx;
			input.aimZ = rz;
		} else {
			input.aimX = input.aimZ = 0;
		}
		if (pressed(2) || pressed(7)) input.attack = true;
		if (pressed(0)) input.jump = true;
		if (pressed(1)) input.roll = true;
		if (pressed(3)) input.use = true;
		if (pressed(9) && !(online.hub && b[8])) pause();
	} else {
		const panel = $("screen").querySelector(".panel");
		if (panel && Math.abs(rz) > 0.2) panel.scrollTop += rz * 14;
		const direction = pressed(13)
			? 1
			: pressed(12)
				? -1
				: az > 0.55 && lastMenuAxis <= 0.55
					? 1
					: az < -0.55 && lastMenuAxis >= -0.55
						? -1
						: 0;
		if (direction) {
			focusMenu(focusIndex + direction, true);
			audio.sfx("click");
		}
		if (pressed(0)) {
			buttons()[focusIndex]?.click();
		}
		if (pressed(1)) {
			if (screen === "pause") resume();
			else $("back")?.click();
		}
		if (pressed(9) && screen === "pause" && !(online.hub && b[8])) resume();
		if (pressed(14) || pressed(15) || Math.abs(ax) > 0.6) {
			const el = buttons()[focusIndex];
			if (el?.type === "range") {
				const dir = pressed(14) || ax < -0.6 ? -1 : 1;
				el.value = String(Number(el.value) + dir * Number(el.step));
				el.dispatchEvent(new Event("input"));
			}
		}
	}
	lastMenuAxis = az;
	padPrevious = b;
}

function resize() {
	if (!renderer) return;
	const aspect = innerWidth / innerHeight,
		h = 10.8 / (tuning.cameraZoom || 1);
	camera.left = -h * aspect;
	camera.right = h * aspect;
	camera.top = h;
	camera.bottom = -h;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener("resize", resize);
function renderFrame(now) {
	const dt = Math.min((now - frameTime) / 1000 || 1 / 60, 0.05);
	frameTime = now;
	localInput();
	gamepad();
	if (!booted) return;
	if (screen === "menu" && !online.hub && now - lastActivity >= 10000)
		startGame(true);
	const running =
		(screen === "playing" ||
			(online.connected &&
				["pause", "dev", "settings", "about"].includes(screen))) &&
		online.canPlay &&
		!online.ended;
	if (attract && running) attractUpdate(dt);
	if (running && !state.won && !state.dead) {
		if (online.role === "guest") {
			if (online.sendInput({ ...input, seq: input.seq })) {
				input.seq++;
				input.attack = input.jump = input.roll = input.use = false;
			}
			if (pendingSnapshot) receiveSnapshot(pendingSnapshot, dt);
		} else {
			updateWorld(dt);
			if (online.connected) online.sendState(snapshot());
		}
	} else if (screen === "menu" || screen === "coop") {
		simTime += dt;
		world.update(simTime, dt);
		world.player.mixer.update(dt);
		world.enemies.forEach((e) => e.mixer?.update(dt));
	}
	if (online.role === "guest" && pendingSnapshot && (state.won || state.dead))
		receiveSnapshot(pendingSnapshot, dt);
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").hidden = true;
	}
	if (barkTime > 0) {
		barkTime -= dt;
		if (barkTime <= 0) $("bark").hidden = true;
	}
	if (chapterTime > 0) {
		chapterTime -= dt;
		if (chapterTime <= 0) $("chapter-card").classList.remove("show");
	}
	audio.update(
		dt,
		state.won
			? "victory"
			: state.relic
				? "escape"
				: nearestEnemy(localActor(), 6)
					? "combat"
					: "explore",
	);
	const menuView = ["menu", "coop"].includes(screen);
	const targetZ = menuView
		? -1.2
		: (localActor()?.z || 0) + (state.relic ? 2 : -3.5);
	cameraZ = THREE.MathUtils.damp(cameraZ, targetZ, menuView ? 1.2 : 4, dt);
	const z = clamp(cameraZ, -34, 4.5);
	shake = Math.max(0, shake - dt * 1.7);
	const sx = (Math.random() - 0.5) * shake * prefs.shake,
		sy = (Math.random() - 0.5) * shake * prefs.shake;
	const menuOffset = menuView ? -4.5 : 0;
	camera.position.set(menuOffset + sx, 25 + sy, z + 22);
	camera.lookAt(menuOffset, 0, z);
	const expected = 10.8 / tuning.cameraZoom;
	if (Math.abs(camera.top - expected) > 0.01) resize();
	renderer.render(scene, camera);
	hudTime += dt;
	if (hudTime > 0.1) {
		hudTime = 0;
		updateHud();
	}
	if (screen !== "playing") $("crosshair").hidden = true;
}
async function boot() {
	try {
		$("load-note").textContent = "Assembling the expedition…";
		await RAPIER.init();
		physics = new RAPIER.World({ x: 0, y: -20, z: 0 });
		physics.createCollider(
			RAPIER.ColliderDesc.cuboid(12, 0.5, 29.5).setTranslation(0, -0.5, -16),
		);
		controller = physics.createCharacterController(0.025);
		controller.enableAutostep(0.3, 0.3, true);
		controller.setApplyImpulsesToDynamicBodies(true);
		scene = new THREE.Scene();
		camera = new THREE.OrthographicCamera(-20, 20, 10.8, -10.8, 0.1, 160);
		renderer = new THREE.WebGPURenderer({
			antialias: true,
			powerPreference: "high-performance",
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		await renderer.init();
		$("stage").appendChild(renderer.domElement);
		world = buildWorld(THREE, scene);
		actors = [makeActor(world.player, 0), makeActor(world.partner, 1)];
		for (const b of world.solidBoxes)
			physics.createCollider(
				RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(
					b.x,
					b.h / 2,
					b.z,
				),
			);
		createHazards();
		resize();
		resetGame();
		await online.init();
		booted = true;
		window.__game.ready = true;
		$("loading").hidden = true;
		if (online.hub) {
			screen = "waiting";
			showPanel(
				"Expedition assembling",
				"<p>Connected to AI Hub. Waiting for the expedition clock.</p>",
			);
			online.ready();
			if (online.canPlay) startGame();
		} else showMenu();
		renderer.setAnimationLoop(renderFrame);
		window.__game.engine = {
			three: THREE.REVISION,
			physics: "0.19.3",
			backend: renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL",
		};
	} catch (error) {
		console.error(error);
		$("load-note").innerHTML =
			`The expedition could not load.<br>${escapeHTML(error.message)}<br>Check your connection and open this file in a current browser.`;
		window.__game.error = error.message;
	}
}
window.__game = {
	ready: false,
	getState: () => ({
		...state,
		screen,
		attract,
		actors: actors.map((a) => ({
			x: a.x,
			z: a.z,
			hp: a.hp,
			y: a.y,
			active: a.active,
			invuln: a.invuln,
		})),
		enemies: world?.enemies.map((e) => ({
			hp: e.hp,
			x: e.group.position.x,
			z: e.group.position.z,
		})),
		tuning: { ...tuning },
		prefs: { ...prefs },
		online: {
			hub: online.hub,
			role: online.role,
			room: online.room,
			connected: online.connected,
			server: online.server,
			players: online.players,
			canPlay: online.canPlay,
		},
		audio: audio.debug(),
	}),
	audioTest: renderAudioTest,
	command(name, value) {
		if (!booted) return;
		switch (name) {
			case "start":
				online.leave();
				startGame();
				break;
			case "pause":
				pause();
				break;
			case "advance": {
				const seconds = Number(value) || 1;
				for (let n = 0; n < Math.ceil(seconds * 60); n++) {
					if (state.running || attract) updateWorld(1 / 60);
				}
				updateHud();
				break;
			}
			case "teleport":
				setPosition(actors[value.index || 0], value.x, value.z);
				break;
			case "input":
				Object.assign(input, value);
				break;
			case "whip":
				whip(actors[value || 0]);
				break;
			case "use":
				interact(actors[value || 0]);
				break;
			case "jump":
				leap(actors[value || 0]);
				break;
			case "roll":
				roll(actors[value || 0], 0, -1);
				break;
			case "aim":
				face(actors[0], value.x, value.z);
				mouseActive = true;
				break;
			case "god":
				god = !!value;
				break;
			case "damage":
				damageActor(actors[value?.index || 0], value?.amount || 1, "test");
				break;
			case "set-tuning":
				Object.assign(tuning, value);
				break;
			case "attract":
				startGame(true);
				break;
			case "idle":
				lastActivity = performance.now() - 10001;
				break;
			case "menu":
				resetGame();
				showMenu();
				break;
			case "dev":
				showDev();
				break;
			case "create-room":
				return online.createRoom();
			case "join-room":
				return online.joinRoom(value);
			case "leave-room":
				return online.leave();
			case "checkpoint":
				state.checkpoint = value;
				break;
		}
		return this.getState();
	},
	playDemo(seconds) {
		if (!attract) startGame(true);
		for (let n = 0; n < Math.ceil(seconds * 60); n++) {
			attractUpdate(1 / 60);
			if (state.running) updateWorld(1 / 60);
		}
		updateHud();
		return this.getState();
	},
	projection(x, z) {
		const p = new THREE.Vector3(x, 0, z).project(camera);
		return {
			x: ((p.x + 1) * innerWidth) / 2,
			y: ((1 - p.y) * innerHeight) / 2,
		};
	},
};
boot();

