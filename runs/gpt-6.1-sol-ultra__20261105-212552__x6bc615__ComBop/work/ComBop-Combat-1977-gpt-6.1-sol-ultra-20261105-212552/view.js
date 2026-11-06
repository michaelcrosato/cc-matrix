import * as THREE from "three/webgpu";
import { MAPS } from "./sim.js";

const INK = 0x193b3c,
	CREAM = 0xf4eedc,
	TEAL = 0x148f89,
	CORAL = 0xec6847;
const rand = (a, b) => a + Math.random() * (b - a);
export class GameView {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(CREAM);
		this.scene.fog = new THREE.Fog(CREAM, 58, 105);
		this.camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 150);
		this.renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			powerPreference: "high-performance",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.NoToneMapping;
		this.materials = new Map();
		this.gradient = new THREE.DataTexture(
			new Uint8Array([72, 72, 72, 255, 170, 170, 170, 255, 255, 255, 255, 255]),
			3,
			1,
			THREE.RGBAFormat,
		);
		this.gradient.minFilter = this.gradient.magFilter = THREE.NearestFilter;
		this.gradient.needsUpdate = true;
		this.scene.add(new THREE.AmbientLight(0xfff8df, 1.2));
		const sun = new THREE.DirectionalLight(0xfff7dd, 1.6);
		sun.position.set(-10, 24, 10);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		Object.assign(sun.shadow.camera, {
			left: -25,
			right: 25,
			top: 25,
			bottom: -25,
			near: 1,
			far: 65,
		});
		sun.shadow.bias = -0.001;
		sun.shadow.normalBias = 0.03;
		this.scene.add(sun);
		this.scene.add(new THREE.HemisphereLight(0xa3e7df, 0xaea377, 0.45));
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.effects = [];
		this.bulletMeshes = new Map();
		this.pickMeshes = new Map();
		this.elapsed = 0;
		this.shake = 0;
		this.title = true;
		this.raycaster = new THREE.Raycaster();
		this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.55);
		this.aimLines = [];
		this.aimMaterial = new THREE.LineDashedMaterial({
			color: 0x365f58,
			dashSize: 0.22,
			gapSize: 0.16,
			transparent: true,
			opacity: 0.5,
		});
		this.bankMaterial = new THREE.LineDashedMaterial({
			color: 0xd99a37,
			dashSize: 0.22,
			gapSize: 0.16,
			transparent: true,
			opacity: 0.5,
		});
		this.aimRingMaterial = new THREE.MeshBasicMaterial({
			color: 0xd18f31,
			side: THREE.DoubleSide,
		});
		this.makeBackground();
		this.resize();
		window.addEventListener("resize", () => this.resize());
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL2 fallback";
		return this;
	}
	mat(color, transparent = false) {
		const key = `${color}/${transparent}`;
		if (!this.materials.has(key))
			this.materials.set(
				key,
				new THREE.MeshToonMaterial({
					color,
					gradientMap: this.gradient,
					transparent,
					opacity: 1,
				}),
			);
		return this.materials.get(key);
	}
	mesh(geo, color, parent, x = 0, y = 0, z = 0, outline = true) {
		const m = new THREE.Mesh(geo, this.mat(color));
		m.position.set(x, y, z);
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		if (outline) {
			const edge = new THREE.LineSegments(
				new THREE.EdgesGeometry(geo, 28),
				new THREE.LineBasicMaterial({ color: INK }),
			);
			m.add(edge);
		}
		return m;
	}
	box(w, h, d, color, parent, x = 0, y = 0, z = 0, outline = true) {
		return this.mesh(
			new THREE.BoxGeometry(w, h, d),
			color,
			parent,
			x,
			y,
			z,
			outline,
		);
	}
	cylinder(r, h, color, parent, x = 0, y = 0, z = 0, sides = 12) {
		return this.mesh(
			new THREE.CylinderGeometry(r, r, h, sides),
			color,
			parent,
			x,
			y,
			z,
		);
	}
	line(points, color = INK, parent = this.root) {
		const g = new THREE.BufferGeometry().setFromPoints(
			points.map((p) => new THREE.Vector3(...p)),
		);
		const l = new THREE.Line(
			g,
			new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }),
		);
		parent.add(l);
		return l;
	}
	label(text, w, h, color = INK, bg = null, size = 100) {
		const c = document.createElement("canvas");
		c.width = 1024;
		c.height = 256;
		const ctx = c.getContext("2d");
		if (bg) {
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, 1024, 256);
		}
		ctx.fillStyle = "#" + new THREE.Color(color).getHexString();
		ctx.font = `900 ${size}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, 512, 128);
		const texture = new THREE.CanvasTexture(c);
		texture.colorSpace = THREE.SRGBColorSpace;
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				depthWrite: false,
			}),
		);
		m.rotation.x = -Math.PI / 2;
		return m;
	}
	makeBackground() {
		const bg = new THREE.Group();
		this.scene.add(bg);
		for (let i = -6; i <= 6; i++) {
			const pts = [];
			for (let j = 0; j < 100; j++) {
				const a = (j / 99) * Math.PI * 2;
				const r = 25 + i * 2 + Math.sin(a * 3 + i) * 1.2;
				pts.push([Math.cos(a) * r, -1.6, Math.sin(a) * r * 0.7]);
			}
			this.line(pts, 0xb2c2ad, bg);
		}
		for (let i = 0; i < 12; i++) {
			const x = -36 + i * 6;
			this.line(
				[
					[x, -1.7, -35],
					[x, -1.7, 35],
				],
				0xdcdac4,
				bg,
			);
		}
		this.bg = bg;
	}
	build(round = 0) {
		if (this.level) {
			this.root.remove(this.level);
			this.level.traverse((o) => {
				if (o.geometry) o.geometry.dispose();
			});
		}
		for (const b of this.bulletMeshes.values()) this.root.remove(b);
		for (const p of this.pickMeshes.values()) this.root.remove(p);
		this.bulletMeshes.clear();
		this.pickMeshes.clear();
		for (const fx of this.effects) this.root.remove(fx.mesh);
		this.effects = [];
		this.round = round;
		this.level = new THREE.Group();
		this.root.add(this.level);
		const map = MAPS[round];
		this.box(31, 1, 21, INK, this.level, 0, -0.82, 0);
		this.box(31.2, 0.45, 21.2, 0xc0b99b, this.level, 0, -0.4, 0);
		this.box(30.8, 0.23, 20.8, CREAM, this.level, 0, -0.12, 0);
		this.box(28, 0.07, 18, map.floor, this.level, 0, 0.025, 0);
		this.box(28, 0.03, 0.055, 0xbaa981, this.level, 0, 0.08, 0, false);
		for (let x = -12; x < 14; x += 2)
			for (let z = -8; z < 9; z += 2)
				this.cylinder(0.018, 0.02, 0xa9a383, this.level, x, 0.075, z, 5);
		for (const x of [-13.45, 13.45])
			for (const z of [-8.45, 8.45]) {
				this.line(
					[
						[x - Math.sign(x) * 1, 0.09, z],
						[x, 0.09, z],
						[x, 0.09, z - Math.sign(z) * 1],
					],
					0x7e8c73,
					this.level,
				);
			}
		const t = this.label(map.short, 13, 0.8, INK);
		t.position.set(0, 0.04, 10);
		this.level.add(t);
		const t2 = this.label(
			"COMBOP  /  " + String(round + 1).padStart(2, "0") + "  /  INK & ARMOUR",
			10,
			0.65,
			INK,
		);
		t2.position.set(0, 0.045, -10);
		this.level.add(t2);
		this.obstacleMeshes = [];
		const entries = [
			[-14.3, 0, 0.6, 19.2, "boundary"],
			[14.3, 0, 0.6, 19.2, "boundary"],
			[0, -9.3, 28, 0.6, "boundary"],
			[0, 9.3, 28, 0.6, "boundary"],
			...map.walls.map((w) => [...w, "wall"]),
			...map.crates.map(([x, z]) => [x, z, 1.3, 1.3, "crate"]),
			...map.barrels.map(([x, z]) => [x, z, 0.7, 0.7, "barrel"]),
		];
		for (const [x, z, w, d, type] of entries) {
			const g = new THREE.Group();
			g.position.set(x, 0, z);
			this.level.add(g);
			if (type === "wall" || type === "boundary") {
				const h = type === "boundary" ? 0.55 : 1.3;
				this.box(w + 0.1, 0.12, d + 0.1, INK, g, 0, 0.09, 0);
				this.box(
					w,
					h,
					d,
					type === "boundary" ? 0xa7b8a0 : 0xc6c3a5,
					g,
					0,
					h / 2 + 0.12,
					0,
				);
				this.box(w + 0.02, 0.13, d + 0.02, map.accent, g, 0, h + 0.13, 0);
				if (w > d) {
					for (let a = -w / 2 + 0.3; a < w / 2; a += 1.1)
						this.box(0.09, 0.025, d * 0.7, 0xf3d17a, g, a, h + 0.21, 0, false);
					for (let a = -w / 2 + 1; a < w / 2; a += 1.7)
						this.line(
							[
								[a, 0.15, d / 2 + 0.01],
								[a, h * 0.65, d / 2 + 0.01],
							],
							0x7e8a78,
							g,
						);
				} else {
					for (let a = -d / 2 + 0.3; a < d / 2; a += 1.1)
						this.box(w * 0.7, 0.025, 0.09, 0xf3d17a, g, 0, h + 0.21, a, false);
					for (let a = -d / 2 + 1; a < d / 2; a += 1.7)
						this.line(
							[
								[w / 2 + 0.01, 0.15, a],
								[w / 2 + 0.01, h * 0.65, a],
							],
							0x7e8a78,
							g,
						);
				}
			} else if (type === "crate") {
				this.box(1.3, 0.9, 1.3, 0xe9b64f, g, 0, 0.48, 0);
				this.box(1.38, 0.13, 1.38, 0xf6d987, g, 0, 0.85, 0);
				for (const xx of [-0.44, 0.44])
					this.box(0.11, 0.94, 1.33, 0xaf7c35, g, xx, 0.5, 0);
				this.box(1.33, 0.1, 1.33, 0xaf7c35, g, 0, 0.27, 0);
				const tag = this.label("×", 0.7, 0.7, INK);
				tag.position.y = 0.94;
				g.add(tag);
			} else {
				this.cylinder(0.37, 0.95, CORAL, g, 0, 0.5, 0, 10);
				for (const yy of [0.25, 0.74])
					this.cylinder(0.38, 0.1, CREAM, g, 0, yy, 0, 10);
				this.cylinder(0.15, 0.09, INK, g, 0.1, 1, 0, 8);
				const tag = this.label("!", 0.5, 0.5, CREAM);
				tag.position.y = 0.995;
				g.add(tag);
			}
			this.obstacleMeshes.push(g);
		}
		this.tankViews = [this.makeTank(0), this.makeTank(1)];
		this.makeSetDressing(map);
		this.aimGroup = new THREE.Group();
		this.level.add(this.aimGroup);
		this.zoneGroup = new THREE.Group();
		this.level.add(this.zoneGroup);
		this.buildZone(17);
	}
	makeTank(i) {
		const color = i ? CORAL : TEAL,
			g = new THREE.Group();
		this.level.add(g);
		const hull = new THREE.Group();
		hull.name = "hull";
		g.add(hull);
		const wheels = [];
		for (const x of [-0.56, 0.56]) {
			this.box(0.3, 0.4, 1.6, INK, hull, x, 0.35, 0);
			this.box(0.32, 0.12, 1.55, 0x58746a, hull, x, 0.6, 0);
			for (let j = 0; j < 5; j++) {
				const m = this.cylinder(
					0.17,
					0.32,
					0x9da58c,
					hull,
					x,
					0.32,
					-0.59 + j * 0.295,
					10,
				);
				m.rotation.z = Math.PI / 2;
				m.name = `wheel${wheels.length}`;
				wheels.push(m);
				this.box(
					0.335,
					0.045,
					0.09,
					0x9da58c,
					hull,
					x,
					0.66,
					-0.62 + j * 0.3,
					false,
				);
			}
		}
		this.box(1.02, 0.37, 1.42, color, hull, 0, 0.59, 0);
		this.box(0.83, 0.14, 1.18, color, hull, 0, 0.85, 0);
		for (const x of [-0.34, 0.34])
			this.cylinder(0.065, 0.025, CREAM, hull, x, 0.94, -0.39, 6);
		const turret = new THREE.Group();
		turret.position.y = 0.92;
		g.add(turret);
		this.cylinder(0.43, 0.29, color, turret, 0, 0.12, 0, 8);
		this.cylinder(0.23, 0.075, CREAM, turret, 0, 0.32, -0.06, 12);
		this.box(0.15, 0.04, 0.22, INK, turret, 0, 0.375, -0.06);
		const barrel = this.box(0.17, 0.17, 1.12, color, turret, 0, 0.15, 0.7);
		barrel.name = "barrel";
		this.box(0.25, 0.24, 0.22, INK, barrel, 0, 0, 0.48);
		this.box(0.14, 0.13, 0.03, 0x78877a, barrel, 0, 0, 0.6, false);
		const flash = this.mesh(
			new THREE.IcosahedronGeometry(0.22, 0),
			0xffe095,
			turret,
			0,
			0.15,
			1.45,
			false,
		);
		flash.visible = false;
		const antenna = new THREE.Group();
		antenna.name = "antenna";
		antenna.position.set(0.35, 0.9, -0.45);
		hull.add(antenna);
		this.cylinder(0.018, 0.73, INK, antenna, 0, 0.36, 0, 5);
		this.mesh(
			new THREE.SphereGeometry(0.052, 6, 6),
			color,
			antenna,
			0,
			0.73,
			0,
		);
		this.box(0.32, 0.35, 0.2, 0x9d9d76, hull, -0.28, 0.8, -0.73);
		const badge = this.label(i ? "02" : "01", 0.4, 0.3, CREAM);
		badge.position.set(0, 0.795, -0.5);
		hull.add(badge);
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.78, 0.83, 40),
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.6,
				side: THREE.DoubleSide,
				depthWrite: false,
			}),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.07;
		g.add(ring);
		const shield = new THREE.Mesh(
			new THREE.SphereGeometry(0.98, 16, 12),
			new THREE.MeshBasicMaterial({
				color: CREAM,
				transparent: true,
				opacity: 0.15,
				wireframe: true,
				depthWrite: false,
			}),
		);
		shield.position.y = 0.55;
		g.add(shield);
		const mixer = new THREE.AnimationMixer(hull);
		const wheelTracks = wheels.map(
			(w) =>
				new THREE.NumberKeyframeTrack(
					`${w.name}.rotation[x]`,
					[0, 1],
					[0, Math.PI * 2],
				),
		);
		const trackAction = mixer.clipAction(
			new THREE.AnimationClip("Treads", 1, wheelTracks),
		);
		trackAction.play();
		const idle = mixer.clipAction(
			new THREE.AnimationClip("Radio wobble", 2, [
				new THREE.NumberKeyframeTrack(
					"antenna.rotation[z]",
					[0, 0.5, 1, 1.5, 2],
					[0, 0.08, 0, -0.08, 0],
				),
			]),
		);
		idle.play();
		const gunMixer = new THREE.AnimationMixer(turret);
		const recoil = gunMixer.clipAction(
			new THREE.AnimationClip("Cannon recoil", 0.22, [
				new THREE.NumberKeyframeTrack(
					"barrel.position[z]",
					[0, 0.04, 0.22],
					[0.7, 0.48, 0.7],
				),
			]),
		);
		recoil.setLoop(THREE.LoopOnce);
		recoil.clampWhenFinished = true;
		const fadeMats = [];
		g.traverse((o) => {
			if (
				(o.isMesh || o.isLineSegments) &&
				o.material &&
				!o.material.transparent
			) {
				o.material = o.material.clone();
				o.material.transparent = true;
				fadeMats.push(o.material);
			}
		});
		return {
			g,
			hull,
			turret,
			barrel,
			mixer,
			gunMixer,
			trackAction,
			recoil,
			flash,
			flashTime: 0,
			ring,
			shield,
			fadeMats,
			dust: 0,
		};
	}
	makeSetDressing(map) {
		const p = this.level;
		for (const [x, z, s] of [
			[-16, -9, 1.3],
			[-16, 6, 1.1],
			[16, -5, 1.4],
			[16, 9, 1],
			[-12, -12, 0.9],
			[8, -12, 1.2],
			[12, 12, 1],
			[-8, 12, 0.8],
		]) {
			const g = new THREE.Group();
			g.position.set(x, 0, z);
			g.scale.setScalar(s);
			p.add(g);
			this.cylinder(0.12, 1.2, 0x8e7956, g, 0, 0.4, 0, 7);
			this.mesh(
				new THREE.IcosahedronGeometry(0.85, 0),
				map.accent,
				g,
				0,
				1.35,
				0,
			);
			this.mesh(
				new THREE.IcosahedronGeometry(0.65, 0),
				0x86a77e,
				g,
				0.48,
				1.8,
				0.12,
			);
			this.mesh(
				new THREE.IcosahedronGeometry(0.6, 0),
				0x5b8e73,
				g,
				-0.3,
				1.9,
				0.05,
			);
		}
		for (const x of [-14.9, 14.9])
			for (const z of [-9.8, 9.8]) {
				this.cylinder(0.08, 3, INK, p, x, 1.5, z, 6);
				this.box(0.8, 0.35, 0.3, CREAM, p, x, 3, z);
				this.box(0.64, 0.2, 0.05, 0xf3d47d, p, x, 3, z + 0.17);
			}
		for (let i = 0; i < 24; i++) {
			const side = i % 2 ? 1 : -1,
				x = side * rand(15.1, 17.7),
				z = rand(-10, 10);
			const m = this.mesh(
				new THREE.DodecahedronGeometry(rand(0.12, 0.3), 0),
				0xb5b99b,
				p,
				x,
				0.03,
				z,
			);
			m.scale.y = 0.5;
			for (let j = 0; j < 2; j++)
				this.line(
					[
						[x + 0.2, 0.05, z],
						[x + 0.2 + rand(-0.2, 0.2), rand(0.2, 0.4), z + rand(-0.2, 0.2)],
					],
					0x6d9a76,
					p,
				);
		}
		for (const i of [0, 1]) {
			const x = i ? 10 : -10,
				z = i ? -5 : 5;
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(1.22, 1.25, 48),
				new THREE.MeshBasicMaterial({
					color: i ? CORAL : TEAL,
					transparent: true,
					opacity: 0.35,
					side: THREE.DoubleSide,
				}),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(x, 0.08, z);
			p.add(ring);
			const tag = this.label(i ? "02" : "01", 1.25, 0.8, i ? CORAL : TEAL);
			tag.position.set(x, 0.09, z);
			p.add(tag);
		}
		if (this.planeModel) this.root.remove(this.planeModel);
		this.planeModel = new THREE.Group();
		this.box(0.35, 0.2, 1.6, 0xf4cd6b, this.planeModel);
		this.box(2.2, 0.07, 0.42, CREAM, this.planeModel, 0, 0.03, 0);
		this.box(0.85, 0.05, 0.26, CORAL, this.planeModel, 0, 0.04, -0.6);
		this.box(0.05, 0.35, 0.35, CORAL, this.planeModel, 0, 0.13, -0.6);
		this.root.add(this.planeModel);
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h);
		const aspect = w / h;
		let height = Math.max(25, 34 / aspect);
		if (this.title) height = Math.max(27, 35 / aspect);
		this.camera.left = (-height * aspect) / 2;
		this.camera.right = (height * aspect) / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.updateProjectionMatrix();
	}
	setTitle(v) {
		if (this.title !== v) {
			this.title = v;
			this.resize();
		}
	}
	worldPoint(x, y) {
		this.raycaster.setFromCamera(
			new THREE.Vector2((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2),
			this.camera,
		);
		const out = new THREE.Vector3();
		this.raycaster.ray.intersectPlane(this.plane, out);
		return { x: out.x, z: out.z };
	}
	buildZone(zone) {
		if (!this.zoneGroup) return;
		for (const c of [...this.zoneGroup.children]) {
			this.zoneGroup.remove(c);
			c.geometry?.dispose();
		}
		if (zone >= 16) return;
		const mat = new THREE.MeshBasicMaterial({
			color: CORAL,
			transparent: true,
			opacity: 0.17,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		for (const [x, z, w, d] of [
			[-(14 + zone) / 2, 0, Math.max(0.01, 14 - zone), 18],
			[(14 + zone) / 2, 0, Math.max(0.01, 14 - zone), 18],
			[
				0,
				-(9 + zone * 0.64) / 2,
				Math.min(28, zone * 2),
				Math.max(0.01, 9 - zone * 0.64),
			],
			[
				0,
				(9 + zone * 0.64) / 2,
				Math.min(28, zone * 2),
				Math.max(0.01, 9 - zone * 0.64),
			],
		]) {
			const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
			m.rotation.x = -Math.PI / 2;
			m.position.set(x, 0.12, z);
			this.zoneGroup.add(m);
		}
		this.line(
			[
				[-zone, 0.15, -zone * 0.64],
				[zone, 0.15, -zone * 0.64],
				[zone, 0.15, zone * 0.64],
				[-zone, 0.15, zone * 0.64],
				[-zone, 0.15, -zone * 0.64],
			],
			CORAL,
			this.zoneGroup,
		);
	}
	effect(type, data) {
		const x = data.x || 0,
			z = data.z || 0;
		if (type === "shoot") {
			const t = this.tankViews[data.tank];
			t.recoil.reset().play();
			t.flashTime = 0.08;
			this.shake = Math.max(this.shake, 0.025);
			return;
		}
		if (type === "hit") this.shake = 0.16;
		if (type === "explode" || type === "barrel") this.shake = 0.32;
		const n =
			type === "explode"
				? 24
				: type === "barrel"
					? 28
					: type === "hit"
						? 9
						: type === "cover"
							? 15
							: type === "bounce"
								? 5
								: type === "dash"
									? 5
									: type === "chip"
										? 7
										: 8;
		for (let i = 0; i < n; i++) {
			const col =
				type === "pickup"
					? 0x65bb99
					: type === "dash"
						? 0xd4d4b2
						: i % 3
							? 0xf0c35b
							: CORAL;
			const m = this.mesh(
				new THREE.BoxGeometry(0.13, 0.13, 0.13),
				col,
				this.root,
				x,
				0.5,
				z,
				false,
			);
			this.effects.push({
				mesh: m,
				vx: rand(-4, 4),
				vy: rand(1, 6),
				vz: rand(-4, 4),
				life: rand(0.25, 0.65),
				max: 0.65,
				spin: rand(-5, 5),
			});
		}
		if (["explode", "hit", "barrel", "pickup", "respawn"].includes(type)) {
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.7, 0.88, 24),
				new THREE.MeshBasicMaterial({
					color: type === "pickup" ? TEAL : 0xf3be4e,
					transparent: true,
					opacity: 0.8,
					side: THREE.DoubleSide,
					depthWrite: false,
				}),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(x, 0.13, z);
			this.root.add(ring);
			this.effects.push({
				mesh: ring,
				ring: true,
				life: 0.45,
				max: 0.45,
				vx: 0,
				vz: 0,
				vy: 0,
			});
		}
	}
	update(
		state,
		dt,
		{ aim = null, assist = true, seat = 0, shake = true, title = false } = {},
	) {
		this.elapsed += dt;
		if (state.round !== this.round) this.build(state.round);
		this.setTitle(title);
		const portrait = innerWidth < 600;
		const targetX = title && !portrait ? -8 : 0,
			targetZ = title && portrait ? 8 : 0;
		const cx = targetX,
			cz = targetZ;
		this.camera.position.set(cx, 34, cz + 27);
		this.camera.lookAt(cx, 0, cz);
		if (shake && this.shake > 0) {
			this.camera.position.x += rand(-this.shake, this.shake);
			this.camera.position.z += rand(-this.shake, this.shake);
			this.shake = Math.max(0, this.shake - dt * 1.2);
		}
		for (let i = 0; i < 2; i++) {
			const t = state.tanks[i],
				v = this.tankViews[i];
			if (!t || !v) continue;
			v.g.position.set(t.x, 0, t.z);
			v.g.visible = t.dead <= 0;
			v.hull.rotation.y = t.angle;
			v.turret.rotation.y = t.aim;
			v.trackAction.timeScale = (t.moving || 0) * 2.3;
			v.mixer.update(dt);
			v.gunMixer.update(dt);
			v.flashTime -= dt;
			v.flash.visible = v.flashTime > 0;
			v.flash.scale.setScalar(1 + Math.random() * 0.5);
			v.shield.visible = t.shield > 0;
			v.shield.rotation.y += dt;
			v.ring.material.opacity = t.overdrive > 0 ? 0.8 : 0.3;
			v.ring.scale.setScalar(
				t.overdrive > 0 ? 1.1 + Math.sin(this.elapsed * 8) * 0.07 : 1,
			);
			for (const mat of v.fadeMats)
				mat.opacity = t.cloak ? (i === seat ? 0.4 : 0.11) : 1;
			v.ring.visible = !t.cloak || i === seat;
			v.dust -= dt;
			if (t.moving > 0.1 && v.dust < 0 && t.dead <= 0) {
				v.dust = 0.12;
				const m = this.mesh(
					new THREE.IcosahedronGeometry(0.13, 0),
					0xcdc7a9,
					this.root,
					t.x - Math.sin(t.angle) * 0.8,
					0.2,
					t.z - Math.cos(t.angle) * 0.8,
					false,
				);
				this.effects.push({
					mesh: m,
					vx: rand(-0.3, 0.3),
					vy: 0.35,
					vz: rand(-0.3, 0.3),
					life: 0.35,
					max: 0.35,
					dust: true,
				});
			}
		}
		this.obstacleMeshes.forEach((v, i) => {
			const o = state.obstacles[i];
			if (o) {
				v.visible = o.hp > 0;
				if (o.type === "crate") v.scale.y = 0.7 + Math.min(3, o.hp) * 0.1;
			}
		});
		const active = new Set();
		for (const b of state.bullets) {
			active.add(b.id);
			let m = this.bulletMeshes.get(b.id);
			if (!m) {
				m = new THREE.Group();
				this.mesh(
					new THREE.SphereGeometry(0.14, 7, 6),
					b.owner ? CORAL : 0xfff5c1,
					m,
					0,
					0,
					0,
				);
				for (let j = 1; j < 4; j++) {
					const trail = this.box(
						0.14 - j * 0.025,
						0.08,
						0.19,
						0xe8b94e,
						m,
						0,
						0,
						-j * 0.24,
						false,
					);
					trail.material = this.mat(0xe8b94e);
				}
				this.root.add(m);
				this.bulletMeshes.set(b.id, m);
			}
			m.position.set(b.x, 0.58, b.z);
			m.rotation.y = Math.atan2(b.dx, b.dz);
		}
		for (const [id, m] of this.bulletMeshes)
			if (!active.has(id)) {
				this.root.remove(m);
				this.bulletMeshes.delete(id);
			}
		const activeP = new Set();
		for (const p of state.pickups) {
			activeP.add(p.id);
			let m = this.pickMeshes.get(p.id);
			if (!m) {
				m = new THREE.Group();
				this.cylinder(0.52, 0.15, INK, m, 0, 0.1, 0, 20);
				this.cylinder(
					0.42,
					0.16,
					p.type === "repair" ? 0x65ae85 : 0xeabd4c,
					m,
					0,
					0.18,
					0,
					20,
				);
				if (p.type === "repair") {
					this.box(0.18, 0.12, 0.65, CREAM, m, 0, 0.45, 0);
					this.box(0.65, 0.12, 0.18, CREAM, m, 0, 0.45, 0);
				} else {
					const mark = this.label("ϟ", 0.8, 1, INK);
					mark.position.y = 0.4;
					m.add(mark);
				}
				const r = new THREE.Mesh(
					new THREE.RingGeometry(0.7, 0.74, 32),
					new THREE.MeshBasicMaterial({
						color: p.type === "repair" ? TEAL : 0xd08b2d,
						side: THREE.DoubleSide,
						transparent: true,
						opacity: 0.6,
					}),
				);
				r.rotation.x = -Math.PI / 2;
				r.position.y = 0.1;
				m.add(r);
				this.root.add(m);
				this.pickMeshes.set(p.id, m);
			}
			m.position.set(p.x, Math.sin(this.elapsed * 3) * 0.08, p.z);
			m.rotation.y = this.elapsed * 0.8;
		}
		for (const [id, m] of this.pickMeshes)
			if (!activeP.has(id)) {
				this.root.remove(m);
				this.pickMeshes.delete(id);
			}
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const f = this.effects[i];
			f.life -= dt;
			if (f.life <= 0) {
				this.root.remove(f.mesh);
				f.mesh.geometry?.dispose();
				this.effects.splice(i, 1);
				continue;
			}
			f.mesh.position.x += f.vx * dt;
			f.mesh.position.y += f.vy * dt;
			f.mesh.position.z += f.vz * dt;
			if (f.ring) f.mesh.scale.setScalar(1 + (1 - f.life / f.max) * 3);
			else if (f.dust) f.mesh.scale.setScalar(1 + (1 - f.life / f.max) * 2);
			else {
				f.vy -= 14 * dt;
				f.mesh.rotation.x += dt * f.spin;
				f.mesh.rotation.z += dt * f.spin;
			}
		}
		if (Math.abs((this.lastZone || 17) - state.zone) > 0.12) {
			this.buildZone(state.zone);
			this.lastZone = state.zone;
		}
		for (const c of [...this.aimGroup.children]) {
			this.aimGroup.remove(c);
			c.geometry?.dispose();
		}
		if (assist && aim && seat >= 0 && !title && !state.tanks[seat].dead) {
			for (let i = 0; i < aim.length; i++) {
				const s = aim[i],
					geo = new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(s.x1, 0.15, s.z1),
						new THREE.Vector3(s.x2, 0.15, s.z2),
					]);
				const m = new THREE.Line(geo, i ? this.bankMaterial : this.aimMaterial);
				m.computeLineDistances();
				this.aimGroup.add(m);
				if (s.hit) {
					const ring = new THREE.Mesh(
						new THREE.RingGeometry(0.1, 0.17, 12),
						this.aimRingMaterial,
					);
					ring.rotation.x = -Math.PI / 2;
					ring.position.set(s.x2, 0.16, s.z2);
					this.aimGroup.add(ring);
				}
			}
		}
		if (this.planeModel) {
			this.planeModel.position.set(
				Math.sin(this.elapsed * 0.09) * 25,
				7,
				-17 + Math.cos(this.elapsed * 0.09) * 6,
			);
			this.planeModel.rotation.y = Math.PI * 0.5 + this.elapsed * 0.04;
			this.planeModel.visible = title;
		}
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
	inspect() {
		return {
			backend: this.backend,
			mixers: this.tankViews?.length * 2 || 0,
			effects: this.effects.length,
			meshes: this.scene.children.length,
		};
	}
}
