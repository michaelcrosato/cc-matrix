import {
	color,
	float,
	normalWorld,
	positionWorld,
	uniform,
	vec3,
} from "three/tsl";
import * as THREE from "three/webgpu";

export { THREE };
export class Visuals {
	constructor() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#101c25");
		this.scene.fog = new THREE.FogExp2("#101c25", 0.012);
		this.camera = new THREE.OrthographicCamera(-21, 21, 14, -14, 0.1, 180);
		this.camera.position.set(24, 34, 30);
		this.camera.lookAt(0, 0, 0);
		this.lamp = uniform(new THREE.Vector3());
		this.power = uniform(1);
		this.ambient = uniform(0.72);
		this.brightness = uniform(1);
		this.cache = new Map();
		this.mixers = [];
		this.sparks = [];
		this.floorGroup = new THREE.Group();
		this.titleGroup = new THREE.Group();
		this.scene.add(this.floorGroup, this.titleGroup);
		this.floorGroup.visible = false;
		this.actors = new THREE.Group();
		this.scene.add(this.actors);
		this.actors.visible = false;
		this.playerModels = [];
		this.enemyModels = [];
		this.itemModels = new Map();
		this.doorModels = [];
		this.obstacles = [];
		this.makeTitle();
		this.dust();
	}
	mat(hex, glow = false) {
		const key = hex + glow;
		if (this.cache.has(key)) return this.cache.get(key);
		const m = new THREE.MeshBasicNodeMaterial({ color: hex });
		if (!glow) {
			const cel = normalWorld
				.dot(vec3(0.35, 0.85, 0.4))
				.max(0)
				.mul(3)
				.floor()
				.div(3)
				.mul(0.42)
				.add(0.58);
			const light = positionWorld
				.distance(this.lamp)
				.smoothstep(2, 13)
				.oneMinus()
				.mul(this.power)
				.add(this.ambient)
				.clamp(0.25, 1.15);
			m.colorNode = color(hex).mul(cel).mul(light).mul(this.brightness);
		}
		this.cache.set(key, m);
		return m;
	}
	mesh(g, geo, col, x = 0, y = 0, z = 0, ink = true) {
		const m = new THREE.Mesh(geo, this.mat(col));
		m.position.set(x, y, z);
		g.add(m);
		if (ink) {
			const edge = new THREE.LineSegments(
				new THREE.EdgesGeometry(geo, 25),
				new THREE.LineBasicMaterial({
					color: "#10171e",
					transparent: true,
					opacity: 0.8,
				}),
			);
			m.add(edge);
		}
		return m;
	}
	box(g, w, h, d, c, x = 0, y = 0, z = 0, ink = true) {
		return this.mesh(g, new THREE.BoxGeometry(w, h, d), c, x, y, z, ink);
	}
	ball(g, r, c, x = 0, y = 0, z = 0) {
		return this.mesh(g, new THREE.IcosahedronGeometry(r, 1), c, x, y, z, false);
	}
	cylinder(g, r1, r2, h, c, x = 0, y = 0, z = 0, n = 10) {
		return this.mesh(g, new THREE.CylinderGeometry(r1, r2, h, n), c, x, y, z);
	}
	ring(g, r, c, x, y, z) {
		const m = new THREE.Mesh(
			new THREE.RingGeometry(r * 0.72, r, 40),
			this.mat(c, true),
		);
		m.rotation.x = -Math.PI / 2;
		m.position.set(x, y, z);
		g.add(m);
		return m;
	}
	shadow(g, x, z, r = 1) {
		const m = new THREE.Mesh(
			new THREE.CircleGeometry(r, 24),
			new THREE.MeshBasicMaterial({
				color: "#0a141d",
				transparent: true,
				opacity: 0.34,
				depthWrite: false,
			}),
		);
		m.rotation.x = -Math.PI / 2;
		m.scale.y = 0.6;
		m.position.set(x, 0.04, z);
		g.add(m);
		return m;
	}
	label(g, text, x, y, z, size = 1.2, col = "#eddfb6") {
		const c = document.createElement("canvas");
		c.width = 512;
		c.height = 128;
		const ctx = c.getContext("2d");
		ctx.font = "bold 44px Georgia";
		ctx.fillStyle = col;
		ctx.textAlign = "center";
		ctx.fillText(text, 256, 79);
		const s = new THREE.Sprite(
			new THREE.SpriteMaterial({
				map: new THREE.CanvasTexture(c),
				depthTest: false,
				transparent: true,
				opacity: 0.85,
			}),
		);
		s.scale.set(size * 4, size, 1);
		s.position.set(x, y, z);
		g.add(s);
		return s;
	}
	actor(kind = "player", index = 0) {
		const root = new THREE.Group(),
			body = new THREE.Group();
		root.add(body);
		const c =
			kind === "player"
				? index
					? "#a0c9be"
					: "#eac474"
				: kind === "ghost"
					? "#8dbfc0"
					: kind === "bat"
						? "#bc7d95"
						: "#bd7764";
		if (kind === "player") {
			this.cylinder(
				body,
				0.4,
				0.62,
				1.0,
				index ? "#4b8788" : "#b4704f",
				0,
				0.7,
				0,
			);
			this.ball(body, 0.42, "#1c2632", 0, 1.23, 0);
			this.cylinder(body, 0.41, 0.43, 0.2, c, 0, 1.52, 0);
			const hat = this.mesh(
				body,
				new THREE.ConeGeometry(0.4, 0.67, 5),
				c,
				0,
				1.9,
				0,
			);
			hat.rotation.z = -0.2;
			for (const side of [-1, 1]) {
				const eye = this.box(
					body,
					0.14,
					0.18,
					0.12,
					"#fff6cf",
					side * 0.18,
					1.27,
					0.34,
					false,
				);
				eye.userData.eye = true;
				eye.material = this.mat("#fff6cf", true);
			}
			this.box(body, 0.16, 0.14, 0.55, c, 0.5, 0.75, 0.26);
			const flame = this.ball(body, 0.13, "#ffe1a0", 0.5, 0.77, 0.6);
			flame.material = this.mat("#ffe1a0", true);
		}
		if (kind === "ghost") {
			this.ball(body, 0.66, c, 0, 1, 0);
			this.cylinder(body, 0.59, 0.83, 0.78, c, 0, 0.6, 0);
			for (let k = -1; k <= 1; k++)
				this.mesh(
					body,
					new THREE.ConeGeometry(0.25, 0.5, 4),
					c,
					k * 0.46,
					0.1,
					0,
				);
			this.box(body, 0.14, 0.25, 0.13, "#142c39", -0.2, 1.14, 0.57, false);
			this.box(body, 0.14, 0.25, 0.13, "#142c39", 0.2, 1.14, 0.57, false);
			this.ball(body, 0.13, "#142c39", 0, 0.78, 0.59);
		}
		if (kind === "bat") {
			this.ball(body, 0.3, c, 0, 1.4, 0);
			for (const s of [-1, 1]) {
				const w = this.mesh(
					body,
					new THREE.ConeGeometry(0.65, 0.9, 3),
					c,
					s * 0.54,
					1.35,
					0,
				);
				w.rotation.z = s * 1.2;
				w.scale.z = 0.12;
			}
			for (const s of [-1, 1])
				this.mesh(
					body,
					new THREE.ConeGeometry(0.11, 0.3, 3),
					c,
					s * 0.18,
					1.72,
					0,
				);
		}
		if (kind === "spider") {
			this.ball(body, 0.42, c, 0, 0.35, 0);
			for (let k = 0; k < 4; k++)
				for (const s of [-1, 1]) {
					const leg = this.box(
						body,
						0.75,
						0.075,
						0.075,
						"#856382",
						s * 0.45,
						0.23,
						(k - 1.5) * 0.22,
					);
					leg.rotation.y = s * (k - 1.5) * 0.35;
				}
		}
		if (kind !== "player") {
			this.ball(
				body,
				0.065,
				"#fff3ae",
				-0.12,
				kind === "spider" ? 0.48 : 1.45,
				0.3,
			);
			this.ball(
				body,
				0.065,
				"#fff3ae",
				0.12,
				kind === "spider" ? 0.48 : 1.45,
				0.3,
			);
		}
		this.shadow(root, 0, 0, kind === "player" ? 0.7 : 0.9);
		const mixer = new THREE.AnimationMixer(body),
			track = new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.6, 1.2],
				[0, kind === "player" ? 0.1 : 0.25, 0],
			),
			rock = new THREE.NumberKeyframeTrack(
				".rotation[z]",
				[0, 0.3, 0.6, 0.9, 1.2],
				[0, 0.06, 0, -0.06, 0],
			);
		mixer
			.clipAction(new THREE.AnimationClip("living-ink", 1.2, [track, rock]))
			.play();
		this.mixers.push(mixer);
		root.userData = { body, mixer, kind };
		return root;
	}
	candle(g, x, z, large = false) {
		const q = new THREE.Group();
		q.position.set(x, 0, z);
		g.add(q);
		this.cylinder(q, 0.3, 0.4, 0.16, "#b88e5e", 0, 0.12, 0);
		this.cylinder(
			q,
			0.07,
			0.12,
			large ? 1 : 0.4,
			"#af8c66",
			0,
			large ? 0.6 : 0.32,
			0,
		);
		const yy = large ? 1.2 : 0.6;
		for (const a of large ? [-0.35, 0, 0.35] : [0]) {
			if (a) this.box(q, 0.7, 0.08, 0.08, "#b88e5e", 0, 0.9, 0);
			this.cylinder(q, 0.095, 0.1, 0.35, "#e4d6a1", a, yy, 0);
			const f = this.ball(q, 0.12, "#ffe2a0", a, yy + 0.27, 0);
			f.scale.set(0.75, 1.6, 0.75);
			f.material = this.mat("#ffe2a0", true);
			this.sparks.push(f);
			q.userData.flames = q.userData.flames || [];
			q.userData.flames.push(f);
		}
		return q;
	}
	furniture(g, type, x, z, colorAlt = "#785b61") {
		const q = new THREE.Group();
		q.position.set(x, 0, z);
		g.add(q);
		this.shadow(q, 0, 0, 1.3);
		if (g === this.floorGroup) {
			const sizes = {
				shelf: [1, 0.3],
				table: [0.75, 0.68],
				dining: [1.4, 0.75],
				sofa: [1.12, 0.6],
				grave: [0.45, 0.18],
				piano: [1, 0.6],
				bed: [0.87, 1.35],
				crate: [0.52, 0.52],
			};
			const v = sizes[type];
			if (v) this.obstacles.push({ x, z, hx: v[0], hz: v[1] });
		}
		if (type === "shelf") {
			this.box(q, 2, 2.3, 0.5, "#574e5c", 0, 1.2, 0);
			for (const y of [0.45, 1.1, 1.75]) {
				this.box(q, 1.8, 0.08, 0.6, "#ad8668", 0, y, 0);
				for (let k = 0; k < 6; k++) {
					const b = this.box(
						q,
						0.16,
						0.45 + ((k * 7) % 3) * 0.08,
						0.32,
						["#8f626a", "#81958b", "#c9aa78"][k % 3],
						-0.73 + k * 0.28,
						y + 0.28,
						0.13,
					);
					b.rotation.z = ((k % 3) - 1) * 0.09;
				}
			}
		}
		if (type === "table" || type === "dining") {
			this.box(
				q,
				type === "dining" ? 2.7 : 1.5,
				0.15,
				1.35,
				colorAlt,
				0,
				0.9,
				0,
			);
			for (const a of [-0.55, 0.55])
				for (const b of [-0.45, 0.45])
					this.box(q, 0.13, 0.85, 0.13, "#61505a", a, 0.43, b);
			this.candle(q, 0, 0);
			if (type === "dining")
				for (const a of [-0.9, 0.9]) {
					this.cylinder(q, 0.25, 0.25, 0.03, "#c8c5ab", a, 1, 0);
					for (const b of [-1, 1]) {
						this.box(q, 0.65, 0.12, 0.65, "#8b655e", a, 0.6, b);
						this.box(q, 0.65, 0.8, 0.1, "#8b655e", a, 1, b + b * 0.25);
					}
				}
		}
		if (type === "sofa") {
			this.box(q, 2.1, 0.7, 1, "#98716f", 0, 0.55, 0);
			this.box(q, 2.1, 0.8, 0.2, "#98716f", 0, 0.95, -0.5);
			for (const a of [-1, 1])
				this.box(q, 0.25, 0.75, 1.1, "#98716f", a, 0.78, 0);
			for (const a of [-0.52, 0.52])
				this.box(q, 0.9, 0.15, 0.75, "#b78b81", a, 0.95, 0);
		}
		if (type === "grave") {
			this.box(q, 0.85, 1.2, 0.22, "#819693", 0, 0.65, 0);
			this.ball(q, 0.43, "#819693", 0, 1.26, 0).scale.z = 0.3;
			this.box(q, 0.08, 0.45, 0.08, "#344c56", 0, 0.9, 0.13);
			this.box(q, 0.4, 0.08, 0.08, "#344c56", 0, 1, 0.13);
		}
		if (type === "piano") {
			this.box(q, 2, 1.6, 0.65, "#3b424b", 0, 0.8, 0);
			this.box(q, 1.8, 0.1, 0.65, "#d6caad", 0, 1, 0.5);
			for (let i = 0; i < 12; i++)
				this.box(
					q,
					0.06,
					0.06,
					0.4,
					"#282f3d",
					-0.8 + i * 0.14,
					1.08,
					0.45,
					false,
				);
			this.candle(q, -0.65, 0);
		}
		if (type === "bed") {
			this.box(q, 1.7, 0.55, 2.5, "#6e535e", 0, 0.35, 0);
			this.box(q, 1.55, 0.18, 2.25, "#c9b79b", 0, 0.75, 0);
			this.box(q, 1.6, 0.2, 1.55, colorAlt, 0, 0.89, 0.35);
			this.box(q, 1.7, 1.4, 0.12, "#705768", 0, 0.8, -1.3);
			this.box(q, 1.2, 0.18, 0.5, "#e2d6b6", 0, 0.93, -0.8);
		}
		if (type === "crate") {
			this.box(q, 1, 0.85, 1, "#a78669", 0, 0.45, 0);
			for (const a of [-0.35, 0.35])
				this.box(q, 0.1, 0.9, 1.04, "#554d56", a, 0.45, 0);
		}
		return q;
	}
	makeTitle() {
		const g = this.titleGroup;
		this.cylinder(g, 15, 16, 0.65, "#223d42", 0, -0.7, 0, 12);
		for (let j = 0; j < 17; j++) {
			const t = j / 16;
			const p = this.box(
				g,
				1.5,
				0.12,
				1,
				"#a8997b",
				Math.sin(t * 5) * 1.7,
				0.01,
				3 + t * 10,
			);
			p.rotation.y = Math.sin(t * 4) * 0.5;
		}
		this.box(g, 12, 8, 6, "#53676a", 0, 4, 0);
		this.box(g, 5, 10, 6.5, "#6a7672", 0, 5, 0);
		this.box(g, 12.5, 0.45, 6.5, "#253c48", 0, 7.9, 0);
		this.box(g, 12.5, 0.45, 6.5, "#253c48", 0, 4.5, 0);
		this.mesh(
			g,
			new THREE.ConeGeometry(9.2, 4, 4),
			"#344c59",
			0,
			10,
			0,
		).rotation.y = Math.PI / 4;
		for (const side of [-1, 1]) {
			this.box(g, 2.7, 11, 3, "#6b7775", side * 5, 5.5, -0.1);
			this.mesh(
				g,
				new THREE.ConeGeometry(2.4, 4, 4),
				"#2b424f",
				side * 5,
				13,
				-0.1,
			).rotation.y = Math.PI / 4;
			this.cylinder(g, 0.06, 0.06, 2, "#d6b77d", side * 5, 16, 0);
			this.ball(g, 0.2, "#eac877", side * 5, 17, 0);
		}
		for (const y of [2.1, 5.8, 8.6])
			for (const x of [-4.7, -2.5, 0, 2.5, 4.7]) {
				if (y === 8.6 && Math.abs(x) > 1) continue;
				this.box(g, 1, 1.8, 0.16, "#152d38", x, y, 3.1);
				this.box(g, 0.67, 1.42, 0.18, "#e7bd77", x, y, 3.22).material =
					this.mat("#e7bd77", true);
				this.box(g, 0.06, 1.5, 0.2, "#2e444d", x, y, 3.34);
				this.box(g, 0.8, 0.07, 0.2, "#2e444d", x, y, 3.34);
				this.box(g, 1.2, 0.1, 0.4, "#9ca092", x, y - 0.95, 3.24);
			}
		this.box(g, 1.7, 2.8, 0.28, "#202d39", 0, 1.4, 3.3);
		this.mesh(
			g,
			new THREE.ConeGeometry(2.2, 1.4, 4),
			"#b17c61",
			0,
			3.6,
			4.0,
		).rotation.y = Math.PI / 4;
		for (const s of [-1, 1])
			this.cylinder(g, 0.1, 0.1, 2.8, "#baaa8a", s * 1.3, 1.4, 4.7);
		for (let j = 0; j < 4; j++)
			this.box(
				g,
				3.4,
				0.2,
				1.7 - j * 0.15,
				"#96a096",
				0,
				j * 0.18,
				4.2 - j * 0.1,
			);
		const moon = this.ball(g, 3.3, "#f4dfad", -8, 13, -9);
		moon.material = this.mat("#f4dfad", true);
		for (const a of [-1, 1])
			for (let k = 0; k < 3; k++) {
				const x = a * (9 + k * 1.5),
					z = -2 + k * 4;
				const t = this.cylinder(g, 0.22, 0.6, 6, "#293f49", x, 2.5, z, 6);
				t.rotation.z = a * 0.13;
				for (let r = 0; r < 3; r++) {
					const b = this.cylinder(
						g,
						0.04,
						0.18,
						2.8,
						"#293f49",
						x + (r - 1) * 0.65,
						4.8 + r * 0.2,
						z,
						5,
					);
					b.rotation.z = (r - 1) * 0.7;
				}
			}
		for (let k = 0; k < 12; k++) {
			const a = k * 2.4;
			this.furniture(g, "grave", Math.cos(a) * 11, Math.sin(a) * 8 - 2);
		}
		for (let k = 0; k < 4; k++) {
			const p = this.actor("ghost");
			p.position.set(-8 + k * 5, 1.5 + (k % 2) * 2, 6 + (k % 2));
			p.scale.setScalar(0.75);
			g.add(p);
		}
		for (let k = 0; k < 16; k++) {
			const b = this.actor("bat");
			b.position.set(
				Math.sin(k * 4) * 12,
				10 + Math.cos(k * 3) * 3,
				-6 + Math.sin(k) * 5,
			);
			b.scale.setScalar(0.35);
			g.add(b);
		}
	}
	dust() {
		const geo = new THREE.BufferGeometry(),
			a = [];
		for (let i = 0; i < 220; i++)
			a.push(
				(Math.random() - 0.5) * 50,
				Math.random() * 12,
				(Math.random() - 0.5) * 40,
			);
		geo.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
		this.dustMesh = new THREE.Points(
			geo,
			new THREE.PointsMaterial({
				color: "#d9c59d",
				size: 0.055,
				transparent: true,
				opacity: 0.45,
			}),
		);
		this.scene.add(this.dustMesh);
	}
	buildFloor(f, rooms, doors, items, candles) {
		this.floorGroup.clear();
		this.obstacles = [];
		this.itemModels.clear();
		this.doorModels = [];
		const g = this.floorGroup;
		const palettes = [
			["#677574", "#786c71", "#74766a", "#696974", "#4e7074", "#7b6f65"],
			["#69637b", "#59787a", "#7c6b74", "#647873", "#75666c", "#817b69"],
			["#596b79", "#7a716f", "#56767a", "#6d6476", "#727d78", "#8c7864"],
		];
		this.box(g, 25, 0.65, 17, "#253b47", 0, -0.48, 0);
		this.box(g, 25.25, 0.15, 17.25, "#b0916a", 0, -0.15, 0);
		for (let i = 0; i < 6; i++) {
			const x = ((i % 3) - 1) * 8,
				z = (Math.floor(i / 3) - 0.5) * 8,
				col = palettes[f][i];
			this.box(g, 7.9, 0.12, 7.9, col, x, -0.03, z);
			for (let t = 0; t < 8; t++) {
				this.box(g, 0.025, 0.015, 7.8, "#4b535e", x - 3.5 + t, 0.045, z, false);
				for (let j = 0; j < 3; j++)
					this.box(
						g,
						0.9,
						0.012,
						0.022,
						"#4b535e",
						x - 3.5 + t,
						0.055,
						z - 3 + j * 3 + (t % 2),
						false,
					);
			}
			this.box(
				g,
				3.8,
				0.025,
				3.5,
				["#81616b", "#6c596c", "#89705d"][f],
				x,
				0.06,
				z,
			);
			for (const a of [-1, 1]) {
				this.box(g, 3.5, 0.015, 0.06, "#bd9e7c", x, 0.085, z + a * 1.5, false);
				this.box(
					g,
					0.06,
					0.015,
					3.05,
					"#bd9e7c",
					x + a * 1.65,
					0.085,
					z,
					false,
				);
			}
			this.label(g, rooms[i], x, 0.2, z - 2.8, 0.56);
			if (i === 0) {
				this.furniture(g, f === 2 ? "grave" : "shelf", x - 2, z - 2);
				this.furniture(g, f === 2 ? "grave" : "table", x + 2, z + 2);
			}
			if (i === 1) {
				this.furniture(g, f === 1 ? "piano" : "shelf", x - 1.8, z - 2.6);
				this.furniture(g, "table", x + 2.3, z + 1.8);
			}
			if (i === 2) {
				this.furniture(g, f === 2 ? "grave" : "bed", x + 2, z - 1);
				this.furniture(g, "shelf", x - 2, z - 2.7);
			}
			if (i === 3) {
				this.furniture(g, f === 1 ? "crate" : "sofa", x - 1, z + 1.8);
				this.furniture(g, "table", x + 2, z - 1);
			}
			if (i === 4) {
				this.furniture(g, "table", x - 2.3, z - 1.6);
				this.furniture(g, "sofa", x + 1.4, z - 2.5);
			}
			if (i === 5) {
				this.furniture(g, "dining", x + 1.2, z - 1.5);
				this.furniture(g, "crate", x + 2.6, z + 2.6);
			}
			// Portraits, wainscot and ink scratches along the rear walls.
			this.box(g, 7.8, 0.5, 0.13, "#495260", x, 0.3, z - 3.85);
			this.box(g, 7.8, 0.08, 0.17, "#baa07c", x, 0.59, z - 3.85);
			for (let k = 0; k < 2; k++) {
				this.box(g, 0.9, 1.05, 0.1, "#be9a6b", x - 2 + k * 4, 1.6, z - 3.83);
				this.box(g, 0.69, 0.81, 0.12, "#343c50", x - 2 + k * 4, 1.6, z - 3.75);
				this.ball(
					g,
					0.2,
					k ? "#c4aa83" : "#809f9c",
					x - 2 + k * 4,
					1.7,
					z - 3.64,
				);
			}
		}
		// Cutaway walls keep every doorway and room readable.
		for (const x of [-12, 12]) this.box(g, 0.2, 1.1, 16, "#465765", x, 0.55, 0);
		for (const z of [-8, 8])
			this.box(
				g,
				24,
				z < 0 ? 2.3 : 0.5,
				0.2,
				"#4e6068",
				0,
				z < 0 ? 1.15 : 0.25,
				z,
			);
		for (const x of [-4, 4])
			for (const z of [-4, 4])
				for (const d of [-1, 1]) {
					this.box(g, 0.18, 0.85, 2.8, "#495563", x, 0.425, z + d * 2.55);
					this.box(g, 0.23, 0.1, 2.8, "#b79d78", x, 0.89, z + d * 2.55);
				}
		for (const x of [-8, 0, 8])
			for (const d of [-1, 1]) {
				this.box(g, 2.8, 0.85, 0.18, "#495563", x + d * 2.55, 0.425, 0);
				this.box(g, 2.8, 0.1, 0.23, "#b79d78", x + d * 2.55, 0.89, 0);
			}
		for (const d of doors) {
			const q = new THREE.Group();
			q.position.set(d.x, 0, d.z);
			if (d.axis === "x") q.rotation.y = Math.PI / 2;
			g.add(q);
			this.box(q, 0.13, 2.2, 0.22, "#c0a278", -1.05, 1.1, 0);
			this.box(q, 0.13, 2.2, 0.22, "#c0a278", 1.05, 1.1, 0);
			this.box(q, 2.2, 0.16, 0.25, "#c0a278", 0, 2.2, 0);
			if (d.locked) {
				this.box(q, 1.95, 1.8, 0.14, "#7f625e", 0, 0.95, 0);
				this.box(q, 0.4, 0.45, 0.19, "#d7b66d", 0, 1.1, 0.14);
				this.label(q, "◇", 0, 1.5, 0.3, 0.5);
			}
			this.doorModels.push(q);
		}
		for (const it of items) this.addItem(it);
		for (const c of candles) {
			const q = this.candle(g, c.x, c.z, true);
			for (const f of q.userData.flames) f.visible = c.lit;
			this.ring(q, 1.9, c.lit ? "#d0a96b" : "#626b6e", 0, 0.09, 0);
		}
		// Stairs are strongly framed in gold and striped risers.
		const stair = (x, z, up) => {
			const q = new THREE.Group();
			q.position.set(x, 0, z);
			g.add(q);
			this.ring(q, 1.1, "#d9bd7f", 0, 0.1, 0);
			for (let i = 0; i < 5; i++)
				this.box(
					q,
					1.3,
					0.16 + i * 0.12,
					0.27,
					"#a29c85",
					0,
					(0.16 + i * 0.12) / 2,
					-0.5 + i * 0.26,
				);
			this.label(q, up ? "↑ UP" : "↓ DOWN", 0, 1.8, 0, 0.6);
		};
		if (f < 2) stair(f === 0 ? 9 : -9, 5, true);
		if (f > 0) stair(f === 1 ? 9 : -9, 5, false);
		if (f === 0) {
			this.box(g, 2.1, 0.16, 0.8, "#c4976b", 0, 0.1, 7.5);
			this.label(g, "THE WAY OUT", 0, 1.1, 7.7, 0.65);
		}
	}
	addItem(it) {
		const q = new THREE.Group();
		q.position.set(it.x, 0.25, it.z);
		this.floorGroup.add(q);
		this.ring(
			q,
			0.65,
			it.type === "shard"
				? "#f2d591"
				: it.type === "key"
					? "#c4a96f"
					: "#9cd2c1",
			0,
			-0.1,
			0,
		);
		if (it.type === "key") {
			const tor = new THREE.Mesh(
				new THREE.TorusGeometry(0.22, 0.075, 6, 16),
				this.mat("#edcc81"),
			);
			tor.position.set(-0.18, 0.65, 0);
			q.add(tor);
			this.box(q, 0.5, 0.1, 0.1, "#edcc81", 0.18, 0.65, 0);
			this.box(q, 0.1, 0.2, 0.1, "#edcc81", 0.38, 0.57, 0);
		} else if (it.type === "ward") {
			this.cylinder(q, 0.05, 0.05, 0.9, "#b5d5bb", 0, 0.6, 0);
			this.box(q, 0.6, 0.1, 0.1, "#dbe1b2", 0, 0.7, 0);
			this.ball(q, 0.16, "#9fcbc1", 0, 1.1, 0);
		} else {
			this.cylinder(q, 0.21, 0.33, 0.5, "#e0b570", 0, 0.65, 0, 6);
			this.ball(q, 0.17, "#f3d59b", 0, 1.05, 0);
			this.ring(q, 0.8, "#a58563", 0, -0.08, 0);
		}
		q.scale.setScalar(1.28);
		this.label(
			q,
			it.type === "shard" ? "URN" : it.type === "key" ? "KEY" : "WARD",
			0,
			1.7,
			0,
			0.46,
			it.type === "shard" ? "#ffe4a6" : "#d7e6cd",
		);
		for (const child of q.children) {
			if (child.isMesh && child.geometry.type !== "RingGeometry")
				child.material = this.mat(
					it.type === "shard"
						? "#f5d28b"
						: it.type === "key"
							? "#f0ce83"
							: "#aedfd0",
					true,
				);
		}
		this.itemModels.set(it.id, q);
		return q;
	}
	sync(state, localIndex = 0) {
		for (let i = 0; i < state.players.length; i++) {
			const p = state.players[i];
			if (!this.playerModels[i]) {
				this.playerModels[i] = this.actor("player", i);
				this.actors.add(this.playerModels[i]);
			}
			const m = this.playerModels[i];
			m.position.set(p.x, 0, p.z);
			m.rotation.y = p.angle || 0;
			m.visible = i < state.playerCount;
			m.userData.body.visible = true;
			for (const child of m.userData.body.children)
				child.visible = p.light > 0 || child.userData.eye === true;
			m.visible =
				m.visible &&
				(p.invincible <= 0 || Math.floor(state.time * 7) % 2 === 0);
			m.userData.mixer.timeScale = p.moving ? 2 : 0.45;
		}
		for (let i = 0; i < state.enemies.length; i++) {
			const e = state.enemies[i];
			if (
				!this.enemyModels[i] ||
				this.enemyModels[i].userData.kind !== e.type
			) {
				if (this.enemyModels[i]) this.actors.remove(this.enemyModels[i]);
				this.enemyModels[i] = this.actor(e.type);
				this.actors.add(this.enemyModels[i]);
			}
			const m = this.enemyModels[i];
			m.position.set(e.x, Math.sin(state.time * 2 + i) * 0.1, e.z);
			m.rotation.y = e.angle || 0;
			m.visible = true;
			m.userData.body.scale.setScalar(e.stun > 0 ? 0.65 : 1);
		}
		for (let i = state.enemies.length; i < this.enemyModels.length; i++)
			this.enemyModels[i].visible = false;
		const active = new Set(
			state.items.filter((i) => !i.taken).map((i) => i.id),
		);
		for (const [id, m] of this.itemModels) {
			const it = state.items.find((item) => item.id === id);
			m.visible =
				active.has(id) &&
				state.players
					.slice(0, state.playerCount)
					.some((p) => p.light > 0 && Math.hypot(p.x - it.x, p.z - it.z) < 8);
		}
		const p = state.players[localIndex];
		if (this.aspect < 0.85 && !this.isTitle) {
			this.camera.position.set(p.x + 23, 34, p.z + 30);
			this.camera.lookAt(p.x, 0, p.z);
		}
		this.lamp.value.set(p.x, 1, p.z);
		this.power.value = p.light > 0 ? 0.55 : 0;
		this.ambient.value = p.light > 0 ? 0.59 : 0.36;
	}
	resize(w, h, mode) {
		const a = w / h;
		this.aspect = a;
		const half = mode === "title" ? (a < 1 ? 20 : 15) : a < 0.85 ? 12.5 : 15.5;
		this.camera.left = -half * a;
		this.camera.right = half * a;
		this.camera.top = half;
		this.camera.bottom = -half;
		this.camera.updateProjectionMatrix();
		if (mode !== "title" && a >= 0.85) {
			this.camera.position.set(23, 34, 30);
			this.camera.lookAt(0, 0, 0);
		}
	}
	mode(title) {
		this.isTitle = title;
		this.titleGroup.visible = title;
		this.floorGroup.visible = !title;
		this.actors.visible = !title;
		if (title) {
			this.camera.position.set(25, 23, 34);
			this.camera.lookAt(-6, 5, 0);
			this.power.value = 0;
			this.ambient.value = 0.99;
		} else {
			this.camera.position.set(23, 34, 30);
			this.camera.lookAt(0, 0, 0);
		}
	}
	update(dt, t) {
		for (const m of this.mixers) m.update(this.reducedMotion ? 0 : dt);
		for (const [id, m] of this.itemModels) {
			m.rotation.y = t * 0.7;
			m.position.y = 0.15 + Math.sin(t * 2 + id.length) * 0.12;
		}
		for (const s of this.sparks) s.scale.y = 1.4 + Math.sin(t * 9 + s.id) * 0.3;
		this.dustMesh.rotation.y = t * 0.007;
	}
}
