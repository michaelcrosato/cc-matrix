/** Procedural ink-and-cel jungle theatre. All meshes and clips are authored in code. */
export class JungleScene {
	constructor(THREE, renderer) {
		this.T = THREE;
		this.renderer = renderer;
		this.stage = -1;
		this.seed = 3187;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#f3d8a0");
		this.scene.fog = new THREE.Fog("#5b9583", 42, 110);
		this.camera = new THREE.OrthographicCamera(
			-20,
			20,
			11.25,
			-11.25,
			0.1,
			180,
		);
		this.camera.position.set(14, 9, 36);
		this.camera.lookAt(14, 4, 0);
		this.world = new THREE.Group();
		this.scene.add(this.world);
		this.dynamic = new THREE.Group();
		this.scene.add(this.dynamic);
		this.players = [];
		this.enemyMeshes = new Map();
		this.vineMeshes = [];
		this.coinMeshes = [];
		this.particles = [];
		this.sways = [];
		const bands = new Uint8Array([105, 188, 255]);
		this.gradient = new THREE.DataTexture(bands, 3, 1, THREE.RedFormat);
		this.gradient.minFilter = THREE.NearestFilter;
		this.gradient.magFilter = THREE.NearestFilter;
		this.gradient.needsUpdate = true;
		this.mats = new Map();
		this.geos = new Map();
		this.ink = new THREE.MeshBasicMaterial({
			color: "#102d32",
			side: THREE.BackSide,
		});
		this.lineMat = new THREE.LineBasicMaterial({
			color: "#173b3a",
			transparent: true,
			opacity: 0.7,
		});
		this.scene.add(new THREE.HemisphereLight("#fff1ca", "#345d55", 2.2));
		const sun = new THREE.DirectionalLight("#ffe2a6", 3.5);
		sun.position.set(-10, 24, 18);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -25;
		sun.shadow.camera.right = 25;
		sun.shadow.camera.top = 20;
		sun.shadow.camera.bottom = -20;
		sun.shadow.bias = -0.001;
		this.scene.add(sun);
		this.sunLight = sun;
		this.scene.add(sun.target);
		const rim = new THREE.DirectionalLight("#7ee6ce", 1.5);
		rim.position.set(10, 10, -10);
		this.scene.add(rim);
		this.buildStage(0);
	}
	rand() {
		this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}
	mat(color, basic = false, opacity = 1) {
		const key = color + "|" + basic + "|" + opacity;
		if (this.mats.has(key)) return this.mats.get(key);
		const T = this.T;
		const m = basic
			? new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity })
			: new T.MeshToonMaterial({
					color,
					gradientMap: this.gradient,
					transparent: opacity < 1,
					opacity,
				});
		this.mats.set(key, m);
		return m;
	}
	geo(kind) {
		if (this.geos.has(kind)) return this.geos.get(kind);
		const T = this.T;
		const g =
			kind === "box"
				? new T.BoxGeometry(1, 1, 1)
				: kind === "sphere"
					? new T.IcosahedronGeometry(1, 1)
					: kind === "round"
						? new T.SphereGeometry(1, 12, 8)
						: kind === "cylinder"
							? new T.CylinderGeometry(1, 1, 1, 8)
							: kind === "cone"
								? new T.ConeGeometry(1, 1, 6)
								: kind === "torus"
									? new T.TorusGeometry(1, 0.11, 6, 18)
									: new T.IcosahedronGeometry(1, 0);
		this.geos.set(kind, g);
		return g;
	}
	mesh(parent, kind, color, x, y, z, sx = 1, sy = 1, sz = 1, ink = false) {
		const T = this.T;
		const m = new T.Mesh(this.geo(kind), this.mat(color));
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		if (ink) {
			const border = new T.Mesh(this.geo(kind), this.ink);
			border.scale.setScalar(1.055);
			m.add(border);
		}
		return m;
	}
	line(parent, a, b, r, color = "#254943") {
		const T = this.T;
		const d = new T.Vector3().subVectors(b, a);
		const m = this.mesh(
			parent,
			"cylinder",
			color,
			(a.x + b.x) / 2,
			(a.y + b.y) / 2,
			(a.z + b.z) / 2,
			r,
			d.length(),
			r,
		);
		m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
		return m;
	}
	leaf(parent, x, y, z, size, angle, color) {
		const m = this.mesh(
			parent,
			"sphere",
			color,
			x,
			y,
			z,
			size * 0.28,
			size,
			size * 0.085,
		);
		m.rotation.z = angle;
		m.rotation.y = 0.35;
		return m;
	}
	fern(parent, x, y, z, size = 1, color = "#3c8c65", foreground = false) {
		const T = this.T;
		const group = new T.Group();
		group.position.set(x, y, z);
		parent.add(group);
		for (let k = -2; k <= 2; k++) {
			const a = k * 0.43;
			const len = size * (1 - Math.abs(k) * 0.1);
			this.leaf(
				group,
				Math.sin(a) * len * 0.5,
				Math.cos(a) * len * 0.5,
				0,
				len * 0.6,
				-a,
				color,
			);
			this.line(
				group,
				new T.Vector3(0, 0, 0),
				new T.Vector3(Math.sin(a) * len, Math.cos(a) * len, 0),
				0.025,
				"#276a51",
			);
			for (let j = 1; j < 4; j++) {
				const yy = j / 4;
				this.leaf(
					group,
					Math.sin(a) * len * yy - 0.16,
					Math.cos(a) * len * yy,
					0,
					size * 0.22,
					0.8 - a,
					color,
				);
				this.leaf(
					group,
					Math.sin(a) * len * yy + 0.16,
					Math.cos(a) * len * yy,
					0.015,
					size * 0.22,
					-0.8 - a,
					color,
				);
			}
		}
		if (foreground) this.sways.push(group);
		return group;
	}
	flower(parent, x, y, z, scale = 1) {
		const g = new this.T.Group();
		g.position.set(x, y, z);
		g.scale.setScalar(scale);
		parent.add(g);
		this.mesh(g, "cylinder", "#296d4c", 0, 0.45, 0, 0.035, 0.9, 0.035);
		for (let k = 0; k < 5; k++) {
			const a = (k * Math.PI * 2) / 5;
			this.mesh(
				g,
				"sphere",
				k % 2 ? "#f6ab57" : "#f4be6f",
				Math.sin(a) * 0.23,
				0.95 + Math.cos(a) * 0.22,
				0.02,
				0.19,
				0.26,
				0.09,
			);
		}
		this.mesh(g, "sphere", "#a54538", 0, 0.96, 0.12, 0.12, 0.12, 0.1);
		return g;
	}
	tree(parent, x, y, z, size = 1, far = false) {
		const T = this.T;
		const g = new T.Group();
		g.position.set(x, y, z);
		g.scale.setScalar(size);
		parent.add(g);
		const bark = far ? "#315f59" : "#326455",
			leaf = far ? "#397b68" : "#326c4d";
		this.mesh(g, "cylinder", bark, 0, 6, 0, 0.6, 12, 0.5);
		this.mesh(g, "cone", "#225549", -0.23, 1, 0, 1.1, 2, 1);
		for (let side of [-1, 1]) {
			this.line(
				g,
				new T.Vector3(0, 6, 0),
				new T.Vector3(side * 3.4, 10, -0.6),
				0.23,
				bark,
			);
			this.line(
				g,
				new T.Vector3(0, 9, 0),
				new T.Vector3(side * 2.5, 13, 0.2),
				0.18,
				bark,
			);
		}
		for (let k = 0; k < 10; k++) {
			const a = k * 2.4;
			const xx = Math.sin(a) * 3.3,
				yy = 11.8 + Math.cos(a) * 1.7;
			this.mesh(g, "sphere", leaf, xx, yy, Math.cos(a) * 1.2, 3, 1.9, 1.5);
		}
		if (!far) {
			for (let k = 0; k < 7; k++) {
				const yy = 2 + k * 1.3;
				const vine = this.leaf(
					g,
					0.1,
					yy,
					0.56,
					0.32,
					k % 2 ? 0.7 : -0.7,
					"#76a253",
				);
			}
			for (let k = 0; k < 4; k++)
				this.line(
					g,
					new T.Vector3((k - 1.5) * 0.7, 0.1, 0),
					new T.Vector3(0, 1.8, 0),
					0.13,
					"#265444",
				);
		}
		return g;
	}
	ground(parent, x, w, y = 0, color = "#c89957") {
		const T = this.T;
		this.mesh(parent, "box", "#2c5148", x, y - 4.1, -0.1, w, 8, 8, true);
		this.mesh(parent, "box", color, x, y - 0.32, 0.1, w, 0.65, 8.4, true);
		this.mesh(parent, "box", "#75a15a", x, y + 0.025, 0.1, w, 0.16, 8.6);
		for (let k = 0; k < w / 1.7; k++) {
			let xx = x - w / 2 + k * 1.7 + 0.5;
			this.mesh(
				parent,
				"sphere",
				"#a77b4d",
				xx,
				y - 0.5,
				4.22,
				0.32,
				0.17,
				0.06,
			);
			if (k % 3 === 0) this.fern(parent, xx, y + 0.1, 3.6, 0.4, "#45764b");
		}
	}
	buildStage(stage) {
		if (this.stage === stage) return;
		this.stage = stage;
		this.seed = 3187 + stage * 711;
		this.world.clear();
		this.dynamic.clear();
		this.players = [];
		this.enemyMeshes.clear();
		this.vineMeshes = [];
		this.coinMeshes = [];
		this.particles = [];
		this.sways = [];
		this.rescue = null;
		this.water = [];
		this.bellMeshes = [];
		const T = this.T,
			w = this.world;
		const sky = ["#f4d89e", "#d1e8c5", "#efd6ad", "#f5c9a0"][stage];
		this.scene.background.set(sky);
		this.scene.fog.color.set(
			["#64927a", "#54a39b", "#86917c", "#8a8b7c"][stage],
		);
		const disk = this.mesh(w, "round", "#fff2bf", 65, 16, -45, 6, 6, 0.2);
		disk.material = this.mat("#fff2bf", true);
		// Flat silhouetted mountains establish theatrical depth behind the saturated playable plane.
		for (let layer = 0; layer < 3; layer++) {
			for (let i = 0; i < 18; i++) {
				const x = -40 + i * 13;
				const y = 2 + this.rand() * 5;
				this.mesh(
					w,
					"cone",
					["#b6c5a0", "#8fae92", "#5a927b"][layer],
					x,
					y,
					-36 + layer * 8,
					12,
					16 + this.rand() * 11,
					4,
				);
			}
		}
		for (let i = 0; i < 23; i++) {
			const x = -17 + i * 6.3;
			this.tree(w, x, -3, -20 - this.rand() * 5, 0.8 + this.rand() * 0.5, true);
		}
		for (let i = 0; i < 17; i++) {
			const x = -12 + i * 8.6;
			this.tree(w, x, -2, -9 - this.rand() * 4, 1 + this.rand() * 0.4, false);
		}
		for (let i = 0; i < 50; i++) {
			const x = -12 + this.rand() * 135,
				y = stage === 1 ? -7 : stage === 2 ? x * 0.04 : 0;
			this.fern(
				w,
				x,
				y,
				-4 - this.rand() * 3,
				0.9 + this.rand() * 1.3,
				["#43805a", "#5e995c", "#47754d"][i % 3],
			);
			if (i % 4 === 0) this.flower(w, x, y + 0.2, -3.5, 0.75 + this.rand());
		}
		if (stage === 0) {
			this.ground(w, -1, 16, 0);
			this.ground(w, 110, 20, 0);
			for (let i = 0; i < 12; i++) {
				const x = 5 + i * 8.6;
				this.mesh(w, "sphere", "#244c45", x, -6.8, -0.5, 6.2, 2.5, 3);
				this.fern(w, x, -5.4, 2, 2.5, "#315b44");
			}
			for (let i = 0; i < 12; i++) {
				const x = 6 + i * 8.5;
				this.line(
					w,
					new T.Vector3(x - 2, 13.1, -1),
					new T.Vector3(x + 3, 13.5, 0),
					0.25,
					"#426852",
				);
				this.fern(w, x + 1, 13.3, 0, 1.6, "#698c4c");
			}
		}
		if (stage === 1) {
			this.ground(w, 55, 140, -7, "#b8b488");
			this.ground(w, -5, 10, 2);
			this.ground(w, 109, 18, 2);
			const water = this.mesh(w, "box", "#2daca5", 55, -2, -1, 111, 10, 7);
			water.material = this.mat("#329e9e", false, 0.42);
			water.receiveShadow = false;
			water.castShadow = false;
			for (let i = 0; i < 28; i++) {
				let x = -1 + i * 4.1;
				const wave = this.mesh(
					w,
					"box",
					"#b2e7c4",
					x,
					3.03,
					0.9,
					1.5 + this.rand() * 1.8,
					0.035,
					0.06,
				);
				wave.material = this.mat("#b2e7c4", true, 0.6);
				this.water.push(wave);
			}
			for (let i = 0; i < 40; i++) {
				const x = this.rand() * 110,
					y = -6 + this.rand() * 7;
				const bubble = this.mesh(
					w,
					"torus",
					"#8ce6d8",
					x,
					y,
					2.2,
					0.08 + this.rand() * 0.09,
					0.08 + this.rand() * 0.09,
					0.04,
				);
				bubble.material = this.mat("#98e0d3", true, 0.6);
				this.water.push(bubble);
			}
			for (let i = 0; i < 18; i++) {
				const x = 4 + i * 6;
				this.mesh(w, "sphere", "#4c9290", x, -6.65, 1, 0.75, 0.4, 0.5);
				this.fern(w, x, -6.8, 1, 1.1, "#447f69");
			}
		}
		if (stage === 2) {
			for (let i = 0; i < 14; i++)
				this.ground(w, i * 8 + 1, 8.2, (i * 8 + 1) * 0.04, "#d2a067");
			for (let i = 0; i < 12; i++) {
				let x = i * 10;
				this.mesh(w, "sphere", "#b68a64", x, 3 + x * 0.04, -8, 3, 4, 3, true);
				this.mesh(
					w,
					"sphere",
					"#d0ae7b",
					x + 0.4,
					6 + x * 0.04,
					-8,
					1.5,
					1.1,
					2,
				);
			}
			for (let i = 0; i < 8; i++) {
				let x = 8 + i * 14;
				this.mesh(
					w,
					"box",
					"#5d6c4e",
					x,
					x * 0.04 + 0.45,
					-3.7,
					1.8,
					0.8,
					1.1,
					true,
				);
			}
		}
		if (stage === 3) {
			this.ground(w, 52, 130, 0, "#c6a06a");
			for (let i = 0; i < 8; i++) {
				let x = 15 + i * 12;
				this.mesh(w, "box", "#456d59", x, 0.8, -4.2, 3, 1.6, 1.3, true);
				this.mesh(w, "cone", "#72946d", x, 2, -4.2, 2.4, 1.1, 1.2);
			}
			// Brass alarm bells double as clear, tactile rescue objectives.
			for (let bx of [37, 66]) {
				const stand = new T.Group();
				stand.position.set(bx, 0, 0);
				w.add(stand);
				this.mesh(
					stand,
					"cylinder",
					"#76684b",
					0,
					1.6,
					-0.25,
					0.13,
					3.2,
					0.13,
					true,
				);
				this.mesh(
					stand,
					"box",
					"#76684b",
					0.55,
					3.15,
					-0.25,
					1.2,
					0.18,
					0.2,
					true,
				);
				const bell = new T.Group();
				bell.position.set(0.9, 2.6, -0.1);
				stand.add(bell);
				this.mesh(bell, "cone", "#e7ba58", 0, 0, 0, 0.43, 0.65, 0.4, true);
				this.mesh(
					bell,
					"torus",
					"#f6d579",
					0,
					-0.3,
					0,
					0.42,
					0.42,
					0.42,
					true,
				).rotation.x = Math.PI / 2;
				this.mesh(bell, "sphere", "#7d6341", 0, -0.4, 0, 0.12, 0.12, 0.12);
				this.bellMeshes.push(bell);
				this.mesh(stand, "box", "#f0d492", 0, 1.3, 0.2, 0.8, 0.7, 0.12, true);
				this.mesh(stand, "star", "#a15e38", 0, 1.3, 0.28, 0.22, 0.22, 0.04);
			}
			// Clockwork trapping outpost: ropes, brass coils, paper flags and a non-human antagonist.
			for (let x of [85, 107]) {
				this.mesh(w, "cylinder", "#6b6650", x, 4.4, -2, 0.28, 8.8, 0.28, true);
				this.mesh(w, "cone", "#d1ad63", x, 9, -2, 0.6, 0.8, 0.6, true);
			}
			this.mesh(w, "box", "#665e47", 96, 8.3, -2, 24, 0.35, 0.4, true);
			for (let k = 0; k < 9; k++) {
				const x = 86 + k * 2.5;
				this.mesh(
					w,
					"cone",
					k % 2 ? "#e5ac52" : "#b6543c",
					x,
					7.8,
					-1.8,
					0.55,
					1,
					0.1,
				);
			}
			const g = new T.Group();
			g.position.set(101, 1, 0);
			w.add(g);
			this.rescue = g;
			const cage = new T.Group();
			g.add(cage);
			g.userData.cage = cage;
			const bird = new T.Group();
			g.add(bird);
			g.userData.bird = bird;
			this.mesh(cage, "cylinder", "#d7aa57", 0, 0, 0, 2, 0.25, 1.4, true);
			this.mesh(cage, "cylinder", "#d7aa57", 0, 3.1, 0, 2, 0.25, 1.4, true);
			for (let k = 0; k < 12; k++) {
				const a = (k * Math.PI * 2) / 12;
				this.mesh(
					cage,
					"cylinder",
					"#64766a",
					Math.cos(a) * 1.7,
					1.5,
					Math.sin(a) * 1.1,
					0.045,
					3,
					0.045,
				);
			}
			this.mesh(bird, "sphere", "#dbe5ae", 0, 0.6, 0.05, 0.7, 0.55, 0.6, true);
			this.mesh(
				bird,
				"sphere",
				"#e96b3f",
				0.35,
				1.2,
				0.05,
				0.45,
				0.6,
				0.4,
				true,
			);
			this.mesh(
				bird,
				"cone",
				"#efd07b",
				0.9,
				1.3,
				0.05,
				0.23,
				0.8,
				0.25,
				true,
			).rotation.z = -Math.PI / 2;
			this.mesh(bird, "round", "#122f32", 0.55, 1.5, 0.39, 0.07, 0.07, 0.04);
			this.leaf(bird, -0.4, 0.7, 0.5, 0.55, -0.5, "#2b7b70");
			this.leaf(bird, -0.7, 0.7, 0.4, 0.65, 1.1, "#327e72");
			for (let k = 0; k < 2; k++) {
				const x = 90 + k * 17;
				this.mesh(w, "box", "#836b48", x, 0.55, 2, 2, 1.1, 1.5, true);
				for (let n = 0; n < 3; n++)
					this.mesh(
						w,
						"box",
						"#3c4b3e",
						x,
						0.55 + n * 0.24,
						2.77,
						1.7,
						0.05,
						0.04,
					);
			}
		}
		// Foreground is sparse: ink-black framing, never a wall across the player.
		for (let i = 0; i < 19; i++) {
			const x = -10 + i * 7;
			const y = stage === 1 ? -7 : stage === 2 ? x * 0.04 : 0;
			this.fern(w, x, y, 5, 0.65 + this.rand() * 0.7, "#245246", true);
			if (i % 4 === 0) this.flower(w, x + 0.7, y, 4.7, 0.7);
		}
		for (let i = 0; i < 55; i++) {
			const mote = this.mesh(
				w,
				"sphere",
				"#f5df9a",
				this.rand() * 120,
				-1 + this.rand() * 14,
				-5 + this.rand() * 8,
				0.025,
				0.025,
				0.025,
			);
			mote.material = this.mat("#f5df9a", true, 0.7);
			mote.userData.phase = this.rand() * 6.28;
			mote.userData.baseY = mote.position.y;
			this.sways.push(mote);
		}
		// Carved trail posts and pennants make stage endpoints legible.
		this.mesh(w, "cylinder", "#836943", 108, 2, 2, 0.15, 4, 0.15, true);
		this.mesh(w, "box", "#f5d58b", 108.7, 3.3, 2, 1.4, 0.7, 0.15, true);
		const arrow = this.mesh(w, "cone", "#b45c3b", 109.7, 3.3, 2, 0.4, 0.8, 0.1);
		arrow.rotation.z = -Math.PI / 2;
	}
	makePlayer(index, color) {
		const T = this.T,
			root = new T.Group(),
			body = new T.Group();
		root.add(body);
		this.dynamic.add(root);
		const tan = color || ["#ebaf5f", "#5db6b5"][index % 2];
		this.mesh(body, "box", tan, 0, 1.03, 0, 0.62, 0.7, 0.42, true);
		this.mesh(body, "box", "#584a3a", 0, 0.76, 0, 0.64, 0.13, 0.46);
		this.mesh(body, "box", "#6b7450", -0.18, 1.13, -0.34, 0.6, 0.6, 0.28, true);
		this.mesh(body, "sphere", "#ebba85", 0, 1.63, 0.02, 0.36, 0.37, 0.31, true);
		this.mesh(body, "sphere", "#8d593e", 0.16, 1.6, 0.3, 0.11, 0.1, 0.07);
		this.mesh(body, "round", "#152f32", 0.14, 1.75, 0.3, 0.045, 0.05, 0.035);
		this.mesh(body, "round", "#152f32", -0.12, 1.75, 0.3, 0.045, 0.05, 0.035);
		this.mesh(
			body,
			"sphere",
			"#f2db9e",
			0,
			1.95,
			-0.03,
			0.53,
			0.12,
			0.42,
			true,
		);
		this.mesh(body, "sphere", "#f2db9e", 0, 2.06, -0.04, 0.37, 0.3, 0.34, true);
		this.mesh(body, "cylinder", "#9e7d48", 0, 1.99, -0.04, 0.38, 0.1, 0.35);
		this.mesh(body, "box", "#d35b3c", 0, 1.37, 0.1, 0.68, 0.14, 0.48, true);
		this.leaf(body, -0.4, 1.3, -0.1, 0.35, -0.8, "#d35b3c");
		const limb = (name, x, y, z, col, sy) => {
			const pivot = new T.Group();
			pivot.name = name;
			pivot.position.set(x, y, z);
			body.add(pivot);
			this.mesh(pivot, "cylinder", col, 0, -sy / 2, 0, 0.12, sy, 0.12, true);
			return pivot;
		};
		const armL = limb("armL", -0.4, 1.28, 0.03, tan, 0.55),
			armR = limb("armR", 0.4, 1.28, 0.03, tan, 0.55);
		this.mesh(armL, "sphere", "#ebba85", 0, -0.58, 0, 0.13, 0.14, 0.13);
		this.mesh(armR, "sphere", "#ebba85", 0, -0.58, 0, 0.13, 0.14, 0.13);
		const legL = limb("legL", -0.19, 0.73, 0, "#b78951", 0.5),
			legR = limb("legR", 0.19, 0.73, 0, "#b78951", 0.5);
		this.mesh(legL, "box", "#3e4a3e", 0.06, -0.55, 0.09, 0.25, 0.2, 0.4, true);
		this.mesh(legR, "box", "#3e4a3e", 0.06, -0.55, 0.09, 0.25, 0.2, 0.4, true);
		const blade = this.mesh(
			armR,
			"cone",
			"#dbe7d9",
			0,
			-0.85,
			0.05,
			0.12,
			0.55,
			0.035,
			true,
		);
		blade.visible = false;
		const mixer = new T.AnimationMixer(body);
		const tracks = (values, d = 1) =>
			Object.entries(values).map(
				([name, vs]) =>
					new T.NumberKeyframeTrack(
						`${name}.rotation[z]`,
						vs.map((_, i) => (i * d) / (vs.length - 1)),
						vs,
					),
			);
		const clips = {
			idle: new T.AnimationClip(
				"idle",
				2,
				tracks(
					{
						armL: [0.08, 0.16, 0.08],
						armR: [-0.08, -0.16, -0.08],
						legL: [0, 0, 0],
						legR: [0, 0, 0],
					},
					2,
				),
			),
			run: new T.AnimationClip(
				"run",
				0.55,
				tracks(
					{
						armL: [-0.75, 0.75, -0.75],
						armR: [0.75, -0.75, 0.75],
						legL: [0.8, -0.8, 0.8],
						legR: [-0.8, 0.8, -0.8],
					},
					0.55,
				),
			),
			swim: new T.AnimationClip(
				"swim",
				0.9,
				tracks(
					{
						armL: [-2.2, -0.2, -2.2],
						armR: [0.2, 2.2, 0.2],
						legL: [0.5, -0.5, 0.5],
						legR: [-0.5, 0.5, -0.5],
					},
					0.9,
				),
			),
			swing: new T.AnimationClip(
				"swing",
				1.4,
				tracks(
					{
						armL: [-2.7, -2.9, -2.7],
						armR: [2.6, 2.9, 2.6],
						legL: [-0.25, 0.1, -0.25],
						legR: [0.15, 0.4, 0.15],
					},
					1.4,
				),
			),
			jump: new T.AnimationClip(
				"jump",
				0.8,
				tracks(
					{
						armL: [-1.4, -1.8, -1.4],
						armR: [1.3, 1.8, 1.3],
						legL: [0.8, 1, 0.8],
						legR: [-0.55, -0.35, -0.55],
					},
					0.8,
				),
			),
			duck: new T.AnimationClip(
				"duck",
				1,
				tracks(
					{
						armL: [-0.5, -0.5],
						armR: [0.5, 0.5],
						legL: [1, 1],
						legR: [-0.9, -0.9],
					},
					1,
				),
			),
			attack: new T.AnimationClip(
				"attack",
				0.3,
				tracks(
					{
						armL: [-0.3, -0.5, -0.3],
						armR: [0.2, 2, 0.2],
						legL: [0.2, 0.2, 0.2],
						legR: [-0.2, -0.2, -0.2],
					},
					0.3,
				),
			),
		};
		const actions = {};
		for (const [name, clip] of Object.entries(clips))
			actions[name] = mixer.clipAction(clip);
		actions.idle.play();
		const shadow = this.mesh(
			this.dynamic,
			"round",
			"#173b35",
			0,
			0.03,
			0,
			0.55,
			0.04,
			0.37,
		);
		shadow.material = this.mat("#173b35", true, 0.3);
		const data = { root, body, mixer, actions, anim: "idle", blade, shadow };
		this.players.push(data);
		return data;
	}
	makeEnemy(e) {
		const T = this.T,
			g = new T.Group();
		this.dynamic.add(g);
		const type = e.type || "croc";
		g.userData.type = type;
		if (type === "croc" || type === "crocodile") {
			this.mesh(g, "sphere", "#63965b", 0, 0.24, 0, 1.25, 0.36, 0.43, true);
			this.mesh(
				g,
				"sphere",
				"#8fb66c",
				-0.95,
				0.14,
				0.02,
				0.8,
				0.21,
				0.43,
				true,
			);
			const jaw = new T.Group();
			jaw.position.set(-0.7, 0.15, 0);
			g.add(jaw);
			this.mesh(jaw, "box", "#a7c87b", -0.55, 0, 0, 1.2, 0.16, 0.72, true);
			g.userData.jaw = jaw;
			for (let i = 0; i < 5; i++) {
				this.mesh(
					jaw,
					"cone",
					"#f2e6bb",
					-0.15 - i * 0.2,
					0.13,
					0.3,
					0.06,
					0.18,
					0.06,
				);
				this.mesh(
					g,
					"cone",
					"#406d4b",
					-0.1 + i * 0.3,
					0.64,
					0,
					0.15,
					0.27,
					0.16,
				);
			}
			for (let s of [-1, 1]) {
				this.mesh(
					g,
					"sphere",
					"#8ab777",
					-0.55,
					0.56,
					s * 0.32,
					0.2,
					0.15,
					0.18,
				);
				this.mesh(
					g,
					"sphere",
					"#172f31",
					-0.61,
					0.58,
					s * 0.44,
					0.045,
					0.07,
					0.04,
				);
				this.mesh(g, "sphere", "#63965b", 0.1, 0, s * 0.46, 0.3, 0.13, 0.2);
			}
			this.mesh(
				g,
				"cone",
				"#558751",
				1.65,
				0.22,
				0,
				0.4,
				1.8,
				0.3,
				true,
			).rotation.z = -Math.PI / 2;
		} else if (type === "boulder" || type === "rock") {
			const rock = this.mesh(g, "sphere", "#ae9674", 0, 0, 0, 1, 1, 1, true);
			g.userData.rock = rock;
			for (let i = 0; i < 4; i++) {
				const seam = this.mesh(
					g,
					"box",
					"#716e57",
					Math.sin(i * 2) * 0.6,
					Math.cos(i * 2) * 0.6,
					0.7,
					0.7,
					0.06,
					0.07,
				);
				seam.rotation.z = i * 0.8;
			}
		} else {
			this.mesh(g, "sphere", "#4b625c", 0, 0.9, 0, 0.55, 0.7, 0.4, true);
			this.mesh(g, "box", "#aeb3a1", 0, 1.67, 0.02, 0.7, 0.65, 0.55, true);
			this.mesh(g, "box", "#df9850", 0, 1.65, 0.31, 0.5, 0.17, 0.08, true);
			this.mesh(g, "round", "#d95e3c", -0.14, 1.65, 0.38, 0.07, 0.07, 0.03);
			this.mesh(g, "round", "#d95e3c", 0.14, 1.65, 0.38, 0.07, 0.07, 0.03);
			this.mesh(g, "cone", "#a9b3a0", 0, 2.2, 0.02, 0.3, 0.5, 0.3, true);
			this.mesh(g, "box", "#d1a85d", 0, 0.9, 0.43, 0.46, 0.42, 0.12, true);
			for (let s of [-1, 1]) {
				this.mesh(
					g,
					"cylinder",
					"#a4ab94",
					s * 0.3,
					0.25,
					0,
					0.12,
					0.6,
					0.12,
					true,
				);
				this.mesh(
					g,
					"box",
					"#384e4a",
					s * 0.3,
					0.02,
					0.1,
					0.4,
					0.18,
					0.55,
					true,
				);
				this.mesh(
					g,
					"sphere",
					"#83978b",
					s * 0.63,
					1.1,
					0,
					0.17,
					0.17,
					0.17,
					true,
				);
			}
			const spear = new T.Group();
			spear.position.set(-0.86, 1.3, 0.2);
			g.add(spear);
			this.mesh(spear, "cylinder", "#a1764d", 0, 0, 0, 0.045, 2.8, 0.045);
			this.mesh(spear, "cone", "#ccdbcb", 0, 1.55, 0, 0.2, 0.5, 0.12, true);
			g.userData.spear = spear;
		}
		this.enemyMeshes.set(e.id, g);
		return g;
	}
	addParticle(x, y, type = "coin") {
		const T = this.T;
		for (let i = 0; i < (type === "splash" ? 12 : 8); i++) {
			const m = this.mesh(
				this.dynamic,
				type === "coin" ? "star" : "sphere",
				type === "hit" ? "#ef9361" : type === "splash" ? "#a7e9da" : "#f9d977",
				x,
				y,
				1,
				0.08,
				0.08,
				0.08,
			);
			m.material = this.mat(type === "splash" ? "#a7e9da" : "#f3bd61", true);
			this.particles.push({
				m,
				vx: (this.rand() - 0.5) * 6,
				vy: 2 + this.rand() * 5,
				life: 0.6 + this.rand() * 0.4,
			});
		}
	}
	resize(w, h) {
		const aspect = w / h;
		let halfY = 11.2;
		if (aspect < 1.2) halfY = 13.2;
		this.camera.left = -halfY * aspect;
		this.camera.right = halfY * aspect;
		this.camera.top = halfY;
		this.camera.bottom = -halfY;
		this.camera.updateProjectionMatrix();
	}
	update(dt, state) {
		if (state.stage !== undefined && state.stage !== this.stage)
			this.buildStage(state.stage);
		const T = this.T,
			time = state.time || 0;
		const ps = state.players || [];
		for (let i = 0; i < ps.length; i++) {
			const p = ps[i];
			const v = this.players[i] || this.makePlayer(i, p.color);
			v.root.position.set(p.x, p.y, 1.0 + i * 0.25);
			v.root.scale.set(p.facing === -1 ? -1 : 1, p.duck ? 0.62 : 1, 1);
			v.root.visible =
				p.alive !== false &&
				(!(p.invuln > 0) || Math.floor(time * 12) % 2 === 0);
			v.body.rotation.z = p.anim === "swim" ? -0.65 : 0;
			const anim =
				p.attack > 0
					? "attack"
					: p.duck
						? "duck"
						: v.actions[p.anim]
							? p.anim
							: "idle";
			if (v.anim !== anim) {
				v.actions[v.anim]?.fadeOut(0.12);
				v.actions[anim].reset().fadeIn(0.12).play();
				v.anim = anim;
			}
			v.mixer.update(dt);
			v.blade.visible = p.attack > 0;
			let sy =
				this.stage === 1 ? -6.8 : this.stage === 2 ? p.x * 0.04 + 0.06 : 0.06;
			v.shadow.position.set(p.x, sy, 0.5);
			v.shadow.visible =
				p.alive !== false && this.stage !== 0 && this.stage !== 1;
		}
		for (let i = ps.length; i < this.players.length; i++) {
			this.players[i].root.visible = false;
			this.players[i].shadow.visible = false;
		}
		const vines = state.vines || [];
		for (let i = 0; i < vines.length; i++) {
			const v = vines[i];
			let group = this.vineMeshes[i];
			if (!group) {
				group = new T.Group();
				this.dynamic.add(group);
				const rope = this.mesh(
					group,
					"cylinder",
					"#aab964",
					0,
					0,
					0,
					0.065,
					1,
					0.065,
					true,
				);
				const knot = this.mesh(
					group,
					"sphere",
					"#d0bd75",
					0,
					0,
					0,
					0.16,
					0.16,
					0.16,
					true,
				);
				group.userData = { rope, knot };
				this.vineMeshes.push(group);
			}
			const a = new T.Vector3(v.anchorX ?? v.x, v.anchorY ?? 13, 0.4),
				b = new T.Vector3(v.x, v.y, 0.4),
				d = new T.Vector3().subVectors(b, a);
			group.userData.rope.position.copy(a).add(b).multiplyScalar(0.5);
			group.userData.rope.scale.set(0.065, d.length(), 0.065);
			group.userData.rope.quaternion.setFromUnitVectors(
				new T.Vector3(0, 1, 0),
				d.normalize(),
			);
			group.userData.knot.position.copy(b);
			group.visible = true;
		}
		for (let i = vines.length; i < this.vineMeshes.length; i++)
			this.vineMeshes[i].visible = false;
		const active = new Set();
		for (const e of state.enemies || []) {
			active.add(e.id);
			let g = this.enemyMeshes.get(e.id) || this.makeEnemy(e);
			g.visible = !e.dead;
			g.position.set(e.x, e.y, 1);
			if (g.userData.type === "boulder" || g.userData.type === "rock") {
				const r = e.radius || e.r || 1;
				g.scale.setScalar(r);
				g.rotation.z = e.angle || -e.x;
			} else if (g.userData.jaw) {
				g.userData.jaw.rotation.z = e.open ? -0.4 : Math.sin(time * 2) * 0.04;
				g.rotation.z = Math.sin(time * 2 + e.x) * 0.025;
			} else if (g.userData.spear) {
				g.userData.spear.rotation.z = e.open ? -0.9 : 0.13;
				g.rotation.z = Math.sin(time * 4 + e.x) * 0.03;
			}
		}
		for (const [id, g] of this.enemyMeshes)
			if (!active.has(id)) g.visible = false;
		for (let i = 0; i < (state.collectibles || []).length; i++) {
			const c = state.collectibles[i];
			let g = this.coinMeshes[i];
			if (!g) {
				g = new T.Group();
				this.dynamic.add(g);
				this.mesh(g, "torus", "#e9ac42", 0, 0, 0, 0.37, 0.37, 0.25, true);
				this.mesh(g, "star", "#f6d578", 0, 0, 0, 0.26, 0.26, 0.14, true);
				this.coinMeshes.push(g);
			}
			g.visible = !c.taken;
			g.position.set(c.x, c.y + Math.sin(time * 3 + i) * 0.13, 1.1);
			g.rotation.y = time * 1.4;
		}
		for (
			let i = (state.collectibles || []).length;
			i < this.coinMeshes.length;
			i++
		)
			this.coinMeshes[i].visible = false;
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.vy -= dt * 8;
			p.m.position.x += p.vx * dt;
			p.m.position.y += p.vy * dt;
			p.m.rotation.z += dt * 4;
			p.m.scale.setScalar(Math.max(0, p.life) * 0.12);
			if (p.life <= 0) {
				this.dynamic.remove(p.m);
				this.particles.splice(i, 1);
			}
		}
		for (let i = 0; i < this.sways.length; i++) {
			const m = this.sways[i];
			if (m.userData.baseY !== undefined)
				m.position.y =
					m.userData.baseY + Math.sin(time * 0.5 + m.userData.phase) * 0.25;
			else m.rotation.z = Math.sin(time * 1.3 + i) * 0.045;
		}
		for (let i = 0; i < this.water.length; i++) {
			const m = this.water[i];
			if (m.geometry === this.geo("torus")) {
				m.position.y += dt * 0.19;
				if (m.position.y > 2.8) m.position.y = -6;
			} else m.position.y = 3.03 + Math.sin(time * 1.5 + i) * 0.045;
		}
		for (let i = 0; i < (this.bellMeshes || []).length; i++) {
			const b = this.bellMeshes[i];
			b.rotation.z = state.bells?.[i]
				? Math.sin(time * 7) * 0.2
				: Math.sin(time * 1.6) * 0.04;
			b.scale.setScalar(state.bells?.[i] ? 1.12 : 1);
		}
		if (this.rescue) {
			this.rescue.userData.cage.position.y = state.rescued
				? Math.min(7, (state.rescueTime || 0) * 2)
				: 0;
			this.rescue.userData.bird.position.y = state.rescued
				? Math.min(2, (state.rescueTime || 0) * 0.8) + Math.sin(time * 7) * 0.13
				: 0;
			this.rescue.userData.bird.rotation.z = state.rescued
				? Math.sin(time * 5) * 0.1
				: 0;
		}
		const target = state.cameraX ?? (ps[0]?.x ?? 13) + 7;
		const cx = Math.max(9, Math.min(101, target));
		this.camera.position.x +=
			(cx - this.camera.position.x) * Math.min(1, dt * 5);
		const cy = this.stage === 1 ? -0.2 : this.stage === 2 ? 4 + cx * 0.04 : 4.6;
		this.camera.position.y = cy + 5;
		this.camera.position.z = 36;
		this.camera.lookAt(this.camera.position.x, cy, 0);
		this.sunLight.position.set(this.camera.position.x - 12, 26, 18);
		this.sunLight.target.position.set(this.camera.position.x, 0, 0);
	}
}
