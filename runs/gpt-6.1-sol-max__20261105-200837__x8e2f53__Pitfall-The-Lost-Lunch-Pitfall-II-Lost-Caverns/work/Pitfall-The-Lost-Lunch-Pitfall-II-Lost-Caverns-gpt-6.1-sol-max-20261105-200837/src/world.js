import * as T from "three/webgpu";

export const FLOOR = [
	[-12, 19, 0],
	[23, 42, 0],
	[42, 82, -9],
	[42, 45, -3.1],
	[79, 83, -5.4],
	[81, 85, -2.7],
	[83, 132, 0],
	[132, 174, 0],
	[89, 92.35, 10],
	[93.65, 102, 10],
	[99, 100.35, 17],
	[101.65, 113, 17],
	[131, 164, 24],
	[23.5, 27, 2.2],
	[30, 34, 4.2],
	[52, 57, -5.8],
	[65, 69, -7],
	[143, 148, 3.3],
];
export const LADDERS = [
	{ x: 93, bottom: 0, top: 10 },
	{ x: 101, bottom: 10, top: 17 },
];
export const FLAGS = [
	{ x: 8, y: 0, name: "Base camp" },
	{ x: 38, y: 0, name: "Moss Gallery" },
	{ x: 86, y: 0, name: "River shore" },
	{ x: 135, y: 24, name: "Suncrumb Shrine" },
];
export const CRUMBS = [
	[14, 1.4],
	[21, 2],
	[25, 3.5],
	[32, 5.5],
	[46, -4.8],
	[55, -4.4],
	[64, -7.7],
	[75, -4.3],
	[95, 11.4],
	[110, 18.4],
	[126, 15],
	[145, 25.4],
];
export const HAZARDS = [
	{ type: "scorpion", x: 28, y: 0.52, range: 4, speed: 0.9 },
	{ type: "bat", x: 38, y: 3.4, range: 4, speed: 0.8 },
	{ type: "eel", x: 56, y: -3.6, range: 5, speed: 0.6 },
	{ type: "eel", x: 71, y: -6, range: 4, speed: 0.7 },
	{ type: "scorpion", x: 89, y: 0.52, range: 3, speed: 0.75 },
	{ type: "bat", x: 103, y: 12.8, range: 6, speed: 0.7 },
	{ type: "bat", x: 123, y: 18.4, range: 4, speed: 0.7 },
	{ type: "bat", x: 146, y: 26.9, range: 6, speed: 0.75 },
	{ type: "scorpion", x: 154, y: 24.52, range: 3, speed: 0.8 },
];
export const ZONES = [
	"Moss Gallery",
	"The Below River",
	"Bat Belfry",
	"Balloon Well",
	"Suncrumb Shrine",
];
const palette = {
	ink: 0x102b32,
	moss: 0x8baa58,
	stone: 0x35626a,
	warm: 0xd7a15b,
	cyan: 0x69ded1,
	gold: 0xf2c862,
	cream: 0xf5e5bd,
	red: 0xf07854,
};

