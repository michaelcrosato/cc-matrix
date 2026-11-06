// All models and motion are made here. No image or model assets are loaded.
export class Visuals {
	constructor(THREE, scene) {
		this.T = THREE;
		this.scene = scene;
		this.time = 0;
		this.planet = -1;
		this.mixers = [];
		this.effects = [];
		this.maps = {};
		this.ink = new THREE.MeshBasicMaterial({
			color: 0x081421,
			side: THREE.BackSide,
		});
		this.palette = {
			ink: 0x09172b,
			cream: 0xffefc6,
			gold: 0xf6b945,
			cyan: 0x55e5da,
			navy: 0x183e55,
			pink: 0xff6b82,
			mint: 0xa9efbc,
			white: 0xfffae7,
		};
		this.materials = new Map();
		this.root = new THREE.Group();
		scene.add(this.root);
		scene.add(new THREE.HemisphereLight(0xd3f8ff, 0x0b1430, 2.2));
		const key = new THREE.DirectionalLight(0xffe9bc, 3.5);
		key.position.set(-8, 12, 18);
		scene.add(key);
		const rim = new THREE.DirectionalLight(0x63d8ff, 1.4);
		rim.position.set(10, -3, -5);
		scene.add(rim);
		this.buildSpace();
		this.surface = new THREE.Group();
		this.root.add(this.surface);
		this.ark = this.buildArk();
		this.root.add(this.ark);
		this.ship = this.buildShip();
		this.root.add(this.ship);
		this.buildBeam();
		this.buildSight();
		this.shield = new THREE.Mesh(
			new THREE.SphereGeometry(3.45, 40, 20),
			this.basic(0x75f0e8, {
				transparent: true,
				opacity: 0.13,
				depthWrite: false,
				wireframe: true,
			}),
		);
		this.shield.scale.set(1, 0.75, 0.45);
		this.root.add(this.shield);
		this.cargo = [];
		for (let i = 0; i < 2; i++) {
			const c = this.mesh(
				new THREE.SphereGeometry(0.18, 10, 8),
				i ? 0xff9a9c : 0xc6fcae,
				this.ship,
				[-0.34 + i * 0.68, 0.23, 0.72],
				[1, 1, 1],
				true,
			);
			c.visible = false;
			this.cargo.push(c);
		}
		this.setPlanet(0);
	}

