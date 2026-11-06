import * as T from "three/webgpu";

const C = {
	ink: 0x182b31,
	sand: 0xe4c78d,
	cream: 0xfff2cf,
	teal: 0x2d7973,
	dark: 0x173e42,
	orange: 0xe9a147,
	yellow: 0xffd34e,
	coral: 0xef7059,
};
const rand = (s) => () => {
	s = (Math.imul(s, 1664525) + 1013904223) | 0;
	return (s >>> 0) / 4294967296;
};
export class View {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new T.Scene();
		this.scene.background = new T.Color(0x367b78);
		this.scene.fog = new T.Fog(0x367b78, 70, 130);
		this.camera = new T.OrthographicCamera(-24, 24, 14, -14, 0.1, 180);
		this.camera.position.set(0, 38, 27);
		this.camera.lookAt(0, 0, 0);
		this.renderer = new T.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = T.PCFSoftShadowMap;
		this.renderer.outputColorSpace = T.SRGBColorSpace;
		this.renderer.toneMapping = T.NoToneMapping;
		this.materials = new Map();
		const data = new Uint8Array([
			70, 70, 70, 255, 155, 155, 155, 255, 255, 255, 255, 255,
		]);
		this.gradient = new T.DataTexture(data, 3, 1);
		this.gradient.needsUpdate = true;
		this.gradient.minFilter = T.NearestFilter;
		this.gradient.magFilter = T.NearestFilter;
		this.ink = new T.LineBasicNodeMaterial({
			color: C.ink,
			transparent: true,
			opacity: 0.8,
		});
		this.scene.add(new T.HemisphereLight(0xfff0cf, 0x477d77, 2.7));
		const sun = new T.DirectionalLight(0xfff0cc, 3.1);
		sun.position.set(-13, 30, 18);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -26;
		sun.shadow.camera.right = 26;
		sun.shadow.camera.top = 23;
		sun.shadow.camera.bottom = -23;
		sun.shadow.normalBias = 0.035;
		sun.shadow.bias = -0.00015;
		this.scene.add(sun);
		this.stage = new T.Group();
		this.scene.add(this.stage);
		this.arenaGroup = new T.Group();
		this.stage.add(this.arenaGroup);
		this.tanks = new Map();
		this.shells = new Map();
		this.pickups = new Map();
		this.effects = [];
		this.trails = [];
		this.mixers = [];
		this.time = 0;
		this.shake = 0;
		this.title = true;
		this.target = new T.Vector3();
		this.raycaster = new T.Raycaster();
		this.ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
		this.hit = new T.Vector3();
		this.geometries = {
			box: new T.BoxGeometry(1, 1, 1),
			sphere: new T.IcosahedronGeometry(1, 1),
			cyl: new T.CylinderGeometry(1, 1, 1, 12),
			ring: new T.TorusGeometry(1, 0.035, 5, 40),
		};
		this.makeTable();
		this.makeAim();
		window.addEventListener("resize", () => this.resize());
		this.resize();
	}
	async init(draw = true) {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL 2";
		if (draw) this.renderer.render(this.scene, this.camera);
	}
	mat(c, extra = {}) {
		const key = c + JSON.stringify(extra);
		if (!this.materials.has(key))
			this.materials.set(
				key,
				new T.MeshToonNodeMaterial({
					color: c,
					gradientMap: this.gradient,
					...extra,
				}),
			);
		return this.materials.get(key);
	}
	mesh(g, c, parent, x = 0, y = 0, z = 0, outline = false) {
		const m = new T.Mesh(g, this.mat(c));
		m.position.set(x, y, z);
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		if (outline) {
			const e = new T.LineSegments(new T.EdgesGeometry(g, 25), this.ink);
			m.add(e);
		}
		return m;
	}
	box(parent, x, y, z, w, h, d, c, outline = true) {
		const m = this.mesh(
			new T.BoxGeometry(w, h, d),
			c,
			parent,
			x,
			y,
			z,
			outline,
		);
		return m;
	}
	cyl(parent, x, y, z, r, h, c) {
		return this.mesh(
			new T.CylinderGeometry(r, r, h, 12),
			c,
			parent,
			x,
			y,
			z,
			true,
		);
	}
	label(text, w = 4, h = 1, color = "#173e42", bg = null) {
		const canvas = document.createElement("canvas");
		canvas.width = 512;
		canvas.height = Math.round((512 * h) / w);
		const ctx = canvas.getContext("2d");
		if (bg) {
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		ctx.fillStyle = color;
		ctx.font = `900 ${Math.round(canvas.height * 0.65)}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, 256, canvas.height * 0.52, 490);
		const tex = new T.CanvasTexture(canvas);
		tex.colorSpace = T.SRGBColorSpace;
		const sample = T.TSL.texture(tex);
		const material = new T.MeshBasicNodeMaterial({
			transparent: !bg,
			depthWrite: !!bg,
		});
		material.colorNode = sample.rgb;
		material.opacityNode = sample.a;
		const mesh = new T.Mesh(new T.PlaneGeometry(w, h), material);
		mesh.userData.labelTexture = tex;
		return mesh;
	}
	makeTable() {
		const base = this.stage;
		this.box(base, 0, -1.35, 0, 39.6, 1.5, 27.6, C.ink);
		this.box(base, 0, -0.5, 0, 39.2, 0.5, 27.2, 0xd58a49);
		this.box(base, 0, -0.18, 0, 38.7, 0.3, 26.7, C.cream);
		const canvas = document.createElement("canvas");
		canvas.width = 1024;
		canvas.height = 768;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#e8ce95";
		ctx.fillRect(0, 0, 1024, 768);
		const r = rand(1977);
		for (let i = 0; i < 9000; i++) {
			ctx.fillStyle = i % 2 ? "rgba(60,66,45,.045)" : "rgba(255,252,210,.18)";
			ctx.fillRect(r() * 1024, r() * 768, r() * 2 + 1, r() * 2 + 1);
		}
		ctx.strokeStyle = "rgba(100,98,61,.10)";
		ctx.lineWidth = 1;
		for (let x = 0; x < 1024; x += 64) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, 768);
			ctx.stroke();
		}
		for (let y = 0; y < 768; y += 64) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(1024, y);
			ctx.stroke();
		}
		const texture = new T.CanvasTexture(canvas);
		texture.colorSpace = T.SRGBColorSpace;
		this.floor = new T.Mesh(
			new T.BoxGeometry(36, 0.18, 24),
			new T.MeshToonNodeMaterial({
				map: texture,
				color: 0xffffff,
				gradientMap: this.gradient,
			}),
		);
		this.floor.position.y = -0.03;
		this.floor.receiveShadow = true;
		base.add(this.floor);
		const title = this.label(
			"COMBRISK   /   FIELD OPERATIONS",
			12,
			0.65,
			"#8c7956",
		);
		title.rotation.x = -Math.PI / 2;
		title.position.set(0, 0.071, 10.85);
		base.add(title);
		const under = this.label("77", 2.4, 1.6, "#d4b67b");
		under.rotation.x = -Math.PI / 2;
		under.position.set(0, 0.075, 0);
		base.add(under);
		const _plank = this.box(base, 0, -0.1, 12.8, 9, 0.42, 0.7, C.ink);
		const plate = this.label("THE WEEKEND WAR DEPT.", 7, 0.48, "#f8e7b7");
		plate.position.set(0, -0.05, 13.18);
		base.add(plate);
		for (const [x, z] of [
			[-18, -12],
			[18, -12],
			[-18, 12],
			[18, 12],
		]) {
			this.cyl(base, x, 0.2, z, 0.16, 0.7, C.ink);
			this.cyl(base, x, 0.58, z, 0.24, 0.12, C.orange);
		}
		this.backdrop = new T.Mesh(
			new T.PlaneGeometry(250, 250),
			this.mat(0x367b78),
		);
		this.backdrop.rotation.x = -Math.PI / 2;
		this.backdrop.position.y = -3.5;
		this.backdrop.receiveShadow = true;
		this.scene.add(this.backdrop);
		for (const side of [-1, 1]) {
			for (let i = 0; i < 7; i++) {
				const z = -9 + i * 3;
				this.box(
					base,
					side * 19.1,
					0.16,
					z,
					0.22,
					0.2,
					1.45,
					i % 2 ? C.ink : C.orange,
					false,
				);
			}
			for (const z of [-11, 11]) {
				this.box(base, side * 18.9, 0.3, z, 0.7, 0.65, 0.7, C.ink);
				const _screw = this.cyl(
					base,
					side * 18.9,
					0.68,
					z,
					0.15,
					0.08,
					C.cream,
				);
			}
		}
		this.makeScenery();
	}
	makeScenery() {
		const r = rand(3442),
			g = this.stage;
		for (let i = 0; i < 24; i++) {
			const x = (r() - 0.5) * 34,
				z = (r() - 0.5) * 22;
			if (Math.abs(x) < 14 && Math.abs(z) < 9) continue;
			const a = this.mesh(
				new T.DodecahedronGeometry(0.12 + r() * 0.26, 0),
				0xa7a170,
				g,
				x,
				0.14,
				z,
				true,
			);
			a.scale.y = 0.5;
			a.rotation.y = r() * 6;
		}
		for (const [x, z] of [
			[-17, -10],
			[16, 9],
			[17, -8],
			[-15, 10],
		]) {
			const c = new T.Group();
			c.position.set(x, 0, z);
			g.add(c);
			this.cyl(c, 0, 0.85, 0, 0.17, 1.7, C.teal);
			const arm = this.cyl(c, 0.38, 0.93, 0, 0.12, 0.5, C.teal);
			arm.rotation.z = Math.PI / 2;
			this.cyl(c, 0.63, 1.15, 0, 0.12, 0.45, C.teal);
			const arm2 = this.cyl(c, -0.3, 0.6, 0, 0.1, 0.5, C.teal);
			arm2.rotation.z = Math.PI / 2;
			this.cyl(c, -0.52, 0.78, 0, 0.1, 0.4, C.teal);
			this.box(c, 0, 0.1, 0, 0.8, 0.15, 0.65, 0xc4ab78, false);
		}
		for (const [x, z, c] of [
			[-19.9, -8, C.coral],
			[19.9, 8, C.teal],
		]) {
			this.cyl(g, x, 2, z, 0.07, 4.3, C.ink);
			const flag = this.box(g, x + 0.7, 3.8, z, 1.4, 0.75, 0.045, c);
			flag.rotation.z = -0.06;
			this.cyl(g, x, 0.05, z, 0.55, 0.14, C.ink);
		}
		const radio = new T.Group();
		radio.position.set(23, -2, 8);
		radio.rotation.y = -0.25;
		g.add(radio);
		this.box(radio, 0, 0.5, 0, 3.2, 1.7, 2, C.ink);
		this.box(radio, 0, 1.4, 0.1, 2.8, 0.12, 1.6, C.teal);
		this.cyl(radio, -0.7, 1.55, 0, 0.2, 0.18, C.cream);
		const ant = this.cyl(radio, 0.8, 3, 0, 0.035, 3, C.ink);
		ant.rotation.z = -0.2;
		for (let i = 0; i < 4; i++)
			this.box(radio, -0.7, 0.5, 1.015, 1.4, 0.07, 0.03, 0x467a78, false);
		this.cyl(radio, 0.9, 0.55, 1, 0.23, 0.15, C.orange).rotation.x =
			Math.PI / 2;
		const _cup = this.cyl(g, -24, -1, 9, 0.85, 2.5, C.cream);
		this.cyl(g, -24, 0.28, 9, 0.68, 0.05, C.ink);
		const h = new T.Mesh(
			new T.TorusGeometry(0.65, 0.15, 8, 18),
			this.mat(C.cream),
		);
		h.position.set(-22.9, -0.7, 9);
		g.add(h);
	}
	disposeGroup(g) {
		g.traverse((o) => {
			if (o.geometry) o.geometry.dispose();
			if (
				o.material &&
				!Array.isArray(o.material) &&
				o.material.map &&
				!this.materials.has(o.material)
			) {
			}
		});
		g.clear();
	}
	arena(level, obstacles = []) {
		for (const f of this.effects) {
			this.scene.remove(f.m);
			f.m.geometry?.dispose();
			f.m.userData.labelTexture?.dispose();
		}
		this.effects = [];
		this.shake = 0;
		this.disposeGroup(this.arenaGroup);
		this.blockMeshes = new Map();
		const g = this.arenaGroup;
		const air = level.vehicle === "plane";
		this.floor.material.color.set(
			air ? 0xd1e6cd : level.ghost ? 0xbfc4a0 : 0xffffff,
		);
		for (const o of obstacles) {
			if (o.border) {
				this.box(g, o.x, 0.33, o.z, o.w, 0.65, o.d, air ? C.teal : 0xa48c65);
				for (let v = -o.w / 2 + 1; v < o.w / 2; v += 2.3)
					if (o.w > 3)
						this.box(
							g,
							o.x + v,
							0.7,
							o.z,
							0.7,
							0.07,
							o.d * 0.9,
							0xd8b275,
							false,
						);
				continue;
			}
			const group = new T.Group();
			group.position.set(o.x, 0, o.z);
			g.add(group);
			this.blockMeshes.set(o.id, group);
			if (o.crate) {
				this.box(group, 0, 0.65, 0, o.w, 1.3, o.d, 0xbf8451);
				this.box(group, 0, 0.69, 0, o.w + 0.05, 0.13, o.d + 0.05, 0xe4b271);
				const a = this.box(
					group,
					0,
					0.67,
					o.d / 2 + 0.014,
					o.w * 0.85,
					0.12,
					0.04,
					C.ink,
					false,
				);
				a.rotation.z = 0.52;
				const b = a.clone();
				b.rotation.z = -0.52;
				group.add(b);
				this.box(group, 0, 1.32, 0, o.w + 0.1, 0.12, o.d + 0.1, 0xe8c28b);
			} else {
				const h = o.h || 1.35;
				this.box(
					group,
					0,
					h * 0.5,
					0,
					o.w,
					h,
					o.d,
					level.ghost ? 0x648c80 : 0xb69663,
				);
				this.box(
					group,
					0,
					h + 0.07,
					0,
					o.w + 0.14,
					0.16,
					o.d + 0.14,
					level.ghost ? 0x9fbea1 : 0xf2dcab,
				);
				const n = Math.floor(Math.max(o.w, o.d) / 1.5);
				for (let i = 0; i < n; i++) {
					if (o.w > o.d)
						this.box(
							group,
							-o.w / 2 + ((i + 0.5) * o.w) / n,
							h * 0.36,
							o.d / 2 + 0.012,
							0.025,
							h * 0.65,
							0.025,
							0x756f56,
							false,
						);
					else
						this.box(
							group,
							o.w / 2 + 0.012,
							h * 0.36,
							-o.d / 2 + ((i + 0.5) * o.d) / n,
							0.025,
							h * 0.65,
							0.025,
							0x756f56,
							false,
						);
				}
			}
		}
		if (air) {
			for (const [x, z, s] of [
				[-6, -3, 1],
				[7, 3, 1.3],
				[0, 7, 0.65],
			]) {
				const cloud = new T.Group();
				cloud.position.set(x, 2.6, z);
				g.add(cloud);
				for (let i = 0; i < 5; i++) {
					const c = this.mesh(
						new T.IcosahedronGeometry((1.4 + (i % 2) * 0.5) * s, 1),
						0xe8f1d7,
						cloud,
						(i - 2) * 1.1,
						0.1 + (i % 2) * 0.4,
						0,
						false,
					);
					c.scale.set(1, 0.3, 1);
				}
				cloud.userData.cloud = true;
			}
			for (const [x, z] of [
				[-12, -6],
				[13, 5],
			]) {
				this.cyl(g, x, 2, z, 0.035, 4, C.ink);
				const balloon = this.mesh(
					new T.SphereGeometry(0.6, 10, 8),
					C.coral,
					g,
					x,
					4.3,
					z,
					true,
				);
				balloon.scale.y = 1.3;
			}
		}
		this.level = level;
	}
	makeTank(t) {
		const root = new T.Group(),
			body = new T.Group();
		root.add(body);
		this.scene.add(root);
		const color = t.color;
		const chassis = this.box(body, 0, 0.66, 0, 1.35, 0.45, 1.65, color);
		const nose = this.box(body, 0, 0.96, -0.12, 1.18, 0.22, 1.3, color);
		nose.rotation.x = 0.06;
		for (const x of [-0.78, 0.78]) {
			this.box(body, x, 0.39, 0, 0.4, 0.6, 1.92, C.ink);
			for (let i = 0; i < 5; i++) {
				const wh = this.cyl(
					body,
					x,
					0.38,
					-0.72 + i * 0.36,
					0.2,
					0.44,
					0x566b64,
				);
				wh.rotation.z = Math.PI / 2;
			}
			for (let i = 0; i < 8; i++) {
				this.box(
					body,
					x,
					0.72,
					-0.81 + i * 0.23,
					0.44,
					0.075,
					0.1,
					0x3e5352,
					false,
				);
			}
			this.box(body, x, 0.82, -0.1, 0.48, 0.12, 1.9, color);
		}
		const turret = new T.Group();
		turret.name = "turret";
		turret.position.set(0, 1.1, -0.03);
		root.add(turret);
		this.cyl(turret, 0, 0.02, 0, 0.5, 0.32, color);
		const _cap = this.cyl(turret, 0, 0.23, 0.06, 0.23, 0.12, C.ink);
		this.cyl(turret, 0, 0.3, 0.06, 0.18, 0.07, C.cream);
		const barrel = new T.Group();
		barrel.name = "barrel";
		turret.add(barrel);
		const gun = this.cyl(barrel, 0, 0.06, -0.69, 0.14, 1.2, color);
		gun.rotation.x = Math.PI / 2;
		this.box(barrel, 0, 0.06, -1.32, 0.31, 0.29, 0.2, C.ink);
		this.box(barrel, 0, 0.06, -1.43, 0.14, 0.13, 0.025, C.cream, false);
		this.box(body, -0.4, 1.1, 0.68, 0.25, 0.12, 0.15, C.yellow);
		this.box(body, 0.4, 1.1, 0.68, 0.25, 0.12, 0.15, C.yellow);
		this.cyl(body, -0.45, 1.43, 0.49, 0.027, 0.6, C.ink);
		const flag = this.box(
			body,
			-0.33,
			1.65,
			0.5,
			0.27,
			0.19,
			0.035,
			color,
			false,
		);
		flag.rotation.z = -0.1;
		const _stripe = this.box(
			body,
			0,
			0.92,
			0.63,
			0.26,
			0.02,
			0.35,
			C.cream,
			false,
		);
		const badge = this.label(String(t.id + 1), 0.5, 0.45, "#fff3ce");
		badge.rotation.x = -Math.PI / 2;
		badge.position.set(0, 0.904, 0.58);
		body.add(badge);
		const mixer = new T.AnimationMixer(root);
		const recoil = new T.AnimationClip("cannon-kick", 0.24, [
			new T.NumberKeyframeTrack(
				"barrel.position[z]",
				[0, 0.035, 0.24],
				[0, 0.22, 0],
			),
		]);
		const kick = mixer.clipAction(recoil);
		kick.setLoop(T.LoopOnce);
		kick.clampWhenFinished = true;
		const idle = new T.AnimationClip("engine-rumble", 0.7, [
			new T.NumberKeyframeTrack(
				`${chassis.uuid}.position[y]`,
				[0, 0.175, 0.35, 0.525, 0.7],
				[0.66, 0.68, 0.66, 0.65, 0.66],
			),
		]);
		const idleAct = mixer.clipAction(idle);
		idleAct.play();
		const shadow = this.shadow(0.95);
		root.add(shadow);
		const ring = this.ring(color, 1.2);
		ring.rotation.x = Math.PI / 2;
		ring.position.y = 0.09;
		root.add(ring);
		const health = new T.Group();
		health.position.set(0, 2.35, 0);
		root.add(health);
		for (let i = 0; i < 3; i++) {
			const dot = this.box(
				health,
				(i - 1) * 0.27,
				0,
				0,
				0.18,
				0.13,
				0.18,
				C.cream,
				false,
			);
			dot.userData.hp = i;
		}
		const entry = {
			root,
			body,
			turret,
			mixer,
			kick,
			health,
			ring,
			shadow,
			plane: false,
			baseY: 0,
		};
		this.tanks.set(t.id, entry);
		return entry;
	}
	makePlane(t) {
		const root = new T.Group(),
			body = new T.Group();
		body.name = "airframe";
		root.add(body);
		this.scene.add(root);
		const c = t.color;
		const fus = this.mesh(
			new T.CylinderGeometry(0.29, 0.46, 2.5, 8),
			c,
			body,
			0,
			0.65,
			0,
			true,
		);
		fus.rotation.x = Math.PI / 2;
		this.box(body, 0, 0.6, -0.15, 3.8, 0.12, 0.7, c);
		this.box(body, 0, 1.34, -0.15, 3.8, 0.12, 0.7, c);
		for (const x of [-1.4, 1.4]) {
			this.box(body, x, 0.97, -0.35, 0.055, 0.67, 0.05, C.ink, false);
			this.box(body, x, 0.97, 0.15, 0.055, 0.67, 0.05, C.ink, false);
			this.box(body, x, 1.412, -0.15, 0.38, 0.02, 0.66, C.cream, false);
		}
		this.box(body, 0, 0.73, 1.18, 1.55, 0.09, 0.49, c);
		this.box(body, 0, 1, 1.03, 0.1, 0.75, 0.55, c);
		this.cyl(body, 0, 1.03, 0.26, 0.23, 0.15, C.ink);
		const _head = this.mesh(
			new T.SphereGeometry(0.17, 8, 8),
			C.cream,
			body,
			0,
			1.18,
			0.33,
			true,
		);
		const prop = new T.Group();
		prop.name = "prop";
		prop.position.set(0, 0.66, -1.4);
		body.add(prop);
		this.box(prop, 0, 0, 0, 0.09, 1.45, 0.09, C.ink);
		this.cyl(prop, 0, 0, -0.08, 0.16, 0.21, C.cream).rotation.x = Math.PI / 2;
		const mixer = new T.AnimationMixer(root);
		mixer
			.clipAction(
				new T.AnimationClip("propeller", 0.09, [
					new T.NumberKeyframeTrack(
						"prop.rotation[z]",
						[0, 0.09],
						[0, Math.PI * 2],
					),
				]),
			)
			.play();
		const roll = mixer.clipAction(
			new T.AnimationClip("barrel-roll", 0.55, [
				new T.NumberKeyframeTrack(
					"airframe.rotation[z]",
					[0, 0.55],
					[0, Math.PI * 2],
				),
			]),
		);
		roll.setLoop(T.LoopOnce);
		roll.clampWhenFinished = true;
		const shadow = this.shadow(1.2);
		shadow.position.y = -2.85;
		root.add(shadow);
		const ring = this.ring(c, 1.4);
		ring.rotation.x = Math.PI / 2;
		ring.position.y = -2.88;
		root.add(ring);
		const health = new T.Group();
		health.position.y = 2;
		root.add(health);
		for (let i = 0; i < 3; i++)
			this.box(health, (i - 1) * 0.27, 0, 0, 0.18, 0.13, 0.18, C.cream, false);
		const entry = {
			root,
			body,
			turret: body,
			mixer,
			kick: roll,
			health,
			ring,
			shadow,
			plane: true,
			baseY: 3,
		};
		this.tanks.set(t.id, entry);
		return entry;
	}
	shadow(r) {
		const m = new T.Mesh(
			new T.CircleGeometry(r, 24),
			new T.MeshBasicNodeMaterial({
				color: C.ink,
				transparent: true,
				opacity: 0.2,
				depthWrite: false,
			}),
		);
		m.rotation.x = -Math.PI / 2;
		m.position.y = 0.09;
		return m;
	}
	ring(color, r) {
		return new T.Mesh(
			new T.TorusGeometry(r, 0.028, 5, 40),
			new T.MeshBasicNodeMaterial({ color, transparent: true, opacity: 0.6 }),
		);
	}
	sync(state, dt) {
		for (const t of state.tanks) {
			let e = this.tanks.get(t.id);
			if (!e || e.plane !== (state.vehicle === "plane")) {
				if (e) {
					this.scene.remove(e.root);
					e.mixer.stopAllAction();
					this.disposeGroup(e.root);
				}
				e = state.vehicle === "plane" ? this.makePlane(t) : this.makeTank(t);
			}
			e.root.visible = t.alive;
			e.root.position.set(t.x, e.baseY, t.z);
			e.body.rotation.y = t.angle;
			if (!e.plane) e.turret.rotation.y = t.aim;
			else e.body.rotation.y = t.aim;
			const hidden =
				state.ghost && t.reveal <= 0 && (state.mode === "local" || !t.local);
			e.root.visible = t.alive && !hidden;
			if (t.invuln > 0 && Math.sin(this.time * 25) > 0.3)
				e.root.visible = false;
			e.ring.material.opacity = t.shield ? 0.95 : 0.32;
			e.ring.scale.setScalar(
				t.shield ? 1.2 + Math.sin(this.time * 6) * 0.04 : 1,
			);
			e.health.children.forEach((o, i) => {
				o.visible = i < t.hp;
			});
			e.health.rotation.y = -e.root.rotation.y;
			e.mixer.update(dt);
			if (t.dash > 0 && !e.wasDash && e.plane) {
				e.kick.reset().play();
			}
			e.wasDash = t.dash > 0;
			if (t.fireSeq !== e.fireSeq) {
				if (e.fireSeq !== undefined && !e.plane) e.kick.reset().play();
				e.fireSeq = t.fireSeq;
			}
		}
		for (const [id, e] of this.tanks)
			if (!state.tanks.some((t) => t.id === id)) {
				this.scene.remove(e.root);
				this.disposeGroup(e.root);
				this.tanks.delete(id);
			}
		const active = new Set();
		for (const b of state.bullets) {
			active.add(b.id);
			let e = this.shells.get(b.id);
			if (!e) {
				e = new T.Group();
				const _core = this.mesh(
					new T.SphereGeometry(0.145, 7, 6),
					b.banks ? C.yellow : C.cream,
					e,
					0,
					0,
					0,
					false,
				);
				const tail = this.mesh(
					new T.ConeGeometry(0.13, 0.8, 5),
					b.color,
					e,
					0,
					0,
					0.38,
					false,
				);
				tail.rotation.x = -Math.PI / 2;
				this.scene.add(e);
				this.shells.set(b.id, e);
			}
			e.position.set(b.x, state.vehicle === "plane" ? 3.7 : 0.9, b.z);
			e.rotation.y = Math.atan2(-b.vx, -b.vz);
		}
		for (const [id, e] of this.shells)
			if (!active.has(id)) {
				this.scene.remove(e);
				this.disposeGroup(e);
				this.shells.delete(id);
			}
		const pActive = new Set();
		for (const p of state.pickups) {
			pActive.add(p.id);
			let e = this.pickups.get(p.id);
			if (!e) {
				e = new T.Group();
				this.scene.add(e);
				this.pickups.set(p.id, e);
				const color =
					p.type === "repair"
						? 0x71c69a
						: p.type === "shield"
							? 0x7fcce4
							: C.yellow;
				const _shape = this.mesh(
					new T.OctahedronGeometry(0.53),
					color,
					e,
					0,
					0.8,
					0,
					true,
				);
				const badge = this.label(
					p.type === "repair" ? "+" : p.type === "shield" ? "S" : "!",
					0.6,
					0.6,
					"#173e42",
					"#fff0cb",
				);
				badge.position.set(0, 0.8, 0.42);
				e.add(badge);
				const ring = this.ring(color, 0.75);
				ring.rotation.x = Math.PI / 2;
				ring.position.y = 0.1;
				e.add(ring);
			}
			e.position.set(
				p.x,
				state.vehicle === "plane" ? 2.4 : Math.sin(this.time * 3) * 0.12,
				p.z,
			);
			e.rotation.y = this.time * 0.7;
		}
		for (const [id, e] of this.pickups)
			if (!pActive.has(id)) {
				this.scene.remove(e);
				this.disposeGroup(e);
				this.pickups.delete(id);
			}
		for (const [id, m] of this.blockMeshes || [])
			m.visible = !state.destroyed.includes(id);
	}
	makeAim() {
		this.aim = new T.Group();
		this.scene.add(this.aim);
		this.aim.visible = false;
		this.aimDots = [];
		for (let i = 0; i < 28; i++) {
			const m = new T.Mesh(
				new T.SphereGeometry(i % 3 === 0 ? 0.07 : 0.04, 5, 4),
				new T.MeshBasicNodeMaterial({
					color: C.cream,
					transparent: true,
					opacity: 0.6,
				}),
			);
			this.aim.add(m);
			this.aimDots.push(m);
		}
		this.reticle = this.ring(C.cream, 0.38);
		this.reticle.rotation.x = -Math.PI / 2;
		this.scene.add(this.reticle);
		this.reticle.visible = false;
		for (const [x, z] of [
			[0.6, 0],
			[-0.6, 0],
			[0, 0.6],
			[0, -0.6],
		])
			this.box(this.reticle, x, z, 0, 0.12, 0.04, 0.02, C.cream, false);
	}
	aimPath(points, reticle = null, plane = false) {
		this.aim.visible = points.length > 0;
		const y = plane ? 3.65 : 0.18;
		this.aimDots.forEach((m, i) => {
			m.visible = !!points[i];
			if (points[i]) m.position.set(points[i].x, y, points[i].z);
		});
		this.reticle.visible = !!reticle;
		if (reticle) this.reticle.position.set(reticle.x, y + 0.02, reticle.z);
	}
	mouseWorld(mouse) {
		this.raycaster.setFromCamera(
			new T.Vector2(
				(mouse.x / innerWidth) * 2 - 1,
				1 - (mouse.y / innerHeight) * 2,
			),
			this.camera,
		);
		this.raycaster.ray.intersectPlane(this.ground, this.hit);
		return { x: this.hit.x, z: this.hit.z };
	}
	fx(type, x, z, color = C.yellow, extra = {}) {
		const y = extra.air ? 3.6 : 0.8;
		if (type === "shot") {
			const ring = this.ring(C.cream, 0.3);
			ring.position.set(x, y, z);
			ring.rotation.x = Math.PI / 2;
			this.scene.add(ring);
			this.effects.push({ m: ring, life: 0.15, max: 0.15, kind: "ring" });
			return;
		}
		if (type === "dust") {
			const m = this.mesh(
				new T.IcosahedronGeometry(0.18, 0),
				0xcebc90,
				this.scene,
				x,
				0.22,
				z,
				false,
			);
			this.effects.push({
				m,
				life: 0.5,
				max: 0.5,
				kind: "dust",
				vx: (Math.random() - 0.5) * 0.4,
				vz: (Math.random() - 0.5) * 0.4,
				vy: 0.6,
			});
			return;
		}
		if (
			type === "boom" ||
			type === "hit" ||
			type === "crate" ||
			type === "bounce" ||
			type === "pickup" ||
			type === "boost"
		) {
			if (type === "boom") this.shake = Math.max(this.shake, 0.22);
			else if (type === "hit") this.shake = Math.max(this.shake, 0.08);
			const count =
				type === "boom"
					? 22
					: type === "crate"
						? 12
						: type === "bounce"
							? 5
							: 8;
			for (let i = 0; i < count; i++) {
				const a = Math.random() * 6.28,
					s = type === "boom" ? 2 + Math.random() * 6 : 1 + Math.random() * 3;
				const m = this.mesh(
					new T.BoxGeometry(
						0.15 + Math.random() * 0.12,
						0.15 + Math.random() * 0.16,
						0.15 + Math.random() * 0.16,
					),
					i % 3 === 0 ? C.ink : i % 2 ? color : C.cream,
					this.scene,
					x,
					y,
					z,
					false,
				);
				m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
				this.effects.push({
					m,
					life: 0.35 + Math.random() * 0.6,
					max: 1,
					kind: "particle",
					vx: Math.cos(a) * s,
					vz: Math.sin(a) * s,
					vy: 2 + Math.random() * 4,
				});
			}
			const r = this.ring(color, type === "boom" ? 0.6 : 0.25);
			r.position.set(x, y, z);
			r.rotation.x = Math.PI / 2;
			this.scene.add(r);
			this.effects.push({ m: r, life: 0.4, max: 0.4, kind: "ring" });
			if (type === "boom") {
				const text = this.label(
					extra.bank ? "BANK!" : "POP!",
					3,
					1,
					"#173e42",
					"#ffd34e",
				);
				text.position.set(x, y + 1, z);
				text.rotation.x = -0.45;
				this.scene.add(text);
				this.effects.push({ m: text, life: 1, max: 1, kind: "text" });
			}
		}
	}
	update(dt, title = false) {
		this.time += dt;
		this.title = title;
		const desiredX = title ? -8 : 0;
		this.target.x += (desiredX - this.target.x) * Math.min(1, dt * 3);
		const offset = this.shake;
		this.shake = Math.max(0, this.shake - dt * 0.7);
		this.camera.position.set(
			this.target.x + Math.sin(this.time * 80) * offset,
			38,
			27 + Math.cos(this.time * 91) * offset,
		);
		this.camera.lookAt(this.target.x, 0, 0);
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const f = this.effects[i];
			f.life -= dt;
			if (f.life <= 0) {
				this.scene.remove(f.m);
				if (f.m.geometry) f.m.geometry.dispose();
				if (f.m.userData.labelTexture) f.m.userData.labelTexture.dispose();
				this.effects.splice(i, 1);
				continue;
			}
			if (f.kind === "ring") {
				f.m.scale.multiplyScalar(1 + dt * 5);
				f.m.material.opacity = f.life / f.max;
			} else if (f.kind === "text") {
				f.m.position.y += dt * 0.9;
				f.m.scale.setScalar(0.85 + Math.sin((1 - f.life) * 3) * 0.25);
			} else {
				f.m.position.x += (f.vx || 0) * dt;
				f.m.position.z += (f.vz || 0) * dt;
				f.m.position.y += (f.vy || 0) * dt;
				f.vy -= dt * 9;
				f.m.rotation.x += dt * 3;
				f.m.rotation.z += dt * 2;
				f.m.scale.setScalar(Math.min(1, f.life * 3));
			}
		}
	}
	resize() {
		const a = innerWidth / innerHeight;
		let h = 14.7;
		if (a < 1.3) h = 21 / a;
		this.camera.left = -h * a;
		this.camera.right = h * a;
		this.camera.top = h;
		this.camera.bottom = -h;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(innerWidth, innerHeight);
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
}
export { C, T };
