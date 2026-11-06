import * as THREE from "three/webgpu";

const C = {
	ink: 0x172f34,
	teal: 0x278c87,
	mint: 0x99c8af,
	cream: 0xffedc9,
	orange: 0xef6742,
	yellow: 0xffca55,
	water: 0x64d8e3,
	white: 0xfff6dc,
};
export class GameScene {
	constructor(canvas) {
		this.canvas = canvas;
		this.bombs = new Map();
		this.fx = [];
		this.mixers = [];
		this.time = 0;
		this.modeBlend = 1;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xf5e5c4);
		this.camera = new THREE.OrthographicCamera(-15, 15, 8.5, -8.5, 0.1, 150);
		this.camera.position.set(0, 7.8, 38);
		this.camera.lookAt(0, 6, 0);
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.materials = new Map();
		this.ink = new THREE.MeshBasicMaterial({
			color: C.ink,
			side: THREE.BackSide,
		});
		this.geos = {
			box: new THREE.BoxGeometry(1, 1, 1),
			ball: new THREE.SphereGeometry(1, 16, 12),
			cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
			plane: new THREE.PlaneGeometry(1, 1),
		};
		this.players = [];
		this.flags = [];
		this.makeWorld();
		this.makeBomber();
		for (let p = 0; p < 2; p++) this.makePlayer(p);
		this.resize();
	}
	async init() {
		this.renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setSize(innerWidth, innerHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.onDeviceLost = (info) => this.recoverRenderer(info);
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		return this;
	}
	async recoverRenderer(info) {
		if (this.recovering) return;
		this.recovering = true;
		this.deviceLoss = info;
		const old = this.renderer;
		const fresh = this.canvas.cloneNode(false);
		this.canvas.replaceWith(fresh);
		this.canvas = fresh;
		try {
			const replacement = new THREE.WebGPURenderer({
				canvas: fresh,
				antialias: true,
				alpha: false,
				forceWebGL: true,
			});
			replacement.setPixelRatio(Math.min(devicePixelRatio, 2));
			replacement.setSize(innerWidth, innerHeight);
			replacement.outputColorSpace = THREE.SRGBColorSpace;
			await replacement.init();
			this.renderer = replacement;
			this.backend = "WebGL 2 fallback";
			this.recoveryCount = (this.recoveryCount || 0) + 1;
			this.recovering = false;
			old.onDeviceLost = () => {};
			old.dispose();
		} catch (error) {
			console.error("Graphics recovery failed", error);
			document.getElementById("loading").hidden = false;
			document.getElementById("loading").innerHTML =
				"<b>Buckets on break.</b><p>Reload to restore the graphics.</p>";
		}
	}
	mat(color, flat = false) {
		const key = `${color}:${flat}`;
		if (!this.materials.has(key))
			this.materials.set(
				key,
				flat
					? new THREE.MeshBasicMaterial({ color })
					: new THREE.MeshToonMaterial({ color }),
			);
		return this.materials.get(key);
	}
	mesh(
		geo,
		color,
		parent = this.root,
		pos = [0, 0, 0],
		scale = [1, 1, 1],
		outline = true,
	) {
		const g = new THREE.Group();
		const m = new THREE.Mesh(geo, this.mat(color));
		g.add(m);
		if (outline) {
			const o = new THREE.Mesh(geo, this.ink);
			o.scale.set(...scale.map((v) => 1 + 0.045 / Math.max(0.05, Math.abs(v))));
			g.add(o);
		}
		g.position.set(...pos);
		g.scale.set(...scale);
		parent.add(g);
		return g;
	}
	box(x, y, z, w, h, d, c, p = this.root, ink = true) {
		return this.mesh(this.geos.box, c, p, [x, y, z], [w, h, d], ink);
	}
	ball(x, y, z, r, c, p = this.root, scale = [1, 1, 1]) {
		return this.mesh(
			this.geos.ball,
			c,
			p,
			[x, y, z],
			scale.map((v) => v * r),
		);
	}
	cyl(x, y, z, r, h, c, p = this.root) {
		return this.mesh(this.geos.cyl, c, p, [x, y, z], [r, h, r]);
	}
	line(points, color = C.ink, parent = this.root, width = 1) {
		const geo = new THREE.BufferGeometry().setFromPoints(
			points.map((v) => new THREE.Vector3(...v)),
		);
		const l = new THREE.Line(
			geo,
			new THREE.LineBasicMaterial({ color, linewidth: width }),
		);
		parent.add(l);
		return l;
	}
	label(text, w, h, color = "#173238", bg = null, size = 76) {
		const cv = document.createElement("canvas");
		cv.width = 1024;
		cv.height = 256;
		const x = cv.getContext("2d");
		if (bg) {
			x.fillStyle = bg;
			x.fillRect(0, 0, cv.width, cv.height);
		}
		x.fillStyle = color;
		x.font = `900 ${size}px sans-serif`;
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillText(text, 512, 132, 970);
		const tex = new THREE.CanvasTexture(cv);
		tex.colorSpace = THREE.SRGBColorSpace;
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({
				map: tex,
				transparent: true,
				depthWrite: false,
			}),
		);
		return m;
	}
	makeWorld() {
		this.scene.add(new THREE.HemisphereLight(0xfff7e7, 0x567f89, 1.7));
		const sun = new THREE.DirectionalLight(0xffecd0, 2.1);
		sun.position.set(-8, 18, 14);
		this.scene.add(sun);
		const fill = new THREE.DirectionalLight(0x9de8e1, 0.8);
		fill.position.set(12, 4, 9);
		this.scene.add(fill);
		// The print-like skyline is deliberately outside the clear catching lane.
		this.sky = new THREE.Group();
		this.scene.add(this.sky);
		this.ball(12, 12, -14, 2.5, C.yellow, this.sky, [1, 1, 0.08]);
		for (let i = 0; i < 23; i++) {
			const x = -32 + i * 2.8;
			const h = 3 + ((i * 17) % 9) * 0.55;
			const z = -9 - (i % 3) * 2;
			const col = [0xaac8b3, 0xc9d4b7, 0xacc7b7][i % 3];
			this.box(x, h / 2 - 0.2, z, 2.4, h, 1, col, this.sky);
			for (let y = 1; y < h - 1; y += 1.2)
				for (let dx = -0.55; dx < 1; dx += 1.1)
					this.box(
						x + dx,
						y,
						z + 0.56,
						0.34,
						0.6,
						0.03,
						0xe8e5c1,
						this.sky,
						false,
					);
			if (i % 3 === 0) {
				this.box(x, h + 0.22, z, 2.7, 0.3, 1.2, col, this.sky);
				this.box(x + 0.4, h + 1, z, 0.14, 1.8, 0.14, C.ink, this.sky);
			}
		}
		for (let i = 0; i < 6; i++) {
			const x = -23 + i * 9;
			const cloud = new THREE.Group();
			cloud.position.set(x, 13 + (i % 2) * 2, -12);
			this.sky.add(cloud);
			for (let j = 0; j < 4; j++)
				this.ball(
					j * 0.65,
					Math.sin(j) * 0.25,
					0,
					0.8,
					0xfff0d1,
					cloud,
					[1.3, 0.55, 0.13],
				);
		}
		this.box(0, 5.35, -1, 18.5, 12.15, 1.2, C.ink);
		this.box(0, 5.35, -0.33, 18.16, 11.9, 0.22, 0x89bca6);
		// Oversized wall panels, small paint cracks and screen-printed hatching.
		for (let col = 0; col < 6; col++) {
			const x = -7.5 + col * 3;
			this.box(
				x,
				5.25,
				-0.13,
				2.95,
				11.55,
				0.04,
				col % 2 ? 0x8ab6aa : 0x75a89f,
				this.root,
				false,
			);
		}
		for (let y = 0.3; y < 11; y += 1.5)
			this.box(0, y, -0.05, 18, 0.025, 0.02, 0x75a68e, this.root, false);
		for (let i = 0; i < 95; i++) {
			const x = -8.4 + ((i * 71) % 170) / 10,
				y = 0.4 + ((i * 37) % 105) / 10;
			this.line(
				[
					[x, y, -0.015],
					[x + 0.12, y + 0.2, -0.015],
				],
				0x79a78e,
			);
		}
		this.box(0, -0.45, 1.1, 20.2, 0.7, 4.2, 0xc89a6f);
		this.box(0, -0.03, 1.1, 20.5, 0.17, 4.3, C.cream);
		this.box(0, -0.14, 3.25, 20.5, 0.12, 0.16, C.ink);
		this.box(0, 11.33, -0.1, 19.5, 0.42, 2.3, C.cream);
		this.box(0, 11.57, -0.12, 19.9, 0.16, 2.5, C.ink);
		this.box(0, 11.72, -0.12, 19.9, 0.13, 2.5, 0xeacb8c);
		this.box(0, 10.99, 0.8, 19.2, 0.12, 0.18, C.ink);
		for (const s of [-1, 1]) {
			const x = s * 9.8;
			this.cyl(x, 5.1, 0.1, 0.17, 10, C.teal);
			this.cyl(x, 5.1, 0.11, 0.09, 10, C.mint);
			for (let y = 1; y < 11; y += 2.8)
				this.box(x, y, 0.29, 0.55, 0.13, 0.12, C.ink);
			this.box(x, 10.65, 0.1, 0.65, 0.4, 0.5, C.teal);
			this.box(s * 10.2, 1.1, -1.1, 1, 2.8, 1.5, 0xdd9976);
			this.box(s * 10.2, 2.6, -0.3, 1.3, 0.22, 1.7, C.cream);
		}
		const sign = this.label(
			"NO BOOM ZONE",
			6.5,
			0.84,
			"#173238",
			"#f8dc93",
			85,
		);
		sign.position.set(0, 9.8, 0.08);
		sign.rotation.z = -0.012;
		this.root.add(sign);
		this.box(0, 9.8, -0.01, 6.7, 1, 0.08, C.ink);
		const small = this.label(
			"BUCKET BRIGADE  •  EST. 1981",
			5.6,
			0.55,
			"#477865",
			null,
			58,
		);
		small.position.set(0, 8.9, 0.05);
		this.root.add(small);
		// Festival pennants across the upper ledge.
		this.line(
			[
				[-11, 14, -0.5],
				[0, 12.9, -0.5],
				[11, 14, -0.5],
			],
			C.ink,
		);
		for (let i = 0; i < 17; i++) {
			const x = -10.5 + i * 1.3;
			const y = 12.9 + Math.abs(x) * 0.1;
			const sh = new THREE.Shape();
			sh.moveTo(-0.38, 0);
			sh.lineTo(0.38, 0);
			sh.lineTo(0, -0.7);
			sh.closePath();
			const flag = this.mesh(
				new THREE.ShapeGeometry(sh),
				[C.orange, C.yellow, C.teal, C.cream][i % 4],
				this.root,
				[x, y, -0.4],
				[1, 1, 1],
			);
			this.flags.push(flag);
		}
		// Foreground furniture frames the playfield.
		for (const s of [-1, 1]) {
			const x = s * 11.4;
			this.box(x, 1.4, 2, 0.7, 2.8, 0.8, C.teal);
			this.box(x, 2.8, 2, 1.15, 0.25, 1.1, C.yellow);
			for (let i = 0; i < 3; i++) {
				const leaf = this.ball(
					x + (i - 1) * 0.3,
					3.35 + (i % 2) * 0.25,
					2,
					0.6,
					[0x397c61, 0x5c9c6c, 0x8fae69][i],
					this.root,
					[0.3, 1.1, 0.35],
				);
				leaf.rotation.z = (i - 1) * 0.65;
			}
		}
		const plaque = this.label(
			"CATCH A LITTLE CHAOS.",
			7,
			0.6,
			"#173238",
			null,
			65,
		);
		plaque.position.set(0, -0.9, 3.31);
		this.root.add(plaque);
	}
	makeBomber() {
		this.bomber = new THREE.Group();
		this.bomber.position.set(0, 12.05, 0.55);
		this.root.add(this.bomber);
		this.actor = new THREE.Group();
		this.bomber.add(this.actor);
		this.actor.name = "troublemaker";
		for (const s of [-1, 1]) {
			const _boot = this.ball(
				s * 0.28,
				0.08,
				0.12,
				0.32,
				C.ink,
				this.actor,
				[1, 0.65, 1.15],
			);
		}
		this.mesh(
			new THREE.CapsuleGeometry(0.49, 0.55, 4, 12),
			C.cream,
			this.actor,
			[0, 0.68, 0],
			[1, 1, 1],
		);
		for (let i = 0; i < 4; i++)
			this.cyl(0, 0.45 + i * 0.18, 0, 0.497, 0.085, C.ink, this.actor);
		this.ball(0, 1.42, 0.04, 0.53, 0xf3bd87, this.actor, [1, 0.98, 0.86]);
		for (const s of [-1, 1])
			this.ball(s * 0.5, 1.45, 0.02, 0.13, 0xf3bd87, this.actor);
		// Ink eyebrows, eyes, nose and outrageously crooked moustache.
		for (const s of [-1, 1]) {
			this.ball(
				s * 0.19,
				1.46,
				0.44,
				0.074,
				C.ink,
				this.actor,
				[0.65, 1, 0.45],
			);
			const brow = this.box(
				s * 0.2,
				1.63,
				0.435,
				0.27,
				0.055,
				0.055,
				C.ink,
				this.actor,
			);
			brow.rotation.z = -s * 0.22;
			const moust = this.ball(
				s * 0.13,
				1.19,
				0.48,
				0.18,
				C.ink,
				this.actor,
				[1.2, 0.32, 0.35],
			);
			moust.rotation.z = s * 0.2;
		}
		this.ball(0, 1.34, 0.53, 0.13, 0xeb996b, this.actor);
		this.box(0, 1.08, 0.459, 0.19, 0.045, 0.035, C.cream, this.actor);
		this.mesh(
			new THREE.SphereGeometry(0.56, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
			C.orange,
			this.actor,
			[0, 1.7, 0.02],
			[1, 1, 1],
		);
		this.cyl(0, 1.73, 0.02, 0.565, 0.15, C.orange, this.actor);
		this.ball(0.19, 2.2, 0.01, 0.13, C.yellow, this.actor);
		this.arm = new THREE.Group();
		this.arm.name = "dropArm";
		this.arm.position.set(0.46, 1, 0);
		this.actor.add(this.arm);
		const sleeve = this.box(
			0.27,
			-0.06,
			0.02,
			0.62,
			0.28,
			0.31,
			C.cream,
			this.arm,
		);
		sleeve.rotation.z = -0.3;
		this.ball(0.59, -0.2, 0.07, 0.19, 0xf3bd87, this.arm);
		this.held = this.makeBomb("normal");
		this.held.position.set(0.69, -0.35, 0.16);
		this.held.scale.setScalar(0.8);
		this.arm.add(this.held);
		const other = this.box(
			-0.57,
			0.8,
			0.02,
			0.3,
			0.65,
			0.3,
			C.cream,
			this.actor,
		);
		other.rotation.z = -0.35;
		this.ball(-0.69, 0.54, 0.12, 0.18, 0xf3bd87, this.actor);
		this.mixer = new THREE.AnimationMixer(this.actor);
		this.mixers.push(this.mixer);
		const idle = new THREE.AnimationClip("Taunting sway", 1.5, [
			new THREE.NumberKeyframeTrack(
				".rotation[z]",
				[0, 0.375, 0.75, 1.125, 1.5],
				[-0.035, 0, 0.035, 0, -0.035],
			),
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.75, 1.5],
				[0, 0.055, 0],
			),
		]);
		this.mixer.clipAction(idle).play();
		const drop = new THREE.AnimationClip("Bomb toss", 0.38, [
			new THREE.NumberKeyframeTrack(
				"dropArm.rotation[z]",
				[0, 0.1, 0.22, 0.38],
				[0, 0.75, -0.35, 0],
			),
		]);
		this.dropAction = this.mixer.clipAction(drop);
		this.dropAction.setLoop(THREE.LoopOnce);
		this.dropAction.clampWhenFinished = true;
	}
	makeBomb(kind) {
		const g = new THREE.Group();
		const gold = kind === "gold";
		if (kind === "gust") {
			const band = this.mesh(
				new THREE.TorusGeometry(0.242, 0.04, 6, 22),
				C.cream,
				g,
			);
			band.rotation.x = Math.PI / 2;
			const stripe = this.mesh(
				new THREE.TorusGeometry(0.246, 0.018, 5, 22),
				C.orange,
				g,
				[0, 0.06, 0],
			);
			stripe.rotation.x = Math.PI / 2;
		}
		this.ball(0, 0, 0, 0.245, gold ? C.yellow : C.ink, g, [1, 1, 1]);
		this.ball(
			-0.078,
			0.09,
			0.205,
			0.075,
			gold ? 0xffe994 : 0x547174,
			g,
			[0.55, 0.85, 0.18],
		);
		this.cyl(0, 0.245, 0, 0.095, 0.13, gold ? C.orange : 0x767e69, g);
		this.line(
			[
				[0, 0.3, 0],
				[0.05, 0.4, 0],
				[0.13, 0.43, 0],
				[0.16, 0.51, 0],
			],
			C.ink,
			g,
		);
		const spark = this.mesh(
			new THREE.OctahedronGeometry(0.105),
			C.orange,
			g,
			[0.16, 0.51, 0.02],
		);
		g.userData.spark = spark;
		return g;
	}
	makePlayer(i) {
		const g = new THREE.Group();
		this.root.add(g);
		const color = i ? C.orange : C.teal;
		const buckets = [];
		for (let j = 0; j < 3; j++) {
			const b = new THREE.Group();
			b.position.set(0, 2.08 - j * 0.9, 1.05 + i * 0.16);
			g.add(b);
			this.mesh(
				new THREE.CylinderGeometry(0.77, 0.59, 0.55, 16, 1, false),
				color,
				b,
				[0, 0, 0],
				[1, 1, 1],
			);
			const rim = this.mesh(
				new THREE.TorusGeometry(0.775, 0.065, 6, 24),
				C.ink,
				b,
				[0, 0.29, 0],
			);
			rim.rotation.x = Math.PI / 2;
			const _water = this.mesh(
				new THREE.CylinderGeometry(0.72, 0.72, 0.025, 24),
				C.water,
				b,
				[0, 0.285, 0],
				[1, 1, 1],
				false,
			);
			const shine = this.mesh(
				new THREE.TorusGeometry(0.45, 0.025, 4, 18, Math.PI * 0.9),
				0xc1f6e6,
				b,
				[0, 0.307, 0],
				[1, 1, 1],
				false,
			);
			shine.rotation.x = Math.PI / 2;
			const handle = this.mesh(
				new THREE.TorusGeometry(0.84, 0.045, 5, 20, Math.PI),
				C.ink,
				b,
				[0, 0.02, 0],
				[1, 1, 1],
			);
			handle.rotation.z = Math.PI;
			const badge = this.label(
				i ? "02" : "01",
				0.5,
				0.24,
				"#ffedc9",
				null,
				130,
			);
			badge.position.set(0, 0, 0.72);
			b.add(badge);
			buckets.push(b);
		}
		const shadow = this.mesh(
			new THREE.CircleGeometry(1, 28),
			0x5d9581,
			g,
			[0, 0.02, 1.3],
			[1.2, 0.4, 1],
			false,
		);
		shadow.rotation.x = -Math.PI / 2;
		const umbrella = new THREE.Group();
		umbrella.position.set(0, 3.5, 1);
		g.add(umbrella);
		const shape = new THREE.Shape();
		shape.moveTo(-3, 0);
		shape.quadraticCurveTo(0, 1.6, 3, 0);
		shape.quadraticCurveTo(2.5, 0.3, 2, 0);
		shape.quadraticCurveTo(1.5, 0.3, 1, 0);
		shape.quadraticCurveTo(0.5, 0.3, 0, 0);
		shape.quadraticCurveTo(-0.5, 0.3, -1, 0);
		shape.quadraticCurveTo(-1.5, 0.3, -2, 0);
		shape.quadraticCurveTo(-2.5, 0.3, -3, 0);
		const _canopy = this.mesh(
			new THREE.ShapeGeometry(shape),
			C.water,
			umbrella,
		);
		for (let x = -2; x <= 2; x++)
			this.line(
				[
					[0, 1, 0],
					[x, 0, 0.05],
				],
				0xe2f9da,
				umbrella,
			);
		umbrella.visible = false;
		this.players.push({ g, buckets, umbrella, shadow });
	}
	event(ev) {
		if (ev.type === "spawn") {
			this.dropAction.reset().play();
			return;
		}
		if (["catch", "splash", "miss", "win", "repair"].includes(ev.type)) {
			const n =
				ev.type === "win"
					? 80
					: ev.type === "miss"
						? 32
						: ev.type === "splash"
							? 42
							: 13;
			const colors =
				ev.type === "miss"
					? [C.orange, C.yellow, C.ink]
					: ev.type === "win"
						? [C.orange, C.yellow, C.water, C.cream]
						: [C.water, 0xd2ffdf, C.cream];
			for (let i = 0; i < n; i++) {
				const m = this.mesh(
					i % 3 === 0
						? new THREE.BoxGeometry(0.1, 0.22, 0.06)
						: new THREE.OctahedronGeometry(0.09),
					colors[i % colors.length],
					this.root,
					[ev.x || 0, ev.y ?? 2.5, 1.7 + Math.random() * 0.4],
					[1, 1, 1],
					false,
				);
				const a = Math.random() * Math.PI * 2;
				this.fx.push({
					m,
					vx: Math.cos(a) * (1 + Math.random() * 4),
					vy: 2 + Math.random() * 4,
					vz: Math.random() * 2,
					life: 0.6 + Math.random() * 0.6,
					total: 1.2,
				});
			}
			if (ev.type === "miss") this.shake = 0.2;
		}
	}
	resize() {
		const a = innerWidth / innerHeight;
		const h = Math.max(20.0, 22 / a);
		this.camera.left = (-h * a) / 2;
		this.camera.right = (h * a) / 2;
		this.camera.top = h / 2;
		this.camera.bottom = -h / 2;
		this.camera.updateProjectionMatrix();
		if (this.renderer) this.renderer.setSize(innerWidth, innerHeight);
	}
	screenToWorld(clientX) {
		const v = new THREE.Vector3((clientX / innerWidth) * 2 - 1, 0, 0).unproject(
			this.camera,
		);
		return THREE.MathUtils.clamp(
			(v.x - this.root.position.x) / this.root.scale.x,
			-7.6,
			7.6,
		);
	}
	debugPhysics(model, enabled) {
		if (this.physicsLines) {
			this.scene.remove(this.physicsLines);
			this.physicsLines.geometry.dispose();
			this.physicsLines = null;
		}
		if (!enabled) return;
		const d = model.world.debugRender();
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(d.vertices, 3));
		g.setAttribute("color", new THREE.BufferAttribute(d.colors, 4));
		this.physicsLines = new THREE.LineSegments(
			g,
			new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
		);
		this.physicsLines.position.z = 2;
		this.physicsLines.renderOrder = 100;
		this.scene.add(this.physicsLines);
	}
	render(s, dt, { title = false } = {}) {
		if (this.recovering || !this.renderer) return;
		this.time += dt;
		this.modeBlend = THREE.MathUtils.damp(this.modeBlend, title ? 1 : 0, 5, dt);
		const b = this.modeBlend;
		this.root.scale.setScalar(1 - b * 0.18);
		this.root.position.x = (innerWidth / innerHeight > 1.2 ? 5.1 : 0) * b;
		this.root.position.y = b * 0.1;
		this.bomber.position.x = s.bomberX ?? Math.sin(this.time) * 4;
		this.bomber.rotation.z = Math.sin(this.time * 2) * 0.008;
		for (const m of this.mixers) m.update(dt);
		this.flags.forEach((f, i) => {
			f.rotation.y = Math.sin(this.time * 1.6 + i) * 0.13;
		});
		const ids = new Set();
		for (const bomb of s.bombs || []) {
			ids.add(bomb.id);
			let m = this.bombs.get(bomb.id);
			if (!m) {
				m = this.makeBomb(bomb.kind);
				this.root.add(m);
				this.bombs.set(bomb.id, m);
			}
			m.position.set(bomb.x, bomb.y, 1);
			m.rotation.z = bomb.angle || 0;
			m.userData.spark.scale.setScalar(
				0.7 + Math.sin(this.time * 38 + bomb.id) * 0.4,
			);
		}
		for (const [id, m] of this.bombs)
			if (!ids.has(id)) {
				this.root.remove(m);
				this.bombs.delete(id);
			}
		this.players.forEach((p, i) => {
			p.g.visible = i < (s.players?.length || 1);
			p.g.position.x = s.players?.[i]?.x || 0;
			const splash = s.players?.[i]?.splashTime || 0;
			p.umbrella.visible = splash > 0;
			p.umbrella.scale.y = 0.8 + Math.sin(this.time * 16) * 0.04;
			p.buckets.forEach((bu, j) => {
				bu.visible = j >= 3 - (s.lives ?? 3);
				bu.rotation.z = Math.sin(this.time * 3 + j) * 0.013;
				bu.scale.x = (s.bucketWidth || 1.6) / 1.6;
			});
		});
		for (let i = this.fx.length - 1; i >= 0; i--) {
			const f = this.fx[i];
			f.life -= dt;
			if (f.life <= 0) {
				this.root.remove(f.m);
				f.m.traverse((o) => {
					if (o.isMesh && !Object.values(this.geos).includes(o.geometry))
						o.geometry.dispose();
				});
				this.fx.splice(i, 1);
				continue;
			}
			f.vy -= 10 * dt;
			f.m.position.x += f.vx * dt;
			f.m.position.y += f.vy * dt;
			f.m.position.z += f.vz * dt;
			f.m.rotation.z += dt * 8;
			f.m.scale.setScalar(Math.min(1, f.life * 3));
		}
		if (this.shake > 0) {
			this.shake -= dt;
			this.camera.position.x = Math.sin(this.time * 110) * this.shake * 0.5;
		} else this.camera.position.x = 0;
		this.renderer.render(this.scene, this.camera);
	}
}
