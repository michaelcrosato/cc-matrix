const REGIONS = [
	{
		x: 0,
		name: "THE GREEN DOOR",
		subtitle: "Every great idea starts with a bad map.",
		color: 0x689a55,
	},
	{
		x: 40,
		name: "SINKING FEELING",
		subtitle: "The ground has other plans.",
		color: 0x619b69,
	},
	{
		x: 82,
		name: "EMBER STEPS",
		subtitle: "Hot feet. Cool head.",
		color: 0xb79952,
	},
	{
		x: 126,
		name: "THE LOW ROAD",
		subtitle: "A shortcut with a few extra legs.",
		color: 0x508f87,
	},
	{
		x: 172,
		name: "CROCODILE SMILES",
		subtitle: "Wait for the smiles to go away.",
		color: 0x75a061,
	},
	{
		x: 212,
		name: "THE LAST LEAP",
		subtitle: "Six treasures. One very lucky hat.",
		color: 0xc2a563,
	},
];
const TREASURES = [
	{ x: 13, y: 0.95, name: "THE SUN COIN", type: "coin", color: 0xffcd59 },
	{ x: 38, y: 0.95, name: "THE SILVER CHALICE", type: "cup", color: 0xdce6ce },
	{ x: 65, y: -6.05, name: "THE MOSS EMERALD", type: "gem", color: 0x8bd97a },
	{ x: 120, y: 0.95, name: "THE FIRE OPAL", type: "gem", color: 0xff9163 },
	{ x: 149, y: -6.05, name: "THE MOON IDOL", type: "idol", color: 0x7dcfd0 },
	{ x: 219, y: 0.95, name: "THE GOLDEN GRIN", type: "idol", color: 0xffd16a },
];
const PITS = [
	{ a: 22, b: 32, type: "water" },
	{ a: 57, b: 68, type: "tar" },
	{ a: 101, b: 112, type: "chasm" },
	{ a: 146, b: 158, type: "chasm" },
	{ a: 196, b: 206, type: "water" },
];
const LADDERS = [48, 90, 132, 176];
const CAMPS = [1, 40, 84, 126, 178, 213];
class JungleWorld {
	constructor(scene, physics) {
		this.scene = scene;
		this.physics = physics;
		this.root = new THREE.Group();
		scene.add(this.root);
		this.vines = [];
		this.crocs = [];
		this.logs = [];
		this.snakes = [];
		this.scorpions = [];
		this.fires = [];
		this.treasures = [];
		this.flags = [];
		this.waves = [];
		this.bugs = [];
		this.mixers = [];
		this.decor = [];
		this.colliders = [];
		this.particles = [];
		this.buildBackdrop();
		this.buildTerrain();
		this.buildNature();
		this.buildRuins();
		this.buildEncounters();
		this.buildGate();
	}
	fixed(x, y, w, h, z = 0, d = 1.5) {
		const c = this.physics.createCollider(
			RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
				.setTranslation(x, y, z)
				.setFriction(0.05),
		);
		this.colliders.push({ c, x, y, w, h, d });
		return c;
	}
	buildBackdrop() {
		const c = document.createElement("canvas");
		c.width = 16;
		c.height = 512;
		const ctx = c.getContext("2d"),
			g = ctx.createLinearGradient(0, 0, 0, 512);
		g.addColorStop(0, "#7fc2b4");
		g.addColorStop(0.4, "#dce5b1");
		g.addColorStop(0.65, "#f5d896");
		g.addColorStop(1, "#3e7d6a");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 16, 512);
		const tex = new THREE.CanvasTexture(c);
		tex.colorSpace = THREE.SRGBColorSpace;
		shape(
			this.root,
			"plane",
			new THREE.MeshBasicMaterial({ map: tex }),
			115,
			10,
			-65,
			500,
			95,
			1,
			false,
		);
		this.sun = shape(
			this.root,
			"disc",
			0xffe3a1,
			30,
			12,
			-45,
			4.4,
			4.4,
			1,
			false,
		);
		shape(
			this.root,
			"disc",
			new THREE.MeshBasicMaterial({
				color: 0xffe8aa,
				transparent: true,
				opacity: 0.22,
				depthWrite: false,
			}),
			30,
			12,
			-44.9,
			6,
			6,
			1,
			false,
		);
		for (let layer = 0; layer < 3; layer++) {
			const s = new THREE.Shape();
			s.moveTo(-100, -25);
			s.lineTo(-100, 0);
			for (let x = -100; x < 390; x += rnd(8, 15))
				s.lineTo(x, rnd(2, 7) + layer * 1.2);
			s.lineTo(400, -25);
			s.closePath();
			shape(
				this.root,
				new THREE.ShapeGeometry(s),
				[0x8cb69b, 0x5f9d88, 0x3e826f][layer],
				0,
				0,
				-38 + layer * 8,
				1,
				1,
				1,
				false,
			);
		}
		for (let i = 0; i < 26; i++) {
			const x = i * 13 - 45,
				z = -17 - rnd(0, 8),
				h = rnd(13, 22);
			shape(
				this.root,
				"cylinder",
				0x397762,
				x,
				h / 2 - 2,
				z,
				rnd(0.35, 0.8),
				h,
				0.5,
				false,
			);
			for (let j = 0; j < 3; j++)
				shape(
					this.root,
					"rough",
					0x45866a,
					x + rnd(-3, 3),
					h - 2 + j * 0.5,
					z,
					rnd(3, 5),
					1.5,
					rnd(1.5, 3),
					false,
				);
			if (i % 2 === 0)
				curve(
					this.root,
					[
						[x, h, z],
						[x + 2, 6, z],
						[x + 1, 2, z],
					],
					0.035,
					0x568b64,
				);
		}
		// An uncharted temple silhouette behind the last stretch.
		for (let i = 0; i < 5; i++)
			shape(
				this.root,
				"box",
				0x86a58a,
				228,
				2 + i * 0.75,
				-28,
				14 - i * 2.2,
				1.1,
				5,
				false,
			);
		shape(this.root, "box", 0x547e71, 228, 6.4, -27.9, 1.3, 2.7, 1, false);
		for (let i = 0; i < 14; i++) {
			const b = new THREE.Group();
			b.position.set(rnd(-8, 245), rnd(7, 14), -12);
			this.root.add(b);
			const wing = shape(b, "cone", 0x244f44, 0, 0, 0, 0.3, 0.17, 0.1, false);
			wing.rotation.z = Math.PI / 2;
			shape(b, "cone", 0x244f44, 0.4, 0, 0, 0.3, 0.17, 0.1, false).rotation.z =
				-Math.PI / 2;
			this.bugs.push({
				m: b,
				x: b.position.x,
				y: b.position.y,
				bird: true,
				phase: rnd(0, TAU),
			});
		}
	}
	buildTerrain() {
		const holes = PITS.map((p) => [p.a, p.b])
			.concat(LADDERS.map((x) => [x - 1, x + 1]))
			.sort((a, b) => a[0] - b[0]);
		let start = -8;
		for (const [a, b] of holes) {
			if (a > start) this.land(start, a);
			start = b;
		}
		this.land(start, 246);
		this.fixed(-7, 3, 1, 8);
		this.fixed(244, 3, 1, 8);
		for (const [a, b] of [
			[43, 95],
			[127, 181],
		]) {
			this.fixed((a + b) / 2, -7.6, b - a, 1.2);
			shape(
				this.root,
				"box",
				0x183f3e,
				(a + b) / 2,
				-5.8,
				-2.2,
				b - a,
				5,
				0.7,
				false,
			);
			shape(this.root, "box", 0x456155, (a + b) / 2, -7.6, 1, b - a, 1.2, 4);
			for (let x = a; x < b; x += 1.7) {
				shape(
					this.root,
					"cone",
					0x3b6559,
					x,
					-4.3,
					-1.2,
					rnd(0.2, 0.6),
					rnd(0.5, 1.4),
					0.7,
				).rotation.z = Math.PI;
				shape(
					this.root,
					"rough",
					0x56745d,
					x,
					-7.05,
					0.9,
					rnd(0.3, 0.6),
					0.3,
					0.4,
				);
				if (Math.round(x) % 5 === 0) {
					shape(
						this.root,
						"rough",
						0x82c5a6,
						x,
						-5.7,
						-1.65,
						0.12,
						0.24,
						0.1,
						false,
					);
				}
			}
			for (let x = a + 2; x < b; x += 7) {
				rod(this.root, [x, -6.7, 0.2], [x, -5.5, 0.2], 0.06, 0x73563a);
				const f = shape(
					this.root,
					"rough",
					0xffbd56,
					x,
					-5.3,
					0.2,
					0.18,
					0.35,
					0.18,
					false,
				);
				this.fires.push({
					x,
					y: -5.5,
					mesh: f,
					decor: true,
					phase: rnd(0, TAU),
				});
				shape(
					this.root,
					"disc",
					new THREE.MeshBasicMaterial({
						color: 0xd6a861,
						transparent: true,
						opacity: 0.07,
						depthWrite: false,
					}),
					x,
					-5.3,
					-1.5,
					1.3,
					1.3,
					1,
					false,
				);
			}
		}
		for (const x of LADDERS) {
			const y = -3.5;
			for (const dx of [-0.53, 0.53])
				rod(
					this.root,
					[x + dx, -7, 0.35],
					[x + dx, 0.8, 0.35],
					0.065,
					0xc89c59,
				);
			for (let yy = -6.8; yy < 0.9; yy += 0.48)
				rod(
					this.root,
					[x - 0.58, yy, 0.4],
					[x + 0.58, yy, 0.4],
					0.055,
					0xd9b76e,
				);
			shape(this.root, "box", 0x374f3a, x, -0.15, -1.3, 1.8, 0.3, 0.4);
		}
		for (const p of PITS) {
			if (p.type === "water" || p.type === "tar") {
				const mat = new THREE.MeshBasicMaterial({
					color: p.type === "water" ? 0x397f73 : 0x343e30,
					transparent: true,
					opacity: 0.92,
				});
				const water = shape(
					this.root,
					"box",
					mat,
					(p.a + p.b) / 2,
					-0.55,
					0,
					p.b - p.a,
					0.3,
					4.4,
					false,
				);
				this.waves.push(water);
				shape(
					this.root,
					"box",
					p.type === "water" ? 0x215e51 : 0x222f2b,
					(p.a + p.b) / 2,
					-1.4,
					-0.2,
					p.b - p.a,
					1.5,
					4,
					false,
				);
				for (let i = 0; i < 12; i++)
					shape(
						this.root,
						"box",
						p.type === "water" ? 0x78b69b : 0x738056,
						rnd(p.a, p.b),
						-0.37,
						rnd(-1.6, 1.8),
						rnd(0.1, 0.6),
						0.025,
						0.04,
						false,
					);
			}
			if (p.type === "tar") {
				p.cover = this.fixed((p.a + p.b) / 2, -0.2, p.b - p.a, 0.4);
				p.coverMesh = shape(
					this.root,
					"box",
					0x77894c,
					(p.a + p.b) / 2,
					-0.16,
					0,
					p.b - p.a,
					0.3,
					2.6,
				);
			}
			const vine = {
				x: (p.a + p.b) / 2,
				anchor: 7.4,
				length: 6,
				phase: Math.PI / 2,
				theta: 0,
				end: new THREE.Vector3(),
				pump: 0,
			};
			vine.pivot = new THREE.Group();
			vine.pivot.position.set(vine.x, vine.anchor, 0.15);
			this.root.add(vine.pivot);
			shape(
				vine.pivot,
				"cylinder",
				0x6c7f40,
				0,
				-vine.length / 2,
				0,
				0.055,
				vine.length,
				0.055,
			);
			for (let k = 0; k < 4; k++) {
				const leaf = shape(
					vine.pivot,
					"rough",
					k % 2 ? 0x76a653 : 0x57924a,
					k % 2 ? 0.16 : -0.16,
					-1.3 - k * 1.1,
					0,
					0.28,
					0.12,
					0.08,
					false,
				);
				leaf.rotation.z = k % 2 ? 0.5 : -0.5;
			}
			shape(vine.pivot, "ball", 0xc5b36f, 0, -vine.length, 0, 0.12, 0.12, 0.12);
			this.vines.push(vine);
			curve(
				this.root,
				[
					[p.a - 3, 7.8, -1],
					[vine.x, 7.4, -1],
					[p.b + 3, 8.5, -1],
				],
				0.2,
				0x34553c,
				true,
			);
		}
		for (const x of [103, 106.5, 110]) {
			this.fixed(x, -0.33, 1.7, 0.66);
			shape(this.root, "rough", 0x8a9271, x, -0.55, 0, 1.1, 0.7, 1.5);
			shape(this.root, "box", 0xadac7c, x, -0.07, 0, 1.65, 0.2, 1.7);
		}
		// First gap gives a safe choice of the vine or the crocodiles' backs.
		for (const x of [24, 27, 30, 198, 201, 204]) this.makeCroc(x);
		for (let i = 0; i < CAMPS.length; i++) {
			const x = CAMPS[i],
				g = new THREE.Group();
			g.position.set(x, 0, -0.8);
			this.root.add(g);
			rod(g, [0, 0, 0], [0, 3, 0], 0.055, 0xd4ba77);
			const flag = shape(
				g,
				"box",
				i === 0 ? PALETTE.gold : 0x85a46c,
				0.47,
				2.5,
				0,
				0.9,
				0.55,
				0.055,
			);
			this.flags.push(flag);
			shape(g, "box", 0x917443, 0, 0.15, 0, 0.7, 0.3, 0.8);
			if (i > 0)
				textBoard(this.root, "CAMP " + (i + 1), x, 0.85, -0.3, 1.8, 0.6);
		}
		textBoard(this.root, "EAST?  →", 5, 1.3, 0.35, 2.1, 0.7);
		textBoard(
			this.root,
			"WAIT FOR THE SMILE|TO GO AWAY",
			20,
			2,
			-0.1,
			3.6,
			1.15,
		);
		textBoard(this.root, "↓  THE LOW ROAD", 45, 1.35, 0.6, 3.2, 0.8);
		textBoard(this.root, "IT COMES & GOES", 55, 1.5, 0.5, 2.8, 0.75);
		textBoard(this.root, "↑  BACK TO DAYLIGHT", 87, -5.15, 0.5, 3, 0.8);
		textBoard(this.root, "↓  MOON IDOL", 129, 1.5, 0.4, 2.7, 0.8);
		textBoard(this.root, "↓  CLIMB UP", 173, -5.2, 0.5, 2.8, 0.75);
	}
	land(a, b) {
		const x = (a + b) / 2,
			w = b - a;
		this.fixed(x, -0.65, w, 1.3);
		const reg = REGIONS.reduce((r, v) => (x >= v.x ? v : r), REGIONS[0]);
		shape(this.root, "box", 0x6b5738, x, -2.05, -0.1, w, 4, 4);
		shape(this.root, "box", reg.color, x, -0.11, -0.05, w, 0.23, 4.2);
		shape(this.root, "box", 0x9baa62, x, -0.01, 2.07, w, 0.13, 0.12, false);
		for (let xx = a + 0.5; xx < b; xx += rnd(1.7, 3.8)) {
			shape(
				this.root,
				"rough",
				rand() > 0.5 ? 0x8d744b : 0x4c5034,
				xx,
				-rnd(0.8, 3.8),
				2.025,
				rnd(0.2, 0.65),
				rnd(0.12, 0.35),
				0.035,
				false,
			);
			if (rand() < 0.65)
				curve(
					this.root,
					[
						[xx, -0.2, 2.04],
						[xx + 0.2, -1.1, 2.04],
						[xx - 0.1, -1.9, 2.04],
					],
					0.025,
					0x384c30,
				);
		}
	}
	palm(x, z, h = 9) {
		const g = new THREE.Group();
		g.position.set(x, 0, z);
		this.root.add(g);
		const bend = rnd(-1.8, 1.8);
		curve(
			g,
			[
				[0, 0, 0],
				[bend * 0.3, h * 0.45, 0],
				[bend, h, 0],
			],
			0.35,
			0x486443,
			true,
		);
		for (let j = 0; j < 6; j++) {
			const angle = (j * TAU) / 6,
				r = 3.7;
			const pts = [
				[bend, h, 0],
				[bend + Math.cos(angle) * r * 0.6, h + 0.55, Math.sin(angle) * 1.2],
				[bend + Math.cos(angle) * r, h - 0.9, Math.sin(angle) * 2],
			];
			curve(g, pts, 0.2, j % 2 ? 0x398257 : 0x559954);
			for (let k = 1; k < 5; k++) {
				const t = k / 5,
					xx = lerp(bend, pts[2][0], t),
					yy = h + Math.sin(t * Math.PI) * 0.5 - t * 0.9,
					zz = pts[2][2] * t;
				const m = shape(
					g,
					"rough",
					j % 2 ? 0x3e8653 : 0x70a458,
					xx,
					yy,
					zz,
					0.75 * (1 - t * 0.5),
					0.1,
					0.4,
					false,
				);
				m.rotation.z = -Math.cos(angle) * 0.4;
			}
		}
		for (let i = 0; i < 3; i++)
			shape(
				g,
				"ball",
				0x8f784a,
				bend + rnd(-0.3, 0.3),
				h - 0.4,
				rnd(-0.3, 0.3),
				0.22,
				0.24,
				0.22,
			);
	}
	fern(x, y, z, size = 1) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		g.scale.setScalar(size);
		this.root.add(g);
		for (let side = -1; side <= 1; side += 2)
			for (let i = 0; i < 4; i++) {
				const angle = 0.25 + i * 0.38;
				const f = shape(
					g,
					"rough",
					i % 2 ? 0x2d7452 : 0x61954c,
					side * Math.sin(angle) * 0.7,
					Math.cos(angle) * 0.7,
					0,
					0.22,
					0.9,
					0.12,
					false,
				);
				f.rotation.z = -side * angle;
			}
	}
	buildNature() {
		for (let x = -6; x < 247; x += rnd(7, 11))
			this.palm(x, rnd(-6, -3), rnd(8.3, 12.5));
		for (let x = -5; x < 246; x += rnd(2.5, 5)) {
			if (
				PITS.some((p) => x > p.a && x < p.b) ||
				LADDERS.some((l) => Math.abs(l - x) < 1.2)
			)
				continue;
			this.fern(x, 0, rnd(-1.3, -0.9), rnd(0.55, 1.1));
			if (rand() < 0.4) {
				shape(
					this.root,
					"rough",
					0x829467,
					x,
					0.12,
					1.5,
					rnd(0.2, 0.5),
					0.3,
					0.4,
				);
			}
			if (rand() < 0.2) {
				for (let i = 0; i < 3; i++) {
					const xx = x + i * 0.22;
					rod(this.root, [xx, 0, 1.5], [xx, 0.6, 1.5], 0.025, 0x709456, false);
					shape(
						this.root,
						"ball",
						0xf3b56c,
						xx,
						0.65,
						1.5,
						0.12,
						0.15,
						0.09,
						false,
					);
				}
			}
		}
		// Foreground leaves frame the diorama without covering the running lane.
		for (let x = -8; x < 248; x += rnd(7, 12)) {
			this.fern(x, -1.5, 4.2, rnd(0.7, 1.15));
			if (rand() < 0.35) {
				const m = shape(
					this.root,
					"rough",
					0x1a5848,
					x,
					8.5,
					3.8,
					2.7,
					1.2,
					0.25,
					false,
				);
				m.rotation.z = rnd(-0.5, 0.5);
			}
		}
		for (let i = 0; i < 55; i++) {
			const m = shape(
				this.root,
				"ball",
				i % 4 === 0 ? 0xffe19a : 0xd3e6a0,
				rnd(-5, 242),
				rnd(0.6, 6),
				rnd(-1, 2),
				0.035,
				0.035,
				0.035,
				false,
			);
			this.bugs.push({
				m,
				x: m.position.x,
				y: m.position.y,
				phase: rnd(0, TAU),
			});
		}
		for (const x of [34, 78, 115, 186, 224]) {
			for (let i = 0; i < 3; i++) {
				const m = shape(
					this.root,
					"cone",
					0xffa95a,
					x + rnd(-1, 1),
					rnd(1, 3),
					-1,
					0.11,
					0.23,
					0.05,
					false,
				);
				this.bugs.push({
					m,
					x: m.position.x,
					y: m.position.y,
					phase: rnd(0, TAU),
				});
			}
		}
	}

	buildRuins() {
		for (const [a, b] of [
			[43, 95],
			[127, 181],
		]) {
			shape(
				this.root,
				"box",
				0x213f36,
				(a + b) / 2,
				-15,
				-0.1,
				b - a,
				14,
				4,
				false,
			);
			for (let x = a + 1; x < b; x += 2.7) {
				shape(
					this.root,
					"rough",
					x % 2 > 1 ? 0x2c4b3d : 0x355448,
					x,
					-9.4 - rnd(0, 1.6),
					2.05,
					rnd(0.4, 0.9),
					rnd(0.2, 0.5),
					0.04,
					false,
				);
				if (rand() > 0.5)
					curve(
						this.root,
						[
							[x, -8.3, 2.08],
							[x + 0.5, -9.2, 2.08],
							[x - 0.3, -10.5, 2.08],
						],
						0.025,
						0x5c7054,
					);
			}
			for (let x = a + 5; x < b - 2; x += 12) {
				const ring = shape(
					this.root,
					"torus",
					0x557c68,
					x,
					-5.8,
					-1.73,
					0.52,
					0.52,
					0.12,
					false,
				);
				for (let k = 0; k < 3; k++)
					shape(
						this.root,
						"box",
						0x63816a,
						x - 0.27 + k * 0.27,
						-6.05,
						-1.7,
						0.08,
						0.4,
						0.05,
						false,
					);
			}
		}
		for (const x of [85, 93, 114, 123, 184, 211]) {
			const g = new THREE.Group();
			g.position.set(x, 0, -2);
			this.root.add(g);
			const h = x < 126 ? rnd(3.4, 5) : rnd(1.7, 3);
			shape(g, "box", 0x647d5a, 0, 0.2, 0, 1.6, 0.4, 1.3);
			shape(g, "box", 0x8da077, 0, h / 2 + 0.35, 0, 0.8, h, 1);
			shape(g, "box", 0xa3ae7c, 0, h + 0.3, 0, 1.3, 0.35, 1.3);
			for (let yy = 0.8; yy < h; yy += 0.65)
				shape(g, "box", 0x536c50, 0, yy, 0.52, 0.82, 0.035, 0.025, false);
			shape(g, "rough", 0x517c4d, 0, h + 0.55, 0, 0.8, 0.2, 0.65, false);
			curve(
				g,
				[
					[-0.3, h + 0.45, 0.58],
					[0.15, h - 1, 0.58],
					[-0.3, 1, 0.58],
				],
				0.035,
				0x3d7948,
			);
			for (const dx of [-0.19, 0.19])
				shape(g, "box", 0x344e3c, dx, h - 0.4, 0.55, 0.12, 0.18, 0.02, false);
			shape(g, "box", 0x465e44, 0, h - 0.7, 0.55, 0.28, 0.05, 0.02, false);
			shape(this.root, "rough", 0x8a9870, x + 1, 0.2, -1.1, 0.42, 0.36, 0.5);
		}
	}
	makeCroc(x) {
		const g = new THREE.Group();
		g.position.set(x, -0.07, 0);
		this.root.add(g);
		shape(g, "rough", 0x518851, -0.15, -0.15, 0, 1.08, 0.3, 0.56);
		shape(g, "cone", 0x42774a, -1.2, -0.15, 0, 0.34, 1.2, 0.35).rotation.z =
			Math.PI / 2;
		const jaw = new THREE.Group();
		jaw.position.set(0.2, 0.05, 0);
		g.add(jaw);
		shape(jaw, "box", 0x78a15d, 0.55, 0.1, 0, 1.1, 0.2, 0.58);
		shape(g, "box", 0xc5cb8a, 0.75, -0.19, 0.05, 1.2, 0.1, 0.6);
		for (let i = 0; i < 5; i++) {
			shape(
				jaw,
				"cone",
				0xffe8b8,
				0.15 + i * 0.21,
				-0.075,
				0.27,
				0.05,
				0.13,
				0.05,
				false,
			).rotation.z = Math.PI;
			shape(
				g,
				"cone",
				0xffe8b8,
				0.32 + i * 0.21,
				-0.08,
				0.29,
				0.05,
				0.13,
				0.05,
				false,
			);
		}
		shape(jaw, "ball", 0xd1bc6c, 0.2, 0.3, 0.3, 0.12, 0.13, 0.09);
		shape(jaw, "ball", 0x122f28, 0.23, 0.33, 0.37, 0.035, 0.05, 0.02, false);
		for (let i = 0; i < 5; i++)
			shape(g, "cone", 0x315e3b, -0.9 + i * 0.3, 0.12, -0.12, 0.12, 0.23, 0.15);
		const c = this.fixed(x, -0.19, 1.9, 0.4);
		this.crocs.push({ x, g, jaw, c, phase: x * 0.37, open: false });
	}
	makeSnake(x, y = 0) {
		const g = new THREE.Group();
		g.position.set(x, y, 0.2);
		this.root.add(g);
		const co = shape(g, "torus", 0xa8ac55, 0, 0.3, 0, 0.36, 0.25, 0.32);
		co.rotation.x = Math.PI / 2;
		curve(
			g,
			[
				[0.15, 0.2, 0],
				[0.3, 0.6, 0],
				[0.15, 1, 0],
			],
			0.11,
			0xb0bb5b,
			true,
		);
		const head = shape(g, "ball", 0xc5c46b, 0.16, 1.02, 0, 0.24, 0.16, 0.19);
		shape(g, "ball", 0x1b3d2c, 0.3, 1.05, 0.13, 0.03, 0.04, 0.025, false);
		shape(g, "box", 0xd15f4a, 0.4, 0.96, 0.01, 0.2, 0.025, 0.04, false);
		this.snakes.push({ x, y, g, head, phase: x });
	}
	makeScorpion(x, y = -7) {
		const g = new THREE.Group();
		g.position.set(x, y, 0.2);
		this.root.add(g);
		shape(g, "rough", 0xae8c62, 0, 0.27, 0, 0.42, 0.22, 0.33);
		for (let i = 0; i < 3; i++)
			for (const side of [-1, 1])
				rod(
					g,
					[-0.25 + i * 0.23, 0.24, side * 0.17],
					[-0.4 + i * 0.28, 0.05, side * 0.6],
					0.035,
					0xc9a268,
				);
		curve(
			g,
			[
				[-0.35, 0.23, 0],
				[-0.7, 0.6, 0],
				[-0.65, 1, 0],
				[-0.35, 0.95, 0],
			],
			0.08,
			0xb69364,
			true,
		);
		shape(g, "cone", 0x6a5947, -0.33, 0.9, 0, 0.1, 0.25, 0.11).rotation.z = 0.7;
		for (const z of [-0.3, 0.3]) {
			rod(g, [0.3, 0.25, z], [0.65, 0.35, z * 1.8], 0.07, 0xd8ae6b);
			shape(g, "rough", 0xd8ae6b, 0.73, 0.38, z * 1.8, 0.2, 0.14, 0.13);
		}
		this.scorpions.push({ x, y, g, base: x, phase: rnd(0, TAU) });
	}
	buildEncounters() {
		for (const x of [17, 43, 80, 124, 183, 225]) this.makeSnake(x);
		for (const x of [55, 73, 139, 160, 168]) this.makeScorpion(x);
		for (const x of [8, 76, 98, 191]) {
			const m = new THREE.Group();
			m.position.set(x, 0.48, 0.05);
			this.root.add(m);
			const log = shape(m, "cylinder", 0x886d3e, 0, 0, 0, 0.44, 1.4, 0.44);
			log.rotation.x = Math.PI / 2;
			shape(m, "disc", 0xd0a266, 0, 0, 0.72, 0.38, 0.38, 1);
			shape(m, "torus", 0x8c6e41, 0, 0, 0.735, 0.22, 0.22, 0.3, false);
			for (let i = 0; i < 5; i++)
				shape(
					m,
					"box",
					0x5f5f34,
					Math.cos((i * TAU) / 5) * 0.4,
					Math.sin((i * TAU) / 5) * 0.4,
					0,
					0.12,
					0.14,
					1.2,
					false,
				);
			const body = this.physics.createRigidBody(
				RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
					x,
					0.44,
					0,
				),
			);
			const collider = this.physics.createCollider(
				RAPIER.ColliderDesc.ball(0.43),
				body,
			);
			this.logs.push({ base: x, x, m, body, collider, phase: x * 0.4 });
		}
		for (const x of [95, 116, 161, 210]) {
			shape(this.root, "rough", 0x6a6850, x, 0.1, 0, 0.65, 0.25, 0.55);
			const flame = new THREE.Group();
			flame.position.set(x, 0.2, 0);
			this.root.add(flame);
			shape(flame, "cone", 0xffa74d, 0, 0.65, 0, 0.35, 1.4, 0.3, false);
			shape(flame, "cone", 0xffd36a, 0.07, 0.4, 0.15, 0.18, 0.9, 0.18, false);
			this.fires.push({
				x,
				y: 0,
				mesh: flame,
				phase: x * 0.3,
				decor: false,
				on: false,
			});
		}
		TREASURES.forEach((t, i) => {
			const g = new THREE.Group();
			g.position.set(t.x, t.y, 0);
			this.root.add(g);
			const base = shape(
				this.root,
				"box",
				t.y < 0 ? 0x668e7b : 0x92a06a,
				t.x,
				t.y - 0.87,
				0,
				1.4,
				0.22,
				1.2,
			);
			shape(this.root, "box", 0x556f4d, t.x, t.y - 0.62, -0.1, 0.8, 0.4, 0.8);
			if (t.type === "coin") {
				const coin = shape(g, "cylinder", t.color, 0, 0.2, 0, 0.48, 0.15, 0.48);
				coin.rotation.x = Math.PI / 2;
				shape(g, "torus", 0xffe4a1, 0, 0.2, 0.11, 0.31, 0.31, 0.4, false);
				shape(g, "rough", 0xf0ab37, 0, 0.2, 0.13, 0.18, 0.21, 0.08);
			} else if (t.type === "cup") {
				shape(g, "cone", t.color, 0, 0.3, 0, 0.38, 0.6, 0.28).rotation.z =
					Math.PI;
				rod(g, [0, -0.05, 0], [0, -0.3, 0], 0.07, t.color);
				shape(g, "cylinder", t.color, 0, -0.35, 0, 0.27, 0.1, 0.22);
				shape(g, "torus", t.color, 0.36, 0.22, 0, 0.23, 0.25, 0.2);
			} else if (t.type === "gem") {
				shape(g, "rough", t.color, 0, 0.1, 0, 0.44, 0.65, 0.37);
				shape(g, "rough", 0xf7f0c2, -0.12, 0.35, 0.23, 0.1, 0.15, 0.035, false);
			} else {
				shape(g, "box", t.color, 0, 0.05, 0, 0.55, 0.75, 0.35);
				shape(g, "rough", t.color, 0, 0.55, 0, 0.43, 0.36, 0.28);
				for (const xx of [-0.17, 0.17])
					shape(g, "box", 0x285d49, xx, 0.58, 0.28, 0.1, 0.12, 0.035, false);
				shape(g, "box", 0x326d51, 0, 0.35, 0.26, 0.29, 0.09, 0.025, false);
				for (const xx of [-0.33, 0.33])
					rod(g, [xx, 0.2, 0], [xx * 0.9, -0.3, 0], 0.075, t.color);
			}
			const halo = shape(
				g,
				"torus",
				new THREE.MeshBasicMaterial({
					color: t.color,
					transparent: true,
					opacity: 0.4,
				}),
				0,
				0.1,
				-0.1,
				0.9,
				0.9,
				0.2,
				false,
			);
			this.treasures.push({ g, halo, base, t, index: i });
		});
		for (const [x, y] of [
			[78, 1],
			[187, 1],
			[59, -6],
			[155, -6],
		]) {
			const g = new THREE.Group();
			g.position.set(x, y, 0);
			this.root.add(g);
			for (let i = 0; i < 4; i++)
				shape(
					g,
					"cylinder",
					0xffc45a,
					-0.3 + i * 0.2,
					0.08 * (i % 2),
					0,
					0.17,
					0.1,
					0.17,
				);
			this.decor.push({ kind: "cache", g, x, y, taken: false });
		}
	}
	buildGate() {
		const g = new THREE.Group();
		g.position.set(234, 0, -0.4);
		this.root.add(g);
		this.gate = g;
		for (const dx of [-2.4, 2.4]) {
			shape(g, "box", 0x7c9b77, dx, 2, 0, 1, 4, 1.3);
			for (let i = 0; i < 5; i++)
				shape(
					g,
					"box",
					0x9eb17c,
					dx,
					0.4 + i * 0.8,
					0.72,
					1.1,
					0.07,
					0.06,
					false,
				);
			shape(g, "box", 0xc3bc7d, dx, 4.15, 0, 1.5, 0.4, 1.7);
			this.fern(234 + dx, 0, 0.8, 0.7);
		}
		shape(g, "box", 0x9ba977, 0, 4.5, 0, 5.8, 0.65, 1.7);
		shape(g, "cone", 0xc0bb7e, 0, 5.3, 0, 3.2, 1.4, 1);
		const sun = shape(g, "torus", 0xd6b467, 0, 3.3, 0.3, 1.75, 1.75, 0.5);
		shape(g, "disc", 0x3b6c58, 0, 3.3, -0.1, 1.75, 1.75, 1, false);
		this.gateSlots = [];
		for (let i = 0; i < 6; i++) {
			const a = (i * TAU) / 6,
				slot = shape(
					g,
					"rough",
					0x426651,
					Math.sin(a) * 1.3,
					3.3 + Math.cos(a) * 1.3,
					0.52,
					0.2,
					0.2,
					0.08,
				);
			this.gateSlots.push(slot);
		}
		this.barrier = shape(
			g,
			"box",
			new THREE.MeshBasicMaterial({
				color: 0xf5d17a,
				transparent: true,
				opacity: 0.17,
				depthWrite: false,
			}),
			0,
			1.8,
			0.65,
			3.8,
			3.6,
			0.1,
			false,
		);
		textBoard(this.root, "SIX TREASURES.|ONE WAY HOME.", 239, 2, 0.1, 3, 1);
	}
	update(t, dt, found = [], hazardSpeed = 1) {
		const ht = t * hazardSpeed;
		this.vines.forEach((v) => {
			v.pump *= Math.exp(-dt * 2);
			v.theta = Math.sin(ht * 0.82 + v.phase) * (0.92 + v.pump);
			v.pivot.rotation.z = v.theta;
			v.end.set(
				v.x + Math.sin(v.theta) * v.length,
				v.anchor - Math.cos(v.theta) * v.length,
				0.15,
			);
		});
		this.crocs.forEach((c) => {
			c.open = Math.sin(ht * 1.55 + c.phase) > 0.25;
			c.jaw.rotation.z = c.open ? 0.66 : 0.01;
		});
		this.logs.forEach((l) => {
			l.x = l.base + Math.sin(ht * 1.2 + l.phase) * 2.8;
			l.m.position.x = l.x;
			l.m.rotation.z = -l.x * 2.2;
			l.body.setNextKinematicTranslation({ x: l.x, y: 0.44, z: 0 });
		});
		this.snakes.forEach((s) => {
			s.g.rotation.z = Math.sin(ht * 2 + s.phase) * 0.045;
			s.head.position.y = 1.02 + Math.sin(ht * 2 + s.phase) * 0.05;
		});
		this.scorpions.forEach((s) => {
			s.x = s.base + Math.sin(ht * 0.9 + s.phase) * 2.3;
			s.g.position.x = s.x;
			s.g.scale.x = Math.cos(ht * 0.9 + s.phase) > 0 ? 1 : -1;
			s.g.position.y = s.y + Math.sin(ht * 12) * 0.015;
		});
		this.fires.forEach((f) => {
			f.on = f.decor || Math.sin(ht * 1.65 + f.phase) > 0.15;
			f.mesh.visible = f.on;
			f.mesh.scale.y = 1 + Math.sin(t * 20 + f.phase) * 0.13;
		});
		for (const p of PITS)
			if (p.type === "tar") {
				p.closed = Math.sin(ht * 0.92) > 0.35;
				p.cover.setEnabled(p.closed);
				p.coverMesh.visible = p.closed;
			}
		this.treasures.forEach((r, i) => {
			r.g.visible = !found[i];
			r.g.rotation.y = t * 0.9;
			r.g.position.y = r.t.y + Math.sin(t * 2 + i) * 0.12;
			r.halo.rotation.z = t * 0.5;
		});
		this.bugs.forEach((b) => {
			b.m.position.y = b.y + Math.sin(t * (b.bird ? 2 : 1) + b.phase) * 0.3;
			b.m.position.x = b.x + Math.sin(t * 0.4 + b.phase) * (b.bird ? 3 : 0.5);
			if (b.bird) b.m.scale.y = 0.6 + Math.abs(Math.sin(t * 4 + b.phase));
		});
		this.flags.forEach((f, i) => {
			f.rotation.y = Math.sin(t * 3 + i) * 0.15;
		});
		this.gateSlots.forEach(
			(s, i) => (s.material = cel(found[i] ? TREASURES[i].color : 0x426651)),
		);
		const all = found.filter(Boolean).length === 6;
		this.barrier.visible = !all;
		this.decor.forEach((d) => {
			if (d.kind === "cache") {
				d.g.visible = !d.taken;
				d.g.rotation.y = t;
			}
		});
		this.waves.forEach((w, i) => {
			w.position.y = -0.55 + Math.sin(t * 1.5 + i) * 0.025;
		});
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.m.position.addScaledVector(p.v, dt);
			p.v.y -= dt * 5;
			p.m.rotation.z += dt * 5;
			p.m.scale.setScalar(Math.max(0, p.life) * p.size);
			if (p.life <= 0) {
				this.root.remove(p.m);
				this.particles.splice(i, 1);
			}
		}
	}
	burst(x, y, hex, count = 16) {
		for (let i = 0; i < count; i++) {
			const m = shape(
					this.root,
					"rough",
					hex,
					x,
					y,
					0.5,
					0.1,
					0.1,
					0.05,
					false,
				),
				v = new THREE.Vector3(rnd(-3, 3), rnd(1, 5), rnd(-0.5, 0.5));
			this.particles.push({ m, v, life: rnd(0.4, 1), size: rnd(0.05, 0.13) });
		}
	}
	reset() {
		this.decor.forEach((d) => (d.taken = false));
		this.flags.forEach(
			(f, i) => (f.material = cel(i === 0 ? PALETTE.gold : 0x85a46c)),
		);
	}
}
