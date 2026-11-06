class RiotScene {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#ddbd87");
		this.camera = new THREE.OrthographicCamera(-25, 25, 16, -16, 0.1, 150);
		this.camera.position.set(0, 38, 28);
		this.camera.lookAt(0, 0, 0);
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.effects = [];
		this.cars = [];
		this.dotMeshes = [];
		this.materials = {};
		this.serial = -1;
		this.clock = 0;
		this.shake = 0;
		this.ready = false;
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
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL2 fallback";
		this.renderer.onDeviceLost = (info) => this.recoverDevice(info);
		this.scene.add(new THREE.HemisphereLight(0xfff4cf, 0x263e44, 2.3));
		const light = new THREE.DirectionalLight(0xfff2c6, 3.2);
		light.position.set(-10, 30, 12);
		this.scene.add(light);
		this.buildWorld();
		this.resize();
		this.ready = true;
	}
	async recoverDevice(info) {
		if (this.recovering) return;
		this.recovering = true;
		this.ready = false;
		this.framePending = false;
		this.gpuLoss = {
			api: info.api,
			message: info.message,
			reason: info.reason,
		};
		const old = this.renderer;
		old._isDeviceLost = true;
		old.onDeviceLost = () => {};
		try {
			// Let the browser finish resetting its graphics process before requesting another context.
			await new Promise((resolve) => setTimeout(resolve, 1000));
			let canvas, context;
			for (let i = 0; i < 5; i++) {
				canvas = document.createElement("canvas");
				context = canvas.getContext("webgl2", {
					antialias: true,
					alpha: true,
					depth: true,
					stencil: false,
				});
				if (context) break;
				await new Promise((resolve) => setTimeout(resolve, 400));
			}
			if (!context)
				throw new Error("The browser could not restore its graphics context.");
			canvas.id = "recovery-canvas";
			canvas.setAttribute("aria-hidden", "true");
			canvas.style.cssText =
				"position:fixed;inset:0;width:100%;height:100%;pointer-events:none";
			const previous = document.getElementById("recovery-canvas");
			this.canvas.before(canvas);
			previous?.remove();
			this.canvas.style.opacity = "0";
			this.renderer = new THREE.WebGPURenderer({
				canvas,
				context,
				antialias: true,
				forceWebGL: true,
			});
			this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
			this.renderer.outputColorSpace = THREE.SRGBColorSpace;
			await this.renderer.init();
			this.renderer.onDeviceLost = (event) => {
				this.recovering = false;
				this.recoverDevice(event);
			};
			this.scene.traverse((object) => {
				const materials = object.material
					? Array.isArray(object.material)
						? object.material
						: [object.material]
					: [];
				for (const material of materials) {
					material.needsUpdate = true;
					for (const value of Object.values(material))
						if (value?.isTexture) value.needsUpdate = true;
				}
			});
			this.backend = "WebGPU → WebGL 2 recovery";
			this.ready = true;
			this.resize();
			console.warn(
				"WebGPU device lost; recovered the complete scene with Three.js WebGL 2.",
				info.message,
			);
			this.retiredRenderer = old;
		} catch (error) {
			console.error("Graphics recovery failed", error);
		}
	}
	mat(color, unlit = false) {
		const key = color + unlit;
		if (!this.materials[key])
			this.materials[key] = unlit
				? new THREE.MeshBasicMaterial({ color })
				: new THREE.MeshToonMaterial({ color, gradientMap: this.gradient() });
		return this.materials[key];
	}
	gradient() {
		if (this.grad) return this.grad;
		const data = new Uint8Array([75, 155, 255]);
		this.grad = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
		this.grad.minFilter = THREE.NearestFilter;
		this.grad.magFilter = THREE.NearestFilter;
		this.grad.needsUpdate = true;
		return this.grad;
	}
	mesh(geo, color, parent = this.root, ink = false) {
		const m = new THREE.Mesh(geo, this.mat(color));
		parent.add(m);
		if (ink) {
			const l = new THREE.LineSegments(
				new THREE.EdgesGeometry(geo, 25),
				new THREE.LineBasicMaterial({ color: 0x142a2d }),
			);
			m.add(l);
		}
		return m;
	}
	box(w, h, d, color, x, y, z, parent = this.root, ink = true) {
		const m = this.mesh(new THREE.BoxGeometry(w, h, d), color, parent, ink);
		m.position.set(x, y, z);
		return m;
	}
	ringShape(w, h, r) {
		const s = new THREE.Shape();
		s.moveTo(-w + r, -h);
		s.lineTo(w - r, -h);
		s.quadraticCurveTo(w, -h, w, -h + r);
		s.lineTo(w, h - r);
		s.quadraticCurveTo(w, h, w - r, h);
		s.lineTo(-w + r, h);
		s.quadraticCurveTo(-w, h, -w, h - r);
		s.lineTo(-w, -h + r);
		s.quadraticCurveTo(-w, -h, -w + r, -h);
		return s;
	}
	linePath(lane, offset, y, color, width = 1) {
		const l = LANES[lane];
		const shape = this.ringShape(l.w + offset, l.h + offset, l.r + offset);
		const points = shape
			.getPoints(80)
			.map((p) => new THREE.Vector3(p.x, y, p.y));
		const line = new THREE.LineLoop(
			new THREE.BufferGeometry().setFromPoints(points),
			new THREE.LineBasicMaterial({ color, linewidth: width }),
		);
		this.root.add(line);
		return line;
	}
	ribbon(w, h, r, thick, y, color) {
		const outer = this.ringShape(w + thick / 2, h + thick / 2, r + thick / 2);
		const inner = this.ringShape(w - thick / 2, h - thick / 2, r - thick / 2);
		outer.holes.push(new THREE.Path(inner.getPoints(80).reverse()));
		const m = this.mesh(new THREE.ShapeGeometry(outer, 64), color);
		m.rotation.x = Math.PI / 2;
		m.position.y = y;
		m.material.side = THREE.DoubleSide;
		return m;
	}
	textTexture(text, bg = "#e9dfbd", fg = "#183435", w = 1024, h = 256) {
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		const g = c.getContext("2d");
		g.fillStyle = bg;
		g.fillRect(0, 0, w, h);
		g.fillStyle = fg;
		g.textAlign = "center";
		g.textBaseline = "middle";
		g.font = `900 ${h * 0.72}px Arial, sans-serif`;
		g.fillText(text, w / 2, h * 0.55, w * 0.92);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	}
	sign(text, w, h, x, y, z, bg, fg, parent = this.root) {
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({
				map: this.textTexture(text, bg, fg),
				side: THREE.DoubleSide,
			}),
		);
		m.position.set(x, y, z);
		parent.add(m);
		return m;
	}
	buildWorld() {
		const ground = this.box(
			200,
			0.3,
			200,
			"#ddbd87",
			0,
			-1.25,
			0,
			this.scene,
			false,
		);
		for (let i = 0; i < 45; i++) {
			const x = ((i * 59.7) % 77) - 38,
				z = ((i * 31.3) % 62) - 31;
			if (Math.abs(x) < 17 && Math.abs(z) < 13) continue;
			const dash = this.box(
				1.8,
				0.02,
				0.065,
				i % 3 ? "#bc9c71" : "#e8cfa4",
				x,
				-1.08,
				z,
				this.scene,
				false,
			);
			dash.rotation.y = -0.5;
		}
		const base = this.mesh(
			new THREE.ExtrudeGeometry(this.ringShape(15.7, 12, 6), {
				depth: 0.7,
				bevelEnabled: true,
				bevelSize: 0.2,
				bevelThickness: 0.12,
				steps: 1,
				curveSegments: 32,
			}),
			"#173b3e",
			this.root,
			true,
		);
		base.rotation.x = Math.PI / 2;
		base.position.y = -0.1;
		const outer = this.ringShape(15.45, 11.8, 6);
		const inner = this.ringShape(6.18, 2.53, 1.18);
		outer.holes.push(new THREE.Path(inner.getPoints(80).reverse()));
		const road = this.mesh(new THREE.ShapeGeometry(outer, 64), "#2d4848");
		road.rotation.x = Math.PI / 2;
		road.position.y = 0.03;
		road.material.side = THREE.DoubleSide;
		this.ribbon(15.36, 11.71, 5.94, 0.15, 0.06, "#0c262c");
		this.ribbon(15.16, 11.51, 5.74, 0.13, 0.075, "#f5e3b3");
		this.ribbon(6.25, 2.6, 1.3, 0.2, 0.08, "#f2dfb3");
		for (let l = 0; l < 3; l++) {
			const a = LANES[l],
				b = LANES[l + 1];
			this.ribbon(
				(a.w + b.w) / 2,
				(a.h + b.h) / 2,
				(a.r + b.r) / 2,
				0.1,
				0.08,
				"#809d8c",
			);
		}
		for (let g = 0; g < 4; g++) {
			const p = trackPoint(3, g * 0.25);
			const gate = new THREE.Group();
			gate.position.set(p.x, 0.1, p.z);
			gate.rotation.y = g % 2 ? Math.PI / 2 : 0;
			this.root.add(gate);
			for (let i = 0; i < 6; i++)
				this.box(
					0.48,
					0.025,
					0.22,
					"#e5d3a4",
					-1.45 + i * 0.58,
					0.01,
					0,
					gate,
					false,
				);
		}
		// Small breaks across every dividing rail mark the four lane-change junctions.
		for (let l = 0; l < 3; l++)
			for (let g = 0; g < 4; g++) {
				const p1 = trackPoint(l, g * 0.25),
					p2 = trackPoint(l + 1, g * 0.25);
				this.box(
					g % 2 ? 2.4 : 3.6,
					0.025,
					g % 2 ? 3.6 : 2.4,
					"#2d4848",
					(p1.x + p2.x) / 2,
					0.11,
					(p1.z + p2.z) / 2,
					this.root,
					false,
				);
			}
		for (let g = 0; g < 4; g++) {
			const p = trackPoint(3, g * 0.25);
			const orient = (g * Math.PI) / 2;
			const marker = this.box(
				g % 2 ? 0.17 : 2.8,
				0.025,
				g % 2 ? 2.8 : 0.17,
				"#f1bf54",
				p.x,
				0.15,
				p.z,
			);
			marker.rotation.y = 0;
		}
		// Start/finish stripe.
		for (let l = 0; l < 4; l++)
			for (let a = 0; a < 4; a++)
				for (let b = 0; b < 2; b++) {
					const p = trackPoint(l, 0);
					this.box(
						0.34,
						0.025,
						0.48,
						(a + b) % 2 ? "#f7e5ba" : "#193638",
						p.x + (a - 1.5) * 0.34,
						0.16,
						p.z + (b - 0.5) * 0.48,
						this.root,
						false,
					);
				}
		const island = this.mesh(
			new THREE.ExtrudeGeometry(this.ringShape(5.95, 2.25, 1.1), {
				depth: 0.28,
				bevelEnabled: false,
				curveSegments: 20,
			}),
			"#447468",
			this.root,
			true,
		);
		island.rotation.x = Math.PI / 2;
		island.position.y = 0.2;
		this.box(5.8, 1.5, 2.15, "#e9d7a4", -0.8, 1, 0);
		this.box(6.15, 0.28, 2.55, "#f16d3e", -0.8, 1.91, 0);
		for (let i = 0; i < 3; i++) {
			this.box(1.45, 0.9, 0.045, "#173b3e", -2.65 + i * 1.8, 1.07, 1.09);
			this.box(1.2, 0.055, 0.06, "#a7c7ac", -2.65 + i * 1.8, 1.1, 1.13);
		}
		this.sign("RIOT", 4.5, 0.95, -0.8, 2.5, 0.08, "#f2ce68", "#173b3e");
		this.box(0.1, 1.5, 0.1, "#142e34", -2.8, 1.9, 0);
		this.box(0.1, 1.5, 0.1, "#142e34", 1.2, 1.9, 0);
		const roof = this.sign(
			"MOTOR CLUB",
			4.7,
			0.6,
			-0.8,
			2.08,
			0,
			"#f16d3e",
			"#173b3e",
		);
		roof.rotation.x = -Math.PI / 2;
		// Service props: pump, spare wheels, cones, pennants.
		for (let i = 0; i < 2; i++) {
			this.box(
				0.55,
				1.25,
				0.6,
				i ? "#93d4af" : "#f1bf54",
				3.6 + i * 0.85,
				0.83,
				0.55,
			);
			this.box(0.4, 0.34, 0.62, "#173b3e", 3.6 + i * 0.85, 1.04, 0.55);
		}
		for (let i = 0; i < 3; i++) {
			const t = this.mesh(
				new THREE.TorusGeometry(0.32, 0.12, 8, 16),
				"#142e34",
			);
			t.rotation.x = Math.PI / 2;
			t.position.set(-4.75, 0.43 + i * 0.22, 0.5);
		}
		for (let i = 0; i < 5; i++) {
			const cone = this.mesh(new THREE.ConeGeometry(0.2, 0.55, 5), "#f67a40");
			cone.position.set(-3 + i * 1.5, 0.5, -1.7);
		}
		for (let side of [-1, 1])
			for (let i = 0; i < 5; i++) {
				const x = side * 15.5,
					z = -4 + i * 2;
				this.box(0.25, 0.6, 0.65, i % 2 ? "#f1dfb4" : "#f47c43", x, 0.35, z);
			}
		const pennant = new THREE.Group();
		pennant.position.set(4.7, 0, -0.9);
		this.root.add(pennant);
		this.box(0.06, 3.2, 0.06, "#142e34", 0, 1.5, 0, pennant);
		const flag = this.mesh(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 2.9, 0),
				new THREE.Vector3(1, 2.65, 0),
				new THREE.Vector3(0, 2.4, 0),
			]),
			"#f2be54",
			pennant,
		);
		flag.geometry.setIndex([0, 1, 2]);
		flag.geometry.computeVertexNormals();
		flag.material.side = THREE.DoubleSide;
		const clip = new THREE.AnimationClip("Club flag", 2, [
			new THREE.NumberKeyframeTrack(
				".rotation[y]",
				[0, 1, 2],
				[-0.13, 0.13, -0.13],
			),
		]);
		this.flagMixer = new THREE.AnimationMixer(pennant);
		this.flagMixer.clipAction(clip).play();
		// Decorative club lettering beyond the curb.
		const a = this.sign(
			"KEEP IT MOVING",
			12,
			1.1,
			0,
			-0.75,
			13.7,
			"#ddbd87",
			"#31544b",
		);
		a.rotation.x = -Math.PI / 2;
	}
	makeCar(color, enemy = false) {
		const root = new THREE.Group();
		this.root.add(root);
		const model = new THREE.Group();
		model.name = "body";
		root.add(model);
		this.box(1.22, 0.32, 1.95, color, 0, 0.48, 0, model);
		this.box(1.3, 0.13, 2, "#152d31", 0, 0.28, 0, model);
		this.box(1.02, 0.43, 0.86, color, 0, 0.83, -0.17, model);
		this.box(0.88, 0.3, 0.035, "#173a40", 0, 0.87, 0.28, model);
		this.box(0.88, 0.24, 0.035, "#173a40", 0, 0.87, -0.62, model);
		this.box(0.035, 0.23, 0.65, "#173a40", 0.53, 0.87, -0.17, model);
		this.box(0.035, 0.23, 0.65, "#173a40", -0.53, 0.87, -0.17, model);
		this.box(0.2, 0.02, 0.53, "#f9e7be", 0, 0.655, 0.62, model, false);
		this.box(0.2, 0.02, 0.3, "#f9e7be", 0, 1.055, -0.13, model, false);
		for (const x of [-0.4, 0.4]) {
			this.box(
				0.23,
				0.12,
				0.05,
				enemy ? "#f8ab75" : "#fff4bc",
				x,
				0.5,
				1,
				model,
				false,
			);
			this.box(0.25, 0.09, 0.05, "#ef6645", x, 0.5, -1, model, false);
		}
		const wheels = [];
		for (const x of [-0.67, 0.67])
			for (const z of [-0.61, 0.61]) {
				const tire = this.mesh(
					new THREE.CylinderGeometry(0.27, 0.27, 0.2, 12),
					"#122e34",
					model,
					true,
				);
				tire.rotation.z = Math.PI / 2;
				tire.position.set(x, 0.3, z);
				tire.name = "wheel" + wheels.length;
				wheels.push(tire);
				const hub = this.mesh(
					new THREE.CylinderGeometry(0.115, 0.115, 0.215, 10),
					"#e5d6b1",
					tire,
				);
			}
		if (enemy) {
			const brow = this.box(
				0.78,
				0.07,
				0.055,
				"#f47a41",
				0,
				1.05,
				0.31,
				model,
				false,
			);
			brow.rotation.z = 0.1;
			this.box(1.35, 0.07, 0.25, "#142e34", 0, 0.92, -0.88, model);
		}
		const glow = new THREE.Mesh(
			new THREE.RingGeometry(0.8, 1.05, 36),
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.4,
				side: THREE.DoubleSide,
			}),
		);
		glow.rotation.x = -Math.PI / 2;
		glow.position.y = 0.18;
		root.add(glow);
		const mixer = new THREE.AnimationMixer(model);
		const tracks = [
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.13, 0.26],
				[0, 0.035, 0],
			),
		];
		wheels.forEach((w) =>
			tracks.push(
				new THREE.NumberKeyframeTrack(
					w.name + ".rotation[x]",
					[0, 0.35],
					[0, Math.PI * 2],
				),
			),
		);
		mixer
			.clipAction(
				new THREE.AnimationClip("Engine and wheel cycle", 0.35, tracks),
			)
			.play();
		return { root, model, mixer, glow, enemy };
	}
	syncRound(sim) {
		if (this.serial === sim.serial) return;
		this.serial = sim.serial;
		for (const c of this.cars) {
			this.root.remove(c.root);
		}
		this.cars = [
			...sim.players.map((p, i) => this.makeCar(i ? "#91dfba" : "#fa9a45")),
			...sim.enemies.map((e, i) =>
				this.makeCar(["#ca8eab", "#d78d57", "#a4b3da"][i], true),
			),
		];
		for (const m of this.dotMeshes) this.root.remove(m);
		this.dotMeshes = [];
		sim.dots.forEach((d) => {
			const geo = d.shield
				? new THREE.OctahedronGeometry(0.43)
				: new THREE.SphereGeometry(0.19, 8, 5);
			const m = new THREE.Mesh(
				geo,
				this.mat(d.shield ? "#91e7ca" : "#f7ce68", true),
			);
			m.position.set(d.x, 0.4, d.z);
			this.root.add(m);
			this.dotMeshes.push(m);
		});
	}
	burst(x, z, color, count = 12) {
		for (let i = 0; i < count; i++) {
			const m = this.mesh(new THREE.BoxGeometry(0.12, 0.12, 0.23), color);
			m.position.set(x, 0.6, z);
			const a = Math.random() * Math.PI * 2;
			this.effects.push({
				m,
				vx: Math.cos(a) * (2 + Math.random() * 3),
				vz: Math.sin(a) * (2 + Math.random() * 3),
				vy: 2 + Math.random() * 4,
				life: 0.45 + Math.random() * 0.45,
				max: 1,
			});
		}
	}
	update(dt, sim, screen) {
		this.clock += dt;
		if (!this.ready) return;
		this.syncRound(sim);
		this.flagMixer.update(dt);
		const title = screen === "title" || sim.attract;
		const targetX = title && innerWidth > 850 ? 6.7 : 0;
		this.root.position.x = lerp(
			this.root.position.x,
			targetX,
			Math.min(1, dt * 3),
		);
		this.root.rotation.y = lerp(
			this.root.rotation.y,
			title ? -0.12 : 0,
			Math.min(1, dt * 2),
		);
		const all = [...sim.players, ...sim.enemies];
		all.forEach((c, i) => {
			const m = this.cars[i];
			if (!m) return;
			const p = carPoint(c);
			m.root.position.set(p.x, 0, p.z);
			m.root.rotation.y = carHeading(c);
			m.model.rotation.z = lerp(
				m.model.rotation.z,
				c.change ? 0.13 * Math.sin(c.change.t * Math.PI) : 0,
				0.15,
			);
			m.mixer.timeScale = c.boosting ? 2.8 : c.braking ? 0.7 : 1.5;
			m.mixer.update(dt);
			m.glow.visible = !m.enemy && (c.invuln > 0 || c.boosting);
			m.glow.scale.setScalar(
				c.boosting ? 1.35 : 1 + Math.sin(this.clock * 8) * 0.1,
			);
			m.model.visible =
				(screen === "title" && !attract) ||
				!(!m.enemy && c.invuln > 0 && Math.floor(this.clock * 14) % 2 === 0);
			if (c.boosting && Math.random() < 0.5) {
				const behind = trackPoint(c.lane, c.progress - 0.012);
				this.burst(behind.x, behind.z, "#f8cd67", 1);
			}
		});
		this.dotMeshes.forEach((m, i) => {
			m.visible = !sim.dots[i]?.collected;
			if (sim.dots[i]?.shield) {
				m.rotation.y += dt * 2;
				m.position.y = 0.55 + Math.sin(this.clock * 4) * 0.12;
			}
		});
		this.effects = this.effects.filter((e) => {
			e.life -= dt;
			if (e.life <= 0) {
				this.root.remove(e.m);
				e.m.geometry.dispose();
				return false;
			}
			e.m.position.x += e.vx * dt;
			e.m.position.z += e.vz * dt;
			e.m.position.y += e.vy * dt;
			e.vy -= 14 * dt;
			e.m.rotation.x += dt * 8;
			e.m.rotation.z += dt * 5;
			e.m.scale.setScalar(Math.min(1, e.life * 3));
			return true;
		});
		this.shake = Math.max(0, this.shake - dt * 3);
		this.camera.position.x = (Math.random() - 0.5) * this.shake * 0.5;
		this.camera.position.y = 38;
		this.camera.lookAt(0, 0, 0);
	}
	resize() {
		if (!this.renderer) return;
		const w = innerWidth,
			h = innerHeight,
			a = w / h;
		const span = a > 1 ? 31 : 34 / a;
		this.camera.left = (-span * a) / 2;
		this.camera.right = (span * a) / 2;
		this.camera.top = span / 2;
		this.camera.bottom = -span / 2;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h);
	}
	render() {
		if (this.ready) {
			this.renderer.render(this.scene, this.camera);
			this.lastDrawCalls = this.renderer.info.render.drawCalls;
			this.framesRendered = (this.framesRendered || 0) + 1;
		}
	}
}