export class Cavern {
	constructor(R, scene) {
		this.R = R;
		this.scene = scene;
		this.physics = new R.World({ x: 0, y: -25, z: 0 });
		this.physics.timestep = 1 / 60;
		this.materials = new Map();
		this.mixers = [];
		this.sparkles = [];
		this.plants = [];
		this.crumbMeshes = [];
		this.hazardMeshes = [];
		this.flags = [];
		this.companions = [];
		this.artSeed = 19384;
		const data = new Uint8Array([90, 145, 205, 255]);
		this.gradient = new T.DataTexture(data, 4, 1, T.RedFormat);
		this.gradient.magFilter = this.gradient.minFilter = T.NearestFilter;
		this.gradient.needsUpdate = true;
		this.ink = new T.MeshBasicMaterial({
			color: palette.ink,
			side: T.BackSide,
		});
		this.lines = new T.LineBasicMaterial({
			color: palette.ink,
			transparent: true,
			opacity: 0.7,
		});
		this.buildBackground();
		this.buildTerrain();
		this.buildDetails();
		this.buildObjects();
	}
	random() {
		this.artSeed = (1664525 * this.artSeed + 1013904223) >>> 0;
		return this.artSeed / 4294967296;
	}
	mat(color, glow = 0) {
		const key = `${color}:${glow}`;
		if (!this.materials.has(key))
			this.materials.set(
				key,
				new T.MeshToonMaterial({
					color,
					gradientMap: this.gradient,
					emissive: glow ? color : 0,
					emissiveIntensity: glow,
				}),
			);
		return this.materials.get(key);
	}
	mesh(geometry, color, parent = this.scene, outline = true, glow = 0) {
		const m = new T.Mesh(geometry, this.mat(color, glow));
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		if (outline) {
			const shell = new T.Mesh(geometry, this.ink);
			shell.scale.setScalar(1.045);
			shell.renderOrder = -1;
			m.add(shell);
		}
		return m;
	}
	box(x, y, z, w, h, d, c, parent = this.scene, outline = true) {
		const m = this.mesh(new T.BoxGeometry(w, h, d), c, parent, outline);
		m.position.set(x, y, z);
		return m;
	}
	ball(x, y, z, r, c, parent = this.scene, scale = [1, 1, 1], detail = 1) {
		const m = this.mesh(new T.IcosahedronGeometry(r, detail), c, parent);
		m.position.set(x, y, z);
		m.scale.set(...scale);
		return m;
	}
	cylinder(x, y, z, r1, r2, h, c, parent = this.scene, sides = 7) {
		const m = this.mesh(new T.CylinderGeometry(r1, r2, h, sides), c, parent);
		m.position.set(x, y, z);
		return m;
	}
	line(points, c = palette.ink, parent = this.scene) {
		const g = new T.BufferGeometry().setFromPoints(
			points.map((p) => new T.Vector3(...p)),
		);
		const l = new T.Line(g, new T.LineBasicMaterial({ color: c }));
		parent.add(l);
		return l;
	}
	label(text, x, y, size = 1.4, color = "#f5e5bd", parent = this.scene) {
		const canvas = document.createElement("canvas");
		canvas.width = 1024;
		canvas.height = 128;
		const ctx = canvas.getContext("2d");
		ctx.font = "bold 54px Georgia";
		ctx.textAlign = "center";
		ctx.fillStyle = color;
		ctx.fillText(text, 512, 84);
		const tex = new T.CanvasTexture(canvas);
		tex.colorSpace = T.SRGBColorSpace;
		const m = new T.Mesh(
			new T.PlaneGeometry(size * 8, size),
			new T.MeshBasicMaterial({
				map: tex,
				transparent: true,
				depthWrite: false,
			}),
		);
		m.position.set(x, y, 1.4);
		parent.add(m);
		return m;
	}
	staticBox(x, y, w, h, d = 3) {
		const body = this.physics.createRigidBody(
			this.R.RigidBodyDesc.fixed().setTranslation(x, y, 0),
		);
		return this.physics.createCollider(
			this.R.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
				.setFriction(0)
				.setRestitution(0),
			body,
		);
	}
	buildBackground() {
		this.box(80, 8, -18, 230, 92, 1, 0x143740, this.scene, false);
		for (let layer = 0; layer < 3; layer++) {
			const c = [0x20464e, 0x28545a, 0x2b5d61][layer];
			for (let i = 0; i < 24; i++) {
				const x = -14 + i * 8.5 + (this.random() - 0.5) * 4,
					h = 9 + this.random() * 26;
				const m = this.cylinder(
					x,
					-12 + h / 2,
					-14 + layer * 3,
					2 + this.random() * 3,
					4 + this.random() * 4,
					h,
					c,
					this.scene,
					5,
				);
				m.rotation.z = (this.random() - 0.5) * 0.23;
			}
		}
		// Monumental broken arches give the cutaway depth and a recognisable silhouette.
		for (const [x, y, r] of [
			[12, 0, 16],
			[60, -7, 18],
			[106, 0, 18],
			[149, 24, 13],
		]) {
			const arch = this.mesh(
				new T.TorusGeometry(r, 1.8, 4, 16, Math.PI),
				0x32646b,
				this.scene,
			);
			arch.position.set(x, y, -7);
			arch.rotation.z = 0;
			for (const sign of [-1, 1])
				this.box(x + sign * r, y - 6, -7, 3.5, 12, 3, 0x32646b);
			for (let j = 0; j < 9; j++) {
				const a = (j / 8) * Math.PI;
				this.line(
					[
						[x + Math.cos(a) * (r - 1.5), y + Math.sin(a) * (r - 1.5), -4.9],
						[x + Math.cos(a) * (r + 1.6), y + Math.sin(a) * (r + 1.6), -4.9],
					],
					0x21484e,
				);
			}
		}
		for (let i = 0; i < 82; i++) {
			const x = -8 + this.random() * 180,
				ceiling = x > 108 ? 39 : 22,
				h = 1.2 + this.random() * 5;
			const m = this.cylinder(
				x,
				ceiling - h / 2,
				-3 - this.random() * 6,
				0.9 + this.random(),
				0,
				h,
				0x2b5559,
				this.scene,
				5,
			);
			m.rotation.z = (this.random() - 0.5) * 0.25;
		}
		// Thin, softly luminous shafts, all generated geometry.
		const shaftMat = new T.MeshBasicMaterial({
			color: 0x91cbb8,
			transparent: true,
			opacity: 0.035,
			depthWrite: false,
			side: T.DoubleSide,
		});
		for (const [x, y] of [
			[8, 15],
			[33, 14],
			[74, 10],
			[122, 29],
			[150, 32],
		]) {
			const s = new T.Mesh(new T.PlaneGeometry(3, 24), shaftMat);
			s.position.set(x, y, -3);
			s.rotation.z = -0.25;
			this.scene.add(s);
		}
		for (let i = 0; i < 100; i++) {
			const s = this.mesh(
				new T.IcosahedronGeometry(0.035 + this.random() * 0.035),
				0xa3e8c5,
				this.scene,
				false,
				0.7,
			);
			s.position.set(
				this.random() * 175 - 7,
				this.random() * 44 - 9,
				-3 - this.random() * 8,
			);
			this.sparkles.push({
				mesh: s,
				x: s.position.x,
				y: s.position.y,
				phase: this.random() * 6,
			});
		}
	}
	buildTerrain() {
		for (const [a, b, y] of FLOOR) {
			const w = b - a,
				thin = y === 2.2 || y === 4.2,
				thick = thin ? 0.32 : 2;
			this.staticBox((a + b) / 2, y - thick / 2, w, thick);
			const shape = new T.Shape();
			shape.moveTo(a, y);
			shape.lineTo(b, y);
			shape.lineTo(b + 0.1, y - thick * 0.65);
			shape.lineTo(b - 0.3, y - thick * 1.1);
			for (let x = b - 2; x > a + 1; x -= 2.3)
				shape.lineTo(x, y - thick * (0.95 + this.random() * 0.4));
			shape.lineTo(a - 0.1, y - thick * 0.85);
			shape.closePath();
			const geo = new T.ExtrudeGeometry(shape, {
				depth: 2.6,
				bevelEnabled: false,
			});
			geo.translate(0, 0, -1.5);
			const _m = this.mesh(
				geo,
				y >= 20 ? 0xb68f5f : 0x4e7070,
				this.scene,
				false,
			);
			const edges = new T.LineSegments(
				new T.EdgesGeometry(geo, 25),
				this.lines,
			);
			this.scene.add(edges);
			this.box(
				(a + b) / 2,
				y + 0.025,
				0,
				w,
				0.16,
				2.8,
				y < -2 ? 0x81978a : y >= 20 ? 0xdfbd79 : palette.moss,
				this.scene,
				false,
			);
			for (let x = a + 0.3; x < b - 0.4; x += 0.8 + this.random() * 1.2) {
				this.box(
					x,
					y - 0.1 - this.random() * thick * 0.15,
					1.15,
					0.25 + this.random() * 0.7,
					thin ? 0.2 : 0.5,
					0.15,
					y >= 20 ? 0xdec086 : 0x74965d,
					this.scene,
					false,
				);
				if (!thin && this.random() > 0.5)
					this.line(
						[
							[x, y - 0.8, 1.18],
							[x + 0.4, y - 1.1, 1.18],
							[x + 0.2, y - 1.4, 1.18],
						],
						0x315359,
					);
			}
		}
		// Soft lateral bounds and an invisible safety floor below the river.
		this.staticBox(-12, 12, 2, 60);
		this.staticBox(175, 12, 2, 60);
		this.staticBox(80, -17, 210, 2);
		for (const l of LADDERS) {
			for (const s of [-1, 1])
				this.cylinder(
					l.x + s * 0.46,
					(l.top + l.bottom) / 2,
					0.1,
					0.07,
					0.07,
					l.top - l.bottom + 1,
					palette.warm,
				);
			for (let y = l.bottom + 0.3; y < l.top + 0.4; y += 0.55)
				this.box(l.x, y, 0.25, 1.05, 0.12, 0.16, palette.cream);
		}
		const waterMat = new T.MeshBasicMaterial({
			color: 0x46bfb7,
			transparent: true,
			opacity: 0.32,
			depthWrite: false,
			side: T.DoubleSide,
		});
		this.water = new T.Mesh(new T.BoxGeometry(40, 9, 3.1), waterMat);
		this.water.position.set(62, -4.5, 0.2);
		this.scene.add(this.water);
		const points = [];
		for (let i = 0; i <= 100; i++)
			points.push(new T.Vector3(42 + i * 0.4, 0.08, 1.8));
		this.waterline = new T.Line(
			new T.BufferGeometry().setFromPoints(points),
			new T.LineBasicMaterial({ color: 0xb8fff0 }),
		);
		this.scene.add(this.waterline);
		for (let i = 0; i < 23; i++) {
			const x = 43 + this.random() * 38,
				y = -0.6 - this.random() * 7.7;
			const bubble = new T.Mesh(
				new T.TorusGeometry(0.04 + this.random() * 0.09, 0.014, 4, 8),
				new T.MeshBasicMaterial({
					color: 0x9aedd7,
					transparent: true,
					opacity: 0.55,
				}),
			);
			bubble.position.set(x, y, 1.75);
			this.scene.add(bubble);
			this.sparkles.push({
				mesh: bubble,
				x,
				y,
				phase: this.random() * 6,
				water: true,
			});
		}
		this.label("THE BELOW RIVER", 62, 4, 1.1, "#8acdc0");
		this.label("SUNCRUMB SHRINE", 147, 32, 1.15, "#bfab7c");
	}
	fern(x, y, z, s = 1, color = 0x71aa75) {
		const g = new T.Group();
		g.position.set(x, y, z);
		g.scale.setScalar(s);
		this.scene.add(g);
		for (let side = -1; side <= 1; side += 2)
			for (let j = 0; j < 5; j++) {
				const leaf = this.mesh(
					new T.ConeGeometry(0.13, 0.8, 3),
					color,
					g,
					false,
				);
				leaf.position.set(side * (0.12 + j * 0.12), 0.2 + j * 0.18, 0);
				leaf.rotation.z = -side * (0.8 - j * 0.09);
			}
		this.line(
			[
				[0, 0, 0.02],
				[0, 1.15, 0.02],
			],
			0x376b59,
			g,
		);
		this.plants.push(g);
	}
	mushroom(x, y, z, s = 1, color = palette.cyan) {
		const g = new T.Group();
		g.position.set(x, y, z);
		g.scale.setScalar(s);
		this.scene.add(g);
		this.cylinder(0, 0.4, 0, 0.12, 0.2, 0.8, 0x96c7ad, g);
		const cap = this.mesh(
			new T.SphereGeometry(0.7, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2),
			color,
			g,
			true,
			0.12,
		);
		cap.position.y = 0.75;
		this.cylinder(0, 0.75, 0, 0.7, 0.65, 0.08, 0xe2e7b2, g);
		for (const [a, b] of [
			[-0.3, 0.94],
			[0.2, 1.05],
			[0.45, 0.88],
		])
			this.ball(a, b, 0.4, 0.09, 0xe4eabb, g, [1, 0.5, 1], 0);
	}
	buildDetails() {
		for (const [a, b, y] of FLOOR) {
			for (let x = a + 1; x < b - 1; x += 3 + this.random() * 3) {
				if (x < 0) continue;
				const underwater = y < -2;
				this.fern(
					x,
					y + 0.05,
					-0.9,
					0.6 + this.random() * 1.0,
					underwater ? 0x4caaa0 : 0x78a66a,
				);
				if (this.random() > 0.35)
					this.mushroom(
						x + 0.6,
						y,
						-0.8,
						0.45 + this.random() * 0.65,
						underwater ? 0x93d4af : palette.cyan,
					);
				if (this.random() > 0.65)
					this.ball(
						x + 1,
						y + 0.16,
						0.6,
						0.28,
						0x96a589,
						this.scene,
						[1.5, 0.7, 1],
						0,
					);
			}
		}
		// Large foreground fungi and ferns frame the playable plane without obscuring it.
		for (const [x, y, s] of [
			[-4, 0, 3.4],
			[3, 0, 1.8],
			[40, 0, 2.5],
			[84, 0, 2],
			[129, 0, 2.8],
			[163, 24, 2.2],
		]) {
			this.mushroom(x, y, 2.1, s, 0x427b79);
			this.fern(x + 1.5, y, 2.2, s * 0.85, 0x356e61);
		}
		for (const x of [5, 17, 35, 88, 97, 139, 159]) {
			const y = x > 130 ? 30 : 19,
				len = 3 + this.random() * 5;
			this.line(
				[
					[x, y, -1],
					[x + 0.4, y - len / 2, -1],
					[x - 0.1, y - len, -1],
				],
				0x56845c,
			);
			for (let j = 0; j < len; j++) {
				const leaf = this.mesh(
					new T.ConeGeometry(0.22, 0.6, 3),
					0x648958,
					this.scene,
					false,
				);
				leaf.position.set(x + (j % 2 ? 0.35 : -0.1), y - j, -1);
				leaf.rotation.z = j % 2 ? 0.8 : -0.8;
			}
		}
		// Camp: expedition tent, pennants, stool, kettle and a small fire.
		const tent = new T.Group();
		tent.position.set(3.8, 0, -1.8);
		this.scene.add(tent);
		const roof = this.mesh(new T.ConeGeometry(2.2, 2.6, 4), 0xd88c54, tent);
		roof.position.y = 1.3;
		roof.rotation.y = Math.PI / 4;
		roof.scale.z = 0.7;
		this.box(0, 0.65, 1.2, 0.9, 1.3, 0.06, 0x253e40, tent);
		this.cylinder(2.7, 0.7, 0, 0.07, 0.07, 1.4, 0xa87950, tent);
		this.ball(2.7, 1.2, 0, 0.35, 0xd5bc71, tent, [1, 1, 0.5]);
		this.box(-2.9, 0.4, 0.8, 0.8, 0.6, 0.6, 0xb19d6b, tent);
		this.label("CAMP", 6, 3.7, 0.8, "#e3d7b0");
		const fire = new T.Group();
		fire.position.set(10.5, 0, 1);
		this.scene.add(fire);
		for (let i = 0; i < 5; i++) {
			const log = this.cylinder(
				Math.cos(i) * 0.3,
				0.15,
				Math.sin(i) * 0.3,
				0.1,
				0.1,
				0.9,
				0x866344,
				fire,
			);
			log.rotation.z = 1.25;
		}
		this.flame = this.mesh(
			new T.ConeGeometry(0.3, 0.9, 5),
			0xffb85e,
			fire,
			false,
			0.8,
		);
		this.flame.position.y = 0.6;
		this.fireLight = new T.PointLight(0xffaa55, 5, 8, 2);
		this.fireLight.position.set(10.5, 1.5, 1.8);
		this.scene.add(this.fireLight);
		for (const [x, y, text] of [
			[16, 2.4, "MOSS GALLERY →"],
			[39, 3, "RIVER →"],
			[87, 3.2, "↑ BELFRY"],
			[112, 3.7, "↑ BALLOON WELL"],
		]) {
			this.cylinder(x, y / 2, 0, 0.065, 0.065, y, 0xb49a68);
			this.box(x, y, 0, 4, 0.7, 0.15, 0x2c4b4b);
			this.label(text, x, y - 0.02, 0.38, "#e8d5a5");
		}
		// Shrine lintel, sun dial and gold inlay.
		for (const x of [139, 157]) {
			this.box(x, 27.2, -2, 1.1, 6.4, 1.4, 0xc4a66f);
			this.box(x, 30.6, -2, 2.1, 0.45, 1.8, 0xddc18a);
			for (let y = 25; y < 30; y += 1.2)
				this.line(
					[
						[x - 0.5, y, -1.22],
						[x + 0.45, y, -1.22],
					],
					0x715f49,
				);
		}
		this.box(148, 31.2, -2, 20, 0.9, 2, 0xb99863);
		const sun = this.mesh(new T.TorusGeometry(1.6, 0.22, 4, 16), 0xecc965);
		sun.position.set(148, 28.8, -2.2);
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			this.line(
				[
					[148 + Math.cos(a) * 2, 28.8 + Math.sin(a) * 2, -2],
					[148 + Math.cos(a) * 2.6, 28.8 + Math.sin(a) * 2.6, -2],
				],
				0xd1ad62,
			);
		}
	}
	character(color = 0xe6bd78, companion = false) {
		const root = new T.Group(),
			rig = new T.Group();
		root.add(rig);
		const torso = this.ball(0, 0.12, 0, 0.4, color, rig, [0.85, 1.18, 0.7]);
		torso.name = "torso";
		this.box(0, -0.08, 0.02, 0.68, 0.13, 0.57, 0x6c5746, rig);
		this.box(0, 0.21, -0.29, 0.56, 0.7, 0.27, 0xa87748, rig);
		const head = this.ball(0, 0.67, 0.01, 0.34, 0xf4d5a0, rig, [0.93, 1, 0.9]);
		head.name = "head";
		this.cylinder(
			0,
			0.91,
			0,
			0.48,
			0.5,
			0.095,
			companion ? 0xe9ba64 : 0xb6aa64,
			rig,
			10,
		);
		this.cylinder(
			0,
			1.04,
			0,
			0.29,
			0.33,
			0.23,
			companion ? 0xe9ba64 : 0xc5b76f,
			rig,
			8,
		);
		this.cylinder(0, 0.97, 0, 0.32, 0.33, 0.08, 0x536d5d, rig, 8);
		this.ball(0.14, 0.7, 0.29, 0.043, palette.ink, rig, [1, 1.2, 0.6], 0);
		this.ball(-0.1, 0.7, 0.3, 0.043, palette.ink, rig, [1, 1.2, 0.6], 0);
		this.ball(0.07, 0.59, 0.32, 0.065, 0xd7a778, rig, [1, 0.5, 0.5], 0);
		this.box(0, 0.42, 0.15, 0.55, 0.13, 0.45, 0xd5684e, rig);
		const scarf = this.mesh(new T.ConeGeometry(0.16, 0.6, 3), 0xe77a55, rig);
		scarf.position.set(-0.32, 0.35, 0);
		scarf.rotation.z = -0.9;
		for (const [name, side] of [
			["armL", -1],
			["armR", 1],
			["legL", -1],
			["legR", 1],
		]) {
			const limb = new T.Group();
			limb.name = name;
			limb.position.set(
				side * (name.startsWith("arm") ? 0.4 : 0.19),
				name.startsWith("arm") ? 0.3 : -0.22,
				0,
			);
			rig.add(limb);
			if (name.startsWith("arm")) {
				this.cylinder(0, -0.21, 0, 0.105, 0.1, 0.42, color, limb);
				this.ball(0, -0.45, 0, 0.12, 0xf4d5a0, limb, [1, 1, 1], 0);
			} else {
				this.cylinder(0, -0.2, 0, 0.11, 0.12, 0.4, 0x53746a, limb);
				this.box(0.055, -0.43, 0.05, 0.28, 0.18, 0.34, 0x514b3b, limb);
			}
		}
		const mixer = new T.AnimationMixer(rig),
			clips = {};
		const times = [0, 0.2, 0.4, 0.6, 0.8];
		const clip = (name, amp, speed = 1, swim = false) => {
			const tracks = [];
			for (const [n, mul] of [
				["armL", 1],
				["armR", -1],
				["legL", -1],
				["legR", 1],
			])
				tracks.push(
					new T.NumberKeyframeTrack(
						`${n}.rotation[z]`,
						times.map((t) => t / speed),
						[0, amp * mul, 0, -amp * mul, 0],
					),
				);
			tracks.push(
				new T.NumberKeyframeTrack(
					"torso.position[y]",
					times.map((t) => t / speed),
					[0.12, 0.16, 0.12, 0.16, 0.12],
				),
			);
			if (swim)
				tracks.push(
					new T.NumberKeyframeTrack(
						"head.rotation[z]",
						times.map((t) => t / speed),
						[-0.1, 0.05, -0.1, 0.05, -0.1],
					),
				);
			clips[name] = mixer.clipAction(
				new T.AnimationClip(name, 0.8 / speed, tracks),
			);
		};
		clip("idle", 0.09, 0.45);
		clip("run", 0.8, 1.25);
		clip("swim", 1.1, 0.75, true);
		clip("climb", 1.3, 0.9);
		clip("float", 0.4, 0.55);
		clips.jump = mixer.clipAction(
			new T.AnimationClip("jump", 0.6, [
				new T.NumberKeyframeTrack(
					"armL.rotation[z]",
					[0, 0.3, 0.6],
					[-0.8, -1.2, -0.8],
				),
				new T.NumberKeyframeTrack(
					"armR.rotation[z]",
					[0, 0.3, 0.6],
					[0.8, 1.2, 0.8],
				),
				new T.NumberKeyframeTrack(
					"legL.rotation[z]",
					[0, 0.3, 0.6],
					[0.35, 0.65, 0.35],
				),
				new T.NumberKeyframeTrack(
					"legR.rotation[z]",
					[0, 0.3, 0.6],
					[-0.35, -0.65, -0.35],
				),
			]),
		);
		clips.idle.play();
		this.mixers.push(mixer);
		return {
			root,
			rig,
			mixer,
			clips,
			animation: "idle",
			setAnimation(name) {
				if (this.animation === name) return;
				this.clips[this.animation]?.fadeOut(0.12);
				this.clips[name].reset().fadeIn(0.12).play();
				this.animation = name;
			},
		};
	}
	creature(type) {
		const g = new T.Group();
		if (type === "bat") {
			this.ball(0, 0, 0, 0.3, 0xb67d91, g, [1, 1.25, 0.8]);
			this.ball(-0.16, 0.24, 0, 0.15, 0xcca193, g, [0.55, 1.7, 0.6], 0);
			this.ball(0.16, 0.24, 0, 0.15, 0xcca193, g, [0.55, 1.7, 0.6], 0);
			for (const side of [-1, 1]) {
				const wing = new T.Group();
				wing.name = side < 0 ? "wingL" : "wingR";
				g.add(wing);
				const sh = new T.Shape();
				sh.moveTo(side * 0.1, 0.1);
				sh.lineTo(side * 0.55, 0.5);
				sh.lineTo(side * 1.1, 0.2);
				sh.lineTo(side * 0.9, -0.18);
				sh.lineTo(side * 0.58, -0.04);
				sh.lineTo(side * 0.3, -0.3);
				sh.closePath();
				const _m = this.mesh(
					new T.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }),
					0xd68e9c,
					wing,
					false,
				);
				this.line(
					[
						[side * 0.2, 0.1, 0.08],
						[side * 0.55, 0.5, 0.08],
						[side * 1.1, 0.2, 0.08],
					],
					0x643c55,
					wing,
				);
			}
			for (const x of [-0.1, 0.1])
				this.ball(x, 0.1, 0.25, 0.04, 0xffe4a3, g, [1, 1, 1], 0);
			const mx = new T.AnimationMixer(g);
			const cl = new T.AnimationClip("wingbeat", 0.5, [
				new T.NumberKeyframeTrack(
					"wingL.rotation[y]",
					[0, 0.25, 0.5],
					[-0.7, 0.7, -0.7],
				),
				new T.NumberKeyframeTrack(
					"wingR.rotation[y]",
					[0, 0.25, 0.5],
					[0.7, -0.7, 0.7],
				),
			]);
			mx.clipAction(cl).play();
			this.mixers.push(mx);
		} else if (type === "eel") {
			for (let i = 0; i < 7; i++)
				this.ball(
					-i * 0.23,
					Math.sin(i) * 0.06,
					0,
					0.25 - i * 0.023,
					0xe39c62,
					g,
					[1.4, 0.9, 0.75],
					0,
				);
			this.ball(0.1, 0.08, 0.21, 0.055, palette.ink, g, [1, 1, 1], 0);
			const fin = this.mesh(new T.ConeGeometry(0.17, 0.5, 3), 0xe8c27c, g);
			fin.rotation.z = 1.5;
			fin.position.set(-1.5, 0, 0);
		} else {
			this.ball(0, 0, 0, 0.34, 0xe39661, g, [1.4, 0.65, 0.7]);
			for (const side of [-1, 1])
				for (let i = 0; i < 3; i++)
					this.line(
						[
							[i * 0.22 - 0.3, 0, 0],
							[i * 0.22 - 0.4, 0.14, side * 0.38],
							[i * 0.22 - 0.32, -0.3, side * 0.5],
						],
						0x704c45,
						g,
					);
			this.line(
				[
					[-0.35, 0, 0],
					[-0.6, 0.5, 0],
					[-0.45, 0.85, 0],
					[-0.17, 0.65, 0],
				],
				0x9b5d4a,
				g,
			);
			this.ball(-0.2, 0.63, 0, 0.12, 0xf2b665, g, [1, 1, 1], 0);
			for (const side of [-1, 1])
				this.ball(0.4, 0.04, side * 0.33, 0.17, 0xe6ad76, g, [1.4, 1, 1], 0);
		}
		this.scene.add(g);
		return g;
	}
	buildObjects() {
		for (const [x, y] of CRUMBS) {
			const g = new T.Group();
			g.position.set(x, y, 0.65);
			this.scene.add(g);
			const ring = this.mesh(
				new T.TorusGeometry(0.27, 0.09, 5, 8),
				palette.gold,
				g,
			);
			ring.rotation.y = 0.2;
			this.ball(0, 0, 0, 0.09, 0xffe7a3, g, [1, 1, 0.4], 0);
			this.crumbMeshes.push(g);
		}
		for (const h of HAZARDS) this.hazardMeshes.push(this.creature(h.type));
		for (const f of FLAGS) {
			const g = new T.Group();
			g.position.set(f.x, f.y, 0.2);
			this.scene.add(g);
			this.cylinder(0, 1.2, 0, 0.06, 0.06, 2.4, 0xd4c48f, g);
			const sh = new T.Shape();
			sh.moveTo(0, 2.4);
			sh.lineTo(1, 2.1);
			sh.lineTo(0, 1.8);
			sh.closePath();
			const pennant = this.mesh(
				new T.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false }),
				0xe9b96a,
				g,
				false,
			);
			const base = this.cylinder(0, 0.08, 0, 0.35, 0.45, 0.16, 0xe1d4a2, g);
			this.flags.push({ root: g, pennant, base });
		}
		const mox = this.character(0xb9b88a, true);
		mox.root.position.set(35.8, 0.76, 0.35);
		this.scene.add(mox.root);
		this.companions.push(mox);
		const doc = this.character(0xd9e4c6, true);
		doc.root.position.set(76.5, -8.25, 0.3);
		this.scene.add(doc.root);
		this.companions.push(doc);
		this.label("MOX", 35.8, 3.5, 0.62, "#eccb89");
		this.label("DR. CRUMB", 76.5, -5.2, 0.62, "#c1eee0");
		this.lunch = new T.Group();
		this.lunch.position.set(150, 25.1, 0.3);
		this.scene.add(this.lunch);
		this.box(0, 0.03, 0, 0.85, 0.65, 0.55, palette.gold, this.lunch);
		this.box(0, 0.4, 0, 0.9, 0.13, 0.6, 0xfce3a0, this.lunch);
		const handle = this.mesh(
			new T.TorusGeometry(0.18, 0.045, 4, 8, Math.PI),
			0x775d3d,
			this.lunch,
		);
		handle.position.y = 0.48;
		this.box(0, 0.1, 0.3, 0.15, 0.25, 0.06, 0x83613c, this.lunch);
		this.lunchRing = this.mesh(
			new T.TorusGeometry(0.9, 0.035, 3, 24),
			0xf8d883,
			this.lunch,
			false,
			0.4,
		);
		this.lunchRing.position.z = -0.4;
		this.balloon = new T.Group();
		this.scene.add(this.balloon);
		this.box(0, 0, 0, 1.35, 0.65, 0.95, 0xbb8a54, this.balloon);
		for (let i = -2; i <= 2; i++)
			this.line(
				[
					[i * 0.22, -0.25, 0.5],
					[i * 0.22, 0.27, 0.5],
				],
				0x7f633e,
				this.balloon,
			);
		for (const s of [-1, 1])
			this.line(
				[
					[s * 0.55, 0.3, 0],
					[s * 0.9, 2.7, 0],
				],
				0xd6c49a,
				this.balloon,
			);
		const _env = this.ball(
			0,
			3.4,
			0,
			1.7,
			0xf4bb66,
			this.balloon,
			[1, 1.2, 0.8],
			2,
		);
		for (const side of [-1, 1]) {
			const _stripe = this.ball(
				side * 0.58,
				3.4,
				0.92,
				1.2,
				0xec8058,
				this.balloon,
				[0.25, 1.65, 0.15],
				1,
			);
		}
		this.ball(0, 3.4, 1.32, 0.7, 0xf9de91, this.balloon, [0.22, 2.4, 0.15]);
		this.cylinder(0, 1.5, 0, 0.4, 0.2, 0.6, 0xb47d4e, this.balloon);
		this.label("RIDE THE UPDRAFT", 118, 6.5, 0.58, "#d9cc99");
		this.trolley = new T.Group();
		this.trolley.position.set(160, 25, 0.2);
		this.scene.add(this.trolley);
		this.box(0, 0, 0, 1.5, 0.6, 1, 0x75a5a0, this.trolley);
		this.box(0, 0.4, -0.45, 1.5, 0.7, 0.16, 0x8bbcb0, this.trolley);
		for (const side of [-1, 1]) {
			const wheel = this.mesh(
				new T.TorusGeometry(0.23, 0.08, 5, 10),
				0xd7bd7f,
				this.trolley,
			);
			wheel.position.set(side * 0.5, -0.38, 0.5);
		}
		this.line(
			[
				[160, 26.5, -0.3],
				[120, 31, -0.3],
				[45, 19, -0.3],
				[7, 3, -0.3],
			],
			0x8caa99,
		);
		this.label("PICNIC EXPRESS", 160, 27.5, 0.58, "#d6d6ad");
	}
	createPlayer(id, color) {
		const model = this.character(color);
		model.root.name = `explorer-${id}`;
		this.scene.add(model.root);
		const rb = this.R.RigidBodyDesc.dynamic()
			.setTranslation(6 + id * 0.8, 0.88, 0)
			.setCcdEnabled(true)
			.setLinearDamping(0);
		const body = this.physics.createRigidBody(rb);
		body.setEnabledTranslations(true, true, false, true);
		body.setEnabledRotations(false, false, false, true);
		const collider = this.physics.createCollider(
			this.R.ColliderDesc.capsule(0.42, 0.27)
				.setFriction(0)
				.setRestitution(0)
				.setCollisionGroups(0x00020001),
			body,
		);
		return {
			id,
			body,
			collider,
			model,
			x: 6 + id * 0.8,
			y: 0.88,
			vx: 0,
			vy: 0,
			facing: 1,
			grounded: false,
			water: false,
			climbing: false,
			balloon: false,
			invuln: 1,
			jumpWas: false,
			coyote: 0,
			jumpBuffer: 0,
			checkpoint: 0,
			mode: "idle",
			returning: 0,
			hits: 0,
		};
	}
	removePlayer(p) {
		this.scene.remove(p.model.root);
		this.physics.removeRigidBody(p.body);
		p.model.mixer.stopAllAction();
		p.model.mixer.uncacheRoot(p.model.rig);
		this.mixers = this.mixers.filter((m) => m !== p.model.mixer);
		const disposed = new Set();
		p.model.root.traverse((m) => {
			if (m.geometry && !disposed.has(m.geometry)) {
				m.geometry.dispose();
				disposed.add(m.geometry);
			}
		});
	}
	updateVisuals(dt, time, state, players) {
		for (const mixer of this.mixers) mixer.update(dt);
		for (let i = 0; i < CRUMBS.length; i++) {
			const g = this.crumbMeshes[i];
			g.visible = !state.crumbs[i];
			g.position.y = CRUMBS[i][1] + Math.sin(time * 2 + i) * 0.14;
			g.rotation.y = time * 1.4 + i;
		}
		for (let i = 0; i < this.hazardMeshes.length; i++) {
			const pos = state.hazards[i],
				g = this.hazardMeshes[i];
			if (!pos) continue;
			g.position.set(pos.x, pos.y, 0.25);
			g.rotation.y = pos.facing < 0 ? Math.PI : 0;
			if (HAZARDS[i].type === "scorpion")
				g.rotation.z = Math.sin(time * 12 + i) * 0.035;
			if (HAZARDS[i].type === "eel")
				g.rotation.z = Math.cos(time * 2 + i) * 0.12;
		}
		for (let i = 0; i < this.companions.length; i++) {
			const c = this.companions[i];
			if (state.found[i]) {
				c.root.position.set(2 + i * 1.1, 0.78, 0.7);
				c.setAnimation("idle");
			}
			c.rig.rotation.z = Math.sin(time * 1.8 + i) * 0.025;
		}
		this.lunch.visible = !state.found[2];
		this.lunch.position.y = 25.1 + Math.sin(time * 2) * 0.12;
		this.lunch.rotation.y = Math.sin(time) * 0.16;
		this.lunchRing.rotation.z = time * 0.25;
		for (let i = 0; i < this.flags.length; i++)
			this.flags[i].pennant.rotation.y = Math.sin(time * 3 + i) * 0.2;
		this.balloon.position.set(state.balloon.x, state.balloon.y, 0);
		this.balloon.rotation.z = Math.sin(time * 1.5) * 0.025;
		if (state.transit !== null) {
			const t = Math.min(1, state.transit),
				e = t * t * (3 - 2 * t);
			this.trolley.position.set(
				160 - 153 * e,
				25 - 24 * e + Math.sin(t * Math.PI) * 13,
				0.2,
			);
		} else this.trolley.position.set(160, 25, 0.2);
		this.trolley.scale.x = players.length > 2 ? 1.4 : 1;
		const arr = this.waterline.geometry.attributes.position.array;
		for (let i = 0; i < arr.length; i += 3)
			arr[i + 1] = 0.08 + Math.sin(arr[i] * 1.5 + time * 2) * 0.035;
		this.waterline.geometry.attributes.position.needsUpdate = true;
		for (const s of this.sparkles) {
			s.mesh.position.y = s.water
				? -8.7 + ((time * 0.4 + s.phase * 1.3) % 8.5)
				: s.y + Math.sin(time * 0.4 + s.phase) * 0.4;
			s.mesh.position.x = s.x + Math.sin(time * 0.3 + s.phase) * 0.3;
		}
		for (const p of this.plants)
			p.rotation.z = Math.sin(time * 1.6 + p.position.x) * 0.035;
		this.flame.scale.set(
			1 + Math.sin(time * 18) * 0.13,
			1 + Math.cos(time * 13) * 0.17,
			1,
		);
		this.fireLight.intensity = 5 + Math.sin(time * 15);
		for (const p of players) {
			const target = new T.Vector3(p.x, p.y, 0.35 + (p.id % 2) * 0.08);
			if (p.model.root.position.distanceTo(target) > 6)
				p.model.root.position.copy(target);
			else p.model.root.position.lerp(target, Math.min(1, dt * 18));
			p.model.rig.rotation.y = p.facing < 0 ? -0.5 : 0.25;
			p.model.rig.rotation.z = p.water
				? -p.facing * 0.48
				: p.balloon
					? Math.sin(time * 2) * 0.06
					: 0;
			p.model.setAnimation(
				p.mode === "swim"
					? "swim"
					: p.mode === "climb"
						? "climb"
						: p.mode === "balloon"
							? "float"
							: p.mode === "jump"
								? "jump"
								: Math.abs(p.vx) > 0.5 && p.grounded
									? "run"
									: "idle",
			);
			p.model.root.visible = p.invuln < 0.2 || Math.floor(time * 13) % 3 !== 0;
		}
	}
}
