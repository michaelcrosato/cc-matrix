import { color, dot, float, floor, max, normalWorld, vec3 } from "three/tsl";
import * as T from "three/webgpu";

const INK = 0x07151d,
	TEAL = 0x80e0c4,
	CORAL = 0xff775c,
	PAPER = 0xeee9d5;
const cache = new Map();
function cel(hex) {
	if (cache.has(hex)) return cache.get(hex);
	const m = new T.MeshBasicNodeMaterial();
	const light = max(
		dot(normalWorld, vec3(-0.45, 0.7, 0.9).normalize()),
		float(0),
	);
	const band = floor(light.mul(3)).div(3).mul(0.64).add(0.36);
	m.colorNode = color(hex).mul(band);
	cache.set(hex, m);
	return m;
}
const flat = (c, opacity = 1) =>
	new T.MeshBasicMaterial({
		color: c,
		transparent: opacity < 1,
		opacity,
		depthWrite: opacity === 1,
	});
const ink = flat(INK);
function shape(points, depth) {
	const s = new T.Shape();
	s.moveTo(...points[0]);
	for (let i = 1; i < points.length; i++) s.lineTo(...points[i]);
	s.closePath();
	return new T.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}
function part(
	parent,
	geo,
	hex,
	x = 0,
	y = 0,
	z = 0,
	scale = null,
	outline = true,
) {
	const mesh = new T.Mesh(geo, cel(hex));
	mesh.position.set(x, y, z);
	if (scale) mesh.scale.set(...scale);
	parent.add(mesh);
	if (outline) {
		const shell = new T.Mesh(geo, ink);
		shell.material = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
		shell.scale.setScalar(1.065);
		mesh.add(shell);
	}
	return mesh;
}
const box = new T.BoxGeometry(1, 1, 1),
	ball = new T.IcosahedronGeometry(1, 1);

