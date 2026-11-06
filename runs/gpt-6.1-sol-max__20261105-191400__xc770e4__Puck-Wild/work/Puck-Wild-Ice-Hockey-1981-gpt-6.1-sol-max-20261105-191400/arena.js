import * as THREE from "three/webgpu";
import { color, normalWorld, vec3, dot, float, floor, max } from "three/tsl";

const INK = 0x142b3b,
	BLUE = 0x20b9d3,
	RED = 0xf36959,
	YELLOW = 0xffdb68;
const C = { ink: INK, blue: BLUE, red: RED, yellow: YELLOW };
export class Arena {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#102b3a");
		this.camera = new THREE.OrthographicCamera(-40, 40, 24, -24, 0.1, 250);
		this.camera.position.set(0, 49, 38);
		this.camera.lookAt(0, 0, 0);
		this.geos = {};
		this.mats = new Map();
		this.players = [];
		this.particles = [];
		this.trail = [];
		this.titleBlend = 1;
		this.shake = 0;
		this.elapsed = 0;
		this.effects = true;
		this.numberSprites = [];
		this.build();
	}
	async init() {
		this.renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL:
				new URL(location.href).searchParams.get("graphics") === "webgl",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 compatibility";
		this.resize();
		return this;
	}
	mat(hex) {
		if (this.mats.has(hex)) return this.mats.get(hex);
		const m = new THREE.MeshBasicNodeMaterial();
		const lighting = floor(
			max(dot(normalWorld, vec3(-0.38, 0.85, 0.5)), float(0)).mul(3),
		)
			.div(3)
			.mul(0.32)
			.add(0.68);
		m.colorNode = color(hex).mul(lighting);
		this.mats.set(hex, m);
		return m;
	}
	basic(hex, opacity = 1) {
		return new THREE.MeshBasicMaterial({
			color: hex,
			transparent: opacity < 1,
			opacity,
			depthWrite: opacity === 1,
		});
	}
	mesh(geo, hex, parent = this.scene, ink = true) {
		const m = new THREE.Mesh(geo, this.mat(hex));
		parent.add(m);
		if (ink) {
			const outline = new THREE.Mesh(geo, this.basic(INK));
			outline.material.side = THREE.BackSide;
			outline.scale.setScalar(1.055);
			m.add(outline);
		}
		return m;
	}
	box(w, h, d, hex, parent = this.scene, ink = false) {
		return this.mesh(new THREE.BoxGeometry(w, h, d), hex, parent, ink);
	}
	sphere(r, hex, parent = this.scene, ink = true) {
		return this.mesh(new THREE.SphereGeometry(r, 12, 8), hex, parent, ink);
	}
	tube(a, b, r, hex, parent = this.scene) {
		const av = new THREE.Vector3(...a),
			bv = new THREE.Vector3(...b),
			delta = bv.clone().sub(av);
		const m = this.mesh(
			new THREE.CylinderGeometry(r, r, delta.length(), 7),
			hex,
			parent,
			false,
		);
		m.position.copy(av.add(bv).multiplyScalar(0.5));
		m.quaternion.setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			delta.normalize(),
		);
		return m;
	}
	rounded(w, h, r) {
		const s = new THREE.Shape(),
			x = -w / 2,
			y = -h / 2;
		s.moveTo(x + r, y);
		s.lineTo(x + w - r, y);
		s.quadraticCurveTo(x + w, y, x + w, y + r);
		s.lineTo(x + w, y + h - r);
		s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		s.lineTo(x + r, y + h);
		s.quadraticCurveTo(x, y + h, x, y + h - r);
		s.lineTo(x, y + r);
		s.quadraticCurveTo(x, y, x + r, y);
		return s;
	}
	slab(w, h, r, depth, hex, y) {
		const g = new THREE.ExtrudeGeometry(this.rounded(w, h, r), {
			depth,
			bevelEnabled: false,
			curveSegments: 8,
		});
		const m = this.mesh(g, hex, this.scene, false);
		m.rotation.x = -Math.PI / 2;
		m.position.y = y;
		return m;
	}
	ring(w, h, r, width, height, hex, y) {
		const s = this.rounded(w, h, r),
			hole = this.rounded(w - width * 2, h - width * 2, r - width);
		s.holes.push(hole);
		const g = new THREE.ExtrudeGeometry(s, {
			depth: height,
			bevelEnabled: false,
			curveSegments: 10,
		});
		const m = this.mesh(g, hex, this.scene, false);
		m.rotation.x = -Math.PI / 2;
		m.position.y = y;
		return m;
	}
	texture(w, h, fn) {
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		const ctx = c.getContext("2d");
		fn(ctx, w, h);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 4;
		return t;
	}
	label(text, w = 512, h = 128, bg = "#173445", fg = "#f7f1d7") {
		return this.texture(w, h, (c, w, h) => {
			c.fillStyle = bg;
			c.fillRect(0, 0, w, h);
			c.fillStyle = fg;
			c.font = `900 italic ${h * 0.43}px Arial`;
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.fillText(text, w / 2, h * 0.53, w * 0.93);
		});
	}
	planeLabel(text, w, h, x, y, z, bg, fg, rotate = false) {
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({
				map: this.label(text, 768, 128, bg, fg),
				side: THREE.DoubleSide,
			}),
		);
		m.position.set(x, y, z);
		if (rotate) m.rotation.y = Math.PI / 2;
		this.scene.add(m);
		return m;
	}
	build() {
		this.slab(66, 45, 7, 0.8, 0x081f2e, -2);
		this.ring(66, 45, 7, 0.2, 0.18, 0x366275, -1.3);
		this.slab(55, 31, 5.5, 1.2, 0x071e2e, -1.2);
		const ice = this.texture(2048, 1100, (c, w, h) => {
			c.fillStyle = "#e8f5f0";
			c.fillRect(0, 0, w, h);
			const sx = w / 52,
				sz = h / 28;
			const X = (x) => (x + 26) * sx,
				Z = (z) => (z + 14) * sz;
			let seed = 99;
			const rand = () => {
				seed = (seed * 1664525 + 1013904223) >>> 0;
				return seed / 4294967296;
			};
			for (let i = 0; i < 1800; i++) {
				c.strokeStyle = i % 3 ? "#a8d4d21c" : "#ffffff88";
				c.lineWidth = rand() * 1.5 + 1;
				const x = rand() * w,
					z = rand() * h;
				c.beginPath();
				c.moveTo(x, z);
				c.lineTo(x + rand() * 80 - 40, z + rand() * 12 - 6);
				c.stroke();
			}
			c.lineWidth = 7;
			c.strokeStyle = "#e26b68";
			for (const x of [-23.5, 23.5]) {
				c.beginPath();
				c.moveTo(X(x), 0);
				c.lineTo(X(x), h);
				c.stroke();
			}
			c.lineWidth = 16;
			c.strokeStyle = "#55a5c4";
			for (const x of [-8.6, 8.6]) {
				c.beginPath();
				c.moveTo(X(x), 0);
				c.lineTo(X(x), h);
				c.stroke();
			}
			c.lineWidth = 6;
			c.strokeStyle = "#e27070";
			c.setLineDash([15, 10]);
			c.beginPath();
			c.moveTo(w / 2, 0);
			c.lineTo(w / 2, h);
			c.stroke();
			c.setLineDash([]);
			const ring = (x, z, r, col) => {
				c.strokeStyle = col;
				c.lineWidth = 4;
				c.beginPath();
				c.ellipse(X(x), Z(z), r * sx, r * sz, 0, 0, Math.PI * 2);
				c.stroke();
			};
			ring(0, 0, 4.1, "#297b97");
			for (const x of [-16, 16])
				for (const z of [-7, 7]) {
					ring(x, z, 3.1, "#db7873");
					c.fillStyle = "#d56d66";
					c.beginPath();
					c.arc(X(x), Z(z), 10, 0, Math.PI * 2);
					c.fill();
					for (const side of [-1, 1]) {
						c.fillRect(X(x + side * 3.1) - 2, Z(z) - 21, 4, 12);
						c.fillRect(X(x + side * 3.1) - 2, Z(z) + 9, 4, 12);
					}
				}
			for (const x of [-23.4, 23.4]) {
				c.fillStyle = "#b6e2e7";
				c.beginPath();
				c.ellipse(X(x), Z(0), 2.4 * sx, 3.6 * sz, 0, 0, Math.PI * 2);
				c.fill();
				ring(x, 0, 3.4, "#db7873");
			}
			c.fillStyle = "#f5cf68";
			c.beginPath();
			c.ellipse(w / 2, h / 2, 3.25 * sx, 3.25 * sz, 0, 0, Math.PI * 2);
			c.fill();
			c.strokeStyle = "#254858";
			c.lineWidth = 6;
			c.stroke();
			c.save();
			c.translate(w / 2, h / 2);
			c.rotate(-0.16);
			c.fillStyle = "#244757";
			c.font = "italic 900 125px Arial";
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.fillText("PW", -3, 5);
			c.restore();
			c.fillStyle = "#6c989e";
			c.font = "900 22px Arial";
			c.textAlign = "center";
			c.fillText("COLD ICE. HOT STICKS.", w / 2, Z(5.25));
			c.fillText("THE WILD CUP  /  EST. 1981", w / 2, Z(-5.1));
		});
		const geom = new THREE.ShapeGeometry(this.rounded(52, 28, 4.5), 14);
		const pos = geom.attributes.position,
			uv = geom.attributes.uv;
		for (let i = 0; i < pos.count; i++)
			uv.setXY(i, (pos.getX(i) + 26) / 52, (pos.getY(i) + 14) / 28);
		const iceMesh = new THREE.Mesh(
			geom,
			new THREE.MeshBasicMaterial({ map: ice }),
		);
		iceMesh.rotation.x = -Math.PI / 2;
		iceMesh.position.y = 0.025;
		this.scene.add(iceMesh);
		this.ring(54, 30, 5.4, 0.95, 0.3, YELLOW, -0.2);
		this.ring(54, 30, 5.4, 0.9, 1, 0xf2f0d9, 0.08);
		this.ring(54.12, 30.12, 5.45, 0.98, 0.12, INK, 1.08);
		const glassMat = this.basic(0x93d5df, 0.15);
		for (const s of [-1, 1]) {
			const glass = new THREE.Mesh(
				new THREE.BoxGeometry(44, 1.5, 0.08),
				glassMat,
			);
			glass.position.set(0, 1.9, s * 14.65);
			this.scene.add(glass);
			for (let x = -22; x <= 22; x += 5.5) {
				this.tube([x, 1.2, s * 14.65], [x, 2.7, s * 14.65], 0.035, 0x7eb3bc);
			}
		}
		for (const s of [-1, 1]) {
			const glass = new THREE.Mesh(
				new THREE.BoxGeometry(0.08, 1.5, 19),
				glassMat,
			);
			glass.position.set(s * 26.6, 1.9, 0);
			this.scene.add(glass);
		}
		for (const side of [-1, 1]) {
			for (let row = 0; row < 4; row++) {
				const z = side * (16.5 + row * 1.55),
					y = -0.3 + row * 0.7;
				const stand = this.box(52, 0.7, 1.55, row % 2 ? 0x20495b : 0x183d50);
				stand.position.set(0, y, z);
				for (let i = 0; i < 32; i++) {
					const x = -24.8 + i * 1.6 + (row % 2) * 0.35;
					const group = new THREE.Group();
					this.scene.add(group);
					group.position.set(x, y + 0.8, z);
					const palette = [
						0x375f70, 0x477587, 0xd5bb7b, 0x247b91, 0x9f5653, 0x78a2a7,
						0xf08368,
					];
					const col = palette[(i * 7 + row * 3 + (side + 1)) % palette.length];
					const torso = this.box(0.7, 0.7, 0.5, col, group);
					torso.position.y = 0.1;
					const head = this.sphere(
						0.25,
						i % 3 ? 0xdfb28b : 0x8b6355,
						group,
						false,
					);
					head.position.y = 0.7;
					if (i % 7 === 0) {
						const hat = this.box(0.6, 0.15, 0.5, side < 0 ? BLUE : RED, group);
						hat.position.y = 0.9;
					}
				}
			}
		}
		for (const s of [-1, 1])
			for (let row = 0; row < 3; row++) {
				const tier = this.box(1.6, 0.8, 28, 0x1b4051);
				tier.position.set(s * (29 + row * 1.6), row * 0.7 - 0.2, 0);
				for (let i = 0; i < 14; i++) {
					const body = this.box(
						0.65,
						0.8,
						0.7,
						i % 4 === 0 ? RED : i % 3 ? 0x3e7282 : 0xbfaa79,
					);
					body.position.set(
						s * (29 + row * 1.6),
						row * 0.7 + 0.55,
						-12 + i * 1.8,
					);
					const h = this.sphere(0.25, 0xcfab88, this.scene, false);
					h.position.copy(body.position);
					h.position.y += 0.65;
				}
			}
		this.planeLabel(
			"STAY FROSTY",
			9,
			0.72,
			-16,
			0.63,
			15.065,
			"#f36959",
			"#172f3d",
		);
		this.planeLabel(
			"PUCK WILD",
			8,
			0.72,
			-5.5,
			0.63,
			15.065,
			"#162e3e",
			"#ffdb68",
		);
		this.planeLabel(
			"GOOD ICE • BAD IDEAS",
			13,
			0.72,
			7.2,
			0.63,
			15.065,
			"#e6eedf",
			"#1e596c",
		);
		this.planeLabel(
			"NO PENALTIES. NO PROBLEM.",
			12,
			0.72,
			0,
			0.63,
			-14.02,
			"#162e3e",
			"#ffdb68",
		);
		this.planeLabel(
			"HOT SHOTS",
			8,
			0.72,
			17,
			0.63,
			-14.02,
			"#f36959",
			"#172f3d",
		);
		this.planeLabel(
			"NORTH STARS",
			10,
			0.72,
			-17,
			0.63,
			-14.02,
			"#2cafc4",
			"#172f3d",
		);
		for (const s of [-1, 1]) this.goal(s);
		for (const x of [-31, 31])
			for (const z of [-22, 22]) {
				this.tube([x, 0, z], [x, 7, z], 0.12, 0x477080);
				const bar = this.box(2.8, 0.45, 1.1, INK);
				bar.position.set(x, 7, z);
				for (let i = 0; i < 4; i++) {
					const lamp = this.box(0.5, 0.18, 0.85, 0xffedb0);
					lamp.position.set(x - 1 + i * 0.67, 6.7, z);
				}
			}
		this.box(14, 0.12, 1.3, 0x456372).position.set(0, 9, -22);
		for (const x of [-5.5, 5.5])
			this.tube([x, 1, -21], [x, 8.4, -21], 0.17, 0x395e6f);
		this.jumbo = new THREE.Mesh(
			new THREE.PlaneGeometry(12, 3.6),
			new THREE.MeshBasicMaterial(),
		);
		this.jumbo.position.set(0, 7.5, -21);
		this.scene.add(this.jumbo);
		this.jumbo.rotation.x = -0.12;
		this.jumboCanvas = document.createElement("canvas");
		this.jumboCanvas.width = 768;
		this.jumboCanvas.height = 230;
		this.jumboTexture = new THREE.CanvasTexture(this.jumboCanvas);
		this.jumboTexture.colorSpace = THREE.SRGBColorSpace;
		this.jumbo.material.map = this.jumboTexture;
		this.lastBoard = "";
		this.puck = new THREE.Group();
		this.scene.add(this.puck);
		const pm = this.mesh(
			new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16),
			INK,
			this.puck,
		);
		pm.position.y = 0.18;
		const top = this.mesh(
			new THREE.CylinderGeometry(0.15, 0.15, 0.008, 16),
			YELLOW,
			this.puck,
			false,
		);
		top.position.y = 0.286;
		this.puckHalo = new THREE.Mesh(
			new THREE.RingGeometry(0.4, 0.49, 24),
			this.basic(YELLOW, 0.7),
		);
		this.puckHalo.rotation.x = -Math.PI / 2;
		this.puckHalo.position.y = 0.04;
		this.puck.add(this.puckHalo);
		for (let i = 0; i < 6; i++)
			this.makePlayer(i, i < 4 ? Math.floor(i / 2) : i - 4, i >= 4);
		this.trailMaterial = this.basic(0x40bbce, 0.5);
		this.ambient = new THREE.AmbientLight(0xffffff, 2);
		this.scene.add(this.ambient);
	}
	goal(s) {
		const g = new THREE.Group();
		this.scene.add(g);
		g.position.x = s * 23.7;
		for (const z of [-2.8, 2.8]) {
			this.tube([0, 0, z], [0, 2, z], 0.11, RED, g);
			this.tube([0, 2, z], [s * 1.9, 1.6, z], 0.08, RED, g);
			this.tube([s * 1.9, 0, z], [s * 1.9, 1.6, z], 0.07, RED, g);
		}
		this.tube([0, 2, -2.8], [0, 2, 2.8], 0.11, RED, g);
		this.tube([s * 1.9, 1.6, -2.8], [s * 1.9, 1.6, 2.8], 0.08, RED, g);
		const net = this.basic(0xc2d8cf, 0.7);
		for (let z = -2.8; z <= 2.81; z += 0.35) {
			this.tube([s * 1.9, 0.04, z], [s * 1.9, 1.6, z], 0.014, 0xb5c9c7, g);
			this.tube([0, 2, z], [s * 1.9, 1.6, z], 0.014, 0xb5c9c7, g);
		}
		for (let y = 0.1; y < 1.61; y += 0.25) {
			this.tube([s * 1.9, y, -2.8], [s * 1.9, y, 2.8], 0.014, 0xb5c9c7, g);
			for (const z of [-2.8, 2.8])
				this.tube([0, y, z], [s * 1.9, y, z], 0.014, 0xb5c9c7, g);
		}
		const beacon = this.sphere(0.2, RED, g, false);
		beacon.position.set(s * 2.15, 2.5, 0);
		this["beacon" + (s > 0 ? 0 : 1)] = beacon;
	}
	makePlayer(index, team, goalie) {
		const root = new THREE.Group();
		this.scene.add(root);
		const model = new THREE.Group();
		root.add(model);
		const col = team === 0 ? BLUE : RED;
		const shadow = new THREE.Mesh(
			new THREE.CircleGeometry(goalie ? 1.15 : 0.9, 24),
			this.basic(0x275064, 0.15),
		);
		shadow.rotation.x = -Math.PI / 2;
		shadow.position.y = 0.04;
		root.add(shadow);
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.91, 1.04, 40),
			this.basic(YELLOW),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.065;
		root.add(ring);
		const torso = this.box(goalie ? 1.35 : 1.1, 1.05, 0.72, col, model, true);
		torso.position.y = 1.24;
		const stripe = this.box(
			goalie ? 1.39 : 1.14,
			0.2,
			0.76,
			0xfaf0d5,
			model,
			false,
		);
		stripe.position.y = 1.14;
		const shorts = this.box(0.94, 0.4, 0.62, INK, model);
		shorts.position.y = 0.69;
		const head = this.sphere(0.39, 0xe1ae83, model);
		head.position.y = 2.05;
		const helmet = this.sphere(0.46, team === 0 ? 0xf8f0d5 : 0x2b3e47, model);
		helmet.scale.y = 0.8;
		helmet.position.set(0, 2.26, -0.025);
		const visor = this.box(0.72, 0.14, 0.16, INK, model);
		visor.position.set(0, 2.14, 0.33);
		for (const x of [-0.15, 0.15]) {
			const eye = this.box(0.075, 0.065, 0.04, 0xf7f0d8, model);
			eye.position.set(x, 2.145, 0.425);
		}
		const arms = [],
			legs = [];
		for (let s of [-1, 1]) {
			const arm = new THREE.Group();
			arm.name = s < 0 ? "leftArm" : "rightArm";
			arm.position.set(s * 0.65, 1.56, 0);
			model.add(arm);
			const sleeve = this.box(0.36, 0.65, 0.4, col, arm, true);
			sleeve.position.y = -0.22;
			const glove = this.sphere(0.24, INK, arm);
			glove.position.set(0, -0.61, 0.08);
			arm.rotation.x = -0.25;
			arms.push(arm);
			const leg = new THREE.Group();
			leg.name = s < 0 ? "leftLeg" : "rightLeg";
			leg.position.set(s * 0.29, 0.66, 0);
			model.add(leg);
			const sock = this.box(
				goalie ? 0.5 : 0.33,
				0.49,
				goalie ? 0.36 : 0.32,
				goalie ? 0xf8f0d5 : col,
				leg,
				true,
			);
			sock.position.y = -0.18;
			const boot = this.box(0.37, 0.22, 0.65, INK, leg);
			boot.position.set(0, -0.43, 0.13);
			const blade = this.box(0.08, 0.09, 0.67, 0xcbd9d4, leg);
			blade.position.set(0, -0.58, 0.13);
			legs.push(leg);
		}
		const stick = new THREE.Group();
		stick.name = "stick";
		stick.position.set(0.62, 0.99, 0.27);
		model.add(stick);
		this.tube([0, 0, 0], [0.3, -0.88, 1.14], 0.045, 0x9c784e, stick);
		this.tube([0.3, -0.88, 1.14], [-0.32, -0.9, 1.28], 0.09, INK, stick);
		const numTex = this.texture(128, 128, (c, w, h) => {
			c.fillStyle = "#f6f0d5";
			c.font = "900 96px Arial";
			c.textAlign = "center";
			c.fillText(goalie ? "1" : index % 2 ? "8" : "7", w / 2, 98);
		});
		const num = new THREE.Mesh(
			new THREE.PlaneGeometry(0.42, 0.45),
			new THREE.MeshBasicMaterial({ map: numTex, transparent: true }),
		);
		num.position.set(0, 1.46, -0.375);
		num.rotation.y = Math.PI;
		model.add(num);
		const mixer = new THREE.AnimationMixer(model);
		const tracks = [];
		for (const [name, sign] of [
			["leftLeg", 1],
			["rightLeg", -1],
		])
			tracks.push(
				new THREE.NumberKeyframeTrack(
					name + ".rotation[x]",
					[0, 0.22, 0.44, 0.66, 0.88],
					[0, 0.5 * sign, 0, -0.5 * sign, 0],
				),
			);
		tracks.push(
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.22, 0.44, 0.66, 0.88],
				[0, 0.06, 0, 0.06, 0],
			),
		);
		const skate = mixer.clipAction(
			new THREE.AnimationClip("skate", 0.88, tracks),
		);
		skate.play();
		const shot = mixer.clipAction(
			new THREE.AnimationClip("shoot", 0.45, [
				new THREE.NumberKeyframeTrack(
					"stick.rotation[y]",
					[0, 0.12, 0.24, 0.45],
					[-0.7, -1.1, 1.2, 0],
				),
				new THREE.NumberKeyframeTrack(
					"rightArm.rotation[x]",
					[0, 0.13, 0.3, 0.45],
					[-0.3, -1.3, -0.6, -0.3],
				),
			]),
		);
		shot.setLoop(THREE.LoopOnce);
		shot.clampWhenFinished = false;
		const check = mixer.clipAction(
			new THREE.AnimationClip("check", 0.4, [
				new THREE.NumberKeyframeTrack(
					".rotation[z]",
					[0, 0.15, 0.4],
					[0, -0.3, 0],
				),
				new THREE.NumberKeyframeTrack(
					"leftArm.rotation[z]",
					[0, 0.16, 0.4],
					[0, 1.2, 0],
				),
			]),
		);
		check.setLoop(THREE.LoopOnce);
		const cheer = mixer.clipAction(
			new THREE.AnimationClip("cheer", 0.8, [
				new THREE.NumberKeyframeTrack(
					"leftArm.rotation[z]",
					[0, 0.2, 0.5, 0.8],
					[0, 2.2, 1.8, 2.2],
				),
				new THREE.NumberKeyframeTrack(
					"rightArm.rotation[z]",
					[0, 0.2, 0.5, 0.8],
					[0, -2.2, -1.8, -2.2],
				),
			]),
		);
		const arrow = new THREE.Mesh(
			new THREE.ConeGeometry(0.23, 0.45, 3),
			this.basic(YELLOW),
		);
		arrow.rotation.x = Math.PI;
		arrow.position.y = 3.2;
		root.add(arrow);
		this.seatTextures ??= Array.from({ length: 4 }, (_, i) =>
			this.label(
				"P" + (i + 1),
				128,
				64,
				"#142c3b",
				i % 2 ? "#f17b68" : "#ffdc70",
			),
		);
		const tag = new THREE.Sprite(
			new THREE.SpriteMaterial({ map: this.seatTextures[0], depthTest: false }),
		);
		tag.position.y = 3.8;
		tag.scale.set(1.4, 0.65, 1);
		root.add(tag);
		this.players.push({
			root,
			model,
			ring,
			arrow,
			tag,
			mixer,
			skate,
			shot,
			check,
			cheer,
			lastAction: "",
			fall: 0,
		});
	}
	burst(type, x, z, team) {
		if (!this.effects) return;
		const amount =
			type === "goal" ? 70 : type === "check" ? 22 : type === "shot" ? 10 : 3;
		for (let i = 0; i < amount; i++) {
			const col =
				type === "goal"
					? [YELLOW, 0xf9efcf, team === 0 ? BLUE : RED][i % 3]
					: type === "check"
						? YELLOW
						: 0xffffff;
			const m = this.box(
				type === "goal" ? 0.17 : 0.12,
				type === "goal" ? 0.23 : 0.08,
				0.1,
				col,
			);
			m.position.set(x, 0.2 + Math.random() * 0.6, z);
			const a = Math.random() * Math.PI * 2,
				s = 2 + Math.random() * (type === "goal" ? 12 : 5);
			this.particles.push({
				m,
				vx: Math.cos(a) * s,
				vy: type === "goal" ? 6 + Math.random() * 9 : 1 + Math.random() * 4,
				vz: Math.sin(a) * s,
				life: type === "goal" ? 2.2 : 0.6,
				max: type === "goal" ? 2.2 : 0.6,
			});
		}
		if (type === "check") this.shake = 0.18;
		if (type === "goal") this.shake = 0.3;
	}
	handleEvent(e) {
		if (["shot", "check", "skate", "goal", "save"].includes(e.type))
			this.burst(e.type, e.x, e.z, e.team);
		if (e.type === "shot") {
			const p = this.players.find(
				(_, i) =>
					i < 4 &&
					this._state?.players[i].flash > 0 &&
					this._state?.players[i].action === "shoot",
			);
			if (p) p.shot.reset().play();
		}
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer?.setSize(w, h);
		this.aspect = w / h;
		const halfW = Math.max(32, 23 * this.aspect);
		this.camera.left = -halfW;
		this.camera.right = halfW;
		this.camera.top = halfW / this.aspect;
		this.camera.bottom = -halfW / this.aspect;
		this.camera.updateProjectionMatrix();
	}
	draw(game, dt, { title = false, attract = false, localSeat = 0 } = {}) {
		this._state = game;
		this.elapsed += dt;
		this.titleBlend += (Number(title) - this.titleBlend) * Math.min(1, dt * 4);
		const shift = this.aspect > 1.4 ? -10 * this.titleBlend : 0;
		this.shake = Math.max(0, this.shake - dt);
		const jig =
			this.shake > 0 ? Math.sin(this.elapsed * 77) * this.shake * 0.7 : 0;
		const portrait = this.aspect < 0.8,
			mobileBlend = portrait ? 1 - this.titleBlend : 0;
		this.camera.position.set(
			shift + jig + mobileBlend * 55,
			49 + mobileBlend * 15,
			38 * (1 - mobileBlend),
		);
		this.camera.lookAt(shift, 0, 0);
		const halfW =
			(portrait ? 17 : Math.max(31, 19 * this.aspect)) * (1 - this.titleBlend) +
			Math.max(32, 23 * this.aspect) * this.titleBlend;
		this.camera.left = -halfW;
		this.camera.right = halfW;
		this.camera.top = halfW / this.aspect;
		this.camera.bottom = -halfW / this.aspect;
		this.camera.updateProjectionMatrix();
		const keys =
			game.score.join("-") + game.period + (Math.floor(this.elapsed) % 2);
		if (keys !== this.lastBoard) {
			this.lastBoard = keys;
			const c = this.jumboCanvas.getContext("2d");
			c.fillStyle = "#112b3a";
			c.fillRect(0, 0, 768, 230);
			c.strokeStyle = "#f4d365";
			c.lineWidth = 9;
			c.strokeRect(7, 7, 754, 216);
			c.textAlign = "center";
			c.fillStyle = "#f6d56d";
			c.font = "900 italic 36px Arial";
			c.fillText("THE WILD CUP", 384, 53);
			c.fillStyle = "#45bfd1";
			c.font = "900 36px Arial";
			c.fillText("NORTH", 140, 113);
			c.fillStyle = "#f17b68";
			c.fillText("HOT", 630, 113);
			c.fillStyle = "#f4eed6";
			c.font = "900 90px Arial";
			c.fillText(`${game.score[0]} : ${game.score[1]}`, 384, 183);
			c.font = "900 25px Arial";
			c.fillText("STARS", 140, 152);
			c.fillText("SHOTS", 630, 152);
			this.jumboTexture.needsUpdate = true;
		}
		game.players.forEach((p, i) => {
			const v = this.players[i];
			v.root.position.set(p.x, 0, p.z);
			let delta = Math.atan2(
				Math.sin(p.angle - v.model.rotation.y),
				Math.cos(p.angle - v.model.rotation.y),
			);
			v.model.rotation.y += delta * Math.min(1, dt * 14);
			const speed = Math.hypot(p.vx, p.vz);
			v.skate.setEffectiveTimeScale(Math.max(0.3, speed / 6));
			v.skate.setEffectiveWeight(Math.min(1, speed / 2));
			v.mixer.update(dt);
			const chosen = game.seats.find((s) => s.index === i);
			v.ring.visible = !!chosen && !attract;
			v.arrow.visible = !!chosen && !attract;
			v.tag.visible = !!chosen && game.seats.length > 1 && !attract;
			if (chosen) v.tag.material.map = this.seatTextures[chosen.id % 4];
			v.ring.material.color.setHex(
				chosen?.id === localSeat ? YELLOW : chosen?.team === 0 ? BLUE : RED,
			);
			v.arrow.material.color.copy(v.ring.material.color);
			v.arrow.position.y = 3.2 + Math.sin(this.elapsed * 5) * 0.1;
			v.model.rotation.z +=
				((p.stun > 0 ? 1.1 : 0) - v.model.rotation.z) * Math.min(1, dt * 8);
			if (p.action !== v.lastAction || (p.flash > 0.3 && v.lastFlash < 0.15)) {
				if (p.action === "shoot") v.shot.reset().play();
				if (p.action === "check") v.check.reset().play();
			}
			v.lastAction = p.action;
			v.lastFlash = p.flash;
			const celebration =
				(game.phase === "goal" || game.phase === "gameover") &&
				(game.score[0] > game.score[1] ? 0 : 1) === p.team;
			if (celebration && !v.celebrating) v.cheer.reset().play();
			if (!celebration && v.celebrating) v.cheer.stop();
			v.celebrating = celebration;
		});
		this.puck.position.set(game.puck.x, 0, game.puck.z);
		this.puckHalo.scale.setScalar(1 + Math.sin(this.elapsed * 8) * 0.08);
		if (
			this.effects &&
			Math.hypot(game.puck.vx, game.puck.vz) > 11 &&
			game.phase === "play"
		) {
			const m = new THREE.Mesh(
				new THREE.CircleGeometry(0.24, 8),
				this.trailMaterial.clone(),
			);
			m.rotation.x = -Math.PI / 2;
			m.position.set(game.puck.x, 0.06, game.puck.z);
			this.scene.add(m);
			this.trail.push({ m, life: 0.3 });
		}
		for (let i = this.trail.length - 1; i >= 0; i--) {
			const p = this.trail[i];
			p.life -= dt;
			p.m.material.opacity = Math.max(0, p.life * 1.5);
			p.m.scale.setScalar(Math.max(0.01, p.life * 3));
			if (p.life <= 0) {
				this.scene.remove(p.m);
				p.m.geometry.dispose();
				p.m.material.dispose();
				this.trail.splice(i, 1);
			}
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.vy -= dt * 16;
			p.m.position.x += p.vx * dt;
			p.m.position.z += p.vz * dt;
			p.m.position.y = Math.max(0.07, p.m.position.y + p.vy * dt);
			p.m.rotation.x += dt * 4;
			p.m.rotation.z += dt * 3;
			p.m.scale.setScalar(Math.max(0.01, p.life / p.max));
			if (p.life <= 0) {
				this.scene.remove(p.m);
				p.m.geometry.dispose();
				this.particles.splice(i, 1);
			}
		}
		this.renderer.render(this.scene, this.camera);
	}
	aim(clientX, clientY) {
		const vec = new THREE.Vector2(
			(clientX / innerWidth) * 2 - 1,
			(-clientY / innerHeight) * 2 + 1,
		);
		const ray = new THREE.Raycaster();
		ray.setFromCamera(vec, this.camera);
		const point = new THREE.Vector3();
		ray.ray.intersectPlane(
			new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
			point,
		);
		return { x: point.x, z: point.z };
	}
}
export { C };
