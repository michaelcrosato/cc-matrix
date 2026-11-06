import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

const INK = 0x071523;
const PALETTE = {
	cream: 0xfff0ce,
	coral: 0xff795c,
	cyan: 0x7bf6e2,
	navy: 0x162b43,
	lilac: 0xc191e9,
	gold: 0xffcf6c,
	pink: 0xf060a6,
};
const shadeCache = new Map();
function cel(hex) {
	if (shadeCache.has(hex)) return shadeCache.get(hex);
	const m = new THREE.MeshBasicNodeMaterial();
	const light = normalWorld
		.dot(vec3(-0.4, 0.75, 0.55))
		.max(0)
		.mul(3)
		.floor()
		.div(3)
		.mul(0.61)
		.add(0.39);
	m.colorNode = color(hex).mul(light);
	shadeCache.set(hex, m);
	return m;
}
function flat(hex, opts = {}) {
	return new THREE.MeshBasicMaterial({ color: hex, ...opts });
}
function inkMesh(geo, hex, edges = true) {
	const mesh = new THREE.Mesh(geo, cel(hex));
	if (edges) {
		const line = new THREE.LineSegments(
			new THREE.EdgesGeometry(geo, 28),
			new THREE.LineBasicMaterial({ color: INK }),
		);
		mesh.add(line);
	}
	return mesh;
}
function box(w, h, d, hex) {
	return inkMesh(new THREE.BoxGeometry(w, h, d), hex);
}
function wedge(width, height, length, hex) {
	const p = [
		0,
		height,
		-length / 2,
		-width / 2,
		0,
		length / 2,
		width / 2,
		0,
		length / 2,
		0,
		height,
		-length / 2,
		width / 2,
		0,
		length / 2,
		0,
		-height / 2,
		length / 3,
		0,
		height,
		-length / 2,
		0,
		-height / 2,
		length / 3,
		-width / 2,
		0,
		length / 2,
		-width / 2,
		0,
		length / 2,
		0,
		-height / 2,
		length / 3,
		width / 2,
		0,
		length / 2,
	];
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
	g.computeVertexNormals();
	return inkMesh(g, hex);
}
function ring(r, t, hex) {
	const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 5, 48), flat(hex));
	return m;
}
function dreadnought() {
	const g = new THREE.Group();
	g.name = "sunEater";
	const core = inkMesh(new THREE.IcosahedronGeometry(2.55, 1), PALETTE.navy);
	core.scale.set(1.2, 0.9, 1);
	g.add(core);
	const aperture = new THREE.Group();
	aperture.name = "aperture";
	aperture.position.z = 2.3;
	aperture.add(new THREE.Mesh(new THREE.CircleGeometry(1.65, 24), flat(INK)));
	aperture.add(ring(1.75, 0.24, PALETTE.gold));
	aperture.add(ring(1.36, 0.09, PALETTE.coral));
	const eye = new THREE.Mesh(
		new THREE.CircleGeometry(0.55, 12),
		flat(PALETTE.coral),
	);
	eye.position.z = 0.08;
	aperture.add(eye);
	g.add(aperture);
	for (const side of [-1, 1]) {
		const spar = box(6.7, 0.7, 2.7, PALETTE.lilac);
		spar.position.set(side * 4.6, 0, -0.15);
		spar.rotation.z = side * 0.16;
		g.add(spar);
		const sail = wedge(3.5, 1.6, 6.5, PALETTE.lilac);
		sail.position.set(side * 6.4, 0, 0.2);
		sail.rotation.y = side * 0.15;
		g.add(sail);
		const edge = box(0.45, 2.9, 4.4, PALETTE.coral);
		edge.position.set(side * 7.3, 0.2, 0.6);
		g.add(edge);
		for (let i = 0; i < 3; i++) {
			const turret = inkMesh(new THREE.OctahedronGeometry(0.47), PALETTE.gold);
			turret.position.set(side * (3.8 + i * 1.3), 0.65, 1.4);
			g.add(turret);
		}
		const jaw = wedge(1.2, 0.8, 5.8, PALETTE.cream);
		jaw.position.set(side * 2.4, -1.3, 2);
		jaw.rotation.y = side * 0.3;
		g.add(jaw);
		const engine = new THREE.Mesh(
			new THREE.ConeGeometry(0.7, 3, 8),
			flat(PALETTE.coral),
		);
		engine.rotation.x = -Math.PI / 2;
		engine.position.set(side * 5, -0.2, -3);
		g.add(engine);
	}
	const spine = box(0.6, 2.6, 4, PALETTE.gold);
	spine.position.set(0, 1.9, -0.4);
	g.add(spine);
	const shield = new THREE.Group();
	shield.name = "bossShield";
	const shell = new THREE.Mesh(
		new THREE.IcosahedronGeometry(9, 1),
		flat(PALETTE.cyan, {
			wireframe: true,
			transparent: true,
			opacity: 0.32,
			depthWrite: false,
		}),
	);
	shell.scale.set(1, 0.62, 0.5);
	shield.add(shell);
	for (let i = 0; i < 3; i++) {
		const r = ring(9 + i * 0.38, 0.055, PALETTE.cyan);
		r.scale.y = 0.62;
		r.position.z = 1.3 + i * 0.25;
		shield.add(r);
	}
	g.add(shield);
	const mixer = new THREE.AnimationMixer(g);
	mixer
		.clipAction(
			new THREE.AnimationClip("Dreadnought core and shield", 4, [
				new THREE.NumberKeyframeTrack(
					"aperture.rotation[z]",
					[0, 4],
					[0, Math.PI * 2],
				),
				new THREE.NumberKeyframeTrack(
					"bossShield.rotation[z]",
					[0, 4],
					[0, -Math.PI * 0.3],
				),
			]),
		)
		.play();
	g.userData.mixer = mixer;
	return g;
}
function craft(kind = "hero") {
	if (kind === "boss" || kind === "flagship") return dreadnought();
	if (kind === "mech") {
		const g = new THREE.Group();
		g.add(inkMesh(new THREE.OctahedronGeometry(1.25), PALETTE.lilac));
		const face = box(1.3, 0.36, 0.3, PALETTE.gold);
		face.position.z = 1;
		g.add(face);
		for (const side of [-1, 1]) {
			const arm = box(1.6, 0.36, 0.65, PALETTE.navy);
			arm.position.x = side * 1.3;
			g.add(arm);
			const pod = box(0.8, 1.7, 1.2, PALETTE.coral);
			pod.position.set(side * 2, 0, 0.1);
			g.add(pod);
			const gun = box(0.28, 0.28, 1.5, PALETTE.gold);
			gun.position.set(side * 2, 0.2, 1);
			g.add(gun);
		}
		return g;
	}
	const g = new THREE.Group(),
		hero = kind === "hero" || kind === "ally",
		boss = kind === "boss" || kind === "flagship";
	const main = hero
		? PALETTE.cream
		: kind === "raider"
			? PALETTE.coral
			: PALETTE.pink;
	const body = wedge(hero ? 1.5 : 1.8, 0.65, 3.8, main);
	g.add(body);
	const cockpit = wedge(0.66, 0.42, 1.6, hero ? PALETTE.cyan : PALETTE.gold);
	cockpit.position.set(0, 0.45, -0.3);
	g.add(cockpit);
	for (const side of [-1, 1]) {
		const wing = wedge(2.2, 0.12, 2.1, main);
		wing.position.set(side * 1.55, -0.12, 0.72);
		wing.rotation.z = side * -0.12;
		wing.rotation.y = side * 0.3;
		wing.name = side < 0 ? "wingL" : "wingR";
		g.add(wing);
		const stripe = box(0.28, 0.1, 1.5, hero ? PALETTE.coral : PALETTE.navy);
		stripe.position.set(side * 1.6, 0.04, 0.8);
		g.add(stripe);
		const gun = box(0.22, 0.25, 1.65, PALETTE.navy);
		gun.position.set(side * 2.3, -0.05, 0.05);
		g.add(gun);
		const nozzle = inkMesh(
			new THREE.CylinderGeometry(0.27, 0.32, 0.7, 8),
			PALETTE.navy,
		);
		nozzle.rotation.x = Math.PI / 2;
		nozzle.position.set(side * 0.68, -0.1, 1.6);
		g.add(nozzle);
		const flame = new THREE.Group();
		flame.name = side < 0 ? "engineL" : "engineR";
		flame.position.set(side * 0.68, -0.1, 1.98);
		const outer = new THREE.Mesh(
			new THREE.ConeGeometry(0.25, 1.6, 6),
			flat(hero ? PALETTE.cyan : PALETTE.coral),
		);
		outer.rotation.x = Math.PI / 2;
		outer.position.z = 0.6;
		flame.add(outer);
		const core = new THREE.Mesh(
			new THREE.ConeGeometry(0.13, 1.05, 5),
			flat(PALETTE.cream),
		);
		core.rotation.x = Math.PI / 2;
		core.position.z = 0.35;
		flame.add(core);
		g.add(flame);
	}
	const fin = wedge(0.18, 0.65, 1.1, hero ? PALETTE.coral : PALETTE.navy);
	fin.position.set(0, 0.65, 1);
	g.add(fin);
	if (!hero) {
		g.rotation.y = Math.PI;
		g.scale.setScalar(kind === "raider" ? 1.05 : 0.75);
		if (kind === "raider") {
			const blade = box(5, 0.25, 0.55, PALETTE.navy);
			blade.position.set(0, 0.1, 1);
			g.add(blade);
			for (const side of [-1, 1]) {
				const jaw = wedge(0.7, 0.65, 2.6, PALETTE.gold);
				jaw.position.set(side * 2.3, 0.1, -0.5);
				g.add(jaw);
			}
		} else {
			for (const side of [-1, 1]) {
				const foil = wedge(0.26, 1.5, 1.7, PALETTE.pink);
				foil.position.set(side * 1.5, 0.45, 0.5);
				g.add(foil);
			}
		}
	}
	if (kind === "ally") {
		g.traverse((o) => {
			if (o.isMesh && o.material === cel(PALETTE.coral))
				o.material = cel(PALETTE.cyan);
		});
	}
	return g;
}
function makeCadet() {
	const g = new THREE.Group();
	const head = inkMesh(new THREE.IcosahedronGeometry(0.5, 1), PALETTE.cream);
	head.position.y = 0.8;
	g.add(head);
	const visor = box(0.67, 0.23, 0.25, PALETTE.navy);
	visor.position.set(0, 0.88, 0.42);
	g.add(visor);
	g.add(box(0.55, 0.6, 0.4, PALETTE.coral));
	for (const s of [-1, 1]) {
		const a = box(0.14, 0.65, 0.15, PALETTE.cream);
		a.position.set(s * 0.42, 0.35, 0);
		a.rotation.z = s * -0.7;
		g.add(a);
		const leg = box(0.17, 0.5, 0.18, PALETTE.cream);
		leg.position.set(s * 0.2, -0.5, 0);
		g.add(leg);
	}
	const h = ring(1.2, 0.045, PALETTE.cyan);
	h.name = "beacon";
	g.add(h);
	g.name = "cadet";
	return g;
}

