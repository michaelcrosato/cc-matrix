import * as T from "three/webgpu";
import {
	box,
	C,
	carrier,
	cyl,
	flat,
	helicopter,
	jet,
	mat,
	mesh,
	pickup,
	sphere,
	truck,
} from "./assets.js";

function ridge(parent, points, color, z, depth = 3) {
	const shape = new T.Shape();
	points.forEach(([x, y], i) => {
		if (i) shape.lineTo(x, y);
		else shape.moveTo(x, y);
	});
	shape.closePath();
	const m = new T.Mesh(
		new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
		mat(color),
	);
	m.position.z = z;
	parent.add(m);
	return m;
}
export class View {
	constructor(canvas) {
		this.renderer = new T.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setClearColor(0xf6c17b);
		this.renderer.outputColorSpace = T.SRGBColorSpace;
		this.renderer.toneMapping = T.NoToneMapping;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = T.PCFShadowMap;
		this.scene = new T.Scene();
		this.scene.add(new T.HemisphereLight(0xfff3d0, 0xb47c71, 2.4));
		const sun = new T.DirectionalLight(0xffedc8, 3);
		sun.position.set(-35, 65, 45);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		Object.assign(sun.shadow.camera, {
			left: -70,
			right: 70,
			top: 60,
			bottom: -60,
			near: 1,
			far: 200,
		});
		sun.shadow.bias = -0.002;
		this.sunlight = sun;
		this.scene.add(sun);
		this.scene.add(sun.target);
		this.camera = new T.OrthographicCamera(-50, 50, 28, -28, 0.1, 400);
		this.cx = 0;
		this.cy = 21;
		this.camera.position.set(0, 26, 100);
		this.camera.lookAt(0, 21, 0);
		this.entities = new Map();
		this.effects = [];
		this.debris = new Map();
		this.time = 0;
		this.shake = 0;
		this.mode = "title";
		this.buildWorld();
		this.hero = helicopter(C.orange, "01");
		this.hero.position.set(24, 22, 4);
		this.hero.scale.setScalar(3.4);
		this.hero.rotation.set(0.08, -0.28, -0.075);
		this.scene.add(this.hero);
		this.titleTrucks = [];
		for (let i = 0; i < 5; i++) {
			const m = truck(i);
			m.position.set(2 + i * 15, 0, 0);
			this.scene.add(m);
			this.titleTrucks.push(m);
		}
		this.resize();
		addEventListener("resize", () => this.resize());
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 compatibility";
		await this.renderer.compileAsync(this.scene, this.camera);
		return this;
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h);
		this.aspect = w / h;
		this.setFrustum();
	}
	setFrustum() {
		const h = this.mode === "title" ? 56 : 55;
		const width = Math.max(66, h * this.aspect);
		this.camera.left = -width / 2;
		this.camera.right = width / 2;
		this.camera.top = width / this.aspect / 2;
		this.camera.bottom = -width / this.aspect / 2;
		this.camera.updateProjectionMatrix();
		this.visibleWidth = width;
		this.visibleHeight = width / this.aspect;
	}
	buildWorld() {
		const sky = document.createElement("canvas");
		sky.width = 8;
		sky.height = 512;
		const ctx = sky.getContext("2d"),
			gr = ctx.createLinearGradient(0, 0, 0, 512);
		gr.addColorStop(0, "#df795c");
		gr.addColorStop(0.5, "#f3b77d");
		gr.addColorStop(1, "#f8d897");
		ctx.fillStyle = gr;
		ctx.fillRect(0, 0, 8, 512);
		const tex = new T.CanvasTexture(sky);
		tex.colorSpace = T.SRGBColorSpace;
		const skyPlane = new T.Mesh(
			new T.PlaneGeometry(1400, 220),
			new T.MeshBasicNodeMaterial({ map: tex }),
		);
		skyPlane.position.set(0, 30, -125);
		this.scene.add(skyPlane);
		const sun = new T.Mesh(new T.CircleGeometry(13, 96), flat(0xffe3a0));
		sun.position.set(36, 27, -110);
		this.scene.add(sun);
		this.sun = sun;
		for (let i = 0; i < 5; i++) {
			const cut = new T.Mesh(
				new T.PlaneGeometry(30, 0.25 + i * 0.19),
				flat(0xf0b17b),
			);
			cut.position.set(36, 20 - i * 1.6, -109);
			this.scene.add(cut);
		}
		const rnd = (i) => {
			const a = Math.sin(i * 127.1 + 31.7) * 43758.5453;
			return a - Math.floor(a);
		};
		for (let i = 0; i < 17; i++) {
			const g = new T.Group();
			g.position.set(-230 + i * 30, 36 + rnd(i) * 12, -95);
			this.scene.add(g);
			for (let j = 0; j < 4; j++)
				sphere(
					g,
					[3 + rnd(i + j) * 5, 0.45 + rnd(i + j + 40) * 0.5, 0.6],
					0xffdfb0,
					[j * 3, Math.sin(j) * 0.5, 0],
					false,
				);
		}
		for (let layer = 0; layer < 3; layer++) {
			const z = -83 + layer * 24,
				col = [0xd69b80, 0xc47c64, 0xa8654f][layer];
			for (let i = 0; i < 11; i++) {
				const x = -250 + i * 48 + layer * 11,
					h = 9 + rnd(i + layer * 17) * 12,
					w = 22 + rnd(i + 6) * 16;
				ridge(
					this.scene,
					[
						[x - w, 0],
						[x - w * 0.7, 3],
						[x - w * 0.55, h * 0.52],
						[x - w * 0.23, h * 0.56],
						[x - w * 0.2, h],
						[x + w * 0.17, h],
						[x + w * 0.24, h * 0.7],
						[x + w * 0.5, h * 0.62],
						[x + w, 0],
					],
					col,
					z,
					6,
				);
				ridge(
					this.scene,
					[
						[x - w * 0.2, h],
						[x + w * 0.17, h],
						[x + w * 0.24, h * 0.7],
						[x + w * 0.5, h * 0.62],
						[x + w, 0],
						[x + 2, 0],
					],
					layer === 2 ? 0x8c574b : col,
					z + 0.03,
					6.1,
				);
				const band = new T.Mesh(
					new T.PlaneGeometry(w * 0.38, 0.18),
					flat(layer === 2 ? 0xe2aa74 : 0xe0b38a),
				);
				band.position.set(x, h * 0.65, z + 6.15);
				this.scene.add(band);
			}
		}
		box(this.scene, [700, 1, 80], 0xdba15e, [0, -0.65, -6], false);
		box(this.scene, [700, 0.16, 7.4], 0x776353, [0, -0.04, 0.1], false);
		for (let i = -35; i < 36; i++)
			box(this.scene, [3, 0.03, 0.13], C.paper, [i * 10, 0.06, 1], false);
		for (let i = -24; i < 25; i++) {
			const x = i * 15 + 3;
			const g = new T.Group();
			g.position.set(x, 0, -7 - rnd(i + 19) * 10);
			this.scene.add(g);
			const h = 1.6 + rnd(i + 80) * 2.5;
			cyl(g, 0.23, 0.28, h, 0x576e58, [0, h / 2, 0]);
			for (const side of [-1, 1]) {
				const arm = cyl(g, 0.16, 0.16, 0.9, 0x576e58, [
					side * 0.45,
					h * 0.6,
					0,
				]);
				arm.rotation.z = Math.PI / 2;
				cyl(g, 0.16, 0.16, h * 0.32, 0x576e58, [
					side * 0.83,
					h * 0.6 + h * 0.16,
					0,
				]);
			}
			if (i % 3 === 0) {
				const stone = mesh(
					this.scene,
					new T.DodecahedronGeometry(0.7),
					0xbc8050,
					[x + 6, 0.55, 5],
					[2.2, 1, 1.2],
				);
				stone.rotation.y = rnd(i) * 6;
			}
			if (i % 7 === 0) {
				box(this.scene, [0.13, 7, 0.14], C.ink, [x, 3.5, -12]);
				box(this.scene, [3, 0.12, 0.15], C.ink, [x, 6.5, -12]);
			}
		}
		// Thin contour lines and foreground scrub give the landscape a printed illustration edge.
		for (let i = -20; i < 21; i++) {
			box(
				this.scene,
				[8, 0.035, 0.07],
				0xb77b4b,
				[i * 18, 0, 6 + rnd(i + 9) * 3],
				false,
			);
		}
		this.dust = new T.Group();
		this.scene.add(this.dust);
		for (let i = 0; i < 48; i++) {
			const m = new T.Mesh(
				new T.PlaneGeometry(0.12 + rnd(i) * 0.3, 0.06),
				flat(0xffdf9d),
			);
			m.position.set((rnd(i + 42) - 0.5) * 180, rnd(i + 11) * 43, 7);
			this.dust.add(m);
		}
	}
	setMode(mode) {
		if (this.mode !== mode) {
			this.mode = mode;
			this.setFrustum();
		}
		const title = mode === "title";
		this.hero.visible = title;
		for (const t of this.titleTrucks) t.visible = title;
	}
	make(type, extra) {
		if (type === "pilot")
			return helicopter(
				[C.orange, C.mint, C.blue, C.yellow][extra % 4],
				String(extra + 1).padStart(2, "0"),
			);
		if (type === "heli") return helicopter(C.pink, "X");
		if (type === "jet") return jet();
		if (type === "boss") return carrier();
		if (type === "truck") return truck(extra);
		if (type === "repair" || type === "power") return pickup(type);
		if (type === "debris") {
			const g = new T.Group();
			box(g, [0.9, 0.35, 0.6], C.orange, [0, 0, 0]);
			return g;
		}
		if (type === "bullet") {
			const g = new T.Group();
			const m = sphere(g, [1, 0.12, 0.12], C.yellow, [0, 0, 0], false);
			m.material = flat(C.yellow);
			return g;
		}
		if (type === "split" || type === "missile") {
			const g = new T.Group();
			mesh(g, new T.OctahedronGeometry(type === "split" ? 0.65 : 0.35), C.pink);
			sphere(g, [1.0, 0.13, 0.13], C.paper, [-0.9, 0, 0], false);
			return g;
		}
		return new T.Group();
	}
	sync(game, dt) {
		this.setMode("game");
		const seen = new Set();
		for (const e of game.entities.values()) {
			if (e.dead) continue;
			seen.add(e.id);
			let m = this.entities.get(e.id);
			if (!m) {
				m = this.make(e.type, e.seat ?? e.index ?? 0);
				this.entities.set(e.id, m);
				this.scene.add(m);
			}
			m.position.set(e.x, e.y, e.type === "truck" ? 0 : 2);
			if (e.type === "debris" && e.body) m.quaternion.copy(e.body.rotation());
			if (e.type === "pilot" || e.type === "heli" || e.type === "jet") {
				m.rotation.y = e.dir > 0 ? -0.16 : Math.PI + 0.16;
				m.rotation.z =
					e.type === "jet"
						? Math.sin(game.time * 3 + e.id) * 0.035
						: Math.max(-0.14, Math.min(0.14, -(e.vx || 0) * 0.004));
				m.visible =
					!(e.respawn > 0) &&
					!(e.invul > 0 && Math.floor(game.time * 15) % 3 === 0);
				if (e.type === "pilot" && e.repairing) {
					if (Math.random() < dt * 18)
						this.particle(e.x, e.y - 1, C.mint, 0, -5, 0.45, 0.13);
				}
			} else if (
				e.type === "missile" ||
				e.type === "split" ||
				e.type === "bullet"
			)
				m.rotation.z = Math.atan2(e.vy || 0, e.vx || 1);
			if (e.type === "truck" && e.hp < 2 && Math.random() < dt * 8)
				this.particle(
					e.x,
					e.y + 3,
					C.ink,
					(Math.random() - 0.5) * 2,
					3,
					1.5,
					0.35,
				);
			m.userData.mixer?.update(dt);
		}
		for (const [id, m] of this.entities)
			if (!seen.has(id)) {
				this.scene.remove(m);
				this.entities.delete(id);
				m.userData.mixer?.stopAllAction();
			}
		const p =
			game.getPilot(game.cameraSeat ?? 0) || game.pilots.find((p) => !p.dead);
		const target = p?.x ?? 0;
		this.cx = T.MathUtils.damp(this.cx, target + (p?.dir || 1) * 7, 4, dt);
		this.cx = Math.max(-133, Math.min(133, this.cx));
		this.sun.position.x = this.cx * 0.78 + 36;
	}
	particle(x, y, color, vx, vy, life, size = 0.2) {
		const m = new T.Mesh(new T.IcosahedronGeometry(size, 0), flat(color));
		m.position.set(x, y, 4);
		this.scene.add(m);
		this.effects.push({ m, vx, vy, life, max: life });
	}
	explosion(x, y, big = false) {
		this.shake = Math.max(this.shake, big ? 1.2 : 0.45);
		const n = big ? 48 : 19;
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2,
				s = 3 + Math.random() * (big ? 18 : 10);
			this.particle(
				x,
				y,
				[C.orange, C.yellow, C.paper, C.ink][i % 4],
				Math.cos(a) * s,
				Math.sin(a) * s,
				0.3 + Math.random() * 0.6,
				0.15 + Math.random() * 0.4,
			);
		}
		const g = new T.Mesh(
			new T.RingGeometry(0.8, 1.05, 40),
			new T.MeshBasicNodeMaterial({
				color: C.paper,
				transparent: true,
				opacity: 0.95,
				side: T.DoubleSide,
			}),
		);
		g.position.set(x, y, 5);
		this.scene.add(g);
		this.effects.push({
			m: g,
			vx: 0,
			vy: 0,
			life: 0.45,
			max: 0.45,
			ring: true,
			big,
		});
	}
	flare(x, y) {
		const g = new T.Mesh(
			new T.RingGeometry(0.93, 1, 72),
			new T.MeshBasicNodeMaterial({
				color: C.mint,
				transparent: true,
				opacity: 0.85,
				side: T.DoubleSide,
			}),
		);
		g.position.set(x, y, 5);
		this.scene.add(g);
		this.effects.push({ m: g, life: 0.65, max: 0.65, ring: true, flare: true });
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			this.particle(
				x,
				y,
				C.paper,
				Math.cos(a) * 16,
				Math.sin(a) * 16,
				0.65,
				0.16,
			);
		}
	}
	update(dt) {
		this.time += dt;
		this.hero.userData.mixer.update(dt);
		this.hero.position.y = 22 + Math.sin(this.time * 0.8) * 0.6;
		for (const t of this.titleTrucks) t.userData.mixer.update(dt);
		if (this.mode === "title") {
			this.cx = T.MathUtils.damp(this.cx, 0, 3, dt);
			this.sun.position.x = 36;
		}
		for (const d of this.dust.children) {
			d.position.x -= dt * (this.mode === "title" ? 1.6 : 5);
			if (d.position.x < this.cx - 100) d.position.x = this.cx + 100;
		}
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const p = this.effects[i];
			p.life -= dt;
			if (p.life <= 0) {
				this.scene.remove(p.m);
				p.m.geometry.dispose();
				if (p.ring) p.m.material.dispose();
				this.effects.splice(i, 1);
				continue;
			}
			if (p.ring) {
				p.m.scale.setScalar(
					1 + (1 - p.life / p.max) * (p.flare ? 22 : p.big ? 16 : 7),
				);
				p.m.material.opacity = p.life / p.max;
			} else {
				p.m.position.x += p.vx * dt;
				p.m.position.y += p.vy * dt;
				p.vy -= dt * 7;
				p.m.rotation.z += dt * 5;
				p.m.scale.setScalar(Math.max(0.05, p.life / p.max));
			}
		}
		this.shake *= Math.exp(-dt * 12);
		const shake = window.__reduceMotion ? 0 : this.shake;
		const sx = (Math.random() - 0.5) * shake,
			sy = (Math.random() - 0.5) * shake;
		this.camera.position.set(this.cx + sx, 26 + sy, 100);
		this.camera.lookAt(this.cx + sx, 21 + sy, 0);
		this.sunlight.position.x = this.cx - 35;
		this.sunlight.target.position.x = this.cx;
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
	async probePixels() {
		const target = new T.RenderTarget(32, 32);
		const previous = this.renderer.getRenderTarget();
		try {
			this.renderer.setRenderTarget(target);
			this.renderer.render(this.scene, this.camera);
			const data = await this.renderer.readRenderTargetPixelsAsync(
				target,
				0,
				0,
				32,
				32,
			);
			const stride = this.renderer.backend.isWebGPUBackend ? 256 : 128;
			let sum = 0,
				min = 255,
				max = 0;
			for (let y = 0; y < 32; y++)
				for (let x = 0; x < 32; x++) {
					const i = y * stride + x * 4;
					sum += data[i] + data[i + 1] + data[i + 2];
					min = Math.min(min, data[i], data[i + 1], data[i + 2]);
					max = Math.max(max, data[i], data[i + 1], data[i + 2]);
				}
			return {
				min,
				max,
				mean: sum / (32 * 32 * 3),
				pixels: 1024,
				rowStride: stride,
				storageBytes: data.byteLength,
			};
		} finally {
			this.renderer.setRenderTarget(previous);
			target.dispose();
		}
	}
	screenToWorld(x, y) {
		const v = new T.Vector3(
			(x / innerWidth) * 2 - 1,
			1 - (y / innerHeight) * 2,
			0,
		);
		v.unproject(this.camera);
		return { x: v.x, y: v.y };
	}
	clear() {
		for (const m of this.entities.values()) this.scene.remove(m);
		this.entities.clear();
		for (const e of this.effects) this.scene.remove(e.m);
		this.effects.length = 0;
	}
}
