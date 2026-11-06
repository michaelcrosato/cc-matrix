import * as T from "three/webgpu";

const INK = 0x101827;
export class Art {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new T.Scene();
		this.scene.background = new T.Color(0x101b2c);
		this.scene.fog = new T.FogExp2(0x101b2c, 0.008);
		this.camera = new T.OrthographicCamera(-18, 18, 10, -10, 0.1, 150);
		this.camera.position.set(15, 0, 45);
		this.camera.lookAt(15, 0, 0);
		this.renderer = new T.WebGPURenderer({
			canvas,
			antialias: true,
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		this.configureRenderer();
		this.renderer.onDeviceLost = (info) => this.recoverRenderer(info);
		this.scene.add(new T.HemisphereLight(0xc8dcff, 0x564353, 2.0));
		this.key = new T.DirectionalLight(0xffe5b5, 3.2);
		this.key.position.set(-10, 20, 25);
		this.scene.add(this.key);
		this.rim = new T.DirectionalLight(0x51c9d2, 2.2);
		this.rim.position.set(20, 0, -10);
		this.scene.add(this.rim);
		this.root = new T.Group();
		this.scene.add(this.root);
		this.fx = new T.Group();
		this.scene.add(this.fx);
		const rgba = new Uint8Array([
			55, 55, 55, 255, 145, 145, 145, 255, 255, 255, 255, 255,
		]);
		this.gradient = new T.DataTexture(rgba, 3, 1, T.RGBAFormat);
		this.gradient.minFilter = T.NearestFilter;
		this.gradient.magFilter = T.NearestFilter;
		this.gradient.needsUpdate = true;
		this.materials = new Map();
		this.ink = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
		this.particles = [];
		this.labels = [];
		this.mixers = [];
		this.dust = [];
		this.clock = 0;
		this.camX = 15;
		this.camY = 0;
		this.resize();
	}
	async init() {
		try {
			if (navigator.gpu && !new URLSearchParams(location.search).has("webgl")) {
				// Retain the adapter and GPU root for the lifetime of the renderer.
				this.gpuRoot = navigator.gpu;
				this.gpuAdapter = await this.gpuRoot.requestAdapter({
					powerPreference: "high-performance",
				});
				if (this.gpuAdapter) {
					this.gpuDevice = await this.gpuAdapter.requestDevice();
					this.renderer.backend.parameters.device = this.gpuDevice;
				}
			}
		} catch {}
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2";
	}
	configureRenderer() {
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
		this.renderer.outputColorSpace = T.SRGBColorSpace;
		this.renderer.toneMapping = T.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.18;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = T.PCFShadowMap;
	}
	async recoverRenderer(info) {
		if (this.recovering || this.backend === "WebGL2") return;
		this.recovering = true;
		this.lastDeviceLoss = info.message;
		this.recoveries = (this.recoveries || 0) + 1;
		const old = this.renderer;
		old._isDeviceLost = true;
		old.onDeviceLost = () => {};
		// Canvas context types are permanent: replace the canvas before switching APIs.
		const fresh = this.canvas.cloneNode();
		this.canvas.replaceWith(fresh);
		this.canvas = fresh;
		this.renderer = new T.WebGPURenderer({
			canvas: fresh,
			antialias: true,
			forceWebGL: true,
		});
		this.configureRenderer();
		try {
			await this.renderer.init();
			this.backend = "WebGL2";
			this.resize();
			old.dispose();
		} catch (error) {
			this.fatalError = error.message;
			this.onFailure?.(error);
		} finally {
			this.recovering = false;
		}
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h, false);
		this.aspect = w / h;
		this.halfH = this.aspect < 1.15 ? 13.8 : 10.1;
		this.camera.left = -this.halfH * this.aspect;
		this.camera.right = this.halfH * this.aspect;
		this.camera.top = this.halfH;
		this.camera.bottom = -this.halfH;
		this.camera.updateProjectionMatrix();
	}
	mat(color, basic = false) {
		const key = color + ":" + basic;
		if (!this.materials.has(key))
			this.materials.set(
				key,
				basic
					? new T.MeshBasicMaterial({ color })
					: new T.MeshToonMaterial({ color, gradientMap: this.gradient }),
			);
		return this.materials.get(key);
	}
	mesh(geo, color, parent = this.root, outline = true) {
		const m = new T.Mesh(geo, this.mat(color));
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		if (outline) {
			const edge = new T.Mesh(geo, this.ink);
			edge.scale.setScalar(1.055);
			m.add(edge);
		}
		return m;
	}
	box(x, y, z, w, h, d, color, parent = this.root, outline = true) {
		const m = this.mesh(new T.BoxGeometry(w, h, d), color, parent, outline);
		m.position.set(x, y, z);
		return m;
	}
	sphere(x, y, z, r, color, parent = this.root, detail = 1) {
		const m = this.mesh(new T.IcosahedronGeometry(r, detail), color, parent);
		m.position.set(x, y, z);
		return m;
	}
	cylinder(x, y, z, r, h, color, parent = this.root) {
		const m = this.mesh(new T.CylinderGeometry(r, r, h, 8), color, parent);
		m.position.set(x, y, z);
		return m;
	}
	line(points, color = INK, parent = this.root) {
		const g = new T.BufferGeometry().setFromPoints(
			points.map((p) => new T.Vector3(...p)),
		);
		const l = new T.Line(g, new T.LineBasicMaterial({ color }));
		parent.add(l);
		return l;
	}
	text(
		text,
		x,
		y,
		z,
		size = 1,
		color = "#fbe4a5",
		parent = this.root,
		width = 8,
	) {
		const c = document.createElement("canvas");
		c.width = 768;
		c.height = 192;
		const ctx = c.getContext("2d");
		ctx.font = "900 96px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = color;
		ctx.fillText(text, 384, 96, 740);
		const tex = new T.CanvasTexture(c);
		tex.colorSpace = T.SRGBColorSpace;
		const m = new T.Mesh(
			new T.PlaneGeometry(width, size),
			new T.MeshBasicMaterial({
				map: tex,
				transparent: true,
				depthWrite: false,
			}),
		);
		m.position.set(x, y, z);
		parent.add(m);
		return m;
	}
	clear() {
		const geos = new Set(),
			mats = new Set(),
			textures = new Set();
		for (const root of [this.root, this.fx])
			root.traverse((o) => {
				if (o.geometry) geos.add(o.geometry);
				const ma = Array.isArray(o.material) ? o.material : [o.material];
				for (const m of ma) {
					if (
						m &&
						!this.materials.has(m.color?.getHex() + ":false") &&
						m !== this.ink
					) {
						if (m.map) textures.add(m.map);
						if (m.transparent) mats.add(m);
					}
				}
			});
		for (const g of geos) g.dispose();
		for (const t of textures) t.dispose();
		for (const m of mats) m.dispose();
		this.root.clear();
		this.fx.clear();
		this.particles = [];
		this.labels = [];
		this.mixers = [];
		this.dust = [];
	}
	terrain(x, y, w, h, palette = 0) {
		const colors = [0x3d4a58, 0x3d435c, 0x53455a, 0x4a3f4d],
			c = colors[palette];
		const g = new T.Group();
		this.root.add(g);
		this.box(x, y, -0.7, w, h, 3.1, c, g);
		this.box(x, y + h / 2 - 0.09, 1.03, w, 0.18, 0.2, 0xb4a58b, g);
		const count = Math.ceil(w / 2.4);
		for (let j = 0; j < count; j++) {
			let xx = x - w / 2 + ((j + 0.5) * w) / count;
			const r = this.sphere(xx, y + h / 2 - 0.35, 0.9, 0.7, c, g, 0);
			r.scale.set(1.8, 0.7, 0.6);
			r.rotation.z = Math.sin(j * 7) * 0.4;
			if (h > 1.1)
				this.line(
					[
						[xx - 1, y - 0.25, 1],
						[xx, y - 0.4, 1.06],
						[xx + 0.6, y - 0.25, 1.02],
					],
					0x1c2836,
					g,
				);
		}
		return g;
	}
	build(level, index) {
		this.clear();
		this.level = level;
		const w = level.width,
			b = level.bottom;
		this.box(w / 2, (b + 10) / 2, -12, w + 50, 60, 1, 0x15283b);
		for (let i = 0; i < 35; i++) {
			const x = ((i * 7.73) % (w + 20)) - 10,
				y = 9 - ((i * 3.93) % 42),
				z = -8 - (i % 3);
			const r = this.sphere(
				x,
				y,
				z,
				2 + (i % 4) * 0.6,
				[0x1b3445, 0x203a4a, 0x263947][i % 3],
				this.root,
				0,
			);
			r.scale.set(1.6, 2.4, 0.55);
			r.rotation.z = i * 1.9;
		}
		for (let y = 7; y > b - 7; y -= 8) {
			this.line(
				[
					[-8, y, -7],
					[w + 8, y - 1, -7],
				],
				0x2c4350,
			);
		}
		for (let x = 2; x < w; x += 13) {
			this.box(x, 1, -4.3, 0.38, 26, 0.5, 0x35444b);
			this.box(x + 7, 1, -4.3, 0.38, 26, 0.5, 0x35444b);
			for (let y = 7; y > b; y -= 9) {
				this.box(x + 3.5, y, -4, 8.4, 0.4, 0.65, 0x566064);
				this.line(
					[
						[x, y - 0.5, -3.7],
						[x + 7, y - 4, -3.7],
					],
					0x273b47,
				);
			}
		}
		for (let x = 0; x < w + 1; x += 3.5) {
			const t = this.mesh(new T.ConeGeometry(1.25, 2.6 + (x % 3), 5), 0x344353);
			t.position.set(x, 10, -0.5);
			t.rotation.z = Math.PI;
			const t2 = this.mesh(new T.ConeGeometry(0.6, 1.6, 5), 0x44545e);
			t2.position.set(x + 1, 9.5, 1);
			t2.rotation.z = Math.PI;
		}
		this.terrain(w / 2, b - 1, w + 3, 2, index);
		this.terrain(-1, (b + 10) / 2, 2, 10 - b, index);
		this.terrain(w + 1, (b + 10) / 2, 2, 10 - b, index);
		this.box(w / 2, 11, -0.5, w + 4, 2, 3, 0x344353);
		for (const p of level.platforms) this.terrain(...p, index);
		// Industrial remnants, wire loops and blue cave growth make each shaft a small diorama.
		for (let i = 0; i < 18; i++) {
			const x = 3 + ((i * 11.67) % (w - 6)),
				y = 6 - ((i * 5.7) % (8 - b));
			const v = new T.Vector3(x, y, -3.1),
				pts = [];
			for (let k = 0; k < 7; k++)
				pts.push([
					v.x + k * 0.55,
					v.y - Math.sin((k / 6) * Math.PI) * 0.6,
					v.z,
				]);
			this.line(pts, 0x59757c);
			if (i % 3 === 0) {
				this.box(x, y, -3, 0.5, 1.2, 0.5, 0x49616b);
				this.box(x, y + 0.35, -2.68, 0.25, 0.1, 0.1, 0x62d9ca);
			}
		}
		for (let i = 0; i < 46; i++) {
			const x = (i * 9.17) % w,
				y = 8 - ((i * 6.29) % (9 - b));
			const d = this.sphere(
				x,
				y,
				-1.8,
				0.025 + (i % 3) * 0.013,
				0x91bfc5,
				this.root,
				0,
			);
			this.dust.push({ m: d, x, y, s: i * 0.6 });
		}
		for (let x = 4; x < w; x += 10) {
			const y = b + 0.1;
			for (let j = 0; j < 3; j++) {
				const gem = this.mesh(
					new T.ConeGeometry(0.12 + j * 0.055, 0.7 + j * 0.16, 4),
					0x5b9eac,
				);
				gem.position.set(x + j * 0.28, y + j * 0.07, 0.9);
				gem.rotation.z = (j - 1) * 0.35;
			}
		}
		this.entry = new T.Group();
		this.root.add(this.entry);
		this.entry.position.set(level.spawn[0] - 1, level.spawn[1] - 0.8, 0);
		this.cylinder(0, 0.05, 0, 1.15, 0.2, 0x4caba8, this.entry);
		this.cylinder(0, 0.16, 0, 0.82, 0.08, 0xa8efca, this.entry);
		this.box(-1.1, 2.1, -1.4, 0.15, 4, 0.2, 0x72999d, this.entry);
		this.box(-0.6, 3.4, -1.4, 1.2, 1, 0.18, 0xe2b45e, this.entry);
		this.text("IN", -0.6, 3.4, -1.24, 0.45, "#172636", this.entry, 1);
		this.box(6, 8.15, -3, 8, 1.7, 0.3, 0x192c3d);
		this.text(
			"MOUNT EMBER  /  0" + (index + 1),
			6,
			8.2,
			-2.8,
			0.67,
			"#a9c1bc",
			this.root,
			7.4,
		);
		this.camX = level.spawn[0] + 8;
		this.camY = level.spawn[1] - 2;
	}
	wall(x, y, w, h) {
		const g = new T.Group();
		this.root.add(g);
		this.box(x, y, 0, w, h, 2.7, 0x9a785f, g);
		for (let yy = y - h / 2 + 0.6; yy < y + h / 2; yy += 1.2) {
			this.line(
				[
					[x - w / 2, yy, 1.4],
					[x + w / 2, yy + 0.2, 1.4],
				],
				0x342d31,
				g,
			);
			this.box(x, yy, 1.5, w + 0.15, 0.12, 0.1, 0xe1bd78, g);
		}
		this.text("✕", x, y, 1.6, 1.1, "#fff0b5", g, 1);
		return g;
	}
	lava(x, y, w, h, hot = false) {
		const g = new T.Group();
		this.root.add(g);
		const m = this.box(x, y, -0.1, w, h, 2.9, 0xf06443, g);
		m.material = this.mat(0xff713e, true);
		for (let j = 0; j < w; j += 0.7) {
			const b = this.box(
				x - w / 2 + j + 0.3,
				y + h / 2,
				1.42,
				0.45,
				0.08,
				0.05,
				j % 2 ? 0xffc45e : 0xff8d49,
				g,
			);
			b.rotation.z = Math.sin(j * 4) * 0.3;
		}
		if (!hot) {
			const light = new T.PointLight(0xff6235, 55, 13, 2);
			light.position.set(x, y + 1, 2);
			g.add(light);
		}
		return g;
	}
	hero(color = 0xefb84e, id = 0) {
		const g = new T.Group();
		this.root.add(g);
		const suit = new T.Group();
		suit.name = "suit";
		g.add(suit);
		this.box(0, -0.05, 0, 0.7, 0.88, 0.55, 0x2f7a83, suit);
		this.box(0, 0.07, 0.3, 0.63, 0.12, 0.12, color, suit);
		this.box(-0.38, 0.0, -0.18, 0.28, 0.8, 0.53, 0x77989c, suit);
		this.box(0.38, 0.0, -0.18, 0.28, 0.8, 0.53, 0x77989c, suit);
		this.sphere(0, 0.76, 0, 0.52, color, suit, 1);
		this.box(0, 0.69, 0.4, 0.67, 0.29, 0.19, 0x18394a, suit);
		this.box(-0.12, 0.77, 0.52, 0.2, 0.045, 0.02, 0xb2f5ea, suit);
		this.box(0.4, 0.86, 0.23, 0.22, 0.2, 0.23, 0xe9f2d5, suit);
		this.sphere(-0.48, 0.83, 0.1, 0.16, 0x263f4a, suit, 0);
		const armL = new T.Group();
		armL.position.set(-0.47, 0.12, 0);
		armL.name = "armL";
		suit.add(armL);
		this.box(0, -0.25, 0, 0.25, 0.6, 0.28, 0x4596a0, armL);
		this.sphere(0, -0.53, 0.03, 0.17, 0xe1bd8a, armL, 0);
		const armR = armL.clone();
		armR.position.x = 0.47;
		armR.name = "armR";
		suit.add(armR);
		for (const [i, x] of [-0.22, 0.22].entries()) {
			const leg = new T.Group();
			leg.name = "leg" + i;
			leg.position.set(x, -0.46, 0);
			suit.add(leg);
			this.box(0, -0.22, 0, 0.27, 0.5, 0.35, 0x286470, leg);
			this.box(0.06, -0.53, 0.07, 0.38, 0.2, 0.5, 0x263642, leg);
		}
		this.box(0, 0.28, -0.45, 0.6, 1, 0.42, 0x97aba0, suit);
		this.box(0, 0.65, -0.45, 0.75, 0.14, 0.6, color, suit);
		this.cylinder(0, 1.33, -0.35, 0.08, 0.65, 0xabc2b3, suit);
		const rotor = new T.Group();
		rotor.name = "rotor";
		rotor.position.set(0, 1.67, -0.35);
		suit.add(rotor);
		this.box(0, 0, 0, 2.6, 0.065, 0.19, 0xd0d9b8, rotor);
		this.box(0, 0.02, 0, 0.19, 0.065, 2.6, 0xd0d9b8, rotor);
		this.cylinder(0, 0.04, 0, 0.17, 0.12, 0x496e70, rotor);
		const headlight = new T.PointLight(0xffe0a0, 7, 8, 2);
		headlight.position.set(0.3, 0.6, 2);
		g.add(headlight);
		const ring = this.mesh(new T.RingGeometry(0.63, 0.72, 32), color, g, false);
		ring.position.set(0, -0.89, 0.8);
		ring.rotation.x = -Math.PI / 2;
		const mixer = new T.AnimationMixer(g);
		const spin = new T.AnimationClip("prop-pack", 0.6, [
			new T.NumberKeyframeTrack(
				"rotor.rotation[y]",
				[0, 0.6],
				[0, Math.PI * 2],
			),
		]);
		const walk = new T.AnimationClip("flight-stride", 0.72, [
			new T.NumberKeyframeTrack(
				"leg0.rotation[z]",
				[0, 0.18, 0.36, 0.54, 0.72],
				[0, 0.35, 0, -0.35, 0],
			),
			new T.NumberKeyframeTrack(
				"leg1.rotation[z]",
				[0, 0.18, 0.36, 0.54, 0.72],
				[0, -0.35, 0, 0.35, 0],
			),
			new T.NumberKeyframeTrack(
				"armL.rotation[z]",
				[0, 0.36, 0.72],
				[-0.1, 0.22, -0.1],
			),
		]);
		const idle = new T.AnimationClip("idle-breathe", 2, [
			new T.NumberKeyframeTrack("suit.scale[y]", [0, 1, 2], [1, 1.025, 1]),
		]);
		const spinAction = mixer.clipAction(spin).play(),
			walkAction = mixer.clipAction(walk).play();
		mixer.clipAction(idle).play();
		this.mixers.push(mixer);
		if (id > 0) this.text("" + (id + 1), 0, 2.2, 1, 0.42, "#f8e7ba", g, 0.5);
		return { g, suit, mixer, spinAction, walkAction, headlight };
	}
	miner(x, y, name) {
		const g = new T.Group();
		this.root.add(g);
		g.position.set(x, y, 0);
		this.box(0, -0.1, 0, 0.65, 0.75, 0.55, 0xb06f50, g);
		this.sphere(0, 0.58, 0, 0.4, 0xf2ba6c, g, 1);
		this.box(0, 0.6, 0.35, 0.5, 0.18, 0.15, 0x63493c, g);
		this.box(0, 0.9, 0, 0.84, 0.13, 0.65, 0xe7bc58, g);
		this.sphere(0.12, 0.9, 0.4, 0.12, 0xfaf3bb, g, 0);
		this.box(-0.25, -0.65, 0, 0.32, 0.35, 0.4, 0x38444f, g);
		this.box(0.25, -0.65, 0, 0.32, 0.35, 0.4, 0x38444f, g);
		const arm = new T.Group();
		arm.name = "wave";
		arm.position.set(0.45, 0.1, 0);
		g.add(arm);
		this.box(0.12, 0.24, 0, 0.24, 0.65, 0.27, 0xd5a66a, arm);
		const mix = new T.AnimationMixer(g);
		const clip = new T.AnimationClip("help-wave", 1.3, [
			new T.NumberKeyframeTrack(
				"wave.rotation[z]",
				[0, 0.32, 0.65, 0.97, 1.3],
				[-0.4, 0.5, -0.4, 0.5, -0.4],
			),
		]);
		mix.clipAction(clip).play();
		this.mixers.push(mix);
		const help = this.text("HELP!", 0, 1.9, 1, 0.55, "#aef0d3", g, 2.4);
		this.text(name.toUpperCase(), 0, -1.12, 1, 0.35, "#becbd0", g, 2.2);
		const ring = this.mesh(
			new T.RingGeometry(0.72, 0.82, 36),
			0x8fe2b8,
			g,
			false,
		);
		ring.position.set(0, -0.88, 0);
		ring.rotation.x = -Math.PI / 2;
		return { g, mix, arm, ring, help };
	}
	enemy(kind, x, y) {
		const g = new T.Group();
		this.root.add(g);
		g.position.set(x, y, 0);
		const body = this.sphere(
			0,
			0,
			0,
			kind === "snake" ? 0.3 : 0.4,
			kind === "moth" ? 0xb681a7 : kind === "snake" ? 0xc6a854 : 0x6d6b9b,
			g,
			0,
		);
		const wings = [];
		if (kind === "bat" || kind === "moth") {
			for (const side of [-1, 1]) {
				const wing = new T.Group();
				wing.name = "wing" + (side > 0 ? "R" : "L");
				g.add(wing);
				let shape = new T.Shape();
				shape.moveTo(0, 0);
				shape.lineTo(side * 0.9, 0.5);
				shape.lineTo(side * 1.2, -0.2);
				shape.lineTo(side * 0.6, -0.05);
				shape.lineTo(side * 0.25, -0.35);
				shape.closePath();
				const m = this.mesh(
					new T.ShapeGeometry(shape),
					kind === "moth" ? 0xd4a7b7 : 0x8c83b6,
					wing,
				);
				m.material.side = T.DoubleSide;
				wings.push(wing);
			}
			const mix = new T.AnimationMixer(g);
			const clip = new T.AnimationClip("wings", 0.36, [
				new T.NumberKeyframeTrack(
					"wingL.rotation[y]",
					[0, 0.18, 0.36],
					[-0.6, 0.8, -0.6],
				),
				new T.NumberKeyframeTrack(
					"wingR.rotation[y]",
					[0, 0.18, 0.36],
					[0.6, -0.8, 0.6],
				),
			]);
			mix.clipAction(clip).play();
			this.mixers.push(mix);
		} else if (kind === "spider") {
			for (const side of [-1, 1])
				for (let j = 0; j < 3; j++)
					this.line(
						[
							[side * 0.2, 0, 0.2],
							[side * 0.6, 0.18 - j * 0.17, 0.2],
							[side * 0.8, -0.25 - j * 0.09, 0.2],
						],
						0xc7a3b0,
						g,
					);
		} else {
			for (let j = 0; j < 4; j++)
				this.sphere(
					-j * 0.19,
					-0.22 - Math.sin(j) * 0.1,
					0,
					0.25 - j * 0.03,
					0xb19b56,
					g,
					0,
				);
			this.sphere(0.25, 0.15, 0, 0.29, 0xd4b55e, g, 0);
			this.box(0.48, 0.13, 0.2, 0.3, 0.035, 0.04, 0xe47a73, g);
		}
		for (const side of [-1, 1])
			this.sphere(side * 0.13, 0.1, 0.33, 0.065, 0xffdf75, g, 0);
		return { g, body, wings };
	}
	lamp(x, y) {
		const g = new T.Group();
		this.root.add(g);
		g.position.set(x, y, -0.6);
		this.box(0, 0.55, -0.2, 0.12, 1, 0.1, 0x897b62, g);
		this.box(0, 0, 0, 0.46, 0.7, 0.45, 0xe9cf89, g);
		this.box(0, 0.4, 0, 0.7, 0.13, 0.6, 0x5f6870, g);
		this.box(0, -0.4, 0, 0.7, 0.13, 0.6, 0x5f6870, g);
		const bulb = this.sphere(0, 0, 0.25, 0.2, 0xffe3a0, g, 0);
		bulb.material = this.mat(0xffd889, true);
		const light = new T.PointLight(0xffc27b, 30, 11, 2);
		light.position.z = 1.2;
		g.add(light);
		return { g, bulb, light };
	}
	pickup(x, y, type) {
		const g = new T.Group();
		this.root.add(g);
		g.position.set(x, y, 0.5);
		if (type === "gem") {
			const m = this.mesh(new T.OctahedronGeometry(0.4), 0x78d7d6, g);
			m.rotation.z = 0.25;
		} else {
			this.box(
				0,
				0,
				0,
				0.55,
				0.75,
				0.45,
				type === "cell" ? 0xa2d39a : 0xf4e6b7,
				g,
			);
			this.box(0, 0.44, 0, 0.25, 0.15, 0.27, 0x547b76, g);
			this.text(
				type === "cell" ? "ϟ" : "+",
				0,
				0,
				0.26,
				0.5,
				type === "cell" ? "#224452" : "#c46050",
				g,
				0.43,
			);
		}
		return g;
	}
	bomb(x, y) {
		const g = new T.Group();
		this.fx.add(g);
		g.position.set(x, y, 0.5);
		for (let j = 0; j < 3; j++)
			this.box((j - 1) * 0.15, 0, 0, 0.15, 0.6, 0.2, 0xdd6a4d, g);
		this.line(
			[
				[0, 0.3, 0],
				[0.2, 0.5, 0],
				[0.2, 0.65, 0],
			],
			0xf6d67c,
			g,
		);
		return g;
	}
	burst(x, y, color = 0xffbe66, n = 22, scale = 1) {
		for (let i = 0; i < n; i++) {
			const m = this.mesh(
				new T.IcosahedronGeometry((0.05 + Math.random() * 0.1) * scale, 0),
				color,
				this.fx,
				false,
			);
			m.position.set(x, y, 0.5);
			const a = Math.random() * Math.PI * 2,
				s = (2 + Math.random() * 6) * scale;
			this.particles.push({
				m,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s,
				life: 0.3 + Math.random() * 0.65,
				max: 1,
				gravity: 6,
			});
		}
	}
	beam(x, y, dx, dy, len, color) {
		const m = this.box(
			x + (dx * len) / 2,
			y + (dy * len) / 2,
			0.65,
			len,
			0.045,
			0.055,
			color,
			this.fx,
			false,
		);
		m.material = this.mat(color, true);
		m.rotation.z = Math.atan2(dy, dx);
		this.particles.push({
			m,
			vx: 0,
			vy: 0,
			life: 0.075,
			max: 0.075,
			gravity: 0,
		});
	}
	popup(text, x, y, color = "#ffdfa0") {
		const m = this.text(text, x, y, 2, 0.65, color, this.fx, 4.8);
		this.particles.push({ m, vx: 0, vy: 1.3, life: 1.5, max: 1.5, gravity: 0 });
	}
	update(dt, time) {
		this.clock += dt;
		for (const m of this.mixers) m.update(dt);
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			if (p.life <= 0) {
				p.m.removeFromParent();
				p.m.geometry?.dispose();
				if (p.m.material?.map) {
					p.m.material.map.dispose();
					p.m.material.dispose();
				}
				this.particles.splice(i, 1);
				continue;
			}
			p.vy -= p.gravity * dt;
			p.m.position.x += p.vx * dt;
			p.m.position.y += p.vy * dt;
			p.m.rotation.z += dt;
			const s = Math.min(1, p.life * 3);
			p.m.scale.setScalar(s);
		}
		for (const d of this.dust) {
			d.m.position.y = d.y + Math.sin(time * 0.4 + d.s) * 0.35;
			d.m.position.x = d.x + Math.sin(time * 0.25 + d.s) * 0.6;
		}
	}
	cameraAt(x, y, dt, overview = false) {
		const k = overview ? 1 : Math.min(1, dt * 4.5);
		this.camX += (x - this.camX) * k;
		this.camY += (y - this.camY) * k;
		this.camera.position.set(this.camX, this.camY, 45);
		this.camera.lookAt(this.camX, this.camY, 0);
	}
	render() {
		if (!this.recovering && !this.fatalError)
			this.renderer.render(this.scene, this.camera);
	}
	project(x, y) {
		const p = new T.Vector3(x, y, 0).project(this.camera);
		return {
			x: (p.x * 0.5 + 0.5) * innerWidth,
			y: (-0.5 * p.y + 0.5) * innerHeight,
		};
	}
	unproject(x, y) {
		const p = new T.Vector3(
			(x / innerWidth) * 2 - 1,
			1 - (y / innerHeight) * 2,
			0,
		).unproject(this.camera);
		return p;
	}
}