export class StarView {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x071321);
		this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1500);
		this.camera.position.set(0, 3, 16);
		this.camera.lookAt(0, 0, -30);
		this.entities = new Map();
		this.mixers = [];
		this.metadata = {
			version: THREE.REVISION,
			backend: "initializing",
			recoveryCount: 0,
			recoveryReason: "",
			animations: ["afterburn pulse", "wing flex", "rescue beacon"],
		};
		this.sky = new THREE.Group();
		this.surface = new THREE.Group();
		this.corridor = new THREE.Group();
		this.scene.add(this.sky, this.surface, this.corridor);
		this.createSky();
		this.createSurface();
		this.createCorridor();
		this.hero = craft();
		this.scene.add(this.hero);
		this.ally = craft("ally");
		this.scene.add(this.ally);
		this.animateCraft(this.hero);
		this.animateCraft(this.ally);
		this.shield = new THREE.Mesh(
			new THREE.IcosahedronGeometry(3.1, 2),
			new THREE.MeshBasicMaterial({
				color: PALETTE.cyan,
				wireframe: true,
				transparent: true,
				opacity: 0.15,
				depthWrite: false,
			}),
		);
		this.hero.add(this.shield);
		this.warpLines = new THREE.Group();
		for (let i = 0; i < 100; i++) {
			const m = box(
				0.025,
				0.025,
				1.5 + Math.random() * 8,
				i % 3 ? PALETTE.cyan : PALETTE.cream,
			);
			const a = Math.random() * Math.PI * 2,
				r = 6 + Math.random() * 45;
			m.position.set(Math.cos(a) * r, Math.sin(a) * r, -Math.random() * 180);
			m.userData.base = m.position.z;
			this.warpLines.add(m);
		}
		this.scene.add(this.warpLines);
		this._projection = new THREE.Vector3();
		this._lastBiome = "";
		this._busy = false;
		this._rendererGeneration = 0;
		this._renderReady = false;
		this._recovering = false;
		this._fallbackUsed = false;
		this._recoveryPromise = null;
		this._viewInitPromise = null;
		this._activeRenderer = null;
	}
	async init() {
		if (!this._viewInitPromise) {
			const forceWebGL =
				new URLSearchParams(location.search).get("renderer") === "webgl";
			this._viewInitPromise = (async () => {
				try {
					await this._openRenderer(forceWebGL);
				} catch (error) {
					if (forceWebGL) {
						this._retireRenderer(this._activeRenderer);
						throw error;
					}
					await this._recoverToWebGL(
						`WebGPU initialization: ${error.message}`,
						this._activeRenderer,
					);
				}
				// A loss arriving just after backend initialization still belongs to boot.
				if (this._recoveryPromise) await this._recoveryPromise;
				return this;
			})();
		}
		return this._viewInitPromise;
	}
	async _openRenderer(forceWebGL, retiringRecord = null) {
		const generation = ++this._rendererGeneration;
		const deadline = performance.now() + 8000;
		const context = forceWebGL
			? await this._acquireWebGLContext(deadline, generation, !!retiringRecord)
			: undefined;
		if (retiringRecord) this._retireRenderer(retiringRecord);
		const renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			forceWebGL,
			...(context ? { context } : {}),
		});
		const record = {
			renderer,
			generation,
			forceWebGL,
			initializing: true,
			retired: false,
			initialized: false,
			renderPromise: null,
		};
		this._activeRenderer = record;
		this.renderer = renderer;
		this._renderReady = false;
		let rejectLoss;
		const lost = new Promise((_, reject) => {
			rejectLoss = reject;
		});
		renderer.onDeviceLost = (info = {}) => {
			if (
				record.retired ||
				this._activeRenderer !== record ||
				generation !== this._rendererGeneration
			)
				return;
			if (info.api === "WebGPU" && !renderer.backend.isWebGPUBackend) return;
			const reason = `${info.api || "Graphics"} device lost: ${info.message || info.reason || "unknown"}`;
			this._renderReady = false;
			if (record.initializing) rejectLoss(new Error(reason));
			else if (renderer.backend.isWebGPUBackend && !forceWebGL) {
				// Native callback replaces Three's console.error default. The recovery
				// promise is handled here; boot also awaits it if still in progress.
				this._recoverToWebGL(reason, record).catch(() => {});
			} else this.metadata.error = reason;
		};
		renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.NoToneMapping;
		record.initPromise = Promise.resolve()
			.then(() => renderer.init())
			.then(() => {
				record.initialized = true;
				return renderer;
			});
		let timeout;
		try {
			await Promise.race([
				record.initPromise,
				lost,
				new Promise((_, reject) => {
					timeout = setTimeout(
						() =>
							reject(
								new Error(
									`${forceWebGL ? "WebGL 2" : "WebGPU"} initialization exceeded 8 seconds`,
								),
							),
						Math.max(1, deadline - performance.now()),
					);
				}),
			]);
			if (record.retired || generation !== this._rendererGeneration)
				throw new Error("Renderer initialization was superseded");
			this.metadata.backend = renderer.backend.isWebGPUBackend
				? "WebGPU"
				: "WebGL 2 fallback";
			delete this.metadata.error;
			this.resize();
			this._renderReady = true;
			// renderAsync prepares pipelines lazily; no loading-time warm-up.
		} finally {
			clearTimeout(timeout);
			record.initializing = false;
		}
	}
	_replaceCanvas() {
		const previous = this.canvas;
		const replacement = document.createElement("canvas");
		for (const attribute of previous.attributes)
			replacement.setAttribute(attribute.name, attribute.value);
		replacement.width = previous.width;
		replacement.height = previous.height;
		previous.replaceWith(replacement);
		this.canvas = replacement;
		return replacement;
	}
	async _acquireWebGLContext(deadline, generation, freshCanvas) {
		// A GPU process reset may briefly reject fresh contexts. Never hand Three
		// a null/lost context; each retry gets a genuinely new DOM canvas.
		const delays = [0, 150, 350, 700, 1200, 1800, 2200, 1200];
		let detail = "the browser returned no WebGL 2 context";
		this.metadata.contextAcquisitionAttempts = 0;
		for (let attempt = 0; attempt < delays.length; attempt++) {
			const delay = delays[attempt];
			if (performance.now() + delay >= deadline) break;
			if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
			if (generation !== this._rendererGeneration)
				throw new Error("Context acquisition was superseded");
			if (freshCanvas || attempt > 0) this._replaceCanvas();
			this.metadata.contextAcquisitionAttempts++;
			try {
				const context = this.canvas.getContext("webgl2", {
					antialias: true,
					alpha: true,
					depth: true,
					stencil: false,
				});
				if (context && !context.isContextLost()) return context;
			} catch (error) {
				detail = error.message;
			}
		}
		throw new Error(`WebGL 2 context unavailable within 8 seconds: ${detail}`);
	}
	_retireRenderer(record, release = true) {
		if (!record) return;
		record.retired = true;
		record.renderer.onDeviceLost = () => {};
		if (!release || record.cleanupScheduled) return;
		record.cleanupScheduled = true;
		// Release only this renderer's device. A late init cannot claim the new
		// canvas, and eventual settlement disposes the retired renderer's caches.
		try {
			record.renderer.backend.device?.destroy();
		} catch {}
		Promise.allSettled([record.initPromise, record.renderPromise])
			.then(() => {
				try {
					record.renderer.backend.context?.unconfigure?.();
				} catch {}
				if (record.initialized) {
					try {
						record.renderer.dispose();
					} catch {}
				}
			})
			.catch(() => {});
	}
	_recoverToWebGL(reason, source) {
		if (this._recoveryPromise) return this._recoveryPromise;
		if (source && source !== this._activeRenderer) return Promise.resolve(this);
		if (this._fallbackUsed) {
			if (this._renderReady && !this.renderer?.backend.isWebGPUBackend)
				return Promise.resolve(this);
			return Promise.reject(
				new Error("Graphics recovery has already been attempted"),
			);
		}
		this._fallbackUsed = true;
		this._recovering = true;
		this._renderReady = false;
		this._busy = false;
		++this._rendererGeneration;
		this.metadata.recoveryCount++;
		this.metadata.recoveryReason = reason;
		this.metadata.backend = "recovering WebGL 2";
		this._activeRenderer = null;
		this.renderer = null;
		// Silence and invalidate old work now; release its device only once the
		// replacement context has bound (or bounded acquisition has failed).
		this._retireRenderer(source, false);
		this._recoveryPromise = this._openRenderer(true, source)
			.then(() => this)
			.catch((error) => {
				this._renderReady = false;
				this.metadata.backend = "graphics unavailable";
				this.metadata.error = `WebGL 2 recovery failed: ${error.message}`;
				this._retireRenderer(this._activeRenderer);
				throw error;
			})
			.finally(() => {
				this._retireRenderer(source);
				this._recovering = false;
				this._recoveryPromise = null;
			});
		return this._recoveryPromise;
	}
	recoverGraphics(reason = "Requested graphics recovery") {
		return this._recoverToWebGL(reason, this._activeRenderer);
	}
	resize() {
		const w = this.canvas.clientWidth || innerWidth,
			h = this.canvas.clientHeight || innerHeight;
		this.camera.aspect = w / h;
		this.cameraDistance = Math.max(16, 3 + 22 / this.camera.aspect);
		this.camera.updateProjectionMatrix();
		this.renderer?.setSize(w, h, false);
	}
	animateCraft(g) {
		const mixer = new THREE.AnimationMixer(g);
		const tracks = [];
		for (const side of ["L", "R"]) {
			tracks.push(
				new THREE.VectorKeyframeTrack(
					`engine${side}.scale`,
					[0, 0.12, 0.25, 0.4],
					[1, 1, 0.8, 1.2, 1.2, 1.35, 0.9, 0.9, 0.85, 1, 1, 0.8],
				),
			);
		}
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[z]",
				[0, 1, 2],
				[0.09, 0.16, 0.09],
			),
		);
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[z]",
				[0, 1, 2],
				[-0.09, -0.16, -0.09],
			),
		);
		mixer
			.clipAction(new THREE.AnimationClip("Cruise and afterburn", 2, tracks))
			.play();
		this.mixers.push(mixer);
	}
	createSky() {
		const positions = [],
			colors = [];
		for (let i = 0; i < 1800; i++) {
			const a = Math.random() * Math.PI * 2,
				r = 120 + Math.random() * 500;
			positions.push(
				Math.cos(a) * r,
				Math.sin(a) * r * 0.62,
				-80 - Math.random() * 700,
			);
			const c = new THREE.Color(
				i % 6 === 0
					? PALETTE.cyan
					: i % 9 === 0
						? PALETTE.coral
						: PALETTE.cream,
			);
			colors.push(c.r, c.g, c.b);
		}
		const sg = new THREE.BufferGeometry();
		sg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		sg.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		this.stars = new THREE.Points(
			sg,
			new THREE.PointsMaterial({
				size: 0.68,
				vertexColors: true,
				sizeAttenuation: true,
			}),
		);
		this.sky.add(this.stars);
		this.planet = new THREE.Group();
		this.planet.position.set(43, 24, -150);
		this.sky.add(this.planet);
		const globe = inkMesh(
			new THREE.SphereGeometry(24, 48, 24),
			0x527c91,
			false,
		);
		globe.rotation.z = -0.3;
		this.planet.add(globe);
		const glow = new THREE.Mesh(
			new THREE.SphereGeometry(24.55, 48, 24),
			flat(0x95e4de, { side: THREE.BackSide }),
		);
		this.planet.add(glow);
		for (let i = 0; i < 9; i++) {
			const rr = new THREE.Mesh(
				new THREE.RingGeometry(31 + i * 0.95, 31.48 + i * 0.95, 100),
				flat(i % 3 === 0 ? 0xe8ba93 : i % 2 ? 0x587c8d : 0xb1ccc4, {
					side: THREE.DoubleSide,
				}),
			);
			rr.rotation.set(1.18, -0.18, -0.48);
			this.planet.add(rr);
		}
		const p2 = inkMesh(
			new THREE.IcosahedronGeometry(6, 2),
			PALETTE.coral,
			false,
		);
		p2.position.set(-49, 30, -185);
		this.sky.add(p2);
		for (let i = 0; i < 4; i++) {
			const arc = ring(185 + i * 14, 0.11, i % 2 ? 0x213c52 : 0x1b2e49);
			arc.position.set(-80, -85, -350);
			arc.scale.y = 0.5;
			arc.rotation.z = 0.4;
			this.sky.add(arc);
		}
		const sun = new THREE.Group();
		sun.position.set(-102, -15, -310);
		sun.add(new THREE.Mesh(new THREE.CircleGeometry(30, 48), flat(0x162c46)));
		for (let i = 0; i < 5; i++) {
			const l = ring(31 + i * 3, 0.15, 0x294965);
			sun.add(l);
		}
		this.sky.add(sun);
		this.aurora = new THREE.Group();
		for (let i = 0; i < 12; i++) {
			const geo = new THREE.PlaneGeometry(500, 2 + i * 0.65);
			const m = new THREE.Mesh(
				geo,
				flat(i % 2 ? 0x162841 : 0x1a3043, {
					transparent: true,
					opacity: 0.24,
					depthWrite: false,
				}),
			);
			m.position.set(0, 65 - i * 2.6, -450 - i);
			m.rotation.z = -0.23;
			this.aurora.add(m);
		}
		this.sky.add(this.aurora);
	}
	createSurface() {
		const ground = new THREE.Mesh(
			new THREE.PlaneGeometry(600, 1200),
			cel(0x325a62),
		);
		ground.rotation.x = -Math.PI / 2;
		ground.position.set(0, -8, -350);
		this.surface.add(ground);
		this.ground = ground;
		const grid = new THREE.GridHelper(800, 80, 0x84c4bd, 0x3b7376);
		grid.position.set(0, -7.95, -350);
		this.surface.add(grid);
		this.groundGrid = grid;
		this.mountains = new THREE.Group();
		for (let i = 0; i < 65; i++) {
			const m = inkMesh(
				new THREE.ConeGeometry(
					5 + Math.random() * 12,
					8 + Math.random() * 25,
					4,
				),
				i % 2 ? 0x416d72 : 0x284751,
			);
			const side = i % 2 ? 1 : -1;
			m.position.set(
				side * (25 + Math.random() * 80),
				-3,
				-15 - Math.random() * 500,
			);
			m.rotation.y = Math.random() * 3;
			this.mountains.add(m);
		}
		this.surface.add(this.mountains);
		this.surfaceSun = new THREE.Mesh(
			new THREE.CircleGeometry(34, 48),
			flat(PALETTE.gold),
		);
		this.surfaceSun.position.set(-38, 15, -220);
		this.surface.add(this.surfaceSun);
		for (let i = 0; i < 8; i++) {
			const band = new THREE.Mesh(
				new THREE.PlaneGeometry(74, 0.7 + i * 0.5),
				flat(0x071321),
			);
			band.position.set(-38, 25 - i * 5, -219);
			this.surface.add(band);
		}
	}
	createCorridor() {
		this.hoops = [];
		for (let i = 0; i < 16; i++) {
			const g = new THREE.Group();
			const frame = ring(14, 0.25, i % 3 === 0 ? PALETTE.coral : 0x416b7d);
			frame.rotation.z = Math.PI / 8;
			g.add(frame);
			for (const x of [-14, 14]) {
				const rail = box(0.35, 0.35, 20, 0x315368);
				rail.position.set(x, 0, 0);
				g.add(rail);
			}
			g.position.z = -i * 20;
			this.corridor.add(g);
			this.hoops.push(g);
		}
		for (const x of [-14, 14])
			for (const y of [-8, 8]) {
				const b = box(0.5, 0.5, 400, PALETTE.cyan);
				b.position.set(x, y, -180);
				this.corridor.add(b);
			}
	}
	createEntity(e, kind) {
		let m;
		if (kind === "enemies") {
			m = craft(e.type);
			if (e.type === "turret") {
				m.clear();
				m.add(inkMesh(new THREE.OctahedronGeometry(1.4), PALETTE.coral));
				m.add(box(3, 0.4, 0.4, PALETTE.navy));
			}
		} else if (kind === "shots") {
			m = new THREE.Group();
			const b = box(
				e.enemy ? 0.2 : 0.13,
				e.enemy ? 0.2 : 0.13,
				e.enemy ? 1.4 : 2.5,
				e.enemy ? PALETTE.coral : PALETTE.cyan,
			);
			m.add(b);
			const halo = new THREE.Mesh(
				new THREE.SphereGeometry(e.enemy ? 0.23 : 0.16, 6, 4),
				flat(PALETTE.cream),
			);
			m.add(halo);
		} else if (kind === "particles") {
			m = inkMesh(
				new THREE.OctahedronGeometry(0.4),
				e.color || PALETTE.coral,
				false,
			);
		} else if (e.type === "cadet") {
			m = makeCadet();
			const mixer = new THREE.AnimationMixer(m);
			mixer
				.clipAction(
					new THREE.AnimationClip("Rescue beacon", 1.6, [
						new THREE.VectorKeyframeTrack(
							"beacon.scale",
							[0, 0.8, 1.6],
							[1, 1, 1, 1.28, 1.28, 1.28, 1, 1, 1],
						),
					]),
				)
				.play();
			m.userData.mixer = mixer;
		} else if (e.type === "key") {
			m = new THREE.Group();
			m.add(ring(1, 0.16, PALETTE.gold));
			const b = box(0.3, 1.8, 0.3, PALETTE.gold);
			b.position.y = -1.35;
			m.add(b);
			const t = box(0.7, 0.25, 0.3, PALETTE.gold);
			t.position.set(0.2, -2, 0);
			m.add(t);
		} else if (e.type === "gate") {
			m = new THREE.Group();
			for (const x of [-9, 9]) {
				const b = box(2, 17, 2, PALETTE.lilac);
				b.position.x = x;
				m.add(b);
			}
			for (const y of [-8, 8]) {
				const b = box(18, 1, 2, PALETTE.lilac);
				b.position.y = y;
				m.add(b);
			}
			const barrier = new THREE.Mesh(
				new THREE.PlaneGeometry(16, 15),
				flat(PALETTE.pink, {
					transparent: true,
					opacity: 0.23,
					side: THREE.DoubleSide,
				}),
			);
			m.add(barrier);
			for (let y = -7; y < 8; y += 1.5) {
				const b = box(16, 0.1, 0.2, PALETTE.coral);
				b.position.y = y;
				m.add(b);
			}
		} else if (e.type === "dock") {
			m = new THREE.Group();
			const top = box(8, 1.2, 3, PALETTE.cream);
			top.position.y = 3;
			m.add(top);
			for (const x of [-4, 4]) {
				const b = box(1, 6, 3, PALETTE.cream);
				b.position.x = x;
				m.add(b);
			}
			const base = box(9, 0.7, 7, PALETTE.navy);
			base.position.y = -3;
			m.add(base);
			m.add(ring(2.5, 0.15, PALETTE.cyan));
		} else if (e.type === "rock") {
			m = inkMesh(new THREE.IcosahedronGeometry(e.radius || 1.8, 0), 0x9d7770);
		} else {
			m = inkMesh(new THREE.OctahedronGeometry(1), PALETTE.gold);
		}
		this.scene.add(m);
		this.entities.set(`${kind}:${e.id}`, m);
		return m;
	}
	project(x, y, z) {
		this._projection.set(x, y, z).project(this.camera);
		return {
			x: (this._projection.x + 1) / 2,
			y: (1 - this._projection.y) / 2,
			visible: this._projection.z < 1,
		};
	}
	update(state, dt) {
		const t = state.time || 0,
			biome = state.biome || "space";
		for (const mx of this.mixers) mx.update(dt);
		this.surface.visible = biome === "surface" || biome === "solar";
		this.corridor.visible = biome === "corridor";
		this.planet.visible = !this.surface.visible && biome !== "corridor";
		this.surfaceSun.visible = true;
		if (this._lastBiome !== biome) {
			this._lastBiome = biome;
			this.ground.material = cel(biome === "solar" ? 0x675579 : 0x325a62);
			for (let i = 0; i < this.mountains.children.length; i++)
				this.mountains.children[i].material = cel(
					biome === "solar"
						? i % 2
							? 0xb490b2
							: 0x786491
						: i % 2
							? 0x416d72
							: 0x284751,
				);
			this.surfaceSun.material.color.set(
				biome === "solar" ? 0xffe8ac : PALETTE.gold,
			);
		}
		const p = state.player || { x: 0, y: 0 };
		this.hero.visible = state.mode !== "map";
		this.hero.position.set(p.x || 0, p.y || 0, 3);
		this.hero.rotation.set(
			(p.boost ? -0.12 : 0) + Math.sin(t * 2) * 0.015,
			0,
			p.roll || 0,
		);
		this.hero.scale.setScalar(p.boost ? 1.03 : 1);
		this.shield.visible = !!p.shield;
		this.ally.visible = !!state.ally?.active;
		if (this.ally.visible) {
			this.ally.position.set(state.ally.x || 3, state.ally.y || 0, 3);
			this.ally.rotation.z = state.ally.roll || 0;
		}
		if (state.mode === "title") {
			this.hero.visible = true;
			this.hero.position.set(5, -2, 1);
			this.hero.rotation.set(0.1, Math.sin(t * 0.25) * 0.15, -0.12);
		}
		this.planet.rotation.z = Math.sin(t * 0.03) * 0.035;
		this.stars.rotation.z = t * 0.001;
		if (this.surface.visible) {
			this.groundGrid.position.z = -350 + ((t * 26) % 10);
			for (const m of this.mountains.children) {
				m.position.z += dt * 22;
				if (m.position.z > 20) m.position.z -= 500;
			}
			this.scene.background.set(
				state.redZone ? 0x341d32 : biome === "solar" ? 0x382b57 : 0x132b3e,
			);
		} else this.scene.background.set(state.redZone ? 0x2b132c : 0x071321);
		if (this.corridor.visible)
			for (let i = 0; i < this.hoops.length; i++)
				this.hoops[i].position.z = 20 - ((i * 20 + t * 34) % 320);
		const warping = state.mode === "warp";
		this.warpLines.visible = warping || !!p.boost;
		if (this.warpLines.visible)
			for (const line of this.warpLines.children) {
				line.position.z = 14 - ((t * 130 - line.userData.base) % 210);
				line.scale.z = warping ? 2 : 1;
			}
		const seen = new Set();
		for (const kind of ["enemies", "shots", "objects", "particles"])
			for (const e of state[kind] || []) {
				if (e.collected || e.dead) continue;
				const id = `${kind}:${e.id}`;
				seen.add(id);
				const m = this.entities.get(id) || this.createEntity(e, kind);
				m.userData.mixer?.update(dt);
				m.position.set(e.x || 0, e.y || 0, e.z || 0);
				if (kind === "enemies") {
					m.rotation.z = Math.sin(t * 2 + (+e.id || 0)) * 0.16;
					m.rotation.x = Math.sin(t * 1.6) * 0.06;
					if (e.type === "boss" || e.type === "flagship") {
						m.rotation.z = Math.sin(t) * 0.07;
						const shield = m.getObjectByName("bossShield");
						if (shield) {
							shield.visible = !!e.shield;
							shield.scale.setScalar(1 + Math.sin(t * 6) * 0.018);
						}
					}
				}
				if (kind === "objects" && e.type !== "gate" && e.type !== "dock") {
					m.rotation.y = t * 0.7;
					m.rotation.z = Math.sin(t * 3) * 0.1;
				}
				if (kind === "particles") {
					m.scale.setScalar(Math.max(0.05, (e.life || 0.2) * 2));
					m.rotation.set(t * 3, t * 4, t);
				}
			}
		for (const [id, m] of this.entities)
			if (!seen.has(id)) {
				this.scene.remove(m);
				this.entities.delete(id);
				m.traverse((o) => {
					if (o.geometry) o.geometry.dispose();
				});
			}
		const shake = state.shake || 0;
		this.camera.position.set(
			Math.sin(t * 71) * shake,
			3 + Math.cos(t * 87) * shake,
			(this.cameraDistance || 16) +
				(warping ? Math.sin((state.warpProgress || 0) * Math.PI) * 2 : 0),
		);
		this.camera.lookAt(0, 0, -30);
		const record = this._activeRenderer;
		if (record && this._renderReady && !this._recovering && !this._busy) {
			this._busy = true;
			record.renderPromise = Promise.resolve()
				.then(() => {
					if (
						record === this._activeRenderer &&
						record.generation === this._rendererGeneration &&
						!record.retired
					) {
						return record.renderer.renderAsync(this.scene, this.camera);
					}
				})
				.catch((err) => {
					if (record !== this._activeRenderer || record.retired) return;
					if (record.renderer.backend.isWebGPUBackend && !record.forceWebGL) {
						this._recoverToWebGL(
							`WebGPU rendering: ${err.message || err}`,
							record,
						).catch(() => {});
					} else this.metadata.error = String(err);
				})
				.finally(() => {
					if (
						record === this._activeRenderer &&
						record.generation === this._rendererGeneration
					)
						this._busy = false;
				});
		}
		this.metadata.entityCount = this.entities.size;
	}
}
