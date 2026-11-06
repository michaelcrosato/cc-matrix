/* Procedural ink-and-cel stage and actors. All assets are made from geometry. */
class GameVisuals {
	constructor(scene) {
		this.scene = scene;
		this.mixers = [];
		this.effects = [];
		this.starObjects = [];
		this.stage = new THREE.Group();
		this.stage.name = "KryborInkStage";
		this.scene.add(this.stage);
		this.seed = 1982;
		this.ink = 0x080c21;
		this.palette = [0xfa5589, 0xffb34f, 0x64e9e2, 0xc791ff];
		this.materials = new Map();
	}
	random() {
		this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}
	material(color, lit = true, emissive = 0) {
		const key = `${color}:${lit}:${emissive}`;
		if (!this.materials.has(key))
			this.materials.set(
				key,
				lit
					? new THREE.MeshStandardMaterial({
							color,
							roughness: 0.94,
							metalness: 0,
							flatShading: true,
							emissive: color,
							emissiveIntensity: emissive,
						})
					: new THREE.MeshBasicMaterial({ color }),
			);
		return this.materials.get(key);
	}
	shape(points, depth = 0.14) {
		const shape = new THREE.Shape();
		points.forEach((p, i) =>
			i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]),
		);
		shape.closePath();
		const g = new THREE.ExtrudeGeometry(shape, {
			depth,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: 0.025,
			bevelThickness: 0.025,
		});
		g.translate(0, 0, -depth / 2);
		return g;
	}
	mesh(geometry, color, ink = true, lit = true, emissive = 0) {
		const root = new THREE.Group();
		if (ink) {
			const outline = new THREE.Mesh(
				geometry,
				new THREE.MeshBasicMaterial({ color: this.ink, side: THREE.BackSide }),
			);
			outline.scale.setScalar(1.09);
			root.add(outline);
		}
		const mesh = new THREE.Mesh(geometry, this.material(color, lit, emissive));
		root.add(mesh);
		root.userData.face = mesh;
		return root;
	}
	polygon(points, color, depth = 0.14, ink = true, lit = true) {
		return this.mesh(this.shape(points, depth), color, ink, lit);
	}
	part(parent, object, x = 0, y = 0, z = 0, scale = 1) {
		object.position.set(x, y, z);
		object.scale.setScalar(scale);
		parent.add(object);
		return object;
	}
	disc(radius, color, segments = 48) {
		return new THREE.Mesh(
			new THREE.CircleGeometry(radius, segments),
			this.material(color, false),
		);
	}
	line(points, color = 0x5d8399, opacity = 1) {
		return new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(
				points.map((p) => new THREE.Vector3(...p)),
			),
			new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
		);
	}
	buildStage() {
		this.scene.background = new THREE.Color(0x0c122b);
		this.scene.add(new THREE.HemisphereLight(0xb6e5ff, 0x382044, 2.2));
		const key = new THREE.DirectionalLight(0xffebbd, 3.2);
		key.position.set(-10, 20, 30);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight(0x61bcf7, 1.8);
		rim.position.set(12, 2, 5);
		this.scene.add(rim);

		const backdrop = this.polygon(
			[
				[-75, -20],
				[75, -20],
				[75, 45],
				[-75, 45],
			],
			0x0c122b,
			0.05,
			false,
			false,
		);
		backdrop.position.z = -38;
		this.stage.add(backdrop);
		// A quiet field of hand-cut stars, with the large stars shaped like inked diamonds.
		const positions = [],
			colors = [];
		for (let i = 0; i < 290; i++) {
			const x = (this.random() - 0.5) * 91;
			const y = this.random() * 44 - 5;
			positions.push(x, y, -34 + this.random());
			const c = new THREE.Color(i % 4 ? 0x7188b1 : 0xffdda8);
			colors.push(c.r, c.g, c.b);
		}
		const sg = new THREE.BufferGeometry();
		sg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		sg.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		this.stage.add(
			new THREE.Points(
				sg,
				new THREE.PointsMaterial({
					size: 0.075,
					vertexColors: true,
					sizeAttenuation: true,
				}),
			),
		);
		for (let i = 0; i < 21; i++) {
			const star = this.polygon(
				[
					[0, 0.11],
					[0.035, 0.025],
					[0.11, 0],
					[0.035, -0.025],
					[0, -0.11],
					[-0.035, -0.025],
					[-0.11, 0],
					[-0.035, 0.025],
				],
				i % 3 ? 0x8fa7c9 : 0xffd695,
				0.012,
				false,
				false,
			);
			star.position.set(
				(this.random() - 0.5) * 67,
				5 + this.random() * 25,
				-32,
			);
			this.stage.add(star);
			this.starObjects.push(star);
		}

		const moon = new THREE.Group();
		moon.position.set(9.5, 16.5, -27);
		this.part(moon, this.disc(6.95, 0x2c2943), 0, 0, -0.2);
		this.part(moon, this.disc(6.65, 0xf0a66a), 0, 0, 0);
		this.part(moon, this.disc(6.49, 0xffd6a0), 0, 0, 0.015);
		// Long angular bands make the moon read as a printed illustration.
		for (let i = 0; i < 22; i++) {
			const y = -5.9 + i * 0.55;
			const half = Math.sqrt(Math.max(0, 6.4 * 6.4 - y * y));
			const band = this.polygon(
				[
					[-half, y - 0.018],
					[half, y - 0.018],
					[half, y + 0.018],
					[-half, y + 0.018],
				],
				0xe6ae7a,
				0.01,
				false,
				false,
			);
			band.position.z = 0.035;
			moon.add(band);
		}
		for (let i = 0; i < 20; i++) {
			const x = (this.random() - 0.5) * 10,
				y = (this.random() - 0.5) * 10,
				r = 0.13 + this.random() * 0.65;
			if (Math.hypot(x, y) + r > 6.2) continue;
			this.part(moon, this.disc(r, 0xe7b480, 22), x, y, 0.05);
			this.part(
				moon,
				this.disc(r * 0.65, 0xf7c38c, 20),
				x + 0.07,
				y - 0.05,
				0.06,
			);
		}
		this.part(moon, this.disc(5.63, 0x171c37), -2.55, 1.6, 0.11);
		this.part(moon, this.disc(5.4, 0x141a34), -2.55, 1.6, 0.12);
		const orbit = new THREE.Mesh(
			new THREE.TorusGeometry(7.38, 0.024, 3, 120),
			this.material(0x796681, false),
		);
		orbit.rotation.z = 0.18;
		moon.add(orbit);
		this.stage.add(moon);
		this.moon = moon;

		// Distant black-lilac ranges and blue ice are always behind the play plane.
		const layers = [
			{ z: -20, base: -1.4, amp: 5.3, color: 0x171c39, step: 3.1 },
			{ z: -15, base: -2.3, amp: 6.4, color: 0x222c4b, step: 2.8 },
			{ z: -10, base: -3.1, amp: 5.5, color: 0x30465e, step: 2.2 },
			{ z: -6, base: -3.4, amp: 3.9, color: 0x3e6678, step: 2.9 },
		];
		for (const l of layers) {
			const pts = [[-48, -10]];
			for (let x = -48; x <= 48; x += l.step)
				pts.push([x, l.base + this.random() * l.amp]);
			pts.push([48, -10]);
			const range = this.polygon(pts, l.color, 0.12, false, false);
			range.position.z = l.z;
			this.stage.add(range);
			for (let i = 1; i < pts.length - 2; i++) {
				const a = pts[i],
					b = pts[i + 1];
				if (a[1] > b[1] + 0.5) {
					const facet = this.polygon(
						[
							[a[0], a[1]],
							[b[0], b[1]],
							[a[0] + 0.7, -5],
						],
						l.z === -6 ? 0x517c8b : 0x35445e,
						0.02,
						false,
						false,
					);
					facet.position.z = l.z + 0.1;
					this.stage.add(facet);
				}
			}
		}
		const ground = this.polygon(
			[
				[-55, 0.12],
				[55, 0.12],
				[55, -15],
				[-55, -15],
			],
			0x142334,
			0.18,
			false,
			false,
		);
		ground.position.z = -0.6;
		this.stage.add(ground);
		this.stage.add(
			this.line(
				[
					[-40, 0.2, -0.25],
					[40, 0.2, -0.25],
				],
				0x80d4da,
			),
		);
		this.stage.add(
			this.line(
				[
					[-40, 0.08, -0.21],
					[40, 0.08, -0.21],
				],
				0x0a1220,
			),
		);
		for (let i = 0; i < 44; i++) {
			const x = (this.random() - 0.5) * 74,
				y = -0.3 - this.random() * 6;
			const len = 0.2 + this.random() * 1.6;
			this.stage.add(
				this.line(
					[
						[x, y, -0.15],
						[x + len, y + 0.035, -0.15],
					],
					i % 3 ? 0x294858 : 0x4b6e76,
					0.7,
				),
			);
		}
		// Rail sleepers help ground the cannon without making an apparent movement lane.
		for (let x = -35; x < 36; x += 1.45) {
			const tile = this.polygon(
				[
					[-0.4, -0.06],
					[0.42, -0.06],
					[0.5, 0.02],
					[-0.3, 0.02],
				],
				0x467881,
				0.04,
				false,
				false,
			);
			tile.position.set(x, -0.17, 0.05);
			this.stage.add(tile);
		}
		// Tall icy side crags frame the combat area; centre stays clear.
		for (const side of [-1, 1])
			for (let i = 0; i < 11; i++) {
				const x = side * (14.7 + this.random() * 15),
					h = 1 + this.random() * 4.9,
					w = 0.6 + this.random() * 2;
				const ice = this.polygon(
					[
						[-w, -1.5],
						[w, -1.5],
						[w * 0.55, h * 0.4],
						[0, h],
						[-w * 0.32, h * 0.6],
					],
					i % 2 ? 0x49879b : 0x294b63,
					0.4,
					true,
					true,
				);
				ice.position.set(x, -0.2, 1.2 + this.random());
				ice.rotation.z = side * 0.13;
				this.stage.add(ice);
				const facet = this.polygon(
					[
						[0, h],
						[w * 0.55, h * 0.4],
						[w, -1.5],
						[0, -1.5],
					],
					0x6babb1,
					0.03,
					false,
					false,
				);
				facet.position.z = 0.25;
				ice.add(facet);
			}
		// A thin orbit trail / falling star, animated slowly by update().
		this.comet = this.line(
			[
				[-1, 0, 0],
				[0, 0, 0],
			],
			0x7ca4c7,
			0.5,
		);
		this.comet.position.set(-20, 25, -30);
		this.comet.rotation.z = 0.2;
		this.stage.add(this.comet);
		return this.stage;
	}
	animateWings(root, speed = 1, amplitude = 0.32) {
		const clip = new THREE.AnimationClip("paper-wingbeat", 0.72 / speed, [
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[z]",
				[0, 0.18 / speed, 0.36 / speed, 0.54 / speed, 0.72 / speed],
				[-amplitude, 0.14, amplitude, 0.06, -amplitude],
			),
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[z]",
				[0, 0.18 / speed, 0.36 / speed, 0.54 / speed, 0.72 / speed],
				[amplitude, -0.14, -amplitude, -0.06, amplitude],
			),
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[y]",
				[0, 0.36 / speed, 0.72 / speed],
				[-0.35, 0.18, -0.35],
			),
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[y]",
				[0, 0.36 / speed, 0.72 / speed],
				[0.35, -0.18, 0.35],
			),
		]);
		const mixer = new THREE.AnimationMixer(root);
		mixer.clipAction(clip).play();
		mixer.update(this.random() * 0.6);
		root.userData.mixer = mixer;
		this.mixers.push({ root, mixer });
	}
	createShip(index = 0) {
		const g = new THREE.Group();
		g.name = `Cannon${index + 1}`;
		const color = index ? 0x69e7de : 0xffc24c,
			highlight = index ? 0xc2fff1 : 0xffe9ac;
		const outrigger = this.polygon(
			[
				[-0.9, -0.42],
				[-0.75, 0.14],
				[-0.43, 0.27],
				[-0.3, -0.39],
			],
			color,
			0.3,
		);
		g.add(outrigger);
		const right = outrigger.clone();
		right.scale.x = -1;
		g.add(right);
		this.part(
			g,
			this.polygon(
				[
					[-0.55, -0.5],
					[0.55, -0.5],
					[0.62, -0.1],
					[0.36, 0.42],
					[-0.36, 0.42],
					[-0.62, -0.1],
				],
				color,
				0.42,
			),
			0,
			0,
			0.08,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.42, -0.37],
					[0.4, -0.37],
					[0.43, -0.08],
					[0.26, 0.19],
					[-0.25, 0.19],
					[-0.43, -0.08],
				],
				highlight,
				0.05,
			),
			0,
			0.04,
			0.34,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.28, -0.07],
					[0.28, -0.07],
					[0.2, 0.2],
					[-0.2, 0.2],
				],
				0x132c43,
				0.05,
			),
			0,
			0.02,
			0.4,
		);
		// Cockpit split into two gleaming eye-like panes.
		this.part(
			g,
			this.polygon(
				[
					[-0.23, 0],
					[-0.035, 0],
					[-0.035, 0.12],
					[-0.17, 0.12],
				],
				0x5ce2dc,
				0.02,
				false,
				false,
			),
			0,
			0.03,
			0.45,
		);
		this.part(
			g,
			this.polygon(
				[
					[0.035, 0],
					[0.23, 0],
					[0.17, 0.12],
					[0.035, 0.12],
				],
				0x5ce2dc,
				0.02,
				false,
				false,
			),
			0,
			0.03,
			0.45,
		);
		this.part(
			g,
			this.mesh(new THREE.BoxGeometry(0.24, 0.61, 0.2), 0x22354e),
			0,
			0.55,
			0.09,
		);
		this.part(
			g,
			this.mesh(new THREE.BoxGeometry(0.3, 0.15, 0.25), highlight),
			0,
			0.83,
			0.1,
		);
		this.part(
			g,
			this.mesh(
				new THREE.BoxGeometry(0.085, 0.18, 0.04),
				0x8ffff2,
				false,
				false,
			),
			0,
			0.87,
			0.26,
		);
		for (const side of [-1, 1]) {
			this.part(
				g,
				this.mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), 0x17243b),
				side * 0.66,
				-0.27,
				0.23,
			);
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.065, 0.18, 0.04),
					highlight,
					false,
					false,
				),
				side * 0.62,
				0.09,
				0.29,
			);
		}
		const flame = this.polygon(
			[
				[-0.21, -0.01],
				[0, -0.52],
				[0.21, -0.01],
			],
			0x64f5ed,
			0.025,
			false,
			false,
		);
		flame.name = "thruster";
		flame.position.set(0, -0.52, -0.05);
		g.add(flame);
		const inner = this.polygon(
			[
				[-0.1, 0],
				[0, -0.3],
				[0.1, 0],
			],
			0xffffff,
			0.02,
			false,
			false,
		);
		inner.position.z = 0.04;
		flame.add(inner);
		const mixer = new THREE.AnimationMixer(g);
		const clip = new THREE.AnimationClip("plasma-idle", 0.22, [
			new THREE.NumberKeyframeTrack(
				"thruster.scale[y]",
				[0, 0.09, 0.15, 0.22],
				[0.65, 1.1, 0.8, 0.65],
			),
		]);
		mixer.clipAction(clip).play();
		g.userData.mixer = mixer;
		this.mixers.push({ root: g, mixer });
		g.userData.color = color;
		return g;
	}
	createEnemy(type = "grunt", paletteIndex = 0) {
		const g = new THREE.Group();
		g.name = `Demon_${type}`;
		const color =
			type === "splitter"
				? 0xc791ff
				: type === "phantom"
					? 0x76e1dc
					: type === "shard"
						? 0xff9dcb
						: 0xffac52;
		const light =
			type === "splitter" ? 0xe8caff : type === "phantom" ? 0xb2fff0 : 0xffb4cb;
		const dark =
			type === "splitter" ? 0x623b88 : type === "phantom" ? 0x2c7e9e : 0x972c68;
		for (const side of [-1, 1]) {
			const w = new THREE.Group();
			w.name = side < 0 ? "wingL" : "wingR";
			w.position.set(side * 0.22, 0.11, 0);
			const wing = this.polygon(
				[
					[0, 0.12],
					[side * 0.62, 0.63],
					[side * 1.35, 0.55],
					[side * 0.95, 0.22],
					[side * 0.73, -0.25],
					[side * 0.53, -0.03],
					[side * 0.3, -0.32],
					[0, -0.13],
				],
				color,
				0.12,
			);
			w.add(wing);
			const facet = this.polygon(
				[
					[0, 0.1],
					[side * 0.62, 0.57],
					[side * 1.15, 0.51],
					[side * 0.62, 0.15],
					[side * 0.48, -0.1],
				],
				light,
				0.025,
				false,
				false,
			);
			facet.position.z = 0.13;
			w.add(facet);
			w.add(
				this.line(
					[
						[0, 0.11, 0.17],
						[side * 0.62, 0.2, 0.17],
						[side * 1.24, 0.54, 0.17],
					],
					this.ink,
				),
			);
			w.add(
				this.line(
					[
						[side * 0.62, 0.2, 0.17],
						[side * 0.73, -0.22, 0.17],
					],
					this.ink,
				),
			);
			g.add(w);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.28, 0.4],
					[0, 0.59],
					[0.28, 0.4],
					[0.36, 0.02],
					[0.15, -0.39],
					[0, -0.53],
					[-0.15, -0.39],
					[-0.36, 0.02],
				],
				dark,
				0.32,
			),
			0,
			0,
			0.12,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.28, 0.28],
					[0, 0.47],
					[0.28, 0.28],
					[0.22, -0.09],
					[0, -0.22],
					[-0.22, -0.09],
				],
				color,
				0.07,
			),
			0,
			0,
			0.33,
		);
		// Horns, luminous angry eyes and a pale hooked beak are high contrast at TV distance.
		for (const side of [-1, 1]) {
			this.part(
				g,
				this.polygon(
					[
						[0, 0],
						[side * 0.17, 0.44],
						[side * 0.24, -0.07],
					],
					light,
					0.1,
				),
				side * 0.18,
				0.34,
				0.15,
			);
			this.part(
				g,
				this.polygon(
					[
						[-0.13, 0.055],
						[0.11, -0.01],
						[0.055, -0.105],
						[-0.1, -0.08],
					],
					0x0a1026,
					0.035,
					false,
					false,
				),
				side * 0.14,
				0.13,
				0.43,
			);
			this.part(
				g,
				this.mesh(
					new THREE.SphereGeometry(0.047, 6, 4),
					0xfff5d3,
					false,
					false,
				),
				side * 0.135,
				0.075,
				0.47,
			);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.12, -0.05],
					[0.1, -0.05],
					[0, -0.32],
				],
				0xffdda4,
				0.06,
			),
			0,
			-0.1,
			0.42,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.07, 0],
					[0, -0.35],
					[0.07, 0],
				],
				color,
				0.07,
			),
			0,
			-0.37,
			0.04,
		);
		if (type === "splitter") {
			this.part(
				g,
				this.polygon(
					[
						[-0.06, 0.17],
						[0.04, 0.06],
						[-0.035, -0.04],
						[0.065, -0.16],
						[0.005, -0.26],
					],
					0x331d42,
					0.025,
					false,
					false,
				),
				0,
				-0.03,
				0.5,
			);
			const sigil = this.mesh(
				new THREE.OctahedronGeometry(0.11, 0),
				0xffeabb,
				true,
				false,
			);
			sigil.position.set(0, 0.33, 0.5);
			g.add(sigil);
		}
		if (type === "phantom") {
			const ring = new THREE.Mesh(
				new THREE.TorusGeometry(0.62, 0.018, 3, 32),
				this.material(0x83f6df, false),
			);
			ring.position.z = -0.15;
			g.add(ring);
		}
		if (type === "shard") g.scale.setScalar(0.57);
		this.animateWings(g, type === "shard" ? 1.8 : 1, 0.3);
		g.userData.color = color;
		return g;
	}
	createBoss() {
		const g = new THREE.Group();
		g.name = "TheGrandPecker";
		for (const side of [-1, 1]) {
			const wing = new THREE.Group();
			wing.name = side < 0 ? "wingL" : "wingR";
			wing.position.set(side * 0.48, 0.2, -0.02);
			wing.add(
				this.polygon(
					[
						[0, 0.3],
						[side * 1.0, 1.2],
						[side * 2.9, 0.8],
						[side * 2.5, 0.35],
						[side * 2.1, 0.4],
						[side * 1.5, -0.65],
						[side * 1.3, -0.1],
						[side * 0.8, -0.8],
						[side * 0.4, -0.24],
						[0, -0.35],
					],
					0x8b488f,
					0.28,
				),
			);
			const top = this.polygon(
				[
					[0, 0.28],
					[side * 1.05, 1.12],
					[side * 2.7, 0.78],
					[side * 1.3, 0.39],
					[side * 0.8, -0.13],
				],
				0xe879a0,
				0.06,
				false,
				false,
			);
			top.position.z = 0.2;
			wing.add(top);
			for (let j = 0; j < 3; j++)
				wing.add(
					this.line(
						[
							[side * 0.1, 0.15, 0.3],
							[side * (0.9 + j * 0.6), 0.45, 0.3],
							[side * (0.8 + j * 0.65), -0.4 + j * 0.25, 0.3],
						],
						0x14142b,
					),
				);
			this.part(
				wing,
				this.mesh(new THREE.OctahedronGeometry(0.2), 0xffd572),
				side * 1.3,
				0.45,
				0.3,
			);
			g.add(wing);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.75, 0.75],
					[0, 1.24],
					[0.75, 0.75],
					[0.9, 0.02],
					[0.55, -0.98],
					[0, -1.4],
					[-0.55, -0.98],
					[-0.9, 0.02],
				],
				0x9e486e,
				0.5,
			),
			0,
			0,
			0.1,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.58, 0.6],
					[0, 1.02],
					[0.58, 0.6],
					[0.5, -0.25],
					[0, -0.68],
					[-0.5, -0.25],
				],
				0xf1a368,
				0.12,
			),
			0,
			0.03,
			0.44,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.35, 0.76],
					[-0.28, 1.65],
					[0, 1.3],
					[0.28, 1.65],
					[0.35, 0.76],
				],
				0xffd974,
				0.19,
			),
			0,
			0.25,
			0.24,
		);
		for (const side of [-1, 1]) {
			this.part(
				g,
				this.polygon(
					[
						[-0.31, 0.08],
						[0.25, -0.04],
						[0.17, -0.25],
						[-0.24, -0.19],
					],
					0x12192b,
					0.06,
				),
				side * 0.36,
				0.27,
				0.6,
			);
			this.part(
				g,
				this.mesh(new THREE.OctahedronGeometry(0.115), 0x8ffff0, false, false),
				side * 0.35,
				0.11,
				0.69,
			);
			this.part(
				g,
				this.polygon(
					[
						[0, 0.2],
						[side * 0.65, 0.7],
						[side * 0.55, -0.12],
					],
					0xffd979,
					0.2,
				),
				side * 0.56,
				0.52,
				0.19,
			);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.27, 0.13],
					[0.27, 0.13],
					[0.18, -0.3],
					[0, -0.58],
					[-0.18, -0.3],
				],
				0xffebba,
				0.18,
			),
			0,
			-0.25,
			0.65,
		);
		const core = this.mesh(
			new THREE.IcosahedronGeometry(0.31, 0),
			0x63efdb,
			true,
			false,
		);
		core.position.set(0, -0.91, 0.5);
		core.name = "bossCore";
		g.add(core);
		const mixer = new THREE.AnimationMixer(core);
		mixer
			.clipAction(
				new THREE.AnimationClip("heart-pulse", 0.8, [
					new THREE.NumberKeyframeTrack(
						".scale[x]",
						[0, 0.4, 0.8],
						[1, 1.16, 1],
					),
					new THREE.NumberKeyframeTrack(
						".scale[y]",
						[0, 0.4, 0.8],
						[1, 1.16, 1],
					),
				]),
			)
			.play();
		this.mixers.push({ root: g, mixer });
		this.animateWings(g, 0.65, 0.14);
		const armorHalo = new THREE.Group();
		armorHalo.name = "armorHalo";
		armorHalo.position.set(0, 0, 0.82);
		const arc = new THREE.Mesh(
			new THREE.RingGeometry(1.4, 1.45, 42, 1, 0, Math.PI * 1.66),
			this.material(0xffb565, false),
		);
		armorHalo.add(arc);
		const innerArc = new THREE.Mesh(
			new THREE.RingGeometry(1.3, 1.32, 36, 1, Math.PI, Math.PI * 1.25),
			this.material(0x9c6471, false),
		);
		armorHalo.add(innerArc);
		for (let i = 0; i < 4; i++) {
			const a = i * Math.PI * 0.5;
			const lock = this.mesh(
				new THREE.OctahedronGeometry(0.11, 0),
				0xffd797,
				true,
				false,
			);
			lock.position.set(Math.cos(a) * 1.425, Math.sin(a) * 1.425, 0.03);
			armorHalo.add(lock);
		}
		g.add(armorHalo);
		const coreGlow = new THREE.Group();
		coreGlow.position.copy(core.position);
		coreGlow.position.z = 0.81;
		const glowRing = new THREE.Mesh(
			new THREE.RingGeometry(0.42, 0.45, 32),
			this.material(0x7fffea, false),
		);
		coreGlow.add(glowRing);
		for (const side of [-1, 1])
			for (const axis of [0, 1]) {
				const a = axis * Math.PI * 0.5;
				coreGlow.add(
					this.line(
						[
							[Math.cos(a) * side * 0.56, Math.sin(a) * side * 0.56, 0],
							[Math.cos(a) * side * 0.74, Math.sin(a) * side * 0.74, 0],
						],
						0x7fffea,
					),
				);
			}
		g.add(coreGlow);
		armorHalo.visible = false;
		g.userData.core = core;
		g.userData.armorHalo = armorHalo;
		g.userData.coreGlow = coreGlow;
		g.userData.color = 0xffb565;
		return g;
	}
	createShot(enemy = false) {
		const g = new THREE.Group();
		if (enemy) {
			g.add(
				this.mesh(new THREE.OctahedronGeometry(0.22, 0), 0xff8b79, true, false),
			);
			this.part(
				g,
				this.mesh(new THREE.OctahedronGeometry(0.1, 0), 0xfff0b3, false, false),
				0,
				0,
				0.22,
			);
			const tail = this.polygon(
				[
					[-0.12, 0],
					[0, 0.72],
					[0.12, 0],
				],
				0xcc5472,
				0.02,
				false,
				false,
			);
			tail.position.z = -0.04;
			g.add(tail);
		} else {
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.13, 0.72, 0.1),
					0x83fff0,
					true,
					false,
				),
				0,
				0,
				0,
			);
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.045, 0.47, 0.04),
					0xffffff,
					false,
					false,
				),
				0,
				0.04,
				0.09,
			);
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.035, 0.22, 0.03),
					0x4b9aab,
					false,
					false,
				),
				0,
				-0.52,
				0,
			);
		}
		return g;
	}
	burst(x, y, color = 0xffc275, count = 16) {
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.38, 0.48, 10),
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.95,
				side: THREE.DoubleSide,
			}),
		);
		ring.position.set(x, y, 1);
		this.scene.add(ring);
		this.effects.push({
			object: ring,
			life: 0.38,
			max: 0.38,
			vx: 0,
			vy: 0,
			ring: true,
		});
		for (let i = 0; i < count; i++) {
			const angle = this.random() * Math.PI * 2,
				speed = 1.8 + this.random() * 7;
			const shard = this.mesh(
				new THREE.TetrahedronGeometry(0.07 + this.random() * 0.13, 0),
				i % 4 === 0 ? 0xfff4cb : color,
				false,
				false,
			);
			shard.position.set(x, y, 0.2 + this.random() * 0.8);
			this.scene.add(shard);
			const life = 0.35 + this.random() * 0.48;
			this.effects.push({
				object: shard,
				life,
				max: life,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				spin: (this.random() - 0.5) * 15,
				ring: false,
			});
		}
	}
	remove(group) {
		if (!group) return;
		this.mixers = this.mixers.filter(({ root, mixer }) => {
			if (root !== group) return true;
			mixer.stopAllAction();
			mixer.uncacheRoot(mixer.getRoot());
			return false;
		});
		group.removeFromParent();
		const geometries = new Set(),
			materials = new Set();
		group.traverse((o) => {
			if (o.geometry) geometries.add(o.geometry);
			if (o.material && ![...this.materials.values()].includes(o.material))
				materials.add(o.material);
		});
		geometries.forEach((g) => g.dispose());
		materials.forEach((m) => m.dispose());
	}
	resetEffects() {
		for (const e of this.effects) {
			this.scene.remove(e.object);
			this.disposeEffect(e);
		}
		this.effects.length = 0;
	}
	disposeEffect(e) {
		e.object.traverse((o) => {
			if (o.geometry) o.geometry.dispose();
			if (e.ring && o.material) o.material.dispose();
		});
	}
	update(dt, time) {
		// Removed actor mixers are released so replaying does not accumulate animations.
		this.mixers = this.mixers.filter(({ root, mixer }) => {
			if (!root.parent && root.userData.hasBeenAttached) {
				mixer.stopAllAction();
				mixer.uncacheRoot(mixer.getRoot());
				return false;
			}
			if (root.parent) root.userData.hasBeenAttached = true;
			mixer.update(dt);
			if (root.userData.core) {
				const open = root.userData.open !== false;
				root.userData.core.visible = open;
				root.rotation.y = open ? 0 : Math.sin(time * 7) * 0.04;
				if (root.userData.armorHalo) {
					root.userData.armorHalo.visible = !open;
					root.userData.armorHalo.rotation.z = time * 0.8;
					root.userData.armorHalo.scale.setScalar(
						1 + Math.sin(time * 6) * 0.025,
					);
				}
				if (root.userData.coreGlow) {
					root.userData.coreGlow.visible = open;
					root.userData.coreGlow.scale.setScalar(1 + Math.sin(time * 8) * 0.12);
					root.userData.coreGlow.rotation.z = Math.sin(time * 2) * 0.12;
				}
			}
			return true;
		});
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const e = this.effects[i];
			e.life -= dt;
			if (e.life <= 0) {
				this.scene.remove(e.object);
				this.disposeEffect(e);
				this.effects.splice(i, 1);
				continue;
			}
			if (e.ring) {
				e.object.scale.setScalar(1 + (1 - e.life / e.max) * 4.5);
				e.object.material.opacity = e.life / e.max;
			} else {
				e.vy -= 6 * dt;
				e.object.position.x += e.vx * dt;
				e.object.position.y += e.vy * dt;
				e.object.rotation.z += e.spin * dt;
				e.object.scale.setScalar(Math.max(0.02, e.life / e.max));
			}
		}
		for (let i = 0; i < this.starObjects.length; i++)
			this.starObjects[i].scale.setScalar(
				0.7 + 0.25 * Math.sin(time * 0.8 + i * 2.3),
			);
		if (this.comet)
			this.comet.position.set(
				((time * 0.45 + 20) % 75) - 37,
				24 + Math.sin(time * 0.01) * 2,
				-30,
			);
	}
}