	mat(color) {
		if (!this.materials.has(color))
			this.materials.set(
				color,
				new this.T.MeshStandardMaterial({
					color,
					roughness: 1,
					metalness: 0,
					flatShading: true,
				}),
			);
		return this.materials.get(color);
	}
	basic(color, opts = {}) {
		return new this.T.MeshBasicMaterial({ color, ...opts });
	}
	mesh(geo, color, parent, pos = [0, 0, 0], scale = [1, 1, 1], outline = true) {
		const m = new this.T.Mesh(
			geo,
			typeof color === "number" ? this.mat(color) : color,
		);
		m.position.set(...pos);
		m.scale.set(...scale);
		parent.add(m);
		if (outline) {
			const edge = new this.T.Mesh(geo, this.ink);
			edge.scale.setScalar(1.055);
			m.add(edge);
		}
		return m;
	}
	sphere(parent, color, pos, scale, detail = 1) {
		return this.mesh(
			new this.T.IcosahedronGeometry(1, detail),
			color,
			parent,
			pos,
			scale,
		);
	}
	box(parent, color, pos, scale) {
		return this.mesh(
			new this.T.BoxGeometry(1, 1, 1),
			color,
			parent,
			pos,
			scale,
		);
	}
	torus(parent, color, pos, radius, tube, rot = [0, 0, 0]) {
		const m = this.mesh(
			new this.T.TorusGeometry(radius, tube, 6, 48),
			color,
			parent,
			pos,
			[1, 1, 1],
			false,
		);
		m.rotation.set(...rot);
		return m;
	}
	rod(parent, color, a, b, r = 0.05) {
		const av = new this.T.Vector3(...a),
			bv = new this.T.Vector3(...b),
			delta = bv.clone().sub(av);
		const m = this.mesh(
			new this.T.CylinderGeometry(r, r, delta.length(), 6),
			color,
			parent,
			av.clone().add(bv).multiplyScalar(0.5).toArray(),
			[1, 1, 1],
			false,
		);
		m.quaternion.setFromUnitVectors(
			new this.T.Vector3(0, 1, 0),
			delta.normalize(),
		);
		return m;
	}
	buildSpace() {
		const T = this.T;
		// Two layers of geometric stars keep the scene sharp at television distance.
		const starG = new T.SphereGeometry(1, 5, 3),
			starM = this.basic(0xfff4cc);
		this.stars = new T.InstancedMesh(starG, starM, 430);
		const d = new T.Object3D();
		let seed = 1249;
		const rand = () => {
			seed = (seed * 16807) % 2147483647;
			return seed / 2147483647;
		};
		for (let i = 0; i < 430; i++) {
			d.position.set(
				(rand() - 0.5) * 86,
				(rand() - 0.5) * 52,
				-16 - rand() * 10,
			);
			d.scale.setScalar(0.015 + rand() * 0.04);
			d.updateMatrix();
			this.stars.setMatrixAt(i, d.matrix);
			this.stars.setColorAt(
				i,
				new T.Color().setHSL(0.48 + rand() * 0.22, 0.35, 0.4 + rand() * 0.5),
			);
		}
		this.root.add(this.stars);
		const dustGeo = new T.BufferGeometry();
		const pts = [];
		for (let i = 0; i < 450; i++) {
			const x = (rand() - 0.5) * 80;
			pts.push(x, -0.14 * x + Math.sin(x * 0.1) * 2 + (rand() - 0.5) * 6, -29);
		}
		dustGeo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
		this.root.add(
			new T.Points(
				dustGeo,
				new T.PointsMaterial({
					color: 0x526b91,
					size: 0.035,
					transparent: true,
					opacity: 0.52,
				}),
			),
		);
		this.distant = new T.Group();
		this.distant.position.set(13, 6, -18);
		this.root.add(this.distant);
		this.sphere(this.distant, 0x35536f, [0, 0, 0], [4.3, 4.3, 4.3], 2);
		this.sphere(
			this.distant,
			0x20314c,
			[-1, -0.45, 0.7],
			[3.95, 3.95, 3.95],
			2,
		);
		this.torus(
			this.distant,
			0x608d97,
			[0, 0, 0],
			6,
			0.19,
			[1.08, -0.18, -0.23],
		);
		this.torus(
			this.distant,
			0x1b334d,
			[0, 0, 0],
			6.5,
			0.07,
			[1.08, -0.18, -0.23],
		);
		this.torus(
			this.distant,
			0xa1c1ac,
			[0, 0, 0],
			5.65,
			0.09,
			[1.08, -0.18, -0.23],
		);
		const halftone = new T.InstancedMesh(
			new T.CircleGeometry(0.055, 7),
			this.basic(0x152d46),
			210,
		);
		for (let i = 0; i < 210; i++) {
			const x = -3.65 + (i % 15) * 0.35,
				y = -2.6 + Math.floor(i / 15) * 0.38,
				z = Math.sqrt(Math.max(0, 18 - x * x - y * y));
			d.position.set(x, y, z + 0.11);
			d.scale.setScalar(Math.max(0.15, 0.7 + (x + 2) * 0.09));
			d.rotation.set(0, 0, 0);
			d.updateMatrix();
			halftone.setMatrixAt(i, d.matrix);
		}
		this.distant.add(halftone);
		this.sun = new T.Group();
		this.sun.position.set(-14, 8, -21);
		this.root.add(this.sun);
		this.sphere(this.sun, this.basic(0xffb752), [0, 0, 0], [2.3, 2.3, 1], 2);
		this.sphere(
			this.sun,
			this.basic(0xf56f54),
			[0.2, -0.12, 0.3],
			[1.9, 1.9, 1],
			2,
		);
		this.sphere(
			this.sun,
			this.basic(0xe24d51),
			[0.5, -0.4, 0.7],
			[1.4, 1.45, 0.7],
			1,
		);
		for (let i = 0; i < 14; i++) {
			const a = (i * Math.PI) / 7;
			const r = 2.8 + (i % 3) * 0.17;
			const ray = this.mesh(
				new T.ConeGeometry(0.18, 0.85, 3),
				this.basic(0xfbb360),
				this.sun,
				[Math.cos(a) * r, Math.sin(a) * r, 0],
				[1, 1, 1],
				false,
			);
			ray.rotation.z = a - Math.PI / 2;
		}
		this.torus(this.sun, this.basic(0xad4c55), [0, 0, -0.3], 3.4, 0.025);
		this.torus(this.sun, this.basic(0x563d59), [0, 0, -0.3], 3.65, 0.015);
		// An orbital arc acts like printed ink on a star chart.
		const arc = [];
		for (let i = 0; i <= 100; i++) {
			let a = 0.1 + (i / 100) * 2.7;
			arc.push(new T.Vector3(Math.cos(a) * 32, -16 + Math.sin(a) * 30, -23));
		}
		this.root.add(
			new T.Line(
				new T.BufferGeometry().setFromPoints(arc),
				new T.LineBasicMaterial({
					color: 0x26445e,
					transparent: true,
					opacity: 0.5,
				}),
			),
		);
		this.orbitalSpecks = new T.Group();
		this.root.add(this.orbitalSpecks);
		for (let i = 0; i < 26; i++) {
			const g = new T.Group();
			g.position.set(
				-22 + ((i * 3.47) % 44),
				-11 + ((i * 2.91) % 23),
				-4 - (i % 6),
			);
			const speck = this.mesh(
				new T.OctahedronGeometry(0.06 + (i % 3) * 0.035),
				this.basic(i % 3 ? 0x376278 : 0xc9c991),
				g,
				[0, 0, 0],
				[1, 1, 1],
				false,
			);
			speck.userData.home = g.position.clone();
			this.orbitalSpecks.add(g);
		}
	}
	buildArk() {
		const T = this.T,
			P = this.palette,
			g = new T.Group(),
			body = new T.Group();
		g.add(body);
		this.arkBody = body;
		this.sphere(body, P.gold, [0, -0.13, 0], [2.8, 0.83, 0.92], 1);
		this.sphere(body, P.navy, [0, 0.35, 0.03], [2.27, 0.85, 0.77], 1);
		this.sphere(body, P.cream, [0, 0.13, 0.76], [2.33, 0.43, 0.3], 1);
		this.sphere(body, P.navy, [0, -0.25, 0.83], [1.45, 0.28, 0.2], 1);
		this.sphere(body, 0x61c9c2, [0, 0.66, 0.13], [1.35, 0.56, 0.7], 1);
		this.sphere(body, 0x174257, [0.28, 0.64, 0.63], [0.96, 0.34, 0.3], 1);
		this.box(body, P.gold, [0, 0.23, 0.99], [2.75, 0.12, 0.08]);
		for (let i = -2; i <= 2; i++)
			this.sphere(
				body,
				this.basic(P.gold),
				[i * 0.52, 0.4, 0.96],
				[0.105, 0.14, 0.05],
				1,
			);
		for (let side of [-1, 1]) {
			this.box(body, P.navy, [side * 2, -0.4, 0.18], [0.52, 0.9, 0.55]);
			this.box(body, P.cream, [side * 2, -0.35, 0.49], [0.55, 0.24, 0.16]);
			this.box(body, P.gold, [side * 2.65, -0.02, 0.05], [0.38, 0.38, 0.44]);
			this.sphere(
				body,
				this.basic(P.cyan),
				[side * 2.85, -0.02, 0.11],
				[0.12, 0.18, 0.22],
			);
			this.box(body, P.gold, [side * 1.8, 0.95, 0.1], [0.12, 0.7, 0.15]);
			this.sphere(
				body,
				this.basic(P.pink),
				[side * 1.8, 1.31, 0.1],
				[0.12, 0.12, 0.12],
			);
			const engine = new T.Group();
			engine.position.set(side * 2, -0.95, 0.2);
			engine.name = side < 0 ? "EngineL" : "EngineR";
			body.add(engine);
			this.mesh(
				new T.ConeGeometry(0.22, 0.65, 8),
				this.basic(P.cyan),
				engine,
				[0, -0.2, 0],
				[1, 1, 1],
				false,
			).rotation.z = Math.PI;
			this.sphere(
				engine,
				this.basic(P.cream),
				[0, -0.1, 0.1],
				[0.1, 0.35, 0.1],
				0,
			);
			for (let k = 0; k < 3; k++)
				this.sphere(
					engine,
					this.basic(P.cyan, {
						transparent: true,
						opacity: 0.24 - k * 0.06,
						depthWrite: false,
					}),
					[0, -0.55 - k * 0.25, -0.05],
					[0.12 - k * 0.025, 0.15, 0.1],
					0,
				);
		}
		this.box(body, P.gold, [0, 1.25, 0], [0.32, 0.5, 0.34]);
		this.sphere(body, P.cream, [0, 1.52, 0], [0.22, 0.12, 0.24]);
		this.box(body, P.navy, [0, -0.82, 0.07], [0.7, 0.35, 0.75]);
		this.box(body, this.basic(P.cyan), [0, -1.01, 0.5], [0.47, 0.07, 0.08]);
		this.antenna = new T.Group();
		this.antenna.position.set(0.75, 1.03, 0);
		this.antenna.name = "Antenna";
		body.add(this.antenna);
		this.rod(this.antenna, P.cream, [0, 0, 0], [0.12, 0.75, 0], 0.04);
		this.torus(this.antenna, P.gold, [0.12, 0.75, 0], 0.18, 0.045, [0, 0.5, 0]);
		const clip = new T.AnimationClip("mothership-alive", 2.4, [
			new T.NumberKeyframeTrack(
				"Antenna.rotation[z]",
				[0, 1.2, 2.4],
				[-0.13, 0.13, -0.13],
			),
			new T.VectorKeyframeTrack(
				"EngineL.scale",
				[0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4],
				[
					1, 1, 1, 1, 0.67, 1, 1, 1.1, 1, 1, 0.8, 1, 1, 1.05, 1, 1, 0.7, 1, 1,
					1.1, 1, 1, 0.7, 1, 1, 1, 1,
				],
			),
			new T.VectorKeyframeTrack(
				"EngineR.scale",
				[0, 0.6, 1.2, 1.8, 2.4],
				[1, 0.7, 1, 1, 1.05, 1, 1, 0.8, 1, 1, 1.15, 1, 1, 0.7, 1],
			),
		]);
		const mixer = new T.AnimationMixer(body);
		mixer.clipAction(clip).play();
		this.mixers.push(mixer);
		return g;
	}
	buildShip() {
		const T = this.T,
			P = this.palette,
			g = new T.Group();
		this.sphere(g, P.cream, [0, -0.08, 0], [1, 0.3, 0.57], 1);
		this.sphere(g, P.cyan, [0, 0.2, 0], [0.65, 0.43, 0.45], 1);
		this.sphere(g, P.navy, [0.04, 0.27, 0.35], [0.48, 0.23, 0.25], 1);
		this.box(g, P.gold, [0, -0.25, 0.28], [0.58, 0.18, 0.5]);
		this.sphere(g, this.basic(0xc3fff0), [0, -0.37, 0.2], [0.25, 0.08, 0.21]);
		for (let s of [-1, 1]) {
			this.sphere(g, P.gold, [s * 0.75, -0.12, 0.3], [0.17, 0.13, 0.19]);
			this.rod(g, P.ink, [s * 0.48, -0.2, 0], [s * 0.65, -0.48, 0], 0.045);
			this.box(g, P.navy, [s * 0.65, -0.47, 0], [0.28, 0.08, 0.18]);
		}
		this.shipThruster = this.mesh(
			new T.ConeGeometry(0.18, 0.6, 7),
			this.basic(P.cyan),
			g,
			[0, -0.48, -0.05],
			[1, 1, 1],
			false,
		);
		this.shipThruster.rotation.z = Math.PI;
		return g;
	}
	buildBeam() {
		const T = this.T;
		this.beam = new T.Group();
		this.root.add(this.beam);
		this.beamCone = new T.Mesh(
			new T.ConeGeometry(1, 1, 24, 1, true),
			this.basic(0x7fffe1, {
				transparent: true,
				opacity: 0.15,
				side: T.DoubleSide,
				depthWrite: false,
			}),
		);
		this.beam.add(this.beamCone);
		this.beamRings = [];
		for (let i = 0; i < 7; i++) {
			const r = this.torus(
				this.beam,
				this.basic(0x7fffe1, { transparent: true, opacity: 0.5 }),
				[0, 0, 0],
				1,
				0.018,
				[Math.PI / 2, 0, 0],
			);
			this.beamRings.push(r);
		}
		this.beam.visible = false;
	}
	buildSight() {
		const T = this.T;
		this.sight = new T.Group();
		this.root.add(this.sight);
		this.reticle = this.torus(
			this.sight,
			this.basic(0xfad277, { transparent: true, opacity: 0.5 }),
			[0, 0, 0],
			0.35,
			0.025,
		);
		this.sightLine = new T.Line(
			new T.BufferGeometry().setFromPoints([
				new T.Vector3(),
				new T.Vector3(0, 4, 0),
			]),
			new T.LineDashedMaterial({
				color: 0xf6b945,
				dashSize: 0.12,
				gapSize: 0.17,
				transparent: true,
				opacity: 0.33,
			}),
		);
		this.sightLine.computeLineDistances();
		this.sight.add(this.sightLine);
	}
	setPlanet(index = 0) {
		if (this.planet === index) return;
		this.planet = index;
		this.surface.clear();
		for (const x of Object.values(this.maps.creatures || {})) {
			this.root.remove(x);
			if (x.userData.mixer) {
				x.userData.mixer.stopAllAction();
				this.mixers = this.mixers.filter((m) => m !== x.userData.mixer);
			}
		}
		this.maps.creatures = {};
		const T = this.T;
		const schemes = [
			{
				top: 0x438779,
				edge: 0x7cb38a,
				body: 0x1b4247,
				deep: 0x102b39,
				plant: 0xf2b66f,
				leaf: 0x88d1a4,
				gem: 0x6be0d4,
			},
			{
				top: 0x6aa4be,
				edge: 0xc2e9df,
				body: 0x284b70,
				deep: 0x152d4c,
				plant: 0xc0acff,
				leaf: 0x8fc8df,
				gem: 0xe6a7f2,
			},
			{
				top: 0xa65654,
				edge: 0xeb9f6b,
				body: 0x552e4e,
				deep: 0x291d37,
				plant: 0xf5c24f,
				leaf: 0xff8562,
				gem: 0x9ef0d0,
			},
		];
		this.scheme = schemes[index % 3];
		const s = this.scheme;
		const shape = new T.Shape();
		shape.moveTo(-30, -100);
		shape.lineTo(-30, -8.8);
		for (let i = 0; i <= 40; i++)
			shape.lineTo(-30 + i * 1.5, -8.4 + Math.sin(i * 1.72) * 0.18);
		shape.lineTo(30, -100);
		shape.closePath();
		this.mesh(
			new T.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false }),
			s.body,
			this.surface,
			[0, 0, -1.8],
			[1, 1, 1],
			true,
		);
		const geology = new T.BufferGeometry(),
			geologyPositions = [],
			geologyColors = [];
		const depths = [-9, -18, -100],
			colors = [new T.Color(s.body), new T.Color(s.deep), new T.Color(s.deep)];
		for (let row = 0; row < depths.length - 1; row++) {
			const a = [-30, depths[row], 1.22],
				b = [30, depths[row], 1.22],
				c = [-30, depths[row + 1], 1.22],
				d = [30, depths[row + 1], 1.22];
			geologyPositions.push(...a, ...c, ...b, ...b, ...c, ...d);
			for (const color of [
				colors[row],
				colors[row + 1],
				colors[row],
				colors[row],
				colors[row + 1],
				colors[row + 1],
			])
				geologyColors.push(color.r, color.g, color.b);
		}
		geology.setAttribute(
			"position",
			new T.Float32BufferAttribute(geologyPositions, 3),
		);
		geology.setAttribute(
			"color",
			new T.Float32BufferAttribute(geologyColors, 3),
		);
		geology.computeVertexNormals();
		this.surface.add(
			new T.Mesh(
				geology,
				new T.MeshStandardMaterial({
					vertexColors: true,
					roughness: 1,
					flatShading: true,
				}),
			),
		);
		// Printed horizontal strata and glowing root threads.
		for (let layer = 0; layer < 3; layer++) {
			const line = [];
			for (let i = 0; i <= 40; i++)
				line.push(
					new T.Vector3(
						-30 + i * 1.5,
						-9.2 - layer * 0.65 + Math.sin(i * 0.9 + layer) * 0.1,
						1.25,
					),
				);
			this.surface.add(
				new T.Line(
					new T.BufferGeometry().setFromPoints(line),
					new T.LineBasicMaterial({ color: layer === 0 ? s.edge : s.deep }),
				),
			);
		}
		const stipple = new T.InstancedMesh(
				new T.CircleGeometry(0.037, 6),
				this.basic(s.deep),
				300,
			),
			stamp = new T.Object3D();
		for (let i = 0; i < 300; i++) {
			stamp.position.set(
				-25 + (i % 75) * 0.68,
				-9.4 - Math.floor(i / 75) * 0.24,
				1.24,
			);
			stamp.updateMatrix();
			stipple.setMatrixAt(i, stamp.matrix);
		}
		this.surface.add(stipple);
		for (let i = 0; i < 52; i++) {
			const x = -28 + i * 1.1,
				z = 1.1 + Math.sin(i * 3.4) * 0.7,
				y = -8.38;
			this.sphere(
				this.surface,
				i % 3 ? s.top : s.edge,
				[x, y - 0.05, z],
				[0.72, 0.15, 0.44],
				0,
			);
		}
		// Mountains sit behind the navigable plane.
		for (let i = 0; i < 14; i++) {
			const x = -26 + i * 4.1,
				h = 1.7 + ((i * 17) % 13) * 0.28;
			const m = this.mesh(
				new T.ConeGeometry(2.8, h, 4),
				i % 2 ? s.deep : s.body,
				this.surface,
				[x, -8.4 + h / 2, -6],
				[1, 1, 0.8],
				true,
			);
			m.rotation.y = i * 0.7;
			this.mesh(
				new T.ConeGeometry(1.1, h * 0.36, 4),
				s.top,
				this.surface,
				[x, -8.4 + h * 0.83, -5.9],
				[1, 1, 0.8],
				false,
			).rotation.y = i * 0.7;
		}
		for (let i = 0; i < 22; i++) {
			const x = -25 + ((i * 7.13) % 50);
			if (Math.abs(x) < 3) continue;
			const plant = new T.Group();
			plant.position.set(x, -8.35, -0.9 - (i % 3) * 1.1);
			plant.scale.setScalar(0.6 + (i % 4) * 0.17);
			this.surface.add(plant);
			if (index === 0) {
				this.rod(plant, s.plant, [0, 0, 0], [0.09, 1.1, 0], 0.08);
				const cap = this.sphere(
					plant,
					s.plant,
					[0.09, 1.15, 0],
					[0.72, 0.35, 0.55],
					1,
				);
				this.sphere(plant, s.edge, [0.08, 1.06, 0.1], [0.68, 0.12, 0.5], 1);
				for (let k = 0; k < 3; k++)
					this.sphere(
						plant,
						0xfff0bf,
						[-0.3 + k * 0.3, 1.29, 0.35],
						[0.07, 0.06, 0.035],
						0,
					);
			} else if (index === 1) {
				for (let k = 0; k < 3; k++) {
					const c = this.mesh(
						new T.ConeGeometry(0.2, 0.9 + k * 0.3, 5),
						k % 2 ? s.leaf : s.gem,
						plant,
						[(k - 1) * 0.23, 0.48 + k * 0.12, 0],
						[1, 1, 1],
						true,
					);
					c.rotation.z = (k - 1) * -0.22;
				}
			} else {
				this.rod(plant, s.leaf, [0, 0, 0], [0, 1.2, 0], 0.07);
				for (let k = 0; k < 4; k++) {
					const a = (k * Math.PI) / 2;
					const leaf = this.sphere(
						plant,
						s.plant,
						[Math.cos(a) * 0.32, 1.1 + Math.sin(a) * 0.25, 0],
						[0.34, 0.13, 0.16],
						0,
					);
					leaf.rotation.z = a;
				}
				this.sphere(plant, s.gem, [0, 1.1, 0.15], [0.15, 0.15, 0.12], 0);
			}
		}
		// Defense pylons are part of the world, with unmistakable pink warning lenses.
		this.pylons = [];
		for (let side of [-1, 1]) {
			const g = new T.Group();
			g.position.set(side * 15, -5.5, 0);
			this.surface.add(g);
			this.box(g, this.palette.ink, [0, -1.7, -0.3], [0.8, 2.3, 0.8]);
			this.box(g, s.edge, [0, -1.65, 0.12], [0.23, 2.1, 0.2]);
			this.sphere(g, s.body, [0, 0, 0], [0.6, 0.8, 0.5], 0);
			this.torus(g, this.palette.pink, [0, 0, 0.5], 0.29, 0.1);
			this.sphere(g, this.basic(0xff9db1), [0, 0, 0.56], [0.17, 0.17, 0.05], 0);
			for (let k = 0; k < 3; k++)
				this.box(
					g,
					this.palette.gold,
					[0, -1 + k * 0.3, 0.42],
					[0.35, 0.08, 0.04],
				);
			this.pylons.push(g);
		}
		this.distant.children[0].material = this.mat(
			[0x35536f, 0x59557b, 0x805557][index % 3],
		);
	}
	makeCreature(id) {
		const T = this.T,
			P = this.palette,
			g = new T.Group(),
			body = new T.Group();
		g.add(body);
		body.name = "CritterBody";
		const idx = this.planet % 3,
			alt = String(id).charCodeAt(String(id).length - 1) % 2;
		const color =
			idx === 0
				? alt
					? 0xbee393
					: 0xf7bd87
				: idx === 1
					? alt
						? 0xc4b4ff
						: 0x95dfed
					: alt
						? 0xffca66
						: 0xf9a2aa;
		this.sphere(body, color, [0, 0.18, 0], [0.48, 0.53, 0.32], 1);
		this.sphere(body, P.cream, [0, 0.02, 0.27], [0.3, 0.29, 0.1], 1);
		for (let side of [-1, 1]) {
			this.sphere(
				body,
				P.ink,
				[side * 0.18, 0.35, 0.32],
				[0.105, 0.14, 0.05],
				1,
			);
			this.sphere(
				body,
				this.basic(P.white),
				[side * 0.18 - 0.018, 0.39, 0.365],
				[0.035, 0.045, 0.02],
				0,
			);
			this.sphere(
				body,
				idx === 2 ? 0xe8736b : color,
				[side * 0.25, -0.26, 0.08],
				[0.21, 0.15, 0.23],
				1,
			);
			this.sphere(
				body,
				idx === 2 ? 0xff805a : color,
				[side * 0.43, 0.1, 0.02],
				[0.14, 0.27, 0.16],
				1,
			).rotation.z = side * 0.6;
			if (idx === 0) {
				const leaf = this.sphere(
					body,
					0x70c69c,
					[side * 0.33, 0.79, -0.02],
					[0.18, 0.37, 0.08],
					0,
				);
				leaf.rotation.z = -side * 0.5;
			} else if (idx === 1) {
				this.rod(
					body,
					color,
					[side * 0.28, 0.54, 0],
					[side * 0.43, 1.02, 0],
					0.045,
				);
				this.rod(
					body,
					color,
					[side * 0.36, 0.78, 0],
					[side * 0.62, 0.93, 0],
					0.035,
				);
				this.sphere(
					body,
					0xebd4ff,
					[side * 0.43, 1.02, 0],
					[0.07, 0.09, 0.07],
					0,
				);
			} else {
				const ear = this.sphere(
					body,
					color,
					[side * 0.23, 0.94, 0],
					[0.16, 0.55, 0.13],
					1,
				);
				ear.rotation.z = -side * 0.24;
				this.sphere(
					body,
					0xe8787b,
					[side * 0.23, 1, 0.12],
					[0.065, 0.31, 0.035],
					0,
				).rotation.z = -side * 0.24;
			}
		}
		this.sphere(body, 0x70333f, [0, 0.14, 0.365], [0.07, 0.04, 0.035], 0);
		this.sphere(body, 0xf29093, [-0.32, 0.2, 0.28], [0.075, 0.045, 0.045], 0);
		this.sphere(body, 0xf29093, [0.32, 0.2, 0.28], [0.075, 0.045, 0.045], 0);
		const clip = new T.AnimationClip("critter-wiggle", 1.15, [
			new T.VectorKeyframeTrack(
				"CritterBody.position",
				[0, 0.28, 0.56, 0.85, 1.15],
				[0, 0, 0, 0, 0.11, 0, 0, 0, 0, 0, 0.07, 0, 0, 0, 0],
			),
			new T.VectorKeyframeTrack(
				"CritterBody.scale",
				[0, 0.28, 0.56, 0.85, 1.15],
				[1, 0.92, 1, 0.94, 1.07, 1, 1.04, 0.93, 1, 0.97, 1.03, 1, 1, 0.92, 1],
			),
			new T.NumberKeyframeTrack(
				"CritterBody.rotation[z]",
				[0, 0.56, 1.15],
				[-0.065, 0.065, -0.065],
			),
		]);
		const mix = new T.AnimationMixer(g);
		mix.clipAction(clip).play().time = alt * 0.5;
		this.mixers.push(mix);
		g.userData.mixer = mix;
		const ring = this.torus(
			g,
			this.basic(0xbaffd2, { transparent: true, opacity: 0.65 }),
			[0, -0.35, 0],
			0.65,
			0.028,
			[Math.PI / 2, 0, 0],
		);
		g.userData.ring = ring;
		this.root.add(g);
		return g;
	}
	makeMeteor(data) {
		const T = this.T,
			g = new T.Group(),
			r = data.r || 0.48;
		const geo = new T.IcosahedronGeometry(1, 1);
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const f = 0.89 + 0.17 * Math.sin(i * 21.43 + Number(data.id || 1));
			pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
		}
		geo.computeVertexNormals();
		this.mesh(
			geo,
			data.armored ? 0x90a7ae : data.waver ? 0xd78fa1 : 0xa77368,
			g,
			[0, 0, 0],
			[r, r, r],
			true,
		);
		this.sphere(
			g,
			0x614a57,
			[-r * 0.25, r * 0.25, r * 0.76],
			[r * 0.25, r * 0.19, r * 0.08],
			0,
		);
		this.sphere(
			g,
			0xdeb093,
			[r * 0.35, -r * 0.22, r * 0.75],
			[r * 0.16, r * 0.12, r * 0.08],
			0,
		);
		if (data.armored) {
			this.torus(g, 0xf6c75f, [0, 0, 0], r * 1.06, r * 0.09, [0, 0.15, 0.2]);
			this.torus(g, 0x536d87, [0, 0, 0], r * 1.07, r * 0.065, [1.15, 0, -0.4]);
		}
		if (data.waver)
			this.torus(g, this.basic(0xf4a8f3), [0, 0, 0], r * 1.25, 0.025);
		const trail = this.mesh(
			new T.ConeGeometry(r * 0.63, r * 2.9, 6),
			this.basic(data.waver ? 0xe4a2f9 : 0xf6b06f, {
				transparent: true,
				opacity: 0.45,
				depthWrite: false,
			}),
			g,
			[0, r * 1.35, -0.2],
			[1, 1, 1],
			false,
		);
		trail.rotation.z = Math.PI;
		g.userData.trail = trail;
		g.userData.r = r;
		this.root.add(g);
		return g;
	}
	makeBolt(data, hazard = false) {
		const T = this.T,
			g = new T.Group(),
			color = hazard ? 0xff7799 : 0xffefb0;
		if (data.kind === "warning") {
			const side = data.side || Math.sign(data.x) || 1;
			const line = new T.Line(
				new T.BufferGeometry().setFromPoints([
					new T.Vector3(),
					new T.Vector3(-side * 31.4, 0, 0),
				]),
				new T.LineDashedMaterial({
					color: 0xff7196,
					dashSize: 0.28,
					gapSize: 0.3,
					transparent: true,
					opacity: 0.65,
				}),
			);
			line.computeLineDistances();
			g.add(line);
			this.torus(g, this.basic(0xff89a8), [0, 0, 0], 0.47, 0.07);
			const arrow = this.mesh(
				new T.ConeGeometry(0.16, 0.5, 3),
				this.basic(0xff9ab4),
				g,
				[-side * 0.8, 0, 0],
				[1, 1, 1],
				false,
			);
			arrow.rotation.z = (side * Math.PI) / 2;
			g.userData.warning = true;
			this.root.add(g);
			return g;
		}
		this.sphere(
			g,
			this.basic(color),
			[0, 0, 0],
			hazard ? [0.19, 0.19, 0.17] : [0.1, 0.35, 0.1],
			0,
		);
		this.sphere(
			g,
			this.basic(hazard ? 0xf65784 : 0xffc964, {
				transparent: true,
				opacity: 0.27,
				depthWrite: false,
			}),
			[0, 0, 0],
			hazard ? [0.34, 0.34, 0.2] : [0.18, 0.6, 0.12],
			0,
		);
		if (hazard) this.torus(g, this.basic(0xff7599), [0, 0, 0], 0.25, 0.025);
		this.root.add(g);
		return g;
	}
	syncList(name, list, create, update) {
		const map = this.maps[name] || (this.maps[name] = {}),
			alive = new Set();
		for (const data of list || []) {
			const key = String(data.id);
			alive.add(key);
			if (!map[key]) map[key] = create.call(this, data);
			update.call(this, map[key], data);
		}
		for (const key of Object.keys(map))
			if (!alive.has(key)) {
				this.root.remove(map[key]);
				if (map[key].userData.mixer) {
					const m = map[key].userData.mixer;
					m.stopAllAction();
					this.mixers = this.mixers.filter((x) => x !== m);
				}
				delete map[key];
			}
	}
	applyState(state) {
		this.update(0, state);
	}
	update(dt, state = {}) {
		this.time += dt;
		const t = state.time ?? this.time;
		for (const mixer of this.mixers) mixer.update(dt);
		if (state.planet !== undefined) this.setPlanet(state.planet);
		const phase = state.phase || "title",
			rescue = ["rescue", "title"].includes(phase);
		this.surface.visible = rescue;
		this.sun.rotation.z = Math.sin(t * 0.09) * 0.07;
		this.sun.scale.setScalar(1 + Math.sin(t * 0.3) * 0.015);
		this.distant.rotation.z = -0.09 + Math.sin(t * 0.035) * 0.025;
		this.orbitalSpecks.children.forEach((g, i) => {
			const home = g.children[0].userData.home;
			g.position.x = home.x + Math.sin(t * 0.09 + i) * 0.35;
			g.position.y = home.y + Math.sin(t * 0.19 + i * 2) * 0.18;
			g.rotation.z = t * 0.1 + i;
		});
		const ark = state.ark || { x: 0, y: 5 };
		this.ark.position.set(ark.x ?? 0, ark.y ?? 5, 0);
		this.arkBody.position.y = Math.sin(t * 1.4) * 0.045;
		this.arkBody.rotation.z = Math.sin(t * 0.6) * 0.013;
		this.ark.visible = true;
		const ship = state.ship || { x: 0, y: 3 };
		this.ship.position.set(ship.x ?? 0, ship.y ?? 3, 1);
		this.ship.rotation.z = Math.max(
			-0.19,
			Math.min(0.19, -(ship.vx || 0) * 0.028),
		);
		this.ship.visible = rescue || phase === "escape";
		this.shipThruster.scale.y =
			0.65 + Math.sin(t * 34) * 0.2 + Math.min(1, Math.abs(ship.vy || 0) * 0.1);
		if (state.invulnerable > 0) this.ship.visible = Math.sin(t * 30) > -0.3;
		this.shield.visible = (state.shield || 0) > 0;
		this.shield.position.copy(rescue ? this.ship.position : this.ark.position);
		this.shield.rotation.z = t * 0.4;
		this.shield.scale.set(
			rescue ? 0.46 : 1,
			rescue ? 0.46 : 0.75,
			rescue ? 0.3 : 0.45,
		);
		this.sight.visible = phase === "defense" || phase === "escape";
		const ax = state.aim?.x ?? 0,
			ay = state.aim?.y ?? 1;
		const al = Math.hypot(ax, ay) || 1;
		this.sight.position.set(ark.x || 0, ark.y || 0, 0.3);
		this.sight.rotation.z = -Math.atan2(ax, ay);
		this.reticle.position.set(0, 4.3, 0);
		this.beam.visible = rescue && !!state.beam;
		if (this.beam.visible) {
			const h = Math.max(0.4, (ship.y ?? 3) + 7.9);
			this.beam.position.set(ship.x || 0, -7.9 + h / 2, 0.4);
			this.beamCone.scale.set(1.1, h, 1.1);
			this.beamCone.material.opacity = 0.11 + Math.sin(t * 24) * 0.025;
			this.beamRings.forEach((r, i) => {
				const p = (t * 0.75 + i / 7) % 1;
				r.position.set(0, (p - 0.5) * h, 0);
				r.scale.setScalar(1.05 * (1 - p) + 0.08);
			});
		}
		this.pylons.forEach((p, i) => {
			p.children[2].rotation.z = Math.sin(t + i) * 0.08;
		});
		this.syncList(
			"creatures",
			state.creatures || [],
			function (d) {
				return this.makeCreature(d.id);
			},
			function (g, d) {
				g.position.set(
					d.x,
					d.y -
						0.4 +
						(d.progress || 0) * Math.max(0, (ship.y ?? 3) - d.y - 0.4),
					1.2,
				);
				g.visible = !d.captured && !d.saved;
				g.userData.ring.visible = !!d.progress;
				g.userData.ring.scale.setScalar(1 + (d.progress || 0) * 0.4);
			},
		);
		this.cargo.forEach(
			(c, i) =>
				(c.visible =
					rescue &&
					(state.cargo ??
						(state.creatures || []).filter((x) => x.captured && !x.saved)
							.length) > i),
		);
		this.syncList(
			"meteors",
			state.meteors || [],
			this.makeMeteor,
			function (g, d) {
				g.position.set(d.x, d.y, 1);
				g.rotation.z = t * (d.waver ? 1.2 : 0.5) + (Number(d.id) || 0);
				const vx = d.vx ?? -d.x,
					vy = d.vy ?? -d.y;
				g.userData.trail.rotation.z = Math.atan2(-vx, vy);
				g.userData.trail.position.set(
					-Math.sign(vx) * g.userData.r * 0.7,
					-Math.sign(vy) * g.userData.r * 0.7,
					-0.2,
				);
			},
		);
		this.syncList(
			"bolts",
			state.bolts || [],
			function (d) {
				return this.makeBolt(d);
			},
			function (g, d) {
				g.position.set(d.x, d.y, 1);
				g.rotation.z = -Math.atan2(d.vx || 0, d.vy || 1);
			},
		);
		this.syncList(
			"hazards",
			state.hazards || [],
			function (d) {
				return this.makeBolt(d, true);
			},
			function (g, d) {
				g.position.set(d.x, d.y, 1.2);
				g.rotation.z = g.userData.warning ? 0 : t * 5;
				if (g.userData.warning)
					g.children[0].material.opacity = 0.35 + Math.sin(t * 19) * 0.3;
			},
		);
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const e = this.effects[i];
			e.age += dt;
			const p = e.age / e.life;
			if (p >= 1) {
				this.root.remove(e.group);
				this.effects.splice(i, 1);
				continue;
			}
			e.group.children.forEach((m, k) => {
				const v = m.userData.v;
				if (v) {
					m.position.x += v.x * dt;
					m.position.y += v.y * dt;
					v.y -= dt * 2;
					m.rotation.z += dt * 3;
					m.scale.setScalar((1 - p) * m.userData.size);
				} else m.scale.setScalar(0.2 + p * e.radius);
				if (m.material.transparent) m.material.opacity = (1 - p) * 0.8;
			});
		}
	}
	spawnEffect(type, x, y, color) {
		const T = this.T,
			g = new T.Group();
		g.position.set(x, y, 2);
		this.root.add(g);
		const good = ["rescue", "dock", "beam", "shield"].includes(type),
			c = color ?? (good ? 0x92ffdc : type === "hit" ? 0xff6388 : 0xffcf6d),
			count = type === "warp" ? 32 : 18;
		for (let i = 0; i < count; i++) {
			const a = (i / count) * Math.PI * 2,
				s = 2 + ((i * 7) % 9) * 0.3;
			const m = this.mesh(
				new T.OctahedronGeometry(1, 0),
				this.basic(i % 3 ? c : 0xfff7d8, {
					transparent: true,
					opacity: 1,
					depthWrite: false,
				}),
				g,
				[0, 0, 0],
				[1, 1, 1],
				false,
			);
			m.userData = {
				v: { x: Math.cos(a) * s, y: Math.sin(a) * s },
				size: 0.05 + (i % 4) * 0.025,
			};
		}
		this.torus(
			g,
			this.basic(c, { transparent: true, opacity: 1, depthWrite: false }),
			[0, 0, 0],
			1,
			0.04,
		);
		this.effects.push({
			group: g,
			age: 0,
			life: good ? 0.8 : 0.65,
			radius: type === "warp" ? 6 : 2.6,
		});
	}
}
