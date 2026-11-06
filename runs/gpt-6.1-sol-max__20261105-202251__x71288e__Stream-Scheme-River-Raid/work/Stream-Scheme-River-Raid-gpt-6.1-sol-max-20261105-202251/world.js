import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

export const LENGTH = 5400;
export const BRIDGES = [1580, 3260];
export const ISLANDS = [
	[690, 940],
	[1990, 2280],
	[2680, 2890],
	[3810, 4100],
];
export const COLORS = ["#f3df6c", "#f47865", "#90d6ec", "#be9be7"];
export function riverAt(s) {
	return {
		center: Math.sin(s * 0.0037) * 8 + Math.sin(s * 0.0101) * 3,
		width: 20 + Math.sin(s * 0.0052) * 3.8 + Math.cos(s * 0.012) * 1.3,
	};
}
export function islandAt(s) {
	for (const [a, b] of ISLANDS)
		if (s > a && s < b)
			return {
				x: riverAt(s).center,
				width: Math.sin(((s - a) / (b - a)) * Math.PI) * 5.4,
			};
	return null;
}
export function bankSafe(x, s, margin = 1.1) {
	const r = riverAt(s),
		island = islandAt(s);
	return (
		Math.abs(x - r.center) < r.width - margin &&
		(!island || Math.abs(x - island.x) > island.width + margin)
	);
}
export function safeLane(s, side = -1) {
	const r = riverAt(s),
		island = islandAt(s);
	return (
		r.center +
		(island ? side * (island.width + (r.width - island.width) * 0.5) : 0)
	);
}
function rng(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class RiverView {
	constructor(renderer, root) {
		this.renderer = renderer;
		this.root = root;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#75c4b9");
		this.scene.fog = new THREE.Fog("#75c4b9", 180, 340);
		this.camera = new THREE.OrthographicCamera(-48, 48, 31, -31, 0.1, 500);
		this.camera.position.set(0, 75, 50);
		this.camera.lookAt(0, 0, -17);
		this.mats = new Map();
		this.mixers = [];
		this.units = new Map();
		this.bullets = new Map();
		this.fx = [];
		this.ripples = [];
		this.scenery = new THREE.Group();
		this.scene.add(this.scenery);
		this.light = new THREE.DirectionalLight("#fff3ce", 3);
		this.light.position.set(-30, 80, 30);
		this.scene.add(this.light);
		this.scene.add(new THREE.HemisphereLight("#daf5e7", "#28394b", 2));
		this.ink = new THREE.MeshBasicMaterial({
			color: "#142d38",
			side: THREE.BackSide,
		});
		this.shadowMat = new THREE.MeshBasicMaterial({
			color: "#123d43",
			transparent: true,
			opacity: 0.23,
			depthWrite: false,
		});
		this.flatWhite = new THREE.MeshBasicMaterial({ color: "#fff5cf" });
		this.geometry = {
			box: new THREE.BoxGeometry(1, 1, 1),
			sphere: new THREE.IcosahedronGeometry(1, 1),
			cone: new THREE.ConeGeometry(1, 1, 5),
			cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
			disc: new THREE.CircleGeometry(1, 20),
		};
		this.buildLandscape();
		this.resize();
	}
	mat(hex, flat = false) {
		const key = hex + flat;
		if (this.mats.has(key)) return this.mats.get(key);
		const material = new THREE.MeshBasicNodeMaterial({
			color: hex,
			side: THREE.FrontSide,
		});
		if (!flat) {
			const band = normalWorld
				.dot(vec3(-0.45, 0.8, 0.35))
				.mul(0.5)
				.add(0.5)
				.mul(3)
				.floor()
				.div(3)
				.mul(0.47)
				.add(0.58);
			material.colorNode = color(hex).mul(band);
		}
		this.mats.set(key, material);
		return material;
	}
	part(parent, geo, hex, scale, position = [0, 0, 0], ink = true) {
		const mesh = new THREE.Mesh(
			typeof geo === "string" ? this.geometry[geo] : geo,
			typeof hex === "string" ? this.mat(hex) : hex,
		);
		mesh.scale.set(...scale);
		mesh.position.set(...position);
		parent.add(mesh);
		if (ink) {
			const shell = new THREE.Mesh(mesh.geometry, this.ink);
			shell.scale.setScalar(1.065);
			mesh.add(shell);
		}
		return mesh;
	}
	shadow(parent, sx, sz, y = 0.09) {
		const mesh = new THREE.Mesh(this.geometry.disc, this.shadowMat);
		mesh.rotation.x = -Math.PI / 2;
		mesh.scale.set(sx, sz, 1);
		mesh.position.set(0.8, y, 1);
		parent.add(mesh);
		return mesh;
	}
	label(text, bg = "#f1d65e", fg = "#20343e", width = 256, height = 64) {
		const c = document.createElement("canvas");
		c.width = width;
		c.height = height;
		const ctx = c.getContext("2d");
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = fg;
		ctx.font = "900 46px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, width / 2, height / 2 + 3);
		const tex = new THREE.CanvasTexture(c);
		tex.colorSpace = THREE.SRGBColorSpace;
		return new THREE.MeshBasicMaterial({ map: tex, transparent: false });
	}
	ribbon(points, hex) {
		const vertices = [],
			indices = [];
		for (const p of points) vertices.push(p[0], p[1], -p[2], p[3], p[4], -p[2]);
		for (let i = 0; i < points.length - 1; i++) {
			const a = i * 2;
			indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		g.setIndex(indices);
		g.computeVertexNormals();
		const m = this.mat(hex);
		m.side = THREE.DoubleSide;
		const mesh = new THREE.Mesh(g, m);
		this.scenery.add(mesh);
		return mesh;
	}
	buildLandscape() {
		const water = this.part(
			this.scenery,
			new THREE.PlaneGeometry(260, LENGTH + 800),
			"#42b8b1",
			[1, 1, 1],
			[0, -0.4, -LENGTH / 2],
			false,
		);
		water.rotation.x = -Math.PI / 2;
		for (const side of [-1, 1]) {
			const land = [],
				sand = [],
				cliff = [],
				ink = [],
				high = [];
			for (let s = -200; s <= LENGTH + 400; s += 5) {
				const r = riverAt(s),
					edge = r.center + side * r.width;
				ink.push([edge, -0.1, s, edge + side * 0.5, 0.0]);
				sand.push([edge + side * 0.5, 0.03, s, edge + side * 2.4, 0.09]);
				cliff.push([edge + side * 2.4, 0.09, s, edge + side * 3.5, 1.4]);
				land.push([edge + side * 3.5, 1.4, s, side * 120, 1.4]);
				high.push([edge + side * 12.5, 1.42, s, side * 120, 1.42]);
			}
			this.ribbon(ink, "#183b3c");
			this.ribbon(sand, "#e4cf8f");
			this.ribbon(cliff, "#4f8264");
			this.ribbon(land, "#9ebc72");
			this.ribbon(high, "#88ac71");
		}
		for (const [a, b] of ISLANDS) {
			const island = [],
				edge = [];
			for (let s = a; s <= b; s += 2) {
				const x = riverAt(s).center,
					w = Math.sin(((s - a) / (b - a)) * Math.PI) * 5.4;
				edge.push([x - w - 0.4, 0.1, s, x + w + 0.4, 0.1]);
				island.push([
					x - Math.max(0, w - 0.6),
					0.7,
					s,
					x + Math.max(0, w - 0.6),
					0.7,
				]);
			}
			this.ribbon(edge, "#dfcd8f");
			this.ribbon(island, "#a6b56a");
		}
		const random = rng(19821105);
		for (let s = -130; s < LENGTH + 250; s += 7) {
			const r = riverAt(s);
			for (const side of [-1, 1]) {
				const x = r.center + side * (r.width + 5 + random() * 28);
				if (random() > 0.18)
					this.tree(x, s + random() * 8, 0.8 + random() * 1.1, random() > 0.25);
				if (random() > 0.65)
					this.rock(x + side * 2, s + 5, 0.8 + random() * 1.8);
				if (random() > 0.92)
					this.house(r.center + side * (r.width + 9), s, side);
			}
		}
		for (let i = 0; i < 160; i++) {
			const streak = this.part(
				this.scene,
				"box",
				i % 3 ? "#85d2c1" : "#a3e0cf",
				[0.06, 0.015, 1 + random() * 5],
				[0, 0.015, 0],
				false,
			);
			this.ripples.push({
				mesh: streak,
				offset: random() * 220,
				side: random() * 2 - 1,
				speed: 2 + random() * 5,
			});
		}
		for (const [a, b] of ISLANDS)
			for (let s = a + 25; s < b - 20; s += 22)
				this.tree(riverAt(s).center, s, 1.2, true, 0.6);
	}
	tree(x, s, size, pine = true, base = 1.4) {
		const g = new THREE.Group();
		g.position.set(x, base, -s);
		g.scale.setScalar(size);
		this.part(g, "cyl", "#536048", [0.22, 2.1, 0.22], [0, 0.9, 0], false);
		if (pine) {
			this.part(g, "cone", "#355c50", [1.9, 3.6, 1.9], [0, 2.5, 0]);
			this.part(g, "cone", "#4b7860", [1.4, 3, 1.4], [0, 4.1, 0]);
		} else this.part(g, "sphere", "#6e915a", [2.3, 2.3, 2.2], [0, 3.2, 0]);
		this.shadow(g, 2.5, 2, 0.02);
		this.scenery.add(g);
	}
	rock(x, s, size) {
		this.part(
			this.scenery,
			"sphere",
			"#6c8e80",
			[size * 1.5, size, size],
			[x, 1.4, -s],
		).rotation.y = s;
	}
	house(x, s, side) {
		const g = new THREE.Group();
		g.position.set(x, 1.4, -s);
		g.rotation.y = side > 0 ? 0.2 : -0.2;
		this.part(g, "box", "#f1e0ad", [4.5, 2.7, 4], [0, 1.3, 0]);
		const roof = this.part(g, "cone", "#c06b59", [4, 2, 4], [0, 3.5, 0]);
		roof.rotation.y = Math.PI / 4;
		this.part(g, "box", "#29434a", [1, 1.5, 0.1], [0, 0.9, 2.05], false);
		this.part(g, "box", "#80bec4", [0.9, 0.8, 0.15], [-1.4, 1.8, 2.1]);
		this.part(g, "box", "#d2aa72", [1.8, 0.1, 10], [0, 0.1, 6], false);
		this.shadow(g, 5, 4);
		this.scenery.add(g);
	}
	plane(id, hex) {
		const root = new THREE.Group(),
			bank = new THREE.Group(),
			roll = new THREE.Group();
		root.add(bank);
		bank.add(roll);
		roll.name = "RollRig";
		bank.name = "BankRig";
		this.part(roll, "sphere", hex, [0.65, 0.55, 2.2], [0, 0, 0]);
		this.part(roll, "box", hex, [5.7, 0.13, 1.1], [0, 0, 0.1]);
		for (const side of [-1, 1]) {
			this.part(
				roll,
				"box",
				"#f5f1c9",
				[0.7, 0.14, 1.15],
				[side * 2.2, 0.02, 0.1],
			);
			this.part(
				roll,
				"box",
				"#d45449",
				[0.3, 0.15, 1.18],
				[side * 2.65, 0.01, 0.1],
			);
		}
		this.part(roll, "box", hex, [2.4, 0.1, 0.65], [0, 0.12, 1.7]);
		this.part(roll, "box", "#d45f4d", [0.12, 0.9, 0.9], [0, 0.5, 1.55]);
		this.part(roll, "sphere", "#274a59", [0.44, 0.44, 0.75], [0, 0.42, -0.25]);
		this.part(
			roll,
			"sphere",
			"#8bdcd2",
			[0.29, 0.2, 0.45],
			[-0.1, 0.7, -0.45],
			false,
		);
		this.part(
			roll,
			"cyl",
			"#d45f4d",
			[0.46, 0.6, 0.46],
			[0, 0, -1.9],
		).rotation.x = Math.PI / 2;
		const rotor = new THREE.Group();
		rotor.name = "Rotor";
		rotor.position.z = -2.25;
		roll.add(rotor);
		this.part(rotor, "box", "#f8f0c8", [2.3, 0.11, 0.07]);
		this.part(rotor, "box", "#f8f0c8", [0.11, 2.3, 0.07]);
		const shadow = this.shadow(root, 2.8, 1.8, -2.7);
		const mixer = new THREE.AnimationMixer(root);
		const propClip = new THREE.AnimationClip("Propeller", 0.12, [
			new THREE.NumberKeyframeTrack(
				"Rotor.rotation[z]",
				[0, 0.12],
				[0, Math.PI * 2],
			),
		]);
		mixer.clipAction(propClip).play();
		const rollClip = new THREE.AnimationClip("Barrel roll", 0.8, [
			new THREE.NumberKeyframeTrack(
				"RollRig.rotation[z]",
				[0, 0.15, 0.65, 0.8],
				[0, 0.3, Math.PI * 2 - 0.3, Math.PI * 2],
			),
		]);
		const action = mixer.clipAction(rollClip);
		action.setLoop(THREE.LoopOnce, 1);
		action.clampWhenFinished = false;
		this.scene.add(root);
		const obj = { root, bank, roll, shadow, mixer, action, rollStamp: 0 };
		this.units.set(`p${id}`, obj);
		return obj;
	}
	entity(e) {
		const g = new THREE.Group();
		g.position.set(e.x, 0, -e.s);
		const obj = { root: g, e, mixer: null, rotor: null, destroyed: false };
		if (e.type === "boat" || e.type === "gunboat") {
			this.part(
				g,
				"box",
				e.type === "boat" ? "#d96d5b" : "#667e7e",
				[3.2, 0.7, 6.4],
				[0, 0.55, 0],
			);
			this.part(g, "sphere", "#d7b987", [1.6, 0.3, 3.3], [0, 1.05, 0]);
			this.part(g, "box", "#f2dfaf", [2.1, 1.4, 2.2], [0, 1.5, 0.6]);
			this.part(g, "box", "#34555b", [2.2, 0.45, 0.2], [0, 1.85, -0.55]);
			this.part(g, "cyl", "#283f43", [0.6, 0.5, 0.6], [0, 1.2, -2]);
			this.part(g, "box", "#283f43", [0.24, 0.25, 2], [0, 1.5, -2.4]);
			this.part(g, "box", "#fff2c2", [0.14, 2.5, 0.14], [0, 2, 1.3]);
			this.part(g, "box", "#d65950", [0.9, 0.55, 0.05], [0.5, 3, 1.3]);
			const wake = this.part(
				g,
				"cone",
				"#a2dfc8",
				[2, 9, 0.01],
				[0, 0.02, 7],
				false,
			);
			wake.rotation.x = Math.PI / 2;
		} else if (e.type === "heli") {
			g.position.y = 3.7;
			this.part(g, "sphere", "#d76c58", [1.35, 0.8, 2], [0, 0, 0]);
			this.part(g, "sphere", "#345466", [1.2, 0.6, 0.7], [0, 0.1, 1.3]);
			this.part(g, "box", "#e7c88a", [0.3, 0.3, 3.6], [0, 0, -2.9]);
			this.part(g, "box", "#c3564a", [1.6, 0.1, 0.6], [0, 0.3, -4.4]);
			for (const side of [-1, 1])
				this.part(g, "box", "#293e43", [0.1, 0.15, 3.4], [side, -0.8, 0]);
			const rotor = new THREE.Group();
			rotor.name = "HeliRotor";
			rotor.position.y = 1.2;
			g.add(rotor);
			this.part(rotor, "box", "#293c42", [6.7, 0.08, 0.18]);
			this.part(rotor, "box", "#293c42", [0.18, 0.08, 6.7]);
			const mixer = new THREE.AnimationMixer(g);
			mixer
				.clipAction(
					new THREE.AnimationClip("Rotor", 0.22, [
						new THREE.NumberKeyframeTrack(
							"HeliRotor.rotation[y]",
							[0, 0.22],
							[0, Math.PI * 2],
						),
					]),
				)
				.play();
			obj.mixer = mixer;
			this.shadow(g, 2.8, 2, -3.65);
		} else if (e.type === "fuel") {
			this.part(g, "box", "#274847", [7.6, 0.35, 12], [0, 0.1, 0]);
			this.part(g, "box", "#f0d568", [6.8, 0.2, 11.2], [0, 0.4, 0]);
			this.part(g, "box", "#f8edbd", [0.45, 0.03, 10.8], [0, 0.52, 0], false);
			for (const side of [-1, 1]) {
				this.part(
					g,
					"cyl",
					"#cb7955",
					[0.9, 6.5, 0.9],
					[side * 4, 0.5, 0],
				).rotation.x = Math.PI / 2;
				this.part(g, "box", "#fbf1ce", [0.3, 3.8, 0.3], [side * 3.4, 2, -4.5]);
			}
			const label = this.part(
				g,
				new THREE.PlaneGeometry(5.8, 1.45),
				this.label("FUEL"),
				[1, 1, 1],
				[0, 0.55, 1],
				false,
			);
			label.rotation.x = -Math.PI / 2;
			this.part(g, "box", "#ec6451", [1, 0.06, 2.8], [-2, 0.55, -3], false);
		} else if (e.type === "bridge") {
			const w = riverAt(e.s).width;
			for (const side of [-1, 1]) {
				this.part(
					g,
					"box",
					"#6c7771",
					[w - 2.5, 0.9, 6],
					[side * (w / 2 + 2.5), 1.4, 0],
				);
				this.part(g, "box", "#f0dfac", [1.6, 6.3, 3], [side * (w - 1), 3, 0]);
				for (let i = 0; i < 5; i++)
					this.part(
						g,
						"box",
						"#d9c59d",
						[0.3, 0.25, 5],
						[side * (5 + i * 3), 2, 0],
					);
			}
			const gate = new THREE.Group();
			obj.gate = gate;
			g.add(gate);
			this.part(gate, "box", "#d96a53", [8, 1.2, 6], [0, 1.7, 0]);
			this.part(gate, "box", "#f0d370", [6.7, 0.08, 1.8], [0, 2.35, 0], false);
			for (let i = -2; i <= 2; i++) {
				const stripe = this.part(
					gate,
					"box",
					"#344a49",
					[0.6, 0.1, 2.2],
					[i * 1.2, 2.42, 0],
					false,
				);
				stripe.rotation.y = -0.5;
			}
		} else if (e.type === "boss") {
			this.part(g, "box", "#355660", [11, 1.5, 21], [0, 0.7, 0]);
			this.part(g, "sphere", "#355660", [5.5, 0.8, 7], [0, 0.8, -8]);
			this.part(g, "box", "#e3c38b", [9.6, 0.5, 17], [0, 1.7, 0]);
			this.part(g, "box", "#c96c59", [6, 3.3, 5], [0, 3, 3]);
			this.part(g, "box", "#284553", [5.7, 0.9, 0.15], [0, 4, 5.6]);
			this.part(g, "box", "#efdfaa", [0.3, 6.5, 0.3], [0, 6, 2]);
			this.part(g, "box", "#d75e4a", [3, 1.5, 0.1], [1.5, 8, 2]);
			for (const side of [-1, 1])
				for (const z of [-5, 8]) {
					this.part(g, "cyl", "#697d77", [1.5, 1.1, 1.5], [side * 3.3, 2.5, z]);
					this.part(g, "box", "#2c414b", [0.5, 0.5, 4], [side * 3.3, 3, z + 2]);
				}
			const core = this.part(
				g,
				"sphere",
				"#f2d765",
				[1.9, 0.6, 1.9],
				[0, 2.5, -3],
			);
			obj.core = core;
			this.shadow(g, 7, 14);
		} else if (e.type === "cache") {
			this.part(g, "box", "#f2df9c", [2.5, 0.8, 2.5], [0, 0.8, 0]);
			this.part(g, "box", "#e46755", [0.5, 0.1, 1.8], [0, 1.25, 0]);
			this.part(g, "box", "#e46755", [1.8, 0.1, 0.5], [0, 1.25, 0]);
		}
		this.scene.add(g);
		this.units.set(`e${e.id}`, obj);
		return obj;
	}
	burst(x, s, colorHex = "#ffc773", count = 14, large = false) {
		for (let i = 0; i < count; i++) {
			const angle = i * 2.39996,
				speed = 4 + (i % 7) * 1.8;
			const mesh = this.part(
				this.scene,
				i % 3 ? "sphere" : "box",
				i % 4 ? colorHex : "#243a43",
				[0.5, 0.5, 0.5],
				[x, 2, -s],
				false,
			);
			this.fx.push({
				mesh,
				vx: Math.cos(angle) * speed,
				vz: Math.sin(angle) * speed,
				vy: 5 + (i % 5),
				life: 0.65 + (i % 4) * 0.15,
				age: 0,
				size: large ? 2 : 1,
			});
		}
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.75, 1, 32),
			this.flatWhite,
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.set(x, 0.7, -s);
		this.scene.add(ring);
		this.fx.push({
			mesh: ring,
			vx: 0,
			vz: 0,
			vy: 0,
			age: 0,
			life: 0.45,
			ring: true,
			size: large ? 34 : 12,
		});
	}
	clear() {
		for (const o of this.units.values()) this.scene.remove(o.root);
		this.units.clear();
		for (const o of this.bullets.values()) this.scene.remove(o);
		this.bullets.clear();
		for (const f of this.fx) this.scene.remove(f.mesh);
		this.fx = [];
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h);
		const aspect = w / h,
			halfHeight = aspect < 1 ? 43 : 38;
		this.camera.top = halfHeight;
		this.camera.bottom = -halfHeight;
		this.camera.left = -halfHeight * aspect;
		this.camera.right = halfHeight * aspect;
		this.camera.updateProjectionMatrix();
	}
	project(x, s) {
		const v = new THREE.Vector3(x, 2.8, -s).project(this.camera);
		return {
			x: ((v.x + 1) * innerWidth) / 2,
			y: ((1 - v.y) * innerHeight) / 2,
		};
	}
	pointerToWorld(x, y) {
		const ray = new THREE.Raycaster();
		ray.setFromCamera(
			new THREE.Vector2((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2),
			this.camera,
		);
		const out = new THREE.Vector3();
		ray.ray.intersectPlane(
			new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.8),
			out,
		);
		return { x: out.x, s: -out.z };
	}
	update(game, dt, title = false) {
		const p = game.progress,
			t = game.time,
			center = riverAt(p + 30).center;
		const camX = center + (title ? -9 : 0);
		const shake =
			game.shake > 0 ? Math.sin(t * 91) * Math.min(game.shake, 0.7) : 0;
		this.camera.position.set(camX + shake, 76, -p + 44);
		this.camera.lookAt(camX, 0, -p - 30);
		for (const o of this.ripples) {
			const s = p - 30 + ((o.offset + t * o.speed) % 230);
			const r = riverAt(s);
			o.mesh.position.set(r.center + o.side * (r.width - 0.5), 0.015, -s);
		}
		const alive = new Set();
		for (const player of game.players) {
			const key = `p${player.id}`;
			alive.add(key);
			let o = this.units.get(key);
			if (!o) o = this.plane(player.id, COLORS[player.id % 4]);
			o.root.position.set(
				player.x,
				2.8 + Math.sin(t * 8 + player.id) * 0.08,
				-p + player.y,
			);
			o.bank.rotation.z = -player.vx * 0.025;
			o.bank.rotation.x = player.vy * 0.015;
			o.root.visible =
				!player.left &&
				(player.invuln <= 0 || player.roll > 0 || Math.floor(t * 14) % 2 === 0);
			if (player.rollStamp !== o.rollStamp) {
				o.rollStamp = player.rollStamp;
				o.action.reset().play();
			}
			o.mixer.update(dt);
		}
		for (const e of game.entities) {
			const key = `e${e.id}`;
			alive.add(key);
			if (e.s < p - 65 || e.s > p + 260) {
				const old = this.units.get(key);
				if (old) old.root.visible = false;
				continue;
			}
			let o = this.units.get(key);
			if (!o) o = this.entity(e);
			if (e.dead) {
				if (e.type === "bridge") {
					o.root.visible = true;
					o.gate.visible = false;
				} else o.root.visible = false;
			} else {
				o.root.visible = true;
				o.root.position.x = e.x;
				o.root.position.z = -e.s;
				if (e.type === "heli")
					o.root.position.y = 3.8 + Math.sin(t * 4 + e.id) * 0.3;
				if (e.type === "cache") {
					o.root.position.y = Math.sin(t * 3) * 0.3;
					o.root.rotation.y = t;
				}
				if (e.type === "boss" && o.core)
					o.core.scale.setScalar(1.2 + Math.sin(t * 6) * 0.1);
				o.mixer?.update(dt);
			}
		}
		for (const [key, o] of this.units)
			if (!alive.has(key)) {
				this.scene.remove(o.root);
				this.units.delete(key);
			}
		const bulletKeys = new Set();
		for (const b of game.bullets) {
			bulletKeys.add(b.id);
			let o = this.bullets.get(b.id);
			if (!o) {
				o = this.part(
					this.scene,
					"box",
					b.enemy ? "#f67b5b" : "#fff5b6",
					b.enemy ? [0.6, 0.35, 1.4] : [0.23, 0.3, 2],
					[0, 2.8, 0],
					true,
				);
				this.bullets.set(b.id, o);
			}
			o.position.set(b.x, 2.8, -b.s);
			o.rotation.y = -Math.atan2(b.vx, b.vs);
		}
		for (const [id, o] of this.bullets)
			if (!bulletKeys.has(id)) {
				this.scene.remove(o);
				this.bullets.delete(id);
			}
		for (let i = this.fx.length - 1; i >= 0; i--) {
			const f = this.fx[i];
			f.age += dt;
			if (f.age > f.life) {
				this.scene.remove(f.mesh);
				this.fx.splice(i, 1);
				continue;
			}
			if (f.ring) f.mesh.scale.setScalar(1 + f.age * f.size);
			else {
				f.mesh.position.x += f.vx * dt;
				f.mesh.position.z += f.vz * dt;
				f.mesh.position.y += f.vy * dt;
				f.vy -= dt * 18;
				f.mesh.rotation.x += dt * 3;
				f.mesh.rotation.z += dt * 5;
				f.mesh.scale.setScalar((1 - f.age / f.life) * f.size);
			}
		}
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
}