export class SpaceView {
	constructor(canvas, instruments) {
		this.canvas = canvas;
		this.hud = instruments;
		this.ctx = instruments.getContext("2d");
		this.scene = new T.Scene();
		this.scene.background = new T.Color(0x081923);
		this.scene.fog = new T.FogExp2(0x081923, 0.00065);
		this.camera = new T.PerspectiveCamera(64, 1, 0.1, 1800);
		this.camera.position.set(0, 0, 12);
		this.env = new T.Group();
		this.scene.add(this.env);
		this.actors = new T.Group();
		this.scene.add(this.actors);
		this.effects = [];
		this.mixers = [];
		this.projector = new T.Vector3();
		this.trailClock = 0;
		this.time = 0;
		this.sector = 0;
		this.flash = 0;
		this.warp = 0;
		this.makeSky();
		this.makeTitleShip();
	}
	async init() {
		const forceWebGL =
			new URLSearchParams(location.search).get("renderer") === "webgl";
		const options = {
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL,
		};
		try {
			if (!forceWebGL && navigator.gpu) {
				this.gpu = navigator.gpu;
				this.adapter = await this.gpu.requestAdapter({
					powerPreference: "high-performance",
				});
				if (this.adapter) {
					this.device = await this.adapter.requestDevice();
					options.device = this.device;
				}
			}
			this.renderer = new T.WebGPURenderer(options);
			await this.renderer.init();
		} catch (e) {
			this.replaceCanvas();
			this.renderer = new T.WebGPURenderer({
				canvas: this.canvas,
				antialias: true,
				forceWebGL: true,
			});
			await this.renderer.init();
		}
		this.backend = this.renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2";
		this.renderer.onDeviceLost = (info) => {
			this.lastDeviceLoss = info.message;
			if (this.backend === "WebGPU") this.recovery = this.recover();
		};
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
		this.renderer.setClearColor(0x081923);
		this.resize();
	}
	replaceCanvas() {
		const canvas = this.canvas.cloneNode(false);
		this.canvas.replaceWith(canvas);
		this.canvas = canvas;
	}
	async recover() {
		if (this.recovering) return;
		this.recovering = true;
		this.replaceCanvas();
		const previous = this.renderer;
		this.renderer = new T.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			forceWebGL: true,
		});
		await this.renderer.init();
		this.backend = "WebGL2";
		this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
		this.resize();
		this.recovering = false;
		try {
			previous.dispose();
		} catch {}
	}
	async pixels() {
		if (this.recovering) await this.recovery;
		const target = new T.RenderTarget(96, 64);
		this.renderer.setRenderTarget(target);
		this.renderer.render(this.scene, this.camera);
		const data = await this.renderer.readRenderTargetPixelsAsync(
			target,
			0,
			0,
			96,
			64,
		);
		this.renderer.setRenderTarget(null);
		target.dispose();
		let lo = 255,
			hi = 0,
			sum = 0,
			bright = 0;
		for (let i = 0; i < data.length; i += 4) {
			const v = Math.max(data[i], data[i + 1], data[i + 2]);
			lo = Math.min(lo, v);
			hi = Math.max(hi, v);
			sum += v;
			if (v > 70) bright++;
		}
		return {
			min: lo,
			max: hi,
			mean: sum / (data.length / 4),
			bright,
			backend: this.backend,
		};
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer?.setSize(w, h);
		const d = Math.min(devicePixelRatio || 1, 2);
		this.hud.width = w * d;
		this.hud.height = h * d;
		this.hud.style.width = w + "px";
		this.hud.style.height = h + "px";
		this.ctx.setTransform(d, 0, 0, d, 0, 0);
		this.width = w;
		this.height = h;
	}
	makeSky() {
		const n = 1700,
			coords = new Float32Array(n * 3),
			cols = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) {
			coords[i * 3] = (Math.random() - 0.5) * 1700;
			coords[i * 3 + 1] = (Math.random() - 0.5) * 950;
			coords[i * 3 + 2] = -40 - Math.random() * 1300;
			const c = new T.Color(i % 8 === 0 ? TEAL : i % 11 === 0 ? CORAL : PAPER);
			cols[i * 3] = c.r;
			cols[i * 3 + 1] = c.g;
			cols[i * 3 + 2] = c.b;
		}
		const geo = new T.BufferGeometry();
		geo.setAttribute("position", new T.BufferAttribute(coords, 3));
		geo.setAttribute("color", new T.BufferAttribute(cols, 3));
		this.stars = new T.Points(
			geo,
			new T.PointsMaterial({
				size: 1.05,
				sizeAttenuation: true,
				vertexColors: true,
				transparent: true,
				opacity: 0.85,
			}),
		);
		this.env.add(this.stars);
		this.planet = new T.Group();
		this.planet.position.set(118, 37, -267);
		this.env.add(this.planet);
		part(this.planet, new T.SphereGeometry(54, 64, 36), 0xec916b);
		const ring = new T.Group();
		ring.rotation.set(1.14, -0.2, 0.37);
		this.planet.add(ring);
		for (const [r, c, o] of [
			[70, 0x80e0c4, 1],
			[75, 0x315b5f, 1],
			[82, 0x80e0c4, 0.32],
			[65, 0xffbd86, 0.7],
		]) {
			const m = new T.Mesh(
				new T.TorusGeometry(r, r === 75 ? 2 : 0.5, 3, 160),
				flat(c, o),
			);
			ring.add(m);
		}
		const disc = new T.Mesh(
			new T.RingGeometry(65, 79, 160),
			new T.MeshBasicMaterial({
				color: 0x598a7a,
				side: T.DoubleSide,
				transparent: true,
				opacity: 0.2,
			}),
		);
		ring.add(disc);
		for (let j = 0; j < 13; j++) {
			const y = -45 + j * 7,
				r = Math.sqrt(54 * 54 - y * y) + 0.12;
			const band = new T.Mesh(
				new T.TorusGeometry(r, j % 3 === 0 ? 0.75 : 0.17, 3, 100),
				flat(j % 3 === 0 ? 0x874d45 : 0xf2b284, 0.65),
			);
			band.position.y = y;
			band.rotation.x = Math.PI / 2;
			this.planet.add(band);
		}
		for (let i = 0; i < 24; i++) {
			const lat = ((i * 2.399) % 5.8) - 2.9,
				ang = i * 1.618,
				yy = Math.sin(lat) * 48,
				rr = Math.sqrt(54 * 54 - yy * yy),
				x = Math.cos(ang) * rr,
				z = Math.sin(ang) * rr;
			const crater = new T.Mesh(
				new T.CircleGeometry(1.2 + (i % 4) * 1.1, 8),
				flat(i % 3 ? 0xc07459 : 0xf6b186, 0.7),
			);
			crater.position.set(x, yy, z);
			crater.lookAt(crater.position.clone().multiplyScalar(2));
			this.planet.add(crater);
		}
		const arc = new T.Mesh(
			new T.TorusGeometry(118, 0.12, 3, 180, Math.PI * 1.53),
			flat(TEAL, 0.2),
		);
		arc.position.set(111, 37, -275);
		arc.rotation.z = -0.3;
		this.env.add(arc);
		const moon = part(
			this.env,
			new T.IcosahedronGeometry(14, 3),
			0x3e7477,
			-99,
			55,
			-360,
		);
		moon.rotation.z = 0.6;
		this.dust = new T.Group();
		this.env.add(this.dust);
		for (let i = 0; i < 42; i++) {
			const a = part(
				this.dust,
				new T.IcosahedronGeometry(1.4 + (i % 4), 0),
				i % 3 ? 0x28434d : 0x596b68,
				(Math.random() - 0.5) * 280,
				(Math.random() - 0.5) * 120,
				-40 - Math.random() * 650,
			);
			a.rotation.set(Math.random() * 3, Math.random() * 3, 0);
		}
		this.terrain = this.makeTerrain();
		this.terrain.visible = false;
		this.env.add(this.terrain);
	}
	makeTerrain() {
		const group = new T.Group(),
			w = 560,
			d = 1600,
			nx = 48,
			nz = 150,
			verts = [],
			colors = [],
			idx = [];
		const palette = [
			new T.Color(0x205659),
			new T.Color(0x367370),
			new T.Color(0x8b9e80),
			new T.Color(0x11333f),
		];
		for (let z = 0; z <= nz; z++) {
			for (let x = 0; x <= nx; x++) {
				const px = (x / nx - 0.5) * w,
					pz = (-z / nz) * d + 120;
				const outside = Math.max(0, (Math.abs(px) - 14) / 70);
				let py =
					-24 +
					outside * 13 +
					(Math.sin(px * 0.062 + pz * 0.02) * 6 +
						Math.cos(px * 0.1 - pz * 0.037) * 4) *
						outside;
				py = Math.min(25, py);
				verts.push(px, py, pz);
				const c = palette[(x + Math.floor(z / 5)) % 4];
				colors.push(c.r, c.g, c.b);
			}
		}
		for (let z = 0; z < nz; z++)
			for (let x = 0; x < nx; x++) {
				const a = z * (nx + 1) + x,
					b = a + nx + 1;
				idx.push(a, b, a + 1, b, b + 1, a + 1);
			}
		const g = new T.BufferGeometry();
		g.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
		g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		const m = new T.MeshBasicMaterial({
			vertexColors: true,
			side: T.DoubleSide,
		});
		group.add(new T.Mesh(g, m));
		const wire = new T.LineSegments(
			new T.WireframeGeometry(g),
			new T.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.28 }),
		);
		group.add(wire);
		for (let i = 0; i < 18; i++) {
			const x = (i % 2 ? 1 : -1) * (28 + (i % 5) * 7),
				z = -i * 65;
			const spire = part(
				group,
				new T.CylinderGeometry(0, 4, 22 + (i % 3) * 12, 4),
				0x6c9c87,
				x,
				-4,
				z,
			);
			spire.rotation.y = i;
		}
		return group;
	}
	makeTitleShip() {
		this.titleShip = this.ship("player");
		this.titleShip.position.set(16, -5, -40);
		this.titleShip.scale.setScalar(3);
		this.titleShip.rotation.set(0.17, -0.25, -0.25);
		this.env.add(this.titleShip);
	}
	ship(type) {
		const g = new T.Group();
		const ally = type === "player" || type === "ghost";
		const c = ally ? 0x79bdaf : CORAL,
			c2 = ally ? PAPER : 0xc54648;
		const body = part(
			g,
			new T.ConeGeometry(1.35, 6, 4),
			c,
			0,
			0,
			0,
			[1, 0.95, 0.6],
		);
		body.rotation.x = -Math.PI / 2;
		body.rotation.y = Math.PI / 4;
		const wings = part(
			g,
			shape(
				[
					[-4, -0.3],
					[0, 1],
					[4, -0.3],
					[2, -1],
					[0, -0.2],
					[-2, -1],
				],
				0.23,
			),
			c2,
			0,
			-0.45,
			0.5,
		);
		wings.rotation.x = Math.PI / 2;
		part(g, box, INK, 0, 0.55, -0.7, [0.65, 0.25, 1.5], false);
		for (const x of [-1, 1]) {
			part(
				g,
				new T.CylinderGeometry(0.3, 0.42, 1.4, 6),
				0x31545b,
				x,
				-0.05,
				2.1,
			).rotation.x = Math.PI / 2;
			const eng = new T.Mesh(new T.ConeGeometry(0.3, 1.7, 6), flat(TEAL));
			eng.name = "engine" + (x < 0 ? "L" : "R");
			eng.position.set(x, -0.1, 3.2);
			eng.rotation.x = Math.PI / 2;
			g.add(eng);
		}
		const mixer = new T.AnimationMixer(g);
		const clip = new T.AnimationClip("Ion drive", 1, [
			new T.VectorKeyframeTrack(
				"engineL.scale",
				[0, 0.2, 0.5, 0.75, 1],
				[1, 1, 1, 1, 0.6, 1, 1, 1.4, 1, 1, 0.7, 1, 1, 1, 1],
			),
			new T.VectorKeyframeTrack(
				"engineR.scale",
				[0, 0.25, 0.6, 1],
				[1, 1.4, 1, 1, 0.6, 1, 1, 1.2, 1, 1, 1.4, 1],
			),
		]);
		mixer.clipAction(clip).play();
		g.userData.mixer = mixer;
		this.mixers.push(mixer);
		return g;
	}
	create(type) {
		let g = new T.Group();
		if (["scout", "ace", "bomber", "ghost"].includes(type)) {
			g = this.ship(type);
			if (type === "bomber") {
				g.scale.set(1.6, 1.5, 1.25);
				part(g, box, 0xc29b69, -2.4, -0.3, 1, [0.75, 0.75, 2]);
				part(g, box, 0xc29b69, 2.4, -0.3, 1, [0.75, 0.75, 2]);
			}
			if (type === "ace") {
				g.scale.setScalar(1.3);
				part(g, new T.TorusGeometry(2.3, 0.12, 4, 16), PAPER, 0, 0.2, 0.7);
			}
		} else if (type === "pod") {
			part(g, new T.CapsuleGeometry(0.8, 1.5, 3, 8), PAPER);
			part(g, box, 0x315f65, 0, 0.3, 0.75, [0.75, 0.65, 0.2]);
			part(g, box, TEAL, 0, 0.3, 0.89, [0.45, 0.4, 0.06], false);
			const ring = new T.Mesh(
				new T.TorusGeometry(2.2, 0.09, 4, 40),
				flat(TEAL),
			);
			ring.name = "beacon";
			g.add(ring);
			const m = new T.AnimationMixer(g);
			m.clipAction(
				new T.AnimationClip("Beacon spin", 3, [
					new T.NumberKeyframeTrack(
						"beacon.rotation[y]",
						[0, 1.5, 3],
						[0, Math.PI, Math.PI * 2],
					),
				]),
			).play();
			g.userData.mixer = m;
			this.mixers.push(m);
		} else if (type === "mine") {
			part(g, ball, 0x97727a);
			for (let i = 0; i < 6; i++) {
				const p = part(g, new T.ConeGeometry(0.22, 1.2, 4), CORAL);
				const a = (i * Math.PI) / 3;
				p.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0);
				p.rotation.z = a - Math.PI / 2;
			}
			part(g, ball, CORAL, 0, 0, 1, [0.3, 0.3, 0.3], false);
		} else if (type === "gate") {
			const ring = part(g, new T.TorusGeometry(6, 0.35, 4, 64), TEAL);
			ring.name = "gate";
			const rim = new T.Mesh(
				new T.TorusGeometry(7.1, 0.07, 3, 64),
				flat(TEAL, 0.5),
			);
			g.add(rim);
			for (let j = 0; j < 4; j++) {
				const a = (j * Math.PI) / 2;
				const p = part(
					g,
					box,
					PAPER,
					Math.cos(a) * 6,
					Math.sin(a) * 6,
					0,
					[0.8, 1.4, 0.6],
				);
				p.rotation.z = a;
			}
			const m = new T.AnimationMixer(g);
			m.clipAction(
				new T.AnimationClip("Navigation halo", 6, [
					new T.NumberKeyframeTrack(
						"gate.rotation[z]",
						[0, 3, 6],
						[0, Math.PI, Math.PI * 2],
					),
				]),
			).play();
			g.userData.mixer = m;
			this.mixers.push(m);
		} else if (type === "station") {
			part(
				g,
				new T.CylinderGeometry(8, 8, 3, 8),
				0x628477,
				0,
				0,
				0,
			).rotation.x = Math.PI / 2;
			const ring = part(g, new T.TorusGeometry(11, 1.3, 4, 8), PAPER);
			ring.name = "dockring";
			part(g, new T.TorusGeometry(6.8, 0.22, 4, 64), TEAL, 0, 0, 3);
			for (const x of [-1, 1]) {
				part(g, box, 0x305860, x * 14, 0, -4, [11, 1.2, 7]);
				for (let j = 0; j < 5; j++)
					part(
						g,
						box,
						0x80b4a3,
						x * (10 + j * 2),
						0.7,
						-4,
						[0.1, 0.1, 6],
						false,
					);
			}
			const m = new T.AnimationMixer(g);
			m.clipAction(
				new T.AnimationClip("Anchorage rotor", 14, [
					new T.NumberKeyframeTrack(
						"dockring.rotation[z]",
						[0, 7, 14],
						[0, Math.PI, Math.PI * 2],
					),
				]),
			).play();
			g.userData.mixer = m;
			this.mixers.push(m);
		} else if (type === "boss") {
			part(
				g,
				new T.ConeGeometry(16, 48, 6),
				0xa84245,
				0,
				0,
				0,
				[1, 1, 0.55],
			).rotation.x = -Math.PI / 2;
			part(g, box, 0x512e3d, 0, 0, 4, [16, 9, 30]);
			for (const x of [-1, 1]) {
				const p = part(
					g,
					shape(
						[
							[-2, -12],
							[2, -16],
							[5, 12],
							[-3, 7],
						],
						4,
					),
					CORAL,
					x * 17,
					0,
					5,
					[x, 1, 1],
				);
				p.rotation.x = Math.PI / 2;
				part(
					g,
					new T.ConeGeometry(2.5, 10, 6),
					TEAL,
					x * 11,
					0,
					24,
				).rotation.x = Math.PI / 2;
			}
			for (let i = 0; i < 6; i++)
				part(
					g,
					box,
					0xe08c73,
					(i % 2 ? 1 : -1) * 5,
					(Math.floor(i / 2) - 1) * 2,
					21,
					[1.6, 0.5, 0.3],
					false,
				);
		} else if (type === "relay" || type === "core") {
			part(
				g,
				new T.IcosahedronGeometry(type === "core" ? 4.7 : 2.3, 1),
				type === "core" ? 0xffb67c : TEAL,
			);
			if (type === "core") {
				const shield = new T.Mesh(
					new T.IcosahedronGeometry(6.2, 2),
					new T.MeshBasicMaterial({
						color: TEAL,
						wireframe: true,
						transparent: true,
						opacity: 0.3,
					}),
				);
				shield.name = "shield";
				g.add(shield);
			}
			const r = part(
				g,
				new T.TorusGeometry(type === "core" ? 6 : 3.1, 0.16, 4, 32),
				type === "core" ? PAPER : CORAL,
			);
			r.name = "reactor";
			const m = new T.AnimationMixer(g);
			m.clipAction(
				new T.AnimationClip("Reactor orbit", 2, [
					new T.NumberKeyframeTrack(
						"reactor.rotation[y]",
						[0, 1, 2],
						[0, Math.PI, Math.PI * 2],
					),
					new T.NumberKeyframeTrack(
						"reactor.rotation[z]",
						[0, 2],
						[0, -Math.PI * 2],
					),
				]),
			).play();
			g.userData.mixer = m;
			this.mixers.push(m);
		} else if (type === "rock") {
			part(g, new T.IcosahedronGeometry(2.5, 0), 0x697d77);
			g.rotation.set(Math.random() * 3, Math.random() * 3, 0);
		} else if (type === "laser" || type === "hostile") {
			const c = type === "laser" ? TEAL : CORAL;
			const m = new T.Mesh(
				new T.CylinderGeometry(
					type === "laser" ? 0.055 : 0.15,
					type === "laser" ? 0.055 : 0.15,
					type === "laser" ? 3 : 1.1,
					4,
				),
				flat(c),
			);
			m.rotation.x = Math.PI / 2;
			g.add(m);
			const glow = m.clone();
			glow.material = flat(c, 0.2);
			glow.scale.set(3, 1.05, 3);
			g.add(glow);
		} else if (type === "debris") {
			part(g, box, CORAL, 0, 0, 0, [0.4, 0.4, 0.8]);
		}
		g.userData.type = type;
		this.actors.add(g);
		return g;
	}
	remove(mesh) {
		if (!mesh) return;
		this.actors.remove(mesh);
		if (mesh.userData.mixer) {
			mesh.userData.mixer.stopAllAction();
			mesh.userData.mixer.uncacheRoot(mesh);
			this.mixers = this.mixers.filter((x) => x !== mesh.userData.mixer);
		}
		const geometries = new Set(),
			materials = new Set();
		mesh.traverse((o) => {
			if (o.geometry && o.geometry !== box && o.geometry !== ball)
				geometries.add(o.geometry);
			if (
				o.material &&
				!Array.isArray(o.material) &&
				o.material !== ink &&
				![...cache.values()].includes(o.material)
			)
				materials.add(o.material);
		});
		geometries.forEach((g) => {
			g.dispose();
		});
		materials.forEach((m) => {
			m.dispose();
		});
	}
	reset(sector) {
		for (const obj of [...this.actors.children]) this.remove(obj);
		this.effects = [];
		this.sector = sector;
		this.terrain.visible = sector === 1;
		this.planet.position.set(
			sector === 1 ? 110 : 118,
			sector === 1 ? 78 : 37,
			sector === 1 ? -370 : -267,
		);
		this.planet.scale.setScalar(sector === 1 ? 1.7 : 1);
		this.titleShip.visible = false;
		this.scene.background.set(
			sector === 1 ? 0x132d37 : sector === 4 ? 0x1c1627 : 0x081923,
		);
		this.scene.fog.color.copy(this.scene.background);
	}
	explosion(x, y, z, big = false) {
		const m = new T.Mesh(
			new T.IcosahedronGeometry(1, 1),
			flat(big ? PAPER : 0xffab72, 0.8),
		);
		m.position.set(x, y, z);
		this.actors.add(m);
		this.effects.push({
			mesh: m,
			life: big ? 1.2 : 0.45,
			max: big ? 1.2 : 0.45,
			kind: "burst",
			size: big ? 22 : 7,
		});
		const r = new T.Mesh(
			new T.TorusGeometry(1, 0.035, 3, 48),
			flat(big ? TEAL : CORAL, 0.7),
		);
		r.position.set(x, y, z);
		this.actors.add(r);
		this.effects.push({
			mesh: r,
			life: big ? 1.4 : 0.65,
			max: big ? 1.4 : 0.65,
			kind: "ring",
			size: big ? 45 : 12,
		});
	}
	pulse(x, y) {
		const r = new T.Mesh(new T.TorusGeometry(1, 0.03, 4, 96), flat(TEAL, 0.9));
		r.position.set(x, y, -12);
		this.actors.add(r);
		this.effects.push({
			mesh: r,
			life: 0.7,
			max: 0.7,
			kind: "pulse",
			size: 90,
		});
	}
	recovery(x, y, z) {
		for (let i = 0; i < 2; i++) {
			const r = new T.Mesh(
				new T.TorusGeometry(1, 0.035, 4, 48),
				flat(i ? PAPER : TEAL, 0.9),
			);
			r.position.set(x, y, z - i * 0.5);
			this.actors.add(r);
			this.effects.push({
				mesh: r,
				life: 0.75,
				max: 0.75,
				kind: "ring",
				size: 10 + i * 4,
			});
		}
	}
	beam(from, to) {
		if (!this.tractor) {
			this.tractor = new T.Mesh(
				new T.CylinderGeometry(0.02, 0.02, 1, 6),
				flat(TEAL, 0.6),
			);
			this.scene.add(this.tractor);
		}
		const p = new T.Vector3(from.x, from.y, from.z),
			q = new T.Vector3(to.x, to.y, to.z);
		this.tractor.position.copy(p).lerp(q, 0.5);
		this.tractor.scale.y = p.distanceTo(q);
		this.tractor.quaternion.setFromUnitVectors(
			new T.Vector3(0, 1, 0),
			q.sub(p).normalize(),
		);
		this.tractor.visible = true;
	}
	project(p) {
		this.projector.set(p.x, p.y, p.z).project(this.camera);
		return {
			x: (this.projector.x * 0.5 + 0.5) * this.width,
			y: (-0.5 * this.projector.y + 0.5) * this.height,
			visible: this.projector.z < 1 && this.projector.z > -1,
			nx: this.projector.x,
			ny: this.projector.y,
		};
	}
	aimPoint(nx, ny, z = -100) {
		const v = new T.Vector3(nx, ny, 0.5)
			.unproject(this.camera)
			.sub(this.camera.position)
			.normalize();
		const t = (z - this.camera.position.z) / v.z;
		return this.camera.position.clone().addScaledVector(v, t);
	}
	update(dt, state) {
		this.time += dt;
		const title = state.screen === "title" || state.screen === "wing";
		this.titleShip.visible = title;
		this.titleShip.position.set(
			16 + Math.sin(this.time * 0.16) * 2,
			-5 + Math.sin(this.time * 0.3),
			-40,
		);
		this.titleShip.rotation.y = -0.3 + Math.sin(this.time * 0.13) * 0.14;
		this.titleShip.rotation.z = -0.22 + Math.sin(this.time * 0.25) * 0.1;
		const playing = state.screen === "playing";
		const flow = playing ? state.flow : 2;
		this.planet.rotation.y += dt * 0.006;
		this.stars.rotation.z = Math.sin(this.time * 0.018) * 0.025;
		this.dust.position.z = (this.time * flow * 0.15) % 160;
		this.terrain.position.z = (state.elapsed * flow) % 150;
		for (const m of this.mixers) m.update(dt);
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const e = this.effects[i];
			e.life -= dt;
			const p = 1 - e.life / e.max;
			e.mesh.scale.setScalar(0.5 + p * e.size);
			e.mesh.material.opacity = Math.max(0, (1 - p) * 0.8);
			if (e.kind === "pulse") e.mesh.position.z -= dt * 100;
			if (e.life <= 0) {
				this.actors.remove(e.mesh);
				e.mesh.geometry.dispose();
				e.mesh.material.dispose();
				this.effects.splice(i, 1);
			}
		}
		const p = state.player;
		this.camera.position.lerp(
			new T.Vector3(playing ? p.x : 0, playing ? p.y + 1 : 0, 12),
			1 - Math.exp(-dt * 12),
		);
		this.camera.rotation.set(
			(playing && state.motion !== false ? state.aim.y : 0) * 0.018,
			(playing && state.motion !== false ? -state.aim.x : 0) * 0.018,
			playing ? -state.moveX * 0.027 : 0,
		);
		this.camera.fov = T.MathUtils.lerp(
			this.camera.fov,
			playing && state.boost && state.motion !== false ? 72 : 64,
			dt * 4,
		);
		this.camera.updateProjectionMatrix();
		if (this.tractor) this.tractor.visible = !!state.tractoring;
		if (!this.recovering) this.renderer.render(this.scene, this.camera);
		this.drawInstruments(state);
	}
	drawInstruments(s) {
		const c = this.ctx,
			w = this.width,
			h = this.height;
		c.clearRect(0, 0, w, h);
		if (!["playing", "paused", "dev"].includes(s.screen) || s.touch) return;
		const u = w / 1440,
			base = h * 0.946,
			inkColor = "#06131bdc";
		c.save();
		c.lineWidth = 2;
		c.strokeStyle = "#304c50";
		c.fillStyle = inkColor;
		c.beginPath();
		c.moveTo(0, h);
		c.lineTo(0, h * 0.83);
		c.lineTo(w * 0.16, h * 0.865);
		c.lineTo(w * 0.25, base);
		c.lineTo(w * 0.385, base);
		c.lineTo(w * 0.415, h * 0.965);
		c.lineTo(w * 0.585, h * 0.965);
		c.lineTo(w * 0.615, base);
		c.lineTo(w * 0.75, base);
		c.lineTo(w * 0.84, h * 0.865);
		c.lineTo(w, h * 0.83);
		c.lineTo(w, h);
		c.closePath();
		c.fill();
		c.stroke();
		// Etched canopy rails.
		c.lineWidth = 5 * u;
		c.strokeStyle = "#06151c";
		for (const sign of [-1, 1]) {
			c.beginPath();
			c.moveTo(w / 2 + sign * w * 0.495, h * 0.97);
			c.lineTo(w / 2 + sign * w * 0.41, h * 0.66);
			c.lineTo(w / 2 + sign * w * 0.485, h * 0.16);
			c.stroke();
			c.lineWidth = u;
			c.strokeStyle = "#48645e70";
			c.stroke();
			c.lineWidth = 5 * u;
			c.strokeStyle = "#06151c";
		}
		c.font = `${9 * u}px monospace`;
		c.fillStyle = "#739d90";
		c.fillText("S T O W A W A Y  /  0 7", w * 0.035, h * 0.974);
		c.textAlign = "right";
		c.fillText(
			"ION DRIVE · " + Math.round(s.flow * 140) + " KM/S",
			w * 0.965,
			h * 0.974,
		);
		c.textAlign = "center";
		c.fillStyle = "#80e0c480";
		c.fillText("— FRONTIER RESCUE DIVISION —", w * 0.5, h * 0.987);
		// Shallow tactical radar in the lower canopy.
		const rx = w * 0.295,
			ry = h * 0.967,
			rw = w * 0.07;
		c.strokeStyle = "#80e0c433";
		c.lineWidth = 0.7;
		c.beginPath();
		c.ellipse(rx, ry, rw, rw * 0.18, 0, 0, Math.PI * 2);
		c.stroke();
		c.beginPath();
		c.moveTo(rx - rw, ry);
		c.lineTo(rx + rw, ry);
		c.moveTo(rx, ry - rw * 0.18);
		c.lineTo(rx, ry + rw * 0.18);
		c.stroke();
		for (const e of s.entities || []) {
			if (!e.alive || e.z > 8 || e.type === "laser" || e.type === "hostile")
				continue;
			c.fillStyle =
				e.type === "pod" || e.type === "gate" ? "#80e0c4" : "#ff775c";
			c.fillRect(rx + e.x * 0.9 * u, ry + e.z * 0.08 * u, 2 * u, 2 * u);
		}
		c.restore();
	}
}

export { T };
