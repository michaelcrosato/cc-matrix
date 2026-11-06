class SolarScene {
	constructor(canvas) {
		this.canvas = canvas;
		this.objects = new Map();
		this.fx = [];
		this.mixers = [];
		this.t = 0;
		this.shake = 0;
		this.flash = 0;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#080f20");
		this.scene.fog = new THREE.FogExp2("#0b1426", 0.0011);
		this.camera = new THREE.PerspectiveCamera(
			54,
			innerWidth / innerHeight,
			0.1,
			2500,
		);
		this.camera.position.set(0, 7, 30);
		this.camera.lookAt(0, 0, -50);
		this.tmp = new THREE.Vector3();
		this.ray = new THREE.Raycaster();
		this.stars = [];
		this.palette = {
			cream: "#f5e8c9",
			orange: "#f3a254",
			mint: "#86e0ca",
			red: "#d95760",
			navy: "#25384f",
			dark: "#101b30",
		};
		this.gradient = new THREE.DataTexture(
			new Uint8Array([65, 65, 65, 255, 150, 150, 150, 255, 255, 255, 255, 255]),
			3,
			1,
			THREE.RGBAFormat,
		);
		this.gradient.needsUpdate = true;
		this.gradient.minFilter = THREE.NearestFilter;
		this.gradient.magFilter = THREE.NearestFilter;
		this.scene.add(new THREE.AmbientLight("#a6b8dc", 2));
		const sun = new THREE.DirectionalLight("#ffdb9d", 3.7);
		sun.position.set(-40, 65, 55);
		this.scene.add(sun);
		const rim = new THREE.DirectionalLight("#64c8cd", 2);
		rim.position.set(50, -15, -30);
		this.scene.add(rim);
		this.backdrop();
		this.player = this.ship("player");
		this.scene.add(this.player);
		this.wing = this.ship("wing");
		this.scene.add(this.wing);
		this.wing.visible = false;
		this.titleFormation = [];
		for (let i = 0; i < 3; i++) {
			const s = this.ship("enemy");
			s.scale.setScalar(0.35);
			s.position.set(25 + i * 7, 6 + i * 2, -90 - i * 22);
			s.rotation.y = 0.2;
			this.scene.add(s);
			this.titleFormation.push(s);
		}
		this.shield = new THREE.Mesh(
			new THREE.SphereGeometry(2.9, 24, 16),
			new THREE.MeshBasicMaterial({
				color: "#8fe8d0",
				transparent: true,
				opacity: 0,
				wireframe: true,
			}),
		);
		this.scene.add(this.shield);
		this.pulseRing = new THREE.Mesh(
			new THREE.RingGeometry(0.92, 1, 96),
			new THREE.MeshBasicMaterial({
				color: "#9df8dc",
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0,
			}),
		);
		this.scene.add(this.pulseRing);
		this.pulseLife = 0;
		this.shipTrail = [];
		this.engine = "Loading";
	}
	async init() {
		this.renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setSize(innerWidth, innerHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.1;
		await this.renderer.init();
		this.engine = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL2 compatibility";
		this.resize();
	}
	mat(color, opts = {}) {
		return new THREE.MeshToonMaterial({
			color,
			gradientMap: this.gradient,
			...opts,
		});
	}
	ink(geometry, material, scale = 1.045) {
		const g = new THREE.Group();
		const black = new THREE.Mesh(
			geometry,
			new THREE.MeshBasicMaterial({ color: "#070e1a", side: THREE.BackSide }),
		);
		black.scale.setScalar(scale);
		g.add(black);
		const body = new THREE.Mesh(geometry, material);
		g.add(body);
		return g;
	}
	box(w, h, d, col) {
		return this.ink(new THREE.BoxGeometry(w, h, d), this.mat(col));
	}
	poly(points, col) {
		const geo = new THREE.BufferGeometry();
		const vertices = [];
		for (const tri of points) vertices.push(...tri);
		geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		geo.computeVertexNormals();
		return this.ink(geo, this.mat(col, { side: THREE.DoubleSide }));
	}
	ship(type) {
		const g = new THREE.Group(),
			enemy = type === "enemy",
			wing = type === "wing",
			c = enemy ? "#ce5260" : wing ? "#81bda8" : "#f0e5ca";
		const fus = this.ink(new THREE.ConeGeometry(0.88, 5.1, 5), this.mat(c));
		fus.rotation.x = -Math.PI / 2;
		fus.rotation.z = Math.PI / 5;
		g.add(fus);
		const back = this.box(1.8, 0.65, 1.4, enemy ? "#8d314f" : "#34475a");
		back.position.z = 1.1;
		g.add(back);
		const cockpit = this.ink(
			new THREE.SphereGeometry(0.63, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
			this.mat("#162c43"),
		);
		cockpit.scale.set(0.8, 0.7, 1.7);
		cockpit.position.set(0, 0.48, -0.2);
		g.add(cockpit);
		const glass = this.box(0.1, 0.1, 1.2, "#8fe8d0");
		glass.position.set(0.0, 0.94, -0.3);
		g.add(glass);
		const wingGeo = new THREE.BufferGeometry();
		wingGeo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(
				[
					0.5, 0, -1.2, 4, 0, 1.8, 0.5, 0, 1.1, 0.5, 0, -1.2, 0.5, 0.3, 0.8, 4,
					0, 1.8, 0.5, 0, 1.1, 4, 0, 1.8, 0.5, 0.3, 0.8,
				],
				3,
			),
		);
		wingGeo.computeVertexNormals();
		for (const dir of [-1, 1]) {
			const w = this.ink(wingGeo, this.mat(c, { side: THREE.DoubleSide }));
			w.scale.x = dir;
			g.add(w);
			const tip = this.box(0.32, 0.34, 1.65, enemy ? "#341b38" : "#bd7148");
			tip.position.set(dir * 3.3, 0.0, 1.2);
			g.add(tip);
			const fin = this.box(0.14, 1.25, 1.15, c);
			fin.position.set(dir * 1, 0.65, 1.4);
			fin.rotation.z = dir * -0.18;
			g.add(fin);
			const cannon = this.ink(
				new THREE.CylinderGeometry(0.12, 0.18, 1.9, 6),
				this.mat("#25384e"),
			);
			cannon.rotation.x = Math.PI / 2;
			cannon.position.set(dir * 2.5, -0.07, 0.1);
			g.add(cannon);
			const nozzle = this.ink(
				new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8),
				this.mat("#263a50"),
			);
			nozzle.rotation.x = Math.PI / 2;
			nozzle.position.set(dir * 0.76, -0.2, 2);
			g.add(nozzle);
			const fire = new THREE.Group();
			fire.name = "flame" + (dir < 0 ? "L" : "R");
			fire.position.set(dir * 0.76, -0.2, 2.6);
			const flame = new THREE.Mesh(
				new THREE.ConeGeometry(0.28, 2.7, 6),
				new THREE.MeshBasicMaterial({ color: enemy ? "#ff6d8d" : "#9ff2d8" }),
			);
			flame.rotation.x = Math.PI / 2;
			flame.position.z = 1;
			fire.add(flame);
			const hot = new THREE.Mesh(
				new THREE.ConeGeometry(0.14, 1.6, 5),
				new THREE.MeshBasicMaterial({ color: "#ffffff" }),
			);
			hot.rotation.x = Math.PI / 2;
			hot.position.z = 0.45;
			fire.add(hot);
			g.add(fire);
		}
		const trim = this.box(0.14, 0.12, 2, "#d28647");
		trim.position.set(0, 0.3, -1.6);
		g.add(trim);
		if (enemy) {
			g.scale.setScalar(0.8);
			g.rotation.y = Math.PI;
		}
		const mixer = new THREE.AnimationMixer(g);
		const clips = [
			new THREE.VectorKeyframeTrack(
				"flameL.scale",
				[0, 0.13, 0.26, 0.4],
				[1, 1, 1, 1, 1, 1.5, 1, 1, 0.8, 1, 1, 1],
			),
			new THREE.VectorKeyframeTrack(
				"flameR.scale",
				[0, 0.1, 0.24, 0.4],
				[1, 1, 1.3, 1, 1, 0.8, 1, 1, 1.5, 1, 1, 1.3],
			),
		];
		mixer
			.clipAction(new THREE.AnimationClip("Ion drive flutter", 0.4, clips))
			.play();
		this.mixers.push({ root: g, mixer });
		return g;
	}
	backdrop() {
		const sky = new THREE.Group();
		this.sky = sky;
		this.scene.add(sky);
		const starPos = [],
			starCol = [];
		let seed = 73219;
		const r = () => {
			seed = (seed * 16807) % 2147483647;
			return seed / 2147483647;
		};
		for (let i = 0; i < 2600; i++) {
			starPos.push((r() - 0.5) * 1800, (r() - 0.5) * 1100, -220 - r() * 900);
			const v = 0.35 + r() * 0.6;
			starCol.push(v, v * (0.85 + r() * 0.15), v * (0.8 + r() * 0.2));
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(starPos, 3),
		);
		geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(starCol, 3),
		);
		sky.add(
			new THREE.Points(
				geometry,
				new THREE.PointsMaterial({
					size: 1.05,
					sizeAttenuation: true,
					vertexColors: true,
					transparent: true,
					opacity: 0.9,
				}),
			),
		);
		const canvas = document.createElement("canvas");
		canvas.width = 1024;
		canvas.height = 512;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#081020";
		ctx.fillRect(0, 0, 1024, 512);
		for (let i = 0; i < 55; i++) {
			const x = r() * 1100 - 60,
				y = 140 + r() * 260,
				rr = 60 + r() * 170;
			const grad = ctx.createRadialGradient(x, y, 0, x, y, rr);
			const hue =
				i % 3 === 0 ? "163,74,92" : i % 3 === 1 ? "50,112,129" : "83,65,116";
			grad.addColorStop(0, `rgba(${hue},.13)`);
			grad.addColorStop(1, `rgba(${hue},0)`);
			ctx.fillStyle = grad;
			ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
		}
		for (let i = 0; i < 90; i++) {
			ctx.beginPath();
			ctx.moveTo(r() * 1024, r() * 512);
			ctx.lineTo(r() * 1024, r() * 512);
			ctx.strokeStyle = "rgba(176,163,142,.015)";
			ctx.stroke();
		}
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		const nebula = new THREE.Mesh(
			new THREE.PlaneGeometry(2200, 1100),
			new THREE.MeshBasicMaterial({ map: texture, depthWrite: false }),
		);
		nebula.position.z = -1300;
		sky.add(nebula);
		const texCanvas = document.createElement("canvas");
		texCanvas.width = 512;
		texCanvas.height = 256;
		const pctx = texCanvas.getContext("2d");
		pctx.fillStyle = "#d39b70";
		pctx.fillRect(0, 0, 512, 256);
		const colors = [
			"#b77b5a",
			"#efbc83",
			"#d8a478",
			"#c18b6c",
			"#e7b889",
			"#8e6657",
		];
		for (let y = 0; y < 256; ) {
			const h = 2 + r() * 20;
			pctx.fillStyle = colors[Math.floor(r() * colors.length)];
			pctx.fillRect(0, y, 512, h);
			y += h;
		}
		const pt = new THREE.CanvasTexture(texCanvas);
		pt.colorSpace = THREE.SRGBColorSpace;
		const planet = this.ink(
			new THREE.SphereGeometry(66, 64, 40),
			this.mat("#e0b185", { map: pt }),
			1.008,
		);
		planet.position.set(95, 27, -265);
		planet.rotation.z = 0.24;
		this.planet = planet;
		sky.add(planet);
		const halo = new THREE.Mesh(
			new THREE.SphereGeometry(67.2, 48, 32),
			new THREE.MeshBasicMaterial({
				color: "#f9b77c",
				side: THREE.BackSide,
				transparent: true,
				opacity: 0.17,
			}),
		);
		planet.add(halo);
		const rings = new THREE.Group();
		rings.position.copy(planet.position);
		rings.rotation.set(1.18, 0.16, -0.28);
		for (let i = 0; i < 10; i++) {
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(83 + i * 4.2, 85 + i * 4.2, 160),
				new THREE.MeshBasicMaterial({
					color: i % 3 === 0 ? "#403c3e" : i % 2 === 0 ? "#ceac83" : "#8c7d71",
					side: THREE.DoubleSide,
					transparent: true,
					opacity: i % 3 === 0 ? 0.42 : 0.75,
				}),
			);
			rings.add(ring);
		}
		sky.add(rings);
		this.rings = rings;
		this.createHomeworld();
		const sunGroup = new THREE.Group();
		sunGroup.position.set(-160, 72, -580);
		const sun = new THREE.Mesh(
			new THREE.SphereGeometry(44, 32, 24),
			new THREE.MeshBasicMaterial({ color: "#ffbf78" }),
		);
		sunGroup.add(sun);
		for (let i = 0; i < 3; i++) {
			const h = new THREE.Mesh(
				new THREE.SphereGeometry(48 + i * 6, 32, 24),
				new THREE.MeshBasicMaterial({
					color: "#ed8e61",
					transparent: true,
					opacity: 0.035,
					side: THREE.BackSide,
				}),
			);
			sunGroup.add(h);
		}
		sky.add(sunGroup);
		const orbitPoints = [];
		for (let i = 0; i <= 150; i++) {
			const a = (i / 150) * Math.PI * 2;
			orbitPoints.push(
				new THREE.Vector3(Math.cos(a) * 420, Math.sin(a) * 160, -600),
			);
		}
		const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
		sky.add(
			new THREE.Line(
				orbitGeo,
				new THREE.LineBasicMaterial({
					color: "#a8b8c3",
					transparent: true,
					opacity: 0.12,
				}),
			),
		);
		const verts = [];
		for (let i = 0; i < 160; i++) {
			const x = (r() - 0.5) * 260,
				y = (r() - 0.5) * 150,
				z = -r() * 350;
			verts.push(x, y, z, x, y, z - 2);
		}
		this.warpGeo = new THREE.BufferGeometry();
		this.warpGeo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(verts, 3),
		);
		this.warpLines = new THREE.LineSegments(
			this.warpGeo,
			new THREE.LineBasicMaterial({
				color: "#baf4df",
				transparent: true,
				opacity: 0,
			}),
		);
		this.scene.add(this.warpLines);
	}
	createHomeworld() {
		const cv = document.createElement("canvas");
		cv.width = 1024;
		cv.height = 512;
		const c = cv.getContext("2d");
		c.fillStyle = "#317b8d";
		c.fillRect(0, 0, 1024, 512);
		let seed = 161986;
		const random = () => {
			seed = (seed * 16807) % 2147483647;
			return seed / 2147483647;
		};
		for (let i = 0; i < 23; i++) {
			const x = random() * 1024,
				y = 80 + random() * 350,
				r = 18 + random() * 85;
			c.beginPath();
			for (let j = 0; j < 14; j++) {
				const a = (j / 14) * Math.PI * 2,
					rr = r * (0.5 + random() * 0.5),
					px = x + Math.cos(a) * rr,
					py = y + Math.sin(a) * rr * 0.6;
				if (!j) c.moveTo(px, py);
				else c.lineTo(px, py);
			}
			c.closePath();
			c.fillStyle = i % 3 ? "#b7ba86" : "#688d74";
			c.fill();
			c.strokeStyle = "#25495d";
			c.lineWidth = 2;
			c.stroke();
		}
		c.fillStyle = "#dce5cb";
		c.beginPath();
		c.ellipse(512, 0, 620, 40, 0, 0, Math.PI * 2);
		c.fill();
		c.beginPath();
		c.ellipse(512, 512, 620, 34, 0, 0, Math.PI * 2);
		c.fill();
		const tex = new THREE.CanvasTexture(cv);
		tex.colorSpace = THREE.SRGBColorSpace;
		const home = this.ink(
			new THREE.SphereGeometry(105, 64, 40),
			this.mat("#d0f0dd", { map: tex }),
			1.009,
		);
		home.position.set(-110, -125, -310);
		home.rotation.z = 0.18;
		const atmosphere = new THREE.Mesh(
			new THREE.SphereGeometry(107, 48, 32),
			new THREE.MeshBasicMaterial({
				color: "#8fe8d0",
				side: THREE.BackSide,
				transparent: true,
				opacity: 0.18,
			}),
		);
		home.add(atmosphere);
		this.sky.add(home);
		home.visible = false;
		this.homeworld = home;
	}
	entity(e) {
		let mesh;
		switch (e.type) {
			case "enemy":
				mesh = this.ship("enemy");
				if (e.kind === "jammer") {
					mesh.scale.multiplyScalar(e.scale || 1.7);
					const dish = this.ink(
						new THREE.TorusGeometry(1.5, 0.12, 5, 12),
						this.mat("#b79ece"),
					);
					dish.position.set(0, 1.4, 0);
					dish.rotation.x = 0.3;
					mesh.add(dish);
					const beacon = new THREE.Mesh(
						new THREE.OctahedronGeometry(0.45),
						new THREE.MeshBasicMaterial({ color: "#b5a5ff" }),
					);
					beacon.position.set(0, 2.2, 0);
					mesh.add(beacon);
				}
				if (e.kind === "bomber") {
					mesh.scale.multiplyScalar(1.5);
					const b = this.box(3, 0.8, 2, "#944054");
					b.position.z = 1;
					mesh.add(b);
				}
				break;
			case "boss": {
				mesh = new THREE.Group();
				const hull = this.ink(
					new THREE.IcosahedronGeometry(5.2, 0),
					this.mat("#8e4c62"),
				);
				hull.scale.set(1.8, 0.7, 1);
				mesh.add(hull);
				for (const side of [-1, 1]) {
					const boom = this.box(2.6, 1.8, 9, "#b85b62");
					boom.position.set(side * 9, 0, 0);
					mesh.add(boom);
					const beam = this.box(8, 0.9, 2, "#41344f");
					beam.position.set(side * 5, 0, 1);
					mesh.add(beam);
					const reactor = new THREE.Mesh(
						new THREE.SphereGeometry(1.1, 12, 8),
						new THREE.MeshBasicMaterial({ color: "#ffb064" }),
					);
					reactor.position.set(side * 9, 0, 4.6);
					mesh.add(reactor);
					for (let i = 0; i < 3; i++) {
						const fin = this.box(0.3, 2.8, 1, "#f1bb90");
						fin.position.set(side * (8.5 + i), 1.2, -2 + i);
						fin.rotation.z = side * 0.4;
						mesh.add(fin);
					}
				}
				const eye = new THREE.Mesh(
					new THREE.OctahedronGeometry(1.6),
					new THREE.MeshBasicMaterial({ color: "#ffcc8d" }),
				);
				eye.position.set(0, 0, 4.5);
				mesh.add(eye);
				const halo = new THREE.Mesh(
					new THREE.TorusGeometry(2.3, 0.08, 6, 30),
					new THREE.MeshBasicMaterial({ color: "#ff6d69" }),
				);
				halo.position.z = 4;
				mesh.add(halo);
				const mixer = new THREE.AnimationMixer(mesh);
				mixer
					.clipAction(
						new THREE.AnimationClip("Blockade pulse", 2, [
							new THREE.VectorKeyframeTrack(
								eye.uuid + ".scale",
								[0, 1, 2],
								[1, 1, 1, 1.2, 1.2, 1.2, 1, 1, 1],
							),
						]),
					)
					.play();
				this.mixers.push({ root: mesh, mixer });
				break;
			}
			case "asteroid":
				mesh = this.ink(
					new THREE.IcosahedronGeometry(e.scale || 2.4, 0),
					this.mat(e.kind === "ice" ? "#7aabb4" : "#776a74"),
				);
				for (let i = 0; i < 3; i++) {
					const seam = this.box(0.1, (e.scale || 2) * 1.4, 0.16, "#b0948a");
					seam.rotation.z = i * 1.1;
					seam.position.z = (e.scale || 2) * 0.8;
					mesh.add(seam);
				}
				break;
			case "pod": {
				mesh = new THREE.Group();
				const capsule = this.ink(
					new THREE.CylinderGeometry(0.65, 0.65, 1.8, 6),
					this.mat("#e2d4ad"),
				);
				capsule.rotation.z = Math.PI / 2;
				mesh.add(capsule);
				const window = this.box(0.65, 0.6, 0.1, "#5dcfbd");
				window.position.z = 0.58;
				mesh.add(window);
				const ring = new THREE.Mesh(
					new THREE.TorusGeometry(1.65, 0.035, 5, 30),
					new THREE.MeshBasicMaterial({ color: "#8fe8d0" }),
				);
				ring.name = "rescueRing";
				mesh.add(ring);
				const cross = this.box(0.15, 0.7, 0.1, "#ffbd65");
				cross.position.set(0, 0.9, 0);
				mesh.add(cross);
				const cross2 = this.box(0.7, 0.15, 0.1, "#ffbd65");
				cross2.position.set(0, 0.9, 0);
				mesh.add(cross2);
				const mixer = new THREE.AnimationMixer(mesh);
				mixer
					.clipAction(
						new THREE.AnimationClip("Rescue beacon", 2, [
							new THREE.NumberKeyframeTrack(
								"rescueRing.rotation[z]",
								[0, 2],
								[0, Math.PI * 2],
							),
							new THREE.VectorKeyframeTrack(
								"rescueRing.scale",
								[0, 1, 2],
								[1, 1, 1, 1.3, 1.3, 1.3, 1, 1, 1],
							),
						]),
					)
					.play();
				this.mixers.push({ root: mesh, mixer });
				break;
			}
			case "base": {
				mesh = new THREE.Group();
				const ring = this.ink(
					new THREE.TorusGeometry(10, 0.7, 5, 12),
					this.mat("#d0bc9c"),
				);
				ring.name = "stationRing";
				mesh.add(ring);
				const core = this.ink(
					new THREE.CylinderGeometry(2.5, 3.2, 5, 8),
					this.mat("#aab9ba"),
				);
				core.rotation.x = Math.PI / 2;
				mesh.add(core);
				for (let i = 0; i < 6; i++) {
					const a = (i * Math.PI) / 3;
					const arm = this.box(0.55, 9, 0.55, "#576b80");
					arm.position.set(Math.sin(a) * 5, Math.cos(a) * 5, 0);
					arm.rotation.z = -a;
					mesh.add(arm);
					const block = this.box(3.8, 2, 4.5, i % 2 ? "#dfba86" : "#809b9c");
					block.position.set(Math.sin(a) * 11, Math.cos(a) * 11, 0);
					block.rotation.z = -a;
					mesh.add(block);
					const lamp = new THREE.Mesh(
						new THREE.BoxGeometry(2, 0.25, 0.1),
						new THREE.MeshBasicMaterial({ color: "#8fe8d0" }),
					);
					lamp.position.copy(block.position);
					lamp.position.z = 2.31;
					lamp.rotation.z = -a;
					mesh.add(lamp);
				}
				const gate = new THREE.Mesh(
					new THREE.TorusGeometry(3.4, 0.07, 6, 48),
					new THREE.MeshBasicMaterial({ color: "#8fe8d0" }),
				);
				gate.position.z = 3;
				mesh.add(gate);
				const mixer = new THREE.AnimationMixer(mesh);
				mixer
					.clipAction(
						new THREE.AnimationClip("Docking ring", 30, [
							new THREE.NumberKeyframeTrack(
								"stationRing.rotation[z]",
								[0, 30],
								[0, Math.PI * 2],
							),
						]),
					)
					.play();
				this.mixers.push({ root: mesh, mixer });
				break;
			}
			default:
				mesh = this.ink(new THREE.OctahedronGeometry(0.3), this.mat("#ffffff"));
		}
		this.scene.add(mesh);
		return mesh;
	}
	removeObject(id, mesh) {
		this.scene.remove(mesh);
		this.objects.delete(id);
		const mix = this.mixers.find((x) => x.root === mesh);
		if (mix) {
			mix.mixer.stopAllAction();
			this.mixers.splice(this.mixers.indexOf(mix), 1);
		}
		mesh.traverse((o) => {
			if (o.isMesh) {
				o.geometry?.dispose();
				if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
				else o.material?.dispose();
			}
		});
	}
	clearDynamic() {
		for (const [id, mesh] of this.objects) this.removeObject(id, mesh);
		for (const f of this.fx) {
			this.scene.remove(f.mesh);
			f.mesh.geometry.dispose();
			f.mesh.material.dispose();
		}
		this.fx.length = 0;
		this.pulseLife = 0;
	}
	bounds(id) {
		const object = this.objects.get(id);
		if (!object) return null;
		const size = new THREE.Box3()
			.setFromObject(object)
			.getSize(new THREE.Vector3());
		return { width: size.x, height: size.y, depth: size.z };
	}
	event(e) {
		if (e.type === "reset") this.clearDynamic();
		if (e.type === "hit") {
			this.shake = Math.max(this.shake, 0.25);
			if (e.target === "player" || e.owner === "player") {
				this.flash = 0.45;
			}
		}
		if (e.type === "explode" || e.type === "rescue") {
			const color = e.type === "rescue" ? "#8fe8d0" : "#ffad67";
			const x = e.x || 0,
				y = e.y || 0,
				z = e.z ?? -40;
			this.burst(x, y, z, color, e.type === "rescue" ? 12 : 22);
			this.shake = Math.max(this.shake, 0.15);
		}
		if (e.type === "pulse") {
			this.pulseLife = 1;
			this.pulseRing.position.set(e.x || 0, e.y || 0, -15);
		}
		if (e.type === "shield") this.shield.material.opacity = 0.3;
		if (e.type === "warp") this.shake = 0.35;
	}
	burst(x, y, z, color, n) {
		for (let i = 0; i < n; i++) {
			const mesh = new THREE.Mesh(
				new THREE.OctahedronGeometry(0.12 + Math.random() * 0.4),
				new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
			);
			mesh.position.set(x, y, z);
			this.scene.add(mesh);
			this.fx.push({
				mesh,
				v: new THREE.Vector3(
					(Math.random() - 0.5) * 17,
					(Math.random() - 0.5) * 17,
					(Math.random() - 0.5) * 17,
				),
				life: 0.7 + Math.random() * 0.7,
				max: 1.4,
			});
		}
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.8, 1, 32),
			new THREE.MeshBasicMaterial({
				color,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.8,
			}),
		);
		ring.position.set(x, y, z);
		this.scene.add(ring);
		this.fx.push({
			mesh: ring,
			v: new THREE.Vector3(),
			life: 0.5,
			max: 0.5,
			ring: true,
		});
	}
	resize() {
		if (!this.renderer) return;
		this.camera.aspect = innerWidth / innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(innerWidth, innerHeight);
	}
	aim(x, y) {
		this.ray.setFromCamera(new THREE.Vector2(x, y), this.camera);
		const t = (-65 - this.ray.ray.origin.z) / this.ray.ray.direction.z;
		this.tmp
			.copy(this.ray.ray.direction)
			.multiplyScalar(t)
			.add(this.ray.ray.origin);
		return {
			aimX: THREE.MathUtils.clamp(this.tmp.x, -55, 55),
			aimY: THREE.MathUtils.clamp(this.tmp.y, -35, 35),
		};
	}
	project(x, y, z) {
		this.tmp.set(x, y, z).project(this.camera);
		return {
			x: (this.tmp.x * 0.5 + 0.5) * innerWidth,
			y: (-0.5 * this.tmp.y + 0.5) * innerHeight,
			visible: this.tmp.z < 1 && this.tmp.z > 0,
		};
	}
	update(s, dt, menu, boost = false) {
		this.t += dt;
		const title = menu === "title" || menu === "about-title" || !s;
		const flight = s && (s.state === "flight" || s.state === "warp") && !title;
		this.planet.rotation.y += dt * 0.008;
		const region = s?.pendingSector || s?.sector;
		const home = region === "solaris" && !title;
		this.homeworld.visible = home;
		if (home) this.homeworld.rotation.y += dt * 0.012;
		this.planet.position.x = title ? 95 : home ? 185 : 105;
		const tint = {
			anchor: "#d9c5a0",
			shard: "#efd0b3",
			echo: "#d9908e",
			haven: "#a0d3c5",
			chorus: "#a9b6b1",
			rift: "#ab859f",
			solaris: "#a3bdce",
		};
		this.planet.children[1].material.color.set(
			title ? "#e0b185" : tint[region] || "#e0b185",
		);
		this.rings.position.copy(this.planet.position);
		this.titleFormation.forEach((m, i) => {
			m.visible = title;
			m.position.y = 7 + i * 2 + Math.sin(this.t * 0.3 + i) * 2;
		});
		const p = s?.player || { x: 0, y: 0 };
		if (title) {
			this.player.position.set(
				10 + Math.sin(this.t * 0.3),
				-2 + Math.sin(this.t * 0.5) * 0.4,
				-15,
			);
			this.player.rotation.set(
				-0.05,
				-0.25,
				Math.sin(this.t * 0.4) * 0.055 - 0.12,
			);
			this.player.scale.setScalar(2.1);
			this.camera.position.lerp(new THREE.Vector3(0, 6, 30), 0.04);
			this.camera.lookAt(0, 0, -50);
		} else {
			this.player.scale.setScalar(1);
			this.player.position.set(p.x, p.y, 0);
			const roll = -(p.vx || 0) * 0.018;
			this.player.rotation.z = THREE.MathUtils.lerp(
				this.player.rotation.z,
				roll,
				dt * 7,
			);
			this.player.rotation.x = THREE.MathUtils.lerp(
				this.player.rotation.x,
				(p.vy || 0) * 0.008,
				dt * 7,
			);
			this.player.rotation.y = THREE.MathUtils.lerp(
				this.player.rotation.y,
				-(p.vx || 0) * 0.006,
				dt * 7,
			);
			this.camera.position.lerp(
				new THREE.Vector3(p.x * 0.28, p.y * 0.22 + 7, 26),
				Math.min(1, dt * 3),
			);
			this.camera.lookAt(p.x * 0.15, p.y * 0.12 + 1, -60);
		}
		this.player.visible = title || flight;
		this.wing.visible = !!(s?.wingman?.active && flight);
		if (this.wing.visible) {
			this.wing.position.set(s.wingman.x, s.wingman.y, s.wingman.z || -2);
			this.wing.rotation.z = -(s.wingman.vx || 0) * 0.015;
		}
		for (const item of this.mixers) item.mixer.update(dt * (boost ? 1.7 : 1));
		const visibleIds = new Set();
		if (flight) {
			for (const e of [
				...(s.entities || []),
				...(s.bullets || []).map((b) => ({ ...b, type: "bullet" })),
			]) {
				visibleIds.add(e.id);
				let mesh = this.objects.get(e.id);
				if (
					mesh &&
					(mesh.userData.solarType !== e.type ||
						mesh.userData.solarKind !== e.kind)
				) {
					this.removeObject(e.id, mesh);
					mesh = null;
				}
				if (!mesh) {
					if (e.type === "bullet") {
						const friendly = e.owner !== "enemy";
						mesh = new THREE.Group();
						const core = new THREE.Mesh(
							new THREE.CylinderGeometry(
								friendly ? 0.09 : 0.18,
								friendly ? 0.09 : 0.18,
								friendly ? 2.4 : 1,
								5,
							),
							new THREE.MeshBasicMaterial({
								color: friendly ? "#caffdf" : "#ff717a",
							}),
						);
						core.rotation.x = Math.PI / 2;
						mesh.add(core);
						const glow = new THREE.Mesh(
							new THREE.CylinderGeometry(
								friendly ? 0.24 : 0.32,
								friendly ? 0.24 : 0.32,
								friendly ? 2 : 1.2,
								5,
							),
							new THREE.MeshBasicMaterial({
								color: friendly ? "#8fe8d0" : "#ff506d",
								transparent: true,
								opacity: 0.3,
							}),
						);
						glow.rotation.x = Math.PI / 2;
						mesh.add(glow);
						this.scene.add(mesh);
					} else mesh = this.entity(e);
					mesh.userData.solarType = e.type;
					mesh.userData.solarKind = e.kind;
					this.objects.set(e.id, mesh);
				}
				mesh.visible = true;
				mesh.position.set(e.x, e.y, e.z);
				if (e.type === "enemy") {
					mesh.rotation.z = Math.sin(this.t * 1.7 + Number(e.id)) * 0.2;
					mesh.rotation.x = Math.sin(this.t + e.x) * 0.08;
				} else if (e.type === "asteroid") {
					mesh.rotation.x += dt * 0.2;
					mesh.rotation.z += dt * 0.12;
				} else if (e.type === "boss") {
					mesh.rotation.z = Math.sin(this.t * 0.5) * 0.07;
					mesh.rotation.y = Math.sin(this.t * 0.4) * 0.1;
				} else if (e.type === "pod")
					mesh.rotation.y = Math.sin(this.t * 0.6) * 0.2;
			}
		}
		for (const [id, mesh] of this.objects) {
			if (!visibleIds.has(id)) {
				this.scene.remove(mesh);
				this.objects.delete(id);
				const mix = this.mixers.find((x) => x.root === mesh);
				if (mix) {
					mix.mixer.stopAllAction();
					this.mixers.splice(this.mixers.indexOf(mix), 1);
				}
				mesh.traverse((o) => {
					if (o.isMesh) {
						o.geometry?.dispose();
						if (o.material !== this.gradient) {
							if (Array.isArray(o.material))
								o.material.forEach((m) => m.dispose());
							else o.material?.dispose();
						}
					}
				});
			}
		}
		for (let i = this.fx.length - 1; i >= 0; i--) {
			const f = this.fx[i];
			f.life -= dt;
			f.mesh.position.addScaledVector(f.v, dt);
			f.mesh.material.opacity = Math.max(0, f.life / f.max);
			if (f.ring) f.mesh.scale.multiplyScalar(1 + dt * 9);
			else {
				f.mesh.rotation.x += dt * 2;
				f.mesh.rotation.z += dt * 3;
			}
			if (f.life <= 0) {
				this.scene.remove(f.mesh);
				f.mesh.geometry.dispose();
				f.mesh.material.dispose();
				this.fx.splice(i, 1);
			}
		}
		this.shield.position.copy(this.player.position);
		this.shield.material.opacity = Math.max(
			0,
			this.shield.material.opacity - dt * 0.5,
		);
		this.shield.rotation.y += dt;
		this.pulseLife = Math.max(0, this.pulseLife - dt);
		this.pulseRing.material.opacity = this.pulseLife * 0.7;
		this.pulseRing.scale.setScalar((1 - this.pulseLife) * 60 + 1);
		this.shake = Math.max(0, this.shake - dt);
		if (this.shake > 0) {
			this.camera.position.x += (Math.random() - 0.5) * this.shake;
			this.camera.position.y += (Math.random() - 0.5) * this.shake;
		}
		this.flash = Math.max(0, this.flash - dt * 2);
		document.getElementById("flash").style.opacity = this.flash;
		const warp = s?.state === "warp";
		this.warpLines.material.opacity = warp ? 0.85 : boost ? 0.3 : 0;
		if (warp || boost) {
			const pos = this.warpGeo.attributes.position;
			for (let i = 0; i < pos.count; i += 2) {
				let z = pos.getZ(i) + dt * (warp ? 170 : 80);
				if (z > 25) z = -330;
				pos.setZ(i, z);
				pos.setZ(i + 1, z - (warp ? 30 : 8));
			}
			pos.needsUpdate = true;
		}
		this.renderer.render(this.scene, this.camera);
	}
}
