import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as T from "three/webgpu";

export const C = {
	ink: 0x192b39,
	paper: 0xfff2cd,
	blue: 0x196b9a,
	aqua: 0x6bd9cf,
	orange: 0xf07745,
	gold: 0xffcc48,
	red: 0xd95748,
};
const V = new T.Vector3();
export class Stage {
	constructor(container) {
		this.container = container;
		this.bombs = new Map();
		this.players = [];
		this.ghosts = new Map();
		this.fx = [];
		this.mixers = [];
		this.time = 0;
		this.cameraOffset = -4.3;
		this.targetOffset = -4.3;
		this.shake = 0;
		this.hitboxes = false;
		this.debugMeshes = [];
	}
	async createRenderer(forceWebGL = false) {
		const renderer = new T.WebGPURenderer({
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL,
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.setClearColor(0xf6ce68);
		renderer.outputColorSpace = T.SRGBColorSpace;
		renderer.toneMapping = T.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.04;
		renderer.domElement.setAttribute(
			"aria-label",
			"Cel-shaded rooftop bomb-catching game",
		);
		renderer.onDeviceLost = (info) => {
			renderer._isDeviceLost = true;
			this.deviceLoss = info.message || info.reason || "unknown";
			if (!this.disposed) this.useCompatibility().catch(() => {});
		};
		await renderer.init();
		return renderer;
	}
	useCompatibility() {
		if (this.recoveryPromise) return this.recoveryPromise;
		if (this.disposed || this.backend === "WebGL 2 compatibility")
			return Promise.resolve();
		this.recovering = true;
		this.recoveryPromise = this.rebuildRenderer().finally(() => {
			this.recovering = false;
			this.recoveryPromise = null;
		});
		return this.recoveryPromise;
	}
	async rebuildRenderer() {
		const old = this.renderer;
		if (old) old.setAnimationLoop(null);
		const replacement = await this.withDeadline(
			this.createRenderer(true),
			8000,
		);
		this.renderer = replacement;
		this.backend = "WebGL 2 compatibility";
		this.container.replaceChildren(replacement.domElement);
		this.buildScene();
		await this.withDeadline(
			replacement.compileAsync(this.scene, this.camera),
			8000,
		);
		if (this.loop) replacement.setAnimationLoop(this.loop);
	}
	async withDeadline(promise, ms) {
		let timer;
		try {
			return await Promise.race([
				promise,
				new Promise((_, reject) => {
					timer = setTimeout(
						() => reject(new Error("Graphics device did not respond")),
						ms,
					);
				}),
			]);
		} finally {
			clearTimeout(timer);
		}
	}
	setLoop(callback) {
		this.loop = callback;
		this.renderer.setAnimationLoop(callback);
	}
	dispose() {
		this.disposed = true;
		this.loop = null;
		try {
			this.renderer.setAnimationLoop(null);
			this.renderer.dispose();
		} catch {}
	}
	async init() {
		const force =
			new URLSearchParams(location.search).get("renderer") === "webgl";
		try {
			this.renderer = await this.withDeadline(this.createRenderer(force), 6000);
		} catch (error) {
			if (force) throw error;
			this.renderer = await this.withDeadline(this.createRenderer(true), 8000);
		}
		this.container.appendChild(this.renderer.domElement);
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 compatibility";
		this.initialBackend = this.backend;
		this.buildScene();
		addEventListener("resize", () => this.resize());
	}
	buildScene() {
		this.bombs = new Map();
		this.ghosts = new Map();
		this.fx = [];
		this.mixers = [];
		this.players = [];
		this.scene = new T.Scene();
		this.scene.fog = new T.Fog(0xf4d78d, 46, 80);
		this.camera = new T.OrthographicCamera(-14, 14, 8.5, -8.5, 0.1, 120);
		this.camera.position.set(this.cameraOffset, 13.6, 36);
		this.camera.lookAt(this.cameraOffset, 6.1, 0);
		this.camera.updateMatrixWorld();
		this.resize();
		this.scene.add(new T.HemisphereLight(0xfff9df, 0x709ca8, 1.65));
		const key = new T.DirectionalLight(0xfff1c2, 2.3);
		key.position.set(-8, 18, 16);
		this.scene.add(key);
		const rim = new T.DirectionalLight(0x87e5e2, 0.8);
		rim.position.set(10, 6, -5);
		this.scene.add(rim);
		this.gradient = new T.DataTexture(
			new Uint8Array([85, 85, 85, 255, 174, 174, 174, 255, 255, 255, 255, 255]),
			3,
			1,
			T.RGBAFormat,
		);
		this.gradient.minFilter = this.gradient.magFilter = T.NearestFilter;
		this.gradient.needsUpdate = true;
		this.mats = new Map();
		this.ink = new T.MeshBasicNodeMaterial({ color: C.ink, side: T.BackSide });
		this.makeWorld();
		this.makeBomber();
		this.makeParticles();
		this.setPlayers(1);
		this.resize();
	}
	mat(color, extra = {}) {
		const key = color + JSON.stringify(extra);
		if (!this.mats.has(key))
			this.mats.set(
				key,
				new T.MeshToonNodeMaterial({
					color,
					gradientMap: this.gradient,
					...extra,
				}),
			);
		return this.mats.get(key);
	}
	mesh(
		geo,
		color,
		parent = this.scene,
		pos = [0, 0, 0],
		scale = null,
		outline = true,
	) {
		const g = new T.Group(),
			m = new T.Mesh(geo, this.mat(color));
		g.add(m);
		if (outline) {
			const o = new T.Mesh(geo, this.ink);
			o.scale.setScalar(1.045);
			g.add(o);
		}
		g.position.set(...pos);
		if (scale) g.scale.set(...scale);
		parent.add(g);
		return g;
	}
	box(w, h, d, c, p, pos, outline = true) {
		return this.mesh(new T.BoxGeometry(w, h, d), c, p, pos, null, outline);
	}
	ball(r, c, p, pos, scale = null, outline = true) {
		return this.mesh(
			new T.SphereGeometry(r, 16, 12),
			c,
			p,
			pos,
			scale,
			outline,
		);
	}
	cyl(r1, r2, h, c, p, pos, outline = true) {
		return this.mesh(
			new T.CylinderGeometry(r1, r2, h, 16),
			c,
			p,
			pos,
			null,
			outline,
		);
	}
	text(text, color = "#192b39", size = 1) {
		const canvas = document.createElement("canvas");
		canvas.width = 768;
		canvas.height = 192;
		const c = canvas.getContext("2d");
		c.font = "900 100px Display, sans-serif";
		c.textAlign = "center";
		c.textBaseline = "middle";
		c.lineJoin = "round";
		c.lineWidth = 14;
		c.strokeStyle = "#192b39";
		if (color !== "#192b39") c.strokeText(text, 384, 102);
		c.fillStyle = color;
		c.fillText(text, 384, 102);
		const map = new T.CanvasTexture(canvas);
		map.colorSpace = T.SRGBColorSpace;
		const m = new T.SpriteMaterial({ map, depthWrite: false });
		const s = new T.Sprite(m);
		s.scale.set(size * 4, size, 1);
		return s;
	}
	makeWorld() {
		const world = new T.Group();
		this.scene.add(world);
		// Printed sun, rings, clouds and distant rooftops.
		const _sun = this.mesh(
			new T.CircleGeometry(3, 64),
			0xffe3a0,
			world,
			[7.7, 10.2, -15],
			null,
			false,
		);
		const sr = new T.Mesh(
			new T.RingGeometry(3.12, 3.15, 64),
			new T.MeshBasicNodeMaterial({ color: 0xc99d56 }),
		);
		sr.position.set(7.7, 10.2, -14.9);
		world.add(sr);
		let seed = 291;
		const rand = () => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			return seed / 4294967296;
		};
		for (let layer = 0; layer < 2; layer++)
			for (let i = 0; i < 16; i++) {
				const x = -26 + i * 3.5 + rand(),
					h = 1.5 + rand() * 5,
					w = 2 + rand() * 1.9,
					z = -16 + layer * 5;
				const c = layer ? 0xc3b788 : 0xdfc48b;
				this.box(w, h, 1.5, c, world, [x, h / 2 + 1, z]);
				this.box(w + 0.3, 0.18, 1.7, layer ? 0x9ba6a0 : 0xcab078, world, [
					x,
					h + 1,
					z,
				]);
				if (i % 3 === 0) {
					this.box(0.32, 1.3, 0.4, c, world, [x + 0.5, h + 1.4, z]);
					this.box(0.6, 0.16, 0.7, 0x94a09a, world, [x + 0.5, h + 2.05, z]);
				}
				if (layer)
					for (let j = 0; j < Math.floor(h / 1.4); j++)
						for (let k = 0; k < 2; k++)
							this.box(
								0.28,
								0.55,
								0.06,
								0x879b9b,
								world,
								[x - 0.45 + k * 0.9, 1.8 + j * 1.3, z + 0.79],
								false,
							);
				const roof = this.mesh(
					new T.ConeGeometry(w * 0.68, 1, 4),
					layer ? 0x9ba6a0 : 0xcab078,
					world,
					[x, h + 1.5, z],
					null,
					true,
				);
				roof.rotation.y = Math.PI / 4;
				roof.scale.z = 0.55;
			}
		for (const [x, y, s] of [
			[-9, 12.5, 1],
			[1, 14, 1.2],
			[-2, 8.5, 0.7],
			[15, 10, 1.2],
		]) {
			const cloud = new T.Group();
			cloud.position.set(x, y, -13);
			cloud.scale.setScalar(s);
			world.add(cloud);
			this.box(2.5, 0.45, 0.15, 0xffe9bd, cloud, [0, 0, 0], false);
			for (let i = 0; i < 4; i++)
				this.ball(
					0.55 + Math.sin(i) * 0.15,
					0xffe9bd,
					cloud,
					[-1 + i * 0.7, 0.15, 0],
					[1, 1, 0.15],
					false,
				);
			this.mixers.push({ kind: "cloud", object: cloud, base: x });
		}
		// Foreground rooftop and inked masonry.
		this.box(24.6, 0.5, 4.5, 0x3c6172, world, [0, -0.04, 0]);
		this.box(25, 0.18, 4.8, C.ink, world, [0, 0.28, 0]);
		this.box(25, 0.12, 4.85, 0x93b9b5, world, [0, 0.4, 0]);
		this.box(26, 2, 5, 0x254b60, world, [0, -1.4, 0]);
		for (let i = -12; i < 13; i += 1.8) {
			this.box(1.7, 0.05, 0.03, 0x497383, world, [i, -0.75, 2.54], false);
			this.box(0.045, 0.5, 0.03, 0x497383, world, [i + 0.7, -0.5, 2.54], false);
		}
		// Tall cable pylons bookend the catching lane.
		for (const side of [-1, 1]) {
			const x = side * 10.4;
			this.box(0.52, 10.8, 0.6, 0x3b6c7c, world, [x, 5.8, -1.2]);
			this.box(
				0.13,
				10.8,
				0.08,
				0x81aca9,
				world,
				[x - 0.12, 5.8, -0.85],
				false,
			);
			this.box(0.9, 0.3, 0.9, C.ink, world, [x, 0.8, -1.2]);
			this.box(0.9, 0.3, 0.9, C.gold, world, [x, 11.35, -1.2]);
			for (let j = 0; j < 4; j++) {
				const r = this.box(
					0.47,
					0.26,
					0.03,
					C.gold,
					world,
					[x, 1.5 + j * 0.55, -0.86],
					false,
				);
				r.rotation.z = -0.4;
			}
			this.ball(0.18, C.orange, world, [x, 11.65, -1.2]);
			this.cyl(0.48, 0.6, 0.75, 0x658983, world, [x, 11.95, -1.4]);
		}
		this.box(21.5, 0.38, 1.2, C.ink, world, [0, 10.43, -1.0]);
		this.box(21.5, 0.12, 1.28, 0xe09a50, world, [0, 10.67, -1]);
		for (let i = -9; i < 10; i += 1.2) {
			const g = this.box(
				0.25,
				0.32,
				0.03,
				0x73928d,
				world,
				[i, 10.42, -0.36],
				false,
			);
			g.rotation.z = -0.45;
		}
		const pts = [
			new T.Vector3(-10.4, 12.3, -2),
			new T.Vector3(0, 11.5, -2),
			new T.Vector3(10.4, 12.3, -2),
		];
		this.mesh(
			new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, 0.035, 5, false),
			C.ink,
			world,
			[0, 0, 0],
			null,
			false,
		);
		// Bunting and small delivery placard.
		for (let i = 0; i < 13; i++) {
			const x = -9 + i * 1.5,
				y = 11.6 + 0.6 * (x / 10) ** 2;
			const flag = this.mesh(
				new T.ConeGeometry(0.25, 0.6, 3),
				i % 2 ? C.orange : C.aqua,
				world,
				[x, y - 0.3, -2],
				null,
				false,
			);
			flag.rotation.z = Math.PI;
		}
		const board = new T.Group();
		board.position.set(-7.7, 8.8, -2);
		board.rotation.z = 0.035;
		world.add(board);
		this.box(3.2, 1.25, 0.15, 0xffe6a8, board, [0, 0, 0]);
		const label = this.text("NO BOOM", "#192b39", 0.65);
		label.position.set(0, 0.12, 0.12);
		board.add(label);
		const small = this.text("ON MY SHIFT", "#192b39", 0.32);
		small.position.set(0, -0.35, 0.12);
		board.add(small);
		this.box(0.055, 0.8, 0.05, C.ink, board, [-1, 1, 0], false);
		this.box(0.055, 0.8, 0.05, C.ink, board, [1, 1, 0], false);
		// Rooftop props outside the lane.
		for (const x of [-12.1, 12.1]) {
			this.cyl(0.5, 0.6, 1.3, 0x597f86, world, [x, 1.1, -0.5]);
			this.cyl(0.64, 0.64, 0.1, 0xa9c0b0, world, [x, 1.78, -0.5]);
			const curve = new T.CatmullRomCurve3([
				new T.Vector3(x, 0.7, 0),
				new T.Vector3(x + Math.sign(x) * 0.5, 2, 0),
				new T.Vector3(x, 3, 0),
				new T.Vector3(x - 0.6 * Math.sign(x), 3.1, 0),
			]);
			this.mesh(
				new T.TubeGeometry(curve, 16, 0.12, 6, false),
				0x93bcb3,
				world,
				[0, 0, 0],
			);
		}
		// Fuse-carrying messenger bird on the far roof.
		this.bird = new T.Group();
		this.bird.position.set(7, 7, -7);
		this.scene.add(this.bird);
		this.ball(0.18, C.ink, this.bird, [0, 0, 0], [1.5, 0.8, 1]);
		for (const side of [-1, 1]) {
			const wing = this.mesh(
				new T.ConeGeometry(0.25, 0.7, 3),
				C.ink,
				this.bird,
				[side * 0.32, 0.12, 0],
				null,
				false,
			);
			wing.name = side < 0 ? "WingL" : "WingR";
			wing.rotation.z = side * 0.7;
		}
		const bm = new T.AnimationMixer(this.bird);
		bm.clipAction(
			new T.AnimationClip("Wingbeat", 0.5, [
				new T.NumberKeyframeTrack(
					"WingL.rotation[z]",
					[0, 0.25, 0.5],
					[0.5, 1.6, 0.5],
				),
				new T.NumberKeyframeTrack(
					"WingR.rotation[z]",
					[0, 0.25, 0.5],
					[-0.5, -1.6, -0.5],
				),
			]),
		).play();
		this.mixers.push({ mixer: bm });
		this.world = world;
		// Merge static solids by material so the richly decorated scene stays easy to draw.
		world.updateMatrixWorld(true);
		const batches = new Map();
		world.traverse((o) => {
			if (!o.isMesh) return;
			const k = o.material.uuid;
			const g = o.geometry.clone();
			g.applyMatrix4(o.matrixWorld);
			if (!batches.has(k)) batches.set(k, { mat: o.material, geos: [] });
			batches.get(k).geos.push(g);
		});
		const statics = new T.Group();
		for (const b of batches.values()) {
			const merged = mergeGeometries(b.geos, false);
			if (merged) statics.add(new T.Mesh(merged, b.mat));
			b.geos.forEach((g) => {
				g.dispose();
			});
		}
		// Sprites and clouds remain separate to preserve animation.
		world.traverse((o) => {
			if (o.isSprite) {
				o.getWorldPosition(V);
				const n = o.clone();
				n.position.copy(V);
				o.getWorldScale(n.scale);
				statics.add(n);
			}
		});
		this.scene.remove(world);
		this.scene.add(statics);
		this.staticWorld = statics;
		// A fine printed hatch on the skyline.
		const hatch = new T.Group();
		for (let i = 0; i < 18; i++) {
			const line = this.box(
				0.018,
				1.1,
				0.015,
				0xd3b471,
				hatch,
				[-12 + i * 1.45, 3.1, -9],
				false,
			);
			line.rotation.z = -0.58;
		}
		this.scene.add(hatch);
	}
	makeBomber() {
		this.bomber = new T.Group();
		this.bomber.position.set(0, 10.85, -0.4);
		this.scene.add(this.bomber);
		this.actor = new T.Group();
		this.actor.name = "Actor";
		this.bomber.add(this.actor);
		const body = this.mesh(
			new T.CapsuleGeometry(0.36, 0.45, 6, 12),
			0xe87343,
			this.actor,
			[0, 0.38, 0],
		);
		body.name = "Body";
		for (let i = 0; i < 3; i++)
			this.cyl(0.37, 0.37, 0.08, C.ink, body, [0, -0.2 + i * 0.2, 0.01], false);
		for (const side of [-1, 1]) {
			const leg = new T.Group();
			leg.position.set(side * 0.24, -0.17, 0);
			leg.name = side < 0 ? "LegL" : "LegR";
			this.actor.add(leg);
			this.cyl(0.11, 0.13, 0.4, C.ink, leg, [0, -0.18, 0]);
			this.ball(0.15, C.ink, leg, [side * 0.04, -0.36, 0.1], [1.2, 0.7, 1.7]);
			const arm = new T.Group();
			arm.position.set(side * 0.38, 0.65, 0);
			arm.name = side < 0 ? "ArmL" : "ArmR";
			this.actor.add(arm);
			const sleeve = this.mesh(
				new T.CapsuleGeometry(0.13, 0.36, 4, 10),
				C.orange,
				arm,
				[side * 0.12, -0.15, 0],
			);
			sleeve.rotation.z = side * 0.6;
			this.ball(0.16, 0xf3d7a2, arm, [side * 0.24, -0.4, 0.02]);
		}
		const head = new T.Group();
		head.name = "Head";
		head.position.set(0, 1.13, 0.03);
		this.actor.add(head);
		this.ball(0.55, 0xc6c5ae, head, [0, 0, 0], [1.08, 0.92, 0.85]);
		for (const side of [-1, 1]) {
			const ear = this.mesh(new T.ConeGeometry(0.23, 0.45, 3), C.ink, head, [
				side * 0.39,
				0.43,
				-0.04,
			]);
			ear.rotation.z = -side * 0.25;
			this.mesh(
				new T.ConeGeometry(0.12, 0.26, 3),
				C.orange,
				head,
				[side * 0.39, 0.45, 0.065],
				null,
				false,
			);
			this.ball(0.22, C.ink, head, [side * 0.24, 0.02, 0.42], [1.3, 0.68, 0.4]);
			this.ball(
				0.09,
				C.paper,
				head,
				[side * 0.22, 0.04, 0.505],
				[1, 0.6, 0.35],
				false,
			);
			this.ball(0.035, C.ink, head, [side * 0.18, 0.035, 0.54], null, false);
			const brow = this.box(
				0.28,
				0.045,
				0.07,
				C.ink,
				head,
				[side * 0.23, 0.19, 0.48],
				false,
			);
			brow.rotation.z = -side * 0.2;
		}
		this.ball(0.25, 0xf3dfb8, head, [0, -0.22, 0.38], [1.25, 0.7, 0.65]);
		this.ball(0.085, C.ink, head, [0, -0.1, 0.56], [1.2, 0.7, 0.7]);
		const grin = this.mesh(
			new T.TorusGeometry(0.13, 0.025, 5, 16, Math.PI),
			C.ink,
			head,
			[0, -0.22, 0.54],
			null,
			false,
		);
		grin.rotation.z = Math.PI;
		// Bandit cap and a ridiculously long striped tail.
		const _cap = this.mesh(
			new T.SphereGeometry(0.54, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
			C.ink,
			head,
			[0, 0.25, -0.02],
			[1, 0.5, 1],
		);
		this.box(0.75, 0.055, 0.48, C.ink, head, [0.15, 0.3, 0.3]);
		const tail = new T.Group();
		tail.name = "Tail";
		tail.position.set(0.32, 0.1, -0.25);
		this.actor.add(tail);
		for (let i = 0; i < 6; i++)
			this.ball(
				0.18 - i * 0.012,
				i % 2 ? C.ink : 0xaaa994,
				tail,
				[0.18 + i * 0.19, 0.06 + i * 0.06, -i * 0.04],
				[1.3, 1, 1],
			);
		const mixer = new T.AnimationMixer(this.actor);
		const tracks = [
			new T.NumberKeyframeTrack(
				"Body.position[y]",
				[0, 0.4, 0.8],
				[0.38, 0.42, 0.38],
			),
			new T.NumberKeyframeTrack(
				"Head.rotation[z]",
				[0, 0.4, 0.8],
				[-0.04, 0.04, -0.04],
			),
			new T.NumberKeyframeTrack(
				"ArmL.rotation[z]",
				[0, 0.4, 0.8],
				[-0.3, 0.3, -0.3],
			),
			new T.NumberKeyframeTrack(
				"ArmR.rotation[z]",
				[0, 0.4, 0.8],
				[0.4, -0.3, 0.4],
			),
			new T.NumberKeyframeTrack(
				"LegL.rotation[x]",
				[0, 0.4, 0.8],
				[-0.4, 0.4, -0.4],
			),
			new T.NumberKeyframeTrack(
				"LegR.rotation[x]",
				[0, 0.4, 0.8],
				[0.4, -0.4, 0.4],
			),
			new T.NumberKeyframeTrack(
				"Tail.rotation[y]",
				[0, 0.4, 0.8],
				[-0.3, 0.3, -0.3],
			),
		];
		mixer
			.clipAction(new T.AnimationClip("Rooftop shuffle", 0.8, tracks))
			.play();
		this.mixers.push({ mixer });
		this.bomberMixer = mixer;
		this.held = this.createBomb("normal");
		this.held.scale.setScalar(0.75);
		this.held.position.set(0.63, 0.25, 0.25);
		this.bomber.add(this.held);
	}
	createBucket(color = C.blue, ghost = false) {
		const g = new T.Group();
		const profile = [
			[0.67, 0],
			[0.84, 0.06],
			[1, 0.59],
			[1, 0.68],
			[0.9, 0.68],
			[0.74, 0.12],
			[0.67, 0.12],
		].map((v) => new T.Vector2(...v));
		this.mesh(new T.LatheGeometry(profile, 24), color, g, [0, 0, 0]);
		const rim = this.mesh(
			new T.TorusGeometry(0.96, 0.065, 6, 32),
			C.paper,
			g,
			[0, 0.65, 0],
		);
		rim.rotation.x = Math.PI / 2;
		this.cyl(0.88, 0.88, 0.035, C.aqua, g, [0, 0.58, 0], false);
		this.box(1.22, 0.065, 0.035, 0x9ed5d1, g, [0, 0.27, 0.82], false);
		for (const side of [-1, 1]) {
			const handle = this.mesh(
				new T.TorusGeometry(0.18, 0.035, 5, 12),
				C.ink,
				g,
				[side * 0.9, 0.42, 0],
				null,
				false,
			);
			handle.rotation.y = Math.PI / 2;
		}
		const badge = this.text("~", "#fff2cd", 0.3);
		badge.scale.x = 0.4;
		badge.position.set(0, 0.4, 0.95);
		g.add(badge);
		if (ghost)
			g.traverse((o) => {
				if (o.isMesh) {
					o.material = o.material.clone();
					o.material.transparent = true;
					o.material.opacity = 0.23;
					o.material.depthWrite = false;
				}
			});
		return g;
	}
	setPlayers(n) {
		for (const p of this.players) {
			this.scene.remove(p.root);
			p.mixer.stopAllAction();
			this.scene.remove(p.shadow);
		}
		this.players = [];
		for (let i = 0; i < n; i++) {
			const root = new T.Group(),
				squash = new T.Group();
			root.add(squash);
			this.scene.add(root);
			const tubs = [];
			for (let j = 0; j < 3; j++) {
				const tub = this.createBucket(i ? 0xc46d45 : C.blue);
				tub.position.y = 0.7 + j * 0.82;
				squash.add(tub);
				tubs.push(tub);
			}
			const shadow = new T.Mesh(
				new T.CircleGeometry(1, 32),
				new T.MeshBasicNodeMaterial({
					color: C.ink,
					transparent: true,
					opacity: 0.22,
					depthWrite: false,
				}),
			);
			shadow.rotation.x = -Math.PI / 2;
			shadow.scale.set(1.5, 0.55, 1);
			shadow.position.y = 0.5;
			this.scene.add(shadow);
			const mixer = new T.AnimationMixer(squash),
				clip = new T.AnimationClip("Splash squash", 0.26, [
					new T.VectorKeyframeTrack(
						".scale",
						[0, 0.07, 0.26],
						[1, 1, 1, 1.13, 0.87, 1, 1, 1, 1],
					),
				]),
				action = mixer.clipAction(clip);
			action.setLoop(T.LoopOnce, 1);
			action.clampWhenFinished = true;
			this.players.push({ root, squash, tubs, shadow, mixer, action });
		}
	}
	playerState(players, width) {
		if (players.length !== this.players.length) this.setPlayers(players.length);
		for (let i = 0; i < players.length; i++) {
			const p = players[i],
				v = this.players[i];
			v.root.position.set(p.x, 0, 0.45);
			v.root.scale.x = width / 1.85;
			v.shadow.position.x = p.x;
			v.shadow.scale.x = width * 0.8;
			v.tubs.forEach((t, j) => {
				t.visible = j < p.buckets;
			});
			v.root.visible = p.buckets > 0;
		}
	}
	splash(i) {
		const p = this.players[i];
		if (p) p.action.reset().play();
	}
	createBomb(kind = "normal") {
		const g = new T.Group(),
			gold = kind === "gold",
			rush = kind === "rush";
		this.ball(
			gold ? 0.34 : 0.32,
			gold ? C.gold : rush ? 0xb14a41 : 0x29323f,
			g,
			[0, 0, 0],
		);
		this.cyl(0.11, 0.14, 0.11, gold ? 0xbd8732 : 0x6c7475, g, [0, 0.33, 0]);
		const fuse = new T.CatmullRomCurve3([
			new T.Vector3(0, 0.38, 0),
			new T.Vector3(0.08, 0.49, 0),
			new T.Vector3(0.02, 0.59, 0),
		]);
		this.mesh(
			new T.TubeGeometry(fuse, 6, 0.029, 5, false),
			C.paper,
			g,
			[0, 0, 0],
			null,
			false,
		);
		const spark = this.ball(
			0.09,
			C.orange,
			g,
			[0.02, 0.61, 0],
			[0.7, 1.3, 0.7],
			false,
		);
		spark.name = "Spark";
		for (const side of [-1, 1]) {
			const eye = this.box(
				0.09,
				0.055,
				0.035,
				C.paper,
				g,
				[side * 0.12, 0.035, 0.3],
				false,
			);
			eye.rotation.z = -side * 0.2;
		}
		this.ball(
			0.07,
			gold ? 0xfff4ba : 0x708591,
			g,
			[-0.13, 0.15, 0.235],
			[0.7, 1.2, 0.4],
			false,
		);
		if (gold) {
			const star = this.mesh(
				new T.OctahedronGeometry(0.13),
				C.paper,
				g,
				[0, -0.1, 0.33],
				null,
				false,
			);
			star.rotation.z = 0.2;
		}
		return g;
	}
	addBomb(b) {
		const m = this.createBomb(b.kind);
		m.position.set(b.x, b.y, 0.5);
		this.scene.add(m);
		this.bombs.set(b.id, m);
	}
	removeBomb(id) {
		const m = this.bombs.get(id);
		if (m) {
			this.scene.remove(m);
			this.bombs.delete(id);
		}
	}
	disposeGeometry(root) {
		const geos = new Set();
		root.traverse((o) => {
			if (o.geometry) geos.add(o.geometry);
			if (o.isSprite) o.material.map?.dispose();
		});
		for (const g of geos) g.dispose();
	}
	clearBombs() {
		for (const id of this.bombs.keys()) this.removeBomb(id);
	}
	updateBombs(bombs) {
		for (const b of bombs) {
			let m = this.bombs.get(b.id);
			if (!m) {
				this.addBomb(b);
				m = this.bombs.get(b.id);
			}
			m.position.set(b.x, b.y, 0.5);
			m.rotation.z = b.spin || 0;
			const spark = m.getObjectByName("Spark");
			if (spark)
				spark.scale.setScalar(0.85 + 0.3 * Math.sin(this.time * 32 + b.id));
		}
	}
	makeParticles() {
		this.particlePool = [];
		this.particleDummy = new T.Object3D();
		this.particleMesh = new T.InstancedMesh(
			new T.SphereGeometry(1, 6, 4),
			new T.MeshToonNodeMaterial({
				color: 0xffffff,
				gradientMap: this.gradient,
			}),
			1200,
		);
		this.particleMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
		this.particleMesh.count = 0;
		this.particleMesh.frustumCulled = false;
		this.scene.add(this.particleMesh);
	}
	burst(x, y, kind = "water", n = 30) {
		for (let i = 0; i < n; i++) {
			const a = i * 2.399 + this.time,
				spd = (kind === "boom" ? 3.5 : 2) + Math.random() * 4;
			this.particlePool.push({
				x,
				y,
				z: 0.6 + Math.random() * 0.5,
				vx: Math.cos(a) * spd,
				vy: Math.abs(Math.sin(a)) * spd + 1.8,
				vz: (Math.random() - 0.5) * 2,
				life: 0,
				max: 0.35 + Math.random() * 0.6,
				size: 0.04 + Math.random() * 0.1,
				color:
					kind === "boom"
						? [C.orange, C.gold, C.ink][i % 3]
						: kind === "gold"
							? C.gold
							: [C.aqua, 0xbdf5e1, C.paper][i % 3],
			});
		}
	}
	popup(text, x, y, color = "#fff2cd", size = 0.65) {
		const m = this.text(text, color, size);
		m.position.set(x, y, 1.2);
		this.scene.add(m);
		this.fx.push({ m, life: 0, max: 0.8, kind: "text" });
	}
	ring(x, y, color = C.aqua, big = false) {
		const m = new T.Mesh(
			new T.TorusGeometry(1, 0.025, 5, 48),
			new T.MeshBasicNodeMaterial({
				color,
				transparent: true,
				opacity: 0.9,
				depthWrite: false,
			}),
		);
		m.position.set(x, y, 0.6);
		this.scene.add(m);
		this.fx.push({
			m,
			life: 0,
			max: big ? 0.9 : 0.4,
			kind: big ? "douse" : "ring",
		});
	}
	updateGhost(id, data, color = C.orange) {
		let g = this.ghosts.get(id);
		if (!g) {
			const root = new T.Group();
			const tubs = [];
			for (let i = 0; i < 3; i++) {
				const t = this.createBucket(color, true);
				t.position.y = 0.7 + i * 0.82;
				root.add(t);
				tubs.push(t);
			}
			this.scene.add(root);
			g = { root, tubs, targetX: data.x };
			this.ghosts.set(id, g);
		}
		g.targetX = data.x;
		g.root.visible = data.visible !== false;
		g.tubs.forEach((t, i) => {
			t.visible = i < data.buckets;
		});
	}
	removeGhost(id) {
		const g = this.ghosts.get(id);
		if (g) {
			this.scene.remove(g.root);
			this.ghosts.delete(id);
		}
	}
	screenX(clientX, clientY) {
		const p = new T.Vector3(
			(clientX / innerWidth) * 2 - 1,
			-(clientY / innerHeight) * 2 + 1,
			0,
		).unproject(this.camera);
		const dir = new T.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
		const t = (0.5 - p.z) / dir.z;
		return p.x + dir.x * t;
	}
	resize() {
		if (!this.renderer) return;
		const aspect = innerWidth / innerHeight,
			h = Math.max(16.8, 26 / aspect);
		this.camera.left = (-h * aspect) / 2;
		this.camera.right = (h * aspect) / 2;
		this.camera.top = h / 2;
		this.camera.bottom = -h / 2;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(innerWidth, innerHeight);
	}
	render(dt, params = {}) {
		this.time += dt;
		this.cameraOffset +=
			(this.targetOffset - this.cameraOffset) * Math.min(1, dt * 5);
		this.shake = Math.max(0, this.shake - dt * 2);
		const shake = params.reduceMotion ? 0 : this.shake;
		this.camera.position.set(
			this.cameraOffset + (Math.random() - 0.5) * shake,
			13.6 + (Math.random() - 0.5) * shake,
			36,
		);
		this.camera.lookAt(this.cameraOffset, 6.1, 0);
		this.bomber.position.x = params.bomberX ?? 0;
		this.bomber.rotation.z = Math.sin(this.time * 6) * 0.015;
		this.bomberMixer.timeScale = params.running ? 1.6 : 0.65;
		this.held.visible = params.held !== false;
		for (const a of this.mixers) {
			if (a.mixer) a.mixer.update(dt);
		}
		for (const p of this.players) p.mixer.update(dt);
		this.bird.position.x = 7 + Math.sin(this.time * 0.27) * 9;
		this.bird.position.y = 8.1 + Math.sin(this.time * 2) * 0.15;
		for (const g of this.ghosts.values())
			g.root.position.x +=
				(g.targetX - g.root.position.x) * Math.min(1, dt * 14);
		this.particlePool = this.particlePool.filter((p) => {
			p.life += dt;
			if (p.life > p.max) return false;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.z += p.vz * dt;
			p.vy -= 12 * dt;
			return true;
		});
		const d = this.particleDummy;
		this.particlePool.slice(-1200).forEach((p, i) => {
			d.position.set(p.x, p.y, p.z);
			d.scale.setScalar(p.size * (1 - p.life / p.max));
			d.updateMatrix();
			this.particleMesh.setMatrixAt(i, d.matrix);
			this.particleMesh.setColorAt(i, new T.Color(p.color));
		});
		this.particleMesh.count = Math.min(1200, this.particlePool.length);
		this.particleMesh.instanceMatrix.needsUpdate = true;
		if (this.particleMesh.instanceColor)
			this.particleMesh.instanceColor.needsUpdate = true;
		this.fx = this.fx.filter((f) => {
			f.life += dt;
			if (f.life >= f.max) {
				this.scene.remove(f.m);
				f.m.geometry?.dispose();
				f.m.material.map?.dispose();
				f.m.material.dispose();
				return false;
			}
			const t = f.life / f.max;
			if (f.kind === "text") {
				f.m.position.y += dt * 0.8;
				f.m.material.opacity = Math.min(1, (1 - t) * 3);
			} else {
				const s = f.kind === "douse" ? 1 + t * 19 : 0.3 + t * 1.2;
				f.m.scale.setScalar(s);
				f.m.material.opacity = (1 - t) * 0.8;
			}
			return true;
		});
		if (!this.recovering && !this.disposed) {
			this.renderer.render(this.scene, this.camera);
			if (this.backend === "WebGPU")
				this.webgpuDrawCalls = Math.max(
					this.webgpuDrawCalls || 0,
					this.renderer.info.render.drawCalls,
				);
		}
	}
	async verifyFrame() {
		const target = new T.RenderTarget(64, 64, {
			format: T.RGBAFormat,
			type: T.UnsignedByteType,
			depthBuffer: true,
		});
		this.renderer.setRenderTarget(target);
		this.renderer.render(this.scene, this.camera);
		this.renderer.setRenderTarget(null);
		const pixels = await this.renderer.readRenderTargetPixelsAsync(
			target,
			0,
			0,
			64,
			64,
		);
		let min = 255,
			max = 0,
			total = 0;
		const colors = new Set();
		for (let i = 0; i < pixels.length; i += 4) {
			const v = pixels[i] + pixels[i + 1] + pixels[i + 2];
			min = Math.min(min, v / 3);
			max = Math.max(max, v / 3);
			total += v;
			colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
		}
		target.dispose();
		return { min, max, colors: colors.size, total };
	}
	async screenshotReady() {
		let timer;
		try {
			await Promise.race([
				this.renderer.compileAsync(this.scene, this.camera),
				new Promise((_, reject) => {
					timer = setTimeout(
						() => reject(new Error("Graphics compilation timed out")),
						6000,
					);
				}),
			]);
		} catch {
			await this.useCompatibility();
			await this.renderer.compileAsync(this.scene, this.camera);
		} finally {
			clearTimeout(timer);
		}
	}
}
