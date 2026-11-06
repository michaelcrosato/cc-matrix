import * as THREE from "three/webgpu";
import { color, normalWorld, vec3 } from "three/tsl";

// Every shape, ink stroke and piece of set dressing is built here from geometry.
export async function createScene(canvas, options = {}) {
	const renderer = new THREE.WebGPURenderer({
		canvas,
		antialias: true,
		alpha: false,
		forceWebGL: !!options.forceWebGL,
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
	renderer.setClearColor(0x101f2b, 1);
	await renderer.init();
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x101f2b);
	const camera = new THREE.OrthographicCamera(
		-17.4,
		17.4,
		18.1,
		-1.5,
		0.1,
		100,
	);
	camera.position.set(0, 8.3, 45);
	camera.lookAt(0, 8.3, 0);
	const ink = new THREE.MeshBasicMaterial({
		color: 0x07121b,
		side: THREE.BackSide,
	});
	const palette = {
		ink: 0x07121b,
		wall: 0x203745,
		stone: 0x294653,
		cream: 0xf5d99b,
		teal: 0x309c99,
		copper: 0xc57749,
		orange: 0xe89542,
		red: 0xe65d47,
		blue: 0x517a9e,
		mint: 0x9ad5b0,
		purple: 0x8e75ab,
		white: 0xfff3cc,
	};
	const materials = new Map();
	function mat(hex, flat = false) {
		const key = hex + ":" + flat;
		if (materials.has(key)) return materials.get(key);
		const m = new THREE.MeshBasicNodeMaterial();
		const band = normalWorld
			.dot(vec3(-0.45, 0.7, 0.8).normalize())
			.max(0)
			.mul(3)
			.floor()
			.div(3)
			.mul(0.4)
			.add(0.6);
		m.colorNode = flat ? color(hex) : color(hex).mul(band);
		materials.set(key, m);
		return m;
	}
	const stage = new THREE.Group();
	scene.add(stage);
	function shape(geo, hex, parent, x = 0, y = 0, z = 0, outline = true) {
		const mesh = new THREE.Mesh(geo, mat(hex));
		mesh.position.set(x, y, z);
		parent.add(mesh);
		if (outline) {
			const hull = new THREE.Mesh(geo, ink);
			hull.scale.setScalar(1.035);
			mesh.add(hull);
		}
		return mesh;
	}
	function box(w, h, d, c, p, x = 0, y = 0, z = 0, o = true) {
		return shape(new THREE.BoxGeometry(w, h, d), c, p, x, y, z, o);
	}
	function ball(
		r,
		c,
		p,
		x = 0,
		y = 0,
		z = 0,
		sx = 1,
		sy = 1,
		sz = 1,
		o = true,
	) {
		const s = shape(new THREE.SphereGeometry(r, 12, 8), c, p, x, y, z, o);
		s.scale.set(sx, sy, sz);
		return s;
	}
	function cylinder(r, h, c, p, x = 0, y = 0, z = 0, o = true) {
		return shape(new THREE.CylinderGeometry(r, r, h, 16), c, p, x, y, z, o);
	}
	function line(points, r, c, p) {
		const curve = new THREE.CatmullRomCurve3(
			points.map((a) => new THREE.Vector3(...a)),
		);
		return shape(
			new THREE.TubeGeometry(
				curve,
				Math.max(8, points.length * 8),
				r,
				8,
				false,
			),
			c,
			p,
		);
	}
	function label(text, w, h, x, y, z, opts = {}) {
		const c = document.createElement("canvas");
		c.width = 1024;
		c.height = Math.ceil((1024 * h) / w);
		const ctx = c.getContext("2d");
		ctx.fillStyle = opts.bg || "#142e3b";
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.strokeStyle = opts.border || "#c6a676";
		ctx.lineWidth = 10;
		ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
		ctx.fillStyle = opts.fg || "#f3dba7";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `900 ${Math.floor(c.height * 0.58)}px Arial`;
		ctx.fillText(text, c.width / 2, c.height * 0.52, c.width * 0.9);
		const tex = new THREE.CanvasTexture(c);
		tex.colorSpace = THREE.SRGBColorSpace;
		const m = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
		const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
		mesh.position.set(x, y, z);
		stage.add(mesh);
		return mesh;
	}
	// Brickwork is deliberately irregular, with bevel-like mortar and ink strokes.
	box(42, 23, 0.6, 0x152d3b, stage, 0, 8, -3.3, false);
	for (let row = 0; row < 10; row++) {
		for (let col = 0; col < 13; col++) {
			const x = -19 + col * 3.15 + (row % 2 ? 1.55 : 0),
				y = -1 + row * 2.05;
			box(
				3.02,
				1.92,
				0.13,
				[0x203b49, 0x24414e, 0x1d3745, 0x284451][(row * 7 + col * 3) % 4],
				stage,
				x,
				y,
				-2.9,
				false,
			);
			if ((row * 3 + col) % 7 === 0)
				line(
					[
						[x - 0.9, y - 0.4, -2.79],
						[x - 0.4, y - 0.1, -2.79],
						[x - 0.2, y + 0.6, -2.79],
					],
					0.018,
					0x132f3e,
					stage,
				);
		}
	}
	// Concentric brick alcove and central enamel sign.
	for (let i = 0; i < 11; i++) {
		const a = Math.PI * 0.13 + (i / 10) * Math.PI * 0.74;
		const b = box(
			1.25,
			0.75,
			0.25,
			0x355663,
			stage,
			Math.cos(a) * 5.4,
			9.5 + Math.sin(a) * 5,
			-2.5,
		);
		b.rotation.z = a - Math.PI / 2;
	}
	box(6.5, 1.7, 0.4, 0x0e2633, stage, 0, 13.5, -2.4);
	label("GRIT WORKS", 6.1, 1.35, 0, 13.5, -2.15, {
		bg: "#153440",
		fg: "#edd49e",
	});
	label("NIGHT SHIFT  •  EST. 1983", 5.8, 0.56, 0, 12.25, -2.1, {
		bg: "#152d3b",
		border: "#345c67",
		fg: "#739793",
	});
	// Heavy side plumbing, flanges, valves, and ceramic lamps.
	const steamPorts = [];
	function pipePath(points, r, c) {
		return line(points, r, c, stage);
	}
	for (const s of [-1, 1]) {
		pipePath(
			[
				[s * 14.4, -1, -1.8],
				[s * 14.4, 5, -1.8],
				[s * 15.3, 7, -1.8],
				[s * 15.3, 14.1, -1.8],
				[s * 12.2, 15.2, -1.8],
			],
			0.48,
			palette.copper,
		);
		pipePath(
			[
				[s * 12.5, 13.6, -0.4],
				[s * 12.5, 14.75, -0.4],
				[s * 10.6, 14.75, -0.4],
				[s * 10.6, 13.4, -0.4],
			],
			0.77,
			palette.teal,
		);
		const lip = cylinder(0.91, 0.3, palette.teal, stage, s * 10.6, 13.35, -0.4);
		lip.rotation.x = 0;
		cylinder(0.72, 0.018, 0x071820, stage, s * 10.6, 13.175, -0.4);
		for (const y of [1.7, 5, 9.8, 13]) {
			const f = cylinder(
				0.66,
				0.19,
				palette.cream,
				stage,
				s * (y > 6 ? 15.3 : 14.4),
				y,
				-1.8,
			);
			for (let i = 0; i < 4; i++) {
				ball(
					0.075,
					0x5d4535,
					stage,
					f.position.x + Math.cos((i * Math.PI) / 2) * 0.55,
					y + 0.13,
					-1.8 + Math.sin((i * Math.PI) / 2) * 0.55,
				);
			}
		}
		const v = new THREE.Group();
		v.position.set(s * 14.4, 7.2, -0.9);
		stage.add(v);
		const tor = shape(
			new THREE.TorusGeometry(0.64, 0.095, 8, 16),
			palette.red,
			v,
		);
		for (let j = 0; j < 3; j++) {
			const spoke = box(1.15, 0.08, 0.1, palette.red, v);
			spoke.rotation.z = (j * Math.PI) / 3;
		}
		ball(0.16, palette.cream, v, 0, 0, 0.08);
		// Hooded lights.
		box(0.12, 0.9, 0.18, 0x627879, stage, s * 5.9, 10.2, -2.3);
		const lamp = shape(
			new THREE.ConeGeometry(0.65, 0.4, 12),
			palette.cream,
			stage,
			s * 5.9,
			10.65,
			-1.65,
		);
		ball(0.29, 0xffdc83, stage, s * 5.9, 10.45, -1.5, 1, 0.6, 1, false);
		const halo = new THREE.Mesh(
			new THREE.CircleGeometry(1.05, 32),
			new THREE.MeshBasicMaterial({
				color: 0xe5ac47,
				transparent: true,
				opacity: 0.055,
				depthWrite: false,
			}),
		);
		halo.position.set(s * 5.9, 10.45, -2.35);
		stage.add(halo);
		steamPorts.push({ x: s * 14.4, y: 2.5 });
		label(s < 0 ? "01 / INTAKE" : "02 / RETURN", 3.7, 0.6, s * 9.1, 1.4, -2.4, {
			bg: "#203b49",
			fg: "#8ca9a6",
			border: "#35515a",
		});
	}
	// Main deck and hand-forged platform assemblies.
	const platformMeshes = [];
	const platforms = [
		{ x: 0, y: 0, w: 25 },
		{ x: -7.5, y: 4, w: 9 },
		{ x: 7.5, y: 4, w: 9 },
		{ x: 0, y: 8, w: 15 },
		{ x: -8, y: 12, w: 8 },
		{ x: 8, y: 12, w: 8 },
	];
	for (let i = 0; i < platforms.length; i++) {
		const p = platforms[i],
			g = new THREE.Group();
		g.position.set(p.x, p.y, 0);
		stage.add(g);
		platformMeshes.push({ group: g, ...p });
		box(p.w, 0.52, 1.6, i % 2 ? 0x37938e : 0xbf7250, g, 0, -0.31, -0.02);
		box(p.w + 0.08, 0.14, 1.68, 0xf2d493, g, 0, -0.065, 0);
		box(p.w, 0.12, 0.12, 0xffe8b5, g, 0, -0.07, 0.84, false);
		box(p.w - 0.1, 0.1, 0.1, 0x173341, g, 0, -0.51, 0.82, false);
		for (let x = -p.w / 2 + 0.55; x < p.w / 2; x += 1.3) {
			ball(0.075, palette.cream, g, x, -0.31, 0.83, 1, 1, 0.5);
			if (i > 0) {
				const br = box(0.085, 0.48, 0.45, 0x16333f, g, x, -0.72, -0.15);
				br.rotation.z = (x > 0 ? 1 : -1) * 0.55;
			}
		}
		for (const x of [-p.w / 2 + 0.22, p.w / 2 - 0.22]) {
			box(0.42, 0.64, 1.75, 0x203845, g, x, -0.33, 0);
			box(0.22, 0.13, 1.8, palette.cream, g, x, -0.065, 0);
		}
	}
	const frost = new THREE.Group();
	stage.add(frost);
	frost.visible = false;
	for (const p of platforms) {
		box(p.w - 0.3, 0.055, 1.68, 0xb7e8de, frost, p.x, p.y + 0.025, 0.02, false);
		for (let k = 0; k < Math.floor(p.w); k++) {
			const f = shape(
				new THREE.ConeGeometry(0.06, 0.12 + (k % 3) * 0.06, 4),
				0x8fcfd0,
				frost,
				p.x - p.w / 2 + k + 0.5,
				p.y - 0.2,
				0.87,
				false,
			);
			f.rotation.z = Math.PI;
		}
	}
	// Wet floor glints and drain slots make the stage feel lived in.
	for (let i = 0; i < 12; i++) {
		const x = -11 + i * 2;
		box(0.8, 0.045, 0.02, 0x3e6b77, stage, x, -0.9, 0.85, false);
		for (let j = 0; j < 3; j++)
			box(
				0.06,
				0.25,
				0.02,
				0x071821,
				stage,
				x - 0.2 + j * 0.2,
				-0.28,
				0.86,
				false,
			);
	}
	for (const [x, y] of [
		[-10.2, 6.5],
		[9.7, 9.7],
		[2.5, 3.3],
		[-3.7, 15.9],
	]) {
		line(
			[
				[x, y, -2.45],
				[x + 0.12, y - 0.5, -2.45],
				[x + 0.05, y - 1.2, -2.45],
			],
			0.04,
			0x417067,
			stage,
		);
		ball(0.1, 0x6f9d7f, stage, x + 0.05, y - 1.25, -2.4, 0.5, 1.6, 0.5, false);
	}
	// Central emergency pressure block.
	const pow = new THREE.Group();
	pow.position.set(0, 2.45, 0.1);
	stage.add(pow);
	box(2.15, 1.2, 1.1, palette.orange, pow);
	box(1.9, 0.97, 0.05, 0x153845, pow, 0, 0, 0.59);
	for (const s of [-1, 1])
		for (const t of [-1, 1])
			ball(0.07, palette.cream, pow, s * 0.88, t * 0.4, 0.64);
	const pc = document.createElement("canvas");
	pc.width = 512;
	pc.height = 256;
	const pct = pc.getContext("2d");
	pct.clearRect(0, 0, 512, 256);
	pct.fillStyle = "#ffe4a8";
	pct.font = "900 140px Arial";
	pct.textAlign = "center";
	pct.textBaseline = "middle";
	pct.fillText("BOP!", 256, 135);
	const pt = new THREE.CanvasTexture(pc);
	pt.colorSpace = THREE.SRGBColorSpace;
	const pm = new THREE.Mesh(
		new THREE.PlaneGeometry(1.75, 0.86),
		new THREE.MeshBasicMaterial({ map: pt, transparent: true }),
	);
	pm.position.z = 0.63;
	pow.add(pm);
	// Rig construction. Mixers drive native tracks; game state selects their weights.
	const actors = new Map(),
		bugs = new Map(),
		coinMeshes = new Map(),
		particles = [],
		callouts = [];
	const ballGeo = new THREE.SphereGeometry(0.1, 6, 4);
	function worker(id) {
		const root = new THREE.Group(),
			rig = new THREE.Group();
		root.add(rig);
		scene.add(root);
		const suit = id === 0 ? palette.orange : palette.mint,
			cap = id === 0 ? palette.red : palette.purple;
		box(0.64, 0.66, 0.46, suit, rig, 0, -0.08, 0);
		box(0.42, 0.42, 0.14, 0x354d64, rig, 0, -0.17, 0.25);
		for (const s of [-1, 1]) {
			box(0.075, 0.53, 0.08, 0xf9d99c, rig, s * 0.2, -0.01, 0.27);
			ball(0.049, 0x283a45, rig, s * 0.2, -0.13, 0.34);
		}
		ball(0.35, 0xf2c69a, rig, 0, 0.38, 0.05, 1, 1.02, 0.8);
		ball(0.14, 0xeeb184, rig, 0.03, 0.33, 0.37, 1.1, 0.85, 1.2);
		// Twin moustache tufts and alert eyes.
		for (const s of [-1, 1]) {
			ball(0.075, 0x503b37, rig, s * 0.1, 0.22, 0.33, 1.3, 0.65, 0.6);
			ball(0.072, 0xfff3da, rig, s * 0.145, 0.45, 0.29, 0.9, 1.25, 0.55, false);
			ball(0.035, 0x09212d, rig, s * 0.14, 0.44, 0.33, 0.8, 1.2, 0.6, false);
			ball(0.09, 0xf2c69a, rig, s * 0.34, 0.35, 0.03, 0.7, 1, 0.7);
		}
		ball(0.37, cap, rig, 0, 0.65, 0.02, 1.08, 0.55, 0.9);
		box(0.55, 0.075, 0.3, cap, rig, 0, 0.6, 0.26);
		ball(0.11, palette.cream, rig, 0, 0.69, 0.31, 1, 0.8, 0.3);
		box(0.24, 0.45, 0.2, 0x335365, rig, 0, -0.04, -0.34);
		const armL = new THREE.Group(),
			armR = new THREE.Group(),
			legL = new THREE.Group(),
			legR = new THREE.Group();
		armL.name = "armL";
		armR.name = "armR";
		legL.name = "legL";
		legR.name = "legR";
		for (const [s, a, l] of [
			[-1, armL, legL],
			[1, armR, legR],
		]) {
			a.position.set(s * 0.38, 0.13, 0);
			rig.add(a);
			box(0.18, 0.35, 0.22, suit, a, 0, -0.15, 0);
			ball(0.13, palette.cream, a, 0, -0.36, 0.01, 1, 0.95, 1);
			l.position.set(s * 0.2, -0.34, 0);
			rig.add(l);
			box(0.22, 0.27, 0.24, 0x34475e, l, 0, -0.12, 0);
			box(0.28, 0.17, 0.39, 0x172b39, l, 0, -0.27, 0.08);
		}
		const mixer = new THREE.AnimationMixer(rig);
		const run = new THREE.AnimationClip("run", 0.48, [
			new THREE.NumberKeyframeTrack(
				"legL.rotation[z]",
				[0, 0.12, 0.24, 0.36, 0.48],
				[0.55, 0, -0.55, 0, 0.55],
			),
			new THREE.NumberKeyframeTrack(
				"legR.rotation[z]",
				[0, 0.12, 0.24, 0.36, 0.48],
				[-0.55, 0, 0.55, 0, -0.55],
			),
			new THREE.NumberKeyframeTrack(
				"armL.rotation[z]",
				[0, 0.24, 0.48],
				[-0.4, 0.4, -0.4],
			),
			new THREE.NumberKeyframeTrack(
				"armR.rotation[z]",
				[0, 0.24, 0.48],
				[0.4, -0.4, 0.4],
			),
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.12, 0.24, 0.36, 0.48],
				[0, 0.07, 0, 0.07, 0],
			),
		]);
		const idle = new THREE.AnimationClip("idle", 1.8, [
			new THREE.NumberKeyframeTrack(".scale[y]", [0, 0.9, 1.8], [1, 1.035, 1]),
			new THREE.NumberKeyframeTrack(
				"armL.rotation[z]",
				[0, 0.9, 1.8],
				[0.05, 0.12, 0.05],
			),
			new THREE.NumberKeyframeTrack(
				"armR.rotation[z]",
				[0, 0.9, 1.8],
				[-0.05, -0.12, -0.05],
			),
		]);
		const jump = new THREE.AnimationClip("jump", 0.5, [
			new THREE.NumberKeyframeTrack(
				"armL.rotation[z]",
				[0, 0.15, 0.5],
				[-0.1, -1.6, -1.4],
			),
			new THREE.NumberKeyframeTrack(
				"armR.rotation[z]",
				[0, 0.15, 0.5],
				[0.1, 1.6, 1.4],
			),
			new THREE.NumberKeyframeTrack("legL.rotation[z]", [0, 0.5], [0.15, 0.4]),
			new THREE.NumberKeyframeTrack("legR.rotation[z]", [0, 0.5], [-0.2, -0.5]),
		]);
		const actions = {
			run: mixer.clipAction(run),
			idle: mixer.clipAction(idle),
			jump: mixer.clipAction(jump),
		};
		for (const a of Object.values(actions)) a.play();
		return { root, rig, mixer, actions };
	}
	function pest(type) {
		const root = new THREE.Group(),
			rig = new THREE.Group();
		root.add(rig);
		scene.add(root);
		const feet = [];
		const boss = type === "boss",
			crab = type === "crab",
			fly = type === "fly";
		const c = boss
			? palette.red
			: crab
				? palette.red
				: fly
					? palette.purple
					: palette.teal;
		ball(0.48, c, rig, 0, 0, 0, 1.2, 0.73, 0.9);
		if (!fly) {
			ball(
				0.39,
				boss ? 0xe9b654 : crab ? 0xf5ab68 : 0xd1af61,
				rig,
				0,
				0.12,
				-0.02,
				1.22,
				0.8,
				1.02,
			);
			for (let s = -1; s <= 1; s += 2) {
				line(
					[
						[s * 0.08, 0.42, 0.18],
						[s * 0.32, 0.22, 0.35],
						[s * 0.4, -0.03, 0.37],
					],
					0.026,
					0x4a6555,
					rig,
				);
				for (let i = 0; i < 3; i++) {
					const leg = new THREE.Group();
					leg.position.set(s * 0.35, -0.17, (i - 1) * 0.25);
					leg.name = "f" + feet.length;
					feet.push(leg);
					rig.add(leg);
					line(
						[
							[0, 0, 0],
							[s * 0.23, -0.03, 0.02],
							[s * 0.3, -0.18, 0.05],
						],
						0.07,
						crab ? 0xc45142 : 0x254a50,
						leg,
					);
				}
			}
		} else {
			for (const s of [-1, 1])
				ball(0.4, 0xc8eee4, rig, s * 0.42, 0.16, -0.06, 1.1, 0.42, 0.2);
			for (let i = 0; i < 3; i++)
				box(0.54, 0.05, 0.1, 0xf2c96d, rig, 0, -0.12 + i * 0.13, 0.36);
			line(
				[
					[0, 0.34, 0],
					[0.12, 0.66, 0],
					[0.22, 0.72, 0],
				],
				0.025,
				palette.cream,
				rig,
			);
			ball(0.1, palette.orange, rig, 0.22, 0.72, 0);
		}
		for (const s of [-1, 1]) {
			if (crab)
				line(
					[
						[s * 0.22, 0.1, 0.16],
						[s * 0.25, 0.49, 0.19],
					],
					0.055,
					palette.red,
					rig,
				);
			ball(
				0.13,
				palette.white,
				rig,
				s * 0.2,
				crab ? 0.49 : 0.18,
				0.36,
				1,
				1.15,
				0.65,
			);
			ball(
				0.058,
				0x122632,
				rig,
				s * 0.2,
				crab ? 0.48 : 0.17,
				0.44,
				0.9,
				1.1,
				0.6,
				false,
			);
			if (crab) {
				line(
					[
						[s * 0.4, 0.02, 0],
						[s * 0.76, 0.14, 0.04],
					],
					0.07,
					palette.red,
					rig,
				);
				ball(0.2, palette.red, rig, s * 0.77, 0.2, 0.1, 1, 1.1, 0.7);
				const claw = box(
					0.08,
					0.22,
					0.15,
					palette.cream,
					rig,
					s * 0.75,
					0.35,
					0.13,
				);
				claw.rotation.z = s * 0.3;
			}
		}
		if (boss) {
			box(0.7, 0.32, 0.6, 0x28424c, rig, 0, 0.48, -0.12);
			cylinder(0.15, 0.35, 0x28424c, rig, 0.25, 0.74, -0.12);
			for (const s of [-1, 1])
				line(
					[
						[s * 0.35, 0.15, 0.3],
						[s * 0.6, 0.7, 0.2],
					],
					0.08,
					palette.cream,
					rig,
				);
			root.scale.setScalar(1.9);
		}
		const mixer = new THREE.AnimationMixer(rig),
			tracks = [];
		feet.forEach((f, i) =>
			tracks.push(
				new THREE.NumberKeyframeTrack(
					f.name + ".rotation[z]",
					[0, 0.18, 0.36],
					[i % 2 ? 0.3 : -0.3, i % 2 ? -0.3 : 0.3, i % 2 ? 0.3 : -0.3],
				),
			),
		);
		tracks.push(
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.18, 0.36],
				[0, 0.035, 0],
			),
		);
		const action = mixer.clipAction(
			new THREE.AnimationClip("scuttle", 0.36, tracks),
		);
		action.play();
		const status = new THREE.Group();
		scene.add(status);
		const stars = [];
		for (let i = 0; i < 3; i++) {
			const star = new THREE.Shape();
			for (let j = 0; j < 10; j++) {
				const a = (j / 10) * Math.PI * 2 + Math.PI / 2,
					r = j % 2 ? 0.075 : 0.16;
				if (j === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
				else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			star.closePath();
			const m = new THREE.Mesh(
				new THREE.ShapeGeometry(star),
				mat(palette.cream, true),
			);
			status.add(m);
			stars.push(m);
		}
		return { root, rig, mixer, type, status, stars };
	}
	function callout(text, x, y, tint = palette.cream) {
		// Canvas lettering is generated at interaction time; no external font/image assets.
		const cv = document.createElement("canvas");
		cv.height = 224;
		const cx = cv.getContext("2d");
		cx.font = "900 116px Arial";
		cv.width = Math.ceil(
			Math.min(1280, Math.max(320, cx.measureText(text).width + 64)),
		);
		cx.font = "900 116px Arial";
		cx.textAlign = "center";
		cx.textBaseline = "middle";
		cx.lineJoin = "round";
		cx.lineWidth = 22;
		cx.strokeStyle = "#07121b";
		cx.strokeText(text, cv.width / 2, 118, cv.width - 40);
		cx.fillStyle = "#" + new THREE.Color(tint).getHexString();
		cx.fillText(text, cv.width / 2, 118, cv.width - 40);
		const texture = new THREE.CanvasTexture(cv);
		texture.colorSpace = THREE.SRGBColorSpace;
		const material = new THREE.SpriteMaterial({
			map: texture,
			transparent: true,
			depthTest: false,
			depthWrite: false,
		});
		const sprite = new THREE.Sprite(material);
		sprite.renderOrder = 100;
		const width = Math.min(4.7, Math.max(2.6, text.length * 0.29)),
			height = (width * cv.height) / cv.width;
		sprite.scale.set(width, height, 1);
		sprite.position.set(
			Math.max(-10.5, Math.min(10.5, x)),
			Math.min(15.9, y + 1.05),
			2.5,
		);
		scene.add(sprite);
		callouts.push({
			sprite,
			texture,
			material,
			life: 1.05,
			max: 1.05,
			width,
			height,
			y: sprite.position.y,
		});
		// Several simultaneous kicks stay legible without accumulating stale lettering.
		if (callouts.length > 8) {
			const old = callouts.shift();
			scene.remove(old.sprite);
			old.texture.dispose();
			old.material.dispose();
		}
	}
	function effect(type, x, y, c = palette.cream, details = {}) {
		const text =
			details.label ||
			(type === "armor"
				? "BUMP AGAIN!"
				: type === "flip"
					? "BOOT!"
					: type === "kick"
						? details.points
							? "+" + details.points
							: "＋ BOOT!"
						: type === "pow"
							? "PRESSURE POP!"
							: null);
		if (text)
			callout(
				text,
				x,
				y,
				type === "armor" ? palette.orange : type === "kick" ? palette.cream : c,
			);
		if (type === "bump" || type === "flip" || type === "armor") {
			for (const p of platformMeshes)
				if (Math.abs(p.y - y) < 1) {
					p.kick = 0.21;
				}
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.15, 0.23, 24),
				new THREE.MeshBasicMaterial({
					color: c,
					transparent: true,
					depthWrite: false,
				}),
			);
			ring.position.set(x, y, 1.4);
			scene.add(ring);
			particles.push({
				mesh: ring,
				life: 0.4,
				max: 0.4,
				vx: 0,
				vy: 0,
				ring: true,
			});
		}
		const count =
			type === "pow"
				? 45
				: type === "kick" || type === "win"
					? 24
					: type === "hurt"
						? 15
						: 9;
		for (let i = 0; i < count; i++) {
			const a = (i / count) * Math.PI * 2 + Math.random() * 0.5,
				s = type === "pow" ? 7 : 3 + Math.random() * 3;
			const m = new THREE.Mesh(
				ballGeo,
				mat(type === "coin" ? 0xffd16d : c, true),
			);
			m.position.set(x, y, 1.2 + Math.random() * 0.25);
			m.scale.setScalar(0.6 + Math.random());
			scene.add(m);
			particles.push({
				mesh: m,
				life: 0.4 + Math.random() * 0.4,
				max: 0.8,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s + 2,
			});
		}
	}
	function removePest(a) {
		scene.remove(a.root);
		scene.remove(a.status);
		a.mixer.stopAllAction();
		const geometries = new Set();
		a.root.traverse((o) => {
			if (o.geometry) geometries.add(o.geometry);
		});
		a.status.traverse((o) => {
			if (o.geometry) geometries.add(o.geometry);
		});
		for (const g of geometries) g.dispose();
	}
	let t = 0,
		steamClock = 0;
	function resize() {
		const w = canvas.clientWidth || innerWidth,
			h = canvas.clientHeight || innerHeight;
		renderer.setSize(w, h, false);
		const aspect = w / h,
			halfH = 9.35,
			halfW = Math.max(13.4, halfH * aspect),
			height = Math.max(halfH, 13.4 / aspect);
		camera.left = -halfW;
		camera.right = halfW;
		camera.top = height;
		camera.bottom = -height;
		camera.updateProjectionMatrix();
	}
	resize();
	function render(state = {}, dt = 1 / 60) {
		t += dt;
		steamClock += dt;
		frost.visible = state.phase === 4;
		const shake = state.shake || 0;
		camera.position.x = (Math.random() - 0.5) * shake * 0.22;
		camera.position.y = 8.2 + (Math.random() - 0.5) * shake * 0.18;
		camera.lookAt(0, 8.2, 0);
		for (const p of platformMeshes)
			if (p.kick) {
				p.kick = Math.max(0, p.kick - dt);
				p.group.position.y = p.y + Math.sin((p.kick / 0.21) * Math.PI) * 0.18;
			}
		const liveP = new Set();
		for (const p of state.players || []) {
			liveP.add(p.id);
			let a = actors.get(p.id);
			if (!a) {
				a = worker(p.id);
				actors.set(p.id, a);
			}
			a.root.visible =
				p.active !== false &&
				!p.dead &&
				!(p.hurt > 0 && Math.floor(t * 16) % 2 === 0);
			a.root.position.set(p.x, p.y, 0.35);
			a.root.rotation.y = (p.face || 1) * 0.22;
			const mode = !p.grounded
				? "jump"
				: Math.abs(p.vx || 0) > 0.1
					? "run"
					: "idle";
			for (const [name, act] of Object.entries(a.actions))
				act.setEffectiveWeight(name === mode ? 1 : 0);
			a.actions.run.setEffectiveTimeScale(
				Math.max(0.7, Math.abs(p.vx || 0) / 4),
			);
			a.mixer.update(dt);
		}
		for (const [id, a] of actors) if (!liveP.has(id)) a.root.visible = false;
		const liveE = new Set();
		for (const e of state.enemies || []) {
			liveE.add(e.id);
			let a = bugs.get(e.id);
			if (!a || a.type !== e.type) {
				if (a) removePest(a);
				a = pest(e.type);
				bugs.set(e.id, a);
			}
			a.root.visible = true;
			a.root.position.set(e.x, e.y, 0.2);
			a.root.rotation.z = e.flipped ? Math.PI + Math.sin(t * 14) * 0.09 : 0;
			a.root.rotation.y = (e.vx || 0) > 0 ? 0.1 : -0.1;
			a.mixer.update(dt * (e.flipped ? 0.4 : e.angry ? 1.7 : 1));
			if (e.type === "fly") a.rig.rotation.z = Math.sin(t * 13) * 0.08;
			a.root.scale.setScalar(
				(e.type === "boss" ? 1.9 : 1) *
					(e.tell > 0 ? 1 + Math.sin(t * 30) * 0.05 : 1),
			);
			a.status.visible = !!e.flipped;
			a.status.position.set(e.x, e.y + (e.type === "boss" ? 1.25 : 0.8), 0.9);
			a.stars.forEach((m, i) => {
				const angle = t * 4 + (i * Math.PI * 2) / 3;
				m.position.set(
					Math.cos(angle) * 0.55,
					Math.sin(angle) * 0.13,
					Math.sin(angle) * 0.1,
				);
				m.rotation.z = -angle;
			});
		}
		for (const [id, a] of bugs)
			if (!liveE.has(id)) {
				removePest(a);
				bugs.delete(id);
			}
		const liveC = new Set();
		for (const c of state.coins || []) {
			liveC.add(c.id);
			let m = coinMeshes.get(c.id);
			if (!m) {
				m = new THREE.Group();
				scene.add(m);
				const disc = cylinder(0.25, 0.1, 0xf6c86b, m);
				disc.rotation.x = Math.PI / 2;
				const center = ball(0.14, 0xffe6a4, m, 0, 0, 0.07, 1, 1, 0.15);
				coinMeshes.set(c.id, m);
			}
			m.position.set(c.x, c.y + Math.sin(t * 4 + c.id) * 0.1, 0.4);
			m.rotation.y = t * 2.7;
		}
		for (const [id, m] of coinMeshes)
			if (!liveC.has(id)) {
				scene.remove(m);
				coinMeshes.delete(id);
			}
		pow.visible = state.powCharges !== 0;
		pow.rotation.z = Math.sin(t * 2) * 0.025;
		if (steamClock > 0.25) {
			steamClock = 0;
			for (const port of steamPorts) {
				const m = new THREE.Mesh(
					new THREE.SphereGeometry(0.13, 6, 4),
					new THREE.MeshBasicMaterial({
						color: 0xa0c0b7,
						transparent: true,
						opacity: 0.22,
						depthWrite: false,
					}),
				);
				m.position.set(port.x, port.y, -1.2);
				scene.add(m);
				particles.push({
					mesh: m,
					life: 1.5,
					max: 1.5,
					vx: (Math.random() - 0.5) * 0.3,
					vy: 0.5,
					steam: true,
				});
			}
		}
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life -= dt;
			if (p.life <= 0) {
				scene.remove(p.mesh);
				if (p.mesh.material.transparent) p.mesh.material.dispose();
				if (p.ring || p.steam) p.mesh.geometry.dispose();
				particles.splice(i, 1);
				continue;
			}
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.y += p.vy * dt;
			if (!p.steam) p.vy -= dt * 8;
			if (p.ring) p.mesh.scale.setScalar(1 + (1 - p.life / p.max) * 13);
			if (p.steam) p.mesh.scale.addScalar(dt * 0.5);
			if (p.mesh.material.transparent)
				p.mesh.material.opacity =
					(p.steam ? 0.22 : 1) * Math.min(1, (p.life / p.max) * 2);
		}
		for (let i = callouts.length - 1; i >= 0; i--) {
			const f = callouts[i];
			f.life -= dt;
			if (f.life <= 0) {
				scene.remove(f.sprite);
				f.texture.dispose();
				f.material.dispose();
				callouts.splice(i, 1);
				continue;
			}
			const age = 1 - f.life / f.max,
				pop = 1 + Math.sin(Math.min(1, age * 5) * Math.PI) * 0.13;
			f.sprite.position.y = f.y + age * 0.7;
			f.sprite.scale.set(f.width * pop, f.height * pop, 1);
			f.material.opacity = Math.min(1, f.life / 0.25);
		}
		renderer.render(scene, camera);
	}
	function dispose() {
		for (const f of callouts) {
			f.texture.dispose();
			f.material.dispose();
		}
		renderer.dispose();
		scene.traverse((o) => {
			o.geometry?.dispose();
		});
		for (const m of materials.values()) m.dispose();
		ink.dispose();
	}
	return {
		render,
		resize,
		effect,
		dispose,
		renderer,
		camera,
		scene,
		stats: () => ({
			backend: renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2",
			actors: actors.size,
			enemies: bugs.size,
			particles: particles.length,
			callouts: callouts.length,
			nativeAnimationMixers: actors.size + bugs.size,
		}),
	};
}
