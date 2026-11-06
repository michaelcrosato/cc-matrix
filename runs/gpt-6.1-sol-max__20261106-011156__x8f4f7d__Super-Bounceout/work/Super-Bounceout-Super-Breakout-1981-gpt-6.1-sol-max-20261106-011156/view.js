class InkView {
	constructor(container) {
		this.container = container;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#182c3b");
		this.camera = new THREE.OrthographicCamera(
			-10.5,
			10.5,
			13.5,
			-13.5,
			0.1,
			100,
		);
		this.camera.position.set(0, 0, 40);
		this.renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.NoToneMapping;
		this.renderer.domElement.setAttribute(
			"aria-label",
			"The orbital brick-breaking playfield",
		);
		container.prepend(this.renderer.domElement);
		this.scene.add(new THREE.AmbientLight("#ffffff", 2.2));
		const key = new THREE.DirectionalLight("#fff0cc", 2.6);
		key.position.set(-6, 10, 18);
		this.scene.add(key);
		const fill = new THREE.DirectionalLight("#a7c9ee", 0.7);
		fill.position.set(8, -5, 10);
		this.scene.add(fill);
		const data = new Uint8Array([90, 160, 255]);
		this.gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
		this.gradient.needsUpdate = true;
		this.gradient.minFilter = THREE.NearestFilter;
		this.gradient.magFilter = THREE.NearestFilter;
		this.materials = new Map();
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.brickMeshes = new Map();
		this.ballMeshes = new Map();
		this.ghostMeshes = new Map();
		this.paddleMeshes = [];
		this.captiveMeshes = [];
		this.effects = [];
		this.mixers = [];
		this.particles = [];
		this.shake = 0;
		this.geometry = this.roundRect(2.02, 0.56, 0.12, 0.18);
		this.outlineGeometry = this.roundRect(2.1, 0.65, 0.14, 0.22);
		this.particleGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.08);
		this.makeBackground();
		this.resize();
		new ResizeObserver(() => this.resize()).observe(container);
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
	}
	material(color, toon = true) {
		const key = color + (toon ? "t" : "b");
		if (!this.materials.has(key))
			this.materials.set(
				key,
				toon
					? new THREE.MeshToonMaterial({ color, gradientMap: this.gradient })
					: new THREE.MeshBasicMaterial({ color }),
			);
		return this.materials.get(key);
	}
	roundRect(w, h, r, depth) {
		const shape = new THREE.Shape(),
			x = -w / 2,
			y = -h / 2;
		shape.moveTo(x + r, y);
		shape.lineTo(x + w - r, y);
		shape.quadraticCurveTo(x + w, y, x + w, y + r);
		shape.lineTo(x + w, y + h - r);
		shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		shape.lineTo(x + r, y + h);
		shape.quadraticCurveTo(x, y + h, x, y + h - r);
		shape.lineTo(x, y + r);
		shape.quadraticCurveTo(x, y, x + r, y);
		return new THREE.ExtrudeGeometry(shape, {
			depth,
			bevelEnabled: false,
			curveSegments: 5,
		});
	}
	line(points, color = "#536775", opacity = 1) {
		const g = new THREE.BufferGeometry().setFromPoints(
			points.map((p) => new THREE.Vector3(...p)),
		);
		return new THREE.Line(
			g,
			new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
		);
	}
	makeBackground() {
		for (let x = -8; x <= 8; x += 2)
			this.root.add(
				this.line(
					[
						[x, -12, -0.8],
						[x, 12, -0.8],
					],
					"#2a3d4b",
					0.52,
				),
			);
		for (let y = -12; y <= 12; y += 2)
			this.root.add(
				this.line(
					[
						[-9.6, y, -0.8],
						[9.6, y, -0.8],
					],
					"#2a3d4b",
					0.52,
				),
			);
		for (let i = 0; i < 50; i++) {
			const x = Math.sin(i * 127.1) * 9.3,
				y = Math.cos(i * 73.7) * 11.8;
			const size = i % 5 === 0 ? 0.11 : 0.035;
			this.root.add(
				this.line(
					[
						[x - size, y, -0.5],
						[x + size, y, -0.5],
					],
					"#77858a",
					0.65,
				),
			);
			if (i % 5 === 0)
				this.root.add(
					this.line(
						[
							[x, y - size, -0.5],
							[x, y + size, -0.5],
						],
						"#77858a",
						0.65,
					),
				);
		}
		// The atlas planet: ink rings and longitude strokes, drawn as engine geometry.
		const planet = new THREE.Group();
		planet.position.set(2.8, -3.2, -0.65);
		planet.rotation.z = -0.4;
		for (const radius of [2.4, 2.45, 2.68]) {
			const pts = [];
			for (let i = 0; i <= 100; i++) {
				const a = (i / 100) * Math.PI * 2;
				pts.push([Math.cos(a) * radius, Math.sin(a) * radius, 0]);
			}
			planet.add(this.line(pts, "#3b515e", 0.65));
		}
		for (const f of [0.28, 0.62, 1]) {
			const pts = [];
			for (let i = 0; i <= 80; i++) {
				const a = (i / 80) * Math.PI * 2;
				pts.push([Math.cos(a) * 2.4 * f, Math.sin(a) * 2.4, 0.01]);
			}
			planet.add(this.line(pts, "#3b515e", 0.6));
		}
		const ring = [];
		for (let i = 0; i <= 100; i++) {
			const a = (i / 100) * Math.PI * 2;
			ring.push([Math.cos(a) * 3.8, Math.sin(a) * 0.65, 0.02]);
		}
		planet.add(this.line(ring, "#65747a", 0.6));
		this.root.add(planet);
		const orbitMixer = new THREE.AnimationMixer(planet);
		const clip = new THREE.AnimationClip("orbital drift", 90, [
			new THREE.NumberKeyframeTrack(
				".rotation[z]",
				[0, 45, 90],
				[-0.4, -0.12, -0.4],
			),
		]);
		orbitMixer.clipAction(clip).play();
		this.mixers.push({ mixer: orbitMixer, loop: true });
		for (const x of [-9.9, 9.9]) {
			const rail = new THREE.Mesh(
				new THREE.BoxGeometry(0.14, 25.5, 0.35),
				this.material("#e8dfc7"),
			);
			rail.position.set(x, -0.1, -0.2);
			this.root.add(rail);
			for (let y = -11; y < 12; y += 1.4) {
				const tick = new THREE.Mesh(
					new THREE.BoxGeometry(0.14, 0.32, 0.08),
					this.material("#f3b74b", false),
				);
				tick.position.set(x, y, 0.22);
				this.root.add(tick);
			}
		}
		this.root.add(
			this.line(
				[
					[-9.7, 12.4, 0],
					[9.7, 12.4, 0],
				],
				"#e9dec6",
			),
		);
		this.danger = new THREE.Group();
		for (let x = -9.5; x < 9.5; x += 0.8)
			this.danger.add(
				this.line(
					[
						[x, -8.1, 0.1],
						[x + 0.4, -8.1, 0.1],
					],
					"#ef7863",
					0.7,
				),
			);
		this.root.add(this.danger);
		this.danger.visible = false;
		this.serveBall = this.makeBall("#fff4c9");
		this.root.add(this.serveBall);
	}
	makeBrick(b) {
		const g = new THREE.Group();
		const ink = new THREE.Mesh(
			this.outlineGeometry,
			this.material("#101e29", false),
		);
		ink.position.set(0.035, -0.055, -0.1);
		g.add(ink);
		g.add(new THREE.Mesh(this.geometry, this.material(b.color)));
		const hi = new THREE.Mesh(
			new THREE.BoxGeometry(1.64, 0.027, 0.015),
			this.material("#fff5db", false),
		);
		hi.position.set(-0.04, 0.17, 0.205);
		g.add(hi);
		if (b.seal) {
			const seal = new THREE.Mesh(
				new THREE.BoxGeometry(0.17, 0.24, 0.025),
				this.material("#fff5db", false),
			);
			seal.position.set(0, -0.02, 0.23);
			seal.rotation.z = 0.35;
			g.add(seal);
		}
		g.position.set(b.x, b.y, 0);
		g.rotation.z = Math.sin(b.id * 43) * 0.006;
		this.root.add(g);
		this.brickMeshes.set(b.id, g);
		return g;
	}
	makeBall(color) {
		const g = new THREE.Group();
		const outline = new THREE.Mesh(
			new THREE.SphereGeometry(0.235, 12, 8),
			this.material("#101d29", false),
		);
		g.add(outline);
		const face = new THREE.Mesh(
			new THREE.SphereGeometry(0.19, 16, 12),
			this.material(color),
		);
		face.position.z = 0.11;
		g.add(face);
		const dot = new THREE.Mesh(
			new THREE.CircleGeometry(0.047, 10),
			this.material("#ffffff", false),
		);
		dot.position.set(-0.052, 0.055, 0.292);
		g.add(dot);
		return g;
	}
	makePaddle(color) {
		const g = new THREE.Group(),
			anim = new THREE.Group();
		g.add(anim);
		const edge = new THREE.Mesh(
			this.roundRect(1, 0.44, 0.11, 0.2),
			this.material("#0e1d28", false),
		);
		anim.add(edge);
		const main = new THREE.Mesh(
			this.roundRect(0.96, 0.33, 0.08, 0.21),
			this.material(color),
		);
		main.position.set(0, 0.035, 0.02);
		anim.add(main);
		const stripe = new THREE.Mesh(
			new THREE.BoxGeometry(0.02, 0.15, 0.04),
			this.material("#253743", false),
		);
		stripe.position.set(0, 0.035, 0.27);
		anim.add(stripe);
		const wing = this.line(
			[
				[-0.48, 0.05, 0.28],
				[-0.35, 0.05, 0.28],
			],
			"#fff4dc",
		);
		anim.add(wing);
		this.root.add(g);
		g.userData.anim = anim;
		return g;
	}
	clearGameplay() {
		for (const m of this.brickMeshes.values()) this.root.remove(m);
		this.brickMeshes.clear();
		for (const m of this.ballMeshes.values()) {
			this.root.remove(m.group);
			for (const t of m.trail) this.root.remove(t);
		}
		this.ballMeshes.clear();
		for (const m of [...this.paddleMeshes, ...this.captiveMeshes])
			this.root.remove(m);
		this.paddleMeshes = [];
		this.captiveMeshes = [];
	}
	load(game) {
		this.clearGameplay();
		this.stage = game.stage;
		this.danger.visible = game.stage === 3;
		for (const b of game.bricks) if (b.alive) this.makeBrick(b);
		for (const p of game.paddles)
			this.paddleMeshes.push(
				this.makePaddle(p.player === 1 ? "#ef8462" : "#a5d5bf"),
			);
		for (const c of game.captives) {
			const g = this.makeBall("#f3d47b");
			g.userData.id = c.id;
			this.root.add(g);
			this.captiveMeshes.push(g);
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.49, 0.53, 24),
				this.material("#b8a0ed", false),
			);
			ring.position.z = -0.1;
			g.add(ring);
		}
		const mixer = new THREE.AnimationMixer(this.root);
		const clip = new THREE.AnimationClip("sector arrival", 0.55, [
			new THREE.VectorKeyframeTrack(
				".scale",
				[0, 0.35, 0.55],
				[0.94, 0.94, 1, 1.01, 1.01, 1, 1, 1, 1],
			),
		]);
		const action = mixer.clipAction(clip);
		action.setLoop(THREE.LoopOnce, 1);
		action.clampWhenFinished = true;
		action.play();
		this.mixers.push({ mixer, left: 0.7 });
	}
	burst(x, y, color, count = 14) {
		for (let i = 0; i < count; i++) {
			const m = new THREE.Mesh(
				this.particleGeometry,
				this.material(i % 4 === 0 ? "#fff1cb" : color, false),
			);
			m.position.set(x, y, 0.5);
			const a = i * 2.399 + Math.random() * 0.2,
				v = 1.4 + Math.random() * 3;
			this.root.add(m);
			this.particles.push({
				mesh: m,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.4 + Math.random() * 0.5,
				max: 1,
				spin: (Math.random() - 0.5) * 14,
			});
		}
	}
	ring(x, y, color) {
		const mat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: 1,
		});
		const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.27, 36), mat);
		m.position.set(x, y, 0.6);
		this.root.add(m);
		const mixer = new THREE.AnimationMixer(m),
			clip = new THREE.AnimationClip("ink impact", 0.45, [
				new THREE.VectorKeyframeTrack(".scale", [0, 0.45], [1, 1, 1, 7, 7, 1]),
				new THREE.NumberKeyframeTrack(".material.opacity", [0, 0.45], [1, 0]),
			]);
		const a = mixer.clipAction(clip);
		a.setLoop(THREE.LoopOnce, 1);
		a.clampWhenFinished = true;
		a.play();
		this.effects.push({ mesh: m, mixer, left: 0.5 });
	}
	event(e) {
		if (e.type === "brick") {
			const m = this.brickMeshes.get(e.id);
			if (m) this.root.remove(m);
			this.brickMeshes.delete(e.id);
			this.burst(e.x, e.y, e.color);
		}
		if (e.type === "paddle") {
			this.ring(e.x, e.y, e.pop ? "#f3ba48" : "#b5dec5");
			if (e.pop) {
				this.shake = 0.1;
				this.burst(e.x, e.y, "#f3ba48", 22);
			}
			const m =
				this.paddleMeshes.find((_, i) => i === e.player) ||
				this.paddleMeshes[0];
			if (m) {
				const mixer = new THREE.AnimationMixer(m.userData.anim);
				const clip = new THREE.AnimationClip("paddle squash", 0.22, [
					new THREE.VectorKeyframeTrack(
						".scale",
						[0, 0.07, 0.22],
						[1, 1, 1, 1.1, 0.65, 1, 1, 1, 1],
					),
				]);
				const a = mixer.clipAction(clip);
				a.setLoop(THREE.LoopOnce, 1);
				a.clampWhenFinished = true;
				a.play();
				this.mixers.push({ mixer, left: 0.3 });
			}
		}
		if (e.type === "free") {
			this.ring(e.x, e.y, "#b8a0ed");
			this.burst(e.x, e.y, "#b8a0ed", 30);
		}
		if (e.type === "advance") this.shake = 0.07;
		if (e.type === "miss") this.shake = 0.17;
	}
	sync(game, dt, ghosts = [], reduced = false) {
		if (this.stage !== game.stage) this.load(game);
		for (const b of game.bricks)
			if (b.alive) {
				let m = this.brickMeshes.get(b.id);
				if (!m) m = this.makeBrick(b);
				m.position.y = lerp(m.position.y, b.y, 1 - Math.exp(-dt * 12));
			}
		for (const [id, m] of this.brickMeshes)
			if (!game.bricks.some((b) => b.id === id && b.alive)) {
				this.root.remove(m);
				this.brickMeshes.delete(id);
			}
		for (let i = 0; i < game.paddles.length; i++) {
			const p = game.paddles[i],
				m = this.paddleMeshes[i];
			if (m) {
				m.position.set(p.x, p.y, 0.25);
				m.scale.x = game.width;
			}
		}
		this.serveBall.visible = game.status === "serve";
		if (this.serveBall.visible)
			this.serveBall.position.set(game.paddles[0].x, -9.63, 0.4);
		for (const b of game.balls)
			if (b.alive) {
				let entry = this.ballMeshes.get(b.id);
				if (!entry) {
					const group = this.makeBall("#fff4c9"),
						trail = [];
					this.root.add(group);
					for (let i = 0; i < 9; i++) {
						const t = new THREE.Mesh(
							new THREE.CircleGeometry(0.14, 10),
							new THREE.MeshBasicMaterial({
								color: "#e9dfbf",
								transparent: true,
								opacity: (1 - i / 9) * 0.28,
								depthWrite: false,
							}),
						);
						this.root.add(t);
						trail.push(t);
					}
					entry = { group, trail, history: [] };
					this.ballMeshes.set(b.id, entry);
				}
				const p = b.body.translation();
				entry.group.position.set(p.x, p.y, 0.4);
				entry.history.unshift({ x: p.x, y: p.y });
				if (entry.history.length > 30) entry.history.pop();
				entry.trail.forEach((t, i) => {
					const p =
						entry.history[Math.min(entry.history.length - 1, i * 2 + 1)];
					t.position.set(p.x, p.y, 0.3);
					t.scale.setScalar(1 - i / 11);
					t.material.color.set(b.power > 0 ? "#f5bd48" : "#e9dfbf");
					t.visible = !reduced;
				});
			}
		for (const [id, e] of this.ballMeshes)
			if (!game.balls.some((b) => b.id === id && b.alive)) {
				this.root.remove(e.group);
				for (const t of e.trail) this.root.remove(t);
				this.ballMeshes.delete(id);
			}
		for (const m of this.captiveMeshes) {
			const c = game.captives.find((c) => c.id === m.userData.id);
			if (c) {
				m.visible = !c.freed;
				m.position.set(
					c.x + Math.sin(game.time * 3 + c.x) * 0.35,
					c.y + Math.cos(game.time * 3 + c.x) * 0.26,
					0.4,
				);
			}
		}
		for (const ghost of ghosts) {
			let m = this.ghostMeshes.get(ghost.id);
			if (!m) {
				m = this.makePaddle(ghost.color || "#b4a0e4");
				m.traverse((o) => {
					if (o.isMesh) {
						o.material = o.material.clone();
						o.material.transparent = true;
						o.material.opacity = 0.36;
					}
				});
				this.ghostMeshes.set(ghost.id, m);
			}
			m.visible = ghost.stage === game.stage && Number.isFinite(ghost.x);
			if (m.visible) {
				m.position.set(ghost.x, -11.35, 0.1);
				m.scale.x = game.config.paddleWidth;
			}
		}
		for (const [id, m] of this.ghostMeshes)
			if (!ghosts.some((g) => g.id === id)) {
				this.root.remove(m);
				this.ghostMeshes.delete(id);
			}
		for (const item of this.mixers) {
			item.mixer.update(reduced && item.loop ? 0 : dt);
			if (!item.loop) item.left -= dt;
		}
		this.mixers = this.mixers.filter((i) => i.loop || i.left > 0);
		for (const e of this.effects) {
			e.mixer.update(dt);
			e.left -= dt;
			if (e.left <= 0) {
				this.root.remove(e.mesh);
				e.mesh.geometry.dispose();
				e.mesh.material.dispose();
			}
		}
		this.effects = this.effects.filter((e) => e.left > 0);
		for (const p of this.particles) {
			p.life -= dt;
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.y += p.vy * dt;
			p.vy -= 3 * dt;
			p.mesh.rotation.z += p.spin * dt;
			p.mesh.scale.setScalar(Math.max(0, p.life / 0.8));
			if (p.life <= 0) this.root.remove(p.mesh);
		}
		this.particles = this.particles.filter((p) => p.life > 0);
		this.shake = Math.max(0, this.shake - dt);
		this.camera.position.x = reduced
			? 0
			: Math.sin(performance.now() * 0.06) * this.shake;
		this.camera.position.y = reduced
			? 0
			: Math.cos(performance.now() * 0.07) * this.shake;
	}
	resize() {
		const w = this.container.clientWidth,
			h = this.container.clientHeight;
		if (w && h) {
			this.renderer.setSize(w, h, false);
			const ar = w / h,
				halfHeight = Math.max(13.5, 10.55 / ar);
			this.camera.left = -halfHeight * ar;
			this.camera.right = halfHeight * ar;
			this.camera.top = halfHeight;
			this.camera.bottom = -halfHeight;
			this.camera.updateProjectionMatrix();
		}
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
	screen(x, y) {
		const v = new THREE.Vector3(x, y, 0).project(this.camera);
		return {
			x: ((v.x + 1) / 2) * this.container.clientWidth,
			y: ((1 - v.y) / 2) * this.container.clientHeight,
		};
	}
	pointerX(clientX) {
		const rect = this.container.getBoundingClientRect();
		return (
			this.camera.left +
			((clientX - rect.left) / rect.width) *
				(this.camera.right - this.camera.left)
		);
	}
}
